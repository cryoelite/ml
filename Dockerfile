# =============================================================================
# Gradient — the static site.
#
# Two stages. The first builds with Bun (which also vendors Pyodide, so the
# image owns its Python runtime and works with no network at all). The second
# is nginx serving pure static files: there is no server-side anything here,
# so shipping a Node runtime would be dead weight.
#
#   docker compose up --build          site only
#   docker compose --profile kernel up  site + the PyTorch kernel
# =============================================================================

# --- stage 1: build ----------------------------------------------------------
FROM oven/bun:1.3-alpine AS build

WORKDIR /app

# Dependencies first, so a prose-only edit reuses this layer.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Vendor Pyodide into public/ before building. This downloads ~54 MB of wheels
# once, at build time, so the running container never needs a network. If this
# fails the site still works — the worker falls back to the CDN — but then the
# image is no longer self-contained, so let it fail the build loudly instead.
RUN bun scripts/vendor-pyodide.mjs

RUN bun run build

# --- stage 2: serve ----------------------------------------------------------
FROM nginx:1.27-alpine AS serve

# Astro emits <path>/index.html (trailingSlash: "always") and a pile of .wasm,
# .whl and .woff2 that need the right headers. See the config for details.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Cheap liveness signal: if nginx can serve the front page, the site is up.
#
# 127.0.0.1 rather than localhost, and that is not fussiness. In the container
# `localhost` resolves to ::1 as well as 127.0.0.1, busybox wget tries the IPv6
# address first, and nginx here listens only on 0.0.0.0 — so the check fails
# with "connection refused" against a server that is serving perfectly well.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
