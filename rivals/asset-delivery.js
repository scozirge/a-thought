/* Keep Unity's original URLs/cache keys; accelerate only verified startup assets. */
(() => {
  'use strict';
  const source = new URLSearchParams(location.search).get('asset-source');
  const official = location.origin === 'https://scozirge.github.io' && location.pathname.startsWith('/a-thought/rivals/');
  if (source === 'origin' || (!official && source !== 'cdn')) return;
  if (!window.crypto?.subtle || !window.AbortController || !window.ReadableStream) return;
  let assets;
  try {
    assets = JSON.parse(document.getElementById('rivals-asset-manifest').textContent).assets;
    if (!Array.isArray(assets) || assets.length !== 2 || assets.some(a =>
      !/^[a-f0-9]{32}\.(data|wasm)\.unityweb$/.test(a.name) ||
      !/^[a-f0-9]{64}$/.test(a.sha256) || !Number.isSafeInteger(a.bytes) || a.bytes <= 0 || a.bytes > 134217728)) return;
  } catch { return; }
  const base = new URL('Build/', document.baseURI);
  const files = new Map(assets.map(a => [new URL(a.name, base).href, a]));
  const nativeFetch = window.fetch.bind(window);
  const delivery = window.rivalsAssetDelivery = { enabled: true, transfers: [] };
  const idleMs = 8000;

  window.fetch = async (input, options = {}) => {
    // Leave all other fetches, Request objects, methods and range requests intact.
    if (typeof input !== 'string' && !(input instanceof URL)) return nativeFetch(input, options);
    const asset = files.get(new URL(input, document.baseURI).href);
    if (!asset || (options.method || 'GET').toUpperCase() !== 'GET' || new Headers(options.headers).has('Range'))
      return nativeFetch(input, options);
    const signal = options.signal;
    if (signal?.aborted) return nativeFetch(input, options);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const started = performance.now();
    let timer, reader;
    const resetTimeout = () => { clearTimeout(timer); timer = setTimeout(abort, idleMs); };
    const record = (source, reason) => delivery.transfers.push({ name: asset.name, source, reason, ms: Math.round(performance.now() - started) });
    try {
      resetTimeout();
      const response = await nativeFetch('https://cdn.jsdelivr.net/gh/scozirge/a-thought@gh-pages/rivals/Build/' + asset.name,
        { method: 'GET', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
      if (response.status !== 200 || !response.body) throw new Error('CDN response unavailable');
      reader = response.body.getReader();
      const bytes = new Uint8Array(asset.bytes);
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (received + value.length > bytes.length) throw new Error('CDN size mismatch');
        bytes.set(value, received); received += value.length;
        resetTimeout();
        // Unity's fetch helper supplies this callback; preserve visible progress.
        if (typeof options.onProgress === 'function') options.onProgress({ type: 'progress', lengthComputable: true, total: asset.bytes, loaded: received });
      }
      clearTimeout(timer);
      if (received !== asset.bytes) throw new Error('CDN size mismatch');
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== asset.sha256) throw new Error('CDN hash mismatch');
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      record('cdn');
      // Unity stores this under the ORIGINAL input URL, keeping prior caches valid.
      return new Response(bytes, { status: 200, headers: { 'Content-Length': String(asset.bytes), 'Content-Type': 'application/vnd.unity' } });
    } catch (error) {
      controller.abort();
      if (reader) await reader.cancel().catch(() => {});
      if (signal?.aborted) throw error;
      record('origin', error.message);
      return nativeFetch(input, options);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  };
})();
