// Browser bridge fixtures only: no browser game, Unity instance or Photon connection.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'unity/Assets/WebGLTemplates/Neon/index.html'), 'utf8');
const bridge = fs.readFileSync(path.join(root, 'unity/Assets/Plugins/WebGL/NeonWeb.jslib'), 'utf8');
const start = template.indexOf('const reportButton=');
const end = template.indexOf('// Touchscreen Windows', start);
assert(start > 0 && end > start);
const snippet = template.slice(start, end);
function fixture(blockStorage, saved = null, search = '') {
  const storage = new Map(saved ? [['neon.lastConnectionReport', JSON.stringify(saved)]] : []);
  const listeners = new Map();
  const button = {hidden: true, addEventListener: (name, handler) => listeners.set('button-' + name, handler)};
  const result = {downloads: [], blobs: [], warnings: []};
  const window = {
    addEventListener: (name, handler) => listeners.set(name, handler),
    dispatchEvent: event => listeners.get(event.type)?.()
  };
  const context = vm.createContext({
    window, location: {search}, navigator: {userAgent: 'DiagnosticFixture'},
    document: {
      getElementById: () => button,
      querySelector: () => ({content: 'fixture-build'}),
      body: {appendChild() {}},
      createElement() { return {click() { result.downloads.push(this.download); }, remove() {}}; }
    },
    localStorage: {
      getItem(key) { if (blockStorage) throw Error('Storage blocked'); return storage.get(key) || null; },
      setItem(key, value) { if (blockStorage) throw Error('Storage blocked'); storage.set(key, value); }
    },
    URL: {createObjectURL(blob) { result.blobs.push(blob); return 'blob:fixture'; }, revokeObjectURL() {}},
    URLSearchParams, Blob, Event, setTimeout() {},
    LibraryManager: {library: {}}, mergeInto(target, methods) { Object.assign(target, methods); },
    UTF8ToString: value => value,
    console: {warn(message) { result.warnings.push(message); }}
  });
  vm.runInContext(snippet, context);
  vm.runInContext(bridge, context);
  return {context, result, button, storage, click: () => listeners.get('button-click')()};
}
(async () => {
  const report = {id: 'ab123456', code: 'ARENA_ROSTER_TIMEOUT', events: [{stage: 'loading-battle'}]};
  for (const blocked of [false, true]) {
    const f = fixture(blocked);
    assert.equal(f.button.hidden, true, 'Download button leaked into normal play');
    f.context.LibraryManager.library.NeonWebConnectionReport(JSON.stringify(report));
    assert.equal(f.button.hidden, false, 'Failure did not expose download');
    assert.equal(f.context.window.neonLastConnectionReport.webBuild, 'fixture-build');
    f.click();
    assert.deepEqual(f.result.downloads, ['novarove-connection-ab123456.json']);
    assert.equal(JSON.parse(await f.result.blobs[0].text()).code, report.code);
    assert.equal(f.button.hidden, true);
    if (!blocked) assert.equal(JSON.parse(f.storage.get('neon.lastConnectionReport')).id, report.id);
    f.context.LibraryManager.library.NeonWebConnectionReport('{broken');
    assert.equal(f.result.warnings.length, 1, 'Malformed report should fail without breaking the page');
  }
  const reload = fixture(false, report, '?neonDiagnostics=1');
  assert.equal(reload.button.hidden, false, 'Saved report unavailable after refresh');
  reload.click();
  assert.equal(JSON.parse(await reload.result.blobs[0].text()).id, report.id);
  console.log('NEON_CONNECTION_REPORT_OK download; saved report recovery; blocked storage; malformed payload; hidden during normal play');
})().catch(error => { console.error(error); process.exitCode = 1; });
