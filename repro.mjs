/**
 * Reproduce ERR_MODULE_NOT_FOUND for bare `satteri` during a real `astro build`.
 *
 * Background: `@astrojs/mdx` statically imports `satteri` but does not declare it
 * as a dependency. Under pnpm isolation there is no `satteri` next to `@astrojs/mdx`.
 * Resolution often still works via an accidental walk-up to
 * `node_modules/.pnpm/node_modules/satteri`. When that link is absent (seen on some
 * CI/Vercel installs), `astro build` fails while compiling MDX.
 *
 * This script:
 * 1. Runs `astro build` with the accidental link present (usually succeeds)
 * 2. Removes `node_modules/.pnpm/node_modules/satteri`
 * 3. Runs `astro build` again — expected: ERR_MODULE_NOT_FOUND for `satteri`
 */
import { spawnSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const mdxPkg = dirname(require.resolve('@astrojs/mdx/package.json'));
const pkg = require('@astrojs/mdx/package.json');
const directLink = join(dirname(mdxPkg), 'satteri');
const pnpmNodeModulesSatteri = join(root, 'node_modules/.pnpm/node_modules/satteri');

console.log('=== @astrojs/mdx package metadata ===');
console.log('version:', pkg.version);
console.log('dependencies.satteri:', pkg.dependencies?.satteri ?? '(missing)');
console.log('peerDependencies:', pkg.peerDependencies);
console.log('satteri symlink next to @astrojs/mdx?', existsSync(directLink));
console.log('.pnpm/node_modules/satteri present?', existsSync(pnpmNodeModulesSatteri));

function runAstroBuild(label) {
	console.log(`\n=== astro build (${label}) ===`);
	const result = spawnSync('pnpm', ['exec', 'astro', 'build'], {
		cwd: root,
		encoding: 'utf8',
		env: process.env,
	});
	const out = `${result.stdout ?? ''}${result.stderr ?? ''}`;
	process.stdout.write(out);
	return { code: result.status ?? 1, out };
}

const withLink = runAstroBuild('with .pnpm/node_modules/satteri');
if (withLink.code !== 0) {
	console.error('\nUnexpected: baseline astro build failed before removing the link.');
	process.exit(1);
}

if (!existsSync(pnpmNodeModulesSatteri)) {
	console.error('\nCannot demonstrate failure: .pnpm/node_modules/satteri is already missing.');
	process.exit(1);
}

const backup = `${pnpmNodeModulesSatteri}.bak-repro`;
renameSync(pnpmNodeModulesSatteri, backup);
try {
	const withoutLink = runAstroBuild('without .pnpm/node_modules/satteri');
	const failedOnSatteri =
		withoutLink.code !== 0 &&
		/Cannot find package ['"]satteri['"]/.test(withoutLink.out);

	if (failedOnSatteri) {
		console.log('\nBug confirmed: `astro build` fails resolving undeclared `satteri`.');
		process.exit(0);
	}

	console.error('\nUnexpected: build did not fail with ERR_MODULE_NOT_FOUND for satteri.');
	process.exit(1);
} finally {
	renameSync(backup, pnpmNodeModulesSatteri);
}
