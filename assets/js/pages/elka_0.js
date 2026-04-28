(() => {
  "use strict";

  const body = document.body;
  const route = body?.dataset?.route;

  if (!body || route !== "elka-0") {
    return;
  }

  const links = typeof window.ELKA_LINKS === "object" && window.ELKA_LINKS ? window.ELKA_LINKS : {};
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const getHeaderOffset = () => {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--header-height");
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed + 24 : 96;
  };

  const scrollToSection = (section) => {
    if (!section) {
      return;
    }

    const top = section.getBoundingClientRect().top + window.scrollY - getHeaderOffset();

    window.scrollTo({
      top,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  };

  const setRepositoryLinks = () => {
    qsa("[data-elka-link]").forEach((anchor) => {
      const key = anchor.getAttribute("data-elka-link");
      const href = typeof key === "string" ? links[key] : "";

      if (typeof href !== "string" || !href.trim()) {
        anchor.removeAttribute("href");
        anchor.removeAttribute("target");
        anchor.removeAttribute("rel");
        anchor.setAttribute("aria-disabled", "true");
        anchor.setAttribute("tabindex", "-1");
        anchor.classList.add("is-disabled");
        return;
      }

      anchor.href = href;
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
      anchor.removeAttribute("aria-disabled");
      anchor.removeAttribute("tabindex");
      anchor.classList.remove("is-disabled");
    });
  };

  const setupActiveDocNavigation = () => {
    const nav = document.querySelector(".elka-docnav");

    if (!nav) {
      return;
    }

    const navLinks = qsa("a[href^='#']", nav);
    const sectionEntries = navLinks
      .map((link) => {
        const id = link.getAttribute("href")?.slice(1);
        const section = id ? document.getElementById(id) : null;
        return section ? { link, section, id } : null;
      })
      .filter(Boolean);

    if (!sectionEntries.length) {
      return;
    }

    let activeId = "";

    const setActiveById = (id, { replaceHash = false } = {}) => {
      if (!id || id === activeId) {
        return;
      }

      activeId = id;

      navLinks.forEach((link) => {
        const linkId = link.getAttribute("href")?.slice(1) || "";
        const isActive = linkId === id;
        link.classList.toggle("is-active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });

      if (replaceHash) {
        history.replaceState(null, "", `#${id}`);
      }
    };

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a[href^='#']");

      if (!link) {
        return;
      }

      const id = link.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(id) : null;

      if (!id || !target) {
        return;
      }

      event.preventDefault();
      setActiveById(id, { replaceHash: true });
      scrollToSection(target);
    });

    nav.addEventListener("keydown", (event) => {
      const current = event.target.closest("a[href^='#']");

      if (!current) {
        return;
      }

      const currentIndex = navLinks.indexOf(current);
      if (currentIndex === -1) {
        return;
      }

      let nextIndex = currentIndex;

      if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % navLinks.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + navLinks.length) % navLinks.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = navLinks.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      navLinks[nextIndex].focus();
    });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

          const bestMatch = visibleEntries[0];

          if (!bestMatch) {
            return;
          }

          const match = sectionEntries.find((item) => item.section === bestMatch.target);

          if (match) {
            setActiveById(match.id);
          }
        },
        {
          root: null,
          rootMargin: `-${getHeaderOffset()}px 0px -52% 0px`,
          threshold: [0.12, 0.24, 0.4, 0.56]
        }
      );

      sectionEntries.forEach(({ section }) => observer.observe(section));
    } else {
      let ticking = false;

      const updateFromScroll = () => {
        const marker = window.scrollY + getHeaderOffset() + 20;

        const current = sectionEntries
          .filter(({ section }) => section.offsetTop <= marker)
          .sort((a, b) => b.section.offsetTop - a.section.offsetTop)[0];

        if (current) {
          setActiveById(current.id);
        }
      };

      window.addEventListener(
        "scroll",
        () => {
          if (ticking) {
            return;
          }

          ticking = true;

          window.requestAnimationFrame(() => {
            updateFromScroll();
            ticking = false;
          });
        },
        { passive: true }
      );

      updateFromScroll();
    }

    const idFromHash = window.location.hash.slice(1);

    if (idFromHash && sectionEntries.some((item) => item.id === idFromHash)) {
      setActiveById(idFromHash);
    } else {
      setActiveById(sectionEntries[0].id);
    }

    window.addEventListener("hashchange", () => {
      const nextId = window.location.hash.slice(1);

      if (nextId && sectionEntries.some((item) => item.id === nextId)) {
        setActiveById(nextId);
      }
    });
  };

  const copyText = async (text) => {
    if (!text) {
      return false;
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback below.
      }
    }

    const hiddenTextarea = document.createElement("textarea");
    hiddenTextarea.value = text;
    hiddenTextarea.setAttribute("readonly", "");
    hiddenTextarea.style.position = "absolute";
    hiddenTextarea.style.left = "-9999px";
    hiddenTextarea.style.opacity = "0";

    document.body.appendChild(hiddenTextarea);
    hiddenTextarea.select();

    let success = false;

    try {
      success = document.execCommand("copy");
    } catch {
      success = false;
    }

    hiddenTextarea.remove();
    return success;
  };

  const setupCopyButtons = () => {
    qsa("[data-copy-target]").forEach((button) => {
      button.addEventListener("click", async () => {
        const targetId = button.getAttribute("data-copy-target");
        const target = targetId ? document.getElementById(targetId) : null;
        const text = target?.textContent?.trim() || "";

        if (!text) {
          return;
        }

        const originalText = button.textContent || "Copy";
        button.disabled = true;

        const isCopied = await copyText(text);
        button.textContent = isCopied ? "Copied" : "Copy failed";
        button.setAttribute("data-copied", String(isCopied));

        window.setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
          button.removeAttribute("data-copied");
        }, 1600);
      });
    });
  };

  const setupSectionReveal = () => {
    const surfaces = qsa(".elka-section .elka-surface");

    if (!surfaces.length) {
      return;
    }

    surfaces.forEach((surface) => surface.classList.add("elka-reveal"));

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      surfaces.forEach((surface) => surface.classList.add("is-in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-in-view");
          currentObserver.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.14
      }
    );

    surfaces.forEach((surface) => observer.observe(surface));
  };

  const setupHashFocus = () => {
    const id = window.location.hash.slice(1);

    if (!id) {
      return;
    }

    const target = document.getElementById(id);

    if (!target) {
      return;
    }

    window.setTimeout(() => {
      scrollToSection(target);
    }, 140);
  };

  const parsePhrases = (element) => {
    const raw = element.getAttribute("data-phrases");

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((phrase) => String(phrase || "").trim())
        .filter(Boolean);
    } catch {
      return raw
        .split("|")
        .map((phrase) => phrase.trim())
        .filter(Boolean);
    }
  };

  const setupWTL = () => {
    const elements = qsa("[data-phrases]");

    if (!elements.length) {
      return;
    }

    const colors = [
      "#60a5fa",
      "#93c5fd",
      "#2563eb",
      "#b68b4c",
      "#d6a76a",
      "#f5e9da"
    ];

    elements.forEach((element) => {
      const phrases = parsePhrases(element);

      if (!phrases.length) {
        return;
      }

      element.classList.add("wtl", "is-wtl-ready");
      element.setAttribute("aria-live", "polite");
      element.setAttribute("aria-atomic", "true");

      if (prefersReducedMotion || phrases.length === 1) {
        element.textContent = phrases[0];
        element.style.color = colors[0];
        return;
      }

      let phraseIndex = 0;
      let charIndex = 0;
      let typing = true;
      let lastColor = "";

      const pickColor = () => {
        const available = colors.filter((color) => color !== lastColor);
        const next = available[Math.floor(Math.random() * available.length)] || colors[0];
        lastColor = next;
        return next;
      };

      const write = () => {
        const phrase = phrases[phraseIndex] || "";
        element.style.color = lastColor || pickColor();

        if (typing) {
          charIndex += 1;
          element.textContent = phrase.slice(0, charIndex);

          if (charIndex >= phrase.length) {
            typing = false;
            window.setTimeout(write, 1200);
            return;
          }

          window.setTimeout(write, 55);
          return;
        }

        charIndex -= 1;
        element.textContent = phrase.slice(0, Math.max(0, charIndex));

        if (charIndex <= 0) {
          typing = true;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          element.style.color = pickColor();
          window.setTimeout(write, 180);
          return;
        }

        window.setTimeout(write, 28);
      };

      element.style.color = pickColor();
      element.textContent = "";
      write();
    });
  };

  const init = () => {
    setRepositoryLinks();
    setupActiveDocNavigation();
    setupCopyButtons();
    setupSectionReveal();
    setupHashFocus();
    setupWTL();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();