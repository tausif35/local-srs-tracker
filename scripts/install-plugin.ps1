# Universal SRS Tracker Multi-Agent Plugin Installer (Windows)
# Thin wrapper -- all install logic lives in install-plugin.py so
# Windows/Linux/macOS share one source of truth instead of two drifting copies.
param(
    [string]$Target = ""
)

$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command python3 -ErrorAction SilentlyContinue }
if (-not $py) {
    Write-Host "Error: python (or python3) not found on PATH. Install Python 3 first." -ForegroundColor Red
    exit 1
}

$scriptPath = Join-Path $PSScriptRoot "install-plugin.py"
if ($Target) {
    & $py.Source $scriptPath --target $Target
} else {
    & $py.Source $scriptPath
}
exit $LASTEXITCODE
