/* Porto Vecchio — la tavoletta dei graffiti, il pannello (v7, [tavola2]).
   Rifatto da capo per il telefono: prima era un muro di pulsanti, menu a tendina e cursori, il riquadro dove si disegna restava
   piccolo e cambiare bomboletta ricolorava tutto il disegno. Ora:
   - LA TELA È TUTTO. Il riquadro giallo riempie lo schermo (il contesto della foto attorno si vede scurito ai bordi); due dita
     spostano e ingrandiscono (la rotella sul computer), un dito spruzza. Niente scorrimento della pagina (touch-action: none).
   - UNA BARRA SOLA, A ICONE. In verticale in basso, in orizzontale (e sul computer) sul lato destro. Esci, annulla, LA
     BOMBOLETTA GRANDE (del colore e col tappo di adesso: toccala per il tappo e lo spessore), otto barattoli di colore e «+»
     per gli altri, «⋯» per il resto (la misura del riquadro, il flusso, le colature, pulisci), la spunta che salva.
   - OGNI TRATTO HA LA SUA BOMBOLETTA: colore, tappo e spessore restano sul tratto (rec.st, pennelli.js drawStrokes); si sceglie
     una bomboletta, si spruzza, si cambia, si spruzza. L'ultima scelta resta anche alla prossima apertura.
   - LEGGERA: una manciata di nodi, le icone SVG in linea, lo stile una volta sola. Il tratto in corso si disegna su una tela
     sopra (alla risoluzione dello schermo × devicePixelRatio, una volta per fotogramma con tutti i punti raccolti, anche quelli
     coalescenti); la resa vera del pennello si aggiunge solo al tratto finito (non si ridisegna tutto a ogni tratto); la vista
     si sposta con transform (niente layout), le misure dello schermo arrivano dal ResizeObserver.
   writing.js (tavPad) dà la foto, il riquadro e le regole (la vernice, il salvataggio, la misura che rifà la foto); qui c'è
   solo il pannello. TavolaUI.open(ctl) ritorna l'api che usano i tasti del Game Boy (main.js conMap): apply, close, undo,
   col(±1), size(±1). */
