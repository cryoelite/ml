# Gradient — repository orientation

**Read this first.** One file, everything you need to work on this repo: what it
is, where things live, why they are the way they are, and the traps that will
otherwise cost you an afternoon each.

`README.md` is the user-facing quick start. This file is the maintainer's map.
`/colophon/` (`src/pages/colophon.mdx`) is the *reader*-facing version of the
design philosophy — if you change a decision here, change it there too.

---

## 1. What this is

A static website that teaches machine learning in fourteen days, written for a
backend engineer who writes Rust, can pick up Python, and wants to use the field
well — not to invent architectures, but to know where every piece sits and read a
paper without drowning.

Two properties make it unusual and constrain nearly every decision:

1. **Every code block runs, in the page.** Python executes in the browser via
   Pyodide, or on a local Jupyter kernel for the PyTorch chapters.
2. **Every number in the prose is a number the code produced.** There is a
   checker that enforces this, and it has caught real errors. See §8.

| | |
|---|---|
| Version | **1.0.0** — single source of truth is `package.json` |
| Chapters | 16, five parts, ~50k words — the two-week spine |
| Extras | 15, ~28k words — optional, and **nothing in the spine depends on them** |
| Python appendix | 46 entries, each with a Rust *analogy* |
| Maths appendix | 31 entries, each with its symbols named |
| Runnable cells | 253, all executed before any change lands |
| Drawings | 25 hand-authored SVGs, one shared filter |
| Client JS | ~4.5 KB gzipped, excluding Pyodide |
| Pages built | 39 |

---

## 2. Quick start

```bash
bun run setup          # site deps + Pyodide vendoring + light Python env
bun run setup --deep   # also installs PyTorch (needed from chapter 10)
bun run dev            # http://localhost:4321
```

| Command | Does |
|---|---|
| `bun run dev` | dev server; vendors Pyodide on first run |
| `bun run build` | static build into `dist/` |
| `bun run kernel` | Jupyter kernel on `127.0.0.1:8899` for PyTorch chapters |
| `bun run vendor` | re-vendor Pyodide into `public/pyodide/` |
| `bun run check` | `astro check` — types |
| `bun run check:cells` | run every cell in every chapter and extra (`--deep`) |
| `bun run check:links` | build, then verify every internal link and anchor |
| `bun run notebooks` | regenerate `lab/notebooks/**.ipynb` from the chapters |
| `uv run --project lab ruff check .` | lint `scripts/` and `lab/` |

**Before landing any change**, run all four checks. §8 has the one-liner.

---

## 3. Repository map

```
SUMMARY.md              ← you are here
README.md               user-facing quick start
astro.config.mjs        Sätteri opt-out + remark/rehype pipeline (read §5)
ruff.toml               ONE config for scripts/ and lab/ (see trap 8)

src/
  content.config.ts     the four collections and their frontmatter schemas
  content/
    chapters/*.mdx      16 — the spine. Order is `order` in frontmatter.
    extras/*.mdx        15 — optional depth. Never load-bearing.
    py/*.mdx            46 — Python appendix; filename = the <Py id="…">
    math/*.mdx          31 — maths appendix; filename = the <M id="…">
  components/
    Cell.astro          a runnable cell (injected by the remark plugin)
    Ref.astro           the hover card; Py.astro and M.astro wrap it
    Aside / Reveal      classified sidenote / collapsed derivation
    SideQuest           real content, deliberately off the fortnight
    Stuck               "if something isn't clicking" — named hard parts
    TryThis             exercise with `hint` and `answer` slots
    Wonder              the zoom-out; never load-bearing
    Doodle.astro        renders one drawing from lib/doodles.ts
    ConceptMap          the 51-node field map
    Sidebar / Rail / RuntimeWidget   chrome
  layouts/
    Base.astro          html shell, masthead, the #pencil SVG filter
    Doc.astro           Base + sidebar + rail; used by .astro and .mdx pages
  lib/
    remark-runnable-cells.mjs   ```python run  →  <Cell/>
    doodles.ts                  25 SVGs + chapterDoodle mapping
    conceptmap.ts               the field as a tree + layout algorithm
    inline.ts                   inline-code helper for the appendix pages
  pages/
    index.astro         home
    learn/[...id].astro chapter template (opener, components, related extras)
    extras/             index + [...id] template
    appendix/           python.astro, math.astro
    map.astro  setup.mdx  colophon.mdx
    doodles-qa.astro    ⚠ dev-only gallery of all 25 drawings (see trap 12)
  scripts/
    runtime.ts          PyodideBackend + JupyterBackend behind one interface
    client.ts           ALL progressive enhancement (cells, refs, nav, map)
  styles/global.css     the entire design system, ~1400 lines

