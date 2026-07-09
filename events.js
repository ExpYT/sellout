/* ============================================================
   SELLOUT — events.js
   Random weekly events. Every event is a decision, and most
   trade cash against community trust or momentum.
   ============================================================ */

"use strict";

const EVENTS = [
  {
    title:'INFLUENCER SPOTTED', tone:'good',
    text:()=>`A big style account posted a fit featuring your hoodie — unpaid, unprompted. The comments are asking where it's from.`,
    choices:[
      {label:'Repost it everywhere (+hype)', fn:()=>{ G.hype=clamp(G.hype+ri(8,15),0,100); return 'The internet does the marketing for you this week.'; }},
      {label:'Send them the full collection (−$400, +hype, +loyalty)', cond:()=>G.cash>=400, fn:()=>{ G.cash-=400; G.hype=clamp(G.hype+ri(10,18),0,100); G.loyalty=clamp(G.loyalty+3,0,100); return 'They post an unboxing. The community loves the gesture.'; }},
    ],
  },
  {
    title:'SHIPMENT DELAYED', tone:'bad',
    text:()=>`Your blanks are stuck in a port somewhere. The factory quotes an "expedite fee" to jump the queue.`,
    choices:[
      {label:'Pay to expedite (−$900)', cond:()=>G.cash>=900, fn:()=>{ G.cash-=900; return 'Money solves it. Stock lands on time.'; }},
      {label:'Wait it out (next drop costs +25%)', fn:()=>{ G.eventMods.nextDropCost=1.25; return 'Rush production later will cost you.'; }},
    ],
  },
  {
    title:'WEBSITE STRAIN', tone:'bad',
    cond:()=>!G.research.website && G.followers>2000,
    text:()=>`Traffic is outgrowing your store's cheap hosting. Dev friends warn the next big drop could crash it.`,
    choices:[
      {label:'Emergency patch (−$600)', cond:()=>G.cash>=600, fn:()=>{ G.cash-=600; return 'Duct tape, but it holds.'; }},
      {label:'Risk it', fn:()=>{ if(Math.random()<0.5){ G.eventMods.demandMult=0.7; G.satisfaction=clamp(G.satisfaction-6,0,100); return 'It crashed mid-drop. Carts died. People are furious.'; } return 'It held. This time.'; }},
    ],
  },
  {
    title:'MATERIAL SHORTAGE', tone:'bad',
    text:()=>`A supply squeeze hits your fabric supplier. Prices spike across the industry.`,
    choices:[
      {label:'Absorb it (next drop costs +20%)', fn:()=>{ G.eventMods.nextDropCost=1.2; return 'Margins take the hit, customers never know.'; }},
      {label:'Quietly use cheaper blanks (risk quality backlash)', fn:()=>{ if(Math.random()<0.5){ G.satisfaction=clamp(G.satisfaction-8,0,100); G.reputation=clamp(G.reputation-5,0,100); return 'People noticed immediately. "Fell off" is trending under your name.'; } return 'Nobody clocked the difference. You got away with it.'; }},
    ],
  },
  {
    title:'COMPETITOR COPIES YOU', tone:'bad',
    text:()=>{ const c=pick(G.competitors); G._evComp=c.name; return `${c.name} just released a piece that looks suspiciously like your last drop. Their version is cheaper.`; },
    choices:[
      {label:'Call it out publicly', fn:()=>{ if(Math.random()<0.55){ G.hype=clamp(G.hype+8,0,100); G.loyalty=clamp(G.loyalty+4,0,100); return 'The side-by-side goes viral in your favour. The scene rallies behind the original.'; } G.reputation=clamp(G.reputation-4,0,100); return 'It reads as petty. Their followers pile into your comments.'; }},
      {label:'Say nothing, keep building', fn:()=>{ G.prestige=clamp(G.prestige+1,0,100); return 'Real ones know who did it first. Quiet confidence ages well.'; }},
    ],
  },
  {
    title:'GIVEAWAY MOMENT', tone:'good',
    text:()=>`The community is buzzing. A well-run giveaway right now could turn casual followers into believers.`,
    choices:[
      {label:'Run a giveaway (−$500, +loyalty, +followers)', cond:()=>G.cash>=500, fn:()=>{ G.cash-=500; G.loyalty=clamp(G.loyalty+6,0,100); const f=ri(150,450); G.followers+=f; return `+${fmtN(f)} followers and a warmer community.`; }},
      {label:'Save the money', fn:()=>'The moment passes.'},
    ],
  },
  {
    title:'VIRAL ARCHIVE POST', tone:'good',
    cond:()=>G.drops.length>=3,
    text:()=>`A "brand history" thread about ${G.brand} is going viral. New people are discovering your old drops.`,
    choices:[
      {label:'Let it cook', fn:()=>{ const f=ri(200,700); G.followers+=f; G.hype=clamp(G.hype+6,0,100); return `+${fmtN(f)} followers from the archive deep-dive.`; }},
    ],
  },
  {
    title:'FACTORY QUALITY ISSUE', tone:'bad',
    cond:()=>G.drops.length>=1,
    text:()=>`A batch from your last drop shipped with defects. Customers are posting photos.`,
    choices:[
      {label:'Full refunds + replacements (−$1,200)', cond:()=>G.cash>=1200, fn:()=>{ G.cash-=1200; G.satisfaction=clamp(G.satisfaction+5,0,100); G.loyalty=clamp(G.loyalty+5,0,100); G.reputation=clamp(G.reputation+3,0,100); return 'Expensive, but the customer-service screenshots go viral for the right reasons.'; }},
      {label:'Ignore it', fn:()=>{ G.satisfaction=clamp(G.satisfaction-10,0,100); G.reputation=clamp(G.reputation-6,0,100); return 'The posts keep circulating. Trust erodes.'; }},
    ],
  },
  {
    title:'MAGAZINE FEATURE', tone:'good',
    cond:()=>G.prestige>=10,
    text:()=>`An online culture magazine wants to profile ${G.brand} — but their "editorial partnership" costs money.`,
    choices:[
      {label:'Pay for the feature (−$800, +prestige, +followers)', cond:()=>G.cash>=800, fn:()=>{ G.cash-=800; G.prestige=clamp(G.prestige+2,0,100); const f=ri(200,500); G.followers+=f; return `The piece runs. +${fmtN(f)} followers and a prestige bump.`; }},
      {label:'Real coverage should be free', fn:()=>{ if(Math.random()<0.3){ G.prestige=clamp(G.prestige+1,0,100); return 'They run a short piece anyway. Integrity noted.'; } return 'No feature. The moment passes.'; }},
    ],
  },
  {
    title:'INTERN POSTS EARLY', tone:'bad',
    text:()=>`Someone posted next drop's designs a week early. The surprise is gone — but people are talking.`,
    choices:[
      {label:'Lean into it (+hype now, −demand at launch)', fn:()=>{ G.hype=clamp(G.hype+8,0,100); G.eventMods.demandMult=0.85; return 'The leak becomes the teaser. Some heat now, less mystery later.'; }},
      {label:'Delete everything and deny', fn:()=>{ if(Math.random()<0.5){ return 'Scrubbed fast enough. Crisis averted.'; } G.reputation=clamp(G.reputation-3,0,100); return 'Screenshots never die. The denial made it worse.'; }},
    ],
  },
  {
    title:'RENT REVIEW', tone:'bad',
    cond:()=>G.location>=1,
    text:()=>`The landlord "reviews" your rent. Pay a lump settlement or eat higher costs on your next production run.`,
    choices:[
      {label:'Settle now (−$1,000)', cond:()=>G.cash>=1000, fn:()=>{ G.cash-=1000; return 'Paid. Back to work.'; }},
      {label:'Fight it (next drop costs +15%)', fn:()=>{ G.eventMods.nextDropCost=1.15; return 'You win eventually — but the distraction costs you at the factory.'; }},
    ],
  },
  {
    title:'CUSTOMS HOLD', tone:'bad',
    cond:()=>G.drops.length>=2,
    text:()=>`A shipment is flagged at customs. Paperwork or patience.`,
    choices:[
      {label:'Hire a broker (−$700)', cond:()=>G.cash>=700, fn:()=>{ G.cash-=700; return 'Released in 48 hours. Money well spent.'; }},
      {label:'Wait (−satisfaction)', fn:()=>{ G.satisfaction=clamp(G.satisfaction-6,0,100); return 'Orders ship late. The DMs are not kind.'; }},
    ],
  },
  {
    title:'FABRIC SWATCH SCORE', tone:'good',
    text:()=>`Your supplier offers a one-time deal on premium deadstock fabric.`,
    choices:[
      {label:'Buy the lot (−$600, next drop quality +1)', cond:()=>G.cash>=600, fn:()=>{ G.cash-=600; G.eventMods.qualityBonus=1; return 'The fabric is beautiful. Your next collection will feel it.'; }},
      {label:'Pass', fn:()=>'Someone else takes the lot.'},
    ],
  },
  {
    title:'COLLECTION LEAKED', tone:'bad',
    cond:()=>(G.vault||[]).length>0,
    text:()=>{ const v=pick(G.vault); G._leak=v; return `Clear photos of "${v.name}" just hit DropChat — a vault design nobody was supposed to see. The threads are exploding.`; },
    choices:[
      {label:'Ignore it — mystery is currency', fn:()=>{ G.hype=clamp(G.hype+3,0,100); return 'You say nothing. Speculation does the marketing; the mystique holds.'; }},
      {label:'Confirm it (+hype, −exclusivity aura)', fn:()=>{ G.hype=clamp(G.hype+8,0,100); G.prestige=clamp(G.prestige-1,0,100); return 'Confirmed. Hype spikes — but confirmed leaks make the brand feel less untouchable.'; }},
      {label:'Deny everything', fn:()=>{ if(Math.random()<0.5){ return 'The denial holds. The leak is dismissed as a fake.'; } G.reputation=clamp(G.reputation-4,0,100); return 'Receipts surface within hours. The denial ages terribly.'; }},
      {label:'Lean in — tease more yourself', fn:()=>{ G.hype=clamp(G.hype+12,0,100); G.eventMods.demandMult=0.9; return 'You post the rest of the shoot. Huge heat now — but launch day loses its surprise.'; }},
    ],
  },
  {
    title:'COMMUNITY MEETUP', tone:'good',
    cond:()=>G.loyalty>=55,
    text:()=>`Fans are organizing a meetup wearing your pieces. They're asking if the brand will show up.`,
    choices:[
      {label:'Show up with free merch (−$400, ++loyalty)', cond:()=>G.cash>=400, fn:()=>{ G.cash-=400; G.loyalty=clamp(G.loyalty+8,0,100); G.followers+=ri(100,300); return 'Photos everywhere. This is how cults form — the good kind.'; }},
      {label:'Repost and cheer from afar', fn:()=>{ G.loyalty=clamp(G.loyalty+2,0,100); return 'Appreciated, but a missed moment.'; }},
    ],
  },
];

