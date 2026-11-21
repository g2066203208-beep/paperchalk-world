import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const base='http://127.0.0.1:4173/card-battle/slots-daggers/coin-lab/index.html';
const out=path.resolve('artifacts/work-coin-3d-study');
fs.mkdirSync(out,{recursive:true});
const actualHash=execFileSync('git',['hash-object','site/card-battle/slots-daggers/coin-art.js'],{encoding:'utf8'}).trim();
const expectedHash='244779b322b33559c31aa1ae11bf6f0f7d15fe0c';
if(actualHash!==expectedHash)throw Error('Source WORK coin-art.js changed: '+actualHash);
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const results=[];
for(const tc of [
  {name:'desktop-1440x900',viewport:{width:1440,height:900}},
  {name:'mobile-portrait-390x844',viewport:{width:390,height:844}}
]){
 const context=await b.newContext({viewport:tc.viewport,deviceScaleFactor:1,recordVideo:{dir:out,size:tc.viewport}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push('console '+m.text());});
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.WorkCoin3DQA?.state()?.sprite?.width===129,{timeout:18000});
 await page.waitForTimeout(480);
 const st=await page.evaluate(()=>WorkCoin3DQA.state());
 if(st.sourceParity.differentChannels!==0 || st.vertices!==60 || st.polygons!==52 || st.triangles!==116 || st.dieSides!==2 || st.normal.normalSamples!==2304)throw Error('not the exact original WORK coin shader / mesh: '+JSON.stringify(st));
 if(st.sprite.nonZero<4000)throw Error('the actual golden coin rendered blank '+JSON.stringify(st.sprite));
 await page.screenshot({path:path.join(out,tc.name+'-01-shader-mesh-normal-inspection.png'),fullPage:true});
 await page.locator('#play').click(); // freeze to inspect exact views
 for(const [name,angle] of [
   ['02-coin-obverse',[-12,-6,12]],
   ['03-coin-edge',[88,10,14]],
   ['04-coin-reverse',[169,-20,17]]
 ]){
   await page.evaluate('a=>WorkCoin3DQA.setAngles(...a)',angle);
   await page.waitForTimeout(110);
   const sprite=await page.evaluate(()=>WorkCoin3DQA.state().sprite);
   if(sprite.nonZero<300)throw Error(name+' invisible rotated model '+JSON.stringify(sprite));
   await page.locator('#hero').screenshot({path:path.join(out,tc.name+'-'+name+'.png')});
 }
 await page.locator('#res').selectOption('1');
 await page.waitForFunction(()=>WorkCoin3DQA.state().sprite?.width===43,{timeout:6000});
 await page.screenshot({path:path.join(out,tc.name+'-05-native-43px-work-comparison.png')});
 await page.locator('#res').selectOption('4');
 await page.waitForFunction(()=>WorkCoin3DQA.state().sprite?.width===172,{timeout:6000});
 await page.screenshot({path:path.join(out,tc.name+'-06-original-shader-high-sampling-172px.png')});
 await page.locator('#flip').click();
 await page.locator('#eject').click();
 await page.waitForTimeout(600);
 const after=await page.evaluate(()=>WorkCoin3DQA.state());
 if(after.motionCoinCount<11 || after.motionTime<.5 || after.sprite.width!==172)throw Error('original fixed step physics/re-render failed '+JSON.stringify(after));
 if(errors.length)throw Error('browser errors '+JSON.stringify(errors));
 results.push({screen:tc.name,sourceHash:actualHash,initial:st,after,errors});
 console.log('PASS',tc.name,JSON.stringify({parity:st.sourceParity.differentChannels,vertices:st.vertices,triangles:st.triangles,sprite:after.sprite.width,physicsBodies:after.motionCoinCount}));
 await context.close();
}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
await b.close();
