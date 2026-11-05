/* Browser acceptance: real WebGL mesh, original neutral composition,
 * pitch/yaw are camera uniforms, original actor/fog layer contracts survive.
 */
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
const root=resolve('site');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css',
  '.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const path=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
  try{res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});
    res.end(readFileSync(file))}
  catch{res.writeHead(404);res.end('missing')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--use-gl=angle','--use-angle=swiftshader',
  '--enable-webgl','--enable-unsafe-swiftshader'
]});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
mkdirSync('artifacts/cylinder-background',{recursive:true});
try{
  const url='http://127.0.0.1:'+server.address().port+'/index.html?scene=bedroom';
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.PaperWorldSceneCylinder?.inspect().ready &&
    document.querySelector('#scene')?.dataset.scene==='bedroom',{timeout:35000});
  await page.mouse.move(640,360);
  await page.waitForTimeout(500);
  const state=await page.evaluate(()=>{
    const s=window.PaperWorldSceneCylinder.inspect();
    return {s,sourceVisible:getComputedStyle(document.querySelector('#source')).visibility,
      stageTransform:getComputedStyle(document.querySelector('#scene')).transform,
      fogId:document.querySelectorAll('#fog').length,
      playerId:document.querySelectorAll('#camera-player-root').length,
      enemyId:document.querySelectorAll('#enemy-depth-root').length};
  });
  assert.equal(state.s.renderer,'webgl-3d-cylinder',JSON.stringify(state));
  assert.equal(state.s.segments,160);
  assert.equal(state.sourceVisible,'hidden');
  assert.equal(state.stageTransform,'none');
  assert.deepEqual([state.fogId,state.playerId,state.enemyId],[1,1,1]);

  // Compare neutral curved render to the ORIGINAL untouched <img>. The
  // projector must reconstruct the approved image instead of bowing it.
  const scene=page.locator('#scene');
  const curved=PNG.sync.read(await scene.screenshot({
    path:'artifacts/cylinder-background/bedroom-neutral-curved.png'}));
  await page.evaluate(()=>{
    document.querySelector('.scene-cylinder-surface').hidden=true;
    document.querySelector('#source').classList.remove('scene-cylinder-source-hidden');
  });
  const flat=PNG.sync.read(await scene.screenshot({
    path:'artifacts/cylinder-background/bedroom-neutral-original.png'}));
  await page.evaluate(()=>{
    document.querySelector('.scene-cylinder-surface').hidden=false;
    document.querySelector('#source').classList.add('scene-cylinder-source-hidden');
  });
  assert.deepEqual([curved.width,curved.height],[flat.width,flat.height]);
  let error=0,count=0;
  for(let y=Math.round(curved.height*.12);y<curved.height*.88;y+=3){
    for(let x=Math.round(curved.width*.12);x<curved.width*.88;x+=3){
      const i=(y*curved.width+x)*4;
      for(let c=0;c<3;c++){error+=Math.abs(curved.data[i+c]-flat.data[i+c]);count++}
    }
  }
  const mae=error/count;
  assert.ok(mae<17,'Neutral composition must match the original picture; MAE '+mae);

  // The image texture is not replaced on pitch: only the camera changes.
  const before=await page.evaluate(()=>window.PaperWorldSceneCylinder.inspect());
  await page.mouse.move(640,24);
  await page.waitForTimeout(950);
  const up=await page.evaluate(()=>window.PaperWorldSceneCylinder.inspect());
  await scene.screenshot({path:'artifacts/cylinder-background/bedroom-pitch-up.png'});
  await page.mouse.move(640,696);
  await page.waitForTimeout(950);
  const down=await page.evaluate(()=>window.PaperWorldSceneCylinder.inspect());
  await scene.screenshot({path:'artifacts/cylinder-background/bedroom-pitch-down.png'});
  assert.ok(Math.abs(up.pitchDegrees)>1,'pitch did not move');
  assert.ok(Math.abs(down.pitchDegrees)>1,'opposite pitch did not move');
  assert.ok(up.pitchDegrees*down.pitchDegrees<0,'pitch directions did not reverse');
  assert.equal(before.source,up.source);
  assert.equal(before.source,down.source);
  assert.equal(down.renderer,'webgl-3d-cylinder');
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS: neutral image MAE '+mae.toFixed(2)+', true 3D cylinder and camera pitch, fog/actors retained');
}finally{
  await page.close();await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
