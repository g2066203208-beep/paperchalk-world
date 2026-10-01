import process from 'node:process';
import fs from 'node:fs';
import {chromium} from 'playwright-core';
function assert(c,m){if(!c)throw new Error(m)}
fs.mkdirSync('artifacts',{recursive:true});
const errors=[];
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1365,height:768}});
 page.on('pageerror',e=>errors.push('PAGE '+String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
 await page.goto('http://127.0.0.1:8080/?world=prologue&prologue-smoke=1',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.PaperchalkSceneRuntime&&window.PaperchalkRuntime&&window.PaperchalkTerrain,{timeout:7000});
 const cold=await page.evaluate(()=>({
   scene:window.PaperchalkMap.scene3d,
   terrain:window.PaperchalkTerrain.stats(),
   center:window.PaperchalkSceneRuntime.heightAt(0,2),
   leftEdge:window.PaperchalkSceneRuntime.heightAt(-22,0),
   rearRidge:window.PaperchalkSceneRuntime.heightAt(-18,-18),
   oldGlobals:{
    cars:!!window.PaperchalkPrologueCars,
    street:!!window.PaperchalkStreetProps,
    school:!!window.PaperchalkSchoolLayout
   }
 }));
 assert(cold.scene.id==='prologue-paper-diorama'&&cold.scene.mode==='paper-diorama-3d','wrong demo prologue '+JSON.stringify(cold.scene));
 assert(cold.scene.composition?.style==='visual-demo-v12.32-composition','demo composition contract missing '+JSON.stringify(cold.scene.composition));
 assert(cold.scene.bounds.minX===-24&&cold.scene.bounds.maxX===24&&cold.scene.bounds.minZ===-22&&cold.scene.bounds.maxZ===16,'wrong diorama bounds '+JSON.stringify(cold.scene.bounds));
 assert(cold.terrain.infinite===false&&cold.terrain.finite===true,'diorama terrain must be finite '+JSON.stringify(cold.terrain));
 assert(cold.terrain.diorama?.authoredTerraces===true&&cold.terrain.diorama?.forestLayers===3,'authored terrain metadata missing '+JSON.stringify(cold.terrain.diorama));
 assert(cold.center===0&&cold.leftEdge>=2&&cold.rearRidge>=1,'hand-authored terrace profile wrong '+JSON.stringify(cold));
 assert(!cold.oldGlobals.cars&&!cold.oldGlobals.street&&!cold.oldGlobals.school,'old school-street globals still loaded '+JSON.stringify(cold.oldGlobals));
 const vox=await page.evaluate(()=>{
  const t=window.PaperchalkTerrain;
  return{
   centerTop:t.peekVoxel(0,0,2),centerBelow:t.peekVoxel(0,-1,2),
   edgeTop:t.peekVoxel(-22,2,0),outside:t.peekVoxel(-25,0,0),
   rearTop:t.peekVoxel(-18,2,-18),deep:t.peekVoxel(0,-4,2)
  };
 });
 assert(vox.centerTop===1&&vox.centerBelow===2,'center grass/dirt stack wrong '+JSON.stringify(vox));
 assert(vox.edgeTop===1&&vox.rearTop===1,'raised terrace grass top wrong '+JSON.stringify(vox));
 assert(vox.outside===0&&vox.deep===3,'finite bounds/deep stone wrong '+JSON.stringify(vox));
 await page.locator('#authBtn').click();await page.locator('#tabRegister').click();
 await page.locator('#regUser').fill('prologue_diorama_smoke');await page.locator('#regName').fill('Diorama');await page.locator('#regPass').fill('test1234');
 await page.locator('#registerForm button[type=submit]').click();
 await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:15000});
 await page.waitForTimeout(1600);
 const entered=await page.evaluate(()=>({snap:window.PaperchalkRuntime.getSnapshot(),stats:window.Paperchalk3D.stats}));
 assert(entered.snap.scene.id==='prologue-paper-diorama','runtime scene switched away from diorama '+JSON.stringify(entered.snap.scene));
 assert(entered.snap.npcs.length===0,'open-world NPCs leaked into prologue '+JSON.stringify(entered.snap.npcs));
 assert(Math.abs(entered.snap.player.x)<.01&&Math.abs(entered.snap.player.z-2)<.01,'wrong diorama spawn '+JSON.stringify(entered.snap.player));
 assert(entered.stats.worldMode==='paper-diorama-3d','renderer is not using demo prologue '+JSON.stringify(entered.stats));
 assert(Math.abs(entered.stats.camera.distance-19.2)<.08&&Math.abs(entered.stats.camera.pitch-.18)<.02&&Math.abs(entered.stats.camera.fov-36)<.05,'demo camera preset missing '+JSON.stringify(entered.stats.camera));
 assert(entered.stats.camera.stageView?.enabled===false,'demo camera must be free orbit '+JSON.stringify(entered.stats.camera));
 const d=entered.stats.diorama;
 assert(d?.enabled===true&&d.style==='visual-demo-v12.32-composition','diorama renderer missing '+JSON.stringify(d));
 assert(d.forestLayers===3&&d.trees>=58&&d.mistBanks===18&&d.groundMist===10,'demo composition counts wrong '+JSON.stringify(d));
 assert(d.compositionDriven===true&&d.assetIndependent===true,'composition/render separation missing '+JSON.stringify(d));
 assert(entered.stats.schoolFence===undefined&&entered.stats.paperCar===undefined&&entered.stats.streetProps===undefined,'old prologue renderers still exposed '+JSON.stringify(entered.stats));
 assert(entered.stats.atmosphere?.volumetric===true,'demo volumetric lighting must default on '+JSON.stringify(entered.stats.atmosphere));
 await page.evaluate(()=>window.Paperchalk3D.setCameraConfig({yaw:.35,pitch:.22,distance:17.5,height:.15,fov:36}));
 await page.waitForTimeout(900);
 await page.screenshot({path:'artifacts/prologue-paper-diorama.png'});
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('PROLOGUE_PAPER_DIORAMA_OK');
}finally{await browser.close()}
