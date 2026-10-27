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
async function aim(page,cmd,key){
 if(['catalogPage','closeCatalog','nextday'].includes(cmd))return;
 if(cmd==='restock'&&(await page.evaluate(()=>window.__KIOSK_TEST__.getHits().some(h=>h.cmd==='closeCatalog'))))return;
 let shot=['slot','toggle','recycleStore','recycleShip'].includes(cmd)?(key||'drawerR'):cmd==='recycleReceive'?'recycle':cmd==='sell'?'register':cmd==='catalog'?'book':cmd==='counter'?'counter':'customer';
 if(cmd==='look')shot=key;
 if(cmd==='restock')shot=await page.evaluate(sku=>Object.entries(window.__KIOSK_TEST__.getState().slots).find(([,v])=>(v.sku||v.lastSku)===sku)?.[0]||'front',key);
 const select=page.locator('#viewSelect');
 await page.waitForFunction(()=>document.getElementById('lobby').hidden&&!document.getElementById('game').inert);
 if(await select.isVisible()){
  if(await select.inputValue()!==shot)await select.selectOption(shot);
  // Wait for the short local camera movement to settle before a stationary tap.
  let last=null;
  for(let i=0;i<24;i++){
   const c=await page.evaluate(()=>window.__KIOSK_TEST__.getCamera());
   if(last&&Math.abs(c.x-last.x)+Math.abs(c.y-last.y)+Math.abs(c.z-last.z)*100<.2)break;
   last=c;await page.waitForTimeout(25);
  }
 }
}
async function action(page,cmd,key,gesture=null){
 await aim(page,cmd,key);
 await page.waitForFunction(()=>document.getElementById("lobby").hidden&&!document.getElementById("game").inert);
 // Network state can arrive between animation frames; wait for its real-world hitbox.
 await page.waitForFunction(([cmd,key,gesture])=>window.__KIOSK_TEST__?.getHits().some(h=>
   h.cmd===cmd&&(key===null||h.key===key)&&(!gesture||h.gesture===gesture)),[cmd,key??null,gesture],{timeout:6000});
 const h=await page.evaluate(([cmd,key,gesture])=>window.__KIOSK_TEST__.getHits().find(x=>
   x.cmd===cmd&&(key===null||x.key===key)&&(!gesture||x.gesture===gesture)),[cmd,key??null,gesture]);
 assert.ok(h,"Missing clickable "+cmd+" / "+key);
 const v=await page.evaluate(()=>window.__KIOSK_TEST__.screen());
 const rect=await page.locator("#game").boundingBox();
 const px=rect.x+(h.x+h.w/2)/v.W*rect.width,py=rect.y+(h.y+h.h/2)/v.H*rect.height;
 if(h.gesture==="hold"){
   await page.mouse.move(px,py);
   await page.mouse.down();
   await page.waitForTimeout(560);
   await page.mouse.up();
 }else await page.mouse.click(px,py);
}
async function freshSolo(page){
 // The main CTA correctly resumes an existing save. A fresh test world must
 // follow the explicit new-shop flow rather than accidentally resuming it.
 const saved=await page.evaluate(()=>Boolean(localStorage.getItem("untitled-kiosk-save-v1")));
 if(saved){
  await page.locator("#settings").click();
  await page.locator("#newGame").click();
  await page.locator("#confirmNew").click();
 }else await page.locator("#primaryStart").click();
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
 await host.locator("#multiplayer").click();
 await host.locator("#nickname").fill("店长");
 await host.locator("#host").click();
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.players?.host,{timeout:20000});
 const code=(await host.locator("#roomCode").textContent()).split("：")[1];
 assert.equal(code.length,8);
 await host.locator("#menu").click();
 assert.match(await host.locator("#roomDetails").textContent(),new RegExp(code),"room code must remain discoverable inside menu");
 await host.locator("#closeLobby").click();
 await guest.locator("#multiplayer").click();
 await guest.locator("#nickname").fill("店员");
 await guest.locator("#joinCode").fill(code);
 await guest.locator("#join").click();
 try{
   await guest.waitForFunction(()=>Object.keys(window.__KIOSK_TEST__.getState()?.players||{}).length===2,undefined,{timeout:40000});
 }catch(e){
   console.error("WebRTC join diagnostic",JSON.stringify({
     room:code,
     hostStatus:await host.locator("#status").textContent(),
     guestStatus:await guest.locator("#status").textContent(),
     hostPlayers:Object.keys((await snapshot(host))?.players||{}),
     guestPlayers:Object.keys((await snapshot(guest))?.players||{}),
     pageErrors:errors
   }));
   await guest.screenshot({path:"artifacts/kiosk-join-failed.png",fullPage:false});
   throw e;
 }
 await action(guest,"window");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.windowOpen===true,{timeout:15000});
 assert.equal((await snapshot(host)).windowOpen,true);
 await fs.mkdir("artifacts",{recursive:true});
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="idle",{timeout:5000});
 const immersive=await host.evaluate(()=>{
   const hs=window.__KIOSK_TEST__.getHits();
   const size=window.__KIOSK_TEST__.screen();
   return {hits:hs.map(h=>({cmd:h.cmd,gesture:h.gesture,x:h.x,y:h.y,w:h.w,h:h.h})),size};
 });
 assert.ok(immersive.hits.some(h=>h.cmd==="talk"&&h.gesture==="tap"),"NPC itself is a physical talk target");
 assert.ok(immersive.hits.some(h=>h.cmd==="restock"&&h.gesture==="hold"),"stock is ordered from physical shelf hold");
 assert.ok(immersive.hits.filter(h=>h.cmd==="restock").every(h=>h.gesture==="hold"),"no floating reorder buttons");
 assert.ok(immersive.hits.filter(h=>["sell","talk","commission"].includes(h.cmd))
   .every(h=>h.y<immersive.size.H*.82),"service commands cannot sit in a bottom toolbar");

 await host.waitForFunction(()=>document.querySelector("#game")&&document.readyState==="complete");
 await host.waitForFunction(()=> {
   const art=window.__KIOSK_TEST__.getArtStatus();return art.total>=50&&art.ready===art.total&&art.failed.length===0;
 },undefined,{timeout:15000});
 await host.screenshot({path:"artifacts/kiosk-independent-sprites-customer.png",fullPage:false});
 await host.screenshot({path:"artifacts/kiosk-first-customer-gptimg.png",fullPage:false});
 await host.screenshot({path:"artifacts/kiosk-first-customer.png",fullPage:false});
 await action(guest,"talk");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.spoken===true,{timeout:12000});
 await host.screenshot({path:"artifacts/kiosk-customer-talking.png",fullPage:false});
 assert.equal(await host.evaluate(()=>window.__KIOSK_TEST__.getCustomerMotion()?.speechVisible),true,
   "conversation must appear beside the actual customer");
 await host.waitForTimeout(4450);
 assert.equal(await host.evaluate(()=>window.__KIOSK_TEST__.getCustomerMotion()?.speechVisible),false,
   "NPC speech must disappear instead of occupying a permanent panel");
 await host.screenshot({path:"artifacts/kiosk-customer-silent.png",fullPage:false});
 await action(guest,"slot","shelfL1");
 const guestId=await guest.evaluate(()=>window.__KIOSK_TEST__.getSelfId());
 await host.waitForFunction(id=>window.__KIOSK_TEST__.getState()?.players?.[id]?.hand==="tea",guestId,{timeout:12000});
 await action(host,"slot","shelfL2");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.players?.host?.hand==="bread",{timeout:12000});
 await action(guest,"counter");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.counter==="tea",{timeout:12000});
 await aim(host,"look","front");
 const checkoutHits=await host.evaluate(()=>window.__KIOSK_TEST__.getHits());
 assert.ok(checkoutHits.some(h=>h.cmd==="sell"&&h.gesture==="tap"),"placed item must offer physical checkout");
 assert.ok(checkoutHits.some(h=>h.cmd==="counter"&&h.gesture==="hold"),"placed item must remain retrievable by holding it");
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
 await host.waitForFunction(()=>{
   const m=window.__KIOSK_TEST__.getCustomerMotion();
   return m?.stage==="handoff"&&m.payment?.amount===9&&m.payment.progress>.1&&m.payment.progress<1;
 },undefined,{timeout:3000});
 await host.screenshot({path:"artifacts/kiosk-cash-payment.png",fullPage:false});
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
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.refusing===true);
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.refusing===true);
 assert.equal((await host.evaluate(()=>window.__KIOSK_TEST__.getCustomerMotion())).receiving,false);
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
 await host.waitForFunction(()=>{
   const m=window.__KIOSK_TEST__.getCustomerMotion();
   return m?.stage==="favor"&&m.payment?.amount===8&&m.payment.progress>.1&&m.payment.progress<1;
 },undefined,{timeout:3000});
 await host.screenshot({path:"artifacts/kiosk-commission-cash.png",fullPage:false});
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
 await action(host,"catalog");
 await action(host,"catalogPage","improve");
 await action(host,"upgrade");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.upgrades?.shelves===1,{timeout:12000});
 assert.equal((await snapshot(guest)).cash,78);
 await host.screenshot({path:"artifacts/kiosk-shelf-upgraded.png",fullPage:false});
 assert.equal((await guest.evaluate(()=>window.__KIOSK_TEST__.getHits())).some(h=>h.cmd==="heat"),false);
 await action(host,"catalog");
 await action(host,"catalogPage","improve");
 await action(host,"heat");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.upgrades?.heating===1,{timeout:12000});
 assert.equal((await snapshot(guest)).cash,42);
 await host.screenshot({path:"artifacts/kiosk-heating-upgraded.png",fullPage:false});
 // Second distinct business: customer hands over a used battery, a clerk
 // physically stores it in the right drawer; the room host owns all costs.
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="idle",{timeout:7000});
 await aim(host,"recycleReceive");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getHits().some(h=>h.cmd==="recycleReceive"),undefined,{timeout:6000});
 await host.screenshot({path:"artifacts/kiosk-recycling-customer-offer.png",fullPage:false});
 await action(guest,"recycleReceive");
 await host.waitForFunction(()=>Boolean(window.__KIOSK_TEST__.getState()?.businesses?.recycling?.carriedBy),undefined,{timeout:12000});
 assert.equal((await snapshot(host)).cash,41,"service intake incurs one unit handling cost");
 await guest.screenshot({path:"artifacts/kiosk-recycling-battery-held.png",fullPage:false});
 await action(guest,"toggle","drawerR");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.open?.drawerR===true,{timeout:12000});
 await action(guest,"recycleStore");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.businesses?.recycling?.stored===1,{timeout:12000});
 assert.equal((await snapshot(guest)).businesses.recycling.carriedBy,null);
 assert.equal((await snapshot(guest)).cash,41,"storage cannot charge twice");
 await host.screenshot({path:"artifacts/kiosk-recycling-stored-multiplayer.png",fullPage:false});

 const mobileOverflow=await host.evaluate(()=>document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2);
 assert.equal(mobileOverflow,false,"mobile must be one fixed no-scroll screen");
 // Local solo save survives refresh; source account is separate from legacy save.
 const solo=await open(context);
 await freshSolo(solo);
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
 await action(solo,"counter",undefined,"hold");
 await solo.waitForFunction(()=>window.__KIOSK_TEST__.getHeldItemMotion()?.stage==='take',{timeout:3000});
 assert.equal((await snapshot(solo)).players.solo.hand,"tea");
 await action(solo,"catalog");
 await action(solo,"catalogPage","improve");
 await action(solo,"upgrade");
 assert.equal((await snapshot(solo)).upgrades.shelves,1);
 await action(solo,"catalog");
 await action(solo,"catalogPage","improve");
 await action(solo,"heat");
 assert.equal((await snapshot(solo)).upgrades.heating,1);
 await solo.reload();
 await solo.waitForFunction(()=>window.__KIOSK_TEST__?.getState!==undefined);
 await solo.locator("#primaryStart").click();
 assert.equal((await snapshot(solo)).windowOpen,true);
 assert.equal((await snapshot(solo)).players.solo.hand,"tea");
 assert.equal((await snapshot(solo)).upgrades.shelves,1,"upgrade survives original v3 localStorage key");
 assert.equal((await snapshot(solo)).upgrades.heating,1,"insulation survives original v3 localStorage key");
 await solo.screenshot({path:"artifacts/kiosk-mobile-solo.png",fullPage:false});
 // Landscape and desktop use an expanded camera, not a scaled portrait screenshot.
 const wide=await open(context,1280,720);
 await freshSolo(wide);
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
   await freshSolo(p);
   await p.waitForFunction(()=>window.__KIOSK_TEST__.getHits().some(h=>h.cmd==="window"&&h.w>=1));
   await action(p,"window");
   await p.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="idle",{timeout:6000});
   await p.waitForFunction(()=>window.__KIOSK_TEST__.getHits().some(h=>h.cmd==="talk"));
   const metrics=await p.evaluate(()=>{
     const h=window.__KIOSK_TEST__.getHits().find(v=>v.cmd==="talk");
     const size=window.__KIOSK_TEST__.screen();
     return {touchHeight:h.h/size.H*innerHeight,land:size.land,
       statusHidden:getComputedStyle(document.querySelector("#status")).display==="none",
       overflow:document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2};
   });
   assert.equal(metrics.overflow,false,"No scrolling on "+name);
   assert.equal(metrics.statusHidden,true,"Persistent status must not cover scene art on "+name);
   assert.ok(metrics.touchHeight>=42,"Main touch target too small on "+name+": "+metrics.touchHeight);
   assert.equal(metrics.land,vw>vh,"Correct adaptive orientation on "+name);
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
   await freshSolo(phone);
   await phone.waitForFunction(()=>Boolean(window.__KIOSK_TEST__?.getState()?.players?.solo));
   await phone.waitForFunction(()=>window.__KIOSK_TEST__?.getHits().some(h=>h.cmd==="window"));
   await action(phone,"window");
   await phone.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==="idle",{timeout:6000});
   await aim(phone,"look","front");
   const measurements=await phone.evaluate(()=>{
     const {W,H,land}=window.__KIOSK_TEST__.screen();
     const box=document.querySelector("#game").getBoundingClientRect();
     const h=window.__KIOSK_TEST__.getHits().filter(x=>["talk","sell","commission","restock"].includes(x.cmd));
     return {W,H,land,screenWidth:innerWidth,screenHeight:innerHeight,
       hitSizes:h.map(x=>({cmd:x.cmd,width:x.w*box.width/W,height:x.h*box.height/H})),
       overlayHidden:getComputedStyle(document.querySelector("#status")).display==="none",
       overflow:document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2};
   });
   assert.equal(measurements.land,vw>vh,"orientation must match physical viewport");
   assert.ok(Math.abs(measurements.W/measurements.H-vw/vh)<.005,
     label+" aspect ratio distorted: "+JSON.stringify(measurements));
   assert.equal(measurements.overflow,false,label+" must not scroll");
   assert.equal(measurements.overlayHidden,true,label+" must not overlay shop art with status");
   assert.ok(measurements.hitSizes.some(h=>h.cmd==="talk"),label+" main view exposes the customer");
   assert.ok(measurements.hitSizes.some(h=>h.cmd==="sell"),label+" main view exposes checkout");
   // The camera intentionally does not shrink all stock and service controls
   // into the same narrow viewport. Inspect actual unit targets in its stock shot.
   await aim(phone,"slot","shelfL1");
   const stockTargets=await phone.evaluate(()=>window.__KIOSK_TEST__.getHits().filter(h=>h.cmd==="slot"&&h.key==="shelfL1"&&h.itemId));
   assert.equal(stockTargets.length,2,label+" stock closeup exposes both real units");
   assert.notEqual(stockTargets[0].itemId,stockTargets[1].itemId);
   assert.ok(stockTargets.every(h=>h.w>=44&&h.h>=44),label+" individual stock targets must be finger-sized");
   for(const hit of measurements.hitSizes){
     assert.ok(hit.width>=44&&hit.height>=44,
       label+" touch target below 44 CSS px: "+JSON.stringify(hit));
   }
   await phone.screenshot({path:"artifacts/kiosk-"+label+"-pixel.png",fullPage:false});
   await phone.close();
 }
 // Five real solo sales verify end-of-day rating and persistent reputation.
 const growth=await open(context);
 await freshSolo(growth);
 // A click can update state before the next requestAnimationFrame registers hitboxes.
 await growth.waitForFunction(()=>window.__KIOSK_TEST__?.getHits().some(h=>h.cmd==="window"));
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
 await growth.locator("#primaryStart").click();
 assert.equal((await snapshot(growth)).reputation,4,"reputation persists under original save key");
 await growth.screenshot({path:"artifacts/kiosk-day-two-reputation.png",fullPage:false});
 // Finish an actual three-battery recycling batch in Chromium. Unlike retail,
 // this requires customer intake, drawer capacity and dispatch payout.
 const recycler=await open(context);
 await freshSolo(recycler);
 await action(recycler,"window");
 await action(recycler,"slot","shelfL1");
 await action(recycler,"counter");
 await action(recycler,"sell");
 await recycler.waitForFunction(()=>window.__KIOSK_TEST__.getHits().some(h=>h.cmd==="recycleReceive"),undefined,{timeout:9000});
 await action(recycler,"recycleReceive");
 await action(recycler,"toggle","drawerR");
 await action(recycler,"recycleStore");
 assert.equal((await snapshot(recycler)).businesses.recycling.stored,1);
 await recycler.reload();
 await recycler.locator("#primaryStart").click();
 assert.equal((await snapshot(recycler)).businesses.recycling.stored,1,"recycling stock survives old v3 save key");
 for(const key of ["shelfL2","shelfR1"]){
   await action(recycler,"slot",key);
   await action(recycler,"counter");
   await action(recycler,"sell");
   await recycler.waitForFunction(()=>window.__KIOSK_TEST__.getHits().some(h=>h.cmd==="recycleReceive"),undefined,{timeout:9000});
   await action(recycler,"recycleReceive");
   await action(recycler,"recycleStore");
 }
 assert.equal((await snapshot(recycler)).businesses.recycling.stored,3);
 await recycler.screenshot({path:"artifacts/kiosk-recycling-full-drawer.png",fullPage:false});
 const beforeDispatch=(await snapshot(recycler)).cash;
 await action(recycler,"recycleShip",undefined,"hold");
 assert.equal((await snapshot(recycler)).cash,beforeDispatch+12,"three stored batteries pay once");
 assert.equal((await snapshot(recycler)).businesses.recycling.shipments,1);
 assert.equal((await snapshot(recycler)).businesses.recycling.stored,0);
 await recycler.screenshot({path:"artifacts/kiosk-recycling-batch-settled.png",fullPage:false});
 // A genuinely offline reload must restore the same solo inventory and
 // open window after the service worker installs its published ES modules.
 // PeerJS CDN routing is removed before offline mode: multiplayer still
 // requires internet, but a local shop must not.
 const offlineContext=await browser.newContext({viewport:{width:390,height:844}});
 const offline=await open(offlineContext);
 await freshSolo(offline);
 await offline.waitForFunction(()=>window.__KIOSK_TEST__?.getHits().some(h=>h.cmd==="window"));
 await action(offline,"window");
 await action(offline,"slot","shelfL1");
 assert.equal((await snapshot(offline)).players.solo.hand,"tea");
 await offline.waitForFunction(async()=>{
   const reg=await navigator.serviceWorker.ready;
   const names=(await caches.keys()).filter(name=>name.startsWith("untitled-kiosk-offline-v"));
   const entries=await Promise.all(names.map(name=>caches.open(name).then(cache=>cache.keys())));
   return Boolean(reg.active)&&entries.some(keys=>keys.length>=14&&keys.some(req=>req.url.endsWith("/src/kiosk-business.js")));
 },undefined,{timeout:20000});
 await offline.reload();
 await offline.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),undefined,{timeout:12000});
 await offline.unroute("https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js");
 await offlineContext.setOffline(true);
 await offline.reload({waitUntil:"domcontentloaded",timeout:15000});
 await offline.waitForFunction(()=>window.__KIOSK_TEST__?.getHits);
 await offline.locator("#primaryStart").click();
 const offlineState=await snapshot(offline);
 assert.equal(offlineState.windowOpen,true,"offline shop retains the open shutter");
 assert.equal(offlineState.players.solo.hand,"tea","offline shop restores saved stock");
 await offline.screenshot({path:"artifacts/kiosk-offline-solo-restored.png",fullPage:false});
 await offlineContext.close();
 assert.deepEqual(errors,[]);
 console.log("PASS: two actual mobile clients transferred stock, opened drawer, sold a customer, local restore, no scroll, landscape layout.");
}catch(e){console.error(e);process.exitCode=1;}
finally{await browser?.close();server.kill();process.exit();}
