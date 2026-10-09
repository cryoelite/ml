# Working on Gradient

## Goal

Gradient helps people understand machine learning and use it sensibly. Readers may have no programming or machine learning background. Explain the subject in plain language, show where each method fits, and connect ideas to decisions people can make in practice.

## Writing

- Use short, direct sentences and familiar words. Keep one main idea in each paragraph.
- Define a technical term the first time it matters. Give a concrete example before adding exceptions or notation.
- Explain what a method does, what it is useful for, how to check it, and where it can fail.
- Do not assume the reader knows Python, statistics, calculus, or software engineering. Link to the appendix or explain only the required part where it appears.
- Avoid dramatic hooks, suspense, sales language, repeated summaries, forced jokes, and claims such as “the whole point” when a direct explanation will do.
- Be precise about limits. A model learns patterns from its data; it does not automatically understand the task or know when it is wrong.
- Keep optional detail optional, but never hide a safety or evaluation issue that changes how a model should be used.
- Prefer small, realistic examples. Make the reader do something, then explain what the result means.
- Use external sources for factual claims that can change. Prefer original research, official documentation, and maintained course materials. Link sources close to the claim or list them on the page.
- Treat the supplied books as references. Explain ideas in original wording; do not copy passages or reproduce their examples at length.

## Course structure

- The chapters in `src/content/chapters/` form the main learning path. They should work in order and should not require an optional extra.
- `src/content/extras/` holds optional topics and further detail.
- `src/content/py/` and `src/content/math/` hold searchable references used by the lessons.
- Keep the home page useful on its own: show how to start, offer routes for different goals, describe practical uses, and link to the broader field.
- Preserve runnable `python run` examples and their order. Add `local` only when a cell needs the local kernel. Do not hand-edit files under `lab/notebooks/`; regenerate them from the lesson content.
- Keep frontmatter valid for the schemas in `src/content.config.ts`. Preserve file IDs and links unless all references are updated.
- Keep the browser experience usable on small screens, with keyboard navigation and reduced-motion support.

## Project map

- `src/pages/index.astro`: course home and learning routes.
- `src/content/chapters/*.mdx`: main lessons.
- `src/content/extras/*.mdx`: optional lessons.
- `src/content/py/*.mdx`, `src/content/math/*.mdx`: reference entries.
- `src/components/`: reusable lesson and interface components.
- `src/scripts/`: browser interactions and code execution.
- `src/styles/global.css`: site styles.
- `src/lib/version.ts`: reads the version from `package.json`.
- `SUMMARY.md`: maintainer overview.

## Checks

For content or UI changes, run `bun run check` and `bun run build`. For prose or links, also run `bun run check:links`. If runnable code changes, run `bun run check:cells`. If pages must work below a URL prefix, run `bun run check:subpath`.

Bump the version in `package.json`; do not hard-code a second version in the interface.
