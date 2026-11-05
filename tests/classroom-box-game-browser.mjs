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
 '.webp':'image/webp','.png':'image/png','.json':'application/json',
 '.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(root+'/')){res.writeHead(403).end();return}
 try{res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});
   res.end(readFileSync(file))}
 catch{res.writeHead(404).end('missing')}
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
   assert.ok(data.enemy.canvasPixels>=256*256,'NPC must use real L2D mesh');
   assert.ok(data.player.canvasPixels>=256*256,'heroine must use real L2D mesh');
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
     await page.mouse.move(cfg.w-5,cfg.h/3);
     await page.waitForTimeout(600);
     await page.screenshot({path:'artifacts/classroom-box/in-game-desktop-motion.png'});
     const updated=await page.evaluate(()=>window.PaperWorldGameRoomBox.inspect());
     assert.ok(Math.abs(updated.camera.yaw)>.004);
     assert.equal(updated.faceCount,5);
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