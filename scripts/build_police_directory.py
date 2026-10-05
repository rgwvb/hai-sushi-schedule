#!/usr/bin/env python3
# Build a nationwide police division / station directory for the static game.
# Primary source: National Police Agency open-data dataset 5958.
from __future__ import annotations

import csv
import io
import json
import re
import sys
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "police-directory.json"

COUNTIES = [
    "臺北市","新北市","桃園市","臺中市","臺南市","高雄市",
    "基隆市","新竹市","嘉義市","宜蘭縣","新竹縣","苗栗縣",
    "彰化縣","南投縣","雲林縣","嘉義縣","屏東縣","花蓮縣",
    "臺東縣","澎湖縣","金門縣","連江縣"
]

TGOS_URLS = [
    "https://www.tgos.tw/tgos/VirtualDir/Product/9927eb8a-efed-40c0-8bc4-83121ad6834a/1150930.zip",
    "https://www.tgos.tw/tgos/VirtualDir/Product/9927eb8a-efed-40c0-8bc4-83121ad6834a/1150531.zip",
]
DATASET_PAGE = "https://data.gov.tw/dataset/5958"
NPA_PAGE = "https://www.npa.gov.tw/ch/app/data/view?id=1820&module=liaison&serno=afc427bb-43d6-4af4-994a-71faee42e3c0"
ZHU_BASE = "https://data.zhupiter.com/od/1494/%E5%90%84%E7%B8%A3-%E5%B8%82%E8%AD%A6%E5%AF%9F-%E5%88%86%E5%B1%80%E6%9A%A8%E6%89%80%E5%B1%AC%E5%88%86%E9%A7%90-%E6%B4%BE%E5%87%BA%E6%89%80%E5%9C%B0%E5%9D%80%E8%B3%87%E6%96%99/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; TaiwanPoliceCareerSimulator/1.0; +https://github.com/rgwvb/hai-sushi-schedule)",
    "Accept": "text/html,application/xhtml+xml,application/zip,text/csv,*/*",
    "Referer": DATASET_PAGE,
}

STATION_RE = re.compile(r"(派出所|分駐所|駐在所)$")
DIVISION_RE = re.compile(r"(分局|警察所)$")


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def county_from_address(address):
    a = clean(address).replace("台", "臺", 1) if str(address).startswith("台") else clean(address)
    for c in COUNTIES:
        if a.startswith(c):
            return c
    return ""


def classify(name):
    n = clean(name)
    if STATION_RE.search(n):
        return "station"
    if DIVISION_RE.search(n):
        return "division"
    if n.endswith("警察局") and "分局" not in n:
        return "agency"
    return "other"


def normalize_record(row):
    def get(*keys):
        for key in keys:
            if key in row and row[key] not in (None, ""):
                return clean(row[key])
        return ""
    name = get("中文單位名稱", "名稱", "name")
    address = get("地址", "address")
    phone = get("電話", "phone")
    x = get("POINT_X", "pointx", "Point_X")
    y = get("POINT_Y", "pointy", "Point_Y")
    return {
        "name": name,
        "address": address,
        "phone": phone,
        "x": x,
        "y": y,
        "county": county_from_address(address),
        "kind": classify(name),
    }


def fetch_official_csv():
    session = requests.Session()
    session.headers.update(HEADERS)
    last_error = None
    for url in TGOS_URLS:
        try:
            r = session.get(url, timeout=45)
            r.raise_for_status()
            if not r.content.startswith(b"PK"):
                raise RuntimeError("download is not a ZIP archive")
            with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
                csv_names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
                if not csv_names:
                    raise RuntimeError("ZIP has no CSV")
                raw = zf.read(csv_names[0])
            text = None
            for enc in ("utf-8-sig", "utf-8", "cp950", "big5"):
                try:
                    text = raw.decode(enc)
                    break
                except UnicodeDecodeError:
                    pass
            if text is None:
                raise RuntimeError("unknown CSV encoding")
            rows = list(csv.DictReader(io.StringIO(text)))
            records = [normalize_record(r) for r in rows]
            records = [r for r in records if r["name"] and r["county"]]
            if len(records) < 500:
                raise RuntimeError(f"official CSV unexpectedly small: {len(records)}")
            return records, "official-tgos", url
        except Exception as exc:
            last_error = exc
            print(f"[directory] official download failed: {url}: {exc}", file=sys.stderr)
    raise RuntimeError(f"official downloads unavailable: {last_error}")


def extract_zhupiter_records(html):
    soup = BeautifulSoup(html, "html.parser")
    out = []
    seen = set()
    for h in soup.find_all(["h4"]):
        a = h.find("a")
        if not a:
            continue
        name = clean(a.get_text(" ", strip=True))
        if classify(name) == "other":
            continue
        bits = []
        for sib in h.next_siblings:
            if getattr(sib, "name", None) == "h4":
                break
            if hasattr(sib, "get_text"):
                bits.append(sib.get_text(" ", strip=True))
            else:
                bits.append(str(sib))
        text = clean(" ".join(bits))
        am = re.search(r"地址:\s*([^|]+)", text)
        pm = re.search(r"電話:\s*([^|]+)", text)
        address = clean(am.group(1)) if am else ""
        phone = clean(pm.group(1)) if pm else ""
        county = county_from_address(address)
        if not county:
            continue
        key = (name, address, phone)
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "name": name, "address": address, "phone": phone,
            "x": "", "y": "", "county": county, "kind": classify(name)
        })
    return out


def get_zhupiter_page(session, offset):
    url = ZHU_BASE if offset == 1 else f"{ZHU_BASE}{offset}/"
    for attempt in range(3):
        try:
            r = session.get(url, headers=HEADERS, timeout=35)
            r.raise_for_status()
            return offset, r.text
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1.0 + attempt)
    raise RuntimeError("unreachable")


