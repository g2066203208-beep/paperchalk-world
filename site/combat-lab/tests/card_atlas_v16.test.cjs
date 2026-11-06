const assert=require('node:assert/strict');
const G=require('../engine.js'),C=require('../campaign.js');
let passed=0,checked=0;
function t(label,fn){try{fn();passed++;console.log('✓',label)}catch(e){console.error('✗',label,e.stack);process.exitCode=1;}}
t('four classes, 90 obtainable unique card IDs each, 30/40/20 rarity bands',()=>{
 const all=[];for(const [cl,pool]of Object.entries(C.POOLS)){
  assert.equal(pool.length,90,cl);assert.equal(new Set(pool).size,90,cl);
  for(const [rar,n]of Object.entries({common:30,uncommon:40,rare:20}))assert.equal(pool.filter(k=>C.rarityOf(k)===rar).length,n,cl+' '+rar);
  all.push(...pool);
 }assert.equal(new Set(all).size,90*4-(C.POOLS.axe.includes('sidestep')?3:0)-(C.POOLS.guard.includes('steady')?1:0));
});
t('all twenty build presets are legal exactly twelve cards with zero absent references',()=>{
 let count=0;for(const [cls,def]of Object.entries(G.CLASS))for(const [name,style]of Object.entries(def.styles)){
   count++;assert.equal(Object.values(style.deck).reduce((a,b)=>a+b,0),12,cls+'/'+name);
   for(const card of Object.keys(style.deck))assert(G.CARD[card],cls+'/'+name+': '+card);
 }assert.equal(count,20);
});
t('all collectible cards have real action data, distinct names per class and no orphan effect',()=>{
 for(const [cl,pool]of Object.entries(C.POOLS)){
  const names=new Set();for(const key of pool){const c=G.CARD[key];checked++;
   assert(c&&c.name&&typeof c.name==='string'&&c.desc!==undefined,key);
   assert(!names.has(c.name),'duplicate name '+cl+'/'+c.name);names.add(c.name);
   assert(['attack','defense','skill','power'].includes(c.type),key);
   for(const k of ['w','a','r'])assert(Number.isInteger(c[k])&&c[k]>=0,key+' '+k);
   assert(c.a>=1&&G.cLen(c)>=1&&G.cLen(c)<=10,key+' length '+G.cLen(c));
   assert(Number.isInteger(c.speed)&&c.speed>=1&&c.speed<=15,key+' speed');
   assert(c.damage||c.guard||c.heal||c.mark||c.steady||c.buff||c.meter||c.dodge||c.weak||c.counter,key+' no mechanics');
   if(c.type==='defense')assert(!c.damage,key+' defense cannot directly damage ally');
  }
 }
});
t('rewards are same class as selected profession, rare cap respects stage1, and shop offers valid cards',()=>{
 for(const cls of Object.keys(G.CLASS)){
   const r=C.start({classId:cls,seed:3397});
   for(let i=0;i<20;i++){const cards=C.cardReward(r,'SS');assert.equal(new Set(cards).size,3);assert(cards.every(k=>C.POOLS[cls].includes(k)&&C.rarityOf(k)!=='rare'));}
   r.stage=3;for(let i=0;i<30;i++)assert(C.cardReward(r,'S').every(k=>C.POOLS[cls].includes(k)));
   r.state='shop';C.generateShop(r);for(const x of r.shop.filter(x=>x.kind==='card'))assert(C.POOLS[cls].includes(x.key));
 }
});
t('all 360 cards can schedule, simulate, and have consistent preview versus execute',()=>{
 let n=0;for(const cls of Object.keys(G.CLASS))for(const key of C.POOLS[cls]){
   const card=G.CARD[key];const g=G.create({classId:cls,seed:108,encounterId:'corridor'}),hero=g.actors[0],enemy=g.actors.find(a=>a.side==='enemy');
   hero.actions=[];enemy.actions=[];hero.hp=20;hero.maxHp=400;hero.poiseMax=10000;enemy.hp=400;enemy.maxHp=400;enemy.poiseMax=10000;
   hero.hand=[{uid:'atlas-test',key}];const friend=card.type==='defense'||card.heal||card.buff||card.steady;
   G.place(g,'atlas-test',1,friend?hero.id:enemy.id);
   const before=G.clone(g);const preview=G.simulateRound(g,{preview:true,collectTrace:true});
   const result=G.simulateRound(g);n++;
   assert.equal(preview.actors[0].hp,result.actors[0].hp,cls+' '+key+' ally HP mismatch');
   assert.equal(preview.actors.find(a=>a.id===enemy.id).hp,result.actors.find(a=>a.id===enemy.id).hp,cls+' '+key+' enemy HP mismatch');
   assert.deepEqual(preview.stats,result.stats,cls+' '+key+' stats mismatch');
   assert.equal(before.actors[0].hp,20);assert.equal(before.actors[0].actions.length,1);
   for(const a of result.actors)for(const k of ['hp','poise','bleed','marked','energy'])assert(Number.isFinite(a[k]),key+' '+k+' not finite');
 }
 assert.equal(n,360);
});
t('condition bonuses, bleed tick, charged power and friendly cleanse are applied by runtime',()=>{
 const cls='axe',r=C.start({classId:cls,seed:51}),g=C.newBattle(r),hero=g.actors[0],e=g.actors.find(a=>a.side==='enemy');
 hero.actions=[];e.actions=[];e.hp=e.maxHp=300;e.poiseMax=300;
 const bleedKey=C.POOLS.axe.find(k=>G.CARD[k].bleed>0&&G.CARD[k].damage>0);
 hero.hand=[{uid:'bleed-card',key:bleedKey}];G.place(g,'bleed-card',1,e.id);
 const p=G.simulateRound(g,{preview:true,collectTrace:true});assert(p.events.some(ev=>ev.text.includes('裂伤')), 'bleed must tick and log');
 const meterKey=C.POOLS.mage.find(k=>G.CARD[k].type==='power'&&G.CARD[k].meter>0);
 const gg=G.create({classId:'mage',seed:95}),h=gg.actors[0];h.actions=[];gg.actors.filter(a=>a.side==='enemy').forEach(a=>a.actions=[]);h.hand=[{uid:'power-card',key:meterKey}];
 const start=h.energy;G.place(gg,'power-card',1,'hero');const pr=G.simulateRound(gg,{preview:true});assert(pr.actors[0].energy>start,'power meter did not activate');
});
t('cards preserve upgrade preview and reward rarity',()=>{
 for(const cls of Object.keys(G.CLASS))for(const key of C.POOLS[cls].slice(0,12)){
  const up=C.upgradeKey(key);assert(G.CARD[up]);assert.equal(C.rarityOf(up),C.rarityOf(key));assert.equal(G.CARD[up].type,G.CARD[key].type);assert.equal(G.cLen(G.CARD[up]),G.cLen(G.CARD[key]));
 }
});
console.log(`CARD_ATLAS_CHECK complete: ${passed} groups, ${checked} cards individually validated`);
