/* ============================================================
   SELLOUT — drops.js
   Collection design, quality scoring, marketing channels,
   drop configuration and the launch sequence.
   ============================================================ */

"use strict";

/* ---------------- design state ----------------
   G.design holds the studio's work-in-progress. */
function blankDesign(){
  return {
    name:'', product:'tee', theme:THEMES[0], palette:'mono', logo:'chest',
    graphics:'minimal', fit:'regular', material:'basic', packaging:'poly',
  };
}

// Unit cost after material/graphics/packaging and research discounts.
function designUnitCost(d){
  const prod = PRODUCTS.find(p=>p.id===d.product);
  const mat  = MATERIALS.find(m=>m.id===d.material);
  const gfx  = GRAPHICS.find(g=>g.id===d.graphics);
  const pkg  = PACKAGING.find(p=>p.id===d.packaging);
  let cost = prod.cost * mat.costMult * (gfx.costMult||1) + pkg.costAdd;
  if(G.research.manufacturing) cost *= 0.85;
  return cost;
}

// Design quality 1–10: material + graphics + designer skill + a little luck at finalize.
function designQualityBase(d){
  const mat = MATERIALS.find(m=>m.id===d.material);
  const gfx = GRAPHICS.find(g=>g.id===d.graphics);
  let q = 4 + mat.q + gfx.q + empBonus('designer')*2.2;
  return clamp(q, 1, 9.2);
}

/* ============ v1.4 DESIGN VAULT ============
   Designing and releasing are now separate crafts. Each design
   becomes a vault piece with its own soul — quality, originality,
   timelessness — waiting for the right collection.              */
function designCost(d){ return Math.round(100 + designUnitCost(d)*8); }

// How similar is this design to your last few? Feeds burnout + originality.
function designSimilarity(d){
  const recent = G.vault.slice(-3).concat(G.drops.slice(-2).map(x=>x.attrs||{}));
  if(!recent.length) return 0;
  return recent.reduce((a,r)=>a + ((r.product===d.product)+(r.palette===d.palette)+(r.graphics===d.graphics))/3, 0)/recent.length;
}

function finalizeDesign(){   // (kept name for compatibility — now "add to vault")
  const d = G.design;
  if(!d) return;
  const mat = MATERIALS.find(m=>m.id===d.material);
  if(mat.research && !G.research[mat.research]){ toast('That material needs research'); return; }
  const cost = designCost(d);
  if(G.cash < cost){ toast('Sampling this design costs '+fmt$(cost)); return; }
  if(!spendSlots(1)) return;   // designing takes real studio time
  if(!d.name.trim()){ d.name = randCollectionName(); }
  G.cash -= cost; G.weekLog.expenses += cost;

  const sim = designSimilarity(d);
  const originality = clamp(4 + rand(0,3) + empBonus('designer')*2 - sim*3 - (G.burnout||0)/30, 1, 10);
  const quality = clamp(designQualityBase(d) + rand(-0.7,0.9) + (G.eventMods.qualityBonus||0) - (G.burnout||0)/25, 1, 10);
  if(G.eventMods.qualityBonus) delete G.eventMods.qualityBonus;
  const timeless = Math.random() < 0.08 + (originality>=7.5?0.22:0) + (d.graphics==='minimal'?0.08:0);

  // creative burnout: designing costs energy, repetition costs more
  G.designsThisWeek = (G.designsThisWeek||0)+1;
  let strain = 7 + (G.designsThisWeek-1)*5 + (sim>0.5?6:0) - (G.research.creative?3:0);
  G.burnout = clamp((G.burnout||0) + Math.max(3,strain), 0, 100);

  G.vault.push({
    id: Date.now()+Math.random(), name: d.name.trim().toUpperCase(),
    product:d.product, theme:d.theme, palette:d.palette, logo:d.logo,
    graphics:d.graphics, fit:d.fit, material:d.material, packaging:d.packaging,
    quality:+quality.toFixed(1), originality:+originality.toFixed(1), timeless,
    age:0, week:G.week, unitCost:designUnitCost(d),
  });
  toast(`"${d.name.toUpperCase()}" added to the vault${timeless?' — this one feels TIMELESS':''}`, timeless?'gold':undefined);
  if(G.burnout>=70) toast('⚠ Creative burnout high — quality is suffering. Rest or vary your work.');
  G.design = null;
  saveGame(); renderAll();
}

/* ---------- collection assembly ----------
   Selected vault pieces + a name become a launch-ready collection.
   Synergy is the Creative Director's score: do these belong together? */
function synergyOf(items){
  if(items.length<2) return 70;   // a capsule is coherent by definition
  let pairs=0, score=0;
  for(let i=0;i<items.length;i++) for(let j=i+1;j<items.length;j++){
    const a=items[i], b=items[j]; pairs++;
    score += ((a.palette===b.palette)+(a.theme===b.theme)+(a.fit===b.fit)+(a.graphics===b.graphics)+(a.logo===b.logo))/5;
  }
  return Math.round(score/pairs*100);
}
function sizeLabel(n){ return n<=2?'Capsule':n<=6?'Collection':n<=9?'Seasonal Collection':'Mega Collection'; }

