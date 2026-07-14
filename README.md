# Repro: `@astrojs/mdx` imports `satteri` without declaring it

Minimal **Astro + MDX** project that fails `astro build` under pnpm isolation when the accidental `.pnpm/node_modules/satteri` link is missing.

## Bug

[`@astrojs/mdx`](https://github.com/withastro/astro/tree/main/packages/integrations/mdx) statically imports `satteri` from `src/satteri/*`, but `satteri` is **not** listed in `dependencies` (it used to live only in `devDependencies` / via optional peer `@astrojs/markdown-satteri`).

Under **pnpm** isolation there is **no** `satteri` symlink next to `@astrojs/mdx`. Resolution often still works by walking up to `node_modules/.pnpm/node_modules/satteri`. When that link is missing, a normal Astro build fails while compiling MDX:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'satteri' imported from
.../node_modules/@astrojs/mdx/dist/satteri/index.js
```

## Project layout

- `astro.config.mjs` — `integrations: [mdx()]`
- `src/pages/post.mdx` — MDX page so the Sätteri MDX pipeline loads during `astro build`

## Run

```bash
pnpm install
pnpm repro
```

`pnpm repro` will:

1. Run `astro build` with the accidental `.pnpm/node_modules/satteri` link (usually succeeds)
2. Temporarily remove that link
3. Run `astro build` again — expected failure: `Cannot find package 'satteri'`

You can also run the second step manually:

```bash
pnpm build
mv node_modules/.pnpm/node_modules/satteri /tmp/satteri.bak
pnpm build   # fails with ERR_MODULE_NOT_FOUND for satteri
mv /tmp/satteri.bak node_modules/.pnpm/node_modules/satteri
```

## Expected fix

Add `satteri` to `@astrojs/mdx` `dependencies` so pnpm links it into `@astrojs/mdx`'s isolated `node_modules`.
