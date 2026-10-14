// Private authoring only. Builds twenty-four bounded concept scenes (three batches
// of eight) with the released @course-core/visuals package and writes exactly two
// files:
//   visuals/concept-scenes.json and content/concept-visuals.json
// A development build may be selected only through an explicit file: URL to a
// built dist/headless.js (same convention as the systems and learning scenes).
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
const {
  parseScene,
  toVisualExperience,
  fromVisualExperience,
  VisualRuntime,
  flattenNodes,
} = await import(artifact);

// ---------------------------------------------------------------- AST helpers
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
  gt = (a, b) => op("gt", a, b),
  lt = (a, b) => op("lt", a, b),
  le = (a, b) => op("lte", a, b),
  and = (...v) => op("and", ...v),
  or = (...v) => op("or", ...v),
  not = (v) => op("not", v),
  abs = (v) => op("abs", v),
  floor = (v) => op("floor", v),
  max = (...v) => op("max", ...v),
  min = (...v) => op("min", ...v),
  mod = (a, b) => op("mod", a, b),
  sqrt = (v) => op("sqrt", v),
  sin = (v) => op("sin", v),
  cos = (v) => op("cos", v);
const r3 = (value) => div(op("round", mul(value, 1000)), 1000);
const r6 = (value) => div(op("round", mul(value, 1000000)), 1000000);
const cat = (...v) => op("concat", ...v);
const progress = (start, duration) =>
  op("clamp", div(sub(t, start), duration), 0, 1);
const after = (ms, value, waiting) => iff(ge(t, ms), value, waiting);

// ---------------------------------------------------------------- palette
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
  red = "#9A3324",
  rose = "#FBE9E6",
  pale = "#F8FAF8",
  line = "#CBDCD6",
  white = "#FFFFFF";

