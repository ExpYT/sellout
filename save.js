/* ============================================================
   STREETWEAR EMPIRE — save.js
   localStorage persistence with light migration guards.
   ============================================================ */

"use strict";

const SAVE_KEY = 'streetwear_empire_v1';

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
    return s;
  }catch(e){ return null; }
}

function wipeSave(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
}
