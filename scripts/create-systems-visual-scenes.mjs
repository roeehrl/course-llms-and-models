// Private authoring only. Default: released package. Local development requires
// an explicit file: URL to its built dist/headless.js, never sibling source.
import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
const artifact =
  process.env.COURSE_VISUALS_ARTIFACT ?? "@course-core/visuals/headless";
const entry =
  process.env.COURSE_VISUALS_ARTIFACT ?? import.meta.resolve(artifact);
if (process.env.COURSE_VISUALS_ARTIFACT)
  assert(
    /^file:.*\/dist\/headless\.js$/.test(entry),
    "Use an explicit built artifact URL",
  );
const { parseScene, toVisualExperience, fromVisualExperience } = await import(
  artifact
);
const op = (op, ...args) => ({ op, args }),
  s = (state) => ({ state }),
  t = { time: true };
const add = (...v) => op("add", ...v),
  mul = (...v) => op("mul", ...v),
  sub = (a, b) => op("sub", a, b),
  div = (a, b) => op("div", a, b);
const eq = (a, b) => op("eq", a, b),
  iff = (c, a, b) => op("if", c, a, b),
  ge = (a, b) => op("gte", a, b),
  lt = (a, b) => op("lt", a, b);
const round = (value) => div(op("round", mul(value, 1000)), 1000);
const cat = (...v) => op("concat", ...v),
  progress = (start, duration) =>
    op("clamp", div(sub(t, start), duration), 0, 1);
const ink = "#19383E",
  muted = "#4C656D",
  teal = "#087665",
  mint = "#E4F4ED",
  purple = "#69439D",
  lilac = "#F0EAF9",
  gold = "#78561A",
  sand = "#FFF0D6",
  blue = "#365CA3",
  ice = "#E7EFFB",
  pale = "#F8FAF8",
  line = "#CBDCD6";
const palette = [teal, purple, gold],
  washes = [mint, lilac, sand];
const text = (id, value, x, y, fontSize = 18, fill = ink) => ({
  kind: "text",
  id,
  text: value,
  x,
  y,
  fontSize,
  fill,
});
const bold = (id, value, x, y, fontSize = 22, fill = ink) => ({
  ...text(id, value, x, y, fontSize, fill),
  weight: "bold",
});
const rect = (id, x, y, width, height, fill, cornerRadius = 14) => ({
  kind: "rect",
  id,
  x,
  y,
  width,
  height,
  fill,
  cornerRadius,
});
const group = (id, x, y, children) => ({ kind: "group", id, x, y, children });
const num = (label, initial, min, max, step) => ({
  kind: "number",
  label,
  initial,
  min,
  max,
  step,
});
const join = (id, from, to, start, duration = 900) => ({
  kind: "link",
  id,
  from: { node: from, anchor: "auto" },
  to: { node: to, anchor: "auto" },
  bend: 0.35,
  arrow: true,
  fill: "none",
  stroke: line,
  strokeWidth: 2.5,
  progress: progress(start, duration),
});
function base(
  id,
  title,
  description,
  state,
  nodes,
  compact,
  height,
  durationMs,
  cues,
  accessible,
) {
  return {
    version: 1,
    id,
    title,
    description,
    state,
    controls: Object.keys(state),
    nodes,
    layouts: { compact, expanded: { width: 960, height }, breakpoint: 800 },
    timeline: { durationMs, tracks: [], cues },
    accessibility: {
      text: accessible,
      reducedMotion: { atMs: durationMs, description: accessible },
    },
    referenceChecks: [`${id}-cpu`],
  };
}

// 01 — one attention row: scalar value output, not a full transformer.
const empty = eq(s("mask"), "No keys"),
  third = eq(s("mask"), "All keys");
const raw = [
  div(s("query"), Math.SQRT2),
  1 / Math.SQRT2,
  div(sub(1, s("query")), Math.SQRT2),
];
const logits = raw.map((v) => add(v, s("shift")));
// Cancel the common shift algebraically before the bounded expression AST.
const maximum = op("max", raw[0], raw[1], iff(third, raw[2], raw[0]));
const weights = raw.map((v, i) =>
  iff(
    i === 2 ? third : op("not", empty),
    op("pow", Math.E, sub(v, maximum)),
    0,
  ),
);
const denom = add(...weights);
const probabilities = weights.map((w) => iff(empty, 0, div(w, denom)));
const values = [2, -1, 4],
  output = div(
    add(...weights.map((w, i) => mul(w, values[i]))),
    op("max", denom, 1),
  );
