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
      case 'st_forgia': {   // focolare in mattoni col bacino delle braci, cappa a tronco di piramide e canna fumaria, mantice di cuoio sul fianco
        box(1.2, .78, .9, 0, 0, 0, BRICK); for (let i = 0; i < 6; i++) box(1.21, .012, .91, 0, .12 + i * .12, 0, '#7a4a34');
        box(1.26, .06, .96, 0, .78, 0, '#5a4a40'); box(.7, .05, .5, 0, .8, .05, '#2a2420');
        named(box(.6, .04, .42, 0, .82, .05, glow('#ff6a2a', '#ff4a10', 1.4)), 'brace'); for (let i = 0; i < 7; i++) ball(.05, -.22 + (i % 4) * .14, .87, -.08 + Math.floor(i / 4) * .2, '#1a1612');
        box(.5, .32, .5, 0, 0, .41, '#2a2420'); box(.36, .2, .02, 0, .06, .66, '#1a1612');                                             // la bocca della cenere davanti
        box(1.2, .9, .12, 0, .84, -.39, BRICK);                                                                                       // il muretto dietro
        const hood = mesh(new THREE.CylinderGeometry(.18, .62, .55, 4, 1), '#3a3430'); hood.rotation.y = Math.PI / 4; hood.scale.set(1, 1, .8); hood.position.set(0, 1.74 + .275, -.08);
        for (const x of [-.5, .5]) asta([x, .84, .38], [x * .9, 1.76, .3], .04, '#2a2a2e');   // i ferri che reggono la cappa
        box(.3, .9, .3, 0, 2.28, -.1, '#3a3430'); box(.36, .06, .36, 0, 3.12, -.1, '#2a2420');
        const mt = sub(-.75, .55, .1, 0); mt.rotation.z = .25; box(.08, .04, .5, 0, 0, 0, WOOD, mt); box(.06, .2, .4, 0, -.12, 0, '#6a4a30', mt); box(.08, .04, .5, 0, -.24, 0, WOOD, mt); box(.04, .04, .3, 0, -.12, -.35, '#3a3a3a', mt);
        asta([-.67, .45, -.25], [-.5, .7, -.25], .03, '#3a3a3a', g, true); box(.08, .55, .08, -.75, 0, .1, WOOD);
        break; }
      case 'st_saldatrice': {   // saldatrice a carrello: cassa con le feritoie, quadrante, prese, due cavi (pinza e massa), bombola incatenata
        box(.46, .5, .36, 0, .08, 0, '#2a5a8a'); for (let i = 0; i < 6; i++) box(.005, .05, .26, .232, .2 + i * .05, 0, '#1a3a5a');
        box(.48, .03, .38, 0, .58, 0, '#1e4a72'); asta([-.2, .61, 0], [-.2, .72, 0], .015, '#1a1a1a', g, true); asta([.2, .61, 0], [.2, .72, 0], .015, '#1a1a1a', g, true); asta([-.2, .72, 0], [.2, .72, 0], .015, '#1a1a1a', g, true);
        box(.3, .2, .01, 0, .3, .18, '#d8d4c8'); cyl(.05, .02, 0, .4, .185, '#1a1a1a', 1); box(.005, .04, .005, 0, .42, .195, RED);
        for (const x of [-.1, .1]) cyl(.025, .03, x, .2, .19, x < 0 ? RED : '#1a1a1a', 1);
        for (const x of [-.17, .17]) { cyl(.07, .04, x, .07, -.12, '#1a1a1a', 2); cyl(.03, .045, x, .07, -.12, STEEL, 2); } box(.04, .08, .04, .19, 0, .14, '#1a1a1a'); box(.04, .08, .04, -.19, 0, .14, '#1a1a1a');
        cavo([[-.1, .2, .2], [-.15, .1, .32], [-.05, .02, .45], [.15, .02, .42], [.25, .06, .3]], .014, RED); box(.05, .14, .04, .27, .03, .3, '#2a2a2a').rotation.z = .6;
        cavo([[.1, .2, .2], [.18, .08, .3], [.32, .015, .35], [.42, .015, .2]], .014, '#1a1a1a'); box(.08, .03, .05, .45, .01, .18, '#c8a030');
        cyl(.1, .75, 0, 0, -.32, '#3a6a3a', 0, g, .1, 16); ball(.1, 0, .75, -.32, '#3a6a3a', g, 1, .6, 1); cyl(.025, .06, 0, .8, -.32, '#c8a030'); ball(.025, .04, .86, -.32, '#c8a030'); cyl(.02, .015, .06, .86, -.28, '#e8e8e8', 1);
        const ch = new THREE.Mesh(new THREE.TorusGeometry(.11, .006, 4, 16), mat('#6a6a6a', MET)); ch.rotation.x = Math.PI / 2; ch.position.set(0, .55, -.32); g.add(ch);
        break; }
      case 'st_banco_lavoro': {   // banco da lavoro: piano spesso, ripiano sotto, cassetti, pannello forato con gli attrezzi, morsa vera sullo spigolo
        top(1.8, .07, .75, .83, WOOD); legs(1.8, .75, .83, WOOD, g, .08); box(1.7, .04, .65, 0, .2, 0, WOOD); box(1.66, .06, .04, 0, .5, -.33, WOOD);
        const dr = sub(.55, .58, .02); box(.6, .2, .66, 0, 0, 0, '#6a4a2c', dr); for (const x of [-.15, .15]) { box(.27, .16, .01, x, .02, .335, '#8a6a44', dr); box(.08, .02, .02, x, .1, .345, '#2a2a2a', dr); }
        box(1.8, .9, .03, 0, .9, -.36, '#8a7050'); for (let j = 0; j < 4; j++) for (let i = 0; i < 12; i++) box(.012, .012, .005, -.8 + i * .145, 1.0 + j * .2, -.343, '#4a3a28');
        [[-.65, '#8a8a90', .32], [-.45, '#b84a2a', .26], [-.25, '#8a8a90', .3], [-.05, '#3a6ab8', .24], [.15, '#d0a030', .2]].forEach(([x, c, l]) => { box(.012, .012, .05, x, 1.55, -.33, '#2a2a2a'); box(.02, l * .45, .012, x, 1.53 - l * .45, -.31, STEEL); box(.035, l * .55, .03, x, 1.53 - l, -.31, c); });
        box(.35, .02, .14, .55, 1.2, -.27, WOOD); for (let i = 0; i < 4; i++) cyl(.03, .08, .43 + i * .08, 1.22, -.27, ['#c8a030', '#5a7a5a', '#8a4a2a', '#3a5a8a'][i]);
        const v = sub(-.7, .9, .32); box(.16, .04, .2, 0, 0, -.06, '#3a5a8a', v); box(.14, .1, .05, 0, .04, -.12, '#3a5a8a', v); box(.14, .1, .05, 0, .04, .02, '#3a5a8a', v); cyl(.012, .26, 0, .09, .14, STEEL, 1, v); asta([-.08, .09, .26], [.08, .09, .26], .01, STEEL, v, true);
        break; }
      case 'st_banco_falegname': {   // banco del falegname: piano spesso coi fori, morsa di testa con la vite di legno, ripiano con le assi, pialla, sega, morsetto, trucioli
        box(2, .1, .7, 0, .78, 0, WOOD2); for (let i = 0; i < 7; i++) cyl(.012, .005, -.8 + i * .25, .875, .26, '#3a2a1a');
        for (const x of [-.85, .85]) { box(.1, .74, .1, x, .04, -.25, '#8a6438'); box(.1, .74, .1, x, .04, .25, '#8a6438'); box(.12, .06, .64, x, 0, 0, '#8a6438'); box(.08, .08, .5, x, .3, 0, '#8a6438'); }
        box(1.64, .08, .06, 0, .3, 0, '#8a6438'); box(1.7, .04, .55, 0, .36, 0, '#8a6438');
        for (let i = 0; i < 4; i++) box(1.5, .03, .14, 0, .4 + i * .03, -.15 + (i % 2) * .16, ['#c8a070', '#b89060', '#d0aa78', '#a88050'][i]);
        box(.3, .18, .08, -.85, .68, .39, '#6a4a2a'); cyl(.025, .28, -.85, .78, .5, '#8a6438', 1); asta([-.95, .78, .62], [-.75, .78, .62], .015, '#6a4a2a', g, true);
        const pl = sub(.2, .88, .05, .2); box(.26, .06, .07, 0, 0, 0, '#9a7040', pl); box(.06, .06, .04, -.08, .06, 0, '#6a4a2a', pl); box(.04, .05, .04, .07, .06, 0, '#3a3a3a', pl);
        const sa = sub(-.35, .88, .12, -.15); box(.5, .005, .12, 0, 0, 0, STEEL, sa); box(.1, .06, .025, -.3, -.02, 0, '#6a4a2a', sa).position.y = .02;
        const mo = sub(.75, .78, .36); box(.03, .2, .03, 0, -.1, 0, '#3a5a8a', mo); box(.12, .025, .03, .05, .1, 0, '#3a5a8a', mo); box(.12, .025, .03, .05, -.1, 0, '#3a5a8a', mo); cyl(.008, .2, .1, -.1, 0, STEEL, 0, mo);
        named(box(.36, .02, .22, .55, .88, -.12, '#d8b080'), 'segatura'); for (let i = 0; i < 8; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.025, .006, 4, 8, 4), mat('#e0c090')); t.position.set(.4 + Math.random() * .4, .9, -.2 + Math.random() * .2); t.rotation.set(Math.random() * 3, Math.random() * 3, 0); g.add(t); }
        break; }
      case 'st_banco_macellaio': {   // ceppo del macellaio: tagliere spesso su gambe d'acciaio, mannaia piantata, coltelli sulla barra, piastrelle e ganci con la carne
        legs(1.6, .75, .72, STEEL, g, .05); box(1.5, .04, .65, 0, .2, 0, STEEL);
        box(1.6, .16, .75, 0, .72, 0, '#c8a878'); for (let i = 0; i < 8; i++) box(.005, .161, .751, -.7 + i * .2, .72, 0, '#a88858'); box(.5, .005, .4, .3, .881, 0, '#8a3a2a');
        const mn = sub(-.2, .88, .05, .4); box(.2, .1, .006, 0, .05, 0, STEEL, mn); box(.12, .03, .03, .15, .085, 0, '#3a2a1a', mn);
        box(1.6, .7, .04, 0, .9, -.38, '#e8e8e0'); for (let j = 0; j < 7; j++) box(1.6, .005, .041, 0, .9 + j * .1, -.38, '#b8b8b0'); for (let i = 0; i < 16; i++) box(.005, .7, .041, -.75 + i * .1, .9, -.38, '#b8b8b0');
        cyl(.012, 1.4, 0, 1.72, -.3, STEEL, 2); for (const x of [-.45, -.1]) { box(.008, .1, .008, x, 1.62, -.3, STEEL); ball(.09, x, 1.47, -.3, '#9a3a32', g, 1, 1.3, .6); ball(.05, x, 1.32, -.3, '#e8d8c8'); }
        for (let i = 0; i < 4; i++) { box(.025, .2, .004, .3 + i * .1, 1.16, -.355, STEEL); box(.03, .1, .02, .3 + i * .1, 1.3, -.35, '#2a2a2a'); } box(.5, .02, .02, .45, 1.4, -.35, '#3a3a3a');
        break; }
      case 'st_macchina_cucire': {   // macchina da cucire a pedale: gambe di ghisa col pedale e il volano, piano di legno, la testa nera con l'ago, il volantino, il rocchetto
        const gm = sub(); gm.name = 'gambe';
        for (const x of [-.4, .4]) { box(.04, .7, .05, x, 0, -.18, '#1e1e20', gm); box(.04, .7, .05, x, 0, .18, '#1e1e20', gm); box(.04, .05, .44, x, 0, 0, '#1e1e20', gm); asta([x, .05, -.18], [x, .6, .18], .025, '#1e1e20', gm); asta([x, .05, .18], [x, .6, -.18], .025, '#1e1e20', gm); }
        box(.8, .03, .04, 0, .55, -.18, '#1e1e20', gm); const fly = mesh(new THREE.TorusGeometry(.16, .015, 6, 20), '#1e1e20', gm); fly.rotation.y = Math.PI / 2; fly.position.set(.36, .4, 0);
        box(.5, .02, .25, 0, .1, .05, '#2a2a2a', gm); asta([.36, .4, 0], [.1, .11, .05], .01, '#1e1e20', gm, true);
        box(1, .04, .55, 0, .7, 0, '#6a4a2a', gm); box(.94, .04, .02, 0, .63, .26, '#5a3a1a', gm); box(.25, .1, .45, -.35, .58, 0, '#5a3a1a', gm);
        const h = sub(0, .74, 0); h.name = 'testa';
        box(.42, .03, .2, 0, 0, 0, '#2a2a2a', h); box(.09, .24, .12, .15, .03, 0, '#151515', h); box(.38, .07, .1, .02, .25, 0, '#151515', h); box(.08, .15, .1, -.15, .13, 0, '#151515', h);
        box(.39, .01, .101, .02, .29, 0, '#c8a030', h); cyl(.07, .03, .22, .2, 0, '#2a2a2a', 2, h); cyl(.075, .006, .238, .2, 0, STEEL, 2, h);
        cyl(.015, .05, .08, .32, 0, '#e8e0c8', 0, h); cyl(.003, .1, .08, .37, 0, STEEL, 0, h);
        named(box(.008, .08, .008, -.17, .07, .03, '#c8c8d0', h), 'ago'); box(.04, .015, .05, -.17, .03, .03, STEEL, h);
        g.userData.piano = .74;
        break; }
      case 'st_ciclostile': {   // ciclostile su un trespolo: tamburo inchiostrato che gira con la manovella, vassoio dei fogli bianchi e quello dei fogli stampati
        const gm = sub(); gm.name = 'gambe'; legs(.8, .55, .7, '#3a3a3a', gm, .04); box(.8, .03, .55, 0, .7, 0, '#4a4a4a', gm); box(.7, .03, .45, 0, .2, 0, '#3a3a3a', gm); for (let i = 0; i < 3; i++) box(.3, .04, .4, -.15, .23 + i * .04, 0, '#f0ead8', gm);
        const m = sub(0, .73, 0); box(.6, .08, .4, 0, 0, 0, '#3a3a3a', m); for (const x of [-.26, .26]) box(.04, .3, .3, x, .08, 0, '#5a5a5a', m);
        named(cyl(.12, .48, 0, .26, 0, '#2a2a2a', 2, m), 'rullo'); cyl(.125, .3, 0, .26, 0, '#1a1a2a', 2, m);
        cyl(.04, .03, .3, .26, 0, '#5a5a5a', 2, m); asta([.32, .26, 0], [.32, .4, .08], .02, '#5a5a5a', m); cyl(.018, .07, .36, .4, .08, '#c83a2a', 2, m);
        const t1 = box(.34, .01, .3, 0, .2, -.25, '#8a8a8a', m); t1.rotation.x = -.35; box(.3, .02, .26, 0, .22, -.25, '#f0ead8', m).rotation.x = -.35;
        box(.36, .02, .3, 0, .06, .3, '#8a8a8a', m); box(.32, .03, .26, 0, .08, .3, '#f0ead8', m); box(.2, .03, .005, 0, .1, .3, '#3a3a6a', m);
        g.userData.piano = .73;
        break; }
      case 'st_banco_radio': {   // scrivania della radio: apparato con le valvole, quadrante, cuffie, microfono da tavolo, tasto del telegrafo, antenna sul suo attacco
        top(1.4, .05, .65, .72, '#5a4a3a'); legs(1.4, .65, .72, DARK, g, .05); box(1.3, .04, .04, 0, .15, -.28, DARK);
        const r = sub(-.25, .77, -.14); box(.6, .32, .3, 0, 0, 0, '#4a5a4a', r); box(.62, .02, .32, 0, .32, 0, '#3a4a3a', r); box(.24, .12, .01, -.12, .14, .151, glow('#e8c890', '#806838', .8), r); box(.004, .1, .012, -.1, .15, .155, RED, r);
        for (let i = 0; i < 3; i++) { cyl(.025, .03, .08 + i * .07, .08, .16, '#1a1a1a', 1, r); box(.006, .02, .006, .08 + i * .07, .1, .175, '#e8e8e8', r); }
        named(box(.03, .03, .012, .22, .24, .152, glow('#30ff60', '#30ff60'), r), 'led');
        for (let i = 0; i < 3; i++) cyl(.02, .07, -.15 + i * .06, .32, -.06, glow('#f0d8a0', '#a06020', .5), 0, r);
        const hp = sub(.25, .77, .1, .4); const arc = mesh(new THREE.TorusGeometry(.08, .008, 4, 12, Math.PI), '#2a2a2a', hp); arc.rotation.x = -Math.PI / 2; arc.position.y = .03; for (const x of [-.08, .08]) cyl(.04, .03, x, .0, 0, '#1a1a1a', 0, hp);
        cyl(.05, .02, .45, .77, -.05, DARK); asta([.45, .79, -.05], [.45, .95, -.02], .008, DARK, g, true); cyl(.03, .07, .45, .95, -.02, '#c8c8c8', 1);
        box(.1, .015, .06, .05, .77, .2, '#2a2a2a'); box(.07, .01, .012, .05, .79, .2, '#c8a030'); cyl(.012, .015, .085, .8, .2, '#1a1a1a');
        cyl(.03, .04, .62, .77, -.25, DARK); cyl(.006, 1.2, .62, .81, -.25, STEEL); cavo([[.62, .79, -.25], [.4, .79, -.3], [.06, .85, -.3]], .006, '#1a1a1a');
        break; }
      case 'st_camera_oscura': {   // camera oscura: tavolo con le tre bacinelle (sviluppo, arresto, fissaggio), ingranditore sulla colonna, luce rossa, foto stese col filo
        top(1.4, .05, .65, .8, '#2a2a2a'); legs(1.4, .65, .8, '#2a2a2a', g, .05); box(1.3, .04, .55, 0, .25, 0, '#2a2a2a');
        [['#6a6a3a', .05], ['#5a5a5a', .3], ['#3a5a6a', .55]].forEach(([c, x]) => { box(.23, .04, .3, x, .85, .1, '#d8d8d0'); box(.2, .02, .27, x, .87, .1, c, g, { roughness: .2 }); }); box(.06, .005, .1, .3, .9, .12, '#f0ece0');
        const e = sub(-.45, .85, -.1); box(.3, .03, .36, 0, 0, .05, '#e8e4d8', e); cyl(.025, .8, 0, .03, -.15, '#5a5a5a', 0, e); box(.06, .08, .08, 0, .5, -.11, '#3a3a3a', e);
        box(.2, .18, .2, 0, .48, -.0, '#3a3a3a', e); cyl(.08, .08, 0, .66, 0, '#2a2a2a', 0, e); cyl(.035, .1, 0, .38, 0, '#1a1a1a', 0, e); box(.18, .005, .24, 0, .031, .05, '#f8f4ec', e);
        box(.12, .1, .06, .2, 1.85, -.3, '#2a2a2a'); named(box(.09, .07, .01, .2, 1.86, -.265, glow('#ff2a2a', '#ff1010', 1.6)), 'luce'); box(.012, .2, .012, .2, 1.95, -.33, '#2a2a2a');
        cyl(.003, 1.4, 0, 1.6, -.3, '#c8c8c8', 2); for (let i = 0; i < 4; i++) { box(.13, .17, .003, -.5 + i * .3, 1.42, -.3, i % 2 ? '#d8d0c0' : '#c8c0b0'); box(.02, .03, .01, -.5 + i * .3, 1.585, -.3, '#c8a060'); }
        break; }
      case 'st_tavolo_medico': {   // lettino da visita: telaio d'acciaio, materasso imbottito con lo schienale alzato, rotolo di carta, armadietto a vetri coi flaconi
        for (const [x, z] of [[-.85, -.28], [.85, -.28], [-.85, .28], [.85, .28]]) { cyl(.022, .7, x, .06, z, STEEL); cyl(.03, .04, x, 0, z, '#1a1a1a', 0, g, .03); }
        box(1.8, .04, .62, 0, .72, 0, STEEL); for (const z of [-.28, .28]) box(1.74, .03, .03, 0, .3, z, STEEL);
        box(1.3, .1, .6, .25, .76, 0, '#5a8a80', g, { roughness: .6 }); const bk = sub(-.42, .81, 0); bk.rotation.z = -.45; box(.55, .1, .6, -.27, -.05, 0, '#5a8a80', bk, { roughness: .6 }); asta([-.6, .72, -.2], [-.8, .92, -.2], .02, STEEL);
        box(1.5, .01, .4, .3, .86, 0, '#f4f2ea'); cyl(.06, .44, .98, .74, 0, '#f4f2ea', 1);
        const a = sub(1.05, 0, -.35); box(.45, .95, .32, 0, 0, 0, '#e8e8e0', a); box(.38, .5, .01, 0, .38, .16, mat('#c8e0e8', { transparent: true, opacity: .45, roughness: .1 }), a); for (const y of [.5, .72]) box(.4, .015, .28, 0, y, 0, '#d8d8d0', a);
        for (let i = 0; i < 4; i++) cyl(.025, .09, -.12 + i * .08, .515, .02, ['#8a4a2a', '#e8e8e8', '#3a5a8a', '#6a3a1a'][i], 0, a); box(.38, .3, .01, 0, .05, .16, '#d8d8d0', a); box(.06, .06, .01, 0, .25, .17, RED, a);
        break; }
      case 'st_alambicco': {   // alambicco di rame su fornello di mattoni: caldaia, cappello a cipolla, collo di cigno che scende nel tino del serpentino, rubinetto e damigiana
        box(.6, .4, .6, -.15, 0, 0, BRICK); box(.62, .03, .62, -.15, .4, 0, '#5a4a40'); box(.26, .2, .02, -.15, .06, .3, '#1a1612'); named(box(.2, .12, .02, -.15, .08, .305, glow('#ff7a2a', '#ff4a10', 1.5)), 'fiamma');
        cyl(.26, .36, -.15, .43, 0, '#b86a3a', 0, g, .24, 18); const dome = mesh(new THREE.SphereGeometry(.26, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#c87a4a'); dome.position.set(-.15, .79, 0); dome.scale.y = .5;
        const onion = mesh(new THREE.LatheGeometry([[0, 0], [.1, .01], [.16, .08], [.13, .18], [.05, .26], [.035, .3], [0, .31]].map(([a, b]) => new THREE.Vector2(a, b)), 16), '#d08a5a'); onion.position.set(-.15, .9, 0);
        cavo([[-.15, 1.18, 0], [-.05, 1.22, 0], [.15, 1.12, .02], [.33, .9, .04], [.4, .72, .04]], .025, '#c87a4a');
        cyl(.18, .58, .42, 0, .04, '#7a5634', 0, g, .19, 16); for (const y of [.08, .46]) { const t = mesh(new THREE.TorusGeometry(.185, .012, 4, 18), IRON); t.rotation.x = Math.PI / 2; t.position.set(.42, y, .04); } cyl(.17, .01, .42, .58, .04, '#4a6a7a', 0, g, .17);
        cyl(.012, .1, .55, .12, .15, '#c87a4a', 2); box(.03, .04, .03, .62, .08, .15, '#c87a4a');
        ball(.12, .62, .12, .32, mat('#4a7a5a', { transparent: true, opacity: .75, roughness: .2 }), g, 1, 1, 1); cyl(.03, .08, .62, .22, .32, '#4a7a5a'); for (let i = 0; i < 6; i++) asta([.62 + Math.cos(i) * .12, .04, .32 + Math.sin(i) * .12], [.62 + Math.cos(i) * .1, .2, .32 + Math.sin(i) * .1], .01, '#a88a5a');
        break; }
      case 'st_stufa': {   // stufa di ghisa: corpo su quattro piedi, sportello con la finestrella della fiamma, piastra, tubo che sale e piega verso il muro, bollitore e ciocchi
        for (const [x, z] of [[-.24, -.2], [.24, -.2], [-.24, .2], [.24, .2]]) box(.06, .14, .06, x, 0, z, '#1e1e20');
        box(.6, .55, .5, 0, .14, 0, '#2a2a2c'); for (const y of [.2, .62]) box(.62, .025, .52, 0, y, 0, '#1e1e20'); box(.62, .04, .52, 0, .69, 0, '#1e1e20');
        box(.36, .3, .02, 0, .24, .26, '#3a3a3c'); named(box(.22, .14, .02, 0, .32, .265, glow('#ff6a2a', '#ff3a10', 1.6)), 'fiamma'); box(.03, .08, .03, .14, .36, .28, STEEL); for (let i = 0; i < 4; i++) box(.2, .01, .005, 0, .27 + i * .04, .276, '#1e1e20');
        cyl(.07, .77, 0, .73, -.1, '#2a2a2c'); const el = mesh(new THREE.TorusGeometry(.12, .07, 8, 12, Math.PI / 2), '#2a2a2c'); el.rotation.y = -Math.PI / 2; el.position.set(0, 1.5, -.22); cyl(.07, .3, 0, 1.62, -.37, '#2a2a2c', 1); cyl(.075, .015, 0, 1.0, -.1, '#1e1e20');
        cyl(.08, .1, .16, .73, .1, '#8a8e96', 0, g, .09); asta([.1, .84, .1], [.22, .84, .1], .012, '#2a2a2a', g, true); cyl(.012, .09, .245, .78, .1, '#8a8e96', 2);
        for (let i = 0; i < 5; i++) cyl(.06, .42, .55, .06 + (i > 2 ? .11 : 0), -.15 + (i % 3) * .12 + (i > 2 ? .06 : 0), '#6a4a2a', 1);
        break; }
      case 'st_forno': {   // forno a legna: basamento di pietra con la legnaia, cupola di mattoni con la bocca ad arco che brilla, canna fumaria, pala appoggiata
        box(1.5, .85, 1.3, 0, 0, 0, '#a89a88'); for (let i = 0; i < 4; i++) box(1.51, .01, 1.31, 0, .2 + i * .2, 0, '#8a7c6a'); box(1.1, .5, .02, 0, .1, .655, '#2a2420'); for (let i = 0; i < 5; i++) cyl(.06, .9, -.4 + i * .2, .2, .2, '#6a4a2a', 2);
        box(1.56, .06, 1.36, 0, .85, 0, '#8a7c6a');
        const dome = mesh(new THREE.SphereGeometry(.62, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), BRICK); dome.position.set(0, .91, -.05); dome.scale.y = .78;
        box(.56, .5, .3, 0, .91, .5, BRICK); const arc = mesh(new THREE.CylinderGeometry(.2, .2, .32, 14, 1, false, -Math.PI / 2, Math.PI), '#1a1210'); arc.rotation.x = Math.PI / 2; arc.position.set(0, 1.14, .52); box(.4, .23, .32, 0, .91, .52, '#1a1210');
        named(box(.3, .1, .01, 0, .93, .69, glow('#ff7a2a', '#ff4a10', 1.4)), 'fiamma'); box(.62, .06, .34, 0, 1.41, .5, '#7a4a34');
        cyl(.1, .7, .3, 1.2, -.3, BRICK); box(.26, .05, .26, .3, 1.9, -.3, '#7a4a34');
        asta([.65, .02, .7], [.62, 1.3, .7], .03, WOOD, g, true); const pala = box(.26, .3, .01, .64, 0, .73, WOOD2); pala.rotation.x = .02;
        break; }
      case 'st_cassetta':   // cassetta degli attrezzi a due piani: chiusure, maniglia ad arco, vassoio che si intravede
        box(.55, .22, .3, 0, 0, 0, RED, g, { metalness: .25, roughness: .5 }); box(.57, .05, .32, 0, .22, 0, '#a83a30'); for (const x of [-.2, .2]) { box(.05, .05, .015, x, .18, .155, STEEL); }
        for (const x of [-.12, .12]) asta([x, .27, 0], [x, .34, 0], .02, DARK, g, true); asta([-.12, .34, 0], [.12, .34, 0], .025, DARK, g, true); box(.56, .01, .31, 0, .14, 0, '#6a1a14');
        break;
      case 'st_cassaforte': {   // cassaforte: cassa con lo spigolo smussato, sportello con la cornice, cerniere, combinazione numerata, maniglia a tre razze, zoccolo
        box(.75, .05, .65, 0, 0, 0, '#2a3430'); box(.72, .84, .62, 0, .05, 0, '#3a4a44', g, { metalness: .4, roughness: .5 });
        box(.62, .72, .03, 0, .11, .32, '#4a5a54', g, { metalness: .4, roughness: .45 }); box(.66, .76, .015, 0, .09, .31, '#2a3430');
        for (const y of [.25, .65]) cyl(.025, .1, -.31, y, .34, '#2a3430');
        cyl(.07, .03, .1, .55, .345, '#c0b080', 1); cyl(.05, .02, .1, .55, .36, '#a8985a', 1); box(.005, .02, .01, .1, .61, .36, '#1a1a1a');
        cyl(.025, .04, -.12, .38, .35, '#c0b080', 1); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; asta([-.12, .38, .37], [-.12 + Math.cos(a) * .09, .38 + Math.sin(a) * .09, .37], .012, '#c0b080', g, true); }
        box(.3, .05, .005, .0, .78, .336, '#c0b080');
        break; }
      case 'st_rastrelliera': {   // rastrelliera aperta: fianchi e cappello, rastrello a denti in basso e in alto, quattro fucili in piedi, la barra col lucchetto
        for (const x of [-.68, .68]) box(.05, 1.6, .38, x, 0, 0, '#4a5040'); box(1.42, .05, .4, 0, 1.6, 0, '#3a4030'); box(1.36, .04, .36, 0, 0, 0, '#3a4030'); box(1.36, 1.2, .02, 0, .2, -.18, '#3a4030');
        box(1.36, .12, .3, 0, .04, 0, '#4a5040'); box(1.36, .06, .12, 0, 1.12, .1, '#4a5040');
        for (let i = 0; i < 4; i++) { const x = -.45 + i * .3, f = sub(x, .16, .05); f.rotation.z = (i - 1.5) * .02;
          box(.06, .34, .045, 0, 0, 0, '#5a3a20', f); box(.04, .1, .04, 0, .34, 0, '#5a3a20', f); box(.035, .22, .045, 0, .44, .005, '#2a2a2e', f, MET); box(.025, .16, .04, 0, .5, .03, '#2a2a2e', f, MET).position.z = .04;
          box(.035, .18, .03, 0, .66, 0, '#6a4a2a', f); cyl(.011, .45, 0, .84, 0, '#2a2a2e', 0, f); }
        box(1.4, .03, .03, 0, .72, .2, '#2a2a2a'); box(.08, .1, .04, .55, .67, .22, '#c8a040'); const t = mesh(new THREE.TorusGeometry(.025, .008, 4, 10, Math.PI), STEEL); t.position.set(.55, .78, .22);
        break; }
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
