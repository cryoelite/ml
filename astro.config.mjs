// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { remarkRunnableCells } from "./src/lib/remark-runnable-cells.mjs";
import { rehypeBaseLinks } from "./src/lib/rehype-base-links.mjs";

/**
 * Astro 7 defaults to Sätteri, a Rust Markdown/MDX processor that is much
 * faster but deliberately does not run remark/rehype plugins. This project
 * leans on three of them — a custom one that turns ```python run fences into
 * live cells, plus KaTeX — so it opts back into the `unified` processor.
 * @astrojs/mdx inherits it automatically via `extendMarkdownConfig`.
 *
 * The site is a static, fully prerendered document. Every interactive part
 * (Python execution, popovers, the concept map) is progressive enhancement
 * layered on HTML that is already complete without it.
 */
/**
 * Where the site is mounted. Empty (the default) means the domain root, which
 * is what `bun run dev` and the plain Docker image use.
 *
 * Set SITE_BASE=/ml at BUILD time to serve it from a subpath — every generated
 * link and asset URL then carries the prefix. It has to be a build-time
 * decision because those URLs are baked into the static HTML; you cannot mount
 * a root-built site under a subpath with proxy rules alone.
 */
const BASE = process.env.SITE_BASE || undefined;

export default defineConfig({
  site: process.env.SITE_URL || "https://gradient.local",
  base: BASE,
  trailingSlash: "always",
  integrations: [mdx(), sitemap()],
  markdown: {
    processor: unified({
      gfm: true,
      smartypants: true,
      // Order matters: cells are extracted before maths touches the tree.
      remarkPlugins: [remarkRunnableCells, remarkMath],
      rehypePlugins: [
        rehypeKatex,
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "append",
            properties: { class: "heading-anchor", ariaHidden: "true", tabIndex: -1 },
            content: { type: "text", value: "#" },
          },
        ],
        // Last: rewrite hand-written root-absolute links for a subpath deploy.
        rehypeBaseLinks,
      ],
      syntaxHighlight: "shiki",
      shikiConfig: { theme: "github-light", wrap: false },
    }),
  },
  vite: {
    // Pyodide is loaded at runtime by public/pyodide-worker.js — from the
    // vendored copy in public/pyodide/, with a CDN fallback. Either way it is
    // never bundled, so keep it out of dependency optimisation.
    optimizeDeps: { exclude: ["pyodide"] },
  },
});
