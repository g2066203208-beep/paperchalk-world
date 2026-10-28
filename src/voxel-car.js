// Hand-authored voxel/pixel-art 3D pickup. Individual real cubes, not a paper cutout.
// Source style studies: Blockbench Gallery vehicle winners and Jannis polytruck.
export function createVoxelCar(cube){
 const parts=[];
 const add=(name,x,y,z,w,h,d,color,group)=>parts.push(cube(name,[x,y,z],[w,h,d],color,group));
 const colors={
  main:"#c98c45",top:"#ddab62",shadow:"#97633e",edge:"#6c4e40",
  bright:"#f0c77a",cool:"#65828b",glass:"#375365",glint:"#91b1bd",
  tire:"#283238",tireLit:"#475057",tread:"#1d272d",rim:"#9daca9",
  rimDark:"#697b7d",hub:"#d2d1b8",chassis:"#333b42",iron:"#53616b",
  lamp:"#f0e4b7",orange:"#cf7752",red:"#a74e48",snow:"#cfdad8"
 };
 // Frame first: actual automotive dimensional logic, not two-dimensional paper.
 add("实心车架",-6.65,2.1,-2.4,13.3,.72,4.8,colors.chassis,"01 底盘");
 for(const z of [-2.26,1.98])add("纵梁", -6.4,1.8,z,12.8,.55,.3,colors.iron,"01 底盘");
 add("前端防撞梁",-7.26,1.93,-2.8,.55,.63,5.6,colors.iron,"01 底盘");
 add("后端防撞梁",6.72,1.93,-2.8,.48,.62,5.6,colors.iron,"01 底盘");
 // The small off-road pickup gets a short cabin + substantial cargo bed.
 add("引擎盖下部",-6.55,2.83,-2.56,4.7,.95,5.12,colors.main,"02 引擎舱");
 add("引擎盖上部",-6.29,3.78,-2.35,4.28,.37,4.7,colors.top,"02 引擎舱");
 add("保险杠上角线",-6.62,3.15,-2.71,4.5,.22,.19,colors.shadow,"02 引擎舱");
 add("保险杠下角线",-6.62,3.15,2.52,4.5,.22,.19,colors.shadow,"02 引擎舱");
 for(let i=0;i<4;i++){
  add("引擎盖机械刻线 "+i,-5.7+i*.76,4.15,-1.25,.1,.045,2.5,i===0?colors.bright:colors.shadow,"02 引擎舱");
 }
 // Cabin silhouette is stepped like real Blockbench pixel art; no all-box flat slab.
 add("驾驶舱主壳",-2.08,2.75,-2.48,4.85,2.6,4.96,colors.main,"03 驾驶舱");
 add("驾驶舱上壳",-1.62,5.35,-2.16,3.88,1.18,4.32,colors.main,"03 驾驶舱");
 add("驾驶舱车顶",-1.82,6.5,-2.30,4.34,.35,4.6,colors.top,"03 驾驶舱");
 add("车顶前包边",-1.99,6.25,-2.28,.28,.35,4.56,colors.edge,"03 驾驶舱");
 add("车顶后包边",2.32,6.25,-2.28,.3,.35,4.56,colors.edge,"03 驾驶舱");
 // A chunky angled windscreen with hand-placed pixels.
 add("挡风玻璃",-2.19,4.88,-1.98,.18,1.29,3.96,colors.glass,"04 车窗");
 add("挡风玻璃左框",-2.26,4.73,-2.2,.22,1.54,.24,colors.edge,"04 车窗");
 add("挡风玻璃右框",-2.26,4.73,1.95,.22,1.54,.24,colors.edge,"04 车窗");
 add("挡风玻璃上框",-2.26,6.12,-2.08,.24,.17,4.16,colors.edge,"04 车窗");
 add("玻璃色块 1",-2.268,5.58,-1.63,.033,.18,.73,colors.cool,"04 像素贴图细节");
 add("玻璃色块 2",-2.268,5.35,-.91,.033,.19,.64,colors.glint,"04 像素贴图细节");
 add("玻璃色块 3",-2.268,5.18,-.27,.033,.10,.50,colors.cool,"04 像素贴图细节");
 // Side doors and actual inset window panes on BOTH vehicle sides.
 for(const side of [-1,1]){
  const z=side<0?-2.71:2.57;
  add("侧门下蒙皮 "+side,-1.81,2.91,z,3.58,1.48,.14,colors.main,"03 驾驶舱");
  add("侧门底梁 "+side,-1.82,2.91,z+side*.06,3.62,.22,.17,colors.shadow,"03 驾驶舱");
  add("侧窗 "+side,-1.57,4.64,z,3.47,1.49,.16,colors.glass,"04 车窗");
  add("窗前立框 "+side,-1.67,4.51,z+side*.025,.17,1.75,.19,colors.edge,"04 车窗");
  add("窗后立框 "+side,1.85,4.51,z+side*.025,.16,1.75,.19,colors.edge,"04 车窗");
  add("窗中隔柱 "+side,.32,4.52,z+side*.025,.13,1.74,.2,colors.edge,"04 车窗");
  add("窗下镀条 "+side,-1.7,4.45,z+side*.09,3.68,.15,.14,colors.bright,"04 车窗");
  add("玻璃反光块 "+side,-1.31,5.63,z+side*.1,.86,.15,.075,colors.cool,"04 像素贴图细节");
  add("玻璃反光像素 "+side,-.44,5.5,z+side*.1,.45,.16,.075,colors.glint,"04 像素贴图细节");
  add("侧门折线 "+side,-1.68,3.88,z+side*.08,3.45,.13,.08,colors.shadow,"03 驾驶舱");
  add("银色门拉手 "+side,.95,4.08,z+side*.15,.55,.16,.07,colors.hub,"07 机械细节");
  add("门把凹陷 "+side,1.11,3.94,z+side*.14,.26,.09,.08,colors.edge,"07 机械细节");
  add("后视镜支架 "+side,-1.95,4.56,z+side*.20,.20,.21,.48,colors.iron,"07 机械细节");
  add("后视镜壳 "+side,-1.99,4.72,z+side*.43,.56,.40,.44,colors.edge,"07 机械细节");
  add("后视镜镜片 "+side,-1.91,4.78,z+side*.68,.40,.25,.08,colors.glint,"07 机械细节");
 }
 // Cargo bed, a deep 3D object with a visible hollow and rails.
 add("货斗实底",2.65,2.85,-2.5,4.05,.40,5,colors.shadow,"05 货斗");
 add("货斗内衬",2.72,3.25,-2.32,3.75,.11,4.64,colors.chassis,"05 货斗");
 add("货斗左护栏",2.62,3.35,-2.7,4.24,1.13,.43,colors.main,"05 货斗");
 add("货斗右护栏",2.62,3.35,2.27,4.24,1.13,.43,colors.main,"05 货斗");
 add("货斗尾门",6.48,3.2,-2.45,.45,1.28,4.9,colors.main,"05 货斗");
 add("货斗前挡",2.62,3.3,-2.45,.32,1.18,4.9,colors.main,"05 货斗");
 for(const z of [-2.64,2.28])add("货斗护边",2.57,4.43,z,4.32,.17,.36,colors.top,"05 货斗");
 for(let j=0;j<6;j++)add("货斗底板筋 "+j,3.0+j*.55,3.39,-2.0,.11,.065,4,colors.iron,"05 货斗");
 // Side panel split / custom stylized racing-line as authentic pixel paint treatment.
 for(const side of [-1,1]){
  const z=side<0?-2.78:2.73;
  add("装饰浅色腰线 "+side,-6.1,3.29,z,11.85,.17,.08,colors.bright,"06 彩绘车身");
  add("装饰深色腰线 "+side,-6.1,3.15,z,11.85,.10,.08,colors.shadow,"06 彩绘车身");
  add("车身后翼子板 "+side,4.7,2.68,z,1.6,.52,.18,colors.shadow,"06 彩绘车身");
  add("前轮眉高光 "+side,-5.34,3.64,z,.95,.13,.13,colors.top,"06 彩绘车身");
  add("尾翼轮眉高光 "+side,3.66,3.64,z,1.2,.13,.13,colors.top,"06 彩绘车身");
 }
 // Pixel-art eight-sided wheel silhouette in layers. Each tire is separately selectable 3D geometry.
 for(const ax of [-4.63,4.48]){
  for(const side of [-1,1]){
   const outerZ=side<0?-3.35:2.68;
   const z=side<0?-3.36:2.69;
   const wheelGroup="08 真实轮胎";
   add("胎体中段 "+ax+" "+side,ax-1.18,.56,outerZ,2.36,2.28,.66,colors.tire,wheelGroup);
   add("胎体顶部 "+ax+" "+side,ax-.76,2.83,outerZ,1.52,.38,.66,colors.tire,wheelGroup);
   add("胎体底部 "+ax+" "+side,ax-.76,.25,outerZ,1.52,.32,.66,colors.tire,wheelGroup);
   add("胎冠前阶 "+ax+" "+side,ax-1.47,.99,outerZ,.36,1.54,.66,colors.tire,wheelGroup);
   add("胎冠后阶 "+ax+" "+side,ax+1.11,.99,outerZ,.36,1.54,.66,colors.tire,wheelGroup);
   add("轮胎侧壁标识 "+ax+" "+side,ax-.9,1.0,z+side*.67,1.8,1.67,.08,colors.tireLit,wheelGroup);
   add("轮辋方形亮边 "+ax+" "+side,ax-.70,1.15,z+side*.72,1.4,1.38,.10,colors.rim,wheelGroup);
   add("轮心凹槽 "+ax+" "+side,ax-.45,1.36,z+side*.82,.9,.97,.11,colors.rimDark,wheelGroup);
   add("轮毂圆心像素 "+ax+" "+side,ax-.24,1.60,z+side*.93,.48,.50,.08,colors.hub,wheelGroup);
   for(const xx of [-.82,.74])for(const yy of [.83,2.52]){
    add("胎纹 "+ax+" "+side,ax+xx,yy,z+side*.76,.27,.24,.085,colors.tread,wheelGroup);
   }
  }
 }
 // Mechanical face: vehicle orientation clearly readable even at thumbnail scale.
 add("前脸深色格栅",-7.00,2.80,-1.53,.38,1.30,3.06,colors.iron,"09 车头尾灯");
 for(let i=0;i<6;i++)add("竖向散热格栅 "+i,-7.04,2.87,-1.43+i*.47,.13,1.07,.17,colors.chassis,"09 车头尾灯");
 for(const z of [-2.32,1.65]){
  add("方形前大灯 "+z,-7.03,3.21,z,.40,.68,.70,colors.lamp,"09 车头尾灯");
  add("大灯上眉 "+z,-7.08,3.86,z,.45,.12,.72,colors.edge,"09 车头尾灯");
  add("橙色转向灯 "+z,-7.09,3.02,z,.44,.17,.65,colors.orange,"09 车头尾灯");
 }
 add("前保险杠防撞面",-7.51,2.10,-2.51,.40,.63,5.02,colors.rimDark,"09 车头尾灯");
 add("前保险杠浅色横条",-7.56,2.63,-2.17,.20,.13,4.34,colors.hub,"09 车头尾灯");
 for(const z of [-2.29,1.89]){
  add("后尾灯 "+z,6.91,3.38,z,.20,.86,.40,colors.red,"09 车头尾灯");
  add("后尾灯亮斑 "+z,7.10,3.47,z,.07,.27,.38,colors.orange,"09 车头尾灯");
 }
 add("后牌照衬板",7.03,3.08,-.72,.11,.52,1.44,colors.hub,"09 车头尾灯");
 add("后牌照暗线",7.15,3.18,-.54,.04,.09,1.08,colors.iron,"09 车头尾灯");
 // Clear dimensional proof: wheels, step, cargo opening, and front grill are not billboards.
 return {version:1,id:"voxel-car",name:"BLOCKBENCH · 复古工具皮卡 / 立体像素练习",parts};
}