/* ============ v1.6 COMMUNITY & CULTURE ============
   Fictional platforms, each with a personality; the community
   discusses, memes, remembers and argues — about real events. */
const PLATFORMS = {
  fittalk:'FitTalk', threadline:'Threadline', lookbook:'Lookbook',
  closet:'Closet', dropchat:'DropChat', archive:'Archive', scene:'Scene',
};

function discussionPost(){
  const D = G.drops;
  const pool = [];
  if(D.length){
    const d = pick(D);
    d.buzz = (d.buzz||0)+1;
    pool.push(['threadline', `"${d.name}" ${d.review&&d.review.overall>=70?'deserved every bit of the hype':'discussion thread is heated again'} — ${d.buzz} threads and counting`]);
    pool.push(['closet', `still wearing the week ${d.week} ${d.product.toLowerCase()} weekly. built different`]);
    if(d.resaleNow>d.price*1.5) pool.push(['dropchat', `resale on "${d.name}" is INSANE rn — ${fmt$(d.resaleNow)} and climbing`]);
    if(d.quality>=7) pool.push(['archive', `revisited "${d.name}" — construction holds up. ${G.brand} at their best`]);
    if(!d.soldOut) pool.push(['fittalk', `hot take: "${d.name}" underselling was the market being wrong`]);
  }
  if(G.drops.length>=3){
    pool.push(['fittalk', `ranked every ${G.brand} drop. tier list in replies. prepare to be angry`]);
    pool.push(['lookbook', `shot my whole ${G.brand} collection on film. the ${pick(['grain','light','texture'])} does it justice`]);
    pool.push(['threadline', G.loyalty>=60? `the ${G.brand} community might be the best part of the brand tbh` : `is ${G.brand} losing the plot? genuine question, not hating`]);
  }
  if(G.drops.some(d=>d.priceRatio>1.4)) pool.push(['threadline', `unpopular opinion: ${G.brand} has gotten too commercial. the early drops had soul`]);
  if((G.lore||[]).length && Math.random()<0.5){
    const l = pick(G.lore);
    pool.push(['archive', l.line]);
  }
  if(!pool.length) return;
  const [plat, text] = pick(pool);
  feedPost(Math.random()<0.2?'hot':'', pick(HANDLES), text, PLATFORMS[plat]);
}

