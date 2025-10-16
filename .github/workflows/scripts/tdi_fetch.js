/**
 * TDI Facebook Feed Fetcher
 * Runtime: Node 20
 * Inputs via env:
 *   FB_PAGE_ACCESS_TOKEN  long-lived Page access token
 *   FB_PAGE_ID            numeric page id
 * Output:
 *   assets/data/tdi_feed.json
 *
 * Behavior:
 * - Paginates through recent posts up to a cap.
 * - Normalizes attachments into a stable array per post.
 * - Skips stories and unsupported objects.
 * - Deterministic JSON formatting for stable diffs.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

const ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.FB_PAGE_ID;
const GRAPH_VER = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VER}`;
const OUTPUT_FILE = path.join("assets", "data", "tdi_feed.json");

// Hard caps for runtime and payload
const PAGE_LIMIT = 25;           // per page
const TOTAL_CAP = 60;            // overall number of posts to collect
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRIES = 4;

if (!ACCESS_TOKEN || !PAGE_ID) {
  console.error("Missing FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID in environment.");
  // Exit code 1 ensures the GitHub Action step fails
  process.exit(1); 
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function timedFetch(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fbGet(url) {
  let attempt = 0;
  let lastErr = null;
  while (attempt < MAX_RETRIES) {
    try {
      const res = await timedFetch(url);
      if (!res.ok) {
        const text = await res.text();
        // 4xx can be permanent, but we still retry a little for 429 or transient
        const canRetry = res.status >= 500 || res.status === 429;
        if (!canRetry) {
          throw new Error(`HTTP ${res.status}: ${text}`);
        }
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      attempt += 1;
      const backoff = Math.min(2000 * attempt, 8000);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

function linkify(text) {
  if (!text) return "";
  // URLs
  let out = text.replace(
    /(https?:\/\/[^\s]+)/g,
    (m) => `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`
  );
  // Hashtags
  out = out.replace(
    /(^|\s)#([A-Za-z0-9_]+)/g,
    (all, pre, tag) => `${pre}<span class="tdi-hashtag">#${tag}</span>`
  );
  // Mentions at-words
  out = out.replace(
    /(^|\s)@([A-Za-z0-9_\.]+)/g,
    (all, pre, user) => `${pre}<span class="tdi-mention">@${user}</span>`
  );
  return out;
}

/**
 * Recursively extracts media data from an attachment item (or subattachment item).
 * @param {object} item - The attachment object.
 * @param {Array} collected - Array to push normalized media objects into.
 */
function getMedia(item, collected) {
  // Extract primary media source
  const t = item.media_type || item.type || "";
  const media = item.media || {};
  const image = media.image || {};
  const src = image.src || media.source || "";
  
  if (src) {
    collected.push({
      type: t.toLowerCase(),
      src,
      width: image.width || null,
      height: image.height || null,
      alt: item.description || item.title || "",
    });
  }

  // Recurse into subattachments (e.g., photo albums, carousels)
  if (item.subattachments && item.subattachments.data && Array.isArray(item.subattachments.data)) {
    for (const subItem of item.subattachments.data) {
      getMedia(subItem, collected);
    }
  }
}


function normalizeAttachment(att) {
  // Graph attachments are nested. We focus on images and video thumbnails.
  const out = [];
  if (!att || !att.data || !Array.isArray(att.data)) return out;

  for (const item of att.data) {
    // Use the recursive helper to extract all media from this top-level item and its children.
    getMedia(item, out);
  }
  
  // Optional: Remove duplicates based on src if the API returns redundant data (rare, but safe)
  const uniqueMap = new Map();
  for (const media of out) {
    uniqueMap.set(media.src, media);
  }

  return Array.from(uniqueMap.values());
}

function normalizePost(p) {
  const id = p.id || "";
  const created = p.created_time || "";
  const message = p.message || "";
  const permalink = p.permalink_url || "";
  const attachments = normalizeAttachment(p.attachments);

  return {
    id,
    created_time: created,
    message_raw: message,
    message_html: linkify(message),
    permalink_url: permalink,
    attachments
  };
}

function deterministicStringify(obj) {
  // Stable key order stringify
  const seen = new WeakSet();
  const replacer = (_k, v) => {
    if (v && typeof v === "object") {
      if (seen.has(v)) return v;
      seen.add(v);
      if (Array.isArray(v)) return v;
      return Object.keys(v)
        .sort()
        .reduce((acc, key) => {
          acc[key] = v[key];
          return acc;
        }, {});
    }
    return v;
  };
  return JSON.stringify(obj, replacer, 2) + "\n";
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function fetchPosts() {
  const fields = [
    "id",
    "message",
    "created_time",
    "permalink_url",
    "attachments{media_type,media,description,subattachments,title}"
  ].join(",");

  let url = `${GRAPH_BASE}/${encodeURIComponent(PAGE_ID)}/posts?fields=${encodeURIComponent(
    fields
  )}&limit=${PAGE_LIMIT}&access_token=${encodeURIComponent(ACCESS_TOKEN)}`;

  const collected = [];
  while (url && collected.length < TOTAL_CAP) {
    const data = await fbGet(url);
    const items = Array.isArray(data.data) ? data.data : [];
    for (const p of items) {
      // Basic filter: ignore if missing both message and attachments
      const hasMsg = !!p.message;
      const hasAtt = p.attachments && p.attachments.data && p.attachments.data.length > 0;
      if (!hasMsg && !hasAtt) continue;
      collected.push(normalizePost(p));
      if (collected.length >= TOTAL_CAP) break;
    }
    url = data.paging && data.paging.next ? data.paging.next : null;
  }

  // Sort newest first by created_time if present
  collected.sort((a, b) => {
    const ta = Date.parse(a.created_time || 0) || 0;
    const tb = Date.parse(b.created_time || 0) || 0;
    return tb - ta;
  });

  return collected;
}

async function main() {
  const posts = await fetchPosts();

  const payload = {
    generated_at: new Date().toISOString(),
    source: "facebook_graph",
    page_id: String(PAGE_ID),
    post_count: posts.length,
    posts
  };

  const nextJson = deterministicStringify(payload);

  let prevJson = "";
  try {
    prevJson = fs.readFileSync(OUTPUT_FILE, "utf8");
  } catch {
    // missing is fine
  }

  const nextHash = sha256(nextJson);
  const prevHash = sha256(prevJson);

  if (nextHash === prevHash) {
    console.log("No content change. Skipping write.");
    return;
  }

  // Ensure the output directory exists
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, nextJson, "utf8");
  console.log(`Wrote ${OUTPUT_FILE} with ${posts.length} posts. (Hash: ${nextHash.slice(0, 8)})`);
}

main().catch((err) => {
  console.error("Fetcher failed:", err?.message || err);
  process.exit(1);
});
