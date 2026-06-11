import { eosUploads } from "../data/eos-site-index.js";

const CERT_DIRECTORY = "/assets/Certs/";
const VALID_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "pdf"]);
const FALLBACK_FILES = [
  "CloudComputing-Cousera.png",
  "DevOps-Cousera.png",
  "Python-Programming-GA.png"
];

const ISSUER_ALIASES = new Map([
  ["cousera", "Coursera"],
  ["coursera", "Coursera"],
  ["ga", "General Assembly"],
  ["general assembly", "General Assembly"]
]);

const WORD_ALIASES = new Map([
  ["ai", "AI"],
  ["api", "API"],
  ["aws", "AWS"],
  ["css", "CSS"],
  ["devops", "DevOps"],
  ["html", "HTML"],
  ["iot", "IoT"],
  ["js", "JS"],
  ["nlp", "NLP"],
  ["pdf", "PDF"],
  ["sql", "SQL"],
  ["ui", "UI"],
  ["ux", "UX"]
]);

let processedCertificates = [];
let activeFilteredSet = [];
let activeIndex = 0;
let currentScale = 1;
let isDragging = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;
let autoplayTimer = null;
let indexedAssets = [];
let usableAssets = [];
let skippedAssets = [];

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDevelopmentRuntime = ["localhost", "127.0.0.1", "0.0.0.0", ""].includes(window.location.hostname);
const typewriter = {
  el: null,
  phrases: [],
  iPhrase: 0,
  iChar: 0,
  typing: true,
  timer: null,
  typeMs: 58,
  pauseMs: 1900,
  eraseMs: 28,
  colors: ["#4df8ff", "#ff3df2", "#7cff6b", "#ffd166"],
  prevColor: ""
};

function updateCertDebug() {
  if (!isDevelopmentRuntime) return;
  window.__CERT_DEBUG__ = {
    indexedAssets,
    usableAssets,
    processedCertificates,
    skippedAssets,
    activeFilteredSet
  };
}

function extensionFromName(name) {
  const ext = String(name || "").replace(/^\./, "").split(".").pop()?.toLowerCase() || "";
  return VALID_EXTENSIONS.has(ext) ? ext : "";
}

function assetFromName(name, source = "fallback") {
  const cleanName = decodeURIComponent(name).split("/").pop();
  const ext = extensionFromName(cleanName);
  if (!cleanName || !ext) return null;
  const stem = cleanName.slice(0, -(ext.length + 1));
  return {
    name: cleanName,
    stem,
    ext,
    path: `${CERT_DIRECTORY}${encodeURIComponent(cleanName)}`,
    updated: null,
    bytes: null,
    source
  };
}

function normalizeDirectory(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase();
}

function normalizeExtension(upload) {
  return extensionFromName(upload.ext || upload.name || upload.path);
}

function recordSkippedAsset(upload, reason) {
  const skipped = { reason, upload };
  skippedAssets.push(skipped);
  console.warn(`Certificate asset skipped: ${reason}`, upload);
}

function generatedCertificateAssets() {
  const merged = new Map();
  indexedAssets = Array.isArray(eosUploads)
    ? eosUploads.filter((upload) => normalizeDirectory(upload.directory) === "assets/certs")
    : [];
  skippedAssets = [];

  indexedAssets.forEach((upload) => {
    const ext = normalizeExtension(upload);
    const name = String(upload.name || "").trim();
    const path = String(upload.path || "").trim();

    if (!ext) {
      recordSkippedAsset(upload, "unsupported certificate extension");
      return;
    }

    if (!path) {
      recordSkippedAsset(upload, "missing certificate path");
      return;
    }

    const cleanName = name || decodeURIComponent(path.split("/").pop() || "");
    if (!cleanName) {
      recordSkippedAsset(upload, "missing certificate filename");
      return;
    }

    const stem = upload.stem || cleanName.slice(0, -(ext.length + 1));
    merged.set(path.toLowerCase(), {
      name: cleanName,
      stem,
      ext,
      path,
      updated: upload.updated || null,
      bytes: upload.bytes ?? null,
      source: "index"
    });
  });

  return Array.from(merged.values()).sort((a, b) => {
    const dateA = a.updated ? new Date(a.updated).getTime() : 0;
    const dateB = b.updated ? new Date(b.updated).getTime() : 0;
    if (dateA !== dateB) return dateB - dateA;
    return a.name.localeCompare(b.name);
  });
}

