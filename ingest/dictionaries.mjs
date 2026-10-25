// Rule dictionaries for classifying Norwegian job ads.
// Every rule is a case-insensitive regex tested against normalised ad text.
// Keep rules readable: they are documented on the Methodology page.

// Role families for the analytics / business / project deep-dive.
// Order matters: the first family whose title rule matches wins.
export const ROLE_FAMILIES = [
  {
    key: 'data-eng-science',
    label: 'Data Engineering & Science',
    title: /data ?engineer|dataingeni[øo]r|data ?scientist|maskinl[æa]ring|machine learning|\bml[- ]?(engineer|ingeni)|\bai[- ](engineer|utvikler|developer|spesialist|specialist)|dataplattform|data platform|analytics engineer/i,
  },
  {
    key: 'data-bi',
    label: 'Data & BI Analyst',
    title: /data ?analyti|data ?analyst|dataanalyse|\bbi[- ]?(utvikler|developer|analyti|analyst|konsulent|consultant|spesialist|specialist|r[åa]dgiver|arkitekt|architect|engineer|ansvarlig|lead)|business intelligence|power ?bi|rapporteringsr[åa]dgiver|rapportutvikler|reporting (analyst|specialist)|analyseutvikler|analytics (manager|lead|specialist|consultant)|innsiktsanalyti|insight analyst/i,
  },
  {
    key: 'business-analyst',
    label: 'Business & Process Analyst',
    title: /business analyst|forretningsanalyti|prosessanalyti|process analyst|virksomhetsanalyti|systemanalyti|systems analyst|funksjonell (r[åa]dgiver|arkitekt)|l[øo]sningsr[åa]dgiver|kravanalyti|requirements (analyst|engineer)|virksomhetsarkitekt|enterprise architect|prosessr[åa]dgiver|forbedringsr[åa]dgiver|continuous improvement|lean[- ]?(r[åa]dgiver|koordinator|ingeni)/i,
  },
  {
    key: 'finance-analyst',
    label: 'Financial Analyst & Controller',
    title: /controller|kontroller\b|[øo]konomianalyti|finansanalyti|financial analyst|fp&a|budsjettr[åa]dgiver|analyser?r[åa]dgiver [øo]konomi|[øo]konomir[åa]dgiver|business controller|[øo]konomistyring/i,
  },
  {
    key: 'project-product',
    label: 'Project, Program & Product',
    title: /prosjektleder|prosjektledar|project manager|project lead|programleder|program manager|portef[øo]ljeleder|portfolio manager|\bpmo\b|prosjektkoordinator|project coordinator|prosjektstyring|project control|scrum ?master|agile coach|smidig coach|produkteier|product owner|product manager|produktleder|delivery manager|leveranseleder|teamleder digital|endringsleder|change manager/i,
  },
  {
    key: 'research-policy',
    label: 'Research & Policy Analyst',
    title: /(?<![a-zæøå])(utreder|utgreiar|forsker|forskar)|researcher|research analyst|analytiker|analyst|analyser[åa]dgiver|r[åa]dgiver[^,|]{0,25}analyse|analyse[^,|]{0,15}r[åa]dgiver|statistiker|statistician|samfunns[øo]konom|economist|markedsanalyti|market analyst|kunnskapsr[åa]dgiver|evaluer/i,
  },
];

// Recruitment boilerplate that says nothing about the job (e.g. the standard
// paragraph in every Norwegian state ad). Sentences matching these are dropped
// before skills and requirements are extracted.
export const BOILERPLATE = [
  /anonymi[sz]ert statistikk|anonymi[sz]ed statistics/i,
  /statlige virksomheter rapporterer|state employers include/i,
  /(kunstig intelligens|\bKI\b|\bAI\b)[^.]{0,40}(kan brukes|may be used|brukes som st[øo]tte)[^.]{0,60}(rekrutter|s[øo]knad|kandidat|recruit|application)/i,
  /(rekrutteringsprosess|recruitment process|s[øo]knadsbehandling)[^.]{0,80}(kunstig intelligens|\bKI\b|\bAI\b)/i,
  /offentlig s[øo]kerliste|public list of applicants|offentleglova/i,
  /bakgrunnssjekk|background check/i,
];

// Generic titles that hide the real role ("Rådgiver", "Konsulent", "Advisor").
// These are promoted into the deep-dive only when the description carries
// enough analytics evidence (see ANALYTICS_EVIDENCE).
export const GENERIC_TITLE = /r[åa]dgiver|r[åa]dgjevar|konsulent|consultant|advisor|adviser|spesialist|specialist|saksbehandler|sakshandsamar|seniorr[åa]dgiver/i;

