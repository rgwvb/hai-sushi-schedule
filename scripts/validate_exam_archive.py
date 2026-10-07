"""Validate the published archive without network requests."""
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

root = Path('data/exams')
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
assert manifest['paperCount'] > 5000, 'historical catalog is incomplete'
assert manifest['questionCount'] > 10000, 'playable archive is incomplete'
available = sorted(y['year'] for y in manifest['years'])
assert available == list(range(82, max(available) + 1)), 'available years must be complete'
assert not manifest['errors'], 'a year discovery request failed'
questions = papers = corrected = 0
for year in manifest['years']:
    catalog = json.loads((root / year['catalogFile']).read_text(encoding='utf-8'))
    bank = json.loads((root / year['bankFile']).read_text(encoding='utf-8'))
    assert catalog['year'] == bank['year'] == year['year']
    assert len(catalog['papers']) == year['paperCount']
    papers += len(catalog['papers'])
    count = 0
    for key, rows in bank['banks'].items():
        numbers = set()
        for number, stem, options, accepted, page, note in rows:
            assert number not in numbers, 'duplicate question number in a bank'
            numbers.add(number)
            assert isinstance(stem, str) and len(stem) >= 10
            assert len(options) == 4 and all(isinstance(o, str) and o for o in options)
            assert accepted and len(set(accepted)) == len(accepted)
            assert all(isinstance(i, int) and 0 <= i < 4 for i in accepted)
            assert page >= 1
            assert len(accepted) == 1 or note, 'multiple accepted choices require an official correction note'
            if note: corrected += 1
        count += len(rows)
    assert count == year['questionCount']
    questions += count
    for paper in catalog['papers']:
        for field, kind in [('questionUrl','Q'),('answerUrl','S'),('correctionUrl','M')]:
            if not paper.get(field): continue
            parsed = urlparse(paper[field]);query=parse_qs(parsed.query)
            assert parsed.scheme == 'https' and parsed.hostname == 'wwwq.moex.gov.tw'
            assert query.get('t') == [kind] and query.get('code') == [paper['examCode']]
        if paper['questionCount']:
            rows = bank['banks'][paper['bank']]
            assert len(rows) == paper['questionCount']
            assert paper['questionCount'] <= paper['officialAnswerCount']
            assert all(row[4] <= paper['pages'] for row in rows)
            assert paper['answerUrl'], 'graded questions require an official answer source'
assert questions == manifest['questionCount'] and papers == manifest['paperCount']
print(f'EXAM_DATA_OK {papers} papers, {questions} playable questions, {corrected} corrected items, {len(manifest["years"])} years')
