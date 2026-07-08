/* ============================================================
   SELLOUT — employees.js
   Five roles, candidates, wages, happiness.
   empBonus(role) → 0..1 scaled effect used across systems.
   ============================================================ */

"use strict";

const ROLES = [
  {id:'designer',    name:'Designer',          emoji:'✏️', wageBase:260, desc:'Raises design quality on every collection.'},
  {id:'marketing',   name:'Marketing Manager', emoji:'📣', wageBase:240, desc:'Every hype channel hits harder; wider reach.'},
  {id:'photographer',name:'Photographer',      emoji:'📷', wageBase:210, desc:'Lookbooks become editorial weapons.'},
  {id:'warehouse',   name:'Warehouse Staff',   emoji:'📦', wageBase:190, desc:'Cleaner fulfilment — customer satisfaction up.'},
  {id:'community',   name:'Community Manager', emoji:'💬', wageBase:220, desc:'Loyalty recovers faster; softens bad weeks.'},
];

const EMP_NAMES = ['Yuki','Mara','Dev','Otis','Lena','Kai','Rosco','Bibi','Juno','Prez','Nia','Sage','Wren','Tito','Cleo'];

/* Effect strength 0..~1.2: skill × happiness. */
function empBonus(roleId){
  const e = G && G.employees[roleId];
  if(!e) return 0;
  return (e.skill/5) * (0.55 + (e.happiness||70)/160);
}

function totalWages(){
  return ROLES.reduce((sum,r)=> sum + (G.employees[r.id]? G.employees[r.id].wage : 0), 0);
}

/* Candidates improve as your prestige grows. */
function genCandidates(role){
  return [0,1,2].map(()=>{
    const skill = clamp(ri(1,2) + ri(0, Math.floor(G.prestige/25)+1), 1, 5);
    return { name:pick(EMP_NAMES), skill, wage: Math.round(role.wageBase*(0.55+skill*0.4)), happiness:75 };
  });
}

function hire(roleId, cand){
  G.employees[roleId] = cand;
  feedPost('sys', null, `${cand.name} joins ${G.brand} as ${ROLES.find(r=>r.id===roleId).name}.`);
  toast(cand.name+' hired');
  saveGame(); renderAll();
}

function fire(roleId){
  const e = G.employees[roleId];
  if(!e) return;
  G.employees[roleId] = null;
  G.loyalty = clamp(G.loyalty-1, 0, 100);
  toast(e.name+' let go');
  saveGame(); renderAll();
}

/* Weekly: happiness drifts with results; unhappy staff underperform,
   miserable staff quit.                                              */
function tickEmployees(){
  const goodWeek = G.lastProfit > 0;
  ROLES.forEach(r=>{
    const e = G.employees[r.id];
    if(!e) return;
    if(e.happiness===undefined) e.happiness = 75;
    e.happiness = clamp(e.happiness + (goodWeek? 2 : -4) + rand(-2,2), 0, 100);
    if(e.happiness < 20 && Math.random()<0.3){
      feedPost('sys', null, `${e.name} quit. Burnout at a struggling brand is real.`);
      G.employees[r.id] = null;
    }
  });
}
