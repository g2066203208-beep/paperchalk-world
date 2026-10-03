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
  page.on('console',message=>{if(message.type()==='error')errors.push('CONSOLE '+message.text());});
  page.on('response',response=>{
    if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))errors.push('HTTP '+response.status()+' '+response.url());
  });

  await page.goto('http://127.0.0.1:8080/demo-lab/',{waitUntil:'networkidle'});
  await page.waitForSelector('#labViewport canvas',{timeout:10000});
  await page.waitForFunction(()=>window.PaperStageLab?.ready===true,{timeout:10000});
  await page.waitForTimeout(500);

  const version=await page.locator('#demoLabVersion').textContent();
  assert(version==='DL-2026.10.03.2','wrong visible Demo Lab version: '+version);

  const states=[];
  for(const [label,value] of [['00',0],['25',.25],['50',.5],['75',.75],['100',1]]){
    await page.evaluate(v=>window.PaperStageLab.setProgress(v),value);
    await page.waitForTimeout(180);
    const snapshot=await page.evaluate(()=>window.PaperStageLab.snapshot());
    states.push({label,value,snapshot});
    const target='artifacts/demo-lab-transition/frame-'+label+'.png';
    await page.screenshot({path:target,fullPage:true});
    assert(fs.statSync(target).size>25000,'transition screenshot too small: '+target);
  }

  const start=states[0].snapshot;
  const middle=states[2].snapshot;
  const end=states[4].snapshot;

  assert(Math.abs(start.pageAngle)<.001,'street page must begin flat');
  assert(start.wallAngles.every(angle=>angle<-1.45),'subway walls must begin folded onto deck');
  assert(start.fixtureAngles.every(angle=>angle<-1.45),'fixtures must begin folded onto deck');
  assert(start.lampIntensity.every(value=>value<.05),'station lights must begin dark');

  assert(middle.pageAngle<-1.1,'main street page must be visibly turning by midpoint');
  assert(middle.wallAngles[2]>middle.wallAngles[0],'centre wall should lead outer wall during pop-up');
  assert(middle.wallAngles.some(angle>-1.1),'at least one wall must be rising at midpoint');

  assert(end.pageAngle<-1.6,'street page must finish below the stage opening');
  assert(end.wallAngles.every(angle=>Math.abs(angle)<.08),'all wall cards must settle upright');
  assert(end.fixtureAngles.every(angle=>Math.abs(angle)<.12),'all fixtures must settle upright');
  assert(end.lampIntensity[2]>1&&end.lampIntensity[0]>1,'practical lamps must finish lit');
  assert(errors.length===0,'browser errors: '+JSON.stringify(errors));

  fs.writeFileSync('artifacts/demo-lab-transition/states.json',JSON.stringify(states,null,2));
  console.log(JSON.stringify({version,frames:states.map(s=>s.label),end},null,2));
}finally{
  await browser.close();
}
