/* Night store: fullscreen scene interactions, genuine cashier apparatus,
 * surveillance, rule verification and authored branching narrative. */
(function(){'use strict';
const Core=window.PaperWorldNightStore;if(!Core)throw Error('night-core.js missing');
const game=Core.create({storage:(()=>{try{return localStorage}catch(_){return null}})()}),
 $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
let modal='',cam=1,toastTimer=0,lastEvent='',audio=null,hum=null,muted=true;
const names={counter:'收银区',aisle:'货架通道',cooler:'冷柜区',stockroom:'后方仓库',office:'员工监控室',entrance:'店外雨夜'};
const prompt={counter:'收银机待机灯亮着，台面上压着今晚的交接单。',aisle:'货架缝隙里的空隙很深，深到看不见另一头。',cooler:'冷柜在嗡嗡作响，玻璃映出背后空荡的通道。',stockroom:'仓库里堆满纸箱，后门的门锁看上去很新。',office:'监控显示器轻轻发热，旁边放着值班电话与旧档案。',entrance:'雨夜的路灯照着空街，自动门偶尔发出机械声。'};
const $el=(tag,classes,text)=>{const e=document.createElement(tag);if(classes)e.className=classes;if(text!=null)e.textContent=text;return e};
const time=t=>{const n=1380+t;return String(Math.floor(n/60)%24).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
const eventText={door3:{title:'自动门第三次开启',buttons:[['锁门，检查监控','lock'],['保持营业','unlock']]},hood:{title:'01:17 · 门口的人',buttons:[['不搭话，继续工作','silent'],['主动询问对方','greet']]},self:{title:'你在监控里看见自己',buttons:[['查看4号摄像头','cam4'],['切断监控电闸','power']]},sixth:{title:'第六个身影',buttons:[['留在原处','avoid'],['去冷柜核实','inspectSixth']]},knock:{title:'仓库门后的敲击',buttons:[['不理会纸条','refuseKnock'],['开仓库门','openKnock']]},call:{title:'三声铃响',buttons:[['不接听','ignoreCall'],['接听电话','answerCall']]},record:{title:'旧员工的最后记录',buttons:[['查阅完整档案','archive']]}};
function note(m){const node=$('#toast');node.textContent=m;node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.hidden=true,3300)}
function sound(f=220,len=.19){if(muted||!audio)return;try{const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(f,audio.currentTime);gain.gain.setValueAtTime(.028,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+len);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+len)}catch(_){}}
function toggleSound(){muted=!muted;const btn=$('#toggle-sound');btn.textContent='♪ 音效：'+(muted?'关':'开');btn.setAttribute('aria-pressed',String(!muted));if(muted){if(audio)audio.suspend();return}
 try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume();sound(380,.17)}catch(_){muted=true;btn.textContent='♪ 音效：不可用'}}