async function loadCertificateAssets() {
  const indexed = generatedCertificateAssets();
  usableAssets = indexed.length ? indexed : FALLBACK_FILES.map((name) => assetFromName(name)).filter(Boolean);
  updateCertDebug();
  return usableAssets;
}

async function sha256ForPath(path) {
  if (!window.crypto?.subtle) throw new Error("SHA-256 is unavailable in this browser context.");
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  const buffer = await response.arrayBuffer();
  const hash = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fallbackIdentifier(asset) {
  const input = `${asset.path || ""}|${asset.name || ""}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `local-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

async function resolveCertificateHash(asset) {
  try {
    const hash = await sha256ForPath(asset.path);
    return {
      hash,
      slug: hash.slice(0, 12),
      hashStatus: "verified"
    };
  } catch {
    const fallbackId = fallbackIdentifier(asset);
    return {
      hash: fallbackId,
      slug: fallbackId,
      hashStatus: "unverified"
    };
  }
}

function normalizeDate(value) {
  if (!value) return "";
  const clean = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const parsed = new Date(clean);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function dateFromAsset(asset) {
  return normalizeDate(asset.updated) || "2026-06-07";
}

function humanize(value) {
  const spaced = String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return spaced
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const key = word.toLowerCase();
      if (WORD_ALIASES.has(key)) return WORD_ALIASES.get(key);
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function humanizeIssuer(value) {
  const normalized = humanize(value);
  return ISSUER_ALIASES.get(normalized.toLowerCase()) || normalized || "Verified Issuer";
}

function inferMetadata(asset) {
  const stem = asset.stem || asset.name.replace(/\.[^.]+$/, "");
  const doubleParts = stem.split("__").filter(Boolean);

  if (doubleParts.length >= 2) {
    const date = normalizeDate(doubleParts[2]) || dateFromAsset(asset);
    return {
      issuer: humanizeIssuer(doubleParts[0]),
      title: humanize(doubleParts[1]),
      date,
      year: date.slice(0, 4)
    };
  }

  const dateMatch = stem.match(/(?:^|[-_])(\d{4}-\d{2}-\d{2})$/);
  const cleanStem = dateMatch ? stem.slice(0, dateMatch.index) : stem;
  const parts = cleanStem.split(/[-_]+/).filter(Boolean);
  const date = normalizeDate(dateMatch?.[1]) || dateFromAsset(asset);

  if (parts.length >= 2) {
    const issuerToken = parts[parts.length - 1];
    const titleTokens = parts.slice(0, -1).join(" ");
    return {
      issuer: humanizeIssuer(issuerToken),
      title: humanize(titleTokens),
      date,
      year: date.slice(0, 4)
    };
  }

  return {
    issuer: "Verified Issuer",
    title: humanize(cleanStem || stem),
    date,
    year: date.slice(0, 4)
  };
}

async function compileMetaMatrix() {
  const assets = await loadCertificateAssets();
  const records = await Promise.all(assets.map(async (asset) => {
    const hashData = await resolveCertificateHash(asset);
    const meta = inferMetadata(asset);
    return {
      filename: asset.name,
      filePath: asset.path,
      issuer: meta.issuer,
      title: meta.title,
      date: meta.date,
      year: meta.year,
      ext: `.${asset.ext}`,
      hash: hashData.hash,
      slug: hashData.slug,
      hashStatus: hashData.hashStatus,
      bytes: asset.bytes
    };
  }));

  processedCertificates = records.filter(Boolean);
  updateCertDebug();
}

function resetSelect(select, label) {
  if (!select) return;
  select.replaceChildren();
  const option = document.createElement("option");
  option.value = "all";
  option.textContent = label;
  select.appendChild(option);
}

function hydrateInterfaceControls() {
  const issuerSelector = document.getElementById("filter-issuer");
  const yearSelector = document.getElementById("filter-year");
  resetSelect(issuerSelector, "All Issuers");
  resetSelect(yearSelector, "All Years");

  [...new Set(processedCertificates.map((cert) => cert.issuer))]
    .sort()
    .forEach((issuer) => {
      const option = document.createElement("option");
      option.value = issuer;
      option.textContent = issuer;
      issuerSelector?.appendChild(option);
    });

  [...new Set(processedCertificates.map((cert) => cert.year))]
    .sort((a, b) => Number(b) - Number(a))
    .forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelector?.appendChild(option);
    });
}

function resetFilterDefaults() {
  const search = document.getElementById("cert-search");
  const issuer = document.getElementById("filter-issuer");
  const year = document.getElementById("filter-year");
  const sort = document.getElementById("sort-order");
  if (search) search.value = "";
  if (issuer) issuer.value = "all";
  if (year) year.value = "all";
  if (sort) sort.value = "newest";
}

function circularOffset(index) {
  const total = activeFilteredSet.length;
  let offset = index - activeIndex;
  if (total > 2) {
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
  }
  return offset;
}

function synchronizeDeckLayers() {
  const cards = document.querySelectorAll(".cert-card");
  const total = activeFilteredSet.length;

  cards.forEach((card) => {
    const index = Number(card.getAttribute("data-index"));
    const offset = circularOffset(index);
    card.className = "cert-card";
    card.setAttribute("aria-hidden", Math.abs(offset) > 2 ? "true" : "false");

    if (offset === 0) card.classList.add("state-active");
    else if (offset === 1) card.classList.add("state-next-1");
    else if (offset === 2) card.classList.add("state-next-2");
    else if (offset === -1) card.classList.add("state-prev-1");
    else if (offset === -2) card.classList.add("state-prev-2");
    else card.classList.add("state-hidden");
  });

  document.querySelectorAll(".carousel-pagination .carousel-dot").forEach((dot, index) => {
    const selected = index === activeIndex;
    dot.classList.toggle("active", selected);
    dot.setAttribute("aria-selected", String(selected));
  });

  document.getElementById("deck-prev-btn")?.toggleAttribute("disabled", total <= 1);
  document.getElementById("deck-next-btn")?.toggleAttribute("disabled", total <= 1);
}

function moveDeck(direction) {
  if (activeFilteredSet.length < 2) return;
  activeIndex = (activeIndex + direction + activeFilteredSet.length) % activeFilteredSet.length;
  synchronizeDeckLayers();
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}

function startAutoplay() {
  stopAutoplay();
  if (prefersReducedMotion || activeFilteredSet.length < 2) return;
  autoplayTimer = setInterval(() => moveDeck(1), 6500);
}

function makePdfPlaceholder(cert) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="510" viewBox="0 0 720 510"><rect width="720" height="510" fill="#050712"/><rect x="86" y="64" width="548" height="382" rx="8" fill="#101827" stroke="#4df8ff" stroke-width="2"/><text x="360" y="234" text-anchor="middle" fill="#f7fbff" font-family="Arial, sans-serif" font-size="34" font-weight="700">${cert.issuer}</text><text x="360" y="286" text-anchor="middle" fill="#ff3df2" font-family="Arial, sans-serif" font-size="24">PDF Credential</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createCertificateCard(cert, index) {
  const card = document.createElement("article");
  card.className = "cert-card";
  card.setAttribute("data-index", String(index));
  card.tabIndex = 0;

  const media = document.createElement("div");
  media.className = "cert-thumbnail-area";

  const image = document.createElement("img");
  image.loading = index < 5 ? "eager" : "lazy";
  image.fetchPriority = index === 0 ? "high" : "auto";
  image.decoding = "async";
  image.alt = `${cert.title} certificate issued by ${cert.issuer}`;
  image.src = cert.ext === ".pdf" ? makePdfPlaceholder(cert) : cert.filePath;
  media.appendChild(image);

  const body = document.createElement("div");
  body.className = "cert-card-body";
  body.appendChild(createTextElement("div", "cert-card-issuer", cert.issuer));

  const title = document.createElement("h3");
  title.className = "cert-card-title";
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = "open";
  button.dataset.slug = cert.slug;
  button.textContent = cert.title;
  title.appendChild(button);
  body.appendChild(title);

  body.appendChild(createTextElement("div", "cert-card-date", `Indexed: ${cert.date}`));

  const footer = document.createElement("div");
  footer.className = "cert-card-footer";
  footer.appendChild(createTextElement("span", "cert-card-slug", `ID: ${cert.slug}`));
  const statusText = cert.hashStatus === "verified" ? "SHA-256 verified" : "Display ID";
  const statusBadge = createTextElement("span", "v-status-badge", statusText);
  if (cert.hashStatus !== "verified") statusBadge.classList.add("unverified");
  footer.appendChild(statusBadge);
  body.appendChild(footer);

  card.append(media, body);
  return card;
}

function renderCertificateGrid() {
  const track = document.getElementById("cert-deck");
  const pagination = document.getElementById("deck-pagination");
  const deckWrapper = document.getElementById("deck-wrapper-area");
  const empty = document.getElementById("cert-empty");
  if (!track || !pagination) return;

  const searchPhrase = document.getElementById("cert-search")?.value.toLowerCase().trim() || "";
  const selectedIssuer = document.getElementById("filter-issuer")?.value || "all";
  const selectedYear = document.getElementById("filter-year")?.value || "all";
  const sortOrder = document.getElementById("sort-order")?.value || "newest";

  activeFilteredSet = processedCertificates.filter((item) => {
    const searchable = `${item.title} ${item.issuer} ${item.filename}`.toLowerCase();
    return searchable.includes(searchPhrase)
      && (selectedIssuer === "all" || item.issuer === selectedIssuer)
      && (selectedYear === "all" || item.year === selectedYear);
  });

  activeFilteredSet.sort((a, b) => {
    if (sortOrder === "newest") return new Date(b.date) - new Date(a.date);
    if (sortOrder === "oldest") return new Date(a.date) - new Date(b.date);
    return a.title.localeCompare(b.title);
  });
  updateCertDebug();

  track.replaceChildren();
  pagination.replaceChildren();
  activeIndex = 0;

  if (!activeFilteredSet.length) {
    empty?.removeAttribute("hidden");
    deckWrapper?.setAttribute("hidden", "");
    stopAutoplay();
    return;
  }

  empty?.setAttribute("hidden", "");
  deckWrapper?.removeAttribute("hidden");

  activeFilteredSet.forEach((cert, index) => {
    track.appendChild(createCertificateCard(cert, index));

    const dot = document.createElement("button");
    dot.className = "carousel-dot";
    dot.type = "button";
    dot.dataset.targetIndex = String(index);
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `${cert.title} slide`);
    pagination.appendChild(dot);
  });

  synchronizeDeckLayers();
  startAutoplay();
}

function applyTransformations() {
  const wrapper = document.getElementById("viewer-pan-stage");
  if (!wrapper) return;
  wrapper.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${currentScale})`;
  const readout = document.getElementById("zoom-scale-readout");
  if (readout) readout.textContent = `${Math.round(currentScale * 100)}%`;
}

function handleZoom(amount) {
  currentScale = Math.max(0.5, Math.min(4, currentScale + amount));
  applyTransformations();
}

function openSecureViewer(cert) {
  const dialog = document.getElementById("viewer-modal");
  const imgEl = document.getElementById("viewer-img-element");
  const pdfEl = document.getElementById("viewer-pdf-element");
  const titleEl = document.getElementById("viewer-doc-title");
  if (!dialog || !imgEl || !pdfEl) return;

  if (titleEl) titleEl.textContent = `${cert.issuer} - ${cert.title}`;
  currentScale = 1;
  translateX = 0;
  translateY = 0;
  applyTransformations();

  if (cert.ext === ".pdf") {
    imgEl.hidden = true;
    imgEl.removeAttribute("src");
    pdfEl.hidden = false;
    pdfEl.src = `${cert.filePath}#toolbar=0&navpanes=0&scrollbar=0`;
  } else {
    pdfEl.hidden = true;
    pdfEl.removeAttribute("src");
    imgEl.hidden = false;
    imgEl.src = cert.filePath;
  }

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function registerModalEvents() {
  const dialog = document.getElementById("viewer-modal");
  const viewport = document.querySelector(".viewer-canvas-viewport");
  const deck = document.getElementById("cert-deck");
  const pagination = document.getElementById("deck-pagination");
  const deckWrapper = document.getElementById("deck-wrapper-area");
  if (!dialog || !viewport) return;

  document.getElementById("close-viewer-btn")?.addEventListener("click", () => dialog.close());
  document.getElementById("zoom-in-btn")?.addEventListener("click", () => handleZoom(0.25));
  document.getElementById("zoom-out-btn")?.addEventListener("click", () => handleZoom(-0.25));
  document.getElementById("deck-prev-btn")?.addEventListener("click", () => moveDeck(-1));
  document.getElementById("deck-next-btn")?.addEventListener("click", () => moveDeck(1));

  deckWrapper?.addEventListener("mouseenter", stopAutoplay);
  deckWrapper?.addEventListener("mouseleave", startAutoplay);
  deckWrapper?.addEventListener("focusin", stopAutoplay);
  deckWrapper?.addEventListener("focusout", startAutoplay);

  deck?.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-action='open']");
    if (trigger) {
      const chosen = activeFilteredSet.find((cert) => cert.slug === trigger.dataset.slug);
      if (chosen) openSecureViewer(chosen);
      return;
    }

    const card = event.target.closest(".cert-card");
    if (!card) return;
    const targetIndex = Number(card.dataset.index);
    if (Number.isInteger(targetIndex)) {
      activeIndex = targetIndex;
      synchronizeDeckLayers();
    }
  });

  deck?.addEventListener("keydown", (event) => {
    if (event.target.closest("[data-action='open']")) return;
    const card = event.target.closest(".cert-card");
    if (!card || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    activeIndex = Number(card.dataset.index);
    synchronizeDeckLayers();
  });

  pagination?.addEventListener("click", (event) => {
    const dot = event.target.closest(".carousel-dot");
    if (!dot) return;
    activeIndex = Number(dot.dataset.targetIndex);
    synchronizeDeckLayers();
  });

  viewport.addEventListener("pointerdown", (event) => {
    if (event.target.tagName === "IFRAME") return;
    isDragging = true;
    startX = event.clientX - translateX;
    startY = event.clientY - translateY;
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    translateX = event.clientX - startX;
    translateY = event.clientY - startY;
    applyTransformations();
  });

  viewport.addEventListener("pointerup", () => {
    isDragging = false;
  });

  viewport.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    handleZoom(event.deltaY > 0 ? -0.15 : 0.15);
  }, { passive: false });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") event.preventDefault();
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || dialog.open) return;
    if (event.key === "ArrowLeft") moveDeck(-1);
    if (event.key === "ArrowRight") moveDeck(1);
  });
}

