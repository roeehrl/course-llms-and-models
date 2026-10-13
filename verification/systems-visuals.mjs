// Read-only verification except optional private temporary browser screenshots.
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, chmod } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { validateCourse } from "@course-core/sdk";
import { compileCourse } from "@course-core/sdk/compiler";
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
const data = JSON.parse(
  await readFile(new URL("visuals/systems-scenes.json", root), "utf8"),
);
const overlay = JSON.parse(
  await readFile(new URL("content/systems-visuals.json", root), "utf8"),
);
const scenes = overlay.visuals.map(fromVisualExperience);
assert.deepEqual(scenes, data.scenes);
assert.deepEqual(overlay.bindings, data.bindings);
// In-memory integration only. This does not edit/run the parent's assembler or
// rewrite its overlay. The parent merges renderer declarations at integration.
const course = JSON.parse(
  await readFile(new URL("content/course-config.json", root), "utf8"),
);
const modules = await Promise.all(
  [
    "foundations",
    "training-and-transformers",
    "systems-and-distribution",
    "engineering-practice",
  ].map(async (name) =>
    JSON.parse(await readFile(new URL(`content/${name}.json`, root), "utf8")),
  ),
);
for (const field of [
  "objectives",
  "chapters",
  "assessments",
  "gates",
  "sources",
  "visuals",
  "media",
  "extensions",
])
  course[field] = modules.flatMap((m) => m[field]);
