/* [unico] unico_mente.js: LA MENTE DEL SISTEMA UNICO, passo 5 (progetto: commedia/SISTEMA_UNICO.md §2.3, §2.5, §3.3, §3.4, §1.3 riga 5,
   §10 riga 5). Dietro ?commedia. Spento il flag: Mente = { ON: false } e nient'altro (nessun aggancio, nessuna fase).

   UNA MENTE PER NPC (st.u.menti[id], §2.3): carattere (n.tr più cinque tratti derivati a seme: pigro, orgoglio, teatrale, generoso,
   rancore), gusti (gli interessi di popolo, lo stile di casa), abilità (quella dell'Attore), orario (il blocco di Popolo: il lavoro e
   la giornata restano di popolo), memorie (≤ 32 fatti: 'f' fatto, 'v' visto, 's' sentito), relazioni (≤ 24: [aff, fid, debito,
   rancore, tVisto, fidCalcolo]), l'obiettivo corrente col perché (un id di fatto), il piano, il «non si può» (nope), quando si
   rivaluta. Solo numeri, stringhe, array e oggetti semplici: si salva così com'è (passo 6).

   LA SCELTA (§3.3). Diciotto obiettivi, come dati (OBIETTIVI): ognuno è una lista di considerazioni [curva, fonte, peso] (le curve
   sono tabulate, CURVE; le fonti leggono corpo, memoria, orario, vicini: FONTI), il tratto di carattere che lo spinge, i metodi.
     u(g) = base · Π (1 − peso·(1 − curva(x))) · (1 + .3·carattere) · orario(blocco, g) · (1 − nope) · inerzia(+15%) · gusto del giorno
   Il gusto del giorno è un ±8% dall'hash (id, giorno, obiettivo): la stessa persona non ripete la stessa giornata; a parità decide
   il flusso 'mente' (seminato). Le reazioni di Azioni.react e le scene di eventi.js hanno la precedenza: la mente aspetta se c'è un
   piano di qualcun altro (n.pop.emer), un compito della banda, il panico, una scena (n.__ev), o un'azione che non è la routine.

   IL PIANO: HTN alla procura (§3.3). Ogni obiettivo ha i suoi metodi in ordine di costo per carattere (il pigro compra invece di
   cucinare, l'orgoglioso non chiede, l'avaro baratta). Un metodo è un'agenda di compiti: primitivi (un verbo del registro, con gli
   argomenti già legati) o composti (@procura, @vendi, @incontro, @buca). Il piano è PARZIALE: si espande solo il compito in testa, e
   il resto si espande quando si arriva (dopo il primo «vai»). procura(cosa, q): ce l'ho → prendi da casa → compra (la bottega più
   conveniente per chi è) → fai_ricetta (RECIPES, ricorsiva fino a 3) → chiedi_prestito (i soldi che mancano) → baratta. Tutto passa
   da Verbo.fai, la stessa porta del giocatore: mai un effetto scritto a mano. Un piano fallito mette nope[verbo:cosa] = t + 240.
   I MACROVERBI: le catene riuscite più spesso (≥ 4 volte, «vai>compra>mangia») diventano un evento solo per il livello lontano: le
   durate sommate, una voce nella coda, poi i passi applicati in fila (Verbo.applica, strategia C), ognuno col suo fatto.

   I LIVELLI (§3.4) e LA CLASSE DEL DISPOSITIVO (§2.5, st.u.classe, salvata): scena (entro 30/45 m e fra i primi 16/24/32 vicini,
   si rivaluta ogni 3-10 minuti di gioco o a un fatto che lo tocca), vicino (n.pop.near: ogni 30 minuti), lontano (al cambio di
   blocco di popolo, al più 3 ore), dormiente (a casa che dorme: niente). Un fatto che tocca qualcuno (un rinfaccio, un regalo, un
   prestito, una diceria) lo fa rivalutare subito. I BUDGET sono a conteggio (§1.3): ≤ 4 scelte d'obiettivo per passo e ≤ 1/2/3
   piani HTN (telefono/Iris Xe/alto), a rotazione fra gli NPC; i passi di un piano già scelto proseguono (≤ 6 per passo).

   GLI SPEGNIMENTI (§4, §5). Risacca.autonomy per i membri con la mente (r.autoAt in avanti, per membro: st.u.mente.autoOff). Il giro
   di vita per gli obiettivi coperti: proponiAppuntamento (Vita.CFG.appGiorno = 0), il regalo (st.vita.regali risponde «già fatto
   oggi»), i conti del debito e della buca (contoDebito, contoBuca in Vita._.CONTI tornano null), l'arrivo all'appuntamento (ap.__vArr:
   l'incontro lo scrive la mente). Restano a vita i furti, le infamie, i ricordi, le chiacchiere di fondo. LA PAGA DOPPIA: per chi ha
   il lavoro di popolo il verbo lavora non paga (la paga matura in P.owed, come oggi); il fatto la porta in x.maturata. */
