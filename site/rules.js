export const LANE_COUNT = 5;
export const MAX_DEPTH = 6;
export const MAX_AP = 3;
export const LOCATIONS = [
  {id:'cemetery',name:'墓园',en:'CEMETERY',hint:'墓碑与枯树之间，五条路都通向黑暗。'},
  {id:'church',name:'教堂',en:'CHURCH',hint:'钟楼前的五条道路，后方也并不安全。'},
  {id:'alley',name:'暗巷',en:'ALLEY',hint:'房屋夹着街巷，敌人会从前后包抄。'}
];
export const ENEMY = {
  walker:{name:'徘徊者',en:'WALKER',damage:1},
  crawler:{name:'匍匐者',en:'CRAWLER',damage:1},
  brute:{name:'重装感染者',en:'BRUTE',damage:2}
};
const STARTING_ENEMIES = {
  cemetery: [
    {id:'c1',type:'walker',lane:0,depth:6,side:'front',hp:2},
    {id:'c2',type:'crawler',lane:0,depth:4,side:'front',hp:2},
    {id:'c3',type:'walker',lane:2,depth:5,side:'front',hp:2},
    {id:'c4',type:'walker',lane:4,depth:4,side:'rear',hp:2},
    {id:'c5',type:'brute',lane:3,depth:6,side:'front',hp:4}
  ],
  church: [
    {id:'h1',type:'walker',lane:0,depth:6,side:'front',hp:2},
    {id:'h2',type:'crawler',lane:0,depth:4,side:'front',hp:2},
    {id:'h3',type:'walker',lane:1,depth:5,side:'front',hp:2},
    {id:'h4',type:'brute',lane:2,depth:3,side:'front',hp:4},
    {id:'h5',type:'walker',lane:2,depth:6,side:'front',hp:2},
    {id:'h6',type:'walker',lane:3,depth:5,side:'front',hp:2},
    {id:'h7',type:'crawler',lane:4,depth:4,side:'front',hp:2},
    {id:'h8',type:'crawler',lane:1,depth:3,side:'rear',hp:2}
  ],
  alley: [
    {id:'a1',type:'walker',lane:0,depth:5,side:'front',hp:2},
    {id:'a2',type:'brute',lane:1,depth:6,side:'front',hp:4},
    {id:'a3',type:'walker',lane:2,depth:3,side:'rear',hp:2},
    {id:'a4',type:'crawler',lane:3,depth:5,side:'front',hp:2},
    {id:'a5',type:'walker',lane:4,depth:4,side:'front',hp:2}
  ]
};
const links = {cemetery:['church'],church:['cemetery','alley'],alley:['church']};
export const canMove=(from,to)=>!!links[from]?.includes(to);
export const allCleared=s=>LOCATIONS.every(l=>s.enemies[l.id].length===0);
export const currentEnemies=s=>[...s.enemies[s.current]].sort((a,b)=>b.depth-a.depth||a.lane-b.lane);
export const effectiveDistance=(s,e)=>Math.max(1,Math.min(MAX_DEPTH,e.depth+(e.side==='rear'?s.advance:-s.advance)));
const cardPriority=(a,b)=>effectiveDistance(a.state,a.enemy)-effectiveDistance(b.state,b.enemy);
export function createGame(){
  return {version:2,turn:1,ap:MAX_AP,hp:16,maxHp:16,mag:6,magCap:6,reserve:46,
    medkits:6,flares:3,current:'church',lane:2,advance:0,selected:'h4',
    status:'playing',enemies:structuredClone(STARTING_ENEMIES),
    log:['桌面战场已展开：选择道路、瞄准敌人，留意后方包抄。']};
}
function note(s,m){s.log=[m,...s.log].slice(0,7);}
function checkEnd(s){
  if(s.hp<=0){s.hp=0;s.status='lost';note(s,'防线被突破。你倒下了。');}
  else if(allCleared(s)){s.status='won';note(s,'五条道路恢复寂静。三个场地全部肃清！');}
}
function firstInLane(s,side){
  return s.enemies[s.current].filter(e=>e.lane===s.lane&&e.side===side)
    .sort((a,b)=>effectiveDistance(s,a)-effectiveDistance(s,b)||a.id.localeCompare(b.id))[0];
}
export function perform(state,action){
  if(!state||!action||typeof action.type!=='string')return {state,ok:false,message:'无效操作'};
  if(action.type==='restart')return {state:createGame(),ok:true,message:'重新开始'};
  if(state.status!=='playing')return {state,ok:false,message:'对局已结束，请重新开始'};
  const s=structuredClone(state);
  const fail=message=>({state,ok:false,message});
  const needAP=()=>s.ap>0;
  let message='';
  switch(action.type){
    case 'select':{
      const e=s.enemies[s.current].find(e=>e.id===action.id);
      if(!e)return fail('目标不存在');
      s.selected=e.id;
      message='目标：'+ENEMY[e.type].name+'，'+(e.side==='rear'?'后方':'前方')+'第'+(e.lane+1)+'道，距离 '+effectiveDistance(s,e);
      break;
    }
    case 'lane':{
      const target=Number(action.lane);
      if(!Number.isInteger(target)||target<0||target>=LANE_COUNT)return fail('道路不存在');
      if(target===s.lane)return fail('已经在这条道上');
      if(!needAP())return fail('行动点不足');
      s.lane=target;s.ap--;s.selected=null;
      message='转移到第'+(s.lane+1)+'道（1 AP）';note(s,message);break;
    }
    case 'advance':
    case 'retreat':{
      if(!needAP())return fail('行动点不足');
      if(action.type==='advance'&&s.advance>=2)return fail('已在最前沿');
      if(action.type==='retreat'&&s.advance<=0)return fail('已退至后方');
      s.advance+=action.type==='advance'?1:-1;
      s.ap--;message=action.type==='advance'?'向前推进：正面目标更近，后方更远':'向后撤退：正面目标更远，提防背后';
      note(s,message);break;
    }
    case 'move':{
      if(!needAP())return fail('行动点不足');
      if(!canMove(s.current,action.to))return fail('只能进入相邻场地');
      s.current=action.to;s.ap--;s.selected=null;s.lane=2;s.advance=0;
      message='移动到 '+LOCATIONS.find(l=>l.id===s.current).name+'，五条道路状态已恢复';
      note(s,message);break;
    }
    case 'shoot':{
      if(!needAP())return fail('行动点不足');
      if(s.mag<=0)return fail('弹药耗尽，先装填');
      const chosen=s.enemies[s.current].find(e=>e.id===(action.id||s.selected));
      if(!chosen)return fail('先选择敌人');
      if(chosen.lane!==s.lane)return fail('目标在第'+(chosen.lane+1)+'道，先切换道路');
      const front=firstInLane(s,chosen.side);
      if(front?.id!==chosen.id)return fail('前排敌人挡住了后面的敌人！先处理近处目标');
      const damage=s.advance===2&&chosen.side==='front'?3:2;
      s.ap--;s.mag--;chosen.hp-=damage;
      message='第'+(s.lane+1)+'道击中'+ENEMY[chosen.type].name+'：'+damage+' 伤害';
      if(chosen.hp<=0){
        s.enemies[s.current]=s.enemies[s.current].filter(e=>e.id!==chosen.id);
        s.selected=null;message='第'+(s.lane+1)+'道击倒'+ENEMY[chosen.type].name;
      }
      note(s,message);break;
    }
    case 'reload':{
      if(!needAP())return fail('行动点不足');
      if(s.mag>=s.magCap)return fail('弹匣已满');
      if(s.reserve<=0)return fail('没有备用弹药');
      const n=Math.min(s.magCap-s.mag,s.reserve);s.mag+=n;s.reserve-=n;s.ap--;
      message='装填 '+n+' 发弹药';note(s,message);break;
    }
    case 'heal':{
      if(!needAP())return fail('行动点不足');
      if(s.medkits<1)return fail('医疗包已耗尽');
      if(s.hp===s.maxHp)return fail('生命已满');
      s.hp=Math.min(s.maxHp,s.hp+5);s.medkits--;s.ap--;
      message='使用医疗包，恢复生命';note(s,message);break;
    }
    case 'flare':{
      if(!needAP())return fail('行动点不足');
      if(s.flares<=0)return fail('没有照明弹');
      const affected=s.enemies[s.current].filter(e=>e.lane===s.lane);
      if(affected.length===0)return fail('当前道路没有敌人');
      for(const e of affected)e.depth=Math.min(MAX_DEPTH,e.depth+2);
      s.ap--;s.flares--;
      message='第'+(s.lane+1)+'道敌群被击退两格';note(s,message);break;
    }
    case 'end':{
      let damage=0,steps=0,frontDamage=0,rearDamage=0;
      // Only enemies in the currently occupied field move; other fields retain positions.
      // Both front and rear attackers press the same five defensible lanes.
      for(const e of s.enemies[s.current]){
        if(effectiveDistance(s,e)<=1){
          damage+=ENEMY[e.type].damage;
          if(e.side==='rear')rearDamage+=ENEMY[e.type].damage;
          else frontDamage+=ENEMY[e.type].damage;
        }else{e.depth=Math.max(1,e.depth-1);steps++;}
      }
      s.hp-=damage;s.turn++;s.ap=MAX_AP;
      const attacks=[];
      if(frontDamage)attacks.push('正面 -'+frontDamage+' HP');
      if(rearDamage)attacks.push('背后 -'+rearDamage+' HP');
      message=(attacks.length?attacks.join(' / '):'暂未遭到攻击')+'；'+steps+' 名敌人逼近';
      note(s,message);break;
    }
    default:return fail('未知行动');
  }
  checkEnd(s);
  return {state:s,ok:true,message};
}
export function restoreGame(raw){
  try{
    const s=typeof raw==='string'?JSON.parse(raw):raw;
    if(!s||s.version!==2||!LOCATIONS.some(l=>l.id===s.current))return createGame();
    if(!['playing','won','lost'].includes(s.status))return createGame();
    for(const key of ['hp','ap','mag','reserve','medkits','flares','turn','lane','advance']){
      if(!Number.isInteger(s[key]))return createGame();
    }
    if(s.hp<0||s.hp>16||s.ap<0||s.ap>3||s.mag<0||s.mag>6||s.reserve<0||s.reserve>100
       ||s.medkits<0||s.medkits>9||s.flares<0||s.flares>9||s.turn<1||s.turn>10000
       ||s.lane<0||s.lane>=LANE_COUNT||s.advance<0||s.advance>2)return createGame();
    if(!Array.isArray(s.log)||s.log.length>7||s.log.some(m=>typeof m!=='string'||m.length>240))return createGame();
    const ids=new Set();
    for(const l of LOCATIONS){
      const items=s.enemies?.[l.id];
      if(!Array.isArray(items)||items.length>20)return createGame();
      for(const e of items){
        if(!ENEMY[e.type]||typeof e.id!=='string'||ids.has(e.id)||e.id.length>16||
           !Number.isInteger(e.lane)||e.lane<0||e.lane>=LANE_COUNT||
           !Number.isInteger(e.depth)||e.depth<1||e.depth>MAX_DEPTH||
           !Number.isInteger(e.hp)||e.hp<1||e.hp>4||
           !['front','rear'].includes(e.side))return createGame();
        ids.add(e.id);
      }
    }
    if(s.selected!==null&&typeof s.selected!=='string')return createGame();
    if(s.status==='won'&&!allCleared(s))return createGame();
    return s;
  }catch{return createGame();}
}
