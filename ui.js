/* ============================================================
   SELLOUT — ui.js
   All rendering, navigation, modals, toasts, charts, and boot.
   Loaded last; calls into every other module.
   ============================================================ */

"use strict";

/* ---------------- modal & toast ---------------- */
function showModal(title, tone, html, buttons){
  $id('modalTitle').textContent = title;
  $id('modalTitle').className = tone||'';
  $id('modalBody').innerHTML = html;
  const box = $id('modalBtns'); box.innerHTML='';
  (buttons||[{label:'OK', cls:'primary', fn:null}]).forEach(b=>{
    const btn = document.createElement('button');
    btn.textContent = b.label;
    if(b.cls) btn.classList.add(b.cls);
    btn.onclick = ()=>{ $id('modalBg').classList.remove('open'); if(b.fn) b.fn(); };
    box.appendChild(btn);
  });
  $id('modalBg').classList.add('open');
}

function toast(msg, cls){
  const t = document.createElement('div');
  t.className = 'toast'+(cls?' '+cls:'');
  t.textContent = msg;
  $id('toastBox').appendChild(t);
  setTimeout(()=>t.remove(), 3200);
}

/* ---------------- navigation ---------------- */
function gotoPage(id){
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active', b.dataset.page===id));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active', p.id==='page-'+id));
  renderAll();
}

/* ---------------- master render ---------------- */
function renderAll(){
  if(!G) return;
  renderTopbar();
  renderTut();
  renderDashboard();
  renderStudio();
  renderDrop();
  renderMarketing();
  renderTeam();
  renderResearch();
  renderHistory();
  $id('dropBadge').style.display = G.readyDrop? 'inline-block':'none';
}

/* Tutorial hint bar: contextual guidance for the first 3 weeks. */
function renderTut(){
  const b = $id('tutBanner');
  if(!G || G.week>3 || G.tut.done){ b.style.display='none'; return; }
  let msg;
  if(G.drops.length===0 && !G.readyDrop && !G.droppedThisWeek)
    msg = '👋 <b>Step 1 —</b> Open the <b>Design Studio</b>, name a collection, pick its look and materials, then <b>Finalize</b>. Every choice courts a different crowd (hover options for hints).';
  else if(G.readyDrop)
    msg = '🔥 <b>Step 2 —</b> Build hype in <b>Marketing</b> (the free Social Post is a start), then set <b>quantity & price</b> in the Drop tab. Producing <i>less</i> than demand = sellout, resale heat, prestige. Launch when ready.';
  else if(G.droppedThisWeek)
    msg = '📊 <b>Step 3 —</b> Drop done — read the breakdown to see <i>why</i> it went that way. Then hit <b>Advance Week ▸</b>: bills get paid, hype fades, the scene reacts.';
  else
    msg = '🧵 The loop: <b>Design → Hype → Drop → Advance</b>. Keep cash above zero, keep bots off your drops, and build prestige with quality + scarcity.';
  b.innerHTML = msg + ' <button class="mini-btn" style="margin-left:10px;padding:2px 9px" id="tutDismiss">dismiss</button>';
  b.style.display = 'block';
  $id('tutDismiss').onclick = ()=>{ G.tut.done = 1; saveGame(); renderAll(); };
}

function renderTopbar(){
  $id('brandName').innerHTML = G.brand+' <span>●</span>';
  $id('kWeek').textContent = G.week;
  $id('kCash').textContent = fmt$(G.cash);
  $id('kCash').className = 'k-value '+(G.cash<0?'k-neg':'k-pos');
  $id('kFollowers').textContent = fmtN(G.followers);
  $id('kHype').textContent = Math.round(G.hype);
  $id('kPrestige').textContent = Math.round(G.prestige);
}

