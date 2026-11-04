// Porto Vecchio — [orienta] ORIENTARSI: chi sei, cosa fare, dove andare.
// Un giocatore nuovo deve capire in mezzo minuto chi è, cosa deve fare e dove andare, e ritrovare sempre comandi e obiettivo:
//  - l'OBIETTIVO di adesso, sempre in vista (una riga nell'HUD con distanza e direzione), preso dall'Atto I della Risacca
//    (Risacca.goals) e, quando non c'è ancora un posto dove andare, da Lupo in biblioteca: G.jobTarget ripiega qui, così la freccia
//    a bordo schermo, il segnaposto sulla mappa e sulla minimappa e il diamante nel mondo ci sono da subito;
//  - le TRE SCHEDE d'avvio (chi sei, la premessa, il primo passo) mentre carica, la prima volta (poi solo la premessa);
//    il caricamento per fasi e «Premi per entrare» quando è pronto (quel tocco sblocca anche l'audio);
//  - la PAUSA vera (Esc, Start, ❚❚ sul telefono): il mondo si ferma; Riprendi, Obiettivi, Comandi, Mappa, Audio;
//  - i COMANDI da UNA tabella sola (COMANDI qui sotto): la leggono la pausa, l'aiuto (H, F1) e le schede.
// Il resto sta dove già stava: main.js (tasti, HUD, minimappa, caricamento), menu_ui.js (la scheda Obiettivi, la mappa),
// risacca_ui.js (Parla = la chat), comandi.js (il telefono), index.src.html (l'HUD).
// ?nofixorienta: tutto com'era (ON = false: niente di qui si accende e gli altri moduli tornano al codice di prima).
var Orienta = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && !/[?&]nofixorienta\b/.test(location.search);
  if (typeof document === 'undefined') return { ON: false };
  const PV = () => window.__pv, ST = () => PV() && PV().st, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const TOCCO = () => matchMedia('(pointer: coarse)').matches;
  const CONSOLE = () => !!(PV() && PV().console);
  const Gm = () => window.Game, RSm = () => window.Risacca;
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
  const VISTE = 'pv-orienta-schede';   // localStorage: le tre schede d'avvio già viste

  // =====================================================================================================================
  // LA TABELLA DEI COMANDI — UNA SOLA. La leggono «Comandi» (pausa, H, F1), le schede d'avvio e i suggerimenti.
  // k: tastiera e mouse · p: controller · t: tocco (telefono) · c: Game Boy (la console del sito).
  // >>> DA ALLINEARE AL MERGE <<< le righe con m:'camera7' descrivono i comandi a piedi che porta il blocco A (ramo camera7:
  // visuale col destro trascinato, sinistro spara e destro mira con l'arma, frecce che camminano, Maiusc corre); quelle con
  // m:'guida2' la guida del blocco E (ramo guida2: le frecce guidano). Se lì cambiano, si cambiano QUI e basta.
  // I tasti di questo blocco (E, T, Esc, H/F1, M, Start, Back) sono quelli di main.js: keydown, PAD_KEYS.
  // =====================================================================================================================
  const COMANDI = [
    { g: 'A piedi', a: 'Camminare', k: 'W A S D · frecce', p: 'levetta sinistra', t: 'levetta a sinistra', c: 'levetta', m: 'camera7' },
    { g: 'A piedi', a: 'Correre', k: 'Maiusc (tieni)', p: 'levetta a fondo', t: 'levetta a fondo', c: 'B a mani libere (tieni)', m: 'camera7' },
    { g: 'A piedi', a: 'Saltare', k: 'Spazio', p: 'A', t: 'Salta', c: 'A' },
    { g: 'A piedi', a: 'Girare la visuale', k: 'tasto destro + trascina', p: 'levetta destra', t: 'trascina un dito', c: 'levetta destra', m: 'camera7' },
    { g: 'A piedi', a: 'Zoom · le tre viste', k: 'rotella · V', p: 'croce ▲▼ · R3', t: 'due dita', c: 'tocca la levetta destra' },
    { g: 'A piedi', a: 'Andare in un punto', k: 'clic sinistro a terra (a mani libere)', p: '—', t: 'tocca a terra', c: 'tocca a terra', m: 'camera7' },
    { g: 'Azioni', a: 'Azione: parla, entra, usa', k: 'E', p: 'X', t: 'tocca il suggerimento', c: 'A (Entra)' },
    { g: 'Azioni', a: 'Parlare', k: 'T · clic sulla persona', p: 'Y', t: 'tocca la persona', c: 'tocca la persona' },
    { g: 'Azioni', a: 'Crimine: scippo, rapina', k: 'tieni E (0,8 s)', p: 'tieni X', t: 'tieni premuto il suggerimento rosso', c: 'tocca la persona → Ruba' },
    { g: 'Azioni', a: 'Salire e scendere dai mezzi', k: 'F', p: 'B', t: 'tocca il mezzo · Scendi', c: 'tocca il mezzo · A' },
    { g: 'Armi', a: 'Mirare', k: 'tasto destro (tieni)', p: 'LT (tieni)', t: '—', c: 'B con l\'arma', m: 'camera7' },
    { g: 'Armi', a: 'Sparare', k: 'clic sinistro', p: 'RT', t: 'tocca il bersaglio', c: 'B con l\'arma', m: 'camera7' },
    { g: 'Armi', a: 'Cambiare arma · ricaricare', k: 'Q · 1-5 · R', p: 'RB · LB', t: 'Arma', c: 'Zaino' },
    { g: 'Alla guida', a: 'Gas, freno, sterzo', k: 'W S · A D · frecce', p: 'RT · LT · levetta', t: 'levetta · Freno', c: 'levetta', m: 'guida2' },
    { g: 'Alla guida', a: 'Freno a mano', k: 'Spazio', p: 'A', t: 'Freno', c: 'A', m: 'guida2' },
    { g: 'Menu', a: 'Pausa', k: 'Esc', p: 'Start', t: '❚❚ in alto a destra', c: 'Zaino' },
    { g: 'Menu', a: 'Aiuto: questa tabella', k: 'H · F1', p: 'Start → Comandi', t: '❚❚ → Comandi', c: 'Zaino → Obiettivi' },
    { g: 'Menu', a: 'Mappa', k: 'M', p: 'Back', t: 'Zaino → Mappa', c: 'Zaino → Mappa' },
    { g: 'Menu', a: 'Obiettivi · zaino', k: 'I', p: 'Start → Obiettivi', t: 'Zaino · tocca l\'obiettivo', c: 'Zaino' },
    { g: 'Menu', a: 'La Risacca: squadra e basi', k: 'B', p: '—', t: 'Zaino → Obiettivi → Risacca', c: 'Zaino → Obiettivi' },
    { g: 'Menu', a: 'Taccuino: chi sa cosa', k: 'Tab', p: 'Start → Taccuino', t: 'tocca l\'ora', c: 'Zaino → Taccuino' },
    { g: 'Menu', a: 'Portafoglio', k: 'L', p: '—', t: 'tocca la cassa comune', c: 'Zaino' },
  ];
  // in che colonna guardare: il telefono non mostra tasti, il Game Boy i suoi
  const colonne = () => CONSOLE() ? [['c', 'Game Boy']] : TOCCO() ? [['t', 'Tocco']] : [['k', 'Tastiera e mouse'], ['p', 'Controller']];
  const tasto = (azione, col) => { const r = COMANDI.find(x => x.a === azione); return r ? r[col || (CONSOLE() ? 'c' : TOCCO() ? 't' : 'k')] : ''; };

  // =====================================================================================================================
  // L'OBIETTIVO DI ADESSO (Atto I della Risacca come filo della prima partita)
  // { testo (corto, per l'HUD), lungo (per la pausa e la scheda), x, y (dove andare, se c'è), chi (l'id della persona), dove }
  // =====================================================================================================================
  let cache = { clock: -1, st: null, v: null };
  function placeName(id) { const P = Gm().PLACES[id]; return P ? P.name : ''; }
  function personTarget(st, n) {   // dove sta una persona: lei se è in strada, se no il posto dove la trovi (la porta del posto)
    const G = Gm();
    if (!n.inside) return { x: n.x, y: n.y, dove: (G.nearestPlace(n.x, n.y) || {}).name || '' };
    const pid = G.placeFor ? G.placeFor(st, n) : null, P = pid && G.PLACES[pid];
    return P ? { x: P.x, y: P.y, dove: P.name } : { x: n.x, y: n.y, dove: '' };
  }
  function obiettivo(st) {
    if (!st) return null;
    if (cache.st === st && cache.clock === st.clock) return cache.v;
    let v = null;
    try { v = calcola(st); } catch (e) { v = null; }
    cache = { clock: st.clock, st, v }; return v;
  }
  function calcola(st) {
    const G = Gm(), RS = RSm();
    if (st.over) return null;
    const M = RS && st.ris && st.ris.mission && RS.missionTarget(st);
    if (M) return { testo: M.label, lungo: `Un favore per ${G.nameOf(st, st.ris.mission.giver)}: ${M.label}.`, x: M.x, y: M.y, kind: 'missione' };
    if (!RS || !st.ris) return null;
    const goals = RS.goals(st), g = goals.find(x => !x.done);
    if (!g) return { testo: 'Atto I compiuto: continua la Risacca (B)', lungo: 'L\'isola ha sentito un\'altra voce. Dai ordini alla squadra (B) e tieni alto il morale.', kind: 'fine' };
    const members = RS.members(st), lupo = G.byId(st, 'lupo');
    if (members.length < 2) {
      if (lupo && !lupo.dead && !(lupo.ris && lupo.ris.member) && !(lupo.jailedUntil > st.t)) {
        const T = personTarget(st, lupo);
        if (lupo.ris && lupo.ris.missionDone) return { testo: `Lupo si fida: chiedigli di entrare nella Risacca`, lungo: 'Hai fatto il favore a Lupo. Parlagli e chiedigli di unirsi alla Risacca.', x: T.x, y: T.y, chi: 'lupo', dove: T.dove, kind: 'recluta' };
        return { testo: `Trova Lupo${T.dove ? ' · ' + T.dove : ''} e parlagli`, lungo: `Lupo (Ettore Ganz), il bibliotecario, sa da dove cominciare. È ${T.dove ? 'a ' + T.dove : 'in giro'}: segui la freccia e parlagli (${tasto('Parlare')}). Recluta due membri della Risacca (${g.n}).`, x: T.x, y: T.y, chi: 'lupo', dove: T.dove, kind: 'recluta' };
      }
      // il secondo membro: chi è più vicino alla Risacca tra quelli che si possono reclutare
      const S = RS.summary(st), best = (S.contacts || []).filter(c => { const n = G.byId(st, c.id); return n && !n.dead && !(n.jailedUntil > st.t); }).sort((a, b) => (b.will || 0) - (a.will || 0))[0];
      if (best) { const n = G.byId(st, best.id), T = personTarget(st, n);
        return { testo: `Recluta un altro membro (${g.n}): prova con ${n.first}`, lungo: `Ti serve un altro membro della Risacca (${g.n}). ${n.first}, ${String(n.role || '').toLowerCase()}, potrebbe starci: parlagli e chiedigli una mano o di unirsi.`, x: T.x, y: T.y, chi: n.id, dove: T.dove, kind: 'recluta' }; }
      return { testo: `Recluta due membri della Risacca (${g.n})`, lungo: 'Parla con la gente: chi odia la Tutela può unirsi.', kind: 'recluta' };
    }
    if (/base/i.test(g.label)) {
      const R = st.ris, sp = Object.values(R.spaces || {}).filter(s => s.found && !s.base).sort((a, b) => Math.hypot(a.x - st.player.x, a.y - st.player.y) - Math.hypot(b.x - st.player.x, b.y - st.player.y))[0];
      if (sp) { const S0 = RS.SPACES.find(s => s.id === sp.id); return { testo: `Apri una base: ${S0 ? S0.name : 'il posto che conosci'}`, lungo: 'Un posto vuoto che conosci: vai alla porta e occupalo (E: cose da fare qui).', x: sp.x, y: sp.y, kind: 'base' }; }
      return { testo: 'Apri una base: chiedi un posto sicuro', lungo: 'Chiedi ai membri o ai contatti «Conosci un posto sicuro dove nasconderci?»: poi vai lì e occupalo.', kind: 'base' };
    }
    if (/onda/i.test(g.label)) return { testo: `Scrivi l'onda col gesso sui muri (${g.n})`, lungo: 'Col gesso in tasca, vicino a un muro: «Scrivi l\'onda» tra le cose da fare (E). Meglio se non ti vede nessuno.', kind: 'onda' };
    if (/radio/i.test(g.label)) return { testo: 'Metti in onda Radio Scirocco', lungo: 'Serve una base con la radio (modulo). Poi una trasmissione dal pannello della Risacca (B).', kind: 'radio' };
    if (/ripetitore/i.test(g.label)) { const T = RS.TARGETS && RS.TARGETS.ripetitore, P = T && RS.targetPos ? RS.targetPos(T) : null;
      return { testo: 'Sabota il ripetitore alle 20, durante il discorso', lungo: 'Il ripetitore della Tutela sta in vetta. Alle 20 parla il Garante: è il momento.', x: P ? P.x : undefined, y: P ? P.y : undefined, kind: 'sabota' }; }
    return { testo: g.label, lungo: g.label, kind: 'atto' };
  }
  // G.jobTarget ripiega sull'obiettivo: la freccia a bordo schermo, la minimappa, la mappa e il diamante nel mondo
  function installa() {
    const G = Gm(); if (!ON || !G || !G.jobTarget || G.jobTarget.__or) return;
    const jt = G.jobTarget;
    G.jobTarget = st => { const a = jt(st); if (a) return a; const o = obiettivo(st); return o && o.x !== undefined && isFinite(o.x) ? { x: o.x, y: o.y, label: o.testo, or: true } : null; };
    G.jobTarget.__or = true;
  }
  installa();

  // =====================================================================================================================
  // CSS
  // =====================================================================================================================
  const CSS = `
#or-obj { left: 12px; top: 120px; max-width: min(340px, calc(100vw - 150px)); padding: 6px 10px 7px 10px; background: rgba(13, 11, 26, .82); border-left: 3px solid var(--amber); pointer-events: auto; cursor: pointer; text-shadow: none; display: grid; gap: 1px; }
#or-obj .lb { font-family: var(--f-label); font-size: 10px; letter-spacing: .14em; color: var(--amber); display: flex; gap: 8px; align-items: center; }
#or-obj .lb i { font-style: normal; display: inline-block; width: 14px; height: 14px; line-height: 14px; text-align: center; color: #ffd24a; transform-origin: 50% 50%; }
#or-obj b { font-weight: 600; font-size: 14.5px; line-height: 1.25; color: var(--fg); }
#or-obj small { font-size: 13px; color: var(--muted); }
#or-obj:hover { border-left-color: #ffd24a; }
#app.console #or-obj { left: 50% !important; top: 6px !important; transform: translateX(-50%); max-width: 92%; padding: 3px 10px; border-left: 0; border-radius: 12px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#app.console #or-obj .lb, #app.console #or-obj small { display: none; } #app.console #or-obj b { font-size: 13px; }
/* la pausa */
#or-pausa { position: absolute; inset: 0; z-index: 40; display: grid; grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); gap: 0; background: rgba(8, 6, 16, .78); pointer-events: auto; backdrop-filter: blur(2px); color: var(--fg); font-family: var(--f-pix); }
#or-pausa[hidden] { display: none; }
#or-pausa .col { display: flex; flex-direction: column; gap: 8px; padding: max(28px, env(safe-area-inset-top)) 22px 22px; background: rgba(13, 11, 26, .9); border-right: 2px solid var(--line); overflow-y: auto; }
#or-pausa .col h2 { margin: 0 0 4px; font-size: 30px; line-height: 1; color: #ffe8f2; text-shadow: 0 0 8px var(--neon); letter-spacing: .04em; }
#or-pausa .col .ferma { font-family: var(--f-label); font-size: 10px; letter-spacing: .14em; color: var(--muted); margin-bottom: 10px; }
#or-pausa .pb { text-align: left; font: 600 18px var(--f-pix); color: var(--fg); background: transparent; border: 2px solid transparent; border-left: 4px solid var(--line); padding: 9px 12px; cursor: pointer; min-height: 44px; }
#or-pausa .pb:hover, #or-pausa .pb:focus-visible, #or-pausa .pb.on { background: rgba(255,255,255,.06); border-left-color: var(--amber); outline: none; color: #fff; }
#or-pausa .pb small { display: block; font: 400 12.5px var(--f-pix); color: var(--muted); }
#or-pausa .pb kbd { float: right; font-family: var(--f-label); font-size: 10px; color: var(--amber); margin-top: 4px; }
#or-pausa .pan { overflow-y: auto; padding: max(28px, env(safe-area-inset-top)) 28px 28px; }
#or-pausa .pan h3 { margin: 0 0 10px; font-size: 22px; } #or-pausa .pan h4 { margin: 18px 0 6px; font-family: var(--f-label); font-size: 11px; letter-spacing: .14em; color: var(--muted); font-weight: 400; }
.or-ob .now { background: rgba(255, 179, 92, .1); border-left: 4px solid var(--amber); padding: 10px 14px; font-size: 17px; line-height: 1.35; max-width: 62ch; }
.or-ob .now b { display: block; font-family: var(--f-label); font-size: 10px; letter-spacing: .14em; color: var(--amber); font-weight: 400; margin-bottom: 4px; }
.or-ob .goal { font-size: 15.5px; display: flex; gap: 10px; align-items: baseline; padding: 4px 0; } .or-ob .goal i { font-style: normal; font-family: var(--f-label); font-size: 11px; color: var(--muted); min-width: 26px; }
.or-ob .goal.done { color: var(--good); } .or-ob .goal.done i { color: var(--good); } .or-ob .goal.cur { color: #fff; font-weight: 600; } .or-ob .goal span.n { color: var(--muted); font-size: 13px; }
.or-ob .chi { font-size: 14.5px; line-height: 1.45; color: var(--muted); max-width: 64ch; } .or-ob .chi p { margin: 0 0 6px; }
.or-ob .bt { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.or-ob .bt button { font: 600 14px var(--f-pix); color: var(--fg); background: rgba(255,255,255,.05); border: 2px solid var(--line); padding: 7px 12px; cursor: pointer; min-height: 40px; } .or-ob .bt button:hover { border-color: var(--amber); }
.or-cmd { border-collapse: collapse; width: 100%; max-width: 860px; font-size: 14.5px; }
.or-cmd th { text-align: left; font-family: var(--f-label); font-size: 10px; letter-spacing: .12em; color: var(--muted); font-weight: 400; padding: 12px 8px 4px; border-bottom: 1px solid var(--line); }
.or-cmd td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,.06); vertical-align: top; } .or-cmd td:first-child { color: var(--muted); }
.or-cmd td.k { color: #fff; font-weight: 600; } .or-cmd tr.g td { font-family: var(--f-label); font-size: 10px; letter-spacing: .14em; color: var(--amber); padding-top: 14px; border-bottom: 0; }
@media (max-width: 720px) { #or-pausa { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); } #or-pausa .col { border-right: 0; border-bottom: 2px solid var(--line); padding: max(14px, env(safe-area-inset-top)) 14px 10px; flex-direction: row; flex-wrap: wrap; gap: 6px; }
  #or-pausa .col h2 { font-size: 22px; width: 100%; margin: 0; } #or-pausa .col .ferma { width: 100%; margin: 0 0 2px; } #or-pausa .pb { font-size: 15px; padding: 6px 10px; border: 2px solid var(--line); flex: 1 1 auto; } #or-pausa .pb small, #or-pausa .pb kbd { display: none; } #or-pausa .pan { padding: 14px; } }
@media (max-height: 480px) and (min-width: 600px) { #or-pausa .col { gap: 4px; padding-top: 12px; } #or-pausa .col h2 { font-size: 22px; } #or-pausa .pb { min-height: 36px; padding: 5px 10px; font-size: 15px; } #or-pausa .pb small { display: none; } #or-pausa .pan { padding-top: 14px; } }
/* il pulsante di pausa sul telefono */
#or-pbtn { right: 10px; top: 32px; width: 40px; height: 40px; border-radius: 50%; display: none; place-items: center; pointer-events: auto; cursor: pointer; font: 700 15px var(--f-pix); color: var(--fg); background: rgba(13, 11, 26, .72); border: 2px solid rgba(240,230,208,.35); }
@media (pointer: coarse) { #or-pbtn { display: grid; } }
#app.console #or-pbtn { display: none !important; }
/* tenere premuto E per un crimine: l'anello che si riempie */
#or-ring { position: absolute; left: 0; top: 0; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; pointer-events: none; z-index: 8; background: conic-gradient(var(--blood) calc(var(--h, 0) * 360deg), rgba(255,255,255,.12) 0); -webkit-mask: radial-gradient(circle, transparent 15px, #000 16px); mask: radial-gradient(circle, transparent 15px, #000 16px); }
#or-ring[hidden] { display: none; }
/* le schede d'avvio e il caricamento */
.or-load { position: fixed; inset: 0; display: grid; grid-template-rows: 1fr auto auto auto 1fr; justify-items: center; align-content: center; gap: 16px; padding: max(18px, env(safe-area-inset-top)) 16px max(34px, calc(env(safe-area-inset-bottom) + 30px)); text-align: center; background: radial-gradient(ellipse at 50% 40%, rgba(13,11,26,.55), rgba(13,11,26,.92) 75%); pointer-events: auto; overflow-y: auto; }
.or-load .tt { grid-row: 2; } .or-load .logo { font-size: clamp(36px, 8vw, 78px); text-transform: uppercase; }
.or-load .tagline { margin-top: 6px; }
.or-cards { grid-row: 3; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; max-width: 920px; width: 100%; text-align: left; }
.or-card { background: rgba(13, 11, 26, .86); border: 2px solid var(--line); border-top: 3px solid var(--amber); padding: 12px 14px; font-size: 15px; line-height: 1.4; }
.or-card b { display: block; font-family: var(--f-label); font-size: 10px; letter-spacing: .16em; color: var(--amber); font-weight: 400; margin-bottom: 6px; }
.or-card em { font-style: normal; color: #ffd24a; }
.or-cards.una { grid-template-columns: minmax(0, 560px); justify-content: center; }
.or-load .fondo { grid-row: 4; display: grid; justify-items: center; gap: 8px; width: min(520px, 92vw); }
.or-fasi { display: flex; gap: 6px 14px; flex-wrap: wrap; justify-content: center; font-family: var(--f-label); font-size: 11px; letter-spacing: .08em; color: var(--muted); }
.or-fasi span.ok { color: var(--good); } .or-fasi span.on { color: var(--fg); } .or-fasi span.ok::before { content: '✓ '; } .or-fasi span.on::before { content: '› '; }
.or-load .bar { width: 100%; height: 4px; background: rgba(255,255,255,.14); } .or-load .bar i { display: block; height: 100%; width: 3%; background: var(--amber); transition: width .5s; }
.or-go { font: 700 22px var(--f-pix); color: #1a0a14; background: var(--neon); border: 0; padding: 12px 30px; cursor: pointer; box-shadow: 4px 4px 0 #07060e; animation: orgo 1.4s ease-in-out infinite; }
.or-go[hidden] { display: none; } @keyframes orgo { 50% { box-shadow: 4px 4px 0 #07060e, 0 0 22px var(--neon); } }
.or-load .credits { grid-row: 5; align-self: end; font-size: 11px; opacity: .6; } .or-load .credits a { color: inherit; }
@media (max-width: 760px) { .or-cards { grid-template-columns: 1fr; gap: 8px; } .or-card { padding: 9px 12px; font-size: 14px; } .or-load { gap: 12px; } }
@media (max-height: 520px) { .or-load { gap: 8px; padding-top: 10px; padding-bottom: 26px; } .or-load .logo { font-size: 34px; } .or-load .tagline { display: none; } .or-card { padding: 7px 10px; font-size: 13px; line-height: 1.3; } .or-card b { margin-bottom: 2px; } .or-go { font-size: 18px; padding: 8px 22px; } }
@media (prefers-reduced-motion: reduce) { .or-go { animation: none; } }
/* [orienta] svelare piano: il cantiere dopo la prima base, i bisogni quando uno si fa sentire, la Risacca col primo membro */
body.or-on:not(.or-base) #cnBtn { display: none !important; }
body.or-on:not(.or-bisogni) #me-box { display: none !important; }
body.or-on:not(.or-squadra) #rs-hud .m, body.or-on:not(.or-squadra) #rs-sneak { display: none !important; }
body.or-on #bookBtn, body.or-on #sound { display: none !important; }   /* taccuino e audio stanno nella pausa (Tab resta) */
body.or-on #wanted:not(:has(.star.on)) { display: none !important; }   /* le stelle quando la polizia ti cerca */
body.or-on #wanted .lbl { display: inline; font: 600 13px var(--f-pix); color: var(--fg); }
/* [orienta] L'HUD SI LEGGE: le etichette tornano, un fondo scuro sotto soldi, cronaca e suggerimenti, almeno 13 px */
body.or-on #debt { background: rgba(13, 11, 26, .74); padding: 6px 10px 7px; width: 212px; text-shadow: none; gap: 2px; }
body.or-on #debt > .lbl, body.or-on #debt .row2 .lbl { display: block; font: 600 13px var(--f-pix); letter-spacing: .06em; color: var(--muted); }
body.or-on #debt .row2 { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; align-items: center; }
body.or-on #debt .money { font-size: 18px; line-height: 1.15; }
body.or-on #clock { font-size: 13.5px; display: flex; gap: 4px 8px; flex-wrap: wrap; justify-content: flex-start; }
body.or-on #sd-hud { font-size: 13px; }
body.or-on #feed { gap: 3px; width: min(330px, calc(100vw - 150px)); }
body.or-on #feed .fi { font-size: 13.5px; line-height: 1.3; background: rgba(13, 11, 26, .8); padding: 4px 9px; border-left-width: 3px; text-shadow: none; }
body.or-on #ctx { gap: 6px 8px; }
body.or-on #ctx .chip { pointer-events: auto; cursor: pointer; font: 500 14px var(--f-pix); color: var(--fg); background: rgba(13, 11, 26, .86); border: 2px solid var(--line); padding: 5px 11px; gap: 8px; box-shadow: 2px 2px 0 #07060e; text-shadow: none; min-height: 34px; touch-action: none; -webkit-user-select: none; user-select: none; }
body.or-on #ctx .chip:hover { border-color: var(--amber); } body.or-on #ctx .chip.bad { border-color: #8a2a4a; color: #ffc8d4; }
body.or-on #ctx .chip kbd { font-size: 11px; padding: 1px 6px; display: inline-block; }
body.or-on #rs-hud .lbl { font-size: 12px; } body.or-on #rs-hud button { font-size: 13px; }
body.or-on #mini { width: 128px; height: 128px; right: 12px; bottom: 12px; }
body.or-on #mini canvas { width: 128px; height: 128px; transform: none; border: 0; border-radius: 50%; opacity: 1; box-shadow: 0 0 0 2px #07060e; image-rendering: auto; background: transparent; }
body.or-on #cnBtn { right: 152px !important; bottom: 18px !important; top: auto !important; left: auto !important; }
@media (pointer: coarse) {
  body.or-on #mini { top: 80px; bottom: auto; right: 8px; transform: none; width: 96px; height: 96px; } body.or-on #mini canvas { width: 96px; height: 96px; }
  body.or-on #ctx { top: auto !important; bottom: 176px !important; max-width: calc(100vw - 24px); }
  body.or-on #ctx .chip { min-height: 44px; font-size: 15px; padding: 6px 13px; } body.or-on #ctx .chip.bad kbd { display: inline-block !important; font-family: var(--f-pix); }
  body.or-on #app kbd { display: none !important; } body.or-on #mu footer .k { display: none !important; }   /* niente tasti della tastiera sul telefono */
  body.or-on #cnBtn { right: auto !important; left: 50% !important; transform: translateX(-50%); top: auto !important; bottom: 236px !important; }
  body.or-on #debt { width: 186px; padding: 5px 8px 6px; } body.or-on #debt .money { font-size: 16px; }
  body.or-on #or-obj { max-width: calc(100vw - 130px); } body.or-on #feed { width: min(300px, calc(100vw - 130px)); }
}
@media (pointer: coarse) and (max-height: 500px) { body.or-on #ctx { bottom: auto !important; top: 40px !important; max-width: calc(100vw - 420px); } body.or-on #mini { top: 56px; } }
#app.console #ctx { display: none !important; }
`;
  // il foglio di stile e la classe sul body subito (prima del caricamento): main.js la legge per l'HUD
  if (ON) { const css = document.createElement('style'); css.textContent = CSS; (document.head || document.documentElement).appendChild(css); const on = () => document.body && document.body.classList.add('or-on'); if (document.body) on(); else addEventListener('DOMContentLoaded', on); }
  // =====================================================================================================================
  // IL CARICAMENTO: titolo, schede, fasi, «Premi per entrare»
  // =====================================================================================================================
  const FASI = [['modelli', 'Modelli', .45], ['grafica', 'Grafica', .25], ['disegno', 'Primo disegno', .2], ['quartiere', 'Quartiere', .1]];
  const F = { at: {}, cur: 'modelli', t0: 0, pronto: false, entra: null };
  function schedeHtml(prima) {
    const t = TOCCO(), con = CONSOLE();
    const parla = con || t ? 'tocca la persona' : 'premi T (o cliccala)';
    const cards = [
      ['Chi sei', 'Sei <em>Nino</em>, di Porto Vecchio. L\'isola è sotto la Tutela: i Grigi in strada, gli Orecchi che ascoltano, il Garante sugli schermi alle 20.'],
      ['La premessa', 'Hai tre gessetti in tasca e nessuno con cui usarli. <em>Trova la Risacca</em>, la resistenza: cellule, nomi di battaglia, un\'onda col gesso sui muri.'],
      ['Il primo passo', `<em>Lupo</em>, il bibliotecario, sa da dove cominciare. Segui la freccia gialla fino a lui e ${parla}. L'obiettivo resta sempre in alto a sinistra.`],
    ];
    if (!prima) return `<div class="or-cards una"><div class="or-card"><b>Porto Vecchio, sotto la Tutela</b>Hai tre gessetti in tasca e nessuno con cui usarli. <em>Trova la Risacca</em>: Lupo, in biblioteca, sa da dove cominciare.</div></div>`;
    return `<div class="or-cards">${cards.map(([h, x]) => `<div class="or-card"><b>${h}</b>${x}</div>`).join('')}</div>`;
  }
  const primaVolta = () => store.get(VISTE) !== '1';
  function introHtml(credits) {
    return `<div class="or-load" id="or-load"><div class="tt"><div class="logo">Porto Vecchio</div><div class="tagline">un'isola sotto la Tutela</div></div>
      ${schedeHtml(primaVolta())}
      <div class="fondo"><div class="or-fasi" id="or-fasi"></div><div class="bar"><i id="caricoBar" style="width:3%"></i></div><div class="lbl" id="caricoTxt" style="font-size:12px;color:var(--muted)">Carico il porto…</div>
        <button class="or-go" id="or-go" hidden>${TOCCO() || CONSOLE() ? 'Tocca per entrare' : 'Premi per entrare'}</button></div>
      <div class="credits">${credits || ''}</div></div>`;
  }
  // fase(id, frazione): a che punto è il caricamento; la barra è la somma pesata delle fasi (niente più 85% fermo)
  function fase(id, f) {
    if (!F.t0) F.t0 = performance.now();
    const i = FASI.findIndex(x => x[0] === id); if (i < 0) return;
    for (let j = 0; j < i; j++) F.at[FASI[j][0]] = 1;
    F.at[id] = Math.max(F.at[id] || 0, Math.min(1, f)); F.cur = id; disegnaFasi();
  }
  function totale() { return FASI.reduce((a, [k, , w]) => a + w * (F.at[k] || 0), 0); }
  function disegnaFasi() {
    const el = $('or-fasi'); if (el) { const h = FASI.map(([k, l]) => { const v = F.at[k] || 0, cls = v >= 1 ? 'ok' : k === F.cur ? 'on' : ''; return `<span class="${cls}">${l}${cls === 'on' && v > 0 && v < 1 ? ' ' + Math.round(v * 100) + '%' : ''}</span>`; }).join(''); if (el.__h !== h) { el.__h = h; el.innerHTML = h; } }
    const b = $('caricoBar'); if (b) b.style.width = Math.round(Math.max(.03, F.pronto ? 1 : totale()) * 100) + '%';
  }
  // pronto: il gioco risponde. entra = la funzione che fa partire la partita (main.js start)
  function pronto(entra) {
    F.pronto = true; F.entra = entra; FASI.forEach(([k]) => { F.at[k] = 1; }); disegnaFasi();
    const t = $('caricoTxt'); if (t) t.textContent = 'Pronto.';
    const b = $('or-go'); if (b) { b.hidden = false; b.onclick = e => { e.preventDefault(); entraOra(); }; try { b.focus({ preventScroll: true }); } catch (x) { } }
    const L = $('or-load'); if (L) L.addEventListener('pointerdown', e => { if (e.target.closest('a')) return; e.preventDefault(); entraOra(); });
  }
  function entraOra() { if (!F.entra) return false; const f = F.entra; F.entra = null; store.set(VISTE, '1'); f(); return true; }

  // =====================================================================================================================
  // L'HUD: la riga dell'obiettivo e il flusso della colonna di sinistra (soldi → obiettivo → cronaca)
  // =====================================================================================================================
  const H = { el: null, t: '', d: '', ang: null };
  function mount() {
    if (!ON || H.el || !$('app')) return !!H.el;
    document.body.classList.add('or-on');
    const lay = document.querySelector('#app > .layer:not(#bubbles)') || $('app');
    const o = document.createElement('div'); o.id = 'or-obj'; o.className = 'hud'; o.title = 'Obiettivi';
    o.innerHTML = '<span class="lb">Obiettivo <i id="or-oba"></i></span><b id="or-obt"></b><small id="or-obd"></small>';
    o.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); apriObiettivi(); });
    lay.appendChild(o); H.el = o;
    const pb = document.createElement('button'); pb.id = 'or-pbtn'; pb.className = 'hud'; pb.textContent = '❚❚'; pb.setAttribute('aria-label', 'Pausa');
    pb.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); pausa(true); }); lay.appendChild(pb);
    const rg = document.createElement('div'); rg.id = 'or-ring'; rg.hidden = true; $('app').appendChild(rg);
    const P = document.createElement('div'); P.id = 'or-pausa'; P.hidden = true; P.setAttribute('role', 'dialog'); P.setAttribute('aria-label', 'Pausa'); $('app').appendChild(P);
    P.addEventListener('click', onPausaClick);
    return true;
  }
  const setT = (el, t) => { if (el && el.__t !== t) { el.__t = t; el.textContent = t; } };
  function hud(st, R) {
    if (!ON || !mount() || !st) return;
    const ui = PV().ui, o = obiettivo(st), el = H.el;
    const show = !!o && !ui.intro && !ui.over;
    if (el.hidden !== !show) el.hidden = !show;
    const pb = $('or-pbtn'); if (pb && pb.hidden !== !!(ui.intro || ui.over)) pb.hidden = !!(ui.intro || ui.over);
    if (show) {
      setT($('or-obt'), o.testo);
      const p = st.player, has = o.x !== undefined && isFinite(o.x);
      const d = has ? Math.hypot(o.x - p.x, o.y - p.y) : 0;
      setT($('or-obd'), has ? (d < 4 ? 'sei arrivato' : Math.round(d) + ' m') : '');
      const a = $('or-oba');
      if (has && d >= 4 && R && R.camBasis) { const B = R.camBasis(), phi = -Math.PI / 2 - Math.atan2(B.fz, B.fx), ang = Math.atan2(o.y - p.y, o.x - p.x) + phi + Math.PI / 2, deg = Math.round(ang * 180 / Math.PI / 5) * 5;
        if (a.__d !== deg) { a.__d = deg; a.textContent = '▲'; a.style.transform = `rotate(${deg}deg)`; } }
      else if (a.__d !== null) { a.__d = null; a.textContent = ''; }
    }
    // la colonna di sinistra in fila: l'obiettivo sotto i soldi, la cronaca sotto l'obiettivo (niente più righe una sull'altra)
    if (!CONSOLE()) {
      const debt = $('debt'), feed = $('feed'), lay = el.parentElement;
      if (debt && lay) { const top0 = lay.getBoundingClientRect().top, r = debt.getBoundingClientRect(), y1 = Math.round((r.height ? r.bottom : r.top + 60) - top0 + 8);
        if (el.__y !== y1) { el.__y = y1; el.style.top = y1 + 'px'; }
        const y2 = Math.round((show ? el.getBoundingClientRect().bottom : r.bottom) - top0 + 8);
        if (feed && feed.__y !== y2) { feed.__y = y2; feed.style.top = y2 + 'px'; } }
    }
    svela(st);
  }
  // svelare piano (CSS sopra): il cantiere dopo la prima base vera, i bisogni dopo una soglia, la Risacca col primo membro
  function svela(st) {
    const B = document.body, RS = RSm();
    if (!B.classList.contains('or-base') && st.ris && st.ris.bases && st.ris.bases.length) B.classList.add('or-base');
    if (!B.classList.contains('or-bisogni') && st.me && st.me.need && Object.values(st.me.need).some(v => v > .65)) B.classList.add('or-bisogni');
    if (!B.classList.contains('or-squadra') && RS && st.ris && (RS.members(st).length || st.ris.morale > 14)) B.classList.add('or-squadra');
  }

  // =====================================================================================================================
  // GLI OBIETTIVI (la pausa e la prima scheda del menu)
  // =====================================================================================================================
  function obiettiviHtml(st) {
    const RS = RSm(), o = obiettivo(st);
    let h = `<div class="or-ob">`;
    h += `<div class="now"><b>Adesso</b>${esc(o ? o.lungo || o.testo : 'Gira per l\'isola: la gente ha qualcosa da dirti.')}</div>`;
    if (o && o.x !== undefined) h += `<div class="bt"><button data-or="vai">Vai lì</button><button data-or="mappa">Sulla mappa</button></div>`;
    if (RS && st.ris) {
      const goals = RS.goals(st), cur = goals.findIndex(g => !g.done);
      h += `<h4>${st.ris.goals.act > 1 ? 'Atto I compiuto — «Bassa marea»' : 'Atto I — «Bassa marea»'}</h4>` + goals.map((g, i) => `<div class="goal ${g.done ? 'done' : i === cur ? 'cur' : ''}"><i>${g.done ? '✓' : i === cur ? '▸' : '·'}</i><span>${esc(g.label)} ${g.n ? `<span class="n">${esc(g.n)}</span>` : ''}</span></div>`).join('');
      h += `<div class="bt"><button data-or="risacca">La Risacca: squadra e basi</button></div>`;
    }
    h += `<h4>Chi sei</h4><div class="chi"><p>Sei Nino, di Porto Vecchio. L'isola è sotto la Tutela: la Guardia Insulare («i Grigi») in strada, gli Orecchi che ascoltano, il Garante sugli schermi ogni sera alle 20.</p><p>Hai tre gessetti in tasca. La Risacca è la resistenza: trovala, fai crescere la squadra, fatti sentire senza farti prendere.</p></div>`;
    return h + `</div>`;
  }
  function comandiHtml() {
    const C = colonne(); let g = '';
    const rows = COMANDI.map(r => { const hd = r.g !== g ? (g = r.g, `<tr class="g"><td colspan="${C.length + 1}">${esc(r.g)}</td></tr>`) : ''; return hd + `<tr><td>${esc(r.a)}</td>${C.map(([k]) => `<td class="k">${esc(r[k] || '—')}</td>`).join('')}</tr>`; }).join('');
    return `<table class="or-cmd"><tr><th>Cosa</th>${C.map(([, l]) => `<th>${esc(l)}</th>`).join('')}</tr>${rows}</table>`;
  }
  function onObClick(e) {
    const b = e.target.closest('[data-or]'); if (!b) return false; const st = ST(), o = obiettivo(st), a = b.dataset.or;
    if (a === 'vai' && o && o.x !== undefined) { pausa(false); if (typeof MenuUI !== 'undefined' && MenuUI.state && MenuUI.state.open) MenuUI.close(); if (PV().goTo) PV().goTo(o.x, o.y); }
    else if (a === 'mappa') { apriMappa(); }
    else if (a === 'risacca') { pausa(false); if (typeof MenuUI !== 'undefined' && MenuUI.state && MenuUI.state.open) MenuUI.close(); if (typeof RisaccaUI !== 'undefined') RisaccaUI.togglePanel(true); }
    return true;
  }

  // =====================================================================================================================
  // LA PAUSA
  // =====================================================================================================================
  const P = { open: false, tab: 'obiettivi', daPausa: false };
  function pausa(on, tab) {
    if (!ON || !mount()) return; const pv = PV(); if (!pv || !pv.ui) return; const ui = pv.ui;
    if (on && (ui.intro || ui.over)) return;
    P.open = !!on; ui.pausa = P.open || P.daPausa; if (tab) P.tab = tab; else if (on) P.tab = 'obiettivi';
    const el = $('or-pausa'); el.hidden = !P.open;
    if (P.open) { if (pv.closeRing) pv.closeRing(); renderPausa(); const f = el.querySelector('.pb'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { } }
    else { const cv = $('cv'); if (cv) cv.focus(); }
  }
  function renderPausa() {
    const el = $('or-pausa'), st = ST(); if (!el || !st) return;
    const pv = PV(), au = pv.audio, kb = !TOCCO() && !CONSOLE();
    const b = (id, l, s, k) => `<button class="pb ${P.tab === id ? 'on' : ''}" data-p="${id}">${kb && k ? `<kbd>${k}</kbd>` : ''}${l}${s ? `<small>${s}</small>` : ''}</button>`;
    el.innerHTML = `<div class="col"><h2>Pausa</h2><div class="ferma">il mondo è fermo</div>
      ${b('riprendi', 'Riprendi', '', 'Esc')}${b('obiettivi', 'Obiettivi', 'cosa fare adesso')}${b('comandi', 'Comandi', 'tastiera, controller, tocco', 'H')}${b('mappa', 'Mappa', 'dove sei, dove andare', 'M')}${b('audio', 'Audio: ' + (au ? 'sì' : 'no'), '')}${b('taccuino', 'Taccuino', 'chi sa cosa', 'Tab')}${b('zaino', 'Zaino', 'roba, crafting, lavori', 'I')}</div>
      <div class="pan">${P.tab === 'comandi' ? `<h3>Comandi</h3>${comandiHtml()}` : `<h3>Obiettivi</h3>${obiettiviHtml(st)}`}</div>`;
  }
  function onPausaClick(e) {
    if (onObClick(e)) return;
    const b = e.target.closest('[data-p]'); if (!b) return; const k = b.dataset.p, pv = PV();
    if (k === 'riprendi') pausa(false);
    else if (k === 'obiettivi' || k === 'comandi') { P.tab = k; renderPausa(); const f = $('or-pausa').querySelector(`[data-p="${k}"]`); if (f) f.focus({ preventScroll: true }); }
    else if (k === 'mappa') apriMappa();
    else if (k === 'audio') { if (pv.sys) pv.sys('audio'); renderPausa(); const f = $('or-pausa').querySelector('[data-p="audio"]'); if (f) f.focus({ preventScroll: true }); }
    else if (k === 'taccuino') { pausa(false); if (pv.book) pv.book(true); }
    else if (k === 'zaino') { daPausa('zaino'); }
  }
  // dalla pausa al menu (mappa, zaino): il mondo resta fermo finché il menu non si chiude
  function daPausa(tab) {
    if (typeof MenuUI === 'undefined') return; const ui = PV().ui;
    P.daPausa = !!P.open; pausa(false); ui.pausa = P.daPausa; MenuUI.open(tab);
  }
  function apriMappa() { if (P.open) daPausa('mappa'); else if (typeof MenuUI !== 'undefined') { if (MenuUI.state && MenuUI.state.open && MenuUI.state.tab === 'mappa') MenuUI.close(); else MenuUI.open('mappa'); } }
  function apriObiettivi() { if (typeof MenuUI !== 'undefined') { if (MenuUI.state && MenuUI.state.open && MenuUI.state.tab === 'obiettivi') MenuUI.close(); else MenuUI.open('obiettivi'); } else pausa(true, 'obiettivi'); }
  // il menu si chiude: se era stato aperto dalla pausa, il mondo riparte
  function menuChiuso() { if (P.daPausa) { P.daPausa = false; if (PV() && PV().ui) PV().ui.pausa = P.open; } }

  // =====================================================================================================================
  // I TASTI: prima di tutti (orienta.js sta prima di main.js), per la pausa e le schede
  // =====================================================================================================================
  const typing = () => { const a = document.activeElement; return a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable); };
  if (ON) addEventListener('keydown', e => {
    const pv = PV(); if (!pv || !pv.ui) return; const ui = pv.ui, k = (e.key || '').toLowerCase();
    if (ui.intro) { if (F.entra && !e.repeat && !['shift', 'control', 'alt', 'meta', 'tab', 'f5', 'f12'].includes(k)) { e.preventDefault(); e.stopImmediatePropagation(); entraOra(); } return; }
    if (P.open) {
      e.stopImmediatePropagation(); if (k !== 'f5' && k !== 'f12') e.preventDefault(); if (e.repeat && !/arrow/.test(k)) return;
      const bs = Array.from($('or-pausa').querySelectorAll('.pb')), i = bs.indexOf(document.activeElement);
      if (k === 'escape' || k === 'f') pausa(false);
      else if (k === 'arrowdown' || k === 'arrowright' || (k === 'tab' && !e.shiftKey)) (bs[(i + 1) % bs.length] || bs[0]).focus();
      else if (k === 'arrowup' || k === 'arrowleft' || (k === 'tab' && e.shiftKey)) (bs[(i - 1 + bs.length) % bs.length] || bs[0]).focus();
      else if (k === 'enter' || k === ' ') { if (bs[i]) bs[i].click(); }
      else if (k === 'h' || k === 'f1') { P.tab = P.tab === 'comandi' ? 'obiettivi' : 'comandi'; renderPausa(); }
      else if (k === 'm') apriMappa();
      return;
    }
    if (typing() || e.repeat) return;
    if (ui.dialog || ui.book || ui.over) return;
    if (k === 'f1' || (k === 'h' && !ui.menu)) { e.preventDefault(); e.stopImmediatePropagation(); pausa(true, 'comandi'); return; }
    if (k === 'm' && typeof MenuUI !== 'undefined') { e.preventDefault(); e.stopImmediatePropagation(); if (ui.menu && MenuUI.state && MenuUI.state.tab !== 'mappa') MenuUI.open('mappa'); else apriMappa(); return; }
  }, true);

  return { ON, COMANDI, tasto, obiettivo, installa, mount, hud, obiettiviHtml, comandiHtml, onObClick, pausa, get pausaAperta() { return P.open; }, apriMappa, apriObiettivi, menuChiuso,
    introHtml, fase, pronto, entraOra, get pronta() { return !!F.entra; }, primaVolta, totale };
})();
if (typeof module !== 'undefined') module.exports = Orienta;
