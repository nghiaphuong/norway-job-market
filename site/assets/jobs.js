import { renderChrome, load, stamp, esc, FAMILY_COLOR } from './common.js';

renderChrome();
const [meta, jobs] = await load('meta', 'jobs');
document.getElementById('stamp').innerHTML = stamp(meta);

const LABEL = Object.fromEntries(meta.families.map((f) => [f.key, f.label]));
const $ = (id) => document.getElementById(id);
const opts = (el, values, label = (v) => v) =>
  el.insertAdjacentHTML('beforeend', values.map((v) => `<option value="${esc(v)}">${esc(label(v))}</option>`).join(''));

opts($('f-family'), meta.families.map((f) => f.key), (k) => LABEL[k]);
opts($('f-county'), [...new Set(jobs.map((j) => j.c).filter(Boolean))].sort());
const skillFreq = new Map();
jobs.forEach((j) => j.s.forEach((s) => skillFreq.set(s, (skillFreq.get(s) ?? 0) + 1)));
opts($('f-skill'), [...skillFreq].sort((a, b) => b[1] - a[1]).map(([s]) => s), (s) => `${s} (${skillFreq.get(s)})`);

// Restore filters from the URL so a filtered view can be shared.
const params = new URLSearchParams(location.search);
for (const [k, id] of [['q', 'q'], ['family', 'f-family'], ['county', 'f-county'], ['skill', 'f-skill']]) if (params.get(k)) $(id).value = params.get(k);
$('f-english').checked = params.get('english') === '1';

const PAGE = 150;
const date = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–');

function render() {
  const q = $('q').value.trim().toLowerCase();
  const fam = $('f-family').value, county = $('f-county').value, skill = $('f-skill').value;
  const english = $('f-english').checked;
  const rows = jobs.filter((j) =>
    (!q || `${j.t} ${j.e}`.toLowerCase().includes(q)) &&
    (!fam || j.f === fam) && (!county || j.c === county) &&
    (!skill || j.s.includes(skill)) && (!english || (j.l === 'en' && !j.n)));

  $('count').textContent = `${rows.length.toLocaleString('en')} of ${jobs.length.toLocaleString('en')} roles`;
  $('rows').innerHTML = rows.slice(0, PAGE).map((j) => `<tr>
    <td style="border-left:3px solid ${FAMILY_COLOR[j.f]}">
      <a href="https://arbeidsplassen.nav.no/stillinger/stilling/${j.id}" target="_blank" rel="noopener">${esc(j.t)}</a><br>
      <span class="count">${esc(j.e)} · ${esc(LABEL[j.f])}${j.r !== 'Not stated' ? ' · ' + esc(j.r) : ''}</span>
    </td>
    <td>${esc(j.m || j.c || '–')}${j.m && j.c ? `<br><span class="count">${esc(j.c)}</span>` : ''}</td>
    <td>${j.n ? '<span class="tag no">Norwegian required</span>' : ''}${j.l === 'en' ? '<span class="tag en">English ad</span>' : ''}${j.w !== 'Not stated' ? `<span class="tag">${esc(j.w.replace(' mentioned', ''))}</span>` : ''}
      ${j.s.slice(0, 8).map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</td>
    <td>${date(j.p)}</td>
    <td>${date(j.x)}</td>
  </tr>`).join('') || '<tr><td colspan="5" class="skeleton">No roles match these filters.</td></tr>';
  $('more').textContent = rows.length > PAGE ? `Showing the ${PAGE} most recent — narrow the filters to see the rest.` : '';

  const p = new URLSearchParams();
  if (q) p.set('q', q); if (fam) p.set('family', fam); if (county) p.set('county', county);
  if (skill) p.set('skill', skill); if (english) p.set('english', '1');
  history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
}

['q', 'f-family', 'f-county', 'f-skill', 'f-english'].forEach((id) => $(id).addEventListener('input', render));
render();
