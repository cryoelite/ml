/* ============================================================================
   Two Python backends, one interface.

     browser  Pyodide in a worker. Works offline, works when deployed, works
              for a stranger who clicked a link. No torch — WebAssembly has no
              wheel for it — so it covers everything up to and including
              hand-rolled neural networks in numpy.

     local    A Jupyter kernel on the reader's own machine, reached over the
              standard kernel websocket. Real torch, real MPS, real fastai.

   The site defaults to `browser` precisely because that is the mode with no
   prerequisites. Chapters that genuinely need torch mark their cells `local`
   and say so in the chrome rather than failing mysteriously.
   ========================================================================== */

export type State = "idle" | "loading" | "ready" | "error";

export interface Sink {
  stream(name: string, text: string): void;
  result(html: string | null, text: string): void;
  display(mime: string, data: string): void;
  error(text: string): void;
}

export interface Backend {
  readonly id: "browser" | "local";
  readonly label: string;
  start(): Promise<void>;
  exec(code: string, sink: Sink): Promise<void>;
  restart(): Promise<void>;
  dispose(): void;
}

const PYODIDE_VERSION = "314.0.6";
/**
 * Ordered candidates. `/pyodide/` is the copy vendored by `bun run vendor`:
 * it works offline and sidesteps the cross-origin worker restrictions that
 * some browsers and sandboxes impose on `importScripts`. The CDN is the
 * fallback for a fresh checkout that has not vendored yet.
 */