course.sources = [...new Map(course.sources.map((s) => [s.id, s])).values()];
course.visuals.push(...overlay.visuals);
course.extensions.push(overlay.extension);
for (const b of data.bindings) {
  const e = course.chapters
    .flatMap((c) => c.episodes)
    .find((e) => e.id === b.episodeId);
  assert(e);
  const index = e.blocks.findIndex((block) => block.id === b.afterBlockId);
  assert(index >= 0);
  e.blocks.splice(index + 1, 0, {
    id: `visual-${b.visualId}`,
    type: "visual",
    visualId: b.visualId,
  });
}
const validation = validateCourse(course);
assert(validation.valid, JSON.stringify(validation.issues));
const compiled = compileCourse(course);
assert.equal(compiled.learner.visuals.length, 3);
const oracle = spawnSync(
  "python3",
  [fileURLToPath(new URL("verification/systems-visual-reference.py", root))],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
assert.equal(oracle.status, 0, oracle.stderr);
const reference = JSON.parse(oracle.stdout);
function verify(frame, item) {
  const nodes = new Map(flattenNodes(frame.nodes).map((n) => [n.id, n]));
  for (const [id, expected] of Object.entries(item.numeric)) {
    const value = nodes.get(id)?.text?.match(/(-?\d+(?:\.\d+)?)$/)?.[1];
    assert(
      value !== undefined && Math.abs(Number(value) - expected) <= 0.000501,
      `${item.scene} ${id} ${item.time}: numeric reference mismatch (${value} vs ${expected})`,
    );
  }
  for (const [id, expected] of Object.entries(item.exact))
    assert.equal(
      nodes.get(id)?.text,
      expected,
      `${id}: protocol text mismatch at ${item.time}`,
    );
  for (const [id, properties] of Object.entries(item.geometry))
    for (const [key, expected] of Object.entries(properties)) {
      const actual =
        key === "widthRatio"
          ? nodes.get(id).width / (frame.layout === "compact" ? 99 : 139)
          : nodes.get(id)[key];
      // Invisible expanded-only nodes inherit opacity from their hidden group.
      assert(
        Math.abs(actual - expected) < 1e-7,
        `${id}.${key}: intermediate geometry mismatch at ${item.time}: ${actual} vs ${expected}`,
      );
    }
  for (const n of nodes.values())
    if (n.kind === "link" && n.opacity > 0 && n.visible) {
      assert.equal(n.fill, "none", "connectors must not obscure the diagram");
      assert(
        n.bounds.x >= 0 &&
          n.bounds.y >= 0 &&
          n.bounds.x + n.bounds.width <= frame.width &&
          n.bounds.y + n.bounds.height <= frame.height,
        "connector geometry must remain inside its scene",
      );
    }
  for (const n of nodes.values())
    for (const key of [
      "x",
      "y",
      "width",
      "height",
      "opacity",
      "radius",
      "progress",
    ])
      assert(Number.isFinite(n[key]), `${n.id}.${key} finite`);
}
const runtimes = new Map();
let frameCount = 0;
for (const item of reference.cases)
  for (const width of [320, 960]) {
    const key = JSON.stringify([item.scene, item.state, width]);
    let runtime = runtimes.get(key);
    if (!runtime) {
      runtime = new VisualRuntime(
        scenes.find((s) => s.id === item.scene),
        { viewportWidth: width },
      );
      runtime.setState(item.state);
      runtimes.set(key, runtime);
    }
    runtime.seek(item.time);
    verify(runtime.getSnapshot().frame, item);
    frameCount++;
  }
const negatives = [];
function mutated(id, nodeId, field, value, itemPredicate, label) {
  const scene = structuredClone(scenes.find((s) => s.id === id));
  flattenNodes(scene.nodes).find((n) => n.id === nodeId)[field] = value;
  const item = reference.cases.find((c) => c.scene === id && itemPredicate(c));
  assert(item);
  const runtime = new VisualRuntime(scene, { viewportWidth: 960 });
  runtime.setState(item.state);
  runtime.seek(item.time);
  assert.throws(
    () => verify(runtime.getSnapshot().frame, item),
    /mismatch|connectors|connector geometry/,
  );
  negatives.push(label);
}
mutated(
  scenes[0].id,
  "prob-2",
  "text",
  "p = 0.2",
  (c) => c.state.mask === "Mask key 3",
  "masked probability leak",
);
mutated(
  scenes[0].id,
  "attention-output",
  "text",
  "O = 0",
  (c) => c.state.mask === "No keys",
  "empty row false success",
);
mutated(
  scenes[0].id,
  "prob-bar-0",
  "width",
  0,
  (c) => c.state.mask === "All keys" && c.time === 2550,
  "frozen intermediate probability bar",
);
mutated(
  scenes[1].id,
  "committed-weight",
  "text",
  "w = 0.825",
  (c) => c.state.weight === 1 && c.state.rate === 0.1 && c.time === 8500,
  "early optimizer update",
);
mutated(
  scenes[1].id,
  "batch-mean",
  "text",
  "Full mean g = 1.667",
  (c) => c.state.weight === 1,
  "unweighted microbatch means",
);
mutated(
  scenes[2].id,
  "output-value-1",
  "text",
  "0",
  (c) => c.state.tileRow === 0 && c.state.tileColumn === 0 && c.time === 4400,
  "reset accumulator on next tile",
);
mutated(
  scenes[2].id,
  "global-reads",
  "text",
  "Reads = 16",
  (c) => c.state.tileRow === 1 && c.state.tileColumn === 1 && c.time === 4000,
  "count padded global reads",
);
mutated(
  scenes[0].id,
  "query-link-0",
  "fill",
  "#00FFFF",
  (c) => c.time === 2550,
  "filled connector obscures content",
);
mutated(
  scenes[0].id,
  "query-link-0",
  "bend",
  20,
  (c) => c.time === 2550,
  "unbounded connector curve",
);
for (const scene of scenes) {
  const runtime = new VisualRuntime(scene, { viewportWidth: 320, seed: 42 });
  const first = Object.keys(scene.state)[0],
    field = scene.state[first];
  runtime.setState({ [first]: field.max });
  runtime.seek(scene.timeline.durationMs * 0.37);
  const replay = runtime.exportReplay(),
    other = new VisualRuntime(scene, { viewportWidth: 320, seed: 17 });
  other.restoreReplay(replay);
  other.seek(runtime.getSnapshot().frame.timeMs);
  assert.deepEqual(other.getSnapshot().frame, runtime.getSnapshot().frame);
  const reduced = new VisualRuntime(scene, { reducedMotion: true });
  assert.equal(
    reduced.getSnapshot().frame.timeMs,
    scene.accessibility.reducedMotion.atMs,
  );
  reduced.play();
  reduced.advance(100);
  assert.equal(reduced.getSnapshot().playing, false);
  assert(scene.accessibility.text.length > 200);
  const hookItem = reference.cases.find((c) => c.scene === scene.id);
  const hookId = scene.referenceChecks[0];
  const checked = new VisualRuntime(scene, {
    referenceChecks: {
      [hookId]: (frame) => {
        verify(frame, hookItem);
        return { passed: true };
      },
    },
  });
  checked.setState(hookItem.state);
  checked.seek(hookItem.time);
  assert(checked.runReferenceChecks()[0].passed);
  assert.equal(
    new VisualRuntime(scene).runReferenceChecks()[0].passed,
    false,
    "unregistered hooks never claim success",
  );
  assert.throws(() => runtime.setState({ [first]: Infinity }));
  assert.throws(() => runtime.setState({ [first]: field.max + 1 }));
  const broken = structuredClone(scene);
  broken.nodes[0].x = { op: "eval", args: ["alert(1)"] };
  assert.throws(() => parseScene(broken));
  const overflow = structuredClone(scene);
  overflow.nodes[0].x = { op: "pow", args: [1000000000, 2] };
  assert.throws(() => new VisualRuntime(overflow));
  assert.deepEqual(fromVisualExperience(toVisualExperience(scene)), scene);
}
console.log(
  JSON.stringify({
    cpuFrames: frameCount,
    layouts: ["compact", "expanded"],
    oracle: reference.independentChecks,
    negativeControls: negatives,
    replay: true,
    reducedMotion: true,
    registeredReferenceHooks: true,
    compiledEpisodes: compiled.learner.chapters.flatMap((c) => c.episodes)
      .length,
    consumption: process.env.COURSE_VISUALS_ARTIFACT
      ? "explicit-development-built-artifact"
      : "released-package",
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
      sourcefile: "systems-qa.mjs",
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
    "/app.js": {
      type: "text/javascript",
      body: result.outputFiles[0].contents,
    },
    "/visuals.json": {
      type: "application/json",
      body: JSON.stringify(overlay.visuals),
    },
    "/styles.css": {
      type: "text/css",
      body: await readFile(path.join(directory, "styles.css")),
    },
    "/": {
      type: "text/html",
      body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private systems visual QA</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/styles.css"><style>*{box-sizing:border-box}body{margin:0;background:#f3f6f2;color:#19383e;font-family:system-ui}main{max-width:1080px;padding:12px;margin:0 auto}.ccv-player{margin:0}h1{font-size:20px;margin:12px 0 20px}button,input,select{font:inherit}</style></head><body><main><h1>Systems · interactive studies</h1><div id="root"></div></main><script type="module" src="/app.js"></script></body></html>',
    },
  };
  const server = createServer((req, res) => {
    const asset = assets[new URL(req.url, "http://127.0.0.1").pathname];
    if (!asset) {
      res.writeHead(404).end();
      return;
    }
    res
      .writeHead(200, {
        "Content-Type": asset.type,
        "Cache-Control": "no-store",
      })
      .end(asset.body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const output = await mkdtemp(
    path.join(tmpdir(), "private-systems-visual-qa-"),
  );
  await chmod(output, 0o700);
  let browser;
  const reports = [];
  try {
    browser = await chromium.launch({
      channel: "chrome",
      headless: true,
      args: ["--disable-gpu"],
    });
    for (const viewport of [
      { width: 320, height: 900 },
      { width: 390, height: 844 },
      { width: 700, height: 1000 },
      { width: 834, height: 1112 },
      { width: 1440, height: 1000 },
    ]) {
      const context = await browser.newContext({
        viewport,
        hasTouch: viewport.width < 1000,
      });
      await context.route("**/*", (route) =>
        route.request().url().startsWith(origin)
          ? route.continue()
          : route.abort(),
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
        const timeline = page.getByRole("slider", {
          name: "Timeline",
          exact: true,
        });
        const mid = [2550, 8500, 4000][i];
        await timeline.fill(String(mid));
        const before = await page.locator("svg.ccv-scene").innerHTML();
        await timeline.press("ArrowRight");
        assert.notEqual(
          await page.locator("svg.ccv-scene").innerHTML(),
          before,
          "keyboard seek changes actual SVG",
        );
        const field = Object.values(scene.state)[0];
        const slider = page.getByRole("slider", {
          name: field.label,
          exact: true,
        });
        await slider.focus();
        await slider.press("ArrowLeft");
        assert.equal(
          await slider.inputValue(),
          String(Math.max(field.min, field.initial - field.step)),
        );
        if (i === 0) {
          const node = page.locator('[data-node-id="query-handle"]');
          await node.focus();
          await node.press("ArrowRight");
          assert.equal(await slider.inputValue(), String(field.initial));
          await node.scrollIntoViewIfNeeded();
          const handle = await node.boundingBox();
          assert(handle);
          await page.mouse.move(
            handle.x + handle.width / 4,
            handle.y + handle.height / 2,
          );
          await page.mouse.down();
          await page.mouse.move(
            handle.x + handle.width - 1,
            handle.y + handle.height / 2,
            { steps: 5 },
          );
          await page.mouse.up();
          assert.equal(await slider.inputValue(), String(field.max));
          await slider.fill(String(field.initial));
          await page
            .getByRole("combobox", { name: "Allowed keys", exact: true })
            .selectOption("No keys");
          assert.equal(
            await page
              .locator('[data-node-id="attention-output"] text')
              .textContent(),
            "Undefined",
          );
          await page
            .getByRole("combobox", { name: "Allowed keys", exact: true })
            .selectOption("All keys");
        }
        if (i === 2) {
          await page.locator('[data-node-id="select-cell-0-2-0"]').focus();
          await page.keyboard.press("Enter");
          assert.equal(await slider.inputValue(), "1");
          const columnCell = page.locator('[data-node-id="select-cell-1-0-2"]');
          if (viewport.width < 1000) await columnCell.tap();
          else await columnCell.click();
          assert.equal(
            await page
              .getByRole("slider", { name: "Output column tile", exact: true })
              .inputValue(),
            "1",
          );
        }
        const savedTime = await timeline.inputValue(),
          savedState = await slider.inputValue();
        await page.setViewportSize({
          width: viewport.width < 800 ? 960 : 390,
          height: 900,
        });
        await page.waitForFunction(
          (expected) =>
            document.querySelector("svg.ccv-scene")?.dataset.layout ===
            expected,
          viewport.width < 800 ? "expanded" : "compact",
        );
        assert.equal(await timeline.inputValue(), savedTime);
        assert.equal(await slider.inputValue(), savedState);
        await page.setViewportSize(viewport);
        await page.waitForFunction(
          (expected) =>
            document.querySelector("svg.ccv-scene")?.dataset.layout ===
            expected,
          viewport.width < 800 ? "compact" : "expanded",
        );
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
              return (
                r.left < box.left - 1 ||
                r.right > box.right + 1 ||
                r.top < box.top - 1 ||
                r.bottom > box.bottom + 1
              );
            })
            .map((el) => ({
              id: el.parentElement.dataset.nodeId,
              text: el.textContent,
            }));
          const minFont = Math.min(
            ...visibleText.map(
              (el) =>
                Number(el.getAttribute("font-size")) *
                Math.hypot(el.getScreenCTM().a, el.getScreenCTM().b),
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
                overlaps.push([
                  visibleText[a].parentElement.dataset.nodeId,
                  visibleText[b].parentElement.dataset.nodeId,
                ]);
            }
          return {
            overflow,
            overlaps,
            minFont,
            pageOverflow: document.documentElement.scrollWidth > innerWidth,
            layout: svg.dataset.layout,
          };
        });
        await page.screenshot({
          path: path.join(
            output,
            `${scene.id}-${viewport.width}-intermediate.png`,
          ),
          fullPage: true,
        });
        console.log(
          JSON.stringify({
            qaSnapshot: path.join(
              output,
              `${scene.id}-${viewport.width}-intermediate.png`,
            ),
            sizing,
          }),
        );
        assert.deepEqual(
          sizing.overflow,
          [],
          JSON.stringify({ scene: scene.id, viewport, sizing }),
        );
        assert.deepEqual(
          sizing.overlaps,
          [],
          JSON.stringify({ scene: scene.id, viewport, sizing }),
        );
        assert(!sizing.pageOverflow);
        assert(
          sizing.minFont >= 14,
          JSON.stringify({ scene: scene.id, viewport, sizing }),
        );

        await page
          .getByRole("button", { name: "Play animation", exact: true })
          .click();
        await page.waitForTimeout(180);
        await page
          .getByRole("button", { name: "Pause animation", exact: true })
          .click();
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForFunction(
          () =>
            document.querySelector(".ccv-player")?.dataset.reducedMotion ===
            "true",
        );
        assert(
          await page
            .getByRole("button", { name: "Play animation", exact: true })
            .isDisabled(),
        );
        assert.equal(
          await page.locator("details.ccv-text").getAttribute("open"),
          "",
        );
        assert(
          (await page.locator(".ccv-player").textContent()).includes(
            scene.accessibility.text,
          ),
        );
        await page.screenshot({
          path: path.join(output, `${scene.id}-${viewport.width}-reduced.png`),
          fullPage: true,
        });
        await page.emulateMedia({ reducedMotion: "no-preference" });
        reports.push({ scene: scene.id, width: viewport.width, ...sizing });
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    await writeFile(
      path.join(output, "report.json"),
      JSON.stringify(
        {
          reports,
          browser: browser.version(),
          cpuOnlyBrowser: true,
          privateLocalOnly: true,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        browserCases: reports.length,
        screenshots: output,
        reports,
      }),
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
