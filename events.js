/* ============================================================
   STREETWEAR EMPIRE — events.js
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
    title:'COMMUNITY MEETUP', tone:'good',
    cond:()=>G.loyalty>=55,
    text:()=>`Fans are organizing a meetup wearing your pieces. They're asking if the brand will show up.`,
    choices:[
      {label:'Show up with free merch (−$400, ++loyalty)', cond:()=>G.cash>=400, fn:()=>{ G.cash-=400; G.loyalty=clamp(G.loyalty+8,0,100); G.followers+=ri(100,300); return 'Photos everywhere. This is how cults form — the good kind.'; }},
      {label:'Repost and cheer from afar', fn:()=>{ G.loyalty=clamp(G.loyalty+2,0,100); return 'Appreciated, but a missed moment.'; }},
    ],
  },
];

/* Roll an event ~35% of weeks. Returns the event or null. */
function maybeEvent(){
  if(Math.random()>0.35) return null;
  const pool = EVENTS.filter(e=>!e.cond || e.cond());
  return pool.length? pick(pool) : null;
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
