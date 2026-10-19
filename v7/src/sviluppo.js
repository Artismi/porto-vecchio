// Porto Vecchio — il pannello dello sviluppatore [sviluppo1]
// F9 (o Ctrl+Maiusc+D, o il pulsante DEV in alto a destra) lo apre e lo chiude. Per esplorare e provare il gioco senza limiti:
// - TEMPO E METEO: forza il tempo (window.__meteo, render.js), sposta l'ora, la camera lontana o vicina.
// - SOLDI E ROBA: soldi infiniti, oggetti e materiali infiniti (quello che hai in tasca non cala, le scorte della banda sono piene),
//   «dammi tutto»: una pila di ogni oggetto del catalogo (Oggetti.CAT) e le armi con le munizioni.
// - IL PROTAGONISTA: invulnerabile, ricercato azzerato, teletrasporto in ogni luogo (World.PLACES) o accanto a una persona.
// - LA GENTE: cerca una persona per nome, portala da te, falla entrare nella banda (Risacca.join, anche oltre il tetto dei membri),
//   chiama da te tutta la banda.
// Le scelte (interruttori) restano fra una partita e l'altra (localStorage, se c'è).
const Sviluppo = (() => {
  'use strict';
  if (typeof document === 'undefined') return {};
  const PV = () => window.__pv, ST = () => PV() && PV().st, G = () => PV() && PV().G;
  const say = (m, k) => { const pv = PV(); if (pv && pv.toast) pv.toast(m, k); else if (pv && pv.G && pv.st) pv.G.feed(pv.st, m, k); else console.log('[sviluppo]', m); };
  const KEY = 'pv-sviluppo';
  let OPT = { soldi: false, roba: false, dio: false, pulito: false };
  try { OPT = Object.assign(OPT, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(OPT)); } catch (e) { } };
  const TS = () => (G() && G().TS) || 2;
  const npcName = n => (n.name || n.first || n.id || '?') + (n.cop ? ' (guardia)' : '');

  // ---------------- le azioni ----------------
  function meteo(v) { window.__meteo = v || null; say(v ? 'Meteo: ' + v : 'Meteo libero'); }
  function ora(h) { const st = ST(); if (!st) return; st.t = Math.floor(st.t / 1440) * 1440 + Math.round(h * 60); say('Ora: ' + (G().clockStr ? G().clockStr(st) : h + ':00')); }
  function piuOre(k) { const st = ST(); if (!st) return; st.t += k * 60; say('+' + k + ' ore'); }
  function zoom(z) { const pv = PV(); if (!pv) return; pv.ui.zoom = z; if (pv.R && pv.R.cam) pv.R.cam.tz = z; }
  function vai(x, y) {
    const st = ST(), pv = PV(); if (!st) return; const p = st.player;
    if (p.vehicle) { const v = st.vehicles.find(q => q.id === p.vehicle); if (v) { v.x = x; v.y = y; } }
    p.x = x; p.y = y; p.lv = null; p.indoor = null; p.path = []; p.jz = 0; p.jvz = 0;
    if (pv.R && pv.R.cam) { pv.R.cam.x = pv.R.cam.tx = x; pv.R.cam.y = pv.R.cam.ty = y; }
  }
  function vaiLuogo(id) { const P = G() && G().PLACES[id]; if (!P) return; const x = P.x !== undefined ? P.x : (P.tx + .5) * TS(), y = P.y !== undefined ? P.y : (P.ty + .5) * TS(); vai(x, y); say('Sei a ' + (P.name || id)); }
  function trova(q) {
    const st = ST(); if (!st) return []; q = (q || '').toLowerCase().trim(); const p = st.player;
    return st.npcs.filter(n => !n.dead && (!q || npcName(n).toLowerCase().includes(q) || (n.pop && n.pop.giro || '').includes(q)))
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 40);
  }
  const byId = id => ST() && ST().npcs.find(n => n.id === id);
  function portaQui(n, k) {
    const st = ST(); if (!st || !n) return; const p = st.player, a = (k || 0) * 1.1 + .6;
    n.x = p.x + Math.cos(a) * 1.8; n.y = p.y + Math.sin(a) * 1.8; n.inside = false; n.standby = false; n.indoor = p.indoor || null; n.path = []; n.stun = 0;
    if (n.action && n.action.name === 'dentro') n.action.name = 'routine'; if (n.pop) n.pop.near = true;
  }
  function vaiDa(n) { if (n) { vai(n.x + 1.5, n.y); say('Sei accanto a ' + npcName(n)); } }
  function inBanda(n) {
    const st = ST(), R = typeof Risacca !== 'undefined' ? Risacca : null; if (!st || !n || !R) return;
    const cap = R.EXT && R.EXT.canJoin; if (R.EXT) R.EXT.canJoin = null;   // lo sviluppatore non ha tetto dei membri
    let ok; try { ok = R.join(st, n, 'chiamato dallo sviluppatore'); } finally { if (R.EXT) R.EXT.canJoin = cap; }
    say(ok === false ? npcName(n) + ' non può entrare' : npcName(n) + ' è nella banda', ok === false ? 'bad' : 'good');
  }
  function banda() { const st = ST(), R = typeof Risacca !== 'undefined' ? Risacca : null; if (!st || !R) return []; try { return R.members(st) || []; } catch (e) { return st.npcs.filter(n => st.ris && st.ris.npc && st.ris.npc[n.id] && st.ris.npc[n.id].member); } }
  function chiamaBanda() { const M = banda(); M.forEach((n, k) => portaQui(n, k)); say(M.length ? 'La banda è qui (' + M.length + ')' : 'La banda è vuota'); }
  function dammiTutto() {
    const st = ST(), O = typeof Oggetti !== 'undefined' ? Oggetti : null; if (!st || !O) return; let n = 0;
    Object.keys(O.CAT).forEach(id => { O.givePlayer(st, id, 20, true); n++; });
    try { O.givePlayer(st, 'munizioni', 20, true); } catch (e) { }
    riempiScorte(); say('Hai ' + n + ' oggetti diversi, 20 ciascuno', 'good');
  }
  function riempiScorte() {
    const st = ST(), R = typeof Risacca !== 'undefined' ? Risacca : null; if (!st || !st.ris || !R) return;
    Object.keys(R.RES).forEach(k => { if ((st.ris.inv[k] || 0) < 999) st.ris.inv[k] = 999; });
  }
  function ricercato0() {
    const st = ST(); if (!st) return;
    st.npcs.forEach(n => { if (n.mem) n.mem = n.mem.filter(m => m.actor !== 'player'); if (n.cop) { n.alert = 0; if (n.action && /insegue|combatte/.test(n.action.name)) n.action.name = 'routine'; } n.aggro = false; });
    st.copKilled = false; st.chase = false; st.heat = 0; say('Nessuno ti cerca più');
  }

  // ---------------- gli interruttori, a ogni mezzo secondo ----------------
  const RIF = {};   // quanto avevi in tasca: con la roba infinita non cala
  setInterval(() => {
    const st = ST(); if (!st || !st.player) return; const p = st.player;
    if (OPT.soldi && p.money < 999999) p.money = 999999;
    if (OPT.dio) { p.hp = 100; p.stun = 0; if (st.me && st.me.need) Object.keys(st.me.need).forEach(k => { if (typeof st.me.need[k] === 'number' && k !== 'rabbia') st.me.need[k] = Math.min(st.me.need[k], .1); }); }
    if (OPT.pulito) ricercatoMuto(st);
    if (OPT.roba && typeof Oggetti !== 'undefined') {
      const b = Oggetti.inv(st) || {};
      Object.keys(b).forEach(id => { if ((RIF[id] || 0) < b[id]) RIF[id] = b[id]; if (b[id] < RIF[id]) b[id] = RIF[id]; });
      Object.values(p.arms || {}).forEach(a => { if (a && a.res !== undefined && a.res < 99) a.res = 99; if (a && a.mag !== undefined && a.mag < 6) a.mag = Math.max(a.mag, 6); });
      riempiScorte();
    }
  }, 500);
  function ricercatoMuto(st) { st.npcs.forEach(n => { if (n.cop && n.mem && n.mem.length) n.mem = n.mem.filter(m => m.actor !== 'player'); if (n.cop) n.alert = 0; }); }

  // ---------------- il pannello ----------------
  let el = null;
  const css = `#pvDev{position:fixed;top:96px;right:10px;width:340px;max-height:calc(100vh - 80px);overflow:auto;z-index:99999;background:rgba(14,12,20,.94);color:#eee;font:13px/1.35 system-ui,sans-serif;border:2px solid #ffd23b;border-radius:10px;padding:10px 12px;box-shadow:0 6px 24px rgba(0,0,0,.6)}
#pvDev h3{margin:10px 0 5px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#ffd23b}#pvDev h2{margin:0;font-size:15px}
#pvDev button,#pvDev select,#pvDev input{font:12px system-ui,sans-serif;margin:2px 2px 2px 0;padding:4px 7px;border-radius:6px;border:1px solid #555;background:#26222e;color:#eee;cursor:pointer}
#pvDev button:hover{background:#3a3446}#pvDev input[type=text]{width:150px;cursor:text}#pvDev label{display:block;margin:2px 0;cursor:pointer}
#pvDev .np{display:flex;align-items:center;gap:4px;border-top:1px solid #2e2a36;padding:3px 0}#pvDev .np span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#pvDev .x{float:right;background:none;border:none;font-size:16px}`;
  function btn(label, fn) { const b = document.createElement('button'); b.textContent = label; b.onclick = e => { e.stopPropagation(); try { fn(); } catch (er) { say('Errore: ' + er.message, 'bad'); console.warn(er); } }; return b; }
  function sec(t) { const h = document.createElement('h3'); h.textContent = t; el.appendChild(h); const d = document.createElement('div'); el.appendChild(d); return d; }
  function build() {
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    el = document.createElement('div'); el.id = 'pvDev'; el.hidden = true;
    el.addEventListener('keydown', e => { if (e.key !== 'F9') e.stopPropagation(); });   // scrivere nel pannello non muove il personaggio
    el.addEventListener('keyup', e => e.stopPropagation());
    const top = document.createElement('div'); top.innerHTML = '<h2>Sviluppatore <small style="opacity:.6">(F9)</small></h2>'; top.prepend(btn('✕', toggle)); top.firstChild.className = 'x'; el.appendChild(top);

    let d = sec('Interruttori');
    [['soldi', 'Soldi infiniti'], ['roba', 'Oggetti, munizioni e materiali infiniti'], ['dio', 'Invulnerabile (vita, fame, sonno)'], ['pulito', 'Le guardie non ti cercano mai']].forEach(([k, t]) => {
      const l = document.createElement('label'), c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!OPT[k]; c.onchange = () => { OPT[k] = c.checked; save(); say(t + (c.checked ? ': sì' : ': no')); };
      l.appendChild(c); l.appendChild(document.createTextNode(' ' + t)); d.appendChild(l); });
    d.appendChild(btn('Dammi tutti gli oggetti', dammiTutto)); d.appendChild(btn('+10.000 soldi', () => { ST().player.money += 10000; say('+10.000'); })); d.appendChild(btn('Azzera ricercato', ricercato0));

    d = sec('Meteo');
    [['', 'libero'], ['sereno'], ['velato'], ['coperto'], ['pioggia'], ['nebbia'], ['burrasca']].forEach(([v, t]) => d.appendChild(btn(t || v, () => meteo(v))));

    d = sec('Ora e camera');
    [[7, 'alba 7'], [12, 'mezzogiorno'], [18.5, 'sera 18:30'], [21, 'notte 21'], [2, 'notte fonda 2']].forEach(([h, t]) => d.appendChild(btn(t, () => ora(h))));
    d.appendChild(btn('+1 ora', () => piuOre(1))); d.appendChild(document.createElement('br'));
    [[.5, 'vicina'], [1, 'normale'], [2, 'lontana'], [4, 'dall\'alto']].forEach(([z, t]) => d.appendChild(btn('camera ' + t, () => zoom(z))));

    d = sec('Teletrasporto');
    const sel = document.createElement('select'); d.appendChild(sel); d.appendChild(btn('Vai', () => sel.value && vaiLuogo(sel.value)));
    const fillPlaces = () => { const P = G() ? G().PLACES : {}; sel.innerHTML = ''; Object.values(P).filter(q => q && q.name).sort((a, b) => a.name.localeCompare(b.name, 'it')).forEach(q => { const o = document.createElement('option'); o.value = q.id; o.textContent = q.name; sel.appendChild(o); }); };
    sel.onfocus = () => { if (!sel.options.length) fillPlaces(); };

    d = sec('Gente');
    const inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = 'nome o giro (es. spacciatore)'; d.appendChild(inp);
    d.appendChild(btn('Cerca', () => list())); d.appendChild(btn('Banda qui', chiamaBanda));
    const out = document.createElement('div'); d.appendChild(out);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') list(); });
    function list() {
      out.innerHTML = ''; const st = ST(); if (!st) return; const p = st.player, M = new Set(banda().map(n => n.id));
      trova(inp.value).forEach(n => { const r = document.createElement('div'); r.className = 'np'; const s2 = document.createElement('span');
        s2.textContent = (M.has(n.id) ? '★ ' : '') + npcName(n) + ' · ' + Math.round(Math.hypot(n.x - p.x, n.y - p.y)) + ' m' + (n.inside ? ' · dentro' : ''); s2.title = (n.pop && n.pop.giro) || '';
        r.appendChild(s2); r.appendChild(btn('qui', () => { portaQui(byId(n.id)); say(npcName(n) + ' è qui'); })); r.appendChild(btn('vai', () => vaiDa(byId(n.id)))); r.appendChild(btn('banda', () => { inBanda(byId(n.id)); list(); })); out.appendChild(r); });
    }
    el._list = list; el._fill = fillPlaces;
    document.body.appendChild(el);
  }
  function toggle() { if (!el) build(); el.hidden = !el.hidden; if (!el.hidden) { el._fill(); el._list(); } }
  // F9, oppure Ctrl+Maiusc+D (sui portatili F9 vuole Fn), oppure il pulsantino «DEV» in alto a destra
  addEventListener('keydown', e => { if (e.key === 'F9' || (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd'))) { e.preventDefault(); e.stopPropagation(); toggle(); } }, true);
  function fab() { if (document.getElementById('pvDevBtn')) return; const b = document.createElement('button'); b.id = 'pvDevBtn'; b.textContent = 'DEV'; b.title = 'Pannello dello sviluppatore (F9 o Ctrl+Maiusc+D)';
    b.style.cssText = 'position:fixed;top:64px;right:10px;z-index:99998;font:bold 11px system-ui,sans-serif;padding:4px 8px;border-radius:6px;border:2px solid #ffd23b;background:rgba(14,12,20,.85);color:#ffd23b;cursor:pointer';
    b.onclick = e => { e.stopPropagation(); toggle(); }; document.body.appendChild(b); }
  if (document.body) fab(); else addEventListener('DOMContentLoaded', fab);
  // dalla console: Sviluppo.vai(x, y), Sviluppo.meteo('nebbia'), Sviluppo.ora(21), Sviluppo.dammiTutto()…
  return { toggle, meteo, ora, piuOre, zoom, vai, vaiLuogo, trova, portaQui, vaiDa, inBanda, chiamaBanda, dammiTutto, riempiScorte, ricercato0, OPT };
})();
