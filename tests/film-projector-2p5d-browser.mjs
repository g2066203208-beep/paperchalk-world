import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dir = 'artifacts/film-projector-2p5d';
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
 const errs=[];
 page.on('pageerror',e=>errs.push(String(e)));
 await page.goto('http://127.0.0.1:4173/film-projector/',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#crank');
 assert.equal(await page.locator('.film-cell').count(),7,'seven hunter film frames');
 await page.waitForFunction(()=>document.querySelector('#hero')?.naturalWidth>0,{timeout:12000});
 await page.waitForFunction(()=>document.querySelector('#stage')?.dataset.webglShadows!==undefined,{timeout:12000});
 const quality=await page.locator('#stage').getAttribute('data-webgl-shadows');
 assert.equal(quality,'active','Three.js shadow map renderer must initialize');
 await page.waitForTimeout(1100);
 await page.screenshot({path:path.join(dir,'01-light-on-actual-game.png')});
 assert.equal(await page.locator('#name').innerText(),'血液医师');
 await page.locator('#next').click();
 await page.waitForTimeout(800);
 assert.equal(await page.locator('#name').innerText(),'索弩陷阱师');
 await page.screenshot({path:path.join(dir,'02-film-advanced.png')});
 await page.locator('#toggle').click();
 assert.match(await page.locator('#stage').getAttribute('class'),/light-switch-off/);
 await page.waitForTimeout(450);
 await page.screenshot({path:path.join(dir,'03-light-off.png')});
 assert.deepEqual(errs,[],'no unhandled browser exceptions');
 console.log(JSON.stringify({result:'PASS',shadowMap:quality,filmFrames:7,characterOriginal:await page.locator('#hero').getAttribute('src'),screenshots:dir}));
}finally{await browser.close()}