const attentionNodes = [
  rect("attention-bg", 0, 0, 960, 520, pale, 24),
  bold("attention-kicker", "01 / NORMALIZE, THEN MIX", 24, 35, 17, teal),
  group("query-card", 24, 76, [
    rect("query-bg", 0, 0, 194, 333, ice),
    text("query-label", "QUERY", 20, 34, 17, blue),
    bold("query-vector", cat("q = [", s("query"), ", 1]"), 20, 75, 24),
    text("query-d", "Head width d = 2", 20, 117, 17, blue),
    text("query-formula", "score = q · k / √2", 20, 154, 17),
    text("query-shift", cat("shared shift +", s("shift")), 20, 211, 17),
    text("query-shift-note", "Same probabilities.", 20, 245, 17),
    text("query-stability", "Subtract max first.", 20, 285, 17, blue),
    {
      ...rect("query-handle", 0, 0, 194, 333, "#FFFFFF00"),
      label: "Adjust query coordinate",
      manipulate: { x: { state: "query", from: -2, to: 2 } },
    },
  ]),
  ...values.map((v, i) =>
    group(`key-${i}`, 272, 76 + i * 120, [
      rect(`key-bg-${i}`, 0, 0, 364, 104, washes[i]),
      bold(
        `key-label-${i}`,
        `KEY ${i + 1}   k = ${["[1, 0]", "[0, 1]", "[−1, 1]"][i]}`,
        16,
        26,
        17,
        palette[i],
      ),
      text(`logit-${i}`, cat("score ", round(logits[i])), 16, 51, 17),
      text(
        `centered-${i}`,
        iff(
          i === 2 ? third : op("not", empty),
          cat("− max → ", round(sub(raw[i], maximum))),
          "masked → no mass",
        ),
        16,
        77,
        17,
      ),
      rect(`prob-track-${i}`, 206, 39, 139, 15, "#FFFFFF", 7),
      {
        ...rect(
          `prob-bar-${i}`,
          206,
          39,
          mul(139, probabilities[i], progress(1700, 1700)),
          15,
          palette[i],
          7,
        ),
      },
      bold(
        `prob-${i}`,
        cat("p = ", round(probabilities[i])),
        206,
        83,
        18,
        palette[i],
      ),
    ]),
  ),
  ...values.map((_, i) =>
    join(`query-link-${i}`, "query-bg", `key-bg-${i}`, i * 250),
  ),
  ...values.map((_, i) => ({
    ...join(`mix-link-${i}`, `key-bg-${i}`, "mix-bg", 3500 + i * 350, 1000),
    stroke: palette[i],
    opacity: iff(empty, 0, add(0.15, mul(0.85, probabilities[i]))),
  })),
  group("mix-card", 696, 76, [
    rect("mix-bg", 0, 0, 240, 344, lilac),
    text("mix-label", "WEIGHTED VALUES", 18, 33, 17, purple),
    ...values.map((v, i) =>
      text(
        `contribution-${i}`,
        cat("p", i + 1, " × ", v, " = ", round(mul(probabilities[i], v))),
        18,
        81 + i * 42,
        18,
      ),
    ),
    bold(
      "attention-output",
      iff(empty, "Undefined", cat("O = ", round(output))),
      18,
      242,
      29,
      purple,
    ),
    text(
      "attention-mass",
      cat("Σ p = ", round(add(...probabilities))),
      18,
      281,
      18,
    ),
    text(
      "attention-status",
      iff(empty, "No allowed key.", "One query, one result."),
      18,
      318,
      17,
      purple,
    ),
  ]),
  text(
    "attention-footer",
    "Animation reveals a fixed computation. Bar lengths encode probabilities, never confidence in a fact.",
    24,
    478,
    17,
    muted,
  ),
  {
    ...text(
      "attention-mobile-note",
      "Bars show weights, not certainty.",
      16,
      808,
      17,
      muted,
    ),
    opacity: 0,
  },
];
const ac = {
  "attention-bg": { width: 320, height: 830 },
  "attention-kicker": { x: 16, fontSize: 17 },
  "query-card": { x: 16, y: 61 },
  "query-bg": { width: 288, height: 126 },
  "query-handle": { width: 288, height: 126 },
  "query-label": { y: 27 },
  "query-vector": { x: 94, y: 27, fontSize: 22 },
  "query-d": { y: 56 },
  "query-formula": { y: 82 },
  "query-shift": { y: 110 },
  "query-shift-note": { opacity: 0 },
  "query-stability": { opacity: 0 },
  "mix-card": { x: 16, y: 590 },
  "mix-bg": { width: 288, height: 186 },
  "mix-label": { y: 27 },
  "attention-output": { y: 149, fontSize: 26 },
  "attention-mass": { x: 190, y: 149, fontSize: 17 },
  "attention-status": { y: 175 },
  "attention-footer": { opacity: 0 },
  "attention-mobile-note": { opacity: 1 },
};
for (let i = 0; i < 3; i++) {
  ac[`key-${i}`] = { x: 16, y: 205 + i * 124 };
  ac[`key-bg-${i}`] = { width: 288, height: 110 };
  ac[`prob-track-${i}`] = { x: 173, width: 99, y: 42 };
  ac[`prob-bar-${i}`] = {
    x: 173,
    width: mul(99, probabilities[i], progress(1700, 1700)),
    y: 42,
  };
  ac[`prob-${i}`] = { x: 173, y: 90, fontSize: 17 };
  ac[`centered-${i}`] = { fontSize: 17, y: 86 };
  ac[`contribution-${i}`] = { y: 53 + i * 25, fontSize: 17 };
  ac[`query-link-${i}`] = { opacity: 0 };
  ac[`mix-link-${i}`] = { opacity: 0 };
}
const attention = base(
  "systems-stable-attention",
  "One query. A careful mixture.",
  "Follow q·k/√2 through a mask, subtract-max softmax, and a weighted sum. Try a +1000 common shift: the result stays the same. “No keys” deliberately leaves the row undefined.",
  {
    query: num("Query first coordinate", 1, -2, 2, 0.25),
    shift: num("Common logit shift", 0, 0, 1000, 100),
    mask: {
      kind: "enum",
      label: "Allowed keys",
      initial: "All keys",
      options: ["All keys", "Mask key 3", "No keys"],
    },
  },
  attentionNodes,
  { width: 320, height: 830, overrides: ac },
  520,
  5000,
  [
    {
      atMs: 0,
      text: "Read q=[a,1], three key vectors, and scalar values [2,−1,4]. Scores include the same optional shift.",
    },
    {
      atMs: 1200,
      text: "Exclude masked keys from the maximum and denominator. Subtract the maximum allowed score before exponentiating.",
    },
    {
      atMs: 1700,
      text: "The bars reveal exp(score−max) divided by the allowed-key sum. Shifting all scores does not change these ratios.",
    },
    {
      atMs: 3500,
      text: "Multiply each probability by its value, then sum. No allowed keys means undefined; zero bars are not a valid distribution.",
    },
  ],
  "One attention row uses q=[a,1], keys [1,0], [0,1], [−1,1], values [2,−1,4], and score dot(q,k)/√2 plus a common shift. Exclude masked keys; compute m=max of allowed scores, p=exp(score−m)/sum exp(score−m). The output is 2p1−p2+4p3. A common shift changes neither p nor O. With no allowed keys the row is undefined; the zero bars are placeholders, not a successful normalized row. Animation reveals this fixed calculation; it does not train parameters.",
);