/* ---------------- dashboard ---------------- */
function renderDashboard(){
  $id('dProfit').textContent = fmt$(G.lastProfit);
  $id('dProfit').style.color = G.lastProfit>=0? 'var(--green)':'var(--red)';
  $id('dProfitSub').textContent = `last week · burn ${fmt$(weeklyExpensesEstimate())}/wk`;
  $id('dLifetime').textContent = fmtN(G.stats.lifetimeSales);

  const recent = G.drops.slice(-6).filter(d=>d.soldOut && d.selloutMin!=null);
  $id('dSellout').textContent = recent.length? (Math.round(recent.reduce((a,d)=>a+d.selloutMin,0)/recent.length))+' min' : '—';
  const resales = G.drops.slice(-6);
  $id('dResale').textContent = resales.length? (resales.reduce((a,d)=>a+(d.resaleNow||d.resale)/d.price,0)/resales.length).toFixed(1)+'x' : '—';

  // brand health meters (hover any meter for what feeds it and what it does)
  const meters = [
    ['Prestige',     G.prestige,     'gold', prestigeTier(), 'Earned by high-quality drops that genuinely sell out. Attracts better hires, boosts resale, and defines your legacy.'],
    ['Community Loyalty', G.loyalty, 'green', '', 'Built by purchase limits, giveaways and treating fans well. Loyal fans buy every drop — it is a demand floor. Feeding bots destroys it.'],
    ['Reputation',   G.reputation,   '', '', 'General standing. Public flops, refund waves and scandals hurt it; it quietly scales all demand.'],
    ['Customer Satisfaction', G.satisfaction, 'green', '', 'Driven by quality vs price, packaging and shipping. Satisfied customers grow your followers every week.'],
    ['Hype',         G.hype,         'red', 'fades weekly — feed it', 'Amplifies this week\'s reach. Decays ~28%/week, so build it the same week you drop.'],
  ];
  $id('brandMeters').innerHTML = meters.map(([n,v,cls,sub,tip])=>`
    <div class="meter-row" title="${tip}">
      <div class="m-head"><span>${n}${sub?` <span style="color:var(--dim)">· ${sub}</span>`:''}</span><b>${Math.round(v)}</b></div>
      <div class="meter ${cls}"><div style="width:${clamp(v,0,100)}%"></div></div>
    </div>`).join('');
  $id('diffLabel').textContent = diff().name;

  // brand identity: DNA roots + traits earned through behaviour
  const traits = brandPersonality();
  $id('identityBox').innerHTML = `
    <div class="sub-stat">Founded as a <b style="color:var(--txt)">${dna().name}</b> brand</div>
    <div style="margin:10px 0 6px;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em">The scene knows you as</div>
    <div class="big-stat" style="font-size:19px;color:var(--accent)">${traits.join(' · ')}</div>
    <div class="sub-stat" style="margin-top:8px">Computed from your last 6 drops — identity follows behaviour, not intentions.</div>`;

  // lifetime records
  const D = G.drops;
  const by = f => D.length? D.reduce((a,b)=>f(b)>f(a)?b:a) : null;
  const mostProfit = by(d=>d.profit);
  const worst      = D.length? D.reduce((a,b)=>b.profit<a.profit?b:a) : null;
  const fastest    = D.filter(d=>d.soldOut&&d.selloutMin!=null).sort((a,b)=>a.selloutMin-b.selloutMin)[0];
  const topRated   = D.filter(d=>d.review).sort((a,b)=>b.review.overall-a.review.overall)[0];
  const topResale  = by(d=>d.resaleNow||d.resale);
  const avgRating  = D.filter(d=>d.review).length? Math.round(D.filter(d=>d.review).reduce((a,d)=>a+d.review.overall,0)/D.filter(d=>d.review).length) : null;
  const recRow = (l,v)=> v? `<div class="row-item" style="padding:8px 12px"><div class="ri-main"><div class="ri-sub">${l}</div><div class="ri-title" style="font-size:12.5px">${v}</div></div></div>` : '';
  $id('recordsBox').innerHTML =
    recRow('Lifetime revenue / profit', `${fmt$(G.stats.lifetimeRevenue)} / <span style="color:${(G.stats.lifetimeProfit||0)>=0?'var(--green)':'var(--red)'}">${fmt$(G.stats.lifetimeProfit||0)}</span> · ${fmtN(G.stats.lifetimeSales)} units`) +
    recRow('Most profitable collection', mostProfit && `${mostProfit.name} — ${fmt$(mostProfit.profit)}`) +
    recRow('Fastest sellout', fastest && `${fastest.name} — ${fastest.selloutMin<1? Math.round(fastest.selloutMin*60)+'s' : fastest.selloutMin+' min'}`) +
    recRow('Highest rated', topRated && `${topRated.name} — ${topRated.review.overall}/100`) +
    recRow('Average critic rating', avgRating && avgRating+'/100') +
    recRow('Highest resale', topResale && (topResale.resaleNow||topResale.resale)>topResale.price? `${topResale.name} — ${fmt$(topResale.resaleNow||topResale.resale)}` : null) +
    recRow('Best marketing campaign', G.stats.bestCampaign && `${G.stats.bestCampaign.name} — +${G.stats.bestCampaign.gain} hype (wk ${G.stats.bestCampaign.week})`) +
    recRow('Largest loss', worst && worst.profit<0? `${worst.name} — ${fmt$(worst.profit)}` : null) ||
    '<div class="sub-stat">Records are written by drops. Go make some.</div>';

  // milestones
  const earned = MILESTONES.filter(m=>G.milestones[m.id]);
  const upcoming = MILESTONES.filter(m=>!G.milestones[m.id]).slice(0,3);
  $id('milestonesBox').innerHTML =
    (earned.map(m=>`<div class="row-item" style="padding:8px 12px;border-color:rgba(251,191,36,.35)"><div class="ri-main"><div class="ri-title" style="font-size:12.5px;color:var(--gold)">🏆 ${m.name}</div></div><div class="ri-side" style="color:var(--dim);font-weight:400">wk ${G.milestones[m.id]}</div></div>`).join('')) +
    (upcoming.map(m=>`<div class="row-item" style="padding:8px 12px;opacity:.45"><div class="ri-main"><div class="ri-title" style="font-size:12.5px">🔒 ${m.name}</div></div></div>`).join('')) ||
    '<div class="sub-stat">Everything is still ahead of you.</div>';

  // competitor leaderboard — every rival has a recognisable identity
  const all = [...G.competitors.map(c=>({name:c.name, f:c.followers, prev:c.prevFollowers||c.followers, style:c.style||'', me:false})),
               {name:G.brand, f:G.followers, prev:G.history.followers[G.history.followers.length-2]||G.followers, style:brandPersonality().join(' · ').toLowerCase(), me:true}]
    .sort((a,b)=>b.f-a.f);
  $id('competitorList').innerHTML = all.map((c,i)=>{
    const mv = c.f-c.prev;
    const arrow = mv>50? '<span style="color:var(--green)">▲</span>' : mv<-50? '<span style="color:var(--red)">▼</span>' : '<span style="color:var(--dim)">·</span>';
    return `<div class="row-item" style="${c.me?'border-color:var(--accent)':''}">
      <div class="ri-main"><div class="ri-title" style="${c.me?'color:var(--accent)':''}">${i+1}. ${c.name}</div>
        <div class="ri-sub">${c.style}</div></div>
      <div class="ri-side">${arrow} ${fmtN(c.f)}</div>
    </div>`;
  }).join('');

  // location / HQ upgrade
  const loc = currentLocation();
  const next = LOCATIONS[G.location+1];
  $id('locationBox').innerHTML = `
    <div class="big-stat" style="font-size:20px">${loc.name}</div>
    <div class="sub-stat">${loc.blurb}</div>
    <div class="sub-stat" style="margin-top:6px">Production cap <b>${fmtN(productionCap())}</b>/drop · rent ${fmt$(loc.rent)}/wk</div>
    ${next? `<button class="btn secondary full" id="upgradeLocBtn" style="margin-top:12px" ${G.cash<next.price?'disabled':''}>
      Upgrade to ${next.name} — ${fmt$(next.price)} <small style="display:block;font-weight:400;color:var(--dim)">cap ${fmtN(next.cap)}/drop · rent ${fmt$(next.rent)}/wk</small></button>`
    : `<div class="sub-stat" style="margin-top:10px;color:var(--gold)">Top of the ladder. The empire is built.</div>`}`;
  const upBtn = $id('upgradeLocBtn');
  if(upBtn) upBtn.onclick = ()=>{
    G.cash -= next.price; G.location++;
    feedPost('sys', null, `${G.brand} moves into a ${next.name.toLowerCase()}. Levelled up.`);
    toast('Welcome to the '+next.name, 'gold');
    saveGame(); renderAll();
  };

  // feed — customers, press outlets, and system notes each read differently
  $id('feedList').innerHTML = G.feed.map(p=>
    p.cls==='sys'? `<div class="post sys">${p.text}</div>`
    : p.cls==='press'? `<div class="post press"><span class="handle" style="color:var(--gold)">${p.handle}</span> <span style="font-style:italic">${p.text}</span></div>`
    : `<div class="post ${p.cls}"><span class="handle">${p.handle}</span> ${p.text}</div>`
  ).join('') || '<div class="post sys">Quiet for now. Drop something.</div>';

  drawLineChart('chartFollowers', G.history.followers);
  drawBarChart('chartRevenue', G.history.revenue);
  drawLineChart('chartProfit', G.history.weekly && G.history.weekly.length>1? G.history.weekly : null);
}

