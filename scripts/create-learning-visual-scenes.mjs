// Private authoring only. Builds nine bounded learning scenes with the released
// @course-core/visuals package and writes exactly two files:
//   visuals/learning-scenes.json and content/learning-visuals.json
// A development build may be selected only through an explicit file: URL to a
// built dist/headless.js (same convention as the systems scenes).
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
  and = (...v) => op("and", ...v),
  not = (v) => op("not", v),
  abs = (v) => op("abs", v),
  floor = (v) => op("floor", v),
  max = (...v) => op("max", ...v),
  min = (...v) => op("min", ...v);
const r3 = (value) => div(op("round", mul(value, 1000)), 1000);
const cat = (...v) => op("concat", ...v);
const progress = (start, duration) =>
  op("clamp", div(sub(t, start), duration), 0, 1);
const after = (ms, value, waiting) => iff(ge(t, ms), value, waiting);
const exp = (v) => op("pow", Math.E, v);

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
// x=16 in a 320-unit canvas. Card content is therefore never re-flowed, only
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
  // grid: [[card, col, row]] where rows stack per column.
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

// Balanced comparison tree for a value tabulated on a uniform state grid.
// Thresholds sit halfway between grid points, so float noise in the state
// cannot select a neighbouring entry.
function lookup(stateExpr, keys, values) {
  if (keys.length === 1) return values[0];
  const mid = Math.floor(keys.length / 2);
  return iff(
    lt(stateExpr, (keys[mid - 1] + keys[mid]) / 2),
    lookup(stateExpr, keys.slice(0, mid), values.slice(0, mid)),
    lookup(stateExpr, keys.slice(mid), values.slice(mid)),
  );
}

// ============================================================ 01 float order
// fnd-e02-04: the same three numbers, two parenthesizations, one rounding rule.
const floatScene = (() => {
  const F = s("fmt"),
    E = s("E"),
    b = s("b");
  const p = iff(eq(F, "FP32"), 23, iff(eq(F, "FP16"), 10, 7));
  const over = and(eq(F, "FP16"), ge(E, 16));
  const okay = not(over);
  // round-to-nearest, ties-to-even on an integer grid index q
  const rne = (q) => {
    const f = floor(q),
      fr = sub(q, f);
    return iff(
      gt(fr, 0.5),
      add(f, 1),
      iff(lt(fr, 0.5), f, add(f, op("mod", f, 2))),
    );
  };
  // 2^(E − shift − p) with the format branch outside the power keeps the
  // expression within the released depth bound.
  const pow2 = (exponent, shift) =>
    iff(
      eq(F, "FP32"),
      op("pow", 2, sub(exponent, 23 + shift)),
      iff(eq(F, "FP16"), op("pow", 2, sub(exponent, 10 + shift)), op("pow", 2, sub(exponent, 7 + shift))),
    );
  // a+b lives in binade E (spacing 2^(E-p)); |b+c| = a-b lives in binade E-1.
  const sides = [
    { key: "left", spacing: pow2(E, 0), anim: 1400 },
    { key: "right", spacing: pow2(E, 1), anim: 3400 },
  ].map((side) => {
    const q = div(b, side.spacing);
    return {
      ...side,
      q,
      lower: mul(floor(q), side.spacing),
      upper: mul(add(floor(q), 1), side.spacing),
      result: mul(rne(q), side.spacing),
      exactX: add(24, mul(240, sub(q, floor(q)))),
      roundX: add(24, mul(240, sub(rne(q), floor(q)))),
    };
  });
  const [L, R] = sides;
  const operands = card("fo-ops", 226, ice, blue, "OPERANDS", [
    bold("fo-a", cat("a = 2^", E), 16, 66, 20, blue),
    text("fo-b", cat("b = ", b), 16, 96),
    text("fo-c", cat("c = −2^", E), 16, 124),
    text("fo-format", cat(F, " · ", p, " fraction bits"), 16, 152),
    text("fo-spacing", cat("spacing at a: 2^", sub(E, p)), 16, 180),
    text(
      "fo-range",
      iff(over, "a overflows FP16: inf", "a is representable"),
      16,
      204,
      17,
      muted,
    ),
  ]);
  const snapCard = (side, title, sign, firstMs, roundMs, resultMs, label) =>
    card(`fo-${side.key}`, 214, side.key === "left" ? mint : lilac, side.key === "left" ? teal : purple, title, [
      text(
        `fo-${side.key}-exact`,
        after(firstMs, iff(okay, cat(`exact: ${sign}`, b), "exact: inf"), "exact: …"),
        16,
        62,
      ),
      rect(`fo-${side.key}-track`, 24, 82, 240, 4, line, 2),
      rect(`fo-${side.key}-low`, 22, 74, 4, 20, muted, 1),
      rect(`fo-${side.key}-high`, 262, 74, 4, 20, muted, 1),
      {
        ...circle(`fo-${side.key}-exactdot`, side.exactX, 84, 7, white),
        stroke: muted,
        strokeWidth: 2,
        opacity: iff(and(ge(t, firstMs), okay), 1, 0),
      },
      {
        ...circle(
          `fo-${side.key}-marker`,
          op("lerp", side.exactX, side.roundX, progress(side.anim, 800)),
          84,
          8,
          side.key === "left" ? teal : purple,
        ),
        opacity: iff(and(ge(t, firstMs), okay), 1, 0),
      },
      text(
        `fo-${side.key}-grid`,
        after(
          firstMs,
          iff(okay, cat(`grid: ${sign}`, r3(side.lower), `, ${sign}`, r3(side.upper)), "grid: none"),
          "grid: …",
        ),
        16,
        126,
      ),
      text(
        `fo-${side.key}-round`,
        after(roundMs, iff(okay, cat(`stored: ${sign}`, side.result), "stored: inf"), "stored: …"),
        16,
        154,
      ),
      bold(
        `fo-${side.key}-result`,
        after(resultMs, iff(okay, cat(label, side.result), cat(label, "NaN")), cat(label, "…")),
        16,
        194,
        20,
        side.key === "left" ? teal : purple,
      ),
    ]);
  const left = snapCard(L, "(a + b) + c", "a+", 800, 2200, 2600, "(a+b)+c = ");
  const right = snapCard(R, "a + (b + c)", "−a+", 3000, 4200, 4400, "a+(b+c) = ");
  const rule = card("fo-rule", 150, sand, gold, "ROUNDING RULE", [
    text("fo-rule-1", "Store the nearest value;", 16, 64),
    text("fo-rule-2", "an exact tie goes to", 16, 92),
    text("fo-rule-3", "the even neighbour.", 16, 120),
  ]);
  const verdictText = iff(
    over,
    "NaN: finiteness fails",
    iff(
      and(eq(L.result, R.result), eq(L.result, b)),
      "Both orders exact",
      iff(eq(L.result, R.result), "Agree, both lost b", "Order changed answer"),
    ),
  );
  const verdict = card("fo-verdict", 150, rose, red, "VERDICT", [
    text("fo-truth", cat("exact answer = ", b), 16, 64),
    bold("fo-verdict-text", after(4600, verdictText, "…"), 16, 98, 18, red),
    text("fo-verdict-note", "Compare with exact b.", 16, 132, 17, muted),
  ]);
  return build({
    id: "learning-float-order",
    title: "Same three numbers. Two answers.",
    description:
      "Choose a format, the size of a = 2^E and a small b. Add a + b − a in two orders and watch each exact sum snap to a representable neighbour.",
    state: {
      fmt: choice("Number format", ["FP32", "FP16", "BF16"]),
      E: num("Exponent E of a", 24, 4, 24, 1),
      b: num("Small addend b", 1, 1, 4, 1),
    },
    kicker: "01 / ORDER CHANGES ROUNDING",
    subtitle: "a = 2^E, c = −a",
    grid: [
      [operands, 0],
      [rule, 0],
      [left, 1],
      [verdict, 1],
      [right, 2],
    ],
    compactOrder: [operands, left, right, rule, verdict],
    durationMs: 5000,
    cues: [
      { atMs: 0, text: "Predict both results first. The exact answer of either order is b." },
      { atMs: 800, text: "a + b: the exact sum lies between two stored neighbours spaced 2^(E−p) apart." },
      { atMs: 1400, text: "Round to the nearest neighbour. An exact tie goes to the even neighbour." },
      { atMs: 2600, text: "Subtracting a is exact here, so whatever b lost is gone for good." },
      { atMs: 3000, text: "Now b + c first. Its magnitude sits just below a, where the spacing is half as large." },
      { atMs: 4400, text: "Adding a back is exact. Compare both orders with b." },
      { atMs: 4600, text: "Agreement between orders is not correctness: both can lose b." },
    ],
    accessible:
      "A number line study of floating-point addition order. a = 2^E, c = −a, b is 1 to 4, all stored in FP32 (23 fraction bits), FP16 (10) or BF16 (7). Near a the spacing is 2^(E−p); just below a it is 2^(E−1−p). (a+b) rounds to the nearest multiple of 2^(E−p) with ties to even, then subtracting a is exact. b+c rounds on the finer grid, then adding a is exact. FP32 with E=24, b=1 gives (a+b)+c = 0 and a+(b+c) = 1. BF16 with E=24 loses b in both orders: they agree and are both wrong. In FP16, 2^16 and above overflow to infinity and both results are NaN. All values are exact binary rounding of these scalars, not a model of a device's fused or reordered reductions.",
  });
})();