var TavolaUI = (function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot;
  // i colori oltre gli otto della fila: anni '80, la strada, i fluo e il cromo
  const PIU = [['#ff4fa3', 'rosa fluo'], ['#35e6ff', 'ciano'], ['#7a3ac8', 'viola'], ['#9ad83a', 'lime'], ['#ffe94a', 'giallo fluo'], ['#ff6a2a', 'arancio fluo'],
    ['#b8bcc4', 'cromo'], ['#c8a040', 'oro'], ['#7ab8e8', 'azzurro'], ['#1a5a3a', 'verde scuro'], ['#7a1e22', 'bordeaux'], ['#6a4a2a', 'marrone'],
    ['#6e6a72', 'grigio'], ['#f0b8a0', 'pesca'], ['#1a8a8a', 'petrolio'], ['#2a2a6a', 'blu notte']];
  // i tappi (pennelli.js PENNELLI): lo spessore di partenza, il massimo, chi consuma
  const TAPPI = { spray: { n: 'cap standard', b: 'standard', cm: 4, max: 30 }, fat: { n: 'fat cap', b: 'fat', cm: 8, max: 30 }, skinny: { n: 'skinny cap', b: 'skinny', cm: 2, max: 12 }, roller: { n: 'rullo', b: 'rullo', cm: 20, max: 60 }, marker: { n: 'pennarello', b: 'marker', cm: 2.5, max: 12 } };
  const ATTR = k => TAPPI[k] || TAPPI.spray;
  // l'ultima bomboletta scelta: resta per la prossima volta (anche dopo un ricarico, se il browser lo permette)
  const MEM = { col: null, pen: null, cm: {}, gesti: false };
  try { const m = JSON.parse(localStorage.getItem('pv_tavola') || 'null'); if (m && typeof m === 'object') Object.assign(MEM, m); } catch (e) { }
  const ricorda = () => { try { localStorage.setItem('pv_tavola', JSON.stringify(MEM)); } catch (e) { } };

  // ---------------- le icone (SVG in linea, 24 × 24, tratto spesso: si leggono anche piccole) ----------------
  const S = (d, vb) => `<svg viewBox="${vb || '0 0 24 24'}" aria-hidden="true">${d}</svg>`;
  const L = 'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
  const IC = {
    esci: S(`<path ${L} d="M6 6l12 12M18 6L6 18"/>`),
    annulla: S(`<path ${L} d="M9 5L4 10l5 5"/><path ${L} d="M4 10h10a6 6 0 0 1 0 12h-4"/>`),
    ok: S(`<path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.5l5 5L19.5 6.5"/>`),
    altro: S('<circle cx="5" cy="12" r="2.4" fill="currentColor"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><circle cx="19" cy="12" r="2.4" fill="currentColor"/>'),
    piu: S(`<path ${L} d="M12 5v14M5 12h14"/>`),
    adatta: S(`<path ${L} d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>`),
    cestino: S(`<path ${L} d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>`),
    flusso: S('<circle cx="12" cy="12" r="3.2" fill="currentColor"/><g fill="currentColor"><circle cx="5" cy="9" r="1.2"/><circle cx="7" cy="16" r="1.4"/><circle cx="18" cy="7" r="1.3"/><circle cx="19.5" cy="14" r="1.1"/><circle cx="13" cy="19.5" r="1.2"/><circle cx="11" cy="4.5" r="1"/></g>'),
    colature: S('<path fill="currentColor" d="M3 4h18v3c0 1-1 1.5-1.6 1.5-.7 0-1.2.6-1.2 1.3v7a1.7 1.7 0 0 1-3.4 0V10c0-.9-.6-1.5-1.3-1.5s-1.3.6-1.3 1.5v3.5a1.6 1.6 0 0 1-3.2 0V10c0-.9-.5-1.5-1.2-1.5S6.6 9.1 6.6 10v4.5a1.6 1.6 0 0 1-3.2 0V8c0-.5-.4-1-.4-1z"/>'),
    gira: S(`<rect ${L} x="7" y="3" width="10" height="18" rx="2" transform="rotate(-90 12 12)"/><path ${L} d="M5 6a8 8 0 0 1 6-3M9 1.5L11 3 9 4.5"/>`),
  };
  // un barattolo (la fila dei colori): il tappo, la spalla, il corpo del colore, il riflesso
  const barattolo = (col, w, h) => `<svg viewBox="0 0 24 34" width="${w}" height="${h}" aria-hidden="true"><rect x="9" y="1.5" width="6" height="4" rx="1" fill="#f0e6d0" stroke="#0d0b1a" stroke-width="1.5"/><path d="M6 10.5c0-3 2.5-4.5 6-4.5s6 1.5 6 4.5z" fill="#d8d0c0" stroke="#0d0b1a" stroke-width="1.5"/><rect x="5" y="10" width="14" height="22" rx="2.5" fill="${col}" stroke="#0d0b1a" stroke-width="2"/><rect x="8" y="13.5" width="2.4" height="14" rx="1.2" fill="#fff" opacity=".45"/></svg>`;
  // la bomboletta grande: il corpo del colore, il beccuccio del tappo scelto (largo il fat, sottile lo skinny); il rullo e il pennarello hanno la loro forma
  function grande(col, pen) {
    if (pen === 'roller') return `<svg viewBox="0 0 34 44" aria-hidden="true"><rect x="3" y="4" width="28" height="11" rx="3" fill="${col}" stroke="#0d0b1a" stroke-width="2.2"/><path d="M31 9.5h1.5v8H17v6" fill="none" stroke="#0d0b1a" stroke-width="2.4"/><rect x="14" y="23" width="6" height="18" rx="2" fill="#f0e6d0" stroke="#0d0b1a" stroke-width="2"/><rect x="6" y="6.5" width="14" height="2.4" rx="1.2" fill="#fff" opacity=".45"/></svg>`;
    if (pen === 'marker') return `<svg viewBox="0 0 34 44" aria-hidden="true"><path d="M13 2h8l1.5 7h-11z" fill="${col}" stroke="#0d0b1a" stroke-width="2"/><rect x="9" y="9" width="16" height="32" rx="3" fill="#f0e6d0" stroke="#0d0b1a" stroke-width="2.2"/><rect x="9" y="17" width="16" height="10" fill="${col}" stroke="#0d0b1a" stroke-width="2"/></svg>`;
    const nz = pen === 'fat' ? '<rect x="11" y="1.5" width="12" height="5" rx="1.5" fill="#f0e6d0" stroke="#0d0b1a" stroke-width="1.8"/>' : pen === 'skinny' ? '<rect x="15" y=".8" width="4" height="6.5" rx="1" fill="#f0e6d0" stroke="#0d0b1a" stroke-width="1.8"/>' : '<rect x="13.5" y="1.5" width="7" height="5" rx="1.2" fill="#f0e6d0" stroke="#0d0b1a" stroke-width="1.8"/>';
    return `<svg viewBox="0 0 34 44" aria-hidden="true">${nz}<path d="M8 13c0-4 4-6 9-6s9 2 9 6z" fill="#d8d0c0" stroke="#0d0b1a" stroke-width="2"/><rect x="7" y="12.5" width="20" height="30" rx="3.5" fill="${col}" stroke="#0d0b1a" stroke-width="2.4"/><rect x="11" y="17" width="3" height="20" rx="1.5" fill="#fff" opacity=".45"/></svg>`;
  }
  // il getto di ogni tappo (il vassoio dei tappi)
  function getto(pen) {
    if (pen === 'roller' || pen === 'marker') return grande('currentColor', pen).replace(/fill="#f0e6d0"/g, 'fill="none"').replace(/stroke="#0d0b1a"/g, 'stroke="currentColor"').replace(/fill="#fff" opacity=".45"/g, 'fill="none"').replace(/fill="currentColor"/g, 'fill="currentColor" fill-opacity=".35"');
    const r = pen === 'fat' ? 9 : pen === 'skinny' ? 3 : 6, sp = pen === 'fat' ? 11 : pen === 'skinny' ? 5.5 : 9;
    let dots = ''; for (let i = 0; i < 9; i++) { const a = i * 2.4, d = r + 1.6 + (i % 3) * (sp - r) / 3; dots += `<circle cx="${(12 + Math.cos(a) * d).toFixed(1)}" cy="${(12 + Math.sin(a) * d).toFixed(1)}" r="${pen === 'fat' ? 1.1 : .8}" fill="currentColor"/>`; }
    return S(`<circle cx="12" cy="12" r="${r}" fill="currentColor"/>${dots}`);
  }
  // la misura del riquadro (tag, throw-up, pezzo, burner): un rettangolo sempre più largo
  const misura = (i) => { const w = [8, 12, 17, 22][i], h = [5, 7, 9, 10][i]; return S(`<rect x="${12 - w / 2}" y="${12 - h / 2}" width="${w}" height="${h}" rx="1" fill="none" stroke="currentColor" stroke-width="2.2"/>`); };

  // ---------------- lo stile, una volta sola ----------------
  const CSS = `
.tv{position:fixed;inset:0;z-index:100000;display:grid;grid-template-rows:minmax(0,1fr) auto;grid-template-columns:100%;background:#07060e;color:#f0e6d0;font:15px var(--f-pix,"Pixelify Sans",system-ui,sans-serif);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;overscroll-behavior:none;-webkit-tap-highlight-color:transparent}
.tv *{box-sizing:border-box}
.tv svg{display:block;width:100%;height:100%}
.tv-stage{position:relative;overflow:hidden;min-width:0;min-height:0;touch-action:none;cursor:crosshair;contain:strict}
.tv-wrap{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.tv-wrap canvas,.tv-over{position:absolute;left:0;top:0;display:block;pointer-events:none}
.tv-chip{position:absolute;left:max(8px,env(safe-area-inset-left));top:max(8px,env(safe-area-inset-top));display:flex;align-items:center;gap:6px;padding:4px 8px;background:#0d0b1a;border:2px solid #3b3252;font:10px var(--f-label,"Silkscreen",monospace);letter-spacing:.05em;text-transform:uppercase;pointer-events:none;max-width:calc(100% - 80px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tv-chip b{color:#ffe14a;font-weight:400}
.tv-toast{position:absolute;left:50%;top:max(44px,calc(env(safe-area-inset-top) + 40px));transform:translateX(-50%);max-width:min(92%,460px);padding:8px 12px;background:#0d0b1a;border:2px solid #ffe14a;box-shadow:3px 3px 0 #000;color:#f0e6d0;text-align:center;line-height:1.3;pointer-events:none;opacity:0;transition:opacity .18s}
.tv-toast.on{opacity:1}
.tv-toast svg{display:inline-block;width:20px;height:20px;vertical-align:-5px;margin-right:6px}
.tv-b{appearance:none;-webkit-appearance:none;border:2px solid #3b3252;background:#15112a;color:#f0e6d0;border-radius:8px;padding:10px;width:100%;height:44px;min-width:0;cursor:pointer;touch-action:manipulation;display:flex;align-items:center;justify-content:center}
.tv-b:active{transform:translate(1px,1px)}
.tv-b[disabled]{opacity:.35;cursor:default}
.tv-b.tv-fit{position:absolute;right:max(8px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));width:44px;height:44px;padding:9px;display:none}
.tv-b.tv-fit.on{display:flex}
.tv-b.weak{opacity:.5}
.tv-ok{background:#ffe14a;border-color:#0d0b1a;color:#0d0b1a;box-shadow:3px 3px 0 #000;padding:8px}
.tv-bar{display:grid;gap:6px;align-items:center;background:#15112a;border-top:2px solid #3b3252;
  padding:6px max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));
  grid-template-columns:44px 44px minmax(0,1fr) 44px 64px;grid-template-areas:"sw sw sw sw sw" "x u can m ok"}
.tv-x{grid-area:x}.tv-u{grid-area:u}.tv-m{grid-area:m}.tv-okc{grid-area:ok}.tv-fitc{display:none}
.tv-can{grid-area:can;justify-self:center;position:relative;width:64px;height:56px;padding:2px;border:2px solid #ffe14a;background:#0d0b1a;border-radius:10px;cursor:pointer;touch-action:manipulation;color:#f0e6d0}
.tv-can>svg{width:40px;height:48px;margin:0 auto}
.tv-can i{position:absolute;right:-7px;bottom:-7px;min-width:22px;height:22px;padding:0 4px;border-radius:11px;background:#0d0b1a;border:2px solid #ffe14a;font:10px/18px var(--f-label,monospace);font-style:normal;text-align:center;color:#ffe14a}
.tv-can u{position:absolute;left:-6px;bottom:-6px;width:22px;height:22px;border-radius:50%;background:#0d0b1a;border:2px solid #3b3252;display:flex;align-items:center;justify-content:center}
.tv-can u span{display:block;border-radius:50%;background:#f0e6d0}
.tv-sw{grid-area:sw;display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:2px}
.tv-c{appearance:none;-webkit-appearance:none;border:0;background:none;height:44px;padding:3px 0 0;cursor:pointer;touch-action:manipulation;display:flex;align-items:flex-start;justify-content:center;border-radius:6px;transition:transform .08s}
.tv-c.on{background:#ffe14a33;box-shadow:inset 0 -4px 0 #ffe14a;transform:translateY(-2px)}
.tv-c.piu{color:#f0e6d0}
.tv-c.piu span{width:28px;height:28px;margin-top:4px;border:2px dashed #a89fbd;border-radius:50%;padding:4px}
.tv-c.piu.on span{border-style:solid;border-color:#0d0b1a}
.tv-sheet{position:absolute;left:0;right:0;bottom:0;max-height:70%;overflow:auto;padding:12px max(12px,env(safe-area-inset-right)) 12px max(12px,env(safe-area-inset-left));background:#15112a;border-top:2px solid #ffe14a;display:none;touch-action:pan-y}
.tv-sheet.on{display:block}
.tv-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 10px}
.tv-row:last-child{margin-bottom:0}
.tv-lab{font:10px var(--f-label,monospace);letter-spacing:.06em;text-transform:uppercase;color:#a89fbd;width:100%;margin:0 0 -2px}
.tv-t{appearance:none;-webkit-appearance:none;border:2px solid #3b3252;background:#0d0b1a;color:#f0e6d0;border-radius:8px;flex:1 1 0;min-width:52px;max-width:76px;height:58px;padding:6px 6px 16px;position:relative;cursor:pointer;touch-action:manipulation}
.tv-t small{position:absolute;left:0;right:0;bottom:3px;font:8px var(--f-label,monospace);letter-spacing:.02em;text-transform:uppercase;color:#a89fbd;white-space:nowrap}
.tv-t.on{border-color:#ffe14a;background:#2b2440}
.tv-t.on small{color:#ffe14a}
.tv-t.no{opacity:.35}
.tv-sl{display:flex;align-items:center;gap:10px;width:100%}
.tv-sl>span{flex:none;width:28px;height:28px;color:#a89fbd}
.tv-sl input{flex:1;min-width:0;height:44px;accent-color:#ffe14a;touch-action:pan-x}
.tv-sl output{flex:none;min-width:4.2em;text-align:right;font:11px var(--f-label,monospace)}
.tv-pal{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;width:100%}
.tv-pal .tv-c{height:48px}
.tv-info{font-size:13px;color:#a89fbd;line-height:1.4}
.tv-info b{color:#f0e6d0;font-weight:500}
@media (orientation:landscape){
  .tv{grid-template-rows:100%;grid-template-columns:minmax(0,1fr) auto}
  .tv-bar{border-top:0;border-left:2px solid #3b3252;align-content:stretch;gap:8px;
    padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) 8px;
    grid-template-columns:repeat(3,44px);grid-template-rows:auto auto auto minmax(0,1fr) auto;grid-template-areas:"x u fit" "can can can" "sw sw sw" ". . ." "m ok ok"}
  .tv-fitc{display:flex;grid-area:fit;visibility:hidden}
  .tv-fitc.on{visibility:visible}
  .tv-fit{display:none!important}
  .tv-sw{grid-template-columns:repeat(3,44px);gap:2px 0}
  .tv-c{height:40px}
  .tv-can{width:100%;height:60px}
  .tv-sheet{left:auto;top:0;bottom:0;width:min(340px,86%);max-height:none;border-top:0;border-left:2px solid #ffe14a}
  .tv-pal{grid-template-columns:repeat(4,minmax(0,1fr))}
}
@media (orientation:landscape) and (min-height:640px){ .tv-bar{grid-template-columns:repeat(3,54px);gap:10px} .tv-sw{grid-template-columns:repeat(3,54px);gap:6px 0} .tv-c{height:54px} .tv-c:not(.piu) svg{width:30px;height:42px} .tv-c.piu span{width:34px;height:34px} .tv-b{height:54px} .tv-can{height:84px} .tv-can>svg{width:52px;height:64px} }
@media (orientation:landscape) and (max-height:340px){ .tv-c{height:34px} .tv-c:not(.piu) svg{width:20px;height:28px} .tv-can{height:50px} .tv-b{height:40px} }
`;
  let cssOk = false;
  const css = () => { if (cssOk) return; cssOk = true; const s = document.createElement('style'); s.id = 'tv-css'; s.textContent = CSS; document.head.appendChild(s); };
  const mk = (tag, cls, par, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (par) par.appendChild(e); return e; };
  const lum = c => { const v = parseInt(c.slice(1), 16); return ((v >> 16) & 255) * .3 + ((v >> 8) & 255) * .59 + (v & 255) * .11; };

  // ---------------- il pannello ----------------
  // ctl (da writing.js): shot (la foto: canvas con .inner), W, H (il riquadro in m), cols (gli otto colori [hex, nome]), col (il colore
  // della bomboletta in mano), tool ('bomboletta' | 'pennarello'), pens (true se ci sono i pennelli), sizes ([k, nome, W, H]),
  // sizeK, has(tool), conta() ({bomboletta, pennarello} o null), titolo(soloPennarello), luogo, chi, PN, WM, mulberry,
  // reshoot(k) → { shot, W, H, nota } | null, save(rec) → { ok } | { msg }, close()
  function open(ctl) {
    css();
    const TOUCH = matchMedia('(pointer: coarse)').matches;
    const COLS = ctl.cols.concat(PIU), PNs = !!(ctl.pens && ctl.PN);
    let shot = ctl.shot, In = shot.inner || { x: 0, y: 0, w: shot.width, h: shot.height }, pw = In.w, ph = In.h, Wm = ctl.W, Hm = ctl.H, sizeK = ctl.sizeK || null;
    // la bomboletta di adesso: l'ultima scelta (se hai ancora quell'attrezzo), se no quella in mano
    const toolOf = p => p === 'marker' ? 'pennarello' : 'bomboletta';
    let pen = MEM.pen && TAPPI[MEM.pen] && (PNs || MEM.pen === 'spray' || MEM.pen === 'marker') && ctl.has(toolOf(MEM.pen)) ? MEM.pen : ctl.tool === 'pennarello' ? 'marker' : 'spray';
    if (!ctl.has(toolOf(pen)) && ctl.has(toolOf(pen === 'marker' ? 'spray' : 'marker'))) pen = pen === 'marker' ? 'spray' : 'marker';
    let col = MEM.col && /^#[0-9a-f]{6}$/i.test(MEM.col) ? MEM.col : (ctl.col && COLS.some(c => c[0] === ctl.col) ? ctl.col : COLS[0][0]);
    let cm = +MEM.cm[pen] || ATTR(pen).cm;
    let cfg = null;   // le manopole (flusso, colature) se toccate; se no ogni tappo ha le sue
    const strokes = []; let cur = null;   // ogni tratto: { pts: [[x, y, t, pressione]], c, p, w (px della foto) }

    // la struttura: la tela (la foto, l'inchiostro, il tratto in corso), la barra
    const box = mk('div', 'tv'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Tavoletta dei graffiti');
    const stage = mk('div', 'tv-stage', box), wrap = mk('div', 'tv-wrap', stage);
    const bg = mk('canvas', '', wrap), ink = mk('canvas', '', wrap); ink.dataset.tv = 'ink';
    const over = mk('canvas', 'tv-over', stage); over.dataset.tv = 'pane';
    const chip = mk('div', 'tv-chip', stage), toast = mk('div', 'tv-toast', stage);
    const fitB = mk('button', 'tv-b tv-fit', stage, IC.adatta); fitB.title = 'Riquadro intero'; fitB.dataset.tv = 'adatta';
    const sheet = mk('div', 'tv-sheet', stage);
    const bar = mk('div', 'tv-bar', box);
    const B = (cls, ic, title, f, k) => { const b = mk('button', 'tv-b ' + cls, bar, ic); b.title = title; b.setAttribute('aria-label', title); b.dataset.tv = k; b.onclick = e => { e.preventDefault(); f(); }; return b; };
    const bX = B('tv-x', IC.esci, 'Esci (Esc)', () => close(), 'esci');
    const bU = B('tv-u', IC.annulla, 'Annulla tratto (Ctrl+Z)', () => undo(), 'annulla');
    const bFit = B('tv-fitc', IC.adatta, 'Riquadro intero', () => fitView(), 'adatta2');
    const can = mk('button', 'tv-can', bar); can.dataset.tv = 'can'; can.title = 'Tappo e spessore'; can.setAttribute('aria-label', 'Bomboletta: tappo e spessore'); can.onclick = e => { e.preventDefault(); toggle('can'); };
    const swRow = mk('div', 'tv-sw', bar);
    const sw = ctl.cols.map((c, i) => { const b = mk('button', 'tv-c', swRow, barattolo(c[0], 24, 34)); b.title = c[1] + ' (' + (i + 1) + ')'; b.setAttribute('aria-label', c[1]); b.dataset.tv = 'sw'; b.onclick = e => { e.preventDefault(); setCol(c[0]); }; return b; });
    const piuB = mk('button', 'tv-c piu', swRow, '<span>' + IC.piu + '</span>'); piuB.title = 'Altri colori'; piuB.setAttribute('aria-label', 'Altri colori'); piuB.dataset.tv = 'piu'; piuB.onclick = e => { e.preventDefault(); toggle('piu'); };
    const bM = B('tv-m', IC.altro, 'Altro: misura, flusso, colature, pulisci', () => toggle('altro'), 'altro');
    const bOk = B('tv-okc tv-ok', IC.ok, 'Salva sul muro (Invio)', () => apply(), 'ok');

    // ---------------- la vista: il riquadro grande, due dita (o la rotella) per spostare e ingrandire ----------------
    let sw0 = 0, sh0 = 0, dpr = 1, k0 = 1;
    const V = { k: 1, tx: 0, ty: 0 };
    function setShot(sh) {
      shot = sh; In = sh.inner || { x: 0, y: 0, w: sh.width, h: sh.height }; pw = In.w; ph = In.h;
      bg.width = sh.width; bg.height = sh.height; const x = bg.getContext('2d'); x.drawImage(sh, 0, 0);
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, 0, sh.width, In.y); x.fillRect(0, In.y + In.h, sh.width, sh.height - In.y - In.h); x.fillRect(0, In.y, In.x, In.h); x.fillRect(In.x + In.w, In.y, sh.width - In.x - In.w, In.h);   // fuori dal riquadro: scurito
      ink.width = pw; ink.height = ph; ink.style.left = In.x + 'px'; ink.style.top = In.y + 'px';
      wrap.style.width = sh.width + 'px'; wrap.style.height = sh.height + 'px';
      fitView();
    }
    function fitView() {
      if (!sw0 || !sh0) return;
      const m = Math.min(14, Math.max(6, Math.min(sw0, sh0) * .025)), top = Math.min(34, sh0 * .08);   // un filo di margine (il bordo giallo si vede) e lo spazio per l'etichetta in alto
      k0 = Math.min((sw0 - 2 * m) / pw, (sh0 - m - Math.max(m, top)) / ph);
      V.k = k0; V.tx = sw0 / 2 - (In.x + pw / 2) * k0; V.ty = (sh0 + Math.max(m, top) - m) / 2 - (In.y + ph / 2) * k0;
      view();
    }
    let vReq = 0;
    function view() {
      wrap.style.transform = `translate(${V.tx}px,${V.ty}px) scale(${V.k})`;
      const z = V.k > k0 * 1.04 || V.k < k0 * .96; fitB.classList.toggle('on', z); bFit.classList.toggle('on', z);
      paintOver();
    }
    const zoomAt = (sx, sy, f) => { const k = clamp(V.k * f, k0 * .6, Math.max(k0 * 10, 2)); V.tx = sx - (sx - V.tx) * k / V.k; V.ty = sy - (sy - V.ty) * k / V.k; V.k = k; };
    function sized(w, h) {
      if (!w || !h) return; const first = !sw0; sw0 = w; sh0 = h; dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      over.width = Math.round(w * dpr); over.height = Math.round(h * dpr); over.style.width = w + 'px'; over.style.height = h + 'px';
      fitView(); if (first) suggerisci();
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(es => { const r = es[es.length - 1].contentRect; sized(r.width, r.height); }) : null;
    const onResize = () => { const r = stage.getBoundingClientRect(); sized(r.width, r.height); };
    if (ro) ro.observe(stage); else addEventListener('resize', onResize);

    // la tela di sopra (risoluzione dello schermo): il bordo giallo del riquadro e il tratto in corso, pieno e mai più sottile di 3 px
    function paintOver() {
      const x = over.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, sw0, sh0);
      const X0 = V.tx + In.x * V.k, Y0 = V.ty + In.y * V.k, Wd = pw * V.k, Hd = ph * V.k;
      x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,.65)'; x.strokeRect(X0 - 2, Y0 - 2, Wd + 4, Hd + 4);
      x.lineWidth = 2; x.strokeStyle = '#ffe14a'; x.strokeRect(X0 - 1, Y0 - 1, Wd + 2, Hd + 2);
      if (!cur || cur.pts.length < 1) return;
      x.save(); x.beginPath(); x.rect(X0, Y0, Wd, Hd); x.clip();
      const P0 = PNs && ctl.PN.PENNELLI[cur.p], lw = Math.max(cur.w * V.k * (P0 && P0.size || 1) * .9, 3);   // lo spessore del getto (pennelli.js: fat 1,9, skinny 0,5)
      x.lineCap = x.lineJoin = 'round'; x.beginPath();
      cur.pts.forEach((q, i) => { const px = X0 + q[0] * V.k, py = Y0 + q[1] * V.k; i ? x.lineTo(px, py) : x.moveTo(px, py); });
      if (cur.pts.length === 1) x.lineTo(X0 + cur.pts[0][0] * V.k + .01, Y0 + cur.pts[0][1] * V.k);
      x.strokeStyle = lum(cur.c) < 90 ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.45)'; x.lineWidth = lw + 2; x.stroke();   // il bordo che lo stacca dal muro
      x.strokeStyle = cur.c; x.lineWidth = lw; x.stroke(); x.restore();
    }
    const frame = () => { if (vReq) return; vReq = requestAnimationFrame(() => { vReq = 0; paintOver(); }); };

    // ---------------- l'inchiostro: la resa vera del pennello, tratto per tratto ----------------
    const meta = s => ({ c: s.c, p: s.p, w: +s.w.toFixed(2) });
    const recOf = (L, t0) => ({ strokes: L.map(s => s.pts.map(q => [q[0], q[1], q[2] - t0, q[3]])), st: L.map(meta), frame: { w: pw, h: ph } });
    function rec() {   // quello che si salva: i tratti, la bomboletta di ognuno, il tappo che conta di più (pennelli.js art lo usa per la grana)
      const t0 = strokes.length ? strokes[0].pts[0][2] : 0, r = recOf(strokes, t0), n = {};
      strokes.forEach(s => { n[s.p] = (n[s.p] || 0) + s.pts.length; });
      r.pen = Object.keys(n).sort((a, b) => n[b] - n[a])[0] || pen; r.wpx = strokes.length ? strokes[strokes.length - 1].w : wpx();
      if (!PNs) delete r.pen; else if (cfg) r.cfg = Object.assign({}, cfg);
      return r;
    }
    const rng = () => ctl.mulberry(11 + strokes.length);
    function inkStroke(s, x) {
      try {
        if (PNs) { const r = recOf([s], s.pts[0][2]); r.pen = s.p; if (cfg) r.cfg = cfg; ctl.PN.drawStrokes(x, r, pw, ph, s.c, rng()); }
        else if (ctl.WM) { const r = recOf([s], s.pts[0][2]); r.wpx = s.w; ctl.WM.drawRecorded(x, r, { seed: 7 }, pw, ph, rng(), s.c, s.p === 'marker' ? 'mtag' : 'tag'); }
      } catch (e) { console.warn('[tavola2] il pennello', e); }
    }
    let inkReq = 0, inkAll = false;
    const inkQ = [];
    function inkLater(s) { if (s) inkQ.push(s); else { inkAll = true; inkQ.length = 0; } if (inkReq) return; inkReq = requestAnimationFrame(inkNow); }
    function inkNow() {
      inkReq = 0; const x = ink.getContext('2d');
      if (inkAll) { inkAll = false; x.clearRect(0, 0, pw, ph); strokes.forEach(s => inkStroke(s, x)); }
      else while (inkQ.length) { const s = inkQ.shift(); if (strokes.includes(s)) inkStroke(s, x); }
      paintOver();
    }

    // ---------------- i gesti: un dito spruzza, due spostano e ingrandiscono ----------------
    const P = new Map(); let pinch = null, rect0 = null, startT = 0, held = false;
    const pxm = () => pw / Wm, wpx = () => cm / 100 * pxm();
    const local = e => [((e.clientX - rect0.left) - V.tx) / V.k - In.x, ((e.clientY - rect0.top) - V.ty) / V.k - In.y];
    const pinchInfo = () => { const [a, b] = [...P.values()]; return { x: (a.x + b.x) / 2 - rect0.left, y: (a.y + b.y) / 2 - rect0.top, d: Math.max(10, hyp(a.x - b.x, a.y - b.y)) }; };
    function down(e) {
      if (e.target.closest && e.target.closest('.tv-sheet,.tv-fit')) return;   // i pannelli e i pulsanti sopra la tela fanno da sé
      if (e.button === 1 || e.button === 2) { e.preventDefault(); rect0 = stage.getBoundingClientRect(); pinch = { pan: true, x: e.clientX, y: e.clientY }; stage.setPointerCapture(e.pointerId); P.set(e.pointerId, { x: e.clientX, y: e.clientY }); return; }
      if (e.button > 0) return;
      e.preventDefault(); try { stage.setPointerCapture(e.pointerId); } catch (er) { }
      if (sheetK) { toggle(null); held = true; P.set(e.pointerId, { x: e.clientX, y: e.clientY }); return; }   // il primo tocco fuori chiude il pannello, non spruzza
      if (!P.size) rect0 = stage.getBoundingClientRect();   // una lettura sola per gesto
      P.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (P.size === 2) {   // il secondo dito: il tratto appena cominciato era l'inizio del gesto, non un tratto
        if (cur) { if (e.timeStamp - startT < 350 || cur.pts.length < 8) strokes.pop(); else inkLater(cur); cur = null; }
        held = false; const q = pinchInfo(); pinch = { x: q.x, y: q.y, d: q.d }; if (!MEM.gesti) { MEM.gesti = true; ricorda(); } frame(); return;
      }
      if (P.size > 2 || pinch || held) return;
      if (!ctl.has(toolOf(pen))) { dire(pen === 'marker' ? 'Non hai pennarelli: scegli la bomboletta (tocca la bomboletta grande).' : 'Non hai bombolette: comprane in ferramenta, o scegli il pennarello (tocca la bomboletta grande).'); held = true; return; }
      const [x, y] = local(e); startT = e.timeStamp;
      cur = { pts: [[x, y, e.timeStamp, e.pressure || .5]], c: col, p: pen, w: wpx() }; strokes.push(cur); toastOff(); frame(); upd();
    }
    function move(e) {
      const p = P.get(e.pointerId); if (!p) return;
      if (pinch && pinch.pan) { V.tx += e.clientX - pinch.x; V.ty += e.clientY - pinch.y; pinch.x = e.clientX; pinch.y = e.clientY; view(); return; }
      p.x = e.clientX; p.y = e.clientY;
      if (pinch && P.size >= 2) { const q = pinchInfo(); V.tx += q.x - pinch.x; V.ty += q.y - pinch.y; zoomAt(q.x, q.y, q.d / pinch.d); pinch.x = q.x; pinch.y = q.y; pinch.d = q.d; if (!vReq) vReq = requestAnimationFrame(() => { vReq = 0; view(); }); return; }
      if (!cur) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null, L = evs && evs.length ? evs : [e], m = 1.2 / Math.max(.05, V.k);
      for (const ev of L) { const [x, y] = local(ev), l = cur.pts[cur.pts.length - 1]; if (hyp(x - l[0], y - l[1]) < m) continue; cur.pts.push([x, y, ev.timeStamp, ev.pressure || .5]); }
      frame();
    }
    function up(e) {
      if (!P.has(e.pointerId)) return; P.delete(e.pointerId);
      if (pinch && pinch.pan) { pinch = null; P.clear(); return; }
      if (cur && !P.size) { const s = cur; cur = null; inkLater(s); upd(); }
      if (!P.size) { pinch = null; held = false; }
      else if (pinch && P.size === 1) pinch = { wait: true };   // resta un dito: niente tratto finché non si staccano tutti
    }
    stage.addEventListener('pointerdown', down); stage.addEventListener('pointermove', move); stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('contextmenu', e => e.preventDefault());
    const wheel = e => { if (e.target.closest && e.target.closest('.tv-sheet')) return; e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-clamp(e.deltaY, -120, 120) * .0022)); view(); };
    stage.addEventListener('wheel', wheel, { passive: false });
    fitB.onclick = e => { e.preventDefault(); fitView(); };

    // ---------------- i pannelli: il tappo, gli altri colori, «altro» (uno alla volta, sopra la tela) ----------------
    let sheetK = null;
    function toggle(k) {
      sheetK = sheetK === k ? null : k; sheet.innerHTML = ''; sheet.classList.toggle('on', !!sheetK);
      can.style.borderColor = sheetK === 'can' ? '#f0e6d0' : ''; piuB.classList.toggle('aperto', sheetK === 'piu'); bM.style.borderColor = sheetK === 'altro' ? '#ffe14a' : '';
      if (sheetK === 'can') sheetCan(); else if (sheetK === 'piu') sheetPiu(); else if (sheetK === 'altro') sheetAltro();
    }
    const tasto = (par, ic, label, on, f, k) => { const b = mk('button', 'tv-t' + (on ? ' on' : ''), par, ic + '<small>' + label + '</small>'); b.title = label; b.setAttribute('aria-label', label); if (k) b.dataset.tv = k; b.onclick = e => { e.preventDefault(); f(b); }; return b; };
    function cursore(par, ic, title, min, max, step, v, txt, f) {
      const r = mk('label', 'tv-sl', par); mk('span', '', r, ic); r.title = title;
      const i = mk('input', '', r); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = v; i.setAttribute('aria-label', title);
      const o = mk('output', '', r); o.textContent = txt(v);
      i.oninput = () => { o.textContent = txt(+i.value); f(+i.value); }; return i;
    }
    function sheetCan() {
      const r1 = mk('div', 'tv-row', sheet); mk('div', 'tv-lab', r1).textContent = 'Tappo';
      const L = PNs ? ['spray', 'fat', 'skinny', 'roller', 'marker'] : ['spray', 'marker'];
      L.forEach(k => { const b = tasto(r1, getto(k), ATTR(k).b, k === pen, () => setPen(k), 'tappo'); b.dataset.k = k; if (!ctl.has(toolOf(k))) b.classList.add('no'); });
      const r2 = mk('div', 'tv-row', sheet); mk('div', 'tv-lab', r2).textContent = 'Spessore';
      cursore(r2, `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="${clamp(cm / ATTR(pen).max * 10, 3.5, 10)}" fill="${col}" stroke="#f0e6d0" stroke-width="1.5"/></svg>`, 'Spessore', 1, ATTR(pen).max, .5, cm, v => v + ' cm', v => { cm = v; MEM.cm[pen] = v; ricorda(); upd(); const c = sheet.querySelector('.tv-sl circle'); if (c) c.setAttribute('r', clamp(v / ATTR(pen).max * 10, 3.5, 10)); });
    }
    function sheetPiu() {
      const r = mk('div', 'tv-row', sheet); mk('div', 'tv-lab', r).textContent = 'Altri colori';
      const g = mk('div', 'tv-pal', r);
      PIU.forEach(c => { const b = mk('button', 'tv-c' + (c[0] === col ? ' on' : ''), g, barattolo(c[0], 24, 34)); b.title = c[1]; b.setAttribute('aria-label', c[1]); b.dataset.tv = 'swp'; b.onclick = e => { e.preventDefault(); setCol(c[0]); toggle(null); }; });
    }
    function sheetAltro() {
      if (ctl.sizes && ctl.reshoot) {
        const r1 = mk('div', 'tv-row', sheet); mk('div', 'tv-lab', r1).textContent = `Misura del riquadro · ${Wm.toFixed(1)} × ${Hm.toFixed(1)} m`;
        ctl.sizes.forEach((s, i) => tasto(r1, misura(i), s[1], s[0] === sizeK, b => reshoot(s[0], b), 'misura'));
      }
      if (PNs) {
        const r2 = mk('div', 'tv-row', sheet); mk('div', 'tv-lab', r2).textContent = 'Il getto';
        const P0 = ctl.PN.PENNELLI[pen] || {}, f0 = cfg ? cfg.flow : P0.flow, d0 = cfg ? cfg.drip : P0.drip;
        const set = () => { inkLater(null); };
        cursore(r2, IC.flusso, 'Flusso', 5, 100, 1, Math.round(f0 * 100), v => v + '%', v => { cfg = cfg || { flow: f0, drip: d0 }; cfg.flow = v / 100; set(); });
        cursore(r2, IC.colature, 'Colature', 0, 100, 1, Math.round(d0 * 100), v => v + '%', v => { cfg = cfg || { flow: f0, drip: d0 }; cfg.drip = v / 100; set(); });
      }
      const r3 = mk('div', 'tv-row', sheet);
      tasto(r3, IC.cestino, 'pulisci', false, b => {
        if (!strokes.length) return;
        if (!b.dataset.sicuro) { b.dataset.sicuro = 1; b.querySelector('small').textContent = 'sicuro?'; b.classList.add('on'); setTimeout(() => { if (b.isConnected) { delete b.dataset.sicuro; b.querySelector('small').textContent = 'pulisci'; b.classList.remove('on'); } }, 2500); return; }
        strokes.length = 0; cur = null; inkLater(null); upd(); toggle(null);
      }, 'pulisci');
      const n = ctl.conta(), inf = mk('div', 'tv-info', r3); inf.style.flex = '1';
      inf.innerHTML = `<b>${esc(ctl.chi)}</b>${ctl.luogo ? ' · ' + esc(ctl.luogo) : ''}<br>${n ? `Bombolette <b>${n.bomboletta}</b> · pennarelli <b>${n.pennarello}</b>` : ''}` +
        (TOUCH ? '<br>Un dito spruzza · due dita spostano e ingrandiscono' : '<br>1-8 colori · [ ] spessore · Ctrl+Z annulla · rotella ingrandisce · Invio salva · Esc esce');
    }
    const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function reshoot(k, b) {
      if (strokes.length && !(b && b.dataset.sicuro)) { if (b) { b.dataset.sicuro = 1; b.classList.add('on'); } dire('Cambiando misura il disegno si cancella: tocca di nuovo per confermare.'); return; }
      const r = ctl.reshoot(k); if (!r) return;
      Wm = r.W; Hm = r.H; sizeK = k; strokes.length = 0; cur = null; setShot(r.shot); inkLater(null); upd(); toggle(null);
      if (r.nota) dire(r.nota);
    }

    // ---------------- la bomboletta: colore, tappo, spessore ----------------
    function setCol(c) { col = c; MEM.col = c; ricorda(); upd(); }
    function setPen(k) {
      if (!ctl.has(toolOf(k))) { dire(k === 'marker' ? 'Non hai pennarelli.' : 'Non hai bombolette.'); return; }
      pen = k; cm = +MEM.cm[k] || ATTR(k).cm; MEM.pen = k; ricorda(); upd(); if (sheetK === 'can') { sheetK = null; toggle('can'); }
    }
    function upd() {
      can.innerHTML = grande(col, pen); const n = ctl.conta();
      if (n) { const i = mk('i', '', can); i.textContent = toolOf(pen) === 'pennarello' ? n.pennarello : n.bomboletta; }
      const u = mk('u', '', can), d = clamp(Math.round(cm / ATTR(pen).max * 14), 4, 14), s = mk('span', '', u); s.style.width = s.style.height = d + 'px';
      can.title = `${ATTR(pen).n}, ${cm} cm`;
      sw.forEach((b, i) => b.classList.toggle('on', ctl.cols[i][0] === col));
      const extra = PIU.find(c => c[0] === col); piuB.classList.toggle('on', !!extra); piuB.firstChild.style.background = extra ? extra[0] : '';
      bU.disabled = !strokes.length;
      const have = !n || strokes.every(s => n[toolOf(s.p)] > 0);
      bOk.classList.toggle('weak', !strokes.length || !have);
      chip.innerHTML = `<b>${esc(ctl.titolo(strokes.length && strokes.every(s => s.p === 'marker')))}</b> ${Wm.toFixed(1).replace('.', ',')}×${Hm.toFixed(1).replace('.', ',')} m`;
    }
    // i messaggi: in alto, pochi secondi
    let toastT = 0;
    function dire(t, ic) { toast.innerHTML = (ic || '') + esc(t); toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(toastOff, 2800); }
    function toastOff() { toast.classList.remove('on'); }
    function suggerisci() {   // all'apertura: cosa fare (una volta), e sul telefono dritto con un riquadro largo, girarlo
      const portrait = sh0 > sw0, Wd = pw * k0;
      if (portrait && TOUCH && pw / ph > 1.7 && Wd * ph * k0 < sw0 * sh0 * .3) dire('Gira il telefono: il riquadro viene più grande.', IC.gira);
      else if (!MEM.gesti) dire(TOUCH ? 'Spruzza col dito nel riquadro giallo. Due dita: sposta e ingrandisci.' : 'Spruzza nel riquadro giallo. La rotella ingrandisce.');
    }

    // ---------------- annulla, salva, esci ----------------
    function undo() { if (cur) { cur = null; } if (!strokes.length) return; strokes.pop(); inkLater(null); upd(); }
    function apply() {
      if (!strokes.length) { dire('Prima disegna qualcosa dentro il riquadro giallo.'); return; }
      const r = ctl.save(rec());
      if (r && r.ok) close(true); else if (r && r.msg) dire(r.msg);
    }
    let closed = false;
    function close() {
      if (closed) return; closed = true;
      removeEventListener('keydown', keys, true); removeEventListener('keyup', keys, true);
      if (ro) ro.disconnect(); else removeEventListener('resize', onResize);
      if (vReq) cancelAnimationFrame(vReq); if (inkReq) cancelAnimationFrame(inkReq); clearTimeout(toastT);
      box.remove(); ctl.close();
    }
    const keys = e => {
      e.stopPropagation(); if (e.type !== 'keydown') return;
      if (e.target && e.target.tagName === 'INPUT' && /Arrow/.test(e.key)) return;
      if (e.key === 'Escape') { if (sheetK) toggle(null); else close(); }
      else if (e.key === 'Enter') { e.preventDefault(); apply(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      else if (/^[1-8]$/.test(e.key) && ctl.cols[+e.key - 1]) setCol(ctl.cols[+e.key - 1][0]);
      else if (e.key === '[' || e.key === ']') api.size(e.key === ']' ? 1 : -1);
      else if (e.key === '0') fitView();
    };
    addEventListener('keydown', keys, true); addEventListener('keyup', keys, true);

    document.body.appendChild(box); setShot(shot); upd();
    if (!ro) onResize();
    // [tavoletta] i tasti del Game Boy (main.js conMap): A salva, B esce, la croce colore (◄ ►) e spessore (▲ ▼), annulla col tasto bomboletta
    const api = {
      box, apply, close, undo,
      col: d => { const i = COLS.findIndex(c => c[0] === col), j = ((i < 0 ? 0 : i) + d + COLS.length) % COLS.length; setCol(COLS[j][0]); dire('Colore: ' + COLS[j][1]); },
      size: d => { cm = clamp(cm + d, 1, ATTR(pen).max); MEM.cm[pen] = cm; ricorda(); upd(); dire('Spessore: ' + cm + ' cm'); },
      stato: () => ({ col, pen, cm, tratti: strokes.length, vista: Object.assign({ k0 }, V) }),   // per le prove
    };
    return api;
  }
  return { open, PIU, TAPPI, MEM };
})();
if (typeof module !== 'undefined') module.exports = TavolaUI;
