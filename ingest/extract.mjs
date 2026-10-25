// Turns one NAV ad (feed entry detail) into a lean, analysis-ready record.
import {
  ROLE_FAMILIES, BOILERPLATE, GENERIC_TITLE, ANALYTICS_EVIDENCE, ANALYTICS_EVIDENCE_MIN,
  SKILLS, NORWEGIAN_REQUIRED, ENGLISH_REQUIRED, REMOTE, HYBRID,
  SENIORITY, EDUCATION, EN_STOP, NO_STOP, COUNTY_FIX,
} from './dictionaries.mjs';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function htmlToText(html = '') {
  return html
    .replace(/<(br|\/p|\/li|\/h\d)[^>]*>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|[a-z]+);/gi, (m, e) =>
      e[0] === '#' ? String.fromCharCode(+e.slice(1)) : ENTITIES[e.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Free-text fields can carry personal contact details; mask them before storing.
const redact = (s) => s
  .replace(/[\w.%+-]+@[\w-]+(\.[\w-]+)+/g, '[e-mail]')
  .replace(/(\+47[\s-]?)?\b(\d{3}[\s-]?\d{2}[\s-]?\d{3}|\d{2}([\s-]?\d{2}){3})\b/g, '[phone]');
const clean = (s) => redact((s ?? '').toString().replace(/[\r\n;]+/g, ' ').trim());

export function classifyTitle(title) {
  for (const f of ROLE_FAMILIES) if (f.title.test(title)) return f.key;
  return '';
}

export function extract(entry) {
  const a = entry.ad_content ?? {};
  const loc = a.workLocations?.[0] ?? {};
  const styrk = (a.categoryList ?? []).find((c) => c.categoryType === 'STYRK08');
  const occ = a.occupationCategories?.[0] ?? {};
  const title = clean(a.title);
  const jobtitle = clean(a.jobtitle);
  const text = htmlToText(a.description)
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !BOILERPLATE.some((re) => re.test(s)))
    .join(' ');
  const all = `${title}. ${jobtitle}. ${text}`;

  // Role family: title first, then generic titles with strong analytics evidence.
  let family = classifyTitle(`${title} | ${jobtitle}`);
  let familyBasis = family ? 'title' : '';
  if (!family && GENERIC_TITLE.test(`${title} ${jobtitle}`)) {
    const hits = ANALYTICS_EVIDENCE.filter((re) => re.test(text)).length;
    if (hits >= ANALYTICS_EVIDENCE_MIN) { family = 'data-bi'; familyBasis = 'description'; }
  }

  const skills = SKILLS.filter((s) => s.re.test(all)).map((s) => s.key);
  const en = (text.match(EN_STOP) ?? []).length;
  const no = (text.match(NO_STOP) ?? []).length;
  const county = clean(loc.county).toUpperCase();

  return {
    id: entry.uuid,
    status: entry.status,
    published: (a.published ?? '').slice(0, 10),
    expires: (a.expires ?? '').slice(0, 10),
    updated: (entry.sistEndret ?? a.updated ?? '').slice(0, 10),
    closed: '',
    title,
    jobtitle,
    employer: clean(a.employer?.name),
    orgnr: clean(a.employer?.orgnr),
    sector: clean(a.sector),
    county: COUNTY_FIX[county] ?? county,
    municipal: clean(loc.municipal).toUpperCase(),
    occ1: clean(occ.level1),
    occ2: clean(occ.level2),
    styrk: clean(styrk?.code),
    styrk_name: clean(styrk?.name),
    extent: clean(a.extent),
    engagement: clean(a.engagementtype),
    positions: parseInt(a.positioncount, 10) || 1,
    source: clean(a.source),
    family,
    family_basis: familyBasis,
    seniority: SENIORITY.find((s) => s.re.test(title))?.key ?? 'Not stated',
    education: EDUCATION.find((e) => e.re.test(text))?.key ?? 'Not stated',
    skills: skills.join('|'),
    norwegian_req: NORWEGIAN_REQUIRED.test(all) ? 1 : 0,
    english_req: ENGLISH_REQUIRED.test(all) ? 1 : 0,
    ad_lang: en > no ? 'en' : 'no',
    work_mode: REMOTE.test(all) ? 'Remote mentioned' : HYBRID.test(all) ? 'Hybrid mentioned' : 'Not stated',
    desc_words: text ? text.split(' ').length : 0,
  };
}

export const COLUMNS = Object.keys(extract({ ad_content: {} }));
