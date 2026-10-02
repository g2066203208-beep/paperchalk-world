import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));

test('unmodified star shaders retain their baseline behavior while art-directed passes may evolve',async()=>{
  const original=await readFile(path.join(root,'src/main.js'),'utf8');
  const sky=await readFile(path.join(root,'studio/rendering/sky.js'),'utf8');
  const shaders=text=>[...text.matchAll(/`([^`]+)`/g)].map(m=>m[1]).filter(s=>/void\s+main\s*\(/.test(s)&&/gl_(?:Position|FragColor)/.test(s));
  const normalize=shader=>shader.replace(/\r\n/g,'\n');
  for(const marker of ['attribute float aSize;','uniform float twinkle;']){
    const baseline=shaders(original).find(shader=>shader.includes(marker));
    const actual=shaders(sky).find(shader=>shader.includes(marker));
    assert.ok(baseline&&actual,'star program missing: '+marker);
    assert.equal(normalize(actual),normalize(baseline),'unrelated star behavior changed');
  }
});

test('art-directed sky preserves the baseline day-night timing and its non-twilight palettes',async()=>{
  const baseline=await readFile(path.join(root,'src/main.js'),'utf8');
  const source=await readFile(path.join(root,'studio/rendering/sky.js'),'utf8');
  const normalize=text=>text.replace(/\r\n/g,'\n');
  const timing=text=>text.match(/float wn=0\.0,wd=0\.0,wday=0\.0,ws=0\.0;[\s\S]*?(?=\s*vec3 night=)/)?.[0];
  assert.ok(timing(source),'day-night blend weights must remain present');
  assert.equal(normalize(timing(source)),normalize(timing(baseline)),'art changes must not change the day-night clock');
  for(const palette of ['night','day','sunset']){
    const pattern=new RegExp('vec3 '+palette+'=vertical3\\([\\s\\S]*?\\);');
    assert.equal(normalize(source.match(pattern)?.[0]||''),normalize(baseline.match(pattern)?.[0]||''),palette+' palette changed');
  }
  const skyFragment=source.slice(source.indexOf('fragmentShader:`'),source.indexOf('const sky=new'));
  assert.match(skyFragment,/col=night\*wn\+dawn\*wd\+day\*wday\+sunset\*ws/);
  assert.match(skyFragment,/gl_FragColor=vec4\(col,1\.0\)/);
  assert.equal((skyFragment.match(/#include <colorspace_fragment>/g)||[]).length,1);
  assert.doesNotMatch(skyFragment,/#include <tonemapping_fragment>/,'sky must not add a second HDR display transform');
});

test('thin fog keeps its depth fade and survives the alpha discard threshold',async()=>{
  const source=await readFile(path.join(root,'studio/rendering/fog.js'),'utf8');
  const opacity=Number(source.match(/opacity:\{value:([.\d]+)\}/)?.[1]);
  const threshold=Number(source.match(/if\(a<([.\d]+)\) discard/)?.[1]);
  assert.ok(opacity>0&&opacity<.05,'fog remains a thin veil');
  assert.ok(threshold>0&&threshold<opacity*.25,'opacity must not be discarded wholesale');
  assert.match(source,/a \*= soft\*opacity/,'geometry intersections still use depth fading');
  assert.match(source,/layerOpacity\*heightFalloff/,'near/far haze must remain bounded by world position');
  assert.match(source,/depthWrite:false/,'thin fog must not occlude the remaining scene');
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
  const fade=source.match(/nearFade=smoothstep\(([\d.]+),([\d.]+),t\)/);
  assert.ok(fade&&+fade[1]>0&&+fade[1]<+fade[2]&&+fade[2]<5.5,'light shafts must become visible before the close gameplay focal plane');
  assert.match(source,/canopyGaps/,'storybook shafts should retain broad canopy gaps');
  assert.match(source,/pulpMotes/,'storybook shafts should carry a restrained paper-dust variation');
  assert.match(source,/object\.isMesh&&object\.visible&&!object\.castShadow/,'volume shadows use the same caster set as the surface shadows');
  assert.match(source,/for\(const object of nonCasters\)object\.visible=true/,'temporary caster visibility is restored');
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
