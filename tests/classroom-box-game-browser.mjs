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
     const others=['enemy2','enemy3'].map(id=>window.PaperchalkL2D?.get(id));
     return room?.active&&room.faceCount===5&&room.player&&room.enemy&&room.enemy2&&room.enemy3&&
       player?.root?.dataset.l2dState==='ready' &&
       room?.renderer==='webgl-3d-mesh' &&
       room.loadedMaterialCount===5 &&
       enemy?.root?.dataset.l2dState==='ready' &&
       others.every(a=>a?.root?.dataset.l2dState==='ready' &&
         a.root.dataset.l2dMode==='library-part-mesh'&&a.canvas.width>0) &&
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
     const enemy2=window.PaperchalkL2D.get('enemy2');
     const enemy3=window.PaperchalkL2D.get('enemy3');
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
      enemy2:inspect(enemy2),enemy3:inspect(enemy3),
      fogFrames:Number(document.querySelector('#fog').dataset.frames),
      uiVisible:!document.querySelector('#novel-ui').hidden,
      roomClass:view.classList.contains('room-blockout-active'),
      originalImageVisibility:getComputedStyle(document.querySelector('#source')).visibility,
      cameraProfile:document.querySelector('#scene').dataset.cameraProfile,
      gameBackgroundTransform:document.querySelector('#scene').style.transform,
      actorLayers:['enemy-depth-root','room-enemy2-root','room-enemy3-root',
        'camera-player-root'].map(id=>document.getElementById(id).hidden),
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
   assert.deepEqual(data.actorLayers,[false,false,false,false]);
   for(const id of ['player','enemy','enemy2','enemy3'])
     assert.equal(data[id].state,'ready',id+' real L2D canvas is not ready');
   for(const id of ['enemy2','enemy3']){
     assert.equal(data[id].mode,'library-part-mesh','must animate genuine character layers: '+id);
     assert.ok(data[id].src&&data[id].canvasPixels>0);
   }
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
   for(const [id,rect] of [['player',playerRect],['enemy',enemyRect],
     ['enemy2',data.enemy2.imgRect],['enemy3',data.enemy3.imgRect]]){
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
   // The nearer front-row opponent must be visibly taller than the two behind.
   assert.ok(data.room.enemy.drawnHeight>data.room.enemy2.drawnHeight);
   assert.ok(data.room.enemy.drawnHeight>data.room.enemy3.drawnHeight);
   await page.screenshot({path:'artifacts/classroom-box/in-game-'+cfg.name+
     '-five-faces-l2d.png'});
   if(!cfg.mobile){
     const neutral=data.room.camera;
     await page.mouse.move(cfg.w-5,cfg.h/3);
     await page.waitForTimeout(850);
     await page.screenshot({path:'artifacts/classroom-box/in-game-desktop-motion.png'});
     const updated=await page.evaluate(()=>window.PaperWorldGameRoomBox.inspect());
     assert.equal(updated.renderer,'webgl-3d-mesh');
     assert.equal(updated.faceCount,5);
     for(const axis of ['x','y','z'])
       assert.equal(updated.camera[axis],neutral[axis],
         'mouse gaze may not translate stationary camera along '+axis);
     assert.ok(updated.camera.yaw>neutral.yaw+.025,
       'mouse right must turn head to the right');
     assert.ok(Math.abs(updated.camera.yaw)<=
       7*Math.PI/180*updated.pointerStrength+.002,
       'head yaw must not exceed ergonomic bounds');
     assert.ok(Math.abs(updated.camera.pitch)<=
       3.8*Math.PI/180*updated.pointerStrength+.002,
       'head pitch must not exceed ergonomic bounds');
     const geometry=await page.evaluate(()=>{
       const api=window.PaperWorldClassroomBox;
       const box=window.PaperWorldGameRoomBox.inspect();
       const width=document.getElementById('scene').clientWidth;
       const height=document.getElementById('scene').clientHeight;
       const target=[0,1.22,8];
       return {
         center:api.project(target,api.camera(0,0),width,height),
         looked:api.project(target,box.camera,width,height),
         actors:box.worldActors,meshes:api.FACES.length
       };
     });
     assert.ok(geometry.looked.x<geometry.center.x-15,
       'turning head right must shift room center LEFT onscreen');
     assert.equal(geometry.meshes,5);
     assert.deepEqual(geometry.actors,data.room.worldActors,
       'look-around must not move the actual player or NPC');
     await page.mouse.move(cfg.w/2,3);
     await page.waitForTimeout(850);
     const lookedUp=await page.evaluate(()=>window.PaperWorldGameRoomBox.inspect());
     for(const axis of ['x','y','z'])
       assert.equal(lookedUp.camera[axis],neutral[axis],
         'looking upward cannot lift the camera');
     assert.ok(lookedUp.camera.pitch>.015,
       'mouse upward must make head PITCH UP, not the opposite');
     assert.equal(lookedUp.renderer,'webgl-3d-mesh');
     await page.screenshot({path:'artifacts/classroom-box/in-game-desktop-look-up.png'});
     await page.mouse.move(cfg.w/2,cfg.h/2);
     await page.waitForTimeout(950);
     const centered=await page.evaluate(()=>window.PaperWorldGameRoomBox.inspect());
     assert.ok(Math.abs(centered.camera.yaw)<.004 &&
       Math.abs(centered.camera.pitch)<.004,
       'returning mouse to center should gently recover level neutral gaze');
     await page.screenshot({path:'artifacts/classroom-box/in-game-desktop-recentered.png'});
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