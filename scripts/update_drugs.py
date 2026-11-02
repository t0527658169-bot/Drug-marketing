#!/usr/bin/env python3
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / 'src' / 'data' / 'drugs.json'
SOURCE_URL = 'https://www.gov.il/he/departments/dynamiccollectors/drug-marketing-stoped?skip=0'
SOURCE_PATTERNS = ['קבלת הודעה', 'שם התרופה', 'שם תכשיר', 'סיבת הפסקת השיווק']


def load_existing_data():
    if not DATA_FILE.exists():
        return []
    try:
        with DATA_FILE.open('r', encoding='utf-8') as fh:
            data = json.load(fh)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def parse_date(value):
    if not value:
        return ''
    value = str(value).strip()
    value = value.replace('T00:00:00', '')
    for fmt in ('%d.%m.%Y', '%d/%m/%Y', '%Y-%m-%d', '%m/%d/%Y', '%d-%m-%Y'):
        try:
            return datetime.strptime(value, fmt).strftime('%Y-%m-%d')
        except ValueError:
            pass
    return value


def normalize_record(raw):
    name = raw.get('שם התרופה') or raw.get('שם תכשיר') or ''
    alt_name = raw.get('Drug Name') or raw.get('שם תכשיר באנגלית') or ''
    reason = raw.get('סיבת הפסקת השיווק') or ''
    ingredient = raw.get('מרכיב פעיל') or ''
    expected = raw.get('צפי לחידוש השיווק') or raw.get('צפי לחידוש') or ''
    start = raw.get('מועד תחילת הפסקת השימוש') or raw.get('מועד תחילת הפסקת השיווק') or ''
    notice = raw.get('קבלת הודעה') or ''

    return {
        'שם התרופה': name,
        'Drug Name': alt_name,
        'סיבת הפסקת השיווק': reason,
        'מרכיב פעיל': ingredient,
        'צפי לחידוש השיווק': parse_date(expected),
        'מועד תחילת הפסקת השימוש': parse_date(start),
        'קבלת הודעה': parse_date(notice),
    }


def extract_records_from_html(html):
    soup = BeautifulSoup(html, 'html.parser')
    text_box = soup.get_text(' | ', strip=True)
    if not any(keyword in text_box for keyword in SOURCE_PATTERNS):
        raise ValueError('Unexpected page structure; source page content did not contain expected labels.')

    records = []
    blocks = re.findall(r'(?is)(?:שם .*?\.\s*|שם תכשיר.*?)(?:\|.*?){0,20}?קבלת הודעה.*?(?:\|.*?){0,20}?', text_box)
    if not blocks:
        # Fallback: use raw text paragraphs and build a simple record list from repeated patterns.
        blocks = [text_box]

    for block in blocks:
        item = {}
        for label in ['שם התרופה', 'שם תכשיר', 'Drug Name', 'סיבת הפסקת השיווק', 'מרכיב פעיל', 'צפי לחידוש השיווק', 'מועד תחילת הפסקת השימוש', 'קבלת הודעה']:
            if label in block:
                value = block.split(label, 1)[1].split('|', 1)[0].strip(' :')
                item[label] = value
        if item:
            records.append(normalize_record(item))

    return records


def keep_only_valid_records(records):
    cleaned = []
    seen = set()
    for record in records:
        notice = str(record.get('קבלת הודעה') or '')
        if not notice:
            continue
        try:
            notice_dt = datetime.strptime(notice, '%Y-%m-%d').date()
        except ValueError:
            continue
        if notice_dt < datetime(2026, 9, 1).date():
            continue
        key = (
            str(record.get('שם התרופה') or '').strip(),
            str(record.get('Drug Name') or '').strip(),
            str(record.get('קבלת הודעה') or '').strip(),
        )
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(record)
    return cleaned


def main():
    existing = load_existing_data()
    try:
        response = requests.get(
            SOURCE_URL,
            timeout=30,
            headers={'User-Agent': 'Mozilla/5.0'},
            verify=False,
        )
        if response.status_code != 200:
            raise ValueError(f'HTTP status {response.status_code}')
        text = response.text
        if 'Cloudflare' in text or 'Attention Required' in text:
            raise ValueError('Cloudflare blocked the source page.')
        records = keep_only_valid_records(extract_records_from_html(text))
        if records:
            existing = records
    except Exception as exc:
        print(f'Warning: unable to update from source: {exc}')
        print('Keeping the last valid dataset.')
        if not existing:
            print('No valid dataset available. Exiting with no changes.')
            return 1

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open('w', encoding='utf-8') as fh:
        json.dump(existing, fh, ensure_ascii=False, indent=2)

    print(f'Updated dataset with {len(existing)} records.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
