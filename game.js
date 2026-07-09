/* ============================================================
   SELLOUT — game.js
   Core state, shared constants, helpers, and the weekly loop.
   Loaded first: everything else hangs off the global G object.
   ============================================================ */

"use strict";

/* ---------------- helpers ---------------- */
const rand  = (a,b)=> a + Math.random()*(b-a);
const ri    = (a,b)=> Math.floor(rand(a, b+1));
const pick  = arr => arr[Math.floor(Math.random()*arr.length)];
const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));
const fmt$  = n => (n<0?'-$':'$') + Math.round(Math.abs(n)).toLocaleString('en-US');
const fmtN  = n => Math.round(n).toLocaleString('en-US');
const $id   = id => document.getElementById(id);

/* ---------------- static data ---------------- */

// Product categories: base unit cost, suggested retail, and which crowd cares.
const PRODUCTS = [
  {id:'tee',      name:'T-Shirt',         cost:6,  retail:38,  appeal:{casual:1.2, street:1.0, collector:0.8, enthusiast:0.9, luxury:0.5}},
  {id:'oversize', name:'Oversized Shirt', cost:9,  retail:48,  appeal:{casual:0.9, street:1.3, collector:0.9, enthusiast:1.1, luxury:0.6}},
  {id:'hoodie',   name:'Hoodie',          cost:19, retail:95,  appeal:{casual:1.0, street:1.2, collector:1.1, enthusiast:1.0, luxury:0.8}},
  {id:'crew',     name:'Crewneck',        cost:15, retail:78,  appeal:{casual:0.9, street:0.9, collector:1.0, enthusiast:1.1, luxury:0.9}},
  {id:'cap',      name:'Cap',             cost:7,  retail:34,  appeal:{casual:1.1, street:1.0, collector:0.7, enthusiast:0.7, luxury:0.5}},
  {id:'acc',      name:'Accessories',     cost:5,  retail:26,  appeal:{casual:1.0, street:0.8, collector:0.9, enthusiast:0.8, luxury:0.7}},
];

const THEMES   = ['Midnight City','Desert Bloom','Static Age','Neo Bloom','Concrete Garden','Analog Youth','First Light','Wildstyle'];
const PALETTES = [
  {id:'mono',   name:'Monochrome',   mod:{luxury:+.2, collector:+.1}},
  {id:'earth',  name:'Earth Tones',  mod:{enthusiast:+.15, luxury:+.1}},
  {id:'neon',   name:'Neon Pop',     mod:{street:+.2, casual:+.1, luxury:-.15}},
  {id:'pastel', name:'Pastel Fade',  mod:{casual:+.2, enthusiast:+.05}},
  {id:'contrast',name:'High Contrast',mod:{street:+.15, collector:+.05}},
];
const LOGOS = [
  {id:'chest', name:'Small Chest',  mod:{collector:+.15, luxury:+.15, casual:-.05}},
  {id:'front', name:'Big Front',    mod:{casual:+.2, street:+.1, luxury:-.2, collector:-.1}},
  {id:'back',  name:'Back Print',   mod:{street:+.15, enthusiast:+.1}},
  {id:'tonal', name:'Tonal Hidden', mod:{luxury:+.25, collector:+.1, casual:-.15}},
];
const GRAPHICS = [
  {id:'minimal', name:'Minimal',       q:+0.4, mod:{luxury:+.15, enthusiast:+.05}},
  {id:'heavy',   name:'Graphic Heavy', q:+0.2, mod:{street:+.2, casual:+.1}},
  {id:'photo',   name:'Photo Print',   q:+0.3, mod:{enthusiast:+.15, collector:+.05}},
  {id:'embro',   name:'Embroidered',   q:+0.8, costMult:1.25, mod:{collector:+.2, luxury:+.2}},
];
const FITS = [
  {id:'regular',  name:'Regular',   mod:{casual:+.1}},
  {id:'oversized',name:'Oversized', mod:{street:+.2, enthusiast:+.05, luxury:-.05}},
  {id:'boxy',     name:'Boxy',      mod:{street:+.15, collector:+.05}},
  {id:'slim',     name:'Slim',      mod:{luxury:+.1, casual:+.05, street:-.1}},
];
const MATERIALS = [
  {id:'basic',  name:'Basic 160gsm',   costMult:1.0,  q:0.0, research:null},
  {id:'mid',    name:'Midweight 220',  costMult:1.35, q:0.9, research:null},
  {id:'heavy',  name:'Heavyweight 300',costMult:1.8,  q:1.7, research:'materials'},
  {id:'organic',name:'Organic Premium',costMult:2.3,  q:2.4, research:'materials'},
];
const PACKAGING = [
  {id:'poly', name:'Poly Mailer', costAdd:0.6, sat:0,  mod:{}},
  {id:'box',  name:'Branded Box', costAdd:2.8, sat:+6, mod:{collector:+.1, luxury:+.15}},
  {id:'eco',  name:'Eco Wrap',    costAdd:1.5, sat:+3, mod:{enthusiast:+.1, casual:+.05}},
];