public/
  pyodide-worker.js     browser Python worker — MODULE worker, ESM
  pyodide/              vendored runtime, ~56 MB, gitignored

lab/                    the uv-managed Python environment
  pyproject.toml        deps; `deep` extra = torch (see trap 8)
  notebooks/            GENERATED from chapters — do not hand-edit

scripts/
  setup.sh  kernel.sh  vendor-pyodide.mjs
  check_cells.py  check_links.py  export_notebooks.py
```

---

## 4. The two Python runtimes

This is the central architectural fact. Pyodide ships numpy, pandas,
scikit-learn, scipy, matplotlib and sympy — but **not torch**. So:

| | Browser (default) | Local kernel |
|---|---|---|
| What | Pyodide, CPython 3.14 on WebAssembly | real Jupyter kernel |
| Where | `public/pyodide-worker.js` | `scripts/kernel.sh` |
| Install | none | `uv sync --project lab --extra deep` |
| Covers | ~70% of cells; chapters 1–9, 11–16 | chapter 10 + every `local` cell |

`src/scripts/runtime.ts` puts both behind one `Backend` interface, with a single
FIFO queue — *a notebook is sequential by definition*. The runtime pill in the
masthead switches between them.

A cell is marked with fence flags: `run`, `local` (needs torch), `setup` (part of
the page's shared state), `autorun`, `title="…"`.

The kernel binds loopback only, requires a token, and accepts cross-origin
requests only from localhost. That is deliberate and is what lets a page on :4321
talk to a kernel on :8899 without opening it to the network.

---

## 5. How a page becomes a page

1. **Astro 7 defaults to Sätteri**, a Rust Markdown/MDX processor that is fast
   and **runs no remark/rehype plugins**. This project needs three, so
   `astro.config.mjs` opts back in via `markdown.processor: unified({…})`.
   `@astrojs/mdx` inherits it automatically. **Do not remove this.**
2. `remarkRunnableCells` rewrites ` ```python run ` fences into `<Cell/>` JSX
   nodes (hand-built estree literal attributes). This is why chapter source stays
   plain Markdown instead of JSX wrapped around every snippet.
3. `remarkMath` → `rehypeKatex` renders maths **at build time**. No client-side
   typesetting.
4. Shiki highlights at build time (`github-light`).
5. The page template passes a `components` map to `<Content />`, which is what
   resolves the unimported capitalised names (`Cell`, `Py`, `Aside`, …) inside
   MDX.

Everything interactive is **progressive enhancement** over complete static HTML.
`src/scripts/client.ts` is the only entry point; every page works without it.

---

## 6. Content model

Four collections, defined in `src/content.config.ts`. Frontmatter is validated by
zod — a bad field fails the build, which is intentional.

- **`chapters`** — `title, blurb, order, day, part, minutes, introduces[], draft`.
  `part` is one of `orientation | foundations | deep-learning | frontier | practice`.
- **`extras`** — `title, blurb, order, minutes, kind, after?, covers[], draft`.
  `kind` groups them on the index: `history | theory | craft | sibling | culture`.
  `after` is a chapter id; the chapter template then offers it at the foot of
  that chapter.
- **`py`** — `title, summary, signature?, example?, output?, rust?, rustCode?,
  docs?, docsLabel?, lib, since?`
- **`math`** — `title, summary, formula?, symbols[{sym, means}], prereqs[],
  docs?, docsLabel?`

**The filename is the id.** `<Py id="broadcasting">` resolves to
`src/content/py/broadcasting.mdx`. `check_links.py` verifies these.

### Authoring rules

- `docs` must be a valid URL (`z.url()`), or the build fails.
- Extras must never be required by a chapter. Link them as offers, not steps.
- Every `py` entry's `rust` field is an **analogy, not a translation**. Where
  there is no Rust equivalent (broadcasting, `**kwargs`, decorators, autograd),
  say so explicitly rather than inventing one.
- Every `math` entry names every symbol. That is the entire point of the page.

---

## 7. Design system

All in `src/styles/global.css`. Light only, by request.

**Colour always means something.** This is the rule that lets the site be
colourful and calm at once — learn the palette once, read it at a glance forever.

