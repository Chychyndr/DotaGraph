# Deployment

DotaGraph is a Vite application deployed at:

https://chychyndr.github.io/DotaGraph/

## GitHub Pages configuration

The repository should use:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

The custom workflow is `.github/workflows/pages.yml`.

## Twice-daily data refresh

`.github/workflows/update-current-data.yml` targets a 12-hour cadence at 03:17 and 15:17 UTC and can also be started manually. GitHub's scheduler is best-effort, so an individual run may begin a little later than the cron time.

It:
1. runs all Python/uv pipeline tests;
2. queries the current-patch OpenDota scope with bounded retries, honors provider retry hints up to 120 seconds, and uses timeout splitting;
3. writes `public/data/current-matchups.json`;
4. uploads pipeline test/generation logs as a 14-day debug artifact;
5. publishes the JSON on an automation branch only when the generated snapshot changed;
6. opens a pull request, dispatches full CI for that branch, and waits for it to pass;
7. merges the validated pull request and explicitly dispatches `CI` on `main` so Pages deployment still runs even though the merge was performed with `GITHUB_TOKEN`.

The default branch requires pull requests, so scheduled refreshes never push generated data directly to `main`. Each refresh uses a short-lived automation branch and pull request, validates that exact branch with the normal `CI` workflow, merges only after CI succeeds, then explicitly dispatches `CI` on `main`. The explicit main dispatch is required because GitHub suppresses ordinary workflow chaining for events created with `GITHUB_TOKEN`. A successful main CI run then triggers the Pages workflow below through `workflow_run`, keeping automated refreshes behind the same validation and live-browser deployment gates as ordinary code changes.

## Deployment sequence

1. A commit reaches `main`.
2. The normal `CI` workflow runs type checking, unit tests, build checks, Impeccable, Playwright E2E tests, and a Pages-specific artifact verification.
3. `Deploy GitHub Pages` starts only after that main CI run succeeds.
4. The workflow checks out the exact tested SHA.
5. Vite builds with `base=/DotaGraph/`.
6. The compiled artifact is tagged with the exact Git commit SHA.
7. The artifact is validated and deployed.
8. A fresh Chromium browser opens the public canonical URL.
9. Deployment verification waits until the page renders DotaGraph and exposes the exact expected build SHA.

## Why the build marker matters

A successful HTTP request is insufficient for a single-page application.

A CDN can temporarily serve an older HTML document, and a JavaScript file can return HTTP 200 while still failing at runtime.

DotaGraph writes the deployment SHA to:

`document.documentElement.dataset.dotagraphBuild`

The post-deployment browser test compares that value with the exact SHA that passed CI. It also fails on:

- a blank `#root`;
- a missing visible DotaGraph heading;
- uncaught JavaScript errors;
- browser console errors;
- failed same-origin requests;
- stale deployment content.

The browser check retries for up to one minute because GitHub Pages/CDN propagation is not always instantaneous.

## Blank page diagnosis

The source repository `index.html` contains the Vite development entry:

```html
<script type="module" src="/src/main.tsx"></script>
```

A correct production deployment never serves that source entry. Vite replaces it with hashed files under:

`/DotaGraph/assets/`

If a browser still shows an older blank page immediately after a successful deployment, use a hard refresh. GitHub Pages and the browser may still have the previously published HTML cached for a short period.

On Windows browsers:

- **Firefox:** `Ctrl+Shift+R`
- **Chrome/Edge:** `Ctrl+Shift+R`

You can also test a cache-busting URL such as:

`https://chychyndr.github.io/DotaGraph/?refresh=1`

If the cache-busting URL works while the bare URL does not, the deployed application itself is healthy and the remaining issue is cached HTML.