function buildReadyDrop(){
  const items = G.vault.filter(v=>(G.colSel||[]).some(id=>String(id)===String(v.id)));
  if(!items.length){ G.readyDrop=null; return; }
  const syn = synergyOf(items);
  const avg = f=>items.reduce((a,i)=>a+f(i),0)/items.length;
  const lead = items[0];
  const dominant = k=>{ const c={}; items.forEach(i=>c[i[k]]=(c[i[k]]||0)+1); return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]; };
  const name = (G.colName||'').trim().toUpperCase() || randCollectionName()+' '+(items.length<=2?'CAPSULE':'COLLECTION');
  const quality = clamp(avg(i=>i.quality) + (syn-50)/50*1.2, 1, 10);
  const lastDrop = G.drops[G.drops.length-1];
  G.readyDrop = {
    items, pieces:items.length, synergy:syn, capsule:items.length<=2,
    originality:+avg(i=>i.originality).toFixed(1),
    name, theme:dominant('theme'), product:dominant('product'), palette:dominant('palette'),
    logo:dominant('logo'), graphics:dominant('graphics'), fit:dominant('fit'),
    material:dominant('material'), packaging:dominant('packaging'),
    quality:+quality.toFixed(1),
    staleTheme: lastDrop && lastDrop.theme===dominant('theme'),
    unitCost: avg(i=>i.unitCost) * (items.length>=7?1.1:1),   // big lines strain production
    productObj:  PRODUCTS.find(p=>p.id===dominant('product')),
    paletteObj:  PALETTES.find(p=>p.id===dominant('palette')),
    logoObj:     LOGOS.find(l=>l.id===dominant('logo')),
    graphicsObj: GRAPHICS.find(g=>g.id===dominant('graphics')),
    fitObj:      FITS.find(f=>f.id===dominant('fit')),
    packagingObj:PACKAGING.find(p=>p.id===dominant('packaging')),
    qty: (G.readyDrop&&G.readyDrop.qty)||250, price:(G.readyDrop&&G.readyDrop.price)||PRODUCTS.find(p=>p.id===dominant('product')).retail,
    limit:(G.readyDrop&&G.readyDrop.limit)||'none',
    revealed: G.colRevealed||false,
  };
}

/* ---------- launch scheduling (v1.5) ----------
   Lock a collection to a future week; teasers run automatically
   ($200/wk, +3 hype/wk) and long lead times earn a rollout bonus. */
function scheduleLaunch(weeksAhead){
  const col = G.readyDrop;
  if(!col || G.schedule) return;
  G.schedule = {week:G.week+weeksAhead, colSel:(G.colSel||[]).slice(), colName:col.name,
                qty:col.qty, price:col.price, limit:col.limit, setWk:G.week};
  G.colSel = []; G.colName = ''; G.colRevealed = false;
  G.hype = clamp(G.hype+4, 0, 100);
  feedPost('press','DROPFEED', `${G.brand} announces "${G.schedule.colName}" — dropping in ${weeksAhead} weeks. Mark your calendars.`);
  toast('🗓 Launch scheduled — teaser campaign runs at $200/wk', 'gold');
  saveGame(); renderAll();
}
function cancelSchedule(){
  if(!G.schedule) return;
  G.colSel = G.schedule.colSel; G.colName = G.schedule.colName;
  G.schedule = null;
  toast('Schedule cancelled — the pieces are back on the table');
  saveGame(); renderAll();
}
function executeSchedule(){
  const sc = G.schedule;
  G.colSel = sc.colSel; G.colName = sc.colName;
  buildReadyDrop();
  const col = G.readyDrop;
  if(!col){ G.schedule = null; toast('Scheduled launch cancelled — its pieces were gone'); return false; }
  col.qty = sc.qty; col.price = sc.price; col.limit = sc.limit;
  col.planned = (sc.week - sc.setWk) >= 3;
  col.fwDecided = true;
  col.fw = !!(currentCalEvent() && currentCalEvent().type==='fashionweek' && G.prestige>=15 && G.cash > col.unitCost*col.qty + 4000);
  const need = Math.round(col.unitCost*col.qty*(G.eventMods.nextDropCost||1)) + (col.fw?2500:0);
  if(G.cash < need || col.qty > productionCap()){
    G.schedule.week = G.week+1;
    toast('⏳ Scheduled launch postponed a week — cash or capacity short');
    return false;
  }
  G.schedule = null;
  launchDrop();
  return true;
}

/* Collection reveal: show the world before you sell to it. */
function revealCollection(){
  const col = G.readyDrop;
  if(!col || G.colRevealed) return;
  G.colRevealed = true; col.revealed = true;
  const score = col.quality + col.synergy/25;
  const gain = clamp(3 + col.quality*0.6 + col.synergy/40 + col.pieces*0.4, 3, 16);
  G.hype = clamp(G.hype+gain, 0, 100);
  const pool = score>=10? [`THEY COOKED. every piece in "${col.name}" is a keeper`,`the "${col.name}" preview broke my group chat. need that ${col.productObj.name.toLowerCase()}`,`cohesion is INSANE. this is a real collection, not a merch dump`]
    : score>=7.5? [`"${col.name}" looks promising ngl`,`need that ${col.productObj.name.toLowerCase()} from the preview`,`solid preview. wallet is nervous`]
    : [`not feeling the colours on "${col.name}" tbh`,`the preview is... fine? expected more`,`some pieces hit, some clearly padding`];
  for(let i=0;i<Math.min(3,pool.length);i++) feedPost(score>=10?'hot':'', pick(HANDLES), pool[i]);
  feedPost('press','DROPFEED', `${G.brand} just revealed "${col.name}" — ${col.pieces} piece${col.pieces>1?'s':''}, dropping soon. The comments are already fighting.`);
  toast(`Collection revealed — +${gain.toFixed(1)} hype`, 'gold');
  saveGame(); renderAll();
}

/* ---------------- marketing channels ----------------
   Each channel usable once per week; effects scale with the
   marketing manager and photographer.                       */
const CHANNELS = [
  {id:'post',     name:'Social Post',      cost:0,    base:[2,5],   desc:'Free reach. Small but steady.'},
  {id:'tiktok',   name:'Short-Form Video', cost:300,  base:[4,10],  desc:'Volatile — can quietly flop or quietly explode.'},
  {id:'teaser',   name:'Product Teaser',   cost:500,  base:[5,9],   desc:'Close-ups, no context. Reliable heat.'},
  {id:'countdown',name:'Countdown Timer',  cost:200,  base:[3,6],   desc:'Urgency on the site. Stacks well.'},
  {id:'lookbook', name:'Lookbook Shoot',   cost:1200, base:[8,14],  desc:'Editorial photography. Photographer makes it sing.'},
  {id:'email',    name:'Email Blast',      cost:150,  base:[2,5],   desc:'Talks to people who already care. Feeds loyalty.', research:'crm'},
];