function rivalSpat(){
  const lines = [
    `VOID fans calling NOVA buyers "sheep" again. NOVA fans posting their five identical hoodies proudly in response.`,
    `KITSUNE fans doing seam-by-seam comparisons to prove a point nobody asked about. Respect.`,
    `OUTLAW fans crashed an OBSIDIAN pop-up in full skate gear. Security "had no comment".`,
    `PAPER CROWN fans defending the latest trend-chase. Everyone else taking screenshots for later.`,
    `${G.brand} fans and VOID fans arguing about what "exclusive" really means. 400 replies. No winners.`,
    `A "most loyal fanbase" poll has every brand's community brigading it. ${G.brand} currently ${pick(['leading','second','robbed'])}.`,
  ];
  feedPost('', '@scenewatcher', pick(lines), PLATFORMS.scene);
}

/* Weekly community pulse — called from advanceWeek. */
function communityTick(){
  if(Math.random()<0.45) discussionPost();
  if(Math.random()<0.10) rivalSpat();
  // neglect: a community ignored slowly stops trusting
  if(G.week - (G.lastCommunity||0) > 8 && G.loyalty>25){
    G.loyalty = clamp(G.loyalty-1.5, 0, 100);
    if(Math.random()<0.25) feedPost('', pick(HANDLES), `when did ${G.brand} last actually talk to us? feels one-directional lately`, PLATFORMS.threadline);
  }
}

