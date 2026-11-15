/* [unico] unico_cultura.js: LA CULTURA CHE NASCE DALLA STORIA (dietro ?commedia; la consegna: commedia/REGISTA_CONSEGNA.md, «La cultura»).
   Spento il flag: UnicoCultura = { ON: false } e nient'altro. Niente modelli di linguaggio: tutto viene da regole e grammatiche sui FATTI
   veri del paese (st.u.fatti), dal flusso 'cultura' della porta (stesso seme, stessa cultura) e, per le battute, dall'hash della riga.

   LE COMUNITÀ. Ogni gruppo di UnicoGruppi ('g:g3'), ogni presidio senza un gruppo dietro ('c:c4') e ogni mestiere ('m:pesca') è una
   comunità con la sua cultura, fatta dei suoi EPISODI e dei DETTAGLI di quegli episodi (c.det: la cosa tirata, il pezzo portato al
   presidio, la pianta nel vaso, il posto, l'ora, il furgone dei Grigi, l'onomatopea del guaio, il mestiere, la persona, il piatto, la
   bestia che passava): ogni parola si fa con QUEI dettagli, mai con un elenco fisso. E c'è una MEMORIA CONTRO LA RIPETIZIONE per tutto il
   paese (st.u.cultura.usati: le radici e gli schemi già presi da altri), così due gruppi non si somigliano e due partite nemmeno.
   - il NOME, deciso da loro: il più carismatico propone, gli altri votano o brontolano («nome_proposto», «nome_scelto»). I candidati
     vengono da una cinquantina di SCHEMI in molti registri (l'oggetto col suo aggettivo, la data, la persona, l'ironia sugli episodi, il
     posto, il burocratico, il chiesastico, il marinaro, il bambinesco, il dialettale, lo sportivo, il cooperativo, il nobiliare, il
     finto militare, l'onomatopeico, l'ora), pesati dalla rarità del dettaglio e scontati se la radice o lo schema sono già in giro. Dopo un
     fatto grosso (resistenza, sgombero, martire, scissione) il nome si può cambiare. Va in g.nome e in C.nome (lo striscione);
   - il SIMBOLO: dati { f, o (il dettaglio), d (il disegno: una ventina di oggetti, se no la lettera iniziale a graffito), c, x };
   - le PAROLE (gergo da molti schemi e conii: la radice del dettaglio con i suffissi), i soprannomi dei Grigi dai loro arnesi e mezzi,
     l'antonomasia, il saluto, il motto; girano sulle chiacchiere (UnicoIdee.ascolta), si storpiano in bocca ai ragazzi, si dimenticano;
   - i MITI gonfiati a ogni racconto; i RITI (tavolata, minuto, sedia vuota, il primo «anniversario»); la FORMA (UnicoParti.sito avvolto);
   - per il paese: SOPRANNOMI, NOMI DI POPOLO dei posti, l'UFFICIO RETTIFICHE (vie, eufemismi, manifesti) e le PARODIE, PROVERBI,
     SUPERSTIZIONI, SANTI e altarini, CANTI a rima, PIATTI, MODA, il CALENDARIO, scissione, appropriazione, oblio, contagio, i mestieri.
   LO STATO in st.u.cultura, solo dati. La scheda «Cultura» nel Taccuino (Città). */
