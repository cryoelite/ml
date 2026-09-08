# Gradient

A two-week, ground-up path into machine learning, **written for people who have
never programmed**. Sixteen chapters, fifteen optional extras, 254 runnable code
cells, two Python runtimes, and an appendix explaining every piece of Python it
uses.

It was written by a programmer, and there are a few notes for readers in the same
position — Python-versus-Rust comparisons, mostly. All of them are folded shut,
labelled, and needed by nothing.

```bash
docker compose up --build     # http://localhost:4321
```

Start at `/learn/01-where-this-fits/`. Every code block on the page runs.

## Running it

There are two independent pieces, and the split matters:

| | Runs where | Needed for |
|---|---|---|
| **The site** | a server, or your laptop | everything — it is a static site |
| **The Python kernel** | **always your own machine** | chapter 10 and cells tagged `local` (PyTorch) |

About **70% of the course needs nothing but the site**: Python executes inside
your browser via Pyodide, which is vendored in, so it works offline. The kernel
is only for the PyTorch cells.

> A Jupyter kernel executes arbitrary Python, so it can never be shared between
> visitors to a hosted site. If you are reading this on someone else's server,
> you run the kernel yourself and your browser talks to your own `localhost`.
> The site's server is never involved.

### The site

```bash
docker compose up --build        # http://localhost:4321
docker compose down
```

Or without Docker:

```bash
bun run setup && bun run dev
```

### The kernel — only if you want the PyTorch chapters

Self-contained; run it from its own directory.

```bash
cd kernel
docker compose up --build        # http://127.0.0.1:8899
```

Or without Docker, if you have `uv`:

```bash
bash kernel/run.sh               # checks uv, installs torch, starts the kernel
```

Then in the site header: click the **runtime pill** → **On this machine** →
**Test connection**. It will tell you exactly what is wrong if anything is.

### Connecting them

| Setting | Default | Change it when |
|---|---|---|
| `GRADIENT_KERNEL_PORT` | `8899` | 8899 is already taken on your machine |
| `GRADIENT_KERNEL_TOKEN` | `gradient` | you want a non-default token |
| `GRADIENT_SITE_ORIGIN` | *(none)* | the site is **not** on your own machine |

Copy `kernel/.env.example` to `kernel/.env` and edit, or set them inline:

```bash
GRADIENT_SITE_ORIGIN=https://ml.example.com GRADIENT_KERNEL_PORT=9000 \
  docker compose up --build
```

Whatever port you choose, type `http://127.0.0.1:<port>` and the matching token
into the site's runtime panel and press **Test connection**.

`GRADIENT_SITE_ORIGIN` is the one people miss. The kernel only accepts browser
requests from origins it has been told about; localhost is always allowed, but a
deployed site is not, and without it the connection fails on CORS.

### Two caveats worth knowing

**No GPU in a container.** Docker on macOS cannot reach the Metal GPU, so
chapter 10's `best_device()` correctly reports `cpu` inside the kernel image.
Every cell still runs. For MPS, use `bash kernel/run.sh` on the host instead.

**HTTPS sites and plain-HTTP kernels.** If the site is served over HTTPS, the
browser will only let it reach a *loopback* address over plain HTTP. Chrome and
Firefox allow `127.0.0.1`; Safari is stricter. **Test connection** names this
case explicitly if it happens.

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

**I · Getting our bearings** — where this all fits, meeting Python, the shape of problems
**II · How learning happens** — your first model, gradient descent, generalisation, the model zoo
**III · Neural networks** — built by hand, backpropagation, then PyTorch
**IV · The modern stack** — pictures & transfer, embeddings, attention, language models
**V · Doing it for real** — unsupervised methods, shipping, reading papers

`/extras/` holds everything worth reading that simply does not fit in a fortnight — **nothing in the sixteen chapters depends on any of it.**
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
    py/*.mdx            46 Python entries, most with a folded programmer note
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
