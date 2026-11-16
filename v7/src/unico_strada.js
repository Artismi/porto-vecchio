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
  if (!G || !Un()) { US.ON = false; return US; }
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = () => Un().flusso('strada');
  const hashS = s => { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const CFG = US.CFG = {
    quota: DIAL >= 2 ? 2.1 : 1,        // quanta gente ha il registro (moltiplica la probabilità)
    parla: DIAL >= 2 ? .8 : .62,       // quante delle loro battute passano dal registro
    sost: .5,                          // fra quelle: quante cambiano del tutto (il resto: la base con l'etichetta)
    auto: DIAL >= 2 ? .45 : .26,       // gli automobilisti sboccati
    contagio: .08, contagiMax: 1.35,   // il registro passa sulle chiacchiere, fino a 1,35 volte la quota di partenza
    lungo: 124, ult: 90, r: 26,
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
  let PAROLE = [];   // le parole di insulto usate nella riga che si sta facendo (per la prova della varietà)

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
  const MAIUSC = new Set(['Nino', 'Grigi', 'Dio', 'San', 'Santa', 'Sant', 'Marsiglia', 'Squalo', 'Flamingo', 'Gesù', 'Madonna', 'Signore', 'Tutela', 'Calata', 'Lei']);
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
    const base = w || 'i Grigi', r = rnd();
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
    const L = per(P_[intento] || [], X.tipo); if (!L.length) return null;
    const v = pk(st, L, 'i_' + intento, (x, i) => i); const s = typeof v[1] === 'function' ? v[1](X) : v[1];
    return cap1(riempi(st, s, X));
  }
  function ctxDi(st, n, tipo, a) {
    const P = n.pop || {}, f = P.sex === 'f', o = { st, n, tipo, g: f ? 'f' : 'm', g2: null, job: String((P.job && (P.job.base || P.job.title)) || '').toLowerCase(), disocc: P.status === 'disoccupato', giuro: null };
    if (a && a !== st.player && a.pop) o.g2 = a.pop.sex === 'f' ? 'f' : 'm';
    try { o.giuro = giuroDi(st, n); } catch (e) { }
    return o;
  }
  // l'anti-ripetizione delle righe intere: fino a 4 prove per una riga che non è fra le ultime
  function nuova(st, fare) {
    const s = S(st); let t = null;
    for (let k = 0; k < 5; k++) { PAROLE = []; t = fare(); if (t && !s.ult.includes(t)) break; }
    if (t && s.ult.includes(t)) return null;   // tutte già dette di recente: meglio la battuta di base
    if (t) { s.ult.push(t); if (s.ult.length > CFG.ult) s.ult.splice(0, s.ult.length - CFG.ult); }
    return t;
  }
  function registra(st, n, tipo, intento, modo, t, base) {
    stats.battute++; stats.perIntento[intento] = (stats.perIntento[intento] || 0) + 1; stats.perTipo[tipo] = (stats.perTipo[tipo] || 0) + 1;
    if (modo === 's') stats.sostituite++; else if (modo === 'e') stats.etichette++; else if (modo === 'p') stats.proprie++;
    LOG.push([Math.round(st.t), n ? n.id : null, tipo, intento, modo, t, PAROLE.slice(), base || null]); if (LOG.length > 3000) LOG.shift();
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
    const tipo = registro(st, n.id); if (!tipo) return;
    const st0 = S(st), A = CTX && CTX.a ? npc(st, CTX.a) || (CTX.a === 'nino' ? st.player : null) : null;
    let intento = n.__ev && n.__ev.crescita ? presidioIntento(st, n, orig || text) : intentoDi(st, n, text, cl);
    if (!intento) return;
    if (n.faction && (cl === 'caldo') && !CTX) return;   // le battute di combattimento delle bande sono già scritte (commedia.js §1)
    const pr = intento === 'te' ? .3 : intento === 'altro' ? .4 : CTX ? .85 : CFG.parla;
    if (rnd() > pr) return;
    const X = ctxDi(st, n, tipo, A); if (!A && (cl === 'te' || /^(urtato|derubato|colpito|paura|aiutato)$/.test(intento))) X.g2 = 'm';
    const ostile = /^(urtato|derubato|colpito|caldo|no|bocciato|rissa\d|contro)$/.test(intento);
    let modo = 'e', t = null;
    const pool = { saluto: 1, urtato: 1, derubato: 1, colpito: 1, paura: 1, aiutato: 1, fondo: 1, si: 1, no: 1, bocciato: 1, scusati: 1, ridi: 1, paga: 1, scappa: 1, arrenditi: 1, separa: 1, rissa2: 1 };
    const sost = intento === 'rissa2' ? .8 : intento === 'fondo' ? .45 : intento === 'si' || intento === 'bocciato' ? .7 : intento === 'no' ? .5 : CFG.sost;
    if (pool[intento] && rnd() < sost) { t = nuova(st, () => riga(st, intento, X)); if (t) modo = 's'; }
    if (!t) {
      if (intento === 'te' && text.length > 70) return;   // quello che ti dicono quando gli parli: solo se è corto (le istruzioni restano pulite)
      t = nuova(st, () => etichetta(st, tipo, text, X.g2, ostile).replace(/\{G\}/g, () => grigiW(st, n)));
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
              const B = npc(st, CTX.a) || (CTX.a === 'nino' ? st.player : null), X = ctxDi(st, n, k, B), int = RISSA_I[+g];
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
        const g = f.x && f.x.g, int = P_[g] ? g : 'guasto', X = ctxDi(st, n, k, null);
        const t = nuova(st, () => (per(P_[int], k).length ? riga(st, int, X) : riga(st, 'guasto', X))); if (t && dice(st, n, t, int, k, 'p')) stats.guasti++;
      }
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
  function fase(st) {
    const s = S(st); if (!s || !st.npcs) return;
    avvolgiTutti(st);
    if (s.base < 0 && st.t > 2) { let k = 0; for (const n of st.npcs) if (n.pop && registro(st, n.id)) k++; s.base = Math.max(1, k); }
    const g = Math.floor(st.t / 1440); if (g !== s.g) { s.g = g; for (const c in s.usati) { const C = s.usati[c]; for (const k in C) { C[k] = C[k] >> 1; if (!C[k]) delete C[k]; } } }
  }
  Un().fase('unico.strada', { dopo: typeof UnicoCultura !== 'undefined' && UnicoCultura.ON ? 'unico.cultura' : 'unico.idee', budget: { p95: .02 } }, fase);
  if (Un().nasce) Un().nasce('strada', st => { S(st); });

  Object.assign(US, { S, dice, eleggibile, insulto, simile, minaccia, maledizione, etichetta, riga, intentoDi, ctxDi, avvolgiTutti, P: P_, _: { presidioIntento, giuroDi, grigiW, nuova } });
  Un().Strada = US;
  return US;
})();
if (typeof window !== 'undefined') window.UnicoStrada = UnicoStrada;
