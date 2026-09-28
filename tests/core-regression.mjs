import process from 'node:process';
import {chromium} from 'playwright-core';

function assert(condition,message){if(!condition)throw new Error(message)}
const errors=[];
const browser=await chromium.launch({
  executablePath:process.env.CHROME_PATH,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});

try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',error=>errors.push('PAGE '+String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push('CONSOLE '+message.text())});
  page.on('response',response=>{if(response.status()>=400)errors.push('HTTP '+response.status()+' '+response.url())});
  page.on('requestfailed',request=>errors.push('REQUEST '+request.url()));

  await page.goto('http://127.0.0.1:8080/?ci=core-paper-voxel',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.PaperchalkRuntime&&!!window.PaperchalkTerrain&&!!window.Paperchalk3D&&!!window.PaperchalkHealth,{timeout:5000});

  const cold=await page.evaluate(()=>({
    runtime:window.PaperchalkRuntime.getSnapshot(),
    three:{ready:window.Paperchalk3D.ready,active:window.Paperchalk3D.active},
    terrain:window.PaperchalkTerrain.stats(),
    legacy:{
      actor:!!document.querySelector('.actor'),
      pixi:!!document.getElementById('pixiEntityLayer'),
      healthDom:!!document.getElementById('playerHealthHud'),
      cardGround:!!document.getElementById('cardGroundCanvas')
    }
  }));
  assert(!cold.runtime.active&&!cold.three.active&&!cold.three.ready,'renderer must stay cold on menu '+JSON.stringify(cold));
  assert(cold.terrain.noiseBackend==='FastNoiseLite-1.1.1','FastNoiseLite terrain backend missing '+JSON.stringify(cold.terrain));
  assert(Object.values(cold.legacy).every(v=>!v),'legacy DOM world returned '+JSON.stringify(cold.legacy));

  await page.locator('#authBtn').click();
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('paper_voxel_core');
  await page.locator('#regName').fill('纸片旅人');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();

  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:12000});
  await page.waitForTimeout(300);

  const entered=await page.evaluate(()=>({
    runtime:window.PaperchalkRuntime.getSnapshot(),
    three:window.Paperchalk3D.stats,
    terrain:window.PaperchalkTerrain.stats(),
    canvas:{
      count:document.querySelectorAll('#threeWorldLayer canvas').length,
      width:document.querySelector('#threeWorldLayer canvas')?.width||0,
      height:document.querySelector('#threeWorldLayer canvas')?.height||0
    }
  }));
  assert(entered.runtime.active,'runtime did not enter world');
  assert(['x','y','z'].every(k=>Number.isFinite(entered.runtime.player[k])),'paper player transform invalid '+JSON.stringify(entered.runtime.player));
  assert(Math.abs(entered.runtime.player.z-.36)<1e-6,'gameplay must remain on one Z layer '+JSON.stringify(entered.runtime.player));
  assert(entered.three.mode==='paper-stage-x-y-voxel','wrong renderer mode '+JSON.stringify(entered.three));
  assert(entered.three.terrain?.singleLayer===true&&entered.three.terrain?.activeChunks>=9,'single-layer chunk renderer missing '+JSON.stringify(entered.three.terrain));
  assert(entered.three.playerRepresentation==='PlaneGeometry','player is not a 2D paper plane '+JSON.stringify(entered.three));
  assert(entered.three.paperEntities>=10,'paper world entities not built '+JSON.stringify(entered.three));
  assert(entered.canvas.count===1&&entered.canvas.width>700&&entered.canvas.height>400,'stage canvas invalid '+JSON.stringify(entered.canvas));

  const before=entered.runtime.player;
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(420);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(100);
  const afterD=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(afterD.x-before.x>.18,'D did not move right in X/Y slice '+JSON.stringify({before,afterD}));
  assert(Math.abs(afterD.z-.36)<1e-6,'movement escaped paper Z layer '+JSON.stringify(afterD));

  await page.keyboard.down('KeyA');
  await page.waitForTimeout(360);
  await page.keyboard.up('KeyA');
  await page.waitForTimeout(220);
  const afterA=await page.evaluate(()=>({p:window.PaperchalkRuntime.getSnapshot().player,render:window.Paperchalk3D.stats}));
  assert(afterA.p.x<afterD.x-.15,'A did not move left '+JSON.stringify({afterD,afterA}));
  assert(afterA.p.facing===-1&&afterA.render.playerFacing===-1,'paper turn did not face left '+JSON.stringify(afterA));

  const jumpStarted=await page.evaluate(()=>window.PaperchalkCombat.jump());
  assert(jumpStarted===true,'jump was rejected');
  await page.waitForFunction(()=>window.PaperchalkRuntime.getSnapshot().player.y>arguments[0]+.08,before.y,{timeout:1200});
  const air=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(!air.grounded&&air.vy>0,'jump state invalid '+JSON.stringify(air));
  await page.waitForFunction(()=>window.PaperchalkRuntime.getSnapshot().player.grounded,null,{timeout:3500});

  const dig=await page.evaluate(()=>{
    const t=window.PaperchalkTerrain;
    const p=window.PaperchalkRuntime.getSnapshot().player;
    const s=t.tileSize;
    const tx=Math.floor(p.x/s);
    const ty=Math.floor((p.y-.03)/s);
    const removed=[];
    for(let dx=-2;dx<=2;dx++){
      const previous=t.breakTile(tx+dx,ty);
      if(previous)removed.push([tx+dx,ty,previous]);
    }
    return {beforeY:p.y,removed,stats:t.stats()};
  });
  assert(dig.removed.length>0,'could not excavate voxel floor '+JSON.stringify(dig));
  await page.waitForFunction(()=>window.PaperchalkRuntime.getSnapshot().player.y<arguments[0]-.06,dig.beforeY,{timeout:1800});
  await page.waitForFunction(()=>window.PaperchalkRuntime.getSnapshot().player.grounded,null,{timeout:2500});
  const afterDig=await page.evaluate(()=>({p:window.PaperchalkRuntime.getSnapshot().player,t:window.PaperchalkTerrain.stats()}));
  assert(afterDig.p.y<dig.beforeY-.06,'player did not fall into excavated terrain '+JSON.stringify({dig,afterDig}));
  assert(afterDig.t.deltas>=dig.removed.length,'terrain delta count did not update '+JSON.stringify(afterDig.t));

  await page.evaluate(()=>{
    window.PaperchalkInventory.setSlot(0,{id:'rough-herb',name:'粗纸药草',desc:'回归测试药草',weight:.1,count:2,consumable:true,action:'heal',heal:2,glyph:'草'});
    window.PaperchalkHealth.damage(3);
  });
  await page.locator('#backpackBtn').click();
  await page.locator('.inventory-slot[data-slot="0"]').click();
  await page.locator('#inventoryUse').click();
  await page.waitForTimeout(100);
  const inventoryState=await page.evaluate(()=>({
    hp:window.PaperchalkHealth.state.hp,
    item:window.PaperchalkInventory.items[0]
  }));
  assert(inventoryState.hp===9&&inventoryState.item?.count===1,'inventory heal path failed '+JSON.stringify(inventoryState));
  await page.locator('#backpackClose').click();

  const saved=await page.evaluate(()=>{
    window.PaperchalkSaveNow();
    const key=window.PaperchalkSaveDiagnostics.keyFor('paper_voxel_core');
    return JSON.parse(localStorage.getItem(key)||'null');
  });
  assert(saved?.schemaVersion===5,'save schema is not v5 '+JSON.stringify(saved));
  assert(Number.isFinite(saved?.player?.x)&&Number.isFinite(saved?.player?.y)&&Math.abs(saved?.player?.z-.36)<1e-6,'paper player save invalid '+JSON.stringify(saved?.player));
  assert(Array.isArray(saved.terrainDeltas)&&saved.terrainDeltas.length>=dig.removed.length,'voxel edits not persisted '+JSON.stringify(saved.terrainDeltas));
  assert(saved.playerHp===9,'health not persisted '+JSON.stringify(saved));

  const savedPlayer={...saved.player};
  const broken=[...dig.removed[0]];
  await page.locator('#worldMenuBtn').click();
  await page.waitForTimeout(120);
  assert(!(await page.evaluate(()=>window.Paperchalk3D.active)),'renderer remained active after leaving world');

  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.PaperchalkRuntime&&!!window.PaperchalkTerrain&&!!window.Paperchalk3D,{timeout:5000});
  await page.locator('#continueBtn').click();
  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:12000});
  await page.waitForTimeout(180);
  const restored=await page.evaluate(([tx,ty])=>({
    p:window.PaperchalkRuntime.getSnapshot().player,
    hp:window.PaperchalkHealth.state.hp,
    item:window.PaperchalkInventory.items[0],
    brokenTile:window.PaperchalkTerrain.getTile(tx,ty),
    terrain:window.PaperchalkTerrain.stats()
  }),broken);
  assert(Math.abs(restored.p.x-savedPlayer.x)<.18&&Math.abs(restored.p.y-savedPlayer.y)<.35,'sideview position did not restore '+JSON.stringify({savedPlayer,restored}));
  assert(restored.brokenTile===0,'excavated voxel did not survive reload '+JSON.stringify({broken,restored}));
  assert(restored.hp===9&&restored.item?.count===1,'health/inventory did not restore '+JSON.stringify(restored));
  assert(errors.length===0,'runtime errors:\n'+errors.join('\n'));

  console.log(JSON.stringify({ok:true,entered:entered.three,afterD,afterA,air,dig,afterDig,saved,restored},null,2));
}finally{
  await browser.close();
}
