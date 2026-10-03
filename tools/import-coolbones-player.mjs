#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Coolbones is the authoring format. The project already contains the
// lossless Spine 4.3 export beside it; copy that native runtime package rather
// than flattening mesh attachments into planes.
const source=path.resolve(process.argv[2]||'C:/Users/REME/Documents/Codex/2026-10-01/ni/outputs/Magic-Arknights-original/Coolbones-project');
const destination=path.resolve(process.argv[3]||fileURLToPath(new URL('../studio/assets/player/spine/',import.meta.url)));
const originalRoot=path.dirname(source);
const exportRoot=path.join(originalRoot,'assets');
const runtimeSource=path.join(originalRoot,'preview','vendor','spine43.js');
const jsonSource=path.join(exportRoot,'magic_g.json');
const atlasSource=path.join(exportRoot,'magic_g.atlas');
const imageSource=path.join(exportRoot,'images');

for(const file of [jsonSource,atlasSource,runtimeSource]){
  try{await fs.access(file);}catch{throw new Error(`Missing native Spine export: ${file}`);}
}
const project=JSON.parse(await fs.readFile(path.join(source,'project.cane'),'utf8'));
if(project.format!=='cane-project')throw new Error(`Unsupported source format: ${project.format||'unknown'}`);
const skeleton=project.skeletons?.find(item=>item.name==='magic_g')||project.skeletons?.find(item=>item.skeletonId==='skeleton-2');
if(!skeleton)throw new Error('Coolbones project does not contain the magic_g skeleton.');
const spine=JSON.parse(await fs.readFile(jsonSource,'utf8'));
if(spine.skeleton?.spine!=='4.3'||spine.skeleton?.name!=='magic_g')throw new Error('The native export is not the expected Spine 4.3 magic_g skeleton.');
const images=(await fs.readdir(imageSource)).filter(file=>file.toLowerCase().endsWith('.png')).sort();
await fs.rm(destination,{recursive:true,force:true});
await fs.mkdir(path.join(destination,'images'),{recursive:true});
await fs.copyFile(jsonSource,path.join(destination,'magic_g.json'));
await fs.copyFile(atlasSource,path.join(destination,'magic_g.atlas'));
await fs.copyFile(runtimeSource,path.join(destination,'spine43.js'));
for(const file of images)await fs.copyFile(path.join(imageSource,file),path.join(destination,'images',file));
console.log(JSON.stringify({source,destination,format:project.format,skeleton:skeleton.name,target:spine.skeleton.spine,bones:spine.bones.length,slots:spine.slots.length,images,animations:Object.keys(spine.animations).filter(name=>/Move|Relax|Interact|Run/.test(name))},null,2));
