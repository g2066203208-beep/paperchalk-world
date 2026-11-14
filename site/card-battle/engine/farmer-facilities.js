/* Farmer organization facilities and shared essence. Pure gameplay rules; no DOM/WebGL.
 * A facility is an independent placed object with durability and occupied tiles.
 * Fields supply LIFE, trees shield, wells double neighboring recurring production,
 * scarecrows absorb one hit, mills convert LIFE to MATERIAL. Nothing requires
 * essence just to play a basic card.
 */
(function(root){'use strict';
// Exactly the same definition objects that decks and artwork lookup use.
const catalog=root.PaperchalkCardCatalog;
if(!catalog)throw Error('Registered card catalog missing');
const DEFINITIONS=Object.freeze(Object.fromEntries(catalog.facilities()
 .filter(c=>c.characterId==='farmer-engineer-farmer')
 .map(c=>[c.id,Object.freeze({
  id:c.id,name:c.name,footprint:c.footprint,
  hp:c.facilityHp,role:c.facilityRole,family:c.family
 })])));
const ESSENCE_TYPES=['material','life','magic'];
function create(options={}){
 const cap=Number.isInteger(options.maxEssence)?options.maxEssence:5;
 let structures=[],nextId=1,turn=1;
 let essence={material:0,life:0,magic:0};
 const copy=x=>JSON.parse(JSON.stringify(x));
 const tilesOf=f=>f.tiles?.length?f.tiles:[{tileC:f.tileC,tileR:f.tileR}];
 const near=(a,b)=>tilesOf(a).some(p=>tilesOf(b).some(q=>
  Math.max(Math.abs(p.tileC-q.tileC),Math.abs(p.tileR-q.tileR))<=1));
 function snapshot(){return {turn,essence:{...essence},maxEssence:cap,
  facilities:structures.map(copy)};}
 function place(cardId,slot,tiles){
  const def=DEFINITIONS[cardId];
  if(!def||!slot||!Number.isInteger(slot.tileC)||!Number.isInteger(slot.tileR))
   return {ok:false,reason:'invalid-facility'};
  if(!Array.isArray(tiles)||tiles.length!==def.footprint[0]*def.footprint[1])
   return {ok:false,reason:'invalid-footprint'};
  const keys=tiles.map(t=>t.tileC+':'+t.tileR);
  const [width,height]=def.footprint;
  const expected=new Set();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)
   expected.add((slot.tileC+x)+':'+(slot.tileR+y));
  // The gameplay engine must reject nonrectangular/offset footprints even if
  // a scene UI mistakenly passes a list with the correct number of tiles.
  if(new Set(keys).size!==keys.length||keys.some(key=>!expected.has(key)))
   return {ok:false,reason:'invalid-footprint'};
  if(structures.some(f=>tilesOf(f).some(t=>keys.includes(t.tileC+':'+t.tileR))))
   return {ok:false,reason:'occupied'};
  const f={id:'building-'+nextId++,cardId,name:def.name,tileC:slot.tileC,
   tileR:slot.tileR,flank:slot.flank,tiles:tiles.map(t=>({tileC:t.tileC,tileR:t.tileR})),
   hp:def.hp,maxHp:def.hp,role:def.role,footprint:[...def.footprint]};
  structures.push(f);return {ok:true,facility:copy(f)};
 }
 function grant(kind,amount){
  if(!ESSENCE_TYPES.includes(kind)||!Number.isInteger(amount)||amount<0)return 0;
  const delta=Math.min(amount,Math.max(0,cap-essence[kind]));
  essence[kind]+=delta;return delta;
 }
 function spend(kind,amount){
  if(!ESSENCE_TYPES.includes(kind)||!Number.isInteger(amount)||amount<0||
    essence[kind]<amount)return false;
  essence[kind]-=amount;return true;
 }
 function steal(amount=1){
  let lost=0;
  for(let i=0;i<amount;i++){
   const kind=ESSENCE_TYPES.find(k=>essence[k]>0);
   if(!kind)break;
   essence[kind]--;lost++;
  }
  return lost;
 }
 function remove(id){
  const i=structures.findIndex(f=>f.id===id);
  if(i<0)return false;
  structures.splice(i,1);return true;
 }
 function accelerated(f){
  if(f.cardId==='water-well'||f.cardId==='scarecrow')return false;
  return structures.some(w=>w.cardId==='water-well'&&near(w,f));
 }
 function nextTurn(){
  turn++;
  const changes=[];
  // Processing order is deliberate: farm -> tree -> mill; production may fuel
  // conversion in the SAME upkeep. A second well does not double again.
  for(const f of structures.filter(x=>x.cardId==='farm-field')){
   const gained=grant('life',accelerated(f)?2:1);
   if(gained)changes.push({id:f.id,kind:'life',amount:gained});
  }
  for(const f of structures.filter(x=>x.cardId==='plant-tree')){
   const before=f.hp;
   f.hp=Math.min(f.maxHp,f.hp+(accelerated(f)?2:1));
   if(f.hp>before)changes.push({id:f.id,kind:'repair',amount:f.hp-before});
  }
  for(const f of structures.filter(x=>x.cardId==='windmill')){
   let converted=0,limit=accelerated(f)?2:1;
   while(converted<limit&&essence.life>0&&essence.material<cap){
    essence.life--;essence.material++;converted++;
   }
   if(converted)changes.push({id:f.id,kind:'convert',amount:converted});
  }
  return {ok:true,changes,state:snapshot()};
 }
 function intercept(target,damage){
  // New form includes target world tile, so a tree on the left cannot shield
  // units across the entire map. Legacy (row, damage) remains supported.
  const targetTileC=typeof target==='object'?target?.tileC:null;
  const targetTileR=typeof target==='object'?target?.tileR:target;
  const amount=typeof target==='object'?target?.damage:damage;
  if(!Number.isInteger(targetTileR)||!Number.isFinite(amount)||amount<=0||
   (targetTileC!==null&&!Number.isInteger(targetTileC)))return {blocked:0};
  const candidates=structures.filter(f=>
   (f.cardId==='scarecrow'||f.cardId==='plant-tree')&&
   tilesOf(f).some(t=>Math.abs(t.tileR-targetTileR)<=1&&
    (targetTileC===null||Math.abs(t.tileC-targetTileC)<=3)));
  const f=candidates.find(x=>x.cardId==='scarecrow')||
   candidates.find(x=>x.cardId==='plant-tree');
  if(!f)return {blocked:0};
  const blocked=f.cardId==='scarecrow'?amount:Math.min(amount,2,f.hp);
  f.hp-=f.cardId==='scarecrow'?1:blocked;
  const destroyed=f.hp<=0;
  const result={blocked,facilityId:f.id,cardId:f.cardId,destroyed};
  if(destroyed)remove(f.id);
  return result;
 }
 function reset(){structures=[];nextId=1;turn=1;essence={material:0,life:0,magic:0};return snapshot();}
 return Object.freeze({place,nextTurn,intercept,grant,spend,steal,remove,reset,
  get snapshot(){return snapshot();}});
}
root.PaperchalkFarmerFacilities=Object.freeze({version:'1.2.0-bounded-footprints-and-interception',DEFINITIONS,create});
})(window);
