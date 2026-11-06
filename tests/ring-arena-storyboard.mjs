/* Capture every frame of the REAL WebGL game duel on GitHub Actions.
 * This sequence is OUR GAME, never a replacement for user-supplied DD footage.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
 '.json':'application/json','.webp':'image/webp','.png':'image/png',
 '.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root+'/'))return res.writeHead(403).end();
 let bytes;try{bytes=readFileSync(file)}catch{res.writeHead(404).end('not found');return}
 res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(bytes);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/ring-arena/v29-699-source-timing-59frames',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/index.html?scene=ring-arena&directorQA=1',
  {waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForFunction(()=>{
  const s=window.PaperWorldGameRingArena?.inspect();
  return s?.active&&s?.renderer==='webgl-l2d'&&s?.l2dReady===5&&
   s.directorArt?.hero?.loaded&&s.directorArt?.enemy?.loaded;
 },null,{timeout:100000});
 const initial=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect().actors);
 const heroOrigin=initial.allies[0],enemyOrigin=initial.enemies[1];
 const fps=30,frameCount=58,duration=frameCount*1000/fps,record=[];
 for(let i=0;i<=frameCount;i++){
  const at=Math.min(duration,Math.ceil(i*1000/fps));
  const state=await page.evaluate(ms=>{
    const app=window.PaperWorldGameRingArena;
    app.qaFrame('enemy-2',ms);
    const snap=app.inspect();
    return {phase:snap.director.phase,applied:snap.director.applied,
     hp:snap.director.enemyHP['enemy-2'],
     cameraFov:snap.camera.fov,
     poses:snap.directorArt.renderedPoses,
     positions:snap.duel?.playedPositions};
  },at);
  if(i===0)assert.equal(state.hp,36);
  if(i>=2)assert.equal(state.hp,24,'source A/B/D impact on native frame 2');
  if(i>=9&&i<=48)assert.equal(state.phase,'hold','source 46+ frame tableau');
  if(i>=49&&i<=55)assert.equal(state.phase,'recover','source 7-frame retreat');
  if(i>=1&&i<=55)assert.equal(state.poses.hero,'female07-axe-lunge',
   'female07 original back portrait must remain stable through long tableau and retreat');
  if(i>=2&&i<=55)assert.equal(state.poses['enemy-2'],'hurt-art',
   'opponent keeps hurt portrait through long tableau and retreat');
  if(i===55){
   assert.equal(state.positions[0].x,heroOrigin.x,'hero home with action artwork');
   assert.equal(state.positions[0].z,heroOrigin.z,'hero home with action artwork');
   assert.equal(state.positions[1].x,enemyOrigin.x,'target home with hurt artwork');
   assert.equal(state.positions[1].z,enemyOrigin.z,'target home with hurt artwork');
  }
  if(i===56){
   assert.equal(state.poses.hero,'idle','restore HERO only AFTER home');
   assert.equal(state.poses['enemy-2'],'idle','restore ENEMY only AFTER home');
  }
  const filename='frame-'+String(i).padStart(3,'0')+'.png';
  await page.screenshot({path:'artifacts/ring-arena/v29-699-source-timing-59frames/'+filename,
   animations:'disabled',timeout:60000});
  record.push({frame:i,timeMs:at,filename,...state});
  if(i%10===0||i>=49)console.log('V29 DD-699-matched frame',i,'/',frameCount,state.phase,at+'ms');
 }
 assert.deepEqual(errors,[]);
 writeFileSync('artifacts/ring-arena/v29-699-source-timing-59frames/timeline.json',
  JSON.stringify({
   description:'REAL WebGL game rendered at 30fps, synchronized with verified user-provided DD 699 JPEG visual timing; NOT game frames from the original footage',
   sourceReferenceFrames:699,sourceReferenceFps:30,
   sourceClips:[
    {id:'gunshot-miss',entry:79,impact:81,holdEnd:127,retreat:128,queue:134},
    {id:'goblet-hit',entry:178,impact:180,holdEnd:227,retreat:228,queue:234},
    {id:'sword-miss',entry:315,impact:318,holdEnd:364,retreat:365,queue:372},
    {id:'heavy-miss',entry:416,impact:418,holdEnd:464,retreat:465,queue:473}
   ],
   fps,nominalDurationMs:duration,frames:record},null,2));
 await page.close();
 console.log('PASS: 59 actual WebGL screenshots, 30fps, long source-verified central result, fast retreat, pose switch AFTER original anchors');
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
