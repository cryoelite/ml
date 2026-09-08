import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Four collections, four jobs.
 *
 *  chapters — the linear spine. Read in order, one "day" at a time. This is the
 *             fortnight, and it is the one thing that must not grow.
 *  extras   — full-length pieces that are genuinely worth reading and genuinely
 *             not needed in a fortnight. Nothing in the spine ever depends on
 *             one, which is exactly what makes them safe to write.
 *  py       — Python-feature appendix. Hover targets, not a reading path.
 *  math     — mathematical appendix. Same: reached from the spine, never required.
 *
 * Keeping the appendices as real collections (rather than inline asides) is what
 * lets one explanation be written once and referenced from six chapters.
 */

const chapters = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/chapters" }),
  schema: z.object({
    title: z.string(),
    // One line, shown under the title and in the concept map preview.
    blurb: z.string(),
    // Position in the linear reading order. Also the "day" of the two-week plan.
    order: z.number(),
    day: z.number(),
    part: z.enum(["orientation", "foundations", "deep-learning", "frontier", "practice"]),
    // Rough reading + doing time, in minutes.
    minutes: z.number(),
    // Concept-map node ids introduced by this chapter.
    introduces: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const extras = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/extras" }),
  schema: z.object({
    title: z.string(),
    blurb: z.string(),
    order: z.number(),
    minutes: z.number(),
    /**
     * Why this exists, which is also how the index groups them:
     *  history  — how we got here, and the roads not taken
     *  theory   — the deeper why behind something the spine states plainly
     *  craft    — things you only learn by shipping
     *  sibling  — the neighbouring method the spine had to skip
     *  culture  — the field as a human activity: papers, people, ethics
     */
    kind: z.enum(["history", "theory", "craft", "sibling", "culture"]),
    /** The chapter this hangs off, so the spine can link to it in context. */
    after: z.string().optional(),
    /** Concept-map node ids this covers. */
    covers: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const py = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/py" }),
  schema: z.object({
    // Display name, e.g. "list comprehension" or "numpy.ndarray.reshape".
    title: z.string(),
    // The one-liner that shows in the hover card. Keep it under ~140 chars.
    summary: z.string(),
    // A signature or minimal form, rendered as code at the top of the card.
    signature: z.string().optional(),
    // The single most useful example. Two or three lines, never more.
    example: z.string().optional(),
    // Expected output of `example`, if showing it clarifies things.
    output: z.string().optional(),
    // How a Rust programmer already thinks about this. Not a translation.
    rust: z.string().optional(),
    rustCode: z.string().optional(),
    // Link into the real docs, so the reader can always go deeper.
    docs: z.url().optional(),
    docsLabel: z.string().optional(),
    // "stdlib" | "numpy" | "pandas" | ...
    lib: z.string().default("python"),
    since: z.string().optional(),
  }),
});

const math = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/math" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    // The formula itself, as KaTeX-ready TeX, shown at the top of the card.
    formula: z.string().optional(),
    // What each symbol means — the thing papers assume you already know.
    symbols: z.array(z.object({ sym: z.string(), means: z.string() })).default([]),
    prereqs: z.array(z.string()).default([]),
    docs: z.url().optional(),
    docsLabel: z.string().optional(),
  }),
});

export const collections = { chapters, extras, py, math };
