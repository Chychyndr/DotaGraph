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

Preferred for game identity/static data where permitted.

API keys are secrets and must never ship to the browser.

The build pipeline currently downloads Valve/Steamstatic hero portraits, crops them to small square thumbnails, and packages them into one optimized WebP atlas served from the DotaGraph origin. The generated atlas is not committed to source control. Asset rights still require explicit production review.

## OpenDota

Strong candidate for statistical infrastructure.

Open-source code licensing does not automatically settle hosted API/data redistribution rights. Review API/data terms separately before use.

## STRATZ

Strong API candidate.

Review current GraphQL/API terms, quotas, redistribution rules, and secret-token handling before integration.

## DOTABUFF

Useful manual research/validation reference.

Do not implement automated scraping until explicit current terms/permission allow the intended use.

## Dota2ProTracker

Do not scrape or ingest the website under the current project decision.

Use only as a permitted manual/UX research reference unless terms/permission change.

## Reddit/community

Qualitative evidence only.

Community discussion can inform explanation hypotheses, but never the headline numerical percentage. Preserve links and verify claims before publication.

## Project licensing

DotaGraph code is MIT.

That license does not automatically cover Valve art/trademarks, third-party screenshots, third-party data, source text, or vendored agent skills.


### OpenDota dotaconstants

Used as the current roster/hero-identity reference for hero names and internal portrait slugs.

Upstream:
https://github.com/odota/dotaconstants

Repository license: MIT.

This use is limited to hero identity metadata. It does not make OpenDota matchup statistics a production source, and it does not change the separate API/data-terms review required before statistical ingestion.
