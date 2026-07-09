/* ============================================================
   SELLOUT — research.js
   Simple linear research: pay up front, wait N weeks,
   permanent unlock. One active project at a time.
   ============================================================ */

"use strict";

const RESEARCH = [
  {id:'materials',    name:'Better Materials',      cost:4000,  weeks:2, desc:'Unlocks Heavyweight 300 and Organic Premium fabrics.'},
  {id:'manufacturing',name:'Improved Manufacturing',cost:9000,  weeks:3, desc:'Unit costs −15%, production capacity +50%.'},
  {id:'website',      name:'Website v2',            cost:6000,  weeks:2, desc:'Reach +30%. Fewer crashes on hot drops.'},
  {id:'crm',          name:'Community CRM',         cost:3000,  weeks:1, desc:'Unlocks Email Blasts — loyalty-building marketing.'},
  {id:'raffle',       name:'Raffle System',         cost:7000,  weeks:2, desc:'Anti-bot drops: reseller pressure cut sharply when limits are on.'},
  {id:'shipping',     name:'Shipping Deal',         cost:5000,  weeks:2, desc:'Faster delivery: +8 customer satisfaction after every drop.'},
  {id:'forecasting',  name:'Trend Analytics Desk',  cost:6000,  weeks:2, desc:'Sharper trend forecasts on the Trends page (±8 instead of ±16).'},
  {id:'trendlab',     name:'Fashion Intelligence Lab', cost:15000, weeks:3, desc:'Near-precise forecasts (±3). See the wave before anyone surfs it.'},
];

function startResearch(id){
  const r = RESEARCH.find(x=>x.id===id);
  if(!r || G.research[id] || G.activeResearch) return;
  if(G.cash < r.cost){ toast('Not enough cash'); return; }
  G.cash -= r.cost;
  G.weekLog.expenses += r.cost;
  G.activeResearch = {id, weeksLeft:r.weeks};
  toast('Research started: '+r.name);
  saveGame(); renderAll();
}

function tickResearch(){
  if(!G.activeResearch) return;
  G.activeResearch.weeksLeft--;
  if(G.activeResearch.weeksLeft<=0){
    const r = RESEARCH.find(x=>x.id===G.activeResearch.id);
    G.research[r.id] = true;
    G.activeResearch = null;
    feedPost('sys', null, `R&D complete: ${r.name}.`);
    toast('✅ '+r.name+' complete', 'gold');
  }
}
