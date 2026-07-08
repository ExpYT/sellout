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

  const quality = clamp(designQualityBase(d) + rand(-0.7, 0.9), 1, 10);
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
  };
  G.drops.push(record);
  G.history.revenue.push({name:col.name, v:revenue});
  if(G.history.revenue.length>10) G.history.revenue.shift();
  G.readyDrop = null;

  playLaunch(col, qty, sim, ()=> showDropResults(record, sim, prodCost));
  saveGame();
}

/* Consequences ripple through every brand stat. */
function applyDropConsequences(col, qty, price, sim, profit){
  const reactions = [];

  if(sim.soldOut){
    const heat = sim.totalDemand/qty;
    G.hype = clamp(G.hype + clamp(4 + heat*3, 4, 18), 0, 100);
    const fGain = Math.round(qty * clamp(heat*0.35, 0.2, 1.6) * (0.9+G.prestige/150));
    G.followers += fGain;
    sim.followerGain = fGain;
    // prestige comes from quality + genuine scarcity, not volume
    if(col.quality>=6.5 && heat>1.4) G.prestige = clamp(G.prestige + rand(1,2.4), 0, 100);
    reactions.push([pick(HANDLES), sim.selloutMin<=2 ? `sold out in ${Math.round(sim.selloutMin*60)} seconds. i didn't even get to checkout` : `gone in ${sim.selloutMin} minutes. ${G.brand} does not miss`]);
  } else {
    const rate = sim.sold/qty;
    G.hype = clamp(G.hype - (rate<0.5 ? 12 : 5), 0, 100);
    G.reputation = clamp(G.reputation - (rate<0.5?4:1.5), 0, 100);
    sim.followerGain = Math.round(sim.sold*0.15);
    G.followers += sim.followerGain;
    reactions.push([pick(HANDLES), rate<0.5 ? `${col.name} still fully stocked… ${G.brand} fell off?` : `decent numbers but no sellout. the aura is fading`]);
  }

  // Quality drives satisfaction & word of mouth
  const satShift = (col.quality-5.5)*2.4 + (col.packagingObj.sat||0)*0.5 + empBonus('warehouse')*3;
  G.satisfaction = clamp(G.satisfaction + satShift, 0, 100);
  if(col.quality>=7.5) reactions.push([pick(HANDLES), `quality on the ${col.productObj.name.toLowerCase()} is insane. ${MATERIALS.find(m=>m.id===col.material).name} was worth it`]);
  if(col.quality<=3.5) reactions.push([pick(HANDLES), `washed it once and the print cracked 💀 do better ${G.brand}`]);

  // Reseller share moves loyalty — real fans hate losing to bots
  if(sim.resellerShare>0.3){
    G.loyalty = clamp(G.loyalty - 8, 0, 100);
    reactions.push([pick(HANDLES), `bots took the whole ${col.name} drop. actual fans got NOTHING`]);
  } else if(sim.soldOut && col.limit!=='none'){
    G.loyalty = clamp(G.loyalty + 4, 0, 100);
    reactions.push([pick(HANDLES), `purchase limits meant real ones actually copped. respect, ${G.brand}`]);
  }
  if(sim.resaleFinal > price*2 && sim.soldOut) reactions.push([pick(HANDLES), `resale already at ${fmt$(sim.resaleFinal)}. should've bought two`]);
  if(col.staleTheme) reactions.push([pick(HANDLES), `another ${col.theme} collection? we've seen this one already`]);

  reactions.forEach(r=>feedPost(sim.soldOut?'hot':'', r[0], r[1]));
  sim.reactions = reactions;
}

/* Results modal after the launch animation. */
function showDropResults(rec, sim, prodCost){
  const lines = [
    `<span class="stat-line">Revenue <b class="g">${fmt$(rec.revenue)}</b> · production ${fmt$(prodCost)} · net <b class="${rec.profit>=0?'g':'r'}">${fmt$(rec.profit)}</b></span>`,
    `<span class="stat-line">Sold <b>${fmtN(rec.sold)}/${fmtN(rec.qty)}</b>${rec.soldOut? ` · sold out in <b>${rec.selloutMin<1? Math.round(rec.selloutMin*60)+'s' : rec.selloutMin+' min'}</b>`:''}</span>`,
    `<span class="stat-line">Quality <b class="y">${rec.quality}/10</b> · resale settled at <b class="y">${fmt$(rec.resale)}</b> (${(rec.resale/rec.price).toFixed(1)}x)</span>`,
    `<span class="stat-line">+<b class="g">${fmtN(sim.followerGain||0)}</b> followers · resellers took <b>${Math.round(sim.resellerShare*100)}%</b> of stock</span>`,
  ];
  showModal(rec.soldOut? 'SOLD OUT' : (rec.sold/rec.qty>=0.7? 'SOLID NUMBERS':'IT SAT'),
    rec.soldOut? 'good' : (rec.sold/rec.qty>=0.7?'info':'bad'),
    lines.join('<br>'), [{label:'CONTINUE', cls:'primary', fn:()=>{ renderAll(); }}]);
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
