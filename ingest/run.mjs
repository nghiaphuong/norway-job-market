// Daily ingest: pull new/changed ads from NAV, extract features, upsert CSVs.
//   node ingest/run.mjs            incremental (resumes from data/state.json)
//   node ingest/run.mjs --full     walk the whole feed: reconcile statuses + rebuild history
//   node ingest/run.mjs --reextract  re-fetch every active ad (after rule changes)
import fs from 'node:fs';
import path from 'node:path';
import { walkFeed, fetchDetails } from './nav.mjs';
import { extract, classifyTitle, COLUMNS } from './extract.mjs';
import { readCsv, writeCsv } from './csv.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ADS_DIR = path.join(ROOT, 'data/ads');
const STATE_FILE = path.join(ROOT, 'data/state.json');
const HISTORY_FILE = path.join(ROOT, 'data/history/new_ads_by_month.csv');
const today = new Date().toISOString().slice(0, 10);

const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
const full = process.argv.includes('--full') || !state.cursor;
const reextract = process.argv.includes('--reextract');

// Load stored ads, keyed by id.
const ads = new Map();
for (const f of fs.readdirSync(ADS_DIR).filter((f) => f.endsWith('.csv'))) {
  for (const r of readCsv(path.join(ADS_DIR, f))) ads.set(r.id, r);
}
console.log(`Loaded ${ads.size} stored ads · mode=${full ? 'full' : 'incremental'}`);

// Walk the feed. `latest` keeps the last status/date seen per ad.
const latest = new Map();
const firstSeen = full ? new Map() : null;
const { last, pages } = await walkFeed(full ? undefined : state.cursor, (items) => {
  for (const it of items) {
    const fe = it._feed_entry;
    const date = it.date_modified.slice(0, 10);
    latest.set(it.id, { status: fe.status, date });
    if (firstSeen && !firstSeen.has(it.id)) {
      firstSeen.set(it.id, { month: date.slice(0, 7), family: classifyTitle(fe.title ?? '') || 'other' });
    }
  }
});
console.log(`Walked ${pages} pages, ${latest.size} distinct ads touched`);

// Status changes: ads that went inactive.
let closed = 0;
const markClosed = (ad, date) => {
  if (ad.status === 'ACTIVE') { ad.status = 'INACTIVE'; ad.closed = date; closed++; }
};
for (const [id, l] of latest) if (l.status !== 'ACTIVE' && ads.has(id)) markClosed(ads.get(id), l.date);
if (full) {
  // Anything we still think is active but the feed no longer lists as active is closed.
  for (const ad of ads.values()) if (latest.get(ad.id)?.status !== 'ACTIVE') markClosed(ad, latest.get(ad.id)?.date ?? today);
}

// Details for new or updated active ads.
const toFetch = [...latest]
  .filter(([id, l]) => l.status === 'ACTIVE' && (reextract || !ads.has(id) || ads.get(id).updated < l.date))
  .map(([id]) => id);
if (reextract) for (const ad of ads.values()) if (ad.status === 'ACTIVE' && !latest.has(ad.id)) toFetch.push(ad.id);
console.log(`Fetching ${toFetch.length} ad details…`);
const { details, failed } = await fetchDetails(toFetch);
let added = 0, updated = 0;
for (const d of details) {
  const rec = extract(d);
  if (!rec.published) continue;
  if (ads.has(rec.id)) updated++; else added++;
  ads.set(rec.id, rec);
}

// Write monthly partitions (by publication month), newest data first inside each file.
const parts = new Map();
for (const ad of ads.values()) {
  const m = ad.published.slice(0, 7);
  if (!parts.has(m)) parts.set(m, []);
  parts.get(m).push(ad);
}
for (const [m, rows] of parts) {
  rows.sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id));
  writeCsv(path.join(ADS_DIR, `${m}.csv`), COLUMNS, rows);
}

// History of new ads per month by title-based family (full walks only).
if (firstSeen) {
  const counts = new Map();
  for (const { month, family } of firstSeen.values()) {
    const k = `${month},${family}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const rows = [...counts].map(([k, n]) => { const [month, family] = k.split(','); return { month, family, new_ads: n }; })
    .sort((a, b) => a.month.localeCompare(b.month) || a.family.localeCompare(b.family));
  writeCsv(HISTORY_FILE, ['month', 'family', 'new_ads'], rows);
  state.historyBuiltAt = today;
}

const active = [...ads.values()].filter((a) => a.status === 'ACTIVE').length;
Object.assign(state, {
  cursor: last,
  lastRun: new Date().toISOString(),
  lastRunStats: { mode: full ? 'full' : 'incremental', pages, added, updated, closed, failed, stored: ads.size, active },
});
fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
console.log(state.lastRunStats);
