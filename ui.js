/* ============================================================
   STREETWEAR EMPIRE — ui.js
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
  renderDashboard();
  renderStudio();
  renderDrop();
  renderMarketing();
  renderTeam();
  renderResearch();
  renderHistory();
  $id('dropBadge').style.display = G.readyDrop? 'inline-block':'none';
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

  // brand health meters
  const meters = [
    ['Prestige',     G.prestige,     'gold', prestigeTier()],
    ['Community Loyalty', G.loyalty, 'green', ''],
    ['Reputation',   G.reputation,   '', ''],
    ['Customer Satisfaction', G.satisfaction, 'green', ''],
    ['Hype',         G.hype,         'red', 'fades weekly — feed it'],
  ];
  $id('brandMeters').innerHTML = meters.map(([n,v,cls,sub])=>`
    <div class="meter-row">
      <div class="m-head"><span>${n}${sub?` <span style="color:var(--dim)">· ${sub}</span>`:''}</span><b>${Math.round(v)}</b></div>
      <div class="meter ${cls}"><div style="width:${clamp(v,0,100)}%"></div></div>
    </div>`).join('');

  // competitor leaderboard (you included)
  const all = [...G.competitors.map(c=>({name:c.name, f:c.followers, me:false})), {name:G.brand, f:G.followers, me:true}]
    .sort((a,b)=>b.f-a.f);
  $id('competitorList').innerHTML = all.map((c,i)=>`
    <div class="row-item" style="${c.me?'border-color:var(--accent)':''}">
      <div class="ri-main"><div class="ri-title" style="${c.me?'color:var(--accent)':''}">${i+1}. ${c.name}</div></div>
      <div class="ri-side">${fmtN(c.f)} followers</div>
    </div>`).join('');

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

  // feed
  $id('feedList').innerHTML = G.feed.map(p=>
    p.cls==='sys'? `<div class="post sys">${p.text}</div>`
    : `<div class="post ${p.cls}"><span class="handle">${p.handle}</span> ${p.text}</div>`
  ).join('') || '<div class="post sys">Quiet for now. Drop something.</div>';

  drawLineChart('chartFollowers', G.history.followers);
  drawBarChart('chartRevenue', G.history.revenue);
}

/* ---------------- design studio ---------------- */
function optRow(elId, list, cur, onPick, lockFn){
  const box = $id(elId); box.innerHTML='';
  list.forEach(o=>{
    const locked = lockFn? lockFn(o) : false;
    const b = document.createElement('button');
    b.className = 'opt'+(cur===(o.id||o)?' sel':'')+(locked?' locked':'');
    b.innerHTML = (o.name||o) + (locked? ' 🔒':'');
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

  optRow('optProduct', PRODUCTS, d.product, v=>d.product=v);
  optRow('optTheme',   THEMES,   d.theme,   v=>d.theme=v);
  optRow('optPalette', PALETTES, d.palette, v=>d.palette=v);
  optRow('optLogo',    LOGOS,    d.logo,    v=>d.logo=v);
  optRow('optGraphics',GRAPHICS, d.graphics,v=>d.graphics=v);
  optRow('optFit',     FITS,     d.fit,     v=>d.fit=v);
  optRow('optMaterial',MATERIALS,d.material,v=>d.material=v, m=>m.research && !G.research[m.research]);
  optRow('optPackaging',PACKAGING,d.packaging,v=>d.packaging=v);

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
function renderHistory(){
  const box = $id('historyList');
  if(!G.drops.length){ box.innerHTML = '<div class="sub-stat">No drops yet. History is written one release at a time.</div>'; return; }
  box.innerHTML = G.drops.slice().reverse().map(d=>{
    const rn = d.resaleNow||d.resale;
    const mv = d.resalePrev!==undefined? rn-d.resalePrev : 0;
    const arrow = mv>0? '<span style="color:var(--green)">▲</span>' : mv<0? '<span style="color:var(--red)">▼</span>' : '·';
    return `<div class="row-item"><div class="ri-main">
      <div class="ri-title">${d.name} <span style="color:var(--dim);font-weight:400">wk${d.week} · ${d.product}</span></div>
      <div class="ri-sub">${fmtN(d.sold)}/${fmtN(d.qty)} sold ${d.soldOut? `· sold out in ${d.selloutMin<1? Math.round(d.selloutMin*60)+'s':d.selloutMin+' min'}`:''} · quality ${d.quality}/10 · profit <span style="color:${d.profit>=0?'var(--green)':'var(--red)'}">${fmt$(d.profit)}</span></div></div>
      <div class="ri-side">${arrow} resale ${fmt$(rn)}<br><span style="color:var(--dim);font-weight:400">retail was ${fmt$(d.price)}</span></div></div>`;
  }).join('');
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
  if(!data || data.length<2){ x.fillStyle='#8b94ab'; x.font='12px Inter'; x.fillText('More data next week…', 10, h/2); return; }
  const min = Math.min(...data), max = Math.max(...data), span = Math.max(1, max-min);
  const px = i => 6 + (w-12)*i/(data.length-1);
  const py = v => h-14 - (h-26)*(v-min)/span;
  // area fill
  x.beginPath(); x.moveTo(px(0), h-8);
  data.forEach((v,i)=>x.lineTo(px(i), py(v)));
  x.lineTo(px(data.length-1), h-8); x.closePath();
  const grad = x.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,'rgba(108,123,255,.35)'); grad.addColorStop(1,'rgba(108,123,255,0)');
  x.fillStyle = grad; x.fill();
  // line
  x.beginPath();
  data.forEach((v,i)=> i? x.lineTo(px(i),py(v)) : x.moveTo(px(i),py(v)));
  x.strokeStyle = '#6c7bff'; x.lineWidth = 2; x.stroke();
  // labels
  x.fillStyle = '#8b94ab'; x.font = '11px Inter';
  x.fillText(fmtN(max), 6, 12);
  x.fillText(fmtN(data[data.length-1])+' now', w-84, py(data[data.length-1])-6);
}

function drawBarChart(id, items){
  const {x,w,h} = setupCanvas(id);
  if(!items || !items.length){ x.fillStyle='#8b94ab'; x.font='12px Inter'; x.fillText('Launch a drop to see revenue here.', 10, h/2); return; }
  const max = Math.max(...items.map(i=>i.v), 1);
  const bw = Math.min(54, (w-20)/items.length - 8);
  items.forEach((it,i)=>{
    const bx = 10 + i*(bw+8);
    const bh = (h-34)*it.v/max;
    x.fillStyle = '#22d3ee';
    x.fillRect(bx, h-20-bh, bw, bh);
    x.fillStyle = '#8b94ab'; x.font='9px Inter';
    x.fillText(it.name.slice(0,8), bx, h-8);
  });
  x.fillStyle='#8b94ab'; x.font='11px Inter';
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

$id('startBtn').onclick = ()=>{
  const name = $id('startName').value.trim().toUpperCase() || 'NO LABEL';
  newGame(name);
  saveGame();
  startUI();
};
$id('continueBtn').onclick = ()=>{
  G = loadGame();
  if(G) startUI();
};
$id('startName').addEventListener('keydown', e=>{ if(e.key==='Enter') $id('startBtn').click(); });

// offer continue if a save exists
if(loadGame()) $id('continueBtn').style.display='inline-block';