// ============================================================ 02 fan-out backward
// fnd-e04-02: s = w·w, z = s + w. Contributions add; backward never edits w.
const fanoutScene = (() => {
  const w = s("w"),
    rule = s("rule"),
    rate = s("rate");
  const over = eq(rule, "Overwrite (=)"),
    one = eq(rule, "One slot only");
  // Running buffer bar(w) after each backward event.
  const afterAdd = 1,
    afterA = iff(over, w, add(1, w)),
    afterB = iff(over, w, iff(one, add(1, w), add(1, mul(2, w))));
  const grad = iff(
    ge(t, 4300),
    afterB,
    iff(ge(t, 3300), afterA, iff(ge(t, 2300), afterAdd, 0)),
  );
  const finalGrad = afterB;
  const forward = card("fa-forward", 214, ice, blue, "FORWARD", [
    bold("fa-w", cat("w = ", r3(w)), 16, 66, 20, blue),
    text("fa-s", after(500, cat("s = w·w = ", r3(mul(w, w))), "s = …"), 16, 100),
    text("fa-z", after(1000, cat("z = s + w = ", r3(add(mul(w, w), w))), "z = …"), 16, 130),
    text("fa-loss-note", "z is the scalar loss.", 16, 166, 17, muted),
    text("fa-share-note", "w feeds both factors.", 16, 194, 17, muted),
    handle("fa-w-handle", 0, 40, CW, 36, "Drag or use arrows to change w", { x: { state: "w", from: 16, to: 272 } }),
  ]);
  const ledger = card("fa-ledger", 334, lilac, purple, "GRADIENT BUFFER bar(w)", [
    text("fa-seed", after(1500, "seed bar(z) = 1", "seed bar(z) = …"), 16, 64),
    text("fa-sbar", after(2300, "bar(s) = bar(z)·1 = 1", "bar(s) = …"), 16, 94),
    text("fa-path", after(2300, iff(over, "add path: bar(w) = 1", "add path: bar(w) += 1"), "add path: …"), 16, 124),
    text(
      "fa-slot-a",
      after(3300, cat(iff(over, "slot A: bar(w) = ", "slot A: bar(w) += "), r3(w)), "slot A: …"),
      16,
      154,
    ),
    text(
      "fa-slot-b",
      after(
        4300,
        iff(one, "slot B: skipped", cat(iff(over, "slot B: bar(w) = ", "slot B: bar(w) += "), r3(w))),
        "slot B: …",
      ),
      16,
      184,
    ),
    bold("fa-grad", cat("bar(w) = ", r3(grad)), 16, 226, 22, purple),
    rect("fa-grad-track", 16, 246, 256, 14, white, 7),
    rect("fa-grad-bar", 16, 246, mul(12, abs(grad)), 14, purple, 7),
    text("fa-grad-scale", "bar: 12 units per 1.0", 16, 290, 17, muted),
    text("fa-rule", cat("rule: ", rule), 16, 318, 17, muted),
  ]);
  const check = card("fa-check", 254, sand, gold, "CHECK, THEN UPDATE", [
    text("fa-symbolic", cat("2w + 1 = ", r3(add(mul(2, w), 1))), 16, 66),
    bold(
      "fa-verdict",
      after(4300, iff(eq(finalGrad, add(mul(2, w), 1)), "bar(w) equals 2w+1", "bar(w) differs: bug"), "…"),
      16,
      100,
      18,
      gold,
    ),
    text(
      "fa-stored",
      cat("stored w = ", r3(iff(ge(t, 5200), sub(w, mul(rate, finalGrad)), w))),
      16,
      144,
    ),
    text("fa-updates", cat("updates applied: ", iff(ge(t, 5200), 1, 0)), 16, 174),
    text("fa-rate", cat("rate η = ", r3(rate)), 16, 204),
    text("fa-note", "Backward never edits w.", 16, 234, 17, muted),
  ]);
  return build({
    id: "learning-fanout-backward",
    title: "One weight. Two paths. Add both.",
    description:
      "w is used twice in s = w·w and once more in z = s + w. Step through backward and compare correct accumulation with two buggy rules. The stored weight changes only at the separate update.",
    state: {
      w: num("Weight w", 3, -3, 3, 0.5),
      rule: choice("Gradient rule", ["Accumulate (+=)", "Overwrite (=)", "One slot only"]),
      rate: num("Learning rate η", 0.1, 0, 0.2, 0.05),
    },
    kicker: "02 / FAN-OUT ACCUMULATES",
    subtitle: "s = w·w, z = s + w",
    grid: [
      [forward, 0],
      [ledger, 1],
      [check, 2],
    ],
    compactOrder: [forward, ledger, check],
    durationMs: 6000,
    cues: [
      { atMs: 0, text: "Forward: compute s = w·w, then z = s + w. The gradient buffer starts at zero." },
      { atMs: 1500, text: "Seed the scalar loss with bar(z) = 1." },
      { atMs: 2300, text: "Addition passes bar(z) to both inputs: bar(s) = 1 and a direct contribution of 1 to bar(w)." },
      { atMs: 3300, text: "Multiplication: slot A receives bar(s) times the other factor, w. Add it." },
      { atMs: 4300, text: "Slot B is the same w. Add its contribution too. Compare bar(w) with 2w + 1." },
      { atMs: 5200, text: "Only now does the optimizer write w ← w − η·bar(w). Backward left w unchanged." },
    ],
    accessible:
      "Reverse-mode trace for s = w·w and z = s + w with z as the loss. Seed bar(z) = 1. The addition gives bar(s) = 1 and adds 1 to bar(w). The multiplication adds bar(s)·w for each of its two operand slots, both of which are w, so bar(w) = 1 + w + w = 2w + 1 (7 at w = 3). An overwrite rule keeps only the last contribution (3 at w = 3); updating only one slot gives 1 + w (4 at w = 3). A single value of w can coincide with 2w+1 by accident (w = −1 for overwrite, w = 0 for one slot), so test more than one w. The stored weight stays at w throughout forward and backward and changes once, at 5.2 seconds, to w − η·bar(w).",
  });
})();

