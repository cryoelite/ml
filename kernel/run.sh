#!/usr/bin/env bash
# ============================================================================
# Set up and start the Python kernel on THIS machine, without Docker.
#
#   bash kernel/run.sh
#   GRADIENT_SITE_ORIGIN=https://ml.example.com bash kernel/run.sh
#
# Use this rather than the container when you want Apple MPS: Docker on macOS
# cannot reach the Metal GPU, and this can.
#
# It checks for uv, installs the Python environment including PyTorch, and then
# hands over to scripts/kernel.sh.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; }

bold "1. Checking for uv"
if command -v uv >/dev/null 2>&1; then
  ok "uv $(uv --version | awk '{print $2}')"
else
  bad "uv is not installed."
  echo
  echo "  Install it with:"
  echo "    curl -LsSf https://astral.sh/uv/install.sh | sh"
  echo
  echo "  (or 'brew install uv'). Then run this script again."
  exit 1
fi

bold "2. Installing the Python environment"
echo "   Includes PyTorch, so the first run takes a few minutes."
if uv sync --project "$ROOT/lab" --extra deep --quiet; then
  ok "lab/.venv ready, with torch"
else
  bad "uv sync failed — see the output above."
  exit 1
fi

bold "3. Checking the GPU"
uv run --project "$ROOT/lab" python - <<'PY' || true
try:
    import torch
    if torch.backends.mps.is_available():
        print("  \033[32m✓\033[0m Apple MPS available")
    elif torch.cuda.is_available():
        print("  \033[32m✓\033[0m CUDA available")
    else:
        print("  \033[33m!\033[0m CPU only — everything runs, just slower")
except Exception as e:  # noqa: BLE001
    print(f"  ! could not query torch: {e}")
PY

echo
exec bash "$ROOT/scripts/kernel.sh"
