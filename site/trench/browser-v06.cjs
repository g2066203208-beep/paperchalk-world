const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
 const report={screenshots:[],errors:[],modes:[]};
 try{
 for(const viewport of [{width:1280,height:720},{width:390,height:844}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1,isMobile:viewport.width<500,hasTouch:viewport.width<500});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/trench/?test=1',{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>window.__avatarV06&&window.__reviewMode,{timeout:60000});
  for(const mode of ['idle','walk','run','jump','crouch','crouch-walk','aim','crouch-aim']){
   await page.selectOption('#reviewMode',mode);
   await page.waitForFunction(mode=>window.__reviewMode===mode,mode);
   await page.waitForTimeout(450);
   const d=await page.evaluate(()=>({mode:window.__reviewMode,...window.__avatarV06,canvas:[document.querySelector('canvas').width,document.querySelector('canvas').height]}));
   assert.equal(d.mode,mode);assert(d.canvas.every(v=>v>0));assert(d.metrics.vertices===1334);
   if(mode==='run')assert(d.run>.6);if(mode.includes('crouch'))assert(d.crouch>.6);
   if(mode==='jump')assert(d.air>.2);
   const file=viewport.width+'-'+mode+'.png';await page.screenshot({path:'/tmp/trench-review/'+file});report.screenshots.push(file);report.modes.push(d);
  }
  await page.click('#reviewCamera');
  for(const mode of ['idle','walk','run','jump','crouch','aim','crouch-aim']){await page.selectOption('#reviewMode',mode);await page.waitForFunction(mode=>window.__reviewMode===mode&&!window.__firstPersonV07.third,mode);await page.waitForTimeout(500);await page.screenshot({path:'/tmp/trench-review/'+viewport.width+'-first-'+mode+'.png'});}
  await page.click('#reviewCamera');await page.click('#reviewSide');await page.waitForTimeout(250);await page.screenshot({path:'/tmp/trench-review/'+viewport.width+'-alternate.png'});
  await page.click('#review');await page.waitForTimeout(350);
  await page.screenshot({path:'/tmp/trench-review/'+viewport.width+'-mirror.png'});
  await page.click('#down');await page.waitForTimeout(350);await page.screenshot({path:'/tmp/trench-review/'+viewport.width+'-first-person.png'});
  if(viewport.width>=500){await page.keyboard.down('d');await page.keyboard.down('Shift');await page.waitForTimeout(500);assert((await page.evaluate(()=>window.__avatarV06.run))>.5);await page.keyboard.up('Shift');await page.keyboard.up('d');await page.keyboard.press('Space');await page.waitForTimeout(200);assert((await page.evaluate(()=>window.__avatarV06.vertical))>0);}
  await page.close();
 }
 // Force the non-WebGL path in real Chromium, and inspect the actual canvas pixel buffer.
 for(const viewport of [{width:960,height:540},{width:390,height:844}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/trench/?renderer=cpu&test=1&view=first',{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>window.__trenchBoot?.mode==='cpu'&&window.__softwareFrame?.frame>0,null,{timeout:60000});
  const d=await page.evaluate(()=>{let c=document.getElementById('softwareView'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();let black=0;for(let i=0;i<p.length;i+=4){colors.add((p[i]<<16)|(p[i+1]<<8)|p[i+2]);if(p[i]+p[i+1]+p[i+2]===0)black++;}return {width:c.width,height:c.height,colors:colors.size,black,boot:window.__trenchBoot};});
  assert(d.colors>30);assert(d.black<d.width*d.height*.1);assert(!d.boot.error);
  report.fallback??=[];report.fallback.push(d);
  await page.screenshot({path:'/tmp/trench-review/'+viewport.width+'-cpu-fallback.png'});
  await page.close();
 }
 assert.deepEqual(report.errors,[]);
 }finally{fs.writeFileSync('/tmp/trench-review/browser-report.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
