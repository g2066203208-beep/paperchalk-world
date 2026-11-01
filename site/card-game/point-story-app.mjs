import {VERSION,SCENES,RULES,createGame,loadGame,clock,inspect,choose,useAction,isEscapeReady} from './point-story-engine.mjs';
const $=id=>document.getElementById(id);
const KEY='paperworld-lost-order-story-01';
let state,previousScene='',scenePreviewUrls={};
try{state=loadGame(localStorage.getItem(KEY))}catch{state=createGame()}
const cardDefs=[
 {id:'observe',title:'观察环境',desc:'观察当前空间'},
 {id:'listen',title:'侧耳倾听',desc:'辨别门外声音'},
 {id:'breathe',title:'屏息等待',desc:'降低异常关注'},
 {id:'wait',title:'继续等待',desc:'推进8分钟'}
];
function save(){
 try{localStorage.setItem(KEY,JSON.stringify(state));$('saved').textContent='● 已自动保存'}
 catch{$('saved').textContent='○ 此设备不支持存档'}
}
function renderStage(){
 const info=SCENES[state.scene];
 $('scene-title').textContent=info.name;
 $('scene-subtitle').textContent=info.subtitle;
 $('scene-description').textContent=info.desc;
 $('scene-position').textContent='SCENE '+Object.keys(SCENES).indexOf(state.scene).toString().padStart(2,'0')+' / '+state.scene.toUpperCase();
 $('time').textContent=clock(state);
 $('sanity').textContent=state.sanity;
 $('attention').textContent=state.attention;
 $('attention').style.color=state.attention>30?'#ffb3b8':'';
 if(previousScene!==state.scene){
  $('scene-image').src='./scenes/'+state.scene+'.svg';
  $('scene-image').alt='固定机位二维场景：'+info.name+'。'+info.desc;
  previousScene=state.scene;
 }
 const preview=scenePreviewUrls[state.scene];
 $('temporary-art').hidden=!preview;
 if(preview)$('temporary-art').src=preview;
 const spots=$('scene-hotspots');spots.replaceChildren();
 for(const spec of info.spots){
  const button=document.createElement('button');button.type='button';button.className='hotspot';
  button.dataset.spot=spec.id;button.style.left=spec.x+'%';button.style.top=spec.y+'%';
  button.title='调查：'+spec.label;button.setAttribute('aria-label','点击调查 '+spec.label);
  if(['door','notice','radio','phone','stairs','exit'].includes(spec.id))button.classList.add('pulse');
  const bubble=document.createElement('span');bubble.className='bubble';bubble.textContent=spec.icon;
  const label=document.createElement('small');label.textContent=spec.label;
  button.append(bubble,label);
  button.addEventListener('click',()=>perform(()=>inspect(state,spec.id)));
  spots.append(button);
 }
}
function renderDialogue(){
 $('speaker').textContent=state.dialogue.speaker;
 $('dialogue-body').textContent=state.dialogue.text;
 const root=$('choices');root.replaceChildren();
 for(const option of state.dialogue.options){
  const button=document.createElement('button');button.type='button';button.textContent=option.text;
  button.dataset.choice=option.id;
  if(['unlock','takeLift'].includes(option.id))button.className='warn';
  button.addEventListener('click',()=>perform(()=>choose(state,option.id)));
  root.append(button);
 }
}
function renderNotebook(){
 const root=$('rule-list');root.replaceChildren();
 for(const id of state.rules){
  const item=RULES.find(r=>r.id===id);if(!item)continue;
  const box=document.createElement('div');box.className='rule-item';
  const heading=document.createElement('strong');heading.textContent=item.title;
  const body=document.createElement('p');body.textContent=item.body;
  const small=document.createElement('small');small.textContent=item.source+' · '+item.status;
  box.append(heading,body,small);root.append(box);
 }
 if(state.rules.length===0){const hint=document.createElement('p');hint.className='empty';hint.textContent='尚未发现可靠记录。';root.append(hint)}
 $('clue-count').textContent=state.rules.length+' / '+RULES.length;
 const inventory=$('inventory');inventory.replaceChildren();
 for(const item of state.inventory){const badge=document.createElement('span');badge.className='inventory-item';badge.textContent=item;inventory.append(badge)}
 if(!state.inventory.length){const hint=document.createElement('span');hint.className='empty';hint.textContent='空';inventory.append(hint)}
 const history=$('history');history.replaceChildren();
 for(const line of state.history){const p=document.createElement('p');p.textContent=line;history.append(p)}
 let objective='阅读物业告示，调查敲门声与收音机广播。';
 if(state.flags.notice&&!state.flags.radio)objective='去客厅收听紧急广播，核对物业告示。';
 else if(state.flags.radio&&!state.flags.listened)objective='返回玄关，仔细倾听门板后的声音。';
 else if(state.flags.radio&&state.flags.listened&&!state.flags.waited)objective='根据广播等待脚步声远去，再决定是否开门。';
 else if(isEscapeReady(state)&&state.scene==='foyer')objective='敲门声已经停止。检查入户门，选择是否离开。';
 else if(state.scene==='hallway')objective='西侧楼梯可以下楼，注意广播禁止乘电梯。';
 else if(state.scene==='stairs')objective='沿安全楼梯走向一楼，离开这栋异常公寓。';
 else if(state.ending)objective=state.ending.type==='survived'?'第一夜调查完毕。':'你违反了尚未掌握的规则。';
 $('objective').textContent=objective;
}
function renderCards(){
 for(const button of $('card-hand').querySelectorAll('[data-action]')){
  const id=button.dataset.action;
  button.disabled=!!state.ending||(id==='listen'&&state.scene!=='foyer')||(id==='wait'&&state.scene!=='foyer');
  button.setAttribute('aria-label',cardDefs.find(c=>c.id===id)?.title||id);
 }
}
function renderEnd(){
 $('ending-overlay').hidden=!state.ending;
 if(!state.ending)return;
 $('ending-title').textContent=state.ending.title;
 $('ending-copy').textContent=state.ending.description;
}
function render(){
 renderStage();renderDialogue();renderNotebook();renderCards();renderEnd();
}
function perform(action){
 if(action()){save();render()}
}
for(const button of $('card-hand').querySelectorAll('[data-action]')){
 button.addEventListener('click',()=>perform(()=>useAction(state,button.dataset.action)));
 button.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  const rect=button.getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width-.5,y=(e.clientY-rect.top)/rect.height-.5;
  button.style.setProperty('--rotateY',(x*11).toFixed(1)+'deg');
  button.style.setProperty('--rotateX',(-y*8).toFixed(1)+'deg');
 });
 button.addEventListener('pointerleave',()=>{
  button.style.setProperty('--rotateY','0deg');button.style.setProperty('--rotateX','0deg')
 });
}
$('notebook-toggle').addEventListener('click',()=>{
 const open=$('notebook').classList.toggle('open');
 $('notebook-toggle').setAttribute('aria-expanded',String(open));
 $('notebook-toggle').textContent=open?'收起笔记':'规则笔记';
});
function restart(){
 for(const uri of Object.values(scenePreviewUrls))URL.revokeObjectURL(uri);
 scenePreviewUrls={};state=createGame();previousScene='';$('import-note').hidden=true;
 save();render();
}
$('new-run').addEventListener('click',()=>{if(confirm('重新开始会覆盖第一夜的本地存档。确定吗？'))restart()});
$('ending-restart').addEventListener('click',restart);
$('import-art').addEventListener('change',e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>20*1024*1024){
  $('import-note').hidden=false;$('import-note').textContent='请选择 20 MB 以内的 PNG、JPEG 或 WebP 图片。';return;
 }
 if(scenePreviewUrls[state.scene])URL.revokeObjectURL(scenePreviewUrls[state.scene]);
 scenePreviewUrls[state.scene]=URL.createObjectURL(file);
 $('import-note').hidden=false;
 $('import-note').textContent='已在 '+SCENES[state.scene].name+' 预览新背景。仅当前页面有效，刷新后恢复原始示意图。';
 renderStage();e.target.value='';
});
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLButtonElement)return;
 if(e.key>='1'&&e.key<='4'){
  const b=$('card-hand').querySelectorAll('[data-action]')[Number(e.key)-1];b?.click()
 }
 if(e.key==='Escape'&&$('notebook').classList.contains('open'))$('notebook-toggle').click();
});
window.__POINT_STORY__={
 version:VERSION,
 snapshot(){return {scene:state.scene,minute:state.minute,clock:clock(state),sanity:state.sanity,attention:state.attention,
  rules:[...state.rules],inventory:[...state.inventory],ending:state.ending?.type||null,ready:isEscapeReady(state)}},
 getState(){return JSON.parse(JSON.stringify(state))},
 reset:restart
};
save();render();
