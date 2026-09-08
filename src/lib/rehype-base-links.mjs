/**
 * Prefix every root-absolute href/src in rendered Markdown with the site base.
 *
 * The chapters cross-reference each other constantly — `[Chapter 8](/learn/…)`
 * appears 61 times across the content — and none of those survive a subpath
 * deployment, because Astro does not rewrite literal URLs inside Markdown.
 *
 * Doing it here means authors keep writing ordinary root-absolute links and the
 * build works out where the site actually lives. Runs on the rendered HTML tree,
 * so it catches links, images and anything else carrying a URL attribute.
 */
import { visit } from "unist-util-visit";

const ATTRS = ["href", "src"];

export function rehypeBaseLinks() {
  // Read at build time; Astro's `base` comes from the same variable.
  const raw = process.env.SITE_BASE || "";
  const base = raw.replace(/\/$/, "");

  return (tree) => {
    if (!base) return;                       // deployed at the root: nothing to do
    visit(tree, "element", (node) => {
      const props = node.properties;
      if (!props) return;
      for (const attr of ATTRS) {
        const value = props[attr];
        if (typeof value !== "string") continue;
        if (!value.startsWith("/")) continue;      // relative, anchor, or external
        if (value.startsWith("//")) continue;      // protocol-relative
        if (value === base || value.startsWith(base + "/")) continue;  // already done
        props[attr] = base + value;
      }
    });
  };
}
