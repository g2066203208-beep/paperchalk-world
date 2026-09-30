import process from 'node:process';
import fs from 'node:fs';
import {chromium} from 'playwright-core';
function assert(c,m){if(!c)throw new Error(m)}
const errors=[];
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1365,height:768}});
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:8080/?ci=prologue-smoke',{waitUntil:'networkidle'});
  await page.locator('#authBtn').click();
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('prologue_ci');
  await page.locator('#regName').fill('Prologue');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>window.PaperchalkPrologue3D?.ready&&window.PaperchalkPrologue3D?.active,{timeout:15000});
  await page.waitForTimeout(700);

  const school=await page.evaluate(()=>({p:window.PaperchalkPrologue.snapshot(),r:window.PaperchalkPrologue3D.stats,world:window.Paperchalk3D?.active}));
  assert(school.p.zone==='school','prologue did not begin inside school '+JSON.stringify(school.p));
  assert(school.p.people.length===5,'school life population wrong '+school.p.people.length);
  assert(school.r.schoolInterior===true&&school.r.homeInterior===true&&school.r.cityRoads===true,'prologue scene zones missing '+JSON.stringify(school.r));
  assert(school.r.sharedPlayerTexture===true&&school.r.actorAsset==='assets/player/protagonist.webp','prologue people are not using player skin '+JSON.stringify(school.r));
  assert(school.world===false,'main voxel world should not run behind prologue');
  await page.screenshot({path:'artifacts/prologue-school.png'});

  async function patchState(patch){
    await page.evaluate(({patch})=>{
      window.PaperchalkPrologue.leave();
      const key='paperchalk.prologue.v1.prologue_ci';
      const s=JSON.parse(localStorage.getItem(key));
      Object.assign(s,patch);
      if(patch.player)s.player={...s.player,...patch.player};
      localStorage.setItem(key,JSON.stringify(s));
      window.PaperchalkPrologue.enter('prologue_ci');
    },{patch});
  }

  await patchState({zone:'city',objectiveIndex:1,player:{x:-40,z:17,yaw:0},segmentComplete:false,completed:false});
  await page.waitForFunction(()=>window.PaperchalkPrologue.snapshot().zone==='city');
  await page.waitForTimeout(350);
  const cityA=await page.evaluate(()=>window.PaperchalkPrologue.snapshot());
  assert(cityA.people.length>=12,'city pedestrian population too small '+cityA.people.length);
  assert(cityA.cars.length===8,'city traffic population wrong '+cityA.cars.length);
  assert(cityA.stats.citySimulation&&cityA.stats.trafficSignals&&cityA.stats.pedestrianSchedules,'city simulation gates missing '+JSON.stringify(cityA.stats));
  const before=await page.evaluate(()=>{
    const s=window.PaperchalkPrologue.snapshot();
    const p=s.people.find(v=>v.id==='student-a'),c=s.cars.find(v=>v.id==='car-e1');
    return {p:{x:p.x,z:p.z},c:{x:c.x,z:c.z},phase:s.signals.phase};
  });
  await page.waitForTimeout(1300);
  const after=await page.evaluate(()=>{
    const s=window.PaperchalkPrologue.snapshot();
    const p=s.people.find(v=>v.id==='student-a'),c=s.cars.find(v=>v.id==='car-e1');
    return {p:{x:p.x,z:p.z},c:{x:c.x,z:c.z},phase:s.signals.phase};
  });
  assert(Math.hypot(after.p.x-before.p.x,after.p.z-before.p.z)>.03,'pedestrian schedule did not move '+JSON.stringify({before,after}));
  assert(Math.hypot(after.c.x-before.c.x,after.c.z-before.c.z)>.03,'traffic did not move '+JSON.stringify({before,after}));
  assert(after.phase!==before.phase,'traffic signal clock did not advance');
  await page.screenshot({path:'artifacts/prologue-city.png'});

  await patchState({zone:'home',objectiveIndex:4,player:{x:0,z:-6,yaw:0},segmentComplete:false,completed:false});
  await page.waitForFunction(()=>window.PaperchalkPrologue.snapshot().zone==='home');
  await page.waitForTimeout(350);
  const home=await page.evaluate(()=>window.PaperchalkPrologue.snapshot());
  assert(home.people.length===1&&home.people[0].id==='parent','home life NPC missing '+JSON.stringify(home.people));
  assert(home.cars.length===0,'cars leaked into home interior');
  await page.screenshot({path:'artifacts/prologue-home.png'});

  await patchState({zone:'home',objectiveIndex:4,player:{x:6,z:3.05,yaw:0},segmentComplete:false,completed:false});
  await page.waitForFunction(()=>window.PaperchalkPrologue.snapshot().segmentComplete===true,{timeout:3000});
  assert(await page.locator('[data-prologue-end]').evaluate(el=>el.classList.contains('is-show')),'prologue ending card missing');
  await page.locator('[data-prologue-finish]').click();
  await page.waitForFunction(()=>window.Paperchalk3D?.active===true,{timeout:15000});
  const final=await page.evaluate(()=>({prologue:window.PaperchalkPrologue.active,world:window.Paperchalk3D.active,completed:JSON.parse(localStorage.getItem('paperchalk.prologue.v1.prologue_ci')).completed}));
  assert(final.prologue===false&&final.world===true&&final.completed===true,'prologue did not hand off to main game '+JSON.stringify(final));
  assert(errors.length===0,'browser errors: '+errors.join(' | '));
  console.log('PROLOGUE_CITY_SMOKE_OK',JSON.stringify({schoolPeople:school.p.people.length,cityPeople:cityA.people.length,cars:cityA.cars.length}));
}finally{await browser.close()}
