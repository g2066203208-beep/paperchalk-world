import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base='http://127.0.0.1:8080/studios/nocturne/';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
async function run(label,viewport,play){
  const page=await browser.newPage({viewport,deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  try{
    const resp=await page.goto(base,{waitUntil:'networkidle'});
    assert.equal(resp.status(),200,'game page must load');
    await page.locator('#startNew').click();
    await page.locator('#titleLayer').waitFor({state:'hidden'});
    assert.ok((await page.locator('.desktop-panel').boundingBox()).width>=175,'desktop panel must remain visible');
    await play(page);
    const metrics=await page.evaluate(()=>({
      inner:window.innerWidth,doc:document.documentElement.scrollWidth,
      stage:document.querySelector('.visual-stage').getBoundingClientRect().width,
      dialogue:document.querySelector('.dialogue').getBoundingClientRect().height,
      panel:document.querySelector('.desktop-panel').getBoundingClientRect().width,
      clickTargets:[...document.querySelectorAll('.app-dock button')].map(b=>Math.round(b.getBoundingClientRect().height))
    }));
    assert.ok(metrics.doc<=metrics.inner+1,'horizontal overflow '+JSON.stringify(metrics));
    assert.ok(metrics.stage>=150,'scene too narrow '+JSON.stringify(metrics));
    assert.ok(metrics.dialogue>=80,'dialogue too small '+JSON.stringify(metrics));
    assert.ok(metrics.clickTargets.every(n=>n>=34),'navigation touch target too small');
    assert.deepEqual(errors,[],label+' page runtime errors');
    await page.screenshot({path:'artifacts/nocturne-'+label+'.png',fullPage:true});
    console.log(label,'PASS',metrics);
  }finally{await page.close()}
}
try{
  await run('landscape-844', {width:844,height:390},async page=>{
    await page.locator('#dismissRotate').isVisible().then(async v=>{if(v)await page.locator('#dismissRotate').click()});
    await page.locator('.app-dock [data-app="messages"]').click();
    assert.ok((await page.locator('#windowContent').innerText()).includes('未知号码'));
    await page.locator('#windowContent [data-act="message"]').click();
    await page.locator('.app-dock [data-app="mission"]').click();
    await page.locator('#windowContent [data-act="accept"]').click();
    await page.locator('.app-dock [data-app="map"]').click();
    await page.locator('#windowContent [data-travel="campus"]').last().click();
    await page.locator('#inspectButton').click();
    await page.locator('#sceneHotspots [data-scene-action="photo"]').click();
    await page.locator('.app-dock [data-app="map"]').click();
    await page.locator('#windowContent [data-travel="cafe"]').last().click();
    await page.locator('#sceneHotspots [data-scene-action="receipt"]').click();
    await page.locator('.app-dock [data-app="case"]').click();
    await page.locator('#windowContent [data-clue="photo"]').click();
    await page.locator('#windowContent [data-clue="receipt"]').click();
    await page.locator('#windowContent [data-pair]').click();
    assert.ok((await page.locator('#line').innerText()).includes('记录'));
    await page.locator('.app-dock [data-app="mission"]').click();
    await page.locator('#windowContent [data-act="resolve"]').click();
    await page.locator('#modalOptions [data-modal-action="outcome-protect"]').click();
    assert.ok((await page.locator('#modalText').innerText()).includes('组织'));
    await page.locator('#closeModal').click();
    await page.locator('.app-dock [data-app="save"]').click();
    await page.locator('#windowContent [data-save="1"]').click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('paperworld.nocturne.v1.1')));
    assert.equal(saved.outcome,'protect');
  });
  await run('landscape-667',{width:667,height:375},async page=>{
    await page.locator('#dismissRotate').isVisible().then(async v=>{if(v)await page.locator('#dismissRotate').click()});
    await page.locator('.app-dock [data-app="schedule"]').click();
    assert.ok((await page.locator('#windowContent').innerText()).includes('日程'));
    await page.locator('.app-dock [data-app="map"]').click();
    await page.locator('#windowContent [data-travel="cafe"]').last().click();
    assert.ok((await page.locator('#locationChip').innerText()).includes('咖啡'));
  });
  console.log('Landscape browser smoke complete.');
}finally{await browser.close()}
