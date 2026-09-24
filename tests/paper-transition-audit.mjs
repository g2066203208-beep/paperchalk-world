import { chromium } from 'playwright-core';

const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:720}});
await page.goto('http://127.0.0.1:8080/index.html?paper-fx-audit=2',{waitUntil:'networkidle'});
await page.evaluate(()=>{
  localStorage.setItem('paperchalk.session.v1',JSON.stringify({account:'fx',displayName:'FX'}));
  localStorage.setItem('paperchalk.save.v1',JSON.stringify({account:'fx',worldX:0,actorRatio:.35,worldMinutes:0}));
});
await page.reload({waitUntil:'networkidle'});
await page.locator('#continueBtn').click();
await page.waitForTimeout(700);

async function fxState(){
  return page.evaluate(()=>{
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
}

await page.locator('#backpackBtn').click();
await page.waitForTimeout(1100);
const backpack=await fxState();
await page.locator('#backpackClose').click();

// Open menu from the world using paper transition, then attempt to continue back to world.
await page.locator('#worldMenuBtn').click();
await page.waitForTimeout(1100);
const menuOpen=await page.evaluate(()=>{
  const s=document.getElementById('uiShell');
  return {
    className:s.className,
    computedOpacity:getComputedStyle(s).opacity,
    pointerEvents:getComputedStyle(s).pointerEvents,
    animations:s.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime,fill:a.effect?.getTiming?.().fill}))
  };
});
await page.locator('#continueBtn').click();
await page.waitForTimeout(700);
const menuAfterContinue=await page.evaluate(()=>{
  const s=document.getElementById('uiShell');
  return {
    className:s.className,
    computedOpacity:getComputedStyle(s).opacity,
    pointerEvents:getComputedStyle(s).pointerEvents,
    animations:s.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime,fill:a.effect?.getTiming?.().fill}))
  };
});

// Reopen menu and settings for second paper-ball cleanup check.
await page.locator('#worldMenuBtn').click();
await page.waitForTimeout(1100);
await page.locator('#settingsBtn').click();
await page.waitForTimeout(1100);
const settings=await fxState();

const result={backpack,menuOpen,menuAfterContinue,settings};
console.log('PAPER_FX_AUDIT '+JSON.stringify(result));

const failures=[];
if(backpack.ballComputedOpacity!=='0') failures.push('paper ball remains after backpack transition');
if(settings.ballComputedOpacity!=='0') failures.push('paper ball remains after settings transition');
if(menuAfterContinue.computedOpacity!=='0') failures.push('uiShell stays visually opaque after Continue');
console.log('PAPER_FX_FAILURES '+JSON.stringify(failures));
if(failures.length) process.exitCode=3;
await browser.close();
