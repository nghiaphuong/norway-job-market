import { renderChrome, load, stamp, chart, hbar, fmt, css, esc, PALETTE } from './common.js';

renderChrome();
const [meta, ov] = await load('meta', 'overview');
const k = ov.kpis;

document.getElementById('stamp').innerHTML = stamp(meta);
document.getElementById('insights').innerHTML = meta.insights.map((i) => `<li>${esc(i)}</li>`).join('');
document.getElementById('kpis').innerHTML = [
  [fmt(k.activeAds), 'open job ads'],
  [fmt(k.activePositions), 'open positions'],
  [fmt(k.new7d), 'published in the last 7 days'],
  [k.marketYoY == null ? '–' : `${k.marketYoY > 0 ? '+' : ''}${k.marketYoY}%`, 'new ads, last 12 months vs prior 12'],
  [`${k.publicShare}%`, 'in the public sector'],
  [`${k.fullTimeShare}%`, 'full-time'],
  [`${k.norwegianReqShare}%`, 'explicitly require Norwegian'],
  [`${k.englishAdShare}%`, 'written in English'],
].map(([v, l]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');

chart('c-history', () => ({
  grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
  legend: { top: 0 },
  tooltip: { trigger: 'axis', valueFormatter: fmt },
  xAxis: { type: 'category', data: ov.history.months, boundaryGap: false },
  yAxis: [
    { type: 'value', name: 'All ads', splitLine: { show: true } },
    { type: 'value', name: 'Analytics & PM', splitLine: { show: false } },
  ],
  series: [
    { name: 'All occupations', type: 'line', smooth: true, symbol: 'none', data: ov.history.total, areaStyle: { opacity: 0.08 }, lineStyle: { width: 2 } },
    { name: 'Analytics, business & project', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 1, data: ov.history.analytics, lineStyle: { width: 2 } },
  ],
}));

const OCC = {
  'Helse og sosial': 'Health & social care', Utdanning: 'Education', 'Salg og service': 'Sales & service',
  'Håndverkere': 'Skilled trades', 'Industri og produksjon': 'Industry & production', 'Transport og lager': 'Transport & logistics',
  'Kontor og økonomi': 'Office, finance & admin', 'Bygg og anlegg': 'Construction', 'Reiseliv og mat': 'Hospitality & food',
  'Kultur og kreative yrker': 'Culture & creative', IT: 'IT', 'Ingeniør- og ikt-fag': 'Engineering & ICT',
  'Ingeniør og teknologi': 'Engineering & technology', 'Ledelse': 'Management', 'Jordbruk, skogbruk og fiske': 'Agriculture, forestry & fishing',
  'Natur og miljø': 'Nature & environment', 'Akademiske yrker': 'Academic professions', 'Juss og jus': 'Law',
  'Politi, forsvar og sikkerhet': 'Police, defence & security', 'Uoppgitt/ ikke identifiserbare': 'Not classified',
};
chart('c-occ', () => hbar(ov.byOccupation.slice(0, 16).map((o) => ({ ...o, name: OCC[o.name] ?? o.name }))));
chart('c-county', () => hbar(ov.byCounty.slice(0, 16)));
chart('c-employers', () => hbar(ov.topEmployers, { color: PALETTE[1] }));

const donut = (rows) => ({
  tooltip: { trigger: 'item', valueFormatter: fmt },
  legend: { bottom: 0, type: 'scroll' },
  series: [{
    type: 'pie', radius: ['48%', '72%'], center: ['50%', '45%'],
    itemStyle: { borderColor: css('--surface'), borderWidth: 2 },
    label: { formatter: '{d}%', color: css('--muted') },
    data: rows,
  }],
});
const NO = { Offentlig: 'Public', Privat: 'Private', Fast: 'Permanent', Vikariat: 'Temporary cover', Engasjement: 'Fixed-term', Prosjekt: 'Project', Sesong: 'Seasonal', Annet: 'Other', 'Trainee': 'Trainee', 'Lærling': 'Apprentice', Selvstendig: 'Self-employed', Feriejobb: 'Summer job' };
const en = (rows) => rows.map((r) => ({ ...r, name: NO[r.name] ?? r.name }));
chart('c-sector', () => donut(en(ov.bySector)));
chart('c-engagement', () => donut(en(ov.byEngagement)));
