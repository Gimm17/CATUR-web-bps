const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  getReleaseLayout,
  getProductionBuildEnvironment,
  PROTECTED_RUNTIME_PATHS,
} = require('./release-layout');

test('release frontend hanya disinkronkan ke backend/public di dalam project', () => {
  const root = path.resolve('C:/workspace/CATUR');
  const layout = getReleaseLayout(root);

  assert.equal(layout.frontendDirectory, path.join(root, 'frontend'));
  assert.equal(layout.frontendDist, path.join(root, 'frontend', 'dist'));
  assert.equal(layout.backendPublic, path.join(root, 'backend', 'public'));
  assert.ok(layout.backendPublic.startsWith(`${root}${path.sep}`));
});

test('manifest proteksi mencakup seluruh data runtime production', () => {
  assert.deepEqual(PROTECTED_RUNTIME_PATHS, [
    'backend/.env',
    'backend/credential.json',
    'backend/credentials.json',
    'backend/token.json',
    'backend/uploads',
  ]);
});

test('build production selalu memakai API same-origin meskipun environment lokal menunjuk localhost', () => {
  const environment = getProductionBuildEnvironment({
    PATH: 'test-path',
    VITE_API_BASE_URL: 'http://127.0.0.1:3000/api',
    VITE_LEGACY_FILE_BASE_URL: 'http://127.0.0.1:3000',
  });

  assert.equal(environment.PATH, 'test-path');
  assert.equal(environment.VITE_API_BASE_URL, '/api');
  assert.equal(environment.VITE_LEGACY_FILE_BASE_URL, '');
});
