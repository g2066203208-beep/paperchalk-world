/* Actual GitHub-hosted 3D battle: all-height film portraits, no full-screen outer border. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site');
const out=resolve('artifacts/ring-arena-film-screen');
mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root+'/'))return res.writeHead(403).end('forbidden');
 let data;try{data=readFileSync(file)}catch{return res.writeHead(404).end('not found')}
 res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'}).end(data);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
try{
 const origin='http://127.0.0.1:'+server.address().port;
 for(const cfg of [
   {name:'desktop-1920x1080',width:1920,height:1080},
   {name:'desktop-1280x720',width:1280,height:720},
   {name:'landscape-844x390',width:844,height:390}
 ]){
  const page=await browser.newPage({viewport:{width:cfg.width,height:cfg.height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  try{
   await page.goto(origin+'/index.html?scene=ring-arena',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>{const r=window.PaperWorldGameRingArena?.inspect?.();
    return r?.active&&r.renderer==='webgl-l2d'&&r.timegridEnabled&&r.timegrid?.phase==='planning'&&
      document.querySelectorAll('.tg-reel>.tg-row').length===8;},null,{timeout:120000});
   await page.waitForFunction(()=>[...document.querySelectorAll('.tg-face')].every(img=>img.complete&&img.naturalWidth>0),null,{timeout:30000});
   await page.waitForTimeout(500);
   const check=await page.evaluate(()=>{
    const rect=el=>el?.getBoundingClientRect()?.toJSON();
    const viewport=document.querySelector('.tg-film-viewport');
    const reel=document.querySelector('.tg-reel');
    const top=document.querySelector('.tg-film-blank-top');
    const bottom=document.querySelector('.tg-film-blank-bottom');
    const strip=rect(viewport),actor=rect(reel);
    const layers={frame:document.querySelector('#ring-arena-film-screen'),grade:document.querySelector('#ring-arena-film-grade')};
    return {screen:{width:innerWidth,height:innerHeight},strip,actor,
      blankTop:rect(top),blankBottom:rect(bottom),
      loaded:!!top&&!!bottom,rows:[...reel.children].map(x=>rect(x)),
      blankImage:getComputedStyle(top).backgroundImage,
      layout:document.querySelector('.ring-timegrid').dataset.layout,
      webgl:window.PaperWorldGameRingArena.inspect().renderer,
      filmMix:window.PaperWorldGameRingArena.inspect().filmGrade.mix,
      outerFrameMounted:!!layers.frame||!!layers.grade};
   });
   console.log('REAL_BATTLE_FULL_HEIGHT_REEL',cfg.name,JSON.stringify(check));
   assert.equal(check.webgl,'webgl-l2d');
   assert.equal(check.outerFrameMounted,false,'rejected giant film border must not mount');
   assert.equal(check.filmMix,0,'scene must retain neutral lighting, not film color grade');
   assert.equal(check.layout,'handpainted-film-portrait-timegrid-v4');
   assert.ok(check.strip.width>=100,'portraits must be large');
   assert.ok(Math.abs(check.strip.y)<2,'film begins at actual top edge');
   assert.ok(Math.abs(check.strip.height-check.screen.height)<2,'film runs to actual bottom edge');
   assert.ok(Math.abs(check.strip.x+check.strip.width-check.screen.width)<2,'film is flush with right edge');
   assert.equal(check.rows.length,8,'four allies and four enemies');
   assert.ok(check.blankTop.height>=1&&check.blankBottom.height>=1,'both ends use continuing empty film');
   assert.ok(check.blankImage.includes('painted-film-blank-a.webp'));
   assert.ok(check.rows.every(row=>Math.abs(row.width-check.strip.width)<=2&&row.height>=28));
   await page.screenshot({path:out+'/ring-arena-full-height-film-'+cfg.name+'.png',animations:'disabled',timeout:20000});
   await page.locator('[data-tg-choose-role="1"]').click();
   assert.equal(await page.locator('.tg-timeline:not([hidden])').count(),1,
    'hero portrait opens the associated ten-tick panel');
   assert.equal(await page.locator('[data-tg-tick]').count(),10);
   await page.screenshot({path:out+'/ring-arena-timegrid-open-'+cfg.name+'.png',animations:'disabled',timeout:20000});
   assert.deepEqual(errors,[],'browser must render without uncaught JavaScript errors');
  }finally{await page.close()}
 }
 console.log('PASS: actual WebGL battle has large 100% height right-edge portrait film and filled blank sections');
}finally{await browser.close();await new Promise(done=>server.close(done))}
