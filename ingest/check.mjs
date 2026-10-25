// Data-quality gate: the workflow fails (and nothing deploys) if any check fails.
import fs from 'node:fs';
import path from 'node:path';
import { readCsv } from './csv.mjs';
import { ROLE_FAMILIES, SKILLS } from './dictionaries.mjs';
import { COLUMNS } from './extract.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = path.join(ROOT, 'data/ads');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.csv'));
const ads = files.flatMap((f) => readCsv(path.join(dir, f)).map((r) => ({ ...r, _file: f })));

const families = new Set(['', ...ROLE_FAMILIES.map((f) => f.key)]);
const skills = new Set(SKILLS.map((s) => s.key));
const date = /^\d{4}-\d{2}-\d{2}$/;
const failures = [];
const check = (name, bad, sample) => {
  const ok = !bad;
  console.log(`${ok ? '✔' : '✘'} ${name}${ok ? '' : ` — ${bad} rows, e.g. ${JSON.stringify(sample)}`}`);
  if (!ok) failures.push(name);
};
const rule = (name, pred) => {
  const bad = ads.filter((a) => !pred(a));
  check(name, bad.length, bad[0] && { id: bad[0].id, file: bad[0]._file });
};

const header = fs.readFileSync(path.join(dir, files[0]), 'utf8').split('\n')[0];
check('CSV header matches schema', header === COLUMNS.join(',') ? 0 : 1, header);
const ids = new Set();
rule('ids are unique', (a) => !ids.has(a.id) && ids.add(a.id));
rule('id is a UUID', (a) => /^[0-9a-f-]{36}$/.test(a.id));
rule('published is a date in the right partition', (a) => date.test(a.published) && a._file === `${a.published.slice(0, 7)}.csv`);
rule('expires/updated/closed are dates or empty', (a) => ['expires', 'updated', 'closed'].every((k) => !a[k] || date.test(a[k])));
rule('status is ACTIVE or INACTIVE', (a) => a.status === 'ACTIVE' || a.status === 'INACTIVE');
rule('closed ads have a close date', (a) => a.status === 'ACTIVE' || a.closed);
rule('role family is known', (a) => families.has(a.family));
rule('skills are from the dictionary', (a) => !a.skills || a.skills.split('|').every((s) => skills.has(s)));
rule('flags are 0/1', (a) => ['norwegian_req', 'english_req'].every((k) => a[k] === '0' || a[k] === '1'));
rule('no e-mail addresses stored', (a) => !Object.values(a).some((v) => /\S+@\S+\.\S+/.test(v)));

const active = ads.filter((a) => a.status === 'ACTIVE').length;
check('plausible number of open ads (3k–60k)', active >= 3000 && active <= 60000 ? 0 : 1, active);

console.log(`${ads.length} ads in ${files.length} partitions, ${active} active`);
if (failures.length) { console.error(`${failures.length} check(s) failed`); process.exit(1); }
