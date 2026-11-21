import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('artifacts/work-coin-pusher');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const cases=[
 {name:'desktop-960x540',viewport:{width:960,height:540}},
 {name:'phone-landscape-844x390',viewport:{width:844,height:390}},
 {name:'phone-portrait-390x844',viewport:{width:390,height:844}}
];
const result=[];
for(const tc of cases){
 const browserCtx=await browser.newContext({viewport:tc.viewport,deviceScaleFactor:1,recordVideo:{dir:out,size:tc.viewport},reducedMotion:'reduce'});
 const page=await browserCtx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4173/card-battle/slots-daggers/coin-pusher/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.CoinPusherQA && window.CoinPusherQA.state().coins>30,{timeout:20000});
 await page.waitForTimeout(800);
 const initial=await page.evaluate(()=>CoinPusherQA.state());
 await page.screenshot({path:path.join(out,tc.name+'-01-initial-work-shaded-tower.png')});
 const b=await page.locator('#screen').boundingBox();
 const click=async(x,y)=>page.mouse.click(b.x+x/960*b.width,b.y+y/540*b.height);
 await click(483,270); // choose aim directly on the coin table, not an HTML UI.
 for(let i=0;i<8;i++){
  await click(820,254); // actual machine input, not direct QA mutation.
  await page.waitForTimeout(190);
 }
 await page.screenshot({path:path.join(out,tc.name+'-02-eight-coins-plunger-moving.png')});
 await page.waitForTimeout(7200);
 await page.screenshot({path:path.join(out,tc.name+'-03-tower-pusher-and-payout.png')});
 const after=await page.evaluate(()=>CoinPusherQA.state());
 if(initial.credits!==72||initial.coins<36||initial.tower!==0||initial.stacked<10)throw Error(tc.name+' initial supported 3D coin tower is broken '+JSON.stringify(initial));
 if(!initial.nativeFixedPhysics||initial.nativeTime<.1)throw Error(tc.name+' Work CoinTable native 240Hz physics not running '+JSON.stringify(initial));
 if(initial.visibleSprites<30 || initial.badMatrices!==0)throw Error(tc.name+' GOLD INVISIBLE OR INVALID ROTATION '+JSON.stringify(initial));
 if(after.inserted!==8||after.credits!==64)throw Error(tc.name+' drop/game economy broken '+JSON.stringify(after));
 if(after.visibleSprites<20||after.badMatrices!==0)throw Error(tc.name+' original gold rendering invalid after motion '+JSON.stringify(after));
 if(!Number.isFinite(after.front)||!Number.isFinite(after.prize)||after.prize<0||!Number.isFinite(after.fps))throw Error(tc.name+' broken physics state '+JSON.stringify(after));
 if(after.time<=initial.time+3||after.nativeTime<=initial.nativeTime+3)throw Error(tc.name+' native CoinTable physics or plunger did not advance '+JSON.stringify(after));
 const pixels=await page.evaluate(()=>{
  const c=document.querySelector('#screen'),a=c.getContext('2d').getImageData(0,0,960,540).data;
  let nonblack=0;for(let y=30;y<510;y+=19)for(let x=30;x<930;x+=19){const i=(y*960+x)*4;if(a[i]+a[i+1]+a[i+2]>100)nonblack++;}
  return nonblack;
 });
 if(pixels<250)throw Error(tc.name+' real game canvas is blank '+pixels);
 if(errors.length)throw Error(tc.name+' JS errors '+errors.join('|'));
 result.push({viewport:tc.name,initial,after,nonblack:pixels,errors});
 console.log('PASS',tc.name,JSON.stringify({initial,after,nonblack:pixels}));
 await browserCtx.close();
}
// The ACTUAL hosted slot cabinet is page 1 and physical coin pusher is page 2.
// Click the same on-screen controls players use, and verify both directions.
const navCtx=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
const navPage=await navCtx.newPage(),navErrors=[];
navPage.on('pageerror',e=>navErrors.push(String(e)));
await navPage.goto('http://127.0.0.1:4173/card-battle/soul-table.html',{waitUntil:'domcontentloaded'});
await navPage.waitForFunction(()=>document.getElementById('loading')?.hidden===true,{timeout:20000});
if(await navPage.locator('nav.work-arcade-pages a').count()!==2)throw Error('Work hosted slot cabinet page navigation missing');
await navPage.screenshot({path:path.join(out,'hosted-page-1-original-slot.png')});
await navPage.locator('nav.work-arcade-pages a').nth(1).click();
await navPage.waitForURL('**/coin-pusher/index.html',{timeout:15000});
await navPage.waitForFunction(()=>window.CoinPusherQA?.state()?.visibleSprites>=30,{timeout:20000});
await navPage.screenshot({path:path.join(out,'hosted-page-2-native-physics-coin-pusher.png')});
const routeState=await navPage.evaluate(()=>CoinPusherQA.state());
await navPage.locator('nav.work-arcade-pages a').first().click();
await navPage.waitForURL('**/soul-table.html',{timeout:15000});
await navPage.waitForFunction(()=>document.getElementById('loading')?.hidden===true,{timeout:20000});
if(!routeState.nativeFixedPhysics || routeState.stacked<10 || navErrors.length)throw Error('hosted two-page arcade navigation or native coin stacking failed '+JSON.stringify({routeState,navErrors}));
result.push({viewport:'hosted-two-page-navigation',routeState,errors:navErrors});
console.log('PASS hosted slot <-> coin pusher navigation',JSON.stringify(routeState));
await navCtx.close();
// Offline build embeds exactly the original Work renderer (no network dependencies).
const portable=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
const portablePage=await portable.newPage(),portableErrors=[];
portablePage.on('pageerror',e=>portableErrors.push(String(e)));
await portablePage.goto('http://127.0.0.1:4173/card-battle/slots-daggers/coin-pusher/standalone.html',{waitUntil:'domcontentloaded'});
await portablePage.waitForFunction(()=>window.CoinPusherQA&&CoinPusherQA.state().visibleSprites>=35,{timeout:20000});
const portableInitial=await portablePage.evaluate(()=>CoinPusherQA.state());
await portablePage.locator('#screen').click({position:{x:820,y:250}});
await portablePage.waitForTimeout(1000);
const portableFinal=await portablePage.evaluate(()=>CoinPusherQA.state());
await portablePage.screenshot({path:path.join(out,'offline-standalone-actual-coin-pusher.png')});
if(portableInitial.badMatrices||portableFinal.badMatrices||portableFinal.inserted!==1||portableFinal.credits!==71||portableErrors.length){
 throw Error('portable standalone broken '+JSON.stringify({portableInitial,portableFinal,portableErrors}));
}
result.push({viewport:'offline-standalone',portableInitial,portableFinal,errors:portableErrors});
console.log('PASS offline-standalone',JSON.stringify(portableFinal));
await portable.close();
await browser.close();
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));