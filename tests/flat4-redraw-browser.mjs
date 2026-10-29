import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage({viewport:{width:1280,height:920},deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
await page.goto(pathToFileURL(resolve('site/pixel-lab/flat4-redraw.html')).href);
await page.waitForFunction(()=>Boolean(window.FLAT4_REDRAW?.ready),{timeout:15000});
assert.deepEqual(errors,[]);
const stats=await page.evaluate(()=>window.FLAT4_REDRAW.inspect());
assert.deepEqual(stats,{colors:4,semiTransparent:0,invalid:0,width:112,height:160});
assert.equal(await page.locator('#native').isEnabled(),true);
assert.match(await page.locator('#status').innerText(),/通过/);
mkdirSync('flat4-artifacts',{recursive:true});
await page.screenshot({path:join('flat4-artifacts','flat4-redraw-112x160.png'),fullPage:true});
console.log('PASS hand-redrawn 112x160 four exact RGB colors, native pixel grid, alpha, Chromium',JSON.stringify(stats));
}finally{await browser.close();}
