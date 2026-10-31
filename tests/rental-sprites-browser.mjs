import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+'/'))throw Error('route');
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
const base='http://127.0.0.1:'+server.address().port+'/';
const palette=new Set(['57,54,87,255','242,165,194,255','169,186,233,255','255,245,230,255','0,0,0,0']);
mkdirSync('artifacts/rental-sprites',{recursive:true});
try{
 for(const [name,width,height] of [['portrait',390,844],['landscape',844,390],['tablet',768,1024],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'no-preference'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(base,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.buttons?.length===5);
  const button=await page.evaluate(()=>({buttons:window.__PAPERWORLD_MENU__.buttons,logical:window.__PAPERWORLD_MENU__.logical}));
  const b=button.buttons[0],box=await page.locator('#menu').boundingBox();
  await page.mouse.click(box.x+(b.x+b.w/2)*box.width/button.logical[0],box.y+(b.y+b.h/2)*box.height/button.logical[1]);
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.state==='intro'&&!window.__PAPERWORLD_MENU__?.transition,{timeout:15000});
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.intro?.phase==='talk'&&window.__PAPERWORLD_MENU__?.intro?.counterReady&&window.__PAPERWORLD_MENU__?.intro?.loaded,{timeout:12000});
  const scene=await page.evaluate(()=>{
   const m=window.__PAPERWORLD_MENU__,c=document.querySelector('#menu'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();
   for(let i=0;i<d.length;i+=4)colors.add([d[i],d[i+1],d[i+2],d[i+3]].join(','));
   return {intro:m.intro,colors:[...colors],canvas:[c.width,c.height]};
  });
  assert.deepEqual(scene.intro.counterAsset,[192,84]);
  assert.deepEqual(scene.intro.independentLayers,['hostess-pixel','counter-clean-4ink']);
  assert.ok(scene.colors.every(c=>palette.has(c)),name+' four-ink integer sprite pipeline: '+scene.colors.join(' / '));
  assert.equal(await page.locator('#pw-dialogue').isVisible(),true);
  assert.deepEqual(errors,[],name+' must not throw during actual intro');
  await page.screenshot({path:'artifacts/rental-sprites/'+name+'-actual-game.png'});
  console.log('PASS',name,scene.canvas,'separate original hostess and unadorned desk');
  await context.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
