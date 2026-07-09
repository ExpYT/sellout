/* ============================================================
   SELLOUT — market.js
   Customer segments, demand simulation, the resale market,
   and AI competitor brands.
   ============================================================ */

"use strict";

/* ================= LIVING TREND ENGINE =================
   Twelve trends rise and fall on popularity (0–100) and
   velocity. Each knows how to score a collection against
   itself, so demand, reviews and news all share one truth. */
const TRENDS_DEF = [
  {id:'oversized', name:'Oversized Silhouettes', match:c=> c.fit==='oversized'?1 : c.fit==='boxy'?0.6:0,
   season:{summer:-0.3, winter:0.4}},
  {id:'minimal',   name:'Minimal Branding',      match:c=> (c.graphics==='minimal'?0.6:0)+(c.logo==='tonal'?0.4:c.logo==='chest'?0.2:0)},
  {id:'heavylogo', name:'Heavy Logos',           match:c=> c.logo==='front'?1 : c.logo==='back'?0.5:0},
  {id:'boldgfx',   name:'Bold Graphics',         match:c=> c.graphics==='heavy'?1 : c.graphics==='photo'?0.5:0,
   season:{summer:0.3}},
  {id:'neutral',   name:'Neutral Colours',       match:c=> c.palette==='mono'?1 : c.palette==='earth'?0.7:0,
   season:{autumn:0.4, winter:0.3, summer:-0.3}},
  {id:'brights',   name:'Bright Palettes',       match:c=> c.palette==='neon'?1 : c.palette==='pastel'?0.6:0,
   season:{spring:0.4, summer:0.5, winter:-0.4}},
  {id:'luxmat',    name:'Luxury Materials',      match:c=> c.material==='organic'?1 : c.material==='heavy'?0.6:0,
   season:{holiday:0.5}},
  {id:'vintage',   name:'Vintage Revival',       match:c=> ((G&&G.dna==='vintage')?0.6:0)+(c.palette==='earth'?0.4:0)},
  {id:'y2k',       name:'Y2K Nostalgia',         match:c=> ((G&&G.dna==='y2k')?0.6:0)+((c.palette==='neon'||c.palette==='pastel')?0.4:0)},
  {id:'techwear',  name:'Techwear',              match:c=> ((G&&G.dna==='tech')?0.7:0)+(c.fit==='slim'?0.3:0),
   season:{autumn:0.3}},
  {id:'skate',     name:'Skate Culture',         match:c=> ((G&&G.dna==='skate')?0.7:0)+(c.graphics==='heavy'?0.3:0),
   season:{spring:0.3, summer:0.3}},
  {id:'gorp',      name:'Gorpcore / Outdoor',    match:c=> ((G&&G.dna==='outdoor')?0.7:0)+(c.packaging==='eco'?0.3:0),
   season:{autumn:0.5, winter:0.3}},
];
const RISE_REASONS = ['a runway moment everyone screenshotted','one viral fit-check','a documentary rewiring taste','stylists pushing it on every shoot','resale money chasing it','a music video wardrobe'];
const FALL_REASONS = ['total market saturation','fast-fashion knockoffs everywhere','the fashion crowd moving on','one very public fashion faux pas','resale prices collapsing','simple boredom'];

function initTrends(){
  G.trends = TRENDS_DEF.map(t=>({id:t.id, pop:ri(25,70), vel:rand(-1.5,1.5), prev:50, hist:[], reason:'', reasonWk:0}));
}
function trendDef(id){ return TRENDS_DEF.find(t=>t.id===id); }
function trendState(t){
  if(t.vel>1.5) return ['Rising','var(--green)'];
  if(t.vel<-1.5) return ['Declining','var(--red)'];
  if(t.pop>=70) return ['Peaking','var(--gold)'];
  if(t.pop<30) return ['Fading','var(--dim)'];
  return ['Steady','var(--dim)'];
}
// Forecast is honest but noisy; research sharpens the lens.
function trendForecast(t){
  const noise = G.research.trendlab? 3 : G.research.forecasting? 8 : 16;
  return clamp(Math.round(t.pop + t.vel*4 + rand(-noise, noise)), 0, 100);
}