/* ---------------- design studio ---------------- */

// Turn a segment-modifier object into a readable "who likes this" hint.
const SEG_SHORT = {collector:'Collectors', street:'Street', casual:'Casuals', enthusiast:'Fashion', luxury:'Luxury'};
function modDesc(o){
  if(!o || !o.mod) return '';
  const parts = Object.entries(o.mod).map(([k,v])=> SEG_SHORT[k]+(v>0?' +':' −'));
  return parts.join(' · ');
}

function optRow(elId, list, cur, onPick, lockFn, descFn){
  const box = $id(elId); box.innerHTML='';
  list.forEach(o=>{
    const locked = lockFn? lockFn(o) : false;
    const b = document.createElement('button');
    b.className = 'opt'+(cur===(o.id||o)?' sel':'')+(locked?' locked':'');
    const sub = descFn? descFn(o) : modDesc(o);
    b.innerHTML = (o.name||o) + (locked? ' 🔒':'') + (sub? `<small>${sub}</small>`:'');
    b.title = locked? 'Locked — requires research' : (sub||'');
    if(!locked) b.onclick = ()=>{ onPick(o.id||o); saveGame(); renderStudio(); };
    box.appendChild(b);
  });
}

function renderStudio(){
  if(!G.design) G.design = blankDesign();
  const d = G.design;
  const nameInput = $id('colName');
  if(document.activeElement!==nameInput) nameInput.value = d.name;
  nameInput.oninput = ()=>{ d.name = nameInput.value; };

  optRow('optProduct', PRODUCTS, d.product, v=>d.product=v, null,
    p=>`cost ~${fmt$(p.cost)} · retail ${fmt$(p.retail)}${p.id===G.trend.product?' · 🔥 trending':''}`);
  optRow('optTheme',   THEMES,   d.theme,   v=>d.theme=v, null,
    t=> t===G.trend.theme? '🔥 trending — street & fashion crowds bite'
      : (G.drops.length && G.drops[G.drops.length-1].theme===t? '⚠ same as last drop — reads stale':''));
  optRow('optPalette', PALETTES, d.palette, v=>d.palette=v);
  optRow('optLogo',    LOGOS,    d.logo,    v=>d.logo=v);
  optRow('optGraphics',GRAPHICS, d.graphics,v=>d.graphics=v, null,
    g=>`quality ${g.q>=0.5?'++':'+'}${g.costMult?' · cost +'+Math.round((g.costMult-1)*100)+'%':''}${modDesc(g)?' · '+modDesc(g):''}`);
  optRow('optFit',     FITS,     d.fit,     v=>d.fit=v);
  optRow('optMaterial',MATERIALS,d.material,v=>d.material=v, m=>m.research && !G.research[m.research],
    m=>`quality +${m.q} · cost ×${m.costMult} — better fabric = satisfaction & resale`);
  optRow('optPackaging',PACKAGING,d.packaging,v=>d.packaging=v, null,
    p=>`+${fmt$(p.costAdd)}/unit${p.sat?' · satisfaction +'+p.sat:''}${modDesc(p)?' · '+modDesc(p):''}`);

  const prod = PRODUCTS.find(p=>p.id===d.product);
  const unit = designUnitCost(d);
  const qHint = designQualityBase(d);
  const trendNote = (d.theme===G.trend.theme? '<span style="color:var(--green)">theme is trending ✓</span>' : '')+
                    (d.product===G.trend.product? ' <span style="color:var(--green)">product is trending ✓</span>':'');
  $id('designPreview').innerHTML = `
    <div class="row-item"><div class="ri-main"><div class="ri-title">${d.name||'UNTITLED'} — ${prod.name}</div>
      <div class="ri-sub">${d.theme} · ${PALETTES.find(p=>p.id===d.palette).name} · ${FITS.find(f=>f.id===d.fit).name} fit</div></div></div>
    <div class="sub-stat" style="margin-top:8px">Unit cost <b style="color:var(--txt)">${fmt$(unit)}</b> · suggested retail ${fmt$(prod.retail)}</div>
    <div class="sub-stat">Expected quality <b style="color:var(--gold)">~${qHint.toFixed(1)}/10</b>${empBonus('designer')>0? ' (designer boosted)':''}</div>
    <div class="sub-stat">${trendNote||'&nbsp;'}</div>`;
  $id('finalizeBtn').onclick = finalizeDesign;
  $id('finalizeBtn').disabled = !!G.readyDrop;
  $id('finalizeBtn').textContent = G.readyDrop? 'A drop is already staged — launch or rework it' : 'Finalize Design → Drop Setup';

  $id('trendReport').innerHTML = `
    <div class="row-item"><div class="ri-main"><div class="ri-title">🔥 "${G.trend.theme}"</div><div class="ri-sub">the theme the scene wants right now</div></div></div>
    <div class="row-item"><div class="ri-main"><div class="ri-title">📈 ${PRODUCTS.find(p=>p.id===G.trend.product).name}s</div><div class="ri-sub">the product category having a moment</div></div></div>
    <div class="sub-stat" style="margin-top:8px">Chasing trends excites streetwear fans & casuals. Ignoring them and building your own lane earns prestige slower — but repeat themes bore the fashion crowd either way.</div>`;
}

