// Regression tests for the classification rules: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyTitle, extract } from '../ingest/extract.mjs';

const ad = (title, description = '', extra = {}) =>
  extract({ uuid: '00000000-0000-0000-0000-000000000000', status: 'ACTIVE', ad_content: { title, description, published: '2026-10-01', ...extra } });

test('role families from titles', () => {
  const cases = {
    'Dataanalytiker til Statens vegvesen': 'data-bi',
    'Senior Data Analyst': 'data-bi',
    'BI-utvikler': 'data-bi',
    'Data Engineer – Azure': 'data-eng-science',
    'Forretningsanalytiker': 'business-analyst',
    'Business Analyst, Payments': 'business-analyst',
    'Business Controller': 'finance-analyst',
    'Prosjektleder IT': 'project-product',
    'Product Owner': 'project-product',
    'Seniorrådgiver analyse': 'research-policy',
    'Utreder': 'research-policy',
    'Sykepleier': '',
    'Butikkmedarbeider': '',
    'Bilmekaniker': '',
    'Etterforsker ved Kristiansand politistasjon': '',
    'Familieutreder i turnus': '',
  };
  for (const [title, family] of Object.entries(cases)) assert.equal(classifyTitle(title), family, title);
});

test('generic title promoted only with enough analytics evidence', () => {
  const strong = ad('Rådgiver', '<p>Du jobber med SQL, Power BI og rapportering av KPIer.</p>');
  assert.equal(strong.family, 'data-bi');
  assert.equal(strong.family_basis, 'description');
  assert.equal(ad('Rådgiver', '<p>Du skal jobbe med rapportering.</p>').family, '');
});

test('skills, including ambiguous ones', () => {
  const a = ad('Data Analyst', '<p>Erfaring med SQL, Python og R. Kjennskap til Power BI og DAX.</p>');
  for (const s of ['SQL', 'Python', 'R', 'Power BI', 'DAX / Power Query']) assert.ok(a.skills.includes(s), s);
  assert.ok(!ad('Kabinansatt', '<p>Bli med i SAS sitt team.</p>').skills.includes('SAS'));
});

test('recruitment boilerplate does not create skills', () => {
  const a = ad('Prosjektleder', '<p>Opplysningene du gir brukes til å utarbeide anonymisert statistikk som alle statlige virksomheter rapporterer.</p><p>Kunstig intelligens (KI) kan brukes som støtte i rekrutteringsprosessen.</p>');
  assert.equal(a.skills, '');
});

test('Norwegian requirement and ad language', () => {
  assert.equal(ad('Analytiker', '<p>Du må beherske norsk muntlig og skriftlig.</p>').norwegian_req, 1);
  assert.equal(ad('Analyst', '<p>Fluent Norwegian is required for this role.</p>').norwegian_req, 1);
  assert.equal(ad('Analyst', '<p>We are looking for you and you will work with our team.</p>').norwegian_req, 0);
  assert.equal(ad('Analyst', '<p>We are looking for you and you will work with our team to build the future.</p>').ad_lang, 'en');
  assert.equal(ad('Analytiker', '<p>Vi søker deg som har lyst til å jobbe med data og analyse i et godt miljø.</p>').ad_lang, 'no');
});

test('contact details are never part of the record', () => {
  const a = ad('Data Analyst', '', { contactList: [{ name: 'Kari', email: 'kari@example.no', phone: '12345678' }] });
  assert.ok(!JSON.stringify(a).includes('kari@example.no'));
  const t = ad('Frisør søkes – send CV til kari@example.no eller ring 912 34 567');
  assert.ok(!t.title.includes('kari@example.no') && !t.title.includes('912 34 567'), t.title);
});
