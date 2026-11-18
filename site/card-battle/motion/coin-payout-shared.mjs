/**
 * Identical geometry/launcher coordinates for BOTH physically precise Cannon
 * research and fast-production 3D arcade coin collision. The fast production
 * path deliberately does not download or parse 346 KB of Cannon code.
 */
export const COIN=Object.freeze({
 sides:10,imageDiameter:3,scale:.135,
 visualThickness:.31,radius:3*.135/(2*Math.cos(Math.PI/10)),
 height:.31*.135,gravity:38
});
export const CAPS=Object.freeze({max:500,presets:[120,240,420]});
export const BASIN=Object.freeze({
 left:-5.78,right:.72,front:1.92,back:-1.92,
 floor:0,wallTop:2.55,chute:[.39,1.22,0]
});