function runChannel(id){
  const ch = CHANNELS.find(c=>c.id===id);
  if(!ch || G.usedChannels[id]) return;
  if(ch.research && !G.research[ch.research]) return;
  if(G.cash < ch.cost){ toast('Not enough cash'); return; }
  if(!spendSlots(1)) return;   // campaigns take a slot of the week
  G.cash -= ch.cost;
  G.weekLog.expenses += ch.cost;
  G.usedChannels[id] = true;

  const mkt = empBonus('marketing');
  const photo = empBonus('photographer');
  let gain = rand(ch.base[0], ch.base[1]) * (1 + mkt*0.8);
  gain *= (dna().mkt && dna().mkt[id]) || 1;   // your DNA's home channel hits harder
  gain *= season().mkt;                        // seasons change how marketing lands
  let note = '';

  if(id==='tiktok'){
    if(Math.random() < 0.14 + mkt*0.1){ gain *= 3; note = ' — it took off overnight 🔥'; feedPost('hot', pick(HANDLES), `that ${G.brand} video is EVERYWHERE rn`); G.stats.hadViral = true; }
    else if(Math.random()<0.3){ gain *= 0.3; note = ' — barely any views.'; }
  }
  if(id==='lookbook'){ gain *= (1 + photo*0.7); if(photo>0) note = ' — the photography carried it.'; }
  if(id==='email'){ G.loyalty = clamp(G.loyalty+2, 0, 100); note = ' — the community feels looped in.'; }

  // remember your best campaign ever for the records board
  if(!G.stats.bestCampaign || gain > G.stats.bestCampaign.gain)
    G.stats.bestCampaign = {name:ch.name, gain:+gain.toFixed(1), week:G.week};

  G.hype = clamp(G.hype + gain, 0, 100);
  checkMilestones();
  toast(`+${gain.toFixed(1)} hype${note}`);
  saveGame(); renderAll();
}

/* ---------------- collection reviews ----------------
   Every release gets a critic score across six categories,
   an overall /100, stars, and a written verdict.           */
const REVIEW_PRAISE = {
  design:'the design language is genuinely strong', quality:'construction that punches above its weight',
  value:'priced with unusual respect for the buyer', packaging:'an unboxing that feels like an event',
  exclusivity:'scarcity handled with real discipline', hype:'a rollout the whole scene watched',
};
const REVIEW_KNOCK = {
  design:'a design that plays it too safe', quality:'materials that undercut the ambition',
  value:'ambitious pricing the product can\'t quite justify', packaging:'packaging that feels like an afterthought',
  exclusivity:'a run size that dilutes the moment', hype:'a launch that arrived to a quiet room',
};
function generateReview(col, sim, price, hypeAt){
  const synAdj = col.synergy!==undefined? (col.synergy-55)/45 : 0;   // cohesion is design language
  const S = {
    design:      clamp(col.quality*0.62 + (col.theme===G.trend.theme?1.4:0) + (col.staleTheme?-1.4:0) - (sim.fatigue||0)*4 + synAdj + rand(0,1.6), 1, 10),
    quality:     clamp(col.quality + rand(-0.5,0.5), 1, 10),
    value:       clamp(8 - Math.max(0,(price/col.productObj.retail-1))*5.5 + (col.quality-5.5)*0.55, 1, 10),
    packaging:   clamp({poly:4.5, box:8.6, eco:7.2}[col.packaging] + rand(-0.5,1), 1, 10),
    exclusivity: clamp(sim.soldOut? 5 + Math.min(5, sim.scarcity*1.7) : 2.5 + (sim.sold/col.qty)*2, 1, 10),
    hype:        clamp(hypeAt/10 + rand(0,1), 1, 10),
  };
  Object.keys(S).forEach(k=>S[k]=+S[k].toFixed(1));
  // design & quality weigh heaviest in the verdict
  let overall = Math.round((S.design*2 + S.quality*2 + S.value*1.5 + S.packaging*0.8 + S.exclusivity*1.6 + S.hype*1.1) / 9 * 10);
  if(col.fw) overall = Math.max(5, overall-6);   // runway critics are merciless
  const mw = currentCalEvent();
  if(mw && mw.type==='media') overall = clamp(overall + (overall>=65? 5 : -5), 1, 100);   // review week amplifies verdicts
  const stars = clamp(Math.round(overall/20), 1, 5);
  const entries = Object.entries(S);
  const best  = entries.reduce((a,b)=>b[1]>a[1]?b:a);
  const worst = entries.reduce((a,b)=>b[1]<a[1]?b:a);
  let text;
  if(overall>=88)      text = `A statement collection — ${REVIEW_PRAISE[best[0]]}. This is what ${G.brand} sounds like at full volume.`;
  else if(overall>=70) text = `A strong release carried by ${REVIEW_PRAISE[best[0]]}, held back only by ${REVIEW_KNOCK[worst[0]]}.`;
  else if(overall>=50) text = `A mixed outing: ${REVIEW_PRAISE[best[0]]}, but ${REVIEW_KNOCK[worst[0]]} keeps it from landing.`;
  else                 text = `A miss. ${REVIEW_KNOCK[worst[0]].charAt(0).toUpperCase()+REVIEW_KNOCK[worst[0]].slice(1)}, and the scene noticed.`;
  return {scores:S, overall, stars, text, best:best[0], worst:worst[0]};
}

