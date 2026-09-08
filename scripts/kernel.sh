#!/usr/bin/env bash
# ============================================================================
# Start the Jupyter kernel the website talks to.
#
# The site drives this over Jupyter's own REST + websocket API — the same one
# JupyterLab uses — so your cells run in a real CPython process on this machine,
# with PyTorch, MPS and every package in lab/pyproject.toml.
#
# Security: the server binds to loopback only, requires a token, and accepts
# cross-origin requests only from localhost. That is what lets a page served on
# :4321 talk to a kernel on :8899 without opening it to the network.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${GRADIENT_KERNEL_PORT:-8899}"
TOKEN="${GRADIENT_KERNEL_TOKEN:-gradient}"

if ! command -v uv >/dev/null 2>&1; then
  echo "✗ uv is not installed. See https://docs.astral.sh/uv/" >&2
  exit 1
fi

# macOS python.org builds ship without a usable CA bundle until you run
# "Install Certificates.command". Point OpenSSL at certifi so dataset and
# pretrained-weight downloads work either way.
if [ -z "${SSL_CERT_FILE:-}" ]; then
  CERT="$(uv run --project "$ROOT/lab" python -c 'import certifi; print(certifi.where())' 2>/dev/null || true)"
  if [ -n "$CERT" ]; then
    export SSL_CERT_FILE="$CERT"
    export REQUESTS_CA_BUNDLE="$CERT"
  fi
fi

# Let unimplemented MPS operations fall back to CPU rather than raising.
export PYTORCH_ENABLE_MPS_FALLBACK="${PYTORCH_ENABLE_MPS_FALLBACK:-1}"

echo "Gradient kernel"
echo "  url    http://127.0.0.1:${PORT}"
echo "  token  ${TOKEN}"
echo
echo "  In the site header, click the runtime pill → 'On this machine'."
echo "  Ctrl-C to stop."
echo

exec uv run --project "$ROOT/lab" jupyter server \
  --ServerApp.ip=127.0.0.1 \
  --ServerApp.port="$PORT" \
  --ServerApp.port_retries=0 \
  --IdentityProvider.token="$TOKEN" \
  --ServerApp.open_browser=False \
  --ServerApp.root_dir="$ROOT/lab" \
  --ServerApp.disable_check_xsrf=True \
  --ServerApp.allow_origin_pat='https?://(localhost|127\.0\.0\.1)(:[0-9]+)?' \
  --ServerApp.allow_credentials=False
