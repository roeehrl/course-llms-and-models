// Read-only verification of the nine learning scenes, except optional private
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
const data = await read("visuals/learning-scenes.json");
const overlay = await read("content/learning-visuals.json");
const scenes = overlay.visuals.map(fromVisualExperience);
assert.deepEqual(scenes, data.scenes, "Delivered overlay differs from authored scenes");
assert.deepEqual(overlay.bindings, data.bindings);
assert(scenes.length >= 8 && scenes.length <= 10);

// ------------------------------------------------ full-curriculum integration
// Same overlays and order as scripts/assemble.mjs, compiled in memory through
// the released SDK. Nothing is written.
const config = await read("content/course-config.json");
const modules = await Promise.all(fragments.map((n) => read(`content/${n}.json`)));
const baseVisuals = await read("content/visuals.json");
const systemsVisuals = await read("content/systems-visuals.json");
const compiled = assemble(config, modules, {
  visualOverlay: baseVisuals,
  visualOverlays: [systemsVisuals, overlay],
  practicalOverlay: await read("content/practicals-qualified.json"),
  recoveryOverlay: await read("content/recovery-runtime.json"),
});
const allBindings = [...baseVisuals.bindings, ...systemsVisuals.bindings, ...overlay.bindings];
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
  course.visuals.push(...baseVisuals.visuals, ...systemsVisuals.visuals, ...overlay.visuals);
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
  ["-I", fileURLToPath(new URL("verification/learning-visual-reference.py", root))],
  { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
);
assert.equal(oracle.status, 0, oracle.stderr);
const reference = JSON.parse(oracle.stdout);
const lastNumber = (text) => text?.match(/(-?\d+(?:\.\d+)?)\D*$/)?.[1];

// Conservative headless layout lint (0.62·fontSize advance, as the package's
// own text bounds): visible text inside its card and the canvas, no overlaps,
// no text under 17 scene units.
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
      } else if (n.kind === "rect" && n.visible && n.opacity > 0 && !inside(n.bounds, container))
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
  lt = (a, b) => op("lt", a, b),
  gt = (a, b) => op("gt", a, b),
  floor = (v) => op("floor", v),
  cat = (...v) => op("concat", ...v),
  r3 = (v) => div(op("round", mul(v, 1000)), 1000);
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
  if (mustPassElsewhere) {
    // Shows the control is a realistic bug: it is invisible on an easy case.
    const easy = reference.cases.find((c) => c.scene === sceneId && mustPassElsewhere(c));
    const runtime = new VisualRuntime(scene, { viewportWidth: 960 });
    runtime.setState(easy.state);
    runtime.seek(easy.time);
    verify(runtime.getSnapshot().frame, easy);
  }
  negatives.push({ scene: sceneId, control: label, rejectedCases: items.length });
}
const at = (state, time) => (c) =>
  Object.entries(state).every(([k, v]) => c.state[k] === v) && (time === undefined || c.time === time);

// 01 float order
const E = st("E"),
  b = st("b"),
  coarse = op("pow", 2, sub(E, 23));
mutated("learning-float-order", "fo-left-result", "text",
  cat("(a+b)+c = ", mul(floor(add(div(b, coarse), 0.5)), coarse)),
  at({ fmt: "FP32", E: 24, b: 1 }, 5000), "ties rounded away from zero instead of to even",
  { mustPassElsewhere: at({ fmt: "FP32", E: 23, b: 1 }, 5000) });
{
  const q = div(b, coarse),
    f = floor(q),
    fr = sub(q, f);
  mutated("learning-float-order", "fo-right-result", "text",
    cat("a+(b+c) = ", mul(iff(gt(fr, 0.5), add(f, 1), iff(lt(fr, 0.5), f, add(f, op("mod", f, 2)))), coarse)),
    at({ fmt: "FP32", E: 24, b: 1 }, 5000), "b+c rounded on a's coarser grid (wrong binade)");
}
// 02 fan-out
const w = st("w");
mutated("learning-fanout-backward", "fa-grad", "text",
  cat("bar(w) = ", iff(ge(t, 3300), w, iff(ge(t, 2300), 1, 0))),
  at({ w: 3, rule: "Accumulate (+=)", rate: 0.1 }, 6000), "gradient overwritten instead of accumulated");
mutated("learning-fanout-backward", "fa-stored", "text",
  cat("stored w = ", r3(iff(ge(t, 2300), sub(w, mul(st("rate"), add(1, mul(2, w)))), w))),
  at({ w: 3, rule: "Accumulate (+=)", rate: 0.1 }, 3300), "weight updated during backward");
// 03 optimizer
mutated("learning-optimizer-state", "op-w2", "text", "w2 = 0.9",
  at({ optimizer: "Momentum", g2: -1, dropState: false }, 4500), "momentum state silently reset between steps");
mutated("learning-optimizer-state", "op-total", "text",
  cat("total = ", mul(st("params"), add(iff(eq(st("weights"), "FP32 weights"), 4, 2),
    iff(eq(st("optimizer"), "SGD"), 0, iff(eq(st("optimizer"), "Momentum"), 4, 8)))), " B"),
  at({ optimizer: "AdamW", params: 6, weights: "FP32 weights" }, 4500), "memory ledger forgets gradient buffers");
