import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const types={'.html':'text/html','.js':'text/javascript',
  '.json':'application/json','.png':'image/png',
  '.webp':'image/webp','.css':'text/css','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+(path.endsWith('/')?path+'index.html':path));
  if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
  try{res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});
    res.end(readFileSync(file))}
  catch{res.writeHead(404);res.end('missing')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/scene-camera',{recursive:true});
try{
  for(const cfg of [{name:'desktop',w:1280,h:720,mobile:false},
                    {name:'phone-landscape',w:844,h:390,mobile:true}]){
    const page=await browser.newPage({viewport:{width:cfg.w,height:cfg.h},
      deviceScaleFactor:1,isMobile:cfg.mobile,hasTouch:cfg.mobile});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
      await page.goto('http://127.0.0.1:'+server.address().port+
        '/index.html?scene=classroom',{waitUntil:'domcontentloaded',timeout:40000});
      await page.waitForFunction(()=>
        window.PaperWorldSceneCameraState &&
        document.getElementById('source').naturalWidth>0 &&
        document.getElementById('scene').dataset.cameraProfile==='one-pinhole-3d' &&
        Number(document.querySelector('#fog').dataset.frames)>5,
        null,{timeout:35000});
      const initial=await page.evaluate(()=>{
        const scene=document.getElementById('scene');
        const fog=document.getElementById('fog');
        return {world:window.PaperWorldSceneCameraState(),
          cameraProfile:scene.dataset.cameraProfile,
          stageStyle:scene.style.transform,
          enemyStyle:document.querySelector('#enemy-depth-root').style.transform,
          playerStyle:document.querySelector('#camera-player-root').style.transform,
          fogRect:fog.getBoundingClientRect().toJSON(),
          playerImage:document.querySelector('#actor-player').getAttribute('src'),
          source:document.querySelector('#source').getAttribute('src')};
      });
      assert.equal(initial.cameraProfile,'one-pinhole-3d');
      assert.ok(initial.stageStyle.startsWith('matrix3d('));
      assert.ok(initial.enemyStyle.includes('scale('));
      assert.ok(initial.playerStyle.replaceAll(' ','').includes('translate3d(0px,0px,0px)'));
      assert.ok(initial.world.distances.background>initial.world.distances.enemy);
      assert.ok(initial.world.distances.enemy>initial.world.distances.player);
      assert.ok(Math.abs(initial.fogRect.width-cfg.w)<3);
      assert.equal(initial.source,'./assets/classroom.webp');
      await page.screenshot({path:'artifacts/scene-camera/'+cfg.name+'-neutral.png'});
      if(!cfg.mobile){
        // Inspect the actual two-character composition, not just hidden
        // opponent geometry. The original L2D animation stays in Canvas.
        await page.evaluate(async()=>{
          document.getElementById('enemy-depth-root').hidden=false;
          document.getElementById('actor-enemy').hidden=false;
          const actor=window.PaperchalkL2D.get('enemy');
          if(!actor.img.src){
            actor.img.src='./assets/characters/char-002/front.png';
            await actor.img.decode();
          }
          await window.PaperchalkL2D.refresh('enemy');
        });
        await page.waitForFunction(()=>{
          const s=window.PaperWorldL2DGround?.inspect();
          const actor=window.PaperchalkL2D?.get('enemy');
          return actor?.root?.dataset.l2dState==='ready' &&
            s?.actors?.some(a=>a.id==='enemy'&&a.detected);
        },null,{timeout:22000});
        const checked=await page.evaluate(()=>{
          const s=window.PaperWorldL2DGround.inspect();
          return {enemy:s.actors.find(a=>a.id==='enemy'),
            player:s.actors.find(a=>a.id==='player')};
        });
        assert.ok(checked.enemy.errorPx<1 && checked.enemy.errorPx>-1,
          'real L2D sole must stay attached to the shared ground');
        assert.ok(checked.enemy.depthScale>0 && checked.enemy.depthScale<1);
        await page.screenshot({path:'artifacts/scene-camera/desktop-player-and-enemy.png'});
        await page.mouse.move(cfg.w-4,cfg.h/2);
        await page.waitForFunction(()=>
          Math.abs(window.PaperWorldSceneCameraState().camera.x)>10,
          null,{timeout:8000});
        const right=await page.evaluate(()=>{
          const state=window.PaperWorldSceneCameraState();
          const c=window.PaperWorldSceneCamera;
          const near=c.billboard(state.depths.enemy,state.camera);
          const far=c.billboard(state.depths.background,state.camera);
          return {state,enemy:near,background:far,
            fogRect:document.querySelector('#fog').getBoundingClientRect().toJSON()};
        });
        assert.ok(Math.abs(right.enemy.x)>Math.abs(right.background.x),
          'camera dolly should move the near NPC farther than the back wall');
        assert.ok(Math.abs(right.state.disparityPx)>1);
        assert.deepEqual(right.fogRect,initial.fogRect,
          'independent fog must not move when the camera moves');
        await page.screenshot({path:'artifacts/scene-camera/'+cfg.name+'-right.png'});
        await page.mouse.move(cfg.w/2,4);
        await page.waitForFunction(()=>
          Math.abs(window.PaperWorldSceneCameraState().camera.pitch)>.003,
          null,{timeout:8000});
        await page.screenshot({path:'artifacts/scene-camera/'+cfg.name+'-up.png'});
      }
      assert.deepEqual(errors,[]);
      console.log('PASS one camera 3D projection',cfg.name,
        initial.world.distances,initial.stageStyle.slice(0,35));
    }finally{await page.close()}
  }
}finally{
  await browser.close();await new Promise(ok=>server.close(ok));
}