#!/usr/bin/env python3
"""Build a static, attributed MOEX police-special-exam archive.

Original papers remain linked in their entirety. Only text-only choices with a
complete set of options and a verified official answer become playable items.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import html
import io
import json
import re
import time
import urllib.parse
import urllib.request
import unicodedata
import zipfile
from pathlib import Path

BASE = 'https://wwwq.moex.gov.tw/exam/'
SEARCH = BASE + 'wFrmExamQandASearch.aspx'
DECLARATION = '本網站資料，歡迎朋友連結使用。但引用時，請註明資料來源並請確保資料之完整（包括本項宣示在內），均不得任意增刪'
CACHE = Path('.exam-cache')
CACHE_ONLY = False
LABEL = re.compile(r'<label\b[^>]*\bfor="ctl00_holderContent_chk_(\d+)_(\d+)(?:_([A-Za-z0-9]+))?"[^>]*>(.*?)</label>', re.S)
ATTR_HREF = re.compile(r'<a\b[^>]*\bhref="([^"]+)"[^>]*>(.*?)</a>', re.S)

def plain(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()

def fetch(url):
    path = CACHE / hashlib.sha256(url.encode()).hexdigest()
    if path.exists():
        return path.read_bytes()
    if CACHE_ONLY:
        raise FileNotFoundError('Official source missing from verified pack cache')
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'PoliceExamArchive/1.0 (public MOEX educational archive)'})
            with urllib.request.urlopen(req, timeout=45) as response:
                data = response.read()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            return data
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)

def discover_year(year):
    body = fetch(SEARCH + '?y=' + str(year)).decode('utf-8-sig')
    select = re.search(r'<select[^>]*id="ctl00_holderContent_ddlExamCode"[^>]*>(.*?)</select>', body, re.S)
    exams = {}
    if select:
        for code, text in re.findall(r'<option[^>]*value="(\d+)"[^>]*>(.*?)</option>', select.group(1), re.S):
            name = plain(text)
            if '警察' in name and '升官' not in name:
                exams[code] = name
    classes, papers = {}, []
    for match in LABEL.finditer(body):
        code, cls, subject, text = match.groups()
        title = plain(text)
        if not subject:
            classes[(code, cls)] = title
            continue
        category = classes.get((code, cls), '')
        if code not in exams or not re.search(r'警察|刑事鑑識|犯罪防治|行政管理|交通管理|水上人員|公共安全|航空駕駛|飛機修護', category):
            continue
        row = body[match.end():body.find('</tr>', match.end())]
        links = {}
        for href, label in ATTR_HREF.findall(row):
            url = urllib.parse.urljoin(BASE, html.unescape(href))
            query = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
            kind = query.get('t', [''])[0]
            if kind in ('Q', 'S', 'M'):
                links[kind] = url
        if 'Q' not in links:
            continue
        papers.append({
            'id': f'{code}-{cls}-{subject}', 'year': year - 1911,
            'examCode': code, 'category': category, 'subject': title,
            'track': '一般警察特考' if '一般警察' in category else '警察特考',
            'grade': next((x for x in ['二等', '三等', '四等', '五等', '甲等', '乙等', '丙等'] if x in category), '四等' if '基層' in exams[code] else '其他'),
            'questionUrl': links['Q'], 'answerUrl': links.get('S'),
            'correctionUrl': links.get('M'), 'questionCount': 0,
        })
    print(f'CATALOG {year - 1911}: {len(exams)} exams, {len(papers)} papers', flush=True)
    return {'year': year - 1911, 'examCodes': list(exams), 'papers': papers, 'status': 'ok'}

def normalized(text):
    return unicodedata.normalize('NFKC', text)

def answer_grid(data):
    """Pair each numbered grid cell with its answer by PDF coordinates."""
    import fitz
    doc = fitz.open(stream=data, filetype='pdf')
    answer, unresolved = {}, set()
    full = normalized('\n'.join(page.get_text() for page in doc))
    for page in doc:
        words = page.get_text('words')
        letters = [w for w in words if re.fullmatch(r'[A-D#]+', normalized(w[4]))]
        grid_labels = [w for w in words if normalized(w[4]) in ('題號', '題序')]
        grid_top = min((w[1] for w in grid_labels), default=page.rect.height)
        for word in words:
            match = re.fullmatch(r'第\s*(\d+)\s*題', normalized(word[4])) or (re.fullmatch(r'(\d{1,3})', normalized(word[4])) if word[1] >= grid_top - 2 else None)
            if not match:
                continue
            n = int(match.group(1)); center = (word[0] + word[2]) / 2
            candidates = [w for w in letters if abs((w[0] + w[2]) / 2 - center) < 16 and 8 < w[1] - word[1] < 32]
            if len(candidates) != 1:
                continue
            value = normalized(candidates[0][4])
            if len(value) == 1 and value != '#':
                answer[n] = ([ord(value) - 65], '')
            else:
                unresolved.add(n)
    for n in unresolved:
        note_matches = list(re.finditer(r'第\s*' + str(n) + r'\s*題([^。\n]*)', full))
        note = next((m.group(0) for m in note_matches if re.search(r'給分', m.group(0))), '')
        if re.search(r'均給分|者給分|一律給分|均予給分', note):
            choices = sorted(set(ord(x) - 65 for x in re.findall('[A-D]', note)))
            answer[n] = (choices or [0, 1, 2, 3], note)
        # An ambiguous/deleted cell is deliberately not auto-graded.
    return answer, full

def clean_text(text):
    # Preserve circled item numbers and original punctuation in displayed text.
    text = ''.join(normalized(ch) if 0xf900 <= ord(ch) <= 0xfaff else ch for ch in text)
    for i in range(12):
        text = text.replace(chr(0xe129 + i), chr(0x2460 + i))
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n[ \t]*\n+', '\n', text)
    return text.strip()

def extract_questions(data, answers):
    import fitz
    doc = fitz.open(stream=data, filetype='pdf')
    text, page_ranges, block_ranges = '', [], []
    for i, page in enumerate(doc):
        # Subsequent-page running headers are above the question text.
        clip = None if i == 0 else fitz.Rect(0, 70, page.rect.width, page.rect.height - 20)
        part = ''
        for block in page.get_text('blocks', clip=clip):
            if block[6] != 0:
                continue
            content = re.sub(r'(?m)^(\s*)([\ue0c6-\ue128])', lambda m: m[1] + str(ord(m[2]) - 0xe0c6 + 1) + ' ', block[4])
            block_ranges.append((len(text) + len(part), len(text) + len(part) + len(content)))
            part += content + '\n'
        page_ranges.append((len(text), len(text) + len(part), i + 1))
        text += part + '\n'
    starts = list(re.finditer(r'(?m)^\s*(\d{1,3})[.．、]?\s+(?=\S)', text))
    shared = set()
    for match in re.finditer(r'(?:請依|依下列|依下文|請閱讀|請回答|請參考)[^\n]{0,100}?第?\s*(\d+)\s*題?\s*(?:至|[～~-])\s*第?\s*(\d+)\s*題', normalized(text)):
        first, last = map(int, match.groups())
        if 0 < first <= last <= 100:
            shared.update(range(first, last + 1))
    occurrences = {}
    for m in starts:
        occurrences[int(m.group(1))] = occurrences.get(int(m.group(1)), 0) + 1
    rows = []
    for index, start in enumerate(starts):
        n = int(start.group(1))
        if n not in answers or occurrences[n] != 1 or n in shared:
            continue
        end = starts[index + 1].start() if index + 1 < len(starts) else len(text)
        chunk = text[start.end():end].strip()
        markers = list(re.finditer(r'[\ue18c-\ue18f]', chunk))
        if len(markers) != 4 or [m.group() for m in markers] != list('\ue18c\ue18d\ue18e\ue18f'):
            continue
        last_marker = start.end() + markers[-1].start()
        block_end = next((b for a, b in block_ranges if a <= last_marker < b), end)
        if block_end < end and text[block_end:end].strip():
            # A new passage/scenario between choices and the next question
            # must not be silently appended to D or omitted from the next item.
            if index + 1 < len(starts):
                shared.add(int(starts[index + 1][1]))
            continue
        stem = clean_text(chunk[:markers[0].start()])
        opts = [clean_text(chunk[m.end():(markers[j + 1].start() if j < 3 else len(chunk))]) for j, m in enumerate(markers)]
        # Passage introductions at the end of a previous choice are not part of
        # that choice. Such items remain accessible in the complete original.
        opts[-1] = re.split(r'請依下文|請閱讀|請回答第|請依下列文章', opts[-1])[0].strip()
        combined = stem + ''.join(opts)
        if len(stem) < 10 or any(len(o) < 1 for o in opts):
            continue
        if re.search(r'[\ue000-\uf8ff\ufffd]', combined):
            continue
        if re.search(r'下圖|上圖|如圖|見圖|圖\s*[（(]?\d|下表|如表|依下文|閱讀下|上文|文中|承上題|下列文章|according to (the|this) (passage|paragraph)|the author|the passage', stem, re.I):
            continue
        # English reading/cloze items depend on context preceding their number.
        if not re.search(r'[\u3400-\u9fff]', stem) or max(map(len, opts)) > 500:
            continue
        page = next(p for a, b, p in page_ranges if a <= start.end() <= b)
        accepted, note = answers[n]
        rows.append([n, stem, opts, accepted, page, note])
    return rows, len(doc)

def import_paper(paper):
    if not paper['answerUrl']:
        paper['status'] = 'original'
        return paper, None
    try:
        question_data = fetch(paper['questionUrl'])
        import fitz
        question_doc = fitz.open(stream=question_data, filetype='pdf')
        if not any(page.get_text().strip() for page in question_doc):
            paper['status'] = 'original'
            paper['pages'] = len(question_doc)
            paper['importReason'] = 'scanned'
            return paper, None
        answer_url = paper['correctionUrl'] or paper['answerUrl']
        answers, answer_text = answer_grid(fetch(answer_url))
        count_match = re.search(r'(?:單選題數|題\s*數)\s*[：:]\s*(\d+)\s*題', answer_text)
        paper['officialAnswerCount'] = int(count_match[1]) if count_match else len(answers)
        if not answers:
            paper['status'] = 'original'
            return paper, None
        rows, pages = extract_questions(question_data, answers)
        paper['pages'] = pages
        paper['questionCount'] = len(rows)
        paper['status'] = 'playable' if rows else 'original'
        if not rows:
            return paper, None
        content = json.dumps(rows, ensure_ascii=False, separators=(',', ':'))
        paper['bank'] = hashlib.sha256(content.encode()).hexdigest()[:20]
        return paper, rows
    except Exception as err:
        paper['status'] = 'original'
        paper['importError'] = str(err)[:180]
        return paper, None

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

def download_year_bundle(year):
    """Use MOEX's own 試題打包 action, avoiding thousands of PDF requests."""
    import requests
    from bs4 import BeautifulSoup
    if not year['papers']:
        return 0
    # MOEX limits a pack to eight subjects. A subject file code is shared by
    # several classes; the official pack filenames identify those shared files.
    groups = {}
    for paper in year['papers']:
        if paper['answerUrl']:
            groups.setdefault((paper['examCode'], paper['id'].split('-')[2]), []).append(paper)
    selected = [next((p for p in group if p['correctionUrl']), group[0]) for group in groups.values()]
    if not selected:
        return 0
    url = SEARCH + '?y=' + str(year['year'] + 1911)
    session = requests.Session()
    soup = BeautifulSoup(fetch(url).decode('utf-8-sig'), 'html.parser')
    base_payload = {x['name']: x.get('value', '') for x in soup.select('input[type=hidden][name]')}
    for select in soup.select('select[name]'):
        option = select.select_one('option[selected]') or select.select_one('option')
        base_payload[select['name']] = option.get('value', '')
    base_payload['ctl00$holderContent$hidStatus'] = '1'
    base_payload['ctl00$holderContent$ibtnDownLoad'] = '試題打包'
    mapped = 0
    for start in range(0, len(selected), 8):
        batch = selected[start:start + 8]
        zip_path = CACHE / f'year-{year["year"]}-mc-{start}.zip'
        if zip_path.exists():
            data = zip_path.read_bytes()
        else:
            payload = dict(base_payload)
            for paper in batch:
                code, cls, subject = paper['id'].split('-')
                payload[f'ctl00$holderContent$chk_{code}_{cls}_{subject}'] = 'on'
            for attempt in range(3):
                try:
                    response = session.post(url, data=payload, timeout=120)
                    response.raise_for_status()
                    break
                except requests.RequestException:
                    if attempt == 2:
                        raise
                    time.sleep(attempt + 1)
            data = response.content
            if data[:2] != b'PK':
                error_page = BeautifulSoup(response.text, 'html.parser')
                alerts = [s.get_text() for s in error_page.find_all('script') if 'alert(' in s.get_text()]
                if any('請至少點選' in text for text in alerts):
                    # Some legacy papers cannot be selected by the pack action;
                    # use only their already-published individual file links.
                    for paper in batch:
                        group = groups[(paper['examCode'], paper['id'].split('-')[2])]
                        for field in ('questionUrl', 'answerUrl', 'correctionUrl'):
                            if not paper[field]: continue
                            content = fetch(paper[field])
                            for alias in group:
                                if alias[field]:
                                    (CACHE / hashlib.sha256(alias[field].encode()).hexdigest()).write_bytes(content)
                    print(f'LEGACY {year["year"]}: {len(batch)} individual source papers cached', flush=True)
                    continue
                raise ValueError('MOEX pack action did not return a ZIP file: ' + ' '.join(alerts)[:600])
            zip_path.write_bytes(data)
        mapped += cache_package(data, batch, groups)
        print(f'BUNDLE {year["year"]}: {min(start + 8, len(selected))}/{len(selected)} distinct MC papers', flush=True)
    return mapped

