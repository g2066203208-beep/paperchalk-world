/* Content-driven NPC dialogue + quest state. Deterministic game state; no LLM authority. */
(function(global){
'use strict';

function createDialogueSystem({quests=[],npcDefinitions=[]}={}){
  const defs=new Map((npcDefinitions||[]).map(n=>[n.id,n]));
  const qdefs=new Map((quests||[]).map(q=>[q.id,q]));
  const qstate=new Map();
  let lastDialogue=null,version=0;
  const talked=new Set();

  function stateFor(id){
    let s=qstate.get(id);
    if(!s){s={id,status:'available',progress:{},startedAt:null,completedAt:null};qstate.set(id,s)}
    return s;
  }
  function questSnapshot(id){
    const def=qdefs.get(id),s=stateFor(id);
    return def?{id,name:def.name||id,status:s.status,progress:{...s.progress},objectives:(def.objectives||[]).map(o=>({...o,current:s.progress[o.id]||0}))}:null;
  }
  function activate(id,minutes){
    const s=stateFor(id);if(s.status!=='available')return false;
    s.status='active';s.startedAt=minutes??0;version++;return true;
  }
  function recordTalk(npcId,minutes){
    talked.add(npcId);
    for(const [id,def] of qdefs){
      const s=stateFor(id);if(s.status!=='active')continue;
      for(const o of def.objectives||[]){
        if(o.type!=='talk')continue;
        const allowed=!o.npcs?.length||o.npcs.includes(npcId);
        if(!allowed)continue;
        const key='talked:'+o.id;
        const set=new Set(Array.isArray(s.progress[key])?s.progress[key]:[]);
        set.add(npcId);s.progress[key]=[...set];s.progress[o.id]=set.size;
      }
      const complete=(def.objectives||[]).every(o=>(s.progress[o.id]||0)>=(Number(o.count)||1));
      if(complete)s.status='ready';
    }
    version++;
  }
  function complete(id,minutes){
    const s=stateFor(id);if(s.status!=='ready')return false;
    s.status='complete';s.completedAt=minutes??0;version++;return true;
  }

  function lineFor(def,kind){
    const d=def?.dialogue||{};
    const value=d[kind];
    if(Array.isArray(value)&&value.length)return String(value[version%value.length]);
    if(typeof value==='string')return value;
    const role=def?.role||'villager';
    if(kind==='greeting')return role==='elder'?'慢慢来，村子里的人都认得这张脸。':'你好。我们现在看起来都一样，但各自过各自的日子。';
    if(kind==='questStart')return '先认识一下村里的人吧。和三位村民说说话，再回来找我。';
    if(kind==='questReady')return '看来你已经和大家打过招呼了。欢迎来到A村。';
    if(kind==='questDone')return '村里的人已经认识你了。';
    return '今天也照常过日子。';
  }

  function interact(npc,{minutes=0}={}){
    const id=npc.id||npc.npc?.id,name=npc.npc?.name||npc.name||id,def=defs.get(id)||npc.definition||{};
    let text=lineFor(def,'greeting'),quest=null,changed=false;
    const given=[...qdefs.values()].find(q=>q.giver===id);
    if(given){
      const s=stateFor(given.id);
      if(s.status==='available'){
        activate(given.id,minutes);text=lineFor(def,'questStart');changed=true;
      }else if(s.status==='ready'){
        complete(given.id,minutes);text=lineFor(def,'questReady');changed=true;
      }else if(s.status==='complete')text=lineFor(def,'questDone');
      quest=questSnapshot(given.id);
    }
    recordTalk(id,minutes);
    if(given)quest=questSnapshot(given.id);
    else{
      const active=[...qdefs.keys()].map(questSnapshot).find(q=>q&&(q.status==='active'||q.status==='ready'));
      if(active)quest=active;
    }
    lastDialogue={npcId:id,name,text,quest,minutes,version:++version};
    return {...lastDialogue,changed};
  }

  function snapshot(){
    return {version,lastDialogue:lastDialogue?JSON.parse(JSON.stringify(lastDialogue)):null,quests:[...qdefs.keys()].map(questSnapshot),talked:[...talked],contentDriven:true,llmAuthority:false};
  }
  function exportState(){
    return {version,talked:[...talked],quests:[...qstate].map(([id,s])=>[id,JSON.parse(JSON.stringify(s))])};
  }
  function importState(data){
    if(!data||typeof data!=='object')return false;
    version=Number(data.version)||0;talked.clear();for(const id of data.talked||[])talked.add(String(id));
    qstate.clear();for(const row of data.quests||[])if(Array.isArray(row)&&row.length===2)qstate.set(String(row[0]),row[1]);
    return true;
  }
  function stats(){const snap=snapshot();return {quests:snap.quests.length,active:snap.quests.filter(q=>q.status==='active'||q.status==='ready').length,completed:snap.quests.filter(q=>q.status==='complete').length,dialogueSystem:true,questSystem:true,llmAuthority:false}}
  return Object.freeze({interact,snapshot,exportState,importState,stats});
}

global.PaperchalkNPCDialogue=Object.freeze({version:1,createDialogueSystem});
})(window);
