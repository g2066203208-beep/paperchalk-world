/* Paperchalk World / first-play opening flow.
 * FULL STORY intent: battle roguelike cold open -> first death -> bedroom
 * morning prologue; uninterrupted run may finish without reaching the city.
 * TEMPORARY BUILD: combat is still under development, so new game launches
 * directly into this SAME bedroom morning, not a fabricated battle result.
 * Isolated from demo combat and from the surface-world economy save.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(root)root.PaperWorldOpeningFlow=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const VERSION=1,KEY='paperchalk-opening-v1';
  const PHASES=Object.freeze(['not-started','waking','day']);
  function sanitize(raw,maxLines){
    const phase=PHASES.includes(raw?.phase)?raw.phase:'not-started';
    return Object.freeze({version:VERSION,phase,
      line:phase==='waking'&&Number.isInteger(raw?.line)?
        Math.max(0,Math.min(maxLines-1,raw.line)):0});
  }
  function create({storage=null,lineCount=1}={}){
    const maxLines=Math.max(1,Math.min(256,Number.isInteger(lineCount)?lineCount:1));
    let state=sanitize(null,maxLines);
    if(storage)try{
      const raw=JSON.parse(storage.getItem(KEY)||'null');
      if(raw?.version===VERSION)state=sanitize(raw,maxLines);
    }catch(_){}
    const snapshot=()=>({...state,hasSave:state.phase!=='not-started'});
    const persist=()=>{if(!storage)return false;try{
      storage.setItem(KEY,JSON.stringify(state));return true;
    }catch(_){return false}};
    function newGame(){state=sanitize({phase:'waking',line:0},maxLines);persist();return snapshot()}
    function progress(line){
      if(state.phase!=='waking'||!Number.isInteger(line)||line<0||line>=maxLines)return false;
      state=sanitize({phase:'waking',line},maxLines);persist();return true;
    }
    function finish(){
      if(state.phase!=='waking')return false;
      state=sanitize({phase:'day'},maxLines);persist();return true;
    }
    return Object.freeze({snapshot,newGame,progress,finish,persist});
  }
  return Object.freeze({VERSION,KEY,PHASES,create,sanitize});
});
