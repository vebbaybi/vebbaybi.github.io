export function updateMeta(route) {
  const meta = route?.meta || route || {};
  const title = meta.title || '1807 - Portfolio';
  const desc = meta.desc || meta.description || 'Webbaby portfolio';
  document.title = title;

  set('meta[name="description"]', 'content', desc);
  set('meta[property="og:title"]', 'content', title, true);
  set('meta[property="og:description"]', 'content', desc, true);
  set('meta[name="twitter:title"]', 'content', title, true);
  set('meta[name="twitter:description"]', 'content', desc, true);

  function set(sel, attr, val, create = false) {
    let el = document.querySelector(sel);
    if (!el && create) {
      el = document.createElement('meta');
      const isProperty = sel.includes('property=');
      const match = sel.match(/\[(?:name|property)="([^"]+)"\]/);
      el.setAttribute(isProperty ? 'property' : 'name', match?.[1] || '');
      document.head.appendChild(el);
    }
    if (el) el.setAttribute(attr, val);
  }
}
