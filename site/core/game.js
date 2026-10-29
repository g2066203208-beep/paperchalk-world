/** Public facade: view consumes snapshots, never edits a system's private slice. */
import {createRuntime} from './runtime.js';
import {factionsSystem} from '../systems/factions.js';
import {peopleSystem} from '../systems/people.js';
import {civicSystem} from '../systems/civic.js';
import {dialogueSystem} from '../systems/dialogue.js';
import {newsSystem} from '../systems/news.js';
import {clockSystem} from '../systems/clock.js';
import {populationSystem} from '../systems/population.js';
import {operationsSystem} from '../systems/operations.js';
import {estatesSystem} from '../systems/estates.js';
import {transportSystem} from '../systems/transport.js';
import {contactsSystem} from '../systems/contacts.js';
import {justiceSystem} from '../systems/justice.js';
import {societySystem} from '../systems/society.js';
import {recruitmentSystem} from '../systems/recruitment.js';
import {politicsSystem} from '../systems/politics.js';
import {originSystem} from '../systems/origin.js';
import {campaignSystem} from '../systems/campaign.js';
import {nationSystem} from '../systems/nation.js';
export const runtime=createRuntime([newsSystem,dialogueSystem,civicSystem,justiceSystem,contactsSystem,
  transportSystem,estatesSystem,peopleSystem,operationsSystem,populationSystem,factionsSystem,clockSystem,societySystem,recruitmentSystem,politicsSystem,originSystem,campaignSystem,nationSystem]);
export function createWorld(legacy,raw){
 let candidate=null;
 try{candidate=typeof raw==='string'?JSON.parse(raw):raw;}catch{}
 if(candidate?.schema===1&&Number.isInteger(candidate.day)&&candidate.day>=1&&candidate.day<=10000&&
    Number.isInteger(candidate.seed)&&candidate.slices&&Array.isArray(candidate.slices.factions?.cells)&&candidate.slices.factions.cells.length===16&&
    Array.isArray(candidate.slices.people?.members)&&Array.isArray(candidate.slices.news?.articles)&&Array.isArray(candidate.events)&&candidate.events.length<=220){
   const world=structuredClone(candidate);
   if(world.day===legacy.day){
     const baseline=runtime.initial(world.seed,world.day);
     for(const id of runtime.moduleIds)if(!world.slices[id])world.slices[id]=baseline.slices[id];
     if(world.slices.estates?.parcels?.length===48&&world.slices.population?.people?.length===80&&Array.isArray(world.slices.justice?.cases))return world;
   }
 }
 const seed=20261028;
 const fresh=runtime.initial(seed,1);
 // Pre-existing v4 days have no historical AI evidence; migrate baseline forward consistently.
 const target=Math.min(10000,Math.max(1,legacy.day));
 if(target>1){fresh.day=target;fresh.events.unshift({id:'migration',day:target,source:'runtime',type:'save.migration',title:'旧存档兼容',text:'原有办公室经营进度已保留；新的世界模拟从当前日期开始。'});}
 return fresh;
}
export function applyWorld(world,action,legacy){
 return runtime.command(world,action,{cash:legacy.cash,heat:legacy.heat,crew:legacy.crew,respect:legacy.respect,orders:legacy.orders||[],detained:(world.slices.justice?.custody||[]).map(x=>x.subject)});
}
export function advanceWorld(world,legacyBefore,legacyAfter){
 if(world.day>=legacyAfter.day)return {ok:true,state:world,events:[],effects:[]};
 const result=runtime.advance(world,{cash:legacyAfter.cash,heat:legacyAfter.heat,crew:legacyAfter.crew,
  orders:legacyBefore.orders,respect:legacyAfter.respect,detained:(world.slices.justice?.custody||[]).map(x=>x.subject)});
 if(result.state.day!==legacyAfter.day)throw Error('World day mismatch after settlement');
 return result;
}
