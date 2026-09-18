# Deployment

DotaGraph is a Vite application deployed at:

https://chychyndr.github.io/DotaGraph/

## Required GitHub Pages setting

The repository must use a custom GitHub Actions publishing source.

In GitHub:

1. Open **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

Do not use **Deploy from a branch** for this repository.

## Why

The repository root contains Vite source files. A branch-based GitHub Pages deployment runs the legacy Jekyll Pages workflow and publishes the repository source directly.

That produces an `index.html` containing:

```html
<script type="module" src="/src/main.tsx"></script>
```

Browsers cannot execute the TypeScript/TSX source entry directly, so the public page appears blank.

The custom `.github/workflows/pages.yml` workflow builds the project first and uploads only `dist/`, where Vite has generated hashed JavaScript and CSS assets using the `/DotaGraph/` base path.

## Deployment safeguards

The Pages workflow now:

- checks that Pages is configured for the `workflow` build type;
- runs type checking and unit tests;
- builds with the GitHub Pages base path;
- verifies the generated artifact does not contain source-only paths or unresolved Vite placeholders;
- deploys only `dist/`;
- waits briefly and smoke-tests the public site after deployment.

CI also builds and verifies the Pages-specific production artifact on pull requests.

## Diagnosing a blank page

A blank white page combined with a successful legacy **pages build and deployment** run usually means GitHub Pages is still set to **Deploy from a branch**.

The intended deployment run is named **Deploy GitHub Pages**.

If both workflows appear for the same commit, the Pages publishing source is configured incorrectly.
