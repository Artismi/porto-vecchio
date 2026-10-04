/* Porto Vecchio — I soldi: l'interfaccia (portafoglio, bancomat, sportello, bancone, macchinette, sette e mezzo, Lotto).
   Stesso stile delle Tasche: fondo scuro, righe sottili, giallo per quello che conta. Il gioco va in pausa mentre è aperto.
   L: portafoglio e cassa comune. Esc: torna al gioco. Le altre schede si aprono dalle azioni sul posto (HUD e Tasche).
   Legge e scrive solo attraverso Soldi. */
var SoldiUI = (function () {
  'use strict';
  const PV = () => window.__pv, ST = () => PV() && PV().st;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const L = x => `${Math.round(x).toLocaleString('it-IT')}.000`;
  const U = { open: false, panel: '', arg: null, msg: '', ok: true, sel: [], stake: 1, bet: 1, bbet: 5, spinning: false, reels: ['SETTE', 'BAR', 'CAMPANA'], hand: null };
  const So = () => Soldi, G = () => (PV() && PV().G) || Game;

  // ---------------- PIXEL: simboli delle macchinette e carte ----------------
  const SYMP = {
    CILIEGIA: r => { r('#3a8a3a', 7, 1, 2, 5); r('#3a8a3a', 9, 2, 3, 1); r('#d8283a', 3, 7, 5, 5); r('#d8283a', 9, 8, 5, 5); r('#ff8a8a', 4, 8, 1, 1); r('#ff8a8a', 10, 9, 1, 1); },
    LIMONE: r => { r('#e8d040', 3, 5, 10, 7); r('#e8d040', 2, 7, 12, 3); r('#fff0a0', 5, 6, 3, 1); r('#b89a20', 3, 11, 10, 1); r('#5a8a2a', 12, 4, 2, 2); },
    CAMPANA: r => { r('#e8a830', 5, 3, 6, 2); r('#e8a830', 4, 5, 8, 5); r('#e8a830', 3, 10, 10, 2); r('#fff0b0', 6, 5, 2, 3); r('#8a5a10', 7, 12, 2, 2); r('#8a5a10', 7, 1, 2, 2); },
    BAR: r => { r('#f4ecdc', 1, 5, 14, 6); r('#16161b', 2, 6, 12, 4); r('#f4ecdc', 3, 7, 2, 2); r('#f4ecdc', 7, 7, 2, 2); r('#f4ecdc', 11, 7, 2, 2); },
    SETTE: r => { r('#e04a4a', 3, 2, 10, 3); r('#e04a4a', 9, 5, 3, 3); r('#e04a4a', 7, 8, 3, 3); r('#e04a4a', 6, 11, 3, 3); r('#ff9a9a', 4, 3, 7, 1); },
  };
  function sym(c, k) { const x = c.getContext('2d'); x.clearRect(0, 0, 16, 16); (SYMP[k] || SYMP.BAR)((col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); }); }
  const SUIT = { denari: '#e8c040', coppe: '#e04a4a', spade: '#8ab0e8', bastoni: '#6aaa6a' };

  // ---------------- STILE ----------------
  const CSS = `
#sd { position: absolute; inset: 0; z-index: 61; display: none; background: rgba(12,12,16,.86); backdrop-filter: blur(3px); color: #d8d4cc; font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; pointer-events: auto; }
#sd.on { display: grid; place-items: center; }
#sd .fr { position: relative; width: min(980px, calc(100% - 32px)); max-height: calc(100% - 32px); overflow: auto; border: 1px solid #2c2c34; background: #16161b; display: grid; grid-template-rows: auto 1fr auto; }
#sd header { display: flex; align-items: baseline; gap: 18px; padding: 20px 28px 8px; border-bottom: 1px solid #222228; }
#sd header b { font-size: 19px; letter-spacing: .08em; color: #fff; font-weight: 700; text-transform: uppercase; }
#sd header span { font-size: 12px; letter-spacing: .1em; color: #77707a; text-transform: uppercase; }
#sd .x { position: absolute; right: 14px; top: 12px; width: 30px; height: 30px; border: 1px solid #3a3a42; background: none; color: #aaa; cursor: pointer; font-size: 16px; }
#sd main { padding: 18px 28px; display: grid; gap: 22px; min-height: 0; }
#sd .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
#sd .box { background: #1a1a20; border: 1px solid #26262e; padding: 14px 16px; display: grid; gap: 10px; align-content: start; }
#sd h4 { margin: 0; font-size: 11.5px; letter-spacing: .14em; font-weight: 600; color: #a8a4a0; text-transform: uppercase; }
#sd .big { font-size: 26px; font-weight: 700; color: #e8d040; font-variant-numeric: tabular-nums; letter-spacing: .02em; }
#sd .big small { font-size: 12px; color: #8a8690; font-weight: 500; letter-spacing: .08em; }
#sd .dim { color: #8a8690; font-size: 12.5px; line-height: 1.5; }
#sd .warn { color: #e07a5a; font-size: 12.5px; font-weight: 600; }
#sd .row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
#sd button.b { background: none; border: 1px solid #55505a; color: #e8e4dc; font: 700 11.5px system-ui; letter-spacing: .1em; padding: 7px 12px; cursor: pointer; text-transform: uppercase; }
#sd button.b:hover { border-color: #e8d040; color: #e8d040; } #sd button.b[disabled] { color: #55505a; border-color: #2e2e36; cursor: default; }
#sd button.b.on { background: #e8d040; color: #16161b; border-color: #e8d040; }
#sd button.b.bad { border-color: #7a3a3a; color: #e8a0a0; } #sd button.b.bad:hover { border-color: #e04a4a; color: #ff8a8a; }
#sd .mov { display: grid; gap: 3px; font-size: 12px; font-variant-numeric: tabular-nums; max-height: 180px; overflow: auto; }
#sd .mov div { display: grid; grid-template-columns: 74px 1fr auto; gap: 8px; color: #a8a4a0; } #sd .mov .p { color: #8ad860; } #sd .mov .m { color: #e0806a; } #sd .mov i { font-style: normal; color: #6a6670; }
#sd .goods { display: grid; gap: 4px; }
#sd .good { display: grid; grid-template-columns: 1fr 70px 96px auto; gap: 10px; align-items: center; padding: 6px 8px; background: #1a1a20; border: 1px solid #23232a; font-size: 13.5px; }
#sd .good .pr { text-align: right; font-variant-numeric: tabular-nums; color: #e8e4dc; } #sd .good .pr.up { color: #e0806a; } #sd .good .pr.dn { color: #8ad860; }
#sd .good .sk { color: #77707a; font-size: 12px; text-align: right; } #sd .good.out { opacity: .45; }
#sd .reels { display: flex; gap: 10px; justify-content: center; padding: 18px; background: #0f0f13; border: 1px solid #26262e; }
#sd .reels canvas { width: 112px; height: 112px; image-rendering: pixelated; background: #1c1c22; border: 1px solid #3a3a42; }
#sd .reels.spin canvas { filter: blur(1.5px); }
#sd .pay { display: grid; grid-template-columns: auto auto; gap: 4px 16px; font-size: 12.5px; color: #a8a4a0; } #sd .pay span { display: flex; align-items: center; gap: 4px; } #sd .pay canvas { width: 20px; height: 20px; image-rendering: pixelated; }
#sd .cards { display: flex; gap: 8px; min-height: 92px; flex-wrap: wrap; }
#sd .card { width: 62px; height: 88px; background: #f4ecdc; border-radius: 4px; color: #16161b; display: grid; place-items: center; text-align: center; font: 700 13px system-ui; line-height: 1.1; padding: 4px; border-bottom: 5px solid var(--s); }
#sd .card small { display: block; font-weight: 500; font-size: 10px; color: #5a5060; }
#sd .grid90 { display: grid; grid-template-columns: repeat(15, 1fr); gap: 3px; }
#sd .grid90 button { background: #1c1c22; border: 1px solid #2a2a32; color: #b8b4ac; font: 600 12px system-ui; padding: 5px 0; cursor: pointer; font-variant-numeric: tabular-nums; }
#sd .grid90 button:hover { border-color: #e8d040; } #sd .grid90 button.on { background: #e8d040; color: #16161b; border-color: #e8d040; } #sd .grid90 button.ex { border-color: #e04a4a; color: #ff9a9a; }
#sd .atm { background: #0b130d; border: 1px solid #1e3a24; color: #8ae8a0; font: 600 15px 'Courier New', monospace; padding: 18px 22px; display: grid; gap: 10px; text-shadow: 0 0 6px rgba(120,255,160,.35); }
#sd .atm button.b { border-color: #2e6a3a; color: #8ae8a0; font-family: 'Courier New', monospace; } #sd .atm button.b:hover { border-color: #b8ffc8; color: #b8ffc8; }
#sd footer { display: flex; align-items: center; gap: 22px; padding: 12px 28px 16px; border-top: 1px solid #222228; font-size: 12px; letter-spacing: .1em; color: #8a8690; font-weight: 600; text-transform: uppercase; }
#sd footer kbd { font: 700 9px system-ui; border: 1px solid #77707a; color: #c8c0b0; padding: 2px 6px; border-radius: 10px; font-style: italic; }
#sd footer .msg { margin-left: auto; color: #e8d040; text-transform: none; letter-spacing: 0; font-weight: 500; font-size: 13px; } #sd footer .msg.no { color: #e0806a; }
#sd-hud { font-size: 12px; color: #c8c0b0; display: flex; gap: 10px; flex-wrap: wrap; cursor: pointer; } #sd-hud b { color: #e8d040; font-weight: 700; } #sd-hud .fz { color: #e07a5a; }
@media (max-width: 760px) { #sd .cols { grid-template-columns: 1fr; } #sd .good { grid-template-columns: 1fr 60px; } #sd .good .btns { grid-column: 1 / 3; } #sd .grid90 { grid-template-columns: repeat(10, 1fr); } #sd .reels canvas { width: 80px; height: 80px; } #sd main, #sd header, #sd footer { padding-left: 16px; padding-right: 16px; } }
`;
  function mount() {
    if ($('sd')) return true;
    const app = $('app'); if (!app || !PV() || typeof Soldi === 'undefined') return false;
    const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
    const m = document.createElement('div'); m.id = 'sd'; m.setAttribute('role', 'dialog'); app.appendChild(m);
    m.addEventListener('click', onClick);
    // nel riquadro in alto a sinistra: sotto «In tasca», la cassa comune e il conto
    const d = $('debt'); if (d) { const h = document.createElement('div'); h.id = 'sd-hud'; h.title = 'Portafoglio · L'; d.insertBefore(h, d.querySelector('.row2')); h.addEventListener('click', () => open('portafoglio')); }
    setInterval(hud, 400);
    return true;
  }
  function hud() {
    const st = ST(), h = $('sd-hud'); if (!st || !h || !st.soldi) return;
    const v = So().playerView(st);
    const s = `<span>Cassa comune <b>${L(v.cassa)}</b>${v.cassaWhere && v.cassaWhere !== 'con te' ? ` <small>(${esc(v.cassaWhere)})</small>` : ''}</span>${v.conto ? `<span>Conto <b class="${v.conto.frozen ? 'fz' : ''}">${v.conto.frozen ? 'congelato' : L(v.conto.bal)}</b></span>` : ''}`;
    if (h.innerHTML !== s) h.innerHTML = s;
    if (U.open && !U.spinning && (U.panel === 'portafoglio' || U.panel === 'cassa')) { const sig = JSON.stringify(v.mov.slice(0, 3)) + Math.round(v.wallet) + Math.round(v.cassa); if (sig !== U.sig) render(); }
  }

  // ---------------- APRI / CHIUDI ----------------
  function open(panel, arg) {
    if (!mount()) return;
    if (typeof TascheUI !== 'undefined') try { TascheUI.toggle(false); } catch (e) { }
    U.open = true; U.panel = panel === 'cassa' ? 'portafoglio' : panel; U.arg = arg; U.msg = ''; U.sel = []; if (panel === 'bisca') { const v = So().playerView(ST()); U.hand = v.bisca; }
    if (PV().ui) PV().ui.menu = true;
    $('sd').classList.add('on'); render();
  }
  function close() { U.open = false; U.spinning = false; $('sd').classList.remove('on'); if (PV() && PV().ui) PV().ui.menu = false; }
  function say(r) { if (!r) return; U.msg = r.msg || ''; U.ok = r.ok !== false; const st = ST(); if (r.msg && st) G().feed(st, r.msg, r.ok ? 'money' : 'bad'); }
  const act = (id, arg, ex) => { const r = So().act(ST(), id, arg, ex); say(r); return r; };

  // ---------------- LE SCHEDE ----------------
  const TITLES = { portafoglio: ['Portafoglio', 'quello che hai, dove l\'hai messo'], atm: ['Bancomat', 'Banco di Porto Vecchio'], banca: ['Sportello', 'Banco di Porto Vecchio'], banco: ['Al banco', ''], slot: ['Macchinette', 'tre in fila e si vince'], bisca: ['Sette e mezzo', 'il banco è della Famiglia'], lotto: ['Lotto del Garante', 'ruota di Porto Vecchio · estrazione il sabato alle 19'] };
  function render() {
    const st = ST(); if (!st || !U.open) return;
    const v = So().playerView(st), T = TITLES[U.panel] || [U.panel, ''];
    let sub = T[1], body = '';
    if (U.panel === 'portafoglio') body = pPortafoglio(st, v);
    if (U.panel === 'atm') body = pAtm(st, v);
    if (U.panel === 'banca') body = pBanca(st, v);
    if (U.panel === 'banco') { const c = So().counter(st, U.arg); sub = c ? c.label + (c.emporio ? ' · prezzi del regime, sotto i ritratti del Garante' : c.black ? ' · mercato nero, prezzo doppio' : '') : ''; body = pBanco(st, v, c); }
    if (U.panel === 'slot') body = pSlot(st, v);
    if (U.panel === 'bisca') body = pBisca(st, v);
    if (U.panel === 'lotto') body = pLotto(st, v);
    U.sig = JSON.stringify(v.mov.slice(0, 3)) + Math.round(v.wallet) + Math.round(v.cassa);
    $('sd').innerHTML = `<div class="fr"><header><b>${esc(T[0])}</b><span>${esc(sub)}</span><button class="x" data-a="close" aria-label="Chiudi">×</button></header><main>${body}</main>
      <footer><span><kbd>L</kbd> portafoglio</span><span><kbd>Esc</kbd> torna al gioco</span>${U.panel === 'slot' ? '<span><kbd>Spazio</kbd> gioca</span>' : ''}<span>In tasca <b style="color:#e8d040">${L(v.wallet)}</b></span><span class="msg ${U.ok ? '' : 'no'}">${esc(U.msg)}</span></footer></div>`;
    if (U.panel === 'slot') drawReels();
    if (U.panel === 'slot') $('sd').querySelectorAll('.pay canvas').forEach(c => sym(c, c.dataset.s));
  }
  const btn = (a, label, ex, cls, dis) => `<button class="b ${cls || ''}" data-a="${a}"${ex !== undefined ? ` data-x='${esc(JSON.stringify(ex))}'` : ''}${dis ? ' disabled' : ''}>${esc(label)}</button>`;
  const fmtT = t => { const G0 = G(); return `${Popolo.WEEK[Popolo.weekday(t)].slice(0, 3)} ${G0.clockStr(t)}`; };
  const movs = list => list.length ? `<div class="mov">${list.map(m => `<div><i>${fmtT(m[0])}</i><span>${esc(m[2])}</span><span class="${m[1] >= 0 ? 'p' : 'm'}">${m[1] >= 0 ? '+' : ''}${L(m[1])}</span></div>`).join('')}</div>` : '<div class="dim">Ancora niente.</div>';
  function pPortafoglio(st, v) {
    const R = st.ris, reach = v.cassaReach, b = v.base, amt = [10, 50, 100];
    const cassaBtns = reach ? `<div class="row">${amt.map(q => btn('cassa_metti', `+${q}`, { q }, '', v.wallet < q)).join('')}${btn('cassa_metti', 'tutto', { q: Math.floor(v.wallet) }, '', v.wallet < 1)}</div><div class="row">${amt.map(q => btn('cassa_prendi', `−${q}`, { q }, '', v.cassa < q)).join('')}</div>` : `<div class="dim">La cassa è in <b>${esc(v.cassaWhere)}</b>: per toccarla devi andarci.</div>`;
    const where = b ? (R.cassaAt === b.id ? btn('cassa_con_te', 'Portala con te') : (!R.cassaAt ? btn('cassa_qui', `Lasciala in ${b.name}`) : '')) : (reach && R && R.cassaAt ? btn('cassa_con_te', 'Portala con te') : '');
    const conto = v.conto ? `<div class="big">${v.conto.frozen ? '<span class="warn">CONGELATO</span>' : L(v.conto.bal)} <small>lire</small></div>${v.conto.frozen ? '<div class="dim">La Tutela ha bloccato il conto. Quei soldi, per ora, non esistono.</div>' : ''}${v.loan ? `<div class="warn">Prestito: devi ancora ${L(v.loan.amt)} (rata ${L(v.loan.rata)} il lunedì)</div>` : ''}${movs(v.conto.mov)}`
      : '<div class="dim">Niente conto. Lo apri allo sportello del Banco, in piazza: tessera del bancomat, prestiti. Ma il registro lo legge anche la Tutela.</div>';
    const tk = v.tickets.length ? v.tickets.map(t => `${t.nums.join('·')} (${L(t.stake)})`).join(', ') : 'nessuna';
    const last = v.lotto.last ? `${v.lotto.last.nums.join(' · ')}` : 'non ancora';
    return `<div class="cols">
      <div class="box"><h4>In tasca</h4><div class="big">${L(v.wallet)} <small>lire</small></div><div class="dim">Contanti: ci paghi tutto. Se ti arrestano o ti ricuciono in ambulatorio, una parte sparisce.</div>${movs(v.mov.slice(0, 8))}</div>
      <div class="box"><h4>Cassa comune della Risacca</h4><div class="big">${L(v.cassa)} <small>lire</small></div><div class="dim">Sta: <b>${esc(v.cassaWhere)}</b>. ${v.cassaWhere === 'con te' ? 'Se ti prendono, la trovano.' : 'Se la base cade, la trovano i Grigi.'} I lavori della banda la riempiono; basi, moduli e acquisti dei membri la svuotano.</div>${cassaBtns}<div class="row">${where}</div></div>
      <div class="box"><h4>Conto al Banco</h4>${conto}</div></div>
      <div class="dim">Schedine del Lotto: ${esc(tk)} · ultima estrazione: ${esc(last)}</div>`;
  }
  function pAtm(st, v) {
    const a = st.soldi.atms.find(k => k.id === U.arg); if (!a) return '';
    if (a.broken > st.t) return `<div class="atm"><div>FUORI SERVIZIO</div><div>CI SCUSIAMO PER IL DISAGIO</div></div>`;
    if (!v.conto) return `<div class="atm"><div>INSERIRE LA TESSERA</div><div style="opacity:.6">Non hai una tessera: serve un conto al Banco.</div></div>`;
    if (v.conto.frozen) return `<div class="atm"><div>TESSERA TRATTENUTA</div><div>RIVOLGERSI ALLO SPORTELLO</div></div>`;
    return `<div class="atm"><div>BANCO DI PORTO VECCHIO · ${esc(a.label.replace('Bancomat ', '').toUpperCase())}</div><div>SALDO DISPONIBILE: L. ${L(v.conto.bal)}</div><div>IMPORTO DEL PRELIEVO:</div>
      <div class="row">${[20, 50, 100, 200].map(q => btn('atm_preleva', `L. ${q}.000`, { q }, '', v.conto.bal < q)).join('')}</div>${a.cash < 50 ? '<div>ATTENZIONE: CONTANTI IN ESAURIMENTO</div>' : ''}</div>`;
  }
  function pBanca(st, v) {
    if (!v.bankOpen) return `<div class="box"><h4>Chiuso</h4><div class="dim">Il Banco apre dal lunedì al venerdì, 8:30–13:30 e 14:30–16:00. Fuori c'è il bancomat.</div></div>`;
    if (!v.conto) return `<div class="box"><h4>Aprire un conto</h4><div class="dim">Ti danno la tessera del bancomat e puoi chiedere un prestito. In cambio il cassiere copia i tuoi documenti in un registro col timbro del Garante: se la Tutela ti mette gli occhi addosso, il conto lo congela.</div><div class="row">${btn('apri_conto', 'Apri un conto')}</div></div>`;
    const amt = [10, 50, 100];
    return `<div class="cols"><div class="box"><h4>Saldo</h4><div class="big">${v.conto.frozen ? '<span class="warn">CONGELATO</span>' : L(v.conto.bal)}</div>${movs(v.conto.mov)}</div>
      <div class="box"><h4>Versa e preleva</h4><div class="row">${amt.map(q => btn('versa', `Versa ${q}`, { q }, '', v.wallet < q)).join('')}${btn('versa', 'Versa tutto', { q: Math.floor(v.wallet) }, '', v.wallet < 1)}</div><div class="row">${amt.concat([200]).map(q => btn('preleva', `Preleva ${q}`, { q }, '', v.conto.bal < q)).join('')}</div></div>
      <div class="box"><h4>Prestito</h4>${v.loan ? `<div class="warn">Devi ancora ${L(v.loan.amt)}.</div><div class="row">${btn('rimborsa', 'Restituisci quello che puoi')}</div>` : `<div class="dim">Fino a 200.000 lire, al 3% a settimana. La rata la prendono dal conto il lunedì.</div><div class="row">${btn('prestito', 'Chiedi 100', { q: 100 })}${btn('prestito', 'Chiedi 200', { q: 200 })}</div>`}</div></div>`;
  }
  function pBanco(st, v, c) {
    if (!c) return '<div class="dim">Qui non vendono niente.</div>';
    const ML = { consuma: 'Qui', tasche: 'In tasca', banda: 'Per la banda' };
    return `<div class="dim">I prezzi salgono quando una cosa scarseggia. Quello che compri «per la banda» lo porti con te e poi lo lasci in una base.</div><div class="goods">${c.goods.map(g => {
      const cls = g.price > g.base * (c.emporio ? 1.6 : c.black ? 2.1 : 1.1) ? 'up' : g.price < g.base * .95 ? 'dn' : '';
      const bs = g.modes.map(m => btn('compra', ML[m], { g: g.g, mode: m, q: 1 }, '', !g.stock || v.wallet < g.price)).join('') + (g.modes.includes('banda') ? btn('compra', '×5', { g: g.g, mode: 'banda', q: 5 }, '', g.stock < 5 || v.wallet < g.price * 5) : '');
      return `<div class="good ${g.stock ? '' : 'out'}"><span>${esc(g.name[0].toUpperCase() + g.name.slice(1))}</span><span class="sk">${g.stock ? `${g.stock} rimasti` : 'finito'}</span><span class="pr ${cls}">${L(g.price)}</span><span class="row btns">${bs || '<span class="dim">—</span>'}</span></div>`;
    }).join('')}</div>`;
  }
  function pSlot(st, v) {
    const S0 = So();
    return `<div class="reels" id="sd-reels"><canvas width="16" height="16"></canvas><canvas width="16" height="16"></canvas><canvas width="16" height="16"></canvas></div>
      <div class="row" style="justify-content:center">${[1, 2, 5].map(b => `<button class="b ${U.bet === b ? 'on' : ''}" data-a="bet" data-x='${b}'>${b}.000</button>`).join('')} ${btn('spin', 'Gioca', undefined, '', U.spinning || v.wallet < U.bet)}</div>
      <div class="pay">${S0.SYM.slice().reverse().map(s => `<span><canvas width="16" height="16" data-s="${s}"></canvas><canvas width="16" height="16" data-s="${s}"></canvas><canvas width="16" height="16" data-s="${s}"></canvas></span><span>× ${S0.PAY3[s]}</span>`).join('')}<span><canvas width="16" height="16" data-s="CILIEGIA"></canvas><canvas width="16" height="16" data-s="CILIEGIA"></canvas></span><span>× 1,5</span></div>
      <div class="dim">Le macchinette le mette la Famiglia: alla lunga vincono loro. Se dentro non ci sono abbastanza monete, la vincita la paga solo in parte.</div>`;
  }
  function drawReels() { const c = $('sd-reels'); if (!c) return; c.querySelectorAll('canvas').forEach((cv, i) => sym(cv, U.reels[i])); }
  function spin() {
    const st = ST(); if (U.spinning) return; const r = So().act(st, 'slot_gioca', U.arg, { bet: U.bet });
    if (!r.ok || !r.reels) { say(r); render(); return; }
    U.spinning = true; U.msg = ''; render(); const box = $('sd-reels'); box.classList.add('spin');
    const SY = So().SYM; let k = 0; const stopAt = [8, 13, 18];
    const tick = () => { if (!U.open) { U.spinning = false; return; } k++; for (let i = 0; i < 3; i++) U.reels[i] = k >= stopAt[i] ? r.reels[i] : SY[Math.floor(Math.random() * SY.length)]; drawReels(); if (k >= stopAt[2]) { U.spinning = false; box.classList.remove('spin'); say(r); render(); } else setTimeout(tick, 55); };
    tick();
  }
  function pBisca(st, v) {
    const H = U.hand, card = s => { const m = /^(.*) di (\w+)$/.exec(s) || [s, s, '']; return `<div class="card" style="--s:${SUIT[m[2]] || '#888'}">${esc(m[1])}<small>${esc(m[2])}</small></div>`; };
    const pt = x => (x % 1 ? `${Math.floor(x)} ½` : `${x}`);
    const banco = v.biscaBank, playing = H && !H.over;
    return `<div class="dim">Carte napoletane. Le figure valgono mezzo punto. Chi passa sette e mezzo sballa; col pari vince il banco; sette e mezzo con due carte paga doppio. Il banco ha ${L(banco)} sul tavolo.</div>
      <div class="cols" style="grid-template-columns:1fr 1fr"><div class="box"><h4>Tu ${H ? '· ' + pt(H.meP) : ''}</h4><div class="cards">${H ? H.me.map(card).join('') : ''}</div></div>
      <div class="box"><h4>Il banco ${H && H.bank.length ? '· ' + pt(H.bankP) : ''}</h4><div class="cards">${H ? H.bank.map(card).join('') : ''}</div></div></div>
      <div class="row">${playing ? btn('carta', 'Carta') + btn('sto', 'Sto') : [5, 10, 25, 50].map(b => `<button class="b ${U.bbet === b ? 'on' : ''}" data-a="bbet" data-x='${b}'>${b}.000</button>`).join('') + btn('nuova', 'Dai le carte', undefined, '', v.wallet < U.bbet || U.bbet > banco / 3)}</div>`;
  }
  function pLotto(st, v) {
    const ex = v.lotto.last ? v.lotto.last.nums : [];
    const grid = Array.from({ length: 90 }, (_, i) => i + 1).map(n => `<button data-a="num" data-x='${n}' class="${U.sel.includes(n) ? 'on' : ''} ${ex.includes(n) ? 'ex' : ''}">${n}</button>`).join('');
    const kind = U.sel.length === 2 ? 'ambo · paga 250 volte la giocata' : U.sel.length === 3 ? 'terno · paga 4.250 volte (83 se ne prendi due)' : 'scegli due o tre numeri';
    return `<div class="grid90">${grid}</div>
      <div class="row">${[1, 2, 5].map(s => `<button class="b ${U.stake === s ? 'on' : ''}" data-a="stake" data-x='${s}'>${s}.000</button>`).join('')} ${btn('lotto', 'Gioca la schedina', undefined, '', U.sel.length < 2 || v.wallet < U.stake)} ${btn('random', 'A caso')} <span class="dim">${esc(kind)}</span></div>
      <div class="dim">${v.lotto.last ? `Ultima estrazione: <b>${ex.join(' · ')}</b> (bordo rosso). ${esc(v.lotto.last.wins.length ? 'Vincitori: ' + v.lotto.last.wins.join(', ') : 'Nessun vincitore.')}` : 'Nessuna estrazione ancora.'} Le tue schedine: ${esc(v.tickets.map(t => t.nums.join('·')).join(', ') || 'nessuna')}. I soldi del Lotto vanno al Tesoro del Garante; al tabaccaio resta l'8%.</div>`;
  }

  // ---------------- CLIC E TASTI ----------------
  function onClick(e) {
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a, x = b.dataset.x ? JSON.parse(b.dataset.x) : undefined, st = ST();
    switch (a) {
      case 'close': close(); return;
      case 'bet': U.bet = x; break;
      case 'bbet': U.bbet = x; break;
      case 'stake': U.stake = x; break;
      case 'spin': spin(); return;
      case 'num': U.sel = U.sel.includes(x) ? U.sel.filter(n => n !== x) : U.sel.concat([x]).slice(-3); break;
      case 'random': { const s = new Set(); while (s.size < 2) s.add(1 + Math.floor(Math.random() * 90)); U.sel = [...s]; break; }
      case 'lotto': { const r = act('lotto_gioca', U.arg, { nums: U.sel, stake: U.stake }); if (r.ok) U.sel = []; break; }
      case 'nuova': { const r = act('bisca_puntata', null, { bet: U.bbet }); if (r.hand) U.hand = r.hand; break; }
      case 'carta': { const r = act('bisca_carta'); if (r.hand) U.hand = r.hand; break; }
      case 'sto': { const r = act('bisca_sto'); if (r.hand) U.hand = r.hand; break; }
      default: act(a, U.panel === 'atm' || U.panel === 'banco' ? U.arg : null, x); if (a === 'cassa_con_te' || a === 'cassa_qui') { }
    }
    void st; render();
  }
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase(), ui = PV() && PV().ui; if (!ui || ui.intro || ui.over) return;
    const ae = document.activeElement; if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT')) return;
    if (U.open) {
      if (k === 'escape' || k === 'l') { close(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (k === ' ' && U.panel === 'slot') { spin(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (k !== 'tab') { e.stopImmediatePropagation(); }   // a menu aperto i tasti del gioco non passano
      return;
    }
    if (k === 'l' && !e.repeat && !ui.dialog && !ui.book && !ui.menu) { open('portafoglio'); e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  const iv = setInterval(() => { if (mount()) clearInterval(iv); }, 300);
  return { open, close, render, state: U };
})();
