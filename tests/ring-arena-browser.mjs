/* Real-browser render smoke and captures for the NEW WebGL ring arena. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
 '.json':'application/json','.webp':'image/webp','.png':'image/png',
 '.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=url.pathname.endsWith('/')?
   url.pathname+'index.html':url.pathname;
 const file=resolve(root,'.'+name);
 if(!file.startsWith(root+'/'))return res.writeHead(403).end();
 try{res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});
   res.end(readFileSync(file))}
 catch{res.writeHead(404).end('not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/ring-arena',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},
   deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+
   '/index.html?scene=ring-arena',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>{
   const a=window.PaperWorldGameRingArena?.inspect();
   return a?.active&&a.renderer==='webgl'&&a.actors.allies.length===4&&
     a.actors.enemies.length===4&&a.camera.radius>0&&
     document.getElementById('ring-arena-canvas')?.width>800;
 },null,{timeout:60000});
 assert.deepEqual(errors,[],'browser JS errors');
 const initial=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.equal(initial.mode,'outer');
 assert.equal(initial.camera.radius,9.55);
 await page.screenshot({path:'artifacts/ring-arena/outer-left.png'});
 for(let i=0;i<6;i++)await page.locator('[data-shift="1"]').click();
 await page.waitForTimeout(800);
 const moved=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.ok(moved.actors.allies[0].x>initial.actors.allies[0].x+.25);
 for(let i=1;i<4;i++){
   assert.equal(moved.actors.allies[i].x,initial.actors.allies[i].x);
   assert.equal(moved.actors.allies[i].z,initial.actors.allies[i].z);
 }
 await page.screenshot({path:'artifacts/ring-arena/outer-right.png'});
 await page.locator('[data-mode="inner"]').click();
 await page.waitForTimeout(100);
 const inner=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.equal(inner.mode,'inner');assert.equal(inner.camera.radius,1.55);
 await page.screenshot({path:'artifacts/ring-arena/inner-right.png'});
 assert.deepEqual(errors,[],'page errors after switching modes');
 await page.close();
 console.log('PASS: WebGL dual-ring scenes rendered, camera switched, anchored teammates stayed fixed');
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}