/* ---------------- launch ---------------- */
function launchDrop(){
  const col = G.readyDrop;
  if(!col || !col.items || !col.items.length){ toast('Assemble a collection from the vault first'); return; }
  // Fashion Week: launching this week can mean showing on the runway
  const fwEvent = currentCalEvent();
  if(fwEvent && fwEvent.type==='fashionweek' && G.prestige>=15 && col.fwDecided===undefined){
    showModal(fwEvent.icon+' '+fwEvent.name, 'info',
      `Show <b>"${col.name}"</b> on the runway? Entry <b>${fmt$(2500)}</b>. Critics judge harder and expectations run high — but the reach, prestige and resale attention are unmatched.`,
      [{label:'SHOW AT FASHION WEEK (−$2,500)', cls:'primary', fn:()=>{ col.fwDecided=true; col.fw=true; launchDrop(); }},
       {label:'Launch quietly instead', fn:()=>{ col.fwDecided=true; col.fw=false; launchDrop(); }}]);
    return;
  }
  if(G.droppedThisWeek){ toast('Already dropped this week — advance the week'); return; }
  const qty = col.qty, price = col.price;
  const prodCost = Math.round(col.unitCost * qty * (G.eventMods.nextDropCost||1)) + (col.fw? 2500:0);
  if(qty > productionCap()){ toast('Over your production capacity'); return; }
  if(G.cash < prodCost){ toast('Cannot afford this production run'); return; }
  if(!spendSlots(2)) return;   // launch day consumes most of the week

  G.cash -= prodCost;
  G.weekLog.expenses += prodCost;
  G.droppedThisWeek = true;
  const hypeAt = G.hype;   // hype the drop launched with, before results move it

  const sim = simulateDrop(col, qty, price, {limit:col.limit});
  const revenue = sim.sold * price;
  G.cash += revenue;
  G.weekLog.revenue += revenue;
  G.stats.lifetimeSales   += sim.sold;
  G.stats.lifetimeRevenue += revenue;
  G.stats.lifetimeProfit   = (G.stats.lifetimeProfit||0) + revenue - prodCost;
  if(sim.scarcity>=3) G.stats.hadViral = true;   // demand 3x supply = a viral moment

  applyDropConsequences(col, qty, price, sim, revenue - prodCost);
  const review = generateReview(col, sim, price, hypeAt);

  // v1.5: the calendar leaves its mark on the launch
  const tags = [];
  const ce = currentCalEvent();
  if(col.fw){
    const extra = Math.round((sim.followerGain||0)*0.5);
    G.followers += extra; sim.followerGain = (sim.followerGain||0)+extra;
    sim.resaleFinal = Math.round(sim.resaleFinal*1.15);
    tags.push('Fashion Week Show');
    if(review.overall>=75){ G.prestige = clamp(G.prestige+2.5,0,100); sim.factors.push(['Fashion Week triumph', `critics scored it ${review.overall} on the big stage — prestige soars`, 'good']); }
    else if(review.overall<50){ G.prestige = clamp(G.prestige-3,0,100); G.reputation = clamp(G.reputation-4,0,100); sim.factors.push(['Torn apart at Fashion Week', 'a weak showing under the brightest lights costs dearly', 'bad']); }
    else sim.factors.push(['Fashion Week showing', 'a respectable runway moment — reach and resale attention gained', 'good']);
    feedPost('press','THE RECORD', `${G.brand} showed "${col.name}" at ${ce? ce.name:'Fashion Week'}. Verdict: ${review.overall}/100.`);
  }
  if(ce && ce.type==='competition'){
    const qualifies = ce.id==='expo'? col.graphics==='minimal' : col.pieces<=2;
    if(qualifies){
      const winP = clamp(col.quality/12 + G.prestige/150 + (col.synergy||60)/400, 0.1, 0.85);
      if(Math.random()<winP){
        G.prestige = clamp(G.prestige+2,0,100); G.followers += ri(300,800);
        tags.push('Competition Winner');
        sim.factors.push(['🏅 '+ce.name.split('—')[1].trim()+' WON', 'the jury picked your collection — prestige and new eyes', 'good']);
        feedPost('press','THE RECORD', `${G.brand}'s "${col.name}" wins the ${ce.name.split('—')[1].trim()}.`);
        logEvolution(`Won the ${ce.name.split('—')[1].trim()} with "${col.name}"`);
      } else sim.factors.push(['Competition entry', 'entered '+ce.name.split('—')[0].trim()+' — didn\'t take the prize, but judges noticed', 'good']);
    }
  }
  if(season().id==='holiday') tags.push('Holiday Collection');
  if(ce && ce.type==='spend') tags.push('Black Friday Drop');
  if((sim.factors||[]).some(f=>f[0]==='TRENDSETTER')) tags.push('Trendsetter');
  if(col.planned) sim.factors.push(['Planned rollout', 'weeks of scheduled teasers built real anticipation', 'good']);

  // v1.6: did you deliver what the community voted for?
  if(G.pollWish && G.week - G.pollWish.week <= 6){
    if(col.product===G.pollWish.product && col.palette===G.pollWish.palette){
      G.loyalty = clamp(G.loyalty+7, 0, 100);
      sim.factors.push(['You listened', 'this is exactly what the community voted for — trust deepens', 'good']);
      feedPost('hot', pick(HANDLES), `${G.brand} actually made the thing we voted for. WE designed this. community W`, 'Threadline');
      G.pollWish = null;
    }
  } else G.pollWish = null;

  // v1.6: moments the community will retell for years
  if(review.overall>=90) addLore(`"remember the legendary week ${G.week} ${col.productObj.name.toLowerCase()}? '${col.name}' still undefeated"`);
  if(!sim.soldOut && sim.sold/qty<0.4 && qty>=500) addLore(`"we don't talk about the '${col.name}' overproduction of week ${G.week}"`);
  if(col.fw && review.overall<50) addLore(`"the failed week ${G.week} Fashion Week show still hurts to think about"`);
  if(col.fw && review.overall>=80) addLore(`"the '${col.name}' runway moment at week ${G.week}? historic. i was refreshing the livestream"`);
  if(tags.includes('Trendsetter')) addLore(`"'${col.name}' didn't follow the wave — it WAS the wave. week ${G.week}, never forget"`);

  // which crowd carried the drop, which one shrugged (loyal core excluded)
  const segEntries = Object.entries(sim.perSegment).filter(([k])=>k!=='_loyal');
  const segNames = {collector:'Collectors', street:'Streetwear Fans', casual:'Casual Buyers', enthusiast:'Fashion Enthusiasts', luxury:'Luxury Buyers'};
  const bestSeg  = segNames[segEntries.reduce((a,b)=>b[1]>a[1]?b:a)[0]];
  const worstSeg = segNames[segEntries.reduce((a,b)=>b[1]<a[1]?b:a)[0]];
  const goods = (sim.factors||[]).filter(f=>f[2]==='good');
  const bads  = (sim.factors||[]).filter(f=>f[2]==='bad');

  // v1.3: which living trends this drop rode, and the season it landed in
  const trendTags = (G.trends||[]).filter(t=>trendDef(t.id).match(col)>=0.5 && t.pop>55).map(t=>t.id);
  const s = season();
  G.seasonStats = G.seasonStats||{};
  const ss = G.seasonStats[s.id] = G.seasonStats[s.id]||{rev:0, profit:0, drops:0};
  ss.rev += revenue; ss.profit += revenue-prodCost; ss.drops++;

  // TRENDSETTER: prestige brands can bend fashion itself (rare, late-game)
  if(G.prestige>=60 && sim.soldOut && sim.scarcity>=2 && col.quality>=7.5){
    const carried = (G.trends||[]).filter(t=>trendDef(t.id).match(col)>=0.7);
    if(carried.length && Math.random()<0.25){
      const t = pick(carried);
      t.pop = clamp(t.pop+18, 3, 97); t.vel += 3;
      t.reason = `rising because ${G.brand}'s "${col.name}" made it undeniable`;
      t.reasonWk = G.week;
      G.stats.setTrend = true;
      sim.factors.push(['TRENDSETTER', `fashion just followed YOU — ${trendDef(t.id).name} surges globally off this drop`, 'good']);
      feedPost('press','THREADWATCH', `${G.brand} didn't follow the trend. They MADE one. ${trendDef(t.id).name} surges after "${col.name}".`);
      logEvolution(`Set a global trend: ${trendDef(t.id).name} surged off "${col.name}"`);
    }
  }

  const record = {
    name:col.name, week:G.week, product:col.productObj.name, theme:col.theme,
    qty, price, sold:sim.sold, soldOut:sim.soldOut, selloutMin:sim.selloutMin,
    resale:sim.resaleFinal, resaleNow:sim.resaleFinal, quality:col.quality,
    revenue, profit: revenue - prodCost, resellerShare:sim.resellerShare,
    leftover: sim.leftover||0,
    // v1.2 archive data
    priceRatio: +(price/col.productObj.retail).toFixed(2),
    hypeAt: Math.round(hypeAt),
    trendHit: col.theme===G.trend.theme || col.product===G.trend.product,
    limitUsed: col.limit,
    bestSeg, worstSeg,
    topGood: goods.length? goods[0][0] : null,
    topBad:  bads.length?  bads[0][0]  : null,
    review,
    // v1.3 living-fashion data
    season: s.id, trendTags,
    attrs: {product:col.product, palette:col.palette, fit:col.fit, graphics:col.graphics, logo:col.logo},
    // v1.4 collection data
    pieces: col.pieces, synergy: col.synergy, originality: col.originality,
    items: col.items.map(i=>({name:i.name, product:PRODUCTS.find(p=>p.id===i.product).name, quality:i.quality, timeless:i.timeless})),
    sizeType: sizeLabel(col.pieces),
    story: `"${col.name}" — a ${s.name.toLowerCase()} ${sizeLabel(col.pieces).toLowerCase()} exploring ${col.theme.toLowerCase()} across ${col.pieces} piece${col.pieces>1?'s':''}.`,
    tags,
  };
  G.drops.push(record);
  // the vault pieces are spent — they live in the archive now
  const usedIds = col.items.map(i=>i.id);
  G.vault = G.vault.filter(v=>!usedIds.includes(v.id));
  G.colSel = []; G.colName = ''; G.colRevealed = false;
  checkAwards(record);
  G.history.revenue.push({name:col.name, v:revenue});
  if(G.history.revenue.length>10) G.history.revenue.shift();
  G.readyDrop = null;
  checkMilestones();

  playLaunch(col, qty, sim, ()=> showDropResults(record, sim, prodCost));
  saveGame();
}

