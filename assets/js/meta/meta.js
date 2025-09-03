export function updateMeta(route) {
  const title = route?.meta?.title || '1807 — Portfolio';
  const desc  = route?.meta?.desc  || 'webaby portfolio';
  document.title = title;

  set('meta[name="description"]', 'content', desc);
  set('meta[property="og:title"]', 'content', title, true);
  set('meta[property="og:description"]', 'content', desc, true);
  set('meta[name="twitter:title"]', 'content', title, true);
  set('meta[name="twitter:description"]', 'content', desc, true);

  function set(sel, attr, val, create=false) {
    let el = document.querySelector(sel);
    if (!el && create) {
      el = document.createElement('meta');
      const [k,v] = sel.slice(5,-2).split('" ');
      const key = k.includes('property=') ? 'property' : 'name';
      el.setAttribute(key, v.replace(/.*="/,''));
      document.head.appendChild(el);
    }
    if (el) el.setAttribute(attr, val);
  }
}
