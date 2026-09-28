/* Authored content for the Paperchalk side-on 3D paper stage. */
(function(global){
'use strict';

const scene3d={
  mode:'infinite-voxel-3d',
  spawn:{x:0,y:12,z:0,yaw:0},
  bounds:{minX:-100000,maxX:100000,minY:-100000,maxY:100000},
  terrain:{
    tileSize:1,
    pixelsPerMeter:128,
    texturePixels:128,
    chunkSize:16,
    seed:24681357,
    visibleChunkRadiusXZ:3,
    interactionRowZ:0,
    visibleChunkRadiusY:2,
    maxBuildsPerFrame:5
  },
  layers:{
    far:-8,
    rear:-3,
    terrain:0,
    actor:.45,
    front:2.5
  },
  stageEntities:[
    {id:'far-hills-a',kind:'rock',name:'远山',x:-18,z:-8,width:18,height:6,primary:'#87959a',grounded:true},
    {id:'far-hills-b',kind:'rock',name:'远山',x:18,z:-8,width:20,height:7,primary:'#7d8e91',grounded:true},
    {id:'village-shop',kind:'building',name:'A村街角小楼',x:-12,z:-2.4,width:7,height:5.5,primary:'#9b7d65',secondary:'#d8c29d',grounded:true},
    {id:'village-house-a',kind:'building',name:'A村住宅',x:2,z:-2.2,width:6.5,height:4.8,primary:'#81776d',secondary:'#d6c7a7',grounded:true},
    {id:'village-workshop',kind:'building',name:'A村工坊',x:15,z:-2.5,width:8,height:5.2,primary:'#77898c',secondary:'#d7c69e',grounded:true},
    {id:'tree-a',kind:'tree',name:'树',x:-21,z:-.8,width:3.2,height:5.5,primary:'#486c4b',grounded:true},
    {id:'tree-b',kind:'tree',name:'树',x:-5,z:-.7,width:3,height:5.2,primary:'#4f744d',grounded:true},
    {id:'tree-c',kind:'tree',name:'树',x:9,z:-.75,width:3.3,height:5.8,primary:'#45694b',grounded:true},
    {id:'rock-a',kind:'rock',name:'石块',x:7,z:.25,width:1.5,height:1.1,primary:'#797970',grounded:true},
    {id:'rock-b',kind:'rock',name:'石块',x:-7,z:.2,width:1.2,height:.9,primary:'#858074',grounded:true}
  ]
};

const content={
  version:3,
  world:{
    nodes:[
      {id:'village',name:'A村',x:170,y:650,kind:'village'},
      {id:'meadowFork',name:'风草岔口',x:450,y:640,kind:'junction'},
      {id:'forestGate',name:'旧林入口',x:720,y:350,kind:'forest'},
      {id:'riverbank',name:'枯溪岸',x:740,y:900,kind:'river'},
      {id:'stonePass',name:'浅石谷',x:1010,y:620,kind:'mountain'},
      {id:'oldRuins',name:'古纸遗迹',x:1240,y:170,kind:'ruins'},
      {id:'windmill',name:'风车丘',x:1320,y:430,kind:'windmill'},
      {id:'caveMouth',name:'回声洞口',x:1070,y:1020,kind:'cave'},
      {id:'marsh',name:'雾泽',x:1450,y:960,kind:'marsh'},
      {id:'highland',name:'长草台地',x:1650,y:620,kind:'highland'},
      {id:'brokenBridge',name:'断桥',x:1840,y:900,kind:'bridge'},
      {id:'pineRidge',name:'雾松岭',x:1890,y:330,kind:'forest'},
      {id:'northCamp',name:'北野营地',x:2220,y:160,kind:'camp'},
      {id:'tower',name:'旧塔原',x:2230,y:590,kind:'tower'},
      {id:'sunkenCity',name:'沉纸城',x:2230,y:1020,kind:'ruins'},
      {id:'farShrine',name:'远岬祭坛',x:2540,y:560,kind:'shrine'}
    ],
    routes:[
      {id:'village-road',name:'A村外道路',from:'village',to:'meadowFork',biome:'meadow'},
      {id:'wind-grass-slope',name:'风草坡',from:'meadowFork',to:'forestGate',biome:'meadow'},
      {id:'shallow-creek-road',name:'浅溪旧道',from:'meadowFork',to:'riverbank',biome:'river'},
      {id:'old-forest-edge',name:'旧林边',from:'forestGate',to:'stonePass',biome:'forest'},
      {id:'dry-creek-bank',name:'枯溪岸',from:'riverbank',to:'stonePass',biome:'river'},
      {id:'canopy-road',name:'林冠古道',from:'forestGate',to:'oldRuins',biome:'forest'},
      {id:'ruin-high-slope',name:'遗迹高坡',from:'oldRuins',to:'windmill',biome:'ruins'},
      {id:'shallow-stone-valley',name:'浅石谷',from:'stonePass',to:'windmill',biome:'mountain'},
      {id:'lower-rock-fork',name:'下岩岔路',from:'stonePass',to:'caveMouth',biome:'cave'},
      {id:'echo-cave-way',name:'回声洞道',from:'caveMouth',to:'marsh',biome:'cave'},
      {id:'reed-lowland',name:'芦苇低地',from:'riverbank',to:'marsh',biome:'marsh'},
      {id:'windmill-waste-road',name:'风车荒径',from:'windmill',to:'highland',biome:'meadow'},
      {id:'mist-marsh-boardwalk',name:'雾泽栈道',from:'marsh',to:'highland',biome:'marsh'},
      {id:'north-wind-slope',name:'北风坡',from:'windmill',to:'pineRidge',biome:'highland'},
      {id:'long-grass-tableland',name:'长草台地',from:'highland',to:'pineRidge',biome:'highland'},
      {id:'broken-bridge-road',name:'断桥旧道',from:'highland',to:'brokenBridge',biome:'river'},
      {id:'mist-pine-ridge',name:'雾松岭',from:'pineRidge',to:'northCamp',biome:'forest'},
      {id:'old-post-road',name:'旧驿道',from:'pineRidge',to:'tower',biome:'ruins'},
      {id:'sunken-city-waterway',name:'沉城水路',from:'brokenBridge',to:'sunkenCity',biome:'marsh'},
      {id:'far-cape-old-road',name:'远岬古道',from:'tower',to:'farShrine',biome:'shrine'}
    ]
  },
  scene3d,
  npcs:[],
  enemySpawns:[],
  enemyArchetypes:{
    'rag-drifter':{id:'rag-drifter',maxHp:3,patrolSpeed:1.6,chaseSpeed:3.6,aggroRange:9,attackRange:1.4}
  },
  items:{
    'rough-herb':{
      id:'rough-herb',name:'粗纸药草',desc:'揉碎后能恢复 2 点生命。',
      weight:.1,consumable:true,action:'heal',heal:2
    }
  }
};

function assertUnique(items,label){
  const ids=new Set();
  for(const item of items||[]){
    if(!item||typeof item.id!=='string'||!item.id)throw new Error(label+' contains an item without id');
    if(ids.has(item.id))throw new Error(label+' contains duplicate id: '+item.id);
    ids.add(item.id);
  }
  return ids;
}
function validate(value=content){
  const errors=[];
  try{
    const nodeIds=assertUnique(value.world.nodes,'world.nodes');
    assertUnique(value.world.routes,'world.routes');
    assertUnique(value.scene3d.stageEntities,'scene3d.stageEntities');
    assertUnique(value.npcs,'npcs');
    assertUnique(value.enemySpawns,'enemySpawns');
    for(const route of value.world.routes){
      if(!nodeIds.has(route.from))errors.push('route '+route.id+' missing from node '+route.from);
      if(!nodeIds.has(route.to))errors.push('route '+route.id+' missing to node '+route.to);
    }
    const terrain=value.scene3d.terrain;
    if(!(terrain.tileSize===1&&terrain.pixelsPerMeter===128&&terrain.texturePixels===128&&terrain.chunkSize>=16))errors.push('scene3d terrain scale must be 1m / 128px');
    if(value.scene3d.mode!=='infinite-voxel-3d')errors.push('scene3d mode must be infinite-voxel-3d');
    for(const entity of value.scene3d.stageEntities){
      if(!(entity.width>0&&entity.height>0))errors.push('stage entity '+entity.id+' dimensions invalid');
    }
  }catch(error){errors.push(error.message)}
  return {ok:errors.length===0,errors};
}
function deepFreeze(value){
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.freeze(value);
  for(const key of Object.keys(value))deepFreeze(value[key]);
  return value;
}
const validation=validate(content);
if(!validation.ok)throw new Error('Invalid Paperchalk content: '+validation.errors.join('; '));

global.PaperchalkContentRuntime=Object.freeze({validate,version:content.version});
global.PaperchalkContent=deepFreeze(content);
})(window);
