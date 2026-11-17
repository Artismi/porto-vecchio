/* Porto Vecchio — [interfaccia] LO STRATO DELLE INFORMAZIONI, MINIMO (v7/INTERFACCIA.md).
   «Non serve vedere tutti i nomi delle case… tra quello e i messaggi lo schermo è pieno: punti esclamativi, punti di domanda,
   frecce. Non si capisce niente. Deve essere il più chiaro possibile.»
   La gerarchia, dalla cosa più importante alla meno:
     1. L'OBIETTIVO di adesso: l'unico segno sempre in vista (la riga in alto a sinistra, il diamante nel mondo, la freccia a bordo
        schermo quando è fuori, il segnaposto sulla minimappa). Non lo tocca questo file: sta in orienta.js, main.js e render.js.
     2. I SUGGERIMENTI d'azione (le chip E/T/F): solo quando sei a portata e servono (G.context, com'era).
     3. I SEGNI SULLA GENTE: il fumetto di chi parla (al più 3, al telefono 2, entro 22 m), il nome con l'umore solo di chi hai
        accanto (al più 2, entro 4,5 m), le icone (!! e ✚ pericolo entro 22 m; ! visto, ? sentito, € comprato entro 14 m; al più 3;
        il «+» degli amici non c'è più: il colore sulla minimappa dice già chi ti vuole bene). Nessuno copre il protagonista.
     4. I NOMI DEI POSTI: mai sempre accesi. Il nome di una casa compare piccolo, in alto a sinistra, quando entri (2,6 s), quando
        sei proprio alla porta e la guardi (telefono e computer), e al computer sotto il puntatore, sulla porta o sul muro.
     5. GLI AVVISI (la cronaca): una coda corta, al più 2 alla volta (al telefono 1), ognuno quanto serve a leggerlo (2,6-6,5 s);
        lo stesso testo non si ripete, quello che dice già la riga dell'obiettivo non entra.
   Gli agganci sono pochi e piccoli: main.js (drawBubbles, feedDom, il puntatore), risacca_ui.js (le etichette nel mondo, il
   riquadro «dentro»). A interruttore spento (?nointerfaccia, o Interfaccia.on = false in corsa) tutto torna com'era.
   Fuori dall'impronta dei tasselli (build.py TASS_FUORI): non tocca la città. */
