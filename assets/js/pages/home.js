"use strict";

/**
 * home.js — Portfolio overlay + nav control
 * - Syncs nav hover/focus/click with background image layers and split-type overlay.
 * - Safe with missing typewriter lines (e.g., no "default" line in HTML).
 * - Honors prefers-reduced-motion.
 * - Wires mobile menu toggle and overlay dismissal.
 */

class PortfolioOverlay {
  constructor() {
    this.config = {
      delayBeforeTransition: 50,
      defaultSection: "default",
      cycleSections: ["ai", "data", "embedded", "blockchain", "about", "contact", "tdi"],
      sectionMap: new Map(),
    };

    this.state = {
      currentSection: this.config.defaultSection,
      reducedMotion: false,
      transitionTimeout: null,
      mobileOpen: false,
    };

    this._onKeyDown = this._onKeyDown.bind(this);
    this._handleLinkEvent = this._handleLinkEvent.bind(this);
    this._onMobileToggle = this._onMobileToggle.bind(this);
    this._onOverlayClick = this._onOverlayClick.bind(this);

    this.init();
  }

  // ---- Lifecycle ----
  init() {
    this.detectReducedMotion();
    this.cacheElements();
    this.populateSectionMap();
    this.bindEvents();
    this.setInitialSection();
  }

  destroy() {
    document.removeEventListener("keydown", this._onKeyDown);

    this.navLinks.forEach(link => {
      link.removeEventListener("mouseenter", this._handleLinkEvent);
      link.removeEventListener("mouseleave", this._handleLinkEvent);
      link.addEventListener('click', this._handleLinkEvent);
      link.removeEventListener("focus", this._handleLinkEvent);
      link.removeEventListener("blur", this._handleLinkEvent);
      link.removeEventListener("click", this._handleLinkEvent);
    });

    if (this.mobileToggle) this.mobileToggle.removeEventListener("click", this._onMobileToggle);
    if (this.mobileOverlay) this.mobileOverlay.removeEventListener("click", this._onOverlayClick);

    if (this.state.transitionTimeout) {
      clearTimeout(this.state.transitionTimeout);
      this.state.transitionTimeout = null;
    }
  }

  // ---- Setup ----
  detectReducedMotion() {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.state.reducedMotion = mq.matches;
    mq.addEventListener?.("change", e => {
      this.state.reducedMotion = e.matches;
      this._updateReducedMotionStyles();
    });
  }

  cacheElements() {
    this.navLinks = document.querySelectorAll(".navigation-links-full .nav-link, .mobile-nav-vertical .nav-link");
    this.typewriterOverlay = document.querySelector(".typewriter-overlay-centered");

    // Mobile UI
    this.mobileToggle = document.getElementById("mobile-menu-toggle");
    this.mobileNav = document.getElementById("mobile-nav");
    this.mobileOverlay = document.getElementById("mobile-nav-overlay");

    // Ensure default is present in the map with safe nulls
    this.config.sectionMap.set(this.config.defaultSection, {
      link: null,
      image: document.querySelector(`.image-layer[data-section="default"]`),
      typewriter: document.querySelector(`.typewriter-line-split[data-section="default"]`) || null,
    });
  }

  populateSectionMap() {
    this.navLinks.forEach(link => {
      const section = link.dataset.section;
      if (!section) return;

      this.config.sectionMap.set(section, {
        link,
        image: document.querySelector(`.image-layer[data-section="${section}"]`),
        typewriter: document.querySelector(`.typewriter-line-split[data-section="${section}"]`) || null,
      });
    });
  }

  bindEvents() {
    this.navLinks.forEach(link => {
      link.addEventListener("mouseenter", this._handleLinkEvent);
      link.addEventListener("mouseleave", this._handleLinkEvent);
      link.addEventListener("focus", this._handleLinkEvent);
      link.addEventListener("blur", this._handleLinkEvent);
      link.addEventListener("click", this._handleLinkEvent);
    });

    document.addEventListener("keydown", this._onKeyDown);

    if (this.mobileToggle) this.mobileToggle.addEventListener("click", this._onMobileToggle);
    if (this.mobileOverlay) this.mobileOverlay.addEventListener("click", this._onOverlayClick);
  }

  // ---- Mobile nav ----
  _onMobileToggle() {
    this.setMobileOpen(!this.state.mobileOpen);
  }

  _onOverlayClick() {
    this.setMobileOpen(false);
  }

  setMobileOpen(open) {
    this.state.mobileOpen = !!open;

    if (this.mobileToggle) {
      this.mobileToggle.setAttribute("aria-expanded", this.state.mobileOpen ? "true" : "false");
    }
    if (this.mobileNav) {
      this.mobileNav.classList.toggle("active", this.state.mobileOpen);
    }
    if (this.mobileOverlay) {
      this.mobileOverlay.classList.toggle("active", this.state.mobileOpen);
      this.mobileOverlay.setAttribute("aria-hidden", this.state.mobileOpen ? "false" : "true");
      // Show/Hide overlay display since CSS default is display:none
      this.mobileOverlay.style.display = this.state.mobileOpen ? "block" : "none";
    }
  }