// 02 — idealized fill/drain schedule. Every backward uses the same old w.
const gradients = [
  sub(s("weight"), 2),
  add(mul(4, s("weight")), sub(s("weight"), 1)),
  add(s("weight"), 3),
];
const counts = [1, 2, 1],
  completeAt = [10000, 9000, 8000];
const done = completeAt.map((at) => ge(t, at));
const sum = add(...gradients.map((g, i) => iff(done[i], g, 0)));
const total = add(...gradients),
  mean = div(total, 4),
  newWeight = sub(s("weight"), mul(s("rate"), mean));
const completedN = add(...counts.map((n, i) => iff(done[i], n, 0)));
const slot = op("min", 9, op("floor", div(t, 1000)));
const schedule = Array.from({ length: 3 }, (_, stage) =>
  Array.from({ length: 10 }, (_, time) => {
    const f = time - stage;
    if (f >= 0 && f < 3) return { kind: "F", batch: f };
    const b = 9 - stage - time;
    if (b >= 0 && b < 3) return { kind: "B", batch: b };
    return null;
  }),
);
const active = (stage) =>
  iff(
    ge(t, 10000),
    "Batch complete",
    schedule[stage].reduceRight(
      (next, event, i) =>
        iff(
          eq(slot, i),
          event
            ? `${event.kind === "F" ? "Forward" : "Backward"} · μ${event.batch + 1}`
            : "Bubble · idle",
          next,
        ),
      "Done",
    ),
  );
