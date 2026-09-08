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
export default defineConfig({
  site: "https://gradient.local",
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
      ],
      syntaxHighlight: "shiki",
      shikiConfig: { theme: "github-light", wrap: false },
    }),
  },
  vite: {
    // Pyodide is fetched from a CDN at runtime, never bundled.
    optimizeDeps: { exclude: ["pyodide"] },
  },
});
