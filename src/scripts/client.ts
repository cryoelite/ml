/* ============================================================================
   Progressive enhancement, all of it.

   Every page is complete, readable and navigable as static HTML. This file
   only ever *adds*: it makes code cells runnable, gives reference chips a
   hover card, lights up the right-hand rail, and exposes the runtime switch.
   If it fails to load, the tutorial still works — you just cannot press Run.
   ========================================================================== */

import { runtime, DEFAULT_JUPYTER_URL, DEFAULT_JUPYTER_TOKEN, type Sink, probeJupyter } from "./runtime";
import { wireFruitDemo } from "./demo";

/* -------------------------------------------------------------------------- */
/* Code cells                                                                  */
/* -------------------------------------------------------------------------- */

function makeSink(out: HTMLElement): Sink {
  const append = (cls: string, text: string) => {
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = text;
    out.appendChild(span);
  };
  return {
    stream(name, text) {
      append(name === "stderr" ? "out-err" : "out-stream", text);
    },
    result(html, text) {
      if (html) {
        // Kernel/Pyodide HTML (a DataFrame table, say). Sanitised by removing
        // anything executable: this is our own Python, but the discipline is free.
        const wrap = document.createElement("div");
        wrap.innerHTML = html;
        // pandas ships a <style> block inside _repr_html_; the page has its own
        // table styling, and the raw CSS otherwise lands in copy-paste.
        wrap.querySelectorAll("script,iframe,object,embed,link,style").forEach((n) => n.remove());
        wrap.querySelectorAll("*").forEach((el) => {
          for (const attr of [...el.attributes]) {
            if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
          }
        });
        out.appendChild(wrap);
      } else if (text) {
        append("out-res", text.endsWith("\n") ? text : text + "\n");
      }
    },
    display(mime, data) {
      if (mime === "image/png") {
        const img = document.createElement("img");
        img.src = "data:image/png;base64," + data;
        img.alt = "Figure produced by this cell";
        img.loading = "lazy";
        out.appendChild(img);
      }
    },
    error(text) {
      append("out-err", text.endsWith("\n") ? text : text + "\n");
    },
  };
}

interface CellApi {
  el: HTMLElement;
  code: string;
  needsLocal: boolean;
  run(): Promise<void>;
}

const cellsOnPage: CellApi[] = [];

function wireCells() {
  const nodes = [...document.querySelectorAll<HTMLElement>(".cell")];
  if (!nodes.length) return;

  for (const el of nodes) {
    const code = decodeURIComponent(el.dataset.code ?? "");
    const needsLocal = el.dataset.local === "true";
    const out = el.querySelector<HTMLElement>(".cell__out")!;
    const runBtn = el.querySelector<HTMLButtonElement>(".cell__btn--run")!;
    const aboveBtn = el.querySelector<HTMLButtonElement>(".cell__btn--above");
    const clearBtn = el.querySelector<HTMLButtonElement>(".cell__btn--clear");
    const hint = el.querySelector<HTMLElement>(".cell__hint");

    const api: CellApi = {
      el,
      code,
      needsLocal,
      async run() {
        out.hidden = false;
        out.textContent = "";
        el.classList.add("is-running");
        runBtn.disabled = true;
        try {
          await runtime.run(code, makeSink(out));
        } finally {
          el.classList.remove("is-running");
          runBtn.disabled = false;
          if (!out.textContent?.trim() && !out.children.length) {
            out.innerHTML = '<span class="out-stream" style="opacity:.55">(no output)</span>';
          }
        }
      },
    };
    cellsOnPage.push(api);

    runBtn.addEventListener("click", () => void api.run());

    aboveBtn?.addEventListener("click", async () => {
      const idx = cellsOnPage.indexOf(api);
      for (const c of cellsOnPage.slice(0, idx + 1)) await c.run();
    });

    clearBtn?.addEventListener("click", () => {
      out.hidden = true;
      out.textContent = "";
    });

    // Ctrl/Cmd+Enter inside the cell runs it, like every notebook ever.
    el.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void api.run();
      }
    });

    // Tell the reader *before* they hit Run that this one needs the local kernel.
    if (needsLocal && hint) {
      const sync = () => {
        hint.hidden = runtime.mode === "local";
      };
      runtime.onStatus(sync);
      sync();
    }
  }

  // The first Run should not also be the first 12 MB download.
  const warm = () => runtime.prewarm();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        warm();
      }
    },
    { rootMargin: "400px" },
  );
  io.observe(nodes[0]);
}

/* -------------------------------------------------------------------------- */
/* Runtime widget                                                              */
/* -------------------------------------------------------------------------- */

