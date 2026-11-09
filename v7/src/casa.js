// [commedia] casa.js: gli NPC arredano, spostano, ridipingono casa con gli stessi strumenti del giocatore; dietro ?commedia
/* Porto Vecchio — la casa di ognuno (progetto e verifica: commedia/CASA.md). Fuori dall'impronta dei tasselli (build.py TASS_FUORI).
   Spento il flag: Casa = { ON: false } e nient'altro (nessun aggancio).

   Il principio: in casa non si costruisce, si prende e si sposta. Chi abita una casa (un abitante, il giocatore, un membro della
   banda che il giocatore guida) la cambia con GLI STESSI VERBI e sullo STESSO STATO: la pianta del piano (Interior.layout(b).floors[f]),
   quella che il motore usa per camminare, che interni_arte.js disegna e che Oggetti fruga (le chiavi b<bi>:<f>:<indice> non cambiano:
   niente si toglie dalla lista, una cosa portata via è o.taken = true come quando il giocatore la prende). I verbi:
     sposta (alla finestra, la tv in mezzo), scambia, posa (una cosa delle tasche, comprata, regalata, rubata, fatta), butta,
     prendi/ruba, dipingi (le pareti: lo stile della stanza, q.wall, dalla tavolozza), pavimento (q.floor), sporca, riordina, ospiti.
   Il registro: st.casa.case[bi].ops, in ordine di tempo, una riga per ogni cambio (chi, verbo, seme, la provenienza della roba).
   Lontano dal giocatore le righe si accumulano (niente pianta da fare: costa 17 ms); si mettono in opera quando la pianta c'è
   (il giocatore entra: Game.HOOKS.indoor; o le case vicine nel tempo libero del browser). Con il giocatore dentro, il cambio si vede:
   l'abitante va, prende (porta, con la cosa in mano), posa, dipinge (vernicia), poi torna al suo posto.
   Il gusto: un vettore piccolo per persona (ordine, kitsch, sobrio, collezione, verde, tv, tifo, ribelle) e un colore suo,
   dal carattere, dal mestiere, dall'età, dai soldi; si sposta con la vita (la vincita, il lutto, la banda, un compagno nuovo).
   Le battute: poche, vere (dicono quello che è appena successo), ≤ 70 caratteri, in fila con i frammenti (Matti, Commedia.contesto),
   ognuna col suo fatto (Vita.fatto se c'è). */
