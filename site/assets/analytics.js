import { renderChrome, load, stamp, chart, hbar, fmt, css, esc, PALETTE, FAMILY_COLOR } from './common.js';

renderChrome();
const [meta, an, ov] = await load('meta', 'analytics', 'overview');
const GROUP_COLOR = {
  'BI & analytics': PALETTE[0], 'Programming & data': PALETTE[1], 'Cloud & platforms': PALETTE[2],
  'Business systems': PALETTE[3], Methods: PALETTE[4],
};
const skillColor = (s) => GROUP_COLOR[meta.skillGroups[s.name]] ?? PALETTE[6];

document.getElementById('stamp').innerHTML = stamp(meta);
document.getElementById('lead').insertAdjacentHTML('afterbegin',
  `<strong>${fmt(an.open)} open ads (${an.shareOfMarket}% of the market).</strong> `);
document.getElementById('lead').insertAdjacentHTML('beforeend',
  ` Skill and requirement charts use all <strong>${fmt(an.sample)}</strong> such ads captured since ${new Date(an.sampleFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} (rolling 12 months, open and closed), so the sample grows every day.`);

document.getElementById('families').innerHTML = an.families.map((f) => `
  <div class="card kpi" style="border-top:4px solid ${FAMILY_COLOR[f.key]}">
    <div class="l">${esc(f.label)}</div>
    <div class="v">${fmt(f.active)}</div>
    <div class="l">open ads · n=${fmt(f.sample)} sampled · ${f.yoy == null ? 'trend n/a' : `${f.yoy > 0 ? '▲ +' : '▼ '}${f.yoy}% new ads YoY`}</div>
    <div class="l">Top skills: ${f.topSkills.slice(0, 3).map((s) => esc(s.name)).join(', ') || '–'}</div>
  </div>`).join('');

chart('c-skills', () => {
  const base = hbar(an.skills, { valueKey: 'pct', suffix: '%', colorBy: skillColor });
  // Empty series exist only so the legend explains the skill-group colours.
  const legendSeries = Object.entries(GROUP_COLOR).map(([name, color]) => ({ name, type: 'bar', data: [], itemStyle: { color } }));
  return {
    ...base,
    grid: { ...base.grid, top: 36 },
    legend: { top: 0, data: Object.keys(GROUP_COLOR), selectedMode: false },
    series: [...base.series, ...legendSeries],
  };
});

const sel = document.getElementById('fam-select');
sel.innerHTML = an.families.map((f) => `<option value="${f.key}">${esc(f.label)}</option>`).join('');
const famChart = () => {
  const f = an.families.find((x) => x.key === sel.value);
  return hbar(f.topSkills, { valueKey: 'pct', suffix: '%', color: FAMILY_COLOR[f.key] });
};
const redrawFam = chart('c-fam-skills', famChart);
sel.addEventListener('change', redrawFam);

chart('c-cooc', () => {
  const { skills, matrix } = an.cooccurrence;
  const data = [];
  let max = 0;
  matrix.forEach((row, i) => row.forEach((v, j) => { if (i !== j) { data.push([j, i, v]); max = Math.max(max, v); } }));
  return {
    grid: { left: 8, right: 16, top: 8, bottom: 70, containLabel: true },
    tooltip: { formatter: (p) => `${esc(skills[p.value[1]])} + ${esc(skills[p.value[0]])}: <b>${p.value[2]}</b> ads` },
    xAxis: { type: 'category', data: skills, axisLabel: { rotate: 45, interval: 0 }, splitArea: { show: false } },
    yAxis: { type: 'category', data: skills, axisLabel: { interval: 0 } },
    visualMap: { min: 0, max, show: true, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 120, textStyle: { color: css('--muted') }, inRange: { color: [css('--surface'), css('--accent')] } },
    series: [{ type: 'heatmap', data, itemStyle: { borderColor: css('--bg'), borderWidth: 1 } }],
  };
});

chart('c-compare', () => ({
  grid: { left: 16, right: 40, top: 36, bottom: 8, containLabel: true },
  legend: { top: 0 },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => v + '%' },
  xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
  yAxis: { type: 'category', data: an.compare.map((c) => c.metric).reverse() },
  series: [
    { name: 'Analytics, business & project roles', type: 'bar', data: an.compare.map((c) => c.analytics).reverse(), label: { show: true, position: 'right', formatter: '{c}%', color: css('--muted') } },
    { name: 'Whole market', type: 'bar', data: an.compare.map((c) => c.market).reverse(), itemStyle: { color: PALETTE[6] }, label: { show: true, position: 'right', formatter: '{c}%', color: css('--muted') } },
  ],
}));

chart('c-lang', () => ({
  grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
  legend: { top: 0 },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => v + '%' },
  xAxis: { type: 'category', data: an.families.map((f) => f.label), axisLabel: { interval: 0, width: 80, overflow: 'break', fontSize: 11 } },
  yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
  series: [
    { name: 'Norwegian required', type: 'bar', data: an.families.map((f) => f.norwegianReq), itemStyle: { color: PALETTE[5] } },
    { name: 'Ad in English', type: 'bar', data: an.families.map((f) => f.englishAd), itemStyle: { color: PALETTE[0] } },
  ],
}));

chart('c-trend', () => ({
  grid: { left: 8, right: 16, top: 56, bottom: 8, containLabel: true },
  legend: { top: 0, type: 'scroll' },
  tooltip: { trigger: 'axis', valueFormatter: fmt },
  xAxis: { type: 'category', data: ov.history.months, boundaryGap: false },
  yAxis: { type: 'value' },
  series: an.families.map((f) => ({
    name: f.label, type: 'line', smooth: true, symbol: 'none', data: f.history,
    lineStyle: { width: 2, color: FAMILY_COLOR[f.key] }, itemStyle: { color: FAMILY_COLOR[f.key] },
  })),
}));

const donut = (rows) => ({
  tooltip: { trigger: 'item', valueFormatter: fmt },
  legend: { bottom: 0, type: 'scroll' },
  series: [{ type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'], itemStyle: { borderColor: css('--surface'), borderWidth: 2 }, label: { formatter: '{d}%', color: css('--muted') }, data: rows }],
});
chart('c-seniority', () => donut(an.seniority));
chart('c-education', () => donut(an.education));
chart('c-counties', () => hbar(an.counties));
chart('c-employers', () => hbar(an.topEmployers, { color: PALETTE[1] }));