// ---------------------------------------------------------------- node helpers
const text = (id, value, x, y, fontSize = 17, fill = ink) => ({
  kind: "text",
  id,
  text: value,
  x,
  y,
  fontSize,
  fill,
});
const bold = (id, value, x, y, fontSize = 20, fill = ink) => ({
  ...text(id, value, x, y, fontSize, fill),
  weight: "bold",
});
const centered = (node) => ({ ...node, align: "middle" });
const rect = (id, x, y, width, height, fill, cornerRadius = 12) => ({
  kind: "rect",
  id,
  x,
  y,
  width,
  height,
  fill,
  cornerRadius,
});
const circle = (id, x, y, radius, fill) => ({
  kind: "circle",
  id,
  x,
  y,
  radius,
  fill,
});
// A line from (x, y) to (x + dx, y + dy); the runtime treats x2/y2 as offsets.
const segment = (id, x, y, dx, dy, stroke, strokeWidth = 3) => ({
  kind: "line",
  id,
  x,
  y,
  x2: dx,
  y2: dy,
  stroke,
  strokeWidth,
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
const choice = (label, options, initial = options[0]) => ({
  kind: "enum",
  label,
  initial,
  options,
});
const flag = (label, initial = false) => ({ kind: "boolean", label, initial });
// Transparent interaction surface placed after the glyphs it covers, so text
// never swallows a tap. Keyboard: Enter/Space (activate) or arrows (drag).
const handle = (id, x, y, width, height, label, manipulate) => ({
  ...rect(id, x, y, width, height, "#FFFFFF00", 6),
  label,
  manipulate,
});

// Every card is 288 units wide in BOTH layouts. Expanded arranges cards in a
// three-column grid (24 + 3×288 + 2×24 + 24 = 960); compact stacks them at
// x=16 in a 320-unit canvas. Card content is never re-flowed, only
// re-positioned, which keeps text sizes identical (≥17 units) in both layouts.
const CW = 288,
  COLS = [24, 336, 648];
function card(id, height, wash, accent, title, children) {
  return {
    height,
    node: group(id, 0, 0, [
      rect(`${id}-bg`, 0, 0, CW, height, wash),
      text(`${id}-title`, title, 16, 32, 17, accent),
      ...children,
    ]),
  };
}
function build({
  id,
  title,
  description,
  state,
  kicker,
  subtitle,
  grid,
  compactOrder,
  durationMs,
  cues,
  accessible,
}) {
  const nodes = [
    rect(`${id}-canvas`, 0, 0, 960, 100, pale, 22),
    bold(`${id}-kicker`, kicker, 24, 38, 17, teal),
    text(`${id}-subtitle`, subtitle, 24, 66, 17, muted),
  ];
  const overrides = {
    [`${id}-kicker`]: { x: 16 },
    [`${id}-subtitle`]: { x: 16 },
  };
  const columnY = [88, 88, 88];
  for (const [c, col] of grid) {
    c.node.x = COLS[col];
    c.node.y = columnY[col];
    columnY[col] += c.height + 24;
    nodes.push(c.node);
  }
  const expandedHeight = Math.max(...columnY);
  let y = 88;
  for (const c of compactOrder) {
    overrides[c.node.id] = { x: 16, y };
    y += c.height + 16;
  }
  const compactHeight = y;
  nodes[0].height = expandedHeight;
  overrides[`${id}-canvas`] = { width: 320, height: compactHeight };
  return {
    version: 1,
    id,
    title,
    description,
    state,
    controls: Object.keys(state),
    nodes,
    layouts: {
      compact: { width: 320, height: compactHeight, overrides },
      expanded: { width: 960, height: expandedHeight },
      breakpoint: 800,
    },
    timeline: { durationMs, tracks: [], cues },
    accessibility: {
      text: accessible,
      reducedMotion: { atMs: durationMs, description: accessible },
    },
    referenceChecks: [`${id}-cpu`],
  };
}
// Pick the value for a state enum from a parallel list of options.
const pick = (expr, options, values) =>
  values
    .slice(0, -1)
    .reduceRight(
      (rest, value, i) => iff(eq(expr, options[i]), value, rest),
      values.at(-1),
    );

// ============================================================ 01 matmul and reductions
// fnd-e02-03: C = A·B with A (2×3), B (3×2); reductions name an axis and a divisor.
const matmulScene = (() => {
  const cell = s("cell"),
    a12 = s("a12"),
    zero = eq(s("init"), "Zero literal"),
    axis = s("axis"),
    keep = s("keep");
  const A = [
    [1, 2, 3],
    [4, 5, a12],
  ];
  const B = [
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  const cells = ["C[0,0]", "C[0,1]", "C[1,0]", "C[1,1]"];
  const i = iff(or(eq(cell, "C[1,0]"), eq(cell, "C[1,1]")), 1, 0);
  const j = iff(or(eq(cell, "C[0,1]"), eq(cell, "C[1,1]")), 1, 0);
  const Ai = [0, 1, 2].map((r) => iff(eq(i, 0), A[0][r], A[1][r]));
  const Bj = [0, 1, 2].map((r) => iff(eq(j, 0), B[r][0], B[r][1]));
  const p = [0, 1, 2].map((r) => mul(Ai[r], Bj[r]));
  const acc = [p[0], add(p[0], p[1]), add(p[0], p[1], p[2])];
  const C = [0, 1].map((ii) =>
    [0, 1].map((jj) => add(...[0, 1, 2].map((r) => mul(A[ii][r], B[r][jj])))),
  );
  const cellBox = (prefix, value, x, y, w, highlight, hlFill) => [
    rect(`${prefix}-cell`, x, y, w, 34, white, 6),
    { ...rect(`${prefix}-hl`, x, y, w, 34, hlFill, 6), opacity: highlight },
    centered(
      bold(
        `${prefix}-v`,
        typeof value === "number" ? String(value) : value,
        x + w / 2,
        y + 23,
        17,
      ),
    ),
  ];
  const operands = card("mm-ab", 236, ice, blue, "A (2×3) · B (3×2)", [
    ...[0, 1].flatMap((ii) =>
      [0, 1, 2].flatMap((r) =>
        cellBox(`mm-a-${ii}-${r}`, A[ii][r], 16 + 44 * r, 48 + 40 * ii, 40, after(800, iff(eq(i, ii), 0.3, 0), 0), blue),
      ),
    ),
    ...[0, 1, 2].flatMap((r) =>
      [0, 1].flatMap((jj) =>
        cellBox(`mm-b-${r}-${jj}`, B[r][jj], 176 + 48 * jj, 48 + 40 * r, 40, after(800, iff(eq(j, jj), 0.3, 0), 0), purple),
      ),
    ),
    text("mm-index", "C[i,j] = Σr A[i,r]·B[r,j]", 16, 196),
    text("mm-shared", "shared k = 3 is reduced", 16, 222, 17, muted),
  ]);
  const product = card("mm-c", 334, lilac, purple, "C = A·B (2×2)", [
    ...[0, 1].flatMap((ii) =>
      [0, 1].flatMap((jj) =>
        cellBox(
          `mm-c-${ii}-${jj}`,
          C[ii][jj],
          16 + 60 * jj,
          48 + 40 * ii,
          56,
          iff(eq(cell, `C[${ii},${jj}]`), 0.3, 0),
          purple,
        ),
      ),
    ),
    text("mm-tap", "tap a cell", 152, 72, 17, muted),
    text("mm-shape", "shape (2,2)", 152, 112, 17, muted),
    text(
      "mm-start",
      after(1600, iff(zero, "start: acc = 0", "start: acc = term 0"), "start: …"),
      16,
      152,
    ),
    ...[0, 1, 2].map((r) =>
      text(
        `mm-term-${r}`,
        after(1600 + 600 * r, cat(`r=${r}: `, Ai[r], "·", Bj[r], " → acc ", acc[r]), `r=${r}: …`),
        16,
        180 + 28 * r,
      ),
    ),
    bold("mm-result", after(3400, cat(cell, " = ", acc[2]), cat(cell, " = …")), 16, 268, 20, purple),
    text("mm-adds", after(3400, cat("adds here: ", iff(zero, 3, 2)), "adds here: …"), 16, 296),
    text("mm-total", cat("all 4: 12 mul, ", iff(zero, 12, 8), " add"), 16, 322, 17, muted),
    ...[0, 1].flatMap((ii) =>
      [0, 1].map((jj) =>
        handle(`mm-pick-${ii}-${jj}`, 16 + 60 * jj, 48 + 40 * ii, 56, 34, `Compute C[${ii},${jj}]`, {
          activate: { state: "cell", value: `C[${ii},${jj}]` },
        }),
      ),
    ),
  ]);
  const ax1 = eq(axis, "axis 1"),
    ax0 = eq(axis, "axis 0");
  const rows = [6, add(9, a12)],
    cols = [5, 7, add(3, a12)],
    all = add(15, a12);
  const wrap = (inner) => iff(keep, cat("[[", inner, "]]"), cat("[", inner, "]"));
  const allWrap = (v) => iff(keep, cat("[[", v, "]]"), v);
  const sumText = iff(
    ax1,
    iff(keep, cat("[[", rows[0], "], [", rows[1], "]]"), cat("[", rows[0], ", ", rows[1], "]")),
    iff(ax0, wrap(cat(cols[0], ", ", cols[1], ", ", cols[2])), allWrap(all)),
  );
  const meanText = iff(
    ax1,
    iff(
      keep,
      cat("[[", 2, "], [", r3(div(rows[1], 3)), "]]"),
      cat("[", 2, ", ", r3(div(rows[1], 3)), "]"),
    ),
    iff(ax0, wrap(cat(2.5, ", ", 3.5, ", ", r3(div(cols[2], 2)))), allWrap(r3(div(all, 6)))),
  );
  const shape = iff(ax1, iff(keep, "(2,1)", "(2,)"), iff(ax0, iff(keep, "(1,3)", "(3,)"), iff(keep, "(1,1)", "()")));
  const divisor = iff(ax1, 3, iff(ax0, 2, 6));
  const reduce = card("mm-reduce", 254, sand, gold, "REDUCE A, NAME THE AXIS", [
    text("mm-axis", cat("over ", axis, iff(keep, ", keepdims", "")), 16, 62, 17, muted),
    text("mm-sum", after(4000, cat("sum: ", sumText), "sum: …"), 16, 92),
    text("mm-rshape", after(4000, cat("shape: ", shape), "shape: …"), 16, 120),
    text("mm-div", after(4600, cat("divisor: ", divisor), "divisor: …"), 16, 148),
    bold("mm-mean", after(4600, cat("mean: ", meanText), "mean: …"), 16, 182, 18, gold),
    text("mm-rowsums", cat("mean of row sums: ", r3(div(add(rows[0], rows[1]), 2))), 16, 214),
    text("mm-habit", "Name axis and divisor.", 16, 240, 17, muted),
  ]);
  return build({
    id: "concept-matmul-reduce",
    title: "Rows meet columns. Axes disappear.",
    description:
      "Pick an output cell of C = A·B and watch its three products accumulate. Then reduce A over a named axis, keep or drop the reduced dimension, and compare the divisor of each mean.",
    state: {
      cell: choice("Output cell", cells, "C[0,1]"),
      a12: num("Entry A[1,2]", 6, -3, 9, 1),
      init: choice("Accumulator start", ["First product", "Zero literal"]),
      axis: choice("Reduce A over", ["axis 1", "axis 0", "all axes"]),
      keep: flag("Keep reduced dims"),
    },
    kicker: "01 / ONE INDEX IS REDUCED",
    subtitle: "A rows meet B columns",
    grid: [
      [operands, 0],
      [product, 1],
      [reduce, 2],
    ],
    compactOrder: [operands, product, reduce],
    durationMs: 5200,
    cues: [
      { atMs: 0, text: "A is 2×3 and B is 3×2, so C = A·B is 2×2. Predict the chosen cell first." },
      { atMs: 800, text: "Row i of A meets column j of B along the shared index r." },
      { atMs: 1600, text: "Multiply matching entries and add them into an accumulator, one r at a time." },
      { atMs: 3400, text: "The shared dimension is gone. State whether the loop starts from zero or from the first product." },
      { atMs: 4000, text: "A reduction also removes an axis. Say which one, and whether its size-1 dimension is kept." },
      { atMs: 4600, text: "A mean divides by the size of what was reduced. Averaging row sums is a different number." },
    ],
    accessible:
      "Matrix multiplication and reductions with the lesson's matrices. A has rows [1, 2, 3] and [4, 5, a] where a = A[1,2] defaults to 6; B has rows [1, 0], [0, 1] and [1, 1]. C[i,j] is the sum over r of A[i,r]·B[r,j], so C = [[4, 5], [10, 11]] by default and C[0,1] = 1·0 + 2·1 + 3·1 = 5. Each output needs three multiplications, twelve in total. Starting the accumulator from the first product needs two additions per output (eight in total); starting from a zero literal needs three (twelve). Summing A over axis 1 gives [6, 15] with shape (2,), or [[6], [15]] with shape (2,1) when the reduced dimension is kept; the means divide by 3. Over axis 0 the sums are [5, 7, 9], shape (3,), divisor 2. Over all axes the sum is 21 and the mean is 21/6 = 3.5, while the mean of the two row sums is 10.5, a different quantity. Changing a changes C[1,0], C[1,1] and every sum and mean that includes it.",
  });
})();

// ============================================================ 02 chain rule and a step
// fnd-e03-02: p = w·x, r = p − y, L = r²/2 with y = 5. dL/dw = r·x; a step δ.
const chainScene = (() => {
  const w = s("w"),
    x = s("x"),
    d = s("delta");
  const Y = 5,
    h = 1e-5;
  const lossAt = (wv) => {
    const r = sub(mul(wv, x), Y);
    return div(mul(r, r), 2);
  };
  const p = mul(w, x),
    r = sub(p, Y),
    L = lossAt(w),
    g = mul(r, x);
  const guess = add(L, mul(g, d)),
    exact = lossAt(add(w, d)),
    gap = sub(exact, guess);
  const central = div(sub(lossAt(add(w, h)), lossAt(sub(w, h))), 2 * h);
  const forward = card("cr-forward", 204, ice, blue, "FORWARD (y = 5)", [
    bold("cr-w", cat("w = ", w), 16, 66, 20, blue),
    text("cr-x", cat("x = ", x), 16, 96),
    text("cr-p", after(400, cat("p = w·x = ", r3(p)), "p = …"), 16, 124),
    text("cr-r", after(800, cat("r = p − y = ", r3(r)), "r = …"), 16, 152),
    bold("cr-loss", after(1200, cat("L = r²/2 = ", r3(L)), "L = …"), 16, 186, 20, blue),
  ]);
  const chain = card("cr-chain", 204, lilac, purple, "CHAIN RULE", [
    text("cr-dr", after(1600, cat("dL/dr = r = ", r3(r)), "dL/dr = …"), 16, 62),
    text("cr-dp", after(2000, "dr/dp = 1", "dr/dp = …"), 16, 90),
    text("cr-dw", after(2400, cat("dp/dw = x = ", x), "dp/dw = …"), 16, 118),
    bold("cr-grad", after(2800, cat("dL/dw = r·x = ", r3(g)), "dL/dw = …"), 16, 154, 20, purple),
    text("cr-central", after(3200, cat("central diff: ", r3(central)), "central diff: …"), 16, 186),
  ]);
  const X = (wv) => add(16, mul(64, wv)),
    Yp = (Lv) => sub(190, mul(5, Lv));
  const curve = {
    kind: "path",
    id: "cr-curve",
    commands: Array.from({ length: 17 }, (_, k) => ({
      command: k ? "L" : "M",
      x: 16 + 16 * k,
      y: Yp(lossAt(k / 4)),
    })),
    stroke: blue,
    strokeWidth: 3,
    fill: "none",
  };
  const plot = card("cr-plot", 282, mint, teal, "L(w) FOR w IN 0…4", [
    segment("cr-axis", 16, 190, 256, 0, line, 2),
    curve,
    {
      ...segment("cr-tangent", X(w), Yp(L), mul(64, d), mul(-5, mul(g, d)), gold, 3),
      opacity: after(3600, 1, 0),
    },
    {
      ...segment("cr-gapline", X(add(w, d)), Yp(guess), 0, mul(-5, gap), red, 3),
      opacity: after(4200, 1, 0),
    },
    circle("cr-now", X(w), Yp(L), 6, ink),
    { ...circle("cr-guessdot", X(add(w, d)), Yp(guess), 5, gold), opacity: after(3600, 1, 0) },
    { ...circle("cr-exactdot", X(add(w, d)), Yp(exact), 5, teal), opacity: after(4200, 1, 0) },
    text("cr-legend-1", "gold: tangent guess", 16, 242, 17, gold),
    text("cr-legend-2", "teal: exact L(w+δ)", 16, 268, 17, teal),
    handle("cr-w-handle", 0, 48, CW, 176, "Drag or use arrows to change w", { x: { state: "w", from: 16, to: 208 } }),
  ]);
  const step = card("cr-step", 254, sand, gold, "TAKE A STEP δ", [
    bold("cr-delta", cat("δ = ", d), 16, 66, 20, gold),
    text("cr-guess", after(3600, cat("guess L+g·δ: ", r6(guess)), "guess L+g·δ: …"), 16, 98),
    text("cr-exact", after(4200, cat("exact: ", r6(exact)), "exact: …"), 16, 126),
    bold("cr-gap", after(4600, cat("gap: ", r6(gap)), "gap: …"), 16, 162, 20, red),
    text("cr-gapform", after(4600, cat("x²δ²/2 = ", r6(div(mul(x, x, d, d), 2))), "x²δ²/2 = …"), 16, 192),
    text("cr-note-1", "A local line is not", 16, 220, 17, muted),
    text("cr-note-2", "the whole curve.", 16, 244, 17, muted),
  ]);
  return build({
    id: "concept-chain-rule",
    title: "Multiply the links. Then test the line.",
    description:
      "Move w, x and a step δ. Follow the three local derivatives of the half squared error, multiply them into dL/dw, and compare the tangent-line prediction of a step with the exact loss.",
    state: {
      w: num("Weight w", 1, 0, 3, 0.25),
      x: num("Input x", 2, 0, 3, 0.5),
      delta: num("Step δ", 0.01, 0, 1, 0.01),
    },
    kicker: "02 / SENSITIVITY IS LOCAL",
    subtitle: "p = w·x, r = p − y, L = r²/2",
    grid: [
      [forward, 0],
      [chain, 0],
      [plot, 1],
      [step, 2],
    ],
    compactOrder: [forward, chain, plot, step],
    durationMs: 5000,
    cues: [
      { atMs: 0, text: "Forward: prediction, residual, then the half squared error with target y = 5." },
      { atMs: 1600, text: "Three local links: dL/dr = r, dr/dp = 1 and dp/dw = x." },
      { atMs: 2800, text: "The chain rule multiplies them: dL/dw = r·x. A central difference agrees." },
      { atMs: 3600, text: "Predict the loss after a step δ with the tangent line: L + g·δ." },
      { atMs: 4200, text: "The exact loss differs by the omitted quadratic term, x²δ²/2." },
      { atMs: 4600, text: "Small steps make the line accurate; large steps measure the curve. With x = 0, w has no effect." },
    ],
    accessible:
      "Chain rule on one example with target y = 5. Prediction p = w·x, residual r = p − 5 and loss L = r²/2. The local derivatives are dL/dr = r, dr/dp = 1 and dp/dw = x, so dL/dw = r·x. At the lesson's x = 2, w = 1: p = 2, r = −3, L = 4.5 and dL/dw = −6, which a central difference with h = 0.00001 confirms. For a step δ = 0.01 the tangent line predicts 4.5 − 0.06 = 4.44, while the exact loss at w = 1.01 is 4.4402. The gap is always x²δ²/2, the quadratic term the line omits, so it is 0.0002 here and grows with the square of the step. The plot shows L(w) for w from 0 to 4, the tangent segment from w to w + δ and the exact value at w + δ. With x = 0 the weight cannot affect the prediction, so its gradient is zero.",
  });
})();

// ============================================================ 03 gradient accumulation
// fnd-e04-03: weight microbatch means by example count; clear the buffer per window.
const accumulateScene = (() => {
  const n1 = s("n1"),
    g1 = s("g1"),
    n2 = s("n2"),
    g2 = s("g2"),
    equal = eq(s("rule"), "Equal mean of means"),
    clear = s("clear");
  const b1 = iff(equal, g1, mul(n1, g1)),
    b2 = add(b1, iff(equal, g2, mul(n2, g2)));
  const count = add(n1, n2),
    denom = iff(equal, 2, count);
  const grad = div(b2, denom),
    full = div(add(mul(n1, g1), mul(n2, g2)), count);
  const w1 = sub(10, mul(0.1, grad)),
    nextBuffer = iff(clear, 2, add(grad, 2)),
    w2 = sub(w1, mul(0.1, nextBuffer)),
    intended = sub(sub(10, mul(0.1, full)), 0.2);
  const slots = Array.from({ length: 8 }, (_, k) => {
    const x = 16 + 32 * k;
    return [
      rect(`ga-slot-${k}`, x, 48, 28, 28, white, 5),
      k < 4
        ? { ...rect(`ga-mb1-${k}`, x, 48, 28, 28, teal, 5), opacity: iff(lt(k, n1), 1, 0) }
        : { ...rect(`ga-mb2-${k}`, x, 48, 28, 28, purple, 5), opacity: iff(lt(k - 4, n2), 1, 0) },
    ];
  }).flat();
  const batches = card("ga-batches", 216, ice, blue, "TWO MICROBATCHES", [
    ...slots,
    text("ga-mb1", cat("mb1: ", n1, " × mean ", g1), 16, 110, 17, teal),
    text("ga-mb2", cat("mb2: ", n2, " × mean ", g2), 16, 138, 17, purple),
    text("ga-count", cat("examples: ", count), 16, 166),
    text("ga-start", "w = 10, η = 0.1", 16, 198, 17, muted),
  ]);
  const accumulate = card("ga-accumulate", 262, lilac, purple, "ACCUMULATE, THEN DIVIDE", [
    text("ga-rule", cat("rule: ", s("rule")), 16, 62, 17, muted),
    text("ga-buf1", after(1000, cat("after mb1: ", b1), "after mb1: …"), 16, 92),
    text("ga-buf2", after(2000, cat("after mb2: ", b2), "after mb2: …"), 16, 120),
    text("ga-denom", after(2800, cat("divide by ", denom), "divide by …"), 16, 148),
    bold("ga-grad", after(2800, cat("grad = ", r3(grad)), "grad = …"), 16, 184, 20, purple),
    text("ga-full", after(2800, cat("full batch: ", r3(full)), "full batch: …"), 16, 214),
    bold(
      "ga-verdict",
      after(2800, iff(lt(abs(sub(grad, full)), 1e-9), "matches full batch", "wrong weighting"), "…"),
      16,
      244,
      18,
      purple,
    ),
  ]);
  const update = card("ga-update", 262, sand, gold, "ONE UPDATE PER WINDOW", [
    text("ga-w0", "w0 = 10", 16, 62),
    bold("ga-w1", after(3400, cat("w1 = ", r3(w1)), "w1 = …"), 16, 96, 20, gold),
    text("ga-next", after(4200, "next window adds 2", "next window …"), 16, 126),
    text(
      "ga-nextbuf",
      after(4200, cat("buffer = ", r3(nextBuffer), iff(clear, " (cleared)", " (stale)")), "buffer = …"),
      16,
      154,
    ),
    bold("ga-w2", after(5000, cat("w2 = ", r3(w2)), "w2 = …"), 16, 190, 20, gold),
    text("ga-intended", after(5000, cat("intended w2 = ", r3(intended)), "intended w2 = …"), 16, 220),
    text("ga-clear", iff(clear, "reset at window start", "reset forgotten (bug)"), 16, 248, 17, muted),
  ]);
  return build({
    id: "concept-grad-accumulation",
    title: "Weight by count. Clear each window.",
    description:
      "Two microbatches of different sizes contribute to one update. Change their sizes and mean gradients, compare count weighting with an equal average of means, and see what a buffer that is never cleared does to the next step.",
    state: {
      n1: num("Examples in mb1", 2, 1, 4, 1),
      g1: num("Mean gradient mb1", 3, -4, 4, 1),
      n2: num("Examples in mb2", 1, 1, 4, 1),
      g2: num("Mean gradient mb2", -3, -4, 4, 1),
      rule: choice("Combine rule", ["Weight by count", "Equal mean of means"]),
      clear: flag("Clear buffer each window", true),
    },
    kicker: "03 / ONE WINDOW, ONE UPDATE",
    subtitle: "mean over all examples",
    grid: [
      [batches, 0],
      [accumulate, 1],
      [update, 2],
    ],
    compactOrder: [batches, accumulate, update],
    durationMs: 5400,
    cues: [
      { atMs: 0, text: "Both microbatches were computed at the same weight, w = 10. Predict the full-batch mean gradient." },
      { atMs: 1000, text: "Add the first contribution: its example count times its mean gradient." },
      { atMs: 2000, text: "Add the second contribution. No weight update happens between microbatches." },
      { atMs: 2800, text: "Divide by the total example count. An equal average of the two means ignores their sizes." },
      { atMs: 3400, text: "One optimizer step at the window boundary: w ← w − η·grad." },
      { atMs: 4200, text: "The next window contributes 2. A buffer that was not cleared still holds the old gradient." },
    ],
    accessible:
      "Gradient accumulation over two microbatches at weight 10 with learning rate 0.1. The lesson's case has 2 examples with mean gradient 3 and 1 example with mean gradient −3. Weighting each mean by its example count gives (2·3 + 1·(−3)) / 3 = 1, the full-batch mean, and the update gives w = 9.9. An equal average of the two means gives (3 − 3) / 2 = 0 and leaves w at 10. The two rules agree only when the microbatch sizes or their means are equal. The next accumulation window contributes 2: if the buffer was cleared the second update uses 2 and w becomes 9.7; if it was not, the buffer holds 1 + 2 = 3 and w becomes 9.6. Contributions are combined only between updates; updating after each microbatch would be several optimization steps, which this scene does not model.",
  });
})();

// ============================================================ 04 ReLU gates the gradient
// ttf-e05-01: x → z = W1·x + b1 → ReLU → ŷ = v·h + 0.5, half squared error.
const reluScene = (() => {
  const x1 = s("x1"),
    x2 = s("x2"),
    y = s("target"),
    relu = eq(s("act"), "ReLU");
  const z = [add(mul(2, x1), x2, 1), add(mul(-1, x1), mul(2, x2))];
  const h = z.map((v) => iff(relu, max(0, v), v));
  const pred = add(mul(3, h[0]), mul(-1, h[1]), 0.5);
  const r = sub(pred, y),
    L = div(mul(r, r), 2);
  const sh = [mul(3, r), mul(-1, r)];
  const gate = z.map((v) => iff(relu, iff(gt(v, 0), 1, 0), 1));
  const sz = sh.map((v, k) => mul(v, gate[k]));
  const affine = add(mul(7, x1), x2, 3.5);
  const vec = (a, b) => cat("[", r3(a), ", ", r3(b), "]");
  const forward = card("rg-forward", 232, ice, blue, "FORWARD", [
    text("rg-x", cat("x = [", x1, ", ", x2, "]"), 16, 64),
    text("rg-z", after(700, cat("z = ", vec(z[0], z[1])), "z = …"), 16, 92),
    text("rg-h", after(1400, cat("h = ", vec(h[0], h[1])), "h = …"), 16, 120),
    text("rg-act", cat("act: ", s("act")), 16, 148, 17, muted),
    bold("rg-pred", after(2100, cat("ŷ = ", r3(pred)), "ŷ = …"), 16, 184, 20, blue),
    text("rg-loss", after(2100, cat("y = ", y, ", L = ", r3(L)), "L = …"), 16, 214),
  ]);
  const gateDot = (k, x) => [
    { ...circle(`rg-gate-${k}`, x, 112, 9, white), stroke: teal, strokeWidth: 2 },
    { ...circle(`rg-open-${k}`, x, 112, 7, teal), opacity: after(3500, gate[k], 0) },
    text(`rg-gate-label-${k}`, after(3500, cat(`u${k} `, iff(eq(gate[k], 1), "open", "shut")), `u${k} …`), x + 16, 118),
  ];
  const backward = card("rg-backward", 282, lilac, purple, "BACKWARD", [
    text("rg-r", after(2800, cat("r = ŷ − y = ", r3(r)), "r = …"), 16, 62),
    text("rg-sh", after(2800, cat("∂h = ", vec(sh[0], sh[1])), "∂h = …"), 16, 90),
    ...gateDot(0, 26),
    ...gateDot(1, 160),
    bold("rg-sz", after(3500, cat("∂z = ", vec(sz[0], sz[1])), "∂z = …"), 16, 152, 18, purple),
    text("rg-dw0", after(4200, cat("∂W row0 = ", vec(mul(sz[0], x1), mul(sz[0], x2))), "∂W row0 = …"), 16, 180),
    text("rg-dw1", after(4200, cat("∂W row1 = ", vec(mul(sz[1], x1), mul(sz[1], x2))), "∂W row1 = …"), 16, 208),
    text("rg-db", after(4200, cat("∂b = ", vec(sz[0], sz[1])), "∂b = …"), 16, 236),
    text("rg-dv", after(4200, cat("∂v = ", vec(mul(r, h[0]), mul(r, h[1]))), "∂v = …"), 16, 264),
  ]);
  const collapse = card("rg-collapse", 268, sand, gold, "WITHOUT THE BEND", [
    text("rg-affine-1", "no ReLU: one affine map", 16, 62),
    text("rg-affine-2", "7·x1 + 1·x2 + 3.5", 16, 90),
    bold("rg-affine", after(4800, cat("affine = ", r3(affine)), "affine = …"), 16, 124, 20, gold),
    text("rg-net", after(4800, cat("network ŷ = ", r3(pred)), "network ŷ = …"), 16, 154),
    bold(
      "rg-verdict",
      after(4800, iff(lt(abs(sub(pred, affine)), 1e-9), "same as affine", "differs: it bends"), "…"),
      16,
      188,
      18,
      gold,
    ),
    text("rg-params", "9 learned scalars", 16, 220),
    text("rg-zero", "at z = 0: gradient 0", 16, 250, 17, muted),
  ]);
  return build({
    id: "concept-relu-gate",
    title: "A bend gates the gradient.",
    description:
      "Feed two inputs through the lesson's two hidden units and one output. Watch ReLU block a negative preactivation in forward and its gradient in backward, then remove the nonlinearity and see the network collapse to one affine map.",
    state: {
      x1: num("Input x1", 1, -3, 3, 0.5),
      x2: num("Input x2", -2, -3, 3, 0.5),
      target: num("Target y", 1, -2, 4, 0.5),
      act: choice("Hidden activation", ["ReLU", "None (identity)"]),
    },
    kicker: "04 / NONLINEARITY MATTERS",
    subtitle: "the lesson's fixed weights",
    grid: [
      [forward, 0],
      [backward, 1],
      [collapse, 2],
    ],
    compactOrder: [forward, backward, collapse],
    durationMs: 5200,
    cues: [
      { atMs: 0, text: "Weights are fixed: W1 rows [2, 1] and [−1, 2], b1 = [1, 0], v = [3, −1], output bias 0.5." },
      { atMs: 700, text: "Each hidden preactivation is a dot product of a weight row with x, plus its bias." },
      { atMs: 1400, text: "ReLU keeps positive preactivations and replaces negative ones with zero." },
      { atMs: 2800, text: "Backward starts from the residual. Each hidden unit receives its output weight times r." },
      { atMs: 3500, text: "A closed gate passes no gradient: that unit's weight row and bias get zero for this example." },
      { atMs: 4800, text: "Without the nonlinearity, two affine layers equal one: 7·x1 + x2 + 3.5." },
    ],
    accessible:
      "A two-input, two-hidden-unit, one-output network with the lesson's weights: hidden rows [2, 1] and [−1, 2], hidden bias [1, 0], output weights [3, −1] and output bias 0.5, nine learned scalars in all. At x = [1, −2] the preactivations are [1, −5]; ReLU gives h = [1, 0] and the prediction is 3.5. With target 1 and half squared error, the residual is 2.5 and the loss 3.125. The hidden sensitivities are [7.5, −2.5]; ReLU passes the first and blocks the second, so the preactivation sensitivities are [7.5, 0], the first weight row's gradient is [7.5, −15], its bias gradient 7.5, and the output-weight gradients [2.5, 0]. This scene uses gradient 0 at exactly z = 0, a convention. Without the nonlinearity the network is the single affine map 7·x1 + x2 + 3.5 for every input; with ReLU it differs whenever a unit is shut.",
  });
})();

// ============================================================ 05 causal mask and the loss denominator
// ttf-e06-03: sequence [4,2,7,1]; inputs [4,2,7]; targets shifted by one.
const maskScene = (() => {
  const mask = s("mask"),
    query = s("query"),
    shifted = s("shifted"),
    denom = s("denominator"),
    lb = s("lossB");
  const MASKS = ["Causal j ≤ i", "No mask", "Transposed j ≥ i"];
  const rules = [(i, j) => j <= i, () => true, (i, j) => j >= i];
  const inputs = [4, 2, 7],
    targetsShifted = [2, 7, 1];
  const allowed = (i, j) => pick(mask, MASKS, rules.map((rule) => rule(i, j)));
  const qi = pick(query, ["Query 0", "Query 1", "Query 2"], [0, 1, 2]);
  const forQuery = (fn) => pick(query, ["Query 0", "Query 1", "Query 2"], [0, 1, 2].map(fn));
  const seesText = (i) =>
    pick(
      mask,
      MASKS,
      rules.map((rule) => [0, 1, 2].filter((j) => rule(i, j)).map((j) => inputs[j]).join(", ")),
    );
  // The target token's input position: i + 1 when shifted (none for i = 2), i when not.
  const targetVisible = (i) => iff(shifted, i < 2 ? allowed(i, i + 1) : false, allowed(i, i));
  const leaks = add(...[0, 1, 2].map((i) => iff(targetVisible(i), 1, 0)));
  const movedRows = pick(
    mask,
    MASKS,
    rules.map((rule) => [0, 1, 2].filter((i) => rule(i, 2)).join(", ")),
  );
  const earlierMoved = pick(mask, MASKS, rules.map((rule) => rule(0, 2) || rule(1, 2)));
  const sequence = card("cm-sequence", 164, ice, blue, "SEQUENCE", [
    text("cm-tokens", "tokens [4, 2, 7, 1]", 16, 62),
    text("cm-inputs", after(800, "inputs [4, 2, 7]", "inputs …"), 16, 92),
    text(
      "cm-targets",
      after(800, iff(shifted, "targets [2, 7, 1]", "targets [4, 2, 7]"), "targets …"),
      16,
      120,
    ),
    text("cm-shift", iff(shifted, "shifted by one: yes", "shifted by one: no"), 16, 148, 17, muted),
  ]);
  const grid = [0, 1, 2].flatMap((i) => [
    { ...rect(`cm-row-${i}`, 8, 64 + 40 * i, 272, 38, gold, 8), opacity: iff(eq(qi, i), 0.18, 0) },
    text(`cm-q-${i}`, `q${i}`, 16, 89 + 40 * i, 17, muted),
    ...[0, 1, 2].flatMap((j) => [
      rect(`cm-cell-${i}-${j}`, 64 + 48 * j, 66 + 40 * i, 44, 34, white, 6),
      {
        ...rect(`cm-on-${i}-${j}`, 64 + 48 * j, 66 + 40 * i, 44, 34, teal, 6),
        opacity: after(1600, iff(allowed(i, j), 0.75, 0), 0),
      },
    ]),
  ]);
  const maskCard = card("cm-mask", 250, mint, teal, "MASK: ROW q READS COLUMN", [
    ...[0, 1, 2].map((j) => centered(text(`cm-k-${j}`, `k${j}=${inputs[j]}`, 86 + 48 * j, 58, 17, muted))),
    ...grid,
    text("cm-rule", cat("rule: ", mask), 16, 222, 17, muted),
    ...[0, 1, 2].map((i) =>
      handle(`cm-pick-${i}`, 8, 64 + 40 * i, 272, 38, `Inspect query ${i}`, {
        activate: { state: "query", value: `Query ${i}` },
      }),
    ),
  ]);
  const queryCard = card("cm-query", 290, lilac, purple, "WHAT ONE QUERY SEES", [
    text("cm-qline", cat("query ", qi, ", token ", forQuery((i) => inputs[i])), 16, 62),
    text("cm-sees", after(2400, cat("sees: ", forQuery(seesText)), "sees: …"), 16, 90),
    text(
      "cm-target",
      after(2400, cat("target: ", forQuery((i) => iff(shifted, targetsShifted[i], inputs[i]))), "target: …"),
      16,
      118,
    ),
    text(
      "cm-visible",
      after(2400, cat("target visible: ", forQuery((i) => iff(targetVisible(i), "yes", "no"))), "target visible: …"),
      16,
      146,
    ),
    bold(
      "cm-verdict",
      after(2400, forQuery((i) => iff(targetVisible(i), "leak: reads target", "no leak")), "…"),
      16,
      180,
      18,
      purple,
    ),
    text("cm-leaks", after(3200, cat("rows leaking: ", leaks, " of 3"), "rows leaking: …"), 16, 212),
    text("cm-moved", after(3200, cat("edit k2 → rows ", movedRows), "edit k2 → rows …"), 16, 240),
    text(
      "cm-test",
      after(3200, iff(earlierMoved, "rows 0–1 moved: leak", "rows 0–1 fixed: ok"), "future-token test: …"),
      16,
      268,
      17,
      muted,
    ),
  ]);
  const means = [div(add(6, lb), 4), div(add(6, lb), 6), div(add(2, lb), 2)];
  const DENOMS = ["Valid tokens", "All slots", "Mean of seq means"];
  const chosen = pick(denom, DENOMS, means);
  const lossCard = card("cm-loss", 262, sand, gold, "LOSS DENOMINATOR", [
    text("cm-la", "seq A losses: 1, 2, 3", 16, 62),
    text("cm-lb", cat("seq B: ", lb, " + 2 pad slots"), 16, 90),
    text("cm-valid", after(4000, cat("valid tokens: ", r3(means[0])), "valid tokens: …"), 16, 124),
    text("cm-slots", after(4000, cat("all 6 slots: ", r3(means[1])), "all 6 slots: …"), 16, 152),
    text("cm-seqmean", after(4000, cat("seq means: ", r3(means[2])), "seq means: …"), 16, 180),
    bold("cm-chosen", after(4000, cat("chosen = ", r3(chosen)), "chosen = …"), 16, 214, 20, gold),
    text(
      "cm-intent",
      after(4000, iff(eq(denom, "Valid tokens"), "per valid token", "other weighting"), "…"),
      16,
      244,
      17,
      muted,
    ),
  ]);
  return build({
    id: "concept-causal-mask",
    title: "Read the past. Never the answer.",
    description:
      "Shift a four-token sequence into inputs and targets, choose an attention mask and a query row, and check whether that query can read its own target. Then choose how padded losses are averaged.",
    state: {
      mask: choice("Attention mask", MASKS),
      query: choice("Query row", ["Query 0", "Query 1", "Query 2"]),
      shifted: flag("Shift targets by one", true),
      denominator: choice("Loss denominator", DENOMS),
      lossB: num("Loss of seq B token", 4, 0, 8, 1),
    },
    kicker: "05 / MASKS AND LABELS",
    subtitle: "row i may read column j",
    grid: [
      [sequence, 0],
      [lossCard, 0],
      [maskCard, 1],
      [queryCard, 2],
    ],
    compactOrder: [sequence, maskCard, queryCard, lossCard],
    durationMs: 4600,
    cues: [
      { atMs: 0, text: "The full sequence is known during training. Predict which tokens each position may read." },
      { atMs: 800, text: "Inputs drop the last token; targets drop the first, so position i predicts token i + 1." },
      { atMs: 1600, text: "The causal mask lets query i read keys j ≤ i: its own token and earlier ones." },
      { atMs: 2400, text: "Can the chosen query read the token it must predict? If so, training can copy the answer." },
      { atMs: 3200, text: "Change only token 7. Under a correct mask, earlier rows cannot move." },
      { atMs: 4000, text: "The loss averages valid targets. Padding slots and per-sequence means change the weighting." },
    ],
    accessible:
      "Teacher forcing on the sequence [4, 2, 7, 1]. Inputs are [4, 2, 7] and targets, shifted by one, are [2, 7, 1], so input position i predicts the token at position i + 1. A causal mask lets query i read key j when j ≤ i: query 0 reads only 4, query 1 reads 4 and 2, query 2 reads all three. No target is visible to its own query, so no row leaks. Without a mask, queries 0 and 1 can read the input position that holds their target (2 and 7), so two rows leak; a transposed mask (j ≥ i) also leaks there. Without the shift the target is the query's own input token, which every one of these masks allows: all three rows copy their answer. The future-token test changes only token 7 at key 2: under the causal mask only row 2 can change, while with no mask or a transposed mask rows 0 and 1 change too, which exposes the leak. For the loss, sequence A has token losses 1, 2 and 3; sequence B has one valid loss (default 4) and two padding slots. The valid-token mean is 10/4 = 2.5, dividing by all six slots gives about 1.667, and averaging the two sequence means gives 3.",
  });
})();

// ============================================================ 06 RoPE relative position and GQA
// ttf-e07-03: rotate q by mθ and k by nθ; the dot product depends on n − m only.
const ropeScene = (() => {
  const m = s("m"),
    n = s("n"),
    th = s("theta"),
    bug = s("bug"),
    kv = pick(s("kvHeads"), ["4 KV heads", "2 KV heads", "1 KV head"], [4, 2, 1]);
  const q = [2, 1],
    k = [1, 3];
  const rad = (deg) => mul(deg, Math.PI / 180);
  const rot = ([a, b], deg) => [
    sub(mul(a, cos(rad(deg))), mul(b, sin(rad(deg)))),
    add(mul(a, sin(rad(deg))), mul(b, cos(rad(deg)))),
  ];
  const qAngle = mul(m, th),
    kAngle = iff(bug, 0, mul(n, th));
  const qr = rot(q, qAngle),
    kr = rot(k, kAngle);
  const dot = (u, v) => add(mul(u[0], v[0]), mul(u[1], v[1]));
  const rotDot = dot(qr, kr);
  const relDot = dot(q, rot(k, mul(sub(n, m), th)));
  const shiftDot = dot(rot(q, mul(add(m, 1), th)), rot(k, iff(bug, 0, mul(add(n, 1), th))));
  const S = 26,
    cx = 144,
    cy = 150;
  const shownQ = rot(q, mul(qAngle, progress(1000, 800))),
    shownK = rot(k, mul(kAngle, progress(2000, 800)));
  const tip = (v) => [add(cx, mul(S, v[0])), sub(cy, mul(S, v[1]))];
  const diagram = card("rp-diagram", 272, ice, blue, "ROTATE EACH PAIR", [
    { ...circle("rp-ring", cx, cy, 84, white), stroke: line, strokeWidth: 2 },
    segment("rp-xaxis", cx - 84, cy, 168, 0, line, 1),
    segment("rp-yaxis", cx, cy - 84, 0, 168, line, 1),
    segment("rp-q", cx, cy, mul(S, shownQ[0]), mul(-S, shownQ[1]), purple, 4),
    segment("rp-k", cx, cy, mul(S, shownK[0]), mul(-S, shownK[1]), teal, 4),
    circle("rp-qtip", ...tip(shownQ), 6, purple),
    circle("rp-ktip", ...tip(shownK), 6, teal),
    text("rp-legend", "purple q · teal k", 16, 258, 17, muted),
  ]);
  const vec = (v) => cat("[", r3(v[0]), ", ", r3(v[1]), "]");
  const readout = card("rp-readout", 290, lilac, purple, "q = [2, 1], k = [1, 3]", [
    text("rp-angles", cat("m·θ = ", qAngle, "°, n·θ = ", mul(n, th), "°"), 16, 62),
    text("rp-qr", after(1800, cat("R q = ", vec(qr)), "R q = …"), 16, 90),
    text("rp-kr", after(2800, cat("R k = ", vec(kr)), "R k = …"), 16, 118),
    bold("rp-dot", after(3000, cat("Rq·Rk = ", r3(rotDot)), "Rq·Rk = …"), 16, 154, 20, purple),
    text("rp-rel", after(3000, cat("q·R((n−m)θ)k = ", r3(relDot)), "q·R((n−m)θ)k = …"), 16, 184),
    text("rp-shift", after(3000, cat("both +1: ", r3(shiftDot)), "both +1: …"), 16, 212),
    bold(
      "rp-verdict",
      after(3000, iff(lt(abs(sub(rotDot, relDot)), 1e-9), "depends on n − m", "position bug"), "…"),
      16,
      246,
      18,
      purple,
    ),
    text("rp-norm", cat("|Rq| = ", r3(sqrt(dot(qr, qr))), " = |q|"), 16, 274, 17, muted),
  ]);
  const groupOf = (g, kvIndex) =>
    [0, 1, 2, 3]
      .filter((h) => Math.floor(h / (4 / g)) === kvIndex)
      .map((h) => `q${h}`)
      .join(" ");
  const gqa = card("rp-gqa", 306, sand, gold, "GROUPED-QUERY ATTENTION", [
    text("rp-heads", "4 query heads, D = 8", 16, 62),
    text("rp-kv", cat("KV heads: ", kv, ", d = 2"), 16, 90),
    ...[0, 1, 2, 3].map((g) => ({
      ...text(
        `rp-map-${g}`,
        after(3800, pick(s("kvHeads"), ["4 KV heads", "2 KV heads", "1 KV head"], [4, 2, 1].map((c) => (g < c ? `kv${g}: ${groupOf(c, g)}` : `kv${g}: none`))), `kv${g}: …`),
        16,
        118 + 28 * g,
      ),
      opacity: iff(lt(g, kv), 1, 0),
    })),
    text("rp-params", cat("Q 64 + K ", mul(16, kv), " + V ", mul(16, kv), " + O 64"), 16, 236),
    bold("rp-total", cat("total = ", add(128, mul(32, kv))), 16, 266, 20, gold),
    text("rp-cache", cat("K/V per token: ", mul(4, kv), " values"), 16, 294, 17, muted),
  ]);
  return build({
    id: "concept-rope-gqa",
    title: "Rotate both. Only the gap remains.",
    description:
      "Rotate a query pair by m·θ and a key pair by n·θ. Their dot product equals the unrotated query against the key rotated by (n − m)·θ, so shifting both positions changes nothing unless the key was cached without its rotation. Then share KV heads across query heads.",
    state: {
      m: num("Query position m", 1, 0, 6, 1),
      n: num("Key position n", 3, 0, 6, 1),
      theta: num("Angle θ per position (°)", 30, 0, 90, 15),
      bug: flag("Key cached unrotated (bug)"),
      kvHeads: choice("KV heads", ["4 KV heads", "2 KV heads", "1 KV head"], "2 KV heads"),
    },
    kicker: "06 / RELATIVE POSITION",
    subtitle: "R(α) rotates a pair by α",
    grid: [
      [diagram, 0],
      [readout, 1],
      [gqa, 2],
    ],
    compactOrder: [diagram, readout, gqa],
    durationMs: 4400,
    cues: [
      { atMs: 0, text: "One coordinate pair of a query and a key, before position is applied." },
      { atMs: 1000, text: "RoPE rotates the query pair by m·θ for query position m. Its length does not change." },
      { atMs: 2000, text: "The key pair rotates by n·θ for key position n." },
      { atMs: 3000, text: "The dot product of the rotated pair depends only on n − m. Shift both positions to check." },
      { atMs: 3800, text: "Grouped-query attention lets several query heads share one K/V head, shrinking K/V weights and cache." },
    ],
    accessible:
      "Rotary position embedding on one coordinate pair, with q = [2, 1] and k = [1, 3]. R(α) maps (a, b) to (a·cos α − b·sin α, a·sin α + b·cos α) and preserves length, so |R q| stays √5 ≈ 2.236. The query rotates by m·θ and the key by n·θ. Their dot product equals q · R((n − m)·θ) k, so it depends only on the position gap: with the defaults m = 1, n = 3 and θ = 30°, R q ≈ [1.232, 1.866], R k = [−3, 1] and both forms give about −1.83, and shifting both positions by one leaves it unchanged. If the key is cached without its rotation (the bug option), the product depends on m alone and no longer matches the relative form. The grouped-query panel uses width D = 8 split into four query heads of width 2: Q and the output projection have 64 parameters each, K and V have 8 × 2 × (KV heads) each. With two KV heads (q0, q1 share kv0; q2, q3 share kv1) the four projections total 192 parameters instead of 256 with four, and each token's K/V payload per layer is 8 values instead of 16. With one KV head the total is 160.",
  });
})();

// ============================================================ 07 tree reduction with a tail
// sys-e09-01: values 1..n in groups of 8/4/2; pad with the identity or drop the tail.
const treeScene = (() => {
  const n = s("n"),
    G = pick(s("size"), ["8", "4", "2"], [8, 4, 2]),
    drop = eq(s("tail"), "Drop partial group"),
    alt = s("signs");
  // Prefix sum S(a) of v_1..v_a, where v_i = i or (−1)^(i+1)·i.
  const prefix = (a) =>
    iff(alt, iff(eq(mod(a, 2), 1), div(add(a, 1), 2), div(mul(-1, a), 2)), div(mul(a, add(a, 1)), 2));
  const value = (i) => iff(alt, iff(eq(mod(i, 2), 1), i, mul(-1, i)), i);
  const full = floor(div(n, G));
  const groups = iff(drop, full, floor(div(add(n, sub(G, 1)), G)));
  const pad = sub(mul(floor(div(add(n, sub(G, 1)), G)), G), n);
  const partial = (k) => sub(prefix(min(mul(k + 1, G), n)), prefix(min(mul(k, G), n)));
  const used = (k) => lt(k, groups);
  const total = add(...Array.from({ length: 8 }, (_, k) => iff(used(k), partial(k), 0)));
  const reference = prefix(n);
  const lastBase = mul(floor(div(sub(n, 1), G)), G); // index before the last group's first value
  const lastDropped = and(drop, gt(mod(n, G), 0));
  const groupsCard = card("tr-groups", 282, ice, blue, "VALUES AND GROUPS", [
    text("tr-n", cat("n = ", n, ", group size ", G), 16, 62),
    text("tr-values", iff(alt, cat("v_i = ±i, last ", value(n)), cat("v_i = i, last ", n)), 16, 90),
    text(
      "tr-tail",
      after(
        800,
        iff(
          drop,
          cat("dropped values: ", sub(n, mul(full, G))),
          cat("pad ", pad, " zeros → ", groups, " groups"),
        ),
        "tail: …",
      ),
      16,
      118,
    ),
    ...Array.from({ length: 8 }, (_, k) => ({
      ...text(
        `tr-part-${k}`,
        after(4000, cat(`g${k} = `, partial(k)), `g${k} = …`),
        k < 4 ? 16 : 152,
        150 + 28 * (k % 4),
      ),
      opacity: iff(used(k), 1, 0),
    })),
    text("tr-identity", "0 is the + identity", 16, 268, 17, muted),
  ]);
  const level = (l) => {
    const count = 8 >> l;
    return Array.from({ length: count }, (_, sIdx) => {
      const width = div(256, div(G, 2 ** l));
      const x = add(16, mul(sIdx, width));
      // Sum of level-0 slots [sIdx·2^l, (sIdx+1)·2^l) of the last group, zero past n.
      const lo = add(lastBase, sIdx * 2 ** l),
        hi = add(lastBase, (sIdx + 1) * 2 ** l);
      const v = sub(prefix(min(hi, n)), prefix(min(max(lo, 0), n)));
      const present = and(le(2 ** l, G), lt(sIdx, div(G, 2 ** l)), l === 0 ? true : ge(t, 800 + 800 * l));
      const isPad = l === 0 ? ge(lo, n) : false;
      return [
        {
          ...rect(`tr-l${l}-s${sIdx}-box`, add(x, 2), 48 + 44 * l, sub(width, 4), 32, white, 6),
          opacity: iff(present, 1, 0),
        },
        {
          ...rect(`tr-l${l}-s${sIdx}-pad`, add(x, 2), 48 + 44 * l, sub(width, 4), 32, sand, 6),
          opacity: iff(and(present, isPad), 1, 0),
        },
        {
          ...centered(bold(`tr-l${l}-s${sIdx}`, v, add(x, div(width, 2)), 70 + 44 * l, 17)),
          opacity: iff(present, 1, 0),
        },
      ];
    }).flat();
  };
  const tree = card("tr-tree", 282, mint, teal, "TREE IN THE LAST GROUP", [
    ...[0, 1, 2, 3].flatMap(level),
    text("tr-rounds", cat("rounds: ", iff(eq(G, 8), 3, iff(eq(G, 4), 2, 1)), " = log2 ", G), 16, 240),
    text(
      "tr-fate",
      iff(lastDropped, "dropped: never summed", "summed in pass 1"),
      16,
      268,
      17,
      muted,
    ),
  ]);
  const pass = card("tr-pass", 240, lilac, purple, "SECOND PASS", [
    text("tr-used", after(4000, cat("partials used: ", groups), "partials used: …"), 16, 62),
    bold("tr-total", after(4800, cat("total = ", total), "total = …"), 16, 98, 20, purple),
    text("tr-reference", after(4800, cat("sequential = ", reference), "sequential = …"), 16, 128),
    bold(
      "tr-verdict",
      after(4800, iff(eq(total, reference), "matches", "finite, yet wrong"), "…"),
      16,
      164,
      18,
      purple,
    ),
    text("tr-dispatch-1", "2 dispatches: groups,", 16, 198, 17, muted),
    text("tr-dispatch-2", "then the partials", 16, 224, 17, muted),
  ]);
  return build({
    id: "concept-tree-reduction",
    title: "Pad the tail with the identity.",
    description:
      "Sum the values 1 to n in fixed-size groups with a pairwise tree, then combine one partial per group. Change n, the group size and the sign pattern, and compare padding the final group with zeros against dropping it.",
    state: {
      n: num("Number of values n", 10, 1, 16, 1),
      size: choice("Group size", ["8", "4", "2"]),
      tail: choice("Final partial group", ["Pad with 0", "Drop partial group"]),
      signs: flag("Alternate signs"),
    },
    kicker: "07 / BOUNDARY GROUPS COUNT",
    subtitle: "invented width, not a chip's",
    grid: [
      [groupsCard, 0],
      [tree, 1],
      [pass, 2],
    ],
    compactOrder: [groupsCard, tree, pass],
    durationMs: 5400,
    cues: [
      { atMs: 0, text: "Values 1 to n are split into groups of a fixed, invented size. Predict the total first." },
      { atMs: 800, text: "The last group may be incomplete. Fill its empty slots with zero, the identity for addition." },
      { atMs: 1600, text: "Round 1: neighbouring slots add pairwise." },
      { atMs: 2400, text: "Each further round halves the slots: log2 of the group size rounds in all." },
      { atMs: 4000, text: "Each group writes one partial sum." },
      { atMs: 4800, text: "A second dispatch combines the partials. Compare with an independent sequential sum." },
    ],
    accessible:
      "A two-pass tree reduction with an invented group size of 8, 4 or 2 (not a description of any GPU's execution width). The values are 1, 2, …, n, or 1, −2, 3, … when signs alternate. With the lesson's n = 10 and groups of 8, two groups are needed; the second holds 9 and 10 and six padding slots filled with 0, the identity for addition. Each group adds pairwise in log2(8) = 3 rounds, giving partials 36 and 19, and a second pass adds them to 55, matching the sequential sum. Dropping the incomplete final group instead gives 36: every value is finite and the result is repeatable, yet wrong. Whenever n is a multiple of the group size, both tail rules agree, so boundary tests need sizes that are not multiples. The tree panel shows the last group's slots, with padding slots shaded, and each round's sums.",
  });
})();

// ============================================================ 08 transfer and the cycle budget
// eng-e14-03: MiB·2^20·8 / (Mb/s·10^6); serial vs ideal overlap; attempts vs unique work.
const budgetScene = (() => {
  const mib = s("mib"),
    mbps = s("mbps"),
    c = s("compute"),
    mg = s("merge"),
    overlap = eq(s("schedule"), "Ideal overlap"),
    a = s("attempts");
  const bits = mul(mib, 1048576, 8);
  const tx = div(bits, mul(mbps, 1000000));
  const decimal = div(mul(mib, 8), mbps);
  const cycle = iff(overlap, add(max(c, tx), mg), add(c, tx, mg));
  const transfer = card("tb-transfer", 204, ice, blue, "IDEAL TRANSFER", [
    text("tb-link", cat(mib, " MiB at ", mbps, " Mb/s"), 16, 62),
    text("tb-bits", after(800, cat("bits = ", bits), "bits = …"), 16, 92),
    bold("tb-ideal", after(1600, cat("ideal = ", r3(tx), " s"), "ideal = …"), 16, 126, 20, blue),
    text("tb-decimal", after(1600, cat("if MB (10^6): ", r3(decimal), " s"), "if MB (10^6): …"), 16, 156),
    text("tb-excludes", "no overhead or retries", 16, 186, 17, muted),
  ]);
  const U = 7;
  const bar = (id, start, duration, y, fill, at) => ({
    ...rect(id, add(16, mul(U, start)), y, mul(U, duration, progress(at, 500)), 14, fill, 3),
  });
  const schedule = card("tb-schedule", 270, sand, gold, "ONE WORK CYCLE", [
    text("tb-c", cat("compute ", c, " s"), 16, 60),
    bar("tb-cbar", 0, c, 68, teal, 2400),
    text("tb-t", cat("transfer ", r3(tx), " s"), 16, 104),
    bar("tb-tbar", iff(overlap, 0, c), tx, 112, blue, 3000),
    text("tb-m", cat("merge ", mg, " s"), 16, 148),
    bar("tb-mbar", iff(overlap, max(c, tx), add(c, tx)), mg, 156, purple, 3600),
    text("tb-scale", "bars: 7 units per second", 16, 196, 17, muted),
    bold("tb-cycle", after(4200, cat("cycle = ", r3(cycle), " s"), "cycle = …"), 16, 230, 20, gold),
    text(
      "tb-both",
      after(4200, cat("other model: ", r3(iff(overlap, add(c, tx, mg), add(max(c, tx), mg))), " s"), "other model: …"),
      16,
      258,
    ),
  ]);
  const retries = card("tb-retries", 232, lilac, purple, "COUNT UNIQUE WORK", [
    text("tb-contrib", "60 logical contributions", 16, 62),
    text("tb-attempts", cat("attempts each: ", a), 16, 90),
    text("tb-counter", after(4800, cat("attempt counter: ", mul(60, a)), "attempt counter: …"), 16, 118),
    bold("tb-unique", after(4800, "unique work: 60", "unique work: …"), 16, 154, 20, purple),
    text("tb-perhour", after(4800, cat("cycles/hour: ", r3(div(3600, cycle))), "cycles/hour: …"), 16, 186),
    text("tb-accepted", "uploaded ≠ accepted", 16, 216, 17, muted),
  ]);
  return build({
    id: "concept-transfer-budget",
    title: "Bytes, bits and a cycle budget.",
    description:
      "Convert a payload in MiB and a link rate in megabits per second into an ideal transfer time, place it in a work cycle with computation and merge, compare a serial schedule with an idealized overlap, and keep retried attempts apart from unique work.",
    state: {
      mib: num("Payload (MiB)", 100, 10, 100, 10),
      mbps: num("Link rate (Mb/s)", 200, 50, 1000, 50),
      compute: num("Compute (s)", 8, 0, 12, 1),
      merge: num("Merge (s)", 2, 0, 4, 1),
      schedule: choice("Schedule model", ["Serial", "Ideal overlap"]),
      attempts: num("Attempts per contribution", 3, 1, 4, 1),
    },
    kicker: "08 / STATE THE UNITS",
    subtitle: "synthetic figures only",
    grid: [
      [transfer, 0],
      [schedule, 1],
      [retries, 2],
    ],
    compactOrder: [transfer, schedule, retries],
    durationMs: 5200,
    cues: [
      { atMs: 0, text: "A payload in binary mebibytes crosses a link quoted in decimal megabits per second." },
      { atMs: 800, text: "Bytes become bits: MiB × 2^20 × 8." },
      { atMs: 1600, text: "Divide by the link rate in bits per second for the ideal duration. Real overhead only adds to it." },
      { atMs: 2400, text: "Place compute, transfer and merge in one cycle under the chosen schedule model." },
      { atMs: 4200, text: "Serial adds all three; ideal overlap takes the longer of compute and transfer, then merge." },
      { atMs: 4800, text: "Attempts are not unique work. Count logical contributions once." },
    ],
    accessible:
      "A synthetic network and cycle budget. A payload of P MiB is P × 2^20 × 8 bits; over a link of R megabits per second (R × 10^6 bits per second) its ideal duration is P × 2^20 × 8 / (R × 10^6). The lesson's 100 MiB at 200 Mb/s takes 4.194304 seconds, about 4.194, while 100 decimal MB would take 4 seconds. Protocol overhead, congestion and retries can only make it longer. One work cycle has computation, transfer and merge. Serial execution adds them: 8 + 5 + 2 = 15 seconds in the lesson's example. A separately stated model where computation and transfer overlap perfectly and merge cannot overlap gives max(8, 5) + 2 = 10 seconds; that is a model, not evidence that an implementation overlaps. Here the transfer time is computed from the payload and link rate instead of the lesson's round 5 seconds. Sixty logical contributions that each take three attempts show 180 on an attempt counter, yet the unique work is still 60. An upload is not proof of acceptance. All figures are invented for the calculation.",
  });
})();

// ============================================================ 09 shapes, offsets and bytes
// fnd-e02-01: shape (2,3,4) row-major; offset b·12 + t·4 + d; bytes = offset × element size.
const offsetScene = (() => {
  const b = s("b"),
    tt = s("t"),
    d = s("d"),
    o = s("offset");
  const size = iff(eq(s("dtype"), "FP32 (4 bytes)"), 4, 2);
  const off = add(mul(b, 12), mul(tt, 4), d);
  const rb = floor(div(o, 12)),
    rt = floor(div(mod(o, 12), 4)),
    rd = mod(o, 4);
  const mb = floor(div(o, 12)),
    mt = floor(div(mod(o, 12), 3)),
    md = mod(o, 3);
  const boxes = [];
  for (let bi = 0; bi < 2; bi++)
    for (let ti = 0; ti < 3; ti++)
      for (let di = 0; di < 4; di++) {
        const k = bi * 12 + ti * 4 + di,
          x = 16 + 140 * bi + 32 * di,
          y = 72 + 34 * ti;
        boxes.push(
          rect(`to-box-${k}`, x, y, 28, 28, white, 5),
          { ...rect(`to-idx-${k}`, x, y, 28, 28, gold, 5), opacity: after(800, iff(eq(off, k), 0.45, 0), 0) },
          { ...rect(`to-rev-${k}`, x, y, 28, 28, purple, 5), opacity: after(3200, iff(eq(o, k), 0.35, 0), 0) },
          centered(text(`to-n-${k}`, String(k), x + 14, y + 20, 17)),
        );
      }
  const buffer = card("to-buffer", 212, ice, blue, "FLAT BUFFER (2,3,4)", [
    text("to-b0", "b = 0", 16, 60, 17, muted),
    text("to-b1", "b = 1", 156, 60, 17, muted),
    ...boxes,
    text("to-order", "row-major: d fastest", 16, 196, 17, muted),
  ]);
  const sizes = card("to-sizes", 134, mint, teal, "COUNT AND PAYLOAD", [
    text("to-count", "2·3·4 = 24 elements", 16, 62),
    text("to-bytes", cat("payload ", mul(24, size), " bytes"), 16, 90),
    text("to-empty", "(0,4): 0, (): 1 element", 16, 118, 17, muted),
  ]);
  const forward = card("to-forward", 228, sand, gold, "INDEX → OFFSET", [
    text("to-index", cat("(b,t,d) = (", b, ",", tt, ",", d, ")"), 16, 62),
    text("to-strides", "strides (12, 4, 1)", 16, 90, 17, muted),
    text("to-sum", after(1600, cat(b, "·12 + ", tt, "·4 + ", d), "b·12 + t·4 + d"), 16, 118),
    bold("to-offset", after(1600, cat("offset = ", off), "offset = …"), 16, 152, 20, gold),
    text(
      "to-range",
      after(2400, cat("bytes ", mul(off, size), " … ", sub(mul(add(off, 1), size), 1)), "bytes …"),
      16,
      184,
    ),
    text("to-size", cat("element size ", size, " B"), 16, 212, 17, muted),
  ]);
  const reverse = card("to-reverse", 256, lilac, purple, "OFFSET → INDEX", [
    text("to-o", cat("offset o = ", o), 16, 62),
    text("to-rb", after(3200, cat("b = o div 12 = ", rb), "b = …"), 16, 90),
    text("to-rt", after(3200, cat("t = (o mod 12) div 4 = ", rt), "t = …"), 16, 118),
    text("to-rd", after(3200, cat("d = o mod 4 = ", rd), "d = …"), 16, 146),
    bold("to-rev", after(3200, cat("(", rb, ",", rt, ",", rd, ")"), "(…)"), 16, 180, 20, purple),
    text("to-misread", after(4000, cat("as (2,4,3): (", mb, ",", mt, ",", md, ")"), "as (2,4,3): …"), 16, 212),
    text("to-meaning", "same bytes, other meaning", 16, 240, 17, muted),
  ]);
  return build({
    id: "concept-tensor-offsets",
    title: "One flat buffer, many readings.",
    description:
      "Choose an index (b, t, d) in a (2,3,4) tensor and find its element offset and byte range in the flat row-major buffer. Then decode an offset back into an index, and see the same offset read under a different shape.",
    state: {
      b: num("Batch index b", 1, 0, 1, 1),
      t: num("Time index t", 2, 0, 2, 1),
      d: num("Feature index d", 3, 0, 3, 1),
      offset: num("Offset to decode", 17, 0, 23, 1),
      dtype: choice("Element type", ["FP32 (4 bytes)", "2-byte format"]),
    },
    kicker: "09 / SHAPE IS METADATA",
    subtitle: "buffer, shape, element type",
    grid: [
      [buffer, 0],
      [sizes, 0],
      [forward, 1],
      [reverse, 2],
    ],
    compactOrder: [buffer, forward, reverse, sizes],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "A (2,3,4) tensor is 24 values in one flat buffer. Predict where index (b, t, d) lives." },
      { atMs: 800, text: "Row-major order: the last index moves fastest, so each time step is a run of four features." },
      { atMs: 1600, text: "Offset = b·12 + t·4 + d, using the strides (12, 4, 1)." },
      { atMs: 2400, text: "Multiply by the element size for the byte range. Offset and allocation size are different quantities." },
      { atMs: 3200, text: "Reverse it: divide by the strides to decode an offset into (b, t, d)." },
      { atMs: 4000, text: "Read the same offset as shape (2,4,3) and it names a different element. Size checks cannot catch that." },
    ],
    accessible:
      "Tensor indexing with the lesson's shape (2,3,4): two batch entries, three time steps and four features, 24 elements stored in one flat row-major buffer, drawn as two blocks of three rows of four numbered boxes. The element offset of (b, t, d) is b·12 + t·4 + d. The lesson's (1,2,3) has offset 12 + 8 + 3 = 23, the final element, and (0,2,1) has offset 9. With 4-byte FP32 elements the payload is 96 bytes and offset 23 occupies bytes 92 to 95; with a 2-byte format the payload is 48 bytes and the same element occupies bytes 46 and 47. Decoding reverses the arithmetic: offset 17 gives b = 17 div 12 = 1, t = (17 mod 12) div 4 = 1 and d = 17 mod 4 = 1, the lesson's (1,1,1). Read as shape (2,4,3), the same offset names (1,1,2): equal element counts do not make the shapes agree. A scalar of shape () holds one element and a (0,4) tensor holds none.",
  });
})();

// ============================================================ 10 batch mean and one update
// fnd-e03-04: prediction = w·x with examples (1,3) and (2,2); mean loss and gradient; one step.
const batchScene = (() => {
  const w = s("w"),
    eta = s("eta"),
    factor = iff(eq(s("reduction"), "Sum"), 1, 0.5);
  const X = [1, 2],
    Yt = [3, 2];
  const res = (wv, i) => sub(mul(wv, X[i]), Yt[i]);
  const loss = (wv, i) => mul(0.5, res(wv, i), res(wv, i));
  const g = [0, 1].map((i) => mul(res(w, i), X[i]));
  const L = [0, 1].map((i) => loss(w, i));
  const G = mul(factor, add(g[0], g[1])),
    Lagg = mul(factor, add(L[0], L[1]));
  const w1 = sub(w, mul(eta, factor, add(g[0], g[1])));
  const L1 = [0, 1].map((i) => loss(w1, i));
  const Lagg1 = mul(factor, 0.5, add(mul(res(w1, 0), res(w1, 0)), mul(res(w1, 1), res(w1, 1))));
  const examples = card("bm-examples", 218, ice, blue, "TWO EXAMPLES, ŷ = w·x", [
    bold("bm-w", cat("w = ", r3(w)), 16, 64, 20, blue),
    text("bm-ex1", "ex1: x = 1, y = 3", 16, 94, 17, teal),
    text("bm-l1", after(800, cat("L1 = ", r3(L[0]), ", g1 = ", r3(g[0])), "L1 = …"), 16, 122),
    text("bm-ex2", "ex2: x = 2, y = 2", 16, 150, 17, purple),
    text("bm-l2", after(800, cat("L2 = ", r3(L[1]), ", g2 = ", r3(g[1])), "L2 = …"), 16, 178),
    text("bm-res", after(800, cat("r = [", r3(res(w, 0)), ", ", r3(res(w, 1)), "]"), "r = …"), 16, 206),
  ]);
  const reduce = card("bm-reduce", 202, lilac, purple, "REDUCE, THEN STEP", [
    text("bm-rule", cat("reduction: ", s("reduction")), 16, 62, 17, muted),
    text("bm-loss", after(1600, cat("batch loss = ", r3(Lagg)), "batch loss = …"), 16, 92),
    text("bm-grad", after(1600, cat("batch grad = ", r3(G)), "batch grad = …"), 16, 120),
    bold("bm-w1", after(2400, cat("w′ = ", r3(w1)), "w′ = …"), 16, 156, 20, purple),
    text("bm-eta", cat("η = ", r3(eta)), 16, 186, 17, muted),
  ]);
  const bar = (id, value, y, fill, opacity) => ({ ...rect(id, 60, y, mul(48, value), 10, fill, 3), opacity });
  const afterCard = card("bm-after", 280, sand, gold, "AFTER ONE STEP", [
    text("bm-l1b", after(3200, cat("L1′ = ", r6(L1[0])), "L1′ = …"), 16, 62),
    text("bm-l2b", after(3200, cat("L2′ = ", r6(L1[1])), "L2′ = …"), 16, 90),
    bold("bm-agg1", after(3200, cat("batch loss′ = ", r6(Lagg1)), "batch loss′ = …"), 16, 122, 18, gold),
    text("bm-bar-ex1", "ex1", 16, 162, 17, teal),
    bar("bm-bar1-before", L[0], 144, line, 1),
    bar("bm-bar1-after", L1[0], 160, teal, after(3200, 1, 0)),
    text("bm-bar-ex2", "ex2", 16, 202, 17, purple),
    bar("bm-bar2-before", L[1], 184, line, 1),
    bar("bm-bar2-after", L1[1], 200, purple, after(3200, 1, 0)),
    bold(
      "bm-verdict",
      after(
        4000,
        iff(
          lt(Lagg1, sub(Lagg, 1e-12)),
          "batch loss fell",
          iff(gt(Lagg1, add(Lagg, 1e-12)), "batch loss rose", "batch loss unchanged"),
        ),
        "…",
      ),
      16,
      238,
      18,
      gold,
    ),
    text(
      "bm-worse",
      after(
        4000,
        iff(
          gt(L1[1], add(L[1], 1e-12)),
          "yet ex2 got worse",
          iff(gt(L1[0], add(L[0], 1e-12)), "yet ex1 got worse", "no example got worse"),
        ),
        "…",
      ),
      16,
      266,
    ),
  ]);
  return build({
    id: "concept-batch-mean",
    title: "Average the batch. Watch each example.",
    description:
      "Two examples share one weight. Change the weight, the learning rate and the batch reduction, follow the per-example losses and gradients into one update, and compare the batch loss with each example's loss afterwards.",
    state: {
      w: num("Weight w", 1, 0, 2, 0.1),
      eta: num("Learning rate η", 0.1, 0, 0.3, 0.05),
      reduction: choice("Batch reduction", ["Mean", "Sum"]),
    },
    kicker: "10 / AGGREGATES HIDE MEMBERS",
    subtitle: "loss ½r² per example",
    grid: [
      [examples, 0],
      [reduce, 1],
      [afterCard, 2],
    ],
    compactOrder: [examples, reduce, afterCard],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "Two examples, (x = 1, y = 3) and (x = 2, y = 2), share the weight w. Predict the batch gradient's sign." },
      { atMs: 800, text: "Each example has its own residual, half squared loss and gradient r·x." },
      { atMs: 1600, text: "A mean divides the summed losses and gradients by two; a sum does not. Write the reduction down." },
      { atMs: 2400, text: "One update: w′ = w − η·(batch gradient)." },
      { atMs: 3200, text: "Recompute each example's loss at w′. The bars compare before (grey) and after." },
      { atMs: 4000, text: "The batch loss can fall while one example gets worse. Inspect members, not just the average." },
    ],
    accessible:
      "A batch of two examples for prediction = w·x with half squared error: (x = 1, y = 3) and (x = 2, y = 2). At the lesson's w = 1 the predictions are 1 and 2, the residuals −2 and 0, the losses 2 and 0, and the per-example gradients r·x are −2 and 0. With a mean reduction the batch loss is 1 and the batch gradient −1, so one step with η = 0.1 gives w = 1.1. A sum reduction gives batch loss 2 and gradient −2, a different scale, and a step to 1.2. After the lesson's step the losses are 1.805 and 0.02 and their mean is 0.9125: the batch loss fell from 1, yet the second example, which was exactly right, got worse. Bars show each example's loss before (grey) and after the step. Changing w, η or the reduction updates every value; with η = 0 nothing changes.",
  });
})();

