
/* Porto Vecchio — La Risacca: interfaccia.
   Chat libera con i personaggi (Claude quando c'è, ripiego a parole chiave quando no), pannello della
   Risacca (squadra, basi, risorse, obiettivi), azioni sul posto, etichette e costruzioni nel mondo 3D.
   Legge e scrive solo attraverso Risacca e Game; dalla pagina usa window.__pv (stato e ui). */
var RisaccaUI = (function () {
  'use strict';
  const G = Game, RS = Risacca;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const PV = () => window.__pv;
  const ST = () => PV() && PV().st;
  const U = { chat: null, busy: false, ctl: null, panel: false, tab: 'squadra', sample: null, model: 'attesa', paused: false, pop: null, lastHere: '', notes: {}, scene: null, meshes: {}, stRef: null };

  // ---------------- STILE ----------------
  const CSS = `
#rs-pop .shoprow { align-items: flex-start; gap: 10px; border-top: 1px solid rgba(255,255,255,.08); padding-top: 6px; } #rs-pop .shoprow .it { flex: 1; } #rs-pop .shoprow .btns { display: flex; flex-direction: column; gap: 4px; } #rs-pop button[disabled] { opacity: .35; cursor: default; }
#rs-indoor { left: 50%; transform: translateX(-50%); top: 40px; padding: 4px 10px; background: rgba(16,12,28,.82); border: 1px solid #5a4a7a; font-size: 13px; color: #f4e8d0; pointer-events: none; white-space: nowrap; }
.rs-lab.door { font-size: 11px; color: #ffe0b0; background: rgba(16,12,28,.7); padding: 1px 5px; }
#rs-hud { left: 50%; transform: translateX(-50%); top: 8px; padding: 3px 8px; display: flex; gap: 10px; align-items: center; pointer-events: auto; background: rgba(16,12,28,.82) !important; border-width: 1px !important; box-shadow: none !important; white-space: nowrap; }
#rs-hud .lbl { font-size: 10px; opacity: .7; }
#rs-hud .m { display: flex !important; gap: 5px; align-items: center; min-width: 0 !important; }
#rs-hud .t { font-family: var(--f-label); font-size: 10px; letter-spacing: .12em; color: var(--cyan); text-shadow: 0 0 6px var(--cyan); }
#rs-hud .m { display: grid; gap: 2px; min-width: 92px; }
#rs-hud .bar { width: 56px; } #rs-hud .bar i.mo { background: linear-gradient(90deg, #2bb5d4, var(--cyan)); }
#rs-hud .pips { display: flex; gap: 3px; } #rs-hud .pips i { width: 7px; height: 7px; background: #3a3150; } #rs-hud .pips i.on { background: var(--blood); }
#rs-hud .cash { font-size: 17px; font-weight: 700; color: var(--amber); font-variant-numeric: tabular-nums; }
#rs-hud button { background: transparent; border: 1px solid var(--line); color: var(--fg); padding: 1px 6px; cursor: pointer; font-size: 11.5px; }
#rs-hud button:hover { border-color: var(--cyan); }
#rs-hud kbd, .rs-k { font-family: var(--f-label); font-size: 10px; color: var(--amber); }
#rs-hud #rs-sneak { font-size: 11.5px; padding: 1px 6px; }
#rs-hud .alarm { font-size: 11.5px; color: var(--blood); }
@media (max-width: 820px) { #rs-hud { top: 4px; gap: 6px; } #rs-hud .lbl, #rs-hud .t { display: none; } }
#rs-panel table { color: inherit; font: inherit; font-size: 13.5px; }
#rs-here { left: 50%; bottom: 58px; transform: translateX(-50%); display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; max-width: calc(100vw - 340px); pointer-events: auto; }
#rs-here button { font-family: var(--f-pix); font-size: 13.5px; padding: 5px 10px; background: var(--panel); color: var(--fg); border: 2px solid #1f6f7c; box-shadow: 3px 3px 0 #07060e; cursor: pointer; }
#rs-here button:hover, #rs-here button:focus-visible { border-color: var(--cyan); color: var(--cyan); outline: none; }
#rs-here button.bad { border-color: #8a2a4a; } #rs-here button.bad:hover { color: var(--neon); border-color: var(--neon); }
@media (max-width: 760px) { #rs-here { max-width: calc(100vw - 24px); bottom: 96px; } }
#rs-pop { position: absolute; left: 50%; bottom: 100px; transform: translateX(-50%); padding: 10px 12px; pointer-events: auto; display: grid; gap: 6px; min-width: 260px; width: 440px; max-height: calc(100vh - 160px); overflow: auto; max-width: calc(100vw - 24px); }
#rs-pop h4 { margin: 0; font-size: 15px; } #rs-pop .row { display: flex; justify-content: space-between; gap: 10px; align-items: center; font-size: 14px; }
#rs-pop button { background: #1d1733; border: 2px solid var(--line); color: var(--fg); padding: 3px 8px; cursor: pointer; font-family: var(--f-pix); font-size: 13px; }
#rs-pop button:hover { border-color: var(--amber); }
#rs-pop .small { font-size: 12.5px; color: var(--muted); }
.rs-lab { position: absolute; transform: translate(-50%, -100%); font-family: var(--f-pix); font-size: 12px; white-space: nowrap; pointer-events: none; text-shadow: 1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000; }
.rs-lab.base { color: var(--cyan); } .rs-lab.space { color: #c8f0ff; opacity: .85; } .rs-lab.site { color: var(--amber); } .rs-lab.lot { color: var(--muted); font-size: 11px; } .rs-lab.tg { color: var(--neon); } .rs-lab.off { color: var(--muted); } .rs-lab.mem { color: var(--cyan); font-family: var(--f-label); font-size: 10px; } .rs-lab.wave { color: #f0f0f0; font-size: 15px; opacity: .8; } .rs-lab.mural { color: #ffb35c; font-size: 12px; }
#rs-chat { right: 14px; top: 14px; bottom: 14px; width: min(400px, calc(100vw - 28px)); display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto auto; pointer-events: auto; z-index: 6; }
#rs-chat header { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 10px; padding: 10px 12px; border-bottom: 2px solid var(--line); align-items: center; }
#rs-chat canvas { width: 44px; height: 44px; image-rendering: pixelated; border: 2px solid var(--line); background: #231c38; }
#rs-chat .nm { font-size: 17px; font-weight: 600; } #rs-chat .bt { color: var(--cyan); font-size: 13px; } #rs-chat .rl { color: var(--muted); font-size: 12.5px; } #rs-chat .at { font-family: var(--f-label); font-size: 9px; color: var(--muted); }
#rs-chat .x { background: #2a2146; color: var(--fg); border: 2px solid var(--line); padding: 4px 8px; cursor: pointer; font-family: var(--f-label); font-size: 10px; }
#rs-chat .msgs { overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 7px; }
#rs-chat .msg { max-width: 86%; padding: 6px 9px; font-size: 14.5px; line-height: 1.35; border: 2px solid #1a1422; }
#rs-chat .msg.me { align-self: flex-end; background: #2a2146; color: var(--fg); border-color: var(--line); }
#rs-chat .msg.npc { align-self: flex-start; background: #f3ead6; color: #1a1422; box-shadow: 3px 3px 0 rgba(0,0,0,.4); }
#rs-chat .msg.npc small { display: block; font-family: var(--f-label); font-size: 9px; color: #6a5a7a; margin-top: 2px; }
#rs-chat .msg.wait { color: #6a5a7a; font-style: italic; }
#rs-chat .sys { align-self: stretch; font-size: 12.5px; color: var(--muted); padding: 0 4px; }
#rs-chat .sys.ok { color: var(--good); } #rs-chat .sys.bad { color: #ff9b9b; } #rs-chat .sys.rep { color: var(--cyan); }
#rs-chat .sugg { display: flex; gap: 5px; flex-wrap: wrap; padding: 6px 12px 0; }
#rs-chat .sugg button { background: none; border: 1px solid var(--line); color: var(--muted); font-family: var(--f-pix); font-size: 12.5px; padding: 3px 7px; cursor: pointer; }
#rs-chat .sugg button:hover { color: var(--fg); border-color: var(--amber); }
#rs-chat form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; padding: 8px 12px; }
#rs-chat textarea { resize: none; background: #0f0c1e; color: var(--fg); border: 2px solid var(--line); font-family: var(--f-pix); font-size: 15px; padding: 6px 8px; outline: none; }
#rs-chat textarea:focus { border-color: var(--amber); }
#rs-chat form button { background: var(--neon); color: #1a0a14; border: 0; font-family: var(--f-pix); font-weight: 700; font-size: 15px; padding: 0 12px; cursor: pointer; }
#rs-chat form button.stop { background: #3a3150; color: var(--fg); }
#rs-chat .foot { font-size: 11.5px; color: var(--muted); padding: 0 12px 8px; }
#rs-panel { inset: 5vh 4vw; pointer-events: auto; display: grid; grid-template-rows: auto auto minmax(0, 1fr); background: #efe3c8; color: #2a2030; border: 3px solid #1a1422; box-shadow: 8px 8px 0 rgba(0,0,0,.6); z-index: 5; }
#rs-panel header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px 4px; gap: 10px; flex-wrap: wrap; }
#rs-panel h2 { margin: 0; font-size: 24px; } #rs-panel h2 span { font-size: 14px; font-weight: 400; color: #6a5a6e; margin-left: 8px; }
#rs-panel .x { background: #2a2030; color: #efe3c8; border: 0; padding: 5px 10px; cursor: pointer; font-size: 14px; font-family: var(--f-pix); }
#rs-panel nav { display: flex; gap: 4px; padding: 0 16px; border-bottom: 2px solid #2a2030; flex-wrap: wrap; }
#rs-panel nav button { background: none; border: 0; border-bottom: 3px solid transparent; padding: 7px 10px; font-size: 15px; cursor: pointer; color: #6a5a6e; font-family: var(--f-pix); }
#rs-panel nav button[aria-selected="true"] { color: #2a2030; border-bottom-color: #1f8fa0; font-weight: 600; }
#rs-panel .body { overflow-y: auto; padding: 14px 16px 20px; }
#rs-panel .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 12px; }
#rs-panel .c { border: 2px solid #2a2030; background: #f7eedb; padding: 10px; display: grid; gap: 6px; align-content: start; }
#rs-panel h3 { margin: 0; font-size: 16px; } #rs-panel h3 small { font-weight: 400; color: #1f8fa0; }
#rs-panel .r { font-size: 12.5px; color: #6a5a6e; }
#rs-panel .meter { display: grid; grid-template-columns: 86px minmax(0, 1fr) 34px; gap: 6px; align-items: center; font-size: 12px; color: #6a5a6e; }
#rs-panel .meter b { height: 7px; background: #d6c9ad; position: relative; } #rs-panel .meter b i { position: absolute; inset: 0 auto 0 0; background: #1f8fa0; } #rs-panel .meter b i.warn { background: #b8792a; } #rs-panel .meter b i.bad { background: #b23a4a; }
#rs-panel .chips { display: flex; gap: 4px; flex-wrap: wrap; } #rs-panel .chip { font-family: var(--f-label); font-size: 9px; padding: 2px 5px; background: #2a2030; color: #efe3c8; } #rs-panel .chip.empty { background: #d6c9ad; color: #6a5a6e; }
#rs-panel .acts { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
#rs-panel button.b { background: #2a2030; color: #efe3c8; border: 0; padding: 4px 9px; cursor: pointer; font-family: var(--f-pix); font-size: 13px; }
#rs-panel button.b:hover { background: #1f8fa0; } #rs-panel button.b:disabled { background: #b8a88a; cursor: default; }
#rs-panel select { font-family: var(--f-pix); font-size: 13px; background: #fff8e8; border: 2px solid #2a2030; color: #2a2030; padding: 2px 4px; max-width: 100%; }
#rs-panel .res { font-size: 12.5px; } #rs-panel .res.ok { color: #2f6a45; } #rs-panel .res.bad { color: #8a2a2a; }
#rs-panel table { border-collapse: collapse; font-size: 13.5px; width: 100%; max-width: 640px; } #rs-panel td, #rs-panel th { border-bottom: 1px solid #c8b896; padding: 4px 8px; text-align: left; } #rs-panel th { font-family: var(--f-label); font-size: 10px; color: #6a5a6e; }
#rs-panel .goal { font-size: 15px; display: flex; gap: 8px; align-items: baseline; } #rs-panel .goal.done { color: #2f6a45; } #rs-panel .goal i { font-style: normal; font-family: var(--f-label); font-size: 11px; }
#rs-panel .hint { font-size: 13.5px; color: #6a5a6e; margin: 0 0 10px; max-width: 72ch; }
#rs-panel .inbox p { margin: 0 0 4px; font-size: 13.5px; }
#rs-panel h4 { margin: 14px 0 6px; font-size: 15px; }
`;

  // ---------------- COSTRUZIONE DELL'INTERFACCIA ----------------
  function build() {
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const layer = document.createElement('div'); layer.className = 'layer'; layer.id = 'rs-layer';
    layer.innerHTML = `<div class="layer" id="rs-labels"></div>
      <div class="hud card" id="rs-hud" hidden><span class="t">≋</span>
        <div class="m"><span class="lbl">Morale</span><div class="bar"><i class="mo" id="rs-mo" style="width:10%"></i></div></div>
        <div class="m"><span class="lbl">Repressione</span><div class="pips" id="rs-rp"><i></i><i></i><i></i><i></i><i></i></div></div>
        <span class="cash" id="rs-cash" hidden>0</span>
        <button id="rs-open">Risacca <kbd>B</kbd> · Chatta <kbd>C</kbd></button>
        <button id="rs-sneak">Cammina <kbd>X</kbd></button>
        <div class="alarm" id="rs-alarm" hidden></div></div>
      <div class="hud" id="rs-here"></div>
      <div class="hud" id="rs-indoor" hidden></div>
      <div class="hud card" id="rs-pop" hidden></div>
      <div class="hud card" id="rs-chat" hidden role="dialog" aria-label="Chat"></div>
      <div class="hud" id="rs-panel" hidden role="dialog" aria-label="La Risacca"></div>`;
    $('app').appendChild(layer);
    $('rs-open').onclick = () => togglePanel();
    $('rs-sneak').onclick = () => toggleSneak();
    // il riquadro del debito diventa la cassa
    const lbl = document.querySelector('#debt .lbl'); if (lbl) lbl.textContent = 'Cassa della Risacca';
    const s2 = document.createElement('style'); s2.textContent = '#debt #money small, #debt > .bar { display: none; }'; document.head.appendChild(s2);
  }

  // ---------------- PAUSA E TASTI ----------------
  function wrapStep() {
    const s0 = G.step; if (s0.__rs) return;
    G.step = function (st, dt, inp) { if (U.paused) return; return s0.call(this, st, dt, inp); }; G.step.__rs = true;
  }
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.tagName === 'SELECT'); };
  function keys() {
    addEventListener('keydown', e => {
      const ui = PV() && PV().ui; if (!ui || ui.intro || ui.over) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') { if (U.chat) { closeChat(); e.stopImmediatePropagation(); return; } if (U.pop) { closePop(); return; } if (U.panel) { togglePanel(false); e.stopImmediatePropagation(); return; } }
      if (typing() || e.repeat) return;
      if (k === 'b') { togglePanel(); e.preventDefault(); }
      else if (k === 'x') { toggleSneak(); e.preventDefault(); }
      else if (k === 'c' && !U.chat) { const st = ST(), n = G.nearestNpc(st, 4); if (n) openChat(n.id); else G.feed(st, 'Nessuno abbastanza vicino per parlare. I membri li raggiungi dal pannello (B).', 'bad'); }
    }, true);
  }

  function toggleSneak() { const st = ST(); if (!st || st.player.vehicle) return; st.player.sneak = !st.player.sneak; G.feed(st, st.player.sneak ? 'Strisci: lento, silenzioso, ti vedono solo da vicino.' : 'Cammini normalmente.', st.player.sneak ? 'good' : 'info'); }
  // ---------------- HUD ----------------
  function hud(st) {
    const S = RS.summary(st); if (!S) return;
    $('rs-hud').hidden = PV().ui.intro || PV().ui.over;
    $('rs-mo').style.width = S.morale + '%';
    $('rs-rp').querySelectorAll('i').forEach((p, i) => p.classList.toggle('on', i < S.level));
    $('rs-cash').textContent = Math.floor(st.player.money).toLocaleString('it-IT') + '.000';
    const sb = $('rs-sneak'); const sn = !!st.player.sneak && !st.player.vehicle; sb.innerHTML = (sn ? 'Strisci' : 'Cammina') + ' <kbd>X</kbd>'; sb.style.borderColor = sn ? 'var(--cyan)' : '';
    const al = S.raid ? `Perquisizione a ${S.raid.name} fra ${S.raid.mins} minuti` : '';
    $('rs-alarm').hidden = !al; $('rs-alarm').textContent = al;
    // azioni sul posto
    const ui = PV().ui, list = (ui.intro || ui.over || ui.dialog || U.chat || U.panel) ? [] : RS.here(st);
    const key = list.map(a => a.id + a.arg + a.label).join('|');
    if (key !== U.lastHere) {
      U.lastHere = key;
      $('rs-here').innerHTML = list.map((a, i) => `<button data-i="${i}" class="${a.bad ? 'bad' : ''}">${esc(a.label)}</button>`).join('');
      $('rs-here').querySelectorAll('button').forEach(b => b.onclick = () => doHere(list[+b.dataset.i]));
    }
  }
  function doHere(a) {
    const st = ST();
    if (a.id === 'negozio') return shopPop(a.arg);
    if (a.id === 'lotto') return lotPop(a.arg);
    if (a.id === 'base') { U.tab = 'basi'; U.focusBase = a.arg; return togglePanel(true); }
    const r = RS.playerAct(st, a.id, a.arg);
    if (r && r.msg) G.feed(st, r.msg, r.ok ? 'good' : 'bad');
    U.lastHere = '';
  }
  function closePop() { U.pop = null; $('rs-pop').hidden = true; $('rs-pop').innerHTML = ''; }
  // a cosa serve ogni cosa: detto chiaro nel negozio
  const USE = { viveri: 'Sfamano la squadra. Portali in una base.', carta: 'Con l\'inchiostro e una stamperia diventa volantini.', inchiostro: 'Con la carta e una stamperia diventa volantini.',
    gesso: 'Serve per scrivere l\'onda sui muri.', attrezzi: 'Per scassinare, riparare, costruire e sabotare.', materiali: 'Per costruire baracche e capanni sui lotti liberi.',
    radio: 'Per la radio clandestina e l\'antenna.', medicine: 'Curano i feriti della squadra.', documenti: 'Lasciapassare falsi: aprono i posti di blocco, si rivendono bene.',
    benzina: 'Carburante. Si rivende.', zucchero: 'Nel serbatoio di un mezzo della Tutela lo ferma.', merce: 'Contrabbando: si compra e si rivende.', volantini: 'Da distribuire in giro: alzano il morale.',
    kit: 'Per sabotare il ripetitore e i mezzi della Tutela.', vernice: 'Per i murales.', mobili: 'Arredano le basi: più comode, morale più alto.',
    fotocamera: 'Per fotografare di nascosto: le foto servono per i ricatti.', telefono: 'Per chiamare i membri della squadra da lontano.', prove: 'Foto compromettenti: servono per ricattare.' };
  function shopPop(shop) {
    const st = ST(), list = RS.SHOPS[shop], cash = Math.floor(st.player.money), have = st.ris.inv || {};
    U.pop = 'shop'; const el = $('rs-pop'); el.hidden = false;
    const item = (res, p) => {
      const R0 = RS.RES[res], n = have[res] || 0;
      const head = `<div class="it"><b>${esc(R0.name)}</b> <span class="small">${p > 0 ? 'costa' : 'ti pagano'} ${Math.abs(p)}.000 l'uno · ne hai ${n}</span><div class="small">${esc(USE[res] || '')}</div></div>`;
      const btns = p > 0
        ? `<button data-r="${res}" data-q="1" ${cash < p ? 'disabled' : ''}>Compra 1 · ${p}.000</button> <button data-r="${res}" data-q="5" ${cash < p * 5 ? 'disabled' : ''}>Compra 5 · ${p * 5}.000</button>`
        : `<button data-r="${res}" data-q="1" ${n < 1 ? 'disabled' : ''}>Vendi 1 · +${-p}.000</button> <button data-r="${res}" data-q="99" ${n < 1 ? 'disabled' : ''}>Vendi tutto · +${-p * n}.000</button>`;
      return `<div class="row shoprow">${head}<span class="btns">${btns}</span></div>`;
    };
    el.innerHTML = `<h4>${esc(G.PLACES[shop].name)}</h4><div class="small">Cassa della Risacca: <b>${cash}.000 lire</b>. Quello che compri lo porti con te: poi lo lasci in una base.</div>` +
      Object.entries(list).map(([res, p]) => item(res, p)).join('') +
      `<div class="small">Con te adesso: ${esc(invText(st.ris.inv)) || 'niente'}.</div><div class="row"><span></span><button data-close>Chiudi</button></div>`;
    el.querySelectorAll('button[data-r]').forEach(b => b.onclick = () => { const r = RS.playerAct(st, 'compra', null, { shop, res: b.dataset.r, q: +b.dataset.q }); G.feed(st, r.msg, r.ok ? 'money' : 'bad'); shopPop(shop); });
    el.querySelector('[data-close]').onclick = closePop;
  }
  function lotPop(lotId) {
    const st = ST(), lot = RS.LOTS.find(l => l.id === lotId);
    U.pop = 'lot'; const el = $('rs-pop'); el.hidden = false;
    el.innerHTML = `<h4>${esc(lot.name)}</h4><div class="small">Paghi subito soldi e materiali; poi servono ore di lavoro (tue o dei membri).</div>` +
      Object.entries(RS.STRUCTS).filter(([k]) => lot.antennaOnly ? k === 'antenna' : k !== 'antenna').map(([k, S]) => { const e = RS.canStartSite(st, lotId, k); return `<div class="row"><span>${S.name}: ${S.slots} moduli · ${S.cost}.000 + ${S.mat} materiali${S.radio ? ` + ${S.radio} parti radio` : ''} · ${S.hours} ore</span><button data-s="${k}" ${e ? `title="${esc(e)}"` : ''}>${e ? 'Manca qualcosa' : 'Apri cantiere'}</button></div>`; }).join('') +
      `<div class="small">Materiali disponibili: ${RS.totalRes(st, 'materiali')} · Cassa: ${Math.floor(st.player.money)}.000</div><div class="row"><span></span><button data-close>Chiudi</button></div>`;
    el.querySelectorAll('button[data-s]').forEach(b => b.onclick = () => { const r = RS.playerAct(st, 'lotto', lotId, { struct: b.dataset.s }); G.feed(st, r.msg, r.ok ? 'good' : 'bad'); if (r.ok) closePop(); else lotPop(lotId); });
    el.querySelector('[data-close]').onclick = closePop;
  }
  const invText = inv => Object.entries(inv || {}).map(([k, v]) => `${v} ${RS.RES[k] ? RS.RES[k].name : k}`).join(', ');

  // ---------------- CHAT ----------------
  function portrait(c, look) {
    const x = c.getContext('2d'); c.width = 12; c.height = 12; x.clearRect(0, 0, 12, 12);
    x.fillStyle = look.top || '#555'; x.fillRect(1, 9, 10, 3);
    x.fillStyle = look.skin || '#d9a47c'; x.fillRect(3, 3, 6, 6); x.fillRect(5, 8, 2, 1);
    x.fillStyle = look.hair || '#222'; x.fillRect(3, 2, 6, 2); x.fillRect(2, 3, 1, 3); x.fillRect(9, 3, 1, 3);
    if (look.hat && look.hat !== 'none') { x.fillStyle = look.hatCol || look.hair || '#333'; x.fillRect(2, 1, 8, 2); }
    x.fillStyle = '#1a1422'; x.fillRect(4, 5, 1, 1); x.fillRect(7, 5, 1, 1);
    if (/glasses|shades/.test(look.extra || '')) { x.fillStyle = /shades/.test(look.extra) ? '#111' : '#9ad'; x.fillRect(4, 5, 4, 1); }
    if (/moustache/.test(look.extra || '')) { x.fillStyle = look.hair || '#222'; x.fillRect(4, 7, 4, 1); }
  }
  function openChat(id) {
    const st = ST(), n = G.byId(st, id); if (!n || n.dead) return;
    closePop(); if (U.panel) togglePanel(false);
    U.chat = id; U.paused = true;
    const el = $('rs-chat'); el.hidden = false;
    const att = G.attitude(st, n), b = RS.battle(n), far = Math.hypot(n.x - st.player.x, n.y - st.player.y) > 5;
    el.innerHTML = `<header><canvas></canvas><div><span class="nm">${esc(n.name)}</span> ${b && n.ris && n.ris.member ? `<span class="bt">«${esc(b)}»</span>` : ''}<div class="rl">${esc(n.role)}${far ? ' · via radio' : ''}</div><div class="at" id="rs-att">${esc(att.label)}${n.ris && n.ris.member ? ' · della Risacca' : ''}</div></div><button class="x" aria-label="Chiudi">ESC</button></header>
      <div class="msgs" id="rs-msgs" aria-live="polite"></div><div class="sugg" id="rs-sugg"></div>
      <form id="rs-form"><textarea id="rs-in" rows="2" placeholder="Scrivi a ${esc(n.first)}… (Invio per mandare)" aria-label="Messaggio"></textarea><button id="rs-send" type="submit">Invia</button></form>
      <div class="foot" id="rs-foot"></div>`;
    portrait(el.querySelector('canvas'), n.look || {});
    el.querySelector('.x').onclick = closeChat;
    const inp = $('rs-in');
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('rs-form').requestSubmit(); } if (e.key === 'Escape') closeChat(); });
    inp.addEventListener('keyup', e => e.stopPropagation());
    $('rs-form').onsubmit = e => { e.preventDefault(); if (U.busy) { if (U.ctl) U.ctl.abort(); return; } const t = inp.value.trim(); if (t) { inp.value = ''; send(t); } };
    renderChat(); footer(); setTimeout(() => inp.focus(), 30);
  }
  function closeChat() {
    if (U.ctl) U.ctl.abort();
    U.chat = null; U.busy = false; U.paused = false;
    $('rs-chat').hidden = true; $('rs-chat').innerHTML = '';
    const cv = $('cv'); if (cv) cv.focus();
  }
  function suggestions(st, n) {
    const r = n.ris || {}, out = [];
    if (r.member) {
      out.push('Decidi tu cosa fare', 'Vai a lavorare 4 ore', 'Di nascosto, scrivi l\'onda in piazza', 'Seguimi', 'Vai a mangiare qualcosa', 'Pensate ai soldi', 'Basta così, riposati');
      if (st.ris.bases.some(b => b.alive && b.modules.includes('stamperia'))) out.splice(2, 0, 'Stampa volantini per 3 ore');
      if (st.ris.sites.some(s => !s.done)) out.splice(1, 0, 'Lavora al cantiere');
    } else {
      if (r.missionDone) out.push('Adesso ti fidi? Unisciti alla Risacca.');
      else out.push('Ti unisci alla Risacca?', 'Come posso aiutarti?');
      out.push('Conosci un posto sicuro dove nasconderci?', 'Cosa si dice in giro?');
    }
    return out;
  }
  function renderChat(pending) {
    const st = ST(), n = G.byId(st, U.chat); if (!n) return;
    const list = (st.ris.chats[n.id] || []).slice(-40);
    const box = $('rs-msgs');
    box.innerHTML = (list.length ? '' : `<div class="sys">${n.ris && n.ris.member ? 'Un membro della Risacca: puoi dargli ordini a parole.' : 'Parlagli come vuoi. Attento: non tutti sono dalla tua parte.'}</div>`) + list.map(m => {
      if (m.role === 'user') return `<div class="msg me">${esc(m.text)}</div>`;
      if (m.role === 'npc' && m.sys) return `<div class="sys rep">↩ ${esc(m.text)}</div>`;
      if (m.role === 'npc') return `<div class="msg npc">${esc(m.text)}${m.mood ? `<small>${esc(m.mood)}</small>` : ''}</div>`;
      return `<div class="sys ${m.ok === false ? 'bad' : m.ok ? 'ok' : ''}">${esc(m.text)}</div>`;
    }).join('') + (pending ? `<div class="msg me">${esc(pending)}</div><div class="msg npc wait" id="rs-wait">…</div>` : '');
    box.scrollTop = box.scrollHeight;
    const sg = $('rs-sugg'); sg.innerHTML = U.busy ? '' : suggestions(st, n).map(s => `<button type="button">${esc(s)}</button>`).join('');
    sg.querySelectorAll('button').forEach(b => b.onclick = () => send(b.textContent));
    const att = G.attitude(st, n); const a = $('rs-att'); if (a) a.textContent = att.label + (n.ris && n.ris.member ? ' · della Risacca' : '');
  }
  function footer(extra) {
    const f = $('rs-foot'); if (!f) return;
    const m = U.model === 'ok' || U.model === 'pronto' ? 'Risponde Claude, dentro le regole del gioco.' : U.model === 'attesa' ? 'Collego Claude…' : 'Senza Claude: risposte di ripiego a parole chiave.';
    f.textContent = (extra ? extra + ' · ' : '') + m + ' Il tempo è fermo mentre parli.';
  }
  async function send(text) {
    const st = ST(), n = G.byId(st, U.chat); if (!n || U.busy) return;
    U.busy = true; renderChat(text);
    const btn = $('rs-send'); btn.textContent = 'Ferma'; btn.classList.add('stop');
    let resp = null, raw = null, note = '';
    if (U.sample && U.model !== 'no') {
      U.ctl = new AbortController();
      try {
        const turns = RS.chatTurns(st, n, text);
        resp = await U.sample.json(turns, { modelTier: 'quick', cache: false, signal: U.ctl.signal, onText: () => { const w = $('rs-wait'); if (w) w.textContent = '…sta rispondendo'; } });
        raw = JSON.stringify(resp);
        if (U.model !== 'ok') { U.model = 'ok'; }
      } catch (e) {
        const code = e && e.code;
        if (code === 'cancelled') { U.busy = false; U.ctl = null; if (U.chat) { btn.textContent = 'Invia'; btn.classList.remove('stop'); renderChat(); } return; }
        if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) { U.model = 'no'; note = 'Claude non è disponibile qui'; }
        else note = code === 'rate_limited' ? 'Troppe richieste: risposta di ripiego' : code === 'invalid_json' ? 'Risposta illeggibile: ripiego' : 'Claude non ha risposto: ripiego';
        resp = null;
      }
      U.ctl = null;
    }
    if (!U.chat || U.chat !== n.id) { U.busy = false; return; }
    if (!resp) resp = RS.fallback(st, n, text);
    RS.applyReply(st, n, text, resp, raw);
    U.busy = false; btn.textContent = 'Invia'; btn.classList.remove('stop');
    renderChat(); footer(note);
  }

  // ---------------- PANNELLO ----------------
  function togglePanel(on) {
    U.panel = on === undefined ? !U.panel : on;
    if (U.panel && U.chat) closeChat();
    closePop();
    $('rs-panel').hidden = !U.panel;
    if (U.panel) renderPanel(); else { $('rs-panel').innerHTML = ''; const cv = $('cv'); if (cv) cv.focus(); }
  }
  const pct = v => Math.round(Math.max(0, Math.min(1, v)) * 100);
  const meter = (label, v, cls) => `<div class="meter"><span>${label}</span><b><i class="${cls || ''}" style="width:${pct(v)}%"></i></b><span>${pct(v)}%</span></div>`;
  function orderOptions(st, n) {
    const S = RS.summary(st), o = [];
    const grp = (name, items) => { if (items.length) o.push(`<optgroup label="${esc(name)}">${items.map(([lab, verb, args]) => `<option value='${esc(JSON.stringify({ verb, args }))}'>${esc(lab)}</option>`).join('')}</optgroup>`); };
    const c = RS.card(n);
    grp('Muoversi e bisogni', [['Seguimi', 'seguimi', {}], ['Aspettami qui', 'aspetta', {}], ['Basta, torna alle tue cose', 'basta', {}], ['Vai a mangiare', 'mangia', {}], ['Vai a bere qualcosa', 'bevi', {}], ['Vai a dormire', 'dormi', { ore: 6 }]].concat(S.bases.map(b => [`Nasconditi: ${b.name}`, 'nasconditi', { base: b.id }])));
    grp('Soldi', [].concat(c.mestiere ? [[`Lavora 4 ore (${G.PLACES[c.mestiere.place].name}, ${c.mestiere.pay}.000 l'ora)`, 'lavora', { ore: 4 }]] : [],
      n.id === 'beppe' ? [['Ripara motori e radio, 4 ore (12.000 l\'ora)', 'ripara', { ore: 4 }]] : [['Ripara motori e radio, 4 ore', 'ripara', { ore: 4 }]],
      [['Pesca al molo, 3 ore', 'pesca', { ore: 3 }], ['Rovista nel cantiere', 'rovista', { luogo: 'cantiere' }], ['Bisca alla sala giochi, 3 ore (notte)', 'bisca', { ore: 3 }], ['Scasso: Alimentari Wu (notte)', 'scasso', { luogo: 'wu' }], ['Scasso: Gelateria (notte)', 'scasso', { luogo: 'gelateria' }], ['Vendi lasciapassare falsi, 3 ore', 'vendi_documenti', { ore: 3 }]],
      [['Colletta in piazza, 3 ore', 'colletta', { luogo: 'piazza', ore: 3 }], ['Colletta sulla passeggiata, 3 ore', 'colletta', { luogo: 'passeggiata', ore: 3 }], ['Contrabbando al pontile, 3 ore (notte)', 'contrabbando', { ore: 3 }], ['Mercato nero in videoteca, 3 ore', 'mercato', { ore: 3 }]]));
    grp('Resistenza', [['Scrivi l\'onda: Piazza San Rocco', 'scrivi_onda', { luogo: 'piazza' }], ['Scrivi l\'onda: Calata del porto', 'scrivi_onda', { luogo: 'calata' }], ['Scrivi l\'onda: Caruggio', 'scrivi_onda', { luogo: 'caruggio' }], ['Volantina: Via al Mare', 'volantina', { luogo: 'lungomare' }], ['Volantina: Piazza San Rocco', 'volantina', { luogo: 'piazza' }], ['Diffondi una voce in piazza', 'diffondi_voce', { luogo: 'piazza', testo: 'la Risacca è viva' }], ['Murale: Calata del porto', 'dipingi', { luogo: 'calata' }], ['Murale: Passeggiata a mare', 'dipingi', { luogo: 'passeggiata' }], ['Sassi alla telecamera della piazza', 'lancia', { luogo: 'piazza' }], ['Sassi alla telecamera del lungomare', 'lancia', { luogo: 'lungomare' }]]
      .concat(Object.entries(RS.TARGETS).map(([k, t]) => [`Sabota ${t.name}`, 'sabota', { obiettivo: k }]), [['Trasmetti Radio Scirocco, 2 ore', 'trasmetti', { ore: 2 }]], st.npcs.filter(k => k.jailedUntil > st.t && k.ris && k.ris.member).map(k => [`Libera ${k.first}`, 'libera', { persona: k.id }])));
    grp('Foto, ricatti, lezioni', ['vasco', 'pardo', 'ferri', 'carla', 'zia'].map(id => [`Fotografa ${G.nameOf(st, id)}`, 'fotografa', { persona: id }]).concat(Object.keys(st.ris.photos || {}).map(id => [`Ricatta ${G.nameOf(st, id)}`, 'ricatta', { persona: id }]), [['Dai una lezione alla Zia', 'picchia', { persona: 'zia' }], ['Dai una lezione a Marta (parla troppo)', 'picchia', { persona: 'marta' }]]));
    grp('Informazioni', [['Sorveglia la caserma, 3 ore', 'sorveglia', { luogo: 'commissariato', ore: 3 }], ['Sorveglia il Miramare (Vasco), 3 ore', 'sorveglia', { luogo: 'miramare', ore: 3 }], ['Sorveglia la piazza, 3 ore', 'sorveglia', { luogo: 'piazza', ore: 3 }]].concat(S.contacts.filter(k => k.id !== n.id).map(k => [`Recluta ${k.first}${k.battle ? ` («${k.battle}»)` : ''}`, 'recluta', { persona: k.id }])));
    grp('Basi e cantieri', [].concat(
      S.bases.map(b => [`Proteggi ${b.name}`, 'proteggi', { base: b.id }]),
      S.bases.filter(b => b.modules.some(m => RS.LAB[m])).map(b => [`Produci in ${b.name}, 4 ore`, 'produci', { base: b.id, ore: 4 }]),
      S.sites.map(s => [`Lavora al cantiere: ${s.lot}, 4 ore`, 'costruisci', { lotto: RS.LOTS.find(l => l.name === s.lot).id, ore: 4 }]),
      S.spaces.filter(s => !s.base && !s.locked).map(s => [`Occupa ${s.name}`, 'occupa', { spazio: s.id }]),
      S.spaces.filter(s => s.locked).map(s => [`Scassina ${s.name}`, 'scassina', { spazio: s.id }]),
      S.bases.filter(b => b.kind !== 'buca').map(b => [`Inchioda assi: ${b.name}`, 'inchioda', { base: b.id }]),
      S.bases.filter(b => b.kind !== 'buca').map(b => [`Arreda: ${b.name}`, 'arreda', { base: b.id }]),
      [['Scava una buca in pineta', 'scava', { luogo: 'pineta' }], ['Scava una buca a Punta Scogli', 'scava', { luogo: 'punta' }]],
      [['Recupera materiali al cantiere navale', 'recupera', { luogo: 'cantiere' }], ['Recupera materiali al Magazzino Neri', 'recupera', { luogo: 'magazzino' }]]));
    grp('Telefona e convoca', S.contacts.map(k => [`Chiama ${k.first} in piazza`, 'convoca', { persona: k.id, luogo: 'piazza' }]));
    grp('Comprare (con la cassa)', [['5 carta', 'compra', { risorsa: 'carta', quanto: 5 }], ['5 inchiostro', 'compra', { risorsa: 'inchiostro', quanto: 5 }], ['5 gesso', 'compra', { risorsa: 'gesso', quanto: 5 }], ['4 viveri', 'compra', { risorsa: 'viveri', quanto: 4 }], ['2 attrezzi', 'compra', { risorsa: 'attrezzi', quanto: 2 }], ['6 materiali', 'compra', { risorsa: 'materiali', quanto: 6 }], ['2 parti radio', 'compra', { risorsa: 'radio', quanto: 2 }], ['2 medicine', 'compra', { risorsa: 'medicine', quanto: 2 }], ['4 vernice', 'compra', { risorsa: 'vernice', quanto: 4 }], ['4 mobili', 'compra', { risorsa: 'mobili', quanto: 4 }], ['Un cellulare', 'compra', { risorsa: 'telefono', quanto: 1 }], ['Una macchina fotografica', 'compra', { risorsa: 'fotocamera', quanto: 1 }]]
      .concat(Object.keys(n.ris.carry || {}).length ? [['Deposita quello che ha con sé', 'deposita', {}]] : []));
    return o.join('');
  }
  function renderPanel() {
    const st = ST(), S = RS.summary(st), el = $('rs-panel'); if (!S) return;
    const keepScroll = el.querySelector('.body') ? el.querySelector('.body').scrollTop : 0;
    const tabs = [['squadra', `Squadra (${S.members.length})`], ['basi', `Basi (${S.bases.length})`], ['risorse', 'Risorse'], ['obiettivi', S.act > 1 ? 'Atto II' : 'Atto I']];
    let body = '';
    if (U.tab === 'squadra') {
      body = `<div class="acts" style="margin-bottom:8px"><b>Linea della banda</b><select id="rs-line" aria-label="Linea">${Object.entries(RS.LINES).map(([k, l]) => `<option value="${k}" ${S.linea === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><button class="b" id="rs-meet">Riunione: organizzatevi</button>${S.mole ? `<span class="r">Talpa tra i Grigi: ${esc(S.mole)}</span>` : ''}</div>
        <p class="hint">Senza ordini i membri decidono da soli secondo carattere, bisogni e linea. Puoi comunque dare ordini da qui o in chat (anche a distanza: i membri hanno la radio). Ogni ordine passa dalla loro volontà: fiducia, lealtà, paura, rischio, stanchezza, fame.</p><div class="grid">` +
        S.members.map(m => { const n = G.byId(st, m.id); return `<div class="c" data-m="${m.id}"><h3>${esc(m.first)} ${m.battle ? `<small>«${esc(m.battle)}»</small>` : ''}</h3><div class="r">${esc(m.role)} · ${m.jailed ? '<b style="color:#8a2a2a">in cella</b>' : esc(m.where)}</div>
          ${meter('Lealtà', m.loyalty, m.loyalty < .45 ? 'bad' : '')}${meter('Stanchezza', m.fatigue, m.fatigue > .7 ? 'warn' : '')}${meter('Fame', m.fame, m.fame > .7 ? 'warn' : '')}${meter('Sete', m.sete, m.sete > .7 ? 'warn' : '')}
          <div class="r"><b>Sta facendo:</b> ${esc(m.task || 'le sue cose')}${m.auto_task ? ' <i>(di sua iniziativa)</i>' : ''}${Object.keys(m.carry).length ? ` · ha con sé ${esc(invText(m.carry))}` : ''}</div>
          <label class="r"><input type="checkbox" data-auto="${m.id}" ${m.auto ? 'checked' : ''}> Libero arbitrio: senza ordini decide da solo</label>
          <div class="acts"><button class="b" data-chat="${m.id}">Chatta</button><select data-sel="${m.id}" aria-label="Ordine per ${esc(m.first)}"><option value="">Ordine…</option>${orderOptions(st, n)}</select></div>
          <div class="acts"><label class="r"><input type="checkbox" data-sneak="${m.id}"> di nascosto</label><label class="r"><input type="checkbox" data-run="${m.id}"> di corsa</label><button class="b" data-go="${m.id}">Ordina</button></div>
          <div class="res" data-res="${m.id}">${U.notes[m.id] ? `<span class="${U.notes[m.id].ok ? 'ok' : 'bad'}">${esc(U.notes[m.id].msg)}</span>` : ''}</div></div>`; }).join('') +
        (S.members.length ? '' : '<div class="c"><h3>Nessuno, ancora</h3><div class="r">Parla con la gente (clic sul personaggio → Chatta). Lupo, in biblioteca, sa da dove cominciare.</div></div>') + '</div>' +
        `<h4>Contatti</h4><p class="hint">Chi potrebbe stare con noi. Molti prima vogliono un favore.</p><table><tr><th>Chi</th><th>Ruolo</th><th>Favore</th><th>Disposto a unirsi</th></tr>` +
        S.contacts.map(k => `<tr><td>${esc(k.first)}${k.battle ? ` «${esc(k.battle)}»` : ''}</td><td>${esc(k.role)}</td><td>${k.missionDone ? 'fatto' : RS.CARDS[k.id] && RS.CARDS[k.id].mission ? 'da fare' : '—'}</td><td>${k.will >= .2 ? 'sì' : k.will >= 0 ? 'quasi' : 'no'}</td></tr>`).join('') + '</table>';
    } else if (U.tab === 'basi') {
      body = `<p class="hint">Una base è uno spazio occupato o una struttura costruita. Più la usi, più si espone: con la Repressione alta arrivano le perquisizioni.</p><div class="grid">` +
        S.bases.map(b => { const near = Math.hypot(b.x - st.player.x, b.y - st.player.y) < 3; return `<div class="c"><h3>${esc(b.name)} <small>${b.kind === 'spazio' ? 'occupata' : 'costruita'}</small></h3>
          ${meter('Esposizione', b.expo, b.expo > .6 ? 'bad' : b.expo > .35 ? 'warn' : '')}${meter('Scorte', b.used / b.cap, '')}
          <div class="chips">${b.modules.map(m => `<span class="chip">${esc(RS.MODULES[m].name)}</span>`).join('')}${Array.from({ length: Math.max(0, b.slots - b.modules.length) }, () => '<span class="chip empty">libero</span>').join('')}</div>
          <div class="r"><b>Scorte:</b> ${esc(invText(b.stock)) || 'niente'} (${b.used}/${b.cap})${b.kind !== 'buca' ? ` · Assi ${b.barricade}/3 · Mobili ${b.comfort}/3` : ' · nascondiglio'}</div>
          <div class="acts"><select data-mod="${b.id}" aria-label="Modulo"><option value="">Allestisci…</option>${Object.entries(RS.MODULES).map(([k, M]) => `<option value="${k}" ${RS.canInstall(st, st.ris.bases.find(x => x.id === b.id), k) ? 'disabled' : ''}>${esc(M.name)} · ${M.cost}.000${M.mat ? ` + ${M.mat} mat.` : ''} · ${esc(M.desc)}</option>`).join('')}</select><button class="b" data-inst="${b.id}">Monta</button>
          ${near && Object.keys(st.ris.inv).length ? `<button class="b" data-dep="${b.id}">Deposita tutto</button>` : ''}</div>
          ${near ? `<div class="acts">${Object.entries(b.stock).map(([k, v]) => `<button class="b" data-take="${b.id}|${k}">Prendi ${esc(RS.RES[k].name)} (${v})</button>`).join('')}</div>` : '<div class="r">Vai lì per prendere o lasciare scorte.</div>'}
          <div class="res" data-bres="${b.id}">${U.notes['b' + b.id] ? `<span class="${U.notes['b' + b.id].ok ? 'ok' : 'bad'}">${esc(U.notes['b' + b.id].msg)}</span>` : ''}</div></div>`; }).join('') +
        (S.bases.length ? '' : '<div class="c"><h3>Nessuna base</h3><div class="r">Trova uno spazio vuoto (passaci accanto di notte o chiedi a chi lo conosce) oppure costruisci su un lotto libero.</div></div>') + '</div>' +
        `<h4>Cantieri</h4>${S.sites.length ? S.sites.map(s => `<div class="c" style="margin-bottom:8px"><h3>${esc(s.struct)} · ${esc(s.lot)}</h3>${meter('Lavori', s.progress / s.hours)}<div class="r">${s.progress}/${s.hours} ore. Manda qualcuno a lavorarci (Squadra → Ordine) o vai tu.</div></div>`).join('') : '<p class="hint">Nessun cantiere aperto.</p>'}` +
        `<h4>Spazi trovati</h4>${S.spaces.length ? `<table><tr><th>Spazio</th><th>Moduli</th><th>Stato</th></tr>${S.spaces.map(s => `<tr><td>${esc(s.name)}</td><td>${s.slots}</td><td>${s.base ? 'nostra base' : 'libero: vai lì o manda qualcuno a occuparlo'}</td></tr>`).join('')}</table>` : '<p class="hint">Ancora nessuno. Chiedi in giro: «conosci un posto sicuro?»</p>'}` +
        `<h4>Lotti edificabili</h4><table><tr><th>Lotto</th><th>Visibilità</th><th>Stato</th></tr>${RS.LOTS.map(l => { const used = st.ris.sites.some(s => s.lot === l.id && !s.done) ? 'cantiere aperto' : st.ris.bases.some(b => b.alive && b.ref === l.id) ? 'costruito' : 'libero'; return `<tr><td>${esc(l.name)}${l.antennaOnly ? ' (solo antenna)' : ''}</td><td>${l.stealth >= .7 ? 'nascosto' : l.stealth >= .5 ? 'medio' : 'esposto'}</td><td>${used}</td></tr>`; }).join('')}</table>`;
    } else if (U.tab === 'risorse') {
      const tot = {}; Object.keys(RS.RES).forEach(k => { tot[k] = RS.totalRes(st, k); });
      body = `<p class="hint">Quello che hai con te lo depositi in una base (Deposita tutto, sul posto). Laboratori e ordini pescano dalle scorte di tutte le basi.</p>
        <table><tr><th>Risorsa</th><th>Con te</th><th>In totale</th><th>Dove si compra</th></tr>${Object.entries(RS.RES).map(([k, R0]) => { const shops = Object.entries(RS.SHOPS).filter(([, l]) => l[k] > 0).map(([p, l]) => `${G.PLACES[p].name} ${l[k]}.000`).join(', '); return `<tr><td>${esc(R0.name)}</td><td>${st.ris.inv[k] || ''}</td><td>${tot[k] || ''}</td><td>${esc(shops || (k === 'volantini' ? 'stamperia' : k === 'documenti' ? 'falsari' : k === 'kit' ? 'officina della base' : k === 'merce' ? 'contrabbando' : '—'))}</td></tr>`; }).join('')}</table>
        <h4>Laboratori</h4><table><tr><th>Modulo</th><th>Consuma l'ora</th><th>Produce l'ora</th></tr>${Object.entries(RS.LAB).map(([k, L]) => `<tr><td>${esc(RS.MODULES[k].name)}</td><td>${esc(invText(L.in))}</td><td>${esc(invText(L.out))}</td></tr>`).join('')}<tr><td>Radio</td><td>1 parte radio ogni 3 ore</td><td>morale, Radio Scirocco</td></tr></table>`;
    } else {
      body = `<h4 style="margin-top:0">${S.act > 1 ? 'Atto I compiuto — «Bassa marea»' : 'Atto I — «Bassa marea»'}</h4>` + S.goals.map(g => `<div class="goal ${g.done ? 'done' : ''}"><i>${g.done ? '[x]' : '[ ]'}</i> ${esc(g.label)} ${g.n ? `<span class="r">${esc(g.n)}</span>` : ''}</div>`).join('') +
        (S.mission ? `<h4>Favore in corso</h4><p class="hint">${esc(S.mission.label)}</p>` : '') +
        (S.raid ? `<h4>Allarme</h4><p class="hint" style="color:#8a2a2a">Perquisizione a ${esc(S.raid.name)} fra ${S.raid.mins} minuti. Manda qualcuno a proteggerla o svuotala.</p>` : '') +
        `<h4>Morale ${S.morale}/100 · Repressione livello ${S.level}/5</h4><p class="hint">Il morale sale con scritte, volantini, trasmissioni e sabotaggi senza vittime; fa rendere le collette e convince la gente. La Repressione sale quando qualcuno vede le azioni e parla; al livello 3 cominciano le perquisizioni.</p>` +
        `<h4>Rapporti dalla squadra</h4><div class="inbox">${st.ris.inbox.slice(0, 14).map(m => `<p><b>${G.clockStr(m.t)} ${esc(RS.battle(G.byId(st, m.npc)) || G.nameOf(st, m.npc))}:</b> ${esc(m.text)}</p>`).join('') || '<p class="hint">Ancora niente.</p>'}</div>`;
    }
    el.innerHTML = `<header><h2>La Risacca <span>Cassa ${Math.floor(st.player.money)}.000 · Morale ${S.morale} · Repressione ${S.level}/5 · Con te: ${esc(invText(S.inv)) || 'niente'}</span></h2><button class="x">Chiudi · B</button></header>
      <nav role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${U.tab === k}">${esc(l)}</button>`).join('')}</nav><div class="body">${body}</div>`;
    el.querySelector('.body').scrollTop = keepScroll;
    el.querySelector('.x').onclick = () => togglePanel(false);
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { U.tab = b.dataset.tab; renderPanel(); });
    el.querySelectorAll('[data-chat]').forEach(b => b.onclick = () => { togglePanel(false); openChat(b.dataset.chat); });
    el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
      const id = b.dataset.go, sel = el.querySelector(`[data-sel="${id}"]`); if (!sel.value) return;
      const { verb, args } = JSON.parse(sel.value), n = G.byId(st, id);
      if (el.querySelector(`[data-sneak="${id}"]`).checked) args.furtivo = true; if (el.querySelector(`[data-run="${id}"]`).checked) args.corri = true;
      const r = RS.order(st, n, verb, args, { src: 'pannello' });
      U.notes[id] = { ok: r.ok, msg: r.msg || (r.ok ? 'Fatto.' : 'No.') }; renderPanel();
    });
    el.querySelectorAll('[data-auto]').forEach(c => c.onchange = () => { const r = RS.order(st, G.byId(st, c.dataset.auto), 'autonomia', { attiva: c.checked ? 'sì' : 'no' }); U.notes[c.dataset.auto] = r; renderPanel(); });
    const ls = el.querySelector('#rs-line'); if (ls) ls.onchange = () => { RS.setLine(st, ls.value); renderPanel(); };
    const mt = el.querySelector('#rs-meet'); if (mt) mt.onclick = () => { RS.setLine(st, ls.value); RS.members(st).forEach(m => { m.ris.loyalty = Math.min(1, m.ris.loyalty + .02); if (m.ris.auto && m.ris.task && m.ris.task.src === 'autonomia') m.ris.task = null; m.ris.autoAt = 0; }); G.feed(st, 'Riunione: ognuno si prende un compito secondo la linea.', 'good'); renderPanel(); };
    el.querySelectorAll('[data-inst]').forEach(b => b.onclick = () => { const id = b.dataset.inst, sel = el.querySelector(`[data-mod="${id}"]`); if (!sel.value) return; const r = RS.playerAct(st, 'allestisci', id, { mod: sel.value }); U.notes['b' + id] = r; renderPanel(); });
    el.querySelectorAll('[data-dep]').forEach(b => b.onclick = () => { const r = RS.playerAct(st, 'deposita', b.dataset.dep); U.notes['b' + b.dataset.dep] = r; renderPanel(); });
    el.querySelectorAll('[data-take]').forEach(b => b.onclick = () => { const [id, res] = b.dataset.take.split('|'); const r = RS.playerAct(st, 'preleva', id, { res, q: 99 }); U.notes['b' + id] = r; renderPanel(); });
    el.querySelectorAll('select').forEach(s => s.addEventListener('keydown', e => e.stopPropagation()));
  }

  // ---------------- ETICHETTE NEL MONDO ----------------
  function labels(st) {
    const box = $('rs-labels'), R0 = PV().R, cv = $('cv'); if (!R0 || !R0.project || !cv) return;
    const ui = PV().ui; if (ui.intro || ui.over) { box.innerHTML = ''; return; }
    const rc = cv.getBoundingClientRect(), ra = $('app').getBoundingClientRect(), p = st.player, out = [];
    // dentro: dove sei
    const ib = $('rs-indoor'); if (ib) { if (p.indoor) { const b = G.BUILDINGS[p.indoor.b], L = G.INT.layout(b), room = G.INT.roomAt(L, p.indoor.f, p.x, p.y); ib.hidden = false; ib.textContent = (b.label || b.name) + (L.floors.length > 1 ? (p.indoor.f ? ' · primo piano' : ' · piano terra') : '') + (room ? ' · ' + room.name.replace('_', ' ') : '') + ' — esci dalla porta arancione' + (L.stairs ? ', sali dal tappeto della scala' : ''); } else ib.hidden = true; }
    if (p.indoor) { box.innerHTML = ''; return; }
    const put = (x, y, h, cls, text, maxD) => { if (maxD && Math.hypot(x - p.x, y - p.y) > maxD) return; const q = R0.project(x, h, y); if (q.behind || q.x < -.05 || q.x > 1.05 || q.y < -.05 || q.y > 1.05) return; out.push(`<div class="rs-lab ${cls}" style="left:${(rc.left - ra.left + q.x * rc.width).toFixed(0)}px;top:${(rc.top - ra.top + q.y * rc.height).toFixed(0)}px">${esc(text)}</div>`); };
    st.ris.bases.forEach(b => { if (b.alive) put(b.cx || b.x, b.cy || b.y, b.cx ? 3.6 : 2.6, 'base', `≋ ${b.name}`, 60); });
    for (const [id, S] of Object.entries(st.ris.spaces)) if (S.found && !S.base) put(S.x, S.y, 2.2, 'space', `□ spazio libero`, 40);
    st.ris.sites.forEach(s => { if (s.done) return; const c = RS.lotCenter(RS.LOTS.find(l => l.id === s.lot)); put(c.x, c.y, 3, 'site', `⚒ ${Math.floor(s.progress)}/${s.hours} ore`, 60); });
    RS.LOTS.forEach(l => { if (st.ris.sites.some(s => s.lot === l.id) || st.ris.bases.some(b => b.alive && b.ref === l.id)) return; const c = RS.lotCenter(l); put(c.x, c.y, 1, 'lot', 'lotto libero', 22); });
    const tg = RS.targetPos(RS.TARGETS.ripetitore); put(tg.x, tg.y - 2, 8.6, st.t < st.ris.ripetitore.brokenUntil ? 'off' : 'tg', st.t < st.ris.ripetitore.brokenUntil ? 'ripetitore spento' : 'ripetitore della Tutela', 70);
    (st.ris.marks || []).forEach(m => put(m.x, m.y, 1.4, 'wave', '≋', 30));
    (st.ris.murals || []).forEach(m => put(m.x, m.y, 2.2, 'mural', '✺ murale', 35));
    RS.CAMS.forEach(c => { const q = RS.camPos(c), off = st.ris.cams[c.id] > st.t; put(q.x, q.y, 4.4, off ? 'off' : 'tg', off ? 'telecamera cieca' : '◉', 22); });
    st.npcs.forEach(n => { if (n.ris && n.ris.member && !n.inside && !n.dead) put(n.x, n.y, 2.75, 'mem', `≋ ${RS.battle(n) || n.first}`, 40); });
    // porte vicine: dove si entra e che posto è
    if (!p.indoor && !p.vehicle) G.BUILDINGS.forEach(b => { if (!b.door) return; const x = (b.door[0] + .5) * G.TS, y = (b.door[1] + .5) * G.TS; if (Math.hypot(x - p.x, y - p.y) < 9) put(x, y, 1.9, 'door', '▸ ' + (b.label || b.name || 'Porta'), 9); });

    box.innerHTML = out.join('');
  }

  // ---------------- COSTRUZIONI IN 3D ----------------
  const T3 = () => window.THREE;
  function mat(c, glow) { const T = T3(); return glow ? new T.MeshBasicMaterial({ color: c }) : new T.MeshLambertMaterial({ color: c }); }
  function box(w, h, d, c, glow) { const T = T3(); return new T.Mesh(new T.BoxGeometry(w, h, d), mat(c, glow)); }
  function mast() {
    const T = T3(), g = new T.Group();
    const pole = box(.25, 8, .25, '#8a8f99'); pole.position.y = 4; g.add(pole);
    for (let i = 0; i < 4; i++) { const c = box(1.2 - i * .2, .08, .08, '#6a707a'); c.position.y = 2 + i * 1.6; g.add(c); }
    const dish = new T.Mesh(new T.CylinderGeometry(.9, .5, .25, 10), mat('#cfd3da')); dish.rotation.z = Math.PI / 2.6; dish.position.set(.5, 7, 0); g.add(dish);
    const lamp = box(.25, .25, .25, '#ff3b3b', true); lamp.position.y = 8.2; lamp.name = 'lamp'; g.add(lamp);
    return g;
  }
  function hut(base) {
    const T = T3(), g = new T.Group(), lot = RS.LOTS.find(l => l.id === base.ref), w = lot.w * 2 - .3, d = lot.h * 2 - .3;
    if (base.struct === 'antenna') { const m = mast(); m.scale.set(.75, .75, .75); g.add(m); return g; }
    const h = base.struct === 'rifugio' ? 1.3 : base.struct === 'capanno' ? 3 : 2.5;
    const col = base.struct === 'rifugio' ? '#5a6b4a' : base.struct === 'capanno' ? '#8a6a4a' : '#6d7a80';
    const walls = box(w, h, d, col); walls.position.y = h / 2; g.add(walls);
    const roof = box(w + .5, .18, d + .5, base.struct === 'rifugio' ? '#4a5a3a' : '#9a3f2f'); roof.position.y = h + .1; roof.rotation.z = .08; g.add(roof);
    const door = box(.8, 1.7, .06, '#2a1d14'); door.position.set(0, .85, d / 2 + .03); g.add(door);
    const neon = box(.9, .1, .06, '#35e6ff', true); neon.position.set(0, 2.0, d / 2 + .05); g.add(neon);
    for (let i = -1; i <= 1; i++) { const wv = box(.12, .3, .06, '#35e6ff', true); wv.position.set(i * .3, 2.25, d / 2 + .05); g.add(wv); }
    return g;
  }
  function scaffold(site) {
    const T = T3(), g = new T.Group(), lot = RS.LOTS.find(l => l.id === site.lot), w = lot.w * 2 - .4, d = lot.h * 2 - .4;
    for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) { const p = box(.12, 2.8, .12, '#b8a070'); p.position.set(x, 1.4, z); g.add(p); }
    const pile = box(w * .5, .5, d * .4, '#8a6a4a'); pile.position.set(-w * .15, .25, d * .2); pile.name = 'pile'; g.add(pile);
    const wall = box(w, 1, d, '#7d888e'); wall.name = 'wall'; g.add(wall);
    return g;
  }
  function world(st) {
    const R0 = PV().R, scene = R0 && R0.__models && R0.__models.scene, T = T3(); if (!scene || !T) return;
    if (U.scene !== scene) { U.meshes = {}; U.scene = scene; }
    if (U.stRef !== st) { for (const k in U.meshes) if (k !== 'mast' && k !== 'cams') { scene.remove(U.meshes[k]); delete U.meshes[k]; } U.stRef = st; }
    const gh = (x, y) => (R0.groundH ? R0.groundH(x, y) : 0);
    if (!U.meshes.mast) { const tg = RS.targetPos(RS.TARGETS.ripetitore), m = mast(), x = tg.x, y = tg.y - 2; m.position.set(x, gh(x, y), y); scene.add(m); U.meshes.mast = m; }
    const lamp = U.meshes.mast.getObjectByName('lamp'); if (lamp) lamp.visible = st.t >= st.ris.ripetitore.brokenUntil && Math.floor(performance.now() / 600) % 2 === 0;
    if (!U.meshes.cams) {
      const grp = new T.Group();
      RS.CAMS.forEach(c => { const q = RS.camPos(c), g = new T.Group(); const pole = box(.14, 4, .14, '#5a5f68'); pole.position.y = 2; g.add(pole); const cam = box(.5, .28, .3, '#d8dce2'); cam.position.set(.2, 4, 0); cam.name = 'cam'; g.add(cam); const led = box(.08, .08, .08, '#ff2a2a', true); led.position.set(.47, 4, 0); led.name = 'led'; g.add(led); g.position.set(q.x, gh(q.x, q.y), q.y); g.userData.id = c.id; grp.add(g); });
      scene.add(grp); U.meshes.cams = grp;
    }
    U.meshes.cams.children.forEach(g => { const off = st.ris.cams[g.userData.id] > st.t; g.getObjectByName('led').visible = !off; g.getObjectByName('cam').rotation.z = off ? -.7 : 0; });
    const want = {};
    st.ris.bases.forEach(b => { if (b.alive && b.kind === 'costruito') want['b' + b.id] = b; });
    st.ris.sites.forEach(s => { if (!s.done) want['s' + s.id] = s; });
    for (const k in U.meshes) if (k !== 'mast' && k !== 'cams' && !want[k]) { scene.remove(U.meshes[k]); delete U.meshes[k]; }
    for (const [k, o] of Object.entries(want)) {
      let m = U.meshes[k];
      const lot = RS.LOTS.find(l => l.id === (o.ref || o.lot)), c = RS.lotCenter(lot);
      if (!m) { m = k[0] === 'b' ? hut(o) : scaffold(o); m.position.set(c.x, gh(c.x, c.y), c.y); scene.add(m); U.meshes[k] = m; }
      if (k[0] === 's') { const f = Math.max(.05, Math.min(1, o.progress / o.hours)), w = m.getObjectByName('wall'); w.scale.y = f * 2.4; w.position.y = f * 1.2; }
    }
  }

  // ---------------- CICLO ----------------
  let lastHud = 0, lastPanel = 0;
  function loop(t) {
    try {
      const st = ST();
      if (st && st.ris) {
        if (t - lastHud > 120) { lastHud = t; hud(st); if (U.chat) { const n = G.byId(st, U.chat); if (!n || n.dead) closeChat(); } }
        if (U.panel && t - lastPanel > 1000 && !typing()) {
          lastPanel = t; const sig = JSON.stringify(RS.summary(st)) + U.tab;
          const busySel = [...document.querySelectorAll('#rs-panel select')].some(x => x.value);
          if (sig !== U.panelSig && !busySel) { U.panelSig = sig; renderPanel(); }
        }
        labels(st); world(st);
        // un ordine finito arriva anche nella chat aperta
        if (U.chat && !U.busy) { const ch = st.ris.chats[U.chat]; const len = ch ? ch.length : 0; if (len !== U.chatLen) { U.chatLen = len; renderChat(); } }
      }
    } catch (e) { if (!U.errLogged) { U.errLogged = true; console.error('[Risacca UI]', e); } }
    requestAnimationFrame(loop);
  }
  function ringOptions(n, close) {
    return [{ label: 'Chatta', run: () => { close(); openChat(n.id); } }];
  }
  async function connect() {
    try {
      if (!window.claude || !window.claude.use) { U.model = 'no'; return; }
      const s = await window.claude.use('sample');
      U.sample = s; U.model = s ? 'pronto' : 'no';
    } catch (e) { U.model = 'no'; }
    footer();
  }
  function init() {
    if (!window.__pv || !$('app')) { setTimeout(init, 100); return; }
    build(); wrapStep(); keys(); connect();
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
  return { openChat, closeChat, togglePanel, ringOptions, state: U, send, renderPanel };
})();
