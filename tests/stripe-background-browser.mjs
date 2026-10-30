import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';

const root=resolve('site');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root+'/'))throw Error('Traversal');
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(path));
 }catch(e){res.writeHead(404);res.end('Not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const url='http://127.0.0.1:'+server.address().port+'/stripe-game/';
 mkdirSync('artifacts/stripe-game',{recursive:true});
 for(const [name,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet',768,1024],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:name==='desktop'?1:3,isMobile:name!=='desktop',hasTouch:name!=='desktop'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url,{waitUntil:'load'});
  await page.waitForFunction(()=>document.getElementById('pattern').width>0);
  const data=await page.evaluate(()=>{
   const canvas=document.getElementById('pattern'),ctx=canvas.getContext('2d');
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   const colors=new Set();
   for(let i=0;i<pixels.length;i+=4)colors.add([pixels[i],pixels[i+1],pixels[i+2],pixels[i+3]].join(','));
   return {width:canvas.width,height:canvas.height,pixelCss:parseInt(canvas.style.width)/canvas.width,colors:[...colors].sort(),viewportW:document.documentElement.clientWidth,viewportH:innerHeight};
  });
  assert.deepEqual(data.colors,['242,165,194,255','255,245,230,255']);
  assert.equal(data.pixelCss,4);
  assert.equal(data.width,Math.ceil(data.viewportW/4));
  assert.equal(data.height,Math.ceil(data.viewportH/4));
  await page.screenshot({path:'artifacts/stripe-game/'+name+'.png'});
  await page.getByRole('button',{name:'打开背景设置'}).click();
  assert.equal(await page.locator('#panel').evaluate(el=>el.classList.contains('open')),true);
  await page.locator('#pixelSize').evaluate(el=>{el.value='6';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await page.locator('#pixelSizeValue').textContent(),'6 CSS px');
  await page.getByRole('button',{name:'关闭背景设置'}).click();
  assert.equal(errors.length,0,errors.join('\n'));
  await context.close();
 }
 console.log('Stripe game responsive Chromium 4-device test PASS');
}finally{await browser.close();await new Promise(done=>server.close(done))}
