import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function redactUrl(input) {
  const url = new URL(input);
  for (const key of ['token', 'access_token', 'api_key']) {
    if (url.searchParams.has(key)) url.searchParams.set(key, '<redacted>');
  }
  return url.toString();
}

export class CachedHttpClient {
  constructor({
    cacheDir = path.resolve('.cache/botany'),
    ttlMs = 7 * 24 * 60 * 60 * 1000,
    refresh = false,
    offline = false,
    fetchImpl = globalThis.fetch,
    now = () => Date.now(),
  } = {}) {
    this.cacheDir = cacheDir;
    this.ttlMs = ttlMs;
    this.refresh = refresh;
    this.offline = offline;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.lastRequestAt = new Map();
    this.requestCounts = new Map();
  }

  requestCount(sourceId) {
    return this.requestCounts.get(sourceId) ?? 0;
  }

  async getJson(input, { sourceId, minIntervalMs = 250 } = {}) {
    const safeUrl = redactUrl(input);
    const key = createHash('sha256').update(safeUrl).digest('hex');
    const cachePath = path.join(this.cacheDir, sourceId ?? 'other', `${key}.json`);
    if (!this.refresh) {
      try {
        const cached = JSON.parse(await readFile(cachePath, 'utf8'));
        if (this.offline || this.now() - Date.parse(cached.cachedAt) <= this.ttlMs) return cached.data;
      } catch (error) {
        if (error?.code !== 'ENOENT' && error instanceof SyntaxError) throw new Error(`Invalid botanical cache entry: ${cachePath}`);
      }
    }
    if (this.offline) throw new Error(`Offline cache miss for ${safeUrl}`);

    const previous = this.lastRequestAt.get(sourceId) ?? 0;
    const remaining = minIntervalMs - (this.now() - previous);
    if (remaining > 0) await sleep(remaining);

    let response;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      this.lastRequestAt.set(sourceId, this.now());
      this.requestCounts.set(sourceId, this.requestCount(sourceId) + 1);
      response = await this.fetchImpl(input, {
        headers: { Accept: 'application/json', 'User-Agent': 'KomorebiBotanicalResearch/1.0 (github.com/Baptiste-Borie/komorebi)' },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) break;
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) {
        throw new Error(`${sourceId} API returned HTTP ${response.status} for ${new URL(input).origin}${new URL(input).pathname}`);
      }
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 750 * (attempt + 1));
    }
    const data = await response.json();
    await mkdir(path.dirname(cachePath), { recursive: true });
    await writeFile(cachePath, `${JSON.stringify({ cachedAt: new Date(this.now()).toISOString(), url: safeUrl, data })}\n`);
    return data;
  }
}

export function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
