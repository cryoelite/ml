/**
 * The drawings.
 *
 * All of it is hand-authored SVG, stroke-based, sharing one visual language:
 *
 *   - 2.2px strokes, round caps and joins, `fill="none"` unless a soft wash
 *     is doing real work (marking a region, showing a filled cluster)
 *   - colour comes from the CSS custom properties, so a doodle recolours with
 *     the palette instead of drifting away from it
 *   - every group is passed through `filter="url(#pencil)"`, one turbulence +
 *     displacement filter defined once in Base.astro. That is what makes
 *     straight lines wobble very slightly and the whole site look drawn by one
 *     hand rather than plotted by a machine.
 *
 * Pip — the little round creature — is the mascot. It exists for a reason
 * rather than for decoration: Pip rolls downhill, and rolling downhill is
 * literally the algorithm this entire subject is built on. When Pip appears on
 * a slope in chapter 5, the joke and the lesson are the same picture.
 */

export interface Doodle {
  viewBox: string;
  /** Described for screen readers; every drawing carries real information. */
  alt: string;
  body: string;
}

const INK = "var(--ink-2)";

/* --- the mascot ---------------------------------------------------------- */

/** Pip's body, drawn at the origin so the poses can share it. */
const pipBody = (fill = "var(--accent-soft)") => `
  <path d="M18 44c0-16 12-26 28-26s28 11 28 27-12 25-28 25-28-10-28-26z"
        fill="${fill}" stroke="${INK}" stroke-width="2.4"/>
  <circle cx="36" cy="42" r="3.6" fill="var(--ink)"/>
  <circle cx="57" cy="42" r="3.6" fill="var(--ink)"/>
  <circle cx="37.2" cy="40.8" r="1.15" fill="var(--paper)"/>
  <circle cx="58.2" cy="40.8" r="1.15" fill="var(--paper)"/>
  <ellipse cx="28" cy="51" rx="4.2" ry="2.6" fill="var(--berry-soft)" opacity="0.9"/>
  <ellipse cx="65" cy="51" rx="4.2" ry="2.6" fill="var(--berry-soft)" opacity="0.9"/>`;

const smile = `<path d="M40 53c2.6 3.4 9.6 3.5 12.4 0" fill="none" stroke="${INK}"
  stroke-width="2.2" stroke-linecap="round"/>`;

