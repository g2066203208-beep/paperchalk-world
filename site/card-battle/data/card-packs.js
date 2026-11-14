/* Declarative gameplay card content. New factions, characters and enemies
 * register packs here (or from additional pack modules). No combat logic,
 * deck shuffle, WebGL, facility placement or per-level code in this file.
 */
(function(root){'use strict';
if(!root.PaperchalkCardRegistry)throw Error('Load card-registry before card-packs');
const catalog=root.PaperchalkCardRegistry.create();
const packs=[
 {id:'warrior-core',scope:'profession',profession:'warrior',cards:[
  {id:'strike',name:'斧劈',type:'attack',power:3,description:'近战造成3点伤害'},
  {id:'heavy-strike',name:'重劈',type:'attack',power:5,description:'重斧造成5点伤害'},
  {id:'cleave',name:'横扫',type:'attack',power:2,shape:'row',description:'对目标所在排造成2点伤害'},
  {id:'guard',name:'架斧',type:'guard',block:3,description:'获得3点格挡'}
 ]},
 {id:'woodcutter-character',scope:'character',profession:'warrior',
  characterId:'farmer-warrior-loli-lumberjack',cards:[
   {id:'lumber',name:'伐木',type:'resource',essence:'material',amount:1,
    description:'获得1材料精华；砍倒己方树木可获得3材料精华',
    interactions:[{cardId:'plant-tree',destroy:true,
     grant:{essence:'material',amount:3}}]}
 ]},
 {id:'ranger-core',scope:'profession',profession:'ranger',cards:[
  {id:'aimed-shot',name:'瞄准射击',type:'attack',power:2},
  {id:'quick-shot',name:'快速射击',type:'attack',power:2},
  {id:'piercing-shot',name:'穿透箭',type:'attack',power:3},
  {id:'cover-fire',name:'掩护射击',type:'attack',power:2},
  {id:'tracking-shot',name:'追踪箭',type:'attack',power:3}
 ]},
 {id:'farmer-ranger',scope:'faction',profession:'ranger',faction:'farmer',cards:[
  {id:'woodsman-arrow',name:'猎户箭',type:'attack',power:3},
  {id:'forest-ambush',name:'林间伏射',type:'attack',power:4},
  {id:'prey-mark',name:'猎物标记',type:'attack',power:2},
  {id:'snare-shot',name:'陷阱射击',type:'attack',power:3},
  {id:'hunting-volley',name:'狩猎连射',type:'attack',power:3}
 ]},
 {id:'farmer-engineer-character',scope:'character',profession:'engineer',
  characterId:'farmer-engineer-farmer',cards:[
   {id:'farm-field',name:'农田',type:'facility',footprint:[1,1],facilityHp:4,
    facilityRole:'production',description:'每回合生产1生命精华'},
   {id:'plant-tree',name:'植树',type:'facility',footprint:[1,1],facilityHp:5,
    facilityRole:'defense',description:'拦截攻击，回合恢复耐久'},
   {id:'water-well',name:'水井',type:'facility',footprint:[1,1],facilityHp:5,
    facilityRole:'support',description:'附近农夫设施的持续效果额外触发'},
   {id:'scarecrow',name:'稻草人',type:'facility',footprint:[1,1],facilityHp:1,
    facilityRole:'decoy',description:'吸收附近队友遭受的一次攻击'},
   {id:'windmill',name:'风车磨坊',type:'facility',footprint:[2,2],facilityHp:7,
    facilityRole:'conversion',description:'每回合转换1生命精华为材料精华'}
 ]},
 {id:'bandit-bruiser-actions',scope:'enemy',archetype:'bruiser',cards:[
  {id:'bandit-cut',name:'砍刀',type:'enemy-action',kind:'attack',damage:2},
  {id:'bandit-shove',name:'凶狠劈砍',type:'enemy-action',kind:'attack',damage:3},
  {id:'bandit-block',name:'架刀防守',type:'enemy-action',kind:'guard',block:2},
  {id:'bandit-rush',name:'扑击',type:'enemy-action',kind:'attack',damage:3},
  {id:'bandit-finish',name:'追斩',type:'enemy-action',kind:'attack',damage:2}
 ]},
 {id:'bandit-crossbow-actions',scope:'enemy',archetype:'crossbow',cards:[
  {id:'crossbow-shot',name:'弩箭',type:'enemy-action',kind:'attack',damage:2},
  {id:'crossbow-aim',name:'找准时机',type:'enemy-action',kind:'guard',block:2},
  {id:'crossbow-precise',name:'精准射击',type:'enemy-action',kind:'attack',damage:3},
  {id:'crossbow-pierce',name:'穿甲弩箭',type:'enemy-action',kind:'attack',damage:2,pierce:true},
  {id:'crossbow-rapid',name:'快速装填',type:'enemy-action',kind:'attack',damage:2}
 ]},
 {id:'bandit-captain-actions',scope:'enemy',archetype:'captain',cards:[
  {id:'captain-raid',name:'劫掠',type:'enemy-action',kind:'raid',damage:2,steal:1},
  {id:'captain-order',name:'凶徒号令',type:'enemy-action',kind:'rally',block:2},
  {id:'captain-cleave',name:'重刀',type:'enemy-action',kind:'attack',damage:3},
  {id:'captain-steal',name:'强行掠夺',type:'enemy-action',kind:'raid',damage:3,steal:1},
  {id:'captain-guard',name:'戒备',type:'enemy-action',kind:'guard',block:3}
 ]}
];
for(const pack of packs)catalog.registerPack(pack);
root.PaperchalkCardCatalog=catalog;
})(window);
