import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const out=path.resolve('artifacts/work-tv-3d');
fs.mkdirSync(out,{recursive:true});
const site='site/card-battle/slots-daggers/television/';
const html=fs.readFileSync(site+'index.html','utf8');
const gpu=fs.readFileSync(site+'television-gpu.js','utf8');
const broadcast=fs.readFileSync(site+'broadcast.js','utf8');
const oldCPU=fs.readFileSync(site+'television.js','utf8');
if(!html.includes('type="module" src="television-gpu.js"')||
   !html.includes('src="../world-art.js"')||
   !html.includes('src="../pixel-type.js"')||
   !gpu.includes("import * as THREE from '../../vendor/three.module.js'"))
 throw Error('Existing game Three.js and pixel painter are not connected');
if(html.includes('src="television.js"')||html.includes('src="work-tv-cpu.js"'))
 throw Error('Obsolete CPU per-pixel renderer still active in television page');
if(!gpu.includes('NearestFilter')||!gpu.includes('WebGLRenderer')||
   !gpu.includes('CabinetArt.wood')||!broadcast.includes('WorldArt.draw')||
   !broadcast.includes('SlotStudy.label'))
 throw Error('The approved original game pixel pipeline is not actually reused');
if(!broadcast.includes('protagonist-front.webp'))
 throw Error('Original canonical host portrait missing');
if(!oldCPU.includes('drawTriangle('))
 throw Error('Old CPU source missing; reference not traceable');

const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'
]});
const viewports=[
 {name:'desktop-1280x720',width:1280,height:720},
 {name:'phone-portrait-390x844',width:390,height:844},
 {name:'phone-landscape-844x390',width:844,height:390}
];
const results=[];
for(const v of viewports){
 const context=await browser.newContext({
  viewport:{width:v.width,height:v.height},deviceScaleFactor:1,
  recordVideo:{dir:out,size:{width:v.width,height:v.height}}
 });
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.goto('http://127.0.0.1:4173/card-battle/slots-daggers/television/index.html',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.WorkTVQA?.state().frames>4,{timeout:30000});
  await page.waitForFunction(()=>window.WorkTVQA?.state().broadcast?.hostL2D,
   {timeout:30000});
  const a=await page.evaluate(()=>WorkTVQA.state());
  if(!a.webgl||a.backend!=='webgl-three-shared-vendor'||
     !a.pixelNearest||a.screenPrograms!==6||
     a.geometryFaces<250||a.broadcast?.originalWorldArt!==true||
     a.broadcast?.originalPixelFont!==true)
   throw Error('3D GPU/pixel-art runtime not actually active '+JSON.stringify(a));
  if(a.pixelResolution[0]>Math.ceil(v.width*.70) && v.width>=600)
   throw Error('Unnecessarily high pixel-cost resolution: '+a.pixelResolution);
  if(a.broadcast.loadedPortraits<2||a.broadcast.errors.length)
   throw Error('Broadcast assets missing '+JSON.stringify(a.broadcast));
  if(a.programFrames<2||a.frameRenderMs>180)
   throw Error('Insufficient animated programme rendering or stall '+JSON.stringify(a));
  await page.waitForTimeout(1200);
  const sustained=await page.evaluate(()=>WorkTVQA.state());
  await page.screenshot({path:path.join(out,v.name+'-01-gpu-pixel-renderer.png')});
  const offPos=sustained.controlPositions.power;
  await page.mouse.click(offPos[0],offPos[1]);
  await page.waitForTimeout(600);
  const off=await page.evaluate(()=>WorkTVQA.state());
  if(off.power!==false||off.powerTransition!=='off'||off.pressCount!==1)
   throw Error('3D physical power knob failed '+JSON.stringify(off));
  await page.screenshot({path:path.join(out,v.name+'-02-power-off.png')});
  const onPos=off.controlPositions.power;
  await page.mouse.click(onPos[0],onPos[1]);
  await page.waitForTimeout(850);
  const recovered=await page.evaluate(()=>WorkTVQA.state());
  if(!recovered.power||recovered.powerTransition!=='on'||recovered.pressCount!==2)
   throw Error('TV power on boot failed '+JSON.stringify(recovered));
  const chanPos=recovered.controlPositions.channel;
  await page.mouse.click(chanPos[0],chanPos[1]);
  await page.waitForTimeout(320);
  const tuned=await page.evaluate(()=>WorkTVQA.state());
  if(tuned.channel!==1||tuned.pressCount!==3)
   throw Error('Physical tuner does not switch channel '+JSON.stringify(tuned));
  await page.screenshot({path:path.join(out,v.name+'-03-advert-pixel.png')});
  await page.keyboard.press('Digit3');
  await page.waitForTimeout(320);
  if((await page.evaluate(()=>WorkTVQA.state().channel))!==2)
   throw Error('Keyboard direct tuning failed');
  await page.screenshot({path:path.join(out,v.name+'-04-talk-original-host.png')});
  await page.keyboard.press('Digit5');
  await page.waitForTimeout(340);
  await page.screenshot({path:path.join(out,v.name+'-05-original-world-art-documentary.png')});
  await page.keyboard.press('i');
  await page.waitForTimeout(250);
  const guide=await page.evaluate(()=>WorkTVQA.state());
  if(!guide.showGuide||guide.programScripts!==6)
   throw Error('Native TV pixel programme guide unavailable');
  await page.screenshot({path:path.join(out,v.name+'-06-pixel-program-guide.png')});
  await page.keyboard.press('i');
  if((await page.evaluate(()=>WorkTVQA.state().showGuide)))throw Error('Guide does not close');
  await page.evaluate(()=>WorkTVQA.setAngles(26,7));
  await page.waitForTimeout(300);
  const turned=await page.evaluate(()=>WorkTVQA.state());
  if(turned.yaw!==26||turned.pitch!==7)throw Error('Real GPU 3D camera orbit missing');
  await page.screenshot({path:path.join(out,v.name+'-07-physical-depth.png')});
  if(errors.length)throw Error('Runtime JS errors '+errors.join(' | '));
  results.push({viewport:v.name,start:a,sustained,off,recovered,tuned,turned,errors});
  console.log('PASS',v.name,JSON.stringify({
   webgl:a.backend,originalPixelFont:a.broadcast.originalPixelFont,
   originalWorldArt:a.broadcast.originalWorldArt,shaderDrawCalls:a.sceneDrawCalls,
   geometryTriangles:a.geometryFaces,
   renderBuffer:a.pixelResolution,renderMs:sustained.frameRenderMs,
   fps:sustained.fps,channels:a.screenPrograms,hostL2D:a.broadcast.hostL2D
  }));
 }catch(e){
  await page.screenshot({path:path.join(out,v.name+'-FAIL-debug.png')}).catch(()=>{});
  console.error('FAIL',v.name,String(e),errors);
  throw e;
 }finally{await context.close();}
}
for(const legacy of ['coin-lab/index.html','coin-lab/items.html','coin-pusher/index.html','coin-pusher/standalone.html']){
 const p=await browser.newPage();
 await p.goto('http://127.0.0.1:4173/card-battle/slots-daggers/'+legacy,
  {waitUntil:'domcontentloaded'});
 await p.waitForURL('**/television/index.html',{timeout:12000});
 await p.close();console.log('PASS legacy redirect',legacy);
}
await browser.close();
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({usesOriginalPixelRenderer:true,
 usesSharedGPU:true,results},null,2));
