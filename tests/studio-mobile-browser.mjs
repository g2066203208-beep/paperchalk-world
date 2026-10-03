import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
// Optional browser integration test; use a local Playwright install or module URL.
const playwrightModule=process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/REME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs';
const {chromium,devices}=await import(playwrightModule);
const base=process.env.STUDIO_URL||'http://127.0.0.1:4173/studio/';
const out=process.env.MOBILE_ARTIFACTS||'artifacts/studio-mobile';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,
  args:['--no-sandbox','--disable-gpu-sandbox','--hide-scrollbars']});
const errors=[],checks=[];
const scenarios=[
  {name:'android-landscape',width:844,height:390,insets:[0,47,21,47],native:true},
  {name:'android-small-landscape',width:640,height:360,insets:[0,24,24,24],native:true},
  {name:'browser-portrait',width:390,height:844,insets:[47,0,34,0]},
  {name:'browser-small-portrait',width:360,height:640,insets:[24,0,24,0]},
];
async function load(config,x=36,search=''){
  const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:config.width,height:config.height},deviceScaleFactor:2,
    ...(config.native?{userAgent:devices['Pixel 7'].userAgent+' PaperchalkShell/5 PaperchalkApp/1.1.1'}:{})});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',e=>errors.push(config.name+': '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(config.name+': '+m.text());});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
  await page.route('**/studio/rendering/index.js',route=>route.fulfill({contentType:'text/javascript',body:`import {createPaperScene as create} from './createPaperScene.js';export function createPaperScene(options){const scene=create(options);window.__cityQA=scene;return scene;}`}));
  await page.addInitScript(x=>localStorage.setItem('paperworld.city-prologue.save.v1',JSON.stringify({version:1,player:{x,y:.5,facing:1}})),x);
  await page.goto(base+search,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__cityQA?.getStats().ready&&document.querySelector('#loadingStatus').hidden,null,{timeout:45000});
  await setInsets(page,config.insets);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('game-mode')&&matchMedia('(any-pointer: coarse)').matches),true);
  return {page,context};
}
async function setInsets(page,insets){await page.evaluate(values=>{
  ['top','right','bottom','left'].forEach((side,i)=>document.documentElement.style.setProperty('--paperchalk-safe-'+side,values[i]+'px'));
  window.dispatchEvent(new Event('paperchalk:insets'));
},insets);}
async function safe(page,selector,insets){
  const b=await page.locator(selector).boundingBox();assert.ok(b,selector+' visible');
  const [top,right,bottom,left]=insets,v=page.viewportSize();
  assert.ok(b.x>=left-.5&&b.y>=top-.5&&b.x+b.width<=v.width-right+.5&&b.y+b.height<=v.height-bottom+.5,
    selector+' outside safe area '+JSON.stringify({b,insets,v}));
}
async function targets(page,selector){
  const small=await page.locator(selector).evaluateAll(es=>es.filter(e=>!e.hidden&&getComputedStyle(e).visibility!=='hidden').map(e=>({label:e.textContent.trim(),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(b=>b.w>0&&(b.w<43.5||b.h<43.5)));
  assert.deepEqual(small,[],'touch target smaller than 44px');
}
async function shot(page,name){await page.screenshot({path:path.join(out,name+'.png'),scale:'css'});}
async function tick(page,n=3){await page.evaluate(n=>new Promise(resolve=>{function frame(){if(--n<=0)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}),n);}
try{
  for(const config of scenarios){
    const {page,context}=await load(config);
    for(const selector of ['#openGameMenu','.city-map-button','#moveLeft','#moveRight','#inspectAction'])await safe(page,selector,config.insets);
    await targets(page,'#openGameMenu,.city-map-button,#moveLeft,#moveRight,#inspectAction');
    await shot(page,config.name+'-street');
    await page.locator('#openGameMenu').tap();
    assert.equal(await page.locator('#gameMenu').isVisible(),true);
    assert.equal(await page.locator('.city-map-button').isVisible(),false);
    await page.locator('#gameSettings').tap();await safe(page,'#inspector',config.insets);
    await page.locator('#closeInspector').tap();await page.locator('#resumeGame').tap();
    await page.locator('.city-map-button').tap();
    await safe(page,'.city-explorer-card',config.insets);
    await targets(page,'.city-explorer-overlay button');
    assert.equal(await page.locator('.city-district-card').count(),12);
    assert.ok(!/A D|方向键|E 与|M 地图/.test(await page.locator('.city-explorer-card footer').innerText()));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await shot(page,config.name+'-map');
    await page.locator('.city-district-card').filter({hasText:'星灯住宅区'}).getByRole('button',{name:'街区导航'}).tap();
    await safe(page,'.city-navigation',config.insets);await targets(page,'.city-navigation button');
    await page.getByRole('button',{name:'取消步行导航'}).tap();
    await page.locator('#inspectAction').tap();
    await page.waitForFunction(()=>__cityQA.getStats().transit.rideKind==='bus');
    assert.equal(await page.locator('.city-explorer-overlay').isVisible(),false);
    assert.equal(await page.locator('#scenePrompt').isVisible(),true);
    await safe(page,'.city-ride-panel',config.insets);await targets(page,'.city-ride-heading button');
    await page.locator('#openGameMenu').tap();
    assert.equal(await page.locator('.city-ride-panel').isVisible(),false);
    const paused=await page.evaluate(()=>__cityQA.getStats().player.x);await tick(page);
    assert.equal(await page.evaluate(()=>__cityQA.getStats().player.x),paused);
    await page.locator('#resumeGame').tap();
    await shot(page,config.name+'-bus');
    await page.getByRole('button',{name:'返回出发站',exact:true}).tap();
    await page.waitForFunction(()=>!__cityQA.getStats().transition.active);
    assert.equal(await page.evaluate(()=>__cityQA.getStats().player.x),36);
    // Native background/resume bridge must freeze movement and preserve content.
    await page.evaluate(()=>dispatchEvent(new Event('paperchalk:pause')));await tick(page);
    assert.equal(await page.evaluate(()=>__cityQA.getStats().player.x),36);
    await page.evaluate(()=>dispatchEvent(new Event('paperchalk:resume')));
    // Trusted touch input tests pointer capture and release, without a keyboard.
    const moveRight=page.locator('#moveRight');
    await moveRight.dispatchEvent('pointerdown',{pointerId:71,pointerType:'touch',button:0});
    await page.waitForFunction(()=>__cityQA.getStats().player.x>36.3);
    await moveRight.dispatchEvent('pointerup',{pointerId:71,pointerType:'touch',button:0});
    const stopped=await page.evaluate(()=>__cityQA.getStats().player.x);
    await page.waitForTimeout(260);
    const settled=await page.evaluate(()=>__cityQA.getStats().player.x);
    assert.ok(Math.abs(settled-stopped)<.5,'touch release should stop movement promptly');
    await page.locator('.city-map-button').tap();assert.equal(await page.evaluate(()=>PaperchalkHandleBack()),true);
    assert.equal(await page.locator('.city-explorer-overlay').isVisible(),false);
    checks.push(config.name+': automatic game presentation, safe areas, 44px controls, scroll, navigation, bus, pause/settings, native back/resume, real touch movement');
    if(!config.native&&config.width===390){
      await page.locator('.city-map-button').tap();await page.setViewportSize({width:844,height:390});
      await setInsets(page,[0,47,21,47]);await safe(page,'.city-explorer-card',[0,47,21,47]);
      await page.locator('.city-explorer-close').tap();await page.locator('#openGameMenu').tap();await page.locator('#resumeGame').tap();
      checks.push('rotation with the map open preserves safe layout and restores working controls');
    }
    await context.close();
  }
  const config=scenarios[0],{page,context}=await load(config,531);
  await page.locator('#inspectAction').tap();
  await page.waitForFunction(()=>__cityQA.getStats().transit.underground&&__cityQA.getStats().transit.rideProgress>.25);
  await shot(page,'android-landscape-metro');
  await page.waitForFunction(()=>__cityQA.getStats().transit.rideKind===null,null,{timeout:45000});
  assert.equal(await page.evaluate(()=>__cityQA.getStats().player.x),891);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('paperworld.city-prologue.save.v1')).player.x),891);
  checks.push('touch metro boarding, underground journey, destination arrival and save');
  await context.close();
  const interior=await load(config,-42);
  await interior.page.locator('#inspectAction').tap();
  await interior.page.waitForFunction(()=>__cityQA.getStats().interiors.active&&!__cityQA.getStats().transition.active);
  assert.equal(await interior.page.locator('#inspectionOverlay').isVisible(),false);
  assert.equal(await interior.page.locator('#scenePrompt').isVisible(),false);
  await shot(interior.page,'android-landscape-interior');
  assert.equal(await interior.page.evaluate(()=>PaperchalkHandleBack()),true);
  await interior.page.waitForFunction(()=>!__cityQA.getStats().interiors.active&&!__cityQA.getStats().transition.active);
  checks.push('touch house doorway enters a real paper interior immediately and Esc returns without a handoff');
  await interior.context.close();
  const forest=await load(config,0,'?scene=forest');
  assert.equal(await forest.page.locator('.city-explorer').count(),0);
  await forest.page.locator('#openGameMenu').tap();await forest.page.locator('#resumeGame').tap();
  checks.push('forest mobile presentation and pause remain functional');await forest.context.close();
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));
  console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
