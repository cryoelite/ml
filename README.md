# Gradient 3.0

A practical introduction to machine learning for people who are new to the field. Start with a model you can run in your browser, learn how to check its predictions, and choose a path into the parts of ML that interest you.

## Start learning

Open the site and begin with [Chapter 1](/learn/01-where-this-fits/). Most examples run in the page with no installation. The [setup guide](/setup/) explains the few lessons that use a local PyTorch kernel.

You can also choose a goal:

- **Learn the foundations:** follow the chapters in order.
- **Solve a data problem:** start with problem framing, evaluation, and model choice.
- **Learn deep learning:** start with neural networks, then move to PyTorch, vision, and language models.
- **Understand language models:** learn embeddings, attention, transformers, and next-token prediction.

The home page links to each path and to further free courses and official documentation.

## What you will learn

The course covers supervised and unsupervised learning, regression and classification, model evaluation, overfitting, decision trees, neural networks, PyTorch, computer vision, embeddings, transformers, large language models, and practical deployment. Optional articles cover topics such as data cleaning, model debugging, reinforcement learning, model harms, and research methods.

You do not need to know calculus or Python before you start. Python examples explain each new idea as it appears. Use the Python and maths appendices when you want a reference.

## Run the site locally

With Docker:

```bash
docker compose up --build
```

Or with Bun:

```bash
bun run setup
bun run dev
```

## Python runtimes

Most code runs in the browser through Pyodide. The lessons marked for a local kernel use PyTorch and run on your own computer. The site never runs a shared Python kernel for its visitors. See `/setup/` for platform-specific instructions.

## Useful commands

| Command | Purpose |
|---|---|
| `bun run dev` | Start the development server |
| `bun run build` | Build the static site |
| `bun run check` | Check Astro and TypeScript files |
| `bun run check:links` | Build the site and check internal links |
| `bun run check:cells` | Run the Python examples and exercises |
| `bun run kernel` | Start the local Jupyter kernel for PyTorch lessons |
| `bun run notebooks` | Export notebooks from the lesson content |

Read [AGENTS.md](AGENTS.md) before changing the course. It explains the writing approach, content structure, and checks. `package.json` is the single source of truth for the site version.