// ============================================================ 11 tiny autodiff: slots and fan-out
// fnd-e04-04: u = x·x, z = u + u; reverse mode with +=, both operand slots, reset per call.
const autodiffScene = (() => {
  const x = s("x"),
    k = s("calls"),
    reset = s("reset"),
    acc = eq(s("combine"), "+= accumulate"),
    both = eq(s("slots"), "Both operand slots");
  const u = mul(x, x),
    z = add(u, u);
  const ugrad = iff(acc, iff(reset, 2, mul(2, k)), 1);
  const xgrad = iff(acc, mul(iff(both, 2, 1), x, iff(reset, 2, mul(k, add(k, 1)))), x);
  const opText = iff(acc, "+= ", "= ");
  const h = 0.0001;
  const zAt = (v) => mul(2, v, v);
  const central = div(sub(zAt(add(x, h)), zAt(sub(x, h))), 2 * h);
  const node = (id, label, cx) => [
    { ...circle(`${id}-node`, cx, 120, 22, white), stroke: ink, strokeWidth: 2 },
    centered(bold(`${id}-label`, label, cx, 126, 18, ink)),
  ];
  const graph = card("af-graph", 234, ice, blue, "GRAPH: z = u + u, u = x·x", [
    segment("af-xu-a", 66, 110, 56, 0, teal, 3),
    { ...segment("af-xu-b", 66, 130, 56, 0, teal, 3), opacity: iff(both, 1, 0.25) },
    segment("af-uz-a", 166, 110, 56, 0, purple, 3),
    segment("af-uz-b", 166, 130, 56, 0, purple, 3),
    ...node("af-x", "x", 44),
    ...node("af-u", "u", 144),
    ...node("af-z", "z", 244),
    centered(text("af-xu-a-label", after(2400, cat(opText, r3(mul(x, ugrad))), "…"), 94, 96)),
    centered(
      text("af-xu-b-label", after(2400, iff(both, cat(opText, r3(mul(x, ugrad))), "unused"), "…"), 94, 158),
    ),
    centered(text("af-uz-a-label", after(1600, cat(opText, 1), "…"), 194, 96)),
    centered(text("af-uz-b-label", after(1600, cat(opText, 1), "…"), 194, 158)),
    text("af-slots", "x·x reads x in two slots", 16, 194, 17, muted),
    text("af-uses", "z = u + u uses u twice", 16, 220, 17, muted),
  ]);
  const forward = card("af-forward", 162, mint, teal, "FORWARD", [
    bold("af-x", cat("x = ", x), 16, 64, 20, teal),
    text("af-u", after(800, cat("u = x·x = ", r3(u)), "u = …"), 16, 94),
    text("af-z", after(800, cat("z = u + u = ", r3(z)), "z = …"), 16, 122),
    text("af-saved", "saved: both operands", 16, 150, 17, muted),
  ]);
  const backward = card("af-backward", 262, lilac, purple, "BACKWARD", [
    text("af-calls", cat("calls ", k, iff(reset, ", reset on", ", no reset")), 16, 62, 17, muted),
    text("af-ugrad", after(1600, cat("u.grad = ", ugrad), "u.grad = …"), 16, 90),
    text("af-rule", after(2400, cat("x·x rule gives ", r3(mul(iff(both, 2, 1), x))), "x·x rule gives …"), 16, 118),
    bold("af-xgrad", after(2400, cat("x.grad = ", r3(xgrad)), "x.grad = …"), 16, 152, 20, purple),
    text("af-true", after(3200, cat("dz/dx = 4x = ", r3(mul(4, x))), "dz/dx = …"), 16, 184),
    text("af-central", after(3200, cat("central diff: ", r3(central)), "central diff: …"), 16, 212),
    bold(
      "af-verdict",
      after(4000, iff(lt(abs(sub(xgrad, mul(4, x))), 1e-9), "matches reference", "wrong gradient"), "…"),
      16,
      246,
      18,
      purple,
    ),
  ]);
  return build({
    id: "concept-autodiff-fanout",
    title: "Every slot and every use adds.",
    description:
      "Run the lesson's tiny reverse-mode engine on u = x·x and z = u + u. Break the multiplication rule, replace += with assignment, or skip the reset and call backward() again, and compare x.grad with the true derivative 4x.",
    state: {
      x: num("Input x", 2, -3, 3, 0.5),
      slots: choice("Multiply pullback", ["Both operand slots", "One slot only"]),
      combine: choice("Gradient update", ["+= accumulate", "= overwrite"]),
      calls: num("backward() calls", 1, 1, 3, 1),
      reset: flag("Reset grads in backward", true),
    },
    kicker: "11 / FAN-OUT ACCUMULATES",
    subtitle: "the lesson's scalar engine",
    grid: [
      [graph, 0],
      [forward, 1],
      [backward, 2],
    ],
    compactOrder: [graph, forward, backward],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "u = x·x reads x twice; z = u + u uses u twice. Predict dz/dx before running backward." },
      { atMs: 800, text: "Forward at x = 2 gives u = 4 and z = 8, saving both multiplication operands." },
      { atMs: 1600, text: "Backward starts with z.grad = 1. Each use of u adds 1, so u.grad = 2." },
      { atMs: 2400, text: "Each operand slot of x·x adds the other operand times u.grad: x.grad = 2·x·2 = 4x." },
      { atMs: 3200, text: "Compare with the true derivative 4x and an independent central difference." },
      { atMs: 4000, text: "A one-slot rule or = instead of += breaks shared inputs. Skipping the reset makes a repeated call accumulate." },
    ],
    accessible:
      "The lesson's scalar reverse-mode engine on u = x·x and z = u + u. At x = 2 the forward pass gives u = 4 and z = 8. Backward sets z.grad = 1; the addition passes 1 to each of its two operand slots, both of which are u, so with += u.grad = 2. The multiplication passes x·u.grad to each of its two slots, both of which are x, so x.grad = 2·2·2 = 8, matching the derivative 4x and a central difference. A one-slot multiplication rule returns half: the lesson's x·x derivative 2 instead of 4, so x.grad = 4. Replacing += with assignment keeps only the last contribution: u.grad = 1 and x.grad = x = 2. The reference resets every reachable gradient at the start of backward(), so repeated calls give 8 again; without that reset a second call would make u.grad 4 and x.grad 24, and a third 6 and 48. The graph shows each edge's contribution; a faded edge is a slot the broken rule ignores.",
  });
})();