function act(fn,...args){const r=game[fn](...args);if(r?.note)note(r.note);if(r?.ok)sound(fn==='scan'?680:fn==='charge'?520:fn==='handoff'?390:260,.14);render();return r?.ok}
function openModal(which){modal=which;$('#modal-layer').hidden=false;$('#cashier').hidden=true;renderModal();sound(330,.1)}
function closeModal(){modal='';$('#modal-layer').hidden=true;const s=game.snapshot();if(s.scene==='counter'&&s.order&&!s.finished){$('#cashier').dataset.opened='1';$('#cashier').hidden=false;}render();}
function renderModal(){if(!modal)return;const s=game.snapshot(),title=$('#modal-heading'),body=$('#modal-content');body.replaceChildren();
 const p=(text,style='modal-desc')=>body.append($el('p',style,text));
 const btn=(label,callback)=>{const b=$el('button','modal-action',label);b.addEventListener('click',callback);body.append(b);return b};
 if(modal==='manual'){
  title.textContent='夜班交接手册';p('手册右下角有正式排班章；未经证实的纸条不要当成规则。');
  for(const r of game.manual()){const row=$el('article','manual-note'),n=$el('span','number',r.id),wrap=$el('div');wrap.append($el('small','',r.source),$el('span','',r.text));row.append(n,wrap);body.append(row)}
 }else if(modal==='phone'){
  title.textContent='值班手机';p('收件箱 / 店长 / 无署名号码');
  const msg=$el('article','phone-message');msg.append($el('span','sender','店长 · 交接事项'),document.createTextNode(s.elapsed<125?'今晚先照正常操作。夜间补充规定稍后发给你。':'不要照做陌生人留下的纸条。新规定以我发的图片为准。'));body.append(msg);
  if(s.elapsed>=125){btn('查看已核实的夜班附加规则',()=>{modal='manual';renderModal()})}
  const notes=game.note();for(const r of notes){const div=$el('article','phone-message');div.append($el('span','sender',r.source),document.createTextNode(r.text));body.append(div)}
  if(s.flags['event:call']&&!s.flags['resolved:call']){btn('忽略未署名电话',()=>{act('choose','ignoreCall');renderModal()});btn('接听陌生号码',()=>{act('choose','answerCall');renderModal()})}
 }else if(modal==='cctv'){
  title.textContent='安保监控 · 6路';p('灰阶信号存在延迟，只有打开相应摄像头才能核验画面。');
  const grid=$el('div','cctv-grid');const n=['自动门','收银台','冷柜区','后仓','货架通道','店外'];
  for(let id=1;id<=6;id++){
   const tile=$el('button','cam-tile'),shot=$el('div','cam-image');shot.style.backgroundImage=id===4?'url("./scenes/security-office.svg")':id===6?'url("./scenes/rainy-exterior.svg")':id===3?'url("../assets/convenience-story.webp")':'url("../assets/convenience-story.webp")';if(id===3){shot.style.backgroundPosition='56% 38%';shot.style.backgroundSize='220%'}
   if(id===4&&s.flags.sawSelf&&!s.flags['resolved:self']){tile.classList.add('danger');shot.append($el('span','cam-warning','画面中的你没有移动'))}
   if(id===3&&s.flags.sawSixth&&!s.flags['resolved:sixth']){tile.classList.add('danger');shot.append($el('span','cam-warning','人数：06　实际：05'))}
   tile.append(shot,$el('div','cam-title','CAM 0'+id+' / '+n[id-1]));tile.addEventListener('click',()=>{cam=id;act('camera',id);renderModal()});grid.append(tile);
  }body.append(grid);
  if(s.flags.sawSelf&&!s.flags['resolved:self'])btn('关闭监控电闸 · 十秒',()=>{act('power');renderModal()});
  if(s.flags.sawSixth&&!s.flags['resolved:sixth'])btn('不靠近冷柜，继续值班',()=>{act('choose','avoid');renderModal()});
 }else if(modal==='log'){
  title.textContent='值班记录';p('记录来自实际发生过的行动与事件，按最近时间倒序。');
  for(const e of s.log){const row=$el('div','log-row');row.append($el('time','',time(e.minute)),document.createTextNode(e.text));body.append(row)}
  if(s.flags.archiveAvailable&&!s.flags.archive)btn('读取旧员工录像（线索）',()=>{act('choose','archive');renderModal()});
 }else if(modal==='settings'){
  title.textContent='设置 / 存档';p('自动保存于本机浏览器。切出页面或阅读面板时游戏时间会暂停，不会强制消耗夜班时间。');
  btn('关闭／开启环境音效',toggleSound);btn('重开第一晚（清空此支线存档）',()=>{if(confirm('重开便利店第一晚？当前夜班进度将被清空。')){game.reset();closeModal();$('#intro').hidden=false}});
  btn('返回便利店日常模式',()=>location.href='../');
 }
}
function renderIncident(s){const root=$('#incident'),pending=['door3','hood','self','sixth','knock','call','record'].find(id=>s.flags['event:'+id]&&!s.flags['resolved:'+id]&&!(id==='record'&&s.flags.archive));
 if(!pending||s.finished){root.hidden=true;return}
 root.hidden=!!modal;$('#incident-title').textContent=eventText[pending].title;
 const ev=Core.EVENTS.find(x=>x.id===pending);$('#incident-description').textContent=ev?.text||'';
 const area=$('#incident-buttons');area.replaceChildren();
 for(const [label,action]of eventText[pending].buttons){const b=$el('button',['greet','inspectSixth','openKnock','answerCall'].includes(action)?'danger':'',label);
  if(action==='power'&&!s.flags.sawSelf){b.disabled=true;b.title='请先查看监控4号'}
  b.addEventListener('click',()=>{if(action==='cam4'){openModal('cctv');act('camera',4);renderModal()}
   else if(action==='power')act('power');else act('choose',action);render()});area.append(b)}
}
function renderSceneActions(s){const host=$('#scene-action-buttons');host.replaceChildren();$('#scene-prompt').textContent=s.incidents.length&&s.elapsed>=96&&s.scene==='counter'?'门口的声响与收银提示音交错在一起。':prompt[s.scene];
 const buttons=[];
 if(s.scene==='counter'){if(s.order)buttons.push(['给'+s.order.who+'结账',()=>{$('#cashier').dataset.opened='1';$('#cashier').hidden=false;renderCashier(s)}]);else buttons.push(['清洁收银台',()=>act('clean')]);buttons.push(['翻看交接手册',()=>openModal('manual')]);}
 if(s.scene==='aisle')buttons.push(['货架补货',()=>act('restock')],['清理地面',()=>act('clean')]);
 if(s.scene==='cooler')buttons.push(['查看冷柜监控',()=>{openModal('cctv');act('camera',3);renderModal()}],['整理冷柜',()=>act('clean')]);
 if(s.scene==='stockroom')buttons.push(['取货补充库存',()=>act('restock')]);
 if(s.scene==='office')buttons.push(['打开监控',()=>openModal('cctv')],['查看值班电话',()=>openModal('phone')],['旧员工档案',()=>act('choose','archive')]);
 if(s.scene==='entrance')buttons.push([s.door==='locked'?'解锁玻璃门':'检查并锁好门',()=>act('choose',s.door==='locked'?'unlock':'lock')]);
 for(const [label,fn]of buttons){const b=$el('button','',label);b.addEventListener('click',fn);host.append(b)}
}
function renderCashier(s){const root=$('#cashier');if(root.hidden||!s.order)return;const order=s.order;$('#customer-name').textContent=order.who;$('#customer-sub').textContent=order.special?'请核对店长发布的特殊交货规则':'顾客等待正常结账';const map=Object.fromEntries(Core.PRODUCTS.map(p=>[p.id,p]));
 $('#order-total').textContent='¥'+order.items.reduce((v,id)=>v+map[id].price,0);$('#order-instruction').textContent=s.paid?'已收款 · 请选择交付方式':'逐件扫码 / 再收款';$('#checkout-progress').textContent='已扫描 '+s.scanned.length+' / '+order.items.length;
 const tray=$('#product-buttons');tray.replaceChildren();for(const id of [...new Set(order.items)]){const p=map[id],need=order.items.filter(x=>x===id).length,done=s.scanned.filter(x=>x===id).length,b=$el('button',s.selected===id?'selected':'',p.icon+' '+p.name);b.append($el('small','',done+'/'+need));b.disabled=s.paid||done>=need;b.addEventListener('click',()=>act('select',id));tray.append(b)}
 $('#checkout-scan').disabled=!s.selected||s.paid;$('#checkout-pay').disabled=s.paid||s.scanned.length!==order.items.length;$('#checkout-bag').disabled=!s.paid;$('#checkout-no-bag').disabled=!s.paid;$('#checkout-no-bag').classList.toggle('primary',!!order.special);
}
function renderEnding(s){if(!s.finished)return;const t={replaced:['被替代','你确实完成了夜班。但监控录像里，另一个穿着相同制服的人比你先走出了门。交接记录上，已经没有你的名字。'],truth:['带走录像的人','你在06:00带着完整的监控记录走出店门。那些规则不是为了让怪物进不来，而是为了让值班员始终留在原来的位置。'],survive:['平安下班','06:00，天亮了。你交出钥匙、领到夜班工资。街道没有变化，可收银台背后的监控仍有一格保持着黑屏。']};const [title,desc]=t[s.ending]||t.survive;
 $('#ending-title').textContent=title;$('#ending-text').textContent=desc;$('#ending-stats').textContent='完成订单 '+s.customers+'　|　夜班收入 ¥'+s.wage+'　|　违规 '+s.violations+'　|　调查线索 '+s.insight;$('#ending').hidden=false;$('#incident').hidden=true;$('#cashier').hidden=true;modal='';$('#modal-layer').hidden=true;}