var UnicoCultura = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UCu = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UCu;
  if (!ON) return UCu;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const ID = () => (typeof UnicoIdee !== 'undefined' && UnicoIdee.ON ? UnicoIdee : null);
  const GR = () => (typeof UnicoGruppi !== 'undefined' && UnicoGruppi.ON ? UnicoGruppi : null);
  const SG = () => (typeof Segni !== 'undefined' && Segni.ON ? Segni : null);
  const RG = () => (typeof Regista !== 'undefined' && Regista.ON ? Regista : null);
  const LG = () => (typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null);
  const UCo = () => (typeof UnicoCostruire !== 'undefined' && UnicoCostruire.ON ? UnicoCostruire : null);
  if (!G || !Un() || !FT() || !ID()) { UCu.ON = false; return UCu; }
  const I = ID(), DEBUG = /[?&]regia\b/.test(location.search);
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const hyp = Math.hypot, r2 = x => Math.round(x * 100) / 100;
  const rnd = () => Un().flusso('cultura');
  const pick = L => L[Math.floor(rnd() * L.length) % L.length];
  const hashS = s => { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const hpick = (L, s) => L[Math.floor(hashS(s) * L.length) % L.length];
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const io = id => (id === 'player' ? 'nino' : id == null ? null : String(id));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const CFG = UCu.CFG = { battito: 30, fattiGiorno: 70, nomeDopo: 150, nomiMax: 3, cerimonieGiorno: 6, parolePer: 6, decad: .75, dimentica: .12, miti: 24, mitiGiorno: 5, raccontiOra: 6,
    sopr: 60, topo: 30, prov: 14, sup: 10, det: 14, dire: { ogni: 6, gap: 9, r: 18, max: 64 }, subst: .35, nomeAllaNascita: true };
  const stats = UCu.stats = { battiti: 0, ms: 0, msMax: 0, cerimonie: 0, nomi: 0, rinomine: 0, simboli: 0, parole: 0, passate: 0, storpiate: 0, morte: 0, miti: 0, racconti: 0, riti: 0, canti: 0,
    sopr: 0, topo: 0, rettifiche: 0, manifesti: 0, parodie: 0, proverbi: 0, superstizioni: 0, santi: 0, piatti: 0, magliette: 0, contagi: 0, dette: 0, sostituite: 0, forme: 0 };

  // ======================= LO STATO =======================
  function S(st) {
    const u = st && st.u; if (!u) return null;
    if (!u.cultura) u.cultura = { v: 1, n: 0, com: {}, par: {}, sa: {}, miti: {}, sopr: {}, topo: {}, reg: { vie: {}, man: [], par: [] }, prov: [], sup: [], santi: [], piatti: [],
      cal: { giorni: {}, feste: [] }, usati: { r: {}, p: {} }, conti: {}, bud: { g: -1, n: 0, c: 0, m: 0, x: {} }, prossimo: st.t, ora: st.t, giorno: Math.floor(st.t / 1440) };
    return u.cultura;
  }
  const npc = (st, id) => (id == null || id === 'nino' || id === 'player' ? null : G.byId ? G.byId(st, id) : null);
  const vivo = (st, id) => { const n = npc(st, id); return n && n.pop && !n.dead && !n.gone ? n : null; };
  const libero = (st, id) => { const n = vivo(st, id); return n && !(n.jailedUntil > st.t) && !n.grigio ? n : null; };
  const donna = (st, id) => { const n = npc(st, id); return !!(n && n.pop && n.pop.sex === 'f'); };
  function nome(st, id) {
    if (id === 'nino' || id === 'player') return 'Nino';
    try { const L = LG(); if (L && L.nome) { const s = L.nome(st, id); if (s && s !== String(id)) return s; } } catch (e) { }
    const n = npc(st, id); return (n && (n.first || n.name)) || 'qualcuno';
  }
  const T = (st, id) => I.tratti(st, id) || { follia: 0, zelo: 0, vilta: .5, carisma: .3, credulo: .3, testardo: .3, contrario: 0 };
  const forme = s => I.forme(s);
  const placeN = l => (l && G.PLACES && G.PLACES[l] && G.PLACES[l].name) || '';
  const conta = (o, k) => { o[k] = (o[k] || 0) + 1; };
  function bud(st) { const s = S(st), g = Math.floor(st.t / 1440); if (s.bud.g !== g) { s.bud.g = g; s.bud.n = 0; s.bud.c = 0; s.bud.m = 0; s.bud.x = {}; } return s.bud; }
  const quota = (st, k, max) => { const b = bud(st); if ((b.x[k] || 0) >= max) return false; b.x[k] = (b.x[k] || 0) + 1; return true; };
  function scrivi(st, tipo, chi, dati, causa, forza) {
    const b = bud(st); if (!forza && b.n >= CFG.fattiGiorno) return null; b.n++;
    let f = null; try { f = FT()._.registra(st, { t: st.t, v: tipo, chi: [].concat(chi).filter(x => x != null).slice(0, 6), causa: typeof causa === 'number' ? causa : null, peso: 1, hop: 0 }, dati, 'unico'); } catch (e) { f = null; }
    if (f) conta(S(st).conti, tipo);
    return f;
  }

  // ======================= IL LESSICO: le parole e le loro forme =======================
  const L_ = () => LG();
  const FEM = new Set(['tartaruga', 'gallina', 'capra', 'oca', 'lucertola', 'cornacchia', 'pulce', 'lumaca', 'camionetta', 'campagnola', 'jeep', 'matita', 'cartellina', 'fave', 'cozze', 'sardine', 'polenta', 'frittelle', 'lenticchie', 'melanzane', 'castagne', 'ricotta', 'acciughe', 'patate', 'cipolle', 'trippa', 'zucchine', 'cicoria', 'polpette', 'uova sode', 'rete', 'cassa', 'cassetta', 'seggiola', 'sdraio', 'gomma', 'ruota', 'anta', 'latta', 'lamiera', 'pedana', 'sedia', 'porta']);
  const MAS = new Set(['piccione', 'cane', 'riccio', 'granchio', 'polpo', 'merlo', 'topo', 'geco', 'mulo', 'asino', 'gatto', 'gabbiano', 'sidecar', 'cellulare', 'furgone', 'motocarro', 'carro attrezzi', 'peperoni', 'carciofi', 'baccalà', 'fichi', 'ceci', 'pomodori secchi', 'pane raffermo', 'bidone', 'fusto', 'portone', 'copertone', 'bancale', 'tubo', 'palo', 'tavolino', 'tavolo', 'barattolo', 'geranio', 'basilico', 'limone', 'pescatore', 'cameriere', 'timbro', 'modulo', 'fischietto', 'manganello', 'bollettario', 'binocolo', 'megafono', 'berretto', 'lampeggiante', 'taccuino']);
  const PLUR = new Set(['tre di notte', 'cinque e mezza', 'cinque', 'ore piccole', 'fave', 'cozze', 'sardine', 'frittelle', 'lenticchie', 'melanzane', 'castagne', 'acciughe', 'patate', 'cipolle', 'zucchine', 'polpette', 'uova sode', 'peperoni', 'carciofi', 'fichi', 'ceci', 'pomodori secchi', 'carte', 'sigarette']);
  for (const w of ['notte fonda', 'alba', 'mattina presto', 'controra', 'ora di pranzo', 'ora di cena', 'mezzanotte', 'tre di notte', 'cinque e mezza', 'cinque', 'ore piccole', 'carte', 'sigarette']) FEM.add(w);
  for (const w of ['buio pesto', 'primo gallo', 'caffè delle nove', 'mezzogiorno', 'pomeriggio lungo', 'tramonto', 'imbrunire', 'ultimo tram']) MAS.add(w);
  function gen(w) { const lw = String(w).toLowerCase(); if (PLUR.has(lw)) return { g: FEM.has(lw) ? 'f' : 'm', pl: true }; if (FEM.has(lw)) return { g: 'f', pl: false }; if (MAS.has(lw)) return { g: 'm', pl: false }; try { const L = L_(); if (L && L.genere) { const g = L.genere(w); return { g: g.f ? 'f' : 'm', pl: !!g.pl }; } } catch (e) { } return { g: /a$/.test(w) ? 'f' : 'm', pl: /[ie]$/.test(w) && w.length > 4 && !/one$|ore$|ale$|ile$/.test(w) }; }
  const VOC = h => /^[aeiouàèéìòùh]/i.test(h), SPEC = h => /^(s[^aeiouàèéìòù]|z|gn|ps|x|y)/i.test(h);
  // l'articolo e le preposizioni articolate, da sé (le parole qui sono spesso inventate: Lingua non le conosce)
  function artW(w, tipo, g0) {
    const ma = /^(il|lo|la|i|gli|le)\s(.+)$/i.exec(String(w)) || /^(l')(.+)$/i.exec(String(w)); if (ma) { const a = ma[1].toLowerCase(); w = ma[2]; g0 = { g: /^(la|le)$/.test(a) ? 'f' : a === "l'" ? gen(w).g : 'm', pl: /^(i|gli|le)$/.test(a) }; }
    const g = g0 || gen(w), f = g.g === 'f', pl = g.pl, h = w;
    const det = pl ? (f ? 'le' : VOC(h) || SPEC(h) ? 'gli' : 'i') : VOC(h) ? "l'" : f ? 'la' : SPEC(h) ? 'lo' : 'il';
    const P = { det: '', di: 'd', a: 'a', in: 'n', da: 'da', su: 'su', con: 'co' }[tipo || 'det'];
    if (tipo === 'ind') return (pl ? (f ? 'delle ' : VOC(h) || SPEC(h) ? 'degli ' : 'dei ') : f ? (VOC(h) ? "un'" : 'una ') : SPEC(h) ? 'uno ' : 'un ') + w;
    if (!P) return det + (det.endsWith("'") ? '' : ' ') + w;
    const pre = { d: 'de', a: 'a', n: 'ne', da: 'da', su: 'su', co: 'co' }[P];
    const fx = det === "l'" ? pre + "ll'" : det === 'il' ? (pre === 'de' ? 'del' : pre === 'ne' ? 'nel' : pre === 'co' ? 'col' : pre + 'l') : det === 'i' ? (pre === 'de' ? 'dei' : pre === 'ne' ? 'nei' : pre === 'co' ? 'coi' : pre + 'i') : det === 'gli' ? (pre === 'co' ? 'con gli' : pre + 'gli') : pre === 'co' ? 'con ' + det : pre + 'l' + det;
    return fx + (fx.endsWith("'") ? '' : ' ') + w;
  }
  const PICC = new Set(['di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'e', 'del', 'dello', 'della', 'dei', 'degli', 'delle', "dell'", 'al', 'allo', 'alla', 'ai', 'agli', 'alle', "all'", 'nel', 'nella', 'nei', 'col', 'sotto', 'che', 'il', 'lo', 'la', 'i', 'gli', 'le', "l'", 'non', 'se', 'ne']);
  const tc = s => String(s).split(' ').map((w, i) => (i && PICC.has(w.toLowerCase()) ? w.toLowerCase() : w.replace(/^(l'|dell'|all'|nell'|sull'|dall'|un')?(.)/i, (m, p, c) => (p ? (i ? p.toLowerCase() : cap1(p.toLowerCase())) : '') + c.toUpperCase()))).join(' ');
  const INV = new Set(['blu', 'rosa', 'viola', 'ocra', 'lilla', 'salvia', 'verdemare', 'antico', 'bordeaux']);
  function agg(a, g) { if (INV.has(a) || / /.test(a)) return a; const f = g.g === 'f', pl = g.pl; if (/o$/.test(a)) return a.slice(0, -1) + (f ? (pl ? 'e' : 'a') : pl ? 'i' : 'o'); if (/e$/.test(a)) return pl ? a.slice(0, -1) + 'i' : a; return a; }
  const stem = w => { const t = String(w).toLowerCase().split(/[\s']/).pop().normalize('NFD').replace(/[̀-ͯ]/g, ''); return t.length < 4 ? null : t.replace(/(io|ia|ie|o|a|e|i)$/, ''); };
  const VIETATE = /chiav|fic[ao]|cazz|minch|troi|pomp|scop[ao]|ficc|culo|merd|sbor|negr|frocio|puttan|zingar/;
  const ok = w => w && !VIETATE.test(String(w).toLowerCase());
  // i conii: la radice di un dettaglio con un suffisso (bidonia, sediologia, pentolismo, ciabattari, gommisti...)
  const conia = (w, st0, suf) => (/^[aeiou]/.test(suf) ? st0 + suf : suf === 'opoli' ? st0 + 'opoli' : String(w).split(' ').pop() + suf);
  const SUFF_LUOGO = ['ia', 'landia', 'opoli', 'eria', 'ano', 'ese', 'ville', 'stan'];
  const SUFF_GENTE = ['ari', 'isti', 'ini', 'oni', 'anti', 'aroli', 'ucci', 'ardi'];
  const SUFF_VERBO = ['are', 'eggiare', 'izzare', 'acchiare', 'ettare'];
  const SUFF_AGG = ['ara', 'ina', 'ese', 'ola', 'ella', 'osa', 'ona'];
  // la memoria contro la ripetizione (per tutto il paese): le radici e gli schemi presi
  const pena = (st, rad, pat) => { const U = S(st).usati; return 1 / (1 + 1.6 * (U.r[rad] || 0)) / (1 + .8 * (U.p[pat] || 0)); };
  const segna = (st, rad, pat) => { const U = S(st).usati; if (rad) U.r[rad] = (U.r[rad] || 0) + 1; if (pat) U.p[pat] = (U.p[pat] || 0) + 1; const k = Object.keys(U.r); if (k.length > 400) delete U.r[k[0]]; };
  // sceglie fra candidati [testo, radice, schema, peso]: peso × pena × un po' di caso
  function scegli(st, L, nonSegnare) {
    let best = null, bw = -1; for (const x of L) { if (!x || !x[0] || !ok(x[0])) continue; const w = (x[3] || 1) * pena(st, x[1], x[2]) * (.55 + rnd() * .9); if (w > bw) { bw = w; best = x; } }
    if (best && !nonSegnare) segna(st, best[1], best[2]); return best;
  }

  // ======================= LE RISERVE DI PAROLE (registri diversi) =======================
  const AGG = ['storto', 'ribelle', 'ostinato', 'sbilenco', 'fiero', 'sdentato', 'matto', 'notturno', 'bagnato', 'scalzo', 'stonato', 'zoppo', 'testardo', 'spettinato', 'gentile', 'affamato', 'insonne', 'abusivo',
    'clandestino', 'provvisorio', 'perpetuo', 'scassato', 'allegro', 'malinconico', 'sciancato', 'temerario', 'beato', 'riottoso', 'sgangherato', 'impunito', 'arrugginito', 'innocente', 'leggendario', 'ammaccato',
    'invincibile', 'pigro', 'nervoso', 'ubriaco', 'mezzo', 'rattoppato', 'scucito', 'santo', 'disobbediente', 'senza sella', 'di latta', 'di ferro', 'senza padrone', 'a vapore', 'di mezzanotte', 'col cappello', 'in pigiama'];
  const COLORI = UCu.COLORI = [['rosso', '#C25B36'], ['ocra', '#DC9A34'], ['blu', '#2F60B5'], ['verde', '#3F8A50'], ['rosa', '#E04B8C'], ['viola', '#6B3D9B'], ['verdemare', '#2A8A8A'], ['salvia', '#93B27C'], ['mattone', '#6F2B2E'], ['lavagna', '#3D3548']];
  const BESTIE = ['gabbiano', 'gatto', 'cane', 'piccione', 'mulo', 'gallina', 'tartaruga', 'asino', 'topo', 'geco', 'granchio', 'polpo', 'merlo', 'riccio', 'capra', 'oca', 'lucertola', 'cornacchia', 'pulce', 'lumaca'];
  const MEZZI_G = ['furgone', 'camionetta', 'campagnola', 'cellulare', 'sidecar', 'carro attrezzi', 'jeep', 'motocarro'];
  const ARNESI_G = ['taccuino', 'fischietto', 'manganello', 'timbro', 'modulo', 'bollettario', 'binocolo', 'megafono', 'berretto', 'cartellina', 'matita', 'lampeggiante'];
  const CIBI = ['fave', 'cozze', 'ceci', 'sardine', 'polenta', 'frittelle', 'lenticchie', 'peperoni', 'melanzane', 'carciofi', 'baccalà', 'castagne', 'fichi', 'ricotta', 'pane raffermo', 'acciughe', 'patate', 'cipolle', 'trippa', 'zucchine', 'cicoria', 'polpette', 'uova sode', 'pomodori secchi'];
  const BASI_P = ['la pasta', 'il sugo', 'la frittata', 'la zuppa', 'il minestrone', 'la torta', 'il pane', 'il caffè', 'la focaccia', 'il risotto', 'lo spezzatino', 'il brodo', 'la pizza', 'le frittelle', 'il pasticcio', 'la panzanella', 'il timballo'];
  const ORE_N = h => (h < 4 ? ['notte fonda', 'tre di notte', 'buio pesto'] : h < 7 ? ['alba', 'primo gallo', 'cinque e mezza'] : h < 11 ? ['caffè delle nove', 'mattina presto'] : h < 15 ? ['mezzogiorno', 'controra', 'ora di pranzo'] : h < 19 ? ['cinque', 'pomeriggio lungo'] : h < 22 ? ['tramonto', 'ora di cena', 'imbrunire'] : ['mezzanotte', 'ultimo tram', 'ore piccole']);
  // il dettaglio che diventa un pezzo del presidio, con le sue varianti di popolo
  const PEZZI_W = { fusto: ['bidone', 'fusto', 'latta'], porta: ['porta', 'portone', 'anta'], sedia: ['sedia', 'seggiola', 'sdraio'], pneumatico: ['copertone', 'gomma', 'ruota'], tavolo: ['tavolino', 'tavolo'], cassa: ['cassetta', 'cassa'], bancale: ['bancale', 'pedana'], lamiera: ['lamiera', 'latta'], vaso: [] };

  // ======================= IL CALENDARIO (la data finta del paese, dal seme) =======================
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const NUMN = ['', 'Uno', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Otto', 'Nove', 'Dieci', 'Undici', 'Dodici', 'Tredici', 'Quattordici', 'Quindici', 'Sedici', 'Diciassette', 'Diciotto', 'Diciannove', 'Venti', 'Ventuno', 'Ventidue', 'Ventitré', 'Ventiquattro', 'Venticinque', 'Ventisei', 'Ventisette', 'Ventotto', 'Ventinove', 'Trenta'];
  function data(st, t) {
    const h = hashS(st.u.seme + '|cal'), m0 = Math.floor(h * 12) % 12, d0 = 1 + Math.floor(hashS(st.u.seme + '|cal2') * 24);
    const k = d0 - 1 + Math.floor(t / 1440), m = (m0 + Math.floor(k / 30)) % 12, d = (k % 30) + 1;
    return { d, m: MESI[m], s: `${d} ${MESI[m]}`, N: `${NUMN[d]} ${cap1(MESI[m])}` };
  }
  const giornoN = t => (G.dayName ? G.dayName(t) : '') || 'un giorno';

  // ======================= I DISEGNI CHE CI SONO (per il simbolo; il resto è la lettera iniziale) =======================
  const DISEGNI = [[/bidon|fust|latta|barattol/, 'bidone'], [/porta|anta|portone|uscio/, 'porta'], [/sedi|seggiol|sdraio|sgabell|panca/, 'sedia'], [/ruot|gomm|copert|pneumat|bici/, 'ruota'], [/tavol/, 'tavolo'],
    [/geran|basilic|fior|rosa|limon|pianta|vaso/, 'fiore'], [/pentol|padell|tegam|sugo|pasta|zupp|brodo|minestr/, 'pentola'], [/pesc|tonn|sard|polp|orat|spigol|cozz|acciug|baccal/, 'pesce'], [/chiave/, 'chiave'],
    [/tambur|grancass/, 'tamburo'], [/furgon|camion|jeep|campagnol|cellular|motocarr/, 'furgone'], [/verbal|modul|fogli|bollett|timbr|cartell|taccuin|giornal|lettera/, 'foglio'], [/ancor|barca|nave|rete|cima/, 'ancora'],
    [/sole|alba|mezzogiorno|controra/, 'sole'], [/luna|notte|mezzanotte|buio|imbrunire/, 'luna'], [/lamier/, 'lamiera'], [/cass/, 'cassa']];
  const disegnoDi = w => { const s = String(w || '').toLowerCase(); for (const [re, d] of DISEGNI) if (re.test(s)) return d; return null; };
  // le cose che si costruiscono (per la forma): il dettaglio → il pezzo di UnicoParti
  const PEZZO_DI = w => { const s = String(w || '').toLowerCase(); for (const k in PEZZI_W) if (PEZZI_W[k].includes(s) || (k === 'vaso' && /geran|basilic|limon/.test(s))) return k; return /bidon|fust/.test(s) ? 'fusto' : null; };

  // ======================= I DETTAGLI (dai fatti veri) =======================
  // un dettaglio: [parola, fonte, peso, fid]. Fonti: cosa, pezzo, pianta, ono (l'onomatopea), luogo, via, ora, mezzo e arnese (dei Grigi),
  // persona, mestiere, cibo, bestia, idea (il soggetto dell'idea del gruppo)
  const robaN = k => { try { const R = typeof Roba !== 'undefined' && Roba.ON ? Roba : null, e = R ? R.di(k) : null; return String(e ? e.corto || e.nome : String(k || '').replace(/_/g, ' ')).toLowerCase().replace(/\s*\(.*\)$/, ''); } catch (e) { return String(k || ''); } };
  const PEZZI_DET = new Set(['nascita', 'festa', 'resiste']);
  function dettagliDi(st, f, tema) {
    const out = [], x = f.x || {}, sm = st.u.seme + '|', h = hashS(sm + f.id + '|' + f.v), add = (w, src, p) => { if (w && ok(w) && w.length < 26) out.push([String(w).toLowerCase(), src, p, f.id]); };
    if (f.cosa || x.cosa) { const w = robaN(f.cosa || x.cosa); if (w.split(' ').length <= 2 && !/dell'|direttor|signor/.test(w)) add(w, 'cosa', 1.2); }
    if (x.ono && !/^(a+h+|e+h+|o+h+|ah|ahah|ehm)+$/i.test(String(x.ono).replace(/[!.\s]/g, ''))) add(String(x.ono).toLowerCase().replace(/[!.]/g, ''), 'ono', .9);
    if (f.dove && f.dove[2] && placeN(f.dove[2])) add(placeN(f.dove[2]), 'luogo', .6);
    if (x.via) add(x.via, 'via', .55);
    if (x.mestiere) add(String(x.mestiere).split(' ')[0], 'mestiere', .7);
    add(hpick(ORE_N((f.t % 1440) / 60), sm + f.id), 'ora', .45);
    if (/^(multa|fermato|repressione|sgombero|presidio_grigi|presidio_ordine|controllo)$/.test(f.v)) { add(hpick(MEZZI_G, sm + f.id + 'm'), 'mezzo', .75); add(hpick(ARNESI_G, sm + f.id + 'a'), 'arnese', .8); }
    if (/festa|cucina|tavolata|presidio_cresce/.test(f.v)) add(hpick(CIBI, sm + f.id + 'c'), 'cibo', .7);
    if (h < .35 || tema === 'comica') add(hpick(BESTIE, sm + f.id + 'b'), 'bestia', .5);
    { const pc = f.v === 'repressione' ? io(f.con && f.con[0]) : io(f.chi), np = vivo(st, pc); if (np && !np.grigio && !np.cop && !np.guard) add(nome(st, pc), 'persona', .65); }
    // il presidio: i pezzi portati, con le loro varianti (il fusto è un bidone o una latta), la pianta del vaso
    const C = x.cantiere && cantiere(st, x.cantiere);
    if (C && PEZZI_DET.has(tema)) for (let i = 0; i < C.piano.length; i++) { const k = C.piano[i][0], V = PEZZI_W[k]; if (V && V.length && hashS(C.id + i) < .5) add(hpick(V, C.id + i), 'pezzo', 1); if (k === 'vaso') add(hpick(['geranio', 'basilico', 'limone'], C.id + ':' + i), 'pianta', .9); }
    return out;
  }
  // il fondo di una comunità senza episodi ancora: il soggetto dell'idea, i mestieri dei membri, il quartiere
  function fondoDet(st, c) {
    const g = gruppoCom(st, c); if (!g) return;
    const s = g.s || '', add = (w, src, p) => { if (w && ok(w) && !c.det.some(d => d[0] === w)) c.det.push([String(w).toLowerCase(), src, p, null]); };
    if (s.slice(0, 2) === 'a:' || s === 'mare') add(I.nomeS(st, s).replace(/^(il|la|lo|i|gli|le|l')\s?/i, ''), 'idea', .9);
    if (s.slice(0, 2) === 'l:') add(placeN(s.slice(2)), 'luogo', .7);
    const sm = st.u.seme + '|'; if (s === 'grigi') add(hpick(ARNESI_G, sm + g.id), 'arnese', .7);
    for (const id of g.membri.slice(0, 5)) { const n = npc(st, id), j = n && n.pop && n.pop.job && (n.pop.job.base || n.pop.job.title); if (j) add(String(j).toLowerCase().split(' ')[0], 'mestiere', .55); }
    add(hpick(BESTIE, sm + g.id + c.k), 'bestia', .35); add(hpick(CIBI, sm + g.id), 'cibo', .3);
  }
  // il dettaglio buono per un uso: il più raro in paese fra quelli delle fonti chieste
  function dettaglio(st, c, fonti, salta) {
    const L = c.det.filter(d => (!fonti || fonti.includes(d[1])) && (!salta || !salta.includes(d[0]))); if (!L.length) return null;
    let best = null, bw = -1; for (const d of L) { const w = d[2] * pena(st, stem(d[0]) || d[0], null) * (.6 + rnd() * .8); if (w > bw) { bw = w; best = d; } }
    return best;
  }
  const NOMINALI = ['cosa', 'pezzo', 'pianta', 'mezzo', 'arnese', 'cibo', 'bestia', 'idea', 'mestiere'];

  // ======================= LE COMUNITÀ =======================
  const cantiere = (st, cid) => { const s = st.u && st.u.costruire; return s && cid ? s.cantieri.find(C => C.id === cid) || null : null; };
  function comPerCantiere(st, C) {
    if (!C) return null; const s = S(st); if (s.com['c:' + C.id]) return s.com['c:' + C.id];
    const Gr = GR(); if (Gr && C.gruppo) for (const id of C.gruppo) { const g = Gr.gruppoDi(st, id); if (g && s.com['g:' + g.id]) return s.com['g:' + g.id]; }
    return null;
  }
  function nuovaCom(st, k, o) {
    const s = S(st); if (s.com[k]) return s.com[k];
    const usati = Object.values(s.com).map(c => c.col), libC = COLORI.filter(x => !usati.includes(x[0]));
    const c = s.com[k] = Object.assign({ k, nome: null, nomi: [], t0: Math.round(st.t), ep: [], det: [], ogg: null, col: pick(libC.length ? libC : COLORI)[0], sim: null, motto: null, saluto: null, segno: null, moda: null,
      piatto: null, canto: null, santo: null, pref: null, arr: [], riti: { tav: -1, ann: 0, min: [] }, attesa: null, rivali: [], fama: 0 }, o || {});
    if (k[0] === 'g') fondoDet(st, c);
    return c;
  }
  const gruppoCom = (st, c) => { const Gr = GR(); return c.k[0] === 'g' && Gr ? Gr.gDi(st, c.k.slice(2)) : null; };
  const presidioCom = (st, c) => (c.k[0] === 'c' ? cantiere(st, c.k.slice(2)) : null);
  function membri(st, c) {
    if (c.k[0] === 'g') { const g = gruppoCom(st, c); return g && !g.sciolto ? g.membri.slice() : []; }
    if (c.k[0] === 'm') return [];
    const C = presidioCom(st, c); if (!C) return []; const L = C.gruppo.slice(); for (const id in C.vive || {}) if (!L.includes(id)) L.push(id); return L;
  }
  function vicinoA(n) { let b = null, bd = 3600; for (const k in G.PLACES || {}) { const P = G.PLACES[k]; const d = (P.x - n.x) ** 2 + (P.y - n.y) ** 2; if (d < bd) { bd = d; b = k; } } return b; }
  function baseDi(st, c) {
    const C = presidioCom(st, c); if (C) return { x: C.x, y: C.y, via: C.via, C };
    const g = gruppoCom(st, c); if (g && g.base) { const B = cantiere(st, g.base.c); if (B && !B.chiuso) return { x: B.x, y: B.y, via: B.via, C: B }; }
    const n = g && vivo(st, g.capo); return n ? { x: n.x, y: n.y, via: placeN(vicinoA(n)) || '', C: null } : null;
  }
  const inVia = v => (/^(via|vico|vicolo|piazza|piazzetta|calata|salita|largo|corso|riva|strada|viale)\b/i.test(v) ? 'in ' + v : artW(v, 'in'));
  const viaDi = (st, c) => { const B = baseDi(st, c); return (B && B.via) || ''; };
  const capoDi = (st, c) => { const g = gruppoCom(st, c); if (g) return g.capo; const C = presidioCom(st, c); return C ? C.gruppo[0] : null; };
  function aggiungiEp(st, c, f, peso, tema) {
    if (c.ep.some(e => e[0] === f.id)) return;
    c.ep.push([f.id, f.v, Math.round(f.t), r2(peso), tema, f.chi || null]);
    c.ep.sort((a, b) => b[3] - a[3] || b[2] - a[2]); if (c.ep.length > 8) c.ep.length = 8; c.fama = r2(c.fama + peso);
    for (const d of dettagliDi(st, f, tema)) if (!c.det.some(e => e[0] === d[0]) && c.det.filter(e => e[1] === d[1]).length < (d[1] === 'persona' || d[1] === 'luogo' ? 3 : 2)) { d[2] = r2(d[2] * (.6 + peso * .5)); c.det.push(d); }
    c.det.sort((a, b) => b[2] - a[2]); if (c.det.length > CFG.det) c.det.length = CFG.det;
  }
  const haTema = (c, t) => c.ep.some(e => e[4] === t);
  // l'oggetto della comunità (il simbolo, le parole): il dettaglio nominale più raro della sua storia
  const OGGETTI = ['cosa', 'pezzo', 'pianta', 'arnese', 'mezzo', 'cibo', 'bestia', 'idea'];
  function oggDi(st, c) {
    if (c.ogg) return c.ogg; let d = null, bw = -1;
    for (const x of c.det) { if (!OGGETTI.includes(x[1])) continue; const p = pena(st, stem(x[0]) || x[0], null), w = x[2] * (x[1] === 'arnese' || x[1] === 'mezzo' ? .55 : 1) * p * p * (.6 + rnd() * .8); if (w > bw) { bw = w; d = x; } } if (!d) return null; c.ogg = d[0]; c.pa = PEZZO_DI(d[0]); segna(st, stem(d[0]), null); return c.ogg; }

  // ======================= I NOMI (la grammatica: molti schemi, molti registri) =======================
  // ogni schema: [id, registro, fonti del dettaglio (null: nessuno), (X, ctx) → nome]. X = { w, W (Maiuscolo), det, di, g, s (radice) }
  const X_ = w => { const g = gen(w); return { w, g, W: tc(w), det: tc(artW(w, 'det', g)), di: tc(artW(w, 'di', g)).replace(/^D/, 'd'), s: stem(w) }; };
  const SCHEMI = UCu.SCHEMI = [
    ['ogg_agg', 'oggetto', NOMINALI, (X, k) => `${X.det} ${tc(agg(k.agg, X.g))}`],
    ['ogg_col', 'oggetto', NOMINALI, (X, k) => `${X.det} ${tc(agg(k.col, X.g))}`],
    ['repubblica', 'oggetto', NOMINALI, X => `Repubblica ${X.di}`], ['comune', 'oggetto', NOMINALI, X => `La Comune ${X.di}`], ['quelli', 'oggetto', NOMINALI, X => `Quelli ${X.di}`],
    ['conio_luogo', 'conio', NOMINALI, (X, k) => (X.s ? tc(conia(X.w, X.s, k.suf)) : null)], ['conio_gente', 'conio', NOMINALI, (X, k) => (X.s ? `I ${tc(X.s + k.sufG)}` : null)],
    ['data', 'data', null, (X, k) => `Zona ${k.data}`], ['comitato_data', 'data', null, (X, k) => `Comitato ${k.data}`], ['movimento_data', 'data', null, (X, k) => `Movimento ${/^(8|11) /.test(k.dd) ? "dell'" : 'del '}${k.dd}`],
    ['villa', 'persona', ['persona'], X => `Villa ${X.W}`], ['conio_persona', 'persona', ['persona'], (X, k) => tc(conia(X.w, X.w.replace(/[aeiou]$/i, ''), k.suf))], ['casa_p', 'persona', ['persona'], X => `Casa ${X.W}`],
    ['ragazzi_di', 'persona', ['persona'], X => `I Ragazzi di ${X.W}`], ['fan_club', 'persona', ['persona'], X => `Fan Club ${X.W}`], ['banda_p', 'persona', ['persona'], X => `La Banda di ${X.W}`],
    ['stato_ironico', 'nobiliare', null, (X, k) => `${k.stato} ${k.postoIr}`], ['principato', 'nobiliare', NOMINALI, X => `Principato ${X.di}`], ['granducato', 'nobiliare', ['luogo', 'via'], X => `Gran Ducato ${X.di}`],
    ['comune_luogo', 'luogo', ['luogo', 'via'], X => `La Comune ${X.di}`], ['libera_luogo', 'luogo', ['luogo', 'via'], X => `Libera Repubblica ${X.di}`], ['figli_luogo', 'luogo', ['luogo', 'via'], X => `I Figli ${X.di}`],
    ['ufficio', 'burocratico', NOMINALI, X => `Ufficio Reclami ${X.di}`], ['commissione', 'burocratico', NOMINALI, X => `Commissione Permanente ${X.di}`], ['sportello', 'burocratico', NOMINALI, X => `Sportello Popolare ${X.di}`],
    ['sezione', 'burocratico', ['luogo', 'via'], X => `Sezione Distaccata ${X.di}`], ['provvisorio', 'burocratico', null, () => 'Comitato Provvisorio Permanente'], ['protocollo', 'burocratico', ['arnese', 'mezzo'], X => `Protocollo ${X.W}`],
    ['confraternita', 'chiesa', NOMINALI, X => `Confraternita ${X.di}`], ['pia_unione', 'chiesa', NOMINALI, X => `Pia Unione ${X.di} ${tc(agg('benedetto', X.g))}`], ['congrega', 'chiesa', ['persona'], X => `Congrega di ${donna0(X) ? 'Santa' : 'San'} ${X.W}`],
    ['parrocchia', 'chiesa', ['luogo', 'via'], X => `Parrocchia Abusiva ${X.di}`],
    ['ciurma', 'mare', NOMINALI, X => `La Ciurma ${X.di}`], ['equipaggio', 'mare', ['luogo', 'via', 'ora'], X => `Equipaggio ${X.di}`], ['capitaneria', 'mare', ['luogo', 'via'], X => `Capitaneria Popolare ${X.di}`],
    ['armata', 'mare', NOMINALI, X => `L'Armata ${X.di}`],
    ['pirati', 'bambini', NOMINALI, X => `I Pirati ${X.di}`], ['club_segreto', 'bambini', NOMINALI, X => `Il Club Segreto ${X.di}`], ['cavalieri', 'bambini', NOMINALI, X => `I Cavalieri ${X.di}`],
    ['chiddi', 'dialetto', NOMINALI, X => (/^[aeiou]/i.test(X.w) ? `Chiddi dell'${X.W}` : `Chiddi d'${X.g.g === 'f' ? 'a' : 'u'} ${X.W}`)], ['guagliuni', 'dialetto', ['luogo', 'via', 'cosa', 'pezzo'], X => `'E Guagliune ${X.di}`],
    ['combriccola', 'dialetto', NOMINALI, X => `La Combriccola ${X.di}`], ['masnada', 'dialetto', NOMINALI, X => `La Masnada ${X.di}`],
    ['polisportiva', 'sport', NOMINALI, X => `Polisportiva ${X.W}`], ['atletico', 'sport', ['luogo', 'via', 'cosa', 'pezzo'], X => `Atletico ${X.W}`], ['sporting', 'sport', NOMINALI, X => `Sporting ${X.W} ${1946 + Math.floor(hashS(X.w) * 60)}`],
    ['cooperativa', 'coop', NOMINALI, X => `Cooperativa ${X.det} ${tc(agg('unito', X.g))}`], ['mutuo', 'coop', NOMINALI, X => `Società di Mutuo Soccorso ${X.di}`],
    ['accademia', 'accademia', NOMINALI, X => `Accademia ${X.di}`], ['universita', 'accademia', ['luogo', 'via'], X => `Università Popolare ${X.di}`],
    ['brigata', 'militare', ['persona', 'ora'], X => `Brigata ${X.W}`], ['legione', 'militare', NOMINALI, X => `La Legione ${X.di}`], ['fronte', 'militare', NOMINALI, X => `Fronte di Liberazione ${X.di}`],
    ['ono', 'onomatopea', ['ono'], X => `Comitato ${tc(X.w)}`], ['ono_club', 'onomatopea', ['ono'], X => `I ${tc(X.w)}`],
    ['ora', 'ora', ['ora'], X => `Quelli ${X.di}`], ['ora_brig', 'ora', ['ora'], X => `I Compagni ${X.di}`],
    // l'ironia sugli episodi veri
    ['iro_multa', 'ironia', null, (X, k) => (k.temi.multa ? hpick(['Comitato Multe Pagate', 'Club del Verbale', 'Amici del Bollettino', 'Associazione Contribuenti Spontanei', 'Circolo Ricevuta Gialla', 'I Benefattori dello Stato', 'Sindacato dei Multati'], k.seme) : null)],
    ['iro_sgombero', 'ironia', null, (X, k) => (k.temi.sgombero ? hpick(['Hotel Sgombero', 'Residence Ultimo Avviso', 'Pensione Furgone', 'Albergo Diffuso del Marciapiede', 'Villaggio Vacanze Sfratto', 'Grand Hotel Trasloco'], k.seme) : null)],
    ['iro_grigi', 'ironia', null, (X, k) => (k.temi.grigi ? hpick(['Osservati Speciali', 'Sorvegliati Speciali', 'Schedati Felici', 'Fan Club del Binocolo', 'Gli Interessanti'], k.seme) : null)],
    ['iro_resiste', 'ironia', null, (X, k) => (k.temi.resiste ? hpick(['Quelli che Non se ne Vanno', 'Gli Inamovibili', 'I Radicati', 'Comitato Qui Restiamo', 'Gli Abbarbicati', 'Le Cozze sullo Scoglio'], k.seme) : null)],
    ['iro_comica', 'ironia', null, (X, k) => (k.temi.comica ? hpick(['Società dei Capitomboli', 'Gli Scivolati', 'Club del Patatrac', 'Accademia del Ruzzolone', 'I Gambe all\'Aria', 'Lega del Salame'], k.seme) : null)],
    ['iro_martire', 'martire', ['persona'], (X, k) => (k.martire ? `Comitato Libera${k.martireF ? '' : 'te'} ${k.martire}` : null)],
    ['iro_martire2', 'martire', null, (X, k) => (k.martire ? `Brigata ${k.martire} ${k.martireF ? 'Libera' : 'Libero'}` : null)],
  ];
  const donna0 = X => X.g.g === 'f';
  const POSTI_IR = ['Sotto il Balcone', 'del Marciapiede', 'dei Gradini', 'del Lampione', 'della Fontanella', 'Sotto i Panni Stesi', 'del Parcheggio', 'della Panchina Rotta', 'del Terzo Piano', 'dietro la Chiesa', 'del Portone Accanto', 'della Scala B'];
  const STATI = ['Libero Stato', 'Principato', 'Gran Ducato', 'Repubblica Autonoma', 'Libera Repubblica', 'Contea', 'Marchesato', 'Emirato', 'Serenissima Repubblica', 'Regno Provvisorio'];
  const REGISTRI_COM = { g: null, c: null };
  function candidati(st, c, motivo) {
    const out = [], temi = {}; for (const e of c.ep) temi[e[4]] = 1; if (motivo) temi[motivo] = 1;
    const mart = c.arr.length ? c.arr[c.arr.length - 1] : null, d = data(st, c.t0);
    const k = { agg: pick(AGG), col: c.col, suf: pick(SUFF_LUOGO), sufG: pick(SUFF_GENTE), data: d.N, dd: `${d.d} ${d.m}`, stato: pick(STATI), postoIr: pick(POSTI_IR), temi, seme: c.k + st.u.seme + c.nomi.length,
      martire: mart ? nome(st, mart) : null, martireF: mart ? donna(st, mart) : false };
    const sch = SCHEMI.slice().sort(() => rnd() - .5).slice(0, 26);   // ogni cerimonia guarda una parte degli schemi: niente sempre gli stessi
    if (temi.multa || temi.sgombero || temi.resiste || temi.grigi || temi.comica || mart) for (const s of SCHEMI) if (/^iro_/.test(s[0]) && !sch.includes(s)) sch.push(s);
    for (const [id, reg, fonti, fn] of sch) {
      let X = null, rad = reg;
      if (fonti) { const dd = dettaglio(st, c, fonti); if (!dd) continue; X = X_(dd[0]); rad = stem(dd[0]) || dd[0]; if (fonti === NOMINALI && dd[1] === 'persona') continue; }
      let nm = null; try { nm = fn(X, k); } catch (e) { nm = null; } if (!nm || nm.length > 34 || /undefined|null/.test(nm)) continue;
      nm = nm.replace(/\s+/g, ' ').trim();
      const w = (/^iro_|martire/.test(id) ? 1.25 : 1) * (motivo === 'resiste' && id === 'iro_resiste' ? 1.6 : 1) * (motivo === 'sgombero' && id === 'iro_sgombero' ? 1.6 : 1) * (reg === 'data' && !temi.nascita ? .6 : 1);
      if (!out.some(x => x[0] === nm) && !Object.values(S(st).com).some(o => o.nome === nm)) out.push([nm, rad, id, w, reg]);
    }
    // il peso finale: la memoria contro la ripetizione (radice e schema) e la rarità
    return out.map(x => [x[0], x[1], x[2], r2(x[3] * pena(st, x[1], x[2]) * pena(st, null, x[4]) * (.6 + rnd() * .8)), x[4]]).sort((a, b) => b[3] - a[3]);
  }
  const striscione = nm => { let s = nm.toUpperCase(); if (s.length > 22) s = s.replace(/^(IL|LA|LO|L'|I|GLI|LE)\s/, ''); return s; };

  // ======================= IL SIMBOLO (dati) =======================
  const FORME = ['cerchio', 'scudo', 'stella', 'rombo', 'sole', 'quadro'];
  function simbolo(st, c, base) {
    const o = oggDi(st, c) || (c.det[0] && c.det[0][0]) || (c.nome || 'x'), col = COLORI.find(x => x[0] === c.col) || COLORI[0], segno = pick(COLORI.filter(x => x[0] !== col[0]));
    const f = scegli(st, FORME.map(fm => [fm, null, 'forma:' + fm, haTema(c, 'resiste') && fm === 'stella' || haTema(c, 'mare') && fm === 'cerchio' || haTema(c, 'prodigio') && fm === 'sole' ? 2 : 1]))[0];
    const s = { f, o, d: disegnoDi(o) || 'lettera', l: String(o).replace(/^(il|la|lo|i|gli|le|l')\s?/i, '')[0].toUpperCase(), c: [col[1], segno[1]],
      x: haTema(c, 'martire') ? 'lumino' : haTema(c, 'multa') ? 'timbro' : haTema(c, 'festa') ? 'stelle' : hpick(['', 'stelle', 'onde', 'raggi'], c.k + st.u.seme) };
    if (base) { s.c = [base.c[1], base.c[0]]; s.f = base.f === 'stella' ? 'scudo' : 'stella'; s.o = base.o; s.d = base.d; s.l = base.l; s.x = 'crepa'; }
    return s;
  }

  // ======================= LE PAROLE (il gergo, da molti schemi) =======================
  const SENSO = { impresa: 'una cosa fatta come si deve', resistere: 'resistere, non mollare', comica: 'cadere come un salame', grigi: 'i Grigi', tradire: 'tradire', festa: 'una festa come si deve', mangiare: 'mangiare tutti insieme', scappare: 'squagliarsela', martire: 'farsi portare via' };
  const GRIGI_P = ['i Topi', 'i Cenere', 'i Piccioni', 'i Grigiolini', 'le Cornacchie', 'i Lampioni', 'i Muri', 'le Ombre', 'i Polverosi', 'i Topastri', 'gli Scatoloni', 'i Fumo', 'le Formiche', 'i Ragionieri', 'i Bacarozzi', 'le Lavagne', 'i Sorci', 'i Grigioverdi', 'le Talpe', 'gli Uscieri'];
  function schemiParola(st, c, f, tema) {
    const L = [], X0 = dettaglio(st, c, ['cosa', 'pezzo', 'pianta', 'cibo', 'bestia', 'idea']), X = X0 ? X_(X0[0]) : null, add = (w, rad, pat, senso, k, p) => L.push([w, rad, pat, p || 1, senso, k]);
    if (tema === 'impresa' && X) { if (X.s && ok(X.s)) add(X.s + 'ata', X.s, 'imp_ata', SENSO.impresa, 'verbo', 1.1); add(`fare il colpo ${artW(X.w, 'di', X.g)}`, X.s, 'imp_colpo', SENSO.impresa, 'verbo'); add(X.s ? `alla ${X.s + pick(SUFF_AGG)}` : artW(X.w, 'a', X.g), X.s, 'imp_alla', SENSO.impresa, 'verbo', .9); }
    if (tema === 'resiste' || (tema === 'impresa' && !X)) {
      if (X) { add(`fare ${artW(X.w, 'det', X.g)}`, X.s, 'fare_il', SENSO.resistere, 'verbo'); add(`stare come ${artW(X.w, 'ind', X.g)}`, X.s, 'stare_come', SENSO.resistere, 'verbo'); add(`tenere ${artW(X.w, 'det', X.g)}`, X.s, 'tenere', SENSO.resistere, 'verbo');
        if (X.s && ok(X.s)) { add(X.s + pick(SUFF_VERBO), X.s, 'conio_verbo', SENSO.resistere, 'verbo'); add((/^[bpm]/.test(X.s) ? 'im' : /^l/.test(X.s) ? 'il' : /^r/.test(X.s) ? 'ir' : 'in') + X.s + 'arsi', X.s, 'im_arsi', SENSO.resistere, 'verbo'); } }
      add(`fare ${hpick(['le radici', 'il chiodo', 'la cozza', 'il paracarro', 'lo scoglio', 'la colla', 'il mulo'], f.id)}`, 'res' + f.id % 7, 'fare_cosa_res', SENSO.resistere, 'verbo', .8);
    }
    if (tema === 'multa' || tema === 'grigi' || tema === 'martire' || tema === 'sgombero') {
      const ar = c.det.filter(d => d[1] === 'arnese' || d[1] === 'mezzo'); for (const d of ar.slice(0, 3)) { const s0 = stem(d[0]); if (s0) { add(artW(tc(s0 + 'ini'), 'det', { g: 'm', pl: true }), s0, 'grigi_dim', SENSO.grigi, 'grigi', 1.3); add(`quelli ${artW(d[0], 'di')}`, s0, 'grigi_quelli', SENSO.grigi, 'grigi', 1.1); } }
      add(pick(GRIGI_P), 'grigi' + Math.floor(rnd() * 20), 'grigi_pool', SENSO.grigi, 'grigi', .7);
      if (tema === 'martire') add(`andare ${hpick(['in villeggiatura', 'a fare la cura', 'dal parrucchiere', 'in collegio', 'al mare d\'inverno'], f.id)}`, 'mart' + f.id % 5, 'eufem_popolo', SENSO.martire, 'verbo', 1);
    }
    if (tema === 'comica' && f.chi && vivo(st, io(f.chi))) { const n = nome(st, io(f.chi)), dn = donna(st, io(f.chi)); add(`fare ${dn ? (/^[aeiou]/i.test(n) ? "un'" : 'una ') : 'un '}${n}`, n, 'anton_un', SENSO.comica, 'anton'); add(`fare la fine di ${n}`, n, 'anton_fine', SENSO.comica, 'anton'); add(`cadere alla ${n}`, n, 'anton_alla', SENSO.comica, 'anton');
      const o = (f.x && f.x.ono) ? String(f.x.ono).toLowerCase().replace(/[!.]/g, '') : null; if (o) add(`fare ${o}`, o, 'ono_verbo', SENSO.comica, 'verbo', 1.2); }
    if (tema === 'festa') { if (X && X.s && ok(X.s)) add(X.s + 'ata', X.s, 'conio_ata', SENSO.festa, 'verbo'); const ci = c.det.find(d => d[1] === 'cibo'); if (ci) add(`fare ${ci[0]}`, stem(ci[0]), 'fare_cibo', SENSO.mangiare, 'verbo'); add(`fare ${hpick(['baldoria', 'casciara', 'tarantella', 'tombola'], f.id)}`, 'festa' + f.id % 4, 'festa_pool', SENSO.festa, 'verbo', .7); }
    if (tema === 'scissione') add(`fare ${hpick(['il gambero', 'la scissione dell\'atomo', 'il divorzio', 'la frittata'], f.id)}`, 'sciss' + f.id % 4, 'sciss_pool', SENSO.tradire, 'verbo', .8);
    return L;
  }
  function nuovaParola(st, w, senso, k, c, f, chi, rad, pat) {
    const s = S(st); if (!w || !ok(w)) return null;
    for (const id in s.par) if (s.par[id].w === w) return null;
    if (Object.keys(s.par).length >= 90) return null;
    const id = 'w' + (++s.n), P = s.par[id] = { id, w, s: senso, k, com: c ? c.k : null, fid: f ? f.id : null, t0: Math.round(st.t), tu: Math.round(st.t), usi: 0, pa: null };
    stats.parole++; if (rad || pat) segna(st, rad, pat);
    const L = (chi || []).concat(c ? membri(st, c).slice(0, 8) : []); for (const a of L) impara(st, a, id, .7);
    const fx = scrivi(st, 'parola_nuova', (chi && chi[0]) || (L[0]) || null, { d: k === 'grigi' ? `${c && c.nome ? c.nome + ': ' : ''}da oggi i Grigi si chiamano «${w}»` : `${c && c.nome ? c.nome + ': ' : ''}è nato un modo di dire, «${w}» (${senso})`, parola: id, gruppo: c && c.k[0] === 'g' ? c.k.slice(2) : undefined, x: f && f.dove ? f.dove[0] : undefined, y: f && f.dove ? f.dove[1] : undefined }, f ? f.id : null);
    if (fx) P.fn = fx.id;
    return P;
  }
  function impara(st, id, wid, forza) {
    if (!id || id === 'nino' || !vivo(st, id)) return false; const s = S(st), L = s.sa[id] || (s.sa[id] = []);
    const e = L.find(x => x[0] === wid); if (e) { e[1] = r2(Math.min(1, e[1] + forza * .5)); return false; }
    if (L.length >= CFG.parolePer) { let j = 0; for (let i = 1; i < L.length; i++) if (L[i][1] < L[j][1]) j = i; if (L[j][1] >= forza) return false; L.splice(j, 1); }
    L.push([wid, r2(forza)]); return true;
  }
  const sa = (st, id) => (S(st).sa[id] || []).map(e => S(st).par[e[0]]).filter(Boolean);
  const usa = (st, P) => { P.usi++; P.tu = Math.round(st.t); };
  function coniaDa(st, c, f, tema) {
    const chi = [io(f.chi)].concat((f.con || []).map(io)).filter(Boolean), L = schemiParola(st, c, f, tema); if (!L.length) return null;
    const b = scegli(st, L, true); if (!b) return null; return nuovaParola(st, b[0], b[4], b[5], c, f, chi, b[1], b[2]);
  }
  function traditore(st, c, id, f) {
    if (!vivo(st, id)) return null; const n = nome(st, id), dn = donna(st, id);
    const b = scegli(st, [[`fare ${dn ? 'la' : 'il'} ${n}`, n, 'trad_fare', 1], [`essere ${dn ? 'una' : 'un'} ${n}`, n, 'trad_essere', 1], [stem(n) && ok(stem(n)) ? stem(n) + 'eggiare' : null, n, 'trad_conio', .9], [`girarsi alla ${n}`, n, 'trad_girarsi', .8]], true);
    return b ? nuovaParola(st, b[0], SENSO.tradire, 'anton', c, f, membri(st, c), b[1], b[2]) : null;
  }
  function storpia(w) {
    const m = /^fare (il|la|lo|l'|un|una) ?(\w+)$/.exec(w); if (m && m[2].length > 4) return m[2].slice(0, 4) + 'o';
    if (/are$/.test(w)) return w.replace(/are$/, 'à');
    if (/^(i|le|gli) \w{6,}$/.test(w)) return w.replace(/^(i|le|gli) (\w+)$/, (x, a, r) => a + ' ' + r.slice(0, 4) + (a === 'le' ? 'e' : 'i'));
    return null;
  }

  // ======================= LE FRASI DELLA COMUNITÀ: motto, saluto, segno della mano, moda, piatto, santo =======================
  const RIMA = UCu.RIMA = {
    one: ['si canta una canzone', 'non c\'è nessun padrone', 'si accende il lampione', 'giù dal balcone', 'fino alla stazione', 'con tutta la ragione', 'e chi ha paura è un fifone', 'col vino del bottiglione'],
    orta: ['davanti alla porta', 'la paura è morta', 'e il Grigio non ci importa', 'la strada è corta'], edia: ['ognuno la sua sedia', 'e non è una tragedia', 'finisce in commedia'],
    ore: ['con tutto il cuore', 'senza nessun signore', 'facciamo più rumore', 'a tutte le ore', 'il nostro colore', 'e il Grigio fa il pittore'],
    ia: ['e così sia', 'per la nostra via', 'in allegria', 'pure la zia', 'senza polizia', 'con la fisarmonica di Lucia'],
    ino: ['con un bicchiere di vino', 'fino al mattino', 'col nostro vicino', 'è il nostro destino', 'col gatto e col canarino'],
    are: ['non ci fanno spostare', 'si torna a cantare', 'vicino al mare', 'chi ha fame può mangiare', 'la nonna sa ballare'],
    ato: ['nessuno è scappato', 'e nessuno ha pagato', 'il Grigio se n\'è andato', 'il furgone è tornato', 'il sugo è bruciato'],
    azza: ['in mezzo alla piazza', 'la gente è pazza', 'si beve una tazza'], ale: ['e strappa il verbale', 'non ci fa male', 'più forte del maestrale', 'e il Garante sta male'],
    uro: ['contro il muro', 'col pane duro', 'qui si sta al sicuro'], esce: ['e il mare cresce', 'chi ha fame esce', 'e nessuno ci riesce'],
    ella: ['con la padella', 'sotto la stella', 'la vita è bella', 'e suona la campanella'], etto: ['col fiasco sul muretto', 'nessuno va a letto', 'il Grigio fa il broncetto'],
    ana: ['suona la campana', 'fino a domenica e settimana', 'la luna è lontana'], ente: ['e non ci fanno niente', 'lo sa tutta la gente', 'il Grigio non sente'],
  };
  const RIME_CHIAVI = Object.keys(RIMA);
  const rimaDi = w => { const s = String(w || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); for (const k of RIME_CHIAVI) if (s.endsWith(k)) return k; return null; };
  const ATTACCHI = UCu.ATTACCHI = {
    resiste: ['Son venuti col {M}', 'Ci volevano sgomberare', 'Il Grigio passa e prende appunti', 'Han suonato il clacson tutto il giorno', 'Sono tornati col {A}'],
    festa: ['Stasera si fa festa', 'Porta il vino e la chitarra', 'La pentola è sul fuoco', 'Ci sono {C} per tutti'], martire: ['Ce l\'hanno portato via', 'Una sedia resta vuota', 'Hanno preso il nostro amico'],
    generico: ['{N} non si tocca', 'Siamo quelli {DV}', 'Con {O} in mezzo alla strada', 'Chi passa di qua', 'Viva {N}', '{aH} ci troviamo', 'C\'era una volta {O}'],
    pesca: ['Tira la rete, tira la cima', 'Il mare è grosso e la barca è piccola', 'Sale sul pane e sale sul mare', 'Le sardine non hanno padrone'],
    porto: ['Carica e scarica, scarica e carica', 'Sotto la gru', 'Cassa su cassa', 'La nave arriva e il capo dorme'],
    fabbrica: ['Pesce in scatola e sale sul banco', 'Suona la sirena', 'Olio, sale e coperchio', 'Otto ore in piedi'],
  };
  function distico(st, c, tipo) {
    const o = c && (oggDi(st, c) || null), r = o && rimaDi(o) ? rimaDi(o) : pick(RIME_CHIAVI), R = RIMA[r].slice();
    const A = (ATTACCHI[tipo] || []).concat(/^(pesca|porto|fabbrica)$/.test(tipo) ? [] : ATTACCHI.generico);
    const det = (src, d0) => { const d = c && c.det.find(x => x[1] === src); return d ? artW(d[0], 'det') : d0; };
    const sost = s => s.replace('{N}', c && c.nome ? c.nome.replace(/^(Il|La|Lo|I|Gli|Le|L')\s?/, '') : 'Il paese').replace('{DV}', c && viaDi(st, c) ? artW(viaDi(st, c), 'di') : 'del porto').replace('{O}', o ? artW(o, 'det') : 'il cuore')
      .replace('{M}', det('mezzo', 'il furgone').replace(/^(il|la|lo|l') ?/, '')).replace('{A}', det('arnese', 'il taccuino').replace(/^(il|la|lo|l') ?/, '')).replace('{C}', det('cibo', 'le fave')).replace('{aH}', cap1(artW((c && c.det.find(x => x[1] === 'ora') || ['mezzanotte'])[0], 'a')));
    const a1 = sost(pick(A)), a2 = sost(pick(A.filter(x => sost(x) !== a1)) || a1), e1 = pick(R), e2 = pick(R.filter(x => x !== e1)) || e1;
    const chiusa2 = o && rimaDi(o) === r && rnd() < .5 ? `noi stiamo con ${artW(o, 'det')}`.replace('con il ', 'col ') : e2;
    segna(st, null, 'rima:' + r);
    return [`${cap1(a1)}, ${e1},`, `${cap1(a2)}: ${chiusa2}!`];
  }
  const GESTI = ['il pugno chiuso', 'la mano aperta', 'due dita a V', 'le mani a cerchio', 'il palmo sul cuore', 'tre dita alzate', 'il mignolo e il pollice', 'le dita a becco', 'il pollice sul naso', 'le mani a tetto'];
  const MODI_G = ['battuto due volte sul petto', 'sopra la testa', 'girato verso il mare', 'e un fischio', 'portato alla tempia', 'a forma di {O}', 'e un occhiolino', 'sbattuto sul tavolo', 'e un colpo di tosse'];
  const PORTANO = ['il fazzoletto {col} al collo', 'una toppa {col} con {O} sulla giacca', 'un nastro {col} al polso', 'il berretto {col}', 'le calze {col}, spaiate', 'una spilla a forma di {O}', 'la sciarpa {col} anche d\'estate', 'una molletta {col} sul colletto', 'un braccialetto di spago {col}'];
  const SALUTI = [o => [`${cap1(o)}!`, `Sempre ${agg(pick(['pieno', 'fiero', 'acceso', 'in piedi', 'storto', 'nostro', 'sveglio', 'caldo']), gen(o))}!`], o => [`Viva ${artW(o, 'det')}!`, 'E abbasso il verbale!'], o => [`${cap1(artW(o, 'su'))}!`, 'Giù i Grigi!'],
    o => [`Forza ${cap1(o)}!`, 'Fino in fondo!'], o => [`Uè, ${o}!`, 'Presente!'], o => [`Chi ha ${artW(o, 'det')}?`, 'Noi, e chi se no?'], o => [`${cap1(o)} e pane!`, `Pane e ${o}!`], o => [`Ohè, ${o}!`, 'Ohè!']];
  const MOTTI = [(o, n) => `${cap1(o)} ${agg('pieno', gen(o))}, Grigio lontano`, (o) => `Chi tocca ${artW(o, 'det')}, trova ${artW(o, 'det')} di traverso`, (o) => `Meglio ${artW(o, 'ind')} oggi che un verbale domani`, (o, n) => `${n} non si sgombera`,
    (o) => `Finché c'è ${artW(o, 'ind')}, c'è speranza`, (o, n) => `${n}: qui si sta`, (o) => `Più ${o} per tutti`, (o, n) => `Né Grigi né padroni, solo ${artW(o, 'det')}`.replace(/solo l[ao] /, m => m), (o, n) => `Di qui non si passa, se non per un caffè`, (o) => `Con ${artW(o, 'det')} e con la pazienza`];
  function fondaFrasi(st, c) {
    const o = oggDi(st, c) || (c.nome || 'noi').replace(/^(Il|La|Lo|I|Gli|Le|L')\s?/, '').toLowerCase(), N = (c.nome || '').replace(/^(Il|La|Lo|I|Gli|Le|L')\s?/, '');
    const ix = (L, p) => { const b = scegli(st, L.map((f, i) => [i, null, p + i, 1])); return L[b ? b[0] : 0]; };
    c.saluto = ix(SALUTI, 'saluto')(o); c.motto = ix(MOTTI, 'motto')(o, N);
    c.segno = `${ix(GESTI.map(g => () => g), 'gesto')()} ${ix(MODI_G.map(g => () => g), 'modo')().replace('{O}', artW(o, 'ind'))}`;
    c.moda = ix(PORTANO.map(g => () => g), 'moda')().replace('{col}', c.col).replace('{O}', artW(o, 'ind'));
    c.canto = distico(st, c, haTema(c, 'resiste') ? 'resiste' : haTema(c, 'festa') ? 'festa' : haTema(c, 'martire') ? 'martire' : 'generico');
    const B = BANDE.find(b => c.nome && c.nome.indexOf(b.n) === 0); if (B) { c.moda = B.moda; c.segno = B.mano; c.tag = B.tag; }
  }
  const BANDE = UCu.BANDE = [
    { n: 'La Ciurma', moda: 'la maglia a righe blu e carta', mano: 'il pollice e il mignolo a forma d\'ancora, capovolta', tag: 'l\'ancora capovolta con due gocce' },
    { n: 'I Lamierini', moda: 'la camicia color ruggine', mano: 'la mano a zig-zag, tre colpi nell\'aria', tag: 'lo zig-zag in tre colpi' },
    { n: 'I Saette', moda: 'il casco dipinto viola e nero', mano: 'il dito a saetta dall\'alto in basso', tag: 'la saetta con la S' },
    { n: 'I Carbonai', moda: 'il fazzoletto verde bosco', mano: 'le mani a pigna, sopra la testa', tag: 'la pigna con la fiamma' },
  ];

  // ======================= LA CERIMONIA DEL NOME =======================
  const DIC = [];
  function dici(st, id, testo, dopo) { if (!testo || DIC.length > 24) return; DIC.push([(st.clock || 0) + (dopo || 0), id, String(testo).slice(0, CFG.dire.max)]); }
  const OBIEZIONI = ['«{P}»? Meglio «{A}»!', 'Ma che nome è? «{A}», piuttosto.', '«{P}» sembra il nome di un dentifricio. «{A}»!', 'Io voto «{A}», e mia madre pure.', 'Con «{P}» ci ridono dietro. «{A}»!'];
  const BRONTOLA = ['Va be\', come volete voi.', 'Io avevo un nome più bello.', 'Ai miei tempi bastava «il gruppo».', 'Tanto lo sbagliate a scrivere.', 'Basta che non lo mettete sui manifesti.', 'Io mi astengo. Anzi no, mi offendo.'];
  const PROCLAMA = ['«{V}»! E chi ci tocca, se la vede con noi.', '«{V}». Scrivetelo grande.', 'Da oggi siamo «{V}». Brindiamo.', '«{V}»: suona bene, eh?'];
  function cerimonia(st, c, motivo, causa, forza) {
    const b = bud(st); if (b.c >= CFG.cerimonieGiorno && !forza) return false;   // forza: la nascita del presidio (il nome serve allo striscione)
    const M = membri(st, c).filter(id => libero(st, id)); if (M.length < 2) return false;
    if (!c.det.length) fondoDet(st, c);
    const L = candidati(st, c, motivo); if (!L.length) return false; b.c++; stats.cerimonie++;
    const ord = M.map(id => [id, T(st, id)]).sort((a, b) => b[1].carisma - a[1].carisma), pro = ord[0][0];
    const prop = L[0], alt = L.find(x => x[0] !== prop[0] && x[4] !== prop[4]) || L[1] || null;
    let si = 1, no = 0, brontola = null, altroDi = null;
    for (const [id, t] of ord.slice(1, 6)) {
      let x = .55 + t.credulo * .3 - t.contrario * .9 - t.testardo * .25 + (rnd() - .5) * .5;
      if (prop[4] === 'persona' && prop[0].indexOf(nome(st, id)) >= 0) x += t.carisma > .5 ? .4 : -.5;
      if (x >= .35) si++; else { no++; if (!brontola) brontola = id; if (!altroDi && alt) altroDi = id; }
    }
    const V = no > si && alt ? alt : prop, vecchio = c.nome; segna(st, V[1], V[2]); segna(st, null, V[4]);
    const fx = c.k[0] === 'g' ? { gruppo: c.k.slice(2) } : { cantiere: c.k.slice(2) }, B = baseDi(st, c) || {};
    const pf = scrivi(st, 'nome_proposto', [pro].concat(brontola ? [brontola] : []), Object.assign({ d: `${vecchio ? vecchio + ': ' : ''}${nome(st, pro)} propone di chiamarsi «${prop[0]}»${alt && altroDi ? `; ${nome(st, altroDi)} preferisce «${alt[0]}»` : ''}`, nome: prop[0], x: B.x, y: B.y }, fx), causa || null, true);
    rinomina(st, c, V[0], motivo || 'nascita', pf ? pf.id : causa);
    scrivi(st, 'nome_scelto', [V === prop ? pro : altroDi || pro].concat(brontola && V === prop ? [brontola] : []), Object.assign({ d: `Da oggi si chiamano «${V[0]}» (${Math.max(si, no)} contro ${Math.min(si, no)})${brontola && V === prop ? ': ' + nome(st, brontola) + ' brontola' : ''}${vecchio ? ', non più «' + vecchio + '»' : ''}`, nome: V[0], prima: vecchio || undefined, x: B.x, y: B.y }, fx), pf ? pf.id : causa, true);
    const sub = s => s.replace(/\{P\}/g, prop[0]).replace(/\{A\}/g, alt ? alt[0] : '').replace(/\{V\}/g, V[0]);
    dici(st, pro, `Ci chiamiamo «${prop[0]}». Chi è d'accordo?`, 0);
    if (altroDi && alt) dici(st, altroDi, sub(hpick(OBIEZIONI, prop[0])), 2.5);
    if (brontola && V === prop) dici(st, brontola, hpick(BRONTOLA, V[0]), 5);
    dici(st, pro, V === prop ? sub(hpick(PROCLAMA, V[0])) : `E va bene: «${V[0]}». Comandate voi.`, 7.5);
    return true;
  }
  function rinomina(st, c, nm, motivo, causa) {
    const prima = c.nome; c.nomi.push([nm, Math.round(st.t), motivo]); if (c.nomi.length > CFG.nomiMax + 2) c.nomi.splice(0, c.nomi.length - CFG.nomiMax - 2);
    c.nome = nm; stats[prima ? 'rinomine' : 'nomi']++;
    const g = gruppoCom(st, c); if (g) g.nome = nm;
    for (const C of presidiDi(st, c)) { C.nome = striscione(nm); rifaiStriscione(C); }
    if (!c.sim) { c.sim = simbolo(st, c); stats.simboli++; }
    if (!c.saluto) fondaFrasi(st, c);
    if (!prima) S(st).cal.feste.push([data(st, c.t0).s, `Festa ${forme(nm)[1]}`, c.k]);
  }
  function presidiDi(st, c) {
    const s = st.u && st.u.costruire; if (!s) return []; const out = [], C0 = presidioCom(st, c); if (C0) out.push(C0);
    const g = gruppoCom(st, c); if (g) for (const C of s.cantieri) if (!C.chiuso && (C.tipo === 'presidio' || C.tipo === 'barricata' || C.tipo === 'baracca') && C.gruppo.some(id => g.membri.includes(id)) && !(S(st).com['c:' + C.id] && S(st).com['c:' + C.id].nome)) out.push(C);
    return out;
  }

  // IL NOME ALLA NASCITA DEL PRESIDIO: lo striscione porta il nome del gruppo dei fondatori. Se il gruppo ha già un nome, subito quello;
  // se non ce l'ha (o i fondatori non sono ancora un gruppo: la comunità del presidio), lo scelgono lì, alla fondazione (la cerimonia di
  // sempre: chi ha carisma propone, gli altri votano). «VIA NOSTRA» resta solo se non c'è nessuno per decidere.
  function fondaPresidio(st, C) {
    if (!C || C.tipo !== 'presidio' || C.chiuso || !st.u) return null; const s = S(st); if (!s) return null;
    let c = comPerCantiere(st, C);
    const Gr = GR(); if (!c && Gr && st.u.gruppi && C.gruppo) for (const id of C.gruppo) { const g = Gr.gruppoDi(st, id); if (g && !g.sciolto) { c = nuovaCom(st, 'g:' + g.id, { t0: g.t0 }); break; } }
    if (!c) c = nuovaCom(st, 'c:' + C.id);
    for (let k = 0; k < 4 && !c.nome; k++) { try { if (!cerimonia(st, c, null, C.fidFine || C.fid || null, true) && membri(st, c).filter(id => libero(st, id)).length < 2) break; } catch (e) { break; } }   // i candidati sono una parte degli schemi: si riprova
    if (c.nome) { const nm = striscione(c.nome); if (C.nome !== nm) { C.nome = nm; rifaiStriscione(C); } }
    return c.nome || null;
  }
  { const UC = UCo(); if (UC) { const f0 = UC.alFine; UC.alFine = (st, C) => { if (f0) f0(st, C); if (C && C.tipo === 'presidio' && CFG.nomeAllaNascita) try { fondaPresidio(st, C); } catch (e) { } }; } }

  // ======================= I SOPRANNOMI PERSONALI =======================
  const TITOLI = [['il Barone', 'la Baronessa'], ['il Conte', 'la Contessa'], ['il Sindaco', 'la Sindaca'], ['il Generale', 'la Generalessa'], ['il Presidente', 'la Presidentessa'], ['il Monsignore', 'la Badessa'], ['l\'Ammiraglio', 'l\'Ammiraglia'], ['il Questore', 'la Questora'], ['il Notaio', 'la Notaia'], ['il Prefetto', 'la Prefetta']];
  const SOPR_P = { comica: ['Patatrac', 'Pozzanghera', 'Salame', 'Tombolo', 'Birillo', 'Saponetta', 'Ruzzolone', 'Bambola', 'Paperella', 'Sbadaboom'], fermato: ['Galera', 'Ergastolo', 'Manette', 'Cella Sette', 'Ricevuta di Ritorno', 'Due Notti'],
    pesca: ['Tonno', 'Retata', 'Balena', 'Amo d\'Oro', 'Pescecane', 'Sardone'], rissa: ['Martello', 'Tornado', 'Mattarello', 'Uppercut', 'Gomito', 'Cazzottone'], lite: ['Megafono', 'Trombone', 'Sirena', 'Campana', 'Altoparlante'],
    rinfacciato: ['Ricevuta', 'Pallottoliere', 'Usuraio', 'Promemoria', 'Calcolatrice', 'Memoria di Ferro', 'Libretto'], prestito: ['Banchiere', 'Salvadanaio', 'Bancomat', 'Cassaforte', 'Monte di Pietà', 'Portafoglio', 'Rotschild', 'Tasca Larga', 'Ragioniere', 'Cambiale'], dipinge_muro: ['Pennello', 'Bomboletta', 'Picasso', 'Spruzzo', 'Vernice', 'Scarabocchio', 'Gessetto', 'Tavolozza', 'Michelangelo', 'Rullo', 'Stencil', 'Ditone'], multa: ['Verbale', 'Bollettino', 'Contravvenzione', 'Marca da Bollo', 'Carta Bollata', 'Ricevuta Gialla', 'Mora', 'Cartella'],
    regalo: ['Befana', 'Babbo', 'Mano Larga', 'Cuore d\'Oro', 'Fiocco', 'Pacchetto', 'San Nicola', 'Sorpresa'], festa: ['Baldoria', 'Tarantella', 'Coriandolo'] };
  function soprannome(st, id, f, forzato) {
    const s = S(st); if (!id || id === 'nino' || !vivo(st, id) || s.sopr[id] || Object.keys(s.sopr).length >= CFG.sopr) return null;
    const n = nome(st, id), dn = donna(st, id), L = [];
    if (forzato) L.push([forzato, null, 'forzato', 5]);
    if (f.cosa || (f.x && f.x.cosa)) { const w = robaN(f.cosa || f.x.cosa).split(' ')[0]; L.push([`${n} ${tc(w)}`, stem(w), 'sopr_cosa', 1.4]); L.push([`${n} ${artW(tc(w), 'di', gen(w))}`, stem(w), 'sopr_dellacosa', 1]); }
    if (f.x && f.x.ono && !/^(a+h+|e+h+|o+h+|ah)+$/i.test(String(f.x.ono).replace(/[!.\s]/g, ''))) L.push([`${n} ${tc(String(f.x.ono).toLowerCase().replace(/[!.]/g, ''))}`, String(f.x.ono), 'sopr_ono', 1.3]);
    const P = SOPR_P[f.v === 'guasto' ? 'comica' : f.v === 'repressione' ? 'fermato' : f.v]; if (P) { const w = pick(P); L.push([`${n} ${w}`, w, 'sopr_pool', 1]); }
    if (f.dove && f.dove[2] && placeN(f.dove[2]) && (f.ril || 0) > .4) { const t = pick(TITOLI)[dn ? 1 : 0]; L.push([`${cap1(t)} ${artW(tc(placeN(f.dove[2])), 'di', gen(placeN(f.dove[2])))}`, placeN(f.dove[2]), 'sopr_titolo', .8]); }
    if (!L.length) return null;
    const b = scegli(st, L); const nick = b[0];
    s.sopr[id] = [nick, f ? f.id : null, Math.round(st.t), 0]; stats.sopr++;
    scrivi(st, 'soprannome', [id].concat(f && f.con ? f.con.slice(0, 1).map(io) : []), { d: `Da quella volta, per tutti, ${n} è «${nick}»`, sopr: nick, x: f && f.dove ? f.dove[0] : undefined, y: f && f.dove ? f.dove[1] : undefined }, f ? f.id : null);
    return nick;
  }
  const soprDi = (st, id) => { const e = S(st).sopr[id]; return e ? e[0] : null; };
  // il capo con la gente in strada diventa un titolo: «la Contessa della Latta»
  function titoloCapo(st, c, f) { const id = capoDi(st, c); if (!id || S(st).sopr[id]) return; const o = oggDi(st, c); if (!o) return; const t = scegli(st, TITOLI.map((x, i) => [x[donna(st, id) ? 1 : 0], null, 'titolo' + i, 1])); soprannome(st, id, f, `${cap1(t[0])} ${artW(tc(o), 'di', gen(o))}`); }

  // ======================= I NOMI DI POPOLO DEI POSTI e L'UFFICIO RETTIFICHE =======================
  const TOPO_T = { multa: ['il Cantone dei Multati', 'l\'Angolo del Verbale', 'il Posto delle Ricevute'], rissa: ['l\'Angolo delle Botte', 'il Ring', 'la Curva dei Ceffoni'], comica: ['la Curva del Patatrac', 'lo Scivolo', 'il Posto dei Capitomboli'],
    guasto: ['la Curva del Patatrac', 'il Posto dei Capitomboli', 'l\'Angolo Maledetto'], furto: ['il Vicolo Leggero', 'il Passo delle Tasche', 'il Corridoio dei Portafogli'], prodigio: ['il Posto dei Miracoli', 'l\'Angolo Benedetto', 'la Fermata dei Santi'],
    festa: ['la Piazzetta della Baldoria', 'il Largo dei Brindisi'], presidio_festa: ['la Piazzetta della Baldoria', 'il Salotto all\'Aperto'], pesca: ['lo Scoglio Fortunato', 'il Posto del Tonno', 'la Riva dei Bugiardi'],
    repressione: ['il Canto del Furgone', 'il Largo delle Manette'], fermato: ['il Canto del Furgone', 'l\'Angolo delle Manette'], sgombero: ['il Largo dello Sgombero', 'il Piazzale del Trasloco'],
    presidio_resiste: ['il Largo della Resistenza', 'il Fortino'], lancio: ['il Tiro a Segno', 'il Campo dei Proiettili'] };
  const UFF = ['Largo del Garante Benevolo', 'Viale della Concordia', 'Piazza dell\'Ordine Ritrovato', 'Calata del Garante Previdente', 'Largo del Decoro', 'Via della Serenità Obbligatoria', 'Piazzale del Garante Sorridente', 'Passeggiata della Gratitudine', 'Vicolo dei Cittadini Modello', 'Rotonda del Consenso'];
  const topoCnt = {};
  function toponimo(st, f) {
    const l = f.dove && f.dove[2], P = l && G.PLACES && G.PLACES[l]; if (!P || !TOPO_T[f.v]) return;
    const s = S(st); if (s.topo[l] || Object.keys(s.topo).length >= CFG.topo) return;
    const k = l + '|' + f.v; topoCnt[k] = (topoCnt[k] || 0) + 1; if (topoCnt[k] < 2 && (f.ril || 0) < .55) return;
    if (!quota(st, 'topo', 3)) return;
    const L = TOPO_T[f.v].map((x, i) => [x, x, 'topo:' + f.v + i, 1]), cosa = f.cosa || (f.x && f.x.cosa); if (cosa) { const w = robaN(cosa).split(' ')[0]; L.push([`il Vicolo ${artW(w + (/a$/.test(w) ? 'te' : 'i'), 'di', { g: gen(w).g, pl: true })}`.replace(/(at|it)te\b/, '$1e'), stem(w), 'topo_cosa', 1.3]); }
    const nm = scegli(st, L)[0]; s.topo[l] = [nm, f.id, Math.round(st.t), f.v, 0]; stats.topo++;
    scrivi(st, 'toponimo', [io(f.chi)].concat((f.test || []).slice(0, 2)), { d: `${cap1(P.name)}, per la gente, ormai è «${nm}»`, luogo: l, topo: nm, x: P.x, y: P.y }, f.id);
  }
  function rettifica(st, l, causa) {
    const s = S(st), P = G.PLACES && G.PLACES[l]; if (!P || s.reg.vie[l] || !quota(st, 'rett', 2)) return;
    const L = UFF.filter(x => !Object.values(s.reg.vie).includes(x)); const nu = pick(L.length ? L : UFF); s.reg.vie[l] = nu; stats.rettifiche++;
    const pop = s.topo[l] ? s.topo[l][0] : null;
    scrivi(st, 'rettifica', [], { d: `Ufficio Rettifiche: ${P.name} da oggi si chiama «${nu}»${pop ? `. La gente continua a dire «${pop}»` : '. Nessuno se n\'è accorto'}`, luogo: l, x: P.x, y: P.y }, causa, true);
  }
  const EUF = UCu.EUF = {
    sgombero: [f => `${f.x && f.x.via ? 'in ' + f.x.via + ' ' : ''}nessuno sgombero, solo una ricollocazione volontaria di sedie`, () => 'nessuno sgombero: un trasloco assistito, gratuito e a sorpresa'],
    multa: [f => `${f.x && f.x.via ? 'in ' + f.x.via + ' ' : ''}nessuna multa, solo un contributo spontaneo al decoro`, () => 'nessuna multa: un promemoria con l\'importo'],
    fermato: [(f, st) => `${nome(st, f.chi)} non è stato fermato, è stato accompagnato con cordialità`, (f, st) => `${nome(st, f.chi)} è ospite della caserma, per sua scelta`],
    repressione: [() => 'nessuna retata, solo un censimento affettuoso', () => 'nessun arresto: una gita istruttiva in caserma'],
    presidio: [f => `${f.x && f.x.via ? 'in ' + f.x.via : 'in città'} non c'è nessun presidio, è un assembramento di sedie non autorizzato`, () => 'le sedie in strada sono un\'esposizione di mobili, non una protesta'],
    presidio_resiste: [f => `${f.x && f.x.via ? 'in ' + f.x.via + ' ' : ''}i cittadini hanno spontaneamente rinviato lo sgombero`, () => 'lo sgombero è stato rimandato per maltempo (c\'era il sole)'],
  };
  const MAN = { N1: ['L\'ordine', 'Il silenzio', 'Il decoro', 'La disciplina', 'La fila', 'L\'obbedienza', 'La pazienza', 'Il lavoro'], N2: ['libertà', 'civiltà', 'sicurezza', 'progresso', 'pace', 'felicità', 'salute', 'ricchezza'],
    V: ['veglia', 'lavora', 'pensa', 'decide', 'sorride', 'provvede', 'ascolta', 'vede'], L: ['via', 'piazza', 'città', 'famiglia', 'banchina', 'scala'] };
  const PARODIA = { libertà: 'multa', civiltà: 'verbale', sicurezza: 'sorveglianza', progresso: 'processo', pace: 'zitti', felicità: 'fila', salute: 'tassa', ricchezza: 'sua', veglia: 'sbadiglia', lavora: 'si riposa', pensa: 'pesa', decide: 'decade', sorride: 'deride', provvede: 'non vede', ascolta: 'origlia', vede: 'non ci vede', felice: 'in fila', casa: 'cantina', ordinata: 'ordinanzata' };
  function manifesto(st) {
    const s = S(st); if (!quota(st, 'man', 2)) return;
    const presidi = ((st.u.costruire && st.u.costruire.cantieri) || []).filter(C => C.tipo === 'presidio' && !C.chiuso).length;
    const R = [() => `${pick(MAN.N1)} è ${pick(MAN.N2)}`, () => `Il Garante ${pick(MAN.V)} per te`, () => { const l = pick(MAN.L); return `Una ${l} ordinata è una ${l} felice`; }, () => `Chi non ha niente da nascondere non ha niente da temere`, () => `${pick(MAN.N1)} oggi, ${pick(MAN.N2)} domani`]
      .concat(presidi ? [() => 'Le sedie stanno in casa', () => 'Chi sta in strada, sta in pena'] : []);
    const testo = scegli(st, R.map((f, i) => [f(), null, 'man' + i, 1]))[0]; s.reg.man.push([testo, Math.round(st.t)]); if (s.reg.man.length > 6) s.reg.man.shift(); stats.manifesti++;
    const P = G.PLACES && (G.PLACES.piazza || G.PLACES[Object.keys(G.PLACES)[0]]);
    return scrivi(st, 'manifesto', [], { d: `Nuovo manifesto del Garante sui muri: «${testo}»`, testo, x: P ? P.x : undefined, y: P ? P.y : undefined }, null, true);
  }
  function parodia(st, id, causa) {
    const s = S(st), m = s.reg.man[s.reg.man.length - 1]; if (!m || s.reg.par.some(x => x[1] === m[0]) || !quota(st, 'par', 2)) return;
    let p = m[0], fatto = false; for (const k of Object.keys(PARODIA).sort(() => rnd() - .5)) if (!fatto && new RegExp('\\b' + k + '\\b').test(p)) { p = p.replace(new RegExp('\\b' + k + '\\b'), PARODIA[k]); fatto = true; }
    if (!fatto) p = p + pick([' (e paga il conto)', ' (salvo imprevisti)', ', forse', ' (prezzi in aumento)']);
    s.reg.par.push([p, m[0], id, Math.round(st.t)]); if (s.reg.par.length > 6) s.reg.par.shift(); stats.parodie++;
    scrivi(st, 'parodia', [id], { d: `Sul manifesto del Garante qualcuno ha corretto: «${p}». La mano è quella di ${nome(st, id)}, dicono`, testo: p }, causa);
    dici(st, id, `«${p}»: così è più giusto.`, 0);
  }

  // ======================= I PROVERBI E LE SUPERSTIZIONI =======================
  const PV = UCu.PV = { presidio: 'mette la sedia in strada', multa: 'prende la multa', presidio_grigi: 'si ritrova i Grigi sotto casa', sgombero: 'se lo porta via il furgone', presidio_resiste: 'vede il furgone tornare vuoto',
    pesca: 'va per mare', regalo: 'regala', prestito: 'presta', rinfacciato: 'se lo sente rinfacciare', lite: 'alza la voce', rissa: 'mena', comica: 'fa ridere il paese', guasto: 'si fa male da solo',
    presidio_festa: 'fa festa', festa: 'fa festa', fermato: 'dorme in caserma', furto: 'ruba', lancio: 'tira la roba', dipinge_muro: 'scrive sui muri', chiacchiera: 'parla troppo', saldato: 'paga i debiti', buca: 'dà buca',
    vende: 'vende', compra: 'compra', lavora: 'lavora', appuntamento: 'dà appuntamenti', incontro: 'va agli appuntamenti', muso: 'tiene il muso', equivoco: 'sbaglia persona', riuscito: 'ce la fa' };
  const PROV_T = [(a, b) => `Chi ${a}, ${b}.`, (a, b) => `Chi ${a} oggi, ${b} domani.`, (a, b, g, f) => `Chi ${a} di ${giornoN(g.t)}, di ${giornoN(f.t)} ${b}.`, (a, b) => `Prima ${a.replace(/^(\w+)/, 'uno $1')}, poi ${b}: così va il mondo.`,
    (a, b, g, f, st) => `Chi ${a} ${artW(placeN(g.dove && g.dove[2]) || 'piazza', 'a')}, ${b}.`, (a, b) => `A chi ${a}, prima o poi ${b.replace(/^(\w+)/, 'tocca che $1')}.`, (a, b) => `Chi ${a} senza guardare, ${b} senza capire.`];
  function proverbio(st, f, g) {
    const s = S(st); if (!PV[f.v] || !PV[g.v] || f.v === g.v || s.prov.length >= CFG.prov || !quota(st, 'prov', 2) || rnd() > .25) return;
    const b = scegli(st, PROV_T.map((fn, i) => [fn(PV[g.v], PV[f.v], g, f, st), g.v + '>' + f.v, 'prov' + i, 1]));
    if (!b || s.prov.some(x => x[0] === b[0])) return; s.prov.push([b[0], f.id, Math.round(st.t)]); stats.proverbi++;
    scrivi(st, 'proverbio', [io(f.chi)], { d: `Si è cominciato a dire: «${b[0]}»`, testo: b[0] }, f.id);
  }
  function superstizione(st, testo, chi, causa) {
    const s = S(st); if (s.sup.length >= CFG.sup || s.sup.some(x => x[0] === testo) || !quota(st, 'sup', 1)) return;
    s.sup.push([testo, causa, Math.round(st.t)]); stats.superstizioni++;
    scrivi(st, 'superstizione', chi ? [chi] : [], { d: `Si dice in giro: «${testo}»`, testo }, causa);
  }

  // ======================= I MITI (raccontati e gonfiati) =======================
  const NUMERI = ['due', 'tre', 'cinque', 'otto', 'dieci', 'venti', 'cinquanta', 'cento', 'mille'];
  const GRIGI_Q = ['un Grigio', 'due Grigi', 'tre camionette', 'mezza caserma', 'un battaglione', 'tutta la Guardia del Garante'];
  const TEMPO = ['un\'ora', 'tutto il pomeriggio', 'tutta la notte', 'tre giorni', 'una settimana'];
  const INTRO = ['Io c\'ero:', 'Me l\'ha detto mio cugino:', 'Giuro:', 'Lo sanno tutti:', 'Te lo dico io:', 'Non ci crederai:', 'Parola d\'onore:', 'Me l\'ha raccontato il prete:', 'Mia nonna lo dice sempre:', 'L\'ha visto il barbiere:'];
  const GESTA = { resiste: ['ha detto di no', 'ha guardato il Grigio negli occhi', 'ha fatto girare {M} con lo sguardo', 'ha fermato {M} con una mano sola'],
    martire: ['non ha detto una parola', 'ha cantato fino in caserma', 'si è fatto portare via ridendo', 'ha fatto piangere il Grigio'],
    lancio: ['ha tirato {C}', 'ha preso il Grigio con {C} da dieci metri', 'ha tirato {C} oltre il campanile', 'con {C} ha spento il lampione al primo colpo'],
    comica: ['è caduto', 'è scivolato su {C}', 'è caduto come un salame', 'è finito dentro un cassonetto', 'è volato per tre metri', 'ha fatto la ruota senza volerlo', 'è rimbalzato due volte e si è rialzato a cavallo di {B}', 'è atterrato in braccio al prete'], festa: ['ha portato {F}', 'ha cucinato {F} per tutti', 'ha ballato fino all\'alba', 'ha fatto ballare pure i Grigi'],
    mare: ['ha preso un pesce', 'ha preso un pesce grande così', 'ha tirato su un tonno più grande della barca', 'ha preso un pesce che parlava'],
    sgombero: ['ha portato via l\'ultima sedia', 'si è seduto sopra {M}', 'ha legato {M} al lampione', 'ha fatto sparire le gomme {dM}'],
    impresa: ['ce l\'ha fatta', 'ce l\'ha fatta con {C}', 'ce l\'ha fatta da solo', 'ce l\'ha fatta in mutande', 'ce l\'ha fatta con una mano legata', 'ce l\'ha fatta bendato', 'ce l\'ha fatta fischiettando', 'ce l\'ha fatta col gesso al braccio'], prodigio: ['ha visto il segno', 'ha visto la luna muoversi', 'ha parlato col faro', 'ha fatto suonare le campane'],
    rissa: ['ha alzato le mani', 'ne ha stesi due', 'ne ha stesi sei con un ombrello', 'li ha stesi tutti senza togliersi il cappello'] };
  const CODE = ['', 'e il Grigio se n\'è andato a piedi', 'e da quel giorno {M} non passa più di lì', 'e dicono che il Garante abbia pianto', 'e la statua del Garante si è girata dall\'altra parte', 'e {B} da allora non mangia più', 'e il giorno dopo è piovuto all\'insù'];
  const mitoDi = (st, fid) => { const s = S(st); for (const k in s.miti) if (s.miti[k].fid === fid) return s.miti[k]; return null; };
  function nuovoMito(st, c, f, tema) {
    const s = S(st), b = bud(st); if (Object.keys(s.miti).length >= CFG.miti || b.m >= CFG.mitiGiorno || mitoDi(st, f.id) || !GESTA[tema]) return null;
    b.m++; const ch0 = f.v === 'repressione' ? io(f.con && f.con[0]) : io(f.chi), n0 = vivo(st, ch0), id = 'm' + (++s.n), eroe = ch0 && ch0 !== 'nino' && n0 && !n0.grigio && !n0.cop ? ch0 : (membri(st, c)[0] || null);
    const quanti = Math.max(1, (f.x && typeof f.x.n === 'number' ? f.x.n : (f.con || []).length + 1)), D = dettagliDi(st, f, tema), dd = k => (D.find(x => x[1] === k) || [null])[0];
    const M = s.miti[id] = { id, fid: f.id, com: c ? c.k : null, tema, eroe, trad: c ? c.trad || null : null, q: quanti, k: 0, n: 0, t0: Math.round(st.t), tu: Math.round(st.t), cosa: dd('cosa') || dd('pezzo'), mezzo: dd('mezzo'), cibo: dd('cibo'), bestia: dd('bestia'), via: (f.x && f.x.via) || placeN(f.dove && f.dove[2]) || '', ult: null, sa: membri(st, c).slice(0, 10) };
    M.ult = versione(st, M, eroe); stats.miti++;
    scrivi(st, 'mito_nato', [eroe].filter(Boolean), { d: `Nasce una storia ${c && c.nome ? forme(c.nome)[1] : 'del paese'}: ${M.ult}`, mito: id, x: f.dove ? f.dove[0] : undefined, y: f.dove ? f.dove[1] : undefined }, f.id);
    return M;
  }
  function versione(st, M, narr) {
    const k = Math.min(M.k, 4), tn = narr ? T(st, narr) : { follia: 0 }, kk = Math.min(4, k + (tn.follia > .5 ? 1 : 0));
    const e = M.eroe ? (soprDi(st, M.eroe) || nome(st, M.eroe)).replace(/^(Il|La|Lo|L')(?=[ '])/, m => m.toLowerCase()) : 'uno di noi', fem = M.eroe && donna(st, M.eroe), ges = GESTA[M.tema] || GESTA.impresa;
    const sub = s => s.replace('{C}', M.cosa ? artW(M.cosa, 'det') : 'una ciabatta').replace('{M}', artW(M.mezzo || 'furgone', 'det')).replace('{dM}', artW(M.mezzo || 'furgone', 'di')).replace('{F}', M.cibo || 'il vino').replace('{B}', artW(M.bestia || 'gatto', 'ind').replace(/^un'?/, 'un'));
    const g0 = sub(ges[Math.min(ges.length - 1, Math.floor(kk * ges.length / 5) + Math.floor(hashS(M.id + (narr || '') + M.n) * 2))]), q = NUMERI[Math.min(NUMERI.length - 1, Math.min(2, M.q - 1) + kk * 2)];
    const via = M.via ? (/^(via|vico|piazza|calata|salita|largo|corso)/i.test(M.via) ? 'in ' + M.via : artW(M.via, 'in')) : 'qui';
    let core;
    if (M.tema === 'resiste' || M.tema === 'sgombero') core = `${via} erano in ${q} contro ${GRIGI_Q[Math.min(GRIGI_Q.length - 1, kk + 1)]}, e ${e} ${g0}`;
    else if (M.tema === 'martire') core = `quando hanno portato via ${e}, per ${TEMPO[Math.min(TEMPO.length - 1, kk)]} ${e.split(' ')[0]} ${g0}`;
    else core = `${via} ${e} ${g0}${kk >= 2 ? `, davanti a ${q} persone` : ''}`;
    const io0 = narr && narr !== M.eroe && kk >= 2 && hashS(narr + M.id) < .45 ? ', e c\'ero anch\'io' : '';
    const tr = M.trad && kk >= 1 ? `; e c'era chi faceva la spia: ${nome(st, M.trad)}` : '';
    const coda = kk ? sub(hpick(CODE.slice(1, 2 + kk + 1), M.id + (narr || '') + M.n)) : '';
    if (fem) core = core.replace(/\b(caduto|volato|rimbalzato|rialzato|seduto|bendato|scivolato|finito|atterrato)\b/g, w => w.replace(/o$/, 'a')).replace('si è fatto', 'si è fatta').replace('da solo', 'da sola');
    return (`${hpick(INTRO, (narr || '') + M.n + M.id)} ${core}${io0}${tr}${coda ? ', ' + coda : ''}.`).replace(/\s+/g, ' ').slice(0, 138);
  }
  function racconta(st, M, a, b, causa) {
    if (!quota(st, 'racc', 30) || !vivo(st, a)) return null;
    M.k++; M.n++; M.tu = Math.round(st.t); if (T(st, a).credulo > .6 || T(st, a).follia > .4) M.k++;
    const v = versione(st, M, a); M.ult = v; if (b && !M.sa.includes(b) && M.sa.length < 16) M.sa.push(b); stats.racconti++;
    const n = vivo(st, a), f = scrivi(st, 'leggenda', [a].concat(b ? [b] : []), { d: v, mito: M.id, x: n ? n.x : undefined, y: n ? n.y : undefined }, causa != null ? causa : M.fid);
    if (f) { f.x = f.x || {}; f.x.di = f.id;   // il Si dice legge la riga dal fatto stesso (la versione gonfiata, non l'originale)
      const p = st.player, d = p && n ? hyp(p.x - n.x, p.y - n.y) : 1e9, tq = st.u.taccuino || (st.u.taccuino = { sentite: [] });
      if ((b === 'nino' || d <= 12) && tq.sentite) { tq.sentite.push(f.id); if (tq.sentite.length > 30) tq.sentite.splice(0, tq.sentite.length - 30); } }
    dici(st, a, v, 0);
    return f;
  }

  // ======================= I RITI, IL PIATTO, IL SANTO =======================
  function rito(st, c, k, d, chi, causa) {
    const B = baseDi(st, c) || {}, fx = c.k[0] === 'g' ? { gruppo: c.k.slice(2) } : { cantiere: c.k.slice(2) }; stats.riti++;
    return scrivi(st, 'rito', chi.slice(0, 4), Object.assign({ d, rito: k, part: chi.slice(0, 6), x: B.x, y: B.y }, fx), causa);
  }
  function piatto(st, c, f) {
    if (c.piatto || !quota(st, 'piatto', 3)) return;
    const ci = c.det.find(d => d[1] === 'cibo'), o = oggDi(st, c), so = o && stem(o), L = [];
    for (const base of BASI_P.slice().sort(() => rnd() - .5).slice(0, 5)) {
      if (haTema(c, 'sgombero')) L.push([`${base} dello sgombero`, 'sgombero', 'piatto_ev', 1.2]);
      if (haTema(c, 'multa')) L.push([`${base} della multa`, 'multa', 'piatto_ev', 1.1]);
      if (haTema(c, 'resiste')) L.push([`${base} della resistenza`, 'resiste', 'piatto_ev', 1]);
      if (so && ok(so)) L.push([`${base} alla ${so}${pick(SUFF_AGG)}`, so, 'piatto_conio', 1.3]);
      if (ci) L.push([`${base} ${artW(ci[0], 'con')}`.replace(/^(.*) col /, '$1 col ').replace(/ cogli /, ' con gli ').replace(/ colle /, ' con le ').replace(/ colla /, ' con la ').replace(/ coll'/, " con l'"), stem(ci[0]), 'piatto_cibo', 1.1]);
      const h = c.det.find(d => d[1] === 'ora'); if (h) L.push([`${base} ${artW(h[0].toLowerCase(), 'di')}`, stem(h[0]), 'piatto_ora', .9]);
      const p = c.det.find(d => d[1] === 'persona'); if (p) L.push([`${base} alla ${tc(p[0])}`, p[0], 'piatto_persona', 1]);
    }
    const b = scegli(st, L); if (!b) return; c.piatto = b[0]; stats.piatti++; S(st).piatti.push([c.piatto, c.k]);
    const ingr = haTema(c, 'sgombero') ? 'quello che è rimasto dopo il furgone' : haTema(c, 'multa') ? 'poco, perché la multa costa' : ci ? `${ci[0]}, aglio e quello che porta chi passa` : 'aglio, olio e quello che porta chi passa';
    rito(st, c, 'piatto', `${cap1(c.nome || viaDi(st, c) || 'Al presidio')}: è nat${/^(il|lo|i|gli) /.test(c.piatto) ? 'o' : 'a'} ${c.piatto}: ${ingr}`.replace(/nato (i|gli) /, 'nati $1 ').replace(/nata le /, 'nate le '), [io(f.chi)].filter(Boolean), f.id);
  }
  const EPITETI = ['dei Verbali', 'Protettore dei Presidi', 'delle Sedie Vuote', 'del Marciapiede', 'Martire del Furgone', 'della Fila', 'dei Multati', 'del Parcheggio', 'dei Senza Ricevuta', 'delle Cause Perse', 'del Mezzo Turno'];
  function santo(st, c, causa) {
    const s = S(st); if (c.santo || s.santi.length >= 8 || !quota(st, 'santo', 2)) return;
    const o = oggDi(st, c), mart = c.arr.length ? c.arr[c.arr.length - 1] : null, L = [];
    if (o) { const g = gen(o), so = stem(o); if (so && ok(so)) { L.push([`${g.g === 'f' ? 'Santa' : 'San'} ${tc(so)}${g.g === 'f' ? 'ina' : 'one'}`, so, 'santo_conio', 1.2]); } L.push([`la Madonna ${artW(tc(o), 'di', gen(o))}`, so || o, 'santo_madonna', 1]); L.push([`il Beato ${tc(o)}`, so || o, 'santo_beato', .8]); }
    if (mart) L.push([`${/^[aeiou]/i.test(nome(st, mart)) ? "Sant'" : donna(st, mart) ? 'Santa ' : 'San '}${nome(st, mart)} ${pick(EPITETI)}`, nome(st, mart), 'santo_martire', 1.4]);
    L.push([`${pick(['Santa Pazienza', 'Santa Ricevuta', 'Santa Coda', 'Santa Proroga', 'San Bollo', 'San Marciapiede', 'San Timbro', 'Santa Moratoria', 'San Condono'])} ${pick(EPITETI)}`, 'pool', 'santo_pool', .6]);
    const b = scegli(st, L); if (!b) return; c.santo = b[0];
    const g = data(st, st.t).s; s.santi.push([c.santo, c.k, g]); s.cal.feste.push([g, `Festa di ${c.santo}`, c.k]); stats.santi++;
    rito(st, c, 'altarino', `${cap1(viaDi(st, c) || 'Al presidio')}: è spuntato un altarino per ${c.santo}, con un lumino e ${pick(['un fiore di plastica', 'una foto ritagliata', 'un santino rifatto a penna', 'un tappo di bottiglia', 'un rosario di bottoni'])}. Chi passa si fa il segno della croce`, membri(st, c).slice(0, 3), causa);
  }
  const PREGHIERE = ['tienici pieni', 'fa\' che non passino', 'proteggi le sedie', 'manda via il furgone', 'facci trovare parcheggio', 'fa\' piovere sui verbali', 'dacci oggi il nostro caffè'];
  function riti(st, c) {
    const h = (st.t % 1440) / 60, g = Math.floor(st.t / 1440), M = membri(st, c).filter(id => libero(st, id)), B = baseDi(st, c); if (!B || M.length < 3) return;
    if (!c.riti.ann && st.t - c.t0 >= 1440 && c.nome) { c.riti.ann = 1; const cibo = (c.det.find(d => d[1] === 'cibo') || [pick(CIBI)])[0]; rito(st, c, 'anniversario', `${c.nome} festeggia il primo giorno di vita: torta di ${cibo}, un lumino e il discorso di ${nome(st, capoDi(st, c) || M[0])}`, M, null); dici(st, capoDi(st, c) || M[0], `Un giorno fa eravamo in ${Math.min(M.length, 3)}. Guardateci adesso!`, 0); }
    if (h >= 20 && h < 23 && c.riti.tav !== g) {
      c.riti.tav = g; const vuota = c.arr.find(id => npc(st, id) && npc(st, id).jailedUntil > st.t) || null;
      const f = rito(st, c, 'tavolata', `Tavolata della sera ${c.nome ? forme(c.nome)[1] : ''} ${B.via ? inVia(B.via) : ''}: ${M.length} a tavola${c.piatto ? ', ' + c.piatto : ''}${vuota ? ', e una sedia vuota per ' + nome(st, vuota) : ''}`.replace(/\s+/g, ' '), M, null);
      if (!c.piatto && f) piatto(st, c, f);
      if (vuota) { superstizione(st, `Mai sedersi sulla sedia ${c.col} ${B.via ? artW(B.via, 'di') : 'del presidio'}: chi ci si siede, lo portano via`, M[0], f ? f.id : null); dici(st, M[0], `Quella sedia è di ${nome(st, vuota)}. Non ci si siede.`, 1); }
      if (c.canto && rnd() < .6) { stats.canti++; dici(st, M[0], c.canto[0], 3); dici(st, M[1], c.canto[1], 6.5); scrivi(st, 'canto', M.slice(0, 3), { d: `${c.nome ? 'Alla tavolata ' + forme(c.nome)[1] : 'Al presidio'} si canta: «${c.canto[0]} ${c.canto[1]}»`, x: B.x, y: B.y, gruppo: c.k[0] === 'g' ? c.k.slice(2) : undefined }, f ? f.id : null); }
      const Mi = Object.values(S(st).miti).filter(m => m.com === c.k); if (Mi.length && rnd() < .7) racconta(st, pick(Mi), M[0], M[1], f ? f.id : null);
      if (c.santo && rnd() < .4) dici(st, M[M.length - 1], `${c.santo}, ${pick(PREGHIERE)}.`, 9);
    }
    for (const id of c.arr) if (!c.riti.min.includes(id)) { c.riti.min.push(id); if (c.riti.min.length > 6) c.riti.min.shift(); rito(st, c, 'minuto', `${cap1(c.nome || 'Il presidio')}: un minuto di silenzio per ${nome(st, id)}, portat${donna(st, id) ? 'a' : 'o'} via dai Grigi`, M, null); dici(st, M[0], `Un minuto per ${nome(st, id)}. Zitti tutti.`, 0); break; }
  }

  // ======================= GLI EPISODI E L'ASCOLTO DEI FATTI (da UnicoIdee.ascolta) =======================
  // tipo → [peso, tema]
  const EPI = UCu.EPI = {
    gruppo_nato: [.5, 'nascita'], presidio: [.6, 'nascita'], impresa: [.8, 'impresa'], repressione: [1, 'martire'], fermato: [.7, 'martire'], sgombero: [1, 'sgombero'],
    presidio_resiste: [1, 'resiste'], strada_chiusa: [.7, 'resiste'], presidio_grigi: [.4, 'grigi'], multa: [.6, 'multa'], presidio_ordine: [.5, 'grigi'], presidio_festa: [.6, 'festa'],
    presidio_cresce: [.35, 'festa'], festa: [.5, 'festa'], scissione: [.8, 'scissione'], rissa: [.6, 'rissa'], lancio: [.5, 'lancio'], comica: [.5, 'comica'], guasto: [.35, 'comica'],
    pesca: [.3, 'mare'], prodigio: [.5, 'prodigio'], barricata: [.6, 'resiste'], struttura_chiesta: [.3, 'nascita'], cucina_in_strada: [.25, 'festa'], rivalita: [.5, 'scissione'],
    obiettivo_gruppo: [.3, 'nascita'], riuscito: [.5, 'impresa'], come_facciamo: [.25, 'nascita'], porta_in_strada: [.2, 'nascita'],
  };
  const MIEI = /^(nome_|parola_|mito_|leggenda|rito|soprannome|toponimo|rettifica|manifesto|parodia|proverbio|superstizione|canto|magliette|appropriazione|simbolo_conteso|contagio|giorno_nome)/;
  function comDelFatto(st, f) {
    const s = S(st), out = [], x = f.x || {};
    if (x.gruppo) { const g = GR() && GR().gDi(st, x.gruppo); if (g) out.push(nuovaCom(st, 'g:' + g.id, { t0: g.t0 })); }
    if (x.cantiere) { const C = cantiere(st, x.cantiere); if (C && C.tipo === 'presidio') { const c = comPerCantiere(st, C) || nuovaCom(st, 'c:' + C.id); if (!out.includes(c)) out.push(c); } }
    if (!out.length && f.chi && GR()) { const g = GR().gruppoDi(st, io(f.chi)); if (g && s.com['g:' + g.id]) out.push(s.com['g:' + g.id]); }
    return out;
  }
  function ascolta(st, f) {
    const s = S(st); if (!s || (f.fo === 'unico' && MIEI.test(f.v))) return;
    if (f.v === 'chiacchiera' && f.chi && f.con && f.con[0]) return chiacchiera(st, f);
    const E = EPI[f.v];
    if (E && f.esito !== 'no') {
      for (const c of comDelFatto(st, f)) {
        aggiungiEp(st, c, f, E[0], E[1]);
        if (E[0] >= .5 && rnd() < .55) coniaDa(st, c, f, E[1]);
        if (E[0] >= .5) nuovoMito(st, c, f, E[1]);
        if (f.v === 'repressione' || f.v === 'fermato') { const k = f.v === 'repressione' ? io(f.con && f.con[0]) : io(f.chi); if (k && membri(st, c).includes(k) && !c.arr.includes(k)) { c.arr.push(k); if (c.arr.length > 4) c.arr.shift(); } santo(st, c, f.id); }
        if (f.v === 'presidio_resiste' || f.v === 'sgombero' || f.v === 'repressione') { if (c.nome && c.nomi.length < CFG.nomiMax && rnd() < .5) c.attesa = [f.v === 'presidio_resiste' ? 'resiste' : f.v === 'sgombero' ? 'sgombero' : 'martire', f.id]; if (f.v === 'presidio_resiste') titoloCapo(st, c, f); }
        if ((f.v === 'presidio_festa' || f.v === 'cucina_in_strada' || f.v === 'presidio_cresce') && c.nome) piatto(st, c, f);
        if (f.v === 'presidio_resiste' && f.dove && f.dove[2]) rettifica(st, f.dove[2], f.id);
      }
      if (f.v === 'scissione' && f.x && f.x.gruppo && f.x.con_gruppo) scissione(st, f);
      if (f.v === 'rivalita' && f.x && f.x.gruppo && f.x.con_gruppo) rivali(st, f);
    }
    if (f.v === 'lascia_gruppo' && f.x && f.x.gruppo) { const c = s.com['g:' + f.x.gruppo]; if (c && c.nome && !c.trad && rnd() < .5) { c.trad = io(f.chi); traditore(st, c, io(f.chi), f); } }
    if (SOPR_P[f.v === 'guasto' ? 'comica' : f.v === 'repressione' ? 'fermato' : f.v] || f.v === 'lancio' || f.v === 'guasto') if (f.esito !== 'no' && f.chi && rnd() < ((f.ril || 0) >= .5 ? .22 : .06)) soprannome(st, io(f.chi), f);
    if (GIORNO_N[f.v] && f.esito !== 'no') { const g = Math.floor(f.t / 1440), w = (EPI[f.v] ? EPI[f.v][0] : .4) * (.4 + (f.pub || 0)) * (.8 + hashS(f.id) * .4); if (!s.gbest || s.gbest[0] !== g || w > s.gbest[1]) s.gbest = [g, r2(w), f.id]; }
    if (TOPO_T[f.v] && f.esito !== 'no') toponimo(st, f);
    if (f.causa != null && PV[f.v]) { const g = FT().di(st, f.causa); if (g && PV[g.v]) proverbio(st, f, g); }
    if (EUF[f.v] && rnd() < .5 && quota(st, 'euf', 3)) { stats.rettifiche++; const e = scegli(st, EUF[f.v].map((fn, i) => [fn(f, st), null, 'euf:' + f.v + i, 1])); scrivi(st, 'rettifica', [], { d: `Comunicato dell'Ufficio Rettifiche: ${e[0]}`, x: f.dove ? f.dove[0] : undefined, y: f.dove ? f.dove[1] : undefined }, f.id); }
    if ((f.v === 'comica' || f.v === 'guasto') && f.dove && f.dove[2] && rnd() < .25) { const pl = placeN(f.dove[2]) || 'piazza', b = hpick(BESTIE, f.id); superstizione(st, hpick([`Di ${giornoN(f.t)} non si passa ${artW(pl, 'da')}: si cade`, `Se ${artW(b, 'ind')} ti guarda ${artW(pl, 'in')}, torna a casa`, `${cap1(artW(pl, 'in'))} si cammina rasente al muro, se no si scivola`], f.id + 's'), io(f.chi), f.id); }
    if (f.v === 'multa' && rnd() < .15) superstizione(st, hpick(['Se ti fischia l\'orecchio sinistro, è un Grigio che scrive il tuo nome', 'Chi conta le multe ad alta voce, ne prende un\'altra', 'Mai dire «tanto non passano»: passano'], f.id), io(f.chi), f.id);
    if (f.v === 'pesca' && (f.q || 0) >= 3 && rnd() < .3) superstizione(st, `Chi va a pescare ${artW(hpick(ORE_N((f.t % 1440) / 60), f.id).toLowerCase(), 'a')} torna col secchio pieno`, io(f.chi), f.id);
    if (f.v === 'lavora' && f.x && f.x.mestiere && f.chi) mestiere(st, f);
    if (f.v === 'dipinge_muro' && f.chi && s.reg.man.length && rnd() < .3) { const ids = I.di(st, io(f.chi)); if (ids.some(e => /^grigi\|/.test(e[0]) && e[1] < 0)) parodia(st, io(f.chi), f.id); }
  }
  function chiacchiera(st, f) {
    const s = S(st), a = io(f.chi), b = io(f.con[0]); if (!a || !b || a === b) return;
    const Ta = T(st, a), Tb = T(st, b), L = (s.sa[a] || []).slice().sort((x, y) => y[1] - x[1]);
    for (const [wid, fo] of L.slice(0, 2)) {
      const P = s.par[wid]; if (!P) continue;
      if (rnd() < fo * (.35 + Ta.carisma * .5) * (.6 + Tb.credulo * .6)) {
        const nb = npc(st, b), giovane = nb && nb.pop && nb.pop.age < 24; let W = P;
        if (giovane && rnd() < .3) { const w2 = storpia(P.w); if (w2 && ok(w2)) W = Object.values(s.par).find(x => x.w === w2) || storpiata(st, P, w2, b, f) || P; }
        if (impara(st, b, W.id, fo * .6)) { stats.passate++; usa(st, P); contagio(st, W, b, f); }
        break;
      }
    }
    const g = FT().di(st, f.x && f.x.di !== undefined ? +f.x.di : f.causa); if (!g) return;
    const M = g.x && g.x.mito ? s.miti[g.x.mito] : mitoDi(st, g.id);
    if (M && st.t - M.tu > 20) racconta(st, M, a, b, f.id);
  }
  function storpiata(st, P, w2, b, f) {
    const s = S(st); if (Object.keys(s.par).length >= 90) return null;
    const id = 'w' + (++s.n), Q = s.par[id] = { id, w: w2, s: P.s, k: P.k, com: P.com, fid: f.id, t0: Math.round(st.t), tu: Math.round(st.t), usi: 0, pa: P.id }; stats.storpiate++;
    scrivi(st, 'parola_storpiata', [b], { d: `I ragazzi ormai non dicono più «${P.w}»: dicono «${w2}»`, parola: id }, P.fn || null);
    return Q;
  }
  function contagio(st, P, b, f) {
    if (!P.com || !GR()) return; const g = GR().gruppoDi(st, b); if (!g || 'g:' + g.id === P.com) return;
    const s = S(st), c = s.com['g:' + g.id], o = s.com[P.com]; if (!c || !o || !c.nome || !o.nome) return;
    const kk = 'contagio|' + P.id + '|' + c.k; if (s.conti[kk]) return; s.conti[kk] = 1; stats.contagi++;
    scrivi(st, 'contagio', [b], { d: `Anche ${c.nome} adesso dicono «${P.w}», che era ${forme(o.nome)[1]}`, parola: P.id, gruppo: g.id }, f.id);
  }
  const SCISS = [(o, b) => `${o} Vero`, (o, b) => `${o} Libero`, (o, b) => `${b} Rifondato`, (o, b) => `${b} di Sotto`, (o, b) => `${b} Ortodosso`, (o, b) => `${b} in Esilio`, (o, b) => `I Dissidenti ${forme(o)[1]}`, (o, b) => `${b} (Corrente Rivoluzionaria)`, (o, b) => `${b} 2`];
  function scissione(st, f) {
    const s = S(st), o = s.com['g:' + f.x.con_gruppo], h = GR().gDi(st, f.x.gruppo); if (!h) return;
    const c = nuovaCom(st, 'g:' + h.id, { ogg: o ? o.ogg : null, pa: o ? o.pa : null });
    if (o) { c.ep = o.ep.slice(0, 4); c.det = o.det.slice(0, 6); }
    if (o && o.nome) {
      const base = o.nome.replace(/^(Il|La|Lo|I|Gli|Le|L')\s?/, ''), fem = /^La /.test(o.nome);
      const b = scegli(st, SCISS.map((fn, i) => [fn(o.nome, base).replace(/(Vero|Libero|Rifondato|Ortodosso)$/, m => fem ? m.replace(/o$/, 'a') : m), base, 'sciss' + i, 1]));
      rinomina(st, c, b[0], 'scissione', f.id); c.sim = simbolo(st, c, o.sim); c.rivali.push(o.k); o.rivali.push(c.k);
      scrivi(st, 'simbolo_conteso', [h.capo, (GR().gDi(st, f.x.con_gruppo) || {}).capo].filter(Boolean), { d: `${b[0]} e ${o.nome} si contendono ${o.ogg ? artW(o.ogg, 'det') : 'il simbolo'}: ognuno dice che il disegno è suo. I nuovi l'hanno ridipinto coi colori rovesciati`, gruppo: h.id, con_gruppo: f.x.con_gruppo }, f.id, true);
      const bs = stem(base.split(' ').pop()); const nb = scegli(st, [[bs ? `i ${bs}ati` : null, bs, 'riv_ati', 1], [`quelli ${forme(o.nome)[1].replace(/^d\w+ /, m => m)} Bucat${fem ? 'a' : 'o'}`, bs, 'riv_bucato', 1], [`gli Ex-${tc(base.split(' ').pop())}`, bs, 'riv_ex', .9], ['i Rimasti', 'rimasti', 'riv_rimasti', .7], ['i Pantofolai', 'pantof', 'riv_pool', .7]], true);
      if (nb) nuovaParola(st, nb[0], `quelli ${forme(o.nome)[1]}, per i nuovi`, 'rivale', c, f, h.membri, nb[1], nb[2]);
    }
  }
  function rivali(st, f) { const s = S(st), a = s.com['g:' + f.x.gruppo], b = s.com['g:' + f.x.con_gruppo]; if (a && b && !a.rivali.includes(b.k)) { a.rivali.push(b.k); b.rivali.push(a.k); } }
  const MEST = UCu.MEST = { pesca: { re: /pesc|marin|barca/i, nome: 'Il gergo del mare', ogg: 'rete', p: [['calare la rete', 'mettersi al lavoro'], ['mare d\'olio', 'tutto tranquillo'], ['fare il polpo', 'stare nascosto'], ['essere in secca', 'avere finito i soldi'], ['buttare l\'ancora', 'sedersi al bar'], ['avere il vento in poppa', 'essere fortunati']] },
    porto: { re: /port|scaric|gru|dogan|facchin/i, nome: 'Il gergo del porto', ogg: 'cassa', p: [['fare la gru', 'alzare la voce'], ['stiva piena', 'pancia piena'], ['fare scalo', 'fermarsi al bar'], ['cassa su cassa', 'un passo alla volta'], ['container', 'una cosa enorme'], ['mollare gli ormeggi', 'andarsene']] },
    fabbrica: { re: /conserv|fabbric|operai|mattonif|inscatol/i, nome: 'Il gergo della fabbrica', ogg: 'barattolo', p: [['inscatolare', 'imbrogliare'], ['olio e sale', 'così così'], ['suona la sirena', 'è ora di andare'], ['sottolio', 'sottovoce'], ['fare la latta', 'fare finta di niente'], ['coperchio', 'il capo reparto']] } };
  function mestiere(st, f) {
    const m = String(f.x.mestiere), s = S(st); let k = null; for (const q in MEST) if (MEST[q].re.test(m)) { k = q; break; } if (!k) return;
    const c = s.com['m:' + k] || nuovaCom(st, 'm:' + k, { nome: MEST[k].nome, ogg: MEST[k].ogg });
    if (!c.canto) c.canto = distico(st, c, k);
    const chi = io(f.chi);
    if (!(s.sa[chi] || []).some(e => s.par[e[0]] && s.par[e[0]].com === c.k) && rnd() < .3) {
      const L = MEST[k].p.filter(p => !Object.values(s.par).some(x => x.w === p[0])); if (L.length && rnd() < .3) { const p = pick(L); if (nuovaParola(st, p[0], p[1], 'mestiere', c, f, [chi])) return; }
      const W = Object.values(s.par).filter(x => x.com === c.k); if (W.length) impara(st, chi, pick(W).id, .5);
    }
    if (rnd() < .04 && quota(st, 'canto_m', 2)) { stats.canti++; scrivi(st, 'canto', [chi], { d: `Al lavoro si canta: «${c.canto[0]} ${c.canto[1]}»`, mestiere: m }, f.id); dici(st, chi, c.canto[0], 0); dici(st, chi, c.canto[1], 3.5); }
  }

  // ======================= LA FASE =======================
  function battito(st, s) {
    const Gr = GR();
    if (Gr && st.u.gruppi) for (const g of st.u.gruppi.L) if (!s.com['g:' + g.id]) nuovaCom(st, 'g:' + g.id, { t0: g.t0 });
    for (const k in s.com) {
      const c = s.com[k]; if (k[0] === 'm') continue;
      const g = gruppoCom(st, c), C = presidioCom(st, c);
      if (k[0] === 'g' && (!g || g.sciolto || !st.u.gruppi.L.includes(g))) continue;
      if (k[0] === 'c' && (!C || C.chiuso || C.fine === null || comPerCantiere(st, C) !== c)) continue;
      if (!c.nome && st.t - c.t0 >= CFG.nomeDopo && (c.ep.length || st.t - c.t0 > 600)) cerimonia(st, c, null, c.ep.length ? c.ep[0][0] : null);
      else if (c.attesa && c.nomi.length < CFG.nomiMax) { const [m, fid] = c.attesa; c.attesa = null; cerimonia(st, c, m, fid); }
      if (c.nome) { for (const P of presidiDi(st, c)) if (P.nome !== striscione(c.nome)) { P.nome = striscione(c.nome); rifaiStriscione(P); } riti(st, c); }
    }
    const dt = st.t - s.ora; if (dt >= 60) {
      s.ora = st.t; const k = Math.pow(CFG.decad, dt / 1440), vivi = {};
      for (const id in s.sa) { const L = s.sa[id]; for (let i = L.length - 1; i >= 0; i--) { L[i][1] = r2(L[i][1] * k); if (L[i][1] < CFG.dimentica || !s.par[L[i][0]]) L.splice(i, 1); else vivi[L[i][0]] = (vivi[L[i][0]] || 0) + 1; } if (!L.length || !vivo(st, id)) delete s.sa[id]; }
      for (const wid in s.par) { const P = s.par[wid]; P.n = vivi[wid] || 0; if (!P.n && st.t - P.t0 > 240) { delete s.par[wid]; stats.morte++; if (P.usi >= 2) scrivi(st, 'parola_morta', [], { d: `Non dice più nessuno «${P.w}»: era ${P.com && s.com[P.com] && s.com[P.com].nome ? forme(s.com[P.com].nome)[1] : 'del paese'}` }, P.fn || null); } }
      for (const wid in s.par) { const P = s.par[wid], c = P.com && s.com[P.com]; if (P.n >= 7 && c && c.nome && !c.app && P.k !== 'grigi' && quota(st, 'app', 1)) { c.app = 1; appropriazione(st, c, P); break; } }
      for (const kk in s.com) { const c = s.com[kk]; if (c.nome && c.sim && !c.maglie && c.fama >= 5 && kk[0] !== 'm' && quota(st, 'maglie', 1)) { c.maglie = 1; magliette(st, c); break; } }
      for (const mid in s.miti) if (st.t - s.miti[mid].tu > 2880 && s.miti[mid].n < 1) delete s.miti[mid];
      let r = 0; for (const mid in s.miti) { if (r >= CFG.raccontiOra) break; const M = s.miti[mid]; if (st.t - M.tu < 90 || rnd() > .35) continue; const a = pick(M.sa); const na = libero(st, a); if (!na || na.inside) continue;
        const b = st.npcs.find(n => n !== na && n.pop && !n.dead && !n.inside && !n.grigio && Math.abs(n.x - na.x) < 4 && Math.abs(n.y - na.y) < 4); if (!b) continue; r++; racconta(st, M, a, b.id, null); }
    }
    const gi = Math.floor(st.t / 1440); if (gi !== s.giorno) { const g0 = s.giorno; s.giorno = gi; nomeGiorno(st, g0); }
    const h = (st.t % 1440) / 60; if (h >= 8 && h < 9 && (s.reg.ult === undefined ? -1 : s.reg.ult) !== gi) { s.reg.ult = gi; manifesto(st); }
    if (s.reg.man.length && rnd() < .08) { const L = Object.keys(s.com).map(k => s.com[k]).filter(c => c.nome && (haTema(c, 'grigi') || haTema(c, 'multa') || haTema(c, 'resiste'))); if (L.length) { const M = membri(st, pick(L)).filter(id => libero(st, id)); if (M.length) parodia(st, pick(M), null); } }
  }
  const GIORNO_N = { repressione: ['Nero', 'delle Manette'], sgombero: ['dello Sgombero', 'del Trasloco'], presidio_resiste: ['della Resistenza', 'del Gran Rifiuto'], multa: ['della Multa', 'dei Verbali'], presidio_festa: ['Grasso', 'della Baldoria'], festa: ['Grasso', 'della Baldoria'],
    impresa: ['della Gloria', 'del Miracolo'], prodigio: ['dei Miracoli', 'Santo'], comica: ['del Patatrac', 'delle Risate'], rissa: ['delle Botte', 'dei Ceffoni'], strada_chiusa: ['della Strada Chiusa'], scissione: ['della Spaccatura'], nome_scelto: ['del Battesimo'],
    pesca: ['del Tonno', 'della Retata'], lancio: ['delle Ciabatte', 'dei Proiettili'], presidio: ['delle Sedie'], guasto: ['dei Disastri'] };
  function nomeGiorno(st, g) {
    const s = S(st); if (s.cal.giorni[g]) return; const best = s.gbest && s.gbest[0] === g ? FT().di(st, s.gbest[2]) : null;
    if (!best || !GIORNO_N[best.v]) return; let L = GIORNO_N[best.v].map((x, i) => [x, x, 'giorno:' + best.v + i, 1]);
    if (best.cosa || (best.x && best.x.cosa)) { const w = robaN(best.cosa || best.x.cosa).split(' ')[0]; L.push([tc(artW(w, 'di')).replace(/^D/, 'd'), stem(w), 'giorno_cosa', 1.4]); }
    if (best.x && best.x.ono) L.push([`del ${tc(String(best.x.ono).toLowerCase().replace(/[!.]/g, ''))}`, String(best.x.ono), 'giorno_ono', 1.3]);
    const suf = scegli(st, L)[0], dn = cap1(giornoN(g * 1440)), nm = /^(Nero|Grasso|Santo)$/.test(suf) ? `${dn} ${suf}` : `il ${dn} ${suf}`;
    s.cal.giorni[g] = [nm, best.id, data(st, g * 1440).s];
    scrivi(st, 'giorno_nome', [io(best.chi)].filter(Boolean), { d: `${cap1(data(st, g * 1440).s)}: in paese lo chiamano già «${nm}»` }, best.id);
  }
  function appropriazione(st, c, P) {
    stats.magliette++;
    const b = scegli(st, [[`«${cap1(P.w)}, cioè rispettare l'ordine»`, null, 'app0', 1], [`«${cap1(P.w)}: il Garante approva»`, null, 'app1', 1], [`«${cap1(P.w)} per la Patria»`, null, 'app2', 1], [`«Anche il Garante sa ${P.w}»`, null, 'app3', .8]]);
    scrivi(st, 'appropriazione', [], { d: `Il regime ha messo sui manifesti ${b[0]}. ${cap1(c.nome)} non l'ha presa bene`, parola: P.id, gruppo: c.k[0] === 'g' ? c.k.slice(2) : undefined }, P.fn || null, true);
  }
  function magliette(st, c) {
    let bott = 'una bottega del Corso'; try { const E = typeof Economia !== 'undefined' && Economia.eco ? Economia.eco(Un().st || st) : null; const L = E && E.shops ? Object.values(E.shops).filter(x => x && x.label) : []; if (L.length) bott = L[Math.floor(hashS(c.k + st.u.seme) * L.length) % L.length].label; } catch (e) { }
    const L = LG(), prezzo = L && L.soldi ? L.soldi(8 + Math.floor(rnd() * 12)) : '12.000 lire'; stats.magliette++;
    const cosa = pick(['le magliette', 'le tazze', 'gli accendini', 'le spillette', 'i portachiavi', 'i grembiuli']);
    scrivi(st, 'magliette', [], { d: `${cap1(bott)} vende ${cosa} col simbolo ${forme(c.nome)[1]} a ${prezzo}: ${c.nome} dice che è un furto, i ragazzi le comprano lo stesso`.replace(/le comprano/, /^(gli|i) /.test(cosa) ? 'li comprano' : 'le comprano'), gruppo: c.k[0] === 'g' ? c.k.slice(2) : undefined }, c.ep.length ? c.ep[0][0] : null, true);
  }
  function fase(st) {
    const s = S(st); if (!s || !st.npcs) return;
    if (DIC.length) battute(st);
    if (st.clock !== undefined && st.player) parlano(st);
    if (st.t < s.prossimo) return;
    const a = now(); s.prossimo = Math.round(st.t + CFG.battito); stats.battiti++;
    try { battito(st, s); } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.cultura', e); }
    const ms = now() - a; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
  }
  I.ascolta((st, f) => { try { ascolta(st, f); } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.cultura', e); } });
  Un().fase('unico.cultura', { dopo: GR() ? 'unico.gruppi' : 'unico.idee', budget: { p95: .03 } }, fase);
  if (Un().nasce) Un().nasce('cultura', st => { S(st); DIC.length = 0; });

  // ======================= LE BATTUTE (vicino al giocatore) =======================
  let ultimaDetta = -1e9, ultimoGiro = -1e9;
  const vicino = (st, n) => { const p = st.player; return p && n && !n.dead && !n.inside && !p.indoor && hyp(n.x - p.x, n.y - p.y) <= CFG.dire.r; };
  function say(st, n, t) { try { G.say(st, n, t, Math.min(6, 2 + t.length / 16)); stats.dette++; return true; } catch (e) { return false; } }
  function battute(st) {
    const ck = st.clock || 0;
    for (let i = DIC.length - 1; i >= 0; i--) { const [t, id, testo] = DIC[i]; if (t > ck) continue; DIC.splice(i, 1); const n = npc(st, id); if (vicino(st, n)) say(st, n, testo); }
    if (DIC.length > 12) DIC.splice(0, DIC.length - 12);
  }
  function parlano(st) {
    const ck = st.clock || 0; if (ck - ultimoGiro < CFG.dire.ogni || ck - ultimaDetta < CFG.dire.gap) return; ultimoGiro = ck;
    const s = S(st), p = st.player; if (!p || p.indoor) return;
    const L = []; for (const n of st.npcs) { if (!n.pop || n.dead || n.inside || n.grigio || (n.bark && n.bark.until > ck) || Math.abs(n.x - p.x) > CFG.dire.r || Math.abs(n.y - p.y) > CFG.dire.r) continue; if (s.sa[n.id] || (GR() && GR().gruppoDi(st, n.id))) L.push(n); if (L.length > 8) break; }
    if (!L.length) return;
    const h = k => hashS(k + Math.floor(ck / CFG.dire.ogni)), n = L[Math.floor(h('n') * L.length) % L.length];
    const g = GR() && GR().gruppoDi(st, n.id), c = g ? s.com['g:' + g.id] : null, W = sa(st, n.id);
    const altro = L.find(m => m !== n && hyp(m.x - n.x, m.y - n.y) < 4), opts = [];
    if (c && c.saluto && altro && GR().gruppoDi(st, altro.id) === g) opts.push(() => { say(st, n, c.saluto[0]); dici(st, altro.id, c.saluto[1], 1.6); });
    if (c && c.motto) opts.push(() => say(st, n, `${c.motto}!`));
    for (const P of W.slice(0, 3)) opts.push(() => { usa(st, P); say(st, n, frasePer(st, P, altro)); });
    if (altro && soprDi(st, altro.id)) opts.push(() => say(st, n, hpick([`Ehi, ${soprDi(st, altro.id)}!`, `Guarda chi c'è: ${soprDi(st, altro.id)}.`, `${soprDi(st, altro.id)}, offri tu?`], altro.id + ck)));
    if (s.prov.length) opts.push(() => say(st, n, `Come si dice: ${s.prov[Math.floor(h('p') * s.prov.length) % s.prov.length][0]}`));
    const M = Object.values(s.miti).filter(m => m.sa.includes(n.id)); if (M.length) opts.push(() => say(st, n, M[0].ult));
    if (!opts.length) return; ultimaDetta = ck; opts[Math.floor(h('o') * opts.length) % opts.length]();
  }
  function frasePer(st, P, altro) {
    const k = P.id + Math.floor((st.clock || 0) / 30), B = altro ? nome(st, altro.id) : '';
    if (P.k === 'grigi') return hpick([`Occhio, arrivano ${P.w}.`, `Hai visto ${P.w}? Sempre in giro.`, `Con ${P.w} non si scherza.`, `${cap1(P.w)} oggi sono nervosi.`], k);
    if (P.k === 'anton') return hpick([`Attento a non ${P.w}!`, `Quello lì ha proprio voluto ${P.w}.`, `Non ${P.w}, mi raccomando.`], k);
    if (P.k === 'rivale') return hpick([`${cap1(P.w)}? Lasciali perdere.`, `Hai visto ${P.w}? Che pena.`], k);
    if (P.k === 'mestiere') return hpick([`${cap1(P.w)}${B ? ', ' + B : ''}.`, `${cap1(P.w)}, come dicevano i vecchi.`], k);
    if (/(are|arsi|ire|à)$/.test(P.w) || /^(fare|stare|tenere|andare|cadere|essere|girarsi) /.test(P.w)) return hpick([`Oggi bisogna ${P.w}${B ? ', ' + B : ''}.`, `${cap1(P.w)}! Sempre.`, `Qui si sa ${P.w}, fino in fondo.`], k);
    return `${cap1(P.w)}, ${B || 'amico'}!`;
  }
  // [Lingua] le parole nate entrano nelle battute di sempre: chi le sa dice «i Taccuini» invece di «i Grigi», il soprannome invece del
  // nome, il nome di popolo del posto. Sull'hash della riga (nessun caso consumato), al più una volta ogni 5 secondi
  if (typeof G.say === 'function' && !G.say.__cultura) {
    const say0 = G.say; let ultima = -1e9;
    G.say = function (st, n, text, d) {
      try {
        if (st && st.u && st.u.cultura && n && n.pop && typeof text === 'string' && (st.clock || 0) - ultima > 5 && hashS(text + (st.t | 0)) < CFG.subst) {
          const s = st.u.cultura, W = (s.sa[n.id] || []).map(e => s.par[e[0]]).filter(Boolean); let t2 = text;
          const gr = W.find(P => P.k === 'grigi'); if (gr && /\bi Grigi\b/.test(t2)) { t2 = t2.replace(/\bi Grigi\b/, gr.w); usa(st, gr); }
          if (t2 === text) for (const id in s.sopr) { const nm = nome(st, id); if (nm && nm.length > 2 && t2.indexOf(nm) >= 0 && t2.indexOf(s.sopr[id][0]) < 0) { t2 = t2.replace(nm, s.sopr[id][0]); s.sopr[id][3]++; break; } }
          if (t2 === text) for (const l in s.topo) { const pn = placeN(l); if (pn && t2.indexOf(pn) >= 0) { t2 = t2.replace(pn, s.topo[l][0].replace(/^(il|la|lo|l')\s?/i, '')); s.topo[l][4]++; break; } }
          if (t2 !== text) { ultima = st.clock || 0; stats.sostituite++; arguments[2] = t2; }
        }
      } catch (e) { }
      return say0.apply(this, arguments);
    };
    G.say.__cultura = true;
  }

  // ======================= LA FORMA: la cultura sceglie i pezzi (UnicoParti.sito avvolto) =======================
  // Fra tre semi della stessa ricetta, nello stesso posto, vince quello con più pezzi del dettaglio della comunità che costruisce (chi ha
  // il bidone nella storia mette i fusti, chi ha la porta le porte, chi ha la seggiola le sedie). La comunità è di chi sta lì (entro 3 m).
  { const UP = UCo() && UCo().UP;
    if (UP && UP.sito && !UP.sito.__cultura) {
      const sito0 = UP.sito;
      UP.sito = function (st, tipo, o) {
        const R0 = sito0.apply(this, arguments);
        try {
          if (!R0 || !o || typeof o.x !== 'number' || !st || !st.u || !st.u.cultura || !GR()) return R0;
          let pref = null; for (const n of st.npcs) { if (Math.abs(n.x - o.x) > 3 || Math.abs(n.y - o.y) > 3) continue; const g = GR().gruppoDi(st, n.id), c = g && st.u.cultura.com['g:' + g.id]; if (c && c.pa) { pref = c.pa; c.pref = pref; break; } }
          if (!pref) return R0;
          const quanti = R => (R && R.prog ? R.prog.parti.filter(p => p[0] === pref).length : -1); let best = R0, bq = quanti(R0);
          for (let k = 1; k <= 2; k++) { const R = sito0.call(this, st, tipo, Object.assign({}, o, { seme: o.seme + '|cultura' + k })); const q = quanti(R); if (q > bq) { best = R; bq = q; } }
          if (best !== R0) stats.forme++;
          return best;
        } catch (e) { return R0; }
      };
      UP.sito.__cultura = true;
    } }

  // ======================= IL DISEGNO DEL SIMBOLO (canvas 2D) =======================
  const INK = '#16121B', CARTA = '#F2E7CF';
  function sagoma(x, f, S0) {
    const c = S0 / 2, r = S0 * .44; x.beginPath();
    if (f === 'cerchio') x.arc(c, c, r, 0, Math.PI * 2);
    else if (f === 'scudo') { x.moveTo(c - r, c - r * .8); x.lineTo(c + r, c - r * .8); x.lineTo(c + r, c); x.quadraticCurveTo(c + r, c + r * .7, c, c + r); x.quadraticCurveTo(c - r, c + r * .7, c - r, c); x.closePath(); }
    else if (f === 'stella') for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .55 : r * 1.05; x.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
    else if (f === 'rombo') { x.moveTo(c, c - r); x.lineTo(c + r, c); x.lineTo(c, c + r); x.lineTo(c - r, c); }
    else if (f === 'sole') for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, rr = i % 2 ? r * .84 : r; x.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
    else { x.save(); x.translate(c, c); x.rotate(-.08); x.rect(-r * .9, -r * .9, r * 1.8, r * 1.8); x.restore(); }
    x.closePath();
  }
  // gli oggetti, in unità del quadrato (u = lato/100), centrati
  const DIS = {
    bidone: (x, u) => { x.beginPath(); x.ellipse(50 * u, 30 * u, 17 * u, 5 * u, 0, 0, 7); x.moveTo(33 * u, 30 * u); x.lineTo(33 * u, 70 * u); x.ellipse(50 * u, 70 * u, 17 * u, 5 * u, 0, Math.PI, 0, true); x.lineTo(67 * u, 30 * u); x.fill(); x.stroke(); for (const y of [44, 56]) { x.beginPath(); x.moveTo(33 * u, y * u); x.lineTo(67 * u, y * u); x.stroke(); } },
    porta: (x, u) => { x.beginPath(); x.rect(36 * u, 24 * u, 28 * u, 52 * u); x.fill(); x.stroke(); x.beginPath(); x.rect(40 * u, 29 * u, 20 * u, 18 * u); x.stroke(); x.beginPath(); x.arc(58 * u, 54 * u, 2.5 * u, 0, 7); x.stroke(); },
    sedia: (x, u) => { x.beginPath(); x.rect(38 * u, 22 * u, 6 * u, 54 * u); x.rect(38 * u, 48 * u, 26 * u, 6 * u); x.rect(58 * u, 54 * u, 6 * u, 22 * u); x.fill(); x.stroke(); },
    ruota: (x, u) => { x.beginPath(); x.arc(50 * u, 50 * u, 24 * u, 0, 7); x.fill(); x.stroke(); x.beginPath(); x.arc(50 * u, 50 * u, 9 * u, 0, 7); x.stroke(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; x.beginPath(); x.moveTo(50 * u + Math.cos(a) * 9 * u, 50 * u + Math.sin(a) * 9 * u); x.lineTo(50 * u + Math.cos(a) * 24 * u, 50 * u + Math.sin(a) * 24 * u); x.stroke(); } },
    tavolo: (x, u) => { x.beginPath(); x.rect(26 * u, 40 * u, 48 * u, 7 * u); x.rect(31 * u, 47 * u, 5 * u, 26 * u); x.rect(64 * u, 47 * u, 5 * u, 26 * u); x.fill(); x.stroke(); },
    fiore: (x, u) => { x.beginPath(); x.moveTo(50 * u, 52 * u); x.lineTo(50 * u, 78 * u); x.stroke(); for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; x.beginPath(); x.arc(50 * u + Math.cos(a) * 11 * u, 40 * u + Math.sin(a) * 11 * u, 8 * u, 0, 7); x.fill(); x.stroke(); } x.beginPath(); x.arc(50 * u, 40 * u, 5 * u, 0, 7); x.stroke(); },
    pentola: (x, u) => { x.beginPath(); x.rect(30 * u, 44 * u, 40 * u, 28 * u); x.fill(); x.stroke(); x.beginPath(); x.moveTo(24 * u, 48 * u); x.lineTo(30 * u, 48 * u); x.moveTo(70 * u, 48 * u); x.lineTo(76 * u, 48 * u); x.moveTo(42 * u, 36 * u); x.quadraticCurveTo(38 * u, 28 * u, 44 * u, 22 * u); x.moveTo(56 * u, 36 * u); x.quadraticCurveTo(52 * u, 28 * u, 58 * u, 22 * u); x.stroke(); },
    pesce: (x, u) => { x.beginPath(); x.ellipse(46 * u, 50 * u, 20 * u, 11 * u, 0, 0, 7); x.moveTo(64 * u, 50 * u); x.lineTo(78 * u, 38 * u); x.lineTo(78 * u, 62 * u); x.closePath(); x.fill(); x.stroke(); x.beginPath(); x.arc(36 * u, 47 * u, 2.5 * u, 0, 7); x.stroke(); },
    chiave: (x, u) => { x.beginPath(); x.arc(34 * u, 50 * u, 11 * u, 0, 7); x.fill(); x.stroke(); x.beginPath(); x.moveTo(45 * u, 50 * u); x.lineTo(76 * u, 50 * u); x.moveTo(68 * u, 50 * u); x.lineTo(68 * u, 60 * u); x.moveTo(76 * u, 50 * u); x.lineTo(76 * u, 62 * u); x.stroke(); },
    tamburo: (x, u) => { x.beginPath(); x.ellipse(50 * u, 42 * u, 20 * u, 7 * u, 0, 0, 7); x.moveTo(30 * u, 42 * u); x.lineTo(30 * u, 66 * u); x.ellipse(50 * u, 66 * u, 20 * u, 7 * u, 0, Math.PI, 0, true); x.lineTo(70 * u, 42 * u); x.fill(); x.stroke(); x.beginPath(); x.moveTo(36 * u, 20 * u); x.lineTo(56 * u, 40 * u); x.moveTo(64 * u, 20 * u); x.lineTo(46 * u, 40 * u); x.stroke(); },
    furgone: (x, u) => { x.beginPath(); x.rect(24 * u, 36 * u, 40 * u, 26 * u); x.moveTo(64 * u, 44 * u); x.lineTo(74 * u, 44 * u); x.lineTo(78 * u, 54 * u); x.lineTo(78 * u, 62 * u); x.lineTo(64 * u, 62 * u); x.fill(); x.stroke(); for (const cx of [34, 68]) { x.beginPath(); x.arc(cx * u, 64 * u, 6 * u, 0, 7); x.fillStyle = INK; x.fill(); } },
    foglio: (x, u) => { x.beginPath(); x.rect(34 * u, 24 * u, 32 * u, 50 * u); x.fill(); x.stroke(); for (const y of [34, 42, 50]) { x.beginPath(); x.moveTo(39 * u, y * u); x.lineTo(61 * u, y * u); x.stroke(); } x.beginPath(); x.arc(56 * u, 64 * u, 6 * u, 0, 7); x.stroke(); x.beginPath(); x.moveTo(30 * u, 72 * u); x.lineTo(70 * u, 26 * u); x.stroke(); },
    ancora: (x, u) => { x.beginPath(); x.moveTo(50 * u, 26 * u); x.lineTo(50 * u, 74 * u); x.moveTo(38 * u, 36 * u); x.lineTo(62 * u, 36 * u); x.moveTo(30 * u, 58 * u); x.quadraticCurveTo(34 * u, 76 * u, 50 * u, 74 * u); x.quadraticCurveTo(66 * u, 76 * u, 70 * u, 58 * u); x.stroke(); x.beginPath(); x.arc(50 * u, 22 * u, 4 * u, 0, 7); x.stroke(); },
    sole: (x, u) => { x.beginPath(); x.arc(50 * u, 50 * u, 14 * u, 0, 7); x.fill(); x.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(50 * u + Math.cos(a) * 19 * u, 50 * u + Math.sin(a) * 19 * u); x.lineTo(50 * u + Math.cos(a) * 27 * u, 50 * u + Math.sin(a) * 27 * u); x.stroke(); } },
    luna: (x, u) => { x.beginPath(); x.arc(50 * u, 50 * u, 22 * u, Math.PI * .3, Math.PI * 1.7); x.arc(60 * u, 50 * u, 17 * u, Math.PI * 1.55, Math.PI * .45, true); x.closePath(); x.fill(); x.stroke(); },
    lamiera: (x, u) => { x.beginPath(); x.moveTo(24 * u, 60 * u); for (let i = 0; i < 6; i++) x.lineTo((30 + i * 9) * u, (i % 2 ? 60 : 40) * u); x.lineTo(78 * u, 60 * u); x.stroke(); x.beginPath(); x.moveTo(24 * u, 70 * u); for (let i = 0; i < 6; i++) x.lineTo((30 + i * 9) * u, (i % 2 ? 70 : 50) * u); x.lineTo(78 * u, 70 * u); x.stroke(); },
    lettera: (x, u, sim) => { const L = (sim && sim.l) || '?'; x.font = 'bold ' + Math.round(62 * u) + 'px "Arial Black", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.save(); x.translate(50 * u, 53 * u); x.rotate(-.12); x.lineWidth = Math.max(3, 9 * u); x.strokeText(L, 0, 0); x.fillText(L, 0, 0); x.beginPath(); x.moveTo(-24 * u, 30 * u); x.lineTo(26 * u, 26 * u); x.stroke(); x.restore(); },
    cassa: (x, u) => { x.beginPath(); x.rect(30 * u, 34 * u, 40 * u, 34 * u); x.fill(); x.stroke(); x.beginPath(); x.moveTo(30 * u, 34 * u); x.lineTo(70 * u, 68 * u); x.moveTo(70 * u, 34 * u); x.lineTo(30 * u, 68 * u); x.stroke(); },
  };
  function extra(x, k, S0, col) {
    const u = S0 / 100; x.strokeStyle = INK; x.fillStyle = col;
    if (k === 'stelle') for (const [a, b] of [[22, 22], [78, 24]]) { x.beginPath(); for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 2.4 : 5.5) * u; x.lineTo(a * u + Math.cos(t) * rr, b * u + Math.sin(t) * rr); } x.closePath(); x.fill(); x.stroke(); }
    else if (k === 'onde') { x.beginPath(); for (let i = 0; i <= 8; i++) x.lineTo((26 + i * 6) * u, (84 + (i % 2 ? -3 : 3)) * u); x.stroke(); }
    else if (k === 'raggi') for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo((40 + i * 10) * u, 10 * u); x.lineTo((40 + i * 10) * u, 16 * u); x.stroke(); }
    else if (k === 'lumino') { x.beginPath(); x.rect(74 * u, 70 * u, 8 * u, 10 * u); x.fill(); x.stroke(); x.fillStyle = '#DC9A34'; x.beginPath(); x.ellipse(78 * u, 64 * u, 2.5 * u, 4.5 * u, 0, 0, 7); x.fill(); }
    else if (k === 'timbro') { x.beginPath(); x.arc(76 * u, 76 * u, 8 * u, 0, 7); x.stroke(); x.beginPath(); x.moveTo(70 * u, 76 * u); x.lineTo(82 * u, 76 * u); x.stroke(); }
    else if (k === 'crepa') { x.beginPath(); x.moveTo(50 * u, 6 * u); x.lineTo(46 * u, 20 * u); x.lineTo(54 * u, 30 * u); x.lineTo(48 * u, 40 * u); x.stroke(); }
  }
  // disegna il simbolo su un contesto (x0, y0, lato S0)
  function disegna(x, sim, x0, y0, S0) {
    if (!sim) return; x.save(); x.translate(x0, y0); x.lineJoin = 'round'; x.lineCap = 'round';
    sagoma(x, sim.f, S0); x.fillStyle = sim.c[0]; x.fill(); x.lineWidth = Math.max(2, S0 * .06); x.strokeStyle = INK; x.stroke();
    x.lineWidth = Math.max(1.5, S0 * .045); x.fillStyle = sim.c[1] === sim.c[0] ? CARTA : sim.c[1]; x.strokeStyle = INK;
    (DIS[sim.d] || DIS.lettera)(x, S0 / 100, sim);
    extra(x, sim.x, S0, sim.c[1]); x.restore();
  }
  UCu.disegna = disegna;
  const URL = {};
  function urlSimbolo(sim, S0) {
    const k = JSON.stringify(sim) + (S0 || 64); if (URL[k] !== undefined) return URL[k];
    if (typeof document === 'undefined' || !document.createElement) return (URL[k] = '');
    try { const c = document.createElement('canvas'); c.width = c.height = S0 || 64; const x = c.getContext('2d'); if (!x) return (URL[k] = ''); disegna(x, sim, 0, 0, S0 || 64); return (URL[k] = c.toDataURL('image/png')); } catch (e) { return (URL[k] = ''); }
  }
  UCu.urlSimbolo = urlSimbolo;

  // ======================= LO STRISCIONE (UnicoPartiVivo.extra avvolto: il nome e il simbolo sopra la scritta) =======================
  // Il nome sta anche in C.nome (lo striscione di unico_parti_vivo.js lo legge, dove c'è); qui sopra la tela si mette la tela nostra, col
  // nome adattato alla larghezza e il simbolo ai due capi al posto delle stelle d'inchiostro. Se il nome cambia, il gruppo si rifà.
  const UVx = () => (typeof UnicoPartiVivo !== 'undefined' && UnicoPartiVivo.ON ? UnicoPartiVivo : null);
  function rifaiStriscione(C) { const V = UVx(); if (V && V.VIS && V.VIS.per && V.VIS.per[C.id]) V.VIS.per[C.id].userData.chiave = '·'; }
  const TELE = {};
  function tela(T3, testo, sim, asp) {
    const k = testo + '|' + JSON.stringify(sim) + '|' + asp; if (TELE[k]) return TELE[k];
    const H = 160, W = Math.min(2048, Math.round(H * asp / 4) * 4), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = CARTA; x.fillRect(0, 0, W, H); x.strokeStyle = INK; x.lineWidth = 7; x.strokeRect(4, 4, W - 8, H - 8);
    const side = sim ? H * .78 : 0, pad = sim ? side + 28 : 24;
    if (sim) { disegna(x, sim, 14, (H - side) / 2, side); disegna(x, sim, W - 14 - side, (H - side) / 2, side); }
    let fs = 104; x.font = 'bold ' + fs + 'px "Arial Black", Impact, sans-serif'; const mw = W - pad * 2; while (fs > 34 && x.measureText(testo).width > mw) { fs -= 4; x.font = 'bold ' + fs + 'px "Arial Black", Impact, sans-serif'; }
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = Math.max(8, fs * .15); x.strokeStyle = INK; x.strokeText(testo, W / 2, H * .54, mw);
    x.fillStyle = sim ? sim.c[0] : '#C25B36'; x.fillText(testo, W / 2, H * .54, mw);
    const t = new T3.CanvasTexture(c); if (T3.SRGBColorSpace) t.colorSpace = T3.SRGBColorSpace;
    return (TELE[k] = new T3.MeshStandardMaterial({ map: t, roughness: .9, side: T3.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }));
  }
  { const V = UVx();
    if (V && typeof window !== 'undefined' && !V.__cultura) {
      V.__cultura = true; let ex0 = V.extra;
      const nostro = (C, out, T3) => {
        try {
          if (ex0) ex0(C, out, T3);
          const st = Un() && Un().st; if (!st || !st.u || !st.u.cultura || !C.nome || !V.matParte) return;
          const c = comPerCantiere(st, C) || (GR() && C.gruppo ? (() => { for (const id of C.gruppo) { const g = GR().gruppoDi(st, id); if (g && st.u.cultura.com['g:' + g.id] && st.u.cultura.com['g:' + g.id].nome) return st.u.cultura.com['g:' + g.id]; } return null; })() : null);
          const UP = UCo() && UCo().UP; if (!UP) return;
          for (const p of C.piano) {
            if (p[0] !== 'scritta' && p[0] !== 'striscione') continue; const d = UP.dimDi(p), L = d[0], H = d[2], m = tela(T3, C.nome, c ? c.sim : null, L / H), g = new T3.PlaneGeometry(L, H), M = V.matParte(p);
            out.push([g, m, M.clone().multiply(new T3.Matrix4().makeTranslation(0, 0, .011))]);
            out.push([g, m, M.clone().multiply(new T3.Matrix4().makeRotationY(Math.PI).premultiply(new T3.Matrix4().makeTranslation(0, 0, -.011)))]);
          }
        } catch (e) { }
      };
      // il presidio può rimettere il suo extra dopo di noi: la proprietà tiene il nostro in cima
      try { Object.defineProperty(V, 'extra', { configurable: true, get: () => nostro, set: f => { if (f !== nostro) ex0 = f; } }); } catch (e) { V.extra = nostro; }
    } }

  // ======================= I SEGNI, LA MEMORIA, LE IDEE, IL REGISTA =======================
  const Sg = SG();
  if (Sg && Sg.TIPI) Object.assign(Sg.TIPI, {
    nome_proposto: { p: 'fumetto', w: 'come ci chiamiamo?', posa: 'discute', gz: .4, n: ['nome proposto', 'nomi proposti'] },
    nome_scelto: { p: 'esclamativo', w: 'il nostro nome', posa: 'discute', gz: .8, n: ['nome nuovo', 'nomi nuovi'] },
    parola_nuova: { p: 'fumetto', w: 'si dice così', gz: .35, n: ['modo di dire', 'modi di dire'] }, parola_storpiata: { p: 'fumetto', w: 'si dice così', gz: .2, n: ['parola storpiata', 'parole storpiate'], bolla: false },
    parola_morta: { p: 'fumetto', gz: .1, n: ['parola dimenticata', 'parole dimenticate'], bolla: false }, contagio: { p: 'frecce', gz: .2, n: ['parola che passa', 'parole che passano'], bolla: false },
    soprannome: { p: 'fumetto', w: 'ciao, $sopr', gz: .35, n: ['soprannome', 'soprannomi'] }, toponimo: { p: 'casetta', gz: .35, n: ['nome di popolo', 'nomi di popolo'], bolla: false },
    rettifica: { p: 'esclamativo', gz: .5, n: ['rettifica', 'rettifiche'], bolla: false }, manifesto: { p: 'esclamativo', gz: .45, n: ['manifesto', 'manifesti'], bolla: false },
    parodia: { p: 'bomboletta', w: 'così è giusto', posa: 'vernicia', gz: .55, n: ['parodia', 'parodie'] }, proverbio: { p: 'fumetto', gz: .3, n: ['proverbio', 'proverbi'], bolla: false },
    superstizione: { p: 'fumetto', gz: .3, n: ['superstizione', 'superstizioni'], bolla: false }, mito_nato: { p: 'esclamativo', gz: .45, n: ['storia nuova', 'storie nuove'], bolla: false },
    leggenda: { p: 'fumetto', w: 'io c\'ero', posa: 'discute', gz: .4, n: ['leggenda', 'leggende'] }, rito: { p: 'cuore', w: 'tutti insieme', posa: 'discute', gz: .45, n: ['rito', 'riti'] },
    canto: { p: 'fumetto', w: '♪', posa: 'balla', gz: .35, n: ['canto', 'canti'] }, simbolo_conteso: { p: 'muso', gz: .6, n: ['simbolo conteso', 'simboli contesi'] },
    appropriazione: { p: 'esclamativo', gz: .5, n: ['parola rubata', 'parole rubate'], bolla: false }, magliette: { p: 'moneta', gz: .5, n: ['magliette', 'magliette'], bolla: false },
    giorno_nome: { p: 'orologio', gz: .3, n: ['giorno col nome', 'giorni col nome'], bolla: false },
  });
  const Fg = FT().GRAV; if (Fg) Object.assign(Fg, { nome_proposto: .35, nome_scelto: .6, parola_nuova: .35, parola_storpiata: .2, parola_morta: .15, contagio: .25, soprannome: .35, toponimo: .35, rettifica: .45, manifesto: .4, parodia: .5, proverbio: .3, superstizione: .3, mito_nato: .45, leggenda: .4, rito: .45, canto: .3, simbolo_conteso: .55, appropriazione: .5, magliette: .45, giorno_nome: .3 });
  if (I.DA_FATTI) Object.assign(I.DA_FATTI, { nome_scelto: [['chi', '@gruppo', 'orgoglio', .4, .35]], rito: [['part', '@gruppo', 'orgoglio', .3, .3]], parodia: [['test', 'grigi', 'disprezzo', -.2, .2]], manifesto: [['test', 'grigi', 'fastidio', -.12, .12]], simbolo_conteso: [['chi', '@con0', 'rancore', -.3, .3]] });
  const R = RG();
  if (R && R.FAMIGLIE && R.TIPI_FILO) {
    R.FAMIGLIE.leggenda = { domanda: 'la leggenda cresce?', finestra: 2880, base: .1, chiave: 'x.mito', spinte: { narratore: ['socializzare', 1.4] }, calma: { narratore: ['socializzare', .85] },
      titolo: '{cosa_d}', fine: { sfumato: '{cosa_d}: non la racconta più nessuno' } };
    const T_ = R.TIPI_FILO; T_.mito_nato = [{ fam: 'leggenda', m: 'apre', r: { narratore: 'chi' } }]; T_.leggenda = [{ fam: 'leggenda', m: 'avanza', r: { narratore: 'chi', ascolta: 'con0' } }];
    for (const t of ['nome_proposto', 'nome_scelto', 'simbolo_conteso', 'rito']) T_[t] = T_[t] || [{ fam: 'gruppo', m: 'avanza', r: { capo: 'chi', membro: 'con0' } }];
    if (R.ROUTINE) for (const t of ['parola_nuova', 'parola_storpiata', 'parola_morta', 'contagio', 'giorno_nome', 'canto']) R.ROUTINE.add(t);
    Object.assign(R.GT, { nome_scelto: .12, simbolo_conteso: .3, parodia: .15, rettifica: .1, leggenda: .06, mito_nato: .1, rito: .05, magliette: .1, appropriazione: .2 });
    try { R.problemi = R.controlla(); } catch (e) { }
  }

  // ======================= LA SCHEDA «CULTURA» DEL TACCUINO =======================
  const img = (sim, px) => { const u = sim ? urlSimbolo(sim, 64) : ''; return u ? `<img src="${u}" alt="" style="width:${px}px;height:${px}px;vertical-align:middle;margin-right:6px">` : ''; };
  function html(st) {
    const s = S(st); if (!s) return '';
    const C = Object.values(s.com).filter(c => c.nome && c.k[0] !== 'm'), Ms = Object.values(s.com).filter(c => c.k[0] === 'm');
    let h = '<p class="hint">Come si chiamano, che cosa dicono, che cosa raccontano: la cultura che il paese si è fatto da solo.</p><h4>Le comunità</h4><ul>';
    h += C.length ? C.map(c => `<li>${img(c.sim, 34)}<b>${esc(c.nome)}</b>${c.nomi.length > 1 ? ` <small>(prima: ${esc(c.nomi.slice(0, -1).map(x => x[0]).join(', '))})</small>` : ''}<br><small>${esc([
      c.motto && `motto: «${c.motto}»`, c.saluto && `saluto: «${c.saluto[0]}» «${c.saluto[1]}»`, c.moda && `portano ${c.moda}`, c.segno && `il segno: ${c.segno}`, c.tag && `la tag: ${c.tag}`, c.piatto && `il piatto: ${c.piatto}`, c.santo && `il santo: ${c.santo}`,
      c.canto && `cantano: «${c.canto.join(' ')}»`, c.pref && `costruiscono con: ${c.pref}`].filter(Boolean).join(' · '))}</small></li>`).join('') : '<li><span style="opacity:.7">Ancora nessuna, che tu sappia.</span></li>';
    h += '</ul>';
    const W = Object.values(s.par).sort((a, b) => (b.n || 0) - (a.n || 0)).slice(0, 14);
    if (W.length) h += '<h4>Parole che girano</h4><ul>' + W.map(P => `<li><b>«${esc(P.w)}»</b> <small>= ${esc(P.s)}${P.com && s.com[P.com] && s.com[P.com].nome ? ' · ' + esc(forme(s.com[P.com].nome)[1]) : ''} · lo dicono in ${P.n || 0}</small></li>`).join('') + '</ul>';
    const So = Object.keys(s.sopr).slice(-10); if (So.length) h += '<h4>Soprannomi</h4><p><small>' + esc(So.map(id => s.sopr[id][0]).join(' · ')) + '</small></p>';
    const Tp = Object.keys(s.topo).concat(Object.keys(s.reg.vie).filter(l => !s.topo[l])); if (Tp.length) h += '<h4>Come chiamano i posti</h4><ul>' + Tp.map(l => `<li>${esc(placeN(l))}: ${s.topo[l] ? '<b>«' + esc(s.topo[l][0]) + '»</b>' : ''}${s.reg.vie[l] ? ` <small>(per l'Ufficio Rettifiche: «${esc(s.reg.vie[l])}»)</small>` : ''}</li>`).join('') + '</ul>';
    const Mi = Object.values(s.miti).sort((a, b) => b.n - a.n).slice(0, 5); if (Mi.length) h += '<h4>Si racconta</h4><ul>' + Mi.map(M => `<li>${esc(M.ult)} <small>(raccontata ${M.n} volt${M.n === 1 ? 'a' : 'e'})</small></li>`).join('') + '</ul>';
    if (s.prov.length || s.sup.length) h += '<h4>Proverbi e superstizioni</h4><ul>' + s.prov.slice(-5).map(x => `<li>«${esc(x[0])}»</li>`).join('') + s.sup.slice(-4).map(x => `<li><i>«${esc(x[0])}»</i></li>`).join('') + '</ul>';
    if (s.reg.man.length) h += '<h4>I manifesti del Garante</h4><ul>' + s.reg.man.slice(-3).map(m => { const p = s.reg.par.find(x => x[1] === m[0]); return `<li>«${esc(m[0])}»${p ? ` → <b>«${esc(p[0])}»</b>` : ''}</li>`; }).join('') + '</ul>';
    const cal = Object.keys(s.cal.giorni).map(g => [s.cal.giorni[g][2], s.cal.giorni[g][0]]).concat(s.cal.feste.map(f => [f[0], f[1] + ' (ogni anno)']));
    if (cal.length) h += '<h4>Il calendario del paese</h4><ul>' + cal.slice(-10).map(x => `<li><small>${esc(x[0])}</small> · ${esc(x[1])}</li>`).join('') + '</ul>';
    if (Ms.length) h += '<h4>I mestieri</h4><ul>' + Ms.map(c => `<li><b>${esc(c.nome)}</b>: ${esc(Object.values(s.par).filter(P => P.com === c.k).map(P => '«' + P.w + '» (' + P.s + ')').join(', ') || '…')}${c.canto ? `<br><small>«${esc(c.canto.join(' '))}»</small>` : ''}</li>`).join('') + '</ul>';
    if (DEBUG) h += `<p><small>${esc(JSON.stringify(stats))}</small></p>`;
    return h;
  }
  if (Sg && Sg.scheda) Sg.scheda('u_cultura', 'Cultura', html);

  Object.assign(UCu, { S, html, candidati, cerimonia, fondaPresidio, simbolo, distico, versione, racconta, nuovaParola, soprannome, comPerCantiere, membri, data, _: { DIC, ascolta, battito } });
  Un().Cultura = UCu;
  return UCu;
})();
if (typeof window !== 'undefined') window.UnicoCultura = UnicoCultura;
