/* Authored game content. Runtime code consumes stable IDs instead of owning story data. */
(function(global){
'use strict';

const query=typeof location==='object'&&location?String(location.search||''):'';
const fixtureMode=/(?:[?&])core-regression(?:=|&|$)/.test(query)||/[?&]ci=(?:ui-smoke|gpu-smoke)(?:&|$)/.test(query);

const content={
  version:1,
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
      {id:'village-road',name:'A村外道路',from:'village',to:'meadowFork',biome:'meadow',bend:0},
      {id:'wind-grass-slope',name:'风草坡',from:'meadowFork',to:'forestGate',biome:'meadow',bend:-38},
      {id:'shallow-creek-road',name:'浅溪旧道',from:'meadowFork',to:'riverbank',biome:'river',bend:42},
      {id:'old-forest-edge',name:'旧林边',from:'forestGate',to:'stonePass',biome:'forest',bend:36},
      {id:'dry-creek-bank',name:'枯溪岸',from:'riverbank',to:'stonePass',biome:'river',bend:-28},
      {id:'canopy-road',name:'林冠古道',from:'forestGate',to:'oldRuins',biome:'forest',bend:-46},
      {id:'ruin-high-slope',name:'遗迹高坡',from:'oldRuins',to:'windmill',biome:'ruins',bend:24},
      {id:'shallow-stone-valley',name:'浅石谷',from:'stonePass',to:'windmill',biome:'mountain',bend:-18},
      {id:'lower-rock-fork',name:'下岩岔路',from:'stonePass',to:'caveMouth',biome:'cave',bend:52},
      {id:'echo-cave-way',name:'回声洞道',from:'caveMouth',to:'marsh',biome:'cave',bend:-24},
      {id:'reed-lowland',name:'芦苇低地',from:'riverbank',to:'marsh',biome:'marsh',bend:38},
      {id:'windmill-waste-road',name:'风车荒径',from:'windmill',to:'highland',biome:'meadow',bend:18},
      {id:'mist-marsh-boardwalk',name:'雾泽栈道',from:'marsh',to:'highland',biome:'marsh',bend:-30},
      {id:'north-wind-slope',name:'北风坡',from:'windmill',to:'pineRidge',biome:'highland',bend:-52},
      {id:'long-grass-tableland',name:'长草台地',from:'highland',to:'pineRidge',biome:'highland',bend:-18},
      {id:'broken-bridge-road',name:'断桥旧道',from:'highland',to:'brokenBridge',biome:'river',bend:34},
      {id:'mist-pine-ridge',name:'雾松岭',from:'pineRidge',to:'northCamp',biome:'forest',bend:-24},
      {id:'old-post-road',name:'旧驿道',from:'pineRidge',to:'tower',biome:'ruins',bend:32},
      {id:'sunken-city-waterway',name:'沉城水路',from:'brokenBridge',to:'sunkenCity',biome:'marsh',bend:26},
      {id:'far-cape-old-road',name:'远岬古道',from:'tower',to:'farShrine',biome:'shrine',bend:-14}
    ]
  },
  npcs:fixtureMode?[
{
      id:'npc-phone-girl',x:760,z:0,name:'？？？',portrait:'phone-girl-offline',
      sprite:'./assets/npcs/phone-girl-offline-r1.webp?v=npc-left-r15',
      dialoguePortrait:'./assets/npcs/phone-girl-offline-r1.webp?v=npc-left-r15',
      text:'……你好。',
      dialogue:{
        opening:'……你好。',
        choices:[
          {text:'你是谁？',reply:'……暂时不重要。'},
          {text:'你在看手机？',reply:'嗯。只是随便看看。'},
          {text:'我先走了。',reply:'好。'}
        ]
      }
    }
  ]:[],
  enemySpawns:fixtureMode?[
{id:'enemy-1',archetype:'rag-drifter',x:2140,z:0,patrolMin:2010,patrolMax:2290},
    {id:'enemy-2',archetype:'rag-drifter',x:4780,z:0,patrolMin:4680,patrolMax:4920}
  ]:[],
  enemyArchetypes:{
    'rag-drifter':{
      id:'rag-drifter',
      maxHp:3,
      patrolSpeed:48,
      chaseSpeed:118,
      aggroRange:700,
      sleepRange:1650,
      attackRange:84,
      asset:'./assets/enemies/rag-drifter.svg?v=1'
    }
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
  for(const item of items){
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
    assertUnique(value.npcs,'npcs');
    assertUnique(value.enemySpawns,'enemySpawns');
    const enemyTypeIds=new Set(Object.keys(value.enemyArchetypes));
    for(const spawn of value.enemySpawns){
      if(!enemyTypeIds.has(spawn.archetype))errors.push('enemy spawn '+spawn.id+' missing archetype '+spawn.archetype);
    }
    for(const route of value.world.routes){
      if(!nodeIds.has(route.from))errors.push('route '+route.id+' missing from node '+route.from);
      if(!nodeIds.has(route.to))errors.push('route '+route.id+' missing to node '+route.to);
    }
    for(const npc of value.npcs){
      if(!npc.dialogue||!Array.isArray(npc.dialogue.choices))errors.push('npc '+npc.id+' has invalid dialogue');
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
