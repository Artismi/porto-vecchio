// Porto Vecchio — Le icone a schermo (10-11 ottobre) [mobile]
// [colore1] Sul COMPUTER cinque pulsanti, ognuno col suo tasto scritto sotto: 6 bomboletta, 7 tavoletta, 8 BMX, 9 skate, I zaino
// (1-5 restano le armi; P e X fanno ancora bici e tavola). Sul TELEFONO tre icone che girano fra i loro stati a ogni tocco:
// - Graffiti: mani libere → bomboletta → tavoletta → mani libere (col pennarello se non hai bombolette).
// - Ruote: a piedi → BMX → skate → a piedi (lo skate solo se hai la tavola).
// - Zaino: il menu; il numero sono le cose da fare qui. La mappa: tocca la minimappa.
// Più la mano, solo quando impugni un'arma o un oggetto: con l'arma sul telefono si spara dove tocchi (main.js, tapShoots)
// e il tocco sulla mano ricarica; con un oggetto il tocco sulla mano lo usa (il cibo si mangia, la pala scava…). La ✕ lo rimette via.
// Sostituisce il pulsante rotondo ZAINO di menu_ui.js (#muBtn) e il riquadro «Qui» di risacca_ui.js (nascosti dal CSS qui sotto).
const Comandi = (() => {
  'use strict';
  if (typeof document === 'undefined') return {};
  const $ = id => document.getElementById(id), PV = () => window.__pv, ST = () => PV() && PV().st;
  const say = (m, k) => { const pv = PV(); if (pv && pv.toast && m) pv.toast(m, k); };
  const has = id => { try { return (Oggetti.inv(ST()) || {})[id] >= 1; } catch (e) { return false; } };
  const equip = id => typeof Azioni !== 'undefined' && Azioni.playerEquip(ST(), id || null);
  const W = () => typeof Writing !== 'undefined' ? Writing : null;
  const tavOn = st => { const p = st.player; return (p.hand === 'bomboletta' || p.hand === 'pennarello') && W() && W().mode(st) === 'tavoletta'; };
  const onBmx = st => { const p = st.player, v = p.vehicle && st.vehicles.find(q => q.id === p.vehicle); return !!(v && v.kind === 'bmx'); };
  const onSk = st => typeof Skate !== 'undefined' && Skate.on(st);
  let lastMode = 'libero';

  // ---------------- le azioni delle icone ----------------
  function bomboletta() {
    const st = ST(), p = st.player, w = W();
    if ((p.hand === 'bomboletta' || p.hand === 'pennarello') && !tavOn(st)) { equip(null); say('Mani libere.'); return; }
    if (w && w.mode(st) === 'tavoletta') w.setMode(st, lastMode);
    if (has('bomboletta')) { if (p.hand !== 'bomboletta') equip('bomboletta'); else say('Bomboletta: ' + w.mode(st) + '.'); return; }
    if (has('pennarello')) { equip('pennarello'); return; }
    say('Niente bombolette: le trovi in ferramenta e in officina.', 'bad');
  }
  function tavoletta() {
    const st = ST(), w = W(); if (!w) return;
    if (tavOn(st)) { equip(null); w.setMode(st, lastMode); say('Mani libere.'); return; }
    const tool = has('bomboletta') ? 'bomboletta' : has('pennarello') ? 'pennarello' : null;
    if (!tool) { say('Per la tavoletta ti serve una bomboletta o un pennarello.', 'bad'); return; }
    if (w.mode(st) !== 'tavoletta') lastMode = w.mode(st);
    equip(tool); w.setMode(st, 'tavoletta');
    say(PV().touchMode ? 'Tavoletta: trascina il dito sul muro (o su un mezzo) per la finestra, poi ci disegni sopra.' : 'Tavoletta: trascina sul muro (o su un mezzo) la finestra, poi ci disegni sopra.');
  }
  function bmx() {
    const st = ST(); if (onSk(st)) Skate.dismount(st, true);
    PV().bmx();
  }
  function skate() {
    const st = ST(), p = st.player;
    if (onBmx(st)) PV().act('veicolo');
    if (p.vehicle && !onSk(st)) { say('Prima scendi dal mezzo.', 'bad'); return; }
    if (typeof Skate === 'undefined' || Skate.key(st)) return;
    if (!Skate.S(st).owned) say('La tavola non ce l\'hai più: ne trovi un\'altra nei posti dello skate (il cerchio giallo).', 'bad');
    else say(p.indoor ? 'Al chiuso la tavola resta sotto il braccio.' : 'Qui non si va in tavola.', 'bad');
  }
  function graffiti() {   // mani libere → bomboletta → tavoletta → mani libere
    const st = ST(), p = st.player, spray = p.hand === 'bomboletta' || p.hand === 'pennarello';
    if (!spray) { bomboletta(); return; }
    if (!tavOn(st)) { tavoletta(); return; }
    tavoletta();   // dalla tavoletta: mani libere
  }
  function ruote() {   // a piedi → BMX → skate → a piedi
    const st = ST();
    if (onSk(st)) { Skate.dismount(st); return; }
    if (onBmx(st)) { if (typeof Skate !== 'undefined' && Skate.S(st).owned) skate(); else bmx(); return; }
    bmx();
  }
  function mappa() { if (typeof MenuUI === 'undefined') return; if (MenuUI.state.open && MenuUI.state.tab === 'mappa') MenuUI.close(); else MenuUI.open('mappa'); }
  function zaino() { if (typeof MenuUI !== 'undefined') MenuUI.toggle('zaino'); }
  // la mano: usa quello che impugni
  const HANDACT = ['scava', 'dipingi', 'foto', 'guardia', 'ambulanza', 'banda'];
  function usaMano() {
    const st = ST(), p = st.player, pv = PV(), h = p.hand;
    if (!h) {
      const Wp = pv.G.WEAPONS[p.cur]; if (!Wp) return;
      if (Wp.throw) { say(pv.touchMode ? 'Tocca dove lanciarla.' : 'Col destro la lanci verso il puntatore.'); return; }
      pv.G.reload(st); return;
    }
    if (h === 'bomboletta') { pv.sprayMode(); return; }
    if (h === 'pennarello') { say(pv.touchMode ? 'Tieni il dito su un muro vicino: la tua tag.' : 'Tieni premuto il sinistro su un muro vicino: la tua tag.'); return; }
    const C = typeof Oggetti !== 'undefined' && Oggetti.CAT[h];
    if (C && C.eat) { const r = Oggetti.consume(st, h); if (r && r.msg) say(r.msg, r.ok === false ? 'bad' : 'info'); if (!has(h)) equip(null); return; }
    const acts = typeof Azioni !== 'undefined' ? (Azioni.playerActions(st) || []) : [], a = acts.find(x => HANDACT.includes(x.id));
    if (a && a.run) { const r = a.run(); say(typeof r === 'string' ? r : a.label); return; }
    if (a && a.off) { say(a.off, 'bad'); return; }
    say('Qui con questo non c\'è niente da fare.');
  }

  // ---------------- le icone (pixel art 16×16) ----------------
  function px(c, rows, pal) { const x = c.getContext('2d'); x.clearRect(0, 0, 16, 16); rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1); } })); }
  const DRAW = {
    bomboletta: c => px(c, ['      kk        ', '     kwwk   r r ', '     kkkk  r r  ', '    rrrrrr  r r ', '    rwrrrr      ', '    rwrrrr      ', '    rwrrrr      ', '    rrrrrr      ', '    rwrrrr      ', '    rwrrrr      ', '    rrrrrr      ', '    rwrrrr      ', '    rrrrrr      ', '    kkkkkk      '], { k: '#3a3a44', w: '#ffb0a0', r: '#c42a22' }),
    bmx: c => px(c, ['', '', '', '', '           kk   ', '          k     ', '    ccccccc     ', '    c   ck      ', '   c   c  k     ', ' ppp  c  ppp    ', 'p   pcccp   p   ', 'p  k p  p k p   ', 'p   p   p   p   ', ' ppp     ppp    '].map(r => r.padEnd(16)), { c: '#e8dcc0', k: '#1c1a22', p: '#a05ad8' }),
    skate: c => px(c, ['', '', '', '', '', '', '', ' y            y ', ' yrrrrrrrrrrrry ', '  yyyyyyyyyyyy  ', '   kk      kk   ', '   ww      ww   ', '   ww      ww   '].map(r => r.padEnd(16)), { y: '#ffd23a', r: '#ff5fa2', k: '#5a5a66', w: '#e8e0d0' }),
    tavoletta: c => px(c, ['', '  kkkkkkkkkkk   ', '  kwwwwwwwwwk   ', '  kwwrwwwwwwk   ', '  kwrwrwwbwwk   ', '  kwwwwrwbwwk  p', '  kwwwwwrwwwk pp', '  kwwbbwwwwwkpp ', '  kwwwwwwwwwpp  ', '  kwwwwwwwwppk  ', '  kwwwwwwwwwwk  ', '  kkkkkkkkkkkk  '].map(r => r.padEnd(16)), { k: '#2a2a34', w: '#efe3c8', r: '#c42a22', b: '#2a6ac8', p: '#ffd23a' }),
  };
  function iconOf(c, id) {
    if (DRAW[id]) { DRAW[id](c); return; }
    if (typeof MenuUI !== 'undefined' && MenuUI.icon) MenuUI.icon(c, id);
  }

  // ---------------- la fila ----------------
  // [id, nome, tasto, azione, dove]: 'tch' solo sul telefono, 'pc' solo col mouse, '' sempre
  const ITEMS = [
    ['graffiti', 'Bomboletta · tavoletta', '', graffiti, 'tch'],
    ['bomboletta', 'Bomboletta', '6', bomboletta, 'pc'],
    ['tavoletta', 'Tavoletta (bomboletta o pennarello)', '7', tavoletta, 'pc'],
    ['ruote', typeof Skate !== 'undefined' ? 'BMX · skate' : 'BMX', '', ruote, 'tch'],
    ['bmx', 'BMX', '8', bmx, 'pc'],
    ...(typeof Skate !== 'undefined' ? [['skate', 'Skate', '9', skate, 'pc']] : []),   // [pausa] lo skate è fuori dalla build per ora
    ['zaino', 'Zaino', 'I', zaino, ''],
  ];
  const KEYS = { '6': bomboletta, '7': tavoletta, '8': bmx }; if (typeof Skate !== 'undefined') KEYS['9'] = skate;
  addEventListener('keydown', e => {
    const k = e.key, pv = PV(); if (!KEYS[k] || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !pv || !ST()) return;
    const ui = pv.ui, tag = (e.target && e.target.tagName) || ''; if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable) return;
    if (ui.intro || ui.over || ui.dialog || ui.book || ui.menu || (typeof Cantiere !== 'undefined' && Cantiere.active())) return;
    e.preventDefault(); e.stopImmediatePropagation(); try { KEYS[k](); } catch (x) { console.warn('[comandi]', x); } upd(true);
  }, true);
  function mount() {
    if ($('dock') || !$('app')) return !!$('dock');
    const css = document.createElement('style'); css.textContent = `
#muBtn { display: none !important; }
#weapon { display: none !important; }   /* l'arma e i colpi stanno sulla mano */
#dock { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); z-index: 31; display: flex; gap: 8px; align-items: flex-end; pointer-events: auto; }
#dock button { position: relative; width: 50px; height: 50px; border-radius: 50%; padding: 0; cursor: pointer; display: grid; place-items: center; touch-action: manipulation; user-select: none; -webkit-user-select: none;
  border: 1px solid rgba(233,220,188,.25); background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.14), transparent 45%), linear-gradient(135deg, #24443c, #2e2c40 50%, #24443c);
  box-shadow: 0 0 0 2px rgba(13,16,21,.8), 0 4px 12px rgba(0,0,0,.45); }
#dock button:hover { transform: translateY(-1px); }
#dock button canvas { width: 30px; height: 30px; image-rendering: pixelated; pointer-events: none; }
#dock button.on { box-shadow: 0 0 0 2px rgba(13,16,21,.8), 0 0 0 4px #ffd23a, 0 4px 12px rgba(0,0,0,.45); }
#dock button.off canvas { opacity: .35; }
#dock button.tch { display: none; }
@media (pointer: coarse) { #dock button.pc { display: none; } #dock button.tch { display: grid; } }
#dock button kbd { position: absolute; left: 50%; bottom: -3px; transform: translateX(-50%); font: 600 9px 'Saira Condensed', sans-serif; color: #E9DCBC; background: rgba(13,16,21,.85); padding: 0 4px; border-radius: 3px; pointer-events: none; }
#dock .dot { position: absolute; right: -4px; top: -4px; min-width: 18px; height: 18px; border-radius: 9px; background: #FF5FA2; color: #0D1015; font: 700 11px/18px 'Saira Condensed', sans-serif; text-align: center; pointer-events: none; }
#dkHand { width: 64px !important; height: 64px !important; margin-right: 6px; box-shadow: 0 0 0 2px rgba(13,16,21,.8), 0 0 0 4px #B08D57, 0 4px 12px rgba(0,0,0,.45) !important; }
#dkHand canvas { width: 40px !important; height: 20px !important; margin-bottom: 10px; }
#dkHand canvas.sq { width: 30px !important; height: 30px !important; }
#dkHand .lb { position: absolute; left: 50%; bottom: 5px; font-size: 9px !important; transform: translateX(-50%); white-space: nowrap; font: 600 10px 'Saira Condensed', sans-serif; letter-spacing: .08em; text-transform: uppercase; color: #E9DCBC; text-shadow: 1px 1px 0 #000; pointer-events: none; }
#dkHand .x { position: absolute; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font: 700 12px sans-serif; color: #E9DCBC; background: #2a2030; border: 1px solid rgba(233,220,188,.5); }
#dkHand .x { right: -6px; top: -6px; }
#dock button[data-id=graffiti]::after, #dock button[data-id=bomboletta]::after { content: ''; position: absolute; left: 50%; bottom: 4px; width: 14px; height: 4px; margin-left: -7px; border-radius: 2px; background: var(--col, transparent); pointer-events: none; }
#rs-here button.qui { display: none !important; }   /* il numero sta sullo zaino */
#ctx { bottom: 112px !important; }
#rs-here { bottom: 72px !important; }
@media (pointer: coarse) {
  #ctx { bottom: auto !important; }
  #dock { left: 168px; transform: none; bottom: 12px; gap: 7px; max-width: calc(100vw - 410px); flex-wrap: wrap-reverse; }
  #dock button { width: 46px; height: 46px; } #dock button canvas { width: 28px; height: 28px; } #dock button kbd { display: none; }
  #dkHand { width: 58px !important; height: 58px !important; }
  #rs-here { left: 168px !important; transform: none !important; bottom: 76px !important; max-width: calc(100vw - 410px) !important; justify-content: flex-start !important; }
  #cnBtn { right: 8px !important; bottom: auto !important; top: 186px !important; }
  #me-box, #sound, #rs-open, #rs-sneak { display: none !important; }   /* sul telefono: i bisogni nel menu (Chi è), Risacca e chat toccando le persone */
  #debt { pointer-events: auto; cursor: pointer; }   /* toccare i soldi e l'ora apre il taccuino */
  #feed .fi:nth-child(n+3) { display: none; }
}
@media (pointer: coarse) and (max-width: 640px) {
  #dock { left: auto; right: 8px; top: 190px; bottom: auto; flex-direction: column; flex-wrap: nowrap; align-items: center; max-width: none; }
  #dkHand { margin: 0 0 14px 0; }
  #rs-here { left: 12px !important; max-width: calc(100vw - 80px) !important; bottom: 200px !important; }
  #cnBtn { right: auto !important; left: 12px !important; top: 150px !important; }
}`;
    document.head.appendChild(css);
    const d = document.createElement('div'); d.id = 'dock'; d.className = 'hud';
    const hb = document.createElement('button'); hb.id = 'dkHand'; hb.hidden = true; hb.title = 'In mano';
    hb.innerHTML = '<canvas width="32" height="16"></canvas><span class="lb"></span><span class="x" title="Metti via">✕</span>';
    hb.addEventListener('click', e => { if (e.target.classList.contains('x')) { equip(null); say('Mani libere.'); } else usaMano(); upd(true); });
    d.appendChild(hb);
    ITEMS.forEach(([id, name, k, fn, where]) => {
      const b = document.createElement('button'); b.dataset.id = id; b.title = name + (k ? ' (' + k + ')' : ''); if (where) b.className = where;
      b.innerHTML = `<canvas width="16" height="16"></canvas>${k ? `<kbd>${k}</kbd>` : ''}${id === 'zaino' ? '<span class="dot" hidden></span>' : ''}`;
      b.addEventListener('click', () => { try { fn(); } catch (e) { console.warn('[comandi]', e); } upd(true); });
      d.appendChild(b);
    });
    $('app').appendChild(d);
    const mi = $('mini'); if (mi) { mi.style.pointerEvents = 'auto'; mi.style.cursor = 'pointer'; mi.title = 'Mappa'; mi.addEventListener('click', () => mappa()); }   // la minimappa apre la mappa
    return true;
  }
  let handKey = '';
  function upd(now) {
    const pv = PV(), st = ST(); if (!pv || !st || !mount()) return;
    const ui = pv.ui, p = st.player, d = $('dock');
    const hide = ui.intro || ui.over || ui.dialog || ui.book || ui.menu || (typeof Cantiere !== 'undefined' && Cantiere.active()) || (window.Editor && Editor.active && Editor.active());
    d.style.display = hide ? 'none' : ''; if (hide) return;
    const spray = p.hand === 'bomboletta' || p.hand === 'pennarello', sk = onSk(st), bm = onBmx(st);
    d.querySelectorAll('button[data-id]').forEach(b => {
      const id = b.dataset.id, c = b.querySelector('canvas');
      const look = id === 'graffiti' ? (tavOn(st) ? 'tavoletta' : 'bomboletta') : id === 'ruote' ? (sk ? 'skate' : 'bmx') : id;
      if (c.dataset.look !== look) { iconOf(c, look); c.dataset.look = look; }
      b.classList.toggle('on', id === 'graffiti' ? spray : id === 'ruote' ? sk || bm : id === 'bomboletta' ? spray && !tavOn(st) : id === 'tavoletta' ? tavOn(st) : id === 'bmx' ? bm : id === 'skate' ? sk : false);
      if (id === 'bomboletta' || id === 'tavoletta') b.classList.toggle('off', !has('bomboletta') && !has('pennarello'));
      if (id === 'skate') b.classList.toggle('off', !(typeof Skate !== 'undefined' && Skate.S(st).owned));
      if (id === 'graffiti' || id === 'bomboletta') { b.classList.toggle('off', !has('bomboletta') && !has('pennarello')); b.style.setProperty('--col', spray && ui.spray ? pv.SPRAY_COLS[ui.spray.col][0] : 'transparent'); }
      if (id === 'zaino') { const dot = b.querySelector('.dot'), n = typeof MenuUI !== 'undefined' && MenuUI.quiCount ? MenuUI.quiCount(st) : 0; dot.hidden = !n; dot.textContent = n; }
    });
    // la mano
    const hb = $('dkHand'), Wp = !p.hand && p.cur !== 'pugni' && pv.G.WEAPONS[p.cur], id = spray ? null : p.hand || (Wp ? p.cur : null);
    hb.hidden = !id; if (!id) { handKey = ''; return; }
    const ammo = Wp && p.arms[p.cur] ? (Wp.throw ? '×' + ((p.arms[p.cur].mag || 0) + (p.arms[p.cur].reserve || 0)) : (p.arms[p.cur].mag || 0) + '/' + (p.arms[p.cur].reserve || 0)) : '';
    const name = Wp ? Wp.name : (typeof Oggetti !== 'undefined' && Oggetti.nm ? Oggetti.nm(id) : id);
    const hint = Wp ? (pv.touchMode ? (Wp.throw ? 'tocca dove lanciarla' : 'tocca dove sparare · qui: ricarica') : (Wp.throw ? 'destro: lancia' : 'destro: spara · clic qui: ricarica'))
      : 'tocca qui per usarlo';
    const key = id + '|' + ammo;
    if (key !== handKey || now) {
      handKey = key;
      const wide = !!Wp || /^(pala|piccone|ascia|zappa|falce|sega|canna|carriola)$/.test(id), c = hb.querySelector('canvas');
      c.width = wide ? 32 : 16; c.height = 16; c.className = wide ? '' : 'sq';
      if (typeof MenuUI !== 'undefined' && MenuUI.icon) MenuUI.icon(c, id);
      hb.querySelector('.lb').textContent = ammo || name;
      hb.title = name + ' — ' + hint;
    }
  }
  setInterval(() => { try { upd(false); } catch (e) { if (!upd.err) { upd.err = 1; console.warn('[comandi]', e); } } }, 200);
  return { bomboletta, tavoletta, bmx, skate, mappa, zaino, usaMano, update: upd };
})();