/* ---------------- drop config ---------------- */
function renderDrop(){
  const col = G.readyDrop;
  if(!col){
    $id('dropConfig').innerHTML = '<div class="sub-stat">No collection staged. Finalize a design in the Studio first.</div>';
    $id('dropForecast').innerHTML = '<div class="sub-stat">—</div>';
    $id('launchBtn').style.display='none';
    return;
  }
  $id('launchBtn').style.display='';
  const cap = productionCap();
  const qtyBtns = QTY_OPTIONS.map(q=>{
    const over = q>cap;
    return `<button class="opt ${col.qty===q?'sel':''} ${over?'locked':''}" data-qty="${q}">${fmtN(q)}${over?' 🔒':''}<small>${over?'needs bigger HQ':fmt$(Math.round(col.unitCost*q*(G.eventMods.nextDropCost||1)))+' to produce'}</small></button>`;
  }).join('');
  const limits = [['none','No Limit'],['soft','2 Per Customer'],['strict','1 Per Customer']]
    .map(([id,n])=>`<button class="opt ${col.limit===id?'sel':''}" data-limit="${id}">${n}</button>`).join('');

  $id('dropConfig').innerHTML = `
    <div class="row-item"><div class="ri-main"><div class="ri-title">${col.name}</div>
      <div class="ri-sub">${col.productObj.name} · ${col.theme} · quality ${col.quality}/10</div></div>
      <button class="mini-btn" id="reworkBtn">Rework</button></div>
    <div class="field"><label>Production Quantity</label><div class="opt-row">${qtyBtns}</div></div>
    <div class="field"><label>Retail Price</label>
      <div class="range-row"><input type="range" id="priceRange" min="${Math.round(col.productObj.retail*0.6)}" max="${Math.round(col.productObj.retail*2.5)}" step="1" value="${col.price}">
      <span class="range-val" id="priceVal">${fmt$(col.price)}</span></div>
      <div class="sub-stat">suggested retail ${fmt$(col.productObj.retail)} · margin ${fmt$(col.price-col.unitCost)}/unit</div></div>
    <div class="field"><label>Purchase Limits (anti-reseller)</label><div class="opt-row">${limits}</div>
      <div class="sub-stat">Limits cut reseller buying and build loyalty — at the cost of a little raw demand.</div></div>`;

  document.querySelectorAll('[data-qty]').forEach(b=>{
    if(!b.classList.contains('locked')) b.onclick = ()=>{ col.qty=+b.dataset.qty; saveGame(); renderDrop(); };
  });
  document.querySelectorAll('[data-limit]').forEach(b=>{
    b.onclick = ()=>{ col.limit=b.dataset.limit; saveGame(); renderDrop(); };
  });
  const pr = $id('priceRange');
  pr.oninput = ()=>{ col.price=+pr.value; $id('priceVal').textContent=fmt$(col.price); renderForecast(col); };
  $id('reworkBtn').onclick = ()=>{ G.design = {...col}; G.readyDrop=null; saveGame(); gotoPage('studio'); };

  renderForecast(col);
  const prodCost = Math.round(col.unitCost*col.qty*(G.eventMods.nextDropCost||1));
  $id('launchBtn').disabled = G.droppedThisWeek || G.cash<prodCost || col.qty>cap;
  $id('launchBtn').textContent = G.droppedThisWeek? '✓ DROPPED THIS WEEK — ADVANCE TO NEXT'
    : G.cash<prodCost? 'CANNOT AFFORD PRODUCTION' : '🚀 LAUNCH DROP';
  $id('launchBtn').onclick = launchDrop;
}