/* ---------------- community reaction pools ----------------
   Each crowd has its own voice; tone depends on the outcome.  */
const VOICES = {
  fanWin:      [c=>`gone in seconds. ${G.brand} does not miss`, c=>`copped the ${c.name} at the buzzer. hands still shaking`, c=>`this is why we wait on ${G.brand} drops`],
  fanLoss:     [c=>`${c.name} still fully stocked… ${G.brand} fell off?`, c=>`no line, no frenzy. the aura is fading`, c=>`skipped this one. felt phoned in`],
  collectorWin:[c=>`the ${c.name} is a future grail. sealed and shelved`, c=>`stitching, weight, hand-feel — proper piece. collecting these`, c=>`numbered run this small? archive material`],
  collectorBad:[c=>`printed ${fmtN(c.qty)} units and called it "limited"? collectors see through it`, c=>`quality doesn't match the story they're telling`],
  resellerWin: [c=>`already flipping my pair for double. thank you ${G.brand} 🤑`, c=>`carts hit. margins beautiful. see you next drop`],
  resellerBad: [c=>`resale under retail lol. dumped mine at a loss`, c=>`no flip value. skipping ${G.brand} drops now`],
  casualHappy: [c=>`actually got one for once!! love it`, c=>`fair price, cool ${c.productObj.name.toLowerCase()}, quick shipping. i'm a customer now`],
  casualAngry: [c=>`${fmt$(c.price)} for a ${c.productObj.name.toLowerCase()}?? be serious`, c=>`sold out before the page loaded. why do i bother`],
  quality:     [c=>`quality on the ${c.productObj.name.toLowerCase()} is insane. worth every dollar`, c=>`the ${MATERIALS.find(m=>m.id===c.material).name} fabric is HEAVY. premium feel`],
  qualityBad:  [c=>`washed it once and the print cracked 💀 do better ${G.brand}`, c=>`seams already loose. this is fast fashion with better marketing`],
  bots:        [c=>`bots took the whole ${c.name} drop. actual fans got NOTHING`, c=>`checkout was over before it started. bot city`],
  limitsGood:  [c=>`purchase limits meant real ones actually copped. respect, ${G.brand}`],
  stale:       [c=>`another ${c.theme} collection? we've seen this one already`],
  resaleHype:  [c=>`resale already 2x+. should've bought two`],
  fatigue:     [c=>`another ${c.productObj.name.toLowerCase()}? feels like last month's drop`, c=>`${G.brand} has stopped taking risks and it shows`, c=>`i could've predicted this entire collection. wake me when they try something`],
};
function react(pool, col, hot){
  const line = pick(VOICES[pool])(col);
  feedPost(hot?'hot':'', pick(HANDLES), line);
  return line;
}

