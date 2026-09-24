import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT='audit-artifacts';
fs.mkdirSync(OUT,{recursive:true});
const baseURL='http://127.0.0.1:8080/index.html?audit=1';
const report={startedAt:new Date().toISOString(),checks:[],consoleErrors:[],consoleWarnings:[],pageErrors:[],requestFailures:[],httpErrors:[],screenshots:[],notes:[]};

function add(name,pass,detail='',severity='medium',surface='general'){
  report.checks.push({name,pass:!!pass,detail,severity,surface});
  const icon=pass?'PASS':'FAIL';
  console.log(`${icon} | ${severity.toUpperCase()} | ${surface} | ${name} | ${detail}`);
}
async function shot(page,name){
  const file=path.join(OUT,name+'.png');
  await page.screenshot({path:file,fullPage:true});
  report.screenshots.push(file);
}
async function state(page){
  return await page.evaluate(()=>window.eval('({worldX,actorX,keyboardLeft,keyboardRight,joystickAxis,facing})'));
}
async function storage(page,key){
  return await page.evaluate(k=>{
    const raw=localStorage.getItem(k);
    if(raw==null)return null;
    try{return JSON.parse(raw)}catch{return raw}
  },key);
}
async function visibleRect(page,sel){
  return await page.locator(sel).evaluate(el=>{
    const r=el.getBoundingClientRect();
    const s=getComputedStyle(el);
    return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,display:s.display,visibility:s.visibility,opacity:s.opacity};
  });
}
function inside(rect,w,h,tol=1){
  return rect.x>=-tol&&rect.y>=-tol&&rect.right<=w+tol&&rect.bottom<=h+tol;
}

const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_PATH,
  args:['--no-sandbox','--disable-dev-shm-usage']
});

async function wire(page,label){
  page.on('console',msg=>{
    if(msg.type()==='error')report.consoleErrors.push({label,text:msg.text()});
    if(msg.type()==='warning')report.consoleWarnings.push({label,text:msg.text()});
  });
  page.on('pageerror',err=>report.pageErrors.push({label,text:String(err)}));
  page.on('requestfailed',req=>report.requestFailures.push({label,url:req.url(),failure:req.failure()}));
  page.on('response',res=>{if(res.status()>=400)report.httpErrors.push({label,url:res.url(),status:res.status()});});
}

