# Sources and licensing

Status: planning registry. No production ingestion is approved.

Before automating any source, record:
- official URL;
- access method;
- API vs HTML;
- authentication;
- rate limits;
- automation permission;
- caching permission;
- redistribution permission;
- attribution;
- terms/license;
- review date;
- project decision.

## Valve / Steam

Preferred for game identity/static data where permitted.

API keys are secrets and must never ship to the browser.

The frontend currently references Valve/Steamstatic hero portrait URLs rather than committing copied portrait binaries. Asset rights still require explicit production review.

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