function wireRuntimeWidget() {
  const root = document.querySelector<HTMLElement>(".runtime");
  if (!root) return;
  const btn = root.querySelector<HTMLButtonElement>(".runtime__btn")!;
  const dot = root.querySelector<HTMLElement>(".runtime__dot")!;
  const label = root.querySelector<HTMLElement>(".runtime__label")!;
  const panel = root.querySelector<HTMLDialogElement>(".runtime__panel")!;
  const detailEl = panel.querySelector<HTMLElement>(".runtime__detail")!;
  const urlInput = panel.querySelector<HTMLInputElement>('input[name="url"]')!;
  const tokenInput = panel.querySelector<HTMLInputElement>('input[name="token"]')!;
  const restartBtn = panel.querySelector<HTMLButtonElement>(".runtime__restart")!;

  urlInput.value = runtime.jupyterUrl;
  tokenInput.value = runtime.jupyterToken;
  urlInput.placeholder = DEFAULT_JUPYTER_URL;
  tokenInput.placeholder = DEFAULT_JUPYTER_TOKEN;

  for (const radio of panel.querySelectorAll<HTMLInputElement>('input[name="backend"]')) {
    radio.checked = radio.value === runtime.mode;
    radio.addEventListener("change", () => {
      if (radio.checked) {
        runtime.configure(radio.value as "browser" | "local", urlInput.value, tokenInput.value);
      }
    });
  }
  for (const input of [urlInput, tokenInput]) {
    input.addEventListener("change", () => {
      runtime.configure(runtime.mode, urlInput.value, tokenInput.value);
    });
  }

  restartBtn.addEventListener("click", () => void runtime.restart());

  // Test connection. Deliberately separate from switching runtime: a reader
  // whose kernel is not up should find that out here, with a sentence telling
  // them why, rather than by pressing Run on a cell and watching it fail.
  const probeBtn = panel.querySelector<HTMLButtonElement>(".runtime__probe");
  const resultEl = panel.querySelector<HTMLElement>(".runtime__result");
  if (probeBtn && resultEl) {
    probeBtn.addEventListener("click", async () => {
      // Persist whatever is in the fields first, so testing and running agree.
      runtime.configure(runtime.mode, urlInput.value, tokenInput.value);
      probeBtn.disabled = true;
      resultEl.dataset.kind = "testing";
      resultEl.textContent = "Testing…";
      const r = await probeJupyter(
        urlInput.value || DEFAULT_JUPYTER_URL,
        tokenInput.value || DEFAULT_JUPYTER_TOKEN,
      );
      resultEl.dataset.kind = r.kind;
      resultEl.textContent = (r.ok ? "\u2713 " : "\u2717 ") + r.message;
      if (r.hint) {
        const b = document.createElement("b");
        b.textContent = r.hint;
        resultEl.appendChild(b);
      }
      probeBtn.disabled = false;
    });
  }

  runtime.onStatus((state, detail, mode) => {
    dot.dataset.state = state;
    label.textContent = mode === "local" ? "Local kernel" : "Browser";
    const words: Record<string, string> = {
      idle: "not started",
      loading: "starting…",
      ready: "ready",
      error: "problem",
    };
    detailEl.textContent = `${words[state] ?? state}${detail ? " — " + detail : ""}`;
    btn.title = `Python runtime: ${mode} (${words[state] ?? state})`;
  });

  btn.addEventListener("click", () => {
    if (panel.open) panel.close();
    else panel.show();
  });
  document.addEventListener("click", (e) => {
    if (panel.open && !panel.contains(e.target as Node) && !btn.contains(e.target as Node)) {
      panel.close();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.open) panel.close();
  });
}

/* -------------------------------------------------------------------------- */
/* Reference hover cards                                                       */
/* -------------------------------------------------------------------------- */

