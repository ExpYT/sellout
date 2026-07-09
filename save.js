/* ============================================================
   SELLOUT — save.js
   localStorage persistence with light migration guards.
   ============================================================ */

"use strict";

const SAVE_KEY = 'sellout_v1';
// one-time migration from the pre-rebrand save key
try{
  if(!localStorage.getItem(SAVE_KEY) && localStorage.getItem('streetwear_empire_v1')){
    localStorage.setItem(SAVE_KEY, localStorage.getItem('streetwear_empire_v1'));
    localStorage.removeItem('streetwear_empire_v1');
  }
}catch(e){}

function saveGame(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(G)); }catch(e){}
}

function loadGame(){
  try{
    const j = localStorage.getItem(SAVE_KEY);
    if(!j) return null;
    const s = JSON.parse(j);
    // migration guards for older saves
    s.eventMods    = s.eventMods    || {};
    s.usedChannels = s.usedChannels || {};
    s.research     = s.research     || {};
    s.history      = s.history      || {followers:[s.followers||150], revenue:[]};
    s.stats        = s.stats        || {lifetimeSales:0, lifetimeRevenue:0, bestResale:0};
    s.difficulty   = s.difficulty   || 'normal';
    s.tut          = s.tut          || {};
    s.botStreak    = s.botStreak    || 0;
    // v1.2 migrations
    s.dna          = s.dna          || 'vintage';
    s.milestones   = s.milestones   || {};
    s.history.weekly = s.history.weekly || [];
    if(s.stats.lifetimeProfit===undefined) s.stats.lifetimeProfit = 0;
    // v1.6 migrations — community & culture
    s.lore = s.lore || [];
    s.pollWish = s.pollWish || null;
    s.lastCommunity = s.lastCommunity || 0;
    s.communityDoneWk = s.communityDoneWk || 0;
    s.history.loyalty = s.history.loyalty || [];
    // v1.5 migrations — the fashion calendar
    s.compCal = s.compCal || [];
    s.schedule = s.schedule || null;
    s.annualAwards = s.annualAwards || {};
    // v1.4 migrations — design vault & collections
    if(s.slots===undefined) s.slots = 3;
    s.vault = s.vault || [];
    s.colSel = s.colSel || [];
    s.colName = s.colName || '';
    s.colRevealed = s.colRevealed || false;
    s.burnout = s.burnout || 0;
    s.designsThisWeek = s.designsThisWeek || 0;
    s.awards = s.awards || {};
    if(s.readyDrop && !s.readyDrop.items) s.readyDrop = null;  // pre-vault staged drop can't migrate
    // v1.3 migrations — the living fashion industry
    s.segPrefs    = s.segPrefs    || {};
    s.evolution   = s.evolution   || [];
    s.reinvent    = s.reinvent    || null;
    s.seasonStats = s.seasonStats || {};
    if(!s.trends || !s.trends.length){
      s.trends = TRENDS_DEF.map(t=>({id:t.id, pop:ri(25,70), vel:rand(-1.5,1.5), prev:50, hist:[], reason:'', reasonWk:0}));
    }
    // old randomly-named competitors become the fixed personas, keeping their numbers
    if(s.competitors && s.competitors.length && !s.competitors[0].style){
      s.competitors = s.competitors.map((c,i)=>({
        ...PERSONAS[i%PERSONAS.length],
        name: PERSONAS[i%PERSONAS.length].name,
        style: PERSONAS[i%PERSONAS.length].style,
        followers: c.followers, prestige: c.prestige, quality: c.quality,
      })).map(({moves,lines,f,p,...keep})=>keep);
    }
    return s;
  }catch(e){ return null; }
}

function wipeSave(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
}

/* Export the save as a downloadable JSON file. */
function exportSave(){
  if(!G) return;
  const blob = new Blob([JSON.stringify(G)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = G.brand.toLowerCase().replace(/[^a-z0-9]+/g,'_')+'_week'+G.week+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Save exported');
}

/* Import a save from a chosen JSON file, then reload into it. */
function importSave(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const s = JSON.parse(reader.result);
      if(!s || !s.brand || s.week===undefined) throw new Error('bad');
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      location.reload();
    }catch(e){ toast('Not a valid save file'); }
  };
  reader.readAsText(file);
}
