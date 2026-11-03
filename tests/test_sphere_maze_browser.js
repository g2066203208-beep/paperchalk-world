/* Real Chromium validation for the standalone interactive 3D model.
 * Starts only after site/ is served at SPHERE_TEST_BASE.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const origin=process.env.SPHERE_TEST_BASE||'http://127.0.0.1:8138';
(async()=>{
 const browser=await chromium.launch({
  headless:true,args:['--use-gl=angle','--use-angle=swiftshader']
 });
 try{
  fs.mkdirSync('artifacts/sphere-maze',{recursive:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  await page.goto(origin+'/sphere-maze/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.SphericalMazeViewer?.renderCount>5,
   null,{timeout:50000});
  let result=await page.evaluate(()=>{
   const v=window.SphericalMazeViewer;
   return {state:v.state,metrics:v.metrics,day:document.getElementById('day-number').textContent}
  });
  assert.equal(result.metrics.renderer,'webgl2');
  assert.equal(result.state.day,1);
  assert.equal(result.metrics.visibleRooms.length,3);
  assert.ok(result.metrics.visibleRooms.every(n=>n>100&&n<320),
   'section must remove SOME geometry and expose all nested shells');
  assert.ok(result.metrics.closedWalls.every(n=>n>100),
   'must render actual 3D maze walls, not three empty spheres');
  assert.ok(result.metrics.routeLengths.every(n=>n>5),
   'each shell must have a navigable path between its gates');
  assert.equal(result.metrics.gateConnections,2,
   'initial outer->middle and middle->inner docking shafts must be connected');
  await page.screenshot({path:'artifacts/sphere-maze/01-three-shell-cutaway.png'});
  await page.locator('#cutaway').uncheck();
  await page.waitForFunction(()=>
   window.SphericalMazeViewer?.metrics?.visibleRooms?.every(n=>n===320));
  await page.screenshot({path:'artifacts/sphere-maze/02-three-shell-complete.png'});
  await page.locator('#cutaway').check();
  await page.locator('#next-day').click();
  await page.waitForFunction(()=>window.SphericalMazeViewer?.state?.day===2);
  await page.waitForFunction(()=>!document.querySelector('#next-day')?.disabled,
   null,{timeout:8000});
  result=await page.evaluate(()=>({
   state:window.SphericalMazeViewer.state,
   metrics:window.SphericalMazeViewer.metrics
  }));
  assert.equal(result.state.day,2);
  assert.ok(result.metrics.gateConnections>=1,'daily rotation must retain a cross-shell gateway');
  await page.screenshot({path:'artifacts/sphere-maze/03-next-day-rearranged.png'});
  await page.locator('[data-layer="1"]').click();
  assert.equal(await page.locator('.ring-choice.active').getAttribute('data-layer'),'1');
  await page.screenshot({path:'artifacts/sphere-maze/04-middle-shell-isolated.png'});
  await page.locator('[data-layer="-1"]').click();
  await page.locator('#separation').evaluate(el=>{
   el.value='80';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.ok((await page.evaluate(()=>window.SphericalMazeViewer.state.separation))>.75);
  await page.screenshot({path:'artifacts/sphere-maze/05-separated-shells.png'});
  await page.locator('#reset-world').click();
  assert.equal(await page.evaluate(()=>window.SphericalMazeViewer.state.day),1);
  assert.equal(await page.locator('#day-number').innerText(),'DAY 01');
  assert.ok(!errors.length,'browser console errors: '+errors.join('\n'));
  await page.close();
  const mobile=await browser.newPage({viewport:{width:760,height:440},hasTouch:true});
  const mobileErrors=[];
  mobile.on('pageerror',e=>mobileErrors.push(e.message));
  await mobile.goto(origin+'/sphere-maze/',{waitUntil:'load'});
  await mobile.waitForFunction(()=>window.SphericalMazeViewer?.renderCount>5,
   null,{timeout:40000});
  assert.equal(await mobile.locator('canvas').count(),1);
  assert.equal(await mobile.locator('#next-day').isVisible(),true);
  await mobile.screenshot({path:'artifacts/sphere-maze/06-mobile-landscape.png'});
  assert.ok(!mobileErrors.length,'mobile runtime errors: '+mobileErrors.join('\n'));
  await mobile.close();
  console.log('PASS Chromium real WebGL2: 3 nested 3D mazes, connected gates, cutaway, daily rotations, independent layer selection and mobile viewer');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