function render(){const s=game.snapshot();$('#game').dataset.area=s.scene;$('#game').dataset.phase=String(s.elapsed<90?0:s.elapsed<173?1:s.elapsed<232?2:s.elapsed<337?3:s.elapsed<407?4:5);$('#game').dataset.shadow=String((s.flags['event:hood']&&!s.flags['resolved:hood']&&s.scene==='entrance')||(s.flags['event:sixth']&&!s.flags['resolved:sixth']&&s.scene==='cooler')||(s.flags['event:knock']&&!s.flags['resolved:knock']&&s.scene==='stockroom'));$('#game').dataset.blackout=String(s.power==='off');
 $('#clock').textContent=time(s.elapsed);$('#money').textContent='¥'+s.money;$('#orders').textContent=s.customers+' 单';$('#stress').textContent=s.violations?'异常警报 '+s.violations:s.stress>=35?'紧张':'平静';$('#stress').style.color=s.violations?'#edaaa1':'';$('#area-label').textContent=names[s.scene];$('#ambient-line').textContent=s.elapsed>=210?'冰柜的嗡鸣比刚才更响了。':'雨点不时敲在落地玻璃上。';$('#task').textContent=s.order?'正在等待结账：'+s.order.who:s.flags['event:rules']&&!s.manualRead?'店长发来新的夜班规则。':'继续值班，谨慎核实异常。';
 $$('[data-area]').forEach(b=>{b.classList.toggle('active',b.dataset.area===s.scene);b.disabled=!s.started||s.finished});
 if(s.scene==='counter'&&s.order&&s.started){if($('#cashier').dataset.opened==='1')$('#cashier').hidden=false;renderCashier(s)}else $('#cashier').hidden=true;
 if(!s.finished){renderSceneActions(s);renderIncident(s)}if(modal)renderModal();if(s.finished)renderEnding(s);
}
let lastElapsed=game.snapshot().elapsed;
game.subscribe((s,kind)=>{if(kind==='time'&&s.elapsed!==lastElapsed){const ev=Core.EVENTS.filter(x=>x.at>lastElapsed&&x.at<=s.elapsed);if(ev.length){sound(145,.38);note(ev.at(-1).text)}}lastElapsed=s.elapsed;render()});
for(const b of $$('[data-area]'))b.addEventListener('click',()=>{act('move',b.dataset.area);$('#cashier').dataset.opened='0'});
$('#begin').addEventListener('click',()=>{if(!game.snapshot().started)act('start');$('#intro').hidden=true;$('#cashier').dataset.opened='1';render()});
$('#cashier-close').addEventListener('click',()=>{$('#cashier').dataset.opened='0';$('#cashier').hidden=true});
$('#checkout-scan').addEventListener('click',()=>act('scan'));$('#checkout-pay').addEventListener('click',()=>act('charge'));$('#checkout-bag').addEventListener('click',()=>act('handoff',true));$('#checkout-no-bag').addEventListener('click',()=>act('handoff',false));
$('#model-scanner').addEventListener('click',()=>act('scan'));$('#model-card').addEventListener('click',()=>act('charge'));$('#model-bag').addEventListener('click',()=>act('handoff',true));
$('#open-manual').addEventListener('click',()=>openModal('manual'));$('#open-cctv').addEventListener('click',()=>openModal('cctv'));$('#open-phone').addEventListener('click',()=>openModal('phone'));$('#open-log').addEventListener('click',()=>openModal('log'));$('#open-settings').addEventListener('click',()=>openModal('settings'));$('#modal-backdrop').addEventListener('click',closeModal);$('#modal-close').addEventListener('click',closeModal);$('#toggle-sound').addEventListener('click',toggleSound);$('#skip-15').addEventListener('click',()=>act('advance',15));$('#ending-restart').addEventListener('click',()=>{game.reset();$('#ending').hidden=true;$('#intro').hidden=false;$('#cashier').dataset.opened='0';render()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modal)closeModal();else if(!$('#cashier').hidden)$('#cashier').hidden=true;return}if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;const key={r:'manual',c:'cctv',p:'phone',l:'log'}[e.key.toLowerCase()];if(key){e.preventDefault();openModal(key)}if(e.code==='Space'&&!$('#cashier').hidden&&game.snapshot().order){e.preventDefault();act('scan')}});
window.addEventListener('visibilitychange',()=>{if(document.hidden){game.persist();audio?.suspend()}else if(!muted)audio?.resume()});window.addEventListener('pagehide',game.persist);
setInterval(()=>{if(document.hidden||modal||!$('#intro').hidden||game.snapshot().finished)return;game.advance(1)},1800);
window.PaperWorldNightGame=Object.freeze({game,inspect:game.snapshot,openModal,closeModal,render,go:area=>act('move',area)});
if(game.snapshot().started){$('#intro').hidden=true;$('#cashier').dataset.opened='1'}render();
})();
