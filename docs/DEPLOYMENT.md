# Deployment

DotaGraph is a Vite application deployed at:

https://chychyndr.github.io/DotaGraph/

## Deployment model

The repository contains a custom workflow at `.github/workflows/pages.yml`.

The workflow intentionally starts after the main `CI` workflow completes successfully. It checks out the exact SHA that passed CI, builds the Vite application with the `/DotaGraph/` base path, validates the generated `dist/` directory, deploys it with GitHub Pages, then checks the public site and its compiled JavaScript bundle.

This sequencing also prevents the old branch/Jekyll Pages build from becoming the final deployment while the repository is still configured with the legacy Pages source.

## Recommended GitHub Pages setting

The clean repository configuration is:

1. Open **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

After that change, GitHub stops starting the generated Jekyll **pages build and deployment** workflow. DotaGraph's own **Deploy GitHub Pages** workflow remains the only publisher.

## Why branch deployment is unsuitable

The repository root contains Vite source files. A branch-based GitHub Pages deployment publishes/Jekyll-builds the repository source rather than the compiled Vite application.

The source `index.html` legitimately contains:

```html
<script type="module" src="/src/main.tsx"></script>
```

Vite replaces that entry during a production build. A raw branch deployment does not, so a browser receives a TypeScript/TSX source entry and the page becomes blank.

## Automated safeguards

Normal CI verifies:

- TypeScript type checking;
- unit tests;
- production build;
- Impeccable design checks;
- Playwright browser tests;
- a dedicated GitHub Pages production build.

The deployment workflow additionally verifies:

- the exact tested commit is checked out;
- `dist/index.html` contains compiled hashed assets;
- no `/src/main.tsx` reference remains in the deployment artifact;
- no unresolved `%BASE_URL%` placeholder remains;
- all referenced JS/CSS files exist;
- the favicon is present;
- the public page eventually serves the compiled `/DotaGraph/assets/*.js` bundle.

The live verification retries for up to one minute to tolerate GitHub Pages propagation.

## Diagnosing Pages

A run named **CI** checks the project itself.

A run named **Deploy GitHub Pages** builds and publishes the tested application.

A generated run named **pages build and deployment** means the repository is still using the legacy branch Pages source. The custom workflow is sequenced after CI so that its compiled deployment wins, but **Source → GitHub Actions** is still the preferred permanent configuration.
