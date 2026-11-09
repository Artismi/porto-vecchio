/* [commedia] Porto Vecchio — la regia della commedia (vedi REGIA_COMMEDIA.md, commedia/TONO.md).
   Tutto dietro ?commedia: a interruttore spento questo file non fa niente. Fuori dall'impronta dei tasselli (build.py TASS_FUORI).

   FASE 1 (REGIA_COMMEDIA.md §7, «prima di aggiungere le 1.500 battute nuove»). Nessun file del gioco è toccato: tutto passa da qui,
   a caricamento, solo con Commedia.ON. Il punto d'aggancio è uno solo: ogni fumetto del gioco nasce come n.bark = {text, until}
   (game.js say, l'unica che lo scrive; G.say degli altri moduli ci arriva in fondo). Qui ogni NPC riceve una proprietà «bark» con
   un setter: la battuta nuova passa per la regia (filtra) e viene corretta, accorciata, spostata o taciuta prima di esistere.

   Le sezioni:
     §1 COMBATTIMENTO  tutte le frasi escono (game.js pesca solo le prime 4); la tribù diventa la Comune (battute.md §3)
     §2 VOLUME         le chiacchiere di fondo: una ogni 6-8 s vicino al giocatore, al massimo 3 fumetti, prima chi conta;
                       durante una scena vicina, entro 20 m, il resto tace
     §3 VOCI           la stessa voce al massimo una volta ogni 2 minuti, con parole diverse; «Tore ha picchiato Tore»
     §4 PALCOSCENICO   chi recita (n.__ev) non dice altro; i matti tengono la loro voce
     §5 LAVORO         via le frasi a stampo di popolo.js chatLine (la parentesi del mestiere, «alle 0», la suora che attacca)
     §6 OGGETTI        gli articoli giusti: «delle sigarette», «una bottiglia di vino», «una stecca di sigarette»
     §7 NOTTE          dalle 22 alle 6 niente «stamattina», «domani attacco»: frasi di notte (battute.md §2)
     §8 RITMO          durata = 1,2 s + 1 s ogni 15 caratteri (2,2-7 s), nome leggibile sopra le etichette, mai tagliato al bordo
   Non cambia lo stile del fumetto (la tavola di design è a parte): solo tempi, numero, ordine, nome a 11 px, posizione. */
