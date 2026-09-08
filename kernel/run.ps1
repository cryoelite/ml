<#
.SYNOPSIS
  Set up and start the Python kernel on this Windows machine.

.DESCRIPTION
  The PowerShell twin of kernel/run.sh. It checks for uv, installs the Python
  environment including PyTorch, reports whether a GPU is usable, and starts the
  Jupyter kernel the website talks to.

  The kernel always runs on YOUR machine — never on the server hosting the site.
  A kernel executes arbitrary Python, so it could not be shared between visitors
  even in principle.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File kernel\run.ps1

.EXAMPLE
  # When the site is hosted somewhere other than your own machine:
  $env:GRADIENT_SITE_ORIGIN = "https://projects.itscryo.com"
  powershell -ExecutionPolicy Bypass -File kernel\run.ps1
#>

$ErrorActionPreference = "Stop"

$Root  = Split-Path -Parent $PSScriptRoot
$Port  = if ($env:GRADIENT_KERNEL_PORT)  { $env:GRADIENT_KERNEL_PORT }  else { "8899" }
$Token = if ($env:GRADIENT_KERNEL_TOKEN) { $env:GRADIENT_KERNEL_TOKEN } else { "gradient" }
$Site  = $env:GRADIENT_SITE_ORIGIN

function Write-Step($n) { Write-Host "`n$n" -ForegroundColor White }
function Write-Ok($m)   { Write-Host "  [ok] $m" -ForegroundColor Green }
function Write-Bad($m)  { Write-Host "  [!!] $m" -ForegroundColor Red }

Write-Step "1. Checking for uv"
if (Get-Command uv -ErrorAction SilentlyContinue) {
    Write-Ok ("uv " + ((uv --version) -split ' ')[1])
} else {
    Write-Bad "uv is not installed."
    Write-Host ""
    Write-Host "  Install it with:"
    Write-Host '    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"'
    Write-Host ""
    Write-Host "  Then close and reopen PowerShell, and run this again."
    exit 1
}

Write-Step "2. Installing the Python environment"
Write-Host "   Includes PyTorch, so the first run takes a few minutes."
uv sync --project "$Root\lab" --extra deep --quiet
if ($LASTEXITCODE -ne 0) { Write-Bad "uv sync failed - see the output above."; exit 1 }
Write-Ok "lab\.venv ready, with torch"

Write-Step "3. Checking the GPU"
# There is no MPS on Windows; CUDA is the one worth reporting.
uv run --project "$Root\lab" python -c @"
try:
    import torch
    if torch.cuda.is_available():
        print('  [ok] CUDA available:', torch.cuda.get_device_name(0))
    else:
        print('  [--] CPU only - everything runs, just slower')
except Exception as e:
    print('  [--] could not query torch:', e)
"@

# Jupyter only accepts browser requests from origins it has been told about.
# Localhost is always allowed; a hosted site is not, and without this the
# connection fails on CORS with no obvious cause.
$OriginPat = 'https?://(localhost|127\.0\.0\.1)(:[0-9]+)?'
if ($Site) {
    $Escaped   = [Regex]::Escape($Site)
    $OriginPat = "($OriginPat|$Escaped)"
}

Write-Host ""
Write-Host "Gradient kernel"
Write-Host "  url    http://127.0.0.1:$Port"
Write-Host "  token  $Token"
if ($Site) { Write-Host "  allows $Site (and localhost)" }
else       { Write-Host "  allows localhost only - set GRADIENT_SITE_ORIGIN for a hosted site" }
Write-Host ""
Write-Host "  In the site header, click the runtime pill -> 'On this machine'."
Write-Host "  Ctrl-C to stop."
Write-Host ""

uv run --project "$Root\lab" jupyter server `
  --ServerApp.ip=127.0.0.1 `
  --ServerApp.port=$Port `
  --ServerApp.port_retries=0 `
  --IdentityProvider.token=$Token `
  --ServerApp.open_browser=False `
  --ServerApp.root_dir="$Root\lab" `
  --ServerApp.disable_check_xsrf=True `
  --ServerApp.allow_origin_pat=$OriginPat `
  --ServerApp.allow_credentials=False
