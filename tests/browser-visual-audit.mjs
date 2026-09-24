import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT='visual-audit-artifacts';
fs.mkdirSync(OUT,{recursive:true});
const base='http://127.0.0.1:8080/index.html?visual-audit=1';
const result={checks:[],metrics:{},screenshots:[],consoleErrors:[],pageErrors:[]};
function add(name,pass,detail,severity='medium'){
  result.checks.push({name,pass:!!pass,detail,severity});
  console.log((pass?'PASS':'FAIL')+' | '+severity.toUpperCase()+' | '+name+' | '+detail);
}
async function shot(page,name){
  const f=path.join(OUT,name+'.png');
  await page.screenshot({path:f,fullPage:true});
  result.screenshots.push(f);
}
async function settle(page,ms=850){await page.waitForTimeout(ms)}
async function rect(page,sel){
  return page.locator(sel).evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,display:s.display,visibility:s.visibility,opacity:s.opacity,z:s.zIndex}});
}
async function imgMetrics(page,sel){
  return page.locator(sel).evaluate(el=>{const r=el.getBoundingClientRect();return{src:el.getAttribute('src'),naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,renderedWidth:r.width,renderedHeight:r.height,complete:el.complete}});
}
async function atlasMetrics(page){
  return page.evaluate(async()=>{
    const img=new Image();
    img.src='./assets/ui/paperchalk-ui-atlas-v1.webp?v=audit';
    await new Promise((res,rej)=>{img.onload=res;img.onerror=rej});
    return {naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight};
  });
}
async function wire(page,label){
  page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push({label,text:m.text()})});
  page.on('pageerror',e=>result.pageErrors.push({label,text:String(e)}));
}

