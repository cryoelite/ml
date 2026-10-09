# Gradient — maintainer overview

Gradient is a static Astro site that teaches machine learning through short explanations and runnable examples. The intended reader may be new to both programming and ML. The main course moves from problem framing and simple models to neural networks, language models, evaluation, and practical use.

The home page offers several ways into the subject: a complete beginner route, a practical data-project route, a deep-learning route, and a language-model route. Optional articles and searchable Python and maths references add depth without blocking the main path.

## Principles for changes

- Keep explanations direct and define terms before relying on them.
- Connect model choice to the task, data, and cost of mistakes.
- Show a working example, explain its result, and check it on data the model did not train on.
- Be honest about uncertainty, data limits, and possible harm.
- Keep each lesson usable on its own and preserve its existing content ID.
- Keep executable cells working in document order. Explain when a local PyTorch kernel is required.
- Cite current information from official documentation or original research.
- Update this guide when the architecture or content model changes.

## Content and interface

| Path | Purpose |
|---|---|
| `src/pages/index.astro` | Entry page, learning routes, practical workflow, field overview |
| `src/content/chapters/` | Main lessons; order comes from frontmatter |
| `src/content/extras/` | Optional deeper topics |
| `src/content/py/` | Python reference entries |
| `src/content/math/` | Maths reference entries |
| `src/pages/appendix/` | Searchable Python and maths reference pages |
| `src/pages/map.astro` and `src/lib/conceptmap.ts` | Interactive map of the field |
| `src/components/` | Lesson components, code cells, callouts, navigation |
| `src/scripts/runtime.ts` | Browser and local Python backends |
| `src/scripts/client.ts` | Progressive enhancement for the site |
| `src/styles/global.css` | Site design and responsive styles |
| `src/pages/colophon.mdx` | Reader-facing notes about the course and its sources |
| `README.md` | Quick start and developer commands |
| `AGENTS.md` | Writing and maintenance guidance |

## Runnable examples

A Markdown code fence such as ` ```python run ` becomes an interactive cell during the Astro build. Cells share page state and run in order. Use `local` for a cell that requires PyTorch. The default browser backend is Pyodide; PyTorch lessons connect to a local Jupyter kernel. The kernel is never shared between site visitors.

The lesson files are the source of truth for exported notebooks. Rebuild notebooks with `bun run notebooks` instead of editing generated notebooks directly.

## Version

`package.json` contains the only version number. `src/lib/version.ts` reads it for the masthead, footer, and generator metadata. Increase it there when preparing a release.

## Checks

- `bun run check` — Astro and TypeScript diagnostics.
- `bun run build` — static site build.
- `bun run check:links` — build and verify internal links and anchors.
- `bun run check:cells` — run Python examples and exercises.
- `bun run check:subpath` — build and check links under `/ml/`.

Use the checks that match the files changed. Run the cell checker when changing executable code.

## Sources

The course uses *Deep Learning for Coders with fastai and PyTorch* by Jeremy Howard and Sylvain Gugger for its practical, application-first approach and *Making Learning Whole* by David Perkins for its emphasis on learning through a complete task, focused practice on difficult parts, and independent learning. See the course colophon for the full source list and links.
