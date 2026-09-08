# Gradient

A two-week, ground-up path into machine learning, written for someone who already
ships software. Sixteen chapters, fifteen optional extras, 253 runnable code
cells, two Python runtimes, and an appendix that explains every Python construct
in terms of the Rust you already know.

```bash
bun run setup          # everything except PyTorch
bun run setup --deep   # everything, including PyTorch (needed from chapter 10)
bun run dev            # http://localhost:4321
```

Start at `/learn/01-where-this-fits/`.

## What it is

Every code block on the site **runs**. Press Run and Python starts inside the
browser — no install, works offline, works when deployed. The chapters that need
real PyTorch say so and connect to a Jupyter kernel on your own machine instead.

| | Browser (default) | Local kernel |
|---|---|---|
| Runtime | Pyodide — CPython 3.14 on WebAssembly | a real Jupyter kernel |
| Install | none | `uv sync --project lab --extra deep` |
| Has | numpy, pandas, scikit-learn, scipy, matplotlib, sympy | all that, plus PyTorch and MPS |
| Covers | chapters 1–9, 11–16 | chapter 10 and the `local` cells |

The runtime pill in the header switches between them. Details, and the two macOS
gotchas that will otherwise cost you an hour, are on `/setup/`.

## The path

**I · Orientation** — where this fits, Python for Rust programmers, the shape of problems
**II · How learning works** — your first model, gradient descent, generalisation, the model zoo
**III · Deep learning** — neural networks by hand, backpropagation, PyTorch
**IV · The modern stack** — vision & transfer, embeddings, attention, LLMs
**V · Doing it for real** — unsupervised methods, shipping, reading papers

`/extras/` holds everything that is genuinely worth reading and genuinely does not
fit in a fortnight — **nothing in the sixteen chapters depends on any of it.**
`/map/` shows the whole field as a tree. `/colophon/` explains every design
decision behind the thing.

## Commands

| | |
|---|---|
| `bun run dev` | dev server (vendors Pyodide on first run) |
| `bun run build` | static build into `dist/` |
| `bun run kernel` | Jupyter kernel on `127.0.0.1:8899` for the PyTorch chapters |
| `bun run vendor` | re-vendor Pyodide into `public/pyodide/` |
| `uv run --project lab python scripts/check_cells.py [--deep]` | run every cell in every chapter and extra |
| `uv run --project lab python scripts/export_notebooks.py` | regenerate `lab/notebooks/*.ipynb` |
| `uv run --project lab ruff check .` | lint the Python |

## Layout

```
src/
  content/
    chapters/*.mdx      the 16 chapters — the two-week spine
    extras/*.mdx        15 optional pieces, none of them load-bearing
    py/*.mdx            46 Python entries, each with a Rust analogy
    math/*.mdx          31 maths entries, each with its symbols named
  components/           Cell, Ref/Py/M (hover cards), Aside, Reveal,
                        SideQuest, Stuck, TryThis, Wonder, Doodle
  lib/
    doodles.ts                  25 hand-drawn SVGs, one shared pencil filter
    remark-runnable-cells.mjs   turns ```python run into a live <Cell/>
    conceptmap.ts               the field as a tree, plus its layout
  scripts/
    runtime.ts          the two Python backends behind one interface
    client.ts           all the progressive enhancement
public/
  pyodide-worker.js     the browser Python worker (module worker, ESM)
  pyodide/              vendored runtime — gitignored, ~56 MB
lab/
  pyproject.toml        the uv-managed Python environment
  notebooks/*.ipynb     one notebook per chapter, exported from the chapters
scripts/
  setup.sh  kernel.sh  vendor-pyodide.mjs  check_cells.py  export_notebooks.py
```

## Editing

Chapters are plain Markdown. A fence tagged `run` becomes a live cell:

````markdown
```python run title="what this shows"
import numpy as np
np.arange(6).reshape(2, 3)
```
````

Add `local` for cells that need PyTorch. Reference an appendix entry inline with
`<Py id="broadcasting">broadcasting</Py>` or `<M id="chain-rule" />`; both render
a hover card and degrade to a plain link without JavaScript.

Teaching components available in any chapter or extra:

| | |
|---|---|
| `<Aside type="key\|nice\|rust\|warn\|math">` | classified sidenote |
| `<Reveal title="…" kind="math\|deep\|rust">` | collapsed derivation |
| `<SideQuest title="…" time="…" why="…">` | real content, off the fortnight |
| `<Stuck>` | the places people reliably get stuck, named and answered |
| `<TryThis>` with `hint` / `answer` slots | exercise with the answer folded away |
| `<Wonder>` | the zoom-out; never load-bearing |
| `<Doodle name="…" />` | one of the 25 drawings |

After any change to the code in a chapter or extra:

```bash
uv run --project lab python scripts/check_cells.py --deep
```

That runs every cell in document order and is how the numbers quoted in the prose
stay true. It has caught real errors — a mislabelled diagnostic, a parameter
ratio off by 17×, an embedding demo that was silently broken. Run it.

## Built with

Astro 7 · MDX · KaTeX · Shiki · Pyodide 314 · Bun · uv · Ruff · PyTorch 2.14

Static site, no server, no tracking, no cloud. About 4.5 KB of JavaScript beyond
the Python runtime, and every page is complete without it.
