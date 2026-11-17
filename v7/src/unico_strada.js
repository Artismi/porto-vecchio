/* [unico] unico_strada.js: IL REGISTRO DI STRADA (dietro ?commedia; spento con &strada=0, più gente con &strada=2).
   Le battute di sempre restano: per una minoranza di persone (un quinto, circa) c'è un altro STRATO, più sboccato, più di strada, più
   «GTA», ma sempre per ridere: lo sbruffone che crolla, la minaccia assurda che si sgonfia, l'insulto con un'immagine precisa, la
   parolaccia come ritmo, il malavitoso che recita troppo, il duro che ha paura di sua madre, la nonna che bestemmia quasi, il prete
   che quasi dice la parolaccia. Niente modelli di linguaggio: tutto dalle tavole qui sotto, combinate, con la memoria contro la ripetizione.

   CHI PARLA COSÌ. registro(st, id), deciso una volta (hash del seme della partita e dell'id: lo stesso seme, la stessa gente), dai dati
   che ci sono: il mestiere (scaricatori, facchini, buttafuori, cavatori, meccanici, pescivendoli... ), chi è senza lavoro e giovane, la
   malavita e le bande (n.faction, n.crim), i tratti (legge, coraggio, parlantina; la Mente: rancore, teatralità), l'età, il gruppo. Le
   gradazioni: «sb» sboccato (parolacce e basta), «co» coatto (sbruffone, si vanta), «ma» malavitoso (minaccia, recitata troppo), «no» la
   nonna sboccata, «pr» il prete (o la suora, il sagrestano) che quasi. I Grigi, la Tutela, i matti e i bambini restano nella loro voce.
   DOVE SI SENTE. Il punto d'aggancio è quello della regia (commedia.js): ogni fumetto nasce come n.bark = {text}; la proprietà ha già il
   setter della regia, qui lo si avvolge (dopo la regia: la battuta che è passata, con la sua classe). Per chi ha il registro: o una
   battuta dello stesso INTENTO dalle tavole (il saluto, l'urto, il furto, la paura, il grazie, la lite, la chiacchiera di fondo, la voce
   che gira, il presidio), o la battuta di base con un'etichetta (prefisso, coda, insulto in fondo). Avvolti da fuori, senza toccarli:
   - la lite (unico_rissa.js): Verbo.EFF.gradino e .pace dicono l'intento (gradino 0-7, il modo di far pace); dove la rissa tace (il
     borbottio, la spinta, la minaccia, il colpo) chi ha il registro parla;
   - i guasti (unico_cose.js): il fatto «guasto» (UnicoIdee.ascolta) fa imprecare chi l'ha fatto, per tipo di guasto;
   - il presidio (unico_crescita.js): le righe della proposta (cr.prop.righe) dicono chi propone, chi è d'accordo, chi no, chi vuole
     un altro posto, com'è finita; la riga si riconosce quando la si dice (n.bark), le righe salvate non si toccano;
   - chi guida (UnicoPartiVivo.dice, le BATTUTE di UnicoPresidio): un automobilista su quattro, circa, è uno sboccato.
   NON UN REPERTORIO. La battuta si costruisce (genera): che cosa vuole dire adesso, a chi, perché, con quello che sa del mondo (il
   mestiere dell'altro, il suo ultimo guasto, il debito, il torto vero e il giorno, il gruppo, il soprannome, il posto) e con come sta
   (fame, sonno, rabbia, vino, il turno che comincia, i soldi che deve): la minaccia nomina il torto e si sgonfia sulla scusa vera, il
   vanto gonfia un fatto vero a ogni racconto, la maledizione mischia la cosa rotta col santo e il simbolo del gruppo. Le tavole sono
   materia e ripiego. L'IDIOLETTO (st.u.strada.idl, .esp, .gen): da un fatto vero nasce un modo di dire («Porco marciapiede!», «farai la
   fine del secchio di Gino»), passa sulle chiacchiere, cambia una parola passando, si consuma, si dimentica, muore; chi non ha il
   registro ne prende qualche parola dagli amici e poi si ammorbidisce. L'intensità segue la rabbia, la fame, il sonno, il vino.
   LA CULTURA. Chi è in un gruppo con la sua cultura (unico_cultura.js) giura sul simbolo e sul nome del gruppo e chiama i Grigi col
   soprannome del gruppo; il registro e il giuramento del gruppo passano sulle chiacchiere (UnicoIdee.ascolta) come il gergo.
   I LIMITI. Parolacce sì, bestemmie no; niente insulti a gruppi veri (etnie, religioni, disabilità, orientamento), niente violenza
   sessuale, niente persone vere. Ogni cattiveria ha la sua immagine o il suo crollo.
   LO STATO in st.u.strada, solo dati: reg (id → registro), usati (la memoria contro la ripetizione), ult (le ultime righe), giuri. */
var UnicoStrada = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? String(location.search || '') : '';
  const mD = /[?&]strada=(\d)/.exec(Q), DIAL = mD ? Math.min(2, +mD[1]) : 1;
  const US = { ON: /[?&]commedia\b/.test(Q) && DIAL > 0, DIAL };
  if (typeof module !== 'undefined' && module.exports) module.exports = US;
  if (!US.ON) return US;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const ID = () => (typeof UnicoIdee !== 'undefined' && UnicoIdee.ON ? UnicoIdee : null);
  const GR = () => (typeof UnicoGruppi !== 'undefined' && UnicoGruppi.ON ? UnicoGruppi : null);
  const VB = () => (typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null);
  const CM = () => (typeof Commedia !== 'undefined' && Commedia.ON ? Commedia : null);
  const LG = () => (typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null);
  const UCo = () => (typeof UnicoCostruire !== 'undefined' && UnicoCostruire.ON ? UnicoCostruire : null);
  if (!G || !Un()) { US.ON = false; return US; }
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = () => Un().flusso('strada');
  const hashS = s => { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const CFG = US.CFG = {
    quota: DIAL >= 2 ? 2.75 : 1.45,        // quanta gente ha il registro (moltiplica la probabilità)
    parla: DIAL >= 2 ? .8 : .62,       // quante delle loro battute passano dal registro
    sost: .5,                          // fra quelle: quante cambiano del tutto (il resto: la base con l'etichetta)
    auto: DIAL >= 2 ? .45 : .26,       // gli automobilisti sboccati
    contagio: .08, contagiMax: 1.35,   // il registro passa sulle chiacchiere, fino a 1,35 volte la quota di partenza
    lungo: 124, ult: 90, r: 26, genera: .95, ride: 2.4, comico: .3, scala: 1, attacca: 8, segMin: 3,
  };
  const stats = US.stats = { battute: 0, sostituite: 0, etichette: 0, proprie: 0, auto: 0, rissa: 0, guasti: 0, presidio: 0, contagi: 0, giuri: 0, perIntento: {}, perTipo: {} };
  const LOG = US.log = [];   // per le prove (non si salva): [t, id, tipo, intento, modo, testo, parole]

  // ======================= LO STATO =======================
  function S(st) { const u = st && st.u; if (!u) return null; return u.strada || (u.strada = { v: 1, reg: {}, usati: {}, ult: [], giuri: {}, sa: {}, contagi: 0, base: -1, g: Math.floor((st.t || 0) / 1440) }); }
  const npc = (st, id) => (id == null || id === 'player' || id === 'nino' ? null : G.byId ? G.byId(st, id) : null);
  const seme = st => (st.u && st.u.seme) || 0;

  // ======================= CHI PARLA COSÌ =======================
  const JOB_FORTE = /scaricator|facchin|magazzin|buttafuor|cavator|saldator|carpentier|meccanic|benzinai|pescivendol|pugilato|barman/;
  const JOB_MEDIO = /pescator|braccian|salinar|fornai|cuoc|oste\b|camerier|bidell|gestore della sala|proiezionist/;
  const REGIME = /tutela|rettifiche|comando|attendente|dattilograf/i;
  const RELIG = /\b(suor|suora|don|prete|parroco|frate|sagrestan|monaca|custode del santuario)/i;
  function eleggibile(n) {
    if (!n || !n.pop || n.cop || n.grigio || n.guard || n.pop.matto) return false;
    const P = n.pop; if ((P.age || 30) < 15) return false;
    const j = String((P.job && (P.job.base || P.job.title)) || '') + ' ' + (n.role || '');
    return !REGIME.test(j);
  }
  function tipoDi(st, n) {
    const P = n.pop, tr = n.tr || {}, num = (x, d) => (typeof x === 'number' ? x : d), h = k => hashS(seme(st) + '|strada|' + n.id + '|' + k);
    const j = String((P.job && (P.job.base || P.job.title)) || '').toLowerCase(), ruolo = String(n.role || '') + ' ' + j + ' ' + (n.first || '');
    const M = st.u && st.u.menti && st.u.menti[n.id], car = (M && M.carattere) || {};
    const legge = num(tr.legge, .5), cor = num(tr.cor, .5), loq = num(tr.loq, .5), age = P.age || 35, f = P.sex === 'f';
    const mala = !!(n.faction || n.crim || (n.ris && n.ris.member) || /ladr|spacc|contrab/.test(j));
    if (RELIG.test(ruolo)) return h('pr') < .3 * CFG.quota ? 'pr' : 0;
    if (f && age >= 66) return h('no') < (.1 + (loq - .5) * .2 + (.5 - legge) * .2) * CFG.quota ? 'no' : 0;
    let s = 0;
    if (JOB_FORTE.test(j)) s += .38; else if (JOB_MEDIO.test(j)) s += .14;
    if (P.status === 'disoccupato' && age < 36) s += .34;
    if (mala) s += .7;
    s += (.5 - legge) * .55 + (cor - .5) * .35 + (loq - .5) * .25 + ((car.rancore || .4) - .4) * .35 + ((car.teatrale || .4) - .4) * .2;
    if (age < 30) s += .08; if (age > 60) s -= .12; if (f) s -= .05;
    if (GR() && GR().gruppoDi(st, n.id)) s += .1;
    const p = clamp((.07 + Math.max(0, s) * .48) * CFG.quota, 0, .92);
    if (h('si') >= p) return 0;
    if (mala || (legge < .25 && (car.rancore || 0) > .55)) return 'ma';
    if (age < 32 || (car.teatrale || 0) > .62 || P.status === 'disoccupato') return 'co';
    return 'sb';
  }
  function registro(st, id) {
    const s = S(st); if (!s) return 0; if (s.reg[id] !== undefined) return s.reg[id];
    const n = npc(st, id); if (!n || !n.pop) return 0;   // senza corpo non si decide (e non si scrive)
    const t = eleggibile(n) ? tipoDi(st, n) : 0; s.reg[id] = t; return t;
  }
  US.registro = registro;

  // ======================= LE PAROLE, LE FORME =======================
  const VOC = h => /^[aeiouàèéìòùh]/i.test(h), SPEC = h => /^(s[^aeiouàèéìòù]|z|gn|ps|x|y)/i.test(h);
  const un = (w, g) => (g === 'f' ? (VOC(w) ? "un'" : 'una ') : SPEC(w) ? 'uno ' : 'un ') + w;
  const agg = (a, g) => a.replace(/\*/g, g === 'f' ? 'a' : 'o');   // l'asterisco: la desinenza che concorda
  // la memoria contro la ripetizione: per categoria e chiave, dimezzata ogni giorno
  function uso(st, cat, k) { const U = S(st).usati, C = U[cat] || (U[cat] = {}); return C[k] || 0; }
  function segna(st, cat, k) { const U = S(st).usati, C = U[cat] || (U[cat] = {}); C[k] = (C[k] || 0) + 1; }
  // pk: sceglie da L (stringhe o [testo, chiave, ...]) pesando per quante volte la chiave è già uscita
  function pk(st, L, cat, chiave) {
    let best = null, bw = -1;
    for (let i = 0; i < L.length; i++) { const x = L[i], k = chiave ? chiave(x, i) : i, w = (.35 + rnd()) / Math.pow(1 + 2.2 * uso(st, cat, k), 2); if (w > bw) { bw = w; best = [x, k]; } }
    if (!best) return null; segna(st, cat, best[1]); return best[0];
  }
  const pkS = (st, L, cat) => pk(st, L, cat, x => (Array.isArray(x) ? x[0] : x));
  // il secondo pezzo di una combinazione: a caso (con la memoria su tutti e due i pezzi le coppie girerebbero in tondo, sempre le stesse)
  // (da un flusso suo: dallo stesso flusso, a passo fisso dopo la scelta del primo pezzo, le coppie si ripetevano)
  const rp = L => L[Math.floor(Un().flusso('strada_b') * L.length) % L.length];
  let PAROLE = [], FONTI = [];   // le parole di insulto usate nella riga che si sta facendo (per la prova della varietà)

  // ---------- gli insulti: testa + complemento + aggettivo (+ coda), le similitudini, le parolacce secche ----------
  const TESTE = [['faccia', 'f'], ['testa', 'f'], ['cervello', 'm'], ['muso', 'm'], ['pezzo', 'm'], ['avanzo', 'm'], ['scarto', 'm'], ['figlio', 'm', 1], ['sacco', 'm'], ['anima', 'f'], ['occhio', 'm'], ['bocca', 'f']];
  const COMPL = [['cozza', 'f'], ['polpo', 'm'], ['baccalà', 'm'], ['triglia', 'f'], ['sarda', 'f'], ['seppia', 'f'], ['cernia', 'f'], ['acciuga', 'f'], ['totano', 'm'], ['cefalo', 'm'], ['sgombro', 'm'], ['vongola', 'f'],
    ['granchio', 'm'], ['merluzzo', 'm'], ['provolone', 'm'], ['mozzarella', 'f'], ['frittata', 'f'], ['zucchina', 'f'], ['melanzana', 'f'], ['cipolla', 'f'], ['rapa', 'f'], ['carciofo', 'm'], ['peperone', 'm'],
    ['ricotta', 'f'], ['sottaceto', 'm'], ['pandoro', 'm'], ['cotechino', 'm'], ['mortadella', 'f'], ['salsiccia', 'f'], ['polpetta', 'f'], ['babà', 'm'], ['sfogliatella', 'f'], ['ciabatta', 'f'], ['mocassino', 'm'],
    ['calzino', 'm'], ['mutanda', 'f'], ['materasso', 'm'], ['bidet', 'm'], ['scaldabagno', 'm'], ['cassonetto', 'm'], ['tombino', 'm'], ['motorino', 'm'], ['citofono', 'm'], ['scolapasta', 'm'], ['lavatrice', 'f'],
    ['ombrellone', 'm'], ['salvagente', 'm'], ['zampirone', 'm'], ['gabbiano', 'm'], ['piccione', 'm'], ['scarafaggio', 'm'], ['lumaca', 'f'], ['zerbino', 'm'], ['posacenere', 'm'], ['caciocavallo', 'm'], ['tarallo', 'm'],
    ['supplì', 'm'], ['arancina', 'f'], ['friggitrice', 'f'], ['canotto', 'm'], ['parrucchino', 'm'], ['ciambella', 'f'], ['pedalò', 'm'], ['spazzolone', 'm'], ['mestolo', 'm'], ['bigodino', 'm'], ['tonno', 'm'], ['lampione', 'm']];
  const AGG = ['scadut*', 'less*', 'ammollat*', 'fritt* due volte', 'rancid*', 'sgonfi*', 'avariat*', 'andat* a male', 'scongelat* male', 'riscaldat*', 'unt*', 'sudat*', 'ammaccat*', 'di contrabbando', 'in saldo',
    'senza sale', 'col singhiozzo', 'di seconda mano', 'del discount', 'dimenticat* al sole', 'pestat*', 'smarrit*', 'bollit* tre ore', 'stort*', 'mezz* mangiat*', 'rifiutat* pure dai gatti', 'cadut* dal camion',
    'vendut* a peso', 'sputat* dal mare', 'abbandonat* in autostrada', 'con la patente scaduta', 'del mercato del lunedì', 'avanzat* dal matrimonio', 'col riporto', 'in ciabatte', 'senza denti', 'col parrucchino'];
  const CODE_I = ['che pure i gabbiani schifano', 'che manco tua madre ti riconosce', 'lasciato in macchina ad agosto', 'con le tasche piene di sabbia', 'che puzza da qui al faro', 'che nemmeno il mare se lo riprende',
    'che al mercato lo regalano', 'col cartellino del prezzo ancora attaccato', 'messo a scolare sul balcone', 'che fa schifo pure alle mosche'];
  const SECCHI = ['stronz*', 'coglion+', 'cornut*', 'fess*', 'sfigat*', 'scem* di guerra', 'cretin*', 'rincoglionit*', 'mort* di fame', 'cagasotto', 'mezza calzetta', 'chiavica', 'cesso a pedali', 'cafon+', 'buffon+', 'testa di cazzo', 'pezzo di merda', 'faccia da culo', 'scornacchiat*', 'pallone gonfiat*'];
  const fem = w => w.replace(/\+/g, 'a'), mas = w => w.replace(/\+/g, 'e');
  function insulto(st, g) {   // g: il genere di chi lo prende
    const r = rnd();
    if (r < .2) { const s = pkS(st, g ? SECCHI : SECCHI.filter(x => !/[*+]/.test(x)), 'secco'); PAROLE.push(s.replace(/[*+].*/, '')); return g === 'f' ? agg(fem(s), 'f') : agg(mas(s), 'm'); }
    const T = rp(TESTE), C = pk(st, COMPL, 'n', x => x[0]), A = rp(AGG);
    PAROLE.push(C[0]);
    let s = `${T[0]} di ${T[2] ? un(C[0], C[1]) : C[0]} ${agg(A, C[1])}`;
    if (rnd() < .18 && !/ /.test(A)) s += ' ' + rp(CODE_I);
    if (rnd() < .22) s = pkS(st, ['brutt* ', 'gran ', 'pover* ', 'lurid* ', 'vecchi* '], 'pre_i').replace('*', T[1] === 'f' ? 'a' : 'o') + s;
    return s;
  }
  const SIMILI = {
    'inutile': ["un ombrello a Ferragosto", "un citofono al cimitero", "una forchetta per il brodo", "un bidet in barca", "il freno a mano su un pedalò", "un Grigio in ferie", "un posacenere in motorino"],
    'lent*': ["una cozza in salita", "un verbale dei Grigi", "mia nonna sulle scale", "la posta il lunedì", "un traghetto controvento", "una lumaca col freno a mano"],
    'brutt*': ["un cassonetto ad agosto", "la foto della carta d'identità", "una multa di lunedì", "un polpo con gli occhiali", "il divano di mia zia", "un sandalo coi calzini"],
    'scem*': ["un gabbiano col singhiozzo", "un tombino senza coperchio", "un pesce rosso in vacanza", "una sdraio montata al contrario", "un piccione che insegue un furgone"],
    'viscid*': ["un'anguilla al burro", "un polpo in discoteca", "una saponetta d'albergo", "uno che vende tappeti in spiaggia"],
    'tirchi*': ["un salvadanaio di cemento", "uno che si porta il sale da casa", "mio zio a Natale", "un parchimetro rotto"],
    'molle': ["una mozzarella al sole", "un budino sul traghetto", "gli spaghetti della mensa", "un gelato in tasca"],
    'nervos*': ["un gatto in lavatrice", "un vigile senza fischietto", "un riccio in tasca"],
  };
  const PUZZI = ["un peschereccio ad agosto", "il cassonetto del pescivendolo", "i calzini di un Grigio dopo il turno", "una cozza dimenticata in macchina", "lo spogliatoio del porto", "un caprone in ascensore", "la rete di un pescatore in pensione"];
  const diA = x => x.replace(/^(il|lo|la|i|gli|le) /, (m, a) => ({ il: 'del ', lo: 'dello ', la: 'della ', i: 'dei ', gli: 'degli ', le: 'delle ' }[a])).replace(/^l'/, "dell'");
  const piuDi = x => (/^(il|lo|la|i|gli|le) |^l'/.test(x) ? diA(x) : 'di ' + x);
  const testa = s => s.replace(/^(uno che si porta|uno che vende|uno che|una|uno|un|il|la|lo|i|gli|le|mia|mio)\s+|^(un'|l')/, '').split(' ')[0];
  function simile(st, g, chi) {   // chi: 'tu' (a lui) o 'lui'
    if (rnd() < .2) { const x = pkS(st, PUZZI, 'n'); PAROLE.push(testa(x)); return `${chi === 'lui' ? 'Puzza' : 'Puzzi'} più ${piuDi(x)}`; }
    const q = pk(st, Object.keys(SIMILI).filter(x => g || !/\*/.test(x)), 'qual', x => x), x = pk(st, SIMILI[q], 'n', y => testa(y)); PAROLE.push(testa(x));
    return `${chi === 'lui' ? 'È' : 'Sei'} più ${agg(q, g)} ${piuDi(x)}`;
  }

  // ---------- le minacce: l'azione (presente, condizionale), l'apertura, il crollo, la scala, la scusa ----------
  const AZ = [['ti apro come una cozza', 'ti aprirei come una cozza'], ['ti piego come un ombrellone a settembre', 'ti piegherei come un ombrellone a settembre'], ['ti faccio nero come una seppia', 'ti farei nero come una seppia'],
    ['ti appendo al lampione come un salame', 'ti appenderei al lampione come un salame'], ['ti stacco le orecchie e ci faccio due portachiavi', 'ti staccherei le orecchie per farci due portachiavi'],
    ['ti rigiro come un calzino', 'ti rigirerei come un calzino'], ['ti metto sotto sale come un baccalà', 'ti metterei sotto sale come un baccalà'], ['ti spalmo sul muro come la ricotta', 'ti spalmerei sul muro come la ricotta'],
    ['ti spedisco a Marsiglia senza traghetto', 'ti spedirei a Marsiglia senza traghetto'], ['ti stendo come il bucato di mia madre', 'ti stenderei come il bucato di mia madre'],
    ['ti faccio la faccia a mosaico', 'ti farei la faccia a mosaico'], ['ti cucino al cartoccio con le patate', 'ti cucinerei al cartoccio con le patate'], ['ti uso come zerbino', 'ti userei come zerbino'],
    ['ti pianto nel marciapiede come un paletto', 'ti pianterei nel marciapiede come un paletto'], ['ti butto a mare a far compagnia ai ricci', 'ti butterei a mare a far compagnia ai ricci'],
    ['ti faccio un occhio nero e l\'altro abbinato', 'ti farei un occhio nero e l\'altro abbinato'], ['ti sbatto contro la saracinesca finché suona', 'ti sbatterei contro la saracinesca finché suona'],
    ['ti faccio mangiare il motorino, bullone per bullone', 'ti farei mangiare il motorino, bullone per bullone'], ['ti arrotolo come un tappeto e ti vendo al mercato', 'ti arrotolerei come un tappeto e ti venderei al mercato'],
    ['ti do tanti di quei ceffoni che ti si stira la faccia', 'ti darei tanti di quei ceffoni da stirarti la faccia'], ['ti infilo in un bidone e ti faccio rotolare giù per la salita', 'ti infilerei in un bidone e giù per la salita'],
    ['ti gonfio come un canotto', 'ti gonfierei come un canotto'], ['ti sfratto i denti', 'ti sfratterei i denti'], ['ti faccio fare la fine del tonno', 'ti farei fare la fine del tonno'],
    ['ti piallo come una tavola da stiro', 'ti piallerei come una tavola da stiro'], ['ti ficco in un barattolo di acciughe', 'ti ficcherei in un barattolo di acciughe']];
  const AZ_NO = [['ti do una ciabattata che ti cambia i connotati', 'ti darei una ciabattata da cambiarti i connotati'], ['ti lavo la bocca col sapone di Marsiglia', 'ti laverei la bocca col sapone di Marsiglia'], ['ti tiro il mestolo in testa come a tuo nonno', 'ti tirerei il mestolo in testa come a tuo nonno'], ['ti chiudo nello sgabuzzino con le scope', 'ti chiuderei nello sgabuzzino con le scope']];
  const AZ_PR = [['ti faccio dire tre rosari in ginocchio sui ceci', 'ti farei dire tre rosari in ginocchio sui ceci'], ['ti scomunico… cioè, ti metto in castigo, porca… pazienza', 'ti scomunicherei, porca… pazienza'], ['ti mando a fare il chierichetto fino a novant\'anni', 'ti manderei a fare il chierichetto fino a novant\'anni']];
  const APRI = ['Mo\' ', 'Giuro su mia madre che ', 'Guarda che ', 'Un\'altra parola e ', 'Avvicinati e ', 'Stai attento, eh, che ', 'Ti avverto: ', 'Se ti ribecco ', 'Prova a dirlo un\'altra volta e ', 'Quant\'è vero che mi chiamo così, ', 'Fai un altro passo e '];
  const CROLLO = ['…appena finisco il caffè.', '…ma non oggi, che ho la schiena.', '…dopo cena, che mia madre ha fatto le polpette.', '…se mi tiene mio cugino. Tienimi, Gennaro! TIENIMI!', '…lunedì. Il lunedì sono cattivissimo.',
    '…quando mi passa il raffreddore.', '…e poi ti chiedo scusa, perché sono educato.', '…ma prima vado a pisciare.', '…mi segno la tua faccia. Qualcuno ha una penna?', '…ecco, l\'ho detto. Adesso me ne vado piano.'];
  const SCALA1 = ['mi tolgo l\'orologio', 'mi levo la giacca', 'mi faccio il segno della croce', 'mi sputo sulle mani', 'poso il gelato', 'mi tiro su le maniche', 'saluto mia madre alla finestra', 'mi sistemo i capelli'];
  const SCUSE = ['ho le scarpe nuove', 'ho la macchina in doppia fila', 'mi si scioglie il gelato', 'c\'è la partita alle tre', 'mia madre ha buttato la pasta', 'ho appena fatto la doccia', 'ho la camicia stirata da mia sorella',
    'devo ritirare la pensione di mia nonna', 'c\'ho il motorino acceso', 'ho il pesce in macchina', 'mi sono appena pettinat§', 'domani mi sposo', 'ho le mani che sanno di frittura', 'ho promesso al prete di fare il bravo fino a Pasqua', 'ho mangiato pesante'];
  function azione(st, tipo) { const L = tipo === 'no' ? AZ_NO.concat(AZ.slice(0, 6)) : tipo === 'pr' ? AZ_PR : AZ; return pk(st, L, 'az', x => x[0]); }
  function minaccia(st, tipo, g) {
    const A = azione(st, tipo), r = rnd();
    if (tipo === 'pr') return cap1(pkS(st, ['Figliolo, ', 'Senti, benedetto, ', 'Non farmi perdere la pazienza che ', 'Che Dio mi perdoni, ma '], 'apri_pr') + A[0] + '.');
    if (r < .2) return cap1(`${A[1]}, ma ${pkS(st, SCUSE, 'scusa')}.`);
    if (r < .33) { const a = rp(SCALA1), b = rp(SCALA1.filter(x => x !== a)); return `Uno: ${a}. Due: ${b}. Tre… ${A[0]}!`; }
    if (r < .45 && tipo !== 'no') return pkS(st, ['Ringrazia che mia madre è alla finestra, se no %A0.', '%A0! …Mamma, non sto litigando! Sto parlando!', 'Se non era per mia madre, a quest\'ora %A1.', 'Mia madre mi ha detto di non fare a botte. Mia madre però non c\'è: %A0.'], 'mamma').replace(/%A(\d)/, (m, i) => A[+i]).replace(/^ti/, 'Ti');
    let s = rp(APRI) + A[0];
    if (rnd() < .3) s += ', ' + insulto(st, g);
    return cap1(s) + (rnd() < .3 ? ' ' + pkS(st, CROLLO, 'crollo') : '!');
  }

  // ---------- le maledizioni: i santi (senza bestemmie), i morti, la suola che si scolla davanti alla suocera ----------
  const SANTI = ['San Gennaro', 'Sant\'Antonio', 'Santa Rosalia', 'San Rocco', 'San Biagio', 'Santa Lucia', 'San Pasquale', 'San Ciro', 'Sant\'Anna', 'San Pietro pescatore', 'San Crispino', 'San Nicola'];
  const SCODA = ['e a tutta la processione', 'e al cane suo', 'e a chi gli ha fatto la statua', 'e pure al cugino', 'e al giorno che ti ho conosciuto', 'e alle cozze di ieri', 'e a tutto il condominio', 'e alla banda che lo suona', 'e al sagrestano che dorme'];
  const CU_OGG = ['ti si scolli la suola', 'ti si sgonfi il materassino', 'ti si rompa la lavatrice', 'ti si inceppi la zip', 'ti si sciolga il gelato sulla camicia', 'ti si allaghi la cantina', 'ti si scarichi il motorino',
    'ti si spenga la caldaia', 'ti si strappino i pantaloni', 'ti si incastri la dentiera', 'ti si rompa l\'elastico delle mutande', 'ti si fermi l\'ascensore', 'ti si bruci il sugo', 'ti si sfili il parrucchino', 'ti si gonfi la faccia di zanzare', 'ti si sciolga il rossetto', 'ti si stacchi la marmitta'];
  const CU_QUANDO = ['in mezzo alla piazza', 'il giorno della comunione di tua nipote', 'davanti a tua suocera', 'proprio a Ferragosto', 'mentre balli il liscio', 'in coda alla posta', 'al primo appuntamento', 'durante la processione', 'davanti ai Grigi', 'sul traghetto'];
  const POSSA = ['trovare sempre le cozze vuote', 'pestare un riccio ogni estate', 'avere il singhiozzo per tre Natali', 'beccare tutti i semafori rossi del paese', 'sognare tua suocera ogni notte', 'trovare sempre il bagno occupato',
    'perdere il traghetto per un minuto', 'avere sempre una scarpa slacciata', 'trovare un capello in ogni piatto di pasta', 'restare chiuso fuori casa in mutande',
    'sederti su una sedia bagnata', 'trovare il motorino sui mattoni', 'sbagliare la bomboniera', 'starnutire col caffè in bocca', 'restare in ascensore col Grigio del terzo piano', 'mordere un tarallo duro', 'perdere la dentiera nel brodo', 'ballare il liscio con lo zio sudato'];
  const MORTI = ['e del motorino tuo', 'e di tutto l\'albero genealogico', 'fino al bisnonno pescatore', 'e di chi ti ha insegnato a camminare', 'e di quella faccia che ti ritrovi', 'e della barca di tuo zio', 'e del condominio tuo, scala B', 'e di chi ti ha fatto la permanente'];
  // la maledizione intera: fra tre candidate, quella detta meno volte (la memoria sulla frase intera, non solo sui pezzi)
  function maledizione(st, tipo) {
    let best = null, bu = 1e9;
    for (let i = 0; i < 3; i++) { const t = maledizione1(st, tipo), u = uso(st, 'mal', t); if (u < bu) { bu = u; best = t; } if (!u) break; }
    segna(st, 'mal', best); return best;
  }
  function maledizione1(st, tipo) {
    const r = rnd();
    if (tipo === 'pr') return pkS(st, ['Che il Signore ti… ti illumini, porca… porca l\'oca!', 'Va\' a quel… a quel paese benedetto!', 'Che ti venga un acc… un accidenti di grazia divina!', 'Per tutti i santi del cal… del calendario!', 'Mannaggia… benedetta! Mannaggia benedetta!'], 'mal_pr');
    if (r < .32) return `Mannaggia a ${pkS(st, SANTI, 'santo')} ${rp(SCODA)}!`;
    if (r < .62) return `Che ${pkS(st, CU_OGG, 'cuo')} ${rp(CU_QUANDO)}!`;
    if (r < .82) { const x = pkS(st, POSSA, 'possa'); return `Che tu possa ${x}${!/ogni|sempre|per tre|suocera|fuori casa/.test(x) && rnd() < .7 ? ' ' + rp(CU_QUANDO.filter(q => !/suocera/.test(q) || !/suocera/.test(x))) : ''}!`; }
    if (r < .94) return `${rp(['Li mortacci tua', 'Mortacci tua', 'Li mortacci di tua cugina'])} ${pkS(st, MORTI, 'morti')}!`;
    return pkS(st, ['Puozze truvà \'e cozze vacante!', 'Puozze passà nu guaio, e pure grosso!', 'Va\' a cagare, ma sul serio, con calma!', 'Va\' a farti friggere, e senza olio!', 'Ma va\' a ciapà i ratt, va\'!', 'Va\' a pescare le acciughe con le mani, va\'!', 'Va\' a fare in culo, e salutami la Calata!', 'Va\' a dormire coi tonni!', 'Va\' a quel paese, e restaci, che lì ti vogliono bene!'], 'mal_dial');
  }

  // ---------- le etichette: prefissi e code, per tipo, con le varianti di ritmo ----------
  const PREF = {
    sb: ['Porca miseria,', 'Cazzo,', 'Minchia,', 'Mannaggia,', 'Ma porca la miseria ladra,', 'Oh, ma vaffanculo,', 'Ma che cazzo,', 'Porca vacca,', 'Mortacci,', 'Merda,', 'Ma porca… porca… porca la miseria,', 'Cazzo, cazzo, cazzo,', 'Ma vaff… vabbè,', 'Porca zozza,', 'Ma che palle,'],
    co: ['Uè!', 'Ao!', 'Oh, fra\',', 'Uagliò,', 'Bella, fra\'!', 'Ué, sentite a me:', 'Zitti tutti:', 'Fermi tutti, cazzo:', 'Oh, oh, oh:', 'Minchia, fra\',', 'Uè, uè, uè:'],
    ma: ['Senti a me, bello:', 'Ascolta bene, eh:', 'Ti dico una cosa, e una sola:', 'Con rispetto parlando:', 'Tra me e te:', 'Io sono una persona tranquilla, eh. Però:', 'Statti zitto e ascolta:'],
    no: ['Madonna benedetta,', 'Uh, Gesù,', 'Figlio mio,', 'Senti a nonna,', 'Ma porca la miseria di tuo nonno,', 'Ah, che schifo,', 'Uh, mannaggia la pupazza,'],
    pr: ['Porca… porca l\'oca,', 'Per tutti i santi,', 'Mannaggia… benedetta,', 'Signore, dammi pazienza,', 'Santa pazienza,'],
  };
  const CODA = {
    sb: [', cazzo!', ', minchia.', ', porca miseria!', ', e vaffanculo.', ', mannaggia a me!', ', che palle.', '. Che cazzo.', '… merda.', ', porca la miseria ladra!', '. CAZZO.', ', e sticazzi.', ', porco mondo!'],
    co: [', fra\'!', ', uagliò!', ', bello mio.', ', chiaro?', ', e mo\' basta!', ', parola mia!', ', giuro su mia madre.', ', fidati di me, che io so le cose.', ', e chi non ci crede si attacca.'],
    ma: [', capito?', '. Ci siamo capiti.', '. Non lo ripeto.', ', che io sono una persona tranquilla.', '. Ricordatelo.', '. Io lo dico per te.', '. Hai capito che voglio dire.', '. Questo è un consiglio. Gratis. Il prossimo no.'],
    no: [', stronzetto.', ', Dio ti benedica, cretino.', ', tesoro mio. Coglione.', ', che ti venga un colpo.', ', hai mangiato?', ', bello di nonna. Testa di rapa.'],
    pr: [', che Dio mi perdoni la parola.', ', e scusate il francese.', ', porca… pazienza.', ', mannaggia… amen.'],
  };
  const fine = s => /[.!?…:]$/.test(s);
  const MAIUSC = new Set(['Arciduca', 'Arciduchessa', 'Venerabile', 'Cavaliere', 'Commendatore', 'Commendatrice', 'Conte', 'Contessa', 'Barone', 'Baronessa', 'Ammiraglio', 'Ammiraglia', 'Priore', 'Priora', 'Decano', 'Decana', 'Marchese', 'Marchesa', 'Console', 'Duca', 'Duchessa', 'Abate', 'Badessa', 'Dama', 'Patriarca', 'Matriarca', 'Custode', 'Podestà', 'Maresciallo', 'Marescialla', 'Accademico', 'Accademica', 'Gran', 'Luogotenente', 'Plenipotenziario', 'Plenipotenziaria', 'Protonotario', 'Protonotaria', 'Prefetto', 'Prefetta', 'Ispettore', 'Ispettrice', 'Consolessa', 'Podestà', 'Sua', 'Nino', 'Grigi', 'Dio', 'San', 'Santa', 'Sant', 'Marsiglia', 'Squalo', 'Flamingo', 'Gesù', 'Madonna', 'Signore', 'Tutela', 'Calata', 'Lei']);
  const minuscola = b => { const w = (/^[A-Za-zÀ-ÿ']+/.exec(b) || [''])[0]; return MAIUSC.has(w.replace(/'.*/, '')) || /^[A-ZÀ-Ý]{2,}/.test(b) ? b : b[0].toLowerCase() + b.slice(1); };
  function etichetta(st, tipo, base, g, ostile) {
    const t = tipo === 'no' || tipo === 'pr' || tipo === 'ma' || tipo === 'co' ? tipo : 'sb', r = rnd();
    let b = String(base).trim();
    if (r < .45) { const p = pkS(st, PREF[t], 'pref_' + t); return p + ' ' + (/!$/.test(p) ? b : minuscola(b)); }
    const corpo = b.replace(/[.!?…]+$/, ''), dom = /\?$/.test(b);
    if (r < (ostile ? .7 : .92) || tipo === 'pr' || tipo === 'no') { let c = pkS(st, CODA[t], 'coda_' + t); if (dom && /[!.]$/.test(c) && !/\. /.test(c)) c = c.replace(/[!.]$/, '?'); return corpo + c; }
    if (r < (ostile ? .86 : 1)) return corpo + ', ' + insulto(st, g) + (dom ? '?' : '!');
    return (fine(b) ? b : b + '.') + ' ' + maledizione(st, tipo);
  }

  // ---------- le battute per intento ----------
  // ogni voce: [tipi ('*' tutti, o 'sb co ma no pr'), testo con i segnaposti, o funzione (st, X) → testo]
  //   {I} un insulto · {Sim} una similitudine · {M} una minaccia · {C} una maledizione · {G} i Grigi (col soprannome del gruppo)
  //   {Sc} una scusa · {N} il giocatore · {X} il giuramento del gruppo · § la desinenza di chi parla (o/a)
  const P_ = {
    saluto: [['co', 'Uè, bello! Ancora vivo? Peccato. Scherzo, ciao!'], ['co', 'Oh, guarda chi c\'è! Il più brutto del porto. Dopo di me, eh.'], ['co ma', 'Ciao, fra\'. Se qualcuno ti rompe, fai il mio nome. Poi scappa.'],
      ['co', 'Bella, {N}! Ancora non t\'hanno arrestato? Bravo, cazzo!'], ['sb', 'Ciao. Che giornata di merda, eh? Bella, però. Di merda, ma bella.'], ['sb', 'Salve, salve. Non mi chiedere come sto, che ti rispondo.'],
      ['ma', 'Ti saluto. Salutami pure tua madre. Lei sa perché.'], ['ma', 'Oggi sei fortunato: sono di buonumore. Domani non so.'], ['no', 'Ciao, bello di nonna. Ti sei lavato? Puzzi come un traghetto.'],
      ['no', 'Ciao, stronzetto mio. Ti ho visto ieri sera, sai. Non dico niente. Per ora.'], ['pr', 'Ciao, figliolo. Il Signore ti tiene d\'occhio. Pure io, porca… pazienza.'], ['sb co', '{X} Ciao!']],
    urtato: [['*', 'Ma guarda dove cazzo cammini, {I}!'], ['co', 'Oh! Ho la camicia stirata da mia madre, stronzo!'], ['co ma', 'Uè, piano! Qui si passa uno alla volta: prima io, poi io, poi vediamo.'], ['sb', '{Sim}! Spostati!'],
      ['ma', 'Mi hai toccato. Nessuno mi tocca. Nemmeno il barbiere: mi taglio i capelli da solo.'], ['no', 'Ahò! Ho ottant\'anni e il bastone, cretino: la prossima volta te lo infilo dove dico io!'], ['sb', 'E guarda avanti, {I}, che gli occhi li hai davanti, mica nel culo!'],
      ['co', 'Ma che fai, mi spingi? A me? Davanti a tutti? {M}'], ['pr', 'Ma porca… porca la strada stretta, figliolo!']],
    derubato: [['*', 'Le mie cose! Ti trovo, eh. Ti trovo e {m}!'], ['sb co', 'Ladro di merda! Ridammi tutto, o {m}!'], ['sb', 'Ma chi cazzo è stato?! Era la roba di mia madre!'], ['ma co', 'Mi hai fregato? A ME? Io sono quello che frega!'],
      ['co', 'Fermati, {I}! …Va be\', corri tu, io ho il fiatone.'], ['ma', 'Hai fatto un errore, amico. Un errore piccolo, ma con le gambe corte. Le tue.'], ['no', 'Al ladro! Al ladro! Ridammi la borsa, che dentro c\'è la dentiera di riserva, pezzo di merda!'],
      ['pr', 'Ladro! Che il Signore ti… ti faccia inciampare, almeno un pochino!']],
    colpito: [['co', 'Mi hai toccato! A ME! …Mamma!'], ['sb', 'Ahia, cazzo! Questa te la segno, {I}!'], ['co ma', 'Mi hai menato davanti a tutti! Adesso devo menarti per forza, pure se non mi va!'],
      ['sb', X => calmo(X.g)], ['ma', 'Questo è stato un errore. Il tuo ultimo errore. Il penultimo, va\', che sono buono.'], ['no', 'A una vecchia?! Ti spacco il bastone in testa e poi te lo faccio pagare!']],
    paura: [['co', 'Non sparare! Ho la mamma che cucina!'], ['co sb', 'Aiuto! Cioè, non aiuto: sto benissimo! AIUTO!'], ['co ma', 'Io non c\'entro! Io sono di passaggio! Da vent\'anni!'], ['co', 'Mamma! MAMMA! …Scusate. Chiamate mio cugino!'],
      ['sb', X => `Non sparare! ${cap1(scusa(X))}!`], ['ma', 'Calma! Calma! Parliamone! Io sono uno che parla! Io parlo tantissimo!'], ['no', 'Spara pure, stronzo, che a ottant\'anni mi fai un favore! …No, aspetta, domani c\'è la tombola!'],
      ['pr', 'Signore, prendimi! …Non adesso! Non adesso, porca… porca l\'oca!']],
    aiutato: [['co ma', 'Grazie, fra\'. Se qualcuno ti tocca, dimmelo, che gli {M2}.'], ['sb', 'Grazie, cazzo. Ti devo un favore. Uno piccolo, eh.'], ['co', 'Grazie. Non dirlo in giro che m\'hai aiutato, che mi rovini la reputazione.'],
      ['ma', 'Questo non lo dimentico. Io non dimentico niente. Tranne il compleanno di mia moglie.'], ['no', 'Grazie, tesoro. Sei meno stronzo di come sembri.'], ['pr', 'Grazie, figliolo. Il Signore ti benedica, e pure quel… quel culo che hai, perché fortunato sei.']],
    rissa1: [['*', 'Guarda questo… mo\' gli spiego io come funziona…'], ['*', X => `${rp(BORB_A)} ${pkS(X.st, BORB_B, 'borb_b')}`], ['*', X => `${rp(BORB_A)} ${pkS(X.st, BORB_B, 'borb_b')}`], ['co ma', 'Eh, eh. Ridi, ridi. Ti ho segnato.'], ['sb', 'Mi sta guardando. Perché mi guarda? Mo\' lo guardo pure io. Più forte.'], ['sb co', 'Ehi, {I}… sì, dico a te. Ma piano.'],
      ['ma', 'Io non dico niente. Io guardo. Quando guardo, poi, succedono le cose.'], ['no', 'Guarda che faccia… se era mio figlio lo affogavo nel lavandino.'], ['pr', 'Pazienza… pazienza… porca… pazienza…']],
    rissa2: [['*', 'Ma vai a cagare, {I}!'], ['*', 'Statti zitto, {I}!'], ['co sb', 'Ma chi ti credi di essere, {I}?'], ['sb co', 'Torna nel cassonetto da dove sei uscito, {I}!'], ['*', '{Sim}!'], ['sb co ma', '{C} E pure a te, {I}.'],
      ['co', 'Ma tu lo sai chi sono io? {Boast}'], ['ma', 'Tu non sai con chi stai parlando. E fidati: è meglio così. Per te, per me, per tua zia.'], ['no', 'Stai zitto, {I}, che tua madre la conosco: piangeva pure lei quando sei nato.'],
      ['pr', 'Figliolo, sei un… un… un povero di spirito, ecco! Un povero di spirito del cazz… del catechismo!']],
    rissa3: [['*', 'Spostati, {I}!'], ['*', X => `${pkS(X.st, SPINTA, 'spinta')}, ${insulto(X.st, X.g2)}!`], ['co sb ma', 'E questa è solo la spinta. Il resto arriva per posta.'], ['sb', 'Levati dalle palle, va\', che oggi non è giornata.'], ['ma', 'Ti ho spostato. Come si sposta una sedia. Senza cattiveria.'], ['co', 'Pussa via, che mi sporchi l\'aria!'], ['ma co', 'Questa era una carezza. La prossima è una carezza più forte.'], ['sb', 'E vai! E vai! Ma vai dove cazzo ti pare, basta che vai!'], ['no', 'Levati di mezzo, {I}, che ho le borse della spesa!']],
    rissa4: [['*', X => minaccia(X.st, X.tipo, X.g2)]],
    rissa5: [['co', 'Prendi questa! E questa è da parte di mia sorella!'], ['*', X => `${rp(COLPO_A)} ${pkS(X.st, COLPO_B, 'colpo_b')}`], ['*', X => `${rp(COLPO_A)} ${pkS(X.st, COLPO_B, 'colpo_b')}`], ['co ma', X => `Questa è per ${pkS(X.st, PER_CHI, 'perchi')}!`], ['co sb', 'Questa è per la mia Vespa! Che non c\'entra niente, ma mi girava!'], ['co', 'TIÈ! E TIÈ! E… aspetta, m\'è caduto l\'orologio.'], ['sb ma', 'Senti come suona la tua testa, {I}!'],
      ['ma', 'Niente di personale. Cioè, sì, è tutto personale.'], ['no', 'Questa è la ciabatta di nonna! La conosci, la ciabatta?'], ['sb', X => calmo(X.g)]],
    scusati: [['co', 'Scusa, fra\'. Ma solo perché sei tu. E perché c\'è gente.'], ['sb', 'Va be\', scusa, cazzo. Contento? Scusa. Ecco. Scusa.'], ['ma', 'Ti chiedo scusa. Lo faccio una volta all\'anno. Quest\'anno è toccato a te.']],
    ridi: [['co sb', 'Ahahah! T\'ho fatto cagare sotto, eh? Pure io, un po\'.'], ['co', 'Stavo scherzando, scemo! Si vedeva, no? Dalla faccia? Che faccia avevo?']],
    paga: [['co ma', 'Tieni, offro io. Ma non dirlo a nessuno, che mi rovini la reputazione.'], ['sb', 'Tieni, porca miseria. Il caffè della pace. Ma senza zucchero, che non te lo meriti.']],
    scappa: [['co', 'Torno! Torno con mio cugino! Quello grosso!'], ['co sb ma', 'Non è una fuga! È una ritirata strategica, cazzo!'], ['sb', 'Me ne vado perché ho da fare! Non perché ho paura! CORRO PERCHÉ HO DA FARE!'], ['no', 'Vado via solo perché mi si fredda il brodo, stronzo!']],
    arrenditi: [['co', 'Va bene, va bene! Hai vinto! Ma solo perché mi fa male il ginocchio da prima!'], ['sb', 'Basta! Basta, cazzo! Mi arrendo! Ma lo dico piano, eh.'], ['ma', 'Oggi vinci tu. Segnatelo: oggi. Domani è un altro giorno. Brutto, per te.']],
    separa: [['*', 'Fermi, animali! Mi state sporcando la strada!'], ['co sb', 'Basta, che sembrate due cozze sullo stesso scoglio!'], ['no', 'Smettetela, delinquenti, che chiamo vostra madre! Le conosco tutte, le vostre madri!'], ['pr', 'Fermi, figlioli, che vi do una… una benedizione in faccia!']],
    guasto: [['*', X => maledizione(X.st, X.tipo)]],
    si_rompe: [['*', 'CRAC?! Porca miseria, era di mia zia! Mo\' chi glielo dice?'], ['sb', 'Rotto. Come la mia vita, come il mio motorino, come tutto. Cazzo.'], ['co', 'S\'è rotto da solo! Io manco l\'ho toccato! …L\'ho toccato un pochino.'], ['no', 'Ecco. Rotto. Come mio marito buonanima: non ha mai retto niente.']],
    si_sporca: [['*', 'Merda. E non lo dico per dire.'], ['co', 'Ma porca zozza, la camicia della domenica! Mia madre mi ammazza, e ha ragione!'], ['ma', 'Chi mi ha sporcato? Nessuno? Va bene. Allora tutti.']],
    si_bagna: [['*', 'Bagnat§ come uno stronzo nel porto. Grazie, mondo.'], ['co sb', 'Fradic§! Ma porca la miseria marinara!'], ['ma', 'L\'acqua mi ha mancato di rispetto. Me lo segno.']],
    cade: [['co ma', 'Non ho visto niente io. Nemmeno voi. CHI HA RISO?!'], ['co', 'Sono cadut§ apposta! Si chiama allenamento, ignoranti!'], ['*', 'Mannaggia al marciapiede e a chi l\'ha messo storto!'], ['no', 'Aiutatemi a rialzarmi, stronzi, che poi vi meno uno per uno!'], ['pr', 'Ahia! Porca… porca la Quaresima!']],
    scappa_via: [['*', 'Torna qua, stronzo! …Dicevo alla cosa.'], ['sb', 'E scappa pure tu! Scappate tutti! Come mia moglie!']],
    resta_incastrato: [['*', 'Non sono incastrat§! Sto… riflettendo. Tiratemi fuori, cazzo!'], ['co', 'Nessuno mi fotografa! Chi mi fotografa lo ammazzo! Appena esco!']],
    monete: [['*', 'I soldi! Nessuno si muova! Chi si abbassa è un ladro!'], ['sb', 'E vai, sotto la panchina. Come sempre. Pure i soldi mi schifano.']],
    perde_cappello: [['*', 'Il cappello! Vento di merda, pure tu contro di me?!'], ['co', 'Il cappello! Era di mio nonno! …Era di un mercato. Ma ci tenevo!']],
    colpisce_altro: [['*', 'Scusa! Cioè, no: eri tu in mezzo, coglione.'], ['ma', 'Non ti ho preso apposta. Se ti prendevo apposta, te ne accorgevi.']],
    figuraccia: [['*', 'Ridete, ridete. Mi ricordo le facce, eh. Tutte.'], ['co', 'Che c\'è da ridere?! Era una mossa! Una mossa difficile!']],
    scoperto: [['*', 'Non è mio! Me l\'ha dato uno! Uno alto! Che è scappato!'], ['ma', 'Questo? Questo l\'ho trovato. Per terra. Dentro una macchina. Chiusa.']],
    fondo: [['co', X => `Lo sai chi sono io? ${vanto(X.st, X)}`], ['co', X => vanto(X.st, X)], ['sb', X => lamento(X.st, X)], ['sb', X => lamento(X.st, X)], ['sb co no ma', X => proverbio(X.st)],
      ['ma', X => mala(X.st, X)], ['ma', X => mala(X.st, X)], ['co ma', X => mamma(X.st, X)], ['no', X => nonna(X.st, X)], ['no', X => nonna(X.st, X)], ['pr', X => prete(X.st)], ['pr', X => prete(X.st)],
      ['sb co', X => confessa(X.st)], ['sb co ma', X => grigi(X.st, X)]],
    si: [['*', 'Ci sto, porca miseria! Finalmente un\'idea che non fa cagare.'], ['sb co', 'Sì, cazzo! E se passano {G}, gli diamo una sedia pure a loro.'], ['co ma', 'Io dico sì. E chi dice no, porta i bancali a mano. Coi denti.'],
      ['sb', 'Votato! Pure mia madre vota sì, e non sa manco di che parliamo.'], ['co', 'Bella, fra\'! Si fa e chi se ne frega.'], ['no', 'Sì, sì, fatela, ma pulite dopo, porci.'], ['ma', 'Si fa. Ho parlato io. Gli altri possono parlare, ma ho parlato io.'], ['pr', 'Sì, per tutti i… sì. Amen. Si fa, porca… pazienza.']],
    no: [['*', 'Ma che cazzo di idea è? Chi te l\'ha detta, tua zia?'], ['sb', 'No. Neanche morto. Neanche morto e seppellito sotto il presidio.'], ['sb co', 'Ma vaffanculo, va\'. Io sto qui seduto e basta.'], ['*', 'Mi fa cagare. Con rispetto parlando. Ma mi fa cagare.'],
      ['sb co ma', 'Così {G} ci ridono in faccia, e poi ci multano la faccia.'], ['no', 'Ma che schifezza, sembra la cantina di mio cognato. Lui era un porco, e pure la cantina.'], ['ma', 'No. Ho detto no. Lo dico una volta, poi lo dice qualcun altro per me.']],
    bocciato: [['*', 'Siete dei cagasotto. Tutti. Pure il cane.'], ['sb co', 'Va bene, mollaccioni. Ma quando arrivano {G} non venite a piangere da me.'], ['*', X => maledizione(X.st, X.tipo) + ' A tutti quanti!'], ['ma', 'Va bene. Mi segno i nomi. Così, per ricordo.']],
    auto_sbuffa: [['*', X => `${pkS(X.st, AU_APRI, 'au_a')} ${pkS(X.st, AU_LAM, 'au_l')}, ${insulto(X.st, 'm')}!`], ['*', X => `${pkS(X.st, AU_APRI, 'au_a')} ${pkS(X.st, AU_LAM, 'au_l')}! ${maledizione(X.st, 'sb')}`], ['*', X => `${simile(X.st, 'm', 'tu')}! Spostatevi!`]],
    auto_ferma: [['*', 'E mo\' da dove cazzo passo? Dal tetto?'], ['*', 'Aprite, o vi parcheggio sul divano!'], ['*', X => `Faccio il giro, faccio il giro… ma ${maledizione(X.st, 'sb').replace(/^Che /, 'che ').replace(/!$/, '')}, a tutti quanti!`],
      ['*', 'Va bene, torno indietro. Ma mi segno le facce, stronzi!'], ['*', X => `Chiusa?! Ma porca la miseria, ${pkS(X.st, AU_LAM, 'au_l')}!`]],
    auto_tifa: [['*', 'Bravi, cazzo! Fategliela vedere ai Grigi! …Non l\'ho detto io.'], ['*', 'Grandi! Mettetegli pure il divano in mezzo, a quelli!'], ['*', 'Forza ragazzi, che i Grigi c\'hanno il culo pesante!'], ['*', 'Vi porto le birre al ritorno! Se mia moglie non le conta!']],
  };
  const BORB_A = ['Guarda questo…', 'Eh, eh…', 'Mmh. Mmh.', 'Ma senti…', 'Ma tu guarda…', 'Mo\' basta, eh…', 'Respira, respira…', 'Ma chi è \'sto qua…'];
  const BORB_B = ['mo\' mi giro e vediamo.', 'oggi ho la luna storta e lui me la raddrizza.', 'mia madre l\'ha cresciuto male, sua madre.', 'conto fino a dieci. Sono arrivato a tre.', 'non lo guardo, non lo guardo… lo guardo.', 'io sono calmo, sono le mani che non sono calme.', 'guarda che faccia, pare un citofono rotto.', 'se mi guarda un\'altra volta gli chiedo il pizzo sull\'occhiata.'];
  const SPINTA = ['Spostati', 'Fatti in là', 'Levati di mezzo', 'Circolare', 'Aria, aria', 'Indietro, indietro'];
  const COLPO_A = ['TIÈ!', 'PAM!', 'Prendi!', 'E uno!', 'Questa la senti!', 'Sciaff!'];
  const COLPO_B = ['E adesso piangi, che ti fa bene.', 'Mi sono fatt§ male io, ma tu di più!', 'Ahia, la mano! …Ahia pure tu, spero!', 'Fammi vedere la faccia. Ecco, così è meglio.', 'Così impari a guardarmi il motorino.', 'Dillo a tua madre che sono stato io. Con rispetto.', 'E non mi far ripetere, che mi stanco.'];
  const PER_CHI = ['mia sorella', 'la mia Vespa', 'mio cugino che è in galera', 'tutte le volte che mi hai guardato storto', 'il caffè che m\'hai fatto rovesciare', 'mia nonna, che ti saluta', 'il quartiere. Il quartiere ringrazia'];
  const AU_APRI = ['Ma levatevi dal cazzo,', 'Uè, spostate \'sta roba,', 'Oh, ma siete scemi?', 'Porca miseria,', 'Ma che cazzo è \'sta baracca?', 'Spostatevi, porca vacca,', 'Minchia,'];
  const AU_LAM = ['ho il pesce che si scongela', 'mia moglie mi aspetta col mattarello', 'ho la frizione che fuma', 'devo consegnare due quintali di cozze', 'c\'ho la suocera in macchina e vuole scendere', 'sono in ritardo dal 1974', 'ho il gelato sul sedile', 'mi scappa da Marsiglia'];
  function calmo(g) { const w = ['calm*', 'tranquill*', 'seren*', 'rilassat*'][Math.floor(rnd() * 4)].replace('*', g === 'f' ? 'a' : 'o'); return `Sono ${w}. Sono ${w.toUpperCase()}. SONO ${w.toUpperCase().replace(/[OA]$/, 'ISSIM$&')}, CAZZO!`; }
  function scusa(X) { return pkS(X.st, SCUSE, 'scusa').replace(/§/g, X.g === 'f' ? 'a' : 'o'); }
  const VANTI = ['Io a dodici anni avevo già il motorino truccato!', 'Io conosco gente a Marsiglia! Gente brutta! Gente coi baffi!', 'Mio cugino fa il buttafuori! Il cugino grosso, non quello che piange!', 'In questo vicolo comando io! Dalle tre alle cinque.',
    'Io ho due motorini e una denuncia! Tu che c\'hai?', 'A me mi rispettano pure i gabbiani!', 'Io ho fatto piangere un Grigio! Gli ho rigato la macchina, ma ha pianto!', 'Io ho la cintura nera! Di bocce, ma è nera!',
    'Io il mare lo attraverso a nuoto! Fino alla boa. Ma lo attraverso!', 'Io bevo il caffè bollente senza soffiare! Chiedi in giro!', 'Mi hanno arrestato tre volte! Una era uno scambio di persona, ma conta!', 'Io al biliardo ho battuto il campione della Calata! Era ubriaco, ma l\'ho battuto!'];
  function vanto(st, X) { const s = pkS(st, VANTI, 'vanto'); return X.giuro && rnd() < .4 ? s + ' ' + X.giuro : s; }
  const LAMENTI = {
    porto: ['Cento casse di sardine, oggi. Puzzo come una scatoletta, cazzo.', 'Mi fanno male le mani, la schiena e i coglioni. In quest\'ordine.', 'Il capo dice che sono lento. Io dico che lui è stronzo. Siamo pari.', 'Scarico navi da vent\'anni e non ne ho mai vista una che mi porta via, a me.'],
    pesce: ['Alle quattro ero già in mare. Il pesce dormiva. Stronzo pure lui.', 'Oggi niente. Due triglie e una ciabatta. La ciabatta la vendo come spigola.', 'La rete s\'è impigliata di nuovo. Ogni giorno lo scoglio, sempre lo stesso. Mi odia.'],
    motori: ['Ho messo le mani in un motore che manco il diavolo. Nero fino ai gomiti, cazzo.', 'Un cliente mi ha detto «fa un rumorino». Era una marmitta che gridava aiuto.', 'Benzina, olio, grasso. Mia moglie dice che profumo di ferramenta.'],
    notte: ['Stanotte ho buttato fuori tre ubriachi e un cugino mio. Il cugino è tornato.', 'Al Flamingo stanotte uno m\'ha detto «lei non sa chi sono io». Infatti, non lo so ancora. Era svenuto.'],
    terra: ['Dodici ore di sole sulla schiena. Sembro una melanzana alla brace, porca miseria.', 'Il padrone dice che la terra è bassa. Venisse lui a piegarsi, \'sto stronzo.'],
    niente: ['Io non lavoro per scelta. Il lavoro ha scelto un altro.', 'Oggi faccio il giro del paese. Due volte. Poi mi siedo. Che giornata pesante, cazzo.', 'Mia madre dice «trovati un lavoro». Io l\'ho cercato. Non c\'era. Sono tornato a casa.', 'Ho dormito fino a mezzogiorno e mi sento stanco lo stesso. È la società.'],
    tutti: ['Che caldo di merda. O che freddo di merda. Comunque di merda.', 'Oggi m\'è andato tutto storto. Pure il caffè: era buono, e m\'ha fatto incazzare.', 'Mi devono tutti dei soldi. Io devo dei soldi a tutti. Non so più chi devo menare.'],
  };
  function lamento(st, X) {
    const j = X.job || '', k = /scaricator|facchin|magazzin/.test(j) ? 'porto' : /pescat|pescivend/.test(j) ? 'pesce' : /meccanic|benzinai|saldator|carpentier/.test(j) ? 'motori' : /buttafuor|barman/.test(j) ? 'notte' : /braccian|salinar|cavator/.test(j) ? 'terra' : X.disocc ? 'niente' : 'tutti';
    return pkS(st, LAMENTI[k].concat(rnd() < .3 ? LAMENTI.tutti : []), 'lam');
  }
  const PROV_H = ['Chi dorme non piglia pesci', 'Chi va piano va sano e va lontano', 'Tra il dire e il fare c\'è di mezzo il mare', 'Meglio l\'uovo oggi che la gallina domani', 'Chi trova un amico trova un tesoro', 'L\'abito non fa il monaco',
    'Can che abbaia non morde', 'Chi la fa l\'aspetti', 'Il mattino ha l\'oro in bocca', 'Chi si accontenta gode', 'A caval donato non si guarda in bocca', 'Ogni scarrafone è bello a mamma sua', 'Chi tardi arriva male alloggia', 'Non è tutto oro quel che luccica'];
  const PROV_T = ['ma manco le mazzate', 'e chi non è d\'accordo si attacca al cazzo', 'diceva mio nonno, che però è morto in galera', 'e stronzo chi lo nega', 'ma col cazzo che ci credo', 'così dice mia nonna, e mia nonna ha menato un Grigio',
    'e infatti io dormo e basta', 'parola di mio zio, che non ha mai lavorato un giorno', 'e mo\' che cazzo c\'entra lo sai solo tu', 'però puzza lo stesso', 'e io c\'ho le prove: guarda mio cognato'];
  function proverbio(st) { const h = pkS(st, PROV_H, 'prov_h'); return `${h}, ${pkS(st, PROV_T, 'prov_t')}.`; }
  const MALA = ['Questo marciapiede è mio. Ci sto io, ci cammino io, ci sputo io.', 'Qui intorno non si muove una foglia senza che lo sappia io. …Chi ha mosso quella foglia?!', 'Io non minaccio nessuno. Faccio previsioni.', 'Ho un amico che fa sparire le cose. Pure i calzini. Soprattutto i calzini.',
    'Tu non mi conosci. E fidati: è meglio così. Per te. Per me. Per tutti. Ciao.', 'Il rispetto. Il rispetto è tutto. Il rispetto e le polpette di mia madre.', 'Io parlo poco. Quando parlo, la gente poi parla di me. Bene, di solito. Per forza.',
    'Ho visto cose che voi non potete immaginare. Tipo mio cugino in costume.', 'Io qui ho degli interessi. Interessi grossi. Tre motorini e un\'edicola.', 'Non mi piace la violenza. Mi piace quando la gente capisce prima.'];
  function mala(st, X) { const s = pkS(st, MALA, 'mala'); return X.giuro && rnd() < .35 ? s + ' ' + X.giuro : s; }
  function mamma(st) { return pkS(st, ['Io ho paura solo di due cose: dei Grigi e di mia madre col mestolo. In quest\'ordine. No: al contrario.', 'Mia madre dice che sono un delinquente. Poi mi fa la pasta al forno. Mi ama.', 'Ho un coltello in tasca. Me l\'ha dato mia madre: per le mele.',
    'Se tocchi mia madre sei morto. Se tocchi mia sorella pure. Mio fratello, toccalo, che è uno stronzo.', 'Il giorno che mia madre muore, io piango tre giorni e poi ammazzo qualcuno. Non so chi. Qualcuno.', 'Mi hanno fatto un tatuaggio con scritto «Mamma». Lei l\'ha visto e m\'ha menato.'], 'mamma2'); }
  function nonna(st, X) { return pkS(st, ['Ai miei tempi gli stronzi come voi li buttavamo a mare. Con amore, eh.', 'Vaffanculo, tesoro. Hai mangiato?', 'Mio marito buonanima era un pezzo di merda. Mi manca tanto.', 'Io alla tua età avevo già menato tre Grigi e cresciuto sei figli. Tu che fai? Niente, cazzo.',
    'Ho ottantadue anni, il diabete e un coltello nella borsa. Non mi fate girare le palle.', 'Quella del terzo piano è una stronza. Ma fa una parmigiana… Dio la benedica, la stronza.', 'Al mercato m\'hanno fregato sul peso. Ho fatto finta di niente. Domani gli rubo un melone.',
    'I giovani d\'oggi non sanno manco bestemmiare. Ai miei tempi era un\'arte. Piccola, ma un\'arte.'], 'nonna'); }
  function prete(st) { return pkS(st, ['Il Signore ama tutti. Pure te. Io un po\' meno, porca… porca l\'oca.', 'Ho perso a briscola col sagrestano. Che il Signore lo… lo benedica, quel ladro.', 'Stamattina in chiesa quattro vecchie e un cane. Il cane era il più attento, porc… pazienza.',
    'Pace e bene. Pace e bene. Pace… e che due palle, oggi, figlioli.', 'Mi hanno rubato le candele un\'altra volta. Chi è stato lo sa Dio. E presto lo so pure io.'], 'prete'); }
  function confessa(st) { return pkS(st, ['Non lo dire a nessuno: piango ai matrimoni. Pure a quelli degli stronzi.', 'Te lo dico solo a te: ho paura dei piccioni. Quelli grossi, col collo verde. Bastardi.', 'Una volta ho fatto pace con uno. Me ne pento ancora.',
    'Io il motorino non lo so guidare. Lo spingo. Ma con stile, cazzo.', 'Ho un debito con lo Squalo, uno con mia suocera e uno col barbiere. Ho più paura del barbiere.'], 'confessa'); }
  function grigi(st, X) { return pkS(st, ['Se arrivano {G}, io non c\'ero. E neanche il motorino. Il motorino è di mio cugino.', 'Hai visto {G}? Gente che fa la multa pure ai gabbiani. Stronzi.', '{G} mi hanno fermato tre volte stamattina. Alla terza gli ho offerto il caffè. Me l\'hanno multato.',
    '{G}? Gli piace il modulo. Il modulo, la carta, il timbro. Gli dai un timbro e godono.'], 'grigi'); }

  // ======================= LA CULTURA: i Grigi col soprannome, il giuramento del gruppo =======================
  function grigiW(st, n) {
    const c = st.u && st.u.cultura; let w = null;
    if (c && c.sa && c.par) { const W = (c.sa[n.id] || []).map(e => c.par[e[0]]).filter(Boolean), P = W.find(P => P.k === 'grigi'); if (P) w = P.w; }
    const base = w || 'i Grigi', r = rnd(); if (w) fonte('cultura:grigi');
    return r < .35 ? base : base + pkS(st, [' del cazzo', ' di merda', ', \'sti morti di sonno', ' coi loro moduli del cazzo', ', quei rompicoglioni'], 'g_coda');
  }
  function giuroDi(st, n) {
    const s = S(st), Gr = GR(), cu = st.u.cultura && st.u.cultura.com; if (!cu) return null;
    const g = Gr && Gr.gruppoDi(st, n.id); let gid = g ? 'g:' + g.id : null;
    if (!gid) { const cs = st.u.costruire && st.u.costruire.cantieri; if (cs) for (const C of cs) if (!C.chiuso && ((C.vive && C.vive[n.id]) || (C.gruppo || []).includes(n.id)) && cu['c:' + C.id]) { gid = 'c:' + C.id; break; } }
    if (!gid) { const sa = s.sa[n.id]; if (sa) gid = sa; }
    if (!gid) return null;
    if (s.giuri[gid]) return s.giuri[gid];
    const c = cu[gid]; if (!c || !c.nome) return null;
    const o = c.sim && c.sim.o ? c.sim.o : c.ogg, nm = String(c.nome);
    const L = [`Parola di ${nm}, cazzo!`, `Lo giuro su ${nm}!`, `Chiedi a ${nm}, chiedi!`];
    if (o) L.push(`Per ${/^(il|lo|la|l'|i|gli|le) /i.test(o) ? o.replace(/^il /i, 'il ') : 'il ' + o} sacro, minchia!`, `Giuro sul ${String(o).replace(/^(il|lo|la|l'|i|gli|le)\s?/i, '')} di ${nm}!`);
    const t = L[Math.floor(hashS(seme(st) + gid) * L.length) % L.length]; s.giuri[gid] = t; stats.giuri++; return t;
  }


  // ======================= LA MENTE CHE PARLA: le frasi fatte da quello che c'è =======================
  // Una battuta non si pesca: si costruisce da chi parla (che cosa vuole dire adesso, a chi, perché) e da quello che sa del mondo:
  // il mestiere dell'altro, il suo ultimo guasto (il fatto «guasto»), il debito fra i due (Fatto.debito), il torto che brucia
  // (Fatto.rancore e il fatto che l'ha aperto), il gruppo e la cultura (il nome, il soprannome, i Grigi col nome del gruppo, il santo,
  // il simbolo), le cose che ha avuto in mano, il posto dove sta; e da come sta lui (la fame, il sonno, la rabbia, il vino, il turno
  // che comincia, i soldi che deve). Le tavole di sopra restano materia (gli epiteti, le azioni delle minacce, i ritmi). Ogni pezzo di
  // mondo usato lascia una FONTE (FONTI): la prova conta quante battute ne hanno.
  const io = id => (id === 'player' || id === 'nino' ? 'nino' : String(id));
  const fonte = k => { if (k && !FONTI.includes(k)) FONTI.push(k); };
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const RB = () => (typeof Roba !== 'undefined' && Roba.ON ? Roba : null);
  function cosaN(k) {
    if (!k) return null; let w = String(k);
    try { const e = RB() && RB().di(k); if (e) w = e.corto || e.nome || w; } catch (er) { }
    w = String(w).replace(/_/g, ' ').replace(/\s*\(.*\)$/, '').toLowerCase().trim();
    return w && w.split(' ').length <= 3 && !/\d/.test(w) ? w : null;
  }
  const cosaR = k => { try { return k && RB() && RB().di(k) ? cosaN(k) : null; } catch (e) { return null; } };
  const ART = (w, tipo) => { try { const L = LG(); if (L && L.art) { const s = L.art(w, tipo); if (s) return s; } } catch (e) { } return (tipo === 'di' ? 'di ' : tipo === 'a' ? 'a ' : '') + w; };
  const FEMW = w => { try { const L = LG(); if (L && L.genere) return L.genere(w).f; } catch (e) { } return /a$/.test(w); };
  const nomeDi = (st, id) => { if (io(id) === 'nino') return 'Nino'; const n = npc(st, id); return n ? String(n.first || n.name || '').split(' ')[0] || null : null; };
  const sesso = (st, id) => { if (io(id) === 'nino') return 'm'; const n = npc(st, id); return n && n.pop && n.pop.sex === 'f' ? 'f' : 'm'; };
  const ga = (s, g) => s.replace(/\*/g, g === 'f' ? 'a' : 'o');
  function lavoro(n) { const P = n && n.pop; if (!P) return null; const j = P.job && (P.job.title || P.job.base); if (j) { const t = String(j).replace(/\s*\(.*$/, ''); return t[0].toLowerCase() + t.slice(1); } return P.status === 'disoccupato' ? (P.sex === 'f' ? 'disoccupata' : 'disoccupato') : null; }
  function luogo(st, x, y) { let b = null, bd = 2500; for (const k in G.PLACES || {}) { const P = G.PLACES[k], d = (P.x - x) ** 2 + (P.y - y) ** 2; if (d < bd) { bd = d; b = P; } } return b && b.name ? b.name : null; }
  const lire = v => { try { const L = LG(); if (L && L.VALUTA) return L.VALUTA.fmt(v); } catch (e) { } return Math.round(v) + '.000 lire'; };
  const quando = (st, t) => { const d = Math.floor(st.t / 1440) - Math.floor(t / 1440); if (d <= 0) return (t % 1440) < 720 ? 'di stamattina' : 'di oggi'; if (d === 1) return 'di ieri'; const g = G.dayName ? G.dayName(t) : ''; return g ? 'di ' + String(g).toLowerCase() : "dell'altro giorno"; };
  const BANALI = /^(vai|entra|esce|chiacchiera|chiacchiera_in_strada|lavora|dorme|mangia|compra|saluta|mente|desiderio|desiderio_fine|movente|bussa|origlia|idea|storia_incrocio|raduno|iniziativa|parola_nuova|toponimo|soprannome|rettifica|rito|canto|storia_fine|incontro|appuntamento|presidio\w*|struttura_chiesta|nome_\w+|cerimonia\w*|mito\w*|superstizione|proverbio)$/;
  function fatti(st, id, giorni) { const F = FT(); if (!F) return []; let L = []; try { L = F.per(st, { chi: io(id), da: st.t - 1440 * (giorni || 3) }); } catch (e) { } return L; }
  // «Gino ha pulito per terra al Bar» → per Gino: «ho pulito per terra al Bar»; per gli altri: «ha pulito per terra al Bar»
  function azioneDi(st, f, chi) {
    const nm = nomeDi(st, chi), d = f && (f.d || (f.x && f.x.d)); if (!nm || !d || typeof d !== 'string') return null;
    if (d.indexOf(nm) !== 0) return null; const r = d.slice(nm.length).trim().replace(/[.!]+$/, '');
    if (!/^(ha|si è|è|si) /.test(r) || r.length > 58 || /«|:/.test(r)) return null;
    return r;
  }
  const prima = r => r.replace(/^ha /, 'ho ').replace(/^si è /, 'mi sono ').replace(/^è /, 'sono ').replace(/^si /, 'mi ');
  // l'ultimo guasto di qualcuno, detto come una sua qualità
  const GUASTO_Q = {
    si_rompe: c => (c ? `che rompe pure ${ART(c, 'det')}` : 'che rompe tutto quello che tocca'), si_sporca: () => 'che si sporca pure a guardarsi allo specchio',
    si_bagna: (c, g) => ga('che finisce a bagno vestit*', g), cade: () => 'che inciampa nei marciapiedi', scappa_via: c => (c ? `che si fa scappare ${ART(c, 'det')} di mano` : 'che perde tutto per strada'),
    resta_incastrato: (c, g) => ga('che resta incastrat* nelle porte', g), monete: () => 'che semina monete sotto le panchine', perde_cappello: () => 'che si fa fregare il cappello dal vento',
    colpisce_altro: () => 'che mena la gente girandosi', figuraccia: () => 'che fa ridere mezza piazza', scoperto: c => (c ? `che gira con ${ART(c, 'ind')} in tasca` : 'che si fa beccare sempre'),
  };
  const GUASTO_N = { si_rompe: null, si_sporca: 'macchia', si_bagna: 'pozzanghera', cade: 'marciapiede', scappa_via: null, resta_incastrato: 'porta', monete: 'monetina', perde_cappello: 'cappello', colpisce_altro: 'gomito', figuraccia: 'figuraccia', scoperto: null };
  const EMBLEMA = [[/pescat|pescivend/, 'triglia'], [/scaricator|facchin|magazzin/, 'cassa di sardine'], [/meccanic|benzinai|officina/, 'chiave inglese'], [/barist|camerier|barman|oste\b|gestore/, 'tazzina'], [/fornai|forno/, 'pagnotta'],
    [/saldator|carpentier|falegnam|fabbr/, 'chiodo'], [/braccian|vignaiol/, 'zappa'], [/salinar/, 'sacco di sale'], [/cavator/, 'sasso'], [/sart/, 'ditale'], [/tipograf/, 'timbro'], [/bidell|spazzin/, 'scopa'], [/infermier|farmacist/, 'supposta'],
    [/pugilato|buttafuor|guardia/, 'sacco da boxe'], [/cuoc/, 'mestolo'], [/maestr|biblioteca|impiegat/, 'matita'], [/operai/, 'bullone'], [/commess/, 'scontrino'], [/garzon|macell/, 'salsiccia'], [/disoccupat/, 'divano'], [/pension/, 'dentiera'], [/sagrestan|suor|parroco/, 'candela']];
  const emblema = j => { if (!j) return null; for (const [re, w] of EMBLEMA) if (re.test(j)) return w; return null; };
  const OFF_N = { furto: (c) => (c ? `per ${ART(c, 'det')} che m'hai fregato` : 'per la roba che m\'hai fregato'), insulto: () => 'per quella parola', spinta: () => 'per lo spintone', botte: () => 'per le botte', minaccia: () => 'per la minaccia',
    lancio: c => (c ? `per ${ART(c, 'det')} che m'hai tirato` : 'per quello che m\'hai tirato'), denuncia: () => 'per la spiata ai Grigi', rinfacciato: () => 'per quello che m\'hai rinfacciato', guasto: () => 'per il guaio che m\'hai combinato', buca: () => 'per la buca che m\'hai tirato', parola_rotta: () => 'per la parola che non hai mantenuto' };

  // ---------- quello che chi parla sa di un altro: le «qualità», ognuna con la sua fonte ----------
  function qualita(st, sp, aid) {
    const out = [], A = io(aid) === 'nino' ? st.player : npc(st, aid), g = sesso(st, aid); if (!A) return out;
    const j = io(aid) === 'nino' ? null : lavoro(A), em = emblema(j);
    if (j && !/disoccupat|altro/.test(j)) out.push([`${ga('stronz*', g)} d'un ${j}`, 'mestiere:' + j, 1], [`${j} dei miei stivali`, 'mestiere:' + j, .8]);
    if (em) out.push([`faccia da ${em}`, 'mestiere:' + j, 1.1], [`testa di ${em} ${ga(rp(['scadut*', 'ammaccat*', 'sgonfi*', 'bagnat*', 'di seconda mano', 'rifiutat* pure dai gatti']), FEMW(em) ? 'f' : 'm')}`, 'mestiere:' + j, 1.1]);
    let gu = null, az = null; const L = fatti(st, aid, 4);
    for (let i = L.length - 1; i >= 0 && (!gu || !az); i--) { const f = L[i]; if (String(f.chi) !== io(aid)) continue; if (!gu && f.v === 'guasto' && f.x && GUASTO_Q[f.x.g]) gu = f; else if (!az && !BANALI.test(f.v)) { const r = azioneDi(st, f, aid); if (r) az = [f, r]; } }
    if (gu) out.push([`${ga(rp(['scem*', 'disgraziat*', 'fess*', 'sfigat*']), g)} ${GUASTO_Q[gu.x.g](cosaR(gu.cosa || gu.x.cosa), g)}`, 'fatto:guasto#' + gu.id, 1.6]);
    if (az) out.push([`${rp(['quell* che', 'pover* disgraziat* che', 'genio che', 'fenomeno che'])} ${az[1]}`.replace(/\*/g, g === 'f' ? 'a' : 'o').replace('fenomeno', g === 'f' ? 'fenomena' : 'fenomeno'), 'fatto:' + az[0].v + '#' + az[0].id, 1.3]);
    const F = FT(); if (F && sp) { try { const d = F.debito(st, io(sp.id), io(aid)); if (d > .5) out.push([`${ga('mort* di fame', g)} che mi deve ancora ${lire(d)}`, 'debito', 1.8]); } catch (e) { } }
    const Gr = GR(), gr = Gr && io(aid) !== 'nino' && Gr.gruppoDi(st, aid), cu = st.u.cultura && st.u.cultura.com;
    if (gr && cu && cu['g:' + gr.id] && cu['g:' + gr.id].nome) out.push([`buffone ${ART(cu['g:' + gr.id].nome, 'di')}`.replace(/^buffone/, g === 'f' ? 'buffona' : 'buffone'), 'gruppo:' + cu['g:' + gr.id].nome, 1.2]);
    const so = st.u.cultura && st.u.cultura.sopr && st.u.cultura.sopr[aid]; if (so && so[0]) out.push([`${so[0]}, come ti chiamano tutti`, 'cultura:soprannome', 1.2]);
    { const T = io(aid) !== 'nino' && FK(st).tit[aid]; if (T) out.push([`${T.h} dei miei stivali`, 'eti:' + aid, 1.7], [`Sua Eccellenza ${rp(['un cavolo', 'il niente', 'la ciabatta'])}`, 'eti:' + aid, 1.2], [T.mock ? T.t : `${T.h} ${rp(['dei poveri', 'della mutua', 'a rate'])}`, 'eti:' + aid, 1.8]); }
    const I = sp ? idl(st, sp.id) : null;
    if (I && I.fav && st.t - I.fav[1] < 2880) out.push([`faccia di ${I.fav[0]}`, 'idioletto:' + I.fav[0], .9]);
    if (I) for (const eid in I.e) { const E = S(st).esp && S(st).esp[eid]; if (E && E.k === 'img') { out.push([E.w, 'esp:' + eid, 1.5, 1]); break; } }
    if (I) for (const eid in I.e) { const E = S(st).esp && S(st).esp[eid]; if (E && E.k === 'par' && !E.p.vb) { out.push([E.p.w, 'parola:' + eid, 1.7, 0, E]); if (rnd() < .4) out.push([ufficiale(st, E, 'titolo'), 'parola:' + eid, 1.5, 0, E]); break; } }
    return out;
  }
  const scegliQ = (st, L) => pk(st, L, 'mat', x => x[1] + '|' + x[0].split(' ').slice(-2).join(' '));
  const terza = w => w.replace(/^sei /, 'è ').replace(/^farai /, 'farà ').replace(/^stai /, 'sta ');
  const inL = l => (/^(Via|Vico|Vicolo|Piazza|Piazzetta|Calata|Salita|Largo|Corso|Riva|Lungomare|Viale|Strada)\b/.test(l) ? 'in ' + l : ART(l, 'a'));
  // ---------- come sta chi parla: la rabbia che sale, e le scuse vere per non menare ----------
  function intensita(st, n, tipo) {
    const N = (n.pop && n.pop.need) || {};
    let I = { sb: .6, co: .55, ma: .35, no: .5, pr: .15 }[tipo] || .2;
    I += (N.rabbia || 0) * .7 + ((N.fame || 0) > .7 ? .15 : 0) + ((N.sonno || 0) > .75 ? .12 : 0) + (N.paura || 0) * .25 + ((n.drunk || (n.pop && n.pop.drunk)) > 0 ? .35 : 0);
    return clamp(I, 0, 1.3);
  }
  function scuseVere(st, n) {
    const out = [], N = (n.pop && n.pop.need) || {}, I = idl(st, n.id), P = n.pop || {}, h = ((st.t % 1440) / 60);
    if ((N.fame || 0) > .55) out.push([`dopo mangiato, che ho una fame che mi mangerei ${ART(I.fav && I.fav[0] || 'il bancone', 'det')}`, 'bisogno:fame']);
    if ((N.sonno || 0) > .6) out.push(['domani, che stanotte non ho chiuso occhio', 'bisogno:sonno']);
    if (P.job && typeof P.job.start === 'number') { const dh = (P.job.start - h + 24) % 24; if (dh > 0 && dh < 3) out.push([`dopo il turno, che alle ${P.job.start % 24} attacco a lavorare`, 'turno']); }
    const F = FT(), M = st.u.menti && st.u.menti[n.id];
    if (F && M && M.rel) for (const b of Object.keys(M.rel).slice(0, 10)) { try { const d = F.debito(st, io(b), io(n.id)); if (d > .5) { out.push([`appena ridò ${lire(d)} a ${nomeDi(st, b)}. Cioè mai`, 'debito']); break; } } catch (e) { } }
    if ((P.age || 40) < 30) out.push(['se mia madre mi dà il permesso', 'famiglia']);
    if ((n.drunk || P.drunk) > 0) out.push(['appena la piazza smette di girare', 'bisogno:vino']);
    return out;
  }
  // il perché di un rancore: il fatto vero fra i due
  function torto(st, sp, aid) {
    const F = FT(); if (!F) return null; let L = [];
    try { L = F._.comuni(st, io(sp.id), io(aid)); } catch (e) { return null; }
    for (let i = L.length - 1; i >= 0 && i >= L.length - 40; i--) { const f = L[i]; if (OFF_N[f.v] && String(f.chi) === io(aid)) return [OFF_N[f.v](cosaN(f.cosa)) + ' ' + quando(st, f.t), 'fatto:' + f.v + '#' + f.id]; }
    return null;
  }
  function bestemmia(st, n, tipo, I) {
    const W = espDi(st, n.id, 'par'); if (W && rnd() < .4) { usa(st, n.id, W); return diPar(st, W, 'escl', n.pop && n.pop.sex === 'f' ? 'f' : 'm'); }
    const E = espDi(st, n.id, 'escl'); if (E && rnd() < .45) { usa(st, n.id, E); return E.w.replace(/!$/, ''); }
    if (tipo === 'pr') return rp(['Porca… porca l\'oca', 'Mannaggia… benedetta', 'Santa pazienza']);
    if (I < .4) return rp(['Mannaggia', 'Accidenti', 'Porca miseria', 'Uffa, Madonna', 'Mamma mia']);
    if (I < .8) return rp(['Cazzo', 'Minchia', 'Porca vacca', 'Porca zozza', 'Mortacci', 'Merda']);
    return rp(['CAZZO', 'Porca… porca… PORCA LA MISERIA', 'Minchia, minchia, MINCHIA', 'Ma porca la miseria ladra e bastarda', 'Cazzo, cazzo, cazzo']);
  }
  function santoDi(st, n) {
    const cu = st.u.cultura && st.u.cultura.com; if (cu) { const Gr = GR(), g = Gr && Gr.gruppoDi(st, n.id), c = g && cu['g:' + g.id]; if (c && c.santo) { fonte('cultura:santo'); return String(c.santo); } }
    return rp(SANTI);
  }
  function simboloDi(st, n) {
    const cu = st.u.cultura && st.u.cultura.com, Gr = GR(), g = Gr && Gr.gruppoDi(st, n.id), c = cu && g && cu['g:' + g.id]; const o = c && (c.sim && c.sim.o || c.ogg);
    if (o) { fonte('cultura:simbolo'); return String(o).replace(/^(il|lo|la|l'|i|gli|le)\s?/i, ''); } return null;
  }

  // ---------- i gesti di parola: insultare, minacciare, vantarsi, maledire, chiacchierare ----------
  const VOC_SH = ['Statti zitto, %Q!', 'Ma vai a cagare, %Q!', 'Ma chi ti credi di essere, %Q?', 'Guarda chi parla: %Q.', '%N, sei un %Q, lo sanno tutti!', 'Tu, %Q, parli pure?', 'Torna da dove sei venuto, %Q!', 'Senti, %Q: levati.', '%Q! Ecco che sei.', 'Oh, %N! %Q!'];
  function insultoV(st, X, aid) {
    // a volte la parola si conia lì, sul bersaglio: dal suo mestiere, dalla cosa del suo ultimo guasto
    if (rnd() < .07 && Object.values(idl(st, X.n.id).e).length < 6) { const A = io(aid) === 'nino' ? null : npc(st, aid), em = A && emblema(lavoro(A)); if (em) { const R = conia(st, X.n, em.split(' ')[0]); if (R && !R.vb) { const E = nuovaPar(st, R, X.n.id, null); if (E) { impara(st, X.n.id, E); storia(st, 'nasce', E, X.n.id, `${R.f}: ${[R.a, R.pre, R.b, R.suf && '-' + R.suf[0]].filter(Boolean).join(' + ')} ← il mestiere di ${nomeDi(st, aid)} (${lavoro(A)})`); } } } }
    const Q = qualita(st, X.n, aid); if (!Q.length) return null; const q = scegliQ(st, Q); fonte(q[1]); if (q[4]) { usa(st, X.n.id, q[4]); if (io(aid) !== 'nino') try { insultoAttaccato(st, aid, X.n.id, q[4]); } catch (e) { } }
    if (q[3]) { const E = S(st).esp[q[1].slice(4)]; if (E) usa(st, X.n.id, E); return `${rp(['Statti zitto', 'Ma senti', 'Ma va\'', 'Ascolta', 'Guarda'])}, ${nomeDi(st, aid) || 'bello'}: ${q[0]}!`; }
    let sh = rp(VOC_SH); const nm = nomeDi(st, aid) || 'bello'; if (/sei un %Q/.test(sh) && !/^(stronz|testa|faccia|mort|buffon)/.test(q[0])) sh = '%N, %Q!';
    if (/sei un %Q/.test(sh) && /^(faccia|testa)/.test(q[0])) sh = sh.replace('sei un %Q', 'sei una %Q');
    let s = sh.replace('%Q', q[0]).replace('%N', nm).replace(/([!?.] )([a-zà-ù])/g, (m, a, b) => a + b.toUpperCase()); if (/^[a-z]/.test(s)) s = cap1(s);
    const I = intensita(st, X.n, X.tipo); if (I > .5 && rnd() < .5) s = bestemmia(st, X.n, X.tipo, I) + ', ' + minuscola(s);
    return s;
  }
  function minacciaV(st, X, aid) {
    const A = azione(st, X.tipo).slice(), w = torto(st, X.n, aid), sc = scuseVere(st, X.n), lu = luogo(st, X.n.x, X.n.y);
    { const Vb = Object.keys(idl(st, X.n.id).e).map(e => S(st).esp && S(st).esp[e]).find(E => E && E.k === 'par' && E.p.vb); if (Vb && rnd() < .6) { usa(st, X.n.id, Vb); A[0] = diPar(st, Vb, 'minaccia') + rp(['', ' tutto', ' come si deve', ', parola mia,']); } }
    let s = '';
    if (w) { fonte(w[1]); s = `${cap1(w[0])}, ${A[0]}`; } else if (lu && rnd() < .6) { fonte('luogo:' + lu); s = `${rp(['Ti trovo', 'Ti aspetto', 'Ti becco', 'Stasera ti porto'])} ${inL(lu)} e ${A[0]}`; } else s = cap1(rp(APRI) + A[0]);
    if (sc.length && rnd() < .7) { const c = pk(st, sc, 'scusa_v', x => x[1]); fonte(c[1]); s += `… ${c[0]}.`; } else s += '!';
    const I = intensita(st, X.n, X.tipo); if (I > .8 && rnd() < .4) s = s.replace(/^([^,]*)/, m => m.toUpperCase());
    return s;
  }
  const INFL = ['', ' Due volte!', ' Con una mano sola!', ' E c\'era mezzo paese a guardare!', ' Al buio, con la febbre!', ' Lo raccontano pure a Marsiglia!'];
  function vantoV(st, X) {
    { const T = FK(st).tit[X.n.id]; if (T && rnd() < .3) { fonte('folk:' + T.it); return `${rp(['Io sono', 'Rispetto, eh: io sono', 'Lo sai chi sono? Sono', 'Per voi sono'])} ${T.t}${T.perche ? ', per ' + T.perche : ''}. ${rp(['Mica pizza e fichi.', 'C\'è il diploma, a casa.', 'Chiedete al bar.', 'Inchinarsi è facoltativo. Per ora.'])}`; } }
    const L = fatti(st, X.n.id, 6), I = idl(st, X.n.id); let best = null, bw = -1;
    for (const f of L) { if (String(f.chi) !== String(X.n.id) || BANALI.test(f.v)) continue; const r = azioneDi(st, f, X.n.id); if (!r) continue; const w = (f.pub || .2) + (f.ril || 0) - (I.vanti[f.id] || 0) * .15 + rnd() * .3; if (w > bw) { bw = w; best = [f, r]; } }
    if (!best) return null; const [f, r] = best, k = I.vanti[f.id] = (I.vanti[f.id] || 0) + 1; fonte('fatto:' + f.v + '#' + f.id);
    const keys = Object.keys(I.vanti); if (keys.length > 30) delete I.vanti[keys[0]];
    const terzaP = rnd() < .3, pre = (terzaP ? rp(['Lo sai chi sono io? Quell* che ', 'Io sono quell* che ', 'Chiedi chi è quell* che ']) : rp(['Io? Io ', 'Chiedi in giro: io ', 'Io, da sol*, ', 'Sai che ho fatto io? Io '])).replace(/\*/g, X.g === 'f' ? 'a' : 'o');
    let s = pre + (terzaP ? r : prima(r)) + (k > 1 ? '!' : '.') + INFL[Math.min(k - 1, INFL.length - 1)];
    if (k > 2 && X.giuro) s += ' ' + X.giuro;
    return s;
  }
  function maledizioneV(st, X, cosa) {
    const n = X.n, I = idl(st, n.id), sa = santoDi(st, n), sim = simboloDi(st, n);
    let c = cosa || null, src = cosa ? 'cosa:' + cosa : null;
    if (!c) { const L = fatti(st, n.id, 1); for (let i = L.length - 1; i >= 0; i--) { const f = L[i]; if (String(f.chi) !== String(n.id)) continue; if (f.v === 'guasto') { c = cosaR(f.cosa || (f.x && f.x.cosa)) || GUASTO_N[f.x && f.x.g]; if (c) { src = 'fatto:guasto#' + f.id; break; } } if (/multa|fermato|sgombero|presidio_grigi/.test(f.v)) { c = grigiW(st, n); src = 'fatto:' + f.v + '#' + f.id; break; } } }
    if (!c && I.fav) { c = I.fav[0]; src = 'idioletto:' + c; }
    if (!c) return null; fonte(src); const isG = /grigi|^i |^gli |^le /i.test(c);
    const d = isG ? c : ART(c, 'a');
    const L = [`Mannaggia a ${sa} e ${d}!`, `Maledett${FEMW(c) && !isG ? 'a' : 'o'} ${isG ? c : c}, e chi l'ha inventat${FEMW(c) && !isG ? 'a' : 'o'}!`, `${sa}, guarda tu: ${isG ? c : ART(c, 'det')}! Ancora!`];
    if (sim) L.push(`Per ${ART(sim, 'det')} sacro, ${isG ? c : ART(c, 'det')} mi ha rovinato la giornata!`);
    const E = espDi(st, n.id, 'escl'); if (E) { L.push(`${E.w.replace(/!$/, '')}, e ${d}!`); }
    let s = rp(L); if (E && s.indexOf(E.w.replace(/!$/, '')) === 0) usa(st, n.id, E);
    return s;
  }
  const GOAL = { divertirsi: 'divertirmi', mangiare: 'mangiare', dormire: 'dormire', guadagnare: 'fare due soldi', socializzare: 'stare in compagnia', riposare: 'riposare', vendicarsi: 'fargliela pagare' };
  function chiacchieraV(st, X) {
    const n = X.n, opt = [], M = st.u.menti && st.u.menti[n.id], I = intensita(st, n, X.tipo);
    // il pettegolezzo: un fatto vero di un altro che ha in testa (le memorie della Mente)
    if (M && M.memorie && M.memorie.length) {
      const F = FT(); const mem = M.memorie.slice(-12);
      for (let i = mem.length - 1; i >= 0; i--) { const f = F && F.di(st, mem[i][0]); if (!f || String(f.chi) === String(n.id) || BANALI.test(f.v) || io(f.chi) === 'nino') continue; const r = azioneDi(st, f, f.chi); if (!r) continue;
        opt.push(['pett', () => { fonte('fatto:' + f.v + '#' + f.id); return `${rp(['Hai saputo? ', 'Lo sai l\'ultima? ', 'Senti questa: '])}${nomeDi(st, f.chi)} ${r}. ${rp(['Roba da matti', 'Ma ti pare', 'Io lo sapevo', 'Che gente', 'Pure lui', 'Ma vaff…'])}, ${minuscola(bestemmia(st, n, X.tipo, I))}.`; }]); break; }
    }
    if (M && M.ob && M.ob.g) opt.push(['ob', () => { fonte('mente:' + M.ob.g); const g = GOAL[M.ob.g] || String(M.ob.g).replace(/_/g, ' '); return rp([`Oggi voglio solo ${g}. E chi mi rompe le palle ${rp(['se la vede con me', 'lo butto a mare', 'ci resta male', 'paga da bere'])}.`, `Io adesso devo ${g}, ${minuscola(bestemmia(st, n, X.tipo, I))}. Non mi guardate.`, `Ma si può ${g} in pace in questo paese di merda?`]); }]);
    // i soldi: chi gli deve, chi deve lui
    const F = FT(); if (F && M && M.rel) for (const b of Object.keys(M.rel).slice(0, 10)) { let d = 0; try { d = F.debito(st, io(n.id), io(b)); } catch (e) { } if (d > .5) { opt.push(['deb', () => { fonte('debito'); const nb = nomeDi(st, b); return rp([`${nb} mi deve ancora ${lire(d)}. Se lo becco ${azione(st, X.tipo)[0].replace(/^ti /, 'lo ')}.`, `Qualcuno ha visto ${nb}? Mi deve ${lire(d)}, quel ${rp(['morto di fame', 'disgraziato', 'pezzo di merda', 'genio'])}.`, `${lire(d)}! ${nb} mi deve ${lire(d)} e va in giro a fare il signore!`]); }]); break; } }
    const N = (n.pop && n.pop.need) || {}, lu = luogo(st, n.x, n.y);
    if ((N.fame || 0) > .6) opt.push(['fame', () => { fonte('bisogno:fame'); const em = emblema(lavoro(n)) || (idl(st, n.id).fav || [])[0] || 'il tavolo'; if (em !== 'il tavolo') fonte(emblema(lavoro(n)) ? 'mestiere:' + lavoro(n) : 'idioletto:' + em);
      return rp([`${bestemmia(st, n, X.tipo, I)}, ho una fame che mi mangerei ${ART(em, 'det')}${rp(['', ' con tutto il piatto', ', crudo', ' e pure chi l\'ha portato'])}.`, `Se non mangio entro un\'ora mi mangio ${ART(em, 'det')}. Giuro.`, `Lo stomaco mi parla. Dice ${rp(['parolacce', 'cose brutte', 'il tuo nome'])}.`, `Chi mi offre un panino ${lu ? inL(lu) : 'qui'}? Pago domani. Forse.`]); }]);
    if ((N.sonno || 0) > .65) opt.push(['sonno', () => { fonte('bisogno:sonno'); return rp([`Ho sonno che dormirei in piedi ${lu ? inL(lu) : 'qui'}, ${minuscola(bestemmia(st, n, X.tipo, I))}.`, `Non dormo da ieri. Se uno mi parla gli rispondo russando.`, `Ho gli occhi che si chiudono da soli. Se mi trovate per terra ${lu ? inL(lu) : 'qui'}, lasciatemi.`]); }]);
    { const f0 = FONTI.slice(), v = vantoV(st, X), fv = FONTI.slice(); FONTI = f0; if (v) opt.push(['vanto', () => { for (const k of fv) fonte(k); return v; }]); }
    const j = lavoro(n), em = emblema(j);
    if (em && !/disoccupat|pension/.test(j)) opt.push(['lav', () => { fonte('mestiere:' + j); const f = FEMW(em); return rp([`Tutto il giorno con ${ART(em, 'det')} in mano. Stanotte me ${f ? 'la' : 'lo'} sogno, ${minuscola(bestemmia(st, n, X.tipo, I))}.`, `Fare ${ART(j, 'det').replace(/^(il|lo|la|l') ?/, m => m)} in questo paese: ${rp(['un calvario', 'una barzelletta', 'una condanna'])}. ${cap1(ART(em, 'det'))} mi odia.`, `Se mi tocca un'altra volta ${ART(em, 'det')} oggi, ${f ? 'la' : 'lo'} butto a mare.`]); }]);
    else if (j && /disoccupat/.test(j)) opt.push(['lav', () => { fonte('mestiere:' + j); return rp([`Lavoro? Io il lavoro l'ho cercato ${lu ? inL(lu) : 'qui'}. Non c'era. Sono tornat${X.g === 'f' ? 'a' : 'o'} a casa.`, `Mia madre dice «trovati un lavoro». Ho guardato ${lu ? inL(lu) : 'qui intorno'}. Niente. Domani riguardo.`]); }]);
    if (lu) opt.push(['luogo', () => { fonte('luogo:' + lu); return rp([`${cap1(inL(lu))} non succede mai un cazzo. Tranne a me.`, `Ogni volta che passo ${inL(lu)} mi succede qualcosa. ${rp(['Oggi ancora niente. Aspetto.', 'Stavolta tocca a voi.', 'Mannaggia.'])}`, `Io ${inL(lu)} ci sono nat${X.g === 'f' ? 'a' : 'o'}. Cioè, quasi. ${rp(['Comando io.', 'Chiedete a chiunque.', 'Ci ho pisciato da piccolo.'])}`]); }]);
    const W = espDi(st, n.id, 'par');
    if (W && rnd() < .5) opt.push(['uff', () => { usa(st, n.id, W); const r = rnd(), gg = X.g === 'f' ? 'a' : 'o';
      if (r < .34) { const m = ufficiale(st, W, 'malattia'); return rp([`Ho la ${m}: ${rp(['inciampo pure a letto', 'mi viene il prurito alle mani', 'il dottore dice che non si guarisce', 'si attacca, statemi lontano'])}.`, `Mio cognato ha preso la ${m}. Lo sapevo, io.`]); }
      if (r < .67) return `Lo sai chi sono io? ${cap1(ufficiale(st, W, 'titolo'))}! Con la tessera ${ART(ufficiale(st, W, 'ente'), 'di')}.`;
      return `${cap1(ufficiale(st, W, 'ente'))} ${rp(['mi ha dato una multa', 'mi deve dei soldi', 'mi ha assunt' + gg + ' e poi licenziat' + gg, 'non risponde mai'])}, ${minuscola(bestemmia(st, n, X.tipo, .6))}.`; }]);
    if (W) opt.push(['par', () => { usa(st, n.id, W); const g = X.g; return W.p.vb ? rp([`Oggi ${diPar(st, W, 'chi', g)}.`, `${cap1(diPar(st, W, 'escl', g))}! Si dice così, adesso.`]) : rp([`${cap1(W.p.w)}. ${rp(['L\'ho inventata io, questa.', 'Si dice così, adesso.', 'Lo dico io e basta.', 'Segnatevela.'])}`, `Questo paese è tutto ${ART(W.p.w, 'ind')}, ${rp(['cazzo', 'porca miseria', 'minchia', 'mannaggia'])}.`, `Che giornata da ${W.p.w}, oggi.`]); }]);
    const E = espDi(st, n.id); if (E && E.k !== 'par') opt.push(['esp', () => { usa(st, n.id, E); return E.k === 'img' ? `${cap1(rp(['quello là', 'il cognato', 'il padrone', 'il vicino', 'il tizio del bar']))}? ${cap1(terza(E.w))}, te lo dico io.` : `${E.w} ${rp(['Lo dico sempre.', 'Come dico io.', 'E basta.', 'Sempre così.', 'Ve l\'avevo detto.'])}`; }]);
    { const RR = R0(st); for (const id in RR.R) { const R = RR.R[id]; if (R.seg.includes(n.id) && R.detti.length) { opt.push(['fede', () => { fonte('ruolo:' + id); fonte('eti:' + id); const d = R.detti[R.detti.length - 1].split(/(?<=[.!?])\s+/).filter(x => x.length > 12); return `${rp(['Come dice', 'L\'ha detto', 'Parola', 'Ve lo dico io, come insegna'])} ${R.lab}: «${rp(d.length ? d : [R.detti[0]]).slice(0, 90)}»`; }]); break; } } }
    { const K = conosce(st, n.id); if (K.length) { const fn = () => racconto(st, X, pk(st, K, 'f_rac', x => x.id)); opt.push(['folk', fn]); if (X.tipo === 'pr' || X.tipo === 'no') opt.push(['folk2', fn]); } }
    { const k = titolatoVicino(st, n); if (k) opt.push(['tit', () => indirizzo(st, k, false)]); }
    if (!opt.length) return null;
    const o = pk(st, opt, 'mossa', x => x[0]); X._mossa = o[0]; return o[1]();
  }
  function pauraV(st, X) {
    const sc = scuseVere(st, X.n); if (!sc.length) return null; const c = sc[Math.floor(rnd() * sc.length)]; fonte(c[1]);
    const r = c[0].replace(/^(dopo|domani|appena|se) /, '');
    return `${rp(['Non sparare!', 'Fermo, fermo!', 'Aiuto!', 'Calma, eh!'])} ${rp(['Non posso morire adesso:', 'Non oggi:', 'Ho da fare:'])} ${c[1] === 'bisogno:fame' ? 'devo ancora mangiare!' : c[1] === 'debito' ? 'devo ancora ridare i soldi, se no mi ammazzano due volte!' : c[1] === 'turno' ? 'tra poco attacco al lavoro!' : c[1] === 'famiglia' ? 'mia madre mi aspetta!' : r + '!'}`;
  }
  function grazieV(st, X) {
    const M = st.u.menti && st.u.menti[X.n.id], F = FT(); if (!M || !M.rel || !F) return null;
    let best = null, bv = .15; for (const b of Object.keys(M.rel).slice(0, 14)) { let r = 0; try { r = F.rancore(st, io(X.n.id), io(b)) || 0; } catch (e) { } if (r > bv) { bv = r; best = b; } }
    if (!best) return null; fonte('rancore'); const q = qualita(st, X.n, best).filter(x => !/^esp|^idioletto/.test(x[1])); const d = q.length ? scegliQ(st, q) : null; if (d) fonte(d[1]);
    return `Grazie, ${rp(['fra\'', 'bello', 'amico mio'])}. Se ${nomeDi(st, best)}${d ? ', quel ' + d[0].replace(/^(quell[oa] che|pover[oa] cristo che|genio che|fenomen[oa] che)\s*/, '') + ',' : ''} ti dà fastidio, dimmelo, che gli ${azione(st, X.tipo)[0].replace(/^ti /, '')}.`.replace('quel stronz', 'quello stronz');
  }
  // la coda di una battuta di base: un pezzo di mondo di chi parla (la fame, il debito, i Grigi col nome del gruppo, la cosa fissa)
  function codaMondo(st, n, X) {
    const N = (n.pop && n.pop.need) || {}, I = idl(st, n.id), L = [];
    if ((N.fame || 0) > .6) L.push(['fame', () => { fonte('bisogno:fame'); return rp([', e io ho una fame che vedo doppio.', ', ma prima si mangia, cazzo.', '. E ho fame, eh.']); }]);
    if ((N.sonno || 0) > .65) L.push(['sonno', () => { fonte('bisogno:sonno'); return rp([', e io che non ho dormito.', '… e mo\' mi addormento qui.']); }]);
    if (I.fav && st.t - I.fav[1] < 2880) L.push(['fav', () => { fonte('idioletto:' + I.fav[0]); return `, porc${FEMW(I.fav[0]) ? 'a' : 'o'} ${I.fav[0]}!`; }]);
    const cu = st.u.cultura; if (cu && cu.sa && (cu.sa[n.id] || []).some(e => cu.par[e[0]] && cu.par[e[0]].k === 'grigi')) L.push(['grigi', () => `, e ${grigiW(st, n)} guardano.`]);
    const F = FT(), M = st.u.menti && st.u.menti[n.id]; if (F && M && M.rel) for (const b of Object.keys(M.rel).slice(0, 8)) { let d = 0; try { d = F.debito(st, io(n.id), io(b)); } catch (e) { } if (d > .5) { L.push(['deb', () => { fonte('debito'); return `, e ${nomeDi(st, b)} mi deve ancora ${lire(d)}.`; }]); break; } }
    const j = lavoro(n); if (j && !/altro/.test(j)) L.push(['lav', () => { fonte('mestiere:' + j); return rp([`, parola di ${j}!`, `. Lo dice ${n.pop && n.pop.sex === 'f' ? (/^[aeiou]/i.test(j) ? 'un\'' : 'una ') : (/^(s[^aeiou]|z|gn|ps)/i.test(j) ? 'uno ' : 'un ')}${j}, eh.`]); }]);
    if (!L.length) return null; return pk(st, L, 'coda_m', x => x[0])[1]();
  }
  // il registro deciso: per intento, una battuta costruita (o null: allora le tavole)
  function genera(st, intento, X) {
    const aid = X.aid;
    switch (intento) {
      case 'rissa2': case 'urtato': case 'derubato': case 'no': return aid ? (rnd() < .75 ? insultoV(st, X, aid) : minacciaV(st, X, aid)) : null;
      case 'rissa4': case 'colpito': return aid ? minacciaV(st, X, aid) : null;
      case 'rissa3': { if (!aid) return null; const Q = qualita(st, X.n, aid).filter(x => !x[3]); if (!Q.length) return null; const q = scegliQ(st, Q); fonte(q[1]); return `${rp(SPINTA)}, ${q[0]}!`; }
      case 'rissa1': { if (!aid) return null; const Q = qualita(st, X.n, aid).filter(x => !x[3]); if (!Q.length) return null; const q = scegliQ(st, Q); fonte(q[1]); return `${rp(BORB_A)} ${nomeDi(st, aid) || 'questo'}… ${q[0]}… ${rp(BORB_B)}`; }
      case 'rissa5': { if (!aid) return null; const w = torto(st, X.n, aid); if (!w) return null; fonte(w[1]); return `${rp(COLPO_A)} Questa è ${w[0]}!`; }
      case 'fondo': case 'saluto': return chiacchieraV(st, X);
      case 'paura': return pauraV(st, X);
      case 'aiutato': return grazieV(st, X);
      case 'guasto': case 'si_rompe': case 'si_sporca': case 'si_bagna': case 'cade': case 'scappa_via': case 'resta_incastrato': case 'monete': case 'perde_cappello': case 'colpisce_altro': case 'figuraccia': case 'scoperto': return maledizioneV(st, X, X.cosa || GUASTO_N[intento] || null);
      case 'bocciato': case 'si': return rnd() < .5 ? maledizioneV(st, X, null) : null;
    }
    return null;
  }

  // ======================= L'IDIOLETTO: le espressioni nascono, passano, cambiano, muoiono =======================
  // st.u.strada.idl[id] = { e: {eid: ultimo uso}, fav: [parola, t], vanti: {fid: volte}, r: il registro preso dagli amici (chi non l'ha) }
  // st.u.strada.esp[eid] = { id, k ('escl' | 'img' | 'giuro'), v (la forma), p: { c, n, l }, w, t0, da (il fatto), chi0, padre, gen, usi, h (quanti la sanno) }
  // st.u.strada.gen: le genealogie (nasce, passa, muta, consumata, muore), le ultime 300 righe
  function idl(st, id) { const s = S(st); s.idl = s.idl || {}; return s.idl[id] || (s.idl[id] = { e: {}, fav: null, vanti: {}, r: 0 }); }
  const FORME = {
    escl: [p => `Porc${FEMW(p.c) ? 'a' : 'o'} ${p.c}!`, p => `Mannaggia ${ART(p.c, 'a')}!`, p => (p.l ? `Sant${FEMW(p.c) ? 'a' : 'o'} ${p.c} ${ART(p.l, 'di')}!` : `Sant${FEMW(p.c) ? 'a' : 'o'} ${p.c}!`), p => `${cap1(p.c)} e merda!`],
    img: [p => `sei come ${ART(p.c, 'det')} di ${p.n}`, p => `farai la fine ${ART(p.c, 'di')} di ${p.n}`, p => `stai peggio ${ART(p.c, 'di')} di ${p.n}`],
    giuro: [p => `Lo giuro ${ART(p.c, 'su')} di ${p.n}!`, p => `Parola ${ART(p.c, 'di')}!`],
    par: [p => p.w],
  };
  function rendi(E) { try { return FORME[E.k][E.v % FORME[E.k].length](E.p); } catch (e) { return null; } }
  function storia(st, ev, E, chi, extra) { const s = S(st); s.gen = s.gen || []; s.gen.push([Math.round(st.t), ev, E.id, chi || null, E.w, extra || null, E.k]); if (s.gen.length > 400) s.gen.shift(); stats['esp_' + ev] = (stats['esp_' + ev] || 0) + 1; if (E.k === 'par') stats['par_' + ev] = (stats['par_' + ev] || 0) + 1; }
  function nuovaEsp(st, k, p, chi, da, padre) {
    const s = S(st); s.esp = s.esp || {}; s.nEsp = (s.nEsp || 0) + 1;
    const E = { id: 'e' + s.nEsp, k, v: Math.floor(rnd() * FORME[k].length), p, w: null, t0: Math.round(st.t), da: da || null, chi0: chi, padre: padre ? padre.id : null, gen: padre ? padre.gen + 1 : 0, usi: 0, h: 0 };
    if (k !== 'escl' && k !== 'par' && !p.n) E.k = 'escl';
    E.w = rendi(E); if (!E.w || E.w.length > 60) return null;
    s.esp[E.id] = E; return E;
  }
  function impara(st, id, E) { const I = idl(st, id); if (I.e[E.id] !== undefined) return false; const ks = Object.keys(I.e); if (ks.length >= 6) { const old = ks.sort((a, b) => I.e[a] - I.e[b])[0]; delete I.e[old]; } I.e[E.id] = Math.round(st.t); E.h++; return true; }
  function espDi(st, id, k) { const s = S(st), I = s.idl && s.idl[id]; if (!I || !s.esp) return null; const L = Object.keys(I.e).map(e => s.esp[e]).filter(E => E && (!k || E.k === k)); if (!L.length) return null; return L[Math.floor(rnd() * L.length) % L.length]; }
  function usa(st, id, E) {
    const I = idl(st, id); I.e[E.id] = Math.round(st.t); E.usi++; fonte((E.k === 'par' ? 'parola:' : 'esp:') + E.id); if (E.k === 'par') { stats.dettePar = (stats.dettePar || 0) + 1; insegna(E); }
    if (E.usi > 12 && rnd() < .25) { delete I.e[E.id]; E.h = Math.max(0, E.h - 1); storia(st, 'consumata', E, id); }   // detta troppo: stufa, la lascia
  }
  const EVN = { serenata: 'serenata', fidanzamento: 'fidanzamento', due_di_picche: 'rifiuto', gelosia: 'gelosia', scommessa: 'scommessa', pace: 'pace', pettegolezzo: 'pettegolezzo', cena: 'sugo', concerto: 'chitarra', invenzione: 'prototipo', ricordo: 'fotografia', coppia_combinata: 'sensale', furto: 'refurtiva', botte: 'cazzotto', spinta: 'spintone', insulto: 'parolaccia', minaccia: 'minaccia', multa: 'multa', fermato: 'controllo', sgombero: 'sgombero', presidio_grigi: 'furgone', comica: 'figuraccia', lancio: null, pesca: null, beve: null, prestito: 'prestito', saldato: 'conto' };
  const VARIANTI = { bottiglia: ['fiasco', 'bottiglione', 'damigiana'], secchio: ['bidone', 'catino', 'secchiello'], cappello: ['coppola', 'berretto', 'basco'], marciapiede: ['scalino', 'gradino', 'tombino'], multa: ['verbale', 'contravvenzione', 'bolletta'],
    cazzotto: ['ceffone', 'sganassone', 'cartone'], spintone: ['spallata', 'gomitata', 'sberla'], parolaccia: ['maleparola', 'bestemmia mancata', 'pernacchia'], furgone: ['camionetta', 'cellulare', 'jeep'], figuraccia: ['brutta figura', 'pagliacciata', 'scenata'],
    pozzanghera: ['fontana', 'acquazzone', 'secchiata'], monetina: ['spicciolo', 'centesimo', 'gettone'], birra: ['vino', 'grappa', 'gazzosa'], pesce: ['triglia', 'polpo', 'sgombro'], porta: ['portone', 'finestra', 'saracinesca'], controllo: ['documento', 'timbro', 'perquisa'] };
  // nasce: un fatto che tocca uno col registro (o che lo vede da vicino) diventa un suo modo di dire
  function nasce(st, f) {
    const chi = String(f.chi), vit = f.con && f.con[0] != null ? String(f.con[0]) : null, prot = registro(st, chi) ? chi : vit && registro(st, vit) ? vit : null; if (!prot) return;
    let c = cosaR(f.cosa || (f.x && f.x.cosa)); if (!c && f.v === 'guasto') c = GUASTO_N[f.x && f.x.g]; if (!c) c = EVN[f.v] || null; if (!c) return;
    const I = idl(st, prot); I.fav = [c, Math.round(st.t)];
    if (rnd() < .4) { const np = npc(st, prot), R = np && conia(st, np, c); if (R) { const E = nuovaPar(st, R, prot, f.id); if (E) { impara(st, prot, E); storia(st, 'nasce', E, prot, `${R.f}: ${[R.a, R.pre, R.b, R.suf && '-' + R.suf[0], R.vk && R.vk + '-'].filter(Boolean).join(' + ')} ← ${(f.d || f.v || '').slice(0, 60)}`); return; } } }
    if (rnd() > .45) return;
    const nm = nomeDi(st, prot === chi ? chi : chi) || null, l = f.dove && f.dove[0] != null ? luogo(st, f.dove[0], f.dove[1]) : null;
    const k = rnd() < .5 ? 'escl' : rnd() < .75 ? 'img' : 'giuro';
    const E = nuovaEsp(st, k, { c, n: nm, l }, prot, f.id); if (!E) return;
    impara(st, prot, E); storia(st, 'nasce', E, prot, (f.d || f.v || '').slice(0, 80));
  }
  // passa: sulla chiacchiera chi la sa la dice, chi ascolta la prende (a volte storpiata: una parola cambia)
  function passa(st, a, b) {
    const E = espDi(st, a); if (!E || rnd() > .45) return;
    let E2 = E;
    if (E.k === 'par' && rnd() < .4) { const M = mutaPar(st, E, b); if (M) { const N = nuovaPar(st, M.R, b, E.da, E); if (N) { E2 = N; storia(st, 'muta', N, b, E.w + ' ⇒ ' + N.w + ' (' + M.det + ')'); } } }
    else if (E.k !== 'par' && rnd() < .35) {
      const p = Object.assign({}, E.p), Ib = idl(st, b), r = rnd(); let det = '';
      if (r < .45) { const V = VARIANTI[p.c]; const nuovo = V ? V[Math.floor(rnd() * V.length)] : Ib.fav ? Ib.fav[0] : rp(COMPL)[0]; if (nuovo && nuovo !== p.c) { det = p.c + ' → ' + nuovo; p.c = nuovo; } }
      else if (r < .75 && p.n) { const nb = nomeDi(st, b); if (nb && nb !== p.n) { det = p.n + ' → ' + nb; p.n = nb; } }
      else { const nb = npc(st, b), l = nb ? luogo(st, nb.x, nb.y) : null; if (l && l !== p.l) { det = (p.l || '-') + ' → ' + l; p.l = l; } }
      if (det) { const N = nuovaEsp(st, E.k, p, b, E.da, E); if (N) { N.v = (E.v + (rnd() < .3 ? 1 : 0)) % FORME[N.k].length; N.w = rendi(N) || N.w; if (N.w === E.w || N.w.length > 60) delete S(st).esp[N.id]; else { E2 = N; storia(st, 'muta', N, b, E.w + ' ⇒ ' + N.w); } } }
    }
    if (impara(st, b, E2)) { if (E2 === E) storia(st, 'passa', E, b, nomeDi(st, a)); if (!registro(st, b)) { const Ib = idl(st, b); Ib.r = Math.min(.6, (Ib.r || 0) + .15); } }
  }
  // ogni ora: chi non usa un'espressione da due giorni la dimentica; un'espressione che nessuno sa più muore; il registro preso si ammorbidisce
  function invecchia(st) {
    const s = S(st); if (!s.idl) return; const morte = {};
    for (const id in s.idl) { const I = s.idl[id];
      for (const eid in I.e) if (st.t - I.e[eid] > 2880) { delete I.e[eid]; const E = s.esp && s.esp[eid]; if (E) E.h = Math.max(0, E.h - 1); }
      if (!registro(st, id) && I.r > 0) { I.r = Math.max(0, I.r - .004); if (I.r < .02 && !Object.keys(I.e).length) delete s.idl[id]; }
    }
    if (s.esp) for (const eid in s.esp) { const E = s.esp[eid]; if (E.h <= 0 && st.t - E.t0 > 60) { storia(st, 'muore', E, null); delete s.esp[eid]; } }
    try { adotta(st); } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.strada', e); }
  }

  // ======================= IL CONIO: le parole nuove, fatte coi pezzi delle vecchie =======================
  // La materia (gli epiteti, le cose, i mestieri, il cibo, il mare, le parolacce, il gergo della cultura, i nomi e i simboli dei gruppi)
  // si smonta in PEZZI di parola: le radici (la parola senza l'ultima vocale), i PREFISSI, i SUFFISSI (col genere e il plurale loro) e le
  // TESTE dei composti. Le regole: l'elisione alla giuntura (porca+assi → porcassi), la c e la g che restano dure (porc+etto →
  // porchetto), l'assimilazione (in+bottiglia → imbottigliare), il filtro di pronuncia (pronunciabile: niente grumi di consonanti
  // impossibili, niente vocali uguali attaccate, finisce in vocale). Il genere e il numero vengono dalla testa: il suffisso nei derivati,
  // la prima parola nei composti nome+nome (facciacozza, f), la seconda dopo un aggettivo o una parolaccia (porcassi: assi, f pl).
  // Le parole nascono dalla vita di chi parla (la cosa del fatto che gli è capitato, il suo mestiere, la sua cosa fissa, il gergo che sa,
  // il bersaglio), entrano nel suo idioletto (st.u.strada.esp, k 'par', p: { w, g, n, pl, f: la formula, a, b, pre, suf, vb }) e vivono
  // come le espressioni: passano, mutano (un suffisso cambiato, una radice sostituita), si consumano, muoiono. Lingua le impara (il
  // lessico: articoli e accordi giusti); un gruppo che ne ha due che la dicono la adotta nel suo gergo (UnicoCultura.nuovaParola).
  const PREFISSI = ['proto', 'stra', 'arci', 'mega', 'sotto', 'anti', 'ri', 'super', 'iper', 'contro', 'semi', 'tri'];
  const SUFFISSI = [['one', 'm', 'oni'], ['ona', 'f', 'one'], ['accio', 'm', 'acci'], ['accia', 'f', 'acce'], ['etto', 'm', 'etti'], ['etta', 'f', 'ette'], ['ume', 'm', 'umi'], ['aro', 'm', 'ari'],
    ['ista', 'm', 'isti'], ['ata', 'f', 'ate'], ['ificio', 'm', 'ifici'], ['eria', 'f', 'erie'], ['ologo', 'm', 'ologi'], ['ame', 'm', 'ami'], ['ozzo', 'm', 'ozzi'], ['icchio', 'm', 'icchi'], ['astro', 'm', 'astri'], ['aglia', 'f', 'aglie']];
  const PRIME = [['porc*', 'agg'], ['merda', 'n', 'f'], ['cazzo', 'n', 'm'], ['stronz*', 'agg'], ['faccia', 'n', 'f'], ['testa', 'n', 'f'], ['muso', 'n', 'm'], ['culo', 'n', 'm'], ['mezza', 'agg0'], ['bocca', 'n', 'f'], ['pancia', 'n', 'f']];
  const PAROLACCE_R = ['porc', 'merd', 'cazz', 'stronz', 'cul', 'mign'];
  const VOK = 'aeiouàèéìòù', isV = c => VOK.indexOf(c) >= 0;
  const piano = w => String(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const radice = w => { const t = piano(String(w).split(/[\s']/)[0]); return /[aeiou]$/.test(t) && t.length > 3 ? t.slice(0, -1) : t.length > 3 ? t : null; };
  const unisciM = (a, b) => {   // la giuntura: l'elisione, la c e la g dure, niente vocali uguali attaccate
    if (!a || !b) return null; a = piano(a); b = piano(b);
    if (isV(a.slice(-1)) && isV(b[0])) a = a.slice(0, -1);
    if (/[cg]$/.test(a) && /^[ei]/.test(b)) a += 'h';
    return a + b;
  };
  // il filtro di pronuncia (anche la prova lo rifà da sé)
  const C2 = /^(bb|cc|dd|ff|gg|ll|mm|nn|pp|rr|ss|tt|vv|zz|[bcdfgptv][rl]|s[bcdfglmnprtvz]|[lmnr][bcdfgptvsz]|gn|gl|ch|gh|sc|mb|mp|nc|ng|nt|nd|lc|rc|rg|rt|rn|rm|ct|pt)$/;
  const C3 = /^(s[ptc][rl]|[nlmr][ptcdgbvf][rl]|[nlrs]ch|[nlrs]gh|ngh|nch|sch|ssh|cch|ggh|str|spr|scr|ntr|ndr|mbr|mpr)$/;
  function pronunciabile(w) {
    if (!/^[a-z]{5,16}$/.test(w) || !isV(w.slice(-1))) return false;
    if (/(.)\1\1/.test(w) || /([aeiou])\1/.test(w) || /[aeiou]{4}/.test(w) || /([a-z]{2,3})\1/.test(w)) return false;   // niente «impiegatata»
    if (/q(?!u)|h(?![aeiou])|[^cg]h/.test(w.replace(/^h/, ''))) return false;
    for (const m of w.match(/[^aeiou]+/g) || []) { const r = w.endsWith(m) ? null : m; if (!r) continue; if (r.length >= 4) return false; if (r.length === 3 && !C3.test(r)) return false; if (r.length === 2 && !C2.test(r)) return false; }
    const ini = (w.match(/^[^aeiou]+/) || [''])[0]; if (ini.length > 1 && !/^(s[bcdfglmnprtv]|[bcdfgptv][rl]|ch|gh|gn|sc|str|spr|scr|sch|sgr|sbr|sfr)$/.test(ini)) return false;
    return true;
  }
  US.pronunciabile = pronunciabile;
  const plN = (w, g) => { try { const L = LG(); if (L && L.plurale) { const p = L.plurale(w); if (p && p !== w) return p; } } catch (e) { } return /a$/.test(w) ? w.slice(0, -1) + (g === 'f' ? 'e' : 'i') : /[oe]$/.test(w) ? w.slice(0, -1) + 'i' : w; };
  const genN = w => { try { const L = LG(); if (L && L.genere) { const x = L.genere(w); return { g: x.g, n: x.n === 'p' ? 'p' : 's' }; } } catch (e) { } return { g: /a$/.test(w) ? 'f' : 'm', n: 's' }; };
  // le formule: ognuna dà { w, g, n (s/p), pl, vb? } o null. a, b: parole intere; s: suffisso; pre: prefisso
  const FORMULE = {
    // parolaccia (o aggettivo) + cosa: porca + assi → porcassi; la testa è la cosa
    pa: (o) => { const P = o.prima, G = genN(o.b); if (P[1] === 'n') return null; const a = P[1] === 'agg' ? P[0].replace('*', G.g === 'f' ? (G.n === 'p' ? 'e' : 'a') : (G.n === 'p' ? 'i' : 'o')) : P[0]; const w = unisciM(a, o.b); return w && { w, g: G.g, n: G.n, pl: G.n === 'p' ? w : unisciM(a.replace(/[ao]$/, G.g === 'f' ? 'e' : 'i'), plN(o.b, G.g)) }; },
    // nome + nome: faccia + cozza → facciacozza; la testa è la prima
    nn: (o) => { const P = o.prima; if (P[1] !== 'n') return null; const w = unisciM(P[0], o.b); return w && { w, g: P[2], n: 's', pl: unisciM(plN(P[0], P[2]), o.b) }; },
    // prefisso + parola: stra + marciapiede → stramarciapiede, proto + porco → protoporco
    pr: (o) => { const G = genN(o.b); const w = unisciM(o.pre, o.b); return w && { w, g: G.g, n: G.n, pl: G.n === 'p' ? w : unisciM(o.pre, plN(o.b, G.g)) }; },
    // radice + suffisso: cozza → cozzume, bottiglia → bottigliaccia; la testa è il suffisso
    rs: (o) => { const r = radice(o.b); if (!r) return null; const S0 = o.suf; const w = unisciM(r, S0[0]); return w && { w, g: S0[1], n: 's', pl: unisciM(r, S0[2]) }; },
    // il verbo dal nome: in + cozza + arsi → incozzarsi; a + marciapiede + are → ammarciapiedare; s + bottiglia + are → sbottigliare
    vb: (o) => {
      const r = radice(o.b); if (!r) return null; const k = o.vk;
      let base = k === 'in' ? (/^[bpm]/.test(r) ? 'im' : /^l/.test(r) ? 'il' : /^r/.test(r) ? 'ir' : 'in') + r : k === 'a' ? (isV(r[0]) ? 'ad' + r : 'a' + r[0] + r) : isV(r[0]) ? 'sv' + r : 's' + r;
      if (/[cg]$/.test(base)) base += 'h';   // la radice che finisce in c/g: incazz-, sporch-... le forme in e/i
      const w = base.replace(/h$/, '') + (k === 'in' ? 'arsi' : 'are');
      return { w, g: 'm', n: 's', pl: w, vb: { r: base.replace(/h$/, ''), rh: base, refl: k === 'in' } };
    },
  };
  // la vita di chi parla in pezzi: la cosa dell'evento (b), più quello che ha intorno
  function pezziDi(st, n, b) {
    const L = []; if (b) L.push(b);
    const j = lavoro(n), em = emblema(j); if (em) L.push(em.split(' ')[0]);
    const I = idl(st, n.id); if (I.fav && I.fav[0]) L.push(String(I.fav[0]).split(' ')[0]);
    const cu = st.u.cultura; if (cu && cu.sa && cu.par) for (const e of (cu.sa[n.id] || []).slice(0, 4)) { const P = cu.par[e[0]]; if (P && P.w && !/\s/.test(P.w)) L.push(String(P.w).replace(/^(il|lo|la|i|gli|le|l')\s?/i, '')); }
    if (j && !/\s/.test(j) && !/disoccupat|pension|altro/.test(j)) L.push(j);
    return L.filter(w => w && /^[a-zàèéìòù]+$/i.test(w) && w.length >= 4);
  }
  function conia(st, n, b, esclusa) {
    const S0 = S(st), usate = new Set(Object.values(S0.esp || {}).filter(E => E.k === 'par').map(E => E.p.w)), pezzi = pezziDi(st, n, b);
    if (!pezzi.length) return null;
    let best = null, bv = -1e9, viste = 0;
    for (let k = 0; k < 28; k++) {
      const R = coniaUna(st, pezzi, b, usate, esclusa, k); if (!R) continue; viste++;
      const rb = radice(R.b) || R.b, mo = R.pre || (R.suf && R.suf[0]) || R.a || R.vk, v = R.ride - .9 * uso(st, 'radice', rb) - .45 * uso(st, 'formula', R.f) - .7 * uso(st, 'morfema', mo) + rnd() * .4;
      if (v > bv) { bv = v; best = R; }
    }
    if (!best || best.ride < CFG.ride) { stats.scartateRidere = (stats.scartateRidere || 0) + 1; return null; }
    const rb = radice(best.b) || best.b; segna(st, 'radice', rb); segna(st, 'formula', best.f); segna(st, 'morfema', best.pre || (best.suf && best.suf[0]) || best.a || best.vk); stats.radici = stats.radici || {}; stats.radici[rb] = (stats.radici[rb] || 0) + 1;
    stats.rideMin = Math.min(stats.rideMin === undefined ? 99 : stats.rideMin, best.ride); stats.candidate = (stats.candidate || 0) + viste;
    return best;
  }
  function coniaUna(st, pezzi, b, usate, esclusa, k) {
    {
      const f = rp(['pa', 'pa', 'nn', 'pr', 'pr', 'rs', 'rs', 'rs', 'vb', 'vb']), bb = k < 6 && b ? b : rp(pezzi);
      const o = { b: piano(bb).split(' ')[0], prima: rp(PRIME), pre: rp(PREFISSI), suf: rp(SUFFISSI), vk: rp(['in', 'a', 's']) };
      if (f === 'pr' && rnd() < .25) o.b = rp(['porco', 'stronzo', 'merda', 'cazzo']);   // protoporco, arcistronzo
      if (f === 'rs' && rnd() < .2) o.b = rp(['porco', 'merda', 'cazzo', 'stronzo']);   // porcume, merdificio
      if (f === 'pr' && rnd() < .6) o.pre = rp(['arci', 'proto', 'iper', 'super', 'mega', 'contro']);   // i prefissi pomposi, più spesso
      if (f === 'rs' && rnd() < .5) o.suf = rp(SUFFISSI.filter(x => /ologo|ificio|eria|ista|one|ona|etto|etta|icchio|ozzo/.test(x[0])));
      let R = null; try { R = FORMULE[f](o); } catch (e) { R = null; }
      if (!R || !R.w || !pronunciabile(R.w) || usate.has(R.w) || R.w === esclusa || R.w === o.b) return null;
      if (esiste(R.w)) { stats.reali = (stats.reali || 0) + 1; return null; }
      if (R.pl && !/^[a-z]+$/.test(R.pl)) R.pl = R.w;
      Object.assign(R, { f, a: f === 'pa' || f === 'nn' ? o.prima[0] : null, b: o.b, pre: f === 'pr' ? o.pre : null, suf: f === 'rs' ? o.suf : null, vk: f === 'vb' ? o.vk : null });
      R.ride = ridicolo(R); return R;
    }
  }
  // Lingua impara la parola (gli articoli e gli accordi giusti): il genere e il numero dalla testa
  function insegna(E) {
    try { const L = LG(); if (!L || !L._ || !L._.lex || E.p.vb) return; const X = L._.lex(), p = E.p;
      if (!X.has(p.w)) X.set(p.w, { g: p.g, n: p.n === 'p' ? 'p' : 's', sg: p.n === 'p' ? null : p.w, pl: p.pl || p.w });
      if (p.pl && p.pl !== p.w && !X.has(p.pl)) X.set(p.pl, { g: p.g, n: 'p', sg: p.w, pl: p.pl }); } catch (e) { }
  }
  function nuovaPar(st, R, chi, da, padre, nota) {
    const E = nuovaEsp(st, 'par', R, chi, da, padre); if (!E) return null; insegna(E); stats.coniate = (stats.coniate || 0) + 1; return E;
  }
  // la parola detta: secondo il ruolo nella frase, coi suoi accordi (Lingua) e le forme del verbo
  function diPar(st, E, ruolo, g) {
    const p = E.p; insegna(E);
    if (p.vb) {
      const v = p.vb, ga2 = g === 'f' ? 'a' : 'o', r = v.r, part = r + 'at' + ga2;
      if (ruolo === 'minaccia') return `ti ${r}o`;
      if (ruolo === 'escl') return v.refl ? rp([`Va' a ${r}arti`, `Mi sono tutt${ga2} ${part}`, `Non ti ${r}are, che è peggio`, `Mo' mi ${r}o, giuro`]) : rp([`M'hai ${r}ato tutto`, `Che ti possano ${r}are`, `Ho ${r}ato mezzo paese`, `Qui si ${r}a e basta`]);
      return v.refl ? `mi sono ${part} due volte` : `ho ${r}ato mezzo paese`;
    }
    if (ruolo === 'voc') return p.w;
    if (ruolo === 'pred') return `sei ${ART(p.w, 'ind')}`;
    if (ruolo === 'escl') return rp([cap1(p.w), `Che ${p.w}`, `Ma guarda che ${p.w}`, `Mannaggia ${ART(p.w, 'a')}`]);
    return p.w;
  }
  // muta: passando, un pezzo cambia (il suffisso, il prefisso, la radice con una cosa di chi ascolta)
  function mutaPar(st, E, b) {
    const p = E.p, nb = npc(st, b), o = { b: p.b, prima: PRIME.find(x => x[0] === p.a) || rp(PRIME), pre: p.pre || rp(PREFISSI), suf: p.suf || rp(SUFFISSI), vk: p.vk || 'in' };
    const r = rnd(); let det = '';
    if (r < .4 && p.f === 'rs') { o.suf = rp(SUFFISSI.filter(x => x[0] !== p.suf[0])); det = '-' + p.suf[0] + ' → -' + o.suf[0]; }
    else if (r < .4 && p.f === 'pr') { o.pre = rp(PREFISSI.filter(x => x !== p.pre)); det = p.pre + '- → ' + o.pre + '-'; }
    else if (r < .4 && (p.f === 'pa' || p.f === 'nn')) { o.prima = rp(PRIME.filter(x => x[0] !== p.a && x[1] === (p.f === 'nn' ? 'n' : x[1]))); det = p.a + ' → ' + o.prima[0]; }
    else if (r < .4 && p.f === 'vb') { o.vk = rp(['in', 'a', 's'].filter(x => x !== p.vk)); det = 'verbo ' + p.vk + ' → ' + o.vk; }
    else { const L = nb ? pezziDi(st, nb, null) : []; const nw = L.length ? rp(L) : null; if (nw && piano(nw) !== p.b) { o.b = piano(nw); det = p.b + ' → ' + o.b; } }
    if (!det) return null;
    let R = null; try { R = FORMULE[p.f](o); } catch (e) { R = null; }
    if (!R || !pronunciabile(R.w) || R.w === p.w || esiste(R.w)) return null;
    Object.assign(R, { f: p.f, a: p.f === 'pa' || p.f === 'nn' ? o.prima[0] : null, b: o.b, pre: p.f === 'pr' ? o.pre : null, suf: p.f === 'rs' ? o.suf : null, vk: p.f === 'vb' ? o.vk : null }); R.ride = ridicolo(R);
    if (R.ride < CFG.ride - 1) return null;
    return { R: Object.assign(R, { f: p.f, a: p.f === 'pa' || p.f === 'nn' ? o.prima[0] : null, b: o.b, pre: p.f === 'pr' ? o.pre : null, suf: p.f === 'rs' ? o.suf : null, vk: p.f === 'vb' ? o.vk : null }), det };
  }

  // ======================= IL COMICO DELLE PAROLE: il punteggio, le forme finto-ufficiali, i ritorni =======================
  // Ogni candidata ha un PUNTEGGIO (ridicolo): il registro che stride (un pezzo dotto o pomposo su una cosa piccola o sporca:
  // stronzologo, arcicozza; o la parolaccia su una cosa solenne), il suono (allitterazione, rima interna, le occlusive e le doppie,
  // la lunghezza giusta: 3-5 sillabe), la scala sbagliata (il diminutivo sul gigante, l'accrescitivo sulla briciola), la cosa
  // concreta (meglio la ciabatta del prestito). Se ne fanno tante, si tiene la migliore, sotto la soglia non si conia niente.
  // La stessa radice già usata da poco pesa (st.u.strada.usati.radice). Niente parole che esistono già (la lista nera e il lessico di Lingua).
  const DOTTI_P = new Set(['arci', 'proto', 'iper', 'super', 'mega', 'contro']), DOTTI_S = new Set(['ologo', 'ificio', 'eria', 'ista', 'astro']);
  const VOLGARI = /^(porc|merd|cazz|stronz|cul|mign|figur|scorre|pern)/;
  const MESCHINE = /^(cozz|marciapied|ciabatt|calzin|mutand|scop|tazzin|trigli|bidet|pozzangher|monetin|spicciol|gradin|scalin|tombin|secch|bidon|bottigli|cappell|polp|sard|acciug|vongol|ricott|provolon|babà|bab|zucchin|melanzan|cipoll|sgombr|baccal|caciocavall|tarall|pagnott|mestol|bullon|chiod|ditale|scontrin|supposta|suppost|zapp|sass|divan|dentier|candel|salsicc|spintone|spinton|cazzott|ceffon|figuracc|pernacch|gettone|gazzos|birr|vin|grapp|fiasc|damigian)/;
  const SOLENNI = /^(chies|sant|minister|dottor|sindac|governo|governat|processio|rosari|candel|comand|tutel|vescov|monsignor|eccellenz|presidi|cattedr|catechism)/;
  const GRANDI = /^(nave|navi|camion|furgon|port|chies|minister|montagn|divan|bidon|cassonett|condomin|mare|balen|camionett|traghett|cellular|damigian|portone|saracinesc)/;
  const PICCOLI = /^(monetin|spicciol|tazzin|chiod|bullon|ditale|cozz|vongol|acciug|briciol|sigarett|caff|scontrin|centesim|gettone|supposta|suppost|pulc|formic|bottone|mollic)/;
  const ASTRATTI = /^(prestit|cont|controll|minacc|parolacc|refurtiv|sgomber|multa|mult|verbal|document|perquis|timbr|cambial|debit|soldi)/;
  const DIMIN = /(etto|etta|icchio|ino|ina)$/, ACCR = /(one|ona|accio|accia|ozzo|astro)$/;
  const REALI = new Set(['porcata', 'porcate', 'porcheria', 'porcherie', 'porcone', 'porcaccio', 'porcello', 'porchetta', 'cazzata', 'cazzate', 'cazzone', 'cazzaro', 'cazzetto', 'cazzotto', 'cazzone', 'cazzastro',
    'merdaccia', 'merdata', 'merdone', 'merdaio', 'stronzata', 'stronzate', 'stronzetto', 'stronzone', 'culone', 'culetto', 'culata', 'caffetta', 'caffettiera', 'vinata', 'vinaccia', 'birreria', 'cappellone', 'cappelletto',
    'secchione', 'secchiello', 'bottiglione', 'bottiglietta', 'scopata', 'scopone', 'figuraccia', 'faccione', 'testone', 'testata', 'boccaccia', 'boccata', 'pancione', 'pancetta', 'musone', 'sassata', 'sassone', 'chiodata',
    'zappata', 'scalinata', 'gradinata', 'fiascone', 'portone', 'ciabattone', 'mestolata', 'polpetta', 'polpettone', 'pescheria', 'paneria', 'conticino', 'contone', 'prestanome', 'controllore', 'controllata', 'risata', 'scazzottare', 'scazzottata', 'incazzarsi', 'incazzare', 'incazzato', 'smerdare', 'sputtanare', 'impaccarsi', 'imbottigliare', 'incappellarsi', 'insaccare', 'inchiodare',
    'schiodare', 'acchiappare', 'svinare', 'avvinazzarsi', 'sbullonare', 'imbullonare', 'insalsicciare', 'tazzinata', 'sigaretta', 'vinello', 'chiodino', 'triglietta', 'marciapiedi', 'merdina', 'porcellino', 'chiodetto', 'stronzeria', 'furgonetto', 'furgoncino', 'merdoso', 'porcone', 'cazzuto']);
  const sillabe = w => (w.match(/[aeiouàèéìòù]+/g) || []).length;
  function ridicolo(R) {
    const w = R.w, b = piano(R.b || ''), rb = radice(b) || b; let s = 0;
    const dotto = (R.pre && DOTTI_P.has(R.pre)) || (R.suf && DOTTI_S.has(R.suf[0])), vol = VOLGARI.test(b) || (R.a && /^(porc|merd|cazz|stronz|cul)/.test(R.a));
    if (dotto && (MESCHINE.test(b) || VOLGARI.test(b))) s += 2.2;                   // stronzologo, arcicozza, merdificio
    if (vol && SOLENNI.test(b)) s += 2;                                           // porcocandela, merdaministero
    if (R.f === 'pa' && /^(porc|stronz)/.test(R.a || '') && MESCHINE.test(b)) s += 1;    // porcabottiglia: la parolaccia sulla cosa piccola
    if (R.f === 'nn' && MESCHINE.test(b)) s += .9;                                   // facciacozza
    if (R.f === 'vb' && MESCHINE.test(b)) s += 1.1;                                  // incozzarsi
    if (R.suf && DIMIN.test(R.suf[0]) && GRANDI.test(b)) s += 1.6;                    // naviciattola, furgonetto
    if (R.suf && ACCR.test(R.suf[0]) && PICCOLI.test(b)) s += 1.6;                    // monetinona, chiodone
    // il suono: le occlusive e le doppie, l'allitterazione, la rima interna, la lunghezza
    s += Math.min(1.4, ((w.match(/([bcdgptz])\1/g) || []).length * .45 + (w.match(/[ptkcbdg]/g) || []).length * .12));
    const p1 = (R.a || R.pre || '')[0], p2 = rb[0]; if (p1 && p1 === p2 && !isV(p1)) s += .9;
    if (R.a && piano(R.a).slice(-2) === b.slice(-2)) s += .7;                      // puzzapazza
    const sy = sillabe(w); s += sy >= 3 && sy <= 5 ? 1 : sy === 6 ? 0 : sy >= 7 ? -1.6 : -.6;
    if (w.length < 7) s -= 1;                                                     // semassi: troppo corta, non si capisce da dove viene
    // la cosa concreta batte l'astratta
    if (MESCHINE.test(b) || GRANDI.test(b) || PICCOLI.test(b)) s += 1; if (ASTRATTI.test(b)) s -= 1.3;
    if (R.pre && /^(semi|tri|ri|sotto|anti)$/.test(R.pre) && !VOLGARI.test(b)) s -= .8;
    return Math.round(s * 100) / 100;
  }
  US.ridicolo = ridicolo;
  function esiste(w) {
    if (REALI.has(w) || REALI.has(w.replace(/arsi$/, 'are')) || REALI.has(w.replace(/are$/, 'arsi'))) return true;
    try { const L = LG(); if (L && L.voce && L.voce(w)) return true; } catch (e) { }
    return false;
  }
  // le forme finto-ufficiali: la malattia, il ministero, il titolo (dalla radice coniata o dalla parola intera)
  function ufficiale(st, E, tipo) {
    const p = E.p, r = radice(p.b) || p.b, W = cap1(p.vb ? p.b : p.w), Rb = cap1(p.b);
    const malattia = unisciM(r, rp(['ite', 'osi', 'ite acuta', 'ite cronica'])), fonte0 = 'parola:' + E.id;
    fonte(fonte0);
    if (tipo === 'malattia') return malattia;
    if (tipo === 'ente') return rp([`il Ministero ${ART(Rb, 'di')}`, `l'Ufficio ${cap1(plN(p.b, genN(p.b).g))} Smarrit${genN(p.b).g === 'f' ? 'e' : 'i'}`, `l'Accademia ${ART(W, 'di')}`, `${ART(cap1(p.vb ? unisciM(r, 'ificio') : p.w), 'det')} comunale`]);
    return rp([`Sua Eccellenza ${ART(W, 'det')}`, `dottore in ${p.vb ? p.b : p.w}`, `Cavaliere ${ART(Rb, 'di')}`, `il Professor ${cap1(unisciM(r, 'ologo'))}`, `Monsignor ${W}`]);
  }
  // i ritorni: quando una parola coniata torna, ogni tanto qualcuno lì vicino la commenta (chi l'ha inventata? l'ho inventata io;
  // si dice così, ignorante; la nonna che la usa a modo suo). Una coda di battute da dire fra poco (RITORNI), letta nella fase.
  const RITORNI = [];
  function ritorno(st, n, E) {
    if (!E || E.k !== 'par' || E.usi < 2 || rnd() > .14 || RITORNI.length > 4) return;
    const p = st.player; if (!p) return;
    const L = st.npcs.filter(k => k !== n && k.pop && !k.dead && !k.inside && !k.cop && !k.grigio && Math.abs(k.x - n.x) < 6 && Math.abs(k.y - n.y) < 6);
    const k = L.length ? L[Math.floor(rnd() * L.length)] : null, w = E.p.w, ck = st.clock || 0, s = S(st);
    const padre = E.padre && s.esp && s.esp[E.padre], figlio = !padre && s.esp ? Object.values(s.esp).find(x => x.padre === E.id) : null;
    const opz = [];
    if (k) opz.push([k, rp([`E chi l'ha inventata, «${w}»?`, `«${w}»? Ma che parola è?`, `Ancora con «${w}»…`])]);
    if (E.chi0 === n.id) opz.push([n, rp([`«${cap1(w)}»: l'ho inventata io, eh. Pagate i diritti.`, `«${cap1(w)}». Mia. Brevettata.`])]);
    else if (k && E.chi0 === k.id) opz.push([k, `Oh! «${w}» l'ho inventata io! Copione!`]);
    if (k && (padre || figlio)) opz.push([k, `Si dice «${(padre || figlio).p.w}», ignorante!`]);
    if (k && ((k.pop.age || 0) >= 65 || registro(st, k.id) === 'no')) opz.push([k, E.p.vb ? `Ah, ${E.p.w.replace(/(are|arsi)$/, 'are')}: come fa il prete la domenica, buonanima.` : `Ah, ${ART(w, 'det')}! Mio marito ne aveva ${E.p.g === 'f' ? 'una' : 'uno'}, ma più grand${E.p.g === 'f' ? 'e' : 'e'}.`]);
    if (!opz.length) return; const [chi, t] = opz[Math.floor(rnd() * opz.length)];
    RITORNI.push([ck + 1.8 + rnd(), chi.id, t, E.id]); stats.ritorni = (stats.ritorni || 0) + 1;
  }
  function ritorni(st) {
    const ck = st.clock || 0;
    for (let i = RITORNI.length - 1; i >= 0; i--) { const [t, id, testo, eid] = RITORNI[i]; if (t > ck) continue; RITORNI.splice(i, 1); const n = npc(st, id); if (!n) continue; FONTI = ['parola:' + eid]; PAROLE = []; const tp = registro(st, id) || 'preso'; if (dice(st, n, testo, 'ritorno', tp, 'p')) stats.ritorniDetti = (stats.ritorniDetti || 0) + 1; }
  }

  // il gruppo adotta: due che la dicono nello stesso gruppo (o presidio) e la parola entra nel gergo della comunità
  function adotta(st) {
    const s = S(st), UCu = typeof UnicoCultura !== 'undefined' && UnicoCultura.ON ? UnicoCultura : null, cu = st.u.cultura && st.u.cultura.com; if (!UCu || !UCu.nuovaParola || !cu || !s.esp || !s.idl) return;
    const comDi = id => { const Gr = GR(), g = Gr && Gr.gruppoDi(st, id); if (g && cu['g:' + g.id]) return cu['g:' + g.id]; const cs = st.u.costruire && st.u.costruire.cantieri; if (cs) for (const C of cs) if (!C.chiuso && ((C.vive && C.vive[id]) || (C.gruppo || []).includes(id)) && cu['c:' + C.id]) return cu['c:' + C.id]; return null; };
    const conta = {};
    for (const id in s.idl) for (const eid in s.idl[id].e) { const E = s.esp[eid]; if (!E || E.k !== 'par' || E.adottata) continue; const c = comDi(id); if (!c) continue; const k = eid + '|' + c.k; (conta[k] = conta[k] || [E, c, []])[2].push(id); }
    for (const k in conta) { const [E, c, chi] = conta[k]; if (chi.length < 2 && !(E.usi >= 3 && !E.tentata && rnd() < .4)) continue; E.tentata = 1;
      let P = null; try { P = UCu.nuovaParola(st, E.p.w, E.p.vb ? 'fare come ' + E.p.b : 'una ' + E.p.b + ' da ridere', 'strada', c, E.da && FT() ? FT().di(st, E.da) : null, chi.slice(0, 3)); } catch (e) { P = null; }
      E.adottata = c.k; if (P) storia(st, 'gergo', E, chi[0], c.nome || c.k); }
  }
  US.idl = idl; US.conia = conia;


  // ======================= IL PAESE: il folklore condiviso (st.u.strada.folk) =======================
  // Lo strato di popolo che c'è dal giorno zero e che resta: fatto con la società di partenza (il regime: il Garante, i Grigi, la Tutela,
  // l'Ufficio Rettifiche; le chiese e i santi; i posti veri: i bar, le piazze, la calata, il mercato; i mestieri) e col seme:
  //   i SOPRANNOMI dei posti e delle istituzioni vere (la Cartiera, Sua Ombrosità, il Confessionale di Gino); i SANTI inventati,
  //   protettori di cose assurde, con la loro festa nel calendario della cultura; le STORIE finte coi posti veri (i Moti della Calata del
  //   '57, la Disfida del Bar Da Gino) e il loro anniversario; gli ORDINI e le confraternite con la sede, i soci e i TITOLI (Cavaliere
  //   dell'Ordine della Ciabatta d'Oro); le RELIQUIE (la tazzina sacra di Gino); le TARGHE.
  // Poi i FATTI GROSSI veri (lo sgombero, la retata, il presidio che nasce, la rissa davanti a tutti, la figuraccia con mezzo paese, la
  // festa) diventano istituzioni di popolo: la ricorrenza (il triduo dopo tre giorni, l'ottava dopo sette), il santo, il titolo a chi
  // c'era, la targa, il soprannome del posto. Le sa il quartiere (folk.sa: chi le conosce), si raccontano gonfiandosi come i miti, si
  // imparano chiedendo (chi è nuovo domanda), il Garante se le appropria (l'Ufficio Rettifiche le ribattezza), sbiadiscono piano
  // (vita) se nessuno le rinnova coi riti. Le parodie religiose sono affettuose: santi finti e riti finti, mai offese a Dio o alla Madonna.
  const ONORI = [['Cavaliere', 'Dama'], ['Commendatore', 'Commendatrice'], ['Gran Maestro', 'Gran Maestra'], ['Gran Ciambellano', 'Gran Ciambellana'], ['Ammiraglio', 'Ammiraglia'], ['Barone', 'Baronessa'],
    ['Priore', 'Priora'], ['Decano', 'Decana'], ['Venerabile', 'Venerabile'], ['Gran Visir', 'Gran Visira'], ['Arciduca', 'Arciduchessa'], ['Conte', 'Contessa'], ['Marchese', 'Marchesa'], ['Console', 'Consolessa'],
    ['Prefetto Onorario', 'Prefetta Onoraria'], ['Accademico', 'Accademica'], ['Custode', 'Custode'], ['Patriarca', 'Matriarca'], ['Luogotenente', 'Luogotenente'], ['Plenipotenziario', 'Plenipotenziaria'],
    ['Gran Croce', 'Gran Croce'], ['Protonotario', 'Protonotaria'], ['Ispettore Generale', 'Ispettrice Generale'], ['Maresciallo', 'Marescialla'], ['Abate', 'Badessa'], ['Duca', 'Duchessa'], ['Podestà', 'Podestà'],
    ['Cardinale', 'Madre Superiora'], ['Sindaco', 'Sindaca'], ['Professore', 'Professoressa'], ['Generale', 'Generalessa'], ['Capitano', 'Capitana'], ['Giudice', 'Giudice'], ['Primario', 'Primaria'], ['Campione', 'Campionessa'], ['Monsignore', 'Badessa']];
  const ORDINI = ['Ordine', 'Sovrano Ordine', 'Real Confraternita', 'Pia Unione', 'Accademia', 'Società di Mutuo Soccorso', 'Loggia', 'Compagnia', 'Venerabile Arciconfraternita', 'Circolo', 'Consorteria',
    'Lega', 'Fratellanza', 'Congrega', 'Insigne Collegio', 'Opera Pia', 'Sodalizio', 'Cenacolo', 'Capitolo', 'Gilda'];
  const ORN = ['d\'Oro', 'Sacr*', 'Rampante', 'Incoronat*', 'Immacolat*', 'Invitt*', 'Errante', 'Piangente', 'Bollit*', 'Smarrit*', 'dei Sette Mari', 'di Latta', 'Trionfante', 'Benedett*', 'Sbeccat*', 'Riluttante',
    'Fritt*', 'Addormentat*', 'Svenut*', 'a Rate', 'di Seconda Mano', 'in Esilio', 'Galleggiante', 'Ritrovat*', 'Ammaccat*', 'Insonne', 'Puntuale', 'Sotto Sale'];
  const STORIE = ['Battaglia', 'Assedio', 'Disfida', 'Moti', 'Rivolta', 'Pace', 'Sacco', 'Notte', 'Giorno', 'Grande Sciopero', 'Spedizione', 'Concilio', 'Congresso', 'Grande Fuga', 'Esodo', 'Guerra', 'Vespri', 'Tregua',
    'Congiura', 'Processione', 'Carestia', 'Alluvione', 'Grande Ritirata', 'Assalto', 'Beffa', 'Marcia', 'Disputa', 'Scisma'];
  const STORIE_C = ['', '', ' dei Mille %p', ' delle %p Volanti', ' del \'%a', ' del \'%a', ' (quella vera)', ' delle Sette %p', ' detta «la Lunga»', ' detta «degli Stracci»', ', prima parte', ' dei Cento Giorni', ' e Mezza'];
  const PATRONI = ['dei debitori', 'delle multe perse', 'dei mariti che tornano tardi', 'di chi cerca parcheggio', 'dei motorini che non partono', 'delle sedie in strada', 'di chi perde il traghetto',
    'dei Grigi stanchi', 'delle chiavi perse', 'di chi arriva dopo la fine', 'delle pentole bruciate', 'dei calzini spaiati', 'dei turni di notte', 'di chi aspetta il resto', 'delle cambiali', 'delle suocere in visita',
    'dei biglietti della lotteria', 'di chi inciampa', 'dei timidi al bar', 'dei rimandati a settembre', 'dei cani che abbaiano alle sei', 'delle ricevute smarrite', 'dei lunedì', 'di chi ha la tosse in chiesa'];
  const GRAZIE = ['il motorino è ripartito', 'la multa si è persa nella posta', 'il Grigio si è addormentato', 'la suocera ha perso il treno', 'il sugo non si è attaccato', 'ho trovato parcheggio davanti',
    'il debito l\'ha dimenticato lui', 'la rete è tornata piena', 'il padrone si è dato malato', 'la pioggia ha aspettato che chiudessi i panni'];
  const NOMI_POSTO = {
    regime: ['la Cartiera', 'il Timbrificio', 'la Casa del Mugugno', 'il Palazzo delle Code', 'il Pollaio', 'la Stamperia dei No', 'il Bunker dei Moduli', 'il Sant\'Uffizio del Bollo', 'la Fabbrica dei Verbali', 'il Castello di Carta', 'la Bocca della Verità Rettificata'],
    bar: ['il Confessionale', 'la Parrocchia di %o', 'il Parlamento', 'la Seconda Casa', 'l\'Ambasciata', 'il Consolato del Bicchiere', 'l\'Ufficio Reclami', 'il Senato'],
    mercato: ['la Borsa delle Cozze', 'il Tribunale delle Bilance', 'la Fiera dei Lamenti', 'il Casinò del Pesce'],
    chiesa: ['la Ditta', 'il Condominio dei Santi', 'la Sala d\'Attesa', 'lo Sportello del Cielo'],
    mare: ['il Fronte', 'la Riviera dei Calli', 'il Molo delle Lamentele', 'la Banchina dei Pensionati', 'la Spiaggia dei Ritardatari'],
    piazza: ['il Salotto', 'il Ring', 'l\'Arena', 'il Teatro dei Pettegolezzi', 'la Sala Grande'],
    altro: ['il Covo', 'il Purgatorio', 'la Repubblica', 'il Principato', 'il Lazzaretto', 'la Terra di Mezzo', 'la Caienna', 'il Ducato'],
  };
  const NOMI_GARANTE = ['Sua Ombrosità', 'il Gran Timbro', 'il Baffone di Carta', 'il Signor Decoro', 'il Sempre Presente', 'l\'Eterno Firmatario', 'il Vigile Supremo', 'Sua Protocollenza'];
  const NOMI_GRIGI = ['i Timbrati', 'i Moduli Ambulanti', 'gli Scarafaggi di Stato', 'le Cornacchie', 'i Fischietti', 'i Commessi del Garante'];
  const TIPO_POSTO = (k, nm) => { const s = (k + ' ' + nm).toLowerCase(); return /commissar|caserma|rocca|governo|minister|archivio|varco|tutela|comando|prefett/.test(s) ? 'regime' : /bar\b|bar |osteria|birreria|sirena|caff|bettola|trattoria/.test(s) ? 'bar' : /mercat|pescheria/.test(s) ? 'mercato' : /chiesa|santuario|eremo|cappella/.test(s) ? 'chiesa' : /calata|molo|porto|banchina|pontile|spiaggia|lido/.test(s) ? 'mare' : /piazza/.test(s) ? 'piazza' : null; };
  const OGG_FOLK = ['ciabatta', 'bullone', 'merluzzo', 'cozza', 'tazzina', 'scopa', 'triglia', 'mestolo', 'pignatta', 'cassetta', 'bombola', 'ombrello', 'tappo', 'fischietto', 'polpo', 'carciofo', 'gazzosa', 'canotto', 'sardina', 'zoccolo'];
  const ART_ST = { Moti: 'i ', Vespri: 'i ', Giorno: 'il ', Sacco: 'il ', Concilio: 'il ', Congresso: 'il ', 'Grande Sciopero': 'il ', Esodo: "l'", Assedio: "l'", Assalto: "l'", Scisma: 'lo ', Alluvione: "l'" };
  // il nome col suo articolo davanti («la Venerabile Arciconfraternita…», «il Congresso…»): la preposizione lo fonde
  const PREP_A = { di: { il: 'del', lo: 'dello', la: 'della', i: 'dei', gli: 'degli', le: 'delle', "l'": "dell'" }, a: { il: 'al', lo: 'allo', la: 'alla', i: 'ai', gli: 'agli', le: 'alle', "l'": "all'" }, in: { il: 'nel', lo: 'nello', la: 'nella', i: 'nei', gli: 'negli', le: 'nelle', "l'": "nell'" } };
  function prepN(nome, prep) { const m = /^(il|lo|la|i|gli|le|l') ?(.*)$/i.exec(nome); if (!m) return (prep === 'di' ? 'di ' : prep === 'a' ? 'a ' : '') + nome; if (!prep) return nome; const a = PREP_A[prep][m[1].toLowerCase()]; return a + (/'$/.test(a) ? '' : ' ') + m[2]; }
  const ORD_F = /^(Real Confraternita|Pia Unione|Accademia|Società|Loggia|Compagnia|Venerabile Arciconfraternita|Consorteria|Lega|Fratellanza|Congrega|Opera Pia|Gilda)/;
  const artSt = sh => (ART_ST[sh] || 'la ') + sh + ' ';
  function FK(st) { const s = S(st); return s.folk || (s.folk = { v: 1, it: {}, n: 0, sa: {}, tit: {}, nato: false, g: -1, q: {}, nomi: {} }); }
  const gOgg = w => (FEMW(w) ? 'f' : 'm');
  function ornato(o) { const r = rp(ORN), g = gOgg(o); return /\*/.test(r) ? `${ga(r, g)} ${cap1(o)}`.replace(/^(\S+) (\S+)$/, (m, a, b) => /^(Sacr|Benedett|Immacolat|Invitt)/.test(a) ? `${a} ${b}` : `${b} ${a}`) : `${cap1(o)} ${r}`; }
  function ordineNome(st, o) { const t = pkS(st, ORDINI, 'f_ord'); return `${ORD_F.test(t) ? (/^[AEIOU]/.test(t) ? "l'" : 'la ') : /^[AEIOU]/.test(t) ? "l'" : 'il '}${t} ${ART(ornato(o), 'di')}`; }
  function annoFinto(st, k) { return String(20 + Math.floor(hashS(seme(st) + '|anno|' + k) * 78)).padStart(2, '0'); }
  function nuovoIt(st, o) {
    const Fo = FK(st); if (!o.nome || Fo.nomi[o.nome]) return null; Fo.nomi[o.nome] = 1; const id = 'k' + (++Fo.n);
    const it = Fo.it[id] = Object.assign({ id, t0: Math.round(st.t), n: 0, vita: 1, gs: [], uff: null }, o);
    stats.folk = (stats.folk || 0) + 1; stats['folk_' + o.k] = (stats['folk_' + o.k] || 0) + 1; return it;
  }
  function sa(st, id, it) { const Fo = FK(st), L = Fo.sa[id] || (Fo.sa[id] = []); if (L.includes(it.id)) return false; L.push(it.id); if (L.length > 24) L.shift(); return true; }
  const conosce = (st, id) => { const Fo = FK(st); return (Fo.sa[id] || []).map(k => Fo.it[k]).filter(Boolean); };
  const giornoAss = st => Math.floor(st.t / 1440);
  const dataS = (st, t) => { try { return UnicoCultura.data(st, t).s; } catch (e) { return null; } };
  function inCalendario(st, it, t) { try { const c = st.u.cultura; if (c && c.cal && c.cal.feste) { const s = dataS(st, t); if (s) c.cal.feste.push([s, it.nome, 'folk']); if (c.cal.feste.length > 40) c.cal.feste.shift(); } } catch (e) { } }
  function scriviF(st, v, chi, d, causa, x) { const Ft = FT(); if (!Ft || !Ft._ || !Ft._.registra) return null; try { return Ft._.registra(st, { t: st.t, v, chi: [].concat(chi || []).filter(c => c != null).slice(0, 6), causa: causa || null, peso: 1, hop: 0 }, Object.assign({ d }, x || {}), 'unico'); } catch (e) { return null; } }
  // il giorno zero: il paese com'è, dal seme
  function semina(st) {
    const Fo = FK(st); if (Fo.nato || !st.npcs || !st.npcs.length || !G.PLACES) return; Fo.nato = true;
    const g0 = giornoAss(st), P = Object.entries(G.PLACES).map(([k, p]) => [k, p, TIPO_POSTO(k, p.name || '')]).filter(x => x[2] && x[1].name && !x[1].isola && /^[A-Z]/.test(x[1].name) && !/:|^In |^Il relitto/.test(x[1].name));
    P.sort((a, b) => hashS(seme(st) + a[0]) - hashS(seme(st) + b[0]));
    const gente = st.npcs.filter(n => n.pop && !n.cop && !n.grigio && (n.pop.age || 30) >= 18), unoDi = L => L[Math.floor(rnd() * L.length) % L.length];
    // i soprannomi dei posti veri e del regime
    const presi = {}; for (const [k, p, t] of P) { if ((presi[t] = (presi[t] || 0) + 1) > 2) continue; const o = (/Da (\w+)/.exec(p.name) || [])[1] || (gente.find(n => n.shop === k) || {}).first || null;
      const L = NOMI_POSTO[t].filter(x => o || !/%o/.test(x)); const nm = pkS(st, L, 'f_posto').replace('%o', o || ''); const it = nuovoIt(st, { k: 'sopr', nome: nm, luogo: p.name, lk: k, x: p.x, y: p.y, vita: 3 }); }
    nuovoIt(st, { k: 'sopr', nome: pkS(st, NOMI_GARANTE, 'f_gar'), luogo: 'il Garante', vita: 3, regime: 1 }); nuovoIt(st, { k: 'sopr', nome: pkS(st, NOMI_GRIGI, 'f_gri'), luogo: 'i Grigi', vita: 3, regime: 1 });
    // i santi inventati: protettori dei mestieri veri del paese e delle disgrazie di tutti i giorni
    const mest = [...new Set(gente.map(n => n.pop.job && String(n.pop.job.base || '').toLowerCase()).filter(j => j && !/\s|altro|disoccup|pension/.test(j)))];
    for (let i = 0; i < 6; i++) { const o = i < 3 ? (emblema(rp(mest)) || rp(OGG_FOLK)).split(' ')[0] : rp(OGG_FOLK), r = radice(o) || o, f = gOgg(o);
      const w0 = cap1(unisciM(r, f === 'f' ? rp(['ina', 'uccia', 'ella', 'ona']) : rp(['one', 'ino', 'ello', 'uccio']))), nm = `${/^[AEIOU]/.test(w0) ? 'Sant\'' : f === 'f' ? 'Santa ' : 'San '}${w0}`;
      const mj = mest.length ? plN(rp(mest), 'm') : null, pat = i % 2 && mj ? `${/^(s[^aeiou]|z|gn|ps|[aeiou])/.test(mj) ? 'degli' : 'dei'} ${mj}` : pkS(st, PATRONI, 'f_pat'), g = g0 + 1 + Math.floor(rnd() * 6);
      const sede = P.filter(x => x[2] === 'chiesa' || x[2] === 'bar' || x[2] === 'piazza')[i % Math.max(1, P.filter(x => x[2] === 'chiesa' || x[2] === 'bar' || x[2] === 'piazza').length)];
      const it = nuovoIt(st, { k: 'santo', nome: nm, ex: { pat, ogg: o }, gs: [g], vita: 3, luogo: sede ? sede[1].name : null, x: sede ? sede[1].x : null, y: sede ? sede[1].y : null }); if (it) inCalendario(st, it, g * 1440); }
    // le storie finte coi posti veri
    for (let i = 0; i < 5 && i < P.length; i++) { const [k, p] = P[(i * 3) % P.length], ogg = rp(OGG_FOLK); let c = rp(STORIE_C).replace('%p', cap1(plN(ogg, gOgg(ogg)))).replace('%a', annoFinto(st, k + i));
      const sh = pkS(st, STORIE, 'f_sto'), nm = `${artSt(sh)}${ART(p.name, 'di')}${c}`;
      const g = g0 + 1 + Math.floor(rnd() * 6); const it = nuovoIt(st, { k: 'storia', nome: nm, luogo: p.name, x: p.x, y: p.y, ex: { ogg, chi: rp(['i pescatori', 'le lavandaie', 'i portuali', 'le comari', 'i ragazzi del vico', 'mezza parrocchia', 'il circolo delle bocce']), contro: rp(['i Grigi', 'il Garante', 'quelli del porto', 'la Tutela', 'gli esattori', 'quelli di sopra']) }, gs: [g], vita: 3 });
      if (it) inCalendario(st, it, g * 1440); }
    // gli ordini e le confraternite, con la sede in un bar o una chiesa e i soci, che hanno il titolo
    const sedi = P.filter(x => x[2] === 'bar' || x[2] === 'chiesa' || x[2] === 'piazza');
    for (let i = 0; i < 4 && sedi.length; i++) { const [k, p] = sedi[i % sedi.length], ogg = rp(OGG_FOLK), nm = ordineNome(st, ogg);
      const soci = gente.filter(n => Math.hypot(n.x - p.x, n.y - p.y) < 120).sort((a, b) => hashS(a.id + nm) - hashS(b.id + nm)).slice(0, 4);
      const it = nuovoIt(st, { k: 'ordine', nome: nm, luogo: p.name, x: p.x, y: p.y, ex: { ogg, soci: soci.map(n => n.id) }, gs: [g0 + 2 + Math.floor(rnd() * 5)], vita: 3 }); if (!it) continue;
      soci.forEach((n, j) => conferisci(st, n.id, it, j === 0 ? 'Gran Maestro' : null, null)); }
    // le reliquie: la cosa di una persona vera
    for (let i = 0; i < 4; i++) { const n = gente[Math.floor(rnd() * gente.length)], o = emblema(lavoro(n)) || rp(OGG_FOLK); if (!n) continue;
      nuovoIt(st, { k: 'reliquia', nome: `${ART(o, 'det')} ${rp(['sacr*', 'miracolos*', 'benedett*', 'santissim*'].map(x => ga(x, gOgg(o.split(' ')[0]))))} di ${nomeDi(st, n.id)}`, chi: n.id, x: n.x, y: n.y, ex: { ogg: o }, vita: 3 }); }
    // chi le sa: quasi tutti i grandi, pochi i ragazzi
    for (const n of st.npcs) if (n.pop && !n.cop) { const p = (n.pop.age || 30) > 25 ? .8 : .35; for (const k in Fo.it) if (rnd() < p) sa(st, n.id, Fo.it[k]); }
    stats.folkZero = Object.keys(Fo.it).length;
  }
  // un titolo: l'onore dell'ordine (o del fatto) a una persona
  function conferisci(st, id, it, testa, perche) {
    const n = npc(st, id); if (!n) return null; const f = n.pop && n.pop.sex === 'f', O = testa ? ONORI.find(x => x[0] === testa) || rp(ONORI) : pk(st, ONORI, 'f_onore', x => x[0]);
    const tit = `${O[f ? 1 : 0]} ${it.k === 'ordine' || it.k === 'storia' || it.k === 'ricorrenza' ? prepN(it.nome, 'di') : ART(ornato(it.ex && it.ex.ogg || rp(OGG_FOLK)), 'di')}`;
    FK(st).tit[id] = { t: tit, h: O[f ? 1 : 0], it: it.id, perche: perche || null, t0: Math.round(st.t) }; stats.titoli = (stats.titoli || 0) + 1; return tit;
  }
  // i fatti grossi diventano istituzioni di popolo
  const GROSSI = { fidanzamento: 'Fidanzamento', scommessa: 'Scommessa', pace: 'Pace', concerto: 'Concerto', cena: 'Cena', invenzione: 'Esplosione', due_di_picche: 'Due di Picche', sgombero: 'Sgombero', repressione: 'Retata', presidio_grigi: 'Visita dei Grigi', presidio: 'Fondazione', multa: 'Grande Multa', fermato: 'Arresto', comica: 'Figuraccia', guasto: 'Figuraccia', rissa_fine: 'Rissa', botte: 'Scazzottata',
    festa: 'Festa', presidio_festa: 'Festa', rito: 'Tavolata', furto: 'Furto', lancio: 'Bombardamento', sparo: 'Sparatoria', presidio_resiste: 'Resistenza' };
  function commemora(st, f) {
    const tipo = GROSSI[f.v]; if (!tipo) return; const test = (f.test || []).length, Fo = FK(st), g = giornoAss(st);
    const grosso = /sgombero|repressione|presidio$|presidio_resiste|sparo|fidanzamento|invenzione|concerto/.test(f.v) || test >= 4 || (f.v === 'rito' && f.x && f.x.rito === 'tavolata'); if (!grosso) return;
    Fo.q[g] = Fo.q[g] || 0; if (Fo.q[g] >= 3 || rnd() > .7) return; Fo.q[g]++;
    const chi = f.chi != null ? String(Array.isArray(f.chi) ? f.chi[0] : f.chi) : null, nm = chi && chi !== 'nino' ? nomeDi(st, chi) : chi === 'nino' ? 'Nino' : null, x = f.dove ? f.dove[0] : null, y = f.dove ? f.dove[1] : null, lu = x != null ? luogo(st, x, y) : null;
    const fT = FEMW(tipo) ? 'f' : 'm', grande = ga(rp(['Grande ', '', 'Sacr* ', 'Famos* ', 'Leggendari* ', '']), fT), un = rp(['Giorno', 'Notte', 'Settimana', 'Festa', 'Vigilia', 'Ricorrenza', 'Memoria', 'Domenica']);
    const diT = w => (/^[AEIOU]/.test(w) ? "dell'" : fT === 'f' ? 'della ' : 'del ') + w;
    const sh = pk(st, [
      () => `${un === 'Giorno' ? 'il' : 'la'} ${un} ${diT(grande + tipo)}${lu ? ' ' + ART(lu, 'di') : ''}`,
      () => `${/^[AEIOU]/.test(tipo) ? "l'" : fT === 'f' ? 'la ' : 'il '}${tipo} ${lu ? ART(lu, 'di') : 'di ' + rp(['quel martedì', 'Ferragosto', 'quella sera'])}${nm ? ' di ' + nm : ''}`,
      () => nm ? `${rp(['i Fatti', 'i Moti', 'la Passione', 'la Leggenda', 'l\'Epopea', 'la Ballata'])} di ${nm}${lu ? ' ' + inL(lu) : ''}` : null,
      () => `la ${rp(['Disfida', 'Battaglia', 'Beffa', 'Notte'])} ${ART(rp(OGG_FOLK), 'di')}${lu ? ' ' + inL(lu) : ''}`,
    ], 'f_comm', (x, i) => i)();
    if (!sh) return;
    const it = nuovoIt(st, { k: 'ricorrenza', nome: sh.replace(/\s+/g, ' ').trim(), luogo: lu, x, y, chi, da: f.id, ex: { tipo, d: (f.d || '').slice(0, 90), quanti: test, ogg: cosaR(f.cosa) || rp(OGG_FOLK) }, gs: [g + 3, g + 7], vita: 1.2 });
    if (!it) return; stats.folkEventi = (stats.folkEventi || 0) + 1; inCalendario(st, it, (g + 3) * 1440);
    for (const id of [chi].concat((f.con || []).map(String), (f.test || []).map(String))) if (id && id !== 'nino') sa(st, id, it);
    // e qualcosa resta: un titolo a chi c'era, un santo, una targa, il nome del posto
    const r = rnd(), cosa = r < .35 && chi && chi !== 'nino' ? 'titolo' : r < .55 && nm ? 'santo' : r < .8 ? 'targa' : lu ? 'posto' : 'targa';
    let extra = null;
    if (cosa === 'titolo') extra = conferisci(st, chi, it, null, it.nome);
    else if (cosa === 'santo') { const s = nuovoIt(st, { k: 'santo', nome: `${sesso(st, chi) === 'f' ? 'Santa' : 'San'} ${nm} ${rp(['Martire', 'del Marciapiede', 'delle Cause Perse', 'Inciampatore', 'della Domenica', 'Senza Ricevuta', 'Protettore'])}`.replace(/ Protettore$/, ''), chi, da: f.id, ex: { pat: pkS(st, PATRONI, 'f_pat'), ogg: it.ex.ogg }, gs: [g + 7], vita: 1.2 }); if (s) { extra = s.nome; for (const id of (Fo.sa[chi] ? [chi] : [])) sa(st, id, s); for (const id of (f.test || [])) sa(st, String(id), s); } }
    else if (cosa === 'posto' && lu) { const s = nuovoIt(st, { k: 'sopr', nome: `${rp(['Piazzale', 'Largo', 'Vicolo', 'Angolo', 'Campo'])} ${ART(tipo, 'di')}`, luogo: lu, x, y, da: f.id, vita: 1.2 }); if (s) { extra = s.nome; for (const id of (f.test || [])) sa(st, String(id), s); } }
    else { const s = nuovoIt(st, { k: 'targa', nome: `Qui, il ${dataS(st, f.t) || 'giorno'}, ${nm || 'qualcuno'} ${(azioneDi(st, f, chi) || rp(['fece la storia', 'c\'era', 'non si arrese'])).replace(/^ha /, 'ha ')}. ${rp(['I posteri ringraziano.', 'Il Comune non sa niente.', 'Non toccare.', 'Ex voto.', 'Si prega di non sedersi.', 'A imperitura memoria (fino a giovedì).'])}`, luogo: lu, x, y, chi, da: f.id, vita: 1.2 }); if (s) extra = s.nome; }
    scriviF(st, 'commemorazione', [chi].filter(c => c && c !== 'nino'), `Il quartiere ricorda: «${cap1(it.nome)}»${extra ? ' — ' + extra : ''}`, f.id, { x, y });
  }
  // il racconto: ogni volta un po' più grosso (come i miti)
  const QUANTI = ['tre', 'sette', 'venti', 'cento', 'mille', 'diecimila'];
  function racconto(st, X, it) {
    const k = Math.min(QUANTI.length - 1, Math.floor(it.n / 2)); it.n++; it.vita = Math.min(3, it.vita + .1); fonte('folk:' + it.id); stats.racconti = (stats.racconti || 0) + 1;
    const N = cap1(it.nome), g = X.g === 'f' ? 'a' : 'o';
    if (it.k === 'santo') { const p = it.ex.pat; return X.tipo === 'pr' || rnd() < .4 ? rp([`${it.nome}, protett${/^Santa/.test(it.nome) ? 'rice' : 'ore'} ${p}, ora pro nobis. E pro ${rp(['le cambiali', 'il motorino', 'mio cognato', 'la schedina'])}.`, `Novena a ${it.nome}: nove giorni ${rp(['senza pagare', 'senza bestemmiare', 'senza guardare la suocera', 'a pane e gazzosa'])}. Funziona, eh.`, `Per grazia ricevuta da ${it.nome}: ${rp(GRAZIE)}. Ex voto.`, `${it.nome}, tu che proteggi ${p.replace(/^(dei|delle|degli|di) /, (m, a) => ({ dei: 'i ', delle: 'le ', degli: 'gli ', di: '' }[a]))}, pensaci tu.`])
      : `Il ${dataS(st, (it.gs[0] || giornoAss(st) + 1) * 1440) || 'giorno'} è ${it.nome}, protett${/^Santa/.test(it.nome) ? 'rice' : 'ore'} ${p}. ${rp(['Si offre da bere.', 'Si accende un lumino al bar.', 'Si sta zitti un minuto, poi si mangia.'])}`; }
    if (it.k === 'storia') return rp([`${N}: eravamo in ${QUANTI[k]}, ${it.ex.chi}, contro ${it.ex.contro}. ${rp(['E abbiamo vinto noi', 'E abbiamo perso, ma con stile', 'E nessuno ha pagato', 'Mio nonno c\'era'])}.`, `Mio nonno a ${it.nome} ${rp(['ha perso un dente', 'ha preso una medaglia di latta', 'c\'era, dice', 'ha tirato ' + ART(it.ex.ogg, 'ind')])}. ${QUANTI[k] === 'tre' ? 'Giuro.' : 'Erano in ' + QUANTI[k] + ', contro di lui.'}`]);
    if (it.k === 'ricorrenza') { const c = it.chi && it.chi !== 'nino' ? nomeDi(st, it.chi) : it.chi === 'nino' ? 'Nino' : null; return rp([`Te la ricordi ${it.nome}? ${it.ex.quanti ? 'Eravamo in ' + QUANTI[Math.min(QUANTI.length - 1, k + 1)] + ' a guardare' : 'C\'ero io'}${c ? ', e ' + c + ' ' + rp(['era una furia', 'non ha detto una parola', 'piangeva', 'rideva']) : ''}.`, `${N}: quel giorno ${rp(['è cambiato tutto', 'il quartiere ha capito', 'abbiamo riso per una settimana', 'si è fatta la storia, piccola'])}${k > 1 ? ', e ne parlano pure a Marsiglia' : ''}.`]); }
    if (it.k === 'ordine') return rp([`Stasera c'è riunione ${prepN(it.nome, 'di')}${it.luogo ? ' ' + inL(it.luogo) : ''}. Chi manca paga da bere.`, `Io ${rp(['ci sono entrat' + g, 'ho fatto domanda', 'ne sono soci' + (X.g === 'f' ? 'a' : 'o')])} ${prepN(it.nome, 'a')}. ${rp(['La quota è un bicchiere.', 'Il giuramento è segreto. Cioè, si urla.', 'C\'è pure la divisa: un cappello di carta.'])}`]);
    if (it.k === 'reliquia') return `${cap1(it.nome)}? ${rp(['La tocchi e ti passa il mal di schiena.', 'Ci giurano sopra, al bar.', 'Una volta l\'hanno rubata. È tornata da sola.', 'Fa i miracoli piccoli: il resto giusto, il parcheggio.'])}`;
    if (it.k === 'targa') return `C'è una targa ${it.luogo ? inL(it.luogo) : 'lì'}: «${it.nome}»`;
    if (it.k === 'sopr') return it.regime ? rp([`${cap1(it.nome)} ${/^(i|gli|le) /.test(it.nome) ? 'hanno' : 'ha'} firmato un'altra ordinanza. Stavolta sulle ${rp(['risate', 'sedie', 'cozze', 'serenate', 'biciclette'])}.`, `Hai visto ${it.nome} oggi? Sempre più ${rp(['timbrat' + 'i', 'grigi', 'nervosi', 'in fila'])}.`])
      : rp([`Vado ${inL(it.nome)} a ${rp(['pagare la multa', 'sentire le novità', 'farmi un bicchiere', 'lamentarmi', 'litigare un po\''])}. ${it.luogo ? '(' + it.luogo + ', per chi è nuovo.)' : ''}`.trim(), `${cap1(it.nome)}: così ${/^(la|l'a|le)\b/i.test(it.nome) ? 'la' : 'lo'} chiamiamo noi ${it.luogo ? ART(it.luogo, 'det') : 'quel posto'}. Da sempre.`]);
    return N;
  }
  // il Garante se le appropria: l'Ufficio Rettifiche ribattezza le ricorrenze troppo raccontate
  const UFF_F = ['la Giornata del Decoro %d', 'la Ricorrenza Ufficiale della Concordia %d', 'la Festa Civica dell\'Ordine %d', 'la Commemorazione Autorizzata %d', 'la Settimana della Serenità Obbligatoria %d', 'la Giornata del Cittadino Composto %d'];
  function appropria(st) {
    const Fo = FK(st); for (const k in Fo.it) { const it = Fo.it[k]; if (it.uff || it.regime || it.n < 4 || (it.k !== 'ricorrenza' && it.k !== 'storia' && it.k !== 'santo') || rnd() > .5) continue;
      it.uff = pkS(st, UFF_F, 'f_uff').replace('%d', it.luogo ? ART(it.luogo, 'di') : ART(it.ex && it.ex.ogg || 'quartiere', 'di')); stats.appropriate = (stats.appropriate || 0) + 1;
      scriviF(st, 'rettifica', [], `Ufficio Rettifiche: «${it.nome}» da oggi si chiama «${it.uff}». Al bar nessuno ci fa caso`, it.da || null, { x: it.x, y: it.y }); break; }
  }
  // il giorno: le feste di oggi (i soci, chi la sa, vanno sul posto e brindano), l'oblio per chi non è più raccontato
  const FESTE = [];
  function giorno(st) {
    const Fo = FK(st), g = giornoAss(st), h = (st.t % 1440) / 60; if (h < 18.5 || Fo.g === g) return; Fo.g = g;
    for (const k in Fo.it) { const it = Fo.it[k]; it.vita -= it.t0 < 60 ? .03 : .08; if (it.vita <= 0) { scriviF(st, 'oblio', [], `Nessuno ricorda più «${it.nome}»`, it.da || null); delete Fo.it[k]; delete Fo.nomi[it.nome]; stats.oblii = (stats.oblii || 0) + 1; continue; }
      if (!it.gs.includes(g) || it.x == null) continue;
      const chi = st.npcs.filter(n => n.pop && !n.dead && !n.cop && !n.grigio && !(n.jailedUntil > st.t) && (Fo.sa[n.id] || []).includes(it.id)).sort((a, b) => Math.hypot(a.x - it.x, a.y - it.y) - Math.hypot(b.x - it.x, b.y - it.y)).slice(0, 5);
      if (chi.length < 2) continue; it.vita = Math.min(3, it.vita + .4); stats.feste = (stats.feste || 0) + 1;
      const V = VB(); for (const n of chi) { try { if (V && V.fai) V.fai(st, n, 'vai', { x: it.x + (rnd() - .5) * 4, y: it.y + (rnd() - .5) * 4 }); } catch (e) { } }
      FESTE.push({ it: it.id, x: it.x, y: it.y, fino: st.t + 150, chi: chi.map(n => n.id), ck: 0 }); if (FESTE.length > 4) FESTE.shift();
      scriviF(st, 'ricorrenza', chi.map(n => n.id), `${cap1(it.k === 'santo' ? 'la festa di ' + it.nome : it.nome)}${it.luogo ? ' ' + inL(it.luogo) : ''}: ${chi.length} a brindare${it.uff ? ' (per il Garante è «' + it.uff + '»)' : ''}`, it.da || null, { x: it.x, y: it.y });
    }
    appropria(st);
  }
  function brindisi(st) {
    const p = st.player, ck = st.clock || 0; if (!p) return;
    for (let i = FESTE.length - 1; i >= 0; i--) { const E = FESTE[i]; if (st.t > E.fino) { FESTE.splice(i, 1); continue; } if (Math.hypot(p.x - E.x, p.y - E.y) > 30 || ck < E.ck) continue; E.ck = ck + 5 + rnd() * 4;
      const it = FK(st).it[E.it]; if (!it) continue; const n = E.chi.map(id => npc(st, id)).find(n => n && Math.hypot(n.x - E.x, n.y - E.y) < 10 && !(n.bark && n.bark.until > ck)); if (!n) continue;
      FONTI = ['folk:' + it.id]; PAROLE = []; const tit = FK(st).tit[n.id];
      const t = it.k === 'santo' ? rp([`${it.nome}, ora pro nobis! E pro il vino!`, `Viva ${it.nome}! Un lumino e un bicchiere!`, `${it.nome}, proteggi ${it.ex.pat.replace(/^(dei|delle|degli|di) /, (m, a) => ({ dei: 'i ', delle: 'le ', degli: 'gli ', di: '' }[a]))}! Cin cin!`])
        : it.k === 'storia' && rnd() < .5 ? rp([`Rievochiamo ${it.nome}! Tu fai ${it.ex.contro}, io faccio ${it.ex.chi}!`, `E adesso, come ${prepN(it.nome, 'a')}: all'attacco! …Piano, che ho la schiena.`, `Rievocazione ${prepN(it.nome, 'di')}: chi fa ${it.ex.contro} si mette di là!`])
        : rp([`A ${it.nome}! Cin cin!`, `Per ${it.nome}, e per chi c'era!`, `Un minuto di silenzio per ${it.nome}. …Basta, beviamo.`, `Viva ${it.nome}${it.chi && it.chi !== 'nino' && it.chi !== n.id ? ' e viva ' + nomeDi(st, it.chi) : ''}!`, tit ? `Parla ${tit.h}: a ${it.nome}! Alla salute!` : `Alla salute ${prepN(it.nome, 'di')}!`]);
      const t2 = nuova(st, () => t.replace(/\s+/g, ' ')); if (!t2) continue;
      if (dice(st, n, t2, 'brindisi', registro(st, n.id) || 'paese', 'p')) stats.brindisi = (stats.brindisi || 0) + 1; }
  }
  // chi è nuovo domanda: sulla chiacchiera chi sa racconta, chi non sa impara (e se il giocatore è lì, si sente)
  const DOMANDE = [];
  function imparaFolk(st, a, b) {
    const Fo = FK(st), A = Fo.sa[a] || [], B = Fo.sa[b] || []; const k = A.find(x => !B.includes(x) && Fo.it[x]); if (!k || rnd() > .5) return;
    const it = Fo.it[k]; sa(st, b, it); it.n++; it.vita = Math.min(3, it.vita + .05); stats.imparate = (stats.imparate || 0) + 1;
    const na = npc(st, a), nb = npc(st, b), p = st.player; if (!na || !nb || !p || Math.hypot(nb.x - p.x, nb.y - p.y) > 26 || DOMANDE.length > 3 || rnd() > .6) return;
    const pl = /^(i|gli|le) /.test(it.nome), N = it.nome, Nc = cap1(N), q = () => it.k === 'santo' || it.regime ? rp([`Ma chi ${pl ? 'sono' : 'è'} ${N}?`, `${Nc}? E chi ${pl ? 'sono' : 'è'}?`, `Scusa, ${N}… chi ${pl ? 'sarebbero' : 'sarebbe'}?`, `Io sono nuov* di qua: ${N}, chi ${pl ? 'sono' : 'è'}?`, `${Nc}? Mai sentit*.`])
      : it.k === 'sopr' ? rp([`${Nc}? Che posto è?`, `Dov'è ${N}? Io non lo trovo sulla mappa.`, `${Nc}? Ma dove sta?`, `Scusa, ${N}… dove sarebbe?`]) : rp([`Ma che cos'è ${N}?`, `${Nc}? Mai sentit*.`, `${Nc}? Raccontami, dai.`, `E ${N} cosa sarebbe?`, `Scusa, ignoranza mia: ${N}?`]);
    const g = nb.pop && nb.pop.sex === 'f' ? 'a' : 'o';
    DOMANDE.push([(st.clock || 0) + .5, b, () => q().replace(/\*/g, g), it.id], [(st.clock || 0) + 3, a, null, it.id]);
  }
  function domande(st) {
    const ck = st.clock || 0;
    for (let i = 0; i < DOMANDE.length; i++) { const [t, id, q, k] = DOMANDE[i]; if (t > ck) continue; DOMANDE.splice(i--, 1); const n = npc(st, id), it = FK(st).it[k]; if (!n || !it) continue; FONTI = ['folk:' + k]; PAROLE = [];
      const testo = nuova(st, () => { FONTI = ['folk:' + k]; return q ? q() : `${rp(['Non lo sai?', 'Ma dove vivi?', 'Ma da dove vieni?', 'Siediti che ti spiego.', 'Ignorante!', 'Ah, i giovani…', 'Ma come, non lo sai?'])} ${racconto(st, ctxDi(st, n, registro(st, id) || 'sb', null), it)}`; }); if (!testo) continue;
      if (dice(st, n, testo, q ? 'domanda' : 'lore', registro(st, id) || 'paese', 'p')) stats.domande = (stats.domande || 0) + 1; }
  }
  // il titolo per chiamare: «Buonasera, Cavaliere!»; e chi ce l'ha se ne vanta, chi lo prende in giro lo storpia
  function salutoOra(st) { const h = (st.t % 1440) / 60; return rp(h < 12 && h >= 5 ? ['Buongiorno', 'Riverisco', 'I miei omaggi', 'Ossequi'] : h < 18 ? ['Salve', 'Riverisco', 'I miei omaggi', 'Ossequi', 'Buon pomeriggio'] : ['Buonasera', 'Riverisco', 'I miei omaggi', 'Ossequi']); }
  function titolatoVicino(st, n) { const Fo = FK(st); let best = null, bd = 5; for (const id in Fo.tit) { const k = npc(st, id); if (!k || k === n || k.dead || k.inside) continue; const d = Math.hypot(k.x - n.x, k.y - n.y); if (d < bd) { bd = d; best = k; } } return best; }
  const CODE_T = ['', '', 'Come andiamo?', 'Tutto bene a corte?', 'Sempre in forma, eh.', 'Mi raccomando, l\'onore.', 'Che si dice ai piani alti?', 'Le bacio le mani. Si fa per dire.', 'Si inchina il quartiere.', 'Ai suoi ordini. Più o meno.', 'Che onore, che onore.', 'Il solito?', 'Ha visto che giornata?', 'Bentornat* tra noi mortali.'];
  function indirizzo(st, k, dom) { const T = FK(st).tit[k.id], f = k.pop && k.pop.sex === 'f' ? 'a' : 'o', c = ga(rp(CODE_T), f === 'a' ? 'f' : 'm');
    const pre = rp([salutoOra(st) + ', ', salutoOra(st) + ', ', 'Eccellenza! ', 'Oh, ', 'Ma guarda: ', 'Largo, largo: ', 'Fate passare ']);
    const nome = rp(['', '', nomeDi(st, k.id) + ', ']);
    return `${pre}${/^(Largo|Fate passare)/.test(pre) ? 'arriva ' + (rnd() < .5 ? ART(T.h, 'det') : T.t) + '!' : nome + chiamaTitolo(st, k) + '!'}${dom && !c ? ' ' + rp(['Come va?', 'Tutto bene?']) : c ? ' ' + c : ''}`.replace(/\s+/g, ' ').trim(); }
  function chiamaTitolo(st, k) { const T = FK(st).tit[k.id]; fonte(T.it ? 'folk:' + T.it : 'eti:' + k.id); fonte('eti:' + k.id); try { rispondi(st, k); } catch (e) { } stats.titoliDetti = (stats.titoliDetti || 0) + 1; return rnd() < .6 ? T.h : T.t; }
  US.folk = FK; US.feste = FESTE;


  // ======================= I RUOLI: l'etichetta che diventa chi sei (st.u.strada.ruoli) =======================
  // Il giro: un soprannome di scherno nasce da quello che uno fa (chi prega spesso diventa «il Cardinale delle Cozze», chi sta sempre al
  // molo «l'Ammiraglio»), o è un titolo del paese; se lo usano in tanti, tante volte, si ATTACCA (eti). Chi lo porta reagisce col suo
  // carattere: lo ABBRACCIA (teatrale, carismatico, un po' matto), lo RESPINGE (orgoglioso: si arrabbia, e a volte poi cede) o ci GIOCA.
  // Chi l'abbraccia ha il RUOLO: una famiglia (FAMIGLIE, dati: chiesa, mare, scuola, politica, nobili, militari, cavalieri, corte,
  // medicina, santi, giustizia, sport) coi suoi ATTI (verbi nuovi come carte di unico_vocabolario: predica, benedici, confessa, fai il
  // miracolo, passa in rassegna, dai lezione, tieni comizio…), il suo REGISTRO e il suo POSTO. Il ruolo cresce piano (giorni, settimane:
  // CFG.scala lo accelera per le prove): vuole i suoi atti (un desiderio di UnicoDesideri, la variabile «ruolo»), li fa davanti a un
  // pubblico (v:raduna), e i suoi discorsi si fanno al momento (sermone): il registro del ruolo mischiato al folklore che sa, alle sue parole
  // coniate, alla sua vita e ai guai veri di chi ascolta. Chi ascolta ride, ci crede, a volte lo SEGUE (l'idea «p:capo» di UnicoIdee: il
  // gruppo nasce da sé, UnicoGruppi); i seguaci ripetono le sue parole. Con abbastanza seguaci e tempo il ruolo vuole il suo POSTO e il
  // gruppo lo costruisce (UC.richiedi: la cappella di bancali, la cattedra, il palco): il posto prende un nome e una festa, e torna al paese.
  // Il giro vale anche fuori dai titoli: l'insulto coniato che si attacca fa scappare o vendicare chi lo prende; il santo finto molto
  // raccontato ha un'edicola vera; la storia finta si rievoca alla sua festa; il Garante reagisce ai ruoli che fanno folla.
  // L'ONTOLOGIA DEI RUOLI: un ruolo = DOMINIO × AUTORITÀ × REGISTRO × EMBLEMA (la cosa del mondo). Ogni asse porta i suoi verbi, il suo
  // vocabolario, le sue formule, il suo posto, i suoi accessori: da dati, centinaia di ruoli diversi (il Cardinale delle Cozze, l'Oracolo
  // della Multa, il Guaritore delle Ciabatte, il Padrino del Molo, l'Ambasciatore Cosmico dei Bulloni…).
  const FAMIGLIE = US.FAMIGLIE = [
    { k: 'religione', re: /Cardinal|Monsignor|Vescov|Priore|Priora|Badessa|Abate|Venerabile|Patriarca|Protonotari|Beat[oa]|Parroc|Madre Superiora/, mock: [['il Cardinale', 'la Badessa'], ['il Monsignore', 'la Priora'], ['il Vescovo', 'la Madre Superiora'], ['il Parroco', 'la Beata']], voc: ['indulgenza', 'processione', 'novena', 'reliquia', 'sagrestia', 'acquasantiera', 'penitenza', 'pellegrinaggio', 'cero', 'incenso', 'benedizione', 'campanile', 'chierichetto', 'questua'], atti: ['predica', 'benedici', 'confessa'], posto: 'cappella', acc: ['fascia', 'mantello', 'collana'], reg: 'liturgico' },
    { k: 'militare', re: /Generale|Generalessa|Colonnell|Maresciall|Luogotenente|Caporal|Sergente/, mock: [['il Generale', 'la Generalessa'], ['il Colonnello', 'la Colonnella'], ['il Caporale', 'la Caporala']], voc: ['trincea', 'rancio', 'mostrina', 'adunata', 'ritirata', 'plotone', 'bivacco', 'gavetta', 'medaglia', 'avamposto', 'sentinella', 'manovra'], atti: ['passa_in_rassegna', 'addestra'], posto: 'palco', acc: ['fascia', 'elmetto'], reg: 'militare' },
    { k: 'marina', re: /Ammiragli|Capitan|Nostrom|Comandante|Mozzo/, mock: [['l\'Ammiraglio', 'l\'Ammiraglia'], ['il Capitano', 'la Capitana'], ['il Nostromo', 'la Nostroma']], voc: ['stiva', 'prua', 'poppa', 'scialuppa', 'ancora', 'bussola', 'sartiame', 'burrasca', 'ciurma', 'cambusa', 'boa', 'faro'], atti: ['dai_ordini', 'passa_in_rassegna'], posto: 'palco', acc: ['cappello_carta', 'fascia'], reg: 'militare' },
    { k: 'accademia', re: /Professor|Accademic|Dottor|Decan|Rettor/, mock: [['il Professore', 'la Professoressa'], ['il Dottore', 'la Dottoressa'], ['il Rettore', 'la Rettrice']], voc: ['tesi', 'bibliografia', 'seminario', 'esame', 'teorema', 'dispensa', 'sessione', 'lode', 'appunti', 'congresso', 'citazione', 'relatore'], atti: ['dai_lezione', 'interroga'], posto: 'cattedra', acc: ['occhiali', 'mantello'], reg: 'accademico' },
    { k: 'politica', re: /Sindac|Podestà|Console|Consoless|Prefett|Senator|Onorevol|Assessor/, mock: [['il Sindaco', 'la Sindaca'], ['l\'Onorevole', 'l\'Onorevole'], ['l\'Assessore', 'l\'Assessora']], voc: ['delibera', 'mozione', 'emendamento', 'scheda', 'urna', 'coalizione', 'rimpasto', 'quorum', 'mandato', 'giunta', 'promessa', 'tessera'], atti: ['tieni_comizio', 'tieni_assemblea'], posto: 'palco', acc: ['fascia'], reg: 'burocratico' },
    { k: 'legge', re: /Giudic|Pretor|Avvocat|Notai|Magistrat/, mock: [['il Giudice', 'la Giudice'], ['l\'Avvocato', 'l\'Avvocata'], ['il Notaio', 'la Notaia']], voc: ['sentenza', 'ricorso', 'codicillo', 'udienza', 'cavillo', 'appello', 'prescrizione', 'perizia', 'testimone', 'toga', 'rogito', 'clausola'], atti: ['sentenzia', 'interroga'], posto: 'cattedra', acc: ['mantello'], reg: 'legale' },
    { k: 'medicina', re: /Primari|Luminare|Guaritor|Speziale/, mock: [['il Primario', 'la Primaria'], ['il Luminare', 'la Luminare']], voc: ['ricetta', 'sciroppo', 'supposta', 'diagnosi', 'impacco', 'tisana', 'cerotto', 'ricovero', 'placebo', 'termometro', 'ambulatorio', 'cataplasma'], atti: ['visita', 'guarisci'], posto: 'cattedra', acc: ['camice'], reg: 'medico' },
    { k: 'sport', re: /Campion|Mister|Allenator/, mock: [['il Campione', 'la Campionessa'], ['il Mister', 'la Mister']], voc: ['fuorigioco', 'rigore', 'ritiro', 'panchina', 'traversa', 'spogliatoio', 'fischio', 'classifica', 'derby', 'moviola', 'contropiede', 'tribuna'], atti: ['allena', 'sfida'], posto: 'palco', acc: ['fascia', 'bandana'], reg: 'telecronaca' },
    { k: 'spettacolo', re: /Presentator|Showman|Divo|Diva|Soubrette|Stella/, mock: [['il Presentatore', 'la Soubrette'], ['il Divo', 'la Diva'], ['lo Showman', 'la Showgirl']], voc: ['applauso', 'sipario', 'ospite', 'sigla', 'gong', 'televoto', 'sketch', 'paillettes', 'tormentone', 'scaletta', 'pubblicità', 'ballerina'], atti: ['presenta', 'esibisciti'], posto: 'palco', acc: ['mantello', 'collana'], reg: 'tv' },
    { k: 'nobilta', re: /Baron|Conte\b|Contessa|Marches|Duca|Duchessa|Arciduc|Principe|Principessa|Dama|Visconte/, mock: [['il Barone', 'la Baronessa'], ['il Conte', 'la Contessa'], ['il Principe', 'la Principessa']], voc: ['blasone', 'feudo', 'stemma', 'vassallo', 'corte', 'dote', 'etichetta', 'lignaggio', 'castello', 'ballo', 'servitù', 'baciamano'], atti: ['dai_udienza', 'investi'], posto: 'cattedra', acc: ['coroncina', 'mantello'], reg: 'nobiliare' },
    { k: 'malavita', re: /Padrino|Madrina|Boss|Capobastone|Picciott|Squal/, mock: [['il Padrino', 'la Madrina'], ['il Boss', 'la Boss'], ['il Capobastone', 'la Capobastone']], voc: ['pizzo', 'sgarro', 'favore', 'famiglia', 'rispetto', 'ambasciata', 'affare', 'parola', 'sistemazione', 'zona', 'protezione', 'debito d\'onore'], atti: ['chiedi_rispetto', 'fai_favore'], posto: 'cattedra', acc: ['occhiali', 'collana'], reg: 'mafioso' },
    { k: 'scienza', re: /Scienziat|Inventor|Ingegner|Fisic|Chimic/, mock: [['lo Scienziato', 'la Scienziata'], ['l\'Inventore', 'l\'Inventrice'], ['l\'Ingegnere', 'l\'Ingegnera']], voc: ['esperimento', 'provetta', 'ipotesi', 'formula', 'prototipo', 'reattore', 'laboratorio', 'calibrazione', 'brevetto', 'molecola', 'equazione', 'collaudo'], atti: ['esperimento', 'inventa'], posto: 'cattedra', acc: ['occhiali', 'camice'], reg: 'accademico' },
    { k: 'burocrazia', re: /Ispettor|Ciambellan|Visir|Plenipotenziari|Protocoll|Funzionari|Capuffici/, mock: [['l\'Ispettore', 'l\'Ispettrice'], ['il Capufficio', 'la Capufficio'], ['il Funzionario', 'la Funzionaria']], voc: ['modulo', 'timbro', 'protocollo', 'marca da bollo', 'allegato', 'fascicolo', 'sportello', 'graduatoria', 'circolare', 'pratica', 'firma', 'ricevuta'], atti: ['proclama', 'timbra'], posto: 'cattedra', acc: ['occhiali', 'fascia'], reg: 'burocratico' },
    { k: 'commercio', re: /Mercant|Commendat|Bottegai|Magnate|Cavaliere del Lavoro/, mock: [['il Commendatore', 'la Commendatrice'], ['il Magnate', 'la Magnate'], ['il Mercante', 'la Mercantessa']], voc: ['saldo', 'sconto', 'fattura', 'scontrino', 'svendita', 'cambiale', 'listino', 'offerta', 'resto', 'bilancia', 'vetrina', 'affare'], atti: ['vendi_miracoli', 'fai_asta'], posto: 'palco', acc: ['collana', 'fascia'], reg: 'tv' },
    { k: 'occulto', re: /Mago|Maga|Veggent|Oracol|Sibilla|Stregon|Astrolog|Profet/, mock: [['il Mago', 'la Maga'], ['il Veggente', 'la Sibilla'], ['l\'Oracolo', 'l\'Oracolo'], ['il Profeta', 'la Profetessa']], voc: ['oroscopo', 'pendolo', 'aura', 'malocchio', 'tarocco', 'sfera', 'ascendente', 'presagio', 'talismano', 'luna calante', 'chakra', 'energia'], atti: ['vaticina', 'togli_malocchio'], posto: 'cappella', acc: ['mantello', 'collana', 'colapasta'], reg: 'newage' },
    { k: 'arte', re: /Artist|Poet|Pittor|Vate|Musa/, mock: [['il Vate', 'la Musa'], ['il Poeta', 'la Poetessa'], ['l\'Artista', 'l\'Artista']], voc: ['tela', 'ispirazione', 'avanguardia', 'verso', 'installazione', 'vernissage', 'pennellata', 'manifesto', 'performance', 'cornice', 'sonetto', 'astrazione'], atti: ['declama', 'esibisciti'], posto: 'palco', acc: ['bandana', 'fascia'], reg: 'newage' },
    { k: 'cucina', re: /Chef|Cuoc|Gran Mestolo|Pasticcer/, mock: [['lo Chef', 'la Chef'], ['il Gran Mestolo', 'la Gran Mestola']], voc: ['soffritto', 'ragù', 'mantecatura', 'sugo', 'impasto', 'brodo', 'frittura', 'sale grosso', 'forno', 'mestolo', 'scarpetta', 'tegame'], atti: ['cucina_per_tutti', 'benedici'], posto: 'cattedra', acc: ['colapasta', 'camice'], reg: 'tv' },
    { k: 'giornalismo', re: /Giornalist|Direttor|Inviat|Cronist|Redattor/, mock: [['il Direttore', 'la Direttrice'], ['l\'Inviato', 'l\'Inviata'], ['il Cronista', 'la Cronista']], voc: ['scoop', 'titolo', 'edizione', 'smentita', 'inchiesta', 'fonte', 'prima pagina', 'corsivo', 'rettifica', 'intervista', 'trafiletto', 'esclusiva'], atti: ['intervista', 'proclama'], posto: 'palco', acc: ['occhiali'], reg: 'tv' },
    { k: 'famiglia', re: /Matriarc|Patriarc|Capofamiglia|Nonna|Nonno/, mock: [['il Patriarca', 'la Matriarca'], ['il Capofamiglia', 'la Capofamiglia'], ['il Nonno di Tutti', 'la Nonna di Tutti']], voc: ['pranzo della domenica', 'dote', 'eredità', 'rimprovero', 'sugo', 'cognato', 'battesimo', 'tombola', 'credenza', 'centrino', 'lavatrice', 'cresima'], atti: ['rimprovera', 'cucina_per_tutti'], posto: 'cattedra', acc: ['mantello', 'collana'], reg: 'nobiliare' },
    { k: 'cosmo', re: /Alieno|Ambasciator|Astronaut|Extraterrestr|Cosmonaut|Contattist/, mock: [['l\'Ambasciatore Cosmico', 'l\'Ambasciatrice Cosmica'], ['il Contattista', 'la Contattista'], ['l\'Astronauta', 'l\'Astronauta']], voc: ['astronave', 'galassia', 'segnale', 'orbita', 'pianeta', 'raggio', 'antenna', 'teletrasporto', 'buco nero', 'cometa', 'satellite', 'frequenza'], atti: ['contatta_il_cosmo', 'vaticina'], posto: 'palco', acc: ['colapasta', 'mantello'], reg: 'newage' },
    { k: 'indagine', re: /Detective|Investigator|Segugi|Commissari/, mock: [['il Detective Olistico', 'la Detective Olistica'], ['il Commissario', 'la Commissaria'], ['il Segugio', 'la Segugia']], voc: ['indizio', 'pista', 'movente', 'alibi', 'sospettato', 'lente', 'deduzione', 'coincidenza', 'connessione', 'reperto', 'pedinamento', 'soffiata'], atti: ['indaga', 'interroga'], posto: 'cattedra', acc: ['occhiali', 'mantello'], reg: 'olistico' },
    { k: 'cavalleria', re: /Cavalier|Gran Croce|Gran Maestr|Custode/, mock: [['il Cavaliere', 'la Dama']], voc: ['investitura', 'giuramento', 'stendardo', 'torneo', 'onore', 'scudiero', 'spada', 'tavola rotonda', 'sigillo', 'motto', 'armatura', 'cerimonia'], atti: ['investi'], posto: 'cattedra', acc: ['fascia', 'mantello'], reg: 'nobiliare' },
  ];
  // le autorità: il modo di comandare (con i loro verbi e i loro titoli)
  const AUTORITA = US.AUTORITA = [
    { k: 'capo', t: ['il Capo', 'la Capa'], atti: [] }, { k: 'profeta', t: ['il Profeta', 'la Profetessa'], atti: ['vaticina'] }, { k: 'giudice', t: ['il Giudice Supremo', 'la Giudice Suprema'], atti: ['sentenzia'] },
    { k: 'guaritore', t: ['il Guaritore', 'la Guaritrice'], atti: ['guarisci'] }, { k: 'maestro', t: ['il Gran Maestro', 'la Gran Maestra'], atti: ['dai_lezione'] }, { k: 'campione', t: ['il Campione', 'la Campionessa'], atti: ['sfida'] },
    { k: 'guardiano', t: ['il Guardiano', 'la Guardiana'], atti: ['passa_in_rassegna'] }, { k: 'inventore', t: ['l\'Inventore', 'l\'Inventrice'], atti: ['inventa'] }, { k: 'oracolo', t: ['l\'Oracolo', 'l\'Oracolo'], atti: ['vaticina'] },
    { k: 'custode', t: ['il Custode', 'la Custode'], atti: ['benedici'] }, { k: 'messia', t: ['il Predestinato', 'la Predestinata'], atti: ['fai_miracolo'] },
  ];
  // «delle Triglie»: l'articolo sulla parola minuscola, poi la maiuscola al nome
  const ARTp = (w, t, pl) => { try { const L = LG(); if (L && L.art) { const r = L.art(w, t, pl ? { pl: true } : undefined); if (r) return r; } } catch (e) { } return ART(pl ? plN(w, gOgg(w)) : w, t); };
  const diCap = (w, pl) => ARTp(String(w).toLowerCase(), 'di', pl).replace(/(^|[\s'])([^\s']+)$/, (m, a, b) => a + cap1(b));
  const famDi = h => FAMIGLIE.find(F0 => F0.re.test(h)) || null;
  // quello che fa uno → il dominio del soprannome di scherno
  const FATTI_FAM = { prega: 'religione', fai_un_voto: 'religione', prega_per: 'religione', pesca: 'marina', nuota: 'marina', tuffati: 'marina', racconta_barzelletta: 'spettacolo', confida: 'occulto', come_facciamo: 'scienza', esibizione: 'spettacolo',
    comizio: 'politica', radunati: 'politica', manifesta: 'politica', raduno: 'politica', presidio_proposta: 'politica', offri_da_bere: 'nobilta', regalo: 'nobilta', abbraccia: 'famiglia', spazza: 'burocrazia', riordina_casa: 'burocrazia',
    pulisci: 'burocrazia', lancio: 'militare', botte: 'malavita', corri: 'sport', gioca_in_strada: 'sport', fai_da_paciere: 'legge', consola: 'medicina', fai_una_talea: 'scienza', mercanteggia: 'commercio', vende: 'commercio',
    mestiere_losco: 'malavita', spaccio: 'malavita', dipinge: 'arte', dipinge_muro: 'arte', canta: 'arte', fai_la_serenata: 'arte', cucina_in_strada: 'cucina', stendi_bucato: 'famiglia', sali_in_alto: 'cosmo', sbircia: 'indagine', origlia: 'indagine', fai_un_voto2: 'occulto' };
  const ATTI = US.ATTI = {
    predica: { w: 'fratelli!', d: 'ha predicato[ {luogo}]', inf: 'predicare', posa: 'discute', pitto: 'esclamativo' }, benedici: { w: 'benedico!', d: 'ha benedetto la gente[ {luogo}]', inf: 'benedire', posa: 'porge', pitto: 'mano' },
    confessa: { w: 'pentiti!', d: 'ha confessato chi passava[ {luogo}]', inf: 'confessare', posa: 'discute', pitto: 'fumetto' }, fai_miracolo: { w: 'miracolo!', d: 'ha fatto un miracolo[ {luogo}]', inf: 'fare un miracolo', posa: 'porge', pitto: 'esclamativo' },
    passa_in_rassegna: { w: 'attenti!', d: 'ha passato in rassegna la truppa[ {luogo}]', inf: 'passare in rassegna', posa: 'cammina', pitto: 'esclamativo' }, addestra: { w: 'un, due!', d: 'ha addestrato la truppa[ {luogo}]', inf: 'addestrare', posa: 'cammina', pitto: 'esclamativo' },
    dai_ordini: { w: 'issate!', d: 'ha dato gli ordini alla ciurma[ {luogo}]', inf: 'dare ordini', posa: 'discute', pitto: 'esclamativo' }, dai_lezione: { w: 'silenzio!', d: 'ha tenuto lezione[ {luogo}]', inf: 'dare lezione', posa: 'discute', pitto: 'fumetto' },
    interroga: { w: 'risponda!', d: 'ha interrogato chi passava[ {luogo}]', inf: 'interrogare', posa: 'discute', pitto: 'fumetto' }, tieni_comizio: { w: 'cittadini!', d: 'ha tenuto comizio[ {luogo}]', inf: 'tenere comizio', posa: 'discute', pitto: 'esclamativo' },
    tieni_assemblea: { w: 'si vota!', d: 'ha convocato l\'assemblea[ {luogo}]', inf: 'tenere assemblea', posa: 'discute', pitto: 'stretta' }, dai_udienza: { w: 'avanti!', d: 'ha dato udienza[ {luogo}]', inf: 'dare udienza', posa: 'discute', pitto: 'mano' },
    investi: { w: 'in ginocchio!', d: 'ha investito un nuovo cavaliere[ {luogo}]', inf: 'investire cavalieri', posa: 'porge', pitto: 'mano' }, proclama: { w: 'udite!', d: 'ha letto un proclama[ {luogo}]', inf: 'proclamare', posa: 'discute', pitto: 'esclamativo' },
    timbra: { w: 'timbrato!', d: 'ha timbrato tutto quello che c\'era[ {luogo}]', inf: 'timbrare', posa: 'porge', pitto: 'mano' }, visita: { w: 'dica trentatré!', d: 'ha visitato i malati[ {luogo}]', inf: 'visitare', posa: 'porge', pitto: 'mano' },
    guarisci: { w: 'guarisci!', d: 'ha guarito qualcuno, dice lui[ {luogo}]', inf: 'guarire', posa: 'porge', pitto: 'mano' }, sentenzia: { w: 'colpevole!', d: 'ha emesso una sentenza[ {luogo}]', inf: 'sentenziare', posa: 'discute', pitto: 'esclamativo' },
    allena: { w: 'forza!', d: 'ha allenato la squadra[ {luogo}]', inf: 'allenare', posa: 'cammina', pitto: 'esclamativo' }, sfida: { w: 'chi osa?', d: 'ha sfidato il quartiere[ {luogo}]', inf: 'sfidare', posa: 'discute', pitto: 'esclamativo' },
    presenta: { w: 'applausi!', d: 'ha presentato uno spettacolo[ {luogo}]', inf: 'presentare', posa: 'discute', pitto: 'esclamativo' }, esibisciti: { w: 'ta-dàn!', d: 'si è esibito[ {luogo}]', inf: 'esibirsi', posa: 'porge', pitto: 'esclamativo' },
    chiedi_rispetto: { w: 'rispetto', d: 'ha chiesto rispetto al quartiere[ {luogo}]', inf: 'chiedere rispetto', posa: 'discute', pitto: 'mano' }, fai_favore: { w: 'un favore', d: 'ha fatto un favore[ {luogo}]', inf: 'fare favori', posa: 'porge', pitto: 'mano' },
    esperimento: { w: 'eureka!', d: 'ha fatto un esperimento[ {luogo}]', inf: 'fare esperimenti', posa: 'porge', pitto: 'esclamativo' }, inventa: { w: 'brevetto!', d: 'ha inventato una cosa[ {luogo}]', inf: 'inventare', posa: 'porge', pitto: 'esclamativo' },
    vendi_miracoli: { w: 'occasione!', d: 'ha venduto miracoli in offerta[ {luogo}]', inf: 'vendere miracoli', posa: 'porge', pitto: 'moneta' }, fai_asta: { w: 'aggiudicato!', d: 'ha battuto un\'asta[ {luogo}]', inf: 'fare un\'asta', posa: 'discute', pitto: 'moneta' },
    vaticina: { w: 'vedo…', d: 'ha fatto una profezia[ {luogo}]', inf: 'profetizzare', posa: 'discute', pitto: 'fumetto' }, togli_malocchio: { w: 'via!', d: 'ha tolto il malocchio a qualcuno[ {luogo}]', inf: 'togliere il malocchio', posa: 'porge', pitto: 'mano' },
    declama: { w: 'o luna!', d: 'ha declamato versi[ {luogo}]', inf: 'declamare', posa: 'discute', pitto: 'fumetto' }, cucina_per_tutti: { w: 'a tavola!', d: 'ha cucinato per tutti[ {luogo}]', inf: 'cucinare per tutti', posa: 'porge', pitto: 'mano' },
    intervista: { w: 'una domanda!', d: 'ha intervistato i passanti[ {luogo}]', inf: 'intervistare', posa: 'discute', pitto: 'fumetto' }, rimprovera: { w: 'vergogna!', d: 'ha rimproverato il quartiere[ {luogo}]', inf: 'rimproverare', posa: 'discute', pitto: 'esclamativo' },
    contatta_il_cosmo: { w: 'pronto, universo?', d: 'ha cercato di parlare con gli alieni[ {luogo}]', inf: 'contattare il cosmo', posa: 'porge', pitto: 'fumetto' }, indaga: { w: 'tutto è collegato', d: 'ha indagato[ {luogo}]', inf: 'indagare', posa: 'cammina', pitto: 'fumetto' },
  };
  // LA VITA DI TUTTI I GIORNI: il comando è una famiglia fra tante. I più dei ruoli sono di quartiere, alla pari, fatti di relazioni:
  // l'amore (il fidanzato eterno, il casanova, il poeta col cuore rotto, il geloso, la sensale), la sorte (lo iettatore, il fortunato, la
  // chiromante, l'uomo dei numeri), gli strani (lo sfigato, quello che parte il mese prossimo, il filosofo del molo, lo zio del complotto,
  // il collezionista, l'inventore mancato), la cura (la mamma di tutti, la gattara, l'infermiera del quartiere), la passione (la band del
  // garage, il ballerino, la cuoca, il pescatore di storie, il campione di scopa, il telecronista del bar, il pittore della domenica,
  // l'ortolano), la compagnia (il pettegolo, il burlone, l'amico di tutti, il paciere, l'ospite fisso, quello che paga sempre, lo
  // scroccone), la memoria (com'era una volta, il custode delle foto). L'etichetta è affettuosa, pietosa o invidiosa (tono); chi la abbraccia
  // fa cose sue (la serenata, i numeri dal sogno, la collezione sulla soglia, la prova della band, la pesca che cresce a ogni racconto, il
  // torneo di scopa) e i suoi posti sono piccoli e di casa (la panchina, il tavolino delle carte, l'angolo delle prove, la ciotola dei gatti,
  // l'altarino delle foto, l'orto, il banco da lavoro, la pista con le luci). Il motore sono le relazioni: le cotte, le gelosie, le scommesse
  // coi debiti d'onore, le paci fatte, i triangoli del pettegolezzo; e i fatti nuovi (la serenata, il fidanzamento, la scommessa, la iella,
  // la cena, il concerto) fanno anche parole coniate e folklore.
  const QUOT = [
    { k: 'amore', reg: 'amoroso', voc: ['bacio', 'serenata', 'balcone', 'sospiro', 'appuntamento', 'anello', 'gelosia', 'chitarra', 'cuore', 'lettera', 'rosa', 'luna'], tipi: [
      { t: ['il Fidanzato Eterno', 'la Fidanzata Eterna'], atti: ['serenata', 'lettera_d_amore'], posto: 'panchina', acc: ['fascia', 'collana'], tono: 'pieta' },
      { t: ['il Casanova', 'la Rubacuori'], atti: ['serenata', 'corteggia'], posto: 'panchina', acc: ['collana'], tono: 'invidia' },
      { t: ['il Poeta col Cuore Rotto', 'la Poetessa col Cuore Rotto'], atti: ['lettera_d_amore', 'declama'], posto: 'panchina', acc: ['mantello'], tono: 'pieta' },
      { t: ['il Geloso', 'la Gelosa'], atti: ['corteggia', 'sorveglia_il_balcone'], posto: 'panchina', acc: ['occhiali'], tono: 'pieta' },
      { t: ['il Sensale', 'la Sensale'], atti: ['combina_coppie'], posto: 'tavolino', acc: ['fascia'], tono: 'affetto' }] },
    { k: 'sorte', reg: 'superstizione', voc: ['corno', 'ferro', 'numero', 'schedina', 'sogno', 'gatto nero', 'specchio', 'sale', 'smorfia', 'quaterna', 'ambo', 'quadrifoglio'], tipi: [
      { t: ['lo Iettatore', 'la Iettatrice'], atti: ['passeggia_e_basta'], posto: 'panchina', acc: ['occhiali'], tono: 'paura', ietta: 1 },
      { t: ['il Fortunato', 'la Fortunata'], atti: ['scommetti', 'tocca_per_fortuna'], posto: 'tavolino', acc: ['coroncina'], tono: 'invidia' },
      { t: ['il Chiromante', 'la Chiromante'], atti: ['leggi_la_mano', 'vaticina'], posto: 'altarino', acc: ['bandana', 'collana'], tono: 'affetto' },
      { t: ['l\'Uomo dei Numeri', 'la Donna dei Numeri'], atti: ['dai_i_numeri', 'scommetti'], posto: 'tavolino', acc: ['cappello_carta'], tono: 'affetto' }] },
    { k: 'strani', reg: 'filosofico', voc: ['progetto', 'valigia', 'biglietto', 'teoria', 'scatola', 'vite', 'prototipo', 'universo', 'destino', 'collezione', 'scoperta', 'idea'], tipi: [
      { t: ['lo Sfigato', 'la Sfigata'], atti: ['tenta_la_sorte'], posto: 'panchina', acc: ['bandana'], tono: 'pieta' },
      { t: ['quello che Parte il Mese Prossimo', 'quella che Parte il Mese Prossimo'], atti: ['prepara_la_partenza'], posto: 'panchina', acc: ['cappello_carta'], tono: 'pieta' },
      { t: ['il Filosofo del Molo', 'la Filosofa del Molo'], atti: ['filosofeggia'], posto: 'panchina', acc: ['occhiali'], tono: 'affetto' },
      { t: ['lo Zio del Complotto', 'la Zia del Complotto'], atti: ['spiega_il_complotto'], posto: 'tavolino', acc: ['cappello_carta'], tono: 'pieta', reg: 'olistico' },
      { t: ['il Collezionista', 'la Collezionista'], atti: ['colleziona', 'mostra_la_collezione'], posto: 'banco_lavoro', acc: ['occhiali'], tono: 'pieta' },
      { t: ['l\'Inventore Mancato', 'l\'Inventrice Mancata'], atti: ['inventa', 'collauda'], posto: 'banco_lavoro', acc: ['occhiali', 'elmetto'], tono: 'affetto' }] },
    { k: 'cura', reg: 'affettuoso', voc: ['minestra', 'brodo', 'coperta', 'gatto', 'ciotola', 'cerotto', 'sciarpa', 'termos', 'torta', 'pentola', 'carezza', 'tisana'], tipi: [
      { t: ['il Papà di Tutti', 'la Mamma di Tutti'], atti: ['cucina_per_tutti', 'consola_tutti'], posto: 'tavolino', acc: ['camice'], tono: 'affetto' },
      { t: ['il Gattaro', 'la Gattara'], atti: ['dai_da_mangiare_ai_gatti'], posto: 'gatti', acc: ['mantello'], tono: 'affetto' },
      { t: ['l\'Infermiere del Quartiere', 'l\'Infermiera del Quartiere'], atti: ['cura_il_quartiere'], posto: 'tavolino', acc: ['camice'], tono: 'affetto' }] },
    { k: 'passione', reg: 'chiacchiera', voc: ['chitarra', 'amplificatore', 'canzone', 'tango', 'sugo', 'canna da pesca', 'esca', 'mazzo di carte', 'boccia', 'pennello', 'zucchina', 'radiolina'], tipi: [
      { t: ['il Chitarrista del Garage', 'la Cantante del Garage'], atti: ['prova_con_la_band', 'suona_in_strada'], posto: 'angolo_prove', acc: ['bandana'], tono: 'affetto' },
      { t: ['il Ballerino', 'la Ballerina'], atti: ['balla_in_strada'], posto: 'pista', acc: ['fascia', 'collana'], tono: 'invidia' },
      { t: ['il Cuoco del Vicolo', 'la Cuoca del Vicolo'], atti: ['cucina_per_tutti'], posto: 'tavolino', acc: ['colapasta', 'camice'], tono: 'affetto' },
      { t: ['il Pescatore di Storie', 'la Pescatrice di Storie'], atti: ['racconta_la_pesca'], posto: 'panchina', acc: ['cappello_carta'], tono: 'affetto', reg: 'chiacchiera' },
      { t: ['il Campione di Scopa', 'la Campionessa di Bocce'], atti: ['torneo_di_carte', 'sfida'], posto: 'tavolino', acc: ['coroncina'], tono: 'invidia' },
      { t: ['il Telecronista del Bar', 'la Telecronista del Bar'], atti: ['fai_la_telecronaca'], posto: 'tavolino', acc: ['fascia'], tono: 'affetto', reg: 'telecronaca' },
      { t: ['il Pittore della Domenica', 'la Pittrice della Domenica'], atti: ['dipingi_dal_vero'], posto: 'banco_lavoro', acc: ['bandana'], tono: 'affetto' },
      { t: ['l\'Ortolano del Cortile', 'l\'Ortolana del Cortile'], atti: ['coltiva_l_orto'], posto: 'orto', acc: ['cappello_carta'], tono: 'affetto' }] },
    { k: 'compagnia', reg: 'chiacchiera', voc: ['giro', 'caffè', 'scherzo', 'segreto', 'amicizia', 'brindisi', 'conto', 'invito', 'pacca', 'favore', 'spritz', 'tavolata'], tipi: [
      { t: ['il Pettegolo', 'la Pettegola'], atti: ['spettegola'], posto: 'panchina', acc: ['occhiali'], tono: 'affetto' },
      { t: ['il Burlone', 'la Burlona'], atti: ['fai_uno_scherzo'], posto: 'panchina', acc: ['cappello_carta'], tono: 'affetto' },
      { t: ['l\'Amico di Tutti', 'l\'Amica di Tutti'], atti: ['offri_un_giro'], posto: 'tavolino', acc: ['fascia'], tono: 'affetto' },
      { t: ['il Paciere', 'la Paciera'], atti: ['fai_fare_pace'], posto: 'panchina', acc: ['fascia'], tono: 'affetto' },
      { t: ['l\'Ospite Fisso', 'l\'Ospite Fissa'], atti: ['autoinvitati'], posto: 'tavolino', acc: ['collana'], tono: 'pieta' },
      { t: ['quello che Paga Sempre', 'quella che Paga Sempre'], atti: ['offri_un_giro'], posto: 'tavolino', acc: ['collana'], tono: 'invidia' },
      { t: ['lo Scroccone', 'la Scroccona'], atti: ['scrocca_da_bere'], posto: 'tavolino', acc: ['bandana'], tono: 'pieta' }] },
    { k: 'memoria', reg: 'nostalgico', voc: ['foto', 'album', 'lira', 'cinema', 'juke-box', 'tram', 'cartolina', 'ricordo', 'balera', 'gelateria', 'mangiadischi', 'filobus'], tipi: [
      { t: ['quello di Una Volta', 'quella di Una Volta'], atti: ['ricorda_com_era'], posto: 'panchina', acc: ['occhiali'], tono: 'affetto' },
      { t: ['il Custode delle Foto', 'la Custode delle Foto'], atti: ['mostra_le_foto'], posto: 'altarino', acc: ['occhiali'], tono: 'affetto' }] },
  ];
  for (const Q of QUOT) FAMIGLIE.push(Object.assign(Q, { quot: 1, re: /(?!)/, mock: Q.tipi.map(x => x.t), atti: [...new Set([].concat(...Q.tipi.map(x => x.atti)))], posto: Q.tipi[0].posto, acc: [...new Set([].concat(...Q.tipi.map(x => x.acc)))] }));
  const POTERE = FAMIGLIE.filter(x => !x.quot);
  // quello che fa uno → l'archetipo di quartiere [famiglia, tipo] (la iella da chi è vicino a un guasto, il pettegolo da chi chiacchiera…)
  const FATTI_Q = { guasto: ['sorte', 0], si_rompe: ['sorte', 0], cade: ['strani', 0], comica: ['strani', 0], figuraccia: ['strani', 0], chiacchiera: ['compagnia', 0], confida: ['compagnia', 2], abbraccia: ['amore', 1], regalo: ['amore', 0],
    offri_da_bere: ['compagnia', 5], prestito: ['compagnia', 6], saldato: ['compagnia', 5], consola: ['cura', 0], pesca: ['passione', 3], beve: ['compagnia', 4], racconta_barzelletta: ['compagnia', 1], fai_da_paciere: ['compagnia', 3],
    gioca_in_strada: ['passione', 4], prega: ['sorte', 2], fai_un_voto: ['sorte', 3], esibizione: ['passione', 0], canta: ['passione', 0], dipinge: ['passione', 6], fai_una_talea: ['passione', 7], cucina_in_strada: ['passione', 2],
    vende: ['strani', 4], sali_in_alto: ['strani', 1], fai_la_serenata: ['amore', 0], come_facciamo: ['strani', 5], lancio: ['strani', 5], multa: ['strani', 0], fermato: ['strani', 3], riordina_casa: ['memoria', 1], spazza: ['cura', 1],
    siediti: ['memoria', 0], aspetta: ['amore', 0], corri: ['passione', 1], nuota: ['passione', 3], tuffati: ['strani', 1], scommessa: ['sorte', 1], serenata: ['amore', 3], cena: ['cura', 0], concerto: ['passione', 0], pettegolezzo: ['compagnia', 0] };
  const Q_ATTI = {
    serenata: { w: 'o sole mio!', d: 'ha fatto una serenata sotto un balcone[ {luogo}]', inf: 'fare la serenata', posa: 'porge', pitto: 'cuore' }, lettera_d_amore: { w: 'cara…', d: 'ha scritto una lettera d\'amore[ {luogo}]', inf: 'scrivere lettere d\'amore', posa: 'discute', pitto: 'cuore' },
    corteggia: { w: 'ciao bella', d: 'ha fatto il filo a qualcuno[ {luogo}]', inf: 'fare il filo', posa: 'discute', pitto: 'cuore' }, sorveglia_il_balcone: { w: 'chi è quello?', d: 'ha sorvegliato un balcone per gelosia[ {luogo}]', inf: 'sorvegliare il balcone', posa: 'aspetta', pitto: 'fumetto' },
    combina_coppie: { w: 'siete fatti l\'uno per l\'altra', d: 'ha combinato una coppia[ {luogo}]', inf: 'combinare coppie', posa: 'porge', pitto: 'cuore' }, passeggia_e_basta: { w: '…', d: 'è passato di lì, e la gente ha toccato ferro[ {luogo}]', inf: 'passeggiare e basta', posa: 'cammina', pitto: 'fumetto' },
    scommetti: { w: 'scommettiamo?', d: 'ha fatto una scommessa[ {luogo}]', inf: 'scommettere', posa: 'porge', pitto: 'moneta' }, tocca_per_fortuna: { w: 'porta bene!', d: 'si è fatto toccare per fortuna[ {luogo}]', inf: 'farsi toccare per fortuna', posa: 'porge', pitto: 'mano' },
    leggi_la_mano: { w: 'vedo un viaggio', d: 'ha letto la mano a qualcuno[ {luogo}]', inf: 'leggere la mano', posa: 'porge', pitto: 'mano' }, dai_i_numeri: { w: 'il 47, il 90…', d: 'ha dato i numeri del sogno[ {luogo}]', inf: 'dare i numeri', posa: 'discute', pitto: 'moneta' },
    tenta_la_sorte: { w: 'stavolta sì', d: 'ha tentato la sorte, e gli è andata male[ {luogo}]', inf: 'tentare la sorte', posa: 'porge', pitto: 'moneta' }, prepara_la_partenza: { w: 'il mese prossimo parto', d: 'ha annunciato che parte il mese prossimo[ {luogo}]', inf: 'preparare la partenza', posa: 'discute', pitto: 'freccia' },
    filosofeggia: { w: 'la vita, vedi…', d: 'ha filosofeggiato[ {luogo}]', inf: 'filosofeggiare', posa: 'siede', pitto: 'fumetto' }, spiega_il_complotto: { w: 'è tutto collegato', d: 'ha spiegato il complotto[ {luogo}]', inf: 'spiegare il complotto', posa: 'discute', pitto: 'fumetto' },
    colleziona: { w: 'questo mi manca!', d: 'ha aggiunto un pezzo alla collezione[ {luogo}]', inf: 'collezionare', posa: 'porge', pitto: 'mano' }, mostra_la_collezione: { w: 'guarda qua', d: 'ha mostrato la collezione[ {luogo}]', inf: 'mostrare la collezione', posa: 'porge', pitto: 'mano' },
    collauda: { w: 'tre, due, uno…', d: 'ha collaudato un\'invenzione[ {luogo}]', inf: 'collaudare', posa: 'porge', pitto: 'ingranaggio' }, consola_tutti: { w: 'su, su', d: 'ha consolato chi passava[ {luogo}]', inf: 'consolare', posa: 'porge', pitto: 'cuore' },
    dai_da_mangiare_ai_gatti: { w: 'micio micio', d: 'ha dato da mangiare ai gatti[ {luogo}]', inf: 'dare da mangiare ai gatti', posa: 'porge', pitto: 'forchetta' }, cura_il_quartiere: { w: 'fammi vedere', d: 'ha medicato mezzo quartiere[ {luogo}]', inf: 'curare il quartiere', posa: 'porge', pitto: 'mano' },
    prova_con_la_band: { w: 'un, due, tre, quattro!', d: 'ha fatto le prove con la band[ {luogo}]', inf: 'fare le prove con la band', posa: 'porge', pitto: 'esclamativo' }, suona_in_strada: { w: 'tlin tlon', d: 'ha suonato in strada[ {luogo}]', inf: 'suonare in strada', posa: 'porge', pitto: 'esclamativo' },
    balla_in_strada: { w: 'e uno, e due', d: 'ha ballato in strada[ {luogo}]', inf: 'ballare', posa: 'cammina', pitto: 'cuore' }, racconta_la_pesca: { w: 'era grosso così', d: 'ha raccontato la pesca, più grossa dell\'ultima volta[ {luogo}]', inf: 'raccontare la pesca', posa: 'discute', pitto: 'amo' },
    torneo_di_carte: { w: 'scopa!', d: 'ha fatto il torneo di carte[ {luogo}]', inf: 'fare il torneo di carte', posa: 'siede', pitto: 'moneta' }, fai_la_telecronaca: { w: 'gooool!', d: 'ha fatto la telecronaca di tutto[ {luogo}]', inf: 'fare la telecronaca', posa: 'discute', pitto: 'esclamativo' },
    dipingi_dal_vero: { w: 'fermo così', d: 'ha dipinto dal vero[ {luogo}]', inf: 'dipingere dal vero', posa: 'porge', pitto: 'pennello' }, coltiva_l_orto: { w: 'guarda che zucchine', d: 'ha curato l\'orto[ {luogo}]', inf: 'coltivare l\'orto', posa: 'porge', pitto: 'mano' },
    spettegola: { w: 'lo sai che…', d: 'ha sparso un pettegolezzo[ {luogo}]', inf: 'spettegolare', posa: 'discute', pitto: 'fumetto' }, fai_uno_scherzo: { w: 'ci sei cascato!', d: 'ha fatto uno scherzo[ {luogo}]', inf: 'fare scherzi', posa: 'porge', pitto: 'esclamativo' },
    offri_un_giro: { w: 'offro io!', d: 'ha offerto un giro a tutti[ {luogo}]', inf: 'offrire un giro', posa: 'porge', pitto: 'bicchiere' }, fai_fare_pace: { w: 'datevi la mano', d: 'ha fatto fare pace a due[ {luogo}]', inf: 'far fare pace', posa: 'porge', pitto: 'stretta' },
    autoinvitati: { w: 'passavo di qui', d: 'si è autoinvitato a cena[ {luogo}]', inf: 'autoinvitarsi', posa: 'discute', pitto: 'forchetta' }, scrocca_da_bere: { w: 'me ne offri uno?', d: 'ha scroccato da bere[ {luogo}]', inf: 'scroccare', posa: 'porge', pitto: 'bicchiere' },
    ricorda_com_era: { w: 'una volta…', d: 'ha raccontato com\'era una volta[ {luogo}]', inf: 'ricordare com\'era', posa: 'siede', pitto: 'fumetto' }, mostra_le_foto: { w: 'guarda questa', d: 'ha mostrato le foto a chiunque[ {luogo}]', inf: 'mostrare le foto', posa: 'porge', pitto: 'mano' },
  };
  Object.assign(ATTI, Q_ATTI);
  const tipoQ = R => { const F0 = FAMIGLIE.find(x => x.k === R.fam); return F0 && F0.quot && F0.tipi[R.tq || 0] || null; };
  // i posti di casa: con le cose che ci sono (sedie, tavolo, casse, vasi), poggiate a terra
  const POSTI_Q = { panchina: [['sedia', -.5, 0, 0], ['sedia', 0, 0, 0], ['sedia', .5, 0, 0], ['vaso', 1.05, 0, 0]], tavolino: [['tavolo', 0, 0, 0], ['sedia', 0, .75, Math.PI], ['sedia', 0, -.75, 0], ['sedia', .75, 0, Math.PI / 2], ['sedia', -.75, 0, -Math.PI / 2]],
    angolo_prove: [['cassa', -.8, 0, 0], ['cassa', .8, 0, 0], ['cassa', 0, .8, 0], ['sedia', -.3, -.6, 0], ['sedia', .3, -.6, 0]], gatti: [['vaso', -.4, 0, 0], ['vaso', .4, 0, 0], ['cassa', 0, .7, 0]],
    altarino: [['cassa', 0, 0, 0], ['vaso', -.55, 0, 0], ['vaso', .55, 0, 0], ['sedia', 0, -.9, Math.PI]], orto: [['vaso', -.5, -.5, 0], ['vaso', .5, -.5, 0], ['vaso', -.5, .5, 0], ['vaso', .5, .5, 0], ['cassa', 1.2, 0, 0]],
    banco_lavoro: [['tavolo', 0, 0, 0], ['cassa', .85, 0, 0], ['sedia', 0, -.75, 0]], pista: [['vaso', -1.4, -1.4, 0], ['vaso', 1.4, -1.4, 0], ['vaso', -1.4, 1.4, 0], ['vaso', 1.4, 1.4, 0], ['sedia', 0, 2, Math.PI], ['sedia', .6, 2, Math.PI]] };
  const POSTI_N = { panchina: ['la Panchina', 'la Panca'], tavolino: ['il Tavolino', 'il Tavolo delle Carte'], angolo_prove: ['l\'Angolo delle Prove', 'la Sala Prove'], gatti: ['la Ciotola dei Gatti', 'il Ristorante dei Gatti'], altarino: ['l\'Altarino delle Foto', 'l\'Angolo dei Ricordi'],
    orto: ['l\'Orto', 'l\'Orticello'], banco_lavoro: ['il Banco da Lavoro', 'l\'Officina'], pista: ['la Pista da Ballo', 'la Balera'] };
  // i riti contro lo iettatore: lo fanno gli altri, intorno a lui
  const RITI = ['Tocca ferro, tocca ferro!', '(fa le corna in tasca)', 'Attraversiamo, attraversiamo.', 'Non guardarlo negli occhi!', 'Chi ha il sale? Il sale!', 'Corna, bicorna, capa d\'aglio…', 'Io torno domani. Per sicurezza.', 'Gira la sedia, gira la sedia!'];
  // le relazioni che un atto di quartiere muove: la cotta, la gelosia, la scommessa col debito d'onore, la pace, il pettegolezzo, la cena, il concerto
  function relazioni(st, R, f, pub) {
    const a = f.v, n = npc(st, R.id), altri = pub.filter(p => p !== R.id), x = altri[Math.floor(rnd() * altri.length)], y = altri.find(p => p !== x), nm = i => nomeDi(st, i), g = sesso(st, R.id) === 'f' ? 'a' : 'o';
    const sc = (v, chi, d) => { stats.rel = stats.rel || {}; stats.rel[v] = (stats.rel[v] || 0) + 1; scriviF(st, v, chi, d, f.id, { dove: [n.x, n.y] }); };
    if (/serenata|lettera_d_amore|corteggia/.test(a)) {
      if (!R.amato || !npc(st, R.amato)) { const c = st.npcs.filter(k => k.pop && !k.cop && !k.grigio && k.id !== R.id && k.pop.sex !== (n.pop && n.pop.sex) && Math.abs((k.pop.age || 30) - ((n.pop && n.pop.age) || 30)) < 15); const k = c[Math.floor(hashS(R.id + 'amato') * c.length)]; R.amato = k ? k.id : null; }
      if (!R.amato) return; const r = rnd();
      if (r < .2 && !R.sposo) { R.sposo = R.amato; sc('fidanzamento', [R.id, R.amato], `${nm(R.id)} e ${nm(R.amato)} si sono fidanzati, dopo la ${a === 'serenata' ? 'serenata' : 'lettera'} numero ${R.atti}`); storiaR(st, R.id, 'amore', `${nm(R.id)} e ${nm(R.amato)}: sì!`); }
      else if (r < .55) { sc('due_di_picche', [R.id, R.amato], `${nm(R.amato)} ha chiuso la finestra in faccia a ${nm(R.id)}. Di nuovo`); R.int = Math.min(1, R.int + .05); }
      else if (x && x !== R.amato) sc('gelosia', [x, R.id], `${nm(x)} è gelos${sesso(st, x) === 'f' ? 'a' : 'o'} della ${a === 'serenata' ? 'serenata' : 'lettera'} di ${nm(R.id)} a ${nm(R.amato)}`);
    } else if (a === 'combina_coppie' && x && y) sc('coppia_combinata', [x, y, R.id], `${nm(R.id)} ha deciso che ${nm(x)} e ${nm(y)} sono fatti l'uno per l'altra. Loro non lo sanno ancora`);
    else if (/scommetti|dai_i_numeri|torneo_di_carte|sfida|tenta_la_sorte/.test(a) && x) { const vince = rnd() < (a === 'tenta_la_sorte' ? .1 : .5); sc('scommessa', [vince ? R.id : x, vince ? x : R.id], `${nm(vince ? x : R.id)} ha perso ${rp(['una scommessa', 'a scopa', 'sui numeri', 'una cena'])} con ${nm(vince ? R.id : x)}: debito d'onore, ${rp(['una cena', 'un giro per tutti', 'due caffè', 'la faccia'])}`); }
    else if (a === 'fai_fare_pace' && x && y) sc('pace', [x, y, R.id], `${nm(x)} e ${nm(y)} hanno fatto pace, grazie a ${nm(R.id)}. Per ora`);
    else if (a === 'spettegola' && x && y) sc('pettegolezzo', [R.id, x, y], `${nm(R.id)} ha messo in giro che ${nm(x)} e ${nm(y)} ${rp(['si vedono di nascosto', 'non si parlano più', 'hanno vinto al lotto', 'litigano per un vaso'])}`);
    else if (/cucina_per_tutti|consola_tutti|dai_da_mangiare|autoinvitati|offri_un_giro/.test(a)) sc('cena', [R.id].concat(altri.slice(0, 4)), `${nm(R.id)} ${a === 'autoinvitati' ? 'si è presentat' + g + ' a cena da ' + (x ? nm(x) : 'qualcuno') : a === 'offri_un_giro' ? 'ha offerto da bere a tutti' : 'ha dato da mangiare a mezzo vicolo'}`);
    else if (/prova_con_la_band|suona_in_strada|balla_in_strada/.test(a)) sc('concerto', [R.id].concat(altri.slice(0, 4)), `${nm(R.id)} ${a === 'balla_in_strada' ? 'ha ballato' : 'ha suonato'} ${rnd() < .5 ? 'e il vicolo ha ballato' : 'e un vicino ha chiamato i Grigi'}`);
    else if (/inventa|collauda/.test(a) && rnd() < .45) sc('invenzione', [R.id], `L'invenzione di ${nm(R.id)} ${rp(['è esplosa', 'ha preso fuoco', 'è volata sul tetto', 'ha funzionato al contrario'])}`);
    else if (a === 'colleziona') { R.coll = (R.coll || 0) + 1 + Math.floor(rnd() * 4); if (R.coll % 5 < 2) storiaR(st, R.id, 'collezione', `la collezione di ${nm(R.id)} sulla soglia: ${R.coll} pezzi, e la porta non si chiude più`); }
    else if (a === 'racconta_la_pesca') { R.kg = Math.round(((R.kg || 3) * (1.3 + rnd() * .5)) * 10) / 10; if (R.kg > 30 && rnd() < .3) storiaR(st, R.id, 'pesca', `il pesce di ${nm(R.id)} adesso pesa ${R.kg} chili`); }
    else if (/mostra_le_foto|ricorda_com_era/.test(a) && x) sc('ricordo', [R.id, x], `${nm(R.id)} ha fatto vedere a ${nm(x)} ${rp(['le foto della comunione', 'il molo com\'era', 'la balera prima del parcheggio', 'il nonno col baffo'])}`);
  }
  function riti(st, n) {
    for (const k of st.npcs) { if (k === n || !k.pop || k.cop || k.grigio || k.dead || k.inside || Math.hypot(k.x - n.x, k.y - n.y) > 7 || rnd() > .2) continue;
      stats.riti = (stats.riti || 0) + 1; if (RISPOSTE.length < 4) RISPOSTE.push([(st.clock || 0) + 1 + rnd() * 2, k.id, rp(RITI), n.id]);
      if (rnd() < .35) { k.fleeFrom = { x: n.x, y: n.y }; stats.ritiFuga = (stats.ritiFuga || 0) + 1; } }
  }
  US.QUOT = QUOT;
  function R0(st) { const s = S(st); return s.ruoli || (s.ruoli = { eti: {}, R: {}, n: 0, posti: {} }); }
  // le carte dei verbi nuovi: compilate come quelle di unico_vocabolario (Verbo.registra), con l'effetto «ruolo» che i desideri leggono
  (function carte() {
    const UVo = typeof UnicoVocabolario !== 'undefined' && UnicoVocabolario.ON ? UnicoVocabolario : null, V = VB(); if (!UVo || !UVo.CARTE || !UVo._ || !UVo._.compila || !V) return;
    const UD = typeof UnicoDesideri !== 'undefined' && UnicoDesideri.ON ? UnicoDesideri : null;
    for (const k in ATTI) { const a = ATTI[k], eff = 'v:ruolo_' + k;
      if (!V.EFF[eff]) V.EFF[eff] = (c) => { try { const r = R0(c.st).R[c.A.id]; if (r) { r.fatti = r.fatti || {}; r.fatti[k] = Math.round(c.st.t); } } catch (e) { } };
      if (V.SCHEDE[k]) continue;
      UVo.CARTE[k] = { f: 'sociali', dove: 'qui', eff: [['raduna', null], ['pubblico', .25], ['ruolo_' + k]], min: 25, posa: a.posa, pitto: a.pitto, w: a.w, fatto: k, d: a.d, inf: a.inf, p: .9, g: 'figuraccia', modi: ['teatrale', 'in_pubblico'], gz: .4, n: [a.inf, a.inf] };
      try { UVo._.compila(k, UVo.CARTE[k]); } catch (e) { }
      if (UD && UD.EFFV) UD.EFFV[eff] = [['ruolo', 1, 'io', k]];
    }
    if (UD && UD.Var) UD.Var.dichiara({ k: 'ruolo', per: 'atto', scala: [0, 1], vis: 1, leggi: (st, id, atto) => { const r = st.u && st.u.strada && st.u.strada.ruoli && st.u.strada.ruoli.R[id]; return r && r.fatti && r.fatti[atto] && st.t - r.fatti[atto] < 720 ? 1 : 0; } });
  })();
  // i posti dei ruoli: ricette come dati (UnicoParti), la cappella di bancali col tetto di telo e i lumini, la cattedra coi banchi
  (function posti() {
    const UCo0 = UCo(), UP = UCo0 && UCo0.UP; if (!UP || !UP.GEN || !UP.TIPI) return;
    const h = (k, dz) => { const P = UP.PARTI[k]; return P ? P.d ? P.d[2] / 2 : (dz || .3) : (dz || .3); };
    const part = (k, x, y, z, yaw, pitch, roll, L, D) => [k, Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000, Math.round(z * 1000) / 1000, yaw || 0, pitch || 0, roll || 0, L || 0, D || 0];
    if (!UP.GEN.cappella) UP.GEN.cappella = (r, o) => {
      const g = UP.GEN.riparo(r, Object.assign({}, o, { larg: 3 })), L = g.parti.slice(), fy = -1.0 - 1.15;   // la baracca è la cappella; davanti l'altare e i banchi
      L.push(part('cassa', 0, fy, .302)); L.push(part('vaso', -.62, fy, .352)); L.push(part('vaso', .62, fy, .352));
      for (let i = 0; i < 3; i++) L.push(part('sedia', -.9 + i * .9, fy - 1.3, .432, Math.PI));
      return { parti: L, meta: Object.assign({}, g.meta) };
    };
    if (!UP.GEN.cattedra) UP.GEN.cattedra = (r, o) => {
      const L = [part('tavolo', 0, 0, .377), part('sedia', 0, .75, .432)];
      for (let i = 0; i < 4; i++) L.push(part('sedia', -1.35 + i * .9, -1.6, .432, Math.PI));
      if (r() < .6) L.push(part('cassa', 1.2, .2, .302));
      return { parti: L, meta: { davanti: [0, -1] } };
    };
    UP.TIPI.cappella = UP.TIPI.cappella || { gen: 'cappella', eff: 'riparo' }; UP.TIPI.cattedra = UP.TIPI.cattedra || { gen: 'cattedra', eff: null };
    const H0 = { sedia: .432, tavolo: .377, cassa: .302, vaso: .352 }, NQ = { panchina: ['una panchina', 'panchina'], tavolino: ['un tavolino', 'tavolino'], angolo_prove: ['un angolo per le prove', 'angolo delle prove'], gatti: ['un posto per i gatti', 'posto dei gatti'],
      altarino: ['un altarino', 'altarino'], orto: ['un orto', 'orto'], banco_lavoro: ['un banco da lavoro', 'banco da lavoro'], pista: ['una pista da ballo', 'pista da ballo'] };
    for (const k in POSTI_Q) { if (!UP.GEN[k]) UP.GEN[k] = () => ({ parti: POSTI_Q[k].map(q => part(q[0], q[1], q[2], H0[q[0]], q[3])), meta: { davanti: [0, -1] } }); UP.TIPI[k] = UP.TIPI[k] || { gen: k, eff: null }; if (UCo0.NOME) UCo0.NOME[k] = UCo0.NOME[k] || NQ[k]; }
    if (UCo0.NOME) { UCo0.NOME.cappella = UCo0.NOME.cappella || ['una cappella', 'cappella']; UCo0.NOME.cattedra = UCo0.NOME.cattedra || ['una cattedra', 'cattedra']; }
    if (UCo0.EFF_TIPO && UCo0.STRUTTURE) for (const t of ['cappella', 'cattedra'].concat(Object.keys(POSTI_Q))) { UCo0.EFF_TIPO[t] = t; if (!UCo0.STRUTTURE[t]) UCo0.STRUTTURE[t] = (st, req) => UCo0.apri(st, { tipo: t, x: req.x, y: req.y, gruppo: req.gruppo, motivo: req.motivo || t, R: 120, nome: req.nome }); }
  })();
  const scala = () => CFG.scala || 1;
  // il soprannome di scherno: da quello che uno fa, col complemento della sua vita (la cosa del suo mestiere, una parola coniata)
  function soprannomina(st, f) {
    const k = FATTI_FAM[f.v], q0 = FATTI_Q[f.v]; if ((!k && !q0) || f.chi == null) return; const id = String(Array.isArray(f.chi) ? f.chi[0] : f.chi); if (id === 'nino') return;
    const n = npc(st, id), RR = R0(st); if (!n || !n.pop || n.cop || n.grigio || RR.eti[id] || FK(st).tit[id] || rnd() > (f.v === 'chiacchiera' ? .012 : .07) * (f.test && f.test.length ? 1.5 : 1)) return;
    if (q0 ? (!k || rnd() < .85) : rnd() < .6) { const Q = q0 || [QUOT[Math.floor(hashS(seme(st) + '|q|' + id) * QUOT.length)].k, Math.floor(hashS(id + 'tq') * 9)]; return etiQ(st, f, id, n, Q); }
    stats.etiPotere = (stats.etiPotere || 0) + 1;
    // il dominio: dal fatto, o (un caso su tre) da quello che uno è (il seme della persona); l'autorità: dal seme, a volte nel titolo
    const kd = rnd() < .33 || !k ? POTERE[Math.floor(hashS(seme(st) + '|dom|' + id + f.v) * POTERE.length)].k : k;
    const Fam = FAMIGLIE.find(x => x.k === kd), fe = n.pop.sex === 'f', Au = AUTORITA[Math.floor(hashS(seme(st) + '|aut|' + id) * AUTORITA.length)];
    const o = cosaR(f.cosa) || emblema(lavoro(n)) || rp(OGG_FOLK), oo = String(o).split(' ')[0], pl = plN(oo, gOgg(oo)), sg = rnd() < .3;
    const voc = rp(Fam.voc), rr = rnd(), dE = () => diCap(oo, !sg);
    const base = rr < .62 ? rp(Fam.mock)[fe ? 1 : 0] : rr < .85 ? Au.t[fe ? 1 : 0] : rp(Fam.mock)[fe ? 1 : 0];
    const lab = rr < .62 ? `${base} ${dE()}` : rr < .85 ? `${base} ${rnd() < .5 ? dE() : diCap(voc)}` : `${base} ${diCap(voc)} e ${dE()}`;
    const coniatore = (f.test || []).map(String).find(t => registro(st, t)) || null;
    RR.eti[id] = { lab, h: base.replace(/^(il|lo|la|l')\s?/, ''), fam: kd, aut: rr >= .62 && rr < .85 ? Au.k : null, emb: oo, usi: 0, ut: {}, t0: Math.round(st.t), da: f.id, chi0: coniatore, stato: null, mock: 1 };
    FK(st).tit[id] = { t: lab.replace(/^(il|lo|la|l')\s?/, ''), h: base.replace(/^(il|lo|la|l')\s?/, ''), it: null, mock: 1, perche: null, t0: Math.round(st.t) };
    stats.etichette = (stats.etichette || 0) + 1; storiaR(st, id, 'scherno', `${nomeDi(st, id)} ${azioneDi(st, f, id) || f.v}: da oggi è «${lab}»${coniatore ? ' (l\'ha detto ' + nomeDi(st, coniatore) + ')' : ''}`);
  }
  // l'etichetta di quartiere: il tipo (dal fatto, a volte un altro della stessa famiglia), a volte con la cosa della sua vita
  function etiQ(st, f, id, n, Q) {
    const RR = R0(st), Fam = FAMIGLIE.find(x => x.k === Q[0]); if (!Fam) return; const tq = (rnd() < .3 ? Math.floor(rnd() * Fam.tipi.length) : Q[1]) % Fam.tipi.length, T = Fam.tipi[tq], fe = n.pop.sex === 'f', base = T.t[fe ? 1 : 0];
    const o = cosaR(f.cosa) || emblema(lavoro(n)) || rp(OGG_FOLK), oo = String(o).split(' ')[0];
    const lab = / (del|della|di|delle|dei|degli|col|che|Prossimo)\b/.test(base) || rnd() < .5 ? base : `${base} ${diCap(oo, rnd() < .7)}`;
    const coniatore = (f.test || []).map(String).find(t => registro(st, t)) || null, h = base.replace(/^(il|lo|la|l')\s?/, '');
    RR.eti[id] = { lab, h, fam: Fam.k, tq, tono: T.tono, emb: oo, usi: 0, ut: {}, t0: Math.round(st.t), da: f.id, chi0: coniatore, stato: null, quot: 1 };
    FK(st).tit[id] = { t: lab.replace(/^(il|lo|la|l')\s?/, ''), h, it: null, mock: 1, perche: null, t0: Math.round(st.t) };
    stats.etichette = (stats.etichette || 0) + 1; stats.etiQuot = (stats.etiQuot || 0) + 1;
    storiaR(st, id, 'soprannome', `${nomeDi(st, id)} ${azioneDi(st, f, id) || '(' + f.v.replace(/_/g, ' ') + ')'}: per tutti adesso è «${lab}» (${{ affetto: 'con affetto', pieta: 'per compassione', invidia: 'per invidia', paura: 'per paura' }[T.tono] || 'così'})${coniatore ? ' (l\'ha detto ' + nomeDi(st, coniatore) + ')' : ''}`);
  }
  function storiaR(st, id, ev, d) { const RR = R0(st); RR.log = RR.log || []; RR.log.push([Math.round(st.t), id, ev, d]); if (RR.log.length > 200) RR.log.shift(); stats['ruolo_' + ev] = (stats['ruolo_' + ev] || 0) + 1; }
  // l'uso: chi chiama, chi insulta, chi ne parla (le fonti 'eti:<id>' di una battuta, e le chiacchiere fuori scena)
  function usaEti(st, id, chi) {
    const RR = R0(st); let E = RR.eti[id]; const T = FK(st).tit[id];
    if (!E && T) E = RR.eti[id] = { lab: T.t, h: T.h, fam: (famDi(T.h) || famDi(T.t) || {}).k || null, usi: 0, ut: {}, t0: Math.round(st.t), da: null, stato: null };
    if (!E) return; E.usi++; if (chi) E.ut[chi] = 1;
    if (!E.attaccata && E.usi >= CFG.attacca && Object.keys(E.ut).length >= 3) { E.attaccata = Math.round(st.t); stats.attaccate = (stats.attaccate || 0) + 1; reagisci(st, id, E); }
  }
  // la reazione: col carattere (Mente) e i tratti (UnicoIdee)
  function reagisci(st, id, E) {
    const M = st.u.menti && st.u.menti[id], c = (M && M.carattere) || {}, I = ID(), t = (I && I.tratti(st, id)) || {};
    let pa = .2 + (c.teatrale || .3) * .45 + (t.carisma || .3) * .35 + (t.follia || 0) * .4 - (c.orgoglio || .4) * .35, pr = (c.orgoglio || .4) * .6 + (c.rancore || .3) * .3, r = rnd() * (pa + pr + .35);
    E.stato = r < pa ? 'abbraccia' : r < pa + pr ? 'resiste' : 'ironia';
    { const F0 = FAMIGLIE.find(x => x.k === E.fam), r2 = rnd(); let a = pa, b = pr; if (!F0 || !F0.quot) a *= .4; if (E.tono === 'affetto') a += .35; else if (E.tono === 'invidia') a += .2; else if (E.tono === 'pieta') b += .15; else if (E.tono === 'paura') { a += .1; b += .3; }
      E.stato = r2 * (a + b + .35) < a ? 'abbraccia' : r2 * (a + b + .35) < a + b ? 'resiste' : 'ironia'; }
    storiaR(st, id, E.stato, `${nomeDi(st, id)} e «${E.lab}»: ${E.stato === 'abbraccia' ? 'gli piace. Da oggi lo è' : E.stato === 'resiste' ? 'non lo sopporta' : 'ci scherza su'}`);
    if (E.stato === 'abbraccia') abbraccia(st, id, E);
  }
  function abbraccia(st, id, E) {
    const Fam = FAMIGLIE.find(x => x.k === E.fam); if (!Fam) { E.stato = 'ironia'; return; }
    const RR = R0(st); if (RR.R[id]) return;
    const T0 = Fam.quot ? Fam.tipi[E.tq || 0] : null;
    const Au = T0 ? { k: 'pari' } : (E.aut ? AUTORITA.find(x => x.k === E.aut) : null) || AUTORITA.find(x => x.t.some(t => E.lab.indexOf(t.replace(/^(il|lo|la|l')\s?/, '')) >= 0)) || AUTORITA[Math.floor(hashS(seme(st) + '|aut|' + id) * AUTORITA.length)];
    const rt = REG_TIPO[registro(st, id)], rg = rt && rnd() < .4 && !T0 ? rt : (T0 && T0.reg) || Fam.reg;
    RR.R[id] = { id, lab: E.lab, h: E.h, fam: Fam.k, aut: Au.k, reg: REG_D[rg] ? rg : 'liturgico', emb: E.emb || null, tq: T0 ? E.tq || 0 : null, int: .12, t0: Math.round(st.t), seg: [], atti: 0, fatti: {}, C: null, va: null, detti: [], ult: 0, uff: null };
    stats.ruoli = (stats.ruoli || 0) + 1; stats[T0 ? 'ruoliQuot' : 'ruoliPotere'] = (stats[T0 ? 'ruoliQuot' : 'ruoliPotere'] || 0) + 1; const R = RR.R[id], AA = attiDi(R); RR.tipi = RR.tipi || {}; RR.tipi[R.fam + '×' + R.aut + '×' + R.reg] = 1;
    storiaR(st, id, 'ruolo', `${nomeDi(st, id)} diventa davvero «${E.lab}» (${R.fam}, ${R.aut}, registro ${R.reg}): vuole ${ATTI[AA[0]].inf}`);
    vuole(st, id, AA);
    scriviF(st, 'ruolo', [id], `${nomeDi(st, id)} non si offende più: è «${E.lab}», e si comporta di conseguenza`, E.da || null);
  }
  function vuole(st, id, AA) { const UD = typeof UnicoDesideri !== 'undefined' && UnicoDesideri.ON ? UnicoDesideri : null; if (!UD || !UD.proponi) return; try { const d = UD.proponi(st, id, { k: 'ruolo', per: rp(AA), vs: 1, mot: 'ruolo' }, .9); if (d) stats.desideriRuolo = (stats.desideriRuolo || 0) + 1; } catch (e) { } }
  // il posto dove si fa l'atto: il posto del ruolo, se c'è; se no il posto di famiglia più vicino (la chiesa, la calata, la piazza)
  const POSTO_FAM = { religione: 'chiesa', occulto: 'chiesa', sorte: 'bar', passione: 'bar', compagnia: 'bar', marina: 'mare', cosmo: 'mare', nobilta: 'bar', malavita: 'bar', cucina: 'bar', commercio: 'bar', famiglia: 'bar', cavalleria: 'bar' };
  // i verbi del ruolo: quelli del dominio e quelli della sua autorità
  const attiDi = R => { const T = tipoQ(R); if (T) return T.atti.filter(k => ATTI[k]); const F0 = FAMIGLIE.find(x => x.k === R.fam) || FAMIGLIE[0], A = AUTORITA.find(x => x.k === R.aut); return [...new Set(F0.atti.concat(A ? A.atti : []))].filter(k => ATTI[k]); };
  // il registro: quello del dominio, ma chi parla da camorrista o da coatto se lo porta dietro
  const REG_TIPO = { ma: 'mafioso', co: 'telecronaca', sb: 'tv' };
  function postoDi(st, R) {
    const RR = R0(st); if (R.C) { const C = st.u.costruire && st.u.costruire.cantieri.find(x => x.id === R.C && !x.chiuso); if (C) return { x: C.x, y: C.y, nome: R.Cnome || C.via }; }
    const n = npc(st, R.id), tp = POSTO_FAM[R.fam] || 'piazza'; let b = null, bd = 1e9;
    for (const k in G.PLACES || {}) { const P = G.PLACES[k]; if (TIPO_POSTO(k, P.name || '') !== tp || P.isola) continue; const d = Math.hypot(P.x - n.x, P.y - n.y); if (d < bd) { bd = d; b = P; } }
    return b ? { x: b.x, y: b.y, nome: b.name } : { x: n.x, y: n.y, nome: luogo(st, n.x, n.y) };
  }
  // il ruolo vive: ogni ora, se è l'ora e se ne ha voglia, va al posto e fa l'atto; ogni giorno cresce, cede, costruisce
  function ruoli(st) {
    const RR = R0(st), h = (st.t % 1440) / 60, g = giornoAss(st), V = VB(); if (!V) return;
    if (RR.g !== g) { RR.g = g; giornoRuoli(st, RR); }
    for (const id in RR.R) { const R = RR.R[id], n = npc(st, id); if (!n || n.dead || (n.jailedUntil > st.t) || n.inside) continue;
      { const T = tipoQ(R); if (T && T.ietta) riti(st, n); }
      if (R.va) { if (Math.hypot(n.x - R.va.x, n.y - R.va.y) < 7 || st.t - R.va.t > 90) { const atto = R.va.atto; R.va = null; let r = null; try { r = V.fai(st, n, atto, {}, { subito: true }); } catch (e) { r = null; } if (r && r.ok) stats.attiFatti = (stats.attiFatti || 0) + 1; } continue; }
      if (h < 9 || h > 21 || st.t - R.ult < 240 / Math.min(4, scala()) || rnd() > R.int * .5) continue;
      const Fam = FAMIGLIE.find(x => x.k === R.fam), P = postoDi(st, R); R.ult = Math.round(st.t);
      R.va = { x: P.x, y: P.y, atto: rp(attiDi(R)), t: Math.round(st.t) };
      try { V.fai(st, n, 'vai', { x: P.x + (rnd() - .5) * 3, y: P.y + (rnd() - .5) * 3 }); } catch (e) { }
    }
  }
  function giornoRuoli(st, RR) {
    const sc = scala();
    for (const id in RR.eti) { const E = RR.eti[id];
      if (E.stato === 'resiste' && rnd() < .05 * sc) { E.stato = 'abbraccia'; storiaR(st, id, 'cede', `${nomeDi(st, id)} si arrende: «Va bene, sono ${E.lab}. Contenti?»`); abbraccia(st, id, E); }
      else if (E.stato === 'ironia' && rnd() < .04 * sc) { E.stato = 'abbraccia'; storiaR(st, id, 'cede', `${nomeDi(st, id)} ci scherzava, ma ormai ci crede`); abbraccia(st, id, E); } }
    for (const id in RR.R) { const R = RR.R[id], Fam = FAMIGLIE.find(x => x.k === R.fam); R.int = Math.min(1, R.int + .05 * sc); if (rnd() < .5) vuole(st, id, attiDi(R));
      // il posto: abbastanza seguaci, abbastanza tempo, abbastanza convinzione
      const giorni = (st.t - R.t0) / 1440 * sc;
      if (!R.C && !R.tentato && R.seg.length >= CFG.segMin && giorni >= 4 && R.int >= .45) { R.tentato = (R.tentato || 0) + 1; costruisci(st, R, Fam); }
      if (!R.C && R.tentato && R.seg.length >= CFG.segMin && rnd() < .3) costruisci(st, R, Fam);
    }
    smette(st);
    // l'edicola del santo finto molto raccontato; le offerte
    const Fo = FK(st); for (const k in Fo.it) { const it = Fo.it[k]; if (it.k !== 'santo' || it.edicola || it.n < 6 || rnd() > .5) continue;
      const dev = st.npcs.filter(n => n.pop && !n.cop && (Fo.sa[n.id] || []).includes(it.id)).slice(0, 4).map(n => n.id); if (dev.length < 2) continue;
      const n0 = npc(st, dev[0]); const C = UCo() && UCo().richiedi ? UCo().richiedi(st, { effetto: 'cappella', x: it.x != null ? it.x : n0.x, y: it.y != null ? it.y : n0.y, gruppo: dev, motivo: 'edicola', nome: ('EDICOLA DI ' + it.nome).toUpperCase().slice(0, 28) }) : null;
      it.edicola = C ? C.id : -1; if (C) { stats.edicole = (stats.edicole || 0) + 1; scriviF(st, 'edicola', dev, `Per ${it.nome} è spuntata un'edicola vera, di bancali e lumini: la gente lascia ${rp(['monetine', 'fiori di plastica', 'bottoni', 'santini disegnati a penna', 'tappi'])}`, it.da || null, { x: C.x, y: C.y }); } }
  }
  function costruisci(st, R, Fam) {
    { const T = tipoQ(R); if (T) Fam = Object.assign({}, Fam, { posto: T.posto }); }
    const P = postoDi(st, R), UC0 = UCo(); if (!UC0 || !UC0.richiedi) return;
    const nomeP = POSTI_N[Fam.posto] ? `${rp(POSTI_N[Fam.posto])} ${ART(R.h, 'di')}` : Fam.posto === 'cappella' ? `${rp(['Santuario', 'Cappella', 'Basilica Minore', 'Tempio', 'Oratorio'])} ${ART(R.lab.replace(/^(il|lo|la|l')\s?/, ''), 'di')}` : Fam.posto === 'cattedra' ? `${rp(['Università', 'Accademia', 'Cattedra', 'Scuola Superiore'])} ${ART(R.lab.replace(/^(il|lo|la|l')\s?/, ''), 'di')}` : `${rp(['il Palco', 'la Tribuna', 'il Pulpito', 'l\'Arena', 'lo Studio'])} ${ART(R.lab.replace(/^(il|lo|la|l')\s?/, ''), 'di')}`;
    // dove: il posto del ruolo, poi dove sta lui, poi dove stanno i seguaci (uno per zona: si cerca una zona senza cantieri aperti)
    const aperti = ((st.u.costruire && st.u.costruire.cantieri) || []).filter(x => !x.chiuso), zc = (UC0.CFG && UC0.CFG.zona) || 45;
    // niente posto per un cantiere nuovo: il gruppo si prende una cosa già tirata su (la baracca, il palco del presidio) e la fa sua
    const prendi = () => { const mio = [R.id].concat(R.seg), n0 = npc(st, R.id); const L = aperti.filter(x => !Object.values(R0(st).R).some(r => r.C === x.id)).map(x => [x, (x.gruppo || []).some(g => mio.includes(String(g))) ? 0 : Math.hypot(x.x - n0.x, x.y - n0.y)]).filter(q => q[1] < 120).sort((a, b) => a[1] - b[1]); return L.length ? L[0][0] : null; };
    let C = null;
    if (UC0.CFG && aperti.length >= UC0.CFG.max) { C = prendi(); if (!C) { stats.postiFalliti = (stats.postiFalliti || 0) + 1; R0(st).no = [Fam.posto, 'pieno']; return; } C.nome = nomeP.toUpperCase().slice(0, 30); stats.postiPresi = (stats.postiPresi || 0) + 1; }
    const cand = [P].concat([R.id].concat(R.seg).map(i => npc(st, i)).filter(k => k && !k.inside).map(k => ({ x: k.x, y: k.y }))).filter(q => !aperti.some(x => Math.hypot(x.x - q.x, x.y - q.y) < zc + 2)).slice(0, 4);
    if (!C) for (const q of cand) { try { C = UC0.richiedi(st, { effetto: Fam.posto, x: q.x, y: q.y, gruppo: [R.id].concat(R.seg).slice(0, 5), motivo: 'ruolo', nome: nomeP.toUpperCase().slice(0, 30) }); } catch (e) { C = null; } if (C) break; }
    if (!C) { C = prendi(); if (C) { C.nome = nomeP.toUpperCase().slice(0, 30); stats.postiPresi = (stats.postiPresi || 0) + 1; } }
    if (!C) { stats.postiFalliti = (stats.postiFalliti || 0) + 1; R0(st).no = [Fam.posto, cand.length ? UC0.ultimoNo || 'nessun sito' : 'zone occupate']; return; }
    R.C = C.id; stats.segni = (stats.segni || 0) + 1; C.segno = { emb: R.emb, ruolo: R.id, acc: (aspettoDi(st, R) || {}).acc || null }; R.Cnome = nomeP; stats.postiRuolo = (stats.postiRuolo || 0) + 1; storiaR(st, R.id, 'posto', `${nomeDi(st, R.id)} e i suoi ${R.seg.length} seguaci tirano su ${nomeP} (${Fam.posto}) ${C.via ? inL(C.via) : ''}`);
    const it = nuovoIt(st, { k: 'sopr', nome: nomeP.replace(/^(il|la) /, m => m), luogo: C.via || P.nome, x: C.x, y: C.y, chi: R.id, gs: [giornoAss(st) + 3, giornoAss(st) + 7], vita: 2 });
    if (it) { inCalendario(st, it, (giornoAss(st) + 3) * 1440); for (const s of [R.id].concat(R.seg)) sa(st, s, it); }
    scriviF(st, 'posto_ruolo', [R.id].concat(R.seg).slice(0, 5), `${cap1(R.lab)} e i suoi tirano su ${nomeP}${C.via ? ' ' + inL(C.via) : ''}`, null, { x: C.x, y: C.y });
  }
  // l'atto è fatto (il fatto del verbo): il discorso, il pubblico, i seguaci, il Garante
  function attoFatto(st, f) {
    const RR = R0(st), id = String(Array.isArray(f.chi) ? f.chi[0] : f.chi), R = RR.R[id]; if (!R || !ATTI[f.v]) return;
    R.atti++; R.int = Math.min(1, R.int + .03); R.fatti[f.v] = Math.round(st.t);
    const part = String((f.x && f.x.part) || f.part || '').split(' ').filter(Boolean), vicini = st.npcs.filter(k => k.pop && k.id !== id && !k.dead && !k.inside && !k.cop && !k.grigio && Math.hypot(k.x - npc(st, id).x, k.y - npc(st, id).y) < 14).map(k => k.id);
    const pub = [...new Set(part.concat(vicini))].slice(0, 8), I = ID();
    stats.pubblico = (stats.pubblico || 0) + pub.length;
    const sermone = genDiscorso(st, R, f.v, pub); R.detti.push(sermone.join(' ')); if (R.detti.length > 4) R.detti.shift();
    // il discorso detto davanti al giocatore (a pezzi, uno ogni tre secondi)
    const ck = st.clock || 0; sermone.forEach((t, i) => DISCORSI.push([ck + 1 + i * 3.2, id, t, R.id])); if (DISCORSI.length > 12) DISCORSI.splice(0, DISCORSI.length - 12);
    stats.discorsi = (stats.discorsi || 0) + 1; RR.ultimo = sermone;
    try { moda(st, R, pub); } catch (e) { }
    if (tipoQ(R)) try { relazioni(st, R, f, pub); } catch (e) { }
    // chi ascolta: chi ride, chi ci crede, chi segue (l'idea «p:capo», da cui UnicoGruppi fa nascere il gruppo da sé)
    for (const p of pub) { if (R.seg.includes(p)) continue; const t = (I && I.tratti(st, p)) || {}, w = .08 + (t.credulo || .3) * .25 + (t.follia || 0) * .25 + R.int * .2;
      if (rnd() < w) { R.seg.push(p); if (R.seg.length > 12) R.seg.shift(); stats.seguaci = (stats.seguaci || 0) + 1; try { if (I && I.adotta) I.adotta(st, p, 'p:' + id, 'orgoglio', .7, .6, f.id, true); } catch (e) { }
        // il seguace prende il suo vocabolario: le parole coniate del capo e il titolo
        const s0 = S(st), Ic = s0.idl && s0.idl[id]; if (Ic) for (const eid in Ic.e) { const E = s0.esp && s0.esp[eid]; if (E && E.k === 'par') impara(st, p, E); }
        usaEti(st, id, p); }
      else if (rnd() < .3) usaEti(st, id, p); }
    // il Garante: un ruolo che fa folla si rettifica, e a volte arriva un Grigio con la multa
    if (pub.length >= 4 && !R.uff && rnd() < .35) { R.uff = pkS(st, ['Animatore Parrocchiale Non Autorizzato', 'Raduno Spontaneo da Regolarizzare', 'Assembramento Folkloristico Tollerato', 'Attività Ricreativa Senza Bollo', 'Manifestazione di Pensiero in Attesa di Modulo', 'Oratore Abusivo di Terza Classe'], 'r_uff');
      scriviF(st, 'rettifica', [id], `Ufficio Rettifiche: «${R.lab}» da oggi si chiama «${R.uff}». I seguaci non se ne accorgono`, f.id); stats.ruoliRettificati = (stats.ruoliRettificati || 0) + 1; }
    else if (pub.length >= 5 && rnd() < .12) { scriviF(st, 'multa', [id], `Un Grigio ha multato ${R.lab} per ${ATTI[f.v].inf} senza permesso: ${rp(['occupazione di suolo', 'schiamazzi liturgici', 'assembramento non timbrato', 'eccesso di carisma'])}`, f.id); stats.ruoliMultati = (stats.ruoliMultati || 0) + 1; }
  }
  // i registri: le formule di apertura (a), il tema (t), la citazione (f), l'esortazione (e), la litania o il coro (l), la chiusa (c)
  // %L il posto · %P il guaio vero di chi ascolta · %S il santo · %E -ore/-rice · %Q la sua protezione · %H la storia del paese · %R la reliquia
  // %W la parola coniata (o del dominio) · %V il verbo coniato · %N il numero · %D %D2 il vocabolario del dominio · %O l'emblema del ruolo
  const REG_D = {
    liturgico: { a: ['Fratelli e sorelle %L!', 'Figlioli miei, e anche voi in fondo che ridete!', 'Dilettissimi %L!', 'Pace a voi, e a chi ha lasciato la macchina in doppia fila!', 'Popolo %L, ascolta!', 'Anime belle e anime così così!'], t: ['Oggi la lettura è per %P', 'Pensate a %P', 'Prendete %P', 'Meditiamo su %P'], f: ['Come insegna %S, protett%E %Q:', 'Dice il libro %H:', 'Ricordate %H:', 'Sta scritto sulla %D di %O:'], e: ['Non cadete nel %W!', 'Chi %V3 sarà perdonato. Forse. Dopo il caffè.', 'Pentitevi del %W, e restituite le sedie!', 'Portate una %D2 e un\'offerta, anche in natura.', 'Beati quelli del %W, perché di loro è il parcheggio.'], l: ['%S, ora pro nobis. %R, ora pro nobis. E pro le cambiali.', 'Ascoltaci, %S. Esaudiscici, %R.', 'Santa %O, pregate per noi. Santa %D, prega per noi. Santo %W, vedi tu.'], c: ['Andate in pace, e restituite le sedie.', 'Amen. Offre lui.', 'La messa è finita. Le %O no.', 'Il segno della pace, ma senza toccarsi il portafoglio.'] },
    militare: { a: ['Truppa! Attenti!', 'Soldati %L, riposo! No, attenti!', 'Ciurma! Allineati %L!', 'Battaglione della %O, in riga!'], t: ['La situazione al fronte: %P', 'Rapporto: %P', 'Il nemico è vicino: %P'], f: ['Come ai tempi %H:', 'Per %S, protett%E %Q:', 'Il regolamento della %D lo dice chiaro:'], e: ['All\'attacco del %W!', 'Chi %V3 va agli arresti. In cucina.', 'Pulite le %O fino a vederci la faccia!', 'Avanti tutta contro la %D!'], l: ['Un, due! Un, due! %W!', 'Chi siamo? Quelli della %O! Cosa vogliamo? Il rancio!'], c: ['Rompete le righe!', 'Libera uscita fino alle sei.', 'Rompete le righe. Tranne tu.'] },
    accademico: { a: ['Silenzio in aula! Lezione numero %N.', 'Signori, prendete appunti: è roba d\'esame.', 'Cari studenti %L, e cari bocciati!', 'Colleghi, uditori, passanti paganti!'], t: ['Il caso di studio di oggi: %P', 'Esaminiamo %P', 'La %D di oggi riguarda %P'], f: ['La letteratura, cioè %H, ci insegna:', 'Il grande %S, protett%E %Q, scriveva:', 'Come dimostra la mia %D sulla %O:'], e: ['La %W è una scienza esatta.', 'Chi non sa coniugare «%V» è bocciato.', 'All\'esame vi chiedo il %W, e la %D2 a memoria.', 'Nota a piè di pagina: la %O ha sempre ragione.'], l: ['Ripetete con me: %W, %W, %W.', 'Prima legge della %O: tutto cade. Seconda legge: lo raccogli tu.'], c: ['Compiti per domani: niente. Ma fatelo bene.', 'La lezione è finita, l\'ignoranza no.', 'Ricevimento studenti: mai, al bar.'] },
    burocratico: { a: ['Udite, udite!', 'Per ordine superiore, cioè mio:', 'Cittadini! Cittadine! Cittadini a metà!', 'Visto il regolamento, visti gli atti, considerata la gente:'], t: ['Si rende noto che %P', 'Visto %P', 'Il mio programma parte da %P', 'Basta con %P'], f: ['Ai sensi %H:', 'Con il benestare di %S, protett%E %Q:', 'In base alla %D numero %N:'], e: ['Si istituisce il %W.', 'È vietato %V senza timbro.', 'Un %W per ogni famiglia!', 'Le %O diventano patrimonio comunale, previa %D2.'], l: ['Timbro, controtimbro, %W!', 'Votatemi! Votatemi! Anche due volte!'], c: ['Il presente proclama vale fino a giovedì.', 'Firmato: io.', 'Il comizio è finito. Le promesse no.', 'Il rinfresco lo paga lui.'] },
    telecronaca: { a: ['Buonasera e benvenuti, gente %L!', 'Signore e signori, che partita!', 'Collegamento in diretta dalla %O!'], t: ['In campo oggi: %P', 'Attenzione a %P'], f: ['Come nella finale %H:', 'Ce lo insegna %S, protett%E %Q:', 'Ricordiamo la grande %D del %N:'], e: ['Palla alla %O, dribbling, %W… GOOOL!', 'Chi %V3 fa la doccia per ultimo!', 'Dieci giri di %W!', 'Ammonizione per la %D2!'], l: ['Chi non salta un %W è!', 'Uno, due, tre: %O!'], c: ['Linea allo studio.', 'Allenamento finito. Defaticamento al bar.'] },
    tv: { a: ['Buonasera e benvenuti, gente %L!', 'Signore e signori, il grande spettacolo della %O!', 'Un applauso per voi, che siete qui senza motivo!'], t: ['Il nostro ospite di stasera: %P', 'Stasera parliamo di %P'], f: ['Come nella puntata %H:', 'Lo sponsor della serata è %S, protett%E %Q.', 'Un minuto di %D e torniamo.'], e: ['Chiamate ora: la %W a metà prezzo!', 'Chi %V3 vince un premio: %O!', 'E per voi, solo per voi, la %D2 in omaggio!'], l: ['Applauso! Applauso! Più forte, quelli in fondo!'], c: ['Buonanotte e grazie per non aver cambiato canale.', 'Ci vediamo dopo la pubblicità. Che non c\'è.'] },
    legale: { a: ['In piedi, entra la corte!', 'Silenzio in aula %L!'], t: ['L\'imputato è %P', 'Il caso: %P'], f: ['Visto il precedente %H,', 'Per la legge di %S, protett%E %Q,', 'Visto il comma %N della %D,'], e: ['La condanno al %W!', 'Colpevole di %V!', 'Il ricorso va presentato in carta da %O.'], l: ['Colpevole! Colpevole! Pausa caffè!'], c: ['La seduta è tolta.', 'Ricorso in appello al bar.'] },
    medico: { a: ['Prossimo paziente!', 'Malati %L, mettetevi in fila!'], t: ['Il caso clinico: %P', 'Diagnosi su %P'], f: ['Come scrisse %S, protett%E %Q:', 'La letteratura medica, %H, dice:', 'La mia %D lo conferma:'], e: ['Lei ha la %W acuta.', 'Cura: tre %W al giorno, a stomaco pieno.', 'Impacchi di %O, due volte al dì.'], l: ['Dica trentatré! %W!'], c: ['La visita costa un caffè.', 'Torni martedì. O mai.'] },
    nobiliare: { a: ['Sudditi miei %L!', 'Plebei, avvicinatevi. Non troppo.', 'Nobili, dame e cugini!'], t: ['Mi giunge notizia di %P', 'Ascolto la supplica di %P'], f: ['Come i miei avi %H:', 'Per volontà di %S, protett%E %Q:', 'Sul mio %D c\'è scritto:'], e: ['Concedo il %W a tutti!', 'Vi nomino custodi della %O.', 'Chi %V3 perde la %D2.'], l: ['Lunga vita a me! E alla %O!'], c: ['L\'udienza è tolta. Il caffè pure.', 'Potete ritirarvi. All\'indietro.'] },
    mafioso: { a: ['Amici miei %L. Sedetevi.', 'Qua siamo tutti una famiglia. Più o meno.', 'Venite, venite. Nessuno si fa male.'], t: ['Mi hanno detto di %P', 'C\'è la questione di %P'], f: ['Come si faceva ai tempi %H:', 'Lo diceva %S, protett%E %Q, buonanima:', 'La regola della %D è una sola:'], e: ['Chi %V3, lo veniamo a sapere.', 'Il %W si rispetta.', 'Per la %O, un piccolo contributo. Volontario. Obbligatorio.'], l: ['Rispetto! Rispetto! E le %O al loro posto.'], c: ['Andate. E salutatemi a casa.', 'Ci siamo capiti. Il cannolo è offerto.'] },
    newage: { a: ['Respirate, fratelli cosmici %L.', 'Chiudete gli occhi. Anche voi, quelli col portafoglio.', 'Anime vibranti della %O!'], t: ['Sento un\'energia bloccata: %P', 'L\'universo mi parla di %P'], f: ['Come rivelò %S, protett%E %Q:', 'Le stelle, %H, lo dicevano:', 'La %D della %O non mente:'], e: ['Allineate il vostro %W.', 'Chi %V3 ritrova la pace interiore. E le chiavi.', 'Mettete una %O sotto il cuscino, e una %D2 nel cuore.'], l: ['Ommm… %W… ommm… %O… ommm…'], c: ['Namasté, e lasciate un\'offerta.', 'La seduta è finita. L\'universo no.'] },
    amoroso: { a: ['Amore mio, affacciati!', 'Signorina, signora, chiunque ci sia al balcone!', 'Cuore mio %L, ascolta!', 'Scusate, è qui che abita la persona più bella del quartiere?'], t: ['Ti penso da quando %P', 'Lo so che c\'è %P, però ti amo lo stesso', 'Lo so, ci sono problemi più grossi, tipo %P'], f: ['Come nella canzone %H:', 'Lo giuro su %S, protett%E %Q:', 'Te lo scrivo sul retro della %D:'], e: ['Sei più bella della %D2!', 'Senza di te sono come il %W senza le %O.', 'Sposami, o almeno prendiamo un caffè.', 'Ti ho portato una %D. Era l\'unica che avevano.'], l: ['Affacciati, affacciati, che qui mi si gela la %D!', 'Amore, amore, %W!', 'O sole mio, o %O mie!'], c: ['Ripasso domani. E dopodomani.', 'Firmato: chi sai tu.', 'Se non è sì, almeno non chiamare tuo fratello.'] },
    superstizione: { a: ['Toccate ferro, prima di ascoltare.', 'Gente %L, state attenti: oggi è un giorno strano.', 'Non guardatemi negli occhi, per sicurezza.', 'Ho fatto un sogno, ragazzi. Un sogno.'], t: ['Ho sognato %P', 'Il segno è chiaro: %P'], f: ['Dice la smorfia, %H:', 'Lo sapeva %S, protett%E %Q:', 'Il %D non mente:'], e: ['Giocatevi il %N, il 13 e il %W.', 'Chi %V3 senza toccare ferro, se ne pente.', 'Sale dietro la spalla, e una %D2 in tasca.', 'Le %O, nella smorfia, fanno 47.'], l: ['Corno, ferro, %O: tutto fa.', 'Ambo, terno, quaterna… %W!'], c: ['E comunque io non ci credo. Però tocco.', 'Se vincete, la metà è mia.'] },
    filosofico: { a: ['Amici, sedetevi: la vita è una panchina.', 'Ascoltate, che oggi ho capito una cosa.', 'Gente %L, mi sono fatto una domanda.'], t: ['Prendiamo %P', 'Pensate a %P'], f: ['Come diceva %S, protett%E %Q:', 'Già ai tempi %H si sapeva:', 'La %D insegna:'], e: ['Tutto passa, tranne il %W.', 'Il mese prossimo parto, ma prima vi spiego la %D2.', 'Chi %V3, alla fine, ha capito tutto. O niente.', 'Le %O sono come le persone: le metti in fila e litigano.'], l: ['Perché? Perché %W. E perché no?'], c: ['Comunque, chi offre il caffè?', 'Ci rivediamo qui. Tanto dove vado.'] },
    affettuoso: { a: ['Venite, venite, che si raffredda!', 'Figli miei, anche voi che non siete miei!', 'Tesori %L, avete mangiato?'], t: ['Mi hanno detto di %P', 'Mi preoccupa %P'], f: ['Come diceva mia nonna, ai tempi %H:', 'Per %S, protett%E %Q:', 'Con una %D si sistema tutto:'], e: ['Mangia, che sei sciupato!', 'Una %D2 calda e passa tutto.', 'Chi %V3 senza sciarpa, poi non si lamenti.', 'Ho fatto le %O ripiene, ne ho fatte troppe, apposta.'], l: ['Micio, micio, micio! %W!', 'Piano, che ce n\'è per tutti.'], c: ['E riportate il piatto.', 'Tornate stasera, che faccio il %W.'] },
    chiacchiera: { a: ['Ragazzi, sentite questa!', 'Fermi tutti, che ve la racconto.', 'Allora, gente %L:'], t: ['Sapete di %P', 'Partiamo da %P'], f: ['Come ai tempi %H:', 'Parola di %S, protett%E %Q:', 'Me l\'ha detto uno della %D:'], e: ['E il pesce era grosso così. No, così!', 'Il prossimo giro lo paga il %W.', 'Chi %V3 stasera, lo invito a cena. A casa sua.', 'Una %D2, due %O e un mazzo di carte: questa è vita.'], l: ['Un, due, tre, quattro… %W!', 'Dai, un\'altra! Un\'altra!'], c: ['Però non l\'avete sentito da me.', 'Alla prossima, e portate gli spicci.'] },
    nostalgico: { a: ['Ah, ragazzi, una volta…', 'Gente %L, voi non vi ricordate, ma io sì.', 'Guardate questa foto.'], t: ['Pensate che prima di %P', 'Una volta, prima di %P'], f: ['Ai tempi %H,', 'Come quando c\'era %S, protett%E %Q:', 'Qui una volta c\'era una %D:'], e: ['E il %W costava dieci lire!', 'Le %O le facevano a mano, allora.', 'Chi %V3 adesso non sa cosa si è perso.'], l: ['Che tempi, che tempi, %W!'], c: ['E adesso? Adesso c\'è il parcheggio.', 'Vabbè. Le altre foto ve le faccio vedere domani.'] },
    olistico: { a: ['Amici, tutto è collegato. Tutto.', 'Ascoltatemi: io vedo i fili.', 'Il caso è chiuso. Cioè, aperto. Cioè, collegato.'], t: ['Prendete %P', 'Il primo indizio: %P'], f: ['E guardate %H: coincidenza? No.', 'Come mostra %S, protett%E %Q:', 'La %D porta alla %O, la %O porta alla %D2:'], e: ['Quindi il colpevole è il %W.', 'Chi %V3 è innocente. O complice. Dipende dal tram.', 'Ecco perché non ho pagato il caffè: è tutto collegato.'], l: ['%O, %D, %W: un unico disegno.'], c: ['Il conto, ovviamente, è parte del mistero.', 'Prossima indagine: domani, se mi ricordo.'] },
  };
  // ======================= I MODI DEL COMICO: per chi parla e per il momento =======================
  // La battuta di base resta la regola; un terzo delle battute costruite, e un pezzo di ogni discorso, passa per il modo comico di chi parla
  // (dalla persona: i tratti e un caso suo; dal momento: la rissa o la retata qui accanto, il pettegolezzo, il nuovo da istruire). Sono tecniche:
  // la satira istituzionale del paesino, la divagazione con la pausa troppo lunga, la paranoia patriottica che sale, il nichilismo cosmico
  // pseudoscientifico, la svolta malinconica a metà battuta, la grana underground e pretenziosa, l'estraneo impassibile che fraintende le
  // usanze, la saggezza tenera e serena in mezzo al caos (la rissa, il crollo), il narratore enciclopedico con le cifre assurde e la burocrazia
  // cosmica, l'interconnessione di tutte le cose (catene assurde di cause, e la scusa olistica). Mai i personaggi, mai le battute di nessuno.
  const MODI = ['base', 'istituzionale', 'divagazione', 'paranoia', 'cosmico', 'malinconia', 'underground', 'alieno', 'sereno', 'guida', 'olistico'];
  function modoDi(st, n, ctx) {
    if (ctx && ctx.caos && rnd() < .55) return 'sereno';
    if (ctx && ctx.pett && rnd() < .4) return 'olistico';
    if (ctx && ctx.spiega && rnd() < .5) return 'guida';
    const I = ID(), t = (I && I.tratti(st, n.id)) || {}, M = st.u.menti && st.u.menti[n.id], c = (M && M.carattere) || {}, h = hashS(seme(st) + '|comico|' + n.id), age = (n.pop && n.pop.age) || 40;
    const W = { base: 1.2, istituzionale: .3 + (c.orgoglio || 0) * .6, divagazione: .3 + (c.teatrale || 0) * .7, paranoia: .2 + (t.vilta || 0) * .7, cosmico: .2 + (t.follia || 0) * 1.2, malinconia: .25 + (c.rancore || 0) * .3 + (age > 50 ? .2 : 0),
      underground: (age < 35 ? .5 : .1) + (registro(st, n.id) === 'co' ? .3 : 0), alieno: .15 + (t.contrario || 0) * 1.2, sereno: .15 + (age > 60 ? .3 : 0), guida: .2 + (c.loq || 0) * .4, olistico: .15 + (t.credulo || 0) * .6 };
    // il modo «di casa» di ciascuno (dal seme) pesa il doppio: così lo stesso ruolo suona diverso a seconda di chi lo fa
    const casa = MODI[1 + Math.floor(h * (MODI.length - 1))]; W[casa] += 1.4;
    let tot = 0; for (const k in W) tot += W[k]; let r = rnd() * tot; for (const k in W) { r -= W[k]; if (r <= 0) return k; } return 'base';
  }
  const CIFRA = () => rp(['1.412', '3,7', 'novecentonovantanove', '42 virgola qualcosa', '6.000', 'quattro e mezzo', '17', '1 su 3.000.000']);
  function caosVicino(st, n) {
    const Rr = st.u.rissa; if (Rr && Rr.L && Rr.L.some(c => { const a = npc(st, c.a); return a && Math.hypot(a.x - n.x, a.y - n.y) < 18; })) return 'una rissa';
    const L = fatti(st, n.id, .02); for (const f of (FT() ? (FT().per(st, { da: st.t - 15 }) || []) : []).slice(-30)) if (f.dove && f.dove[0] != null && Math.hypot(f.dove[0] - n.x, f.dove[1] - n.y) < 18 && /guasto|botte|sgombero|fermato|repressione|crollo|lancio|sparo|multa/.test(f.v)) return { guasto: 'un disastro', botte: 'le botte', sgombero: 'lo sgombero', fermato: 'un arresto', repressione: 'la retata', crollo: 'un crollo', lancio: 'le cose che volano', sparo: 'gli spari', multa: 'la multa' }[f.v] || 'il caos';
    return null;
  }
  // gli stessi modi, applicati all'intimità e alla vita di tutti i giorni: la dichiarazione d'amore che svolta in tragicomico, la pesca a
  // scala cosmica, la teoria olistica della iella, la morte detta con calma mentre il tavolino crolla, il sistema paranoico del lotto
  const Q_COM = {
    malinconia: (t, c, o, nb) => `${c}… Ti amo. Cioè, amo l'idea di essere uno che ama, che è quasi uguale. Scusa. ${rp(['Fai finta che non l\'ho detto.', 'Dimentica tutto, tranne la parte bella.', 'Comunque ti ho portato una ' + o + '.'])}`,
    guida: (t) => `${t} (Il pesce in questione, secondo le stime più prudenti, era lungo ${CIFRA()} metri, cioè più del molo, il che spiega parecchie cose sul molo e quasi niente sul pesce.)`,
    olistico: (t, c, o, nb, ctx) => `Ragionate: ${nb} passa, un gatto attraversa, il tram ritarda, a mia zia si rompe ${ART(o, 'det')}. Coincidenze? È tutto collegato, e al centro c'è sempre ${ctx && ctx.ietta ? 'lui, lo iettatore' : rp(['quella cena di martedì', 'la scommessa di ' + nb, 'un mazzo di carte truccato'])}. ${t}`,
    sereno: (t, c, o, nb, ctx) => `Sai, la morte è come la scopa: alla fine si contano le carte e basta. — Intanto ${ctx.caos || 'il tavolino crolla e le carte volano'}. — Tocca a te.`,
    paranoia: (t) => { const a = 1 + Math.floor(rnd() * 90), b = 1 + Math.floor(rnd() * 90); return `${t} Il mio sistema: il ${a} esce quando piove, il ${b} quando il tabaccaio è in ferie. Lo Stato lo sa, per questo cambiano le estrazioni. Io però ho un quaderno.`; },
    cosmico: (t) => `${t} Tanto fra un miliardo di anni l'amore sarà un'onda radio persa nel vuoto. Però stasera c'è la sagra.`,
    alieno: (t) => `Ho studiato il vostro rito del corteggiamento: uno canta sotto un balcone, l'altra chiude la finestra, e questo si chiama «andare bene». ${t}`,
    divagazione: (t, c, o, nb) => `${t} Come quella volta che ${nb} si è dichiarat${rnd() < .5 ? 'o' : 'a'} al citofono sbagliato e adesso ${rp(['ha tre suoceri', 'gioca a carte col dentista', 'è fidanzat' + (rnd() < .5 ? 'o' : 'a') + ' col condominio'])}.`,
    istituzionale: (t) => `${t} (Il Comune ha istituito una commissione sui baci in pubblico. Si riunisce in pubblico.)`,
    underground: (t, c, o) => `${t} L'amore è libero, amico. Libero come ${ART(o, 'det')} che mi hai preso e non mi hai ridato.`,
  };
  function comico(st, n, t, ctx) {
    ctx = ctx || {}; const m = ctx.modo || modoDi(st, n, ctx); stats.modi = stats.modi || {}; stats.modi[m] = (stats.modi[m] || 0) + 1; if (m === 'base') return t;
    const lu = luogo(st, n.x, n.y) || 'il paese', Fo = FK(st), it = conosce(st, n.id)[0], o = (idl(st, n.id).fav || [])[0] || emblema(lavoro(n)) || rp(OGG_FOLK), G0 = grigiW(st, n).replace(/,.*$/, ''), nb = (st.npcs[Math.floor(rnd() * st.npcs.length)] || {}).first || 'mio cugino';
    const corto = t.replace(/[.!?…]+$/, '');
    fonte('comico:' + m);
    if (ctx.intimo && Q_COM[m] && rnd() < .7) { stats.modiQ = stats.modiQ || {}; stats.modiQ[m] = (stats.modiQ[m] || 0) + 1; return Q_COM[m](t, corto, o, nb, ctx); }
    switch (m) {
      case 'istituzionale': return `${t} ${rp([`(Delibera n. ${CIFRA()} del consiglio di quartiere, approvata da due assessori e un gatto.)`, `Il Comune ha stanziato ${CIFRA()} lire per studiare la cosa. Lo studio dice: boh.`, `C'è pure una targa che lo vieta, ma è caduta in testa all'assessore.`, `Domani si inaugura la rotonda della ${o}. Senza strada.`])}`;
      case 'divagazione': return rnd() < .5 ? `${t} Come quella volta che ${nb} ${rp(['ha sposato un ombrellone', 'ha sfidato un gabbiano a briscola', 'è rimasto chiuso in un frigorifero per una settimana', 'ha venduto la ' + o + ' a un turista tedesco', 'si è candidato sindaco del molo'])} ${inL(lu)}.` : `${corto}… … … … … … Comunque.`;
      case 'paranoia': { const A = rp([G0, 'il Garante', 'quelli del porto', 'i vicini del terzo piano']), B = rp(['i piccioni', 'le lavatrici', 'quelli che vendono ' + plN(o, gOgg(o)), 'il Comune', 'mia cognata']); return `${t} E chi c'è dietro? ${cap1(A)}. E dietro ${A}? ${cap1(B)}. Io lo dico da anni. Da anni!`; }
      case 'cosmico': return rp([`${t} Tanto fra cinque miliardi di anni il sole si mangia ${ART(o, 'det')} e pure ${inL(lu).replace(/^(in|a|al|alla|all') /, '')}.`, `${t} È scientifico: ${ART(o, 'det')} emette onde di ${rp(['tristezza', 'ragù', 'sfiga quantistica', 'pigrizia'])}. Ho fatto i calcoli. Su un tovagliolo.`, `${t} In un universo parallelo sono re. Qui invece pago l'affitto.`]);
      case 'malinconia': return `${corto}… Scusate. È che ${rp(['nessuno mi chiama da tre anni', 'mio padre non è mai venuto a vedermi giocare a bocce', 'sono stanc' + (sesso(st, n.id) === 'f' ? 'a' : 'o') + ' di essere quell' + (sesso(st, n.id) === 'f' ? 'a' : 'o') + ' simpatic' + (sesso(st, n.id) === 'f' ? 'a' : 'o'), 'a volte mi guardo allo specchio e non mi saluto'])}. Dicevo: ${corto.split(/[.!?]/)[0].toLowerCase()}!`;
      case 'underground': return rp([`Amico, ${minuscola(t)} È tutto una questione di vibrazioni. E di vino del discount.`, `${t} Tutto questo è il sistema, amico. Passami ${ART(o, 'det')}.`, `${t} Io queste cose le dicevo già nel '68. Avevo tre anni, ma le dicevo.`]);
      case 'alieno': return rp([`Ho osservato le vostre usanze: voi chiamate «${o}» ${rp(['un animale domestico', 'una forma di preghiera', 'il vostro capo', 'un modo di dire buongiorno'])}. ${t}`, `${t} Da noi, questo si fa con le orecchie. Ma rispetto le vostre tradizioni.`, `Interessante. Voi terrestri ${rp(['urlate per salutarvi', 'pagate per stare in fila', 'mettete le sedie in strada per protesta', 'bevete il caffè per arrabbiarvi più in fretta'])}. ${t}`]);
      case 'sereno': { const c = ctx.caos || caosVicino(st, n) || 'il mondo che va in pezzi'; return rp([`Sai, ${rp(['anche il dolore è un ospite: lo fai accomodare, gli offri un caffè', 'niente dura, nemmeno la multa', 'perdonare è come lasciare la porta aperta: entra aria', 'ogni cosa che si rompe insegna qualcosa a chi la ripara'])}. — Intanto, lì accanto, ${c}.`, `Guarda che bel cielo, stasera. — Accanto a noi ${c}, ma che bel cielo.`, `${t} …e comunque siamo tutti di passaggio, come le cozze. — (Lì vicino, ${c}.)`]); }
      case 'guida': return rp([`${t} (Nota: ${inL(lu).replace(/^(in|a|al|alla|all'|allo|ai|agli|alle) /, '')} è lunga quanto ${CIFRA()} baccalà messi in fila, il che dice molto sui baccalà.)`, `${t} (${cap1(o)}: oggetto che gli abitanti del porto usano soprattutto per lamentarsene. Se ne contano ${CIFRA()} per abitante.)`, `${t} Il modulo per protestare è esposto, regolarmente, nella cantina chiusa del Comune, dietro il cartello «attenti al leopardo».`, `${t} Considerando la cosa con calma, e tenendo conto di tutti i fattori, la conclusione è una sola: ${rp(['il caffè', 'il traghetto', 'la ' + o, 'mia zia'])}.`]);
      case 'olistico': { const L = (FT() ? FT().per(st, { da: st.t - 2880 }) : []).filter(f => !BANALI.test(f.v)).slice(-40), a = L[Math.floor(rnd() * L.length)], b = L[Math.floor(rnd() * L.length)], ra = a && azioneDi(st, a, a.chi), rb = b && azioneDi(st, b, b.chi);
        if (a && ra) fonte('fatto:' + a.v + '#' + a.id);
        return ra && rb && a !== b ? `Tutto è collegato: ${nomeDi(st, a.chi)} ${ra}, quindi ${nomeDi(st, b.chi)} ${rb}. E per questo ${rp(['non ho pagato il caffè', 'è sparito il mio ombrello', 'i Grigi sono nervosi', 'piove al contrario'])}. ${t}` : `${t} È tutto collegato, eh. Anche il fatto che non ho pagato.`; }
    }
    return t;
  }
  US.comico = comico; US.MODI = MODI;
  // ======================= L'ASPETTO: gli accessori e i segni, nati da quello che è successo =======================
  // Il ruolo (con almeno due seguaci) decide un ASPETTO: un accessorio per il ruolo e per la sua storia (lo scolapasta perché la reliquia
  // era uno scolapasta, la collana di cozze del Cardinale delle Cozze, il mantello-asciugamano), di un colore (quello del simbolo del gruppo,
  // se c'è). I seguaci lo prendono, qualcuno del pubblico lo imita; chi non ci torna più lo smette. I SEGNI: il simbolo dipinto sui pezzi
  // costruiti dal ruolo (lo striscione e la scritta del suo posto, col nome). Nel gioco: piccole mesh a parte sopra i personaggi (mai i
  // modelli), una InstancedMesh per accessorio, col colore per istanza, al più 32 per tipo.
  const ACC_DA = [[/scolapast|pentol|tegam|mestol|colapast/, 'colapasta'], [/cozz|vongol|conchigl|cozzola/, 'collana'], [/asciugaman|telo|lenzuol|tovagl|mantell/, 'mantello'], [/occhial|lente|matita|timbr/, 'occhiali'], [/elmett|secch|bidon/, 'elmetto'], [/corona|tappo|bullon|anell/, 'coroncina'], [/fascia|nastro|striscion/, 'fascia'], [/bandan|fazzolett|bandier/, 'bandana'], [/camic|grembiul|bianco/, 'camice'], [/cappell|carta|giornal|gazzetta/, 'cappello_carta']];
  const COLORE = { rosso: '#C25B36', ocra: '#DC9A34', blu: '#2F60B5', verde: '#3F8A50', rosa: '#E04B8C', viola: '#6B3D9B', verdemare: '#2A8A8A', salvia: '#93B27C', mattone: '#6F2B2E', lavagna: '#3D3548' };
  function L0(st) { const s = S(st); return s.look || (s.look = { R: {}, chi: {} }); }
  function aspettoDi(st, R) {
    const Lk = L0(st); if (Lk.R[R.id]) return Lk.R[R.id];
    const Fam = FAMIGLIE.find(x => x.k === R.fam) || FAMIGLIE[0], storia = [R.emb || '', R.lab].concat(conosce(st, R.id).filter(x => x.k === 'reliquia').map(x => x.nome)).join(' ').toLowerCase();
    let acc = null, perche = null; for (const [re, a] of ACC_DA) if (re.test(storia)) { acc = a; perche = (storia.match(re) || [''])[0]; break; }
    if (!acc) { acc = rp((tipoQ(R) || Fam).acc); perche = Fam.k; }
    const cu = st.u.cultura, Gr = GR(), g = Gr && Gr.gruppoDi(st, R.id), c = g && cu && cu.com && cu.com['g:' + g.id];
    const col = c && c.col && COLORE[c.col] ? COLORE[c.col] : Object.values(COLORE)[Math.floor(hashS(R.id + R.lab) * 10)];
    const A = Lk.R[R.id] = { acc, col, perche, t0: Math.round(st.t) }; stats.aspetti = (stats.aspetti || 0) + 1;
    storiaR(st, R.id, 'aspetto', `I seguaci ${prepN(R.lab, 'di')} si riconoscono: ${{ colapasta: 'uno scolapasta in testa', collana: 'una collana', mantello: 'un asciugamano come mantello', occhiali: 'gli occhiali di cartone', elmetto: 'un secchio per elmetto', coroncina: 'una coroncina di tappi', fascia: 'una fascia a tracolla', bandana: 'una bandana', camice: 'un camice', cappello_carta: 'un cappello di carta' }[acc] || acc}, color ${Object.keys(COLORE).find(k => COLORE[k] === col) || 'misto'} (per via ${/^[aeiou]/.test(perche) ? 'dell\'' + perche : 'del ' + perche})`);
    return A;
  }
  function veste(st, id, R, A) { const Lk = L0(st); if (Lk.chi[id] && Lk.chi[id][3] === R.id) { Lk.chi[id][2] = Math.round(st.t); return; } Lk.chi[id] = [A.acc, A.col, Math.round(st.t), R.id]; stats.vestiti = (stats.vestiti || 0) + 1; }
  function moda(st, R, pub) {
    if (R.seg.length < 2) return; const A = aspettoDi(st, R); veste(st, R.id, R, A);
    for (const p of pub) { if (R.seg.includes(p) ? rnd() < .6 : rnd() < .07) { const prima = !L0(st).chi[p]; veste(st, p, R, A); if (prima && !R.seg.includes(p)) stats.imitati = (stats.imitati || 0) + 1; } }
  }
  function smette(st) { const Lk = L0(st), RR = R0(st); for (const id in Lk.chi) { const v = Lk.chi[id], R = RR.R[v[3]], seg = R && (R.seg.includes(id) || R.id === id); if (st.t - v[2] > (seg ? 4320 : 1440) / scala() && rnd() < .5) { delete Lk.chi[id]; stats.smessi = (stats.smessi || 0) + 1; } } }
  US.look = L0;
  // il disegno: nel browser, una InstancedMesh per accessorio sopra i personaggi vicini al giocatore
  if (typeof window !== 'undefined' && typeof requestAnimationFrame !== 'undefined') {
    const ACC = { fascia: null, mantello: null, colapasta: null, collana: null, occhiali: null, elmetto: null, coroncina: null, bandana: null, camice: null, cappello_carta: null }, MAX = 32;
    const geo = (T3, k) => k === 'fascia' ? new T3.BoxGeometry(.07, .62, .03) : k === 'mantello' ? new T3.BoxGeometry(.46, .72, .03) : k === 'colapasta' ? new T3.CylinderGeometry(.17, .13, .11, 12, 1, true) : k === 'collana' ? new T3.TorusGeometry(.13, .025, 6, 14)
      : k === 'occhiali' ? new T3.BoxGeometry(.22, .05, .03) : k === 'elmetto' ? new T3.SphereGeometry(.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2) : k === 'coroncina' ? new T3.TorusGeometry(.11, .02, 5, 10) : k === 'bandana' ? new T3.TorusGeometry(.115, .03, 5, 12)
      : k === 'camice' ? new T3.BoxGeometry(.4, .62, .32) : new T3.ConeGeometry(.15, .26, 8);
    const POS = { fascia: [1.18, .0, 0, 0, .5], mantello: [1.08, -.15, 0, 0, 0], colapasta: [1.8, 0, 0, 0, 0], collana: [1.43, 0, Math.PI / 2, 0, 0], occhiali: [1.63, .11, 0, 0, 0], elmetto: [1.72, 0, 0, 0, 0], coroncina: [1.8, 0, Math.PI / 2, 0, 0], bandana: [1.68, 0, Math.PI / 2, 0, 0], camice: [1.12, 0, 0, 0, 0], cappello_carta: [1.88, 0, 0, 0, 0] };
    const giro = () => {
      try {
        const pv = window.__pv, st = pv && pv.st, R = pv && pv.R, scene = R && R.__models && R.__models.scene, T3 = typeof THREE !== 'undefined' ? THREE : null; if (!st || !scene || !T3 || !st.u || !st.u.strada) return requestAnimationFrame(giro);
        const Lk = st.u.strada.look, p = st.player; const M = new T3.Matrix4(), Q = new T3.Quaternion(), E = new T3.Euler(), V3 = new T3.Vector3(), S1 = new T3.Vector3(1, 1, 1), C = new T3.Color(), k = {};
        for (const a in ACC) { if (!ACC[a]) { ACC[a] = new T3.InstancedMesh(geo(T3, a), new T3.MeshLambertMaterial({ color: '#ffffff' }), MAX); ACC[a].frustumCulled = false; ACC[a].name = 'strada_' + a; ACC[a].instanceMatrix.setUsage && ACC[a].instanceMatrix.setUsage(T3.DynamicDrawUsage); } if (ACC[a].parent !== scene) scene.add(ACC[a]); k[a] = 0; }
        if (Lk && p) for (const id in Lk.chi) { const v = Lk.chi[id], a = v[0], m = ACC[a]; if (!m || k[a] >= MAX) continue; const n = G.byId && G.byId(st, id); if (!n || n.dead || n.inside || n.inVeh || Math.abs(n.x - p.x) > 60 || Math.abs(n.y - p.y) > 60) continue;
          const P0 = POS[a], yaw = -(n.face || 0) + Math.PI / 2, gz = R.groundH ? R.groundH(n.x, n.y) : 0, sc = (n.look && n.look.build) || 1, fx = Math.cos(n.face || 0), fy = Math.sin(n.face || 0);
          E.set(P0[2], yaw, P0[4]); Q.setFromEuler(E); V3.set(n.x + fx * P0[1], gz + P0[0], n.y + fy * P0[1]); S1.set(sc, 1, sc); M.compose(V3, Q, S1); m.setMatrixAt(k[a], M); m.setColorAt && m.setColorAt(k[a], C.set(v[1])); k[a]++; }
        for (const a in ACC) { const m = ACC[a]; m.count = k[a]; m.visible = k[a] > 0; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      } catch (e) { US.lookErr = String(e && e.message); }
      requestAnimationFrame(giro);
    };
    requestAnimationFrame(giro);
  }
  // il discorso: il registro del ruolo (o quello di chi parla) + il folklore che sa + le sue parole + la sua vita + i guai veri di chi ascolta + il suo modo comico
  function genDiscorso(st, R, atto, pub) {
    const n = npc(st, R.id), Fam = FAMIGLIE.find(x => x.k === R.fam) || FAMIGLIE[0], D = REG_D[R.reg || Fam.reg] || REG_D.liturgico, vd = Fam.voc.slice().sort(() => rnd() - .5), emO = R.emb || 'cozza', Fo = FK(st), mine = conosce(st, R.id);
    const lu = R.Cnome || luogo(st, n.x, n.y) || 'qui', dove = /^(il|lo|la|l'|i|gli|le) /i.test(lu) ? prepN(lu, 'di') : ART(lu, 'di');
    const santo = mine.find(x => x.k === 'santo') || Object.values(Fo.it).find(x => x.k === 'santo'), storia = mine.find(x => x.k === 'storia' || x.k === 'ricorrenza'), reliq = mine.find(x => x.k === 'reliquia');
    const s0 = S(st), Ic = s0.idl && s0.idl[R.id], par = Ic ? Object.keys(Ic.e).map(e => s0.esp && s0.esp[e]).filter(E => E && E.k === 'par') : [];
    const W = par.find(E => !E.p.vb), Vb = par.find(E => E.p.vb), wn = W ? W.p.w : (radice(rp(OGG_FOLK)) || 'cozz') + 'ume', vb = Vb ? Vb.p.vb.r + 'are' : 'peccare', vb3 = Vb ? Vb.p.vb.r + 'a' : 'pecca';
    // i guai veri di chi ascolta: la multa, il debito, il guasto, il fermo
    let P = null; const F = FT(); for (const p of pub) { const L = fatti(st, p, 3).filter(f => String(f.chi) === p && /multa|fermato|guasto|furto|sgombero|prestito|comica/.test(f.v)); const f = L[L.length - 1]; if (f) { const nm = nomeDi(st, p); P = f.v === 'multa' ? `${nm}, multat${sesso(st, p) === 'f' ? 'a' : 'o'} dai Grigi` : f.v === 'fermato' ? `${nm}, portat${sesso(st, p) === 'f' ? 'a' : 'o'} via dai Grigi` : f.v === 'guasto' || f.v === 'comica' ? `${nm}, che ${azioneDi(st, f, p) ? azioneDi(st, f, p).replace(/^ha /, 'ha ') : 'ha fatto una figuraccia'}` : f.v === 'prestito' ? `${nm} e i suoi debiti` : `${nm} e la sua disgrazia`; fonte('fatto:' + f.v + '#' + f.id); break; } }
    if (!P) { const p = pub[0]; P = p ? `${nomeDi(st, p)}, che ${rp(['ride', 'non crede', 'è venut' + (sesso(st, p) === 'f' ? 'a' : 'o') + ' per il rinfresco', 'si è sedut' + (sesso(st, p) === 'f' ? 'a' : 'o') + ' sulla mia sedia'])}` : `i Grigi e le loro multe`; }
    const fill = s => s.replace(/%L/g, dove).replace(/%P/g, P).replace(/%S/g, santo ? santo.nome : 'San Pazienza').replace(/%E/g, santo && /^Santa/.test(santo.nome) ? 'rice' : 'ore').replace(/%Q/g, santo && santo.ex ? santo.ex.pat : 'dei disperati')
      .replace(/%H/g, storia ? prepN(storia.nome, 'di') : 'dei nostri padri').replace(/%R/g, reliq ? cap1(reliq.nome) : 'Santa Pazienza').replace(/%V3/g, vb3).replace(/%V/g, vb).replace(/%N/g, String(R.atti + 1)).replace(/\b(della|delle|dalla|sulla|alla|nella|la|le|una|il|del|nel|al|un)\s+%(O|D2|D|W)\b/gi, (m, a, k) => {
        const pl = k === 'O', w = k === 'O' ? emO : k === 'D' ? vd[0] : k === 'D2' ? vd[1] : wn, t = { della: 'di', delle: 'di', del: 'di', dalla: 'da', sulla: 'su', alla: 'a', al: 'a', nella: 'in', nel: 'in', la: 'det', le: 'det', il: 'det', una: 'ind', un: 'ind' }[a.toLowerCase()];
        const r = ARTp(w, t, pl); return /^[A-Z]/.test(a) ? cap1(r) : r; })
      .replace(/\b(Santa|Santo) %(O|D2|D|W)\b/g, (m, a, k) => { const w = k === 'O' ? emO : k === 'D' ? vd[0] : k === 'D2' ? vd[1] : wn, f = FEMW(w); return k === 'O' ? (f ? 'Sante ' : 'Santi ') + plN(w, gOgg(w)) : (f ? 'Santa ' : 'Santo ') + w; })
      .replace(/%W/g, wn).replace(/%D2/g, vd[1]).replace(/%D/g, vd[0]).replace(/%O/g, plN(emO, gOgg(emO)));
    if (santo) fonte('folk:' + santo.id); if (storia) fonte('folk:' + storia.id); if (W) fonte('parola:' + W.id); fonte('ruolo:' + R.id);
    const vita = azioneDi(st, (fatti(st, R.id, 2).filter(f => String(f.chi) === R.id && !BANALI.test(f.v)).pop()) || {}, R.id);
    const L = [fill(rp(D.a)), fill(`${rp(D.t)}.`) + ' ' + fill(rp(D.f)) + ' ' + fill(rp(D.e)), vita && rnd() < .6 ? `Io stess${sesso(st, R.id) === 'f' ? 'a' : 'o'}, ieri, ${prima(vita)}. ${rp(['Era un segno.', 'Ed era profezia.', 'Capite?', 'Meditate.'])}` : fill(rp(D.l)), fill(rp(D.c))];
    // il modo comico di chi parla, su un pezzo del discorso: la tecnica, non la battuta (il caos vicino: il suo posto che cade a pezzi)
    const TQ = tipoQ(R), caos = (atto === 'torneo_di_carte' && rnd() < .6 ? rp(['il tavolino si spacca e le carte volano', 'una gamba del tavolino cede', 'il vento si porta via il mazzo']) : null) || caosVicino(st, n) || (R.C && rnd() < .5 ? rp(['la cappella perde un bancale', 'il telo del tetto vola via', 'una sedia crolla sotto un fedele', 'lo striscione si stacca da un lato']) : null);
    const md = modoDi(st, n, { caos }); R.modi = R.modi || {}; R.modi[md] = (R.modi[md] || 0) + 1;
    if (md !== 'base') { const k = 1 + Math.floor(rnd() * 2); L[k] = comico(st, n, L[k], { modo: md, caos, intimo: !!TQ, ietta: !!(TQ && TQ.ietta) }); }
    return L.map(x => x.replace(/\s+/g, ' ').replace(/\bda i /g, 'dai ').replace(/\bda il /g, 'dal ').replace(/\bda le /g, 'dalle ').replace(/\bda la /g, 'dalla ').replace(/\bdi i /g, 'dei ').replace(/\bdi il /g, 'del ').replace(/\?\./g, '?').replace(/!\./g, '!').trim()).filter(x => x.length <= 280);
  }
  const DISCORSI = [];
  function discorsi(st) {
    const ck = st.clock || 0;
    for (let i = 0; i < DISCORSI.length; i++) { const [t, id, testo, rid] = DISCORSI[i]; if (t > ck) continue; DISCORSI.splice(i--, 1); const n = npc(st, id); if (!n) continue;
      const u0 = S(st).ult; if (u0.includes(testo)) continue; u0.push(testo); if (u0.length > CFG.ult) u0.splice(0, u0.length - CFG.ult); FONTI = ['ruolo:' + rid]; PAROLE = []; if (dice(st, n, testo, 'discorso', registro(st, id) || 'ruolo', 'p')) stats.discorsiDetti = (stats.discorsiDetti || 0) + 1; }
  }
  // chi è chiamato col nome attaccato risponde secondo come l'ha presa
  const RISPOSTE = [];
  function rispondi(st, k) {
    const E = R0(st).eti[k.id]; if (!E || !E.attaccata || RISPOSTE.length > 3 || rnd() > .5) return;
    const g = k.pop && k.pop.sex === 'f' ? 'a' : 'o', L = E.stato === 'resiste' ? [`Non sono ${E.lab}! Smettetela!`, `Chi l'ha inventato, «${E.h}»? Ditemelo, che ci parlo io.`, `Io ho un nome, eh! Un nome vero!`, `Ancora con ${E.lab}? Basta!`]
      : E.stato === 'ironia' ? [`${cap1(E.h)}, sì. Ora pagami il caffè, figliolo.`, `Per voi ${E.lab}. Per mia madre un disgraziato.`, `${cap1(E.lab)} vi saluta e vi chiede due spiccioli.`]
      : [`${cap1(E.h)} ti benedice. Vai.`, `Sì, sono ${E.lab}. Inchinarsi è gradito.`, `Chiamatemi pure ${E.lab}. Anzi: dovete.`];
    RISPOSTE.push([(st.clock || 0) + 2.2, k.id, rp(L).replace(/\*/g, g), k.id]);
  }
  function risposte(st) { const ck = st.clock || 0; for (let i = 0; i < RISPOSTE.length; i++) { const [t, id, testo] = RISPOSTE[i]; if (t > ck) continue; RISPOSTE.splice(i--, 1); const n = npc(st, id); if (!n) continue; FONTI = ['eti:' + id]; PAROLE = []; const t2 = nuova(st, () => testo); if (t2 && dice(st, n, t2, 'risposta', registro(st, id) || 'ruolo', 'p')) stats.risposte = (stats.risposte || 0) + 1; } }
  // l'insulto coniato che si attacca: chi lo prende scappa da chi lo dice, o si vendica
  function insultoAttaccato(st, aid, chi, E) {
    const k = 'i:' + aid + ':' + E.id, RR = R0(st); RR.ins = RR.ins || {}; const c = RR.ins[k] = (RR.ins[k] || 0) + 1; if (c !== 4) return;
    const n = npc(st, aid), M = st.u.menti && st.u.menti[aid], car = (M && M.carattere) || {}; if (!n || !n.pop) return;
    if ((car.rancore || .3) + (car.orgoglio || .3) > .9 && VB()) { try { VB().fai(st, n, 'guarda_storto', { chi }, { subito: true }); } catch (e) { } stats.vendette = (stats.vendette || 0) + 1; storiaR(st, aid, 'vendetta', `${nomeDi(st, aid)} non ne può più di «${E.p.w}»: va da ${nomeDi(st, chi)} a chiarire`); }
    else { if (n.pop.need) n.pop.need.paura = Math.min(1, (n.pop.need.paura || 0) + .25); n.fleeFrom = { x: (npc(st, chi) || n).x, y: (npc(st, chi) || n).y }; n.panic = Math.max(n.panic || 0, 2); stats.fughe = (stats.fughe || 0) + 1; storiaR(st, aid, 'evita', `${nomeDi(st, aid)} evita ${nomeDi(st, chi)}: non vuole più sentirsi chiamare «${E.p.w}»`); }
  }
  US.ruoli = R0;
  // il compositore, per le prove: dominio × autorità × emblema (v: 0 il titolo del dominio, 1 quello dell'autorità, 2 col vocabolario)
  US.componi = (fk, ak, emb, fe, v, w) => { const Fam = FAMIGLIE.find(x => x.k === fk), Au = AUTORITA.find(x => x.k === ak), voc = Fam.voc[(w || 0) % Fam.voc.length];
    return v === 0 ? `${Fam.mock[(w || 0) % Fam.mock.length][fe ? 1 : 0]} ${diCap(emb, true)}` : v === 1 ? `${Au.t[fe ? 1 : 0]} ${w % 2 ? diCap(voc) : diCap(emb, true)}` : `${Fam.mock[0][fe ? 1 : 0]} ${diCap(voc)} e ${diCap(emb)}`; };
  US.REG_D = REG_D;

  // ======================= LE RIGHE: dal modello al testo =======================
  const per = (L, tipo) => L.filter(x => x[0] === '*' || x[0].split(' ').includes(tipo));
  function riempi(st, s, X) {
    return String(s)
      .replace(/\{I\}/g, () => insulto(st, X.g2)).replace(/\{Sim\}/g, () => simile(st, X.g2, 'tu')).replace(/\{M\}/g, () => minaccia(st, X.tipo, X.g2))
      .replace(/\{M2\}/g, () => azione(st, X.tipo)[0].replace(/^ti /, '')).replace(/\{m\}/g, () => azione(st, X.tipo)[0]).replace(/\{C\}/g, () => maledizione(st, X.tipo))
      .replace(/\{G\}/g, () => grigiW(st, X.n)).replace(/\{Sc\}/g, () => scusa(X)).replace(/\{N\}/g, 'Nino').replace(/\{Boast\}/g, () => vanto(st, X))
      .replace(/\{X\}/g, () => X.giuro || pkS(st, PREF.co, 'pref_co')).replace(/§/g, X.g === 'f' ? 'a' : 'o').replace(/\s{2,}/g, ' ').trim();
  }
  function riga(st, intento, X) {
    if (rnd() < CFG.genera) { let g = null; try { g = genera(st, intento, X); } catch (e) { g = null; if (Un()._ && Un()._.conta) Un()._.conta('unico.strada', e); } if (g) { g = cap1(riempi(st, g, X)); if ((intento === 'fondo' || intento === 'saluto') && rnd() < CFG.comico) try { g = comico(st, X.n, g, { intimo: !!(R0(st).R[X.n.id] && tipoQ(R0(st).R[X.n.id])) || X._mossa === 'pett', pett: X._mossa === 'pett', spiega: X._mossa === 'folk' }); } catch (e) { } return g; } }
    const L = per(P_[intento] || [], X.tipo); if (!L.length) return null;
    const v = pk(st, L, 'i_' + intento, (x, i) => i); const s = typeof v[1] === 'function' ? v[1](X) : v[1];
    return cap1(riempi(st, s, X));
  }
  function ctxDi(st, n, tipo, a) {
    const P = n.pop || {}, f = P.sex === 'f', o = { st, n, tipo, g: f ? 'f' : 'm', g2: null, job: String((P.job && (P.job.base || P.job.title)) || '').toLowerCase(), disocc: P.status === 'disoccupato', giuro: null };
    if (a && a !== st.player && a.pop) o.g2 = a.pop.sex === 'f' ? 'f' : 'm';
    if (a) o.aid = a === st.player ? 'nino' : a.id;
    try { o.giuro = giuroDi(st, n); } catch (e) { }
    return o;
  }
  // l'anti-ripetizione delle righe intere: fino a 4 prove per una riga che non è fra le ultime
  function nuova(st, fare) {
    const s = S(st); let t = null;
    for (let k = 0; k < 5; k++) { PAROLE = []; FONTI = []; t = fare(); if (t && !s.ult.includes(t)) break; }
    if (t && s.ult.includes(t)) return null;   // tutte già dette di recente: meglio la battuta di base
    if (t) { s.ult.push(t); if (s.ult.length > CFG.ult) s.ult.splice(0, s.ult.length - CFG.ult); }
    return t;
  }
  function registra(st, n, tipo, intento, modo, t, base) {
    stats.battute++; stats.perIntento[intento] = (stats.perIntento[intento] || 0) + 1; stats.perTipo[tipo] = (stats.perTipo[tipo] || 0) + 1;
    if (modo === 's') stats.sostituite++; else if (modo === 'e') stats.etichette++; else if (modo === 'p') stats.proprie++;
    LOG.push([Math.round(st.t), n ? n.id : null, tipo, intento, modo, t, PAROLE.slice(), base || null, FONTI.slice()]);
    for (const fo of FONTI) if (/^eti:/.test(fo)) try { usaEti(st, fo.slice(4), n ? n.id : null); } catch (e) { }
    if (n && intento !== 'ritorno') { const fp = FONTI.find(f => /^parola:/.test(f)), s0 = S(st); if (fp && s0.esp) try { ritorno(st, n, s0.esp[fp.slice(7)]); } catch (e) { } } if (FONTI.length) stats.dalMondo = (stats.dalMondo || 0) + 1; if (LOG.length > 3000) LOG.shift();
  }

  // ======================= L'INTENTO di una battuta che passa =======================
  const RX = [
    ['derubato', /portafoglio|ladr[oa]|giù le mani|nelle mie tasche|mi (hanno|hai) (rubato|fregato)|la mia (macchina|vespa|borsa|bici)|il mio motorino/i],
    ['colpito', /^(Mi ha colpito!|Aaah! Aiuto!|Ahia\.?|Mi hai (colpito|menato))/i],
    ['paura', /^(Aiuto!?|Non sparare!?( Ti prego!)?|Ho famiglia!|Scappate!|Tutti giù!|Sparano!|Calma, calma…|Aiuto! Stammi lontano!|Madonna santa!)$/],
    ['urtato', /^(Attento!|Ao, piano!|Ehi! Ehi!|Guarda dove vai!|Ma sei matto\?!|Ma guarda questo\.|Ma l'hai visto\?)$|guarda dove (vai|cammini)|mi hai (spinto|pestato)/i],
    ['aiutato', /^(Grazie\b|Ciao Nino! Grazie)|\bgrazie (ancora|mille|davvero|di cuore)/i],
    ['saluto', /^(Ciao|Salve|Ehi,|Ehilà|Uè|Bentornat|Eccoti)\b/i],
  ];
  function intentoDi(st, n, text, cl) {
    if (CTX) return CTX.k;
    for (const [k, re] of RX) if (re.test(text)) return k;
    if (cl === 'voce') return 'voce';
    if (cl === 'fondo') return 'fondo';
    return cl === 'te' ? 'te' : cl === 'caldo' ? 'caldo' : 'altro';
  }
  const RISSA_I = { 1: 'rissa1', 2: 'rissa2', 3: 'rissa3', 4: 'rissa4', 5: 'rissa5', 6: 'rissa5', 7: 'rissa4' };
  let CTX = null, MIO = 0;

  // ======================= IL CUORE: una battuta che è passata dalla regia =======================
  function trasforma(st, n, b, orig) {
    if (MIO || !n || !n.pop || !b || typeof b.text !== 'string' || !b.text) return;
    const text = b.text, cm = CM(), cl = cm && cm.classeDi ? cm.classeDi(b) : null;
    if (n.__ev && !(n.__ev.crescita)) return;   // le scene recitate restano come sono (le ha scritte la regia)
    if (/^[♪«]/.test(text) || text.length > 150) return;   // i canti, le citazioni, i discorsi lunghi
    if (/^(Ciao|Salve|Buongiorno|Buonasera|Ehi|Uè|Oh,)\b/i.test(text) && text.length < 60 && FK(st).nato && rnd() < .5) { const k = titolatoVicino(st, n); if (k) { const t = nuova(st, () => indirizzo(st, k, /\?$/.test(text))); if (!t) return; b.text = t; if (cm && cm._ && cm._.durata) b.until = (st.clock || 0) + cm._.durata(t) + .4; registra(st, n, registro(st, n.id) || 'paese', 'titolo', 's', t, text); return; } }
    let tipo = registro(st, n.id);
    if (!tipo) { const I = S(st).idl && S(st).idl[n.id]; if (!I || !(I.r > 0) || rnd() > I.r) return; const E = espDi(st, n.id, 'escl') || espDi(st, n.id); if (!E || /^[♪«]/.test(text) || text.length > 90) return;   // chi l'ha preso dagli amici: solo qualche parola
      const t = nuova(st, () => { usa(st, n.id, E); if (E.k === 'par') return `${diPar(st, E, 'escl', n.pop && n.pop.sex === 'f' ? 'f' : 'm')}, ${minuscola(text)}`; return E.k === 'escl' ? `${E.w.replace(/!$/, ',')} ${minuscola(text)}` : `${text.replace(/[.!?…]+$/, '')}, ${E.w}.`; }); if (!t || t.length > CFG.lungo) return;
      b.text = t; if (cm && cm._ && cm._.durata) b.until = (st.clock || 0) + cm._.durata(t) + .4; registra(st, n, 'preso', intentoDi(st, n, text, cl), 'e', t, text); return; }
    const st0 = S(st), A = CTX && CTX.a ? npc(st, CTX.a) || (CTX.a === 'nino' ? st.player : null) : null;
    let intento = n.__ev && n.__ev.crescita ? presidioIntento(st, n, orig || text) : intentoDi(st, n, text, cl);
    if (!intento) return;
    if (n.faction && (cl === 'caldo') && !CTX) return;   // le battute di combattimento delle bande sono già scritte (commedia.js §1)
    const pr = intento === 'te' ? .3 : intento === 'altro' ? .4 : CTX ? .85 : CFG.parla;
    if (rnd() > pr) return;
    const X = ctxDi(st, n, tipo, A); if (!A && (cl === 'te' || /^(urtato|derubato|colpito|paura|aiutato)$/.test(intento))) { X.g2 = 'm'; X.aid = 'nino'; }
    const ostile = /^(urtato|derubato|colpito|caldo|no|bocciato|rissa\d|contro)$/.test(intento);
    let modo = 'e', t = null;
    const pool = { saluto: 1, urtato: 1, derubato: 1, colpito: 1, paura: 1, aiutato: 1, fondo: 1, si: 1, no: 1, bocciato: 1, scusati: 1, ridi: 1, paga: 1, scappa: 1, arrenditi: 1, separa: 1, rissa2: 1 };
    const sost = intento === 'rissa2' ? .85 : intento === 'fondo' ? .6 : intento === 'si' || intento === 'bocciato' ? .7 : intento === 'no' ? .5 : .75;
    if (pool[intento] && rnd() < sost) { t = nuova(st, () => riga(st, intento, X)); if (t) modo = 's'; }
    if (!t) {
      if (intento === 'te' && text.length > 70) return;   // quello che ti dicono quando gli parli: solo se è corto (le istruzioni restano pulite)
      t = nuova(st, () => { const W = rnd() < .3 ? espDi(st, n.id, 'par') : null; if (W) { usa(st, n.id, W); return `${diPar(st, W, 'escl', X.g)}, ${minuscola(text)}`; }
        const E = rnd() < .4 ? espDi(st, n.id, 'escl') : null; if (E) { usa(st, n.id, E); return `${E.w.replace(/!$/, ',')} ${minuscola(text)}`; }
        if (X.aid && ostile && rnd() < .6) { const Q = qualita(st, n, X.aid).filter(x => !x[3]); if (Q.length) { const q = scegliQ(st, Q); fonte(q[1]); return `${text.replace(/[.!?…]+$/, '')}, ${q[0]}!`; } }
        const c = rnd() < .75 ? codaMondo(st, n, X) : null; if (c) return `${text.replace(/[.!?…]+$/, '')}${c}`;
        return etichetta(st, tipo, text, X.g2, ostile).replace(/\{G\}/g, () => grigiW(st, n)); });
      if (t && /^(?:Hai sentito|L'ho visto)/.test(text) && rnd() < .5) t = t.replace(/^(Hai sentito\?|L'ho visto io:)/, m => pkS(st, ['Minchia, ', 'Uè, ', 'Oh, porca miseria, '], 'pref_voce') + m.toLowerCase());
    }
    if (!t || t.length > CFG.lungo) return;
    b.text = t; if (cm && cm._ && cm._.durata) b.until = (st.clock || 0) + cm._.durata(t) + .4;
    registra(st, n, tipo, intento, modo, t, text);
  }
  US.trasforma = trasforma;

  // il setter della regia, avvolto (una volta per NPC). Senza regia: un setter nostro.
  const AVVOLTI = new WeakSet(); let ST = null;
  function avvolgi(n) {
    if (AVVOLTI.has(n)) return; const d = Object.getOwnPropertyDescriptor(n, 'bark'); const cm = CM();
    if (cm && !(d && d.set)) return;   // la regia non l'ha ancora preso: la prossima volta (se no la regia ci passerebbe sopra)
    AVVOLTI.add(n);
    let cur = d && !d.set ? d.value : null; const get0 = d && d.get ? d.get : () => cur, set0 = d && d.set ? d.set : v => { cur = v; };
    Object.defineProperty(n, 'bark', { configurable: true, enumerable: true, get() { return get0.call(n); },
      set(b) { const orig = b && typeof b === 'object' ? b.text : null, prima = get0.call(n); set0.call(n, b); if (!ST || !b || typeof b !== 'object' || b === prima) return; try { if (get0.call(n) === b) trasforma(ST, n, b, orig); } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.strada', e); } } });
  }
  function avvolgiTutti(st) { ST = st; if (st.npcs) for (const n of st.npcs) if (!AVVOLTI.has(n)) { avvolgi(n); if (n.first) { const w = String(n.first).split(' ')[0]; if (w.length > 2 && !/^(Il|Lo|La|Le|Gli|Un|Una|Don|Zio|Zia)$/.test(w)) MAIUSC.add(w); } } }
  // dire da sé (per la lite muta, il guasto): il fumetto normale, al più vicino al giocatore
  function dice(st, n, t, intento, tipo, modo) {
    const p = st.player; if (!t || !n || !p || n.dead || n.inside || hyp(n.x - p.x, n.y - p.y) > CFG.r) return false;
    MIO++; const caldo = caldoSu(n); try { G.say(st, n, t, Math.min(6, 2.2 + t.length / 15)); } catch (e) { return false; } finally { MIO--; caldo(); }
    if (n.bark && n.bark.text === t) { registra(st, n, tipo, intento, modo || 'p', t); return true; }
    return false;
  }

  // una battuta di lite è «calda» per la regia (commedia.js §2: non aspetta il ritmo delle chiacchiere): per il tempo della sola
  // chiamata (sincrona) chi parla ha un filo di panico, poi torna com'era
  function caldoSu(n) { if (!n || n.panic > 0 || n.aggro) return () => {}; const had = Object.prototype.hasOwnProperty.call(n, 'panic'), p0 = n.panic; n.panic = 1e-6; return () => { if (had) n.panic = p0; else delete n.panic; }; }

  // ======================= LA LITE (unico_rissa.js), da fuori =======================
  { const V = VB();
    if (V && V.EFF && V.EFF.gradino && !V.EFF.gradino.__strada) {
      const g0 = V.EFF.gradino, p0 = V.EFF.pace;
      V.EFF.gradino = function (c, g, chi) {
        const st = c && c.st, A = c && c.A, n = A && A.o; let k = null;
        try { if (st && n && n.pop) { k = registro(st, n.id); const chiV = V._ && V._.val ? V._.val(chi, c) : chi; CTX = { k: RISSA_I[+g] || 'rissa2', a: chiV, g: +g }; } } catch (e) { CTX = null; }
        const caldo = k && (+g === 2) ? caldoSu(n) : () => {};
        try { return g0.apply(this, arguments); } finally { caldo();
          try {
            // dove la rissa tace (il borbottio, la spinta, la minaccia, il colpo), chi ha il registro parla
            if (k && CTX && ((+g === 1 || +g === 3 || +g === 4 || +g === 5 || +g === 6) && rnd() < (+g === 4 ? .85 : .55))) {
              const B = npc(st, CTX.a) || (CTX.a === 'nino' ? st.player : null), X = ctxDi(st, n, k, B), int = RISSA_I[+g]; if (!B && CTX.a) X.aid = io(CTX.a);
              const t = nuova(st, () => riga(st, int, X)); if (t && t.length <= CFG.lungo && dice(st, n, t, int, k, 'p')) stats.rissa++;
            }
          } catch (e) { } CTX = null;
        }
      };
      V.EFF.gradino.__strada = true;
      if (p0) V.EFF.pace = function (c, kk, chi) {
        const st = c && c.st, n = c && c.A && c.A.o; let caldo = () => {};
        try { if (st) CTX = { k: kk, a: V._ && V._.val ? V._.val(chi, c) : chi }; if (st && n && n.pop && registro(st, n.id)) caldo = caldoSu(n); } catch (e) { CTX = null; }
        try { return p0.apply(this, arguments); } finally { caldo(); CTX = null; }
      };
    } }

  // ======================= IL PRESIDIO (unico_crescita.js): chi dice che cosa nella proposta =======================
  function presidioIntento(st, n, text) {
    const cs = st.u && st.u.costruire; if (!cs || !cs.cantieri) return null;
    for (const C of cs.cantieri) {
      const p = C.cr && C.cr.prop; if (!p || !p.righe) continue;
      const i = p.righe.findIndex(r => r[1] === n.id && r[2] === text); if (i < 0) continue;
      stats.presidio++;
      if (i === 0) return 'proponi';
      const v = p.voti && p.voti[n.id];
      if (i === p.righe.length - 1 && n.id === p.chi) return p.passa ? 'deciso' : 'bocciato';
      return v === 2 ? 'contro' : v === 1 ? 'si' : v === -1 ? 'no' : 'altro';
    }
    return null;
  }

  // ======================= CHI GUIDA (UnicoPartiVivo.dice) =======================
  { const UV = typeof UnicoPartiVivo !== 'undefined' && UnicoPartiVivo.ON ? UnicoPartiVivo : null;
    if (UV && UV.dice && !UV.dice.__strada) {
      const d0 = UV.dice;
      UV.dice = function (st, v, testo, dur, chi) {
        try {
          if (st && v && testo && hashS(seme(st) + '|auto|' + v.id) < CFG.auto && rnd() < CFG.parla + .15) {
            const B = typeof UnicoPresidio !== 'undefined' && UnicoPresidio.BATTUTE ? UnicoPresidio.BATTUTE : {};
            let q = 'auto_sbuffa'; for (const k in B) { if ((B[k].tifa || []).includes(testo)) q = 'auto_tifa'; else if (k === 'ferma' && (B[k].sbuffa || []).includes(testo)) q = 'auto_ferma'; }
            const f = hashS(seme(st) + '|autof|' + v.id) < .3, X = { st, n: { id: 'v' + v.id }, tipo: 'sb', g: f ? 'f' : 'm', g2: 'm', job: '', giuro: null };
            const t = nuova(st, () => (rnd() < .7 ? riga(st, q, X) : etichetta(st, 'sb', testo, null, q !== 'auto_tifa')));
            if (t && t.length <= CFG.lungo) { arguments[2] = t; stats.auto++; registra(st, null, 'auto', q, 's', t, testo); }
          }
        } catch (e) { }
        return d0.apply(this, arguments);
      };
      UV.dice.__strada = true;
    } }

  // ======================= I GUASTI, IL CONTAGIO (i fatti, da UnicoIdee.ascolta) =======================
  const I = ID();
  if (I && I.ascolta) I.ascolta((st, f) => {
    try {
      if (!f || !st.player) return; const s = S(st);
      if (f.v === 'guasto' && f.chi != null && (st.t - f.t) <= 6) {
        const id = Array.isArray(f.chi) ? f.chi[0] : f.chi, n = npc(st, id), k = n && registro(st, id); if (!k || rnd() > .75) return;
        const g = f.x && f.x.g, int = P_[g] ? g : 'guasto', X = ctxDi(st, n, k, null); X.cosa = cosaR(f.cosa || (f.x && f.x.cosa)) || GUASTO_N[g] || null;
        const t = nuova(st, () => (per(P_[int], k).length ? riga(st, int, X) : riga(st, 'guasto', X))); if (t && dice(st, n, t, int, k, 'p')) stats.guasti++;
      }
      // le espressioni: nascono dai fatti di chi ha il registro, passano sulle chiacchiere
      if (/^(guasto|furto|botte|spinta|insulto|minaccia|multa|fermato|sgombero|presidio_grigi|comica|lancio|pesca|beve|prestito|saldato|raccoglie|raccatta)$/.test(f.v) && f.chi != null && (st.t - f.t) < 120) nasce(st, f);
      if (f.v === 'chiacchiera' && f.chi != null && f.con && f.con[0] != null) { const a = String(Array.isArray(f.chi) ? f.chi[0] : f.chi), b = String(f.con[0]), nb = npc(st, b); if (nb && eleggibile(nb)) { passa(st, a, b); if (rnd() < .5) passa(st, b, a); } if (nb && FK(st).nato) { imparaFolk(st, a, b); if (rnd() < .4) imparaFolk(st, b, a); } }
      if (GROSSI[f.v] && (st.t - f.t) < 120 && FK(st).nato) commemora(st, f);
      if ((FATTI_FAM[f.v] || FATTI_Q[f.v]) && (st.t - f.t) < 120) soprannomina(st, f);
      if (ATTI[f.v] && f.esito !== 'no') attoFatto(st, f);
      if (f.v === 'chiacchiera' && f.chi != null && f.con && f.con[0] != null) { const a = String(Array.isArray(f.chi) ? f.chi[0] : f.chi), b = String(f.con[0]), RR = R0(st), T = FK(st).tit;
        for (const [x, y] of [[a, b], [b, a]]) if ((RR.eti[x] || T[x]) && (registro(st, y) || rnd() < .35)) usaEti(st, x, y);
        for (const id of Object.keys(RR.R)) if (RR.R[id].seg.includes(a) && rnd() < .5) usaEti(st, id, a); }
      // il registro e il giuramento del gruppo girano sulle chiacchiere
      if (f.v === 'chiacchiera' && f.chi != null && f.con && f.con.length) {
        const a = Array.isArray(f.chi) ? f.chi[0] : f.chi, b = f.con[0], ka = registro(st, a), nb = npc(st, b); if (!ka || !nb || !eleggibile(nb)) return;
        if (!s.sa[b] && rnd() < .15) { const na = npc(st, a), j = na && giuroDi(st, na); if (j) { const gid = Object.keys(s.giuri).find(k => s.giuri[k] === j); if (gid) s.sa[b] = gid; } }
        if (registro(st, b)) return;
        if (s.base > 0 && Object.values(s.reg).filter(Boolean).length < s.base * CFG.contagiMax && rnd() < CFG.contagio) { s.reg[b] = 'sb'; s.contagi++; stats.contagi++; }
      }
    } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.strada', e); }
  });

  // ======================= LA FASE =======================
  let ULT_ST = null;
  function fase(st) {
    const s = S(st); if (!s || !st.npcs) return;
    avvolgiTutti(st);
    if (st.t - (s.inv || 0) >= 60) { s.inv = Math.round(st.t); invecchia(st); }
    if (RITORNI.length) ritorni(st);
    if (st.t > 2) { const Fo = FK(st); if (!Fo.nato) semina(st); giorno(st); if (FESTE.length) brindisi(st); if (DOMANDE.length) domande(st);
      if (st.t - (s.tR || 0) >= 15) { s.tR = Math.round(st.t); ruoli(st); } if (DISCORSI.length) discorsi(st); if (RISPOSTE.length) risposte(st); }
    if (ULT_ST !== st) { ULT_ST = st; if (s.esp) for (const k in s.esp) if (s.esp[k].k === 'par') insegna(s.esp[k]); }   // dopo un caricamento Lingua le reimpara
    if (s.base < 0 && st.t > 2) { let k = 0; for (const n of st.npcs) if (n.pop && registro(st, n.id)) k++; s.base = Math.max(1, k); }
    const g = Math.floor(st.t / 1440); if (g !== s.g) { s.g = g; for (const c in s.usati) { const C = s.usati[c]; for (const k in C) { C[k] = C[k] >> 1; if (!C[k]) delete C[k]; } } }
  }
  Un().fase('unico.strada', { dopo: typeof UnicoCultura !== 'undefined' && UnicoCultura.ON ? 'unico.cultura' : 'unico.idee', budget: { p95: .02 } }, fase);
  if (Un().nasce) Un().nasce('strada', st => { S(st); });

  Object.assign(US, { S, dice, genera, qualita, eleggibile, insulto, simile, minaccia, maledizione, etichetta, riga, intentoDi, ctxDi, avvolgiTutti, P: P_, _: { presidioIntento, giuroDi, grigiW, nuova } });
  Un().Strada = US;
  return US;
})();
if (typeof window !== 'undefined') window.UnicoStrada = UnicoStrada;
