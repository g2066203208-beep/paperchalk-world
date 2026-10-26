// Integration: two real browsers connect through a local PeerServer, share facts and decisions,
// and preserve a single-player game in app-local browser storage.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {spawn} from "node:child_process";
import {createRequire} from "node:module";
import {chromium} from "playwright";
const require=createRequire(import.meta.url),{PeerServer}=require("peer");
PeerServer({port:9100,host:"127.0.0.1",path:"/"});
const staticServer=spawn("python3",["-m","http.server","4173","--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
const errors=[];
async function open(context,width=390,height=844){
 const page=await context.newPage({viewport:{width,height}});
 page.on("pageerror",e=>errors.push(e.message));
 await page.route("https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js",route=>route.fulfill({path:path.resolve("node_modules/peerjs/dist/peerjs.min.js"),contentType:"application/javascript"}));
 await page.addInitScript(()=>{
  window.LAMPKEEP_E2E=true;
  window.CRYPTBOUND_PEER_OPTIONS={host:"127.0.0.1",port:9100,path:"/",secure:false};
 });
 for(let attempt=0;attempt<25;attempt++){try{await page.goto("http://127.0.0.1:4173/",{waitUntil:"domcontentloaded",timeout:5000});break;}catch(e){if(attempt===24)throw e;await new Promise(r=>setTimeout(r,200));}}
 await page.waitForFunction(()=>typeof window.lampkeepState==="function");
 return page;
}
async function run(){
 browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const host=await open(context),guest=await open(context);
 assert.match(await host.title(),/未命名游戏/);
 await host.locator("#playerName").fill("收银员");
 await host.locator("#hostButton").click();
 await host.waitForFunction(()=>document.querySelector("#inviteCode")?.textContent.length===8,null,{timeout:15000});
 const code=await host.locator("#inviteCode").textContent();
 await guest.locator("#playerName").fill("窗边的人");
 await guest.locator("#joinCode").fill(code);
 await guest.locator("#joinButton").click();
 await host.waitForFunction(()=>Object.keys(window.lampkeepState()?.players||{}).length===2,null,{timeout:16000});
 await guest.waitForFunction(()=>Object.keys(window.lampkeepState()?.players||{}).length===2,null,{timeout:16000});
 const nameA=await host.locator("#visitorName").textContent(),nameB=await guest.locator("#visitorName").textContent();
 assert.equal(nameA,nameB);
 await guest.locator('[data-station="window"]').click();
 await guest.locator("#inspectButton").click();
 await host.waitForFunction(()=>window.lampkeepState()?.opened?.window===true,null,{timeout:12000});
 await guest.locator("#pinButton").click();
 await host.waitForFunction(()=>window.lampkeepState()?.pins?.includes("window"),null,{timeout:12000});
 await host.locator("#welcomeButton").click();
 await new Promise(r=>setTimeout(r,420));
 assert.equal(await host.evaluate(()=>window.lampkeepState().index),0,"two players must agree");
 await guest.locator("#welcomeButton").click();
 await host.waitForFunction(()=>window.lampkeepState()?.index===1,null,{timeout:12000});
 await guest.waitForFunction(()=>window.lampkeepState()?.index===1,null,{timeout:12000});
 // Rapid successive actions used to overwrite the previous action before the
 // host's 150ms tick. Validate 100 ordered inputs from a real connected client.
 const peerId=await guest.evaluate(()=>Object.keys(window.lampkeepState().players).find(k=>k!=="host"));
 const before=await host.evaluate(()=>window.lampkeepState().revision);
 await guest.evaluate(()=>window.lampkeepSendTestActions(100));
 await host.waitForFunction(before=>window.lampkeepState()?.revision>=before+100,before,{timeout:15000});
 await host.waitForFunction(peerId=>window.lampkeepState()?.players?.[peerId]?.station==="window",peerId,{timeout:10000});
 await guest.waitForFunction(peerId=>window.lampkeepState()?.players?.[peerId]?.station==="window",peerId,{timeout:10000});
 // Two players now manipulate the same visible item, not merely share text clues.
 await guest.locator('[data-station="shelf"]').click();
 const wanted=await guest.evaluate(()=>window.lampkeepState().shop.shelf[0]);
 await guest.locator("#shelfProps button").nth(1).click();
 await host.waitForFunction(()=>Boolean(window.lampkeepState()?.shop?.counter),null,{timeout:12000});
 const trustBefore=await host.evaluate(()=>window.lampkeepState().trust);
 await host.locator("#scanButton").click();
 await host.waitForFunction(()=>window.lampkeepState()?.shop?.mistakes===1,null,{timeout:12000});
 assert.equal(await host.evaluate(()=>window.lampkeepState().trust),trustBefore-1);
 await host.locator("#returnButton").click();
 await guest.waitForFunction(()=>window.lampkeepState()?.shop?.counter===null,null,{timeout:12000});
 await guest.locator('#shelfProps button[data-sku="'+wanted+'"]').click();
 await host.waitForFunction(wanted=>window.lampkeepState()?.shop?.counter===wanted,wanted,{timeout:12000});
 await host.locator("#scanButton").click();
 await guest.waitForFunction(()=>window.lampkeepState()?.shop?.success===true,null,{timeout:12000});
 assert.equal(await guest.locator("#propStage").getAttribute("data-result"),"correct");
 await fs.mkdir("artifacts",{recursive:true});
 await host.screenshot({path:"artifacts/lampkeep-host-mobile.png",fullPage:true});
 await guest.screenshot({path:"artifacts/lampkeep-guest-mobile.png",fullPage:true});
 assert.deepEqual(errors,[],"No uncaught browser errors");
 const solo=await open(context);
 await solo.locator("#soloButton").click();
 await solo.locator('[data-station="ledger"]').click();
 await solo.locator("#inspectButton").click();
 const seed=await solo.evaluate(()=>window.lampkeepState().seed);
 await solo.reload();
 await solo.locator("#resumeButton").click();
 assert.equal(await solo.evaluate(()=>window.lampkeepState().seed),seed);
 assert.equal(await solo.evaluate(()=>window.lampkeepState().opened.ledger),true);
 await solo.screenshot({path:"artifacts/lampkeep-solo-mobile.png",fullPage:true});
 console.log("PASS: two clients transferred physical products, wrong scan reduced trust, correct scan synchronized, and solo save restored.");
}
let exitCode=0;
try{await run();}catch(e){console.error(e);exitCode=1;}
finally{await browser?.close();staticServer.kill();process.exit(exitCode);}