| Token | Means |
|---|---|
| `--accent` (teal) | the path: links, nav, Run buttons |
| `--amber` | sidetracks: "nice to know", `SideQuest` |
| `--rust` | the bridge back to Rust |
| `--violet` | mathematics |
| `--berry` | you, doing something: `TryThis` |
| `--sky` | `Wonder` — the zoom-out |
| `--leaf` | it worked |
| `--red` | where people get hurt |

**Type.** Source Serif 4 at 18.5px over a 34rem measure for body (you read this
for a fortnight; a serif at a comfortable measure is kinder). Nunito (`--hand`)
for headings and all UI — that is where the friendlier feel comes from. JetBrains
Mono for code. All self-hosted via Fontsource; no font CDN.

**Drawings.** `src/lib/doodles.ts`. Stroke-based SVG, colours from CSS custom
properties, every group passed through `filter="url(#pencil)"` — one
`feTurbulence` + `feDisplacementMap` defined once in `Base.astro`. That single
filter is what makes exact geometry look hand-drawn and, more usefully, makes all
25 look drawn by the *same hand*. `chapterDoodle` maps chapter id → drawing.

**Pip**, the mascot, is not decoration: Pip rolls downhill, which is literally the
algorithm the subject is built on, so Pip on a slope in chapter 5 is the joke and
the lesson in one picture.

---

## 7b. Running it in Docker

**Two independent stacks, owned by different people.** This is the single most
important thing to understand before changing any of it.

| Stack | File | Who runs it | Contains |
|---|---|---|---|
| Site | `compose.yaml`, `Dockerfile` | whoever deploys | nginx + prerendered HTML + vendored Pyodide |
| Kernel | `kernel/compose.yaml`, `kernel/Dockerfile` | **each reader, locally** | uv + Jupyter + CPU torch |

```bash
docker compose up --build        # the site  → http://localhost:4321
cd kernel && docker compose up   # the kernel → 127.0.0.1:8899
```

### Why they are separate

A Jupyter kernel executes arbitrary Python. It therefore **cannot be shared
between visitors to a hosted site** — not as a hardening measure, but because
the concept does not work: one shared interpreter, many strangers, mutable
global state.

So when the site is deployed publicly, the reader clones the repo and runs the
kernel on their own machine, and the page in *their* browser talks to *their*
localhost. The site's server is never in the path. Everything needed for that
lives in `kernel/`, which is self-contained on purpose.

### The three settings that connect them

Set in `kernel/.env` (copy from `.env.example`) or inline.

| Variable | Default | Needed when |
|---|---|---|
| `GRADIENT_KERNEL_PORT` | `8899` | the port is taken |
| `GRADIENT_KERNEL_TOKEN` | `gradient` | you want a non-default token |
| `GRADIENT_SITE_ORIGIN` | *(none)* | **the site is not on your machine** |

`GRADIENT_SITE_ORIGIN` is the one that bites. `scripts/kernel.sh` builds
Jupyter's `allow_origin_pat` from it, always allowing localhost and appending
the named origin with regex metacharacters escaped — an unescaped
`ml.example.com` would also match `mlXexample.com`.

The reader sets the URL/token in the site's runtime panel and presses **Test
connection**.

### How the probe works, and why it is not a one-liner

`probeJupyter()` in `src/scripts/runtime.ts` makes **two** requests, and the
reason is worth knowing before anyone "simplifies" it:

Jupyter does **not** attach `Access-Control-Allow-Origin` to a 403. So when it
rejects a bad token or a disallowed origin, the browser refuses to show the
response to JavaScript and `fetch` throws the *same* `TypeError` it throws when
nothing is listening at all. One request cannot tell those apart.

So the probe first issues a `mode: "no-cors"` request, which cannot read the
reply but *does* resolve rather than throw when a server answered. That one bit
separates "nothing is listening" from "something is there and refused you".

Verified states: `ok`, `bad-token` (running but refused), `unreachable` (nothing
there), `mixed-content` (HTTPS page, plain-HTTP non-loopback target).

### Traps specific to the images

- **Pyodide is vendored at image build time**, so the running site container
  needs no network. The *build* does.
- **`.wasm` must be served as `application/wasm`** or the browser refuses to
  stream-compile it and every Run button fails opaquely. Stated explicitly in
  `docker/nginx.conf` rather than trusting the base image's mime map.
- **The site publishes on all interfaces; the kernel publishes on loopback
  only.** Deliberate asymmetry — one is documents, the other is an interpreter.
- **`scripts/kernel.sh` binds `127.0.0.1` by default**; the image overrides it
  with `GRADIENT_KERNEL_BIND=0.0.0.0`, because a published port cannot reach a
  process bound to loopback *inside* the container.
