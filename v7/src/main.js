
(function () {
  'use strict';
  const G = Game, R = Render, A = Audio8, $ = id => document.getElementById(id);
  const app = $('app'), cv = $('cv');
  let st = G.create((Math.random() * 1e9) | 0);
  const ui = { intro: true, dialog: null, book: false, bookTab: 'people', letterbox: true, flash: 0, fade: 0, desat: false, time: 0, over: false, lastMoment: null, momentUntil: 0, aimPoint: null, zoom: .72 };
  const keys = {};
  const fmt = n => Math.round(n).toLocaleString('it-IT') + '.000';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const HUDSEL = '.hud:not(#dialog):not(#book):not(#screen)';
  const showHud = on => document.querySelectorAll(HUDSEL).forEach(e => e.style.visibility = on ? '' : 'hidden');

  // ---------- Ritratti in pixel art ----------
  function portrait(look, size) {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16; const x = c.getContext('2d');
    x.fillStyle = '#2a2140'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = look.top; x.fillRect(2, 12, 12, 4);
    x.fillStyle = look.skin; x.fillRect(4, 3, 8, 9); x.fillRect(7, 11, 2, 2);
    x.fillStyle = look.hair || '#222'; x.fillRect(4, 2, 8, 2); x.fillRect(3, 3, 1, 5); x.fillRect(12, 3, 1, 5);
    const hc = look.hatCol || '#333';
    if (look.hat === 'long') { x.fillRect(3, 3, 1, 9); x.fillRect(12, 3, 1, 9); }
    if (look.hat === 'bun') { x.fillRect(6, 0, 4, 2); }
    if (['cap', 'capback', 'beanie', 'flat', 'police', 'scarf', 'fedora'].includes(look.hat)) { x.fillStyle = look.hat === 'police' ? '#1b2544' : hc; x.fillRect(3, 1, 10, 3); if (look.hat === 'cap' || look.hat === 'police') x.fillRect(4, 4, 8, 1); if (look.hat === 'fedora') { x.fillRect(1, 3, 14, 1); } if (look.hat === 'police') { x.fillStyle = '#e8e8e8'; x.fillRect(3, 3, 10, 1); } if (look.hat === 'scarf') { x.fillRect(3, 3, 1, 7); x.fillRect(12, 3, 1, 7); } }
    x.fillStyle = '#141018'; x.fillRect(5, 6, 2, 2); x.fillRect(9, 6, 2, 2);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(6, 10, 4, 1);
    const ex = look.extra || '';
    if (ex.includes('moustache')) { x.fillStyle = '#2a1a12'; x.fillRect(5, 9, 6, 1); }
    if (ex.includes('glasses')) { x.fillStyle = '#1a1a1a'; x.fillRect(4, 6, 8, 1); }
    if (ex.includes('shades')) { x.fillStyle = '#050508'; x.fillRect(4, 5, 8, 3); }
    if (ex.includes('collar')) { x.fillStyle = '#fff'; x.fillRect(7, 12, 2, 1); }
    if (ex.includes('gold')) { x.fillStyle = '#e8c040'; x.fillRect(6, 13, 4, 1); }
    if (look.player) { x.fillStyle = '#ece6da'; x.fillRect(6, 12, 4, 4); x.fillStyle = look.hair; x.fillRect(5, 1, 6, 2); }
    if (look.dead) { x.fillStyle = 'rgba(20,10,20,.6)'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#c43c52'; x.fillRect(4, 6, 3, 1); x.fillRect(9, 6, 3, 1); }
    if (size) { c.style.width = size + 'px'; c.style.height = size + 'px'; }
    return c;
  }
  function weaponIcon(c, w) {
    if (typeof TascheUI !== 'undefined' && !['pugni', 'pistola', 'lupara', 'mitra', 'molotov'].includes(w)) { TascheUI.icon(c, w); return; }   // [azioni] attrezzi e coltello
    const x = c.getContext('2d'); x.clearRect(0, 0, 32, 16); const D = '#d8d0c0', S = '#8a8290', Wd = '#9a6a3a';
    const r = (col, a, b, cw, ch) => { x.fillStyle = col; x.fillRect(a, b, cw, ch); };
    if (w === 'pugni') { r(D, 10, 5, 12, 7); r(S, 10, 5, 12, 1); r(S, 13, 5, 1, 7); r(S, 16, 5, 1, 7); r(S, 19, 5, 1, 7); r(D, 8, 8, 3, 4); }
    if (w === 'pistola') { r(D, 6, 4, 18, 4); r(S, 6, 7, 18, 1); r(D, 8, 8, 5, 6); r(S, 13, 8, 2, 2); }
    if (w === 'lupara') { r(S, 2, 5, 18, 2); r(D, 2, 7, 18, 1); r(Wd, 18, 5, 12, 4); r(Wd, 24, 9, 6, 3); }
    if (w === 'mitra') { r(D, 5, 5, 18, 4); r(S, 3, 6, 3, 2); r(D, 12, 9, 3, 6); r(D, 20, 9, 3, 4); r(S, 23, 4, 7, 2); }
    if (w === 'molotov') { r('#4a8a4a', 13, 5, 7, 10); r('#6aaa6a', 14, 6, 2, 7); r('#e8d8b0', 15, 1, 3, 4); r('#ff8a30', 15, 0, 3, 2); }
  }

  // ---------- Input ----------
  const mouse = { nx: .5, ny: .5, active: false, down: false, pressed: false, cx: 0, cy: 0 };
  cv.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = cv.getBoundingClientRect(); mouse.nx = (e.clientX - r.left) / r.width; mouse.ny = (e.clientY - r.top) / r.height; mouse.cx = e.clientX - app.getBoundingClientRect().left; mouse.cy = e.clientY - app.getBoundingClientRect().top; mouse.active = true; });
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { mouse.down = false; const r = cv.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width; if (nx < .08) mouse.nx = 0; else if (nx > .92) mouse.nx = 1; else mouse.active = false; } });
  // [monte] tenendo premuta la rotella del mouse e trascinando, la visuale gira attorno al giocatore
  let camDrag = null; ui.drag = 0;
  // [telefono] due dita sullo schermo: pizzico per lo zoom (il secondo dito non cammina, non spara, non spruzza)
  const pin = new Map(); let pinD = 0, pinA = 0;
  const pinDist = () => { const [a, b] = [...pin.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  const pinAng = () => { const [a, b] = [...pin.values()]; return Math.atan2(b.y - a.y, b.x - a.x); };
  cv.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; pin.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pin.size === 2) { pinD = pinDist(); pinA = pinAng(); tg = null; if (tp.id !== null) { if (tp.mode === 'spray' && ui.spray) sprayEnd(); tpEnd(); } mouse.pressed = false; click.t = null; ui.mark = null; }
    if (pin.size >= 2) e.stopImmediatePropagation(); });
  cv.addEventListener('pointermove', e => { const q = pin.get(e.pointerId); if (!q) return; q.x = e.clientX; q.y = e.clientY;
    if (pin.size === 2) { const d = pinDist(), a = pinAng(); let da = a - pinA; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; zoomBy(pinD / d); ui.drag = (ui.drag || 0) + da; pinD = d; pinA = a; e.stopImmediatePropagation(); } });   // due dita: pizzico = zoom, torsione = la visuale gira
  const pinUp = e => { pin.delete(e.pointerId); };
  addEventListener('pointerup', pinUp); addEventListener('pointercancel', pinUp);
  cv.addEventListener('pointerdown', e => { if (e.button === 1) { camDrag = e.clientX; e.preventDefault(); } });
  addEventListener('pointermove', e => { if (camDrag !== null) { ui.drag += (e.clientX - camDrag) * .008; camDrag = e.clientX; } });
  addEventListener('pointerup', e => { if (e.button === 1) camDrag = null; });
  cv.addEventListener('pointerdown', e => { cv.focus(); A.init(); const r = cv.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
    if (window.Cantiere && Cantiere.active() && e.button !== 1) { Cantiere.down(e.button, nx, ny); return; }   // [cantiere] si costruisce, non si cammina
    if (e.button === 2) { mouse.down = true; mouse.pressed = true; return; }
    const busy = ui.intro || ui.over || ui.dialog || ui.book || ui.menu;
    if (e.button === 0 && !busy && window.Skate && Skate.on(st)) { tpGrab(e, 'skate', nx, ny); mouse.nx = nx; mouse.ny = ny; return; }   // [mobile] in tavola: tieni premuto e spingi verso quel punto
    if (e.button === 0 && ui.spray) { mouse.nx = nx; mouse.ny = ny; ui.spray.on = true; tpGrab(e, 'spray', nx, ny); return; }   // [graffiti] con la bomboletta si spruzza, non si cammina
    if (e.button === 0 && !busy && e.pointerType !== 'mouse' && tapShoots()) { tpGrab(e, 'fire', nx, ny); touchAimAt(nx, ny); touchFire = true; mouse.pressed = true; return; }   // [mobile] arma in mano: spari dove tocchi
    if (e.button === 0 && e.pointerType === 'touch' && !busy) { tg = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, nx, ny, drag: false }; try { cv.setPointerCapture(e.pointerId); } catch (x) { } return; }   // [telefono] il tocco decide al rilascio: tocco = vai lì, trascinamento = guardati attorno
    if (e.button === 0) { mouse.nx = nx; mouse.ny = ny; onClick(nx, ny, e.detail >= 2); } });
  // [telefono] un dito che si sposta più di 10 px trascina la visuale; se no, al rilascio è un tocco (due tocchi vicini e svelti: doppio)
  let tg = null, lastTap = { t: 0, x: 0, y: 0 };
  cv.addEventListener('pointermove', e => { if (!tg || e.pointerId !== tg.id) return;
    if (!tg.drag && Math.hypot(e.clientX - tg.x, e.clientY - tg.y) > 10) { tg.drag = true; tg.lx = e.clientX; tg.ly = e.clientY; }
    if (tg.drag) { const r = cv.getBoundingClientRect(); ui.drag = (ui.drag || 0) + (e.clientX - tg.lx) / r.width * 3.2; tg.lx = e.clientX; tg.ly = e.clientY; } });   // [telefono] un dito gira la visuale (non la sposta)
  const tgUp = e => { if (!tg || e.pointerId !== tg.id) return; const g = tg; tg = null; if (g.drag || e.type === 'pointercancel') return;
    const now = performance.now(), dbl = now - lastTap.t < 320 && Math.hypot(g.x - lastTap.x, g.y - lastTap.y) < 30; lastTap = { t: dbl ? 0 : now, x: g.x, y: g.y };
    mouse.nx = g.nx; mouse.ny = g.ny; onClick(g.nx, g.ny, dbl); };
  cv.addEventListener('pointerup', tgUp); cv.addEventListener('pointercancel', tgUp);
  // [mobile] il dito che tiene premuto: spruzza, spara o spinge la tavola seguendo dove si sposta
  const tp = { id: null, mode: null, nx: .5, ny: .5, aim: null };
  function tpGrab(e, mode, nx, ny) { tp.id = e.pointerId; tp.mode = mode; tp.nx = nx; tp.ny = ny; try { cv.setPointerCapture(e.pointerId); } catch (x) { } }
  function tpEnd() { if (tp.mode === 'fire') { touchFire = false; tp.aim = null; } tp.id = null; tp.mode = null; }
  cv.addEventListener('pointermove', e => { if (e.pointerId !== tp.id) return; const r = cv.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height; tp.nx = nx; tp.ny = ny;
    if (e.pointerType !== 'mouse' && (tp.mode === 'spray' || tp.mode === 'skate')) { mouse.nx = nx; mouse.ny = ny; }
    if (tp.mode === 'fire') touchAimAt(nx, ny); });
  // con un'arma da fuoco (o la molotov) in mano, sul telefono il tocco spara
  function tapShoots() { const p = st.player; return touchMode && !p.hand && p.cur !== 'pugni' && !!G.WEAPONS[p.cur] && !(window.Cantiere && Cantiere.active()); }
  function touchAimAt(nx, ny) { const h = pickAt(nx, ny); tp.aim = h && h.kind === 'npc' ? { x: h.n.x, y: h.n.y, id: h.n.id } : h && h.kind === 'car' ? { x: h.v.x, y: h.v.y } : R.screenToGround(nx, ny) || tp.aim; }
  addEventListener('pointerup', e => { if (e.button === 2) mouse.down = false; if (window.Cantiere && Cantiere.up) Cantiere.up(); if (e.button === 0 && ui.spray) sprayEnd(); if (e.pointerId === tp.id) tpEnd(); });
  addEventListener('pointercancel', e => { if (e.pointerId === tp.id) { if (tp.mode === 'spray' && ui.spray) sprayEnd(); tpEnd(); } });
  // [cantiere] tenendo premuto il sinistro e trascinando si posa una fila (muri, recinti, solchi dell'orto…)
  cv.addEventListener('pointermove', e => { if (!(e.buttons & 1) || !window.Cantiere || !Cantiere.active() || !Cantiere.drag) return; const r = cv.getBoundingClientRect(); Cantiere.drag((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
  // [graffiti] la bomboletta: il pennello dello Studio con la misura bloccata da bomboletta. Si impugna dalle Tasche;
  // in mano, il tasto sinistro spruzza sulla superficie sotto il puntatore, a portata di braccio (se è più in là ci si
  // avvicina camminando e poi si spruzza), la rotella cambia colore
  const SPRAY_COLS = [['#c42a22', 'rosso'], ['#1e1e24', 'nero'], ['#e8e0d0', 'bianco'], ['#2a6ac8', 'blu'], ['#e8c040', 'giallo'], ['#3a9a5a', 'verde'], ['#c84a9a', 'rosa'], ['#e8a020', 'arancio']];
  const sprayHave = k => { try { return (Oggetti.inv(st) || {})[k || 'bomboletta'] >= 1; } catch (e) { return false; } };
  // [writer] col pennarello (mop) e con la bomboletta in modalità tag/throw-up/pezzo/burner ci pensa writing.js
  function sprayGo(r) {
    if (r && r.go && !(click.t && click.t.spray && Math.hypot(click.t.x - r.go.x, click.t.y - r.go.y) < .4)) {   // troppo lontano: ci si avvicina al muro, poi si spruzza
      click.t = { kind: 'move', spray: 1, x: r.go.x, y: r.go.y, path: goalPath(r.go.x, r.go.y), run: false, best: 1e9, bestT: ui.time, fl: st.player.indoor ? st.player.indoor.b + ':' + st.player.indoor.f : '' }; ui.mark = { x: r.go.x, y: r.go.y, t: ui.time, k: 'move' };
    }
  }
  function sprayTick(dt) {
    const tool = st.player.hand === 'pennarello' ? 'pennarello' : 'bomboletta';
    const inHand = (st.player.hand === 'bomboletta' || st.player.hand === 'pennarello') && sprayHave(tool) && !st.player.vehicle;
    if (ui.spray && ui.spray.tool !== tool) { sprayEnd(); ui.spray = null; }
    if (inHand && !ui.spray) { ui.spray = { col: 0, on: false, dabs: 0, t: 0, tool }; toast(tool === 'pennarello' ? 'Pennarello in mano: tieni premuto su un muro e fai la tua tag (con le colature).' : 'Bomboletta in mano: tieni premuto il tasto sinistro su un muro vicino; la rotella cambia colore (' + SPRAY_COLS[0][1] + '). B: tag, throw-up, pezzo, burner.'); }
    if (!inHand && ui.spray) { sprayEnd(); ui.spray = null; }
    const S = ui.spray; if (!S || !S.on || !R.spray) return;
    if (window.Writing && Writing.wants(st, tool)) {
      const r = Writing.tick(st, mouse.nx, mouse.ny, dt, SPRAY_COLS[S.col][0], S.col, tool);
      if (r === true || r === 'fatto') { S.dabs++; if (click.t && click.t.spray) { click.t = null; ui.mark = null; } if (r === 'fatto') S.on = false; }
      else if (r && r.msg) { toast(r.msg); S.on = false; }
      else sprayGo(r);
      if (!sprayHave(tool)) { toast(tool === 'pennarello' ? 'Il pennarello è secco.' : 'Le bombolette sono finite.'); sprayEnd(); ui.spray = null; st.player.hand = null; }
      return;
    }
    S.t -= dt; if (S.t > 0) return; S.t = .016;
    const r = R.spray(st, mouse.nx, mouse.ny, SPRAY_COLS[S.col][0]);
    if (r === true) { S.dabs++; if (click.t && click.t.spray) { click.t = null; ui.mark = null; } }
    else sprayGo(r);
    if (S.dabs - (S.used || 0) >= 900) {   // una bomboletta dura circa un minuto di spruzzo
      S.used = S.dabs; const b = Oggetti.inv(st); b.bomboletta = Math.max(0, (b.bomboletta || 0) - 1); if (!b.bomboletta) delete b.bomboletta;
      if (!sprayHave()) { toast('La bomboletta è finita.'); sprayEnd(); ui.spray = null; st.player.hand = null; }
    }
  }
  function sprayEnd() {
    const S = ui.spray; if (window.Writing) Writing.release(st); if (!S || !S.on) return; S.on = false;
    if (S.dabs - (S.told || 0) > 25) { S.told = S.dabs; try { G.emit(st, 'vandalismo'); } catch (e) { } }   // chi ti vede, ti ha visto
  }
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { if (ui.intro || ui.dialog || ui.book) return; e.preventDefault();
    if (ui.spray) { ui.spray.col = (ui.spray.col + (e.deltaY > 0 ? 1 : SPRAY_COLS.length - 1)) % SPRAY_COLS.length; toast('Colore: ' + SPRAY_COLS[ui.spray.col][1] + '.'); return; } if (window.Cantiere && Cantiere.wheel(e.deltaY)) return; zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    A.init();
    if (ui.intro || ui.over) { if (k === 'enter') { e.preventDefault(); ui.over ? restart() : start(); } return; }
    if (k === 'tab') { e.preventDefault(); toggleBook(); return; }
    if (k === 'm') { const on = A.toggle(); $('sound').textContent = 'Audio: ' + (on ? 'sì' : 'no') + ' · M'; return; }
    if (k === 'escape') { if (ring.n) { closeRing(); return; } if (ui.dialog) closeDialog(); else if (ui.book) toggleBook(false); return; }
    if (ui.dialog) { const n = parseInt(k, 10); if (n >= 1 && n <= 9) { const b = $('dialog').querySelectorAll('.opt')[n - 1]; if (b) b.click(); } if (k === 'enter' || k === ' ') { const bs = $('dialog').querySelectorAll('.opt'); if (bs.length === 1) { e.preventDefault(); bs[0].click(); } } return; }
    if (ui.book || ui.menu) return;   // [azioni] ui.menu: le Tasche
    if (k === ' ' && jumpMode()) { e.preventDefault(); if (!e.repeat) G.jumpHold(st, true); return; }   // [salto] tieni premuto: carica
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' ', ',', '.'].includes(k)) { keys[k] = true; e.preventDefault(); }
    // [monte] O: visuale dall'alto; H scava, J in discesa, K in salita, N stanza, V sali/scendi (botole e pozzi)
    if (!e.repeat && k === 'o') { ui.top = !ui.top; toast(ui.top ? 'Visuale dall\'alto.' : 'Visuale normale.'); return; }
    if (!e.repeat && window.Livelli && ['h', 'j', 'k', 'n', 'v'].includes(k)) { const m = Livelli.key(st, k, e.shiftKey); if (m) { toast(m); e.preventDefault(); return; } }
    if (e.repeat) return;
    if (k === 'e') doAct('scippo'); else if (k === 'f') doAct('veicolo'); else if (k === 't') openTalk();
    else if (k === 'p') doBmx();   // [bmx] la bici tascabile
    else if (k === 'r') G.reload(st);
    else if (k === 'q') G.switchWeapon(st, 1);
    else if (k === 'g') { const was = st.player.cur; st.player.cur = 'pugni'; st.player.cool = 0; G.fire(st, aimAngle(), ui.aimPoint, true); st.player.cur = was; }
    else if (k >= '1' && k <= '5') { const id = Object.keys(G.WEAPONS).find(w => G.WEAPONS[w].slot === +k); if (!G.switchWeapon(st, id)) toast(`Non hai ${G.WEAPONS[id].name.toLowerCase()}.`, 'bad'); }
  });
  // zoom: rotella, tasti + e −, pulsanti a schermo
  function zoomBy(f) { ui.zoom = Math.max(.12, Math.min(4.2, (ui.zoom || 1) * f)); }  // [inverno] al massimo indietro si vedono le due coste; [zoom1] da vicino a misura di personaggio

  addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys[k] = false; if (k === ' ') G.jumpHold(st, false); });   // [salto] rilasci: salta
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; if (st) st.player.jcharge = null; });   // [salto] fuori dalla finestra la carica si annulla
  const stick = { x: 0, y: 0 };
  let lastAim = null, touchFire = false, touchRun = false, touchBoost = false; const touchTrick = { wheelie: false, peg: 0 };
  function aimAngle() {
    const p = st.player;
    if (touchMode && tp.aim) {   // [mobile] il dito sullo schermo: si mira lì (alla persona toccata, anche se si muove)
      const a = tp.aim, n = a.id && G.byId(st, a.id); if (n && !n.dead) { a.x = n.x; a.y = n.y; }
      ui.aimPoint = { x: a.x, y: a.y }; return Math.atan2(a.y - p.y, a.x - p.x);
    }
    if (touchMode) {
      // mira automatica: il nemico più vicino davanti, altrimenti la direzione dello sguardo
      let best = null, bd = 16;
      st.npcs.forEach(n => { if (n.dead || n.inside) return; const d = Math.hypot(n.x - p.x, n.y - p.y); const hos = G.hostile(st, n); const s = d - (hos ? 8 : 0); if (d < 14 && s < bd && (hos || Math.abs(Math.atan2(Math.sin(Math.atan2(n.y - p.y, n.x - p.x) - p.face), Math.cos(Math.atan2(n.y - p.y, n.x - p.x) - p.face))) < .7)) { bd = s; best = n; } });
      ui.aimPoint = best ? { x: best.x, y: best.y } : null;
      return best ? Math.atan2(best.y - p.y, best.x - p.x) : p.face;
    }
    if (!mouse.active) return lastAim === null ? p.face : lastAim;
    const g = R.screenToGround(mouse.nx, mouse.ny); ui.aimPoint = g;
    if (g && Math.hypot(g.x - p.x, g.y - p.y) > .6) lastAim = Math.atan2(g.y - p.y, g.x - p.x);
    return lastAim === null ? p.face : lastAim;
  }
  // [bmx] in BMX si va col punta e clicca; le frecce fanno i trick: giù impenna, destra e sinistra il piede sulla pedalina
  function input() {
    const r = input0(); if (!r) return r;
    const p = st.player;
    if (window.Skate && Skate.on(st)) {   // [mobile] in tavola: il dito (o il sinistro) tenuto spinge verso quel punto, la levetta curva e spinge
      const P = Skate.PAD, hold = tp.mode === 'skate'; let aim = r.aim;
      if (hold) { const g = R.screenToGround(touchMode ? tp.nx : mouse.nx, touchMode ? tp.ny : mouse.ny); if (g && Math.hypot(g.x - p.x, g.y - p.y) > .8) aim = Math.atan2(g.y - p.y, g.x - p.x); }
      P.push = hold || -stick.y > .4 ? 1 : 0; P.turn = Math.abs(stick.x) > .2 ? stick.x : 0;
      return Object.assign({}, r, { x: 0, y: 0, aim: aim !== undefined ? aim : aimAngle() });
    }
    if (!p.vehicle || !jumpMode()) return r;
    r.trick = { wheelie: !!keys.arrowdown || touchTrick.wheelie, peg: keys.arrowleft && !keys.arrowright ? 1 : keys.arrowright && !keys.arrowleft ? -1 : touchTrick.peg };
    return r;
  }
  function input0() {
    const sprint = !!keys.shift || touchRun || touchBoost, brakeKey = !!keys[' '] || touchBrake;
    if (st.player.vehicle && (stick.x || stick.y || (touchMode && !(click.t && jumpMode())))) return { x: 0, y: 0, aim: st.player.face, drive: { thr: -stick.y > .25 ? 1 : -stick.y < -.35 ? -1 : 0, steer: Math.abs(stick.x) > .15 ? stick.x : 0, hb: brakeKey, boost: sprint } };
    if (stick.x || stick.y) { // touch: la levetta segue lo schermo
      const B = R.camBasis(); const x = B.rx * stick.x - B.fx * stick.y, y = B.rz * stick.x - B.fz * stick.y;
      return { x, y, sprint, brake: brakeKey, aim: st.player.vehicle ? undefined : aimAngle() };
    }
    let f = 0, s = 0;
    const ar = !(st.player.vehicle && jumpMode());   // [bmx] in BMX le frecce sono i trick
    if (keys.w || (ar && keys.arrowup)) f += 1; if (keys.s || (ar && keys.arrowdown)) f -= 1;
    if (keys.d || (ar && keys.arrowright)) s += 1; if (keys.a || (ar && keys.arrowleft)) s -= 1;
    const a = aimAngle();
    if (f || s) { if (click.t) { click.t = null; ui.mark = null; } if (st.lv && st.lv.route) st.lv.route = null; }   // [sottosuolo] i tasti fermano anche lo scavo a clic
    else { const ci = clickInput(sprint); if (ci) return ci; if (ring.n && !st.player.vehicle) { const n = G.byId(st, ring.n); if (n) return { x: 0, y: 0, sprint, aim: Math.atan2(n.y - st.player.y, n.x - st.player.x) }; } }
    if (st.player.vehicle) {
      // alla guida: W gas, S freno e retromarcia, A/D sterzo, spazio freno a mano, shift spinta. Il mouse mira (destro spara)
      // W da solo: l'auto va verso il puntatore, con un regolatore morbido (proporzionale + smorzamento sulla rotazione):
      // a bassa velocità gira deciso, a velocità alta più dolce, e non oscilla. In retro e con A/D si guida a mano.
      let steer = s, mouseSteer = false;
      const v = st.vehicles.find(q => q.id === st.player.vehicle);
      if (v && f > 0 && !s && mouse.active && ui.aimPoint) {
        const dx = ui.aimPoint.x - v.x, dy = ui.aimPoint.y - v.y;
        if (Math.hypot(dx, dy) > 3) {
          let d = Math.atan2(dy, dx) - v.ang; d = Math.atan2(Math.sin(d), Math.cos(d));
          const spd = Math.abs(v.speed || 0), k = 2.1 / (1 + spd / 14);
          const lim = Math.max(.45, Math.min(1, 1.25 - spd / 22)); steer = Math.max(-lim, Math.min(lim, d * k - (v.w || 0) * .5)); if (Math.abs(d) < .03) steer = 0; mouseSteer = true;   // più veloce vai, meno sterzo concede il mouse (per derapare: A/D e spazio)
        }
      }
      return { x: 0, y: 0, aim: a, drive: { thr: f, steer, hb: brakeKey, boost: sprint, assist: !mouseSteer && !s } };
    }
    if (touchMode) return { x: 0, y: 0, sprint, aim: a };
    if (!f && !s) return { x: 0, y: 0, sprint, aim: armedGun() ? a : undefined };
    let x = Math.cos(a) * f + Math.cos(a + Math.PI / 2) * s, y = Math.sin(a) * f + Math.sin(a + Math.PI / 2) * s;
    const l = Math.hypot(x, y); x /= l; y /= l;
    return { x, y, sprint, aim: a };
  }
  function doAct(t) { const r = G.act(st, t); if (r && r.msg) toast(r.msg, r.ok ? 'info' : 'bad'); }
  // [salto] Spazio salta a piedi e in BMX; nelle altre auto resta il freno a mano
  function jumpMode() { const p = st.player; if (!p.vehicle) return true; const v = st.vehicles.find(q => q.id === p.vehicle); return !!(v && G.VK[v.kind].pocket); }
  // [andatura] più clicchi svelto verso un punto, più vai forte: a piedi cammini, corri, scatti; in BMX pedali piano, forte, a tutta.
  // Un clic entro 0,4 s dal precedente alza l'andatura di un gradino; un clic lento mentre ti muovi la tiene (non serve cliccare a raffica);
  // da fermo si riparte dal passo. Si torna al passo quando arrivi.
  function bumpPace() {
    const p = st.player, gap = ui.time - (ui.clickT === undefined ? -9 : ui.clickT); ui.clickT = ui.time;
    const moving = !!click.t || Math.abs(p.speed || 0) > .8;
    ui.pace = gap < .4 ? Math.min(3, (ui.pace || 1) + 1) : moving ? (ui.pace || 1) : 1;
  }
  function doBmx() { click.t = null; ui.mark = null; const r = G.bmx(st); if (r && r.msg) toast(r.msg, r.ok ? 'info' : 'bad'); }   // [bmx]
  function toast(msg, kind) { st.feed.unshift({ text: msg, kind: kind || 'info', until: st.clock + 4 }); if (st.feed.length > 5) st.feed.pop(); }

  // ---------- Punta e clicca ----------
  // Sinistro a terra: vai lì (doppio clic: di corsa). Sinistro su una macchina: ci vai e ci sali.
  // Sinistro su una persona: ti avvicini e le compare attorno il menu. Destro: spari verso il puntatore.
  const click = { t: null }, ring = { n: null, el: $('ring'), built: null }, hoverEl = $('hover');
  const armedGun = () => { const p = st.player; return p.cur !== 'pugni' && p.cur !== 'molotov'; };
  function cvOff() { const r = cv.getBoundingClientRect(), a = app.getBoundingClientRect(); return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height }; }
  const inRoom = n => !!(n.room && st.player.indoor);   // [scopo] chi è nella stanza col giocatore (popolo.js)
  function pickAt(nx, ny) {
    const p = st.player, o = cvOff(); let best = null, bd = Math.max(18, o.h * .04);
    if (!p.vehicle) st.npcs.forEach(n => {
      if (n.dead || (n.inside && !inRoom(n)) || (p.indoor && !inRoom(n)) || n.jailedUntil > st.t) return;   // [scopo] dentro si clicca chi c'è nella stanza
      for (const hh of [.6, 1.2, 1.7]) { const pr = R.project(n.x, hh, n.y); if (pr.behind) continue; const d = Math.hypot((pr.x - nx) * o.w, (pr.y - ny) * o.h); if (d < bd) { bd = d; best = { kind: 'npc', n }; } }
    });
    if (best) return best;
    if (window.Bottino) { const L = Bottino.pick(st, nx, ny, o); if (L) return L; }
    if (window.Sottosuolo) { const C = Sottosuolo.pick(st, nx, ny, o); if (C) return C; }   // [sottosuolo] la gente di sotto, le casse, il treno
    if (window.Cantiere) { const C = Cantiere.pick(st, nx, ny, o); if (C) return C; }   // [cantiere] le postazioni del covo   // [bottino] la roba da frugare è un oggetto in scena
    const g = R.screenToGround(nx, ny); if (!g) return null;
    for (const v of st.vehicles) {
      if (v.hidden || v.wreck) continue; const K = G.VK[v.kind], c = Math.cos(v.ang), s = Math.sin(v.ang), dx = g.x - v.x, dy = g.y - v.y;
      if (Math.abs(dx * c + dy * s) < K.len / 2 + .4 && Math.abs(-dx * s + dy * c) < K.wid / 2 + .4) return { kind: 'car', v };
    }
    // clic su una porta (o sul muro attorno): ci vai e ci entri. Il clic sulla porta in alto cade sul terreno dietro la facciata, quindi si cerca la porta più vicina entro ~3 m
    if (!p.indoor && G.DOOR_OF) { const tx = Math.floor(g.x / G.TS), ty = Math.floor(g.y / G.TS), GWm = G.MAP.world.GW; let bd = 3.2, hit = null;
      for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) { const bi = G.DOOR_OF.get((ty + oy) * GWm + tx + ox); if (bi === undefined) continue; const b = G.BUILDINGS[bi], x = (b.door[0] + .5) * G.TS, y = (b.door[1] + .5) * G.TS, d = Math.hypot(x - g.x, y - g.y); if (d < bd) { bd = d; hit = { kind: 'door', bi, x, y }; } }
      if (hit) return hit; }
    const f = freeSpot(g.x, g.y); return { kind: 'move', x: f.x, y: f.y };
  }
  // se il punto cliccato è dentro un edificio o in acqua, prende la casella libera più vicina (verso il giocatore)
  function freeSpot(x, y) {
    if (st.player.indoor && G.INT.nearFree) { const p0 = st.player, L0 = G.INT.layout(G.BUILDINGS[p0.indoor.b]); return G.INT.nearFree(L0, p0.indoor.f, x, y) || { x: p0.x, y: p0.y }; }   // [interni] dentro si clicca sul pavimento
    if (st.player.lv && (st.player.lv.k === 'tetto' || st.player.lv.k === 'scala')) return { x, y };   // [writer] sui tetti si va dritti
    if (st.player.lv && window.Sottosuolo) return Sottosuolo.freeSpot(st, x, y);   // [sottosuolo] sotto terra si clicca sul cunicolo
    if (G.walkM(x, y)) return { x, y }; const p = st.player; let best = null, bd = 1e9;
    for (let r = 1; r <= 4 && !best; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const cx = (Math.floor(x / G.TS) + i) * G.TS + G.TS / 2, cy = (Math.floor(y / G.TS) + j) * G.TS + G.TS / 2; if (!G.walkM(cx, cy)) continue;
      const d = Math.hypot(cx - x, cy - y) + Math.hypot(cx - p.x, cy - p.y) * .25; if (d < bd) { bd = d; best = { x: cx, y: cy }; }
    }
    return best || { x, y };
  }
  function goalPath(x, y) { const p = st.player; if (p.indoor && G.INT.findPath) { const L0 = G.INT.layout(G.BUILDINGS[p.indoor.b]), pp = G.INT.findPath(L0, p.indoor.f, p.x, p.y, x, y); return pp.length ? pp : [{ x, y }]; }   // [interni] percorso dentro casa
    if (p.lv && (p.lv.k === 'tetto' || p.lv.k === 'scala')) return [{ x, y }];   // [writer] sui tetti: in linea retta (il bordo ferma, Spazio salta)
    if (p.lv && window.Sottosuolo) { const pp = Sottosuolo.findPath(st, p.x, p.y, x, y); return pp.length ? pp : [{ x, y }]; }   // [sottosuolo] percorso nei cunicoli
    let path = G.findPath(p.x, p.y, x, y, p.vehicle ? .6 : 1.4); if (!path.length) path = [{ x, y }]; return path; }
  function onClick(nx, ny, dbl) {
    if (ui.intro || ui.over || ui.dialog || ui.book || ui.menu) return;
    const p = st.player, h = pickAt(nx, ny); if (!h) return;
    closeRing(); if (st.lv && st.lv.route) st.lv.route = null;
    const onBmx = p.vehicle && jumpMode();   // [bmx] in BMX si clicca per andare, come a piedi
    if (p.vehicle) {
      if (h.kind === 'car' && h.v.id === p.vehicle) { click.t = null; ui.mark = null; doAct('veicolo'); return; }
      if (!onBmx) return;
    }
    bumpPace();   // [andatura]
    if (onBmx) { const o = h.v || h.n || h; if (o.x === undefined) return; const f = freeSpot(o.x, o.y);
      click.t = { kind: 'move', x: f.x, y: f.y, path: goalPath(f.x, f.y), run: false, best: 1e9, bestT: ui.time, fl: '' }; ui.mark = { x: f.x, y: f.y, t: ui.time, k: 'move' }; return; }
    // [sottosuolo] sotto terra, un clic nella terra: il personaggio ci va scavando
    if (h.kind === 'move' && p.lv && p.lv.k === 'ug' && window.Livelli && Livelli.digTo) { const g = R.screenToGround(nx, ny), r = g && Livelli.digTo(st, g.x, g.y); if (r) { if (r.msg) toast(r.msg, r.ok ? 'info' : 'bad'); if (r.ok) { click.t = { kind: 'scava', x: g.x, y: g.y }; ui.mark = { x: g.x, y: g.y, t: ui.time, k: 'move' }; } return; } }
    if (h.kind === 'npc') { click.t = { kind: 'npc', id: h.n.id, path: [], pt: -9, run: dbl }; ui.mark = null; }
    else if (h.kind === 'car') { click.t = { kind: 'car', id: h.v.id, path: [], pt: -9, run: dbl }; ui.mark = { x: h.v.x, y: h.v.y, t: ui.time, k: 'car' }; }
    else if (h.kind === 'loot') { const B0 = h.via === 'covo' ? Cantiere : h.via === 'sotto' ? Sottosuolo : Bottino, q = B0.goal(st, h.ref) || h; click.t = { kind: 'loot', via: h.via, ref: h.ref, x: q.x, y: q.y, path: goalPath(q.x, q.y), run: dbl, best: 1e9, bestT: ui.time, fl: p.indoor ? p.indoor.b + ':' + p.indoor.f : '' }; ui.mark = { x: h.x, y: h.y, t: ui.time, k: 'move' }; }
    else if (h.kind === 'door') { click.t = { kind: 'door', bi: h.bi, x: h.x, y: h.y, path: goalPath(h.x, h.y), pt: ui.time, run: dbl }; ui.mark = { x: h.x, y: h.y, t: ui.time, k: 'move' }; }
    else { click.t = { kind: 'move', x: h.x, y: h.y, path: goalPath(h.x, h.y), run: dbl, best: 1e9, bestT: ui.time, fl: p.indoor ? p.indoor.b + ':' + p.indoor.f : '' }; ui.mark = { x: h.x, y: h.y, t: ui.time, k: 'move' }; }
  }
  function clickInput(sprint) {
    const p = st.player, c = click.t; if (!c) return null;
    if (p.vehicle && !jumpMode()) { click.t = null; ui.mark = null; return null; }
    const stop = () => { click.t = null; ui.mark = null; ui.pace = 1; return p.vehicle ? { x: 0, y: 0, sprint, brake: true } : { x: 0, y: 0, sprint }; };
    let gx = c.x, gy = c.y;
    if (c.fl !== undefined && c.fl !== (p.indoor ? p.indoor.b + ':' + p.indoor.f : '')) return stop();   // [interni] cambiato piano: il clic di prima non vale più
    if (c.kind === 'scava') {   // [sottosuolo] segue lo scavo: cammina alla casella scavata dopo, o resta fermo e scava
      const T0 = window.Livelli && Livelli.routeTarget(st); if (!T0) return stop();
      if (T0.wait) return { x: 0, y: 0, sprint: false, aim: T0.aim };
      const a0 = Math.atan2(T0.y - p.y, T0.x - p.x); return { x: Math.cos(a0), y: Math.sin(a0), sprint: false, aim: a0 };
    }
    if (c.kind === 'door') {
      if (p.indoor) return stop();
      const b = G.BUILDINGS[c.bi], cx = (b.x + b.w / 2) * G.TS, cy = (b.y + b.h / 2) * G.TS;
      if (Math.hypot(gx - p.x, gy - p.y) < .8) { c.pushT = c.pushT || ui.time; if (ui.time - c.pushT > 1.6) return stop(); const a2 = Math.atan2(cy - p.y, cx - p.x); return { x: Math.cos(a2), y: Math.sin(a2), sprint: false, aim: a2 }; }
    }
    if (c.kind === 'loot') {   // [bottino] ci si avvicina; arrivati si raccoglie o si apre il pannello
      const B0 = c.via === 'covo' ? Cantiere : c.via === 'sotto' ? Sottosuolo : Bottino, L = B0.find(st, c.ref); if (!L) return stop();
      const d = Math.hypot(L.x - p.x, L.y - p.y), r = B0.reach(c.ref);
      if (d < r || (ui.time - c.bestT > 1.2 && d < r + 1.2)) { stop(); B0.arrive(st, c.ref); return { x: 0, y: 0, sprint, aim: Math.atan2(L.y - p.y, L.x - p.x) }; }
      if (d < c.best - .2) { c.best = d; c.bestT = ui.time; } else if (ui.time - c.bestT > 1.5) return stop();
    }
    if (c.kind === 'npc') {
      const n = G.byId(st, c.id); if (!n || n.dead || (n.inside && !inRoom(n))) return stop();
      gx = n.x; gy = n.y;
      if (Math.hypot(n.x - p.x, n.y - p.y) < 1.5) { click.t = null; openRing(n); return { x: 0, y: 0, sprint, aim: Math.atan2(n.y - p.y, n.x - p.x) }; }
    } else if (c.kind === 'car') {
      const v = st.vehicles.find(k => k.id === c.id); if (!v || v.hidden || v.wreck || v.rider) return stop();
      gx = v.x; gy = v.y; if (ui.mark) { ui.mark.x = v.x; ui.mark.y = v.y; }
      const K = G.VK[v.kind], ca = Math.cos(v.ang), sa = Math.sin(v.ang), dx = p.x - v.x, dy = p.y - v.y;
      const d = Math.hypot(Math.max(0, Math.abs(dx * ca + dy * sa) - K.len / 2), Math.max(0, Math.abs(-dx * sa + dy * ca) - K.wid / 2));
      if (d < 1.3) { stop(); doAct('veicolo'); return { x: 0, y: 0, sprint }; }
    }
    if (c.kind !== 'move' && ui.time - c.pt > .5) { c.path = goalPath(gx, gy); c.pt = ui.time; }
    const bike = p.vehicle && jumpMode(), reach = bike ? 1.2 : p.vehicle ? 2.4 : .4;
    while (c.path.length > 1 && Math.hypot(c.path[0].x - p.x, c.path[0].y - p.y) < reach) c.path.shift();
    const left = Math.hypot(gx - p.x, gy - p.y);
    if (c.kind === 'move') {
      if (left < (bike ? 1.2 : p.vehicle ? 3 : .35)) return stop();
      // bloccato da più di un secondo e mezzo senza avvicinarsi: lascia perdere
      if (left < c.best - .2) { c.best = left; c.bestT = ui.time; } else if (ui.time - c.bestT > 1.5) return stop();
    }
    const w = c.path[0] || { x: gx, y: gy }, a = Math.atan2(w.y - p.y, w.x - p.x);
    const pace = Math.max(c.run ? 2 : 1, ui.pace || 1);   // [andatura]
    return { x: Math.cos(a), y: Math.sin(a), sprint: sprint || (bike ? pace >= 3 && left > 6 : pace >= 2) || (p.vehicle && !bike && left > 25), aim: a, pace };
  }
  // --- menu attorno all'omino ---
  function ringOptions(n) {
    const p = st.player, o = [];
    o.push({ label: 'Parla', run: () => { closeRing(); openTalk(n); } });
    if (window.RisaccaUI) o.push(...RisaccaUI.ringOptions(n, closeRing)); // RISACCA: chat libera
    if (inRoom(n)) { o.push({ label: '✕', run: closeRing }); return o; }   // [scopo] dentro casa d'altri: si parla e basta
    const ctx = G.context(st).find(c => c.key === 'E');
    if (ctx) o.push({ label: ctx.label.startsWith('Rapina') ? 'Rapina' : 'Ruba', bad: true, run: () => { closeRing(); doAct('scippo'); } });
    o.push({ label: 'Picchia', bad: true, run: () => { const a = Math.atan2(n.y - p.y, n.x - p.x), was = p.cur; p.face = a; p.cur = 'pugni'; p.cool = 0; G.fire(st, a, { x: n.x, y: n.y }, true); p.cur = was; } });
    const gun = ['pistola', 'mitra', 'lupara'].find(w => p.arms[w] && (p.arms[w].mag > 0 || p.arms[w].reserve > 0));
    if (gun) o.push({ label: 'Spara', bad: true, run: () => { if (p.cur !== gun) G.switchWeapon(st, gun); ui.burst = { id: n.id, until: ui.time + (gun === 'mitra' ? .45 : .05), first: true }; } });
    if (p.arms.molotov && (p.arms.molotov.mag > 0 || p.arms.molotov.reserve > 0)) o.push({ label: 'Molotov', bad: true, run: () => { closeRing(); const was = p.cur; G.switchWeapon(st, 'molotov'); p.cool = 0; G.fire(st, Math.atan2(n.y - p.y, n.x - p.x), { x: n.x, y: n.y }, true); if (was !== 'molotov') G.switchWeapon(st, was); } });
    if (window.Bottino) o.push(...Bottino.ringOptions(n, closeRing));   // [bottino] le tasche di chi è a terra
    o.push({ label: '✕', run: closeRing });
    return o;
  }
  function openRing(n) { ring.n = n.id; ring.built = null; ring.el.hidden = false; buildRing(n); }
  function closeRing() { ring.n = null; ring.el.hidden = true; ring.el.innerHTML = ''; ui.burst = null; }
  function buildRing(n) {
    const o = ringOptions(n), key = o.map(k => k.label).join('|'); if (key === ring.built) return; ring.built = key;
    ring.el.innerHTML = ''; const R0 = 78;
    o.forEach((op, i) => {
      const b = document.createElement('button'); b.textContent = op.label; if (op.bad) b.className = 'bad';
      const a = -Math.PI / 2 + i / o.length * Math.PI * 2; b.style.left = Math.round(Math.cos(a) * R0 * 1.25) + 'px'; b.style.top = Math.round(Math.sin(a) * R0) + 'px';
      b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); A.init(); op.run(); });
      ring.el.appendChild(b);
    });
  }
  function tickClick() {
    const p = st.player;
    if (ring.n) {
      const n = G.byId(st, ring.n);
      if (!n || n.dead || (n.inside && !inRoom(n)) || p.vehicle || ui.dialog || Math.hypot(n.x - p.x, n.y - p.y) > 4) closeRing();
      else { buildRing(n); const pr = R.project(n.x, 1.1, n.y), o = cvOff(); ring.el.style.left = (o.x + pr.x * o.w) + 'px'; ring.el.style.top = (o.y + pr.y * o.h) + 'px'; }
    }
    if (ui.burst) { const n = G.byId(st, ui.burst.id); if (!n || n.dead || ui.time > ui.burst.until) ui.burst = null; else { G.fire(st, Math.atan2(n.y - p.y, n.x - p.x), { x: n.x, y: n.y }, ui.burst.first); ui.burst.first = false; } }
    // cosa c'è sotto il puntatore
    if (mouse.active && !ui.intro && !ui.dialog && !ui.book && !ui.menu && !ui.over && !ring.n && !(window.Cantiere && Cantiere.active())) {
      const h = pickAt(mouse.nx, mouse.ny); let t = '';
      if (h && h.kind === 'npc') { t = h.n.first || h.n.name; const d0 = window.Popolo && Popolo.doing ? Popolo.doing(st, h.n) : ''; if (d0) t += ' · ' + d0; }   // [scopo] cosa sta facendo
      else if (h && h.kind === 'loot') t = h.label;
      else if (h && h.kind === 'car') t = p.vehicle === h.v.id ? 'Scendi' : h.v.traffic ? `Tira giù l'automobilista (${G.VK[h.v.kind].label})` : h.v.lent || h.v.mine ? 'Sali' : `Ruba ${G.vehicleName(st, h.v)}`;
      cv.style.cursor = h && h.kind !== 'move' ? 'pointer' : 'default';
      hoverEl.hidden = !t; if (t) { hoverEl.textContent = t; hoverEl.style.left = mouse.cx + 'px'; hoverEl.style.top = mouse.cy + 'px'; }
    } else hoverEl.hidden = true;
  }

  // ---------- Dialoghi ----------
  function openTalk(who) {
    if (st.player.vehicle) return;
    const n = who || G.nearestNpc(st, 2.3); if (!n) { toast('Non c\'è nessuno con cui parlare qui.', 'bad'); return; }
    ui.dialog = { npc: n.id, data: G.talk(st, n), resp: null }; mouse.down = false; renderDialog();
  }
  function renderDialog() {
    const d = ui.dialog, n = G.byId(st, d.npc), box = $('dialog'); G.opinions(st, n);
    const att = G.attitude(st, n);
    const lines = (d.resp ? d.resp.lines : d.data.lines);
    const opts = d.resp && d.resp.opts ? d.resp.opts : d.resp && d.resp.end ? [{ id: '__close', label: 'Chiudi' }] : d.data.opts;
    box.innerHTML = `<div id="ptslot"></div><div><h3>${esc(n.name)} <span class="att ${att.tone}" style="font-family:var(--f-label);font-size:10px">${att.label}</span></h3><div class="role">${esc(n.role)}</div>
      <div class="lines">${lines.map((l, i) => `<p class="${i === 0 && d.resp && d.resp.result ? 'res-' + d.resp.result : ''}">${esc(l)}</p>`).join('')}</div>
      <div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}"><kbd>${i + 1}</kbd><span>${esc(o.label)}</span></button>`).join('')}</div></div>`;
    const pt = portrait(n.look); pt.className = 'pt'; $('ptslot').replaceWith(pt);
    box.hidden = false;
    box.querySelectorAll('.opt').forEach(b => b.onclick = () => choose(opts[+b.dataset.i]));
  }
  function choose(o) {
    const d = ui.dialog; if (!d) return;
    if (o.id === '__close' || o.id === 'ciao') { closeDialog(); return; }
    const n = G.byId(st, d.npc);
    const r = G.talkChoice(st, n, o.id, o.arg);
    if (st.over) { closeDialog(); return; }
    if (r.end || r.opts) d.resp = r;
    else { d.data = G.talk(st, n); d.data.lines = r.lines; d.resp = null; }
    renderDialog();
  }
  function closeDialog() { ui.dialog = null; $('dialog').hidden = true; cv.focus(); }

  // ---------- Taccuino ----------
  function toggleBook(force) { ui.book = force === undefined ? !ui.book : force; $('book').hidden = !ui.book; mouse.down = false; if (ui.book) renderBook(); else cv.focus(); }
  $('bookBtn').onclick = () => toggleBook();
  $('sound').onclick = () => { A.init(); const on = A.toggle(); $('sound').textContent = 'Audio: ' + (on ? 'sì' : 'no') + ' · M'; };
  function memLine(n, m) {
    const who = m.actor === 'player' ? 'tu' : m.actor === 'ignoto' ? 'qualcuno' : G.nameOf(st, m.actor);
    const what = `${who === 'tu' ? 'Tu' : who[0].toUpperCase() + who.slice(1)} ${G.verbPast(st, m, n.id).replace(/^ha /, who === 'tu' ? 'hai ' : 'ha ').replace(/^mi ha /, who === 'tu' ? 'mi hai ' : 'mi ha ')}`;
    let src = m.source === 'visto' ? 'l\'ha visto' : m.source === 'sentito' ? 'ha solo sentito il rumore' : m.source === 'scoperto' ? 'se n\'è accorto dopo' : m.source === 'radio' ? 'via radio da ' + m.via[m.via.length - 1] : 'voce: ' + m.via.slice().reverse().join(' ← ');
    const fl = [];
    if (m.distorted) fl.push('voce gonfiata');
    if (m.framedBy === 'player') fl.push('la voce l\'hai messa in giro tu');
    if (m.silenced) fl.push('comprato: tace');
    if (m.closed) fl.push('caso chiuso');
    const cls = m.type === 'lavoro' ? 'good' : m.source === 'visto' ? 'visto' : 'voce';
    return `<li class="${cls}">${esc(what)} <span style="opacity:.75">· ${esc(src)}${fl.length ? ' · ' + fl.join(', ') : ''}</span></li>`;
  }
  const ACTION = { routine: 'fa la sua giornata', pattuglia: 'è di pattuglia', insegue: 'ti sta dando la caccia', arresta: 'va ad arrestare qualcuno', fugge: 'scappa', denuncia: 'va a denunciare', affronta: 'viene a cercarti', evita: 'si tiene alla larga', dentro: 'è al chiuso', 'a terra': 'è a terra', 'in cella': 'è in cella', rientra: 'torna in commissariato', combatte: 'ti spara addosso', morto: 'è morto' };
  function renderBook() {
    const b = $('book'), tab = ui.bookTab;
    const named = st.npcs.filter(n => !n.passante && !n.reinforcement);
    let body = '';
    if (tab === 'people') {
      body = `<p class="hint">Ognuno sa solo ciò che ha visto o che gli hanno raccontato. Le voci passano di bocca in bocca e a volte si gonfiano. Chi ha visto qualcosa può andare dalla polizia, a meno che tu non lo convinca a tacere. I morti non parlano più.</p><div class="people">` + named.map(n => {
        G.opinions(st, n); const att = G.attitude(st, n);
        const mems = n.mem.filter(m => m.actor === 'player' || m.framedBy === 'player').sort((a, c) => G.weight(st, c) - G.weight(st, a)).slice(0, 4);
        const job = G.JOBS[n.id] && !n.dead ? `<div class="jobl"><b>Lavoro:</b> ${esc(G.JOBS[n.id].title)}${n.id === 'sandro' ? '' : ' · ' + G.JOBS[n.id].pay + '.000 lire'}</div>` : '';
        const act = ACTION[n.action.name] || n.action.name;
        return `<div class="pc"><span data-pt="${n.id}"></span><div><h4>${esc(n.name)}</h4><div class="r">${esc(n.role)}</div><span class="a ${att.tone}">${att.label}</span></div>
          ${n.dead ? '<ul><li style="list-style:none;margin-left:-16px;opacity:.7">Si è portato quello che sapeva nella tomba.</li></ul>' : mems.length ? `<ul>${mems.map(m => memLine(n, m)).join('')}</ul>` : '<ul><li style="list-style:none;margin-left:-16px;opacity:.7">Non sa niente di te.</li></ul>'}
          ${job}<div class="now">Adesso <b>${esc(act)}</b>. ${n.dead ? '' : esc(n.action.why || '')}</div>${window.Popolo && Popolo.lifeShort && n.pop && n.pop.ints && !n.dead ? `<div class="now">${esc(Popolo.lifeShort(st, n))}</div>` : ''}</div>`;   // [vita] interessi, progetti, pensieri
      }).join('') + '</div>';
      const pas = st.npcs.filter(n => n.passante), pk = pas.filter(n => n.mem.some(m => m.actor === 'player')).length;
      body += `<p class="hint" style="margin-top:12px">Altri ${pas.length} abitanti e automobilisti: ${pk} sanno qualcosa di te.</p>`;
    } else if (tab === 'facts') {
      const evs = st.events.filter(e => !e.npcCrime).slice(0, 30);   // [popolo] i fatti degli abitanti tra loro non sono i tuoi
      body = `<p class="hint">Rosso: l'ha visto. Blu: gliel'hanno raccontato. Grigio: ha sentito solo il rumore. Verde: crede sia stato qualcun altro. Nero: la polizia.</p><div class="evl">` + (evs.length ? evs.map(e => {
        const k = G.knowers(st, e.id);
        const title = `${G.LABEL[e.type]}${e.target ? ' · ' + G.nameOf(st, e.target) : e.shop ? ' · ' + e.shop : e.owner ? ' · di ' + G.nameOf(st, e.owner) : ''}`;
        return `<div class="ev"><div class="top"><b>${esc(title)}</b><span>${G.dayName(e.t)} ${G.clockStr(e.t)} · ${esc(e.place)} · lo sanno ${k.filter(x => !x.npc.dead).length}</span></div>
          <div class="dots">${k.filter(x => !x.npc.dead).map(x => `<span class="${x.mem.actor !== 'player' && x.mem.actor !== 'ignoto' ? 'alt' : x.mem.source}" title="${esc(x.npc.name)}">${esc(x.npc.first)}${x.mem.actor !== 'player' && x.mem.actor !== 'ignoto' ? ' → ' + esc(G.nameOf(st, x.mem.actor)) : ''}</span>`).join('')}</div></div>`;
      }).join('') : '<p class="hint">Non hai ancora fatto niente di cui si possa parlare.</p>') + '</div>';
    } else body = `<div class="logl">${st.log.map(l => `<p class="${l.kind}">${esc(l.text)}</p>`).join('')}</div>`;
    b.innerHTML = `<header><h2>Taccuino di Nino</h2><button class="x" id="bookX">Chiudi · Tab</button></header>
      <nav role="tablist"><button role="tab" data-t="people" aria-selected="${tab === 'people'}">Chi sa cosa</button><button role="tab" data-t="facts" aria-selected="${tab === 'facts'}">Cosa hai fatto</button><button role="tab" data-t="log" aria-selected="${tab === 'log'}">Registro</button></nav>
      <div class="body">${body}</div>`;
    b.querySelectorAll('[data-pt]').forEach(s => { const n = G.byId(st, s.dataset.pt); s.replaceWith(portrait(Object.assign({}, n.look, { dead: n.dead }))); });
    b.querySelectorAll('nav button').forEach(x => x.onclick = () => { ui.bookTab = x.dataset.t; renderBook(); });
    $('bookX').onclick = () => toggleBook(false);
  }

  // ---------- Schermate ----------
  function introScreen() {   // [menu2] una scritta, un pulsante: niente nome né storia, leggibile anche in verticale
    $('screen').innerHTML = `<div class="in intro2"><div class="logo">Get out and state your business</div>
      <button class="cta" id="go">Scendi in strada</button>
      <div class="credits">Modelli: <a href="https://kenney.nl" target="_blank" rel="noopener">Kenney</a> (CC0) · <a href="https://quaternius.com" target="_blank" rel="noopener">Quaternius</a> (CC0) · <a href="https://poly.pizza/bundle/Race-kit-LcWNxpyXuL" target="_blank" rel="noopener">Race kit</a> di Player11132 [<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC-BY</a>] via Poly Pizza</div></div>`;
    $('go').onclick = start;
  }
  function start() { A.init(); showHud(true); ui.intro = false; ui.letterbox = false; $('screen').innerHTML = ''; $('screen').style.pointerEvents = 'none'; cv.focus(); toast(window.Risacca ? 'Clic su una persona → Chatta. Lupo è in biblioteca.' : 'Parla con la gente (T): qualcuno ha un lavoro per te.', 'job'); }
  function endScreen() {
    const o = st.over; ui.over = true; ui.letterbox = true; showHud(false); $('bubbles').style.visibility = 'hidden'; $('xhair').hidden = true;
    const named = st.npcs.filter(n => !n.passante && !n.cop).concat(st.npcs.filter(n => n.cop && !n.reinforcement));
    const rows = named.map(n => {
      G.opinions(st, n); const att = G.attitude(st, n);
      const m = n.mem.filter(k => k.actor === 'player' || k.framedBy === 'player').sort((a, c) => G.weight(st, c) - G.weight(st, a))[0];
      let line = 'Non ha mai saputo niente di te.';
      if (n.dead) line = 'È morto. Quello che sapeva non lo racconterà a nessuno.';
      else if (m) {
        const src = m.source === 'visto' ? 'L\'ha visto.' : ['voce', 'radio', 'denuncia'].includes(m.source) ? 'Gliel\'ha detto ' + m.via[m.via.length - 1] + '.' : m.source === 'sentito' ? 'Ha sentito i colpi.' : '';
        const cap = s => s[0].toUpperCase() + s.slice(1);
        if (m.actor === 'player') line = `«${cap(G.youVerb(st, m, n.id))}.» ${src}`;
        else if (m.actor === 'ignoto') line = `Sa che qualcuno ${G.verbPast(st, m, n.id)}, ma non sa chi.`;
        else line = `È convinto che sia stato ${G.nameOf(st, m.actor)}: «${cap(G.verbPast(st, m, n.id))}».${m.framedBy === 'player' ? ' La voce l\'hai messa in giro tu.' : ''}`;
      }
      return `<div class="row"><span data-pt="${n.id}"></span><div><b>${esc(n.name)}</b> · <span class="att ${att.tone}" style="font-family:var(--f-label);font-size:10px">${att.label}</span><br>${esc(line)}</div></div>`;
    }).join('');
    const crimes = st.events.filter(e => G.NEG[e.type] && !e.npcCrime).length, jobs = st.events.filter(e => e.type === 'lavoro').length, dead = st.npcs.filter(n => n.dead).length;
    $('screen').style.pointerEvents = 'auto';
    $('screen').innerHTML = `<div class="in"><div class="tagline">${o.win ? 'LIBERO' : 'FINE'}</div><div class="logo" style="font-size:clamp(34px,6vw,64px)">${o.win ? 'Debito saldato' : 'Non ce l\'hai fatta'}</div>
      <div class="story"><p>${esc(o.reason)}</p><p>Arresti: <b>${st.player.arrests}</b> · Soldi in tasca: <b>${fmt(st.player.money)} lire</b> · ${crimes} crimini, ${jobs} lavori onesti, ${dead} morti nel quartiere.</p></div>
      <div class="lbl" style="font-size:11px">Come ti ricorda il quartiere</div><div class="endlist">${rows}</div>
      <button class="cta" id="again">Ricomincia</button></div>`;
    $('screen').querySelectorAll('[data-pt]').forEach(s => { const n = G.byId(st, s.dataset.pt); s.replaceWith(portrait(Object.assign({}, n.look, { dead: n.dead }))); });
    $('again').onclick = restart;
  }
  function restart() { showHud(true); $('bubbles').style.visibility = ''; st = G.create((Math.random() * 1e9) | 0); ui.over = false; ui.letterbox = false; R.snap(st); $('screen').innerHTML = ''; $('screen').style.pointerEvents = 'none'; cv.focus(); }

  // ---------- Minimappa ----------
  let miniBase = null;
  function buildMinimap() { // pixel per pixel: sull'isola sono 160.000 caselle
    miniBase = document.createElement('canvas'); miniBase.width = G.GW * 2; miniBase.height = G.GH * 2;
    const x = miniBase.getContext('2d'), img = x.createImageData(G.GW * 2, G.GH * 2), T = G.T;
    const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const C = {}; [[T.CLIFF, '#3a3432'], [T.GRAVEL, '#a8a49c'], [T.BLD, '#3a3150'], [T.WATER, '#0f3448'], [T.PIAZZA, '#4a5a66'], [T.VIA, '#2c2934'], [T.QUAY, '#5a5048'], [T.PIER, '#5a5048'], [T.SAND, '#b89a6a'], [T.GRASS, '#2f5a30'], [T.ROCK, '#4a4248'], [T.STAIRS, '#8a7a6a'], [T.WALK, '#6a5a6a'], [T.COB, '#1f1a2c'], [T.TREE, '#1c3a1c'], [T.DIRT, '#5a4430'], [T.FIELD, '#5a5a2a'], [T.DESERT, '#9a7a4a'], [T.SALT, '#b8bcc0'], [T.SHRUB, '#344a24'], [T.FOUNT, '#2a6a8a']].forEach(([k, v]) => { if (k !== undefined) C[k] = hex(v); });
    const W2 = G.GW * 2;
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      const c = C[G.tileAt(tx, ty)] || [31, 26, 44];
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const o = ((ty * 2 + dy) * W2 + tx * 2 + dx) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
    }
    x.putImageData(img, 0, 0);
  }
  function drawMinimap() {
    const c = $('minic'), x = c.getContext('2d'); c.width = 88; c.height = 88;
    const p = st.player, sc = 2 / G.TS;
    x.fillStyle = '#0a0816'; x.fillRect(0, 0, 88, 88);
    x.save(); x.translate(44 - p.x * sc, 44 - p.y * sc); x.drawImage(miniBase, 0, 0);
    const jt = G.jobTarget(st); if (jt) { x.fillStyle = '#ffd24a'; x.fillRect(jt.x * sc - 2, jt.y * sc - 2, 4, 4); }
    // [sottosuolo] le porte di sotto: la metro (quadrato rosso), tombini, pozzi e grate (puntini grigi)
    if (window.Livelli && !p.indoor) Livelli.S(st).portals.forEach(P => { if (!Livelli.CLIMB.has(P.kind) || P.kind === 'interno') return; const c = p.lv ? P.u : P.s, X = (c[0] + .5) * G.TS, Y = (c[1] + .5) * G.TS; if (Math.abs(X - p.x) > 46 || Math.abs(Y - p.y) > 46) return;
      if (P.metro) { x.fillStyle = '#d0202a'; x.fillRect(Math.round(X * sc) - 3, Math.round(Y * sc) - 3, 6, 6); x.fillStyle = '#fff'; x.fillRect(Math.round(X * sc) - 2, Math.round(Y * sc) - 1, 4, 1); } else { x.fillStyle = '#9a9aa8'; x.fillRect(Math.round(X * sc) - 1, Math.round(Y * sc) - 1, 2, 2); } });
    st.pickups.forEach(k => { if (!G.pickupVisible(st, k)) return; x.fillStyle = k.kind === 'valigetta' ? '#ff4fa3' : k.kind === 'salute' || k.kind === 'soldi' ? '#7ee0a0' : '#ffd24a'; x.fillRect(Math.round(k.x * sc) - 1, Math.round(k.y * sc) - 1, 2, 2); });
    st.vehicles.forEach(v => { if (v.hidden) return; x.fillStyle = v.police ? (Math.sin(st.clock * 12) > 0 ? '#3a7aff' : '#fff') : v.wreck ? '#222' : '#8a8a9a'; x.fillRect(Math.round(v.x * sc) - 1, Math.round(v.y * sc) - 1, 3, 2); });
    st.npcs.forEach(n => { if (n.inside || n.dead || Math.abs(n.x - p.x) > 46 || Math.abs(n.y - p.y) > 46) return; const a = G.attitude(st, n); /* [fluido] solo chi cade nella minimappa */ x.fillStyle = n.cop ? '#4a8aff' : a.tone === 'bad' ? '#ff5a5a' : a.tone === 'good' ? '#7ee0a0' : a.tone === 'warn' ? '#ffb35c' : '#8a82a0'; x.fillRect(Math.round(n.x * sc) - 1, Math.round(n.y * sc) - 1, 2, 2); });
    x.fillStyle = '#fff'; x.fillRect(Math.round(p.x * sc) - 1, Math.round(p.y * sc) - 1, 3, 3);
    x.restore();
  }

  // ---------- Fumetti e icone ----------
  const pool = [];
  function drawBubbles() {
    const layer = $('bubbles'), W = app.clientWidth, H = app.clientHeight;
    let i = 0;
    const get = () => { let el = pool[i]; if (!el) { el = document.createElement('div'); layer.appendChild(el); pool.push(el); } el.hidden = false; el.style.transform = ''; i++; return el; };
    const p = st.player;
    if (!ui.intro) st.npcs.forEach(n => {
      if ((n.inside && !inRoom(n)) || n.dead) return;
      if (p.indoor && !inRoom(n)) return;   // dentro un edificio il fuori non si vede (chi è nella stanza sì)
      const d = Math.hypot(n.x - p.x, n.y - p.y); if (d > 30) return;   // [fluido] oltre i 30 m niente fumetti né icone: inutile proiettarli
      const pr = R.project(n.x, 2.35, n.y); if (pr.behind || pr.x < -.05 || pr.x > 1.05 || pr.y < -.05 || pr.y > 1.05) return;
      const sx = pr.x * W, sy = pr.y * H;
      if (n.bark && n.bark.until > st.clock && d < 26) {
        const el = get(); const hot = ['affronta', 'insegue', 'fugge', 'combatte'].includes(n.action.name) || n.framedAngry; const rum = /^Hai sentito/.test(n.bark.text);
        el.className = 'bub' + (hot ? ' hot' : rum ? ' rumor' : ''); el.style.left = sx + 'px'; el.style.top = (sy - 6) + 'px';
        el.innerHTML = `<span class="who">${esc(n.first)}</span>${esc(n.bark.text)}`;
        return;
      }
      const pm = n.mem.filter(m => m.actor === 'player');
      let ico = null;
      if (G.hostile(st, n)) ico = ['✚', 'fear'];
      else if (n.action.name === 'fugge' || n.action.name === 'insegue' || n.framedAngry) ico = ['!!', 'fear'];
      else if (n.bribed) ico = ['€', 'bribe'];
      else if (pm.some(m => G.NEG[m.type] && m.source === 'visto' && !m.silenced)) ico = ['!', 'seen'];
      else if (pm.some(m => G.NEG[m.type] && !m.silenced)) ico = ['?', 'heard'];
      else if (n.op.trust > .4) ico = ['+', 'friend'];
      if (d < 5.5 && !n.passante && !p.vehicle) {
        const el = get(); const a = G.attitude(st, n); el.className = 'tag'; el.style.left = sx + 'px'; el.style.top = sy + 'px';
        el.innerHTML = `${ico ? `<span class="ico ${ico[1]}" style="position:static;transform:none">${ico[0]}</span> ` : ''}${esc(n.first)}<span class="att ${a.tone}">${a.label}</span>`;
      } else if (ico && d < 30) { const el = get(); el.className = 'ico ' + ico[1]; el.style.left = sx + 'px'; el.style.top = sy + 'px'; el.textContent = ico[0]; }
    });
    const jt = G.jobTarget(st);
    if (jt && !ui.intro) {
      const pr = R.project(jt.x, 1, jt.y);
      if (pr.behind || pr.x < .03 || pr.x > .97 || pr.y < .03 || pr.y > .97) {
        let px = pr.x, py = pr.y; if (pr.behind) { px = 1 - px; py = 1 - py; }
        const cx = Math.min(.95, Math.max(.05, px)) * W, cy = Math.min(.92, Math.max(.08, py)) * H;
        const a = Math.atan2(py * H - H / 2, px * W - W / 2);
        const el = get(); el.className = 'edge'; el.innerHTML = ''; el.style.left = cx + 'px'; el.style.top = cy + 'px'; el.style.transform = `translate(-50%,-50%) rotate(${a}rad)`;
      }
    }
    for (; i < pool.length; i++) pool[i].hidden = true;
  }

  // ---------- HUD ----------
  let lastHm = null;
  function hud() {
    const p = st.player;
    $('money').innerHTML = `${fmt(p.money)} <small>/ ${fmt(st.debt)} lire</small>`;
    $('debtbar').style.width = Math.min(100, p.money / st.debt * 100) + '%';
    $('hp').style.width = Math.max(0, Math.min(100, p.hp)) + '%'; $('hpbar').classList.toggle('low', p.hp < 35);
    $('day').textContent = G.dayName(st.t); $('time').textContent = G.clockStr(st.t);
    const hl = G.hoursLeft(st); $('left').textContent = st.deadline > 1e8 ? 'nessuna scadenza' : hl <= 1 ? 'meno di un\'ora' : `${hl}h all'alba`; $('left').className = hl <= 6 && st.deadline < 1e8 ? 'urgent' : '';
    const jt = G.jobTarget(st); $('job').hidden = !jt; if (jt) $('job').textContent = jt.label;
    const w = G.wanted(st); $('wanted').querySelectorAll('.star').forEach((s, i) => s.classList.toggle('on', i < w)); $('wanted').classList.toggle('chase', st.chase);
    $('feed').innerHTML = st.feed.slice(0, 3).map(f => `<div class="fi ${f.kind === 'radio' ? 'rumor' : f.kind}">${esc(f.text)}</div>`).join('');
    const cx = (ui.dialog || ui.book || ui.intro) ? [] : G.context(st);
    if (p.money >= st.debt && !ui.intro) { const s = G.byId(st, 'sandro'); if (s && !s.dead && Math.hypot(s.x - p.x, s.y - p.y) > 3) cx.unshift({ key: '★', label: 'Hai i soldi: vai dallo Squalo (Magazzino Neri o sala giochi)' }); }
    $('ctx').innerHTML = cx.map(c => `<span class="chip ${c.bad ? 'bad' : ''}"><kbd>${c.key}</kbd>${esc(c.label)}</span>`).join('');
    // arma
    const W = G.WEAPONS[p.cur], a = p.arms[p.cur] || {};
    $('weapon').hidden = ui.intro;
    $('wname').textContent = (p.hand && typeof Azioni !== 'undefined' && Azioni.ITEMS[p.hand] ? Azioni.ITEMS[p.hand].name : W.name) + (p.vehicle && p.cur !== 'pugni' ? ' · dal finestrino' : '');   // [azioni]
    weaponIcon($('wicon'), p.hand || p.cur);   // [azioni] in mano un attrezzo
    $('wammo').innerHTML = W.melee ? '<small>G pugno veloce</small>' : W.throw ? `${a.mag || 0} <small>bottiglie</small>` : `${a.mag} <small>/ ${a.reserve}</small>`;
    $('wammo').className = !W.melee && !W.throw && a.mag === 0 ? 'empty' : '';
    $('wrel').style.width = p.reload > 0 ? (1 - p.reload / W.reload) * 100 + '%' : '0%';
    $('wslots').innerHTML = Object.keys(G.WEAPONS).map(k => `<span class="${k === p.cur ? 'on' : p.arms[k] ? '' : 'off'}">${G.WEAPONS[k].slot} ${k === 'pugni' ? 'pugni' : k}</span>`).join('');
    // momento cinematografico
    const mo = st.moments[0];
    if (mo && mo !== ui.lastMoment) {
      ui.lastMoment = mo; ui.momentUntil = ui.time + 2.4;
      const m = $('moment');
      if (mo.kind === 'witness') { const names = mo.npcs.map(id => G.byId(st, id).first); m.innerHTML = `${esc(names.join(', '))} ${names.length > 1 ? 'ti hanno visto' : 'ti ha visto'}.<small>Adesso lo sa. Presto lo sapranno anche gli altri.</small>`; ui.flash = .35; }
      else if (mo.kind === 'arrest') { m.innerHTML = 'Arrestato.<small>Tre ore in camera di sicurezza.</small>'; ui.fadeUntil = ui.time + 1.6; }
      else if (mo.kind === 'wasted') { m.innerHTML = 'Ti hanno steso.<small>Ti risvegli in ambulatorio, quattro ore dopo.</small>'; ui.fadeUntil = ui.time + 2; }
      else if (mo.kind === 'jail') { const tn = G.byId(st, mo.npcs[0]); m.innerHTML = `${esc(tn.first)} finisce dentro.<small>Per una cosa che hai fatto tu.</small>`; }
      m.hidden = false;
    }
    if (ui.time > ui.momentUntil) $('moment').hidden = true;
  }
  function crosshair() {
    const x = $('xhair'), p = st.player;
    const show = mouse.active && !ui.intro && !ui.dialog && !ui.book && !ui.over && !touchMode && !(window.Editor && Editor.active());   // [editor]
    x.hidden = !show; cv.style.cursor = show ? 'none' : window.Editor && Editor.active() ? Editor.cursor() : 'default';
    if (!show) return;
    x.style.left = mouse.cx + 'px'; x.style.top = mouse.cy + 'px';
    const W = G.WEAPONS[p.cur], spread = W.melee || W.throw ? 0 : W.spread + p.bloom + (Math.abs(p.speed) > .5 ? .03 : 0);
    const dist = ui.aimPoint ? Math.hypot(ui.aimPoint.x - p.x, ui.aimPoint.y - p.y) : 8;
    const px = Math.max(10, Math.min(90, Math.tan(spread) * dist * (app.clientHeight / 18) * 2 + 12));
    const ring = $('xring'); ring.style.width = ring.style.height = px + 'px';
    ring.style.borderColor = W.melee ? 'rgba(255,240,210,.35)' : p.reload > 0 ? 'rgba(160,160,180,.7)' : 'rgba(255,240,210,.9)';
    const hm = $('xhm');
    if (st.hitMark && st.clock - st.hitMark.t < .22) { hm.style.opacity = 1 - (st.clock - st.hitMark.t) / .22; hm.style.color = st.hitMark.kill ? '#ff3a4a' : '#fff'; const s = st.hitMark.kill ? 1.4 : 1; hm.style.transform = `translate(-50%,-50%) rotate(45deg) scale(${s})`; }
    else hm.style.opacity = 0;
  }
  function sounds() {
    const p = st.player, W = app.clientWidth;
    st.sfx.forEach(e => {
      let near = 1, pan = 0;
      if (e.x !== undefined) { const d = Math.hypot(e.x - p.x, e.y - p.y); near = 1 / (1 + d * .07); const pr = R.project(e.x, 1, e.y); pan = Math.max(-1, Math.min(1, (pr.x - .5) * 1.6)); }
      A.play(e, near, pan);
    });
    st.sfx.length = 0;
    if (R.sfx) { R.sfx.forEach(e => { let near = 1, pan = 0; if (e.x !== undefined) { const d = Math.hypot(e.x - p.x, e.y - p.y); near = 1 / (1 + d * .07); const pr = R.project(e.x, 1, e.y); pan = Math.max(-1, Math.min(1, (pr.x - .5) * 1.6)); } A.play(e, near, pan); }); R.sfx.length = 0; }
    A.update(st, R);
  }

  // ---------- Touch ----------
  // [mobile] la levetta resta per camminare e guidare; il resto è punta e clicca. I pulsanti a destra cambiano con quello
  // che stai facendo: a piedi, in auto, in BMX, in tavola, con la bomboletta in mano
  let touchBrake = false;
  const touchMode = matchMedia('(pointer: coarse)').matches;
  const MODE_NM = { libero: 'libero', tag: 'tag', throw: 'throw-up', pezzo: 'pezzo', burner: 'burner', tavoletta: 'tavoletta' };
  function sprayColor(d) { const S = ui.spray; if (!S) return; S.col = (S.col + (d || 1) + SPRAY_COLS.length) % SPRAY_COLS.length; toast('Colore: ' + SPRAY_COLS[S.col][1] + '.'); }
  function sprayMode() { if (!window.Writing || st.player.hand !== 'bomboletta') return; const m = Writing.cycleMode(st); toast('Bomboletta: ' + MODE_NM[m] + (m === 'libero' ? '' : m === 'tavoletta' ? ' — trascina sul muro la finestra, poi disegni' : ' — tieni premuto sul muro') + '.'); }
  const TB = {
    salta: { l: 'Salta', hold: 1, big: 1, dn: () => { if (jumpMode()) G.jumpHold(st, true); else touchBrake = true; }, up: () => { touchBrake = false; G.jumpHold(st, false); } },
    corri: { l: 'Corri', dn: () => { touchRun = !touchRun; }, on: () => touchRun },
    arma: { l: 'Arma', dn: () => G.switchWeapon(st, 1) },
    tacc: { l: 'Tacc.', dn: () => toggleBook() },
    freno: { l: 'Freno', hold: 1, big: 1, dn: () => { touchBrake = true; }, up: () => { touchBrake = false; } },
    spinta: { l: 'Spinta', hold: 1, dn: () => { touchBoost = true; }, up: () => { touchBoost = false; } },
    scendi: { l: 'Scendi', dn: () => { click.t = null; ui.mark = null; doAct('veicolo'); } },
    impenna: { l: 'Impenna', hold: 1, dn: () => { touchTrick.wheelie = true; }, up: () => { touchTrick.wheelie = false; } },
    pegsx: { l: '◄ Piede', hold: 1, dn: () => { touchTrick.peg = 1; }, up: () => { touchTrick.peg = 0; } },
    pegdx: { l: 'Piede ►', hold: 1, dn: () => { touchTrick.peg = -1; }, up: () => { touchTrick.peg = 0; } },
    ollie: { l: 'Ollie', sub: 'trascina: trick', hold: 1, big: 1, dn: () => Skate.padCrouch(true), up: () => Skate.padCrouch(false), drag: (dx, dy) => Skate.swipe(dx, dy) },
    frena: { l: 'Frena', hold: 1, dn: () => { Skate.PAD.brake = 1; }, up: () => { Skate.PAD.brake = 0; } },
    modo: { l: () => 'Modo: ' + MODE_NM[(window.Writing && Writing.mode(st)) || 'libero'], dn: sprayMode },
    colore: { l: 'Colore', col: () => ui.spray ? SPRAY_COLS[ui.spray.col][0] : '', dn: () => sprayColor(1) },
  };
  // i pulsanti di adesso: pochi, il principale per primo (va in basso a destra, sotto il pollice)
  function touchSet() {
    const p = st.player;
    if (ui.intro || ui.over || ui.dialog || ui.book || ui.menu || (window.Cantiere && Cantiere.active())) return [];
    if (window.Skate && Skate.on(st)) return ['ollie'];
    if (p.vehicle) return jumpMode() ? ['salta', 'impenna'] : ['freno', 'scendi'];
    if (ui.spray) return window.Writing && Writing.mode(st) === 'tavoletta' ? [] : ['colore', 'modo'];   // [graffiti3] con la tavoletta i colori si scelgono nel pannello
    return ['salta'];
  }
  const lab = d => typeof d.l === 'function' ? d.l() : d.l;
  let tbKey = '';
  function touchButtons() {
    if (!touchMode) return;
    const list = touchSet(), key = list.map(k => k + ':' + lab(TB[k])).join('|'), box = $('tbtns');
    if (key !== tbKey) {
      tbKey = key; box.innerHTML = '';
      list.forEach(k => {
        const d = TB[k], b = document.createElement('button'); b.dataset.k = k; if (d.big) b.className = 'big';
        b.innerHTML = esc(lab(d)) + (d.sub ? `<small>${esc(d.sub)}</small>` : '');
        let lx = 0, ly = 0, held = false;
        b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); A.init(); if (ui.intro || ui.over) return; try { b.setPointerCapture(e.pointerId); } catch (x) { } held = true; lx = e.clientX; ly = e.clientY; b.classList.add('on'); d.dn(); });
        b.addEventListener('pointermove', e => { if (!held || !d.drag) return; d.drag(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY; });
        const up = () => { if (!held) return; held = false; b.classList.remove('on'); if (d.up) d.up(); };
        b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
        box.appendChild(b);
      });
    }
    box.querySelectorAll('button').forEach(b => { const d = TB[b.dataset.k]; if (d.on) b.classList.toggle('on', !!d.on()); if (d.col) b.style.borderColor = d.col() || ''; });
  }
  if (touchMode) {
    $('touch').hidden = false; $('bookBtn').style.display = 'none';
    $('debt').addEventListener('click', () => { if (!ui.intro && !ui.over) toggleBook(); });   // il taccuino: tocca i soldi e l'ora
    const sEl = $('stick'), kn = $('knob'); let sid = null;
    sEl.addEventListener('pointerdown', e => { A.init(); sid = e.pointerId; sEl.setPointerCapture(sid); mv(e); });
    sEl.addEventListener('pointermove', e => { if (e.pointerId === sid) mv(e); });
    const end = () => { sid = null; stick.x = stick.y = 0; kn.style.left = '43px'; kn.style.top = '43px'; };
    sEl.addEventListener('pointerup', end); sEl.addEventListener('pointercancel', end);
    function mv(e) { const r = sEl.getBoundingClientRect(); let dx = (e.clientX - r.left - 65) / 50, dy = (e.clientY - r.top - 65) / 50; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } stick.x = dx; stick.y = dy; kn.style.left = 43 + dx * 40 + 'px'; kn.style.top = 43 + dy * 40 + 'px'; }
  }

  // ---------- [fluido] Quanto si vede ----------
  // ogni 0,2 s: la distanza dal giocatore dell'angolo di schermo più lontano (sul terreno), più un margine. game.js allarga la
  // bolla del dettaglio fino a lì: a zoom largo chi è sul bordo dello schermo non cammina a scatti. Orizzonte in vista: tutto.
  let viewT = 0;
  function viewRadius(dt) {
    if ((viewT -= dt) > 0) return; viewT = .2; const p = st.player; let r = 0;
    for (const [nx, ny] of [[0, 0], [1, 0], [0, 1], [1, 1], [.5, 0], [.5, 1], [0, .5], [1, .5]]) { const g = R.screenToGround(nx, ny); if (!g) { r = 1e5; break; } r = Math.max(r, Math.hypot(g.x - p.x, g.y - p.y)); }
    st.viewR = r + 20;
  }

  // ---------- [prestazioni] Quale scheda video usa il browser ----------
  // Se il browser disegna in software (accelerazione hardware spenta, o scheda esclusa) il gioco va a pochi fotogrammi
  // qualunque cosa si alleggerisca: lo si dice subito, con cosa fare.
  function gpuName() {
    if (gpuName.v !== undefined) return gpuName.v;
    try { const gl = R.__models && R.__models.renderer && R.__models.renderer.getContext(), e = gl && gl.getExtension('WEBGL_debug_renderer_info'); gpuName.v = gl ? String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : ''; } catch (x) { gpuName.v = ''; }
    return gpuName.v;
  }
  const SOFT_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|mesa offscreen/i;
  function softwareCheck() {
    const n = gpuName(); if (!n || !SOFT_GPU.test(n)) return;
    toast('Il browser sta disegnando SENZA scheda video (' + (n.match(/swiftshader|llvmpipe|softpipe|basic render[^,)]*|microsoft basic[^,)]*|software[^,)]*|mesa offscreen/i) || [n])[0] + '): per questo va a scatti. Attiva l\'accelerazione hardware: Chrome o Edge → Impostazioni → Sistema → «Usa accelerazione grafica quando disponibile», poi riavvia il browser.', 'bad');
    st.feed[0].until = st.clock + 30;
  }

  // ---------- [prestazioni] Il contatore: F3 (o ?perf nell'indirizzo) ----------
  // fps, il fotogramma peggiore, i millisecondi della logica (G.step) e della grafica lato processore (R.frame),
  // e il tempo vero della scheda video per fase (scena con le ombre, bagliore, pittura, post), se il browser lo concede.
  // [misura] con ?perf il passo del motore e il fotogramma della grafica si misurano a parte (il resto lo misura misura.js)
  const STEP = typeof Misura !== 'undefined' ? Misura.timed((a, b, c) => G.step(a, b, c), 'motore:passo') : (a, b, c) => G.step(a, b, c);
  const FRAME = typeof Misura !== 'undefined' ? Misura.timed((a, b, c) => R.frame(a, b, c), 'grafica:fotogramma') : (a, b, c) => R.frame(a, b, c);
  const PERF = { on: /[?&]perf\b/.test(location.search), el: null, t0: 0, frames: 0, step: 0, frame: 0, worst: 0 };
  addEventListener('keydown', e => { if (e.key === 'F3') { e.preventDefault(); PERF.on = !PERF.on; if (PERF.el) PERF.el.hidden = !PERF.on; } });
  function perfTick(now) {
    if (!PERF.on) { PERF.frames = PERF.step = PERF.frame = PERF.worst = 0; PERF.t0 = now; return; }
    if (!PERF.el) { const d = document.createElement('div'); d.id = 'perf'; d.style.cssText = 'position:absolute;left:50%;top:34px;transform:translateX(-50%);z-index:60;pointer-events:none;background:rgba(8,8,14,.82);color:#e8e0d0;font:11px/1.45 monospace;padding:6px 10px;border:1px solid #444;white-space:pre'; app.appendChild(d); PERF.el = d; if (R.gpuTiming) R.gpuTiming(true); }
    if (now - PERF.t0 < 1000 || !PERF.frames) return;
    const n = PERF.frames, sec = (now - PERF.t0) / 1000, g = R.gpuTimes || { ok: false, ms: {}, info: {} }, ms = g.ms, I = g.info || {};
    const gt = ['scena', 'bagliore', 'pittura', 'post'].map(k => ms[k] !== undefined ? `${k} ${ms[k].toFixed(1)}` : '').filter(Boolean);
    const gsum = Object.values(ms).reduce((a, b) => a + b, 0);
    const frameMs = sec * 1000 / n, gameMs = (PERF.step + PERF.frame) / n, gn = gpuName();
    PERF.el.textContent = `${(n / sec).toFixed(0)} fps · peggiore ${PERF.worst.toFixed(0)} ms\n` +
      `fotogramma ${frameMs.toFixed(0)} ms = gioco ${gameMs.toFixed(0)} ms + attesa ${Math.max(0, frameMs - gameMs).toFixed(0)} ms (scheda video, altri moduli, browser)\n` +
      `scheda: ${gn || 'sconosciuta'}${SOFT_GPU.test(gn) ? '  ⚠ IN SOFTWARE: accelerazione hardware spenta' : ''}\n` +
      `logica ${(PERF.step / n).toFixed(1)} ms · grafica (processore) ${(PERF.frame / n).toFixed(1)} ms\n` +
      (g.ok ? `scheda video ${gsum.toFixed(1)} ms: ${gt.join(' · ')}` : 'scheda video: il browser non dà i tempi') + '\n' +
      `${I.calls || '?'} disegni · ${I.tris ? Math.round(I.tris / 1000) + 'k' : '?'} triangoli · ${I.progs || '?'} shader · ${I.px || ''} · abitanti fuori ${st.npcs.filter(k => !k.dead && !k.inside).length}/${st.npcs.length} · bolla ${st.bubble ? Math.round(st.bubble.r) + ' m' : '-'}` +
      (typeof Misura !== 'undefined' && Misura.ON ? '\n— i moduli più pesanti (ms per fotogramma, tempo proprio) —\n' + Misura.top(12).map(([k, v]) => `${v.toFixed(2).padStart(6)}  ${k}`).join('\n') : '\n(per la classifica dei moduli: ?perf nell\'indirizzo)');
    PERF.t0 = now; PERF.frames = PERF.step = PERF.frame = PERF.worst = 0;
  }

  // ---------- Avvio ----------
  buildMinimap(); introScreen(); showHud(false);
  // i moduli degli edifici (Kenney Building Kit) arrivano prima della scena: la città nasce già montata
  const goBtn = $('go'); if (goBtn) { goBtn.disabled = true; goBtn.dataset.label = goBtn.textContent; goBtn.textContent = 'Carico il porto…'; }
  const kitWait = window.Kit ? Promise.race([Kit.load('assets/mk/', ['bkit', 'rurban', 'food', 'arcade', 'train', 'grave', 'urban', 'natura', 'urbano', 'casa', 'stazione', 'garage', 'tortura']), new Promise(r => setTimeout(() => r(false), 45000))]).catch(e => { console.warn('Kit:', e); return false; }) : Promise.resolve(false);
  Promise.all([kitWait, window.Editor ? Editor.load().catch(e => console.warn('[editor]', e)) : null]).then(boot);   // [editor] i ritocchi arrivano prima della scena
  function boot() {
  if (goBtn) { goBtn.disabled = false; goBtn.textContent = goBtn.dataset.label; }
  let glOk = true;
  try { R.init(cv, st); } catch (err) { glOk = false; console.error(err); }
  if (!glOk) {
    $('screen').innerHTML = `<div class="in"><div class="logo" style="font-size:clamp(34px,6vw,64px)">Porto Vecchio</div><div class="story"><p>Il gioco usa la grafica 3D del browser (WebGL) e qui non è riuscito ad avviarla.</p><p>Prova ad aprire la pagina in Chrome, Edge o Firefox aggiornati, con l'accelerazione hardware attiva nelle impostazioni del browser.</p></div></div>`;
    return;
  }
  setTimeout(() => { try { softwareCheck(); } catch (e) { } }, 4000);   // [prestazioni] avvisa se si disegna senza scheda video
  if (window.Editor) Editor.attach({ get st() { return st; }, ui, G, R, cv, app, toast });   // [editor] F2
  function size() { const w = app.clientWidth || innerWidth, h = app.clientHeight || innerHeight; R.resize(w, h, Math.min(2, devicePixelRatio || 1)); }
  new ResizeObserver(size).observe(app); size();
  // [fluido] i programmi della scheda video si preparano adesso, durante il caricamento, non a scatti mentre si gioca
  try { const M0 = R.__models; if (M0 && M0.renderer && M0.scene && R.getCamera) M0.renderer.compile(M0.scene, R.getCamera()); } catch (e) { console.warn('[compile]', e); }
  let last = performance.now(), hudT = 0, perfT = 0, perfN = 0, perfDone = false, resAvg = .016, resT = 0;
  const loop = typeof Misura !== 'undefined' ? Misura.timed(loop0, 'main:ciclo') : loop0;   // [misura]
  function loop0(now) {
    const raw = Math.max(0, (now - last) / 1000), dt = Math.min(.05, raw); last = now; ui.time += dt;
    if (window.Studio && Studio.hidesGame()) { requestAnimationFrame(loop); return; }   // [studio] nell'hangar il mondo dorme
    if (!perfDone && ui.time > 10) { perfT += raw; perfN++; if (perfN >= 180) { if (perfT / perfN > 1 / 22 && R.res <= .72) { perfDone = true; R.lowQuality(); toast('Grafica ridotta: questo computer fatica. Per la qualità piena aggiungi ?alta all\'indirizzo.'); } else { perfT = 0; perfN = 0; } } }   /* [colore1] prima scattava dopo 2 s (i primi secondi sono sempre lenti: shader, blocchi) e lasciava tutto a quadrettoni; ora prima la risoluzione dinamica, e solo se al 70% non regge */
    // [fluido] risoluzione dinamica: media mobile del fotogramma; sopra i 22 ms si scende di un gradino, sotto i 14 ms per 4 s si risale (al massimo un cambio ogni 1,5 s)
    if (R.setRes && !ui.intro && raw < .25) { resAvg += (raw - resAvg) * .05; resT += raw;
      // [fluido2] tre gradini soli (100, 85, 72%) e con calma: ogni cambio rifà tutte le immagini intermedie della grafica
      // (uno scatto, e sul telefono memoria che si rimescola). Prima poteva cambiare ogni 1,5 s, proprio quando acceleri o zoomi
      const RL = [1, .85, .72], ri = RL.reduce((b, v, i) => Math.abs(v - R.res) < Math.abs(RL[b] - R.res) ? i : b, 0);
      if (resT > 3 && resAvg > .024 && ri < 2) { R.setRes(RL[ri + 1]); resT = 0; resAvg = .018; }
      else if (resT > 12 && resAvg < .013 && ri > 0) { R.setRes(RL[ri - 1]); resT = 0; } }
    const slow = ui.menu && ui.menuSlow;   // [menu] in strada col menu aperto il mondo rallenta, non si ferma; nel covo si ferma
    const edOn = window.Editor && Editor.active(), ed = edOn ? Editor.view(dt) : null;   // [editor] il mondo si ferma, la camera va dove dice l'editor
    const paused = ui.dialog || ui.book || (ui.menu && !slow) || ui.over || edOn;   // [azioni]
    if (slow && !paused && !edOn) G.step(st, dt * .25, { x: 0, y: 0 });
    else if (!paused) {
      const inp = ui.intro ? { x: 0, y: 0, freeze: true } : input();
      if (!ui.intro && (mouse.down || touchFire || mouse.pressed)) G.fire(st, inp.aim !== undefined ? inp.aim : aimAngle(), ui.aimPoint, mouse.pressed);
      mouse.pressed = false;
      tickClick(); sprayTick(dt);
      viewRadius(dt);   // [fluido]
      const tS = performance.now(); STEP(st, dt, inp); PERF.step += performance.now() - tS;
    }
    if (st.over && !ui.over) endScreen();
    ui.flash = Math.max(0, ui.flash - dt * 1.2);
    ui.fade = ui.fadeUntil && ui.time < ui.fadeUntil ? Math.min(1, (ui.fadeUntil - ui.time) * 1.5) : 0;
    ui.desat = st.slowmo > 0;
    if (R.hits && R.hits.length) { R.hits.forEach(h => G.propHit(st, h.v, h.m)); R.hits.length = 0; }
    const tF = performance.now(); PERF.frames++; PERF.worst = Math.max(PERF.worst, raw * 1000);
    FRAME(st, dt, { studio: !!window.PV_STUDIO, focus: ed && ed.focus, mark: edOn ? null : ui.mark, aimPoint: ui.aimPoint, dialogNpc: ui.dialog && ui.dialog.npc, intro: ui.intro, letterbox: ui.letterbox || !!ui.dialog, flash: ui.flash, fade: ui.fade, desat: ui.desat, time: ui.time, zoom: ui.zoom, stick: touchMode && Math.hypot(stick.x, stick.y) > .15 ? stick : null, pan: (() => { const d = ui.pan; ui.pan = null; return d; })(), rot: ed ? ed.rot : (keys['.'] ? 1 : 0) - (keys[','] ? 1 : 0), drag: (() => { const d = ui.drag || 0; ui.drag = 0; return d; })(), top: !!ui.top, edge: mouse.active && !ui.dialog && !ui.book && !ui.intro && !edOn ? (mouse.nx < .025 ? -1 : mouse.nx > .975 ? 1 : 0) : 0 });
    PERF.frame += performance.now() - tF;
    sounds();
    drawBubbles(); crosshair(); perfTick(now); if (typeof Misura !== 'undefined') Misura.frame();
    hudT -= dt; if (hudT <= 0) { hudT = .1; hud(); drawMinimap(); touchButtons(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.__pv = { get st() { return st; }, ui, G, R, input: () => input(), keys, mouse, click, pickAt: (x, y) => pickAt(x, y), toast, bmx: doBmx, act: doAct, sprayColor, sprayMode, SPRAY_COLS, touchMode };   // [mobile] toast…touchMode: per le icone a schermo (comandi.js)
  }
})();
