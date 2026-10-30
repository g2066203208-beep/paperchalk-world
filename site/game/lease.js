/* PAPERWORLD fictional shop registration: keyboard/IME-safe DOM forms and live pixel avatar. */
const DRAFT='paperworld-lease-draft-v1',CONTRACT='paperworld-lease-v1',CHAR='paperworld-character-v1';
export const DEFAULT_FORM=Object.freeze({
 nickname:'',pronouns:'她',origin:'新居民',hair:'短发',outfit:'樱粉',
 shopName:'',business:'杂货',district:'街角',term:'30'
});
const rates={7:75,30:260,90:690};
const locationCost={街角:0,广场:80,河岸:45};
const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
const store=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v))}catch{}};
const $=(p,id)=>p.querySelector('#'+id);
function avatar(canvas,form){
 const c=canvas.getContext('2d');canvas.width=32;canvas.height=48;c.imageSmoothingEnabled=false;
 const ink='#393657',pink='#F2A5C2',blue='#A9BAE9',paper='#FFF5E6';
 const R=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h)};
 R(0,0,32,48,paper);
 // A procedural 4-ink character doll with swappable hairstyle and costume.
 R(9,3,14,17,ink);R(10,4,12,12,form.hair==='长发'?blue:pink);
 if(form.hair==='双马尾'){R(5,9,5,14,pink);R(22,9,5,14,pink)}
 if(form.hair==='长发'){R(7,11,5,18,blue);R(21,11,4,18,blue)}
 if(form.hair==='卷发'){for(let i=0;i<4;i++)R(7+i*5,5+i%2*2,4,4,blue)}
 R(11,10,10,10,paper);R(13,13,2,2,ink);R(19,13,2,2,ink);R(15,17,3,1,pink);
 R(13,20,6,4,paper);
 const shirt=form.outfit==='雾蓝'?blue:form.outfit==='奶油白'?paper:pink;
 R(9,24,14,12,ink);R(10,24,12,11,shirt);
 R(5,25,5,14,ink);R(6,26,3,11,shirt);R(22,25,5,14,ink);R(23,26,3,11,shirt);
 R(11,36,5,9,ink);R(18,36,5,9,ink);R(10,44,7,3,blue);R(17,44,7,3,blue);
 R(15,26,2,5,paper);
}
export function createLeaseUI({root,onBack,onDone,onWorld}){
 const pane=$(root,'pw-lease'),form=$(pane,'pw-register'),card=$(pane,'pw-lease-card'),error=$(pane,'pw-form-errors');
 if(!pane||!form)throw Error('Missing rental UI elements in index.html');
 let values={...DEFAULT_FORM,...read(DRAFT)},contract=read(CONTRACT),step=1,visible=false;
 function fill(){
  for(const key of Object.keys(DEFAULT_FORM)){
   const field=form.elements.namedItem(key);if(field)field.value=values[key]??'';
  }
 }
 function collect(){
  for(const key of Object.keys(DEFAULT_FORM)){
   const field=form.elements.namedItem(key);if(field)values[key]=field.value;
  }
  values.nickname=values.nickname.trim();values.shopName=values.shopName.trim();
  store(DRAFT,values);
 }
 const rent=()=>rates[values.term]+locationCost[values.district];
 function details(node,record,final=false){
  node.replaceChildren();
  const rows=[['店主',record.nickname],['角色称呼',record.pronouns],['身份',record.origin],
  ['发型／服装',record.hair+' / '+record.outfit],['店铺名称',record.shopName],
  ['经营类型',record.business],['店铺位置',record.district],
  ['租借期限',record.term+' 个游戏日'],['游戏内租金',record.rent+' ◈']];
  if(final)rows.push(['游戏租赁编号',record.code]);
  for(const [label,value] of rows){
   const dt=document.createElement('dt'),dd=document.createElement('dd');
   dt.textContent=label;dd.textContent=String(value);
   node.append(dt,dd);
  }
 }
 function showError(message){
  error.textContent=message;error.classList.remove('pw-off');
 }
 function render(){
  pane.classList.toggle('pw-off',!visible);
  pane.dataset.open=visible?'yes':'no';
  for(let i=1;i<=3;i++){
   $(pane,'pw-form-step'+i).classList.toggle('pw-off',step!==i);
   const tab=$(pane,'pw-tab-'+i);
   if(i===step)tab.setAttribute('aria-current','step');else tab.removeAttribute('aria-current');
   tab.dataset.done=String(i<step);
  }
  $(pane,'pw-receipt').classList.toggle('pw-off',step!==4);
  $(pane,'pw-prev').textContent=step===1||step===4?'返回菜单':'上一步';
  $(pane,'pw-next').textContent=['','填写店铺 →','核对资料 →','确认租借','重新登记'][step];
  if(step===2)$(pane,'pw-rent').textContent=rent()+' ◈';
  if(step===3)details($(pane,'pw-contract-details'),{...values,rent:rent()});
  if(step===4&&contract)details($(pane,'pw-receipt-details'),contract,true);
  avatar($(pane,'pw-avatar'),values);
  error.classList.add('pw-off');
  card.scrollTop=0;
 }
 function validateNext(){
  if(step===1&&[...values.nickname].length<2){
   showError('请填写至少2个字的游戏角色昵称');$(pane,'pw-nickname').focus();return false;
  }
  if(step===2&&[...values.shopName].length<2){
   showError('请给店铺起一个至少2字的名称');$(pane,'pw-shopName').focus();return false;
  }
  return true;
 }
 function next(){
  collect();if(!validateNext())return;
  if(step<3){step++;render();return}
  if(step===3){
   contract={...values,rent:rent(),code:'PW-'+String(Date.now()).slice(-8)};
   store(CONTRACT,contract);
   store(CHAR,{nickname:values.nickname,pronouns:values.pronouns,origin:values.origin,hair:values.hair,outfit:values.outfit});
   try{localStorage.setItem('paperworld-journey-v1','created')}catch{}
   step=4;render();onDone?.(contract);return;
  }
  step=1;contract=null;render();
 }
 form.addEventListener('input',()=>{collect();avatar($(pane,'pw-avatar'),values);if(step===2)$(pane,'pw-rent').textContent=rent()+' ◈';error.classList.add('pw-off')});
 form.addEventListener('change',()=>{collect();avatar($(pane,'pw-avatar'),values);if(step===2)$(pane,'pw-rent').textContent=rent()+' ◈'});
 form.addEventListener('submit',e=>{e.preventDefault();next()});
 $(pane,'pw-lease-enter-world').addEventListener('click',()=>{if(step===4&&contract)onWorld?.()});
 $(pane,'pw-prev').addEventListener('click',()=>{
  collect();
  if(step===1||step===4){onBack?.();return}
  step--;render();
 });
 card.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch'||e.target.closest('input,select,button'))return;
  const q=card.getBoundingClientRect();
  const dx=(e.clientX-q.left)/q.width-.5,dy=(e.clientY-q.top)/q.height-.5;
  card.style.transform='perspective(800px) rotateY('+(-dx*2).toFixed(1)+'deg) rotateX('+(dy*2).toFixed(1)+'deg)';
 });
 card.addEventListener('pointerleave',()=>{card.style.transform=''});
 function show({receipt=false}={}){
  visible=true;contract=read(CONTRACT);
  if(receipt&&contract){values={...DEFAULT_FORM,...contract};step=4}
  else{values={...DEFAULT_FORM,...read(DRAFT)};step=1}
  fill();render();
 }
 function hide(){visible=false;pane.classList.add('pw-off');pane.dataset.open='no';card.style.transform=''}
 function snapshot(){return {visible,step,values:{...values},rent:rent(),hasContract:!!contract,code:contract?.code||null}}
 fill();render();
 return {show,hide,snapshot};
}
