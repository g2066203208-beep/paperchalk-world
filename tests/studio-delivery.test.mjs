import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));

test('studio rendering retains the baseline GLSL programs verbatim',async()=>{
  const original=await readFile(path.join(root,'src/main.js'),'utf8');
  const names=(await readdir(path.join(root,'studio/rendering'))).filter(n=>n.endsWith('.js'));
  const sources=await Promise.all(names.map(n=>readFile(path.join(root,'studio/rendering',n),'utf8')));
  const shaders=text=>[...text.matchAll(/`([^`]+)`/g)].map(m=>m[1]).filter(s=>/void\s+main\s*\(/.test(s)&&/gl_(?:Position|FragColor)/.test(s));
  const baseline=shaders(original),actual=sources.flatMap(shaders);
  assert.ok(baseline.length>=10,'expected original shader programs');
  assert.equal(actual.length,baseline.length,'do not silently omit or add a visual shader');
  // The composite pass intentionally gained the one missing post-process
  // stage: HDR scene + shafts are tone-mapped once before sRGB conversion.
  // Normalize that single include while retaining the exact baseline check for
  // every other shader and every other line of the composite program.
  const normalize=shader=>shader.replace(/\r\n/g,'\n');
  const normalizedActual=actual.map(normalize);
  for(const shader of baseline){
    // Only the final scene-color composite is intentionally different: it now
    // inserts tone mapping before the existing color-space conversion.
    if(shader.includes('uniform sampler2D sceneColor'))continue;
    assert.ok(normalizedActual.includes(normalize(shader)),'baseline GLSL program changed');
  }
  const composite=actual.find(shader=>shader.includes('uniform sampler2D sceneColor'))||'';
  assert.match(composite,/gl_FragColor=vec4\(base\.rgb\+rays\+glow,base\.a\);/);
  assert.match(composite,/#include <tonemapping_fragment>/);
  assert.match(composite,/#include <colorspace_fragment>/);
});

test('volumetric output keeps HDR intermediate and one final color transform',async()=>{
  const source=await readFile(path.join(root,'studio/rendering/volumetrics.js'),'utf8');
  assert.match(source,/supportsHdrRenderTarget\(renderer\)/,'HDR capability probe missing');
  assert.match(source,/type:HDR_ENABLED\?THREE\.HalfFloatType:THREE\.UnsignedByteType/,'scene target must use half float when supported');
  assert.match(source,/toneMapped:true/,'composite must be the display tone-mapping pass');
  const composite=source.slice(source.indexOf('const compositeMat='),source.indexOf('const compositeScene='));
  assert.equal((composite.match(/#include <tonemapping_fragment>/g)||[]).length,1,'composite should tone-map exactly once');
  assert.equal((composite.match(/#include <colorspace_fragment>/g)||[]).length,1,'composite should convert to sRGB exactly once');
  assert.match(source,/if\(!HDR_ENABLED\)\{[\s\S]*?renderer\.render\(scene,camera\);/,'unsupported targets must fall back to the regular renderer output');
});

test('relative module and asset paths resolve under a Pages project prefix',async()=>{
  const visited=new Set(),queue=['studio/app.js'];
  const base='https://example.invalid/paperchalk-world/';
  while(queue.length){
    const relative=queue.shift();if(visited.has(relative))continue;visited.add(relative);
    const source=await readFile(path.join(root,relative),'utf8');
    const refs=[...source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]);
    const assets=[...source.matchAll(/new URL\(['"]([^'"]+)['"],\s*import\.meta\.url\)/g)].map(m=>m[1]);
    for(const ref of [...refs,...assets]){
      assert.ok(ref.startsWith('.'),`non-local dependency ${ref}`);
      const url=new URL(ref,new URL(relative,base));
      assert.ok(url.pathname.startsWith('/paperchalk-world/'),`escaped Pages prefix ${ref}`);
      const resolved=decodeURIComponent(url.pathname.slice('/paperchalk-world/'.length));
      await readFile(path.join(root,resolved));
      if(refs.includes(ref))queue.push(resolved);
    }
  }
  assert.ok(visited.size>=20,'module graph was not traversed');
});

test('development server delivers both studio and project-prefixed paths',async t=>{
  const child=spawn(process.execPath,[path.join(root,'tools/studio-server.mjs')],{cwd:root,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
  t.after(()=>child.kill());
  let logs='';child.stderr.on('data',data=>{logs+=data;});
  const address=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('server startup timed out: '+logs)),8000);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',code=>{clearTimeout(timer);reject(new Error('server exited '+code+': '+logs));});
    child.stdout.on('data',data=>{
      logs+=data;const match=logs.match(/http:\/\/127\.0\.0\.1:(\d+)\/studio\//);
      if(match){clearTimeout(timer);resolve('http://127.0.0.1:'+match[1]);}
    });
  });
  for(const prefix of ['', '/paperchalk-world']){
    for(const [url,type] of [['/studio/','text/html'],['/studio/app.js','text/javascript'],['/studio/core/PlayerSimulation.mjs','text/javascript'],['/studio/rendering/index.js','text/javascript'],['/vendor/three/three.module.js','text/javascript'],['/assets/player/protagonist.webp','image/webp']]){
      const response=await fetch(address+prefix+url);
      assert.equal(response.status,200,url);assert.ok(response.headers.get('content-type').startsWith(type),url);await response.arrayBuffer();
    }
  }
  assert.equal((await fetch(address+'/.git/config')).status,403);
  assert.equal((await fetch(address+'/studio/',{method:'POST'})).status,405);
  assert.equal((await fetch(address+'/missing-asset.png')).status,404);
});
