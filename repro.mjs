/**
 * Repro: @astrojs/mdx imports `satteri` but does not declare it in package.json.
 *
 * pnpm often still resolves `satteri` via `node_modules/.pnpm/node_modules/satteri`.
 * That is accidental — `@astrojs/mdx` has no `satteri` symlink in its own
 * node_modules. When that walk-up link is absent (seen on some Vercel installs),
 * Node throws ERR_MODULE_NOT_FOUND.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { existsSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const mdxPkgJson = require.resolve('@astrojs/mdx/package.json');
const mdxPkg = dirname(mdxPkgJson);
const satteriEntry = join(mdxPkg, 'dist/satteri/index.js');
const pkg = require('@astrojs/mdx/package.json');

const mdxIsolatedNodeModules = dirname(mdxPkg); // .../node_modules/@astrojs -> parent is .../node_modules
const directLink = join(dirname(mdxPkg), 'satteri'); // .../node_modules/satteri next to @astrojs
const pnpmNodeModulesSatteri = join(root, 'node_modules/.pnpm/node_modules/satteri');

console.log('=== package metadata ===');
console.log('version:', pkg.version);
console.log('dependencies.satteri:', pkg.dependencies?.satteri ?? '(missing)');
console.log('peerDependencies:', pkg.peerDependencies);
console.log('peerDependenciesMeta:', pkg.peerDependenciesMeta);

console.log('\n=== resolution layout ===');
console.log('direct satteri next to @astrojs/mdx?', existsSync(directLink));
console.log('.pnpm/node_modules/satteri present?', existsSync(pnpmNodeModulesSatteri));

async function tryImport(label) {
  try {
    await import(`${pathToFileURL(satteriEntry).href}?t=${Date.now()}-${label}`);
    console.log(`[${label}] IMPORT OK`);
    return true;
  } catch (err) {
    console.log(`[${label}] IMPORT FAIL:`, err.code, err.message.split('\n')[0]);
    return false;
  }
}

console.log('\n=== with accidental .pnpm/node_modules link ===');
await tryImport('with-pnpm-node-modules-link');

if (!existsSync(pnpmNodeModulesSatteri)) {
  console.log('Cannot demonstrate failure: .pnpm/node_modules/satteri already missing');
  process.exit(1);
}

const backup = pnpmNodeModulesSatteri + '.bak-repro';
renameSync(pnpmNodeModulesSatteri, backup);
try {
  console.log('\n=== after removing .pnpm/node_modules/satteri (declared deps only) ===');
  const ok = await tryImport('without-pnpm-node-modules-link');
  if (ok) {
    console.log('Unexpected: still resolved without declared dependency / hoist link');
    process.exitCode = 1;
  } else {
    console.log('\nBug confirmed: import relies on undeclared resolution, not package.json deps.');
    process.exitCode = 0;
  }
} finally {
  renameSync(backup, pnpmNodeModulesSatteri);
}
