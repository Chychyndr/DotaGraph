#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$HubPath = "",
    [switch]$ForceSessionConfig
)

$ErrorActionPreference = "Stop"

function Resolve-PortablePath([string]$Value, [string]$HomeDir) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    if ($Value -eq "~") { return $HomeDir }
    if ($Value.StartsWith("~/")) { return Join-Path $HomeDir $Value.Substring(2) }
    return $Value
}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    throw "Codex CLI was not found in PATH."
}

if (-not (Get-Command python3 -ErrorAction SilentlyContinue)) {
    Write-Warning "llm-wiki Codex hooks invoke 'python3'. Install Python 3 and make sure python3 is available before trusting the hooks."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$templateConfig = Join-Path $repoRoot "config/llm-wiki-session.json"

Write-Host "Installing/updating llm-wiki Codex plugin..." -ForegroundColor Cyan
& codex plugin marketplace add nvk/llm-wiki
if ($LASTEXITCODE -ne 0) {
    Write-Host "Marketplace already exists or could not be added; trying upgrade..." -ForegroundColor DarkGray
    & codex plugin marketplace upgrade llm-wiki
    if ($LASTEXITCODE -ne 0) { throw "Could not add or upgrade the llm-wiki marketplace." }
}

& codex plugin add wiki@llm-wiki
if ($LASTEXITCODE -ne 0) { throw "Could not install/enable wiki@llm-wiki." }

$homeDir = if ($env:HOME) { $env:HOME } else { $HOME }
$configDir = Join-Path $homeDir ".config/llm-wiki"
$configPath = Join-Path $configDir "config.json"

if ($HubPath) {
    $resolvedHub = Resolve-PortablePath $HubPath $homeDir
    New-Item -ItemType Directory -Force -Path $configDir | Out-Null
    @{ hub_path = $HubPath } | ConvertTo-Json | Set-Content -Encoding utf8 $configPath
} elseif (Test-Path $configPath) {
    try { $existing = Get-Content -Raw $configPath | ConvertFrom-Json }
    catch { throw "Invalid llm-wiki config: $configPath" }
    $configured = if ($existing.hub_path) { [string]$existing.hub_path } else { [string]$existing.resolved_path }
    $resolvedHub = Resolve-PortablePath $configured $homeDir
    if (-not $resolvedHub) { $resolvedHub = Join-Path $homeDir "wiki" }
} else {
    $HubPath = "~/wiki"
    $resolvedHub = Join-Path $homeDir "wiki"
    New-Item -ItemType Directory -Force -Path $configDir | Out-Null
    @{ hub_path = $HubPath } | ConvertTo-Json | Set-Content -Encoding utf8 $configPath
}

New-Item -ItemType Directory -Force -Path $resolvedHub | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $resolvedHub "topics") | Out-Null
$sessionDir = Join-Path $resolvedHub ".sessions"
New-Item -ItemType Directory -Force -Path $sessionDir | Out-Null

$registryPath = Join-Path $resolvedHub "wikis.json"
if (-not (Test-Path $registryPath)) {
@'
{
  "default": "<HUB>",
  "wikis": {
    "hub": {
      "path": "<HUB>",
      "description": "Global llm-wiki hub"
    }
  },
  "local_wikis": []
}
'@ | Set-Content -Encoding utf8 $registryPath
}

$indexPath = Join-Path $resolvedHub "_index.md"
if (-not (Test-Path $indexPath)) {
@'
# Wiki Hub

> Global llm-wiki hub. Session memory lives under .sessions/; durable topic knowledge lives under topics/.

## Topic Wikis

| Topic | Description | Status |
|------|-------------|--------|

## Notes

DotaGraph code, tests, ADRs, issues, and living docs remain canonical project truth. Session digests are operational context.
'@ | Set-Content -Encoding utf8 $indexPath
}

$logPath = Join-Path $resolvedHub "log.md"
if (-not (Test-Path $logPath)) {
    Set-Content -Encoding utf8 $logPath "# Wiki Activity Log"
}

$destSessionConfig = Join-Path $sessionDir "config.json"
if ($ForceSessionConfig -or -not (Test-Path $destSessionConfig)) {
    Copy-Item -Force $templateConfig $destSessionConfig
    Write-Host "Applied DotaGraph session profile: $destSessionConfig" -ForegroundColor Green
} else {
    Write-Host "Existing session config preserved: $destSessionConfig" -ForegroundColor Yellow
    Write-Host "Run again with -ForceSessionConfig to apply the repository profile."
}

Write-Host ""
Write-Host "llm-wiki setup complete." -ForegroundColor Green
Write-Host "Hub: $resolvedHub"
Write-Host ""
Write-Host "Required one-time UI step:" -ForegroundColor Cyan
Write-Host "  1. Restart Codex."
Write-Host "  2. Open /hooks."
Write-Host "  3. Review and trust the llm-wiki hooks."
Write-Host ""
Write-Host "Then open DotaGraph from this repository directory. New Codex threads will receive the latest distilled session context on SessionStart."
Write-Host 'Use $wiki-query for small read-only lookups, and @wiki for full session/wiki workflows.'
