/* ============================================================
   STREETWEAR EMPIRE — market.js
   Customer segments, demand simulation, the resale market,
   and AI competitor brands.
   ============================================================ */

"use strict";

/* ---------------- customer segments ----------------
   Each segment is a share of your reachable audience and
   scores a collection differently. All scores ~0.2–1.6.   */
const SEGMENTS = [
  {id:'collector',  name:'Collectors',          share:0.08},
  {id:'street',     name:'Streetwear Fans',     share:0.30},
  {id:'casual',     name:'Casual Buyers',       share:0.30},
  {id:'enthusiast', name:'Fashion Enthusiasts', share:0.14},
  {id:'luxury',     name:'Luxury Buyers',       share:0.05},
  // resellers are handled separately — they buy to flip, not to wear
];

// How wide your reach is this week: followers amplified by hype & website tech.
function weeklyReach(){
  const webBoost = G.research.website ? 1.3 : 1.0;
  const mktEmp   = empBonus('marketing')*0.5; // marketing manager widens everything a bit
  return G.followers * (0.30 + (G.hype/100)*0.85) * webBoost * (1+mktEmp);
}

// Score one segment's interest in a finalized collection (0 = ignore, 1 = strong).
function segmentInterest(seg, col, price){
  const prod = PRODUCTS.find(p=>p.id===col.product);
  let s = prod.appeal[seg.id] || 0.8;

  // Style choices nudge each crowd
  [col.paletteObj, col.logoObj, col.graphicsObj, col.fitObj, col.packagingObj].forEach(o=>{
    if(o && o.mod && o.mod[seg.id]) s += o.mod[seg.id];
  });

  // Quality matters to everyone, but most to collectors/luxury/enthusiasts
  const qWeight = {collector:.09, luxury:.10, enthusiast:.07, street:.045, casual:.03}[seg.id];
  s += (col.quality-5) * qWeight;

  // Price sensitivity: casuals hate markups, luxury reads cheap as cheap
  const ratio = price / prod.retail;
  if(seg.id==='casual')     s -= Math.max(0,(ratio-1))*0.9;
  else if(seg.id==='luxury')s += clamp((ratio-1)*0.35, -0.3, 0.35);
  else                      s -= Math.max(0,(ratio-1.15))*0.55;

  // Trend alignment excites the hype-driven crowds
  if(col.theme===G.trend.theme)      s += (seg.id==='street'?0.2 : seg.id==='enthusiast'?0.12 : 0.05);
  if(col.product===G.trend.product)  s += (seg.id==='street'||seg.id==='casual') ? 0.12 : 0.05;

  // Loyalty & reputation lift everything gently
  s += (G.loyalty-50)/220 + (G.reputation-50)/260;

  return clamp(s, 0.05, 1.7);
}

/* ---------------- demand simulation ----------------
   Returns everything the launch sequence needs.          */