- **The kernel image installs torch from PyTorch's CPU index**, not PyPI.
  The default wheels bundle 3.3 GB of nvidia CUDA libraries plus 817 MB of
  Triton that a GPU-less container can never use. This is done in the Dockerfile
  and deliberately *not* in `lab/pyproject.toml`, because on macOS the host build
  is CPU/MPS-only already and pinning a CPU index there would take MPS away from
  anyone running `bash kernel/run.sh` natively.
- **No GPU in any container.** Docker on macOS cannot reach Metal. Chapter 10's
  `best_device()` correctly reports `cpu`. Use `bash kernel/run.sh` for MPS.
- **Jupyter refuses to start as root and exits.** In a container that presents
  as a restart loop with no obvious cause — the logs end on a `[C]` line about
  `--allow-root` and nothing else looks wrong. The image therefore creates a
  `gradient` user (uid 1000) and runs as it, which is right anyway for a process
  that executes arbitrary Python. `scripts/kernel.sh` also passes `--allow-root`
  when it detects uid 0, as a safety net.
- **Healthchecks must use `127.0.0.1`, not `localhost`.** Inside the container
  `localhost` resolves to `::1` as well, busybox wget tries IPv6 first, and
  nginx listens only on `0.0.0.0` — so the check reports "connection refused"
  against a server that is serving fine. Cost an unhealthy container that was
  answering 200 the whole time.
- **A liveness healthcheck must accept 403.** Unauthenticated `/api/status`
  returns 403, `urlopen` raises on that, and the naive check marks a perfectly
  healthy kernel unhealthy. See `kernel/healthcheck.py`: anything that answers
  counts as up.
- **Rebuilding an image with the same tag does not always recreate the
  container.** After `docker compose build`, use `up -d --force-recreate`, or you
  will spend a while debugging a container still running the previous image.
  `docker inspect <name> --format '{{.Image}}'` against `docker images` settles
  it immediately.

---

## 8. Verification — run this before landing anything

```bash
rm -rf node_modules/.astro .astro && bun run build \
  && uv run --project lab python scripts/check_cells.py --deep \
  && uv run --project lab python scripts/check_links.py \
  && bun run check \
  && uv run --project lab ruff check .
```

Expected: **39 pages · 253 cells all passing · 2274 links resolve · 0 type errors
· lint clean.**

- **`check_cells.py`** extracts every runnable cell from `chapters/` *and*
  `extras/` and executes them **in document order, one namespace per file** —
  exactly how a reader meets them. `--deep` includes `local` (torch) cells;
  without it they are skipped.
- **`check_links.py`** walks `dist/` and verifies every internal link *and
  anchor*, which is how appendix-id typos get caught.

### ⚠ The checker does not verify prose

It proves the code runs. It cannot tell you that a sentence claiming "over 100×"
sits above a cell printing `84x`.

**If you change a cell, re-read the prose around it.** Real errors caught this
way while writing: a claimed 100× that was 84×; a "reconstructs the distribution"
claim for a mis-derived diffusion sampler producing 0.71 instead of 1.0; a cell
whose own printed conclusion ("underflowed to exactly zero") was false; an
RNN-decay demo that demonstrated no decay at all; a pipeline described as
"matching the baseline" that was below it.

---

## 9. Traps

Hard-won. Each of these cost real time.

1. **Astro 7 / Sätteri runs no remark plugins.** If cells stop rendering or maths
   appears as raw `$…$`, someone removed `markdown.processor: unified({…})` from
   `astro.config.mjs`.

2. **Deleting a content file is not enough.** The content layer persists to
   `node_modules/.astro/data-store.json`, which survives `rm -rf .astro`. A build
   then fails with `Rolldown failed to resolve import
   "astro:content-layer-deferred-module?…fileName=…"` naming the *deleted* file.
   Fix: `rm -rf node_modules/.astro .astro`.

3. **Astro ignores `src/pages/` files starting with `_`.** A page named
   `_doodles.astro` 404s silently.

4. **`Ref.astro` must be built from `<span>`s only.** The card sits inline in
   running prose, and an HTML parser closes the surrounding `<p>` the instant it
   meets a `<div>` or `<pre>`. There is a comment saying so in the file.

5. **Popover cards need `:popover-open`, not `display: block`.** A plain
   `.refcard { display: block }` overrides the UA rule and paints every card into
   the page. There is a `@supports not selector(:popover-open)` fallback.

6. **The SVG defs block must not be `display: none`.** Safari drops filters
   defined inside a `display:none` subtree. `.svg-defs` uses
   `position:absolute; clip-path: inset(50%)` instead.

