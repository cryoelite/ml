/**
 * The fruit demo on the front page.
 *
 * It is a two-feature logistic regression, trained by gradient descent, drawn
 * on a canvas — which is to say it is chapters four and five of this site,
 * running in about a hundred lines, with the maths hidden and the picture
 * showing. Somebody who has never programmed can play with it for thirty
 * seconds and come away with the one idea the whole site is about: you supply
 * examples, and the rule comes back.
 *
 * Deliberately not a toy version of the real thing. It *is* the real thing —
 * the same loss, the same update, the same everything — just small.
 */

type Label = 0 | 1; // 0 = blueberry, 1 = apple
interface Point { x: number; y: number; label: Label }

/** Where the boundary lives: sweetness*w0 + size*w1 + b = 0. */
interface Model { w0: number; w1: number; b: number }

const COLOURS = {
  0: { dot: "#4a6fb5", soft: "rgba(74, 111, 181, 0.13)", name: "blueberry" },
  1: { dot: "#c0392b", soft: "rgba(192, 57, 43, 0.13)", name: "apple" },
} as const;

/* A starting handful, so nobody meets an empty box and wonders what to do.
   Sweetness on x, size on y, both 0..1. Apples: big, middling sweet.
   Blueberries: small, very sweet. Jittered by hand so it looks like data
   rather than a diagram. */
