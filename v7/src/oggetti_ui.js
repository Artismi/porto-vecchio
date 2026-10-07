/* Porto Vecchio — Gli Oggetti: l'interfaccia (zaino, banco della bottega, banco di lavoro, frugare, scambiare) e i modelli 3D delle postazioni.
   Stesso stile del Portafoglio: fondo scuro, righe sottili, giallo per quello che conta. Il gioco va in pausa mentre è aperto.
   Z: zaino. K: banco di lavoro (quello che puoi fare qui). Esc: torna al gioco. Il resto si apre dalle azioni sul posto (QUI, ADESSO).
   Legge e scrive solo attraverso Oggetti. */
var OggettiUI = (function () {
  'use strict';
  const PV = () => window.__pv, ST = () => PV() && PV().st;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const L = x => `${(Math.round(x * 10) / 10).toLocaleString('it-IT')}.000`;
  const O = () => Oggetti, G = () => (PV() && PV().G) || Game;
  const U = { open: false, panel: '', arg: null, msg: '', ok: true, tab: 'compra', filt: 'tutto', onlyOk: false, give: {}, get: {}, lire: 0, theirLire: 0, cat: '' };

  const CSS = `
#og { position: absolute; inset: 0; z-index: 62; display: none; background: rgba(12,12,16,.86); backdrop-filter: blur(3px); color: #d8d4cc; font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; }
#og.on { display: grid; place-items: center; }
#og .fr { position: relative; width: min(1040px, calc(100% - 32px)); max-height: calc(100% - 32px); overflow: hidden; border: 1px solid #2c2c34; background: #16161b; display: grid; grid-template-rows: auto auto 1fr auto; }
#og header { display: flex; align-items: baseline; gap: 18px; padding: 20px 28px 8px; border-bottom: 1px solid #222228; }
#og header b { font-size: 22px; letter-spacing: .02em; color: #f4ecdc; } #og header span { color: #8a8690; font-size: 13px; }
#og header .x { margin-left: auto; background: none; border: 0; color: #8a8690; font-size: 26px; cursor: pointer; line-height: 1; } #og header .x:hover { color: #e8d040; }
#og nav { display: flex; gap: 6px; flex-wrap: wrap; padding: 10px 28px; border-bottom: 1px solid #1e1e24; }
#og main { overflow: auto; padding: 16px 28px 20px; display: grid; gap: 14px; align-content: start; }
#og .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; }
#og h4 { margin: 4px 0 6px; font: 700 11px system-ui; letter-spacing: .14em; text-transform: uppercase; color: #8a8690; }
#og .dim { color: #8a8690; font-size: 12.5px; line-height: 1.5; } #og .warn { color: #e07a5a; font-size: 12.5px; font-weight: 600; }
#og button.b { background: none; border: 1px solid #55505a; color: #e8e4dc; font: 700 11px system-ui; letter-spacing: .1em; padding: 6px 10px; cursor: pointer; text-transform: uppercase; white-space: nowrap; }
#og button.b:hover { border-color: #e8d040; color: #e8d040; } #og button.b[disabled] { color: #55505a; border-color: #2e2e36; cursor: default; }
#og button.b.on { background: #e8d040; color: #16161b; border-color: #e8d040; } #og button.b.bad { border-color: #7a3a3a; color: #e8a0a0; } #og button.b.bad:hover { border-color: #e04a4a; color: #ff8a8a; }
#og .list { display: grid; gap: 3px; }
#og .it { display: grid; grid-template-columns: 1fr auto auto auto; gap: 12px; align-items: center; padding: 6px 10px; background: #1a1a20; border: 1px solid #23232a; font-size: 13.5px; }
#og .it .n small { display: block; color: #77707a; font-size: 11.5px; } #og .it .q, #og .it .pr { font-variant-numeric: tabular-nums; text-align: right; color: #c8c0b0; font-size: 12.5px; }
#og .it .pr b { color: #e8e4dc; } #og .it.out { opacity: .45; } #og .it.ill .n::after { content: ' ⚠'; color: #e07a5a; font-size: 11px; }
#og .it .btns { display: flex; gap: 4px; }
#og .it.t-buono .n { color: #b8e0a0; } #og .it.t-raro .n { color: #8ab8ff; } #og .it.t-prezioso .n { color: #e8c040; font-weight: 600; }
#og .grp { margin-top: 8px; font: 700 10.5px system-ui; letter-spacing: .14em; text-transform: uppercase; color: #6a6670; }
#og .rec { display: grid; grid-template-columns: 1fr auto; gap: 6px 14px; padding: 9px 12px; background: #1a1a20; border: 1px solid #23232a; }
#og .rec.no { opacity: .62; } #og .rec.ok { border-color: #3a3a1e; } #og .rec .t { font-size: 14px; color: #f0ead8; } #og .rec .t small { color: #77707a; font-size: 11.5px; margin-left: 8px; }
#og .rec .ing { grid-column: 1; display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; color: #a8a4a0; } #og .rec .ing .y { color: #8ad860; } #og .rec .ing .n { color: #e0806a; } #og .rec .ing .tl { color: #8ab0e8; }
#og .rec .btns { grid-row: 1 / 3; grid-column: 2; display: flex; gap: 4px; align-items: center; }
#og .bar { height: 6px; background: #26262e; position: relative; } #og .bar i { position: absolute; inset: 0 auto 0 0; background: #e8d040; } #og .bar.over i { background: #e04a4a; }
#og .tags { display: flex; gap: 6px; flex-wrap: wrap; } #og .tag { border: 1px solid #3a3a42; padding: 3px 8px; font-size: 11.5px; color: #c8c0b0; }
#og .deal { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: start; } #og .deal .mid { display: grid; gap: 8px; place-items: center; padding-top: 24px; }
#og .pile { min-height: 46px; border: 1px dashed #3a3a42; padding: 6px; display: flex; flex-wrap: wrap; gap: 4px; } #og .pile .tag { cursor: pointer; } #og .pile .tag:hover { border-color: #e04a4a; }
#og footer { display: flex; align-items: center; gap: 22px; padding: 12px 28px 16px; border-top: 1px solid #222228; font-size: 12px; letter-spacing: .1em; color: #8a8690; font-weight: 600; text-transform: uppercase; }
#og footer kbd { font: 700 9px system-ui; border: 1px solid #77707a; color: #c8c0b0; padding: 2px 6px; border-radius: 10px; font-style: italic; }
#og footer .msg { margin-left: auto; color: #e8d040; text-transform: none; letter-spacing: 0; font-weight: 500; font-size: 13px; max-width: 60%; text-align: right; } #og footer .msg.no { color: #e0806a; }
@media (max-width: 760px) { #og .cols, #og .deal { grid-template-columns: 1fr; } #og .it { grid-template-columns: 1fr auto; } #og .it .btns { grid-column: 1 / 3; } #og header, #og main, #og nav, #og footer { padding-left: 16px; padding-right: 16px; } }
`;
  function mount() {
    if ($('og')) return true;
    const app = $('app'); if (!app || !PV() || typeof Oggetti === 'undefined') return false;
    const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
    const m = document.createElement('div'); m.id = 'og'; m.setAttribute('role', 'dialog'); app.appendChild(m);
    m.addEventListener('click', onClick); m.addEventListener('input', onInput);
    return true;
  }
  function open(panel, arg) {
    if (typeof MenuUI !== 'undefined' && /^(zaino|lavora|banco|fruga)$/.test(panel)) { MenuUI.open(panel === 'banco' ? 'bottega' : panel, arg); return; }   // [menu] la valigetta nuova
    if (!mount()) return;
    if (typeof TascheUI !== 'undefined') try { TascheUI.toggle(false); } catch (e) { }
    if (typeof SoldiUI !== 'undefined' && SoldiUI.state && SoldiUI.state.open) try { SoldiUI.close(); } catch (e) { }
    U.open = true; U.panel = panel; U.arg = arg; U.msg = ''; U.ok = true; U.give = {}; U.get = {}; U.lire = 0; U.theirLire = 0; if (panel === 'banco') U.tab = 'compra';
    if (PV().ui) PV().ui.menu = true;
    $('og').classList.add('on'); render();
  }
  function close() { U.open = false; const m = $('og'); if (m) m.classList.remove('on'); if (PV() && PV().ui) PV().ui.menu = false; }
  function say(r) { if (!r) return r; if (r.msg) { U.msg = r.msg; U.ok = r.ok !== false; const st = ST(); if (st) G().feed(st, r.msg, r.ok ? 'job' : 'bad'); } return r; }
  const act = (id, arg, ex) => say(O().act(ST(), id, arg, ex));
  const btn = (a, label, x, cls, dis) => `<button class="b ${cls || ''}" data-a="${a}"${x !== undefined ? ` data-x="${esc(JSON.stringify(x))}"` : ''}${dis ? ' disabled' : ''}>${esc(label)}</button>`;
  const TITLES = { zaino: ['Zaino', 'quello che hai addosso'], banco: ['Al banco', ''], lavora: ['Banco di lavoro', ''], fruga: ['Frugare', ''], scambia: ['Scambio', ''] };

  function render() {
    const st = ST(); if (!st || !U.open) return;
    const T = TITLES[U.panel] || [U.panel, '']; let sub = T[1], nav = '', body = '';
    const pv = O().pocketsView(st);
    if (U.panel === 'zaino') body = pZaino(st, pv);
    if (U.panel === 'banco') { const c = O().counter(st, U.arg); if (!c) { close(); return; } sub = c.label + (c.open ? (c.clerk ? ` · al banco: ${c.clerk}` : '') : ' · CHIUSO: al banco non c\'è nessuno') + (c.emporio ? ' · prezzi del regime' : c.black ? ' · mercato nero: si compra e si vende di tutto, a prezzo doppio' : c.market ? ' · mercato' : ''); nav = ['compra', 'vendi'].map(t => btn('tab', t === 'compra' ? 'Compra' : `Vendi (${c.buys.length})`, t, U.tab === t ? 'on' : '')).join(''); body = pBanco(st, c); }
    if (U.panel === 'lavora') { const v = O().recipesView(st); sub = v.stations.length ? `qui: ${v.stations.join(', ')}` : 'qui non c\'è nessuna postazione: si fa solo quello che si fa a mano'; if (v.base) sub += ` · base: ${v.base}`; nav = pLavoraNav(v); body = pLavora(st, v); }
    if (U.panel === 'fruga') { const v = O().frugaView(st, U.arg); if (!v) { close(); return; } sub = v.label; body = pFruga(st, v); }
    if (U.panel === 'scambia') { const v = O().barterView(st, U.arg); if (!v) { close(); return; } sub = `${v.name}${v.job ? ' · ' + v.job : ''} · ${v.mood > .2 ? 'si fida di te' : v.mood < -.2 ? 'non ti sopporta' : 'ti guarda con sospetto'}`; body = pScambia(st, v); }
    const w = pv.peso / pv.cap;
    $('og').innerHTML = `<div class="fr"><header><b>${esc(T[0])}</b><span>${esc(sub)}</span><button class="x" data-a="close" aria-label="Chiudi">×</button></header><nav${nav ? '' : ' style="display:none"'}>${nav}</nav><main>${body}</main>
      <footer><span><kbd>Z</kbd> zaino</span><span><kbd>K</kbd> lavora</span><span><kbd>Esc</kbd> gioco</span><span>${L(pv.money)} lire · ${pv.peso}/${pv.cap} kg${w > 1 ? ' <b style="color:#e07a5a">TROPPO PESO</b>' : ''}</span><span class="msg ${U.ok ? '' : 'no'}">${esc(U.msg)}</span></footer></div>`;
  }
  // ---------------- ZAINO ----------------
  function pZaino(st, pv) {
    const w = Math.min(1, pv.peso / pv.cap);
    const byCat = {}; pv.items.forEach(i => { (byCat[i.catLabel] = byCat[i.catLabel] || []).push(i); });
    const items = Object.entries(byCat).map(([c, l]) => `<div class="grp">${esc(c)}</div>` + l.map(i => `<div class="it ${i.ill ? 'ill' : ''}"><span class="n">${esc(i.nome)}${i.tool !== null ? `<small>usura ${100 - i.tool}%</small>` : ''}${i.st ? '<small>postazione: si posa in una base</small>' : ''}</span><span class="q">×${i.q}</span><span class="q">${Math.round(i.peso * i.q * 10) / 10} kg</span>
      <span class="btns">${i.eat ? btn('usa', 'Usa', { id: i.id }) : ''}${pv.base ? btn('deposita', 'In base', { id: i.id, q: i.q }) : btn('butta', 'Butta', { id: i.id, q: 1 }, 'bad')}</span></div>`).join('')).join('') || '<div class="dim">Tasche vuote.</div>';
    const base = pv.base ? `<div><h4>${esc(pv.base.name)} — scorte</h4><div class="row" style="margin-bottom:6px">${btn('deposita', 'Lascia tutto in base', { id: '*' })}</div><div class="list">${pv.base.items.map(i => `<div class="it"><span class="n">${esc(i.nome)}</span><span class="q">×${i.q}</span><span></span><span class="btns">${btn('preleva', 'Prendi', { id: i.id, q: 1 })}${i.q > 1 ? btn('preleva', 'Tutto', { id: i.id, q: i.q }) : ''}</span></div>`).join('') || '<div class="dim">Vuota.</div>'}</div></div>` : '';
    return `<div><div class="bar ${pv.peso > pv.cap ? 'over' : ''}"><i style="width:${Math.round(w * 100)}%"></i></div><div class="dim" style="margin-top:6px">${pv.peso} kg su ${pv.cap}. Fame ${Math.round(pv.fame * 100)}% · sete ${Math.round(pv.sete * 100)}%. Lo zaino militare porta 20 kg in più; con la carriola in mano molti di più.</div></div>
      <div class="${base ? 'cols' : ''}"><div class="list">${items}</div>${base}</div><div>${btn('lavora', 'Banco di lavoro · K')}</div>`;
  }
  // ---------------- BANCO ----------------
  function pBanco(st, c) {
    if (U.tab === 'vendi') {
      return `<div class="dim">In cassa: ${L(c.cash)} lire. ${c.black ? 'Il ricettatore prende anche la roba che scotta.' : 'Comprano solo quello che vendono, a metà prezzo o poco più.'}</div>
        <div class="list">${c.buys.map(b => `<div class="it"><span class="n">${esc(b.name)}</span><span class="q">×${b.q}</span><span class="pr"><b>${L(b.price)}</b></span><span class="btns">${btn('vendi', 'Vendi 1', { g: b.g, q: 1 }, '', !c.open)}${b.q > 1 ? btn('vendi', 'Tutto', { g: b.g, q: b.q }) : ''}</span></div>`).join('') || '<div class="dim">Non hai niente che qui comprino.</div>'}</div>`;
    }
    const byCat = {}; c.goods.forEach(g => { (byCat[g.catLabel] = byCat[g.catLabel] || []).push(g); });
    return Object.entries(byCat).map(([cat, l]) => `<div class="grp">${esc(cat)}</div><div class="list">${l.map(g => `<div class="it ${g.stock < 1 ? 'out' : ''} ${g.ill ? 'ill' : ''}"><span class="n">${esc(g.name)}<small>${g.peso} kg${g.mine ? ` · ne hai ${g.mine}` : ''}</small></span><span class="q">${g.stock < 1 ? 'finito' : `${g.stock} in negozio`}</span><span class="pr ${g.price > g.base * 1.15 ? 'up' : ''}"><b>${L(g.price)}</b></span>
      <span class="btns">${g.eat ? btn('compra', /bevande/.test(g.cat) ? 'Bevi qui' : 'Mangia qui', { g: g.g, q: 1, mode: 'consuma' }, '', g.stock < 1 || c.wallet < g.price || !c.open) : ''}${btn('compra', 'Compra', { g: g.g, q: 1 }, '', g.stock < 1 || c.wallet < g.price || !c.open)}${g.stock >= 5 ? btn('compra', '×5', { g: g.g, q: 5 }, '', c.wallet < g.price * 5 || !c.open) : ''}</span></div>`).join('')}</div>`).join('');
  }
  // ---------------- LAVORA ----------------
  const KINDS = [['tutto', 'Tutto'], ['cucina', 'Cucina'], ['fai', 'Fabbricare'], ['smonta', 'Smontare'], ['raccogli', 'Raccogliere']];
  function pLavoraNav(v) { return KINDS.map(([k, l]) => btn('filt', `${l} (${v.list.filter(r => (k === 'tutto' || r.kind === k) && r.ok).length})`, k, U.filt === k ? 'on' : '')).join('') + btn('onlyok', U.onlyOk ? 'Solo quello che posso: sì' : 'Solo quello che posso: no', 1, U.onlyOk ? 'on' : ''); }
  function pLavora(st, v) {
    const l = v.list.filter(r => (U.filt === 'tutto' || r.kind === U.filt) && (!U.onlyOk || r.ok)).slice(0, 80);
    return `<div class="list">${l.map(r => `<div class="rec ${r.ok ? 'ok' : 'no'}"><div class="t">${esc(r.nome[0].toUpperCase() + r.nome.slice(1))}<small>${esc(r.st)} · ${r.min >= 60 ? (Math.round(r.min / 6) / 10) + ' h' : r.min + ' min'}${!r.here ? ' · non qui' : ''}</small></div>
      <div class="ing">${r.in.map(i => `<span class="${i.have >= i.q ? 'y' : 'n'}">${esc(i.nome)} ${i.have}/${i.q}</span>`).join('')}${r.tools.map(t => `<span class="${t.have ? 'tl' : 'n'}">⚒ ${esc(t.nome)}</span>`).join('')}<span>→ ${r.out.map(o => `${esc(o.nome)}${o.q > 1 ? ' ×' + o.q : ''}`).join(', ')}</span></div>
      <div class="btns">${btn('fai', 'Fai', { id: r.id, q: 1 }, '', !r.ok)}${btn('fai', '×3', { id: r.id, q: 3 }, '', !r.ok)}</div></div>`).join('') || '<div class="dim">Niente da fare qui con quello che hai.</div>'}</div>`;
  }
  // ---------------- FRUGA ----------------
  function pFruga(st, v) {
    if (v.locked) return `<div class="warn">È chiuso a chiave.</div><div class="dim">Serve: ${esc(v.need)}. Il grimaldello è silenzioso, il piede di porco no; con il trapano ci vuole tempo. Se in casa c'è qualcuno, ti sente.</div><div>${btn('apri', 'Forza', undefined, 'bad')}</div>`;
    const mine = v.mine.items.filter(i => !i.tool);
    return `<div class="cols"><div><h4>Dentro</h4><div class="list">${v.items.map(i => `<div class="it t-${i.tier || 'comune'}"><span class="n">${esc(i.nome)}${i.src === 'shop' ? '<small>merce della bottega</small>' : i.tier && i.tier !== 'comune' ? `<small>${i.tier}</small>` : ''}</span><span class="q">${i.id === '$' ? '' : '×' + i.q}</span><span class="q">${i.peso ? Math.round(i.peso * 10) / 10 + ' kg' : ''}</span><span class="btns">${btn('prendi', 'Prendi', { g: i.id, q: i.id === '$' ? i.q : 1 }, i.src === 'shop' || i.id === '$' ? 'bad' : '')}${i.q > 1 && i.id !== '$' ? btn('prendi', 'Tutto', { g: i.id, q: i.q }, i.src === 'shop' ? 'bad' : '') : ''}</span></div>`).join('') || '<div class="dim">Niente di utile.</div>'}</div>
      ${v.items.length ? `<div style="margin-top:8px">${btn('prendi_tutto', 'Prendi tutto')}</div>` : ''}</div>
      <div><h4>Lascia qui (nascondere)</h4><div class="list">${mine.slice(0, 30).map(i => `<div class="it"><span class="n">${esc(i.nome)}</span><span class="q">×${i.q}</span><span></span><span class="btns">${btn('posa', 'Lascia', { g: i.id, q: 1 })}</span></div>`).join('') || '<div class="dim">Non hai niente da lasciare.</div>'}</div></div></div>`;
  }
  // ---------------- SCAMBIA ----------------
  function pScambia(st, v) {
    const pile = (o, side) => Object.entries(o).map(([k, q]) => `<span class="tag" data-a="unpick" data-x="${esc(JSON.stringify({ side, id: k }))}">${esc(O().nm(k))} ×${q} ✕</span>`).join('') || '<span class="dim">Clicca qui sotto per aggiungere.</span>';
    const valOut = Object.entries(U.get).reduce((s, [k, q]) => s + ((v.theirs.find(t => t.id === k) || {}).v || 0) * q, 0) + (+U.theirLire || 0), valIn = Object.entries(U.give).reduce((s, [k, q]) => s + ((v.mine.find(t => t.id === k) || {}).v || 0) * q, 0) + (+U.lire || 0);
    return `<div class="deal"><div><h4>Tu dai</h4><div class="pile">${pile(U.give, 'give')}</div><div class="dim" style="margin:8px 0 4px">Lire: <input type="number" min="0" step="1" value="${U.lire}" data-in="lire" style="width:70px;background:#1c1c22;border:1px solid #3a3a42;color:#e8e4dc;padding:3px"> (ne hai ${v.wallet})</div>
      <div class="list">${v.mine.map(i => `<div class="it"><span class="n">${esc(i.nome)}<small>vale ~${i.v}</small></span><span class="q">×${i.q - (U.give[i.id] || 0)}</span><span></span><span class="btns">${btn('pick', '+', { side: 'give', id: i.id, max: i.q }, '', (U.give[i.id] || 0) >= i.q)}</span></div>`).join('') || '<div class="dim">Non hai niente.</div>'}</div></div>
      <div class="mid"><div class="dim">valore ~${Math.round(valIn)} → ~${Math.round(valOut)}</div>${btn('proponi', 'Proponi')}</div>
      <div><h4>${esc(v.first)} dà</h4><div class="pile">${pile(U.get, 'get')}</div><div class="dim" style="margin:8px 0 4px">Lire: <input type="number" min="0" step="1" value="${U.theirLire}" data-in="theirLire" style="width:70px;background:#1c1c22;border:1px solid #3a3a42;color:#e8e4dc;padding:3px"> (ne ha ${v.money})</div>
      <div class="list">${v.theirs.map(i => `<div class="it"><span class="n">${esc(i.nome)}<small>vale ~${i.v}</small></span><span class="q">×${i.q - (U.get[i.id] || 0)}</span><span></span><span class="btns">${btn('pick', '+', { side: 'get', id: i.id, max: i.q }, '', (U.get[i.id] || 0) >= i.q)}</span></div>`).join('') || '<div class="dim">In tasca non ha niente che ti interessi.</div>'}</div></div></div>`;
  }
  function onInput(e) { const k = e.target.dataset && e.target.dataset.in; if (k) U[k] = Math.max(0, Math.floor(+e.target.value || 0)); }
  function onClick(e) {
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a, x = b.dataset.x ? JSON.parse(b.dataset.x) : undefined;
    switch (a) {
      case 'close': close(); return;
      case 'tab': U.tab = x; break;
      case 'filt': U.filt = x; break;
      case 'onlyok': U.onlyOk = !U.onlyOk; break;
      case 'lavora': U.panel = 'lavora'; break;
      case 'compra': act('compra', U.arg, x); break;
      case 'vendi': act('vendi', U.arg, x); break;
      case 'fai': act('fai', x.id, { q: x.q }); break;
      case 'usa': act('usa', x.id); break;
      case 'butta': act('butta', x.id, { q: x.q }); break;
      case 'deposita': act('deposita', x.id, { q: x.q }); break;
      case 'preleva': act('preleva', x.id, { q: x.q }); break;
      case 'apri': act('apri', U.arg); break;
      case 'prendi': act('prendi', U.arg, x); break;
      case 'prendi_tutto': act('prendi_tutto', U.arg); break;
      case 'posa': act('posa', U.arg, x); break;
      case 'pick': { const o = x.side === 'give' ? U.give : U.get; o[x.id] = Math.min(x.max, (o[x.id] || 0) + 1); break; }
      case 'unpick': { const o = x.side === 'give' ? U.give : U.get; if (o[x.id] > 1) o[x.id]--; else delete o[x.id]; break; }
      case 'proponi': { const r = act('scambia', U.arg, { give: U.give, get: U.get, lire: U.lire, theirLire: U.theirLire }); if (r && r.ok) { U.give = {}; U.get = {}; U.lire = 0; U.theirLire = 0; } break; }
    }
    render();
  }
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase(), ui = PV() && PV().ui; if (!ui || ui.intro || ui.over) return;
    const ae = document.activeElement; if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT')) { if (k === 'escape') ae.blur(); return; }
    if (U.open) {
      if (k === 'escape' || (k === 'z' && U.panel === 'zaino') || (k === 'k' && U.panel === 'lavora')) { close(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (k === 'z') { U.panel = 'zaino'; render(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (k === 'k') { U.panel = 'lavora'; render(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (k !== 'tab') e.stopImmediatePropagation();
      return;
    }
    if ((k === 'z' || k === 'k') && !e.repeat && !ui.dialog && !ui.book && !ui.menu) { open(k === 'z' ? 'zaino' : 'lavora'); e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  // il bancone del Portafoglio adesso è questo
  const iv = setInterval(() => {
    if (!mount()) return; clearInterval(iv);
    if (typeof SoldiUI !== 'undefined') { const o0 = SoldiUI.open; SoldiUI.open = (panel, arg) => panel === 'banco' ? open('banco', arg) : o0(panel, arg); }
  }, 300);

  // ================= I MODELLI 3D DELLE POSTAZIONI (st_*) =================
  // fatti di scatole e cilindri, a misura reale (metri), il davanti verso +z come i mobili del kit
  function stModel(name) {
    if (typeof THREE === 'undefined') return null;
    // [modelli] rifatte il 6/10: ogni pezzo poggia su qualcosa, gambe e tubi uniscono i punti veri, le parti che si animano hanno il loro nome
    // (fiamma, brace, ago, rullo, led, luce, segatura). 'gambe' = il mobile sotto la macchina: tessile e stamperia lo nascondono e la posano sul loro piano.
    const g = new THREE.Group(), M = {};
    const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .85, metalness: /^#[3-6]/.test(c) ? .3 : .05 }, o || {}))); };
    const glow = (c, e, k) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: k || 1.2, roughness: 1 });
    const mesh = (geo, c, p, o) => { const m = new THREE.Mesh(geo, typeof c === 'string' ? mat(c, o) : c); m.castShadow = true; m.receiveShadow = true; (p || g).add(m); return m; };
    // box: y è la base; cyl: y è la base (rx: coricato lungo z, rz: coricato lungo x, allora y è il centro)
    const box = (w, h, d, x, y, z, c, p, o) => { const m = mesh(new THREE.BoxGeometry(w, h, d), c, p, o); m.position.set(x, y + h / 2, z); return m; };
    const cyl = (r, h, x, y, z, c, rx, p, r1, n) => { const m = mesh(new THREE.CylinderGeometry(r, r1 === undefined ? r : r1, h, n || 14), c, p); m.position.set(x, y + (rx ? 0 : h / 2), z); if (rx === 1) m.rotation.x = Math.PI / 2; if (rx === 2) m.rotation.z = Math.PI / 2; return m; };
    const ball = (r, x, y, z, c, p, sx, sy, sz) => { const m = mesh(new THREE.SphereGeometry(r, 14, 10), c, p); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); return m; };
    const V = (a) => new THREE.Vector3(a[0], a[1], a[2]), UP = new THREE.Vector3(0, 1, 0);
    const asta = (a, b, s, c, p, round) => { const A = V(a), B = V(b), d = B.clone().sub(A), m = mesh(round ? new THREE.CylinderGeometry(s, s, 1, 8) : new THREE.BoxGeometry(s, 1, s), c, p); m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, d.clone().normalize()); m.scale.y = d.length(); return m; };
    const cavo = (pts, r, c, p) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(V)), pts.length * 8, r, 6), c, p);
    const named = (m, n) => { m.name = n; m.material = m.material.clone(); return m; };
    const sub = (x, y, z, ry, p) => { const s = new THREE.Group(); s.position.set(x || 0, y || 0, z || 0); s.rotation.y = ry || 0; (p || g).add(s); return s; };
    const legs = (w, d, h, c, p, s) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(s || .06, h, s || .06, a * (w / 2 - .05), 0, b * (d / 2 - .05), c, p));
    const top = (w, h, d, y, c, p) => { box(w, h, d, 0, y, 0, c, p); box(w - .08, .06, .02, 0, y - .06, d / 2 - .06, c, p); };   // piano con la fascia sotto
    const WOOD = '#7a5634', WOOD2 = '#a07848', DARK = '#3a3632', IRON = '#4a4c52', STEEL = '#9a9ea6', RED = '#8a2a22', GREEN = '#3a5a44', BRICK = '#9a5a40', MET = { metalness: .55, roughness: .45 };
    switch (name) {
      case 'st_forgia': {   // forgia del fabbro: focolare in mattoni col piano di pietra, crogiolo di ghisa con le braci, cappa di lamiera chiodata con la canna, mantice di cuoio, secchio per temprare, rastrelliera delle tenaglie
        const Mo = Modella, P = Pezzi;
        Mo.guscio(g, 1.2, .74, .9, BRICK, {}, .03, .02); for (let i = 1; i < 6; i++) Mo.guscio(g, 1.205, .008, .905, '#6a4030', {}, .03, .002, 0, i * .125, 0);
        Mo.guscio(g, 1.28, .07, .98, '#8a8478', {}, .04, .02, 0, .74, 0);                                                                       // piano di pietra
        Mo.tornito(g, [[.32, 0], [.32, .02], [.28, .02], [.18, -.08], [0, -.09]], '#2a2a2c', Mo.MET, 0, .81, .05, 20);                             // crogiolo di ghisa incassato
        named(Mo.tornito(g, [[0, 0], [.26, 0], [.2, .04], [0, .06]], glow('#ff6a2a', '#ff4a10', 1.4), null, 0, .74, .05, 18), 'brace');
        for (let i = 0; i < 14; i++) { const a = i * 2.4, r = .06 + (i % 4) * .05, p = new THREE.Mesh(new THREE.DodecahedronGeometry(.035 + (i % 3) * .01), mat('#1a1612', { roughness: .7 })); p.position.set(Math.cos(a) * r, .8 + (i % 3) * .015, .05 + Math.sin(a) * r); p.castShadow = true; g.add(p); }
        Mo.asta(g, [-.64, .55, .05], [-.25, .76, .05], .035, '#2a2a2c', Mo.MET);                                                                  // ugello dell'aria
        box(.5, .32, .5, 0, 0, .41, '#2a2420'); Mo.lastra(g, .38, .22, .02, '#1a1612', {}, .02, 0, .16, .66);                                       // bocca della cenere
        Mo.guscio(g, 1.2, .95, .14, BRICK, {}, .02, .015, 0, .81, -.38);                                                                       // muretto dietro
        const hood = mesh(new THREE.CylinderGeometry(.16, .64, .55, 4, 1, true), '#3a3430'); hood.material = mat('#3a3430', { side: THREE.DoubleSide, metalness: .3, roughness: .6 }); hood.rotation.y = Math.PI / 4; hood.scale.set(1, 1, .8); hood.position.set(0, 2.03, -.06);
        Mo.tuboPiegato(g, [[-.46, 1.75, -.42], [.46, 1.75, -.42], [.46, 1.75, .3], [-.46, 1.75, .3], [-.46, 1.75, -.42]], .018, '#2a2420', Mo.MET, .04);   // orlo arrotolato
        for (const [a, b] of [[[-.46, 1.76, .3], [-.12, 2.29, .02]], [[.46, 1.76, .3], [.12, 2.29, .02]]]) Mo.bulloni(g, a, b, 5, 'z', .007, '#1e1e1e');
        Mo.tornito(g, [[.14, 0], [.14, .45], [.16, .45], [.16, .5], [.14, .5], [.14, .9]], '#3a3430', { metalness: .3, roughness: .6 }, 0, 2.28, -.1, 14);
        Mo.tornito(g, [[0, .2], [.26, 0], [.26, -.02], [0, .16]], '#2a2420', Mo.MET, 0, 3.28, -.1, 14);                                           // cappello parapioggia
        for (const x of [-.5, .5]) Mo.asta(g, [x, .81, .4], [x * .92, 1.76, .3], .02, '#2a2a2e', Mo.MET);
        const mt = sub(-.82, .62, .1); mt.rotation.z = .3;                                                                                         // mantice: due assi a goccia, il cuoio a pieghe, l'ugello
        const goccia = new THREE.Shape(); goccia.moveTo(-.28, 0); goccia.quadraticCurveTo(-.28, .22, 0, .22); goccia.lineTo(.26, .05); goccia.lineTo(.26, -.05); goccia.lineTo(0, -.22); goccia.quadraticCurveTo(-.28, -.22, -.28, 0);
        for (const yy of [0, -.16]) { const e = mesh(new THREE.ExtrudeGeometry(goccia, { depth: .025, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 1 }), '#7a5634', mt); e.rotation.x = Math.PI / 2; e.position.y = yy; }
        for (let i = 0; i < 4; i++) { const f = mesh(new THREE.ExtrudeGeometry(goccia, { depth: .03, bevelEnabled: false }), '#4a3020', mt); f.rotation.x = Math.PI / 2; f.position.y = -.03 - i * .035; f.scale.set(.92 - (i % 2) * .05, .92 - (i % 2) * .05, 1); }
        Mo.asta(mt, [.26, -.08, 0], [.42, -.1, 0], .02, '#3a3a3a', Mo.MET); Mo.asta(mt, [-.28, .03, 0], [-.45, .05, 0], .02, WOOD, {});
        for (const z of [-.08, .28]) Mo.asta(g, [-.82, 0, z], [-.8, .5, z], .03, WOOD, {});
        const sec = sub(.85, 0, .5); Mo.tornito(sec, [[0, 0], [.17, 0], [.2, .38], [0, .38]], '#7a5634', {}, 0, 0, 0, 16); for (const y of [.06, .3]) { const t = mesh(new THREE.TorusGeometry(.18 + y * .07, .008, 4, 18), IRON, sec); t.rotation.x = Math.PI / 2; t.position.y = y; } mesh(new THREE.CircleGeometry(.19, 16), mat('#2a3a40', { roughness: .1 }), sec).rotation.x = -Math.PI / 2; sec.children[sec.children.length - 1].position.y = .34;
        const rk = sub(.68, .81, -.3); Mo.asta(rk, [-.1, .5, 0], [.1, .5, 0], .015, '#2a2a2e', Mo.MET); for (let i = 0; i < 3; i++) { Mo.asta(rk, [-.08 + i * .08, .5, .01], [-.08 + i * .08 + .01, .1, .02], .008, '#2a2a2e', Mo.MET); Mo.asta(rk, [-.08 + i * .08 + .02, .5, .01], [-.08 + i * .08 + .02, .12, .03], .008, '#2a2a2e', Mo.MET); }
        break; }
      case 'st_saldatrice': {   // saldatrice ad arco su carrello: cassa con le feritoie e la maniglia, quadrante dell'amperaggio, manopola, prese; bombola col riduttore e i due manometri; cavi con la pinza e la massa; maschera appesa
        const Mo = Modella, B = '#2a5a8a';
        Mo.guscio(g, .46, .48, .36, B, { roughness: .5 }, .03, .015, 0, .1, 0); for (const sx of [-1, 1]) { const f = Mo.griglia(g, .26, .22, 6, 1, sx * .232, .38, 0, '#152a40'); f.rotation.y = sx * Math.PI / 2; }
        Mo.guscio(g, .48, .025, .38, '#1e4a72', {}, .02, .006, 0, .58, 0); Mo.maniglia(g, [-.17, .6, 0], [.17, .6, 0], .09, .013, '#1a1a1a');
        Mo.lastra(g, .36, .32, .01, '#d8d4c8', {}, .015, 0, .36, .181); Mo.quadrante(g, -.07, .44, .19, .055, 'A'); Mo.manopola(g, .1, .44, .19, .03);
        Mo.presa(g, -.08, .27, .19, .03, '#c82a1e'); Mo.presa(g, .08, .27, .19, .03, '#1a1a1a'); Mo.levetta(g, .12, .33, .19, .014); Mo.targa(g, 'ARCO 160 A', .12, .03, -.07, .34, .192, 0, '#d8d4c8', '#1a1a1a');
        Mo.ruota(g, .1, .05, .26, .1, -.12); Mo.ruota(g, .1, .05, -.26, .1, -.12); Mo.asta(g, [-.29, .1, -.12], [.29, .1, -.12], .012, '#2a2a2a', Mo.MET);
        for (const x of [-.17, .17]) { Mo.guscio(g, .05, .05, .05, '#2a2a2a', Mo.MET, .01, .004, x, .05, .14); Mo.ruota(g, .04, .03, x, .04, .14, '#5a5a5a'); }
        const bo = sub(0, 0, -.33); Mo.tornito(bo, [[0, 0], [.1, 0], [.11, .02], [.11, .72], [.09, .8], [.03, .84], [0, .84]], '#2e5a32', { roughness: .45 }, 0, 0, 0, 20);
        Mo.tornito(bo, [[0, 0], [.025, 0], [.03, .05], [0, .06]], '#b8902a', Mo.MET, 0, .84, 0); const rid = sub(0, .91, .03, 0, bo); Mo.tornito(rid, [[0, 0], [.03, 0], [.03, .06], [0, .06]], '#b8902a', Mo.MET, 0, -.03, 0).rotation.x = Math.PI / 2;
        Mo.quadrante(rid, -.045, .03, .02, .022, ''); Mo.quadrante(rid, .045, .03, .02, .022, ''); Mo.cavo(g, [[0, .92, -.28], [.1, .8, -.22], [.18, .62, -.15]], .006, '#3a6a3a');
        for (const y of [.5, .3]) { const t = mesh(new THREE.TorusGeometry(.115, .006, 4, 18), mat('#6a6a6a', Mo.MET), bo); t.rotation.x = Math.PI / 2; t.position.y = y; }
        Mo.cavo(g, [[-.08, .27, .21], [-.12, .1, .3], [-.05, .02, .42], [.15, .02, .44], [.3, .05, .34]], .014, '#c82a1e'); const pz = sub(.32, .07, .32, -.6); Mo.guscio(pz, .05, .05, .16, '#2a2a2a', {}, .015, .008); Mo.guscio(pz, .06, .015, .07, '#8a8e96', Mo.MET, .01, .004, 0, .05, .1);
        Mo.cavo(g, [[.08, .27, .21], [.16, .08, .3], [.32, .015, .36], [.44, .015, .22]], .014, '#1a1a1a'); const ms = sub(.46, 0, .2, .4); Mo.guscio(ms, .1, .03, .04, '#c8a030', Mo.MET, .008, .004); Mo.guscio(ms, .1, .03, .04, '#c8a030', Mo.MET, .008, .004, 0, .035, 0);
        const ma = sub(.24, .55, .0, Math.PI / 2); ma.rotation.x = .2; Mo.guscio(ma, .22, .26, .12, '#1e1e20', {}, .05, .02, 0, -.26, 0); Mo.lastra(ma, .1, .05, .01, '#1a2a1a', {}, .008, 0, -.12, .06);
        break; }
      case 'st_banco_lavoro': {   // banco da lavoro: piano spesso con lo spigolo consumato, gambe con le traverse, ripiano con la cassetta, cassettiera, pannello forato con gli attrezzi, morsa, lampada, barattoli sulla mensola
        const Mo = Modella, P = Pezzi;
        Mo.guscio(g, 1.8, .07, .75, WOOD, {}, .015, .012, 0, .83, 0); Mo.guscio(g, 1.74, .08, .03, '#6a4a2c', {}, .01, .006, 0, .75, .34);
        for (const [x, z] of [[-.84, -.32], [.84, -.32], [-.84, .32], [.84, .32]]) Mo.guscio(g, .08, .75, .08, '#6a4a2c', {}, .01, .008, x, 0, z);
        for (const x of [-.84, .84]) Mo.guscio(g, .06, .06, .6, '#6a4a2c', {}, .01, .006, x, .16, 0); Mo.guscio(g, 1.66, .035, .66, WOOD, {}, .01, .008, 0, .2, 0); Mo.guscio(g, 1.62, .06, .05, '#6a4a2c', {}, .01, .006, 0, .5, -.32);
        P.cassetta(g, -.45, .235, .05, .2, '#3a5a8a'); P.cartone(g, -.05, .235, 0, -.2, .8);
        const dr = sub(.5, .52, .02); Mo.guscio(dr, .62, .3, .66, '#6a4a2c', {}, .01, .008, 0, 0, 0); for (let i = 0; i < 2; i++) { Mo.lastra(dr, .58, .13, .012, '#8a6a44', {}, .008, 0, .075 + i * .145, .33); Mo.maniglia(dr, [-.06, .09 + i * .145, .345], [.06, .09 + i * .145, .345], .015, .005, '#3a3a3a', [0, 0, 1]); }
        P.pannello(g, 1.7, .85, 0, .92, -.36);
        Mo.guscio(g, .5, .02, .14, WOOD, {}, .005, .004, .55, 1.25, -.28); P.vasetti(g, .38, 1.27, -.3);
        P.morsa(g, -.72, .9, .3, 0); P.lampada(g, .75, .9, -.15, -2.3);
        const mar = sub(.1, .91, .15, .5); Mo.asta(mar, [-.15, .015, 0], [.12, .015, 0], .012, '#a07848', {}); Mo.guscio(mar, .04, .035, .1, '#3a3a3a', Mo.MET, .008, .004, .14, 0, 0);
        for (let i = 0; i < 4; i++) Mo.bullone(g, -.2 + i * .04, .9, .25 + (i % 2) * .03, 'y', .008);
        break; }
      case 'st_banco_falegname': {   // banco del falegname: piano a listelli coi fori dei fermi, morsa di testa con la vite di legno, morsa di coda, cavalletti con le traverse, assi sul ripiano; pialla, sega, scalpelli, mazzuolo, squadra, morsetto, trucioli
        const Mo = Modella;
        Mo.guscio(g, 2, .1, .7, WOOD2, {}, .015, .012, 0, .78, 0); for (let i = 1; i < 7; i++) Mo.guscio(g, 2.002, .101, .006, '#8a6438', {}, .003, .002, 0, .78, -.35 + i * .1);
        for (let i = 0; i < 8; i++) { Mo.lastra(g, .018, .018, .004, '#2a1e12', {}, .006, -.85 + i * .22, .881, .26).rotation.x = -Math.PI / 2; }
        Mo.tornito(g, [[0, 0], [.012, 0], [.012, .03], [0, .03]], '#c8a070', {}, .69, .88, .26, 8);
        for (const x of [-.82, .82]) { Mo.guscio(g, .1, .08, .64, '#8a6438', {}, .015, .01, x, 0, 0); Mo.guscio(g, .09, .06, .5, '#8a6438', {}, .01, .008, x, .7, 0); for (const z of [-.24, .24]) Mo.guscio(g, .09, .66, .09, '#8a6438', {}, .01, .008, x, .06, z); }
        Mo.guscio(g, 1.56, .1, .06, '#8a6438', {}, .01, .008, 0, .3, 0); Mo.guscio(g, 1.6, .03, .5, '#8a6438', {}, .008, .006, 0, .4, 0);
        for (let i = 0; i < 4; i++) Mo.guscio(g, 1.5, .03, .13, ['#c8a070', '#b89060', '#d0aa78', '#a88050'][i], {}, .005, .004, 0, .43 + i * .03, -.15 + (i % 2) * .16);
        Mo.guscio(g, .3, .18, .08, '#7a5434', {}, .01, .008, -.82, .62, .39); Mo.tornito(g, [[.022, 0], [.026, .02], [.026, .26], [.03, .28], [.03, .32], [.022, .34]], '#9a7040', {}, -.82, .76, .38).rotation.x = Math.PI / 2; Mo.asta(g, [-.94, .76, .72], [-.7, .76, .72], .014, '#7a5434', {});
        const pl = sub(.2, .88, .05, .25); Mo.guscio(pl, .26, .055, .07, '#a07040', {}, .012, .008); Mo.guscio(pl, .2, .008, .05, '#5a5c60', Mo.MET, .004, .002, .0, .055, 0); Mo.tuboPiegato(pl, [[-.07, .06, 0], [-.08, .12, 0], [-.03, .13, 0], [-.02, .06, 0]], .012, '#6a4020', {}, .02); Mo.tornito(pl, [[0, 0], [.018, 0], [.018, .03], [0, .04]], '#6a4020', {}, .09, .055, 0);
        const sa = sub(-.35, .885, .14, -.15); Mo.lastra(sa, .5, .1, .002, '#b8bcc4', Mo.MET, .004, .05, .05, 0).rotation.x = -Math.PI / 2; Mo.guscio(sa, .12, .022, .1, '#6a4020', {}, .01, .006, -.24, 0, 0);
        for (let i = 0; i < 4; i++) { const sc = sub(-.7 + i * .05, .885, -.15, .1); Mo.asta(sc, [0, .012, 0], [0, .012, .1], .01, '#a07040', {}); Mo.lastra(sc, .012, .1, .003, '#9a9ea6', Mo.MET, .002, 0, .012, .15).rotation.x = Math.PI / 2; }
        const mz = sub(.6, .9, .2, .8); Mo.tornito(mz, [[0, 0], [.04, 0], [.045, .02], [.045, .1], [.04, .12], [0, .12]], '#8a6438', {}, -.06, .03, 0).rotation.z = Math.PI / 2; Mo.asta(mz, [0, .03, 0], [0, .03, .25], .012, '#a07848', {});
        const sq = sub(.75, .885, -.2, -.4); Mo.lastra(sq, .3, .03, .003, '#c8ccd4', Mo.MET, .002, .15, 0, 0).rotation.x = -Math.PI / 2; Mo.lastra(sq, .03, .2, .003, '#c8ccd4', Mo.MET, .002, 0, 0, .1).rotation.x = -Math.PI / 2;
        const mo = sub(.85, .78, .36); Mo.guscio(mo, .03, .2, .03, '#3a5a8a', Mo.MET, .004, .003, 0, -.1, 0); Mo.guscio(mo, .13, .025, .03, '#3a5a8a', Mo.MET, .004, .003, .05, .1, 0); Mo.guscio(mo, .13, .025, .03, '#3a5a8a', Mo.MET, .004, .003, .05, -.12, 0); Mo.asta(mo, [.1, -.1, 0], [.1, .1, 0], .006, '#c8ccd4', Mo.MET);
        named(box(.36, .02, .22, .55, .88, -.12, '#d8b080'), 'segatura'); for (let i = 0; i < 12; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.025, .006, 4, 8, 4), mat('#e0c090')); t.position.set(.38 + ((i * 37) % 40) / 100, .9, -.22 + ((i * 53) % 20) / 100); t.rotation.set(i, i * 2, 0); g.add(t); }
        break; }
      case 'st_banco_macellaio': {   // banco del macellaio: ceppo a blocchetti di testa su gambe d'acciaio, ripiano con la bacinella, bilancia a quadrante, rotaia coi ganci e la carne, barra dei coltelli, mannaia piantata, piastrelle
        const Mo = Modella;
        for (const [x, z] of [[-.75, -.33], [.75, -.33], [-.75, .33], [.75, .33]]) { Mo.asta(g, [x, .02, z], [x, .72, z], .025, STEEL, Mo.MET); Mo.tornito(g, [[0, 0], [.03, 0], [.03, .02], [0, .02]], '#2a2a2a', {}, x, 0, z, 10); }
        Mo.guscio(g, 1.5, .025, .66, STEEL, Mo.MET, .02, .006, 0, .2, 0); Mo.guscio(g, .5, .06, .35, '#c8ccd4', Mo.MET, .03, .008, -.4, .225, 0);
        Mo.guscio(g, 1.6, .18, .75, '#c8a878', {}, .02, .012, 0, .72, 0); for (let i = 0; i < 8; i++) Mo.guscio(g, .005, .181, .752, '#a88858', {}, .002, .001, -.7 + i * .2, .72, 0); for (let j = 0; j < 4; j++) Mo.guscio(g, 1.602, .181, .004, '#a88858', {}, .002, .001, 0, .72, -.28 + j * .19);
        Mo.guscio(g, .5, .006, .4, '#8a3a2a', { roughness: .4 }, .05, .002, .3, .9, 0);
        const mn = sub(-.2, .9, .05, .4); Mo.lastra(mn, .2, .11, .006, STEEL, Mo.MET, .01, 0, .055, 0); Mo.guscio(mn, .13, .03, .03, '#3a2a1a', {}, .008, .005, .16, .085, 0);
        const bi = sub(.62, .9, .15, -.3); Mo.guscio(bi, .28, .05, .24, '#e8e4d8', {}, .02, .01); Mo.guscio(bi, .14, .2, .12, '#e8e4d8', {}, .03, .015, 0, .05, -.06); Mo.quadrante(bi, 0, .18, .0, .05, 'kg'); Mo.guscio(bi, .3, .015, .26, STEEL, Mo.MET, .03, .004, 0, .26, 0);
        Mo.guscio(g, 1.6, .72, .04, '#e8e8e0', {}, .005, .004, 0, .9, -.38); for (let j = 1; j < 7; j++) Mo.guscio(g, 1.6, .004, .041, '#b8b8b0', {}, .001, .001, 0, .9 + j * .1, -.38); for (let i = 1; i < 16; i++) Mo.guscio(g, .004, .72, .041, '#b8b8b0', {}, .001, .001, -.8 + i * .1, .9, -.38);
        Mo.tuboPiegato(g, [[-.75, 1.62, -.36], [-.75, 1.72, -.3], [.75, 1.72, -.3], [.75, 1.62, -.36]], .012, STEEL, Mo.MET, .05);
        for (const x of [-.45, -.12]) { Mo.tuboPiegato(g, [[x, 1.72, -.3], [x, 1.62, -.3], [x + .03, 1.6, -.3]], .004, STEEL, Mo.MET, .015); const pr = Mo.tornito(g, [[0, 0], [.03, .01], [.07, .08], [.09, .17], [.08, .24], [.05, .29], [.02, .32], [0, .33]], '#8a3a2e', { roughness: .55 }, x + .03, 1.27, -.3, 14); pr.scale.z = .7; const gr = Mo.tornito(g, [[0, 0], [.072, .08], [.092, .17], [.082, .24], [0, .25]], '#e8d0b0', { roughness: .6 }, x + .045, 1.27, -.31, 14); gr.scale.set(.85, 1, .55); Mo.tornito(g, [[0, 0], [.02, 0], [.02, .06], [0, .06]], '#e8d8c8', {}, x + .03, 1.21, -.3); }
        Mo.guscio(g, .5, .03, .02, '#2a2a2a', {}, .005, .004, .45, 1.38, -.35); for (let i = 0; i < 4; i++) { Mo.lastra(g, .03, .2, .004, STEEL, Mo.MET, .006, .3 + i * .1, 1.25, -.355); Mo.guscio(g, .03, .1, .025, '#2a2a2a', {}, .006, .004, .3 + i * .1, 1.3, -.35); }
        break; }
      case 'st_macchina_cucire': {   // macchina da cucire a pedale: gambe di ghisa traforate col pedale, il volano e la cinghia; mobiletto col cassetto; la testa nera col braccio, il volantino, l'ago, il piedino, il rocchetto e i fregi dorati
        const Mo = Modella, gm = sub(); gm.name = 'gambe';
        for (const x of [-.4, .4]) { const lg = sub(x, 0, 0, Math.PI / 2, gm); Mo.tuboPiegato(lg, [[-.2, .02, 0], [-.14, .35, 0], [-.18, .7, 0]], .022, '#1a1a1c', Mo.MET, .1); Mo.tuboPiegato(lg, [[.2, .02, 0], [.14, .35, 0], [.18, .7, 0]], .022, '#1a1a1c', Mo.MET, .1);
          Mo.tuboPiegato(lg, [[-.14, .35, 0], [0, .42, 0], [.14, .35, 0]], .015, '#1a1a1c', Mo.MET, .08); Mo.tuboPiegato(lg, [[-.17, .6, 0], [0, .52, 0], [.17, .6, 0]], .015, '#1a1a1c', Mo.MET, .08); Mo.guscio(lg, .46, .03, .05, '#1a1a1c', Mo.MET, .01, .006, 0, 0, 0);
          for (const z of [-.2, .2]) Mo.tornito(lg, [[0, 0], [.025, 0], [.02, .02], [0, .02]], '#1a1a1c', {}, z, -.0, 0, 8); }
        Mo.asta(gm, [-.4, .35, 0], [.4, .35, 0], .012, '#1a1a1c', Mo.MET);
        const fly = sub(.36, .4, 0, 0, gm); fly.rotation.z = Math.PI / 2; const r1 = mesh(new THREE.TorusGeometry(.16, .014, 6, 24), '#1a1a1c', fly); r1.rotation.x = Math.PI / 2; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; asta([Math.cos(a) * .02, 0, Math.sin(a) * .02], [Math.cos(a) * .155, 0, Math.sin(a) * .155], .008, '#1a1a1c', fly, true); }
        const ped = Mo.guscio(gm, .5, .02, .24, '#1e1e20', Mo.MET, .02, .006, 0, .1, .05); ped.rotation.x = -.15; Mo.asta(gm, [.36, .4, 0], [.1, .12, .05], .006, '#1a1a1c', Mo.MET); Mo.cavo(gm, [[.36, .56, .0], [.33, .65, .02], [.3, .74, .02]], .004, '#5a3a20');
        Mo.guscio(gm, 1, .04, .55, '#6a4a2a', {}, .015, .01, 0, .7, 0); Mo.guscio(gm, .26, .14, .48, '#5a3a1a', {}, .01, .008, -.35, .56, 0); Mo.lastra(gm, .22, .1, .012, '#6a4a2a', {}, .008, -.35, .63, .245); Mo.tornito(gm, [[0, 0], [.012, 0], [.012, .015], [0, .02]], '#c8a030', Mo.MET, -.35, .63, .255).rotation.x = Math.PI / 2;
        const h = sub(0, .74, 0); h.name = 'testa';
        Mo.guscio(h, .42, .025, .19, '#1a1a1a', { roughness: .35 }, .02, .006);
        const arm = new THREE.Shape(); arm.moveTo(.2, 0); arm.lineTo(.2, .24); arm.quadraticCurveTo(.2, .31, .13, .31); arm.lineTo(-.14, .31); arm.quadraticCurveTo(-.2, .31, -.2, .25); arm.lineTo(-.2, .12); arm.lineTo(-.12, .12); arm.lineTo(-.12, .22); arm.lineTo(.1, .22); arm.quadraticCurveTo(.12, .22, .12, .2); arm.lineTo(.12, 0); arm.lineTo(.2, 0);
        const ag = new THREE.ExtrudeGeometry(arm, { depth: .08, bevelEnabled: true, bevelThickness: .012, bevelSize: .01, bevelSegments: 3, curveSegments: 8 }); ag.translate(0, .025, -.04); const am = mesh(ag, mat('#151515', { roughness: .3 }), h);
        Mo.targa(h, 'ORSA', .1, .03, .0, .285, .055, 0, '#151515', '#c8a030'); Mo.lastra(h, .28, .006, .002, '#c8a030', Mo.MET, .002, 0, .245, .053);
        Mo.tornito(h, [[0, 0], [.075, 0], [.08, .01], [.08, .03], [.06, .035], [.02, .04], [0, .04]], '#2a2a2a', Mo.MET, .22, .21, 0, 18).rotation.z = -Math.PI / 2; Mo.tornito(h, [[.081, 0], [.081, .006], [.07, .006]], '#b8bcc4', Mo.MET, .24, .21, 0).rotation.z = -Math.PI / 2;
        Mo.asta(h, [.06, .335, 0], [.06, .39, 0], .003, STEEL, Mo.MET); Mo.tornito(h, [[.008, 0], [.016, .005], [.016, .04], [.008, .045]], '#e8e0c8', {}, .06, .34, 0);
        Mo.asta(h, [-.17, .14, .0], [-.17, .07, .0], .006, '#b8bcc4', Mo.MET); named(box(.004, .06, .004, -.17, .02, 0, '#c8c8d0', h), 'ago'); Mo.guscio(h, .04, .01, .05, '#b8bcc4', Mo.MET, .008, .003, -.155, .025, .0);
        g.userData.piano = .74;
        break; }
      case 'st_ciclostile': {   // ciclostile a tamburo: trespolo col ripiano della carta, fianchi sagomati, tamburo inchiostrato col telo, manovella, vassoio d'entrata inclinato con la risma, vassoio d'uscita, contacopie
        const Mo = Modella, gm = sub(); gm.name = 'gambe';
        for (const [x, z] of [[-.36, -.24], [.36, -.24], [-.36, .24], [.36, .24]]) Mo.asta(gm, [x, 0, z], [x, .7, z], .016, '#2a2a2c', Mo.MET); Mo.guscio(gm, .8, .03, .55, '#3a3a3c', Mo.MET, .02, .006, 0, .7, 0);
        Mo.guscio(gm, .7, .02, .45, '#3a3a3c', Mo.MET, .02, .005, 0, .2, 0); for (let i = 0; i < 3; i++) Mo.guscio(gm, .3, .04, .4, '#f0ead8', {}, .004, .003, -.15, .22 + i * .042, 0); Mo.guscio(gm, .2, .1, .2, '#1a1a2a', {}, .02, .006, .2, .22, 0);
        const m = sub(0, .73, 0); Mo.guscio(m, .6, .07, .4, '#3a3c40', Mo.MET, .02, .01);
        const fi = new THREE.Shape(); fi.moveTo(-.18, 0); fi.lineTo(.18, 0); fi.lineTo(.14, .2); fi.quadraticCurveTo(0, .36, -.14, .2); fi.lineTo(-.18, 0);
        for (const x of [-.27, .25]) { const e = mesh(new THREE.ExtrudeGeometry(fi, { depth: .03, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 1 }), mat('#4a4c52', Mo.MET), m); e.rotation.y = Math.PI / 2; e.position.set(x, .07, 0); }
        const dr = sub(0, .3, 0, 0, m); dr.rotation.z = Math.PI / 2; named(Mo.tornito(dr, [[.12, -.24], [.12, .24]], '#1a1a2a', {}, 0, 0, 0, 24), 'rullo'); Mo.tornito(dr, [[.122, -.18], [.122, .18]], '#2a2a4a', { roughness: .9 }, 0, 0, 0, 24); for (const y of [-.24, .24]) Mo.tornito(dr, [[0, 0], [.125, 0], [.125, .01], [0, .01]], '#5a5c62', Mo.MET, 0, y - .005, 0, 20);
        Mo.tuboPiegato(m, [[.3, .3, 0], [.36, .3, 0], [.36, .42, .1]], .012, '#5a5c62', Mo.MET, .03); Mo.asta(m, [.36, .42, .1], [.42, .42, .1], .016, '#c82a1e', {});
        const t1 = sub(0, .25, -.27, 0, m); t1.rotation.x = -.4; Mo.guscio(t1, .36, .015, .3, '#8a8a8a', Mo.MET, .01, .004); for (let i = 0; i < 6; i++) Mo.guscio(t1, .3, .004, .26, '#f0ead8', {}, .002, .001, 0, .015 + i * .004, 0);
        Mo.guscio(m, .38, .02, .3, '#8a8a8a', Mo.MET, .01, .004, 0, .06, .32); for (let i = 0; i < 5; i++) Mo.guscio(m, .3, .004, .25, '#f0ead8', {}, .002, .001, (i % 2) * .01, .08 + i * .005, .32); Mo.targa(m, 'VIVA LA RISACCA', .24, .1, 0, .107, .32, 0, '#f0ead8', '#3a3a6a').rotation.x = -Math.PI / 2;
        Mo.guscio(m, .08, .04, .04, '#1a1a1a', {}, .008, .004, -.2, .07, .2); Mo.targa(m, '0347', .05, .02, -.2, .09, .221, 0, '#1a1a1a', '#e8e0c8');
        g.userData.piano = .73;
        break; }
      case 'st_banco_radio': {   // banco della radio: scrivania col cassetto, ricetrasmittente e ricevitore a valvole col quadrante acceso, microfono da tavolo, cuffie, tasto del telegrafo, registro, cavo d'antenna al muro
        const Mo = Modella, P = Pezzi;
        Mo.guscio(g, 1.4, .045, .65, '#5a4030', {}, .01, .008, 0, .72, 0); for (const [x, z] of [[-.64, -.27], [.64, -.27], [-.64, .27], [.64, .27]]) Mo.guscio(g, .05, .72, .05, DARK, Mo.MET, .006, .004, x, 0, z);
        Mo.guscio(g, 1.28, .04, .04, DARK, Mo.MET, .006, .004, 0, .15, -.27); Mo.guscio(g, .5, .1, .55, '#4a3428', {}, .008, .006, .3, .61, 0); Mo.maniglia(g, [.24, .66, .28], [.36, .66, .28], .015, .005, '#2a2a2a', [0, 0, 1]);
        const rv = sub(-.3, .765, -.12); Mo.guscio(rv, .55, .3, .3, '#5a4a3a', {}, .03, .012); Mo.lastra(rv, .3, .12, .01, glow('#e8c890', '#a07030', .9), {}, .01, -.08, .19, .15); for (let i = 0; i < 9; i++) Mo.lastra(rv, .002, .06, .002, '#3a2a1a', {}, .001, -.2 + i * .03, .19, .161); Mo.lastra(rv, .003, .1, .003, '#c8201a', {}, .001, -.05, .19, .163);
        Mo.griglia(rv, .14, .14, 5, 1, .16, .17, .152, '#2a2018'); for (let i = 0; i < 3; i++) Mo.manopola(rv, -.18 + i * .1, .06, .15, .02, '#2a2018');
        named(Mo.lastra(rv, .025, .025, .008, glow('#30ff60', '#30ff60'), {}, .005, .22, .06, .15), 'led'); for (let i = 0; i < 3; i++) Mo.tornito(rv, [[0, 0], [.02, 0], [.022, .05], [.015, .08], [0, .085]], glow('#f0d8a0', '#a06020', .4), {}, -.15 + i * .07, .3, -.06, 10);
        P.ricetrasmittente(g, -.35, 1.065, -.12, .05);
        const mi = sub(.0, .765, .12); Mo.tornito(mi, [[0, 0], [.06, 0], [.055, .015], [.02, .025], [0, .025]], '#2a2a2a', Mo.MET); Mo.asta(mi, [0, .02, 0], [0, .16, .02], .006, '#2a2a2a', Mo.MET); const cap = sub(0, .18, .03, 0, mi); cap.rotation.x = Math.PI / 2 - .3; Mo.tornito(cap, [[0, -.03], [.025, -.03], [.03, 0], [.025, .03], [0, .03]], '#c8c8c8', Mo.MET); Mo.griglia(cap, .04, .04, 3, 3, 0, 0, .031);
        const hp = sub(.2, .765, .1, .4); const arc = mesh(new THREE.TorusGeometry(.085, .008, 6, 16, Math.PI), '#2a2a2a', hp); arc.rotation.x = -Math.PI / 2; arc.position.y = .03; for (const x of [-.085, .085]) Mo.tornito(hp, [[0, 0], [.04, 0], [.042, .02], [.03, .035], [0, .035]], '#1a1a1a', {}, x, .0, 0, 14);
        const ts = sub(.05, .765, .25, .2); Mo.guscio(ts, .12, .02, .07, '#2a2a2a', {}, .01, .005); Mo.lastra(ts, .08, .008, .012, '#b8902a', Mo.MET, .003, .01, .028, 0).rotation.x = -Math.PI / 2; Mo.tornito(ts, [[0, 0], [.014, 0], [.016, .01], [0, .014]], '#1a1a1a', {}, .05, .03, 0);
        const lb = sub(.45, .765, .15, -.2); Mo.guscio(lb, .22, .025, .3, '#3a2a5a', {}, .008, .004); Mo.targa(lb, 'REGISTRO\nFREQUENZE', .14, .1, 0, .026, 0, 0, '#3a2a5a', '#e8e0c8').rotation.x = -Math.PI / 2;
        Mo.cavo(g, [[-.3, 1.07, -.27], [-.1, 1.15, -.33], [.4, 1.5, -.33], [.6, 1.8, -.33]], .006, '#1a1a1a'); Mo.guscio(g, .06, .06, .03, '#3a3a3a', {}, .01, .004, .6, 1.78, -.33);
        break; }
      case 'st_camera_oscura': {   // camera oscura: tavolo con le tre bacinelle (sviluppo, arresto, fissaggio) e le pinze, ingranditore sulla colonna con la manovella e il soffietto, timer, bottiglie dei bagni, luce rossa, foto stese
        const Mo = Modella;
        Mo.guscio(g, 1.4, .045, .65, '#2a2a2c', {}, .01, .008, 0, .8, 0); for (const [x, z] of [[-.64, -.27], [.64, -.27], [-.64, .27], [.64, .27]]) Mo.guscio(g, .05, .8, .05, '#2a2a2c', Mo.MET, .006, .004, x, 0, z); Mo.guscio(g, 1.3, .03, .55, '#2a2a2c', {}, .008, .006, 0, .25, 0);
        [['#8a7a3a', .05], ['#6a6a6a', .32], ['#3a6a7a', .59]].forEach(([c, x], i) => { Mo.guscio(g, .25, .05, .32, ['#c84a3a', '#e8e4d8', '#3a6ab0'][i], { roughness: .4 }, .02, .008, x, .845, .1); Mo.guscio(g, .22, .006, .29, c, { roughness: .1 }, .02, .002, x, .878, .1); });
        Mo.lastra(g, .08, .1, .002, '#f0ece0', {}, .002, .32, .884, .1).rotation.x = -Math.PI / 2; for (let i = 0; i < 2; i++) { const pz = sub(.19 + i * .27, .9, .22, .3); Mo.asta(pz, [0, 0, 0], [.12, .04, 0], .004, '#c8c8c8', Mo.MET); Mo.asta(pz, [0, .01, 0], [.12, .02, .01], .004, '#c8c8c8', Mo.MET); }
        const e = sub(-.42, .845, -.08); Mo.guscio(e, .36, .03, .42, '#e8e4d8', {}, .015, .006, 0, 0, .06); Mo.guscio(e, .2, .003, .26, '#f8f4ec', {}, .003, .001, 0, .03, .08);
        Mo.tornito(e, [[0, 0], [.025, 0], [.025, .85], [0, .85]], '#5a5c62', Mo.MET, 0, .03, -.13, 12); Mo.guscio(e, .08, .1, .1, '#2a2a2a', Mo.MET, .015, .006, 0, .5, -.1); Mo.manopola(e, .06, .55, -.1, .02);
        Mo.guscio(e, .22, .16, .2, '#2a2a2a', Mo.MET, .03, .01, 0, .48, .0); Mo.tornito(e, [[.06, 0], [.08, .04], [.08, .1], [.05, .12]], '#1a1a1a', Mo.MET, 0, .64, 0, 16);
        for (let i = 0; i < 5; i++) Mo.guscio(e, .14 - i * .01, .02, .14 - i * .01, i % 2 ? '#1a1a1a' : '#2a2a2a', {}, .01, .004, 0, .46 - i * .02, 0); Mo.tornito(e, [[0, 0], [.035, 0], [.035, .06], [.03, .08], [0, .08]], '#1a1a1a', Mo.MET, 0, .3, 0, 14);
        const tm = sub(-.05, .845, -.2); Mo.guscio(tm, .12, .12, .07, '#3a3a3a', {}, .02, .008); Mo.quadrante(tm, 0, .065, .035, .04, 'min');
        for (let i = 0; i < 3; i++) { Mo.tornito(g, [[0, 0], [.04, 0], [.04, .14], [.025, .18], [.015, .2], [0, .2]], ['#6a3a1a', '#3a3a3a', '#6a3a1a'][i], { roughness: .2 }, .25 + i * .1, .845, -.22, 14); Mo.targa(g, ['SVIL.', 'ARR.', 'FISS.'][i], .05, .04, .25 + i * .1, .92, -.18, 0, '#f0ead8', '#1a1a1a'); }
        Mo.guscio(g, .14, .1, .08, '#2a2a2a', {}, .02, .008, .2, 1.8, -.3); named(Mo.lastra(g, .1, .07, .01, glow('#ff2a2a', '#ff1010', 1.6), {}, .01, .2, 1.85, -.26), 'luce'); Mo.asta(g, [.2, 1.9, -.3], [.2, 2.1, -.33], .006, '#2a2a2a', Mo.MET);
        Mo.asta(g, [-.7, 1.6, -.3], [.7, 1.6, -.3], .002, '#c8c8c8', {}); for (let i = 0; i < 4; i++) { Mo.lastra(g, .13, .17, .002, i % 2 ? '#d8d0c0' : '#c8c0b0', {}, .002, -.5 + i * .3, 1.5, -.3); Mo.guscio(g, .015, .04, .012, '#c8a060', {}, .003, .002, -.5 + i * .3, 1.57, -.3); }
        break; }
      case 'st_tavolo_medico': {   // lettino da visita: telaio di tubo cromato con le ruote, materasso imbottito trapuntato con lo schienale alzato, rotolo di carta, armadietto a vetri coi flaconi, lampada a stelo, sgabello
        const Mo = Modella;
        for (const z of [-.28, .28]) { Mo.tuboPiegato(g, [[-.85, .05, z], [-.85, .7, z], [.85, .7, z], [.85, .05, z]], .02, STEEL, Mo.MET, .06); Mo.asta(g, [-.85, .3, z], [.85, .3, z], .014, STEEL, Mo.MET); }
        for (const x of [-.85, .85]) { Mo.asta(g, [x, .3, -.28], [x, .3, .28], .014, STEEL, Mo.MET); for (const z of [-.28, .28]) Mo.ruota(g, .04, .025, x, .04, z, '#3a3a3a'); }
        Mo.guscio(g, 1.3, .1, .6, '#4a7a72', { roughness: .6 }, .05, .04, .25, .72, 0); for (let i = 1; i < 6; i++) Mo.guscio(g, .006, .101, .602, '#3a6a62', {}, .002, .001, -.4 + i * .217, .72, 0);
        const bk = sub(-.42, .76, 0); bk.rotation.z = -.45; Mo.guscio(bk, .55, .1, .6, '#4a7a72', { roughness: .6 }, .05, .04, -.27, -.05, 0); Mo.asta(g, [-.6, .72, -.22], [-.8, .9, -.22], .012, STEEL, Mo.MET); Mo.asta(g, [-.6, .72, .22], [-.8, .9, .22], .012, STEEL, Mo.MET);
        Mo.guscio(g, 1.5, .004, .42, '#f4f2ea', {}, .004, .001, .3, .825, 0); const ro = sub(.98, .76, 0); ro.rotation.x = Math.PI / 2; Mo.tornito(ro, [[.015, -.22], [.06, -.22], [.06, .22], [.015, .22]], '#f4f2ea', {}, 0, 0, 0, 16); Mo.asta(g, [.98, .76, -.25], [.98, .76, .25], .008, STEEL, Mo.MET);
        const a = sub(1.1, 0, -.35); Mo.guscio(a, .45, .95, .32, '#e8e8e0', {}, .015, .008); Mo.guscio(a, .47, .03, .34, '#d8d8d0', {}, .01, .006, 0, .95, 0);
        Mo.lastra(a, .4, .46, .01, mat('#c8e0e8', { transparent: true, opacity: .4, roughness: .05 }), null, .01, 0, .7, .165); Mo.lastra(a, .41, .012, .012, '#b8b8b0', {}, .004, 0, .47, .165); for (const y of [.55, .78]) Mo.guscio(a, .4, .012, .28, '#d8d8d0', {}, .004, .003, 0, y, 0);
        for (let i = 0; i < 5; i++) Mo.tornito(a, [[0, 0], [.025, 0], [.025, .08], [.012, .1], [.012, .11], [0, .11]], ['#8a4a2a', '#e8e8e8', '#3a5a8a', '#6a3a1a', '#e8e8e8'][i], { roughness: .2 }, -.14 + i * .07, .562, .02, 12);
        Mo.lastra(a, .4, .38, .012, '#d8d8d0', {}, .01, 0, .22, .165); Mo.targa(a, '+', .06, .06, 0, .3, .172, 0, '#d8d8d0', '#c82a1e'); Mo.maniglia(a, [.1, .3, .172], [.1, .4, .172], .015, .004, STEEL, [0, 0, 1]);
        break; }
      case 'st_alambicco': {   // alambicco di rame chiodato su fornello di mattoni: caldaia con le fasce, cappello a cipolla, collo di cigno che scende nel tino del serpentino, rubinetto, damigiana impagliata, legna sotto
        const Mo = Modella, RA = { metalness: .35, roughness: .35 }, CU = '#b86a3a';
        Mo.guscio(g, .64, .4, .62, BRICK, {}, .03, .015, -.15, 0, 0); Mo.guscio(g, .68, .04, .66, '#5a4a40', {}, .02, .01, -.15, .4, 0);
        Mo.lastra(g, .28, .2, .02, '#1a1612', {}, .03, -.15, .16, .31); named(Mo.lastra(g, .22, .12, .01, glow('#ff7a2a', '#ff4a10', 1.5), {}, .02, -.15, .14, .315), 'fiamma'); for (let i = 0; i < 3; i++) Mo.asta(g, [-.28, .05 + i * .04, .36], [-.02, .05 + i * .04, .36], .025, '#6a4a2a', {});
        Mo.tornito(g, [[0, 0], [.22, 0], [.26, .04], [.27, .2], [.26, .33], [.2, .38]], CU, RA, -.15, .44, 0, 22); for (const y of [.54, .7]) { const t = mesh(new THREE.TorusGeometry(.272, .008, 4, 24), mat('#8a4a2a', RA)); t.rotation.x = Math.PI / 2; t.position.set(-.15, y, 0); }
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; Mo.put(g, new THREE.SphereGeometry(.006, 6, 4), '#7a4020', RA, -.15 + Math.cos(a) * .274, .62, Math.sin(a) * .274); }
        Mo.tornito(g, [[.2, 0], [.16, .06], [.2, .14], [.18, .22], [.1, .3], [.05, .34], [.04, .38], [0, .39]], '#c87a4a', RA, -.15, .82, 0, 22);
        Mo.tuboPiegato(g, [[-.13, 1.18, 0], [.05, 1.2, 0], [.3, 1.0, .04], [.42, .75, .04], [.42, .62, .04]], .022, '#c87a4a', RA, .12);
        Mo.tornito(g, [[0, 0], [.18, 0], [.2, .3], [.19, .58], [0, .58]], '#7a5634', {}, .42, 0, .04, 18); for (const y of [.08, .3, .5]) { const t = mesh(new THREE.TorusGeometry(.19 + y * .02, .01, 4, 20), IRON); t.rotation.x = Math.PI / 2; t.position.set(.42, y, .04); }
        Mo.put(g, new THREE.CircleGeometry(.185, 18), mat('#3a5a6a', { roughness: .1 }), {}, .42, .56, .04).rotation.x = -Math.PI / 2; for (let i = 0; i < 2; i++) { const t = mesh(new THREE.TorusGeometry(.1, .012, 6, 16), mat('#c87a4a', RA)); t.rotation.x = Math.PI / 2; t.position.set(.42, .56 + i * .025, .04); }
        Mo.tuboPiegato(g, [[.6, .12, .1], [.68, .12, .14], [.68, .07, .16]], .012, '#c87a4a', RA, .02); Mo.manopola(g, .64, .14, .12, .012, '#c87a4a');
        Mo.tornito(g, [[0, 0], [.1, .01], [.13, .08], [.12, .16], [.05, .22], [.025, .25], [.025, .29], [0, .29]], mat('#4a7a5a', { transparent: true, opacity: .75, roughness: .15 }), null, .68, 0, .32, 18); const pg = Mo.tornito(g, [[0, 0], [.105, .01], [.135, .08], [.125, .16], [0, .17]], '#c8a860', { roughness: 1 }, .68, 0, .32, 18); pg.material.userData.sup = 'tessuto';
        for (let i = 0; i < 4; i++) Mo.tornito(g, [[.03, 0], [.035, .01], [.035, .38], [.03, .39]], '#6a4a2a', {}, -.55 + (i % 2) * .08, .03 + (i > 1 ? .07 : 0), -.1 + i * .06, 8).rotation.z = Math.PI / 2;
        break; }
      case 'st_stufa': {   // stufa di ghisa: piedi a zampa, corpo con le cornici fuse, sportello con la finestrella della fiamma e la maniglia, cassetto della cenere, piastra coi cerchi, tubo a gomito verso il muro, bollitore, ciocchi
        const Mo = Modella, GH = '#2a2a2c';
        for (const [x, z] of [[-.24, -.2], [.24, -.2], [-.24, .2], [.24, .2]]) Mo.tornito(g, [[0, 0], [.04, 0], [.025, .04], [.03, .1], [.04, .14], [0, .14]], '#1e1e20', Mo.MET, x, 0, z, 10);
        Mo.guscio(g, .6, .55, .5, GH, Mo.MET, .03, .012, 0, .14, 0); for (const y of [.2, .62]) Mo.guscio(g, .64, .03, .54, '#1e1e20', Mo.MET, .03, .01, 0, y, 0); Mo.guscio(g, .66, .04, .56, '#1e1e20', Mo.MET, .03, .012, 0, .69, 0);
        for (const r of [.1, .07]) { const t = mesh(new THREE.TorusGeometry(r, .006, 4, 20), '#151517'); t.rotation.x = Math.PI / 2; t.position.set(-.12, .735, 0); }
        Mo.lastra(g, .38, .3, .02, '#3a3a3c', Mo.MET, .03, 0, .4, .25); named(Mo.lastra(g, .2, .12, .01, glow('#ff6a2a', '#ff3a10', 1.6), {}, .02, 0, .43, .265), 'fiamma'); Mo.griglia(g, .24, .16, 1, 5, 0, .43, .272, '#151517');
        Mo.cerniera(g, -.19, .4, .27, .25); Mo.tuboPiegato(g, [[.17, .36, .27], [.21, .36, .3], [.21, .46, .3], [.17, .46, .27]], .008, '#9a9ea6', Mo.MET, .02);
        Mo.lastra(g, .34, .07, .02, '#3a3a3c', Mo.MET, .01, 0, .2, .25); Mo.maniglia(g, [-.05, .2, .272], [.05, .2, .272], .015, .005, '#9a9ea6', [0, 0, 1]);
        Mo.tornito(g, [[.07, 0], [.07, .78], [.08, .78], [.08, .82], [.07, .82]], GH, Mo.MET, 0, .73, -.1, 16); const el = mesh(new THREE.TorusGeometry(.12, .07, 10, 14, Math.PI / 2), mat(GH, Mo.MET)); el.rotation.y = -Math.PI / 2; el.position.set(0, 1.55, -.22); Mo.tornito(g, [[.07, 0], [.07, .3], [.09, .3], [.09, .32]], GH, Mo.MET, 0, 1.67, -.22).rotation.x = -Math.PI / 2;
        Mo.tornito(g, [[0, 0], [.085, 0], [.095, .04], [.09, .09], [.05, .12], [.02, .125], [0, .125]], '#8a8e96', { metalness: .3, roughness: .35 }, .16, .73, .1, 18); Mo.tuboPiegato(g, [[.11, .85, .1], [.14, .9, .1], [.2, .9, .1], [.22, .85, .1]], .006, '#2a2a2a', {}, .02); Mo.asta(g, [.24, .78, .1], [.33, .86, .1], .01, '#8a8e96', Mo.MET);
        for (let i = 0; i < 5; i++) { const lg = Mo.tornito(g, [[.05, 0], [.06, .01], [.06, .4], [.05, .41]], '#6a4a2a', {}, .55, .06 + (i > 2 ? .11 : 0), -.15 + (i % 3) * .12 + (i > 2 ? .06 : 0), 8); lg.rotation.x = Math.PI / 2; lg.position.z -= .2; }
        break; }
      case 'st_forno': {   // forno a legna: basamento di pietra con la legnaia, cupola di mattoni a corsi, bocca ad arco con lo sportello appoggiato e la brace, canna fumaria, pala e attizzatoio
        const Mo = Modella;
        Mo.guscio(g, 1.5, .85, 1.3, '#a89a88', {}, .04, .02); for (let i = 1; i < 4; i++) Mo.guscio(g, 1.505, .006, 1.305, '#8a7c6a', {}, .04, .002, 0, i * .21, 0);
        Mo.lastra(g, 1.1, .5, .02, '#2a2420', {}, .04, 0, .35, .655); for (let i = 0; i < 6; i++) { const lg = Mo.tornito(g, [[.05, 0], [.06, .01], [.06, .88], [.05, .89]], '#6a4a2a', {}, -.44 + (i % 3) * .3 + (i > 2 ? .15 : 0), .15 + (i > 2 ? .11 : 0), .2, 8); lg.rotation.z = Math.PI / 2; lg.position.x += .44; }
        Mo.guscio(g, 1.58, .07, 1.38, '#8a7c6a', {}, .04, .02, 0, .85, 0);
        Mo.tornito(g, [[.62, 0], [.6, .12], [.55, .26], [.45, .38], [.32, .45], [.15, .49], [0, .5]], BRICK, {}, 0, .92, -.05, 22);
        for (let i = 1; i < 5; i++) { const t = mesh(new THREE.TorusGeometry(.6 - i * i * .025, .006, 4, 28), '#6a4030'); t.rotation.x = Math.PI / 2; t.position.set(0, .92 + i * .1, -.05); }
        Mo.guscio(g, .6, .5, .32, BRICK, {}, .02, .015, 0, .92, .5);
        const arc = new THREE.Shape(); arc.moveTo(-.2, 0); arc.lineTo(.2, 0); arc.lineTo(.2, .2); arc.absarc(0, .2, .2, 0, Math.PI, false); arc.lineTo(-.2, 0);
        const bo = mesh(new THREE.ExtrudeGeometry(arc, { depth: .02, bevelEnabled: false }), '#120c08'); bo.position.set(0, .93, .655); named(Mo.lastra(g, .3, .08, .01, glow('#ff7a2a', '#ff4a10', 1.4), {}, .02, 0, .97, .664), 'fiamma');
        const ar2 = new THREE.Shape(); ar2.absarc(0, .2, .26, 0, Math.PI, false); ar2.lineTo(-.2, .2); ar2.absarc(0, .2, .2, Math.PI, 0, true); ar2.lineTo(.26, .2); const ce = mesh(new THREE.ExtrudeGeometry(ar2, { depth: .03, bevelEnabled: true, bevelThickness: .005, bevelSize: .005, bevelSegments: 1 }), '#7a4434'); ce.position.set(0, .93, .65);
        Mo.guscio(g, .64, .06, .36, '#7a4a34', {}, .02, .01, 0, 1.42, .5);
        Mo.tornito(g, [[.1, 0], [.1, .55], [.13, .55], [.13, .62], [.1, .62], [.1, .72]], BRICK, {}, .3, 1.2, -.3, 12); Mo.guscio(g, .3, .05, .3, '#7a4a34', {}, .02, .01, .3, 1.92, -.3);
        const sp = sub(.68, 0, .75, -.2); Mo.lastra(sp, .4, .32, .02, '#2a2a2c', Mo.MET, .02, -.75, .16, -.06).rotation.x = -.15; Mo.maniglia(sp, [-.8, .25, -.02], [-.7, .25, -.02], .03, .006, '#5a5a5a', [0, 0, 1]);
        Mo.asta(g, [.68, .02, .74], [.62, 1.35, .7], .016, WOOD2, {}); const pa = sub(.68, .02, .755); Mo.lastra(pa, .26, .3, .012, WOOD2, {}, .06, 0, .15, 0).rotation.x = .02;
        Mo.asta(g, [.78, .02, .66], [.72, 1.1, .64], .008, '#2a2a2c', Mo.MET);
        break; }
      case 'st_cassetta': {   // cassetta degli attrezzi grande a due vassoi: la stessa dei covi, un po' più grande
        const c = Pezzi.cassetta(g, 0, 0, 0, 0, RED); c.scale.setScalar(1.1);
        break; }
      case 'st_cassaforte': {   // cassaforte: corpo con gli spigoli smussati, zoccolo, sportello incassato con la cornice, cerniere a barilotto, combinazione con la ghiera numerata, volantino a tre razze, targhetta del fabbricante, bulloni
        const Mo = Modella, C = '#33443e', o = { metalness: .3, roughness: .5 };
        Mo.guscio(g, .76, .06, .66, '#22302a', {}, .02, .01); Mo.guscio(g, .74, .84, .64, C, o, .04, .02, 0, .06, 0);
        Mo.lastra(g, .66, .76, .015, '#22302a', {}, .02, 0, .48, .32); Mo.lastra(g, .6, .7, .03, '#3e5048', o, .02, 0, .48, .325);
        for (const y of [.25, .7]) { Mo.tornito(g, [[0, 0], [.025, 0], [.025, .1], [0, .1]], '#22302a', o, -.33, y - .05, .345, 12); }
        const cb = sub(.12, .58, .355); cb.rotation.x = Math.PI / 2; Mo.tornito(cb, [[0, 0], [.08, 0], [.08, .015], [.07, .02]], '#b8a060', Mo.MET, 0, 0, 0, 24); Mo.tornito(cb, [[0, 0], [.055, 0], [.06, .02], [.045, .035], [0, .035]], '#c8b070', Mo.MET, 0, .02, 0, 18);
        for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; Mo.put(cb, new THREE.BoxGeometry(.002, .002, .012), '#1a1a1a', {}, Math.cos(a) * .072, .017, Math.sin(a) * .072).rotation.y = -a; }
        const vo = sub(-.12, .42, .36); vo.rotation.x = Math.PI / 2; Mo.tornito(vo, [[0, 0], [.03, 0], [.03, .04], [0, .045]], '#c8b070', Mo.MET); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + .5, ar = Mo.asta(vo, [0, .03, 0], [Math.cos(a) * .1, .03, Math.sin(a) * .1], .009, '#c8b070', Mo.MET); Mo.put(vo, new THREE.SphereGeometry(.016, 8, 6), '#c8b070', Mo.MET, Math.cos(a) * .1, .03, Math.sin(a) * .1); }
        Mo.lastra(g, .26, .06, .006, '#c8b070', Mo.MET, .01, 0, .8, .356); Mo.targa(g, 'F.LLI CONTI\nTORINO', .22, .045, 0, .8, .361, 0, '#c8b070', '#2a2010');
        Mo.bulloni(g, [-.27, .15, .356], [.27, .15, .356], 4, 'z', .008); Mo.bulloni(g, [-.27, .86, .356], [-.27, .86, .356], 1, 'z', .008); Mo.bulloni(g, [.27, .86, .356], [.27, .86, .356], 1, 'z', .008);
        break; }
      case 'st_rastrelliera': {   // rastrelliera aperta: fianchi e cappello, zoccolo coi calci incassati, rastrello a denti, quattro fucili veri (calcio, otturatore, caricatore, canna), barra di chiusura col lucchetto, cartello
        const Mo = Modella, V = '#4a5040';
        for (const x of [-.68, .68]) Mo.guscio(g, .05, 1.6, .4, V, {}, .01, .008, x, 0, 0); Mo.guscio(g, 1.44, .05, .42, '#3a4030', {}, .01, .01, 0, 1.6, 0); Mo.guscio(g, 1.36, 1.3, .02, '#3a4030', {}, .005, .004, 0, .15, -.19);
        Mo.guscio(g, 1.36, .14, .32, V, {}, .01, .008, 0, 0, 0); for (let i = 0; i < 4; i++) Mo.guscio(g, .1, .02, .07, '#2a3020', {}, .01, .004, -.45 + i * .3, .13, .04);
        Mo.guscio(g, 1.36, .05, .14, V, {}, .01, .008, 0, 1.12, .1); for (let i = 0; i < 5; i++) Mo.guscio(g, .06, .05, .14, '#3a4030', {}, .008, .004, -.6 + i * .3, 1.12, .1);
        for (let i = 0; i < 4; i++) { const f = sub(-.45 + i * .3, .14, .05); f.rotation.z = (i - 1.5) * .015;
          const ca = new THREE.Shape(); ca.moveTo(-.03, 0); ca.lineTo(.03, 0); ca.lineTo(.025, .3); ca.lineTo(.018, .36); ca.lineTo(-.018, .36); ca.lineTo(-.03, .26); ca.lineTo(-.03, 0); const cm = mesh(new THREE.ExtrudeGeometry(ca, { depth: .04, bevelEnabled: true, bevelThickness: .005, bevelSize: .004, bevelSegments: 1 }), '#5a3a20', f); cm.position.z = -.02;
          Mo.guscio(f, .035, .2, .045, '#2a2a2e', Mo.MET, .006, .004, 0, .36, 0); Mo.guscio(f, .025, .12, .035, '#2a2a2e', Mo.MET, .006, .004, 0, .45, .035).rotation.x = .15; Mo.asta(f, [.02, .48, 0], [.04, .47, 0], .004, '#2a2a2e', Mo.MET);
          Mo.guscio(f, .032, .2, .036, '#6a4a2a', {}, .008, .005, 0, .56, 0); Mo.asta(f, [0, .76, 0], [0, 1.22, 0], .011, '#2a2a2e', Mo.MET); Mo.asta(f, [0, .74, .02], [0, 1.0, .02], .005, '#2a2a2e', Mo.MET); }
        Mo.guscio(g, 1.42, .03, .03, '#2a2a2a', Mo.MET, .006, .004, 0, .72, .2); Mo.guscio(g, .07, .08, .035, '#c8a040', Mo.MET, .01, .005, .55, .66, .22); Mo.tuboPiegato(g, [[.535, .74, .22], [.535, .77, .22], [.565, .77, .22], [.565, .74, .22]], .005, STEEL, Mo.MET, .01);
        Mo.targa(g, 'ARMERIA', .3, .07, 0, 1.4, -.175, 0, '#e8e0c8', '#3a4030');
        break; }
      default: return null;
    }
    return typeof Superfici !== 'undefined' ? Superfici.vesti(g) : g;
  }
  // il caricatore dei mobili: le postazioni le disegniamo noi, il resto viene dal kit
  const iv2 = setInterval(() => {
    if (typeof Models === 'undefined' || !Models.furniture) return; clearInterval(iv2);
    const f0 = Models.furniture;
    Models.furniture = name => { if (/^st_/.test(name)) { const m = stModel(name); return Promise.resolve(m); } return f0(name); };
  }, 200);

  return { open, close, render, state: U, stModel };
})();
