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
  await page.waitForFunction(()=>window.PaperStageLab?.ready===true,{timeout:10000});
  await page.waitForTimeout(500);

  const version=await page.locator('#demoLabVersion').textContent();
  assert(version==='DL-2026.10.03.4','wrong visible Demo Lab version: '+version);

  const initial=await page.evaluate(()=>window.PaperStageLab.snapshot());
  assert(initial.viewMode==='game','lab must open in gameplay view');
  assert(initial.playerReady&&initial.playerVisible,'actual protagonist must be visible in gameplay proof');
  assert(Math.abs(initial.playerAnchorWorldX-initial.playerX)<.001,'player threshold must stay under protagonist in world space');
  assert(initial.residentChunks.length===4,'centre cell should keep four neighbouring proxy cells resident');

  const states=[];
  for(const [label,value] of [['00',0],['25',.25],['50',.5],['75',.75],['100',1]]){
    await page.evaluate(v=>window.PaperStageLab.setProgress(v),value);
    await page.waitForTimeout(180);
    const snapshot=await page.evaluate(()=>window.PaperStageLab.snapshot());
    states.push({label,value,snapshot});
    const target='artifacts/demo-lab-transition/game-frame-'+label+'.png';
    await page.screenshot({path:target,fullPage:true});
    assert(fs.statSync(target).size>25000,'game-view transition screenshot too small: '+target);
  }

  const start=states[0].snapshot,middle=states[2].snapshot,end=states[4].snapshot;
  assert(Math.abs(start.pageAngle)<.001,'street page must begin flat');
  assert(start.fasciaOpen===0,'gameplay street fascia must begin closed');
  assert(start.wallAngles.every(angle=>angle<-1.45),'subway walls must begin folded onto deck');
  assert(start.fixtureAngles.every(angle=>angle<-1.45),'fixtures must begin folded onto deck');
  assert(start.lampIntensity.every(value=>value<.05),'station lights must begin dark');

  assert(middle.pageAngle<-1.0,'main street page must be visibly turning by midpoint');
  assert(middle.bifoldAngle>.25,'secondary street score must counter-fold by midpoint');
  assert(middle.wallAngles[2]>middle.wallAngles[0],'centre wall should lead outer wall during pop-up');
  assert(middle.wallAngles.some(angle=>angle>-1.1),'at least one wall must be rising at midpoint');

  assert(end.pageAngle<-3.0,'street page front half must stow fully under the stage');
  assert(end.bifoldAngle>2.9,'street page rear half must counter-fold into the stowed stack');
  assert(end.wallAngles.every(angle=>Math.abs(angle)<.08),'all wall cards must settle upright');
  assert(end.fixtureAngles.every(angle=>Math.abs(angle)<.12),'all fixtures must settle upright');
  assert(end.lampIntensity[2]>1&&end.lampIntensity[0]>1,'practical lamps must finish lit');
  assert(end.fasciaOpen>.99,'street fascia must finish fully open');
  assert(end.playerReady&&end.playerVisible,'protagonist must remain visible after the stage transformation');

  // Large-world proof: move almost thirty world units. Only the active
  // high-detail cell moves with the player; four neighbours remain proxies.
  await page.evaluate(()=>{window.PaperStageLab.setProgress(0);window.PaperStageLab.setPlayerX(29.4);});
  await page.waitForTimeout(220);
  const streamed=await page.evaluate(()=>window.PaperStageLab.snapshot());
  assert(streamed.activeChunk===2,'high-detail window should stream to chunk 2: '+JSON.stringify(streamed));
  assert(Math.abs(streamed.playerAnchorWorldX-streamed.playerX)<.001,'streamed threshold lost player alignment');
  assert(streamed.residentChunks.length===4,'streamed world should keep exactly four neighbouring proxies');
  await page.screenshot({path:'artifacts/demo-lab-transition/game-large-world-chunk-2.png',fullPage:true});

  // Keep one inspection shot too, so geometry/debug pivots can be reviewed
  // without confusing that view with the actual gameplay composition.
  await page.evaluate(()=>{window.PaperStageLab.setPlayerX(0);window.PaperStageLab.setView('mechanism');window.PaperStageLab.setProgress(.5);});
  await page.waitForTimeout(180);
  const mechanism=await page.evaluate(()=>window.PaperStageLab.snapshot());
  assert(mechanism.viewMode==='mechanism','mechanism inspection view failed');
  await page.screenshot({path:'artifacts/demo-lab-transition/mechanism-frame-50.png',fullPage:true});

  assert(errors.length===0,'browser errors: '+JSON.stringify(errors));
  fs.writeFileSync('artifacts/demo-lab-transition/states.json',JSON.stringify({states,streamed,mechanism},null,2));
  console.log(JSON.stringify({version,gameFrames:states.map(s=>s.label),streamedChunk:streamed.activeChunk},null,2));
}finally{
  await browser.close();
}