// ============================================================ 12 residual paths and normalization axes
// ttf-e05-02: d/dx of L plain F layers is F′^L; with y = x + F(x) it is (1 + F′)^L. Normalize [1, 3].
const residualScene = (() => {
  const a = s("slope"),
    Lk = s("layers"),
    a2 = s("a2"),
    perToken = eq(s("axis"), "Per token");
  const plain = op("pow", a, Lk),
    skip = op("pow", add(1, a), Lk);
  const small = (v) => lt(abs(v), 0.0000005);
  const fmt = (v) => iff(small(v), "≈ 0", iff(lt(abs(v), 1000), r6(v), r3(v)));
  const residual = card("rn-residual", 200, ice, blue, "STACK OF L LAYERS", [
    text("rn-setup", cat("F′ = ", r3(a), ", layers ", Lk), 16, 62),
    text("rn-plain", after(800, cat("plain F′^L: ", fmt(plain)), "plain F′^L: …"), 16, 90),
    text("rn-skip", after(1600, cat("skip (1+F′)^L: ", fmt(skip)), "skip (1+F′)^L: …"), 16, 118),
    bold(
      "rn-verdict",
      after(
        2400,
        iff(
          small(skip),
          "skip path cancels",
          iff(gt(abs(skip), abs(plain)), "skip keeps signal", iff(lt(abs(skip), abs(plain)), "plain is larger", "equal size")),
        ),
        "…",
      ),
      16,
      152,
      18,
      blue,
    ),
    text("rn-form", "y = x + F(x) per layer", 16, 184, 17, muted),
  ]);
  const bars = (prefix, base, baseY, fill) =>
    Array.from({ length: 10 }, (_, i) => {
      const l = i + 1;
      const hgt = mul(40, div(op("pow", abs(base), l), max(abs(base), op("pow", abs(base), Lk), 1e-9)));
      return {
        ...rect(`${prefix}-${l}`, 16 + 26 * i, sub(baseY, hgt), 22, hgt, fill, 3),
        opacity: iff(le(l, Lk), after(prefix.endsWith("plain") ? 800 : 1600, 1, 0), 0),
      };
    });
  const barCard = card("rn-bars", 232, mint, teal, "|DERIVATIVE| BY DEPTH", [
    text("rn-bars-plain-label", "plain", 16, 62, 17, purple),
    ...bars("rn-bar-plain", a, 112, purple),
    text("rn-bars-skip-label", "with skip", 16, 140, 17, teal),
    ...bars("rn-bar-skip", add(1, a), 190, teal),
    text("rn-bars-note", "rows scaled to own max", 16, 216, 17, muted),
  ]);
  const COMP = ["alone", "with [5, 9]", "with [0, 0]"];
  const comp = s("batch");
  const cSum = pick(comp, COMP, [0, 14, 0]),
    cSq = pick(comp, COMP, [0, 106, 0]),
    count = pick(comp, COMP, [2, 4, 4]);
  const meanB = div(add(1, a2, cSum), count),
    varB = sub(div(add(1, mul(a2, a2), cSq), count), mul(meanB, meanB));
  const meanT = div(add(1, a2), 2),
    varT = mul(div(sub(1, a2), 2), div(sub(1, a2), 2));
  const mu = iff(perToken, meanT, meanB),
    vr = iff(perToken, varT, varB);
  const nrm = (v, m, vv) => div(sub(v, m), sqrt(add(vv, 0.00001)));
  const n = [nrm(1, mu, vr), nrm(a2, mu, vr)],
    alone = [nrm(1, meanT, varT), nrm(a2, meanT, varT)];
  const close = (p, q) => lt(abs(sub(p, q)), 1e-9);
  const norm = card("rn-norm", 288, sand, gold, "NORMALIZE TOKEN A", [
    text("rn-token", cat("token A = [1, ", a2, "]"), 16, 62),
    text("rn-batch", cat("batch: A ", comp), 16, 90, 17, muted),
    text("rn-stats", after(3200, cat("mean ", r3(mu), ", var ", r3(vr)), "mean …"), 16, 118),
    bold("rn-out", after(3200, cat("A → [", r3(n[0]), ", ", r3(n[1]), "]"), "A → …"), 16, 152, 18, gold),
    text("rn-exact", after(3200, cat("A[1] = ", r6(n[1])), "A[1] = …"), 16, 184),
    text("rn-alone", after(4000, cat("A alone: [", r3(alone[0]), ", ", r3(alone[1]), "]"), "A alone: …"), 16, 212),
    bold(
      "rn-same",
      after(4000, iff(close(n[0], alone[0]), "same as alone", "batch changed A"), "…"),
      16,
      244,
      18,
      gold,
    ),
    text("rn-eps", "ε = 1e-5 avoids ÷ 0", 16, 272, 17, muted),
  ]);
  return build({
    id: "concept-residual-norm",
    title: "A skip path and the right axis.",
    description:
      "Stack layers whose branch has slope F′ and compare the derivative through the plain stack with the derivative through residual layers y = x + F(x). Then normalize a token's features alone and inside a batch, per token or over the whole batch.",
    state: {
      slope: num("Branch slope F′", 0.1, -1, 1, 0.1),
      layers: num("Layers L", 10, 1, 10, 1),
      a2: num("Token A feature 2", 3, -3, 5, 1),
      axis: choice("Normalize over", ["Per token", "Whole batch (bug)"]),
      batch: choice("Batch companion", COMP),
    },
    kicker: "12 / PATHS AND AXES",
    subtitle: "scalar layers, F(x) = F′·x",
    grid: [
      [residual, 0],
      [barCard, 1],
      [norm, 2],
    ],
    compactOrder: [residual, barCard, norm],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "Each layer applies F(x) = F′·x. Predict the derivative through ten layers with F′ = 0.1." },
      { atMs: 800, text: "Through the plain stack the local derivatives multiply: F′^L, 0.1^10 = 1e-10." },
      { atMs: 1600, text: "With y = x + F(x) each local derivative is 1 + F′, so ten layers give 1.1^10 ≈ 2.594." },
      { atMs: 2400, text: "A direct path is not a guarantee: with F′ = −1 the two paths cancel exactly." },
      { atMs: 3200, text: "Normalize token A = [1, 3] over its own features: mean 2, variance 1, about [−1, 1]." },
      { atMs: 4000, text: "Compute the statistics over the whole batch instead, and A's output depends on its neighbours." },
    ],
    accessible:
      "Residual sensitivity and normalization axes with the lesson's numbers. Each scalar layer applies F(x) = F′·x. Through L plain layers the derivative is F′ to the power L; the lesson's F′ = 0.1 and L = 10 give 1e-10, shown as approximately zero. Residual layers y = x + F(x) have local derivative 1 + F′, so ten of them give 1.1^10 ≈ 2.593742. With F′ = −1 the residual derivative is 0: the paths cancel, so a skip path does not guarantee healthy gradients. Bars show the magnitude after each layer, each row scaled to its own maximum. For normalization, token A = [1, 3] has mean 2 and population variance 1; with ε = 1e-5 it becomes [−0.999995, 0.999995], about [−1, 1]. Normalizing per token gives the same result whether A is alone or batched with another token. Normalizing over the whole batch with companion [5, 9] uses mean 4.5 and variance 8.75 and turns A into about [−1.183, −0.507]: the shape is unchanged but the function is wrong, and changing the batch changes A's output.",
  });
})();

// ============================================================ 13 embedding gather and scatter-add
// ttf-e06-01: E rows [1,0],[0,1],[1,1],[−1,0]; ids [2,0,2]; positions; repeated rows accumulate.
const embeddingScene = (() => {
  const ids = [s("id0"), s("id1"), s("id2")],
    pos = s("positions"),
    acc = eq(s("scatter"), "Accumulate (+=)");
  const E = [
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 0],
  ];
  const P = [
    [0, 0],
    [0.1, -0.1],
    [0.2, -0.2],
  ];
  const G = [
    [1, 2],
    [2, -1],
    [-0.5, 3],
  ];
  const rowOf = (id, c) => iff(eq(id, 0), E[0][c], iff(eq(id, 1), E[1][c], iff(eq(id, 2), E[2][c], E[3][c])));
  const xv = [0, 1, 2].map((i) => [0, 1].map((c) => add(rowOf(ids[i], c), iff(pos, P[i][c], 0))));
  const used = (r) => or(...ids.map((id) => eq(id, r)));
  const gradOf = (r, c) =>
    iff(
      acc,
      add(...[0, 1, 2].map((i) => iff(eq(ids[i], r), G[i][c], 0))),
      iff(eq(ids[2], r), G[2][c], iff(eq(ids[1], r), G[1][c], iff(eq(ids[0], r), G[0][c], 0))),
    );
  const table = card("es-table", 202, ice, blue, "EMBEDDING TABLE (4×2)", [
    ...[0, 1, 2, 3].flatMap((r) => [
      { ...rect(`es-hl-${r}`, 8, 44 + 30 * r, 272, 26, blue, 6), opacity: after(800, iff(used(r), 0.18, 0), 0) },
      text(
        `es-row-${r}`,
        cat(
          `${r}: [${E[r].join(", ")}]`,
          after(
            800,
            iff(
              used(r),
              cat(" ← pos", iff(eq(ids[0], r), " 0", ""), iff(eq(ids[1], r), " 1", ""), iff(eq(ids[2], r), " 2", "")),
              "",
            ),
            "",
          ),
        ),
        16,
        62 + 30 * r,
      ),
    ]),
    text("es-params", "V·D = 4·2 = 8 params", 16, 186, 17, muted),
  ]);
  const gather = card("es-gather", 224, mint, teal, "GATHER, THEN ADD POSITION", [
    text("es-ids", cat("ids = [", ids[0], ", ", ids[1], ", ", ids[2], "]"), 16, 62),
    ...[0, 1, 2].map((i) =>
      text(
        `es-x-${i}`,
        after(1600, cat(`x${i} = [`, r3(xv[i][0]), ", ", r3(xv[i][1]), "]"), `x${i} = …`),
        16,
        92 + 28 * i,
      ),
    ),
    text("es-formula", iff(pos, "x = E[id] + p", "x = E[id], no position"), 16, 180, 17, muted),
    text(
      "es-compare",
      after(2400, cat("x0 vs x2: ", iff(and(eq(xv[0][0], xv[2][0]), eq(xv[0][1], xv[2][1])), "equal", "differ")), "x0 vs x2: …"),
      16,
      208,
    ),
  ]);
  const backward = card("es-backward", 284, lilac, purple, "BACKWARD INTO THE TABLE", [
    text("es-g02", "∂x0 [1, 2], ∂x2 [-0.5, 3]", 16, 62, 17, muted),
    text("es-g1", "∂x1 [2, -1], invented", 16, 90, 17, muted),
    ...[0, 1, 2, 3].map((r) =>
      text(
        `es-grad-${r}`,
        after(3200, cat(`∂E${r} = [`, r3(gradOf(r, 0)), ", ", r3(gradOf(r, 1)), "]"), `∂E${r} = …`),
        16,
        124 + 28 * r,
      ),
    ),
    bold(
      "es-touched",
      after(4000, cat("rows touched: ", add(...[0, 1, 2, 3].map((r) => iff(used(r), 1, 0)))), "rows touched: …"),
      16,
      240,
      18,
      purple,
    ),
    text("es-rule", iff(acc, "repeats add up", "last write wins (bug)"), 16, 268, 17, muted),
  ]);
  return build({
    id: "concept-embedding-scatter",
    title: "Look up a row. Add back into it.",
    description:
      "Choose the token IDs at three positions, gather their rows from the lesson's four-row embedding table, and add position vectors. Then send gradients back: a row looked up twice must receive both contributions.",
    state: {
      id0: num("ID at position 0", 2, 0, 3, 1),
      id1: num("ID at position 1", 0, 0, 3, 1),
      id2: num("ID at position 2", 2, 0, 3, 1),
      positions: flag("Add position vectors", true),
      scatter: choice("Backward into the table", ["Accumulate (+=)", "Overwrite (bug)"]),
    },
    kicker: "13 / ONE ROW, MANY USES",
    subtitle: "an ID picks a row",
    grid: [
      [table, 0],
      [gather, 1],
      [backward, 2],
    ],
    compactOrder: [table, gather, backward],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "The table has V = 4 rows of width D = 2: eight parameters however long the batch is." },
      { atMs: 800, text: "Each ID selects a row. A repeated ID selects the same row, not a copy." },
      { atMs: 1600, text: "Gather the rows and add each position's vector, so repeats can differ by position." },
      { atMs: 2400, text: "Compare positions 0 and 2: same ID, different input once positions are added." },
      { atMs: 3200, text: "Backward scatters each position's gradient into its row. Repeats must add." },
      { atMs: 4000, text: "Rows not looked up get no contribution from this lookup. That is not a promise they never change." },
    ],
    accessible:
      "An embedding lookup with the lesson's table: row 0 = [1, 0], row 1 = [0, 1], row 2 = [1, 1], row 3 = [−1, 0], eight parameters. The lesson's IDs [2, 0, 2] gather [1, 1], [1, 0] and [1, 1]; both occurrences of ID 2 read the same parameter row. Adding the position vectors [0, 0], [0.1, −0.1] and [0.2, −0.2] gives [1, 1], [1.1, −0.1] and [1.2, 0.8], so the repeated token differs by position. In backward, the two occurrences of ID 2 receive the lesson's gradients [1, 2] and [−0.5, 3]; scatter-add accumulates them into row 2 as [0.5, 5]. Position 1's gradient [2, −1] is invented for the illustration and goes to row 0. Rows 1 and 3 receive nothing from this lookup, which does not mean weight decay, tied weights or optimizer state cannot change them. The overwrite option keeps only the last contribution, [−0.5, 3], which is wrong whenever an ID repeats. IDs are categories: changing an ID changes which row is read, not a quantity.",
  });
})();