function renderForecast(col){
  // fuzzy demand read — never exact, sharper with a marketing manager
  const reach = weeklyReach();
  let est = 0;
  SEGMENTS.forEach(s=>{ est += reach*s.share*segmentInterest(s, col, col.price); });
  const noise = 0.35 - empBonus('marketing')*0.12;
  const lo = Math.round(est*(1-noise)), hi = Math.round(est*(1+noise));
  const prodCost = Math.round(col.unitCost*col.qty*(G.eventMods.nextDropCost||1));
  $id('dropForecast').innerHTML = `
    <div class="meter-row"><div class="m-head"><span>Current hype</span><b>${Math.round(G.hype)}/100</b></div>
      <div class="meter red"><div style="width:${G.hype}%"></div></div></div>
    <div class="sub-stat" style="margin:10px 0">Estimated genuine interest: <b style="color:var(--txt)">${fmtN(lo)}–${fmtN(hi)} buyers</b><br>
    (resellers pile in on top if resale margin looks juicy)</div>
    <div class="row-item"><div class="ri-main"><div class="ri-title">Production run</div></div><div class="ri-side">${fmtN(col.qty)} units · ${fmt$(prodCost)}</div></div>
    <div class="row-item"><div class="ri-main"><div class="ri-title">If it sells out</div></div><div class="ri-side" style="color:var(--green)">${fmt$(col.qty*col.price-prodCost)} profit</div></div>
    <div class="sub-stat">Undersupply → sellout speed, resale heat, prestige. Oversupply → dead stock and a bruised reputation. Pick your poison.</div>`;
}

/* ---------------- marketing ---------------- */
function renderMarketing(){
  $id('mktChannels').innerHTML='';
  CHANNELS.forEach(ch=>{
    const locked = ch.research && !G.research[ch.research];
    const used = G.usedChannels[ch.id];
    const b = document.createElement('div');
    b.className='row-item';
    b.innerHTML = `<div class="ri-main"><div class="ri-title">${ch.name}${locked?' 🔒':''}</div>
      <div class="ri-sub">${locked? 'Requires research: Community CRM' : ch.desc}</div></div>
      <button class="mini-btn" ${locked||used||G.cash<ch.cost?'disabled':''}>${used?'✓ Done':(ch.cost?fmt$(ch.cost):'Free')}</button>`;
    if(!locked && !used) b.querySelector('button').onclick = ()=>runChannel(ch.id);
    $id('mktChannels').appendChild(b);
  });
  $id('mktStats').innerHTML = `
    <div class="meter-row"><div class="m-head"><span>Hype</span><b>${Math.round(G.hype)}/100</b></div>
      <div class="meter red"><div style="width:${G.hype}%"></div></div></div>
    <div class="sub-stat" style="margin-bottom:12px">Hype decays ~28% every week. Build it the week you drop.</div>
    <div class="row-item"><div class="ri-main"><div class="ri-title">Weekly reach</div><div class="ri-sub">followers amplified by hype${G.research.website?' + Website v2':''}</div></div>
      <div class="ri-side">${fmtN(weeklyReach())} people</div></div>
    <div class="row-item"><div class="ri-main"><div class="ri-title">Followers</div></div><div class="ri-side">${fmtN(G.followers)}</div></div>`;
}