function place(card: HTMLElement, trigger: HTMLElement) {
  const t = trigger.getBoundingClientRect();
  card.style.visibility = "hidden";
  card.style.left = "0px";
  card.style.top = "0px";
  const c = card.getBoundingClientRect();
  const margin = 10;

  let left = t.left + t.width / 2 - c.width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - c.width - margin));

  const below = window.innerHeight - t.bottom;
  const top = below > c.height + margin || below > t.top ? t.bottom + 8 : t.top - c.height - 8;

  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(Math.max(margin, top))}px`;
  card.style.visibility = "";
}

function wireRefs() {
  const triggers = document.querySelectorAll<HTMLElement>(".ref[data-card]");
  let openCard: HTMLElement | null = null;
  let openTrigger: HTMLElement | null = null;
  let showTimer = 0;
  let hideTimer = 0;

  const close = () => {
    if (!openCard) return;
    (openCard as any).hidePopover?.();
    openTrigger?.setAttribute("aria-expanded", "false");
    openCard = null;
    openTrigger = null;
  };

  const open = (trigger: HTMLElement) => {
    const card = document.getElementById(trigger.dataset.card!);
    if (!card || card === openCard) return;
    close();
    (card as any).showPopover?.();
    place(card, trigger);
    trigger.setAttribute("aria-expanded", "true");
    openCard = card;
    openTrigger = trigger;
  };

  for (const trigger of triggers) {
    const card = document.getElementById(trigger.dataset.card!);
    if (!card) continue;

    const scheduleOpen = () => {
      clearTimeout(hideTimer);
      clearTimeout(showTimer);
      showTimer = window.setTimeout(() => open(trigger), 140);
    };
    const scheduleClose = () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(close, 220);
    };

    trigger.addEventListener("mouseenter", scheduleOpen);
    trigger.addEventListener("mouseleave", scheduleClose);
    trigger.addEventListener("focus", () => open(trigger));
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      if (openCard === card) close();
      else open(trigger);
    });
    card.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    card.addEventListener("mouseleave", scheduleClose);
  }

  window.addEventListener("scroll", () => openCard && openTrigger && place(openCard, openTrigger), {
    passive: true,
  });
  window.addEventListener("resize", close);
  document.addEventListener("keydown", (e) => e.key === "Escape" && close());
}

/* -------------------------------------------------------------------------- */
/* Right rail scroll-spy                                                       */
/* -------------------------------------------------------------------------- */

function wireRail() {
  const links = [...document.querySelectorAll<HTMLAnchorElement>(".rail a[href^='#']")];
  if (!links.length) return;
  const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const targets = [...byId.keys()]
    .map((id) => document.getElementById(id))
    .filter((n): n is HTMLElement => !!n);

  let current: HTMLAnchorElement | null = null;
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const link = byId.get(entry.target.id);
        if (!link || link === current) continue;
        current?.classList.remove("is-active");
        link.classList.add("is-active");
        current = link;
      }
    },
    { rootMargin: "-72px 0px -70% 0px", threshold: 0 },
  );
  targets.forEach((t) => spy.observe(t));
}

/* -------------------------------------------------------------------------- */
/* Misc chrome                                                                 */
/* -------------------------------------------------------------------------- */

function wireNavToggle() {
  const btn = document.querySelector<HTMLButtonElement>(".nav-toggle");
  const nav = document.querySelector<HTMLElement>(".sidebar");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const wasHidden = nav.hasAttribute("hidden");
    nav.toggleAttribute("hidden", !wasHidden);
    btn.setAttribute("aria-expanded", String(wasHidden));
  });

  // The drawer only exists on narrow screens. Track the query rather than
  // sampling it once, so widening the window always restores the sidebar.
  const narrow = window.matchMedia("(max-width: 860px)");
  const sync = () => {
    nav.toggleAttribute("hidden", narrow.matches);
    btn.setAttribute("aria-expanded", String(!narrow.matches));
  };
  narrow.addEventListener("change", sync);
  sync();
}

/**
 * The concept map is 1483px wide by design — at that size the labels are
 * readable. On a narrow screen that means scrolling in two directions to find
 * anything, so default those to the scaled-down overview instead.
 */
function wireConceptMaps() {
  for (const map of document.querySelectorAll<HTMLElement>(".conceptmap")) {
    const input = map.querySelector<HTMLInputElement>(".cm-fit__input");
    const scroll = map.querySelector<HTMLElement>(".conceptmap__scroll");
    if (!input || !scroll) continue;

    const apply = (fit: boolean) => {
      map.classList.toggle("is-fit", fit);
      input.checked = fit;
    };
    input.addEventListener("change", () => apply(input.checked));

    // Fit by default when the map cannot fit at its natural size anyway — and
    // never turn fitting *off* for a map that was rendered fitted on purpose
    // (the compact one on the front page), because unfitting it re-introduces
    // the clipped-map bug this whole function exists to avoid.
    const svg = map.querySelector("svg");
    const natural = Number(svg?.getAttribute("width") ?? 0);
    apply(input.checked || (natural > 0 && scroll.clientWidth < natural * 0.95));
  }
}

/** Filter box on the appendix pages. */
function wireFilter() {
  const bar = document.querySelector<HTMLElement>(".filterbar");
  if (!bar) return;
  const input = bar.querySelector<HTMLInputElement>("input")!;
  const chips = [...bar.querySelectorAll<HTMLButtonElement>(".chip")];
  const entries = [...document.querySelectorAll<HTMLElement>(".entry")];
  let tag = "";

  const apply = () => {
    const q = input.value.trim().toLowerCase();
    for (const entry of entries) {
      const hay = (entry.dataset.search ?? "").toLowerCase();
      const matchQ = !q || hay.includes(q);
      const matchTag = !tag || entry.dataset.lib === tag;
      entry.hidden = !(matchQ && matchTag);
    }
  };
  input.addEventListener("input", apply);
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const value = chip.dataset.lib ?? "";
      tag = tag === value ? "" : value;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.lib === tag)));
      apply();
    });
  }
}

/* -------------------------------------------------------------------------- */

function boot() {
  wireCells();
  wireRuntimeWidget();
  wireRefs();
  wireRail();
  wireNavToggle();
  wireConceptMaps();
  wireFilter();
  wireFruitDemo();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
