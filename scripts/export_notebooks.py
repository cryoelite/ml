#!/usr/bin/env python
"""
Turn each chapter into a real Jupyter notebook.

The site is the primary way to read this, but a notebook is the right place to
*change* things — and changing things is where the learning is. This exports one
.ipynb per chapter into lab/notebooks/, with the prose as markdown cells and every
runnable fence as a code cell, in document order.

Cells that need PyTorch keep a comment saying so, since the notebook kernel has it
and the browser does not.

    uv run --project lab python scripts/export_notebooks.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHAPTERS = ROOT / "src" / "content" / "chapters"
EXTRAS = ROOT / "src" / "content" / "extras"
OUT = ROOT / "lab" / "notebooks"

FENCE = re.compile(r"^```([a-zA-Z0-9]*)([^\n]*)\n(.*?)^```", re.MULTILINE | re.DOTALL)
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)

# JSX-ish things that are meaningful on the page and noise in a notebook.
# Keep this in step with the components a chapter may reach for; an unknown tag
# survives into the .ipynb as literal angle brackets and looks like a bug.
STRIP_TAGS = re.compile(
    r"</?(Aside|Reveal|ConceptMap|Py|M|Cell|SideQuest|Stuck|TryThis|Wonder|Doodle|Fragment)"
    r"\b[^>]*/?>",
    re.DOTALL,
)
IMPORT_LINE = re.compile(r"^import .* from \"[^\"]+\";$", re.MULTILINE)


def frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER.match(text)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).split("\n"):
        if ":" in line and not line.startswith(" "):
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta, text[m.end() :]


def clean_prose(block: str) -> str:
    """Make MDX readable as plain markdown."""
    block = STRIP_TAGS.sub("", block)
    block = IMPORT_LINE.sub("", block)
    # <Py id="x">label</Py> already lost its tags above; tidy leftover attributes.
    block = re.sub(r"\n{3,}", "\n\n", block)
    return block.strip()


def cells_for(path: Path) -> list[dict]:
    raw = path.read_text()
    meta, body = frontmatter(raw)

    cells: list[dict] = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": (
                f"# {meta.get('title', path.stem)}\n\n"
                f"> {meta.get('blurb', '')}\n\n"
                f"Read this chapter at `/learn/{path.stem}/`. "
                f"Exported from `src/content/chapters/{path.name}` — edit there, not here.\n"
            ).splitlines(keepends=True),
        }
    ]

    pos = 0
    for m in FENCE.finditer(body):
        prose = clean_prose(body[pos : m.start()])
        if prose:
            cells.append(
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": prose.splitlines(keepends=True),
                }
            )
        pos = m.end()

        lang, cell_meta, code = m.group(1), m.group(2), m.group(3)
        runnable = lang in {"python", "py", "python3"} and re.search(
            r"(^|\s)run(\s|$)", cell_meta
        )
        if runnable:
            prefix = ""
            if re.search(r"(^|\s)local(\s|$)", cell_meta):
                prefix = "# needs PyTorch (this kernel has it; the browser runtime does not)\n"
            cells.append(
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": (prefix + code.rstrip("\n")).splitlines(keepends=True),
                }
            )
        else:
            fenced = f"```{lang}\n{code.rstrip()}\n```"
            cells.append(
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": fenced.splitlines(keepends=True),
                }
            )

    tail = clean_prose(body[pos:])
    if tail:
        cells.append(
            {"cell_type": "markdown", "metadata": {}, "source": tail.splitlines(keepends=True)}
        )
    return cells


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "extras").mkdir(parents=True, exist_ok=True)
    written = 0
    paths = [(p, OUT) for p in sorted(CHAPTERS.glob("*.mdx"))]
    paths += [(p, OUT / "extras") for p in sorted(EXTRAS.glob("*.mdx"))]
    for path, out_dir in paths:
        nb = {
            "cells": cells_for(path),
            "metadata": {
                "kernelspec": {
                    "display_name": "Python 3",
                    "language": "python",
                    "name": "python3",
                },
                "language_info": {"name": "python"},
            },
            "nbformat": 4,
            "nbformat_minor": 5,
        }
        target = out_dir / f"{path.stem}.ipynb"
        target.write_text(json.dumps(nb, indent=1) + "\n")
        code_cells = sum(1 for c in nb["cells"] if c["cell_type"] == "code")
        print(f"  {target.relative_to(ROOT)}  ({code_cells} code cells)")
        written += 1
    print(f"\n{written} notebooks in {OUT.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
