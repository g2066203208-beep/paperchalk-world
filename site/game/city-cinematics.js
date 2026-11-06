/* Small, cancelable surface-world stage and story transition director.
 * No jump scares, fake combat, or global UI. Can later be supplied with
 * independently authored artwork, voice, L2D and music cues.
 */
(function(root){
 'use strict';
 const phrases=Object.freeze({
  school:{normal:['窗外传来操场上远远的说话声。','离上课还有一点时间。'],
    uneasy:['今天班里的座位似乎少了一张。','有人说学校最近在修改值日记录。']},
  convenience:{normal:['自动门轻轻打开。','收银台后传来扫码器的提示音。'],
    uneasy:['门口公告栏贴着一张新的营业时间通知。']},
  cafe:{normal:['店里有淡淡的咖啡香气。','兼职同事还没有忙完早上的准备工作。'],
    uneasy:['有人抱怨附近的交通临时调整，送货又晚了。']},
  mall:{normal:['扶梯仍然缓慢运转。','商场广播正在播报今日的营业安排。'],
    uneasy:['几家店铺的橱窗贴上了暂停营业的通知。']},
  park:{normal:['风从树梢间吹过。','公园里的人并不多。'],
    uneasy:['社区公告栏上又多了一张寻人启事。']}
 });
 function create(view){
  if(!view)throw Error('Cinematic director needs #view');
  const veil=document.createElement('div');veil.className='world-cinematic-veil';
  veil.hidden=true;veil.setAttribute('aria-hidden','true');
  const placard=document.createElement('div');placard.className='world-travel-title';
  veil.appendChild(placard);view.appendChild(veil);
  let sequence=0,seen=new Set();
  const delay=ms=>new Promise(resolve=>root.setTimeout(resolve,ms));
  const lowMotion=()=>root.matchMedia?.('(prefers-reduced-motion:reduce)').matches===true;
  async function transition({label='前往下一个地点',onCovered,kind='travel'}={}){
    const token=++sequence;veil.dataset.kind=kind;placard.textContent=label;
    veil.hidden=false;
    veil.classList.remove('is-visible');
    void veil.offsetWidth;
    veil.classList.add('is-visible');
    await delay(lowMotion()?30:340);
    if(token!==sequence)return false;
    if(typeof onCovered==='function')await onCovered();
    await delay(lowMotion()?30:190);
    if(token!==sequence)return false;
    veil.classList.remove('is-visible');
    await delay(lowMotion()?20:350);
    if(token!==sequence)return false;
    veil.hidden=true;return true;
  }
  async function enter(id,day,stage,onLine){
    const key=day+':'+id;
    if(seen.has(key)||!phrases[id]||typeof onLine!=='function')return;
    seen.add(key);
    const beats=phrases[id][stage>=2?'uneasy':'normal']||[];
    const token=++sequence;
    for(const phrase of beats){
      if(token!==sequence)return;
      onLine(phrase);
      await delay(lowMotion()?950:2000);
    }
  }
  function cancel(){sequence++;veil.hidden=true;veil.classList.remove('is-visible')}
  return Object.freeze({transition,enter,cancel,phrases});
 }
 root.PaperWorldCinematics=Object.freeze({create,phrases});
})(window);
