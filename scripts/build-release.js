const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  getReleaseLayout,
  getProductionBuildEnvironment,
  PROTECTED_RUNTIME_PATHS,
} = require('./release-layout');

const layout = getReleaseLayout(path.join(__dirname, '..'));
const expectedPublic = path.join(layout.projectRoot, 'backend', 'public');

if (layout.backendPublic !== expectedPublic) {
  throw new Error(`Target release tidak aman: ${layout.backendPublic}`);
}

const build = spawnSync('npm run build', {
  cwd: layout.frontendDirectory,
  env: getProductionBuildEnvironment(process.env),
  shell: true,
  stdio: 'inherit',
});

if (build.status !== 0) {
  process.exit(build.status || 1);
}

if (!fs.existsSync(path.join(layout.frontendDist, 'index.html'))) {
  throw new Error('Build frontend tidak menghasilkan dist/index.html');
}

fs.rmSync(layout.backendPublic, { recursive: true, force: true });
fs.mkdirSync(layout.backendPublic, { recursive: true });
fs.cpSync(layout.frontendDist, layout.backendPublic, { recursive: true });

console.log(`Release frontend siap di ${layout.backendPublic}`);
console.log(`Jangan timpa saat deploy: ${PROTECTED_RUNTIME_PATHS.join(', ')}`);
