import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('artifacts/work-item-gallery');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const viewports=[{name:'desktop-1440x900',width:1440,height:900},{name:'phone-390x844',width:390,height:844},{name:'phone-landscape-844x390',width:844,height:390}];
const results=[];
for(const v of viewports){
 const ctx=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:v.width,height:v.height}}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4173/card-battle/slots-daggers/coin-lab/index.html',{waitUntil:'domcontentloaded'});
 const itemLink=page.locator('a[href="./items.html"]');
 if(await itemLink.count()!==1)throw Error('Coin lab navigation does not contain multi-item room');
 await itemLink.click();
 await page.waitForURL('**/coin-lab/items.html',{timeout:12000});
 await page.waitForFunction(()=>document.querySelectorAll('.item').length===6,{timeout:12000});
 await page.waitForTimeout(700);
 if(await page.locator('#heroTitle').innerText()!=='猎人团长')throw Error('initial selected character unexpected');
 const thumbs=await page.evaluate(()=>[...document.querySelectorAll('.thumb canvas')].map(c=>{
  const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let nonzero=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>80)nonzero++;
  return nonzero;
 }));
 if(thumbs.some(x=>x<100))throw Error('Character thumbnails blank: '+thumbs);
 await page.screenshot({path:path.join(out,v.name+'-01-gallery-overview.png'),fullPage:true});
 await page.locator('.item[data-id="doctor"]').click();
 await page.waitForTimeout(250);
 if(await page.locator('#heroTitle').innerText()!=='猎人医生')throw Error('character switch failed');
 await page.screenshot({path:path.join(out,v.name+'-02-doctor-selected.png'),fullPage:true});
 await page.locator('#flipBtn').click();
 const transform=await page.locator('#cardShell').evaluate(el=>el.style.transform);
 if(!transform.includes('rotateY(180deg)'))throw Error('flip did not affect 3D card '+transform);
 await page.screenshot({path:path.join(out,v.name+'-03-card-back.png'),fullPage:true});
 await page.locator('#resetBtn').click();
 const reset=await page.locator('#cardShell').evaluate(el=>el.style.transform);
 if(reset.includes('rotateY(180deg)'))throw Error('reset did not unflip '+reset);
 const dims=await page.evaluate(()=>({
  win:{w:innerWidth,h:innerHeight},stage:(()=>{const r=document.querySelector('.stage').getBoundingClientRect();return {width:r.width,height:r.height};})(),
  card:(()=>{const r=document.querySelector('.card-shell').getBoundingClientRect();return {width:r.width,height:r.height};})(),
  listCount:document.querySelectorAll('.item').length,
  selected:document.querySelector('.item.active')?.dataset.id
 }));
 if(dims.listCount!==6||dims.selected!=='doctor'||errors.length)throw Error('Gallery validation failed '+JSON.stringify({dims,errors}));
 console.log('PASS',v.name,JSON.stringify({thumbs,dims}));
 results.push({name:v.name,thumbs,dims,errors});
 await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));