const pipelineNodes = [
  rect("pipeline-bg", 0, 0, 960, 650, pale, 24),
  bold("pipeline-kicker", "02 / ONE LOGICAL BATCH", 24, 35, 17, teal),
  text(
    "pipeline-contract",
    "Four examples · microbatch sizes 1, 2, 1 · same old parameters until every gradient returns",
    24,
    68,
    17,
  ),
  group("gantt", 24, 110, [
    text(
      "gantt-title",
      "FORWARD F →     ← BACKWARD B      · = BUBBLE",
      0,
      0,
      17,
      muted,
    ),
    ...schedule.flatMap((row, stage) => [
      text(
        `stage-label-${stage}`,
        `Stage ${stage + 1}`,
        0,
        63 + stage * 66,
        18,
      ),
      ...row.flatMap((event, i) => [
        rect(
          `slot-bg-${stage}-${i}`,
          110 + i * 69,
          29 + stage * 66,
          61,
          48,
          event ? washes[event.batch] : "#EDF1EF",
          10,
        ),
        {
          ...rect(
            `slot-active-${stage}-${i}`,
            110 + i * 69,
            29 + stage * 66,
            61,
            48,
            event ? palette[event.batch] : muted,
            10,
          ),
          opacity: iff(eq(slot, i), 0.2, 0),
        },
        {
          ...bold(
            `slot-text-${stage}-${i}`,
            event ? `${event.kind}${event.batch + 1}` : "·",
            140 + i * 69,
            60 + stage * 66,
            20,
            event ? palette[event.batch] : muted,
          ),
          align: "middle",
        },
      ]),
    ]),
    {
      ...rect("playhead", 110, 18, 3, 210, teal, 0),
      x: add(110, mul(69, op("min", 10, div(t, 1000)))),
    },
    text(
      "schedule-caption",
      "Idealized equal-duration steps. A diagram of ordering, not a throughput forecast.",
      0,
      259,
      17,
      muted,
    ),
  ]),
  ...schedule.map((_, i) => ({
    ...group(`mobile-stage-${i}`, 16, 124 + i * 90, [
      rect(`mobile-stage-bg-${i}`, 0, 0, 288, 76, [mint, lilac, ice][i]),
      text(`mobile-stage-label-${i}`, `STAGE ${i + 1}`, 16, 27, 17, palette[i]),
      bold(`stage-active-${i}`, active(i), 16, 57, 23),
    ]),
    opacity: 0,
  })),
  group("ledger", 24, 420, [
    rect("ledger-bg", 0, 0, 578, 196, ice),
    text(
      "ledger-title",
      "RETURNED GRADIENTS · SUM BEFORE DIVIDING",
      18,
      29,
      17,
      blue,
    ),
    ...counts.map((n, i) =>
      group(`batch-${i}`, 18 + i * 181, 47, [
        rect(`batch-bg-${i}`, 0, 0, 167, 83, washes[i]),
        bold(
          `batch-heading-${i}`,
          `μ${i + 1} · n=${n}`,
          12,
          28,
          19,
          palette[i],
        ),
        text(
          `batch-gradient-${i}`,
          iff(done[i], cat("Σ g = ", round(gradients[i])), "await return"),
          12,
          58,
          18,
        ),
        {
          ...rect(`batch-returned-${i}`, 0, 73, 167, 10, palette[i], 3),
          opacity: iff(done[i], 1, 0),
        },
      ]),
    ),
    bold("accum-sum", cat("Σ g returned = ", round(sum)), 18, 161, 21, blue),
    text(
      "accum-count",
      cat("Examples returned: ", completedN, " / 4"),
      18,
      185,
      17,
      muted,
    ),
  ]),
  group("optimizer", 630, 420, [
    rect("optimizer-bg", 0, 0, 306, 196, lilac),
    text("optimizer-title", "OPTIMIZER BOUNDARY", 18, 29, 17, purple),
    text("batch-mean", cat("Full mean g = ", round(mean)), 18, 66, 21),
    bold(
      "committed-weight",
      cat("w = ", round(iff(ge(t, 10000), newWeight, s("weight")))),
      18,
      111,
      30,
      purple,
    ),
    text(
      "update-count",
      cat("Updates committed: ", iff(ge(t, 10000), 1, 0)),
      18,
      150,
      18,
    ),
    text(
      "update-status",
      iff(
        ge(t, 10000),
        "One update. Batch complete.",
        "Wait for all four examples.",
      ),
      18,
      179,
      17,
      purple,
    ),
  ]),
  {
    ...text(
      "pipeline-mobile-contract",
      "Sizes 1, 2, 1 · four examples",
      16,
      70,
      18,
    ),
    opacity: 0,
  },
  {
    ...text(
      "pipeline-mobile-slot",
      cat("Schedule slot ", add(slot, 1), " / 10"),
      16,
      103,
      18,
      muted,
    ),
    opacity: 0,
  },
];
const pc = {
  "pipeline-bg": { width: 320, height: 925 },
  "pipeline-kicker": { x: 16 },
  "pipeline-contract": { opacity: 0 },
  gantt: { opacity: 0 },
  "pipeline-mobile-contract": { opacity: 1 },
  "pipeline-mobile-slot": { opacity: 1 },
  ledger: { x: 16, y: 409 },
  "ledger-bg": { width: 288, height: 257 },
  "ledger-title": { fontSize: 17, y: 28 },
  optimizer: { x: 16, y: 687 },
  "optimizer-bg": { width: 288, height: 215 },
  "accum-sum": { fontSize: 19, y: 221 },
  "accum-count": { y: 247 },
};
// Compact copy shortens only labels, never changes the arithmetic contract.
pipelineNodes.find((n) => n.id === "ledger").children[1].text =
  "RETURNED GRADIENT SUMS";