// HQ ladder — each location caps production per drop and adds weekly rent.
const LOCATIONS = [
  {name:'Bedroom',      cap:250,   rent:0,    price:0,      blurb:'A heat press next to your bed.'},
  {name:'Studio',       cap:1000,  rent:400,  price:12000,  blurb:'Real workspace. Real output.'},
  {name:'Office',       cap:2500,  rent:1100, price:55000,  blurb:'A team can breathe here.'},
  {name:'Warehouse',    cap:5000,  rent:2600, price:160000, blurb:'Pallets. Racking. Scale.'},
  {name:'Headquarters', cap:10000, rent:5500, price:450000, blurb:'The name on the building is yours.'},
];

const QTY_OPTIONS = [100, 250, 500, 1000, 2500, 5000];

// Progress titles shown on the dashboard, driven by prestige.
const PRESTIGE_TIERS = [
  {min:0,  name:'Bedroom Label'},
  {min:15, name:'Local Name'},
  {min:35, name:'City Staple'},
  {min:55, name:'National Player'},
  {min:75, name:'Global Respect'},
  {min:92, name:'Fashion Icon'},
];

const HANDLES = ['@dripcheck','@fitpicdaily','@sole.archive','@copthis','@modline','@waitlisted','@offrack','@stitchwatch','@carted','@lowkeyheat','@qualitycrit','@pressplayfits'];

/* Name generators — used whenever the player leaves a name blank. */
const BRAND_A = ['DEAD','SOUR','PALE','LOUD','GUTTER','HALF','WET','LAST','FAKE','NORTH','GREY','HOLLOW'];
const BRAND_B = ['STOCK','THEORY','MERCY','ARCHIVE','SAINTS','MARKET','CANVAS','WORSHIP','STATIC','MILE','CLUB','YOUTH'];
const COL_A   = ['CHROME','MIDNIGHT','ACID','GHOST','VELVET','STATIC','BURNT','NEON','BROKEN','HOLY','FERAL','GLASS'];
const COL_B   = ['TEARS','RIOT','BLOOM','YOUTH','MIRAGE','SERPENT','ORCHID','VANDAL','HALO','ANTHEM','CURFEW','RAPTURE'];
function randBrandName(){ return pick(BRAND_A)+' '+pick(BRAND_B); }
function randCollectionName(){ return pick(COL_A)+' '+pick(COL_B); }

/* Brand DNA — the founding identity chosen at creation. Gentle nudges,
   never locks: behaviour can evolve the brand anywhere from here.     */
const DNAS = [
  {id:'minimal',   name:'Minimalist',          followers:150, seg:{luxury:.10, enthusiast:.10},              mkt:{teaser:1.25},   blurb:'Clean lines, tonal palettes, quiet confidence.'},
  {id:'luxury',    name:'Luxury',              followers:110, seg:{luxury:.20, collector:.08, casual:-.10},  mkt:{lookbook:1.3},  blurb:'Price is part of the design. Casuals need not apply.'},
  {id:'skate',     name:'Skate',               followers:220, seg:{street:.15, casual:.08, luxury:-.10},     mkt:{tiktok:1.3},    blurb:'Built in car parks and skate shops. Loud and loyal.'},
  {id:'tech',      name:'Techwear',            followers:140, seg:{enthusiast:.15, collector:.10, casual:-.05}, mkt:{teaser:1.2}, blurb:'Straps, zips, function. The future has pockets.'},
  {id:'vintage',   name:'Vintage',             followers:170, seg:{enthusiast:.10, collector:.10},           mkt:{post:1.25},     blurb:'Washed, faded, timeless. Nostalgia as a fabric.'},
  {id:'y2k',       name:'Y2K',                 followers:240, seg:{casual:.12, street:.10, luxury:-.05},     mkt:{tiktok:1.35},   blurb:'Low rises, loud graphics, flip-phone energy.'},
  {id:'japanese',  name:'Japanese Streetwear', followers:130, seg:{collector:.15, enthusiast:.10, luxury:.05, casual:-.05}, mkt:{lookbook:1.25}, blurb:'Heavyweight fabrics, obsessive detail, devoted fans.'},
  {id:'motorsport',name:'Motorsport',          followers:200, seg:{street:.10, casual:.12},                  mkt:{tiktok:1.2},    blurb:'Racing patches, big logos, speed as a lifestyle.'},
  {id:'outdoor',   name:'Outdoor',             followers:180, seg:{enthusiast:.08, casual:.10},              mkt:{post:1.2},      blurb:'Gorpcore. Trail-ready gear that never sees a trail.'},
  {id:'highfash',  name:'High Fashion',        followers:100, seg:{luxury:.25, enthusiast:.12, casual:-.15, street:-.05}, mkt:{lookbook:1.35}, blurb:'Runway sensibilities at street level. Divisive on purpose.'},
];
function dna(){ return DNAS.find(d=>d.id===(G&&G.dna)) || DNAS[4]; }