/* Community actions — 1 slot each, one engagement per week. */
const COMMUNITY_ACTIONS = [
  {id:'ama',     name:'Host an AMA',        cost:0,   desc:'Answer everything. Honesty builds trust.'},
  {id:'poll',    name:'Run a Design Poll',  cost:0,   desc:'Ask what they want next. Listening (or ignoring) both say something.'},
  {id:'giveaway',name:'Run a Giveaway',     cost:500, desc:'Free pieces, new faces, warm feelings.'},
  {id:'photo',   name:'Photo Contest',      cost:300, desc:'The community shoots your pieces. Lookbook feasts.'},
];
function doCommunityAction(id){
  const a = COMMUNITY_ACTIONS.find(x=>x.id===id);
  if(!a || G.cash<a.cost) return;
  if(G.communityDoneWk===G.week){ toast('One community moment per week — keep it special'); return; }
  if(!spendSlots(1)) return;
  G.cash -= a.cost; G.weekLog.expenses += a.cost;
  G.communityDoneWk = G.week; G.lastCommunity = G.week;
  if(id==='ama'){
    G.loyalty = clamp(G.loyalty+4,0,100); G.reputation = clamp(G.reputation+2,0,100);
    feedPost('hot', pick(HANDLES), `the ${G.brand} AMA was actually honest?? founder talked ${pick(['failed samples','money','the early days','design regrets'])} openly. respect through the roof`, PLATFORMS.threadline);
    toast('+4 loyalty · +2 reputation — they feel heard');
  } else if(id==='poll'){
    const prod = pick(PRODUCTS); const pal = pick(PALETTES);
    G.pollWish = {product:prod.id, palette:pal.id, week:G.week};
    feedPost('press','SCENE', `${G.brand} polled the community: verdict is ${pal.name.toLowerCase()} ${prod.name.toLowerCase()}s. Will they listen? Watching.`, PLATFORMS.scene);
    toast(`📊 The community wants: ${pal.name} ${prod.name}s. Deliver within 6 weeks for a loyalty payoff — or protect your vision.`, 'gold');
  } else if(id==='giveaway'){
    G.loyalty = clamp(G.loyalty+6,0,100); const f = ri(150,450); G.followers += f;
    feedPost('', pick(HANDLES), `won the ${G.brand} giveaway!!! shaking. day one fan forever now`, PLATFORMS.closet);
    toast(`+6 loyalty · +${fmtN(f)} followers`);
  } else if(id==='photo'){
    G.loyalty = clamp(G.loyalty+4,0,100); G.hype = clamp(G.hype+5,0,100);
    feedPost('hot', pick(HANDLES), `the ${G.brand} photo contest entries are ART. community carrying the lookbook this season`, PLATFORMS.lookbook);
    toast('+4 loyalty · +5 hype — the community made the marketing');
  }
  saveGame(); renderAll();
}

