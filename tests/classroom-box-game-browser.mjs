/* Real hosted-game integration proof for classroom-box.
 * Must display the actual protagonist/CHAR-002 L2D, 5 true projected
 * untextured faces, HUD, existing fog and physically aligned shoe positions.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css',
 '.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.json':'application/json',
 '.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(root+'/')){res.writeHead(403).end();return}
 try{
   const bytes=readFileSync(file);
   res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});
   res.end(bytes);
 }catch{
   if(!res.headersSent)res.writeHead(404);
   res.end('missing');
 }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--use-gl=angle','--use-angle=swiftshader'
]});
mkdirSync('artifacts/classroom-box',{recursive:true});
try{
 for(const cfg of [{name:'desktop',w:1280,h:720,mobile:false},
                   {name:'phone-landscape',w:844,h:390,mobile:true}]){
  const page=await browser.newPage({viewport:{width:cfg.w,height:cfg.h},
   isMobile:cfg.mobile,hasTouch:cfg.mobile,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:'+server.address().port+
     '/index.html?scene=classroom-box',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>{
     const room=window.PaperWorldGameRoomBox?.inspect();
     const player=window.PaperchalkL2D?.get('player');
     const enemy=window.PaperchalkL2D?.get('enemy');
     return room?.active&&room.faceCount===5&&room.player&&room.enemy&&
       player?.root?.dataset.l2dState==='ready' &&
       room?.renderer==='webgl-3d-mesh' &&
       room.loadedMaterialCount===5 &&
       enemy?.root?.dataset.l2dState==='ready' &&
       !!player.canvas?.width && !!enemy.canvas?.width &&
       !document.getElementById('camera-player-root').hidden &&
       !document.getElementById('enemy-depth-root').hidden;
   },null,{timeout:65000});
   await page.waitForTimeout(750);
   const data=await page.evaluate(()=>{
     const room=window.PaperWorldGameRoomBox.inspect();
     const canvas=document.getElementById('classroom-box-surface');
     const view=document.getElementById('view');
     const player=window.PaperchalkL2D.get('player');
     const enemy=window.PaperchalkL2D.get('enemy');
     const inspect=actor=>{
       const rect=actor.canvas.getBoundingClientRect();
       const img=actor.img.getBoundingClientRect();
       return {state:actor.root.dataset.l2dState,mode:actor.root.dataset.l2dMode,
         character:actor.img.dataset.characterId,src:actor.img.currentSrc,
         imageHidden:actor.img.hidden,canvasPixels:actor.canvas.width*actor.canvas.height,
         canvasDisplay:getComputedStyle(actor.canvas).visibility,
         canvasRect:rect.toJSON(),imgRect:img.toJSON()};
     };
     return {room,canvas:{hidden:canvas.hidden,w:canvas.width,h:canvas.height},
      scene:document.getElementById('scene').dataset.scene,
      player:inspect(player),enemy:inspect(enemy),
      fogFrames:Number(document.querySelector('#fog').dataset.frames),
      uiVisible:!document.querySelector('#novel-ui').hidden,
      roomClass:view.classList.contains('room-blockout-active'),
      originalImageVisibility:getComputedStyle(document.querySelector('#source')).visibility,
      cameraProfile:document.querySelector('#scene').dataset.cameraProfile,
      gameBackgroundTransform:document.querySelector('#scene').style.transform,
      actorLayers:[document.querySelector('#enemy-depth-root').hidden,
        document.querySelector('#camera-player-root').hidden],
      scenePicker:!!document.querySelector('[data-scene-target="classroom-box"]')
     };
   });
   assert.deepEqual(Object.keys(data.room.materials).sort(),
     ['back','ceiling','floor','left','right']);
   assert.equal(data.room.loadedMaterialCount,5,
     'all five separate orthographic wall/floor/ceiling images must be uploaded');
   assert.ok(Object.values(data.room.materials).every(s=>s==='ready'));
   assert.equal(data.room.renderer,'webgl-3d-mesh',
     '3D room must render real GPU triangle faces, not a 2D painted image');
   assert.equal(data.room.vertexCount,30,
     'five actual planar faces are triangulated into 10 GPU triangles');
   assert.equal(data.room.projection,'physical-perspective-camera');
   assert.equal(data.scene,'classroom-box');
   assert.equal(data.canvas.hidden,false);
   assert.equal(data.roomClass,true);
   assert.equal(data.uiVisible,true);
   assert.equal(data.scenePicker,true,'game scene switcher must list test room');
   assert.equal(data.originalImageVisibility,'hidden');
   assert.equal(data.gameBackgroundTransform,'none');
   assert.equal(data.cameraProfile,'five-face-world-3d');
   assert.ok(data.fogFrames>5);
   assert.deepEqual(data.actorLayers,[false,false]);
   assert.equal(data.enemy.state,'ready');
   assert.equal(data.player.state,'ready');
   // L2D backing resolution scales with physical viewport/DPR; on a
   // 390px-tall phone the authentic 1024 source is rasterized smaller.
   // Require LIVE ready state, nonempty source, and an active display buffer.
   const minPixels=cfg.mobile?64*64:256*256;
   // Canonical L2D studio composites may be browser data: URLs rather
   // than /assets/characters/...; identify characters by saved L2D identity
   // and live animated canvas, not by an assumed PNG path.
   assert.ok(data.enemy.canvasPixels>=minPixels &&
     data.enemy.character==='char-002' && !!data.enemy.src,
     'NPC must use the actual CHAR-002 L2D, got '+JSON.stringify(data.enemy));
   assert.ok(data.player.canvasPixels>=minPixels &&
     data.player.character==='protagonist' && !!data.player.src,
     'heroine must use the actual protagonist L2D, got '+JSON.stringify(data.player));
   // A real game character is attached by its shoe to the same 3D ground
   // that is drawn in the room background (not an independent 2D guess).
   const stage=await page.locator('#scene').boundingBox();
   const playerRect=data.player.imgRect,enemyRect=data.enemy.imgRect;
   for(const [id,rect] of [['player',playerRect],['enemy',enemyRect]]){
     const actor=data.room[id];
     const shoeX=rect.x+rect.width*actor.soleX;
     const shoeY=rect.y+rect.height*actor.soleY;
     const expectedX=stage.x+actor.shoe.x;
     const expectedY=stage.y+actor.shoe.y;
     assert.ok(Math.abs(shoeX-expectedX)<3 && Math.abs(shoeY-expectedY)<3,
       'L2D shoe not grounded to real box: '+id+' actual '+shoeX+','+shoeY+
       ' projected '+expectedX+','+expectedY);
   }
   assert.ok(data.room.player.drawnHeight>data.room.enemy.drawnHeight,
     'near protagonist should be larger than midground opponent');
   await page.screenshot({path:'artifacts/classroom-box/in-game-'+cfg.name+
     '-five-faces-l2d.png'});
   if(!cfg.mobile){
     const neutral=data.room.camera;
     await page.mouse.move(cfg.w-5,cfg.h/3);
     await page.waitForTimeout(750);
     await page.screenshot({path:'artifacts/classroom-box/in-game-desktop-motion.png'});
     const updated=await page.evaluate(()=>window.PaperWorldGameRoomBox.inspect());
     assert.equal(updated.renderer,'webgl-3d-mesh');
     assert.equal(updated.faceCount,5);
     assert.ok(Math.abs(updated.camera.x-neutral.x)>.10,
       'real camera should move laterally when the mouse moves');
     assert.ok(Math.abs(updated.camera.x-neutral.x)<=.27*updated.pointerStrength+.002,
       'physical camera dolly exceeds safe X travel limit');
     assert.ok(Math.abs(updated.camera.y-neutral.y)<=.095*updated.pointerStrength+.002,
       'physical camera lift exceeds safe Y travel limit');
     // Only the camera moved; actual GPU mesh vertices and physical world
     // positions stay fixed. The perspective projector naturally separates
     // near and far geometry without separately shifting the actors.
     const motion=await page.evaluate(()=>{
       const api=window.PaperWorldClassroomBox;
       const box=window.PaperWorldGameRoomBox.inspect();
       const width=document.getElementById('scene').clientWidth;
       const height=document.getElementById('scene').clientHeight;
       const c0=api.camera(0,0),c1=box.camera;
       const displacement=point=>{
         const a=api.project(point,c0,width,height);
         const b=api.project(point,c1,width,height);
         return Math.hypot(b.x-a.x,b.y-a.y);
       };
       return {near:displacement([-.9,0,1]),
         far:displacement([-.9,0,8]),
         world:box.worldActors,
         faceCount:api.FACES.length};
     });
     assert.ok(motion.near>motion.far*1.25,
       'real camera must yield natural inverse-depth visual displacement: '+
        JSON.stringify(motion));
     assert.equal(motion.faceCount,5);
     assert.deepEqual(motion.world,data.room.worldActors,
       'pointer movement must not change player/enemy physical coordinates');
     await page.mouse.move(cfg.w/2,3);
     await page.waitForTimeout(750);
     const pitched=await page.evaluate(()=>window.PaperWorldGameRoomBox.inspect());
     assert.ok(Math.abs(pitched.camera.y-neutral.y)>.04,
       'vertical motion should gently lift/lower the same real camera');
     assert.ok(Math.abs(pitched.camera.pitch)>.002,
       'framing compensation should rotate the real camera');
     assert.equal(pitched.renderer,'webgl-3d-mesh');
     await page.screenshot({path:'artifacts/classroom-box/in-game-desktop-look-up.png'});
   }
   assert.deepEqual(errors,[],'uncaught game runtime exception');
   console.log('PASS classroom-box integrated',cfg.name,JSON.stringify({
     room:data.room.room,player:data.player.character,enemy:data.enemy.character,
     shoePlayer:data.room.player.shoe,shoeEnemy:data.room.enemy.shoe}));
  }finally{await page.close()}
 }
}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));
}