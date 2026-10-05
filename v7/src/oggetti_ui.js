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
    const g = new THREE.Group(), M = {};
    const mat = c => M[c] || (M[c] = new THREE.MeshStandardMaterial({ color: c, roughness: .85, metalness: /^#[3-6]/.test(c) ? .35 : .05 }));
    const box = (w, h, d, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    const cyl = (r, h, x, y, z, c, rx) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), mat(c)); m.position.set(x, y + (rx ? 0 : h / 2), z); if (rx) m.rotation.x = Math.PI / 2; m.castShadow = true; g.add(m); return m; };
    const legs = (w, d, h, c) => { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(.07, h, .07, a * (w / 2 - .06), 0, b * (d / 2 - .06), c)); };
    const WOOD = '#7a5634', DARK = '#3a3632', IRON = '#4a4c52', RED = '#8a2a22', GREEN = '#3a5a44';
    switch (name) {
      case 'st_forgia': box(1.2, .8, .9, -.1, 0, 0, '#5a4a40'); box(1, .08, .7, -.1, .8, 0, '#2a2420'); { const f = box(.6, .06, .4, -.1, .86, 0, '#ff5a1a'); f.material = new THREE.MeshStandardMaterial({ color: '#ff6a2a', emissive: '#ff4a10', emissiveIntensity: 1.4 }); }
        box(.5, 1.2, .5, -.1, .9, -.2, '#4a4038'); box(.2, .9, .2, -.1, 2.1, -.2, '#3a3430'); cyl(.18, .5, .55, 0, .25, '#4a3a2a'); box(.5, .14, .2, .55, .5, .25, IRON); box(.2, .1, .14, .78, .54, .25, IRON); break;
      case 'st_saldatrice': box(.5, .55, .4, 0, 0, 0, '#2a5a8a'); box(.3, .1, .05, 0, .38, .21, '#1a1a1a'); cyl(.05, .6, .2, 0, .25, '#1a1a1a'); cyl(.11, .9, -.25, 0, -.05, '#3a6a3a'); break;
      case 'st_banco_lavoro': box(1.8, .08, .75, 0, .86, 0, WOOD); legs(1.8, .75, .86, WOOD); box(1.7, .05, .65, 0, .25, 0, WOOD); box(.18, .16, .22, .7, .94, .2, IRON); box(1.6, .7, .04, 0, .95, -.36, '#5a4a3a');
        [[-.6, '#8a8a90'], [-.35, '#b84a2a'], [-.1, '#8a8a90'], [.15, '#3a6ab8']].forEach(([x, c]) => box(.04, .3, .03, x, 1.2, -.32, c)); break;
      case 'st_banco_falegname': box(2, .1, .7, 0, .82, 0, '#a07848'); legs(2, .7, .82, '#8a6438'); box(1.9, .06, .6, 0, .22, 0, '#8a6438'); box(.25, .2, .12, -.85, .9, .3, '#6a4a2a'); box(.6, .08, .12, .3, .92, .1, '#d8b080'); box(.5, .03, .14, -.2, .92, -.15, '#c0c0c8'); break;
      case 'st_banco_macellaio': box(1.6, .12, .75, 0, .8, 0, '#c8b8a0'); legs(1.6, .75, .8, '#c8c8c8'); box(.5, .1, .4, .3, .92, 0, '#8a2a2a'); box(.03, .25, .1, -.5, .92, 0, '#c8c8d0'); box(1.5, .5, .04, 0, 1.2, -.36, '#d8d8d8'); break;
      case 'st_macchina_cucire': box(1, .06, .55, 0, .74, 0, '#6a4a2a'); legs(1, .55, .74, '#2a2a2a'); box(.4, .18, .18, 0, .8, 0, '#1a1a1a'); box(.08, .26, .16, .17, .98, 0, '#1a1a1a'); box(.35, .08, .14, .03, 1.2, 0, '#1a1a1a'); cyl(.06, .02, -.2, .9, .1, '#c0a040', 1); break;
      case 'st_ciclostile': box(.9, .7, .6, 0, 0, 0, '#3a3a3a'); box(.7, .35, .45, 0, .7, 0, '#5a5a5a'); cyl(.14, .6, 0, .95, 0, '#2a2a2a', 0).rotation.z = Math.PI / 2; box(.3, .02, .35, -.45, .78, 0, '#f0ead8'); box(.25, .12, .3, .45, .7, 0, '#e8e4dc'); break;
      case 'st_banco_radio': box(1.4, .06, .65, 0, .74, 0, '#5a4a3a'); legs(1.4, .65, .74, '#3a3a3a'); box(.5, .3, .3, -.3, .8, -.12, '#4a5a4a'); box(.1, .1, .02, -.42, .9, .04, '#e8c040'); box(.1, .1, .02, -.2, .9, .04, '#c8c8c8');
        box(.3, .05, .2, .35, .8, .1, GREEN); cyl(.015, .25, .45, .8, -.1, '#c8c8c8'); { const l = box(.06, .06, .02, -.3, 1.02, .03, '#ff3030'); l.material = new THREE.MeshStandardMaterial({ color: '#ff3030', emissive: '#ff2020', emissiveIntensity: 1.2 }); } break;
      case 'st_camera_oscura': box(1.4, .06, .65, 0, .8, 0, '#2a2a2a'); legs(1.4, .65, .8, '#2a2a2a'); cyl(.04, .7, -.35, .86, -.15, '#5a5a5a'); box(.25, .2, .25, -.35, 1.4, -.1, '#3a3a3a'); [0, .25, .5].forEach(x => box(.22, .05, .3, x, .86, .1, '#4a4a6a')); break;
      case 'st_tavolo_medico': box(1.9, .1, .7, 0, .78, 0, '#d8d8d0'); legs(1.9, .7, .78, '#9a9aa0'); box(.6, .12, .55, -.6, .88, 0, '#8ab0a8'); box(.4, .9, .35, .9, 0, -.3, '#e8e8e0'); box(.12, .08, .02, .9, .7, -.12, RED); break;
      case 'st_alambicco': cyl(.28, .5, 0, 0, 0, '#b86a3a'); cyl(.18, .3, 0, .5, 0, '#c87a4a'); cyl(.03, .7, .3, 1, 0, '#c87a4a', 1).rotation.z = .9; cyl(.15, .5, .55, 0, .1, '#8a5a3a'); box(.35, .12, .35, 0, 0, 0, '#3a2a20'); break;
      case 'st_stufa': box(.6, .7, .55, 0, 0, 0, '#2a2a2c'); box(.4, .25, .02, 0, .2, .28, '#3a3a3c'); { const f = box(.3, .12, .02, 0, .25, .29, '#ff5a1a'); f.material = new THREE.MeshStandardMaterial({ color: '#ff6a2a', emissive: '#ff3a10', emissiveIntensity: 1 }); } cyl(.08, 1.6, 0, .7, -.12, '#3a3a3c'); break;
      case 'st_forno': box(1.5, .9, 1.1, 0, 0, 0, '#a07860'); box(1.4, .5, 1, 0, .9, 0, '#b08870'); { const f = box(.5, .3, .02, 0, .5, .56, '#ff7a2a'); f.material = new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff4a10', emissiveIntensity: 1.1 }); } box(.3, .6, .3, .4, 1.4, -.3, '#8a6850'); box(.1, .02, .9, -.6, .9, .8, WOOD); break;
      case 'st_cassetta': box(.55, .25, .3, 0, 0, 0, RED); box(.57, .04, .32, 0, .25, 0, '#a83a30'); box(.2, .04, .04, 0, .3, 0, DARK); break;
      case 'st_cassaforte': box(.75, .9, .65, 0, 0, 0, '#3a4a44'); box(.6, .75, .02, 0, .08, .33, '#4a5a54'); cyl(.08, .04, .1, .5, .35, '#c0b080', 1); box(.04, .2, .04, -.15, .4, .36, '#c0b080'); break;
      case 'st_rastrelliera': box(1.4, 1.6, .4, 0, 0, 0, '#4a5040'); box(1.3, 1.4, .02, 0, .1, .2, '#3a4030'); [-.45, -.15, .15, .45].forEach(x => box(.08, 1, .06, x, .3, .17, '#2a2a2a')); break;
      default: return null;
    }
    return g;
  }
  // il caricatore dei mobili: le postazioni le disegniamo noi, il resto viene dal kit
  const iv2 = setInterval(() => {
    if (typeof Models === 'undefined' || !Models.furniture) return; clearInterval(iv2);
    const f0 = Models.furniture;
    Models.furniture = name => { if (/^st_/.test(name)) { const m = stModel(name); return Promise.resolve(m); } return f0(name); };
  }, 200);

  return { open, close, render, state: U, stModel };
})();
