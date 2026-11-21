import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('artifacts/work-tv-3d');fs.mkdirSync(out,{recursive:true});
const metal=s=>s.match(/function metal\(nx,ny,nz,rough,ambient,lamp\) \{[\s\S]*?\n  \}/)?.[0];
const coin=fs.readFileSync('site/card-battle/slots-daggers/coin-art.js','utf8');
const tv=fs.readFileSync('site/card-battle/slots-daggers/television/television.js','utf8');
if(!metal(coin)||metal(coin)!==metal(tv))throw Error('Work original coin metal() shader was not reused verbatim');
if(!tv.includes('depthBuffer')||!tv.includes('glassIOR:1.5')||!tv.includes('crtPixelCoverage'))throw Error('True-3D/Glass/CRT rendering implementation missing');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const cases=[{name:'desktop-1280x720',width:1280,height:720},{name:'desktop-960x540',width:960,height:540},{name:'phone-390x844',width:390,height:844}];
const result=[];
for(const v of cases){
 const context=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:v.width,height:v.height}}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4173/card-battle/slots-daggers/television/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.WorkTVQA?.state().meshFaces>1100&&window.WorkTVQA?.state().crtPixelCoverage>500,{timeout:20000});
 await page.waitForTimeout(600);
 const a=await page.evaluate(()=>WorkTVQA.state());
 const pix=await page.evaluate(()=>{
  const c=document.querySelector('#scene'),ctx=c.getContext('2d'),w=c.width,h=c.height;
  const d=ctx.getImageData(0,0,w,h).data;
  let total=0,green=0,metal=0,black=0;
  for(let y=0;y<h;y+=14)for(let x=0;x<w;x+=14){const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2];
   if(r+g+b>100)total++;if(g>r*1.1&&g>b*1.1&&g>14)green++;if(r>65&&r>g*1.15&&g>b*1.15)metal++;if(r+g+b<4)black++;
  }
  return {total,green,metal,black,corner:[...d.slice(0,4)]};
 });
 if(a.meshFaces<1100||a.crtTriangles!==532||a.glassIOR!==1.5||a.solidFaces<1500||a.crtPixelCoverage<5000||!a.power)throw Error(v.name+' real 3D baseline incomplete '+JSON.stringify(a));
 if(!a.originalCabinetTexture||a.screenMappingPixels<5000)throw Error(v.name+' ORIGINAL WORK CABINET MATERIAL OR CACHED UV MAP MISSING '+JSON.stringify(a));
 if(a.rasterPasses<2||a.rasterPasses>a.frames+1||!Number.isFinite(a.frameRenderMs)||a.frameRenderMs>100)throw Error(v.name+' 3D/CRT rendering was not bounded '+JSON.stringify(a));
 if(pix.total<100||pix.metal<20||pix.black<100||pix.corner[0]+pix.corner[1]+pix.corner[2]>5)throw Error(v.name+' scene not visibly illuminated gold, green and black '+JSON.stringify(pix));
 await page.screenshot({path:path.join(out,v.name+'-01-TV-FRONT.png')});
 await page.evaluate(()=>WorkTVQA.setAngles(27,7));
 await page.waitForTimeout(270);
 const rotated=await page.evaluate(()=>WorkTVQA.state());
 if(rotated.yaw!==27||rotated.pitch!==7||rotated.renderCache<=a.renderCache)throw Error(v.name+' real mesh rotation and depth cache not reacting '+JSON.stringify(rotated));
 await page.screenshot({path:path.join(out,v.name+'-02-TV-3D-SIDE.png')});
 await page.keyboard.press('Space');await page.waitForTimeout(220);
 const off=await page.evaluate(()=>WorkTVQA.state());
 if(off.power||off.pressCount!==1)throw Error(v.name+' power button did not extinguish phosphor');
 await page.screenshot({path:path.join(out,v.name+'-03-TV-OFF.png')});
 await page.keyboard.press('KeyR');await page.waitForTimeout(210);
 const reset=await page.evaluate(()=>WorkTVQA.state());
 if(!reset.power||reset.yaw!==-11||reset.pitch!==-5||errors.length)throw Error(v.name+' reset/JS exception '+JSON.stringify({reset,errors}));
 result.push({viewport:v.name,a,rotated,off,reset,pix,errors});
 console.log('PASS',v.name,JSON.stringify({a,rotated,off,pix}));
 await context.close();
}
for(const legacy of ['coin-lab/index.html','coin-lab/items.html','coin-pusher/index.html','coin-pusher/standalone.html']){
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:4173/card-battle/slots-daggers/'+legacy,{waitUntil:'domcontentloaded'});
 await page.waitForURL('**/television/index.html',{timeout:12000});
 await page.close();
 console.log('PASS retired route',legacy);
}
const old=await browser.newPage();
await old.goto('http://127.0.0.1:4173/card-battle/soul-table.html',{waitUntil:'domcontentloaded'});
const nav=await old.locator('nav.work-arcade-pages a').evaluateAll(xs=>xs.map(x=>({text:x.textContent,url:x.getAttribute('href')})));
if(nav.length!==2||!nav[1].url.includes('/television/index.html')||JSON.stringify(nav).includes('coin-pusher'))throw Error('Original Work slot still advertises removed pages '+JSON.stringify(nav));
await old.close();await browser.close();
fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({metalByteIdentical:true,originalNav:nav,results:result},null,2));