def cache_package(data, selected, groups):
    from bs4 import BeautifulSoup
    package = zipfile.ZipFile(io.BytesIO(data))
    names = {}
    for info in package.infolist():
        name = info.filename
        if not info.flag_bits & 0x800:
            try:
                name = name.encode('cp437').decode('big5')
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass
        names[name.rsplit('/', 1)[-1]] = info
    index_name = next(name for name in names if name.lower().endswith('.html'))
    index = BeautifulSoup(package.read(names[index_name]).decode('utf-8-sig'), 'html.parser')
    lookup = {(p['examCode'], p['id'].split('-')[2]): p for p in selected}
    category, mapped = '', 0
    for node in index.select('.link_2, .link_3'):
        if 'link_2' in node.get('class', []):
            category = node.get_text(' ', strip=True)
            continue
        table = node.find('table')
        if not table:
            continue
        subject = table.find('td').get_text(' ', strip=True)
        for anchor in table.find_all('a', href=True):
            name = urllib.parse.unquote(anchor['href']).rsplit('/', 1)[-1]
            code_match = re.match(r'(\d+)_(?:ANS|MOD)?([A-Za-z0-9]+)_', name)
            if not code_match:
                continue
            paper = lookup.get((code_match.group(1), code_match.group(2)))
            if name not in names:
                prefix = name.split('_', 2)[:2]
                candidates = [x for x in names if x.split('_', 2)[:2] == prefix]
                if len(candidates) == 1:
                    name = candidates[0]
            if not paper or name not in names:
                continue
            label = anchor.get_text(strip=True)
            url = paper['questionUrl'] if label == '試題' else paper['answerUrl'] if label == '答案' else paper['correctionUrl'] if '更正' in label else None
            if url:
                content = package.read(names[name])
                aliases = groups[(paper['examCode'], paper['id'].split('-')[2])]
                field = 'questionUrl' if label == '試題' else 'answerUrl' if label == '答案' else 'correctionUrl'
                for alias in aliases:
                    if field == 'correctionUrl' and not alias[field]:
                        alias[field] = url
                    if alias[field]:
                        path = CACHE / hashlib.sha256(alias[field].encode()).hexdigest()
                        path.write_bytes(content)
                mapped += 1
    expected = sum(1 + bool(p['answerUrl']) + bool(p['correctionUrl']) for p in selected)
    if mapped != expected:
        raise ValueError(f'Incomplete ZIP mapping: {mapped}/{expected} source files')
    return mapped

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='data/exams')
    parser.add_argument('--catalog-only', action='store_true')
    parser.add_argument('--start', type=int, default=1992)
    parser.add_argument('--end', type=int, default=datetime.date.today().year)
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--use-catalog', action='store_true')
    parser.add_argument('--bundles', action='store_true')
    parser.add_argument('--cache-only', action='store_true')
    args = parser.parse_args()
    out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
    years, errors = [], []
    if args.use_catalog:
        previous = json.loads((out / 'catalog.json').read_text())
        years, errors = previous['years'], previous['errors']
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {pool.submit(discover_year, y): y for y in range(args.start, args.end + 1)}
            for future in concurrent.futures.as_completed(futures):
                try:
                    years.append(future.result())
                except Exception as err:
                    errors.append({'year': futures[future] - 1911, 'error': str(err)})
                    print('CATALOG ERROR', futures[future], str(err), flush=True)
    years.sort(key=lambda x: x['year'], reverse=True)
    catalog = {'version': 1, 'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'source': '考選部考畢試題查詢平臺', 'sourceUrl': SEARCH, 'declaration': DECLARATION,
               'years': years, 'errors': errors, 'paperCount': sum(len(y['papers']) for y in years), 'questionCount': 0}
    write_json(out / 'catalog.json', catalog)
    print('CATALOG TOTAL', catalog['paperCount'], 'papers;', len(errors), 'failed years', flush=True)
    if not args.catalog_only:
        total_unique = 0
        if args.bundles:
            with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
                futures = {pool.submit(download_year_bundle, y): y for y in years}
                for future in concurrent.futures.as_completed(futures):
                    try:
                        future.result()
                    except Exception as err:
                        print('BUNDLE ERROR', futures[future]['year'], str(err), flush=True)
            global CACHE_ONLY
            CACHE_ONLY = True
        elif args.cache_only:
            CACHE_ONLY = True
        # PDF parsing is sequential: PyMuPDF documents are not shared by threads.
        if True:
            for year in years:
                banks = {}
                count = 0
                for paper, rows in map(import_paper, year['papers']):
                    count += 1
                    if rows:
                        banks[paper['bank']] = rows
                    if count % 25 == 0:
                        print(f'IMPORT {year["year"]}: {count}/{len(year["papers"])} papers', flush=True)
                year['questionCount'] = sum(len(rows) for rows in banks.values())
                year['playablePaperCount'] = sum(p['questionCount'] > 0 for p in year['papers'])
                year['bankFile'] = str(year['year']) + '.json'
                total_unique += year['questionCount']
                write_json(out / year['bankFile'], {'year': year['year'], 'banks': banks})
                catalog['questionCount'] = total_unique
                write_json(out / 'catalog.json', catalog)
                print(f'YEAR COMPLETE {year["year"]}: {year["questionCount"]} unique playable questions, {year["playablePaperCount"]} playable papers', flush=True)
        catalog['playablePaperCount'] = sum(y['playablePaperCount'] for y in years)
        write_json(out / 'catalog.json', catalog)
        publish_catalogs(out, catalog)
        print('IMPORT COMPLETE', total_unique, 'unique questions;', catalog['paperCount'], 'papers', flush=True)

def publish_catalogs(out, catalog):
    manifest = {key: value for key, value in catalog.items() if key not in ('years',)}
    manifest['years'] = []
    for year in catalog['years']:
        if not year['papers']:
            continue
        filename = str(year['year']) + '.catalog.json'
        write_json(out / filename, {'year': year['year'], 'papers': year['papers']})
        manifest['years'].append({
            'year': year['year'], 'paperCount': len(year['papers']),
            'questionCount': year.get('questionCount', 0),
            'playablePaperCount': year.get('playablePaperCount', 0),
            'catalogFile': filename, 'bankFile': year['bankFile'],
        })
    write_json(out / 'manifest.json', manifest)

if __name__ == '__main__':
    main()
