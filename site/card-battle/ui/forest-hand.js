/* Forest tutorial HUD adapter for seven profession action-deck boxes.
 * DOM-only; the pure deck engine owns the hand constraints and stack order.
 * All seven boxes are visible; only warrior is unlocked in the 1v2 tutorial.
 */
(function(root){
'use strict';
const engine=root.PaperchalkProfessionDecks;
if(!engine)throw Error('Profession deck module not loaded');
const model=engine.create({maxHand:10,openingDraw:5,unlocked:['warrior'],seed:618231});
const holder=document.getElementById('profession-dock');
if(!holder)throw Error('Missing profession dock');
const stacks=holder.querySelector('#class-hand-stacks');
const boxes=holder.querySelector('#class-deck-boxes');
const phase=holder.querySelector('#draw-phase');
const count=holder.querySelector('#hand-capacity');
const info=holder.querySelector('#hand-guidance');
const next=holder.querySelector('#end-hand-turn');
let selection=null;
function cardButton(def){
 const button=document.createElement('button');
 button.className='top-card'+(def.top.family==='faction'?' faction':'')+(selection&&selection.classId===def.id?' selected':'');
 button.dataset.classId=def.id;
 button.dataset.cardInstance=def.top.instance;
 button.setAttribute('aria-label',def.top.name+'，当前'+def.handCount+'张堆叠，点击选择顶部卡');
 const family=def.top.family==='faction'?'农民专属':'战士通用';
 button.innerHTML='<span class="card-family">'+family+'</span>'+
  '<span class="card-name">'+def.top.name+'</span>'+
  '<span class="card-power">伤害 '+def.top.power+'</span>';
 button.addEventListener('click',()=>{
  if(selection?.classId===def.id&&selection.instance===def.top.instance)selection=null;
  else selection={classId:def.id,instance:def.top.instance};
  render();
 });
 return button;
}
function render(){
 const state=model.snapshot();
 if(selection){
  const def=state.classes.find(c=>c.id===selection.classId);
  if(!def?.top||def.top.instance!==selection.instance)selection=null;
 }
 count.textContent='手牌 '+state.count+'/'+state.maxHand;
 phase.textContent=state.locked?'出牌阶段 · 禁止普通摸牌':'摸牌阶段 · 未出牌前可补满';
 phase.classList.toggle('is-locked',state.locked);
 if(selection)info.textContent='已选择顶部行动牌，点击森林中的敌人发动攻击';
 else if(state.locked)info.textContent='已出牌，本回合仅特殊效果可以继续摸牌';
 else info.textContent='点击下方职业卡盒摸牌，手牌合计不超过10张';
 stacks.replaceChildren();boxes.replaceChildren();
 for(const item of state.classes){
  const lane=document.createElement('div');lane.className='class-stack';
  lane.dataset.stackProfession=item.id;
  if(!item.handCount){
   const empty=document.createElement('div');empty.className='stack-empty';lane.append(empty);
  }else{
   if(item.handCount>1){
    const shade=document.createElement('div');shade.className='stack-depth';shade.setAttribute('aria-hidden','true');lane.append(shade);
    if(item.handCount>2){
     const second=document.createElement('div');second.className='stack-depth second';second.setAttribute('aria-hidden','true');lane.append(second);
    }
   }
   lane.append(cardButton(item));
   const badge=document.createElement('span');badge.className='stack-count';badge.textContent=String(item.handCount);
   lane.append(badge);
  }
  stacks.append(lane);
  const button=document.createElement('button');
  button.type='button';button.className='class-box';
  button.dataset.profession=item.id;
  button.title=item.unlocked?'点击从'+item.name+'卡牌盒摸一张牌':'尚未有该职业人物上场';
  button.disabled=!item.unlocked||state.locked||state.count>=state.maxHand||item.deckCount===0;
  button.innerHTML='<span class="class-icon">'+item.icon+'</span><span class="class-copy">'+
    '<span class="class-name">'+item.name+'</span>'+
    '<span class="class-stock">'+(item.unlocked?'牌盒 '+item.deckCount:'未上阵')+'</span></span>';
  button.addEventListener('click',()=>{
   const result=model.draw(item.id);
   if(!result.ok)return;
   render();
  });
  boxes.append(button);
 }
 next.disabled=!!root.__forestLevelDebug&&root.__forestLevelDebug.state.phase!=='active';
}
function consumeForTarget(targetId){
 if(!selection)return null;
 const state=model.snapshot(),classItem=state.classes.find(c=>c.id===selection.classId);
 if(!classItem?.top||classItem.top.instance!==selection.instance)return null;
 const result=model.playTop(selection.classId,selection.instance);
 if(!result.ok)return null;
 selection=null;render();
 return {damage:result.card.power,card:result.card,targetId};
}
function reset(){
 selection=null;model.reset();render();
}
function nextTurn(){
 if(root.__forestLevelDebug?.state.phase!=='active')return;
 selection=null;model.nextTurn();render();
}
next.addEventListener('click',nextTurn);
root.__forestHand=Object.freeze({
 consumeForTarget,reset,nextTurn,
 get snapshot(){return model.snapshot();},
 draw(id){const result=model.draw(id);render();return result;},
 selectTop(id){const d=model.snapshot().classes.find(x=>x.id===id);if(!d?.top)return false;selection={classId:id,instance:d.top.instance};render();return true;},
 get selected(){return selection?{...selection}:null}
});
render();
})(window);