(function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Commedia = { ON };
  if (typeof window !== 'undefined') window.Commedia = Commedia;
  if (typeof module !== 'undefined') module.exports = Commedia;
  if (!ON) return;
  const G = typeof Game !== 'undefined' ? Game : null;
  if (!G || !G.HOOKS) return;

  const CFG = {
    R: 26,                 // il raggio in cui main.js disegna un fumetto
    gap: [6, 8],           // §2 una chiacchiera di fondo ogni 6-8 s vicino al giocatore
    max: 3,                // §2 fumetti vivi insieme vicino al giocatore
    zitti: 20,             // §2 attorno a una scena vicina, entro 20 m, le chiacchiere tacciono
    scenaVicina: 34,       // §2 «vicina»: il centro della scena entro 34 m dal giocatore
    voce: 120,             // §3 la stessa voce al massimo una volta ogni 2 minuti vicino al giocatore
    ripeti: 180,           // §5 la stessa frase di fondo al massimo una volta ogni 3 minuti vicino al giocatore
    lontano: 45,           // §2 fra 28 e 45 m le chiacchiere di fondo tacciono (entrerebbero nel raggio ancora vive, senza regia)
    dur: [1.2, 15, 2.2, 7] // §8 durata = 1,2 + caratteri/15, fra 2,2 e 7 s
  };
  const rnd = Math.random;
  const pick = L => L[Math.floor(rnd() * L.length)];
  const hyp = Math.hypot;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const stats = Commedia.stats = { viste: 0, tolte: {}, cambiate: {}, durata: 0 };
  const tolta = k => { stats.tolte[k] = (stats.tolte[k] || 0) + 1; return null; };
  const cambiata = k => { stats.cambiate[k] = (stats.cambiate[k] || 0) + 1; };
  const notte = st => { const h = G.hour ? G.hour(st) : Math.floor(st.t / 60) % 24; return h >= 22 || h < 6; };
  const isMatto = n => !!(n && n.pop && n.pop.matto);
  const religioso = n => /\b(suor|suora|don|prete|parroco|frate|sagrestan|monaca)/i.test((n.role || '') + ' ' + (n.first || '') + ' ' + (n.name || ''));
  // un mazzo per lista: le frasi escono tutte prima di ripetersi
  const MAZZI = new Map();
  function dalMazzo(L) { let m = MAZZI.get(L); if (!m || !m.length) { m = L.map((_, i) => i).sort(() => rnd() - .5); MAZZI.set(L, m); } return L[m.pop()]; }

  // ======================= §1 COMBATTIMENTO =======================
  // game.js:1529 e :1782 pescano barksOf(n)[floor(rng*4)]: le liste sono chiuse nel modulo, ma il testo che esce è sempre una delle
  // prime 4 di COMBAT_BARKS. Qui si riconosce quel testo (e le grida della tribù di game.js:1484) e si pesca da tutta la banca della
  // fazione (battute.md §3): le prime 4, serie, escono il 55% delle volte; le altre il resto.
  const VECCHIE = {
    cop: ['Polizia! Getta l\'arma!', 'Fermo o sparo!', 'Centrale, sparatoria in corso!', 'A terra!', 'Centrale, sparatoria! Sì, lo so che è la mia pausa!', 'Ogni proiettile è un modulo da compilare, maledetto!', 'Arrenditi! Ho la suocera a cena, non ho tempo!'],
    squalo: ['Lo Squalo ti saluta!', 'Vieni fuori, Nino!', 'Sei un uomo morto!', 'Te la sei cercata!', 'Nino! Lo Squalo dice che ti vuole bene! Ma deve spararti!', 'Esci, che mia madre mi aspetta per pranzo!'],
    marsiglia: ['Tirez! Tirez!', 'Putain, il est là!', 'Crève, petit!', 'À gauche! À gauche!', 'Mais qui a pris ma baguette?! Pardon. Tirez!'],
    comune: ['Uuh-ah! Uuh-ah!', 'Carne fresca!', 'Circondatelo!', 'Il fuoco è acceso!'],
    tutela_isola: ['Fuoco! Fuoco!', 'Intruso nella zona militare!', 'Copritemi!', 'Non farlo scappare!'],
  };
  const COMBAT = {
    cop: ['Fermo! Getta l\'arma!', 'A terra! Mani sulla testa! Sulla tua, scemo!', 'Centrale, colpi d\'arma da fuoco! Mandate tutti!', 'Copritemi! Lo prendo dal vico!',
      'Ogni colpo è un verbale, stronzo! Sei pagine a colpo!', 'Mi ha sparato! A me! Ho due figli e il mutuo, stronzo!', 'Mandate rinforzi! E dite a mia moglie che il sugo lo spegne lei!',
      'Lo sai quanto costa un proiettile alla Tutela? Te lo detraggo!', 'Arrenditi e nessuno si fa male! Tranne te, un po\', in caserma!', 'Mi hai bucato il cappello! È d\'ordinanza! Me lo scalano!',
      'Sparo! Sparo davvero! ...Ferri, come si toglie la sicura?', 'Mi hai bucato la divisa nuova, stronzo! La pago io!', 'Rinforzi! E portate le sigarette! Ho finito le sigarette!',
      'Esci con le mani alzate! O come ti pare, basta che esci!', 'Copri tu, Ferri! Io copro la macchina! Da dietro! Seduto!'],
    squalo: ['Lo Squalo ti saluta!', 'Vieni fuori, Nino!', 'Te la sei cercata!', 'Giragli dietro, Tano!',
      'Vai avanti tu, Tano! Io ho la giacca nuova!', 'Vieni fuori, che ti faccio lo sconto sul funerale!', 'Mi hai sporcato la giacca! Questa la paghi a parte!',
      'Alle gambe! Sparagli alle gambe! ...Tano, quelle sono le mie!', 'Esci, dai! Mia madre ha buttato la pasta, e scuoce!', 'Te l\'abbiamo detto con le buone! Queste sono le meno buone!',
      'Dopo questa il debito raddoppia! Fai il conto tu, che non ho la penna!', 'Ti voglio bene, Nino! Ma devo spararti! Sono due cose diverse!', 'M\'hai preso, stronzo! M\'hai preso! ...No, è il sugo. Ti ammazzo!',
      'Sbrighiamoci, ho la macchina in seconda fila!', 'Rocco, non sulla vetrina! Quello paga regolare!'],
    marsiglia: ['Tirez! Tirez!', 'Il est là, putain!', 'Personne ne touche la valise!', 'À gauche! À gauche!',
      'T\'as tiré sur ma voiture?! Ma voiture! Je vais te tuer deux fois!', 'Didier! Arrête de recharger en chantant!', 'Mon pantalon! C\'était du lin! Tu vas payer!',
      'Il est où? ...Derrière toi! Non, l\'autre toi!', 'Le bateau part dans dix minutes! Tue-le vite!', 'Va\' fanculo, Italien! C\'est le seul mot que je sais!',
      'Mon dernier chargeur! Fais-toi tuer avec, au moins!', 'Didier, il m\'a touché! Je saigne! ...Non, c\'est le vin!', 'Ma mère m\'appelle ce soir! Je veux lui dire que c\'est fait!',
      'Couvre-moi! Avec les balles! Pas avec ton manteau!', 'Il ne meurt pas! Pourquoi il ne meurt pas? C\'est l\'humidité!'],
    tutela_isola: ['Intruso in zona militare!', 'Fuoco! Fuoco!', 'Copritemi!', 'Non farlo scappare!',
      'Fuoco a volontà! ...Con moderazione, il magazzino è vuoto!', 'Sentinella tre, rispondi! ...Dorme! Svegliatelo, sparano!', 'Per la Tutela! E per la licenza di Pasqua!',
      'Copritemi! Mi mancano sei mesi al congedo!', 'Liberate il cane! ...È scappato! Liberate il caporale!', 'Mamma, sono al varco! Sparano! Sì, ho mangiato! Mamma, ti richiamo!',
      'Torre due, il riflettore! Non su di me! Su di lui!', 'Mi sono pisciato addosso! Nessuno lo dica al sergente!', 'Rapporto: contatto ostile! Rapporto: ho paura! Cancella il secondo!',
      'Alt, chi va là! Rispondi! Rispondi, se no devo uscire dalla garitta!', 'Ho perso il fucile! Il fucile! Chi ha visto il mio fucile?!'],
    // la Comune (sostituisce la tribù di isola:tribu): quelli che nel '79 sono scappati sull'isola a fare la vita libera. Nessuna etnia.
    comune: ['Fuori dalla nostra terra!', 'Circondatelo!', 'Proteggete le capre!', 'Il fuoco è acceso! Tutti al fuoco!',
      'Niente denaro, niente Stato, niente te! Via!', 'Sei della Tutela? Del continente? Sei vestito male uguale!', 'Assemblea! Votiamo! ...Abbiamo votato: addosso!',
      'Pace e amore! Ma la capra non si tocca! È mia! Privata!', 'Non toccare l\'orto! L\'orto è vivo! Tu ancora per poco!', 'Sette anni che ci sentiamo osservati! Eccoti, finalmente!',
      'Mi hai calpestato i pomodori! I pomodori! Assassino!', 'Avevamo detto niente armi! Abbiamo cambiato idea nel \'79!', 'In cerchio! Come alle riunioni! Lui al centro!',
      'Chi ti manda? La Tutela? Mia madre? Rispondi!', 'Tiragli il formaggio! Quello stagionato!'],
  };
  const VECCHIA_DI = new Map(); for (const k in VECCHIE) VECCHIE[k].forEach(t => VECCHIA_DI.set(t, k));
  VECCHIA_DI.set('Prendetelo!', 'comune?');   // game.js:1484: è anche un grido qualunque; vale solo per chi è della tribù
  function chiaveCombat(n, text) {
    let k = VECCHIA_DI.get(text); if (!k) return null;
    if (k === 'comune?') { if (n.faction !== 'isola:tribu') return null; k = 'comune'; }
    if (n.faction === 'isola:tribu') k = 'comune';
    else if (n.cop) k = 'cop';
    else if (n.faction === 'squalo' || n.faction === 'marsiglia' || n.faction === 'tutela_isola') k = n.faction;
    return k;
  }
  function combatLine(n, k) {
    const L = COMBAT[k]; if (!L) return null;
    let t, i = 0; do { t = rnd() < .55 ? L[Math.floor(rnd() * 4)] : L[4 + Math.floor(rnd() * (L.length - 4))]; } while (t === n.__cmCo && ++i < 5);
    n.__cmCo = t; return t;
  }

  // ======================= §6 OGGETTI: gli articoli =======================
  // convivenza.js:190/194/271 e scambi.js:114/160 mettono il nome dell'oggetto (Oggetti.CAT[id].nome) o l'etichetta del bisogno
  // (scambi.js wants: «sigarette», «legna per la stufa») senza articolo. Qui si riconoscono quelle frasi e l'oggetto prende il suo.
  const FP = new Set('sigarette cipolle olive sarde barre pinze tronchesi forbici pile lampadine valvole penne buste garze bende siringhe fiale spugne lenzuola manette castagne acciughe mele arance noci gomme fascette molle cesoie chiavi cuffie matrici vitamine posate calze monete lattine batterie cassette pietre uova candele gallette patate'.split(' '));
  const FS = new Set('carne trave chiave rete radio ricetrasmittente foto pelle molotov calce falce dinamo legna'.split(' '));
  const MS = new Set('mitra passamontagna tirapugni tè caffè baccalà whisky'.split(' '));
  const MP = new Set('jeans transistor'.split(' '));
  const MASSA = new Set('pane verdura frutta carne pesce birra grappa whisky aranciata olio sale zucchero caffè tè lievito strutto carbonella sughero colla corda latte miele ricotta mortadella polenta marmellata burro aceto orzo vodka roba refurtiva tabacco baccalà piombo lana salsiccia salame acqua alcol detersivo candeggina disinfettante dentifricio shampoo silicone succo legna liquore pepe sapone polpo gelato'.split(' '));
  const VOC = /^[aeiouàèéìòùh]/i, SPEC = /^(s[^aeiouàèéìòù]|z|gn|ps|pn|x|y)/i;
  function genere(frase) {
    const h = frase.toLowerCase().split(/[\s']/)[0];
    const g = FP.has(h) ? 'fp' : FS.has(h) ? 'fs' : MS.has(h) ? 'ms' : MP.has(h) ? 'mp' : /a$/.test(h) ? 'fs' : /i$/.test(h) ? 'mp' : 'ms';
    return { g, massa: MASSA.has(h) && g[1] === 's', h };
  }
  const ARTICOLATO = /^(il|lo|la|i|gli|le|un|uno|una|del|dello|della|dei|degli|delle|qualcosa|qualche|un'|l'|dell'|mio|mia|tuo|tua|suo|sua|due|tre|quel|quella|questo|questa|niente|nulla)\b/i;
  function articolo(frase) {
    frase = frase.replace(/\s*\([^)]*\)/g, '').trim();   // «sacco di farina (5 kg)», «tanica d'acqua (10 l)»: la parentesi da magazzino non si dice
    if (!frase || ARTICOLATO.test(frase) || /^un'/i.test(frase)) return { frase, g: 'ms', fatto: false };
    const { g, massa } = genere(frase), v = VOC.test(frase), s = SPEC.test(frase);
    let a;
    if (massa) a = g === 'fs' ? (v ? 'dell\'' : 'della ') : (v ? 'dell\'' : s ? 'dello ' : 'del ');
    else if (g === 'fs') a = v ? 'un\'' : 'una ';
    else if (g === 'ms') a = s ? 'uno ' : 'un ';
    else if (g === 'mp') a = v || s ? 'degli ' : 'dei ';
    else a = 'delle ';
    return { frase: a + frase, g, massa, fatto: true };
  }
  // la fame, che tornava 16 volte con «Mi serve qualcosa da mangiare, sai chi ce l'ha?»
  const FAME = ['Ho una fame che mi mangerei il cane. Chi ha qualcosa?', 'Da ieri un caffè e basta. Sai chi ha da mangiare?', 'Ho fame! Mia madre ha chiuso la credenza col lucchetto!',
    'C\'ho una fame… Se vedi un panino incustodito, è mio.', 'Mi mangerei il tavolo. Con le sedie.', 'Ho saltato il pranzo. E la cena di ieri. Chi offre?'];
  const OGGETTI_T = [
    [/^(Scusa… per caso hai )(.+)(\? Mi serve proprio\. Te )lo( ripago\.)$/, 'pron'],
    [/^(Ho visto che hai )(.+)(\. Me ne daresti un po'\? Poi ti ricambio\.)$/],
    [/^(.+, una cortesia: )(.+)(\. Ne ho bisogno\.)$/],
    [/^(Sai mica dove trovo )(.+)(\? Non se ne trova\.)$/],
    [/^(Mi serve )(.+)(, se senti qualcosa dimmelo\.)$/, 'serve'],
    [/^(Cerco )(.+)( da stamattina\. Tu ne sai niente\?)$/],
    [/^(Ho )(.+)(, se ti serve te )lo( do a buon prezzo\.)$/, 'pron'],
    [/^(Ti interessa )(.+)(\? Per te faccio uno sconto\.)$/, 'serve'],
    [/^(Ti interessa )(.+)(\? Te )lo( do a poco\.)$/, 'serve pron'],
    [/^(Mi serve )(.+)(, sai chi ce )l'ha(\?)$/, 'serve chi'],
    [/^(Non trovo )(.+)( da nessuna parte\.)$/],
    [/^(Ce l'hai )(.+)(\?)$/, 'celhai'],
    [/^(Mi daresti )(.+)(\?)$/],
    [/^(Quanto vuoi per )(.+)(\?)$/],
    [/^(.+ devo portare )(.+?)( a [A-ZÀ-Ü].*\.)$/],
    [/^(.+ mi porta )(.+)(\.)$/],
  ];
  function fixOggetti(text) {
    for (const [re, k] of OGGETTI_T) {
      const m = text.match(re); if (!m) continue;
      const item = m[2];
      if (/^qualcosa da mangiare$/.test(item)) { cambiata('oggetti:fame'); return dalMazzo(FAME); }
      const A = articolo(item); if (!A.fatto && A.frase === item) return text;
      const pl = A.g[1] === 'p', pron = A.g === 'fs' ? 'la' : A.g === 'mp' ? 'li' : A.g === 'fp' ? 'le' : 'lo';
      let pre = m[1], post = m[3], tail = m[4] || '';
      if (k && /serve/.test(k) && pl) pre = pre.replace(/^Mi serve /, 'Mi servono ').replace(/^Ti interessa /, 'Ti interessano ');
      if (k && /celhai/.test(k) && (pl || A.massa)) pre = 'Hai ';
      let mid = '';
      if (k && /pron/.test(k)) mid = pron;
      if (k && /chi/.test(k)) mid = A.massa ? '' : pl ? (A.g === 'fp' ? 'le ha' : 'li ha') : (A.g === 'fs' ? 'l\'ha' : 'l\'ha');
      if (k && /chi/.test(k) && A.massa) { post = ', sai chi ne ha'; }
      cambiata('oggetti');
      return pre + A.frase + post + mid + tail;
    }
    return text;
  }

  // ======================= §5 LAVORO =======================
  // popolo.js:1885 chatLine: `Al lavoro (${P.job.title}) oggi non finiva più.`, `Domani attacco alle ${P.job.start}.` (anche «alle 0»,
  // anche la suora), «Il padrone ci mette i piedi in testa.» (17 volte in 6 minuti). Diventano un mazzo: escono tutte prima di ripetersi.
  const LAVORO = ['Il padrone ci mette i piedi in testa.', 'Otto ore in piedi! E il padrone seduto! A guardarmi!', 'Il padrone mi ha dato del lei. Mi licenzia, vedrai.',
    'Domani mi do malato. La tosse ce l\'ho già pronta.', 'Al lavoro ho rotto una cosa. Ho detto che era già rotta.', 'Mi hanno dato l\'aumento! Cinquanta lire! Già spese.',
    'Oggi il capo era malato. Il giorno più bello dell\'anno.', 'Ho chiesto le ferie. Mi ha riso in faccia. Due volte.', 'Il padrone vuole che sorrida. Con questa paga? Sorrida lui.',
    'Mi sono chiuso nel cesso del lavoro un\'ora. Record.', 'Oggi ho lavorato tantissimo. Cioè, ho guardato lavorare tantissimo.'];
  const RELIGIOSI = ['Chi ha rubato le candele? Chi?! Le conto ogni sera! Ne mancano tre!', 'Offerte! Lasciatele lì, col cestino non giro. Ho il mal di schiena.',
    'Tre ore di confessione e nessuno ha peccato! Tutti santi! Bugiardi!', 'Le suore non hanno paura. Hanno un ombrello robusto e la mira buona.',
    'Confessione? Adesso? Dimmi solo i peccati grossi, che ho il brodo.', 'Sì, io fumo! E gioco a carte con le suore! E vinco!'];
  const CODE_ATTACCO = ['', ' Che vita di merda.', ' Sveglia un\'ora prima. Ammazzatemi.', ' Cioè, alle {h} arrivo al bar.'];
  function fixLavoro(st, n, text) {
    let m;
    const stampo = /^Al lavoro \(.+\) oggi non finiva più\.$/.test(text) || text === 'Il padrone ci mette i piedi in testa.' || (m = text.match(/^Domani attacco alle (\d+)\.$/));
    if (!stampo) {
      // la suora con la figlia che si sposa, il prete col fratello: il ripiego generico di chatLine, per chi ha preso i voti, è una cosa da prete
      if (religioso(n) && /\b(mia figlia|mio figlio|mia moglie|mio marito|tuo fratello|fidanzat)/i.test(text)) { cambiata('lavoro:religioso'); return dalMazzo(RELIGIOSI); }
      return text;
    }
    if (religioso(n)) { cambiata('lavoro:religioso'); return dalMazzo(RELIGIOSI); }
    if (m) { const h = +m[1]; if (h >= 4 && h <= 11 && !notte(st) && rnd() < .5) { cambiata('lavoro:attacco'); return `Domani attacco alle ${h}.` + pick(CODE_ATTACCO).replace('{h}', h); } }
    cambiata('lavoro'); return dalMazzo(LAVORO);
  }

  // ======================= §7 NOTTE =======================
  // dalle 22 alle 6 le frasi del giorno («Stamattina alla punta abboccavano», «Domani attacco alle 7») lasciano il posto a quelle della
  // notte (battute.md §2 «di notte, durante l'Ora Quieta», per voce), più qualcuna di fondo fra loro.
  const NOTTE = {
    grigio: ['Ehi! È l\'Ora Quieta! A casa! Subito! O ti ci porto io, a calci!', 'Che fai in giro?! Documenti! Dai, non tirarli fuori, fa freddo.'],
    ragazzi: ['Zio, pure tu fuori? Shh. Adesso è tutto nostro.', 'Raga, piano. Se mia madre si sveglia sono morto.'],
    vecchia: ['Rientra, scemo! ...Ah, sei Nino. Rientra, scemo.'],
    benpensante: ['Chiamo la Guardia! Giuro! ...Chi ha il numero?'],
    reduce: ['Ehi, ragazzo! Ho perso le chiavi! Aprimi tu! Sali dal balcone!'],
    famiglia: ['Nino! Che ci fai qui di notte? Lavori? No? Allora porta i soldi!'],
    marsigliese: ['Toi! Non hai visto niente! Io ho paura del buio, voilà! Chut!'],
    prete: ['Chi canta a quest\'ora?! Smettila! O canta meglio!'],
    pescatore: ['Spostati, che esco in mare! Alle tre! Ogni notte! Che vita di merda!'],
    fondo: ['Che ore sono? ...Le undici? Mia moglie mi ammazza.', 'Ancora un bicchiere e vado. L\'ho detto anche tre bicchieri fa.', 'Zitto! Passa la ronda! ...Era un gatto. Che spavento, porca miseria.'],
  };
  const GIORNO = /(\b[Ss]tamattina\b|\b[Oo]ggi\b|Domani attacco|Buongiorno|Sabato si va|Partitella|A quanto le vende|Ieri costavano|Che belle, oggi|Domani esco all'alba|\bstasera\b|\bStasera\b|Al lavoro|padrone|Mi hanno dato l'aumento|Ho chiesto le ferie|Domani mi do malato|Otto ore in piedi)/;
  function voceDi(n) {
    const r = (n.role || '').toLowerCase(), age = (n.pop && n.pop.age) || n.age || 40, f = n.pop && n.pop.sex === 'f';
    if (n.cop) return 'grigio'; if (n.faction === 'squalo') return 'famiglia'; if (n.faction === 'marsiglia') return 'marsigliese';
    if (religioso(n)) return 'prete'; if (/pescat|portual|marinai|scaricat|gruist/.test(r)) return 'pescatore';
    if (age <= 26) return 'ragazzi'; if (age >= 65 && f) return 'vecchia'; if (age >= 55 && !f) return 'reduce';
    return 'benpensante';
  }
  function fixNotte(st, n, text) {
    if (!notte(st) || !GIORNO.test(text)) return text;
    cambiata('notte');
    const v = voceDi(n);
    return rnd() < .45 ? dalMazzo(NOTTE.fondo) : dalMazzo(NOTTE[v] || NOTTE.fondo);
  }

  // ======================= §3 VOCI =======================
  // game.js shareOne: say(sp, rumorText) = «Hai sentito? X ha dipinto un muro!» a ogni passaggio di bocca: 27 volte in piazza. Qui la stessa
  // voce (chi + cosa) si vede al massimo una volta ogni 2 minuti vicino al giocatore, con parole diverse; la forma «Hai sentito?» resta
  // in metà delle varianti (main.js la colora di blu).
  const VOCI = [
    b => `Hai sentito? ${cap(b)}!`,
    b => `Hai sentito? ${cap(b)}! E io non c'ero, che sfiga.`,
    b => `Hai sentito? ${cap(b)}! Adesso i Grigi vengono a chiedere a me!`,
    b => `Hai sentito? ${cap(b)}! L'ha detto mia cugina. Lei sa tutto.`,
    b => `${cap(b)}! Giuro! Me l'ha detto il barbiere!`,
    b => `Oh! ${cap(b)}! E a me non mi chiama mai nessuno.`,
    b => `Lo sai che ${b}? Io l'ho già detto a tutti. Tre volte.`,
    b => `${cap(b)}! E io dormivo! Perché mi perdo sempre tutto?!`,
    b => `Indovina! ${cap(b)}! ...Non hai indovinato, eh?`,
  ];
  const VERBI_SU = /^(\S+) ha (scippato|picchiato|investito|provato a comprare|aiutato|sparato a|ammazzato|rapinato) (\S+)$/;
  // «Tore ha picchiato Tore»: in città ci sono tre Tore. Se sono due persone diverse con lo stesso nome, «un altro Tore»; se è
  // davvero la stessa (actor = target), la voce non si dice.
  function chiStessi(st, n, body) {
    const m = body.match(VERBI_SU); if (!m || m[1] !== m[3]) return body;
    const L = (st.links || []).filter(l => l.a === n.id).pop();
    if (L) {
      const mem = (n.mem || []).filter(x => x.actor === L.actor && (x.type === L.type || ({ scippo: 'aggressione', investimento: 'aggressione', ferimento: 'omicidio' })[x.type] === L.type)).sort((a, b) => b.t - a.t)[0];
      if (mem && mem.target === mem.actor) return null;
    } else return null;
    cambiata('voci:omonimi');
    return `${m[1]} ha ${m[2]} un altro ${m[3]}`;
  }
  const chiaveVoce = body => body.toLowerCase().replace(/[.!?,]/g, '').split(/\s+/).slice(0, 4).join(' ');
  // ritorna {text, key} o null (da tacere)
  function fixVoce(st, n, text) {
    let m = text.match(/^Hai sentito\? (.+)!$/);
    if (m) {
      const body = chiStessi(st, n, m[1]); if (body === null) return null;
      const t = rnd() < .2 ? `Hai sentito? ${cap(body)}!` : dalMazzo(VOCI)(body);
      if (t !== text) cambiata('voci');
      return { text: t, key: chiaveVoce(body) };
    }
    // matti.js voce(): il primo fumetto della conversazione su un fatto vero
    m = text.match(/^(?:(?:Fra|Zio|Oi|Oh|Senti), )?(?:[Hh]ai sentito\? |[Ll]'ho visto io: )(.+?)\.$/);
    if (m) {
      let body = m[1]; const v = body.match(/^(\S+) ha (\S+(?: a)?) (\S+)(.*)$/);
      if (v && v[1] === v[3]) { text = text.replace(`${v[1]} ha ${v[2]} ${v[3]}`, `${v[1]} ha ${v[2]} un altro ${v[3]}`); cambiata('voci:omonimi'); }
      return { text, key: chiaveVoce(body) };
    }
    return { text, key: null };
  }
  const eVoce = t => /^Hai sentito\? .+!$/.test(t) || /^(?:(?:Fra|Zio|Oi|Oh|Senti), )?(?:[Hh]ai sentito\? |[Ll]'ho visto io: )/.test(t);

  // ======================= §8 RITMO: la durata =======================
  const durata = text => clamp(CFG.dur[0] + String(text).length / CFG.dur[1], CFG.dur[2], CFG.dur[3]);

  // ======================= §2 §4 VOLUME E PALCOSCENICO =======================
  // Da dove viene una battuta, visto che il setter non lo sa: dallo stato di chi parla e dal testo.
  //   scena   chi recita (n.__ev): eventi.js lascia passare solo le battute della scena (G.say tace per gli attori)
  //   te      rivolte al giocatore: le visite (n.__ap, convivenza), quello che risponde quando gli parli (G.talk), chi ti ha visto
  //           (game.js maybeBark), lo scrocco, le manie e la sedia con le rotelle (matti.js, a 4 m), le reazioni a quello che fai
  //   caldo   chi combatte, scappa, insegue, ha paura, i Grigi e le fazioni in azione
  //   matto   le battute dei 5 matti (matti.js MATTI)
  //   fram    i frammenti a due voci di matti.js (si decide alla prima battuta; le altre seguono)
  //   voce    le voci (game.js shareOne, matti.js voce)
  //   fondo   tutto il resto: chatLine di popolo.js, azioni.js social, scambi.js, i saluti fra loro
  const PRIO = { scena: 4, te: 4, caldo: 3, matto: 3, fram2: 2, fram: 1, voce: 1, fondo: 1 };
  const REAZIONI = new Set(['Che succede laggiù?', 'Ma cosa…', 'Hai sentito?', 'Sparano!', 'Aiuto!', 'Tutti giù!', 'Madonna santa!', 'Scappate!', 'Mi ha colpito!', 'Aaah! Aiuto!', 'Non sparare!',
    'Non sparare! Ti prego!', 'Ho famiglia!', 'Calma, calma…', 'Aiuto! Stammi lontano!', 'Meglio girare al largo…', 'Sei tu che vai in giro a parlare di me, eh?', 'Io non ho visto niente, eh.',
    'Ciao Nino! Grazie ancora.', 'Questa è per le voci che metti in giro!', 'Agente, devo dirle una cosa.', 'Il portafoglio! Chi è stato?', 'Fermo! Polizia!', 'Esco anch\'io. Dov\'è?',
    'Zona militare della Tutela! Torna indietro!', 'Hé! Toi! Reste loin. Stai lontano!', 'Rinforzi sul posto! Dov\'è?',
    'Attento!', 'Ma sei matto?!', 'Mannaggia!', 'Ao, piano!', 'Ehi! Ehi!', 'Guarda dove vai!', 'Ammazza!', 'Ma l\'hai visto?', 'Bravo!', 'Uh, che volo.', 'Questo è matto.', 'Rifallo!',
    'Ragazzi d\'oggi...', 'Si romperà l\'osso del collo.', 'Ma guarda questo.', 'Ahahah!', 'Ahia.', 'Tutto a posto?', 'Si è stampato.']);
  const GRIGI_FONDO = new Set(['Va bene. Circolare.', 'In regola. Vada pure.', 'Documenti, prego.', 'Un controllo. I documenti.', 'Lei. Venga qui. Documenti.', 'Alt. Coprifuoco. Documenti.', 'Dove va a quest\'ora? Documenti.', 'Fermo lì. Mani in vista.']);
  const A_TE = /^(Ti ho visto: |.+ dice che (hai|mi hai) |Ho sentito che (hai|mi hai) )/;
  let CTX_TE = 0, ST = null, MQ = [];
  let MATTI_TXT = null, TE_TXT = null;
  function banche() {
    if (MATTI_TXT) return;
    MATTI_TXT = new Set(); TE_TXT = new Set();
    const M = typeof Matti !== 'undefined' ? Matti : null; if (!M) return;
    const tutte = (o, S) => { if (typeof o === 'string') S.add(o); else if (Array.isArray(o)) o.forEach(x => tutte(x, S)); else if (o && typeof o === 'object') for (const k in o) if (typeof o[k] !== 'function') tutte(o[k], S); };
    for (const k in M.MATTI || {}) { const D = M.MATTI[k]; for (const q in D) if (Array.isArray(D[q])) tutte(D[q], MATTI_TXT); }
    tutte(M.SCROCCO, TE_TXT); tutte(M.ROTELLE, TE_TXT); for (const k in M.MANIE || {}) tutte(M.MANIE[k].passa, TE_TXT);
  }
  function classe(st, n, text) {
    banche();
    if (n.__ev) return 'scena';
    if (CTX_TE || n.__ap || TE_TXT.has(text) || A_TE.test(text)) return 'te';
    if (REAZIONI.has(text) || chiaveCombat(n, text)) return 'caldo';
    const a = n.action && n.action.name;
    if (n.panic > 0 || n.aggro || ['affronta', 'insegue', 'fugge', 'combatte', 'arresta'].includes(a)) return 'caldo';
    if (isMatto(n) && MATTI_TXT.has(text)) return 'matto';
    const q = MQ.find(x => x.id === n.id && x.text === text);
    if (q) return q.at === q.g ? 'fram' : 'fram2';
    if (eVoce(text)) return 'voce';
    if (n.cop && GRIGI_FONDO.has(text)) return 'fondo';   // ordine.js:453, il controllo a un passante qualunque: routine, non azione
    if (n.cop || n.faction) return 'caldo';
    return 'fondo';
  }
  const R = { lastAmb: -1e9, gap: CFG.gap[0], visto: new Map(), voci: new Map(), fram: new Map() };
  Commedia.R = R;
  const PR = new WeakMap(), CL = new WeakMap();   // la priorità e la classe di ogni fumetto vivo
  Commedia.classeDi = b => CL.get(b);
  function vivi(st, except) {
    const p = st.player, out = [];
    for (const k of st.npcs) {
      if (k === except || k.dead) continue; const b = k.bark;
      if (!b || !(b.until > st.clock) || (k.inside && !p.indoor)) continue;
      const d = hyp(k.x - p.x, k.y - p.y); if (d < CFG.R) out.push({ n: k, b, d, pr: PR.get(b) || 1 });
    }
    return out;
  }
  function scenaVicina(st, n) {
    const E = typeof Eventi !== 'undefined' && Eventi.S ? Eventi.S(st) : null; if (!E || !E.live) return null; const p = st.player;
    for (const sc of E.live) { const s = sc.spot; if (!s || (sc.cast || []).includes(n)) continue; if (hyp(s.x - p.x, s.y - p.y) < CFG.scenaVicina && hyp(n.x - s.x, n.y - s.y) < CFG.zitti) return sc; }
    return null;
  }
  // fa posto a una battuta importante: si spegne il fumetto vivo meno importante (a parità, il più lontano)
  function faiPosto(st, n, pr, d) {
    const V = vivi(st, n); if (V.length < CFG.max) return true;
    V.sort((a, b) => a.pr - b.pr || b.d - a.d);
    const w = V[0]; if (w.pr < pr || (w.pr === pr && w.d > d)) { w.b.until = st.clock; tolta('spento:' + (w.pr)); return true; }
    return false;
  }

  // ======================= IL FILTRO =======================
  function filtra(st, n, b) {
    let text = String(b.text || ''); if (!text) return b;
    const p = st.player, d = hyp(n.x - p.x, n.y - p.y), vis = d < CFG.R + 2 && !(n.inside && !p.indoor);
    let cl = classe(st, n, text);
    // §1 combattimento
    const ck = chiaveCombat(n, text);
    if (ck) { const t = combatLine(n, ck); if (t) { text = t; cambiata('combattimento'); } }
    // §4 il palcoscenico: chi recita non dice voci né chiacchiere; i matti non dicono le chiacchiere di tutti
    if (n.__ev && (/^Hai sentito\? .+!$/.test(text) || MQ.some(x => x.id === n.id && x.text === text))) return tolta('scena:voce');
    if (isMatto(n) && !n.__ev && (cl === 'fondo' || cl === 'voce' || cl === 'fram' || cl === 'fram2')) return tolta('matto:fuori voce');
    // §5 §6 §7 i testi
    if (cl !== 'scena' && cl !== 'matto' && cl !== 'caldo') { text = fixLavoro(st, n, text); text = fixOggetti(text); text = fixNotte(st, n, text); }
    // §3 le voci
    let key = null;
    if (cl === 'voce' || cl === 'fram') { const v = fixVoce(st, n, text); if (!v) return tolta('voce:se stesso'); text = v.text; key = v.key; }
    const q = (cl === 'fram' || cl === 'fram2') ? MQ.find(x => x.id === n.id && x.text === b.text) : null;
    if (vis) {
      if (cl === 'fram2') {
        const ok = q && R.fram.get(q.g); if (!ok) return tolta('fram:seguito');
        faiPosto(st, n, PRIO.fram2, d);
      } else if (PRIO[cl] === 1) {
        const no = (() => {
          if (scenaVicina(st, n)) return 'fondo:scena vicina';
          if (st.clock - R.lastAmb < R.gap) return 'fondo:ritmo';
          if (vivi(st, n).length >= CFG.max) return 'fondo:troppi';
          if (key) { const t0 = R.voci.get(key); if (t0 !== undefined && st.clock - t0 < CFG.voce) return 'voce:già detta'; }
          const t1 = R.visto.get(text); if (t1 !== undefined && st.clock - t1 < CFG.ripeti) return 'fondo:ripetuta';
          return null;
        })();
        if (q) R.fram.set(q.g, !no);
        if (no) return tolta(no);
        R.lastAmb = st.clock; R.gap = CFG.gap[0] + rnd() * (CFG.gap[1] - CFG.gap[0]);
        if (key) R.voci.set(key, st.clock);
      } else faiPosto(st, n, PRIO[cl], d);
      R.visto.set(text, st.clock);
      if (R.visto.size > 400) { for (const [k, t] of R.visto) if (st.clock - t > CFG.ripeti) R.visto.delete(k); }
      stats.viste++;
    } else {
      if (q && cl === 'fram') R.fram.set(q.g, false);   // un frammento lontano non si sente: le altre battute nemmeno
      // una chiacchiera appena fuori dal raggio arriverebbe in quadro ancora viva (chi parla cammina, il giocatore pure) e senza regia
      if (PRIO[cl] === 1 && d < CFG.lontano && !(n.inside && !p.indoor)) return tolta('fondo:lontano');
      // chi è dentro un edificio mentre il giocatore è fuori non si vede (main.js non lo disegna): la sua chiacchiera non serve
      if (PRIO[cl] === 1 && n.inside && !p.indoor && d < CFG.lontano) return tolta('fondo:dentro');
    }
    // §8 la durata secondo la lunghezza
    b.text = text; b.until = st.clock + durata(text); stats.durata++;
    PR.set(b, PRIO[cl] || 1); CL.set(b, cl);
    return b;
  }
  Commedia.filtra = filtra;

  // ======================= L'AGGANCIO =======================
  // ogni NPC: «bark» diventa una proprietà con setter (game.js say, l'unico che la scrive). n.bark = null passa com'è.
  const FATTI = new WeakSet();
  function aggancia(n) {
    if (!n || FATTI.has(n)) return; FATTI.add(n);
    let cur = n.bark;
    Object.defineProperty(n, 'bark', { configurable: true, enumerable: true, get() { return cur; },
      set(b) { if (!b || typeof b !== 'object' || !ST || b === cur) { cur = b; return; } let r = null; try { r = filtra(ST, n, b); } catch (e) { r = b; if (!filtra.err) { filtra.err = 1; console.warn('[Commedia]', e); } } if (r) cur = r; } });
  }
  function agganciaTutti(st) { if (st.npcs) for (const n of st.npcs) if (!FATTI.has(n)) aggancia(n); }
  { const c0 = G.HOOKS.create; G.HOOKS.create = st => { if (c0) c0(st); ST = st; agganciaTutti(st); }; }
  { const s0 = G.HOOKS.step; G.HOOKS.step = (st, dt) => {
      ST = st; agganciaTutti(st);
      // la coda dei frammenti di matti.js, com'è prima che matti.js la consumi: dice a filtra chi sta parlando in un frammento
      const M = typeof Matti !== 'undefined' && Matti.S ? Matti.S(st) : null; MQ = M && M.q ? M.q.slice() : [];
      if (s0) s0(st, dt);
    }; }
  // quello che dice quando gli parli tu è rivolto a te
  for (const f of ['talk', 'talkChoice', 'act']) { const f0 = G[f]; if (typeof f0 === 'function') G[f] = function () { CTX_TE++; try { if (arguments[0]) { ST = arguments[0]; agganciaTutti(ST); } return f0.apply(this, arguments); } finally { CTX_TE--; } }; }

  // ======================= §8 RITMO: il fumetto nella pagina =======================
  // il nome di chi parla a 11 px (era 9) e sopra le etichette delle porte; il fumetto non esce dallo schermo.
  if (typeof document !== 'undefined') {
    const css = document.createElement('style'); css.id = 'commedia-css';
    css.textContent = '#bubbles .bub .who { font-size: 11px; line-height: 1.2; margin-bottom: 2px; }';
    (document.head || document.documentElement).appendChild(css);
    // le etichette delle porte («▸ Casa Porcu», risacca_ui.js #rs-labels) stavano in un livello sopra #bubbles: il livello delle
    // etichette passa subito sotto quello dei fumetti (stessa scatola, stesse coordinate)
    const sposta = () => { const L = document.getElementById('rs-labels'), B = document.getElementById('bubbles'); if (!L || !B) return false; if (L.nextElementSibling !== B) B.parentNode.insertBefore(L, B); return true; };
    const tSp = setInterval(() => { if (sposta()) clearInterval(tSp); }, 500);
    // main.js bubSet mette la posizione in transform (translate(X,Y) translate(-50%,-100%)) e la riscrive solo quando cambia: qui,
    // dopo ogni riscrittura, il fumetto si tiene dentro lo schermo (6 px di margine). Le etichette e le icone non si toccano.
    const M0 = 6;
    const orig = el => `translate(${el.__x}px,${el.__y}px) translate(-50%,${el.__r === undefined ? '-100%' : '-50%'})` + (el.__r === undefined ? '' : ` rotate(${el.__r}rad)`);
    function dentro(el) {
      if (!el || el.nodeType !== 1 || el.parentNode !== layer) return;
      if (!el.classList.contains('bub')) { if (el.__cmT) { el.__cmT = null; if (el.__x !== undefined) el.style.transform = orig(el); } return; }
      if (el.hidden || el.__x === undefined) return;
      const W = layer.clientWidth, H = layer.clientHeight, w = el.offsetWidth, h = el.offsetHeight;
      const X = clamp(el.__x, w / 2 + M0, Math.max(w / 2 + M0, W - w / 2 - M0)), Y = clamp(el.__y, h + M0, Math.max(h + M0, H - M0));
      const t = X === el.__x && Y === el.__y ? orig(el) : `translate(${X}px,${Y}px) translate(-50%,-100%)`;
      if (el.style.transform !== t) { el.__cmT = t; el.style.transform = t; }
    }
    let layer = null;
    const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(R => {
      const S = new Set(); for (const r of R) { let t = r.target; while (t && t.parentNode !== layer) t = t.parentNode; if (t) S.add(t); }
      S.forEach(dentro);
    }) : null;
    const tB = setInterval(() => { layer = document.getElementById('bubbles'); if (!layer || !mo) return; clearInterval(tB); mo.observe(layer, { attributes: true, attributeFilter: ['style', 'class'], childList: true, subtree: true, characterData: true }); }, 300);
  }

  // per le prove (test_commedia.js)
  Commedia._ = { CFG, COMBAT, VECCHIE, chiaveCombat, combatLine, articolo, fixOggetti, fixLavoro, fixNotte, fixVoce, chiStessi, durata, classe, VOCI, LAVORO, NOTTE, FAME };
})();
