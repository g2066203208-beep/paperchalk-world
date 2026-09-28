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

  await page.goto('http://127.0.0.1:8080/?ci=core-3d',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.PaperchalkRuntime&&!!window.Paperchalk3D&&!!window.PaperchalkHealth,{timeout:5000});
  const cold=await page.evaluate(()=>({
    runtime:window.PaperchalkRuntime.getSnapshot(),
    three:{ready:window.Paperchalk3D.ready,active:window.Paperchalk3D.active},
    legacy:{
      actor:!!document.querySelector('.actor'),
      pixi:!!document.getElementById('pixiEntityLayer'),
      healthDom:!!document.getElementById('playerHealthHud'),
      cardGround:!!document.getElementById('cardGroundCanvas')
    }
  }));
  assert(!cold.runtime.active&&!cold.three.active&&!cold.three.ready,'3D engine must stay cold on menu '+JSON.stringify(cold));
  assert(Object.values(cold.legacy).every(v=>!v),'legacy 2D DOM remains '+JSON.stringify(cold.legacy));

  await page.locator('#authBtn').click();
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('three_core');
  await page.locator('#regName').fill('3D旅人');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();

  await page.waitForFunction(()=>document.getElementById('uiShell')?.classList.contains('is-hidden'),{timeout:3000});
  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:12000});
  await page.waitForTimeout(250);

  const entered=await page.evaluate(()=>({
    runtime:window.PaperchalkRuntime.getSnapshot(),
    three:window.Paperchalk3D.stats,
    canvas:{
      count:document.querySelectorAll('#threeWorldLayer canvas').length,
      width:document.querySelector('#threeWorldLayer canvas')?.width||0,
      height:document.querySelector('#threeWorldLayer canvas')?.height||0
    }
  }));
  assert(entered.runtime.active,'runtime did not enter world');
  assert(['x','y','z'].every(k=>Number.isFinite(entered.runtime.player[k])),'player is not native XYZ '+JSON.stringify(entered.runtime.player));
  assert(entered.three.renderer==='WebGLRenderer'&&entered.three.drawCalls>0&&entered.three.triangles>0,'real WebGL 3D renderer not drawing '+JSON.stringify(entered.three));
  assert(entered.canvas.count===1&&entered.canvas.width>700&&entered.canvas.height>400,'3D canvas invalid '+JSON.stringify(entered.canvas));

  const before=entered.runtime.player;
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(420);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(100);
  const afterW=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(Math.hypot(afterW.x-before.x,afterW.z-before.z)>.18,'W did not move in 3D '+JSON.stringify({before,afterW}));

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(360);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(80);
  const afterD=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(Math.hypot(afterD.x-afterW.x,afterD.z-afterW.z)>.15,'D did not move in 3D '+JSON.stringify({afterW,afterD}));

  const jumpStarted=await page.evaluate(()=>window.PaperchalkCombat.jump());
  assert(jumpStarted===true,'jump was rejected');
  await page.waitForFunction(()=>window.PaperchalkRuntime.getSnapshot().player.y>.08,null,{timeout:1200});
  const air=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot().player);
  assert(air.y>.08&&!air.grounded,'3D gravity/jump state invalid '+JSON.stringify(air));

  await page.evaluate(()=>window.PaperchalkHealth.damage(1));
  await page.waitForTimeout(80);
  const hp9=await page.evaluate(()=>({
    runtime:window.PaperchalkRuntime.getSnapshot().health,
    api:window.PaperchalkHealth.state,
    bar:window.Paperchalk3D.stats.health
  }));
  assert(hp9.runtime.current===9&&hp9.api.hp===9,'health state did not reach 9 '+JSON.stringify(hp9));
  assert(hp9.bar?.value===9&&hp9.bar?.max===10&&hp9.bar?.cells===10&&hp9.bar?.tail===true,'3D world health bar not synchronized '+JSON.stringify(hp9.bar));

  await page.evaluate(()=>{
    window.PaperchalkInventory.setSlot(0,{id:'rough-herb',name:'粗纸药草',desc:'回归测试药草',weight:.1,count:2,consumable:true,action:'heal',heal:2,glyph:'草'});
    window.PaperchalkHealth.damage(2);
  });
  await page.locator('#backpackBtn').click();
  await page.locator('.inventory-slot[data-slot="0"]').click();
  await page.locator('#inventoryUse').click();
  await page.waitForTimeout(100);
  const inventoryState=await page.evaluate(()=>({
    hp:window.PaperchalkHealth.state.hp,
    item:window.PaperchalkInventory.items[0],
    open:document.getElementById('backpackOverlay').classList.contains('is-open')
  }));
  assert(inventoryState.hp===9&&inventoryState.item?.count===1,'inventory heal path failed '+JSON.stringify(inventoryState));
  await page.locator('#backpackClose').click();

  const saved=await page.evaluate(()=>{
    window.PaperchalkSaveNow();
    const key=window.PaperchalkSaveDiagnostics.keyFor('three_core');
    return JSON.parse(localStorage.getItem(key)||'null');
  });
  assert(saved?.schemaVersion===4&&Number.isFinite(saved?.player?.x)&&Number.isFinite(saved?.player?.z),'3D save payload invalid '+JSON.stringify(saved));
  assert(saved.playerHp===9,'health not persisted '+JSON.stringify(saved));

  const savedPlayer={...saved.player};
  await page.locator('#worldMenuBtn').click();
  await page.waitForTimeout(120);
  const stopped=await page.evaluate(()=>({active:window.Paperchalk3D.active,loop:window.Paperchalk3D.stats.loopActive,runtime:window.PaperchalkRuntime.getSnapshot().active}));
  assert(!stopped.active&&!stopped.loop&&!stopped.runtime,'world leave did not stop 3D loops '+JSON.stringify(stopped));

  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.PaperchalkRuntime&&!!window.Paperchalk3D,{timeout:5000});
  await page.locator('#continueBtn').click();
  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:12000});
  await page.waitForTimeout(150);
  const restored=await page.evaluate(()=>({p:window.PaperchalkRuntime.getSnapshot().player,h:window.PaperchalkHealth.state.hp,item:window.PaperchalkInventory.items[0]}));
  assert(Math.hypot(restored.p.x-savedPlayer.x,restored.p.z-savedPlayer.z)<.15,'3D position did not restore '+JSON.stringify({savedPlayer,restored}));
  assert(restored.h===9&&restored.item?.count===1,'health/inventory did not restore '+JSON.stringify(restored));

  assert(errors.length===0,'runtime errors:\n'+errors.join('\n'));
  console.log(JSON.stringify({ok:true,entered:entered.three,afterW,afterD,air,hp9,inventoryState,saved,restored},null,2));
}finally{
  await browser.close();
}
