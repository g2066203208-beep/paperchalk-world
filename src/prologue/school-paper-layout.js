export const SCHOOL_PAPER_ASSETS=Object.freeze([
'wall_main','wall_side','wall_rear','roof_strip','parapet','floor_band',
'window_blue','window_warm','window_open','window_tall','door_double','door_side',
'column','sign_school','ac_unit','pipe','gate_pillar','gate_panel','fence',
'tree_round','tree_tall','bush','street_lamp','notice_board','bike_shed',
'fg_branch','planter','stair'
]);
const Z=Object.freeze([-12.8,-11.2,-9.8,-8.6,-7.6,-6.5,-5.8,-4.9]);
const cards=[];
const add=(layer,asset,x,y,w,h,r=0)=>cards.push({layer,z:Z[layer],asset,x,y,w,h,r});
for(const x of [1.5,5.5,9.5,13.5,17.5,21.5])add(0,'wall_rear',x,6.0,4.5,8.0);
for(const [x,a] of [[1.6,'wall_side'],[4.6,'wall_rear'],[7.6,'wall_side'],[10.6,'wall_rear'],[13.6,'wall_side'],[16.6,'wall_rear'],[19.6,'wall_side'],[22.0,'wall_rear']])add(1,a,x,4.8,4.2,6.6);
for(const x of [2.4,6.9,11.4,15.9,20.4])add(2,'wall_main',x,4.5,4.8,6.8);
for(const x of [4.0,11.5,19.0])add(2,'roof_strip',x,8.05,7.8,.75);
for(const x of [7.5,16.0])add(2,'parapet',x,7.65,7.5,.65);
for(const y of [3.15,5.35,7.45])add(3,'floor_band',11.5,y,22,.34);
for(const x of [1.2,6.3,11.5,16.7,21.8])add(3,'column',x,4.45,.55,6.8);
add(3,'stair',9.2,.65,3.3,1.1);add(3,'stair',13.8,.65,3.3,1.1);
add(3,'roof_strip',5.5,8.35,9,.45);add(3,'roof_strip',17.5,8.35,9,.45);
const wx=[3,7,11,15,19],wy=[2.6,4.05,5.5,6.95];
let wi=0;for(const y of wy)for(const x of wx){const a=['window_blue','window_warm','window_blue','window_open','window_tall'][wi%5];add(4,a,x,y,1.42,1.08);wi++}
add(4,'door_double',10.3,1.72,1.75,2.45);add(4,'door_side',12.55,1.72,1.45,2.45);
add(4,'sign_school',11.5,8.05,6.2,.92);
for(const [x,y] of [[4.7,4.7],[16.8,4.5],[20.4,5.8]])add(4,'ac_unit',x,y,1.1,.82);
add(4,'pipe',1.75,4.4,.42,4.9);add(4,'pipe',22.15,4.4,.42,4.9);
add(5,'gate_pillar',8.7,1.65,.72,3.05);add(5,'gate_pillar',14.3,1.65,.72,3.05);
add(5,'gate_panel',10.25,1.28,2.25,2.15);add(5,'gate_panel',12.75,1.28,2.25,2.15);
for(const x of [1,3.1,5.2,7.1,16,18.1,20.2,22.2])add(5,'fence',x,1.0,2.05,1.42);
add(5,'notice_board',4.4,1.52,1.6,1.72);add(5,'bike_shed',19.2,1.34,3.3,1.9);
add(5,'planter',7.4,.62,1.65,1.05);add(5,'planter',15.6,.62,1.65,1.05);
for(const [x,a,w,h] of [[2,'tree_round',4.2,7.0],[6.0,'tree_tall',3.6,7.5],[17.3,'tree_round',4.2,7.0],[21.6,'tree_tall',3.6,7.5]])add(6,a,x,3.7,w,h);
for(const x of [4.2,11.8,19.4])add(6,'bush',x,.8,2.5,1.3);
add(6,'street_lamp',.65,2.7,1.1,5.2);add(6,'street_lamp',22.7,2.7,1.1,5.2);add(6,'planter',11.5,.62,1.8,1.05);
add(7,'fg_branch',.6,5.2,5.2,4.2,-.04);add(7,'fg_branch',22.4,5.0,5.2,4.2,.06);
add(7,'fence',4.0,1.0,2.7,1.6);add(7,'fence',19.0,1.0,2.7,1.6);
add(7,'bush',7.1,.72,2.8,1.45);add(7,'bush',16.0,.72,2.8,1.45);
if(cards.length!==96)throw new Error('SCHOOL_PAPER_CARD_COUNT_'+cards.length);
export const SCHOOL_PAPER_LAYOUT=Object.freeze({
version:1,source:'python-generated-school-paper-atlas',atlas:'assets/prologue/generated-school/school-paper-atlas.svg?v=py-school-r1',
atlasCols:7,atlasRows:4,assets:SCHOOL_PAPER_ASSETS,cards:Object.freeze(cards),
layers:Object.freeze(Z.map((z,i)=>({id:'L'+i,z,count:cards.filter(c=>c.layer===i).length})))
});