// ============================================================ 03 optimizer state
// ttf-e05-03: two steps of SGD / momentum / AdamW, plus a bytes-per-parameter ledger.
const optimizerScene = (() => {
  const O = s("optimizer"),
    g2 = s("g2"),
    N = s("params"),
    drop = s("dropState"),
    dtype = s("weights");
  const sgd = eq(O, "SGD"),
    mom = eq(O, "Momentum");
  const eps = 1e-8;
  // step 1, g1 = 2, w0 = 1, η = 0.1, μ = 0.9, β = (0.9, 0.99), λ = 0.1
  const adamW1 = sub(0.99, div(0.2, add(op("sqrt", 4), eps)));
  const w1 = iff(sgd, 0.8, iff(mom, 0.8, adamW1));
  const m2mom = add(iff(drop, 0, 1.8), g2);
  const m2 = add(iff(drop, 0, 0.18), mul(0.1, g2));
  const v2 = add(iff(drop, 0, 0.0396), mul(0.01, g2, g2));
  const mhat = div(m2, iff(drop, 0.1, 0.19));
  const vhat = div(v2, iff(drop, 0.01, 0.0199));
  const adamW2 = sub(mul(0.99, adamW1), div(mul(0.1, mhat), add(op("sqrt", vhat), eps)));
  const w2 = iff(sgd, sub(0.8, mul(0.1, g2)), iff(mom, sub(0.8, mul(0.1, m2mom)), adamW2));
  const trace = card("op-trace", 334, ice, blue, "TWO STEPS FROM w = 1", [
    text("op-g1", "step 1: g = 2", 16, 64),
    text(
      "op-state1",
      after(1200, iff(sgd, "state: none", iff(mom, "m = 2", "m = 0.2, v = 0.04")), "state: …"),
      16,
      92,
    ),
    bold("op-w1", after(1200, cat("w1 = ", r3(w1)), "w1 = …"), 16, 128, 20, blue),
    text(
      "op-carry",
      after(2600, iff(sgd, "nothing to carry", iff(drop, "state dropped (bug)", "state carried")), "carry: …"),
      16,
      162,
    ),
    text("op-g2", cat("step 2: g = ", g2), 16, 190),
    text(
      "op-m2",
      after(3200, iff(sgd, "state: none", cat("m = ", r3(iff(mom, m2mom, m2)))), "m = …"),
      16,
      218,
    ),
    text(
      "op-v2",
      after(3200, iff(sgd, "no moments", iff(mom, "no v buffer", cat("v = ", r3(v2)))), "v = …"),
      16,
      246,
    ),
    text(
      "op-t",
      after(3200, iff(eq(O, "AdamW"), cat("step count t = ", iff(drop, 1, 2)), "no step count"), "t = …"),
      16,
      274,
    ),
    bold("op-w2", after(3200, cat("w2 = ", r3(w2)), "w2 = …"), 16, 312, 20, blue),
  ]);
  const k = iff(sgd, 0, iff(mom, 1, 2)),
    wb = iff(eq(dtype, "FP32 weights"), 4, 2);
  const weightBytes = mul(N, wb),
    stateBytes = mul(N, k, 4),
    total = add(weightBytes, weightBytes, stateBytes);
  const scale = 1.25; // 12 params × 16 B = 192 B → 240 units
  const ledger = card("op-ledger", 264, mint, teal, "MEMORY LEDGER", [
    text("op-n", cat("N = ", N, " parameters"), 16, 64),
    text("op-weights", cat("weights: ", weightBytes, " B"), 16, 92),
    text("op-grads", cat("gradients: ", weightBytes, " B"), 16, 120),
    text("op-state", cat("optimizer: ", stateBytes, " B"), 16, 148),
    rect("op-bar-track", 16, 162, 240, 18, white, 4),
    rect("op-bar-w", 16, 162, mul(scale, weightBytes), 18, teal, 0),
    rect("op-bar-g", add(16, mul(scale, weightBytes)), 162, mul(scale, weightBytes), 18, blue, 0),
    rect("op-bar-s", add(16, mul(scale, 2, weightBytes)), 162, mul(scale, stateBytes), 18, purple, 0),
    bold("op-total", cat("total = ", total, " B"), 16, 214, 20, teal),
    text("op-per", cat("per parameter: ", div(total, N), " B"), 16, 244),
  ]);
  const rules = card("op-rules", 224, sand, gold, "CONVENTIONS", [
    text("op-rule-1", "SGD: w ← w − 0.1·g", 16, 64),
    text("op-rule-2", "Mom: m ← 0.9·m + g", 16, 92),
    text("op-rule-3", "AdamW: β 0.9 / 0.99,", 16, 120),
    text("op-rule-4", "decay 0.1, ε 1e-8.", 16, 148),
    text("op-rule-5", "Moments are FP32;", 16, 176),
    text("op-rule-6", "gradients match weights.", 16, 202),
    handle("op-pick-sgd", 0, 44, CW, 28, "Choose SGD", { activate: { state: "optimizer", value: "SGD" } }),
    handle("op-pick-momentum", 0, 72, CW, 28, "Choose momentum", { activate: { state: "optimizer", value: "Momentum" } }),
    handle("op-pick-adamw", 0, 100, CW, 56, "Choose AdamW", { activate: { state: "optimizer", value: "AdamW" } }),
  ]);
  return build({
    id: "learning-optimizer-state",
    title: "Same gradient. Different memory.",
    description:
      "Run two optimizer steps from w = 1 with gradients 2 and then g. Switch optimizer, drop the state between steps, and count bytes for weights, gradients and moments.",
    state: {
      optimizer: choice("Optimizer", ["SGD", "Momentum", "AdamW"], "Momentum"),
      g2: num("Second gradient g", -1, -2, 2, 0.5),
      dropState: flag("Drop state after step 1 (bug)"),
      params: num("Parameter count N", 6, 1, 12, 1),
      weights: choice("Weight storage", ["FP32 weights", "BF16 weights"]),
    },
    kicker: "03 / STATE IS ALGORITHM",
    subtitle: "η = 0.1, first gradient 2",
    grid: [
      [trace, 0],
      [ledger, 1],
      [rules, 2],
    ],
    compactOrder: [trace, ledger, rules],
    durationMs: 4500,
    cues: [
      { atMs: 0, text: "Start at w = 1 with empty optimizer state. Predict w after each step." },
      { atMs: 1200, text: "Step 1 with g = 2. Momentum stores m = 2; AdamW stores m = 0.2, v = 0.04 and t = 1." },
      { atMs: 2600, text: "Between steps the state must be carried. Dropping it changes momentum and AdamW, never SGD." },
      { atMs: 3200, text: "Step 2 with the chosen g. Compare w2 across optimizers and with dropped state." },
      { atMs: 4000, text: "The ledger counts payload bytes only: no activations, temporaries or counters." },
    ],
    accessible:
      "Two optimizer steps from w = 1 with η = 0.1, first gradient 2 and second gradient g. SGD: w ← w − 0.1·g, so w1 = 0.8 and w2 = 0.8 − 0.1g. Momentum (μ = 0.9, no dampening): m1 = 2, w1 = 0.8, m2 = 1.8 + g, w2 = 0.8 − 0.1·m2; at g = −1, w2 = 0.72, and dropping the state gives 0.9. AdamW (β1 0.9, β2 0.99, decoupled decay 0.1, ε 1e-8) gives w1 ≈ 0.89; step 2 uses bias corrections 1 − 0.9² and 1 − 0.99² unless the state was dropped, in which case it restarts at t = 1. The ledger counts N·(2·weight bytes + 4·k) where k is 0, 1 or 2 FP32 moment buffers and gradients use the weight dtype: six FP32 parameters under AdamW take 96 bytes; BF16 weights and gradients make that 72, not 48. Payload only; no activations, counters, workspaces or master copies.",
  });
})();

