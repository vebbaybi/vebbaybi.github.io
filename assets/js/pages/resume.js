/* =========================================================
   RESUME.JS - 1807 Resume behavior
   - Theme toggle with localStorage
   - Print or Save PDF
   - Auto updated year and timestamp
   - GIF background with scroll-driven frame control
   ========================================================= */

(function () {
  const themeKey = "resume-theme";
  const html = document.documentElement;

  function safeGetStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSetStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Storage can be unavailable in private or embedded contexts. */
    }
  }

  function resumeText() {
    const source = document.getElementById("main");
    return (source?.innerText || document.body.innerText || "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadText(text, filename, type = "text/plain") {
    downloadBlob(new Blob([text], { type }), filename);
  }

  // year
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear().toString();

  // updated timestamp
  const updatedAt = document.getElementById("updatedAt");
  if (updatedAt) {
    const dt = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    updatedAt.textContent = stamp;
  }

  // print
  const printBtn = document.getElementById("print-btn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }

  const pdfBtn = document.getElementById("dl-pdf");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", () => window.print());
  }

  const txtBtn = document.getElementById("dl-txt");
  if (txtBtn) {
    txtBtn.addEventListener("click", () => {
      downloadText(resumeText(), "uchenna-anozie-resume.txt");
    });
  }

  const mdBtn = document.getElementById("dl-md");
  if (mdBtn) {
    mdBtn.addEventListener("click", () => {
      const text = resumeText();
      downloadText(`# Uchenna Anozie Resume\n\n${text}\n`, "uchenna-anozie-resume.md", "text/markdown");
    });
  }

  const jsonBtn = document.getElementById("dl-json");
  if (jsonBtn) {
    jsonBtn.addEventListener("click", () => {
      downloadText(JSON.stringify({
        name: "Uchenna Anozie",
        updatedAt: updatedAt?.textContent || new Date().toISOString(),
        text: resumeText()
      }, null, 2), "uchenna-anozie-resume.json", "application/json");
    });
  }

  const vcfBtn = document.getElementById("dl-vcf");
  if (vcfBtn) {
    vcfBtn.addEventListener("click", () => {
      downloadText([
        "BEGIN:VCARD",
        "VERSION:4.0",
        "FN:Uchenna Anozie",
        "N:Anozie;Uchenna;;;",
        "URL:https://the1807.xyz/",
        "EMAIL:webbaby@the1807.xyz",
        "END:VCARD",
        ""
      ].join("\n"), "uchenna-anozie.vcf", "text/vcard");
    });
  }

  const docxBtn = document.getElementById("dl-docx");
  if (docxBtn) {
    docxBtn.addEventListener("click", async () => {
      const api = window.docx;
      if (!api?.Document || !api?.Packer || !api?.Paragraph) {
        downloadText(resumeText(), "uchenna-anozie-resume.txt");
        return;
      }

      const doc = new api.Document({
        sections: [{
          children: resumeText().split("\n").map((line) => new api.Paragraph(line))
        }]
      });
      const blob = await api.Packer.toBlob(doc);
      downloadBlob(blob, "uchenna-anozie-resume.docx");
    });
  }

  // theme load
  const saved = safeGetStorage(themeKey);
  if (saved === "light" || saved === "dark") {
    html.setAttribute("data-theme", saved);
  }

  // theme toggle
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    const apply = (mode) => {
      html.setAttribute("data-theme", mode);
      safeSetStorage(themeKey, mode);
      themeToggle.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
    };

    themeToggle.addEventListener("click", () => {
      const current = html.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      apply(next);
    });
  }

  // optional contrast tweak based on theme
  const observer = new MutationObserver(() => {
    const mode = html.getAttribute("data-theme") || "dark";
    if (mode === "light") {
      document.body.style.background = "";
    } else {
      document.body.style.background = "";
    }
  });
  observer.observe(html, { attributes: true, attributeFilter: ["data-theme"] });

  // GIF background scroll animation
  const canvas = document.getElementById("gif-bg-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const gif = new Image();
    gif.src = "/assets/images/gif/gif.gif";

    // Canvas setup
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    // GIF frame control simulation
    const totalFrames = 30; // Assumed frame count (adjust based on actual GIF)
    const frameDuration = 100; // Assumed ms per frame (adjust based on GIF)
    let currentFrame = 0;
    let lastScrollY = window.scrollY;
    let lastTimestamp = Date.now();
    let isScrolling = false;

    // Draw GIF on canvas
    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(gif, 0, 0, canvas.width, canvas.height);
      // Simulate frame by manipulating visibility (actual frame control needs libgif-js)
      canvas.style.opacity = isScrolling ? 0.5 : 0; // Match resume.css opacity
    };

    // Scroll event handler
    window.addEventListener("scroll", () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;
      const now = Date.now();
      const timeDelta = now - lastTimestamp;

      // Calculate scroll speed (pixels/ms)
      const scrollSpeed = Math.abs(scrollDelta) / timeDelta;
      isScrolling = scrollDelta !== 0;

      // Map scroll speed to frame rate
      const frameChange = Math.round(scrollSpeed * 1000 / frameDuration); // Frames per second
      if (scrollDelta > 0) {
        // Scroll down: play forward
        currentFrame = Math.min(totalFrames - 1, currentFrame + frameChange);
      } else if (scrollDelta < 0) {
        // Scroll up: rewind
        currentFrame = Math.max(0, currentFrame - frameChange);
      }

      // Update canvas
      requestAnimationFrame(drawFrame);

      lastScrollY = currentScrollY;
      lastTimestamp = now;
    });

    // Stop animation when not scrolling
    let scrollTimeout;
    window.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        drawFrame(); // Freeze on current frame
      }, 150); // Debounce to detect scroll stop
    });

    // Initial draw
    gif.onload = () => {
      drawFrame();
    };
  }
})();
