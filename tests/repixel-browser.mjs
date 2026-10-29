import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(resolve('site/pixel-lab/repixelize.html')).href);
 // file:// fetch is blocked in Chromium. Uploading a real pixel-preview
 // exercises browser-side conversion without relying on fetch() file URL.
 await page.locator('#upload').setInputFiles(resolve('site/pixel-lab/repixelized-preview.png'));
 await page.locator('#convert').click();
 await page.waitForFunction(()=>Boolean(window.REPIXEL?.ready),{timeout:30000});
 const out=await page.evaluate(()=>({w:document.querySelector('canvas').width,h:document.querySelector('canvas').height,metrics:window.REPIXEL.metrics}));
 assert.equal(out.w,384);assert.equal(out.h,512);
 assert.equal(out.metrics.colors,4);assert.equal(out.metrics.partial,0);assert.equal(out.metrics.illegal,0);
 assert.equal(errors.length,0,errors.join('\n'));
 assert.equal(await page.locator('#save').isEnabled(),true);
 mkdirSync('repixel-browser-artifacts',{recursive:true});
 await page.screenshot({path:'repixel-browser-artifacts/repixelize-real-chromium.png',fullPage:true});
 console.log('REPIXEL CHROMIUM PASS: genuine input upload, faithful four-color native grid, no aliasing',out);
}finally{await browser.close();}