// ============================================================ 14 LoRA: a low-rank update
// ttf-e08-04: ΔW = s·B·A with B (3×1) = [2,−1,0.5], A (1×4) = [1,0,−1,2]; x = [1,2,3,4].
const loraScene = (() => {
  const sc = s("scale"),
    x3 = s("x3"),
    r = s("rank"),
    init = s("init");
  const INITS = ["Lesson A and B", "B starts at zero", "Both start at zero"];
  const aOn = not(eq(init, INITS[2])),
    bOn = eq(init, INITS[0]);
  const A = [1, 0, -1, 2].map((v) => iff(aOn, v, 0)),
    B = [2, -1, 0.5].map((v) => iff(bOn, v, 0));
  const xs = [1, 2, 3, x3];
  const inner = add(...A.map((av, j) => mul(av, xs[j])));
  const dy = B.map((bv) => mul(sc, bv, inner));
  const dW = B.map((bv) => A.map((av) => mul(sc, bv, av)));
  const dense = dW.map((row) => add(...row.map((v, j) => mul(v, xs[j]))));
  const gy = [1, 0, -1];
  const btg = add(...B.map((bv, i) => mul(bv, gy[i])));
  const dB = gy.map((gv) => mul(sc, gv, inner)),
    dA = xs.map((xv) => mul(sc, btg, xv));
  const vec = (vals) => cat("[", ...vals.flatMap((v, i) => (i ? [", ", r3(v)] : [r3(v)])), "]");
  const zero = (vals) => and(...vals.map((v) => lt(abs(v), 1e-12)));
  const cellText = (id, value, cx, cy, opacity) => ({ ...centered(text(id, value, cx, cy, 17)), opacity });
  const grid = card("lo-grid", 226, ice, blue, "ΔW = s·B·A (3×4)", [
    text("lo-a-label", "A →", 16, 64, 17, muted),
    ...A.flatMap((av, j) => [
      rect(`lo-a-${j}`, 72 + 50 * j, 44, 46, 28, white, 5),
      cellText(`lo-a-${j}-v`, av, 95 + 50 * j, 64, 1),
    ]),
    ...B.flatMap((bv, i) => [
      rect(`lo-b-${i}`, 16, 84 + 34 * i, 46, 28, white, 5),
      cellText(`lo-b-${i}-v`, bv, 39, 104 + 34 * i, 1),
    ]),
    ...dW.flatMap((row, i) =>
      row.flatMap((v, j) => [
        rect(`lo-w-${i}-${j}`, 72 + 50 * j, 84 + 34 * i, 46, 28, white, 5),
        {
          ...rect(`lo-w-${i}-${j}-hl`, 72 + 50 * j, 84 + 34 * i, 46, 28, gold, 5),
          opacity: after(800, iff(gt(abs(v), 0), 0.3, 0), 0),
        },
        cellText(`lo-w-${i}-${j}-v`, r3(v), 95 + 50 * j, 104 + 34 * i, after(800, 1, 0)),
      ]),
    ),
    text("lo-scale", cat("s = ", sc, "; B is a column"), 16, 210, 17, muted),
  ]);
  const apply = card("lo-apply", 232, lilac, purple, "APPLY TO x", [
    text("lo-x", cat("x = [1, 2, 3, ", x3, "]"), 16, 62),
    text("lo-inner", after(1600, cat("A·x = ", r3(inner)), "A·x = …"), 16, 90),
    bold("lo-dy", after(2400, cat("Δy = ", vec(dy)), "Δy = …"), 16, 124, 20, purple),
    text("lo-dense", after(3200, cat("ΔW·x = ", vec(dense)), "ΔW·x = …"), 16, 156),
    bold(
      "lo-check",
      after(3200, iff(zero(dy.map((v, i) => sub(v, dense[i]))), "factored = dense", "mismatch"), "…"),
      16,
      188,
      18,
      purple,
    ),
    text("lo-base", "base W·x is added too", 16, 216, 17, muted),
  ]);
  const learn = card("lo-learn", 258, sand, gold, "PARAMETERS AND INIT", [
    text("lo-count", cat("rank ", r, ": ", mul(7, r), " trainable"), 16, 62),
    text(
      "lo-dense-count",
      cat("dense W has 12: ", iff(lt(mul(7, r), 12), "saves ", "costs "), abs(sub(12, mul(7, r)))),
      16,
      90,
    ),
    text("lo-gy", "∂y = [1, 0, -1], invented", 16, 118, 17, muted),
    text("lo-init", cat("init: ", init), 16, 146),
    text("lo-db", after(4000, cat("∂B = ", vec(dB)), "∂B = …"), 16, 180),
    text("lo-da", after(4000, cat("∂A = ", vec(dA)), "∂A = …"), 16, 208),
    bold(
      "lo-verdict",
      after(
        4000,
        // The scale is checked first, so s = 0 is never read as an initialization failure.
        iff(
          eq(sc, 0),
          "s = 0 scales it all out",
          iff(
            eq(init, INITS[2]),
            "no factor can learn",
            iff(
              and(zero(dA), zero(dB)),
              "A·x = 0: no signal here",
              iff(zero(dA), "Δy is 0, B still learns", iff(zero(dB), "only A gets a signal", "both factors learn")),
            ),
          ),
        ),
        "…",
      ),
      16,
      242,
      18,
      gold,
    ),
  ]);
  return build({
    id: "concept-lora-update",
    title: "A thin update, added beside W.",
    description:
      "Build the lesson's rank-one update ΔW = s·B·A, apply it to x through the factors and through the dense matrix, and compare trainable counts by rank. Then start one or both factors at zero and see which factor can receive a gradient.",
    state: {
      scale: num("Scale s", 1, 0, 2, 1),
      x3: num("Input x[3]", 4, -2, 4, 1),
      rank: num("Rank r (counts only)", 1, 1, 3, 1),
      init: choice("Factor values", INITS),
    },
    kicker: "14 / LOW RANK, SAME BASE",
    subtitle: "out 3, in 4, rank 1",
    grid: [
      [grid, 0],
      [apply, 1],
      [learn, 2],
    ],
    compactOrder: [grid, apply, learn],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "The base W (3×4) stays fixed. LoRA learns B (3×r) and A (r×4); here r = 1." },
      { atMs: 800, text: "ΔW = s·B·A is an outer product: every row is a multiple of A." },
      { atMs: 1600, text: "Apply the factors in order: first A·x, a single number for rank one." },
      { atMs: 2400, text: "Then Δy = s·B·(A·x), the lesson's [12, −6, 3]. The base output W·x is added separately." },
      { atMs: 3200, text: "Multiplying by the dense ΔW gives the same vector, at the cost of materializing 12 values." },
      { atMs: 4000, text: "Each factor's gradient depends on the other. B = 0 with A nonzero: Δy starts at 0 but B learns. Both zero: stuck. s = 0: scaled away." },
    ],
    accessible:
      "Low-rank adaptation with the lesson's numbers. The base matrix W is 3×4 (12 parameters) and stays fixed; LoRA learns B, a 3×1 column [2, −1, 0.5], and A, a 1×4 row [1, 0, −1, 2], seven trainable values at rank 1. In general a rank-r adapter has 7r, so rank 2 needs 14, more than the dense 12. ΔW = s·B·A is drawn as a 3×4 grid of products. For x = [1, 2, 3, 4] and s = 1, A·x = 6 and Δy = s·B·(A·x) = [12, −6, 3], the same as multiplying x by the dense ΔW; the base output W·x is still added. With an invented upstream gradient [1, 0, −1], the factor gradients are ∂B = s·∂y·(A·x) = [6, 0, −6] and ∂A = s·(Bᵀ∂y)·x = [1.5, 3, 4.5, 6]. If B starts at zero while A is nonzero, the lesson's common design, the update starts at exactly zero but ∂B is not zero, so B learns at once and A follows once B has changed. If both start at zero, both gradients are zero and neither factor can move: that is an initialization trap. A scale of s = 0 is a different cause. It multiplies the update and both factor gradients by zero, so nothing the factors learn can reach the output, whatever their initialization; the verdict names the scale in that case. For an input with A·x = 0 this one example carries no gradient to B, which says nothing about the initialization. The rank control changes only the parameter counts; the drawn factors stay rank one.",
  });
})();

// ============================================================ 15 data, tensor and pipeline messages
// sys-e10-01: [1,2]·W with rows [1,3],[2,4]; column split concatenates, feature split sums;
// stage A h = w·x, stage B pred = v·h, target 4; the return message is dL/dh.
const parallelScene = (() => {
  const x1 = s("x1"),
    x2 = s("x2"),
    cols = eq(s("split"), "Output columns"),
    concat = eq(s("combine"), "Concatenate"),
    n2 = s("n2"),
    w = s("w"),
    v = s("v"),
    sendGrad = eq(s("message"), "dL/dh (correct)");
  const y0 = add(x1, mul(2, x2)),
    y1 = add(mul(3, x1), mul(4, x2));
  const p0 = [x1, mul(3, x1)],
    p1 = [mul(2, x2), mul(4, x2)];
  const got = iff(
    cols,
    iff(concat, cat("[", y0, ", ", y1, "]"), cat("[", add(y0, y1), "]")),
    iff(
      concat,
      cat("[", p0[0], ", ", p0[1], ", ", p1[0], ", ", p1[1], "]"),
      cat("[", add(p0[0], p1[0]), ", ", add(p0[1], p1[1]), "]"),
    ),
  );
  const matches = or(and(cols, concat), and(not(cols), not(concat)));
  const workers = card("ps-workers", 218, ice, blue, "TENSOR SPLIT, 2 WORKERS", [
    text("ps-x", cat("x = [", x1, ", ", x2, "]"), 16, 62),
    text("ps-W", "W rows [1, 3], [2, 4]", 16, 90, 17, muted),
    text("ps-split", cat("split: ", s("split")), 16, 118),
    text(
      "ps-w0",
      after(800, iff(cols, cat("w0: x·col0 = ", y0), cat("w0: ", x1, "·[1, 3] = [", p0[0], ", ", p0[1], "]")), "w0: …"),
      16,
      146,
    ),
    text(
      "ps-w1",
      after(800, iff(cols, cat("w1: x·col1 = ", y1), cat("w1: ", x2, "·[2, 4] = [", p1[0], ", ", p1[1], "]")), "w1: …"),
      16,
      174,
    ),
    text("ps-owns", iff(cols, "each owns output columns", "each owns input features"), 16, 202, 17, muted),
  ]);
  const combine = card("ps-combine", 178, mint, teal, "COMBINE THE PARTIALS", [
    text("ps-combine-rule", cat("combine: ", s("combine")), 16, 62),
    bold("ps-got", after(1600, cat("got ", got), "got …"), 16, 96, 20, teal),
    text("ps-want", cat("want [", y0, ", ", y1, "]"), 16, 128),
    bold("ps-verdict", after(2400, iff(matches, "contract matches", "wrong combine"), "…"), 16, 162, 18, teal),
  ]);
  const weighted = div(add(2, mul(6, n2)), add(1, n2));
  const data = card("ps-data", 162, lilac, purple, "DATA REPLICAS", [
    text("ps-r1", "r1: 1 example, grad 2", 16, 62),
    text("ps-r2", cat("r2: ", n2, " examples, mean 6"), 16, 90),
    text("ps-weighted", after(3200, cat("weighted = ", r3(weighted)), "weighted = …"), 16, 118),
    text("ps-equal", after(3200, "mean of means = 4", "mean of means = …"), 16, 146),
  ]);
  const h = w,
    pred = mul(v, w),
    rp = sub(pred, 4),
    lossP = mul(0.5, rp, rp),
    dv = mul(rp, h),
    dh = mul(rp, v);
  const msg = iff(sendGrad, dh, dv);
  const pipe = card("ps-pipe", 350, sand, gold, "PIPELINE MESSAGE", [
    rect("ps-stage-a", 16, 46, 112, 34, white, 8),
    centered(text("ps-stage-a-label", "A: h = w·x", 72, 69)),
    rect("ps-stage-b", 160, 46, 112, 34, white, 8),
    centered(text("ps-stage-b-label", "B: v·h", 216, 69)),
    segment("ps-forward-arrow", 128, 56, 32, 0, teal, 3),
    { ...segment("ps-back-arrow", 128, 72, 32, 0, purple, 3), opacity: after(5600, 1, 0) },
    text("ps-params", cat("x = 1, w = ", r3(w), ", v = ", r3(v)), 16, 110),
    text("ps-forward", after(4000, cat("h = ", r3(h), ", pred = ", r3(pred)), "h = …"), 16, 138),
    text("ps-loss", after(4000, cat("loss = ", r3(lossP), " (target 4)"), "loss = …"), 16, 166),
    text("ps-dpred", after(4800, cat("dL/dpred = ", r3(rp)), "dL/dpred = …"), 16, 194),
    text("ps-dv", after(4800, cat("B: dv = ", r3(dv)), "B: dv = …"), 16, 222),
    bold("ps-msg", after(5600, cat("sent: ", r3(msg)), "sent: …"), 16, 256, 20, gold),
    text("ps-dw", after(5600, cat("A: dw = ", r3(msg)), "A: dw = …"), 16, 284),
    bold(
      "ps-dw-verdict",
      after(5600, iff(lt(abs(sub(msg, dh)), 1e-9), "dw is right", "dw is wrong"), "…"),
      16,
      312,
      18,
      gold,
    ),
    text("ps-message", cat("message: ", iff(sendGrad, "dL/dh", "dv (bug)")), 16, 338, 17, muted),
  ]);
  return build({
    id: "concept-parallel-split",
    title: "Same math, different messages.",
    description:
      "Split the lesson's matrix product across two workers by output columns or by input features and choose how to combine their partial results. Weight two data replicas by example count. Then follow a two-stage pipeline and choose what stage B sends back.",
    state: {
      x1: num("Input x[0]", 1, -2, 3, 1),
      x2: num("Input x[1]", 2, -2, 3, 1),
      split: choice("Tensor split", ["Output columns", "Input features"]),
      combine: choice("Combine partials by", ["Concatenate", "Sum"]),
      n2: num("Examples on replica 2", 3, 1, 4, 1),
      w: num("Stage A weight w", 2, 0, 3, 0.5),
      v: num("Stage B weight v", 3, 0, 4, 0.5),
      message: choice("Message back to A", ["dL/dh (correct)", "B's weight gradient"]),
    },
    kicker: "15 / NAME EACH MESSAGE",
    subtitle: "row vector x times W",
    grid: [
      [workers, 0],
      [combine, 1],
      [data, 1],
      [pipe, 2],
    ],
    compactOrder: [workers, combine, data, pipe],
    durationMs: 6000,
    cues: [
      { atMs: 0, text: "x = [1, 2] times W with rows [1, 3] and [2, 4] is [5, 11]. Two workers share the work." },
      { atMs: 800, text: "Split output columns and each worker owns a whole output; split input features and each owns a partial vector." },
      { atMs: 1600, text: "Column results are concatenated; feature partials must be summed. The operations are not interchangeable." },
      { atMs: 3200, text: "Data replicas: weight each replica's mean gradient by its example count, (1·2 + 3·6)/4 = 5, not 4." },
      { atMs: 4000, text: "Pipeline: stage A computes h = w·x and sends it to stage B, which predicts v·h against target 4." },
      { atMs: 4800, text: "Stage B gets dL/dpred and its own weight gradient." },
      { atMs: 5600, text: "Stage A needs dL/dh = dL/dpred · v, not B's weight gradient. Check A's resulting dw." },
    ],
    accessible:
      "Three partitions of the same computation with the lesson's numbers. Tensor parallelism: the row input [1, 2] times the matrix with rows [1, 3] and [2, 4] is [5, 11]. Splitting output columns lets one worker compute 5 and the other 11, and concatenation gives [5, 11]. Splitting input features gives partial vectors 1·[1, 3] = [1, 3] and 2·[2, 4] = [4, 8], which must be summed to [5, 11]. Summing column results gives [16] and concatenating feature partials gives [1, 3, 4, 8]: both are wrong contracts. Data parallelism: one replica has one example with gradient 2 and another three examples with mean gradient 6, so the full mean is (1·2 + 3·6)/4 = 5, while an equal mean of the two means is 4. Pipeline parallelism: with x = 1, w = 2, v = 3 and target 4, stage A sends h = 2, stage B predicts 6 with half squared loss 2 and output sensitivity 2, so B's weight gradient is 2·2 = 4, while the message to A must be dL/dh = 2·3 = 6, giving A's weight gradient 6. Sending B's weight gradient instead gives A the wrong gradient 4 whenever h differs from v; when they happen to be equal the number coincides but the message still has the wrong meaning.",
  });
})();

// ============================================================ 16 streaming log-sum-exp over vocabulary tiles
// eng-e13-01: logits [1000, 999, 998, 997] in two tiles; running max m and scaled sum s.
const lseScene = (() => {
  const N = s("N"),
    V = s("V"),
    tile = s("tile"),
    z3 = s("z3"),
    target = s("target"),
    checks = s("checks");
  const E = Math.E,
    exp = (v) => op("pow", E, v);
  const Z = ["z0", "z1", "z2", "z3"];
  const zt = pick(target, Z, [1000, 999, 998, z3]);
  const tile1 = or(eq(target, "z0"), eq(target, "z1"));
  const m2 = max(998, z3),
    M = max(1000, z3);
  const s1 = add(1, exp(-1)),
    s2 = add(exp(sub(998, m2)), exp(sub(z3, m2)));
  const sOk = add(exp(sub(1000, M)), exp(sub(999, M)), exp(sub(998, M)), exp(sub(z3, M)));
  const sBad = add(1, exp(-1), exp(sub(998, m2)), exp(sub(z3, m2)));
  const sTile = iff(tile1, add(1, exp(-1)), s2),
    mTile = iff(tile1, 1000, m2);
  // ln via 2·atanh((s − 1)/(s + 1)); here 1 ≤ s ≤ 4, so the 16-term series is exact to ~1e-9.
  const ln = (sv) => {
    const u = div(sub(sv, 1), add(sv, 1));
    return add(...Array.from({ length: 16 }, (_, i) => mul(2 / (2 * i + 1), op("pow", u, 2 * i + 1))));
  };
  const lossOk = add(M, ln(sOk), mul(-1, zt)),
    lossBad = add(M, ln(sBad), mul(-1, zt)),
    lossTile = add(mTile, ln(sTile), mul(-1, zt));
  const p = div(exp(sub(zt, M)), sOk);
  const MiB = 1048576;
  const full = div(mul(4, N, V), MiB);
  const tiled = pick(tile, ["No tiling", "256 token rows", "256 vocab columns"], [
    full,
    div(mul(4, 256, V), MiB),
    div(mul(4, N, 256), MiB),
  ]);
  const memory = card("sl-memory", 190, ice, blue, "FP32 LOGITS MEMORY", [
    text("sl-nv", cat("N = ", N, ", V = ", V), 16, 62),
    text("sl-full", after(800, cat("full: ", r3(full), " MiB"), "full: …"), 16, 90),
    bold("sl-tile", after(800, cat("tile: ", r3(tiled), " MiB"), "tile: …"), 16, 120, 18, blue),
    text(
      "sl-needs",
      after(
        800,
        pick(tile, ["No tiling", "256 token rows", "256 vocab columns"], [
          "one big array",
          "rows are independent",
          "needs global softmax",
        ]),
        "…",
      ),
      16,
      148,
      17,
      muted,
    ),
    text("sl-other", "weights, grads not shrunk", 16, 174, 17, muted),
  ]);
  const ledger = card("sl-ledger", 162, mint, teal, "FINITE-CHECK LEDGER", [
    text("sl-checks", cat(checks, " flag reads × 15 µs"), 16, 62),
    bold("sl-ms", cat("= ", r3(mul(checks, 0.015)), " ms"), 16, 94, 20, teal),
    text("sl-four", "4 reads: 0.06 ms", 16, 122, 17, muted),
    text("sl-model", "modelled, not measured", 16, 148, 17, muted),
  ]);
  const cellX = [16, 80, 156, 220];
  const stream = card("sl-stream", 234, lilac, purple, "STREAM TWO VOCAB TILES", [
    { ...rect("sl-tile1-bg", 12, 44, 130, 40, line, 8), opacity: 0.6 },
    { ...rect("sl-tile2-bg", 152, 44, 130, 40, line, 8), opacity: 0.6 },
    ...cellX.flatMap((x, i) => [
      rect(`sl-cell-${i}`, x, 50, 58, 28, white, 5),
      { ...rect(`sl-target-${i}`, x, 50, 58, 28, gold, 5), opacity: iff(eq(target, Z[i]), 0.45, 0) },
      centered(bold(`sl-z-${i}`, i < 3 ? String(1000 - i) : z3, x + 29, 70, 17)),
    ]),
    centered(text("sl-tile1-label", "tile 1", 77, 106, 17, muted)),
    centered(text("sl-tile2-label", "tile 2", 217, 106, 17, muted)),
    text("sl-t1", after(1200, "t1: m 1000", "t1: …"), 16, 134),
    text("sl-t1-s", after(1200, cat("s ", r3(s1)), "s …"), 160, 134),
    text("sl-t2", after(2000, cat("t2: m ", m2), "t2: …"), 16, 162),
    text("sl-t2-s", after(2000, cat("s ", r3(s2)), "s …"), 160, 162),
    text(
      "sl-rescale",
      after(2800, cat("×e^(m−M): ", r3(exp(sub(1000, M))), ", ", r3(exp(sub(m2, M)))), "×e^(m−M): …"),
      16,
      190,
    ),
    bold("sl-run-m", after(2800, cat("M = ", M, ","), "M = …"), 16, 218, 18, purple),
    bold("sl-run-s", after(2800, cat("s = ", r3(sOk)), "s = …"), 150, 218, 18, purple),
    ...cellX.map((x, i) =>
      handle(`sl-pick-${i}`, x, 50, 58, 28, `Make z${i} the target`, { activate: { state: "target", value: Z[i] } }),
    ),
  ]);
  const rules = card("sl-rules", 228, sand, gold, "COMBINE RULES, LOSS", [
    bold("sl-ok", after(3600, cat("rescaled: ", r3(lossOk)), "rescaled: …"), 16, 64, 18, gold),
    text("sl-bad", after(3600, cat("no rescale: ", r3(lossBad)), "no rescale: …"), 16, 94),
    text("sl-tileonly", after(3600, cat("tile only: ", r3(lossTile)), "tile only: …"), 16, 122),
    text("sl-p", after(4400, cat("p(target) = ", r3(p)), "p(target) = …"), 16, 156),
    text("sl-dz", after(4400, cat("∂z_t = p − 1 = ", r3(sub(p, 1))), "∂z_t = …"), 16, 184),
    text(
      "sl-verdict",
      after(3600, iff(lt(abs(sub(sBad, sOk)), 1e-12), "no rescale needed here", "only rescaling is right"), "…"),
      16,
      212,
      17,
      muted,
    ),
  ]);
  return build({
    id: "concept-streaming-lse",
    title: "Tile the logits. Keep one denominator.",
    description:
      "Size the fp32 logits array and a tile along token rows or vocabulary columns. Then stream the lesson's four logits in two vocabulary tiles with a running maximum and rescaled sum, and compare the cross-entropy with two broken combine rules.",
    state: {
      N: num("Token rows N", 1024, 256, 2048, 256),
      V: num("Vocabulary V", 8192, 1024, 16384, 1024),
      tile: choice("Tile along", ["No tiling", "256 token rows", "256 vocab columns"], "256 token rows"),
      z3: num("Logit z3", 997, 995, 1003, 1),
      target: choice("Target logit", Z, "z2"),
      checks: num("Finite-flag reads", 64, 1, 64, 1),
    },
    kicker: "16 / ONE GLOBAL NORMALIZER",
    subtitle: "synthetic sizes and costs",
    grid: [
      [memory, 0],
      [ledger, 0],
      [stream, 1],
      [rules, 2],
    ],
    compactOrder: [memory, stream, rules, ledger],
    durationMs: 5200,
    cues: [
      { atMs: 0, text: "A materialized fp32 logits array takes 4·N·V bytes: 32 MiB at N = 1024, V = 8192." },
      { atMs: 800, text: "256-row tiles need 8 MiB and stay independent; 256-column tiles need 1 MiB but share one softmax denominator." },
      { atMs: 1200, text: "Stream the vocabulary: tile 1 has max 1000 and scaled sum 1 + e^−1." },
      { atMs: 2000, text: "Tile 2 has its own max and scaled sum." },
      { atMs: 2800, text: "Combine: M = max(m, mt), s = s·e^(m−M) + st·e^(mt−M)." },
      { atMs: 3600, text: "Loss = M + ln s − z_target: 2.440 for the lesson's logits. Skipping the rescale or the other tile changes the objective." },
      { atMs: 4400, text: "The gradient of the target logit is its globally normalized probability minus one." },
    ],
    accessible:
      "Head and loss tiling with the lesson's numbers. A materialized fp32 logits array for N token rows and V vocabulary entries takes 4·N·V bytes: 32 MiB at N = 1024 and V = 8192. Tiles of 256 token rows take 8 MiB and each row's softmax stays inside its tile; tiles of 256 vocabulary columns take 1 MiB but every row's normalization spans all tiles. Weights, gradients and optimizer state are not shrunk by tiling the logits. The streaming loss uses the lesson's logits [1000, 999, 998, 997] in two tiles. Tile 1 has maximum 1000 and scaled sum 1 + e^−1 ≈ 1.368; tile 2 has maximum 998 and, relative to it, scaled sum 1.368. Combining with M = max(m, mt) and s = s·e^(m−M) + st·e^(mt−M) gives M = 1000 and s ≈ 1.553, and the loss for target z2 is M + ln s − 998 ≈ 2.440, the lesson's 2.4401897. Adding the tile sums without rescaling gives about 3.006, and a softmax inside the target's tile only gives about 0.313: neither is the original objective. The target's probability is about 0.087 and its logit gradient p − 1 about −0.913. The z3 control and target choice change the logits; the scene computes ln with a convergent series. The finite-check ledger is synthetic: 64 synchronizing flag reads at 15 µs cost 0.96 ms, four would cost 0.06 ms.",
  });
})();

