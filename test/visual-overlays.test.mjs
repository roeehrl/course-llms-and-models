import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,readdir} from 'node:fs/promises';
import {assemble,fragments,loadOverlays,VISUAL_OVERLAYS} from '../scripts/assemble.mjs';
import {stageWorkedExamples} from '../scripts/stage-worked-examples.mjs';

const root=new URL('../',import.meta.url),read=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
const isVisualOverlay=value=>value&&!Array.isArray(value)&&value.extension&&typeof value.extension==='object'&&Array.isArray(value.visuals)&&Array.isArray(value.bindings)&&value.bindings.every(b=>typeof b.visualId==='string');
/** Every illustration a content file declares: its overlay, the scene and where it is bound. */
async function declaredVisuals(){
  const declared=[];
  for(const file of (await readdir(new URL('content/',root))).filter(f=>f.endsWith('.json')).sort()){
    const value=await read(`content/${file}`);
    if(isVisualOverlay(value))for(const binding of value.bindings)declared.push({overlay:file.slice(0,-'.json'.length),visual:value.visuals.find(v=>v.id===binding.visualId),binding});
  }
  return declared;
}
/** Declared illustrations a compiled build lacks, unchanged and at its bound episode. */
function missingVisuals(compiled,declared){
  const episodes=new Map(compiled.server.chapters.flatMap(c=>c.episodes).map(e=>[e.id,e]));
  return declared.filter(({visual,binding})=>{
    const built=compiled.server.visuals.find(v=>v.id===binding.visualId),learner=compiled.learner.visuals.find(v=>v.id===binding.visualId);
    const blocks=episodes.get(binding.episodeId)?.blocks??[],at=blocks.findIndex(b=>b.id===`visual-${binding.visualId}`);
    try {assert.deepEqual(built,visual);assert.deepEqual(learner,visual);}catch{return true;}
    return !(at>0&&blocks[at].type==='visual'&&blocks[at].visualId===binding.visualId);
  }).map(({overlay,binding})=>`${overlay}:${binding.visualId}`);
}
const [config,modules,declared]=await Promise.all([read('content/course-config.json'),Promise.all(fragments.map(name=>read(`content/${name}.json`))),declaredVisuals()]);

test('the shared overlay list names every content file that declares illustrations',()=>{
  assert(declared.length>0);
  assert.deepEqual([...new Set(declared.map(d=>d.overlay))].sort(),[...VISUAL_OVERLAYS].sort(),'A visual overlay in content/ is missing from VISUAL_OVERLAYS (or listed but not present)');
  assert.equal(new Set(declared.map(d=>d.binding.visualId)).size,declared.length,'Each illustration is bound once');
  for(const {overlay,visual,binding} of declared)assert(visual,`${overlay} binds an undeclared visual ${binding.visualId}`);
});

test('main, recovery-baseline and worked-example builds carry every declared illustration',async()=>{
  const builds={
    main:assemble(config,modules,await loadOverlays()),
    recoveryBaseline:assemble(config,modules,await loadOverlays({recovery:false})),
    workedExamples:(await stageWorkedExamples()).compiled,
  };
  for(const [name,compiled] of Object.entries(builds)){
    assert.deepEqual(missingVisuals(compiled,declared),[],`${name} build omits declared illustrations`);
    assert.equal(compiled.server.visuals.length,declared.length,`${name} build carries undeclared illustrations`);
  }
});

test('a build that drops any one overlay is reported, naming the missing illustrations',async()=>{
  const overlays=await loadOverlays({recovery:false}),all=[overlays.visualOverlay,...overlays.visualOverlays];
  for(const [index,name] of VISUAL_OVERLAYS.entries()){
    const kept=all.filter((_,i)=>i!==index);
    const compiled=assemble(config,modules,{...overlays,visualOverlay:kept[0],visualOverlays:kept.slice(1)});
    const expected=declared.filter(d=>d.overlay===name).map(d=>`${name}:${d.binding.visualId}`);
    assert(expected.length>0);
    assert.deepEqual(missingVisuals(compiled,declared),expected);
  }
});