for (let i = 0; i < 3; i++) {
  pc[`mobile-stage-${i}`] = { opacity: 1 };
  pc[`batch-${i}`] = { x: 16, y: 44 + i * 48 };
  pc[`batch-bg-${i}`] = { width: 256, height: 41 };
  pc[`batch-heading-${i}`] = { x: 12, y: 27, fontSize: 18 };
  pc[`batch-gradient-${i}`] = { x: 120, y: 27, fontSize: 18 };
  pc[`batch-returned-${i}`] = { x: 248, y: 0, width: 8, height: 41 };
}
const pipeline = base(
  "systems-microbatch-boundary",
  "Many small journeys. One update.",
  "Scrub a three-stage fill/drain schedule. F and B label forward and backward work; μ1, μ2, μ3 identify microbatches. Their sizes are 1, 2, 1. The toy scalar objective uses four examples, so divide the accumulated gradient sum by four, not by three.",
  {
    weight: num("Old weight w", 1, -1, 2, 0.25),
    rate: num("Learning rate", 0.1, 0, 0.25, 0.05),
  },
  pipelineNodes,
  { width: 320, height: 925, overrides: pc },
  650,
  11000,
  [
    {
      atMs: 0,
      text: "Start with an empty gradient accumulator. All forward and backward work in this batch uses the same old w.",
    },
    {
      atMs: 3000,
      text: "Forward work drains toward stage 3. Empty cells are scheduling bubbles, not completed work.",
    },
    {
      atMs: 5000,
      text: "Backward starts at stage 3 in reverse microbatch order. A downstream result is not yet a returned stage-1 gradient.",
    },
    {
      atMs: 8000,
      text: "μ3 has returned to stage 1: one example. Its gradient sum is available, but no optimizer update is allowed.",
    },
    {
      atMs: 9000,
      text: "μ2 adds two examples. Three of four are back. Still no update.",
    },
    {
      atMs: 10000,
      text: "μ1 completes the four-example batch. Divide the total gradient sum by four and commit one simultaneous scalar update.",
    },
  ],
  "Idealized three-stage fill/drain schedule: forward F(j,s) occurs in slot j+s, backward B(j,s) in slot 9−j−s, for zero-based microbatch j and stage s. Each slot lasts one illustrated second; this is not a hardware speed prediction. Examples (x,y) are μ1:[(1,2)], μ2:[(2,0),(1,1)], μ3:[(−1,3)]. Loss per example is (wx−y)²/2. Gradient sums are w−2, 5w−1, w+3; batch gradient is their sum divided by four. All use the old w. Stage-1 gradients return at 8, 9, 10 seconds in μ3, μ2, μ1 order; update once at 10 seconds to w−rate×mean. At w=1 and rate=.1, sums are −1,4,4, mean 1.75, new w .825. Averaging microbatch means would be a different objective.",
);

// 03 — a 2x2 output tile from a 3x3 multiplication, including edge padding.
const A = [
    [1, 2, 0],
    [-1, 3, 1],
    [2, 1, 4],
  ],
  B = [
    [2, 1, -1],
    [0, 3, 2],
    [1, -2, 1],
  ];
const choose = (control, a, b) => iff(eq(s(control), 0), a, b);
const av = (r, k) => choose("tileRow", A[r]?.[k] ?? 0, A[r + 2]?.[k] ?? 0);
const bv = (k, c) => choose("tileColumn", B[k]?.[c] ?? 0, B[k]?.[c + 2] ?? 0);
const validR = (r) => (r === 0 ? true : eq(s("tileRow"), 0)),
  validC = (c) => (c === 0 ? true : eq(s("tileColumn"), 0));
const second = ge(t, 3000),
  loaded = iff(second, ge(t, 4000), ge(t, 1100)),
  load1 = progress(200, 900),
  load2 = progress(3100, 900);
const rowCount = choose("tileRow", 2, 1),
  colCount = choose("tileColumn", 2, 1);
const reads = add(
  mul(add(rowCount, colCount), 2, iff(ge(t, 1100), 1, 0)),
  mul(add(rowCount, colCount), iff(ge(t, 4000), 1, 0)),
);
const writes = mul(rowCount, colCount, iff(ge(t, 5000), 1, 0));
const term = (r, c, k) => mul(av(r, k), bv(k, c));
const partial = (r, c) =>
  add(...[1500, 2400, 4400].map((at, k) => iff(ge(t, at), term(r, c, k), 0)));
