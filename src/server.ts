import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { type Request, type Response } from 'express';
import { join } from 'node:path';
import https from 'node:https';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// ─────────────────────────────────────────────────────────────────────────────
// NewsAPI proxy  (keeps the API key server-side — never exposed to the browser)
// Set NEWS_API_KEY in your environment or a .env file.
//
// Sign up free at https://newsapi.org — 100 requests/day on the developer plan.
// ─────────────────────────────────────────────────────────────────────────────

const NEWS_API_KEY    = process.env['NEWS_API_KEY']    ?? '';
const NEWS_API_BASE   = 'https://newsapi.org/v2';
const YOUTUBE_API_KEY_RAW = process.env['YOUTUBE_API_KEY'] ?? '';
// Treat obvious placeholder values as "not configured" so we return 503 instead
// of forwarding a bad key to YouTube and getting a 400 → 502 chain.
const YOUTUBE_API_KEY = (YOUTUBE_API_KEY_RAW.startsWith('your_') || YOUTUBE_API_KEY_RAW.includes('_here'))
  ? ''
  : YOUTUBE_API_KEY_RAW;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ── In-memory response cache (avoids burning the free-tier quota) ─────────────
interface CacheEntry { data: unknown; ts: number; }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes (matches PRS Section 9.9 default refresh)

function fetchNewsApi(path: string): Promise<unknown> {
  if (!NEWS_API_KEY) return Promise.resolve(null);

  const cached = cache.get(path);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return Promise.resolve(cached.data);

  const url = `${NEWS_API_BASE}${path}&apiKey=${NEWS_API_KEY}`;

  return new Promise((resolve, reject) => {
    console.log('[NewsAPI] GET', url.replace(NEWS_API_KEY, '***'));
    const options = {
      headers: { 'User-Agent': 'Rone-NewsApp/1.0' }
    };
    https.get(url, options, (res) => {
      console.log('[NewsAPI] status', res.statusCode);
      if (res.statusCode !== 200) {
        let errBody = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => { errBody += chunk; });
        res.on('end', () => {
          console.error('[NewsAPI] error response:', errBody);
          reject(new Error(`NewsAPI HTTP ${res.statusCode}: ${errBody}`));
        });
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          cache.set(path, { data, ts: Date.now() });
          resolve(data);
        } catch (e) {
          console.error('[NewsAPI] JSON parse error', e);
          reject(e);
        }
      });
    }).on('error', (e) => { console.error('[NewsAPI] request error', e); reject(e); });
  });
}

/** Map a NewsAPI article object to the app's NewsStory shape. */
function mapArticle(a: Record<string, unknown>, index: number) {
  const source = (a['source'] as Record<string, unknown>)?.['name'] as string ?? 'Reuters';
  return {
    id:        `live-${index}-${Date.now()}`,
    category:  source,
    title:     a['title']       as string ?? '',
    summary:   a['description'] as string ?? '',
    timestamp: formatTs(a['publishedAt'] as string),
    readTime:  estimateReadTime(a['content'] as string ?? ''),
    imageUrl:  (a['urlToImage'] as string) || fallbackImage(index),
    author:    a['author'] as string ?? source,
    location:  '',
    // Reconstruct a minimal body from the content field (NewsAPI truncates at 200 chars)
    body:      buildBody(a),
    url:       a['url'] as string,
  };
}

