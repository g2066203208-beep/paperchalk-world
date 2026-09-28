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
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>errors.push('PAGE '+String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
  page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});
  page.on('requestfailed',r=>errors.push('REQUEST '+r.url()));

  await page.goto('http://127.0.0.1:8080/?ci=core-paper-stage',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.PaperchalkRuntime&&!!window.Paperchalk3D&&!!window.PaperchalkTerrainActions,{timeout:5000});

  const cold=await page.evaluate(()=>({
    runtime:window.PaperchalkRuntime.getSnapshot(),
    three:{ready:window.Paperchalk3D.ready,active:window.Paperchalk3D.active},
    terrain:window.PaperchalkTerrainActions.stats
  }));
  assert(!cold.runtime.active&&!cold.three.active&&!cold.three.ready,'renderer must stay cold on menu '+JSON.stringify(cold));
  assert(cold.terrain.tileSize===.25&&cold.terrain.chunkSize===64,'single-layer terrain configuration wrong '+JSON.stringify(cold.terrain));

  await page.locator('#authBtn').click();
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('paper_core');
  await page.locator('#regName').fill('纸片旅人');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:12000});
  await page.waitForFunction(()=>window.PaperchalkRuntime.getSnapshot().player.grounded===true,null,{timeout:3500});
  await page.waitForTimeout(100);

  const entered=await page.evaluate(()=>({
    runtime:window.PaperchalkRuntime.getSnapshot(),
    three:window.Paperchalk3D.stats
  }));
  assert(entered.three.worldMode==='paper-stage-2.5d','wrong world mode '+JSON.stringify(entered.three));
  assert(entered.three.terrainMode==='single-layer-voxel','terrain is not single-layer voxel '+JSON.stringify(entered.three));
  assert(entered.three.entityMode==='2d-textured-planes','entities are not paper planes '+JSON.stringify(entered.three));
  assert(entered.three.playerGeometry==='PlaneGeometry','player is not a flat paper entity '+JSON.stringify(entered.three));
  assert(entered.three.terrain.visibleChunks>0&&entered.three.terrain.renderedSolidTiles>0,'terrain chunks are not rendered '+JSON.stringify(entered.three.terrain));

  const before=entered.runtime.player;
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(420);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(80);
  const afterD=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(afterD.x-before.x>.25,'D did not move right on the 2D gameplay plane '+JSON.stringify({before,afterD}));
  assert(Math.abs(afterD.z-before.z)<1e-6,'gameplay must not move through Z '+JSON.stringify({before,afterD}));

  const beforeW={...afterD};
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(220);
  await page.keyboard.up('KeyW');
  const afterW=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(Math.abs(afterW.x-beforeW.x)<.03&&Math.abs(afterW.z-beforeW.z)<1e-6,'W must not create free 3D movement '+JSON.stringify({beforeW,afterW}));

  const jumpStarted=await page.evaluate(()=>window.PaperchalkCombat.jump());
  assert(jumpStarted===true,'jump was rejected while grounded');
  await page.waitForFunction(()=>window.PaperchalkRuntime.getSnapshot().player.grounded===false,null,{timeout:800});
  const air=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(air.y>afterW.y,'jump did not move upward on Y '+JSON.stringify({afterW,air}));

  await page.waitForFunction(()=>window.PaperchalkRuntime.getSnapshot().player.grounded===true,null,{timeout:3500});

  const dig=await page.evaluate(()=>{
    const p=window.PaperchalkRuntime.getSnapshot().player;
    const t=window.PaperchalkTerrain;
    const s=t.tileSize;
    const base=t.worldToCell(p.x,p.y-1.05);
    for(let radius=0;radius<=12;radius++){
      for(let dx=-radius;dx<=radius;dx++){
        for(let dy=-radius;dy<=0;dy++){
          const gx=base.gx+dx,gy=base.gy+dy;
          if(!t.isSolid(gx,gy))continue;
          const c=t.cellCenter(gx,gy);
          if(Math.hypot(c.x-p.x,c.y-p.y)>4)continue;
          const result=window.PaperchalkTerrainActions.dig(c.x,c.y);
          if(result.changed)return {result,beforeTile:result.previous,point:c,stats:window.PaperchalkTerrainActions.stats};
        }
      }
    }
    return null;
  });
  assert(dig?.result?.changed,'could not dig a reachable terrain tile '+JSON.stringify(dig));
  assert(dig.stats.editedTiles>=1,'terrain delta was not recorded '+JSON.stringify(dig));

  const removed=await page.evaluate(({x,y})=>{
    const t=window.PaperchalkTerrain,c=t.worldToCell(x,y);
    return t.getTile(c.gx,c.gy);
  },dig.point);
  assert(removed===0,'dug tile is not AIR '+removed);

  await page.evaluate(()=>window.PaperchalkHealth.damage(1));
  await page.waitForTimeout(80);
  const hp9=await page.evaluate(()=>({hp:window.PaperchalkHealth.state.hp,bar:window.Paperchalk3D.stats.health}));
  assert(hp9.hp===9&&hp9.bar?.value===9,'world-space health bar did not follow runtime '+JSON.stringify(hp9));

  const saved=await page.evaluate(()=>{
    window.PaperchalkSaveNow();
    const key=window.PaperchalkSaveDiagnostics.keyFor('paper_core');
    return JSON.parse(localStorage.getItem(key)||'null');
  });
  assert(saved?.schemaVersion===5,'paper-stage save schema is not v5 '+JSON.stringify(saved));
  assert(Array.isArray(saved.terrainEdits)&&saved.terrainEdits.length>=1,'terrain edits were not persisted '+JSON.stringify(saved.terrainEdits));
  assert(Number.isFinite(saved.player.y)&&Number.isFinite(saved.player.x),'XY player state missing '+JSON.stringify(saved.player));
  const savedPlayer={...saved.player};

  await page.locator('#worldMenuBtn').click();
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.PaperchalkRuntime&&!!window.Paperchalk3D,{timeout:5000});
  await page.locator('#continueBtn').click();
  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:12000});
  await page.waitForTimeout(180);

  const restored=await page.evaluate(({x,y})=>{
    const t=window.PaperchalkTerrain,c=t.worldToCell(x,y);
    return {
      p:window.PaperchalkRuntime.getSnapshot().player,
      hp:window.PaperchalkHealth.state.hp,
      tile:t.getTile(c.gx,c.gy),
      edits:window.PaperchalkTerrainActions.stats.editedTiles
    };
  },dig.point);
  assert(Math.abs(restored.p.x-savedPlayer.x)<.15,'X position did not restore '+JSON.stringify({savedPlayer,restored}));
  assert(restored.hp===9,'health did not restore '+JSON.stringify(restored));
  assert(restored.tile===0&&restored.edits>=1,'dug terrain did not restore after reload '+JSON.stringify(restored));

  assert(errors.length===0,'runtime errors:\n'+errors.join('\n'));
  console.log(JSON.stringify({ok:true,entered:entered.three,afterD,air,dig,saved,restored},null,2));
}finally{await browser.close()}