/* Weekly evolution: seasons pull, momentum decays, nothing peaks forever. */
function tickTrends(){
  if(!G.trends || !G.trends.length) initTrends();
  const s = season();
  G.trends.forEach(t=>{
    const def = trendDef(t.id);
    t.prev = t.pop;
    const seasonPull = (def.season && def.season[s.id]) || 0;
    t.vel = clamp(t.vel*0.8 + rand(-1.6,1.6) + seasonPull - (t.pop-50)*0.035, -6, 6);
    // breakout & collapse moments come with a story attached
    if(Math.random()<0.05){
      const up = Math.random()<0.5;
      t.vel += up? rand(2.5,5) : -rand(2.5,5);
      t.reason = (up? 'rising on ' : 'falling after ') + pick(up? RISE_REASONS : FALL_REASONS);
      t.reasonWk = G.week;
    }
    t.pop = clamp(t.pop + t.vel, 3, 97);
    t.hist = t.hist||[]; t.hist.push(Math.round(t.pop));
    if(t.hist.length>16) t.hist.shift();
  });
  // industry news reflects the sim: report the week's biggest movers
  const sorted = G.trends.slice().sort((a,b)=>(b.pop-b.prev)-(a.pop-a.prev));
  const up = sorted[0], down = sorted[sorted.length-1];
  if(Math.random()<0.6){
    if(up.pop-up.prev>2) feedPost('press','TREND DESK', `${trendDef(up.id).name} climbing fast${up.reason && up.reasonWk>=G.week-2? ' — '+up.reason : ''}. Now at ${Math.round(up.pop)}/100 heat.`);
    else if(down.prev-down.pop>2) feedPost('press','TREND DESK', `${trendDef(down.id).name} losing momentum${down.reason && down.reasonWk>=G.week-2? ' — '+down.reason : ''}. Down to ${Math.round(down.pop)}/100.`);
  }
}

/* How much do current trends, the season and fatigue like THIS drop?
   Returns a demand multiplier plus explainable factors.              */
function trendBonusFor(col){
  const factors = [];
  let mult = 1;
  (G.trends||[]).forEach(t=>{
    const m = trendDef(t.id).match(col);
    if(m<0.3) return;
    const eff = (t.pop-50)/50 * 0.35 * m;
    if(Math.abs(eff)>=0.03){ mult += eff; factors.push([trendDef(t.id).name, eff, t.pop]); }
  });
  const s = season();
  const pm = (s.prod[col.product]||1);
  if(pm!==1){ mult *= pm; factors.push([s.name+' demand for '+PRODUCTS.find(p=>p.id===col.product).name.toLowerCase()+'s', pm-1, null]); }
  if(s.spend!==1){ mult *= s.spend; factors.push([s.name+' spending mood', s.spend-1, null]); }
  const f = productFatigue(col);
  if(f>0.03){ mult *= (1-f); factors.push(['Product fatigue — too similar to recent drops', -f, null]); }
  return {mult: clamp(mult, 0.35, 2.1), factors, fatigue:f};
}

/* Fatigue: how much does this design repeat the last few drops? */
function productFatigue(col){
  const recent = G.drops.slice(-4).filter(d=>d.attrs);
  if(recent.length<2) return 0;
  const avgSim = recent.reduce((a,d)=>{
    let m = 0;
    if(d.attrs.product===col.product) m++;
    if(d.attrs.palette===col.palette) m++;
    if(d.attrs.fit===col.fit) m++;
    if(d.attrs.graphics===col.graphics) m++;
    if(d.attrs.logo===col.logo) m++;
    if(d.theme===col.theme) m++;
    return a + m/6;
  }, 0) / recent.length;
  return clamp((avgSim-0.5)*1.1, 0, 0.45);
}

