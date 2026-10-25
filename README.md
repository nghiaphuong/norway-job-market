# Norway Job Market Pulse

**Live dashboard → https://jobs.phuongcode.com**

What is Norway hiring for, and what do employers ask of data, business-analysis and project people? This project answers that **every day** from NAV's public feed of every job ad on arbeidsplassen.no. The pipeline runs unattended, checks its own data quality, and publishes a static dashboard.

![Daily ingest](https://github.com/nghiaphuong/norway-job-market/actions/workflows/daily.yml/badge.svg)

## Questions it answers

| Audience | Question | Where |
|---|---|---|
| Job seekers | Which skills (SQL, Power BI, Python, Agile…) appear most in analytics, BA and PM ads? Which ones come up together? | Analytics & PM roles |
| International candidates | How often is Norwegian an explicit requirement? Which ads are written in English? | Analytics & PM roles · Job explorer |
| Recruiters / training providers | How is demand moving month by month, by role family and across the whole market? | Overview |
| Anyone | Which open roles match *my* skills and county right now? | Job explorer (shareable filtered URLs) |

## How it works

```
NAV job-ad feed ──► GitHub Actions (daily 05:00 UTC)
                     ├─ unit tests for classification rules
                     ├─ incremental ingest (resumes from saved feed cursor)
                     ├─ rule-based extraction: role family, 42 skills, language, work mode, seniority, education
                     ├─ data-quality gate (schema, uniqueness, dates, PII) ── fails the run on bad data
                     ├─ commit versioned CSV  (data/ads/YYYY-MM.csv)
                     └─ aggregate → JSON → deploy static site (GitHub Pages)
```

* **Incremental + reconciliation.** Daily runs read only new feed pages. A weekly full walk (≈5,000 pages, 1.4M ad versions) reconciles statuses and rebuilds the monthly history back to mid-2023.
* **Explainable rules, not a black box.** All rules sit in [`ingest/dictionaries.mjs`](ingest/dictionaries.mjs) and are covered by [regression tests](test/rules.test.mjs). Generic public-sector titles like *Rådgiver* count as analytics roles only when the description has at least 3 distinct analytics signals.
* **Privacy by design.** Recruiter names, e-mails and phone numbers are never stored, and the quality gate fails the run if an e-mail address ever shows up.
* **No dependencies.** Plain Node.js 24 and ECharts from a CDN.

## Repository layout

```
ingest/
  nav.mjs           NAV feed client (token, paging, retries, worker pool)
  dictionaries.mjs  classification rules (role families, skills, language, seniority…)
  extract.mjs       one ad → one lean record
  run.mjs           incremental / full / re-extract ingest
  check.mjs         data-quality gate
  build.mjs         aggregates + plain-language insights for the site
data/
  ads/YYYY-MM.csv   one row per ad, partitioned by publication month
  history/          monthly new ads by role family (title-based)
  state.json        feed cursor + last run statistics
site/               static dashboard (Overview, Analytics & PM roles, Job explorer, Methodology)
test/               rule regression tests
```

## Run locally

```bash
npm run ingest:full   # first run: walks the whole feed (~5 min)
npm run check && npm run build
npm run serve         # http://localhost:4173
```

## Limitations

See the [Methodology page](https://jobs.phuongcode.com/method.html). In short: arbeidsplassen.no covers most but not all of the Norwegian market, counts are ads rather than positions, and rule-based extraction favours precision over recall.

---
Built by **Nghia Phuong Luu** · [phuongcode.com](https://phuongcode.com) · Data © NAV, used under NAV's open-data terms.
