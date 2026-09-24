import { chromium } from 'playwright-core';

const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:720}});
await page.goto('http://127.0.0.1:8080/index.html?paper-fx-audit=1',{waitUntil:'networkidle'});
await page.evaluate(()=>{
  localStorage.setItem('paperchalk.session.v1',JSON.stringify({account:'fx',displayName:'FX'}));
  localStorage.setItem('paperchalk.save.v1',JSON.stringify({account:'fx',worldX:0,actorRatio:.35,worldMinutes:0}));
});
await page.reload({waitUntil:'networkidle'});
await page.locator('#continueBtn').click();
await page.waitForTimeout(700);
await page.locator('#backpackBtn').click();
await page.waitForTimeout(1100);
const backpack=await page.evaluate(()=>{
  const b=document.getElementById('paperFxBall');
  const u=document.getElementById('paperFxUnfold');
  return {
    ballComputedOpacity:getComputedStyle(b).opacity,
    ballInlineOpacity:b.style.opacity,
    ballAnimations:b.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime,fill:a.effect?.getTiming?.().fill})),
    unfoldComputedOpacity:getComputedStyle(u).opacity,
    unfoldInlineOpacity:u.style.opacity,
    unfoldAnimations:u.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime,fill:a.effect?.getTiming?.().fill}))
  };
});
await page.locator('#backpackClose').click();
await page.locator('#worldMenuBtn').click();
await page.waitForTimeout(1000);
await page.locator('#settingsBtn').click();
await page.waitForTimeout(1100);
const settings=await page.evaluate(()=>{
  const b=document.getElementById('paperFxBall');
  const u=document.getElementById('paperFxUnfold');
  return {
    ballComputedOpacity:getComputedStyle(b).opacity,
    ballInlineOpacity:b.style.opacity,
    ballAnimations:b.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime,fill:a.effect?.getTiming?.().fill})),
    unfoldComputedOpacity:getComputedStyle(u).opacity,
    unfoldInlineOpacity:u.style.opacity,
    unfoldAnimations:u.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime,fill:a.effect?.getTiming?.().fill}))
  };
});
console.log('PAPER_FX_AUDIT '+JSON.stringify({backpack,settings}));
if(backpack.ballComputedOpacity!=='0'||settings.ballComputedOpacity!=='0') process.exitCode=3;
await browser.close();
