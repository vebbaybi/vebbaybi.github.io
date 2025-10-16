// assets/js/pages/tdi.js
// Renders TDI feed from assets/data/tdi_feed.json into cards.
// No external deps. Theme-aware via site CSS tokens.

/**
 * Calculates a friendly time difference string (e.g., "5 hours ago").
 * @param {string} iso - ISO 8601 timestamp string.
 * @returns {string} The time ago string.
 */
function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];
  for (const [name, secs] of units) {
    const v = Math.floor(s / secs);
    if (v >= 1) return v + " " + name + (v > 1 ? "s" : "") + " ago";
  }
  return "just now";
}

/**
 * Renders a single Facebook post card element.
 * @param {object} p - Normalized post object from tdi_feed.json.
 * @returns {HTMLElement} The created article card element.
 */
function createPostCard(p) {
    const card = document.createElement("article");
    card.className = "tdi-card";

    // --- Media ---
    const media = Array.isArray(p.attachments) ? p.attachments : [];
    
    // Check if there is valid media to display (we display the first item for the card preview)
    if (media.length > 0 && media[0].src) {
        const m = document.createElement("div");
        m.className = "tdi-media";
        
        // Use an anchor tag around the media to link to the permalink
        const mediaLink = document.createElement("a");
        mediaLink.href = p.permalink_url || "#";
        mediaLink.target = "_blank";
        mediaLink.rel = "noopener noreferrer";

        const img = document.createElement("img");
        img.src = media[0].src;
        img.alt = media[0].alt || "Post media";
        img.loading = "lazy";
        
        mediaLink.appendChild(img);
        m.appendChild(mediaLink);
        card.appendChild(m);
    }

    // --- Body (Text, Time, Actions) ---
    const body = document.createElement("div");
    body.className = "tdi-body";

    const time = document.createElement("div");
    time.className = "tdi-time";
    time.textContent = p.created_time ? timeAgo(p.created_time) : "";

    // The message_html property contains linkified text, hashtags, and mentions.
    if (p.message_html) {
        const msg = document.createElement("div");
        msg.className = "tdi-msg";
        msg.innerHTML = p.message_html;
        body.appendChild(msg);
    }

    const actions = document.createElement("div");
    actions.className = "tdi-actions";
    
    if (p.permalink_url) {
        const a = document.createElement("a");
        a.className = "tdi-link";
        a.href = p.permalink_url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "View on Facebook";
        actions.appendChild(a);
    }

    body.appendChild(time);
    body.appendChild(actions);

    card.appendChild(body);
    return card;
}


/**
 * Loads the feed data and renders the post cards into the grid.
 */
async function loadFeed() {
  const grid = document.getElementById("tdi-grid");
  const meta = document.getElementById("tdi-meta");
  const empty = document.getElementById("tdi-empty");
  
  if (!grid || !meta || !empty) {
    console.error("Required TDI elements (tdi-grid, tdi-meta, tdi-empty) not found.");
    return;
  }

  try {
    // Setting "no-cache" helps ensure the GitHub Pages artifact updates quickly
    const res = await fetch("assets/data/tdi_feed.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load feed JSON. Status: " + res.status);
    const data = await res.json();

    meta.textContent = "Updated " + timeAgo(data.generated_at) + " • Page ID: " + (data.page_id || "unknown");

    const posts = Array.isArray(data.posts) ? data.posts : [];
    grid.innerHTML = "";
    grid.setAttribute("aria-busy", "false");

    if (!posts.length) {
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";
    
    // Render posts
    for (const p of posts) {
      grid.appendChild(createPostCard(p));
    }

  } catch (err) {
    meta.textContent = "Failed to load feed data.";
    console.error("TDI Feed Load Error:", err);
    grid.setAttribute("aria-busy", "false");
    empty.style.display = "block";
  }
}

// Initialize the loader when the page attribute indicates the TDI page
if (document.documentElement.getAttribute("data-page") === "TDI") {
  loadFeed();
}
