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
 await page.waitForFunction(()=>window.PaperchalkSceneRuntime&&window.PaperchalkPrologueCars&&window.PaperchalkRuntime&&window.PaperchalkTerrain,{timeout:7000});
 const cold=await page.evaluate(()=>({
   scene:window.PaperchalkMap.scene3d,
   terrain:window.PaperchalkTerrain.stats(),
   zones:window.PaperchalkSceneRuntime.prologue.terrain.crossSection,
   car:window.PaperchalkPrologueCars.CAR
 }));
 assert(cold.scene.id==='prologue-school-street'&&cold.scene.mode==='prologue-city-3d','wrong prologue scene '+JSON.stringify(cold.scene));
 assert(cold.scene.bounds.minX===0&&cold.scene.bounds.maxX===180&&cold.scene.bounds.minZ===-28&&cold.scene.bounds.maxZ===28,'wrong prologue bounds '+JSON.stringify(cold.scene.bounds));
 assert(cold.terrain.infinite===false&&cold.terrain.finite===true,'prologue terrain must be finite '+JSON.stringify(cold.terrain));
 assert(cold.terrain.street?.lengthMeters===180&&cold.terrain.street?.depthMeters===56,'wrong street dimensions '+JSON.stringify(cold.terrain.street));
 assert(cold.car.x===36.5&&cold.car.z===-5&&cold.car.groundY===1,'paper sedan not voxel-aligned '+JSON.stringify(cold.car));
 assert(cold.car.length===4.4&&cold.car.width===1.9&&cold.car.height===1.6&&cold.car.lane==='rear-motor','paper sedan dimensions/lane wrong '+JSON.stringify(cold.car));
 assert(cold.terrain.campus===undefined,'rejected school campus terrain still present '+JSON.stringify(cold.terrain));
 const z=cold.zones;
 assert(z.rearBuilding.width===12&&z.rearSidewalk.width===4&&z.rearBike.width===3&&z.rearBuffer.width===1&&z.rearMotor.width===7&&z.median.width===2&&z.frontMotor.width===7&&z.frontBuffer.width===1&&z.frontBike.width===3&&z.frontSidewalk.width===4&&z.frontBuilding.width===12,'street cross-section widths wrong '+JSON.stringify(z));
 const vox=await page.evaluate(()=>{
   const t=window.PaperchalkTerrain,x=20;
   return {
    rearBuilding:t.peekVoxel(x,0,-20),rearSidewalk:t.peekVoxel(x,0,-15),rearBike:t.peekVoxel(x,0,-11),
    rearBuffer:t.peekVoxel(x,0,-9),rearRoad:t.peekVoxel(x,0,-7),median:t.peekVoxel(x,0,-1),
    frontRoad:t.peekVoxel(x,0,2),frontBuffer:t.peekVoxel(x,0,8),frontBike:t.peekVoxel(x,0,10),
    frontSidewalk:t.peekVoxel(x,0,14),frontBuilding:t.peekVoxel(x,0,20),
    outsideRear:t.peekVoxel(x,0,-29),outsideFront:t.peekVoxel(x,0,28),
    below:t.peekVoxel(x,-1,-15),deep:t.peekVoxel(x,-3,-15)
   };
 });
 assert(vox.rearBuilding===1&&vox.frontBuilding===1,'building ground must be grass '+JSON.stringify(vox));
 assert(vox.rearSidewalk===5&&vox.frontSidewalk===5,'sidewalks must be clay '+JSON.stringify(vox));
 assert(vox.rearBike===4&&vox.frontBike===4,'bike lanes must be sand placeholder '+JSON.stringify(vox));
 assert(vox.rearBuffer===1&&vox.frontBuffer===1&&vox.median===1,'green separators wrong '+JSON.stringify(vox));
 assert(vox.rearRoad===3&&vox.frontRoad===3,'motor road must be stone '+JSON.stringify(vox));
 assert(vox.outsideRear===0&&vox.outsideFront===0,'finite Z bounds leaked '+JSON.stringify(vox));
 assert(vox.below===2&&vox.deep===3,'underground layers wrong '+JSON.stringify(vox));
 await page.locator('#authBtn').click();await page.locator('#tabRegister').click();
 await page.locator('#regUser').fill('prologue_scene_smoke');await page.locator('#regName').fill('Prologue');await page.locator('#regPass').fill('test1234');
 await page.locator('#registerForm button[type=submit]').click();
 await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:15000});
 await page.waitForTimeout(1400);
 const entered=await page.evaluate(()=>({snap:window.PaperchalkRuntime.getSnapshot(),stats:window.Paperchalk3D.stats,layout:!!window.PaperchalkSchoolLayout}));
 assert(entered.layout===false,'rejected school layout runtime still loaded');
 assert(entered.stats.schoolBuilding===undefined,'rejected school building renderer still active '+JSON.stringify(entered.stats.schoolBuilding));
 assert(entered.snap.scene.id==='prologue-school-street','runtime scene switched away from prologue '+JSON.stringify(entered.snap.scene));
 assert(entered.snap.npcs.length===0,'test-world NPCs leaked into prologue '+JSON.stringify(entered.snap.npcs));
 assert(Math.abs(entered.snap.player.z+14.5)<.01,'player is not on rear sidewalk '+JSON.stringify(entered.snap.player));
 assert(entered.snap.player.x>24&&entered.snap.player.x<25,'wrong prologue spawn X '+JSON.stringify(entered.snap.player));
 assert(entered.stats.worldMode==='prologue-city-3d','renderer is not using prologue scene '+JSON.stringify(entered.stats));
 assert(Math.abs(entered.stats.camera.yaw)<.01&&Math.abs(entered.stats.camera.distance-18)<.05&&Math.abs(entered.stats.camera.fov-42)<.05,'prologue camera preset missing '+JSON.stringify(entered.stats.camera));
 const car=entered.stats.paperCar;
 assert(car?.enabled===true&&car.style==='2d-side-sprite+black-paper-thickness-r1','paper sedan renderer missing '+JSON.stringify(car));
 assert(car.count===1&&car.voxelAligned===true&&car.lane==='rear-motor','paper sedan placement wrong '+JSON.stringify(car));
 assert(car.dimensions.length===4.4&&car.dimensions.width===1.9&&car.dimensions.height===1.6,'paper sedan render dimensions wrong '+JSON.stringify(car.dimensions));
 assert(car.geometry.spritePlanes===1&&car.geometry.blackThicknessPlanes===2&&car.geometry.extrusions===0&&car.geometry.wheels3d===0,'paper sedan must stay flat sprite + tiny paper thickness '+JSON.stringify(car.geometry));
 const props=entered.stats.streetProps;
 assert(props?.enabled===true&&props.count>=70,'street props missing '+JSON.stringify(props));
 assert(props.proxyInstances>0&&props.drawGroups>=8&&props.collisionAuthority==='PaperchalkStreetProps','street prop render/collision bridge missing '+JSON.stringify(props));
 const fence=entered.stats.schoolFence;
 assert(fence?.enabled===true&&fence.gridAligned===true&&fence.installation==='voxel-grid-edge','school fence grid installation missing '+JSON.stringify(fence));
 assert(fence.lineZ===-16.5&&fence.rearCellZ===-17&&fence.sidewalkCellZ===-16,'fence is not on voxel edge '+JSON.stringify(fence));
 assert(fence.groundTop===1,'fence ground height must come from voxel top '+JSON.stringify(fence));
 assert(fence.frontageMeters===80&&fence.gateMeters===8&&fence.panelMeters===4,'school fence dimensions wrong '+JSON.stringify(fence));
 assert(fence.panelCount===18&&fence.postCount===18&&fence.gatePillars===2&&fence.gateLeaves===2,'school fence part counts wrong '+JSON.stringify(fence));
 const collision=await page.evaluate(()=>{
   const S=window.PaperchalkSceneRuntime,scene=window.PaperchalkMap.scene3d;
   return {
     fence:S.collidesAABB(scene,10,1.95,-16.5,.34,.95,.28),
     gate:S.collidesAABB(scene,24,1.95,-16.5,.34,.95,.28),
     sidewalk:S.collidesAABB(scene,24,1.95,-14.5,.34,.95,.28),
     car:S.collidesAABB(scene,36.5,1.8,-5,.34,.95,.28),
     streetProp:S.collidesAABB(scene,8,2,-13.2,.34,.95,.28),
     clearStreet:S.collidesAABB(scene,10,2,-13.2,.34,.95,.28),
     clearRoad:S.collidesAABB(scene,45.5,1.8,-5,.34,.95,.28),
     oldBuilding:S.collidesAABB(scene,32,1.95,-20.5,.34,.95,.28)
   };
 });
 assert(collision.fence===true&&collision.gate===false&&collision.sidewalk===false,'school fence/gate collision wrong '+JSON.stringify(collision));
 assert(collision.car===true&&collision.clearRoad===false,'paper sedan collision wrong '+JSON.stringify(collision));
 assert(collision.streetProp===true&&collision.clearStreet===false,'street prop collision wrong '+JSON.stringify(collision));
 assert(collision.oldBuilding===false,'rejected building collision still present '+JSON.stringify(collision));
 await page.evaluate(()=>{
   window.PaperchalkMap.teleport(36.5,4);
   window.Paperchalk3D.setCameraConfig({yaw:0,pitch:.10,distance:18,height:3.2,fov:42});
 });
 await page.waitForTimeout(850);
 await page.screenshot({path:'artifacts/prologue-school-street.png'});
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('PROLOGUE_CITY_SCENE_OK');
}finally{await browser.close()}
