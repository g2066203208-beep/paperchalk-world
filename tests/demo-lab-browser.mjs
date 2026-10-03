import process from 'node:process';
import fs from 'node:fs';
import {chromium} from 'playwright-core';

function assert(condition,message){
  if(!condition)throw new Error(message);
}

fs.mkdirSync('artifacts/demo-lab-transition',{recursive:true});
const errors=[];

const browser=await chromium.launch({
  executablePath:process.env.CHROME_PATH,
  headless:true,
  args:[
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader'
  ]
});

try{
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});

  page.on('pageerror',error=>errors.push('PAGE '+String(error)));
  page.on('console',message=>{
    if(message.type()==='error'&&!message.text().includes('Failed to load resource')){
      errors.push('CONSOLE '+message.text());
    }
  });
  page.on('response',response=>{
    if(response.status()>=400&&!response.url().endsWith('/favicon.ico')){
      errors.push('HTTP '+response.status()+' '+response.url());
    }
  });

  await page.goto('http://127.0.0.1:8080/demo-lab/',{waitUntil:'networkidle'});
  await page.waitForSelector('#labViewport canvas',{timeout:10000});
  await page.waitForFunction(()=>window.GreetingCardLab?.ready===true,{timeout:10000});
  await page.waitForTimeout(500);

  const version=await page.locator('#demoLabVersion').textContent();
  assert(version==='DL-2026.10.03.7','wrong visible Demo version: '+version);

  const initial=await page.evaluate(()=>window.GreetingCardLab.snapshot());
  assert(initial.viewMode==='game','Demo must open in actual game view');
  assert(initial.playerReady&&initial.playerVisible,'actual protagonist must be visible');
  assert(initial.coverVisible===true,'city cover must exist at 0%');
  assert(Math.abs(initial.coverAngle)<.001,'city cover must start closed');
  assert(initial.innerVisible===false,'subway inner page must not leak at 0%');
  assert(initial.popupVisible===false,'subway popup must not leak at 0%');
  assert(initial.residentChunks.length===4,'large-world test should keep four neighbour proxies');

  const states=[];
  for(const [label,value] of [['00',0],['25',.25],['50',.5],['75',.75],['100',1]]){
    await page.evaluate(v=>window.GreetingCardLab.setProgress(v),value);
    await page.waitForTimeout(220);

    const snapshot=await page.evaluate(()=>window.GreetingCardLab.snapshot());
    states.push({label,value,snapshot});

    const target='artifacts/demo-lab-transition/greeting-card-'+label+'.png';
    await page.screenshot({path:target,fullPage:true});

    assert(fs.statSync(target).size>30000,'greeting-card screenshot too small: '+target);
    assert(snapshot.playerReady&&snapshot.playerVisible,'protagonist disappeared at '+label+'%');
    assert(snapshot.drawCalls<170,'draw calls unexpectedly high at '+label+'%: '+snapshot.drawCalls);
  }

  const s0=states[0].snapshot;
  const s25=states[1].snapshot;
  const s50=states[2].snapshot;
  const s75=states[3].snapshot;
  const s100=states[4].snapshot;

  assert(s25.coverAngle<-.40&&s25.coverAngle>-.60,'25% must already read as a page turn: '+s25.coverAngle);
  assert(s25.innerVisible===false,'25% must still be the city cover, without destination leakage');

  assert(s50.coverVisible===true,'50% cover must still be visibly turning');
  assert(s50.coverAngle<-1.05&&s50.coverAngle>-1.35,'50% needs a readable mid-flip cover angle: '+s50.coverAngle);
  assert(s50.innerVisible&&s50.popupVisible,'50% must reveal the greeting-card interior');
  assert(s50.wallAngles.some(angle=>angle<-1.2),'50% subway walls should still be mostly folded');
  assert(s50.wallAngles.some(angle=>angle>-1.52),'50% must show the first popup wall beginning to rise');

  assert(s75.coverVisible===false,'75% city cover should have cleared the game view');
  assert(s75.innerVisible&&s75.popupVisible,'75% inner card must be established');
  assert(s75.wallAngles.every(angle=>Math.abs(angle)<.15),'75% popup walls should be nearly upright');

  assert(s100.coverVisible===false,'100% cover must stay out of the game view');
  assert(s100.innerVisible&&s100.popupVisible,'100% inner card must be fully present');
  assert(s100.wallAngles.every(angle=>Math.abs(angle)<.02),'100% walls must settle upright');
  assert(s100.columnAngles.every(angle=>Math.abs(angle)<.02),'100% columns must settle upright');
  assert(s100.propAngles.every(angle=>Math.abs(angle)<.02),'100% props must settle upright');
  assert(s100.lampIntensity[2]>1&&s100.lampIntensity[0]>1,'100% warm station lights must be on');

  // Large world proof: the expensive greeting-card rig follows only the active
  // chunk while neighbouring world cells remain instanced proxies.
  await page.evaluate(()=>{
    window.GreetingCardLab.setProgress(0);
    window.GreetingCardLab.setPlayerX(37);
  });
  await page.waitForTimeout(220);

  const streamed=await page.evaluate(()=>window.GreetingCardLab.snapshot());
  assert(streamed.activeChunk===2,'greeting-card cell should stream to chunk 2: '+JSON.stringify(streamed));
  assert(streamed.residentChunks.length===4,'only four neighbour proxy chunks should remain resident');
  assert(streamed.drawCalls<170,'streamed large-world view should keep draw calls bounded');

  await page.screenshot({
    path:'artifacts/demo-lab-transition/greeting-card-large-world-chunk-2.png',
    fullPage:true
  });

  // Keep one high-angle inspection shot without mistaking it for game view.
  await page.evaluate(()=>{
    window.GreetingCardLab.setPlayerX(0);
    window.GreetingCardLab.setView('breakdown');
    window.GreetingCardLab.setProgress(.5);
  });
  await page.waitForTimeout(180);

  const breakdown=await page.evaluate(()=>window.GreetingCardLab.snapshot());
  assert(breakdown.viewMode==='breakdown','breakdown camera did not activate');

  await page.screenshot({
    path:'artifacts/demo-lab-transition/greeting-card-breakdown-50.png',
    fullPage:true
  });

  assert(errors.length===0,'browser errors: '+JSON.stringify(errors));

  fs.writeFileSync(
    'artifacts/demo-lab-transition/states.json',
    JSON.stringify({states,streamed,breakdown},null,2)
  );

  console.log(JSON.stringify({
    version,
    frames:states.map(state=>state.label),
    streamedChunk:streamed.activeChunk,
    drawCalls:s100.drawCalls
  },null,2));
}finally{
  await browser.close();
}
