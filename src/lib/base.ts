/**
 * Prefix a root-absolute path with the site's base.
 *
 * Astro's `base` option only rewrites URLs that Astro itself generates — script
 * and style tags, and anything built from `Astro.url`. A literal
 * `href="/setup/"` written by hand is just a string, and it survives the build
 * untouched. Under a subpath deployment that string points outside the site.
 *
 * So every hand-written internal link goes through here. Markdown links are
 * handled separately and automatically by remark-base-links.mjs.
 */

/** Astro normalises this to "/" or e.g. "/ml/". */
const BASE = import.meta.env.BASE_URL || "/";

export function withBase(path: string): string {
  if (!path.startsWith("/")) return path;          // relative or external
  if (path.startsWith("//")) return path;          // protocol-relative
  if (BASE === "/") return path;
  return BASE.replace(/\/$/, "") + path;
}
