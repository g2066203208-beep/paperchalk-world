import {WIDTH,HEIGHT,ASSETS,CHARACTER_BIBLE,defaultScene,validateScene,renderScene,hitTest,addObject,pixelAudit,makeAnimaPrompt,checkTrainingManifest} from './game-asset-core.mjs';
const $=id=>document.getElementById(id),canvas=$('stage'),ctx=canvas.getContext('2d');
const SAVE='pixelatelier-prod-scene-v1';let scene=defaultScene(),selected=null,drag=null,undos=[],redos=[],activeTab='scene';
let manifest={schema:1,characterId:CHARACTER_BIBLE.id,fixedCharacterBible:false,images:[]};
const status=(s,error=false)=>{$('status').textContent=s;$('status').style.color=error?'#f3a7ab':'#bbebcd'};
const snapshot=()=>JSON.stringify(scene),copy=s=>JSON.parse(JSON.stringify(s));
try{const stored=localStorage.getItem(SAVE);if(stored)scene=validateScene(JSON.parse(stored))}catch{}
function persist(){try{localStorage.setItem(SAVE,snapshot())}catch{status('本地保存不可用，请导出场景JSON',true)}}
function changed(before){if(before!==snapshot()){undos.push(before);if(undos.length>48)undos.shift();redos.length=0;persist()}render()}
function render(){
renderScene(ctx,scene,{selected,selection:true});
const current=scene.objects.find(x=>x.id===selected);
$('selected-name').textContent=current?(ASSETS[current.type].title+' / '+current.id):'点击场景对象或清单选择';
for(const [id,key] of [['pos-x','x'],['pos-y','y'],['pos-z','z']]){$(id).value=current?current[key]:'';$(id).disabled=!current}
for(const id of ['front','back','duplicate','delete'])$(id).disabled=!current;
$('undo').disabled=undos.length===0;$('redo').disabled=redos.length===0;
const list=$('objects');list.replaceChildren();
for(const o of [...scene.objects].sort((a,b)=>b.z-a.z)){const b=document.createElement('button');b.textContent=(o.id===selected?'● ':'○ ')+ASSETS[o.type].title+' · '+o.id;b.setAttribute('aria-pressed',String(o.id===selected));b.addEventListener('click',()=>{selected=o.id;render()});list.append(b)}
$('scene-status').textContent=WIDTH+'×'+HEIGHT+'原生整数格 | '+scene.objects.length+'个对象\n'+(current?'选中 '+current.type+' at '+current.x+','+current.y+' / Z '+current.z:'未选择对象')+'\n可编辑模块 / 无插值PNG / JSON工程 / 美术待验收';
}
for(const [type,info] of Object.entries(ASSETS)){const b=document.createElement('button');b.textContent=info.title;b.title=info.group+' · '+info.w+'×'+info.h;b.addEventListener('click',()=>{const before=snapshot();selected=addObject(scene,type,150,65);changed(before);status('已添加 '+info.title+'，可拖拽或修改坐标')});$('module-list').append(b)}
function point(e){const r=canvas.getBoundingClientRect();return{x:Math.floor((e.clientX-r.left)/r.width*WIDTH),y:Math.floor((e.clientY-r.top)/r.height*HEIGHT)}}
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;const p=point(e);selected=hitTest(scene,p.x,p.y);
if(selected){const obj=scene.objects.find(x=>x.id===selected);drag={id:e.pointerId,before:snapshot(),dx:p.x-obj.x,dy:p.y-obj.y};canvas.setPointerCapture(e.pointerId)}
render()});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||!selected)return;
const p=point(e),obj=scene.objects.find(x=>x.id===selected);
if(!obj)return;
obj.x=Math.max(-150,Math.min(383,Math.round((p.x-drag.dx)/2)*2));
obj.y=Math.max(-150,Math.min(215,Math.round((p.y-drag.dy)/2)*2));render()});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const before=drag.before;drag=null;changed(before)});
canvas.addEventListener('pointercancel',()=>{if(!drag)return;scene=JSON.parse(drag.before);drag=null;render()});
for(const [id,key] of [['pos-x','x'],['pos-y','y'],['pos-z','z']])$(id).addEventListener('change',e=>{const obj=scene.objects.find(x=>x.id===selected);if(!obj)return;const before=snapshot(),value=Number(e.target.value);if(Number.isInteger(value)&&Math.abs(value)<=1000)obj[key]=value;changed(before)});
for(const [id,delta] of [['front',5],['back',-5]])$(id).addEventListener('click',()=>{const obj=scene.objects.find(x=>x.id===selected);if(!obj)return;const before=snapshot();obj.z+=delta;changed(before)});
$('duplicate').addEventListener('click',()=>{const obj=scene.objects.find(x=>x.id===selected);if(!obj)return;const before=snapshot();selected=addObject(scene,obj.type,obj.x+12,obj.y+10);changed(before)});
$('delete').addEventListener('click',()=>{if(!selected)return;const before=snapshot();scene.objects=scene.objects.filter(x=>x.id!==selected);selected=null;changed(before)});
$('reset').addEventListener('click',()=>{if(!confirm('复位房间场景？可以用撤销恢复。'))return;const before=snapshot();scene=defaultScene();selected=null;changed(before)});
for(const [id,from,to] of [['undo',undos,redos],['redo',redos,undos]])$(id).addEventListener('click',()=>{if(!from.length)return;to.push(snapshot());scene=validateScene(JSON.parse(from.pop()));selected=null;persist();render()});
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);status('文件已导出：'+name)}
function downloadJSON(obj,name){download(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),name)}
$('save-json').addEventListener('click',()=>downloadJSON(scene,'nightlamp-modular-scene.json'));
$('save-png').addEventListener('click',()=>{const c=document.createElement('canvas');c.width=WIDTH;c.height=HEIGHT;renderScene(c.getContext('2d'),scene);c.toBlob(b=>b?download(b,'nightlamp-native-scene-384x216.png'):status('PNG编码失败',true),'image/png')});
$('load-json').addEventListener('click',()=>{$('scene-file').value='';$('scene-file').click()});
$('scene-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>60000)throw Error('工程JSON不可超过60KB');const next=copy(validateScene(JSON.parse(await file.text())));const before=snapshot();scene=next;selected=null;changed(before);status('可编辑场景导入成功')}catch(err){status('导入失败：'+err.message,true)}});
for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>{activeTab=b.dataset.tab;for(const x of document.querySelectorAll('[data-tab]')){x.setAttribute('aria-pressed',String(x.dataset.tab===activeTab));x.setAttribute('aria-selected',String(x.dataset.tab===activeTab))}for(const tab of ['scene','character','lora'])$('tab-'+tab).hidden=tab!==activeTab});
for(const item of CHARACTER_BIBLE.invariant){const label=document.createElement('label'),cb=document.createElement('input');cb.type='checkbox';cb.value=item;cb.addEventListener('change',()=>{$('character-report').textContent='人工检查：'+document.querySelectorAll('#identity-checks input:checked').length+'/'+CHARACTER_BIBLE.invariant.length+'\n母版与身份一致性仍未完成自动验收。单次勾选不代表模型已训练。'});label.append(cb,document.createTextNode(item));$('identity-checks').append(label)}
for(const b of document.querySelectorAll('.audit-image'))b.addEventListener('click',()=>{try{const img=$(b.dataset.img);if(!img.complete||!img.naturalWidth)throw Error('图片未加载');const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;g.drawImage(img,0,0);const a=pixelAudit(g.getImageData(0,0,c.width,c.height));$('character-report').textContent='图片：'+img.id+'\n原生画布：'+a.width+'×'+a.height+'\n颜色：'+a.uniqueColors+'\n半透明像素：'+a.translucentPixels+'\n原生格来源：尚未自动验证\n艺术验收：未通过';status('完成逐像素RGBA统计')}catch(err){status(err.message,true)}});
function report(){const r=checkTrainingManifest(manifest);$('report').textContent=(r.metadataReady?'清单元数据符合实验门槛，但图像文件/授权证据未验证':'当前不能开始角色LoRA训练')+'\n总图数 '+r.total+'，满足许可/原生/验收条件 '+r.eligible+'\n'+r.checks.map(x=>(x.ok?'✓ ':'✗ ')+x.text).join('\n')+'\n目标 '+r.model+' · 已训练权重：没有';}
$('example-manifest').addEventListener('click',()=>downloadJSON(manifest,'anima-character-lora-manifest.template.json'));
$('manifest').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>500000)throw Error('清单文件太大');const imported=JSON.parse(await f.text());checkTrainingManifest(imported);manifest=imported;report();status('本地训练清单完成验证')}catch(err){status('清单错误：'+err.message,true)}});
$('audit-manifest').addEventListener('click',report);
function buildPrompt(){try{$('prompt-output').value=makeAnimaPrompt({kind:$('prompt-kind').value,artist:$('artist-tag').value});status('提示词已生成；请验证@画师ID确实被Anima识别')}catch(err){status(err.message,true)}}
$('make-prompt').addEventListener('click',buildPrompt);$('prompt-kind').addEventListener('change',buildPrompt);
$('copy-prompt').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('prompt-output').value);status('提示词已复制')}catch{status('复制失败，请手动选择文本',true)}});
render();report();buildPrompt();status('真实像素工作流就绪：模块场景、人物检查与Anima数据门槛');
window.__GAME_ASSET_STUDIO__={state:()=>({scene:copy(scene),selected,training:checkTrainingManifest(manifest),tab:activeTab})};