// ============================================================ 04 softmax + cross-entropy
// ttf-e06-02: three logits, a hard target, stable log-sum-exp and p − onehot.
const softmaxScene = (() => {
  const step = Math.LN2 / 4;
  const grid = Array.from({ length: 29 }, (_, i) => (i - 12) * step);
  // The released expression language has no logarithm. The log-sum-exp value
  // ln(e^z0 + 2) is tabulated at the 29 reachable z0 grid points; everything
  // else (exponentials, probabilities, gradient, argmax) is evaluated live.
  const lse = lookup(
    s("z0"),
    grid,
    grid.map((z) => Math.log(Math.exp(z) + 2)),
  );
  const z0 = s("z0"),
    shift = s("shift"),
    target = s("target");
  const zs = [z0, 0, 0];
  const m = max(z0, 0);
  const e = zs.map((z) => exp(sub(z, m)));
  const sum = add(...e);
  const p = e.map((v) => div(v, sum));
  const tIndex = iff(eq(target, "ID 0"), 0, iff(eq(target, "ID 1"), 1, 2));
  const grad = p.map((v, i) => sub(v, iff(eq(tIndex, i), 1, 0)));
  const loss = sub(lse, iff(eq(tIndex, 0), z0, 0));
  const greedy = iff(gt(z0, 0), 0, iff(lt(z0, 0), 1, 0)); // ties → lowest ID
  const logits = card("ce-logits", 254, ice, blue, "LOGITS z + shift", [
    ...zs.map((z, i) => text(`ce-z-${i}`, cat(`ID ${i}: z = `, r3(add(z, shift))), 16, 62 + 28 * i)),
    ...zs.map((_, i) =>
      handle(`ce-pick-${i}`, 0, 44 + 28 * i, CW, 28, `Make ID ${i} the target`, {
        activate: { state: "target", value: `ID ${i}` },
      }),
    ),
    text("ce-max", after(800, "subtract max m", "subtract max …"), 16, 150, 17, muted),
    ...zs.map((z, i) =>
      text(`ce-c-${i}`, after(800, cat(`ID ${i}: z − m = `, r3(sub(z, m))), "…"), 16, 178 + 28 * i),
    ),
  ]);
  const reveal = progress(1600, 1000);
  const soft = card("ce-soft", 254, mint, teal, "SOFTMAX", [
    ...p.flatMap((v, i) => [
      text(`ce-p-${i}`, after(1600, cat(`p${i} = `, r3(v)), `p${i} = …`), 16, 62 + 56 * i),
      rect(`ce-p-track-${i}`, 16, 72 + 56 * i, 256, 12, white, 6),
      rect(`ce-p-bar-${i}`, 16, 72 + 56 * i, mul(256, v, reveal), 12, teal, 6),
    ]),
    text("ce-sum", after(1600, cat("Σ p = ", r3(add(...p))), "Σ p = …"), 16, 226),
  ]);
  const lossCard = card("ce-loss", 314, lilac, purple, "TARGET, LOSS, GRADIENT", [
    text("ce-target", cat("target = ", target), 16, 62),
    bold("ce-value", after(2800, cat("loss = ", r3(loss)), "loss = …"), 16, 96, 20, purple),
    text(
      "ce-acc",
      after(2800, cat("greedy ID ", greedy, iff(eq(greedy, tIndex), ": hit", ": miss")), "greedy: …"),
      16,
      126,
    ),
    ...grad.flatMap((g, i) => [
      text(`ce-g-${i}`, after(3400, cat(`∂/∂z${i} = `, r3(g)), `∂/∂z${i} = …`), 16, 160 + 44 * i),
      rect(`ce-g-axis-${i}`, 143, 166 + 44 * i, 2, 14, muted, 0),
      rect(
        `ce-g-bar-${i}`,
        add(144, mul(100, min(0, g))),
        168 + 44 * i,
        mul(100, abs(g), progress(3400, 400)),
        10,
        purple,
        3,
      ),
    ]),
    text("ce-gsum", after(3400, cat("Σ ∂ = ", r3(add(...grad))), "Σ ∂ = …"), 16, 298),
  ]);
  return build({
    id: "learning-softmax-cross-entropy",
    title: "Scores in. One target's surprise out.",
    description:
      "Move the first logit, pick the target ID and add a common shift. Watch subtract-max softmax, the cross-entropy in nats and the logit gradient p − onehot.",
    state: {
      z0: num("First logit z0", Math.LN2, -12 * step, 16 * step, step),
      target: choice("Target token", ["ID 0", "ID 1", "ID 2"], "ID 1"),
      shift: num("Common shift", 0, 0, 1000, 100),
    },
    kicker: "04 / LOGITS, LOSS, GRADIENT",
    subtitle: "z = [z0, 0, 0] + shift",
    grid: [
      [logits, 0],
      [soft, 1],
      [lossCard, 2],
    ],
    compactOrder: [logits, soft, lossCard],
    durationMs: 4000,
    cues: [
      { atMs: 0, text: "Logits are unconstrained scores. The default z0 = ln 2 reproduces the lesson's example." },
      { atMs: 800, text: "Subtract the maximum logit. A common shift cancels here, so +1000 cannot overflow." },
      { atMs: 1600, text: "Exponentiate and normalize. The bars reveal fixed probabilities that sum to one." },
      { atMs: 2800, text: "Loss = log-sum-exp − z_target, in nats. Greedy accuracy is a separate question." },
      { atMs: 3400, text: "The gradient is p − onehot(target). Its entries sum to zero." },
    ],
    accessible:
      "Logits z = [z0, 0, 0] plus a common shift. Subtracting the maximum m = max(z0, 0) before exponentiating keeps the computation finite for any shift and does not change p. p_i = exp(z_i − m) / Σ_j exp(z_j − m). The hard-target cross-entropy is ln(e^z0 + 2) − z_target, in nats, independent of the shift. At z0 = ln 2 with target ID 1, p = [0.5, 0.25, 0.25], the loss is ln 4 ≈ 1.386 and greedy picks ID 0, so accuracy is zero while the loss is finite. The gradient with respect to the logits is p − onehot(target): [0.5, −0.75, 0.25] here, summing to zero. Greedy ties go to the lowest ID. z0 moves in steps of ln2/4; the log-sum-exp value is tabulated at those points because the visual expression language has no logarithm, and every other quantity is evaluated live.",
  });
})();

