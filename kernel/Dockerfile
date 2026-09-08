# =============================================================================
# Gradient — the local PyTorch kernel.
#
# This service exists for exactly one reason: Pyodide has no torch build, so
# chapter 10 and every cell tagged `local` need a real CPython. Everything else
# in the course runs in the browser and needs none of this.
#
# It is therefore its own image, its own compose file, and its own lifecycle:
#
#     cd kernel && docker compose up --build
#
# Build context is the REPOSITORY ROOT (see kernel/compose.yaml), because it
# needs lab/ and scripts/kernel.sh from there.
#
# NOTE ON HARDWARE: there is no MPS or CUDA here. Docker on macOS cannot reach
# the Metal GPU, so best_device() in chapter 10 will correctly report "cpu".
# Every cell still runs; the timing commentary in that chapter is about a host
# GPU it cannot see. For MPS, run `bun run kernel` on the host instead.
# =============================================================================

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# The user is created BEFORE anything large is written, and everything below
# runs as it. Chowning afterwards would copy the whole 1.4 GB virtualenv into a
# second layer and add over a gigabyte to the image for no benefit.
RUN useradd --create-home --uid 1000 gradient \
 && mkdir -p /app && chown gradient:gradient /app
USER gradient
ENV HOME=/home/gradient

WORKDIR /app

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    # The environment is already resolved at build time; don't re-sync on boot.
    UV_NO_SYNC=1 \
    # Let unimplemented ops fall back rather than raising. Harmless on CPU,
    # and keeps behaviour identical to scripts/kernel.sh on the host.
    PYTORCH_ENABLE_MPS_FALLBACK=1 \
    # A published port cannot reach a process bound to loopback.
    GRADIENT_KERNEL_BIND=0.0.0.0 \
    GRADIENT_KERNEL_PORT=8899 \
    # Overridden at run time with the origin of the site you are reading.
    GRADIENT_SITE_ORIGIN=

# Resolve the environment first so a content edit does not re-download torch.
COPY --chown=gradient:gradient lab/pyproject.toml lab/uv.lock ./lab/

# Everything EXCEPT torch, from the lockfile.
RUN uv sync --project lab --frozen --no-install-project

# torch separately, from PyTorch's CPU index.
#
# This is worth the extra step. The default PyPI wheels bundle the CUDA runtime
# and Triton — 3.3 GB of nvidia libraries plus 817 MB of triton — which a
# container with no GPU can never use. Installing the CPU build here takes the
# image from 12.2 GB to roughly a tenth of that.
#
# It is deliberately NOT in lab/pyproject.toml: on the host, macOS torch is
# already CPU/MPS-only and pinning a CPU index there would take MPS away from
# anyone running `bash kernel/run.sh` natively. The container is the odd one
# out, so the container carries the workaround.
RUN uv pip install --python /app/lab/.venv \
      --index-url https://download.pytorch.org/whl/cpu \
      torch torchvision

# Only what the kernel actually needs at runtime.
# Runs as the non-root `gradient` user set up above. Two reasons, and the first
# is the one that bites: Jupyter refuses to start as root and exits, which
# presents as a container restart loop with no obvious cause. The second is that
# this process executes whatever Python it is sent, so it has no business being
# uid 0.
COPY --chown=gradient:gradient scripts/kernel.sh ./scripts/kernel.sh
COPY --chown=gradient:gradient kernel/healthcheck.py ./kernel/healthcheck.py
COPY --chown=gradient:gradient lab/notebooks ./lab/notebooks

EXPOSE 8899

# See kernel/healthcheck.py for why a 403 counts as healthy. Uses the venv's
# python by path, because the non-root user has no `python` on PATH.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD ["/app/lab/.venv/bin/python", "/app/kernel/healthcheck.py"]

CMD ["bash", "scripts/kernel.sh"]
