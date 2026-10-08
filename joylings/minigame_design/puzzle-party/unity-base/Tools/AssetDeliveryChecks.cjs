// Exercise corrupt/blocked/stalled downloads without executing any game bytes.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');
const code = fs.readFileSync(path.join(__dirname, '../Assets/WebGLTemplates/Rivals/asset-delivery.js'), 'utf8');
const bytes = new Uint8Array([1, 2, 3, 4]);
const assets = ['data', 'wasm'].map(type => ({ name: 'a'.repeat(32) + '.' + type + '.unityweb', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }));
const original = 'https://scozirge.github.io/a-thought/rivals/Build/' + assets[0].name;
let checks = 0;
const ok = label => { checks++; console.log('DELIVERY_CHECK ' + label); };
function setup({ cdn = async () => new Response(bytes), url = 'https://scozirge.github.io/a-thought/rivals/', manifest = { assets }, crypto = webcrypto } = {}) {
  const calls = [], location = new URL(url);
  const context = { URL, URLSearchParams, Headers, Response, ReadableStream, Uint8Array, AbortController, DOMException, performance, crypto, location,
    setTimeout: (callback, ms) => setTimeout(callback, ms === 8000 ? 25 : ms), clearTimeout,
    document: { baseURI: url, getElementById: () => ({ textContent: JSON.stringify(manifest) }) },
    fetch: async (input, options) => { const cdnRequest = String(input).includes('cdn.jsdelivr.net'); calls.push({ input, options, cdn: cdnRequest }); return cdnRequest ? cdn(input, options) : new Response('origin'); }
  };
  context.window = context; vm.runInNewContext(code, context);
  return { context, calls, fetch: context.fetch };
}
async function fallback(label, cdn) {
  const s = setup({ cdn }); assert.equal(await (await s.fetch(original)).text(), 'origin');
  assert.deepEqual(s.calls.map(c => c.cdn), [true, false]);
  assert.equal(s.context.rivalsAssetDelivery.transfers[0].source, 'origin'); ok(label);
}
(async () => {
  const s = setup(), progress = [];
  const response = await s.fetch(original, { onProgress: e => progress.push(e.loaded) });
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.equal(response.headers.get('Content-Length'), '4'); assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].options.credentials, 'omit'); assert.ok(progress.includes(4)); ok('verified bytes and visible progress');
  await fallback('wrong hash falls back', async () => new Response(new Uint8Array([4, 3, 2, 1])));
  await fallback('truncated body falls back', async () => new Response(bytes.slice(0, 2)));
  await fallback('oversized body falls back', async () => new Response(new Uint8Array(5)));
  await fallback('404 falls back', async () => new Response('', { status: 404 }));
  await fallback('partial response falls back', async () => new Response(bytes, { status: 206 }));
  await fallback('blocked CDN falls back', async () => { throw new TypeError('Failed to fetch'); });
  await fallback('no headers times out', (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
  await fallback('stalled body times out', async (_, { signal }) => new Response(new ReadableStream({ start(c) { c.enqueue(bytes.slice(0, 1)); signal.addEventListener('abort', () => c.error(new DOMException('Aborted', 'AbortError'))); } })));
  const aborted = setup({ cdn: (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))) });
  const controller = new AbortController(), request = aborted.fetch(original, { signal: controller.signal }); controller.abort();
  await assert.rejects(request, { name: 'AbortError' }); assert.equal(aborted.calls.length, 1); ok('caller abort does not start a fallback');
  for (const [label, options] of [
    ['explicit original source', { url: 'https://scozirge.github.io/a-thought/rivals/?asset-source=origin' }],
    ['self-hosted package', { url: 'http://localhost:8184/' }],
    ['missing build manifest', { manifest: { assets: [] } }],
    ['missing verification support', { crypto: {} }]
  ]) { const p = setup(options); assert.equal(await (await p.fetch(original)).text(), 'origin'); assert.equal(p.calls.length, 1); ok(label); }
  for (const options of [{ method: 'POST' }, { headers: { Range: 'bytes=0-2' } }]) {
    const p = setup(); await p.fetch(original, options); assert.equal(p.calls.length, 1); assert.equal(p.calls[0].cdn, false); assert.equal(p.calls[0].options, options);
  } ok('other methods and range requests retain native behavior');
  const unrelated = setup(); await unrelated.fetch('https://example.com/anything'); assert.equal(unrelated.calls[0].cdn, false); ok('unrelated traffic untouched');
  console.log('ASSET_DELIVERY_OK ' + checks);
})().catch(e => { console.error(e); process.exitCode = 1; });
