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
  assert(cold.generatorVersion===4&&cold.noiseBackend==='FastNoiseLite-1.1.1','3D generator missing '+JSON.stringify(cold));

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
  assert(entered.s.interaction?.threeDimensional===true&&entered.s.interaction?.zMovementLocked===false,'renderer still reports row-locked movement '+JSON.stringify(entered.s.interaction));
  await page.keyboard.down('KeyD');await page.waitForTimeout(420);await page.keyboard.up('KeyD');await page.waitForTimeout(80);
  const afterD=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(Math.hypot(afterD.x-before.x,afterD.z-before.z)>.22,'D did not move in horizontal 3D plane '+JSON.stringify({before,afterD}));
  await page.keyboard.down('KeyW');await page.waitForTimeout(420);await page.keyboard.up('KeyW');await page.waitForTimeout(80);
  const afterW=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(Math.hypot(afterW.x-afterD.x,afterW.z-afterD.z)>.22,'W did not move in horizontal 3D plane '+JSON.stringify({afterD,afterW}));
  assert(Math.abs(afterW.z-before.z)>.12,'Z coordinate did not unlock '+JSON.stringify({before,afterW}));

  const flightStart=await page.evaluate(()=>({ok:window.PaperchalkCombat.setFlight(true,{notice:false}),p:window.PaperchalkRuntime.getSnapshot().player}));
  assert(flightStart.ok===true&&flightStart.p.flying===true,'flight mode did not enable '+JSON.stringify(flightStart));
  await page.locator('#threeWorldLayer canvas').focus();
  await page.keyboard.down('Space');await page.waitForTimeout(420);await page.keyboard.up('Space');await page.waitForTimeout(80);
  const flightUp=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(flightUp.y-flightStart.p.y>.20,'flight ascend failed '+JSON.stringify({flightStart,flightUp}));
  await page.evaluate(()=>{window.PaperchalkCombat.setFlight(false,{notice:false});window.PaperchalkMap.reset()});
  await page.waitForFunction(()=>window.PaperchalkRuntime.getSnapshot().player.grounded===true,null,{timeout:2500,polling:50});
  const groundedY=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player.y);
  const jumped=await page.evaluate(()=>window.PaperchalkCombat.jump());assert(jumped===true,'jump rejected');
  await page.waitForFunction(y=>window.PaperchalkRuntime.getSnapshot().player.y>y+.04,groundedY,{timeout:1500});

  const edit=await page.evaluate(()=>{
    const p=window.PaperchalkRuntime.getSnapshot().player,t=window.PaperchalkTerrain,s=t.tileSize;
    const gx=Math.floor(p.x/s),gz=Math.floor(p.z/s+.5),surface=t.surfaceCell(gx,gz);
    const before=t.getVoxel(gx,surface,gz);
    const dug=window.PaperchalkTerrainActions.digCell(gx,surface,gz,{persist:false});
    const placed=window.PaperchalkTerrainActions.placeCell(gx,surface,gz,before,{persist:false});
    return {before,dug,placed,stats:t.stats()};
  });
  assert(edit.before!==0&&edit.dug.changed&&edit.placed.changed,'3D edit failed '+JSON.stringify(edit));
  assert(edit.stats.editedVoxels>=0,'3D edit stats missing '+JSON.stringify(edit.stats));

  const survival=await page.evaluate(()=>{
    const h0=window.PaperchalkHunger.state.current;
    window.PaperchalkHunger.set(50,{persist:false});
    window.PaperchalkHunger.feed(10,{persist:false});
    const h1=window.PaperchalkHunger.state.current;
    const rod=window.PaperchalkInventory.items.find(i=>i?.id==='fishing-rod')||null;
    const p=window.PaperchalkRuntime.getSnapshot().player,t=window.PaperchalkTerrain,s=t.tileSize;
    const gx=Math.floor(p.x/s)+2,gz=Math.floor(p.z/s+.5),gy=t.surfaceCell(gx,gz)+1;
    t.water.setLevel(gx,gy,gz,8,{settle:false});
    const target={x:(gx+.5)*s,y:gy*s+s,z:gz*s};
    const cast=window.PaperchalkFishing.cast(target);
    const fishingState=window.PaperchalkFishing.state.state;
    const reel=window.PaperchalkFishing.reel();
    return {h0,h1,rod,cast,fishingState,reel,end:window.PaperchalkFishing.state.state};
  });
  assert(survival.h1===60,'hunger system failed '+JSON.stringify(survival));
  assert(survival.rod?.action==='fishing-rod','starter fishing rod missing '+JSON.stringify(survival));
  assert(survival.cast===true&&survival.fishingState==='flying','fishing cast state failed '+JSON.stringify(survival));
  assert(survival.reel===true&&survival.end==='idle','early reel did not reset fishing '+JSON.stringify(survival));

  assert(errors.length===0,'runtime errors:\n'+errors.join('\n'));
  console.log('INFINITE_VOXEL_3D_CORE_OK');
}finally{await browser.close()}