export const ANALYTICS_EVIDENCE = [
  /\bsql\b/i, /power ?bi/i, /\bpython\b/i, /tableau/i, /\bqlik/i,
  /dataanalyse|data analysis|analysere data|analyze data|analyse av data/i,
  /statistikk|statistical|statistics/i, /dashboard/i, /datavarehus|data warehouse/i,
  /\bkpi(er|s)?\b|n[øo]kkeltall/i, /rapportering|reporting/i,
];
export const ANALYTICS_EVIDENCE_MIN = 3;

// Skills & tools. `group` drives the colour/legend in the dashboard.
export const SKILLS = [
  // Analytics & BI tools
  { key: 'Excel', group: 'BI & analytics', re: /\bexcel\b/i },
  { key: 'Power BI', group: 'BI & analytics', re: /power ?bi/i },
  { key: 'Tableau', group: 'BI & analytics', re: /\btableau\b/i },
  { key: 'Qlik', group: 'BI & analytics', re: /\bqlik/i },
  { key: 'Looker', group: 'BI & analytics', re: /\blooker\b/i },
  { key: 'DAX / Power Query', group: 'BI & analytics', re: /\bdax\b|power query/i },
  { key: 'SQL', group: 'Programming & data', re: /\bsql\b|t-sql|pl\/sql|postgres|mysql|sql server/i },
  { key: 'Python', group: 'Programming & data', re: /\bpython\b|pandas/i },
  { key: 'R', group: 'Programming & data', re: /(?<=(?:[Pp]ython|SQL|[Ss]tatisti|SPSS|Stata)[^.]{0,40})\bR\b(?!&)|\bR\b(?!&)(?=[^.]{0,40}(?:[Pp]ython|SQL|[Ss]tatisti))|\bR-?(?:programmering|[Ss]tudio)\b|\bRStudio\b/ },
  { key: 'SAS', group: 'Programming & data', re: /\bSAS\b(?=[^.]{0,40}(?:[Ss]tatisti|SQL|[Pp]ython|[Aa]nalys|[Aa]nalyti|programm))|(?<=(?:[Ss]tatisti|SQL|[Pp]ython|SPSS|Stata|\bR\b)[^.]{0,40})\bSAS\b|\bSAS[- ](?:Viya|Enterprise|[Bb]ase|programmering)/ },
  { key: 'SPSS / Stata', group: 'Programming & data', re: /\bspss\b|\bstata\b/i },
  { key: 'Statistics', group: 'Programming & data', re: /statistikk|statistisk|statistical|statistics|regresjon|regression/i },
  { key: 'Machine learning / AI', group: 'Programming & data', re: /maskinl[æa]ring|machine learning|kunstig intelligens|artificial intelligence|\bgen(erativ|erative)? ?ai\b|\bllm/i },
  { key: 'Data warehouse / ETL', group: 'Programming & data', re: /datavarehus|data ?warehouse|\betl\b|\belt\b|data pipeline|datapipeline|datamodellering|data modell?ing/i },
  // Cloud & platforms
  { key: 'Azure', group: 'Cloud & platforms', re: /\bazure\b/i },
  { key: 'AWS', group: 'Cloud & platforms', re: /\baws\b|amazon web services/i },
  { key: 'GCP', group: 'Cloud & platforms', re: /\bgcp\b|google cloud|bigquery/i },
  { key: 'Databricks', group: 'Cloud & platforms', re: /databricks/i },
  { key: 'Snowflake', group: 'Cloud & platforms', re: /snowflake/i },
  { key: 'Microsoft Fabric', group: 'Cloud & platforms', re: /microsoft fabric|\bfabric\b(?=[^.]{0,30}(microsoft|power bi|data))/i },
  { key: 'dbt', group: 'Cloud & platforms', re: /\bdbt\b/i },
  { key: 'Spark', group: 'Cloud & platforms', re: /\bspark\b|pyspark/i },
  // Business systems
  { key: 'SAP', group: 'Business systems', re: /\bsap\b/i },
  { key: 'Dynamics 365', group: 'Business systems', re: /dynamics ?365|\bd365\b|dynamics nav|business central/i },
  { key: 'Salesforce', group: 'Business systems', re: /salesforce/i },
  { key: 'Visma', group: 'Business systems', re: /\bvisma\b/i },
  { key: 'Power Platform', group: 'Business systems', re: /power ?platform|power ?apps|power ?automate/i },
  { key: 'Jira / Confluence', group: 'Business systems', re: /\bjira\b|confluence/i },
  { key: 'ServiceNow', group: 'Business systems', re: /servicenow/i },
  // Methods & frameworks
  { key: 'Agile / Scrum', group: 'Methods', re: /\bsmidig|\bagile\b|\bscrum\b|kanban|\bsafe\b(?=[^.]{0,20}(agile|smidig|rammeverk|framework))/i },
  { key: 'PRINCE2', group: 'Methods', re: /prince ?2/i },
  { key: 'PMP / IPMA', group: 'Methods', re: /\bpmp\b|\bpmi\b|\bipma\b/i },
  { key: 'Prosjektveiviseren', group: 'Methods', re: /prosjektveiviser/i },
  { key: 'Lean / Six Sigma', group: 'Methods', re: /\blean\b|six sigma/i },
  { key: 'ITIL', group: 'Methods', re: /\bitil\b/i },
  { key: 'Process modelling (BPMN)', group: 'Methods', re: /\bbpmn\b|prosessmodeller|process model|prosesskartlegg|process mapping/i },
  { key: 'Requirements', group: 'Methods', re: /kravspesifik|kravanalys|kravstilling|behovsanalys|requirements? (analysis|engineering|specification|gathering)/i },
  { key: 'Benefits realisation', group: 'Methods', re: /gevinstrealiser|benefits? realis/i },
  { key: 'Change management', group: 'Methods', re: /endringsledelse|change management/i },
  { key: 'Procurement', group: 'Methods', re: /anskaffelse|procurement/i },
  { key: 'GDPR / privacy', group: 'Methods', re: /\bgdpr\b|personvern/i },
  { key: 'Stakeholder management', group: 'Methods', re: /interessenth[åa]ndtering|stakeholder/i },
];

