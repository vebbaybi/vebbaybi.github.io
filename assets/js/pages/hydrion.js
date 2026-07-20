const menuButton = document.querySelector('[data-menu-toggle]');
const primaryNav = document.querySelector('[data-primary-nav]');
let menuReturnFocus = null;

function focusableWithin(element) {
  return [...element.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
}

function closeMenu({ restoreFocus = true } = {}) {
  if (!menuButton || !primaryNav) return;
  primaryNav.dataset.open = 'false';
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.textContent = 'Menu';
  document.body.classList.remove('menu-open');
  if (restoreFocus && menuReturnFocus) menuReturnFocus.focus();
}

function openMenu() {
  if (!menuButton || !primaryNav) return;
  menuReturnFocus = document.activeElement;
  primaryNav.dataset.open = 'true';
  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.textContent = 'Close';
  document.body.classList.add('menu-open');
  focusableWithin(primaryNav)[0]?.focus();
}

menuButton?.addEventListener('click', () => {
  if (primaryNav?.dataset.open === 'true') closeMenu();
  else openMenu();
});

primaryNav?.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu({ restoreFocus: false });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && primaryNav?.dataset.open === 'true') {
    closeMenu();
    return;
  }
  if (event.key !== 'Tab' || primaryNav?.dataset.open !== 'true') return;
  const nodes = [menuButton, ...focusableWithin(primaryNav)];
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

const docsNav = document.querySelector('[data-docs-nav]');
const docsToggle = document.querySelector('[data-docs-toggle]');
docsToggle?.addEventListener('click', () => {
  const open = docsNav?.dataset.open !== 'true';
  if (docsNav) docsNav.dataset.open = String(open);
  docsToggle.setAttribute('aria-expanded', String(open));
});

const dialog = document.querySelector('[data-lightbox]');
const dialogImage = dialog?.querySelector('[data-lightbox-image]');
const dialogTitle = dialog?.querySelector('[data-lightbox-title]');
const dialogClose = dialog?.querySelector('[data-lightbox-close]');
let galleryReturnFocus = null;

document.querySelectorAll('[data-gallery-open]').forEach((button) => {
  button.addEventListener('click', () => {
    const image = button.querySelector('img');
    if (!dialog || !dialogImage || !image) return;
    galleryReturnFocus = button;
    dialogImage.src = image.currentSrc || image.src;
    dialogImage.alt = image.alt;
    if (dialogTitle) dialogTitle.textContent = button.dataset.galleryTitle || 'Hydrion screenshot';
    dialog.showModal();
    dialogClose?.focus();
  });
});

function closeLightbox() {
  if (!dialog?.open) return;
  dialog.close();
  galleryReturnFocus?.focus();
}

dialogClose?.addEventListener('click', closeLightbox);
dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) closeLightbox();
});
dialog?.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeLightbox();
});

document.querySelectorAll('[data-copy-checksum]').forEach((button) => {
  button.addEventListener('click', async () => {
    const value = button.dataset.copyChecksum || '';
    if (!value || !navigator.clipboard) return;
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = 'Checksum copied';
    } catch {
      button.textContent = 'Select the checksum below';
    }
    window.setTimeout(() => { button.textContent = original; }, 1800);
  });
});

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
