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

  assert(await page.locator('#terrainDigBtn').count()===1&&await page.locator('#terrainPlaceBtn').count()===1,'dig/place controls missing');
  assert(await page.locator('#hungerFill').count()===1&&await page.locator('#staminaFill').count()===1,'survival HUD missing');
  assert(await page.locator('#fishingStatusHud').count()===1,'fishing bite HUD missing');
  const rod=await page.evaluate(()=>window.PaperchalkInventory.items.find(i=>i?.id==='fishing-rod')||null);
  assert(rod?.action==='fishing-rod','starter fishing rod missing');
  const touchControlsDisplay=await page.locator('.combat-controls').evaluate(el=>getComputedStyle(el).display);
  assert(touchControlsDisplay==='none','desktop must hide touch combat controls, got '+touchControlsDisplay);
  await page.evaluate(()=>window.PaperchalkTerrainActions.setTool('place'));
  assert((await page.evaluate(()=>window.PaperchalkTerrainActions.tool))==='place','place tool did not activate');
  await page.evaluate(()=>window.PaperchalkTerrainActions.setTool('dig'));
  assert((await page.evaluate(()=>window.PaperchalkTerrainActions.tool))==='dig','dig tool did not reactivate');
  const mouseTerrainHit=await page.evaluate(()=>{
    for(let y=Math.floor(innerHeight*.38);y<Math.floor(innerHeight*.88);y+=24){
      for(let x=Math.floor(innerWidth*.16);x<Math.floor(innerWidth*.84);x+=24){
        const hit=window.PaperchalkTerrainActions.targetAtScreen(x,y);
        if(hit)return {x,y,distance:hit.distance,gx:hit.gx,gy:hit.gy,gz:hit.gz};
      }
    }
    return null;
  });
  assert(mouseTerrainHit,'PC mouse ray did not hit visible terrain');
  assert(mouseTerrainHit.distance>10,'PC mouse ray still appears capped at 10m: '+JSON.stringify(mouseTerrainHit));

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
  await page.locator('#cameraHeight').evaluate(el=>{el.value='2.5';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForTimeout(50);
  const height=await page.evaluate(()=>window.Paperchalk3D.stats.camera.height);
  assert(Math.abs(height-2.5)<.05,'camera height control failed '+height);
  await page.locator('#cameraControlClose').click();

  await page.locator('#debugToggleBtn').click();
  assert(await page.locator('#debugPanel').evaluate(el=>el.classList.contains('is-open')),'debug panel did not open');
  await page.locator('[data-debug-action="damage1"]').click();
  assert((await page.evaluate(()=>window.PaperchalkHealth.state.hp))===9,'debug health control failed');

  const stageDefault=await page.evaluate(()=>window.Paperchalk3D.stats.stageView);
  assert(stageDefault.enabled===true&&stageDefault.axis==='z','big voxel world must default to side-on paper stage '+JSON.stringify(stageDefault));
  await page.locator('[data-debug-action="stageview"]').click();
  const stageOff=await page.evaluate(()=>window.Paperchalk3D.stats.stageView);
  assert(stageOff.enabled===false,'debug stage-view toggle did not unlock camera '+JSON.stringify(stageOff));
  await page.locator('[data-debug-action="stageview"]').click();
  const stageRestored=await page.evaluate(()=>window.Paperchalk3D.stats.stageView);
  assert(stageRestored.enabled===true&&stageRestored.axis==='z','stage view did not restore '+JSON.stringify(stageRestored));
  await page.locator('#debugCloseBtn').click();

  const handled=await page.evaluate(()=>window.PaperchalkHandleBack());
  assert(handled===true,'native back did not return to menu');
  assert(!(await page.evaluate(()=>window.Paperchalk3D.active)),'3D engine remained active after native back');
  console.log('UI_3D_SMOKE_OK');
}finally{await browser.close()}
