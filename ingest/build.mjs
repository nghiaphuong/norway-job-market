// Aggregates data/ads + data/history into small JSON files for the static site.
import fs from 'node:fs';
import path from 'node:path';
import { readCsv } from './csv.mjs';
import { ROLE_FAMILIES, SKILLS } from './dictionaries.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'site/data');
fs.mkdirSync(OUT, { recursive: true });

const ads = fs.readdirSync(path.join(ROOT, 'data/ads')).filter((f) => f.endsWith('.csv'))
  .flatMap((f) => readCsv(path.join(ROOT, 'data/ads', f)));
const history = readCsv(path.join(ROOT, 'data/history/new_ads_by_month.csv'));
const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/state.json'), 'utf8'));

const FAMILY = Object.fromEntries(ROLE_FAMILIES.map((f) => [f.key, f.label]));
const FAMILY_KEYS = ROLE_FAMILIES.map((f) => f.key);
const active = ads.filter((a) => a.status === 'ACTIVE');
const today = new Date(state.lastRun ?? Date.now());
const daysAgo = (d) => (today - new Date(d)) / 864e5;
const openAnalytics = active.filter((a) => a.family);
// Skill/requirement analysis uses every ad captured in the last 12 months (open or
// closed), so the sample grows each day instead of being limited to today's open ads.
const pool = ads.filter((a) => a.status === 'ACTIVE' || daysAgo(a.published) <= 365);
const analytics = pool.filter((a) => a.family);

// ---------- helpers ----------
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);
const share = (rows, fn) => pct(rows.filter(fn).length, rows.length);
function countBy(rows, key, { top = Infinity, weight } = {}) {
  const m = new Map();
  for (const r of rows) {
    const keys = typeof key === 'function' ? [].concat(key(r)) : [r[key]];
    for (const k of keys) if (k) m.set(k, (m.get(k) ?? 0) + (weight ? +r[weight] || 1 : 1));
  }
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, top).map(([name, value]) => ({ name, value }));
}
const skillsOf = (a) => (a.skills ? a.skills.split('|') : []);
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
function skillShare(rows, top = 20) {
  return countBy(rows, skillsOf, { top }).map((s) => ({ ...s, pct: pct(s.value, rows.length) }));
}

// ---------- history (monthly new ads, title-based) ----------
// The feed was seeded in June 2023; months before the first complete month are dropped,
// as is the current (incomplete) month.
const months = [...new Set(history.map((h) => h.month))].sort();
const firstFull = months.find((m) => m >= '2023-07');
const thisMonth = today.toISOString().slice(0, 7);
const histMonths = months.filter((m) => m >= firstFull && m < thisMonth);
const hist = (fam) => histMonths.map((m) =>
  history.filter((h) => h.month === m && (fam === '*' ? true : fam === '**' ? h.family !== 'other' : h.family === fam))
    .reduce((s, h) => s + +h.new_ads, 0));
const histTotal = hist('*');
const histAnalytics = hist('**');

// Year-over-year change on the last 12 complete months vs the 12 before.
function yoy(series) {
  if (series.length < 24) return null;
  const a = series.slice(-12).reduce((s, v) => s + v, 0);
  const b = series.slice(-24, -12).reduce((s, v) => s + v, 0);
  return b ? Math.round((1000 * (a - b)) / b) / 10 : null;
}

// ---------- overview ----------
const weekKey = (d) => {
  const dt = new Date(d); const day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day); return dt.toISOString().slice(0, 10);
};
const overview = {
  kpis: {
    activeAds: active.length,
    activePositions: active.reduce((s, a) => s + (+a.positions || 1), 0),
    new7d: active.filter((a) => daysAgo(a.published) <= 7).length,
    publicShare: share(active, (a) => a.sector === 'Offentlig'),
    fullTimeShare: share(active, (a) => a.extent === 'Heltid'),
    englishAdShare: share(active, (a) => a.ad_lang === 'en'),
    norwegianReqShare: share(active, (a) => +a.norwegian_req),
    analyticsActive: openAnalytics.length,
    marketYoY: yoy(histTotal),
  },
  history: { months: histMonths, total: histTotal, analytics: histAnalytics },
  byOccupation: countBy(active, 'occ1').map((o) => ({ ...o, name: o.name || 'Not classified' })),
  byCounty: countBy(active, 'county').map((c) => ({ ...c, name: titleCase(c.name) })),
  bySector: countBy(active, (a) => a.sector || 'Not stated'),
  byExtent: countBy(active, (a) => a.extent || 'Not stated'),
  byEngagement: countBy(active, (a) => a.engagement || 'Not stated', { top: 6 }),
  topEmployers: countBy(active, 'employer', { top: 15, weight: 'positions' }),
};

// ---------- analytics deep-dive ----------
const famRows = (k) => analytics.filter((a) => a.family === k);
const families = FAMILY_KEYS.map((k) => {
  const rows = famRows(k);
  return {
    key: k,
    label: FAMILY[k],
    active: openAnalytics.filter((a) => a.family === k).length,
    sample: rows.length,
    norwegianReq: share(rows, (a) => +a.norwegian_req),
    englishAd: share(rows, (a) => a.ad_lang === 'en'),
    remoteOrHybrid: share(rows, (a) => a.work_mode !== 'Not stated'),
    publicShare: share(rows, (a) => a.sector === 'Offentlig'),
    senior: share(rows, (a) => a.seniority === 'Senior' || a.seniority === 'Leadership'),
    history: hist(k),
    yoy: yoy(hist(k)),
    topSkills: skillShare(rows, 10),
    topCounties: countBy(rows, 'county', { top: 5 }).map((c) => ({ ...c, name: titleCase(c.name) })),
  };
});

