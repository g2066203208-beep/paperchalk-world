const PROFILE=Object.freeze([Object.freeze({x:-90,y:.5}),Object.freeze({x:110,y:.5})]);
const GROUND=Object.freeze({id:'city-sidewalk',name:'连续街道人行道',kind:'ground',profile:PROFILE,
  frontZ:1.65,backZ:-2.8,bottomY:-1,oneWay:false});

/** Walking and traffic occupy separate depth lanes on the same city street. */
export function createCityPrologueWorld(){
  const bounds=Object.freeze({minX:-8,maxX:24,minY:-5,maxY:12});
  const spawn=Object.freeze({x:0,y:.5,z:0});
  function surfaceY(x,z=0){
    if(!Number.isFinite(x)||!Number.isFinite(z)||x< -90||x>110||z< -45||z>9)return null;
    return z>1.65?.05:z< -2.8?.38:.5;
  }
  function floorCandidates(x,halfWidth=0,z=0){
    if(!Number.isFinite(halfWidth)||halfWidth<0)return [];
    const y=surfaceY(x,z);if(y===null)return [];
    return [{y,supportX:x,bottomY:-1,normal:{x:0,y:1},platformId:'city-sidewalk',oneWay:false}];
  }
  return Object.freeze({id:'city-prologue',kind:'city-prologue',bounds,spawn,
    platforms:Object.freeze([GROUND]),floorCandidates,surfaceY,
    platformAt:id=>id===GROUND.id?GROUND:null,
    groundBelow:(x,y,z=0)=>floorCandidates(x,0,z).find(q=>q.y<=y+1e-7)??null});
}
