#!/usr/bin/env python
"""
Walk the built site and verify every internal link and every anchor.

Cross-references are the part of a document that rots silently: renaming a
chapter breaks a dozen links and nothing complains. Run this after `bun run
build` — it reads dist/, so it checks what will actually be served.

    bun run build && uv run --project lab python scripts/check_links.py
"""

from __future__ import annotations

import pathlib
import sys
from html.parser import HTMLParser

DIST = pathlib.Path(__file__).resolve().parent.parent / "dist"


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        d = dict(attrs)
        for key in ("id", "name"):
            if d.get(key):
                self.ids.add(d[key])
        if tag == "a" and d.get("href"):
            self.hrefs.append(d["href"])


def main() -> int:
    if not DIST.exists():
        print("dist/ is missing — run `bun run build` first.")
        return 1

    pages: dict[str, set[str]] = {}
    links: list[tuple[str, str]] = []

    for f in DIST.rglob("index.html"):
        rel = str(f.parent.relative_to(DIST)).strip("/")
        url = "/" if rel in ("", ".") else f"/{rel}/"
        page = Page()
        page.feed(f.read_text())
        pages[url] = page.ids
        links += [(url, h) for h in page.hrefs]

    broken_page: list[tuple[str, str]] = []
    broken_anchor: list[tuple[str, str]] = []

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
        target = path if path.endswith("/") else path + "/"
        if target not in pages:
            broken_page.append((src, href))
        elif frag and frag not in pages[target]:
            broken_anchor.append((src, href))

    print(f"{len(pages)} pages, {len(links)} links checked")
    for label, items in (("missing pages", broken_page), ("missing anchors", broken_anchor)):
        if items:
            print(f"\n{len(set(items))} {label}:")
            for src, href in sorted(set(items)):
                print(f"   {src:46s} -> {href}")

    if broken_page or broken_anchor:
        return 1
    print("all internal links resolve")
    return 0


if __name__ == "__main__":
    sys.exit(main())