// ============================================================ 17 text → IDs → a greedy next token
// fnd-e01-03: vocab a→0, b→1, space→2 (drawn ␣); an invented next-token table indexed by
// the last ID; greedy choice, append, decode; next-token targets are the shifted sequence.
const tokenScene = (() => {
  const PROMPTS = ["ab␣a", "b␣a", "ab␣", "ba␣b"];
  const prompt = s("prompt"),
    steps = s("steps"),
    swapped = eq(s("tokenizer"), "a, b IDs swapped"),
    copy = eq(s("targets"), "Current token (bug)");
  const NEXT = [
    [0.1, 0.7, 0.2],
    [0.2, 0.2, 0.6],
    [0.8, 0.1, 0.1],
  ];
  const MAPS = [
    { ids: { a: 0, b: 1, "␣": 2 }, chars: ["a", "b", "␣"] },
    { ids: { a: 1, b: 0, "␣": 2 }, chars: ["b", "a", "␣"] },
  ];
  // Authoring-time greedy loop per prompt and tokenizer (the oracle re-runs it independently).
  const run = (p, m) => {
    const ids = [...p].map((c) => m.ids[c]);
    const gen = [];
    for (let last = ids.at(-1), k = 0; k < 3; k++) {
      const row = NEXT[last];
      const next = row.indexOf(Math.max(...row));
      gen.push({ id: next, ch: m.chars[next] });
      last = next;
    }
    return { p: [...p], ids, gen };
  };
  const by = (fn) =>
    pick(
      prompt,
      PROMPTS,
      PROMPTS.map((p) => iff(swapped, fn(run(p, MAPS[1])), fn(run(p, MAPS[0])))),
    );
  // In-scene arithmetic for the first prediction: the row is read by the last ID.
  const lastChar = pick(prompt, PROMPTS, PROMPTS.map((p) => [...p].at(-1)));
  const lastId = iff(eq(lastChar, "␣"), 2, iff(eq(lastChar, "a"), iff(swapped, 1, 0), iff(swapped, 0, 1)));
  const rowVal = (j) => iff(eq(lastId, 0), NEXT[0][j], iff(eq(lastId, 1), NEXT[1][j], NEXT[2][j]));
  const r = [0, 1, 2].map(rowVal);
  const greedy = iff(and(ge(r[1], r[0]), ge(r[1], r[2])), 1, iff(ge(r[0], r[2]), 0, 2));
  const slot = (i) => by((t) => (i < t.p.length ? 0 : i - t.p.length + 1)); // 0 = prompt, k = k-th generated
  const boxes = [];
  for (let i = 0; i < 7; i++) {
    const k = slot(i),
      x = 16 + 37 * i;
    const shown = iff(eq(k, 0), 1, after(2400, iff(le(k, steps), 1, 0), 0));
    boxes.push(
      { ...rect(`tk-box-${i}`, x, 76, 33, 54, white, 6), opacity: shown },
      { ...rect(`tk-gen-${i}`, x, 76, 33, 54, purple, 6), opacity: iff(eq(k, 0), 0, mul(0.3, shown)) },
      {
        ...centered(bold(`tk-ch-${i}`, by((t) => (i < t.p.length ? t.p[i] : (t.gen[i - t.p.length]?.ch ?? ""))), x + 16.5, 100, 18)),
        opacity: shown,
      },
      {
        ...centered(
          text(`tk-id-${i}`, by((t) => String(i < t.p.length ? t.ids[i] : (t.gen[i - t.p.length]?.id ?? ""))), x + 16.5, 122, 17, muted),
        ),
        opacity: shown,
      },
    );
  }
  const encode = card("tk-encode", 200, ice, blue, "TEXT → IDS", [
    text("tk-map", iff(swapped, "a→1, b→0, ␣→2 (swapped)", "a→0, b→1, ␣→2"), 16, 62),
    ...boxes,
    text("tk-legend", "lilac boxes: generated", 16, 156, 17, muted),
    text("tk-ids", by((t) => `IDs [${t.ids.join(", ")}]`), 16, 184),
  ]);
  const generatedText = iff(
    eq(steps, 0),
    by((t) => t.p.join("")),
    iff(
      eq(steps, 1),
      by((t) => t.p.join("") + t.gen[0].ch),
      iff(eq(steps, 2), by((t) => t.p.join("") + t.gen[0].ch + t.gen[1].ch), by((t) => t.p.join("") + t.gen.map((g) => g.ch).join(""))),
    ),
  );
  const predict = card("tk-predict", 256, lilac, purple, "THE LAST ID PICKS A ROW", [
    text("tk-last", cat("last '", lastChar, "' → ID ", lastId), 16, 62),
    text("tk-row", after(800, cat("row ", lastId, ": [", r[0], ", ", r[1], ", ", r[2], "]"), "row …"), 16, 90),
    text("tk-greedy", after(1600, cat("greedy ID ", greedy, ", p = ", max(...r)), "greedy …"), 16, 118),
    text("tk-decode", after(2400, by((t) => `decodes to '${t.gen[0].ch}'`), "decodes to …"), 16, 146),
    bold("tk-text", after(3200, cat("text: ", generatedText), "text: …"), 16, 180, 18, purple),
    bold(
      "tk-verdict",
      after(
        4000,
        // Name the cause: with a swapped tokenizer a final ␣ still reads the right row
        // (its ID is unchanged); only the decoding of the chosen ID is wrong.
        iff(swapped, iff(eq(lastChar, "␣"), "right row, wrong decode", "wrong row: a, b swapped"), "row and decode match"),
        "…",
      ),
      16,
      212,
      17,
      purple,
    ),
    text("tk-fixed", "the table never changes", 16, 240, 17, muted),
  ]);
  const pairs = card("tk-pairs", 224, sand, gold, "NEXT-TOKEN PAIRS", [
    text("tk-rule", cat("targets: ", iff(copy, "current (bug)", "shift by one")), 16, 62),
    text("tk-inputs", after(4000, by((t) => `inputs [${t.ids.slice(0, -1).join(", ")}]`), "inputs …"), 16, 90),
    text(
      "tk-targets",
      after(
        4000,
        iff(copy, by((t) => `targets [${t.ids.slice(0, -1).join(", ")}]`), by((t) => `targets [${t.ids.slice(1).join(", ")}]`)),
        "targets …",
      ),
      16,
      118,
    ),
    bold("tk-leak", after(4000, iff(copy, "leak: target = input", "target = next token"), "…"), 16, 152, 17, gold),
    text("tk-count", by((t) => `${t.p.length - 1} pairs from ${t.p.length} IDs`), 16, 180, 17, muted),
    text("tk-labels", "IDs are labels, not sizes", 16, 208, 17, muted),
  ]);
  return build({
    id: "concept-token-ids",
    title: "Text in, IDs through, text out.",
    description:
      "Encode a short text with the lesson's three-symbol vocabulary, read the invented next-token row chosen by the last ID, append greedy choices and decode them. Then swap two tokenizer IDs, or build training targets without the shift, and see which boundary broke.",
    state: {
      prompt: choice("Prompt text", PROMPTS),
      steps: num("Greedy tokens appended", 1, 0, 3, 1),
      tokenizer: choice("Tokenizer", ["Matches the model", "a, b IDs swapped"]),
      targets: choice("Training targets", ["Next token (shift)", "Current token (bug)"]),
    },
    kicker: "17 / TEXT BECOMES IDS",
    subtitle: "invented next-token table",
    grid: [
      [encode, 0],
      [predict, 1],
      [pairs, 2],
    ],
    compactOrder: [encode, predict, pairs],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "The vocabulary is a, b and space (␣) with IDs 0, 1 and 2. Encode the prompt first." },
      { atMs: 800, text: "This toy model consults only the last ID: it selects one row of an invented probability table." },
      { atMs: 1600, text: "Greedy decoding takes the most probable ID in that row." },
      { atMs: 2400, text: "Decode the chosen ID back to a character and append it. The table itself does not change." },
      { atMs: 3200, text: "Repeat: each appended token becomes the new last token." },
      { atMs: 4000, text: "Training pairs shift by one: each input position's target is the following token." },
    ],
    accessible:
      "Tokenization and next-token prediction with the lesson's vocabulary a, b and space (shown as ␣), whose IDs are 0, 1 and 2. The prompt ab␣a encodes to [0, 1, 2, 0]. An invented next-token table, not a trained model, gives one probability row per last ID: after a [0.1, 0.7, 0.2], after b [0.2, 0.2, 0.6], after space [0.8, 0.1, 0.1]. The last ID 0 selects the first row, the greedy choice is ID 1 with probability 0.7, and it decodes to b. Appending b makes ID 1 the last token, so the next greedy choice is a space with probability 0.6, then a. Generation changes the context; it never changes the table. If the tokenizer swaps the IDs of a and b while the table stays the same, the code still runs: a prompt ending in a or b now reads the wrong row, and a prompt ending in a space reads the right row (its ID is unchanged) but decodes the chosen ID 0 as b instead of a. Training pairs come from shifting the sequence: inputs [0, 1, 2] pair with targets [1, 2, 0]. Copying the current token as its own target leaks the answer into the input. IDs are categorical labels, not quantities.",
  });
})();

// ============================================================ 18 a training loop is a state machine
// ttf-e05-04: prediction w·x with x = 2, target 4, half squared error, η = 0.1 and w = 1 give
// weights 1.4 then 1.64; a flipped sign gives 0.6; an uncleared gradient gives 2.04.
const loopScene = (() => {
  const VARIANTS = ["Correct loop", "Sign flipped", "Gradient not cleared"];
  const w0 = s("w0"),
    eta = s("eta"),
    K = s("steps"),
    variant = s("variant");
  const flipped = eq(variant, VARIANTS[1]),
    stale = eq(variant, VARIANTS[2]);
  // With w* = y/x = 2 the gradient is (2w − 4)·2 = 4·(w − 2), so every loop keeps w − 2 = d0·c_k.
  // The coefficients are the expanded products of the update; the oracle runs the loop itself.
  const d0 = sub(w0, 2);
  const e4 = mul(4, eta);
  const cRef = [1, sub(1, e4), op("pow", sub(1, e4), 2), op("pow", sub(1, e4), 3)];
  const cFlip = [1, add(1, e4), op("pow", add(1, e4), 2), op("pow", add(1, e4), 3)];
  const cStale = [
    1,
    sub(1, e4),
    add(1, mul(-12, eta), mul(16, eta, eta)),
    add(1, mul(-24, eta), mul(80, eta, eta), mul(-64, eta, eta, eta)),
  ];
  const wRef = cRef.map((c) => add(2, mul(d0, c))),
    gRef = [1, 2, 3].map((k) => mul(4, d0, cRef[k - 1]));
  const cVar = [0, 1, 2, 3].map((k) => pick(variant, VARIANTS, [cRef[k], cFlip[k], cStale[k]]));
  const wVar = cVar.map((c) => add(2, mul(d0, c)));
  // What the chosen loop applies at step k: the fresh gradient, or the uncleared running sum.
  const used = [1, 2, 3].map((k) =>
    iff(stale, mul(4, d0, k === 1 ? 1 : add(...cStale.slice(0, k))), mul(4, d0, iff(flipped, cFlip[k - 1], cRef[k - 1]))),
  );
  const atK = (list) => iff(eq(K, 1), list[1], iff(eq(K, 2), list[2], list[3]));
  const loss = (c) => mul(2, d0, d0, c, c);
  const L0 = mul(2, d0, d0),
    Lref = atK(cRef.map(loss)),
    Lvar = atK(cVar.map(loss));
  const rowOpacity = (k) => iff(le(k, K), 1, 0);
  const reference = card("lp-ref", 218, ice, blue, "REFERENCE: w −= η·g", [
    text("lp-setup", cat("x 2, y 4, η ", r3(eta)), 16, 62, 17, muted),
    text("lp-start", cat("w0 = ", w0, ", L = ", r3(L0)), 16, 90),
    ...[1, 2, 3].map((k) => ({
      ...text(`lp-ref-${k}`, after(800 * k, cat(`${k}: g `, r3(gRef[k - 1]), " → w ", r3(wRef[k])), `${k}: …`), 16, 90 + 28 * k),
      opacity: rowOpacity(k),
    })),
    bold("lp-ref-loss", after(2400, cat("loss → ", r3(Lref)), "loss → …"), 16, add(150, mul(28, sub(K, 1))), 18, blue),
  ]);
  const chosen = card("lp-var", 196, lilac, purple, "CHOSEN LOOP", [
    text("lp-rule", pick(variant, VARIANTS, ["w −= η·g", "w += η·g (bug)", "w −= η·Σg (bug)"]), 16, 62),
    ...[1, 2, 3].map((k) => ({
      ...text(
        `lp-var-${k}`,
        after(800 * k, cat(`${k}: `, iff(stale, "buf ", "g "), r3(used[k - 1]), " → w ", r3(wVar[k])), `${k}: …`),
        16,
        62 + 28 * k,
      ),
      opacity: rowOpacity(k),
    })),
    bold("lp-var-loss", after(2400, cat("loss ", r3(L0), " → ", r3(Lvar)), "loss …"), 16, add(124, mul(28, sub(K, 1))), 18, purple),
  ]);
  const xOf = (w) => add(24, mul(40, add(op("clamp", w, -2, 4), 2)));
  const dot = (id, w, y, fill, opacity) => ({ ...circle(id, xOf(w), y, 6, fill), opacity });
  const same = and(
    ...[1, 2, 3].map((k) => or(gt(k, K), lt(abs(sub(wVar[k], wRef[k])), 0.000000001))),
  );
  const track = card("lp-line", 240, sand, gold, "WHERE w GOES (−2 … 4)", [
    segment("lp-axis", 24, 116, 240, 0, line, 2),
    segment("lp-target", 184, 52, 0, 64, gold, 2),
    dot("lp-ref-dot-0", wRef[0], 70, teal, 1),
    dot("lp-var-dot-0", wVar[0], 98, purple, 1),
    ...[1, 2, 3].flatMap((k) => [
      dot(`lp-ref-dot-${k}`, wRef[k], 70, teal, after(800 * k, rowOpacity(k), 0)),
      dot(`lp-var-dot-${k}`, wVar[k], 98, purple, after(800 * k, rowOpacity(k), 0)),
    ]),
    ...[-2, 0, 2, 4].map((v) => centered(text(`lp-tick-${v < 0 ? "m2" : v}`, String(v), 24 + 40 * (v + 2), 138, 17, muted))),
    text("lp-legend", "teal ref, purple chosen", 16, 164, 17, muted),
    bold(
      "lp-verdict",
      after(
        3200,
        // Name what actually differs: the transition, or what hides it in this state.
        iff(
          eq(variant, VARIANTS[0]),
          "matches the reference",
          iff(
            same,
            iff(eq(w0, 2), "hidden: gradient is 0", "same: 1 step, no stale g"),
            iff(flipped, "wrong: sign flipped", "wrong: buffer not cleared"),
          ),
        ),
        "…",
      ),
      16,
      196,
      17,
      gold,
    ),
    text(
      "lp-loss-note",
      after(
        3200,
        iff(
          lt(Lvar, sub(L0, 0.000000000001)),
          iff(or(eq(variant, VARIANTS[0]), same), "loss fell", "loss fell, still wrong"),
          iff(gt(Lvar, add(L0, 0.000000000001)), "loss rose", "loss unchanged"),
        ),
        "…",
      ),
      16,
      224,
    ),
  ]);
  // Both loop cards grow by one 28-unit row per chosen step (218 and 196 at three steps), so
  // no empty band is left below the last row; compact positions follow the card heights.
  const refHeight = add(162, mul(28, sub(K, 1))),
    varHeight = add(140, mul(28, sub(K, 1)));
  reference.node.children[0].height = refHeight;
  chosen.node.children[0].height = varHeight;
  const scene = build({
    id: "concept-loop-states",
    title: "Order the steps. Then judge them.",
    description:
      "Run the lesson's one-weight training loop next to a chosen variant: the correct update, a flipped sign, or a gradient buffer that is never cleared. Change the start weight, the learning rate and the number of steps, and see whether the loss alone could tell them apart.",
    state: {
      w0: num("Start weight w0", 1, 0, 3, 0.5),
      eta: num("Learning rate η", 0.1, 0.05, 0.3, 0.05),
      steps: num("Update steps", 2, 1, 3, 1),
      variant: choice("Loop variant", VARIANTS, VARIANTS[2]),
    },
    kicker: "18 / ORDER IS STATE",
    subtitle: "w·x, x = 2, target 4",
    grid: [
      [reference, 0],
      [chosen, 1],
      [track, 2],
    ],
    compactOrder: [reference, chosen, track],
    durationMs: 4000,
    cues: [
      { atMs: 0, text: "Prediction w·x with x = 2 and target 4, half squared error. Predict the first gradient at w = 1." },
      { atMs: 800, text: "Step 1: the gradient is −4, so w moves to 1.4 in the reference loop." },
      { atMs: 1600, text: "Step 2 recomputes the gradient at the new weight (−2.4) and reaches 1.64. A loop that kept the old gradient adds both." },
      { atMs: 2400, text: "Compare losses: the uncleared buffer reaches 2.04, and its loss is small here." },
      { atMs: 3200, text: "Judge the transition, not the loss: a wrong update can still lower the loss." },
    ],
    accessible:
      "A one-weight training loop with the lesson's numbers: prediction w·x with input 2, target 4, half squared error and learning rate 0.1, starting at w = 1. The reference loop subtracts the learning rate times the fresh gradient: the first gradient is −4, so w becomes 1.4; at that weight the gradient is −2.4, so w becomes 1.64, and the loss falls from 2 to 0.72 and then 0.2592. Adding instead of subtracting sends w to 0.6 after one step, where the loss is 3.92. Keeping the first gradient in an uncleared buffer adds it to the second: the second step uses −6.4 and sends w from 1.4 to 2.04. Its loss, 0.0032, is lower than the reference's, yet the state transition is wrong: loss improvement does not validate the algorithm. The verdict names the cause. With w0 = 2 every gradient is zero, so all three loops agree and the bug is hidden by the zero gradient; with one step the uncleared buffer has nothing stale in it yet, so it agrees with the reference for that reason. The number line shows each loop's weights from −2 to 4 (values beyond are pinned to the ends), with the target weight 2 marked.",
  });
  // Compact stacking: reference at 88, then the chosen loop, then the number line.
  const o = scene.layouts.compact.overrides;
  o["lp-var"] = { x: 16, y: add(104, refHeight) };
  o["lp-line"] = { x: 16, y: add(120, refHeight, varHeight) };
  o["concept-loop-states-canvas"] = { width: 320, height: add(376, refHeight, varHeight) };
  return scene;
})();

// ============================================================ 19 queries, keys and values
// ttf-e07-01: X rows [1,0],[0,2]; Wq [[1,1],[0,1]], Wk [[1,0],[1,1]], Wv [[2,0],[0,3]];
// Q·Kᵀ = [[1,4],[0,4]]; swapping Q and K gives the transpose; ∂X adds all three routes.
const qkvScene = (() => {
  const FIX = ["Lesson X", "Identity X", "All-ones X"];
  const XS = [
    [
      [1, 0],
      [0, 2],
    ],
    [
      [1, 0],
      [0, 1],
    ],
    [
      [1, 1],
      [1, 1],
    ],
  ];
  const fx = s("fixture"),
    qi = s("query"),
    swap = eq(s("order"), "K·Qᵀ (swapped)"),
    dropV = eq(s("branches"), "V branch dropped");
  const X = [0, 1].map((i) => [0, 1].map((j) => pick(fx, FIX, XS.map((m) => m[i][j]))));
  const Wq = [
      [1, 1],
      [0, 1],
    ],
    Wk = [
      [1, 0],
      [1, 1],
    ],
    Wv = [
      [2, 0],
      [0, 3],
    ];
  const proj = (W) => [0, 1].map((i) => [0, 1].map((j) => add(mul(X[i][0], W[0][j]), mul(X[i][1], W[1][j]))));
  const Q = proj(Wq),
    K = proj(Wk),
    V = proj(Wv);
  const S = [0, 1].map((i) => [0, 1].map((j) => add(mul(Q[i][0], K[j][0]), mul(Q[i][1], K[j][1]))));
  const shown = [0, 1].map((i) => [0, 1].map((j) => iff(swap, S[j][i], S[i][j])));
  const symmetric = eq(S[0][1], S[1][0]);
  const m2 = (M) => cat("[[", M[0][0], ",", M[0][1], "], [", M[1][0], ",", M[1][1], "]]");
  const project = card("qk-project", 190, ice, blue, "PROJECT X THREE WAYS", [
    text("qk-x", cat("X = ", m2(X)), 16, 62),
    text("qk-q", after(800, cat("Q = X·Wq = ", m2(Q)), "Q = …"), 16, 90),
    text("qk-k", after(800, cat("K = X·Wk = ", m2(K)), "K = …"), 16, 118),
    text("qk-v", after(800, cat("V = X·Wv = ", m2(V)), "V = …"), 16, 146),
    text("qk-count", "3 × (2×2) = 12 weights", 16, 174, 17, muted),
  ]);
  const cellX = [96, 172];
  const scores = card("qk-scores", 276, lilac, purple, "SCORES: ROW = QUERY", [
    text("qk-order", cat("order: ", iff(swap, "K·Qᵀ (swapped)", "Q·Kᵀ")), 16, 62),
    centered(text("qk-k0", "k0", cellX[0] + 34, 92, 17, muted)),
    centered(text("qk-k1", "k1", cellX[1] + 34, 92, 17, muted)),
    ...[0, 1].flatMap((i) => [
      text(`qk-q${i}`, `q${i}`, 40, 126 + 36 * i, 17, muted),
      ...[0, 1].flatMap((j) => [
        rect(`qk-s-${i}-${j}`, cellX[j], 104 + 36 * i, 68, 30, white, 6),
        {
          ...rect(`qk-s-${i}-${j}-hl`, cellX[j], 104 + 36 * i, 68, 30, purple, 6),
          opacity: after(1600, iff(eq(qi, i), 0.3, 0), 0),
        },
        centered(bold(`qk-s-${i}-${j}-v`, after(1600, shown[i][j], "…"), cellX[j] + 34, 126 + 36 * i, 18)),
      ]),
    ]),
    text(
      "qk-row",
      after(2400, cat("row ", qi, ": [", iff(eq(qi, 0), shown[0][0], shown[1][0]), ", ", iff(eq(qi, 0), shown[0][1], shown[1][1]), "]"), "row …"),
      16,
      204,
    ),
    bold(
      "qk-verdict",
      after(
        3200,
        // A swap is invisible exactly when S is symmetric: name the fixture, not "correct".
        iff(swap, iff(symmetric, "swap hidden: S symmetric", "swapped: this is Sᵀ"), "rows are queries"),
        "…",
      ),
      16,
      236,
      17,
      purple,
    ),
    text("qk-sym", after(3200, cat("S is ", iff(symmetric, "symmetric", "not symmetric")), "S is …"), 16, 264, 17, muted),
  ]);
  const T = (W) => [0, 1].map((i) => [0, 1].map((j) => W[j][i]));
  const WqT = T(Wq),
    WkT = T(Wk),
    WvT = T(Wv);
  const dX = [0, 1].map((i) => [0, 1].map((j) => add(WqT[i][j], WkT[i][j], iff(dropV, 0, WvT[i][j]))));
  const backward = card("qk-backward", 224, sand, gold, "BACKWARD INTO X", [
    text("qk-upstream", "invented: ∂Q=∂K=∂V=I", 16, 62, 17, muted),
    text("qk-dwq", after(4000, cat("∂Wq = Xᵀ = ", m2(T(X))), "∂Wq = …"), 16, 90),
    text("qk-routes", cat("routes: ", iff(dropV, "Q, K (V dropped)", "Q, K and V")), 16, 118),
    text("qk-dx", after(4000, cat("∂X = ", m2(dX)), "∂X = …"), 16, 146),
    bold("qk-dx-verdict", after(4000, iff(dropV, "V route missing in ∂X", "all three routes added"), "…"), 16, 180, 17, gold),
    text("qk-sum", "sum ∂P·Wpᵀ over Q, K, V", 16, 208, 17, muted),
  ]);
  return build({
    id: "concept-qkv-scores",
    title: "Three projections, one score grid.",
    description:
      "Project the lesson's two-token X into queries, keys and values with three learned matrices, then read the score grid row by row. Swap the order of Q and K, try a symmetric fixture, and drop one route from the input gradient.",
    state: {
      fixture: choice("Input X", FIX),
      query: num("Query row i", 0, 0, 1, 1),
      order: choice("Score order", ["Q·Kᵀ", "K·Qᵀ (swapped)"]),
      branches: choice("Routes back to X", ["Q, K and V", "V branch dropped"]),
    },
    kicker: "19 / QUERIES MEET KEYS",
    subtitle: "row vectors, no biases",
    grid: [
      [project, 0],
      [scores, 1],
      [backward, 2],
    ],
    compactOrder: [project, scores, backward],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "X has one row per token. Wq, Wk and Wv are learned 2×2 matrices: twelve weights." },
      { atMs: 800, text: "Q = X·Wq, K = X·Wk and V = X·Wv: the same rows, three different projections." },
      { atMs: 1600, text: "Score S[i, j] compares query i with key j: S = Q·Kᵀ." },
      { atMs: 2400, text: "Row i is what query i sees across the candidate source positions." },
      { atMs: 3200, text: "Swapping Q and K gives the transpose. A symmetric fixture hides that mistake." },
      { atMs: 4000, text: "Backward: X receives a contribution through Q, K and V. Dropping one route corrupts ∂X." },
    ],
    accessible:
      "Queries, keys and values with the lesson's numbers in row-vector notation. X has rows [1, 0] and [0, 2]. Wq has rows [1, 1] and [0, 1], Wk has rows [1, 0] and [1, 1], and Wv has rows [2, 0] and [0, 3]: twelve learned weights without biases. Then Q = X·Wq = [[1, 1], [0, 2]], K = X·Wk = [[1, 0], [2, 2]] and V = X·Wv = [[2, 0], [0, 6]]. The unscaled scores Q·Kᵀ are [[1, 4], [0, 4]]: row i belongs to query i and column j to key j. Computing K·Qᵀ instead gives the transpose [[1, 0], [4, 4]], a valid matrix that answers different questions. With the all-ones fixture the score matrix is all 4s, which is symmetric, so the swap is invisible: the verdict says the fixture hides it rather than calling the order correct. With the identity fixture S = [[1, 2], [0, 1]] and the swap shows. For the backward pass, an invented upstream gradient I for each of Q, K and V gives ∂Wq = Xᵀ and ∂X = Wqᵀ + Wkᵀ + Wvᵀ = [[4, 1], [1, 5]]; dropping the V route gives [[2, 1], [1, 2]], which is wrong.",
  });
})();

