/* ============================================================
   STREETWEAR EMPIRE — drops.js
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

// Finalize the studio design into a launch-ready collection object.
function finalizeDesign(){
  const d = G.design;
  if(!d) return;
  if(!d.name.trim()){ toast('Give the collection a name first'); return; }
  const mat = MATERIALS.find(m=>m.id===d.material);
  if(mat.research && !G.research[mat.research]){ toast('That material needs research'); return; }

  const quality = clamp(designQualityBase(d) + rand(-0.7, 0.9) + (G.eventMods.qualityBonus||0), 1, 10);
  if(G.eventMods.qualityBonus) delete G.eventMods.qualityBonus;
  // Repeating last theme bores the fashion crowd
  const lastDrop = G.drops[G.drops.length-1];
  const staleTheme = lastDrop && lastDrop.theme===d.theme;

  G.readyDrop = {
    ...d,
    name: d.name.trim().toUpperCase(),
    quality: +quality.toFixed(1),
    staleTheme,
    unitCost: designUnitCost(d),
    productObj:  PRODUCTS.find(p=>p.id===d.product),
    paletteObj:  PALETTES.find(p=>p.id===d.palette),
    logoObj:     LOGOS.find(l=>l.id===d.logo),
    graphicsObj: GRAPHICS.find(g=>g.id===d.graphics),
    fitObj:      FITS.find(f=>f.id===d.fit),
    packagingObj:PACKAGING.find(p=>p.id===d.packaging),
    qty: 250, price: PRODUCTS.find(p=>p.id===d.product).retail, limit:'none',
  };
  G.design = null;
  toast('Design finalized — configure the drop');
  gotoPage('drop');
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
  G.cash -= ch.cost;
  G.weekLog.expenses += ch.cost;
  G.usedChannels[id] = true;

  const mkt = empBonus('marketing');
  const photo = empBonus('photographer');
  let gain = rand(ch.base[0], ch.base[1]) * (1 + mkt*0.8);
  let note = '';

  if(id==='tiktok'){
    if(Math.random() < 0.14 + mkt*0.1){ gain *= 3; note = ' — it took off overnight 🔥'; feedPost('hot', pick(HANDLES), `that ${G.brand} video is EVERYWHERE rn`); }
    else if(Math.random()<0.3){ gain *= 0.3; note = ' — barely any views.'; }
  }
  if(id==='lookbook'){ gain *= (1 + photo*0.7); if(photo>0) note = ' — the photography carried it.'; }
  if(id==='email'){ G.loyalty = clamp(G.loyalty+2, 0, 100); note = ' — the community feels looped in.'; }

  G.hype = clamp(G.hype + gain, 0, 100);
  toast(`+${gain.toFixed(1)} hype${note}`);
  saveGame(); renderAll();
}

/* ---------------- launch ---------------- */
function launchDrop(){
  const col = G.readyDrop;
  if(!col) return;
  if(G.droppedThisWeek){ toast('Already dropped this week — advance the week'); return; }
  const qty = col.qty, price = col.price;
  const prodCost = Math.round(col.unitCost * qty * (G.eventMods.nextDropCost||1));
  if(qty > productionCap()){ toast('Over your production capacity'); return; }
  if(G.cash < prodCost){ toast('Cannot afford this production run'); return; }

  G.cash -= prodCost;
  G.weekLog.expenses += prodCost;
  G.droppedThisWeek = true;

  const sim = simulateDrop(col, qty, price, {limit:col.limit});
  const revenue = sim.sold * price;
  G.cash += revenue;
  G.weekLog.revenue += revenue;
  G.stats.lifetimeSales   += sim.sold;
  G.stats.lifetimeRevenue += revenue;

  applyDropConsequences(col, qty, price, sim, revenue - prodCost);

  const record = {
    name:col.name, week:G.week, product:col.productObj.name, theme:col.theme,
    qty, price, sold:sim.sold, soldOut:sim.soldOut, selloutMin:sim.selloutMin,
    resale:sim.resaleFinal, resaleNow:sim.resaleFinal, quality:col.quality,
    revenue, profit: revenue - prodCost, resellerShare:sim.resellerShare,
    leftover: sim.leftover||0,
  };
  G.drops.push(record);
  G.history.revenue.push({name:col.name, v:revenue});
  if(G.history.revenue.length>10) G.history.revenue.shift();
  G.readyDrop = null;

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

  // why it went this way
  const why = (sim.factors||[]).map(([label, text, tone])=>`
    <div style="display:flex;gap:8px;margin:6px 0;font-size:12.5px;line-height:1.45">
      <span style="flex-shrink:0">${tone==='good'?'<span style="color:var(--green)">▲</span>':tone==='bad'?'<span style="color:var(--red)">▼</span>':'·'}</span>
      <span><b>${label}</b> — <span style="color:var(--dim)">${text}</span></span></div>`).join('');

  const firstTime = G.drops.length===1?
    `<div style="background:var(--panel2);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--dim);margin-bottom:12px">💡 Every drop gets this breakdown. The ▲▼ factors below are the game telling you exactly what the market rewards — learn them and your next drop hits harder.</div>` : '';

  showModal(rec.soldOut? 'SOLD OUT' : (rec.sold/rec.qty>=0.7? 'SOLID NUMBERS':'IT SAT'),
    rec.soldOut? 'good' : (rec.sold/rec.qty>=0.7?'info':'bad'),
    firstTime + head +
    `<div style="margin:14px 0 4px;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em">Who showed up</div>${who}` +
    `<div style="margin:14px 0 2px;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em">Why it went this way</div>${why}`,
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

  ['3','2','1','LIVE'].forEach((c,i)=>T(()=>{ $id('launchStatus').textContent = c==='LIVE'?'⚡ LIVE':('DROPS IN '+c); }, 380*i));

  const pct = Math.round(100*sim.sold/qty);
  const dur = sim.soldOut ? (sim.totalDemand/qty>=2.5? 900:1500) : 2300;
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
  }, 1650);
  T(()=>{
    const st=$id('launchStamp');
    if(sim.soldOut){ st.textContent='SOLD OUT'; st.className='w'; }
    else if(pct>=70){ st.textContent='SOLID'; st.className='e'; }
    else { st.textContent='UNDERSOLD'; st.className='l'; }
  }, 1650+dur+100);
  T(finish, 1650+dur+1200);
  bg.onclick = ()=>{ if(launchDone) launchDone(); };
}
