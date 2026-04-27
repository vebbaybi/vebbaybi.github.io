(() => {
  "use strict";

  const route = document.body?.dataset?.route;

  if (route !== "elka-0") {
    return;
  }

  const links = window.ELKA_LINKS || {};

  const setRepositoryLinks = () => {
    document.querySelectorAll("[data-elka-link]").forEach((anchor) => {
      const key = anchor.getAttribute("data-elka-link");
      const href = links[key];

      if (!href) {
        anchor.setAttribute("aria-disabled", "true");
        anchor.setAttribute("tabindex", "-1");
        anchor.classList.add("is-disabled");
        return;
      }

      anchor.href = href;
    });
  };

  const setupActiveDocNavigation = () => {
    const nav = document.querySelector(".elka-docnav");

    if (!nav) {
      return;
    }

    const navLinks = Array.from(nav.querySelectorAll("a[href^='#']"));
    const sections = navLinks
      .map((link) => {
        const id = link.getAttribute("href")?.slice(1);
        const section = id ? document.getElementById(id) : null;
        return section ? { link, section } : null;
      })
      .filter(Boolean);

    if (!sections.length) {
      return;
    }

    const clearActive = () => {
      navLinks.forEach((link) => link.classList.remove("is-active"));
    };

    const activate = (link) => {
      clearActive();
      link.classList.add("is-active");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) {
          return;
        }

        const match = sections.find((item) => item.section === visible.target);

        if (match) {
          activate(match.link);
        }
      },
      {
        root: null,
        rootMargin: "-28% 0px -58% 0px",
        threshold: [0.12, 0.24, 0.36, 0.5]
      }
    );

    sections.forEach(({ section }) => observer.observe(section));

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a[href^='#']");

      if (!link) {
        return;
      }

      const targetId = link.getAttribute("href")?.slice(1);
      const target = targetId ? document.getElementById(targetId) : null;

      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      activate(link);
      history.replaceState(null, "", `#${targetId}`);
    });
  };

  const setupCopyButtons = () => {
    document.querySelectorAll("[data-copy-target]").forEach((button) => {
      button.addEventListener("click", async () => {
        const targetId = button.getAttribute("data-copy-target");
        const target = targetId ? document.getElementById(targetId) : null;
        const text = target?.textContent?.trim();

        if (!text) {
          return;
        }

        const originalText = button.textContent;

        try {
          await navigator.clipboard.writeText(text);
          button.textContent = "Copied";
          button.setAttribute("data-copied", "true");
        } catch {
          button.textContent = "Copy failed";
          button.setAttribute("data-copied", "false");
        }

        window.setTimeout(() => {
          button.textContent = originalText || "Copy";
          button.removeAttribute("data-copied");
        }, 1600);
      });
    });
  };

  const setupHashFocus = () => {
    const hash = window.location.hash;

    if (!hash || hash.length < 2) {
      return;
    }

    const target = document.getElementById(hash.slice(1));

    if (!target) {
      return;
    }

    window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const init = () => {
    setRepositoryLinks();
    setupActiveDocNavigation();
    setupCopyButtons();
    setupHashFocus();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();