async function processViewRouting() {
  const currentQuery = new URLSearchParams(window.location.search);
  const verifyHashToken = currentQuery.get("verify") || extractHashFromFragment();
  const mainPortal = document.getElementById("portal-view");
  const verificationPortal = document.getElementById("verification-view");
  if (!mainPortal || !verificationPortal) return;

  if (!verifyHashToken) {
    verificationPortal.className = "container cert-shell cert-view-hidden";
    mainPortal.className = "container cert-shell cert-view-active";
    return;
  }

  mainPortal.className = "container cert-shell cert-view-hidden";
  verificationPortal.className = "container cert-shell cert-view-active";

  const targetCert = processedCertificates.find((cert) => cert.hash === verifyHashToken || cert.slug === verifyHashToken);
  const titleView = document.getElementById("v-title");
  const issuerView = document.getElementById("v-issuer");
  const dateView = document.getElementById("v-date");
  const hashView = document.getElementById("v-hash");
  const badgeView = document.getElementById("v-badge");
  const indicator = document.getElementById("v-status-indicator");
  const mismatchWarning = document.getElementById("mismatch-container");
  const launchBtn = document.getElementById("v-btn-view");

  if (targetCert) {
    if (titleView) titleView.textContent = targetCert.title;
    if (issuerView) issuerView.textContent = targetCert.issuer;
    if (dateView) dateView.textContent = targetCert.date;
    if (hashView) hashView.textContent = targetCert.hash;
    if (badgeView) {
      badgeView.className = targetCert.hashStatus === "verified" ? "meta-value badge-style" : "meta-value badge-style unverified";
      badgeView.textContent = targetCert.hashStatus === "verified" ? "Verified SHA-256 match" : "Unverified display ID";
    }
    if (indicator) indicator.className = targetCert.hashStatus === "verified" ? "integrity-indicator" : "integrity-indicator unverified";
    mismatchWarning?.setAttribute("hidden", "");
    if (launchBtn) {
      launchBtn.style.display = "inline-flex";
      launchBtn.onclick = () => openSecureViewer(targetCert);
    }
    return;
  }

  if (titleView) titleView.textContent = "Unknown credential";
  if (issuerView) issuerView.textContent = "Verification interrupted";
  if (dateView) dateView.textContent = "No matching certificate asset";
  if (hashView) hashView.textContent = verifyHashToken;
  if (badgeView) {
    badgeView.className = "meta-value badge-style error";
    badgeView.textContent = "Hash mismatch";
  }
  if (indicator) indicator.className = "integrity-indicator compromised";
  mismatchWarning?.removeAttribute("hidden");
  if (launchBtn) launchBtn.style.display = "none";
}

