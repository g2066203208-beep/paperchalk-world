/* Chapter 2: the farmer joins the woodcutter. Only level data; engine reusable. */
(function(root){'use strict';
root.PaperchalkLevelEngine.register({
 id:'forest-02',
 title:'林间劫掠',
 subtitle:'第二关 · 农夫加入，对抗山贼',
 biome:'forest',
 columns:3,rowsPerSide:3,seed:618232,
 objective:'伐木少女与农夫守住农田，击退山贼刀手、弩手与强盗头目',
 camera:{distance:26,elevation:55,fov:33},
 terrain:{initialKind:'grass',minLevel:-3,maxLevel:3},
 units:[
  {id:'woodcutter',side:'ally',r:1,c:0,role:'warrior',faction:'farmer',
   name:'伐木少女',characterId:'farmer-warrior-loli-lumberjack',
   staged:true,hp:12,attack:3},
  {id:'farmer',side:'ally',r:1,c:2,role:'engineer',faction:'farmer',
   name:'农夫',characterId:'farmer-engineer-farmer',
   staged:true,hp:10,attack:2},
  root.PaperchalkBanditRoster.unit('bruiser','bandit-bruiser-a',0,0),
  root.PaperchalkBanditRoster.unit('crossbow','bandit-crossbow-a',1,2),
  root.PaperchalkBanditRoster.unit('captain','bandit-captain-a',2,1)
 ]
});
})(window);
