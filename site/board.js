/** Pure camera projection for five standing-card lanes. Real world depth is
 * kept in rules.js: this module never mutates enemy positions.
 * Depth 6 at the horizon, depth 1 at the defense line.
 */
export const FIVE_LANES=5;
export function projectCard(enemy, width, height, advance=0){
  if(!Number.isInteger(enemy.lane)||enemy.lane<0||enemy.lane>4)throw new Error('bad lane');
  if(!Number.isInteger(enemy.depth)||enemy.depth<1||enemy.depth>6)throw new Error('bad depth');
  const effective=Math.max(1,Math.min(6,enemy.depth+(enemy.side==='rear'?advance:-advance)));
  const t=(6-effective)/5; // 0 far, 1 near
  const xPercent=50+(enemy.lane-2)*(10.6+9.4*t);
  const yPercent=enemy.side==='rear'?47+t*39:35+t*51;
  // Keep five lanes legible even on 320px-wide screens. Smaller cards belong to distance, not card count.
  const base=Math.min(104,Math.max(35,Math.min(width*0.15,height*0.44)));
  const cardWidth=Math.round(base*(0.57+0.46*t));
  const cardHeight=Math.round(cardWidth*1.38);
  const zIndex=20+Math.round(70*t)+(enemy.side==='rear'?3:0);
  return {xPercent,yPercent,cardWidth,cardHeight,zIndex,scale:cardWidth/base,
    effective,side:enemy.side,lane:enemy.lane,groundY:Math.round(height*yPercent/100)};
}
export function lanePoint(lane,t){
  if(!Number.isInteger(lane)||lane<0||lane>4)throw new Error('bad lane');
  return {x:50+(lane-2)*(10.6+9.4*t),y:35+51*t};
}
