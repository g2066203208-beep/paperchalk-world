#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const source=path.resolve(process.argv[2]||'C:/Users/REME/Documents/Codex/2026-10-01/ni/outputs/Magic-Arknights-original/Coolbones-project');
const destination=path.resolve(process.argv[3]||fileURLToPath(new URL('../studio/assets/player/coolbones/',import.meta.url)));
const project=JSON.parse(await fs.readFile(path.join(source,'project.cane'),'utf8'));
const skeleton=project.skeletons.find(item=>item.name==='magic_g')||project.skeletons.find(item=>item.skeletonId==='skeleton-2');
if(!skeleton)throw new Error('Coolbones project does not contain the magic_g skeleton.');
const imageById=new Map(project.images.map(image=>[image.imageId,image]));
const boneById=new Map(skeleton.bones.map(bone=>[bone.boneId,bone]));

function boneWorld(boneId,cache=new Map()){
  if(cache.has(boneId))return cache.get(boneId);
  const bone=boneById.get(boneId);
  if(!bone||!bone.parentId){const root={x:bone?.x||0,y:bone?.y||0,r:bone?.rotation||0,sx:bone?.scaleX||1,sy:bone?.scaleY||1};cache.set(boneId,root);return root;}
  const parent=boneWorld(bone.parentId,cache),rad=parent.r*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad);
  const result={x:parent.x+(c*bone.x-s*bone.y)*parent.sx,y:parent.y+(s*bone.x+c*bone.y)*parent.sy,r:parent.r+bone.rotation,sx:parent.sx*bone.scaleX,sy:parent.sy*bone.scaleY};
  cache.set(boneId,result);return result;
}
function inversePoint(transform,x,y){const rad=-transform.r*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad);return [(c*(x-transform.x)+s*(y-transform.y))/transform.sx,(-s*(x-transform.x)+c*(y-transform.y))/transform.sy];}
function animationValue(keys,time,field,base){
  if(!keys?.length)return base;
  if(time<=keys[0].time)return keys[0][field];
  const last=keys[keys.length-1];if(time>=last.time)return last[field];
  let index=1;while(index<keys.length&&keys[index].time<time)index++;
  const a=keys[index-1],b=keys[index];if(a.curve==='stepped')return a[field];
  const u=(time-a.time)/Math.max(1e-6,b.time-a.time);return a[field]+(b[field]-a[field])*u;
}
function sampleAnimation(animation){
  const fps=Math.min(30,Math.max(12,Math.round(animation.fps||30))),count=Math.max(1,Math.ceil(animation.duration*fps));
  const timelines=new Map(animation.boneTimelines.map(item=>[item.boneId,item]));
  const frames=[];
  for(let frame=0;frame<count;frame++){
    const time=Math.min(animation.duration,frame/fps),bones={};
    for(const bone of skeleton.bones){const timeline=timelines.get(bone.boneId);bones[bone.boneId]={
      x:animationValue(timeline?.translateX,time,'value',bone.x),y:animationValue(timeline?.translateY,time,'value',bone.y),
      r:animationValue(timeline?.rotate,time,'angle',bone.rotation),sx:animationValue(timeline?.scaleX,time,'value',bone.scaleX),sy:animationValue(timeline?.scaleY,time,'value',bone.scaleY)
    };}
    frames.push(bones);
  }
  return {duration:animation.duration,fps,frames};
}
const wantedAnimations=['ark_relax','ark_move','ark_interact','amiya_run'];
const animations=Object.fromEntries(wantedAnimations.map(id=>{const animation=skeleton.animations.find(item=>item.animationId===id);if(!animation)throw new Error(`Missing Coolbones animation: ${id}`);return [id,sampleAnimation(animation)];}));
const slots=skeleton.slots.filter(slot=>slot.alpha>0).map(slot=>({id:slot.slotId,boneId:slot.boneId,attachmentId:slot.attachmentId,zIndex:slot.zIndex,alpha:slot.alpha}));
const images=[];const imageNames=new Set();
const attachments=skeleton.attachments.filter(attachment=>slots.some(slot=>slot.attachmentId===attachment.attachmentId)).map(attachment=>{
  const image=imageById.get(attachment.imageId);if(!image)throw new Error(`Missing image for attachment ${attachment.attachmentId}`);
  const outputName=path.basename(image.path);if(!imageNames.has(image.imageId)){imageNames.add(image.imageId);images.push({imageId:image.imageId,name:image.name,width:image.width,height:image.height,file:outputName});}
  let bbox=null;
  if(Array.isArray(attachment.vertices)&&attachment.vertices.length){const xs=[],ys=[];for(let index=0;index<attachment.vertices.length;index+=2){xs.push(attachment.vertices[index]);ys.push(attachment.vertices[index+1]);}bbox=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];}
  const slot=slots.find(item=>item.attachmentId===attachment.attachmentId);
  const parent=boneWorld(slot.boneId);const center=bbox?inversePoint(parent,(bbox[0]+bbox[2])/2,(bbox[1]+bbox[3])/2):[attachment.x||0,attachment.y||0];
  return {id:attachment.attachmentId,type:attachment.type,imageId:attachment.imageId,boneId:slot.boneId,x:attachment.x||0,y:attachment.y||0,rotation:attachment.rotation||0,scaleX:attachment.scaleX??1,scaleY:attachment.scaleY??1,width:image.width,height:image.height,bbox,localCenter:center};
});
const manifest={format:'coolbones-runtime-v1',name:skeleton.name,referenceScale:skeleton.referenceScale,bones:skeleton.bones.map(bone=>({id:bone.boneId,parentId:bone.parentId,x:bone.x,y:bone.y,rotation:bone.rotation,scaleX:bone.scaleX,scaleY:bone.scaleY})),slots,attachments,images,animations};
await fs.mkdir(path.join(destination,'images'),{recursive:true});
for(const image of images)await fs.copyFile(path.join(source,'images',image.file),path.join(destination,'images',image.file));
await fs.writeFile(path.join(destination,'player.json'),JSON.stringify(manifest));
console.log(JSON.stringify({source,destination,skeleton:skeleton.name,bones:manifest.bones.length,slots:manifest.slots.length,attachments:manifest.attachments.length,images:manifest.images.length,animations:Object.keys(manifest.animations)},null,2));
