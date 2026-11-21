import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('artifacts/work-tv-3d');
fs.mkdirSync(out,{recursive:true});
const metal=s=>s.match(/function metal\(nx,ny,nz,rough,ambient,lamp\) \{[\s\S]*?\n  \}/)?.[0];
const coin=fs.readFileSync('site/card-battle/slots-daggers/coin-art.js','utf8');
const tv=fs.readFileSync('site/card-battle/slots-daggers/television/television.js','utf8');
const html=fs.readFileSync('site/card-battle/slots-daggers/television/index.html','utf8');
if(!metal(coin)||metal(coin)!==metal(tv))throw Error('Original Work coin metallic shading function was modified');
if(!html.includes('src="../reel-art.js"')||!html.includes('src="../cabinet-art.js"'))throw Error('Slot ReelArt/CabinetArt originals were not wired to the television');
if(!tv.includes('frontScrews:0')||!tv.includes('rounded curved integrated mesh'))throw Error('Curved glass integration or unnecessary screw removal missing');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const viewports=[{name:'desktop-1280x720',width:1280,height:720},{name:'phone-portrait-390x844',width:390,height:844},{name:'phone-landscape-844x390',width:844,height:390}];
const results=[];
for(const v of viewports){
 const context=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:v.width,height:v.height}}});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.goto('http://127.0.0.1:4173/card-battle/slots-daggers/television/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.WorkTVQA?.state().screenMappingPixels>5000&&window.WorkTVQA?.state().actualReelArt&&window.WorkTVQA?.state().originalCabinetTexture,{timeout:22000});
  await page.waitForTimeout(1750);
  const a=await page.evaluate(()=>WorkTVQA.state());
  if(a.meshFaces<900||a.crtTriangles!==676||a.frontScrews!==0||a.screenPrograms!==3||a.powerTransition!=='on'||a.crtPixelCoverage<5000)throw Error('TV 3D design/genuine symbols incomplete '+JSON.stringify(a));
  if(!a.modelColor.includes('porcelain')||!a.screenShape.includes('rounded curved')||a.frameRenderMs>80)throw Error('Model style or performance regression '+JSON.stringify(a));
  await page.screenshot({path:path.join(out,v.name+'-01-original-slot-reel-tv-on.png')});
  const offPos=a.controlPositions.power;
  await page.mouse.click(offPos[0],offPos[1]);
  await page.waitForTimeout(850);
  const off=await page.evaluate(()=>WorkTVQA.state());
  if(off.power!==false||off.powerTransition!=='off'||off.pressCount!==1)throw Error('Physical 3D power dial does not actually turn TV off '+JSON.stringify(off));
  await page.screenshot({path:path.join(out,v.name+'-02-real-dial-power-off.png')});
  const onPos=off.controlPositions.power;
  await page.mouse.click(onPos[0],onPos[1]);
  await page.waitForTimeout(280);
  const ignition=await page.evaluate(()=>WorkTVQA.state());
  if(!ignition.power||ignition.powerTransition!=='boot'||ignition.pressCount!==2)throw Error('Physical 3D power dial does not ignite CRT '+JSON.stringify(ignition));
  await page.screenshot({path:path.join(out,v.name+'-03-tube-ignition-white-line.png')});
  await page.waitForTimeout(1390);
  const recovered=await page.evaluate(()=>WorkTVQA.state());
  if(recovered.powerTransition!=='on')throw Error('Boot aperture did not finish '+JSON.stringify(recovered));
  await page.screenshot({path:path.join(out,v.name+'-04-completed-crt-warm-boot.png')});
  const channelPos=recovered.controlPositions.channel;
  await page.mouse.click(channelPos[0],channelPos[1]);
  await page.waitForTimeout(480);
  const tuned=await page.evaluate(()=>WorkTVQA.state());
  if(tuned.channel!==1||tuned.pressCount!==3)throw Error('Second physical 3D knob does not switch WORK reel ad '+JSON.stringify(tuned));
  await page.screenshot({path:path.join(out,v.name+'-05-slot-reel-ad-second-channel.png')});
  await page.evaluate(()=>WorkTVQA.setAngles(26,7));
  await page.waitForTimeout(290);
  const turned=await page.evaluate(()=>WorkTVQA.state());
  if(turned.yaw!==26||turned.pitch!==7||turned.renderCache<=a.renderCache)throw Error('True-3D body cannot rotate or lacks depth rebuild '+JSON.stringify(turned));
  await page.screenshot({path:path.join(out,v.name+'-06-depth-of-real-television.png')});
  if(errors.length)throw Error('Javascript errors '+errors.join(' | '));
  results.push({viewport:v.name,on:a,off,ignition,recovered,tuned,turned,errors});
  console.log('PASS',v.name,JSON.stringify({on:{model:a.meshFaces,screen:a.crtTriangles,originalReel:a.actualReelArt,cabinet:a.originalCabinetTexture,fps:a.fps,frameMs:a.frameRenderMs},off:{power:off.power,transition:off.powerTransition},ignition:ignition.powerTransition,tuned:tuned.channel,turn:turned.yaw}));
 }catch(e){
  await page.screenshot({path:path.join(out,v.name+'-FAIL-debug.png')}).catch(()=>{});
  console.error('FAIL',v.name,String(e),errors);
  throw e;
 }finally{await context.close();}
}
for(const legacy of ['coin-lab/index.html','coin-lab/items.html','coin-pusher/index.html','coin-pusher/standalone.html']){
 const p=await browser.newPage();
 await p.goto('http://127.0.0.1:4173/card-battle/slots-daggers/'+legacy,{waitUntil:'domcontentloaded'});
 await p.waitForURL('**/television/index.html',{timeout:12000});
 await p.close();console.log('PASS legacy redirect',legacy);
}
await browser.close();
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({identicalOriginalMetal:true,results},null,2));