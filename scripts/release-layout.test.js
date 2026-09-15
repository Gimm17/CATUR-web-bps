const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { getReleaseLayout, PROTECTED_RUNTIME_PATHS } = require('./release-layout');

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