const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
  // DESKTOP stable visual states
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  const p=await ctx.newPage(); await wire(p,'desktop');
  await p.goto(base,{waitUntil:'networkidle'}); await settle(p,500);
  result.metrics.atlas=await atlasMetrics(p);
  result.metrics.road=await imgMetrics(p,'#roadTile');
  result.metrics.traveler=await imgMetrics(p,'.walker');
  result.metrics.menuButtons=await p.locator('.menu-btn').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return{text:b.innerText,color:s.color,fontSize:s.fontSize,w:r.width,h:r.height}}));
  await shot(p,'01-desktop-menu-stable');

  // Ignore intentionally empty preview image when checking broken images.
  const broken=await p.locator('img[src]').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src')));
  add('Referenced images load successfully',broken.length===0,JSON.stringify(broken),'high');

  // Atlas scaling math: button source crop is roughly atlas width / 4.0315.
  const sourceButtonWidth=result.metrics.atlas.naturalWidth/4.0315;
  const renderedButtonWidth=result.metrics.menuButtons[0]?.w||0;
  result.metrics.menuButtonUpscale=renderedButtonWidth/sourceButtonWidth;
  add('Main menu button art is not materially upscaled',result.metrics.menuButtonUpscale<=1.15,
    'atlas='+JSON.stringify(result.metrics.atlas)+' estimated source button width='+sourceButtonWidth.toFixed(1)+' rendered='+renderedButtonWidth.toFixed(1)+' scale='+result.metrics.menuButtonUpscale.toFixed(2)+'x','high');

  // Seed a valid session and enter world.
  await p.evaluate(()=>{
    localStorage.setItem('paperchalk.session.v1',JSON.stringify({account:'visual',displayName:'视觉审计'}));
    localStorage.setItem('paperchalk.save.v1',JSON.stringify({account:'visual',location:'A村',worldMinutes:0,worldX:0,actorRatio:.35}));
  });
  await p.reload({waitUntil:'networkidle'}); await settle(p,250);
  await p.locator('#continueBtn').click(); await settle(p,650);
  const shellOpacity=await p.locator('#uiShell').evaluate(el=>getComputedStyle(el).opacity);
  add('World is fully revealed after menu fade',Number(shellOpacity)<0.02,'uiShell opacity='+shellOpacity,'high');
  result.metrics.desktopWorld={
    actor:await rect(p,'.actor'),roadLayer:await rect(p,'.road-layer'),roadTile:await imgMetrics(p,'#roadTile'),
    menu:await rect(p,'#worldMenuBtn'),bag:await rect(p,'#backpackBtn')
  };
  await shot(p,'02-desktop-world-stable');

  // Backpack stable.
  await p.locator('#backpackBtn').click(); await settle(p,950);
  const bp=await rect(p,'#backpackFrame');
  const ov=await rect(p,'#backpackOverlay');
  result.metrics.desktopBackpack={frame:bp,overlay:ov,art:await imgMetrics(p,'.inventory-art')};
  add('Backpack transition settles to visible state',ov.visibility==='visible'&&Number(ov.opacity)>.98,'overlay='+JSON.stringify(ov),'high');
  await shot(p,'03-desktop-backpack-stable');

  // Modal keyboard behavior.
  await p.locator('#backpackClose').focus();
  let escaped=false;
  const sequence=[];
  for(let i=0;i<28;i++){
    await p.keyboard.press('Tab');
    const active=await p.evaluate(()=>({id:document.activeElement?.id||'',cls:document.activeElement?.className||'',inside:!!document.activeElement?.closest('#backpackFrame')}));
    sequence.push(active);
    if(!active.inside){escaped=true;break}
  }
  add('Backpack dialog traps keyboard focus',!escaped,'focus sequence='+JSON.stringify(sequence.slice(-4)),'high');

  // Inventory pagination controls and persistence.
  const paging=await p.locator('#backpackFrame [id*="page"],#backpackFrame .page-prev,#backpackFrame .page-next,[aria-label*="上一页"],[aria-label*="下一页"]').count();
  add('Backpack paging controls are implemented',paging>0,'paging controls found='+paging,'medium');
  const injected=await p.evaluate(()=>{try{window.eval("inventoryItems[0]={name:'持久化测试',count:1,weight:1};inventorySelected=0;renderInventory();");return true}catch(e){return false}});
  add('Can inject item for persistence audit',injected,'runtime test setup','low');
  await p.locator('#backpackClose').click(); await settle(p,200);
  await p.locator('#worldMenuBtn').click(); await settle(p,900);
  await p.reload({waitUntil:'networkidle'}); await settle(p,250);
  await p.locator('#continueBtn').click(); await settle(p,600);
  await p.locator('#backpackBtn').click(); await settle(p,950);
  const itemPersisted=await p.evaluate(()=>{try{return window.eval('inventoryItems[0]')!=null}catch{return false}});
  add('Inventory survives reload/save cycle',itemPersisted,'slot0 after reload='+String(itemPersisted),'critical');

  // Settings stable.
  await p.locator('#backpackClose').click(); await settle(p,150);
  await p.locator('#worldMenuBtn').click(); await settle(p,900);
  await p.locator('#settingsBtn').click(); await settle(p,900);
  await shot(p,'04-desktop-settings-stable');

  // Menu title/button text geometry and overflow.
  const dOverflow=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight}));
  add('Desktop has no page overflow',dOverflow.sw<=dOverflow.cw&&dOverflow.sh<=dOverflow.ch,JSON.stringify(dOverflow),'medium');
  await ctx.close();

  // MOBILE LANDSCAPE stable
  const mc=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const m=await mc.newPage(); await wire(m,'mobile-landscape');
  await m.goto(base,{waitUntil:'networkidle'});
  await m.evaluate(()=>{
    localStorage.setItem('paperchalk.session.v1',JSON.stringify({account:'m',displayName:'M'}));
    localStorage.setItem('paperchalk.save.v1',JSON.stringify({account:'m',location:'A村',worldMinutes:0,worldX:0,actorRatio:.35}));
  });
  await m.reload({waitUntil:'networkidle'}); await m.locator('#continueBtn').click(); await settle(m,650);
  result.metrics.mobileWorld={actor:await rect(m,'.actor'),roadLayer:await rect(m,'.road-layer'),menu:await rect(m,'#worldMenuBtn'),bag:await rect(m,'#backpackBtn'),joystickZone:await rect(m,'#joystickZone')};
  await shot(m,'05-mobile-landscape-world-stable');

  await m.locator('#backpackBtn').click(); await settle(m,950);
  result.metrics.mobileBackpack={frame:await rect(m,'#backpackFrame'),overlay:await rect(m,'#backpackOverlay'),art:await imgMetrics(m,'.inventory-art')};
  await shot(m,'06-mobile-landscape-backpack-stable');
  const mobOverflow=await m.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight}));
  add('Mobile landscape has no page overflow',mobOverflow.sw<=mobOverflow.cw&&mobOverflow.sh<=mobOverflow.ch,JSON.stringify(mobOverflow),'high');
  await mc.close();

  // PORTRAIT stable menu
  const pc=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const q=await pc.newPage(); await wire(q,'mobile-portrait');
  await q.goto(base,{waitUntil:'networkidle'}); await settle(q,500);
  result.metrics.portrait={menuLayout:await rect(q,'.menu-layout'),brand:await rect(q,'.brand'),menuStack:await rect(q,'.menu-stack')};
  const pOverflow=await q.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight}));
  add('Portrait has no page overflow',pOverflow.sw<=pOverflow.cw&&pOverflow.sh<=pOverflow.ch,JSON.stringify(pOverflow),'medium');
  await shot(q,'07-mobile-portrait-menu-stable');
  await pc.close();

} catch(e){
  result.fatal=String(e?.stack||e); console.error('VISUAL_AUDIT_FATAL',e);
} finally {
  await browser.close();
  result.summary={total:result.checks.length,passed:result.checks.filter(x=>x.pass).length,failed:result.checks.filter(x=>!x.pass).length};
  fs.writeFileSync(path.join(OUT,'visual-report.json'),JSON.stringify(result,null,2));
  console.log('VISUAL_AUDIT_REPORT_START');
  console.log(JSON.stringify(result,null,2));
  console.log('VISUAL_AUDIT_REPORT_END');
  if(result.fatal)process.exitCode=2;
}
