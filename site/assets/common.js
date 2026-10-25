// Shared header/footer, theming and chart helpers.
const PAGES = [
  ['index.html', 'Overview'],
  ['analytics.html', 'Analytics & PM roles'],
  ['jobs.html', 'Job explorer'],
  ['method.html', 'Methodology'],
];
const REPO = 'https://github.com/nghiaphuong/norway-job-market';

// Okabe–Ito based categorical palette (colour-blind safe).
export const PALETTE = ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00', '#7F7F7F', '#F0E442'];
export const FAMILY_COLOR = {
  'data-eng-science': '#0072B2', 'data-bi': '#E69F00', 'business-analyst': '#009E73',
  'finance-analyst': '#CC79A7', 'project-product': '#56B4E9', 'research-policy': '#D55E00',
};

const THEME_KEY = 'njm-theme';
function applyStoredTheme() {
  try { const t = localStorage.getItem(THEME_KEY); if (t) document.documentElement.dataset.theme = t; } catch {}
}
applyStoredTheme();

export function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function renderChrome() {
  const here = location.pathname.split('/').pop() || 'index.html';
  const header = document.createElement('header');
  header.className = 'top';
  header.innerHTML = `<div class="wrap">
    <a class="brand" href="index.html"><span class="dot"></span>Norway Job Market Pulse</a>
    <nav class="tabs">${PAGES.map(([h, l]) => `<a href="${h}" class="${h === here ? 'on' : ''}">${l}</a>`).join('')}</nav>
    <button class="theme-btn" type="button" aria-label="Toggle colour theme">◐ Theme</button>
  </div>`;
  document.body.prepend(header);
  header.querySelector('.theme-btn').addEventListener('click', () => {
    const dark = css('--bg').toLowerCase() !== '#f6f7f9';
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    window.dispatchEvent(new Event('themechange'));
  });

  const footer = document.createElement('footer');
  footer.innerHTML = `<div class="wrap">
    Data: <a href="https://arbeidsplassen.nav.no" rel="noopener">arbeidsplassen.nav.no</a> public job-ad feed (NAV), refreshed daily by
    <a href="${REPO}/actions" rel="noopener">GitHub Actions</a>. Built by
    <a href="https://phuongcode.com" rel="noopener">Nghia Phuong Luu</a> · <a href="${REPO}" rel="noopener">Source code</a>
  </div>`;
  document.body.append(footer);
}

export async function load(...names) {
  return Promise.all(names.map((n) => fetch(`data/${n}.json`, { cache: 'no-cache' }).then((r) => r.json())));
}

export function stamp(meta) {
  const d = new Date(meta.lastRun);
  return `<span class="stamp"><span class="live"></span>Updated ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${meta.storedAds.toLocaleString('en')} ads tracked</span>`;
}

export const fmt = (n) => Number(n).toLocaleString('en');

// Chart registry: re-render every chart on resize or theme change.
const charts = [];
export function chart(id, build) {
  const el = document.getElementById(id);
  if (!el) return;
  const inst = echarts.init(el, null, { renderer: 'svg' });
  const draw = () => inst.setOption(withTheme(build()), true);
  charts.push({ inst, draw });
  draw();
  return draw;
}
window.addEventListener('resize', () => charts.forEach((c) => c.inst.resize()));
window.addEventListener('themechange', () => charts.forEach((c) => c.draw()));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => charts.forEach((c) => c.draw()));

function withTheme(opt) {
  const ink = css('--ink'), muted = css('--muted'), line = css('--line');
  const axis = (a) => a && [].concat(a).map((x) => ({
    axisLine: { lineStyle: { color: line } },
    axisTick: { show: false },
    nameTextStyle: { color: muted },
    ...x,
    axisLabel: { color: muted, ...(x.axisLabel ?? {}) },
    splitLine: { lineStyle: { color: line }, ...(x.splitLine ?? {}) },
  }));
  return {
    color: PALETTE,
    textStyle: { fontFamily: css('--font'), color: ink },
    ...opt,
    tooltip: { backgroundColor: css('--surface'), borderColor: line, textStyle: { color: ink }, confine: true, ...(opt.tooltip ?? {}) },
    legend: opt.legend && { textStyle: { color: muted }, ...opt.legend },
    xAxis: axis(opt.xAxis),
    yAxis: axis(opt.yAxis),
  };
}

// Horizontal bar of {name,value} rows, largest on top.
export function hbar(rows, { valueKey = 'value', suffix = '', color, colorBy } = {}) {
  const r = [...rows].reverse();
  return {
    grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => fmt(v) + suffix },
    xAxis: { type: 'value', splitLine: { show: false }, axisLabel: { show: false } },
    yAxis: { type: 'category', data: r.map((x) => x.name), axisLabel: { width: 170, overflow: 'truncate' } },
    series: [{
      type: 'bar', barMaxWidth: 18,
      data: r.map((x) => ({ value: x[valueKey], itemStyle: { color: colorBy ? colorBy(x) : color ?? css('--accent'), borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', color: css('--muted'), formatter: (p) => fmt(p.value) + suffix },
    }],
  };
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
