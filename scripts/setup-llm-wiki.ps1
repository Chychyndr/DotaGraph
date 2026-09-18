#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$HubPath = "",
    [switch]$ForceSessionConfig
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    throw "Codex CLI was not found in PATH."
}
if (-not (Get-Command python3 -ErrorAction SilentlyContinue)) {
    throw "llm-wiki Codex hooks invoke 'python3'. Install Python 3 and make sure python3 is available in PATH."
}

$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Installing/updating llm-wiki Codex plugin..." -ForegroundColor Cyan
& codex plugin marketplace add nvk/llm-wiki
if ($LASTEXITCODE -ne 0) {
    Write-Host "Marketplace already exists or could not be added; trying upgrade..." -ForegroundColor DarkGray
    & codex plugin marketplace upgrade llm-wiki
    if ($LASTEXITCODE -ne 0) { throw "Could not add or upgrade the llm-wiki marketplace." }
}
& codex plugin add wiki@llm-wiki
if ($LASTEXITCODE -ne 0) { throw "Could not install/enable wiki@lm-wiki." }

$argsList = @("$repoRoot/scripts/configure-llm-wiki.py", "--repo", $repoRoot)
if ($HubPath) { $argsList += @("--hub", $HubPath) }
if ($ForceSessionConfig) { $argsList += "--force-session-config" }
& python3 @argsList
if ($LASTEXITCODE -ne 0) { throw "llm-wiki hub configuration failed." }

Write-Host ""
Write-Host "Required one-time UI step:" -ForegroundColor Cyan
Write-Host "  1. Restart Codex."
Write-Host "  2. Open /hooks."
Write-Host "  3. Review and trust the llm-wiki hooks."
Write-Host ""
Write-Host "New Codex threads opened from this DotaGraph checkout will receive distilled session context on SessionStart."
Write-Host 'Use $wiki-query for small read-only lookups, and @wiki for full session/wiki workflows.'
