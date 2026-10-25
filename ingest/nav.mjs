// Minimal client for NAV's public job-ad feed (pam-stilling-feed.nav.no).
const BASE = 'https://pam-stilling-feed.nav.no';
let token = null;

// Never let a hung connection stall the whole run.
const TIMEOUT_MS = 30_000;

async function getToken() {
  const res = await fetch(`${BASE}/api/publicToken`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const m = (await res.text()).match(/eyJ\S+/);
  if (!m) throw new Error('Could not read NAV public token');
  token = m[0];
}

async function get(path, attempt = 1) {
  if (!token) await getToken();
  let res;
  try {
    res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    if (attempt > 5) throw e;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return get(path, attempt + 1);
  }
  if (res.status === 401 && attempt <= 3) { await getToken(); return get(path, attempt + 1); }
  if ((res.status === 429 || res.status >= 500) && attempt <= 5) {
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return get(path, attempt + 1);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

// Walks the feed from `start` (a page path) to the end, calling onPage(items).
// Returns the path of the last page so the next run can resume from it.
export async function walkFeed(start = '/api/v1/feed', onPage) {
  let url = start, last = start, pages = 0;
  while (url) {
    const page = await get(url);
    if (!page) break;
    onPage(page.items);
    pages++;
    last = url;
    url = page.next_url;
    if (pages % 500 === 0 || pages <= 3) console.log(`  …${pages} pages`);
  }
  return { last, pages };
}

// Fetches ad details with a small worker pool.
export async function fetchDetails(ids, concurrency = 8) {
  const out = [];
  let i = 0, failed = 0;
  async function worker() {
    while (i < ids.length) {
      const id = ids[i++];
      try {
        const d = await get(`/api/v1/feedentry/${id}`);
        if (d?.ad_content) out.push(d);
      } catch (e) {
        failed++;
        console.warn(`  detail ${id}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { details: out, failed };
}
