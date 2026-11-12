/* [unico] unico_schermo.js: LO SCHERMO PULITO AL TELEFONO (dietro ?commedia; spento il flag non fa niente).
   La regola della direzione artistica: nel gioco niente copre la vista; testi, chat e avvisi stanno nel menu del personaggio.
   Solo CSS e un osservatore, nessun file del gioco toccato:
     - il pannello della banda (#rs-panel): le righe delle schede vanno a capo pulite (parola.js mette in cima «Chat della banda» e
       la griglia a tre righe del pannello schiacciava le schede sotto il contenuto); aperto il pannello, l'HUD in alto sparisce
     - al telefono: la striscia Morale/Repressione in alto a sinistra, sopra il riquadro dei soldi (non più sopra «In tasca»);
       l'obiettivo in una riga sola; gli avvisi del feed (#feed) un attimo, in una riga troncata (~3 s), e per intero nella
       scheda «Notizie» della Città (Segni.notizia, unico_segni.js), col numero sul bottone del menu.
     - L'HUD IN ALTO A SINISTRA COMPATTO (telefono e computer): una striscia di due righe corte, senza etichette:
         riga 1: ₤ in tasca · cassa (piccola) · «mer 07:22»;  riga 2: ♥ salute (barra sottile) · ⚑ morale · ⚠ repressione (pallini);
       sotto, l'obiettivo in una riga. Le righe di morale e repressione si spostano (gli stessi nodi #rs-mo/#rs-rp: risacca_ui.js li
       aggiorna per id) dal riquadro della Risacca dentro #debt. I dettagli con le etichette (in tasca, cassa comune e dove sta, conto,
       salute, giorno e ora, morale, repressione) stanno nel menu del personaggio, scheda «Chi è», nel riquadro «Soldi e banda»;
       toccando la striscia si apre lì (il portafoglio resta sul tocco della cassa). */