/* Segment affinity from DNA — blended during a reinvention so the old
   audience fades out while the new one fades in over the transition. */
function dnaSegBonus(segId){
  const cur = dna().seg[segId]||0;
  if(!G.reinvent) return cur;
  const target = (DNAS.find(d=>d.id===G.reinvent.to)||dna()).seg[segId]||0;
  const p = 1 - G.reinvent.weeksLeft / G.reinvent.total;
  return cur*(1-p) + target*p;
}

/* ---------------- reinvention ----------------
   Deliberately shifting identity: slow, public, and divisive. */
function startReinvention(toId){
  const target = DNAS.find(d=>d.id===toId);
  if(!target || toId===G.dna || G.reinvent) return;
  const cost = Math.max(3000, Math.round(G.followers*0.5));
  if(G.cash < cost){ toast('A rebrand campaign costs '+fmt$(cost)); return; }
  G.cash -= cost;
  G.reinvent = {to:toId, weeksLeft:6, total:6};
  logEvolution(`Began reinventing from ${dna().name} toward ${target.name}`);
  feedPost('press','THREADWATCH', `${G.brand} is changing. Recent moves point away from ${dna().name.toLowerCase()} toward ${target.name.toLowerCase()}. Fans are... discussing it.`);
  toast('Reinvention begun — 6 weeks of transition', 'gold');
  saveGame(); renderAll();
}
function tickReinvention(){
  if(!G.reinvent) return;
  G.reinvent.weeksLeft--;
  // change alienates before it attracts
  G.loyalty = clamp(G.loyalty-2, 0, 100);
  if(Math.random()<0.3) feedPost('', pick(HANDLES), pick([
    `not sure how i feel about the new ${G.brand} direction tbh`,
    `the old ${G.brand} would never. and maybe that's the point?`,
    `day-one fan here. watching this rebrand with one eyebrow raised`,
  ]));
  if(G.reinvent.weeksLeft<=0){
    const target = DNAS.find(d=>d.id===G.reinvent.to);
    G.dna = G.reinvent.to;
    G.reinvent = null;
    G.hype = clamp(G.hype+12, 0, 100);
    G.followers += ri(150, 400) + Math.round(G.prestige*4);
    logEvolution(`Completed its reinvention — ${G.brand} completed its reinvention as a ${target.name} brand`);
    feedPost('press','RACKED DAILY', `It's official: ${G.brand} has completed its reinvention as a ${target.name.toLowerCase()} brand. Bold. The new audience is arriving already.`);
    toast('🔥 REINVENTION COMPLETE — you are now a '+target.name+' brand', 'gold');
    checkMilestones();
  }
}

/* Fashion seasons — a 52-week year that reshapes demand and mood.
   prod: per-product demand multipliers · spend: wallet mood ·
   mkt: how well marketing lands this season.                     */
const SEASONS = [
  {id:'spring', name:'Spring',  from:0,  to:9,  spend:1.00, mkt:1.05, prod:{tee:1.10, oversize:1.05, cap:1.05},               blurb:'Fresh starts. Light layers move; energy is high.'},
  {id:'summer', name:'Summer',  from:10, to:19, spend:1.00, mkt:1.00, prod:{tee:1.25, cap:1.20, acc:1.10, hoodie:0.72, crew:0.85}, blurb:'Shirts and caps fly. Nobody buys fleece in a heatwave.'},
  {id:'autumn', name:'Autumn',  from:20, to:29, spend:1.00, mkt:1.00, prod:{hoodie:1.18, crew:1.15, tee:0.92},                blurb:'Layering season begins. Heavier pieces wake up.'},
  {id:'winter', name:'Winter',  from:30, to:41, spend:0.98, mkt:0.95, prod:{hoodie:1.30, crew:1.20, tee:0.78, cap:0.85},      blurb:'Hoodie weather. Cold hands still find checkout buttons.'},
  {id:'holiday',name:'Holiday', from:42, to:51, spend:1.22, mkt:1.15, prod:{hoodie:1.15, crew:1.10, acc:1.20},                blurb:'Everyone is spending — and every brand knows it. Loud market.'},
];
function season(w){
  const yw = ((w||G.week)-1) % 52;
  return SEASONS.find(s=>yw>=s.from && yw<=s.to) || SEASONS[0];
}
function seasonYear(){ return Math.floor((G.week-1)/52)+1; }

/* ============ v1.5 THE FASHION CALENDAR ============
   Recurring yearly events (week-of-year 0..51). Each shapes
   demand, marketing, reviews or opportunity while active.   */
