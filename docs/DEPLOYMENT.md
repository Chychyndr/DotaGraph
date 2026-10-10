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
1. runs Python/uv pipeline code tests, temporarily skipping only the committed snapshot layout check so an older invalid snapshot cannot block its own regeneration;
2. queries the current-patch OpenDota scope in non-overlapping 12-hour chunks with bounded retries, honors provider retry hints up to 120 seconds, and uses timeout splitting;
3. writes `public/data/current-matchups.json`;
4. runs the complete pipeline test suite against the newly generated file, including snapshot layout quality, before publishing any branch;
5. uploads pipeline code-test, generation, and generated-data validation logs as a 14-day debug artifact;
6. publishes the JSON on an automation branch only when the generated snapshot changed;
7. opens a pull request, dispatches full CI for the generated branch's exact commit SHA, and waits for that revision to pass; merge refuses any changed pull-request head;
8. merges the validated pull request, explicitly dispatches `CI` on `main`, then dispatches Pages for the exact tested SHA and waits for live Chromium verification.

`DOTAGRAPH_SKIP_COMMITTED_SNAPSHOT_CHECK=1` is scoped to the pre-generation code-test step. It is absent from generated-data validation and normal CI. A failed new layout therefore stops the refresh before branch publication, preserving the last published bundle.

For a PR branch, dispatch this workflow on that branch with `validate_only=true`. It checks out the selected ref, runs the same generation and complete pipeline validation, then uploads the generated JSON and debug logs as artifacts. Every publication, merge, CI dispatch, and deployment step is skipped. Manual runs on a non-main ref without this flag fail before checkout. Scheduled runs and ordinary publishing runs continue to check out `main`.

The default branch requires pull requests, so scheduled refreshes never push generated data directly to `main`. Each refresh uses a short-lived automation branch and pull request, validates that exact branch with the normal `CI` workflow, merges only after CI succeeds, then explicitly dispatches `CI` on `main`. The explicit main dispatch is required because GitHub suppresses ordinary workflow chaining for events created with `GITHUB_TOKEN`. After exact-SHA main CI passes, the updater rechecks that its target is still current `main`, explicitly dispatches Pages, and waits for deployment and live-browser verification. If `main` moved during CI, the refresh stops before dispatching a stale target.

Pages does not automatically deploy the completion of a manually dispatched CI run. Those skipped `workflow_run` events use a unique concurrency group, so they cannot cancel an explicit Pages run for the same SHA before the job guard is evaluated. Ordinary successful push-to-main CI completions retain automatic Pages deployment, and direct manual Pages dispatch remains available.

## Deployment sequence

1. A commit reaches `main`.
2. The normal `CI` workflow runs type checking, unit tests, build checks, Impeccable, Playwright E2E tests, and a Pages-specific artifact verification.
3. `Deploy GitHub Pages` starts automatically after ordinary main CI succeeds, or the data updater dispatches it after validating the exact main SHA.
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