try{
  // ---------- DESKTOP FLOW ----------
  const desktop=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  const page=await desktop.newPage();
  await wire(page,'desktop');
  await page.goto(baseURL,{waitUntil:'networkidle'});
  await page.waitForTimeout(500);

  add('Initial main menu is visible',await page.locator('#pageMenu.active').count()===1,'#pageMenu.active','high','menu');
  add('UI shell blocks world on launch',!(await page.locator('#uiShell').evaluate(el=>el.classList.contains('is-hidden'))),'uiShell visible','high','menu');

  const brokenImages=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src')));
  add('All runtime images loaded',brokenImages.length===0,brokenImages.length?JSON.stringify(brokenImages):'all img naturalWidth > 0','high','assets');

  const mid=await page.evaluate(()=>document.documentElement.dataset.midground||'');
  add('Midground atlas initialized',mid==='ready','dataset.midground='+mid,'high','world');
  await shot(page,'01-main-menu');

  // Open auth through the actual paper transition.
  await page.locator('#authBtn').click();
  await page.waitForSelector('#pageAuth.active',{timeout:3000});
  add('Paper transition reaches auth page',true,'auth page active after click','medium','transition');

  // Register account A.
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('audit_a');
  await page.locator('#regName').fill('审计A');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('uiShell').classList.contains('is-hidden'));
  const sessionA=await storage(page,'paperchalk.session.v1');
  add('Register A enters world',sessionA?.account==='audit_a',JSON.stringify(sessionA),'high','account');
  await shot(page,'02-world-a');

  const before=await state(page);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1800);
  await page.keyboard.up('KeyD');
  const after=await state(page);
  add('Desktop D key moves actor/world',after.actorX>before.actorX||after.worldX>before.worldX,`before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,'critical','movement');
  add('World eventually scrolls after follow zone',after.worldX>0,`worldX=${after.worldX}`,'high','movement');

  // Save by opening world menu.
  await page.locator('#worldMenuBtn').click();
  await page.waitForFunction(()=>!document.getElementById('uiShell').classList.contains('is-hidden'));
  const saveA=await storage(page,'paperchalk.save.v1');
  add('World menu saves account A',saveA?.account==='audit_a',JSON.stringify(saveA),'critical','save');
  add('Saved worldX matches runtime',Math.abs((saveA?.worldX??-999)-after.worldX)<4,`saved=${saveA?.worldX} runtime=${after.worldX}`,'high','save');

  // Continue should restore.
  await page.locator('#continueBtn').click();
  await page.waitForFunction(()=>document.getElementById('uiShell').classList.contains('is-hidden'));
  const restored=await state(page);
  add('Continue restores world position',Math.abs(restored.worldX-after.worldX)<4,`restored=${restored.worldX} expected≈${after.worldX}`,'high','save');

  // Backpack.
  await page.locator('#backpackBtn').click();
  await page.waitForFunction(()=>document.getElementById('backpackOverlay').classList.contains('is-open'));
  add('Backpack opens',true,'overlay is-open','high','inventory');
  add('Backpack has 20 slots',await page.locator('#backpackSlots .inventory-slot').count()===20,`slots=${await page.locator('#backpackSlots .inventory-slot').count()}`,'high','inventory');
  const bpRect=await visibleRect(page,'#backpackFrame');
  add('Desktop backpack stays inside viewport',inside(bpRect,1440,900),JSON.stringify(bpRect),'medium','inventory');
  await shot(page,'03-backpack-empty');

  // Inject one item into the real runtime inventory to test action buttons.
  const injected=await page.evaluate(()=>{
    try{
      window.eval("inventoryItems[0]={name:'审计叶片',desc:'测试物品',weight:1.2,count:2,icon:'./assets/ui/inventory-v2/leaf.png'};inventorySelected=0;renderInventory();");
      return true;
    }catch(e){return String(e)}
  });
  add('Audit can populate runtime inventory',injected===true,String(injected),'low','inventory');
  const useEnabled=await page.locator('#inventoryUse').isEnabled();
  const dropEnabled=await page.locator('#inventoryDrop').isEnabled();
  add('Use/Drop enable for selected item',useEnabled&&dropEnabled,`use=${useEnabled} drop=${dropEnabled}`,'high','inventory');

  const itemBefore=await page.evaluate(()=>window.eval('JSON.stringify(inventoryItems[0])'));
  if(useEnabled)await page.locator('#inventoryUse').click();
  await page.waitForTimeout(150);
  const itemAfterUse=await page.evaluate(()=>window.eval('JSON.stringify(inventoryItems[0])'));
  add('Use button performs a game action',itemAfterUse!==itemBefore,`before=${itemBefore} after=${itemAfterUse}`,'critical','inventory');

  if(dropEnabled)await page.locator('#inventoryDrop').click();
  await page.waitForTimeout(150);
  const itemAfterDrop=await page.evaluate(()=>window.eval('JSON.stringify(inventoryItems[0])'));
  add('Drop button removes/reduces selected item',itemAfterDrop!==itemAfterUse,`before=${itemAfterUse} after=${itemAfterDrop}`,'critical','inventory');
  await shot(page,'04-backpack-injected-item');

  await page.locator('#backpackClose').click();
  await page.waitForFunction(()=>!document.getElementById('backpackOverlay').classList.contains('is-open'));

  // Time system check. Save says 1 sec = 1 min in settings, but runtime should advance if implemented.
  const time0=(await storage(page,'paperchalk.save.v1'))?.worldMinutes;
  await page.waitForTimeout(2200);
  await page.locator('#worldMenuBtn').click();
  await page.waitForFunction(()=>!document.getElementById('uiShell').classList.contains('is-hidden'));
  const time1=(await storage(page,'paperchalk.save.v1'))?.worldMinutes;
  add('World time advances while playing',Number.isFinite(time0)&&Number.isFinite(time1)&&time1>time0,`before=${time0} after≈2.2s=${time1}`,'high','world-time');

  // Settings are expected to be actionable if shown as settings.
  await page.locator('#settingsBtn').click();
  await page.waitForSelector('#pageSettings.active');
  const settingControls=await page.locator('#pageSettings input,#pageSettings select,#pageSettings button:not([data-back])').count();
  add('Settings page has actual controls',settingControls>0,`interactive setting controls=${settingControls}`,'high','settings');
  await shot(page,'05-settings');

  // Back to menu, sign out and register B.
  await page.locator('#pageSettings [data-back="menu"]').click();
  await page.waitForSelector('#pageMenu.active');
  await page.locator('#authBtn').click();
  await page.waitForSelector('#pageAuth.active');
  const noSession=await storage(page,'paperchalk.session.v1');
  add('Auth button signs current account out before auth page',noSession===null,JSON.stringify(noSession),'medium','account');

  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('audit_b');
  await page.locator('#regName').fill('审计B');
  await page.locator('#regPass').fill('test5678');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('uiShell').classList.contains('is-hidden'));

  const sessionB=await storage(page,'paperchalk.session.v1');
  const saveAfterBEnter=await storage(page,'paperchalk.save.v1');
  const bState=await state(page);
  add('Register B enters as B',sessionB?.account==='audit_b',JSON.stringify(sessionB),'high','account');
  add('Account B does not inherit account A save',saveAfterBEnter?.account==='audit_b' && Math.abs((bState.worldX||0))<1,
      `session=${sessionB?.account} save.account=${saveAfterBEnter?.account} B.worldX=${bState.worldX} A.saved.worldX=${saveA?.worldX}`,'critical','save-isolation');

  // Force B save then sign back into A and verify A is not overwritten.
  await page.locator('#worldMenuBtn').click();
  await page.waitForFunction(()=>!document.getElementById('uiShell').classList.contains('is-hidden'));
  const saveAfterBMenu=await storage(page,'paperchalk.save.v1');
  add('B save does not overwrite A shared save key',saveAfterBMenu?.account!=='audit_b',
      `shared key now belongs to ${saveAfterBMenu?.account}`,'critical','save-isolation');

  await page.locator('#authBtn').click();
  await page.waitForSelector('#pageAuth.active');
  await page.locator('#tabLogin').click();
  await page.locator('#loginUser').fill('audit_a');
  await page.locator('#loginPass').fill('test1234');
  await page.locator('#loginForm button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('uiShell').classList.contains('is-hidden'));
  const aReturn=await state(page);
  const saveOnAReturn=await storage(page,'paperchalk.save.v1');
  add('Returning A gets its own previous save',saveOnAReturn?.account==='audit_a' && Math.abs(aReturn.worldX-(saveA?.worldX||0))<4,
      `save.account=${saveOnAReturn?.account} returned.worldX=${aReturn.worldX} originalA=${saveA?.worldX}`,'critical','save-isolation');

  // Keyboard focus safety: typing in an input should not move world.
  await page.locator('#worldMenuBtn').click();
  await page.waitForFunction(()=>!document.getElementById('uiShell').classList.contains('is-hidden'));
  await page.locator('#authBtn').click();
  await page.waitForSelector('#pageAuth.active');
  const focusBefore=await state(page);
  await page.locator('#loginUser').focus();
  await page.keyboard.type('dddd');
  await page.waitForTimeout(300);
  const focusAfter=await state(page);
  add('Typing D in form does not move world',Math.abs(focusAfter.worldX-focusBefore.worldX)<0.1&&Math.abs(focusAfter.actorX-focusBefore.actorX)<0.1,
      `before=${JSON.stringify(focusBefore)} after=${JSON.stringify(focusAfter)}`,'high','input');

  // Accessibility / semantics quick checks.
  const namelessButtons=await page.locator('button').evaluateAll(btns=>btns.filter(b=>{
    const text=(b.innerText||'').trim();
    const aria=(b.getAttribute('aria-label')||'').trim();
    const imgAlt=[...b.querySelectorAll('img')].map(i=>i.alt||'').join('').trim();
    return !text&&!aria&&!imgAlt;
  }).map(b=>b.id||b.className));
  add('All buttons have an accessible name',namelessButtons.length===0,JSON.stringify(namelessButtons),'high','accessibility');

  await desktop.close();

  // ---------- MOBILE LANDSCAPE ----------
  const mobile=await browser.newContext({
    viewport:{width:844,height:390},
    isMobile:true,
    hasTouch:true,
    deviceScaleFactor:1,
    userAgent:'Mozilla/5.0 (Linux; Android 14; Audit) AppleWebKit/537.36 Chrome/144 Mobile Safari/537.36'
  });
  const mp=await mobile.newPage();
  await wire(mp,'mobile-landscape');
  await mp.goto(baseURL,{waitUntil:'networkidle'});
  await mp.waitForTimeout(300);
  await mp.evaluate(()=>{
    localStorage.setItem('paperchalk.session.v1',JSON.stringify({account:'m',displayName:'移动端'}));
    localStorage.setItem('paperchalk.save.v1',JSON.stringify({account:'m',location:'A村',worldMinutes:0,worldX:0,actorRatio:.35}));
  });
  await mp.reload({waitUntil:'networkidle'});
  await mp.locator('#continueBtn').click();
  await mp.waitForFunction(()=>document.getElementById('uiShell').classList.contains('is-hidden'));

  const joyDisplay=await mp.locator('#joystickZone').evaluate(el=>getComputedStyle(el).display);
  add('Mobile joystick zone is enabled',joyDisplay!=='none','display='+joyDisplay,'critical','mobile');

  const worldMenuRect=await visibleRect(mp,'#worldMenuBtn');
  const bagRect=await visibleRect(mp,'#backpackBtn');
  add('Mobile world menu inside viewport',inside(worldMenuRect,844,390),JSON.stringify(worldMenuRect),'high','mobile');
  add('Mobile backpack button inside viewport',inside(bagRect,844,390),JSON.stringify(bagRect),'high','mobile');

  // Simulate touch joystick drag using pointer events.
  const joyBox=await mp.locator('#joystickZone').boundingBox();
  const ms0=await state(mp);
  if(joyBox){
    const sx=joyBox.x+joyBox.width*.25, sy=joyBox.y+joyBox.height*.65;
    await mp.touchscreen.tap(sx,sy);
    // Touchscreen API cannot hold/drag reliably, dispatch pointer sequence directly.
    await mp.evaluate(({sx,sy})=>{
      const z=document.getElementById('joystickZone');
      const opts={bubbles:true,pointerId:77,pointerType:'touch',isPrimary:true};
      z.dispatchEvent(new PointerEvent('pointerdown',{...opts,clientX:sx,clientY:sy,buttons:1}));
      z.dispatchEvent(new PointerEvent('pointermove',{...opts,clientX:sx+90,clientY:sy,buttons:1}));
    },{sx,sy});
    await mp.waitForTimeout(900);
    await mp.evaluate(()=>document.getElementById('joystickZone').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:77,pointerType:'touch'})));
  }
  const ms1=await state(mp);
  add('Mobile joystick moves the player',ms1.actorX>ms0.actorX||ms1.worldX>ms0.worldX,`before=${JSON.stringify(ms0)} after=${JSON.stringify(ms1)}`,'critical','mobile');
  await shot(mp,'06-mobile-landscape-world');

  await mp.locator('#backpackBtn').click();
  await mp.waitForFunction(()=>document.getElementById('backpackOverlay').classList.contains('is-open'));
  const mbp=await visibleRect(mp,'#backpackFrame');
  add('Mobile landscape backpack fits viewport',inside(mbp,844,390,3),JSON.stringify(mbp),'high','mobile');
  await shot(mp,'07-mobile-landscape-backpack');
  await mobile.close();

  // ---------- MOBILE PORTRAIT ----------
  const portrait=await browser.newContext({
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1
  });
  const pp=await portrait.newPage();
  await wire(pp,'mobile-portrait');
  await pp.goto(baseURL,{waitUntil:'networkidle'});
  await pp.waitForTimeout(300);
  const shellRect=await visibleRect(pp,'#uiShell');
  add('Portrait menu remains inside viewport',inside(shellRect,390,844,2),JSON.stringify(shellRect),'medium','mobile-portrait');
  const orientationHint=await pp.locator('body').evaluate(()=>document.body.innerText.includes('请横屏')||document.body.innerText.includes('横屏'));
  add('Portrait mode enforces or clearly requests landscape',orientationHint,'No portrait lock/request detected in web UI','medium','mobile-portrait');
  await shot(pp,'08-mobile-portrait-menu');
  await portrait.close();

} catch(err){
  report.fatal=String(err?.stack||err);
  console.error('AUDIT_FATAL',err);
} finally {
  await browser.close();
  report.finishedAt=new Date().toISOString();
  report.summary={
    total:report.checks.length,
    passed:report.checks.filter(x=>x.pass).length,
    failed:report.checks.filter(x=>!x.pass).length,
    criticalFailed:report.checks.filter(x=>!x.pass&&x.severity==='critical').length,
    highFailed:report.checks.filter(x=>!x.pass&&x.severity==='high').length
  };
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
  console.log('AUDIT_SUMMARY '+JSON.stringify(report.summary));
  console.log('AUDIT_REPORT_START');
  console.log(JSON.stringify(report,null,2));
  console.log('AUDIT_REPORT_END');
  if(report.fatal)process.exitCode=2;
}
