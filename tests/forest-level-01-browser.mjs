import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='artifacts/forest-level-01';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function shot(page,name){await page.screenshot({path:out+'/'+name+'.png',fullPage:true});}
async function auditFrames(page,phase,frameCount,label){
 const dir=out+'/frames/'+label;fs.mkdirSync(dir,{recursive:true});
 const viewport=page.viewportSize();const cut=Math.round(viewport.height*.45);
 let lastHinge=null,lastHeight=null;
 for(let i=0;i<frameCount;i++){
  const t=i/(frameCount-1);
  const pose=await page.evaluate(({phase,t})=>window.__flipCaseQA.set(phase,t),{phase,t});
  await page.waitForFunction(expected=>{
   const s=window.__sceneCardHUD?.snapshot;
   return s?.casePhase===expected.phase&&Math.abs(s.lidAngle-expected.angle)<.02&&
    Math.abs(s.lidFaceSpin-expected.faceSpin)<.02;
  },pose,{timeout:15000});
  const hud=await page.evaluate(()=>window.__sceneCardHUD.snapshot);
  assert.ok(hud.lidGeometry.attachmentError<.00001,'hand cards must stay on the same lid');
  assert.ok(hud.lidGeometry.centerY>=-6&&hud.lidGeometry.centerY<5,'lid stays in game view');
  if(phase==='closing'){
   assert.ok(hud.lidGeometry.panelInnerNormalZ>.70,
    'drawn inner surface must remain facing the player, never edge-on');
   assert.equal(hud.handCardsOnReversibleFace,10);
   if(lastHeight!==null)assert.ok(hud.lidGeometry.centerY<=lastHeight+.0002,
    'hinge panel must move smoothly down toward case, not jump');
   lastHeight=hud.lidGeometry.centerY;
  }
  if(lastHinge!==null)assert.ok(Math.abs(hud.lidGeometry.hingeY-lastHinge)<.0001,
   'hinge axis must be fixed, not drift');
  lastHinge=hud.lidGeometry.hingeY;
  const path=dir+'/'+String(i).padStart(2,'0')+'.png';
  await page.screenshot({path,clip:{x:0,y:cut,width:viewport.width,height:viewport.height-cut}});
 }
 await page.evaluate(()=>window.__flipCaseQA.clear());
 console.log('LID_FRAME_BY_FRAME_AUDIT',JSON.stringify({phase,label,frameCount,viewport}));
}
async function click3D(page,id){
 const pt=await page.evaluate(id=>window.__sceneCardHUD?.pointFor(id),id);
 assert.ok(pt&&Number.isFinite(pt.x)&&Number.isFinite(pt.y),'Missing 3D target '+id);
 await page.mouse.move(pt.x,pt.y);await page.mouse.click(pt.x,pt.y);
 return pt;
}
async function ready(page){await page.waitForFunction(()=>
 window.__sceneCardHUD?.snapshot?.reversibleLid&&window.__forestHand&&window.__flipCase,{timeout:30000});}
