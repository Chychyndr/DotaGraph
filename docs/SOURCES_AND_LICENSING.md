# Sources and licensing

Status: reviewed source/legal registry. No production statistical ingestion has started.

Last full review: 2026-09-18.

This document records a conservative engineering decision from publicly available source terms and documentation. It is not legal advice. When terms are ambiguous, DotaGraph treats the capability as blocked until the provider publishes clearer terms or gives written permission.

## Decision vocabulary

- **Approved** — current public terms/documentation are sufficiently clear for the exact listed use.
- **Conditional** — API/access is permitted, but a specific unresolved right or technical scope prevents production use.
- **Research only** — manual comparison/reference is allowed; no automated ingestion into DotaGraph.
- **Blocked** — current terms prohibit the intended automation/use, or required permission is absent.

Before automating any source, record and re-check:
- official URL;
- access method;
- API vs HTML;
- authentication;
- rate limits;
- automation permission;
- caching permission;
- redistribution/derived-data permission;
- attribution;
- terms/license;
- review date;
- project decision.

A public API, an open-source client/server implementation, and publicly visible website data are three different things. Permission for one does not automatically grant permission for the others.

## Valve / Steam

**Decision: Conditional for API data; Valve-owned artwork remains blocked pending clearer asset permission.**

Official references:
- Steam Web API documentation: https://steamcommunity.com/dev
- Steam Web API Terms of Use: https://steamcommunity.com/dev/apiterms
- Valve legal/trademark notice: https://store.steampowered.com/legal

Access:
- official Steam Web API;
- API key required for keyed endpoints;
- API keys are secrets and must never ship to the browser.

Documented limit:
- 100,000 Steam Web API calls per day under the current published API Terms of Use.

Automation:
- permitted through the documented Steam Web API subject to its Terms of Use;
- do not scrape Steam Community/Store pages as a substitute for an API endpoint.

Storage and redistribution:
- the API Terms permit implementing the API in an application and presenting Steam Data to end users, subject to the Terms;
- nonpublic end-user Steam Data has privacy/storage obligations and is outside DotaGraph's planned statistical pipeline;
- DotaGraph must not bulk republish raw Steam Data or imply Valve/Steam endorsement;
- any production adapter should retain only the minimum public facts needed to generate aggregate statistics.

Important product-specific restriction:
- the API Terms prohibit using the API/Steam Data to create technology or functionality that may give a user an unfair competitive advantage in multiplayer games;
- because DotaGraph is intended to be useful during a draft, direct Steam Web API use for draft-time recommendations is **not approved** until this clause is reviewed against the exact production behavior or Valve provides clarification.

Hero artwork:
- the current build downloads Valve/Steamstatic hero portraits and packages them into one local WebP atlas;
- Valve's legal page identifies Dota/Dota 2 marks and Valve-owned material as protected; no public page reviewed here grants a general right to repackage and redistribute hero portrait artwork;
- keep the existing asset provenance explicit, but do not treat Steam Web API permission as an artwork license;
- before a production/legal hardening pass, either obtain/identify an applicable Valve asset-use policy/permission or replace the portraits with assets whose redistribution terms are explicit.

Review date: 2026-09-18.

## OpenDota hosted API

**Decision: Conditional. Approved for technical evaluation/API access; production redistribution of derived matchup statistics remains blocked until hosted-data rights are explicit or confirmed.**

Official references:
- API/OpenAPI document: https://api.opendota.com/api
- project/API implementation: https://github.com/odota/core
- project FAQ/background: https://blog.opendota.com/2014/08/01/faq/
- API usage-change background: https://blog.opendota.com/2018/04/17/changes-to-the-api/

Access:
- public HTTPS API;
- API key is optional for basic access and increases available limits;
- production keys, if used, belong in secrets and never in the frontend bundle.

Automation:
- OpenDota explicitly provides an API for developers and documents programmatic use;
- use the API only; do not scrape OpenDota HTML pages.

License boundary:
- `odota/core` is MIT-licensed software;
- that MIT license covers the API implementation code, not automatically the contents returned by the hosted OpenDota service;
- the reviewed public API/FAQ material clearly encourages developers to build applications with the API, but a separate explicit license for caching and redistributing the hosted statistical dataset/derived aggregates was not found.

DotaGraph decision:
- API experiments and schema evaluation are allowed;
- do not publish OpenDota-derived production headline statistics until redistribution/derived-data permission is confirmed by an explicit current policy/license or written provider permission;
- do not store or republish player-identifying data; DotaGraph only needs aggregate hero-vs-hero observations.

Scope limitation:
- the documented `GET /heroes/{hero_id}/matchups` endpoint returns games played and wins against other heroes, but its current OpenAPI definition exposes no rank-scope parameter;
- therefore that endpoint alone does not satisfy DotaGraph's Ancient+ headline scope;
- any future OpenDota adapter must prove how it obtains the approved rank population before it can be used for headline data.

Review date: 2026-09-18.

## STRATZ GraphQL API