// Language requirements.
export const NORWEGIAN_REQUIRED = /(norsk|skandinavisk)[^.]{0,60}(muntlig|skriftlig|flytende|beherske|sv[æa]rt god|godt? ferdighet)|(flytende|god[e]?|meget god[e]?|sv[æa]rt god[e]?|beherske|beherskar)[^.]{0,30}(norsk|skandinavisk)|norskkunnskap|norsk(e)?ferdighet|fluent[^.]{0,20}(norwegian|scandinavian)|(norwegian|scandinavian)[^.]{0,40}(required|fluent|proficien|must|mandatory|is a requirement)|n[øo]dvendig[^.]{0,30}norsk|norsk[^.]{0,30}(er et krav|kreves|p[åa]krevd)|bergenstest|norskpr[øo]ve/i;
export const ENGLISH_REQUIRED = /engelsk[^.]{0,40}(muntlig|skriftlig|flytende|ferdighet)|(god[e]?|flytende|beherske)[^.]{0,30}engelsk|fluent[^.]{0,20}english|english[^.]{0,30}(required|fluent|proficien|skills)/i;

// Work arrangement.
export const REMOTE = /fjernarbeid|full(t|stendig)? remote|\bremote\b|work from home|jobbe hjemmefra|hjemmekontor/i;
export const HYBRID = /\bhybrid\b|fleksibel arbeidsplass|delvis hjemmekontor|mulighet for hjemmekontor/i;

// Seniority from the title.
export const SENIORITY = [
  { key: 'Leadership', re: /\b(leder|sjef|director|direkt[øo]r|head of|chief)\b|avdelingsleder|seksjonsleder|teamleder|team lead/i },
  { key: 'Senior', re: /\bsenior|\bsr\.?\b|\blead\b|principal|seniorr[åa]dgiver|spesialr[åa]dgiver|fagansvarlig|ekspert|expert/i },
  { key: 'Junior / Graduate', re: /junior|trainee|graduate|nyutdannet|traineeprogram|l[æa]rling|internship|sommerjobb|summer intern|praktikant/i },
];

// Education level mentioned in the description.
export const EDUCATION = [
  { key: 'Master / PhD', re: /mastergrad|master'?s? degree|\bmaster\b|hovedfag|siviling|ph\.?d|doktorgrad/i },
  { key: 'Bachelor', re: /bachelor|h[øo]yskoleutdanning|cand\.?mag|3[- ]?[åa]rig h[øo]yere utdanning/i },
  { key: 'Higher education (unspecified)', re: /h[øo]yere utdanning|higher education|university degree|universitets?utdanning/i },
];

// English vs Norwegian ad text, via stop-word counts.
export const EN_STOP = /\b(the|and|you|with|our|we|will|for|are|your|to)\b/gi;
export const NO_STOP = /\b(og|du|med|til|vi|som|det|for|er|har|på|en|av|ein|eit|ikkje)\b/gi;

// 2024 county reform: canonical county names (upper-case in the feed).
export const COUNTY_FIX = {
  'VIKEN': 'AKERSHUS', 'VESTFOLD OG TELEMARK': 'VESTFOLD', 'TROMS OG FINNMARK': 'TROMS',
};
