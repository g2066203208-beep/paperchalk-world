/* Contract: classroom-box DEV must inspect the SAME five GPU world planes
 * as the hosted game; no fake single sheet, no DOM reparent/canvas loss.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const mime={'.html':'text/html','.js':'application/javascript',
  '.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png',
  '.json':'application/json','.woff2':'font/woff2','.css':'text/css'};
const server=createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
  try{
    const bytes=readFileSync(file);
    res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});
    res.end(bytes);
  }catch{if(!res.headersSent)res.writeHead(404);res.end('missing')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--use-gl=angle','--use-angle=swiftshader'
]});
mkdirSync('artifacts/classroom-box',{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:720},
    deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+
    '/index.html?scene=classroom-box&dev=1',
    {waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>{
    const state=window.PaperWorldGameRoomBox?.inspect();
    return state?.renderer==='webgl-3d-mesh'&&state.loadedMaterialCount===5&&
      state.debugMode&&
      document.querySelector('#view')?.classList.contains('room-dev-mode')&&
      !document.querySelector('#dev-tools')?.hidden;
  },null,{timeout:60000});
  const origin=await page.evaluate(()=>{
    const surface=document.querySelector('#classroom-box-surface');
    const stage=document.querySelector('#scene');
    const state=window.PaperWorldGameRoomBox.inspect();
    return {parent:surface.parentElement?.id,
      sceneParent:stage.parentElement?.id,
      sceneInOldRig:!!stage.closest('#dev-rig'),
      sourceHidden:getComputedStyle(document.querySelector('#source')).visibility,
      viewMode:document.querySelector('#view').classList.contains('room-dev-mode'),
      oldMode:document.querySelector('#view').classList.contains('dev-mode'),
      devStageVisible:!document.querySelector('#dev-stage').hidden,
      facePanelVisible:!document.querySelector('#dev-room-surfaces').hidden,
      toggles:[...document.querySelectorAll('[data-room-face-toggle]')]
        .map(x=>[x.dataset.roomFaceToggle,x.checked]),
      renderer:state.renderer,loaded:state.loadedMaterialCount,
      frames:state.frames,debug:state.debugMode};
  });
  assert.equal(origin.parent,'scene');
  assert.equal(origin.sceneInOldRig,false,'legacy 2D rig reparented 3D room');
  assert.equal(origin.sceneParent,'view');
  assert.equal(origin.sourceHidden,'hidden');
  assert.equal(origin.oldMode,false);
  assert.equal(origin.viewMode,true);
  assert.equal(origin.devStageVisible,true);
  assert.equal(origin.facePanelVisible,true);
  assert.equal(origin.toggles.length,5);
  assert.ok(origin.toggles.every(([,visible])=>visible));
  assert.equal(origin.renderer,'webgl-3d-mesh');
  assert.equal(origin.loaded,5);
  await page.screenshot({path:'artifacts/classroom-box/in-game-dev-five-planes.png'});

  const before=await page.evaluate(()=>window.PaperWorldGameRoomBox.inspect());
  await page.locator('[data-room-isolate="floor"]').click();
  const isolated=await page.evaluate(()=>window.PaperWorldGameRoomBox.inspect());
  assert.equal(Object.values(isolated.visibleFaces).filter(Boolean).length,1);
  assert.equal(isolated.visibleFaces.floor,true);
  assert.equal(isolated.selectedFace,'floor');
  await page.screenshot({path:'artifacts/classroom-box/in-game-dev-floor-only.png'});
  await page.locator('#dev-room-show-all').click();
  const restored=await page.evaluate(()=>window.PaperWorldGameRoomBox.inspect());
  assert.ok(Object.values(restored.visibleFaces).every(Boolean));
  await page.locator('#dev-side').click();
  const rotated=await page.evaluate(()=>window.PaperWorldGameRoomBox.inspect());
  assert.ok(Math.abs(rotated.camera.yaw)>.3,
    'DEV side view must move a real 3D camera, not CSS scene');
  assert.equal(rotated.renderer,'webgl-3d-mesh');
  assert.equal(rotated.loadedMaterialCount,5);
  assert.equal(rotated.meshFaceCount,5);
  await page.screenshot({path:'artifacts/classroom-box/in-game-dev-real-3d-side.png'});
  await page.locator('#dev-front').click();
  const front=await page.evaluate(()=>window.PaperWorldGameRoomBox.inspect());
  assert.ok(Math.abs(front.camera.yaw)<.0001);
  await page.locator('#dev-exit').click();
  const exited=await page.evaluate(()=>({
    room:window.PaperWorldGameRoomBox.inspect(),
    classActive:document.querySelector('#view').classList.contains('room-dev-mode'),
    devClosed:document.querySelector('#dev-tools').hidden
  }));
  assert.equal(exited.room.debugMode,false);
  assert.ok(Object.values(exited.room.visibleFaces).every(Boolean));
  assert.equal(exited.classActive,false);
  assert.equal(exited.devClosed,true);
  assert.deepEqual(errors,[]);
  console.log('PASS: room DEV reuses five separate GPU 3D surfaces, selection/isolation, camera orbit, cleanup');
  await page.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}