**Decision: Conditional. API evaluation is allowed; production caching/redistribution remains blocked until STRATZ's rights for the intended derived-data publication are explicit or confirmed.**

Official references:
- STRATZ API overview: https://stratz.com/
- GraphQL endpoint/explorer: https://api.stratz.com/graphql
- API token guidance: https://github.com/STRATZ-Esports/knowledge-base/issues/37
- published rate-limit guidance: https://github.com/STRATZ-Esports/knowledge-base/issues/15

Access:
- official GraphQL API;
- bearer token required;
- tokens are secrets and must remain in pipeline/server-side configuration, never in the static frontend.

Automation:
- STRATZ publicly offers the API for third-party/community applications;
- use GraphQL rather than scraping the STRATZ website.

Published limits:
- the STRATZ Knowledge Base documents separate limits for Default, Individual, and Multi-Tokens;
- the published Default/Individual guidance includes per-second, per-minute, per-hour, and per-day quotas;
- those Knowledge Base entries predate this review by several years, so an adapter must treat the live token dashboard/API responses as authoritative and must implement bounded retries/backoff.

Caching and redistribution:
- reviewed official pages establish that third-party API access is supported;
- no current public license/terms page was found that clearly grants DotaGraph the right to persist, aggregate, and redistribute STRATZ-hosted data as a separately published matchup dataset;
- STRATZ also exposes proprietary/custom metrics, which must never be assumed reusable merely because the API exposes them.

DotaGraph decision:
- schema/query prototyping is allowed;
- production ingestion and publication remain blocked until the intended caching/derived-statistics use is confirmed by explicit terms or written STRATZ permission;
- if approved later, store only the observations needed for DotaGraph methodology and retain STRATZ provenance; do not copy proprietary presentation text or metrics unless separately allowed.

Review date: 2026-09-18.

## DOTABUFF

**Decision: Research only. Automated ingestion is blocked unless Elo Entertainment gives explicit permission or publishes an applicable API/data license.**

Official references:
- about/data description: https://www.dotabuff.com/pages/about
- privacy policy: https://www.dotabuff.com/pages/privacy
- support/FAQ: https://www.dotabuff.com/pages/faq
- copyright/fair-use page: https://www.dotabuff.com/pages/copyright

Access:
- public website intended for human browsing;
- no public production API or data-export license suitable for DotaGraph was found during this review.

Automation:
- do not scrape DOTABUFF HTML;
- do not reverse-engineer private/internal endpoints;
- do not use browser automation to bypass the absence of an approved API.

Caching and redistribution:
- no reviewed public terms grant DotaGraph permission to copy and republish DOTABUFF's derived statistical dataset;
- visual availability of a statistic is not permission to ingest it.

DotaGraph decision:
- use DOTABUFF only for manual product/methodology comparison and sanity checks;
- never copy DOTABUFF numbers into the production bundle;
- if DOTABUFF is desired as a formal source later, request written permission through its published support channel before building an adapter.

Review date: 2026-09-18.

## Dota2ProTracker

**Decision: Blocked for data ingestion. UX observation only.**

Official references:
- Terms of Service: https://dota2protracker.com/terms-of-service
- contact: https://dota2protracker.com/contact

Current terms explicitly restrict the site to personal, non-commercial browsing and prohibit:
- bots, scrapers, crawlers, and similar automated extraction;
- copying, reproducing, republishing, distributing, or creating derivative works from its data;
- using its data to build or improve a database, application, analytics system, or machine-learning model;
- using its data to support a competing service;
- bypassing technical restrictions or rate limits.

DotaGraph decision:
- no scraping, browser automation, API reverse-engineering, dataset copying, or derived statistical ingestion;
- do not copy D2PT matchup/build numbers into DotaGraph;
- UX/navigation ideas may be observed manually without reproducing protected content or data;
- this source can only become a data provider if D2PT gives explicit written permission that covers DotaGraph's intended use.

Review date: 2026-09-18.

## Reddit/community

Qualitative evidence only.

Community discussion can inform explanation hypotheses, but never the headline numerical percentage. Preserve links and verify claims before publication.

## Project licensing

DotaGraph code is MIT.

That license does not automatically cover Valve art/trademarks, third-party screenshots, third-party data, source text, or vendored agent skills.


## OpenDota dotaconstants

**Decision: Approved for static identity/constants metadata under its MIT license.**

Official references:
- repository: https://github.com/odota/dotaconstants
- license: https://github.com/odota/dotaconstants/blob/master/LICENSE

Use:
- hero IDs, canonical/internal names, display names, and other static constants needed to interpret Dota data;
- current DotaGraph roster/identity generation may continue to use it.

License:
- repository is MIT licensed;
- preserve the upstream copyright/license notice when redistributing substantial portions or vendored/generated material derived from the repository.

Boundary:
- this approval applies only to the MIT-licensed repository contents;
- it does not grant rights to OpenDota hosted statistics, Valve artwork, or third-party data linked from constants.

Review date: 2026-09-18.
