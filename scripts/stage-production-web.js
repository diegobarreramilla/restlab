// Copies the production build of the renderer (`npm run build:web`) into
// packages/bruno-electron/web and rewrites its paths for `file://`, the same way
// scripts/build-electron.js does, but without packaging the app. With it the benchmarks can
// measure the production renderer:
//
//   npm run build:web && node scripts/stage-production-web.js
//   ELECTRON_IS_DEV=0 npm run test:benchmark
//
// `web` is git-ignored. Delete it (or run the benchmarks without ELECTRON_IS_DEV=0) to go back
// to the development renderer served from http://localhost:3000.
const fs = require('fs-extra');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, 'packages', 'bruno-app', 'dist');
const destination = path.join(root, 'packages', 'bruno-electron', 'web');

async function main() {
  if (!(await fs.pathExists(source))) {
    throw new Error('packages/bruno-app/dist does not exist. Run `npm run build:web` first.');
  }

  await fs.remove(destination);
  await fs.copy(source, destination);

  for (const file of await fs.readdir(destination)) {
    if (file.endsWith('.html')) {
      const filePath = path.join(destination, file);
      const content = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(filePath, content.replace(/\/static/g, './static'));
    }
  }

  const cssDir = path.join(destination, 'static', 'css');
  for (const file of await fs.readdir(cssDir)) {
    if (file.endsWith('.css')) {
      const filePath = path.join(cssDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(filePath, content.replace(/\/static\/font/g, '../../static/font'));
    }
  }

  console.log(`Production renderer staged in ${path.relative(root, destination)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
