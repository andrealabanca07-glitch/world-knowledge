import express from "express";
import Parser from "rss-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 8 * 60 * 1000);
const parser = new Parser({
  timeout: 12000,
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "contentEncoded"]
    ]
  }
});

const FEEDS = [
  { name: "BBC News — World", category: "mondo", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "BBC News — Technology", category: "tecnologia", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { name: "BBC News — Business", category: "economia", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { name: "BBC News — Science & Environment", category: "scienza", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
  { name: "The Guardian — World", category: "mondo", url: "https://www.theguardian.com/world/rss" },
  { name: "The Guardian — Technology", category: "tecnologia", url: "https://www.theguardian.com/uk/technology/rss" },
  { name: "The Guardian — Science", category: "scienza", url: "https://www.theguardian.com/science/rss" },
  { name: "The Guardian — Business", category: "economia", url: "https://www.theguardian.com/uk/business/rss" },
  { name: "NASA", category: "spazio", url: "https://www.nasa.gov/feed/" },
  { name: "Nature", category: "scienza", url: "https://www.nature.com/nature.rss" }
];

const cache = { items: [], updatedAt: 0, errors: [], lastAttempt: 0 };

function cleanText(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function safeUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function findImage(item) {
  const candidates = [
    item.enclosure?.url,
    item.mediaContent?.$?.url,
    item.mediaContent?.url,
    item.mediaThumbnail?.$?.url,
    item.mediaThumbnail?.url
  ];
  for (const candidate of candidates) {
    const safe = safeUrl(candidate);
    if (safe) return safe;
  }

  const markup = String(item.contentEncoded || item.content || item.description || "");
  const match = markup.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? safeUrl(match[1]) : null;
}

function findVideo(item) {
  const mediaEntries = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent];
  const mediaUrls = mediaEntries.filter(Boolean).map(entry => ({
    url: entry?.$?.url || entry?.url,
    type: entry?.$?.type || entry?.type || ""
  }));
  const candidates = [
    item.enclosure?.url && String(item.enclosure.type || "").startsWith("video/") ? item.enclosure.url : null,
    ...mediaUrls.filter(entry => String(entry.type).startsWith("video/")).map(entry => entry.url),
    ...mediaUrls.map(entry => entry.url)
  ];
  for (const candidate of candidates) {
    const safe = safeUrl(candidate);
    if (safe && /\.(mp4|webm|ogv)(?:$|\?)/i.test(safe)) return safe;
  }
  return null;
}

function stableId(link, title) {
  const input = link || title;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function readFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      "User-Agent": "WorldKnowledgePersonalReader/1.0",
      "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const xml = await response.text();
  const parsed = await parser.parseString(xml);

  return (parsed.items || []).map((item) => {
    const title = cleanText(item.title || "");
    const url = safeUrl(item.link || item.guid || "");
    if (!title || !url) return null;

    const description = cleanText(
      item.contentSnippet || item.summary || item.description ||
      item.contentEncoded || item.content || ""
    ).slice(0, 520);

    const dateRaw = item.isoDate || item.pubDate || item.date || null;
    const timestamp = dateRaw ? Date.parse(dateRaw) : NaN;

    return {
      id: stableId(url, title),
      title,
      description,
      url,
      image: findImage(item),
      videoUrl: findVideo(item),
      source: feed.name,
      category: feed.category,
      publishedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
    };
  }).filter(Boolean);
}

async function refreshFeeds(force = false) {
  const now = Date.now();
  if (!force && cache.items.length && now - cache.updatedAt < CACHE_TTL_MS) {
    return;
  }
  if (!force && cache.lastAttempt && now - cache.lastAttempt < 45_000) {
    return;
  }

  cache.lastAttempt = now;
  const results = await Promise.allSettled(FEEDS.map(readFeed));
  const collected = [];
  const errors = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") collected.push(...result.value);
    else errors.push({
      source: FEEDS[index].name,
      message: String(result.reason?.message || "Feed non disponibile").slice(0, 160)
    });
  });

  if (collected.length) {
    const unique = new Map();
    for (const item of collected) {
      const key = item.url || item.title.toLowerCase();
      if (!unique.has(key)) unique.set(key, item);
    }
    cache.items = [...unique.values()].sort((a, b) => {
      const aDate = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const bDate = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return bDate - aDate;
    });
    cache.updatedAt = Date.now();
  }
  cache.errors = errors;
}

app.use(express.static(path.join(__dirname, "public"), {
  etag: true,
  maxAge: "1h"
}));

app.get("/api/health", async (_req, res) => {
  await refreshFeeds();
  res.json({
    ok: true,
    lastUpdated: cache.updatedAt ? new Date(cache.updatedAt).toISOString() : null,
    articleCount: cache.items.length,
    configuredSources: FEEDS.length,
    workingSources: FEEDS.length - cache.errors.length,
    failedSources: cache.errors
  });
});

app.get("/api/sources", (_req, res) => {
  res.json(FEEDS.map(({ name, category, url }) => ({ name, category, url })));
});

app.get("/api/feed", async (req, res) => {
  await refreshFeeds(req.query.refresh === "1");
  const category = String(req.query.category || "all").toLowerCase();
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 60)));
  const filtered = category === "all"
    ? cache.items
    : cache.items.filter((item) => item.category === category);

  res.set("Cache-Control", "no-store");
  res.json({
    items: filtered.slice(0, limit),
    lastUpdated: cache.updatedAt ? new Date(cache.updatedAt).toISOString() : null,
    sourceCount: FEEDS.length,
    workingSources: FEEDS.length - cache.errors.length,
    errors: cache.errors
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`World Knowledge attivo su http://localhost:${PORT}`);
  refreshFeeds(true).catch((error) => console.error("Primo aggiornamento feed:", error));
  setInterval(() => {
    refreshFeeds(true).catch((error) => console.error("Aggiornamento feed:", error));
  }, CACHE_TTL_MS).unref();
});
