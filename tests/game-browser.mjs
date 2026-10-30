import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';

const root=resolve('site'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=createServer((req,res)=>{
  try{
    const urlPath=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const path=resolve(root,'.'+(urlPath==='/'?'/index.html':urlPath));
    if(!path.startsWith(root+'/'))throw new Error('Invalid path');
    res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(readFileSync(path));
  }catch(error){res.writeHead(404);res.end('Not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const url='http://127.0.0.1:'+server.address().port+'/';
mkdirSync('artifacts/game',{recursive:true});
try{
  for(const [name,width,height] of [['desktop',1440,900],['portrait',390,844],['landscape',844,390],['tablet',768,1024]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:name!=='desktop',hasTouch:name!=='desktop',deviceScaleFactor:1});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'load'});
    await page.waitForFunction(()=>document.querySelector('#background')?.width>0);
    const info=await page.evaluate(()=>{
      const canvas=document.querySelector('#background'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();
      for(let i=0;i<pixels.length;i+=4)colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]+','+pixels[i+3]);
      const rect=canvas.getBoundingClientRect();
      return {colors:[...colors].sort(),canvasWidth:canvas.width,canvasHeight:canvas.height,rect:rect.toJSON(),innerWidth,innerHeight,
        sceneCount:document.querySelectorAll('canvas').length,
        controls:document.querySelectorAll('button,input,select,textarea,a,img,.screen-shell,.dialogue,#app').length,
        imageRendering:getComputedStyle(canvas).imageRendering};
    });
    assert.deepEqual(info.colors,['169,186,233,255','255,245,230,255'],'only exact D mist-blue and cream output');
    assert.equal(info.sceneCount,1,'exactly one background canvas');
    assert.equal(info.controls,0,'no legacy UI/portrait/dialogue/menu elements');
    assert.equal(info.canvasWidth,Math.ceil(info.innerWidth/4)+80,'one full 80-cell seamless overscan');
    assert.equal(info.canvasHeight,Math.ceil(info.innerHeight/4));
    assert.ok(info.rect.width>=info.innerWidth+320 && info.rect.width<info.innerWidth+324);
    assert.ok(info.rect.height>=info.innerHeight && info.rect.height<info.innerHeight+4);
    assert.equal(info.imageRendering,'pixelated');
    const fn=await page.evaluate(async()=>{
      const m=await import('./game/background.js?v=20261030-blue8s');
      return {palette:m.PALETTE,colors:[m.BACKGROUND,m.STRIPE],wrap:[...Array(20)].every((_,i)=>m.stripeAt(i,42,0)===m.stripeAt(i,42,80)),
        loop:m.phaseFromSeconds(0)===m.phaseFromSeconds(8),
        motion:[...Array(80)].some((_,x)=>m.stripeAt(x,1,0)!==m.stripeAt(x,1,20))};
    });
    assert.deepEqual(fn.palette,['#393657','#F2A5C2','#A9BAE9','#FFF5E6']);
    assert.deepEqual(fn.colors,['#FFF5E6','#A9BAE9']);
    assert.ok(fn.wrap&&fn.loop&&fn.motion,'real seamless movement with period');
    const compositor=await page.evaluate(()=>{
      const c=document.getElementById('background');
      const stats=window.__PAPERWORLD_BACKGROUND__;
      const initial=stats.redraws;
      const animation=c.getAnimations()[0];
      if(!animation)return {exists:false};
      animation.pause();
      animation.currentTime=1000;
      const x0=new DOMMatrixReadOnly(getComputedStyle(c).transform).m41;
      animation.currentTime=2000;
      const x1=new DOMMatrixReadOnly(getComputedStyle(c).transform).m41;
      const after=stats.redraws;
      const timing=animation.effect.getComputedTiming();
      return {exists:true,x0,x1,initial,after,duration:timing.duration};
    });
    assert.ok(compositor.exists,'CSS compositor animation is active');
    assert.equal(compositor.duration,8000);
    assert.ok(Math.abs((compositor.x1-compositor.x0)+320/8)<0.3,'subpixel-continuous pan, not stepped raster offset');
    assert.equal(compositor.initial,1,'render only once on mount');
    assert.equal(compositor.after,compositor.initial,'never redraw texture for each animation frame');
    await page.screenshot({path:'artifacts/game/'+name+'-background.png'});
    assert.deepEqual(errors,[], 'no browser JavaScript errors');
    await context.close();
  }
  console.log('GPU continuous stripe background: 4 viewports, 2 exact source colors, no redraw, seam PASS');
}finally{await browser.close();await new Promise(done=>server.close(done))}
