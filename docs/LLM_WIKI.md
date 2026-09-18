# llm-wiki for DotaGraph

DotaGraph uses [nvk/llm-wiki](https://github.com/nvk/llm-wiki) as optional cross-session operational memory for Codex.

The goal is narrow: long Codex threads should leave compact redacted session digests, and a new thread should receive only a small resume context instead of re-reading the whole repository or old chat.

## Architecture

- The full `wiki@llm-wiki` Codex plugin is installed at **user scope**. Current Codex plugin enablement does not support project scope.
- DotaGraph vendors only the small read-only `wiki-query` skill under `.agents/skills/wiki-query/`.
- Automated session memory lives outside the repository in the llm-wiki HUB, normally `~/wiki/.sessions/`.
- DotaGraph code, tests, ADRs, issues, and living docs remain canonical project truth.
- Session digests are operational context. They should not silently become project documentation.
- Setup seeds one historical bootstrap digest distilled from the pre-llm-wiki DotaGraph chat. It is written only once; newer real sessions naturally supersede it.

## One-time setup

### Windows 11 / PowerShell

From the DotaGraph repository:

```powershell
pwsh -File .\scripts\setup-llm-wiki.ps1
```

To intentionally replace an existing llm-wiki session profile with the DotaGraph profile:

```powershell
pwsh -File .\scripts\setup-llm-wiki.ps1 -ForceSessionConfig
```

### macOS / Linux

```bash
bash ./scripts/setup-llm-wiki.sh
```

To replace an existing session profile:

```bash
bash ./scripts/setup-llm-wiki.sh --force-session-config
```

Both scripts preserve an existing HUB path. If there is no llm-wiki configuration yet, they use the portable default `~/wiki`. They also seed the one-time historical DotaGraph digest from `config/llm-wiki-dotagraph-bootstrap.md` so the first new thread does not start cold.

The upstream Codex hooks invoke `python3`; make sure that command exists. On macOS with Homebrew:

```bash
brew install python
```

## Required Codex step

Plugin hooks require explicit trust.

After setup:

1. Restart Codex.
2. Open `/hooks`.
3. Review and trust the llm-wiki hooks.

Without hook trust, `@wiki` and `$wiki-query` still work, but automatic session capture/rehydration does not.

## DotaGraph session profile

The repository profile is in `config/llm-wiki-session.json`.

It uses:

- mode: `balanced`;
- checkpoint every 50 observed tool events;
- checkpoint before and after context compaction;
- checkpoint on stop/session end;
- raw transcript storage disabled;
- privacy mode `redacted`;
- automatic rehydration on `SessionStart`;
- repeated rehydration on every user prompt disabled.

The last item is deliberate for DotaGraph: one compact resume block at the beginning of a new Codex thread saves tokens compared with injecting the same session context on every prompt.

## Normal workflow

Work in Codex normally.

For a new thread in the same DotaGraph checkout, trusted hooks should supply the recent distilled session context automatically. On the first run after installation, the historical bootstrap digest provides the minimal context from the old DotaGraph chat; after real sessions are captured, the newer digests are selected first.

For a small targeted lookup, use:

```text
$wiki-query "What did we decide about the graph renderer?"
```

For full wiki/session operations, use `@wiki`, for example:

```text
@wiki session status
@wiki resume the previous DotaGraph work
@wiki show the latest DotaGraph session context
```

Use the smallest query path that answers the question. Avoid loading full session digests or broad repository history when a targeted lookup is enough.

## GitHub and session privacy

Do **not** commit the live llm-wiki HUB or all session files to the public DotaGraph repository.

Even with `raw_transcripts: false`, session state/digests can contain:

- local filesystem paths;
- branch names and repository metadata;
- summaries of private working context;
- user corrections/preferences;
- pointers to local transcript files;
- open work that was never intended to be public.

The project therefore ignores `.wiki/` if someone experiments with project-local mode, while the recommended HUB stays outside the repository.

### Can sessions be synchronized through GitHub?

Technically yes, but use a **separate private repository** if you want Git-based synchronization between machines. Do not use the public DotaGraph repository.

A safer model is:

1. keep `raw_transcripts` disabled;
2. use redacted session digests;
3. put the llm-wiki HUB in a private repository or private synchronized directory;
4. review sensitive content before the first push;
5. never publish the HUB as part of DotaGraph.

Automatic rehydration currently matches session history by exact working-directory path. Windows and macOS checkouts normally have different paths, so cross-machine continuation may require an explicit session/wiki lookup even when the HUB itself is synchronized.