const SEED: Point[] = [
  { x: 0.30, y: 0.72, label: 1 }, { x: 0.42, y: 0.83, label: 1 },
  { x: 0.22, y: 0.63, label: 1 }, { x: 0.47, y: 0.66, label: 1 },
  { x: 0.36, y: 0.90, label: 1 }, { x: 0.55, y: 0.78, label: 1 },
  { x: 0.74, y: 0.26, label: 0 }, { x: 0.86, y: 0.34, label: 0 },
  { x: 0.66, y: 0.17, label: 0 }, { x: 0.90, y: 0.14, label: 0 },
  { x: 0.78, y: 0.40, label: 0 }, { x: 0.62, y: 0.30, label: 0 },
];

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function wireFruitDemo() {
  const root = document.querySelector<HTMLElement>(".fruit");
  if (!root) return;

  const canvas = root.querySelector<HTMLCanvasElement>(".fruit__canvas");
  const status = root.querySelector<HTMLElement>(".fruit__status");
  const teach = root.querySelector<HTMLButtonElement>('[data-fruit="teach"]');
  const reset = root.querySelector<HTMLButtonElement>('[data-fruit="reset"]');
  const tools = [...root.querySelectorAll<HTMLInputElement>('input[name="fruit-tool"]')];
  if (!canvas || !status || !teach || !reset) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let points: Point[] = SEED.map((p) => ({ ...p }));
  let model: Model | null = null;
  let animating = false;
  let asked: { x: number; y: number; p: number } | null = null;

  const tool = () => tools.find((t) => t.checked)?.value ?? "1";

  /* ---- geometry ------------------------------------------------------- */
  /* The canvas is sized in CSS pixels but drawn at device resolution, so
     every draw starts by resetting the transform to the pixel ratio. */
  let W = 0, H = 0;
  function resize() {
    const r = canvas!.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas!.width = Math.round(W * dpr);
    canvas!.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  const PAD = 26;
  const toPx = (x: number, y: number) => [
    PAD + x * (W - PAD * 2),
    (H - PAD) - y * (H - PAD * 2),
  ] as const;
  const toData = (px: number, py: number) => [
    (px - PAD) / (W - PAD * 2),
    ((H - PAD) - py) / (H - PAD * 2),
  ] as const;

  /* ---- drawing -------------------------------------------------------- */
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    // Decision regions. A coarse grid is plenty — the boundary is a straight
    // line, so the only place the resolution shows is along the edge, and the
    // line itself is drawn on top anyway.
    if (model) {
      const step = 8;
      for (let px = PAD; px < W - PAD; px += step) {
        for (let py = PAD; py < H - PAD; py += step) {
          const [x, y] = toData(px, py);
          const p = sigmoid(model.w0 * x + model.w1 * y + model.b);
          ctx.fillStyle = p > 0.5 ? COLOURS[1].soft : COLOURS[0].soft;
          ctx.fillRect(px, py, step, step);
        }
      }
    }

    // Frame and axis hints.
    ctx.strokeStyle = "#ded9ca";
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD + 0.5, PAD + 0.5, W - PAD * 2 - 1, H - PAD * 2 - 1);
    ctx.fillStyle = "#8b8779";
    ctx.font = '500 11px "Inter Variable", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("sweeter →", W / 2, H - 8);
    ctx.save();
    ctx.translate(11, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("bigger →", 0, 0);
    ctx.restore();

    // The boundary.
    if (model) {
      const { w0, w1, b } = model;
      const pts: Array<readonly [number, number]> = [];
      // Where the line crosses each edge of the unit square.
      for (const x of [0, 1]) {
        const y = -(w0 * x + b) / (w1 || 1e-9);
        if (y >= 0 && y <= 1) pts.push(toPx(x, y));
      }
      for (const y of [0, 1]) {
        const x = -(w1 * y + b) / (w0 || 1e-9);
        if (x >= 0 && x <= 1) pts.push(toPx(x, y));
      }
      if (pts.length >= 2) {
        ctx.strokeStyle = "#0f7a63";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.stroke();
      }
    }

    // The examples.
    for (const p of points) {
      const [px, py] = toPx(p.x, p.y);
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = COLOURS[p.label].dot;
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = "#fdfbf6";
      ctx.stroke();
    }

    // The thing you asked about.
    if (asked) {
      const [px, py] = toPx(asked.x, asked.y);
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#211f1b";
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#211f1b";
      ctx.font = '700 12px "Nunito Variable", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("?", px, py + 4);
    }
  }

  /* ---- learning ------------------------------------------------------- */
  function accuracy(m: Model) {
    let right = 0;
    for (const p of points) {
      const guess = sigmoid(m.w0 * p.x + m.w1 * p.y + m.b) > 0.5 ? 1 : 0;
      if (guess === p.label) right++;
    }
    return points.length ? right / points.length : 0;
  }

  function say(html: string) { status!.innerHTML = html; }

  function learn() {
    const labels = new Set(points.map((p) => p.label));
    if (labels.size < 2) {
      say("Put at least one of <em>each</em> fruit on the board first — with only one kind, there is nothing to tell apart.");
      return;
    }
    if (animating) return;
    animating = true;
    asked = null;
    teach!.disabled = true;

    // Start somewhere useless on purpose. Watching it move from nonsense to
    // sensible is the whole point of the button.
    const m: Model = { w0: Math.random() * 2 - 1, w1: Math.random() * 2 - 1, b: 0 };
    model = m;

    const lr = 3.0;
    let step = 0;
    const TOTAL = 900;

    const tick = () => {
      // Several gradient steps per frame: one per frame would take fifteen
      // seconds, which is longer than anyone will watch.
      for (let k = 0; k < 12 && step < TOTAL; k++, step++) {
        let g0 = 0, g1 = 0, gb = 0;
        for (const p of points) {
          const err = sigmoid(m.w0 * p.x + m.w1 * p.y + m.b) - p.label;
          g0 += err * p.x; g1 += err * p.y; gb += err;
        }
        const n = points.length;
        m.w0 -= lr * g0 / n; m.w1 -= lr * g1 / n; m.b -= lr * gb / n;
      }
      draw();
      const acc = accuracy(m);
      say(`Trying... it gets <strong>${Math.round(acc * 100)}%</strong> of your fruit right so far.`);
      if (step < TOTAL) {
        requestAnimationFrame(tick);
      } else {
        animating = false;
        teach!.disabled = false;
        finish(acc);
      }
    };
    requestAnimationFrame(tick);
  }

  async function finish(acc: number) {
    if (acc === 1) {
      say(
        `Done — the line separates <strong>every single one</strong>. ` +
        `Switch to <strong>ask it</strong> and click anywhere: it will tell you which fruit it thinks belongs there.`,
      );
      try {
        const { default: confetti } = await import("canvas-confetti");
        const r = canvas!.getBoundingClientRect();
        confetti({
          particleCount: 60,
          spread: 65,
          startVelocity: 26,
          scalar: 0.8,
          disableForReducedMotion: true,
          origin: {
            x: (r.left + r.width / 2) / window.innerWidth,
            y: (r.top + r.height / 2) / window.innerHeight,
          },
        });
      } catch { /* confetti is decoration; never let it break the demo */ }
    } else {
      say(
        `Done — the best line it could find gets <strong>${Math.round(acc * 100)}%</strong> right. ` +
        `The rest are on the wrong side, and no straight line can fix that. ` +
        `That is a real limit, and chapter eight is about getting past it.`,
      );
    }
  }

  /* ---- input ---------------------------------------------------------- */
  canvas.addEventListener("click", (e) => {
    if (animating) return;
    const r = canvas.getBoundingClientRect();
    const [x, y] = toData(e.clientX - r.left, e.clientY - r.top);
    if (x < -0.02 || x > 1.02 || y < -0.02 || y > 1.02) return;
    const cx = Math.min(1, Math.max(0, x));
    const cy = Math.min(1, Math.max(0, y));

    if (tool() === "ask") {
      if (!model) { say("Press <strong>teach it</strong> first — right now it has no idea."); return; }
      const p = sigmoid(model.w0 * cx + model.w1 * cy + model.b);
      asked = { x: cx, y: cy, p };
      const which = p > 0.5 ? COLOURS[1].name : COLOURS[0].name;
      const sure = Math.round(Math.max(p, 1 - p) * 100);
      say(`It says <strong>${which}</strong>, and it is ${sure}% sure. Nobody ever showed it that spot.`);
    } else {
      points.push({ x: cx, y: cy, label: Number(tool()) as Label });
      model = null;
      asked = null;
      say("Added. Add as many as you like, then press <strong>teach it</strong>.");
    }
    draw();
  });

  reset.addEventListener("click", () => {
    points = SEED.map((p) => ({ ...p }));
    model = null;
    asked = null;
    say("Back to the fruit we started with.");
    draw();
  });

  teach.addEventListener("click", learn);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
}
