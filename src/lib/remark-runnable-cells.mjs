import { visit } from "unist-util-visit";

/**
 * Turns a fenced code block whose meta contains `run` into a <Cell/> JSX node.
 *
 *     ```python run
 *     import numpy as np
 *     np.arange(5)
 *     ```
 *
 * becomes `<Cell code={"import numpy..."} lang="python" />`, which the MDX
 * `components` map resolves to src/components/Cell.astro at render time.
 *
 * Authoring content stays plain Markdown; interactivity is bolted on by the
 * pipeline rather than by hand-writing JSX around every snippet.
 *
 * Supported meta flags, space separated after `run`:
 *   local          this cell needs the local Jupyter kernel (torch, fastai, GPU)
 *   autorun        execute as soon as the runtime is ready
 *   setup          part of the page's setup preamble; runs before any other cell
 *   title="..."    caption shown in the cell chrome
 */

/** Build the estree literal MDX needs for an expression attribute. */
function literalAttr(name, value) {
  return {
    type: "mdxJsxAttribute",
    name,
    value: {
      type: "mdxJsxAttributeValueExpression",
      value: JSON.stringify(value),
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          comments: [],
          body: [
            {
              type: "ExpressionStatement",
              expression: { type: "Literal", value, raw: JSON.stringify(value) },
            },
          ],
        },
      },
    },
  };
}

function boolAttr(name) {
  return {
    type: "mdxJsxAttribute",
    name,
    value: {
      type: "mdxJsxAttributeValueExpression",
      value: "true",
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          comments: [],
          body: [
            {
              type: "ExpressionStatement",
              expression: { type: "Literal", value: true, raw: "true" },
            },
          ],
        },
      },
    },
  };
}

const RUNNABLE_LANGS = new Set(["python", "py", "python3"]);

export function remarkRunnableCells() {
  return (tree, file) => {
    // Only rewrite inside MDX, where JSX nodes are meaningful.
    const path = file?.history?.[0] ?? "";
    if (!path.endsWith(".mdx")) return;

    let index = 0;
    visit(tree, "code", (node, i, parent) => {
      if (!parent || i === null || i === undefined) return;
      if (!node.lang || !RUNNABLE_LANGS.has(node.lang)) return;
      const meta = node.meta ?? "";
      if (!/(^|\s)run(\s|$)/.test(meta)) return;

      const titleMatch = meta.match(/title="([^"]*)"/);
      const attrs = [
        literalAttr("code", node.value),
        literalAttr("cellIndex", index++),
      ];
      if (/(^|\s)local(\s|$)/.test(meta)) attrs.push(boolAttr("local"));
      if (/(^|\s)autorun(\s|$)/.test(meta)) attrs.push(boolAttr("autorun"));
      if (/(^|\s)setup(\s|$)/.test(meta)) attrs.push(boolAttr("setup"));
      if (titleMatch) attrs.push(literalAttr("title", titleMatch[1]));

      parent.children[i] = {
        type: "mdxJsxFlowElement",
        name: "Cell",
        attributes: attrs,
        children: [],
      };
    });
  };
}
