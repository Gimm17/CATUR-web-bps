const path = require('node:path');

const PROTECTED_RUNTIME_PATHS = Object.freeze([
  'backend/.env',
  'backend/credential.json',
  'backend/credentials.json',
  'backend/token.json',
  'backend/uploads',
]);

function getReleaseLayout(projectRoot) {
  const root = path.resolve(projectRoot);
  return {
    projectRoot: root,
    frontendDirectory: path.join(root, 'frontend'),
    frontendDist: path.join(root, 'frontend', 'dist'),
    backendPublic: path.join(root, 'backend', 'public'),
  };
}

module.exports = { getReleaseLayout, PROTECTED_RUNTIME_PATHS };