// ============================================================ 20 asynchronous devices and timer boundaries
// ttf-e08-02: invented timeline; the host submits from 0 to 0.2 ms and the result is ready at 5.2 ms.
// The submission duration is 0.2 ms, completion latency 5.2 ms. C = [[4,4],[10,8]].
const asyncScene = (() => {
  const sb = s("submit"),
    run = s("run"),
    q = s("queued");
  const startSync = eq(s("start"), "After earlier work"),
    stopSync = eq(s("stop"), "After device sync"),
    permuted = eq(s("layout"), "Row 1 permuted (bug)");
  const t0 = iff(startSync, q, 0);
  const submitted = add(t0, sb);
  const begin = max(submitted, q);
  const ready = add(begin, run);
  const t1 = iff(stopSync, ready, submitted);
  const measured = sub(t1, t0),
    latency = add(sb, run);
  const X0 = 84,
    PX = 11;
  const xAt = (tv) => add(X0, mul(PX, tv));
  const timeline = card("as-timeline", 168, ice, blue, "INVENTED TIMELINE (ms)", [
    text("as-host-label", "host", 16, 64, 17, muted),
    { ...rect("as-host", xAt(t0), 50, mul(PX, sb), 16, blue, 3), opacity: after(800, 1, 0) },
    text("as-device-label", "device", 16, 98, 17, muted),
    { ...rect("as-earlier", X0, 84, mul(PX, q), 16, gold, 3), opacity: after(1600, 1, 0) },
    { ...rect("as-kernel", xAt(begin), 84, mul(PX, run), 16, purple, 3), opacity: after(1600, 1, 0) },
    text("as-timer-label", "timer", 16, 132, 17, muted),
    { ...segment("as-timer", xAt(t0), 126, mul(PX, measured), 0, teal, 4), opacity: after(2400, 1, 0) },
    ...[0, 5, 10, 15].map((v) => centered(text(`as-tick-${v}`, String(v), X0 + PX * v, 158, 17, muted))),
  ]);
  const timer = card("as-timer-card", 224, lilac, purple, "WHAT THE TIMER SAW", [
    text("as-start", cat("start: ", iff(startSync, "after earlier work", "immediately")), 16, 62),
    text("as-stop", cat("stop: ", iff(stopSync, "after device sync", "call returns")), 16, 90),
    text("as-measured", after(2400, cat("timer: ", r3(measured), " ms"), "timer: …"), 16, 118),
    text("as-latency", after(3200, cat("latency s + d: ", r3(latency), " ms"), "latency s + d: …"), 16, 146),
    bold(
      "as-verdict",
      after(
        4000,
        // The cause of a wrong reading is the boundary that was crossed, not the device.
        iff(
          not(stopSync),
          "submit only: no end sync",
          iff(
            lt(abs(sub(measured, latency)), 0.000000001),
            iff(or(startSync, eq(q, 0)), "completion latency", "matches: queue drained"),
            "includes earlier work",
          ),
        ),
        "…",
      ),
      16,
      180,
      17,
      purple,
    ),
    text("as-invented", "numbers are invented", 16, 208, 17, muted),
  ]);
  const C = [
    [add(mul(1, 2), mul(2, 1)), add(mul(1, 0), mul(2, 2))],
    [add(mul(3, 2), mul(4, 1)), add(mul(3, 0), mul(4, 2))],
  ];
  const k1 = [iff(permuted, C[1][1], C[1][0]), iff(permuted, C[1][0], C[1][1])];
  const err = max(abs(sub(k1[0], C[1][0])), abs(sub(k1[1], C[1][1])));
  const mapping = card("as-mapping", 196, sand, gold, "SAME INDEX MAPPING", [
    text("as-c", cat("A·B = [[", C[0][0], ",", C[0][1], "], [", C[1][0], ",", C[1][1], "]]"), 16, 62),
    text("as-row1", cat("kernel row 1: [", k1[0], ", ", k1[1], "]"), 16, 90),
    text("as-err", cat("max |error| = ", err), 16, 118),
    bold("as-map-verdict", iff(gt(err, 0), "permutation, not rounding", "same index mapping"), 16, 152, 17, gold),
    text("as-loops", "loops or tiles: same C", 16, 180, 17, muted),
  ]);
  return build({
    id: "concept-async-timer",
    title: "Returning is not finishing.",
    description:
      "On an invented timeline the host submits work and returns while the device is still running. Move the timer's start and stop boundaries, add earlier queued work, and compare what the timer reads with the completion latency. Then permute one output row and see why that is not rounding.",
    state: {
      submit: num("Submit time s (ms)", 0.2, 0.1, 1, 0.1),
      run: num("Device run time d (ms)", 5, 1, 10, 1),
      queued: num("Earlier queued work (ms)", 0, 0, 6, 1),
      start: choice("Timer starts", ["After earlier work", "Immediately"]),
      stop: choice("Timer stops", ["When the call returns", "After device sync"]),
      layout: choice("Kernel output", ["Index mapping kept", "Row 1 permuted (bug)"]),
    },
    kicker: "20 / SUBMIT IS NOT DONE",
    subtitle: "invented times, no device",
    grid: [
      [timeline, 0],
      [timer, 1],
      [mapping, 2],
    ],
    compactOrder: [timeline, timer, mapping],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "A Python call can enqueue device work and return before that work finishes." },
      { atMs: 800, text: "The host spends s milliseconds submitting: 0.2 ms in the lesson's invented timeline." },
      { atMs: 1600, text: "The device runs the work afterwards, behind anything queued earlier; the result is ready at 5.2 ms." },
      { atMs: 2400, text: "The timer reads the gap between its start and stop boundaries." },
      { atMs: 3200, text: "Completion latency needs a sync before starting and a sync before stopping: s + d." },
      { atMs: 4000, text: "Name the boundary that made a reading wrong. A permuted output row is a semantic bug, not rounding." },
    ],
    accessible:
      "Timing an asynchronous device with the lesson's invented timeline. The host starts at 0 ms and finishes submitting at 0.2 ms; the device runs the work for 5 ms, so the result is ready at 5.2 ms. A timer that stops when the call returns reads 0.2 ms, the submission time only. Waiting for earlier work before starting and syncing on the device before stopping reads 5.2 ms, the completion latency s + d. If earlier work is still queued and the timer starts immediately, a synced stop also counts that earlier work: with 3 ms queued it reads 8 ms. Starting immediately happens to read the right value when nothing is queued, or when the earlier work drains before submission ends; the verdict says so. Bars show host submission, earlier device work, this work and the timer interval on a millisecond axis. Separately, the lesson's product of A = [[1, 2], [3, 4]] and B = [[2, 0], [1, 2]] is [[4, 4], [10, 8]]. A kernel that writes the second row as [8, 10] has maximum error 2: that is a permutation of indices, not floating-point rounding, and no tolerance should accept it. All times are invented, not measurements of any device.",
  });
})();

// ============================================================ 21 memory budget and Amdahl's limit
// sys-e09-04: fictional 24 GiB with 6 GiB reserved; parameters 5, gradients 5, optimizer 10,
// activations 3 → need 23 of 18. A 10 s step with 4 s compute and 6 s waiting.
const memoryScene = (() => {
  const act = s("act"),
    half = s("half"),
    partial = eq(s("count"), "Parameters only (bug)"),
    k = s("speedup");
  const P = iff(half, 2.5, 5);
  const need = add(P, 5, 10, act),
    counted = iff(partial, P, need);
  const PX = 10,
    X0 = 16;
  const seg = (id, x, w, fill) => ({ ...rect(id, x, 48, w, 24, fill, 3), opacity: 1 });
  const ledger = card("mb-ledger", 206, ice, blue, "MEMORY LEDGER (GiB)", [
    seg("mb-params", X0, mul(PX, P), blue),
    seg("mb-grads", add(X0, mul(PX, P)), 50, teal),
    seg("mb-opt", add(X0 + 50, mul(PX, P)), 100, gold),
    seg("mb-act", add(X0 + 150, mul(PX, P)), mul(PX, act), purple),
    { ...segment("mb-budget", X0 + 180, 42, 0, 36, red, 3), opacity: after(800, 1, 0) },
    { ...segment("mb-physical", X0 + 240, 42, 0, 36, ink, 2), opacity: after(800, 1, 0) },
    text("mb-l-params", "params", 16, 100, 17, blue),
    text("mb-l-grads", "grads", 92, 100, 17, teal),
    text("mb-l-opt", "opt", 160, 100, 17, gold),
    text("mb-l-act", "act", 212, 100, 17, purple),
    text("mb-sum", after(1600, cat(P, " + 5 + 10 + ", act, " = ", need), "sum …"), 16, 128),
    text("mb-avail", "24 − 6 reserved = 18", 16, 156, 17, muted),
    text("mb-lines", "red line: 18, black: 24", 16, 184, 17, muted),
  ]);
  const budget = card("mb-budget-card", 224, lilac, purple, "DOES IT FIT?", [
    text("mb-count", cat("count: ", iff(partial, "parameters only", "all training state")), 16, 62),
    text("mb-counted", after(2400, cat("counted need ", counted, " GiB"), "counted need …"), 16, 90),
    text("mb-real", after(2400, cat("real need ", need, " of 18"), "real need …"), 16, 118),
    bold(
      "mb-verdict",
      after(3200, iff(gt(need, 18), cat("short by ", sub(need, 18), " GiB"), cat("fits: ", sub(18, need), " GiB spare")), "…"),
      16,
      152,
      17,
      purple,
    ),
    text(
      "mb-cause",
      after(
        3200,
        iff(
          partial,
          iff(gt(need, 18), "params-only count hid it", "fits, but count partial"),
          iff(gt(need, 18), cat("weights: ", P, " of ", need, " GiB"), "every state type counted"),
        ),
        "…",
      ),
      16,
      180,
    ),
    text("mb-half", iff(half, "half-size weights: −2.5", "weights at full size"), 16, 208, 17, muted),
  ]);
  const compute = div(4, k),
    step = add(compute, 6);
  const amdahl = card("mb-amdahl", 276, sand, gold, "AMDAHL, ONE STEP", [
    text("mb-split", "compute 4 s + wait 6 s", 16, 62),
    text("mb-speed", cat("GPU ", k, "× faster"), 16, 90),
    rect("mb-before-c", 16, 104, 96, 14, teal, 3),
    rect("mb-before-w", 112, 104, 144, 14, gold, 3),
    { ...rect("mb-after-c", 16, 126, mul(24, compute), 14, teal, 3), opacity: after(3200, 1, 0) },
    { ...rect("mb-after-w", add(16, mul(24, compute)), 126, 144, 14, gold, 3), opacity: after(3200, 1, 0) },
    text("mb-step", after(3200, cat("step ", r3(step), " s"), "step …"), 16, 172),
    text("mb-speedup", after(3200, cat("speedup ", r3(div(10, step)), "×"), "speedup …"), 16, 200),
    bold("mb-amdahl-verdict", after(4000, iff(eq(k, 1), "no change at 1×", "wait-bound: 6 s floor"), "…"), 16, 232, 17, gold),
    text("mb-limit", "∞ compute: 1.667× max", 16, 260, 17, muted),
  ]);
  return build({
    id: "concept-memory-budget",
    title: "Count every state. Find the floor.",
    description:
      "Stack the lesson's fictional training state against an 18 GiB working budget: parameters, gradients, optimizer buffers and live activations. Shrink activations or store weights at half size, count only parameters by mistake, then speed up the GPU part of a step and see where Amdahl's law stops you.",
    state: {
      act: num("Live activations (GiB)", 3, 0, 6, 1),
      half: flag("Store weights at half size"),
      count: choice("Count in the budget", ["All training state", "Parameters only (bug)"]),
      speedup: num("GPU speedup ×", 2, 1, 8, 1),
    },
    kicker: "21 / BUDGETS AND BOUNDS",
    subtitle: "fictional machine, GiB",
    grid: [
      [ledger, 0],
      [budget, 1],
      [amdahl, 2],
    ],
    compactOrder: [ledger, budget, amdahl],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "A fictional machine has 24 GiB. Predict whether training state of 5 + 5 + 10 + 3 GiB fits." },
      { atMs: 800, text: "Reserve 6 GiB for the system and other work: the budget is 18 GiB." },
      { atMs: 1600, text: "Training needs parameters, gradients, optimizer buffers and live activations: 23 GiB." },
      { atMs: 2400, text: "Counting only the parameters would report 5 GiB and plenty of headroom." },
      { atMs: 3200, text: "Half-size weights shrink one bar, not gradients or optimizer moments. Then speed up compute." },
      { atMs: 4000, text: "Doubling compute turns 10 s into 8 s, 1.25×. The 6 s of waiting is a floor." },
    ],
    accessible:
      "A memory budget and Amdahl's law with the lesson's fictional numbers. A machine has 24 GiB; 6 GiB is reserved for the operating system and other activity, leaving 18 GiB. Training state is parameters 5 GiB, gradients 5 GiB, optimizer buffers 10 GiB and live activations 3 GiB: 23 GiB, a 5 GiB deficit. Counting only the parameters would wrongly report 5 GiB and 13 GiB of headroom; the verdict names that counting error. Storing weights at half size saves 2.5 GiB of parameters but does not shrink gradients or optimizer moments, so the need is still 20.5 GiB. Reducing live activations, for example by recomputation, shrinks only the activation bar; at 0 GiB with half-size weights the need is 17.5 GiB and fits with 0.5 GiB spare. A stacked bar shows each part with a line at 18 GiB and another at 24 GiB. For time, a 10 s step spends 4 s computing and 6 s waiting. Making the GPU twice as fast gives 2 + 6 = 8 s, a 1.25× speedup; eight times faster gives 6.5 s. Even infinitely fast compute leaves 6 s, so the speedup can never exceed 10/6 ≈ 1.667× under this serial-wait model.",
  });
})();

// ============================================================ 22 pseudo-gradients and the outer merge
// sys-10-04: old [10,20]; local A [9,18] and B [8,21]; Δ = old − local = [1,2], [2,−1];
// mean [1.5,0.5]; outer Nesterov with β = 0.5, rate 0.2 → [9.55,19.85]. Ten values, count 3 → 4, 4, 2.
const mergeScene = (() => {
  const VALID = ["A and B", "A only", "None"];
  const valid = s("valid"),
    flipped = eq(s("sign"), "local − old (flipped)"),
    beta = s("beta"),
    lr = s("lr"),
    kc = s("chunks"),
    divides = eq(s("countUse"), "Also divides g (bug)");
  const old = [10, 20],
    A = [9, 18],
    B = [8, 21];
  const none = eq(valid, "None"),
    aOnly = eq(valid, "A only");
  const signed = (v) => iff(flipped, -v, v);
  const dA = [0, 1].map((i) => signed(old[i] - A[i])),
    dB = [0, 1].map((i) => signed(old[i] - B[i]));
  const mean = [0, 1].map((i) => iff(aOnly, dA[i], div(add(dA[i], dB[i]), 2)));
  // The source uses the mean itself; the misreading divides it by the batch-count setting.
  const g = mean.map((v) => div(v, iff(divides, kc, 1)));
  const dir = g.map((v) => mul(add(1, beta), v));
  const nw = [0, 1].map((i) => iff(none, old[i], sub(old[i], mul(lr, dir[i]))));
  const vec = (a, b, lead = "") => cat(lead, "[", r3(a), ", ", r3(b), "]");
  const local = card("om-local", 218, ice, blue, "LOCAL RESULTS", [
    text("om-old", "old w [10, 20]", 16, 62),
    text("om-a", after(800, iff(none, "A [9, 18]: invalid", vec(dA[0], dA[1], "A [9, 18]: Δ ")), "A …"), 16, 90),
    text(
      "om-b",
      after(800, iff(eq(valid, "A and B"), vec(dB[0], dB[1], "B [8, 21]: Δ "), "B [8, 21]: invalid"), "B …"),
      16,
      118,
    ),
    text("om-g", after(1600, iff(none, "mean g: no valid input", vec(mean[0], mean[1], "mean g ")), "mean g …"), 16, 146),
    text(
      "om-used",
      after(
        1600,
        iff(none, "used: nothing", iff(divides, cat("bug ÷", kc, ": [", r3(g[0]), ", ", r3(g[1]), "]"), "used: mean g as is")),
        "used …",
      ),
      16,
      174,
    ),
    text("om-sign", cat("Δ = ", iff(flipped, "local − old (bug)", "old − local")), 16, 202, 17, muted),
  ]);
  const L = mul(-1, floor(div(-10, kc))); // ceiling division, as the chunking code does
  const len = [0, 1, 2, 3, 4].map((i) => op("clamp", sub(10, mul(i, L)), 0, L));
  const slices = cat(
    len[0],
    ...[1, 2, 3, 4].map((i) => iff(gt(len[i], 0), cat(", ", len[i]), "")),
  );
  const chunks = card("om-chunks", 140, mint, teal, "CHUNKS OF 10 VALUES", [
    ...Array.from({ length: 10 }, (_, j) => [
      rect(`om-cell-${j}`, 16 + 26 * j, 44, 22, 22, white, 4),
      {
        ...rect(`om-cell-${j}-hl`, 16 + 26 * j, 44, 22, 22, teal, 4),
        opacity: after(4000, iff(eq(mod(floor(div(j, L)), 2), 0), 0.5, 0.15), 0),
      },
    ]).flat(),
    text("om-length", cat("count ", kc, ": length ", L), 16, 96),
    text("om-slices", cat("slices ", slices), 16, 124),
  ]);
  const outer = card("om-outer", 256, lilac, purple, "OUTER STEP", [
    text("om-params", cat("β ", r3(beta), ", rate ", r3(lr)), 16, 62),
    text("om-m", "m = g, since old m = 0", 16, 90, 17, muted),
    text("om-dir", after(2400, iff(none, "dir: none", vec(dir[0], dir[1], "dir ")), "dir …"), 16, 118),
    bold("om-new", after(3200, vec(nw[0], nw[1], "new "), "new …"), 16, 152, 18, purple),
    bold(
      "om-verdict",
      after(
        4000,
        iff(none, "rejected: no valid input", iff(flipped, "moves away: sign flipped", iff(aOnly, "moves toward A", "moves toward A and B"))),
        "…",
      ),
      16,
      184,
      17,
      purple,
    ),
    text(
      "om-count",
      after(
        4000,
        // The batch-count setting only partitions the vector; dividing by it is the misreading.
        iff(none, "count unused: rejected", iff(divides, iff(eq(kc, 1), "÷ 1 hides the misread", cat("g ÷ ", kc, ": count misread")), "count only sets chunks")),
        "…",
      ),
      16,
      212,
    ),
    text("om-dir-rule", "dir = (1+β)·g", 16, 240, 17, muted),
  ]);
  const px = (w) => add(16, mul(32, sub(w, 6))),
    py = (w) => add(44, mul(18, sub(24, w)));
  const plane = card("om-plane", 236, sand, gold, "WEIGHT PLANE (w0, w1)", [
    { ...rect("om-area", 16, 44, 256, 144, white, 6), opacity: 0.6 },
    { ...segment("om-move", px(10), py(20), mul(32, sub(nw[0], 10)), mul(-18, sub(nw[1], 20)), gold, 3), opacity: after(3200, 1, 0) },
    circle("om-p-old", px(10), py(20), 6, ink),
    { ...circle("om-p-a", px(9), py(18), 6, teal), opacity: iff(none, 0.3, 1) },
    { ...circle("om-p-b", px(8), py(21), 6, purple), opacity: iff(eq(valid, "A and B"), 1, 0.3) },
    { ...circle("om-p-new", px(nw[0]), py(nw[1]), 6, gold), opacity: after(3200, 1, 0) },
    text("om-key-old", "● old", 16, 214, 17, ink),
    text("om-key-a", "● A", 88, 214, 17, teal),
    text("om-key-b", "● B", 140, 214, 17, purple),
    text("om-key-new", "● new", 192, 214, 17, gold),
  ]);
  return build({
    id: "concept-outer-merge",
    title: "Average the moves, then step once.",
    description:
      "Two local runs start from the same old weights. Form each pseudo-gradient as old minus local, average the valid ones and apply an outer momentum step, drawn on the weight plane. Flip the sign, drop contributors, and misread the batch-count setting as a divisor.",
    state: {
      valid: choice("Valid contributors", VALID),
      sign: choice("Pseudo-gradient", ["old − local (source)", "local − old (flipped)"]),
      beta: num("Outer momentum β", 0.5, 0, 0.9, 0.1),
      lr: num("Outer rate", 0.2, 0.1, 1, 0.1),
      chunks: num("Batch-count setting", 3, 1, 5, 1),
      countUse: choice("Batch-count use", ["Chunks only (source)", "Also divides g (bug)"]),
    },
    kicker: "22 / MERGE DISPLACEMENTS",
    subtitle: "illustrative coefficients",
    grid: [
      [local, 0],
      [chunks, 0],
      [outer, 1],
      [plane, 2],
    ],
    compactOrder: [local, outer, plane, chunks],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "Both workers start at [10, 20]. A ends at [9, 18] and B at [8, 21] after local training." },
      { atMs: 800, text: "A pseudo-gradient is old minus local: [1, 2] for A and [2, −1] for B." },
      { atMs: 1600, text: "Average the valid contributions: [1.5, 0.5]." },
      { atMs: 2400, text: "Outer momentum from zero: m = g, direction g + β·m = (1 + β)·g = [2.25, 0.75]." },
      { atMs: 3200, text: "New weights = old − rate · direction = [9.55, 19.85]: toward the local results." },
      { atMs: 4000, text: "An empty valid set is rejected, not a zero update. The batch-count setting only chunks the vector." },
    ],
    accessible:
      "An outer merge with the lesson's illustrative numbers. Two local runs start from old weights [10, 20]; A ends at [9, 18] and B at [8, 21]. Each pseudo-gradient is old minus local: [1, 2] for A and [2, −1] for B. Their equal-weight mean is [1.5, 0.5]. With the old momentum buffer at zero, momentum coefficient 0.5 and outer rate 0.2, the new buffer is g, the Nesterov-style direction is g + 0.5·g = [2.25, 0.75], and the new weights are [10 − 0.45, 20 − 0.15] = [9.55, 19.85], which moves toward the local results on the weight plane. Using local minus old flips the sign and the step moves away. If only A is valid the mean is A's [1, 2]; if no contributor is valid the merge is rejected rather than treated as a zero update. The batch-count setting partitions the flat vector into chunks of length ceil(10 / count): count 3 gives slices of 4, 4 and 2. It is not a divisor; dividing g by it shrinks the step, and with count 1 the misreading is hidden. These coefficients are illustrative, not runtime settings.",
  });
})();

