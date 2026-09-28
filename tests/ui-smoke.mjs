import process from 'node:process';
import {chromium} from 'playwright-core';
function assert(c,m){if(!c)throw new Error(m)}
const browser=await chromium.launch({
  executablePath:process.env.CHROME_PATH,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto('http://127.0.0.1:4173/?ci=ui-3d',{waitUntil:'networkidle'});
  assert(await page.locator('#pageMenu').evaluate(el=>el.classList.contains('active')),'menu not active');

  await page.locator('#settingsBtn').click();
  assert(await page.locator('#pageSettings').evaluate(el=>el.classList.contains('active')),'settings did not open');
  await page.locator('#settingTimeScale').selectOption('2');
  await page.locator('#pageSettings [data-back="menu"]').click();
  assert(await page.locator('#pageMenu').evaluate(el=>el.classList.contains('active')),'menu did not restore');

  await page.locator('#authBtn').click();
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('three_ui');
  await page.locator('#regName').fill('UI');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:12000});

  await page.locator('#backpackBtn').click();
  assert(await page.locator('#backpackOverlay').evaluate(el=>el.classList.contains('is-open')),'backpack did not open');
  assert(await page.locator('.inventory-slot').count()===20,'inventory must have 20 slots');
  await page.locator('#backpackClose').click();

  await page.locator('#worldMapBtn').click();
  assert(await page.locator('#worldMapOverlay').evaluate(el=>el.classList.contains('is-open')),'world map did not open');
  await page.locator('#worldMapClose').click();

  await page.locator('#cameraControlBtn').click();
  assert(await page.locator('#cameraControlPanel').evaluate(el=>el.classList.contains('is-open')),'3D camera panel did not open');
  await page.locator('#cameraPitch').evaluate(el=>{el.value='35';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForTimeout(50);
  const pitch=await page.evaluate(()=>window.Paperchalk3D.stats.camera.pitch);
  assert(Math.abs(pitch-35*Math.PI/180)<.02,'camera panel did not control 3D camera '+pitch);
  await page.locator('#cameraControlClose').click();

  await page.locator('#debugToggleBtn').click();
  assert(await page.locator('#debugPanel').evaluate(el=>el.classList.contains('is-open')),'debug panel did not open');
  await page.locator('[data-debug-action="damage1"]').click();
  assert((await page.evaluate(()=>window.PaperchalkHealth.state.hp))===9,'debug health control failed');

  const stageDefault=await page.evaluate(()=>window.Paperchalk3D.stats.stageView);
  assert(stageDefault.enabled&&stageDefault.axis==='z','paper-stage view must default to fixed Z axis '+JSON.stringify(stageDefault));
  await page.locator('[data-debug-action="stageview"]').click();
  const stageOff=await page.evaluate(()=>window.Paperchalk3D.stats.stageView);
  assert(stageOff.enabled===false,'debug stage-view toggle did not unlock camera '+JSON.stringify(stageOff));
  await page.locator('[data-debug-action="stageview"]').click();
  await page.locator('[data-debug-action="stageaxis"]').click();
  const stageX=await page.evaluate(()=>window.Paperchalk3D.stats.stageView);
  assert(stageX.enabled===true&&stageX.axis==='x','debug stage-axis toggle did not switch to X '+JSON.stringify(stageX));
  await page.locator('[data-debug-action="stageaxis"]').click();
  const stageZ=await page.evaluate(()=>window.Paperchalk3D.stats.stageView);
  assert(stageZ.axis==='z','debug stage-axis toggle did not return to Z '+JSON.stringify(stageZ));
  await page.locator('#debugCloseBtn').click();

  const handled=await page.evaluate(()=>window.PaperchalkHandleBack());
  assert(handled===true,'native back did not return to menu');
  assert(!(await page.evaluate(()=>window.Paperchalk3D.active)),'3D engine remained active after native back');
  console.log('UI_3D_SMOKE_OK');
}finally{await browser.close()}
