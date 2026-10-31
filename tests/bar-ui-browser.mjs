import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';

const root=resolve('site');
const server=createServer((req,res)=>{
 try{
  const upath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const full=resolve(root,'.'+(upath==='/'?'/index.html':upath));
  if(!full.startsWith(root+'/'))throw Error('outside site');
  const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json'};
  res.writeHead(200,{'Content-Type':type[extname(full)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(full));
 }catch(e){res.writeHead(404);res.end(String(e))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
mkdirSync('artifacts/bar-ui',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const cases=[
 ['portrait',390,844],['landscape',844,390],
 ['desktop',1440,900],['tablet',820,1180]
];
const rectOverlap=(a,b)=>Math.max(a.x,b.x)<Math.min(a.x+a.w,b.x+b.w)&&Math.max(a.y,b.y)<Math.min(a.y+a.h,b.y+b.h);
try{
 for(const [label,width,height] of cases){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/?bar=1',{waitUntil:'load'});
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.state==='bar'&&window.__PAPERWORLD_MENU__.bar?.portraitReady,{timeout:15000});
  const state=()=>page.evaluate(()=>window.__PAPERWORLD_MENU__);
  const first=await state();
  assert.equal(first.state,'bar');
  assert.equal(first.bar.stage,'greeting');
  const {layout,buttons}=first.bar;
  assert.ok(layout && buttons.length>=6);
  assert.deepEqual(layout.fullPortrait.source,[192,256],label+' whole figure source');
  assert.ok(layout.fullPortrait.x+layout.fullPortrait.w+4<layout.fullPortrait.deskStart,label+' figure and counter cannot intersect');
  const panels=[layout.header,layout.room,layout.dialogue,layout.mixer];
  for(const r of panels){
   assert.ok(r.w>=65&&r.h>=(r===layout.header?20:55)&&r.x>=0&&r.y>=0&&r.x+r.w<=first.logical[0]&&r.y+r.h<=first.logical[1],label+' rectangle '+JSON.stringify(r));
  }
  for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++)
   assert.ok(!rectOverlap(panels[i],panels[j]),label+' panel overlaps '+i+' '+j);
  for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++)
   assert.ok(!rectOverlap(buttons[i],buttons[j]),label+' buttons overlap '+buttons[i].id+' '+buttons[j].id);
  const p=await page.evaluate(()=>{
   const canvas=document.getElementById('menu'),ctx=canvas.getContext('2d');
   const im=ctx.getImageData(0,0,canvas.width,canvas.height).data,s=new Set();
   for(let i=0;i<im.length;i+=64){
    s.add(Array.from(im.slice(i,i+4)).join(','));
   }
   return [...s];
  });
  for(const pixel of p)assert.ok(['57,54,87,255','242,165,194,255','169,186,233,255','255,245,230,255'].includes(pixel),label+' unexpected RGB '+pixel);
  await page.screenshot({path:'artifacts/bar-ui/'+label+'-bar-initial.png'});
  async function press(id){
   const m=await state();
   const button=m.bar.buttons.find(b=>b.id===id);
   assert.ok(button,label+' missing '+id);
   const bb=await page.locator('#menu').boundingBox();
   await page.mouse.click(bb.x+(button.x+button.w*.5)*bb.width/m.logical[0],
     bb.y+(button.y+button.h*.5)*bb.height/m.logical[1]);
   await page.waitForTimeout(80);
  }
  await press('next');await press('next');
  assert.equal((await state()).bar.stage,'order');
  await press('m0');await press('m0');await press('m1');
  assert.deepEqual((await state()).bar.counts,[2,1,0]);
  await press('mix');
  assert.equal((await state()).bar.stage,'served');
  await page.screenshot({path:'artifacts/bar-ui/'+label+'-bar-served.png'});
  assert.deepEqual(errors,[],label+' runtime errors');
  await context.close();
  console.log('PASS '+label+': viewport, color palette, button hitboxes, order & drink flow');
 }
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