// ============================================================ 05 KV cache
// ttf-e06-04: dense cache bytes = 2·L·B·T·Hkv·D·b; decode reads the whole prefix.
const kvScene = (() => {
  const L = s("layers"),
    B = s("batch"),
    H = s("kvHeads"),
    D = s("headDim"),
    b = s("bytes"),
    P = s("prompt"),
    Q = s("queryHeads");
  const n = op("clamp", floor(div(t, 1000)), 0, 8);
  const T = add(P, n);
  const perToken = mul(2, L, B, H, D, b);
  const bytes = mul(perToken, T);
  const shape = card("kv-shape", 248, ice, blue, "CACHE SHAPE", [
    text("kv-l", cat("layers L = ", L), 16, 62),
    text("kv-b", cat("batch B = ", B), 16, 90),
    text("kv-h", cat("KV heads = ", H), 16, 118),
    text("kv-d", cat("head width D = ", D), 16, 146),
    text("kv-e", cat("bytes per value = ", b), 16, 174),
    text("kv-q", cat("query heads ", Q, ": unused"), 16, 206, 17, muted),
  ]);
  const slots = Array.from({ length: 16 }, (_, j) => {
    const x = 16 + (j % 8) * 32,
      y = 48 + Math.floor(j / 8) * 32;
    return [
      rect(`kv-slot-${j}`, x, y, 28, 28, white, 5),
      { ...rect(`kv-prompt-${j}`, x, y, 28, 28, teal, 5), opacity: iff(lt(j, P), 1, 0) },
      { ...rect(`kv-new-${j}`, x, y, 28, 28, purple, 5), opacity: iff(and(ge(j, P), lt(j, T)), 1, 0) },
    ];
  }).flat();
  const tokens = card("kv-tokens", 248, mint, teal, "TOKENS IN THE CACHE", [
    ...slots,
    text("kv-phase", iff(eq(n, 0), "prefill: prompt only", cat("decode step ", n)), 16, 140),
    bold("kv-t", cat("cached T = ", T), 16, 172, 20, teal),
    text(
      "kv-reads",
      iff(eq(n, 0), cat("prefill pairs = ", div(mul(P, add(P, 1)), 2)), cat("new query reads ", T)),
      16,
      202,
    ),
    text("kv-per", "per head, per layer", 16, 226, 17, muted),
  ]);
  const cost = card("kv-cost", 248, lilac, purple, "PAYLOAD BYTES", [
    bold("kv-bytes", cat("cache = ", bytes, " B"), 16, 66, 20, purple),
    text("kv-formula", "2·L·B·T·Hkv·D·bytes", 16, 96, 17, muted),
    text("kv-pertoken", cat("per token: ", perToken, " B"), 16, 126),
    rect("kv-bar-track", 16, 142, 256, 16, white, 4),
    rect("kv-bar", 16, 142, div(mul(256, bytes), mul(perToken, add(P, 8))), 16, purple, 4),
    text("kv-bar-scale", "full bar: after 8 decodes", 16, 184, 17, muted),
    text("kv-excludes", "No weights or temps.", 16, 212, 17, muted),
  ]);
  return build({
    id: "learning-kv-cache",
    title: "The prefix grows. So does the cache.",
    description:
      "Set the model and batch shape, then scrub eight decode steps. Each token adds keys and values at every layer; each new query still reads the whole cached prefix.",
    state: {
      layers: num("Layers L", 3, 1, 4, 1),
      batch: num("Batch B", 2, 1, 4, 1),
      kvHeads: num("KV heads", 2, 1, 4, 1),
      headDim: num("Head width D", 4, 4, 16, 4),
      bytes: num("Bytes per value", 2, 2, 4, 2),
      prompt: num("Prompt tokens", 5, 1, 8, 1),
      queryHeads: num("Query heads", 4, 1, 8, 1),
    },
    kicker: "05 / CACHE GROWS PER TOKEN",
    subtitle: "Prefill, then 8 decodes",
    grid: [
      [shape, 0],
      [tokens, 1],
      [cost, 2],
    ],
    compactOrder: [shape, tokens, cost],
    durationMs: 8500,
    cues: [
      { atMs: 0, text: "Prefill stores keys and values for every prompt token. Causal prompt scores grow quadratically." },
      { atMs: 1000, text: "Decode step 1 appends one token. Its query compares with every cached position." },
      { atMs: 4000, text: "Each step adds the same number of bytes: the cache grows linearly with tokens." },
      { atMs: 8000, text: "Eight decodes later the per-step attention work is larger than at the start; the cache did not make it constant." },
    ],
    accessible:
      "Dense key/value cache payload = 2 × layers × batch × cached tokens × KV heads × head width × bytes per value, where 2 counts keys and values. Query heads do not enter the formula when they differ from KV heads. Defaults: 3 layers, batch 2, 5 prompt tokens, 2 KV heads, width 4, 2 bytes: 960 bytes after prefill and 192 more bytes per decoded token. Prefill of P prompt tokens computes P(P+1)/2 causal score pairs per head and layer; decode step n has P + n cached tokens and its new query reads all of them. Payload only: no weights, allocator overhead or attention workspace.",
  });
})();

// ============================================================ 06 lazy evaluation
// ttf-e08-03: L = mean((w·x − y)²)/2 with x = [1,2], y = [2,4]. Built ≠ computed.
const lazyScene = (() => {
  const w = s("w"),
    lr = s("lr"),
    mode = s("eval");
  const none = eq(mode, "Stop after build"),
    full = eq(mode, "eval(loss, grad, w_new)");
  const lossDone = and(not(none), ge(t, 2800)),
    allDone = and(full, ge(t, 2800));
  const r0 = sub(w, 2),
    r1 = sub(mul(2, w), 4);
  const loss = mul(1.25, r0, r0),
    grad = mul(2.5, r0),
    wNew = sub(w, mul(lr, grad)),
    nextLoss = mul(1.25, sub(wNew, 2), sub(wNew, 2));
  const status = (built, done, value, label) =>
    iff(lt(t, built), `${label}: not built`, iff(done, value, `${label}: pending`));
  const graph = card("lz-graph", 254, ice, blue, "GRAPH (x=[1,2], y=[2,4])", [
    bold("lz-w", cat("w = ", r3(w)), 16, 64, 20, blue),
    text("lz-r", status(400, lossDone, cat("r = [", r3(r0), ", ", r3(r1), "]"), "r"), 16, 96),
    text("lz-loss", status(800, lossDone, cat("L = ", r3(loss)), "L"), 16, 124),
    text("lz-grad", status(1200, allDone, cat("g = ", r3(grad)), "g"), 16, 152),
    text("lz-wnew", status(1600, allDone, cat("w_new = ", r3(wNew)), "w_new"), 16, 180),
    text("lz-call", "requested:", 16, 214, 17, muted),
    text("lz-mode", mode, 16, 240, 17, muted),
  ]);
  // Invented costs (ms): build 0.4, r 0.6, L 0.5, g 1.5, update 0.3.
  const timed = iff(none, 0.4, iff(full, 3.3, 1.5));
  const timer = card("lz-timer", 254, sand, gold, "TIMER · INVENTED ms", [
    text("lz-build", "build graph: 0.4", 16, 64),
    text("lz-costs", "r 0.6, L 0.5,", 16, 92),
    text("lz-costs-2", "g 1.5, update 0.3", 16, 120),
    bold("lz-timed", after(3200, cat("timed = ", r3(timed)), "timed = …"), 16, 162, 20, gold),
    text("lz-work", after(3200, cat("of 3.3 needed: ", r3(timed)), "of 3.3 needed: …"), 16, 194),
    text("lz-stop", iff(none, "stops before eval", "stops after eval"), 16, 226, 17, muted),
  ]);
  const next = card("lz-next", 254, mint, teal, "NEXT ITERATION", [
    text("lz-needs", "needs w_new", 16, 64),
    bold(
      "lz-ready",
      after(4200, iff(allDone, "ready", "not ready"), "…"),
      16,
      98,
      20,
      teal,
    ),
    text(
      "lz-next-loss",
      after(4200, iff(allDone, cat("next L = ", r3(nextLoss)), "next L: unknown"), "next L = …"),
      16,
      132,
    ),
    text("lz-rate", cat("rate η = ", r3(lr)), 16, 166),
    text("lz-note-1", "Old L uses old w; it", 16, 202, 17, muted),
    text("lz-note-2", "cannot prove the update.", 16, 228, 17, muted),
  ]);
  return build({
    id: "learning-lazy-evaluation",
    title: "Built is not computed.",
    description:
      "Build a tiny lazy graph for one gradient step, then choose what to evaluate. Only requested values and their dependencies are materialized; a timer stopped too early measures only part of the step.",
    state: {
      eval: choice("Evaluation request", ["Stop after build", "eval(loss)", "eval(loss, grad, w_new)"], "eval(loss)"),
      w: num("Weight w", 1, 0, 3, 0.25),
      lr: num("Learning rate η", 0.1, 0, 0.4, 0.05),
    },
    kicker: "06 / DECLARE, THEN EVALUATE",
    subtitle: "L = mean((w·x − y)²) / 2",
    grid: [
      [graph, 0],
      [timer, 1],
      [next, 2],
    ],
    compactOrder: [graph, timer, next],
    durationMs: 5000,
    cues: [
      { atMs: 0, text: "Python lines run and build graph nodes. Shapes are known; no arithmetic has happened yet." },
      { atMs: 1600, text: "The whole step is declared: residual, loss, gradient and updated weight are all pending." },
      { atMs: 2800, text: "Evaluation materializes the requested arrays and only what they depend on." },
      { atMs: 3200, text: "The timer covers only the work it waited for. The costs here are invented." },
      { atMs: 4200, text: "The next iteration needs w_new. Evaluating the old loss alone does not provide it." },
    ],
    accessible:
      "A lazy graph for one step of L = mean((w·x − y)²)/2 with x = [1, 2], y = [2, 4]. Residual r = [w − 2, 2w − 4]; L = 1.25(w − 2)²; gradient g = 2.5(w − 2); w_new = w − η·g. At w = 1, η = 0.1: L = 1.25, g = −2.5, w_new = 1.25 and the next loss is 0.703125. Building the graph computes nothing. eval(loss) materializes r and L only; g and w_new stay pending, so the next iteration is not ready. eval(loss, grad, w_new) materializes all four. Invented costs (build 0.4, r 0.6, L 0.5, g 1.5, update 0.3 ms) show a timer covering 0.4, 1.5 or 3.3 of the 3.3 ms step. These are not MLX measurements; the order of evaluation is the point.",
  });
})();

