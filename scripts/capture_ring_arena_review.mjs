/* Publish REAL game screenshots with the GitHub Pages build. No mock assets. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('site');
const out=resolve(root,'reviews/ring-arena');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.json':'application/json','.webp':'image/webp',
 '.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((request,response)=>{
 const url=new URL(request.url,'http://localhost');
 const path=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!path.startsWith(root+'/'))return response.writeHead(403).end();
 try{
  const body=readFileSync(path);
  response.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});
  response.end(body);
 }catch{
  response.writeHead(404).end('not found');
 }
});
await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
let browser;
try{
 browser=await chromium.launch({headless:true,
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/index.html?scene=ring-arena',
  {waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForFunction(()=>{
  const s=window.PaperWorldGameRingArena?.inspect();
  return s?.active&&s?.renderer==='webgl-l2d'&&s?.l2dReady===8&&
   s?.wallMaterial?.ready===true&&s?.renderedActorOpacity&&
   Object.keys(s.renderedActorOpacity).length===8;
 },null,{timeout:160000});
 mkdirSync(out,{recursive:true});
 const entries=[];
 for(let slot=1;slot<=4;slot++){
  await page.locator('[data-control-ally="'+slot+'"]').click();
  await page.mouse.move(640,360);
  await page.waitForFunction(i=>{
   const s=window.PaperWorldGameRingArena?.inspect();
   return s?.controlledAllyIndex===i-1&&
    Math.abs(s.cameraLook?.yawDeg||0)<1.2;
  },slot,{timeout:20000});
  await page.waitForTimeout(300);
  const state=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect());
  assert.equal(state.renderer,'webgl-l2d');
  assert.equal(state.visibleActorIds.length,8,'actual eight world characters');
  assert.equal(Object.keys(state.renderedActorOpacity).length,8,'eight GPU draws');
  assert.ok(Object.values(state.renderedActorOpacity).every(alpha=>alpha===1),
   'a teammate was dimmed or removed');
  assert.equal(state.cameraParity,true,'active teammate owns the camera');
  const filename='ally-'+slot+'-1280x720.png';
  await page.screenshot({path:resolve(out,filename),animations:'disabled'});
  entries.push({slot,filename,controlledActorId:state.controlledActorId,
   visibleActorIds:state.visibleActorIds,
   renderedActorOpacity:state.renderedActorOpacity,
   partyLine:state.partyLine,opposingLine:state.opposingLine});
 }
 await page.locator('[data-control-ally="1"]').click();
 await page.mouse.move(640,360);
 await page.setViewportSize({width:1917,height:906});
 await page.waitForTimeout(450);
 const full=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.equal(full.controlledActorId,'hero');
 assert.ok(Object.values(full.renderedActorOpacity).every(alpha=>alpha===1));
 await page.screenshot({path:resolve(out,'hero-wide-1917x906.png'),animations:'disabled'});
 assert.deepEqual(errors,[],'actual game generated JavaScript exceptions');
 writeFileSync(resolve(out,'manifest.json'),JSON.stringify({
  source:'actual in-game Chromium/WebGL (not an illustration)',
  commit:process.env.GITHUB_SHA||null,
  viewport:{width:1280,height:720},
  wide:{width:1917,height:906,filename:'hero-wide-1917x906.png'},
  entries
 },null,2));
 console.log('PASS: 5 real WebGL screenshots of four fully visible roster draws:',out);
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
