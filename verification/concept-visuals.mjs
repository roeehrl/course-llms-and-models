// Read-only verification of the sixteen concept scenes, except optional private
// temporary browser screenshots. Default consumption: the released package.
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, chmod } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { validateCourse } from "@course-core/sdk";
import { assemble, fragments } from "../scripts/assemble.mjs";
const root = new URL("../", import.meta.url);
const artifact =
  process.env.COURSE_VISUALS_ARTIFACT ?? "@course-core/visuals/headless";
const entry =
  process.env.COURSE_VISUALS_ARTIFACT ?? import.meta.resolve(artifact);
if (process.env.COURSE_VISUALS_ARTIFACT)
  assert(/^file:.*\/dist\/headless\.js$/.test(entry));
const {
  VisualRuntime,
  flattenNodes,
  fromVisualExperience,
  toVisualExperience,
  parseScene,
} = await import(artifact);
const read = async (name) =>
  JSON.parse(await readFile(new URL(name, root), "utf8"));
const data = await read("visuals/concept-scenes.json");
const overlay = await read("content/concept-visuals.json");
const scenes = overlay.visuals.map(fromVisualExperience);
assert.deepEqual(scenes, data.scenes, "Delivered overlay differs from authored scenes");
assert.deepEqual(overlay.bindings, data.bindings);
assert.equal(scenes.length, 16);

// ------------------------------------------------ full-curriculum integration
// Same overlays and order as scripts/assemble.mjs, compiled in memory through
// the released SDK. Nothing is written.
const config = await read("content/course-config.json");
const modules = await Promise.all(fragments.map((n) => read(`content/${n}.json`)));
const baseVisuals = await read("content/visuals.json");
const systemsVisuals = await read("content/systems-visuals.json");
const learningVisuals = await read("content/learning-visuals.json");
const compiled = assemble(config, modules, {
  visualOverlay: baseVisuals,
  visualOverlays: [systemsVisuals, learningVisuals, overlay],
  practicalOverlay: await read("content/practicals-qualified.json"),
  recoveryOverlay: await read("content/recovery-runtime.json"),
});
const allBindings = [...baseVisuals.bindings, ...systemsVisuals.bindings, ...learningVisuals.bindings, ...overlay.bindings];
assert.equal(new Set(allBindings.map((b) => b.episodeId)).size, allBindings.length, "one illustration per episode");
assert.equal(compiled.learner.visuals.length, allBindings.length);
assert.equal(compiled.server.extensions.filter((e) => e.id === "course-core-svg-v1").length, 1);
const learnerEpisodes = compiled.learner.chapters.flatMap((c) => c.episodes);
assert.equal(compiled.learner.chapters.length, 14);
assert.equal(learnerEpisodes.length, 56);
for (const b of overlay.bindings) {
  const episode = learnerEpisodes.find((e) => e.id === b.episodeId);
  const at = episode.blocks.findIndex((x) => x.id === b.afterBlockId);
  assert(at >= 0 && episode.blocks[at + 1]?.type === "visual" && episode.blocks[at + 1].visualId === b.visualId);
}
// Independent schema validation of the same combined course.
{
  const course = structuredClone(config);
  for (const field of ["objectives", "chapters", "assessments", "gates", "sources", "visuals", "media", "extensions"])
    course[field] = modules.flatMap((m) => m[field]);
  course.sources = [...new Map(course.sources.map((s) => [s.id, s])).values()];
  course.visuals.push(...baseVisuals.visuals, ...systemsVisuals.visuals, ...learningVisuals.visuals, ...overlay.visuals);
  course.extensions.push(systemsVisuals.extension);
  for (const b of allBindings) {
    const e = course.chapters.flatMap((c) => c.episodes).find((x) => x.id === b.episodeId);
    e.blocks.splice(e.blocks.findIndex((x) => x.id === b.afterBlockId) + 1, 0, {
      id: `visual-${b.visualId}`,
      type: "visual",
      visualId: b.visualId,
    });
  }
  const validation = validateCourse(course);
  assert(validation.valid, JSON.stringify(validation.issues));
}

