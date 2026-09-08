/**
 * The site's version, read from package.json so there is exactly one place to
 * change it. Vite resolves the JSON import at build time, so nothing extra
 * ships to the browser — the string is inlined into the HTML.
 *
 * Bump `version` in package.json and every surface below follows:
 *   · the chip beside the wordmark in the masthead
 *   · the "shape of it in numbers" table in the colophon
 *   · the <meta name="generator"> tag
 */
import pkg from "../../package.json";

export const VERSION = pkg.version as string;

/** Displayed form. "1.0.0" reads better as "v1.0" in chrome. */
export const VERSION_LABEL = `v${VERSION.replace(/\.0$/, "")}`;