// 04 softmax: exponentiate raw logits (no max subtraction). Hidden at shift 0.
{
  const scene = scenes.find((s) => s.id === "learning-softmax-cross-entropy");
  const zs = [st("z0"), 0, 0].map((z) => add(z, st("shift")));
  const e = zs.map((z) => op("pow", Math.E, z));
  for (let i = 0; i < 3; i++)
    mutated(scene.id, `ce-p-${i}`, "text",
      iff(ge(t, 1600), cat(`p${i} = `, r3(div(e[i], add(...e)))), `p${i} = …`),
      (c) => c.state.shift === 1000 && c.time === 4000, `naive softmax overflow (p${i})`,
      { mustPassElsewhere: (c) => c.state.shift === 0 && c.time === 4000 });
}
mutated("learning-softmax-cross-entropy", "ce-g-1", "text", (expr) => {
  const negated = structuredClone(expr); // if(t ≥ 3400, concat(label, r3(g)), pending)
  negated.args[1].args[1] = mul(-1, negated.args[1].args[1]);
  return negated;
}, (c) => c.state.target === "ID 1" && c.time === 4000, "gradient sign flipped (onehot − p)");
mutated("learning-softmax-cross-entropy", "ce-p-bar-0", "width", 128,
  (c) => c.state.target === "ID 1" && c.time === 2100 && c.state.shift === 0, "frozen probability bar mid-reveal");
// 05 KV cache
const kvT = add(st("prompt"), op("clamp", floor(div(t, 1000)), 0, 8));
mutated("learning-kv-cache", "kv-bytes", "text",
  cat("cache = ", mul(2, st("layers"), st("batch"), st("queryHeads"), st("headDim"), st("bytes"), kvT), " B"),
  at({ layers: 3, batch: 2, kvHeads: 2, prompt: 5, queryHeads: 4 }), "query heads used instead of KV heads");
mutated("learning-kv-cache", "kv-reads", "text", cat("new query reads ", st("prompt")),
  (c) => c.time >= 1000 && c.state.prompt === 5, "decode work treated as constant");
mutated("learning-kv-cache", "kv-bytes", "text",
  cat("cache = ", mul(st("layers"), st("batch"), st("kvHeads"), st("headDim"), st("bytes"), kvT), " B"),
  at({ layers: 3, batch: 2, kvHeads: 2, prompt: 5 }), "values forgotten (missing factor 2)");
// 06 lazy
mutated("learning-lazy-evaluation", "lz-wnew", "text",
  iff(lt(t, 1600), "w_new: not built", cat("w_new = ", r3(sub(w, mul(st("lr"), mul(2.5, sub(w, 2))))))),
  (c) => c.state.eval === "eval(loss)" && c.time >= 2800, "eval(loss) claims w_new was materialized");
mutated("learning-lazy-evaluation", "lz-next-loss", "text",
  iff(ge(t, 4200), cat("next L = ", r3(mul(1.25, sub(w, 2), sub(w, 2)))), "next L = …"),
  at({ eval: "eval(loss, grad, w_new)", w: 1, lr: 0.1 }, 5000), "next loss evaluated at the stale old weight");
// 07 finite but wrong
mutated("learning-finite-but-wrong", "fw-gate", "text", iff(ge(t, 3200), "gate: PASS", "gate: …"),
  at({ layout: "Transposed read (bug)", a: 0.25, b: 0.6 }, 4000), "finiteness-only release gate",
  { mustPassElsewhere: at({ layout: "Transposed read (bug)", a: 0.25, b: 0.75 }, 4000) });
mutated("learning-finite-but-wrong", "fw-dcand", "text",
  cat("5 D0 candidate = ", r3(add(sub(4, mul(2, st("a"))), mul(2, sub(3, mul(4, st("a"))))))),
  at({ layout: "Transposed read (bug)", a: 0.25, b: 0.6 }, 4000), "backward D row computed from the reference output");
// 08 recompute
mutated("learning-recompute-replay", "rc-g1", "text", cat("∂y/∂w1 = ", mul(st("earlyW2"), st("x"))),
  at({ policy: "Recompute, saved weights", earlyW2: 5, x: 4 }, 5000), "replay reads live weights despite a snapshot");
mutated("learning-recompute-replay", "rc-retained", "text", cat("retained: ", 4096, " B"),
  at({ policy: "Recompute, current weights" }, 5000), "recompute still retains the activation");
// 09 paired benchmark
mutated("learning-paired-benchmark", "pb-mean", "text", cat("mean R−C = ", 1.5),
  at({ order: "All reference first", drift: 1, warmup: false }, 5600), "summary reports the hoped-for gap, not the data");
mutated("learning-paired-benchmark", "pb-cand-0", "text",
  cat("C ", add(9, mul(st("drift"), iff(eq(st("order"), "Alternating (ABBA)"), 1, 4)))),
  at({ warmup: true }, 5600), "counted warm-up trial silently dropped");

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
// No private identifiers in delivered learning material.
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
      sourcefile: "learning-qa.mjs",
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
      body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private learning visual QA</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/styles.css"><style>*{box-sizing:border-box}body{margin:0;background:#f3f6f2;color:#19383e;font-family:system-ui}main{max-width:1080px;padding:12px;margin:0 auto}.ccv-player{margin:0}h1{font-size:20px;margin:12px 0 20px}button,input,select{font:inherit}</style></head><body><main><h1>Learning · interactive studies</h1><div id="root"></div></main><script type="module" src="/app.js"></script></body></html>',
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
  const output = await mkdtemp(path.join(tmpdir(), "private-learning-visual-qa-"));
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
