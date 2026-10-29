import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import assert from 'node:assert/strict';
const mime={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript'};
const root=resolve('site');
const server=createServer((req,res)=>{
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const target=resolve(root,'.'+pathname);
 if(!target.startsWith(root+'/'))throw Error('Forbidden');
 const body=readFileSync(target);
 res.writeHead(200,{'Content-Type':mime[extname(target)]??'application/octet-stream'});res.end(body);
 }catch(e){res.writeHead(404);res.end('Not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:920}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const port=server.address().port;
 await page.goto('http://127.0.0.1:'+port+'/pixel-lab/flat4-learning.html');
 await page.waitForFunction(()=>Boolean(window.FLAT4_LEARNING?.ready),{timeout:15000});
 assert.deepEqual(errors,[],'No browser script errors');
 assert.equal(await page.locator('#steps').innerText(),'260');
 assert.equal(await page.locator('#sourceCount').innerText(),'1');
 await page.locator('#damage').click();
 const masked=Number(await page.locator('#masked').innerText());
 assert.ok(masked>=500&&masked<=1000,'12% mask');
 await page.locator('#repair').click();
 const pct=parseFloat(await page.locator('#after').innerText());
 assert.ok(pct>=35&&pct<=100,'Actual learned inference reasonable accuracy: '+pct);
 const raw=await page.evaluate(()=>{const canvas=document.getElementById('restored'),d=canvas.getContext('2d').getImageData(0,0,64,96).data;const colors=new Set();let partial=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>0&&d[i+3]<255)partial++;if(d[i+3])colors.add([d[i],d[i+1],d[i+2]].join(','))}return {w:canvas.width,h:canvas.height,colors:colors.size,partial}});
 assert.equal(raw.colors,4);assert.equal(raw.partial,0);assert.equal(raw.w,64);assert.equal(raw.h,96);
 mkdirSync('flat4-artifacts',{recursive:true});
 await page.screenshot({path:'flat4-artifacts/flat4-learned-browser.png',fullPage:true});
 console.log('PASS real FLAT4 learned masked-pixel reconstruction',JSON.stringify({masked,pct,...raw}));
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