const tilingNodes = [
  rect("tiling-bg", 0, 0, 960, 670, pale, 24),
  bold("tiling-kicker", "03 / LOAD ONCE, REUSE LOCALLY", 24, 35, 17, teal),
  text(
    "tile-contract",
    "C = A × B · 3×3 matrices · a 2×2 output tile · FP32 traffic model",
    24,
    67,
    18,
  ),
  ...[A, B].map((matrix, m) =>
    group(m ? "global-b" : "global-a", 24 + m * 214, 105, [
      bold(
        `matrix-heading-${m}`,
        m ? "B · global" : "A · global",
        0,
        0,
        21,
        m ? purple : teal,
      ),
      ...matrix.flatMap((row, r) =>
        row.flatMap((v, c) => [
          rect(
            `global-${m}-${r}-${c}`,
            c * 49,
            r * 49 + 18,
            43,
            43,
            m ? lilac : mint,
            7,
          ),
          {
            ...rect(
              `global-highlight-${m}-${r}-${c}`,
              c * 49,
              r * 49 + 18,
              43,
              43,
              m ? purple : teal,
              7,
            ),
            opacity: iff(
              op(
                "and",
                m
                  ? eq(op("floor", div(c, 2)), s("tileColumn"))
                  : eq(op("floor", div(r, 2)), s("tileRow")),
                eq(op("floor", div(m ? r : c, 2)), iff(second, 1, 0)),
              ),
              0.3,
              0,
            ),
          },
          {
            ...bold(
              `global-number-${m}-${r}-${c}`,
              String(v),
              c * 49 + 21.5,
              r * 49 + 47,
              22,
            ),
            align: "middle",
          },
          {
            ...rect(
              `select-cell-${m}-${r}-${c}`,
              c * 49,
              r * 49 + 18,
              43,
              43,
              "#FFFFFF00",
              7,
            ),
            label: m
              ? `Select column tile ${Math.floor(c / 2)}`
              : `Select row tile ${Math.floor(r / 2)}`,
            manipulate: {
              activate: {
                state: m ? "tileColumn" : "tileRow",
                value: Math.floor((m ? c : r) / 2),
              },
            },
          },
        ]),
      ),
    ]),
  ),
  group("local-a", 24, 365, [
    bold("local-a-title", "A · scratch", 0, 0, 21, teal),
    ...Array.from({ length: 4 }, (_, i) => {
      const r = Math.floor(i / 2),
        k = i % 2,
        valid = op("and", validR(r), op("not", op("and", second, k === 1)));
      return group(`scratch-a-${i}`, k * 61, r * 61 + 18, [
        rect(`scratch-a-bg-${i}`, 0, 0, 54, 54, mint, 9),
        {
          ...bold(
            `scratch-a-value-${i}`,
            iff(loaded, iff(valid, iff(second, av(r, 2), av(r, k)), "0"), "…"),
            27,
            26,
            22,
            teal,
          ),
          align: "middle",
        },
        {
          ...text(`scratch-a-pad-${i}`, "PAD", 27, 48, 17, muted),
          align: "middle",
          opacity: iff(op("and", loaded, op("not", valid)), 1, 0),
        },
      ]);
    }),
  ]),
  group("local-b", 238, 365, [
    bold("local-b-title", "B · scratch", 0, 0, 21, purple),
    ...Array.from({ length: 4 }, (_, i) => {
      const k = Math.floor(i / 2),
        c = i % 2,
        valid = op("and", validC(c), op("not", op("and", second, k === 1)));
      return group(`scratch-b-${i}`, c * 61, k * 61 + 18, [
        rect(`scratch-b-bg-${i}`, 0, 0, 54, 54, lilac, 9),
        {
          ...bold(
            `scratch-b-value-${i}`,
            iff(loaded, iff(valid, iff(second, bv(2, c), bv(k, c)), "0"), "…"),
            27,
            26,
            22,
            purple,
          ),
          align: "middle",
        },
        {
          ...text(`scratch-b-pad-${i}`, "PAD", 27, 48, 17, muted),
          align: "middle",
          opacity: iff(op("and", loaded, op("not", valid)), 1, 0),
        },
      ]);
    }),
  ]),
  ...["a", "b"].map((letter) => ({
    ...join(`load-${letter}`, `global-${letter}`, `local-${letter}`, 0),
    progress: iff(second, load2, load1),
    stroke: letter === "a" ? teal : purple,
  })),
  group("tile-output", 460, 110, [
    rect("tile-output-bg", 0, 0, 236, 410, sand),
    text("tile-output-label", "C TILE · ACCUMULATE", 16, 29, 17, gold),
    ...Array.from({ length: 4 }, (_, i) => {
      const r = Math.floor(i / 2),
        c = i % 2,
        valid = op("and", validR(r), validC(c));
      return group(`output-${i}`, 16 + c * 107, 57 + r * 105, [
        rect(`output-bg-${i}`, 0, 0, 98, 94, "#FFFFFF", 12),
        {
          ...bold(
            `output-value-${i}`,
            iff(valid, partial(r, c), "—"),
            49,
            42,
            29,
            gold,
          ),
          align: "middle",
        },
        {
          ...text(
            `output-status-${i}`,
            iff(valid, iff(ge(t, 5000), "written", "partial"), "outside"),
            49,
            73,
            17,
            muted,
          ),
          align: "middle",
        },
      ]);
    }),
    text(
      "tile-k",
      iff(second, "k tile: [2, PAD]", "k tile: [0, 1]"),
      16,
      307,
      19,
      gold,
    ),
    text("tile-row", cat("row tile = ", s("tileRow")), 16, 343, 18),
    text("tile-column", cat("column tile = ", s("tileColumn")), 16, 374, 18),
  ]),
  ...["a", "b"].map((letter, i) => ({
    ...join(`reuse-${letter}`, `local-${letter}`, "tile-output-bg", 1200, 1100),
    from: { node: `local-${letter}`, anchor: "bottom" },
    to: { node: "tile-output-bg", anchor: "bottom" },
    stroke: i ? purple : teal,
    progress: iff(second, progress(4000, 400), progress(1200, 1200)),
  })),
  group("traffic", 724, 110, [
    rect("traffic-bg", 0, 0, 212, 410, ice),
    text("traffic-title", "THIS TILE ONLY", 16, 29, 17, blue),
    bold("global-reads", cat("Reads = ", reads), 16, 82, 24, blue),
    text("global-read-unit", "Input scalars", 16, 111, 17),
    bold("global-writes", cat("Writes = ", writes), 16, 165, 24, blue),
    text("global-write-unit", "Output scalars", 16, 194, 17),
    bold(
      "global-bytes",
      cat("Bytes = ", mul(4, add(reads, writes))),
      16,
      248,
      24,
      blue,
    ),
    text("traffic-naive", "Naive input reads:", 16, 309, 17),
    bold("naive-reads", mul(6, rowCount, colCount), 16, 344, 25, blue),
    text("traffic-cache", "No cache assumed.", 16, 377, 17, muted),
  ]),
  text(
    "tile-note-1",
    "Scratch tiles reuse loaded values. Padded zeros never issue a global read or an out-of-range write.",
    24,
    575,
    18,
  ),
  text(
    "tile-note-2",
    "Traffic counts scalar loads + stores for this tile only. They do not predict device bandwidth or speed.",
    24,
    610,
    17,
    muted,
  ),
  text(
    "tile-note-3",
    "Accumulators update after k=0, then k=1, then k=2. Write C once after all three products.",
    24,
    640,
    17,
    muted,
  ),
  {
    ...text("tile-mobile-contract", "2×2 tile from 3×3 matrices", 16, 68, 18),
    opacity: 0,
  },
  {
    ...text(
      "tile-mobile-note-1",
      "PAD = zero; no global access.",
      16,
      1021,
      17,
    ),
    opacity: 0,
  },
  {
    ...text(
      "tile-mobile-note-2",
      "Counts are not measured speed.",
      16,
      1048,
      17,
      muted,
    ),
    opacity: 0,
  },
];
const tc = {
  "tiling-bg": { width: 320, height: 1070 },
  "tiling-kicker": { x: 16, fontSize: 17 },
  "tile-contract": { opacity: 0 },
  "tile-mobile-contract": { opacity: 1 },
  "global-a": { x: 16, y: 104 },
  "global-b": { x: 174, y: 104 },
  "local-a": { x: 22, y: 296 },
  "local-b": { x: 181, y: 296 },
  "tile-output": { x: 16, y: 463 },
  "tile-output-bg": { width: 288, height: 320 },
  "tile-output-label": { fontSize: 17 },
  "tile-k": { x: 16, y: 267 },
  "tile-row": { x: 16, y: 298, fontSize: 17 },
  "tile-column": { x: 145, y: 298, fontSize: 17 },
  traffic: { x: 16, y: 804 },
  "traffic-bg": { width: 288, height: 187 },
  "global-reads": { y: 64, fontSize: 22 },
  "global-read-unit": { x: 160, y: 64, fontSize: 17 },
  "global-writes": { y: 98, fontSize: 22 },
  "global-write-unit": { x: 160, y: 98, fontSize: 17 },
  "global-bytes": { y: 136, fontSize: 22 },
  "traffic-naive": { y: 166, fontSize: 17 },
  "naive-reads": { x: 173, y: 166, fontSize: 20 },
  "traffic-cache": { opacity: 0 },
  "tile-note-1": { opacity: 0 },
  "tile-note-2": { opacity: 0 },
  "tile-note-3": { opacity: 0 },
  "tile-mobile-note-1": { opacity: 1 },
  "tile-mobile-note-2": { opacity: 1 },
};
for (let m = 0; m < 2; m++)
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      tc[`select-cell-${m}-${r}-${c}`] = {
        x: c * 42,
        y: r * 42 + 18,
        width: 36,
        height: 36,
      };
      tc[`global-${m}-${r}-${c}`] = {
        x: c * 42,
        y: r * 42 + 18,
        width: 36,
        height: 36,
      };
      tc[`global-highlight-${m}-${r}-${c}`] = {
        x: c * 42,
        y: r * 42 + 18,
        width: 36,
        height: 36,
      };
      tc[`global-number-${m}-${r}-${c}`] = {
        x: c * 42 + 18,
        y: r * 42 + 44,
        fontSize: 21,
      };
    }