/* ---------------- team ---------------- */
function renderTeam(){
  const box = $id('teamList'); box.innerHTML='';
  ROLES.forEach(r=>{
    const e = G.employees[r.id];
    const div = document.createElement('div');
    div.className='row-item';
    if(e){
      const hap = Math.round(e.happiness||75);
      const hapCol = hap>=60?'var(--green)':hap>=30?'var(--gold)':'var(--red)';
      div.innerHTML = `<div class="ri-main"><div class="ri-title">${r.emoji} ${e.name} — ${r.name} ${'★'.repeat(e.skill)}${'☆'.repeat(5-e.skill)}</div>
        <div class="ri-sub">${r.desc} · happiness <b style="color:${hapCol}">${hap}%</b></div></div>
        <div class="ri-side">${fmt$(e.wage)}/wk</div>
        <button class="mini-btn" data-fire="${r.id}">Let go</button>`;
      div.querySelector('[data-fire]').onclick = ()=>fire(r.id);
    } else {
      div.innerHTML = `<div class="ri-main"><div class="ri-title">${r.emoji} ${r.name} — vacant</div>
        <div class="ri-sub">${r.desc}</div></div>
        <button class="mini-btn" data-hire="${r.id}">View candidates</button>`;
      div.querySelector('[data-hire]').onclick = ()=>{
        const cands = genCandidates(r);
        showModal('CANDIDATES — '+r.name.toUpperCase(), 'info',
          'Better talent shows up as your prestige grows.',
          cands.map(c=>({label:`${c.name} ${'★'.repeat(c.skill)}${'☆'.repeat(5-c.skill)} — ${fmt$(c.wage)}/wk`, fn:()=>hire(r.id, c)}))
            .concat([{label:'Nobody today', fn:null}]));
      };
    }
    box.appendChild(div);
  });
}

/* ---------------- research ---------------- */
function renderResearch(){
  const box = $id('researchList'); box.innerHTML='';
  RESEARCH.forEach(r=>{
    const done = G.research[r.id];
    const active = G.activeResearch && G.activeResearch.id===r.id;
    const div = document.createElement('div');
    div.className='row-item';
    div.innerHTML = `<div class="ri-main"><div class="ri-title">${done?'✅ ':''}${r.name}${active? ` <span style="color:var(--cyan)">— ${G.activeResearch.weeksLeft} wk left</span>`:''}</div>
      <div class="ri-sub">${r.desc}</div></div>
      ${done? '<div class="ri-side" style="color:var(--green)">Complete</div>'
        : active? '<div class="ri-side" style="color:var(--cyan)">In progress</div>'
        : `<button class="mini-btn" ${G.activeResearch||G.cash<r.cost?'disabled':''}>${fmt$(r.cost)} · ${r.weeks} wks</button>`}`;
    const btn = div.querySelector('button');
    if(btn) btn.onclick = ()=>startResearch(r.id);
    box.appendChild(div);
  });
}