/* Customer tastes drift a little every week; extremes make the news. */
function tickSegPrefs(){
  G.segPrefs = G.segPrefs||{};
  SEGMENTS.forEach(sg=>{
    const p = G.segPrefs[sg.id] = G.segPrefs[sg.id]||{q:1, price:1, pack:1};
    p.q     = clamp(p.q     + rand(-0.012,0.012), 0.75, 1.3);
    p.price = clamp(p.price + rand(-0.012,0.012), 0.75, 1.3);
    p.pack  = clamp(p.pack  + rand(-0.012,0.012), 0.75, 1.3);
  });
  if(Math.random()<0.10){
    const lines = [];
    SEGMENTS.forEach(sg=>{
      const p = G.segPrefs[sg.id];
      if(p.q>1.18)     lines.push(`${sg.name} are scrutinising quality more than ever.`);
      if(p.q<0.85)     lines.push(`${sg.name} are shopping with their eyes, not their hands, lately.`);
      if(p.price>1.18) lines.push(`${sg.name} have become noticeably price-sensitive.`);
      if(p.price<0.85) lines.push(`${sg.name} are spending freely right now.`);
      if(p.pack>1.18)  lines.push(`${sg.name} keep posting unboxings — packaging matters to them right now.`);
    });
    if(lines.length) feedPost('press','MARKET PULSE', pick(lines));
  }
}

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

  // Quality matters to everyone, but most to collectors/luxury/enthusiasts —
  // and each segment's current taste (segPrefs) scales how much they care
  const pref = (G.segPrefs && G.segPrefs[seg.id]) || {q:1, price:1, pack:1};
  const qWeight = {collector:.09, luxury:.10, enthusiast:.07, street:.045, casual:.03}[seg.id];
  s += (col.quality-5) * qWeight * pref.q;

  // Price sensitivity: casuals hate markups, luxury reads cheap as cheap
  const ratio = price / prod.retail;
  if(seg.id==='casual')     s -= Math.max(0,(ratio-1))*0.9*pref.price;
  else if(seg.id==='luxury')s += clamp((ratio-1)*0.35, -0.3, 0.35);
  else                      s -= Math.max(0,(ratio-1.15))*0.55*pref.price;

  // premium packaging matters more when a crowd is in an unboxing mood
  if((seg.id==='luxury'||seg.id==='collector') && col.packaging!=='poly') s += (pref.pack-1)*0.3;

  // Trend alignment excites the hype-driven crowds
  if(col.theme===G.trend.theme)      s += (seg.id==='street'?0.2 : seg.id==='enthusiast'?0.12 : 0.05);
  if(col.product===G.trend.product)  s += (seg.id==='street'||seg.id==='casual') ? 0.12 : 0.05;

  // Loyalty & reputation lift everything — a trusted brand converts better
  s += (G.loyalty-50)/150 + (G.reputation-50)/220;

  // Brand DNA: the crowd you were built for finds you faster
  // (blended during a reinvention — old fans fade, new ones arrive)
  s += dnaSegBonus(seg.id);

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

  // The loyal core buys almost regardless — loyalty is a demand floor
  const loyalCore = G.followers * 0.012 * (G.loyalty/100);
  genuineDemand += loyalCore;
  perSegment._loyal = Math.round(loyalCore);

  // Living fashion: trends, season and fatigue reshape demand (explainably)
  const tb = trendBonusFor(col);
  genuineDemand *= tb.mult;

  // v1.4: more pieces = more reasons to buy; capsules run hotter on resale
  genuineDemand *= 1 + Math.min(0.8, ((col.pieces||1)-1)*0.10);

  // Difficulty & event modifiers (viral moment, competitor clash, etc.)
  genuineDemand *= diff().demand;
  genuineDemand *= (G.eventMods.demandMult || 1);
  // Purchase limits add friction for everyone, not just bots
  if(opts.limit==='strict') genuineDemand *= 0.93;
  else if(opts.limit==='soft') genuineDemand *= 0.97;

  // Resellers smell margin: they join when expected resale clears retail comfortably
  const scarcity   = genuineDemand / Math.max(1, qty);
  let resaleEst    = price * Math.pow(Math.max(0.3, scarcity), 0.75) * (0.75 + G.prestige/160) * (col.capsule? 1.25:1);
  let resellerBuys = 0;
  if(resaleEst > price*1.25){
    let resellerPool = reach * 0.085 * clamp((resaleEst/price - 1), 0.2, 2.2);
    resellerBuys = Math.round(resellerPool * rand(0.7,1.3));
    // Purchase limits are a HARD cap on how much stock bots can take:
    // no limit → up to 45% · 2-per → 30% · 1-per → 15%; raffle tightens further
    const capFrac = opts.limit==='strict'? 0.15 : opts.limit==='soft'? 0.30 : 0.45;
    const raffleMult = (G.research.raffle && opts.limit!=='none')? 0.65 : 1;
    resellerBuys = Math.min(resellerBuys, Math.round(qty * capFrac * raffleMult));
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
    trendFactors: tb.factors, fatigue: tb.fatigue,
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

/* ---------------- AI competitors ----------------
   Six fixed brands, each with a personality. Their weekly moves,
   growth character and headlines all follow who they are.        */
const PERSONAS = [
  {name:'VOID',        style:'ultra-exclusive · tiny runs, huge resale', f:[900,2600],   p:[55,72],
   moves:{drop:.55, viral:.1, collab:.05, flop:.1, scandal:.2},
   lines:{drop:'VOID released 40 units at 3am with no announcement. Gone before sunrise. Resale is already 5x.',
          viral:'A VOID piece surfaced in a paparazzi shot. Nobody can verify it. Resale doubled anyway.',
          flop:'VOID delayed their drop indefinitely. The mystique only grows.',
          scandal:'VOID accused of buying their own stock to inflate resale. They responded with silence.'}},
  {name:'NOVA',        style:'affordable basics · mass production, big community', f:[14000,28000], p:[12,26],
   moves:{drop:.4, viral:.15, collab:.15, flop:.2, scandal:.1},
   lines:{drop:'NOVA restocked their core line. 10,000 units, still selling. The people\'s brand keeps eating.',
          viral:'NOVA\'s "$30 hoodie vs $300 hoodie" video hit every feed this week.',
          flop:'NOVA\'s premium experiment flopped hard. Their community wants basics, not aspirations.',
          scandal:'NOVA called out for shrinking sizes. They issued refunds within hours — crisis handled.'}},
  {name:'KITSUNE',     style:'minimal japanese-inspired · devoted following', f:[3500,8000], p:[45,62],
   moves:{drop:.45, viral:.1, collab:.1, flop:.05, scandal:.05},
   lines:{drop:'KITSUNE\'s seasonal release sold through quietly, as always. Their fans don\'t miss.',
          viral:'A KITSUNE stitching detail went viral among quality obsessives. 400 slow-motion videos later…',
          flop:'KITSUNE misfired with a graphic tee. Their purists politely pretended not to see it.',
          scandal:'KITSUNE raised prices 20%. Their fans thanked them for the warning.'}},
  {name:'OUTLAW',      style:'skate culture · youth-focused, loud', f:[5500,12000], p:[22,38],
   moves:{drop:.35, viral:.25, collab:.15, flop:.15, scandal:.1},
   lines:{drop:'OUTLAW dropped a deck-and-tee pack outside a skate contest. Chaos, in a good way.',
          viral:'An OUTLAW clip of a kickflip in their new jacket is everywhere. Youth culture won this week.',
          flop:'OUTLAW\'s formal line confused everyone. Skaters don\'t want blazers.',
          scandal:'OUTLAW\'s founder beefed with a magazine editor in the comments. Sales went UP.'}},
  {name:'OBSIDIAN',    style:'luxury streetwear · expensive, high prestige', f:[1800,5200], p:[58,78],
   moves:{drop:.45, viral:.1, collab:.2, flop:.1, scandal:.15},
   lines:{drop:'OBSIDIAN\'s $600 hoodie sold out to a client list nobody can get on.',
          viral:'OBSIDIAN dressed the front row this week. The photos did the marketing.',
          flop:'OBSIDIAN\'s diffusion line got called "expensive for no reason". They pretended not to hear.',
          scandal:'OBSIDIAN caught producing in the same factory as fast fashion. Prestige takes a hit.'}},
  {name:'PAPER CROWN', style:'trend-chasing hype machine · volatile', f:[7000,15000], p:[8,28],
   moves:{drop:.3, viral:.25, collab:.1, flop:.25, scandal:.1},
   lines:{drop:'PAPER CROWN dropped whatever\'s trending this week. It sold. It always sells. For now.',
          viral:'PAPER CROWN\'s latest bandwagon jump actually hit. The algorithm loves them.',
          flop:'PAPER CROWN missed the trend window by a week. Full racks, heavy markdowns.',
          scandal:'Side-by-sides of PAPER CROWN\'s "original" designs are circulating again.'}},
];

function makeCompetitors(){
  return PERSONAS.map(p=>({
    name: p.name,
    style: p.style,
    followers: ri(p.f[0], p.f[1]),
    prestige:  ri(p.p[0], p.p[1]),
    quality:   ri(4, 9),
  }));
}
function personaOf(c){ return PERSONAS.find(p=>p.name===c.name) || PERSONAS[5]; }

function tickCompetitors(){
  const rankBefore = competitorRank();
  // every rival relates to trends in character
  const trends = G.trends||[];
  const riser  = trends.length? trends.reduce((a,b)=>b.vel>a.vel?b:a) : null;
  const hot    = trends.length? trends.reduce((a,b)=>b.pop>a.pop?b:a) : null;
  const tPop   = id => { const t=trends.find(x=>x.id===id); return t? t.pop : 50; };
  G.competitors.forEach(c=>{
    c.prevFollowers = c.followers;
    // gentle mean-reverting growth
    c.followers = Math.max(200, Math.round(c.followers * rand(0.96, 1.06) + c.prestige*3));
    c.prestige  = clamp(c.prestige + rand(-1.2, 1.4), 1, 99);
    // trend behaviour by personality
    if(riser){
      if(c.name==='PAPER CROWN'){          // chases everything, boom or bust
        if(riser.vel>2.5) c.followers += ri(300,1200);
        else if(riser.vel<-2.5 || trends.some(t=>t.prev-t.pop>4)) c.followers = Math.max(200, c.followers - ri(300,1000));
        if(Math.random()<0.08) feedPost('press','DROPFEED', `PAPER CROWN already has a ${trendDef(riser.id).name.toLowerCase()} collection out. Of course they do.`);
      } else if(c.name==='NOVA'){          // only proven winners
        if(hot && hot.pop>70 && Math.abs(hot.vel)<2) c.followers += ri(200,600);
      } else if(c.name==='KITSUNE'){       // cautious, steady adoption
        if(hot && hot.pop>62) { c.followers += ri(50,250); c.prestige = clamp(c.prestige+0.3,1,99); }
      } else if(c.name==='OUTLAW'){        // lives and dies with skate culture
        c.followers += Math.round((tPop('skate')-50)*ri(4,10));
      } else if(c.name==='OBSIDIAN'){      // rides luxury sentiment
        c.followers += Math.round((tPop('luxmat')-50)*ri(2,6));
      }                                     // VOID ignores trends entirely — mystique is timeless
    }
    c.followers = Math.max(200, c.followers);
    // brands make moves that fit who they are
    if(Math.random()<0.28){
      const P = personaOf(c);
      // weighted pick from the persona's move table
      let roll = Math.random(), move = 'drop', acc = 0;
      for(const [m,w] of Object.entries(P.moves)){ acc += w; if(roll<=acc){ move = m; break; } }
      if(move==='drop' && Math.random()<0.3){
        // rivals manage design vaults too: delays, scraps, splits, rushes
        const vm = pick([
          [`${c.name} delayed their upcoming collection indefinitely. "When it's ready," they posted.`, 0, 0.5],
          [`${c.name} reportedly scrapped an entire finished collection days before launch. Perfectionism or panic?`, -ri(50,300), 0],
          [`${c.name} split their seasonal line into three tiny capsules. Scarcity theatre at its finest.`, ri(200,700), 0.8],
          [`${c.name} rushed an unfinished drop out the door. The stitching reviews are not kind.`, -ri(200,800), -2],
        ]);
        feedPost('press', 'DROPFEED', vm[0]);
        c.followers = Math.max(200, c.followers + vm[1]);
        c.prestige = clamp(c.prestige + vm[2], 1, 99);
      } else if(move==='drop'){
        feedPost('press', 'DROPFEED', P.lines.drop);
        c.followers += c.name==='NOVA'? ri(600,1600) : c.name==='VOID'? ri(50,200) : ri(200,900);
        c.prestige = clamp(c.prestige + (c.name==='VOID'||c.name==='OBSIDIAN'? 1.5 : 0.7), 1, 99);
        if(Math.random()<0.5) G.hype = clamp(G.hype-2, 0, 100);   // they soak up attention
      } else if(move==='viral'){
        feedPost('press', 'DROPFEED', P.lines.viral);
        c.followers += c.name==='PAPER CROWN'||c.name==='OUTLAW'? ri(1200,3000) : ri(500,1600);
      } else if(move==='collab'){
        const other = pick(G.competitors.filter(x=>x!==c)) || c;
        feedPost('press', 'DROPFEED', `${c.name} × ${other.name} collab announced. Nobody saw that pairing coming.`);
        c.followers += ri(300, 1000); other.followers += ri(200, 600);
      } else if(move==='flop'){
        feedPost('press', 'DROPFEED', P.lines.flop);
        c.followers = Math.max(200, c.followers - (c.name==='PAPER CROWN'? ri(800,2000) : ri(200,900)));
        c.prestige = clamp(c.prestige - (c.name==='VOID'? 0 : 2), 1, 99);   // VOID flops read as mystique
      } else {
        feedPost('press', 'DROPFEED', P.lines.scandal);
        c.followers = Math.max(200, c.followers - ri(400, 1500));
        c.prestige = clamp(c.prestige - (c.name==='NOVA'? 1 : 4), 1, 99);   // NOVA handles crises well
      }
    }
  });
  // tell the player when the leaderboard shifts around them
  const rankAfter = competitorRank();
  if(rankAfter < rankBefore) toast(`📈 You climbed to #${rankAfter} in the scene`, 'gold');
  else if(rankAfter > rankBefore){
    const passer = G.competitors.filter(c=>c.followers>G.followers).sort((a,b)=>a.followers-b.followers)[0];
    if(passer) feedPost('sys', null, `${passer.name} just passed ${G.brand} on followers. Heads up.`);
  }
}

function competitorRank(){
  return 1 + G.competitors.filter(c=>c.followers > G.followers).length;
}
