import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('artifacts/map-terrain-3d',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:650}});
 const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
 await page.goto(new URL('terrain-3d.html',base).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.PaperWorldTerrainStandalone?.terrain?.inspect()?.frames>2,null,{timeout:30000});
 const state=await page.evaluate(()=>window.PaperWorldTerrainStandalone.terrain.inspect());
 assert.equal(state.world,'infinite');assert.equal(state.mode,'3d');assert.ok(state.vertices>300);
 await page.screenshot({path:'artifacts/map-terrain-3d/retained-3d-terrain.png'});
 await page.locator('.pw-terrain-edit-toggle').click();
 assert.equal(await page.locator('#terrain-stage').getAttribute('data-terrain-editing'),'true');
 console.log('PASS: 3D terrain retained without deleted map UI');
}finally{await browser.close()}