/* ---------------- history ---------------- */
let histFilter = 'all';
function renderHistory(){
  const box = $id('historyList');
  document.querySelectorAll('#histFilters .opt').forEach(b=>{
    b.classList.toggle('sel', b.dataset.hf===histFilter);
    b.onclick = ()=>{ histFilter = b.dataset.hf; renderHistory(); };
  });
  if(!G.drops.length){ box.innerHTML = '<div class="sub-stat">No drops yet. History is written one release at a time.</div>'; return; }
  let list = G.drops.slice().reverse();
  if(histFilter==='oldest') list = G.drops.slice();
  else if(histFilter==='soldout') list = list.filter(d=>d.soldOut);
  else if(histFilter==='flop') list = list.filter(d=>!d.soldOut);
  else if(histFilter==='profit') list = list.slice().sort((a,b)=>b.profit-a.profit);
  else if(histFilter==='rating') list = list.filter(d=>d.review).sort((a,b)=>b.review.overall-a.review.overall);
  else if(histFilter==='resale') list = list.slice().sort((a,b)=>(b.resaleNow||b.resale)-(a.resaleNow||a.resale));
  else if(histFilter==='fastest') list = list.filter(d=>d.soldOut&&d.selloutMin!=null).sort((a,b)=>a.selloutMin-b.selloutMin);
  if(!list.length){ box.innerHTML = '<div class="sub-stat">Nothing matches this filter yet.</div>'; return; }
  box.innerHTML = list.map(d=>{
    const rn = d.resaleNow||d.resale;
    const mv = d.resalePrev!==undefined? rn-d.resalePrev : 0;
    const arrow = mv>0? '<span style="color:var(--green)">▲</span>' : mv<0? '<span style="color:var(--red)">▼</span>' : '·';
    const stars = d.review? `<span style="color:var(--gold)">${'★'.repeat(d.review.stars)}</span> ${d.review.overall}/100 · ` : '';
    return `<div class="row-item" data-arch="${G.drops.indexOf(d)}" style="cursor:pointer"><div class="ri-main">
      <div class="ri-title">${d.name} <span style="color:var(--dim);font-weight:400">wk${d.week} · ${d.product}</span></div>
      <div class="ri-sub">${stars}${fmtN(d.sold)}/${fmtN(d.qty)} sold ${d.soldOut? `· sold out in ${d.selloutMin<1? Math.round(d.selloutMin*60)+'s':d.selloutMin+' min'}`:''} · profit <span style="color:${d.profit>=0?'var(--green)':'var(--red)'}">${fmt$(d.profit)}</span></div></div>
      <div class="ri-side">${arrow} resale ${fmt$(rn)}<br><span style="color:var(--dim);font-weight:400">retail was ${fmt$(d.price)}</span></div></div>`;
  }).join('');
  box.querySelectorAll('[data-arch]').forEach(el=>{
    el.onclick = ()=>showArchiveCard(G.drops[+el.dataset.arch]);
  });
}

/* Full archive card for one collection — its permanent place in brand history. */
function showArchiveCard(d){
  const rv = d.review;
  const line = (l,v)=> v!==undefined && v!==null? `<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:4px 0;border-bottom:1px solid var(--line)"><span style="color:var(--dim)">${l}</span><b>${v}</b></div>` : '';
  showModal(d.name, 'info',
    (rv? `<div style="background:var(--panel2);border-radius:8px;padding:12px 14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--gold);font-size:16px;letter-spacing:2px">${'★'.repeat(rv.stars)}${'☆'.repeat(5-rv.stars)}</span>
        <b style="font-size:18px">${rv.overall}/100</b></div>
      <div style="font-size:12.5px;color:var(--dim);margin-top:6px;font-style:italic">“${rv.text}”</div>
      <div style="font-size:11px;color:var(--dim);margin-top:8px">${Object.entries(rv.scores).map(([k,v])=>`${k} <b style="color:var(--txt)">${v}</b>`).join(' · ')}</div></div>` : '') +
    line('Released', 'Week '+d.week) +
    line('Product', d.product+' · '+d.theme) +
    line('Produced / Sold', fmtN(d.qty)+' / '+fmtN(d.sold)) +
    line('Sellout time', d.soldOut? (d.selloutMin<1? Math.round(d.selloutMin*60)+' seconds' : d.selloutMin+' minutes') : 'did not sell out') +
    line('Revenue / Profit', fmt$(d.revenue)+' / '+fmt$(d.profit)) +
    line('Retail / Resale now', fmt$(d.price)+' / '+fmt$(d.resaleNow||d.resale)) +
    line('Quality', d.quality+'/10') +
    line('Launch hype', d.hypeAt!==undefined? d.hypeAt+'/100' : null) +
    line('Best crowd', d.bestSeg) +
    line('Weakest crowd', d.worstSeg) +
    line('Biggest success', d.topGood) +
    line('Biggest weakness', d.topBad),
    [{label:'CLOSE', cls:'primary', fn:null}]);
}

/* ---------------- charts (canvas, no libraries) ---------------- */
function setupCanvas(id){
  const c = $id(id);
  const w = c.clientWidth||400, h = c.clientHeight||150;
  c.width = w*2; c.height = h*2;              // crisp on retina
  const x = c.getContext('2d');
  x.scale(2,2); x.clearRect(0,0,w,h);
  return {x,w,h};
}

function drawLineChart(id, data){
  const {x,w,h} = setupCanvas(id);
  if(!data || data.length<2){ x.fillStyle='#9a9a9a'; x.font='12px Space Grotesk'; x.fillText('More data next week…', 10, h/2); return; }
  const min = Math.min(...data), max = Math.max(...data), span = Math.max(1, max-min);
  const px = i => 6 + (w-12)*i/(data.length-1);
  const py = v => h-14 - (h-26)*(v-min)/span;
  // area fill
  x.beginPath(); x.moveTo(px(0), h-8);
  data.forEach((v,i)=>x.lineTo(px(i), py(v)));
  x.lineTo(px(data.length-1), h-8); x.closePath();
  const grad = x.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,'rgba(255,43,43,.35)'); grad.addColorStop(1,'rgba(255,43,43,0)');
  x.fillStyle = grad; x.fill();
  // line
  x.beginPath();
  data.forEach((v,i)=> i? x.lineTo(px(i),py(v)) : x.moveTo(px(i),py(v)));
  x.strokeStyle = '#ff2b2b'; x.lineWidth = 2; x.stroke();
  // labels
  x.fillStyle = '#9a9a9a'; x.font = '11px Space Grotesk';
  x.fillText(fmtN(max), 6, 12);
  x.fillText(fmtN(data[data.length-1])+' now', w-84, py(data[data.length-1])-6);
}