function simulateDrop(col, qty, price, opts){
  const reach = weeklyReach();
  let genuineDemand = 0;
  const perSegment = {};

  SEGMENTS.forEach(seg=>{
    const interest = segmentInterest(seg, col, price);
    const buyers = reach * seg.share * interest * rand(0.75, 1.3);
    perSegment[seg.id] = Math.round(buyers);
    genuineDemand += buyers;
  });

  // Event modifiers (viral moment, competitor clash, etc.)
  genuineDemand *= (G.eventMods.demandMult || 1);
  // Purchase limits add friction for everyone, not just bots
  if(opts.limit==='strict') genuineDemand *= 0.93;
  else if(opts.limit==='soft') genuineDemand *= 0.97;

  // Resellers smell margin: they join when expected resale clears retail comfortably
  const scarcity   = genuineDemand / Math.max(1, qty);
  let resaleEst    = price * Math.pow(Math.max(0.3, scarcity), 0.75) * (0.75 + G.prestige/160);
  let resellerBuys = 0;
  if(resaleEst > price*1.25){
    let resellerPool = reach * 0.10 * clamp((resaleEst/price - 1), 0.2, 2.2);
    if(opts.limit==='strict') resellerPool *= 0.35;      // 1-per-customer
    else if(opts.limit==='soft') resellerPool *= 0.65;   // 2-per-customer
    if(G.research.raffle && opts.limit!=='none') resellerPool *= 0.7;
    resellerBuys = Math.round(resellerPool * rand(0.7,1.3));
  }

  const totalDemand = Math.round(genuineDemand) + resellerBuys;
  const sold        = Math.min(qty, totalDemand);
  const soldOut     = totalDemand >= qty;

  // If a drop visibly doesn't sell out, fence-sitters wait for markdowns
  const finalSold = soldOut ? qty : Math.round(sold * 0.72);

  // Sellout time — the headline number of any drop
  let selloutMin = null;
  if(soldOut){
    const heat = totalDemand / qty;
    selloutMin = Math.max(0.2, Math.round(180 / heat));
  }

  // Final resale value settles post-drop
  const resaleFinal = soldOut
    ? Math.round(price * clamp(Math.pow(totalDemand/qty, 0.7), 1, 6) * (0.85 + G.prestige/200))
    : Math.round(price * rand(0.45, 0.85));

  const resellerShare = finalSold>0 ? Math.min(resellerBuys, finalSold)/finalSold : 0;

  return {
    reach: Math.round(reach), perSegment,
    genuineDemand: Math.round(genuineDemand), resellerBuys,
    totalDemand, sold: finalSold, soldOut, selloutMin,
    resaleFinal, resellerShare, scarcity,
  };
}

/* ---------------- resale market over time ----------------
   Every past drop keeps a live resale value that drifts with
   your prestige. History tab shows the whole market.        */
function tickResaleMarket(){
  G.drops.forEach(d=>{
    if(d.resaleNow===undefined) d.resaleNow = d.resale;
    d.resalePrev = d.resaleNow;
    const pull = (G.prestige-30)/30 * 0.02 * d.resaleNow;
    d.resaleNow = Math.max(Math.round(d.price*0.3), Math.round(d.resaleNow + pull + d.resaleNow*rand(-0.05,0.06)));
    if(d.resaleNow > G.stats.bestResale) G.stats.bestResale = d.resaleNow;
  });
  // occasional grail moment on an old sold-out drop
  const grails = G.drops.filter(d=>d.soldOut);
  if(grails.length && Math.random()<0.06){
    const d = pick(grails);
    d.resaleNow = Math.round(d.resaleNow * rand(1.3, 1.9));
    feedPost('hot', pick(HANDLES), `a deadstock ${d.name} just sold for ${fmt$(d.resaleNow)}. archive heat is real 📈`);
  }
}

/* ---------------- AI competitors ---------------- */
function makeCompetitors(){
  const names = ['NORTHLINE','VANTA WORKS','PAPER CROWN','GREYSCALE','HALFCUT','MONUMENT'];
  return names.map((n,i)=>({
    name:n,
    followers: ri(400, 12000) * (i<2?3:1),
    prestige:  ri(5, 55),
    quality:   ri(4, 9),
  }));
}

function tickCompetitors(){
  G.competitors.forEach(c=>{
    c.prevFollowers = c.followers;
    // gentle mean-reverting growth
    c.followers = Math.max(200, Math.round(c.followers * rand(0.97, 1.06) + c.prestige*3));
    c.prestige  = clamp(c.prestige + rand(-1.2, 1.4), 1, 99);
    // they release collections too — and soak up the scene's attention
    if(Math.random()<0.16){
      const sizes = ['a limited capsule','a full seasonal line','a surprise collab'];
      feedPost('sys', null, `${c.name} just released ${pick(sizes)}. The timeline is busy.`);
      if(Math.random()<0.5){ G.hype = clamp(G.hype-2, 0, 100); }
      c.followers += ri(100, 800);
    }
  });
}
