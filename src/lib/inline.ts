/**
 * Frontmatter strings are plain text, but writing `np.array` without a code
 * span in a sentence about code reads badly. This gives those fields exactly
 * one piece of Markdown — inline code — and nothing else, so a stray asterisk
 * in a docstring can never turn into emphasis.
 */
const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function inlineCode(src: string): string {
  const escaped = src.replace(/[&<>"]/g, (c) => ESCAPE[c]!);
  return escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
}
