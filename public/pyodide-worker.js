/* ============================================================================
   Pyodide worker — the "runs anywhere" Python backend.

   Kept in a worker so a long-running training loop never freezes the page.
   Deliberately dependency-free and loaded from a CDN at runtime: Pyodide is
   ~12 MB of WebAssembly and has no business inside the site bundle.

   Protocol (main -> worker):
     { type: "init", indexURLs }
     { type: "exec", id, code, indexURLs }
     { type: "reset" }
   Protocol (worker -> main):
     { type: "status",  state, detail }
     { type: "stream",  id, name, text }
     { type: "display", id, mime, data }
     { type: "result",  id, html, text }
     { type: "error",   id, text }
     { type: "done",    id }
   ========================================================================== */


/**
 * Pyodide wraps user code, so a traceback opens with four frames from
 * _pyodide/_base.py that mean nothing to the reader. Keep the header, the
 * frames that are actually theirs, and the exception line.
 */
function cleanTraceback(text) {
  const lines = text.split("\n");
  const out = [];
  let skipping = false;
  for (const raw of lines) {
    const isFrame = /^\s*File "/.test(raw);
    if (isFrame) {
      skipping = /_pyodide[/\\]_base\.py|pyodide[/\\]webloop\.py|python3\d*\.zip/.test(raw);
      if (skipping) continue;
    } else if (skipping && /^\s/.test(raw)) {
      continue; // the source line belonging to a skipped frame
    } else {
      skipping = false;
    }
    out.push(raw);
  }
  const cleaned = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return cleaned || text;
}

let pyodide = null;
let booting = null;

const post = (msg) => self.postMessage(msg);

/* Python-side helpers. Defined once, used after every execution. */
const PRELUDE = `
import sys, io, base64, builtins, warnings

# We harvest figures ourselves after every cell, so plt.show() under the AGG
# backend is a no-op by design — its warning is noise, not information.
warnings.filterwarnings(
    "ignore",
    message=r".*non-interactive.*cannot be shown.*",
    category=UserWarning,
)

def __gradient_format(value):
    """Render a returned value the way a notebook would."""
    if value is None:
        return None
    html = None
    fn = getattr(value, "_repr_html_", None)
    if callable(fn):
        try:
            html = fn()
        except Exception:
            html = None
    try:
        text = repr(value)
    except Exception as exc:
        text = f"<unrepresentable: {exc!r}>"
    if len(text) > 40000:
        text = text[:40000] + "\\n... [output truncated]"
    return {"html": html, "text": text}

def __gradient_figures():
    """Drain any pending matplotlib figures into base64 PNGs."""
    if "matplotlib.pyplot" not in sys.modules:
        return []
    import matplotlib.pyplot as plt
    from matplotlib._pylab_helpers import Gcf
    out = []
    # Go through the figure managers rather than plt.figure(num): re-fetching a
    # figure by number is deprecated, and it warns from inside our own code.
    for manager in list(Gcf.get_all_fig_managers()):
        fig = manager.canvas.figure
        buf = io.BytesIO()
        try:
            # Any warning raised here comes from our harvesting, not from the
            # reader's code, so it is ours to swallow rather than to show.
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                fig.savefig(buf, format="png", dpi=110, bbox_inches="tight",
                            facecolor="white")
            out.append(base64.b64encode(buf.getvalue()).decode("ascii"))
        except Exception:
            pass
        plt.close(fig)
    return out
`;

/**
 * Try each candidate index URL in order. The first is the vendored copy under
 * /pyodide/ (offline, deterministic, and immune to the cross-origin worker
 * restrictions several browsers apply); the CDN is the fallback for a checkout
 * where `bun run vendor` has not been run yet.
 *
 * This is a *module* worker, so `importScripts` does not exist — it is the ESM
 * build (pyodide.mjs) reached through a dynamic import.
 */
async function loadRuntime(candidates) {
  const failures = [];
  for (const indexURL of candidates) {
    try {
      const mod = await import(/* @vite-ignore */ indexURL + "pyodide.mjs");
      const loadPyodide = mod.loadPyodide ?? mod.default?.loadPyodide;
      if (typeof loadPyodide !== "function") throw new Error("no loadPyodide export");
      return { loadPyodide, indexURL };
    } catch (err) {
      failures.push(`${indexURL} (${err && err.message ? err.message : err})`);
    }
  }
  throw new Error("could not load pyodide.mjs from: " + failures.join("; "));
}

async function boot(candidates) {
  post({ type: "status", state: "loading", detail: "loading Pyodide" });
  const { loadPyodide, indexURL } = await loadRuntime(candidates);
  post({
    type: "status",
    state: "loading",
    detail: indexURL.startsWith("http") ? "from CDN" : "from this site",
  });
  pyodide = await loadPyodide({ indexURL });

  post({ type: "status", state: "loading", detail: "configuring matplotlib" });
  // AGG keeps plotting headless; we harvest figures ourselves after each cell.
  await pyodide.runPythonAsync(`
import os
os.environ.setdefault("MPLBACKEND", "AGG")
`);
  await pyodide.runPythonAsync(PRELUDE);

  post({ type: "status", state: "ready", detail: pyodide.version });
  return pyodide;
}

async function ensure(candidates) {
  if (pyodide) return pyodide;
  if (!booting) {
    booting = boot(candidates).catch((err) => {
      booting = null;
      post({ type: "status", state: "error", detail: String(err) });
      throw err;
    });
  }
  return booting;
}

self.onmessage = async (event) => {
  const msg = event.data;

  if (msg.type === "init") {
    try { await ensure(msg.indexURLs); } catch { /* already reported */ }
    return;
  }

  if (msg.type === "reset") {
    pyodide = null;
    booting = null;
    post({ type: "status", state: "idle", detail: "namespace cleared" });
    return;
  }

  if (msg.type !== "exec") return;
  const { id, code } = msg;

  try {
    await ensure(msg.indexURLs);
  } catch (err) {
    post({ type: "error", id, text: "Could not start Pyodide: " + err });
    post({ type: "done", id });
    return;
  }

  // `batched` hands us one line at a time with the newline already stripped,
  // so put it back — otherwise print() output runs into the cell's return value.
  const line = (name) => (t) => post({ type: "stream", id, name, text: t + "\n" });
  pyodide.setStdout({ batched: line("stdout") });
  pyodide.setStderr({ batched: line("stderr") });

  try {
    // Pull in numpy/pandas/etc. purely by reading the import statements.
    await pyodide.loadPackagesFromImports(code, {
      messageCallback: (t) => post({ type: "status", state: "loading", detail: t }),
      errorCallback: () => {},
    });
    post({ type: "status", state: "ready", detail: "" });

    const value = await pyodide.runPythonAsync(code);

    // Figures first — they are usually the point of the cell.
    const figs = pyodide.globals.get("__gradient_figures")();
    for (const b64 of figs.toJs ? figs.toJs() : figs) {
      post({ type: "display", id, mime: "image/png", data: b64 });
    }
    if (figs.destroy) figs.destroy();

    if (value !== undefined) {
      const formatted = pyodide.globals.get("__gradient_format")(value);
      if (formatted !== null && formatted !== undefined) {
        const obj = formatted.toJs ? formatted.toJs({ dict_converter: Object.fromEntries }) : formatted;
        post({ type: "result", id, html: obj.html || null, text: obj.text || "" });
        if (formatted.destroy) formatted.destroy();
      }
    }
    if (value && value.destroy) value.destroy();
  } catch (err) {
    post({ type: "error", id, text: cleanTraceback(String(err?.message ?? err)) });
  } finally {
    post({ type: "done", id });
  }
};
