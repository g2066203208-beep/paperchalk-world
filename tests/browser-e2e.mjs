// Real two-client WebRTC shop interaction at mobile resolution and landscape.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {spawn} from "node:child_process";
import {createRequire} from "node:module";
import {chromium} from "playwright";
const require=createRequire(import.meta.url),{PeerServer}=require("peer");
PeerServer({port:9100,host:"127.0.0.1",path:"/"});
const server=spawn("python3",["-m","http.server","4173","--bind","127.0.0.1"],{stdio:"ignore"});
const errors=[];let browser;
async function open(ctx,w=390,h=844){
 const p=await ctx.newPage();
 await p.setViewportSize({width:w,height:h});
 p.on("pageerror",e=>errors.push(e.stack||e.message));
 await p.route("https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js",
    route=>route.fulfill({path:path.resolve("node_modules/peerjs/dist/peerjs.min.js"),contentType:"application/javascript"}));
 await p.addInitScript(()=>{window.CRYPTBOUND_PEER_OPTIONS={host:"127.0.0.1",port:9100,path:"/",secure:false};});
 for(let tries=0;tries<30;tries++)try{
   await p.goto("http://127.0.0.1:4173",{waitUntil:"domcontentloaded",timeout:3500});break;
 }catch(e){if(tries===29)throw e;await new Promise(ok=>setTimeout(ok,220));}
 await p.waitForFunction(()=>window.__KIOSK_TEST__?.getHits);
 return p;
}
async function action(page,cmd,key){
 const h=await page.evaluate(([cmd,key])=>window.__KIOSK_TEST__.getHits().find(x=>x.cmd===cmd&&(key===undefined||x.key===key)),[cmd,key]);
 assert.ok(h,"Missing clickable "+cmd+" / "+key);
 const v=await page.evaluate(()=>window.__KIOSK_TEST__.screen());
 const rect=await page.locator("#game").boundingBox();
 await page.mouse.click(rect.x+(h.x+h.w/2)/v.W*rect.width,rect.y+(h.y+h.h/2)/v.H*rect.height);
}
const snapshot=p=>p.evaluate(()=>window.__KIOSK_TEST__.getState());
try{
 // GitHub-hosted Linux runners already include Chrome; avoid flaky CDN
 // browser downloads while still running a real Chromium-family browser.
 const installedChrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(existsSync);
 browser=await chromium.launch({headless:true,...(installedChrome?{executablePath:installedChrome}:{}),args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const host=await open(context),guest=await open(context);
 await fs.mkdir("artifacts",{recursive:true});
 await host.screenshot({path:"artifacts/kiosk-animated-lobby.png",fullPage:false});
 await host.locator("#nickname").fill("店长");
 await host.locator("#host").click();
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.players?.host,{timeout:20000});
 const code=(await host.locator("#roomCode").textContent()).split("：")[1];
 assert.equal(code.length,8);
 await guest.locator("#nickname").fill("店员");
 await guest.locator("#joinCode").fill(code);
 await guest.locator("#join").click();
 await guest.waitForFunction(()=>Object.keys(window.__KIOSK_TEST__.getState()?.players||{}).length===2,{timeout:20000});
 await action(guest,"window");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.windowOpen===true,{timeout:15000});
 assert.equal((await snapshot(host)).windowOpen,true);
 await fs.mkdir("artifacts",{recursive:true});
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="idle",{timeout:5000});
 await host.screenshot({path:"artifacts/kiosk-first-customer.png",fullPage:false});
 await action(guest,"talk");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.spoken===true,{timeout:12000});
 await host.screenshot({path:"artifacts/kiosk-customer-talking.png",fullPage:false});
 await action(guest,"slot","shelfL1");
 const guestId=await guest.evaluate(()=>window.__KIOSK_TEST__.getSelfId());
 await host.waitForFunction(id=>window.__KIOSK_TEST__.getState()?.players?.[id]?.hand==="tea",guestId,{timeout:12000});
 await action(host,"slot","shelfL2");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.players?.host?.hand==="bread",{timeout:12000});
 await action(guest,"counter");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.counter==="tea",{timeout:12000});
 await action(host,"sell");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.totalServed===1,{timeout:15000});
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="handoff",{timeout:5000});
 await host.waitForTimeout(210);
 const transfer=await host.evaluate(()=>window.__KIOSK_TEST__.getCustomerMotion());
 assert.equal(transfer.stage,"handoff");
 assert.equal(transfer.handoff.sku,"tea");
 assert.ok(transfer.handoff.progress>0&&transfer.handoff.progress<1);
 assert.equal(transfer.offset,0,"customer waits at window until item arrives");
 assert.equal((await snapshot(host)).counter,null,"sold item must leave authoritative counter immediately");
 await host.screenshot({path:"artifacts/kiosk-item-handoff.png",fullPage:false});
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="exit",{timeout:5000});
 await host.waitForTimeout(240); // Capture the actual departing customer with item.
 const departing=await host.evaluate(()=>window.__KIOSK_TEST__.getCustomerMotion());
 assert.equal(departing.stage,"exit");
 assert.equal(departing.handoff.progress,1);
 await host.screenshot({path:"artifacts/kiosk-customer-departing.png",fullPage:false});
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="enter",{timeout:5000});
 await host.waitForTimeout(390);
 const entering=await host.evaluate(()=>window.__KIOSK_TEST__.getCustomerMotion());
 assert.equal(entering.stage,"enter");
 assert.equal(entering.handoff,null,"new customer must not receive old purchase");
 await host.screenshot({path:"artifacts/kiosk-next-customer-arriving.png",fullPage:false});
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="idle",{timeout:5000});
 assert.equal((await snapshot(guest)).cash,109);
 assert.equal((await snapshot(guest)).reputation,0,"day one has no early loyalty tip");
 assert.equal((await snapshot(guest)).players.host.hand,"bread");
 await action(host,"slot","shelfL2");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.players?.host?.hand===null,{timeout:12000});
 await action(host,"restock","tea");
 assert.equal((await guest.evaluate(()=>window.__KIOSK_TEST__.getHits())).some(h=>h.cmd==="restock"),false);
 await action(guest,"slot","shelfL3");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.notice.includes("这里还空着"),{timeout:12000});
 assert.equal((await snapshot(host)).cash,109);
 await action(host,"slot","shelfL3");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.slots?.shelfL3?.qty===1,{timeout:12000});
 assert.equal((await snapshot(guest)).cash,105);
 // Real door/open state and stock list should be shared rather than fake icons.
 await action(host,"toggle","drawerL");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.open?.drawerL===true,{timeout:12000});
 assert.equal((await snapshot(guest)).slots.drawerL.sku,"cocoa");
 await fs.mkdir("artifacts",{recursive:true});
 await host.screenshot({path:"artifacts/kiosk-mobile-host.png",fullPage:false});
 await guest.screenshot({path:"artifacts/kiosk-mobile-guest.png",fullPage:false});
 // A second visitor can commission an optional item without advancing their
 // main order. Both actual WebRTC clients must see one authoritative tip.
 await action(guest,"talk");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.spoken===true,{timeout:12000});
 await action(host,"slot","shelfL3");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.players?.host?.hand==="tea",{timeout:12000});
 await action(host,"counter");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.counter==="tea",{timeout:12000});
 // Wrong item for the bread order: both WebRTC clients must observe a single
 // mistake without removing the tea from the shared counter.
 await action(guest,"sell");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.mistakes===1,{timeout:12000});
 assert.equal((await snapshot(host)).counter,"tea");
 assert.equal((await snapshot(host)).cash,105);
 const revisionBeforeRepeat=(await snapshot(host)).revision;
 await action(host,"sell");
 await guest.waitForFunction(rev=>window.__KIOSK_TEST__.getState()?.revision>rev,revisionBeforeRepeat,{timeout:12000});
 assert.equal((await snapshot(host)).mistakes,1,"repeated wrong clicks cannot stack penalties");
 assert.equal((await snapshot(guest)).mistakes,1,"host and guest share one penalty");
 await host.screenshot({path:"artifacts/kiosk-wrong-item-feedback.png",fullPage:false});
 await action(guest,"commission");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.favorDone===true,{timeout:12000});
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="favor",{timeout:4000});
 await host.waitForTimeout(180);
 const favorMotion=await host.evaluate(()=>window.__KIOSK_TEST__.getCustomerMotion());
 assert.equal(favorMotion.stage,"favor");
 assert.equal(favorMotion.handoff.sku,"tea","commission transfers its own item, not the bread order");
 assert.ok(favorMotion.handoff.progress>0&&favorMotion.handoff.progress<1);
 assert.equal(favorMotion.offset,0,"commission customer stays at the service window");
 await host.screenshot({path:"artifacts/kiosk-commission-handoff.png",fullPage:false});
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="idle",{timeout:4000});
 assert.equal((await snapshot(host)).orderIndex,1,"commission must not skip the paying customer");
 assert.equal((await snapshot(host)).cash,113,"commission pays exactly one 8-yuan tip");
 assert.equal((await snapshot(guest)).counter,null,"commission consumes one real tea item");
 assert.equal((await snapshot(guest)).orderIndex,1,"optional favor must not skip bread order");
 await action(host,"commission");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.notice.includes("已经完成"),{timeout:12000});
 assert.equal((await snapshot(guest)).cash,113,"two workers cannot claim the same favor twice");
 assert.equal((await snapshot(host)).favorCount,1);
 await host.screenshot({path:"artifacts/kiosk-commission-complete.png",fullPage:false});
 // A manager spends shared funds on a permanent capacity upgrade. The clerk
 // sees the new shelf limit but cannot trigger the purchase.
 assert.equal((await guest.evaluate(()=>window.__KIOSK_TEST__.getHits())).some(h=>h.cmd==="upgrade"),false);
 await action(host,"upgrade");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.upgrades?.shelves===1,{timeout:12000});
 assert.equal((await snapshot(guest)).cash,78);
 await host.screenshot({path:"artifacts/kiosk-shelf-upgraded.png",fullPage:false});
 assert.equal((await guest.evaluate(()=>window.__KIOSK_TEST__.getHits())).some(h=>h.cmd==="heat"),false);
 await action(host,"heat");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.upgrades?.heating===1,{timeout:12000});
 assert.equal((await snapshot(guest)).cash,42);
 await host.screenshot({path:"artifacts/kiosk-heating-upgraded.png",fullPage:false});
 const mobileOverflow=await host.evaluate(()=>document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2);
 assert.equal(mobileOverflow,false,"mobile must be one fixed no-scroll screen");
 // Local solo save survives refresh; source account is separate from legacy save.
 const solo=await open(context);
 await solo.locator("#solo").click();
 await solo.waitForFunction(()=>Boolean(window.__KIOSK_TEST__?.getState()&&window.__KIOSK_TEST__?.getHits().some(h=>h.cmd==="window")));
 await action(solo,"window");
 await solo.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==='idle',{timeout:5000});
 await action(solo,"slot","shelfL1");
 assert.equal((await snapshot(solo)).players.solo.hand,"tea");
 await solo.waitForFunction(()=>window.__KIOSK_TEST__.getHeldItemMotion()?.stage==='pickup',{timeout:3000});
 await solo.waitForTimeout(150); // Show the actual hand in motion, not the first empty frame.
 assert.equal((await solo.evaluate(()=>window.__KIOSK_TEST__.getHeldItemMotion())).stage,'pickup');
 await solo.screenshot({path:"artifacts/kiosk-item-picked-up.png",fullPage:false});
 await solo.waitForFunction(()=>window.__KIOSK_TEST__.getHeldItemMotion()?.stage==='held',{timeout:3000});
 await solo.screenshot({path:"artifacts/kiosk-item-held.png",fullPage:false});
 await action(solo,"counter");
 await solo.waitForFunction(()=>window.__KIOSK_TEST__.getHeldItemMotion()?.stage==='place',{timeout:3000});
 await solo.waitForTimeout(100);
 const placing=await solo.evaluate(()=>window.__KIOSK_TEST__.getHeldItemMotion());
 assert.equal(placing.sku,"tea");
 assert.equal(placing.hideCounter,true,"counter must not duplicate an item still moving to the mat");
 assert.equal((await snapshot(solo)).counter,"tea");
 await solo.screenshot({path:"artifacts/kiosk-item-placing.png",fullPage:false});
 await solo.waitForFunction(()=>window.__KIOSK_TEST__.getHeldItemMotion()?.stage==='empty',{timeout:3000});
 await action(solo,"counter");
 await solo.waitForFunction(()=>window.__KIOSK_TEST__.getHeldItemMotion()?.stage==='take',{timeout:3000});
 assert.equal((await snapshot(solo)).players.solo.hand,"tea");
 await action(solo,"upgrade");
 assert.equal((await snapshot(solo)).upgrades.shelves,1);
 await action(solo,"heat");
 assert.equal((await snapshot(solo)).upgrades.heating,1);
 await solo.reload();
 await solo.waitForFunction(()=>window.__KIOSK_TEST__?.getState!==undefined);
 await solo.locator("#resume").click();
 assert.equal((await snapshot(solo)).windowOpen,true);
 assert.equal((await snapshot(solo)).players.solo.hand,"tea");
 assert.equal((await snapshot(solo)).upgrades.shelves,1,"upgrade survives original v3 localStorage key");
 assert.equal((await snapshot(solo)).upgrades.heating,1,"insulation survives original v3 localStorage key");
 await solo.screenshot({path:"artifacts/kiosk-mobile-solo.png",fullPage:false});
 // Landscape and desktop use an expanded camera, not a scaled portrait screenshot.
 const wide=await open(context,1280,720);
 await wide.locator("#solo").click();
 await wide.waitForFunction(()=>Boolean(window.__KIOSK_TEST__?.getState()&&window.__KIOSK_TEST__?.getHits().length));
 assert.equal((await wide.evaluate(()=>window.__KIOSK_TEST__.screen())).land,true);
 assert.ok((await wide.evaluate(()=>window.__KIOSK_TEST__.getHits())).some(h=>h.cmd==="slot"));
 await action(wide,"window");
 await wide.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="idle",{timeout:5000});
 assert.equal(await wide.evaluate(()=>document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2),false,"landscape must remain fixed-screen");
 await wide.screenshot({path:"artifacts/kiosk-landscape-desktop.png",fullPage:false});
 // Verify real Chromium at a compact portrait phone AND rotated phone shape.
 for(const [vw,vh,name] of [[320,568,"compact-phone"],[844,390,"phone-landscape"]]){
   const p=await open(context,vw,vh);
   await p.locator("#solo").click();
   await p.waitForFunction(()=>window.__KIOSK_TEST__.getHits().some(h=>h.cmd==="talk"));
   const metrics=await p.evaluate(()=>{
     const h=window.__KIOSK_TEST__.getHits().find(v=>v.cmd==="talk");
     const size=window.__KIOSK_TEST__.screen();
     return {touchHeight:h.h/size.H*innerHeight,land:size.land,
       overflow:document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2};
   });
   assert.equal(metrics.overflow,false,"No scrolling on "+name);
   assert.ok(metrics.touchHeight>=42,"Main touch target too small on "+name+": "+metrics.touchHeight);
   assert.equal(metrics.land,vw>vh,"Correct adaptive orientation on "+name);
   await action(p,"window");
   await p.screenshot({path:"artifacts/kiosk-"+name+".png",fullPage:false});
   await p.close();
 }
 // Verify compact portrait and wide mobile landscape, not just desktop screenshots.
 // The art is rendered from separate 80x120 and 24x28 pixel sprites.
 const pixelGrid=await host.evaluate(async()=> (await import("./src/kiosk-pixel.js")).PIXEL_GRID);
 assert.deepEqual(JSON.parse(JSON.stringify(pixelGrid.customer)),[80,120]);
 assert.deepEqual(JSON.parse(JSON.stringify(pixelGrid.item)),[24,28]);
 for(const [vw,vh,label] of [[320,568,"compact-portrait"],[844,390,"phone-landscape"]]){
   const phone=await open(context,vw,vh);
   await phone.locator("#solo").click();
   await phone.waitForFunction(()=>Boolean(window.__KIOSK_TEST__?.getState()?.players?.solo));
   await action(phone,"window");
   await phone.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="idle",{timeout:6000});
   const measurements=await phone.evaluate(()=>{
     const {W,H,land}=window.__KIOSK_TEST__.screen();
     const box=document.querySelector("#game").getBoundingClientRect();
     const h=window.__KIOSK_TEST__.getHits().filter(x=>["talk","sell","commission","restock"].includes(x.cmd));
     return {W,H,land,screenWidth:innerWidth,screenHeight:innerHeight,
       hitSizes:h.map(x=>({cmd:x.cmd,width:x.w*box.width/W,height:x.h*box.height/H})),
       overflow:document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2};
   });
   assert.equal(measurements.land,vw>vh,"orientation must match physical viewport");
   assert.ok(Math.abs(measurements.W/measurements.H-vw/vh)<.005,
     label+" aspect ratio distorted: "+JSON.stringify(measurements));
   assert.equal(measurements.overflow,false,label+" must not scroll");
   assert.ok(measurements.hitSizes.length>=3,label+" must expose controls");
   for(const hit of measurements.hitSizes){
     assert.ok(hit.width>=44&&hit.height>=44,
       label+" touch target below 44 CSS px: "+JSON.stringify(hit));
   }
   await phone.screenshot({path:"artifacts/kiosk-"+label+"-pixel.png",fullPage:false});
   await phone.close();
 }
 // Five real solo sales verify end-of-day rating and persistent reputation.
 const growth=await open(context);
 await growth.locator("#solo").click();
 await action(growth,"window");
 await action(growth,"toggle","drawerL");
 for(const key of ["shelfL1","shelfL2","shelfR1","drawerL","shelfL1"]){
  await action(growth,"slot",key);
  await action(growth,"counter");
  await action(growth,"sell");
 }
 const settled=await snapshot(growth);
 assert.equal(settled.phase,"summary");
 assert.equal(settled.dayRating,4);
 assert.equal(settled.dayReputationDelta,4);
 assert.equal(settled.reputation,4);
 assert.equal(settled.dayNet,46);
 await growth.screenshot({path:"artifacts/kiosk-day-reputation-summary.png",fullPage:false});
 assert.equal(await growth.evaluate(()=>document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2),false);
 await action(growth,"nextday");
 assert.equal((await snapshot(growth)).reputation,4);
 assert.equal((await snapshot(growth)).dayRating,0);
 await growth.reload();
 await growth.locator("#resume").click();
 assert.equal((await snapshot(growth)).reputation,4,"reputation persists under original save key");
 await growth.screenshot({path:"artifacts/kiosk-day-two-reputation.png",fullPage:false});
 assert.deepEqual(errors,[]);
 console.log("PASS: two actual mobile clients transferred stock, opened drawer, sold a customer, local restore, no scroll, landscape layout.");
}catch(e){console.error(e);process.exitCode=1;}
finally{await browser?.close();server.kill();process.exit();}