function formatTs(iso: string): string {
  if (!iso) return 'recently';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60)  return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs  < 24)  return `${hrs} hour${hrs  !== 1 ? 's' : ''} ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  } catch { return 'recently'; }
}

function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function buildBody(a: Record<string, unknown>): string[] {
  const paras: string[] = [];
  if (a['description']) paras.push(a['description'] as string);
  if (a['content']) {
    // NewsAPI content is truncated — strip the "[+N chars]" suffix
    const clean = (a['content'] as string).replace(/\s*\[\+\d+ chars\]\s*$/, '');
    if (clean && clean !== a['description']) paras.push(clean);
  }
  if (a['url']) paras.push(`Read the full article at: ${a['url']}`);
  return paras.filter(Boolean);
}

// Small set of reliable fallback images when articles have none
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=960&q=80',
  'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=960&q=80',
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=960&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=960&q=80',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=960&q=80',
];
function fallbackImage(i: number) { return FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]; }

// ── /api/news/headlines?topics=Technology,Markets&pageSize=12 ─────────────────
app.get('/api/news/headlines', async (req: Request, res: Response) => {
  if (!NEWS_API_KEY) {
    res.status(503).json({ error: 'NEWS_API_KEY not configured', articles: [] });
    return;
  }

  const topics   = String(req.query['topics'] ?? 'world news');
  const pageSize = Math.min(100, Number(req.query['pageSize'] ?? 20));
  const query    = topics.split(',').slice(0, 3).join(' OR ');
  const path     = `/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${pageSize}`;

  try {
    const data = await fetchNewsApi(path) as { articles?: unknown[] } | null;
    const articles = (data?.articles ?? []) as Record<string, unknown>[];
    res.json({ articles: articles.map(mapArticle) });
  } catch (e) {
    console.error('[/api/news/headlines] error:', e);
    res.status(502).json({ error: 'upstream error', articles: [] });
  }
});

// ── /api/news/top-headlines?category=business&pageSize=6 ─────────────────────
app.get('/api/news/top-headlines', async (req: Request, res: Response) => {
  if (!NEWS_API_KEY) {
    res.status(503).json({ error: 'NEWS_API_KEY not configured', articles: [] });
    return;
  }

  const category = String(req.query['category'] ?? 'general');
  const pageSize = Math.min(10, Number(req.query['pageSize'] ?? 6));
  const path     = `/top-headlines?category=${category}&language=en&pageSize=${pageSize}`;

  try {
    const data = await fetchNewsApi(path) as { articles?: unknown[] } | null;
    const articles = (data?.articles ?? []) as Record<string, unknown>[];
    res.json({ articles: articles.map(mapArticle) });
  } catch {
    res.status(502).json({ error: 'upstream error', articles: [] });
  }
});

// ── YouTube proxy ─────────────────────────────────────────────────────────────
// Same pattern as fetchNewsApi — server-side only, key never sent to browser.
const ytCache = new Map<string, CacheEntry>();

function fetchYouTube(path: string): Promise<unknown> {
  if (!YOUTUBE_API_KEY) return Promise.resolve(null);
  const cached = ytCache.get(path);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return Promise.resolve(cached.data);

  const url = `${YOUTUBE_API_BASE}${path}&key=${YOUTUBE_API_KEY}`;
  return new Promise((resolve, reject) => {
    console.log('[YouTube] GET', url.replace(YOUTUBE_API_KEY, '***'));
    https.get(url, { headers: { 'User-Agent': 'Rone-NewsApp/1.0' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error('[YouTube] error response:', body);
          return reject(new Error(`YouTube HTTP ${res.statusCode}: ${body}`));
        }
        try {
          const data = JSON.parse(body);
          ytCache.set(path, { data, ts: Date.now() });
          resolve(data);
        } catch (e) { reject(e); }
      });
    }).on('error', (e) => { console.error('[YouTube] request error', e); reject(e); });
  });
}

function mapYouTubeItem(item: Record<string, unknown>, index: number) {
  const snippet  = (item['snippet']  as Record<string, unknown>) ?? {};
  const idObj    = (item['id']       as Record<string, unknown>) ?? {};
  const thumbs   = (snippet['thumbnails'] as Record<string, unknown>) ?? {};
  const highThumb = ((thumbs['high'] ?? thumbs['medium'] ?? thumbs['default']) as Record<string, unknown>) ?? {};
  const videoId  = (idObj['videoId'] as string) ?? String(index);
  return {
    id:           `yt-${videoId}`,
    title:        (snippet['title']       as string) ?? '',
    description:  (snippet['description'] as string) ?? '',
    thumbnail:    (highThumb['url']       as string) ?? '',
    channelTitle: (snippet['channelTitle'] as string) ?? 'YouTube',
    publishedAt:  formatTs(snippet['publishedAt'] as string),
    duration:     '',   // requires a separate /videos?part=contentDetails call (quota-heavy)
    videoUrl:     `https://www.youtube.com/watch?v=${videoId}`,
  };
}

// ── /api/videos?topics=Technology,Markets&pageSize=6 ─────────────────────────
app.get('/api/videos', async (req: Request, res: Response) => {
  if (!YOUTUBE_API_KEY) {
    res.status(503).json({ error: 'YOUTUBE_API_KEY not configured', videos: [] });
    return;
  }
  const topics   = String(req.query['topics'] ?? 'news');
  const pageSize = Math.min(12, Number(req.query['pageSize'] ?? 6));
  const query    = topics.split(',').slice(0, 3).join(' OR ') + ' news';
  const path     = `/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=25&order=date&maxResults=${pageSize}`;
  try {
    const data = await fetchYouTube(path) as { items?: unknown[] } | null;
    const items = (data?.items ?? []) as Record<string, unknown>[];
    res.json({ videos: items.map(mapYouTubeItem) });
  } catch (e) {
    console.error('[/api/videos] error:', e);
    res.status(502).json({ error: 'upstream error', videos: [] });
  }
});

// ── /api/news/sources — list available news sources ───────────────────────────
app.get('/api/news/sources', async (_req: Request, res: Response) => {
  if (!NEWS_API_KEY) { res.status(503).json({ sources: [] }); return; }

  try {
    const data = await fetchNewsApi('/sources?language=en') as { sources?: unknown[] } | null;
    res.json({ sources: data?.sources ?? [] });
  } catch {
    res.status(502).json({ sources: [] });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
