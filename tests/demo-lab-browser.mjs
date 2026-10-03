import process from 'node:process';
import fs from 'node:fs';
import {chromium} from 'playwright-core';

function assert(condition,message){if(!condition)throw new Error(message);}
fs.mkdirSync('artifacts/demo-lab-transition',{recursive:true});
const errors=[];

const browser=await chromium.launch({
  executablePath:process.env.CHROME_PATH,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});

try{
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push('PAGE '+String(error)));
  page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('Failed to load resource'))errors.push('CONSOLE '+message.text());});
  page.on('response',response=>{
    if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))errors.push('HTTP '+response.status()+' '+response.url());
  });

  await page.goto('http://127.0.0.1:8080/demo-lab/',{waitUntil:'networkidle'});
  await page.waitForSelector('#labViewport canvas',{timeout:10000});
  await page.waitForFunction(()=>window.PaperWorldLab?.ready===true,{timeout:10000});
  await page.waitForTimeout(500);

  const version=await page.locator('#demoLabVersion').textContent();
  assert(version==='DL-2026.10.03.6','wrong visible Demo Lab version: '+version);

  const initial=await page.evaluate(()=>window.PaperWorldLab.snapshot());
  assert(initial.viewMode==='game','Demo must open in actual game view');
  assert(initial.playerReady&&initial.playerVisible,'actual protagonist must be loaded and visible');
  assert(initial.activeChunk===0,'initial active chunk should be zero');
  assert(initial.residentChunks.length===4,'initial large-world window should keep four proxy neighbours');
  assert(initial.cityVisible===true,'city must be visible at the beginning');
  assert(initial.subwayVisible===false,'destination must not leak into the beginning');

  const states=[];
  for(const [label,value] of [['00',0],['25',.25],['50',.5],['75',.75],['100',1]]){
    await page.evaluate(v=>window.PaperWorldLab.setProgress(v),value);
    await page.waitForTimeout(220);
    const snapshot=await page.evaluate(()=>window.PaperWorldLab.snapshot());
    states.push({label,value,snapshot});
    const target='artifacts/demo-lab-transition/game-frame-'+label+'.png';
    await page.screenshot({path:target,fullPage:true});
    assert(fs.statSync(target).size>30000,'white-paper game screenshot too small: '+target);
    assert(snapshot.playerReady&&snapshot.playerVisible,'protagonist disappeared at '+label+'%');
    assert(snapshot.drawCalls<160,'draw calls are unexpectedly high at '+label+'%: '+snapshot.drawCalls);
  }

  const a=states[0].snapshot;
  const b=states[1].snapshot;
  const c=states[2].snapshot;
  const d=states[3].snapshot;
  const e=states[4].snapshot;

  assert(a.cityRelease===0&&a.destinationRise===0,'0% must be pure city');
  assert(b.cityRelease>.1&&b.destinationRise===0,'25% should begin releasing the old city before destination establishes');
  assert(c.cityVisible&&c.subwayVisible&&c.destinationRise>.1&&c.destinationRise<.5&&c.sweepVisible,'50% must visibly overlap old city, paper sweep and destination build');
  assert(d.destinationRise>.9&&d.subwayVisible,'75% should read primarily as the new subway');
  assert(e.cityVisible===false&&e.subwayVisible===true,'100% must complete the handoff');
  assert(e.lights===1&&e.settle===1,'100% must finish light and settle beats');

  // Prove the same local transition cell works in a larger continuous world.
  await page.evaluate(()=>{window.PaperWorldLab.setProgress(0);window.PaperWorldLab.setPlayerX(37);});
  await page.waitForTimeout(220);
  const streamed=await page.evaluate(()=>window.PaperWorldLab.snapshot());
  assert(streamed.activeChunk===2,'high-detail transition cell should stream to chunk 2: '+JSON.stringify(streamed));
  assert(streamed.residentChunks.length===4,'only four neighbour proxy chunks should remain resident');
  assert(streamed.drawCalls<160,'large-world proxy mode should stay bounded in draw calls');
  await page.screenshot({path:'artifacts/demo-lab-transition/game-large-world-chunk-2.png',fullPage:true});

  // One breakdown view is retained only for layer inspection.
  await page.evaluate(()=>{window.PaperWorldLab.setPlayerX(0);window.PaperWorldLab.setView('breakdown');window.PaperWorldLab.setProgress(.5);});
  await page.waitForTimeout(180);
  const breakdown=await page.evaluate(()=>window.PaperWorldLab.snapshot());
  assert(breakdown.viewMode==='breakdown','breakdown camera did not activate');
  await page.screenshot({path:'artifacts/demo-lab-transition/breakdown-frame-50.png',fullPage:true});

  assert(errors.length===0,'browser errors: '+JSON.stringify(errors));
  fs.writeFileSync('artifacts/demo-lab-transition/states.json',JSON.stringify({states,streamed,breakdown},null,2));
  console.log(JSON.stringify({version,frames:states.map(s=>s.label),streamedChunk:streamed.activeChunk,drawCalls:e.drawCalls},null,2));
}finally{
  await browser.close();
}
