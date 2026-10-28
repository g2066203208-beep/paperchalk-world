export const LOCATIONS = [
  { id: 'cemetery', name: '墓园', en: 'CEMETERY', hint: '墓碑之间有微弱的脚步声。' },
  { id: 'church', name: '教堂', en: 'CHURCH', hint: '破损的钟楼仍然指向夜空。' },
  { id: 'alley', name: '暗巷', en: 'ALLEY', hint: '狭窄的道路藏着不安的动静。' },
];
export const ENEMY = {
  walker: { name: '徘徊者', en: 'WALKER', damage: 1, flavor: '缓慢地接近。' },
  crawler: { name: '匍匐者', en: 'CRAWLER', damage: 1, flavor: '在阴影中爬行。' },
  brute: { name: '重装感染者', en: 'BRUTE', damage: 2, flavor: '近距离攻击造成 2 点伤害。' }
};
export const MAX_AP = 3;
const INIT_ENEMIES = {
  cemetery: [
    { id: 'c1', type: 'walker', hp: 3, distance: 3 },
    { id: 'c2', type: 'crawler', hp: 2, distance: 2 }
  ],
  church: [
    { id: 'h1', type: 'walker', hp: 3, distance: 3 },
    { id: 'h2', type: 'crawler', hp: 2, distance: 2 },
    { id: 'h3', type: 'brute', hp: 4, distance: 1 }
  ],
  alley: [
    { id: 'a1', type: 'walker', hp: 2, distance: 3 },
    { id: 'a2', type: 'brute', hp: 4, distance: 2 }
  ]
};
const neighbors = { church: ['cemetery', 'alley'], cemetery: ['church'], alley: ['church'] };
export function createGame() {
  return {
    version: 1, turn: 1, ap: MAX_AP, hp: 9, maxHp: 9, mag: 5, magCap: 6, reserve: 14,
    medkits: 3, flares: 2, current: 'church', selected: 'h3', status: 'playing',
    enemies: structuredClone(INIT_ENEMIES),
    log: ['你抵达教堂。清除三个区域内全部感染者。']
  };
}
export function allCleared(s) {
  return LOCATIONS.every(loc => s.enemies[loc.id]?.length === 0);
}
export function canMove(from, to) {
  return Boolean(neighbors[from]?.includes(to));
}
export function currentEnemies(s) {
  return (s.enemies[s.current] || []).slice().sort((a,b)=>b.distance - a.distance);
}
function record(s, message) {
  s.log = [message, ...s.log].slice(0, 7);
}
function target(s, id) {
  const enemies = s.enemies[s.current];
  return enemies.find(e => e.id === (id || s.selected))
    || enemies.slice().sort((a,b)=>a.distance-b.distance)[0];
}
function finishCheck(s) {
  if (s.hp <= 0) { s.hp=0; s.status='lost'; record(s, '你倒下了。按「重新开始」再试一次。'); }
  else if (allCleared(s)) { s.status='won'; record(s, '三个区域全部肃清！你活过了这一夜。'); }
}
export function perform(state, action) {
  if (!state || !action || typeof action.type !== 'string') return {state,ok:false,message:'无效操作'};
  if (action.type === 'restart') return {state:createGame(),ok:true,message:'重新开始'};
  if (state.status !== 'playing') return {state,ok:false,message:'本局已结束，请重新开始'};
  const s=structuredClone(state);
  const fail=(message)=>({state,ok:false,message});
  let message='';
  if (action.type === 'select') {
    if (!s.enemies[s.current].some(e => e.id === action.id)) return fail('目标不存在');
    s.selected = action.id;
    message = '已瞄准目标';
  } else if (action.type === 'move') {
    if (s.ap < 1) return fail('行动点不足，请结束回合');
    if (!canMove(s.current,action.to)) return fail('只能移动到相邻场地');
    s.current=action.to; s.ap--; s.selected=null;
    message='移动到'+LOCATIONS.find(l=>l.id===s.current).name+'（消耗 1 行动点）';
    record(s,message);
  } else if (action.type === 'shoot') {
    if (s.ap < 1) return fail('行动点不足，请结束回合');
    if (s.mag < 1) return fail('弹匣为空，请装填');
    const e=target(s,action.id);
    if (!e) return fail('当前场地没有目标');
    s.ap--;s.mag--;e.hp-=2;s.selected=e.id;
    message='命中'+ENEMY[e.type].name+'，造成 2 点伤害';
    if(e.hp<=0) {
      s.enemies[s.current]=s.enemies[s.current].filter(x=>x.id!==e.id);
      s.selected=null;message='击倒'+ENEMY[e.type].name+'！';
    }
    record(s,message);
  } else if (action.type === 'reload') {
    if(s.ap<1)return fail('行动点不足，请结束回合');
    if(s.mag>=s.magCap)return fail('弹匣已满');
    if(s.reserve<=0)return fail('没有备用弹药');
    let count=Math.min(s.magCap-s.mag,s.reserve);
    s.mag+=count;s.reserve-=count;s.ap--;
    message='装填 '+count+' 发弹药';record(s,message);
  } else if (action.type === 'heal') {
    if(s.ap<1)return fail('行动点不足，请结束回合');
    if(s.medkits<1)return fail('没有医疗包');
    if(s.hp>=s.maxHp)return fail('生命值已满');
    s.medkits--;s.ap--;s.hp=Math.min(s.maxHp,s.hp+3);
    message='包扎伤口，恢复生命';record(s,message);
  } else if (action.type === 'flare') {
    if(s.ap<1)return fail('行动点不足，请结束回合');
    if(s.flares<1)return fail('照明弹已耗尽');
    if(s.enemies[s.current].length===0)return fail('附近没有敌人');
    s.ap--;s.flares--;
    for(const e of s.enemies[s.current])e.distance=Math.min(3,e.distance+1);
    message='投掷照明弹：当前场地敌人后退一格';record(s,message);
  } else if (action.type === 'end') {
    let damage=0;let approaching=0;
    for(const e of s.enemies[s.current]) {
      if(e.distance>1){e.distance--;approaching++;}
      else damage+=ENEMY[e.type].damage;
    }
    s.hp-=damage;s.turn++;s.ap=MAX_AP;
    message=damage? '敌人近身攻击，失去 '+damage+' 点生命':'敌人正在逼近';
    if(approaching)message+='；'+approaching+' 名敌人前进';
    if(!damage&&!approaching)message='回合结束，暂时安全';
    record(s,message);
  } else {
    return fail('未知行动');
  }
  finishCheck(s);
  return {state:s,ok:true,message};
}
export function restoreGame(raw) {
  try{
    const s=typeof raw==='string'?JSON.parse(raw):raw;
    if(!s || s.version!==1 || !LOCATIONS.some(l=>l.id===s.current))return createGame();
    if(!['playing','won','lost'].includes(s.status))return createGame();
    if(!Number.isInteger(s.hp)||s.hp<0||s.hp>9||!Number.isInteger(s.ap)||s.ap<0||s.ap>MAX_AP)return createGame();
    if(!Number.isInteger(s.mag)||s.mag<0||s.mag>6||!Number.isInteger(s.reserve)||s.reserve<0||s.reserve>99)return createGame();
    if(!Number.isInteger(s.medkits)||s.medkits<0||s.medkits>9||!Number.isInteger(s.flares)||s.flares<0||s.flares>9)return createGame();
    if(!Number.isInteger(s.turn)||s.turn<1||s.turn>10000||!Array.isArray(s.log)||s.log.length>7)return createGame();
    for(const l of LOCATIONS) {
      if(!Array.isArray(s.enemies?.[l.id])||s.enemies[l.id].length>3)return createGame();
      for(const e of s.enemies[l.id])if(!ENEMY[e.type]||!Number.isInteger(e.hp)||e.hp<1||e.hp>4||![1,2,3].includes(e.distance)||typeof e.id!=='string')return createGame();
    }
    return s;
  }catch{return createGame();}
}
