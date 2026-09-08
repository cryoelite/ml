#!/usr/bin/env python
"""
Walk the built site and verify every internal link and every anchor.

Cross-references are the part of a document that rots silently: renaming a
chapter breaks a dozen links and nothing complains. Run this after `bun run
build` — it reads dist/, so it checks what will actually be served.

    bun run build && uv run --project lab python scripts/check_links.py

SUBPATH DEPLOYMENTS
-------------------
Set SITE_BASE (the same value used for the build) and two extra checks run:

  1. Every root-absolute href/src in the emitted HTML must sit under the base.
     Astro's `base` only rewrites URLs *it* generates, so a hand-written
     href="/setup/" in a component survives the build and points outside the
     site. This catches that class of bug.

  2. The assets the client fetches at RUNTIME must exist at the base-prefixed
     path. These are never named in the HTML — the worker URL and the Pyodide
     index live in JavaScript — so check 1 cannot see them. Getting one wrong
     surfaces to a reader as "worker failed to start", which says nothing about
     the real cause. That exact bug shipped once; hence this list.

Deliberately NOT scanned: string literals inside the built JavaScript. The
correct code is `withBase("/pyodide-worker.js")`, and the raw root-absolute
string is still present in the bundle because the prefixing happens at runtime.
A literal scan cannot tell that apart from the broken version, so it would fail
on correct code. The runtime-asset list below is the honest substitute.

    SITE_BASE=/ml bun run build
    SITE_BASE=/ml uv run --project lab python scripts/check_links.py
"""

from __future__ import annotations

import os
import pathlib
import sys
from html.parser import HTMLParser

DIST = pathlib.Path(__file__).resolve().parent.parent / "dist"

# The mount point the site was built for. "" means the domain root.
BASE = (os.environ.get("SITE_BASE") or "").rstrip("/")

# Fetched by client JavaScript, never named in the HTML, so nothing else here
# would notice them going missing. Paths are relative to the site root.
RUNTIME_ASSETS = [
    "pyodide-worker.js",
    "pyodide/pyodide.mjs",
    "pyodide/pyodide-lock.json",
]


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.hrefs: list[str] = []
        self.assets: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        d = dict(attrs)
        for key in ("id", "name"):
            if d.get(key):
                self.ids.add(d[key])
        if tag == "a" and d.get("href"):
            self.hrefs.append(d["href"])
        # Assets, for the base check. Kept apart from `hrefs` so the existing
        # anchor/page resolution is unaffected.
        for key in ("href", "src"):
            v = d.get(key)
            if v and tag in ("link", "script", "img", "source", "iframe"):
                self.assets.append(v)


def main() -> int:
    if not DIST.exists():
        print("dist/ is missing — run `bun run build` first.")
        return 1

    pages: dict[str, set[str]] = {}
    links: list[tuple[str, str]] = []
    assets: list[tuple[str, str]] = []

    for f in DIST.rglob("index.html"):
        rel = str(f.parent.relative_to(DIST)).strip("/")
        url = "/" if rel in ("", ".") else f"/{rel}/"
        page = Page()
        page.feed(f.read_text())
        pages[url] = page.ids
        links += [(url, h) for h in page.hrefs]
        assets += [(url, a) for a in page.assets]

    def strip_base(path: str) -> str | None:
        """Remove the mount prefix, or return None if the URL sits outside it.

        The relocation into a <base>/ directory happens when the image is built
        (see the Dockerfile), so `bun run build` leaves dist/ at the root while
        the emitted URLs already carry the prefix. Resolution has to undo that.
        """
        if not BASE:
            return path
        if path == BASE:
            return "/"
        if path.startswith(BASE + "/"):
            return path[len(BASE) :]
        return None

    broken_page: list[tuple[str, str]] = []
    broken_anchor: list[tuple[str, str]] = []
    outside_base: list[tuple[str, str]] = []

    for src, href in links:
        if href.startswith(("http://", "https://", "mailto:")):
            continue
        if href.startswith("#"):
            if href[1:] and href[1:] not in pages[src]:
                broken_anchor.append((src, href))
            continue
        path, _, frag = href.partition("#")
        if not path.startswith("/"):
            continue
        inner = strip_base(path)
        if inner is None:
            outside_base.append((src, href))
            continue
        target = inner if inner.endswith("/") else inner + "/"
        if target not in pages:
            broken_page.append((src, href))
        elif frag and frag not in pages[target]:
            broken_anchor.append((src, href))

    # Assets (link/script/img/...) are only checked for the base prefix; whether
    # a hashed filename exists is already guaranteed by the bundler.
    if BASE:
        for src, a in assets:
            if a.startswith(("http://", "https://", "data:", "//")) or not a.startswith("/"):
                continue
            if strip_base(a) is None:
                outside_base.append((src, a))

    # Assets fetched by client JavaScript. Nothing above can see these, because
    # they are never named in the HTML.
    missing_runtime: list[str] = []
    for rel_path in RUNTIME_ASSETS:
        if not (DIST / rel_path).exists():
            missing_runtime.append(f"{BASE}/{rel_path}" if BASE else f"/{rel_path}")

    scope = f" (base {BASE})" if BASE else ""
    print(f"{len(pages)} pages, {len(links)} links checked{scope}")

    for label, items in (
        ("missing pages", broken_page),
        ("missing anchors", broken_anchor),
        (f"URLs outside the base {BASE!r}", outside_base),
    ):
        if items:
            print(f"\n{len(set(items))} {label}:")
            for src, href in sorted(set(items)):
                print(f"   {src:46s} -> {href}")

    if missing_runtime:
        print(f"\n{len(missing_runtime)} runtime asset(s) missing from the build:")
        for m in missing_runtime:
            print(f"   {m}")
        print("   These are fetched by client JS. A reader sees only")
        print('   "worker failed to start", so this check exists to catch it here.')

    if broken_page or broken_anchor or outside_base or missing_runtime:
        return 1
    print("all internal links resolve" + (", and everything is under the base" if BASE else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
