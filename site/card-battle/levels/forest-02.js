/* Chapter 2: the farmer joins the woodcutter. Only level data; engine reusable. */
(function(root){'use strict';
root.PaperchalkLevelEngine.register({
 id:'forest-02',
 title:'林间农田',
 subtitle:'第二关 · 农夫加入',
 biome:'forest',
 columns:3,rowsPerSide:3,seed:618232,
 objective:'和农夫一起守住林间农田，击败三名敌人',
 camera:{distance:26,elevation:55,fov:33},
 terrain:{initialKind:'grass',minLevel:-3,maxLevel:3},
 units:[
  {id:'woodcutter',side:'ally',r:1,c:0,role:'warrior',faction:'farmer',
   name:'伐木少女',characterId:'farmer-warrior-loli-lumberjack',
   staged:true,hp:12,attack:3},
  {id:'farmer',side:'ally',r:1,c:2,role:'engineer',faction:'farmer',
   name:'农夫',characterId:'farmer-engineer-farmer',
   staged:true,hp:10,attack:2},
  {id:'forest-foe-a',side:'enemy',r:0,c:0,role:'enemy',
   name:'林间巡游者',hp:6,attack:1,
   intentCycle:[{kind:'attack',damage:1},{kind:'attack',damage:2}]},
  {id:'forest-foe-b',side:'enemy',r:1,c:2,role:'enemy',
   name:'林间守卫',hp:7,attack:1,
   intentCycle:[{kind:'guard',block:2},{kind:'attack',damage:1},{kind:'attack',damage:2}]},
  {id:'forest-foe-c',side:'enemy',r:2,c:1,role:'enemy',
   name:'林间拦路者',hp:5,attack:1,
   intentCycle:[{kind:'attack',damage:1},{kind:'guard',block:2},{kind:'attack',damage:1}]}
 ]
});
})(window);
