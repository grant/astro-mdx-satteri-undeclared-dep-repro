# Repro: `@astrojs/mdx` imports `satteri` without declaring it

## Bug

[`@astrojs/mdx`](https://github.com/withastro/astro/tree/main/packages/integrations/mdx) has runtime imports of `satteri` in `src/satteri/*`, but `satteri` is **not** listed in `dependencies` / `peerDependencies`. Only optional peer `@astrojs/markdown-satteri` is declared (which itself depends on `satteri`).

Under **pnpm**'s isolated `node_modules`, Node resolves bare `satteri` from inside `@astrojs/mdx`, so builds can fail with:

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

If `satteri` is not linked beside `@astrojs/mdx`, the import fails.

## Expected

`satteri` should be a direct `dependency` of `@astrojs/mdx` (or a required peer), matching the static imports.