(function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Casa = { ON };
  if (typeof window !== 'undefined') window.Casa = Casa;
  if (typeof module !== 'undefined' && module.exports) module.exports = Casa;
  if (!ON) return;
  const G = typeof Game !== 'undefined' ? Game : null;
  if (!G || !G.HOOKS) return;
  const INT = () => (typeof Interior !== 'undefined' ? Interior : G.INT);
  const Po = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const Og = () => (typeof Oggetti !== 'undefined' ? Oggetti : null);
  const Sc = () => (typeof Scambi !== 'undefined' ? Scambi : null);
  const Ec = () => (typeof Economia !== 'undefined' && Economia.eco ? Economia : null);
  const Vi = () => (typeof Vita !== 'undefined' && Vita.ON ? Vita : null);
  const Cm = () => (typeof Commedia !== 'undefined' && Commedia.ON ? Commedia : null);
  const Mt = () => (typeof Matti !== 'undefined' && Matti.S ? Matti : null);
  const Pa = () => (typeof Parola !== 'undefined' && Parola.ON ? Parola : null);
  const RS = () => (typeof Risacca !== 'undefined' ? Risacca : null);
  const W0 = typeof window !== 'undefined' ? window : null;
  const TS = G.TS || 2, PI = Math.PI, hyp = Math.hypot, rnd = Math.random;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pick = (a, r) => a[Math.floor((r || rnd)() * a.length)];
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const dayOf = t => Math.floor(t / 1440), mOf = t => ((t % 1440) + 1440) % 1440;
  const nomeDi = n => (n ? (n === 'player' ? 'tu' : n.first || n.name || '?') : '?');
  const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

  const CFG = Casa.CFG = {
    ogni: 10,          // minuti di gioco fra due giri di decisione
    pOra: .07,         // probabilità che chi è a casa, sveglio e libero cambi qualcosa in un'ora (poi la pesa il gusto)
    ore: [8, 22.5],    // si mette mano alla casa fra queste ore
    parla: 22,         // le battute solo entro questa distanza (come le iniziative)
    vicino: 120,       // «le case vicine»: le loro piante si fanno nel tempo libero del browser
    opsMax: 60,        // righe per casa, al massimo (le più vecchie messe in opera restano nella pianta, si scordano)
    fatti: 400,
    consegna: 480,     // una voglia: chi non passa dalla bottega giusta, lontano dal giocatore, dopo tanto la compra lo stesso (ci è andato)
    scena: true,       // con il giocatore dentro, il cambio si mette in scena (pose e mano); false: subito
  };

  // ======================================================================================================================
  // LO STATO
  // ======================================================================================================================
  const S = st => st.casa || (st.casa = {
    case: {}, gusti: {}, fatti: [], nf: 1, q: [], ng: 1, righe: [], viste: [], scene: [], voglie: {}, snap: {}, ev: {}, tick: 0, giorno: -1,
    visite: {}, gioc: { ink: 0 }, prov: {}, comprati: {}, intenti: {},
    stats: { decisioni: 0, ops: 0, messe: 0, fallite: 0, scene: 0, sceneFinite: 0, sceneRotte: 0, per: {}, comprati: 0, portati: 0, rubati: 0, buttati: 0,
      dipinti: 0, pavimenti: 0, spostati: 0, notati: 0, riconosciuti: 0, visite: 0, righe: 0, righeTolte: 0, senzaFatto: 0, dette: 0, taciute: 0, piante: 0,
      ms: 0, msMax: 0, passi: 0, giocatore: 0, vietate: 0, condivise: 0, drift: {} },
  });
  Casa.S = S;
  const LK = new Map();   // bi → la pianta già fatta (chi l'ha fatta: noi, il gioco quando il giocatore entra)
  const alive = n => n && !n.dead && n.pop;
  const B = bi => G.BUILDINGS[bi];
  const pl = st => st.player;

  // ======================================================================================================================
  // IL CATALOGO (le voci vere: Interior.SZ, Interior.DECOR, Interior.SMALL; la roba vera: Oggetti.CAT)
  // ======================================================================================================================
  const SEDUTE = /^(chair|chairCushion|ia_poltrona|ia_poltrona_design|loungeChair|ia_sgabello|ia_pouf|ia_sedia_design|chairDesk)$/;
  const DIVANI = /^(ia_divano|ia_divano_design|loungeSofa|loungeSofaLong)$/;
  const TV = /^(ia_tv|televisionVintage)$/;
  const PIANTE = /^(pottedPlant|plantSmall1|ia_pianta_grande|ia_pianta_alta|ia_vaso_fiori)$/;
  const CIARPAME = /^(ia_cartacce|ia_bottiglie|ia_macchia|ia_sedia_rovesciata|ia_birre|ia_posacenere)$/;
  const KITSCH = /^(ia_altarino|ia_icona|ia_crocifisso|ia_specchio_tondo|ia_tappeto_muro|ia_quadro|ia_candela|ia_vaso_fiori|ia_trofei|ia_ritratto)$/;
  const SPOSTABILI = /^(chair|chairCushion|ia_poltrona|ia_poltrona_design|loungeChair|ia_sgabello|ia_pouf|ia_sedia_design|pottedPlant|plantSmall1|ia_pianta_grande|ia_pianta_alta|ia_lampada_piede|ia_lampada_arco|lampRoundFloor|ia_ventilatore|ia_cesto|ia_valigia|cardboardBoxClosed|ia_giornali|ia_pila_libri|ia_tv|televisionVintage|radio|ia_bici|ia_scarpe|ia_palla|ia_giocattoli|ia_casse_crate|ia_stivali)$/;
  const NOHOME = /bagno|ripostiglio|cantine|androne|portineria|lavanderia|dispensa|granaio|magazzino|rimessa|corridoio|retro|cella/;
  const PRINC = ['soggiorno', 'salotto_buono', 'stanza_fam', 'sala_pranzo', 'cucina_abitabile', 'mono_anziana', 'mono_artista', 'monolocale', 'casa_contadina', 'cucina_focolare', 'cucina', 'cucina_comune', 'studio', 'atelier', 'camera'];
  const SURF = { table: .76, tableRound: .76, tableCloth: .76, ia_tavolino: .74, ia_tavolino_tondo: .74, ia_tavolo_lungo: .77, desk: .75, sideTable: .55, kitchenCabinet: .92, ia_credenza: .9,
    ia_scrivania_grande: .78, tableCoffee: .42, ia_cassapanca: .55, ia_tavolino_design: .42, ia_madia: .81, ia_comodino: .56, ia_como: .87, ia_tavolo_design: .76, ia_consolle_ingresso: .83,
    ia_scrivania_design: .76, ia_mobile_dipinto: .88, bookcaseOpenLow: .82 };   // le altezze dei piani d'appoggio (le stesse di interiors.js SURF)
  // la roba delle tasche che diventa una cosa della casa (e al contrario, quando la si prende)
  const G2F = { sedia: 'chair', lampada: 'ia_lampada_piede', radiolina: 'ia_radiolina', dischi: 'ia_dischi_vinile', giornale: 'ia_giornali', candele: 'ia_candela', sveglia: 'ia_sveglia',
    telefono: 'ia_telefono', moka: 'ia_moka', pentola: 'ia_pentola', orologio: 'ia_orologio', quadro: 'ia_quadro', poster: 'ia_poster_film', gioielli: 'ia_portagioie', fotocamera: 'ia_macchina_foto',
    macchina_scrivere: 'ia_macchina_scrivere', binocolo: 'ia_binocolo', profumo: 'ia_profumo', cassetta: 'ia_audiocassette', bicicletta: 'ia_bici', vino: 'ia_bottiglia_vino', grappa: 'ia_grappa',
    whisky: 'ia_whisky', torcia: 'ia_torcia', rivista_proibita: 'ia_rivista', radio_rotta: 'radio', tv_rotta: 'televisionVintage', casse: 'cardboardBoxClosed', volantini: 'ia_volantini' };
  const F2G = { chair: 'sedia', ia_lampada_piede: 'lampada', ia_lampada_arco: 'lampada', lampRoundFloor: 'lampada', ia_abatjour: 'lampada', ia_lampada_tavolo: 'lampada', ia_radiolina: 'radiolina',
    ia_dischi_vinile: 'dischi', ia_candela: 'candele', ia_sveglia: 'sveglia', ia_telefono: 'telefono', ia_moka: 'moka', ia_orologio: 'orologio', ia_quadro: 'quadro', ia_quadro_grande: 'quadro',
    ia_portagioie: 'gioielli', ia_macchina_foto: 'fotocamera', ia_macchina_scrivere: 'macchina_scrivere', ia_binocolo: 'binocolo', ia_profumo: 'profumo', ia_audiocassette: 'cassetta', ia_bici: 'bicicletta',
    ia_bottiglia_vino: 'vino', ia_grappa: 'grappa', ia_whisky: 'whisky', ia_torcia: 'torcia', radio: 'radio_rotta', ia_poster_film: 'poster' };
  const RUBABILI = /^(ia_radiolina|ia_lampada_tavolo|ia_abatjour|ia_lampada_piede|ia_sveglia|ia_portagioie|ia_macchina_foto|ia_quadro|ia_orologio|ia_telefono|ia_binocolo|ia_profumo|ia_dischi_vinile|ia_macchina_scrivere)$/;
  // le cose fatte a mano: la materia vera che si consuma (stoffa, candele, giornale, vernice) e la cosa che diventa
  const FATTE = {
    bandiera: { g: 'stoffa', id: 'ia_bandiera_muro', gusto: 'tifo' }, tappeto_muro: { g: 'stoffa', id: 'ia_tappeto_muro', gusto: 'kitsch' },
    altarino: { g: 'candele', id: 'ia_altarino', gusto: 'kitsch' }, lumino: { g: 'candele', id: 'ia_candela', gusto: 'lutto' },
    stencil: { g: 'bomboletta', id: 'ia_stencil', gusto: 'ribelle' }, volantini: { g: 'volantini', id: 'ia_volantini', gusto: 'ribelle' },
  };
  // le voglie del gusto: cose da comprare (poi arrivano a casa dalle tasche, come tutto il resto)
  const VOGLIE = { collezione: ['giornale', 'dischi', 'casse'], tv: ['radiolina'], kitsch: ['candele', 'stoffa'], tifo: ['stoffa'], sobrio: ['lampada'], ordine: ['sedia'] };
  const NOMI = { chair: 'la sedia', chairCushion: 'la sedia', ia_poltrona: 'la poltrona', ia_poltrona_design: 'la poltrona', loungeChair: 'la poltrona', ia_sgabello: 'lo sgabello', ia_pouf: 'il pouf',
    ia_sedia_design: 'la sedia', chairDesk: 'la sedia', ia_tv: 'la televisione', televisionVintage: 'la televisione', ia_lampada_piede: 'la lampada', ia_lampada_arco: 'la lampada', lampRoundFloor: 'la lampada',
    ia_abatjour: "l'abat-jour", ia_lampada_tavolo: 'la lampada', ia_radiolina: 'la radiolina', radio: 'la radio', ia_quadro: 'il quadro', ia_quadro_grande: 'il quadro', ia_sveglia: 'la sveglia',
    ia_portagioie: 'il portagioie', ia_macchina_foto: 'la macchina fotografica', ia_orologio: "l'orologio", ia_telefono: 'il telefono', ia_binocolo: 'il binocolo', ia_profumo: 'il profumo',
    ia_dischi_vinile: 'i dischi', ia_macchina_scrivere: 'la macchina da scrivere', ia_candela: 'la candela', ia_altarino: "l'altarino", ia_bandiera_muro: 'la bandiera', ia_tappeto_muro: 'il tappeto',
    ia_giornali: 'i giornali', cardboardBoxClosed: 'lo scatolone', ia_stencil: 'lo stencil', ia_volantini: 'i volantini', pottedPlant: 'la pianta', plantSmall1: 'la piantina', ia_pianta_grande: 'la pianta',
    ia_pianta_alta: 'la pianta', ia_vaso_fiori: 'i fiori', ia_cartacce: 'le cartacce', ia_bottiglie: 'le bottiglie', ia_macchia: 'la macchia', ia_birre: 'le birre', ia_posacenere: 'il posacenere',
    ia_icona: "l'icona", ia_crocifisso: 'il crocifisso', ia_specchio_tondo: 'lo specchio', ia_trofei: 'le coppe', ia_ritratto: 'il ritratto', ia_poster_film: 'il poster', ia_bici: 'la bici',
    ia_bottiglia_vino: 'il vino', ia_grappa: 'la grappa', ia_whisky: 'il whisky', ia_torcia: 'la torcia', ia_rivista: 'la rivista', ia_audiocassette: 'le cassette', ia_moka: 'la moka', ia_pentola: 'la pentola',
    ia_sedia_rovesciata: 'la sedia', ia_ventilatore: 'il ventilatore', ia_pila_libri: 'i libri', ia_cesto: 'il cesto', ia_valigia: 'la valigia', ia_scarpe: 'le scarpe', ia_palla: 'il pallone' };
  const FEM_L = new Set(['ia_abatjour', 'ia_icona']);
  const nomeF = id => NOMI[id] || ((INT().FNAME || {})[id] ? 'il ' + INT().FNAME[id] : 'la roba');
  const senzaArt = s => String(s).replace(/^(il|lo|la|i|gli|le|l')\s?/, '');
  const genere = id => { const s = nomeF(id); if (/^(i|gli|le) /.test(s)) return 'p'; if (/^l'/.test(s)) return FEM_L.has(id) ? 'f' : 'm'; return /^la /.test(s) ? 'f' : 'm'; };

  // ======================================================================================================================
  // I COLORI: la tavolozza della Bibbia dello stile (§1), mai i tre riservati (vermiglio, limone, allarme).
  // Ogni inchiostro va sullo stile di parete che interni_arte.js sa dipingere (q.wall); la materia vera: calce o vernice.
  // ======================================================================================================================
  const INK = {
    carta: { stile: 'calce', mat: 'calce', w: 'bianco' }, osso: { stile: 'crema', mat: 'vernice', w: 'crema' }, pesca: { stile: 'ocra', mat: 'vernice', w: 'pesca' },
    ocra: { stile: 'ocra', mat: 'vernice', w: 'ocra' }, cotto: { stile: 'rosso', mat: 'vernice', w: 'cotto' }, mattone: { stile: 'rosso', mat: 'vernice', w: 'rosso mattone' },
    cielo: { stile: 'azzurro', mat: 'vernice', w: 'azzurro' }, acqua: { stile: 'ospedale', mat: 'vernice', w: 'verde acqua' }, oltremare: { stile: 'blu', mat: 'vernice', w: 'blu' },
    salvia: { stile: 'verde', mat: 'vernice', w: 'verde salvia' }, persiana: { stile: 'verde', mat: 'vernice', w: 'verde persiana' }, rosa: { stile: 'rosa', mat: 'vernice', w: 'rosa' },
  };
  const RISERVATI = new Set(['vermiglio', 'limone', 'allarme']);
  Casa.INK = INK;
  const INK_DI = { kitsch: ['rosa', 'pesca', 'ocra'], sobrio: ['carta', 'osso'], verde: ['salvia', 'persiana'], tifo: ['oltremare'], collezione: ['mattone', 'cotto'], tv: ['cielo', 'acqua'], ordine: ['carta', 'osso', 'cielo'], ribelle: ['mattone', 'oltremare'] };
  const PAV = { sobrio: 'parquet', kitsch: 'moquette_r', tifo: 'moquette_b', verde: 'cotto', collezione: 'spina', tv: 'linoleum', ordine: 'graniglia' };
  const PAV_MAT = { parquet: 'assi', spina: 'assi', moquette_r: 'stoffa', moquette_b: 'stoffa', cotto: 'mattoni', linoleum: 'telo', graniglia: 'cemento' };
  const PAV_W = { parquet: 'il parquet', spina: 'il parquet a spina', moquette_r: 'la moquette rossa', moquette_b: 'la moquette blu', cotto: 'il cotto', linoleum: 'il linoleum', graniglia: 'la graniglia' };

  // ======================================================================================================================
  // IL GUSTO: stabile per persona (un seme dal suo id), dal carattere, dal mestiere, dall'età, dai soldi; si sposta con la vita
  // ======================================================================================================================
  const ASSI = ['ordine', 'kitsch', 'sobrio', 'collezione', 'verde', 'tv', 'tifo', 'ribelle'];
  function gusto(st, n) {
    const Sg = S(st).gusti; if (Sg[n.id]) return Sg[n.id];
    const P = n.pop || {}, tr = n.tr || {}, iw = P.intW || {}, r = rng(hashS('gusto:' + n.id)), age = P.age || 40, job = ((P.job && P.job.title) || '') + ' ' + (n.role || '');
    const f = P.sex === 'f', soldi = clamp((P.money || 0) / 150, 0, 1), giov = age < 30, vecchio = age > 60;
    const g = {
      ordine: clamp(.02 + (P.punct || .5) * .3 + (vecchio ? .12 : 0) + (P.faith || 0) * .08 + (/funzion|impiegat|vigile|maestr|infermier/.test(job) ? .15 : 0) - (P.vice ? .2 : 0) - (giov ? .1 : 0) + (r() - .5) * .3, 0, 1),
      kitsch: clamp(.1 + (P.faith || 0) * .35 + (age > 55 ? .2 : 0) + (soldi < .3 ? .1 : 0) + (iw.fede || 0) * .2 + (r() - .5) * .3, 0, 1),
      sobrio: clamp(.15 + (iw.lettura || 0) * .3 + (iw.politica || 0) * .25 + (iw.arte || 0) * .15 + (tr.legge || .5) * .1 + (/intellett|maestr|scritt|studen|pittor/.test(job) ? .2 : 0) + (r() - .5) * .3, 0, 1),
      collezione: clamp(.05 + (tr.avid || .5) * .3 + (iw.musica || 0) * .25 + (iw.lettura || 0) * .15 + (iw.foto || 0) * .25 + (r() - .5) * .35, 0, 1),
      verde: clamp(.05 + (iw.campagna || 0) * .45 + (f ? .12 : 0) + (vecchio ? .15 : 0) + (/contadin|giardin|fior/.test(job) ? .3 : 0) + (r() - .5) * .3, 0, 1),
      tv: clamp(.1 + (iw.cinema || 0) * .35 + (iw.chiacchiere || 0) * .1 + (/operai|scaricator|pension|portinai/.test(job) || P.status === 'pensionato' ? .2 : 0) + (r() - .5) * .3, 0, 1),
      tifo: clamp((iw.sport || 0) * .55 + (f ? 0 : .12) + (giov ? .1 : 0) + (/pescat|scaricator|operai|meccanic|barist/.test(job) ? .1 : 0) + (r() - .5) * .25, 0, 1),
      ribelle: clamp((n.ris ? n.ris.ideo * .3 : 0) + (giov ? .1 : 0) + (r() - .5) * .15, 0, 1),
    };
    g.colore = sceltaInk(g, r); g.pav = PAV[top(g, ['sobrio', 'kitsch', 'tifo', 'verde', 'collezione', 'tv', 'ordine'])];
    g.drift = []; g.t = st.t;
    Sg[n.id] = g; return g;
  }
  function top(g, keys) { let b = keys[0]; for (const k of keys) if ((g[k] || 0) > (g[b] || 0)) b = k; return b; }
  function sceltaInk(g, r) { const k = top(g, ['kitsch', 'sobrio', 'verde', 'tifo', 'collezione', 'tv', 'ribelle']); const L = (INK_DI[k] || INK_DI.ordine).filter(i => !RISERVATI.has(i) && INK[i]); return pick(L, r); }
  Casa.gusto = gusto;
  // lo stile in una parola (per la prova e per il Taccuino): il tratto più forte
  const STILE_W = { ordine: 'in ordine', kitsch: 'kitsch', sobrio: 'sobria', collezione: 'da collezionista', verde: 'piena di piante', tv: 'la tv al centro', tifo: 'un altare alla squadra', ribelle: 'da ribelle', disordine: 'un caos' };
  function stileDi(g) { const k = top(g, ASSI); return (g.ordine < .3 && g[k] < .45) ? 'disordine' : k; }
  Casa.stile = (st, n) => { const g = gusto(st, n); const k = stileDi(g); return { k, w: STILE_W[k], colore: g.colore, pav: g.pav }; };
  // l'umore di casa (giù di corda: la casa va da sé)
  function umore(st, n) {
    const P = n.pop || {}, N = P.need || {}, I = Po() && Po()._;
    const lutto = I && I.recent ? !!I.recent(st, P, 'lutto', 3) : false;
    return clamp((N.rabbia || 0) * .3 + (N.compagnia || 0) * .35 + (lutto ? .35 : 0) + ((P.money || 0) < 0 ? .2 : 0) + (P.status === 'disoccupato' ? .1 : 0) + (S(st).gusti[n.id] && S(st).gusti[n.id].giu || 0), 0, 1);
  }
  Casa.umore = umore;
  // la vita sposta il gusto: un fatto, un colore nuovo, una voglia
  const DRIFT = {
    vincita: (g) => { g.tv = clamp(g.tv + .3, 0, 1); g.kitsch = clamp(g.kitsch + .15, 0, 1); g.collezione = clamp(g.collezione + .1, 0, 1); return ['lampada', 'radiolina']; },
    lutto: (g) => { g.ordine = clamp(g.ordine - .3, 0, 1); g.verde = clamp(g.verde - .2, 0, 1); g.giu = clamp((g.giu || 0) + .3, 0, .5); return ['candele']; },
    banda: (g, r) => { g.ribelle = clamp(g.ribelle + .45, 0, 1); g.kitsch = clamp(g.kitsch - .2, 0, 1); g.colore = pick(INK_DI.ribelle, r); return ['bomboletta']; },
    partner: (g, r) => { g.ordine = clamp(g.ordine + .2, 0, 1); g.giu = 0; g.colore = pick(Object.keys(INK), r); return ['candele', 'lampada']; },
  };
  function evento(st, n, tipo, causa) {
    if (!alive(n) || !DRIFT[tipo]) return null;
    const g = gusto(st, n), Ss = S(st), r = rng(hashS(n.id + tipo + st.t));
    const prima = g.colore, voglie = DRIFT[tipo](g, r) || []; g.drift.push({ t: st.t, tipo }); Ss.stats.drift[tipo] = (Ss.stats.drift[tipo] || 0) + 1;
    voglie.forEach(x => voglia(st, n, x, tipo));
    const fid = fatto(st, 'gusto', n, { d: `${nomeDi(n)} cambia gusto (${tipo})`, tipo, colore: g.colore, prima }, causa || null);
    return fid;
  }
  Casa.evento = evento;   // per gli altri sistemi: Casa.evento(st, n, 'partner'|'vincita'|'lutto'|'banda', causa)
  function voglia(st, n, g, perche) { const V = S(st).voglie, L = V[n.id] = V[n.id] || []; if (L.some(x => x.g === g) || L.length >= 4) return; L.push({ g, perche, t: st.t }); }

  // ======================================================================================================================
  // IL REGISTRO DEI FATTI (lo stesso di Vita.fatto: tipo, chi, dati, causa) e le battute in fila
  // ======================================================================================================================
  function fatto(st, tipo, chi, dati, causa) {
    const Ss = S(st), ids = [].concat(chi || []).map(x => (x && x.id) || x).filter(Boolean);
    const f = { id: 'c' + Ss.nf++, tipo, chi: ids, d: (dati && dati.d) || tipo, dati: dati || {}, causa: causa || null, t: st.t };
    const V = Vi(); if (V && V.fatto) try { const par = causa ? Ss.fatti.find(x => x.id === causa) : null; f.vid = V.fatto('casa_' + tipo, ids, Object.assign({ casa: f.id }, dati || {}), par ? par.vid || null : (typeof causa === 'string' && /^f\d/.test(causa) ? causa : null)); } catch (e) { }
    Ss.fatti.push(f); if (Ss.fatti.length > CFG.fatti) Ss.fatti.splice(0, Ss.fatti.length - CFG.fatti);
    return f.id;
  }
  const fattoDi = (st, id) => (id ? S(st).fatti.find(f => f.id === id) || null : null);
  Casa.fatto = fatto; Casa.fattoDi = fattoDi;
  const dP = (st, n) => hyp(n.x - pl(st).x, n.y - pl(st).y);
  function contestoOk(st, n, t) { const C = Cm(); if (!C || !C.contesto || !C.contesto.vale) return true; try { return C.contesto.vale(st, n, t, 'fondo'); } catch (e) { return true; } }
  // battute: [[npc, testo], ...] — tutte col fatto che dicono; vicino al giocatore, mai di più di uno scambio in attesa
  function dire(st, battute, fid) {
    const Ss = S(st), p = pl(st);
    if (!fid || !fattoDi(st, fid)) { Ss.stats.senzaFatto++; return false; }
    const L = battute.filter(b => b && b[0] && b[1]); if (!L.length) return false;
    if (L.some(([n]) => !alive(n) || dP(st, n) > CFG.parla || (n.inside && !p.indoor))) return false;
    for (const b of L) b[1] = cap1(String(b[1]).trim());
    const PA = Pa();
    for (const [n, t] of L) {
      if (/\{\w+\}/.test(t) || t.length > 70) { Ss.stats.righeTolte++; return false; }
      if (PA && PA.promette && PA.promette(t)) { Ss.stats.righeTolte++; return false; }
      if (!contestoOk(st, n, t)) { Ss.stats.righeTolte++; return false; }
    }
    if (Ss.q.length) return false;
    const C0 = Cm(), R0 = C0 && C0.R, rit = R0 && R0.lastAmb !== undefined ? R0.lastAmb + (R0.gap || 0) + .15 : 0;
    const gap = 2.6, at0 = Math.max(st.clock + .4, rit), g = 2e12 + (Ss.ng++) * 100, M = Mt();
    if (at0 - st.clock > 12) return false;
    const items = L.map(([n, t], i) => ({ id: n.id, text: t, at: at0 + i * gap, g, fid }));
    if (M) { const Q = M.S(st).q; items.forEach((it, i) => { it.sh = { id: it.id, text: it.text, at: g + i, g }; Q.push(it.sh); }); }
    Ss.q.push(...items);
    L.forEach(([n, t]) => { Ss.righe.push({ t: st.t, c: st.clock, who: n.id, text: t, fatto: fid }); if (Ss.righe.length > 300) Ss.righe.shift(); });
    Ss.stats.righe += L.length; return true;
  }
  function togliOmbra(st, b) { const M = Mt(); if (!M || !b.sh) return; const Q = M.S(st).q, i = Q.indexOf(b.sh); if (i >= 0) Q.splice(i, 1); }
  function coda(st) {
    const Ss = S(st); if (!Ss.q.length) return; const p = pl(st);
    while (Ss.q.length && Ss.q[0].at <= st.clock) {
      const b = Ss.q.shift(), n = G.byId(st, b.id);
      if (alive(n) && dP(st, n) < CFG.parla && !(n.inside && !p.indoor)) { G.say(st, n, b.text, 3.4); togliOmbra(st, b); if (n.bark && n.bark.text === b.text) { Ss.stats.dette++; Ss.viste.push({ t: st.t, who: n.id, text: b.text, fatto: b.fid }); if (Ss.viste.length > 200) Ss.viste.shift(); } else Ss.stats.taciute++; }
      else { togliOmbra(st, b); Ss.q.filter(x => x.g === b.g).forEach(x => togliOmbra(st, x)); Ss.q = Ss.q.filter(x => x.g !== b.g); Ss.stats.taciute++; }
    }
  }

  // ======================================================================================================================
  // LE BATTUTE (TONO.md: chi parla si scopre — pigro, tirchio, vanitoso, permaloso; la frase dice la cosa appena fatta)
  // {C} la cosa, {c} la cosa senza articolo, {X} un nome, {colore}, {pav}
  // ======================================================================================================================
  const BANCHE = Casa.BANCHE = {
    finestra: ['La sedia alla finestra. Vedo chi passa e loro non vedono me.', 'Qui alla finestra. Così so chi esce con chi.', 'Alla finestra. Il giornale lo leggo meglio. Cioè, lo guardo.'],
    tv: ['La televisione in mezzo. Le pareti tanto non le guarda nessuno.', 'Adesso la tv si vede da tutta la casa. Anche dal bagno, quasi.'],
    scambia: ['{C} di là, il resto di qua. Ecco, sembra un\'altra casa.', 'Ho scambiato i posti. Mia moglie se ne accorge fra un mese.'],
    dipingi: ['Una mano di {colore}. Due no, la vernice costa.', 'Di {colore}. Va di moda, dice il negoziante. Lui ce l\'ha bianca.', 'Tutto {colore}. Se non piace, si abita fuori.'],
    calce: ['Imbiancato. Sotto c\'erano tre colori, tutti brutti.', 'Bianco calce. Costa poco e copre le macchie. Quasi tutte.'],
    pavimento: ['{Pav} nuovo. Prima di entrare, scarpe in mano.', 'Ho messo {pav}. In ginocchio due ore. Mai più.'],
    butta: ['Via {L}. Era un regalo, ma il regalo era brutto.', 'Fuori {L}. Era qui da prima di me.', 'Via {L}. Chi ne ha bisogno, passi dal cassonetto.'],
    buttaCiarpame: ['Via le cartacce. Le bottiglie restano, sono un ricordo.', 'Ho pulito. Adesso si vede quanto è sporco il resto.'],
    porta0: ['{C} qui. Così smetto di portarmi dietro la roba.', 'Ecco: {L} in casa. Fuori non serviva a niente.'],
    porta: ['{C} nuova. In cucina non serve, ma la gente la vede.', 'Comprata oggi, {c}. Il prezzo non lo dico, sennò mi sgridano.'],
    porta_m: ['{C} nuovo. In cucina non serve, ma la gente lo vede.', 'Comprato oggi, {c}. Il prezzo non lo dico, sennò mi sgridano.'],
    regalo: ['Me l\'ha regalata {X}. Brutta, ma la metto dove la vede.', 'Regalo di {X}. Quando viene, va in prima fila.'],
    regalo_m: ['Me l\'ha regalato {X}. Brutto, ma lo metto dove lo vede.', 'Regalo di {X}. Quando viene, va in prima fila.'],
    furto: ['Nessuno chiede da dove viene {L}.', '{C} l\'ho trovata. Dentro una casa, ma l\'ho trovata.'],
    furto_m: ['Nessuno chiede da dove viene {L}.', '{C} l\'ho trovato. Dentro una casa, ma l\'ho trovato.'],
    giornali: ['Un\'altra pila di giornali. Li leggo quando vado in pensione.', 'I giornali li tengo. Non si sa mai cosa uno si dimentica.'],
    dischi: ['Altri dischi. Il giradischi non ce l\'ho, ma i dischi sì.', 'Dischi nuovi. Li ascolto con gli occhi.'],
    scatole: ['Un altro scatolone. Dentro ci metto gli scatoloni vuoti.'],
    pianta: ['Un\'altra pianta. Quelle vecchie non le bagno, ma questa sì.', 'Ho diviso la pianta. Adesso sono due che non bagno.'],
    tifo: ['La bandiera del Porto. Abbiamo perso, ma la bandiera è nuova.', 'La bandiera del Porto, cucita a mano. In casa vinciamo sempre.'],
    tappeto: ['Il tappeto al muro. Per terra si rovina.', 'Il tappeto sta meglio appeso. Per terra lo pestavano.'],
    altarino: ['L\'altarino. Una candela per i santi, una per la bolletta.', 'Le candele all\'altarino. Se non serve, almeno fa luce.'],
    lumino: ['Una candela accesa. Per chi non c\'è più.', 'La candela accesa. Lui la lasciava sempre, e io pagavo.'],
    stencil: ['Lo stencil sul muro di casa. Almeno qui non lo cancellano.'],
    volantini: ['I volantini al muro. Se passano i Grigi, è carta da parati.'],
    riordina: ['Ho messo in ordine. Adesso non trovo più niente.', 'Tutto a posto. Non toccate niente fino a Natale.'],
    ospiti: ['Viene {X}. Via le bottiglie, almeno quelle che si vedono.', 'Arriva {X}. Pulisco solo dove guarda.'],
    sporca: ['Le pulizie le faccio domani. Lo dico da martedì.', 'Chi la tiene in ordine una casa, per chi?', 'Un\'altra bottiglia per terra. Tanto chi viene.'],
    condivisaF: ['Ho messo {L} alla finestra. Era roba tua? Adesso è mia.', 'Ho spostato {L} alla finestra. Casa di tutti, no?'],
    condivisaS: ['Ho cambiato i posti. Casa di tutti, no? Allora anche mia.'],
    notaD: ['Hai ridipinto? Di {colore}? Coraggio.', 'Tutto {colore}. Sembra la sala d\'aspetto dell\'ambulatorio.', 'Bello, {colore}. Chi te l\'ha consigliato, il nemico?'],
    notaR: ['Mi piaceva. Cioè, era in offerta.', 'A me piace. Tu sei venuto per il caffè.', 'L\'ho scelto io. Infatti non piace a nessuno.'],
    notaP: ['Nuova, {L}? Hai vinto alla schedina?', 'E quella {c}? Da quando hai i soldi?'],
    notaP_m: ['Nuovo, {L}? Hai vinto alla schedina?', 'Da quando hai i soldi per {L}?'],
    notaS: ['Hai spostato tutto? Non trovo più neanche la porta.', 'Hai cambiato qualcosa. Non so cosa, ma non mi piace.', 'Che hai fatto qui? Sembra la casa di un altro.'],
    notaSR: ['Ho spostato una cosa. Una. Calmati.', 'È casa mia. Tu sposta la tua.', 'Ti piace? No? Allora è giusto.'],
    notaF: ['La sedia alla finestra? Chi è che spii?', 'Alla finestra, eh. Così sai tutto di tutti.'],
    notaFR: ['Spio io prima che spiino me.', 'Guardo il tempo. E chi esce con chi.'],
    notaPR: ['Ce l\'avevo da anni. Tu non guardi mai.', 'È un prestito. Lungo. Non chiedere.'],
    riconosce: ['Quella {c} è mia! Me l\'hanno rubata!', '{C}! Quella è la mia {c}!'],
    riconosce_m: ['Questo {c} è mio! Me l\'hanno rubato!', '{C}! Quello è il mio {c}!'],
    riconosceR: ['Ce ne sono mille così.', 'L\'ho comprata al mercato. Da uno. Non lo conosco.', 'Tua? Allora perché era a casa mia?'],
    riconosceR_m: ['Ce ne sono mille così.', 'L\'ho comprato al mercato. Da uno. Non lo conosco.', 'Tuo? Allora perché era a casa mia?'],
  };
  const GENERE = new Set(['porta', 'regalo', 'furto', 'notaP', 'riconosce', 'riconosceR']);   // battute che si accordano con la cosa
  function riga(key, sub, r, gen) {
    if (GENERE.has(key) && gen === 'p') return null;
    const L = BANCHE[gen === 'm' && BANCHE[key + '_m'] ? key + '_m' : key]; if (!L) return null; let t = pick(L, r || rnd);
    t = t.replace(/\{(\w+)\}/g, (m, k) => (sub && sub[k] != null ? sub[k] : m));
    return t;
  }

  // ======================================================================================================================
  // LA CASA DI CHI: la casa (edificio), il piano (come popolo.js homeFloor), le stanze di casa, chi può toccarla
  // ======================================================================================================================
  const homeBi = n => (n && n.pop && n.pop.homeT && n.pop.homeT.k === 'b' ? n.pop.homeT.bi : null);
  function pianoDi(L, hh) {   // la stessa regola di popolo.js homeFloor (non esportata): nei condomini un piano per famiglia
    const nf = L.floors.length; if (nf <= 1) return 0;
    const condo = L.floors[0].rooms.some(q => /androne|portineria/.test(q.name || ''));
    const h = Math.abs(String(hh || '').split('').reduce((s, c) => s * 31 + c.charCodeAt(0), 7));
    return condo ? 1 + h % (nf - 1) : 0;
  }
  const inBld = (b, x, y) => b && x >= b.x * TS && x <= (b.x + b.w) * TS && y >= b.y * TS && y <= (b.y + b.h) * TS;
  // le case del giocatore e le basi (la sua casa, i covi del Cantiere, le basi della Risacca)
  function delGiocatore(st, bi) {
    const b = B(bi); if (!b) return false; if (b.playerHome) return true;
    if (st.me && st.me.home && st.me.home.k === 'b' && st.me.home.bi === bi) return true;
    if (st.covo && (st.covo.covi || []).some(c => inBld(b, c.x, c.y))) return true;
    if (st.ris && (st.ris.bases || []).some(c => c.alive !== false && inBld(b, c.x, c.y))) return true;
    return false;
  }
  const membro = n => !!(n && n.ris && n.ris.member && !n.dead);
  const giocabile = n => membro(n) && n.ris.auto === false;   // il giocatore lo guida: decide lui
  // chi può mettere mano a questa casa: chi ci abita; nelle case del giocatore solo chi ci abita ed è della banda (allora è condivisa)
  function puo(st, chi, bi) {
    if (chi === 'player' || chi === pl(st)) return delGiocatore(st, bi) || st.npcs.some(k => membro(k) && homeBi(k) === bi);
    if (!alive(chi) || homeBi(chi) !== bi) return false;
    if (delGiocatore(st, bi)) return membro(chi);
    return true;
  }
  Casa.puo = puo; Casa.delGiocatore = delGiocatore;
  function stanzeCasa(L, f) {
    const F = L.floors[f], sh = f === 0 ? L.shop : null; if (!F) return [];
    const out = F.rooms.map((q, i) => i).filter(i => { const q = F.rooms[i]; if (NOHOME.test(q.name || '')) return false; if (sh && q.x + q.w / 2 > sh[0] && q.x + q.w / 2 < sh[0] + sh[2] && q.y + q.h / 2 > sh[1] && q.y + q.h / 2 < sh[1] + sh[3]) return false; return true; });
    return out.length ? out : F.rooms.map((q, i) => i).filter(i => !/bagno/.test(F.rooms[i].name || ''));
  }
  function principale(L, f) {
    const F = L.floors[f], C = stanzeCasa(L, f); if (!C.length) return 0;
    let best = C[0], bs = 1e9; C.forEach(i => { const k = PRINC.indexOf(F.rooms[i].name); const s = (k < 0 ? 50 : k) - F.rooms[i].w * F.rooms[i].h * .01; if (s < bs) { bs = s; best = i; } });
    return best;
  }
  const roomIdx = (F, x, y) => F.rooms.findIndex(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);

  // ======================================================================================================================
  // LE MANI SULLA PIANTA: le primitive (le stesse per tutti; nessuna toglie una voce dalla lista)
  // ======================================================================================================================
  function chiavi(F) {
    if (F.__cc) return; const seen = {};
    F.furn.forEach(o => { if (o.__ck) return; let k = o.id + '@' + o.x.toFixed(2) + ',' + o.y.toFixed(2); if (seen[k]) k += '#' + (++seen[k]); else seen[k] = 1; o.__ck = k; o.__c0 = { x: o.x, y: o.y, ry: o.ry || 0, solid: o.solid ? o.solid.slice() : null }; });
    F.__cc = true;
  }
  function solidOf(o) { const sz = INT().szOf(o.id); if (!sz[2] || o.h) return null; const s = o.s || 1, sw = Math.abs(Math.sin(o.ry || 0)) > .5, hw = (sw ? sz[1] : sz[0]) / 2 * s, hd = (sw ? sz[0] : sz[1]) / 2 * s; return [o.x - hw, o.y - hd, hw * 2, hd * 2]; }
  const M = {
    sposta(F, o, x, y, ry) { o.x = x; o.y = y; o.ry = ry; if (o.solid) o.solid = solidOf(o); o.room = Math.max(0, roomIdx(F, x, y)); },
    togli(o) { o.taken = true; if (o.solid) { o.__sol = o.solid; o.solid = null; } },
    rimetti(o) { o.taken = false; if (o.__sol) { o.solid = o.__sol; o.__sol = null; } },
    posa(F, e) { const o = Object.assign({ ry: 0, h: 0, solid: null }, e); o.room = Math.max(0, roomIdx(F, o.x, o.y)); if (!o.h && !o.decor && INT().szOf(o.id)[2]) o.solid = solidOf(o); o.__ck = 'n:' + (e.__ck || ''); o.__c0 = { x: o.x, y: o.y, ry: o.ry, solid: o.solid }; F.furn.push(o); return o; },
    parete(q, stile) { q.wall = stile; }, pavimento(q, stile) { q.floor = stile; }, sporco(q, d) { q.dirt = clamp(d, 0, 1); },
  };
  Casa.M = M;
  const vivi = (F, re, C) => F.furn.filter(o => !o.taken && re.test(o.id) && (!C || C.includes(o.room)));
  // un posto libero sul pavimento (o contro un muro, o su un piano d'appoggio, o appeso), nella stanza qi
  function postoLibero(L, f, qi, id, r) {
    const F = L.floors[f], q = F.rooms[qi], I = INT(); if (!q) return null;
    const DEC = I.DECOR || {}, SM = I.SMALL || {}, sz = I.szOf(id);
    if (DEC[id]) {   // appeso: su un muro della stanza, lontano da finestre, porte e altri quadri
      for (let k = 0; k < 24; k++) {
        const side = pick(['N', 'S', 'W', 'E'], r), along = side === 'N' || side === 'S', t = .6 + r() * Math.max(.1, (along ? q.w : q.h) - 1.2);
        const x = side === 'W' ? q.x + .11 : side === 'E' ? q.x + q.w - .11 : q.x + t, y = side === 'N' ? q.y + .11 : side === 'S' ? q.y + q.h - .11 : q.y + t;
        const ry = side === 'N' ? 0 : side === 'S' ? PI : side === 'W' ? PI / 2 : -PI / 2;
        if ((F.wins || []).some(w => w.side === side && hyp(w.x - x, w.y - y) < 1)) continue;
        if ((F.doors || []).some(d => hyp(d.x - x, d.y - y) < 1.1)) continue;
        if (F.furn.some(o => !o.taken && o.decor && hyp(o.x - x, o.y - y) < .9)) continue;
        if (F.furn.some(o => !o.taken && o.solid && x > o.solid[0] - .05 && x < o.solid[0] + o.solid[2] + .05 && y > o.solid[1] - .05 && y < o.solid[1] + o.solid[3] + .05 && (I.szOf(o.id)[1] > .55))) continue;   // dietro un armadio no
        return { x, y, ry, h: /ragnatela/.test(id) ? 2.5 : 1.5, wall: side, decor: 1, low: false, tilt: 0 };
      }
      return null;
    }
    if (SM[id] || /^nx_/.test(id)) {   // su un piano d'appoggio della stanza
      const tops = F.furn.filter(o => !o.taken && SURF[o.id] !== undefined && !o.h && o.room === qi);
      for (let k = 0; k < 12 && tops.length; k++) {
        const t = pick(tops, r), [tw, td] = I.szOf(t.id), c = Math.cos(t.ry || 0), s = Math.sin(t.ry || 0), u = (r() - .5) * tw * .6, v = (r() - .5) * td * .5;
        const x = t.x + u * c + v * s, y = t.y - u * s + v * c;
        if (F.furn.some(o => !o.taken && o.onTop && hyp(o.x - x, o.y - y) < .22)) continue;
        return { x, y, ry: (t.ry || 0) + (r() - .5) * .6, h: SURF[t.id], onTop: 1 };
      }
      // senza un tavolo: per terra, accanto al muro
    }
    const hw = Math.max(sz[0], sz[1]) / 2 + .05, solid = !!sz[2];
    for (let k = 0; k < 40; k++) {
      const x = q.x + hw + .25 + r() * Math.max(.05, q.w - 2 * hw - .5), y = q.y + hw + .25 + r() * Math.max(.05, q.h - 2 * hw - .5);
      if (!I.walk(L, f, x, y, hw)) continue;
      if (F.furn.some(o => !o.taken && !o.decor && !o.h && hyp(o.x - x, o.y - y) < hw + Math.max(...I.szOf(o.id).slice(0, 2)) / 2 * .8)) continue;
      if (L.ent && f === 0 && hyp(L.ent.in[0] - x, L.ent.in[1] - y) < 1.3) continue;
      if (L.stairs && hyp(L.stairs.foot[0] - x, L.stairs.foot[1] - y) < 1.4) continue;
      return { x, y, ry: r() * PI * 2, h: 0, solidCheck: solid };
    }
    return null;
  }
  const versoDi = (ax, ay, bx, by) => Math.atan2(bx - ax, by - ay);   // ry di chi guarda da a verso b (il davanti è (sin ry, cos ry))

  // ======================================================================================================================
  // I VERBI: ognuno fa un PIANO sulla pianta (dove si prende, dove si posa, la posa, cosa in mano) e lo mette in opera (fai).
  // Lo stesso piano serve alla scena (il giocatore guarda) e al conto astratto (lontano: subito, quando la pianta c'è).
  // ======================================================================================================================
  const VERBI = Casa.VERBI = {
    finestra(L, f, op, r) {
      const F = L.floors[f], C = stanzeCasa(L, f), seats = vivi(F, SEDUTE, C).filter(o => !o.grp || r() < .5); if (!seats.length) return null;
      const wins = (F.wins || []).map(w => { const d = .75, x = w.x + (w.side === 'W' ? d : w.side === 'E' ? -d : 0), y = w.y + (w.side === 'N' ? d : w.side === 'S' ? -d : 0); return { w, x, y, qi: roomIdx(F, x, y) }; })
        .filter(c => C.includes(c.qi) && INT().walk(L, f, c.x, c.y, .3) && !F.furn.some(o => !o.taken && !o.decor && !o.h && hyp(o.x - c.x, o.y - c.y) < .55));
      if (!wins.length) return null;
      const o = op.key ? F.furn.find(x => x.__ck === op.key && !x.taken) : pick(seats, r); if (!o) return null;
      const c = wins.slice().sort((a, b) => (a.qi === o.room ? 0 : 3) + hyp(a.x - o.x, a.y - o.y) * .1 - ((b.qi === o.room ? 0 : 3) + hyp(b.x - o.x, b.y - o.y) * .1))[0];
      const ry = versoDi(c.x, c.y, c.w.x, c.w.y);
      return { o, da: [o.x, o.y], a: [c.x, c.y], posa: 'porta', mano: 'sedia', cosa: o.id, fai: () => M.sposta(F, o, c.x, c.y, ry), desc: `sposta ${nomeF(o.id)} alla finestra` };
    },
    tv(L, f, op, r) {
      const F = L.floors[f], C = stanzeCasa(L, f), tvs = vivi(F, TV, C); if (!tvs.length) return null;
      const o = tvs[0], qi = principale(L, f), q = F.rooms[qi], sofa = vivi(F, DIVANI, [qi])[0] || vivi(F, SEDUTE, [qi])[0];
      let x = q.x + q.w / 2, y = q.y + q.h / 2;
      if (sofa) { const fx = Math.sin(sofa.ry || 0), fy = Math.cos(sofa.ry || 0); x = sofa.x + fx * 1.7; y = sofa.y + fy * 1.7; }
      if (!INT().walk(L, f, x, y, .3) || roomIdx(F, x, y) < 0) { x = q.x + q.w / 2; y = q.y + q.h / 2; if (!INT().walk(L, f, x, y, .3)) return null; }
      if (hyp(o.x - x, o.y - y) < .5) return null;
      const ry = sofa ? versoDi(x, y, sofa.x, sofa.y) : (o.ry || 0);
      return { o, da: [o.x, o.y], a: [x, y], posa: 'porta', mano: 'radiolina', cosa: o.id, fai: () => M.sposta(F, o, x, y, ry), desc: 'mette la televisione in mezzo alla stanza' };
    },
    scambia(L, f, op, r) {
      const F = L.floors[f], C = stanzeCasa(L, f), L0 = vivi(F, SPOSTABILI, C).filter(o => !o.h && !o.decor && !o.solid);
      for (let k = 0; k < 10 && L0.length > 1; k++) {
        const a = pick(L0, r), b = pick(L0, r); if (a === b || a.id === b.id || hyp(a.x - b.x, a.y - b.y) < .8) continue;
        const [ax, ay, ar, bx, by, br] = [a.x, a.y, a.ry || 0, b.x, b.y, b.ry || 0];
        return { o: a, o2: b, da: [ax, ay], a: [bx, by], posa: 'porta', mano: F2G[a.id] || 'casse', cosa: a.id, fai: () => { M.sposta(F, a, bx, by, br); M.sposta(F, b, ax, ay, ar); }, desc: `scambia di posto ${nomeF(a.id)} e ${nomeF(b.id)}` };
      }
      return null;
    },
    butta(L, f, op, r) {
      const F = L.floors[f], C = stanzeCasa(L, f);
      let L0 = op.key ? F.furn.filter(o => o.__ck === op.key && !o.taken) : vivi(F, op.cosa === 'kitsch' ? KITSCH : op.cosa === 'ciarpame' ? CIARPAME : /^$/, C);
      if (op.cosa === 'ciarpame') { L0 = L0.slice(0, 4); if (!L0.length) return null; return { o: L0[0], da: [L0[0].x, L0[0].y], a: L ? (L.ent && f === 0 ? L.ent.in.slice() : L.stairs ? L.stairs.landing.slice() : null) : null, posa: 'raccoglie', mano: 'sacchi', cosa: 'ia_cartacce', n: L0.length, fai: () => L0.forEach(o => M.togli(o)), desc: `butta via ${L0.length > 1 ? 'le cartacce e le bottiglie' : nomeF(L0[0].id)}` }; }
      if (!L0.length) return null; const o = pick(L0, r);
      const porta = L.ent && f === 0 ? L.ent.in.slice() : L.stairs ? L.stairs.landing.slice() : null;
      return { o, da: [o.x, o.y], a: porta, posa: 'porta', mano: F2G[o.id] || 'casse', cosa: o.id, fai: () => M.togli(o), desc: `butta via ${nomeF(o.id)}` };
    },
    posa(L, f, op, r) {   // una cosa nuova: dalle tasche (comprata, regalata, rubata) o fatta a mano; op.id: la voce della pianta
      const F = L.floors[f], C = stanzeCasa(L, f), I = INT(); if (!op.id || !I.szOf) return null;
      const qs = [principale(L, f)].concat(C.filter(i => i !== principale(L, f)));
      for (const qi of qs) {
        const p = postoLibero(L, f, qi, op.id, r); if (!p) continue;
        const e = { id: op.id, x: p.x, y: p.y, ry: p.ry, h: p.h || 0 }; if (p.decor) Object.assign(e, { wall: p.wall, decor: 1, low: false, tilt: 0 }); if (p.onTop) e.onTop = 1;
        e.__ck = String(op.n); if (op.prov) e.prov = op.prov;
        return { o: null, da: null, a: [p.x, p.y], posa: p.decor ? 'attacchina' : 'prende', mano: op.g || F2G[op.id] || null, cosa: op.id,
          fai: () => { const o = M.posa(F, e); if (o.solid && !I.reachAll(L, f)) { M.togli(o); return false; } return true; }, desc: `mette in casa ${nomeF(op.id)}` };
      }
      return null;
    },
    pianta(L, f, op, r) {   // divide una pianta che c'è già: una talea in più (verde)
      const F = L.floors[f], C = stanzeCasa(L, f), P0 = vivi(F, PIANTE, C); if (!P0.length) return null;
      const src = pick(P0, r), id = /grande|alta|potted/.test(src.id) ? 'plantSmall1' : 'ia_vaso_fiori';
      const pz = VERBI.posa(L, f, Object.assign({}, op, { id }), r); if (!pz) return null;
      return Object.assign(pz, { da: [src.x, src.y], posa: 'raccoglie', mano: null, desc: `divide ${nomeF(src.id)} in due vasi` });
    },
    dipingi(L, f, op, r) {
      const F = L.floors[f], qi = op.stanza != null && F.rooms[op.stanza] ? op.stanza : principale(L, f), q = F.rooms[qi]; if (!q || q.wall === op.stile) return null;
      const da = q.wall, x = q.x + q.w / 2, y = q.y + .7;
      return { o: null, q, da: null, a: INT().walk(L, f, x, y, .3) ? [x, y] : [q.x + q.w / 2, q.y + q.h / 2], posa: 'vernicia', mano: op.stile === 'calce' ? 'secchio' : 'vernice', dur: 7, cosa: op.stile,
        fai: () => { M.parete(q, op.stile); q.dirt = Math.max(0, (q.dirt || .3) - .25); }, desc: `ridipinge ${String(q.name || 'la stanza').replace(/_/g, ' ')} (da ${da} a ${op.stile})`, stanza: q.name, prima: da };
    },
    pavimento(L, f, op, r) {
      const F = L.floors[f], qi = op.stanza != null && F.rooms[op.stanza] ? op.stanza : principale(L, f), q = F.rooms[qi]; if (!q || q.floor === op.stile) return null;
      const da = q.floor;
      return { o: null, q, da: null, a: [q.x + q.w / 2, q.y + q.h / 2], posa: 'scava', mano: 'martello', dur: 8, cosa: op.stile, fai: () => M.pavimento(q, op.stile), desc: `rifà il pavimento ${String(q.name || '').replace(/_/g, ' ')} (da ${da} a ${op.stile})`, stanza: q.name, prima: da };
    },
    sporca(L, f, op, r) {
      const F = L.floors[f], C = stanzeCasa(L, f), qi = principale(L, f), roba = ['ia_cartacce', 'ia_bottiglie', 'ia_macchia'], adds = [];
      for (let k = 0; k < 2; k++) { const id = pick(roba, r), p = postoLibero(L, f, qi, id, r); if (p) adds.push({ id, x: p.x, y: p.y, ry: p.ry, h: 0, __ck: op.n + '.' + k }); }
      const sedia = r() < .4 ? vivi(F, /^(chair|ia_sedia_design)$/, [qi])[0] : null;
      if (!adds.length && !sedia) return null;
      return { o: null, da: null, a: adds[0] ? [adds[0].x, adds[0].y] : [sedia.x, sedia.y], posa: null, mano: 'birra', cosa: 'ia_cartacce',
        fai: () => { C.forEach(i => M.sporco(F.rooms[i], (F.rooms[i].dirt || .3) + .12)); adds.forEach(e => M.posa(F, e)); if (sedia) { M.togli(sedia); M.posa(F, { id: 'ia_sedia_rovesciata', x: sedia.x, y: sedia.y, ry: sedia.ry + 1.3, __ck: op.n + '.s', rov: sedia.__ck }); } }, desc: 'lascia andare la casa' };
    },
    riordina(L, f, op, r) {
      const F = L.floors[f], C = stanzeCasa(L, f), via = vivi(F, CIARPAME, C).slice(0, op.ospiti ? 8 : 4), mosse = op.ospiti ? vivi(F, SEDUTE, C).filter(o => o.__c0 && hyp(o.x - o.__c0.x, o.y - o.__c0.y) > .3).slice(0, 4) : [];
      const rov = vivi(F, /^ia_sedia_rovesciata$/, C);
      if (!via.length && !mosse.length && !C.some(i => (F.rooms[i].dirt || 0) > .45)) return null;
      const o = via[0] || mosse[0];
      return { o, da: o ? [o.x, o.y] : null, a: L.ent && f === 0 ? L.ent.in.slice() : null, posa: 'spazza', mano: null, dur: 5, cosa: 'ia_cartacce',
        fai: () => { via.forEach(x => M.togli(x)); mosse.forEach(x => M.sposta(F, x, x.__c0.x, x.__c0.y, x.__c0.ry)); rov.forEach(x => { M.togli(x); const s0 = F.furn.find(y => y.__ck === x.rov); if (s0) M.rimetti(s0); }); C.forEach(i => M.sporco(F.rooms[i], (F.rooms[i].dirt || .3) * .6)); },
        desc: op.ospiti ? 'mette in ordine per gli ospiti' : 'mette in ordine', n: via.length + mosse.length };
    },
    prendi(L, f, op, r) {   // portar via una cosa (il ladro, o chi la prende in mano): come Oggetti prendi → o.taken
      const F = L.floors[f], C = stanzeCasa(L, f), L0 = op.key ? F.furn.filter(o => o.__ck === op.key && !o.taken) : vivi(F, RUBABILI, C); if (!L0.length) return null;
      const o = pick(L0, r);
      return { o, da: [o.x, o.y], a: null, posa: 'prende', mano: F2G[o.id] || null, cosa: o.id, g: F2G[o.id] || null, fai: () => M.togli(o), desc: `porta via ${nomeF(o.id)}` };
    },
  };
  const INCERTI = new Set(['finestra', 'tv', 'scambia', 'butta', 'pianta', 'sporca', 'riordina', 'prendi']);   // il fatto nasce quando la pianta c'è (si sa cosa è successo davvero)

  // ======================================================================================================================
  // IL REGISTRO DELLE CASE: le righe, la messa in opera (lazy), la consistenza
  // ======================================================================================================================
  function casaDi(st, bi) { const Cs = S(st).case; return Cs[bi] || (Cs[bi] = { bi, ops: [], seen: {}, n: 0 }); }
  Casa.casaDi = casaDi;
  function layoutDi(bi) { const b = B(bi); if (!b) return null; let L = LK.get(bi); if (!L) { L = INT().layout(b); LK.set(bi, L); } return L; }
  const pianta = bi => LK.get(bi) || null;
  // una riga nuova: chi (npc o 'player'), verbo, i suoi dati; se la pianta c'è (il giocatore dentro, una casa vicina già fatta) va in opera subito
  function fai(st, chi, bi, v, dati, opts) {
    const Ss = S(st), C = casaDi(st, bi), id = chi === 'player' || chi === pl(st) ? 'player' : chi.id;
    if (!puo(st, id === 'player' ? 'player' : chi, bi)) { Ss.stats.vietate++; return null; }
    if (id === 'player') Ss.scene.forEach(sc => { if (sc.bi === bi && !sc.fatto) completa(st, sc); });   // il giocatore non aspetta: quello che l'altro stava facendo è fatto
    const op = Object.assign({ n: ++C.n, t: st.t, chi: id, hh: id === 'player' ? null : chi.pop.hh, v, s: (rnd() * 4294967296) >>> 0 }, dati || {});
    if (delGiocatore(st, bi) && id !== 'player') { op.condivisa = 1; Ss.stats.condivise++; }
    C.ops.push(op); Ss.stats.ops++; Ss.stats.per[v] = (Ss.stats.per[v] || 0) + 1;
    if (!INCERTI.has(v) && !op.fid) op.fid = fattoCerto(st, chi, bi, op);
    if (C.ops.length > CFG.opsMax) { const L = pianta(bi); if (L) { mettiInOpera(st, bi); const k = C.ops.length - CFG.opsMax; if (!C.ops.slice(0, k).some(o => o.__scena)) { C.ops.splice(0, k); L.__casa = Math.max(0, (L.__casa || 0) - k); } } else if (C.ops.length > CFG.opsMax * 2) { const i = C.ops.findIndex(o => INCERTI.has(o.v)); if (i >= 0) { C.ops.splice(i, 1); Ss.stats.scordate = (Ss.stats.scordate || 0) + 1; } } }
    const L = pianta(bi); if (L && (!opts || !opts.lazy)) {
      if (opts && opts.scena && scenaPossibile(st, chi, bi, op)) { inScena(st, chi, bi, op); return op; }
      mettiInOpera(st, bi);
    }
    return op;
  }
  Casa.fai = fai;
  function fattoCerto(st, chi, bi, op) {
    const n = chi === 'player' ? 'player' : chi, d0 = nomeDi(n), ink = op.ink && INK[op.ink];
    if (op.v === 'dipingi') return fatto(st, 'dipinge', n === 'player' ? 'player' : n, { d: `${d0} ridipinge casa ${ink ? ink.w : op.stile}`, bi, stile: op.stile, ink: op.ink }, op.causa || null);
    if (op.v === 'pavimento') return fatto(st, 'pavimento', n === 'player' ? 'player' : n, { d: `${d0} rifà il pavimento (${op.stile})`, bi, stile: op.stile }, op.causa || null);
    if (op.v === 'posa') { const pv = op.prov || {}; return fatto(st, pv.come === 'furto' ? 'ricettato' : 'porta_casa', [n === 'player' ? 'player' : n.id].concat(pv.da ? [pv.da] : []), { d: `${d0} mette in casa ${nomeF(op.id)}${pv.come ? ' (' + pv.come + ')' : ''}`, bi, id: op.id, g: op.g, come: pv.come || null, da: pv.da || null }, pv.fid || pv.vfid || op.causa || null); }
    return fatto(st, op.v, n === 'player' ? 'player' : n, { d: `${d0}: ${op.v}`, bi }, op.causa || null);
  }
  // mette in opera le righe che la pianta non ha ancora (in ordine). Ritorna quante.
  function mettiInOpera(st, bi, upto) {
    const C = S(st).case[bi]; if (!C || !C.ops.length) return 0;
    const L = layoutDi(bi); if (!L) return 0; const Ss = S(st);
    let k = 0, i = L.__casa || 0; const fine = upto != null ? Math.min(upto, C.ops.length) : C.ops.length;
    for (; i < fine; i++) { const op = C.ops[i]; if (op.__scena) break; if (!op.r) { risolvi(st, L, op); k++; } }   // in ordine: una scena in corso ferma le righe dopo di lei
    L.__casa = Math.max(L.__casa || 0, i);
    if (k) { Ss.stats.messe += k; ridisegna(st, bi); }
    return k;
  }
  Casa.mettiInOpera = mettiInOpera;
  function risolvi(st, L, op) {
    const Ss = S(st), f = op.f != null ? op.f : pianoDi(L, op.hh); op.f = f;
    const F = L.floors[f]; if (!F) { op.r = { ok: false }; Ss.stats.fallite++; return; }
    chiavi(F); const r = rng(op.s), P0 = VERBI[op.v] ? VERBI[op.v](L, f, op, r) : null;
    if (!P0) { op.r = { ok: false }; Ss.stats.fallite++; return; }
    const ok = P0.fai() !== false;
    esito(st, L, op, P0, ok);
  }
  function esito(st, L, op, P0, ok) {
    const Ss = S(st);
    op.r = ok ? { ok: true, key: P0.o ? P0.o.__ck : null, key2: P0.o2 ? P0.o2.__ck : null, cosa: P0.cosa, desc: P0.desc, stanza: P0.stanza, prima: P0.prima, n: P0.n || 1, pos: P0.o ? [P0.o.x, P0.o.y, P0.o.ry || 0] : null } : { ok: false };
    if (!ok) { Ss.stats.fallite++; return; }
    const chi = op.chi === 'player' ? 'player' : G.byId(st, op.chi);
    if (INCERTI.has(op.v) && !op.fid) op.fid = fatto(st, op.v === 'prendi' ? (op.ladro ? 'furto_casa' : 'prende') : op.v, op.chi, { d: `${nomeDi(chi)} ${P0.desc}`, bi: L.b ? G.BUILDINGS.indexOf(L.b) : null, cosa: P0.cosa, quando: op.t }, op.causa || null);
    const K = { finestra: 'spostati', tv: 'spostati', scambia: 'spostati', butta: 'buttati', riordina: 'buttati', posa: 'portati', pianta: 'piante', dipingi: 'dipinti', pavimento: 'pavimenti', prendi: 'rubati' }[op.v];
    if (K) Ss.stats[K] += (op.v === 'butta' || op.v === 'riordina') ? (P0.n || 1) : 1;
    if (op.v === 'prendi' && op.ladro && P0.g) {   // la cosa vera passa al ladro: nelle tasche, con la sua provenienza
      const n = G.byId(st, op.ladro); if (alive(n)) { mettiRoba(n, P0.g); const pv = S(st).prov[n.id] = S(st).prov[n.id] || {}; pv[P0.g] = { da: op.vittima, come: 'furto', fid: op.fid, cosa: P0.cosa, t: st.t }; }
    }
    if (chi && chi !== 'player') { const I = Po() && Po()._; if (I && I.note) try { I.note(st, chi, cap1(P0.desc), 'info', { w: .15, tag: 'casa', causa: op.fid }); } catch (e) { } }
  }
  function ridisegna(st, bi) {
    const p = pl(st); if (!p || !p.indoor || p.indoor.b !== bi) return;
    const R = W0 && W0.__pv && W0.__pv.R; if (R && R.__ed && R.__ed.rebuildIndoor) R.__ed.rebuildIndoor();
  }
  // la roba nelle tasche (Scambi, se c'è: le stesse tasche del baratto)
  const roba = (n, g) => ((n.pop.inv || {})[g] || 0) + ((n.pop.casa || {})[g] || 0);
  function prendiRoba(n, g, q) { const X = Sc(); if (X && X.take) return X.take(n, g, q || 1); for (const k of ['inv', 'casa']) { const Bg = n.pop[k] || {}; if ((Bg[g] || 0) >= (q || 1)) { Bg[g] -= q || 1; if (Bg[g] <= 0) delete Bg[g]; return true; } } return false; }
  function mettiRoba(n, g, q) { const Bg = n.pop.inv = n.pop.inv || {}; Bg[g] = (Bg[g] || 0) + (q || 1); }

  // ======================================================================================================================
  // LA SCENA: il giocatore è nella stessa casa, allo stesso piano. L'abitante va a prendere, porta, posa, dipinge; poi torna.
  // Si muove come lo muove popolo.js (n.room: il punto, il passo, la posa), la cosa in mano è n.hand (anim_mano.js).
  // ======================================================================================================================
  function scenaPossibile(st, n, bi, op) {
    if (!CFG.scena || n === 'player' || !alive(n)) return false;
    const p = pl(st), R0 = st.pop && st.pop.room; if (!p.indoor || p.indoor.b !== bi || !R0 || !R0.ids.includes(n.id) || !n.room || n.room.out) return false;
    const L = pianta(bi); if (!L) return false; const f = op.f != null ? op.f : pianoDi(L, op.hh); return f === p.indoor.f && !S(st).scene.some(s => s.bi === bi);
  }
  function inScena(st, n, bi, op) {
    const Ss = S(st), L = pianta(bi); op.f = op.f != null ? op.f : pianoDi(L, op.hh); const F = L.floors[op.f]; chiavi(F);
    // prima le righe che ci sono già (l'ordine resta quello del registro)
    const C = Ss.case[bi], idx = C.ops.indexOf(op); mettiInOpera(st, bi, idx);
    const P0 = VERBI[op.v] ? VERBI[op.v](L, op.f, op, rng(op.s)) : null;
    if (!P0) { op.r = { ok: false }; Ss.stats.fallite++; L.__casa = Math.max(L.__casa || 0, idx + 1); mettiInOpera(st, bi); return; }
    op.__scena = 1;
    // il percorso, a buon mercato: dritto, o per una porta, o per due; se no l'A* di interiors.js (fino a ~10 ms, una volta per scena); se no, niente scena
    const fasi = [], F0 = L.floors[op.f], lib = (ax, ay, bx, by) => { const d = hyp(bx - ax, by - ay), k = Math.ceil(d / .3); for (let i = 1; i < k; i++) { const t = i / k; if (!INT().walk(L, op.f, ax + (bx - ax) * t, ay + (by - ay) * t, .18)) return false; } return true; };
    const via = (x0, y0) => { const s0 = INT().walk(L, op.f, n.x, n.y, .18) ? null : INT().nearFree(L, op.f, n.x, n.y), w = via0(x0, y0, s0 ? s0.x : n.x, s0 ? s0.y : n.y); return w && s0 ? [[s0.x, s0.y]].concat(w) : w; };
    const via0 = (x0, y0, sx, sy) => { const nf = INT().nearFree ? INT().nearFree(L, op.f, x0, y0) : null, x = nf ? nf.x : x0, y = nf ? nf.y : y0; if (lib(sx, sy, x, y)) return [[x, y]]; const D = (F0.doors || []).map(d => [d.x, d.y]);
      for (const d of D) if (lib(sx, sy, d[0], d[1]) && lib(d[0], d[1], x, y)) return [d, [x, y]];
      for (const d of D) if (lib(sx, sy, d[0], d[1])) for (const e of D) if (e !== d && lib(d[0], d[1], e[0], e[1]) && lib(e[0], e[1], x, y)) return [d, e, [x, y]];
      const pp = INT().findPath ? INT().findPath(L, op.f, sx, sy, x, y) : null; return pp && pp.length ? pp.map(q => [q.x, q.y]) : null; };   // l'ultima: l'A* (raro: solo in scena)
    if (P0.da) fasi.push({ k: 'vai', to: P0.da }, { k: 'fermo', dur: 1, pose: 'prende' });
    if (P0.a) fasi.push({ k: 'vai', to: P0.a, pose: P0.mano ? 'porta' : null, mano: P0.mano });
    fasi.push({ k: 'fermo', dur: P0.dur || 1.4, pose: P0.posa, mano: P0.mano }, { k: 'fai' }, { k: 'fermo', dur: 1.2, pose: null }, { k: 'torna' });
    Ss.scene.push({ n, bi, op, P0, fasi, i: 0, t0: st.clock, ft: st.clock, room: n.room, orig: { x: n.room.x, y: n.room.y, face: n.room.face, pose: n.room.pose }, hand: n.hand || null, via, wp: null });
    Ss.stats.scene++;
  }
  function scenaPasso(st, sc) {
    const n = sc.n, r = n.room, Ss = S(st);
    const rotta = !alive(n) || !r || r !== sc.room || r.out || st.clock - sc.t0 > 60;
    if (rotta) { if (!sc.fatto) { completa(st, sc); } Ss.stats.sceneRotte++; n.hand = sc.hand; return true; }
    const fz = sc.fasi[sc.i]; if (!fz) return true;
    const avanti = () => { sc.i++; sc.ft = st.clock; sc.wp = null; };
    if (fz.k === 'vai') {
      if (!sc.wp) { const t1 = now(); sc.wp = sc.via(fz.to[0], fz.to[1]); mx(Ss, 'percorso', t1); if (!sc.wp) { completa(st, sc); n.hand = sc.hand; Ss.stats.senzaStrada = (Ss.stats.senzaStrada || 0) + 1; return true; } r.pose = fz.pose || null; if (fz.mano !== undefined) n.hand = fz.mano; }
      if (!r.walk) { const w = sc.wp.shift(); if (!w) { avanti(); return false; } r.x = w[0]; r.y = w[1]; r.walk = true; }
      if (st.clock - sc.ft > 14) { n.x = fz.to[0]; n.y = fz.to[1]; r.walk = false; avanti(); }
      return false;
    }
    if (fz.k === 'fermo') { r.walk = false; r.pose = fz.pose || null; if (fz.mano !== undefined) n.hand = fz.mano; if (sc.P0.a && fz.pose) r.face = Math.atan2(sc.P0.a[1] - n.y, sc.P0.a[0] - n.x); if (st.clock - sc.ft >= fz.dur) avanti(); return false; }
    if (fz.k === 'fai') { const t1 = now(); completa(st, sc); mx(Ss, 'completa', t1); avanti(); return false; }
    if (fz.k === 'torna') { n.hand = sc.hand; r.x = sc.orig.x; r.y = sc.orig.y; r.face = sc.orig.face; r.pose = sc.orig.pose; r.walk = true; Ss.stats.sceneFinite++; return true; }
    return true;
  }
  function completa(st, sc) {
    if (sc.fatto) return; sc.fatto = true; const op = sc.op, L = pianta(sc.bi), C = S(st).case[sc.bi];
    delete op.__scena; if (op.r) return;
    const ok = sc.P0.fai() !== false; esito(st, L, op, sc.P0, ok);
    const idx = C.ops.indexOf(op); L.__casa = Math.max(L.__casa || 0, idx + 1); mettiInOpera(st, sc.bi);   // e quelle venute dopo
    ridisegna(st, sc.bi);
    if (ok) parlaDopo(st, sc.n, op, sc.P0);
  }
  // la battuta di chi l'ha fatto (vera: dice la cosa appena fatta), solo se il giocatore è lì
  const FATTA_K = { ia_bandiera_muro: 'tifo', ia_tappeto_muro: 'tappeto', ia_altarino: 'altarino', ia_candela: 'lumino', ia_stencil: 'stencil', ia_volantini: 'volantini' };
  const ID_K = { ia_giornali: 'giornali', ia_dischi_vinile: 'dischi', cardboardBoxClosed: 'scatole' };
  function parlaDopo(st, n, op, P0) {
    if (!alive(n) || !op.fid) return; const r = rng(op.s + 7), ink = op.ink && INK[op.ink], c = nomeF(P0.cosa), gen = genere(P0.cosa), sub = { C: cap1(c), c: senzaArt(c), L: c };
    let key = { finestra: 'finestra', tv: 'tv', scambia: 'scambia', riordina: op.ospiti ? 'ospiti' : 'riordina', sporca: 'sporca', pianta: 'pianta', pavimento: 'pavimento' }[op.v];
    if (op.v === 'dipingi') { key = op.stile === 'calce' ? 'calce' : 'dipingi'; sub.colore = ink ? ink.w : op.stile; }
    if (op.v === 'pavimento') { sub.pav = PAV_W[op.stile] || 'il pavimento'; sub.Pav = cap1(sub.pav); }
    if (op.v === 'butta') key = op.cosa === 'ciarpame' ? 'buttaCiarpame' : 'butta';
    if (op.v === 'posa') { const pv = op.prov || {}; key = pv.come === 'furto' ? 'furto' : pv.come === 'regalo' ? 'regalo' : pv.come === 'fatta' ? FATTA_K[op.id] : ID_K[op.id] || (pv.come === 'comprato' ? 'porta' : 'porta0'); if (pv.da) sub.X = nomeDi(G.byId(st, pv.da)); }
    if (op.ospiti) { if (!op.ospite) return; sub.X = nomeDi(G.byId(st, op.ospite)); }
    if (op.condivisa && op.v === 'finestra') key = 'condivisaF'; if (op.condivisa && op.v === 'scambia') key = 'condivisaS';
    if (!key) return; let t = riga(key, sub, r, gen); if (!t || /\{/.test(t)) return;
    if (op.v === 'finestra' && /^La sedia/.test(t) && !/^(chair|chairCushion|chairDesk|ia_sedia_design)$/.test(P0.cosa)) t = t.replace(/^La sedia/, cap1(c));
    dire(st, [[n, t]], op.fid);
  }
  function scenePasso(st) { const Ss = S(st); if (!Ss.scene.length) return; Ss.scene = Ss.scene.filter(sc => !scenaPasso(st, sc)); }

  // ======================================================================================================================
  // LE DECISIONI: chi è a casa, sveglio e libero, ogni tanto ci mette mano. Il gusto pesa i verbi; la roba deve esserci davvero.
  // ======================================================================================================================
  function aCasa(st, n) {
    const P = n.pop; if (!P || !P.at || P.at.k !== 'b' || !P.homeT || P.at.bi !== homeBi(n) || !n.inside) return false;
    const a = P.cur && P.cur.act; return a === 'casa' || a === 'pranzo' || (!a && !P.job);
  }
  function libero(st, n) {
    if (!alive(n) || n.cop || n.military || n.faction || n.__ev || n.jailedUntil > st.t || n.stun > 0 || n.panic > 0) return false;
    const P = n.pop; if (P.cast || P.matto || P.emer || P.age < 14) return false;
    if (giocabile(n)) return false;   // il giocatore lo guida: la casa la cambia lui, con gli stessi verbi
    return true;
  }
  function decidi(st, n, h) {
    const Ss = S(st), P = n.pop, bi = homeBi(n); if (bi == null || !puo(st, n, bi)) return;
    const g = gusto(st, n), d = umore(st, n), r = rnd, C = casaDi(st, bi), oggi = C.ops.filter(o => st.t - o.t < 1440 && o.chi === n.id).length; if (oggi >= 3) return;
    const lastV = v => { for (let i = C.ops.length - 1; i >= 0; i--) if (C.ops[i].v === v && C.ops[i].chi === n.id) return st.t - C.ops[i].t; return 1e9; };
    const W = [];
    const add = (w, f) => { if (w > 0) W.push([w, f]); };
    // 1) la roba nelle tasche che sta bene in casa (comprata, regalata, rubata, presa)
    if (portabili(n).length) add(3, () => portaACasa(st, n));
    // quello per cui ha comprato la roba (la vernice per dipingere, la stoffa per la bandiera)
    const In = Ss.intenti[n.id]; if (In && In.length) { const k = In[0], done = () => In.shift();
      if (k === 'dipingere') add(6, () => { const r0 = dipingiCon(st, n, g); if (r0) done(); return r0; });
      else if (k === 'pavimento') add(6, () => { const r0 = pavimentoCon(st, n, g); if (r0) done(); return r0; });
      else if (FATTE[k]) add(6, () => { const r0 = fatta(st, n, k, FATTE[k]); if (r0) done(); return r0; });
      else done(); }
    // 2) per gli ospiti (un appuntamento a casa sua fra poco)
    const ap = P.appt; if (ap && ap.tgt && ap.tgt.k === 'b' && ap.tgt.bi === bi && ap.t > st.t && ap.t - st.t < 180 && lastV('riordina') > 240) add(6, () => ['riordina', { ospiti: 1, ospite: ap.with }]);
    // 3) giù di corda: la casa va da sé
    if (d > .55) add(d * 1.6, () => ['sporca', {}]);
    // 4) i verbi del gusto
    if (d < .7) {
      add(.25 + ((P.age || 40) > 60 ? .35 : 0) + ((P.need || {}).compagnia || 0) * .3, () => (lastV('finestra') > 1440 ? ['finestra', {}] : null));
      add(g.tv * .8, () => (lastV('tv') > 2880 ? ['tv', {}] : null));
      add((1 - g.ordine) * .45, () => ['scambia', {}]);
      add(g.ordine * .5 + (g.sobrio * .3), () => ['riordina', {}]);
      add(g.sobrio * .5, () => (lastV('butta') > 1440 ? ['butta', { cosa: 'kitsch' }] : null));
      add(g.verde * .8, () => (lastV('pianta') > 720 ? ['pianta', {}] : null));
      const quanto = lastV('dipingi'); add((.25 + g.ordine * .2 + (g.drift.length ? .4 : 0)) * (quanto > 4320 ? 1 : 0), () => dipingiCon(st, n, g));
      add((g.sobrio + g.kitsch) * .12 * (lastV('pavimento') > 7200 ? 1 : 0), () => pavimentoCon(st, n, g));
      // le cose fatte a mano, dal gusto e dalla materia vera
      for (const k in VOGLIE) { const w = (g[k] || 0) * .3; if (w > .05 && VOGLIE[k].length) add(w, () => { voglia(st, n, pick(VOGLIE[k]), k); return null; }); }
      for (const k in FATTE) { const X = FATTE[k], w = X.gusto === 'lutto' ? (d > .3 ? .6 : 0) : X.gusto === 'vincita' ? 0 : (g[X.gusto] || 0) * .55; if (w > .05) add(w, () => fatta(st, n, k, X)); }
    }
    if (!W.length) return;
    let tot = W.reduce((s, x) => s + x[0], 0), u = r() * tot, ch = W[0][1];
    for (const [w, f] of W) { u -= w; if (u <= 0) { ch = f; break; } }
    const res = ch(); if (!res) return;
    Ss.stats.decisioni++;
    fai(st, n, bi, res[0], res[1], { scena: true });
  }
  const portabili = n => Object.keys(n.pop.inv || {}).filter(x => G2F[x] && (n.pop.inv[x] || 0) > 0);
  // la roba delle tasche che va in casa (con la sua provenienza: comprata, regalata, rubata)
  function portaACasa(st, n, g) {
    const Ss = S(st), x = g && portabili(n).includes(g) ? g : portabili(n)[0]; if (!x) return null; const pv = (Ss.prov[n.id] || {})[x] || provDa(st, n, x);
    if (!prendiRoba(n, x, 1)) return null; if (Ss.prov[n.id]) delete Ss.prov[n.id][x];
    return ['posa', { id: G2F[x], g: x, prov: pv || null, causa: pv && (pv.fid || pv.vfid) }];
  }
  Casa.portaACasa = portaACasa;
  // dipingere: il colore suo, la materia vera (calce o vernice); se manca, la voglia di comprarla
  function dipingiCon(st, n, g) {
    const ink = INK[g.colore] ? g.colore : 'carta', X = INK[ink];
    if (!roba(n, X.mat)) { voglia(st, n, X.mat, 'dipingere'); return null; }
    prendiRoba(n, X.mat, 1); return ['dipingi', { stile: X.stile, ink }];
  }
  function pavimentoCon(st, n, g) {
    const stile = g.pav || 'linoleum', mat = PAV_MAT[stile] || 'assi';
    if (!roba(n, mat)) { if ((n.pop.money || 0) > 40) voglia(st, n, mat, 'pavimento'); return null; }
    prendiRoba(n, mat, 1); return ['pavimento', { stile }];
  }
  function fatta(st, n, k, X) {
    if (!roba(n, X.g)) { if (Math.random() < .5) voglia(st, n, X.g, k); return null; }
    prendiRoba(n, X.g, 1); return ['posa', { id: X.id, g: X.g, prov: { come: 'fatta' } }];
  }
  // da dove viene una cosa delle tasche: un regalo recente (Vita), un acquisto (le voglie), il resto non si sa
  function provDa(st, n, g) {
    const V = Vi(); if (V && V.recenti) try { const f = V.recenti(n, 2880).reverse().find(f => f.tipo === 'regalo' && f.dati && f.dati.id === g && f.chi[1] === n.id); if (f) return { da: f.chi[0], come: 'regalo', vfid: f.id }; } catch (e) { }
    const c = (S(st).comprati[n.id] || {})[g]; if (c) return { come: 'comprato', fid: c };
    return null;
  }
  // le voglie: chi passa dalla bottega giusta compra (Economia.buy: soldi e scorte vere); lontano dal giocatore, dopo un giorno, compra lo stesso
  function shopFor(st, g) {
    const X = Ec(); if (!X) return null; const E0 = X.eco(st); let best = null;
    for (const k in E0.shops) { const S0 = E0.shops[k]; if (!S0.sells || !S0.sells[g] || S0.black || (S0.stock[g] || 0) < 1 || !S0.t) continue; if (S0.market && Po() && ![2, 5].includes(Po().weekday(st.t))) continue; best = best || S0; }
    return best;
  }
  function voglie(st, n) {
    const Ss = S(st), L = Ss.voglie[n.id]; if (!L || !L.length) return;
    const P = n.pop, X = Ec(); if (!X) return;
    for (let i = 0; i < L.length; i++) {
      const v = L[i], S0 = shopFor(st, v.g); if (!S0) { if (st.t - v.t > 4320) L.splice(i--, 1); continue; }
      const li = S0.t.k === 'b' && P.at && P.at.k === 'b' && P.at.bi === S0.t.bi, lontano = dP(st, n) > CFG.vicino && st.t - v.t > CFG.consegna;
      if (!li && !lontano) continue;
      let pr = null; try { pr = X.buy(st, n, S0.t, v.g, 1); } catch (e) { pr = null; }
      if (pr == null) { if ((P.money || 0) < 5 || st.t - v.t > 4320) L.splice(i--, 1); continue; }
      mettiRoba(n, v.g, 1); L.splice(i--, 1); Ss.stats.comprati++; const In = Ss.intenti[n.id] = Ss.intenti[n.id] || []; if (!In.includes(v.perche)) In.push(v.perche);   // comprato per qualcosa: la prossima volta a casa lo fa
      const fid = fatto(st, 'compra', n, { d: `${nomeDi(n)} compra ${v.g} (${v.perche})`, g: v.g, prezzo: pr, dove: S0.t.label || S0.k, perche: v.perche }, null);
      (Ss.comprati[n.id] = Ss.comprati[n.id] || {})[v.g] = fid;
    }
  }

  // ======================================================================================================================
  // LA VITA CHE CAMBIA IL GUSTO: la vincita (i soldi che saltano), il lutto, la banda; e il furto in casa (popolo.js scasso)
  // ======================================================================================================================
  function vitaPasso(st, k6) {
    const Ss = S(st), d = dayOf(st.t), I = Po() && Po()._;
    if (Ss.giorno !== d) {
      st.npcs.forEach(n => { if (!alive(n)) return; const s0 = Ss.snap[n.id]; if (s0 && Ss.giorno >= 0 && (n.pop.money || 0) - s0.m > 60) evento(st, n, 'vincita'); Ss.snap[n.id] = { m: n.pop.money || 0, b: membro(n) }; });
      Ss.giorno = d;
    }
    for (let i = k6 || 0; i < st.npcs.length; i += 6) { const n = st.npcs[i];
      if (!alive(n)) continue; const s0 = Ss.snap[n.id] || (Ss.snap[n.id] = { m: n.pop.money || 0, b: membro(n) });
      if (membro(n) && !s0.b) { s0.b = true; evento(st, n, 'banda'); }
      if (!membro(n) && s0.b) s0.b = false;
      if (I && I.recent && !s0.lutto) { const e = I.recent(st, n.pop, 'lutto', 1); if (e) { s0.lutto = st.t; evento(st, n, 'lutto'); } }
      if (s0.lutto && st.t - s0.lutto > 4320) s0.lutto = 0;
    }
    // gli scassi (popolo.js doGiro ladro): i soldi li conta popolo; la cosa la porta via casa.js, dalla pianta vera se c'è, se no dalla roba di casa
    (st.events || []).forEach(ev => {
      if (ev.type !== 'scasso' || Ss.ev[ev.id]) return; Ss.ev[ev.id] = 1;
      const ladro = G.byId(st, ev.actor), vit = G.byId(st, ev.target); if (!alive(ladro) || !alive(vit)) return;
      ruba(st, ladro, vit, ev);
    });
    const ks = Object.keys(Ss.ev); if (ks.length > 300) ks.slice(0, ks.length - 200).forEach(k => delete Ss.ev[k]);
  }
  function ruba(st, ladro, vit, ev) {
    const Ss = S(st), bi = homeBi(vit); if (bi == null || delGiocatore(st, bi)) return;
    const fid0 = fatto(st, 'scasso', [ladro.id, vit.id], { d: `scasso a casa di ${nomeDi(vit)}`, ev: ev.id, bi }, null);
    const L = pianta(bi);
    if (L) {   // la pianta c'è: la cosa sparisce davvero dal mobile (come quando la prende il giocatore)
      const C = casaDi(st, bi), op = { n: ++C.n, t: st.t, chi: ladro.id, hh: vit.pop.hh, v: 'prendi', s: (rnd() * 4294967296) >>> 0, ladro: ladro.id, vittima: vit.id, causa: fid0 };
      C.ops.push(op); Ss.stats.ops++; Ss.stats.per.prendi = (Ss.stats.per.prendi || 0) + 1; mettiInOpera(st, bi); return;
    }
    // se no, dalla roba di casa della vittima (P.casa), se c'è qualcosa che si mette in casa
    const g = Object.keys(vit.pop.casa || {}).find(x => G2F[x] && vit.pop.casa[x] > 0); if (!g) return;
    vit.pop.casa[g]--; if (vit.pop.casa[g] <= 0) delete vit.pop.casa[g]; mettiRoba(ladro, g);
    const fid = fatto(st, 'furto_casa', [ladro.id, vit.id], { d: `${nomeDi(ladro)} porta via ${g} da casa di ${nomeDi(vit)}`, g, bi }, fid0);
    (Ss.prov[ladro.id] = Ss.prov[ladro.id] || {})[g] = { da: vit.id, come: 'furto', fid, t: st.t }; Ss.stats.rubati++;
  }
  Casa.ruba = ruba;

  // ======================================================================================================================
  // LE VISITE: chi entra in casa d'altri vede i cambi (quelli certi: le pareti, le cose nuove) e, se c'è, la sua roba rubata
  // ======================================================================================================================
  function visite(st) {
    const Ss = S(st);
    st.npcs.forEach(v => {
      const P = v.pop; if (!alive(v) || !v.inside || !P.at || P.at.k !== 'b') return; const bi = P.at.bi; if (bi === homeBi(v)) return;
      const b = B(bi), a = P.cur && P.cur.act; if (!b || a === 'lavoro' || a === 'spesa' || (P.cur && /bottega|bancone|panino/.test(P.cur.obj || '')) || (P.job && P.job.t && P.job.t.k === 'b' && P.job.t.bi === bi)) return;   // al lavoro o a fare la spesa non si vede la casa di nessuno
      const C = Ss.case[bi]; if (!C || !C.ops.length) return;
      // è una visita se in quella casa abita un amico (o uno di famiglia, o uno della banda come lui); o se c'è la sua roba
      const amici = new Set(P.friends || []), suo = C.ops.some(o => o.prov && o.prov.da === v.id);
      if (!suo && !st.npcs.some(h => h !== v && homeBi(h) === bi && (amici.has(h.id) || (h.pop.friends || []).includes(v.id) || (h.pop.sur && h.pop.sur === P.sur) || (membro(h) && membro(v))))) return;
      const k = v.id, last = C.seen[k] || 0; if (C.n <= last) return;
      const vk = bi + ':' + v.id; if (!Ss.visite[vk] || st.t - Ss.visite[vk] > 120) { Ss.visite[vk] = st.t; Ss.stats.visite++; }
      const nuovi = C.ops.filter(o => o.n > last && o.chi !== v.id && o.chi !== 'player' && o.fid && ((o.v === 'dipingi' || o.v === 'posa' || o.v === 'pavimento') && !(o.r && o.r.ok === false) || (/^(finestra|tv|scambia|butta)$/.test(o.v) && o.r && o.r.ok)));
      C.seen[k] = C.n; if (!nuovi.length) return;
      const mio = nuovi.find(o => o.v === 'posa' && o.prov && o.prov.come === 'furto' && o.prov.da === v.id);
      const o = mio || nuovi[nuovi.length - 1], own = G.byId(st, o.chi);
      if (!alive(own)) return;
      if (mio) {
        const c = nomeF(o.id), f = fatto(st, 'riconosce', [v.id, own.id], { d: `${nomeDi(v)} riconosce ${c} sua a casa di ${nomeDi(own)}`, cosa: o.id, bi }, o.fid);
        Ss.stats.riconosciuti++;
        const I = Po() && Po()._; if (I && I.note) try { I.note(st, v, `derubat${v.pop.sex === 'f' ? 'a' : 'o'}: ${c} sua è a casa di ${own.first}`, 'bad', { who: own.id, w: .6, tag: 'furto', causa: f }); if (I.feel) I.feel(st, v, 'rabbia', .2); } catch (e) { }
        const gen = genere(o.id), a1 = riga('riconosce', { C: cap1(c), c: senzaArt(c), L: c }, null, gen), a2 = riga('riconosceR', {}, null, gen); if (a1 && a2) dire(st, [[v, a1], [own, a2]], f);
        return;
      }
      if (!alive(own) || own === v) return;
      const f = fatto(st, 'nota', [v.id, own.id], { d: `${nomeDi(v)} nota ${o.v === 'dipingi' ? 'le pareti nuove' : o.v === 'posa' ? nomeF(o.id || '') : 'che ' + (o.r && o.r.desc || o.v)} a casa di ${nomeDi(own)}`, bi, op: o.n }, o.fid);
      Ss.stats.notati++;
      if (o.v === 'dipingi' && o.stile !== 'calce') { const ink = INK[o.ink]; dire(st, [[v, riga('notaD', { colore: ink ? ink.w : o.stile })], [own, riga('notaR')]], f); }
      else if (o.v === 'finestra') dire(st, [[v, riga('notaF')], [own, riga('notaFR')]], f);
      else if (/^(tv|scambia|butta)$/.test(o.v)) dire(st, [[v, riga('notaS')], [own, riga('notaSR')]], f);
      else if (o.v === 'posa' && (!o.prov || o.prov.come !== 'fatta')) { const a1 = riga('notaP', { c: senzaArt(nomeF(o.id)), L: nomeF(o.id) }, null, genere(o.id)); if (a1) dire(st, [[v, a1], [own, riga('notaPR')]], f); }
    });
  }

  // ======================================================================================================================
  // IL GIOCATORE: gli stessi verbi, dalla sua casa, da una base, dalla casa di uno della banda (menu QUI, ADESSO)
  // ======================================================================================================================
  function casaQui(st) { const p = pl(st); if (!p || !p.indoor) return null; const bi = p.indoor.b; return puo(st, 'player', bi) ? bi : null; }
  const PINK = Object.keys(INK);
  function azioniGiocatore(st) {
    const out = [], bi = casaQui(st); if (bi == null) return out; const p = pl(st), f = p.indoor.f, inv = p.inv || {};
    const L = layoutDi(bi), F = L.floors[f]; chiavi(F);
    const add = (id, label, run) => out.push({ id, label, run, off: '' });
    const via = (v, dati) => { const op = fai(st, 'player', bi, v, Object.assign({ f }, dati)); S(st).stats.giocatore++; if (!op || !op.r || !op.r.ok) return 'Non c\'è posto.';
      const r = op.r; return v === 'dipingi' ? `Ridipingi ${String(r.stanza || 'la stanza').replace(/_/g, ' ')}: ${INK[op.ink].w}.` : v === 'posa' ? `Metti in casa ${nomeF(op.id)}.` : v === 'finestra' ? `Sposti ${nomeF(r.cosa)} alla finestra.` : v === 'butta' ? `Butti via ${nomeF(r.cosa)}.` : cap1(r.desc) + '.'; };
    const qi = Math.max(0, roomIdx(F, p.x, p.y)), qw = F.rooms[qi] && F.rooms[qi].wall; let tries = 0;
    while (INK[PINK[S(st).gioc.ink % PINK.length]].stile === qw && tries++ < PINK.length) S(st).gioc.ink++;   // il colore che la stanza non ha già
    const ink = PINK[S(st).gioc.ink % PINK.length], X = INK[ink];
    if ((inv[X.mat] || 0) > 0) add('casa_dipingi', `Ridipingi la stanza (${X.w})`, () => { inv[X.mat]--; if (inv[X.mat] <= 0) delete inv[X.mat]; S(st).gioc.ink++; return via('dipingi', { stile: X.stile, ink, stanza: qi }); });
    else add('casa_colore', `Colore per le pareti: ${X.w} (serve ${X.mat})`, () => { S(st).gioc.ink++; return `Il prossimo: ${INK[PINK[S(st).gioc.ink % PINK.length]].w}.`; });
    const sedia = vivi(F, SEDUTE).sort((a, b) => hyp(a.x - p.x, a.y - p.y) - hyp(b.x - p.x, b.y - p.y))[0];
    if (sedia && hyp(sedia.x - p.x, sedia.y - p.y) < 3) add('casa_finestra', `Sposta ${nomeF(sedia.id)} alla finestra`, () => via('finestra', { key: sedia.__ck }));
    const g = Object.keys(inv).find(x => G2F[x] && inv[x] > 0);
    if (g) add('casa_posa', `Metti in casa: ${senzaArt(nomeF(G2F[g]))}`, () => { inv[g]--; if (inv[g] <= 0) delete inv[g]; return via('posa', { id: G2F[g], g, prov: { come: 'giocatore' } }); });
    const vic = F.furn.filter(o => !o.taken && (CIARPAME.test(o.id) || KITSCH.test(o.id) || RUBABILI.test(o.id)) && hyp(o.x - p.x, o.y - p.y) < 2).sort((a, b) => hyp(a.x - p.x, a.y - p.y) - hyp(b.x - p.x, b.y - p.y))[0];
    if (vic) add('casa_butta', `Butta via ${nomeF(vic.id)}`, () => via('butta', { key: vic.__ck }));
    return out;
  }
  Casa.azioniGiocatore = azioniGiocatore;
  (function agganciaMenu() { if (typeof Azioni === 'undefined' || !Azioni.playerActions) return; const a0 = Azioni.playerActions; Azioni.playerActions = function (st) { const o = a0.apply(this, arguments) || []; try { return o.concat(azioniGiocatore(st)); } catch (e) { return o; } }; })();

  // ======================================================================================================================
  // IL PASSO: le battute ogni fotogramma; le scene se ci sono; il resto ogni 10 minuti di gioco (un sesto della città per volta)
  // ======================================================================================================================
  const mx = (Ss, k, t0) => { const d = now() - t0; if (d > (Ss.stats.mx[k] || 0)) Ss.stats.mx[k] = +d.toFixed(2); };
  function giro(st) {
    const Ss = S(st), h = mOf(st.t) / 60, k = Ss.tick++ % 6; if (!Ss.stats.mx) Ss.stats.mx = {};
    let t0 = now(); vitaPasso(st, k); mx(Ss, 'vita', t0);
    t0 = now(); if (k === 0) visite(st); mx(Ss, 'visite', t0);
    if (h < CFG.ore[0] || h > CFG.ore[1]) return;
    const pTick = CFG.pOra * CFG.ogni / 60 * 6;   // ogni persona è guardata una volta ogni sei giri
    for (let i = k; i < st.npcs.length; i += 6) {
      const n = st.npcs[i]; if (!alive(n)) continue;
      let t1 = now(); voglie(st, n); mx(Ss, 'voglie', t1);
      if (!libero(st, n) || !aCasa(st, n)) continue;
      if (rnd() < pTick) { t1 = now(); decidi(st, n, h); mx(Ss, 'decidi', t1); }
    }
  }
  function step(st, dt) {
    const t0 = now(), Ss = S(st);
    if (!Ss.stats.mx) Ss.stats.mx = {};
    if (st.t >= (Ss.next || 0)) { Ss.next = st.t + CFG.ogni / 6; giro(st); const g = now() - t0; if (g > (Ss.stats.msGiro || 0)) Ss.stats.msGiro = g; }
    const t1 = now(); scenePasso(st); coda(st); const sc = now() - t1; if (sc > (Ss.stats.msScene || 0)) Ss.stats.msScene = sc;
    const ms = now() - t0; Ss.stats.ms += ms; Ss.stats.passi++; if (ms > 1) Ss.stats.oltre1 = (Ss.stats.oltre1 || 0) + 1; if (ms > Ss.stats.msMax) Ss.stats.msMax = ms;
  }
  // il giocatore entra (o cambia piano): la pianta c'è, le righe vanno in opera prima che la si disegni
  function entra(st, b) {
    const bi = G.BUILDINGS.indexOf(b); if (bi < 0) return; const L = INT().layout(b); LK.set(bi, L);
    const t0 = now(); if (S(st).case[bi]) mettiInOpera(st, bi); const ms = now() - t0, Ss = S(st); Ss.stats.msEntra = Math.max(Ss.stats.msEntra || 0, ms);
  }
  { const s0 = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (s0) s0(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Casa]', e); } } }; }
  { const i0 = G.HOOKS.indoor; G.HOOKS.indoor = (st, b, dentro) => { try { if (dentro || (st.player && st.player.indoor)) entra(st, b); } catch (e) { if (typeof console !== 'undefined') console.warn('[Casa] entra', e); } if (i0) return i0(st, b, dentro); }; }
  // le case vicine: nel tempo libero del browser si fanno le piante che hanno righe in attesa (una per volta)
  if (W0 && typeof W0.requestIdleCallback === 'function') {
    const idle = () => { try { const pv = W0.__pv, st = pv && pv.st; if (st && st.casa) { const p = st.player, Cs = st.casa.case; for (const k in Cs) { const C = Cs[k], b = B(C.bi); if (!b || LK.has(C.bi) || !C.ops.length) continue; if (hyp((b.x + b.w / 2) * TS - p.x, (b.y + b.h / 2) * TS - p.y) > CFG.vicino) continue; layoutDi(C.bi); mettiInOpera(st, C.bi); S(st).stats.vicine = (S(st).stats.vicine || 0) + 1; break; } } } catch (e) { } setTimeout(() => W0.requestIdleCallback(idle, { timeout: 4000 }), 6000); };
    setTimeout(() => W0.requestIdleCallback(idle, { timeout: 4000 }), 15000);
  }

  // ======================================================================================================================
  // PER LE PROVE E IL TACCUINO
  // ======================================================================================================================
  // lo stato di una casa come lo vede chi entra: per ogni piano, le cose (chiave, voce, posto, presa) e le pareti
  function istantanea(st, bi) {
    const L = layoutDi(bi); mettiInOpera(st, bi);
    return L.floors.map(F => ({ furn: F.furn.map(o => [o.__ck || o.id, o.id, +o.x.toFixed(2), +o.y.toFixed(2), +(o.ry || 0).toFixed(2), !!o.taken]), muri: F.rooms.map(q => q.wall), pav: F.rooms.map(q => q.floor), sporco: F.rooms.map(q => +(q.dirt || 0).toFixed(2)) }));
  }
  // rifà le righe su una pianta nuova (la stessa che si avrebbe entrando la prima volta): senza effetti fuori dalla pianta
  function rifai(L, ops) {
    ops.forEach(op => { if (!op.r) return; const F = L.floors[op.f]; if (!F) return; chiavi(F); const P0 = VERBI[op.v] ? VERBI[op.v](L, op.f, op, rng(op.s)) : null; if (P0) P0.fai(); });
    return L;
  }
  function report(st) {
    const Ss = S(st), cs = Object.values(Ss.case);
    return { case: cs.length, righe: cs.reduce((s, C) => s + C.ops.length, 0), stats: Ss.stats, fatti: Ss.fatti.length, righeDette: Ss.righe.length, ms: Ss.stats.passi ? Ss.stats.ms / Ss.stats.passi : 0 };
  }
  Object.assign(Casa, { istantanea, report, rifai, layoutDi, pianta, risolvi, decidi, visite, step, entra, pianoDi, stanzeCasa, principale, riga, dire, umore, voglie, _: { LK, aCasa, libero, homeBi, chiavi, scenaPossibile, inScena, membro, giocabile, G2F, F2G, FATTE, nomeF } });
})();