for (let i = 0; i < 4; i++) {
  tc[`output-${i}`] = { x: 22 + (i % 2) * 133, y: 48 + Math.floor(i / 2) * 97 };
  tc[`output-bg-${i}`] = { width: 111, height: 88 };
  tc[`output-value-${i}`] = { x: 55 };
  tc[`output-status-${i}`] = { x: 55 };
}
for (const id of ["load-a", "load-b", "reuse-a", "reuse-b"])
  tc[id] = { opacity: 0 };
const tiling = base(
  "systems-tiled-memory",
  "Move the tile. Keep the sum.",
  "A 2×2 tile computes part of C=A×B from 3×3 inputs. Change the row or column tile to expose an edge. Scrub through two loads, three k-products, and one final store. PAD cells are explicit zeros, never out-of-range reads.",
  {
    tileRow: num("Output row tile", 0, 0, 1, 1),
    tileColumn: num("Output column tile", 0, 0, 1, 1),
  },
  tilingNodes,
  { width: 320, height: 1070, overrides: tc },
  670,
  5500,
  [
    {
      atMs: 0,
      text: "Choose a 2×2 output tile. A is [[1,2,0],[−1,3,1],[2,1,4]] and B is [[2,1,−1],[0,3,2],[1,−2,1]]. All accumulators begin at zero.",
    },
    {
      atMs: 1100,
      text: "The first k tile is loaded. Valid global reads are counted; the same scratch values serve several output products.",
    },
    {
      atMs: 1500,
      text: "Accumulate the product for k=0. Keep these partial sums; C is not written yet.",
    },
    {
      atMs: 2400,
      text: "Add k=1. Loading the next tile must not reset the accumulators.",
    },
    {
      atMs: 4000,
      text: "The second k tile contains k=2 and padding. PAD contributes zero without a global read.",
    },
    {
      atMs: 4400,
      text: "Add k=2. Edge output cells stay outside; they are never written.",
    },
    {
      atMs: 5000,
      text: "Write each valid output once. This idealized traffic model ignores cache hits and hardware transactions, so it is not a speed claim.",
    },
  ],
  "Compute a selected 2×2 output tile of a 3×3 matrix multiplication. A=[[1,2,0],[−1,3,1],[2,1,4]], B=[[2,1,−1],[0,3,2],[1,−2,1]]. C=[[2,7,3],[−1,6,8],[8,−3,4]]. The first scratch load covers k=0,1; the second covers k=2 plus padded zero. Add products at 1.5, 2.4 and 4.4 seconds; write at 5 seconds. If the output tile has R valid rows and C valid columns, input reads total 3R+3C, stores RC, and FP32 traffic is 4(3R+3C+RC) bytes. The naive no-cache input count is 6RC. These count scalar global operations for one output tile, not actual memory transactions or measured throughput. Padding never reads or writes outside a matrix.",
);

