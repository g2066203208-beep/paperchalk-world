/* First mission: tutorial-sized board. Data only, no graphics. */
(function(root){
'use strict';
root.PaperchalkLevelEngine.register({
 id:'forest-01',
 title:'林间小路',
 subtitle:'第一关 · 农民组织',
 biome:'forest',
 columns:3,
 rowsPerSide:3,
 seed:618231,
 objective:'击败森林里的两名敌人',
 camera:{distance:26,elevation:55,fov:33},
 terrain:{initialKind:'grass',minLevel:-3,maxLevel:3},
 units:[
  {id:'woodcutter',side:'ally',r:1,c:1,role:'warrior',faction:'farmer',name:'伐木少女',characterId:'farmer-warrior-loli-lumberjack',hp:12,attack:3},
  {id:'forest-foe-a',side:'enemy',r:1,c:0,role:'enemy',name:'森林敌人A',hp:4,attack:1},
  {id:'forest-foe-b',side:'enemy',r:1,c:2,role:'enemy',name:'森林敌人B',hp:4,attack:1}
 ]
});
})(window);