const topSkillKeys = skillShare(analytics, 15).map((s) => s.name);
const cooc = topSkillKeys.map((a) => topSkillKeys.map((b) =>
  analytics.filter((r) => { const s = skillsOf(r); return s.includes(a) && s.includes(b); }).length));

const analyticsOut = {
  open: openAnalytics.length,
  sample: analytics.length,
  sampleFrom: analytics.reduce((m, a) => (a.published < m ? a.published : m), today.toISOString().slice(0, 10)),
  shareOfMarket: pct(openAnalytics.length, active.length),
  families,
  skills: skillShare(analytics, 25),
  cooccurrence: { skills: topSkillKeys, matrix: cooc },
  compare: [
    { metric: 'Norwegian explicitly required', analytics: share(analytics, (a) => +a.norwegian_req), market: share(pool, (a) => +a.norwegian_req) },
    { metric: 'Ad written in English', analytics: share(analytics, (a) => a.ad_lang === 'en'), market: share(pool, (a) => a.ad_lang === 'en') },
    { metric: 'Remote / hybrid mentioned', analytics: share(analytics, (a) => a.work_mode !== 'Not stated'), market: share(pool, (a) => a.work_mode !== 'Not stated') },
    { metric: 'Public sector', analytics: share(analytics, (a) => a.sector === 'Offentlig'), market: share(pool, (a) => a.sector === 'Offentlig') },
    { metric: 'Full-time', analytics: share(analytics, (a) => a.extent === 'Heltid'), market: share(pool, (a) => a.extent === 'Heltid') },
    { metric: 'Degree mentioned', analytics: share(analytics, (a) => a.education !== 'Not stated'), market: share(pool, (a) => a.education !== 'Not stated') },
  ],
  seniority: countBy(analytics, 'seniority'),
  education: countBy(analytics, 'education'),
  counties: countBy(analytics, 'county', { top: 12 }).map((c) => ({ ...c, name: titleCase(c.name) })),
  sectors: countBy(analytics, (a) => a.sector || 'Not stated'),
  topEmployers: countBy(analytics, 'employer', { top: 15 }),
  // English-friendly: English-language ads that do not demand Norwegian.
  englishFriendly: share(analytics, (a) => a.ad_lang === 'en' && !+a.norwegian_req),
};

// ---------- job explorer ----------
const jobs = openAnalytics
  .sort((a, b) => b.published.localeCompare(a.published))
  .map((a) => ({
    id: a.id, t: a.title, e: a.employer, c: titleCase(a.county), m: titleCase(a.municipal),
    f: a.family, p: a.published, x: a.expires, s: skillsOf(a), n: +a.norwegian_req,
    l: a.ad_lang, w: a.work_mode, r: a.seniority, sec: a.sector,
  }));

// ---------- insights (plain-language headlines) ----------
const byActive = [...families].sort((a, b) => b.active - a.active);
const s = analyticsOut.skills;
const growth = families.filter((f) => f.yoy != null).sort((a, b) => b.yoy - a.yoy);
const insights = [
  `${overview.kpis.activeAds.toLocaleString('en')} job ads are open in Norway right now; ${openAnalytics.length.toLocaleString('en')} (${analyticsOut.shareOfMarket}%) are analytics, business or project roles.`,
  s[0] && `${s[0].name} is the most requested skill in these roles (${s[0].pct}% of ads), followed by ${s[1]?.name} (${s[1]?.pct}%) and ${s[2]?.name} (${s[2]?.pct}%).`,
  `${analyticsOut.compare[0].analytics}% of analytics-type ads explicitly require Norwegian, versus ${analyticsOut.compare[0].market}% across the whole market; ${analyticsOut.englishFriendly}% are written in English without a Norwegian requirement.`,
  byActive[0] && `${byActive[0].label} is the largest group (${byActive[0].active} open ads)${growth[0] ? `; ${growth[0].label} has the strongest 12-month trend in new ads (${growth[0].yoy > 0 ? '+' : ''}${growth[0].yoy}% YoY, title-based).` : '.'}`,
  overview.kpis.marketYoY != null && `New job ads across all occupations are ${overview.kpis.marketYoY >= 0 ? 'up' : 'down'} ${Math.abs(overview.kpis.marketYoY)}% over the last 12 complete months versus the year before.`,
].filter(Boolean);

const meta = {
  generatedAt: new Date().toISOString(),
  lastRun: state.lastRun,
  lastRunStats: state.lastRunStats,
  storedAds: ads.length,
  historyFrom: histMonths[0],
  historyTo: histMonths.at(-1),
  families: ROLE_FAMILIES.map(({ key, label }) => ({ key, label })),
  skillGroups: Object.fromEntries(SKILLS.map((s) => [s.key, s.group])),
  insights,
};

const write = (name, obj) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj));
write('meta.json', meta);
write('overview.json', overview);
write('analytics.json', analyticsOut);
write('jobs.json', jobs);
console.log(`Built site data: ${active.length} active, ${openAnalytics.length} open / ${analytics.length} sampled analytics roles, ${histMonths.length} history months`);
insights.forEach((i) => console.log(' •', i));