const CAL_EVENTS = [
  {wk:6,  id:'springfw', name:'Spring Fashion Week',  icon:'🌸', type:'fashionweek', blurb:'Show a collection on the big stage — prestige for the brave.'},
  {wk:14, id:'expo',     name:'Design Expo — Minimalist Challenge', icon:'🎨', type:'competition', req:'a minimal-graphics collection', blurb:'Launch a minimal-graphics collection this week to compete.'},
  {wk:19, id:'summerfw', name:'Summer Fashion Week',  icon:'☀️', type:'fashionweek', blurb:'The season\'s loudest runway.'},
  {wk:24, id:'conv',     name:'Streetwear Convention', icon:'🧢', type:'conv', blurb:'The whole culture in one hall — demand and marketing land harder.'},
  {wk:28, id:'indiefair',name:'Independent Designer Fair — Capsule Challenge', icon:'🧵', type:'competition', req:'a 1–2 piece capsule', blurb:'Launch a capsule this week to compete for the fair\'s honours.'},
  {wk:32, id:'autumnfw', name:'Autumn Fashion Week',  icon:'🍂', type:'fashionweek', blurb:'Critics sharpen their pens for the season\'s statements.'},
  {wk:38, id:'forecast', name:'Trend Forecast Release', icon:'🔮', type:'forecast', blurb:'Industry forecasts published — trend predictions are razor-sharp this week.'},
  {wk:44, id:'blackfri', name:'Black Friday',          icon:'🛒', type:'spend', blurb:'Wallets open. Everything sells harder.'},
  {wk:46, id:'mediaweek',name:'Media Review Week',     icon:'📰', type:'media', blurb:'Every outlet reviews everything — great work shines, weak work gets torn apart.'},
  {wk:51, id:'awards',   name:'Year-End Fashion Awards', icon:'🏆', type:'awards', blurb:'The industry crowns its year.'},
];
function yw(w){ return ((w||G.week)-1)%52; }
function calEventAt(weekAbs){ return CAL_EVENTS.find(e=>e.wk===yw(weekAbs)); }
function currentCalEvent(){ return calEventAt(G.week); }
function isAnniversary(){ return G.week>1 && yw(G.week)===0; }

/* Everything coming up, in one sorted list for the calendar page. */
function upcomingItems(horizon){
  const items = [];
  for(let w=G.week+1; w<=G.week+(horizon||16); w++){
    const e = calEventAt(w);
    if(e) items.push({week:w, icon:e.icon, text:e.name});
    if(yw(w)===0) items.push({week:w, icon:'🎂', text:'Brand Anniversary Week'});
  }
  (G.compCal||[]).forEach(c=>{ if(c.week>G.week) items.push({week:c.week, icon:'⚔️', text:c.name+' — planned release'}); });
  if(G.schedule) items.push({week:G.schedule.week, icon:'🚀', text:`Your scheduled launch: "${G.schedule.colName||'Untitled'}"`});
  if(G.activeResearch) items.push({week:G.week+G.activeResearch.weeksLeft, icon:'🧪', text:RESEARCH.find(r=>r.id===G.activeResearch.id).name+' completes'});
  if(G.reinvent) items.push({week:G.week+G.reinvent.weeksLeft, icon:'⟳', text:'Reinvention completes'});
  return items.sort((a,b)=>a.week-b.week);
}

/* Year-End Fashion Awards — the industry crowns its year. Winners
   are permanent history; player wins tag the collection forever.  */
