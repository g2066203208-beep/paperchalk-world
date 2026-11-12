/* Paperchalk 1v1 board. Real rules come from ../combat-lab/engine.js;
 * only the presentation is new. Approved GitHub source PNGs are loaded in HTML.
 * This is an artwork/layout prototype: the character images do NOT redefine
 * the experimental axe-vs-corridor encounter's stats or approved character kit. */
'use strict';
(function(){
 const G=window.Timegrid;
 const $=id=>document.getElementById(id);
 if(!G){$('status').textContent='时间步引擎未加载';return;}
 const typeNames={attack:'攻击',defense:'防御',skill:'技能',power:'能力',special:'特殊',system:'重整'};
 let game=null;
 let selected=null;
 let message='选择下方手牌，点击我方时间格';
 let lastActionId=null;
 let roundSummary='先排好动作，再执行这一轮';
 const seed=618231;

 function element(tag,classname,label){
   const el=document.createElement(tag);
   if(classname)el.className=classname;
   if(label!==undefined)el.textContent=label;
   return el;
 }
 function actor(side){return game.actors.find(a=>a.side===side);}
 function phaseAt(a,t){
   const at=game.now+t-1;
   const found=a.actions.find(action=>!action.canceled&&G.phase(G.CARD[action.card],action.start,at));
   if(found)return{action:found,phase:G.phase(G.CARD[found.card],found.start,at)};
   return a.stunUntil>at?{phase:'disabled'}:null;
 }
 function updateTime(){
   const host=$('timeline');
   host.replaceChildren();
   const ruler=element('div','time-row ruler');
   ruler.appendChild(element('span','time-label','格'));
   for(let t=1;t<=10;t++)ruler.appendChild(element('span','time-cell',String(t)));
   host.appendChild(ruler);
   for(const [side,label,rowClass] of [['enemy','敌','hostile'],['ally','我','friendly']]){
     const a=actor(side),row=element('div','time-row '+rowClass);
     row.appendChild(element('span','time-label',label));
     for(let t=1;t<=10;t++){
       const item=phaseAt(a,t);
       const phase=item?.phase||'';
       const text=phase==='windup'?'前':phase==='active'?'生':phase==='recovery'?'后':phase==='disabled'?'停':'';
       const clickable=side==='ally';
       const cell=element(clickable?'button':'span','time-cell'+(phase?' '+phase:'')+(clickable&&selected?' can-place':''),text);
       if(clickable){
         cell.type='button';
         cell.dataset.time=String(t);
         cell.setAttribute('aria-label','我方时间第'+t+'格'+(text?'，'+text:'，空位'));
       }else cell.setAttribute('aria-label','敌方第'+t+'格'+(text?'，'+text:'，空位'));
       if(item?.action){
         const c=G.CARD[item.action.card];
         cell.title=c.name+' · '+(phase==='windup'?'前摇':phase==='active'?'生效':'后摇');
         if(clickable)cell.dataset.actionId=item.action.id;
       }else if(clickable){
         cell.title='在第'+t+'格安排选中的行动';
       }
       row.appendChild(cell);
     }
     host.appendChild(row);
   }
 }
 function updateHand(){
   const host=$('hand');
   host.replaceChildren();
   const hero=actor('ally');
   $('hand-count').textContent=hero.hand.length+' 张';
   for(const inst of hero.hand){
     const c=G.CARD[inst.key];
     if(!c)continue;
     const button=element('button','hand-card '+c.type+(selected===inst.uid?' selected':''));button.type='button';
     button.dataset.uid=inst.uid;
     button.setAttribute('aria-pressed',String(selected===inst.uid));
     button.appendChild(element('span','kind',typeNames[c.type]||'行动'));
     button.appendChild(element('strong','',c.name));
     button.appendChild(element('span','desc',c.desc||''));
     const phases=element('div','phases');
     for(const s of ['前 '+c.w,'生 '+c.a,'后 '+c.r])phases.appendChild(element('span','',s));
     button.appendChild(phases);
     host.appendChild(button);
   }
   if(!hero.hand.length)host.appendChild(element('div','section-label','本轮手牌已安排完；可执行后进入下一轮。'));
 }
 function updateFighters(){
   const ally=actor('ally'),enemy=actor('enemy');
   for(const [key,a] of [['ally',ally],['enemy',enemy]]){
     $(''+key+'-hp').textContent=a.hp+' / '+a.maxHp;
     $(''+key+'-hp-fill').style.width=Math.max(0,Math.min(100,a.hp/a.maxHp*100))+'%';
     $(''+key+'-figure').style.opacity=a.dead?'.48':'1';
   }
   $('energy-indicator').textContent='绝杀能量：'+ally.energy+' / 100';
   $('round-indicator').textContent='第 '+(game.round+1)+' 轮';
   $('phase-indicator').textContent=game.phase==='planning'?'规划中':game.phase==='win'?'胜利':game.phase==='lost'?'失败':'已结束';
 }
 function update(){
   updateFighters();updateTime();updateHand();
   $('status').textContent=message;
   $('battle-notice').textContent=roundSummary;
   const canPlay=game.phase==='planning';
   $('execute').disabled=!canPlay;
   $('undo').disabled=!canPlay||!actor('ally').actions.some(a=>a.source==='hand'&&!a.locked&&a.start>=game.now);
   $('execute').textContent=canPlay?'执行 10 格':game.phase==='win'?'战斗胜利':'战斗结束';
 }
 function alertStatus(msg){message=msg;update();}
 function start(){
   game=G.create({classId:'axe',styleId:'strike',encounterId:'corridor',team:false,campaignBalance:true,seed});
   selected=null;
   lastActionId=null;
   message='先选手牌，再点击我方时间格';
   roundSummary='基础 1v1 · 当前保留原版 Timegrid 规则';
   $('outcome').textContent='';$('outcome').classList.remove('game-over');
   update();
 }
 function chooseCard(uid){
   if(game.phase!=='planning')return;
   if(!actor('ally').hand.some(x=>x.uid===uid))return;
   selected=selected===uid?null:uid;
   message=selected?'已选择手牌，点击时间格排程':'已取消选择';
   update();
 }
 function placeOrRemove(t,actionId){
   if(game.phase!=='planning')return;
   const hero=actor('ally'),enemy=actor('enemy');
   if(!selected){
     if(actionId){
       const a=hero.actions.find(x=>x.id===actionId);
       if(a&&a.source==='hand'&&!a.locked){
         try{G.remove(game,a.id);message='已取下：'+G.CARD[a.card].name;lastActionId=null;}
         catch(err){message=err.message;}
         update();return;
       }
     }
     alertStatus('先选择下方一张手牌，再点第 1–10 格');return;
   }
   const inst=hero.hand.find(x=>x.uid===selected);
   if(!inst){selected=null;update();return;}
   const card=G.CARD[inst.key];
   const friendly=card.type==='defense'||card.heal||card.buff||card.steady;
   try{
     const action=G.place(game,selected,t,friendly?hero.id:enemy.id);
     selected=null;lastActionId=action.id;
     message='已安排「'+card.name+'」从第 '+t+' 格开始；可以继续出牌';
   }catch(err){message=err.message;}
   update();
 }
 function undo(){
   if(game.phase!=='planning')return;
   const choices=actor('ally').actions.filter(a=>a.source==='hand'&&!a.locked&&a.start>=game.now);
   const last=choices.find(a=>a.id===lastActionId)||choices.at(-1);
   if(!last){alertStatus('没有可以撤销的行动');return;}
   try{G.remove(game,last.id);lastActionId=null;message='已撤销「'+G.CARD[last.card].name+'」';}
   catch(err){message=err.message;}
   update();
 }
 function execute(){
   if(game.phase!=='planning')return;
   const oldRound=game.round;
   try{
     G.simulateRound(game,{collectTrace:true});
     selected=null;lastActionId=null;
     const lines=game.events.filter(e=>e.kind==='damage'||e.kind==='block'||e.kind==='break'||e.kind==='death');
     roundSummary=lines.length?lines.slice(-2).map(x=>x.text).join('　·　'):'本轮双方没有造成有效伤害';
     if(game.phase==='win'||game.phase==='lost'){
       message=game.phase==='win'?'战斗胜利 · 点击重新开始可再次尝试':'战斗失败 · 点击重新开始可再次尝试';
       $('outcome').textContent=game.phase==='win'?'胜利':'失败';
       $('outcome').classList.add('game-over');
     }else{
       message='第 '+(oldRound+1)+' 轮已结算；请选择新手牌继续排程';
       $('outcome').textContent='已结算 10 格';
     }
   }catch(err){message='执行失败：'+err.message;}
   update();
 }
 $('hand').addEventListener('click',e=>{
   const b=e.target.closest('button[data-uid]');
   if(b)chooseCard(b.dataset.uid);
 });
 $('timeline').addEventListener('click',e=>{
   const b=e.target.closest('button[data-time]');
   if(b)placeOrRemove(Number(b.dataset.time),b.dataset.actionId);
 });
 $('execute').addEventListener('click',execute);
 $('undo').addEventListener('click',undo);
 $('reset').addEventListener('click',start);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selected){selected=null;message='已取消选择';update();}});
 for(const image of document.querySelectorAll('.figure img')){
   const failure=()=>image.parentElement.classList.add('is-missing');
   image.addEventListener('error',failure);
   if(image.complete&&!image.naturalWidth)failure();
 }
 start();
})();
