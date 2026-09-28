import process from 'node:process';
import {chromium} from 'playwright-core';
function assert(c,m){if(!c)throw new Error(m)}
const errors=[];
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror',e=>errors.push('PAGE '+String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
  await page.goto('http://127.0.0.1:8080/?ci=voxel3d-core',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.PaperchalkRuntime&&!!window.PaperchalkTerrainActions,{timeout:7000});
  const cold=await page.evaluate(()=>window.PaperchalkTerrainActions.stats);
  assert(cold.dimensions===3&&cold.infinite===true&&cold.chunkSize===16,'3D terrain config wrong '+JSON.stringify(cold));
  assert(cold.generatorVersion===3&&cold.noiseBackend==='FastNoiseLite-1.1.1','3D generator missing '+JSON.stringify(cold));

  await page.locator('#authBtn').click();await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('voxel3d_core');await page.locator('#regName').fill('Voxel');await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:15000});
  await page.waitForTimeout(1400);
  const entered=await page.evaluate(()=>({p:window.PaperchalkRuntime.getSnapshot().player,s:window.Paperchalk3D.stats}));
  assert(entered.s.worldMode==='infinite-voxel-3d','wrong world mode '+JSON.stringify(entered.s));
  assert(entered.s.terrainMode==='streamed-3d-voxel-chunks','wrong terrain mode '+JSON.stringify(entered.s));
  assert(entered.s.terrain?.dimensions===3&&entered.s.terrain?.infinite===true,'terrain is not infinite 3D '+JSON.stringify(entered.s.terrain));

  const before={...entered.p};
  await page.keyboard.down('KeyW');await page.waitForTimeout(450);await page.keyboard.up('KeyW');await page.waitForTimeout(100);
  const afterW=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(Math.hypot(afterW.x-before.x,afterW.z-before.z)>.25,'W did not move across X/Z '+JSON.stringify({before,afterW}));

  await page.waitForFunction(()=>window.PaperchalkRuntime.getSnapshot().player.grounded===true,null,{timeout:5000});
  const jumped=await page.evaluate(()=>window.PaperchalkCombat.jump());assert(jumped===true,'jump rejected');
  await page.waitForFunction(y=>window.PaperchalkRuntime.getSnapshot().player.y>y+.04,afterW.y,{timeout:1500});

  const edit=await page.evaluate(()=>{
    const p=window.PaperchalkRuntime.getSnapshot().player,t=window.PaperchalkTerrain;
    const gx=Math.floor(p.x),gz=Math.floor(p.z),surface=Math.floor(t.highestGroundY(p.x,p.z)/t.tileSize)-1;
    const before=t.getVoxel(gx,surface,gz);
    const dug=window.PaperchalkTerrainActions.digCell(gx,surface,gz,{persist:false});
    const placed=window.PaperchalkTerrainActions.placeCell(gx,surface,gz,before,{persist:false});
    return {before,dug,placed,stats:t.stats()};
  });
  assert(edit.before!==0&&edit.dug.changed&&edit.placed.changed,'3D edit failed '+JSON.stringify(edit));
  assert(edit.stats.editedVoxels>=0,'3D edit stats missing '+JSON.stringify(edit.stats));

  assert(errors.length===0,'runtime errors:\n'+errors.join('\n'));
  console.log('INFINITE_VOXEL_3D_CORE_OK');
}finally{await browser.close()}