// ============================================================ 23 ready queue, activation cache and the optimizer boundary
// sys-11-03: cache capacity 2 and threshold 3; F(A), F(B), then a ready B(A) is chosen before
// F(C); after B(B) and B(C) the counter reaches three and one optimizer step is eligible.
const cacheScene = (() => {
  const cap = s("capacity"),
    T = s("threshold"),
    backFirst = eq(s("policy"), "Ready backward first"),
    freeLate = eq(s("release"), "After its backward"),
    slices = eq(s("counting"), "Slices, 3 each (bug)");
  // Authoring-time trace per setting; the oracle re-simulates it independently. Return delays
  // (A +2, B +3, C +2 scheduler steps after each forward) are invented for the illustration.
  const simulate = (capacity, preferBackward, keepUntilBackward) => {
    const names = ["A", "B", "C"],
      delay = { A: 2, B: 3, C: 2 };
    const cache = new Set(),
      readyAt = {},
      done = new Set(),
      rows = [];
    let next = 0,
      ok = 0,
      failed = 0,
      idle = 0;
    for (let step = 1; step <= 10; step++) {
      const ready = names.filter((n) => readyAt[n] !== undefined && readyAt[n] <= step && !done.has(n));
      const canForward = next < names.length && cache.size < capacity;
      const backward = () => {
        const n = ready[0];
        done.add(n);
        if (cache.has(n)) {
          cache.delete(n);
          ok++;
          return `B(${n})`;
        }
        failed++;
        return `B(${n}) ✗`;
      };
      const forward = () => {
        const n = names[next++];
        readyAt[n] = step + delay[n];
        if (keepUntilBackward) cache.add(n);
        return `F(${n})`;
      };
      let action;
      if (preferBackward) action = ready.length ? backward() : canForward ? forward() : null;
      else action = canForward ? forward() : ready.length ? backward() : null;
      if (!action) {
        action = done.size === names.length ? "done" : "idle";
        if (action === "idle") idle++;
      }
      rows.push(`${step}: ${action} {${[...cache].sort().join(",")}} ok ${ok}`);
    }
    return { rows, ok, failed, idle };
  };
  const by = (fn) =>
    pick(
      cap,
      [1, 2, 3],
      [1, 2, 3].map((c) =>
        iff(
          backFirst,
          iff(freeLate, fn(simulate(c, true, true)), fn(simulate(c, true, false))),
          iff(freeLate, fn(simulate(c, false, true)), fn(simulate(c, false, false))),
        ),
      ),
    );
  const settings = card("cq-settings", 190, ice, blue, "QUEUE SETTINGS", [
    text("cq-cap", cat("cache capacity ", cap), 16, 62),
    text("cq-threshold", cat("threshold ", T, " ", iff(slices, "slices", "activations")), 16, 90),
    text("cq-policy", iff(backFirst, "prefer ready backward", "prefer forward"), 16, 118),
    text("cq-release", iff(freeLate, "free cache after backward", "free at forward end (bug)"), 16, 146),
    text("cq-delays", "returns: A +2, B +3, C +2", 16, 174, 17, muted),
  ]);
  const trace = card("cq-trace", 288, lilac, purple, "SCHEDULER TRACE", [
    ...Array.from({ length: 10 }, (_, k) =>
      text(`cq-row-${k + 1}`, after(400 * (k + 1), by((r) => r.rows[k]), `${k + 1}: …`), 16, 60 + 24 * k),
    ),
  ]);
  const okF = by((r) => r.ok),
    failF = by((r) => r.failed),
    idleF = by((r) => r.idle);
  const u = iff(slices, 3, 1);
  const per = mul(-1, floor(div(mul(-1, T), u))); // backwards needed per optimizer step
  const stepsF = floor(div(okF, per)),
    left = mul(u, mod(okF, per));
  const trueSteps = floor(div(okF, T));
  const summary = card("cq-summary", 228, sand, gold, "COUNTER AND STEP", [
    text("cq-okfail", after(4400, cat("backward ok ", okF, ", failed ", failF), "backward …"), 16, 62),
    text("cq-unit", after(4400, cat("counter +", u, " each, need ", T), "counter …"), 16, 90),
    bold("cq-steps", after(4400, cat("optimizer steps: ", stepsF), "optimizer steps: …"), 16, 124, 18, gold),
    text("cq-left", after(4400, cat("counter left: ", left), "counter left: …"), 16, 152),
    text("cq-idle", after(4400, cat("idle ", idleF, iff(gt(idleF, 0), ": awaiting returns", "")), "idle …"), 16, 180),
    bold(
      "cq-verdict",
      after(
        4800,
        // Failed backwards come from the freed input, never from capacity or counting.
        iff(
          gt(failF, 0),
          "failed: input freed early",
          iff(
            slices,
            iff(eq(stepsF, trueSteps), "same count; slices wrong", "slices counted as work"),
            cat(stepsF, iff(eq(stepsF, 1), " step", " steps"), " from ", okF, " backwards"),
          ),
        ),
        "…",
      ),
      16,
      212,
      17,
      gold,
    ),
  ]);
  return build({
    id: "concept-cache-queue",
    title: "Hold the input until its backward.",
    description:
      "Schedule three activations through a ready queue with a limited activation cache, an invented return delay for each, and an accumulation threshold for the local optimizer. Change the capacity and the queue preference, free cache entries too early, or count backward slices as completed work.",
    state: {
      capacity: num("Cache capacity", 2, 1, 3, 1),
      threshold: num("Optimizer threshold", 3, 1, 4, 1),
      policy: choice("Queue preference", ["Ready backward first", "Forward first"]),
      release: choice("Free a cache entry", ["After its backward", "When forward ends (bug)"]),
      counting: choice("Counter unit", ["Activations", "Slices, 3 each (bug)"]),
    },
    kicker: "23 / CACHE OUTLIVES THE POP",
    subtitle: "synthetic trace, 3 items",
    grid: [
      [settings, 0],
      [trace, 1],
      [summary, 2],
    ],
    compactOrder: [settings, trace, summary],
    durationMs: 5200,
    cues: [
      { atMs: 0, text: "Three activations A, B and C. The cache holds two forward inputs; the threshold is three completed backwards." },
      { atMs: 400, text: "F(A) and F(B) fill both cache slots." },
      { atMs: 1200, text: "B(A) is ready and is chosen ahead of F(C). It frees A's slot and counts one completion." },
      { atMs: 1600, text: "Now F(C) can enter the cache." },
      { atMs: 2400, text: "Backwards for B and C complete; the counter reaches three." },
      { atMs: 4400, text: "One optimizer step is eligible. Idle steps mean waiting for returns, not computing." },
      { atMs: 4800, text: "Freeing an input when its forward ends makes its backward fail; counting slices inflates steps." },
    ],
    accessible:
      "A synthetic scheduler trace with the lesson's fixture: cache capacity two and optimizer threshold three. Activations A, B and C each need a forward and, later, a backward that uses the cached forward input. Invented return delays make A's backward ready two scheduler steps after its forward, B's three and C's two. With a ready backward preferred: step 1 F(A), step 2 F(B) fills the cache, step 3 B(A) is chosen ahead of F(C) and frees A's slot (one completion), step 4 F(C), step 5 B(B), step 6 B(C). The counter reaches three and one local optimizer step is eligible, with nothing left in the cache. With capacity one the forwards must wait for returns and the trace has idle steps: waiting, not computing. Preferring forwards with capacity two puts F(C) behind a full cache anyway. If a cache entry is freed when its forward ends instead of after its backward, every backward finds its input gone and fails, so no optimizer step happens: the cause is the early release. Counting three slices per backward instead of one completed activation makes the counter reach the threshold sooner and reports more optimizer steps than completed work justifies; with threshold one the totals happen to agree.",
  });
})();

// ============================================================ 24 path coverage and the logical batch
// eng-e12-03: a candidate kernel restricted to local batch 4, calibration that can choose 1, 2 or
// 4, a startup self-test that can latch the path off; gradients [2,8,8] in microbatches of 1 and 2.
const pathScene = (() => {
  const calib = s("calib"),
    hookBad = eq(s("selftest"), "Hook drops saved values"),
    forced = s("forced"),
    n = s("steps"),
    bySize = eq(s("combine"), "Weight by size");
  const notFour = not(eq(calib, "4"));
  // Order matters for the cause: a forced control or a startup latch decides before calibration.
  const active = and(not(forced), not(hookBad), not(notFour));
  const ran = iff(forced, "reference (forced)", iff(hookBad, "upstream (latched)", iff(notFour, "grouped fallback", "candidate")));
  const reason = iff(forced, "forced control", iff(hookBad, "self-test failed", iff(notFour, cat("batch ", calib, " ≠ 4"), "none")));
  const hits = iff(active, n, 0);
  const path = card("pc-path", 190, ice, blue, "DISPATCH PATH", [
    text("pc-requested", "requested: candidate", 16, 62),
    text("pc-calib", cat("calibration: batch ", calib), 16, 90),
    text("pc-selftest", cat("self-test: ", iff(hookBad, "hook dropped", "intact")), 16, 118),
    bold("pc-ran", after(800, cat("ran: ", ran), "ran: …"), 16, 148, 18, blue),
    text("pc-reason", after(800, cat("disable: ", reason), "disable: …"), 16, 176, 17, muted),
  ]);
  const record = card("pc-record", 224, lilac, purple, "WHAT THE RUN RECORDED", [
    text("pc-steps", cat(n, " steps, exit code 0"), 16, 62),
    text("pc-fwd", after(1600, cat("forward hits ", hits), "forward hits …"), 16, 90),
    text("pc-bwd", after(1600, cat("backward hits ", hits), "backward hits …"), 16, 118),
    text("pc-finite", "outputs finite ✓", 16, 146),
    bold(
      "pc-coverage",
      after(
        2400,
        iff(
          active,
          "candidate ran: hits > 0",
          iff(forced, "reject: forced control", iff(hookBad, "reject: latched at start", cat("reject: batch ", calib, " fallback"))),
        ),
        "…",
      ),
      16,
      180,
      17,
      purple,
    ),
    text("pc-exit", "exit 0 is not coverage", 16, 208, 17, muted),
  ]);
  const combined = iff(bySize, div(add(mul(1, 2), mul(2, 8)), 3), div(add(2, 8), 2));
  const full = div(add(2, 8, 8), 3);
  const objOk = lt(abs(sub(combined, full)), 0.000000001);
  const batch = card("pc-batch", 236, sand, gold, "LOGICAL BATCH [2, 8, 8]", [
    text("pc-micro", "micro [2] and [8, 8]", 16, 62),
    text("pc-means", after(3200, "means 2 and 8", "means …"), 16, 90),
    text("pc-combined", after(3200, cat("combined: ", r3(combined)), "combined: …"), 16, 118),
    text("pc-full", cat("full batch mean: ", r3(full)), 16, 146),
    bold(
      "pc-objective",
      after(4000, iff(objOk, "matches full batch", cat("mean of means: ", r3(combined), " ≠ ", r3(full))), "…"),
      16,
      180,
      17,
      gold,
    ),
    bold(
      "pc-claim",
      after(4000, iff(not(active), "claim fails: path", iff(not(objOk), "claim fails: objective", "both gates pass")), "…"),
      16,
      212,
      17,
      gold,
    ),
  ]);
  return build({
    id: "concept-path-coverage",
    title: "Which path ran, and on what batch?",
    description:
      "A candidate kernel is requested, but calibration, a startup self-test or a forced control can route the work elsewhere while the process still exits cleanly. Read the resolved path and hit counts, then combine unequal microbatches and compare with the full logical batch.",
    state: {
      calib: choice("Calibrated local batch", ["4", "2", "1"]),
      selftest: choice("Startup self-test", ["Reference backward intact", "Hook drops saved values"]),
      forced: flag("Control: force reference"),
      steps: num("Training steps run", 3, 1, 4, 1),
      combine: choice("Microbatch combine", ["Weight by size", "Mean of means (bug)"]),
    },
    kicker: "24 / CALLED IS NOT TESTED",
    subtitle: "anonymized path rules",
    grid: [
      [path, 0],
      [record, 1],
      [batch, 2],
    ],
    compactOrder: [path, record, batch],
    durationMs: 4800,
    cues: [
      { atMs: 0, text: "The run requests the candidate path. It only supports local batch 4." },
      { atMs: 800, text: "Resolution order: a forced control, then a startup latch, then calibration decides which path actually runs." },
      { atMs: 1600, text: "Forward and backward hit counts show whether the candidate executed." },
      { atMs: 2400, text: "A clean exit and finite outputs say nothing about coverage. Name the reason the candidate did not run." },
      { atMs: 3200, text: "Gradients [2, 8, 8] in microbatches of sizes 1 and 2 have means 2 and 8." },
      { atMs: 4000, text: "Weighted by size they give 6, the full-batch mean; averaging the means gives 5." },
    ],
    accessible:
      "Path coverage and logical-batch arithmetic based on the lesson's anonymized rules. A candidate kernel supports only local batch 4. Calibration can choose 1, 2 or 4, and smaller batches take a grouped fallback. A startup self-test whose saved-tensor hook drops values that the reference backward needs latches the candidate off, and the upstream path runs. A deliberate control can force the reference path. In every case the process exits with code 0 and its outputs are finite, so neither shows that the candidate was tested. The scene resolves the path in that order, shows the forward and backward hit counts (equal to the steps run only when the candidate executes) and names the reason for a rejection: the forced control, the startup latch, or the calibrated batch. When the self-test fails, calibration is irrelevant and the verdict blames the latch. Separately, a logical batch with gradients [2, 8, 8] split into microbatches of sizes 1 and 2 has local means 2 and 8. Weighting each mean by its size gives (1·2 + 2·8)/3 = 6, the full-batch mean; averaging the two means gives 5. A claim of validation needs both gates: the candidate path must have run and the objective must match the full logical batch.",
  });
})();

// ---------------------------------------------------------------- assemble
const authored = [
  matmulScene,
  chainScene,
  accumulateScene,
  reluScene,
  maskScene,
  ropeScene,
  treeScene,
  budgetScene,
  offsetScene,
  batchScene,
  autodiffScene,
  residualScene,
  embeddingScene,
  loraScene,
  parallelScene,
  lseScene,
  tokenScene,
  loopScene,
  qkvScene,
  asyncScene,
  memoryScene,
  mergeScene,
  cacheScene,
  pathScene,
];
const depthOf = (e) =>
  e && typeof e === "object" && "op" in e ? 1 + Math.max(0, ...e.args.map(depthOf)) : 0;
const maxDepth = (value) =>
  !value || typeof value !== "object"
    ? 0
    : "op" in value
      ? depthOf(value)
      : Math.max(0, ...Object.values(value).map(maxDepth));
const tooDeep = [];
for (const scene of authored) {
  const report = (value, where) => {
    if (!value || typeof value !== "object") return;
    if ("op" in value) {
      if (depthOf(value) > 16) tooDeep.push(`${scene.id} ${where}: depth ${depthOf(value)}`);
      return;
    }
    for (const [k, v] of Object.entries(value)) report(v, `${where}.${value.id ?? k}`);
  };
  report(scene.nodes, "nodes");
  report(scene.layouts, "layouts");
}
if (tooDeep.length) throw new Error(`Expression depth exceeds 16:\n${tooDeep.join("\n")}`);
const scenes = authored.map((scene) => {
  try {
    return parseScene(scene);
  } catch (error) {
    throw new Error(`${scene.id}: ${error.message}`, { cause: error });
  }
});
const bindings = [
  ["concept-matmul-reduce", "fnd-e02-03", "fnd-02-03-text-2"],
  ["concept-chain-rule", "fnd-e03-02", "fnd-03-02-text-1"],
  ["concept-grad-accumulation", "fnd-e04-03", "fnd-04-03-text-2"],
  ["concept-relu-gate", "ttf-e05-01", "ttf-05-01-text-2"],
  ["concept-causal-mask", "ttf-e06-03", "ttf-06-03-text-2"],
  ["concept-rope-gqa", "ttf-e07-03", "ttf-07-03-text-2"],
  ["concept-tree-reduction", "sys-e09-01", "sys-09-01-text-1"],
  ["concept-transfer-budget", "eng-e14-03", "eng-14-03-lesson"],
  ["concept-tensor-offsets", "fnd-e02-01", "fnd-02-01-text-2"],
  ["concept-batch-mean", "fnd-e03-04", "fnd-03-04-text-1"],
  ["concept-autodiff-fanout", "fnd-e04-04", "fnd-04-04-text-2"],
  ["concept-residual-norm", "ttf-e05-02", "ttf-05-02-text-2"],
  ["concept-embedding-scatter", "ttf-e06-01", "ttf-06-01-text-2"],
  ["concept-lora-update", "ttf-e08-04", "ttf-08-04-text-2"],
  ["concept-parallel-split", "sys-e10-01", "sys-10-01-text-2"],
  ["concept-streaming-lse", "eng-e13-01", "eng-13-01-lesson"],
  ["concept-token-ids", "fnd-e01-03", "fnd-01-03-text-2"],
  ["concept-loop-states", "ttf-e05-04", "ttf-05-04-text-1"],
  ["concept-qkv-scores", "ttf-e07-01", "ttf-07-01-text-2"],
  ["concept-async-timer", "ttf-e08-02", "ttf-08-02-text-2"],
  ["concept-memory-budget", "sys-e09-04", "sys-09-04-text-2"],
  ["concept-outer-merge", "sys-e10-04", "sys-10-04-text-2"],
  ["concept-cache-queue", "sys-e11-03", "sys-11-03-text-2"],
  ["concept-path-coverage", "eng-e12-03", "eng-12-03-lesson"],
].map(([visualId, episodeId, afterBlockId]) => ({ visualId, episodeId, afterBlockId }));
assert.deepEqual(
  bindings.map((b) => b.visualId),
  scenes.map((s) => s.id),
);

// Bindings must target existing episodes/blocks, distinct episodes, and
// episodes that do not already carry an illustration from any earlier batch.
const root = new URL("../", import.meta.url);
const read = async (name) => JSON.parse(await readFile(new URL(name, root), "utf8"));
const modules = await Promise.all(
  ["foundations", "training-and-transformers", "systems-and-distribution", "engineering-practice"].map((n) =>
    read(`content/${n}.json`),
  ),
);
const existing = [
  ...(await read("content/visuals.json")).bindings,
  ...(await read("content/systems-visuals.json")).bindings,
  ...(await read("content/learning-visuals.json")).bindings,
];
const episodes = modules.flatMap((m) => m.chapters).flatMap((c) => c.episodes);
assert.equal(new Set(bindings.map((b) => b.episodeId)).size, bindings.length, "One illustration per episode");
for (const binding of bindings) {
  const episode = episodes.find((e) => e.id === binding.episodeId);
  assert(
    episode?.blocks.some((b) => b.id === binding.afterBlockId && b.type === "text"),
    `Missing existing episode/text block: ${binding.episodeId}/${binding.afterBlockId}`,
  );
  assert(!existing.some((b) => b.episodeId === binding.episodeId), `${binding.episodeId} already illustrated`);
  assert(!existing.some((b) => b.visualId === binding.visualId), `${binding.visualId} id collision`);
}

// Layout lint (headless, conservative 0.62·fontSize glyph advance): visible
// text stays inside its card and canvas and never overlaps other text, visible
// rects stay inside their card, for boundary states in both layouts and several
// timeline positions.
export function lintFrame(frame) {
  const problems = [],
    texts = [];
  const inside = (a, b, pad = 0) =>
    a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.width <= b.x + b.width + 0.5 && a.y + a.height <= b.y + b.height - pad + 0.5;
  const walk = (nodes, container) => {
    for (const n of nodes) {
      if (n.kind === "group") {
        const bg = n.children?.find((c) => c.id === `${n.id}-bg`);
        walk(n.children ?? [], bg ? bg.bounds : container);
      } else if (n.kind === "text" && n.visible && n.opacity > 0) {
        texts.push(n);
        if (!inside(n.bounds, container, 6)) problems.push(`${n.id} escapes its card: "${n.text}"`);
      } else if (["rect", "circle", "line"].includes(n.kind) && n.visible && n.opacity > 0 && !inside(n.bounds, container))
        problems.push(`${n.id} escapes its card`);
    }
  };
  walk(frame.nodes, { x: 0, y: 0, width: frame.width, height: frame.height });
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].bounds,
        b = texts[j].bounds;
      if (
        Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 2 &&
        Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 2
      )
        problems.push(`${texts[i].id} overlaps ${texts[j].id}`);
    }
  for (const n of texts) if (n.fontSize < 17) problems.push(`${n.id} font ${n.fontSize}`);
  return problems;
}
// Boundary states: every single-field extreme, plus pairwise extremes of the
// numeric fields (worst-case text widths usually need two fields at once).
function boundaryStates(scene) {
  const states = [{}];
  const entries = Object.entries(scene.state);
  const extremes = ([, field]) =>
    field.kind === "number" ? [field.min, field.max] : field.kind === "boolean" ? [true, false] : field.options;
  for (const entry of entries) for (const value of extremes(entry)) states.push({ [entry[0]]: value });
  for (let a = 0; a < entries.length; a++)
    for (let b = a + 1; b < entries.length; b++)
      for (const va of extremes(entries[a]))
        for (const vb of extremes(entries[b])) states.push({ [entries[a][0]]: va, [entries[b][0]]: vb });
  return states;
}
const lint = [];
for (const scene of scenes)
  for (const width of [320, 960])
    for (const state of boundaryStates(scene))
      for (const fraction of [0, 0.5, 1]) {
        const runtime = new VisualRuntime(scene, { viewportWidth: width });
        if (Object.keys(state).length) runtime.setState(state);
        const frame = runtime.seek(scene.timeline.durationMs * fraction);
        for (const problem of lintFrame(frame))
          if (!lint.some((l) => l.startsWith(`${scene.id}@${width}: ${problem}`)))
            lint.push(`${scene.id}@${width}: ${problem} [${JSON.stringify(state)} t=${frame.timeMs}]`);
        assert(flattenNodes(frame.nodes).length <= 400);
      }
if (lint.length) throw new Error(`Layout lint failed:\n${[...new Set(lint)].slice(0, 80).join("\n")}`);

// Same renderer identity convention as the systems and learning overlays.
const directory = path.dirname(fileURLToPath(entry)),
  manifest = JSON.parse(await readFile(path.join(directory, "../package.json"), "utf8"));
const files = [];
async function collect(relative = "") {
  for (const e of await readdir(path.join(directory, relative), { withFileTypes: true })) {
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
      "All twenty-four concept scenes state their arithmetic, show live readouts, and include complete text equivalents.",
  },
};
// The assembler accepts an overlay only if its renderer declaration matches the
// one already registered (apart from the text alternative).
for (const name of ["content/systems-visuals.json", "content/learning-visuals.json"]) {
  const registered = (await read(name)).extension;
  assert.deepEqual(
    { ...extension, accessibility: { ...extension.accessibility, textAlternative: "" } },
    { ...registered, accessibility: { ...registered.accessibility, textAlternative: "" } },
    `Renderer identity differs from ${name}; regenerate all overlays against one artifact`,
  );
}
const visuals = scenes.map(toVisualExperience);
assert.deepEqual(visuals.map(fromVisualExperience), scenes);
await writeFile(
  new URL("visuals/concept-scenes.json", root),
  JSON.stringify({ schemaVersion: 1, scenes, bindings }, null, 2) + "\n",
  { mode: 0o600 },
);
await writeFile(
  new URL("content/concept-visuals.json", root),
  JSON.stringify({ extension, visuals, bindings }, null, 2) + "\n",
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    scenes: scenes.map((s) => ({
      id: s.id,
      nodes: flattenNodes(new VisualRuntime(s).getSnapshot().frame.nodes).length,
      bytes: JSON.stringify(s).length,
      durationMs: s.timeline.durationMs,
      maxExpressionDepth: maxDepth(s),
    })),
    bindings,
    integrity: extension.integrity,
    consumption: process.env.COURSE_VISUALS_ARTIFACT ? "explicit-development-built-artifact" : "released-package",
  }),
);