var MenteUnica = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Mente = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = Mente;
  if (!ON) return Mente;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const V = typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null;
  const F = typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null;
  const AT = typeof Attore !== 'undefined' && Attore.ON ? Attore : null;
  if (!G || !Un() || !V || !F || !AT) { Mente.ON = false; return Mente; }
  const SO = () => (typeof UnicoSociali !== 'undefined' && UnicoSociali.ON ? UnicoSociali : null);
  const PO = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const PI = () => { const P = PO(); return P && P._ ? P._ : null; };
  const AZ = () => (typeof Azioni !== 'undefined' ? Azioni : null);
  const EC = () => (typeof Economia !== 'undefined' ? Economia : null);
  const OG = () => (typeof Oggetti !== 'undefined' ? Oggetti : null);
  const SC = () => (typeof Scambi !== 'undefined' ? Scambi : null);
  const VI = () => (typeof Vita !== 'undefined' && Vita.ON ? Vita : null);
  const CS = () => (typeof Casa !== 'undefined' && Casa.ON !== false && Casa.fai ? Casa : null);
  const CA = () => (typeof Cantiere !== 'undefined' ? Cantiere : null);
  const SG = () => (typeof Segni !== 'undefined' && Segni.ON ? Segni : null);
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
  const CAT = () => (OG() && OG().CAT) || {};

  const CFG = Mente.CFG = {
    scelte: 4,                                       // ≤ 4 scelte d'obiettivo per passo (§1.3)
    pieni: { tel: 1, xe: 1, alto: 2 },               // di queste, le valutazioni piene dei diciotto obiettivi (le altre: piani in corso, pause)
    lavori: { tel: 1, xe: 1, alto: 2 },              // le cose che costano per passo, in tutto: una scelta piena, un piano, un passo di piano
    piani: { tel: 1, xe: 2, alto: 3 },               // ≤ piani HTN per passo, per classe (§2.5)
    scena: { tel: { r: 30, max: 16 }, xe: { r: 45, max: 24 }, alto: { r: 45, max: 32 } },
    ritmo: { scena: [3, 10], vicino: 30, lontano: 180, dormiente: 240 },   // minuti di gioco fra due scelte
    giro: 32,             // NPC guardati per passo, a rotazione
    segui: 4,             // passi di piani già scelti messi in opera per passo
    pesanti: 1,           // i verbi che costano (il banco, il prestito) messi in opera per passo
    fattiPasso: 300,      // fatti nuovi letti per passo
    nope: 240, nopeBreve: 60,
    inerzia: 1.15, car: .3, gusto: .08, soglia: .1,
    memorie: 32, rel: 24,
    macro: { soglia: 4, max: 24 },
    R: { persona: 8, lontano: 3, scena: 140, conto: 40 },      // m: i vicini di chi è vicino, di chi è lontano; la strada a piedi in scena
    scaduto: 150,         // minuti dopo un prestito (per chi ha poco rancore, il doppio)
    classe: null,         // la classe fissata (le prove); se no si sceglie all'avvio e si salva
    tetto: .25,           // ms: il budget p95 della fase (§1.3); si misura soltanto
    registro: false,      // le prove: Mente.log tiene le scelte (t, id, obiettivo, metodo)
  };
  const stats = Mente.stats = { sforati: 0, ascolti: 0, cambi: 0, scelte: 0, piani: 0, avvii: 0, riusciti: 0, falliti: 0, espansi: 0, fai: 0, macro: 0, macroFatti: 0, incontri: 0, buche: 0,
    passi: 0, maxScelte: 0, maxPiani: 0, ms: 0, msMax: 0, per: {}, perVerbo: {}, perMetodo: {}, perche: {}, vitaZitta: 0, autoOff: 0, attese: 0 };
  const LOG = Mente.log = [];

  // ======================= LE CURVE (tabulate, §3.3) =======================
  const CURVE = {
    lin: [[0, 0], [1, 1]], inv: [[0, 1], [1, 0]],
    soglia: [[0, 0], [.35, 0], [.6, .55], [1, 1]],
    alto: [[0, 0], [.45, .05], [.75, .7], [1, 1]],
    basso: [[0, 1], [.3, .85], [.6, .25], [1, 0]],
    quasi: [[0, .25], [1, 1]],
    tutto: [[0, 0], [.01, 1], [1, 1]],
  };
  function curva(nome, x) { return curvaA(CURVE[nome] || CURVE.lin, x); }
  function curvaA(P, x) {
    x = x > 1 ? 1 : x > 0 ? x : 0;
    for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const a = P[i - 1], b = P[i]; return b[0] === a[0] ? b[1] : a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    return P[P.length - 1][1];
  }

  // ======================= GLI OBIETTIVI (solo dati, §3.3: diciotto) =======================
  // considera: [curva, fonte, peso]; car: i tratti che lo spingono ('!x' = 1 − x); metodi: in ordine di costo per carattere (lo decide il costo)
  const OBIETTIVI = {
    mangiare:     { base: 1, considera: [['alto', 'fame', 1], ['quasi', 'ora_pasto', .4]], car: [], metodi: ['mangia_borsa', 'mangia_casa', 'compra_cibo', 'cucina', 'prestito_cibo'] },
    lavorare:     { base: 1.1, considera: [['tutto', 'in_turno', 1], ['quasi', 'al_lavoro', .3]], car: ['!pigro'], metodi: ['turno'] },
    guadagnare:   { base: .7, considera: [['alto', 'povero', .8], ['tutto', 'vendibile', .9]], car: ['avid'], metodi: ['vendi_roba', 'pesca_vendi'] },
    fare_scorta:  { base: .8, considera: [['tutto', 'bottegaio', 1], ['soglia', 'scorta_bassa', 1]], car: ['!pigro'], metodi: ['rifornisci'] },
    arredare:     { base: .55, considera: [['tutto', 'voglia_casa', 1], ['quasi', 'agiato', .8], ['basso', 'fame', .5]], car: ['teatrale', '!avid'], metodi: ['mobile', 'ridipingi'] },
    costruire:    { base: .6, considera: [['tutto', 'progetto', 1], ['quasi', 'lealta', .6]], car: ['!pigro'], metodi: ['costruisci'] },
    socializzare: { base: .75, considera: [['quasi', 'compagnia', .8], ['tutto', 'gente', .9], ['quasi', 'appuntamento', .5]], car: ['loq'], metodi: ['vedersi', 'racconta', 'proponi'] },
    regalare:     { base: .6, considera: [['tutto', 'amico_vicino', 1], ['tutto', 'dono', 1], ['quasi', 'agiato', .4]], car: ['generoso'], metodi: ['regala'] },
    prestare:     { base: .6, considera: [['tutto', 'bisognoso', 1], ['quasi', 'agiato', .9]], car: ['generoso', '!avid'], metodi: ['presta'] },
    chiedere:     { base: .6, considera: [['alto', 'povero', 1], ['tutto', 'prestatore', 1]], car: ['!orgoglio'], metodi: ['chiedi'] },
    riscuotere:   { base: .95, considera: [['tutto', 'conti', 1]], car: ['rancore', 'legge'], metodi: ['salda', 'rinfaccia'] },
    vendicarsi:   { base: .7, considera: [['soglia', 'rancore_max', 1], ['basso', 'legge', .5]], car: ['rancore', 'teatrale'], metodi: ['rinfaccia_torto', 'scritta'] },
    dipingere:    { base: .6, considera: [['tutto', 'writer', 1], ['quasi', 'svago', .6], ['basso', 'giorno', .3]], car: ['teatrale'], metodi: ['muro'] },
    pescare:      { base: .7, vicino: true, considera: [['tutto', 'pescatore', 1], ['quasi', 'mattina', .5]], car: ['!pigro'], metodi: ['pesca'] },
    divertirsi:   { base: .5, considera: [['alto', 'svago', 1], ['tutto', 'tempo_libero', 1]], car: ['teatrale', 'loq'], metodi: ['bevi_borsa', 'compra_bevi'] },
    dormire:      { base: .7, vicino: true, considera: [['alto', 'sonno', 1], ['tutto', 'a_casa_ora', 1]], car: ['pigro'], metodi: ['dormi'] },
    igiene:       { base: .4, considera: [['alto', 'igiene', 1], ['tutto', 'tempo_libero', 1]], car: [], metodi: ['a_casa'] },
    pregare:      { base: .5, considera: [['tutto', 'fede', 1], ['tutto', 'ora_messa', 1]], car: [], metodi: ['chiesa'] },
  };
  // le fonti che costano (i vicini, i conti, la borsa) si guardano per ultime: una considerazione a zero prima le risparmia
  const CARE = new Set(['gente', 'amico_vicino', 'dono', 'bisognoso', 'prestatore', 'conti', 'rancore_max', 'vendibile', 'scorta_bassa', 'bottegaio', 'in_turno', 'voglia_casa']);
  Object.keys(OBIETTIVI).forEach((g, i) => { const D = OBIETTIVI[g]; D.i = i; D.nk = 'g:' + g; D.considera = D.considera.map((x, j) => [x, j]).sort((a, b) => (CARE.has(a[0][1]) ? 1 : 0) - (CARE.has(b[0][1]) ? 1 : 0) || a[1] - b[1]).map(x => x[0]); });
  // l'orario di popolo sposta gli obiettivi: il blocco di adesso (P.cur.act) → moltiplicatore ('_' = gli altri)
  const ORARIO = {
    lavoro: { lavorare: 1.6, mangiare: .7, fare_scorta: 1.2, guadagnare: .5, riscuotere: .6, _: .2 },
    sonno: { dormire: 1.5, _: .05 },
    casa: { arredare: 1.4, dormire: 1, igiene: 1.3, mangiare: 1.1, _: .7 },
    pranzo: { mangiare: 1.5, _: .6 },
    svago: { socializzare: 1.3, divertirsi: 1.4, regalare: 1.2, prestare: 1.1, dipingere: 1.2, _: 1 },
    sfogo: { divertirsi: 1.4, vendicarsi: 1.3, _: 1 },
    appuntamento: { socializzare: 2, _: .4 },
    messa: { pregare: 2, _: .3 }, bollettino: { _: .5 },
    mercato: { mangiare: 1.2, guadagnare: 1.3, fare_scorta: 1.2, socializzare: 1.1, _: 1 },
    spesa: { mangiare: 1.2, arredare: 1.1, _: 1 },
    giro: { vendicarsi: 1.2, dipingere: 1.3, _: .8 },
    _: { _: 1 },
  };
  const QUIETE = new Set(['routine', 'dentro', 'altrove']);
  const CONTANO = new Set(['prestito', 'regalo', 'saldato', 'social'].concat(Object.keys(F.OFFESE || {})));
  const REAGISCE = new Set(['rinfacciato', 'regalo', 'prestito', 'appuntamento', 'chiacchiera', 'buca', 'furto', 'saldato', 'dai', 'baratto', 'lite', 'muso']);
  const ESTERNI = ['fontana', 'piazza', 'molo', 'calata', 'lungomare', 'passeggiata', 'giardini', 'mercato', 'sagrato', 'pontile'];
  const LOCALI = ['bar', 'osteria', 'sirena', 'gelateria'];
  const MURI = ['vico', 'caruggio', 'piazzetta', 'calata', 'piazza', 'lungomare', 'salita', 'passeggiata', 'fontana', 'molo'];
  const ACQUA = ['molo', 'pontile', 'caletta', 'punta', 'marina'];

  // ======================= ATTREZZI =======================
  function hashS(s) { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
  const giorno = st => Math.floor(st.t / 1440), ora = st => (((st.t % 1440) + 1440) % 1440) / 60;
  const io = id => (id === 'player' ? 'nino' : String(id));
  let IDX = null, IDXst = null, IDXn = -1, IDXp = -1;
  function npc(st, id) {
    if (IDXst !== st || IDXn !== st.npcs.length || Un().passi - IDXp > 200) { IDX = new Map(); for (const k of st.npcs) IDX.set(k.id, k); IDXst = st; IDXn = st.npcs.length; IDXp = Un().passi; }
    const k = IDX.get(id); return k && k.id === id ? k : null;
  }
  const tk = t => (t ? (t.k === 'b' ? 'b' + t.bi : t.k === 'p' ? 'p' + t.pid : (t.label || '') + Math.round(t.x) + ',' + Math.round(t.y)) : '');
  function porta(bi) { const b = G.BUILDINGS && G.BUILDINGS[bi]; if (!b || !b.door) return null; return { x: (b.door[0] + .5) * G.TS, y: (b.door[1] + .5) * G.TS }; }
  // il punto dove andare per stare «vicino» a un bersaglio (la porta, se è abbastanza vicina al centro dell'edificio)
  function punto(t, r) { if (!t) return null; if (t.k === 'b') { const d = porta(t.bi); if (d && hyp(d.x - t.x, d.y - t.y) <= r) return d; } return { x: t.x, y: t.y }; }
  // [molo] un punto dove stare: mai sopra un mezzo o una barca (ferma, ormeggiata o di passaggio), mai fuori dal camminabile. Prima
  // la gente della Mente finiva in piedi su un'auto parcheggiata o sul gozzo accanto al pontile (vaiDa, i punti attorno ai posti)
  function sopraMezzo(st, x, y) {
    const VK = G.VK || {}, dentro = (cx, cy, ang, L, Wd) => { const dx = x - cx, dy = y - cy, c = Math.cos(ang || 0), s = Math.sin(ang || 0), a = dx * c + dy * s, b = -dx * s + dy * c; return Math.abs(a) < L / 2 + .45 && Math.abs(b) < Wd / 2 + .45; };
    for (const v of (st && st.vehicles) || []) { if (v.dead || v.gone) continue; const K = VK[v.kind] || {}; if (Math.abs(v.x - x) > 9 || Math.abs(v.y - y) > 9) continue; if (dentro(v.x, v.y, v.ang, K.len || 4.2, K.wid || 1.8)) return true; }
    const SEA = typeof World !== 'undefined' && World.SEA ? World.SEA : null;
    if (SEA && SEA.moorings) for (const m of SEA.moorings) { if (Math.abs(m.x - x) > 9 || Math.abs(m.y - y) > 9) continue; if (dentro(m.x, m.y, m.ang, m.len || 5, (m.len || 5) * .4)) return true; }
    return false;
  }
  function libero(p) {
    const st = Un().st; if (!st || !p) return p;
    const ok = (x, y) => !sopraMezzo(st, x, y);   // (il camminabile no: le porte e i punti dentro gli edifici non lo sono, e l'arrivo si romperebbe)
    if (ok(p.x, p.y)) return p;
    for (const r of [1.2, 2.2, 3.4, 4.8]) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (ok(x, y)) { stats.spostati = (stats.spostati || 0) + 1; return { x, y }; } }
    return p;
  }
  const vai = p => { const q = libero(p); return ['vai', { x: r1(q.x), y: r1(q.y) }]; };
  // andare a un bersaglio se non si è già lì (dentro lo stesso edificio, o entro r)
  function vaiA(c, t, r) {
    if (!t) return null; const A = c.A, d = A.dove;
    if (d.k === 'dentro' && t.k === 'b' && d.b === t.bi) return [];
    if (hyp(A.x - t.x, A.y - t.y) <= r) return [];
    const p = punto(t, r - .5); if (!p) return null;
    if (!lontano(c) && hyp(p.x - A.x, p.y - A.y) > CFG.R.scena) return null;   // a piedi è troppo lontano: un'altra volta
    return [vai(p)];
  }
  // da una persona: se è a due passi niente, se no un metro e poco davanti a lei
  function vaiDa(c, k) {
    if (!k) return null; const A = c.A, d = hyp(k.x - A.x, k.y - A.y);
    if (d <= 2.2) return [];
    const f = 1.2 / (d || 1); return [vai({ x: k.x + (A.x - k.x) * f, y: k.y + (A.y - k.y) * f })];
  }
  const lontano = c => c.lod === 'lontano' || c.lod === 'dormiente';
  const corpoDi = (st, id) => (id === 'nino' ? AT.di(st, 'nino') : AT.di(st, npc(st, id)));

  // ======================= LO STATO (st.u.mente, st.u.menti) =======================
  function classeDi() {
    if (CFG.classe) return CFG.classe;
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'xe';
    try { const S = SG(); if (S && S.telefono && S.telefono()) return 'tel'; } catch (e) { }
    const ua = String(navigator.userAgent || ''), hc = navigator.hardwareConcurrency || 4;
    if (/Mobi|Android/i.test(ua)) return 'tel';
    return hc >= 8 ? 'alto' : 'xe';
  }
  function S(st) {
    const u = st && st.u; if (!u) return null;
    if (!u.mente) { const M0 = F._.M(st); u.mente = { v: 1, ultimo: M0 ? M0.n : 0, coda: [], catene: {}, macro: {}, autoOff: {}, cursore: 0 }; }
    if (!u.menti) u.menti = {};
    if (!u.classe) u.classe = classeDi();
    return u.mente;
  }
  // una mente nuova: il carattere di game.js (n.tr) più i tratti derivati, deterministici dall'hash (id, seme)
  function nuova(st, n) {
    const tr = n.tr || {}, P = n.pop || {}, N = P.need || {}, h = k => hashS(st.u.seme + '|' + n.id + '|' + k);
    const num = (x, d) => (typeof x === 'number' ? x : d), loq = num(tr.loq, .5), avid = num(tr.avid, .5), legge = num(tr.legge, .5);
    const car = {
      cor: r2(num(tr.cor, .5)), loq: r2(loq), avid: r2(avid), legge: r2(legge),
      pigro: r2(clamp(.6 * h('pigro') + .25 * (1 - num(P.punct, .5)) + (P.status === 'pensionato' ? .15 : 0), 0, 1)),
      orgoglio: r2(clamp(.6 * h('orgoglio') + .25 * (1 - loq) + ((P.age || 40) > 55 ? .15 : 0), 0, 1)),
      teatrale: r2(clamp(.55 * h('teatrale') + .45 * loq, 0, 1)),
      generoso: r2(clamp(.55 * h('generoso') + .45 * (1 - avid), 0, 1)),
      rancore: r2(clamp(.6 * h('rancore') + .25 * (1 - legge) + .15 * (N.rabbia || 0), 0, 1)),
    };
    const A = AT.di(st, n), ab = {}; try { const B = A.abilita; for (const k in B) ab[k] = r2(B[k]); } catch (e) { }
    return { id: n.id, v: 1, carattere: car, gusti: { ints: (P.ints || []).slice(0, 4).map(x => x.k), stile: null, colore: null }, abilita: ab,
      orario: { blocco: null, fino: null, src: 'popolo' }, memorie: [], rel: {}, ob: null, piano: null, nope: {}, prossima: st.t + 5 * hashS(n.id), lod: null, limiti: null };
  }
  function menteDi(st, n, crea) { const s = S(st); if (!s) return null; const L = st.u.menti; return L[n.id] || (crea ? (L[n.id] = nuova(st, n)) : null); }

  // chi ha una mente: gli abitanti e i membri della banda; mai il cast della storia, le guardie, le fazioni, chi siede al posto del giocatore
  function candidato(st, n) {
    if (!n || !n.pop || n.dead || n.gone || n.cop || n.guard || n.faction || n.pop.cast || n.pop.matto) return false;
    if (st.u && st.u.sedile === n.id) return false;
    if (n.ris && n.ris.member && n.ris.auto === false) return false;   // segue gli ordini
    return true;
  }
  // la mente aspetta: la reazione, la scena, il piano di un altro, il compito della banda
  function inPausa(st, n) {
    const P = n.pop;
    if (n.__ev || n.panic > 0 || n.stun > 0 || n.aggro || n.inVeh || n.room || n.jailedUntil > st.t) return true;
    if (P.emer || (n.ris && n.ris.task) || P.carrying) return true;
    return !!(n.action && !QUIETE.has(n.action.name));
  }

  // ======================= IL LIVELLO DI DETTAGLIO =======================
  let SCENA = new Set(), SCENAt = -1;
  function scena(st) {
    const C = CFG.scena[st.u.classe] || CFG.scena.xe, p = st.player, L = [];
    for (const n of st.npcs) { if (!n.pop || !n.pop.near || n.dead) continue; const d = hyp(n.x - p.x, n.y - p.y); if (d < C.r) L.push([d, n.id]); }
    L.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1));
    SCENA = new Set(L.slice(0, C.max).map(x => x[1])); SCENAt = Un().passi;
  }
  function lodDi(st, n) {
    const P = n.pop;
    if (P.near) return SCENA.has(n.id) ? 'scena' : 'vicino';
    const b = P.cur && P.cur.act;
    if (n.inside && b === 'sonno' && P.at && P.homeT && tk(P.at) === tk(P.homeT)) return 'dormiente';
    return 'lontano';
  }
  // il prossimo cambio di blocco di popolo (minuto assoluto)
  function prossimoBlocco(st, n) {
    const P = n.pop, m = ((st.t % 1440) + 1440) % 1440, d0 = giorno(st) * 1440;
    let best = null; for (const b of P.plan || []) if (b.at > m + 1 && (best === null || b.at < best)) best = b.at;
    return best === null ? d0 + 1440 + 5 : d0 + best + 2;
  }
  function ritmo(c) {
    const st = c.st, R = CFG.ritmo;
    if (c.lod === 'scena') return st.t + R.scena[0] + (R.scena[1] - R.scena[0]) * hashS(c.n.id + '|' + Math.floor(st.t));
    if (c.lod === 'vicino') return st.t + R.vicino * (.8 + .4 * hashS(c.n.id + '|v' + Math.floor(st.t / 30)));
    return Math.min(st.t + R[c.lod], Math.max(st.t + 15, prossimoBlocco(st, c.n)));
  }

  // ======================= LE RELAZIONI E LE MEMORIE =======================
  function affinita(c, k) {
    const st = c.st, n = c.n, P = n.pop; if (!k) return 0;
    let a = 0; try { const R = AZ() && AZ().rel ? AZ().rel(st, n, k) : null; a = R ? R.a || 0 : 0; } catch (e) { }
    if ((P.friends || []).includes(k.id)) a += .3; if (P.hh && k.pop && P.hh === k.pop.hh) a += .4; if ((P.enemies || []).includes(k.id)) a -= .5;
    const r = c.M.rel[k.id]; if (r) a -= (r[3] || 0) * .6;
    return clamp(a, -1, 1);
  }
  // la relazione: [aff, fid (l'ultimo fatto fra i due), debito (+ mi deve), rancore, tVisto, fidCalcolo]
  function rel(c, id, crea) {
    const R = c.M.rel; let r = R[id];
    if (!r && crea) {
      const K = Object.keys(R);
      if (K.length >= CFG.rel) { let w = null, ws = 1e9; for (const x of K) { const q = R[x], s = Math.abs(q[0]) + Math.abs(q[2]) / 10 + q[3] + q[4] / 1e5; if (s < ws) { ws = s; w = x; } } delete R[w]; }
      r = R[id] = [0, 0, 0, 0, c.st.t, 0];   // nessun fatto che conta fra i due (lo segna leggiFatti): niente da ricalcolare
    }
    if (r && r[5] !== r[1]) { const x = F.rel(c.st, io(c.n.id), io(id)); r[2] = r1(x.debito); r[3] = r2(x.rancore); r[5] = r[1]; }
    return r;
  }
  function ricorda(M, f, fonte) {
    const L = M.memorie; if (L.some(m => m[0] === f.id)) return;
    L.push([f.id, r2((f.peso || 1) * (.3 + (f.ril || .1)) * (fonte === 'f' ? 1 : fonte === 'v' ? .7 : .5)), fonte]);
    if (L.length > CFG.memorie) { let j = 0; for (let i = 1; i < L.length; i++) if (L[i][1] < L[j][1] || (L[i][1] === L[j][1] && L[i][0] < L[j][0])) j = i; L.splice(j, 1); }
  }

  // ======================= LE FONTI (le x delle considerazioni, 0..1) =======================
  // la griglia del passo (12 m): chi sta dove, fatta una volta sola quando serve
  let GRI = null, GRIp = -1, GRIst = null;
  // [molo] la griglia si rifà ogni 20 passi riusando le sue liste (niente Map e array nuovi a ogni giro: la memoria non si rimescola)
  function griglia(st) {
    if (GRI && GRIst === st && Un().passi - GRIp < 20 && Un().passi >= GRIp) return GRI;
    if (!GRI || GRIst !== st || GRI.size > 4000) GRI = new Map(); else for (const L of GRI.values()) L.length = 0;
    GRIp = Un().passi; GRIst = st;
    for (const k of st.npcs) { if (!k.pop || k.dead) continue; const key = Math.floor(k.x / 12) * 4096 + Math.floor(k.y / 12); let L = GRI.get(key); if (!L) GRI.set(key, L = []); L.push(k); }
    return GRI;
  }
  function vicini(c) {
    if (c.memo.vic) return c.memo.vic;
    const st = c.st, n = c.n, out = [], lon = lontano(c), R = lon ? CFG.R.lontano : CFG.R.persona, key = n.inside && n.pop.at ? tk(n.pop.at) : null;
    const Gr = griglia(st), cx = Math.floor(n.x / 12), cy = Math.floor(n.y / 12), cand = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const L = Gr.get((cx + i) * 4096 + cy + j); if (L) for (const k of L) cand.push(k); }
    for (const k of cand) {
      if (k === n || !k.pop || k.dead || k.gone || k.cop || k.faction || k.__ev || k.jailedUntil > st.t || k.pop.matto) continue;
      if (!lon && !k.inside && (k.speedNow || 0) > .3) continue;   // chi cammina non si ferma a parlare: si sceglie chi sta
      if (!!k.inside !== !!n.inside) continue;
      const dx = k.x - n.x, dy = k.y - n.y; if (dx > R || dx < -R || dy > R || dy < -R) continue;
      const d = hyp(dx, dy); if (d > R) continue;
      if (key && k.pop.at && tk(k.pop.at) !== key) continue;
      if (k.pop.emer || (k.action && !QUIETE.has(k.action.name)) || k.inVeh) continue;
      if (lon ? !!k.pop.near : !k.pop.near) continue;                                  // lo stesso livello: due lontani, o due vicini
      const Mk = st.u.menti[k.id]; if (Mk && (Mk.piano || (Mk.occupato > st.t))) continue;   // ha già da fare (o qualcuno gli sta parlando)
      if (lon && prossimoBlocco(st, k) < st.t + 8) continue;                             // fra poco se ne va: il blocco cambia
      out.push({ k, id: k.id, d, aff: 0 });
    }
    out.sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
    const L = out.slice(0, 5);
    for (const v of L) { v.aff = v.nino ? clamp(((n.op && n.op.trust) || 0) - ((n.op && n.op.grudge) || 0), -1, 1) : affinita(c, v.k); const r = rel(c, v.id, true); r[0] = r2(v.aff); r[4] = r1(st.t); }
    return (c.memo.vic = L);
  }
  const N = (c, k) => { const v = c.A.bisogni[k]; return typeof v === 'number' ? v : 0; };
  const soldiDi = A => A.soldi || 0;
  const affitto = c => (c.P.rent || 20);
  function cibo(c, dove) {
    const C = CAT(), B = dove === 'casa' ? (c.A.casa ? c.A.casa.dispensa : null) : c.A.borsa; if (!B) return null; let best = null, bv = -1;
    for (const [g] of B) { const e = C[g]; if (!e || !e.eat || !(e.eat.fame > 0) || e.cat === 'bevande') continue; const v = e.eat.fame; if (v > bv) { bv = v; best = g; } }
    return best;
  }
  function bevanda(c) { const C = CAT(); for (const [g] of c.A.borsa) { const e = C[g]; if (e && e.eat && (e.cat === 'bevande' || e.eat.sete)) return g; } return null; }
  // la roba da vendere: ce n'è più di quanta ne serve, vale qualcosa, non è un attrezzo né un'arma
  function vendibile(c) {
    if (c.memo.vend !== undefined) return c.memo.vend;
    const C = CAT(); let best = null, bv = 0;
    for (const [g, q] of c.A.borsa) { const e = C[g]; if (!e || e.wpn || e.tool || e.ill || g === 'munizioni') continue; const keep = e.eat ? 2 : 1; if (q <= keep) continue; const v = (e.prezzo || 0) * (q - keep); if (v > bv && (e.prezzo || 0) >= 1) { bv = v; best = g; } }
    return (c.memo.vend = best);
  }
  // il regalo per k: quello che vuole (Scambi.wants) se ce l'ho; se no una cosa piccola di cui ho in più
  function dono(c, k) {
    const Bg = c.A.borsa, C = CAT();
    if (k && k.pop && SC() && SC().wants) { try { for (const w of SC().wants(c.st, k)) for (const id of w.ids) if (Bg.get(id) >= 1 && !(C[id] && C[id].tool)) return id; } catch (e) { } }
    let best = null, bp = -1;
    for (const [g, q] of Bg) { const e = C[g]; if (!e || e.wpn || e.ill || e.tool || g === 'munizioni') continue; if (q < 2) continue; const p = e.prezzo || 1; if (p <= 6 && p > bp) { bp = p; best = g; } }
    return best;
  }
  // il negozio del bottegaio (Economia: la bottega del suo posto di lavoro)
  const MIA = new Map(); let MIAst = null;
  function bottegaMia(c) {
    if (c.memo.mia !== undefined) return c.memo.mia;
    const J = c.P.job; if (!J || !J.t) return (c.memo.mia = null);
    if (MIAst !== c.st) { MIA.clear(); MIAst = c.st; }
    const key = c.n.id + '|' + tk(J.t); if (MIA.has(key)) return (c.memo.mia = MIA.get(key));
    const E = EC() && EC().eco ? EC().eco(c.st) : null; let out = null;
    if (E) for (const k in E.shops) { const Sh = E.shops[k]; if (Sh.t && Sh.t.k === J.t.k && (J.t.k === 'b' ? Sh.t.bi === J.t.bi : Sh.t.pid === J.t.pid) && !Sh.market) { out = Sh; break; } }
    MIA.set(key, out); return (c.memo.mia = out);
  }
  function scorteBasse(c, Sh) { const L = []; for (const g in Sh.sells) { const e = CAT()[g]; if (e && (Sh.stock[g] || 0) < 2) L.push(g); } return L; }
  function appOra(c) { const ap = c.P.appt; return ap && c.st.t >= ap.t - 30 && c.st.t <= ap.t + 50 ? ap : null; }
  // i conti aperti: chi mi deve (da troppo) e chi devo (e posso rendere); il più grosso
  // i conti si rifanno quando cambia una relazione (un fatto che conta) o ogni ora (il debito scade col tempo)
  const CONTI = new Map();
  function conti(c) {
    if (c.memo.conti !== undefined) return c.memo.conti;
    const k0 = CONTI.get(c.n.id), ver = c.M.relV || 0;
    if (k0 && k0[0] === ver && c.st.t - k0[1] < 60 && k0[1] <= c.st.t) return (c.memo.conti = k0[2]);
    const r0 = conti0(c); if (CONTI.size > 2000) CONTI.clear(); CONTI.set(c.n.id, [ver, c.st.t, r0]); return r0;
  }
  function conti0(c) {
    const st = c.st, M = c.M; let best = null, bs = 0;
    for (const id in M.rel) {
      const r0 = M.rel[id]; if (r0[1] === 0 && r0[2] === 0) continue;   // nessun fatto fra i due: niente conti
      const r = rel(c, id); if (!r) continue;
      if (r[2] > 2.5) {   // mi deve (un prestito, non il debito di favore del regalo): scaduto, per chi ha poco rancore si aspetta il doppio
        const pz = CFG.scaduto * (2 - M.carattere.rancore), f0 = ultimo(st, io(c.n.id), io(id), 'prestito');
        if (!f0) continue;
        const da = st.t - f0.t, gia = ultimo(st, io(c.n.id), io(id), 'rinfacciato');
        if (da < pz || (gia && st.t - gia.t < 720)) continue;
        const s = Math.min(1, r[2] / 20 + .3); if (s > bs) { bs = s; best = { tipo: 'riscuoti', id, v: r[2], perche: f0 ? f0.id : null }; }
      } else if (r[2] < -2.5 && soldiDi(c.A) >= -r[2] + 5 && ultimo(st, io(id), io(c.n.id), 'prestito')) {   // devo: si rende (prima chi l'ha rinfacciato)
        const rf = ultimo(st, io(id), io(c.n.id), 'rinfacciato'), onesto = M.carattere.legge * .6 + (1 - M.carattere.avid) * .4;
        const s = rf ? .95 : onesto > .55 ? .5 : 0; if (s > bs) { bs = s; best = { tipo: 'salda', id, v: -r[2], perche: rf ? rf.id : null }; }
      }
    }
    return (c.memo.conti = best ? Object.assign(best, { s: bs }) : null);
  }
  // l'ultimo fatto di un tipo fatto da a con b
  function ultimo(st, a, b, tipo) { const L = F.per(st, { chi: a, tipo }); for (let i = L.length - 1; i >= 0; i--) { const f = L[i]; if (f.esito !== 'no' && io(f.chi) === a && (f.con || []).map(io).includes(b)) return f; } return null; }
  function rancoreMax(c) {
    if (c.memo.ranc !== undefined) return c.memo.ranc;
    let best = null; for (const id in c.M.rel) { const r0 = c.M.rel[id]; if (r0[1] === 0 && r0[3] === 0) continue; const r = rel(c, id); if (r && r[3] > (best ? best.v : 0)) best = { id, v: r[3] }; }
    return (c.memo.ranc = best);
  }
  const EST = { procura: [] };   // [costruire] Mente.estendi
  const FONTI = {
    fame: c => N(c, 'fame'), sonno: c => N(c, 'sonno'), igiene: c => N(c, 'igiene'), svago: c => N(c, 'svago'), compagnia: c => N(c, 'compagnia'),
    ora_pasto: c => { const h = c.h; return (h >= 7 && h < 8.5) ? .7 : (h >= 12 && h < 14.5) || (h >= 19 && h < 21.5) ? 1 : .3; },
    in_turno: c => { const J = c.A.lavoro; if (!J || c.blocco !== 'lavoro' || !c.P.workToday) return 0; if (c.st.t - (c.M.orario.lav || -1e9) < 110) return 0; const a = J.inizio, b = J.fine, h = c.h; return (a <= b ? h >= a && h < b : h >= a || h < b) ? 1 : 0; },
    al_lavoro: c => { const J = c.P.job, t = J && J.t; if (!t) return 0; return (c.A.dove.k === 'dentro' && t.k === 'b' && c.A.dove.b === t.bi) || hyp(c.A.x - t.x, c.A.y - t.y) < 12 ? 1 : .4; },
    povero: c => { const n = (c.P.need && c.P.need.soldi) || 0; return Math.max(n, clamp(1 - soldiDi(c.A) / (affitto(c) + 30), 0, 1)); },
    agiato: c => clamp(soldiDi(c.A) / (affitto(c) * 2 + 40), 0, 1),
    vendibile: c => (vendibile(c) ? 1 : 0),
    bottegaio: c => (bottegaMia(c) && c.blocco === 'lavoro' ? 1 : 0),
    scorta_bassa: c => { const Sh = bottegaMia(c); if (!Sh) return 0; const n = Object.keys(Sh.sells).length || 1; return clamp(scorteBasse(c, Sh).length / n * 2, 0, 1); },
    voglia_casa: c => { if (!c.P.homeT) return 0; const Cs = c.st.casa, L = Cs && Cs.voglie && Cs.voglie[c.n.id]; if (L && L.length) return 1; return gustoDi(c, 51) < .12 ? .6 : 0; },
    progetto: c => (c.n.ris && c.n.ris.member && CA() && CA().BY ? 1 : 0),
    lealta: c => (c.n.ris ? c.n.ris.loyalty || 0 : 0),
    gente: c => (vicini(c).length ? 1 : appOra(c) ? 1 : 0),
    appuntamento: c => (appOra(c) ? 1 : 0),
    amico_vicino: c => { let b = 0; for (const v of vicini(c)) if (!v.nino && v.aff > b) b = v.aff; return b > .2 ? b : 0; },
    dono: c => { const v = vicini(c).find(x => !x.nino && x.aff > .2); return v && dono(c, v.k) ? 1 : 0; },
    bisognoso: c => { if (soldiDi(c.A) < 30) return 0; const v = vicini(c).find(x => !x.nino && x.aff > 0 && x.k.pop && ((x.k.pop.need && x.k.pop.need.soldi > .5) || (x.k.pop.money || 0) < 12)); return v ? 1 : 0; },
    prestatore: c => { const v = vicini(c).find(x => !x.nino && x.aff > -.1 && (x.k.pop.money || 0) >= 30 && F.debito(c.st, x.id, io(c.n.id)) <= 0); return v ? 1 : 0; },
    conti: c => { const x = conti(c); return x ? x.s : 0; },
    rancore_max: c => { const x = rancoreMax(c); return x ? x.v : 0; },
    legge: c => c.M.carattere.legge,
    writer: c => (c.P.writer ? 1 : (c.P.intW && c.P.intW.arte > .6) ? .6 : 0),
    giorno: c => (c.h >= 8 && c.h < 20 ? 1 : 0),
    pescatore: c => { const J = c.P.job; if (J && /pescat/i.test(J.base || J.title || '')) return 1; return c.P.intW && c.P.intW.pesca > .55 ? .7 : 0; },
    mattina: c => (c.h >= 5 && c.h < 10 ? 1 : .3),
    tempo_libero: c => (c.blocco === 'lavoro' || c.blocco === 'sonno' ? 0 : 1),
    a_casa_ora: c => (c.blocco === 'casa' || c.blocco === 'sonno' || c.h >= 22 || c.h < 6 ? 1 : 0),
    fede: c => clamp(c.P.faith || 0, 0, 1),
    ora_messa: c => ((c.h >= 7 && c.h < 9) || (c.h >= 18 && c.h < 19.5) ? 1 : 0),
  };
  function fonte(c, k) { return fonteI(c, FIDX.get(k)); }
  // le fonti per indice, con la memoria del contesto in due array fissi (un numero di generazione per contesto: niente oggetti nuovi)
  const FFN = Object.keys(FONTI).map(k => FONTI[k]), FIDX = new Map(Object.keys(FONTI).map((k, i) => [k, i]));
  const FO_V = new Float64Array(FFN.length + 16), FO_G = new Float64Array(FFN.length + 16).fill(-1); let GEN = 0;   // [costruire] +16: il posto per le fonti di Mente.estendi
  function fonteI(c, i) { if (FO_G[i] === c.gen) return FO_V[i]; let v = 0; try { v = +FFN[i](c) || 0; } catch (e) { v = 0; } FO_V[i] = v; FO_G[i] = c.gen; return v; }
  // le considerazioni risolte: [curva (i punti), indice della fonte, peso]
  for (const g in OBIETTIVI) { const D = OBIETTIVI[g]; D.dc = D.considera.map(([cv, fo, w]) => [CURVE[cv] || CURVE.lin, FIDX.get(fo), w]); if (D.dc.some(x => x[1] === undefined)) throw new Error('[Mente] fonte sconosciuta in ' + g); }
  function carDi(M, L) { if (!L || !L.length) return 0; let s = 0; for (const k of L) s += k[0] === '!' ? 1 - (M.carattere[k.slice(1)] || 0) : M.carattere[k] || 0; return s / L.length; }

  // ======================= LA SCELTA =======================
  const nopeHa = (M, k, t) => M.nope[k] !== undefined && M.nope[k] > t;
  function nope(M, k, fino) { M.nope[k] = r1(fino); const K = Object.keys(M.nope); if (K.length > 16) { const t = Math.min(...K.map(x => M.nope[x])); for (const x of K) if (M.nope[x] <= t) delete M.nope[x]; } }
  // thr: la soglia da battere (il secondo migliore finora); mul: i moltiplicatori ottimisti che restano. Si smette appena non ce la fa più
  function utilita(c, g, D, thr, lim) {
    if (D.vicino && lontano(c)) return 0;
    let u = D.base; const mul = lim ? lim / D.base : 1e9, t = thr || 0;
    const dc = D.dc; for (let j = 0; j < dc.length; j++) { const q = dc[j]; u *= 1 - q[2] * (1 - curvaA(q[0], fonteI(c, q[1]))); if (u <= 1e-4 || u * mul < t) return 0; }
    u *= 1 + CFG.car * carDi(c.M, D.car);
    const O = ORARIO[c.blocco] || ORARIO._; u *= O[g] !== undefined ? O[g] : O._;
    if (nopeHa(c.M, D.nk, c.st.t)) u *= .1;
    if (c.M.ob && c.M.ob.g === g) u *= CFG.inerzia;
    u *= 1 + CFG.gusto * (gustoDi(c, D.i) * 2 - 1);
    return u;
  }
  // il gusto del giorno: un hash per (id, giorno), poi uno per obiettivo con un rimescolo intero (niente stringhe nel giro)
  function gustoDi(c, i) { if (c.gh === undefined) c.gh = Math.floor(hashS(c.n.id + '|' + c.d) * 4294967296) >>> 0; let h = (c.gh ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0; h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
  // il limite ottimista di un obiettivo (le considerazioni tutte a 1): si guardano in quest'ordine, e ci si ferma quando non può più entrare fra i primi tre
  function limite(c, g, D) { const O = ORARIO[c.blocco] || ORARIO._; return D.base * (1 + CFG.car * carDi(c.M, D.car)) * (O[g] !== undefined ? O[g] : O._) * (c.M.ob && c.M.ob.g === g ? CFG.inerzia : 1) * (1 + CFG.gusto); }
  // l'ordine dei limiti dipende solo da carattere, blocco, obiettivo in corso e giorno: si tiene (derivato, non si salva)
  const ORD = new Map();
  function ordine(c) {
    const key = c.n.id + '|' + c.blocco + '|' + (c.M.ob ? c.M.ob.g : '') + '|' + c.d; let o = ORD.get(key); if (o) return o;
    o = []; for (const g in OBIETTIVI) o.push([g, limite(c, g, OBIETTIVI[g])]);
    o.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    if (ORD.size > 3000) ORD.clear(); ORD.set(key, o); return o;
  }
  function scegli(c) {
    const L = [], ord = ordine(c);
    let b1 = 0, b2 = 0;   // i due migliori finora
    for (const [g, lim] of ord) {
      const thr = Math.max(CFG.soglia, b2); if (lim < thr) break;
      const u = utilita(c, g, OBIETTIVI[g], thr, lim); if (u < thr) continue;
      L.push({ g, u }); if (u > b1) { b2 = b1; b1 = u; } else if (u > b2) b2 = u;
    }
    L.sort((a, b) => b.u - a.u || (a.g < b.g ? -1 : 1));
    // a parità (entro un millesimo) decide il flusso 'mente', seminato
    if (L.length > 1 && L[0].u - L[1].u < 1e-3 && Un().flusso('mente') < .5) { const x = L[0]; L[0] = L[1]; L[1] = x; }
    return L;
  }

  // ======================= LE BOTTEGHE E LA ROBA =======================
  const botteghe = st => { const E = EC() && EC().eco ? EC().eco(st) : null; return E ? E.shops : {}; };
  function prezzo(st, Sh, g) { const E = EC(); try { return E && E.price ? E.price(st, Sh, g) : (CAT()[g] || {}).prezzo || 1; } catch (e) { return (CAT()[g] || {}).prezzo || 1; } }
  let APE = new Map(), APEp = -1;
  function aperta(st, k) {
    const q = Math.floor(Un().passi / 30); if (APEp !== q) { APE = new Map(); APEp = q; }   // chi c'è al banco: si riguarda ogni 30 passi
    if (APE.has(k)) return APE.get(k); const O = OG(); let v = true;
    try { const Lg = O && O.luoghi ? O.luoghi(st)[k] : null; v = Lg && O.isOpen ? !!O.isOpen(st, Lg) : true; } catch (e) { v = true; }
    APE.set(k, v); return v;
  }
  function mercatoOggi(st) { const P = PO(); return !P || !P.weekday ? true : [2, 5].includes(P.weekday(st.t)); }
  // la bottega dove comprare g (q pezzi): quella che costa meno a chi è (prezzo per l'avaro, strada per il pigro), aperta, non in nope
  let VEND = null, VENDst = null, VENDp = -1;
  function chiVende(st, g) {
    if (!VEND || VENDst !== st || Un().passi - VENDp > 2000 || Un().passi < VENDp) { VEND = new Map(); VENDst = st; VENDp = Un().passi; const Sh0 = botteghe(st); for (const k in Sh0) for (const x in Sh0[k].sells) { let L = VEND.get(x); if (!L) VEND.set(x, L = []); L.push(k); } }
    return VEND.get(g) || [];
  }
  function doveCompra(c, g, q) {
    const st = c.st, A = c.A, M = c.M, Sh0 = botteghe(st), h = c.h, car = M.carattere; let best = null, bc = 1e9;
    if (h < 7 || h >= 20) return null;
    for (const k of chiVende(st, g)) {
      const Sh = Sh0[k]; if (!Sh || !Sh.sells[g] || (Sh.stock[g] || 0) < q || !Sh.t || Sh.black) continue;
      if (Sh.market && (!mercatoOggi(st) || h >= 13)) continue;
      if (nopeHa(M, 'b:' + k, st.t)) continue;
      const p = prezzo(st, Sh, g); if (p * q > soldiDi(A) - .01) continue;
      const d = hyp(Sh.t.x - A.x, Sh.t.y - A.y); if (!lontano(c) && d > CFG.R.scena) continue;
      if (!aperta(st, Sh.k !== undefined ? Sh.k : k)) continue;
      const cost = p * q * (.5 + car.avid * .8) + d / 100 * (.5 + car.pigro);
      if (cost < bc) { bc = cost; best = { Sh, k: Sh.k !== undefined ? Sh.k : k, p, d, cost }; }
    }
    return best;
  }
  // dove si vende g: una bottega che lo tratta (lo vende anche), aperta, con la cassa
  function doveVende(c, g) {
    const st = c.st, A = c.A, Sh0 = botteghe(st); let best = null, bd = 1e9;
    if (c.h < 7 || c.h >= 20) return null;
    for (const k of chiVende(st, g)) { const Sh = Sh0[k]; if (!Sh || !Sh.sells[g] || !Sh.t || Sh.black) continue; if (Sh.market && (!mercatoOggi(st) || c.h >= 13)) continue; if (nopeHa(c.M, 'v:' + k, st.t)) continue; const d = hyp(Sh.t.x - A.x, Sh.t.y - A.y); if (!lontano(c) && d > CFG.R.scena) continue; if (!aperta(st, Sh.k !== undefined ? Sh.k : k)) continue; if (d < bd) { bd = d; best = { Sh, k: Sh.k !== undefined ? Sh.k : k, d }; } }
    return best;
  }
  const RICETTE_DI = {};
  function ricetteDi(g) { if (RICETTE_DI[g]) return RICETTE_DI[g]; const R = (OG() && OG().RECIPES) || {}, L = []; for (const k in R) if (R[k].out && R[k].out[g]) L.push(k); return (RICETTE_DI[g] = L); }
  // si può procurare? (una prova a buon mercato, senza strade: ce l'ho, a casa, una bottega lo vende, una ricetta lo fa)
  function procurabile(c, g, q, prof) {
    const A = c.A; if (A.borsa.get(g) >= q) return true;
    const D = A.casa && A.casa.dispensa; if (D && D.get(g) >= q) return true;
    if (doveCompra(c, g, q)) return true;
    if ((prof || 0) < 2) for (const rk of ricetteDi(g)) { const R = OG().RECIPES[rk]; if (R.st || R.place) continue; if (Object.entries(R.in).every(([k, n]) => k.split('|').some(x => procurabile(c, x, n, (prof || 0) + 1)))) return true; }
    for (const f of EST.procura) { try { if (f(c, g, q)) return true; } catch (e) { } }   // [costruire] le fonti di recupero (cantiere, cassonetti, porto)
    return false;
  }

  // ======================= I METODI (HTN): agenda di compiti, col costo per carattere =======================
  // ritornano { passi: [[verbo, args] | ['@composto', args]], costo, chi?, perche? } o null
  const M_ = {};
  const car = c => c.M.carattere;
  M_.mangia_borsa = c => { const g = cibo(c); return g ? { passi: [['mangia', { cosa: g }]], costo: .05 } : null; };
  // chi è lontano è «dentro» il posto del suo blocco (snapFar): le cose di casa le fa solo quando il blocco è a casa
  const aCasaOra = c => !lontano(c) || (c.P.at && c.P.homeT && tk(c.P.at) === tk(c.P.homeT));
  M_.mangia_casa = c => {
    const g = cibo(c, 'casa'), h = c.P.homeT; if (!g || !h || !aCasaOra(c)) return null; const v = vaiA(c, h, 5.5); if (!v) return null;
    return { passi: v.concat([['prendi', { cosa: g, q: 1, da: 'casa' }], ['mangia', { cosa: g }]]), costo: .2 + v.length * .3 };
  };
  // i cibi che uno compra: quattro dei dodici, i suoi (dall'hash: chi il pane, chi la focaccia, chi la frutta), più quello del gusto
  const CIBI = ['pane', 'panino', 'focaccia', 'pasto', 'gallette', 'frutta', 'formaggio', 'biscotti', 'mele', 'salame', 'pane_nero', 'sarde'];
  function suoi(c, L, k) { const h = gustoDi(c, 97), out = []; for (let i = 0; i < k; i++) out.push(L[(Math.floor(h * L.length) + i * 5) % L.length]); return out; }
  M_.compra_cibo = c => {
    const C = CAT(); let best = null;
    for (const g of suoi(c, CIBI, 4)) {
      if (!C[g]) continue; const w = doveCompra(c, g, 1); if (!w) continue;
      const gusto = (c.M.gusti.ints || []).includes('cucina') && /pasto|focaccia|formaggio/.test(g) ? -.2 : 0;
      const cost = w.cost + gusto + hashS(c.n.id + '|' + g + '|' + c.d) * .15;   // ognuno il suo pane
      if (!best || cost < best.cost) best = Object.assign({ g }, w, { cost });
    }
    if (!best) return null;
    const v = vaiA(c, best.Sh.t, 7.5); if (!v) return null;
    return { passi: v.concat([['compra', { cosa: best.g, q: 1, dove: best.k }], ['mangia', { cosa: best.g }]]), costo: .3 + best.cost * .1 + car(c).pigro * .1 };
  };
  let CUCINA = null;   // le ricette da mangiare senza postazione (si fanno ovunque): una lista sola
  M_.cucina = c => {
    const R = (OG() && OG().RECIPES) || {}, Bg = c.A.borsa, C = CAT();
    if (!CUCINA) { CUCINA = []; for (const k in R) { const r = R[k], g = Object.keys(r.out)[0]; if (C[g] && C[g].eat && C[g].eat.fame > 0 && !r.st && !r.place) CUCINA.push(k); } }
    for (const k of CUCINA) { const r = R[k], g = Object.keys(r.out)[0];
      const ok = Object.entries(r.in).every(([key, q]) => key.split('|').some(id => Bg.get(id) >= q)) && r.tools.every(key => key.split('|').some(id => Bg.get(id) > 0));
      if (ok) return { passi: [['fai_ricetta', { rec: k, volte: 1 }], ['mangia', { cosa: g }]], costo: .25 + r.min / 120 * (1 + car(c).pigro) - car(c).avid * .1 }; }
    return null;
  };
  M_.prestito_cibo = c => {
    if (soldiDi(c.A) >= 3 || car(c).orgoglio > .7) return null;
    const v = vicini(c).find(x => !x.nino && x.aff > -.1 && (x.k.pop.money || 0) >= 20 && F.debito(c.st, x.id, io(c.n.id)) <= 0); if (!v) return null;
    return { passi: vaiDa(c, v.k).concat([['chiedi_prestito', { chi: v.id, soldi: 5 }], ['@obiettivo', { g: 'mangiare' }]]), costo: 1 + car(c).orgoglio * 2, chi: v.id };
  };
  M_.turno = c => {
    const J = c.P.job, t = J && J.t; if (!t) return null; const v = vaiA(c, t, 11); if (!v) return null;
    const Jv = c.A.lavoro, fine = Jv && typeof Jv.fine === 'number' ? Jv.fine : 24, blocco = (prossimoBlocco(c.st, c.n) - c.st.t) / 60;
    const resta = Math.min(((fine - c.h) % 24 + 24) % 24, blocco) - (v.length ? .6 : .2);   // il turno finisce prima del blocco di popolo
    const ore = Math.min(c.lod === 'scena' ? 1 : 2, Math.floor(resta * 2) / 2); if (!(ore >= .5)) return null;
    return { passi: v.concat([['lavora', { ore }]]), costo: .1 + v.length * .2 };
  };
  M_.vendi_roba = c => {
    const g = vendibile(c); if (!g) return null; const w = doveVende(c, g); if (!w) return null;
    const v = vaiA(c, w.Sh.t, 7.5); if (!v) return null; const q = Math.max(1, c.A.borsa.get(g) - (CAT()[g].eat ? 2 : 1));
    return { passi: v.concat([['vendi', { cosa: g, q, dove: w.k }]]), costo: .3 + w.d / 200 };
  };
  function acquaVicina(c) { let best = null, bd = 1e9; for (const id of ACQUA) { const P = G.PLACES[id]; if (!P) continue; const d = hyp(P.x - c.A.x, P.y - c.A.y); if (d < bd) { bd = d; best = P; } } return best && (lontano(c) || bd <= CFG.R.scena) ? best : null; }
  M_.pesca_vendi = c => { if (c.A.borsa.get('canna') < 1 || lontano(c) || c.h < 5 || c.h > 19) return null; const P = acquaVicina(c); if (!P) return null; const v = hyp(P.x - c.A.x, P.y - c.A.y) > 16 ? [vai(P)] : [];
    return { passi: v.concat([['pesca', { ore: 1 }], ['@vendi', { cosa: 'pesce' }]]), costo: .5 + car(c).pigro * .4 }; };
  M_.pesca = c => { if (c.A.borsa.get('canna') < 1 || lontano(c) || c.h < 5 || c.h > 19) return null; const P = acquaVicina(c); if (!P) return null; const v = hyp(P.x - c.A.x, P.y - c.A.y) > 16 ? [vai(P)] : [];
    return { passi: v.concat([['pesca', { ore: c.lod === 'scena' ? 1 : 2 }]]), costo: .3 }; };
  M_.rifornisci = c => {
    const mia = bottegaMia(c); if (!mia) return null; const L = scorteBasse(c, mia); const Sh0 = botteghe(c.st);
    for (const g of L) { const w = doveCompra(c, g, 2); if (!w || w.Sh === mia) continue; const v1 = vaiA(c, w.Sh.t, 7.5); if (!v1) continue;
      return { passi: v1.concat([['compra', { cosa: g, q: 2, dove: w.k }], vai(punto(mia.t, 7) || mia.t), ['vendi', { cosa: g, q: 2, dove: mia.k !== undefined ? mia.k : Object.keys(Sh0).find(k => Sh0[k] === mia) }]]), costo: .4 + w.cost * .05 }; }
    return null;
  };
  M_.mobile = c => {
    const Cs = c.st.casa, L = (Cs && Cs.voglie && Cs.voglie[c.n.id]) || [], G2F = V._.G2F || {}; const h = c.P.homeT; if (!h || !c.A.casa || !aCasaOra(c)) return null;
    const cand = L.map(x => x.g).concat(['sedia', 'lampada', 'quadro', 'radiolina', 'giornale', 'candele']).filter(g => G2F[g] && !nopeHa(c.M, 'procura:' + g, c.st.t));
    for (const g of cand.slice(0, 4)) { if (!procurabile(c, g, 1)) continue; return { passi: [['@procura', { cosa: g, q: 1 }], ['@casa', {}], ['arreda', { cosa: g }]], costo: .5 + (1 - car(c).teatrale) * .3 }; }
    return null;
  };
  M_.ridipingi = c => {
    const K = CS(); if (!K || !K.INK || !c.A.casa || !c.P.homeT || !aCasaOra(c)) return null; let ink = c.M.gusti.colore;
    if (!ink) { try { const g = K.gusto(c.st, c.n); ink = c.M.gusti.colore = (g && g.colore) || null; const S0 = K.stile ? K.stile(c.st, c.n) : null; c.M.gusti.stile = S0 ? S0.k : null; } catch (e) { } }
    const X = ink && K.INK[ink]; if (!X || !procurabile(c, X.mat, 1)) return null;
    const ult = F.per(c.st, { chi: io(c.n.id), tipo: 'dipinge' }); if (ult.length && c.st.t - ult[ult.length - 1].t < 7 * 1440) return null;
    return { passi: [['@procura', { cosa: X.mat, q: 1 }], ['@casa', {}], ['ridipingi', { ink }]], costo: .9 + car(c).pigro * .5 };
  };
  M_.costruisci = c => {
    if (!(c.n.ris && c.n.ris.member)) return null;
    const B = CA() && CA().BY && CA().BY.panca; if (!B) return null; const P = G.PLACES.molo || G.PLACES.calata; if (!P) return null;
    for (const k in B.cost || {}) if (!procurabile(c, k.split('|')[0], B.cost[k])) return null;
    const x = r1(P.x + (hashS(c.n.id + 'x') - .5) * 16), y = r1(P.y + (hashS(c.n.id + 'y') - .5) * 16);
    return { passi: Object.keys(B.cost || {}).map(k => ['@procura', { cosa: k.split('|')[0], q: B.cost[k] }]).concat([vai({ x, y }), ['costruisci', { id: 'panca', x, y, rot: 0 }]]), costo: 1.2 };
  };
  M_.vedersi = c => {
    const ap = appOra(c), st = c.st; if (!ap || ap.__uInc || ap.__uBuca) return null;
    const k = npc(st, ap.with); if (!k || k.dead) return null;
    const venuto = x => !!(x && x.pop && x.pop.apptArrived && x.pop.apptArrived >= ap.t - 60);
    const io0 = venuto(c.n) || hyp(c.n.x - ap.tgt.x, c.n.y - ap.tgt.y) < 15, lui = venuto(k) || hyp(k.x - ap.tgt.x, k.y - ap.tgt.y) < 15;
    // l'incontro lo scrive chi dei due si vede (il vicino, dove sta davvero): il lontano è «dentro» il posto, per il livello
    if (io0 && lui && st.t >= ap.t - 5) {
      if (!c.n.pop.near && k.pop.near) return { attesa: true };
      const d = hyp(k.x - c.n.x, k.y - c.n.y), avvicina = c.n.pop.near && k.pop.near && !k.inside && !c.n.inside && d > 2.2 && d <= 40 ? vaiDa(c, k) : [];
      if (c.n.pop.near && k.pop.near && d > 40) return { attesa: true };
      return { passi: avvicina.concat([['@incontro', { chi: k.id }]]), costo: 0, chi: k.id };
    }
    if (io0 && !lui && st.t > ap.t + 40) return { passi: [['@buca', { chi: k.id }]], costo: 0, chi: k.id };
    return { attesa: true };
  };
  function amico(c, filtro) { let best = null, bs = -1e9; for (const v of vicini(c)) { if (!filtro(v)) continue; const s = v.aff + (v.k && v.k.pop && (v.k.pop.ints || []).some(x => (c.M.gusti.ints || []).includes(x.k)) ? .2 : 0) - v.d / 40 + hashS(c.n.id + v.id + c.d) * .1; if (s > bs) { bs = s; best = v; } } return best; }
  // la diceria dalle memorie: un fatto che so (l'ho fatto, l'ho visto, me l'hanno detto), notevole, di ieri o di oggi, che l'altro non sa
  const NODICE = new Set(['chiacchiera', 'social', 'vai', 'entra', 'esce', 'mangia', 'beve', 'dorme', 'prende', 'posa', 'lavora', 'promemoria', 'ricordo']);
  function diceriaPer(c, b) {
    const So = SO(); if (!So) return null; const st = c.st, me = io(c.n.id), L = c.M.memorie.slice().sort((x, y) => y[1] - x[1] || y[0] - x[0]);
    for (const [fid] of L.slice(0, 10)) {
      const f = F.di(st, fid); if (!f || f.esito === 'no' || NODICE.has(f.v) || st.t - f.t > 2880) continue;
      if (st.t - f.t > 360 && !(f.ril >= .25)) continue;   // l'anello lo butterà fra poco: si racconta il fresco, o il notevole
      const at = [f.chi].concat(f.con || []).map(io); if (at.includes(b)) continue;
      if (!at.includes(me) && !(f.pub >= .3)) continue;
      if (So.sa(st, b, f)) continue;
      return f;
    }
    return null;
  }
  M_.racconta = c => {
    const L = vicini(c).filter(v => !nopeHa(c.M, 'chiacchiera:' + v.id, c.st.t)).slice(0, 3);
    for (const v of L) { const f = diceriaPer(c, v.id); if (f) return { passi: vaiDa(c, v.k || c.st.player).concat([['chiacchiera', { chi: v.id, di: f.id }]]), costo: .3 - car(c).loq * .2, chi: v.id, perche: f.id }; }
    return null;
  };
  // l'ora e il posto dell'appuntamento: tutti e due liberi (il lavoro), il posto dai gusti (il locale per chi beve o gioca a carte)
  function quandoDove(c, k) {
    const st = c.st, d = giorno(st), h = c.h, free = (x, when) => { const J = x.pop.job, wm = when % 1440, wd = (Math.floor(when / 1440) + 1) % 7; return !J || J.night || wd === 6 || wm < J.start * 60 - 60 || wm > J.end * 60 + 15; };
    const cand = h < 15 ? [17, 17.5, 18, 18.5] : h < 18 ? [h + 2, h + 2.5] : [24 + 11, 24 + 17, 24 + 17.5];
    let when = null; for (const x of cand) { const w = d * 1440 + Math.round(x * 2) / 2 * 60; if (w > st.t + 45 && free(c.n, w) && free(k, w)) { when = w; break; } }
    if (when === null) return null;
    const ints = c.M.gusti.ints || [], vizio = c.P.vice === 'vino' || (ints.includes('carte') && (k.pop.ints || []).some(x => x.k === 'carte'));
    const L = (vizio ? LOCALI : car(c).teatrale > .6 ? ['piazza', 'passeggiata', 'lungomare'] : ESTERNI).filter(x => G.PLACES[x]);
    const posto = L.length ? L[Math.floor(hashS(c.n.id + '|' + k.id + '|' + d) * L.length)] : null;
    return posto ? { ora: when, posto } : null;
  }
  M_.proponi = c => {
    if (c.P.appt || c.M.orario.app === c.d) return null;
    const v = amico(c, x => !x.nino && x.k.pop && !x.k.pop.appt && (x.aff > .15 || N(c, 'compagnia') > .5) && x.aff > -.1); if (!v) return null;
    const q = quandoDove(c, v.k); if (!q) return null;
    return { passi: vaiDa(c, v.k).concat([['proponi_appuntamento', { chi: v.id, ora: q.ora, posto: q.posto }]]), costo: .4 + (1 - car(c).loq) * .3, chi: v.id };
  };
  M_.regala = c => {
    const v = amico(c, x => !x.nino && x.aff > .2 && !nopeHa(c.M, 'regala:' + x.id, c.st.t)); if (!v) return null; const g = dono(c, v.k); if (!g) return null;
    const ult = ultimo(c.st, io(c.n.id), v.id, 'regalo'); if (ult && c.st.t - ult.t < 1440) return null;
    return { passi: vaiDa(c, v.k).concat([['regala', { chi: v.id, cosa: g, q: 1 }]]), costo: .3 + car(c).avid * .4, chi: v.id };
  };
  M_.presta = c => {
    const v = amico(c, x => !x.nino && x.aff > 0 && x.k.pop && ((x.k.pop.need && x.k.pop.need.soldi > .5) || (x.k.pop.money || 0) < 12) && F.debito(c.st, io(c.n.id), x.id) <= 0); if (!v) return null;
    const s = Math.max(2, Math.min(15, Math.round(soldiDi(c.A) * (.08 + car(c).generoso * .12)))); if (soldiDi(c.A) < s + 15) return null;
    return { passi: vaiDa(c, v.k).concat([['presta', { chi: v.id, soldi: s }]]), costo: .4 + car(c).avid * .5, chi: v.id };
  };
  M_.chiedi = c => {
    const v = amico(c, x => !x.nino && x.aff > -.1 && (x.k.pop.money || 0) >= 30 && F.debito(c.st, x.id, io(c.n.id)) <= 0 && !nopeHa(c.M, 'chiedi_prestito:' + x.id, c.st.t)); if (!v) return null;
    const s = Math.max(3, Math.min(15, Math.round((v.k.pop.money || 0) * .2)));
    return { passi: vaiDa(c, v.k).concat([['chiedi_prestito', { chi: v.id, soldi: s }]]), costo: .5 + car(c).orgoglio, chi: v.id };
  };
  // il conto: andare da lui (vicino: entro la strada a piedi; lontano: dove sta adesso)
  function daLui(c, id) {
    if (id === 'nino') { const p = c.st.player; return !lontano(c) && !p.indoor && hyp(p.x - c.n.x, p.y - c.n.y) < CFG.R.persona ? vaiDa(c, p) : null; }
    const k = npc(c.st, id); if (!k || k.dead || k.__ev || k.pop.emer) return null;
    if (!!k.inside !== !!c.n.inside && !lontano(c)) return null;
    const d = hyp(k.x - c.n.x, k.y - c.n.y);
    if (lontano(c)) { if (!k.pop.near && d <= CFG.R.lontano) return []; return !k.pop.near && k.inside ? [vai({ x: k.x, y: k.y })] : null; }
    if (d <= CFG.R.persona) return vaiDa(c, k);
    // un conto si va a cercarlo un po' più in là, se l'altro sta fermo (al suo posto, non per strada)
    return d <= CFG.R.conto && !k.inside && !c.n.inside && (k.speedNow || 0) < .2 ? vaiDa(c, k) : null;
  }
  M_.salda = c => { const x = conti(c); if (!x || x.tipo !== 'salda') return null; const v = daLui(c, x.id); if (!v) return null; return { passi: v.concat([['salda', { chi: x.id }]]), costo: .2 + car(c).avid * .4, chi: x.id, perche: x.perche }; };
  M_.rinfaccia = c => { const x = conti(c); if (!x || x.tipo !== 'riscuoti') return null; const v = daLui(c, x.id); if (!v) return null; return { passi: v.concat([['rinfaccia', { chi: x.id }]]), costo: .3 + car(c).orgoglio * .2 - car(c).rancore * .2, chi: x.id, perche: x.perche }; };
  M_.rinfaccia_torto = c => { const x = rancoreMax(c); if (!x || x.v < .25) return null; const v = daLui(c, x.id); if (!v) return null; const ult = ultimo(c.st, io(c.n.id), x.id, 'rinfacciato'); if (ult && c.st.t - ult.t < 720) return null; return { passi: v.concat([['rinfaccia', { chi: x.id }]]), costo: .4 - car(c).teatrale * .2, chi: x.id }; };
  function muroVicino(c) { let best = null, bd = 1e9; for (const id of MURI) { const P = G.PLACES[id]; if (!P) continue; const d = hyp(P.x - c.A.x, P.y - c.A.y) + hashS(c.n.id + id + c.d) * 30; if (d < bd) { bd = d; best = id; } } return best && (lontano(c) || hyp(G.PLACES[best].x - c.A.x, G.PLACES[best].y - c.A.y) <= CFG.R.scena) ? best : null; }
  M_.scritta = c => {
    if (car(c).legge > .6 || c.h >= 8 && c.h < 19 && car(c).cor < .6) return null; const m = muroVicino(c); if (!m) return null; const con = c.A.borsa.get('bomboletta') ? 'bomboletta' : 'gesso';
    if (con === 'gesso' && !procurabile(c, 'gesso', 1)) return null; const P = G.PLACES[m];
    return { passi: [['@procura', { cosa: con, q: 1 }], vai({ x: P.x, y: P.y }), ['dipingi_muro', { muro: m, con }]], costo: .8 + car(c).legge };
  };
  M_.muro = c => {
    const m = muroVicino(c); if (!m) return null; const con = c.A.borsa.get('bomboletta') ? 'bomboletta' : c.A.borsa.get('pennello') ? 'pennello' : procurabile(c, 'bomboletta', 1) ? 'bomboletta' : procurabile(c, 'gesso', 1) ? 'gesso' : null; if (!con) return null;
    const P = G.PLACES[m]; return { passi: [['@procura', { cosa: con, q: 1 }], vai({ x: P.x, y: P.y }), ['dipingi_muro', { muro: m, con }]], costo: .5 };
  };
  M_.bevi_borsa = c => { const g = bevanda(c); return g ? { passi: [['bevi', { cosa: g }]], costo: .05 } : null; };
  M_.compra_bevi = c => {
    let best = null; for (const g of suoi(c, ['vino', 'birra', 'aranciata', 'caffe_tazza', 'acqua'], 3).concat(c.P.vice === 'vino' ? ['vino'] : [])) { const w = doveCompra(c, g, 1); if (!w) continue; const cost = w.cost + (c.P.vice === 'vino' && g === 'vino' ? -1 : 0) + hashS(c.n.id + g) * .3; if (!best || cost < best.cost) best = Object.assign({ g }, w, { cost }); }
    if (!best) return null; const v = vaiA(c, best.Sh.t, 7.5); if (!v) return null;
    return { passi: v.concat([['compra', { cosa: best.g, q: 1, dove: best.k }], ['bevi', { cosa: best.g }]]), costo: .3 + best.cost * .1 };
  };
  // il riposino: solo a casa (ci porta popolo, col blocco «casa»), e solo da vicino (lontano dorme popolo)
  M_.dormi = c => { const h = c.P.homeT; if (!h || !c.A.casa || lontano(c)) return null; const v = vaiA(c, h, 5.5); if (!v || v.length) return null; return { passi: [['dormi', { ore: 1 }]], costo: .2 }; };
  M_.a_casa = c => { const h = c.P.homeT; if (!h) return null; const v = vaiA(c, h, 5.5); return v && v.length ? { passi: v, costo: .2 } : null; };
  M_.chiesa = c => { const P = G.PLACES.chiesa; if (!P) return null; const v = vaiA(c, { x: P.x, y: P.y }, 10); return v && v.length ? { passi: v, costo: .2 } : null; };
  const METODI = M_;

  // ======================= I COMPOSTI: si espandono quando tocca a loro (il piano parziale) =======================
  function espandi(c, nome, a, prof) {
    const st = c.st, A = c.A;
    if (nome === 'casa') { const h = c.P.homeT; return h ? vaiA(c, h, 5.5) : null; }
    if (nome === 'obiettivo') { const r = pianifica(c, a.g, true); return r && !r.attesa ? r.passi : null; }
    if (nome === 'vendi') { const q = A.borsa.get(a.cosa); if (q < 1) return []; const w = doveVende(c, a.cosa); if (!w) return []; const v = vaiA(c, w.Sh.t, 7.5); return v ? v.concat([['vendi', { cosa: a.cosa, q, dove: w.k }]]) : []; }
    if (nome === 'incontro') { incontro(c, a.chi); return []; }
    if (nome === 'buca') { buca(c, a.chi); return []; }
    if (nome === 'procura') return procura(c, a.cosa, a.q || 1, prof || 0);
    return null;
  }
  // procura(cosa, q): i metodi in ordine di costo per carattere
  function procura(c, g, q, prof) {
    const A = c.A, k = car(c), opz = [];
    if (A.borsa.get(g) >= q) return [];
    const D = A.casa && A.casa.dispensa, h = c.P.homeT;
    if (D && D.get(g) >= q && h && aCasaOra(c)) { const v = vaiA(c, h, 5.5); if (v) opz.push({ c: .2 + v.length * .3, p: v.concat([['prendi', { cosa: g, q, da: 'casa' }]]) }); }
    const w = doveCompra(c, g, q);
    if (w) { const v = vaiA(c, w.Sh.t, 7.5); if (v) opz.push({ c: w.cost * (1.2 - k.pigro * .4) + .2, p: v.concat([['compra', { cosa: g, q, dove: w.k }]]) }); }
    if (prof < 3) for (const rk of ricetteDi(g)) {
      const R = OG().RECIPES[rk]; if (R.st || R.place || nopeHa(c.M, 'fai_ricetta:' + rk, c.st.t)) continue;
      const ing = Object.entries(R.in).map(([key, n]) => [key.split('|').find(x => A.borsa.get(x) >= n) || key.split('|')[0], n]);
      const ok = ing.every(([x, n]) => A.borsa.get(x) >= n || procurabile(c, x, n, prof + 1)) && R.tools.every(key => key.split('|').some(x => A.borsa.get(x) > 0));
      if (ok) opz.push({ c: R.min / 90 * (1 + k.pigro) * (1 - k.avid * .3) + .3, p: ing.filter(([x, n]) => A.borsa.get(x) < n).map(([x, n]) => ['@procura', { cosa: x, q: n }]).concat([['fai_ricetta', { rec: rk, volte: 1 }]]) });
      break;
    }
    if (!w && k.orgoglio < .7) {   // i soldi che mancano: un prestito, poi si compra
      const p0 = Object.values(botteghe(c.st)).find(Sh => Sh.sells[g] && (Sh.stock[g] || 0) >= q && Sh.t);
      const v = p0 && vicini(c).find(x => !x.nino && x.aff > -.1 && (x.k.pop.money || 0) >= 30 && F.debito(c.st, x.id, io(c.n.id)) <= 0);
      if (v) opz.push({ c: 1.2 + k.orgoglio * 2, p: vaiDa(c, v.k).concat([['chiedi_prestito', { chi: v.id, soldi: Math.min(15, Math.ceil(prezzo(c.st, p0, g) * q + 1)) }], ['@procura', { cosa: g, q }]]) });
    }
    { // il baratto: chi ce l'ha qui, con la mia roba in più
      const mia = vendibile(c), v = mia && vicini(c).find(x => !x.nino && x.k.pop && (x.k.pop.inv || {})[g] >= q);
      if (v) opz.push({ c: .8 + (1 - k.loq) * .4 - k.avid * .3, p: vaiDa(c, v.k).concat([['baratta', { chi: v.id, dai: { [mia]: 1 }, prendi: { [g]: q } }]]) });
    }
    for (const f of EST.procura) { let o = null; try { o = f(c, g, q); } catch (e) { o = null; } if (o) opz.push(o); }   // [costruire] raccattare in giro
    if (!opz.length) return null;
    opz.sort((x, y) => x.c - y.c);
    return opz[0].p;
  }
  // l'incontro all'appuntamento: un esito composto (il fatto lo scrive la mente: i due si sono visti), poi la chiacchiera se c'è da dire
  function esito(st, tipo, chi, dati, causa) {
    let r = null; try { r = F.scrivi(tipo, chi, dati, causa, { st }); } catch (e) { r = null; }
    if (r && r.id !== null && r.id !== undefined) return r.id;
    const f = F._.registra(st, { t: st.t, v: tipo, chi, causa: null, peso: 1, hop: 0 }, dati, 'unico'); return f ? f.id : null;
  }
  function segnaApp(st, n, k) { for (const x of [n, k]) { const ap = x && x.pop && x.pop.appt; if (ap) { ap.__vArr = true; ap.__uInc = 1; } } }
  function incontro(c, id) {
    const st = c.st, n = c.n, k = npc(st, id), ap = c.P.appt; if (!k || !ap) return;
    const fa = ultimo(st, io(ap.by), io(ap.by === n.id ? k.id : n.id), 'appuntamento');
    const fid = esito(st, 'incontro', [n.id, k.id], { dove: ap.label, ora: ap.t, x: n.x, y: n.y, mente: 'socializzare' }, fa ? fa.id : null);
    segnaApp(st, n, k); stats.incontri++;
    if (n.pop.need) n.pop.need.compagnia = Math.max(0, (n.pop.need.compagnia || 0) - .4);
    // c'è da raccontare? la chiacchiera, col verbo
    const f = diceriaPer(c, io(k.id));
    if (f && c.M.piano) { for (const x of vaiDa(c, k) || []) c.M.piano.passi.push(x); c.M.piano.passi.push(['chiacchiera', { chi: k.id, di: f.id }]); }
    if (c.M.piano && fid) c.M.piano.ultimo = fid;
  }
  function buca(c, id) {
    const st = c.st, n = c.n, k = npc(st, id), ap = c.P.appt; if (!k || !ap) return;
    esito(st, 'buca', [k.id, n.id], { dove: ap.label, ora: ap.t, x: n.x, y: n.y, mente: 'socializzare' }, null);
    for (const x of [n, k]) { const a2 = x.pop && x.pop.appt; if (a2) { a2.__vArr = true; a2.__uBuca = 1; } }
    stats.buche++;
  }

  // ======================= IL PIANO: si sceglie, si espande in testa, si mette in opera =======================
  // il costo di un metodo per carattere (§3.1: il pigro compra, l'orgoglioso non chiede, l'avaro fa da sé, il chiacchierone racconta),
  // più quello che ha già fatto oggi (la stessa cosa stanca): l'ordine in cui si provano; vince il primo che si può fare
  const COSTO = {
    mangia_borsa: k => .05, mangia_casa: k => .2, compra_cibo: k => .3 + k.avid * .3 - k.pigro * .1, cucina: k => .3 + k.pigro * .5 - k.avid * .25, prestito_cibo: k => 1 + k.orgoglio * 2,
    turno: k => .1, vendi_roba: k => .3, pesca_vendi: k => .5 + k.pigro * .4 - k.avid * .2, rifornisci: k => .3, mobile: k => .4 + (1 - k.teatrale) * .3, ridipingi: k => .5 + k.pigro * .5,
    costruisci: k => .5, vedersi: k => -1, racconta: k => .35 - k.loq * .25, proponi: k => .4 - k.loq * .1 + k.orgoglio * .1, regala: k => .3, presta: k => .3, chiedi: k => .3,
    salda: k => .2 + k.avid * .3, rinfaccia: k => .3 + k.orgoglio * .1 - k.rancore * .2, rinfaccia_torto: k => .3 - k.teatrale * .2, scritta: k => .4 + k.legge,
    muro: k => .3, pesca: k => .3, bevi_borsa: k => .05, compra_bevi: k => .3, dormi: k => .2, a_casa: k => .2, chiesa: k => .2,
  };
  function oggi(c) { const M = c.M; if (!M.oggi || M.oggi.d !== c.d) M.oggi = { d: c.d, m: {} }; return M.oggi.m; }
  function pianifica(c, g, dentro) {
    const D = OBIETTIVI[g]; if (!D) return null; let attesa = false; const O = oggi(c), k = c.M.carattere;
    const ord = D.metodi.map(m => [m, (COSTO[m] ? COSTO[m](k) : .5) + .3 * (O[m] || 0)]).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
    for (const [m] of ord) {
      if (nopeHa(c.M, 'm:' + m, c.st.t)) continue;
      let r = null; try { r = METODI[m](c); } catch (e) { r = null; if (Un()._ && Un()._.conta) Un()._.conta('unico.mente', e); }
      if (!r) continue; if (r.attesa) { attesa = true; continue; }
      return Object.assign({ m }, r);
    }
    return attesa && !dentro ? { attesa: true } : null;
  }
  // il «non si può» si segna sulla cosa che è mancata: la persona per i verbi con qualcuno, se no la roba, la ricetta, il muro, la bottega
  const nopeKey = (v, a) => v + ':' + (a.chi || a.cosa || a.rec || a.muro || a.dove || '');
  function avvia(st, n, M, c, g, u, r) {
    if (r.chi && r.chi !== 'nino') { const Mk = st.u.menti[r.chi]; if (Mk) Mk.occupato = r1(st.t + 10); }
    M.ob = { g, a: r.chi ? { chi: r.chi } : {}, u: r2(u), perche: r.perche || null, t0: r1(st.t), metodo: r.m };
    M.piano = { passi: r.passi.map(x => [x[0], Object.assign({}, x[1])]), i: 0, t0: r1(st.t), metodo: r.m, att: null, fatti: [], ultimo: r.perche || null, verbi: [] };
    stats.avvii++; stats.per[g] = (stats.per[g] || 0) + 1; stats.perMetodo[r.m] = (stats.perMetodo[r.m] || 0) + 1;
    if (r.m === 'proponi') M.orario.app = c.d;
    { const O = oggi(c); O[r.m] = (O[r.m] || 0) + 1; }
    if (CFG.registro) LOG.push([r1(st.t), n.id, g, r.m]);
    PRONTE.push(n.id);   // il primo passo al passo dopo: il piano e il verbo non pesano sullo stesso passo
  }
  function fallisce(st, n, M, chiave, msg, breve) {
    const g = M.ob && M.ob.g; stats.falliti++;
    if (chiave) nope(M, chiave, st.t + (breve ? CFG.nopeBreve : CFG.nope));
    if (g) nope(M, 'g:' + g, st.t + CFG.nopeBreve);
    if (M.piano && M.piano.metodo) nope(M, 'm:' + M.piano.metodo, st.t + CFG.nopeBreve);
    const k = String(msg || '').slice(0, 40); stats.perche[k] = (stats.perche[k] || 0) + 1;
    M.ob = null; M.piano = null; M.prossima = r1(st.t + 2); INCORSO.delete(n.id);
  }
  // [molo] la sazietà: gli obiettivi che si compiono arrivando (in chiesa, a casa a lavarsi) non si riscelgono appena fatti. Senza,
  // nella mattina sul molo «pregare» tornava 200 volte in due ore e mezza (la messa dura due ore): mezza città su e giù per la chiesa
  const SAZIA = { pregare: 180, igiene: 120 };
  function finePiano(st, n, M) {
    const Pi = M.piano, s = S(st); stats.riusciti++;
    { const g = M.ob && M.ob.g; if (g && SAZIA[g]) nope(M, 'g:' + g, st.t + SAZIA[g]); }
    if (Pi && Pi.verbi.length >= 2) {
      const key = Pi.verbi.join('>'), C = s.catene[key] || (s.catene[key] = [0, 0]); C[0]++; C[1] = r1(C[1] + (st.t - Pi.t0));
      if (C[0] >= CFG.macro.soglia && !s.macro[key] && Object.keys(s.macro).length < CFG.macro.max) s.macro[key] = { passi: Pi.verbi.slice(), min: r1(C[1] / C[0]) };
      if (Object.keys(s.catene).length > 200) { for (const k of Object.keys(s.catene)) if (s.catene[k][0] < 2) delete s.catene[k]; }
    }
    M.ob = null; M.piano = null; M.prossima = r1(st.t + 1); INCORSO.delete(n.id);
  }
  // un passo del piano, già legato: il verbo per Verbo.fai, la stessa porta del giocatore
  function prosegui(st, n, M, c) {
    const Pi = M.piano; if (!Pi || Pi.att) return;
    c = c || contesto(st, n, M);
    for (let guardia = 0; guardia < 10; guardia++) {
      if (M.piano !== Pi) return;
      if (Pi.i >= Pi.passi.length) return finePiano(st, n, M);
      const t = Pi.passi[Pi.i];
      if (t[0][0] === '@') {
        const ex = espandi(c, t[0].slice(1), t[1], 0); stats.espansi++;
        if (M.piano !== Pi) return;
        if (!ex) return fallisce(st, n, M, t[0] === '@procura' ? 'procura:' + t[1].cosa : 'c:' + t[0], 'non si trova: ' + t[0].slice(1) + (t[1].cosa ? ' ' + t[1].cosa : ''));
        Pi.passi.splice(Pi.i, 1, ...ex.map(x => [x[0], Object.assign({}, x[1])]));
        continue;
      }
      const [v, a] = t;
      if (v === 'vai' && hyp(a.x - n.x, a.y - n.y) < 1.5) { Pi.i++; continue; }
      // il cambio di livello a metà: chi è appena diventato lontano ed è ancora fuori, popolo lo rimette al suo posto (snapFar);
      // il resto del piano non vale più: si ripensa (senza nope)
      if (lontano(c) && !n.inside) { stats.cambi++; M.ob = null; M.piano = null; M.prossima = r1(st.t + 2); INCORSO.delete(n.id); return; }
      if (PESANTI.has(v) && BUD.pesanti >= CFG.pesanti) { PRONTE.push(n.id); return; }   // un verbo che costa (il banco, il prestito): uno per passo
      if (PESANTI.has(v)) BUD.pesanti++;
      if (lontano(c) && macroDa(st, n, M, c)) return;
      const r = V.fai(st, n, v, a, { causa: Pi.ultimo || null, lod: c.lod === 'dormiente' ? 'lontano' : c.lod, prio: 1 });
      stats.fai++; stats.perVerbo[v] = (stats.perVerbo[v] || 0) + 1;
      if (!r.ok) return fallisce(st, n, M, nopeKey(v, a), r.msg);
      if (r.compito === 'subito') { const f = r.fid !== null && r.fid !== undefined ? F.di(st, r.fid) : null; if (f && f.esito !== 'no') { compiuto(st, n, M, f); continue; } return fallisce(st, n, M, nopeKey(v, a), r.msg || 'non riuscito'); }
      Pi.att = { v, t0: r1(st.t), scad: r1((r.quando || st.t) + (r.compito === 'coda' ? 30 : 600)), modo: r.compito };
      if (r.compito === 'piano' && a.chi && a.chi !== 'nino') ascolta(st, n, a.chi, v);
      INCORSO.add(n.id); return;
    }
  }
  // chi ascolta resta lì: per la durata del verbo sociale l'altro aspetta (un passo «ascolta» di Azioni, che lo tiene fermo e girato
  // verso chi parla). È la prenotazione della persona: senza, popolo lo porta via a metà frase
  function ascolta(st, n, id, v) {
    const k = npc(st, id), Z = AZ(), S0 = V.SCHEDE[v]; if (!k || !k.pop || k.pop.emer || !k.pop.near || !Z || !Z.startPlan || !S0) return;
    const min = typeof S0.costo.min === 'number' ? S0.costo.min : 3;
    const passo0 = { label: 'ascolta ' + n.first, dur: min + 1.5, act: () => 'next', tick: (s2, k2) => { k2.face = Math.atan2(n.y - k2.y, n.x - k2.x); } };
    if (Z.startPlan(st, k, 'ascolta', 'ascolta ' + n.first, [passo0], 1, { verbo: null, ascolta: n.id })) stats.ascolti++;
  }
  function compiuto(st, n, M, f) {
    const Pi = M.piano; if (!Pi) return;
    Pi.fatti.push(f.id); if (Pi.fatti.length > 12) Pi.fatti.shift();
    const v = (f.x && f.x.verbo) || f.v; Pi.verbi.push(v); if (v !== 'vai') Pi.ultimo = f.id;
    if (v === 'lavora') M.orario.lav = r1(st.t);
    Pi.att = null; Pi.i++;
  }
  // il macroverbo: per chi è lontano, la coda dei primitivi rimasti è una catena nota → un evento solo, alla fine delle durate sommate
  function macroDa(st, n, M, c) {
    const Pi = M.piano, s = S(st), rest = Pi.passi.slice(Pi.i); if (rest.length < 2 || rest.some(x => x[0][0] === '@')) return false;
    const key = rest.map(x => x[0]).join('>'), Mc = s.macro[key]; if (!Mc) return false;
    if (V.puo(st, n, rest[0][0], rest[0][1])) return false;
    const q = [r1(st.t + Math.max(1, Mc.min)), n.id, key]; const Q = s.coda; let i = Q.length; while (i > 0 && Q[i - 1][0] > q[0]) i--; Q.splice(i, 0, q);
    Pi.att = { macro: key, t0: r1(st.t), scad: r1(q[0] + 60) }; INCORSO.add(n.id); stats.macro++;
    return true;
  }
  function codaMacro(st, s) {
    const Q = s.coda; let k = 0;
    while (Q.length && Q[0][0] <= st.t && k++ < 1) {   // un macroverbo per passo (i suoi passi sono verbi veri, ognuno col suo fatto)
      const [, id, key] = Q.shift(), n = npc(st, id), M = st.u.menti[id]; if (!n || !M || !M.piano || !M.piano.att || M.piano.att.macro !== key) continue;
      const Pi = M.piano; Pi.att = null; INCORSO.delete(id);
      for (let j = 0; j < 8 && Pi.i < Pi.passi.length; j++) {
        const [v, a] = Pi.passi[Pi.i]; if (v[0] === '@') break;
        const r = V.applica(st, n, v, a, { causa: Pi.ultimo || null, lod: 'lontano' }); stats.fai++; stats.macroFatti++; stats.perVerbo[v] = (stats.perVerbo[v] || 0) + 1;
        const f = r && r.fid !== null && r.fid !== undefined ? F.di(st, r.fid) : null;
        if (!r || !r.ok || !f) { fallisce(st, n, M, nopeKey(v, a), r ? r.msg : 'macro'); break; }
        compiuto(st, n, M, f);
      }
      if (M.piano === Pi) { if (Pi.i >= Pi.passi.length) finePiano(st, n, M); else PRONTE.push(id); }
    }
  }

  // ======================= IL PENSIERO DI UNO (una scelta d'obiettivo) =======================
  function contesto(st, n, M) {
    const P = n.pop, b = P.cur && P.cur.act;
    return { st, n, M, A: AT.di(st, n), P, h: ora(st), d: giorno(st), lod: lodDi(st, n), blocco: b || 'casa', memo: { vic: null, vend: undefined, mia: undefined, conti: undefined, ranc: undefined }, gen: ++GEN, gh: undefined };
  }
  function pensa(st, n, M) {
    BUD.scelte++; stats.scelte++;
    const c = contesto(st, n, M); M.lod = c.lod; M.orario.blocco = c.blocco; M.orario.fino = r1(prossimoBlocco(st, n));
    if (c.P.appt && !c.P.appt.__vArr) c.P.appt.__vArr = true;   // l'arrivo all'appuntamento lo scrive la mente (vita lo lascia)
    if (M.piano) {
      // [molo] il passo del piano va in fila coi lavori del passo (la quota): se la quota è finita, al prossimo passo
      if (!M.piano.att) { if (BUD.lavori < (CFG.lavori[st.u.classe] || 1)) { BUD.lavori++; prosegui(st, n, M, c); } else if (!PRONTE.includes(n.id)) PRONTE.push(n.id); }
      M.prossima = r1(ritmo(c)); return;
    }
    if (c.lod === 'dormiente') { M.prossima = r1(prossimoBlocco(st, n)); return; }
    if (inPausa(st, n)) { M.prossima = r1(st.t + 3); return; }
    if (M.cand) return;   // ha già scelto: aspetta il suo piano
    if (lontano(c) && prossimoBlocco(st, n) < st.t + 8) { M.prossima = r1(prossimoBlocco(st, n) + 1); return; }   // il blocco cambia fra poco: si pensa dopo
    if (BUD.pieni >= (CFG.pieni[st.u.classe] || 1) || BUD.lavori >= (CFG.lavori[st.u.classe] || 1)) { BUD.scelte--; stats.scelte--; return; }   // la quota è finita: al prossimo giro
    BUD.pieni++; BUD.lavori++;
    const L = scegli(c);
    if (!L.length) { M.ob = null; M.prossima = r1(ritmo(c)); return; }
    // il piano si fa al passo dopo (la scelta e il piano non pesano sullo stesso passo): i due migliori, in fila
    M.cand = L.slice(0, 2).map(x => [x.g, r2(x.u)]); DAPIANO.push(n.id); M.prossima = r1(st.t + 30);
  }
  // il piano HTN dei candidati scelti al passo prima: al più LIM per passo
  function pianoDi(st, n, M) {
    const cand = M.cand; M.cand = null; if (!cand) return;
    const c = contesto(st, n, M);
    if (M.piano || inPausa(st, n) || !candidato(st, n)) { M.prossima = r1(st.t + 3); return; }
    BUD.piani++; stats.piani++;
    let attesa = null;
    for (const [g, u] of cand) {
      const r = pianifica(c, g);
      if (r && r.attesa) { if (!attesa) attesa = { g, u }; continue; }
      if (r) { avvia(st, n, M, c, g, u, r); if (!M.piano || !M.piano.att) M.prossima = r1(st.t + 1); else M.prossima = r1(ritmo(c)); return; }
      nope(M, 'g:' + g, st.t + CFG.nopeBreve);
    }
    if (attesa) { M.ob = { g: attesa.g, a: {}, u: r2(attesa.u), perche: null, t0: r1(st.t), attesa: true }; M.prossima = r1(st.t + 4); stats.attese++; return; }
    M.ob = null; M.prossima = r1(ritmo(c));
  }

  // ======================= LA LETTURA DEI FATTI: memorie, relazioni, piani che vanno avanti, reazioni =======================
  function leggiFatti(st, s) {
    const Mf = F._.M(st); if (!Mf) return; const MM = st.u.menti; let k = 0;
    if (s.ultimo > Mf.n) s.ultimo = Mf.n;
    while (s.ultimo < Mf.n && k++ < CFG.fattiPasso) {
      const f = F.di(st, ++s.ultimo); if (!f) continue;
      const att = [f.chi].concat(f.con || []).filter(x => x !== null && x !== undefined).map(io);
      for (let i = 0; i < att.length; i++) {
        const id = att[i], M = MM[id]; if (!M) continue;
        ricorda(M, f, 'f');
        // la relazione si ricalcola (Fatto.rel) solo per i fatti che cambiano il debito o il rancore
        if (CONTANO.has(f.v)) { M.relV = (M.relV || 0) + 1; for (const o of att) if (o !== id) { const r = M.rel[o] || (Object.keys(M.rel).length < CFG.rel ? (M.rel[o] = [0, 0, 0, 0, r1(st.t), -1]) : null); if (r) r[1] = f.id; } }
        if (i > 0 && REAGISCE.has(f.v)) M.prossima = Math.min(M.prossima, r1(st.t));
        const Sv = f.x && f.x.verbo ? V.SCHEDE[f.x.verbo] : null, pos = Sv && Sv.attori ? Math.max(0, Sv.attori.indexOf('$io')) : 0;
        if (i === pos) {
          const Pi = M.piano, a = Pi && Pi.att;
          if (a && !a.macro && f.x && f.x.verbo === a.v && f.t >= a.t0 - .01) {
            const n = npc(st, id);
            if (f.esito === 'no') { const t0 = Pi.passi[Pi.i]; if (n) fallisce(st, n, M, t0 ? nopeKey(t0[0], t0[1]) : f.x.verbo + ':', f.x.msg || 'non riuscito'); }
            else { compiuto(st, n, M, f); INCORSO.delete(id); PRONTE.push(id); }
          }
          // i membri della banda mangiano e bevono con la Risacca: la fame della banda segue quella del corpo
        }
        if (i === 0) {
          if (f.esito !== 'no' && (f.v === 'mangia' || f.v === 'beve')) { const n = npc(st, id); if (n && n.ris && n.ris.member) { if (f.v === 'mangia') n.ris.fame = clamp((n.pop.need || {}).fame || 0, 0, 1); else n.ris.sete = clamp((n.ris.sete || 0) - .45, 0, 1); } }
        }
      }
      if (f.v === 'appuntamento' && f.esito !== 'no') for (const id of att) { const n = npc(st, id), ap = n && n.pop && n.pop.appt; if (ap) ap.__vArr = true; }
      if (f.pub >= .2) for (const w of f.test || []) { const M = MM[io(w)]; if (M) ricorda(M, f, 'v'); }
      if (f.v === 'chiacchiera' && f.esito !== 'no' && f.x && f.x.di !== undefined) { const M = MM[att[1]], g = F.di(st, +f.x.di); if (M && g) ricorda(M, g, 's'); }
    }
  }
  // i piani in attesa: scaduti, o il piano a passi di Azioni è finito senza fatto (interrotto)
  const INCORSO = new Set(); let INCst = null; const PRONTE = [];
  function controllaAttese(st) {
    if (INCst !== st) { INCORSO.clear(); PRONTE.length = 0; for (const id in st.u.menti) { const M = st.u.menti[id]; if (M.piano && M.piano.att) INCORSO.add(id); } INCst = st; }
    for (const id of INCORSO) {
      const M = st.u.menti[id], a = M && M.piano && M.piano.att; if (!a) { INCORSO.delete(id); continue; }
      const n = npc(st, id); if (!n || n.dead) { if (M) { M.piano = null; M.ob = null; } INCORSO.delete(id); continue; }
      if (st.t > a.scad) { fallisce(st, n, M, a.v ? a.v + ':' : 'macro', 'scaduto', true); continue; }
      if (a.modo === 'piano' && st.t > a.t0 + .3 && !(n.pop.emer && n.pop.emer.verbo === a.v)) fallisce(st, n, M, a.v + ':', 'interrotto', true);
    }
  }

  // ======================= GLI SPEGNIMENTI E LA PAGA =======================
  let installato = false;
  function installa(st) {
    if (!installato) {
      installato = true;
      // lavora: chi ha il lavoro di popolo matura la paga in P.owed al cambio di blocco (popolo.js onBlockStart): il verbo non paga due volte
      const c0 = V.CALC.lavora, t0 = V.EFF.turno;
      if (c0 && !c0.__mente) { const c1 = function (st2, A, a, d) { c0(st2, A, a, d); if (A && A.o && A.o.pop && A.o.pop.job) { d.maturata = d.paga; d.paga = 0; d.popolo = true; } }; c1.__mente = true; V.CALC.lavora = c1; }
      if (t0 && !t0.__mente) { const t1 = function (c) { t0(c); if (c.d.popolo) c.r = Object.assign({}, c.r || {}, { maturata: c.d.maturata }); /* la paga che matura in P.owed (il fatto ha al più 10 campi) */ }; t1.__mente = true; V.EFF.turno = t1; }
      // vita: i conti che la mente copre tornano null; l'appuntamento proposto da vita non parte più
      const Vi = VI();
      if (Vi && Vi._ && Vi._.CONTI) {
        const L = Vi._.CONTI;
        for (let i = 0; i < L.length; i++) { const f = L[i]; if ((f === Vi._.contoDebito || f === Vi._.contoBuca) && !f.__mente) { const z = function () { stats.vitaZitta++; return null; }; z.__mente = true; z.vecchio = f; L[i] = z; } }
        if (Vi.CFG) { Mente._.appGiorno0 = Vi.CFG.appGiorno; Vi.CFG.appGiorno = 0; }
      }
    }
    const Vs = st.vita; if (Vs && Vs.regali && !Vs.regali.__mente) Vs.regali = regaliZitti(Vs.regali);
  }
  // il regalo di vita (vita.js regalo): «già fatto oggi» per chiunque, così il regalo lo decide la mente
  function regaliZitti(o) {
    return new Proxy(o, { get(t, k) { if (k === '__mente') return true; if (typeof k === 'string' && !(k in t) && k !== 'toJSON' && k !== 'constructor' && k.slice(0, 2) !== '__') { stats.vitaZitta++; const S0 = Un().st; return S0 ? Math.floor(S0.t / 1440) : 0; } return t[k]; } });
  }
  // Risacca.autonomy, membro per membro: chi ha la mente non decide più da sé (r.autoAt in avanti); gli ordini restano
  function spegniAutonomia(st, s) {
    for (const n of st.npcs) {
      const r = n.ris; if (!r || !r.member || n.dead) continue;
      if (r.auto !== false && st.u.menti[n.id]) { if (!(r.autoAt > st.t + 1e5)) { r.autoAt = r1(st.t + 1e6); if (!s.autoOff[n.id]) stats.autoOff++; s.autoOff[n.id] = 1; } }
      else if (s.autoOff[n.id]) { delete s.autoOff[n.id]; r.autoAt = r1(st.t); }
    }
  }

  // ======================= LA FASE =======================
  const BUD = { scelte: 0, piani: 0, segui: 0, pesanti: 0, pieni: 0, lavori: 0 };
  const DAPIANO = []; let DAPst = null;
  // i verbi che costano (leggono il banco col cambio di persona, o la memoria lunga): al più CFG.pesanti per passo
  const PESANTI = new Set(['compra', 'vendi', 'chiedi_prestito', 'baratta', 'fai_ricetta', 'costruisci', 'proponi_appuntamento', 'arreda', 'ridipingi']);
  function fase(st) {
    const s = S(st); if (!s || !st.npcs) return;
    const t0 = now(); BUD.scelte = 0; BUD.piani = 0; BUD.segui = 0; BUD.pesanti = 0; BUD.pieni = 0; BUD.lavori = 0; stats.passi++;
    try {
      installa(st);
      if (SCENAt < 0 || Un().passi - SCENAt >= 20 || Un().passi < SCENAt) scena(st);
      leggiFatti(st, s);
      codaMacro(st, s);
      if (Un().passi % 8 === 0 || INCst !== st) controllaAttese(st);
      // i passi pronti dei piani già scelti
      const LAV = CFG.lavori[st.u.classe] || 1;
      while (PRONTE.length && BUD.segui < CFG.segui && BUD.lavori < LAV) {
        const id = PRONTE.shift(), M = st.u.menti[id], n = npc(st, id); if (!M || !M.piano || M.piano.att || !n) continue;
        BUD.segui++; BUD.lavori++; prosegui(st, n, M, null);
      }
      // i piani dei candidati scelti al passo prima
      const LIM = CFG.piani[st.u.classe] || 2;
      if (DAPst !== st) { DAPIANO.length = 0; for (const id in st.u.menti) if (st.u.menti[id].cand) DAPIANO.push(id); DAPst = st; }
      while (DAPIANO.length && BUD.piani < LIM && BUD.lavori < LAV) { const id = DAPIANO.shift(), M = st.u.menti[id], n = npc(st, id); if (M && n) { BUD.lavori++; pianoDi(st, n, M); } }
      // le scelte, a rotazione: chi è dovuto (prossima ≤ t), al più CFG.scelte, guardando CFG.giro NPC
      const L = st.npcs, Nn = L.length; let k = 0;
      if (Nn) while (k < CFG.giro && BUD.scelte < CFG.scelte) {
        s.cursore = (s.cursore + 1) % Nn; k++;
        const n = L[s.cursore], M0 = n && st.u.menti[n.id]; if (M0 && M0.prossima > st.t) continue;
        if (!candidato(st, n)) continue;
        const M = M0 || menteDi(st, n, true); if (M.prossima > st.t) continue;
        pensa(st, n, M);
      }
      spegniAutonomia(st, s);   // ogni passo: un membro appena entrato nella banda non fa in tempo a decidere da sé
    } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.mente', e); }
    if (BUD.scelte > stats.maxScelte) stats.maxScelte = BUD.scelte; if (BUD.piani > stats.maxPiani) stats.maxPiani = BUD.piani;
    const ms = now() - t0; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
    if (ms > CFG.tetto) stats.sforati++;   // §6.1.4: lo sforo non rimanda niente, si segna (la classe la abbassa il salvataggio, passo 6)
  }
  // la classe consigliata: se la fase sfora il tetto più di una volta su cento, quella sotto (si applica al salvataggio, non a metà partita)
  function classeConsigliata(st) { const c = (st.u && st.u.classe) || 'xe'; if (stats.passi < 600 || stats.sforati / stats.passi <= .01) return c; return c === 'alto' ? 'xe' : 'tel'; }
  Un().fase('unico.mente', { dopo: 'unico.segni', budget: { p95: .25 } }, fase);
  if (Un().nasce) Un().nasce('mente', st => { S(st); });

  // ======================= PER L'ISPETTORE E LE PROVE =======================
  // il perché di quello che fa: l'obiettivo, l'utilità, il metodo, il passo, il fatto che l'ha mosso
  function perche(st, id) {
    const M = st.u && st.u.menti && st.u.menti[id]; if (!M) return null; const Pi = M.piano;
    return { ob: M.ob ? M.ob.g : null, u: M.ob ? M.ob.u : 0, metodo: Pi ? Pi.metodo : null, passo: Pi && Pi.passi[Pi.i] ? Pi.passi[Pi.i][0] : null, perche: M.ob ? M.ob.perche : null, lod: M.lod, nope: Object.keys(M.nope).filter(k => M.nope[k] > st.t) };
  }
  // [costruire] LE ESTENSIONI: un modulo nuovo (unico_costruire.js) aggiunge fonti, obiettivi, metodi e modi di procurare senza
  // toccare le tabelle di sopra; chi non lo carica ha la mente di sempre (diciotto obiettivi). E: { fonti, obiettivi, metodi, costo, procura }
  function estendi(E) {
    for (const k in E.fonti || {}) { if (FIDX.has(k)) continue; if (FFN.length >= FO_V.length) throw new Error('[Mente] troppe fonti'); FONTI[k] = E.fonti[k]; FIDX.set(k, FFN.length); FFN.push(E.fonti[k]); }
    for (const m in E.metodi || {}) M_[m] = E.metodi[m];
    for (const m in E.costo || {}) COSTO[m] = E.costo[m];
    for (const g in E.obiettivi || {}) {
      const D = Object.assign({ car: [] }, E.obiettivi[g]); D.i = Object.keys(OBIETTIVI).length; D.nk = 'g:' + g;
      D.dc = D.considera.map(([cv, fo, w]) => [CURVE[cv] || CURVE.lin, FIDX.get(fo), w]); if (D.dc.some(x => x[1] === undefined)) throw new Error('[Mente] fonte sconosciuta in ' + g);
      OBIETTIVI[g] = D;
    }
    if (E.procura) EST.procura.push(E.procura);
    ORD.clear(); return Mente;
  }
  function utilitaDi(st, n) { const M = menteDi(st, n, true), c = contesto(st, n, M); const out = {}; for (const g in OBIETTIVI) out[g] = r2(utilita(c, g, OBIETTIVI[g])); return out; }

  Object.assign(Mente, { estendi, classeConsigliata, CFG, CURVE, OBIETTIVI, ORARIO, METODI: Object.keys(METODI), FONTI: Object.keys(FONTI), stats, log: LOG, curva, perche, utilitaDi,
    mente: (st, id) => (st.u && st.u.menti ? st.u.menti[id] || null : null),
    _: { S, nuova, menteDi, contesto, scegli, utilita, pianifica, procura, espandi, prosegui, pensa, fase, lodDi, scena: () => SCENA, BUD, INCORSO, PRONTE, METODI, FONTI, candidato, inPausa, conti, vicini, hashS, appGiorno0: null } });
  Un().Mente = Mente;
  return Mente;
})();
if (typeof window !== 'undefined') window.MenteUnica = MenteUnica; // non window.Mente: quello è mente.js (checkStatus)