function drawBarChart(id, items){
  const {x,w,h} = setupCanvas(id);
  if(!items || !items.length){ x.fillStyle='#9a9a9a'; x.font='12px Space Grotesk'; x.fillText('Launch a drop to see revenue here.', 10, h/2); return; }
  const max = Math.max(...items.map(i=>i.v), 1);
  const bw = Math.min(54, (w-20)/items.length - 8);
  items.forEach((it,i)=>{
    const bx = 10 + i*(bw+8);
    const bh = (h-34)*it.v/max;
    x.fillStyle = '#ffd24a';
    x.fillRect(bx, h-20-bh, bw, bh);
    x.fillStyle = '#9a9a9a'; x.font='9px Space Grotesk';
    x.fillText(it.name.slice(0,8), bx, h-8);
  });
  x.fillStyle='#9a9a9a'; x.font='11px Space Grotesk';
  x.fillText(fmt$(max), 10, 12);
}

/* ---------------- boot ---------------- */
function startUI(){
  $id('startScreen').style.display='none';
  ['topbar','nav','main'].forEach(id=>$id(id).style.display='');
  $id('topbar').style.display='flex';
  $id('nav').style.display='flex';
  renderAll();
}

document.querySelectorAll('#nav button').forEach(b=>{
  b.onclick = ()=>gotoPage(b.dataset.page);
});
$id('advanceBtn').onclick = ()=>advanceWeek();
$id('skipBtn').onclick = ()=>skipWeeks(4);

/* Brand DNA selection on the start screen */
let chosenDna = 'vintage';
(function(){
  const row = $id('dnaRow');
  DNAS.forEach(d=>{
    const b = document.createElement('button');
    b.className = 'opt'+(d.id===chosenDna?' sel':'');
    b.textContent = d.name;
    b.onclick = ()=>{
      chosenDna = d.id;
      row.querySelectorAll('.opt').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel');
      $id('dnaBlurb').textContent = d.blurb;
    };
    row.appendChild(b);
  });
  $id('dnaBlurb').textContent = DNAS.find(d=>d.id===chosenDna).blurb;
})();

/* difficulty selection on the start screen */
let chosenDiff = 'normal';
(function(){
  const row = $id('diffRow');
  Object.entries(DIFFS).forEach(([id,d])=>{
    const b = document.createElement('button');
    b.className = 'opt'+(id===chosenDiff?' sel':'');
    b.textContent = d.name;
    b.onclick = ()=>{
      chosenDiff = id;
      row.querySelectorAll('.opt').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel');
      $id('diffBlurb').textContent = d.blurb + ` Start with ${fmt$(d.cash)}.`;
    };
    row.appendChild(b);
  });
  $id('diffBlurb').textContent = DIFFS.normal.blurb + ` Start with ${fmt$(DIFFS.normal.cash)}.`;
})();

/* settings & save QoL */
$id('resetBtn').onclick = ()=>showModal('RESET SAVE?', 'bad',
  'This deletes the brand permanently. Export first if you want a backup.',
  [{label:'Keep playing', cls:'primary', fn:null},
   {label:'Delete everything', fn:()=>{ wipeSave(); location.reload(); }}]);
$id('exportBtn').onclick = ()=>exportSave();
$id('importBtn').onclick = ()=>$id('importFile').click();
$id('importFile').onchange = e=>{ if(e.target.files[0]) importSave(e.target.files[0]); };

$id('startBtn').onclick = ()=>{
  const name = $id('startName').value.trim().toUpperCase() || randBrandName();
  newGame(name, chosenDiff, chosenDna);
  saveGame();
  startUI();
  showModal('WELCOME TO THE GAME', 'info',
    `You run <b>${name}</b> from your bedroom.<br><br>
     The loop: <b>Design</b> a collection → build <b>Hype</b> → configure and <b>Launch</b> a limited drop → <b>Advance the week</b> and read the fallout.<br><br>
     What matters: sell out (undersupply beats oversupply), keep quality worth the price, protect real fans from resellers, and keep cash above zero. Prestige — earned by quality + scarcity — is the long game.`,
    [{label:'LET\'S WORK', cls:'primary', fn:null}]);
};
$id('continueBtn').onclick = ()=>{
  G = loadGame();
  if(G) startUI();
};
$id('startName').addEventListener('keydown', e=>{ if(e.key==='Enter') $id('startBtn').click(); });

// offer continue if a save exists
if(loadGame()) $id('continueBtn').style.display='inline-block';