function extractHashFromFragment() {
  const hashString = window.location.hash;
  return hashString.startsWith("#verify/") ? hashString.substring(8) : null;
}

function parsePhrases(element) {
  if (!element) return [];
  try {
    const phrases = JSON.parse(element.getAttribute("data-phrases") || "[]");
    return Array.isArray(phrases) ? phrases.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function startTypewriterRotate() {
  stopTypewriterRotate();
  typewriter.el = document.getElementById("subtitle-rotator");
  if (!typewriter.el) return;

  typewriter.phrases = parsePhrases(typewriter.el);
  if (!typewriter.phrases.length) typewriter.phrases = [typewriter.el.textContent.trim()].filter(Boolean);

  if (prefersReducedMotion) {
    typewriter.el.textContent = typewriter.phrases[0] || "";
    return;
  }

  typewriter.el.textContent = "";
  const line = document.createElement("span");
  line.className = "tw-line";
  typewriter.el.appendChild(line);
  typewriter.iPhrase = 0;
  typewriter.iChar = 0;
  typewriter.typing = true;
  loopTypewriter();
}

function stopTypewriterRotate() {
  if (typewriter.timer) {
    clearTimeout(typewriter.timer);
    typewriter.timer = null;
  }
}

function loopTypewriter() {
  const line = typewriter.el?.querySelector(".tw-line");
  if (!line) return;
  const phrase = typewriter.phrases[typewriter.iPhrase] || "";

  if (typewriter.typing) {
    if (typewriter.iChar < phrase.length) {
      const span = document.createElement("span");
      span.className = "tw-char is-typing";
      span.style.color = pickTypingColor();
      span.textContent = phrase[typewriter.iChar];
      line.appendChild(span);
      const previous = line.children[line.children.length - 2];
      if (previous) previous.style.color = "";
      typewriter.iChar++;
      typewriter.timer = setTimeout(loopTypewriter, typewriter.typeMs);
      return;
    }

    typewriter.typing = false;
    typewriter.timer = setTimeout(loopTypewriter, typewriter.pauseMs);
    return;
  }

  if (typewriter.iChar > 0) {
    line.removeChild(line.lastChild);
    typewriter.iChar--;
    typewriter.timer = setTimeout(loopTypewriter, typewriter.eraseMs);
    return;
  }

  typewriter.typing = true;
  typewriter.iPhrase = (typewriter.iPhrase + 1) % typewriter.phrases.length;
  typewriter.timer = setTimeout(loopTypewriter, typewriter.typeMs);
}

function pickTypingColor() {
  const pool = typewriter.colors.filter((color) => color !== typewriter.prevColor);
  const choice = pool[Math.floor(Math.random() * pool.length)] || typewriter.colors[0];
  typewriter.prevColor = choice;
  return choice;
}

async function initializeVerificationPortal() {
  try {
    await compileMetaMatrix();
    hydrateInterfaceControls();
    resetFilterDefaults();
    renderCertificateGrid();
    registerModalEvents();
    startTypewriterRotate();

    document.getElementById("cert-search")?.addEventListener("input", renderCertificateGrid);
    document.getElementById("filter-issuer")?.addEventListener("change", renderCertificateGrid);
    document.getElementById("filter-year")?.addEventListener("change", renderCertificateGrid);
    document.getElementById("sort-order")?.addEventListener("change", renderCertificateGrid);

    await processViewRouting();
    window.addEventListener("popstate", processViewRouting);
    window.addEventListener("hashchange", processViewRouting);

    const loader = document.getElementById("cert-loading");
    if (loader) loader.hidden = true;
  } catch (error) {
    console.error("Certificate gallery initialization failed:", error);
    const loader = document.getElementById("cert-loading");
    if (loader) loader.textContent = "The certificate gallery could not load.";
  }
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  queueMicrotask(initializeVerificationPortal);
} else {
  document.addEventListener("DOMContentLoaded", initializeVerificationPortal, { once: true });
}
