/* Porto Vecchio — Le Tasche: inventario del giocatore e azioni sul posto, a tutto schermo come il menu Zaino (il gioco va in pausa).
   I (o il pulsante TASCHE): apri/chiudi. Clic seleziona, doppio clic impugna. 1-9 o clic: impugna. 0: mani libere. U: fai la prima azione possibile qui.
   Le icone sono pixel 32×16 nello stesso stile di quelle delle armi nel HUD. Legge e scrive solo attraverso Azioni e Game. */
var TascheUI = (function () {
  'use strict';
  const PV = () => window.__pv, ST = () => PV() && PV().st;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const U = { open: false, sig: '', msg: '', msgT: 0, sel: '' };
  const G = () => (PV() && PV().G) || Game;

  // ---------------- ICONE (32×16, come quelle delle armi) ----------------
  const D = '#d8d0c0', S = '#8a8290', Wd = '#9a6a3a', Dk = '#3a3150', Rd = '#e04a4a', Yl = '#e8c040', Bl = '#4a8ad8', Gr = '#6aaa6a', Wt = '#f4ecdc';
  const ICONS = {
    pugni: r => { r(D, 10, 5, 12, 7); r(S, 10, 5, 12, 1); r(S, 13, 5, 1, 7); r(S, 16, 5, 1, 7); r(S, 19, 5, 1, 7); r(D, 8, 8, 3, 4); },
    pistola: r => { r(D, 6, 4, 18, 4); r(S, 6, 7, 18, 1); r(D, 8, 8, 5, 6); r(S, 13, 8, 2, 2); },
    lupara: r => { r(S, 2, 5, 18, 2); r(D, 2, 7, 18, 1); r(Wd, 18, 5, 12, 4); r(Wd, 24, 9, 6, 3); },
    mitra: r => { r(D, 5, 5, 18, 4); r(S, 3, 6, 3, 2); r(D, 12, 9, 3, 6); r(D, 20, 9, 3, 4); r(S, 23, 4, 7, 2); },
    molotov: r => { r('#4a8a4a', 13, 5, 7, 10); r(Gr, 14, 6, 2, 7); r('#e8d8b0', 15, 1, 3, 4); r('#ff8a30', 15, 0, 3, 2); },
    coltello: r => { r(D, 4, 7, 16, 3); r(Wt, 4, 7, 16, 1); r(D, 2, 8, 2, 2); r(S, 20, 6, 2, 5); r(Wd, 22, 7, 8, 3); r('#6a4a2a', 22, 9, 8, 1); },
    pala: r => { r(Wd, 2, 7, 18, 2); r(Wd, 2, 6, 3, 4); r(S, 20, 4, 9, 8); r(D, 20, 4, 9, 1); r(S, 29, 6, 2, 4); },
    piede: r => { r(Rd, 4, 7, 20, 2); r(Rd, 24, 4, 2, 5); r(Rd, 22, 3, 3, 2); r(S, 2, 8, 3, 2); r('#a03030', 4, 8, 20, 1); },
    carriola: r => { r(S, 6, 5, 16, 6); r(D, 6, 5, 16, 1); r(Dk, 24, 9, 5, 5); r(S, 25, 10, 3, 3); r(Wd, 2, 6, 6, 1); r(Wd, 20, 8, 6, 1); r(Wd, 8, 11, 2, 4); },
    bomboletta: r => { r(Rd, 12, 4, 8, 11); r('#ff7a7a', 13, 5, 2, 9); r(S, 14, 2, 4, 2); r(D, 15, 1, 2, 1); r(Bl, 21, 1, 1, 1); r(Bl, 23, 2, 1, 1); r(Bl, 22, 4, 1, 1); },
    pennello: r => { r(Wd, 2, 7, 14, 2); r(S, 16, 6, 4, 4); r(Yl, 20, 6, 6, 4); r(Yl, 26, 7, 2, 2); r(Bl, 6, 11, 8, 4); r('#6aa0e8', 6, 11, 8, 1); },
    gesso: r => { r(Wt, 8, 7, 14, 3); r(D, 8, 9, 14, 1); r(Wt, 24, 5, 1, 1); r(Wt, 26, 9, 2, 1); },
    benzina: r => { r(Rd, 8, 4, 14, 11); r('#a03030', 8, 4, 14, 1); r(Dk, 11, 6, 8, 2); r(S, 22, 3, 4, 2); r(S, 24, 1, 2, 3); r(Dk, 10, 2, 6, 2); },
    telefono: r => { r(Dk, 12, 1, 8, 15); r(S, 13, 2, 6, 5); r('#8ad8a0', 14, 3, 4, 3); r(D, 13, 9, 2, 1); r(D, 16, 9, 2, 1); r(D, 13, 11, 2, 1); r(D, 16, 11, 2, 1); r(S, 18, 0, 1, 2); },
    fotocamera: r => { r(Dk, 6, 5, 20, 10); r(S, 6, 5, 20, 2); r(S, 13, 7, 7, 7); r(Bl, 15, 9, 3, 3); r(D, 21, 3, 4, 2); r(Wt, 8, 8, 2, 1); },
    carte: r => { r(Wt, 8, 3, 10, 12); r(Rd, 10, 5, 2, 2); r(Wt, 14, 2, 10, 12); r(Dk, 14, 2, 10, 1); r(Rd, 18, 6, 3, 3); r(S, 8, 3, 1, 12); },
    roba: r => { r(Wt, 10, 6, 12, 7); r(D, 10, 6, 12, 1); r(S, 15, 4, 2, 2); r(Wt, 24, 10, 2, 2); },
    refurtiva: r => { r(Dk, 8, 5, 16, 10); r(S, 8, 5, 16, 2); r(Yl, 12, 8, 3, 2); r(Yl, 17, 9, 3, 2); r(Wd, 14, 2, 4, 3); },
    corda: r => { r(Wd, 8, 3, 14, 11); r('#c89a5a', 10, 5, 10, 7); r(Wd, 12, 7, 6, 3); r('#c89a5a', 22, 10, 6, 2); r('#c89a5a', 27, 12, 2, 3); },
    sacchi: r => { r(Dk, 8, 4, 16, 11); r('#1a1428', 8, 13, 16, 2); r(S, 14, 2, 4, 3); r('#5a5070', 10, 6, 2, 6); },
    spugne: r => { r(Yl, 6, 6, 10, 8); r(Gr, 6, 4, 10, 2); r('#c0a030', 8, 8, 1, 1); r('#c0a030', 12, 10, 1, 1); r(Yl, 18, 7, 9, 7); r(Gr, 18, 5, 9, 2); },
    sapone: r => { r('#e8b0d0', 8, 6, 16, 8); r('#f4d0e4', 9, 7, 6, 2); r(Wt, 25, 3, 2, 2); r(Wt, 27, 6, 1, 1); r(Wt, 5, 4, 2, 2); },
    colla: r => { r(Wt, 11, 4, 10, 11); r(Bl, 11, 8, 10, 4); r(Rd, 14, 1, 4, 3); r(D, 15, 0, 2, 1); },
    chiodi: r => { [4, 11, 18, 25].forEach((x, i) => { r(S, x, 3 + (i % 2) * 2, 5, 2); r(D, x + 2, 5 + (i % 2) * 2, 1, 8); }); },
    carta: r => { r(Wt, 6, 2, 16, 13); r(D, 9, 2, 16, 13); r(Wt, 8, 1, 16, 13); r(S, 11, 4, 10, 1); r(S, 11, 7, 10, 1); r(S, 11, 10, 7, 1); },
    inchiostro: r => { r(Dk, 11, 5, 10, 10); r('#1a1428', 11, 12, 10, 3); r(S, 13, 2, 6, 3); r(Bl, 22, 11, 3, 3); r(Bl, 25, 13, 2, 2); },
    poster: r => { r(Wt, 6, 1, 20, 14); r(Rd, 8, 3, 16, 4); r(Wt, 10, 4, 3, 2); r(Dk, 9, 9, 14, 1); r(Dk, 9, 11, 10, 1); r(Bl, 19, 9, 4, 4); },
    libretto: r => { r(Rd, 8, 2, 16, 13); r('#a03030', 8, 2, 2, 13); r(Wt, 12, 4, 10, 2); r(Wt, 12, 8, 7, 1); r(Wt, 12, 10, 7, 1); },
    vuoto: r => { r(Dk, 13, 6, 6, 4); },
  };
  function icon(c, id) {
    const x = c.getContext('2d'); x.clearRect(0, 0, 32, 16);
    const r = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    (ICONS[id] || ICONS.vuoto)(r);
    return true;
  }

  // ---------------- DESCRIZIONI ----------------
  const DESC = {
    '': 'Niente in mano. Si può sollevare, trascinare, fare a pugni.',
    pugni: 'Le mani. Per i pugni e per tutto il resto.',
    coltello: 'Un coltello da cucina. Corto, silenzioso.', pala: 'Per scavare dove la terra è morbida: bosco, vigne, spiaggia, discarica.',
    piede: 'Piede di porco. Apre porte, casse e teste.', carriola: 'Ci sta un corpo, se lo spingi in due. Cigola.',
    bomboletta: 'Vernice spray. Un muro alla volta.', pennello: 'Pennello e barattolo: per un murale ci vuole tempo.', gesso: 'Gesso bianco. Si cancella con la pioggia, ma intanto si legge.',
    benzina: 'Una tanica piena. Per la macchina, o per bruciare quello che non deve restare.', telefono: 'Cellulare. Chiama la Guardia, l\'ambulanza, la banda.',
    fotocamera: 'Macchina fotografica. Le prove valgono più delle parole.', carte: 'Un mazzo napoletano un po\' unto.', roba: 'Roba. Si vende di notte, si paga in altri modi.',
    refurtiva: 'Roba non tua. Lo Squalo la compra.', corda: 'Corda da barca, robusta. Lega, trascina, zavorra.', sacchi: 'Sacchi neri dell\'Emporio. Ci entra di tutto.',
    spugne: 'Spugne. Con il sapone il sangue viene via del tutto.', sapone: 'Sapone di Marsiglia, quello vero arriva con la nave.', colla: 'Colla da manifesti. Si spalma col pennello.',
    chiodi: 'Chiodi lunghi. Con due assi si chiude una porta.', carta: 'Risma di carta. Per stampare.', inchiostro: 'Inchiostro da ciclostile. Macchia le dita, e le dita parlano.',
    poster: 'Manifesti stampati di nascosto. Servono la colla e un muro, di notte.', libretto: 'Libretti clandestini. Si passano solo a chi ti fidi.',
  };

  // ---------------- STILE (come il menu Zaino) ----------------
  const CSS = `
#ts-menu { position: absolute; inset: 0; z-index: 60; display: none; background: rgba(12,12,16,.88); backdrop-filter: blur(3px); color: #d8d4cc; font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; pointer-events: auto; }
#ts-menu.on { display: block; }
#ts-menu .fr { position: absolute; inset: 26px 40px; border: 1px solid #2c2c34; background: #16161b; display: grid; grid-template-rows: auto 1fr auto; }
#ts-menu header { display: flex; justify-content: center; align-items: center; gap: 34px; padding: 22px 0 6px; }
#ts-menu header b { font-size: 21px; letter-spacing: .06em; color: #fff; font-weight: 700; }
#ts-menu header span { font-size: 21px; letter-spacing: .06em; color: #55555c; font-weight: 700; cursor: pointer; }
#ts-menu header kbd, #ts-menu footer kbd { font: 700 9px system-ui; border: 1px solid #77707a; color: #c8c0b0; padding: 2px 6px; border-radius: 2px; }
#ts-menu header kbd.y { background: #e8d040; color: #111; border-color: #e8d040; }
#ts-menu .x { position: absolute; right: 16px; top: 14px; width: 30px; height: 30px; border: 1px solid #3a3a42; background: none; color: #aaa; cursor: pointer; font-size: 16px; }
#ts-menu main { display: grid; grid-template-columns: 360px 1fr 300px; gap: 48px; padding: 18px 56px; min-height: 0; overflow: auto; }
#ts-menu h4 { margin: 0 0 14px; text-align: center; font-size: 13px; letter-spacing: .12em; font-weight: 600; color: #b8b4ac; }
#ts-bag { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-flow: row dense; gap: 8px; }
#ts-bag .c { position: relative; aspect-ratio: 1; background: #1c1c22; border: 1px solid #2a2a32; cursor: pointer; display: grid; place-items: center; padding: 0; }
#ts-bag .c.w2 { grid-column: span 2; aspect-ratio: 2.05; }
#ts-bag .c:hover { border-color: #5a5a64; } #ts-bag .c.sel { border-color: #e8d040; background: #222228; }
#ts-bag .c.on::before { content: ''; position: absolute; top: -4px; left: 50%; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: #e8d040; }
#ts-bag .c.hot::before { content: ''; position: absolute; top: -4px; left: 50%; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: #e04a4a; }
#ts-bag .c.hot { border-top-color: #e04a4a; }
#ts-bag .c canvas { width: 64px; height: 32px; image-rendering: pixelated; } #ts-bag .c.w2 canvas { width: 128px; height: 64px; }
#ts-bag .c .q { position: absolute; right: 7px; bottom: 4px; font-size: 17px; font-weight: 700; color: #e8e4dc; }
#ts-bag .c .k { position: absolute; left: 6px; top: 4px; font-size: 9px; color: #6a6670; }
#ts-bag .c.empty { cursor: default; background: #19191e; border-color: #222228; }
#ts-det { text-align: center; }
#ts-det .lbl { font-size: 12px; letter-spacing: .12em; color: #a8a4a0; font-weight: 600; }
#ts-det .nm { font-size: 23px; font-weight: 700; color: #e8d040; letter-spacing: .04em; margin: 6px 0 14px; text-transform: uppercase; }
#ts-det .big { width: 232px; height: 154px; margin: 0 auto; background: #1c1c22; border: 1px solid #2a2a32; display: grid; place-items: center; }
#ts-det .big canvas { width: 128px; height: 64px; image-rendering: pixelated; }
#ts-det .sub { font-size: 13px; color: #8a8690; margin-top: 8px; } #ts-det .ds { font-size: 14px; color: #a8a4a0; line-height: 1.5; margin: 18px auto 16px; max-width: 300px; }
#ts-det .bars { max-width: 300px; margin: 0 auto; text-align: left; display: grid; gap: 12px; }
#ts-det .bar { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; display: grid; grid-template-columns: 1fr auto; row-gap: 4px; } #ts-det .bar em { color: #6ad860; font-style: normal; }
#ts-det .bar i { grid-column: 1 / 3; height: 2px; background: #3a3a42; position: relative; } #ts-det .bar i b { position: absolute; left: 0; top: 0; bottom: 0; background: #a8a4a0; }
#ts-det .act { margin-top: 22px; background: none; border: 1px solid #77707a; color: #e8e4dc; font: 700 13px system-ui; letter-spacing: .12em; padding: 9px 20px; cursor: pointer; }
#ts-det .act:hover { border-color: #e8d040; color: #e8d040; } #ts-det .act[disabled] { color: #77707a; border-color: #3a3a42; cursor: default; }
#ts-here { display: grid; gap: 8px; align-content: start; }
#ts-here button { text-align: left; background: #1c1c22; border: 1px solid #2a2a32; color: #e8e4dc; font: 600 13.5px system-ui; padding: 10px 12px; cursor: pointer; display: grid; gap: 3px; }
#ts-here button:hover { border-color: #e8d040; } #ts-here button[disabled] { color: #77707a; cursor: default; } #ts-here button[disabled]:hover { border-color: #2a2a32; }
#ts-here button small { font-weight: 400; font-size: 11.5px; color: #8a8690; } #ts-here button .u { font: 700 9px system-ui; color: #e8d040; margin-right: 6px; }
#ts-here .none { font-size: 13px; color: #77707a; line-height: 1.5; text-align: center; }
#ts-msg { margin-top: 12px; font-size: 13px; color: #e8d040; text-align: center; min-height: 1.2em; }
#ts-menu footer { display: flex; align-items: center; gap: 34px; padding: 18px 56px 22px; font-size: 13px; letter-spacing: .1em; font-weight: 600; color: #b8b4ac; }
#ts-menu footer kbd { border-radius: 10px; font-style: italic; } #ts-menu footer .cash { margin-left: auto; color: #e8e4dc; } #ts-menu footer .cash b { color: #e8d040; }
#ts-hint { position: absolute; left: 50%; bottom: 108px; transform: translateX(-50%); z-index: 30; pointer-events: auto; cursor: pointer; display: none; align-items: center; gap: 8px;
  background: rgba(22,22,27,.92); border: 1px solid #3a3a42; padding: 4px 10px; font: 600 13px system-ui; color: #e8e4dc; }
#ts-hint.on { display: flex; } #ts-hint kbd { font: 700 9px system-ui; border: 1px solid #e8d040; color: #e8d040; padding: 1px 5px; border-radius: 8px; }
#ts-hint canvas { width: 32px; height: 16px; image-rendering: pixelated; }
#ts-btn { position: absolute; right: 14px; bottom: 34px; z-index: 30; pointer-events: auto; cursor: pointer; background: #16161b; border: 1px solid #3a3a42; color: #e8e4dc;
  font: 700 10px system-ui; letter-spacing: .14em; padding: 4px 9px; display: flex; gap: 7px; align-items: center; }
#ts-btn:hover { border-color: #e8d040; } #ts-btn canvas { width: 32px; height: 16px; image-rendering: pixelated; }
@media (max-width: 1100px) { #ts-menu main { grid-template-columns: 1fr 1fr; padding: 14px 24px; gap: 24px; } #ts-here { grid-column: 1 / 3; } #ts-menu .fr { inset: 10px; } }
@media (max-width: 700px) { #ts-menu main { grid-template-columns: 1fr; } #ts-here { grid-column: auto; } #ts-menu footer { flex-wrap: wrap; gap: 12px; padding: 12px 18px; } #ts-btn { bottom: 64px; right: 8px; } #ts-hint { bottom: 150px; } }
`;
  function mount() {
    if ($('ts-menu')) return true;
    const app = $('app') || document.body; if (!app) return false;
    const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
    const m = document.createElement('div'); m.id = 'ts-menu';
    m.innerHTML = `<div class="fr"><header><kbd>I</kbd><b>TASCHE</b><span data-go="book">TACCUINO</span><kbd>TAB</kbd><button class="x" data-go="close">×</button></header>
      <main><section><h4>BORSA</h4><div id="ts-bag"></div></section><section id="ts-det"></section><section><h4>QUI, ADESSO</h4><div id="ts-here"></div><div id="ts-msg"></div></section></main>
      <footer><span><kbd>CLIC</kbd> SELEZIONA</span><span><kbd>2×</kbd> IMPUGNA</span><span><kbd>0-9</kbd> IMPUGNA SUBITO</span><span><kbd>U</kbd> FAI LA PRIMA</span><span><kbd>ESC</kbd> TORNA AL GIOCO</span><span class="cash">IN TASCA <b id="ts-cash"></b></span></footer></div>`;
    app.appendChild(m);
    const h = document.createElement('div'); h.id = 'ts-hint'; h.innerHTML = '<canvas width="32" height="16"></canvas><span></span><kbd>U</kbd>'; app.appendChild(h);
    h.addEventListener('click', () => useFirst());
    const b = document.createElement('button'); b.id = 'ts-btn'; b.innerHTML = '<canvas width="32" height="16"></canvas>TASCHE · I'; app.appendChild(b);
    b.addEventListener('click', () => toggle());
    m.addEventListener('click', e => {
      const go = e.target.closest('[data-go]'); if (go) { toggle(false); if (go.dataset.go === 'book') dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' })); return; }
      const it = e.target.closest('[data-it]'); if (it) { U.sel = it.dataset.it; if (e.detail >= 2) equip(U.sel); else render(true); return; }
      if (e.target.closest('[data-eq]')) { equip(U.sel); return; }
      const ac = e.target.closest('[data-ac]'); if (ac && !ac.disabled) run(+ac.dataset.ac);
    });
    return true;
  }

  // ---------------- DATI ----------------
  const items = st => [{ id: '', name: 'mani libere', kind: 'mani', on: !st.player.hand && st.player.cur === 'pugni' }].concat(Azioni.playerItems(st).filter(x => x.id !== 'pugni'));
  const acts = st => (Azioni.playerActions(st) || []);
  const LONG = { lupara: 1, mitra: 1, carriola: 1, pala: 1 };
  function say(s) { U.msg = s || ''; U.msgT = Date.now(); U.sig = ''; }
  function equip(id) {
    const st = ST(); if (!st) return;
    if (Azioni.playerEquip(st, id || null)) { const it = items(st).find(x => x.id === (id || '')); U.sel = id || ''; say(id ? `In mano: ${it ? it.name : id}.` : 'Mani libere.'); }
    else say('Non ce l\'hai.');
    render(true);
  }
  function run(i) {
    const st = ST(); if (!st) return; const a = acts(st)[i]; if (!a || !a.run) return;
    const r = a.run(); say(typeof r === 'string' ? r : a.label); render(true);
  }
  function useFirst() {
    const st = ST(); if (!st) return; const a = acts(st).find(x => x.run); if (!a) { say('Qui non c\'è niente da fare.'); return; }
    const r = a.run(); const msg = typeof r === 'string' ? r : a.label;
    if (U.open) { say(msg); render(true); } else if (PV().G && PV().G.feed) PV().G.feed(st, msg, 'info');
  }
  function toggle(on) {
    if (!mount()) return; const pv = PV(); if (!pv) return;
    U.open = on === undefined ? !U.open : on; $('ts-menu').classList.toggle('on', U.open);
    if (pv.ui) pv.ui.menu = U.open;   // il gioco va in pausa, come col Taccuino
    if (U.open) { const st = ST(); U.sel = st ? (st.player.hand || (st.player.cur !== 'pugni' ? st.player.cur : '')) : ''; }
    U.sig = ''; render(true);
  }

  // ---------------- DISEGNO ----------------
  function detail(st, it) {
    const p = st.player, W = it && G().WEAPONS[it.id], on = it && it.on;
    let h = `<div class="lbl">${on ? 'IN MANO' : it && it.kind === 'arma' ? 'ARMA' : 'OGGETTO'}${W && W.slot ? ` · SLOT ${W.slot}` : ''}</div><div class="nm">${esc(it ? it.name : '—')}</div><div class="big"><canvas width="32" height="16" data-ic="${esc((it && it.id) || 'pugni')}"></canvas></div>`;
    if (W && p.arms[it.id] && p.arms[it.id].mag !== undefined) h += `<div class="sub">Caricatore ${p.arms[it.id].mag}/${W.mag || '?'} · scorta ${p.arms[it.id].res || 0}</div>`;
    else if (it && it.count != null && it.kind !== 'mani') h += `<div class="sub">Ne hai ${esc(it.count)}</div>`;
    h += `<div class="ds">${esc(DESC[it ? it.id : ''] || (W ? W.name : ''))}</div>`;
    if (W) { const bar = (l, v, max, txt) => `<div class="bar">${l}<em>${txt}</em><i><b style="width:${Math.max(4, Math.min(100, v / max * 100))}%"></b></i></div>`; h += `<div class="bars">${bar('DANNO', W.dmg || 0, 60, W.dmg || 0)}${W.rate ? bar('CADENZA', 1 / W.rate, 12, (1 / W.rate).toFixed(1) + '/S') : ''}${bar('GITTATA', W.range || 1, 30, Math.round(W.range || 1) + ' M')}</div>`; }
    h += `<button class="act" data-eq ${on ? 'disabled' : ''}>${on ? (it.id ? 'IN MANO' : 'MANI LIBERE') : it && it.id ? 'IMPUGNA' : 'LIBERA LE MANI'}</button>`;
    return h;
  }
  function render(force) {
    const st = ST(); if (!st || !mount()) return;
    const p = st.player, held = p.hand || p.cur || 'pugni';
    icon($('ts-btn').querySelector('canvas'), held);
    const A = st.over || (PV().ui && (PV().ui.intro || PV().ui.dialog)) ? [] : acts(st), first = A.find(x => x.run);
    const hint = $('ts-hint');
    hint.classList.toggle('on', !!first && !U.open);
    if (first && !U.open) { icon(hint.querySelector('canvas'), held); hint.querySelector('span').textContent = first.label; }
    if (!U.open) return;
    const I = items(st);
    if (!I.some(x => x.id === U.sel)) U.sel = '';
    const sig = JSON.stringify([I.map(x => [x.id, x.count, x.on]), A.map(x => [x.label, x.off]), U.msg, U.sel, Math.round(p.money)]);
    if (!force && sig === U.sig) return; U.sig = sig;
    const cells = I.map((x, i) => `<button class="c${LONG[x.id] ? ' w2' : ''}${x.on ? ' on' : ''}${x.id === U.sel ? ' sel' : ''}${x.id === 'refurtiva' || x.id === 'roba' ? ' hot' : ''}" data-it="${esc(x.id)}" title="${esc(x.name)}">${i < 10 ? `<span class="k">${i}</span>` : ''}<canvas width="32" height="16" data-ic="${esc(x.id || 'pugni')}"></canvas>${x.count != null && x.kind !== 'mani' ? `<span class="q">${esc(x.count)}</span>` : ''}</button>`);
    let used = I.reduce((a, x) => a + (LONG[x.id] ? 2 : 1), 0); while (used < 24) { cells.push('<div class="c empty"></div>'); used++; }
    $('ts-bag').innerHTML = cells.join('');
    $('ts-det').innerHTML = detail(st, I.find(x => x.id === U.sel));
    $('ts-menu').querySelectorAll('canvas[data-ic]').forEach(c => icon(c, c.dataset.ic));
    let fi = -1;
    $('ts-here').innerHTML = A.length ? A.map((a, i) => { const u = a.run && fi < 0 ? (fi = i, '<span class="u">U</span>') : ''; return `<button data-ac="${i}" ${a.run ? '' : 'disabled'}><span>${u}${esc(a.label)}</span>${a.off ? `<small>${esc(a.off)}</small>` : ''}</button>`; }).join('') : '<div class="none">Qui, con quello che hai in mano, niente.<br>Impugna qualcos\'altro o spostati.</div>';
    $('ts-msg').textContent = Date.now() - U.msgT < 8000 ? U.msg : '';
    $('ts-cash').textContent = `${Math.round(p.money || 0)}.000 LIRE`;
  }

  // ---------------- TASTI ----------------
  addEventListener('keydown', e => {
    const pv = PV(); if (!pv || !pv.st) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (pv.ui && (pv.ui.intro || pv.ui.over || pv.ui.dialog || pv.ui.book)) return;
    const k = e.key.toLowerCase();
    if (U.open && k === 'tab') { toggle(false); return; }
    if (k === 'i') { e.preventDefault(); e.stopImmediatePropagation(); toggle(); return; }
    if (k === 'u') { e.preventDefault(); e.stopImmediatePropagation(); useFirst(); return; }
    if (!U.open) return;
    if (k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); toggle(false); return; }
    if (k >= '0' && k <= '9') { e.preventDefault(); e.stopImmediatePropagation(); const it = items(pv.st)[+k]; if (it) equip(it.id); }
  }, true);
  setInterval(() => { try { render(false); } catch (e) { } }, 250);
  return { icon, ICONS, toggle, render, equip, useFirst };
})();
