#!/usr/bin/env bash
# ============================================================================
# One command to get everything working.
#
#   bun run setup            site + browser runtime + light Python env
#   bun run setup --deep     also installs PyTorch (needed from chapter 10)
#
# Every step is idempotent, so re-running it is always safe.
# ============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEEP=0
for arg in "$@"; do [ "$arg" = "--deep" ] && DEEP=1; done

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; }

FAILED=0

# --- 1. prerequisites -------------------------------------------------------
bold "1. Checking what you have"

if command -v bun >/dev/null 2>&1; then
  ok "bun $(bun --version)"
else
  bad "bun is missing — install it from https://bun.sh"
  FAILED=1
fi

if command -v uv >/dev/null 2>&1; then
  ok "uv $(uv --version | awk '{print $2}')"
else
  bad "uv is missing — install it from https://docs.astral.sh/uv/"
  FAILED=1
fi

if command -v ruff >/dev/null 2>&1; then
  ok "ruff $(ruff --version | awk '{print $2}')"
else
  warn "ruff not on PATH (optional; the lab env has its own copy)"
fi

[ "$FAILED" = 1 ] && { echo; bad "Install the missing tools and run this again."; exit 1; }

# --- 2. the site ------------------------------------------------------------
echo
bold "2. Site dependencies"
bun install --silent && ok "node_modules ready" || { bad "bun install failed"; exit 1; }

echo
bold "3. Browser Python runtime"
echo "   Vendoring Pyodide into public/pyodide/ (~56 MB, once)."
bun scripts/vendor-pyodide.mjs && ok "browser runtime works offline" || warn "vendoring failed — the site will fall back to the CDN"

# --- 4. the Python side -----------------------------------------------------
echo
bold "4. Local Python environment"
if [ "$DEEP" = 1 ]; then
  echo "   Installing with PyTorch (--deep). This one takes a few minutes."
  uv sync --project lab --extra deep --quiet && ok "lab/.venv ready, with torch"
else
  echo "   Installing the light set. Re-run with --deep before chapter 10."
  uv sync --project lab --quiet && ok "lab/.venv ready"
fi

# --- 5. certificates, the macOS trap ---------------------------------------
echo
bold "5. HTTPS certificates"
if uv run --project lab python -c "
import ssl, sys, urllib.error, urllib.request
try:
    urllib.request.urlopen('https://pypi.org/simple/', timeout=10)
except urllib.error.URLError as e:
    # urllib wraps the real cause; the certificate error is inside .reason.
    sys.exit(3 if isinstance(e.reason, ssl.SSLCertVerificationError) else 0)
except ssl.SSLCertVerificationError:
    sys.exit(3)
except Exception:
    sys.exit(0)   # offline, which is not a certificate problem
" 2>/dev/null; then
  ok "Python can verify HTTPS"
else
  status=$?
  if [ "$status" = 3 ]; then
    warn "Python has no CA bundle — dataset and model downloads will fail."
    warn "Permanent fix (one double-click):"
    printf '        open "/Applications/Python 3.14/Install Certificates.command"\n'
    warn "Until then, our scripts work around it by pointing at certifi."
  fi
fi

# --- 6. notebooks -----------------------------------------------------------
echo
bold "6. Notebooks"
uv run --project lab python scripts/export_notebooks.py >/dev/null 2>&1 \
  && ok "lab/notebooks/ — one .ipynb per chapter" \
  || warn "notebook export failed (not fatal)"

# --- 7. verify --------------------------------------------------------------
echo
bold "7. Verifying every code cell actually runs"
if [ "$DEEP" = 1 ]; then
  uv run --project lab python scripts/check_cells.py --deep 2>&1 | tail -2
else
  uv run --project lab python scripts/check_cells.py 2>&1 | tail -2
fi

# --- done -------------------------------------------------------------------
cat <<'DONE'

────────────────────────────────────────────────────────────
  bun run dev        start the site        http://localhost:4321
  bun run kernel     local PyTorch kernel  (second terminal, chapter 10+)

  Start reading at /learn/01-where-this-fits/
────────────────────────────────────────────────────────────
DONE
