/* One-way compilation: authoritative authored metres in JSON -> browser-readable JS.
 * Run: node scripts/build_kirihama_location_plan.mjs
 * CI:  node scripts/build_kirihama_location_plan.mjs --check
 */
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const input=path.join(root,'site/data/kirihama-location-masterplan.v1.json');
const output=path.join(root,'site/game/kirihama-location-plan.js');
const plan=JSON.parse(fs.readFileSync(input,'utf8'));
if(plan.city!=='kirihama'||plan.sites?.length!==120||plan.districts?.length!==15)
 throw Error('Kirihama must have exactly 15 districts and 120 grounded sites');
const IDs=new Set();
for(const s of plan.sites){
 if(IDs.has(s.id))throw Error('Duplicate location '+s.id);
 IDs.add(s.id);
 if(!s.metroStationId||!s.localPosition||
    s.walking?.distanceM>1000||s.walking?.distanceM<0)
  throw Error('Missing station or invalid first/last-mile plan: '+s.id);
}
const compiled={
 version:plan.version,cityId:plan.city,coordinateSystem:plan.coordinateSystem,
 geography:plan.geography,accessStandard:plan.accessStandard,
 districts:plan.districts.map(d=>({id:d.id,name:d.name,core:d.core,character:d.character,
  siteCount:d.siteCount})),
 sites:plan.sites.map(s=>({id:s.id,name:s.name,districtId:s.districtId,
  metroStationId:s.metroStationId,localPosition:s.localPosition,
  walking:s.walking,status:s.status,legacyGameId:s.legacyGameId}))
};
const result='/* Generated from site/data/kirihama-location-masterplan.v1.json.\n'+
 ' * Planning-only site coordinates, not 120 completed game scenes.\n'+
 ' * Keep this array in sync via planning validation tests. */\n'+
 '(function(root){\'use strict\';\n root.PaperWorldKirihamaLocationPlan=Object.freeze('+
 JSON.stringify(compiled)+');\n})(window);\n';
if(process.argv.includes('--check')){
 if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==result)
  throw Error('Compiled Kirihama plan is stale. Run node scripts/build_kirihama_location_plan.mjs');
 console.log('Kirihama location plan compiled: 120 sites, 15 districts, precise site positions');
}else{
 fs.writeFileSync(output,result,'utf8');
 console.log('Updated '+output);
}
