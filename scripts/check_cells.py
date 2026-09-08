#!/usr/bin/env python
"""
Execute every runnable cell in every chapter, in document order, and report
anything that raises.

A tutorial whose code does not run is worse than no tutorial, and the cells here
are stateful — later ones depend on names bound by earlier ones, exactly as in a
notebook. So each chapter gets one fresh namespace and its cells run in the order
a reader would press Run.

Cells tagged `local` need PyTorch and are skipped unless --deep is passed, since
the browser runtime cannot run them either.

    uv run --project lab python scripts/check_cells.py
    uv run --project lab python scripts/check_cells.py --deep
    uv run --project lab python scripts/check_cells.py --only 05
"""

from __future__ import annotations

import argparse
import io
import os
import re
import sys
import traceback
import types
import warnings
from contextlib import redirect_stdout
from pathlib import Path

os.environ.setdefault("MPLBACKEND", "AGG")

# A python.org install on macOS has no CA bundle until "Install
# Certificates.command" has been run, and then every dataset or pretrained-weight
# download fails with an opaque SSL error. Point OpenSSL at certifi if nothing
# else has. Harmless when the system is already configured correctly.
if not os.environ.get("SSL_CERT_FILE"):
    try:
        import certifi

        os.environ["SSL_CERT_FILE"] = certifi.where()
        os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
    except ImportError:
        pass

ROOT = Path(__file__).resolve().parent.parent
CHAPTERS = ROOT / "src" / "content" / "chapters"
EXTRAS = ROOT / "src" / "content" / "extras"

# Both collections hold runnable prose, and both have to keep working. Extras are
# checked with the same namespace-per-file rule as chapters, since a reader
# opening one runs it top to bottom in exactly the same way.
SOURCES = [CHAPTERS, EXTRAS]

# ```python run [flags]\n ... \n```
FENCE = re.compile(
    r"^```(python|py|python3)([^\n]*)\n(.*?)^```",
    re.MULTILINE | re.DOTALL,
)

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"
if not sys.stdout.isatty():
    GREEN = RED = YELLOW = DIM = RESET = ""


class Cell:
    def __init__(self, index: int, code: str, meta: str, line: int):
        self.index = index
        self.code = code
        self.meta = meta
        self.line = line

    @property
    def local(self) -> bool:
        return bool(re.search(r"(^|\s)local(\s|$)", self.meta))

    @property
    def title(self) -> str:
        m = re.search(r'title="([^"]*)"', self.meta)
        return m.group(1) if m else self.code.strip().split("\n")[0][:44]


def extract(path: Path) -> list[Cell]:
    text = path.read_text()
    cells: list[Cell] = []
    for m in FENCE.finditer(text):
        meta = m.group(2)
        if not re.search(r"(^|\s)run(\s|$)", meta):
            continue
        line = text.count("\n", 0, m.start()) + 1
        cells.append(Cell(len(cells), m.group(3), meta, line))
    return cells


def run_chapter(path: Path, deep: bool) -> tuple[int, int, int]:
    cells = extract(path)
    if not cells:
        return 0, 0, 0

    # A real module object, registered in sys.modules: @dataclass resolves
    # annotations via sys.modules[cls.__module__], and a bare dict has no home
    # there. Notebooks and Pyodide both run inside __main__, so this matches.
    module = types.ModuleType(f"gradient_{path.stem.replace('-', '_')}")
    sys.modules[module.__name__] = module
    namespace: dict = module.__dict__
    ok = skipped = failed = 0
    print(f"\n{path.stem}  {DIM}({len(cells)} cells){RESET}")

    for cell in cells:
        if cell.local and not deep:
            print(
                f"  {YELLOW}skip{RESET} [{cell.index + 1:2d}] {cell.title}  {DIM}(needs torch){RESET}"
            )
            skipped += 1
            continue
        buf = io.StringIO()
        try:
            with warnings.catch_warnings(), redirect_stdout(buf):
                warnings.simplefilter("ignore")
                exec(compile(cell.code, f"{path.name}:{cell.line}", "exec"), namespace)
        except Exception:
            failed += 1
            print(
                f"  {RED}FAIL{RESET} [{cell.index + 1:2d}] {cell.title}  {DIM}{path.name}:{cell.line}{RESET}"
            )
            for ln in traceback.format_exc().strip().split("\n")[-4:]:
                print(f"       {DIM}{ln}{RESET}")
        else:
            ok += 1
            first = buf.getvalue().strip().split("\n")[0][:60] if buf.getvalue().strip() else ""
            print(
                f"  {GREEN}ok{RESET}   [{cell.index + 1:2d}] {cell.title}"
                + (f"  {DIM}-> {first}{RESET}" if first else "")
            )

    # Close any figures so chapters cannot leak state into each other.
    try:
        import matplotlib.pyplot as plt

        plt.close("all")
    except Exception:
        pass
    return ok, skipped, failed


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--deep", action="store_true", help="also run cells that need PyTorch")
    ap.add_argument("--only", default="", help="substring filter on the filename")
    args = ap.parse_args()

    paths = []
    for base in SOURCES:
        if base.is_dir():
            paths += sorted(p for p in base.glob("*.mdx") if args.only in p.name)
    if not paths:
        print("nothing matched")
        return 1

    totals = [0, 0, 0]
    for path in paths:
        for i, v in enumerate(run_chapter(path, args.deep)):
            totals[i] += v

    ok, skipped, failed = totals
    print(f"\n{'-' * 58}")
    verdict = f"{RED}{failed} failed{RESET}" if failed else f"{GREEN}all passing{RESET}"
    print(f"{ok} ok, {skipped} skipped, {verdict}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