7. **The Pyodide worker is a *module* worker.** Classic workers with
   `importScripts` fail two ways (cross-origin blocks, and some browsers only
   permit module workers). It uses a dynamic `import()` of `pyodide.mjs`.

8. **Never put `[tool.ruff]` in `lab/pyproject.toml`.** Ruff prefers the nearest
   config, so it silently shadows the root `ruff.toml` and `scripts/` stops being
   linted by the same rules. There is a comment at the bottom of the pyproject
   saying so.

9. **TypeScript is pinned to `^6`.** `astro check` needs the programmatic API,
   which the 7.x Go compiler does not yet expose.

10. **`check_cells.py` registers a real `types.ModuleType` in `sys.modules`.**
    `@dataclass` resolves annotations via `sys.modules[cls.__module__]`, so a bare
    dict namespace breaks it.

11. **macOS python.org builds ship without a CA bundle.** Every dataset and
    pretrained-weight download fails with an opaque SSL error until the user runs
    `open "/Applications/Python 3.14/Install Certificates.command"`. `kernel.sh`
    and `check_cells.py` defensively point `SSL_CERT_FILE` at certifi.

12. **`src/pages/doodles-qa.astro` is a dev-only gallery** of all 25 drawings.
    Useful for reviewing the art; delete it if you ever ship this publicly.

13. **MPS has no `float64`**, and some ops fall back to CPU — hence
    `PYTORCH_ENABLE_MPS_FALLBACK=1` in `kernel.sh`. For small networks MPS is
    *slower* than CPU (kernel-launch overhead). Measure, don't assume.

14. **`lab/notebooks/` is generated.** Edit chapters, then
    `bun run notebooks`. Hand edits are lost. It is excluded from ruff for the
    same reason.

---

## 10. Voice and pedagogy

The prose was deliberately revised away from a terse documentation register. If
you write here, match it:

- Warm, curious, direct address. Short sentences. No filler enthusiasm, no
  exclamation spam, no condescension.
- **Set up a pattern the reader believes, then run it backwards** until the
  surprising thing is forced. (Chapter 9 asks *why right-to-left?* rather than
  asserting it; chapter 12 makes you notice a one-hot times a matrix is a row
  lookup.)
- Name the reader's likely feeling: *"if that felt like a cheat, good."*
- Be honest about weak results. Chapter 15's anomaly detector reports 14%
  detection at a 5% false-alarm rate, because that is what it gets.

Three components come from Perkins (§11) and encode the pedagogy:

- **`Stuck`** — *work on the hard parts*. Sticking points are known in advance;
  naming them stops everyone tripping privately and concluding they're the stupid
  one. Written in the reader's own words, closed by default.
- **`TryThis`** — the learning happens in the gap between the question and the
  answer, so the answer is folded, with a separate `hint` slot before it.
- **`Wonder`** — the zoom-out. Never load-bearing, always open, because you should
  stumble into these rather than go looking.

---

## 11. Sources

- **Seth Weidman, *Deep Learning from Scratch*** (O'Reilly, 2019) — the
  mathematics and from-scratch implementations were checked against this. Note:
  the supplied file was *labelled* as the fastai book and contains Weidman's.
- **Howard & Gugger, *Deep Learning for Coders with fastai and PyTorch***
  (O'Reilly, 2020) — the teaching philosophy: top-down, working first, theory when
  needed.
- **David Perkins, *Making Learning Whole*** (Jossey-Bass, 2009) — the structural
  pass. His principles are why chapter 1 trains a classifier before defining a
  term, why `Stuck` exists, why the map is at the front, and why chapter 16 is
  about learning without a curriculum.

Specific results are cited inline where they appear (Cybenko/Hornik, Vaswani et
al., Kaplan et al., Hoffmann et al., Belkin et al., He et al.).

---

## 12. Opinionated claims

Flagged so nobody mistakes them for settled fact:

- *"Gradient boosting usually beats neural networks on tabular data."* Well
  supported, not universal, contested at the margins.
- *"Build it by hand first."* The argument is debuggability. It is an argument,
  not a proof.
- *"Depth is exponentially more efficient than width."* Empirical, well-evidenced,
  not a theorem.
- *"Frame the problem before you model."* Least controversial, most ignored.

---

## 13. Git

Two commits: `e5cb047` (initial) and `ef78da5` ("Learn ML with astro"). The
content-enrichment, language and illustration passes sit uncommitted on top —
check `git status` before assuming anything is saved.