// ------------------------------------------------ oracle comparison
const oracle = spawnSync(
  "python3",
  ["-I", fileURLToPath(new URL("verification/concept-visual-reference.py", root))],
  { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
);
assert.equal(oracle.status, 0, oracle.stderr);
const reference = JSON.parse(oracle.stdout);
const lastNumber = (text) => text?.match(/(-?\d+(?:\.\d+)?)\D*$/)?.[1];

// Conservative headless layout lint (0.62·fontSize advance, as the package's
// own text bounds): visible text, rects, circles and lines inside their card and
// the canvas, no text overlaps, no text under 17 scene units.
function lintFrame(frame) {
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
        if (!inside(n.bounds, container, 6)) problems.push(`${n.id} escapes its card`);
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

function verify(frame, item) {
  const nodes = new Map(flattenNodes(frame.nodes).map((n) => [n.id, n]));
  for (const [id, expected] of Object.entries(item.numeric)) {
    const value = lastNumber(nodes.get(id)?.text);
    assert(
      value !== undefined && Math.abs(Number(value) - expected) <= 0.000501,
      `${item.scene} ${id} t=${item.time}: numeric reference mismatch (${nodes.get(id)?.text} vs ${expected})`,
    );
  }
  for (const [id, expected] of Object.entries(item.precise)) {
    const value = lastNumber(nodes.get(id)?.text);
    assert(
      value !== undefined && Math.abs(Number(value) - expected) <= 0.00000051,
      `${item.scene} ${id} t=${item.time}: precise numeric reference mismatch (${nodes.get(id)?.text} vs ${expected})`,
    );
  }
  for (const [id, expected] of Object.entries(item.lists)) {
    const text = nodes.get(id)?.text ?? "";
    const values = (text.split(/[=:]/).pop().match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    assert(
      values.length === expected.length && values.every((v, k) => Math.abs(v - expected[k]) <= 0.000501),
      `${item.scene} ${id} t=${item.time}: list reference mismatch (${text} vs ${JSON.stringify(expected)})`,
    );
  }
  for (const [id, expected] of Object.entries(item.exact))
    assert.equal(nodes.get(id)?.text, expected, `${item.scene} ${id} t=${item.time}: text mismatch`);
  for (const [id, properties] of Object.entries(item.geometry))
    for (const [key, expected] of Object.entries(properties)) {
      const actual = nodes.get(id)?.[key];
      assert(
        Math.abs(actual - expected) < 1e-7,
        `${item.scene} ${id}.${key} t=${item.time}: geometry mismatch (${actual} vs ${expected})`,
      );
    }
  for (const n of nodes.values()) {
    for (const key of ["x", "y", "width", "height", "opacity", "radius", "progress", "fontSize"])
      assert(Number.isFinite(n[key]), `${n.id}.${key} finite`);
    if (n.kind === "link" && n.opacity > 0 && n.visible) {
      assert.equal(n.fill, "none", "connectors must not obscure the diagram");
      assert(
        n.bounds.x >= 0 && n.bounds.y >= 0 && n.bounds.x + n.bounds.width <= frame.width && n.bounds.y + n.bounds.height <= frame.height,
        "connector geometry must remain inside its scene",
      );
    }
  }
  const problems = lintFrame(frame);
  assert.deepEqual(problems, [], `${item.scene} t=${item.time} layout ${frame.layout}: ${problems.join("; ")}`);
}

const runtimes = new Map(),
  perScene = {};
let frameCount = 0;
for (const item of reference.cases)
  for (const width of [320, 960]) {
    const key = JSON.stringify([item.scene, item.state, width]);
    let runtime = runtimes.get(key);
    if (!runtime) {
      runtime = new VisualRuntime(scenes.find((s) => s.id === item.scene), { viewportWidth: width });
      runtime.setState(item.state);
      runtimes.set(key, runtime);
    }
    runtime.seek(item.time);
    const frame = runtime.getSnapshot().frame;
    assert.equal(frame.layout, width < 800 ? "compact" : "expanded");
    verify(frame, item);
    frameCount++;
    perScene[item.scene] = (perScene[item.scene] ?? 0) + 1;
  }
runtimes.clear();
for (const scene of scenes) assert(perScene[scene.id] > 0, `${scene.id} has no oracle cases`);

// ------------------------------------------------ negative controls
const op = (o, ...args) => ({ op: o, args }),
  st = (state) => ({ state }),
  t = { time: true };
const add = (...v) => op("add", ...v),
  mul = (...v) => op("mul", ...v),
  sub = (a, b) => op("sub", a, b),
  div = (a, b) => op("div", a, b),
  eq = (a, b) => op("eq", a, b),
  iff = (c, a, b) => op("if", c, a, b),
  ge = (a, b) => op("gte", a, b),
  max = (...v) => op("max", ...v),
  floor = (v) => op("floor", v),
  pow = (a, b) => op("pow", a, b),
  lt = (a, b) => op("lt", a, b),
  sqrt = (v) => op("sqrt", v),
  cos = (v) => op("cos", v),
  sin = (v) => op("sin", v),
  cat = (...v) => op("concat", ...v),
  r3 = (v) => div(op("round", mul(v, 1000)), 1000),
  r6 = (v) => div(op("round", mul(v, 1000000)), 1000000),
  after = (ms, value, waiting) => iff(ge(t, ms), value, waiting);
const negatives = [];
function mutated(sceneId, nodeId, field, makeValue, predicate, label, { mustPassElsewhere } = {}) {
  const scene = structuredClone(scenes.find((s) => s.id === sceneId));
  const node = flattenNodes(scene.nodes).find((n) => n.id === nodeId);
  assert(node, `${nodeId} missing`);
  node[field] = typeof makeValue === "function" ? makeValue(node[field]) : makeValue;
  const items = reference.cases.filter((c) => c.scene === sceneId && predicate(c));
  assert(items.length > 0, `${label}: no discriminating case`);
  for (const item of items) {
    let rejected = false;
    try {
      const runtime = new VisualRuntime(scene, { viewportWidth: 960 });
      runtime.setState(item.state);
      runtime.seek(item.time);
      verify(runtime.getSnapshot().frame, item);
    } catch (error) {
      // Rejected for the intended reason: the mutated readout/geometry itself
      // disagrees with the oracle, or the runtime refuses the arithmetic.
      rejected =
        ["OVERFLOW", "NON_FINITE", "EXPRESSION_LIMIT"].includes(error.code) ||
        (/mismatch/.test(error.message) && error.message.includes(` ${nodeId}`));
      if (!rejected) throw error;
    }
    assert(rejected, `${label}: wrong scene accepted at ${JSON.stringify(item.state)} t=${item.time}`);
  }
  let passesElsewhere = false;
  if (mustPassElsewhere) {
    // Shows the control is a realistic bug: it is invisible on an easy case.
    const easy = reference.cases.find((c) => c.scene === sceneId && mustPassElsewhere(c));
    assert(easy, `${label}: no easy case`);
    const runtime = new VisualRuntime(scene, { viewportWidth: 960 });
    runtime.setState(easy.state);
    runtime.seek(easy.time);
    verify(runtime.getSnapshot().frame, easy);
    passesElsewhere = true;
  }
  negatives.push({ scene: sceneId, control: label, rejectedCases: items.length, passesEasyCase: passesElsewhere });
}
const at = (state, time) => (c) =>
  Object.entries(state).every(([k, v]) => c.state[k] === v) && (time === undefined || c.time === time);
const from = (state, time) => (c) => at(state)(c) && c.time >= time;

// 01 matmul and reductions
const a12 = st("a12");
mutated("concept-matmul-reduce", "mm-mean", "text",
  after(4600, cat("mean: [", r3(div(6, 6)), ", ", r3(div(add(9, a12), 6)), "]"), "mean: …"),
  from({ axis: "axis 1", keep: false }, 4600), "row means divided by the all-element count 6");
mutated("concept-matmul-reduce", "mm-adds", "text", after(3400, "adds here: 2", "adds here: …"),
  from({ init: "Zero literal" }, 3400), "addition count ignores a zero-initialized accumulator",
  { mustPassElsewhere: at({ init: "First product" }, 5200) });
mutated("concept-matmul-reduce", "mm-result", "text",
  after(3400, cat("C[0,1] = ", add(4, a12)), "C[0,1] = …"),
  (c) => c.state.cell === "C[0,1]" && c.state.a12 !== 1 && c.time >= 3400, "output written to the transposed cell C[1,0]",
  { mustPassElsewhere: (c) => c.state.cell === "C[0,1]" && c.state.a12 === 1 && c.time === 5200 });

// 02 chain rule
const w = st("w"),
  x = st("x"),
  d = st("delta");
const lossAt = (wv) => div(mul(sub(mul(wv, x), 5), sub(mul(wv, x), 5)), 2);
mutated("concept-chain-rule", "cr-grad", "text",
  after(2800, cat("dL/dw = r·x = ", r3(sub(mul(w, x), 5))), "dL/dw = …"),
  from({ x: 2, w: 1 }, 2800), "missing factor x in dL/dw (uses r alone)",
  { mustPassElsewhere: at({ x: 1, w: 1 }, 5000) });
mutated("concept-chain-rule", "cr-exact", "text",
  after(4200, cat("exact: ", r6(add(lossAt(w), mul(sub(mul(w, x), 5), x, d)))), "exact: …"),
  from({ x: 2, delta: 0.55 }, 4200), "exact loss replaced by the tangent-line guess",
  { mustPassElsewhere: at({ x: 2, delta: 0 }, 5000) });
mutated("concept-chain-rule", "cr-tangent", "y2",
  mul(5, mul(sub(mul(w, x), 5), x, d)),
  at({ w: 1, x: 2, delta: 0.55 }), "tangent drawn with the slope's sign flipped",
  { mustPassElsewhere: at({ w: 1, x: 2, delta: 0 }, 5000) });

// 03 gradient accumulation
const g1 = st("g1"),
  g2 = st("g2"),
  n1 = st("n1"),
  n2 = st("n2");
const weighted = div(add(mul(n1, g1), mul(n2, g2)), add(n1, n2));
mutated("concept-grad-accumulation", "ga-grad", "text",
  after(2800, cat("grad = ", r3(div(add(g1, g2), 2))), "grad = …"),
  from({ n1: 2, g1: 3, n2: 1, g2: -3, rule: "Weight by count" }, 2800), "equal average of microbatch means",
  { mustPassElsewhere: at({ n1: 1, n2: 1, rule: "Weight by count" }, 5400) });
mutated("concept-grad-accumulation", "ga-w2", "text",
  after(5000, cat("w2 = ", r3(sub(sub(10, mul(0.1, weighted)), mul(0.1, add(weighted, 2))))), "w2 = …"),
  from({ n1: 2, g1: 3, n2: 1, g2: -3, rule: "Weight by count", clear: true }, 5000), "buffer never cleared between windows",
  { mustPassElsewhere: at({ n1: 2, g1: 3, n2: 1, g2: -3, rule: "Weight by count", clear: false }, 5400) });

// 04 ReLU gate
const x1 = st("x1"),
  x2 = st("x2");
const reluPred = add(mul(3, max(0, add(mul(2, x1), x2, 1))), mul(-1, max(0, add(mul(-1, x1), mul(2, x2)))), 0.5);
const res = sub(reluPred, st("target"));
mutated("concept-relu-gate", "rg-sz", "text",
  after(3500, cat("∂z = [", r3(mul(3, res)), ", ", r3(mul(-1, res)), "]"), "∂z = …"),
  from({ x1: 1, x2: -2, act: "ReLU" }, 3500), "ReLU gate ignored in backward",
  { mustPassElsewhere: at({ x1: 3, x2: 3, act: "ReLU" }, 5200) });
mutated("concept-relu-gate", "rg-affine", "text",
  after(4800, cat("affine = ", r3(add(mul(5, x1), mul(-5, x2), 3.5))), "affine = …"),
  from({ x1: 1, x2: -2 }, 4800), "collapsed map built from the transposed weight product");

// 05 causal mask
mutated("concept-causal-mask", "cm-on-0-1", "opacity", after(1600, 0.75, 0),
  from({ mask: "Causal j ≤ i" }, 1600), "grid lets query 0 read the future key 1",
  { mustPassElsewhere: at({ mask: "No mask" }, 4600) });
mutated("concept-causal-mask", "cm-valid", "text",
  after(4000, cat("valid tokens: ", r3(div(add(6, st("lossB")), 6))), "valid tokens: …"),
  (c) => c.time >= 4000, "valid-token mean divided by all six slots");
mutated("concept-causal-mask", "cm-visible", "text",
  after(2400, "target visible: no", "target visible: …"),
  from({ mask: "Causal j ≤ i", shifted: false, query: "Query 0" }, 2400), "leak check assumes targets are always shifted",
  { mustPassElsewhere: at({ mask: "Causal j ≤ i", shifted: true, query: "Query 0" }, 4600) });

// 06 RoPE and GQA
const rad = (deg) => mul(deg, Math.PI / 180);
const rot = ([a, b], deg) => [
  sub(mul(a, cos(rad(deg))), mul(b, sin(rad(deg)))),
  add(mul(a, sin(rad(deg))), mul(b, cos(rad(deg)))),
];
const dot2 = (u, v) => add(mul(u[0], v[0]), mul(u[1], v[1]));
const mth = mul(st("m"), st("theta")),
  nth = mul(st("n"), st("theta"));
mutated("concept-rope-gqa", "rp-dot", "text",
  after(3000, cat("Rq·Rk = ", r3(dot2(rot([2, 1], mth), rot([1, 3], mth)))), "Rq·Rk = …"),
  from({ m: 1, n: 3, theta: 30, bug: false }, 3000), "key rotated by the query position m·θ",
  { mustPassElsewhere: at({ m: 3, n: 3, theta: 30, bug: false }, 4400) });
mutated("concept-rope-gqa", "rp-kr", "text",
  after(2800, (() => { const v = rot([1, 3], mul(-1, nth)); return cat("R k = [", r3(v[0]), ", ", r3(v[1]), "]"); })(), "R k = …"),
  from({ n: 3, theta: 30, bug: false }, 2800), "key rotated in the opposite direction",
  { mustPassElsewhere: at({ n: 0, bug: false }, 4400) });
mutated("concept-rope-gqa", "rp-total", "text", "total = 256",
  at({ kvHeads: "2 KV heads" }), "K/V projections sized by query heads",
  { mustPassElsewhere: at({ kvHeads: "4 KV heads" }, 4400) });

// 07 tree reduction
const nn = st("n");
const G = iff(eq(st("size"), "8"), 8, iff(eq(st("size"), "4"), 4, 2));
const tri = (a) => div(mul(a, add(a, 1)), 2);
mutated("concept-tree-reduction", "tr-total", "text",
  after(4800, cat("total = ", tri(mul(floor(div(nn, G)), G))), "total = …"),
  from({ n: 10, size: "8", tail: "Pad with 0", signs: false }, 4800), "incomplete final group dropped despite padding",
  { mustPassElsewhere: at({ n: 16, size: "8", tail: "Pad with 0", signs: false }, 5400) });
mutated("concept-tree-reduction", "tr-total", "text",
  after(4800, cat("total = ", add(tri(nn), sub(mul(floor(div(add(nn, sub(G, 1)), G)), G), nn))), "total = …"),
  from({ n: 10, size: "8", tail: "Pad with 0", signs: false }, 4800), "padding filled with 1 instead of the additive identity",
  { mustPassElsewhere: at({ n: 16, size: "8", tail: "Pad with 0", signs: false }, 5400) });
mutated("concept-tree-reduction", "tr-l1-s0-box", "width", 60,
  from({ size: "4" }, 1600), "tree slots not rescaled to the group size",
  { mustPassElsewhere: at({ n: 10, size: "8", tail: "Pad with 0", signs: false }, 5400) });

// 08 transfer budget
const mib = st("mib"),
  mbps = st("mbps"),
  c = st("compute"),
  mg = st("merge");
const tx = div(mul(mib, 1048576, 8), mul(mbps, 1000000));
mutated("concept-transfer-budget", "tb-ideal", "text",
  after(1600, cat("ideal = ", r3(div(mul(mib, 8), mbps)), " s"), "ideal = …"),
  from({ mib: 100, mbps: 200 }, 1600), "MiB treated as decimal MB");
mutated("concept-transfer-budget", "tb-cycle", "text",
  after(4200, cat("cycle = ", r3(add(c, tx, mg)), " s"), "cycle = …"),
  from({ schedule: "Ideal overlap", compute: 8 }, 4200), "overlap model silently ignored",
  { mustPassElsewhere: at({ schedule: "Serial", compute: 8 }, 5200) });
mutated("concept-transfer-budget", "tb-unique", "text",
  after(4800, cat("unique work: ", mul(60, st("attempts"))), "unique work: …"),
  from({ attempts: 3 }, 4800), "attempt counter reported as unique work",
  { mustPassElsewhere: at({ attempts: 1 }, 5200) });
mutated("concept-transfer-budget", "tb-tbar", "width", mul(7, tx),
  at({ mib: 100, mbps: 200 }, 3000), "transfer bar drawn before its step");

// ------------------------------------------------ second batch (09-16)
// 09 tensor offsets
const b9 = st("b"),
  t9 = st("t"),
  d9 = st("d"),
  o9 = st("offset");
const size9 = iff(eq(st("dtype"), "FP32 (4 bytes)"), 4, 2),
  off9 = add(mul(b9, 12), mul(t9, 4), d9);
mutated("concept-tensor-offsets", "to-offset", "text",
  after(1600, cat("offset = ", add(b9, mul(t9, 2), mul(d9, 6))), "offset = …"),
  from({ b: 0, t: 2, d: 1 }, 1600), "column-major offset (first index fastest)",
  { mustPassElsewhere: at({ b: 1, t: 2, d: 3 }, 4800) });
mutated("concept-tensor-offsets", "to-range", "text",
  after(2400, cat("bytes ", mul(off9, size9), " … ", mul(add(off9, 1), size9)), "bytes …"),
  (c) => c.time === 4800, "byte range ends one byte past the element");
mutated("concept-tensor-offsets", "to-rt", "text",
  after(3200, cat("t = (o mod 12) div 4 = ", floor(div(o9, 4))), "t = …"),
  (c) => c.state.offset >= 12 && c.time === 4800, "time index decoded without removing the batch stride",
  { mustPassElsewhere: at({ offset: 9 }, 4800) });

// 10 batch mean
const w10 = st("w"),
  eta10 = st("eta"),
  f10 = iff(eq(st("reduction"), "Sum"), 1, 0.5);
const r10 = (i) => sub(mul(w10, [1, 2][i]), [3, 2][i]);
mutated("concept-batch-mean", "bm-loss", "text",
  after(1600, cat("batch loss = ", r3(add(mul(0.5, r10(0), r10(0)), mul(0.5, r10(1), r10(1))))), "batch loss = …"),
  from({ reduction: "Mean" }, 1600), "summed loss reported as the mean",
  { mustPassElsewhere: at({ reduction: "Sum" }, 4800) });
mutated("concept-batch-mean", "bm-w1", "text",
  after(2400, cat("w′ = ", r3(add(w10, mul(eta10, f10, add(r10(0), mul(2, r10(1))))))), "w′ = …"),
  (c) => c.time >= 2400 && c.state.eta > 0 && c.state.w !== 1.4, "update steps up the gradient",
  { mustPassElsewhere: at({ eta: 0 }, 4800) });
mutated("concept-batch-mean", "bm-grad", "text",
  after(1600, cat("batch grad = ", r3(mul(f10, add(r10(0), r10(1))))), "batch grad = …"),
  (c) => c.time >= 1600 && c.state.w !== 1, "per-example gradient missing the factor x",
  { mustPassElsewhere: at({ w: 1, reduction: "Mean" }, 4800) });

// 11 autodiff fan-out
mutated("concept-autodiff-fanout", "af-xgrad", "text",
  after(2400, cat("x.grad = ", r3(mul(2, st("x")))), "x.grad = …"),
  (c) => c.time >= 2400 && c.state.x !== 0 && c.state.slots === "Both operand slots" &&
    c.state.combine === "+= accumulate" && c.state.reset,
  "fan-out lost: u + u counted once", { mustPassElsewhere: at({ x: 0 }, 4800) });
mutated("concept-autodiff-fanout", "af-ugrad", "text",
  after(1600, cat("u.grad = ", iff(eq(st("combine"), "+= accumulate"), 2, 1)), "u.grad = …"),
  (c) => c.time >= 1600 && !c.state.reset && c.state.calls >= 2 && c.state.combine === "+= accumulate",
  "repeated backward without reset reported as fresh", { mustPassElsewhere: at({ reset: true, calls: 3 }, 4800) });
mutated("concept-autodiff-fanout", "af-xu-b", "opacity", 1,
  at({ slots: "One slot only" }, 4800), "ignored operand slot drawn as active",
  { mustPassElsewhere: at({ slots: "Both operand slots" }, 4800) });

// 12 residual and normalization
const a12s = st("slope"),
  L12 = st("layers"),
  a2s = st("a2"),
  comp12 = st("batch");
const pk12 = (vals) => iff(eq(comp12, "alone"), vals[0], iff(eq(comp12, "with [5, 9]"), vals[1], vals[2]));
const meanB = div(add(1, a2s, pk12([0, 14, 0])), pk12([2, 4, 4]));
const varB = sub(div(add(1, mul(a2s, a2s), pk12([0, 106, 0])), pk12([2, 4, 4])), mul(meanB, meanB));
const nb = (v) => div(sub(v, meanB), sqrt(add(varB, 0.00001)));
mutated("concept-residual-norm", "rn-skip", "text",
  after(1600, cat("skip (1+F′)^L: ", r6(add(1, pow(a12s, L12)))), "skip (1+F′)^L: …"),
  (c) => c.time === 4800 && c.state.layers > 1 && c.state.slope !== 0, "identity added once, not once per layer",
  { mustPassElsewhere: at({ layers: 1, slope: 0.1 }, 4800) });
mutated("concept-residual-norm", "rn-out", "text",
  after(3200, cat("A → [", r3(nb(1)), ", ", r3(nb(a2s)), "]"), "A → …"),
  from({ axis: "Per token", batch: "with [5, 9]" }, 3200), "statistics taken over the whole batch",
  { mustPassElsewhere: at({ axis: "Per token", batch: "alone" }, 4800) });
mutated("concept-residual-norm", "rn-bar-skip-10", "opacity", 1,
  (c) => c.state.layers < 10 && c.time === 4800, "bars drawn past the chosen depth",
  { mustPassElsewhere: at({ layers: 10 }, 4800) });

// 13 embedding gather and scatter
const ids13 = [st("id0"), st("id1"), st("id2")];
const E13 = [[1, 0], [0, 1], [1, 1], [-1, 0]],
  G13 = [[1, 2], [2, -1], [-0.5, 3]];
const row13 = (id, c) => iff(eq(id, 0), E13[0][c], iff(eq(id, 1), E13[1][c], iff(eq(id, 2), E13[2][c], E13[3][c])));
const lastWins = (r, c) =>
  iff(eq(ids13[2], r), G13[2][c], iff(eq(ids13[1], r), G13[1][c], iff(eq(ids13[0], r), G13[0][c], 0)));
mutated("concept-embedding-scatter", "es-grad-2", "text",
  after(3200, cat("∂E2 = [", r3(lastWins(2, 0)), ", ", r3(lastWins(2, 1)), "]"), "∂E2 = …"),
  from({ id0: 2, id2: 2, scatter: "Accumulate (+=)" }, 3200), "repeated row overwritten instead of accumulated",
  { mustPassElsewhere: at({ id0: 2, id1: 0, id2: 1, scatter: "Accumulate (+=)" }, 4800) });
mutated("concept-embedding-scatter", "es-x-0", "text", after(1600, "x0 = [1, 0]", "x0 = …"),
  (c) => c.time === 4800 && c.state.id0 !== 0, "row chosen by position instead of token ID",
  { mustPassElsewhere: at({ id0: 0 }, 4800) });
mutated("concept-embedding-scatter", "es-x-2", "text",
  after(1600, cat("x2 = [", r3(row13(ids13[2], 0)), ", ", r3(row13(ids13[2], 1)), "]"), "x2 = …"),
  at({ positions: true }, 4800), "position vectors dropped from the input",
  { mustPassElsewhere: at({ positions: false }, 4800) });

// 14 LoRA
const sc14 = st("scale"),
  x314 = st("x3");
const inner14 = add(1, -3, mul(2, x314));
mutated("concept-lora-update", "lo-count", "text", cat("rank ", st("rank"), ": ", add(mul(3, st("rank")), 4), " trainable"),
  (c) => c.state.rank > 1 && c.time === 4800, "A counted once regardless of rank", { mustPassElsewhere: at({ rank: 1 }, 4800) });
mutated("concept-lora-update", "lo-da", "text",
  after(4000, cat("∂A = [", ...[1, 2, 3].flatMap((v) => [r3(mul(sc14, 1.5, v)), ", "]), r3(mul(sc14, 1.5, x314)), "]"), "∂A = …"),
  (c) => c.time >= 4000 && c.state.init === "B starts at zero" && c.state.scale !== 0,
  "∂A computed with the lesson's B after B started at zero",
  { mustPassElsewhere: at({ init: "Lesson A and B" }, 4800) });
mutated("concept-lora-update", "lo-dy", "text",
  after(2400, cat("Δy = [", r3(mul(2, inner14)), ", ", r3(mul(-1, inner14)), ", ", r3(mul(0.5, inner14)), "]"), "Δy = …"),
  (c) => c.time >= 2400 && c.state.scale !== 1 && c.state.init === "Lesson A and B" && c.state.x3 !== 1, "scale s ignored",
  { mustPassElsewhere: at({ scale: 1, init: "Lesson A and B" }, 4800) });

mutated("concept-lora-update", "lo-verdict", "text",
  after(4000, iff(eq(st("init"), "Both start at zero"), "no factor can learn",
    iff(eq(st("init"), "B starts at zero"), iff(eq(sc14, 0), "no factor can learn", "Δy is 0, B still learns"),
      iff(eq(sc14, 0), "no factor can learn", iff(eq(x314, 1), "only A gets a signal", "both factors learn")))), "…"),
  (c) => c.time === 4800 && c.state.scale === 0 && c.state.init !== "Both start at zero",
  "zero scale reported as a factor that cannot learn",
  { mustPassElsewhere: at({ scale: 1, init: "B starts at zero", x3: 4 }, 4800) });

// 15 parallel messages
const w15 = st("w"),
  v15 = st("v");
mutated("concept-parallel-split", "ps-msg", "text",
  after(5600, cat("sent: ", r3(mul(sub(mul(v15, w15), 4), w15))), "sent: …"),
  (c) => c.time >= 5600 && c.state.message === "dL/dh (correct)" && c.state.w !== c.state.v && c.state.v * c.state.w !== 4,
  "stage B returns its weight gradient instead of dL/dh",
  { mustPassElsewhere: at({ w: 3, v: 3, message: "dL/dh (correct)" }, 6000) });
mutated("concept-parallel-split", "ps-weighted", "text", after(3200, "weighted = 4", "weighted = …"),
  (c) => c.time === 6000 && c.state.n2 > 1, "equal average of replica means",
  { mustPassElsewhere: at({ n2: 1 }, 6000) });
mutated("concept-parallel-split", "ps-verdict", "text", after(2400, "contract matches", "…"),
  (c) => c.time === 6000 && (c.state.split === "Output columns") !== (c.state.combine === "Concatenate"),
  "combine contract never checked", { mustPassElsewhere: at({ split: "Input features", combine: "Sum" }, 6000) });

// 16 streaming log-sum-exp
const exp16 = (v) => pow(Math.E, v),
  z316 = st("z3"),
  tg16 = st("target");
const pick16 = (vals) => iff(eq(tg16, "z0"), vals[0], iff(eq(tg16, "z1"), vals[1], iff(eq(tg16, "z2"), vals[2], vals[3])));
const M16 = max(1000, z316),
  m216 = max(998, z316);
const s16 = add(exp16(sub(1000, M16)), exp16(sub(999, M16)), exp16(sub(998, M16)), exp16(sub(z316, M16)));
const ln16 = (sv) => {
  const u = div(sub(sv, 1), add(sv, 1));
  return add(...Array.from({ length: 16 }, (_, i) => mul(2 / (2 * i + 1), pow(u, 2 * i + 1))));
};
mutated("concept-streaming-lse", "sl-tile", "text",
  after(800, cat("tile: ", r3(div(mul(4, 256, st("N")), 1048576)), " MiB"), "tile: …"),
  (c) => c.time === 5200 && c.state.tile === "256 token rows" && c.state.N !== c.state.V, "row tile sized by N instead of V",
  { mustPassElsewhere: at({ N: 1024, V: 1024, tile: "256 token rows" }, 5200) });
mutated("concept-streaming-lse", "sl-ok", "text",
  after(3600, cat("rescaled: ", r3(add(M16, ln16(s16), mul(-1, pick16([1000, 999, 1000, 999]))))), "rescaled: …"),
  (c) => c.time >= 3600 && (c.state.target === "z2" || c.state.target === "z3"), "target logit read at its tile-local index",
  { mustPassElsewhere: at({ target: "z0" }, 5200) });
mutated("concept-streaming-lse", "sl-p", "text",
  after(4400, cat("p(target) = ", r3(div(exp16(sub(pick16([1000, 999, 998, z316]), pick16([1000, 1000, m216, m216]))),
    pick16([1, 1, 0, 0].map((tile1) => (tile1 ? add(1, exp16(-1)) : add(exp16(sub(998, m216)), exp16(sub(z316, m216))))))))), "p(target) = …"),
  (c) => c.time >= 4400, "probability normalized within the target's tile only");

// ------------------------------------------------ runtime contract checks
for (const scene of scenes) {
  assert(flattenNodes(new VisualRuntime(scene).getSnapshot().frame.nodes).length <= 400);
  const runtime = new VisualRuntime(scene, { viewportWidth: 320, seed: 42 });
  const firstNumber = Object.entries(scene.state).find(([, f]) => f.kind === "number");
  const [key, field] = firstNumber;
  runtime.setState({ [key]: field.max });
  runtime.seek(scene.timeline.durationMs * 0.37);
  const replay = runtime.exportReplay(),
    other = new VisualRuntime(scene, { viewportWidth: 320, seed: 17 });
  other.restoreReplay(replay);
  other.seek(runtime.getSnapshot().frame.timeMs);
  assert.deepEqual(other.getSnapshot().frame, runtime.getSnapshot().frame);
  const reduced = new VisualRuntime(scene, { reducedMotion: true });
  assert.equal(reduced.getSnapshot().frame.timeMs, scene.accessibility.reducedMotion.atMs);
  assert.equal(scene.accessibility.reducedMotion.atMs, scene.timeline.durationMs);
  reduced.play();
  reduced.advance(100);
  assert.equal(reduced.getSnapshot().playing, false);
  assert(scene.accessibility.text.length > 400, `${scene.id} text alternative too short`);
  assert(scene.timeline.cues.length >= 4);
  const hookItem = reference.cases.find((c) => c.scene === scene.id && c.time === scene.timeline.durationMs);
  const hookId = scene.referenceChecks[0];
  const checked = new VisualRuntime(scene, {
    referenceChecks: { [hookId]: (frame) => (verify(frame, hookItem), { passed: true }) },
  });
  checked.setState(hookItem.state);
  checked.seek(hookItem.time);
  assert(checked.runReferenceChecks()[0].passed);
  assert.equal(new VisualRuntime(scene).runReferenceChecks()[0].passed, false, "unregistered hooks never claim success");
  assert.throws(() => runtime.setState({ [key]: Infinity }));
  assert.throws(() => runtime.setState({ [key]: field.max + 1 }));
  const broken = structuredClone(scene);
  broken.nodes[0].x = { op: "eval", args: ["alert(1)"] };
  assert.throws(() => parseScene(broken));
  const overflow = structuredClone(scene);
  overflow.nodes[0].x = { op: "pow", args: [1000000000, 2] };
  assert.throws(() => new VisualRuntime(overflow));
  assert.deepEqual(fromVisualExperience(toVisualExperience(scene)), scene);
}
// No private identifiers in delivered concept material.
const deliveredText = JSON.stringify(overlay);
for (const forbidden of [/M5\b/, /\bTAH\b/, /\bSN9\b/, /IOTA/, /wallet/i, /\.local\b/, /@[a-z0-9-]+\.[a-z]/i, /roee|tnt-/i])
  assert(!forbidden.test(deliveredText), `delivered overlay contains ${forbidden}`);

console.log(
  JSON.stringify({
    cpuFrames: frameCount,
    oracleCases: reference.cases.length,
    framesPerScene: perScene,
    layouts: ["compact", "expanded"],
    oracle: reference.independentChecks,
    negativeControls: negatives,
    negativeControlCount: negatives.length,
    replay: true,
    reducedMotion: true,
    registeredReferenceHooks: true,
    compiledVisuals: compiled.learner.visuals.length,
    compiledChapters: compiled.learner.chapters.length,
    compiledEpisodes: learnerEpisodes.length,
    consumption: process.env.COURSE_VISUALS_ARTIFACT ? "explicit-development-built-artifact" : "released-package",
  }),
);

if (process.argv.includes("--browser")) await browserQA();
async function browserQA() {
  const require = createRequire(entry);
  const { build } = require("esbuild");
  const { chromium } = require("playwright");
  const directory = path.dirname(fileURLToPath(entry)),
    packageRoot = path.dirname(directory);
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {VisualPlayer} from './react.js';import {fromVisualExperience} from './headless.js';const all=await(await fetch('/visuals.json')).json();const i=Number(new URL(location.href).searchParams.get('scene')||0);createRoot(document.getElementById('root')).render(React.createElement(VisualPlayer,{scene:fromVisualExperience(all[i]),onError:e=>console.error(e.message)}));`,
      resolveDir: directory,
      sourcefile: "concept-qa.mjs",
      loader: "js",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
    nodePaths: [path.join(packageRoot, "node_modules")],
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const assets = {
    "/app.js": { type: "text/javascript", body: result.outputFiles[0].contents },
    "/visuals.json": { type: "application/json", body: JSON.stringify(overlay.visuals) },
    "/styles.css": { type: "text/css", body: await readFile(path.join(directory, "styles.css")) },
    "/": {
      type: "text/html",
      body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private concept visual QA</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/styles.css"><style>*{box-sizing:border-box}body{margin:0;background:#f3f6f2;color:#19383e;font-family:system-ui}main{max-width:1080px;padding:12px;margin:0 auto}.ccv-player{margin:0}h1{font-size:20px;margin:12px 0 20px}button,input,select{font:inherit}</style></head><body><main><h1>Concepts · interactive studies</h1><div id="root"></div></main><script type="module" src="/app.js"></script></body></html>',
    },
  };
  const server = createServer((req, res) => {
    const asset = assets[new URL(req.url, "http://127.0.0.1").pathname];
    if (!asset) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "Content-Type": asset.type, "Cache-Control": "no-store" }).end(asset.body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const output = await mkdtemp(path.join(tmpdir(), "private-concept-visual-qa-"));
  await chmod(output, 0o700);
  let browser;
  const reports = [];
  const svgHtml = (page) => page.locator("svg.ccv-scene").innerHTML();
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-gpu"] });
    for (const viewport of [
      { width: 320, height: 900 },
      { width: 390, height: 844 },
      { width: 700, height: 1000 },
      { width: 834, height: 1112 },
      { width: 1440, height: 1000 },
    ]) {
      const touch = viewport.width < 1000;
      const context = await browser.newContext({ viewport, hasTouch: touch });
      await context.route("**/*", (route) =>
        route.request().url().startsWith(origin) ? route.continue() : route.abort(),
      );
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        await page.goto(`${origin}/?scene=${i}`);
        await page.locator("svg.ccv-scene").waitFor();
        const timeline = page.getByRole("slider", { name: "Timeline", exact: true });
        const mid = Math.round(scene.timeline.durationMs * 0.6 / 10) * 10;
        await timeline.fill(String(mid));
        let before = await svgHtml(page);
        // Keyboard seek through a step boundary changes the drawn SVG.
        for (let k = 0; k < 200 && (await svgHtml(page)) === before; k++) await timeline.press("ArrowRight");
        assert.notEqual(await svgHtml(page), before, `${scene.id}: keyboard seek changes actual SVG`);
        await timeline.fill(String(scene.timeline.durationMs));
        const interactions = [];
        // Every native control: keyboard for numbers, selection for enums, tap/click for booleans.
        for (const [key, field] of Object.entries(scene.state)) {
          const control = page.getByRole(field.kind === "number" ? "slider" : field.kind === "boolean" ? "checkbox" : "combobox", {
            name: field.label,
            exact: true,
          });
          before = await svgHtml(page);
          if (field.kind === "number") {
            await control.focus();
            await control.press(field.initial > field.min ? "ArrowLeft" : "ArrowRight");
            const expected = field.initial > field.min ? field.initial - field.step : field.initial + field.step;
            assert(Math.abs(Number(await control.inputValue()) - expected) < 1e-9, `${scene.id} ${key} keyboard step`);
          } else if (field.kind === "boolean") {
            if (touch) await control.tap();
            else await control.click();
            assert.equal(await control.isChecked(), !field.initial);
          } else {
            const next = field.options.find((o) => o !== field.initial);
            await control.selectOption(next);
            assert.equal(await control.inputValue(), next);
          }
          interactions.push(key);
        }
        assert.notEqual(await svgHtml(page), before, `${scene.id}: control changes actual SVG`);
        // In-canvas handles: keyboard activation/arrow and touch tap or pointer drag.
        const handles = flattenNodes(scene.nodes).filter((n) => n.manipulate);
        for (const h of handles) {
          const node = page.locator(`[data-node-id="${h.id}"]`);
          const target = h.manipulate.activate ?? h.manipulate.x;
          const control = page.getByRole(scene.state[target.state].kind === "number" ? "slider" : "combobox", {
            name: scene.state[target.state].label,
            exact: true,
          });
          if (h.manipulate.activate) {
            const other = scene.state[target.state].options.find((o) => o !== h.manipulate.activate.value);
            await control.selectOption(other);
            await node.focus();
            await page.keyboard.press("Enter");
            assert.equal(await control.inputValue(), String(h.manipulate.activate.value), `${h.id} keyboard activate`);
            await control.selectOption(other);
            await node.scrollIntoViewIfNeeded();
            if (touch) await node.tap();
            else await node.click();
            assert.equal(await control.inputValue(), String(h.manipulate.activate.value), `${h.id} tap/click`);
          } else {
            const field = scene.state[target.state];
            await control.fill(String(field.initial));
            await node.focus();
            const up = field.initial < field.max;
            await node.press(up ? "ArrowRight" : "ArrowLeft");
            assert(
              Math.abs(Number(await control.inputValue()) - (field.initial + (up ? 1 : -1) * field.step)) < 1e-9,
              `${h.id} arrow`,
            );
            await node.scrollIntoViewIfNeeded();
            const box = await node.boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + 2, box.y + box.height / 2, { steps: 5 });
            await page.mouse.up();
            assert.equal(Number(await control.inputValue()), field.min, `${h.id} drag to minimum`);
          }
          interactions.push(h.id);
        }
        // Resize across the breakpoint preserves time and state.
        const savedTime = await timeline.inputValue();
        const savedState = await page.locator(".ccv-controls").evaluate((el) =>
          [...el.querySelectorAll("input,select")].map((c) => (c.type === "checkbox" ? c.checked : c.value)),
        );
        await page.setViewportSize({ width: viewport.width < 800 ? 960 : 390, height: 900 });
        await page.waitForFunction(
          (expected) => document.querySelector("svg.ccv-scene")?.dataset.layout === expected,
          viewport.width < 800 ? "expanded" : "compact",
        );
        assert.equal(await timeline.inputValue(), savedTime);
        await page.setViewportSize(viewport);
        await page.waitForFunction(
          (expected) => document.querySelector("svg.ccv-scene")?.dataset.layout === expected,
          viewport.width < 800 ? "compact" : "expanded",
        );
        assert.deepEqual(
          await page.locator(".ccv-controls").evaluate((el) =>
            [...el.querySelectorAll("input,select")].map((c) => (c.type === "checkbox" ? c.checked : c.value)),
          ),
          savedState,
        );
        const measurements = [];
        for (const time of [0, Math.round(scene.timeline.durationMs / 20) * 10, scene.timeline.durationMs]) {
          await timeline.fill(String(time));
          const sizing = await page.evaluate(() => {
            const svg = document.querySelector("svg.ccv-scene"),
              box = svg.getBoundingClientRect();
            const visibleText = [...svg.querySelectorAll("text")].filter((el) => {
              let p = el;
              while (p && p !== svg) {
                if (Number(p.getAttribute("opacity") ?? 1) === 0) return false;
                p = p.parentElement;
              }
              return true;
            });
            const overflow = visibleText
              .filter((el) => {
                const r = el.getBoundingClientRect();
                return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1;
              })
              .map((el) => el.parentElement.dataset.nodeId);
            const minFont = Math.min(
              ...visibleText.map(
                (el) => Number(el.getAttribute("font-size")) * Math.hypot(el.getScreenCTM().a, el.getScreenCTM().b),
              ),
            );
            const overlaps = [];
            for (let a = 0; a < visibleText.length; a++)
              for (let b = a + 1; b < visibleText.length; b++) {
                const x = visibleText[a].getBoundingClientRect(),
                  y = visibleText[b].getBoundingClientRect();
                if (
                  Math.min(x.right, y.right) - Math.max(x.left, y.left) > 2 &&
                  Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 2
                )
                  overlaps.push([visibleText[a].parentElement.dataset.nodeId, visibleText[b].parentElement.dataset.nodeId]);
              }
            // Text that runs past the right edge of its card background.
            const cardEscape = [];
            for (const group of svg.querySelectorAll("[data-node-id]")) {
              const id = group.dataset.nodeId,
                bg = svg.querySelector(`[data-node-id="${id}-bg"]`);
              if (!bg || !group.contains(bg)) continue;
              const card = bg.getBoundingClientRect();
              for (const el of group.querySelectorAll("text")) {
                if (!visibleText.includes(el)) continue;
                const r = el.getBoundingClientRect();
                if (r.left < card.left - 1 || r.right > card.right + 1 || r.top < card.top - 1 || r.bottom > card.bottom + 1)
                  cardEscape.push(el.parentElement.dataset.nodeId);
              }
            }
            return {
              overflow,
              overlaps,
              cardEscape,
              minFont,
              pageOverflow: document.documentElement.scrollWidth > innerWidth,
              layout: svg.dataset.layout,
            };
          });
          measurements.push(sizing);
          const detail = JSON.stringify({ scene: scene.id, viewport, time, sizing });
          assert.deepEqual(sizing.overflow, [], detail);
          assert.deepEqual(sizing.overlaps, [], detail);
          assert.deepEqual(sizing.cardEscape, [], detail);
          assert(!sizing.pageOverflow, detail);
          assert(sizing.minFont >= 14, detail);
        }
        const shot = path.join(output, `${scene.id}-${viewport.width}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        await timeline.fill("0");
        await page.getByRole("button", { name: "Play animation", exact: true }).click();
        await page.waitForTimeout(180);
        assert.notEqual(await timeline.inputValue(), "0", "playback advances");
        await page.getByRole("button", { name: "Pause animation", exact: true }).click();
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForFunction(() => document.querySelector(".ccv-player")?.dataset.reducedMotion === "true");
        assert(await page.getByRole("button", { name: "Play animation", exact: true }).isDisabled());
        assert.equal(await page.locator("details.ccv-text").getAttribute("open"), "");
        assert((await page.locator(".ccv-player").textContent()).includes(scene.accessibility.text));
        await page.screenshot({ path: path.join(output, `${scene.id}-${viewport.width}-reduced.png`), fullPage: true });
        await page.emulateMedia({ reducedMotion: "no-preference" });
        reports.push({
          scene: scene.id,
          width: viewport.width,
          layout: measurements[0].layout,
          minFont: Math.min(...measurements.map((m) => m.minFont)),
          interactions,
        });
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    await writeFile(
      path.join(output, "report.json"),
      JSON.stringify({ reports, browser: browser.version(), cpuOnlyBrowser: true, privateLocalOnly: true }, null, 2),
    );
    const minimum = (layout) => Math.min(...reports.filter((r) => r.layout === layout).map((r) => r.minFont));
    console.log(
      JSON.stringify({
        browserCases: reports.length,
        browser: browser.version(),
        minFontCompact: Number(minimum("compact").toFixed(2)),
        minFontExpanded: Number(minimum("expanded").toFixed(2)),
        screenshots: output,
      }),
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