  // ---- Events ----
  _anyNavHasFocus() {
    return Array.from(this.navLinks).some(a => a === document.activeElement);
  }

  _handleLinkEvent(e) {
    const section = e.currentTarget.dataset.section;
    if (!section) return;

    if (e.type === "mouseenter" || e.type === "focus") {
      if (this.state.transitionTimeout) clearTimeout(this.state.transitionTimeout);
      this.state.transitionTimeout = setTimeout(() => this.activateSection(section), this.config.delayBeforeTransition);
    } else if (e.type === "mouseleave" || e.type === "blur") {
      if (this.state.transitionTimeout) clearTimeout(this.state.transitionTimeout);
      if (!this._anyNavHasFocus()) {
        this.state.transitionTimeout = setTimeout(
          () => this.activateSection(this.config.defaultSection),
          this.config.delayBeforeTransition
        );
      }
    } else if (e.type === "click") {
      this.activateSection(section);
      // allow navigation effect on mobile 
      if (e.currentTarget.closest('.mobile-nav-vertical')) {
        this.setMobileOpen(false);
      }
    }
  }

  _onKeyDown(e) {
    const el = document.activeElement;
    const tag = el?.tagName?.toLowerCase();
    const isTypingContext = tag === "input" || tag === "textarea" || el?.isContentEditable;
    if (isTypingContext) return;

    if (e.key === "Escape") {
      // Close mobile menu if open
      if (this.state.mobileOpen) {
        this.setMobileOpen(false);
        e.preventDefault();
        return;
      }
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      this.handleArrowNav(e.key);
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      const activeLink = this.config.sectionMap.get(this.state.currentSection)?.link;
      if (activeLink && this.state.currentSection !== this.config.defaultSection) {
        if (el !== activeLink) {
          e.preventDefault();
          activeLink.click();
        }
      }
    }
  }

  // ---- Sections ----
  setInitialSection() {
    // Clean slate
    this.config.sectionMap.forEach(item => {
      item?.image?.classList.remove("active");
      item?.typewriter?.classList.remove("active");
      this._resetTypewriter(item?.typewriter);
    });

    // Activate default image layer; default typewriter may not exist and that is fine
    const def = this.config.sectionMap.get(this.config.defaultSection);
    def?.image?.classList.add("active");
    def?.typewriter && def.typewriter.classList.add("active");

    this.state.currentSection = this.config.defaultSection;
    this._updateReducedMotionStyles();
  }

  handleArrowNav(key) {
    const arr = this.config.cycleSections;
    let idx = arr.indexOf(this.state.currentSection);

    if (idx === -1) {
      idx = key === "ArrowLeft" ? arr.length - 1 : 0;
    } else {
      idx = key === "ArrowLeft" ? (idx - 1 + arr.length) % arr.length : (idx + 1) % arr.length;
    }

    const next = arr[idx];
    this.activateSection(next);
    this.config.sectionMap.get(next)?.link?.focus();
  }

  activateSection(section, opts = {}) {
    if (!section || section === this.state.currentSection) return;

    const prev = this.config.sectionMap.get(this.state.currentSection);
    if (prev) {
      prev.link?.removeAttribute("aria-current");
      prev.image?.classList.remove("active");
      prev.typewriter?.classList.remove("active");
      this._resetTypewriter(prev.typewriter);
    }

    this.state.currentSection = section;

    const cur = this.config.sectionMap.get(section);
    if (!cur) return;

    cur.link?.setAttribute("aria-current", "true");
    cur.image?.classList.add("active");
    cur.typewriter?.classList.add("active");

    if (this.state.reducedMotion) {
      this._showTypewriterImmediately(cur.typewriter);
    }

    if (!opts.silent && this.typewriterOverlay) {
      this.typewriterOverlay.setAttribute("aria-busy", "true");
      setTimeout(() => this.typewriterOverlay && this.typewriterOverlay.removeAttribute("aria-busy"), 50);
    }
  }

  // ---- Typewriter helpers ----
  _resetTypewriter(line) {
    if (!line) return;
    line.querySelectorAll(".typewriter-part-large").forEach(p => {
      p.style.opacity = "";
      p.style.transform = "";
    });
  }

  _showTypewriterImmediately(line) {
    if (!line) return;
    line.querySelectorAll(".typewriter-part-large").forEach(p => {
      p.style.opacity = "1";
      p.style.transform = "none";
    });
  }

  _updateReducedMotionStyles() {
    if (!this.state.reducedMotion) return;
    this.config.sectionMap.forEach(item => {
      if (item?.typewriter && item.typewriter.classList.contains("active")) {
        this._showTypewriterImmediately(item.typewriter);
      }
    });
  }
}

// Boot
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".navigation-links-full")) {
    window.portfolioOverlay = new PortfolioOverlay();
  }
});

// CommonJS export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = PortfolioOverlay;
}
