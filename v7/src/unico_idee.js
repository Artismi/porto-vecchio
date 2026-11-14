/* [unico] unico_idee.js: LE IDEE CHE GIRANO (le fondamenta dell'emergenza aperta; la consegna: commedia/REGISTA_CONSEGNA.md, «Le idee e i
   gruppi»). Dietro ?commedia. Spento il flag: UnicoIdee = { ON: false } e nient'altro (nessuna fase, nessun innesto nella Mente).

   CHE COSA SONO. Un'idea è un DATO: un soggetto (i Grigi, una persona, un gruppo, un posto, il mare, i soldi, una nozione assurda:
   la luna, i gabbiani, la statua del Garante…), un tema (rancore, paura, affetto, orgoglio, sogno, credenza…), una valenza (−1..1) e
   un'intensità (0..1). Ogni abitante ne tiene al più CFG.max; la più debole lascia il posto a una più forte.
   DA DOVE VENGONO. Dai FATTI (la tabella DA_FATTI, solo dati: un tipo → chi la prende, su chi, quale tema, quanto): il furto, la rissa,
   la multa e il fermo dei Grigi (Popolo.note avvolto: i tag 'multa', 'fermato', 'arresto' diventano i fatti «multa» e «fermato»), la
   festa, la pesca grossa, il regalo, il prestito, la barricata, la repressione di un gruppo… E dalle COINCIDENZE: due fatti dello
   stesso tipo nello stesso posto a poca distanza diventano un «prodigio» per chi è credulone (il molo porta fortuna, la fontana porta
   male, le campane suonano da sole).
   COME GIRANO. Sulle chiacchiere che ci sono già (il verbo «chiacchiera» e le «voci»): chi racconta passa anche l'idea che c'entra col
   fatto raccontato (o la sua più forte). Passa con una probabilità che dipende dall'intensità, dal carisma di chi parla e dai tratti
   di chi ascolta: il CREDULONE la prende, il TESTARDO la rifiuta se ne ha una contraria, il BASTIAN CONTRARIO la rovescia. Ogni tanto
   la diceria SBAGLIA (l'errore creativo): la colpa del ladro passa ai Grigi, la rabbia diventa una storia sui gabbiani.
   L'ACCUMULO. Ogni ora, per quartiere (World.districtAt della casa) e per soggetto, si sommano le idee (valenza × intensità): oltre la
   soglia il quartiere ha una IDEA DI QUARTIERE (il risentimento contro i Grigi, l'orgoglio per il molo) con la sua pressione; il fatto
   «pressione» la annuncia e «pressione_cala» la chiude. Chi ascolta nel suo quartiere un'idea che il quartiere ha già la prende di più.
   I TRATTI (il rumore): follia, zelo, viltà, carisma, credulità, testardaggine, spirito di contraddizione; da un hash (seme, id), quasi
   sempre bassi, qualche volta estremi (un pazzo vero, un fanatico, un vigliacco, un trascinatore). Stanno in st.u.idee.tr, dati.
   LA MENTE. Le idee spostano le utilità (Mente.innesti.spinta, a catena con quella del regista): chi ce l'ha coi Grigi dipinge e si
   vendica di più, chi sogna il mare pesca, chi crede nella luna va in chiesa e ne parla. Mai un obiettivo nuovo deciso da qui.
   LO STATO in st.u.idee, solo dati: { v, ultimo, per: { id: [[k, val, int, t, fid]] }, cat: { k: [nate, prese, t0, fid] }, tr: { id: {…} },
   q: { quartiere: { soggetto: [p, acceso, t] } }, coinc: {…}, conti, bud }. Il caso: il flusso 'idee' della porta (st.u.rng.idee).
   LE ENTRATE: UnicoIdee.di(st, id), tratti(st, id), testo(st, id, k), adotta(st, id, s, tema, val, int, fid), pressione(st, q),
   top(st, n), ascolta(fn) (gli altri moduli: ogni fatto nuovo, con l'idea passata se è una chiacchiera), nomeS(st, s), CFG, stats. */
