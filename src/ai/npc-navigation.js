/* Dynamic voxel navigation for Paperchalk NPCs.
 * A* answers "where should I go"; steering/avoidance stays separate.
 */
(function(global){
'use strict';

const DIR4=[[1,0],[-1,0],[0,1],[0,-1]];
function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function key(x,z){return x+','+z}
function dist2(a,b){const x=a.x-b.x,z=a.z-b.z;return x*x+z*z}

function createNavigator({terrain,maxNodes=420,stepHeight=1.08,bodyHalfW=.30,bodyHalfH=.95,bodyHalfD=.24}={}){
  if(!terrain)throw new Error('NPC_NAV_TERRAIN_REQUIRED');
  const s=terrain.tileSize||1;
  let searches=0,failed=0,expanded=0,lastTerrainVersion=-1;
  const cache=new Map();

  function groundAtCell(gx,gz,hintY=null){
    const wx=(gx+.5)*s,wz=gz*s;
    const hint=Number.isFinite(Number(hintY))?Math.floor(Number(hintY)/s)+4:96;
    const top=terrain.highestGroundY(wx,wz,{fromCell:hint,toCell:-256});
    return {gx,gz,x:wx,z:wz,groundY:top,y:top+bodyHalfH};
  }
  function walkable(node){
    if(!node||!Number.isFinite(node.y))return false;
    return !terrain.collidesAABB(node.x,node.y,node.z,bodyHalfW,bodyHalfH-.025,bodyHalfD);
  }
  function waterCost(node){
    const b=terrain.water?.boundsAtWorld?.(node.x,node.z);
    if(!b)return 0;
    const depth=Math.max(0,(b.top??0)-(node.groundY??0));
    return depth>.8?2.3:depth>.15?.65:0;
  }
  function neighbours(node){
    const out=[];
    for(const [dx,dz] of DIR4){
      const n=groundAtCell(node.gx+dx,node.gz+dz,node.groundY);
      const rise=Math.abs(n.groundY-node.groundY);
      if(rise>stepHeight||!walkable(n))continue;
      n.cost=1+rise*.35+waterCost(n);out.push(n);
    }
    return out;
  }
  function reconstruct(came,current,nodes){
    const path=[nodes.get(current)];
    while(came.has(current)){current=came.get(current);path.push(nodes.get(current))}
    path.reverse();
    const compact=[];
    for(const n of path){
      const last=compact[compact.length-1],prev=compact[compact.length-2];
      if(prev&&last){
        const ax=last.gx-prev.gx,az=last.gz-prev.gz,bx=n.gx-last.gx,bz=n.gz-last.gz;
        if(ax===bx&&az===bz){compact[compact.length-1]=n;continue}
      }
      compact.push(n);
    }
    return compact.map(n=>({x:n.x,y:n.y,z:n.z,gx:n.gx,gz:n.gz,groundY:n.groundY}));
  }
  function findPath(from,to,{range=28,maxExpanded=maxNodes}={}){
    searches++;
    const start=groundAtCell(Math.floor(num(from?.x)/s),Math.floor(num(from?.z)/s+.5),from?.y);
    const goal=groundAtCell(Math.floor(num(to?.x)/s),Math.floor(num(to?.z)/s+.5),to?.y);
    const terrainVersion=terrain.changeVersion||0;
    if(lastTerrainVersion!==terrainVersion){cache.clear();lastTerrainVersion=terrainVersion}
    const ckey=key(start.gx,start.gz)+'>'+key(goal.gx,goal.gz)+'@'+terrainVersion;
    const cached=cache.get(ckey);if(cached)return cached.map(p=>({...p}));
    if(!walkable(start)||!walkable(goal)){failed++;return[]}
    if(Math.hypot(goal.gx-start.gx,goal.gz-start.gz)>range){failed++;return[]}

    const open=[{k:key(start.gx,start.gz),f:0}],openSet=new Set([key(start.gx,start.gz)]);
    const came=new Map(),g=new Map([[key(start.gx,start.gz),0]]),nodes=new Map([[key(start.gx,start.gz),start]]);
    const goalKey=key(goal.gx,goal.gz);
    let localExpanded=0;
    while(open.length&&localExpanded<maxExpanded){
      let best=0;
      for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
      const current=open.splice(best,1)[0];openSet.delete(current.k);
      const node=nodes.get(current.k);localExpanded++;expanded++;
      if(current.k===goalKey){
        const path=reconstruct(came,current.k,nodes);cache.set(ckey,path);
        if(cache.size>96)cache.delete(cache.keys().next().value);
        return path.map(p=>({...p}));
      }
      for(const n of neighbours(node)){
        if(Math.hypot(n.gx-start.gx,n.gz-start.gz)>range)continue;
        const nk=key(n.gx,n.gz),tent=(g.get(current.k)??Infinity)+n.cost;
        if(tent>=(g.get(nk)??Infinity))continue;
        came.set(nk,current.k);g.set(nk,tent);nodes.set(nk,n);
        const h=Math.abs(goal.gx-n.gx)+Math.abs(goal.gz-n.gz),f=tent+h;
        if(!openSet.has(nk)){open.push({k:nk,f});openSet.add(nk)}
        else{const q=open.find(v=>v.k===nk);if(q)q.f=f}
      }
    }
    failed++;return[];
  }

  function lineOfSight(a,b,{radius=.04}={}){
    const dx=num(b?.x)-num(a?.x),dy=num(b?.y)-num(a?.y),dz=num(b?.z)-num(a?.z);
    const len=Math.hypot(dx,dy,dz);if(len<.01)return true;
    const steps=Math.max(2,Math.ceil(len/.35));
    for(let i=1;i<steps;i++){
      const t=i/steps,x=num(a.x)+dx*t,y=num(a.y)+dy*t,z=num(a.z)+dz*t;
      if(terrain.collidesAABB(x,y,z,radius,radius,radius))return false;
    }
    return true;
  }

  function steerToward(actor,target,speed=1.5,others=[]){
    let dx=num(target?.x)-num(actor?.transform?.x),dz=num(target?.z)-num(actor?.transform?.z);
    const d=Math.hypot(dx,dz);
    if(d>.0001){dx/=d;dz/=d}else{dx=dz=0}
    let sx=0,sz=0,near=0;
    for(const o of others){
      if(o===actor)continue;
      const ox=num(actor.transform.x)-num(o.transform?.x),oz=num(actor.transform.z)-num(o.transform?.z);
      const od=Math.hypot(ox,oz);
      if(od<=.001||od>1.35)continue;
      const strength=(1.35-od)/1.35;sx+=ox/od*strength;sz+=oz/od*strength;near++;
    }
    if(near){sx/=near;sz/=near;dx=dx*.82+sx*.72;dz=dz*.82+sz*.72}
    const m=Math.hypot(dx,dz)||1;
    return {x:dx/m*speed,z:dz/m*speed,distance:d,avoiding:near>0};
  }

  function stats(){return {algorithm:'dynamic-voxel-a-star',directions:4,maxNodes,stepHeight,cache:cache.size,searches,failed,expanded,terrainVersion:lastTerrainVersion,separateLocalAvoidance:true}}
  return Object.freeze({findPath,lineOfSight,steerToward,groundAtCell,walkable,stats});
}

global.PaperchalkNPCNavigation=Object.freeze({version:1,createNavigator});
})(window);
