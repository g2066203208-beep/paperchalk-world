/* Authored content for the Paperchalk open 3D voxel world. */
(function(global){
'use strict';

const scene3d={
  mode:'finite-side-scroll-voxel',
  spawn:{x:-40,y:3,z:2,yaw:0},
  bounds:{minX:-48,maxX:64,minY:-16,maxY:32,minZ:-6,maxZ:6},
  terrain:{
    tileSize:1,
    pixelsPerMeter:128,
    texturePixels:128,
    chunkSize:16,
    seed:24681357,
    visibleChunkRadiusXZ:2,
    interactionRowZ:2,
    blackBackRowZ:-64,
    visibleChunkRadiusY:1,
    maxBuildsPerFrame:5,
    prologueRoad:{
      id:'prologue-city-road-v1',
      minX:-48,maxX:64,
      minZ:-6,maxZ:6,
      groundMinY:-4,surfaceY:0,
      roadMinZ:-3,roadMaxZ:0,
      curbNearZ:1,curbFarZ:-4,
      sidewalkNearMinZ:2,sidewalkFarMaxZ:-5,
      laneMarkerZ:-1,
      crosswalkMinX:6,crosswalkMaxX:16
    },
    biome:{
      version:1,
      spawnSafeRadius:22,
      generator:'multi-noise-landform-v1'
    }
  },
  layers:{
    far:-8,
    rear:-3,
    terrain:0,
    actor:.45,
    front:2.5
  },
  stageEntities:[]
};

const content={
  version:6,
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
  npcs:[
    {
      id:'village-resident-01',name:'村中长者',role:'elder',
      spawn:{x:3.25,z:1.75,yaw:0},home:{x:4,z:3},work:{x:2,z:1},plaza:{x:1,z:1},
      width:1,height:2,facingX:-1,maxHp:10,invulnerable:true,interactable:true,
      collider:{halfW:.34,halfH:.95,halfD:.28},
      personality:{curiosity:.35,sociability:.72,caution:.55},
      ai:{walkSpeed:1.35,visionRange:9,fullSimRange:28,wanderRadius:3.6},
      dialogue:{
        greeting:['早。村里还算安静。','你又回来了。'],
        questStart:'先认识一下A村吧。和三位村民说说话，再回来找我。',
        questReady:'很好，大家已经知道你来了。A村欢迎你。',
        questDone:'有空就多在村里走走。'
      }
    },
    {
      id:'village-resident-02',name:'田地照看人',role:'farmer',
      spawn:{x:-3.0,z:1.6},home:{x:-4,z:3},work:{x:-6,z:2},plaza:{x:1,z:1},
      width:1,height:2,facingX:1,maxHp:10,invulnerable:true,interactable:true,
      collider:{halfW:.34,halfH:.95,halfD:.28},
      personality:{curiosity:.42,sociability:.48,caution:.45},
      ai:{walkSpeed:1.55,visionRange:8,fullSimRange:26,wanderRadius:4.2},
      dialogue:{greeting:['地面每天都不太一样。','我得先看看今天哪块地能走。']}
    },
    {
      id:'village-resident-03',name:'木工',role:'crafter',
      spawn:{x:1.2,z:-3.0},home:{x:3,z:-4},work:{x:5,z:-3},plaza:{x:1,z:1},
      width:1,height:2,facingX:-1,maxHp:10,invulnerable:true,interactable:true,
      collider:{halfW:.34,halfH:.95,halfD:.28},
      personality:{curiosity:.28,sociability:.38,caution:.50},
      ai:{walkSpeed:1.45,visionRange:8,fullSimRange:26,wanderRadius:3.5},
      dialogue:{greeting:['工具还没做齐，先凑合着干。','别踩我刚看好的那块木料。']}
    },
    {
      id:'village-resident-04',name:'溪边人',role:'fisher',
      spawn:{x:-4.2,z:-2.4},home:{x:-3,z:-4},work:{x:-7,z:-4},plaza:{x:1,z:1},
      width:1,height:2,facingX:1,maxHp:10,invulnerable:true,interactable:true,
      collider:{halfW:.34,halfH:.95,halfD:.28},
      personality:{curiosity:.58,sociability:.60,caution:.40},
      ai:{walkSpeed:1.50,visionRange:9,fullSimRange:30,wanderRadius:4.8},
      dialogue:{greeting:['有水的地方，总能找到点东西。','今天的风向不太像昨天。']}
    },
    {
      id:'village-resident-05',name:'搬运人',role:'carrier',
      spawn:{x:4.8,z:-2.1},home:{x:6,z:-1},work:{x:7,z:2},plaza:{x:1,z:1},
      width:1,height:2,facingX:-1,maxHp:10,invulnerable:true,interactable:true,
      collider:{halfW:.34,halfH:.95,halfD:.28},
      personality:{curiosity:.46,sociability:.52,caution:.62},
      ai:{walkSpeed:1.72,visionRange:8.5,fullSimRange:28,wanderRadius:4.0},
      dialogue:{greeting:['路要是被挖断，我就得重新绕。','东西不重，路不好走才麻烦。']}
    }
  ],
  quests:[
    {
      id:'village-intro',name:'认识A村',giver:'village-resident-01',
      objectives:[{id:'meet-three',type:'talk',count:3,npcs:['village-resident-02','village-resident-03','village-resident-04','village-resident-05']}]
    }
  ],
  enemySpawns:[],
  enemyArchetypes:{
    'rag-drifter':{id:'rag-drifter',maxHp:3,patrolSpeed:1.6,chaseSpeed:3.6,aggroRange:9,attackRange:1.4}
  },
  items:{
    'rough-herb':{
      id:'rough-herb',name:'粗纸药草',desc:'揉碎后能恢复 2 点生命。',
      weight:.1,consumable:true,action:'heal',heal:2
    },
    'hand-torch':{
      id:'hand-torch',name:'手持火把',desc:'点亮后跟随玩家移动，为洞穴和夜间提供暖色局部光。',
      weight:.35,consumable:false,action:'toggle-torch',glyph:'🔥',
      light:{color:'#ffb35c',intensity:2.6,distance:10,decay:1.7}
    },
    'water-bucket':{
      id:'water-bucket',name:'水桶',desc:'选择后进入放水模式。每次放下一整格水，内部按 8 层离散水位向下和四周流动直到平衡。',
      weight:1.0,consumable:false,action:'water-tool',glyph:'💧'
    },
    'fishing-rod':{
      id:'fishing-rod',name:'钓鱼竿',desc:'再次使用即可抛竿或收杆。浮漂落入水中后会漂在液面，出现“！”时立即收杆。',
      weight:.65,consumable:false,action:'fishing-rod',glyph:'🎣'
    },
    'paper-carp':{
      id:'paper-carp',name:'纸鲤鱼',desc:'常见淡水鱼。可以直接食用，恢复 22 点饥饿值。',
      weight:.8,consumable:true,action:'eat',hunger:22,glyph:'🐟',fish:true,rarity:'common'
    },
    'bluefin-minnow':{
      id:'bluefin-minnow',name:'蓝鳍小鱼',desc:'游速很快的小型鱼。食用恢复 15 点饥饿值。',
      weight:.35,consumable:true,action:'eat',hunger:15,glyph:'🐠',fish:true,rarity:'common'
    },
    'golden-paperfish':{
      id:'golden-paperfish',name:'金纸鱼',desc:'较少见的金色纸鱼。食用恢复 35 点饥饿值。',
      weight:.95,consumable:true,action:'eat',hunger:35,glyph:'🐡',fish:true,rarity:'rare'
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
    assertUnique(value.quests||[],'quests');
    assertUnique(value.enemySpawns,'enemySpawns');
    for(const npc of value.npcs){
      if(!npc.spawn||!Number.isFinite(Number(npc.spawn.x))||!Number.isFinite(Number(npc.spawn.z)))errors.push('npc '+npc.id+' spawn invalid');
      if(!(Number(npc.width)>0&&Number(npc.height)>0))errors.push('npc '+npc.id+' dimensions invalid');
    }
    for(const route of value.world.routes){
      if(!nodeIds.has(route.from))errors.push('route '+route.id+' missing from node '+route.from);
      if(!nodeIds.has(route.to))errors.push('route '+route.id+' missing to node '+route.to);
    }
    const terrain=value.scene3d.terrain;
    if(!(terrain.tileSize===1&&terrain.pixelsPerMeter===128&&terrain.texturePixels===128&&terrain.chunkSize>=16))errors.push('scene3d terrain scale must be 1m / 128px');
    if(value.scene3d.mode!=='finite-side-scroll-voxel')errors.push('scene3d mode must be finite-side-scroll-voxel');
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
