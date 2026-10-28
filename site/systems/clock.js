/** Four meaningful office shifts per day; no real-world timers or async state. */
export const SHIFTS=['晨间 08:00','午后 13:00','黄昏 18:00','深夜 23:00'];
export const CLOCK_START='1998-09-07';
export function clockLabel(day,shift=0){
 const date=new Date(Date.UTC(1998,8,7)+(day-1)*86400000);
 return date.toISOString().slice(0,10)+' · '+['周日','周一','周二','周三','周四','周五','周六'][date.getUTCDay()]+' · '+SHIFTS[shift];
}
export const clockSystem={
 id:'clock',deps:[],
 init:({day})=>({shift:0,history:[],weather:'晴间多云',week:Math.floor((day-1)/7)+1}),
 reduce(data,a,{day}){
  if(a.type!=='advance-shift')return {error:'未知时间指令'};
  if(data.shift>=3)return {error:'夜已深，下一步请翻日历进入新一天'};
  data.shift++;
  data.history.unshift({day,shift:data.shift,label:SHIFTS[data.shift]});
  data.history=data.history.slice(0,28);
  return {data,events:[{type:'clock.shift',title:'时间流逝',text:'已进入 '+SHIFTS[data.shift]+'。',shift:data.shift}]};
 },
 tick(data,{day,signal}){
  data.shift=0;data.week=Math.floor((day-1)/7)+1;
  data.weather=signal('weather')<.15?'小雨':signal('weather')>.86?'多云':'晴间多云';
  data.history.unshift({day,shift:0,label:SHIFTS[0]});data.history=data.history.slice(0,28);
  return {data,events:[{type:'clock.day',title:'夜港醒来',text:clockLabel(day)+'；天气：'+data.weather+'。'}]};
 }
};
