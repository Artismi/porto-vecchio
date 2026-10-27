
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
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { mouse.down = false; const r = cv.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width; if (CON.on) mouse.active = false; else if (nx < .08) mouse.nx = 0; else if (nx > .92) mouse.nx = 1; else mouse.active = false; } });   // [console] nel Game Boy ai lati ci sono i tasti: uscendo dallo schermo la visuale non gira
  // [monte] tenendo premuta la rotella del mouse e trascinando, la visuale gira attorno al giocatore
  // [visuale5] e la sposta: di lato gira, in su e in giù sposta la visuale (il mondo segue il mouse); con Maiusc sposta anche di lato.
  // ui.pan si somma fino al fotogramma (frazioni dello schermo); render.js (Visuale.mano) decide quando la camera torna da sola
  let camDrag = null; ui.drag = 0;
  function addPan(dx, dy) { const q = ui.pan || (ui.pan = { dx: 0, dy: 0 }); q.dx += dx; q.dy += dy; }
  // [telefono] due dita sullo schermo: pizzico per lo zoom (il secondo dito non cammina, non spara, non spruzza)
  const pin = new Map(); let pinD = 0, pinA = 0, pinM = null;
  const pinDist = () => { const [a, b] = [...pin.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  const pinAng = () => { const [a, b] = [...pin.values()]; return Math.atan2(b.y - a.y, b.x - a.x); };
  const pinMid = () => { const [a, b] = [...pin.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };   // [visuale5]
  cv.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; pin.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pin.size === 2) { pinD = pinDist(); pinA = pinAng(); pinM = pinMid(); tg = null; if (tp.id !== null) { if (tp.mode === 'spray' && ui.spray) sprayEnd(); tpEnd(); } mouse.pressed = false; click.t = null; ui.mark = null; }
    if (pin.size >= 2) e.stopImmediatePropagation(); });
  cv.addEventListener('pointermove', e => { const q = pin.get(e.pointerId); if (!q) return; q.x = e.clientX; q.y = e.clientY;
    if (pin.size === 2) { const d = pinDist(), a = pinAng(); let da = a - pinA; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; zoomBy(pinD / d); ui.drag = (ui.drag || 0) + da; ui.rotUser = true; pinD = d; pinA = a;
      const m = pinMid(), r = cv.getBoundingClientRect(); if (pinM) addPan((m.x - pinM.x) / r.width, (m.y - pinM.y) / r.height); pinM = m; e.stopImmediatePropagation(); } });   // due dita: pizzico = zoom, torsione = la visuale gira   // [visuale5] scorrere = la visuale si sposta
  const pinUp = e => { pin.delete(e.pointerId); pinM = null; };
  addEventListener('pointerup', pinUp); addEventListener('pointercancel', pinUp);
  cv.addEventListener('pointerdown', e => { if (e.button === 1) { camDrag = { x: e.clientX, y: e.clientY }; e.preventDefault(); } });
  addEventListener('pointermove', e => { if (camDrag !== null) { const r = cv.getBoundingClientRect(), dx = e.clientX - camDrag.x, dy = e.clientY - camDrag.y;
    if (e.shiftKey) addPan(dx / r.width, dy / r.height); else { ui.drag += dx * .008; addPan(0, dy / r.height); } camDrag = { x: e.clientX, y: e.clientY }; } });   // [visuale5]
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
    if (tg.drag) { const r = cv.getBoundingClientRect(); ui.drag = (ui.drag || 0) + (e.clientX - tg.lx) / r.width * 3.2; ui.rotUser = true; tg.lx = e.clientX; tg.ly = e.clientY; } });   // [telefono] un dito gira la visuale (non la sposta)
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
  // con un'arma da fuoco (o la molotov) in mano, sul telefono il tocco spara   // [console] nel Game Boy no: si spara con B, il tocco resta per andare e parlare
  function tapShoots() { const p = st.player; return touchMode && !CON.on && !p.hand && p.cur !== 'pugni' && !!G.WEAPONS[p.cur] && !(window.Cantiere && Cantiere.active()); }
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
    if (ui.intro) return;   // [diretto] si entra da soli, quando il gioco risponde
    if (ui.over) { if (k === 'enter') { e.preventDefault(); restart(); } return; }
    if (k === 'tab') { e.preventDefault(); toggleBook(); return; }
    if (k === 'm') { const on = A.toggle(); $('sound').textContent = 'Audio: ' + (on ? 'sì' : 'no') + ' · M'; return; }
    if (k === 'escape') { if (ring.n) { closeRing(); return; } if (ui.dialog) closeDialog(); else if (ui.book) toggleBook(false); else if (typeof MenuUI !== 'undefined' && MenuUI.open && !ui.menu) setTimeout(() => { if (!e.cancelBubble && !e.defaultPrevented && !ui.dialog && !ui.book && !(MenuUI.state && MenuUI.state.open)) MenuUI.open('zaino'); }, 0); return; }   // [diretto] Esc a vuoto (nessun pannello l'ha preso): il menu, cioè la pausa
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
  function zoomBy(f) { ui.zoom = Math.max(.12, Math.min(2, (ui.zoom || 1) * f)); }   // [zoom2] indietro fino a 2 (era 4,2: la scheda video perdeva il contesto; vedi render.js ZOOM_MAX)  // [inverno] al massimo indietro si vedono le due coste; [zoom1] da vicino a misura di personaggio

  addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys[k] = false; if (k === ' ') G.jumpHold(st, false); });   // [salto] rilasci: salta
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; if (st) st.player.jcharge = null; });   // [salto] fuori dalla finestra la carica si annulla
  const stick = { x: 0, y: 0 }; let stickB = null;   // [camera2] la visuale gira dietro al personaggio: mentre tieni la levetta il suo «su» non cambia (se no si gira in tondo)
  let lastAim = null, touchFire = false, touchRun = false, touchBoost = false; const touchTrick = { wheelie: false, peg: 0 };
  function aimAngle() {
    const p = st.player;
    if (touchMode && tp.aim) {   // [mobile] il dito sullo schermo: si mira lì (alla persona toccata, anche se si muove)
      const a = tp.aim, n = a.id && G.byId(st, a.id); if (n && !n.dead) { a.x = n.x; a.y = n.y; }
      ui.aimPoint = { x: a.x, y: a.y }; return Math.atan2(a.y - p.y, a.x - p.x);
    }
    if (CON.on && (touchMode || !mouse.active)) return conAim();   // [console] col Game Boy in mano si mira dove guarda il personaggio
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
    r.trick = { wheelie: !!keys.arrowdown || touchTrick.wheelie || CON.trick.wheelie, peg: keys.arrowleft && !keys.arrowright ? 1 : keys.arrowright && !keys.arrowleft ? -1 : touchTrick.peg || CON.trick.peg };   // [console] e la croce del Game Boy
    return r;
  }
  function input0() {
    const sprint = !!keys.shift || touchRun || touchBoost || CON.run, brakeKey = !!keys[' '] || touchBrake;   // [console] B tenuto: corri
    // [fluido] il controller: la levetta è una direzione dello schermo con la visuale di adesso (gira con la levetta destra),
    // l'inclinazione è la velocità (mag: dal passo alla corsa). Si guarda dove si va: girarsi è immediato anche all'indietro
    if (PAD.on && !st.player.vehicle && PAD.m > 0) {
      ui.faceIdle = undefined; if (click.t) { click.t = null; ui.mark = null; } if (st.lv && st.lv.route) st.lv.route = null;
      const B = R.camBasis(), x = B.rx * PAD.x - B.fx * PAD.y, y = B.rz * PAD.x - B.fz * PAD.y, l = Math.hypot(x, y) || 1;
      return { x: x / l, y: y / l, sprint, brake: brakeKey, aim: Math.atan2(y, x), mag: PAD.m };
    }
    if (PAD.on && st.player.vehicle && (PAD.m > 0 || PAD.gas > .05 || PAD.brk > .05)) return { x: 0, y: 0, aim: st.player.face, drive: { thr: PAD.gas - PAD.brk, steer: PAD.m > 0 ? PAD.x * Math.min(1, Math.abs(PAD.x) * 1.4) : 0, hb: brakeKey, boost: sprint, assist: !(PAD.m > 0 && Math.abs(PAD.x) > .1) } };
    if (st.player.vehicle && (touchMode || CON.on) && Math.hypot(stick.x, stick.y) > .2) {   // [telefono] guida «verso dove spingi»: la levetta è una direzione dello schermo, non gas e sterzo   // [console] anche quella del Game Boy
      const v = st.vehicles.find(q => q.id === st.player.vehicle), B = stickB || R.camBasis(), wx = B.rx * stick.x - B.fx * stick.y, wy = B.rz * stick.x - B.fz * stick.y, m = Math.min(1, Math.hypot(stick.x, stick.y));
      if (v) { const want = Math.atan2(wy, wx), ad = a => Math.atan2(Math.sin(a), Math.cos(a)), d = ad(want - v.ang), spd = Math.abs(v.speed || Math.hypot(v.vx || 0, v.vy || 0));
        const two = G.VK[v.kind] && (G.VK[v.kind].two || G.VK[v.kind].pocket);
        if (Math.abs(d) < 2.7 || (two && !(spd > 2 && (v.speed || 0) > 0))) return { x: 0, y: 0, aim: st.player.face, drive: { thr: Math.min(1, Math.max(0, (m - .2) / .7)), steer: Math.max(-1, Math.min(1, d * 1.8)), hb: brakeKey, boost: sprint } };   // avanti verso lì, sterzando
        if (spd > 2 && (v.speed || 0) > 0) return { x: 0, y: 0, aim: st.player.face, drive: { thr: -1, steer: 0, hb: brakeKey, boost: false } };   // dalla parte opposta: prima frena
        return { x: 0, y: 0, aim: st.player.face, drive: { thr: -1, steer: -Math.max(-1, Math.min(1, ad(want + Math.PI - v.ang) * 1.8)), hb: brakeKey, boost: false } }; } }   // poi retromarcia verso lì
    if (st.player.vehicle && (stick.x || stick.y || (touchMode && !(click.t && jumpMode())))) return { x: 0, y: 0, aim: st.player.face, drive: { thr: -stick.y > .25 ? 1 : -stick.y < -.35 ? -1 : 0, steer: Math.abs(stick.x) > .15 ? stick.x : 0, hb: brakeKey, boost: sprint } };
    if (Math.hypot(stick.x, stick.y) > PAD_DZ) { ui.faceIdle = undefined; // touch: la levetta segue lo schermo   // [fluido] con la stessa zona morta rotonda del controller (prima ogni millimetro spostava)
      const B = stickB || R.camBasis(); const x = B.rx * stick.x - B.fx * stick.y, y = B.rz * stick.x - B.fz * stick.y;
      return { x, y, sprint, brake: brakeKey, aim: st.player.vehicle ? undefined : touchMode || (CON.on && !mouse.active) ? Math.atan2(y, x) : aimAngle(), mag: touchMode || CON.on ? stickResp(Math.hypot(stick.x, stick.y)) : undefined };   // [console] la levetta del Game Boy come quella a schermo   // [levetta] mag: quanto è lontano il dito   // [telefono] con la levetta guarda dove va   // [fluido] la stessa curva del controller: si corre dall'85%, non solo a fondo corsa
    }
    let f = 0, s = 0;
    const ar = !(st.player.vehicle && jumpMode());   // [bmx] in BMX le frecce sono i trick
    if (keys.w || (ar && keys.arrowup)) f += 1; if (keys.s || (ar && keys.arrowdown)) f -= 1;
    if (keys.d || (ar && keys.arrowright)) s += 1; if (keys.a || (ar && keys.arrowleft)) s -= 1;
    const a = touchMode ? (ui.faceIdle !== undefined ? ui.faceIdle : st.player.face) : aimAngle();   // [camera4] sul telefono, da fermo: guarda dove l'hai girato con la visuale (o resta com'è)
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
    // [porte] solo il clic SULLA PORTA: il rettangolo della porta sulla facciata (largo 1,4 m, alto 2,4 m) proiettato sullo schermo;
    // prima bastava cliccare per terra a meno di 3 m da una porta e si entrava
    if (!p.indoor && G.DOOR_OF) { const TS = G.TS, tx = Math.floor(g.x / TS), ty = Math.floor(g.y / TS), GWm = G.MAP.world.GW, px = nx * o.w, py = ny * o.h; let bd = 1e9, hit = null;
      for (let oy = -4; oy <= 4; oy++) for (let ox = -4; ox <= 4; ox++) { const bi = G.DOOR_OF.get((ty + oy) * GWm + tx + ox); if (bi === undefined) continue; const b = G.BUILDINGS[bi]; if (!b || !b.door) continue;
        const D = doorQuad(b, TS); if (!D) continue;
        const Q = D.c.map(([x, h, y]) => R.project(x, h, y)); if (Q.some(q => q.behind)) continue;
        const pts = Q.map(q => [q.x * o.w, q.y * o.h]); let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; }
        if (!inside) continue;
        const d = Math.hypot(D.x - g.x, D.y - g.y); if (d < bd) { bd = d; hit = { kind: 'door', bi, x: (b.door[0] + .5) * TS, y: (b.door[1] + .5) * TS }; } }
      if (hit) return hit; }
    const f = freeSpot(g.x, g.y); return { kind: 'move', x: f.x, y: f.y };
  }
  // [porte] i quattro angoli della porta sulla facciata (la casella della porta sta fuori dall'edificio, la facciata sul suo lato verso dentro)
  function doorQuad(b, TS) {
    const dx = b.door[0], dy = b.door[1]; let fx, fy, tx, ty;
    if (dy === b.y + b.h) { fx = (dx + .5) * TS; fy = dy * TS; tx = 1; ty = 0; }
    else if (dy === b.y - 1) { fx = (dx + .5) * TS; fy = (dy + 1) * TS; tx = 1; ty = 0; }
    else if (dx === b.x + b.w) { fx = dx * TS; fy = (dy + .5) * TS; tx = 0; ty = 1; }
    else if (dx === b.x - 1) { fx = (dx + 1) * TS; fy = (dy + .5) * TS; tx = 0; ty = 1; }
    else return null;
    const hw = .7, h0 = -.05, h1 = 2.4;
    return { x: fx, y: fy, c: [[fx - tx * hw, h0, fy - ty * hw], [fx + tx * hw, h0, fy + ty * hw], [fx + tx * hw, h1, fy + ty * hw], [fx - tx * hw, h1, fy - ty * hw]] };
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
    let path = G.findPath(p.x, p.y, x, y, p.vehicle ? .6 : 1.4, !!p.vehicle);   // [pedonale] in macchina niente scale né zone pedonali
    // [pedonale] la meta dentro un muro (una porta, un pezzo): il percorso fino alla casella libera accanto, poi l'ultimo passo. Senza percorso
    // non si parte: niente ripiego in linea retta (prima si andava dritti attraverso i muraglioni invece di prendere la scala)
    if (!path.length && !G.walkM(x, y)) { const f = freeSpot(x, y); if (G.walkM(f.x, f.y)) { path = G.findPath(p.x, p.y, f.x, f.y, p.vehicle ? .6 : 1.4); if (path.length) path.push({ x, y }); } }
    return path; }
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
    if (!c.path.length && !p.indoor && !p.lv) return stop();   // [pedonale] nessun percorso: ci si ferma (non si va dritti contro il muro)
    const w = c.path[0] || { x: gx, y: gy }, a = Math.atan2(w.y - p.y, w.x - p.x);
    const pace = Math.max(c.run ? 2 : 1, ui.pace || 1);   // [andatura]
    // [porte] noDoor: andando a un punto (non a una porta) si può sfiorare la facciata accanto a una porta senza entrarci
    return { x: Math.cos(a), y: Math.sin(a), sprint: sprint || (bike ? pace >= 3 && left > 6 : pace >= 2) || (p.vehicle && !bike && left > 25), aim: a, pace, noDoor: c.kind !== 'door' };
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
      setHid(hoverEl, !t); if (t) { setT(hoverEl, t); setS(hoverEl, 'left', mouse.cx + 'px'); setS(hoverEl, 'top', mouse.cy + 'px'); }   // [fluido] solo se cambia
    } else setHid(hoverEl, true);
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
  // [diretto] niente schermata d'avvio né pulsanti: aprendo la pagina si carica e si entra in partita appena il gioco risponde
  // (vivoTick). Finché carica, una riga e una barra in basso; la camera sta già sul personaggio (così gli anelli preparano la zona
  // dove si gioca, non la piazza del vecchio menu). I crediti restano qui, durante il caricamento.
  function introScreen() {
    $('screen').style.pointerEvents = 'none';
    $('screen').innerHTML = `<div class="in carico0"><div class="lbl" id="caricoTxt">Carico il porto…</div><div class="bar"><i id="caricoBar" style="width:5%"></i></div>
      <div class="credits">Modelli: <a href="https://kenney.nl" target="_blank" rel="noopener">Kenney</a> (CC0) · <a href="https://quaternius.com" target="_blank" rel="noopener">Quaternius</a> (CC0) · <a href="https://poly.pizza/bundle/Race-kit-LcWNxpyXuL" target="_blank" rel="noopener">Race kit</a> di Player11132 [<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC-BY</a>] via Poly Pizza</div></div>`;
  }
  function carico(txt, p) { const t = $('caricoTxt'), b = $('caricoBar'); if (t && txt) t.textContent = txt; if (b && p !== undefined) b.style.width = Math.round(Math.max(.05, Math.min(1, p)) * 100) + '%'; }
  function start() { if (!ui.intro) return; A.init(); showHud(true); ui.intro = false; ui.letterbox = false; $('screen').innerHTML = ''; $('screen').style.pointerEvents = 'none'; cv.focus(); toast(window.Risacca ? 'Clic su una persona → Chatta. Lupo è in biblioteca.' : 'Parla con la gente (T): qualcuno ha un lavoro per te.', 'job'); }
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
    const K = window.PV_TELEFONO && !/[?&]nodieta\b/.test(location.search) ? 1 : 2;   // [dieta] sul telefono un pixel a casella (ogni casella era 2×2 dello stesso colore: si allarga disegnando, senza sfumare)
    miniBase = document.createElement('canvas'); miniBase.width = G.GW * K; miniBase.height = G.GH * K;
    const x = miniBase.getContext('2d'), img = x.createImageData(G.GW * K, G.GH * K), T = G.T;
    const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const C = {}; [[T.CLIFF, '#3a3432'], [T.GRAVEL, '#a8a49c'], [T.BLD, '#3a3150'], [T.WATER, '#0f3448'], [T.PIAZZA, '#4a5a66'], [T.VIA, '#2c2934'], [T.QUAY, '#5a5048'], [T.PIER, '#5a5048'], [T.SAND, '#b89a6a'], [T.GRASS, '#2f5a30'], [T.ROCK, '#4a4248'], [T.STAIRS, '#8a7a6a'], [T.WALK, '#6a5a6a'], [T.COB, '#1f1a2c'], [T.TREE, '#1c3a1c'], [T.DIRT, '#5a4430'], [T.FIELD, '#5a5a2a'], [T.DESERT, '#9a7a4a'], [T.SALT, '#b8bcc0'], [T.SHRUB, '#344a24'], [T.FOUNT, '#2a6a8a']].forEach(([k, v]) => { if (k !== undefined) C[k] = hex(v); });
    const W2 = G.GW * K;
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      const c = C[G.tileAt(tx, ty)] || [31, 26, 44];
      for (let dy = 0; dy < K; dy++) for (let dx = 0; dx < K; dx++) { const o = ((ty * K + dy) * W2 + tx * K + dx) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
    }
    x.putImageData(img, 0, 0);
  }
  function drawMinimap() {
    const c = $('minic'), x = c.getContext('2d'); c.width = 88; c.height = 88;
    const p = st.player, sc = 2 / G.TS;
    x.fillStyle = '#0a0816'; x.fillRect(0, 0, 88, 88);
    x.save(); x.translate(44 - p.x * sc, 44 - p.y * sc); if (miniBase.width === G.GW * 2) x.drawImage(miniBase, 0, 0); else { x.imageSmoothingEnabled = false; x.drawImage(miniBase, 0, 0, G.GW * 2, G.GH * 2); x.imageSmoothingEnabled = true; }
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
  // [fluido] fumetti, nomi e icone: a ogni fotogramma si riscrivevano contenuto, classe e posizione (left/top, che rifanno
  // l'impaginazione) di ogni etichetta. Ora ognuna si ricorda cosa mostra e si tocca solo quello che cambia; la posizione va
  // in transform (si sposta senza impaginare, a mezzo pixel)
  function bubSet(el, cls, html, sx, sy, rot) {
    if (el.hidden) el.hidden = false;
    if (el.__c !== cls) { el.__c = cls; el.className = cls; }
    if (el.__h !== html) { el.__h = html; el.innerHTML = html; }
    const X = Math.round(sx * 2) / 2, Y = Math.round(sy * 2) / 2;
    if (el.__x !== X || el.__y !== Y || el.__r !== rot) { el.__x = X; el.__y = Y; el.__r = rot;
      if (el.style.left !== '0px') { el.style.left = '0px'; el.style.top = '0px'; }
      el.style.transform = `translate(${X}px,${Y}px) translate(-50%,${rot === undefined ? '-100%' : '-50%'})` + (rot === undefined ? '' : ` rotate(${rot}rad)`); }
  }
  function drawBubbles() {
    const layer = $('bubbles'), W = app.clientWidth, H = app.clientHeight;
    let i = 0;
    const get = () => { let el = pool[i]; if (!el) { el = document.createElement('div'); layer.appendChild(el); pool.push(el); } i++; return el; };
    const p = st.player;
    const sotto = !!(p.lv && p.lv.k === 'ug');   // [regia2] sotto terra la gente di sopra non si vede: niente nomi né fumetti
    if (!ui.intro && !sotto && !window.__pulita) st.npcs.forEach(n => {
      if ((n.inside && !inRoom(n)) || n.dead) return;
      if (p.indoor && !inRoom(n)) return;   // dentro un edificio il fuori non si vede (chi è nella stanza sì)
      const d = Math.hypot(n.x - p.x, n.y - p.y); if (d > 30) return;   // [fluido] oltre i 30 m niente fumetti né icone: inutile proiettarli
      const pr = R.project(n.x, 2.35, n.y); if (pr.behind || pr.x < -.05 || pr.x > 1.05 || pr.y < -.05 || pr.y > 1.05) return;
      const sx = pr.x * W, sy = pr.y * H;
      if (n.bark && n.bark.until > st.clock && d < 26) {
        const hot = ['affronta', 'insegue', 'fugge', 'combatte'].includes(n.action.name) || n.framedAngry; const rum = /^Hai sentito/.test(n.bark.text);
        bubSet(get(), 'bub' + (hot ? ' hot' : rum ? ' rumor' : ''), `<span class="who">${esc(n.first)}</span>${esc(n.bark.text)}`, sx, sy - 6);
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
        const a = G.attitude(st, n);
        bubSet(get(), 'tag', `${ico ? `<span class="ico ${ico[1]}" style="position:static;transform:none">${ico[0]}</span> ` : ''}${esc(n.first)}<span class="att ${a.tone}">${a.label}</span>`, sx, sy);
      } else if (ico && d < 30) bubSet(get(), 'ico ' + ico[1], esc(ico[0]), sx, sy);
    });
    const jt = G.jobTarget(st);
    if (jt && !ui.intro) {
      const pr = R.project(jt.x, 1, jt.y);
      if (pr.behind || pr.x < .03 || pr.x > .97 || pr.y < .03 || pr.y > .97) {
        let px = pr.x, py = pr.y; if (pr.behind) { px = 1 - px; py = 1 - py; }
        const cx = Math.min(.95, Math.max(.05, px)) * W, cy = Math.min(.92, Math.max(.08, py)) * H;
        const a = Math.atan2(py * H - H / 2, px * W - W / 2);
        bubSet(get(), 'edge', '', cx, cy, Math.round(a * 100) / 100);
      }
    }
    for (; i < pool.length; i++) if (!pool[i].hidden) pool[i].hidden = true;
  }

  // ---------- HUD ----------
  let lastHm = null;
  // [fluido] la HUD scrive nel documento solo quello che è cambiato. Prima ogni 0,1 s si riscrivevano soldi, cronaca, suggerimenti
  // e armi: la cronaca («le cose successe») ricreava le sue righe e la loro entrata animata (.fi, 0,3 s) ripartiva da capo
  // dieci volte al secondo: era il testo che lampeggia. Ora ogni riga nasce una volta e resta lo stesso nodo finché scade.
  const setH = (el, h) => { if (el && el.__h !== h) { el.__h = h; el.innerHTML = h; } };
  const setT = (el, t) => { if (el && el.__t !== t) { el.__t = t; el.textContent = t; } };
  const setS = (el, k, v) => { if (el && el.style[k] !== v) el.style[k] = v; };
  const setHid = (el, v) => { if (el && el.hidden !== v) el.hidden = v; };
  const setCls = (el, c) => { if (el && el.className !== c) el.className = c; };
  function feedDom() {
    const box = $('feed'); if (!box) return; const items = st.feed.slice(0, 3), was = box.__items;
    if (was && was.length === items.length && was.every((f, i) => f === items[i])) return;
    const old = box.__map || new Map(), map = new Map();
    items.forEach((f, i) => {
      let el = old.get(f); if (!el) { el = document.createElement('div'); el.className = 'fi ' + (f.kind === 'radio' ? 'rumor' : f.kind); el.textContent = f.text; }
      map.set(f, el); if (box.children[i] !== el) box.insertBefore(el, box.children[i] || null);
    });
    const keep = new Set(map.values()); for (const el of Array.from(box.children)) if (!keep.has(el)) el.remove();   // le righe scadute (e quello che c'era prima)
    box.__map = map; box.__items = items;
  }
  function hud() {
    const p = st.player;
    setH($('money'), `${fmt(p.money)} <small>/ ${fmt(st.debt)} lire</small>`);
    setS($('debtbar'), 'width', Math.min(100, p.money / st.debt * 100) + '%');
    setS($('hp'), 'width', Math.max(0, Math.min(100, p.hp)) + '%'); const hpb = $('hpbar'); if (hpb.classList.contains('low') !== (p.hp < 35)) hpb.classList.toggle('low', p.hp < 35);
    setT($('day'), G.dayName(st.t)); setT($('time'), G.clockStr(st.t));
    const hl = G.hoursLeft(st); setT($('left'), st.deadline > 1e8 ? 'nessuna scadenza' : hl <= 1 ? 'meno di un\'ora' : `${hl}h all'alba`); setCls($('left'), hl <= 6 && st.deadline < 1e8 ? 'urgent' : '');
    const jt = G.jobTarget(st); setHid($('job'), !jt); if (jt) setT($('job'), jt.label);
    const w = G.wanted(st), wEl = $('wanted'); if (wEl.__w !== w) { wEl.__w = w; wEl.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('on', i < w)); } if (wEl.classList.contains('chase') !== !!st.chase) wEl.classList.toggle('chase', !!st.chase);
    feedDom();
    const cx = (ui.dialog || ui.book || ui.intro) ? [] : G.context(st);
    if (p.money >= st.debt && !ui.intro) { const s = G.byId(st, 'sandro'); if (s && !s.dead && Math.hypot(s.x - p.x, s.y - p.y) > 3) cx.unshift({ key: '★', label: 'Hai i soldi: vai dallo Squalo (Magazzino Neri o sala giochi)' }); }
    setH($('ctx'), cx.map(c => `<span class="chip ${c.bad ? 'bad' : ''}"><kbd>${c.key}</kbd>${esc(c.label)}</span>`).join(''));
    // arma
    const W = G.WEAPONS[p.cur], a = p.arms[p.cur] || {};
    setHid($('weapon'), !!ui.intro);
    setT($('wname'), (p.hand && typeof Azioni !== 'undefined' && Azioni.ITEMS[p.hand] ? Azioni.ITEMS[p.hand].name : W.name) + (p.vehicle && p.cur !== 'pugni' ? ' · dal finestrino' : ''));   // [azioni]
    { const wi = $('wicon'), wk = p.hand || p.cur; if (wi.__w !== wk) { wi.__w = wk; weaponIcon(wi, wk); } }   // [azioni] in mano un attrezzo   // [fluido] si ridisegna quando cambia
    setH($('wammo'), W.melee ? '<small>G pugno veloce</small>' : W.throw ? `${a.mag || 0} <small>bottiglie</small>` : `${a.mag} <small>/ ${a.reserve}</small>`);
    setCls($('wammo'), !W.melee && !W.throw && a.mag === 0 ? 'empty' : '');
    setS($('wrel'), 'width', p.reload > 0 ? (1 - p.reload / W.reload) * 100 + '%' : '0%');
    setH($('wslots'), Object.keys(G.WEAPONS).map(k => `<span class="${k === p.cur ? 'on' : p.arms[k] ? '' : 'off'}">${G.WEAPONS[k].slot} ${k === 'pugni' ? 'pugni' : k}</span>`).join(''));
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
    if (ui.time > ui.momentUntil) setHid($('moment'), true);   // [fluido] solo se cambia
  }
  function crosshair() {
    const x = $('xhair'), p = st.player;
    const show = mouse.active && !ui.intro && !ui.dialog && !ui.book && !ui.over && !touchMode && !(window.Editor && Editor.active());   // [editor]
    setHid(x, !show); setS(cv, 'cursor', show ? 'none' : window.Editor && Editor.active() ? Editor.cursor() : 'default');   // [fluido] solo se cambia
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
    sEl.addEventListener('pointerdown', e => { A.init(); sid = e.pointerId; sEl.setPointerCapture(sid); mv(e); });   // [camera3] la levetta è sempre relativa a quello che vedi: in su dritto, di lato curvi
    sEl.addEventListener('pointermove', e => { if (e.pointerId === sid) mv(e); });
    const end = () => { sid = null; stickB = null; stick.x = stick.y = 0; kn.style.left = '43px'; kn.style.top = '43px'; };
    sEl.addEventListener('pointerup', end); sEl.addEventListener('pointercancel', end);
    function mv(e) { const r = sEl.getBoundingClientRect(); let dx = (e.clientX - r.left - 65) / 50, dy = (e.clientY - r.top - 65) / 50; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } stick.x = dx; stick.y = dy; kn.style.left = 43 + dx * 40 + 'px'; kn.style.top = 43 + dy * 40 + 'px'; }
  }

  // ---------- [fluido] Il controller (Gamepad API) ----------
  // Prima il gioco non leggeva il controller: chi lo usava passava da una mappatura sui tasti (WASD, niente corsa, visuale col mouse).
  // Ora si legge a ogni fotogramma, prima del passo del motore. La levetta sinistra cammina rispetto a quello che vedi: zona morta
  // rotonda del 15%, poi una curva (poco inclinata è il passo lento) che arriva alla corsa piena all'85%. La destra gira la visuale
  // (in orizzontale) e la sposta avanti e indietro (in verticale: [visuale5], prima era lo zoom, che resta sulla croce). I tasti diventano quelli della tastiera: A salta (Invio nei menu),
  // B monta o scende, X agisce, Y parla, LB ricarica, RB cambia arma, Back esce, Start il taccuino; il grilletto destro spara dove
  // guardi (alla guida: destro gas, sinistro freno e retro); la croce su e giù fa lo zoom.
  const PAD = { on: false, x: 0, y: 0, m: 0, rot: 0, pan: 0, fire: false, gas: 0, brk: 0, down: [] };
  const PAD_DZ = .15, PAD_RUN = .85, PAD_KEYS = { 0: ' ', 1: 'f', 2: 'e', 3: 't', 4: 'r', 5: 'q', 8: 'Escape', 9: 'Tab' };
  // la stessa risposta per il controller e per la levetta a schermo: 0 nella zona morta, 1 (la corsa) da PAD_RUN in su
  function stickResp(l) { const d = Math.max(0, Math.min(1, (l - PAD_DZ) / (PAD_RUN - PAD_DZ))); return d > 0 ? Math.pow(d, 1.4) : 0; }
  const axis1 = v => { const a = Math.abs(v); return a < PAD_DZ ? 0 : Math.sign(v) * Math.pow((a - PAD_DZ) / (1 - PAD_DZ), 1.6); };
  function padKey(i, down) {
    let k = PAD_KEYS[i]; if (!k) return;
    if ((i === 0 || i === 9) && (ui.intro || ui.over)) k = 'Enter';
    if (!down && k === 'Enter') return;
    document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k, bubbles: true, cancelable: true }));
  }
  function padPoll(dt) {
    let g = null;
    try { const L = navigator.getGamepads ? navigator.getGamepads() : null; if (L) for (let i = 0; i < L.length; i++) { const q = L[i]; if (q && q.connected !== false && q.axes && q.axes.length >= 2) { g = q; break; } } } catch (e) { }
    if (!g) { if (PAD.on) { PAD.on = false; PAD.x = PAD.y = PAD.m = PAD.rot = PAD.pan = PAD.gas = PAD.brk = 0; PAD.fire = false; PAD.down.forEach((d, i) => { if (d) padKey(i, false); }); PAD.down = []; } return; }
    const ax = g.axes[0] || 0, ay = g.axes[1] || 0, l = Math.hypot(ax, ay), m = stickResp(l);
    PAD.m = m; PAD.x = m > 0 ? ax / l : 0; PAD.y = m > 0 ? ay / l : 0;
    PAD.rot = -axis1(g.axes[2] || 0) * 1.6; PAD.pan = -axis1(g.axes[3] || 0);   // [visuale5] in su la visuale va avanti
    const B = g.buttons || [], bv = i => { const b = B[i]; return !b ? 0 : typeof b === 'object' ? (b.pressed ? Math.max(.6, b.value || 0) : b.value || 0) : +b; };
    let any = m > 0 || PAD.rot !== 0 || PAD.pan !== 0;
    for (let i = 0; i < B.length && i < 16; i++) {
      const d = bv(i) > .5; if (d) any = true; if (d === !!PAD.down[i]) continue; PAD.down[i] = d;
      if (PAD_KEYS[i]) padKey(i, d);
      else if (d && i === 12) zoomBy(1 / 1.12); else if (d && i === 13) zoomBy(1.12);
    }
    PAD.gas = bv(7); PAD.brk = bv(6);
    const fire = PAD.gas > .5 && !st.player.vehicle && !ui.dialog && !ui.book && !ui.menu; if (fire && !PAD.fire) mouse.pressed = true; PAD.fire = fire;
    if (PAD.pan && !ui.intro && !ui.dialog && !ui.book) addPan(0, PAD.pan * dt * (window.Visuale ? Visuale.MANO.spostaK : .6));   // [visuale5] la levetta destra in verticale sposta la visuale
    if (any) { PAD.on = true; mouse.active = false; mouse.down = false; lastAim = null; ui.aimPoint = null; }
  }

  // ---------- [console] Il Game Boy di Porto Vecchio ----------
  // Sul sito di Artismi il gioco sta dentro un Game Boy fatto apposta, e lo schermo resta pulito: niente levetta, pulsanti, icone,
  // soldi, minimappa né suggerimenti sopra il mondo. I comandi sono tasti veri nella pulsantiera della console; soldi, ora, mappa,
  // taccuino e il resto stanno nel menu (lo zaino), in ordine; sullo schermo un avviso alla volta (CSS: #app.console).
  // La pagina che ospita il gioco si presenta con {pvc:'ciao'}: il gioco risponde {pv:'console', v:2}.
  // Dalla console: {pvc:'levetta', x, y} (da -1 a 1, come la levetta a schermo), {pvc:'tasto', k, giu}, {pvc:'lascia'} (rilascia tutto).
  // Alla console, solo quando cambiano: {pv:'tasti', t:{a, b, croce, bomboletta, bici, zaino}, on:{bomboletta, bici, zaino}, mano, n,
  // audio} (la scritta di ogni tasto, null = ora non fa niente; acceso o spento; quello che hai in mano; le cose da fare qui) e
  // {pv:'stato', giorno, ora, soldi, debito, scade, ricercato}, per il display della console.
  //   levetta     cammina e guida, come quella a schermo (inclinata poco è il passo, a fondo la corsa)
  //   croce       a piedi e in auto la visuale: ◄ ► la gira, ▲ ▼ avvicina e allontana; in BMX i trick, come le frecce
  //               della tastiera: ▼ impenna, ◄ ► un piede sulla pedalina (k: sx dx su giu, si tengono premuti)
  //   A           il pulsante principale di adesso (Salta, Freno, Ollie, Colore); nei dialoghi conferma; all'inizio si gioca
  //               (ricominciare la partita sta nel menu, Chi è; a partita finita c'è il pulsante sullo schermo)
  //   B           il secondo (Scendi, Impenna, Modo); a piedi: con l'arma spara dove guarda il personaggio (conAim; nel Game Boy
  //               il tocco sullo schermo non spara), con un oggetto lo usa (la scritta dice come: Scava, Mangia, Scatta…), a mani libere
  //               corre finché lo tieni; nei menu, nei dialoghi e nel taccuino torna indietro
  //   bomboletta  la tavoletta dei graffiti (accesa quando ce l'hai in mano)
  //   bici        a piedi → BMX → skate → a piedi (accesa quando pedali; al chiuso niente)
  //   zaino       il menu, col numero delle cose da fare qui; col menu aperto lo chiude
  //   rotella     l'audio
  const CON = { on: false, run: false, fire: false, rot: 0, zoom: 0, dir: {}, trick: { wheelie: false, peg: 0 }, held: {}, sent: '', stato: '' };
  const conBmx = () => !!(st.player.vehicle && jumpMode());   // in BMX la croce fa i trick
  const conSend = m => { try { window.parent.postMessage(m, '*'); } catch (e) { } };
  const conFake = k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const conCmd = (f, ...a) => () => { if (typeof Comandi !== 'undefined' && Comandi[f]) Comandi[f](...a); };
  const conSpray = p => p.hand === 'bomboletta' || p.hand === 'pennarello';
  // i tasti di adesso: {k: {l: scritta, dn, up}}; quelli che mancano ora non fanno niente
  function conMap() {
    const p = st.player, M = {};
    if (ui.over) return M;   // a partita finita c'è il suo pulsante sullo schermo
    if (ui.intro) return M;   // [diretto] mentre carica non c'è niente da premere
    if (ui.dialog || ui.book || ui.menu || ring.n || (window.Cantiere && Cantiere.active())) {
      M.b = { l: 'Indietro', dn: () => conFake('Escape') };
      if (ui.dialog && $('dialog').querySelectorAll('.opt').length === 1) M.a = { l: 'Ok', dn: () => conFake('Enter') };
      if (ui.menu) M.zaino = { l: 'Chiudi', dn: conCmd('zaino') };
      return M;
    }
    const set = touchSet(), tb = k => ({ l: lab(TB[k]), dn: TB[k].dn, up: TB[k].up });
    const sk = window.Skate && Skate.on(st), veh = p.vehicle && st.vehicles.find(q => q.id === p.vehicle), bmx = veh && veh.kind === 'bmx';
    if (set[0]) M.a = tb(set[0]);
    if (set[1]) M.b = tb(set[1]);
    else if (!veh && !sk) {
      const Wp = !p.hand && p.cur !== 'pugni' && G.WEAPONS[p.cur], a = Wp && p.arms[p.cur];
      if (Wp) M.b = { l: (Wp.throw ? 'Lancia ×' + ((a.mag || 0) + (a.reserve || 0)) : 'Spara ' + (a.mag || 0) + '/' + (a.reserve || 0)), dn: () => { CON.fire = true; mouse.pressed = true; }, up: () => { CON.fire = false; } };
      else if (conSpray(p)) M.b = { l: 'Posa', dn: conCmd('via') };   // con la tavoletta i pulsanti non ci sono
      else if (p.hand) { const m = typeof Comandi !== 'undefined' && Comandi.mano ? Comandi.mano() : null; M.b = { l: (m && m.verbo) || 'Usa', dn: conCmd('usaMano') }; }
      else M.b = { l: 'Corri', dn: () => { CON.run = true; }, up: () => { CON.run = false; } };
    }
    M.croce = { l: conBmx() ? '▼ impenna · ◄► piede' : '◄► gira · ▲▼ zoom' };
    if (!p.indoor && (!veh || bmx || sk)) M.bici = { l: sk ? 'A piedi' : bmx ? (window.Skate && Skate.S(st).owned ? 'Skate' : 'A piedi') : 'BMX', dn: conCmd('ruote') };
    if (!veh) M.bomboletta = { l: conSpray(p) ? 'Posa' : 'Graffiti', dn: conCmd('graffiti') };
    M.zaino = { l: 'Zaino', dn: conCmd('zaino') };
    return M;
  }
  function conKey(k, down) {
    if (k === 'sx' || k === 'dx' || k === 'su' || k === 'giu') {   // la croce, finché la tieni: la visuale, o in BMX i trick
      CON.dir[k] = down; const D = CON.dir, bx = conBmx();
      CON.trick.wheelie = bx && !!D.giu; CON.trick.peg = bx ? (D.sx && !D.dx ? 1 : D.dx && !D.sx ? -1 : 0) : 0;
      CON.rot = bx ? 0 : (D.dx ? 1 : 0) - (D.sx ? 1 : 0); CON.zoom = bx ? 0 : (D.giu ? 1 : 0) - (D.su ? 1 : 0); return;
    }
    if (k === 'audio') { if (down) { A.init(); A.toggle(); } CON.sent = ''; return; }
    if (down) { const s = conMap()[k]; if (!s) return; CON.held[k] = s; try { s.dn(); } catch (e) { console.warn('[console]', e); } }
    else { const s = CON.held[k]; delete CON.held[k]; if (s && s.up) try { s.up(); } catch (e) { console.warn('[console]', e); } }
    CON.sent = '';   // le scritte cambiano subito, non al prossimo giro dell'HUD
  }
  function conLetGo() { Object.keys(CON.held).forEach(k => conKey(k, false)); CON.dir = {}; CON.trick = { wheelie: false, peg: 0 }; CON.rot = CON.zoom = 0; CON.run = CON.fire = false; stick.x = stick.y = 0; }
  function conTick(dt) {
    if (CON.zoom && !ui.intro && !ui.dialog && !ui.book && !ui.menu) zoomBy(1 + CON.zoom * dt);   // la croce tenuta: lo zoom
    if (CON.rot) ui.rotUser = true;   // la visuale girata con la croce gira anche il personaggio, da fermo (come col dito)
    if (CON.on && (touchMode || !mouse.active) && !ui.intro) {   // con l'arma in mano il raggio della mira, dove guarda
      const p = st.player; if (!p.vehicle && !p.hand && p.cur !== 'pugni') conAim(); else ui.aimPoint = null;
    }
  }
  // la mira del Game Boy: dove guardano il personaggio e la visuale (da fermo, dove l'hai girato; camminando, dove vai). Niente
  // nemico più vicino scelto da solo: solo chi è proprio lì davanti (11 gradi per parte) prende il colpo preciso
  function conAim() {
    const p = st.player, f = ui.faceIdle !== undefined && !(stick.x || stick.y) ? ui.faceIdle : p.face, W = G.WEAPONS[p.cur] || {}, R0 = Math.min(W.range || 16, 22);
    let best = null, bd = 1e9;
    st.npcs.forEach(n => { if (n.dead || n.inside) return; const dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy); if (d < .4 || d > R0) return;
      const da = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - f), Math.cos(Math.atan2(dy, dx) - f))); if (da < .19 && d < bd) { bd = d; best = n; } });
    if (best) { ui.aimPoint = { x: best.x, y: best.y }; return Math.atan2(best.y - p.y, best.x - p.x); }
    const L = Math.min(R0, 10); ui.aimPoint = { x: p.x + Math.cos(f) * L, y: p.y + Math.sin(f) * L }; return f;
  }
  // ogni decimo di secondo, con l'HUD: le scritte dei tasti e il display della console, solo se sono cambiati
  function conLabels() {
    if (!CON.on) return;
    const p = st.player, M = conMap(), t = {}; ['a', 'b', 'croce', 'bomboletta', 'bici', 'zaino'].forEach(k => { t[k] = M[k] ? M[k].l : null; });
    const m = !ui.intro && typeof Comandi !== 'undefined' && Comandi.mano ? Comandi.mano() : null, mano = m ? m.nome : null;
    const veh = p.vehicle && st.vehicles.find(q => q.id === p.vehicle), on = { bomboletta: conSpray(p), bici: !!(veh && veh.kind === 'bmx') || !!(window.Skate && Skate.on(st)), zaino: !!ui.menu };
    const n = !ui.intro && typeof MenuUI !== 'undefined' && MenuUI.quiCount ? MenuUI.quiCount(st) : 0, key = JSON.stringify(t) + JSON.stringify(on) + mano + n + A.on;
    if (key !== CON.sent) { CON.sent = key; conSend({ pv: 'tasti', t, on, mano, n, audio: A.on }); }
    const hl = G.hoursLeft(st), s = { giorno: G.dayName(st.t), ora: G.clockStr(st.t), soldi: fmt(p.money), debito: fmt(st.debt), scade: st.deadline > 1e8 ? null : hl, ricercato: G.wanted(st) }, sk = JSON.stringify(s);
    if (sk !== CON.stato) { CON.stato = sk; conSend(Object.assign({ pv: 'stato' }, s)); }
  }
  addEventListener('message', e => {
    const d = e.data; if (window.parent === window || e.source !== window.parent || !d || typeof d.pvc !== 'string') return;
    if (d.pvc === 'ciao') {
      if (!CON.on) { CON.on = true; app.classList.add('console'); document.body.classList.add('pv-console'); }   // body: per quello che sta fuori da #app (il DEV)
      CON.sent = CON.stato = ''; conSend({ pv: 'console', v: 2 }); conLabels(); return;
    }
    if (!CON.on) return;
    if (d.pvc === 'levetta') { const c = v => Math.max(-1, Math.min(1, +v || 0)); stick.x = c(d.x); stick.y = c(d.y); const l = Math.hypot(stick.x, stick.y); if (l > 1) { stick.x /= l; stick.y /= l; } }
    else if (d.pvc === 'tasto' && typeof d.k === 'string') conKey(d.k, !!d.giu);
    else if (d.pvc === 'lascia') conLetGo();
  });

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
    const gl0 = R.__models && R.__models.renderer && R.__models.renderer.getContext();
    if (window.PV_GPU) return (gpuName.v = PV_GPU(gl0));   // [avvio] letto una volta, quando il contesto è nato (avvio.js)
    try { const gl = gl0, e = gl && gl.getExtension('WEBGL_debug_renderer_info'); gpuName.v = gl ? String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : ''; } catch (x) { gpuName.v = ''; }
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
  carico('Carico il porto…', .05);
  // [ospite] dentro un altro sito (artismidesignstudio.com) il caricamento lo mostra la pagina che ospita il gioco:
  // le si dice a che punto siamo e quando il menu è pronto, così i caricamenti diventano uno solo
  const host = (p, ready) => { if (!ready) carico(null, p); try { if (window.parent !== window) window.parent.postMessage({ pv: ready ? 'pronto' : 'carico', p }, '*'); } catch (e) { } };
  const KITS = window.PV_KITS || ['bkit', 'rurban', 'food', 'arcade', 'train', 'grave', 'urban', 'natura', 'urbano', 'casa', 'stazione', 'garage', 'tortura'];
  if (window.__pvFetchModel) { const f0 = window.__pvFetchModel; let kd = 0; window.__pvFetchModel = url => { const r = f0(url); if (/kit_/.test(url)) r.then(() => host(.15 + .7 * ++kd / KITS.length), () => { }); return r; }; }
  host(.15);
  const kitWait = window.Kit ? Promise.race([Kit.load('assets/mk/', KITS), new Promise(r => setTimeout(() => r(false), 45000))]).catch(e => { console.warn('Kit:', e); return false; }) : Promise.resolve(false);
  // [avvio] e la pagina letta fino in fondo: con i kit già scaricati (avvio.js) Kit.load finisce subito, e boot() partiva prima che
  // i moduli dopo main.js (personaggi, menu_ui, protagonista_ui…) fossero caricati. Prima ci pensava l'attesa della rete
  const domWait = document.readyState === 'loading' ? new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true })) : null;
  Promise.all([kitWait, window.Editor ? Editor.load().catch(e => console.warn('[editor]', e)) : null, domWait, window.Tasselli ? Tasselli.pronto : null]).then(boot);   // [editor] i ritocchi arrivano prima della scena
  function boot() {
  let glOk = true;
  if (R.scorcio && R.scorcio.on) try { const c = R.scoCentro(); if (c) { st.player.x = c.px; st.player.y = c.pz; } } catch (e) { console.warn('[scorcio]', e); }   // [scorcio] si parte nello scorcio
  try { R.init(cv, st); } catch (err) { glOk = false; console.error(err); }
  if (!glOk) {
    $('screen').innerHTML = `<div class="in"><div class="logo" style="font-size:clamp(34px,6vw,64px)">Porto Vecchio</div><div class="story"><p>Il gioco usa la grafica 3D del browser (WebGL) e qui non è riuscito ad avviarla.</p><p>Prova ad aprire la pagina in Chrome, Edge o Firefox aggiornati, con l'accelerazione hardware attiva nelle impostazioni del browser.</p></div></div>`;
    host(1, true);   // [ospite] che si legga l'avviso
    return;
  }
  setTimeout(() => { try { softwareCheck(); } catch (e) { } }, 4000);   // [prestazioni] avvisa se si disegna senza scheda video
  if (window.Editor) Editor.attach({ get st() { return st; }, ui, G, R, cv, app, toast });   // [editor] F2
  function size() { const w = app.clientWidth || innerWidth, h = app.clientHeight || innerHeight; R.resize(w, h, Math.min(2, devicePixelRatio || 1)); }
  new ResizeObserver(size).observe(app); size();
  // [fluido] i programmi della scheda video si preparano adesso, durante il caricamento, non a scatti mentre si gioca
  if (window.PesoPronti && PesoPronti.ON) PesoPronti.compila(R); else   /* [peso] più la casa tagliata e le due varianti del pavimento */
  try { const M0 = R.__models; if (M0 && M0.renderer && M0.scene && R.getCamera) M0.renderer.compile(M0.scene, R.getCamera()); } catch (e) { console.warn('[compile]', e); }
  (window.__tl = window.__tl || {}).compilato = Math.round(performance.now());   // [anelli] la linea del tempo del caricamento (sonde)
  let last = performance.now(), hudT = 0, perfT = 0, perfN = 0, perfDone = false, resAvg = .016, resT = 0;
  const loop = typeof Misura !== 'undefined' ? Misura.timed(loop0, 'main:ciclo') : loop0;   // [misura]
  // [fluido3] sul telefono: risoluzione fissa (niente cali) e, se i 60 fotogrammi non reggono, 30 regolari. Un 30 costante
  // sembra più fluido di un 45 che oscilla (era il tremolio), e la risoluzione dinamica che scendeva era la «perdita di risoluzione»
  const FC = { on: false, t: 0, n: 0 };
  // [ritmo] ora un regolatore solo (peso_ritmo.js): la scala della scena a gradini con isteresi, e il tetto a 30 (o a 60 sugli schermi
  // veloci) quando la scheda non regge, per tutti; quelli qui sotto restano per ?noritmo
  const RIT = typeof PesoRitmo !== 'undefined' && PesoRitmo.ON;
  const PACE = { avg: 1 / 60, debt: 0 };   // [fluido]
  // [fluido] lo sguardo avanti della camera: la direzione (nel mondo) che la levetta chiede in questo fotogramma, la stessa data al
  // motore; render.js la sposta verso quel lato dello schermo subito (pochi centesimi di secondo), non dietro alla velocità
  const LEAD = { x: 0, y: 0, m: 0 };
  function leadOf(inp) {
    if (!inp || inp.mag === undefined || !(inp.x || inp.y) || st.player.vehicle || ui.intro) return null;
    const l = Math.hypot(inp.x, inp.y); LEAD.x = inp.x / l; LEAD.y = inp.y / l; LEAD.m = .4 + .6 * Math.min(1, inp.mag); return LEAD;
  }
  // [avvio] [diretto] si entra in partita quando il gioco risponde davvero: disegnati i primi fotogrammi (che caricano tutto sulla
  // scheda video e la aspettano: in SwiftShader 10-45 s ciascuno) e visto almeno un fotogramma sotto i 100 ms. Prima «Gioca» si
  // accendeva appena i programmi erano pronti, e per un minuto restava acceso su una pagina ferma. Se i 100 ms non arrivano mai (scheda
  // lentissima) dopo 12 fotogrammi sotto il secondo si parte lo stesso, e comunque dopo 90 s di fotogrammi.
  const VIVO = { on: true, n: 0, t0: 0 };
  function vivoTick(raw) {
    if (!VIVO.t0) VIVO.t0 = performance.now(); VIVO.n++;
    if (!(VIVO.n >= 3 && raw < .1) && !(VIVO.n >= 12 && raw < 1) && performance.now() - VIVO.t0 < 90000) return;
    VIVO.on = false; (window.__tl = window.__tl || {}).vivo = Math.round(performance.now()); window.__tl.vivoN = VIVO.n;
    start(); (window.__tl = window.__tl || {}).gioco = Math.round(performance.now());   // [diretto] si gioca
    requestAnimationFrame(() => requestAnimationFrame(() => host(1, true)));   // [ospite] il gioco è disegnato e risponde: si può mostrare
  }
  function loop0(now) {
    if (RIT ? PesoRitmo.salta(now) : FC.on && now - last < 30) { requestAnimationFrame(loop); return; }   // [ritmo] il tetto: questo giro non si disegna
    const tL0 = performance.now();
    const raw = Math.max(0, (now - last) / 1000); last = now;
    if (VIVO.on) vivoTick(raw);
    if (RIT) PesoRitmo.misura(now, raw, !VIVO.on && !ui.intro && ui.time > 6 && !document.hidden && !(window.Studio && Studio.hidesGame()));   // [ritmo]
    // [fluido] passo regolare: i fotogrammi quasi uguali (16,4 / 17,1 ms: il ritmo dello schermo letto dal browser) usano la media,
    // così il movimento non trema; quello che avanza o manca si restituisce a poco a poco (il tempo di gioco non deriva).
    // I salti veri (un fotogramma lungo) passano com'erano, al massimo 50 ms
    if (raw > 0 && raw < .25) { PACE.avg += (raw - PACE.avg) * .08; } const near = Math.abs(raw - PACE.avg) < PACE.avg * .2;
    let dtv = near ? PACE.avg : raw; PACE.debt += raw - dtv; const pay = PACE.debt * .1; dtv += pay; PACE.debt -= pay; if (!near) PACE.debt = 0;
    const dt = Math.min(.05, Math.max(0, dtv)); ui.time += dt;
    if (!RIT && touchMode && !FC.on && !ui.intro && ui.time > 8 && raw < .25) { FC.t += raw; FC.n++; if (FC.t > 3) { if (FC.t / FC.n > 1 / 52) FC.on = true; FC.t = 0; FC.n = 0; } }
    if (window.Studio && Studio.hidesGame()) { requestAnimationFrame(loop); return; }   // [studio] nell'hangar il mondo dorme
    if (!perfDone && ui.time > 10) { perfT += raw; perfN++; if (perfN >= 180) { if (perfT / perfN > 1 / 22 && (RIT ? PesoRitmo.inFondo() : touchMode || R.res <= .72)) { perfDone = true; R.lowQuality(); toast('Grafica ridotta: questo computer fatica. Per la qualità piena aggiungi ?alta all\'indirizzo.'); } else { perfT = 0; perfN = 0; } } }   /* [colore1] prima scattava dopo 2 s (i primi secondi sono sempre lenti: shader, blocchi) e lasciava tutto a quadrettoni; ora prima la risoluzione dinamica, e solo se al 70% non regge */
    // [fluido] risoluzione dinamica: media mobile del fotogramma; sopra i 22 ms si scende di un gradino, sotto i 14 ms per 4 s si risale (al massimo un cambio ogni 1,5 s)
    if (!RIT && R.setRes && !touchMode && !ui.intro && raw < .25) { resAvg += (raw - resAvg) * .05; resT += raw;
      // [fluido2] tre gradini soli (100, 85, 72%) e con calma: ogni cambio rifà tutte le immagini intermedie della grafica
      // (uno scatto, e sul telefono memoria che si rimescola). Prima poteva cambiare ogni 1,5 s, proprio quando acceleri o zoomi
      const RL = [1, .85, .72], ri = RL.reduce((b, v, i) => Math.abs(v - R.res) < Math.abs(RL[b] - R.res) ? i : b, 0);
      if (resT > 3 && resAvg > .024 && ri < 2) { R.setRes(RL[ri + 1]); resT = 0; resAvg = .018; }
      else if (resT > 12 && resAvg < .013 && ri > 0) { R.setRes(RL[ri - 1]); resT = 0; } }
    padPoll(dt);   // [fluido] il controller si legge prima di tutto: il comando di questo fotogramma muove già questo fotogramma
    conTick(dt);   // [console]
    let inpF = null;
    const slow = ui.menu && ui.menuSlow;   // [menu] in strada col menu aperto il mondo rallenta, non si ferma; nel covo si ferma
    const edOn = window.Editor && Editor.active(), ed = edOn ? Editor.view(dt) : null;   // [editor] il mondo si ferma, la camera va dove dice l'editor
    const paused = ui.dialog || ui.book || (ui.menu && !slow) || ui.over || edOn;   // [azioni]
    if (slow && !paused && !edOn) G.step(st, dt * .25, { x: 0, y: 0 });
    else if (!paused) {
      const inp = ui.intro ? { x: 0, y: 0, freeze: true } : input(); inpF = inp;   // [fluido] lo stesso comando va al motore e alla camera, nello stesso fotogramma
      if (!ui.intro && (mouse.down || touchFire || mouse.pressed || PAD.fire || CON.fire)) G.fire(st, CON.fire && !mouse.down ? aimAngle() : inp.aim !== undefined ? inp.aim : aimAngle(), ui.aimPoint, mouse.pressed);   // [console] B: si spara dove mira da solo
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
    if ((touchMode || CON.on) && ui.rotUser) { ui.rotUser = false; if (!st.player.vehicle && !(stick.x || stick.y) && R.cam.yaw !== undefined) ui.faceIdle = Math.atan2(-Math.cos(R.cam.yaw), -Math.sin(R.cam.yaw)); }   // [camera4] da fermo, la visuale girata a mano gira anche il personaggio
    FRAME(st, dt, { studio: !!window.PV_STUDIO, focus: ed ? ed.focus : ui.intro ? st.player : null,   /* [diretto] mentre carica la camera sta già sul personaggio */ mark: edOn ? null : ui.mark, aimPoint: ui.aimPoint, dialogNpc: ui.dialog && ui.dialog.npc, intro: ui.intro, letterbox: ui.letterbox || !!ui.dialog, flash: ui.flash, fade: ui.fade, desat: ui.desat, time: ui.time, zoom: ui.zoom, stick: (touchMode || CON.on) && Math.hypot(stick.x, stick.y) > .15 ? stick : null, lead: leadOf(inpF), pan: (() => { const d = ui.pan; ui.pan = null; return d; })(), camMano: camDrag !== null || !!(tg && tg.drag) || pin.size >= 2 || PAD.rot !== 0 || PAD.pan !== 0 || !!keys['.'] || !!keys[','],   /* [visuale5] il giocatore sta toccando la camera: niente ricentro */ rot: ed ? ed.rot : (keys['.'] ? 1 : 0) - (keys[','] ? 1 : 0) + PAD.rot + (ui.dialog || ui.book || ui.menu ? 0 : CON.rot), drag: (() => { const d = ui.drag || 0; ui.drag = 0; return d; })(), top: !!ui.top, edge: mouse.active && !ui.dialog && !ui.book && !ui.intro && !edOn ? (mouse.nx < .025 ? -1 : mouse.nx > .975 ? 1 : 0) : 0 });
    PERF.frame += performance.now() - tF;
    sounds();
    drawBubbles(); crosshair(); perfTick(now); if (typeof Misura !== 'undefined') Misura.frame();
    hudT -= dt; if (hudT <= 0) { hudT = .1; hud(); drawMinimap(); touchButtons(); conLabels(); }
    if (RIT) PesoRitmo.lavoro(performance.now() - tL0);   // [ritmo] il lavoro del processore in questo fotogramma
    requestAnimationFrame(loop);
  }
  // [carico] i programmi della scheda video si preparano insieme (vedi render.js, KHR_parallel_shader_compile): finché non
  // sono pronti il gioco non disegna (il primo fotogramma li aspetterebbe fermo), il pulsante dice a che punto siamo e la
  // pagina resta viva. Oltre i 60 s si parte comunque
  const shT0 = performance.now();
  (function shWait() {
    let f = 1; try { f = R.shadersPronti ? R.shadersPronti() : 1; } catch (e) { }
    if (f < 1 && performance.now() - shT0 < 60000) { carico('Preparo la grafica… ' + Math.round(f * 100) + '%'); host(.85 + .1 * f); setTimeout(shWait, 100); return; }
    carico('Quasi pronto…', .95);   // [avvio] si entra in vivoTick, quando i fotogrammi corrono
    (window.__tl = window.__tl || {}).shader = Math.round(performance.now());
    last = performance.now(); requestAnimationFrame(loop);
  })();
  window.__pv = { get st() { return st; }, ui, G, R, input: () => input(), keys, mouse, click, pickAt: (x, y) => pickAt(x, y), toast, bmx: doBmx, act: doAct, sprayColor, sprayMode, SPRAY_COLS, touchMode, book: f => toggleBook(f), restart: () => restart(), get console() { return CON.on; } };   // [mobile] toast…touchMode: per le icone a schermo (comandi.js)   // [console] book, console: per il menu (menu_ui.js)
  }
})();
