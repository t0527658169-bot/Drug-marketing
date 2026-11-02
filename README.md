# Drug Monitoring Dashboard

A modern Hebrew-language dashboard for tracking medicine marketing stoppages, filtered by date and reason, with Excel export.

## Features

- Search by drug name, ingredients, and reason
- Filter by date window and stop reason
- Excel export using the same header names as the source sheet
- Free-tier deployment compatible with GitHub + Vercel
- Daily refresh job via GitHub Actions

## Local development

```bash
npm install
npm run dev
```

## Daily full refresh

```bash
python scripts/update_drugs.py
```

## Deployment

1. Push the project to GitHub.
2. Import the repo to Vercel.
3. Use the default settings for a static React app.
4. Keep the project on free tiers only to avoid any auto-charge.

> The project is designed to run free. The scraper attempts to reach the official source, but in some environments the government site is blocked by Cloudflare or certificates, so the script keeps the last valid data instead of failing the build.
