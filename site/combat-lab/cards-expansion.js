/* PAPERCHALK CARD ATLAS V1.6 — exactly 90 obtainable cards per hero class.
 * Engine-owned states implement effects. Do not add visual-only card abilities.
 * 8 handcrafted combat disciplines x 10 named cards each, plus original cards;
 * the collection counts 90 including original obtainable cards (not Finishers).
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.PaperchalkCards=api;
 if(root.Timegrid)api.install(root.Timegrid);
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const RAW={
 axe:[
 ['fracture','破甲','斧背试击|裂纹敲击|防隙架势|连环裂甲|斜切棱角|凿骨猛劈|弧形破壳|钢柄护持|锈甲崩解|坠星破壁'],
 ['bleed','流血','薄刃割伤|断续血痕|以伤止伤|深红切线|撕裂追击|残月血刃|血路横扫|血战屏息|赤痕收割|满月猩风'],
 ['combo','连斩','半月抢击|折返试斩|疾步卸势|连斧疾行|回旋拍击|双向追斩|环身连舞|挥刃呼应|螺旋断空|百重斧影'],
 ['guard','逆守','斧面封挡|错身防御|顺势借力|后撤反击|护腕震击|盾式格挡|逆斩护阵|沉肩稳势|铁雨反身|绝地回斩'],
 ['execute','处决','裁影刃尖|裂隙盯防|静候终场|残血追击|断首重拍|危险边缘|刑场横斧|临界止息|月下断章|破晓终幕'],
 ['stagger','破势','锤柄点压|斧背压迫|止颤防线|错骨震荡|叠势猛挥|硬直穿透|重力横击|镇痛支援|崩山震裂|震界宣告'],
 ['meter','斗志','战意初鸣|怒火试探|握柄呼吸|斗志斜切|肾上连挥|热血推进|破雾战吼|余烬再燃|临渊鼓舞|不屈战歌'],
 ['pierce','重斩','沉锋下压|侧刃深切|稳身蓄防|破阵斜落|铆钉震飞|侧翼劈裂|双峰断路|钢脊抗击|天穹裂缝|终极坠斧']],
 gun:[
 ['combo','速射','贴身点火|双击试枪|滑步换位|掠影短连|枪口追尾|转角速射|弹雨封路|稳定呼吸|残影连射|十字弹幕'],
 ['mark','狙猎','红点搜寻|目镜校准|稳枪预备|追踪穿针|精确弹道|瞄隙封锁|透镜扫射|瞄准援护|弱点贯心|天眼锁定'],
 ['pierce','穿透','薄壳试弹|钢板探针|钢芯掩护|破甲单发|贯通弹链|超音弹头|弹道撕幕|合金护手|高能破甲|直线穿城'],
 ['stagger','压制','警告鸣枪|压制点射|据枪稳姿|阻断扫射|震颤三击|硬直封锁|围点火网|火线支援|封喉疾射|雷霆禁区'],
 ['guard','机动','侧滚射击|应急撤离|近身掩护|灵巧折返|盲点跳射|障碍突击|旋身散射|避弹护阵|无影短停|烟幕穿梭'],
 ['bleed','裂伤','擦伤子弹|流血示警|临时包扎|裂甲跳弹|深创连击|锐化弹雨|割裂射线|绷带支援|红雨连环|深渊穿刺'],
 ['meter','装填','蓄能开火|绝杀计数|换匣校准|满匣追击|迅速装弹|冲锋火线|全域火力|充能掩体|越限齐射|终端弹仓'],
 ['execute','终击','余弹射击|准星下压|后手架枪|死角突袭|残血追枪|杀意狙断|锁定歼灭|最后掩护|零点贯穿|日蚀弹痕']],
 guard:[
 ['guard','铁壁','小盾护腕|短暂格挡|盾面回收|前压盾阵|重心下沉|厚壁承压|四向屏障|磐石守护|无懈坚城|不落壁垒'],
 ['combo','反击','盾缘点刺|返身压制|稳步防反|格挡连推|盾刺追身|联动反击|回廊震击|举盾声援|千层反制|反击风暴'],
 ['pierce','盾破','边缘穿刺|锚点敲击|硬盾抵抗|直冲盾撞|贯通盾刃|撞角破甲|环列破城|重锤协守|金属狂潮|断壁之拳'],
 ['stagger','镇压','脚步威慑|压迫试探|屏息稳势|横推压制|重击震颤|失稳震波|镇压旋转|定神护体|行刑压阵|静止禁域'],
 ['steady','庇护','肩并肩|稳定握持|共同呼吸|紧急庇护|交替支撑|并肩护卫|阵地回环|全队镇定|强韧领域|黎明誓约'],
 ['execute','钝击','盾角点杀|压腕反砸|格挡收身|重手处置|贴身破脑|临界敲击|最后推进|硬盾救援|裁决铁拳|陨星压城'],
 ['bleed','棘盾','锋缘试压|逆刺探针|荆棘格挡|破皮回击|碎甲倒刺|反咬裂伤|铁棘扩散|阵内疗伤|赤铁荆棘|万刺归盾'],
 ['meter','战旗','喊阵助威|队伍点名|信号稳姿|旗令突进|凝神冲阵|士气激发|破雾冲锋|战歌守护|铜钟召集|最后的城墙']],
 mage:[
 ['mark','印记','薄雾刻印|印痕标注|封印护阵|异象定位|回声标枪|印记震荡|刻印扩散|符纸庇护|宿命连锁|空白之名'],
 ['combo','共鸣','微弱脉冲|双环探测|低频屏障|叠波冲击|连续回声|相位共击|群星脉冲|同频共护|千波涌流|万象共振'],
 ['bleed','腐蚀','微量蚀刻|霉斑追踪|应急隔离|腐蚀波形|深层侵染|感染激波|毒雾漫溢|净化薄幕|黑潮蔓生|渗透终点'],
 ['stagger','失衡','低频杂音|错相闪烁|静滞护层|偏移冲击|脑鸣脉动|共振击倒|群体震耳|平衡回授|时空塌落|彻底静默'],
 ['guard','防护','薄纱结界|紧急断电|宁静护身|镜面折射|反弹回波|连环护盾|广域屏障|细胞镇定|金光墙幕|永恒圣域'],
 ['steady','复原','镇痛抚慰|呼吸引导|小型回复|深层镇静|转伤愈合|生命再接|群体回稳|安眠颂歌|不息疗愈|黎明重塑'],
 ['meter','仪式','能量预热|符文积攒|蓄能守护|触媒点火|聚焦轰鸣|仪式推进|八方蓄力|空灵续航|满月祷言|无限回响'],
 ['execute','预言','末日预兆|未来定位|预知守护|追刻命轨|分支处决|命运绽放|全域预测|逆命守护|宿命终曲|终焉观测']]
};
const BASE={
 axe:{common:['cut','slash','stance','feint','sidestep'],uncommon:['heavy','cleave','whirl','brace','reversal'],rare:['sweep']},
 gun:{common:['shot','sidestep','bulletguard','cover'],uncommon:['focus','burst','suppress','respite'],rare:['aim','buckshot']},
 guard:{common:['jab','bash','guardwall','rally','sidestep','steady'],uncommon:['counter','smash'],rare:['shockwave']},
 mage:{common:['pulse','ward','remedy','sidestep','steady'],uncommon:['seal','rupture','echo'],rare:['trance','nova']}
};
const TARGET_RARITY={common:30,uncommon:40,rare:20};
const ARCHETYPES={
 axe:[['bleed','血痕猎杀'],['stagger','震荡破势'],['guard','铁壁反击']],
 gun:[['mark','猎手索敌'],['stagger','战场压制'],['guard','机动援护']],
 guard:[['steady','协同庇护'],['combo','盾阵反击'],['meter','战意指挥']],
 mage:[['bleed','异蚀侵染'],['mark','符文预言'],['meter','调律蓄能']]
};
const SPECIAL_DESC={bonusMarked:'标记追击',bonusBleed:'裂伤追击',bonusStaggered:'失稳追加',bonusWindup:'打断前摇',bonusCombo:'连携追加',bonusExecute:'残血斩杀',bonusLowHp:'逆境反攻'};
function buildCard(classId,theme,themeIndex,slot,name,tier){
 const weight=tier==='rare'?2:tier==='uncommon'?1:0;
 const v=(themeIndex*3+slot)%4;
 const id='c_'+classId+'_'+String(themeIndex+1).padStart(2,'0')+'_'+String(slot+1).padStart(2,'0');
 let card={id,name,type:'attack',w:0,a:1,r:1,damage:7+weight*2+v,charge:7+weight*2,speed:8,archetype:theme[0],classId};
 switch(slot){
 case 0:card={...card,w:0,a:1,r:1,damage:6+weight*2+v,speed:10};break;
 case 1:card={...card,type:'skill',w:0,a:1,r:1,damage:3+weight+v,mark:1+weight,speed:9};break;
 case 2:card={...card,type:'defense',w:0,a:2+Math.min(weight,1),r:1,guard:9+weight*3+v,damage:undefined,speed:9};break;
 case 3:card={...card,w:1,a:1,r:1,damage:11+weight*3+v,speed:7};break;
 case 4:card={...card,w:1,a:2,r:1,damage:5+weight*2+v,speed:7};break;
 case 5:card={...card,type:'skill',w:1,a:1,r:1,damage:8+weight*2+v,breakPower:3+weight*2,speed:7};break;
 case 6:card={...card,w:1,a:1,r:2,damage:6+weight*2+v,aoe:true,speed:6};break;
 case 7:card={...card,type:'skill',w:0,a:1,r:1,damage:undefined,heal:5+weight*2+v,steady:5+weight*2,charge:8,speed:9};break;
 case 8:card={...card,w:2,a:1,r:2,damage:17+weight*3+v,poisePower:5+weight*2,speed:5};break;
 case 9:card={...card,w:1,a:2,r:2,damage:9+weight*2+v,aoe:true,speed:6};break;
 }
 const t=theme[0];
 if(t==='fracture'||t==='pierce'){if(card.damage){card.pierce=(card.pierce||0)+1+weight*2;card.breakPower=(card.breakPower||0)+2+weight*2;card.bonusStaggered=2+weight*3;}else if(card.guard){card.counter=3+weight*2;}}
 if(t==='bleed'){if(card.damage){card.bleed=1+weight+(slot>=8?1:0);if(slot>=4)card.bonusBleed=2+weight*3;}else if(card.guard)card.counter=2+weight;else if(card.heal){card.cleanse=true;}}
 if(t==='combo'){if(card.damage)card.bonusCombo=3+weight*3;else if(card.guard)card.counter=4+weight*2;else if(card.heal){card.buff=2+weight;}}
 if(t==='guard'){if(card.guard){card.guard+=2+weight*2;card.counter=3+weight*2;}else if(card.damage)card.bonusWindup=2+weight;else if(card.heal)card.steady+=7;}
 if(t==='execute'){if(card.damage){card.bonusExecute=4+weight*4;if(slot>=8)card.bonusLowHp=5+weight*2;}else if(card.guard)card.counter=4+weight;else if(card.heal)card.buff=2+weight;}
 if(t==='stagger'){if(card.damage)card.poisePower=(card.poisePower||0)+5+weight*3;else if(card.guard)card.steady=6+weight*2;else if(card.heal)card.steady+=6;}
 if(t==='meter'){card.meter=(card.damage?2:5)+weight*3+(slot===9?5:0);if(card.damage)card.bonusMarked=2+weight*2;else if(card.guard)card.steady=5+weight*2;}
 if(t==='mark'){if(card.damage)card.bonusMarked=2+weight*2;if(card.mark){card.mark+=weight;}else if(!card.guard&&!card.heal&&(slot===3||slot===8))card.mark=1+weight;}
 if(t==='steady'){if(card.guard||card.heal)card.steady=(card.steady||0)+7+weight*3;else if(card.damage)card.poisePower=(card.poisePower||0)+3+weight;}
 if(t==='support'){if(card.heal)card.heal+=4;else if(card.guard)card.guard+=3;else if(card.damage)card.bonusCombo=4;}
 if(t==='charge'){card.meter=(card.meter||0)+6;}
 if(slot===1&&(t==='stagger'||t==='guard'))card.weak=1+weight;
 if(slot===7&&(themeIndex%3===0)){card.type='power';delete card.heal;delete card.steady;card.buff=2+weight;card.meter=(card.meter||0)+3;}
 if(slot===9&&t==='meter'){card.type='power';delete card.damage;delete card.aoe;card.a=1;card.buff=5+weight;card.meter=(card.meter||0)+8;}
 if(slot===8&&t==='bleed'){card.damage+=4;card.recoil=2+weight;}
 if(slot===9&&tier==='rare'&&(t==='meter'||t==='guard'))card.exhaust=true;
 // Some slots deliberately specialize rather than combine attack with healing.
 if(themeIndex%3===2&&slot===0){card.r=2;card.damage+=2;}
 if(themeIndex%3===1&&slot===4){card.a=3;card.damage=Math.max(3,card.damage-2);}
 if(themeIndex%3===0&&slot===6){card.w=2;card.damage+=2;}
 if(card.type==='defense')delete card.damage;
 if(name==='最终守夜令')card={...card,type:'defense',w:1,a:3,r:2,guard:30,steady:16,counter:10,meter:8,damage:undefined,aoe:false,buff:undefined,exhaust:true,speed:7};
 if(!card.damage)for(const k of Object.keys(SPECIAL_DESC))delete card[k];
 const desc=[];
 if(card.damage)desc.push(card.a>1?`生效${card.a}格各${card.damage}伤害`:`${card.damage}伤害`);
 if(card.guard)desc.push(`持续${card.a}格共享${card.guard}格挡`);
 if(card.heal)desc.push(`回复${card.heal}`);
 if(card.steady)desc.push(`硬直−${card.steady}`);
 if(card.mark)desc.push(`标记+${card.mark}`);
 if(card.weak)desc.push(`虚弱+${card.weak}`);
 if(card.bleed)desc.push(`裂伤+${card.bleed}`);
 if(card.pierce)desc.push(`穿甲${card.pierce}`);
 if(card.breakPower)desc.push(`破防压力+${card.breakPower}`);
 if(card.poisePower)desc.push(`额外硬直+${card.poisePower}`);
 if(card.counter)desc.push(`格挡反击${card.counter}`);
 if(card.buff)desc.push(`强化后续2次攻击+${card.buff}`);
 if(card.meter)desc.push(`绝杀充能+${card.meter}`);
 if(card.cleanse)desc.push('清除裂伤/虚弱');
 if(card.recoil)desc.push(`自损${card.recoil}（高风险）`);
 if(card.exhaust)desc.push("本场消耗");
 if(card.aoe)desc.push('敌方全体');
 for(const [k,label] of Object.entries(SPECIAL_DESC))if(card[k])desc.push(`${label}+${card[k]}`);
 card.desc=desc.join(' · ');
 return card;
}
function catalog(){
 const cards={},rarity={},pools={},tracks={};
 for(const [cls,themes] of Object.entries(RAW)){
  const originals=[...BASE[cls].common,...BASE[cls].uncommon,...BASE[cls].rare];
  const count=90-originals.length;
  const records=[];for(let i=0;i<themes.length;i++)for(let j=0;j<10;j++){
   const name=themes[i][2].split('|')[j];if(!name)throw Error('卡名缺失：'+cls+' '+i+' '+j);
   records.push({theme:themes[i],themeIndex:i,slot:j,name,id:'c_'+cls+'_'+String(i+1).padStart(2,'0')+'_'+String(j+1).padStart(2,'0')});
  }
  // Remove one or zero low-impact end-of-track entries only where the original
  // class already has a larger base pool. A 90-card roster stays exact.
  if(records.length<count)records.push({theme:['meter','守夜',''],themeIndex:8,slot:9,name:'最终守夜令',id:'c_guard_09_10'});
  records.length=count;
  const quotas=Object.fromEntries(Object.keys(TARGET_RARITY).map(k=>[k,TARGET_RARITY[k]-BASE[cls][k].length]));
  const rarityRank=[...records].sort((a,b)=>(a.slot+((a.themeIndex*3)%7)*.035)-(b.slot+((b.themeIndex*3)%7)*.035));
  const assigned=new Map();for(let i=0;i<rarityRank.length;i++)assigned.set(rarityRank[i].id,i<quotas.common?'common':i<quotas.common+quotas.uncommon?'uncommon':'rare');
  pools[cls]=[...originals];tracks[cls]=[];
  for(const rec of records){const tier=assigned.get(rec.id),c=buildCard(cls,rec.theme,rec.themeIndex,rec.slot,rec.name,tier);c.rarity=tier;cards[c.id]=c;rarity[c.id]=tier;pools[cls].push(c.id);tracks[cls].push({id:c.id,archetype:c.archetype,rarity:tier});}
  if(pools[cls].length!==90)throw Error('Card catalog count invalid '+cls);
 }
 return {cards,rarity,pools,tracks};
}
const DATA=catalog();
function install(G){
 if(!G||!G.CARD||!G.CLASS)throw Error('Missing Timegrid engine');
 for(const [k,c] of Object.entries(DATA.cards))G.CARD[k]=c;
 // Three additional fully playable 12-card starting builds per class. Original
 // two starts are preserved. The new builds are not free cards added mid-run.
 for(const [cls,builds] of Object.entries(ARCHETYPES)){
  const entries=DATA.tracks[cls];
  for(let i=0;i<builds.length;i++){
   const [tag,title]=builds[i];const matching=entries.filter(x=>x.archetype===tag);
   const support=entries.filter(x=>x.archetype!==tag&&x.rarity==='common');
   const choices=[...matching.filter(x=>x.rarity==='common').slice(0,3),...matching.filter(x=>x.rarity==='uncommon').slice(0,2),...support.slice(i*2,i*2+2)];
   const seed=Object.keys(G.CLASS[cls].styles)[0],base=G.CLASS[cls].styles[seed];
   const original=Object.entries(base.deck).filter(([key])=>!key.startsWith('c_')).slice(0,4);
   const deck={};for(const [k,n] of original)deck[k]=Math.min(2,n);
   for(const c of choices)deck[c.id]=(deck[c.id]||0)+1;
   while(Object.values(deck).reduce((s,n)=>s+n,0)<12){const k=matching.find(x=>!deck[x.id])?.id||matching[0]?.id;if(!k)throw Error('Build incomplete');deck[k]=(deck[k]||0)+1;}
   // keep a stable 12-card starter, no duplicate/exploit loop.
   while(Object.values(deck).reduce((s,n)=>s+n,0)>12){const k=Object.keys(deck).at(-1);if(deck[k]>1)deck[k]--;else delete deck[k];}
   G.CLASS[cls].styles['atlas_'+tag]={name:title,description:`${title} · 时间格与协同卡组`,deck};
  }
 }
 return DATA;
}
return{...DATA,BASE,ARCHETYPES,TARGET_RARITY,install};
});
