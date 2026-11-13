/* Deck boxes expose real layered cards. Hand is one horizontal row, all cards selectable.
 * No player discard; ordinary draws lock on first played action.
 */
(function(root){
'use strict';
const engine=root.PaperchalkProfessionDecks;
if(!engine)throw Error('Profession deck module not loaded');
const allies=root.__forestLevelDebug?.state?.units?.filter(u=>u.side==='ally')||[];
const professions=allies.map(u=>u.role).filter(Boolean);
const model=engine.create({maxHand:10,openingDraw:5,unlocked:professions.length?professions:['warrior'],seed:618231});
const holder=document.getElementById('profession-dock');
if(!holder)throw Error('Missing profession dock');
const handArea=holder.querySelector('#action-hand'),boxes=holder.querySelector('#class-deck-boxes');
const phase=holder.querySelector('#draw-phase'),capacity=holder.querySelector('#hand-capacity');
const info=holder.querySelector('#hand-guidance'),endTurn=holder.querySelector('#end-hand-turn');
let selectedInstance=null;
function selectedCard(state){
 return state.hand.find(c=>c.instance===selectedInstance)||null;
}
function actionCard(card,index){
 const button=document.createElement('button');
 button.type='button';
 const selected=card.instance===selectedInstance;
 button.className='action-card'+(card.family==='faction'?' is-faction':'')+(selected?' selected':'');
 button.dataset.cardInstance=card.instance;
 button.dataset.cardProfession=card.profession;
 button.title=card.name+' · 伤害 '+card.power+' · 点击选择，可任意出牌';
 button.setAttribute('aria-label',card.name+'，第'+(index+1)+'张手牌，可任意选择');
 const className=engine.CLASSES.find(x=>x.id===card.profession)?.name||card.profession;
 button.innerHTML='<span class="action-class">'+className+' · '+(card.family==='faction'?'组织专属':'通用')+'</span>'+
 '<span class="action-symbol">'+(engine.CLASSES.find(x=>x.id===card.profession)?.icon||'◆')+'</span>'+
 '<span class="action-name">'+card.name+'</span><span class="action-power">伤害 '+card.power+'</span>';
 button.addEventListener('click',()=>{
  selectedInstance=selected?null:card.instance;
  render();
 });
 return button;
}
function professionBox(item,state){
 const button=document.createElement('button');
 button.type='button';
 button.className='deck-pile'+(!item.unlocked?' is-unavailable':'');
 button.dataset.profession=item.id;
 const usable=item.unlocked&&!state.locked&&state.count<state.maxHand&&item.deckCount>0;
 button.disabled=!usable;
 button.title=item.unlocked?'从'+item.name+'牌盒顶部抽一张，余 '+item.deckCount:'该职业没有上阵人物';
 button.setAttribute('aria-label',item.name+'卡牌盒，剩余'+item.deckCount+'张'+(usable?'，点击摸一张':'，不可摸牌'));
 // Every remaining card is rendered as a separate physical sheet in this box.
 const count=Math.min(item.deckCount,18);
 for(let i=0;i<count;i++){
  const layer=document.createElement('span');layer.className='deck-paper';
  layer.setAttribute('aria-hidden','true');
  layer.style.setProperty('--layer',String(i));layer.style.setProperty('--layers',String(count));
  button.append(layer);
 }
 const cover=document.createElement('span');cover.className='deck-cover';
 cover.innerHTML='<span class="deck-symbol">'+item.icon+'</span><strong>'+item.name+'</strong>'+
 '<small>'+(item.unlocked?'剩余 '+item.deckCount+' 张':'尚未上阵')+'</small>';
 button.append(cover);
 button.addEventListener('click',()=>{
  const result=model.draw(item.id);
  if(!result.ok)return;
  render();
 });
 return button;
}
function render(){
 const state=model.snapshot();
 if(selectedInstance&&!selectedCard(state))selectedInstance=null;
 capacity.textContent='手牌 '+state.count+'/'+state.maxHand;
 phase.textContent=state.locked?'出牌阶段 · 摸牌已锁':'摸牌阶段 · 可自由补至10张';
 phase.classList.toggle('is-locked',state.locked);
 if(selectedInstance)info.textContent='已选中 '+selectedCard(state).name+'：点击敌人出牌';
 else if(state.locked)info.textContent='已出第一张牌，本回合普通摸牌锁定；手中其余牌任意打';
 else info.textContent='点击七职业卡堆抽牌；手牌最多10张，任意选择打出';
 handArea.replaceChildren();
 for(let i=0;i<state.hand.length;i++)handArea.append(actionCard(state.hand[i],i));
 if(!state.hand.length){
  const empty=document.createElement('div');empty.className='hand-empty';
  empty.textContent='空手牌 · '+(state.locked?'只能通过特殊效果摸牌':'点击下方牌堆摸牌');
  handArea.append(empty);
 }
 boxes.replaceChildren();
 for(const item of state.classes)boxes.append(professionBox(item,state));
 endTurn.disabled=!!root.__forestLevelDebug&&root.__forestLevelDebug.state.phase!=='active';
}
function consumeForTarget(targetId){
 if(!selectedInstance)return null;
 const selected=selectedCard(model.snapshot());
 if(!selected)return null;
 // The selected card, not the last one drawn, is spent.
 const result=model.play(selectedInstance);
 if(!result.ok)return null;
 selectedInstance=null;render();
 return{damage:result.card.power,card:result.card,targetId};
}
function selectCard(instance){
 if(!model.snapshot().hand.some(c=>c.instance===instance))return false;
 selectedInstance=instance;render();return true;
}
function reset(){selectedInstance=null;model.reset();render();}
function nextTurn(){
 if(root.__forestLevelDebug?.state.phase!=='active')return;
 selectedInstance=null;model.nextTurn();render();
}
endTurn.addEventListener('click',nextTurn);
root.__forestHand=Object.freeze({
 consumeForTarget,reset,nextTurn,selectCard,
 get selected(){return selectedInstance;},
 get snapshot(){return model.snapshot();},
 draw(id){const r=model.draw(id);render();return r;},
 selectTop(id){const card=model.snapshot().hand.find(c=>c.profession===id);return card?selectCard(card.instance):false;}
});
render();
})(window);