/* Consequences ripple through every brand stat.
   Everything is recorded into sim.factors so the breakdown
   screen can explain exactly WHY the drop went how it went.  */
function applyDropConsequences(col, qty, price, sim, profit){
  const F = sim.factors = [];   // [label, delta-ish text, good|bad|neutral]
  const ratio = price / col.productObj.retail;
  const hypeAtLaunch = G.hype;  // captured before results move it

  // --- sellout or not ---
  if(sim.soldOut){
    const heat = sim.totalDemand/qty;
    const hypeGain = clamp(4 + heat*3, 4, 18);
    G.hype = clamp(G.hype + hypeGain, 0, 100);
    const fGain = Math.round(qty * clamp(heat*0.35, 0.2, 1.6) * (0.9+G.prestige/150));
    G.followers += fGain;
    sim.followerGain = fGain;
    F.push(['Sold out', `demand was ${heat.toFixed(1)}x your supply — scarcity did its job`, 'good']);
    if(col.quality>=6.5 && heat>1.4){ G.prestige = clamp(G.prestige + rand(1,2.4), 0, 100); F.push(['Prestige earned', 'high quality + genuine scarcity is how legends build', 'good']); }
    react('fanWin', col, true);
    if(heat>1.6 && col.quality>=6) react('collectorWin', col, true);
  } else {
    const rate = sim.sold/qty;
    const leftover = qty - sim.sold;
    G.hype = clamp(G.hype - (rate<0.5 ? 12 : 5), 0, 100);
    G.reputation = clamp(G.reputation - (rate<0.5?4:1.5), 0, 100);
    sim.followerGain = Math.round(sim.sold*0.15);
    G.followers += sim.followerGain;
    sim.leftover = leftover;
    F.push(['Did not sell out', `only ${Math.round(rate*100)}% moved — interest was ${fmtN(sim.genuineDemand)} vs ${fmtN(qty)} produced`, 'bad']);
    F.push(['Dead stock', `${fmtN(leftover)} unsold units — ${fmt$(Math.round(leftover*col.unitCost))} of production written off`, 'bad']);
    if(rate<0.5){ G.reputation = clamp(G.reputation-3, 0, 100); F.push(['Public flop', 'a visibly stocked "limited drop" bruises reputation', 'bad']); }
    react('fanLoss', col, false);
    if(qty>=1000) react('collectorBad', col, false);
  }

  // --- pricing verdict ---
  if(ratio>1.5 && col.quality<7){
    G.satisfaction = clamp(G.satisfaction-6, 0, 100);
    F.push(['Overpriced', `${Math.round((ratio-1)*100)}% over suggested retail without the quality to back it`, 'bad']);
    react('casualAngry', col, false);
  } else if(ratio<0.9){
    G.satisfaction = clamp(G.satisfaction+3, 0, 100);
    F.push(['Value pricing', 'under retail — casuals feel looked after', 'good']);
    react('casualHappy', col, false);
  }

  // --- quality verdict (refunds for genuinely bad product) ---
  const satShift = (col.quality-5.5)*2.4 + (col.packagingObj.sat||0)*0.5 + empBonus('warehouse')*3 + (G.research.shipping?8:0);
  G.satisfaction = clamp(G.satisfaction + satShift, 0, 100);
  if(col.quality>=7.5){ F.push(['Quality praised', `${col.quality}/10 — word of mouth working for you`, 'good']); react('quality', col, true); }
  if(col.quality<=4){
    const refunds = Math.round(sim.sold*price*0.08);
    G.cash -= refunds; G.weekLog.expenses += refunds;
    G.reputation = clamp(G.reputation-4, 0, 100);
    F.push(['Refund wave', `${col.quality}/10 quality → ${fmt$(refunds)} in refunds and returns`, 'bad']);
    react('qualityBad', col, false);
  }

  // --- resellers & bots ---
  if(sim.resellerShare>0.3){
    G.botStreak = (G.botStreak||0)+1;
    const loyaltyHit = G.botStreak>=2? 14 : 8;
    G.loyalty = clamp(G.loyalty - loyaltyHit, 0, 100);
    F.push(['Bots fed', `resellers took ${Math.round(sim.resellerShare*100)}% of stock${G.botStreak>=2?' — SECOND drop in a row; the community is done waiting':''} (−${loyaltyHit} loyalty)`, 'bad']);
    react('bots', col, false);
    if(G.botStreak>=2) feedPost('hot', pick(HANDLES), `two drops straight lost to bots. ${G.brand} clearly doesn't care about real fans`);
    react('resellerWin', col, false);
  } else {
    G.botStreak = 0;
    if(sim.soldOut && col.limit!=='none'){
      G.loyalty = clamp(G.loyalty + 4, 0, 100);
      F.push(['Fans protected', 'purchase limits kept bots out — loyalty up', 'good']);
      react('limitsGood', col, false);
    }
  }
  if(!sim.soldOut && sim.resellerBuys>0) react('resellerBad', col, false);
  if(sim.resaleFinal > price*2 && sim.soldOut){ F.push(['Resale heat', `flipping at ${fmt$(sim.resaleFinal)} — exclusivity is compounding`, 'good']); react('resaleHype', col, true); }
  if(col.staleTheme){ F.push(['Stale theme', 'same theme twice in a row bored the fashion crowd', 'bad']); react('stale', col, false); }
  if(col.theme===G.trend.theme || col.product===G.trend.product) F.push(['On trend', 'trend alignment pulled in the hype crowd', 'good']);
  if(hypeAtLaunch<20) F.push(['Low hype at launch', 'you dropped to a quiet room — marketing before launching matters', 'bad']);
  else if(hypeAtLaunch>=60) F.push(['Launched hot', `hype at ${Math.round(hypeAtLaunch)} put this in front of everyone`, 'good']);

  // --- collection format shapes the outcome ---
  if(col.pieces){
    if(col.capsule && sim.soldOut && col.quality>=6.5){
      G.prestige = clamp(G.prestige + rand(0.8,1.6), 0, 100);
      F.push(['Capsule exclusivity', 'a tiny, excellent release — collectors and prestige love this format', 'good']);
    }
    if(col.pieces>=7){
      if(sim.soldOut){ G.followers += Math.round((sim.followerGain||0)*0.15); F.push(['Seasonal statement', 'a full coordinated line lands like an event — extra reach', 'good']); }
      else { G.reputation = clamp(G.reputation-2,0,100); F.push(['Overreached', 'a big line that didn\'t sell out reads as hubris', 'bad']); }
    }
    if(col.synergy>=80) F.push(['Curated', `synergy ${col.synergy}/100 — the pieces speak the same language`, 'good']);
    else if(col.synergy<40 && col.pieces>=3) F.push(['Mismatched', `synergy ${col.synergy}/100 — critics call it a merch dump, not a collection`, 'bad']);
    if(col.revealed) F.push(['Pre-release reveal', 'anticipation was built before launch day', 'good']);
  }

  // --- product fatigue: repetition bores the whole market ---
  if((sim.fatigue||0)>0.08){
    const cut = Math.round((sim.followerGain||0) * Math.min(0.6, sim.fatigue*1.5));
    G.followers -= cut; sim.followerGain = (sim.followerGain||0) - cut;
    G.hype = clamp(G.hype-3, 0, 100);
    F.push(['Déjà vu', `too similar to your recent drops — demand −${Math.round(sim.fatigue*100)}%, follower growth cut. Reinvent something.`, 'bad']);
    react('fatigue', col, false);
  }
}