(function () {
  'use strict';
  if (typeof location === 'undefined' || !/[?&]commedia\b/.test(location.search) || typeof document === 'undefined') return;
  const TEL = '@media (pointer: coarse), (max-width: 720px)';
  const css = document.createElement('style'); css.id = 'unico-schermo-css'; css.textContent = [
    // il font pixel ha una legatura «fi» sbagliata ("fidare" usciva "Adare"): legature spente ovunque
    '*{font-variant-ligatures:none !important;font-feature-settings:"liga" 0,"clig" 0 !important}',
    // il pannello: colonna flessibile (qualunque numero di figli in cima), il corpo prende il resto e scorre
    '#rs-panel:not([hidden]){display:flex !important;flex-direction:column}', '#rs-panel>*{flex:none}', '#rs-panel>.body{flex:1 1 auto;min-height:0}',
    '#rs-panel nav{row-gap:0}', '#rs-panel nav button{white-space:nowrap}',
    'body:has(#rs-panel:not([hidden])) #rs-hud, body:has(#rs-panel:not([hidden])) #debt, body:has(#rs-panel:not([hidden])) #or-obj, body:has(#rs-panel:not([hidden])) #feed{visibility:hidden}',
    // il numero delle novità sullo zaino: in alto a sinistra, ciano, per non confondersi col numero rosa degli oggetti
    '#dock .us-badge{left:-6px !important;top:-6px !important;bottom:auto !important;background:#1f8fa0 !important;color:#fff !important}',
    '#rs-panel .us-nz small{opacity:.7}', '#rs-panel .us-nz.bad{color:#8a2a2a}',
    '@keyframes usToast{0%{opacity:0;transform:translateY(-4px)}8%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0;visibility:hidden}}',
    // la striscia compatta (anche al computer)
    'body.or-on #debt{display:flex !important;flex-wrap:wrap;align-items:center;gap:2px 9px;width:auto !important;max-width:min(330px,calc(100vw - 128px));padding:3px 9px 4px !important;cursor:pointer}',
    'body.or-on #debt>.lbl,body.or-on #debt #money small,body.or-on #debt>.bar,body.or-on #clock #day,body.or-on #clock #left,body.or-on #debt .row2 .lbl,body.or-on #debt .m .lbl{display:none !important}',
    'body.or-on #debt .money{font-size:15px !important;line-height:1.2;order:1}', 'body.or-on #debt .money::before{content:"₤ ";color:var(--muted);font-weight:400}',
    'body.or-on #sd-hud{order:2;font-size:0 !important;display:flex;gap:6px}', 'body.or-on #sd-hud>span:nth-child(n+2){display:none}', 'body.or-on #sd-hud small{display:none}',
    'body.or-on #sd-hud>span::before{content:"cassa ";font-size:10px;color:var(--muted)}', 'body.or-on #sd-hud b{font-size:11px;font-weight:400;color:var(--muted)}',
    'body.or-on #clock{order:3;font-size:12px !important;display:block !important;white-space:nowrap}', 'body.or-on #us-day{text-transform:lowercase}',
    'body.or-on #us-r2{order:4;flex:1 0 100%;display:flex;align-items:center;gap:9px;min-height:9px}',
    'body.or-on #us-r2 .row2{display:flex !important;align-items:center;gap:4px}', 'body.or-on #us-r2 .row2 .bar{width:64px;height:4px}',
    'body.or-on #us-r2 .row2::before,body.or-on #us-r2 .m::before{font-size:10px;line-height:1;color:var(--muted)}', 'body.or-on #us-r2 .row2::before{content:"♥";color:#d04a5a}',
    'body.or-on #us-r2 .m{display:flex !important;align-items:center;gap:4px;min-width:0 !important}', 'body.or-on #us-r2 .m:first-child::before{content:"⚑";color:var(--cyan)}', 'body.or-on #us-r2 .m:nth-child(2)::before{content:"⚠"}',
    'body.or-on #us-r2 .m .bar{width:40px;height:4px}', 'body.or-on #us-r2 .m .bar i.mo{background:linear-gradient(90deg,#2bb5d4,var(--cyan))}',
    'body.or-on #us-r2 .pips{display:flex;gap:2px}', 'body.or-on #us-r2 .pips i{width:5px;height:5px;background:#3a3150}', 'body.or-on #us-r2 .pips i.on{background:var(--blood)}',
    'body.or-on:not(.or-squadra) #us-r2 .m{display:none !important}',
    // l'obiettivo in una riga (anche al computer): la freccia senza la parola
    'body.or-on #or-obj{display:flex !important;align-items:baseline;gap:6px;white-space:nowrap;padding:3px 8px;max-width:min(360px,calc(100vw - 130px));min-height:0}',
    'body.or-on #or-obj .lb{font-size:0 !important;flex:none;gap:0}', 'body.or-on #or-obj .lb i{font-size:13px;width:14px;height:14px;line-height:14px}',
    'body.or-on #or-obj b{font-size:13px;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto}', 'body.or-on #or-obj small{font-size:11px;flex:none}',
    // il riquadro dei dettagli nel menu del personaggio
    '.us-dett .stat em{white-space:nowrap}', '.us-dett .us-rp{letter-spacing:2px;color:var(--blood)}',
    TEL + '{',
    '  body.or-on #debt{left:8px !important;top:6px !important;max-width:calc(100vw - 120px)}', '  body.or-on #rs-hud{display:none !important}',
    '  #feed{gap:0 !important}', '  #feed .fi:nth-child(n+2){display:none !important}',
    '  #feed .fi{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px !important;padding:3px 8px !important;animation:usToast 3.2s ease-out forwards !important}',
    '}'].join('\n');
  (document.head || document.documentElement).appendChild(css);
  // la striscia: le righe della Risacca e la salute in #us-r2, il giorno corto; una volta sola, quando ci sono tutti (#sd-hud di
  // soldi_ui.js si inserisce prima di .row2: si sposta solo dopo)
  const $ = id => document.getElementById(id);
  const giro = setInterval(() => {
    const d = $('debt'), r2 = d && d.querySelector('.row2'), mo = $('rs-mo'), rp = $('rs-rp'), sd = $('sd-hud'), day = $('day');
    if (!d || !r2 || !mo || !rp || !sd || !day) return;
    clearInterval(giro);
    const R = document.createElement('div'); R.id = 'us-r2'; R.appendChild(r2); R.appendChild(mo.closest('.m')); R.appendChild(rp.closest('.m')); d.appendChild(R);
    r2.title = 'Salute'; mo.closest('.m').title = 'Morale della banda'; rp.closest('.m').title = 'Repressione';
    const g = document.createElement('span'); g.id = 'us-day'; day.parentNode.insertBefore(g, day);
    const corto = () => { const t = (day.textContent || '').trim().slice(0, 3); if (g.textContent !== t + ' ') g.textContent = t + ' '; };
    corto(); new MutationObserver(corto).observe(day, { childList: true, characterData: true, subtree: true });
    // tocca la striscia (non la cassa): il menu del personaggio, coi dettagli
    d.addEventListener('click', e => { if (e.target.closest('#sd-hud') || typeof MenuUI === 'undefined' || !MenuUI.open) return; e.stopImmediatePropagation(); MenuUI.open('pg'); }, true);
  }, 300);
  // i dettagli nel menu «Chi è»: un riquadro in più accanto a «Come stai»
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const riga = (l, v, f) => `<div class="stat"><span>${esc(l)}</span><em>${esc(v)}</em>${f == null ? '' : `<i><b class="${f < .25 ? 'r' : f < .5 ? 'w' : 'g'}" style="width:${Math.round(Math.max(0, Math.min(1, f)) * 100)}%"></b></i>`}</div>`;
  function dettagli() {
    const pv = window.__pv, st = pv && pv.st, G = pv && pv.G; if (!st || !G) return '';
    const L = v => Math.floor(v || 0).toLocaleString('it-IT') + '.000';
    let v = null; try { v = typeof Soldi !== 'undefined' && Soldi.playerView ? Soldi.playerView(st) : null; } catch (e) { v = null; }
    let S = null; try { S = typeof Risacca !== 'undefined' && Risacca.summary ? Risacca.summary(st) : null; } catch (e) { S = null; }
    const p = st.player, h = [];
    h.push(riga('In tasca', L(v ? v.wallet : st.money) + ' lire'));
    if (v) { h.push(riga('Cassa comune', L(v.cassa) + (v.cassaWhere ? ' · ' + v.cassaWhere : ''))); if (v.conto) h.push(riga('Conto', v.conto.frozen ? 'congelato' : L(v.conto.bal))); }
    h.push(riga('Salute', Math.round(p.hp) + '%', p.hp / (p.maxHp || 100)));
    h.push(riga('Giorno', (G.dayName ? G.dayName(st.t) : '') + ' ' + (G.clockStr ? G.clockStr(st.t) : '')));
    if (S) { h.push(riga('Morale della banda', Math.round(S.morale) + '%', S.morale / 100)); h.push(`<div class="stat"><span>Repressione</span><em class="us-rp">${'■'.repeat(S.level || 0)}${'□'.repeat(Math.max(0, 5 - (S.level || 0)))}</em></div>`); }
    return `<h4>Soldi e banda</h4>${h.join('')}`;
  }
  setInterval(() => {
    const mu = $('mu'); if (!mu || mu.hidden || !mu.offsetParent) return;
    const cs = Array.from(mu.querySelectorAll('.mcard h4')).find(x => /^Come stai/.test(x.textContent)); if (!cs) return;
    const card = cs.parentElement; let el = card.parentElement.querySelector('.us-dett');
    if (!el) { el = document.createElement('div'); el.className = 'mcard us-dett'; card.parentElement.insertBefore(el, card); }
    const html = dettagli(); if (el.__h !== html) { el.__h = html; el.innerHTML = html; }
  }, 300);
  // il registro: ogni riga nuova di st.feed (oggetti di G.feed) passa una volta sola nelle Notizie
  const viste = new WeakSet();
  setInterval(() => {
    const pv = window.__pv, st = pv && pv.st; if (!st || !st.feed || typeof Segni === 'undefined' || !Segni.notizia) return;
    for (let i = st.feed.length - 1; i >= 0; i--) { const f = st.feed[i]; if (!f || typeof f !== 'object' || viste.has(f)) continue; viste.add(f); if (f.text) Segni.notizia(st, f.text, f.kind); }
  }, 400);
})();
