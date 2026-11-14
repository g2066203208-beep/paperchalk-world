/* Reusable declarative card registry. No forest or unit-specific logic here.
 * Packs are registered once. Decks, facility rules, enemy rosters and UI
 * consume the SAME card definitions and validate scope before gameplay.
 */
(function(root){'use strict';
const SCOPES=['profession','faction','character','enemy'];
const TYPES=['attack','guard','resource','facility','support','enemy-action'];
const ESSENCES=['material','life','magic'];
const freezeCard=x=>Object.freeze({...x,
  ...(x.footprint?{footprint:Object.freeze([...x.footprint])}:{}),
  ...(x.interactions?{interactions:Object.freeze(x.interactions.map(action=>Object.freeze({
   ...action,...(action.grant?{grant:Object.freeze({...action.grant})}:{})
  })))}:{})});
function create(){
 const packs=new Map(),cards=new Map(),byScope=new Map(SCOPES.map(scope=>[scope,[]]));
 function registerPack(pack){
  if(!pack||typeof pack.id!=='string'||!/^[a-z0-9-]+$/.test(pack.id)||
   packs.has(pack.id)||!SCOPES.includes(pack.scope)||
   !Array.isArray(pack.cards)||!pack.cards.length)
   throw Error('Invalid card pack: '+pack?.id);
  if(pack.scope!=='enemy'&&!pack.profession)
   throw Error('Profession required: '+pack.id);
  if(pack.scope==='faction'&&!pack.faction)throw Error('Faction required: '+pack.id);
  if(pack.scope==='character'&&!pack.characterId)
   throw Error('Character owner required: '+pack.id);
  if(pack.scope==='enemy'&&!pack.archetype)
   throw Error('Enemy archetype required: '+pack.id);
  const local=new Set(),registered=[];
  for(const card of pack.cards){
   if(!card||typeof card.id!=='string'||!/^[a-z0-9-]+$/.test(card.id)||
    cards.has(card.id)||local.has(card.id)||!TYPES.includes(card.type)||
    !card.name||typeof card.name!=='string')
    throw Error('Invalid/duplicate card registration: '+card?.id);
   if(pack.scope==='enemy'&&card.type!=='enemy-action')
    throw Error('Enemy pack may only register enemy actions: '+card.id);
   if(pack.scope!=='enemy'&&card.type==='enemy-action')
    throw Error('Enemy action outside enemy pack: '+card.id);
   if(card.type==='facility'){
    const fp=card.footprint;
    if(!Array.isArray(fp)||fp.length!==2||
     fp.some(n=>!Number.isInteger(n)||n<1||n>3)||
     !Number.isFinite(card.facilityHp)||card.facilityHp<=0||
     !card.facilityRole)
     throw Error('Facility needs footprint, durability and role: '+card.id);
   }
   if(card.type==='resource'&&(!ESSENCES.includes(card.essence)||
     !Number.isInteger(card.amount)||card.amount<=0))
    throw Error('Resource card needs typed essence: '+card.id);
   if(card.interactions&&(!Array.isArray(card.interactions)||
    card.interactions.some(action=>!action||!action.cardId||
      !action.grant||!ESSENCES.includes(action.grant.essence)||
      !Number.isInteger(action.grant.amount)||action.grant.amount<0)))
    throw Error('Card interactions require a valid target and typed essence: '+card.id);
   if(card.type==='enemy-action'&&(
    !['attack','guard','raid','rally'].includes(card.kind)||
    (['attack','raid'].includes(card.kind)&&(!Number.isFinite(card.damage)||card.damage<0))||
    (['guard','rally'].includes(card.kind)&&(!Number.isFinite(card.block)||card.block<0))))
    throw Error('Invalid registered enemy skill: '+card.id);
   if(card.type==='attack'&&(!Number.isFinite(card.power)||card.power<0))
    throw Error('Attack needs power: '+card.id);
   if(card.type==='guard'&&(!Number.isFinite(card.block)||card.block<=0))
    throw Error('Guard needs block: '+card.id);
   local.add(card.id);
   const item=freezeCard({...card,packId:pack.id,scope:pack.scope,
    profession:pack.profession||null,faction:pack.faction||null,
    characterId:pack.characterId||null,archetype:pack.archetype||null,
    family:pack.scope==='profession'?'common':pack.scope==='faction'?'faction':pack.scope==='character'?'character':'enemy'});
   registered.push(item);
  }
  const def=Object.freeze({id:pack.id,scope:pack.scope,
   profession:pack.profession||null,faction:pack.faction||null,
   characterId:pack.characterId||null,archetype:pack.archetype||null,
   cards:Object.freeze(registered)});
  packs.set(pack.id,def);
  for(const item of registered){cards.set(item.id,item);byScope.get(pack.scope).push(item);}
  return def.id;
 }
 function cardsFor(owner){
  if(!owner?.profession)return [];
  return [...cards.values()].filter(card=>
   card.profession===owner.profession&&
   (card.scope==='profession'||
    (card.scope==='faction'&&card.faction===owner.faction)||
    (card.scope==='character'&&card.characterId===owner.characterId))
  ).map(c=>({...c}));
 }
 function forProfession(profession){
  return [...cards.values()].filter(c=>c.profession===profession&&c.scope!=='enemy').map(c=>({...c}));
 }
 function get(id){const c=cards.get(id);return c?{...c}:null;}
 function forArchetype(archetype){return byScope.get('enemy').filter(c=>c.archetype===archetype)
  .map(({type,scope,packId,family,archetype,profession,faction,characterId,...card})=>({...card}));}
 function facilities(){return [...cards.values()].filter(c=>c.type==='facility').map(c=>({...c}));}
 function snapshot(){return{packs:packs.size,cards:cards.size,
  scopes:Object.fromEntries([...byScope].map(([k,v])=>[k,v.length])),
  names:[...packs.keys()]};}
 return Object.freeze({registerPack,cardsFor,forProfession,forArchetype,facilities,get,
  get snapshot(){return snapshot();},version:'1.1.0-validated-interactions'});
}
root.PaperchalkCardRegistry=Object.freeze({version:'1.0.0',create});
})(window);