var UnicoIdee = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UI = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UI;
  if (!ON) return UI;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const ME = () => { const M = (typeof Unico !== 'undefined' && Unico.Mente) || (typeof MenteUnica !== 'undefined' ? MenteUnica : null); return M && M.ON ? M : null; };
  const SG = () => (typeof Segni !== 'undefined' && Segni.ON ? Segni : null);
  const LG = () => (typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null);
  if (!G || !Un() || !FT() || !ME()) { UI.ON = false; return UI; }
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), r2 = x => Math.round(x * 100) / 100;
  const rnd = () => Un().flusso('idee');
  const hashS = s => { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
  const io = id => (id === 'player' ? 'nino' : id == null ? null : String(id));

  const CFG = UI.CFG = { battito: 10, max: 4, decad: .8, minInt: .08, fattiBattito: 400, ora: 60, fattiGiorno: 70, prodigiGiorno: 4,
    soglia: 3, sogliaCala: 1.5, conformita: 1.35, mutazione: .07, coincMin: 45 };
  const stats = UI.stats = { battiti: 0, ms: 0, msMax: 0, nate: 0, passate: 0, rifiutate: 0, rovesciate: 0, mutate: 0, prodigi: 0, quartieri: 0, fatti: 0 };

  // ======================= I SOGGETTI E I TEMI (solo dati) =======================
  // i soggetti fissi: [det, di, a]; le nozioni assurde: [det, di, a, il predicato della credenza]
  const FISSI = { grigi: ['i Grigi', 'dei Grigi', 'ai Grigi'], mare: ['il mare', 'del mare', 'al mare'], soldi: ['i soldi', 'dei soldi', 'ai soldi'] };
  const ASSURDI = UI.ASSURDI = {
    luna: ['la luna', 'della luna', 'alla luna', 'guarda chi dorme al molo'], gabbiani: ['i gabbiani', 'dei gabbiani', 'ai gabbiani', 'sanno chi ruba'],
    faro: ['il faro', 'del faro', 'al faro', 'di notte manda segnali a qualcuno'], sirene: ['le sirene', 'delle sirene', 'alle sirene', 'cantano sotto la Calata'],
    statua: ['la statua del Garante', 'della statua del Garante', 'alla statua del Garante', 'ha pianto'], orologio: ['l\'orologio della piazza', 'dell\'orologio della piazza', 'all\'orologio della piazza', 'va all\'indietro apposta'],
    piccioni: ['i piccioni', 'dei piccioni', 'ai piccioni', 'sono spie dei Grigi'], tonno: ['il tonno grosso', 'del tonno grosso', 'al tonno grosso', 'tornerà a primavera'],
    campane: ['le campane', 'delle campane', 'alle campane', 'suonano da sole quando arriva un guaio'], torre: ['la torre sul molo', 'della torre sul molo', 'alla torre sul molo', 'ci salverebbe tutti'],
    tram: ['il tram', 'del tram', 'al tram', 'tornerà a passare'], libeccio: ['il libeccio', 'del libeccio', 'al libeccio', 'porta via i cattivi pensieri'],
  };
  // il tema: la frase ({A} chi, {S} il soggetto, {di_S}, {a_S}); il contrario (lo spirito di contraddizione); il segno di base
  const TEMI = UI.TEMI = {
    rancore: ['{A} ce l\'ha con {S}', 'affetto', -1], odio: ['{A} non sopporta più {S}', 'fiducia', -1], paura: ['{A} ha paura {di_S}', 'fiducia', -1],
    disprezzo: ['{A} disprezza {S}', 'ammirazione', -1], fastidio: ['{A} è stufo {di_S}', 'affetto', -1], affetto: ['{A} vuole bene {a_S}', 'rancore', 1],
    fiducia: ['{A} si fida {di_S}', 'disprezzo', 1], orgoglio: ['{A} va fiero {di_S}', 'disprezzo', 1], sogno: ['{A} sogna {S}', 'paura', 1],
    ammirazione: ['{A} ammira {S}', 'disprezzo', 1], curiosita: ['{A} è curioso {di_S}', 'fastidio', 1], speranza: ['{A} spera {in_S}', 'paura', 1],
    credenza: ['{A} crede che {S} {pred}', 'credenza', 1], fortuna: ['{A} crede che {S} porti fortuna', 'sfortuna', 1], sfortuna: ['{A} crede che {S} porti male', 'fortuna', -1],
  };
  // DA_FATTI[tipo] = [[chi la prende ('chi'|'con0'|'con'|'test'|'part'), soggetto ('grigi'|'mare'|'soldi'|'@chi'|'@con0'|'@luogo'|'@gruppo'), tema, val, int]]
  const DA_FATTI = UI.DA_FATTI = {
    furto: [['con0', '@chi', 'rancore', -.6, .6], ['test', '@chi', 'disprezzo', -.35, .35], ['con0', 'soldi', 'paura', -.3, .25]],
    rissa: [['chi', '@con0', 'rancore', -.5, .5], ['con0', '@chi', 'rancore', -.5, .5], ['test', '@luogo', 'paura', -.25, .25]],
    lite: [['con0', '@chi', 'rancore', -.35, .35], ['chi', '@con0', 'fastidio', -.25, .25]], muso: [['con0', '@chi', 'fastidio', -.25, .25]],
    rinfacciato: [['con0', '@chi', 'rancore', -.3, .3]], buca: [['con0', '@chi', 'fastidio', -.3, .3]], parola_rotta: [['con0', '@chi', 'rancore', -.35, .35]],
    denuncia: [['con0', '@chi', 'rancore', -.55, .55], ['con0', 'grigi', 'odio', -.3, .3]],
    regalo: [['con0', '@chi', 'affetto', .4, .4]], prestito: [['con0', '@chi', 'fiducia', .35, .35]], saldato: [['con0', '@chi', 'fiducia', .3, .3]],
    restituito: [['con0', '@chi', 'fiducia', .3, .3]], incontro: [['chi', '@con0', 'affetto', .2, .2], ['con0', '@chi', 'affetto', .2, .2]],
    multa: [['chi', 'grigi', 'rancore', -.4, .35], ['test', 'grigi', 'fastidio', -.2, .15]],
    fermato: [['chi', 'grigi', 'odio', -.7, .6], ['test', 'grigi', 'paura', -.4, .3], ['con', 'grigi', 'odio', -.5, .45]],
    controllo: [['chi', 'grigi', 'fastidio', -.15, .2]],
    grigi: [['part', 'grigi', 'rancore', -.5, .5], ['test', 'grigi', 'paura', -.3, .3]], arresto: [['con', 'grigi', 'odio', -.6, .6], ['test', 'grigi', 'paura', -.4, .4]],
    repressione: [['con0', 'grigi', 'odio', -.85, .85], ['part', 'grigi', 'odio', -.6, .6], ['test', 'grigi', 'paura', -.45, .45]],
    sgombero: [['part', 'grigi', 'odio', -.7, .7], ['test', 'grigi', 'paura', -.35, .35]],
    iniziativa: [['chi', '@luogo', 'orgoglio', .35, .35], ['test', '@luogo', 'orgoglio', .2, .2]], raduno: [['chi', '@luogo', 'orgoglio', .3, .3], ['test', '@luogo', 'curiosita', .2, .2]],
    festa: [['chi', '@luogo', 'orgoglio', .45, .45], ['test', '@luogo', 'orgoglio', .3, .3]], gara: [['chi', '@luogo', 'orgoglio', .3, .3], ['test', '@chi', 'ammirazione', .25, .25]],
    ricorrente: [['chi', '@luogo', 'orgoglio', .4, .4]],
    pesca: [['chi', 'mare', 'sogno', .4, .35, 'q>=3']],
    dipinge_muro: [['test', '@chi', 'ammirazione', .2, .2, 'giudica']],
    barricata: [['chi', '@luogo', 'orgoglio', .55, .55], ['test', '@luogo', 'curiosita', .25, .25]], baracca: [['chi', '@luogo', 'orgoglio', .5, .5], ['test', '@luogo', 'curiosita', .25, .25]],
    gruppo_nato: [['test', '@gruppo', 'curiosita', .25, .25]], impresa: [['test', '@gruppo', 'ammirazione', .3, .3], ['part', '@gruppo', 'orgoglio', .5, .5]],
    lavora: [['chi', 'soldi', 'fastidio', -.08, .08, 'povero']],
  };
  // le coincidenze che diventano prodigi: il tipo → il tema per il posto
  const COINC = { pesca: 'fortuna', regalo: 'fortuna', prestito: 'fortuna', iniziativa: 'fortuna', festa: 'fortuna', furto: 'sfortuna', rissa: 'sfortuna', buca: 'sfortuna', lite: 'sfortuna', multa: 'sfortuna', fermato: 'sfortuna' };
  // i soggetti che hanno a che fare con i Grigi (per la mutazione e per sapere di che cosa parla un fatto)
  const DEI_GRIGI = new Set(['multa', 'fermato', 'controllo', 'grigi', 'arresto', 'repressione', 'sgombero', 'denuncia', 'bandita']);

  // ======================= LO STATO =======================
  function S(st) {
    const u = st && st.u; if (!u) return null;
    if (!u.idee) { const M = FT()._.M(st); u.idee = { v: 1, ultimo: M ? M.n : 0, prossimo: st.t, ora: st.t, per: {}, cat: {}, tr: {}, q: {}, coinc: {}, conti: { nate: 0, passate: 0, rifiutate: 0, rovesciate: 0, mutate: 0, prodigi: 0, quartieri: 0 }, bud: { g: -1, n: 0, p: 0 } }; }
    return u.idee;
  }
  const npc = (st, id) => (G.byId ? G.byId(st, id) : null);
  const portatore = (st, id) => { if (!id || id === 'nino' || id === 'player' || /^bottega:/.test(id)) return null; const n = npc(st, id); return n && n.pop && !n.dead && !n.gone && !n.cop && !n.guard && !n.faction ? n : null; };
  const nome = (st, id) => { if (id === 'nino' || id === 'player') return 'Nino'; try { const L = LG(); if (L && L.nome) { const s = L.nome(st, id); if (s && s !== String(id)) return s; } } catch (e) { } const n = npc(st, id); return (n && (n.first || n.name)) || 'qualcuno'; };
  const quart = (x, y) => { try { const W = typeof World !== 'undefined' ? World : null; return (W && W.districtAt && W.districtAt(x, y)) || 'città'; } catch (e) { return 'città'; } };
  const CASAQ = new Map();
  function quartDi(st, n) { let q = CASAQ.get(n.id); if (q) return q; const h = n.pop && n.pop.homeT; q = h ? quart(h.x, h.y) : quart(n.x, n.y); CASAQ.set(n.id, q); return q; }
  UI.quartDi = quartDi; UI.quart = quart;
  const NOMI_Q = { centro: ['il Centro', 'del Centro', 'al Centro', 'nel Centro'], perif_o: ['la Periferia ovest', 'della Periferia ovest', 'alla Periferia ovest', 'nella Periferia ovest'],
    perif_e: ['la Periferia est', 'della Periferia est', 'alla Periferia est', 'nella Periferia est'], porto: ['il Porto', 'del Porto', 'al Porto', 'nel Porto'], base: ['la Base', 'della Base', 'alla Base', 'nella Base'],
    prateria: ['la Prateria', 'della Prateria', 'alla Prateria', 'nella Prateria'], foresta: ['la Foresta', 'della Foresta', 'alla Foresta', 'nella Foresta'], isole: ['le Isole', 'delle Isole', 'alle Isole', 'nelle Isole'], città: ['la città', 'della città', 'alla città', 'in città'] };
  const nomeQ = (q, i) => (NOMI_Q[q] || [q, 'di ' + q, 'a ' + q, 'a ' + q])[i || 0];
  UI.nomeQ = nomeQ;

  // ======================= I TRATTI (il rumore: quasi sempre bassi, qualche volta estremi) =======================
  function tratti(st, id) {
    const s = S(st); if (!s) return null; let T = s.tr[id]; if (T) return T;
    const n = npc(st, id), tr = (n && n.tr) || {}, h = k => hashS(st.u.seme + '|tr|' + id + '|' + k), num = (x, d) => (typeof x === 'number' ? x : d);
    const estremo = (k, base) => { const e = h(k + '!'); return e > .955 ? .85 + h(k + '!!') * .15 : base; };   // uno su venti, più o meno, è estremo in qualcosa
    T = s.tr[id] = {
      follia: r2(estremo('follia', Math.pow(h('follia'), 3) * .6)),
      zelo: r2(estremo('zelo', clamp(Math.pow(h('zelo'), 2) * .6 + .2 * (1 - num(tr.legge, .5)), 0, 1))),
      vilta: r2(estremo('vilta', clamp((1 - num(tr.cor, .5)) * .5 + h('vilta') * .35, 0, 1))),
      carisma: r2(estremo('carisma', clamp(num(tr.loq, .5) * .45 + Math.pow(h('carisma'), 2) * .45, 0, 1))),
      credulo: r2(clamp(h('credulo') * .7 + (1 - num(tr.legge, .5)) * .2, 0, 1)),
      testardo: r2(clamp(h('testardo') * .6 + num(tr.cor, .5) * .25, 0, 1)),
      contrario: r2(estremo('contrario', Math.pow(h('contrario'), 4) * .7)),
    };
    return T;
  }

  // ======================= LE PAROLE =======================
  const forme = UI.forme = det => {   // le preposizioni articolate da un nome con l'articolo («I Figli del Molo» → dei, ai, nei)
    const m = /^(gli|il|lo|la|le|i)\s(.*)$/i.exec(det) || /^(l')(.*)$/i.exec(det); if (!m) return [det, 'di ' + det, 'a ' + det, 'in ' + det];
    const P = { i: ['dei', 'ai', 'nei'], gli: ['degli', 'agli', 'negli'], il: ['del', 'al', 'nel'], lo: ['dello', 'allo', 'nello'], la: ['della', 'alla', 'nella'], le: ['delle', 'alle', 'nelle'], "l'": ["dell'", "all'", "nell'"] }[m[1].toLowerCase()];
    const j = (p, r) => (/'$/.test(p) ? p + r : p + ' ' + r);
    return [det, j(P[0], m[2]), j(P[1], m[2]), j(P[2], m[2])];
  };
  function luogoForme(l) {
    const P = G.PLACES && G.PLACES[l]; const t = P && P.name; if (!t) return ['quel posto', 'di quel posto', 'a quel posto', 'in quel posto'];
    const L = LG(); try { if (L && L.art) return [L.art(t, 'det') || t, L.art(t, 'di') || 'di ' + t, L.art(t, 'a') || 'a ' + t, L.art(t, 'in') || 'in ' + t]; } catch (e) { }
    return [t, 'di ' + t, 'a ' + t, 'in ' + t];
  }
  UI.nomeGruppo = null;   // (st, gid) → [det, di, a, in]: lo mette unico_gruppi.js
  function formeS(st, s) {
    if (FISSI[s]) return FISSI[s].concat([forme(FISSI[s][0])[3]]);
    const k = s.slice(0, 2), r = s.slice(2);
    if (k === 'a:') { const A = ASSURDI[r]; return A ? [A[0], A[1], A[2], forme(A[0])[3]] : [r, 'di ' + r, 'a ' + r, 'in ' + r]; }
    if (k === 'p:') { const n = nome(st, r); const L = LG(); return [n, 'di ' + n, (L && L.a ? L.a(n) : 'a ' + n), 'in ' + n]; }
    if (k === 'l:') return luogoForme(r);
    if (k === 'g:') { const f = UI.nomeGruppo ? UI.nomeGruppo(st, r) : null; return f || ['un gruppo', 'di un gruppo', 'a un gruppo', 'in un gruppo']; }
    return [s, 'di ' + s, 'a ' + s, 'in ' + s];
  }
  const nomeS = UI.nomeS = (st, s) => formeS(st, s)[0];
  UI.formeS = formeS;
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  // la frase di un'idea: «Totò ce l'ha con i Grigi», «Gina crede che la luna guardi chi dorme al molo»
  function frase(st, id, s, tema) {
    const T = TEMI[tema] || TEMI.curiosita, F = formeS(st, s), A = s.slice(0, 2) === 'a:' ? ASSURDI[s.slice(2)] : null;
    return cap1(T[0].replace('{A}', id ? nome(st, id) : 'Qualcuno').replace('{S}', F[0]).replace('{di_S}', F[1]).replace('{a_S}', F[2]).replace('{in_S}', F[3]).replace('{pred}', A ? A[3] : 'non sia quello che sembra'));
  }
  UI.frase = frase;
  function testo(st, id, k) { const i = k.indexOf('|'); return frase(st, id, k.slice(0, i), k.slice(i + 1)); }
  UI.testo = testo;

  // ======================= LE IDEE DI UNA PERSONA =======================
  const di = UI.di = (st, id) => { const s = st && st.u && st.u.idee; return (s && s.per[id]) || []; };
  const kOf = (s, tema) => s + '|' + tema;
  const soggDi = k => k.slice(0, k.indexOf('|')), temaDi = k => k.slice(k.indexOf('|') + 1);
  UI.soggDi = soggDi; UI.temaDi = temaDi;
  let VER = 0;   // si cambia a ogni idea toccata: le spinte nella Mente si rifanno (derivato)
  function scriviFatto(st, tipo, chi, dati, causa) {
    const s = S(st), g = Math.floor(st.t / 1440); if (s.bud.g !== g) { s.bud.g = g; s.bud.n = 0; s.bud.p = 0; }
    if (tipo !== 'pressione' && tipo !== 'pressione_cala' && s.bud.n >= CFG.fattiGiorno) return null;
    s.bud.n++;
    let f = null; try { f = FT()._.registra(st, { t: st.t, v: tipo, chi: [].concat(chi).filter(x => x != null), causa: typeof causa === 'number' ? causa : null, peso: 1, hop: 0 }, dati, 'unico'); } catch (e) { f = null; }
    if (f) stats.fatti++;
    return f;
  }
  UI.scriviFatto = scriviFatto;
  // adotta: prende (o rinforza) un'idea. Ritorna 'nuova' | 'rinforzata' | null. Scrive il fatto «idea» per le nuove abbastanza forti
  function adotta(st, id, s, tema, val, int, fid, via) {
    const n = portatore(st, id); if (!n || !s || !TEMI[tema]) return null;
    if (s === 'p:' + id) return null;
    const S0 = S(st), L = S0.per[id] || (S0.per[id] = []), k = kOf(s, tema);
    int = clamp(int, 0, 1); val = clamp(val, -1, 1);
    let e = L.find(x => x[0] === k);
    if (e) { e[2] = r2(clamp(e[2] + int * (1 - e[2] * .5) * .6, 0, 1)); e[1] = r2(clamp(e[1] * .7 + val * .3, -1, 1)); e[3] = Math.round(st.t); VER++; return 'rinforzata'; }
    if (int < CFG.minInt * 1.5) return null;
    if (L.length >= CFG.max) { let j = 0; for (let i = 1; i < L.length; i++) if (L[i][2] < L[j][2]) j = i; if (L[j][2] >= int) return null; L.splice(j, 1); }
    e = [k, r2(val), r2(int), Math.round(st.t), fid || null]; L.push(e); VER++;
    const C = S0.cat[k] || (S0.cat[k] = [0, 0, Math.round(st.t), fid || null]); if (via) C[1]++; else C[0]++;
    if (via) { S0.conti.passate++; stats.passate++; } else { S0.conti.nate++; stats.nate++; }
    // il fatto «idea»: solo quando è forte e nuova per lui; è lui il primo a poterla raccontare (la diceria la porta in giro)
    if (int >= .42) { const f = scriviFatto(st, 'idea', id, { d: frase(st, id, s, tema), idea: k, tema, val: undefined, segno: val < 0 ? -1 : 1, via: via ? 1 : 0 }, fid); if (f) e[4] = f.id; }
    return 'nuova';
  }
  UI.adotta = adotta;
  // l'idea su cui si fonda un fatto «idea»/«vuole» (per chi la sente raccontare)
  const ideaDelFatto = g => (g && g.x && typeof g.x.idea === 'string' ? g.x.idea : null);

  // ======================= DAI FATTI ALLE IDEE =======================
  function chiDi(f, w) {
    if (w === 'chi') return f.chi ? [io(f.chi)] : [];
    if (w === 'con0') return f.con && f.con[0] ? [io(f.con[0])] : [];
    if (w === 'con') return (f.con || []).map(io);
    if (w === 'test') return (f.test || []).map(io);
    if (w === 'part') return (f.x && Array.isArray(f.x.part) ? f.x.part : f.con || []).map(io);
    return [];
  }
  function soggDa(f, sp) {
    if (sp === '@chi') return f.chi ? 'p:' + io(f.chi) : null;
    if (sp === '@con0') return f.con && f.con[0] ? 'p:' + io(f.con[0]) : null;
    if (sp === '@luogo') { const l = f.dove && f.dove[2]; return l && G.PLACES && G.PLACES[l] ? 'l:' + l : null; }
    if (sp === '@gruppo') return f.x && f.x.gruppo ? 'g:' + f.x.gruppo : null;
    return sp;
  }
  function daFatto(st, f) {
    const R = DA_FATTI[f.v]; if (!R || f.esito === 'no') return;
    for (const [w, sp, tema0, val0, int0, cond] of R) {
      if (cond === 'q>=3' && !((f.q || 0) >= 3)) continue;
      const s = soggDa(f, sp); if (!s) continue;
      for (const id of chiDi(f, w)) {
        if (!id || s === 'p:' + id) continue;
        let tema = tema0, val = val0, int = int0 * (w === 'test' ? .8 : 1);
        if (cond === 'giudica') { const n = npc(st, id), lg = n && n.tr && typeof n.tr.legge === 'number' ? n.tr.legge : .5; if (lg > .6) { tema = 'disprezzo'; val = -.25; } }
        if (cond === 'povero') { const n = npc(st, id); if (!n || !n.pop || (n.pop.money || 0) > 15) continue; }
        if (tema.indexOf('paura') === 0 || TEMI[tema][2] < 0) { const T = tratti(st, id); if (T && tema === 'paura') int *= .6 + T.vilta * .8; }
        adotta(st, id, s, tema, val, int, f.id, false);
      }
    }
  }
  // le coincidenze: lo stesso tipo nello stesso posto da due persone diverse entro CFG.coincMin minuti → un prodigio per i creduloni
  function coincidenza(st, s0, f) {
    const tema = COINC[f.v]; if (!tema || f.esito === 'no') return;
    const l = f.dove && f.dove[2]; if (!l || !G.PLACES || !G.PLACES[l]) return;
    const kk = f.v + '|' + l, u = s0.coinc[kk];
    s0.coinc[kk] = [Math.round(f.t), io(f.chi)];
    if (!u || u[1] === io(f.chi) || f.t - u[0] > CFG.coincMin) return;
    if (s0.bud.p >= CFG.prodigiGiorno || rnd() > .35) return;
    s0.bud.p++;
    // il soggetto: il posto, o (per chi ha la testa per aria) una nozione assurda
    const att = [io(f.chi), u[1]].concat((f.test || []).map(io)).filter(Boolean);
    const T0 = tratti(st, att[0]) || {}, ass = Object.keys(ASSURDI), s = (T0.follia || 0) > .4 || rnd() < .25 ? 'a:' + ass[Math.floor(rnd() * ass.length) % ass.length] : 'l:' + l;
    const tm = s[0] === 'a' ? 'credenza' : tema;
    const PL = G.PLACES[l].name || 'lì', d = s[0] === 'a' ? `Due volte di fila ${luogoForme(l)[3]}: c'è chi giura che ${nomeS(st, s)} ${ASSURDI[s.slice(2)][3]}` : `Due volte di fila ${luogoForme(l)[3]}: c'è chi dice che ${luogoForme(l)[0]} ${tema === 'fortuna' ? 'porti fortuna' : 'porti male'}`;
    const pf = scriviFatto(st, 'prodigio', att.slice(0, 3), { d, idea: kOf(s, tm), luogo: PL, tipo: f.v }, f.id);
    s0.conti.prodigi++; stats.prodigi++;
    for (const id of att) { const T = tratti(st, id); if (!T || T.credulo < .4) continue; adotta(st, id, s, tm, tm === 'sfortuna' ? -.5 : .5, .3 + T.credulo * .4, pf ? pf.id : f.id, false); }
  }

  // ======================= LE CHIACCHIERE PORTANO LE IDEE =======================
  // l'idea del parlante che c'entra col fatto raccontato (la persona, il posto, i Grigi, il gruppo, l'idea stessa), o la sua più forte
  function ideaPer(st, a, g) {
    const L = di(st, a); if (!L.length) return null;
    const ki = ideaDelFatto(g); if (ki) { const e = L.find(x => x[0] === ki); if (e) return e; }
    if (g) {
      const at = [g.chi].concat(g.con || []).map(io).filter(Boolean), l = g.dove && g.dove[2];
      let best = null; for (const e of L) { const s = soggDi(e[0]); if ((s[0] === 'p' && at.includes(s.slice(2))) || (s === 'l:' + l) || (s === 'grigi' && DEI_GRIGI.has(g.v)) || (g.x && g.x.gruppo && s === 'g:' + g.x.gruppo)) if (!best || e[2] > best[2]) best = e; }
      if (best) return best;
    }
    let best = L[0]; for (const e of L) if (e[2] > best[2]) best = e;
    return rnd() < .55 ? best : null;
  }
  const ass = Object.keys(ASSURDI);
  function passa(st, s0, f) {
    const a = io(f.chi), b = io(f.con && f.con[0]); if (!a || !b || a === b) return null;
    const nb = portatore(st, b); if (!nb) return null;
    const g = FT().di(st, f.x && f.x.di !== undefined ? +f.x.di : f.causa);
    // chi sente raccontare un fatto «idea» sa che il tale la pensa così: è il fatto stesso che passa, poi l'idea, se attecchisce
    let e = ideaPer(st, a, g), fromFact = false;
    if (!e) { const ki = ideaDelFatto(g); if (ki && g.x) { e = [ki, (g.x.segno || 1) * .5, .4, 0, g.id]; fromFact = true; } }
    if (!e) return null;
    const Ta = tratti(st, a) || {}, Tb = tratti(st, b) || {};
    let s = soggDi(e[0]), tema = temaDi(e[0]), val = e[1];
    if (s === 'p:' + b) return null;   // di sé non si prende un'idea
    let p = e[2] * (.35 + .65 * (fromFact ? .5 : Ta.carisma || .3)) * (.55 + (Tb.credulo || .3)) * (1 - (Tb.testardo || .3) * .5);
    const Lq = s0.q[quartDi(st, nb)], qi = Lq && Lq[s];
    if (qi && qi[1] && Math.sign(qi[0]) === Math.sign(val)) p *= CFG.conformita;   // il quartiere la pensa già così
    if (rnd() > p) return null;
    // il testardo con un'idea contraria sullo stesso soggetto la rifiuta; il bastian contrario la rovescia
    const Lb = di(st, b), contra = Lb.find(x => soggDi(x[0]) === s && Math.sign(x[1]) !== Math.sign(val));
    if (contra && rnd() < (Tb.testardo || 0) + .2) { s0.conti.rifiutate++; stats.rifiutate++; return null; }
    if (rnd() < (Tb.contrario || 0)) { tema = TEMI[tema][1]; val = -val; s0.conti.rovesciate++; stats.rovesciate++; }
    // l'errore creativo: la diceria sbaglia soggetto (la colpa passa ai Grigi, o diventa una storia assurda)
    else if (rnd() < CFG.mutazione + (Ta.follia || 0) * .25) {
      if ((Ta.follia || 0) > .5 || rnd() < .3) { s = 'a:' + ass[Math.floor(rnd() * ass.length) % ass.length]; tema = 'credenza'; val = .5; }
      else if (s[0] === 'p' && val < 0) s = 'grigi';
      else if (s === 'grigi') s = 'a:piccioni';
      s0.conti.mutate++; stats.mutate++;
    }
    const r = adotta(st, b, s, tema, val, e[2] * (.45 + .35 * (Ta.carisma || .3)) * (qi && qi[1] ? CFG.conformita : 1), f.id, true);
    return r ? kOf(s, tema) : null;
  }

  // ======================= L'ACCUMULO PER QUARTIERE =======================
  function accumula(st, s0) {
    const P = {}, chi = {};
    for (const id in s0.per) {
      const n = portatore(st, id); if (!n) { delete s0.per[id]; continue; }
      const q = quartDi(st, n), Pq = P[q] || (P[q] = {}), Cq = chi[q] || (chi[q] = {});
      for (const e of s0.per[id]) { const s = soggDi(e[0]); Pq[s] = (Pq[s] || 0) + e[1] * e[2]; const C = Cq[s] || (Cq[s] = []); if (C.length < 6) C.push([e[2] * Math.abs(e[1]), id]); }
    }
    for (const q in P) for (const s in P[q]) {
      const p = r2(P[q][s]), Q = s0.q[q] || (s0.q[q] = {}), o = Q[s] || (Q[s] = [0, 0, Math.round(st.t)]);
      o[0] = p;
      const top = (chi[q][s] || []).sort((a, b) => b[0] - a[0]).map(x => x[1]).slice(0, 3);
      if (!o[1] && Math.abs(p) >= CFG.soglia) {
        o[1] = 1; o[2] = Math.round(st.t); s0.conti.quartieri++; stats.quartieri++;
        const F = formeS(st, s), Nq = nomeQ(q, 3);
        const d = p < 0 ? (s === 'grigi' ? `${cap1(Nq)} monta la rabbia contro i Grigi` : `${cap1(Nq)} ce l'hanno con ${F[0]}`) : `${cap1(Nq)} vanno fieri ${F[1]}`;
        scriviFatto(st, 'pressione', top, { d: d + `: se ne parla in ogni casa`, quart: q, sogg: s, p, idea: kOf(s, p < 0 ? 'rancore' : 'orgoglio') }, null);
      } else if (o[1] && Math.abs(p) < CFG.sogliaCala) {
        o[1] = 0; o[2] = Math.round(st.t);
        scriviFatto(st, 'pressione_cala', top, { d: `${cap1(nomeQ(q, 3))} non si parla quasi più ${formeS(st, s)[1]}`, quart: q, sogg: s, p }, null);
      }
    }
    for (const q in s0.q) for (const s in s0.q[q]) if (!(P[q] && P[q][s] !== undefined)) { const o = s0.q[q][s]; if (!o[1]) delete s0.q[q][s]; else o[0] = 0; }
  }
  // la pressione di un quartiere: { soggetto: [p, acceso, t] }
  UI.pressione = (st, q) => { const s = st && st.u && st.u.idee; return (s && s.q[q]) || {}; };
  // il decadimento: −20% al giorno, sotto la soglia l'idea se ne va
  function decadi(st, s0, dt) {
    const k = Math.pow(CFG.decad, dt / 1440);
    for (const id in s0.per) { const L = s0.per[id]; for (let i = L.length - 1; i >= 0; i--) { L[i][2] = r2(L[i][2] * k); if (L[i][2] < CFG.minInt) L.splice(i, 1); } if (!L.length) delete s0.per[id]; }
    VER++;
  }

  // ======================= LA MENTE: le idee spostano le utilità =======================
  // per tipo di soggetto e segno: obiettivo → coefficiente (× intensità × |valenza|)
  const SPINTA = UI.SPINTA = {
    'grigi-': { vendicarsi: .35, dipingere: .5, socializzare: .15 }, 'grigi+': { lavorare: .1 },
    'p-': { vendicarsi: .4, socializzare: .08 }, 'p+': { regalare: .35, prestare: .2, socializzare: .15 },
    'l+': { socializzare: .2, costruire: .2, rivendicare: .35, dipingere: .15 }, 'l-': { socializzare: .1 },
    'mare+': { pescare: .5, guadagnare: .1 }, 'mare-': { pescare: -.3 },
    'a+': { pregare: .35, socializzare: .25 }, 'a-': { pregare: .4, socializzare: .2 },
    'soldi-': { guadagnare: .3, lavorare: .15, prestare: -.3 }, 'soldi+': { guadagnare: .2 },
    'g+': { socializzare: .2, militare: .25 }, 'g-': { vendicarsi: .3 },
  };
  const CACHE = new Map();
  function spinta(st, id) {
    const s0 = st.u && st.u.idee; if (!s0) return null; const L = s0.per[id]; if (!L || !L.length) return null;
    const c = CACHE.get(id); if (c && c[0] === VER) return c[1];
    const o = {}; let any = false;
    for (const e of L) {
      const s = soggDi(e[0]), key = (FISSI[s] ? s : s.slice(0, 1)) + (e[1] < 0 ? '-' : '+'), P = SPINTA[key]; if (!P) continue; const w = e[2] * Math.abs(e[1]);
      for (const g in P) { o[g] = (o[g] || 1) + P[g] * w; any = true; }
      if (temaDi(e[0]) === 'paura') { o.divertirsi = (o.divertirsi || 1) - .15 * w; o.socializzare = (o.socializzare || 1) - .1 * w; }
    }
    let out = null;
    if (any) { out = {}; let mx = 1; for (const g in o) { const x = r2(clamp(o[g], .6, 1.6)); if (x !== 1) { out[g] = x; if (x > mx) mx = x; } } out.$max = mx; if (Object.keys(out).length === 1) out = null; }
    if (CACHE.size > 600) CACHE.clear(); CACHE.set(id, [VER, out]);
    return out;
  }
  UI.spinta = spinta;
  // due spinte insieme: si moltiplicano, sempre fra .5 e 1.8; $max è il più grande (almeno 1)
  function unisci(a, b) {
    if (!a) return b; if (!b) return a;
    const o = {}; let mx = 1;
    for (const g in a) if (g !== '$max') o[g] = a[g];
    for (const g in b) if (g !== '$max') o[g] = (o[g] || 1) * b[g];
    for (const g in o) { o[g] = r2(clamp(o[g], .5, 1.8)); if (o[g] > mx) mx = o[g]; }
    o.$max = mx; return o;
  }
  UI.unisci = unisci;
  { const Mi = ME().innesti, prima = Mi.spinta; Mi.spinta = (st, id) => unisci(prima ? prima(st, id) : null, spinta(st, id)); }

  // ======================= GLI ASCOLTATORI E LA FASE =======================
  const ASCOLTA = [];
  UI.ascolta = fn => { ASCOLTA.push(fn); return UI; };
  function battito(st, s0) {
    const F = FT(), M = F._.M(st); if (!M) return;
    let id = s0.ultimo + 1; if (M.n - s0.ultimo > CFG.fattiBattito) id = M.n - CFG.fattiBattito + 1;
    for (; id <= M.n; id++) {
      const f = F.di(st, id); if (!f) continue;
      let passata = null;
      try {
        if (f.v === 'chiacchiera' || f.v === 'voce') passata = passa(st, s0, f);
        else { daFatto(st, f); coincidenza(st, s0, f); }
      } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.idee', e); }
      for (const fn of ASCOLTA) { try { fn(st, f, passata); } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.idee', e); } }
    }
    s0.ultimo = M.n;
    if (st.t - s0.ora >= CFG.ora) { const dt = st.t - s0.ora; s0.ora = st.t; decadi(st, s0, dt); accumula(st, s0); for (const k in s0.coinc) if (st.t - s0.coinc[k][0] > CFG.coincMin * 2) delete s0.coinc[k]; }
  }
  function fase(st) {
    const s0 = S(st); if (!s0 || !st.npcs || st.t < s0.prossimo) return;
    const a = now(); s0.prossimo = Math.round(st.t + CFG.battito); stats.battiti++;
    battito(st, s0);
    const ms = now() - a; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
  }
  Un().fase('unico.idee', { dopo: 'unico.regia', budget: { p95: .03 } }, fase);
  if (Un().nasce) Un().nasce('idee', st => { S(st); });

  // ======================= LA MULTA E IL FERMO DEI GRIGI (Popolo.note, avvolto: il diario diventa un fatto) =======================
  // Ordine scrive nel diario (Popolo.note) la multa e il fermo; Popolo.arrest il fermo da lontano. Qui diventano fatti della memoria,
  // così entrano nelle idee, nei fili e nella Gazzetta. Nessun effetto nuovo: solo il registro.
  const PO = typeof Popolo !== 'undefined' ? Popolo : null;
  if (PO && PO.note && !PO.note.__idee) {
    const nota0 = PO.note, TAG = { multa: 'multa', fermato: 'fermato', controllo: 'controllo' };
    PO.note = function (st, n, text, kind, x) {
      const r = nota0.apply(this, arguments);
      try { const t = x && TAG[x.tag]; if (t && st && st.u && n && n.id && !n.cop && Fatto.ON) { const f = FT()._.registra(st, { t: st.t, v: t, chi: [n.id], causa: null, peso: 1, hop: 0 }, { d: cap1(String(text || t).slice(0, 120)) }, 'unico'); if (f) stats.fatti++; } } catch (e) { }
      return r;
    };
    PO.note.__idee = true;
  }

  // ======================= I SEGNI =======================
  const Sg = SG();
  if (Sg && Sg.TIPI) Object.assign(Sg.TIPI, {
    idea: { p: 'fumetto', gz: .12, n: ['idea che gira', 'idee che girano'], bolla: false },
    prodigio: { p: 'esclamativo', gz: .55, n: ['prodigio', 'prodigi'] },
    pressione: { p: 'esclamativo', gz: .85, n: ['quartiere in fermento', 'quartieri in fermento'], bolla: false },
    pressione_cala: { p: 'fumetto', gz: .3, n: ['quartiere che si calma', 'quartieri che si calmano'], bolla: false },
    multa: { p: 'moneta', gz: .35, n: ['multa dei Grigi', 'multe dei Grigi'] }, fermato: { p: 'esclamativo', gz: .7, n: ['fermo dei Grigi', 'fermi dei Grigi'] },
    controllo: { p: 'mano', gz: 0, n: ['controllo dei Grigi', 'controlli dei Grigi'], bolla: false },
  });
  const Fg = FT().GRAV; if (Fg) Object.assign(Fg, { idea: .2, prodigio: .45, pressione: .7, pressione_cala: .3, multa: .45, fermato: .8, controllo: .15 });

  // ======================= LE LETTURE =======================
  // le idee più diffuse: [k, portatori, intensità media, nate, passate]
  UI.top = (st, n) => {
    const s0 = st && st.u && st.u.idee; if (!s0) return []; const C = {};
    for (const id in s0.per) for (const e of s0.per[id]) { const c = C[e[0]] || (C[e[0]] = [e[0], 0, 0]); c[1]++; c[2] += e[2]; }
    return Object.values(C).map(c => [c[0], c[1], r2(c[2] / c[1]), (s0.cat[c[0]] || [0])[0], (s0.cat[c[0]] || [0, 0])[1]]).sort((a, b) => b[1] - a[1] || b[2] - a[2]).slice(0, n || 10);
  };
  Object.assign(UI, { S, tratti, kOf, passa, daFatto, accumula, battito, fase, _: { VER: () => VER } });
  Un().Idee = UI;
  return UI;
})();
if (typeof window !== 'undefined') window.UnicoIdee = UnicoIdee;