/* Post-drop breakdown: the numbers, WHO bought, and WHY it went
   the way it did — every factor spelled out.                    */
function showDropResults(rec, sim, prodCost){
  const head = [
    `<span class="stat-line">Revenue <b class="g">${fmt$(rec.revenue)}</b> · production ${fmt$(prodCost)} · net <b class="${rec.profit>=0?'g':'r'}">${fmt$(rec.profit)}</b></span>`,
    `<span class="stat-line">Sold <b>${fmtN(rec.sold)}/${fmtN(rec.qty)}</b>${rec.soldOut? ` · sold out in <b>${rec.selloutMin<1? Math.round(rec.selloutMin*60)+'s' : rec.selloutMin+' min'}</b>`:''} · +<b class="g">${fmtN(sim.followerGain||0)}</b> followers</span>`,
    `<span class="stat-line">Quality <b class="y">${rec.quality}/10</b> · resale settled at <b class="y">${fmt$(rec.resale)}</b> (${(rec.resale/rec.price).toFixed(1)}x retail)</span>`,
  ].join('<br>');

  // who showed up — genuine interest by crowd
  const segNames = {collector:'Collectors', street:'Streetwear Fans', casual:'Casuals', enthusiast:'Enthusiasts', luxury:'Luxury', _loyal:'Loyal Core'};
  const segs = Object.entries(sim.perSegment).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const maxSeg = Math.max(...segs.map(s=>s[1]), 1);
  const who = segs.map(([k,v])=>`
    <div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:12px">
      <span style="width:110px;color:var(--dim)">${segNames[k]||k}</span>
      <div style="flex:1;height:8px;background:var(--panel2);border-radius:4px"><div style="height:100%;width:${Math.round(100*v/maxSeg)}%;background:var(--cyan);border-radius:4px"></div></div>
      <b style="width:52px;text-align:right">${fmtN(v)}</b></div>`).join('')
    + (sim.resellerBuys>0? `<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:12px">
      <span style="width:110px;color:var(--red)">Resellers</span>
      <div style="flex:1;height:8px;background:var(--panel2);border-radius:4px"><div style="height:100%;width:${Math.round(100*sim.resellerBuys/maxSeg)}%;background:var(--red);border-radius:4px"></div></div>
      <b style="width:52px;text-align:right">${fmtN(sim.resellerBuys)}</b></div>` : '');

  // how the fashion climate moved the numbers (trends, season, fatigue)
  const climate = (sim.trendFactors||[]).map(([name, eff, pop])=>`
    <div style="display:flex;justify-content:space-between;gap:8px;margin:4px 0;font-size:12.5px">
      <span>${eff>=0?'<span style="color:var(--green)">▲</span>':'<span style="color:var(--red)">▼</span>'} ${name}${pop!==null&&pop!==undefined?` <span style="color:var(--dim)">(${Math.round(pop)}/100)</span>`:''}</span>
      <b style="color:${eff>=0?'var(--green)':'var(--red)'}">${eff>=0?'+':''}${Math.round(eff*100)}%</b></div>`).join('')
    || '<div style="font-size:12.5px;color:var(--dim)">A neutral week — no trend, season or fatigue effects moved this drop.</div>';

  // why it went this way
  const why = (sim.factors||[]).map(([label, text, tone])=>`
    <div style="display:flex;gap:8px;margin:6px 0;font-size:12.5px;line-height:1.45">
      <span style="flex-shrink:0">${tone==='good'?'<span style="color:var(--green)">▲</span>':tone==='bad'?'<span style="color:var(--red)">▼</span>':'·'}</span>
      <span><b>${label}</b> — <span style="color:var(--dim)">${text}</span></span></div>`).join('');

  // 2–4 believable customer comments, styled by who actually bought
  const CUST = {
    collector: rec.quality>=6? [`Grail potential. The ${rec.product.toLowerCase()} is going straight into the archive.`, `Numbered, well-made, worth the chase. This is why I collect ${G.brand}.`]
                             : [`As a collector… this one stays in the store. Quality isn't archive-tier.`],
    street:    rec.soldOut? [`Best ${rec.product.toLowerCase()} I've bought this year. Wore it out the same night.`, `The fit on this is stupid good. ${G.brand} knows exactly who they are.`]
                          : [`It's fine. Just fine. And "fine" doesn't sell out.`],
    casual:    rec.priceRatio<=1.05? [`Worth every cent. Shipping was quick too.`, `Finally copped without a fight. More of this please.`]
                                   : [`Nice piece but that price hurt. Might sit the next one out.`],
    luxury:    rec.quality>=7? [`Packaging felt premium before I even touched the garment. Details matter.`]
                             : [`At this positioning I expected better hand-feel. Noted.`],
    reseller:  rec.resale>rec.price*1.5? [`Already doubled my money. Pleasure doing business.`]
                                       : [`Resale is flat. This one's a wear, not a flip.`],
    missed:    rec.soldOut? [`Missed checkout AGAIN. Restock or I riot.`, `Cart emptied at payment. I just want to give you money??`] : [],
  };
  const pools = Object.values(CUST).filter(p=>p.length);
  const picked = [];
  for(let i=0; i<3 && pools.length; i++){
    const p = pools.splice(Math.floor(Math.random()*pools.length),1)[0];
    picked.push(pick(p));
  }
  const custHtml = picked.map(t=>`<div style="font-size:12.5px;margin:5px 0;color:var(--txt)">“${t}” <span style="color:var(--dim)">— verified buyer</span></div>`).join('');

  const rv = rec.review;
  const reviewHtml = rv? `
    <div style="background:var(--panel2);border-radius:8px;padding:12px 14px;margin:12px 0">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--gold);font-size:16px;letter-spacing:2px">${'★'.repeat(rv.stars)}${'☆'.repeat(5-rv.stars)}</span>
        <b style="font-size:18px;color:${rv.overall>=70?'var(--green)':rv.overall>=50?'var(--gold)':'var(--red)'}">${rv.overall}/100</b>
      </div>
      <div style="font-size:12.5px;color:var(--dim);margin-top:6px;font-style:italic">“${rv.text}”</div>
      <div style="font-size:11px;color:var(--dim);margin-top:8px">${Object.entries(rv.scores).map(([k,v])=>`${k} <b style="color:var(--txt)">${v}</b>`).join(' · ')}</div>
    </div>` : '';

  const firstTime = G.drops.length===1?
    `<div style="background:var(--panel2);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--dim);margin-bottom:12px">💡 Every drop gets this breakdown. The ▲▼ factors below are the game telling you exactly what the market rewards — learn them and your next drop hits harder.</div>` : '';

  showModal(rec.soldOut? 'SOLD OUT' : (rec.sold/rec.qty>=0.7? 'SOLID NUMBERS':'IT SAT'),
    rec.soldOut? 'good' : (rec.sold/rec.qty>=0.7?'info':'bad'),
    firstTime + head + reviewHtml +
    `<div style="margin:14px 0 4px;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em">Fashion climate</div>${climate}` +
    `<div style="margin:14px 0 4px;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em">Who showed up</div>${who}` +
    `<div style="margin:14px 0 2px;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em">Why it went this way</div>${why}` +
    `<div style="margin:14px 0 2px;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em">Customer voices</div>${custHtml}`,
    [{label:'CONTINUE', cls:'primary', fn:()=>{ renderAll(); }}]);
}