async function openCase(page){
 await page.locator('#case-action').click();
 await page.waitForFunction(()=>window.__flipCase?.phase==='drawing',{timeout:15000});
 const hud=await page.evaluate(()=>window.__sceneCardHUD.snapshot);
 assert.equal(hud.visibleDeckPiles,7);
 assert.equal(hud.compartments,7);assert.equal(hud.physicalBoxes,1);
 assert.ok(Math.abs(hud.lidAngle-hud.lidGeometry.openAngle)<.08);
}
async function deploy(page){
 await click3D(page,'character:woodcutter');
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.placement.selected),'woodcutter');
 const slot=await page.evaluate(()=>window.__forestLevelDebug.slotPoints.find(p=>p.side==='ally'&&p.r===0&&p.c===1));
 assert.ok(slot?.point);await page.mouse.click(slot.point.x,slot.point.y);
 await page.waitForFunction(()=>window.__forestLevelDebug.state.phase==='active',{timeout:10000});
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),0);
}
async function draw(page,profession='warrior'){
 const before=await page.evaluate(()=>window.__forestHand.snapshot.count);
 await click3D(page,'deck:'+profession);
 await page.waitForFunction(n=>window.__forestHand.snapshot.count===n+1,before,{timeout:8000});
}
async function confirm(page){
 await page.locator('#case-action').click();
 await page.waitForFunction(()=>window.__flipCase.phase==='closing'&&window.__flipCase.snapshot().progress>.30,{timeout:12000});
 const mid=await page.evaluate(()=>window.__flipCase.snapshot());
 await shot(page,'04-lid-folding-and-face-reversing');
 assert.ok(mid.angle>0&&mid.angle<mid.openAngle);
 assert.ok(mid.faceSpin>0&&mid.faceSpin<Math.PI);
 await page.waitForFunction(()=>window.__flipCase.phase==='playing',{timeout:15000});
 const complete=await page.evaluate(()=>window.__sceneCardHUD.snapshot);
 assert.ok(complete.lidAngle<.03);
 assert.ok(Math.abs(complete.lidFaceSpin-Math.PI)<.03);
 assert.equal(complete.visibleDeckPiles,0);
 assert.equal(complete.handCardsOnReversibleFace,await page.evaluate(()=>window.__forestHand.snapshot.count));
}
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html?caseqa=1',{waitUntil:'networkidle',timeout:60000});
 await ready(page);
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.slots.length),18);
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.flipCase.phase),'closed');
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),0);
 await sleep(550);await shot(page,'01-closed-whitebox-desktop');
 await auditFrames(page,'opening',25,'desktop-opening');
 assert.equal(await page.evaluate(()=>window.__forestHand.draw('warrior').reason),'deploy-first');
 await openCase(page);await shot(page,'02-open-seven-slots-desktop');
 await deploy(page);await draw(page);
 await sleep(850);await shot(page,'03-drawn-into-inside-lid-desktop');
 for(let i=0;i<9;i++)await draw(page,i%2===0?'warrior':'engineer');
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),10);
 assert.equal(await page.evaluate(()=>window.__forestHand.draw('warrior').reason),'hand-full');
 await auditFrames(page,'closing',25,'desktop-closing');
 await confirm(page);await shot(page,'05-closed-face-up-ten-hand-desktop');
 const third=await page.evaluate(()=>window.__forestHand.snapshot.hand[2].instance);
 await click3D(page,'hand:'+third);
 assert.equal(await page.evaluate(()=>window.__forestHand.selected),third);
 const attacked=await page.evaluate(()=>window.__forestLevelDebug.attack('forest-foe-a'));
 assert.equal(attacked,true);
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),9);
 assert.equal(await page.evaluate(()=>window.__forestHand.draw('warrior').ok),false);
 await shot(page,'06-selected-played-on-closed-lid');
 await page.locator('#case-end-turn').click();
 await page.waitForFunction(()=>window.__flipCase.phase==='closed',{timeout:8000});
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),0);
 await shot(page,'07-next-turn-case-closed');
 const before=await page.evaluate(()=>window.__forestLevelDebug.state);
 await page.locator('#scene-switch').click();
 await page.waitForFunction(()=>window.__forestLevelDebug.environment.id==='clearing'&&
  window.__forestLevelDebug.sceneSwitch.phase==='idle',{timeout:16000});
 assert.deepEqual(await page.evaluate(()=>window.__forestLevelDebug.state),before);
 await shot(page,'08-whitebox-with-rock-clearing');
 await page.locator('#scene-switch').click();
 await page.waitForFunction(()=>window.__forestLevelDebug.environment.id==='forest'&&
  window.__forestLevelDebug.sceneSwitch.phase==='idle',{timeout:16000});
 const desktopPerf=await page.evaluate(()=>window.__forestLevelDebug.performance);
 assert.ok(desktopPerf.drawCalls<450);
 const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 phone.on('pageerror',e=>errors.push(String(e)));
 await phone.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html',{waitUntil:'networkidle',timeout:60000});
 await ready(phone);await shot(phone,'09-mobile-closed');
 await auditFrames(phone,'opening',13,'phone-opening');
 await openCase(phone);await shot(phone,'10-mobile-open-seven');
 await deploy(phone);await draw(phone);await sleep(850);
 await shot(phone,'11-mobile-card-in-lid');
 await auditFrames(phone,'closing',13,'phone-closing');
 await confirm(phone);await shot(phone,'12-mobile-face-up-play');
 const handPoint=await phone.evaluate(()=>window.__sceneCardHUD.pointFor('hand:'+window.__forestHand.snapshot.hand[0].instance));
 assert.ok(handPoint.x>0&&handPoint.x<390&&handPoint.y>0&&handPoint.y<844);
 await phone.mouse.click(handPoint.x,handPoint.y);
 assert.ok(await phone.evaluate(()=>window.__forestHand.selected));
 const mobilePerf=await phone.evaluate(()=>window.__forestLevelDebug.performance);
 assert.ok(mobilePerf.drawCalls<450);
 assert.deepEqual(errors,[]);
 console.log('REVERSIBLE_CASE_BROWSER_PASS',JSON.stringify({desktop:true,mobile:true,
  compartments:7,openAngle:2.49,closeSpin:Math.PI,cardOnSameLid:true,
  gatedDraw:true,playFromClosedLid:true,noAutoDraw:true,sceneSwitchPreserved:true,
  desktopPerf,mobilePerf,errors}));
}finally{await browser.close();}
