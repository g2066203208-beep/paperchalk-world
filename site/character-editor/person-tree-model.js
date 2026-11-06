/* Paperchalk Studio: character identity and resource taxonomy.
 * Pure, deterministic navigation model.  Editing an actor, playing an action,
 * opening an outfit, and opening a source PSD are FOUR different operations.
 * This module never touches ArtMesh order or source textures.
 * The same code runs in the browser and in Node regression tests. */
(function(root){
'use strict';
// One stable PERSON root per canon actor. The tree alternates women and
// men in roster order, not alphabetical/source-ZIP discovery order.
const NAMES=Object.freeze({
 protagonist:'女主', 'char-003':'男主',
 'char-002':'女二',male2:'男二',
 'char-004':'女三','char-020':'男三',
 'char-005':'女四','male4':'男四',
 'char-006':'女五','male5':'男五',
 'female-06':'女六','male6':'男六','female-07':'女七'
});
const ORDER=[
 'protagonist','char-003',
 'char-002','male2',
 'char-004','char-020',
 'char-005','male4',
 'char-006','male5',
 'female-06','male6',
 'female-07'
];
const FALLBACK=[
 [/^(?:女主角?|女一)(?:\s|[·（(:：/-]|$)/,'protagonist'],
 [/^(?:女二号?|女2)(?:\s|[·（(:：/-]|$)/,'char-002'],
 [/^(?:男主角?|男一)(?:\s|[·（(:：/-]|$)/,'char-003'],
 [/^男二(?:\s|[·（(:：/-]|$)/,'male2'],
 [/^女三(?:\s|[·（(:：/-]|$)/,'char-004'],
 [/^男三(?:\s|[·（(:：/-]|$)/,'char-020'],
 [/^女四(?:\s|[·（(:：/-]|$)/,'char-005'],
 [/^女五(?:\s|[·（(:：/-]|$)/,'char-006'],
 [/^女六(?:\s|[·（(:：/-]|$)/,'female-06'],
 [/^女老师(?:\s|[·（(:：/-]|$)/,'char-006']
];
function familyOf(record){
 const id=String(record?.id||''),raw=String(record?.familyId||id);
 // Retired char-016 was an older, explicitly superseded male-two import.
 // Keep its editable bytes / deep links, never create an extra person root.
 if(id==='char-016'||raw==='char-016')return 'male2';
if(id==='male2'||raw==='male2')return 'male2';
 if(id==='protagonist'||id.startsWith('protagonist-')||
    raw==='protagonist')return 'protagonist';
 for(const name of ['char-002','char-003','char-004','char-005','char-020']){
  if(id===name||id.startsWith(name+'-')||raw===name)return name;
 }
 if(id==='class-teacher-geography-candidate'||raw==='class-teacher-geography-candidate')return 'char-006';
 if(raw==='char-006'||id==='char-006'||id.startsWith('char-006-'))return 'char-006';
 if(id==='female-06'||id.startsWith('female-06-')||raw==='female-06')return 'female-06';
 if(id==='female-07'||id.startsWith('female-07-')||raw==='female-07')return 'female-07';
 for(const [pattern,canonical] of FALLBACK)
  if(pattern.test(String(record?.label||'').trim()))return canonical;
 return raw;
}
function visibleArt(record){
 if(!record)return false;
 const v=record.l2dModule||{};
 const s=v.front||v.back;
 return !!(s?.rig||s?.clip||record.clips?.front||record.clips?.back||
   ((record.front||record.back)&&!record.draft&&!record.editorOnly));
}
function canonicalActions(primary){
 const declared=primary?.l2dModule?.front?.actions||primary?.actions||[];
 return new Set(Array.isArray(declared)?declared:[]);
}
function categoryOf(record,primary,family){
 const id=String(record.id),kind=String(record.variantCategory||'default');
 if(id===primary.id)return 'base';
 // Former "new clothes" male-front ID is an internal SOURCE alias only.
 // Even old user-imported records must not create a fake second outfit.
 if(family==='char-003'&&id==='char-003-outfit-02')return 'source';
 const actions=canonicalActions(primary);
 // The standalone 24-layer battle PSD is an editable source document,
 // NOT a second combat action or a second playable protagonist.
 if(family==='protagonist'&&id==='protagonist-battle-front'&&actions.has('combat'))
  return 'source';
 if(/(?:-psd(?:-|$)|-rig-v\d+|-unified-v\d+|-source(?:-|$)|-backup(?:-|$))/i.test(id))
  return 'source';
 if((kind==='outfit'||/(?:outfit|sleepwear|costume|wardrobe|pajama)/i.test(id))){
  return visibleArt(record)?'outfit':'pending';
 }
 if(kind==='combat'||kind==='action'){
  return visibleArt(record)?'action':'source';
 }
 // Uncategorised imported meshes are real editable sources but should
 // never become an additional costume/action just because labels look alike.
 return 'legacy';
}
function namesFor(record,category){
 const label=String(record.label||record.id).trim();
 const id=String(record.id||'');
 if(id==='protagonist-sleepwear')return '睡衣';
 if(id==='protagonist-battle-front')return '战斗 PSD · 原始 24 部件';
 if(id==='char-003-outfit-02')return '新服装';
 // Historic asset ID stays stable for saved PSD bones and IndexedDB drafts.
 if(category==='source')return label.replace(/^(?:女主角?|男主角?)\s*[·:：-]\s*/,'');
 if(category==='pending')return label.replace(/\s*[（(].*?待导入.*?[）)]/g,'');
 return label.replace(/^(?:女主角?|女二号?|女三|男主角?|男二|女老师)\s*[·:：-]\s*/,'')
  .replace(/\s*· 未导入立绘$/,'')||id;
}
function displayName(primary,family){
 return NAMES[family]||String(primary?.label||family)
  .replace(/\s*· 未导入立绘$/,'').replace(/^char-(\d+)$/i,'角色 $1');
}
function makeTree(records,currentId=''){
 const groups=new Map();
 for(const record of records||[]){
  if(!record||typeof record.id!=='string'||!record.id)continue;
  // The user's THIRD outfit is the canonical female-06 base; legacy
  // source IDs must never resurrect as a selectable wardrobe from stale DB.
  if(record.id==='female-06-second-outfit'||record.id==='female-06-outfit-02')continue;
  const family=familyOf(record);
  if(!groups.has(family))groups.set(family,[]);
  groups.get(family).push(record);
 }
 const result=[];
 for(const [family,all] of groups){
  const primary=all.find(x=>x.id===family)||
   all.find(x=>visibleArt(x)&&x.variantCategory!=='combat'&&
    x.variantCategory!=='outfit')||all[0];
  const actionSet=canonicalActions(primary);
  const variants={outfits:[],actions:[],sources:[],legacy:[],pending:[]};
  for(const entry of all){
   if(entry.id===primary.id)continue;
   const type=categoryOf(entry,primary,family);
   const item={id:entry.id,label:namesFor(entry,type),record:entry,type};
   if(type==='outfit')variants.outfits.push(item);
   else if(type==='action')variants.actions.push(item);
   else if(type==='source')variants.sources.push(item);
   else if(type==='pending')variants.pending.push(item);
   else variants.legacy.push(item);
  }
  // Canonical actions belong to the SAME rig, rather than creating a second
  // character with the same head/body.  Idle = base front, combat = local swap.
  if(primary.id==='protagonist'&&actionSet.has('combat'))
   variants.actions.unshift({id:primary.id,action:'combat',
    label:'战斗 · 持斧',type:'action',canonical:true});
  const hasArt=all.some(visibleArt);
  if(!hasArt&&family!=='male2'&&!all.some(x=>x.id===currentId))continue;
  const face={front:!!(primary.front||primary.l2dModule?.front),
   back:!!(primary.back||primary.l2dModule?.back)};
  // Wardrobe numbers, not historical ZIP filenames, define costume order.
  variants.outfits.sort((a,b)=>{
   const n=x=>Number((x.label.match(/^第([一二三四五六七八九十])套/)||[])[1]&&
     ({一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10})[x.label[1]])||99;
   return n(a)-n(b)||a.label.localeCompare(b.label,'zh-CN');
  });
  const rank=ORDER.indexOf(family);
  const sources=[...variants.sources,...variants.legacy,...variants.pending]
   .sort((a,b)=>({source:0,legacy:1,pending:2}[a.type]-
                   {source:0,legacy:1,pending:2}[b.type])||
                   a.label.localeCompare(b.label,'zh-CN'));
  result.push({
   family,name:displayName(primary,family),primary,faces:face,
   actions:variants.actions,outfits:variants.outfits,sources,
   hasArt,rank:rank<0?1000:rank
  });
 }
 result.sort((a,b)=>a.rank-b.rank||a.name.localeCompare(b.name,'zh-CN'));
 return result;
}
const api=Object.freeze({familyOf,visibleArt,categoryOf,displayName,makeTree});
root.PaperchalkCharacterLibrary=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