var Interfaccia = (function () {
  'use strict';
  const DOM = typeof document !== 'undefined' && typeof location !== 'undefined';
  const I = { on: DOM && !/[?&]nointerfaccia\b/.test(location.search) };
  const CFG = I.CFG = {
    // le etichette di risacca_ui.js: il raggio per tipo (m) e quante insieme; le porte non ci sono più (vedi luogo)
    etichette: { max: 4, raggio: { base: 25, space: 15, site: 25, lot: 8, tg: 30, off: 30, wave: 10, mural: 12, mem: 12 }, memVicino: 5.5 },
    // la gente (main.js drawBubbles)
    npc: { fumetti: 3, fumettiTel: 2, fumettoR: 22, nomi: 2, nomeR: 4.5, icone: 3, iconaR: 14, pericoloR: 22, amici: false },
    // la cronaca
    avvisi: { max: 2, maxTel: 1, coda: 3, min: 2.6, max_s: 6.5, perCar: 1 / 16 },
    // il nome del posto: quanto resta entrando, la porta davanti (m, coseno dello sguardo)
    luogo: { entra: 2.6, piano: 1.8, porta: 1.6, sguardo: .5, aiuti: 3 },
  };
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const tel = () => DOM && matchMedia('(pointer: coarse)').matches;
  const G = () => window.Game, PV = () => window.__pv;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const nome = b => b ? (b.label || b.name || '') : '';
  I.nome = bi => { const g = G(); return nome(g && g.BUILDINGS && g.BUILDINGS[bi]); };

  // ---------------- STILE ----------------
  const CSS = `
#if-luogo { position: absolute; display: block; width: max-content; max-width: min(300px, calc(100vw - 130px)); font: 500 12.5px/1.25 var(--f-pix); color: #f4e8d0; background: rgba(13, 11, 26, .78); border-left: 2px solid var(--amber); padding: 2px 8px 3px; margin-bottom: 3px; text-shadow: none; opacity: 0; transition: opacity .25s; pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#if-luogo.on { opacity: 1; } body.if-on.if-luogo #feed { margin-top: 25px; }   /* acceso, la cronaca scende di una riga */ #if-luogo small { display: block; font-size: 11px; color: var(--muted); white-space: normal; }
body.if-on #feed .fi { transition: opacity .3s; } body.if-on #feed .fi.if-via { opacity: 0; }
#hover.if-nome { font-size: 12px; padding: 1px 7px 2px; border-width: 0 0 0 2px; border-color: var(--amber); background: rgba(13, 11, 26, .8); color: #f4e8d0; }
#hover:not([hidden]) { animation: if-in .18s ease-out; } @keyframes if-in { from { opacity: 0; } }
body.if-on #rs-indoor { display: none !important; }
@media (prefers-reduced-motion: reduce) { #if-luogo, body.if-on #feed .fi { transition: none; } #hover:not([hidden]) { animation: none; } }
`;
  if (DOM) {
    const css = document.createElement('style'); css.id = 'interfaccia-css'; css.textContent = CSS; (document.head || document.documentElement).appendChild(css);
    const cl = () => document.body && document.body.classList.toggle('if-on', I.on); if (document.body) cl(); else addEventListener('DOMContentLoaded', cl);
  }
  let onPrima = null;
  function segui() { if (onPrima === I.on) return; onPrima = I.on; if (document.body) document.body.classList.toggle('if-on', I.on); if (!I.on) { const L = $('if-luogo'); if (L) L.remove(); document.body.classList.remove('if-luogo'); AV.vivi.length = 0; AV.coda.length = 0; } }

  // ---------------- LA GENTE (main.js drawBubbles) ----------------
  // C: [{ k: 'bub'|'tag'|'ico', d, cls, html, sx, sy, hot, ico }] → la scelta, con le posizioni spostate fuori dal protagonista.
  // pl: la scatola del protagonista sullo schermo { x0, x1, y0, y1 } (px) o null
  const PRI = { fear: 0, seen: 1, heard: 2, bribe: 3, friend: 4 };
  I.scegliGente = function (C, pl) {
    const N = CFG.npc, out = [];
    const bub = C.filter(c => c.k === 'bub' && c.d < N.fumettoR).sort((a, b) => (b.hot - a.hot) || a.d - b.d).slice(0, tel() ? N.fumettiTel : N.fumetti);
    const parla = new Set(bub.map(c => c.n));   // chi parla ha già il nome sul fumetto: niente cartellino né icona in più
    const tag = C.filter(c => c.k === 'tag' && c.d < N.nomeR && !parla.has(c.n)).sort((a, b) => a.d - b.d).slice(0, N.nomi);
    tag.forEach(c => parla.add(c.n));
    const ico = C.filter(c => c.k === 'ico' && (c.ico === 'fear' ? c.d < N.pericoloR : c.ico === 'friend' ? N.amici && c.d < N.iconaR : c.d < N.iconaR))
      .sort((a, b) => (PRI[a.ico] - PRI[b.ico]) || a.d - b.d).slice(0, N.icone);
    // chi ha il nome accanto non ha anche l'icona (l'icona è già dentro il cartellino)
    const conNome = new Set(tag.map(c => c.n));
    out.push(...bub, ...tag, ...ico.filter(c => !conNome.has(c.n)));
    if (pl) out.forEach(c => { if (c.sx > pl.x0 - 30 && c.sx < pl.x1 + 30 && c.sy > pl.y0 && c.sy - (c.k === 'bub' ? 40 : 18) < pl.y1) c.sy = pl.y0 - 4; });   // sopra la testa, mai sul corpo
    return out;
  };

  // ---------------- LE ETICHETTE NEL MONDO (risacca_ui.js) ----------------
  I.raggio = cls => { const k = String(cls).split(' ').pop(); return CFG.etichette.raggio[k] || 20; };
  // out: [[cls, testo, x, y, d]] → le più vicine, al più max
  I.etichette = out => out.length <= CFG.etichette.max ? out : out.slice().sort((a, b) => (a[4] || 0) - (b[4] || 0)).slice(0, CFG.etichette.max);

  // ---------------- GLI AVVISI (main.js feedDom) ----------------
  const AV = { visti: new WeakSet(), coda: [], vivi: [] };
  function doppione(st, f) {
    const t = f.text || ''; if (!t) return true;
    if (AV.vivi.some(v => v.f.text === t) || AV.coda.some(q => q.text === t)) return true;
    const ob = $('or-obt'), oo = $('or-obj'); if (ob && ob.textContent && oo && !oo.hidden && t.indexOf(ob.textContent) >= 0) return true;   // lo dice già la riga dell'obiettivo
    return false;
  }
  I.avvisi = function (st, box) {
    segui(); if (!box || !st) return;
    if (box.__items) { box.__items = null; box.__map = null; box.textContent = ''; }   // quello che c'era prima (main.js)
    const now = st.clock || 0, A = CFG.avvisi;
    for (let i = st.feed.length - 1; i >= 0; i--) { const f = st.feed[i]; if (AV.visti.has(f)) continue; AV.visti.add(f); if (!doppione(st, f)) AV.coda.push(f); }
    while (AV.coda.length > A.coda) { const k = AV.coda.findIndex(f => f.kind !== 'bad' && f.kind !== 'job'); AV.coda.splice(k < 0 ? 0 : k, 1); }   // la coda corta: via il più vecchio che non conta
    for (let i = AV.vivi.length - 1; i >= 0; i--) { const v = AV.vivi[i]; if (v.fino > now) continue; AV.vivi.splice(i, 1); const el = v.el; el.classList.add('if-via'); setTimeout(() => el.remove(), 320); }
    const max = tel() ? A.maxTel : A.max;
    while (AV.vivi.length < max && AV.coda.length) {
      const f = AV.coda.shift(), el = document.createElement('div'); el.className = 'fi ' + (f.kind === 'radio' ? 'rumor' : f.kind || 'info'); el.textContent = f.text;
      box.insertBefore(el, box.firstChild);   // il più recente in cima
      AV.vivi.push({ f, el, fino: now + clamp(A.min + f.text.length * A.perCar + (f.kind === 'bad' ? 1 : 0), A.min, A.max_s) });
    }
  };

  // ---------------- IL NOME DEL POSTO ----------------
  const LU = { el: null, testo: '', fino: 0, dentro: null, piano: null, entrate: 0, porta: null, portaFino: 0 };
  // fuori da #feed (al telefono unico_schermo.js nasconde ogni riga della cronaca dopo la prima): accanto, dove comincia la cronaca,
  // che quando il nome è acceso scende di una riga (body.if-luogo)
  function luogoEl() {
    const box = $('feed'); if (!box || !box.parentNode) return null;
    let el = $('if-luogo'); if (!el) { el = document.createElement('div'); el.id = 'if-luogo'; el.className = 'hud'; el.setAttribute('aria-live', 'polite'); }
    if (el.parentNode !== box.parentNode) box.parentNode.insertBefore(el, box);
    const cs = getComputedStyle(box), t = cs.top, l = cs.left; if (el.__t !== t) { el.__t = t; el.style.top = t; } if (el.__l !== l) { el.__l = l; el.style.left = l; }
    return el;
  }
  function mostra(html, s, now) { LU.html = html; LU.fino = now + s; }
  // da main.js hud() (ogni ~0,1 s)
  I.tick = function (st) {
    segui(); if (!I.on || !st || !st.player) return;
    const g = G(), pv = PV(), ui = (pv && pv.ui) || {}, p = st.player, now = st.clock || 0; if (!g || !g.BUILDINGS) return;
    // entrare: il nome (e il piano), piccolo; le prime volte anche come si esce
    const ind = p.indoor ? p.indoor.b : null;
    if (ind !== LU.dentro) {
      LU.dentro = ind;
      if (ind != null) { const b = g.BUILDINGS[ind], L = g.INT && g.INT.layout ? g.INT.layout(b) : null, piani = L && L.floors ? L.floors.length : 1; LU.entrate++; LU.piano = p.indoor.f;
        const pn = piani > 1 ? ' · ' + (g.INT.floorLabel ? g.INT.floorLabel(p.indoor.f) : p.indoor.f ? 'primo piano' : 'piano terra') : '';
        const aiuto = LU.entrate <= CFG.luogo.aiuti ? `<small>esci dalla porta arancione${L && L.stairs ? ' · scala: tappeto giallo sali, azzurro scendi' : ''}</small>` : '';
        mostra(esc(nome(b)) + esc(pn) + aiuto, CFG.luogo.entra + (aiuto ? 1.4 : 0), now); }
      else LU.fino = 0;
    } else if (ind != null && p.indoor.f !== LU.piano) { LU.piano = p.indoor.f; mostra(esc(g.INT.floorLabel ? g.INT.floorLabel(p.indoor.f) : p.indoor.f ? 'primo piano' : 'piano terra'), CFG.luogo.piano, now); }
    // alla porta, guardandola: il nome finché ci stai davanti
    let porta = null;
    if (ind == null && !p.vehicle && !ui.intro && !ui.dialog && g.doorFront) { const D = g.doorFront(st, [Math.cos(p.face || 0), Math.sin(p.face || 0)], null, CFG.luogo.sguardo); if (D && D.d < CFG.luogo.porta) porta = D.bi; }
    if (porta != null) { LU.porta = porta; LU.portaFino = now + .4; }
    const sp = ui.intro || ui.over || ui.dialog || ui.book || (p.lv && p.lv.k === 'ug') || window.__pulita;
    const html = sp ? '' : now < LU.fino ? LU.html : LU.porta != null && now < LU.portaFino ? '▸ ' + esc(I.nome(LU.porta)) : '';
    const el = luogoEl(); if (!el) return;
    if (html) { if (LU.testo !== html) { LU.testo = html; el.innerHTML = html; } if (!el.classList.contains('on')) { el.classList.add('on'); document.body.classList.add('if-luogo'); } }
    else if (el.classList.contains('on')) { el.classList.remove('on'); document.body.classList.remove('if-luogo'); }
  };

  // ---------------- IL PUNTATORE (main.js tickClick): il nome della casa sotto il mouse ----------------
  let IDX = null;
  function indice(g) {
    const W = g.MAP && g.MAP.world, GW = W && W.GW, GH = W && W.GH; if (!GW || !GH) return null;
    if (IDX && IDX.B === g.BUILDINGS) return IDX;
    const a = new Int32Array(GW * GH).fill(-1);
    g.BUILDINGS.forEach((b, i) => { if (!b || !b.w || !b.h) return; for (let y = Math.max(0, b.y); y < Math.min(GH, b.y + b.h); y++) for (let x = Math.max(0, b.x); x < Math.min(GW, b.x + b.w); x++) a[y * GW + x] = i; });
    return (IDX = { a, GW, GH, B: g.BUILDINGS });
  }
  // h: quello che pickAt ha trovato; R: il render; nx, ny: il puntatore (0-1). Il testo, o ''
  I.sotto = function (h, R, nx, ny, st) {
    if (!I.on) return '';
    const g = G(); if (!g) return '';
    if (h && h.kind === 'door') return I.nome(h.bi);
    if (h && h.kind !== 'move') return '';
    if (st && st.player && st.player.indoor) return '';
    const q = R && R.screenToGround ? R.screenToGround(nx, ny) : null; if (!q) return '';
    const X = indice(g); if (!X) return '';
    const tx = Math.floor(q.x / g.TS), ty = Math.floor(q.y / g.TS); if (tx < 0 || ty < 0 || tx >= X.GW || ty >= X.GH) return '';
    const bi = X.a[ty * X.GW + tx]; return bi >= 0 ? I.nome(bi) : '';
  };
  if (typeof window !== 'undefined') window.Interfaccia = I;
  return I;
})();
