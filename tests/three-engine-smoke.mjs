import process from 'node:process';
import {chromium} from 'playwright-core';
function assert(c,m){if(!c)throw new Error(m)}
const errors=[];
const browser=await chromium.launch({
  executablePath:process.env.CHROME_PATH,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
try{
  const page=await browser.newPage({viewport:{width:1365,height:768}});
  page.on('pageerror',e=>errors.push('PAGE '+String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
  page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
  await page.goto('http://127.0.0.1:8080/?ci=three-production',{waitUntil:'networkidle'});
  await page.locator('#authBtn').click();
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('three_engine');
  await page.locator('#regName').fill('Engine');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:12000});
  await page.waitForTimeout(350);

  const initial=await page.evaluate(()=>({
    stats:window.Paperchalk3D.stats,
    snap:window.Paperchalk3D.snapshot(),
    resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('/vendor/three/')).map(e=>e.name),
    canvas:document.querySelector('#threeWorldLayer canvas')?.className||''
  }));
  assert(initial.stats.renderer==='WebGLRenderer','renderer is not WebGLRenderer '+JSON.stringify(initial.stats));
  assert(initial.stats.drawCalls>10&&initial.stats.triangles>100,'3D scene is too empty/not rendered '+JSON.stringify(initial.stats));
  assert(initial.stats.sceneChildren>=20,'procedural 3D village not constructed '+JSON.stringify(initial.stats));
  assert(initial.resources.some(x=>x.includes('three.module.js'))&&initial.resources.some(x=>x.includes('three.core.js')),'Three module/core pair missing '+JSON.stringify(initial.resources));
  assert(initial.canvas==='three-world-canvas','production 3D canvas class missing');
  assert(initial.stats.health?.cells===10&&initial.stats.health?.tail===true,'stitched 9-cell + tail health bar missing '+JSON.stringify(initial.stats.health));

  const beforeCam=initial.stats.camera;
  const canvas=page.locator('#threeWorldLayer canvas');
  const box=await canvas.boundingBox();
  assert(box,'canvas bounds unavailable');
  await page.mouse.move(box.x+box.width*.55,box.y+box.height*.45);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.70,box.y+box.height*.52,{steps:8});
  await page.mouse.up();
  await page.waitForTimeout(80);
  const afterCam=await page.evaluate(()=>window.Paperchalk3D.stats.camera);
  assert(Math.abs(afterCam.yaw-beforeCam.yaw)>.15,'pointer orbit did not change yaw '+JSON.stringify({beforeCam,afterCam}));

  await page.evaluate(()=>window.Paperchalk3D.setDebugColliders(true));
  const debugOn=await page.evaluate(()=>window.Paperchalk3D.stats.debugColliders);
  assert(debugOn===true,'3D collider debug helpers did not enable');

  await page.evaluate(()=>window.PaperchalkHealth.set(5));
  await page.waitForTimeout(90);
  const health5=await page.evaluate(()=>window.Paperchalk3D.stats.health);
  assert(health5.value===5&&health5.animating>0,'3D damage animation did not start '+JSON.stringify(health5));
  await page.waitForFunction(()=>window.Paperchalk3D?.stats?.health?.animating===0,null,{timeout:2500});
  const healthSettled=await page.evaluate(()=>window.Paperchalk3D.stats.health);
  assert(healthSettled.value===5&&healthSettled.animating===0,'3D health animation did not settle '+JSON.stringify(healthSettled));

  await page.evaluate(()=>window.PaperchalkHealth.set(8));
  await page.waitForTimeout(70);
  const healing=await page.evaluate(()=>window.Paperchalk3D.stats.health);
  assert(healing.value===8&&healing.animating>0,'3D heal animation did not start '+JSON.stringify(healing));

  await page.locator('#worldMenuBtn').click();
  await page.waitForTimeout(100);
  const off=await page.evaluate(()=>({active:window.Paperchalk3D.active,loop:window.Paperchalk3D.stats.loopActive,hidden:document.getElementById('threeWorldLayer').hidden}));
  assert(!off.active&&!off.loop&&off.hidden,'3D renderer did not suspend on menu '+JSON.stringify(off));
  assert(errors.length===0,'3D runtime errors:\n'+errors.join('\n'));
  console.log(JSON.stringify({ok:true,initial:initial.stats,beforeCam,afterCam,health5,healing,off},null,2));
}finally{await browser.close()}