/* Roll an event ~35% of weeks. Brand DNA gently weights which
   stories find you (a skate brand gets more community moments,
   a luxury house gets more press interest).                     */
const EVENT_DNA_BIAS = {
  'GIVEAWAY MOMENT':    ['skate','y2k','outdoor','motorsport'],
  'COMMUNITY MEETUP':   ['skate','y2k','vintage','outdoor'],
  'MAGAZINE FEATURE':   ['luxury','highfash','japanese','minimal'],
  'INFLUENCER SPOTTED': ['y2k','motorsport','tech'],
};
function maybeEvent(){
  if(Math.random()>0.35) return null;
  const pool = [];
  EVENTS.forEach(e=>{
    if(e.cond && !e.cond()) return;
    pool.push(e);
    if((EVENT_DNA_BIAS[e.title]||[]).includes(G.dna)) pool.push(e);  // double weight for on-DNA stories
  });
  return pool.length? pick(pool) : null;
}

/* ---------------- the living culture ----------------
   Weekly press posts: headlines, blogs, rumours, memes.
   The world talks whether you drop or not.             */
function pressPost(){
  const comp = pick(G.competitors);
  const trendProd = PRODUCTS.find(p=>p.id===G.trend.product).name.toLowerCase();
  const lastDrop = G.drops[G.drops.length-1];
  const lines = [
    ['THREADWATCH',  `“${G.trend.theme}” is the look of the season. Every moodboard agrees.`],
    ['THREADWATCH',  `Trend desk: ${trendProd}s are carrying the quarter. Brands are scrambling.`],
    ['RACKED DAILY', `Is ${comp.name} overrated? The comment section is at war.`],
    ['RACKED DAILY', `Power ranking update: ${comp.name} ${pick(['climbs','slips','holds steady'])} this week.`],
    ['FITTALK FORUM',`Thread: “most slept-on brands right now” — ${G.brand} mentioned ${ri(2,40)} times.`],
    ['FITTALK FORUM',`Poll: cop or drop at ${fmt$(ri(60,240))}? The replies are brutal.`],
    ['MEME WATCH',   `“me refreshing the ${G.brand} site at 9:59am” — ${fmtN(ri(4,80))}k likes.`],
    ['RUMOR MILL',   `Insider: a major stockist has been quietly watching ${G.brand}. Nothing confirmed.`],
    ['RUMOR MILL',   `Whispers of a ${comp.name} collab falling apart last minute. Both sides silent.`],
  ];
  if(lastDrop) lines.push(
    ['RACKED DAILY', lastDrop.soldOut? `Recap: ${G.brand}'s “${lastDrop.name}” ${lastDrop.selloutMin<1?'evaporated in seconds':'sold through'} — ${lastDrop.review? lastDrop.review.overall+'/100 from critics':'the scene approves'}.`
                                     : `Recap: ${G.brand}'s “${lastDrop.name}” is still available. In this economy, that's a statement too.`]);
  if(G.prestige>=30){
    const soulmate = {minimal:'KITSUNE', luxury:'OBSIDIAN', highfash:'OBSIDIAN', japanese:'KITSUNE', skate:'OUTLAW', y2k:'PAPER CROWN', motorsport:'OUTLAW', vintage:'NOVA', outdoor:'NOVA', tech:'VOID'}[G.dna]||'NOVA';
    lines.push(['RACKED DAILY', `Blogs keep calling ${G.brand} “the ${pick(['accessible','harder-working','next','thinking person\'s'])} ${soulmate}”. ${soulmate} fans disagree. Loudly.`]);
  }
  const [outlet, text] = pick(lines);
  feedPost('press', outlet, text);
}

function showEvent(ev){
  const choices = ev.choices.filter(c=>!c.cond || c.cond());
  showModal(ev.title, ev.tone==='good'?'good':'bad', ev.text(),
    choices.map(c=>({label:c.label, fn:()=>{
      const out = c.fn();
      saveGame(); renderAll();
      if(out) showModal(ev.title, 'info', out, [{label:'OK', cls:'primary', fn:null}]);
    }})));
}
