import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(pathToFileURL(resolve('site/pixel-lab/flat4.html')).href);
await page.locator('#pixel').waitFor();
const result=await page.evaluate(()=>{
 const c=document.getElementById('pixel');
 const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const colors=new Set();let partial=0,opaque=0;
 for(let i=0;i<d.length;i+=4){
  if(d[i+3]!==0&&d[i+3]!==255)partial++;
  if(d[i+3]===255){opaque++;colors.add([d[i],d[i+1],d[i+2]].join(','))}
 }
 return {w:c.width,h:c.height,colors:[...colors].sort(),partial,opaque,pass:document.getElementById('status').textContent};
});
assert.equal(errors.length,0,'JavaScript runtime errors: '+errors.join('; '));
assert.equal(result.w,64);assert.equal(result.h,96);
assert.equal(result.colors.length,4,'Strict four-color limit');
assert.equal(result.partial,0,'No antialiasing or semitransparency');
assert.ok(result.opaque>800,'Character rendered, not an empty canvas');
assert.match(result.pass,/通过/);
await page.locator('#erase').click();
await page.locator('.swatch').first().click();
await page.locator('#reset').click();
assert.match(await page.locator('#status').innerText(),/通过/);
mkdirSync('flat4-artifacts',{recursive:true});
await page.screenshot({path:'flat4-artifacts/flat4-browser.png',fullPage:true});
console.log(JSON.stringify({status:'PASS',...result},null,2));
}finally{await browser.close()}
