import process from 'node:process';
import fs from 'node:fs';
import {chromium} from 'playwright-core';

function assert(c,m){if(!c)throw new Error(m)}
fs.mkdirSync('artifacts',{recursive:true});
const errors=[];
const browser=await chromium.launch({
 executablePath:process.env.CHROME_PATH,
 headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
try{
 const page=await browser.newPage({viewport:{width:1365,height:768}});
 page.on('pageerror',e=>errors.push('PAGE '+String(e)));
 page.on('response',res=>{if(res.status()>=400&&!res.url().endsWith('/favicon.ico'))errors.push('HTTP '+res.status()+' '+res.url())});
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push('CONSOLE '+m.text())});
 await page.goto('http://127.0.0.1:8080/',{waitUntil:'networkidle'});
 await page.waitForSelector('canvas',{timeout:10000});
 await page.waitForFunction(()=>window.PaperchalkGame?.player,{timeout:10000});
 await page.waitForTimeout(800);

 const before=await page.evaluate(()=>({
   player:window.PaperchalkGame.player,
   stats:window.PaperchalkGame.stats(),
   heading:document.querySelector('.panel h1')?.textContent||'',
   buttons:[...document.querySelectorAll('button')].map(b=>b.textContent.trim())
 }));
 assert(before.heading.includes('v12.32'),'visual-demo baseline heading missing '+JSON.stringify(before));
 assert(before.stats.runtime.systems===1,'player controller not registered '+JSON.stringify(before.stats));
 assert(before.stats.terrain.columns===105,'terrain query must cover authored demo columns '+JSON.stringify(before.stats.terrain));
 for(const label of ['目标效果','程序天空','标准立方体','动态纸雾','Paper003','受光体积雾'])assert(before.buttons.includes(label),'demo control missing '+label);

 await page.keyboard.down('ArrowRight');
 await page.waitForFunction(()=>window.PaperchalkGame.player?.distance>.34,{timeout:6000});
 await page.keyboard.up('ArrowRight');
 await page.waitForTimeout(120);
 const right=await page.evaluate(()=>window.PaperchalkGame.player);
 const rightDisp=Math.hypot(right.x-before.player.x,right.z-before.player.z);
 assert(rightDisp>.3,'right movement did not move player '+JSON.stringify({before:before.player,right}));
 assert(right.distance>.34,'player travel distance not tracked '+JSON.stringify(right));

 await page.keyboard.down('ArrowLeft');
 await page.waitForFunction(
   start=>Math.hypot(window.PaperchalkGame.player.x-start.x,window.PaperchalkGame.player.z-start.z)<.2,
   before.player,
   {timeout:6000}
 );
 await page.keyboard.up('ArrowLeft');
 await page.waitForTimeout(120);
 const back=await page.evaluate(()=>window.PaperchalkGame.player);
 assert(Math.hypot(back.x-before.player.x,back.z-before.player.z)<.25,'left movement did not return player near start '+JSON.stringify({before:before.player,back}));

 const canvas=page.locator('canvas').first(),box=await canvas.boundingBox();
 assert(box&&box.width>500&&box.height>300,'Three.js canvas missing');
 await page.screenshot({path:'artifacts/new-main-visual-demo.png'});
 assert(fs.statSync('artifacts/new-main-visual-demo.png').size>10000,'render screenshot too small');

 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 mobile.on('pageerror',e=>errors.push('MOBILE PAGE '+String(e)));
 await mobile.goto('http://127.0.0.1:8080/',{waitUntil:'networkidle'});
 await mobile.waitForFunction(()=>window.PaperchalkGame?.player,{timeout:10000});
 await mobile.waitForTimeout(500);
 const mobileState=await mobile.evaluate(()=>({
   debugDisplay:getComputedStyle(document.getElementById('debugSheet')).display,
   toggleDisplay:getComputedStyle(document.getElementById('uiToggle')).display,
   moveDisplay:getComputedStyle(document.getElementById('mobileMove')).display,
   introDisplay:getComputedStyle(document.querySelector('.panel p')).display,
   player:window.PaperchalkGame.player
 }));
 assert(mobileState.debugDisplay==='none','mobile debug sheet should start collapsed '+JSON.stringify(mobileState));
 assert(mobileState.toggleDisplay!=='none','mobile settings toggle missing '+JSON.stringify(mobileState));
 assert(mobileState.moveDisplay!=='none','mobile movement controls missing '+JSON.stringify(mobileState));
 assert(mobileState.introDisplay==='none','long demo copy should be hidden on mobile '+JSON.stringify(mobileState));

 await mobile.locator('#uiToggle').click();
 const opened=await mobile.evaluate(()=>getComputedStyle(document.getElementById('debugSheet')).display);
 assert(opened!=='none','mobile settings sheet did not open');

 await mobile.locator('#uiToggle').click();
 const startMobile=await mobile.evaluate(()=>window.PaperchalkGame.player.distance);
 await mobile.locator('#moveRight').dispatchEvent('pointerdown',{pointerId:21,pointerType:'touch'});
 await mobile.waitForFunction(d=>window.PaperchalkGame.player.distance>d+.18,startMobile,{timeout:6000});
 await mobile.locator('#moveRight').dispatchEvent('pointerup',{pointerId:21,pointerType:'touch'});
 await mobile.waitForTimeout(100);
 const movedMobile=await mobile.evaluate(()=>window.PaperchalkGame.player.distance);
 assert(movedMobile>startMobile+.18,'touch right control did not move player');
 await mobile.screenshot({path:'artifacts/new-main-mobile.png'});
 assert(fs.statSync('artifacts/new-main-mobile.png').size>10000,'mobile screenshot too small');
 await mobile.close();

 if(errors.length)throw new Error(errors.join('\n'));
 console.log('DEMO_MODULAR_MAIN_BROWSER_OK');
}finally{
 await browser.close();
}
