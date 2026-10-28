/**
 * CHAPTER 01 / 真实剧情脚本，不是提示词或开发清单。
 * All dialogue below is authored game content. No copied film/game dialogue.
 * The player's true masked identity is never spoken to witnesses.
 */
export const PROLOGUE_TITLE='第一章 · 两个人的办公室';

export const PROLOGUE_BEATS=[
 {id:'threshold',speaker:'旧港 · 一九九八年九月',mood:'morning',
  line:'门锁卡了一下，才肯转动。屋子里一股受潮的石灰味。地上只有两个旧木箱，还有一把不知是谁留下的断椅子。',
  cue:'key',caption:'第一天｜08:00'},
 {id:'keys',speaker:'阿凯',mood:'room',
  line:'拿着。左边这把是你的。老板说这窗子只是“有点透气”……我看它下雨时能直接养鱼。',
  cue:'key'},
 {id:'owned',speaker:'阿凯',mood:'room',
  line:'不过真好啊。从孤儿院那张挤得翻不了身的床，到码头的破阁楼……今天终于有扇门，钥匙是咱自己的。',
  cue:'paper'},
 {id:'street',speaker:'楼下的女人',mood:'street',
  line:'我这个月已经交过了！摊子修一次就得花半个月工钱，你们还要收？',
  cue:'street'},
 {id:'warning',speaker:'阿凯',mood:'window',
  line:'听见没？马顺的打手刚散，新的地痞就盯上了街坊。旧港这地方，坏事总是比好消息来得快。',
  cue:'paper'},
 {id:'rumor',speaker:'报童 · 楼下远处',mood:'legend',
  line:'号外——马顺逼债的假账曝光！欠薪工人拿回工钱！听说是两个蒙面人掀了他的老底！',
  cue:'news'},
 {id:'legend',speaker:'阿凯',mood:'legend',
  line:'他们把那晚说得越来越离谱。有的说蒙面人有十几个，有的说是码头工会派的。没人见过脸，也没人知道名字。',
  cue:'paper'},
 {id:'money',speaker:'阿凯',mood:'room',
  line:'工友把匿名谢礼塞给我们，咱俩又凑了这些年存下的钱，才换来这间屋。买完以后……口袋里就剩一百九十。',
  cue:'coins'},
 {id:'doubt',speaker:'阿凯',mood:'window',
  line:'马顺倒了，工钱是拿回来了。可今天还是有人挨欺负。我们总不能每晚蒙着脸，一个路口一个路口地跑吧？',
  cue:'quiet'},
 {id:'decision',speaker:'阿凯',mood:'decision',
  line:'你说怎么办？先把门关上，安安稳稳挣点钱？还是下楼看看？',
  choices:[
    {id:'street-first',label:'先下楼。有人在求助。',reaction:'好。那先去听听他们怎么说。门先别锁，兴许还有人来找我们。'},
    {id:'build-first',label:'先把这里收拾好。得有长久打算。',reaction:'说得也对。总靠拳头解决不了问题。这屋子总得有一天像个真正能做事的地方。'}
  ],cue:'quiet'},
 {id:'promise',speaker:'阿凯',mood:'room',fromChoice:true,
  line:'屋子是破了点。可如果哪天街坊遇到麻烦，知道这扇门可以敲……我觉得钱就没白花。',
  cue:'paper'},
 {id:'open',speaker:'旧港',mood:'final',
  line:'城里正在谈论两个从不露脸的蒙面人。没有人知道他们的名字。此刻，他们只是两个年轻人，和一间空办公室。',
  cue:'street',caption:'从这里开始'}
];
export const PROLOGUE_LAST=PROLOGUE_BEATS.length-1;
export function newPrologue(day=1){
 return {status:day===1?'active':'complete',at:0,decision:null,startedDay:day,completedDay:day===1?null:day,history:[]};
}
export function currentBeat(prologue){
 if(prologue?.status!=='active')return null;
 const beat=PROLOGUE_BEATS[Math.max(0,Math.min(PROLOGUE_LAST,prologue.at||0))];
 if(beat.id==='promise'&&prologue.decision){
   const choice=PROLOGUE_BEATS.find(x=>x.id==='decision')?.choices.find(x=>x.id===prologue.decision);
   if(choice)return {...beat,line:choice.reaction+'\n'+beat.line};
 }
 return beat;
}
export function movePrologue(prologue,command,day,choiceId=null){
 const data=structuredClone(prologue);
 if(data.status!=='active')return {error:'开场已经结束'};
 const beat=currentBeat(data);
 if(command==='skip'){
   data.status='complete';data.at=PROLOGUE_LAST;data.completedDay=day;
   data.history.push({day,kind:'skip',beat:beat.id});
   return {data,finished:true,choice:null};
 }
 if(command==='choose'){
   if(beat.id!=='decision')return {error:'这里不需要作出选择'};
   const chosen=beat.choices.find(c=>c.id===choiceId);
   if(!chosen)return {error:'未知回答'};
   data.decision=chosen.id;data.history.push({day,kind:'choice',value:chosen.id});
   data.at++;
   return {data,finished:false,choice:chosen};
 }
 if(command!=='next')return {error:'开场操作无效'};
 if(beat.choices&&!data.decision)return {error:'请选择自己的回答'};
 data.history.push({day,kind:'viewed',beat:beat.id});
 if(data.at>=PROLOGUE_LAST){
   data.status='complete';data.completedDay=day;
   return {data,finished:true,choice:null};
 }
 data.at++;return {data,finished:false,choice:null};
}

/* Only visuals: no money or influence granted by merely reading the prologue. */
export function prologueMark(mood){
 if(mood!=='legend')return '';
 return '<svg class="prologue-legend-art" viewBox="0 0 340 126" aria-hidden="true">'+
 '<path d="M0 0H340V126H0Z" fill="#1c2c39"/>'+
 '<path d="M0 108L48 66L80 88L149 24L199 82L260 35L340 90V126Z" fill="#9b4350"/>'+
 '<path d="M102 110L114 59L147 46L176 63L187 110Z" fill="#141f2b"/>'+
 '<path d="M128 49L122 27L145 13L164 34L160 49Z" fill="#141f2b"/>'+
 '<path d="M184 111L196 68L224 54L250 75L255 111Z" fill="#182733"/>'+
 '<path d="M203 59L200 36L224 22L240 45L233 58Z" fill="#182733"/>'+
 '<path d="M0 114H340" stroke="#f2e4ca" stroke-width="4" stroke-dasharray="12 7"/>'+
 '<text x="14" y="19" font-size="9" font-family="serif" fill="#efc7ab" letter-spacing="3">NO NAMES, ONLY RUMORS</text>'+
 '</svg>';
}
