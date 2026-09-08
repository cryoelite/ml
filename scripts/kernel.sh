#!/usr/bin/env bash
# ============================================================================
# Start the Jupyter kernel the website talks to.
#
# The site drives this over Jupyter's own REST + websocket API — the same one
# JupyterLab uses — so your cells run in a real CPython process on this machine,
# with PyTorch, MPS and every package in lab/pyproject.toml.
#
# The kernel always runs on YOUR machine — never on the server hosting the site.
# A kernel executes arbitrary Python, so it could not be shared between visitors
# even in principle. When the site is deployed somewhere public, each reader runs
# their own copy of this and the page in their browser talks to their localhost.
#
# Security: binds to loopback, requires a token, and accepts cross-origin
# requests only from origins you name. Localhost is always allowed; add the
# deployed site with GRADIENT_SITE_ORIGIN, e.g.
#
#     GRADIENT_SITE_ORIGIN=https://ml.example.com bun run kernel
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${GRADIENT_KERNEL_PORT:-8899}"
TOKEN="${GRADIENT_KERNEL_TOKEN:-gradient}"
# Loopback by default: on a laptop the kernel should not be reachable from the
# network. Inside a container that is wrong — a published port cannot reach a
# process bound to 127.0.0.1 — so the Docker image sets this to 0.0.0.0, where
# the container boundary is doing the isolation instead.
BIND="${GRADIENT_KERNEL_BIND:-127.0.0.1}"
# The origin of the page allowed to drive this kernel, beyond localhost. Needed
# whenever the site is served from anywhere other than your own machine.
SITE_ORIGIN="${GRADIENT_SITE_ORIGIN:-}"

# Localhost on any port, always. Jupyter matches this as a full-string regex.
ORIGIN_PAT='https?://(localhost|127\.0\.0\.1)(:[0-9]+)?'
if [ -n "$SITE_ORIGIN" ]; then
  # Escape regex metacharacters so a dotted hostname cannot match too broadly:
  # an unescaped "ml.example.com" would also accept "mlXexample.com".
  ESCAPED="$(printf '%s' "$SITE_ORIGIN" | sed -e 's/[.[\*^$()+?{}|]/\\&/g')"
  ORIGIN_PAT="($ORIGIN_PAT|$ESCAPED)"
fi

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
echo "  bind   ${BIND}:${PORT}"
echo "  url    http://127.0.0.1:${PORT}"
echo "  token  ${TOKEN}"
if [ -n "$SITE_ORIGIN" ]; then
  echo "  allows ${SITE_ORIGIN} (and localhost)"
else
  echo "  allows localhost only — set GRADIENT_SITE_ORIGIN for a deployed site"
fi
echo
echo "  In the site header, click the runtime pill → 'On this machine'."
echo "  Ctrl-C to stop."
echo

# Jupyter refuses to start as root and exits, which in a container looks like a
# restart loop with no obvious cause. The image runs as a normal user so this is
# not needed there; it is a safety net for anyone who does end up as root.
ROOT_FLAG=()
if [ "$(id -u)" = "0" ]; then
  echo "  ! running as root — passing --allow-root"
  ROOT_FLAG=(--allow-root)
fi

exec uv run --project "$ROOT/lab" jupyter server \
  "${ROOT_FLAG[@]}" \
  --ServerApp.ip="$BIND" \
  --ServerApp.port="$PORT" \
  --ServerApp.port_retries=0 \
  --IdentityProvider.token="$TOKEN" \
  --ServerApp.open_browser=False \
  --ServerApp.root_dir="$ROOT/lab" \
  --ServerApp.disable_check_xsrf=True \
  --ServerApp.allow_origin_pat="$ORIGIN_PAT" \
  --ServerApp.allow_credentials=False