const PYODIDE_INDEXES = [
  "/pyodide/",
  `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
];

const LS_BACKEND = "gradient.backend";
const LS_JUPYTER_URL = "gradient.jupyter.url";
const LS_JUPYTER_TOKEN = "gradient.jupyter.token";

export const DEFAULT_JUPYTER_URL = "http://127.0.0.1:8899";
export const DEFAULT_JUPYTER_TOKEN = "gradient";

/* -------------------------------------------------------------------------- */
/* Connection probe                                                            */
/* -------------------------------------------------------------------------- */

export type ProbeResult = {
  ok: boolean;
  /** Machine-readable so the UI can style it; the message is for the human. */
  kind: "ok" | "bad-token" | "mixed-content" | "unreachable" | "http-error";
  message: string;
  hint?: string;
};

/**
 * Ask a Jupyter server whether it is there, and say precisely what went wrong
 * when it is not.
 *
 * This matters more than it looks. `fetch` collapses every interesting failure
 * — no server, wrong port, CORS rejection, mixed-content block — into the same
 * opaque TypeError, so a naive "connection failed" leaves the reader with four
 * possibilities and no way to tell them apart. Everything below exists to turn
 * that one TypeError back into an actionable sentence.
 */
export async function probeJupyter(url: string, token: string): Promise<ProbeResult> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return { ok: false, kind: "unreachable", message: `"${url}" is not a valid URL`,
             hint: "It should look like http://127.0.0.1:8899" };
  }

  const base = url.replace(/\/+$/, "");
  const pageIsHttps = location.protocol === "https:";
  const targetIsHttp = target.protocol === "http:";
  const loopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(target.hostname);

  // A page served over HTTPS may not talk to a plaintext non-loopback address:
  // the browser blocks it before a request is ever made, so there is no point
  // trying and no useful error to report afterwards.
  if (pageIsHttps && targetIsHttp && !loopback) {
    return {
      ok: false,
      kind: "mixed-content",
      message: "Blocked: this page is HTTPS and that address is plain HTTP",
      hint: "Browsers only allow an insecure exception for localhost and 127.0.0.1. "
          + "Point this at 127.0.0.1, or serve your kernel over HTTPS.",
    };
  }

  // Step 1 — is anything listening at all?
  //
  // This has to be a separate no-cors request, and the reason is subtle enough
  // to be worth writing down. Jupyter does NOT attach Access-Control-Allow-Origin
  // to a 403, so when it rejects a token or an origin the browser refuses to
  // show the response to JavaScript and fetch throws the *same* TypeError it
  // throws when nothing is listening. A no-cors request cannot read the reply,
  // but it does resolve rather than throw when a server answered — which is
  // exactly the one bit we cannot otherwise obtain.
  let somethingIsListening = false;
  try {
    await fetch(`${base}/api/status`, { mode: "no-cors", cache: "no-store" });
    somethingIsListening = true;
  } catch {
    somethingIsListening = false;
  }

  // Step 2 — a real request we are allowed to read.
  try {
    const res = await fetch(
      `${base}/api/status?token=${encodeURIComponent(token)}`,
      { method: "GET", cache: "no-store" },
    );
    if (res.status === 403 || res.status === 401) {
      return { ok: false, kind: "bad-token",
               message: `Reached the server, but it rejected the token (${res.status})`,
               hint: "Copy the token the kernel printed on startup into the field above." };
    }
    if (!res.ok) {
      return { ok: false, kind: "http-error",
               message: `Reached the server, but it answered ${res.status} ${res.statusText}` };
    }
    const info = (await res.json().catch(() => ({}))) as { version?: string };
    return { ok: true, kind: "ok",
             message: `Connected${info.version ? ` — Jupyter ${info.version}` : ""}` };
  } catch {
    if (somethingIsListening) {
      // A server answered but would not let us read the answer. Jupyter hides
      // the status code here, so name both causes rather than guessing one.
      return {
        ok: false,
        kind: "bad-token",
        message: `Something is running on ${base}, but it refused this page`,
        hint: `Either the token is wrong, or the kernel was not told to accept `
            + `requests from ${location.origin}. Restart it with `
            + `GRADIENT_SITE_ORIGIN=${location.origin} — see the Setup page.`,
      };
    }
    const hint = pageIsHttps && targetIsHttp && loopback
      ? "Chrome and Firefox allow HTTPS pages to reach 127.0.0.1; Safari does not. "
        + "If you are on Safari, try another browser or run the site locally."
      : "Start one with `bash kernel/run.sh`, or `cd kernel && docker compose up`. "
        + "If it is already running, check the port matches.";
    return { ok: false, kind: "unreachable", message: `Nothing is listening on ${base}`, hint };
  }
}

/* -------------------------------------------------------------------------- */
/* Pyodide                                                                     */
/* -------------------------------------------------------------------------- */

class PyodideBackend implements Backend {
  readonly id = "browser" as const;
  readonly label = "Browser (Pyodide)";
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, { sink: Sink; done: () => void }>();

  constructor(private onStatus: (s: State, detail: string) => void) {}

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    // A module worker: Pyodide ships ESM, and some browsers only allow this kind.
    const w = new Worker("/pyodide-worker.js", { type: "module" });
    w.onmessage = (e) => this.route(e.data);
    w.onerror = (e) => this.onStatus("error", e.message || "worker failed to start");
    this.worker = w;
    return w;
  }

  private route(msg: any) {
    if (msg.type === "status") {
      this.onStatus(msg.state as State, msg.detail ?? "");
      return;
    }
    const entry = this.pending.get(msg.id);
    if (!entry) return;
    switch (msg.type) {
      case "stream":  entry.sink.stream(msg.name, msg.text); break;
      case "result":  entry.sink.result(msg.html ?? null, msg.text ?? ""); break;
      case "display": entry.sink.display(msg.mime, msg.data); break;
      case "error":   entry.sink.error(msg.text); break;
      case "done":    this.pending.delete(msg.id); entry.done(); break;
    }
  }

  async start() {
    this.onStatus("loading", "starting Pyodide");
    this.ensureWorker().postMessage({ type: "init", indexURLs: PYODIDE_INDEXES });
  }

  exec(code: string, sink: Sink): Promise<void> {
    const id = ++this.seq;
    const w = this.ensureWorker();
    return new Promise((resolve) => {
      this.pending.set(id, { sink, done: resolve });
      w.postMessage({ type: "exec", id, code, indexURLs: PYODIDE_INDEXES });
    });
  }

  async restart() {
    this.dispose();
    await this.start();
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}

/* -------------------------------------------------------------------------- */
/* Local Jupyter kernel                                                        */
/* -------------------------------------------------------------------------- */

// Tracebacks arrive wrapped in terminal colour codes; strip them for the page.
const ANSI = new RegExp("\\[[0-9;]*m", "g");

const uuid = () =>
  crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

class JupyterBackend implements Backend {
  readonly id = "local" as const;
  readonly label = "Local kernel";
  private ws: WebSocket | null = null;
  private kernelId = "";
  private session = uuid();
  private waiters = new Map<string, { sink: Sink; done: () => void }>();
  private opening: Promise<void> | null = null;

  constructor(
    private base: string,
    private token: string,
    private onStatus: (s: State, detail: string) => void,
  ) {
    this.base = base.replace(/\/+$/, "");
  }

  private auth(url: string) {
    return url + (url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(this.token);
  }

  async start(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.opening) return this.opening;
    this.opening = this.open().finally(() => {
      this.opening = null;
    });
    return this.opening;
  }

  private async open(): Promise<void> {
    this.onStatus("loading", "contacting " + this.base);
    let res: Response;
    try {
      res = await fetch(this.auth(`${this.base}/api/kernels`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "python3" }),
      });
    } catch (err) {
      this.onStatus("error", `cannot reach ${this.base} — is \`bun run kernel\` running?`);
      throw err;
    }
    if (!res.ok) {
      const detail =
        res.status === 403
          ? "403 — wrong or missing token"
          : `${res.status} ${res.statusText}`;
      this.onStatus("error", detail);
      throw new Error(detail);
    }
    const kernel = await res.json();
    this.kernelId = kernel.id;

    const wsBase = this.base.replace(/^http/, "ws");
    const url = this.auth(
      `${wsBase}/api/kernels/${this.kernelId}/channels?session_id=${this.session}`,
    );

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.onopen = () => {
        this.onStatus("ready", "kernel " + this.kernelId.slice(0, 8));
        resolve();
      };
      ws.onerror = () => {
        this.onStatus("error", "websocket refused");
        reject(new Error("websocket refused"));
      };
      ws.onclose = () => {
        this.ws = null;
        this.onStatus("idle", "kernel disconnected");
      };
      ws.onmessage = (e) => this.route(e.data);
      this.ws = ws;
    });
  }

  private route(raw: string) {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const parent = msg.parent_header?.msg_id;
    if (!parent) return;
    const entry = this.waiters.get(parent);
    if (!entry) return;
    const c = msg.content ?? {};

    switch (msg.msg_type) {
      case "stream":
        entry.sink.stream(c.name ?? "stdout", c.text ?? "");
        break;
      case "execute_result":
      case "display_data": {
        const data = c.data ?? {};
        if (data["image/png"]) entry.sink.display("image/png", data["image/png"]);
        else if (data["text/html"]) entry.sink.result(data["text/html"], data["text/plain"] ?? "");
        else if (data["text/plain"]) entry.sink.result(null, data["text/plain"]);
        break;
      }
      case "error":
        entry.sink.error(
          ((c.traceback ?? []).join("\n") || `${c.ename}: ${c.evalue}`).replace(ANSI, ""),
        );
        break;
      case "status":
        if (c.execution_state === "idle") {
          this.waiters.delete(parent);
          entry.done();
        }
        break;
    }
  }

  async exec(code: string, sink: Sink): Promise<void> {
    await this.start();
    const ws = this.ws;
    if (!ws) {
      sink.error("No kernel connection.");
      return;
    }

    const msgId = uuid();
    return new Promise<void>((resolve) => {
      this.waiters.set(msgId, { sink, done: resolve });
      ws.send(
        JSON.stringify({
          header: {
            msg_id: msgId,
            session: this.session,
            username: "gradient",
            date: new Date().toISOString(),
            msg_type: "execute_request",
            version: "5.3",
          },
          parent_header: {},
          metadata: {},
          buffers: [],
          channel: "shell",
          content: {
            code,
            silent: false,
            store_history: true,
            user_expressions: {},
            allow_stdin: false,
            stop_on_error: true,
          },
        }),
      );
      // A kernel that dies mid-cell must not wedge the queue forever.
      setTimeout(() => {
        if (this.waiters.delete(msgId)) {
          sink.error("Timed out after 10 minutes.");
          resolve();
        }
      }, 600_000);
    });
  }

  async restart() {
    if (this.kernelId) {
      try {
        await fetch(this.auth(`${this.base}/api/kernels/${this.kernelId}/restart`), {
          method: "POST",
        });
      } catch {
        /* fall through and reconnect from scratch */
      }
    }
    this.dispose();
    await this.start();
  }

  dispose() {
    this.ws?.close();
    this.ws = null;
    this.waiters.clear();
  }
}

