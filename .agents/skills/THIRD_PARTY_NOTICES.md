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
