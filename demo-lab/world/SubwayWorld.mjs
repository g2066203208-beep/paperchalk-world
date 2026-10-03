
export function createSubwayWorld({anchorX=0,width=220}={}){
  const bounds={minX:anchorX-width*.5,maxX:anchorX+width*.5,minY:-3,maxY:9};
  const spawn={x:anchorX,y:.5,z:0};
  function setAnchorX(value){
    if(!Number.isFinite(value))return false;
    anchorX=value;bounds.minX=anchorX-width*.5;bounds.maxX=anchorX+width*.5;spawn.x=anchorX;return true;
  }
  function surfaceY(x,z=0){
    if(!Number.isFinite(x)||!Number.isFinite(z)||x<bounds.minX||x>bounds.maxX)return null;
    if(z<-2.0)return .50;
    return .50;
  }
  function floorCandidates(x,halfWidth=0,z=0){
    if(!Number.isFinite(halfWidth)||halfWidth<0)return [];
    const y=surfaceY(x,z);if(y===null)return [];
    return [{y,supportX:x,bottomY:-2,normal:{x:0,y:1,z:0},platformId:'moonlight-central-platform',oneWay:false}];
  }
  return {
    id:'subway-moonlight-central',kind:'subway',bounds,spawn,setAnchorX,surfaceY,floorCandidates,
    platformAt:id=>id==='moonlight-central-platform'?{id,name:'月灯中央站站台',kind:'ground'}:null,
    groundBelow:(x,y,z=0)=>floorCandidates(x,0,z).find(q=>q.y<=y+1e-7)??null,
  };
}