// ============================================================ 07 finite but wrong
// eng-e12-02 (anonymized analogue): O = P·V versus a kernel that reads P transposed.
const layoutScene = (() => {
  const a = s("a"),
    b = s("b"),
    bug = eq(s("layout"), "Transposed read (bug)");
  const P = [
    [a, sub(1, a)],
    [b, sub(1, b)],
  ];
  const V = [
    [2, -1],
    [4, 3],
  ];
  const used = (i, k) => iff(bug, P[k][i], P[i][k]);
  const ref = [0, 1].map((i) => [0, 1].map((j) => add(mul(P[i][0], V[0][j]), mul(P[i][1], V[1][j]))));
  const cand = [0, 1].map((i) => [0, 1].map((j) => add(mul(used(i, 0), V[0][j]), mul(used(i, 1), V[1][j]))));
  const diffs = [0, 1].flatMap((i) => [0, 1].map((j) => sub(cand[i][j], ref[i][j])));
  const maxErr = max(...diffs.map(abs));
  const rel = div(
    op("sqrt", add(...diffs.map((d) => mul(d, d)))),
    op("sqrt", add(...ref.flat().map((r) => mul(r, r)))),
  );
  const dCand = add(cand[0][0], mul(2, cand[0][1])),
    dRef = add(ref[0][0], mul(2, ref[0][1]));
  const symmetric = lt(abs(sub(add(a, b), 1)), 1e-9);
  const matrixCells = (prefix, M, x0, y0, highlight) =>
    [0, 1].flatMap((i) =>
      [0, 1].flatMap((j) => [
        rect(`${prefix}-cell-${i}-${j}`, x0 + j * 58, y0 + i * 40, 54, 36, white, 6),
        ...(highlight
          ? [
              {
                ...rect(`${prefix}-hl-${i}-${j}`, x0 + j * 58, y0 + i * 40, 54, 36, red, 6),
                opacity: after(1000, iff(highlight(i, j), 0.25, 0), 0),
              },
            ]
          : []),
        {
          ...bold(`${prefix}-v-${i}-${j}`, typeof M[i][j] === "number" ? String(M[i][j]) : r3(M[i][j]), x0 + 27 + j * 58, y0 + 25 + i * 40, 17),
          align: "middle",
        },
      ]),
    );
  // Highlight the two P values the kernel uses for output row 0.
  const reads = (i, j) => iff(bug, eq(j, 0), eq(i, 0));
  const inputs = card("fw-inputs", 244, ice, blue, "P (ROWS SUM TO 1) · V", [
    text("fw-p-label", "P", 16, 62, 17, blue),
    text("fw-v-label", "V", 160, 62, 17, blue),
    ...matrixCells("fw-p", P, 16, 72, (i, j) => reads(i, j)),
    ...matrixCells("fw-vm", V, 160, 72),
    text("fw-reads", after(1000, iff(bug, "row 0 reads a column", "row 0 reads a row"), "row 0 reads …"), 16, 182),
    text("fw-sym", iff(symmetric, "P symmetric: blind probe", "P is not symmetric"), 16, 214, 17, muted),
    handle("fw-pick-bug", 0, 72, 120, 80, "Use the transposed (buggy) kernel", {
      activate: { state: "layout", value: "Transposed read (bug)" },
    }),
    handle("fw-pick-correct", 0, 160, CW, 30, "Use the correct row kernel", {
      activate: { state: "layout", value: "Correct row read" },
    }),
  ]);
  const outCells = (prefix, M, y0, ms) =>
    [0, 1].flatMap((i) =>
      [0, 1].map((j) => ({
        ...bold(`${prefix}-${i}-${j}`, after(ms, r3(M[i][j]), "…"), 90 + j * 96, y0 + i * 28, 18),
        align: "end",
      })),
    );
  const output = card("fw-output", 244, sand, gold, "CANDIDATE vs REFERENCE", [
    text("fw-cand-label", "candidate O", 16, 62, 17, gold),
    ...outCells("fw-o", cand, 92, 1800),
    text("fw-ref-label", "reference P·V", 16, 160, 17, gold),
    ...outCells("fw-r", ref, 190, 2600),
  ]);
  const passFail = (ok) => iff(ok, "PASS", "FAIL");
  const ladder = card("fw-ladder", 286, rose, red, "EVIDENCE LADDER", [
    text("fw-finite", after(3200, "1 finite: PASS", "1 finite: …"), 16, 62),
    text("fw-repeat", after(3200, "2 repeat run: PASS", "2 repeat run: …"), 16, 90),
    text("fw-maxerr", after(3200, cat("3 max |O−ref| = ", r3(maxErr)), "3 max |O−ref| = …"), 16, 118),
    text("fw-rel", after(3200, cat("4 rel L2 = ", r3(rel)), "4 rel L2 = …"), 16, 146),
    text("fw-dcand", after(3200, cat("5 D0 candidate = ", r3(dCand)), "5 D0 candidate = …"), 16, 174),
    text("fw-dref", after(3200, cat("D0 reference = ", r3(dRef)), "D0 reference = …"), 32, 202),
    bold(
      "fw-verdict",
      after(3200, iff(lt(maxErr, 1e-9), "Matches reference", "Finite, yet wrong"), "…"),
      16,
      242,
      18,
      red,
    ),
    text("fw-gate", after(3200, cat("gate: ", passFail(lt(maxErr, 1e-9))), "gate: …"), 16, 266, 17, muted),
  ]);
  return build({
    id: "learning-finite-but-wrong",
    title: "Finite. Repeatable. Wrong.",
    description:
      "A small attention-output analogue: O = P·V. Switch the kernel between a correct row read and a transposed read, edit P, and climb the evidence ladder. Only the reference comparison sees the bug, and only for a non-symmetric P.",
    state: {
      layout: choice("Kernel layout", ["Transposed read (bug)", "Correct row read"]),
      a: num("P row 0, first weight", 0.25, 0, 1, 0.05),
      b: num("P row 1, first weight", 0.6, 0, 1, 0.05),
    },
    kicker: "07 / FINITE IS NOT CORRECT",
    subtitle: "O = P·V, dO row 0 = [1, 2]",
    grid: [
      [inputs, 0],
      [output, 1],
      [ladder, 2],
    ],
    compactOrder: [inputs, output, ladder],
    durationMs: 4000,
    cues: [
      { atMs: 0, text: "P holds attention weights (rows sum to one); V holds values. The reference is O = P·V." },
      { atMs: 1000, text: "Highlighted cells are what the kernel uses for output row 0." },
      { atMs: 1800, text: "The candidate output is finite and identical on every run." },
      { atMs: 2600, text: "An independent reference computes P·V directly." },
      { atMs: 3200, text: "Only elementwise comparison rejects the bug. The backward row scalar D0 = Σ dO·O is damaged too." },
    ],
    accessible:
      "An anonymized two-by-two analogue of a layout defect. P = [[a, 1−a], [b, 1−b]], V = [[2, −1], [4, 3]], reference O = P·V. The buggy kernel reads P transposed. With a = 0.25, b = 0.6 the reference is [[3.5, 2], [2.8, 0.6]] and the candidate is [[2.9, 1.55], [3.1, 0.45]]: finite, repeatable and wrong, with maximum absolute error 0.6. The backward row scalar D0 = dO0 · O0 with dO0 = [1, 2] is 7.5 for the reference and 6 for the candidate. When a + b = 1, P is symmetric, the transpose is invisible and every check passes: choose non-symmetric probes. This illustrates the evidence ladder; it is not a reproduction of any device's lane mapping.",
  });
})();

