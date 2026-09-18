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
