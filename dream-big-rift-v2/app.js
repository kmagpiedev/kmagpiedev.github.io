(async () => {
  const VERSION = '20260823-korean-light-3';
  const files = ['app.1.txt', 'app.2.txt', 'runtime.03.txt', 'runtime.04.txt', 'runtime.05.txt', 'runtime.06.txt', 'runtime.07.txt', 'runtime.08.txt', 'runtime.09.txt', 'runtime.10.txt', 'runtime.11.txt', 'runtime.12.txt'];
  const parts = await Promise.all(files.map(async (file) => {
    const response = await fetch(`./${file}?v=${VERSION}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${file} ${response.status}`);
    return response.text();
  }));
  const source = parts.join('');
  if (source.length !== 37729) throw new Error(`Runtime length mismatch: ${source.length}`);
  (0, eval)(source);
})().catch((error) => {
  console.error('[RIFT: KNOT OF LIGHT]', error);
  document.documentElement.dataset.runtimeError = 'true';
});
