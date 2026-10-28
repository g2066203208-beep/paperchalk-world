/** Adult voluntary recruitment. Children are protected beneficiaries, never labor inventory. */
export const CANDIDATES=[
 {id:'mio',name:'米娅',age:24,origin:'job',role:'交涉与联络',skill:'network',trait:'失业商校毕业生；重视承诺',face:'M',tone:'#b5a2bb',fee:18,wage:12,trust:45},
 {id:'leo',name:'雷欧',age:27,origin:'dock',role:'调查与巡查',skill:'scout',trait:'码头临时工，熟悉街巷',face:'L',tone:'#c0a5a0',fee:25,wage:14,trust:32},
 {id:'yu',name:'余青',age:22,origin:'job',role:'账目与采购',skill:'network',trait:'工厂倒闭后的会计',face:'Y',tone:'#7d9e9b',fee:20,wage:11,trust:48},
 {id:'lin',name:'林砚',age:29,origin:'union',role:'劳动协商',skill:'network',trait:'旧厂工会组织者',face:'L',tone:'#ac9b77',fee:34,wage:17,trust:57},
 {id:'nian',name:'年树',age:21,origin:'shelter',role:'运输与维修',skill:'deliver',trait:'成年流离失所者，自愿工作',face:'N',tone:'#c69878',fee:14,wage:11,trust:34},
 {id:'shao',name:'邵岚',age:33,origin:'job',role:'合法业务经理',skill:'deliver',trait:'失业旅馆主管，经验丰富',face:'S',tone:'#9b879d',fee:55,wage:22,trust:49},
 {id:'an',name:'安雯',age:26,origin:'clinic',role:'卫生与照护',skill:'scout',trait:'诊所兼职护士，希望改变街区',face:'A',tone:'#96b0bb',fee:28,wage:16,trust:66},
 {id:'qiao',name:'乔野',age:30,origin:'dock',role:'调停与安保',skill:'scout',trait:'退役船员，反感欺压',face:'Q',tone:'#b6a68a',fee:38,wage:19,trust:52}
];
export const RECRUIT_SOURCES=[
 {id:'job',title:'失业者职业介绍所',detail:'提供正规求职介绍与适岗培训'},
 {id:'dock',title:'码头零工会',detail:'寻找愿意签署劳动合同的成年工友'},
 {id:'union',title:'工会互助站',detail:'与组织者建立信任，加入需得到本人同意'},
 {id:'shelter',title:'成年人安置中心',detail:'参与者有充分退出权与合理薪酬'},
 {id:'clinic',title:'社区诊所',detail:'招聘成年专业人士共同服务居民'}
];
export const recruitmentSystem={
 id:'recruitment',deps:['clock'],
 init:()=>({candidates:CANDIDATES.map(c=>({...c,status:'available',contactDay:0})),employees:[],interviews:[],reputation:0}),
 reduce(data,action,{day,context,slices}){
  const candidate=data.candidates.find(c=>c.id===action.person);
  if(action.type==='interview'){
    if(!candidate||candidate.status!=='available')return {error:'候选人不可面试'};
    if(candidate.contactDay===day)return {error:'今天已与该候选人会面'};
    candidate.contactDay=day;
    data.interviews.unshift({day,person:candidate.id,source:candidate.origin});
    return {data,events:[{type:'recruit.interview',title:'招聘面谈',text:candidate.name+'：'+candidate.trait+'。双方可以继续协商工作条件。',person:candidate.id}]};
  }
  if(action.type==='recruit'){
    if(!candidate||candidate.status!=='available')return {error:'候选人已入职或不可签约'};
    if(candidate.age<18)return {error:'严禁雇佣未成年人'};
    if((context.crew||[]).includes(candidate.id))return {error:'该人员已经在组织中'};
    if((context.crew||[]).length>=12)return {error:'初期办公室最多容纳 12 名正式成员'};
    if(context.cash<candidate.fee)return {error:'无力承担签约与入职保障费用'};
    // Voluntary acceptance: trust and charity support influence, not coercion.
    const support=slices.society?.communitySupport||0;
    if(candidate.trust+support<38)return {error:'尚未取得对方信任，先通过互助行动提升社区声誉'};
    candidate.status='employed';candidate.joined=day;
    data.employees.push({person:candidate.id,wage:candidate.wage,joined:day,source:candidate.origin});
    return {data,events:[{type:'recruit.joined',title:'新成员入职',text:candidate.name+'自愿签署工作合同，成为组织的一员。',person:candidate.id}],
     effects:[{kind:'cash',amount:-candidate.fee,label:'入职保障：'+candidate.name},{kind:'recruit',person:candidate.id}]};
  }
  if(action.type==='dismiss'){
    const employee=data.employees.find(p=>p.person===action.person);
    if(!employee)return {error:'该成员不是聘用成员'};
    const c=data.candidates.find(p=>p.id===employee.person);
    c.status='available';c.joined=0;
    data.employees=data.employees.filter(p=>p.person!==employee.person);
    return {data,events:[{type:'recruit.left',title:'劳动合同终止',text:c.name+'在完成离职流程后离开。',person:c.id}],
      effects:[{kind:'dismiss',person:c.id}]};
  }
  return {error:'未知招募行动'};
 },
 tick(data,{day,context}){
   const events=[],effects=[];
   for(const worker of data.employees){
     const c=data.candidates.find(x=>x.id===worker.person);
     const salary=worker.wage;
     effects.push({kind:'cash',amount:-salary,label:'合同员工工资：'+c.name});
   }
   if(day%7===0&&data.employees.length){
     events.push({type:'recruit.payday',title:'就业与工资',text:'本周依照合同支付 '+data.employees.length+' 名新员工的日薪；无偿工作不被允许。'});
   }
   return {data,events,effects};
 }
};