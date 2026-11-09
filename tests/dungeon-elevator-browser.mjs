// Real WebGL browser proof for Dungeon Elevator. 1920x1080, no concept mockups.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const out='artifacts/dungeon-elevator';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')console.log('BROWSER_CONSOLE_ERROR',m.text())});
page.on('requestfailed',r=>console.log('BROWSER_REQUEST_FAILED',r.url(),r.failure()?.errorText));
try{
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#menu-dungeon-elevator').waitFor({state:'visible'});
 await page.locator('#menu-dungeon-elevator').click();
 await page.waitForURL('**/dungeon-elevator/');
 await page.waitForTimeout(1600);
 const boot=await page.evaluate(()=>({url:location.href,canvas:!!document.querySelector('#viewport canvas'),fallback:document.querySelector('#fallback')?.textContent,notice:document.querySelector('#notice')?.textContent,threeDemo:!!window.DungeonElevatorDemo}));
 console.log('DUNGEON_BOOT',JSON.stringify({boot,errors}));
 if(!boot.canvas){await page.screenshot({path:out+'/00-boot-failure.png'});throw new Error('3D canvas did not load: '+JSON.stringify({boot,errors}))}
 await page.waitForTimeout(450);
 const initial=await page.evaluate(()=>window.DungeonElevatorDemo.getState());
 assert.equal(initial.depth,0);assert.equal(initial.view,'door');
 assert.equal(initial.serviceOpen,false);assert.equal(initial.securityOpen,false);
 await page.screenshot({path:out+'/01-door-both-closed-1920x1080.png'});
 await page.locator('#service-gate').click();
 assert.equal(await page.evaluate(()=>window.DungeonElevatorDemo.getState().serviceOpen),true);
 await page.locator('#down').click();
 assert.equal(await page.evaluate(()=>window.DungeonElevatorDemo.getState().depth),0,'Moving with gate open must be blocked');
 await page.locator('#security-gate').click();
 await page.waitForTimeout(400);
 await page.screenshot({path:out+'/02-both-gates-open-white-outside-1920x1080.png'});
 await page.locator('#cabin-camera').click();
 await page.waitForTimeout(650);
 assert.equal(await page.evaluate(()=>window.DungeonElevatorDemo.getState().view),'cabin');
 await page.screenshot({path:out+'/03-empty-3d-cabin-1920x1080.png'});
 await page.locator('#service-gate').click();await page.locator('#security-gate').click();
 await page.locator('#down').click();
 assert.equal(await page.evaluate(()=>window.DungeonElevatorDemo.getState().depth),1);
 await page.evaluate(()=>window.DungeonElevatorDemo.setLoad(999,5));
 await page.locator('#down').click();
 assert.equal(await page.evaluate(()=>window.DungeonElevatorDemo.getState().depth),1,'Overload must block movement');
 await page.evaluate(()=>window.DungeonElevatorDemo.setLoad(0,0));
 await page.locator('#emergency').click();
 const end=await page.evaluate(()=>window.DungeonElevatorDemo.getState());
 assert.equal(end.depth,0);assert.equal(end.emergencyUsed,true);assert.equal(end.integrity,92);
 assert.equal(errors.length,0,'Browser console page errors: '+JSON.stringify(errors));
 console.log('DUNGEON_ELEVATOR_PROOF',JSON.stringify({initial,end,screenshots:3}));
}finally{await browser.close()}
