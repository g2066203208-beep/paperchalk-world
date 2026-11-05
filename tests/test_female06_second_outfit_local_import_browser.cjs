/* Female-six second outfit: direct ZIP import to the shared L2D Studio.
   Synthetic 16-part PNG fixture tests the import workflow without publishing
   the user's binary PSD package into the public repository. */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function zipStore(entries){
 const local=[],central=[];let offset=0;
 const crc32=buf=>{let crc=0xffffffff;for(const b of buf){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return(crc^0xffffffff)>>>0};
 for(const [name,value] of entries){
  const n=Buffer.from(name),data=Buffer.isBuffer(value)?value:Buffer.from(value),crc=crc32(data);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt32LE(crc,14);
  h.writeUInt32LE(data.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(n.length,26);
  local.push(h,n,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);
  c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);
  c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);central.push(c,n);
  offset+=h.length+n.length+data.length;
 }
 const cbytes=Buffer.concat(central),e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50,0);
 e.writeUInt16LE(entries.length,8);e.writeUInt16LE(entries.length,10);
 e.writeUInt32LE(cbytes.length,12);e.writeUInt32LE(offset,16);
 return Buffer.concat([...local,cbytes,e]);
}
const names=['wings_l','wings_r','back_hair','legwear','topwear','bottomwear','neck','ears','face','mouth','nose','eyelash','eyebrow','front_hair','handwear_l','handwear_r'];
const id='female-06-second-outfit',root=id+'/';
const originalPng=fs.readFileSync('site/assets/l2d/library/female-06/front/nose.png');
const w=originalPng.readUInt32BE(16),h=originalPng.readUInt32BE(20);
const parts={},textures={},entries=[];
for(let i=0;i<names.length;i++){
 const key=names[i],local='front/'+key+'.png';textures[key]=local;
 parts[key]={id:key,name:key,x:400+i*2,y:200+i*3,w,h,
  parentId:key.startsWith('wings')?'torso':key==='legwear'?'pelvis':'root',
  kind:key.startsWith('wings')?'wing':key==='legwear'?'leg-combined':'fixed',
  pivot:{x:.5,y:.1},tip:{x:.5,y:.9},
  mesh:{rows:4,columns:4},bones:[],motion:{x:0,y:0,angle:0,frequency:1,phase:0},enabled:true};
 entries.push([root+local,originalPng]);
}
const moduleRecord={schema:1,id,label:'女六 · 第二套（翼羽姿态）',familyId:'female-06',variantCategory:'outfit',
 views:{front:{portrait:'front.png',rig:{type:'part-mesh',file:'front.rig.json',textures}}}};
const rig={format:'paperchalk-part-rig-v1',characterId:id,face:'front',canvas:[1024,1024],
 layerOrder:names,partCount:names.length,parts};
entries.push([root+'front.png',originalPng],[root+'module.json',Buffer.from(JSON.stringify(moduleRecord))],
 [root+'front.rig.json',Buffer.from(JSON.stringify(rig))]);
const artifact='artifacts/character-editor/FEMALE06-SECOND-DIRECT-IMPORT-QA.zip';
fs.mkdirSync(path.dirname(artifact),{recursive:true});fs.writeFileSync(artifact,zipStore(entries));
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:920}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8134/character-editor/?character=female-06&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06'&&window.PaperchalkPartRigStudio?.state?.active,
   null,{timeout:60000});
  await page.locator('#studio-parts-import').setInputFiles(artifact);
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06-second-outfit'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.PaperchalkPartRigStudio.state.model?.characterId==='female-06-second-outfit'&&
   window.PaperchalkStudio.countSourceParts?.()===16,null,{timeout:60000});
  const tree=await page.evaluate(()=>({
   family:[...document.querySelectorAll('.character-family')].map(x=>x.dataset.family),
   parts:Object.keys(window.PaperchalkPartRigStudio.state.model.parts),
   imported:window.PaperchalkStudio.list.has('female-06-second-outfit')
  }));
  assert.equal(tree.family.filter(x=>x==='female-06').length,1);
  assert.equal(tree.family.filter(x=>x==='female-06-second-outfit').length,0);
  assert.equal(tree.parts.length,16);assert.equal(tree.imported,true);
  const wardrobe=page.locator('.character-family[data-family="female-06"] [data-category="outfit"]');
  assert.match(await wardrobe.textContent(),/第二套/);assert.match(await wardrobe.textContent(),/第三套/);
  await page.screenshot({path:'artifacts/character-editor/FEMALE06-SECOND-LOCAL-IMPORT.png',fullPage:true});
  await page.locator('#btnSave').click();
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06-second-outfit'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   Object.keys(window.PaperchalkPartRigStudio.state.model?.parts||{}).length===16,
   null,{timeout:60000});
  assert.deepEqual(errors,[]);
  console.log('PASS second wardrobe: ZIP import, 16 parts, one person tree, local save/reload');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});