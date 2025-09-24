/* =======================================================================================
   1807 — Resume Export Orchestrator + Eyebrow Typewriter
   - Targets: #resume (content), action buttons in .resume-actions
   - Outputs: PDF, DOCX, Markdown, TXT, JSON, vCard
   - Uses CDNs: html2canvas, jsPDF (UMD), docx (UMD)
   - Robust DOM extraction -> normalized data model -> multi-format exporters
   - Typewriter: reads data-phrases from #eyebrow-rotator (reduced-motion safe)
   Author: webbaby (chains.io / vebbaybi.github.io)
   ======================================================================================= */

(function () {
  "use strict";

  /** ----------------------------------------------
   * Utilities
   * ---------------------------------------------- */

  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  function saveText(text, filename) {
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
  }

  function safeText(node) {
    return (node?.textContent || "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim();
  }

  function asLines(text) {
    return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  }

  function kebab(s) {
    return String(s || "").toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function nowStamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  /** ----------------------------------------------
   * DOM → Data Model
   * ---------------------------------------------- */

  function extractResumeModel() {
    const root = $("#resume");
    if (!root) throw new Error("Resume root (#resume) not found.");

    // Header
    const who = $(".resume-header .id h1");
    const role = $(".resume-header .role");
    const img = $(".resume-photo img");
    const tags = $all(".stack-tags .tag").map(el => safeText(el));

    // Sections
    const sections = $all("#resume > section.resume-card");

    const model = {
      meta: {
        title: document.title || "Resume",
        url: location.href,
        generatedAt: new Date().toISOString(),
      },
      identity: {
        fullName: safeText(who),
        role: safeText(role),
        photo: img?.getAttribute("src") || null,
        tags: tags,
      },
      summary: "",
      skills: [],        // [{k: 'Programming', v: 'Python, C/C++'}]
      projects: [],      // [{title, meta, bullets:[]}]
      education: [],     // [{title, meta}]
      contact: { links: [] } // [{k, v, href}]
    };

    for (const sec of sections) {
      const h2 = $("h2", sec);
      const sectionId = (h2?.id || kebab(safeText(h2))).toLowerCase();

      // Summary
      if (sectionId.includes("summary")) {
        const p = $("p", sec);
        model.summary = safeText(p);
        continue;
      }

      // Skills (resume-grid -> .kv .k/.v)
      if (sectionId.includes("skills")) {
        const kvs = $all(".resume-grid .kv", sec);
        model.skills = kvs.map(kv => ({
          k: safeText($(".k", kv)),
          v: safeText($(".v", kv)),
        }));
        continue;
      }

      // Projects (.item blocks)
      if (sectionId.includes("project")) {
        const items = $all(".item", sec);
        model.projects = items.map(it => ({
          title: safeText($(".title", it)),
          meta: safeText($(".meta", it)),
          bullets: $all("ul li", it).map(li => safeText(li)),
        }));
        continue;
      }

      // Education
      if (sectionId.includes("education")) {
        const items = $all(".item", sec);
        model.education = items.map(it => ({
          title: safeText($(".title", it)),
          meta: safeText($(".meta", it)),
        }));
        continue;
      }

      // Contact (resume-grid -> .kv with link)
      if (sectionId.includes("contact")) {
        const kvs = $all(".resume-grid .kv", sec);
        model.contact.links = kvs.map(kv => {
          const k = safeText($(".k", kv));
          const a = $("a", $(".v", kv));
          return {
            k,
            v: safeText($(".v", kv)),
            href: a?.getAttribute("href") || null,
          };
        });
        continue;
      }
    }

    return model;
  }

  /** ----------------------------------------------
   * Exporters
   * ---------------------------------------------- */

  async function exportPDF() {
    const resume = $("#resume");
    if (!resume) throw new Error("#resume not found.");
    if (!window.jspdf || !window.html2canvas) throw new Error("jsPDF or html2canvas missing.");

    // Force light theme for print fidelity, without altering screen theme permanently
    const prevCS = document.documentElement.getAttribute("data-force-print-mode") || "";
    document.documentElement.setAttribute("data-force-print-mode", "light");
    const wasDark = document.body.classList.contains("theme-dark");
    document.body.classList.remove("theme-dark");

    // Render with html2canvas at higher scale for crisp text
    const scale = Math.min(2, window.devicePixelRatio || 1.5);
    const canvas = await window.html2canvas(resume, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });

    // ✅ Correct jsPDF instantiation
    const pdf = new window.jspdf.jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgData = canvas.toDataURL("image/png");
    const imgW = pageW;
    const imgH = canvas.height * (imgW / canvas.width); // mm height when scaled to page width

    if (imgH <= pageH) {
      pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH, undefined, "FAST");
    } else {
      // Slice tall canvas into pages
      const pageHeightPx = canvas.height * (pageH / imgH); // px per page when scaled
      const pageCanvas = document.createElement("canvas");
      const pageCtx = pageCanvas.getContext("2d");
      pageCanvas.width = canvas.width;

      let y = 0;
      while (y < canvas.height) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - y);
        pageCanvas.height = sliceHeight;
        pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        const sliceData = pageCanvas.toDataURL("image/png");
        const sliceH = (sliceHeight / canvas.height) * imgH; // mm height for this slice

        pdf.addImage(sliceData, "PNG", 0, 0, imgW, sliceH, undefined, "FAST");
        y += sliceHeight;
        if (y < canvas.height) pdf.addPage();
      }
    }

    // Restore theme state
    if (wasDark) document.body.classList.add("theme-dark");
    if (prevCS) document.documentElement.setAttribute("data-force-print-mode", prevCS);
    else document.documentElement.removeAttribute("data-force-print-mode");

    const name = kebab(extractResumeModel().identity.fullName) || "resume";
    pdf.save(`${name}-${nowStamp()}.pdf`);
  }

  async function exportDOCX() {
    if (!window.docx) throw new Error("docx library missing.");
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = window.docx;

    const data = extractResumeModel();

    const title = new Paragraph({
      text: data.identity.fullName || "Resume",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    });

    const role = data.identity.role
      ? new Paragraph({ text: data.identity.role, alignment: AlignmentType.CENTER })
      : null;

    const makeHeading = (text) =>
      new Paragraph({ text, heading: HeadingLevel.HEADING_2 });

    const makeBullets = (arr) =>
      arr.map(t => new Paragraph({ text: t, bullet: { level: 0 } }));

    const children = [title];
    if (role) children.push(role);

    // Tags
    if (data.identity.tags?.length) {
      children.push(new Paragraph({ text: data.identity.tags.join(" • "), alignment: AlignmentType.CENTER }));
    }

    // Summary
    if (data.summary) {
        children.push(makeHeading("Summary"));
        asLines(data.summary).forEach(line => children.push(new Paragraph({ text: line })));
    }

    // Skills
    if (data.skills?.length) {
      children.push(makeHeading("Core Skills"));
      data.skills.forEach(s => {
        const k = s.k ? `${s.k}: ` : "";
        children.push(new Paragraph({ children: [new TextRun({ text: k, bold: true }), new TextRun(s.v || "")] }));
      });
    }

    // Projects
    if (data.projects?.length) {
      children.push(makeHeading("Selected Projects"));
      data.projects.forEach(p => {
        if (p.title) children.push(new Paragraph({ text: p.title, heading: HeadingLevel.HEADING_3 }));
        if (p.meta) children.push(new Paragraph({ text: p.meta }));
        if (p.bullets?.length) children.push(...makeBullets(p.bullets));
      });
    }

    // Education
    if (data.education?.length) {
      children.push(makeHeading("Education"));
      data.education.forEach(e => {
        const line = e.meta ? `${e.title} — ${e.meta}` : e.title;
        children.push(new Paragraph({ text: line }));
      });
    }

    // Contact
    if (data.contact?.links?.length) {
      children.push(makeHeading("Contact"));
      data.contact.links.forEach(l => {
        children.push(new Paragraph({ text: `${l.k}: ${l.v}` }));
      });
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);

    const name = kebab(data.identity.fullName) || "resume";
    downloadBlob(blob, `${name}-${nowStamp()}.docx`);
  }

  function exportMarkdown() {
    const d = extractResumeModel();
    let md = `# ${d.identity.fullName || "Resume"}\n`;
    if (d.identity.role) md += `**${d.identity.role}**\n\n`;
    if (d.identity.tags?.length) md += `${d.identity.tags.join(" • ")}\n\n`;

    if (d.summary) {
      md += `## Summary\n${d.summary}\n\n`;
    }

    if (d.skills?.length) {
      md += `## Core Skills\n`;
      d.skills.forEach(s => { md += `- **${s.k}**: ${s.v}\n`; });
      md += `\n`;
    }

    if (d.projects?.length) {
      md += `## Selected Projects\n`;
      d.projects.forEach(p => {
        md += `### ${p.title}\n`;
        if (p.meta) md += `*${p.meta}*\n`;
        if (p.bullets?.length) p.bullets.forEach(b => md += `- ${b}\n`);
        md += `\n`;
      });
    }

    if (d.education?.length) {
      md += `## Education\n`;
      d.education.forEach(e => { md += `- ${e.title}${e.meta ? ` — ${e.meta}` : ""}\n`; });
      md += `\n`;
    }

    if (d.contact?.links?.length) {
      md += `## Contact\n`;
      d.contact.links.forEach(l => {
        const link = l.href ? `[${l.v}](${l.href})` : l.v;
        md += `- **${l.k}**: ${link}\n`;
      });
      md += `\n`;
    }

    const name = kebab(d.identity.fullName) || "resume";
    saveText(md, `${name}-${nowStamp()}.md`);
  }

  function exportTXT() {
    const d = extractResumeModel();
    const lines = [];

    lines.push(d.identity.fullName || "Resume");
    if (d.identity.role) lines.push(d.identity.role);
    if (d.identity.tags?.length) lines.push(d.identity.tags.join(" • "));
    lines.push("");

    if (d.summary) {
      lines.push("Summary");
      lines.push(d.summary);
      lines.push("");
    }

    if (d.skills?.length) {
      lines.push("Core Skills");
      d.skills.forEach(s => lines.push(`- ${s.k}: ${s.v}`));
      lines.push("");
    }

    if (d.projects?.length) {
      lines.push("Selected Projects");
      d.projects.forEach(p => {
        lines.push(`* ${p.title}`);
        if (p.meta) lines.push(`  ${p.meta}`);
        (p.bullets || []).forEach(b => lines.push(`  - ${b}`));
        lines.push("");
      });
    }

    if (d.education?.length) {
      lines.push("Education");
      d.education.forEach(e => lines.push(`- ${e.title}${e.meta ? ` — ${e.meta}` : ""}`));
      lines.push("");
    }

    if (d.contact?.links?.length) {
      lines.push("Contact");
      d.contact.links.forEach(l => lines.push(`- ${l.k}: ${l.v}`));
      lines.push("");
    }

    const name = kebab(d.identity.fullName) || "resume";
    saveText(lines.join("\n"), `${name}-${nowStamp()}.txt`);
  }

  function exportJSON() {
    const d = extractResumeModel();
    const pretty = JSON.stringify(d, null, 2);
    const name = kebab(d.identity.fullName) || "resume";
    downloadBlob(new Blob([pretty], { type: "application/json;charset=utf-8" }), `${name}-${nowStamp()}.json`);
  }

  function exportVCF() {
    const d = extractResumeModel();
    const n = (d.identity.fullName || "").trim();
    const parts = n.split(/\s+/);
    const family = parts.slice(-1)[0] || "";
    const given = parts[0] || "";
    const fn = n || "Uchenna Anozie";

    // vCard 4.0 minimal; add URLs from contact
    const lines = [
      "BEGIN:VCARD",
      "VERSION:4.0",
      `N:${family};${given};;;`,
      `FN:${fn}`,
      d.identity.role ? `TITLE:${d.identity.role}` : null,
    ].filter(Boolean);

    // Website / profiles
    const urls = (d.contact?.links || [])
      .map(l => l.href || l.v)
      .filter(Boolean);

    urls.forEach(u => lines.push(`URL:${u}`));

    lines.push("END:VCARD");

    const name = kebab(d.identity.fullName) || "resume";
    saveText(lines.join("\n"), `${name}-${nowStamp()}.vcf`);
  }

  /** ----------------------------------------------
   * Eyebrow Typewriter (reads data-phrases)
   * ---------------------------------------------- */

  let TW_STATE = { timer: null, reduced: false };

  function initTypewriter() {
    const host = $("#eyebrow-rotator");
    if (!host) return;

    TW_STATE.reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

    // Decide target line element:
    // If host itself has .tw-line, write into host. Otherwise ensure a child .tw-line exists.
    let line = host;
    if (!host.classList.contains("tw-line")) {
      line = host.querySelector(".tw-line");
      if (!line) {
        line = document.createElement("span");
        line.className = "tw-line";
        host.appendChild(line);
      }
    }

    // Parse phrases
    let phrases;
    try {
      const raw = host.getAttribute("data-phrases");
      phrases = raw ? JSON.parse(raw) : null;
    } catch { /* ignore */ }
    if (!Array.isArray(phrases) || phrases.length === 0) phrases = ["WELCOME TO THE RAIN..."];

    // Reduced motion → just show the first phrase
    if (TW_STATE.reduced) {
      line.textContent = phrases[0] || "";
      return;
    }

    // Typing loop
    const colors = ["#60a5fa", "#93c5fd", "#2563eb", "#b68b4c", "#d6a76a", "#f5e9da"];
    const pickColor = (prev) => {
      const pool = colors.filter(c => c !== prev);
      return pool[Math.floor(Math.random() * pool.length)] || colors[0];
    };

    let ip = 0, ic = 0, typing = true, prevColor = null;

    // Clear any previous content (HMR/soft reload safety)
    line.textContent = "";

    function step() {
      const text = phrases[ip] || "";
      if (typing) {
        if (ic < text.length) {
          const span = document.createElement("span");
          span.className = "tw-char is-typing";
          const color = pickColor(prevColor); prevColor = color;
          // Direct style color so it works even if page CSS doesn't define --typing-color rule
          span.style.color = color;
          span.textContent = text[ic];
          line.appendChild(span);

          const prevChar = line.children[line.children.length - 2];
          if (prevChar && prevChar.classList.contains("tw-char")) prevChar.classList.remove("is-typing");

          ic++;
          TW_STATE.timer = setTimeout(step, 55);
          return;
        }
        const last = line.lastElementChild;
        if (last) last.classList.remove("is-typing");
        typing = false;
        TW_STATE.timer = setTimeout(step, 1200);
        return;
      } else {
        if (ic > 0) {
          line.removeChild(line.lastChild);
          ic--;
          TW_STATE.timer = setTimeout(step, 28);
          return;
        }
        typing = true; ip = (ip + 1) % phrases.length;
        TW_STATE.timer = setTimeout(step, 55);
      }
    }

    step();

    // Visibility pause/resume (saves CPU)
    const onVis = () => {
      if (document.hidden) {
        if (TW_STATE.timer) { clearTimeout(TW_STATE.timer); TW_STATE.timer = null; }
      } else if (!TW_STATE.reduced && !TW_STATE.timer) {
        step();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // Store cleanup to remove listeners if needed later
    TW_STATE.cleanup = () => {
      if (TW_STATE.timer) { clearTimeout(TW_STATE.timer); TW_STATE.timer = null; }
      document.removeEventListener("visibilitychange", onVis);
    };
  }

  /** ----------------------------------------------
   * Wiring (buttons + typewriter + small retry guard)
   * ---------------------------------------------- */
  function bindActions() {
    const btnPDF = $("#dl-pdf");
    const btnDOCX = $("#dl-docx");
    const btnMD = $("#dl-md");
    const btnTXT = $("#dl-txt");
    const btnJSON = $("#dl-json");
    const btnVCF = $("#dl-vcf");
    const btnPrint = $("#print-btn");

    if (btnPDF) btnPDF.addEventListener("click", async () => {
      btnPDF.disabled = true;
      try { await exportPDF(); } catch (e) { console.error(e); alert("PDF export failed."); }
      finally { btnPDF.disabled = false; }
    });

    if (btnDOCX) btnDOCX.addEventListener("click", async () => {
      btnDOCX.disabled = true;
      try { await exportDOCX(); } catch (e) { console.error(e); alert("DOCX export failed."); }
      finally { btnDOCX.disabled = false; }
    });

    if (btnMD) btnMD.addEventListener("click", () => {
      try { exportMarkdown(); } catch (e) { console.error(e); alert("Markdown export failed."); }
    });

    if (btnTXT) btnTXT.addEventListener("click", () => {
      try { exportTXT(); } catch (e) { console.error(e); alert("TXT export failed."); }
    });

    if (btnJSON) btnJSON.addEventListener("click", () => {
      try { exportJSON(); } catch (e) { console.error(e); alert("JSON export failed."); }
    });

    if (btnVCF) btnVCF.addEventListener("click", () => {
      try { exportVCF(); } catch (e) { console.error(e); alert("vCard export failed."); }
    });

    if (btnPrint) btnPrint.addEventListener("click", () => window.print());
  }

  function boot() {
    bindActions();
    initTypewriter();

    // If something re-rendered and nuked the eyebrow contents, retry once
    setTimeout(() => {
      const host = document.querySelector("#eyebrow-rotator");
      if (host && !host.textContent.trim()) {
        if (typeof TW_STATE.cleanup === "function") TW_STATE.cleanup();
        initTypewriter();
      }
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  /** ----------------------------------------------
   * Hardening notes
   * - jsPDF/html2canvas/docx are loaded via <script defer> in the HTML; no dynamic import
   * - PDF: A4 pagination via canvas slicing; dark mode is temporarily disabled for fidelity
   * - Model extraction is resilient to missing fields; exports degrade gracefully
   * - VCF: minimal 4.0 card using FN/TITLE/URL; add TEL/EMAIL when you expose them
   * - Filenames include timestamp; safe kebab-cased identity
   * ---------------------------------------------- */
})();
