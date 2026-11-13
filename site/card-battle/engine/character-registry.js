/* Reusable character-card registry. Content belongs to faction/profession modules,
 * not in scene-specific hard-coded arrays. Generated modules call register().
 * The build script auto-discovers new approved portraits in category folders.
 */
(function(root){
'use strict';
const known=new Map();
const professions=new Set(['engineer','guardian','warrior','ranger','skirmisher','medic','summoner']);
function register(value){
 if(!value||typeof value!=='object')throw Error('Invalid character record');
 const id=value.id,portrait=value.portrait;
 if(typeof id!=='string'||!/^[a-z0-9-]+$/.test(id))throw Error('Invalid character id');
 if(known.has(id))throw Error('Duplicate character id: '+id);
 if(!professions.has(value.profession))throw Error('Unknown profession: '+value.profession);
 if(typeof value.faction!=='string'||!value.faction.trim())throw Error('Missing faction');
 if(typeof portrait!=='string'||!portrait.startsWith('../assets/characters/'))throw Error('Bad art path');
 const record=Object.freeze({...value});
 known.set(id,record);return record;
}
function get(id){return known.get(id)||null;}
function list(filter={}){
 return [...known.values()].filter(c=>
  (!filter.faction||c.faction===filter.faction)&&
  (!filter.profession||c.profession===filter.profession));
}
root.PaperchalkCharacterRegistry=Object.freeze({
 version:'1.0.0',register,get,list,
 byFaction:faction=>list({faction}),byProfession:profession=>list({profession}),
 get size(){return known.size;}
});
})(window);