def fetch_zhupiter():
    session = requests.Session()
    off, first = get_zhupiter_page(session, 1)
    m = re.search(r"總共有\s*([0-9,]+)\s*筆", BeautifulSoup(first, "html.parser").get_text(" ", strip=True))
    total = int(m.group(1).replace(",", "")) if m else 1916
    offsets = list(range(1, total + 1, 20))
    pages = {1: first}
    todo = [x for x in offsets if x != 1]
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(get_zhupiter_page, session, x): x for x in todo}
        for fut in as_completed(futures):
            off, html = fut.result()
            pages[off] = html
    records = []
    seen = set()
    for off in sorted(pages):
        for r in extract_zhupiter_records(pages[off]):
            key = (r["name"], r["address"], r["phone"])
            if key not in seen:
                seen.add(key)
                records.append(r)
    if len(records) < 500:
        raise RuntimeError(f"mirror scrape unexpectedly small: {len(records)}")
    return records, "zhupiter-mirror", ZHU_BASE


def infer_agency(county, rows):
    agencies = [r for r in rows if r["kind"] == "agency"]
    if agencies:
        # Prefer a bureau whose address begins with the same county.
        return agencies[-1]["name"]
    suffix = "政府警察局" if county in {"臺北市","新北市","桃園市","臺中市","臺南市","高雄市","嘉義市","宜蘭縣","新竹縣","屏東縣","澎湖縣"} else "警察局"
    return county + suffix


def hierarchy_for_county(county, rows):
    useful = [r for r in rows if r["kind"] in {"station","division","agency"}]
    divisions = []
    unassigned = []

    # The NPA dataset is commonly ordered child stations first and the parent
    # precinct immediately after them. Use this order, then keep any leftovers
    # visible rather than silently inventing a parent.
    pending = []
    for r in useful:
        if r["kind"] == "station":
            pending.append(r)
        elif r["kind"] == "division":
            divisions.append({
                "name": r["name"],
                "address": r["address"],
                "phone": r["phone"],
                "stations": [
                    {"name": s["name"], "address": s["address"], "phone": s["phone"]}
                    for s in pending
                ],
            })
            pending = []
        elif r["kind"] == "agency":
            if pending:
                unassigned.extend(pending)
                pending = []
    if pending:
        unassigned.extend(pending)

    # If a county's source ordering was parent-first, recover it using a second
    # pass rather than returning an empty hierarchy.
    station_total = sum(len(d["stations"]) for d in divisions)
    raw_station_total = sum(1 for r in useful if r["kind"] == "station")
    if raw_station_total and station_total < raw_station_total * 0.35:
        divisions = []
        current = None
        unassigned = []
        for r in useful:
            if r["kind"] == "division":
                current = {
                    "name": r["name"], "address": r["address"], "phone": r["phone"], "stations": []
                }
                divisions.append(current)
            elif r["kind"] == "station":
                item = {"name": r["name"], "address": r["address"], "phone": r["phone"]}
                if current:
                    current["stations"].append(item)
                else:
                    unassigned.append(r)

    # Deduplicate divisions and stations without losing source order.
    dedup_divisions = []
    d_seen = set()
    for d in divisions:
        key = (d["name"], d["address"])
        if key in d_seen:
            continue
        d_seen.add(key)
        s_seen = set()
        sts = []
        for st in d["stations"]:
            sk = (st["name"], st["address"])
            if sk not in s_seen:
                s_seen.add(sk)
                sts.append(st)
        d["stations"] = sts
        dedup_divisions.append(d)

    u_seen = set()
    unresolved = []
    for r in unassigned:
        k = (r["name"], r["address"])
        if k not in u_seen:
            u_seen.add(k)
            unresolved.append({"name": r["name"], "address": r["address"], "phone": r["phone"]})

    return {
        "agency": infer_agency(county, rows),
        "divisions": dedup_divisions,
        "unassignedStations": unresolved,
    }


def build(records, retrieval, retrieval_url):
    counties = {}
    for county in COUNTIES:
        rows = [r for r in records if r["county"] == county]
        counties[county] = hierarchy_for_county(county, rows)
    total_divisions = sum(len(v["divisions"]) for v in counties.values())
    total_stations = sum(
        sum(len(d["stations"]) for d in v["divisions"]) + len(v["unassignedStations"])
        for v in counties.values()
    )
    return {
        "meta": {
            "title": "各縣(市)警察(分)局暨所屬分駐(派出)所地址資料",
            "provider": "內政部警政署",
            "dataset": DATASET_PAGE,
            "npaPage": NPA_PAGE,
            "retrieval": retrieval,
            "retrievalUrl": retrieval_url,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "sourceRecords": len(records),
            "divisionCount": total_divisions,
            "stationCount": total_stations,
            "note": "分局／警察所與派出所層級依警政署開放資料之單位名稱與來源排序建構；遊戲不自行虛構不存在的派出所名稱。"
        },
        "counties": counties,
    }


def main():
    try:
        records, retrieval, retrieval_url = fetch_official_csv()
    except Exception as exc:
        print(f"[directory] falling back to public mirror: {exc}", file=sys.stderr)
        records, retrieval, retrieval_url = fetch_zhupiter()
    data = build(records, retrieval, retrieval_url)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(
        f"[directory] wrote {OUT}: {data['meta']['sourceRecords']} source rows, "
        f"{data['meta']['divisionCount']} divisions, {data['meta']['stationCount']} stations"
    )


if __name__ == "__main__":
    main()