/* -------------------------------------------------------------------------- */
/* Manager: one queue, because a notebook is sequential by definition          */
/* -------------------------------------------------------------------------- */

export class Runtime {
  private backend: Backend | null = null;
  private queue: Promise<void> = Promise.resolve();
  private listeners = new Set<(s: State, detail: string, mode: string) => void>();
  state: State = "idle";
  detail = "";

  get mode(): "browser" | "local" {
    const v = localStorage.getItem(LS_BACKEND);
    return v === "local" ? "local" : "browser";
  }
  get jupyterUrl() {
    return localStorage.getItem(LS_JUPYTER_URL) || DEFAULT_JUPYTER_URL;
  }
  get jupyterToken() {
    return localStorage.getItem(LS_JUPYTER_TOKEN) || DEFAULT_JUPYTER_TOKEN;
  }

  configure(mode: "browser" | "local", url?: string, token?: string) {
    localStorage.setItem(LS_BACKEND, mode);
    if (url !== undefined) localStorage.setItem(LS_JUPYTER_URL, url);
    if (token !== undefined) localStorage.setItem(LS_JUPYTER_TOKEN, token);
    this.backend?.dispose();
    this.backend = null;
    this.emit("idle", "switched to " + mode);
  }

  onStatus(fn: (s: State, detail: string, mode: string) => void) {
    this.listeners.add(fn);
    fn(this.state, this.detail, this.mode);
    return () => this.listeners.delete(fn);
  }

  private emit(s: State, detail: string) {
    this.state = s;
    this.detail = detail;
    for (const fn of this.listeners) fn(s, detail, this.mode);
  }

  private ensure(): Backend {
    if (this.backend) return this.backend;
    const cb = (s: State, d: string) => this.emit(s, d);
    this.backend =
      this.mode === "local"
        ? new JupyterBackend(this.jupyterUrl, this.jupyterToken, cb)
        : new PyodideBackend(cb);
    return this.backend;
  }

  /** Warm the backend without running anything, so the first Run feels instant. */
  prewarm() {
    void this.ensure()
      .start()
      .catch(() => {});
  }

  /** Enqueue a cell. Resolves once that cell — and everything before it — is done. */
  run(code: string, sink: Sink): Promise<void> {
    const task = this.queue.then(() =>
      this.ensure()
        .exec(code, sink)
        .catch((e) => sink.error(String(e))),
    );
    this.queue = task.catch(() => {});
    return task;
  }

  async restart() {
    this.queue = Promise.resolve();
    await this.ensure().restart();
  }
}

export const runtime = new Runtime();
