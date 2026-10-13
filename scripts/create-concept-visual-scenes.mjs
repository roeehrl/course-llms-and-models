// Private authoring only. Builds eight bounded concept scenes with the released
// @course-core/visuals package and writes exactly two files:
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
      "All eight concept scenes state their arithmetic, show live readouts, and include complete text equivalents.",
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