// ============================================================ 08 recompute replay
// eng-e13-02: y = w2·(w1·x). Recompute must replay the forward-time weights.
const recomputeScene = (() => {
  const policy = s("policy"),
    early = s("earlyW2"),
    x = s("x");
  const save = eq(policy, "Save h"),
    stale = eq(policy, "Recompute, current weights");
  const h = mul(2, x),
    y = mul(3, h);
  const liveW2 = iff(ge(t, 2000), early, 3);
  const usedW2 = iff(stale, early, 3);
  const g1 = mul(usedW2, x),
    ref = mul(3, x);
  const forward = card("rc-forward", 234, ice, blue, "FORWARD (w1=2, w2=3)", [
    text("rc-x", cat("x = ", x), 16, 64),
    text("rc-h", after(400, cat("h = w1·x = ", h), "h = …"), 16, 94),
    bold("rc-y", after(800, cat("y = w2·h = ", y), "y = …"), 16, 128, 20, blue),
    text("rc-buffer", "h buffer: 1,024 FP32", 16, 164, 17, muted),
    text(
      "rc-keep",
      after(1200, iff(save, "h kept for backward", "h freed after use"), "h: …"),
      16,
      194,
    ),
  ]);
  const between = card("rc-between", 234, sand, gold, "BEFORE BACKWARD", [
    text("rc-live", cat("live w2 = ", liveW2), 16, 64),
    text("rc-hazard", after(2000, "early write to w2", "no write yet"), 16, 94, 17, muted),
    bold("rc-retained", after(1200, cat("retained: ", iff(save, 4096, 0), " B"), "retained: …"), 16, 134, 20, gold),
    text("rc-muls", after(3000, cat("replayed muls: ", iff(save, 0, 1024)), "replayed muls: …"), 16, 166),
    text("rc-snapshot", iff(stale, "replay: live weights", "replay: saved weights"), 16, 198),
  ]);
  const backward = card("rc-backward", 264, mint, teal, "BACKWARD", [
    text("rc-used", after(3000, cat("w2 used = ", usedW2), "w2 used = …"), 16, 64),
    bold("rc-g1", after(3000, cat("∂y/∂w1 = ", g1), "∂y/∂w1 = …"), 16, 100, 20, teal),
    text("rc-ref", cat("reference 3·x = ", ref), 16, 132),
    text("rc-g2", after(3000, cat("∂y/∂w2 = h = ", h), "∂y/∂w2 = …"), 16, 162),
    bold(
      "rc-verdict",
      after(4000, iff(eq(g1, ref), "Exact match", "Wrong forward state"), "…"),
      16,
      204,
      18,
      teal,
    ),
    text("rc-note", "Same math, other state.", 16, 238, 17, muted),
  ]);
  return build({
    id: "learning-recompute-replay",
    title: "Recompute the same forward.",
    description:
      "Trade a retained activation for a replayed multiplication. Then let an optimizer write w2 early: replaying with live weights differentiates a forward that never happened.",
    state: {
      policy: choice("Activation policy", ["Save h", "Recompute, saved weights", "Recompute, current weights"]),
      earlyW2: num("Early-written w2", 5, 3, 6, 0.5),
      x: num("Input x", 4, -4, 4, 1),
    },
    kicker: "08 / MEMORY FOR COMPUTE",
    subtitle: "y = w2·(w1·x)",
    grid: [
      [forward, 0],
      [between, 1],
      [backward, 2],
    ],
    compactOrder: [forward, between, backward],
    durationMs: 5000,
    cues: [
      { atMs: 0, text: "Forward with w1 = 2 and w2 = 3: h = 2x, y = 3h." },
      { atMs: 1200, text: "Save h (memory) or free it and plan to replay the multiplication (compute)." },
      { atMs: 2000, text: "Hazard: an optimizer writes a new w2 before backward has run." },
      { atMs: 3000, text: "Backward: ∂y/∂w1 = w2·x. A correct replay uses the forward-time w2." },
      { atMs: 4000, text: "Compare with the reference 3x. Equal memory savings, different correctness." },
    ],
    accessible:
      "y = w2·(w1·x) with forward weights w1 = 2, w2 = 3. h = 2x, y = 3h; at x = 4, h = 8 and y = 24. Saving h retains a 1,024-element FP32 buffer (4,096 bytes) and replays nothing; recomputing frees it and replays 1,024 multiplications during backward. Before backward an optimizer writes w2 early (default 5). The reference sensitivity ∂y/∂w1 = 3x = 12 at x = 4. Saving or replaying with saved weights gives 12; replaying with live weights gives 5·4 = 20, a finite and wrong gradient. If the early value equals 3 or x = 0 the bug is invisible, so a test needs a changed weight and non-zero input. ∂y/∂w2 = h is unaffected because w1 did not change.",
  });
})();

