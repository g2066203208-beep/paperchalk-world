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
mkdirSync('artifacts/ring-arena/v27-frame-by-frame',{recursive:true});
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
 const duration=700,fps=30,frameCount=21,record=[];
 for(let i=0;i<=frameCount;i++){
  const at=Math.min(duration-1,Math.round(i*1000/fps));
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
  if(i>=4)assert.equal(state.hp,24);
  if(i>=9&&i<=14)assert.equal(state.phase,'hold');
  if(i>=15&&i<frameCount)assert.equal(state.phase,'recover');
  const filename='frame-'+String(i).padStart(3,'0')+'.png';
  await page.screenshot({path:'artifacts/ring-arena/v27-frame-by-frame/'+filename,
   animations:'disabled',timeout:60000});
  record.push({frame:i,timeMs:at,filename,...state});
  console.log('V27 frame',i,'/',frameCount,state.phase,at+'ms');
 }
 assert.deepEqual(errors,[]);
 writeFileSync('artifacts/ring-arena/v27-frame-by-frame/timeline.json',
  JSON.stringify({description:'REAL game WebGL fixed 30fps QA snapshots; not original Darkest Dungeon source video',
   fps,nominalDurationMs:duration,frames:record},null,2));
 await page.close();
 console.log('PASS: 22 frame-authored game battle snapshots, 30fps, 0-699ms');
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