export const doodles: Record<string, Doodle> = {
  /* ---------------------------------------------------------------- mascot */

  pip: {
    viewBox: "0 0 92 82",
    alt: "Pip, a small round creature",
    body: `${pipBody()}${smile}
      <path d="M31 69q-3 6 1 8M61 69q3 6-1 8" fill="none" stroke="${INK}"
            stroke-width="2.2" stroke-linecap="round"/>`,
  },

  pipWave: {
    viewBox: "0 0 108 82",
    alt: "Pip waving hello",
    body: `${pipBody()}${smile}
      <path d="M72 38q10-4 13-14" fill="none" stroke="${INK}" stroke-width="2.2"
            stroke-linecap="round"/>
      <path d="M83 21l3-4M86 25l5-2M80 18l1-5" stroke="${INK}" stroke-width="2"
            stroke-linecap="round"/>
      <path d="M31 69q-3 6 1 8M61 69q3 6-1 8" fill="none" stroke="${INK}"
            stroke-width="2.2" stroke-linecap="round"/>`,
  },

  pipThink: {
    viewBox: "0 0 112 82",
    alt: "Pip thinking, with a question mark",
    body: `${pipBody("var(--sky-soft)")}
      <path d="M40 55c2.6-2.2 9.6-2.2 12.4 0" fill="none" stroke="${INK}"
            stroke-width="2.2" stroke-linecap="round"/>
      <path d="M84 33c0-5 8-5 8 0 0 4-4 3.5-4 8" fill="none" stroke="var(--sky)"
            stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="88" cy="48" r="1.8" fill="var(--sky)"/>
      <path d="M31 69q-3 6 1 8M61 69q3 6-1 8" fill="none" stroke="${INK}"
            stroke-width="2.2" stroke-linecap="round"/>`,
  },

  pipStuck: {
    viewBox: "0 0 124 84",
    alt: "Pip tangled in a knot",
    body: `${pipBody("var(--red-soft)")}
      <path d="M40 55q6-3 12 1" fill="none" stroke="${INK}" stroke-width="2.2"
            stroke-linecap="round"/>
      <path d="M88 40c-7-9 5-16 10-8s-10 11-12 1 11-13 14-2-5 15-10 13" fill="none"
            stroke="var(--red)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M31 69q-3 6 1 8M61 69q3 6-1 8" fill="none" stroke="${INK}"
            stroke-width="2.2" stroke-linecap="round"/>`,
  },

  pipCheer: {
    viewBox: "0 0 116 88",
    alt: "Pip celebrating",
    body: `${pipBody("var(--leaf-soft)")}
      <path d="M39 52c3 5 11 5 14 0" fill="none" stroke="${INK}" stroke-width="2.2"
            stroke-linecap="round"/>
      <path d="M20 36q-9-5-11-14M72 36q9-5 11-14" fill="none" stroke="${INK}"
            stroke-width="2.2" stroke-linecap="round"/>
      <path d="M95 30l2-7 2 7 7 2-7 2-2 7-2-7-7-2z" fill="var(--amber)"/>
      <path d="M14 62l1.4-5 1.4 5 5 1.4-5 1.4-1.4 5-1.4-5-5-1.4z" fill="var(--amber)"/>
      <path d="M31 69q-3 6 1 8M61 69q3 6-1 8" fill="none" stroke="${INK}"
            stroke-width="2.2" stroke-linecap="round"/>`,
  },

  /* ------------------------------------------------------- chapter openers */

  /** 01 — the inversion: what you hand over, and what comes back. */
  inversion: {
    viewBox: "0 0 200 96",
    alt: "Two machines: rules plus input make output; input plus output make rules",
    body: `
      <g font-family="var(--hand)" font-size="10" font-weight="700" fill="${INK}">
        <rect x="8" y="10" width="52" height="30" rx="8" fill="var(--paper-2)"
              stroke="${INK}" stroke-width="2.2"/>
        <text x="34" y="22" text-anchor="middle">rules +</text>
        <text x="34" y="33" text-anchor="middle">input</text>
        <path d="M64 25h22" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M80 20l6 5-6 5" fill="none" stroke="${INK}" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="90" y="10" width="52" height="30" rx="8" fill="var(--paper-2)"
              stroke="${INK}" stroke-width="2.2"/>
        <text x="116" y="29" text-anchor="middle">output</text>

        <rect x="8" y="56" width="52" height="30" rx="8" fill="var(--accent-soft)"
              stroke="var(--accent)" stroke-width="2.2"/>
        <text x="34" y="68" text-anchor="middle" fill="var(--accent-deep)">input +</text>
        <text x="34" y="79" text-anchor="middle" fill="var(--accent-deep)">output</text>
        <path d="M64 71h22" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M80 66l6 5-6 5" fill="none" stroke="var(--accent)" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="90" y="56" width="52" height="30" rx="8" fill="var(--accent-soft)"
              stroke="var(--accent)" stroke-width="2.2"/>
        <text x="116" y="75" text-anchor="middle" fill="var(--accent-deep)">rules</text>
        <path d="M152 71q14-2 18-16" fill="none" stroke="var(--berry)" stroke-width="2"
              stroke-linecap="round"/>
        <path d="M166 58l4-4 1 6" fill="none" stroke="var(--berry)" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
        <text x="178" y="46" text-anchor="middle" fill="var(--berry)" font-size="9">this
        </text><text x="178" y="56" text-anchor="middle" fill="var(--berry)" font-size="9">way!</text>
      </g>`,
  },

  /** 02 — Python, drawn kindly. */
  snake: {
    viewBox: "0 0 140 88",
    alt: "A friendly coiled snake",
    body: `
      <path d="M22 74c22 0 26-16 12-20s-24 6-10 14 40 6 46-12-8-28-22-22"
            fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"
            stroke-linejoin="round"/>
      <path d="M52 30c-6 2-10 8-9 14" fill="none" stroke="var(--amber)" stroke-width="6"
            stroke-linecap="round"/>
      <circle cx="46" cy="30" r="9" fill="var(--accent-soft)" stroke="var(--accent)"
              stroke-width="2.4"/>
      <circle cx="43" cy="28" r="1.8" fill="var(--ink)"/>
      <circle cx="49.5" cy="28" r="1.8" fill="var(--ink)"/>
      <path d="M44 34q2.5 2 5 0" fill="none" stroke="${INK}" stroke-width="1.8"
            stroke-linecap="round"/>
      <g font-family="var(--mono)" font-size="9" fill="var(--ink-3)">
        <text x="94" y="26">def</text><text x="100" y="70">[ ]</text>
      </g>`,
  },

  /** 03 — every problem is a shape, and the shape picks the tool. */
  shapes: {
    viewBox: "0 0 168 92",
    alt: "Shapes being sorted into labelled bins",
    body: `
      <g stroke="${INK}" stroke-width="2.2" fill="none" stroke-linejoin="round">
        <circle cx="22" cy="20" r="9" fill="var(--accent-soft)"/>
        <rect x="46" y="11" width="18" height="18" rx="3" fill="var(--amber-soft)"/>
        <path d="M92 11l9 18H83z" fill="var(--berry-soft)"/>
        <path d="M126 11l10 9-10 9-10-9z" fill="var(--sky-soft)"/>
      </g>
      <path d="M22 34v14M55 34v14M92 34v14M126 34v14" stroke="var(--ink-4)"
            stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round"/>
      <g font-family="var(--hand)" font-size="9.5" font-weight="700">
        <rect x="6" y="54" width="62" height="30" rx="8" fill="var(--paper-2)"
              stroke="${INK}" stroke-width="2.2"/>
        <text x="37" y="66" text-anchor="middle" fill="${INK}">which class?</text>
        <text x="37" y="78" text-anchor="middle" fill="var(--ink-3)" font-size="8.5">classification</text>
        <rect x="78" y="54" width="62" height="30" rx="8" fill="var(--paper-2)"
              stroke="${INK}" stroke-width="2.2"/>
        <text x="109" y="66" text-anchor="middle" fill="${INK}">how much?</text>
        <text x="109" y="78" text-anchor="middle" fill="var(--ink-3)" font-size="8.5">regression</text>
      </g>`,
  },

  /** 04 — a line finding its way through points. */
  lineFit: {
    viewBox: "0 0 140 92",
    alt: "A straight line fitted through scattered points",
    body: `
      <path d="M16 80V12M16 80h112" stroke="var(--ink-3)" stroke-width="2"
            stroke-linecap="round"/>
      <path d="M22 72l100-48" stroke="var(--accent)" stroke-width="2.8"
            stroke-linecap="round"/>
      <g fill="var(--berry)">
        <circle cx="32" cy="72" r="3.4"/><circle cx="46" cy="60" r="3.4"/>
        <circle cx="58" cy="58" r="3.4"/><circle cx="72" cy="44" r="3.4"/>
        <circle cx="86" cy="42" r="3.4"/><circle cx="100" cy="30" r="3.4"/>
        <circle cx="114" cy="28" r="3.4"/>
      </g>
      <g stroke="var(--berry)" stroke-width="1.6" stroke-dasharray="2 3" opacity="0.75">
        <path d="M46 60v-3.5M72 44v-3M100 30v-2M32 72v-4"/>
      </g>`,
  },

  /** 05 — the whole subject in one picture: Pip rolls downhill. */
  hill: {
    viewBox: "0 0 176 100",
    alt: "Pip rolling down a curved slope towards its lowest point",
    body: `
      <path d="M10 22C46 22 52 76 88 76s42-54 78-54" fill="none" stroke="${INK}"
            stroke-width="2.6" stroke-linecap="round"/>
      <g transform="translate(30 22) scale(0.42)">
        <path d="M18 44c0-16 12-26 28-26s28 11 28 27-12 25-28 25-28-10-28-26z"
              fill="var(--accent-soft)" stroke="${INK}" stroke-width="5"/>
        <circle cx="38" cy="42" r="6" fill="var(--ink)"/>
        <circle cx="59" cy="42" r="6" fill="var(--ink)"/>
        <path d="M40 55c4 5 12 5 16 0" fill="none" stroke="${INK}" stroke-width="4.6"
              stroke-linecap="round"/>
      </g>
      <path d="M60 40q6 5 2 10M72 52q7 3 4 9" fill="none" stroke="var(--ink-4)"
            stroke-width="2" stroke-linecap="round"/>
      <circle cx="88" cy="76" r="3.4" fill="var(--berry)"/>
      <path d="M88 84v8" stroke="var(--berry)" stroke-width="2" stroke-linecap="round"/>
      <text x="88" y="99" text-anchor="middle" font-family="var(--hand)" font-size="9"
            font-weight="700" fill="var(--berry)">the bottom</text>`,
  },

  /** 06 — the same points, two boundaries. */
  fence: {
    viewBox: "0 0 180 92",
    alt: "A wiggly boundary that memorises versus a smooth one that generalises",
    body: `
      <g>
        <rect x="6" y="10" width="74" height="60" rx="8" fill="var(--red-soft)"
              stroke="var(--red)" stroke-width="2"/>
        <path d="M14 60c8-26 12 8 20-14s10 20 18-4 12 12 20-8" fill="none"
              stroke="var(--red)" stroke-width="2.6" stroke-linecap="round"/>
        <g fill="var(--ink-2)">
          <circle cx="22" cy="26" r="2.8"/><circle cx="40" cy="22" r="2.8"/>
          <circle cx="60" cy="28" r="2.8"/>
        </g>
        <g fill="none" stroke="var(--ink-2)" stroke-width="2">
          <circle cx="26" cy="60" r="2.8"/><circle cx="48" cy="58" r="2.8"/>
          <circle cx="68" cy="56" r="2.8"/>
        </g>
        <text x="43" y="84" text-anchor="middle" font-family="var(--hand)" font-size="9.5"
              font-weight="700" fill="var(--red)">memorised</text>
      </g>
      <g transform="translate(94 0)">
        <rect x="6" y="10" width="74" height="60" rx="8" fill="var(--leaf-soft)"
              stroke="var(--leaf)" stroke-width="2"/>
        <path d="M14 56q30-22 66-12" fill="none" stroke="var(--leaf)" stroke-width="2.6"
              stroke-linecap="round"/>
        <g fill="var(--ink-2)">
          <circle cx="22" cy="26" r="2.8"/><circle cx="40" cy="22" r="2.8"/>
          <circle cx="60" cy="28" r="2.8"/>
        </g>
        <g fill="none" stroke="var(--ink-2)" stroke-width="2">
          <circle cx="26" cy="60" r="2.8"/><circle cx="48" cy="58" r="2.8"/>
          <circle cx="68" cy="56" r="2.8"/>
        </g>
        <text x="43" y="84" text-anchor="middle" font-family="var(--hand)" font-size="9.5"
              font-weight="700" fill="var(--leaf)">understood</text>
      </g>`,
  },

  /** 07 — the model zoo. */
  zoo: {
    viewBox: "0 0 168 88",
    alt: "Four labelled enclosures holding different model shapes",
    body: `
      <g stroke="${INK}" stroke-width="2.2" fill="var(--paper-2)">
        <rect x="6" y="14" width="34" height="46" rx="7"/>
        <rect x="48" y="14" width="34" height="46" rx="7"/>
        <rect x="90" y="14" width="34" height="46" rx="7"/>
        <rect x="132" y="14" width="30" height="46" rx="7"/>
      </g>
      <path d="M12 48l22-24" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M65 22v10m0 0-8 8m8-8 8 8m-16 0v8m16-8v8" stroke="var(--leaf)"
            stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <g fill="none" stroke="var(--berry)" stroke-width="2.4">
        <circle cx="101" cy="28" r="4"/><circle cx="113" cy="28" r="4"/>
        <circle cx="107" cy="46" r="4"/>
        <path d="M103 32l3 10M111 32l-2 10"/>
      </g>
      <path d="M139 50q8-24 18-2" fill="none" stroke="var(--amber)" stroke-width="2.6"
            stroke-linecap="round"/>
      <g font-family="var(--hand)" font-size="8.5" font-weight="700" fill="var(--ink-3)"
         text-anchor="middle">
        <text x="23" y="76">linear</text><text x="65" y="76">trees</text>
        <text x="107" y="76">neighbours</text><text x="147" y="76">nets</text>
      </g>`,
  },

  /** 08 — layers. */
  layers: {
    viewBox: "0 0 160 92",
    alt: "A small neural network: inputs, a hidden layer, one output",
    body: `
      <g stroke="var(--ink-4)" stroke-width="1.5" opacity="0.85">
        <path d="M30 24L78 20M30 24L78 46M30 24L78 72M30 48L78 20M30 48L78 46
                 M30 48L78 72M30 72L78 20M30 72L78 46M30 72L78 72"/>
        <path d="M78 20L128 46M78 46L128 46M78 72L128 46" stroke="var(--accent)"
              stroke-width="1.8"/>
      </g>
      <g fill="var(--paper)" stroke="${INK}" stroke-width="2.2">
        <circle cx="30" cy="24" r="7"/><circle cx="30" cy="48" r="7"/>
        <circle cx="30" cy="72" r="7"/>
      </g>
      <g fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.2">
        <circle cx="78" cy="20" r="7"/><circle cx="78" cy="46" r="7"/>
        <circle cx="78" cy="72" r="7"/>
      </g>
      <circle cx="128" cy="46" r="8" fill="var(--berry-soft)" stroke="var(--berry)"
              stroke-width="2.2"/>
      <g font-family="var(--hand)" font-size="8.5" font-weight="700" fill="var(--ink-3)"
         text-anchor="middle">
        <text x="30" y="90">in</text><text x="78" y="90">hidden</text>
        <text x="128" y="90">out</text>
      </g>`,
  },

  /** 09 — blame travelling backwards along the chain. */
  chain: {
    viewBox: "0 0 172 84",
    alt: "Signal moving forward through three stages and blame flowing back",
    body: `
      <g font-family="var(--hand)" font-size="10" font-weight="700" text-anchor="middle">
        <rect x="10" y="22" width="36" height="26" rx="7" fill="var(--paper-2)"
              stroke="${INK}" stroke-width="2.2"/>
        <text x="28" y="39" fill="${INK}">x</text>
        <rect x="66" y="22" width="36" height="26" rx="7" fill="var(--paper-2)"
              stroke="${INK}" stroke-width="2.2"/>
        <text x="84" y="39" fill="${INK}">h</text>
        <rect x="122" y="22" width="40" height="26" rx="7" fill="var(--paper-2)"
              stroke="${INK}" stroke-width="2.2"/>
        <text x="142" y="39" fill="${INK}">loss</text>
      </g>
      <g stroke="var(--accent)" stroke-width="2.4" fill="none" stroke-linecap="round">
        <path d="M48 30h14M56 26l6 4-6 4"/>
        <path d="M104 30h14M112 26l6 4-6 4"/>
      </g>
      <g stroke="var(--berry)" stroke-width="2.4" fill="none" stroke-linecap="round"
         stroke-linejoin="round">
        <path d="M118 58h-14M110 54l-6 4 6 4"/>
        <path d="M62 58H48M56 54l-6 4 6 4"/>
      </g>
      <text x="86" y="76" text-anchor="middle" font-family="var(--hand)" font-size="9"
            font-weight="700" fill="var(--berry)">blame, travelling home</text>`,
  },

  /** 10 — the torch. */
  flame: {
    viewBox: "0 0 96 92",
    alt: "A lit torch",
    body: `
      <path d="M48 12c10 12 16 18 16 28a16 16 0 01-32 0c0-10 6-16 16-28z"
            fill="var(--amber-soft)" stroke="var(--amber)" stroke-width="2.4"
            stroke-linejoin="round"/>
      <path d="M48 30c5 6 7 9 7 14a7 7 0 01-14 0c0-5 2-8 7-14z" fill="var(--berry-soft)"
            stroke="var(--berry)" stroke-width="2"/>
      <rect x="40" y="58" width="16" height="26" rx="5" fill="var(--paper-2)"
            stroke="${INK}" stroke-width="2.4"/>
      <path d="M36 60h24" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,
  },

  /** 11 — a small window sliding over an image. */
  eye: {
    viewBox: "0 0 150 88",
    alt: "A grid of pixels with a small filter window sliding across it",
    body: `
      <g stroke="var(--rule)" stroke-width="1.4">
        ${Array.from({ length: 7 }, (_, i) => `<path d="M${14 + i * 12} 14v72"/>`).join("")}
        ${Array.from({ length: 7 }, (_, i) => `<path d="M14 ${14 + i * 12}h72"/>`).join("")}
      </g>
      <rect x="14" y="14" width="72" height="72" rx="4" fill="none" stroke="${INK}"
            stroke-width="2.2"/>
      <path d="M38 62q12-26 24-2" fill="none" stroke="var(--ink-3)" stroke-width="3"
            stroke-linecap="round"/>
      <rect x="26" y="26" width="24" height="24" rx="4" fill="var(--accent-soft)"
            fill-opacity="0.75" stroke="var(--accent)" stroke-width="2.6"/>
      <path d="M94 50h16M104 45l6 5-6 5" fill="none" stroke="var(--accent)"
            stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="130" cy="50" r="10" fill="var(--berry-soft)" stroke="var(--berry)"
              stroke-width="2.4"/>
      <text x="130" y="54" text-anchor="middle" font-family="var(--hand)" font-size="10"
            font-weight="700" fill="var(--berry)">!</text>`,
  },

  /** 12 — meaning as a place. */
  constellation: {
    viewBox: "0 0 160 88",
    alt: "Words placed as points in space, with related words close together",
    body: `
      <g stroke="var(--ink-4)" stroke-width="1.4" stroke-dasharray="3 3">
        <path d="M34 30l24 12M58 42l22-8M96 58l24 8M120 66l18-16"/>
      </g>
      <g fill="var(--accent)"><circle cx="34" cy="30" r="4"/><circle cx="58" cy="42" r="4"/>
        <circle cx="80" cy="34" r="4"/></g>
      <g fill="var(--berry)"><circle cx="96" cy="58" r="4"/><circle cx="120" cy="66" r="4"/>
        <circle cx="138" cy="50" r="4"/></g>
      <g font-family="var(--hand)" font-size="9" font-weight="700">
        <text x="24" y="22" fill="var(--accent-deep)">king</text>
        <text x="52" y="56" fill="var(--accent-deep)">queen</text>
        <text x="74" y="26" fill="var(--accent-deep)">throne</text>
        <text x="86" y="76" fill="var(--berry)">rust</text>
        <text x="112" y="80" fill="var(--berry)">python</text>
        <text x="128" y="42" fill="var(--berry)">bun</text>
      </g>`,
  },

  /** 13 — attention: one word looking back at the others, unevenly. */
  beam: {
    viewBox: "0 0 168 88",
    alt: "One token attending to earlier tokens with different weights",
    body: `
      <g font-family="var(--mono)" font-size="9" text-anchor="middle">
        <g fill="var(--paper-2)" stroke="${INK}" stroke-width="2">
          <rect x="8" y="58" width="30" height="20" rx="6"/>
          <rect x="46" y="58" width="30" height="20" rx="6"/>
          <rect x="84" y="58" width="30" height="20" rx="6"/>
        </g>
        <text x="23" y="72" fill="${INK}">the</text>
        <text x="61" y="72" fill="${INK}">cat</text>
        <text x="99" y="72" fill="${INK}">sat</text>
        <rect x="122" y="58" width="36" height="20" rx="6" fill="var(--berry-soft)"
              stroke="var(--berry)" stroke-width="2.2"/>
        <text x="140" y="72" fill="var(--berry)">it</text>
      </g>
      <g fill="none" stroke="var(--berry)" stroke-linecap="round">
        <path d="M134 54Q78 18 26 54" stroke-width="1.4" opacity="0.4"/>
        <path d="M136 54Q100 12 62 54" stroke-width="4.5" opacity="0.9"/>
        <path d="M138 54Q122 24 100 54" stroke-width="2" opacity="0.55"/>
      </g>
      <text x="62" y="12" text-anchor="middle" font-family="var(--hand)" font-size="9"
            font-weight="700" fill="var(--berry)">looks hardest here</text>`,
  },

  /** 14 — a machine that only ever guesses the next word. */
  speech: {
    viewBox: "0 0 160 88",
    alt: "A sentence with the next word being guessed",
    body: `
      <path d="M14 16h132a8 8 0 018 8v34a8 8 0 01-8 8H52l-16 14v-14H14a8 8 0 01-8-8V24a8 8 0 018-8z"
            fill="var(--paper-2)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"
            transform="translate(-2 0)"/>
      <g font-family="var(--mono)" font-size="10" fill="${INK}">
        <text x="18" y="35">the cat sat on the</text>
      </g>
      <rect x="18" y="44" width="46" height="16" rx="5" fill="var(--accent-soft)"
            stroke="var(--accent)" stroke-width="2"/>
      <text x="41" y="56" text-anchor="middle" font-family="var(--mono)" font-size="9"
            fill="var(--accent-deep)">mat 61%</text>
      <rect x="70" y="44" width="42" height="16" rx="5" fill="var(--paper-3)"
            stroke="var(--ink-4)" stroke-width="1.8"/>
      <text x="91" y="56" text-anchor="middle" font-family="var(--mono)" font-size="9"
            fill="var(--ink-3)">rug 18%</text>
      <rect x="118" y="44" width="34" height="16" rx="5" fill="var(--paper-3)"
            stroke="var(--ink-4)" stroke-width="1.8"/>
      <text x="135" y="56" text-anchor="middle" font-family="var(--mono)" font-size="9"
            fill="var(--ink-3)">... </text>`,
  },

  /** 15 — structure nobody labelled. */
  cluster: {
    viewBox: "0 0 152 88",
    alt: "Unlabelled points falling into three natural groups",
    body: `
      <g fill="none" stroke-width="2.2" stroke-dasharray="5 4">
        <ellipse cx="36" cy="30" rx="24" ry="19" stroke="var(--accent)"/>
        <ellipse cx="106" cy="26" rx="22" ry="17" stroke="var(--berry)"/>
        <ellipse cx="72" cy="66" rx="26" ry="16" stroke="var(--amber)"/>
      </g>
      <g fill="var(--ink-2)">
        <circle cx="28" cy="24" r="3"/><circle cx="40" cy="20" r="3"/>
        <circle cx="34" cy="36" r="3"/><circle cx="46" cy="34" r="3"/>
        <circle cx="22" cy="34" r="3"/>
        <circle cx="100" cy="20" r="3"/><circle cx="112" cy="24" r="3"/>
        <circle cx="104" cy="32" r="3"/><circle cx="116" cy="32" r="3"/>
        <circle cx="60" cy="64" r="3"/><circle cx="72" cy="60" r="3"/>
        <circle cx="84" cy="66" r="3"/><circle cx="70" cy="72" r="3"/>
      </g>`,
  },

  /** 16 — out the door. */
  ship: {
    viewBox: "0 0 132 92",
    alt: "A paper boat on water",
    body: `
      <path d="M18 52h96l-16 24H34z" fill="var(--paper-2)" stroke="${INK}"
            stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M66 50V16l30 34z" fill="var(--accent-soft)" stroke="var(--accent)"
            stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M62 50V22L36 50z" fill="var(--berry-soft)" stroke="var(--berry)"
            stroke-width="2.4" stroke-linejoin="round"/>
      <g stroke="var(--sky)" stroke-width="2.2" fill="none" stroke-linecap="round">
        <path d="M8 84q10-6 20 0t20 0 20 0 20 0 20 0 16 0"/>
      </g>`,
  },

  /** the map page. */
  compass: {
    viewBox: "0 0 96 96",
    alt: "A compass rose",
    body: `
      <circle cx="48" cy="48" r="34" fill="var(--paper-2)" stroke="${INK}" stroke-width="2.4"/>
      <path d="M48 20l7 21 21 7-21 7-7 21-7-21-21-7 21-7z" fill="var(--accent-soft)"
            stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="48" cy="48" r="4" fill="var(--berry)"/>
      <g stroke="${INK}" stroke-width="2" stroke-linecap="round">
        <path d="M48 8v6M48 82v6M8 48h6M82 48h6"/>
      </g>`,
  },

  /* -------------------------------------------------------- small ornaments */

  sparkle: {
    viewBox: "0 0 24 24",
    alt: "",
    body: `<path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"
             fill="var(--amber)"/>`,
  },

  arrow: {
    viewBox: "0 0 60 34",
    alt: "",
    body: `<path d="M4 8q22 22 50 8" fill="none" stroke="var(--berry)" stroke-width="2.2"
             stroke-linecap="round"/>
           <path d="M46 12l8 4-6 6" fill="none" stroke="var(--berry)" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round"/>`,
  },

  seedling: {
    viewBox: "0 0 40 40",
    alt: "",
    body: `<path d="M20 34V16" fill="none" stroke="var(--leaf)" stroke-width="2.4"
             stroke-linecap="round"/>
           <path d="M20 22q-12-2-12-12 12 0 12 12z" fill="var(--leaf-soft)"
             stroke="var(--leaf)" stroke-width="2"/>
           <path d="M20 18q12-2 12-11-12 0-12 11z" fill="var(--leaf-soft)"
             stroke="var(--leaf)" stroke-width="2"/>`,
  },
};

/** Which drawing opens which chapter. */
export const chapterDoodle: Record<string, string> = {
  "01-where-this-fits": "inversion",
  "02-python-for-rust-programmers": "snake",
  "03-the-shape-of-problems": "shapes",
  "04-your-first-model": "lineFit",
  "05-how-learning-happens": "hill",
  "06-generalisation": "fence",
  "07-the-model-zoo": "zoo",
  "08-neural-networks": "layers",
  "09-backpropagation": "chain",
  "10-pytorch": "flame",
  "11-vision-and-transfer": "eye",
  "12-embeddings-and-tabular": "constellation",
  "13-attention-and-transformers": "beam",
  "14-llms": "speech",
  "15-unsupervised-and-the-rest": "cluster",
  "16-shipping-and-reading-papers": "ship",
};