function annualAwards(){
  const year = Math.max(1, Math.ceil(G.week/52));
  const yearDrops = G.drops.filter(d=>d.week > G.week-52);
  const topComp = G.competitors.slice().sort((a,b)=>b.prestige-a.prestige)[0];
  const best = f => yearDrops.filter(d=>f(d)!==null&&f(d)!==undefined).sort((a,b)=>f(b)-f(a))[0];
  const cats = [];
  const tagWin = (rec, cat)=>{ if(rec){ rec.tags=rec.tags||[]; if(!rec.tags.includes('🏆 '+cat)) rec.tags.push('🏆 '+cat); } };

  const boty = G.prestige >= topComp.prestige;
  cats.push(['Brand of the Year', boty? G.brand+' 👑' : topComp.name]);
  if(boty){ G.prestige = clamp(G.prestige+3,0,100); G.followers += ri(500,1500); }

  const coty = best(d=>d.review? d.review.overall:null);
  if(coty && coty.review.overall>=65){ cats.push(['Collection of the Year', `"${coty.name}" (${G.brand})`]); tagWin(coty,'Collection of the Year'); G.prestige=clamp(G.prestige+2,0,100); }
  else cats.push(['Collection of the Year', pick(G.competitors).name+"'s seasonal line"]);

  const caps = best(d=>d.pieces<=2 && d.review? d.review.overall:null);
  if(caps && caps.review.overall>=70){ cats.push(['Best Capsule', `"${caps.name}" (${G.brand})`]); tagWin(caps,'Best Capsule'); }
  const innov = best(d=>d.originality||null);
  if(innov && innov.originality>=7){ cats.push(['Most Innovative', `"${innov.name}" (${G.brand})`]); tagWin(innov,'Most Innovative'); }
  const res = best(d=>d.soldOut? (d.resaleNow||d.resale):null);
  if(res && (res.resaleNow||res.resale)>res.price*1.8){ cats.push(['Highest Resale Collection', `"${res.name}" — ${fmt$(res.resaleNow||res.resale)}`]); tagWin(res,'Highest Resale'); }
  if(G.loyalty>=65) cats.push(['Best Community', G.brand+' 💚']);
  if(G.week<=104 && yearDrops.length>=4) cats.push(['Best New Brand', G.brand]);

  G.annualAwards = G.annualAwards||{};
  G.annualAwards[year] = cats;
  const playerWins = cats.filter(c=>c[1].includes(G.brand)).length;
  logEvolution(`Year ${year} Awards: won ${playerWins} categor${playerWins===1?'y':'ies'}${boty?' including BRAND OF THE YEAR':''}`);
  feedPost('press','THE RECORD', boty? `${G.brand} is officially BRAND OF THE YEAR. The bedroom-to-crown story writes itself.` : `${topComp.name} takes Brand of the Year. ${G.brand} watches, and plans.`);
  showModal('🏆 YEAR-END FASHION AWARDS — YEAR '+year, boty?'good':'info',
    cats.map(([c,w])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:13px"><span style="color:var(--dim)">${c}</span><b style="color:${w.includes(G.brand)?'var(--gold)':'var(--txt)'}">${w}</b></div>`).join(''),
    [{label: playerWins? 'TAKE A BOW':'NEXT YEAR IS OURS', cls:'primary', fn:null}]);
}

/* Monthly industry report — a digest of what the sim actually did. */
function monthlyReport(){
  const t = G.trends||[];
  const riser = t.slice().sort((a,b)=>b.vel-a.vel)[0];
  const faller = t.slice().sort((a,b)=>a.vel-b.vel)[0];
  const moods = [];
  SEGMENTS.forEach(sg=>{ const p=(G.segPrefs||{})[sg.id]; if(!p) return;
    if(p.price>1.15) moods.push(sg.name+' cautious with money');
    else if(p.price<0.85) moods.push(sg.name+' spending freely');
  });
  const comps = G.competitors.slice().sort((a,b)=>(b.followers-(b.prevFollowers||b.followers))-(a.followers-(a.prevFollowers||a.followers)));
  const s = season();
  showModal('📊 INDUSTRY REPORT — WEEK '+G.week, 'info',
    `<div class="stat-line">▲ <b>${trendDef(riser.id).name}</b> rising (${Math.round(riser.pop)}/100, +${riser.vel.toFixed(1)}/wk)<br>`+
    `▼ <b>${trendDef(faller.id).name}</b> cooling (${Math.round(faller.pop)}/100)<br>`+
    `👥 ${moods.length? moods.join(' · ') : 'Customer moods stable across segments'}<br>`+
    `⚔️ <b>${comps[0].name}</b> has the momentum this month${comps[0].followers>G.followers? ' — and more followers than you':''}<br>`+
    `🗓 ${s.name} outlook: ${s.blurb.toLowerCase()}</div>`,
    [{label:'NOTED', cls:'primary', fn:null}]);
}
function logEvolution(text){
  G.evolution = G.evolution||[];
  G.evolution.push({week:G.week, text});
  if(G.evolution.length>40) G.evolution.shift();
}

/* Milestones — permanent trophies. Celebration only, no gameplay bonus. */
const MILESTONES = [
  {id:'sellout1', name:'First Sellout',        cond:()=>G.drops.some(d=>d.soldOut)},
  {id:'fol1k',    name:'1,000 Followers',      cond:()=>G.followers>=1000},
  {id:'fol10k',   name:'10,000 Followers',     cond:()=>G.followers>=10000},
  {id:'fol100k',  name:'100,000 Followers',    cond:()=>G.followers>=100000},
  {id:'sold100',  name:'100 Units Sold',       cond:()=>G.stats.lifetimeSales>=100},
  {id:'sold1k',   name:'1,000 Units Sold',     cond:()=>G.stats.lifetimeSales>=1000},
  {id:'rev100k',  name:'$100k Lifetime Revenue', cond:()=>G.stats.lifetimeRevenue>=100000},
  {id:'rev1m',    name:'$1M Lifetime Revenue', cond:()=>G.stats.lifetimeRevenue>=1000000},
  {id:'viral',    name:'First Viral Moment',   cond:()=>!!G.stats.hadViral},
  {id:'rated90',  name:'A 90+ Rated Collection', cond:()=>G.drops.some(d=>d.review && d.review.overall>=90)},
  {id:'flash',    name:'Sub-60-Second Sellout', cond:()=>G.drops.some(d=>d.soldOut && d.selloutMin<1)},
  {id:'col10',    name:'10 Collections Released', cond:()=>G.drops.length>=10},
  {id:'luxstat',  name:'Luxury Status',        cond:()=>G.prestige>=75},
  {id:'icon',     name:'Fashion Icon',         cond:()=>G.prestige>=92},
  {id:'reinvent', name:'Reinvented the Brand', cond:()=>!!(G.evolution||[]).some(e=>e.text.includes('completed its reinvention'))},
  {id:'setter',   name:'Trendsetter — Fashion Followed YOU', cond:()=>!!G.stats.setTrend},
  {id:'year1',    name:'Survived a Full Year', cond:()=>G.week>=53},
];
function checkMilestones(){
  MILESTONES.forEach(m=>{
    if(!G.milestones[m.id] && m.cond()){
      G.milestones[m.id] = G.week;
      toast('🏆 MILESTONE: '+m.name, 'gold');
      feedPost('press', 'THE RECORD', `${G.brand} hits a milestone: ${m.name}.`);
    }
  });
}

/* Time slots — the week only holds so much work (design 1, marketing 1, drop 2).
   Hiring, research and upgrades are management: they cost money, not time.     */
function slots(){ return G.slots===undefined? 3 : G.slots; }
function spendSlots(n){
  if(slots() < n){ toast('⏳ No time left this week — advance to next week'); return false; }
  G.slots = slots() - n;
  if(G.slots<=0) toast('Week fully used — advance when ready');
  return true;
}

/* Collection awards — permanent honours, replaced only when beaten. */
const AWARDS = [
  {id:'cohesive', name:'Most Cohesive',  val:r=> r.synergy>=80? r.synergy : null,                unit:'/100 synergy'},
  {id:'original', name:'Most Original',  val:r=> (r.originality||0)>=7.5? r.originality : null,  unit:'/10 originality'},
  {id:'capsule',  name:'Best Capsule',   val:r=> r.pieces<=2 && r.review && r.review.overall>=75? r.review.overall : null, unit:'/100'},
  {id:'design',   name:'Best Design',    val:r=> r.review && r.review.scores.design>=8? r.review.scores.design : null, unit:'/10 design'},
  {id:'resale',   name:'Highest Resale', val:r=> r.soldOut && r.resale>r.price*1.8? r.resale : null, unit:'resale'},
];
function checkAwards(rec){
  G.awards = G.awards||{};
  AWARDS.forEach(a=>{
    const v = a.val(rec);
    if(v===null || v===undefined) return;
    const cur = G.awards[a.id];
    if(!cur || v>cur.value){
      G.awards[a.id] = {value:+(+v).toFixed(1), drop:rec.name, week:rec.week};
      toast(`🏅 AWARD: ${a.name} — "${rec.name}"`, 'gold');
      feedPost('press','THE RECORD', `"${rec.name}" takes ${G.brand}'s in-house honour for ${a.name}.`);
    }
  });
}

/* Dynamic brand personality — read from how you actually play.
   Recomputed from the last 6 drops; evolves as behaviour changes. */
function brandPersonality(){
  const D = G.drops.slice(-6);
  if(D.length<2) return ['Emerging'];
  const avg = f => D.reduce((a,d)=>a+f(d),0)/D.length;
  const rate = f => D.filter(f).length/D.length;
  const t = [];
  if(avg(d=>d.qty)<=300 && rate(d=>d.soldOut)>=0.7) t.push('Exclusive');
  if(avg(d=>d.quality)>=7 && avg(d=>d.priceRatio||1)>=1.2) t.push('Premium');
  if(avg(d=>d.priceRatio||1)<=0.95) t.push('Affordable');
  if(avg(d=>d.quality)>=7.3 && !t.includes('Premium')) t.push('Quality Focused');
  if(rate(d=>d.trendHit)>=0.6) t.push('Trend Chaser');
  if(G.loyalty>=65 && rate(d=>d.limitUsed && d.limitUsed!=='none')>=0.5) t.push('Community Driven');
  if(avg(d=>d.hypeAt||0)>=55) t.push('Hype Focused');
  if(new Set(D.map(d=>d.theme)).size>=Math.min(5,D.length)) t.push('Innovative');
  if(G.followers<3000 && G.prestige>=25) t.push('Underground');
  if(avg(d=>d.priceRatio||1)>=1.5 && G.prestige>=40) t.push('Luxury');
  return t.length? t.slice(0,3) : ['Finding Its Voice'];
}

// Difficulty shapes the whole run: starting cash, market appetite, cost pressure, debt tolerance.
const DIFFS = {
  casual:  {name:'Casual',   cash:4500, demand:1.15, cost:0.90, debtLimit:4, blurb:'Forgiving market, cheap rent. Learn the ropes.'},
  normal:  {name:'Normal',   cash:2500, demand:1.00, cost:1.00, debtLimit:3, blurb:'The intended experience.'},
  hardcore:{name:'Hardcore', cash:1500, demand:0.88, cost:1.15, debtLimit:2, blurb:'Thin margins, cold market, fast bankruptcy.'},
};
function diff(){ return DIFFS[(G && G.difficulty)||'normal']; }

/* ---------------- global state ---------------- */
let G = null;

function newGame(brand, difficulty, dnaId){
  difficulty = difficulty || 'normal';
  const D = DNAS.find(d=>d.id===dnaId) || DNAS[4];
  G = {
    brand,
    difficulty,
    dna: D.id,
    week: 1,
    cash: DIFFS[difficulty].cash,
    followers: D.followers,
    hype: 5,             // volatile, decays weekly
    prestige: 2,         // 0–100, hard to earn
    loyalty: 50,         // community loyalty 0–100
    reputation: 50,      // general brand rep 0–100
    satisfaction: 70,    // customer satisfaction 0–100
    location: 0,
    employees: {designer:null, marketing:null, photographer:null, warehouse:null, community:null},
    research: {},        // finished project ids
    activeResearch: null,// {id, weeksLeft}
    design: null,        // collection being designed (studio tab state)
    readyDrop: null,     // finalized collection waiting for launch
    droppedThisWeek: false,
    usedChannels: {},    // marketing channels used this week
    drops: [],           // completed drop records
    competitors: makeCompetitors(),
    feed: [],
    weekLog: {revenue:0, expenses:0},
    lastProfit: 0,
    history: {followers:[150], revenue:[]},
    stats: {lifetimeSales:0, lifetimeRevenue:0, bestResale:0},
    trend: {theme: pick(THEMES), product: pick(PRODUCTS).id},
    pendingEvent: null,
    eventMods: {},       // temporary modifiers set by events
    tut: {},             // tutorial steps already shown
    botStreak: 0,        // consecutive drops lost to resellers
    milestones: {},      // milestone id -> week earned
    slots: 3,            // weekly time slots: design=1, marketing=1, drop=2
    compCal: [],         // v1.5 competitor release calendar
    schedule: null,      // your scheduled launch
    annualAwards: {},    // year -> award results
    vault: [],           // v1.4 design vault — pieces awaiting release
    colSel: [], colName:'', colRevealed:false,
    burnout: 0, designsThisWeek: 0,
    awards: {},          // collection honours
    trends: [],          // living trend engine (filled by initTrends)
    segPrefs: {},        // evolving customer tastes
    evolution: [],       // brand story timeline
    reinvent: null,      // active identity transition
    seasonStats: {},     // per-season revenue/drops aggregates
  };
  initTrends();
  G.history.weekly = [];
  G.history.followers = [D.followers];
  feedPost('sys', null, `${brand} founded in a bedroom. One heat press, ${fmt$(G.cash)}, and a ${D.name.toLowerCase()} vision.`);
  feedPost('press', 'THREADWATCH', `New label alert: ${brand} — ${D.blurb.toLowerCase()}`);
}

/* ---------------- derived values ---------------- */
function currentLocation(){ return LOCATIONS[G.location]; }
function productionCap(){
  let cap = currentLocation().cap;
  if(G.research.manufacturing) cap = Math.round(cap*1.5);
  return cap;
}
function prestigeTier(){
  let t = PRESTIGE_TIERS[0];
  PRESTIGE_TIERS.forEach(p=>{ if(G.prestige>=p.min) t=p; });
  return t.name;
}
function weeklyExpensesEstimate(){
  return currentLocation().rent + totalWages();
}

/* ---------------- feed ---------------- */
function feedPost(cls, handle, text){
  G.feed.unshift({cls, handle, text, week:G.week});
  if(G.feed.length>60) G.feed.pop();
}

/* ---------------- the weekly loop ---------------- */
function advanceWeek(){
  if(!G) return;

  // 1. Pay the bills (difficulty scales cost pressure)
  const rent  = Math.round(currentLocation().rent * diff().cost);
  const wages = Math.round(totalWages() * diff().cost);
  G.cash -= rent + wages;
  G.weekLog.expenses += rent + wages;
  G.lastProfit = G.weekLog.revenue - G.weekLog.expenses;

  // 2. Hype fades, community drifts back toward neutral
  // (a community manager actively rebuilds loyalty every week)
  // decay softened slightly since time slots cap weekly marketing
  G.hype = clamp(G.hype*0.78 - 1, 0, 100);
  G.loyalty = clamp(G.loyalty + (50-G.loyalty)*0.04 + empBonus('community')*2.5, 0, 100);
  G.satisfaction+= (60-G.satisfaction)*0.05;
  G.reputation  += (50-G.reputation)*0.02;

  // 3. Organic follower movement: loyal, satisfied communities grow on their own
  const drift = G.followers * ((G.loyalty-50)/2500 + (G.satisfaction-60)/4000) + G.prestige*1.5;
  G.followers = Math.max(50, Math.round(G.followers + drift));

  // 4. Research ticks
  tickResearch();

  // 5. Team morale & effects
  tickEmployees();

  // 6. Competitors act
  tickCompetitors();

  // 7. Resale market moves on old drops
  tickResaleMarket();

  // 8. The living industry: trends evolve, tastes drift, seasons turn
  const prevSeason = season(G.week);
  tickTrends();
  tickSegPrefs();
  tickReinvention();

  // 8b. The studio breathes: burnout recovers, vault pieces age
  G.designsThisWeek = 0;
  G.burnout = clamp((G.burnout||0) - 6 - empBonus('designer')*2, 0, 100);
  (G.vault||[]).forEach(v=>{
    v.age++;
    if(!v.timeless && v.age>6){
      v.quality = Math.max(1, +(v.quality-0.06).toFixed(2));
      if(v.age===9) feedPost('sys', null, `"${v.name}" has been sitting in the vault for ${v.age} weeks. It's starting to feel dated.`);
    }
    if(v.timeless && v.age===9) feedPost('sys', null, `"${v.name}" has aged beautifully in the vault. A future classic, whenever you're ready.`);
  });
  // micro-trend (theme/product flavour) still rotates underneath
  if(Math.random()<0.4){
    G.trend = {theme: pick(THEMES), product: pick(PRODUCTS).id};
  }
  const newSeason = season(G.week+1);
  if(newSeason.id!==prevSeason.id){
    feedPost('press','TREND DESK', `${newSeason.name} ${newSeason.id==='holiday'?'season':''} begins: ${newSeason.blurb}`);
    toast('🗓 '+newSeason.name+' begins', 'gold');
    logEvolution(`${newSeason.name} of year ${seasonYear()} began`);
  }

  // 9. Reset weekly counters + record history for the analytics charts
  G.week++;
  G.slots = 3;
  G.droppedThisWeek = false;
  G.usedChannels = {};
  G.eventMods = {};
  G.history.followers.push(G.followers);
  if(G.history.followers.length>52) G.history.followers.shift();
  G.history.weekly = G.history.weekly||[];
  G.history.weekly.push(G.lastProfit);
  if(G.history.weekly.length>52) G.history.weekly.shift();
  G.weekLog = {revenue:0, expenses:0};

  // 10. The culture keeps talking whether you drop or not
  if(Math.random()<0.45) pressPost();
  checkMilestones();

  // 10b. The fashion calendar turns
  tickCompCal();
  maybeRumour();
  let bigMoment = false;
  const ce = currentCalEvent();
  if(ce){
    feedPost('press','TREND DESK', `${ce.icon} This week: ${ce.name}. ${ce.blurb}`);
    toast(ce.icon+' '+ce.name, 'gold');
    if(ce.type==='awards'){ annualAwards(); bigMoment = true; }
  }
  const nextFW = CAL_EVENTS.find(e=>e.type==='fashionweek' && (e.wk-yw(G.week)+52)%52===2);
  if(nextFW) feedPost('press','RUMOR MILL', `Brands are preparing for ${nextFW.name} — two weeks out. Ateliers are working nights.`);
  if(isAnniversary()){
    G.loyalty = clamp(G.loyalty+5,0,100);
    feedPost('press','THE RECORD', `🎂 ${G.brand} turns ${Math.floor((G.week-1)/52)}. The community celebrates a brand that made it.`);
    logEvolution('Celebrated a brand anniversary');
  }
  // scheduled launch arrives?
  if(!bigMoment && G.schedule && G.week>=G.schedule.week){ if(executeSchedule()) bigMoment = true; }
  else if(G.schedule){
    // planned campaign drumbeat while waiting
    G.cash -= 200; G.weekLog.expenses += 200;
    G.hype = clamp(G.hype+3, 0, 100);
    if(Math.random()<0.5) feedPost('', pick(HANDLES), `the "${G.schedule.colName}" teasers have me checking ${G.brand}'s page daily`);
  }
  // monthly digest (when nothing bigger owns the screen)
  const ev = bigMoment? null : maybeEvent();
  if(!bigMoment && !ev && G.week>4 && (G.week-1)%4===0) monthlyReport();

  saveGame();
  renderAll();

  // 11. Bankruptcy check — debt tolerance depends on difficulty
  if(G.cash < 0){
    G.debtWeeks = (G.debtWeeks||0)+1;
    if(G.debtWeeks >= diff().debtLimit){ gameOver(); return; }
    toast(`IN THE RED — week ${G.debtWeeks} of ${diff().debtLimit} before the bank calls`, 'gold');
  } else G.debtWeeks = 0;

  if(ev) showEvent(ev);
}

/* Fast-forward up to n weeks; stops early if an event, drop-ready state
   or bankruptcy needs the player's eyes.                                */
function skipWeeks(n){
  for(let i=0; i<n; i++){
    advanceWeek();
    if(!G) return;
    if($id('modalBg').classList.contains('open')) return;  // event or game over wants a decision
  }
  toast(n+' weeks pass. The scene moves on.');
}

function gameOver(){
  showModal('THE BANK CALLS TIME', 'bad',
    `Three weeks in the red. The lights go off in the ${currentLocation().name.toLowerCase()}, and ${G.brand} is folded.<br><br>`+
    `<span class="stat-line">You lasted <b>${G.week}</b> weeks · <b>${fmtN(G.stats.lifetimeSales)}</b> units sold · <b>${fmt$(G.stats.lifetimeRevenue)}</b> lifetime revenue · peak <b>${fmtN(Math.max(...G.history.followers))}</b> followers</span>`,
    [{label:'START A NEW BRAND', cls:'primary', fn:()=>{ wipeSave(); location.reload(); }}]);
}
