# Repro: `@astrojs/mdx` imports `satteri` without declaring it

## Bug

[`@astrojs/mdx`](https://github.com/withastro/astro/tree/main/packages/integrations/mdx) statically imports `satteri` from `src/satteri/*`, but `satteri` is **not** listed in `dependencies` or `peerDependencies`. Only optional peer `@astrojs/markdown-satteri` is declared (and that package depends on `satteri`).

Under **pnpm** isolation there is **no** `satteri` symlink next to `@astrojs/mdx`. Resolution often still works via an accidental walk-up to `node_modules/.pnpm/node_modules/satteri`. When that link is missing (observed on some Vercel/pnpm installs), Node throws:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'satteri' imported from
.../node_modules/@astrojs/mdx/dist/satteri/index.js
```

npm/yarn often hide this via hoisting.

## Run

```bash
pnpm install
pnpm repro
```

`pnpm repro` first imports successfully (with the `.pnpm/node_modules` link), then temporarily removes `node_modules/.pnpm/node_modules/satteri` and shows `ERR_MODULE_NOT_FOUND` — proving the import depends on undeclared resolution, not package metadata.

## Expected fix

Add `satteri` to `@astrojs/mdx` `dependencies` (matching the static imports), or make it a required peer.