/* ---------------- launch animation ---------------- */
let launchTimers = [], launchDone = null;
function playLaunch(col, qty, sim, done){
  const bg = $id('launchBg');
  $id('launchName').textContent = col.name;
  $id('launchStatus').textContent = 'DROP GOES LIVE';
  $id('launchSold').textContent = '';
  $id('launchStamp').textContent = ''; $id('launchStamp').className='';
  const bar = $id('launchBar');
  bar.style.transition='none'; bar.style.width='0%';
  bg.classList.add('open');

  const finish = ()=>{
    launchTimers.forEach(clearTimeout); launchTimers=[];
    launchDone=null; bg.classList.remove('open'); done();
  };
  launchDone = finish;
  const T=(fn,ms)=>launchTimers.push(setTimeout(fn,ms));

  // pre-launch build-up: the site coming alive
  const prelude = ['PREPARING WEBSITE…','OPENING QUEUE…','CUSTOMERS ENTERING…','TRAFFIC INCREASING…','⚡ LIVE'];
  prelude.forEach((s,i)=>T(()=>{ $id('launchStatus').textContent = s; }, 420*i));
  const start = 420*prelude.length;

  const pct = Math.round(100*sim.sold/qty);
  const dur = sim.soldOut ? (sim.totalDemand/qty>=2.5? 1100:1700) : 2400;

  // mid-launch status beats, tailored to what's actually happening
  const beats = [];
  if(sim.perSegment.collector>qty*0.05) beats.push('COLLECTORS PURCHASING…');
  if(sim.resellerBuys>qty*0.1) beats.push('🤖 RESELLERS DETECTED…');
  beats.push(sim.soldOut? 'STOCK MOVING FAST…' : 'STOCK MOVING…');
  if(sim.soldOut && sim.totalDemand/qty>=2) beats.push('SERVERS STRAINING…');
  beats.forEach((s,i)=>T(()=>{ $id('launchStatus').textContent = s; }, start + (dur/(beats.length+1))*(i+1)));

  T(()=>{
    bar.style.transition = `width ${dur}ms ${sim.soldOut?'cubic-bezier(.6,0,.8,.4)':'cubic-bezier(.2,.8,.4,1)'}`;
    bar.style.width = pct+'%';
    const t0 = performance.now();
    const tick=()=>{
      if(!launchDone) return;
      const p = Math.min(1,(performance.now()-t0)/dur);
      const e = sim.soldOut? p*p : 1-Math.pow(1-p,2);
      $id('launchSold').textContent = fmtN(Math.round(e*sim.sold))+' / '+fmtN(qty)+' SOLD';
      if(p<1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, start);
  T(()=>{
    const st=$id('launchStamp');
    if(sim.soldOut){
      const t = sim.selloutMin<1? Math.round(sim.selloutMin*60)+' SECONDS' : sim.selloutMin+' MINUTES';
      st.textContent='SOLD OUT — '+t; st.className='w';
      $id('launchStatus').textContent='';
    }
    else if(pct>=70){ st.textContent='SOLID NUMBERS'; st.className='e'; $id('launchStatus').textContent='INVENTORY REMAINING'; }
    else { st.textContent='UNDERSOLD'; st.className='l'; $id('launchStatus').textContent='INVENTORY REMAINING'; }
  }, start+dur+100);
  T(finish, start+dur+1300);
  bg.onclick = ()=>{ if(launchDone) launchDone(); };
}
