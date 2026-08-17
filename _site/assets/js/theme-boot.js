(() => {
  try {
    const mode = localStorage.getItem('the1807.theme') || 'system';
    if (mode === 'light' || mode === 'dark') document.documentElement.dataset.theme = mode;
    const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0A1118' : '#F2F7FA');
  } catch {}
})();
