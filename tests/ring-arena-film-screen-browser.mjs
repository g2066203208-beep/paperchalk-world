/* Screenshot proof from the ACTUAL 3D ring WebGL battle.
 * Uses original GPT cropped alpha art, not a composited mockup. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site');
const out=resolve('artifacts/ring-arena-film-screen');
mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript',
 '.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const path=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!path.startsWith(root+'/'))return res.writeHead(403).end('forbidden');
 let bytes;
 try{bytes=readFileSync(path)}catch{return res.writeHead(404).end('not found')}
 res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'}).end(bytes);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/index.html?scene=ring-arena',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>{
  const info=window.PaperWorldGameRingArena?.inspect?.();
  return info?.active===true&&info?.renderer==='webgl-l2d'&&
    document.querySelector('#ring-arena-canvas')?.dataset.wallTexture==='ready'&&
    Number(info.l2dReady)>=1;
 },null,{timeout:160000});
 const filmGrade=page.locator('#ring-arena-film-grade');
 assert.equal(await filmGrade.count(),1,'film grain/vignette overlay must exist');
 const grading=await page.evaluate(()=>{
   const canvas=document.querySelector('#ring-arena-canvas');
   const overlay=document.querySelector('#ring-arena-film-grade');
   const tone=overlay.querySelector('.ring-film-tone');
   const grain=overlay.querySelector('.ring-film-grain');
   return {canvasFilter:getComputedStyle(canvas).filter,gradeDisplay:getComputedStyle(overlay).display,
     gradePointerEvents:getComputedStyle(overlay).pointerEvents,
     colorMix:getComputedStyle(tone).mixBlendMode,
     grainTexture:getComputedStyle(grain).backgroundImage};
 });
 assert.equal(grading.canvasFilter,'none','live WebGL must never use a heavy CSS filter');
 assert.equal(grading.gradeDisplay,'block');
 assert.equal(grading.gradePointerEvents,'none');
 assert.equal(grading.colorMix,'color');
 assert.ok(grading.grainTexture.includes('horror-analog-grain-tile.png'));
  const film=page.locator('#ring-arena-film-screen');
 assert.equal(await film.count(),1);
 const style=await film.evaluate(el=>{
  const css=getComputedStyle(el),box=el.getBoundingClientRect();
  return {display:css.display,backgroundImage:css.backgroundImage,pointerEvents:css.pointerEvents,
   x:box.x,y:box.y,width:box.width,height:box.height,art:el.dataset.art};
 });
 assert.equal(style.display,'block');
 assert.equal(style.pointerEvents,'none');
 assert.ok(style.backgroundImage.includes('horror-battle-screen-film-gpt.webp'));
 assert.ok(style.width>1800&&style.height>900,'film must cover entire battle');
 const picture=await page.evaluate(()=>new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve({width:img.naturalWidth,height:img.naturalHeight});
  img.onerror=()=>reject(new Error('GPT film image missing'));
  img.src='./assets/ui/horror-battle-screen-film-gpt.webp';
 }));
 assert.deepEqual(picture,{width:2048,height:1152});
 await page.waitForTimeout(800);
 await page.screenshot({path:out+'/ring-arena-with-GPT-film-1920x1080.png'});
 await page.evaluate(()=>document.querySelector('#view').classList.add('ring-film-qa-hide'));
 const hidden=await page.evaluate(()=>{
   return {filter:getComputedStyle(document.querySelector('#ring-arena-canvas')).filter,
     grade:getComputedStyle(document.querySelector('#ring-arena-film-grade')).display};
 });
 assert.equal(hidden.filter,'none','QA reference screenshot must contain untreated 3D game');
 assert.equal(hidden.grade,'none','QA reference must exclude all film treatment');
  await page.screenshot({path:out+'/ring-arena-before-film-1920x1080.png'});
 await page.evaluate(()=>document.querySelector('#view').classList.remove('ring-film-qa-hide'));
 assert.deepEqual(errors,[],'no uncaught page errors');
 console.log('PASS: original GPT film overlay and matched analog grading on live WebGL arena',JSON.stringify({style,picture,grading}));
}finally{await browser.close();await new Promise(done=>server.close(done));}
