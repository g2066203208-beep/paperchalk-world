// Real two-client WebRTC shop interaction at mobile resolution and landscape.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
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
 browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const host=await open(context),guest=await open(context);
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
 await solo.reload();
 await solo.waitForFunction(()=>window.__KIOSK_TEST__?.getState!==undefined);
 await solo.locator("#resume").click();
 assert.equal((await snapshot(solo)).windowOpen,true);
 assert.equal((await snapshot(solo)).players.solo.hand,"tea");
 assert.equal((await snapshot(solo)).upgrades.shelves,1,"upgrade survives original v3 localStorage key");
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
 assert.deepEqual(errors,[]);
 console.log("PASS: two actual mobile clients transferred stock, opened drawer, sold a customer, local restore, no scroll, landscape layout.");
}catch(e){console.error(e);process.exitCode=1;}
finally{await browser?.close();server.kill();process.exit();}