// ============================================================ 09 paired benchmark
// eng-e14-02: paired trials, linear drift, warm-up and trial order.
const benchScene = (() => {
  const order = s("order"),
    drift = s("drift"),
    warm = s("warmup");
  const abba = eq(order, "Alternating (ABBA)");
  const R = [10, 20, 10, 20],
    C = [9, 18, 9, 18];
  // slot of the reference/candidate trial of pair i
  const refSlot = (i) => iff(abba, i % 2 === 0 ? 2 * i : 2 * i + 1, i);
  const candSlot = (i) => iff(abba, i % 2 === 0 ? 2 * i + 1 : 2 * i, 4 + i);
  const refT = R.map((r, i) => add(r, mul(drift, refSlot(i))));
  const candT = C.map((c, i) => add(c, mul(drift, candSlot(i)), i === 0 ? iff(warm, 30, 0) : 0));
  const slotMs = 600;
  const ratios = refT.map((r, i) => div(r, candT[i]));
  const diffs = refT.map((r, i) => sub(r, candT[i]));
  // median of four = mean of the middle two = (sum − max − min) / 2
  const median = div(sub(sub(add(...ratios), max(...ratios)), min(...ratios)), 2);
  const meanDiff = div(add(...diffs), 4);
  const summaryAt = 8 * slotMs + 400;
  // Each slot is either a reference or a candidate trial depending on order.
  const slotNodes = Array.from({ length: 8 }, (_, k) => {
    const isRef = iff(abba, [true, false, false, true, true, false, false, true][k], k < 4);
    const pairOf = iff(abba, Math.floor(k / 2), k % 4);
    const pick = (arr) =>
      iff(eq(pairOf, 0), arr[0], iff(eq(pairOf, 1), arr[1], iff(eq(pairOf, 2), arr[2], arr[3])));
    const value = iff(isRef, pick(refT), pick(candT));
    const height = mul(2, value);
    const x = 16 + k * 32;
    return [
      rect(`pb-slot-${k}`, x, 52, 28, 136, white, 4),
      {
        ...rect(`pb-bar-${k}`, x, sub(188, height), 28, height, blue, 4),
        opacity: iff(and(isRef, ge(t, (k + 1) * slotMs)), 1, 0),
      },
      {
        ...rect(`pb-cbar-${k}`, x, sub(188, height), 28, height, gold, 4),
        opacity: iff(and(not(isRef), ge(t, (k + 1) * slotMs)), 1, 0),
      },
      {
        ...text(`pb-lab-${k}`, cat(iff(isRef, "R", "C"), pairOf), x + 14, 214, 17, muted),
        align: "middle",
      },
    ];
  }).flat();
  const schedule = card("pb-schedule", 294, ice, blue, "RUN ORDER (8 SLOTS)", [
    ...slotNodes,
    text("pb-drift", cat("drift +", r3(drift), " ms per slot"), 16, 246),
    text("pb-scale", "bar: 2 units per ms", 16, 274, 17, muted),
    handle("pb-pick-abba", 0, 44, 144, 184, "Run in alternating ABBA order", {
      activate: { state: "order", value: "Alternating (ABBA)" },
    }),
    handle("pb-pick-blocked", 144, 44, 144, 184, "Run all reference trials first", {
      activate: { state: "order", value: "All reference first" },
    }),
  ]);
  const pairs = card("pb-pairs", 294, sand, gold, "PAIRED TRIALS (ms)", [
    ...[0, 1, 2, 3].flatMap((i) => [
      text(`pb-pair-${i}`, `pair ${i}`, 16, 66 + 32 * i),
      text(`pb-ref-${i}`, after(mul(add(refSlot(i), 1), slotMs), cat("R ", r3(refT[i])), "R …"), 104, 66 + 32 * i),
      text(`pb-cand-${i}`, after(mul(add(candSlot(i), 1), slotMs), cat("C ", r3(candT[i])), "C …"), 192, 66 + 32 * i),
    ]),
    text("pb-true", "true: R/C = 10/9", 16, 210, 17, muted),
    text("pb-true-diff", "true mean R−C = 1.5", 16, 238, 17, muted),
    text("pb-warm", iff(warm, "warm-up counted: C0+30", "warm-up run discarded"), 16, 270),
  ]);

  const summary = card("pb-summary", 294, lilac, purple, "WHAT THE DATA SAYS", [
    text("pb-median", after(summaryAt, cat("median R/C = ", r3(median)), "median R/C = …"), 16, 64),
    bold("pb-mean", after(summaryAt, cat("mean R−C = ", r3(meanDiff)), "mean R−C = …"), 16, 100, 20, purple),
    text(
      "pb-verdict",
      after(
        summaryAt,
        iff(
          lt(abs(sub(meanDiff, 1.5)), 1e-9),
          "Mean gap is unbiased",
          iff(lt(meanDiff, 0), "C looks slower: wrong", "Mean gap is biased"),
        ),
        "…",
      ),
      16,
      134,
    ),
    text("pb-note-1", "Paired, alternating", 16, 182, 17, muted),
    text("pb-note-2", "order cancels linear", 16, 208, 17, muted),
    text("pb-note-3", "drift in the mean gap.", 16, 234, 17, muted),
    text("pb-note-4", "Synthetic numbers only.", 16, 270, 17, muted),
  ]);
  return build({
    id: "learning-paired-benchmark",
    title: "Same code. A different story.",
    description:
      "Four synthetic reference/candidate pairs run in eight slots while the machine drifts slower. Change the run order, the drift and whether a warm-up trial is counted, and see what each summary claims.",
    state: {
      order: choice("Trial order", ["Alternating (ABBA)", "All reference first"]),
      drift: num("Drift per slot (ms)", 1, 0, 2, 0.25),
      warmup: flag("Count candidate warm-up"),
    },
    kicker: "09 / COMPARE LIKE WITH LIKE",
    subtitle: "R = reference, C = candidate",
    grid: [
      [schedule, 0],
      [pairs, 1],
      [summary, 2],
    ],
    compactOrder: [schedule, pairs, summary],
    durationMs: summaryAt + 400,
    cues: [
      { atMs: 0, text: "Every trial is paired: same input, same boundary. Underlying R = [10, 20, 10, 20], C = [9, 18, 9, 18]." },
      { atMs: 600, text: "Each slot adds the drift to whatever runs in it, like a slowly heating machine." },
      { atMs: 2400, text: "With all reference trials first, every candidate trial pays more drift than its partner." },
      { atMs: summaryAt, text: "Summaries: median of paired ratios and mean paired difference. Compare with the true 10/9 and 1.5 ms." },
    ],
    accessible:
      "Synthetic paired benchmark. Underlying reference times [10, 20, 10, 20] ms and candidate times [9, 18, 9, 18] ms, so every true paired ratio is 10/9 ≈ 1.111 and the true mean difference is 1.5 ms. Eight slots run in sequence; slot k adds drift × k ms. Alternating ABBA order runs R0 C0 C1 R1 R2 C2 C3 R3, which cancels linear drift in the mean paired difference (still 1.5 ms) while the median ratio shifts slightly. Running all reference trials first gives every candidate four extra slots of drift; with drift 1 ms the mean difference becomes −2.5 ms and the candidate looks slower. Counting the candidate's first, warm-up trial adds 30 ms and pulls the mean difference down by 7.5 ms; the median ratio moves less. All numbers are invented to explain the design, not measurements.",
  });
})();

// ---------------------------------------------------------------- assemble
const authored = [
  floatScene,
  fanoutScene,
  optimizerScene,
  softmaxScene,
  kvScene,
  lazyScene,
  layoutScene,
  recomputeScene,
  benchScene,
];
const depthOf = (e) =>
  e && typeof e === "object" && "op" in e ? 1 + Math.max(0, ...e.args.map(depthOf)) : 0;
for (const scene of authored) {
  const report = (value, where) => {
    if (!value || typeof value !== "object") return;
    if ("op" in value) {
      if (depthOf(value) > 16) console.error(`${scene.id} ${where}: depth ${depthOf(value)}`);
      return;
    }
    for (const [k, v] of Object.entries(value)) report(v, `${where}.${value.id ?? k}`);
  };
  report(scene.nodes, "nodes");
  report(scene.layouts, "layouts");
}
const scenes = authored.map((scene) => {
  try {
    return parseScene(scene);
  } catch (error) {
    throw new Error(`${scene.id}: ${error.message}`, { cause: error });
  }
});
const bindings = [
  ["learning-float-order", "fnd-e02-04", "fnd-02-04-text-2"],
  ["learning-fanout-backward", "fnd-e04-02", "fnd-04-02-text-1"],
  ["learning-optimizer-state", "ttf-e05-03", "ttf-05-03-text-2"],
  ["learning-softmax-cross-entropy", "ttf-e06-02", "ttf-06-02-text-2"],
  ["learning-kv-cache", "ttf-e06-04", "ttf-06-04-text-2"],
  ["learning-lazy-evaluation", "ttf-e08-03", "ttf-08-03-text-2"],
  ["learning-finite-but-wrong", "eng-e12-02", "eng-12-02-lesson"],
  ["learning-recompute-replay", "eng-e13-02", "eng-13-02-lesson"],
  ["learning-paired-benchmark", "eng-e14-02", "eng-14-02-lesson"],
].map(([visualId, episodeId, afterBlockId]) => ({ visualId, episodeId, afterBlockId }));
assert.deepEqual(
  bindings.map((b) => b.visualId),
  scenes.map((s) => s.id),
);

// Bindings must target existing episodes/blocks, distinct episodes, and
// episodes that do not already carry an illustration.
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
// text stays inside its card and canvas and never overlaps other text, for
// boundary states in both layouts and several timeline positions.
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
      }
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
function boundaryStates(scene) {
  const states = [{}];
  for (const [key, field] of Object.entries(scene.state)) {
    const values =
      field.kind === "number" ? [field.min, field.max] : field.kind === "boolean" ? [true, false] : field.options;
    for (const value of values) states.push({ [key]: value });
  }
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

// Same renderer identity convention as the systems overlay.
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
      "All nine learning scenes state their arithmetic, show live readouts, and include complete text equivalents.",
  },
};
// The assembler accepts an overlay only if its renderer declaration matches the
// one already registered (apart from the text alternative).
const systems = (await read("content/systems-visuals.json")).extension;
assert.deepEqual(
  { ...extension, accessibility: { ...extension.accessibility, textAlternative: "" } },
  { ...systems, accessibility: { ...systems.accessibility, textAlternative: "" } },
  "Renderer identity differs from the existing overlays; regenerate all overlays against one artifact",
);
const visuals = scenes.map(toVisualExperience);
assert.deepEqual(visuals.map(fromVisualExperience), scenes);
await writeFile(
  new URL("visuals/learning-scenes.json", root),
  JSON.stringify({ schemaVersion: 1, scenes, bindings }, null, 2) + "\n",
  { mode: 0o600 },
);
await writeFile(
  new URL("content/learning-visuals.json", root),
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
    })),
    bindings,
    integrity: extension.integrity,
    consumption: process.env.COURSE_VISUALS_ARTIFACT ? "explicit-development-built-artifact" : "released-package",
  }),
);
