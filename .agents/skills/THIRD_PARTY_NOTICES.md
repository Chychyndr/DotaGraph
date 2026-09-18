# Third-party skill notices

The files under .agents/skills are vendored development-agent skills and are not part of the DotaGraph product runtime.

## JuliusBrussee/skills

Source: https://github.com/JuliusBrussee/skills

Vendored skills:
- caveman
- context-canary
- deslopify
- grill-me
- interface-kit
- junior-to-senior
- last-20-percent
- loop-factory

License: MIT.
See _licenses/JuliusBrussee-skills-LICENSE.txt.

## blader/humanizer

Source: https://github.com/blader/humanizer

Vendored skill:
- humanizer

License: MIT.
See _licenses/blader-humanizer-LICENSE.txt.

## Impeccable

Source: https://github.com/CoeusInstitute/impeccable-ui-skill

Impeccable is referenced by AGENTS.md but is not vendored here. Its current upstream distribution contains a large CLI/runtime bundle (dozens of reference/runtime files), so copying a partial skill would be broken and vendoring the whole runtime would be unnecessary duplication. Use its supported package/CLI workflow, such as the detector described in AGENTS.md.

## nvk/llm-wiki

Source: https://github.com/nvk/llm-wiki

Vendored component:
- wiki-query (query-lite read-only skill)

The full Codex plugin and its session hooks are installed through the upstream Codex marketplace rather than vendored into this repository. Current Codex plugin enablement is user-scoped.

Vendored query profile source snapshot: upstream commit 1224fbcdf3827f4ba56d225a9e359f5e8a5594e5.

License: MIT.
See _licenses/nvk-llm-wiki-LICENSE.txt.
