/* ============================================================
   STREETWEAR EMPIRE — game.js
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
  };
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
  G.hype = clamp(G.hype*0.72 - 1, 0, 100);
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

  // 8. Trend rotates sometimes — chase it or set your own course
  if(Math.random()<0.4){
    G.trend = {theme: pick(THEMES), product: pick(PRODUCTS).id};
    feedPost('sys', null, `Trend report: "${G.trend.theme}" energy and ${PRODUCTS.find(p=>p.id===G.trend.product).name.toLowerCase()}s are having a moment.`);
  }

  // 9. Reset weekly counters + record history for the analytics charts
  G.week++;
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

  // 11. Random events need decisions
  const ev = maybeEvent();

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
