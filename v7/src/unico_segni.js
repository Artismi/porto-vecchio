/* [unico] unico_segni.js: I SEGNI DEL SISTEMA UNICO, passo 4 (progetto: commedia/SISTEMA_UNICO.md §7, §1.3 riga 7, §10 riga 4).
   Dietro ?commedia. Spento il flag: Segni = { ON: false } e nient'altro (nessun aggancio, nessun elemento nella pagina).

   LA REGOLA (§7): ogni fatto ha un segno che si vede. La fase «unico.segni» legge i fatti nuovi della memoria (Fatto, in ordine di id,
   nello stesso passo in cui nascono) e a ognuno dà i suoi segni, scritti nel fatto stesso (f.segno = 'B+P+O+T', per le prove):
     B  la BOLLA D'INTENTO: un pittogramma (24 forme disegnate in canvas 2D, nessun asset) più 1-4 parole, nella striscia d'inchiostro
        dello stile D di commedia (inchiostro #16121B all'86%, carta #F2E7CF); entro 26 m piena, fra 26 e 60 m solo il pittogramma, più
        grande. Dura per tutto il verbo: i piani a passi di Verbo (n.pop.emer.verbo) la tengono accesa finché non finiscono
     P  la POSA: la posa dichiarata dal verbo (o dal tipo del fatto) passa ad anim_vita.js con Anim.npcPost / Anim.playerMap; le pose
        sono quelle che ci sono (porge, discute, martella, vernicia, pesca, lavora, mangia, beve, dorme...), con i loro attrezzi (vprop)
     O  il CAMBIO NEL MONDO: c'è già (la scorta, la parete, il muro, il pezzo del cantiere); il segno lo dichiara (scheda.segno.cambia)
     D  la BATTUTA dopo il fatto, per i verbi nuovi che parlano (chiacchiera, rinfaccia, appuntamento, rendi, regala, presta): una riga
        costruita dal fatto vero (la diceria è il fatto raccontato), detta con G.say (passa dalla regia di commedia), entro 12 m, al più
        una ogni 10 s, mai la stessa riga fra le ultime 40
     F  la FRECCIA a bordo schermo verso un fatto con pub ≥ .5 fra 26 e 60 m, al più una ogni 90 s. La camera non si tocca
     C  la CRONACA: la Gazzetta del Porto, un'edizione alle 7:00 con i fatti del giorno prima (pub × peso × novità, le catene con
        hop ≥ 2 in testa), divisa per posto. Ogni riga porta gli id dei suoi fatti (f), e una riga è solo di fatti veri: niente
        riempitivi. Due fatti uguali (lo stesso tipo, chi, con chi, cosa) diventano una riga sola («tre volte»). Una riga non
        si ripete fra le ultime 30 uscite. L'uscita si annuncia con una riga nel feed (G.feed)
     T  il TACCUINO: le schede del sistema unico nel Taccuino di main.js (#book), con un solo MutationObserver per tutte:
        «Gazzetta», «Cronaca di oggi» (tutti i fatti dall'ultima edizione, per posto e per tipo: ogni fatto ci entra, ed è il segno
        di chi non si è visto), «Si dice» (le dicerie arrivate al giocatore: raccontate a lui o sentite entro 12 m), «Conti aperti»
        (debiti, rancori, appuntamenti di chi siede al posto del giocatore, e quelli fra gli altri che ha visto)
   La pagina si tocca solo quando cambia (contenuto, classe e posizione si ricordano); al telefono al massimo 2 fumetti pieni,
   contando quelli di commedia (gli altri restano pittogrammi, al più 2); il testo è di 16 px o più; mai sopra il HUD (#or-obj, #mini,
   #stick, #stick2: la stessa regola di commedia.js). Lo stato salvabile sta in st.u.segni, st.u.cronaca, st.u.taccuino: solo
   numeri, stringhe e array. Il caso non serve: le varianti si scelgono con l'hash del fatto (la fase non tocca i flussi). */
