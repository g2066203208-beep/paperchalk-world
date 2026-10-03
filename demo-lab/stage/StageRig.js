
export const StageLifecycle=Object.freeze({
  inactive:'inactive',
  preloading:'preloading',
  ready:'ready',
  entering:'entering',
  active:'active',
  exiting:'exiting',
  dormant:'dormant',
});
const VALID=new Set(Object.values(StageLifecycle));

export function createStageLifecycle(name,initial=StageLifecycle.inactive){
  if(!VALID.has(initial))throw new RangeError('Invalid initial stage lifecycle: '+initial);
  let state=initial,revision=0;
  return {
    name,
    get state(){return state;},
    get revision(){return revision;},
    set(next){
      if(!VALID.has(next))throw new RangeError('Invalid stage lifecycle: '+next);
      if(next===state)return false;
      state=next;revision++;return true;
    },
    snapshot(){return {name,state,revision};},
  };
}

export function collectLocalHinges(groups=[]){
  const result=[],seen=new Set();
  for(const root of groups){
    root?.traverse?.(object=>{
      if(!object.userData?.stageHinge||seen.has(object))return;
      seen.add(object);
      result.push({
        group:object,
        x:Number.isFinite(object.userData.stageX)?object.userData.stageX:object.position.x,
        baseRotationX:Number.isFinite(object.userData.stageBaseRotationX)?object.userData.stageBaseRotationX:object.rotation.x,
        pivotY:object.userData.stagePivotY,
        pivotZ:object.userData.stagePivotZ,
        unitName:object.userData.stageUnitName??object.name,
      });
    });
  }
  return result;
}

export function hingeAudit(groups=[]){
  const hinges=collectLocalHinges(groups);
  return {
    hinges:hinges.length,
    missingOwnPivot:hinges.filter(item=>!Number.isFinite(item.pivotY)||!Number.isFinite(item.pivotZ)).map(item=>item.unitName),
    units:hinges.map(item=>({name:item.unitName,x:item.x,y:item.pivotY,z:item.pivotZ})),
  };
}
