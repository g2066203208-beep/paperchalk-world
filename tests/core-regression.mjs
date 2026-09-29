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
  assert(cold.generatorVersion===5&&cold.noiseBackend==='FastNoiseLite-1.1.1','3D generator missing '+JSON.stringify(cold));
  assert(cold.analyticOcean===true&&cold.biomeGenerator?.version===2,'macro world/ocean generator missing '+JSON.stringify(cold));

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
  assert(Math.abs(before.z)<1e-6,'player is not centered on interaction row '+JSON.stringify(before));
  await page.keyboard.down('KeyD');await page.waitForTimeout(450);await page.keyboard.up('KeyD');await page.waitForTimeout(100);
  const afterW=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(afterW.x-before.x>.25,'D did not move on X '+JSON.stringify({before,afterW}));
  assert(Math.abs(afterW.z)<1e-6,'Z movement is not locked '+JSON.stringify(afterW));

  await page.waitForFunction(()=>window.PaperchalkRuntime.getSnapshot().player.grounded===true,null,{timeout:5000});
  const groundedY=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player.y);
  const jumped=await page.evaluate(()=>window.PaperchalkCombat.jump());assert(jumped===true,'jump rejected');
  await page.waitForFunction(y=>window.PaperchalkRuntime.getSnapshot().player.y>y+.04,groundedY,{timeout:1500});

  const edit=await page.evaluate(()=>{
    const p=window.PaperchalkRuntime.getSnapshot().player,t=window.PaperchalkTerrain;
    const gx=Math.floor(p.x),gz=t.stats().interactionRowZ,surface=Math.floor(t.highestGroundY(p.x,gz)/t.tileSize)-1;
    const before=t.getVoxel(gx,surface,gz);
    const dug=window.PaperchalkTerrainActions.digCell(gx,surface,gz,{persist:false});
    const placed=window.PaperchalkTerrainActions.placeCell(gx,surface,gz,before,{persist:false});
    return {before,dug,placed,stats:t.stats()};
  });
  assert(edit.before!==0&&edit.dug.changed&&edit.placed.changed,'3D edit failed '+JSON.stringify(edit));
  assert(edit.stats.editedVoxels>=0,'3D edit stats missing '+JSON.stringify(edit.stats));

  const foundation=await page.evaluate(()=>{
    const h0=window.PaperchalkHunger.state.current;
    window.PaperchalkHunger.set(50,{persist:false});
    window.PaperchalkHunger.feed(10,{persist:false});
    const h1=window.PaperchalkHunger.state.current;
    const rod=window.PaperchalkInventory.items.find(i=>i?.id==='fishing-rod')||null;
    const fish=window.PaperchalkFishEcology.stats;

    const WaterWorld=window.PaperchalkTerrainRuntime.WaterWorld;
    const floors=new Map([['0,0',0],['10,0',-5]]);
    const fake={
      tileSize:1,chunkSize:16,
      isSolidPeek(gx,gy,gz){
        const own=floors.get(gx+','+gz);
        if(own!=null)return gy<=own;
        if(Math.abs(gx)<=1&&Math.abs(gz)<=1)return gy<=3;
        if(Math.abs(gx-10)<=1&&Math.abs(gz)<=1)return gy<=0;
        return gy<=6;
      }
    };
    const water=new WaterWorld(fake);
    water.setLevel(0,1,0,8,{settle:false});
    water.setLevel(10,-4,0,8,{settle:false});
    water.requestSettle();
    const settled=water.settleAll();
    return {
      h0,h1,rod,fish,settled,
      high:water.getLevel(0,1,0),
      low:water.getLevel(10,-4,0),
      flowModel:water.stats().flowModel
    };
  });
  assert(foundation.h1===60,'hunger system failed '+JSON.stringify(foundation));
  assert(foundation.rod===null,'fishing rod should not be a starter item '+JSON.stringify(foundation));
  assert(foundation.fish?.enabled===false&&foundation.fish.active===0,'fish ecology must be disabled '+JSON.stringify(foundation));
  assert(foundation.settled.bodies===2&&foundation.high===8&&foundation.low===8,'disconnected ponds exchanged water '+JSON.stringify(foundation));
  assert(foundation.flowModel==='connected-body-priority-flood-v5','wrong water solver '+JSON.stringify(foundation));

  assert(errors.length===0,'runtime errors:\n'+errors.join('\n'));
  console.log('INFINITE_VOXEL_3D_CORE_OK');
}finally{await browser.close()}