const scenes = [attention, pipeline, tiling].map((scene) => {
  try {
    return parseScene(scene);
  } catch (error) {
    throw new Error(`${scene.id}: ${error.message}`, { cause: error });
  }
});
const bindings = [
  {
    visualId: attention.id,
    episodeId: "ttf-e07-02",
    afterBlockId: "ttf-07-02-text-1",
  },
  {
    visualId: pipeline.id,
    episodeId: "sys-e10-02",
    afterBlockId: "sys-10-02-text-1",
  },
  {
    visualId: tiling.id,
    episodeId: "sys-e09-02",
    afterBlockId: "sys-09-02-text-1",
  },
];
const root = new URL("../", import.meta.url);
const modules = await Promise.all(
  ["training-and-transformers", "systems-and-distribution"].map(async (name) =>
    JSON.parse(await readFile(new URL(`content/${name}.json`, root), "utf8")),
  ),
);
for (const binding of bindings) {
  const episode = modules
    .flatMap((m) => m.chapters)
    .flatMap((c) => c.episodes)
    .find((e) => e.id === binding.episodeId);
  assert(
    episode?.blocks.some((b) => b.id === binding.afterBlockId),
    "Missing existing episode/block binding",
  );
}
const directory = path.dirname(fileURLToPath(entry)),
  manifest = JSON.parse(
    await readFile(path.join(directory, "../package.json"), "utf8"),
  );
const files = [];
async function collect(relative = "") {
  for (const e of await readdir(path.join(directory, relative), {
    withFileTypes: true,
  })) {
    const name = path.join(relative, e.name);
    if (e.isDirectory()) await collect(name);
    else if (e.isFile() && /\.(js|css|json)$/.test(name)) files.push(name);
  }
}
await collect();
const hash = createHash("sha256");
for (const name of files.sort())
  hash
    .update(name.replaceAll(path.sep, "/"))
    .update("\0")
    .update(await readFile(path.join(directory, name)))
    .update("\0");
hash.update(
  JSON.stringify({
    version: manifest.version,
    dependencies: manifest.dependencies,
    peerDependencies: manifest.peerDependencies,
  }),
);
const extension = {
  id: "course-core-svg-v1",
  version: manifest.version,
  integrity: `sha256-${hash.digest("hex")}`,
  platforms: ["web"],
  execution: "declarative",
  entrypoint: "renderers/svg-v1.js",
  capabilities: ["visual.render"],
  accessibility: {
    keyboard: true,
    reducedMotion: true,
    textAlternative:
      "All three systems scenes include their numeric contracts, live readouts, and complete text equivalents.",
  },
};
const visuals = scenes.map(toVisualExperience);
assert.deepEqual(visuals.map(fromVisualExperience), scenes);
await writeFile(
  new URL("visuals/systems-scenes.json", root),
  JSON.stringify({ schemaVersion: 1, scenes, bindings }, null, 2) + "\n",
  { mode: 0o600 },
);
await writeFile(
  new URL("content/systems-visuals.json", root),
  JSON.stringify({ extension, visuals, bindings }, null, 2) + "\n",
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    scenes: scenes.map((s) => s.id),
    bindings,
    integrity: extension.integrity,
    consumption: process.env.COURSE_VISUALS_ARTIFACT
      ? "explicit-development-built-artifact"
      : "released-package",
  }),
);