var Segni = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Segni = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = Segni;
  if (!ON) return Segni;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  if (!G || !Un() || !FT()) { Segni.ON = false; return Segni; }
  const VB = () => (typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null);
  const LG = () => (typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null);
  const AT = () => (typeof Attore !== 'undefined' && Attore.ON ? Attore : null);
  const SO = () => (typeof UnicoSociali !== 'undefined' && UnicoSociali.ON ? UnicoSociali : null);
  const W0 = typeof window !== 'undefined' ? window : null;
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const aN = w => (typeof Lingua !== 'undefined' && Lingua.ON && Lingua.a ? Lingua.a(w) : (/^[Aa]/.test(w || '') ? 'ad ' : 'a ') + w);   // [molo] «ad Ada»
  const CFG = Segni.CFG = {
    piena: 26, picto: 60, dur: 4.5, durPiano: .9, giro: .5,       // m, m, s di st.clock
    max: { piene: 4, picto: 4, tel: 0, telPicto: 2 },   // [molo] al telefono solo pittogrammi: le parole stanno nel menu
    freccia: { pub: .5, ogni: 90, dur: 7, r0: 26, r1: 60, schermo: false },   // [molo] schermo: false, la freccia non copre il gioco (resta il fatto, nel menu)
    dire: { r: 12, ogni: 10, ricorda: 40 },
    posaR: 45,
    gazzetta: { ora: 7 * 60, righe: 5, breve: 3, edizioni: 7, ricorda: 30, perTipo: 2, perChi: 2 },
    perPasso: 400,                                                 // i fatti letti per passo (a conteggio)
    sentite: 30,
  };
  const stats = Segni.stats = { fatti: 0, per: {}, bolle: 0, pose: 0, frecce: 0, dette: 0, tacitate: 0, saltate: 0, edizioni: 0, righe: 0, dom: 0, ms: 0, msMax: 0 };

  // ======================= I PITTOGRAMMI (canvas 2D, nessun asset) =======================
  // in unità 0..1 su un quadrato; carta sull'inchiostro della striscia, gli accenti in ocra e cotto (fuori dai colori riservati)
  const CARTA = '#F2E7CF', OCRA = '#DC9A34', COTTO = '#C25B36', CIELO = '#A3D4D8', OSSO = '#D2C2A6';
  const PITTO = {
    freccia: x => { L(x, [[.15, .5], [.8, .5]]); L(x, [[.55, .25], [.82, .5], [.55, .75]]); },
    moneta: x => { O(x, .5, .5, .3, OCRA); x.fillStyle = '#16121B'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('L', 32, 34); },
    moneta_piu: x => { O(x, .42, .55, .26, OCRA); L(x, [[.78, .12], [.78, .42]]); L(x, [[.63, .27], [.93, .27]]); },
    cuore: x => { x.fillStyle = COTTO; x.beginPath(); x.moveTo(32, 52); x.bezierCurveTo(4, 32, 10, 8, 32, 22); x.bezierCurveTo(54, 8, 60, 32, 32, 52); x.fill(); x.stroke(); },
    stretta: x => { x.lineWidth = 6; x.strokeStyle = CARTA; RR(x, .1, .36, .46, .28, .14); RR(x, .44, .36, .46, .28, .14); },
    mano: x => { RR(x, .3, .45, .4, .4, .08, OSSO); for (const k of [.34, .45, .56, .67]) L(x, [[k, .45], [k, .16]]); L(x, [[.3, .62], [.14, .44]]); },
    mano_giu: x => { RR(x, .3, .12, .36, .34, .08, OSSO); for (const k of [.36, .48, .6]) L(x, [[k, .46], [k, .6]]); L(x, [[.5, .66], [.5, .9]]); L(x, [[.38, .78], [.5, .92], [.62, .78]]); },
    forchetta: x => { L(x, [[.5, .45], [.5, .9]]); L(x, [[.32, .12], [.32, .38], [.68, .38], [.68, .12]]); L(x, [[.5, .12], [.5, .38]]); },
    bicchiere: x => { x.fillStyle = CIELO; x.beginPath(); x.moveTo(.28 * 64, .45 * 64); x.lineTo(.72 * 64, .45 * 64); x.lineTo(.66 * 64, .88 * 64); x.lineTo(.34 * 64, .88 * 64); x.closePath(); x.fill(); L(x, [[.24, .14], [.34, .88], [.66, .88], [.76, .14]]); },
    martello: x => { L(x, [[.3, .88], [.6, .38]]); x.fillStyle = OSSO; x.save(); x.translate(.6 * 64, .3 * 64); x.rotate(-1.03); x.fillRect(-14, -8, 28, 16); x.strokeRect(-14, -8, 28, 16); x.restore(); },
    piede: x => { L(x, [[.3, .9], [.62, .2]]); x.beginPath(); x.arc(.72 * 64, .24 * 64, 7, Math.PI * .9, Math.PI * 2.2); x.stroke(); },
    casetta: x => { x.fillStyle = OCRA; x.beginPath(); x.moveTo(.12 * 64, .5 * 64); x.lineTo(.5 * 64, .14 * 64); x.lineTo(.88 * 64, .5 * 64); x.closePath(); x.fill(); x.stroke(); RR(x, .22, .5, .56, .38, .02, CARTA); RR(x, .43, .62, .14, .26, .01, COTTO); },
    pennello: x => { L(x, [[.25, .88], [.55, .45]]); x.fillStyle = OCRA; x.save(); x.translate(.64 * 64, .3 * 64); x.rotate(.6); x.fillRect(-8, -12, 16, 24); x.restore(); },
    bomboletta: x => { RR(x, .3, .3, .3, .58, .06, COTTO); RR(x, .38, .18, .14, .12, .02, CARTA); x.fillStyle = CARTA; for (const [a, b] of [[.72, .16], [.8, .26], [.7, .3], [.86, .14]]) { x.beginPath(); x.arc(a * 64, b * 64, 2.5, 0, 7); x.fill(); } },
    amo: x => { L(x, [[.1, .92], [.78, .1]]); x.lineWidth = 3; L(x, [[.78, .1], [.78, .58]]); x.lineWidth = 5; x.beginPath(); x.arc(.7 * 64, .62 * 64, 5.5, 0, Math.PI); x.stroke(); L(x, [[.6, .62], [.6, .54]]); },   // [molo] la canna con la lenza e l'amo (prima un amo solo, si leggeva «J»)
    ingranaggio: x => { x.fillStyle = OSSO; x.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 22 : 28; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.closePath(); x.fill(); x.fillStyle = '#16121B'; x.beginPath(); x.arc(32, 32, 8, 0, 7); x.fill(); },
    fumetto: x => { x.fillStyle = CARTA; x.beginPath(); x.ellipse(32, 28, 26, 18, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(18, 40); x.lineTo(12, 58); x.lineTo(30, 44); x.fill(); x.fillStyle = '#16121B'; for (const a of [20, 32, 44]) { x.beginPath(); x.arc(a, 28, 3.5, 0, 7); x.fill(); } },
    orologio: x => { O(x, .5, .5, .36, CARTA); x.strokeStyle = '#16121B'; L(x, [[.5, .5], [.5, .26]]); L(x, [[.5, .5], [.68, .58]]); },
    zeta: x => { L(x, [[.2, .3], [.5, .3], [.2, .7], [.5, .7]]); x.lineWidth = 4; L(x, [[.58, .14], [.8, .14], [.58, .4], [.8, .4]]); },
    frecce: x => { L(x, [[.14, .32], [.84, .32]]); L(x, [[.66, .16], [.86, .32], [.66, .48]]); L(x, [[.86, .68], [.16, .68]]); L(x, [[.34, .52], [.14, .68], [.34, .84]]); },
    muso: x => { O(x, .5, .52, .36, COTTO); x.strokeStyle = '#16121B'; L(x, [[.3, .34], [.44, .42]]); L(x, [[.7, .34], [.56, .42]]); x.beginPath(); x.arc(32, 50, 9, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); },
    chiave: x => { O(x, .32, .36, .16, null); L(x, [[.42, .46], [.82, .86]]); L(x, [[.66, .7], [.76, .6]]); L(x, [[.74, .78], [.84, .68]]); },
    porta: x => { RR(x, .28, .1, .44, .8, .02, OCRA); x.fillStyle = '#16121B'; x.beginPath(); x.arc(.62 * 64, .52 * 64, 3.5, 0, 7); x.fill(); },
    esclamativo: x => { L(x, [[.5, .12], [.5, .62]]); x.fillStyle = CARTA; x.beginPath(); x.arc(32, 52, 5, 0, 7); x.fill(); },
  };
  function L(x, P) { x.beginPath(); P.forEach(([a, b], i) => (i ? x.lineTo(a * 64, b * 64) : x.moveTo(a * 64, b * 64))); x.stroke(); }
  function O(x, a, b, r, fill) { x.beginPath(); x.arc(a * 64, b * 64, r * 64, 0, Math.PI * 2); if (fill) { x.fillStyle = fill; x.fill(); } x.stroke(); }
  function RR(x, a, b, w, h, r, fill) { x.beginPath(); const X = a * 64, Y = b * 64, Wd = w * 64, H = h * 64, R = r * 64; x.moveTo(X + R, Y); x.arcTo(X + Wd, Y, X + Wd, Y + H, R); x.arcTo(X + Wd, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + Wd, Y, R); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } x.stroke(); }
  const ALIAS = { 'moneta+': 'moneta_piu', 'piede di porco': 'piede', Z: 'zeta', z: 'zeta', '!': 'esclamativo', 'mano giù': 'mano_giu' };
  const pitto = k => { k = ALIAS[k] || k; return PITTO[k] ? k : 'fumetto'; };
  const URL = {};
  function urlDi(k) {
    if (URL[k] !== undefined) return URL[k];
    if (typeof document === 'undefined' || !document.createElement) return (URL[k] = '');
    try {
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); if (!x) return (URL[k] = '');
      x.lineWidth = 6; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = CARTA;
      x.save(); x.translate(1.5, 1.5); x.globalAlpha = .45; x.strokeStyle = '#000'; PITTO[k](x); x.restore();   // l'ombra d'inchiostro, 1,5 px
      x.globalAlpha = 1; x.lineWidth = 6; x.strokeStyle = CARTA; PITTO[k](x);
      return (URL[k] = c.toDataURL('image/png'));
    } catch (e) { return (URL[k] = ''); }
  }

  // ======================= I SEGNI PER TIPO DI FATTO (solo dati, §7.2) =======================
  // p: pittogramma · w: le parole ('$cosa', '$ora'...) · posa: la posa (anim_vita) · gz: il peso per la Gazzetta (0 = mai) ·
  // r: le varianti della riga di cronaca ({A} {B} {cosa} {cosaN} {cosaI} {bott} {lire} {ora} {posto} {luogo} {colore} {n};
  // [tra quadre] si toglie se un segnaposto dentro è vuoto) · n: il nome per contare nella Cronaca di oggi [uno, tanti] · bolla: false
  // per i fatti che non si annunciano (le chiacchiere di fondo, che hanno già le loro battute)
  const TIPI = {
    vai: { p: 'freccia', gz: 0, n: ['spostamento', 'spostamenti'] },
    entra: { p: 'porta', gz: 0, n: ['entrata', 'entrate'], bolla: false }, esce: { p: 'porta', gz: 0, n: ['uscita', 'uscite'], bolla: false },
    prende: { p: 'mano', w: '$cosa', posa: 'fruga', gz: 0, n: ['cosa presa', 'cose prese'] },
    posa: { p: 'mano_giu', posa: 'raccoglie', gz: 0, n: ['cosa lasciata', 'cose lasciate'] },
    dai: { p: 'mano', w: '$cosa', posa: 'porge', gz: .15, n: ['passaggio di mano', 'passaggi di mano'], r: ['{A} ha dato {cosaN} a {B}.', '{cosaN}, da {A} a {B}.'] },
    regalo: { p: 'cuore', w: 'per te', posa: 'porge', gz: .6, n: ['regalo', 'regali'], r: ['{A} ha regalato {cosaN} a {B}.', 'Un regalo per {B}[: {cosaN}], da parte di {A}.', 'Gesto gentile di {A} con {B}[: {cosaN}].'] },
    prestito: { p: 'stretta', w: 'te li rendo', posa: 'porge', gz: .5, n: ['prestito', 'prestiti'], r: ['{A} ha prestato {lire} a {B}.', 'Prestito fra {A} e {B}[: {lire}].', '{B} ha avuto {lire} in prestito da {A}.'] },
    saldato: { p: 'moneta', w: 'pari', posa: 'porge', gz: .4, n: ['debito saldato', 'debiti saldati'], r: ['{A} ha reso {lire} a {B}: pari.', 'Conti chiusi fra {A} e {B}[ ({lire})].', '{B} ha riavuto i suoi soldi da {A}[: {lire}].'] },
    restituito: { p: 'moneta', w: 'pari', posa: 'porge', gz: .35, n: ['cosa resa', 'cose rese'], r: ['{A} ha restituito {cosa} a {B}.', '{B} ha riavuto {cosa} da {A}.'] },
    compra: { p: 'moneta', w: '$cosa', posa: 'porge', gz: .25, n: ['compera', 'compere'], r: ['{A} ha comprato {cosaN}[ da {bott}].', 'Spesa di {A}[ da {bott}]: {cosaN}.', '[Da {bott}, ]{A} ha portato via {cosaN}.'] },
    vende: { p: 'moneta_piu', w: '$cosa', posa: 'porge', gz: .3, n: ['vendita', 'vendite'], r: ['{A} ha venduto {cosaN}[ a {bott}].', 'Affari per {A}: {cosaN} vendut{oc}[ a {bott}].'] },
    baratto: { p: 'frecce', w: 'baratto', posa: 'porge', gz: .35, n: ['baratto', 'baratti'], r: ['Baratto fra {A} e {B}.', '{A} e {B} si sono scambiati la roba, senza soldi.'] },
    mangia: { p: 'forchetta', posa: 'mangia_su', gz: 0, n: ['pasto', 'pasti'] }, beve: { p: 'bicchiere', posa: 'beve_su', gz: 0, n: ['bevuta', 'bevute'] },
    fa: { p: 'martello', w: '$cosa', posa: 'lavora', gz: .3, n: ['lavoretto', 'lavoretti'], r: ['{A} ha fatto {cosaN} con le sue mani.', 'Dal banco di {A}: {cosaN}.'] },
    costruisce: { p: 'martello', w: '$cosa', posa: 'martella', gz: .7, n: ['costruzione', 'costruzioni'], r: ['È spuntato {cosaI}: l\'ha messo su {A}.', '{A} ha costruito {cosaI}.', 'Lavori di {A}: {cosaI} nuovo.'] },
    smonta: { p: 'piede', posa: 'forza', gz: .4, n: ['pezzo smontato', 'pezzi smontati'], r: ['{A} ha smontato {cosa}.', 'Via {cosa}: l\'ha smontato {A}.'] },
    porta_casa: { p: 'casetta', w: '$cosa', posa: 'porta_su', gz: .3, n: ['cosa portata a casa', 'cose portate a casa'], r: ['{A} ha messo in casa {cosaI}.', 'Casa di {A}: c\'è {cosaI} in più.'] },
    dipinge: { p: 'pennello', w: '$colore', posa: 'vernicia', gz: .4, n: ['casa ridipinta', 'case ridipinte'], r: ['{A} ha ridipinto casa[: {colore}].', 'Casa di {A}, pareti nuove[: {colore}].'] },
    dipinge_muro: { p: 'bomboletta', posa: 'vernicia', gz: .6, n: ['muro dipinto', 'muri dipinti'], r: ['Nuovo pezzo sul muro[ a {luogo}]: è di {A}.', '{A} ha lasciato il segno[ a {luogo}].'] },
    dorme: { p: 'zeta', posa: 'dorme', gz: 0, n: ['dormita', 'dormite'] },
    pesca: { p: 'amo', posa: 'pesca', gz: .3, n: ['pesca', 'pesche'], r: ['Pesca per {A}[: {cosaN}].', '{A} ha tirato su {cosaN}.'] },
    lavora: { p: 'ingranaggio', w: '$mestiere', posa: 'lavora', gz: .08, n: ['turno di lavoro', 'turni di lavoro'], r: ['{A} ha fatto il suo turno[ ({mestiere})].'] },
    chiacchiera: { p: 'fumetto', w: 'hai sentito?', posa: 'discute', gz: 0, n: ['diceria', 'dicerie'] },
    appuntamento: { p: 'orologio', w: '$ora', posa: 'discute', gz: .3, n: ['appuntamento', 'appuntamenti'], r: ['{A} e {B} si vedono[ {ora}][ a {posto}].', 'Appuntamento fra {A} e {B}[, {ora}][ a {posto}].'] },
    appuntamento_no: { p: 'orologio', w: 'non posso', posa: 'discute', gz: 0, n: ['appuntamento saltato', 'appuntamenti saltati'] },
    rinfacciato: { p: 'muso', w: 'e i miei soldi?', posa: 'discute', gz: .6, n: ['conto rinfacciato', 'conti rinfacciati'], r: ['Lite fra {A} e {B}[ per {lire}].', '{A} ha rinfacciato a {B}[ {lire}], davanti a tutti.', 'Musi lunghi fra {A} e {B}.'] },
    lite: { p: 'muso', w: 'basta!', posa: 'discute', gz: .7, n: ['lite', 'liti'], r: ['Lite fra {A} e {B}.', '{A} e {B} hanno alzato la voce.'] },
    rissa: { p: 'esclamativo', posa: 'discute', gz: .9, n: ['rissa', 'risse'], r: ['Rissa fra {A} e {B}.'] },
    furto: { p: 'esclamativo', gz: .9, bolla: false, n: ['furto', 'furti'], r: ['Furto ai danni di {B}.', 'Qualcuno ha derubato {B}.'] },
    buca: { p: 'orologio', w: 'lo aspetto', posa: 'aspetta', gz: .5, n: ['buca', 'buche'], r: ['{A} ha dato buca a {B}.', '{B} ha aspettato {A} per niente.'] },
    incontro: { p: 'fumetto', posa: 'discute', gz: .3, n: ['incontro', 'incontri'], r: ['{A} e {B} si sono visti, come d\'accordo.'] },
    parola_rotta: { p: 'muso', gz: .5, n: ['parola rotta', 'parole rotte'], r: ['{A} non ha mantenuto la parola con {B}.'] },
    parola_mantenuta: { p: 'stretta', gz: .4, n: ['parola mantenuta', 'parole mantenute'], r: ['{A} ha mantenuto la parola con {B}.'] },
    muso: { p: 'muso', posa: 'discute', gz: .3, n: ['muso', 'musi'], r: ['Musi lunghi fra {A} e {B}.'] },
    social: { p: 'fumetto', gz: 0, bolla: false, n: ['chiacchierata', 'chiacchierate'] },
    casa_gusto: { p: 'casetta', gz: 0, bolla: false, n: ['cambio di gusto', 'cambi di gusto'] },
    ricettato: { p: 'casetta', gz: .5, n: ['roba ricettata', 'robe ricettate'], r: ['In casa di {A} è comparso {cosaI}. Da dove?'] },
  };
  const tipoDi = v => TIPI[v] || (/^casa_/.test(v) ? { p: 'casetta', gz: .2, n: ['lavoro in casa', 'lavori in casa'] } : { p: 'fumetto', gz: 0, n: ['fatto', 'fatti'] });
  const LIBERA = new Set(['furto']);   // i fatti che la bolla non annuncia (il ladro non si annuncia, §7.2)

  // ======================= LE PAROLE (dal fatto, con Lingua) =======================
  const NUMW = ['zero', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci'];
  const roba = k => { const R = typeof Roba !== 'undefined' && Roba.ON ? Roba : null; return R ? R.di(k) : null; };
  function cosaW(k, tipo, q) {
    if (!k) return ''; const L = LG(), e = roba(k);
    const CA = typeof Cantiere !== 'undefined' && Cantiere.BY ? Cantiere.BY[k] : null;
    if (CA && CA.nome) { const s = CA.nome.toLowerCase(); try { return L ? L.art(s, tipo === 'quanti' ? 'ind' : tipo || 'det') : s; } catch (x) { return s; } }
    if (!L) return e ? e.nome : String(k);
    try {
      if (tipo === 'quanti') return e ? L.quanti(e, q || 1) : L.quanti(String(k), q || 1);
      if (tipo === 'corto') return L.art(e ? e.corto : String(k), 'det');
      return L.art(e || String(k), tipo || 'det');
    } catch (x) { return e ? e.nome : String(k); }
  }
  const lire = v => (typeof v === 'number' && v ? `${(Math.round(Math.abs(v) * 10) / 10).toLocaleString('it-IT')}.000 lire` : '');
  const isP = id => id === 'player' || id === 'nino';
  function npc(st, id) { if (id == null || isP(id)) return null; try { return G.byId(st, id); } catch (e) { return null; } }
  function nomeDi(st, id, lungo) {
    if (id == null) return '';
    if (isP(id)) { const A = AT() && AT().di(st, 'nino'); return A ? A.nome : G.PLAYER_NAME || 'Nino'; }
    const s = String(id); if (/^bottega:/.test(s)) { const S = bottega(st, s); return S ? S.label : ''; }
    const n = npc(st, s); if (n) return lungo && n.name ? n.name : n.first || n.name || '';
    return '';
  }
  function sessoDi(st, id) { if (isP(id)) return 'm'; const n = npc(st, id); return n && n.pop && n.pop.sex === 'f' ? 'f' : 'm'; }
  function bottega(st, s) { const E = typeof Economia !== 'undefined' && Economia.eco ? Economia.eco(st) : null; const k = String(s).replace(/^bottega:/, ''); return E && E.shops ? E.shops[k] || null : null; }
  function luogoW(st, f) {
    const l = f.dove && f.dove[2]; if (!l) return '';
    if (/^b:/.test(l)) { const b = G.BUILDINGS && G.BUILDINGS[+l.slice(2)]; return b && b.name ? b.name : ''; }
    const P = G.PLACES && G.PLACES[l]; return P ? P.name : '';
  }
  const oraW = (st, t) => { const S = SO(); return typeof t === 'number' && S ? S.oraW(st, t) : ''; };
  function coloreW(f) { const x = f.x || {}; if (x.colore) return x.colore; const C = typeof Casa !== 'undefined' && Casa.INK ? Casa.INK : null; return x.ink && C && C[x.ink] ? C[x.ink].w : ''; }
  // i valori dei segnaposto di un fatto (o di un gruppo di fatti uguali: q sommato, n quanti)
  function valori(st, f, n, qTot, lungo) {
    const x = f.x || {}, B = (f.con || [])[0], bott = B && /^bottega:/.test(B) ? nomeDi(st, B) : '';
    const q = qTot || f.q || 1, cosa = f.cosa;
    return {
      A: nomeDi(st, f.chi, lungo), B: B && !/^bottega:/.test(B) ? nomeDi(st, B, lungo) : '', bott,
      cosa: cosa ? cosaW(cosa, 'det') : '', cosaN: cosa ? cosaW(cosa, 'quanti', q) : '', cosaI: cosa ? cosaW(cosa, 'ind') : '',
      lire: lire(typeof f.soldi === 'number' ? f.soldi : x.debito), ora: oraW(st, typeof x.ora === 'number' ? x.ora : x.t),
      posto: x.posto && G.PLACES && G.PLACES[x.posto] ? G.PLACES[x.posto].name : '', luogo: luogoW(st, f), colore: coloreW(f), mestiere: x.mestiere || '',
      n: n > 1 ? (NUMW[n] || String(n)) + ' volte' : '', oc: (() => { const L = LG(); if (!cosa || !L) return 'o'; const g = L.genere(roba(cosa) || String(cosa)); return (g.f ? (g.pl ? 'e' : 'a') : (g.pl ? 'i' : 'o')); })(),
    };
  }
  // un modello: i segnaposto, le parti [opzionali]; null se un segnaposto obbligatorio è vuoto
  function rendi(tpl, V) {
    let ok = true;
    let s = tpl.replace(/\[([^\]]*)\]/g, (m, dentro) => { let vuoto = false; const t = dentro.replace(/\{(\w+)\}/g, (mm, k) => { const v = V[k]; if (!v) vuoto = true; return v || ''; }); return vuoto ? '' : t; });
    s = s.replace(/\{(\w+)\}/g, (m, k) => { const v = V[k]; if (!v) ok = false; return v || ''; });
    if (!ok) return null;
    s = s.replace(/ a (?=[AÀ])/g, ' ad ').replace(/ e (?=E[a-zà-ÿ])/g, ' ed ').replace(/\s+([.,:;!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
    return cap1(s);
  }
  // le parole della bolla (1-4): dalla scheda del verbo (segno.bolla) o dal tipo del fatto
  function paroleDi(st, f, T) {
    const S = VB() && f.x && f.x.verbo ? VB().SCHEDE[f.x.verbo] : null, b = S && S.segno && S.segno.bolla;
    let w = b && b[1] !== undefined ? b[1] : T.w;
    if (!w) return '';
    if (w[0] === '$') {
      const k = w.slice(1), x = f.x || {};
      if (k === 'cosa' || k === 'id') w = f.cosa ? cosaW(f.cosa, 'corto') : '';
      else if (k === 'ora') w = typeof x.ora === 'number' ? oraW(st, x.ora) + '?' : typeof x.t === 'number' ? oraW(st, x.t) + '?' : '';
      else if (k === 'colore') w = coloreW(f);
      else if (k === 'mestiere') w = x.mestiere || '';
      else w = typeof x[k] === 'string' ? x[k] : '';
    }
    return String(w).split(/\s+/).slice(0, 4).join(' ');
  }
  function pittoDi(f, T) {
    const S = VB() && f.x && f.x.verbo ? VB().SCHEDE[f.x.verbo] : null, b = S && S.segno && S.segno.bolla;
    return pitto(b && b[0] ? b[0] : T.p);
  }
  function posaDi(f, T) { const S = VB() && f.x && f.x.verbo ? VB().SCHEDE[f.x.verbo] : null; const p = S && S.posa ? S.posa : T.posa; return p && p !== 'cammina' ? p : null; }
  function cambiaDi(f) { const S = VB() && f.x && f.x.verbo ? VB().SCHEDE[f.x.verbo] : null; return !!(S && S.segno && S.segno.cambia) || /^casa_|^dipinge|^porta_casa|^costruisce|^smonta|^pesca$/.test(f.v); }

  // ======================= LO STATO (salvabile: solo primitivi) =======================
  function S(st) {
    const u = st.u; if (!u) return null;
    return u.segni || (u.segni = { ultimo: Math.max(0, (FT()._.M(st) || { n: 0 }).n), frecciaT: -1e9, freccia: null, direT: -1e9, detti: [], giroT: -1e9 });
  }
  const C = st => (st.u.cronaca = st.u.cronaca || { ultima: Math.floor(st.t / 1440) - (st.t % 1440 >= CFG.gazzetta.ora ? 0 : 1), edizioni: [], uscite: [] });
  const TQ = st => (st.u.taccuino = st.u.taccuino || { sentite: [] });
  let versione = 0;
  const nuove = { gz: 0, si: 0 };   // le novità da vedere nel menu (il puntino)   // cambia quando cambia qualcosa che il Taccuino mostra (le schede si ridisegnano solo allora)

  // le bolle vive (non si salvano: sono il disegno di adesso). id → { p, w, posa, fino, fid, piano }
  const ATT = new Map();

  // ======================= LA BATTUTA (D): una riga dal fatto vero =======================
  const BATTUTE = {
    chiacchiera: ['Hai sentito? {riga}', 'Sai l\'ultima? {riga}', 'Dicono in giro: {riga}', 'Lo sai, {B}? {riga}'],
    rinfacciato: ['{B}, e le mie {lire}?', '{B}, quando me li rendi, i soldi?', 'Me li devi ancora, {B}[: {lire}].', '{B}, con te ho un conto aperto.'],
    appuntamento: ['{B}, ci vediamo {ora}[ a {posto}]?', '{ora}[ a {posto}], {B}. Ci sei?', 'Allora {ora}, {B}. Non mancare.'],
    restituito: ['Tieni {B}, {cosa}. Grazie.', 'Ecco {cosa}, {B}: siamo pari.', 'Te la riporto, {B}. Come nuova.'],
    regalo: ['Per te, {B}.', 'Tieni, {B}: un pensiero.', 'Questo è tuo, {B}.'],
    prestito: ['Tieni, {B}. Me li rendi con calma.', 'Ecco i soldi, {B}. Non te li scordare.'],
    saldato: ['Ecco, {B}: siamo pari.', 'Tutto quello che ti dovevo, {B}.'],
  };
  const hashS = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  // la riga corta di un fatto (per la diceria): la prima variante che regge, coi nomi corti
  function rigaCorta(st, f) { const T = tipoDi(f.v); if (!T.r) return f.d ? cap1(f.d) + '.' : null; const V = valori(st, f, 1, 0, false); for (let i = 0; i < T.r.length; i++) { const s = rendi(T.r[(i + f.id) % T.r.length], V); if (s) return s; } return null; }
  function battuta(st, f, giaDette) {
    const L = BATTUTE[f.v]; if (!L) return null;
    let V = valori(st, f, 1, 0, false);
    if (f.v === 'chiacchiera') { const g = FT().di(st, f.x && f.x.di !== undefined ? +f.x.di : f.causa); if (!g) return null; const r = rigaCorta(st, g); if (!r) return null; V = Object.assign({}, V, { riga: r }); }
    for (let i = 0; i < L.length; i++) {
      const s = rendi(L[(i + hashS(String(f.id))) % L.length], V);
      if (s && s.length <= 90 && !giaDette.includes(hashS(s))) return s;
    }
    return null;
  }
  function dire(st, f, n, sS) {
    if (!n || n.dead || n.inside || st.clock - sS.direT < CFG.dire.ogni) return false;
    if (DOM.layer && telefono()) return false;   // [molo] al telefono niente battute nostre: il testo sta nel menu
    if (n.bark && n.bark.until > st.clock) return false;
    const s = battuta(st, f, sS.detti); if (!s) { stats.saltate++; return false; }
    try { G.say(st, n, s, Math.min(7, 2.2 + s.length / 15)); } catch (e) { return false; }
    sS.direT = st.clock; sS.detti.push(hashS(s)); if (sS.detti.length > CFG.dire.ricorda) sS.detti.splice(0, sS.detti.length - CFG.dire.ricorda);
    stats.dette++; const sentita = !!(n.bark && n.bark.until > st.clock); if (!sentita) stats.tacitate++; return sentita;
  }

  // ======================= LA FASE: ogni fatto nuovo ha il suo segno =======================
  function posDi(st, id) { if (isP(id)) return st.player; return npc(st, id); }
  function segna(st, f, sS) {
    const T = tipoDi(f.v), ch = [], p = st.player, ok = f.esito !== 'no';
    const chi = f.chi, n = posDi(st, chi), dentro = !!(n && n !== p && n.inside);
    const fx = f.dove && typeof f.dove[0] === 'number' ? f.dove[0] : n ? n.x : null, fy = f.dove && typeof f.dove[1] === 'number' ? f.dove[1] : n ? n.y : null;
    const d = fx === null || !p ? 1e9 : hyp(fx - p.x, fy - p.y);
    const visto = n === p || (n && !dentro && !(p.indoor && !n.room) && d <= CFG.picto);
    // B: la bolla
    const prima = chi && ATT.get(isP(chi) ? 'nino' : String(chi));
    if (ok && f.v === 'vai' && visto && prima && prima.scopo && prima.fino > st.clock) { ch.push('B'); stats.bolle++; }   // [molo] l'arrivo: la bolla dello scopo era già lì (resta quella, niente freccia muta)
    else if (ok && T.bolla !== false && !LIBERA.has(f.v) && visto && chi) {
      ATT.set(isP(chi) ? 'nino' : String(chi), { p: pittoDi(f, T), w: paroleDi(st, f, T), posa: posaDi(f, T), fino: st.clock + CFG.dur, fid: f.id, v: f.v, t0: st.clock });
      ch.push('B'); stats.bolle++;
      // P: la posa (la mappa delle pose la legge dalla bolla finché vive)
      if (posaDi(f, T) && d <= CFG.posaR) { ch.push('P'); stats.pose++; }
    }
    // O: il cambio nel mondo
    if (ok && cambiaDi(f)) ch.push('O');
    // D: la battuta (i verbi nuovi, che parlano: il fatto è nostro)
    if (ok && BATTUTE[f.v] && f.x && f.x.verbo && n && n !== p && d <= CFG.dire.r && dire(st, f, n, sS)) ch.push('D');
    // F: la freccia
    if (ok && (f.pub || 0) >= CFG.freccia.pub && d >= CFG.freccia.r0 && d <= CFG.freccia.r1 && st.clock - sS.frecciaT >= CFG.freccia.ogni && fx !== null) {
      sS.freccia = { x: fx, y: fy, p: pittoDi(f, T), w: paroleDi(st, f, T) || (T.n ? T.n[0] : ''), fino: st.clock + CFG.freccia.dur, fid: f.id };
      sS.frecciaT = st.clock; ch.push('F'); stats.frecce++;
    }
    // la diceria che arriva al giocatore: raccontata a lui, o sentita entro 12 m
    if (f.v === 'chiacchiera' && ok && ((f.con || []).some(isP) || (d <= CFG.dire.r && !dentro))) { const L = TQ(st).sentite; L.push(f.id); if (L.length > CFG.sentite) L.splice(0, L.length - CFG.sentite); nuove.si++; }
    // T: il Taccuino (la Cronaca di oggi li ha tutti)
    ch.push('T');
    f.segno = ch.join('+');
    stats.fatti++; stats.per[f.v] = (stats.per[f.v] || 0) + 1;
  }
  // i piani a passi di Verbo: la bolla dura tutto il verbo (anche il «va al banco»)
  function giroPiani(st) {
    const p = st.player; if (!p || !st.npcs) return;
    const REG = VB() ? VB().SCHEDE : {};
    for (const n of st.npcs) {
      const E = n.pop && n.pop.emer; if (!E || !E.verbo || n.dead || n.inside) continue;
      if (Math.abs(n.x - p.x) > CFG.picto || Math.abs(n.y - p.y) > CFG.picto) continue;
      const Sc = REG[E.verbo]; if (!Sc || !Sc.segno) continue;
      const T = tipoDi(Sc.fatto || E.verbo), step = E.steps && E.steps[E.i], cammina = !!(step && !step.verbo);
      const e = ATT.get(n.id); if (e && !e.piano && e.fino > st.clock) continue;
      let b = Sc.segno.bolla || [];
      // [molo] chi va da qualche parte per fare qualcosa (il piano della Mente) mostra lo scopo, non la freccia muta (§7.2: «vai con uno
      // scopo»): il pittogramma del verbo dopo e la cosa o la persona («› pane», «› Ada»)
      if (E.verbo === 'vai') { const q = scopoDi(st, n); if (q) ATT.set(n.id, { p: pitto(q.p), w: q.w, posa: null, fino: st.clock + CFG.durPiano, fid: null, v: 'vai', piano: true, scopo: true, t0: e ? e.t0 : st.clock }); continue; }   // senza scopo, la freccia muta non dice niente: niente bolla
      let w = b[1] && b[1][0] !== '$' ? b[1] : '';
      if (!w && b[1] === '$cosa' && E.label) { const m = E.label.match(/^[A-ZÀ-Ú][a-zà-ú]+ (.+?)(?: \(| da | per |$)/); w = m ? m[1].split(/\s+/).slice(0, 3).join(' ') : ''; }
      ATT.set(n.id, { p: pitto(b[0] || T.p), w, posa: cammina ? null : Sc.posa && Sc.posa !== 'cammina' ? Sc.posa : null, fino: st.clock + CFG.durPiano, fid: null, v: E.verbo, piano: true, t0: e ? e.t0 : st.clock });
    }
  }
  // lo scopo di un «vai» della Mente: il primo passo del piano, dopo quello in corso, che non è un altro «vai»
  const SCOPO_W = { lavora: 'al lavoro', pesca: 'a pescare', mangia: 'a mangiare', beve: 'a bere', dormi: 'a dormire', costruisci: 'al cantiere', dipingi_muro: 'al muro', ridipingi: 'a casa', arreda: 'a casa' };
  function scopoDi(st, n) {
    const MU = typeof MenteUnica !== 'undefined' && MenteUnica.ON ? MenteUnica : typeof Mente !== 'undefined' && Mente.ON && Mente.OBIETTIVI ? Mente : null, M = MU && st.u && st.u.menti ? st.u.menti[n.id] : null, Pi = M && M.piano;
    if (!Pi || !Pi.passi) return null;
    for (let i = Pi.i; i < Pi.passi.length && i < Pi.i + 6; i++) {
      const t = Pi.passi[i], v = t[0], a = t[1] || {}; if (v === 'vai') continue;
      if (v === '@procura') return a.cosa ? { p: 'moneta', w: '› ' + cosaW(a.cosa, 'corto') } : null;
      if (v === '@vendi') return a.cosa ? { p: 'moneta+', w: '› ' + cosaW(a.cosa, 'corto') } : null;
      if (v[0] === '@') return null;
      const Sc = VB() && VB().SCHEDE[v], b = Sc && Sc.segno && Sc.segno.bolla; if (!b) return null;
      const chi = a.chi != null && a.chi !== 'nino' ? nomeDi(st, a.chi) : a.chi === 'nino' ? 'te' : '';
      const w = a.cosa ? cosaW(a.cosa, 'corto') : chi ? chi : SCOPO_W[v] || (b[1] && b[1][0] !== '$' ? b[1] : '');
      return { p: b[0] || 'freccia', w: w ? '› ' + w : '' };
    }
    // un piano di soli «vai» (a casa, in chiesa): la meta dall'obiettivo
    const g = M.ob && M.ob.g, w = SCOPO_OB[g]; return w ? { p: 'freccia', w: '› ' + w } : null;
  }
  const SCOPO_OB = { igiene: 'a casa', dormire: 'a casa', pregare: 'in chiesa', lavorare: 'al lavoro', mangiare: 'a mangiare', divertirsi: 'a svagarsi', socializzare: 'in compagnia' };
  function fase(st) {
    const sS = S(st); if (!sS) return;
    const F = FT(), M = F._.M(st); if (!M) return;
    const t0 = now();
    let k = 0;
    while (sS.ultimo < M.n && k < CFG.perPasso) { sS.ultimo++; k++; const f = F.di(st, sS.ultimo); if (f) segna(st, f, sS); }
    if (k) versione++;
    if (st.clock - sS.giroT >= CFG.giro) {
      sS.giroT = st.clock; giroPiani(st);
      for (const [id, e] of ATT) if (e.fino <= st.clock) ATT.delete(id);
    }
    gazzettaSeServe(st);
    const ms = now() - t0; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
  }

  // ======================= LA GAZZETTA DEL PORTO (C) =======================
  function gazzettaSeServe(st) {
    const c = C(st), g = Math.floor(st.t / 1440);
    if (st.t % 1440 < CFG.gazzetta.ora || c.ultima >= g) return null;
    c.ultima = g;
    const E = edizione(st, g); if (!E) return null;
    c.edizioni.unshift(E); if (c.edizioni.length > CFG.gazzetta.edizioni) c.edizioni.length = CFG.gazzetta.edizioni;
    versione++; stats.edizioni++;
    nuove.gz++;   // [molo] niente riga nel feed (restava sullo schermo): il puntino sul bottone del menu della banda
    return E;
  }
  // un'edizione: i fatti dalle 7 del giorno prima alle 7 di oggi
  function edizione(st, g) {
    const F = FT(), t1 = g * 1440 + CFG.gazzetta.ora, t0 = t1 - 1440, c = C(st), GZ = CFG.gazzetta;
    const grp = new Map();
    for (const f of F.tutti(st)) {
      if (f.t < t0 || f.t >= t1 || f.esito === 'no' || f.gz !== undefined) continue;
      const T = tipoDi(f.v); if (!T.gz || (!T.r && !f.d)) continue;
      const k = f.v + '|' + f.chi + '|' + ((f.con || [])[0] || '') + '|' + (f.cosa || '');
      let q = grp.get(k); if (!q) grp.set(k, q = { k, v: f.v, T, fatti: [], pub: 0, hop: 0, q: 0, soldi: 0 });
      q.fatti.push(f); q.pub = Math.max(q.pub, f.pub || 0); q.hop = Math.max(q.hop, f.hop || 0); q.q += f.q || 1; q.soldi += typeof f.soldi === 'number' ? Math.abs(f.soldi) : 0;
    }
    const L = Array.from(grp.values());
    for (const q of L) { const r = q.fatti.reduce((s, f) => Math.max(s, f.ril || 0), 0); q.score = q.T.gz * (.35 + q.pub) * (q.hop >= 2 ? 1.6 : 1) * (1 + .15 * Math.log2(q.fatti.length)) * (.6 + r); }
    L.sort((a, b) => b.score - a.score || a.fatti[0].id - b.fatti[0].id);
    const perTipo = {}, perChi = {}, righe = [], recenti = new Set(c.uscite);
    for (const q of L) {
      if (righe.length >= GZ.righe + GZ.breve) break;
      const chi = q.fatti[0].chi; if ((perTipo[q.v] || 0) >= GZ.perTipo || (perChi[chi] || 0) >= GZ.perChi) continue;
      const f = q.fatti[0], V = valori(st, f, q.fatti.length, q.q, true);
      if (q.soldi && q.fatti.length > 1) V.lire = lire(q.soldi);
      let testo = null;
      const R = q.T.r || [];
      for (let i = 0; i < R.length && !testo; i++) { const s = rendi(R[(i + hashS(q.k)) % R.length], V); if (s && !recenti.has(hashS(s))) testo = s; }
      if (!testo && !R.length && f.d) { const s = cap1(String(f.d)) + '.'; if (!recenti.has(hashS(s))) testo = s; }
      if (!testo) continue;
      if (V.n && !/volte/.test(testo) && !(q.q > 1 && V.cosaN && testo.includes(V.cosaN))) testo = testo.replace(/\.$/, '') + ` (${V.n}).`;
      perTipo[q.v] = (perTipo[q.v] || 0) + 1; perChi[chi] = (perChi[chi] || 0) + 1;
      const sez = luogoW(st, f) || 'In città';
      righe.push({ sez, testo, f: q.fatti.map(x => x.id), breve: righe.length >= GZ.righe, hop: q.hop });
      recenti.add(hashS(testo)); c.uscite.push(hashS(testo));
      for (const x of q.fatti) { x.gz = g; x.segno = (x.segno ? x.segno + '+' : '') + 'C'; }
    }
    if (c.uscite.length > GZ.ricorda) c.uscite.splice(0, c.uscite.length - GZ.ricorda);
    if (!righe.length) return null;
    stats.righe += righe.length;
    return { g, t: t1, giorno: G.dayName ? G.dayName(t1) : 'giorno ' + g, righe };
  }

  // ======================= IL TACCUINO (T): le schede, pure (HTML da dati) =======================
  // la Cronaca di oggi: tutti i fatti dall'ultima edizione, per posto e per tipo (ognuno ci entra)
  function cronacaOggi(st) {
    const F = FT(), c = C(st), t0 = c.ultima * 1440 + CFG.gazzetta.ora, out = new Map();
    for (const f of F.tutti(st)) {
      if (f.t < t0) continue;
      const l = luogoW(st, f) || 'In città'; let P = out.get(l); if (!P) out.set(l, P = { luogo: l, tipi: new Map(), n: 0, migliori: [] });
      let q = P.tipi.get(f.v); if (!q) P.tipi.set(f.v, q = { v: f.v, f: [] }); q.f.push(f.id); P.n++;
      if (f.esito !== 'no' && tipoDi(f.v).r) P.migliori.push(f);
    }
    const L = Array.from(out.values()).sort((a, b) => b.n - a.n);
    for (const P of L) { P.migliori.sort((a, b) => (b.ril || 0) - (a.ril || 0) || b.id - a.id); P.migliori = P.migliori.slice(0, 2).map(f => ({ id: f.id, testo: rigaCorta(st, f) })).filter(x => x.testo); }
    return L;
  }
  function htmlGazzetta(st) {
    const E = C(st).edizioni;
    if (!E.length) return '<p class="hint">La Gazzetta del Porto esce alle sette di mattina, con i fatti del giorno prima. Ancora nessuna edizione.</p>';
    return E.slice(0, 3).map((e, i) => {
      const sez = []; for (const r of e.righe.filter(r => !r.breve)) { let s = sez.find(x => x.n === r.sez); if (!s) sez.push(s = { n: r.sez, r: [] }); s.r.push(r); }
      const brevi = e.righe.filter(r => r.breve);
      return `<div class="us-gz${i ? ' vecchia' : ''}"><h3>GAZZETTA DEL PORTO <small>· ${esc(cap1(e.giorno))}</small></h3>` +
        sez.map(s => `<h4>— ${esc(s.n.toUpperCase())} —</h4><ul>${s.r.map(r => `<li data-f="${r.f.join(',')}">${esc(r.testo)}</li>`).join('')}</ul>`).join('') +
        (brevi.length ? `<h4>— IN BREVE —</h4><ul>${brevi.map(r => `<li data-f="${r.f.join(',')}">${esc(r.testo)}</li>`).join('')}</ul>` : '') + '</div>';
    }).join('');
  }
  const uno = w => { const L = LG(); try { return L ? L.art(w, 'ind') : 'un ' + w; } catch (e) { return 'un ' + w; } };
  function htmlCronaca(st) {
    const L = cronacaOggi(st), tot = L.reduce((s, P) => s + P.n, 0);
    if (!tot) return '<p class="hint">Dall\'uscita della Gazzetta non è successo ancora niente.</p>';
    return `<p class="hint">Quello che è successo dalle sette, posto per posto (${tot} fatti). Domattina il meglio finisce sulla Gazzetta.</p>` +
      L.slice(0, 10).map(P => {
        const tipi = Array.from(P.tipi.values()).sort((a, b) => b.f.length - a.f.length).map(q => { const nn = tipoDi(q.v).n || ['fatto', 'fatti']; return q.f.length === 1 ? uno(nn[0]) : `${q.f.length} ${nn[1]}`; });
        return `<h4>${esc(P.luogo)}</h4><p>${esc(cap1(tipi.slice(0, 6).join(', ')))}${tipi.length > 6 ? '…' : ''}.</p>${P.migliori.length ? `<ul>${P.migliori.map(m => `<li data-f="${m.id}">${esc(m.testo)}</li>`).join('')}</ul>` : ''}`;
      }).join('');
  }
  function sentite(st) {
    const F = FT(); return TQ(st).sentite.slice().reverse().map(id => F.di(st, id)).filter(Boolean).map(g => {
      const f = F.di(st, g.x && g.x.di !== undefined ? +g.x.di : g.causa); const r = f && rigaCorta(st, f); if (!r) return null;
      return { id: g.id, di: f.id, t: g.t, da: nomeDi(st, g.chi), a: nomeDi(st, (g.con || [])[0]), testo: r };
    }).filter(Boolean);
  }
  function htmlSentito(st) {
    const L = sentite(st).slice(0, 12);
    return '<p class="hint">Le voci che ti sono arrivate: raccontate a te, o sentite passando. Sono fatti veri; chi le racconta non sempre c\'era.</p>' +
      `<ul>${L.length ? L.map(x => `<li data-f="${x.id},${x.di}"><small>${esc(G.dayName ? G.dayName(x.t) : '')} ${esc(G.clockStr ? G.clockStr(x.t) : '')}</small> · ${esc(x.da)}${x.a ? ' ' + esc(aN(x.a)) : ''}: «${esc(x.testo)}»</li>`).join('') : '<li><span style="opacity:.7">Ancora niente. Passa vicino alla gente che parla.</span></li>'}</ul>`;
  }
  function conti(st) {
    const F = FT(), out = [], io = 'nino', visti = new Set();
    const mieF = F.per(st, { chi: io }).concat(F.per(st, { chi: 'player' }));
    for (const f of mieF) for (const a of [f.chi].concat(f.con || [])) if (a && !isP(a) && !/^bottega:/.test(a)) visti.add(String(a));
    for (const a of visti) {
      const d = F.debito(st, io, a), r1 = F.rancore(st, a, io), r2 = F.rancore(st, io, a), n = nomeDi(st, a); if (!n) continue;
      if (d > 0) out.push({ k: 'debito', testo: `${n} ti deve ${lire(d)}.`, chi: a });
      if (d < 0) out.push({ k: 'debito', testo: `Devi ${lire(-d)} ${aN(n)}.`, chi: a });
      if (r1 >= .2) out.push({ k: 'rancore', testo: `${n} ce l'ha con te.`, chi: a });
      if (r2 >= .2) out.push({ k: 'rancore', testo: `Tu ce l'hai con ${n}.`, chi: a });
    }
    for (const f of F.per(st, { tipo: 'appuntamento' })) {
      const ora = f.x && typeof f.x.ora === 'number' ? f.x.ora : f.x && typeof f.x.t === 'number' ? f.x.t : null; if (f.esito === 'no' || ora === null || ora <= st.t) continue;
      const at = [f.chi].concat(f.con || []), mio = at.some(isP); if (!mio && !(f.vis >= 1)) continue;
      const altri = at.filter(a => !isP(a)).map(a => nomeDi(st, a)).filter(Boolean), dove = f.x.posto && G.PLACES[f.x.posto] ? ' ' + aN(G.PLACES[f.x.posto].name) : f.x.dove ? ' ' + aN(f.x.dove) : '';
      out.push({ k: 'appuntamento', testo: mio ? `Appuntamento con ${altri.join(' e ')} ${oraW(st, ora)}${dove}.` : `${altri.join(' e ')}: si vedono ${oraW(st, ora)}${dove}.`, fra: !mio, f: f.id });
    }
    // fra gli altri: i prestiti che hai visto, ancora aperti
    for (const f of F.per(st, { tipo: 'prestito' })) {
      if (f.vis < 1 || f.esito === 'no' || st.t - f.t > 2 * 1440) continue; const [a, b] = [f.chi, (f.con || [])[0]]; if (!a || !b || isP(a) || isP(b)) continue;
      const kk = a + '>' + b; if (visti.has(kk)) continue; visti.add(kk);
      const d = F.debito(st, a, b); if (d > 0) out.push({ k: 'debito', testo: `${nomeDi(st, b)} deve ${lire(d)} ${aN(nomeDi(st, a))}.`, fra: true, f: f.id });
    }
    return out;
  }
  function htmlConti(st) {
    const L = conti(st), mie = L.filter(x => !x.fra), loro = L.filter(x => x.fra).slice(0, 8);
    const li = x => `<li class="${x.k}">${esc(x.testo)}</li>`;
    return '<p class="hint">Debiti, rancori e appuntamenti: i tuoi, e quelli degli altri che hai visto. Vengono dai fatti, non da quello che si dice.</p>' +
      `<h4>I tuoi</h4><ul>${mie.length ? mie.map(li).join('') : '<li><span style="opacity:.7">Nessun conto aperto.</span></li>'}</ul>` +
      `<h4>Fra loro</h4><ul>${loro.length ? loro.map(li).join('') : '<li><span style="opacity:.7">Niente che tu abbia visto.</span></li>'}</ul>`;
  }
  const SCHEDE = [['u_gazzetta', 'Gazzetta', htmlGazzetta], ['u_cronaca', 'Cronaca di oggi', htmlCronaca], ['u_sentito', 'Si dice', htmlSentito], ['u_conti', 'Conti aperti', htmlConti]];
  // altre schede si aggiungono qui (lo stesso osservatore): Segni.scheda('u_cose', 'Cose di …', st => html)
  function scheda(k, nome, fn) { const i = SCHEDE.findIndex(x => x[0] === k); if (i >= 0) SCHEDE[i] = [k, nome, fn]; else SCHEDE.push([k, nome, fn]); }

  // ======================= LA PAGINA (solo nel browser): bolle, freccia, Taccuino =======================
  const CSS = [
    '#unico-segni{position:absolute;inset:0;pointer-events:none;overflow:hidden}',
    '#unico-segni .us-b{position:absolute;left:0;top:0;display:flex;align-items:center;gap:5px;padding:2px 7px 3px 3px;background:rgba(22,18,27,.86);color:#F2E7CF;font:500 16px/1.15 "Pixelify Sans",sans-serif;white-space:nowrap;border-radius:1px 3px 1px 2px;box-shadow:2px 2px 0 rgba(22,18,27,.35);will-change:transform}',
    '#unico-segni .us-b::after{content:"";position:absolute;left:50%;bottom:-7px;width:2px;height:7px;transform:translateX(-50%);background:rgba(22,18,27,.86)}',
    '#unico-segni .us-b img{width:26px;height:26px;display:block}',
    '#unico-segni .us-b.picto{padding:3px}',
    '#unico-segni .us-b.picto img{width:36px;height:36px}',
    '#unico-segni .us-b.accanto{padding:2px}',
    '#unico-segni .us-b.accanto::after{display:none}',
    '#unico-segni .us-b.accanto img{width:24px;height:24px}',
    '#unico-segni .us-b.mio{box-shadow:2px 2px 0 rgba(220,154,52,.75)}',
    '#unico-segni .us-f{position:absolute;left:0;top:0;display:flex;align-items:center;gap:4px;padding:3px 8px 3px 4px;background:rgba(22,18,27,.9);color:#F2E7CF;font:500 16px/1.1 "Pixelify Sans",sans-serif;white-space:nowrap;border:2px solid #DC9A34;will-change:transform}',
    '#unico-segni .us-f img{width:28px;height:28px;display:block}',
    '#unico-segni .us-f i{display:block;width:0;height:0;border:9px solid transparent;border-left:13px solid #DC9A34;margin-right:-6px}',
    '#book .us-tac{font-size:16px;line-height:1.45}',
    '#book .us-tac h3{margin:4px 0 6px;font:700 20px/1.2 Silkscreen,monospace;letter-spacing:.04em}',
    '#book .us-tac h3 small{font:400 15px sans-serif;letter-spacing:0;opacity:.75}',
    '#book .us-tac h4{margin:12px 0 4px;font:600 15px/1.2 Silkscreen,monospace;letter-spacing:.06em;color:#6F2B2E}',
    '#book .us-tac ul{margin:0 0 4px;padding-left:18px}',
    '#book .us-tac li{margin:2px 0}',
    '#book .us-tac .us-gz{border-bottom:2px solid #2a2030;padding-bottom:10px;margin-bottom:12px}',
    '#book .us-tac .us-gz.vecchia{opacity:.72}',
    '#book .us-tac li.debito{color:#6F2B2E}',
  ].join('\n');
  const DIS = { a: new Float64Array(600), i: 0, n: 0, max: 0 };
  function disegno() { const L = Array.from(DIS.a.subarray(0, Math.min(DIS.n, 600))).sort((x, y) => x - y), q = p => (L.length ? L[Math.min(L.length - 1, Math.floor(p * L.length))] : 0); return { n: DIS.n, p50: q(.5), p95: q(.95), p99: q(.99), max: DIS.max }; }
  const DOM = { layer: null, pool: [], fr: null, hudR: [], hudT: -1e9, parlate: 0, parlateT: -1e9 };
  const telefono = () => (W0 && W0.Commedia && W0.Commedia.telefono ? W0.Commedia.telefono() : typeof innerWidth === 'number' && innerWidth < 700);
  // al telefono 2 fumetti pieni in tutto (contando quelli di commedia), gli altri pittogrammi; sul fisso 4 + 4. Puro, per la prova
  function scegli(C0, opt) {
    opt = opt || {}; const tel = !!opt.tel, parlate = opt.parlate || 0;
    const L = C0.slice().sort((a, b) => (b.pr || 0) - (a.pr || 0) || a.d - b.d);
    const maxP = tel ? Math.max(0, CFG.max.tel - parlate) : CFG.max.piene, maxI = tel ? CFG.max.telPicto : CFG.max.picto;
    const out = []; let np = 0, ni = 0;
    for (const c of L) {
      let modo = c.modo;
      if (modo === 'piena' && np >= maxP) modo = 'picto';
      if (modo === 'piena') { np++; out.push(Object.assign({}, c, { modo })); continue; }
      if (ni >= maxI) continue; ni++; out.push(Object.assign({}, c, { modo }));
    }
    return out;
  }
  function riquadri() {
    const t = now(); if (t - DOM.hudT < 500) return DOM.hudR; DOM.hudT = t; DOM.hudR = [];
    const Lr = DOM.layer.getBoundingClientRect();
    // [molo] tutto il HUD (le scatole .hud di main.js, orienta, protagonista, comandi: soldi, bisogni, feed, comandi, mappa), non solo
    // quattro: una bolla finiva sotto il riquadro dei soldi. Si salta chi copre lo schermo intero (il Taccuino, il dialogo, lo schermo)
    const L0 = Array.from(document.querySelectorAll('#app .hud, #or-obj, #stick, #stick2, #rs-hud, #dock'));
    for (const e of L0) {
      if (!e || e.hidden || e.id === 'screen' || e.id === 'book' || e.id === 'dialog') continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.width * r.height > Lr.width * Lr.height * .4) continue;
      const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      DOM.hudR.push({ l: r.left - Lr.left, t: r.top - Lr.top, r: r.right - Lr.left, b: r.bottom - Lr.top });
    }
    return DOM.hudR;
  }
  const evitaHud = (b, W, H) => { const Cm = W0 && W0.Commedia && W0.Commedia._; const R = riquadri(); return Cm && Cm.evita && R.length ? Cm.evita(b, R, W, H, 6, 44) : b; };
  function el(i) {
    let e = DOM.pool[i]; if (!e) { e = document.createElement('div'); e.className = 'us-b'; e.hidden = true; DOM.layer.appendChild(e); DOM.pool.push(e); }
    return e;
  }
  function metti(e, cls, html, X, Y) {
    if (e.hidden) e.hidden = false;
    if (e.__c !== cls) { e.__c = cls; e.className = cls; stats.dom++; }
    if (e.__h !== html) { e.__h = html; e.innerHTML = html; stats.dom++; }
    X = Math.round(X * 2) / 2; Y = Math.round(Y * 2) / 2;
    if (e.__x !== X || e.__y !== Y) { e.__x = X; e.__y = Y; e.style.transform = `translate(${X}px,${Y}px) translate(-50%,-100%)`; stats.dom++; }
  }
  function disegna() {
    const pv = W0.__pv, st = pv && pv.st, R = W0.Render || (pv && pv.R);
    if (!DOM.layer || !st || !st.u || !R || !R.project) return;
    const p = st.player, ui = pv.ui || {}, app = DOM.layer.parentNode, W = app.clientWidth, H = app.clientHeight;
    const spento = ui.intro || W0.__pulita || (p.lv && p.lv.k === 'ug') || st.over;
    const C0 = [];
    if (!spento) for (const [id, e] of ATT) {
      if (e.fino <= st.clock) continue;
      const n = id === 'nino' ? p : npc(st, id); if (!n || n.dead) continue;
      if (n !== p && (n.inside || (p.indoor && !n.room))) continue;
      const d = n === p ? 0 : hyp(n.x - p.x, n.y - p.y); if (d > CFG.picto) continue;
      const pr = R.project(n.x, n === p && p.vehicle ? 2.6 : 2.35, n.y); if (pr.behind || pr.x < -.05 || pr.x > 1.05 || pr.y < -.05 || pr.y > 1.05) continue;
      const parla = n !== p && n.bark && n.bark.until > st.clock && d < 26;
      const tag = n !== p && d < 5.5 && !n.passante && !p.vehicle;
      C0.push({ id, e, d, tag, X: pr.x * W, Y: pr.y * H, modo: parla ? 'accanto' : d <= CFG.piena && e.w ? 'piena' : 'picto', pr: (e.piano ? .2 : .5) + (n === p ? .3 : 0) });
    }
    const t = now(); if (t - DOM.parlateT > 250) { DOM.parlateT = t; const B = document.getElementById('bubbles'); DOM.parlate = B ? B.querySelectorAll('.bub:not([hidden]):not(.cm-zitto)').length : 0; }
    const L = scegli(C0, { tel: telefono(), parlate: DOM.parlate });
    // [molo] i cartellini dei nomi di main.js (entro 5,5 m, sopra la testa) sono ostacoli per tutte le bolle, non solo per quella di chi
    // ha il cartellino: una bolla non copre mai il nome di un altro. La scatola si stima (nessuna lettura della pagina)
    const tags = [];
    if (L.length && !spento && !p.vehicle) for (const n of st.npcs) {
      if (n.dead || n.passante || (n.inside && !n.room) || (p.indoor && !n.room)) continue;
      const dx = n.x - p.x, dy = n.y - p.y; if (dx > 5.5 || dx < -5.5 || dy > 5.5 || dy < -5.5 || hyp(dx, dy) >= 5.5) continue;
      const pr = R.project(n.x, 2.35, n.y); if (pr.behind) continue;
      tags.push({ X: pr.x * W, Y: pr.y * H + 1, w: Math.max(44, String(n.first || '').length * 7.5 + 14), h: 29, tag: true });
    }
    const boxes = tags.slice();
    const sopra = (a, b) => Math.abs(a.X - b.X) < (a.w + b.w) / 2 + 2 && b.Y - b.h < a.Y + (a.tag ? 0 : 7) && a.Y - a.h < b.Y + 7;   // la bolla ha la coda (7 px), il cartellino no
    let i = 0;
    for (const c of L) {
      const e = el(i++), u = urlDi(c.e.p), img = u ? `<img alt="" src="${u}">` : `<b>${esc(c.e.p)}</b>`;
      const cls = 'us-b ' + c.modo + (c.id === 'nino' ? ' mio' : ''), html = c.modo === 'piena' ? img + `<span>${esc(c.e.w)}</span>` : img;
      // la stima della scatola (senza leggere la pagina): larghezza dal testo, altezza fissa per modo
      const w = c.modo === 'piena' ? 40 + c.e.w.length * 8.6 : c.modo === 'picto' ? 44 : 30, h = c.modo === 'piena' ? 32 : c.modo === 'picto' ? 44 : 30;
      let X = c.X, Y = c.Y - 6; if (c.modo === 'accanto') { X += 30; Y = c.Y + 30; }
      else if (c.tag) Y -= 31;   // il cartellino del nome di main.js (entro 5,5 m) sta lì: la bolla sale sopra
      const b = { X: clamp(X, w / 2 + 6, Math.max(w / 2 + 6, W - w / 2 - 6)), Y: clamp(Y, h + 44, Math.max(h + 44, H - 6)), w, h };
      evitaHud(b, W, H);
      // sopra chi c'è già (cartellini e bolle già messe, coda compresa: 8 px), dal più basso al più alto
      for (let g = 0; g < 4; g++) { let mosso = false; for (const a of boxes) if (sopra(a, b)) { b.Y = Math.max(h + 44, a.Y - a.h - 9); mosso = true; } if (!mosso) break; }
      boxes.push(b); metti(e, cls, html, b.X, b.Y);
    }
    for (; i < DOM.pool.length; i++) if (!DOM.pool[i].hidden) DOM.pool[i].hidden = true;
    // la freccia
    const sS = st.u.segni, F0 = sS && sS.freccia, fr = DOM.fr;
    if (fr && !CFG.freccia.schermo && !fr.hidden) fr.hidden = true;
    if (fr && CFG.freccia.schermo) {
      if (!spento && F0 && F0.fino > st.clock) {
        const pr = R.project(F0.x, 1.2, F0.y); let px = pr.x, py = pr.y; if (pr.behind) { px = 1 - px; py = 1 - py; }
        const fuori = pr.behind || px < .06 || px > .94 || py < .1 || py > .9;
        const cx = clamp(px, .07, .93) * W, cy = clamp(py, .12, .88) * H, a = Math.atan2(py * H - H / 2, px * W - W / 2);
        const u = urlDi(F0.p), html = `<i style="transform:rotate(${Math.round(a * 100) / 100}rad)"></i>${u ? `<img alt="" src="${u}">` : ''}<span>${esc(F0.w || '')}</span>`;
        if (fr.hidden) fr.hidden = false;
        if (fr.__h !== html) { fr.__h = html; fr.innerHTML = html; stats.dom++; fr.__w = 0; }
        if (!fr.__w) fr.__w = Math.max(60, fr.offsetWidth || 150);   // [molo] la larghezza vera (letta una volta per testo): la stima di 150 px lasciava la punta sulla mappa
        const fw = fr.__w, bx = clamp(fuori ? cx : px * W, fw / 2 + 8, Math.max(fw / 2 + 8, W - fw / 2 - 8));
        const b = evitaHud({ X: bx, Y: Math.min(H * .8, fuori ? cy : py * H - 40) + 20, w: fw + 8, h: 44 }, W, H);   // evita vuole il fondo della scatola
        const T = `translate(${Math.round(b.X)}px,${Math.round(b.Y - 20)}px) translate(-50%,-50%)`; if (fr.__t !== T) { fr.__t = T; fr.style.transform = T; stats.dom++; }
      } else if (!fr.hidden) fr.hidden = true;
    }
  }
  function installaPagina() {
    if (typeof document === 'undefined' || !document.createElement) return;
    const css = document.createElement('style'); css.id = 'unico-segni-css'; css.textContent = CSS; (document.head || document.documentElement).appendChild(css);
    const pronto = () => {
      const B = document.getElementById('bubbles'); if (!B || !B.parentNode) return false;
      const L = document.createElement('div'); L.className = 'layer'; L.id = 'unico-segni'; B.parentNode.insertBefore(L, B.nextSibling);
      DOM.layer = L; DOM.fr = document.createElement('div'); DOM.fr.className = 'us-f'; DOM.fr.hidden = true; L.appendChild(DOM.fr);
      // [molo] il costo del disegno per fotogramma (bolle, cartellini, freccia): un anello di 600, Segni.disegno() dà p50/p95/max
      const giro = () => { const t0 = now(); try { disegna(); } catch (e) { if (!giro.err) { giro.err = 1; console.warn('[Segni]', e); } } const d = now() - t0; DIS.a[DIS.i] = d; DIS.i = (DIS.i + 1) % DIS.a.length; DIS.n++; if (d > DIS.max) DIS.max = d; requestAnimationFrame(giro); };
      requestAnimationFrame(giro);
      return true;
    };
    const t = setInterval(() => { if (pronto()) clearInterval(t); }, 300);
    installaTaccuino();
    installaPose();
  }
  // [molo] IL TACCUINO NEL MENU DELLA BANDA. Niente di nostro resta sullo schermo: le quattro schede (Gazzetta, Cronaca di oggi, Si
  // dice, Conti aperti) stanno in una scheda «Città» del pannello della banda (#rs-panel di risacca_ui.js, il tasto B o «Risacca»),
  // aggiunta da qui con un solo MutationObserver (il pannello si ridisegna da sé: la scheda si rimette). Sul bottone del menu
  // (#rs-open) un puntino col numero delle novità (Gazzetta uscita, dicerie arrivate), che si azzera aprendo la scheda.
  function installaTaccuino() {
    if (typeof MutationObserver === 'undefined') return;
    let mia = false, sez = 'u_gazzetta', obs = null, vista = -1;
    const pan = () => document.getElementById('rs-panel');
    const css = document.createElement('style'); css.textContent = [
      '#dock .us-badge{position:absolute;left:-4px;bottom:-4px;margin:0}', '.us-badge{display:inline-block;min-width:16px;height:16px;margin-left:6px;padding:0 4px;border-radius:8px;background:#C25B36;color:#F2E7CF;font:700 11px/16px sans-serif;text-align:center;vertical-align:middle}',
      '#rs-panel .us-tac{font-size:16px;line-height:1.45}', '#rs-panel .us-sez{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}',
      '#rs-panel .us-sez button{font-family:var(--f-pix);font-size:14px;padding:4px 9px;border:2px solid #2a2030;background:#f7eedb;color:#2a2030;cursor:pointer}',
      '#rs-panel .us-sez button[aria-pressed="true"]{background:#2a2030;color:#efe3c8}',
      '#rs-panel .us-tac h3{margin:4px 0 6px;font:700 19px/1.2 Silkscreen,monospace}', '#rs-panel .us-tac h4{margin:12px 0 4px;font:600 15px/1.2 Silkscreen,monospace;color:#6F2B2E}',
      '#rs-panel .us-tac ul{margin:0 0 4px;padding-left:18px}', '#rs-panel .us-tac .us-gz{border-bottom:2px solid #2a2030;padding-bottom:10px;margin-bottom:12px}', '#rs-panel .us-tac .us-gz.vecchia{opacity:.72}'].join('\n');
    (document.head || document.documentElement).appendChild(css);
    const mostra = () => {
      const P = pan(), st = W0.__pv && W0.__pv.st; if (!P || !st || !st.u || !mia) return;
      const body = P.querySelector('.body'), nav = P.querySelector('nav'); if (!body || !nav) return;
      if (obs) obs.disconnect();
      nav.querySelectorAll('button').forEach(x => { const s0 = String(x.dataset.t === 'u_citta'); if (x.getAttribute('aria-selected') !== s0) x.setAttribute('aria-selected', s0); });
      const S0 = SCHEDE.find(x => x[0] === sez) || SCHEDE[0]; let h = ''; try { h = S0[2](st); } catch (e) { h = '<p class="hint">…</p>'; console.warn('[Segni]', e); }
      h = `<div class="us-tac"><div class="us-sez">${SCHEDE.map(([k, w]) => `<button data-us="${k}" aria-pressed="${k === sez}">${esc(w)}</button>`).join('')}</div>${h}</div>`;
      if (body.__us !== h) { body.__us = h; body.innerHTML = h; body.querySelectorAll('[data-us]').forEach(b => b.onclick = e => { e.stopPropagation(); sez = b.dataset.us; mostra(); }); }
      vista = versione; nuove.gz = 0; nuove.si = 0; badge();
      if (obs) obs.observe(P, { childList: true });
    };
    const decora = () => {
      const P = pan(), nav = P && P.querySelector('nav'); if (!nav) return;
      if (!nav.querySelector('[data-t="u_citta"]')) { const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.dataset.t = 'u_citta'; b.setAttribute('aria-selected', 'false'); b.textContent = 'Città'; b.onclick = e => { e.stopPropagation(); mia = true; mostra(); }; nav.appendChild(b); }
      const body = P.querySelector('.body'); if (body) body.__us = null;
      if (mia) mostra();
    };
    let ultimoB = '';
    function badge() {
      // il bottone del menu: «Risacca» (B) sul fisso; al telefono (dove è nascosto) lo zaino del dock, da cui si arriva alla Risacca
      let B = document.getElementById('rs-open'); if (!B || !B.offsetParent) { const D = document.getElementById('dock'); B = D ? D.querySelector('button:last-of-type') : null; } if (!B) return; const n = nuove.gz + nuove.si, t = n ? String(Math.min(n, 9)) + (n > 9 ? '+' : '') : '';
      if (t === ultimoB && (!t || B.querySelector('.us-badge'))) return; ultimoB = t;
      let e = B.querySelector('.us-badge'); if (!t) { if (e) e.remove(); return; }
      if (!e) { e = document.createElement('span'); e.className = 'us-badge'; e.setAttribute('aria-label', 'novità in città'); B.appendChild(e); } e.textContent = t;
    }
    const via = () => {
      const P = pan(); if (!P) { setTimeout(via, 500); return; }
      P.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('nav button[data-tab]'); if (t) mia = false; }, true);
      obs = new MutationObserver(decora); obs.observe(P, { childList: true }); decora();
      setInterval(() => { badge(); const Q = pan(); if (mia && Q && Q.childElementCount && vista !== versione) mostra(); }, 1000);
    };
    via();
    Segni.apriScheda = k => { mia = true; if (k) sez = k; const B = document.getElementById('rs-open'), P = pan(); if (B && P && !P.childElementCount) B.click(); setTimeout(() => { decora(); mostra(); }, 60); };
    Segni.nuove = nuove;
  }
  // la posa: la bolla viva (o il passo del piano) dice la posa; si mette solo da fermi, fuori, come fa anim_vita coi piani
  function installaPose() {
    const A = typeof Anim !== 'undefined' ? Anim : null; if (!A || !A.npcPost) return;
    const put = (v, s) => { if (!v || !A.POSES) return; const k = v.endsWith('_su') ? v.slice(0, -3) : v; if (!A.POSES[k]) return; if (v.endsWith('_su')) s.upper = k; else s.act = k; };
    A.npcPost((st, n, s) => {
      if (n.dead || n.inside || n.inVeh || n.stun > 0 || Math.abs(n.speedNow || 0) > .3) return;
      const E = n.pop && n.pop.emer;
      if (E && E.verbo && E.phase === 'do') { const q = E.steps && E.steps[E.i]; if (q && q.posa && q.posa !== 'cammina') { put(q.posa, s); return; } }
      const e = ATT.get(n.id); if (e && e.posa && e.fino > st.clock && !e.piano) put(e.posa, s);
    });
    if (A.playerMap) A.playerMap((st, p, s) => {
      if (p.vehicle || p.stun > 0 || Math.abs(p.speedNow || 0) > .3) return;
      const e = ATT.get('nino'); if (e && e.posa && e.fino > st.clock && st.clock - e.t0 < 3.5) put(e.posa, s);
    });
  }

  Un().fase('unico.segni', { dopo: 'unico.memoria', budget: { p95: .10 } }, fase);
  if (Un().nasce) Un().nasce('segni', st => { if (st.u) { S(st); C(st); TQ(st); } });
  if (typeof document !== 'undefined' && document.createElement) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installaPagina); else installaPagina(); }

  Object.assign(Segni, { disegno, CFG, TIPI, PITTO: Object.keys(PITTO), BATTUTE, SCHEDE, scheda, cronacaOggi, conti, sentite, edizione, gazzettaSeServe, scegli, telefono,
    html: { gazzetta: htmlGazzetta, cronaca: htmlCronaca, sentito: htmlSentito, conti: htmlConti },
    _: { ATT, S, C, TQ, segna, fase, valori, rendi, rigaCorta, battuta, paroleDi, pittoDi, posaDi, tipoDi, urlDi, hashS, versione: () => versione } });
  Un().Segni = Segni;
  return Segni;
})();
if (typeof window !== 'undefined') window.Segni = Segni;
