/**
 * The people you'll keep bumping into.
 *
 * A callout box is easier to read when it has a face on it. After a chapter or
 * two you stop reading the label and just recognise who is talking, which is
 * exactly what we want: Wren means "here comes something lovely", Basil means
 * "slow down", Juno means "your turn", Moss means "if you're lost, here".
 *
 * The portraits are baked into src/lib/cast-art.ts by scripts/gen-cast.mjs.
 * Pip is different — Pip is a ball, drawn by hand in src/lib/doodles.ts, and
 * doesn't have a face at all.
 */
import { CAST_ART } from "./cast-art";

export interface Member {
  id: string;
  name: string;
  /** Under the name, on the home page. One line, in their own voice. */
  role: string;
  /** The one thing they're for. */
  job: string;
  /** A semantic colour from global.css — the same one their boxes use. */
  tone: "sky" | "amber" | "berry" | "leaf" | "rust" | "violet";
  svg: string;
}

const META: Record<string, Omit<Member, "id" | "svg" | "name">> = {
  wren: {
    role: "always asking why",
    job: "Wren turns up when something stops being machinery for a second and is just nice to know about.",
    tone: "sky",
  },
  basil: {
    role: "reads the small print",
    job: "Basil points at the places people trip. Slow down when Basil is on the page.",
    tone: "rust",
  },
  juno: {
    role: "would rather just try it",
    job: "Juno hands you something to do. You learn more from ten seconds of trying than a page of reading.",
    tone: "berry",
  },
  moss: {
    role: "has been stuck here before",
    job: "Moss shows up at the spots where people get lost, and says what usually helps.",
    tone: "amber",
  },
};

export const CAST: Member[] = Object.entries(CAST_ART).map(([id, art]) => ({
  id,
  name: art.name,
  svg: art.svg,
  ...META[id],
}));

export const byId: Record<string, Member> = Object.fromEntries(
  CAST.map((m) => [m.id, m]),
);
