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
 if(initial.credits!==72||initial.coins<36||initial.tower!==0)throw Error(tc.name+' initial balance or untouched tower is broken '+JSON.stringify(initial));
 if(initial.visibleSprites<30 || initial.badMatrices!==0)throw Error(tc.name+' GOLD INVISIBLE OR INVALID ROTATION '+JSON.stringify(initial));
 if(after.inserted!==8||after.credits!==64)throw Error(tc.name+' drop/game economy broken '+JSON.stringify(after));
 if(after.visibleSprites<20||after.badMatrices!==0)throw Error(tc.name+' original gold rendering invalid after motion '+JSON.stringify(after));
 if(!Number.isFinite(after.front)||!Number.isFinite(after.prize)||after.prize<0||!Number.isFinite(after.fps))throw Error(tc.name+' broken physics state '+JSON.stringify(after));
 if(after.time<=initial.time+3)throw Error(tc.name+' motor did not run '+JSON.stringify(after));
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
await browser.close();
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));