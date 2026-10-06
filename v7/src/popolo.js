/* Porto Vecchio — Il Popolo (solo logica, nessuna grafica).
   Gli abitanti dell'isola: famiglie nelle case, lavoratori nelle botteghe, pensionati, disoccupati,
   piccola criminalità, ricettatori, trafficanti, Orecchi. Ognuno ha casa, mestiere con orario d'ingresso,
   puntualità, soldi, affitto, debiti, parenti e amici, un diario, appuntamenti e una settimana fatta di
   giorni diversi (mercato, messa, paga, Bollettino, Ora Quieta).
   La popolazione si costruisce dalla mappa (case e botteghe di World): se la città cresce, cresce anche lei.
   Simulazione a due livelli: chi è vicino al giocatore vive per intero nel motore (percorsi, reazioni,
   passaparola); chi è lontano segue gli orari e si sposta di colpo, senza percorsi né grafica.
   Si aggancia a Game.HOOKS dopo la Risacca, concatenando gli agganci che trova. */
var Popolo = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const W = typeof World !== 'undefined' ? World : require('./world.js');
  const RS = () => (typeof Risacca !== 'undefined' ? Risacca : null);
  const TS = G.TS, PLACES = G.PLACES, MPS = G.MIN_PER_SEC;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // ---------------- REGOLAZIONI ----------------
  const CFG = {
    max: 420,          // abitanti al massimo (la mappa ne può offrire di più)
    near: 52,          // entro questa distanza dal giocatore si vive per intero (m)
    far: 66,           // oltre questa si torna al livello leggero (isteresi)
    maxNear: 70,       // quanti al massimo a pieno contemporaneamente
    lodEvery: .5,      // secondi reali tra due controlli di distanza
    talkEvery: 15,     // minuti di gioco tra due giri di chiacchiere lontane
    maxProj: 2,        // progetti in testa contemporaneamente
    mind: null,        // (st, n, riassunto) => … : qui si aggancerà il modello linguistico per la riflessione notturna
  };

  // ---------------- CALENDARIO ----------------
  // la partita comincia martedì alle 18: il giorno 0 è un martedì
  const WEEK = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
  const dayIdx = t => Math.floor(t / 1440);
  const weekday = t => (dayIdx(t) + 1) % 7;          // 0 = lunedì
  const wdName = t => WEEK[weekday(t)];
  const minOfDay = t => ((t % 1440) + 1440) % 1440;
  const hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(Math.floor(m % 60)).padStart(2, '0');
  // quando è successa una cosa, detto come lo direbbe una persona
  function ago(st, t) {
    const d = dayIdx(st.t) - dayIdx(t), h = Math.floor(minOfDay(t) / 60);
    const part = h < 6 ? 'notte' : h < 12 ? 'mattina' : h < 18 ? 'pomeriggio' : 'sera';
    if (d === 0) { const m = st.t - t; return m < 50 ? 'poco fa' : part === 'mattina' ? 'stamattina' : part === 'notte' ? 'stanotte' : part === 'sera' ? 'stasera' : 'oggi pomeriggio'; }
    if (d === 1) return part === 'sera' || part === 'notte' ? 'ieri sera' : `ieri ${part === 'mattina' ? 'mattina' : 'pomeriggio'}`;
    if (d < 7) return WEEK[weekday(t)];
    return `${d} giorni fa`;
  }
  // l'Ora Quieta: coprifuoco dalle 24 alle 5, dalle 22 quando la repressione è alta
  function curfewFrom(st) { const R = st.ris; const rl = R ? Math.min(5, Math.floor(R.repr / 20)) : 0; return rl >= 4 ? 22 * 60 : 24 * 60; }
  // eventi ricorrenti della settimana: [giorno (0 lun … 6 dom, -1 tutti), dalle, alle, id, luogo, nome]
  const RECURRING = [
    [-1, 6 * 60, 8 * 60, 'pesce', 'molo', 'Asta del pesce al molo'],
    [0, 9 * 60, 10 * 60, 'bollettino', 'piazza', 'Lettura del Bollettino della Tutela (presenza obbligatoria)'],
    [2, 7 * 60, 13 * 60, 'mercato', 'piazza', 'Mercato rionale in piazza'],
    [5, 7 * 60, 13 * 60, 'mercato', 'piazza', 'Mercato rionale in piazza'],
    [3, 21 * 60, 23 * 60, 'tombola', 'circolo', 'Tombola al Circolo dei Lavoratori'],
    [4, 18 * 60, 19 * 60, 'paga', null, 'Venerdì: si ritira la paga della settimana'],
    [0, 8 * 60, 9 * 60, 'affitto', null, 'Lunedì: si paga l\'affitto'],
    [5, 22 * 60, 27 * 60, 'sabato', 'disco', 'Sabato sera alla Discoteca Luna'],
    [6, 10 * 60, 11 * 60, 'messa', 'chiesa', 'Messa grande della domenica'],
    [6, 17 * 60, 20 * 60, 'struscio', 'lungomare', 'Passeggiata della domenica sul lungomare'],
    [-1, 18 * 60, 19 * 60, 'vespro', 'chiesa', 'Vespro a San Rocco'],
  ];
  function eventsOn(st, day) { const wd = (day + 1) % 7; return RECURRING.filter(e => e[0] === -1 || e[0] === wd); }

  // ---------------- NOMI E ASPETTO ----------------
  const NOMI_M = ['Antonio', 'Giovanni', 'Salvatore', 'Giuseppe', 'Efisio', 'Gavino', 'Bachisio', 'Mario', 'Franco', 'Bruno', 'Enzo', 'Nello', 'Totò', 'Pasquale', 'Raimondo', 'Ignazio', 'Luigi', 'Sergio', 'Piero', 'Aldo', 'Gianni', 'Paolo', 'Marco', 'Stefano', 'Roberto', 'Claudio', 'Tore', 'Peppino', 'Michele', 'Carmine', 'Renato', 'Fausto', 'Dario', 'Lino', 'Ugo', 'Elio', 'Mauro', 'Angelo', 'Vittorio', 'Cosimo'];
  const NOMI_F = ['Maria', 'Giovanna', 'Anna', 'Rosaria', 'Tina', 'Lella', 'Pina', 'Bonaria', 'Grazia', 'Antonietta', 'Franca', 'Carmela', 'Teresa', 'Lucia', 'Paola', 'Marisa', 'Rita', 'Silvana', 'Luisa', 'Ornella', 'Giuseppina', 'Assunta', 'Caterina', 'Elisa', 'Laura', 'Daniela', 'Sandra', 'Gina', 'Ada', 'Nives', 'Iolanda', 'Wanda', 'Loredana', 'Patrizia', 'Clara', 'Mirella'];
  const COGNOMI = ['Esposito', 'Russo', 'Ferrara', 'Greco', 'Marino', 'Rizzo', 'Lombardi', 'Gallo', 'Costa', 'Fontana', 'Conti', 'De Luca', 'Mancini', 'Caruso', 'Serra', 'Pinna', 'Sanna', 'Melis', 'Deiana', 'Murru', 'Piras', 'Loi', 'Cocco', 'Porcu', 'Fadda', 'Atzori', 'Mura', 'Lai', 'Usai', 'Carta', 'Puddu', 'Floris', 'Manca', 'Cabras', 'Mele', 'Spanu', 'Contu', 'Pisano', 'Orrù', 'Zedda', 'Ledda', 'Satta', 'Tola', 'Solinas', 'Pintus', 'Vacca', 'Bassu', 'Dessì', 'Cossu', 'Arru', 'Podda', 'Saba', 'Olla', 'Boi', 'Marras', 'Fois', 'Corda', 'Medda', 'Murgia', 'Serra'];
  const SOPRANNOMI = ['il Rosso', 'Mezzalingua', 'Zampa', 'il Muto', 'Tredici', 'Gattone', 'Sorcio', 'Lampo', 'Ciccio', 'il Monaco', 'Biscotto', 'Ferretto', 'Sciabica', 'Polpo', 'Ombra', 'Spillo'];
  const SKIN = ['#f0cfb2', '#e6c2a2', '#e0b894', '#dcae88', '#d8a982', '#c99a76', '#b9825c', '#a8724e'];
  const HAIR = ['#17110e', '#2a1d14', '#3a2a1a', '#5b3a22', '#6a4a2a', '#8a6a4a', '#b58a58', '#555', '#888', '#cfcac4'];
  const TOPS = ['#8c6a4f', '#5a6e8c', '#9a5b7a', '#6d7b4a', '#7a4f3a', '#4a6a6e', '#c43c52', '#3b5b86', '#e0a72e', '#3f4f3a', '#f1ece2', '#a04a6a', '#2f5a4a', '#6a5a4a', '#e0d8c8', '#ff9ec7', '#35a0a0', '#d86a4a', '#5a6aa8', '#b8a080'];
  const BOTS = ['#2a2a33', '#2b2b38', '#3a3a44', '#1d2230', '#4a4038', '#2c3a55', '#3c444e', '#5a4a3a', '#e9e4da'];

  // ---------------- MESTIERI ----------------
  // per uso dell'edificio (b.use) o id del luogo con nome: [mestiere, posti, paga (migliaia di lire l'ora), inizio, fine, notturno?]
  const JOBS_BY = {
    bar: [['cameriere', 1, 5, 7, 15], ['cameriere del turno di sera', 1, 5, 15, 23]],
    wu: [['commesso', 1, 5, 8, 20]],
    osteria: [['cuoco', 1, 7, 10, 23], ['cameriera', 2, 5, 11, 23]],
    osteria_sg: [['oste', 1, 6, 10, 23]],
    car_2: [['cuoca', 1, 6, 10, 22], ['cameriere', 1, 5, 11, 22]],
    sirena: [['barista', 1, 5, 8, 20]],
    gelateria: [['commessa', 1, 4, 10, 22]],
    miramare: [['attendente al comando', 2, 6, 7, 19], ['cuoco della mensa', 1, 6, 6, 15]],
    flamingo: [['portiere d\'albergo', 1, 6, 7, 19], ['cameriera ai piani', 2, 5, 7, 15]],
    paradiso: [['portiere d\'albergo', 1, 6, 15, 23], ['cameriera ai piani', 2, 5, 7, 15]],
    oceano: [['portiere d\'albergo', 1, 6, 7, 19], ['cameriera ai piani', 1, 5, 7, 15], ['facchino', 1, 4, 8, 18]],
    gabbiano: [['affittacamere', 1, 4, 8, 20]],
    magazzino: [['magazziniere', 3, 6, 7, 16]],
    cantiere: [['carpentiere navale', 4, 7, 7, 16], ['saldatore', 2, 8, 7, 16]],
    officina: [['apprendista meccanico', 1, 4, 8, 18]],
    benzina: [['benzinaio', 1, 5, 7, 20]],
    disco: [['barman', 1, 6, 21, 28, true], ['buttafuori', 2, 6, 21, 28, true]],
    cinema: [['proiezionista', 1, 6, 15, 24], ['cassiera', 1, 4, 15, 23]],
    flipper: [['gestore della sala', 1, 5, 14, 24]],
    video: [['commesso', 1, 4, 10, 20]],
    chiosco: [['bagnino', 1, 4, 9, 19]],
    ambulatorio: [['infermiere', 2, 7, 7, 19]],
    biblioteca: [['impiegata della biblioteca', 1, 5, 8, 18]],
    chiesa: [['sagrestano', 1, 3, 6, 19]],
    santuario: [['custode del santuario', 1, 3, 8, 18]],
    rocca: [['impiegato dell\'Ufficio Rettifiche', 4, 9, 8, 17], ['dattilografa della Tutela', 2, 7, 8, 17]],
    masseria: [['bracciante', 3, 4, 5, 14]],
    cantina: [['vignaiolo', 3, 4, 6, 15]],
    casotto: [['cavatore', 4, 6, 6, 15]],
    salinaio: [['salinaro', 2, 4, 5, 13]],
    panetteria: [['fornaio', 1, 6, 3, 11], ['commessa del forno', 1, 4, 7, 13]],
    farmacia: [['farmacista', 1, 9, 8, 20]],
    lavanderia: [['lavandaia', 2, 4, 8, 18]],
    tipografia: [['tipografo', 2, 7, 7, 17]],
    circolo: [['custode del circolo', 1, 3, 16, 24]],
    scuola: [['maestra', 3, 6, 8, 13], ['bidello', 1, 4, 7, 15]],
    sartoria: [['sarta', 2, 5, 8, 18]],
    pescheria: [['pescivendolo', 1, 5, 6, 13]],
    teatro: [['custode del teatro', 1, 4, 14, 24]],
    palestra: [['istruttore di pugilato', 1, 5, 15, 22]],
    ferramenta: [['ferramenta', 1, 6, 8, 19]],
    ufficio: [['impiegato', 3, 6, 8, 17]],
    barbiere: [['barbiere', 1, 6, 8, 19]],
    tabacchi: [['tabaccaio', 1, 6, 7, 20]],
    fabbrica: [['operaio del primo turno', 6, 5, 6, 14], ['operaia del secondo turno', 5, 5, 14, 22]],
  };
  // lavori all'aperto, senza edificio: posti larghi
  const OUTDOOR = [['molo', 'pescatore', 8, 5, 3, 11], ['calata', 'scaricatore di porto', 6, 6, 6, 15], ['vigne', 'bracciante delle vigne', 4, 4, 6, 14], ['oliveto', 'bracciante dell\'oliveto', 3, 4, 6, 14], ['saline', 'salinaro', 3, 4, 5, 13], ['cava', 'cavatore', 3, 6, 6, 15]];
  // i giri della malavita (attività di notte, sopra o al posto di un mestiere)
  const GIRI = {
    borsaiolo: { label: 'borsaiolo', when: [[10, 13], [17, 21]], places: ['piazza', 'lungomare', 'passeggiata', 'fontana', 'calata'], earn: [2, 8], risk: .05 },
    ladro: { label: 'ladro d\'appartamenti', when: [[1, 4]], places: ['vico', 'piazzetta', 'caruggio'], earn: [6, 25], risk: .08 },
    ricettatore: { label: 'ricettatore dello Squalo', when: [[17, 22]], places: ['magazzino', 'flipper'], earn: [4, 12], risk: .03, boss: 'sandro' },
    spacciatore: { label: 'spaccia la roba', when: [[21, 26]], places: ['flipper', 'disco', 'lungomare'], earn: [8, 30], risk: .07 },
    trafficante: { label: 'traffica armi al porto', when: [[23, 27]], places: ['pontile', 'caletta', 'marina'], earn: [20, 80], risk: .09, boss: 'marcel' },
    orecchio: { label: 'informatore degli Orecchi', when: [[16, 18]], places: ['sirena'], earn: [3, 8], risk: 0, boss: 'zia' },
  };


  // ================= LA VITA: oggetti, interessi, progetti =================
  // La catena è sempre la stessa, per tutti (abitanti, cast, Tutela, banditi):
  //   interessi + bisogni  →  progetti (di notte, la Mente)  →  piani (passi su più giorni)  →  azioni (blocchi della giornata, fatte con gli oggetti).
  // Aggiungere un oggetto qui aggiunge comportamenti a tutti: chi ha quel bisogno o quell'interesse lo troverà da solo.

  // ---------------- OGGETTI INTELLIGENTI ----------------
  // where: id di luoghi (PLACES), 'use:<uso edificio>', 'casa' (la propria casa). act: per quale blocco serve.
  // once: effetto all'arrivo; perH: effetto per ogni ora passata lì; h: orario [dalle, alle] (alle > 24 = dopo mezzanotte)
  // cost: migliaia di lire; int: interesse che soddisfa; pantry: pasti messi in dispensa; needs: condizione per usarlo
  const OGG = {
    letto:       { label: 'il letto', where: ['casa'], act: 'sonno', perH: { sonno: -.17 } },
    cucina:      { label: 'la cucina di casa', where: ['casa'], act: 'pranzo', once: { fame: -.7 }, pantry: -1, int: 'cucina', needs: P => P.pantry > 0 },
    bagno:       { label: 'il bagno di casa', where: ['casa'], act: 'bagno', once: { igiene: -.9 } },
    tv:          { label: 'la TV del Garante', where: ['casa'], act: 'casa', h: [19, 24], perH: { svago: -.07 }, side: { paura: .01 }, ideo: -.003, tag: 'propaganda' },
    radio:       { label: 'la radio', where: ['casa'], act: 'casa', perH: { svago: -.06 }, int: 'musica', needs: P => P.owns && P.owns.radio, tag: 'radio' },
    bancone:     { label: 'il bancone', where: ['bar', 'sirena', 'osteria', 'osteria_sg', 'car_2', 'use:circolo'], act: 'svago', h: [7, 24], once: { svago: -.15, compagnia: -.25 }, perH: { compagnia: -.06, svago: -.05 }, cost: 2, int: 'chiacchiere', tag: 'vino' },
    carte:       { label: 'un tavolo da scopa', where: ['osteria', 'osteria_sg', 'use:circolo', 'bar'], act: 'svago', h: [15, 24], perH: { svago: -.1, compagnia: -.07 }, cost: 1, int: 'carte' },
    tavola:      { label: 'una tavola apparecchiata', where: ['osteria', 'osteria_sg', 'car_2'], act: 'pranzo', h: [12, 23], once: { fame: -.75, compagnia: -.1 }, cost: 4 },
    panino:      { label: 'un panino al banco', where: ['bar', 'sirena', 'gelateria', 'chiosco'], act: 'pranzo', h: [7, 22], once: { fame: -.4 }, cost: 2 },
    bottega:     { label: 'il bancone della bottega', where: ['wu', 'use:panetteria', 'use:pescheria', 'use:tabacchi', 'use:macelleria', 'use:fruttivendolo', 'use:emporio'], act: 'spesa', h: [7, 20], pantry: 4, cost: 5, once: { compagnia: -.05 }, int: 'cucina' },
    bancarelle:  { label: 'le bancarelle del mercato', where: ['piazza'], act: 'mercato', h: [7, 13], pantry: 5, cost: 5, once: { compagnia: -.15, svago: -.08 }, int: 'cucina', needs: (P, st) => [2, 5].includes(weekday(st.t)) },
    panchina:    { label: 'una panchina', where: ['piazza', 'fontana', 'giardini', 'lungomare', 'passeggiata', 'belvedere', 'piazzetta', 'molo', 'marina'], act: 'svago', h: [7, 23], perH: { svago: -.06, compagnia: -.06 }, int: 'chiacchiere' },
    fontana:     { label: 'la fontana', where: ['fontana'], act: 'bagno', h: [6, 22], once: { igiene: -.25 } },
    spiaggia:    { label: 'la spiaggia', where: ['spiaggia', 'caletta'], act: 'svago', h: [9, 19], perH: { svago: -.14, igiene: -.08 }, int: 'mare' },
    canna:       { label: 'una canna da pesca', where: ['molo', 'punta', 'caletta', 'pontile'], act: 'svago', h: [5, 20], perH: { svago: -.12, paura: -.02 }, pantryH: .5, int: 'pesca' },
    banco_chiesa:{ label: 'i banchi della chiesa', where: ['chiesa', 'chiesa_sg', 'santuario'], act: 'messa', h: [6, 20], once: { paura: -.15 }, perH: { compagnia: -.04 }, int: 'fede' },
    cero:        { label: 'un cero', where: ['chiesa', 'santuario', 'chiesa_sg'], act: 'svago', h: [6, 20], once: { rabbia: -.1, paura: -.08 }, cost: .5, int: 'fede' },
    libri:       { label: 'gli scaffali della biblioteca', where: ['biblioteca'], act: 'svago', h: [8, 18], perH: { svago: -.07 }, ideo: .004, int: 'lettura' },
    flipper:     { label: 'il flipper', where: ['flipper'], act: 'svago', h: [14, 26], perH: { svago: -.15 }, cost: 1, int: 'musica' },
    pista:       { label: 'la pista della Luna', where: ['disco'], act: 'svago', h: [22, 28], perH: { svago: -.2, compagnia: -.1 }, cost: 3, int: 'ballo' },
    cinema:      { label: 'il film in sala', where: ['cinema'], act: 'svago', h: [15, 24], once: { svago: -.45 }, cost: 2, int: 'cinema' },
    pallone:     { label: 'un pallone', where: ['spiaggia', 'giardini'], act: 'svago', h: [9, 20], perH: { svago: -.14, compagnia: -.1, rabbia: -.05 }, int: 'sport', needs: P => P.age < 50 },
    palestra:    { label: 'il sacco della palestra', where: ['use:palestra'], act: 'svago', h: [15, 22], perH: { svago: -.1, rabbia: -.12 }, cost: 1, int: 'sport' },
    motori:      { label: 'il banco dell\'officina', where: ['officina'], act: 'svago', h: [8, 19], perH: { svago: -.08 }, int: 'motori' },
    orto:        { label: 'un pezzo d\'orto', where: ['vigne', 'oliveto', 'masseria'], act: 'svago', h: [6, 19], perH: { svago: -.06, rabbia: -.04 }, pantryH: .5, int: 'campagna' },
    barbiere:    { label: 'la poltrona del barbiere', where: ['use:barbiere'], act: 'bagno', h: [8, 19], once: { igiene: -.35, compagnia: -.08 }, cost: 2, int: 'eleganza' },
    album:       { label: 'un album da disegno', where: ['belvedere', 'lungomare', 'piazza', 'molo', 'giardini', 'piazzetta'], act: 'svago', h: [8, 20], perH: { svago: -.1, rabbia: -.04 }, int: 'arte' },
    foto:        { label: 'la macchina fotografica', where: ['lungomare', 'belvedere', 'piazza', 'molo', 'punta'], act: 'svago', h: [8, 19], perH: { svago: -.12 }, int: 'foto', needs: P => P.owns && P.owns.fotocamera },
  };
  // come si dice, nel programma, andare a usare un oggetto
  const DOING = { bancone: 'va al bar', carte: 'a giocare a scopa', panchina: 'a fare due chiacchiere', spiaggia: 'in spiaggia', canna: 'a pescare', banco_chiesa: 'in chiesa', cero: 'ad accendere un cero',
    libri: 'in biblioteca a leggere', album: 'a disegnare', flipper: 'al Flipper', pista: 'a ballare alla Luna', cinema: 'al cinema', pallone: 'a giocare a pallone', palestra: 'in palestra', motori: 'ad armeggiare in officina',
    orto: 'all\'orto', foto: 'a fare foto', barbiere: 'dal barbiere', fontana: 'alla fontana', tavola: 'a mangiare fuori', panino: 'a mangiare un panino', bottega: 'a fare la spesa', bancarelle: 'al mercato' };
  const NEEDS = ['fame', 'sonno', 'igiene', 'compagnia', 'svago', 'rabbia', 'paura', 'soldi'];

  // ---------------- INTERESSI ----------------
  // peso nella scelta degli oggetti e progetti che un interesse trascurato fa nascere
  const INTERESSI = {
    pesca: 'la pesca', carte: 'le carte', lettura: 'i libri', musica: 'la musica', ballo: 'il ballo', fede: 'la fede', sport: 'lo sport',
    cinema: 'il cinema', chiacchiere: 'le chiacchiere', politica: 'la politica', motori: 'i motori', cucina: 'la cucina', campagna: 'la campagna',
    mare: 'il mare', eleganza: 'l\'eleganza', foto: 'la fotografia', arte: 'l\'arte (disegnare, dipingere i muri)',
  };
  // chi sceglie cosa: età e mestiere spostano le probabilità
  function interestsFor(p, r) {
    const w = { pesca: 1, carte: 1, lettura: .7, musica: .8, ballo: .6, fede: .8, sport: .8, cinema: .8, chiacchiere: 1.1, politica: .4, motori: .6, cucina: .8, campagna: .6, mare: .8, eleganza: .4, foto: .25, arte: .6 };
    if (p.age > 60) { w.fede += 1.2; w.carte += .6; w.chiacchiere += .6; w.ballo = .05; w.sport = .1; w.campagna += .5; }
    if (p.age < 30) { w.ballo += 1; w.musica += .8; w.sport += .6; w.motori += .3; w.cinema += .4; w.foto += .3; w.arte += .6; }
    if (p.sex === 'f') { w.sport *= .5; w.motori *= .5; w.cucina += .3; } else { w.motori += .3; w.sport += .2; }
    if (p.job && /pescat/.test(p.job.title)) w.pesca += 1.5;
    if (p.job && /braccian|vignaiol|salinar/.test(p.job.title)) w.campagna += 1;
    if (p.job && /tipograf|maestr|biblioteca/.test(p.job.title)) { w.lettura += 1.2; w.politica += .5; }
    if (p.lost) { w.politica += 1.2; w.arte += .3; }
    if (p.job && /tipograf|sart|lavandai/.test(p.job.title)) w.arte += .5;
    if (p.vice === 'vino') w.chiacchiere += .5;
    const out = [], keys = Object.keys(w), k = 2 + (r() < .4 ? 1 : 0);
    while (out.length < k) {
      const tot = keys.reduce((s, x) => s + (out.some(o => o.k === x) ? 0 : w[x]), 0); let roll = r() * tot;
      for (const x of keys) { if (out.some(o => o.k === x)) continue; roll -= w[x]; if (roll <= 0) { out.push({ k: x, w: .5 + r() * .5 }); break; } }
    }
    return out;
  }

  // ---------------- IL CAST NELLA VITA ----------------
  // sesso, età e interessi dei personaggi della storia (il resto lo leggiamo da loro: casa, orari, mestiere)
  const CAST_INFO = {
    gino: ['m', 52, ['carte', 'chiacchiere', 'sport']], wu: ['m', 48, ['cucina', 'lettura']], marta: ['f', 74, ['chiacchiere', 'fede']],
    tonino: ['m', 38, ['carte', 'pesca', 'sport']], lucia: ['f', 41, ['lettura', 'fede']], sandro: ['m', 50, ['carte', 'motori']],
    rocco: ['m', 35, ['sport', 'carte']], tano: ['m', 31, ['carte', 'ballo']], elena: ['f', 22, ['lettura', 'politica', 'arte']],
    beppe: ['m', 45, ['motori', 'sport']], rosa: ['f', 55, ['fede', 'campagna']], nico: ['m', 24, ['motori', 'ballo', 'musica']],
    pietro: ['f', 63, ['fede', 'cucina']], marcel: ['m', 40, ['mare', 'carte']], jeanluc: ['m', 33, ['mare', 'eleganza']], didier: ['m', 36, ['carte', 'pesca']],
    carla: ['f', 34, ['sport', 'lettura']], ferri: ['m', 50, ['carte', 'chiacchiere']], lupo: ['m', 70, ['lettura', 'politica']],
    vinile: ['f', 29, ['musica', 'ballo', 'arte']], betamax: ['m', 46, ['cinema', 'musica']], divisa: ['m', 27, ['pesca', 'sport']],
    cono: ['m', 19, ['arte', 'motori', 'ballo']], vasco: ['m', 58, ['lettura', 'sport']], pardo: ['f', 49, ['lettura', 'musica']],
    zia: ['f', 68, ['chiacchiere', 'fede']], malanotte: ['m', 55, ['campagna', 'carte']],
    p0: ['f', 47, null], p1: ['m', 39, null], p2: ['f', 31, null], p3: ['m', 58, null], p4: ['f', 66, null], p5: ['m', 44, null],
  };
  // mestieri del cast: dove lavorano (il resto del programma viene dai loro orari)
  const CAST_JOB = { vinile: 'disco', betamax: 'video', cono: 'gelateria', lupo: 'biblioteca', vasco: 'miramare', pardo: 'biblioteca', zia: 'sirena', lucia: 'ambulatorio', beppe: 'officina', pietro: 'chiesa', sandro: 'magazzino', rocco: 'magazzino', tano: 'magazzino', marcel: 'pontile', jeanluc: 'pontile', didier: 'pontile', malanotte: 'radura', divisa: 'pineta' };
  const CAST_FRIENDS = [['gino', 'tonino'], ['gino', 'marta'], ['marta', 'rosa'], ['marta', 'pietro'], ['rosa', 'pietro'], ['wu', 'rosa'], ['elena', 'nico'], ['beppe', 'gino'], ['sandro', 'nico'], ['lucia', 'carla'], ['beppe', 'tonino'], ['elena', 'lucia'], ['lucia', 'marta'], ['carla', 'ferri'], ['wu', 'lucia'], ['sandro', 'rocco'], ['sandro', 'tano'], ['rocco', 'tano'], ['marcel', 'jeanluc'], ['marcel', 'didier'], ['jeanluc', 'didier'], ['lupo', 'elena'], ['vinile', 'cono'], ['betamax', 'nico'], ['zia', 'marta'], ['vasco', 'pardo']];

  // ---------------- STATO DEL MODULO ----------------
  let INDEX = null; // edifici, case, posti di lavoro, luoghi pubblici: calcolato una volta dalla mappa
  function buildIndex() {
    if (INDEX) return INDEX;
    const B = G.BUILDINGS, door = b => ({ x: b.door[0] * TS + TS / 2, y: b.door[1] * TS + TS / 2 });
    const near = (x, y) => G.nearestPlace(x, y).id;
    const homes = [], works = [];
    B.forEach((b, bi) => {
      if (!b.door) return;
      const d = door(b), place = PLACES[b.id] ? b.id : near(d.x, d.y);
      const info = { bi, id: b.id, x: d.x, y: d.y, place, label: b.label || b.name || b.id, name: b.name || b.label };
      const isHome = b.use === 'casa' || b.use === 'cascina' || (b.home && !b.church);
      if (isHome) {
        const area = b.w * b.h * TS * TS, fl = Math.max(1, b.fl || 1);
        info.cap = clamp(Math.round(area * fl / (b.home ? 26 : 42)), 1, b.home ? 24 : 7);
        info.farm = !!b.farm; info.condo = !!b.home;
        homes.push(info);
      }
      const jobs = JOBS_BY[b.id] || JOBS_BY[b.use];
      if (jobs) jobs.forEach(([title, n, pay, a, z, night]) => works.push(Object.assign({}, info, { title, slots: n, pay, start: a, end: z, night: !!night, indoor: true })));
    });
    OUTDOOR.forEach(([pid, title, n, pay, a, z]) => { const p = PLACES[pid]; if (p) works.push({ bi: -1, id: pid, x: p.x, y: p.y, place: pid, label: p.name, name: p.name, title, slots: n, pay, start: a, end: z, indoor: false }); });
    const has = id => !!PLACES[id];
    const byUse = u => B.map((b, bi) => [b, bi]).filter(([b]) => b.use === u && b.door);
    const bplace = id => { const bi = B.findIndex(b => b.id === id); return bi >= 0 && B[bi].door ? bi : -1; };
    // svaghi: [chi ci va, luogo pubblico (id PLACES) o edificio]
    const fun = { bar: ['bar', 'sirena', 'osteria', 'osteria_sg', 'car_2'].filter(has), out: ['piazza', 'fontana', 'lungomare', 'passeggiata', 'giardini', 'belvedere', 'molo', 'spiaggia', 'piazzetta'].filter(has), young: ['flipper', 'gelateria', 'cinema', 'spiaggia', 'lungomare'].filter(has), church: ['chiesa', 'santuario', 'chiesa_sg'].filter(has), shops: ['wu'].filter(has) };
    byUse('panetteria').concat(byUse('tabacchi'), byUse('macelleria'), byUse('fruttivendolo'), byUse('emporio')).forEach(([b]) => fun.shops.push('b:' + b.id));   // [economia]
    byUse('circolo').forEach(([b]) => fun.circolo = 'b:' + b.id);
    INDEX = { homes, works, fun, bplace, door };
    return INDEX;
  }
  // un bersaglio: un edificio (si entra) o un luogo pubblico (si sta fuori)
  function target(ref) {
    if (!ref) return null;
    if (typeof ref === 'object') return ref;
    if (ref.startsWith('b:')) { const bi = G.BUILDINGS.findIndex(b => b.id === ref.slice(2)); return bi >= 0 ? tB(bi) : null; }
    const p = PLACES[ref]; if (!p) return null;
    const bi = G.BUILDINGS.findIndex(b => b.id === ref && b.door);
    if (bi >= 0 && !['chiosco', 'benzina'].includes(ref)) return tB(bi);
    return { k: 'p', pid: ref, x: p.x, y: p.y, label: p.name, place: ref };
  }
  function tB(bi) {
    const b = G.BUILDINGS[bi]; if (!b || !b.door) return null;
    const x = b.door[0] * TS + TS / 2, y = b.door[1] * TS + TS / 2;
    return { k: 'b', bi, x, y, label: b.name || b.label || b.id, place: PLACES[b.id] ? b.id : G.nearestPlace(x, y).id };
  }
  const tkey = t => t ? (t.k === 'b' ? 'b' + t.bi : 'p' + t.pid) : '';

  // ---------------- GENERAZIONE DELLA POPOLAZIONE ----------------
  function populate(st) {
    const IX = buildIndex(), r = W.rng(7919 + G.BUILDINGS.length);
    const people = [], households = [];
    let n = 0;
    const homes = IX.homes.slice().sort((a, b) => W.hash2(a.bi, 3, 41) - W.hash2(b.bi, 3, 41));
    for (const h of homes) {
      let room = h.cap;
      while (room > 0 && n < CFG.max) {
        const sur = pick(r, COGNOMI), roll = r();
        // tipo di famiglia
        let kind = roll < .22 ? 'solo' : roll < .5 ? 'coppia' : roll < .78 ? 'famiglia' : roll < .9 ? 'anziani' : 'coinquilini';
        if (h.farm) kind = r() < .6 ? 'famiglia' : 'coppia';
        const size = { solo: 1, coppia: 2, famiglia: 3 + (r() < .35 ? 1 : 0), anziani: 2, coinquilini: 2 + (r() < .4 ? 1 : 0) }[kind];
        if (size > room && room < 2) kind = 'solo';
        const hh = { id: 'f' + households.length, sur, home: h, members: [] }; households.push(hh);
        const mk = (sex, age, surname, rel) => {
          const p = { k: n++, sex, age, sur: surname || sur, first: pick(r, sex === 'f' ? NOMI_F : NOMI_M), hh: hh.id, rel, home: h };
          hh.members.push(p); people.push(p); return p;
        };
        if (kind === 'solo') mk(r() < .5 ? 'f' : 'm', 20 + Math.floor(r() * 62), null, 'solo');
        else if (kind === 'coppia') { const a = 24 + Math.floor(r() * 40); mk('m', a, null, 'marito'); mk('f', a - 3 + Math.floor(r() * 6), null, 'moglie'); }
        else if (kind === 'anziani') { const a = 66 + Math.floor(r() * 16); mk('m', a, null, 'marito'); mk('f', a - 2 + Math.floor(r() * 4), null, 'moglie'); }
        else if (kind === 'famiglia') { const a = 44 + Math.floor(r() * 18); mk('m', a, null, 'padre'); mk('f', a - 4 + Math.floor(r() * 6), null, 'madre'); for (let i = 2; i < size; i++) mk(r() < .5 ? 'f' : 'm', 18 + Math.floor(r() * Math.min(12, a - 38)), null, 'figlio'); }
        else for (let i = 0; i < size; i++) mk(r() < .5 ? 'f' : 'm', 19 + Math.floor(r() * 14), pick(r, COGNOMI), 'coinquilino');
        room -= size;
      }
      if (n >= CFG.max) break;
    }
    // il lavoro: i posti più vicini a casa, poi chi resta va al porto, nei campi o resta a spasso
    const slots = []; IX.works.forEach(w => { for (let i = 0; i < w.slots; i++) slots.push(w); });
    const free = slots.slice();
    // [economia] i mestieri senza cui la catena si ferma (pesca, bestie, carne, ferro…) si coprono per primi, col più vicino
    if (ESSENTIAL.length) free.forEach((w, i) => { if (!w || !ESSENTIAL.some(re => re.test(w.title))) return; let bp = null, bd = 1e9; people.forEach(p => { if (p.job || p.age < 18 || p.age >= 62) return; const d = dist(p.home.x, p.home.y, w.x, w.y) + r() * 40; if (d < bd) { bd = d; bp = p; } }); if (bp) { bp.job = w; bp.status = 'lavora'; free[i] = null; } });
    people.filter(p => p.age >= 18 && p.age < 66 && !p.job).sort(() => r() - .5).forEach(p => {
      if (r() < (p.sex === 'f' && p.age > 40 ? .3 : .1)) { p.status = p.sex === 'f' ? 'casalinga' : 'disoccupato'; return; }
      let best = -1, bs = 1e9;
      free.forEach((w, i) => { if (!w) return; const d = dist(p.home.x, p.home.y, w.x, w.y) + r() * 60 + (w.night && p.age > 50 ? 200 : 0); if (d < bs) { bs = d; best = i; } });
      if (best >= 0) { p.job = free[best]; free[best] = null; p.status = 'lavora'; }
      else { const out = IX.works.filter(w => !w.indoor); if (out.length && r() < .6) { p.job = pick(r, out); p.status = 'lavora'; } else p.status = 'disoccupato'; }
    });
    people.forEach(p => { if (!p.status) p.status = p.age >= 66 ? 'pensionato' : 'disoccupato'; });
    // carattere e giri della malavita
    people.forEach(p => {
      p.tr = { cor: r() * .8 + .1, loq: r() * .8 + .2, avid: r() * .8 + .1, legge: r() * .8 + .15 };
      p.punct = clamp(.35 + r() * .7 - (p.age < 25 ? .15 : 0), 0, 1);  // puntualità
      p.faith = clamp(r() * .8 + (p.age > 60 ? .4 : 0), 0, 1);
      p.vice = r() < .12 ? 'vino' : r() < .05 ? 'gioco' : r() < .03 ? 'roba' : null;
      p.money = Math.round(10 + r() * 60 + (p.job ? p.job.pay * 4 : 0));
      p.rent = p.home.condo ? 18 + Math.floor(r() * 10) : p.home.farm ? 6 : 10 + Math.floor(r() * 14);
      p.debt = r() < .18 ? { to: 'sandro', amount: 40 + Math.floor(r() * 300) } : null;
      p.ideo = clamp(.15 + r() * .5, 0, 1);
      if (r() < .07) { p.lost = pick(r, ['il marito', 'un fratello', 'il figlio', 'la sorella', 'un cugino']); p.ideo = clamp(p.ideo + .35, 0, 1); }
      if (p.job && /Tutela|comando/.test(p.job.title)) p.ideo = clamp(p.ideo - .3, 0, 1);
      p.giro = null;
      const shady = (1 - p.tr.legge) * .7 + p.tr.avid * .4 + (p.debt ? .2 : 0) + (p.status === 'disoccupato' ? .2 : 0);
      if (p.age < 60 && shady > .85) {
        const roll = r();
        p.giro = roll < .32 ? 'borsaiolo' : roll < .52 ? 'ladro' : roll < .68 ? 'ricettatore' : roll < .84 ? 'spacciatore' : 'trafficante';
        p.tr.legge = Math.min(p.tr.legge, .2); p.tr.cor = Math.max(p.tr.cor, .55);
        if (r() < .4) p.nick = pick(r, SOPRANNOMI);
      } else if (p.tr.loq > .75 && p.ideo < .3 && r() < .45) p.giro = 'orecchio';
      p.ints = interestsFor(p, r);
    });
    // amici e colleghi
    const byWork = {}; people.forEach(p => { if (p.job) (byWork[p.job.title + '@' + p.job.id] = byWork[p.job.title + '@' + p.job.id] || []).push(p); });
    people.forEach(p => { p.friends = []; });
    Object.values(byWork).forEach(g => g.forEach(a => g.forEach(b => { if (a !== b && r() < .6) a.friends.push(b.k); })));
    people.forEach(p => { for (let i = 0; i < 2; i++) { const o = people[Math.floor(r() * people.length)]; if (o !== p && Math.abs(o.age - p.age) < 15 && dist(o.home.x, o.home.y, p.home.x, p.home.y) < 120 && !p.friends.includes(o.k)) { p.friends.push(o.k); o.friends.push(p.k); } } });
    return { people, households };
  }

  function lookFor(p, r) {
    const f = p.sex === 'f', old = p.age > 62;
    return {
      skin: pick(r, SKIN), top: pick(r, TOPS), bottom: f && r() < .4 ? pick(r, TOPS) : pick(r, BOTS),
      hair: old ? pick(r, ['#888', '#cfcac4', '#aaa']) : pick(r, HAIR),
      hat: f ? (r() < .5 ? 'long' : r() < .5 ? 'bun' : old ? 'scarf' : 'long') : (r() < .2 ? 'flat' : r() < .08 ? 'fedora' : 'none'),
      hatCol: pick(r, ['#3a3a44', '#15151c', '#5a4a3a']), build: clamp((f ? .88 : 1) + (r() - .4) * .3, .82, 1.25),
      extra: f ? 'donna' : (r() < .3 ? 'moustache' : r() < .15 ? 'glasses' : ''),
    };
  }
  // i mestieri al maschile e al femminile
  const GENDER = [['operaio', 'operaia'], ['cameriere', 'cameriera'], ['magazziniere', 'magazziniera'], ['infermiere', 'infermiera'], ['impiegato', 'impiegata'], ['cuoco', 'cuoca'], ['commesso', 'commessa'],
    ['pescatore', 'pescatrice'], ['portiere', 'portiera'], ['fornaio', 'fornaia'], ['tipografo', 'tipografa'], ['sarto', 'sarta'], ['maestro', 'maestra'], ['bidello', 'bidella'], ['tabaccaio', 'tabaccaia'],
    ['sagrestano', 'sagrestana'], ['salinaro', 'salinara'], ['vignaiolo', 'vignaiola'], ['istruttore', 'istruttrice'], ['dattilografo', 'dattilografa'], ['lavandaio', 'lavandaia'], ['pescivendolo', 'pescivendola'],
    ['cassiere', 'cassiera'], ['affittacamere', 'affittacamere'], ['oste', 'ostessa'], ['gestore', 'gestrice'], ['benzinaio', 'benzinaia'], ['proiezionista', 'proiezionista'], ['facchino', 'facchina']];
  function genderTitle(t, sex) {
    for (const [m, f] of GENDER) { const from = sex === 'f' ? m : f, to = sex === 'f' ? f : m; if (t.startsWith(from)) return to + t.slice(from.length); }
    return t.replace(/ del primo turno| del secondo turno/, x => x);
  }
  function roleOf(p) {
    if (p.status === 'lavora') { const t = genderTitle(p.job.title, p.sex); return t.charAt(0).toUpperCase() + t.slice(1) + (p.job.indoor ? ` (${p.job.name})` : ''); }
    if (p.status === 'pensionato') return p.sex === 'f' ? 'Pensionata' : 'Pensionato';
    if (p.status === 'casalinga') return 'Casalinga';
    return p.sex === 'f' ? 'Disoccupata' : 'Disoccupato';
  }

  // ---------------- DALLE PERSONE AGLI NPC DEL MOTORE ----------------
  function spawn(st) {
    const { people, households } = populate(st), r = W.rng(12011), byK = [];
    st.pop = { households: {}, appts: [], diaryN: 0, lastT: st.t, talkAt: st.t, lodAt: 0, day: -1, hourMark: Math.floor(st.t / 60), stats: { furti: 0, arresti: 0, licenziati: 0, ritardi: 0, appuntamenti: 0, bidoni: 0, progetti: 0, riusciti: 0, falliti: 0, scritte: 0, graffiti: 0 }, nearN: 0, walls: [], pjN: 0 };
    households.forEach(h => { st.pop.households[h.id] = { id: h.id, sur: h.sur, home: h.home.bi, members: [] }; });
    people.forEach(p => {
      const id = 'pp' + p.k, name = `${p.first} ${p.sur}${p.nick ? ` «${p.nick}»` : ''}`;
      const homeT = tB(p.home.bi);
      const n = G.makeNpc(st, { id, name, role: roleOf(p), home: homeT.place, tr: p.tr, sched: [[0, homeT.place]], passante: true, popolo: true, look: lookFor(p, r) });
      n.first = p.nick && r() < .5 ? p.nick.replace(/^il /, '') : p.first;
      n.pop = popRecord(p, homeT, r);
      if (n.pop.job && !n.pop.job.t) { n.pop.job = null; n.pop.status = 'disoccupato'; }
      initLife(n.pop, p.ints, r);
      n.x = homeT.x; n.y = homeT.y; n.inside = true; n.pop.at = homeT; n.action = { name: 'altrove', scores: [], why: '', since: 0 };
      st.npcs.push(n); byK[p.k] = n; st.pop.households[p.hh].members.push(id);
      // la scheda per la chat della Risacca: la biografia si legge al momento, col diario aggiornato
      const R = RS(); if (R && R.CARDS && !R.CARDS[id]) R.CARDS[id] = cardFor(st, n, p);
    });
    people.forEach(p => { const n = byK[p.k]; n.pop.friends = p.friends.map(k => byK[k] && byK[k].id).filter(Boolean); });
    // il primo programma: si parte a metà giornata
    st.npcs.forEach(n => { if (n.pop) { planDay(st, n, dayIdx(st.t)); const b = blockNow(st, n); if (b) { n.pop.cur = b; n.pop.curKey = tkey(b.tgt) + '@' + b.at; } snapFar(st, n); } });
    st.pop.day = dayIdx(st.t);
  }
  function popRecord(p, homeT, r) {
    return {
      sex: p.sex, age: p.age, sur: p.sur, hh: p.hh, rel: p.rel, homeT, job: p.job ? { title: genderTitle(p.job.title, p.sex), base: p.job.title, pay: p.job.pay, start: p.job.start, end: p.job.end, night: p.job.night, t: p.job.indoor ? tB(p.job.bi) : target(p.job.id), name: p.job.name } : null,
      status: p.status, punct: p.punct, faith: p.faith, vice: p.vice, money: p.money, rent: p.rent, debt: p.debt, owed: 0, late: 0, giro: p.giro, lost: p.lost, friendsK: p.friends,
      need: { fame: .2 + Math.random() * .3, sonno: .2 + Math.random() * .2, igiene: .2 + Math.random() * .3, compagnia: .2 + Math.random() * .3, svago: .2 + Math.random() * .3, rabbia: p.lost ? .3 : .05, paura: .1 + Math.random() * .1 },
      plan: [], lod: 'lontano', cur: null, curKey: '', at: null, diary: [], appt: null, workToday: null, nextDep: 0, jit: r() * 25, near: false, seenEv: {},
    };
  }
  // [azioni] chi muore resta morto; all'ambulatorio arriva una persona nuova, con la casa e il lavoro rimasti liberi
  function newcomer(st, dead) {
    const IX = buildIndex(); st.pop.newK = (st.pop.newK || 0) + 1;
    const r = W.rng((st.pop.newK * 7919 + Math.floor(st.t) * 31) >>> 0), D = dead && dead.pop;
    const sex = r() < .5 ? 'f' : 'm', age = 18 + Math.floor(r() * 45);
    let home = null;
    if (D && D.homeT && D.homeT.k === 'b') { const hh0 = st.pop.households[D.hh], left = hh0 ? hh0.members.filter(id => { const k = G.byId(st, id); return k && !k.dead; }) : []; if (!left.length) home = IX.homes.find(h => h.bi === D.homeT.bi) || null; }
    if (!home) { const cnt = {}; st.npcs.forEach(k => { if (k.pop && !k.dead && k.pop.homeT && k.pop.homeT.k === 'b') cnt[k.pop.homeT.bi] = (cnt[k.pop.homeT.bi] || 0) + 1; }); const free = IX.homes.filter(h => (cnt[h.bi] || 0) < h.cap); home = free.length ? free[Math.floor(r() * free.length)] : IX.homes[Math.floor(r() * IX.homes.length)]; }
    const sur = pick(r, COGNOMI), first = pick(r, sex === 'f' ? NOMI_F : NOMI_M), hid = 'fn' + st.pop.newK;
    st.pop.households[hid] = { id: hid, sur, home: home.bi, members: [] };
    const dj = D && D.job && !D.job.cast ? D.job : null;
    const p = { k: 'n' + st.pop.newK, sex, age, sur, first, hh: hid, rel: 'solo', home, status: dj ? 'lavora' : 'disoccupato', job: null, friends: [],
      tr: { cor: r() * .8 + .1, loq: r() * .8 + .2, avid: r() * .8 + .1, legge: r() * .8 + .15 }, punct: clamp(.35 + r() * .7, 0, 1), faith: clamp(r() * .8, 0, 1), vice: r() < .1 ? 'vino' : null,
      money: Math.round(30 + r() * 50), rent: home.condo ? 18 + Math.floor(r() * 10) : 12, debt: null, ideo: clamp(.15 + r() * .5, 0, 1), lost: null, giro: null };
    p.ints = interestsFor(Object.assign({}, p, { job: dj ? { title: dj.base } : null }), r);
    const id = 'pp' + p.k, homeT = tB(home.bi);
    const n = G.makeNpc(st, { id, name: `${first} ${sur}`, role: '', home: homeT.place, tr: p.tr, sched: [[0, homeT.place]], passante: true, popolo: true, look: lookFor(p, r) });
    n.first = first;
    n.pop = popRecord(p, homeT, r); n.pop.friends = [];
    if (dj) n.pop.job = Object.assign({}, dj, { title: genderTitle(dj.base, sex) });
    n.role = n.pop.job ? cap(n.pop.job.title) + (n.pop.job.name ? ` (${n.pop.job.name})` : '') : (sex === 'f' ? 'Disoccupata' : 'Disoccupato');
    initLife(n.pop, p.ints, r);
    const amb = target('ambulatorio') || homeT;
    n.x = amb.x; n.y = amb.y; n.inside = true; n.pop.at = amb; n.action = { name: 'altrove', scores: [], why: 'È appena arrivato.', since: 0 };
    st.npcs.push(n); st.pop.households[hid].members.push(id);
    const R = RS(); if (R && R.CARDS) R.CARDS[id] = cardFor(st, n, p);
    note(st, n, `arrivat${o(n)} a Porto Vecchio: comincia qui una vita nuova${dj ? `, nel posto di lavoro che era di ${dead.first}` : ''}`, 'good', { w: .6, tag: 'arrivo' });
    planDay(st, n, dayIdx(st.t));
    st.pop.stats.arrivati = (st.pop.stats.arrivati || 0) + 1;
    G.addLog(st, `${G.clockStr(st.t)} · All'ambulatorio è arrivat${o(n)} ${n.name}${dj ? `: prende il posto di ${dead.first}` : ''}.`, 'info');
    return n;
  }
  function cardFor(st, n, p) {
    const P = n.pop;
    const voice = P.giro && P.giro !== 'orecchio' ? 'sbrigativo, sospettoso, parla per mezze frasi' : P.age > 64 ? 'lento, nostalgico, proverbi e lamentele sui prezzi' : P.age < 26 ? 'veloce, informale, un po\' spaccone' : pick(Math.random, ['cordiale ma prudente', 'diretto, stanco', 'chiacchierone', 'riservato, misurato', 'ironico']);
    const card = { voice, ideo: p.ideo, informer: p.giro === 'orecchio' };
    if (P.job && P.job.t && P.job.t.k === 'b' && PLACES[G.BUILDINGS[P.job.t.bi].id]) card.mestiere = { place: G.BUILDINGS[P.job.t.bi].id, pay: P.job.pay };
    if (P.giro && GIRI[P.giro]) card.secret = `Di nascosto ${GIRI[P.giro].label}.`;
    Object.defineProperty(card, 'bio', { enumerable: true, get: () => bioOf(st, n) });
    return card;
  }
  function bioOf(st, n) {
    const P = n.pop, hh = st.pop.households[P.hh], fam = hh ? hh.members.filter(id => id !== n.id).map(id => G.byId(st, id)).filter(Boolean) : [];
    const parts = [`${n.name}, ${P.age} anni. ${n.role}.`];
    parts.push(`Abita in ${P.homeT.label}${fam.length ? ` con ${fam.map(k => k.first + (k.pop.rel ? ` (${relWord(P.rel, k.pop.rel, k.pop.sex)})` : '')).join(', ')}` : `, da sol${o(n)}`}.`);
    if (P.job) parts.push(`Attacca alle ${hhmm(P.job.start * 60)} e stacca alle ${hhmm(P.job.end * 60)}; ${P.late >= 2 ? 'ultimamente arriva spesso tardi e il padrone se n\'è accorto' : P.punct > .75 ? 'non ha mai fatto un minuto di ritardo' : 'qualche volta arriva tardi'}.`);
    if (P.debt) parts.push(`Deve ${Math.round(P.debt.amount)}.000 lire ${P.debt.to === 'sandro' ? 'allo Squalo' : 'in giro'}.`);
    parts.push(P.money < 0 ? 'È al verde.' : P.money < 15 ? 'Ha pochi soldi.' : P.money > 150 ? 'Se la passa bene.' : 'Tira avanti.');
    if (P.lost) parts.push(`Nel '81 hanno rettificato ${P.lost}: non ne parla mai.`);
    if (P.vice) parts.push({ vino: 'Beve più di quanto dovrebbe.', gioco: 'Si gioca i soldi alla bisca.', roba: 'Ha il vizio della roba.' }[P.vice]);
    if (P.appt && P.appt.t > st.t) parts.push(`Ha un appuntamento con ${G.nameOf(st, P.appt.with)} ${dayPhrase(st, P.appt.t)} alle ${hhmm(minOfDay(P.appt.t))} a ${P.appt.label}.`);
    if (P.ints) parts.push(lifeOf(st, n));
    else { const nd = needWords(P, o(n)); if (nd) parts.push(nd); const d = P.diary.slice(-5).map(e => `${ago(st, e.t)}: ${e.text}`); if (d.length) parts.push('Ultimi fatti: ' + d.join('; ') + '.'); }
    parts.push(`Oggi è ${wdName(st.t)}, sono le ${G.clockStr(st.t)}.`);
    return parts.join(' ');
  }
  function relWord(me, other, sex) {
    if ((me === 'marito' && other === 'moglie') || (me === 'moglie' && other === 'marito')) return sex === 'f' ? 'la moglie' : 'il marito';
    if ((me === 'padre' || me === 'madre') && other === 'figlio') return sex === 'f' ? 'la figlia' : 'il figlio';
    if (me === 'figlio' && (other === 'padre' || other === 'madre')) return other === 'padre' ? 'il padre' : 'la madre';
    if (me === 'figlio' && other === 'figlio') return sex === 'f' ? 'la sorella' : 'il fratello';
    if (me === 'padre' && other === 'madre') return 'la moglie'; if (me === 'madre' && other === 'padre') return 'il marito';
    return sex === 'f' ? 'la coinquilina' : 'il coinquilino';
  }
  const dayPhrase = (st, t) => { const d = dayIdx(t) - dayIdx(st.t); return d === 0 ? 'oggi' : d === 1 ? 'domani' : WEEK[weekday(t)]; };
  const forDay = t => `per ${WEEK[weekday(t)]}`;   // nel diario: il giorno, non "oggi" (il diario si rilegge dopo)
  // il diario è la memoria della persona: ogni ricordo ha un peso emotivo (w), un posto, una persona, un'etichetta.
  // Quando è pieno se ne va quello che pesa meno, tenendo conto di quanto è vecchio.
  const KW = { bad: .5, good: .35, shady: .35, info: .15, pensiero: .3 };
  function note(st, n, text, kind, x) {
    const P = n.pop; if (!P) return;
    const e = Object.assign({ t: st.t, text, kind: kind || 'info', w: KW[kind] || .15 }, x || {});
    P.diary.push(e);
    if (P.diary.length > 30) {
      let k = 0, lo = 1e9; P.diary.forEach((d, i) => { const v = d.w * Math.exp(-(st.t - d.t) / 4320); if (v < lo) { lo = v; k = i; } });
      const gone = P.diary.splice(k, 1)[0];
      if (keepWorthy(n, gone)) toLong(st, n, gone);   // [memoria] quello che conta non si perde: passa alla memoria lunga
    }
  }

  // ---------------- [memoria] BREVE E LUNGA ----------------
  // Il diario (P.diary) è la memoria breve: gli ultimi giorni, tutto. La memoria lunga (P.lunga) tiene quello che conta:
  // ci passa di notte quello che pesa (un torto, un favore, un lutto, un debito) o che si è ripetuto, e da lì torna in mente
  // quando serve: rivedendo la persona, tornando nel posto. Ogni volta che torna in mente si rafforza; quello che non torna
  // mai sbiadisce. Chi è rancoroso (coraggio alto) tiene i torti più a lungo; chi è socievole tiene meglio i favori.
  const LONG_TAGS = /^(furto|arresto|fermato|bidone|amico|favore|debito|tradimento|lutto|morte|squalo|scambio|aiuto|progetto|mestiere)$/;
  function keepWorthy(n, e) {
    if (!e || e.tag === 'passo' || e.tag === 'ricordo') return false;
    return e.w >= .4 || (e.tag && LONG_TAGS.test(e.tag) && e.w >= .25);
  }
  function toLong(st, n, e) {
    const P = n.pop, L = P.lunga || (P.lunga = []);
    // lo stesso fatto (stessa etichetta, stessa persona) non si duplica: si rafforza
    const same = L.find(x => x.tag && x.tag === e.tag && x.who && x.who === e.who && (!e.place || x.place === e.place));
    if (same) { same.times = (same.times || 1) + 1; same.w = clamp(same.w + .12, 0, 1.5); same.last = e.t; same.text = e.text; return same; }
    const m = { t: e.t, last: e.t, text: e.text, kind: e.kind, w: clamp(e.w, 0, 1.5), who: e.who || null, place: e.place || null, tag: e.tag || null, times: 1 };
    L.push(m);
    if (L.length > 60) { let k = 0, lo = 1e9; L.forEach((d, i) => { if (d.w < lo) { lo = d.w; k = i; } }); L.splice(k, 1); }
    return m;
  }
  // di notte: passa nella memoria lunga quello che pesa ed è di ieri; la memoria lunga sbiadisce piano
  function consolidate(st, n) {
    const P = n.pop; if (!P.diary) return;
    P.diary.forEach(e => { if (!e.long && st.t - e.t > 600 && keepWorthy(n, e)) { toLong(st, n, e); e.long = true; } });
    const L = P.lunga || []; const grudge = .975 + (n.tr ? n.tr.cor : .5) * .02, warm = .975 + (n.tr ? n.tr.loq : .5) * .02;
    for (let i = L.length - 1; i >= 0; i--) { const m = L[i]; m.w *= m.kind === 'bad' ? grudge : m.kind === 'good' ? warm : .97; if (m.w < .1) L.splice(i, 1); }
  }
  // torna in mente: quello che la memoria lunga sa di una persona o di un posto rientra nella breve (e si rafforza)
  function recall(st, n, f) {
    const P = n.pop, L = P && P.lunga; if (!L || !L.length) return null;
    const hit = L.filter(m => (f.who && m.who === f.who) || (f.place && m.place === f.place) || (f.tag && m.tag === f.tag)).sort((a, b) => b.w - a.w)[0];
    if (!hit || st.t - (hit.recalled || -1e9) < 720) return hit || null;
    hit.recalled = st.t; hit.w = clamp(hit.w + .05, 0, 1.5);
    note(st, n, `si è ricordat${o(n)}: ${hit.text}`, hit.kind, { w: hit.w * .6, who: hit.who, place: hit.place, tag: 'ricordo', of: hit.tag });
    return hit;
  }
  // cosa si pensa di qualcuno, mettendo insieme le due memorie (-1 .. 1)
  function opinionOf(st, n, whoId) {
    const P = n.pop; if (!P) return 0; let v = 0;
    const add = (m, k) => { if (m.who !== whoId) return; v += (m.kind === 'good' ? 1 : m.kind === 'bad' ? -1.3 : 0) * m.w * k; };
    (P.diary || []).forEach(m => add(m, .6)); (P.lunga || []).forEach(m => add(m, 1));
    if (P.enemies && P.enemies.includes(whoId)) v -= .6; if (P.friends && P.friends.includes(whoId)) v += .3;
    return clamp(v, -1, 1);
  }

  // ---------------- LA GIORNATA ----------------
  // programma: blocchi { at: minuto del giorno, tgt, act, fixed (orario d'ingresso), label }
  function planDay(st, n, day) {
    const P = n.pop, IX = buildIndex(), r = () => W.hash2(day * 131 + P.age, n.id.length * 7 + (P.plan.length || 0), Number(n.id.slice(2)) + 3), rr = (() => { let s = 0; return () => W.hash2(day, Number(n.id.slice(2)) * 17 + s++, 97); })();
    const wd = (day + 1) % 7, ev = eventsOn(st, day), home = P.homeT, plan = [];
    const add = (atMin, tgt, act, label, fixed, obj) => { if (tgt) plan.push({ at: Math.round(atMin), tgt, act, label, fixed: !!fixed, obj }); };
    const curf = P.selfCurfew ? Math.min(curfewFrom(st), P.selfCurfew + 60) : curfewFrom(st), shady = !!(P.giro && P.giro !== 'orecchio');
    const pubIn = (list) => { const ok = list.map(target).filter(t => t && !(P.avoid && P.avoid[t.label] > st.t)); return ok.length ? ok[Math.floor(rr() * ok.length)] : null; };
    // [vita] il cast ha i suoi orari (la storia li vuole lì): sopra ci vanno bisogni, appuntamenti e progetti
    if (P.cast) {
      planCast(st, n, day, add);
      plan.sort((a, b) => a.at - b.at);
      const ww = workWindows(plan), busyC = m => ww.some(([a, z]) => m >= a && m < z);
      if (!isPassive(st, n)) planProjects(st, n, day, plan, busyC);
      const apC = P.appt; if (apC && dayIdx(apC.t) === day) { const am = minOfDay(apC.t); for (let i = plan.length - 1; i >= 0; i--) if (plan[i].at > am - 10 && plan[i].at < am + 60 && !plan[i].pj && plan[i].act !== 'lavoro') plan.splice(i, 1); add(am - 10, apC.tgt, 'appuntamento', `appuntamento con ${G.nameOf(st, apC.with)}`, true); if (!plan.some(x => (x.act === 'sonno' || x.act === 'casa') && x.at > am && x.at < am + 110)) add(am + 60 + rr() * 40, home, 'casa', 'torna a casa'); }
      insertImpegni(st, n, day, plan, add);   // [imprese]
      plan.sort((a, b) => a.at - b.at); P.plan = plan; P.planDay = day;
      return plan;
    }
    // [vita] svago scelto dagli oggetti: bisogni e interessi della persona, strada, prezzo, posti da evitare
    const fun = (at, fallback, why) => { const c = chooseObj(st, n, ['svago'], { at, from: home, noHome: true }); return c ? [c.t, DOING[c.o.id] || why, c.o.id] : [fallback, why, undefined]; };
    const wake = P.job ? Math.max(0, P.job.start * 60 - 70 - rr() * 40) : (P.status === 'pensionato' ? 6.5 * 60 : 8 * 60) + rr() * 90;
    // quello che è cominciato ieri e va oltre la mezzanotte (turno di notte, giro)
    const carry = P.carry && P.carry.day === day - 1 ? P.carry : null; P.carry = null;
    if (carry) { add(0, carry.tgt, carry.act, carry.label, true); plan[plan.length - 1].cont = true; add(carry.until, home, 'sonno', 'rientra a dormire'); }
    else add(0, home, 'sonno', 'dorme');
    // chi lavora di notte dorme di giorno
    const works = P.job && !(wd === 6 && !P.job.night) && !(/^maestr/.test(P.job.title) && wd >= 5);
    const workEnd = works ? Math.min(P.job.end * 60, 1439) : -1;
    const busy = m => works && m >= P.job.start * 60 - 60 && m < P.job.end * 60;
    if (P.job && P.job.night) { add((carry ? carry.until : 0) + 60, home, 'sonno', 'dorme di giorno'); add(14 * 60, home, 'casa', 'a casa'); }
    // la mattina: sveglia, spesa o mercato
    const market = ev.find(e => e[3] === 'mercato'), fish = ev.find(e => e[3] === 'pesce');
    add(wake, home, 'casa', 'si prepara');
    if (works) {
      // si esce prima dell'ingresso: chi è puntuale esce con margine, chi no all'ultimo (o tardi)
      // chi è puntuale esce con margine; chi non lo è, ogni tanto si attarda (a letto, al bar, a chiacchierare)
      const s = P.job.start * 60, lead = 20 + P.punct * 25;
      const delay = rr() < (1 - P.punct) * .35 ? 10 + rr() * 40 : 0;
      const dep = Math.round(s - lead + delay);
      add(dep, P.job.t, 'lavoro', `al lavoro (${P.job.title})`, true);
      P.workToday = { day, start: s, end: P.job.end * 60, dep, late: delay > lead, paid: false };
      // pausa pranzo per chi fa la giornata intera
      if (P.job.end - P.job.start >= 9 && P.job.end >= 15 && !P.job.night && rr() < .6) { add(13 * 60, rr() < .5 ? home : pubIn(IX.fun.bar) || home, 'pranzo', 'pausa pranzo'); add(14 * 60, P.job.t, 'lavoro', 'torna al lavoro', true); }
      if (P.job.end * 60 > 1439) P.carry = { day, tgt: P.job.t, act: 'lavoro', label: `turno di notte (${P.job.title})`, until: P.job.end * 60 - 1440 };
      else add(workEnd, home, 'casa', 'torna a casa');
    } else {
      P.workToday = null;
      if (market && rr() < .7 - (P.need && P.need.paura > .6 ? .5 : 0)) add(8 * 60 + rr() * 120, target(market[4]), 'mercato', 'al mercato');
      else if (rr() < .6 && IX.fun.shops.length) add(9 * 60 + rr() * 120, pubIn(IX.fun.shops), 'spesa', 'a fare la spesa');
      if (P.status === 'disoccupato' && rr() < .5) add(7 * 60 + rr() * 60, target('calata') || target('molo'), 'cerca', 'cerca lavoro a giornata');
      if (fish && rr() < .3 && P.age > 50) add(fish[1] + rr() * 30, target('molo'), 'mercato', 'all\'asta del pesce');
      add(12 * 60 + 30 + rr() * 40, home, 'pranzo', 'pranza a casa');
      // pomeriggio
      const aft = P.status === 'pensionato' ? (rr() < .5 ? pubIn(IX.fun.bar) : pubIn(IX.fun.out)) : P.age < 28 ? pubIn(IX.fun.young.concat(IX.fun.out)) : pubIn(IX.fun.out.concat(IX.fun.bar));
      const atA = 15 * 60 + rr() * 90, [tA, lA, oA] = fun(atA, aft, 'esce');
      add(atA, tA, 'svago', lA, false, oA);
    }
    // eventi della settimana
    ev.forEach(([, a, z, id, where]) => {
      const t = target(where); if (!t) return;
      if (id === 'bollettino' && !busy(a)) add(a - 10, t, 'bollettino', 'alla Lettura del Bollettino', true);
      if (id === 'messa' && P.faith > .45 && !busy(a)) add(a - 15, t, 'messa', 'a messa', true);
      if (id === 'vespro' && P.faith > .85 && P.age > 60 && !busy(a)) add(a - 10, t, 'messa', 'al vespro', true);
      if (id === 'struscio' && rr() < .55 && !busy(a)) add(a + rr() * 60, t, 'svago', 'a passeggio sul lungomare');
      if (id === 'tombola' && P.age > 45 && rr() < .45 && !busy(a)) add(a - 10, t, 'svago', 'alla tombola', true);
      if (id === 'sabato' && P.age < 35 && rr() < .5 && !shady && !busy(a)) add(a + rr() * 60, t, 'svago', 'in discoteca');
    });
    // la sera: bar, osteria, piazza; i vecchi e i timorosi a casa presto. Chi lavora la sera, finito il turno, a casa.
    const lateShift = works && P.job.end * 60 > 20 * 60;
    if (!(P.job && P.job.night) && !lateShift) {
      const N = P.need || {}, goOut = (P.status === 'pensionato' ? .35 : P.age < 30 ? .75 : .5) + (N.rabbia > .6 ? .2 : 0) + (N.compagnia > .6 ? .15 : 0) - (N.paura > .55 ? .6 : 0) - (P.thrift ? .25 : 0) - (P.selfCurfew ? 1 : 0);
      if (rr() < goOut + (P.vice === 'vino' ? .3 : 0)) { const t = P.vice === 'gioco' ? target('flipper') || pubIn(IX.fun.bar) : pubIn(IX.fun.bar.concat(IX.fun.out)); const atE = 19 * 60 + 30 + rr() * 90, [tE, lE, oE] = P.vice ? [t, P.vice === 'vino' ? 'a bere' : 'esce la sera', P.vice === 'vino' ? 'bancone' : undefined] : fun(atE, t, 'esce la sera'); add(atE, tE, 'svago', lE, false, oE); }
      add(Math.min(curf - 25 - rr() * 60 * (1 - n.tr.legge), 23 * 60 + 40), home, 'casa', 'rientra prima dell\'Ora Quieta');
      add(Math.min(1439, Math.min(curf, 23 * 60 + 59) - 5 + rr() * 10), home, 'sonno', 'dorme');
    } else if (lateShift && !P.job.night) add(Math.min(1439, workEnd + 15), home, 'sonno', 'dorme');
    // il giro: nelle ore sue, sopra tutto il resto (chi ha un turno non lo salta)
    if (P.giro && GIRI[P.giro]) {
      const g = GIRI[P.giro], need = P.money < 20 || (P.debt && P.debt.amount > P.money) ? .9 : .55;
      g.when.forEach(([a, z]) => {
        if (rr() > need || busy(a * 60) || busy(Math.min(z, 23.9) * 60)) return; const t = pubIn(g.places); if (!t) return;
        add(a * 60 + rr() * 30, t, 'giro', g.label);
        if (z >= 24) P.carry = { day, tgt: t, act: 'giro', label: g.label + ' (notte fonda)', until: z * 60 - 1440 };
        else add(z * 60, home, 'casa', 'rientra');
      });
    }
    // [vita] la dispensa vuota: si fa la spesa dopo il lavoro
    if (works && P.pantry <= 1 && workEnd > 0 && workEnd < 19 * 60) { const c = chooseObj(st, n, ['spesa', 'mercato'], { at: workEnd + 10, from: P.job.t }); if (c) add(workEnd + 10, c.t, c.o.act, 'fa la spesa dopo il lavoro', false, c.o.id); }
    // [vita] i passi di oggi dei progetti
    if (!isPassive(st, n)) planProjects(st, n, day, plan, m => busy(m) || !!(P.job && P.job.night && m < 14 * 60));
    // appuntamenti presi per oggi
    const ap = P.appt; if (ap && dayIdx(ap.t) === day) { const am = minOfDay(ap.t); for (let i = plan.length - 1; i >= 0; i--) if (plan[i].at > am - 10 && plan[i].at < am + 60 && !plan[i].pj && plan[i].act !== 'lavoro') plan.splice(i, 1); add(am - 10, ap.tgt, 'appuntamento', `appuntamento con ${G.nameOf(st, ap.with)}`, true); if (!plan.some(x => (x.act === 'sonno' || x.act === 'casa') && x.at > am && x.at < am + 110)) add(am + 60 + rr() * 40, home, 'casa', 'torna a casa'); }
    insertImpegni(st, n, day, plan, add);   // [imprese]
    plan.sort((a, b) => a.at - b.at);
    P.plan = plan; P.planDay = day;
    return plan;
  }
  // [imprese] gli impegni presi con un gruppo (P.impegni: { id, t, dur, tgt, label, obj }): un blocco fisso che sposta
  // quello che non è lavoro, e dopo si torna a casa
  function insertImpegni(st, n, day, plan, add) {
    const P = n.pop; if (!P.impegni || !P.impegni.length) return;
    P.impegni = P.impegni.filter(e => e.t + (e.dur || 90) > st.t - 60);
    P.impegni.forEach(e => {
      if (dayIdx(e.t) !== day) return; const am = minOfDay(e.t), end = Math.min(1439, am + (e.dur || 90));
      for (let i = plan.length - 1; i >= 0; i--) if (plan[i].at > am - 15 && plan[i].at < end && !plan[i].pj && plan[i].act !== 'lavoro' && plan[i].act !== 'appuntamento' && !(plan[i].cont)) plan.splice(i, 1);
      add(am - 10, e.tgt, 'impresa', e.label, true, e.obj); plan[plan.length - 1].imp = e.id;
      if (!plan.some(x => x.at >= end && x.at < end + 90)) add(end, P.homeT, 'casa', 'torna a casa');
    });
  }
  // il blocco di adesso. Ognuno ha il suo piccolo ritardo (così non partono tutti allo stesso minuto); chi è vicino
  // al giocatore cammina davvero, e a piedi il tempo di gioco corre (100 m ≈ 3 ore): parte prima, in base alla strada.
  const blockJit = (n, b) => { let h = b.at * 7 + 13; const s0 = String(n.id); for (let i = 0; i < s0.length; i++) h = (h * 31 + s0.charCodeAt(i)) % 9973; return (h / 9973) * 30 - 8; };
  function blockNow(st, n) {
    const P = n.pop, m = minOfDay(st.t); if (!P.plan.length) return null;
    let idx = 0;
    for (let i = 0; i < P.plan.length; i++) {
      const b = P.plan[i]; let at = b.fixed ? b.at : b.at + P.jit + blockJit(n, b);   // [passo] ogni blocco il suo ritardo: non partono sempre nello stesso ordine
      if (P.near && i > 0 && b.tgt) {
        // [convivenza] si parte prima per arrivare in tempo (agli orari fissi anche molto prima), ma non si lascia un impegno
        // fisso prima di averlo fatto: un appuntamento si aspetta almeno 45 minuti, il resto almeno 20
        const spd = 1.35 * (P.age > 70 ? .75 : P.age > 60 ? .88 : 1), lead = Math.min(b.fixed ? 320 : 150, dist(n.x, n.y, b.tgt.x, b.tgt.y) * 1.15 / spd * MPS), prev = P.plan[i - 1];   // la sua velocità vera, e un po' di margine per le curve
        const floor = prev.act === 'appuntamento' ? prev.at + 55 : prev.act === 'impresa' ? prev.at + 70 : prev.fixed ? prev.at + 20 : -1e9;   // [imprese] un impegno di gruppo si fa fino in fondo
        at = Math.max(at - lead, Math.min(at, floor));
      }
      if (at <= m) idx = i;
    }
    if (P.curPlan === P.plan && P.curIdx > idx) idx = P.curIdx;   // un blocco cominciato non torna indietro
    P.curPlan = P.plan; P.curIdx = idx;
    return P.plan[idx];
  }

  // ---------------- LIVELLO DI DETTAGLIO ----------------
  function mustBeNear(st, n) {
    if (isPassive(st, n)) return true;   // Grigi in servizio, membri della Risacca: li muove sempre il motore
    if (n.room) return true;             // [scopo] è nella stanza col giocatore
    if (n.panic > 0 || n.stun > 0 || n.aggro || n.jailedUntil > st.t) return n.jailedUntil <= st.t;
    return ['fugge', 'denuncia', 'affronta', 'combatte', 'insegue'].includes(n.action.name);
  }
  function updateLod(st) {
    const p = st.player, list = [];
    for (const n of st.npcs) {
      if (!n.pop || n.dead) continue;
      const d = dist(n.x, n.y, p.x, p.y), P = n.pop;
      const want = mustBeNear(st, n) || d < CFG.near || (P.near && d < CFG.far);
      list.push([n, want ? d : 1e9]);
    }
    list.sort((a, b) => a[1] - b[1]);
    let nearN = 0;
    list.forEach(([n, d]) => {
      const P = n.pop, near = d < 1e8 && nearN < CFG.maxNear;
      if (near) nearN++;
      if (near && !P.near) { if (isPassive(st, n)) { P.near = true; P.lod = 'vicino'; } else wakeNear(st, n); }
      else if (!near && P.near) sleepFar(st, n);
    });
    st.pop.nearN = nearN;
  }
  // da lontano a vicino: si riparte da dove dovrebbe essere
  function wakeNear(st, n) {
    const P = n.pop; P.near = true; P.lod = 'vicino';
    if (P.emer) { if (n.inside && P.emer.phase === 'go') n.inside = false; return; }   // [azioni] un imprevisto in corso: resta dov'è
    const b = blockNow(st, n), t = b && b.tgt;
    if (!t) return;
    P.cur = b; P.curKey = tkey(t) + '@' + b.at;
    if (t.k === 'b' && P.at && tkey(P.at) === tkey(t)) { n.inside = true; n.action = { name: 'dentro', scores: [], why: `È dentro ${t.label}.`, since: st.clock }; }
    else if (t.k === 'p') { const s = G.wanderSpot(st, PLACES[t.pid]); n.x = s.x; n.y = s.y; n.inside = false; P.at = t; n.path = []; n.action = { name: 'routine', scores: [], why: b.label, since: st.clock }; }
    else { n.inside = true; P.at = t; n.x = t.x; n.y = t.y; n.action = { name: 'dentro', scores: [], why: `È dentro ${t.label}.`, since: st.clock }; }
  }
  function sleepFar(st, n) { const P = n.pop; P.near = false; P.lod = 'lontano'; n.path = []; n.speedNow = 0; if (!P.emer) snapFar(st, n); }
  // il livello leggero: sempre "dentro" (invisibile, fuori dal passaparola del motore), nel posto del blocco
  function snapFar(st, n) {
    const P = n.pop, b = blockNow(st, n); if (!b) return;
    const key = tkey(b.tgt) + '@' + b.at;
    if (P.curKey !== key) { onBlockStart(st, n, b, P.cur); P.cur = b; P.curKey = key; }
    P.at = b.tgt; n.x = b.tgt.x + (Math.random() - .5) * .6; n.y = b.tgt.y + (Math.random() - .5) * .6; n.inside = true;
    n.action = { name: 'altrove', scores: [], why: `${cap(b.label)}${b.label.includes(b.tgt.label) ? '' : ` (${b.tgt.label})`}.`, since: n.action.since };
  }
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const o = n => (n && n.pop && n.pop.sex === 'f' ? 'a' : 'o');   // desinenza: arrivato / arrivata

  // ---------------- QUANDO COMINCIA UN BLOCCO ----------------
  function onBlockStart(st, n, b, prev) {
    const P = n.pop, S = st.pop.stats;
    // si chiude il lavoro: ore lavorate, paga maturata (si ritira il venerdì)
    if (prev && prev.act === 'lavoro' && P.workToday && !P.workToday.paid && b.act !== 'lavoro') {
      const h = Math.max(1, (Math.min(minOfDay(st.t), P.workToday.end) - P.workToday.start) / 60);
      P.owed += h * P.job.pay * (P.workToday.late ? .85 : 1); P.workToday.paid = true;
    }
    if (b.act === 'lavoro' && P.workToday && b.fixed && b.at === Math.round(P.workToday.dep)) {
      if (P.workToday.late) {
        P.late++; S.ritardi++;
        note(st, n, `arrivat${o(n)} tardi al lavoro (${P.job.title})`, 'bad');
        if (P.near && !n.inside) G.say(st, n, pick(Math.random, ['Sono in ritardo!', 'Madonna, il padrone mi ammazza…', 'Di nuovo tardi!']), 2);
        if (P.late >= 4 && Math.random() < .5) fire(st, n);
      } else if (P.late > 0 && Math.random() < .25) P.late--;
    }
    // [vita] si usano gli oggetti del posto; il passo di un progetto; le scritte sui muri; quello che si è fatto oggi
    if (P.ints) {
      useObjects(st, n, b); satisfy(st, n, b);
      if (b.tgt && !isHomeT(P, b.tgt)) { readWalls(st, n, b.tgt); if (P.lunga && Math.random() < .3) recall(st, n, { place: b.tgt.label }); }   // [memoria] tornare in un posto fa ricordare
      P.today.push({ t: st.t, label: b.label + (b.tgt && !isHomeT(P, b.tgt) && !b.label.includes(b.tgt.label) ? ` (${b.tgt.label})` : '') }); if (P.today.length > 16) P.today.shift();
      if (b.pj) runStep(st, n, b);
    } else satisfy(st, n, b);
    if (b.act === 'svago' && b.tgt.place === 'flipper' && P.vice === 'gioco') { if (MONEY.gamble) MONEY.gamble(st, n, b.tgt); else { const w = (Math.random() - .62) * 30; P.money += w; note(st, n, w > 0 ? `vinto ${Math.round(w)}.000 lire alla bisca` : `perso ${Math.round(-w)}.000 lire alla bisca`, w > 0 ? 'good' : 'bad'); } }   // [soldi] le macchinette
    if (b.act === 'giro' && !b.cont) doGiro(st, n, b);
    if (b.act === 'appuntamento' && !P.near) P.apptArrived = st.t;   // [convivenza] da vicino conta l'arrivo vero (nearMove)
  }
  function fire(st, n) {
    const P = n.pop; if (!P.job) return;
    note(st, n, `licenziat${o(n)}: troppi ritardi da ${P.job.name || P.job.title}`, 'bad');
    G.addLog(st, `${G.clockStr(st.t)} · ${n.name} ha perso il posto (${P.job.title}): troppi ritardi.`, 'info');
    st.pop.stats.licenziati++;
    P.job = null; P.status = 'disoccupato'; P.late = 0; n.role = n.pop.sex === 'f' ? 'Disoccupata' : 'Disoccupato';
    if (n.tr.legge < .4 && !P.giro && Math.random() < .5) { P.giro = Math.random() < .5 ? 'borsaiolo' : 'ladro'; }
    planDay(st, n, dayIdx(st.t));
  }

  // ---------------- MALAVITA ----------------
  function doGiro(st, n, b) {
    const P = n.pop, g = GIRI[P.giro]; if (!g) return;
    const S = st.pop.stats, earn = g.earn[0] + Math.random() * (g.earn[1] - g.earn[0]);
    // chi è presente: possibili vittime e testimoni (abitanti nello stesso posto)
    const here = st.npcs.filter(k => k !== n && k.pop && !k.dead && k.pop.at && tkey(k.pop.at) === tkey(b.tgt));
    if (P.giro === 'borsaiolo' || P.giro === 'ladro') {
      const pool = P.giro === 'ladro' ? st.npcs.filter(k => k.pop && !k.dead && k.pop.homeT && dist(k.pop.homeT.x, k.pop.homeT.y, b.tgt.x, b.tgt.y) < 40 && k.pop.hh !== P.hh) : here;
      const victim = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
      if (!victim) return;
      const type = P.giro === 'ladro' ? 'scasso' : 'scippo', took = Math.min(Math.max(2, victim.pop.money * .4), earn);
      victim.pop.money -= took; P.money += took * (P.giro === 'ladro' ? .5 : 1); S.furti++;
      const ev = crimeEvent(st, n, type, victim, b.tgt);
      const seen = Math.random() < (P.giro === 'ladro' ? .12 : .3) * (1.2 - n.tr.cor * .4);
      const disc = st.t + (P.giro === 'ladro' ? 300 : 15);
      st.timers.push({ at: disc, kind: 'popDiscover', npc: victim.id, ev: ev.id, thief: seen ? n.id : null, type, place: b.tgt.label, took });
      note(st, n, `${type === 'scasso' ? 'svaligiato casa ' + victim.pop.sur : 'alleggerito ' + victim.first} a ${b.tgt.label}`, 'shady');
      if (P.giro === 'ladro') { const ric = st.npcs.find(k => k.pop && k.pop.giro === 'ricettatore' && !k.dead); if (ric) { ric.pop.money += took * .3; note(st, ric, `comprato roba da ${n.first}`, 'shady'); } }
    } else if (P.giro === 'spacciatore') {
      const buyers = st.npcs.filter(k => k.pop && k.pop.vice === 'roba' && !k.dead && k.pop.money > 5);
      buyers.slice(0, 3).forEach(k => { const c = 3 + Math.random() * 5; k.pop.money -= c; P.money += c; if (Math.random() < .3) note(st, k, k.pop.money < 10 ? 'ha speso gli ultimi soldi per la roba' : 'ha comprato la roba al Flipper', 'bad'); });
      P.money += earn * .3;
    } else if (P.giro === 'trafficante') {
      P.money += earn; note(st, n, 'scaricato casse dal continente al porto, di notte', 'shady');
    } else if (P.giro === 'orecchio') {
      P.money += earn;
      const zia = G.byId(st, 'zia'); if (zia) { let told = 0; n.mem.filter(m => (m.actor === 'player' || (m.type && /scritta|volantino|murale|sabotaggio/.test(m.type))) && !m.silenced).slice(0, 3).forEach(m => { if (G.addMemory(st, zia, Object.assign({}, m, { id: undefined, source: 'voce', via: (m.via || []).concat([n.first]), conf: m.conf * .85 }))) told++; }); if (told) note(st, n, `riferito ${told} cose alla Zia`, 'shady'); }
    } else { P.money += earn; }
    // retata: dipende dalla repressione
    const rl = st.ris ? Math.min(5, Math.floor(st.ris.repr / 20)) : 1;
    if (Math.random() < g.risk * (.6 + rl * .25)) arrestFar(st, n, P.giro === 'trafficante' ? 'traffico d\'armi' : P.giro === 'spacciatore' ? 'spaccio' : 'furto');
  }
  function crimeEvent(st, n, type, victim, t) {
    const ev = { id: st.nextId++, type, actor: n.id, target: victim.id, owner: victim.id, x: t.x, y: t.y, t: st.t, sev: G.SEV[type] || .5, noise: 0, place: t.label, npcCrime: true };
    st.events.unshift(ev); if (st.events.length > 60) st.events.pop();
    return ev;
  }
  function arrestFar(st, n, why) {
    if (n.jailedUntil > st.t) return;
    n.jailedUntil = st.t + 240 + Math.random() * 480; n.inside = true; n.path = []; st.pop.stats.arresti++;
    note(st, n, `fermat${o(n)} dai Grigi: ${why}`, 'bad', { w: .85, tag: 'fermato' });
    G.addLog(st, `${G.clockStr(st.t)} · I Grigi hanno fermato ${n.name} (${why}).`, 'info');
    const hh = st.pop.households[n.pop.hh]; if (hh) hh.members.forEach(id => { const k = G.byId(st, id); if (k && k !== n) { note(st, k, `${n.first} è stat${o(n)} portat${o(n)} via dai Grigi`, 'bad', { w: .8, who: n.id, tag: 'arresto' }); feel(k, 'rabbia', .4); feel(k, 'paura', .2);
      // [vita] la notizia cambia la giornata subito: si corre alla Rocca
      if (k.pop.ints && !isPassive(st, k) && !(k.jailedUntil > st.t) && startProject(st, k, PROJ.notizie, { who: n.id })) planDay(st, k, dayIdx(st.t)); } });
    (n.pop.friends || []).forEach(id => { const k = G.byId(st, id); if (k && k.pop) { feel(k, 'rabbia', .15); if (k.pop.ints) note(st, k, `hanno portato via ${n.first}`, 'bad', { w: .55, who: n.id, tag: 'arresto' }); } });
  }

  // ---------------- APPUNTAMENTI ----------------
  // tra amici: "ci vediamo domani alle 19 al bar". Anche il giocatore e la Risacca possono usarli (Popolo.appoint).
  function appoint(st, a, b, tgtRef, atT, why) {
    const t = typeof tgtRef === 'object' ? tgtRef : target(tgtRef); if (!t || !a.pop) return null;
    const ap = { with: b.id, tgt: t, t: atT, label: t.label, why: why || '', by: a.id };
    a.pop.appt = ap; note(st, a, `preso appuntamento con ${b.first} ${forDay(atT)} alle ${hhmm(minOfDay(atT))} a ${t.label}`, 'info');
    if (b.pop) { b.pop.appt = ap.twin = { with: a.id, tgt: t, t: atT, label: t.label, why, by: a.id }; note(st, b, `appuntamento con ${a.first} ${forDay(atT)} alle ${hhmm(minOfDay(atT))} a ${t.label}`, 'info'); }
    st.pop.stats.appuntamenti++;
    [a, b].forEach(k => { if (k.pop && dayIdx(atT) === dayIdx(st.t)) { planDay(st, k, dayIdx(st.t)); } });
    return ap;
  }
  function makeAppointments(st) {
    // ogni mattina qualcuno si dà appuntamento per la sera o per domani
    const cand = st.npcs.filter(n => n.pop && !n.dead && n.pop.friends && n.pop.friends.length && !n.pop.appt && Math.random() < .06);
    const IX = buildIndex();
    cand.forEach(a => {
      const b = G.byId(st, pick(Math.random, a.pop.friends)); if (!b || b.dead || !b.pop || b.pop.appt) return;
      const when = Math.random() < .5 ? dayIdx(st.t) * 1440 + (18 + Math.floor(Math.random() * 3)) * 60 + pick(Math.random, [0, 15, 30]) : (dayIdx(st.t) + 1) * 1440 + (11 + Math.floor(Math.random() * 9)) * 60 + pick(Math.random, [0, 30]);
      if (when <= st.t + 30) return;
      const wm = minOfDay(when), wdw = weekday(when), free = k => !k.pop.job || k.pop.job.night || wdw === 6 || wm < k.pop.job.start * 60 - 60 || wm > k.pop.job.end * 60 + 15;
      if (!free(a) || !free(b)) return;
      const where = pick(Math.random, IX.fun.bar.concat(IX.fun.out));
      appoint(st, a, b, where, when, pick(Math.random, ['due chiacchiere', 'un favore', 'parlare di soldi', 'una partita a carte', 'notizie di famiglia']));
    });
  }
  function checkAppointments(st) {
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || !P.appt || P.appt.by !== n.id) return;   // la coppia si controlla una volta, da chi l'ha proposto
      const ap = P.appt; if (st.t < ap.t + 35) return;
      const other = G.byId(st, ap.with), O = other && other.pop;
      const came = k => k && k.pop && k.pop.apptArrived && k.pop.apptArrived >= ap.t - 60 && k.jailedUntil <= ap.t && !k.dead;
      const a = came(n), b = O ? came(other) : true;
      if (a && b) { note(st, n, `visto ${other.first} a ${ap.label} (${ap.why})`, 'good', { who: other.id, place: ap.label }); if (O) note(st, other, `visto ${n.first} a ${ap.label} (${ap.why})`, 'good', { who: n.id, place: ap.label }); if (O) { n.pop.need.compagnia = 0; O.need.compagnia = 0; } }
      else if (a && !b) { note(st, n, `${other.first} non si è fatt${o(other)} vedere a ${ap.label}`, 'bad', { who: other.id, tag: 'bidone' }); note(st, other, `ha dato buca a ${n.first}`, 'info', { who: n.id }); st.pop.stats.bidoni++; }
      else if (!a && b && O) { note(st, other, `${n.first} non si è fatt${o(n)} vedere a ${ap.label}`, 'bad', { who: n.id, tag: 'bidone' }); note(st, n, `ha dato buca a ${other.first}`, 'info', { who: other.id }); st.pop.stats.bidoni++; }
      if (ap.pj) meetResult(st, n, ap.pj, a && b);
      if (ap.deal) MEET.forEach(f => { try { f(st, n, other, ap, a, b); } catch (e) { } });   // [scambi] un patto da chiudere all'appuntamento
      [n, other].forEach(k => { if (k && k.pop && k.pop.appt === ap || (k && k.pop && k.pop.appt && k.pop.appt.t === ap.t)) { k.pop.appt = null; k.pop.apptArrived = 0; } });
    });
  }

  // ---------------- BISOGNI ----------------
  // fame, sonno, igiene, compagnia, svago crescono con le ore; rabbia e paura nascono dai fatti e calano piano
  const feel = (n, k, v) => { if (n.pop && n.pop.need) n.pop.need[k] = clamp(n.pop.need[k] + v, 0, 1); };
  const SOCIAL = { sfogo: 1, svago: 1, mercato: 1, appuntamento: 1, messa: 1, bollettino: .3, lavoro: .35, pranzo: .3, casa: .25, spesa: .3, cerca: .2, giro: .2 };
  function needsHour(st, n) {
    const P = n.pop, N = P.need, b = P.cur, a = b ? b.act : 'casa', sleeping = a === 'sonno' && n.inside;
    const work = a === 'lavoro', manual = P.job && /operai|scarica|pescat|braccian|cavator|carpent|saldat|forna|salinar|facchin|vignaiol|muratore/.test(P.job.title);
    const jailed = n.jailedUntil > st.t;
    // i bisogni crescono con le ore; li calano gli oggetti che si stanno usando
    N.fame = clamp(N.fame + (sleeping ? .02 : work && manual ? .08 : .06), 0, 1);
    N.sonno = clamp(N.sonno + (sleeping ? (P.ints ? 0 : -.17) : work ? .05 : .038) - (jailed && minOfDay(st.t) < 6 * 60 ? .1 : 0), 0, 1);
    N.igiene = clamp(N.igiene + (work && manual ? .06 : .025), 0, 1);
    const company = SOCIAL[a] || 0, fam = st.pop.households[P.hh] && st.pop.households[P.hh].members.length > 1 && (a === 'casa' || a === 'pranzo') ? .3 : 0;
    N.compagnia = clamp(N.compagnia + (sleeping ? .01 : .05) - (company + fam) * (P.ints ? .1 : .2), 0, 1);
    N.svago = clamp(N.svago + (sleeping ? 0 : work ? .035 : .025) - (!P.ints && (a === 'svago' || a === 'sfogo') ? .3 : 0) - (a === 'sfogo' ? .2 : 0), 0, 1);
    N.rabbia = clamp(N.rabbia - .012, 0, 1); N.paura = clamp(N.paura - .02 + (st.ris ? Math.min(5, Math.floor(st.ris.repr / 20)) * .006 : 0), 0, 1);
    N.soldi = clamp((P.rent + (P.debt ? P.debt.amount * .3 : 0) + 15 - (MONEY.funds ? MONEY.funds(st, n) : P.money)) / 120, 0, 1);   // [soldi] contano anche il conto e il materasso
    if (P.ints && !jailed) applyHour(st, n);
    // [vita] al lavoro si mangia lì: la schiscetta da casa o un panino
    if (P.ints && work && N.fame > .6 && st.t - (P.ateAt || 0) > 300) { P.ateAt = st.t; if (P.pantry >= 1) P.pantry -= 1; else { P.money -= 2; if (MONEY.spend) MONEY.spend(st, n, 2, 'cibo'); } N.fame = Math.max(0, N.fame - .55); }
    // [vita] a casa di notte si dorme anche senza un blocco "sonno"
    if (P.ints && a === 'casa' && n.inside && isHomeT(P, P.at) && (minOfDay(st.t) >= 23 * 60 || minOfDay(st.t) < 6 * 60)) N.sonno = clamp(N.sonno - .17, 0, 1);
    // i membri della Risacca mangiano e bevono con la Risacca
    if (n.ris && n.ris.member) N.fame = n.ris.fame;
    // gli interessi trascurati si fanno sentire (≈ +0,15 al giorno)
    if (P.want) for (const k in P.want) P.want[k] = clamp(P.want[k] + P.intW[k] * .006, 0, 1.2);
    if (n.ris && N.rabbia > .5) n.ris.ideo = clamp(n.ris.ideo + (N.rabbia - .5) * .01, 0, 1);   // la rabbia avvicina alla Risacca
    if (n.ris && N.paura > .6) n.ris.ideo = clamp(n.ris.ideo - .003, 0, 1);
    if (!isPassive(st, n) && !jailed) urge(st, n);
  }
  // quando un bisogno è urgente e il blocco non ha orario fisso, si cambia programma adesso
  // [vita] il bisogno più forte sceglie l'oggetto migliore (e il posto dove sta); il programma si sposta fino al blocco dopo
  const URGE = [['sonno', .9], ['paura', .72], ['fame', .82], ['igiene', .88], ['compagnia', .85], ['svago', .9], ['rabbia', .75]];
  const ACTS_FOR = { fame: ['pranzo', 'spesa'], igiene: ['bagno'], compagnia: ['svago'], svago: ['svago'], rabbia: ['svago'] };
  function urge(st, n) {
    const P = n.pop, N = P.need, b = P.cur; if (!b || b.fixed || b.act === 'giro' || b.urge || n.jailedUntil > st.t || P.emer) return;
    const m = minOfDay(st.t), cf = P.selfCurfew ? Math.min(curfewFrom(st), P.selfCurfew) : curfewFrom(st), lateNight = m >= Math.min(cf - 30, 22 * 60) || m < 6 * 60;
    if (b.act === 'sonno' && (N.sonno > .3 || m < 6.5 * 60 || m > 21 * 60)) return;   // chi dorme non si alza per un capriccio
    const list = URGE.filter(([k, th]) => N[k] > th).sort((x, y) => (N[y[0]] - y[1]) - (N[x[0]] - x[1]));
    let tgt = null, act = null, label = null, obj;
    for (const [k] of list) {
      if (k === 'sonno') { if (b.act === 'sonno') return; tgt = P.homeT; act = 'sonno'; label = 'casca dal sonno, va a dormire'; break; }
      if (k === 'paura') { if (b.act === 'casa' || b.act === 'sonno') continue; tgt = P.homeT; act = 'casa'; label = 'ha paura, si chiude in casa'; break; }
      if (lateNight) continue;
      if (k === 'rabbia' && n.ris && n.ris.ideo > .5 && b.act !== 'sfogo') { const t = target(pick(Math.random, ['bar', 'osteria', 'osteria_sg'])); if (t) { tgt = t; act = 'sfogo'; label = 'va al bar a sfogarsi contro la Tutela'; break; } }
      if (k === 'compagnia' && Math.random() < .4) {
        const fr = (P.friends || []).map(id => G.byId(st, id)).find(x => x && x.pop && !x.dead && x.pop.cur && x.pop.cur.act === 'casa' && !isHomeT(P, x.pop.homeT));
        if (fr) { tgt = fr.pop.homeT; act = 'svago'; label = `passa a trovare ${fr.first}`; break; }
      }
      const c = chooseObj(st, n, ACTS_FOR[k] || ['svago'], { focus: k });
      if (!c || (b.tgt && tkey(c.t) === tkey(b.tgt) && b.act === c.o.act)) continue;
      tgt = c.t; act = c.o.act; obj = c.o.id;
      label = { fame: c.o.id === 'cucina' ? 'ha fame, torna a casa a mangiare' : c.o.act === 'spesa' || c.o.act === 'mercato' ? 'la dispensa è vuota, va a fare la spesa' : 'ha fame, va a mangiare', igiene: 'va a darsi una lavata', compagnia: 'cerca compagnia', svago: 'si annoia: ' + (DOING[c.o.id] || 'esce'), rabbia: 'deve sfogarsi: ' + (DOING[c.o.id] || 'esce') }[k];
      break;
    }
    if (!tgt) return;
    const nb = { at: m, tgt, act, label, fixed: true, urge: true, obj };
    P.plan.push(nb);
    // il prossimo blocco già previsto resta: l'urgenza dura fino a lì (al massimo un paio d'ore; chi dorme, dorme)
    const next = P.plan.find(x => x.at > m && !x.urge); if (act !== 'sonno' && (!next || next.at - m > 150)) P.plan.push({ at: Math.min(1439, m + 90), tgt: P.homeT, act: 'casa', label: 'torna a casa', urge: true });
    P.plan.sort((x, y) => x.at - y.at);
    if (P.curPlan === P.plan) P.curIdx = P.plan.indexOf(nb);   // gli indici si sono spostati: il blocco corrente è quello nuovo
    if (act === 'sfogo' || act === 'casa' || /trovare/.test(label)) note(st, n, label, act === 'sfogo' ? 'shady' : 'info', { place: tgt.label });
  }
  function satisfy(st, n, b) {
    const N = n.pop.need; if (!N) return;
    // [vita] il risveglio: lavarsi e mettere qualcosa sotto i denti
    if (n.pop.ints && n.pop._prevAct === 'sonno' && b.act !== 'sonno') { N.igiene = Math.min(N.igiene, .1); if (n.pop.pantry > 0 && N.fame > .25) { n.pop.pantry -= .5; N.fame = Math.max(0, N.fame - .35); } }
    n.pop._prevAct = b.act;
    // la cena di casa e la toletta della mattina (gli altri effetti li danno gli oggetti)
    if ((b.act === 'casa' || b.act === 'sonno') && isHomeT(n.pop, b.tgt) && minOfDay(st.t) > 18 * 60 && N.fame > .3) { if (n.pop.pantry > 0) { n.pop.pantry--; N.fame = Math.max(0, N.fame - .7); } else if (n.pop.money > 4) { n.pop.money -= 3; if (MONEY.spend) MONEY.spend(st, n, 3, 'cibo'); N.fame = Math.max(0, N.fame - .5); } }
    if (b.act === 'casa' && /si prepara|si alza/.test(b.label)) N.igiene = .05;
    if (b.act === 'sfogo') { N.rabbia = Math.max(0, N.rabbia - .3); N.compagnia = Math.max(0, N.compagnia - .3); if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .02, 0, 1); }
    if (b.act === 'bollettino') feel(n, n.ris && n.ris.ideo > .5 ? 'rabbia' : 'paura', .08);
  }
  function needWords(P, e) {
    const N = P.need; if (!N) return '';
    const w = [];
    if (N.fame > .75) w.push('ha fame'); if (N.sonno > .8) w.push(`è stanc${e} mort${e}`); if (N.igiene > .85) w.push('avrebbe bisogno di un bagno');
    if (N.compagnia > .8) w.push(`si sente sol${e}`); if (N.svago > .85) w.push('si annoia a morte');
    if (N.rabbia > .6) w.push(`è furios${e} con la Tutela`); if (N.paura > .6) w.push('ha paura');
    return w.length ? 'Adesso ' + w.join(', ') + '.' : '';
  }

  // ---------------- SOLDI ----------------
  function onHour(st, hr) {
    const day = dayIdx(st.t), wd = weekday(st.t);
    // [vita] a mezzanotte la Mente: si rilegge la giornata, si traggono conclusioni, si decidono i progetti; poi il programma di domani
    if (hr === 0) st.npcs.forEach(n => { if (n.pop && !n.dead) { if (n.pop.ints) { n.pop.yesterday = n.pop.today; n.pop.today = []; reflect(st, n); } planDay(st, n, day); } });
    if (hr === 8) makeAppointments(st);
    if (st.pop.walls.length) eraseWalls(st);   // [vita] la Tutela cancella i muri
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || n.dead) return;
      needsHour(st, n);
      if (hr === 21) { const x = P.ints ? 1 + Math.random() : 2 + Math.random() * 2; P.money -= x; if (MONEY.spend) MONEY.spend(st, n, x, 'spese'); }      // le spese della giornata (il cibo ora passa dagli oggetti) [soldi] vanno nelle casse delle botteghe
      if (hr === 20 && P.cast && P.job) { if (MONEY.castIncome) MONEY.castIncome(st, n); else P.money += P.job.pay * 4; }   // il cast: l'incasso della giornata [soldi] dalla cassa della sua bottega
      if (wd === 4 && hr === 18 && P.owed > 0) { if (MONEY.payday) MONEY.payday(st, n); else { P.money += P.owed; note(st, n, `ritirato la paga: ${Math.round(P.owed)}.000 lire`, 'good'); P.owed = 0; } }   // [soldi] la paga la versa il padrone, sul conto
      if (wd === 0 && hr === 9) { if (MONEY.rent) MONEY.rent(st, n); else { P.money -= P.rent; if (P.money < 0) note(st, n, 'non ce la fa a pagare l\'affitto', 'bad'); } }   // [soldi] addebito sul conto
      if (P.debt && hr === 12 && wd === 2) {
        P.debt.amount *= 1.1;   // lo Squalo vuole gli interessi il mercoledì
        if (P.money > 30) { const pay = Math.min(P.debt.amount, P.money * .5); P.money -= pay; P.debt.amount -= pay; if (MONEY.toFam) MONEY.toFam(st, pay, 'debito'); note(st, n, `dato ${Math.round(pay)}.000 lire allo Squalo`, 'bad'); if (P.debt.amount < 1) { P.debt = null; note(st, n, 'finito di pagare lo Squalo', 'good'); } }
        else { note(st, n, 'gli uomini dello Squalo sono passati a ricordargli il debito', 'bad', { w: .6, who: 'sandro', tag: 'squalo' }); feel(n, 'paura', .3); }
      }
      // la disperazione apre la porta alla malavita (o agli Orecchi)
      if (hr === 10 && !P.giro && P.money < -10 && Math.random() < .25) {
        P.giro = n.tr.legge < .45 ? (Math.random() < .6 ? 'borsaiolo' : 'ladro') : 'orecchio';
        note(st, n, P.giro === 'orecchio' ? 'la Zia gli ha offerto qualche soldo per tenere le orecchie aperte' : 'deciso di arrangiarsi in qualche modo', 'bad');
      }
      if (hr === 7 && P.status === 'disoccupato' && !P.projects && Math.random() < .08) findJob(st, n);
    });
  }
  function findJob(st, n, filter) {
    const IX = buildIndex(), taken = {}; st.npcs.forEach(k => { if (k.pop && k.pop.job && k.pop.job.t) { const key = (k.pop.job.base || k.pop.job.title) + '@' + tkey(k.pop.job.t); taken[key] = (taken[key] || 0) + 1; } });
    const open = IX.works.filter(w => (!filter || filter(w)) && (taken[w.title + '@' + tkey(w.bi >= 0 ? tB(w.bi) : target(w.id))] || 0) < w.slots);
    if (!open.length) return false;
    const w = open.sort((a, b) => dist(a.x, a.y, n.pop.homeT.x, n.pop.homeT.y) - dist(b.x, b.y, n.pop.homeT.x, n.pop.homeT.y))[0];
    n.pop.job = { title: genderTitle(w.title, n.pop.sex), base: w.title, pay: w.pay, start: w.start, end: w.end, night: w.night, t: w.bi >= 0 ? tB(w.bi) : target(w.id), name: w.name };
    n.pop.status = 'lavora'; n.role = roleOf({ status: 'lavora', job: w, sex: n.pop.sex });
    note(st, n, `trovato lavoro: ${w.title}${w.indoor ? ' da ' + w.name : ''}`, 'good', { w: .6, tag: 'lavoro' });
    return true;
  }

  // ---------------- CHIACCHIERE DA LONTANO ----------------
  // chi sta nello stesso posto (casa, bottega, bar) si racconta le cose anche senza il giocatore vicino
  function farTalk(st) {
    const groups = {};
    st.npcs.forEach(n => { if (!n.dead && n.jailedUntil <= st.t && n.pop && n.pop.at && (!n.pop.near || n.inside)) { const k = tkey(n.pop.at); (groups[k] = groups[k] || []).push(n); } });
    Object.values(groups).forEach(g => {
      if (g.length < 2) return;
      for (let i = 0; i < Math.min(3, g.length); i++) {
        const a = g[Math.floor(Math.random() * g.length)], b = g[Math.floor(Math.random() * g.length)];
        if (a === b) continue;
        share(st, a, b); share(st, b, a);
      }
    });
  }
  function closeness(st, a, b) {
    if (a.pop && b.pop && a.pop.hh === b.pop.hh) return .9;
    if (a.pop && a.pop.friends && a.pop.friends.includes(b.id)) return .7;
    return .25;
  }
  function share(st, sp, ls) {
    const cand = sp.mem.filter(m => !m.silenced && m.conf >= .3 && !m.liar && m.actor !== 'ignoto')
      .filter(m => { const k = ls.mem.find(x => x.eventId === m.eventId); return !k || (k.actor === 'ignoto' && m.actor !== 'ignoto'); })
      .sort((a, b) => G.weight(st, b) - G.weight(st, a));
    const m = cand[0]; if (!m) return false;
    const r = closeness(st, sp, ls); if (Math.random() > sp.tr.loq * (.4 + r)) return false;
    return !!G.addMemory(st, ls, { eventId: m.eventId, type: m.type, trueType: m.trueType, actor: m.actor, target: m.target, owner: m.owner, place: m.place, shop: m.shop, t: m.t, accepted: m.accepted, conf: m.conf * (r > .5 ? .86 : .76), source: 'voce', via: (m.via || []).concat([sp.first]), distorted: m.distorted, framedBy: m.framedBy });
  }


  // ================= LA VITA: dal bisogno all'azione =================

  // ---------------- OGGETTI: dove sono, quando si possono usare ----------------
  Object.entries(OGG).forEach(([k, o]) => { o.id = k; });
  let OBJT = null, OBJ_AT = null;
  function objIndex() {
    if (OBJT) return;
    OBJT = {}; OBJ_AT = {};
    for (const o of Object.values(OGG)) {
      const list = [];
      o.where.forEach(w => {
        if (w === 'casa') return;
        if (w.startsWith('use:')) { G.BUILDINGS.forEach((b, bi) => { if (b.use === w.slice(4) && b.door) { const t = tB(bi); if (t) list.push(t); } }); return; }
        const t = target(w); if (t) list.push(t);
      });
      OBJT[o.id] = list;
      list.forEach(t => { (OBJ_AT[tkey(t)] = OBJ_AT[tkey(t)] || []).push(o); });
    }
  }
  const isHomeT = (P, t) => !!(t && P.homeT && tkey(t) === tkey(P.homeT));
  const HOME_OBJ = Object.values(OGG).filter(o => o.where.includes('casa'));
  function openAt(o, m) {
    if (!o.h) return true;
    const a = o.h[0] * 60, z = o.h[1] * 60;
    return z > 1440 ? (m >= a || m < z - 1440) : (m >= a && m < z);
  }
  function usable(st, n, o, m) {
    const P = n.pop;
    if (o.needs && !o.needs(P, st)) return false;
    if (o.cost && P.money < o.cost) return false;
    return openAt(o, m);
  }
  // gli oggetti che si trovano a un bersaglio (a casa propria quelli di casa)
  function objectsAt(st, n, t) {
    objIndex();
    const P = n.pop, list = (t && OBJ_AT[tkey(t)]) || [];
    return isHomeT(P, t) ? list.concat(HOME_OBJ) : list;
  }
  // quanto vale un oggetto per questa persona adesso: bisogni che toglie, interessi che soddisfa
  function objValue(st, n, o, focus) {
    const P = n.pop, N = P.need; let v = 0;
    for (const k of NEEDS) {
      const d = -((o.once && o.once[k]) || 0) - ((o.perH && o.perH[k]) || 0) * 1.5;
      if (d > 0) v += d * (N[k] || 0) * (focus === k ? 2.2 : 1);
    }
    if (o.pantry > 0 && P.pantry <= 1) v += .35 * N.fame + .1;
    if (o.int && P.intW[o.int]) v += P.intW[o.int] * .22 + (P.want[o.int] || 0) * .45;
    if (o.tag === 'vino' && P.vice === 'vino') v += .25;
    if (o.tag === 'propaganda' && n.ris && n.ris.ideo > .6) v -= .15;   // chi odia il Garante la TV la spegne
    return v;
  }
  // la scelta: tra tutti gli oggetti che servono a questi blocchi, il migliore tenendo conto di strada, prezzo e paure
  function chooseObj(st, n, acts, opt) {
    objIndex();
    const P = n.pop, o2 = opt || {}, m = o2.at !== undefined ? o2.at : minOfDay(st.t), from = o2.from || { x: n.x, y: n.y };
    let best = null;
    for (const o of Object.values(OGG)) {
      if (!acts.includes(o.act) || !usable(st, n, o, m)) continue;
      const base = objValue(st, n, o, o2.focus) - (o.cost || 0) * (P.thrift ? .06 : .012);
      if (base <= .02) continue;
      const tl = o.where.includes('casa') ? [P.homeT].concat(OBJT[o.id]) : OBJT[o.id];
      for (const t of tl) {
        if (!t) continue;
        if (AVAIL.length && AVAIL.some(f => f(st, n, o, t) === false)) continue;
        if (P.avoid[t.label] > st.t) continue;
        if (o2.noHome && isHomeT(P, t)) continue;
        let s = base - dist(from.x, from.y, t.x, t.y) / 320 + Math.random() * .12;
        if (!isHomeT(P, t) && P.need.paura > .6) s -= .3;
        if (!best || s > best.s) best = { o, t, s };
      }
    }
    return best;
  }
  // all'arrivo: si usano gli oggetti del posto adatti al blocco
  function useObjects(st, n, b) {
    const P = n.pop; if (!P.need || !b.tgt) return;
    const m = minOfDay(st.t);
    let here = objectsAt(st, n, b.tgt).filter(o => usable(st, n, o, m) && (o.act === b.act || (b.act === 'progetto' && o.act === 'svago') || (b.act === 'appuntamento' && o.act === 'svago') || (b.act === 'casa' && o.act === 'casa')));
    if (b.obj) { const o = OGG[b.obj]; if (o && here.includes(o)) here = [o].concat(here.filter(x => x !== o)); }
    else here.sort((x, y) => objValue(st, n, y) - objValue(st, n, x));
    const pick = here.slice(0, b.act === 'casa' ? 2 : b.act === 'svago' || b.act === 'progetto' || b.act === 'appuntamento' ? 2 : 1).filter(o => USE.every(f => f(st, n, o, b.tgt) !== false));
    P.using = pick.filter(o => o.perH || o.pantryH || o.ideo);
    MONEY.t = b.tgt;   // [soldi] dove si paga
    pick.forEach(o => applyOnce(st, n, o));
    if (pick.length) P.lastObj = pick[0].label;
  }
  function applyOnce(st, n, o) {
    const P = n.pop, N = P.need;
    if (o.once) for (const k in o.once) N[k] = clamp((N[k] || 0) + o.once[k], 0, 1);
    if (o.side) for (const k in o.side) N[k] = clamp((N[k] || 0) + o.side[k], 0, 1);
    if (o.cost) { const c = o.cost * (.8 + Math.random() * .4); P.money -= c; if (MONEY.paid) MONEY.paid(st, n, o, c, MONEY.t); }   // [soldi] alla cassa del posto
    if (o.pantry) P.pantry = Math.max(0, P.pantry + o.pantry);
    if (o.int && P.want[o.int] !== undefined) P.want[o.int] = Math.max(0, P.want[o.int] - .35);
    if (o.tag === 'vino' && P.vice === 'vino') { N.rabbia = clamp(N.rabbia + .05, 0, 1); N.paura = clamp(N.paura - .08, 0, 1); }
  }
  function applyHour(st, n) {
    const P = n.pop, N = P.need, m = minOfDay(st.t);
    (P.using || []).forEach(o => {
      if (!openAt(o, m)) return;
      if (o.perH) for (const k in o.perH) N[k] = clamp((N[k] || 0) + o.perH[k], 0, 1);
      if (o.side && o.perH) for (const k in o.side) N[k] = clamp((N[k] || 0) + o.side[k], 0, 1);
      if (o.pantryH) P.pantry += o.pantryH;
      if (o.int && P.want[o.int] !== undefined) P.want[o.int] = Math.max(0, P.want[o.int] - .2);
      if (n.ris && o.ideo) {
        let d = o.ideo;
        if (o.tag === 'propaganda' && st.ris && st.t < st.ris.ripetitore.brokenUntil) d = 0;   // ripetitore sabotato: schermi neri
        n.ris.ideo = clamp(n.ris.ideo + d, 0, 1);
      }
      if (o.tag === 'radio' && n.ris && st.ris && st.ris.onAir && st.t - st.ris.onAir < 60) n.ris.ideo = clamp(n.ris.ideo + .01, 0, 1);
    });
  }

  // ---------------- PERSONE: dati della vita ----------------
  function initLife(P, ints, r) {
    P.ints = ints; P.intW = {}; P.want = {};
    ints.forEach(i => { P.intW[i.k] = i.w; P.want[i.k] = r() * .5; });
    P.projects = []; P.history = []; P.thoughts = []; P.avoid = {}; P.enemies = []; P.readWalls = {};
    P.owns = { radio: r() < .45, fotocamera: false }; P.pantry = 2 + Math.floor(r() * 4);
    P.today = []; P.yesterday = []; P.using = []; P.thrift = false; P.selfCurfew = 0;
    if (P.need) P.need.soldi = 0;
  }
  const isPassive = (st, n) => !!(n.cop || (n.ris && (n.ris.member || n.ris.task)) || (st.ris && st.ris.raid && st.ris.raid.cop === n.id));
  // il cast della storia entra nella vita: stessa scheda degli abitanti, con casa, orari e mestiere che hanno già
  function adopt(st, n) {
    if (n.pop || n.dead || !n.home) return;
    const homeT = target(n.home); if (!homeT) return;
    const R = RS(), c = R && R.CARDS && R.CARDS[n.id];
    const info = CAST_INFO[n.id] || [/a$/.test(n.first || '') ? 'f' : 'm', 25 + Math.floor(Math.random() * 40), null];
    const r = W.rng(5003 + n.id.split('').reduce((s, ch) => s * 31 + ch.charCodeAt(0) | 0, 7));
    const sex = info[0], age = info[1];
    const jobPlace = CAST_JOB[n.id] || (c && c.mestiere && c.mestiere.place) || n.shop || null;
    const jt = jobPlace ? target(jobPlace) : null;
    n.pop = {
      sex, age, sur: '', hh: 'c_' + n.id, rel: 'solo', homeT, cast: true,
      job: jt ? { title: n.role, base: n.role, pay: (c && c.mestiere && c.mestiere.pay) || 6, place: jobPlace, t: jt, start: 0, end: 0, cast: true } : null,
      status: jt ? 'lavora' : 'altro', punct: .85, faith: .3, vice: null, money: 40 + Math.floor(r() * 80), rent: 12, debt: null, owed: 0, late: 0, giro: null, lost: null, friendsK: [],
      need: { fame: .2 + r() * .3, sonno: .2 + r() * .2, igiene: .2 + r() * .3, compagnia: .2 + r() * .3, svago: .2 + r() * .3, rabbia: .05, paura: .1 },
      plan: [], lod: 'vicino', cur: null, curKey: '', at: homeT, diary: [], appt: null, workToday: null, nextDep: 0, jit: r() * 10, near: true, seenEv: {},
    };
    const ints = info[2] ? info[2].map((k, i) => ({ k, w: .95 - i * .15 })) : interestsFor({ sex, age }, r);
    initLife(n.pop, ints, r);
    if (n.pop.intW.fede) n.pop.faith = .8;
    if (n.id === 'rosa') n.pop.lost = 'il marito';
    if (n.id === 'betamax') n.pop.debt = { to: 'sandro', amount: 220 };
    st.pop.households['c_' + n.id] = { id: 'c_' + n.id, sur: '', home: homeT.bi, members: [n.id] };
    n.pop.friends = CAST_FRIENDS.filter(p => p.includes(n.id)).map(p => p[0] === n.id ? p[1] : p[0]).filter(id => G.byId(st, id));
    // la scheda per la chat: la storia scritta resta, sotto si aggiunge la vita di adesso
    if (c && !c.__vita) {
      const base = c.bio; c.__vita = true;
      Object.defineProperty(c, 'bio', { enumerable: true, configurable: true, get: () => `${base} ${lifeOf(st, n)}` });
    } else if (R && R.CARDS && !c) R.CARDS[n.id] = Object.defineProperty({ voice: 'normale, da gente di porto', ideo: n.ris ? n.ris.ideo : .3 }, 'bio', { enumerable: true, get: () => `${n.name}, ${n.role.toLowerCase()}. ${lifeOf(st, n)}` });
    planDay(st, n, dayIdx(st.t));
    const b = blockNow(st, n); if (b) { n.pop.cur = b; n.pop.curKey = tkey(b.tgt) + '@' + b.at; }
  }
  function adoptAll(st) { st.npcs.forEach(n => adopt(st, n)); }

  // il programma del cast: dai loro orari (la storia li vuole lì), con sonno, bisogni e progetti intorno
  function planCast(st, n, day, add) {
    const P = n.pop, home = P.homeT, sch = (n.sched || []).slice().sort((a, b) => a[0] - b[0]), jobRef = P.job && P.job.place;
    const raw = [];
    sch.forEach(([h, pl]) => {
      const t = target(pl); if (!t) return;
      const isH = pl === n.home || isHomeT(P, t), isJ = !!jobRef && pl === jobRef && (!isH || (h >= 7 && h < 21));   // chi vive dove lavora (la Zia, il Colonnello)
      raw.push({ at: h * 60, t, act: isJ ? 'lavoro' : isH ? 'casa' : 'svago', label: isJ ? 'al lavoro' : isH ? 'a casa' : `va a ${t.label}`, fixed: isJ });
    });
    if (!raw.length) raw.push({ at: 0, t: home, act: 'casa', label: 'a casa' });
    if (raw[0].at > 0) raw.unshift(Object.assign({}, raw[raw.length - 1], { at: 0 }));
    // il sonno: i notturni dormono di giorno; gli altri, il rientro della sera è per dormire
    if (n.nocturnal) {
      const post = raw.find(x => x.act === 'lavoro') || raw[0];
      raw.length = 0;
      raw.push(Object.assign({}, post, { at: 0 }), { at: 5 * 60, t: home, act: 'sonno', label: 'dorme di giorno' }, { at: 14 * 60, t: home, act: 'casa', label: 'a casa' }, Object.assign({}, post, { at: 21 * 60 }));
    } else {
      raw.forEach(x => { if (x.act === 'casa' && (x.at >= 21 * 60 || x.at < 5 * 60)) { x.act = 'sonno'; x.label = 'dorme'; } });
      if (!raw.some(x => x.act === 'sonno')) {
        const late = raw.filter(x => x.at < 6 * 60 && x.act !== 'sonno').length > 0;
        if (raw.every(x => isHomeT(P, x.t))) { raw[0].act = 'sonno'; raw[0].label = 'dorme'; raw.push({ at: 7 * 60 + 30, t: home, act: 'casa', label: 'si alza' }); }
        else raw.push({ at: late ? 3 * 60 + 30 : 23 * 60 + 30, t: home, act: 'sonno', label: 'dorme' });
      }
      // chi si alza a casa: prima colazione
      const wake = raw.find(x => x.act !== 'sonno' && x.at >= 5 * 60);
      if (wake && !isHomeT(P, wake.t)) raw.push({ at: Math.max(5 * 60, wake.at - 50), t: home, act: 'casa', label: 'si prepara' });
    }
    raw.forEach(x => add(x.at, x.t, x.act, x.label, x.fixed));
  }
  // le finestre in cui uno è al lavoro (per non metterci sopra i progetti)
  function workWindows(plan) {
    const w = []; plan.forEach((b, i) => { if (b.act === 'lavoro') w.push([b.at - 30, (plan[i + 1] ? plan[i + 1].at : 1440)]); });
    return w;
  }

  // ---------------- PROGETTI ----------------
  // un progetto è un'intenzione divisa in passi. Passi: go (andare in un posto a un'ora e farci qualcosa),
  // save (mettere da parte una cifra), meet (darsi appuntamento con qualcuno). fx restituisce: next, done, again, fail, skip.
  function nearestRef(n, list) { const P = n.pop; let best = null, bd = 1e9; list.forEach(ref => { const t = target(ref); if (t) { const d = dist(t.x, t.y, P.homeT.x, P.homeT.y); if (d < bd) { bd = d; best = t; } } }); return best; }
  function useRef(use) { return G.BUILDINGS.map((b, bi) => [b, bi]).filter(([b]) => b.use === use && b.door).map(([, bi]) => tB(bi)); }
  function buy(cost, own) { return (st, n, P) => { if (P.money < cost) return 'again'; P.money -= cost; if (own) P.owns[own] = true; return 'next'; }; }
  function tryJob(p, filter) { return (st, n, P) => { if (!P.job && Math.random() < p && findJob(st, n, filter)) return 'done'; return 'next'; }; }
  function friendFor(st, n, ok) {
    const P = n.pop, list = (P.friends || []).map(id => G.byId(st, id)).filter(k => k && k.pop && !k.dead && !k.pop.appt && k.jailedUntil <= st.t && !isPassive(st, k) && (!ok || ok(k)));
    return list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }
  function strangerFor(st, n) {
    // un collega o un vicino che non è ancora un amico
    const P = n.pop, list = st.npcs.filter(k => k !== n && k.pop && !k.dead && !k.pop.appt && !isPassive(st, k) && !(P.friends || []).includes(k.id) && k.pop.hh !== P.hh &&
      ((P.job && k.pop.job && k.pop.job.t && P.job.t && tkey(k.pop.job.t) === tkey(P.job.t)) || dist(k.pop.homeT.x, k.pop.homeT.y, P.homeT.x, P.homeT.y) < 25) && Math.abs(k.pop.age - P.age) < 20);
    return list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }
  const PROJ = {
    // --- dai bisogni ---
    lavoro: { need: true, label: () => 'trovare un lavoro', when: (st, n, P) => P.status === 'disoccupato' && P.age < 64 && !P.cast,
      steps: (st, n, P) => [
        { k: 'go', ref: 'calata', h: 7, label: 'chiede lavoro a giornata alla calata', fx: tryJob(.3, w => !w.indoor) },
        { k: 'go', ref: nearestRef(n, ['wu', 'bar', 'osteria', 'officina', 'magazzino']), h: 9, label: 'chiede nelle botteghe se cercano qualcuno', fx: tryJob(.35, w => w.indoor) },
        { k: 'go', ref: 'cantiere', h: 8, label: 'si presenta al cantiere', fx: tryJob(.4) },
        { k: 'go', ref: 'rocca', h: 10, label: 'fa domanda all\'Ufficio Rettifiche', fx: (st, n, P) => { if (n.ris) n.ris.ideo = clamp(n.ris.ideo - .05, 0, 1); return tryJob(.6)(st, n, P); } },
      ] },
    debito: { need: true, label: (st, n, P) => P.debt && P.debt.amount > 80 ? 'dare allo Squalo una parte del debito' : 'togliersi il debito con lo Squalo', when: (st, n, P) => P.debt && P.debt.amount > 30 && P.need.soldi > .35 && n.id !== 'sandro',
      steps: (st, n, P) => [
        { k: 'save', amount: Math.min(Math.round(P.debt.amount * .5), 80), label: 'mettere da parte i soldi per lo Squalo' },
        { k: 'go', ref: 'magazzino', h: 11, label: 'porta i soldi allo Squalo', fx: (st, n, P) => { if (!P.debt) return 'done'; const pay = Math.min(P.debt.amount, P.money * .7); P.money -= pay; P.debt.amount -= pay; if (MONEY.toFam) MONEY.toFam(st, pay, 'debito'); if (P.debt.amount < 1) P.debt = null; feel(n, 'paura', -.15); return 'done'; } },
      ] },
    affitto: { need: true, label: () => 'trovare i soldi dell\'affitto', when: (st, n, P) => weekday(st.t) >= 4 && (MONEY.funds ? MONEY.funds(st, n) : P.money) < P.rent && !P.cast,
      steps: (st, n, P) => {
        const fr = friendFor(st, n, k => k.pop.money > 40);
        return [
          { k: 'go', ref: P.job ? P.job.t : 'calata', h: P.job ? Math.max(6, P.job.start) : 7, label: P.job ? 'chiede un anticipo al padrone' : 'cerca una giornata al porto', fx: (st, n, P) => { if (P.owed > 3) { if (MONEY.advance) MONEY.advance(st, n); else { P.money += P.owed; P.owed = 0; } return P.money >= P.rent ? 'done' : 'next'; } if (!P.job && Math.random() < .5) { P.money += 8; } return 'next'; } },
          fr ? { k: 'go', ref: fr.pop.homeT, h: 19, label: `chiede un prestito a ${fr.first}`, fx: (st, n, P) => { if (fr.pop.money > 30 && Math.random() < .3 + closeness(st, n, fr) * .5) { fr.pop.money -= 15; P.money += 15; note(st, fr, `prestato 15.000 lire a ${n.first}`, 'info', { who: n.id }); return 'done'; } note(st, n, `${fr.first} non ha potuto prestargli niente`, 'bad', { who: fr.id }); return 'next'; } } : null,
        ].filter(Boolean);
      } },
    compagnia: { need: true, label: () => 'conoscere qualcuno', when: (st, n, P) => P.need.compagnia > .65 && (P.friends || []).length < 5,
      steps: (st, n, P) => { const k = strangerFor(st, n); return k ? [{ k: 'meet', who: k.id, ref: pick(Math.random, ['bar', 'osteria', 'fontana', 'piazza', 'lungomare']), h: 19, label: `invita ${k.first} a bere qualcosa`, ok: (st, n, P) => { if (!P.friends.includes(k.id)) P.friends.push(k.id); if (k.pop && !k.pop.friends.includes(n.id)) k.pop.friends.push(n.id); return 'done'; } }] : null; } },
    notizie: { need: true, label: (st, n, P, a) => `sapere che fine ha fatto ${G.nameOf(st, a.who)}`, arg: (st, n, P) => recent(st, P, 'arresto', 2, e => e.who && e.who !== n.id && G.byId(st, e.who) && G.byId(st, e.who).jailedUntil > st.t),
      steps: (st, n, P, a) => [
        { k: 'go', ref: 'rocca', h: 10, label: `va alla Rocca a chiedere di ${G.nameOf(st, a.who)}`, fx: (st, n, P) => { feel(n, 'paura', .12); feel(n, 'rabbia', .15); note(st, n, 'alla Rocca l\'hanno fatto aspettare tre ore e non gli hanno detto niente', 'bad', { place: 'Rocca della Tutela', w: .55 }); return 'next'; } },
        { k: 'go', ref: 'santuario', h: 18, obj: 'cero', label: `accende un cero per ${G.nameOf(st, a.who)}`, cond: (st, n, P) => P.faith > .5, fx: () => 'done' },
      ] },
    // la rabbia che cerca una strada: chi ha avuto qualcuno portato via dai Grigi (o è stato fermato) e non ne può più
    tutela: { need: true, label: () => 'fargliela pagare alla Tutela', arg: (st, n, P) => P.need.rabbia > .4 && n.ris && n.ris.ideo > .38 ? (recent(st, P, 'arresto', 3) || recent(st, P, 'fermato', 3)) : null,
      steps: (st, n, P, a) => [
        { k: 'go', ref: 'osteria', h: 20, label: 'cerca all\'osteria chi ce l\'ha con la Tutela', fx: (st, n, P) => { if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .1, 0, 1); const lupo = G.byId(st, 'lupo'); if (lupo && !lupo.dead && Math.random() < .5) note(st, n, 'all\'osteria qualcuno gli ha parlato della Risacca', 'shady', { w: .6, who: 'lupo', tag: 'risacca' }); return 'next'; } },
        { k: 'go', ref: pick(Math.random, ['vico', 'caruggio', 'piazzetta', 'calata']), h: 1, act: 'scritta', label: 'scrive sul muro di notte', cond: (st, n, P) => P.need.rabbia > .4 && n.tr.cor > .45 && n.ris && n.ris.ideo > .5, fx: (st, n, P, pj, b) => { npcWrite(st, n, b, a && a.who !== n.id ? a.who : null); return 'done'; } },
      ] },
    cero: { label: (st, n, P, a) => `accendere un cero per ${G.nameOf(st, a.who)}`, arg: (st, n, P) => P.faith > .5 ? recent(st, P, 'arresto', 3, e => e.who && e.who !== n.id) : null,
      steps: (st, n, P, a) => [{ k: 'go', ref: 'chiesa', h: 18, obj: 'cero', label: `accende un cero per ${G.nameOf(st, a.who)}` }] },
    vendetta: { label: (st, n, P, a) => `fargliela pagare a ${G.nameOf(st, a.who)}`, arg: (st, n, P) => n.tr.cor > .62 && P.need.rabbia > .45 ? (P.enemies.find(id => { const k = G.byId(st, id); return k && !k.dead && k.pop; }) ? { who: P.enemies.find(id => { const k = G.byId(st, id); return k && !k.dead && k.pop; }) } : null) : null,
      steps: (st, n, P, a) => { const k = G.byId(st, a.who); return k ? [{ k: 'go', ref: k.pop.homeT, h: 20, label: `va a cercare ${k.first} sotto casa`, fx: (st, n, P) => { feel(n, 'rabbia', -.4); feel(k, 'paura', .3); note(st, k, `${n.first} è venut${o(n)} a cercarl${o(k)} sotto casa, furios${o(n)}`, 'bad', { who: n.id, w: .6 }); if (Math.random() < .35) { note(st, n, `fatto a botte con ${k.first}`, 'bad', { who: k.id, w: .7, tag: 'rissa' }); note(st, k, `fatto a botte con ${n.first}`, 'bad', { who: n.id, w: .7, tag: 'rissa' }); feel(k, 'rabbia', .3); if (Math.random() < .3) arrestFar(st, n, 'rissa'); } P.enemies = P.enemies.filter(x => x !== k.id); return 'done'; } }] : null; } },
    // --- dagli interessi ---
    pesca: { int: 'pesca', label: () => 'andare a pescare all\'alba', steps: () => [{ k: 'go', ref: pick(Math.random, ['molo', 'punta', 'caletta']), h: 5, obj: 'canna', label: 'va a pescare all\'alba', fx: (st, n, P) => { P.pantry += 2; note(st, n, 'preso qualche pesce all\'alba', 'good', { w: .3 }); return 'done'; } }] },
    carte: { int: 'carte', label: () => 'farsi una partita a scopa', steps: (st, n, P) => { const k = friendFor(st, n); return k ? [{ k: 'meet', who: k.id, ref: pick(Math.random, ['osteria', 'bar', 'osteria_sg']), h: 21, label: `partita a scopa con ${k.first}`, ok: (st, n, P) => { const w = (Math.random() - .5) * 10; P.money += w; k.pop.money -= w; return 'done'; } }] : null; } },
    lettura: { int: 'lettura', label: () => 'trovare un buon libro', steps: () => [
      { k: 'go', ref: 'biblioteca', h: 10, obj: 'libri', label: 'cerca un libro in biblioteca', fx: (st, n, P) => { P.owns.libro = true; if (n.ris && Math.random() < .3) { n.ris.ideo = clamp(n.ris.ideo + .04, 0, 1); note(st, n, 'Lupo gli ha passato sottobanco un libro tolto dagli scaffali', 'shady', { who: 'lupo', w: .45 }); } return 'next'; } },
      { k: 'go', ref: 'casa', h: 21, act: 'casa', label: 'legge a casa', fx: (st, n, P) => { feel(n, 'svago', -.35); return 'done'; } }] },
    politica: { int: 'politica', label: () => 'capire cosa succede davvero', steps: () => [
      { k: 'go', ref: 'biblioteca', h: 16, obj: 'libri', label: 'cerca i giornali vecchi in biblioteca', fx: (st, n, P) => { if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .05, 0, 1); return 'next'; } },
      { k: 'go', ref: 'osteria', h: 20, obj: 'bancone', label: 'discute di politica all\'osteria', fx: (st, n, P) => { if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .04, 0, 1); feel(n, 'rabbia', .05); const ear = st.npcs.find(k => k.pop && k.pop.giro === 'orecchio' && k.pop.at && P.at && tkey(k.pop.at) === tkey(P.at)); if (ear) { note(st, ear, `sentito ${n.first} parlare male della Tutela`, 'shady', { who: n.id }); feel(n, 'paura', .1); } return 'done'; } }] },
    musica: { int: 'musica', label: (st, n, P) => P.owns.radio ? 'sentire un po\' di musica' : 'comprarsi una radio', steps: (st, n, P) => P.owns.radio ? [{ k: 'go', ref: 'flipper', h: 18, obj: 'flipper', label: 'va al Flipper a sentire il juke-box' }] : [
      { k: 'save', amount: 14, label: 'mettere da parte per una radio' },
      { k: 'go', ref: 'video', h: 11, label: 'compra una radio usata alla Videoteca', fx: buy(12, 'radio') }] },
    foto: { int: 'foto', label: (st, n, P) => P.owns.fotocamera ? 'fare qualche foto' : 'comprarsi una macchina fotografica', steps: (st, n, P) => (P.owns.fotocamera ? [] : [
      { k: 'save', amount: 28, label: 'mettere da parte per la macchina fotografica' },
      { k: 'go', ref: 'video', h: 11, label: 'compra una macchina fotografica', fx: buy(25, 'fotocamera') }]).concat([
      { k: 'go', ref: pick(Math.random, ['lungomare', 'belvedere', 'molo']), h: 17, obj: 'foto', label: 'scatta foto', fx: (st, n, P) => { const rl = st.ris ? Math.min(5, Math.floor(st.ris.repr / 20)) : 1; if (Math.random() < .1 + rl * .06) { feel(n, 'paura', .25); note(st, n, 'un Grigio l\'ha visto fotografare e gli ha chiesto i documenti', 'bad', { w: .6, tag: 'grigi' }); } return 'done'; } }]) },
    ballo: { int: 'ballo', label: () => 'andare a ballare sabato alla Luna', steps: (st, n, P) => { const k = friendFor(st, n, k => k.pop.age < 40); return [k ? { k: 'meet', who: k.id, ref: 'disco', h: 22, wd: 5, label: `sabato alla Luna con ${k.first}`, ok: () => 'done' } : { k: 'go', ref: 'disco', h: 22, wd: 5, obj: 'pista', label: 'va a ballare alla Luna' }]; } },
    fede: { int: 'fede', label: () => 'accendere un cero', steps: () => [{ k: 'go', ref: pick(Math.random, ['chiesa', 'santuario']), h: 18, obj: 'cero', label: 'accende un cero' }] },
    sport: { int: 'sport', label: () => 'giocare una partitella', steps: (st, n, P) => { const k = friendFor(st, n, k => k.pop.age < 50); return [k ? { k: 'meet', who: k.id, ref: 'spiaggia', h: 10, wd: 6, label: `partitella sulla spiaggia con ${k.first}`, ok: () => 'done' } : { k: 'go', ref: useRef('palestra')[0] || 'giardini', h: 18, obj: 'palestra', label: 'va a tirare al sacco' }]; } },
    cinema: { int: 'cinema', label: () => 'vedere il film nuovo', steps: () => [{ k: 'go', ref: 'cinema', h: 21, obj: 'cinema', label: 'va a vedere il film della sera' }] },
    motori: { int: 'motori', label: () => 'rimettere a posto la Vespa', steps: (st, n, P) => [
      { k: 'go', ref: useRef('ferramenta')[0] || 'officina', h: 10, label: 'compra i pezzi per la Vespa', fx: buy(6) },
      { k: 'go', ref: 'officina', h: 18, obj: 'motori', label: 'lavora alla Vespa in officina' },
      { k: 'go', ref: 'officina', h: 18, obj: 'motori', label: 'finisce di sistemare la Vespa', fx: (st, n, P) => { P.owns.vespa = true; return 'done'; } }] },
    cucina: { int: 'cucina', label: () => 'cucinare il pranzo della domenica', steps: () => [
      { k: 'go', ref: 'piazza', h: 9, wd: 5, obj: 'bancarelle', label: 'fa la spesa grande al mercato' },
      { k: 'go', ref: 'casa', h: 12, wd: 6, act: 'pranzo', label: 'cucina il pranzo della domenica', fx: (st, n, P) => { const hh = st.pop.households[P.hh]; (hh ? hh.members : []).forEach(id => { const k = G.byId(st, id); if (k && k.pop) { k.pop.need.fame = 0; k.pop.need.compagnia = Math.max(0, k.pop.need.compagnia - .5); if (k !== n) note(st, k, `${n.first} ha cucinato il pranzo della domenica`, 'good', { who: n.id }); } }); return 'done'; } }] },
    campagna: { int: 'campagna', label: () => 'lavorare l\'orto', steps: () => [
      { k: 'go', ref: pick(Math.random, ['vigne', 'oliveto']), h: 7, obj: 'orto', label: 'zappa l\'orto' },
      { k: 'go', ref: pick(Math.random, ['vigne', 'oliveto']), h: 7, obj: 'orto', label: 'raccoglie quello che è maturo', fx: (st, n, P) => { P.pantry += 3; return 'done'; } }] },
    mare: { int: 'mare', label: () => 'fare un bagno alla caletta', steps: () => [{ k: 'go', ref: 'caletta', h: 11, obj: 'spiaggia', label: 'fa il bagno alla caletta' }] },
    eleganza: { int: 'eleganza', label: () => 'farsi un vestito nuovo', steps: (st, n, P) => [
      { k: 'save', amount: 24, label: 'mettere da parte per il vestito' },
      { k: 'go', ref: useRef('sartoria')[0] || 'piazza', h: 10, label: 'si fa prendere le misure dalla sarta', fx: buy(20, 'vestito') },
      { k: 'go', ref: useRef('barbiere')[0] || 'piazza', h: 17, obj: 'barbiere', label: 'barba e capelli dal barbiere' }] },
    // l'arte: disegnare, procurarsi i colori, fare un pezzo su un muro di notte (politico o no, dipende da chi lo fa)
    arte: { int: 'arte', label: (st, n, P) => P.owns.colori ? 'fare un pezzo su un muro' : 'procurarsi i colori e dipingere un muro', steps: (st, n, P) => (P.owns.colori ? [] : [
      { k: 'save', amount: 8, label: 'mettere da parte per le bombolette' },
      { k: 'go', ref: Math.random() < .5 || !useRef('ferramenta').length ? 'officina' : useRef('ferramenta')[0], h: 10, label: 'compra bombolette e pennelli', fx: buy(6, 'colori') }]).concat([
      { k: 'go', ref: pick(Math.random, ['belvedere', 'lungomare', 'molo']), h: 16, obj: 'album', label: 'studia il pezzo sull\'album da disegno', fx: (st, n, P) => { P.sketch = sketchFor(st, n); note(st, n, `ha disegnato il bozzetto: ${P.sketch.text}`, 'info', { w: .3, tag: 'arte' }); return 'next'; } },
      { k: 'go', ref: pick(Math.random, ['vico', 'caruggio', 'piazzetta', 'calata', 'piazza', 'lungomare']), h: 1, act: 'graffito', label: 'dipinge un muro di notte', cond: (st, n, P) => P.owns.colori && n.tr.cor > .3 && P.need.paura < .6, fx: (st, n, P, pj, b) => { paintWall(st, n, b, P.sketch || sketchFor(st, n)); P.sketch = null; return 'done'; } }]) },
    chiacchiere: { int: 'chiacchiere', label: () => 'sapere cosa si dice in giro', steps: () => [
      { k: 'go', ref: 'fontana', h: 10, obj: 'panchina', label: 'va a sentire cosa si dice alla fontana', fx: (st, n, P) => { gossipHere(st, n); return 'next'; } },
      { k: 'go', ref: pick(Math.random, ['bar', 'sirena']), h: 19, obj: 'bancone', label: 'raccoglie le voci al bar', fx: (st, n, P) => { gossipHere(st, n); return 'done'; } }] },
  };
  Object.entries(PROJ).forEach(([k, p]) => { p.id = k; });
  // un fatto recente del diario, con un'etichetta
  function recent(st, P, tag, days, f) { const e = P.diary.slice().reverse().find(e => e.tag === tag && st.t - e.t < days * 1440 && (!f || f(e))); return e ? { who: e.who, place: e.place } : null; }
  function startProject(st, n, def, arg) {
    const P = n.pop, key = def.id + ':' + (arg && arg.who || '');
    if (P.projects.some(p => p.kind === def.id) || (P.started && st.t - (P.started[key] || -1e9) < 4 * 1440)) return null;
    const steps = def.steps(st, n, P, arg || {}); if (!steps || !steps.length) return null;
    // i bisogni passano davanti agli interessi
    if (P.projects.length >= CFG.maxProj) { const drop = P.projects.find(p => !PROJ[p.kind].need); if (!def.need || !drop) return null; endProject(st, n, drop, 'lasciato'); }
    const pj = { id: ++st.pop.pjN, kind: def.id, label: def.label(st, n, P, arg || {}), arg: arg || null, steps, i: 0, t0: st.t, tries: 0 };
    P.projects.push(pj); st.pop.stats.progetti++; (P.started = P.started || {})[key] = st.t;
    return pj;
  }
  function endProject(st, n, pj, how) {
    const P = n.pop; P.projects = P.projects.filter(p => p !== pj);
    P.history.push({ t: st.t, label: pj.label, how }); if (P.history.length > 8) P.history.shift();
    const def = PROJ[pj.kind];
    if (how === 'riuscito') { st.pop.stats.riusciti++; note(st, n, `riuscit${o(n)} a ${pj.label}`, 'good', { w: .55, tag: 'progetto' }); feel(n, 'svago', -.2); feel(n, 'rabbia', -.05); if (def.int) P.want[def.int] = 0; }
    else if (how === 'fallito') { st.pop.stats.falliti++; note(st, n, `non è riuscit${o(n)} a ${pj.label}`, 'bad', { w: .45, tag: 'progetto' }); feel(n, 'rabbia', .08); }
    else note(st, n, `lasciato perdere: ${pj.label}`, 'info', { w: .25, tag: 'progetto' });
    if (!P.projects.some(p => p.steps[p.i] && p.steps[p.i].k === 'save')) P.thrift = false;
  }
  function advance(st, n, pj, res) {
    const P = n.pop; if (!P.projects.includes(pj)) return;
    if (res === 'done') return endProject(st, n, pj, 'riuscito');
    if (res === 'fail') return endProject(st, n, pj, 'fallito');
    if (res === 'again') { pj.tries++; if (pj.tries > 3) endProject(st, n, pj, 'fallito'); return; }
    pj.i++; pj.tries = 0;
    if (pj.i >= pj.steps.length) endProject(st, n, pj, res === 'skip' ? 'lasciato' : PROJ[pj.kind].need && pj.kind === 'lavoro' ? 'fallito' : 'riuscito');
  }
  function resolveRef(st, n, ref) {
    if (!ref) return null;
    if (ref === 'casa') return n.pop.homeT;
    return typeof ref === 'object' ? ref : target(ref);
  }
  // ogni giorno: i passi di oggi dei progetti entrano nel programma
  function planProjects(st, n, day, plan, busy) {
    const P = n.pop, wd = (day + 1) % 7, cf = P.selfCurfew || curfewFrom(st);
    for (const pj of P.projects.slice()) {
      if (pj.kind === 'notizie' && pj.arg) { const k = G.byId(st, pj.arg.who); if (k && k.jailedUntil <= st.t) { note(st, n, `${k.first} è tornat${o(k)} a casa`, 'good', { who: k.id, w: .5 }); endProject(st, n, pj, 'riuscito'); continue; } }
      let s = pj.steps[pj.i], guard = 0;
      while (s && ((s.cond && !s.cond(st, n, P)) || (s.k === 'save' && P.money >= s.amount)) && guard++ < 5) { advance(st, n, pj, s.k === 'save' ? 'next' : 'skip'); s = P.projects.includes(pj) ? pj.steps[pj.i] : null; }
      if (s && s.k === 'save') P.thrift = true;
      if (!s || s.k !== 'go') continue;
      if (s.wd !== undefined && s.wd !== wd) continue;
      const tgt = resolveRef(st, n, s.ref); if (!tgt) { advance(st, n, pj, 'skip'); continue; }
      let at = s.h * 60;
      if (day === dayIdx(st.t) && at < minOfDay(st.t) + 15) { if (s.h < 6) continue; at = minOfDay(st.t) + 20; }   // deciso adesso: si va subito
      const atWork = P.job && P.job.t && tkey(tgt) === tkey(P.job.t);
      if (atWork && busy(at)) { plan.push({ at: Math.round(at + 45), tgt, act: 'lavoro', label: s.label, pj: pj.id, fixed: true }); continue; }   // lo fa sul posto di lavoro
      if (busy(at) || busy(at + 59)) { const end = busyEnd(at, busy); if (end && end + 30 < cf - 60) at = end + 30; else continue; }
      if (s.act !== 'scritta' && at >= cf - 30) continue;
      plan.push({ at: Math.round(at), tgt, act: s.act || 'progetto', label: s.label, pj: pj.id, obj: s.obj, fixed: s.act === 'scritta' || s.h < 6 });
      if (!plan.some(b => b.at > at && b.at < at + 150)) plan.push({ at: Math.min(1439, Math.round(at + 80)), tgt: P.homeT, act: 'casa', label: 'torna a casa' });
    }
  }
  function busyEnd(at, busy) { for (let m = at; m < 1440; m += 15) if (!busy(m)) return m; return null; }
  // quando comincia il blocco di un passo
  function runStep(st, n, b) {
    const P = n.pop, pj = P.projects.find(p => p.id === b.pj); if (!pj) return;
    const s = pj.steps[pj.i]; if (!s || s.label !== b.label) return;
    note(st, n, s.label, 'info', { w: .2, place: b.tgt.label, tag: 'passo' });
    const res = s.fx ? s.fx(st, n, P, pj, b) : 'next';
    advance(st, n, pj, res || 'next');
  }
  // gli appuntamenti di un progetto si fissano qui (la sera prima, o la mattina stessa)
  function arrangeMeets(st, n) {
    const P = n.pop;
    P.projects.forEach(pj => {
      const s = pj.steps[pj.i]; if (!s || s.k !== 'meet' || s.arranged || P.appt) return;
      const k = G.byId(st, s.who); if (!k || !k.pop || k.dead || k.pop.appt) { advance(st, n, pj, 'again'); return; }
      let d = dayIdx(st.t); for (let i = 0; i < 7; i++) { if (s.wd === undefined || (d + 1) % 7 === s.wd) break; d++; }
      if (s.wd === undefined && minOfDay(st.t) > s.h * 60 - 60) d++;
      const ap = appoint(st, n, k, s.ref, d * 1440 + s.h * 60, s.label);
      if (ap) { ap.pj = pj.id; s.arranged = true; }
    });
  }
  function meetResult(st, n, pjId, ok) {
    const P = n.pop; if (!P || !P.projects) return; const pj = P.projects.find(p => p.id === pjId); if (!pj) return;
    const s = pj.steps[pj.i]; if (!s || s.k !== 'meet') return;
    if (ok) advance(st, n, pj, s.ok ? s.ok(st, n, P) : 'next'); else { s.arranged = false; advance(st, n, pj, 'again'); }
  }

  // ---------------- LE SCRITTE DEGLI ABITANTI ----------------
  // simmetria: quello che fa il giocatore lo può fare chiunque, con le stesse conseguenze
  // lo stile di chi dipinge (come nel documento: ognuno scrive a modo suo), scelto dal carattere
  function artStyle(n) {
    const P = n.pop; if (P.artStyle) return P.artStyle;
    const t = n.tr;
    P.artStyle = t.cor > .75 ? 'scritte enormi in rosso' : t.loq > .75 ? 'caricature' : t.loq < .35 ? 'simboli più che parole' : t.legge > .55 ? 'stencil precisi' : 'lettere tonde e colorate';
    return P.artStyle;
  }
  // cosa dipingere: dipende dallo stile, dalla rabbia, da quanto si è vicini alla Risacca e da chi si è perso
  function sketchFor(st, n, whoId) {
    const P = n.pop, style = artStyle(n), ideo = n.ris ? n.ris.ideo : .3;
    const lostP = recent(st, P, 'arresto', 5);
    const lostName = whoId ? G.nameOf(st, whoId) : lostP && lostP.who ? G.nameOf(st, lostP.who) : null;
    let kind = ideo > .55 || (P.need.rabbia > .6 && ideo > .4) ? 'scritta' : ideo > .38 ? 'satira' : 'arte';
    const T = {
      scritta: {
        'scritte enormi in rosso': lostName ? [`RIDATECI ${lostName.toUpperCase()}`, `${lostName.toUpperCase()} È INNOCENTE`] : ['IL GARANTE MENTE', 'TUTELA ASSASSINA', 'LA RISACCA SALE'],
        caricature: ['il Garante con le orecchie d\'asino e la scritta «L\'ordine è una carezza»', 'un Grigio che bastona la propria ombra'],
        'simboli più che parole': ['l\'onda della Risacca, grande quanto il muro', 'un pugno chiuso che esce dal mare'],
        'stencil precisi': lostName ? [`il volto di ${lostName}, a stencil, con la data del fermo`] : ['il volto del Garante con gli occhi cuciti', 'un uccello che spezza una catena'],
        'lettere tonde e colorate': ['NON DIMENTICHIAMO, a lettere tonde', 'LIBERI TUTTI, rosa e celeste'],
      },
      satira: ['un gabbiano che fa la cacca sul cappello del Garante', '«IL GARANTE TI GUARDA (ANCHE AL GABINETTO)»', 'un Grigio con la testa di pesce lesso', 'la Rocca disegnata come una gabbia per canarini'],
      arte: [`la firma «${(n.first || '').toUpperCase()} '86» a lettere gonfie`, 'una sirena con la corona di conchiglie', 'un pesce volante enorme, blu e arancione', 'un cuore con due iniziali', 'il mare in tempesta con una barca minuscola', 'una Vespa con le ali'],
    };
    const list = kind === 'scritta' ? T.scritta[style] : T[kind];
    return { kind, text: pick(Math.random, list), style };
  }
  function npcWrite(st, n, b, whoId) { paintWall(st, n, b, Object.assign(sketchFor(st, n, whoId), { kind: 'scritta' })); }
  // un pezzo su un muro: politico (scritta della Risacca), satira o arte. Simmetria: le stesse conseguenze di quelli del giocatore
  function paintWall(st, n, b, sk) {
    const P = n.pop, place = b.tgt.label, type = sk.kind === 'scritta' ? 'scritta' : 'graffito';
    const ev = { id: st.nextId++, type, actor: n.id, x: b.tgt.x, y: b.tgt.y, t: st.t, sev: G.SEV[type] || .3, noise: 0, place, npcCrime: true };
    st.events.unshift(ev); if (st.events.length > 60) st.events.pop();
    st.pop.walls.push({ pk: tkey(b.tgt), place, t: st.t, by: n.id, text: sk.text, kind: sk.kind, style: sk.style, ev: ev.id }); if (st.pop.walls.length > 40) st.pop.walls.shift();
    st.pop.stats[sk.kind === 'scritta' ? 'scritte' : 'graffiti']++;
    const R = st.ris, up = { scritta: [2, 3], satira: [1, 1.5], arte: [0, .5] }[sk.kind];
    if (R) { R.morale = clamp(R.morale + up[0], 0, 100); R.repr = clamp(R.repr + up[1], 0, 100); }
    note(st, n, `${sk.kind === 'scritta' ? 'scritto' : 'dipinto'} sul muro di ${place}: ${sk.kind === 'scritta' && !/^il |^l'|^un /.test(sk.text) ? `«${sk.text}»` : sk.text}`, sk.kind === 'arte' ? 'good' : 'shady', { w: .75, place, tag: 'scritta' });
    feel(n, 'rabbia', sk.kind === 'arte' ? -.1 : -.35); feel(n, 'svago', -.5);
    if (P.want.arte !== undefined) P.want.arte = 0;
    G.addLog(st, `${G.clockStr(st.t)} · Stanotte qualcuno ha ${sk.kind === 'scritta' ? 'scritto' : 'dipinto'} sul muro di ${place}: ${sk.text}.`, 'info');
    const rl = R ? Math.min(5, Math.floor(R.repr / 20)) : 1, risk = { scritta: .12 + rl * .05, satira: .06 + rl * .04, arte: .03 + rl * .02 }[sk.kind];
    if (Math.random() < risk) arrestFar(st, n, sk.kind === 'arte' ? 'imbrattamento' : 'scritte sui muri');
  }
  // la Tutela cancella: prima le scritte, poi la satira, l'arte resiste di più. Chi l'ha fatto se ne accorge.
  function eraseWalls(st) {
    const rl = st.ris ? Math.min(5, Math.floor(st.ris.repr / 20)) : 1;
    st.pop.walls.forEach(w => {
      if (w.erased || st.t - w.t < 360) return;
      const p = ({ scritta: .06, satira: .04, arte: .015 }[w.kind] || .05) * (1 + rl * .6);
      if (Math.random() > p) return;
      w.erased = st.t;
      const a = G.byId(st, w.by); if (a && a.pop && !a.dead) { note(st, a, `hanno cancellato il suo pezzo su ${w.place}`, 'bad', { w: .5, place: w.place, tag: 'cancellato' }); feel(a, 'rabbia', .15); if (a.pop.want.arte !== undefined) a.pop.want.arte = Math.min(1.2, a.pop.want.arte + .4); }
    });
  }
  // chi passa davanti a una scritta fresca la legge, e reagisce a modo suo
  function readWalls(st, n, t) {
    const P = n.pop; if (!st.pop.walls.length || !t) return;
    const k = tkey(t);
    st.pop.walls.forEach(w => {
      if (w.pk !== k || P.readWalls[w.t] || w.erased || st.t - w.t > 3 * 1440 || w.by === n.id) return;
      P.readWalls[w.t] = true;
      const ideo = n.ris ? n.ris.ideo : .3;
      if (w.kind === 'arte' || w.kind === 'satira') {
        const likes = w.kind === 'arte' ? (n.tr.legge < .8 || P.intW.arte) : ideo > .35;
        feel(n, 'svago', likes ? -.06 : 0); if (w.kind === 'satira' && likes) feel(n, 'paura', -.03);
        note(st, n, `visto sul muro di ${w.place} ${w.text}: ${likes ? (w.kind === 'satira' ? 'gli ha fatto ridere' : 'bello') : 'roba da vandali'}`, 'info', { w: .25, place: w.place, tag: 'scritta' });
        if (P.intW.arte && likes) P.want.arte = Math.min(1.2, (P.want.arte || 0) + .2);   // un bel pezzo fa venire voglia
        return;
      }
      if (ideo > .55) { feel(n, 'rabbia', .06); if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .02, 0, 1); note(st, n, `letto sul muro di ${w.place}: «${w.text}». Qualcuno ha coraggio`, 'info', { w: .35, place: w.place, tag: 'scritta' }); }
      else if (ideo < .25) { feel(n, 'paura', .05); note(st, n, `letto sul muro di ${w.place}: «${w.text}». Ora arrivano i Grigi`, 'info', { w: .3, place: w.place, tag: 'scritta' }); if (P.giro === 'orecchio' || n.cop) { const cop = st.npcs.find(c => c.cop && !c.dead); if (cop) G.addMemory(st, cop, { eventId: st.events.find(e => e.type === 'scritta' && e.t === w.t) ? st.events.find(e => e.type === 'scritta' && e.t === w.t).id : st.nextId++, type: 'scritta', actor: 'ignoto', place: w.place, t: w.t, conf: .7, source: 'voce', via: [n.first] }); } }
    });
  }
  // stare in un posto pieno di gente a sentire le voci (il passaparola, apposta)
  function gossipHere(st, n) {
    const P = n.pop; if (!P.at) return;
    const k = tkey(P.at), here = st.npcs.filter(x => x !== n && x.pop && !x.dead && x.pop.at && tkey(x.pop.at) === k);
    here.slice(0, 4).forEach(x => { share(st, x, n); });
  }

  // ---------------- LA MENTE: una volta al giorno, rileggere e decidere ----------------
  const REFLECT = [];
  function reflect(st, n) {
    const P = n.pop, N = P.need, thoughts = [];
    consolidate(st, n);   // [memoria] quello che pesa passa nella memoria lunga
    // [memoria] un vecchio torto che torna in mente di notte
    const old = (P.lunga || []).filter(m => m.kind === 'bad' && m.who && st.t - m.t > 2 * 1440 && m.w > .5).sort((a, b) => b.w - a.w)[0];
    if (old && Math.random() < .25 + (n.tr ? n.tr.cor * .3 : 0)) thoughts.push([`non ha dimenticato: ${old.text}`, .3 + old.w * .2]);
    // 1. i posti: dove sono successe cose brutte negli ultimi giorni
    const bad = {};
    P.diary.forEach(e => { if (e.kind === 'bad' && e.place && st.t - e.t < 3 * 1440) bad[e.place] = (bad[e.place] || 0) + e.w; });
    (n.mem || []).forEach(m => { if (m.place && st.t - m.t < 3 * 1440 && G.NEG[m.type] && m.target !== 'player') bad[m.place] = (bad[m.place] || 0) + (G.SEV[m.type] || .5) * (m.conf || .5) * (m.target === n.id ? 1.4 : .6); });
    const homeL = P.homeT.label, workL = P.job && P.job.t ? P.job.t.label : '';
    Object.entries(bad).forEach(([pl, s]) => {
      if (pl === homeL || pl === workL || P.avoid[pl] > st.t) return;
      if (s * (1 + N.paura) > .9) { P.avoid[pl] = st.t + 3 * 1440; thoughts.push([`${pl} non è più un posto sicuro`, .5]); }
    });
    // 2. le persone: chi dà buca, chi ruba
    const flakes = {};
    P.diary.forEach(e => { if (e.tag === 'bidone' && e.who && st.t - e.t < 4 * 1440) flakes[e.who] = (flakes[e.who] || 0) + 1; });
    Object.entries(flakes).forEach(([id, c]) => { if (c >= 2 && P.friends.includes(id)) { P.friends = P.friends.filter(x => x !== id); thoughts.push([`su ${G.nameOf(st, id)} non si può contare`, .45]); } });
    P.diary.forEach(e => { if (e.tag === 'furto' && e.who && e.who !== 'ignoto' && !P.enemies.includes(e.who)) { P.enemies.push(e.who); thoughts.push([n.tr.cor > .6 ? `${G.nameOf(st, e.who)} è un ladro, e gliela farò pagare` : `da ${G.nameOf(st, e.who)} meglio stare alla larga`, .55]); } });
    // 3. i soldi
    N.soldi = clamp((P.rent + (P.debt ? P.debt.amount * .3 : 0) + 15 - (MONEY.funds ? MONEY.funds(st, n) : P.money)) / 120, 0, 1);   // [soldi] contano anche il conto e il materasso
    if (N.soldi > .55) thoughts.push([P.debt ? 'così non si va avanti, lo Squalo vuole i suoi soldi' : 'i soldi non bastano mai', .35]);
    // 4. paura e rabbia: un torto recente ci si rimugina sopra
    if (recent(st, P, 'arresto', 3) || recent(st, P, 'fermato', 3)) feel(n, 'rabbia', .1);
    if (N.paura > .65 && !P.selfCurfew) { P.selfCurfew = 20 * 60; P.selfCurfewUntil = st.t + 3 * 1440; thoughts.push(['meglio non farsi vedere in giro la sera', .4]); }
    if (P.selfCurfew && st.t > P.selfCurfewUntil) P.selfCurfew = 0;
    if (N.rabbia > .6 && n.ris) { n.ris.ideo = clamp(n.ris.ideo + .02, 0, 1); if (n.ris.ideo > .5) thoughts.push(['la Tutela ce la deve pagare', .45]); else thoughts.push(['non si può più vivere così', .35]); }
    // 5. i progetti: vecchi che scadono, risparmi, nuovi dai bisogni e dagli interessi
    P.projects.slice().forEach(pj => { if (st.t - pj.t0 > 6 * 1440) endProject(st, n, pj, 'lasciato'); });
    P.projects.forEach(pj => { const s = pj.steps[pj.i]; if (s && s.k === 'save') { if (P.money >= s.amount) advance(st, n, pj, 'next'); else P.thrift = true; } });
    if (!isPassive(st, n)) {
      for (const def of Object.values(PROJ)) {
        if (!def.need) continue;
        const arg = def.arg ? def.arg(st, n, P) : null;
        if (def.arg ? !arg : !def.when(st, n, P)) continue;
        const pj = startProject(st, n, def, arg); if (pj) { thoughts.push([`deve ${pj.label}`, .5]); break; }
      }
      // un interesse trascurato diventa un progetto (se c'è posto e qualche soldo)
      if (P.projects.length < CFG.maxProj && P.money > 8) {
        const top = Object.entries(P.want).sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] > .75 && PROJ[top[0]]) { const pj = startProject(st, n, PROJ[top[0]]); if (pj) thoughts.push([`ha voglia di ${pj.label}`, .3]); }
      }
      // i passi non legati a un posto: appuntamenti dei progetti
      arrangeMeets(st, n);
    }
    // 5b. le riflessioni aggiunte dagli altri moduli (azioni.js: morti, segreti, risvegli)
    REFLECT.forEach(f => { try { f(st, n, thoughts); } catch (e) { } });
    // 6. il pensiero della notte: quello che pesa di più va nel diario
    thoughts.sort((a, b) => b[1] - a[1]);
    if (thoughts.length) {
      const [text, w] = thoughts[0];
      P.thoughts.push({ t: st.t, text }); if (P.thoughts.length > 6) P.thoughts.shift();
      note(st, n, `ha pensato: ${text}`, 'pensiero', { w });
    }
    if (CFG.mind) try { CFG.mind(st, n, mindPrompt(st, n)); } catch (e) { }
  }
  // per il modello linguistico (quando ci sarà): il riassunto da cui riflettere
  function mindPrompt(st, n) {
    const P = n.pop;
    return { id: n.id, who: `${n.name}, ${P.age} anni, ${n.role}`, interessi: P.ints.map(i => INTERESSI[i.k]), bisogni: Object.assign({}, P.need),
      ricordi: P.diary.slice().sort((a, b) => b.w - a.w).slice(0, 8).map(e => `${ago(st, e.t)}: ${e.text}`), memoriaLunga: (P.lunga || []).slice().sort((a, b) => b.w - a.w).slice(0, 6).map(e => `${ago(st, e.t)}${e.times > 1 ? ` (${e.times} volte)` : ''}: ${e.text}`), progetti: P.projects.map(p => p.label), pensieri: P.thoughts.map(t => t.text) };
  }
  // per il taccuino: una riga
  function lifeShort(st, n) {
    const P = n.pop; if (!P || !P.ints) return '';
    const bits = [`Gli piacciono ${P.ints.map(i => INTERESSI[i.k]).join(', ')}.`];
    if (P.projects.length) bits.push(`Vuole ${P.projects.map(p => p.label).join(' e ')}.`);
    if (P.thoughts.length) bits.push(`Pensa: «${cap(P.thoughts[P.thoughts.length - 1].text)}».`);
    return bits.join(' ');
  }
  // per la chat e il taccuino: la vita di adesso in poche righe
  function lifeOf(st, n) {
    const P = n.pop; if (!P) return '';
    const parts = [];
    if (P.ints) parts.push(`Gli piacciono ${P.ints.map(i => INTERESSI[i.k]).join(', ')}.`);
    if (P.today && P.today.length) parts.push(`Oggi: ${P.today.slice(-4).map(x => x.label).join('; ')}.`);
    if (P.projects && P.projects.length) parts.push(`Ha in testa di ${P.projects.map(p => p.label).join(' e di ')}.`);
    if (P.thoughts && P.thoughts.length) parts.push(`Ultimamente ha pensato: «${cap(P.thoughts[P.thoughts.length - 1].text)}».`);
    const nd = needWords(P, o(n)); if (nd) parts.push(nd);
    const d = P.diary.filter(e => e.kind !== 'pensiero' && e.tag !== 'passo').sort((a, b) => b.w - a.w).slice(0, 4).sort((a, b) => a.t - b.t).map(e => `${ago(st, e.t)}: ${e.text}`); if (d.length) parts.push('Ricorda: ' + d.join('; ') + '.');
    const lg = (P.lunga || []).filter(e => st.t - e.t > 1440).sort((a, b) => b.w - a.w).slice(0, 3).map(e => `${ago(st, e.t)}: ${e.text}`); if (lg.length) parts.push('Da tempo non dimentica: ' + lg.join('; ') + '.');   // [memoria]
    return parts.join(' ');
  }

  // ---------------- AGGANCI ----------------
  function hookThink(st, n) {
    if (!n.pop || isPassive(st, n)) return false;
    if (!n.pop.near) { return true; }               // da lontano decide il programma
    return false;                                    // da vicino: il motore (fughe, denunce, reazioni)
  }
  function hookMove(st, n, dt, a) {
    if (!n.pop || isPassive(st, n)) return false;
    if (!n.pop.near) { farMove(st, n); return true; }
    if (a === 'routine' || a === 'dentro' || a === 'evita' || a === 'altrove') { nearMove(st, n, dt, a); return true; }
    return false;
  }
  // da lontano: si salta al posto del blocco quando il blocco cambia
  function farMove(st, n) {
    const P = n.pop; n.speedNow = 0;
    if (n.jailedUntil > st.t) return;
    const b = blockNow(st, n); if (!b) return;
    if (tkey(b.tgt) + '@' + b.at !== P.curKey || !n.inside) snapFar(st, n);
  }
  // da vicino: si cammina davvero
  function nearMove(st, n, dt, a) {
    const P = n.pop;
    let b = blockNow(st, n); if (!b) return;
    if (a === 'evita') b = { tgt: P.homeT, act: 'casa', label: 'preferisce stare a casa', at: b.at };
    const t = b.tgt, key = tkey(t) + '@' + b.at;
    if (key !== P.curKey) { onBlockStart(st, n, b, P.cur); P.cur = b; P.curKey = key; P.goalSet = false; P.spot = null; }
    if (n.inside) {
      if (P.at && tkey(P.at) === tkey(t)) { if (!(n.room && n.room.walk)) n.speedNow = 0; n.action = { name: 'dentro', scores: [], why: `${cap(b.label)} (${t.label}).`, since: n.action.since }; return; }
      if (n.room && roomExit(st, n)) return;   // [scopo] se il giocatore è lì dentro, prima si va alla porta
      // esce dalla porta da cui era entrato
      const from = P.at || P.homeT; n.x = from.x; n.y = from.y; n.inside = false; n.path = []; P.goalSet = false;
      n.action = { name: 'routine', scores: [], why: `${cap(b.label)}: va a ${t.label}.`, since: st.clock };
    }
    if (curbWait(st, n, dt)) return;   // [passo] prima di attraversare si guarda
    greetFriends(st, n);
    // in ritardo per un orario fisso: corre
    const late = b.fixed && minOfDay(st.t) > b.at + 5 && dist(n.x, n.y, t.x, t.y) > 6;
    const speed = (late ? 2.6 : 1.35) * (P.age > 70 ? .75 : P.age > 60 ? .88 : 1);
    if (t.k === 'b') {
      if (!P.goalSet) { G.goTo(n, t.x, t.y); P.goalSet = true; }
      const arrived = G.stepAlong(n, speed, dt);
      if (arrived || dist(n.x, n.y, t.x, t.y) < 1.2) { n.inside = true; P.at = t; n.speedNow = 0; n.action = { name: 'dentro', scores: [], why: `${cap(b.label)} (${t.label}).`, since: st.clock }; if (b.act === 'appuntamento') P.apptArrived = st.t; }
      else if (!n.path.length) { P.goalSet = false; }
      return;
    }
    // [scopo] luogo all'aperto: ci va e ci resta, in crocchio con chi c'è; ogni tanto cambia crocchio
    if (!P.goalSet) { if (!P.spot || P.spot.key !== key) P.spot = restSpot(st, n, t, key); G.goTo(n, P.spot.x, P.spot.y); P.goalSet = true; }
    if (n.wait > 0) { n.wait -= dt; n.speedNow = 0; if (P.spot && P.spot.on) { n.face += angDiff(P.spot.face, n.face) * Math.min(1, dt * 4); chatter(st, n, b); } return; }
    const arrived = G.stepAlong(n, speed, dt);
    if (arrived) {
      P.at = t; if (b.act === 'appuntamento') P.apptArrived = P.apptArrived || st.t;
      if (P.spot && P.spot.on && Math.random() < .12) { P.spot = restSpot(st, n, t, key); G.goTo(n, P.spot.x, P.spot.y); return; }
      if (P.spot) P.spot.on = true;
      n.wait = 30 + Math.random() * 50;
      if (Math.random() < .08 && st.clock > n.barkCd) barkTime(st, n, b);
    }
  }
  // [passo] sul bordo del marciapiede, se il prossimo passo è in strada: si guarda a sinistra e a destra, e se arriva
  // una macchina si aspetta che passi. Chi è di fretta (in ritardo) aspetta meno.
  const roadAt = (x, y) => G.MAP.grid[Math.floor(y / TS) * G.MAP.world.GW + Math.floor(x / TS)] === G.T.VIA;
  // [passo] incrociando un amico o un parente: un saluto (la mano, il nome); chi ce l'ha con l'altro tira dritto e guarda altrove
  function greetFriends(st, n) {
    if (st.clock < (n.__grT || 0)) return; n.__grT = st.clock + .7 + Math.random() * .6;
    const P = n.pop; if (!P.friends || !P.friends.length) return;
    for (const id of P.friends) {
      const k = G.byId(st, id); if (!k || k.dead || k.inside || !k.pop || !k.pop.near) continue;
      const d = dist(k.x, k.y, n.x, n.y); if (d > 6 || d < .5) continue;
      const seen = (n.__greeted = n.__greeted || {}); if (st.clock - (seen[id] || -999) < 120) continue; seen[id] = st.clock;
      if (opinionOf(st, n, id) < -.3) continue;
      const wave = d > 2.5; n.greet = { who: id, until: st.clock + 1.6, wave };
      if (k.pop && !(k.__greeted && st.clock - k.__greeted[n.id] < 120)) { (k.__greeted = k.__greeted || {})[n.id] = st.clock; k.greet = { who: n.id, until: st.clock + 1.4 + Math.random() * .4, wave: wave && Math.random() < .6 }; }
      if (st.clock > (n.barkCd || 0)) { G.say(st, n, pick(Math.random, [`Ciao ${k.first}!`, `Ehi, ${k.first}.`, `${k.first}! Come va?`, 'Buongiorno.']), 1.6); n.barkCd = st.clock + 8; }
      break;
    }
  }
  function curbWait(st, n, dt) {
    const w = n.path && n.path[0]; if (!w || roadAt(n.x, n.y)) { n.__curb = 0; return false; }
    const ux = w.x - n.x, uy = w.y - n.y, L = Math.hypot(ux, uy) || 1, ax = n.x + ux / L * 1.2, ay = n.y + uy / L * 1.2;
    if (!roadAt(ax, ay)) { n.__curb = 0; return false; }
    // la macchina che arriva: dove sarà tra poco, e se passa vicino al punto dove attraverso
    let threat = null;
    for (const v of st.vehicles) {
      if (v.hidden || v.wreck || Math.abs(v.speed || 0) < 1.5) continue; const dx = v.x - ax, dy = v.y - ay; if (dx * dx + dy * dy > 30 * 30) continue;
      const vx = Math.cos(v.ang) * v.speed, vy = Math.sin(v.ang) * v.speed;
      for (let k = 0; k <= 4; k++) { const tt = k * .9; if (Math.hypot(v.x + vx * tt - ax, v.y + vy * tt - ay) < 4.5) { threat = v; break; } }
      if (threat) break;
    }
    n.__curb = (n.__curb || 0) + dt;
    if (n.__curb < .5) { n.speedNow = 0; n.face += angDiff(Math.atan2(uy, ux) + Math.sin(n.__curb * 9) * 1.1, n.face) * Math.min(1, dt * 8); return true; }   // uno sguardo ai due lati
    if (threat && n.__curb < 12) { n.speedNow = 0; n.face += angDiff(Math.atan2(threat.y - n.y, threat.x - n.x), n.face) * Math.min(1, dt * 6); return true; }   // aspetta che passi
    return false;
  }
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  // ---------------- [passo] STARE IN UN POSTO: ai bordi, in due o tre, con chi si conosce ----------------
  // I posti buoni di un luogo all'aperto si leggono dalla mappa: contro una facciata o un muro, sul bordo dell'acqua,
  // vicino a un albero; mai in carreggiata. Ognuno ha una direzione naturale: spalle al muro, sguardo verso lo spazio
  // aperto (o verso il mare). Chi arriva si avvicina a un amico o a un parente che è già lì (in due faccia a faccia,
  // in tre a semicerchio aperto, non di più); se non conosce nessuno sta per conto suo, a un bordo, lontano dagli altri.
  const SPOTS = {};
  function spotsOf(pid) {
    if (SPOTS[pid]) return SPOTS[pid];
    const P0 = PLACES[pid], out = []; if (!P0) return (SPOTS[pid] = out);
    const GW = G.MAP.world.GW, grid = G.MAP.grid, T = G.T, tx0 = Math.floor(P0.x / TS), ty0 = Math.floor(P0.y / TS);
    const tAt = (x, y) => grid[y * GW + x];
    for (let ty = ty0 - 7; ty <= ty0 + 7; ty++) for (let tx = tx0 - 7; tx <= tx0 + 7; tx++) {
      const cx = tx * TS + TS / 2, cy = ty * TS + TS / 2, dd = Math.hypot(cx - P0.x, cy - P0.y); if (dd > 14) continue;
      if (!G.walkM(cx, cy) || tAt(tx, ty) === T.VIA) continue;
      let bx = 0, by = 0, nb = 0, water = 0, road = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { if (!ox && !oy) continue; const t = tAt(tx + ox, ty + oy);
        if (t === T.VIA) road++; else if (!G.walkM(cx + ox * TS, cy + oy * TS) || t === T.TREE) { bx += ox; by += oy; nb++; if (t === T.WATER) water++; } }
      if (road >= 3) continue;   // sul ciglio della strada non ci si ferma
      const edge = nb > 0 && nb < 7, L = Math.hypot(bx, by) || 1;
      // contro il bordo (mezzo metro più in là), con la faccia dalla parte opposta; davanti all'acqua si guarda il mare
      const x = edge ? cx + bx / L * .45 : cx, y = edge ? cy + by / L * .45 : cy;
      const face = !edge ? null : water ? Math.atan2(by, bx) : Math.atan2(-by, -bx);
      out.push({ x, y, face, wall: edge && !water, water: water > 0, score: (edge ? 1.2 + nb * .08 : .35) - dd * .02 });
    }
    return (SPOTS[pid] = out.sort((p, q) => q.score - p.score).slice(0, 60));
  }
  function restSpot(st, n, t, key) {
    const P = n.pop, S0 = spotsOf(t.pid);
    if (!S0.length) { const s = G.wanderSpot(st, PLACES[t.pid]); return { key, pid: t.pid, ci: n.id, x: s.x, y: s.y, face: n.face }; }
    // chi c'è già, e in che gruppo
    const here = st.npcs.filter(k => k !== n && k.pop && k.pop.spot && k.pop.spot.on && k.pop.spot.pid === t.pid && !k.inside && !k.dead);
    const size = g => here.filter(k => k.pop.spot.ci === g).length;
    // [imprese] chi è qui per un'impresa sta con la sua squadra, attorno a chi c'è già
    if (P.cur && P.cur.imp) {
      const g = 'imp' + P.cur.imp, crew = here.filter(k => k.pop.spot.ci === g), c0 = crew.length ? { x: crew.reduce((a, k) => a + k.x, 0) / crew.length, y: crew.reduce((a, k) => a + k.y, 0) / crew.length } : S0[0];
      for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = crew.length ? 1.1 + crew.length * .18 : 0, x = c0.x + Math.cos(a) * r, y = c0.y + Math.sin(a) * r; if (G.walkM(x, y) && !roadAt(x, y)) return { key, pid: t.pid, ci: g, x, y, face: crew.length ? Math.atan2(c0.y - y, c0.x - x) : (c0.face || 0), wall: false }; }
    }
    // un amico o un parente da raggiungere (chi è chiacchierone si avvicina anche a chi conosce appena)
    const fond = k => closeness(st, n, k) + (opinionOf(st, n, k.id) * .5) + (n.tr ? (n.tr.loq - .5) * .3 : 0);
    const mate = here.filter(k => size(k.pop.spot.ci) < 3 && fond(k) > .55 && opinionOf(st, n, k.id) > -.2).sort((a, b) => fond(b) - fond(a))[0];
    if (mate && !(P.spot && P.spot.ci === mate.pop.spot.ci)) {
      const M = mate.pop.spot, g = M.ci, members = here.filter(k => k.pop.spot.ci === g);
      // in due: di fronte, a poco più di un metro; in tre: a semicerchio, aperto verso lo spazio libero
      const cx = members.reduce((s0, k) => s0 + k.x, 0) / members.length, cy = members.reduce((s0, k) => s0 + k.y, 0) / members.length;
      const base = members.length === 1 ? (M.face != null ? M.face : mate.face) : Math.atan2(cy - mate.y, cx - mate.x) + Math.PI * .66;
      for (const da of [0, .5, -.5, 1, -1]) {
        const r = members.length === 1 ? 1.1 : .95, ax = (members.length === 1 ? mate.x : cx) + Math.cos(base + da) * r, ay = (members.length === 1 ? mate.y : cy) + Math.sin(base + da) * r;
        if (!G.walkM(ax, ay) || roadAt(ax, ay) || here.some(k => k.pop.spot.ci !== g && dist(k.x, k.y, ax, ay) < 1.2)) continue;
        const cx2 = (cx * members.length + ax) / (members.length + 1), cy2 = (cy * members.length + ay) / (members.length + 1);
        // il gruppo si gira verso il centro (chi era da solo al muro ora guarda chi è arrivato)
        members.forEach(k => { k.pop.spot.face = Math.atan2(cy2 - k.y, cx2 - k.x); k.pop.spot.wall = false; });
        return { key, pid: t.pid, ci: g, x: ax, y: ay, face: Math.atan2(cy2 - ay, cx2 - ax), wall: false };
      }
    }
    // per conto suo: un bordo libero, lontano da chi c'è (la gente si tiene le distanze), meglio se vicino a dove arriva
    let best = null, bv = -1e9;
    for (const q of S0) {
      const crowd = here.reduce((s0, k) => { const d = dist(k.x, k.y, q.x, q.y); return s0 + (d < 1.8 ? 5 : d < 3.5 ? 1 : 0); }, 0);
      const v = q.score * 2 - crowd - dist(n.x, n.y, q.x, q.y) * .02 + Math.random() * .8;
      if (v > bv) { bv = v; best = q; }
    }
    const face = best.face != null ? best.face + (Math.random() - .5) * .8 : Math.random() * Math.PI * 2;
    return { key, pid: t.pid, ci: n.id, x: best.x + (Math.random() - .5) * .3, y: best.y + (Math.random() - .5) * .3, face, wall: best.wall };
  }
  // in crocchio si parla: di quello che si ha in testa (un progetto, un bisogno, un ricordo che pesa)
  function chatter(st, n, b) {
    if (st.clock < (n.barkCd || 0) || Math.random() > .004) return;
    const P = n.pop, S = P.spot; let mates = 0;
    st.npcs.forEach(k => { const K = k !== n && k.pop && k.pop.spot; if (K && K.on && K.pid === S.pid && K.ci === S.ci && !k.inside && dist(k.x, k.y, n.x, n.y) < 3) mates++; });
    if (!mates) return;
    const line = chatLine(st, n, b); if (!line) return;
    G.say(st, n, line, 3); n.barkCd = st.clock + 14 + Math.random() * 16;
  }
  // di cosa parla chi ha quell'interesse
  const TALK_INT = {
    pesca: ['Stamattina alla punta abboccavano.', 'Domani esco all\'alba con la barca.'], carte: ['Stasera scopa all\'osteria, vieni?', 'Ieri a briscola mi hanno spennato.'],
    lettura: ['Ho finito quel libro, te lo presto.', 'In biblioteca non c\'è più niente di buono.'], musica: ['Hai sentito il disco nuovo al juke-box?', 'Alla radio stanotte davano roba forte.'],
    ballo: ['Sabato si va alla Luna!', 'Alla Luna c\'è il DJ nuovo.'], fede: ['Domenica don Piero ha detto una bella predica.', 'Ho acceso un cero per mia madre.'],
    sport: ['Partitella sulla spiaggia, dopo?', 'Hai visto la partita?'], cinema: ['Al cinema danno un film americano.', 'Stasera c\'è la prima, ci vai?'],
    chiacchiere: ['Lo sai della figlia del farmacista?', 'Non dirlo a nessuno, eh…'], politica: ['Il Garante racconta solo bugie.', 'Leggi tra le righe del Bollettino.'],
    motori: ['La Vespa fa un rumore strano.', 'All\'officina hanno una Giulia da sistemare.'], cucina: ['Domenica faccio le trofie al pesto.', 'Il pesce oggi era freschissimo.'],
    campagna: ['L\'orto quest\'anno rende.', 'Col gelo l\'orto è da buttare.'], mare: ['Il mare oggi è color ferro.', 'Stamattina sulla caletta c\'era il ghiaccio.'],
    eleganza: ['Ho visto una giacca in vetrina…', 'Quella camicia ti sta bene.'], foto: ['Ti faccio una foto, stai fermo.', 'Ho finito il rullino.'], arte: ['Su quel muro ci starebbe un bel murale.', 'Sto disegnando il porto.'],
  };
  const TALK = [];   // [convivenza] chi ha qualcosa di vero da dire (appuntamenti, patti, debiti, quello che è successo) passa davanti
  function chatLine(st, n, b) {
    for (const f of TALK) { try { const t = f(st, n, b); if (t) return t; } catch (e) { } }
    const P = n.pop, N = P.need || {}, r = Math.random(), pj = (P.projects || [])[0];
    if (pj && r < .3) return pick(Math.random, [`Devo ${pj.label}.`, `Sto pensando di ${pj.label}.`, `Prima o poi riesco a ${pj.label}.`]);
    if (N.soldi > .6 && r < .5) return pick(Math.random, ['Non arrivo a fine mese.', 'Con quello che costa il pane…', 'Lo Squalo non aspetta.']);
    if (N.paura > .6 && r < .55) return pick(Math.random, ['Parla piano, che ascoltano.', 'Io la sera non esco più.', 'Hai visto quanti Grigi stamattina?']);
    if (N.rabbia > .6 && r < .6) return pick(Math.random, ['Prima o poi qualcuno gliela fa pagare.', 'Non è giusto, e lo sanno tutti.', 'Io non sto zitto.']);
    if (P.job && r < .7) return pick(Math.random, [`Al lavoro (${P.job.title}) oggi non finiva più.`, `Domani attacco alle ${P.job.start}.`, 'Il padrone ci mette i piedi in testa.']);
    if (!P.job && P.status === 'disoccupato' && r < .7) return pick(Math.random, ['Sai se cercano qualcuno alla calata?', 'Lavoro non ce n\'è.']);
    if (b && b.act === 'mercato') return pick(Math.random, ['A quanto le vende?', 'Ieri costavano meno.', 'Che belle, oggi.']);
    const iw = P.intW || {}, top = (P.ints || []).slice().sort((x, y) => (iw[y.k] || 0) - (iw[x.k] || 0))[0], IL = top && TALK_INT[top.k];
    if (IL && r < .85) return pick(Math.random, IL);
    return pick(Math.random, ['Che freddo, eh?', 'Hai visto chi è tornato?', 'Mia figlia si sposa a primavera.', 'E tuo fratello come sta?', 'Domenica c\'è la partita.', 'Non si sa più di chi fidarsi.']);
  }

  // ---------------- [scopo] DENTRO SI VEDE CHI C'È ----------------
  // quando il giocatore entra in un edificio, chi ci sta (a casa, al lavoro, cliente) prende il suo posto nell'interno:
  // nel letto chi dorme, a tavola chi mangia, al bancone chi serve, sulla panca chi prega. n.room dice dove e come.
  const BEDS = /^(bedDouble|bedSingle|ia_lettino|ia_materasso|ia_branda|ia_castello|ia_letto_ospedale)$/;
  const SEATS = /^(chair|chairDesk|ia_poltrona|loungeSofa|ia_divano|stoolBar|bench|ia_panca_chiesa|ia_panca_lunga|rc_seat|ia_sedia_rotta|ia_poltrona_barbiere)$/;
  const SOFT = /^(ia_poltrona|loungeSofa|ia_divano)$/, PEWS = /^(ia_panca_chiesa|bench|ia_panca_lunga)$/;
  const STOVES = /^(kitchenStove|ia_cucina_gas|ia_focolare|kitchenSink|ia_lavello|st_stufa)$/;
  const COUNTERS = /^(ia_bancone_bar|kitchenBar|pv_banco_vendita|ar_cash-register)$/;
  const roomKey = (bi, f) => bi + ':' + f;
  // il piano di casa di una famiglia (nei palazzi ogni piano è una casa diversa; il piano terra è l'androne)
  function homeFloor(L, P) {
    const nf = L.floors.length; if (nf <= 1) return 0;
    const condo = L.floors[0].rooms.some(q => /androne|portineria/.test(q.name || ''));
    const h = Math.abs(String(P.hh || '').split('').reduce((s, c) => s * 31 + c.charCodeAt(0), 7)) ;
    return condo ? 1 + h % (nf - 1) : 0;
  }
  // che cosa sta facendo dentro: la posa e il mobile che gli serve
  function indoorUse(st, n, b, atHome) {
    const m = minOfDay(st.t), P = n.pop;
    if (!b) return { want: 'seat', pose: 'siede' };
    if (b.act === 'sonno') return { want: 'bed', pose: 'dorme' };
    if (b.act === 'lavoro') return { want: 'work', pose: 'lavora' };
    if (b.act === 'messa') return { want: 'pew', pose: 'prega' };
    if (b.act === 'impresa' && /cena|pranz|mangi/.test(b.label || '')) return { want: 'table', pose: 'tavola' };   // [imprese]
    if (b.act === 'pranzo' || (atHome && ((m > 12 * 60 && m < 14 * 60 + 30) || (m > 19 * 60 + 30 && m < 21 * 60 + 30)))) return { want: 'table', pose: 'tavola' };
    if (b.obj === 'cucina' || (atHome && b.label === 'si prepara')) return { want: 'stove', pose: 'lavora' };
    if (b.obj === 'bancone' || b.obj === 'panino') return { want: 'counter', pose: 'bancone' };
    if (b.obj === 'carte') return { want: 'table', pose: 'carte' };
    if (b.obj === 'libri') return { want: 'seat', pose: 'legge' };
    if (b.obj === 'tv' || b.obj === 'radio' || b.obj === 'cinema') return { want: 'soft', pose: 'siede' };
    if (b.obj === 'flipper') return { want: 'free', pose: 'flipper' };
    if (b.obj === 'pista') return { want: 'free', pose: 'balla' };
    if (b.obj === 'barbiere') return { want: 'seat', pose: 'siede' };
    if (b.obj === 'bottega' || b.act === 'spesa') return { want: 'counter', pose: 'merce' };
    const coin = (String(n.id) + (P.curKey || '')).split('').reduce((h, c) => (h * 33 + c.charCodeAt(0)) % 1000, 5) / 1000;   // la stessa scelta finché dura il blocco
    if (atHome) return coin < .5 ? { want: 'soft', pose: 'siede' } : { want: 'free', pose: null };
    return coin < .55 ? { want: 'seat', pose: 'siede' } : { want: 'counter', pose: 'bancone' };
  }
  // un punto in piedi accanto a un mobile, sul pavimento libero
  const roomy = (used, x, y) => !used.some(u => dist(u.x, u.y, x, y) < .7);
  function besideFurn(L, f, o, used) {
    const ry = o.ry || 0, c = [[Math.sin(ry), Math.cos(ry)], [-Math.sin(ry), -Math.cos(ry)], [Math.cos(ry), -Math.sin(ry)], [-Math.cos(ry), Math.sin(ry)]];
    for (const k of [.8, 1.25]) for (const [dx, dy] of c) { const x = o.x + dx * k, y = o.y + dy * k; if (INT().walk(L, f, x, y, .22) && roomy(used, x, y)) return { x, y, face: Math.atan2(o.y - y, o.x - x) }; }
    return null;
  }
  const INT = () => (typeof Interior !== 'undefined' ? Interior : G.INT);
  function freeFloor(L, f, used) {
    const F = L.floors[f];
    for (let i = 0; i < 60; i++) {
      const q = F.rooms[i % F.rooms.length], x = q.x + .6 + Math.random() * Math.max(.1, q.w - 1.2), y = q.y + .6 + Math.random() * Math.max(.1, q.h - 1.2);
      if (INT().walk(L, f, x, y, .25) && !used.some(u => dist(u.x, u.y, x, y) < .9)) { const c = used[0]; return { x, y, face: c ? Math.atan2(c.y - y, c.x - x) : Math.random() * Math.PI * 2 }; }
    }
    return null;
  }
  function placeIndoor(st, n, L, bi, f, used, taken) {
    const P = n.pop, b = P.cur, atHome = isHomeT(P, b && b.tgt), F = L.floors[f], u = indoorUse(st, n, b, atHome);
    let fi = -1;
    const furn = re => { const ok = []; F.furn.forEach((o, i) => { if (!taken.has(i) && re.test(o.id) && roomy(used, o.x, o.y)) ok.push(i); }); if (!ok.length) return null; fi = ok[Math.floor(Math.random() * ok.length)]; taken.add(fi); return F.furn[fi]; };
    const seatAt = o => ({ x: o.x, y: o.y, face: Math.PI / 2 - (o.ry || 0) });
    let spot = null, pose = u.pose;
    if (u.want === 'work' && f === 0 && typeof Oggetti !== 'undefined' && Oggetti.staffIndoor) {
      const s = Oggetti.staffIndoor(st, bi).find(x => x.id === n.id);
      if (s) { spot = { x: s.x, y: s.y, face: s.face }; pose = s.post === 'banco' ? 'merce' : 'lavora'; }
    }
    if (!spot && u.want === 'work') {
      const o = furn(COUNTERS) || furn(/^(pv_banco_lavoro|ia_scrivania_grande|ia_macchina_scrivere|desk)$|^st_/) || furn(STOVES);
      if (o && o.id === 'desk') { const c = F.furn.findIndex((x, i) => !taken.has(i) && x.id === 'chairDesk' && dist(x.x, x.y, o.x, o.y) < 1.2); if (c >= 0) { taken.add(c); spot = seatAt(F.furn[c]); pose = 'siede'; } }
      if (o && !spot) spot = besideFurn(L, f, o, used);
    }
    if (!spot && u.want === 'bed') { const o = furn(BEDS); if (o) spot = seatAt(o); }
    if (!spot && /^(table|seat|soft|pew)$/.test(u.want)) {
      const o = (u.want === 'soft' && furn(SOFT)) || (u.want === 'pew' && furn(PEWS)) || furn(/^(chair|stoolBar|rc_seat|bench|ia_panca_lunga|ia_panca_chiesa)$/) || furn(SEATS);
      if (o) spot = seatAt(o);
    }
    if (!spot && u.want === 'stove') { const o = furn(STOVES); if (o) spot = besideFurn(L, f, o, used); }
    if (!spot && u.want === 'counter') { const o = furn(COUNTERS); if (o) spot = besideFurn(L, f, o, used); }
    // chi dorme e non ha un letto qui è in un'altra stanza, con la porta chiusa: non si vede
    if (!spot && u.want === 'bed') return null;
    // senza il mobile giusto si sta in piedi (niente sedute nel vuoto)
    if (!spot) { spot = freeFloor(L, f, used); if (pose !== 'prega' && pose !== 'flipper' && pose !== 'balla' && pose !== 'lavora' && pose !== 'merce') pose = null; }
    if (!spot) return null;
    used.push(spot);
    const act = b && b.act, label = act === 'sonno' ? 'dorme' : act === 'casa' ? (atHome ? 'a casa' : b.label) : act === 'pranzo' ? 'a tavola' : act === 'lavoro' && P.job ? `al lavoro (${P.job.title})` : b ? b.label : '';
    return { bi, f, fi, want: u.want, x: spot.x, y: spot.y, face: spot.face, pose, label, ent: L.ent.in };
  }
  // chi è dentro l'edificio del giocatore, a quel piano
  function roomStep(st) {
    const p = st.player, R0 = st.pop.room || (st.pop.room = { key: null, at: 0, ids: [], since: 0, seen: {} });
    const key = p.indoor ? roomKey(p.indoor.b, p.indoor.f) : null;
    if (key !== R0.key) { R0.ids.forEach(id => { const n = G.byId(st, id); if (n) leaveRoom(st, n); }); R0.ids = []; R0.key = key; R0.at = 0; R0.seen = {}; R0.since = st.clock; }
    if (!key || st.clock < R0.at) return; R0.at = st.clock + .4;
    const bi = p.indoor.b, f = p.indoor.f, L = INT() && INT().layout(G.BUILDINGS[bi]); if (!L || !L.floors[f]) return;
    const here = st.npcs.filter(n => n.pop && !n.dead && n.inside && !isPassive(st, n) && !(n.jailedUntil > st.t) && n.pop.at && n.pop.at.k === 'b' && n.pop.at.bi === bi
      && (isHomeT(n.pop, n.pop.at) && !(n.pop.cur && n.pop.cur.act === 'lavoro') ? homeFloor(L, n.pop) === f : f === 0));
    // chi non c'è più (uscito, portato via) lascia la stanza
    R0.ids = R0.ids.filter(id => { const n = G.byId(st, id); if (n && (here.includes(n) || (n.room && n.room.out && n.room.walk))) return true; if (n) leaveRoom(st, n); return false; });
    const used = R0.ids.map(id => G.byId(st, id)).filter(n => n && n.room).map(n => n.room), taken = new Set(used.map(r => r.fi).filter(i => i >= 0));
    here.slice(0, 14).forEach(n => {
      const P = n.pop, bk = P.curKey;
      if (n.room && (n.room.bk === bk || n.room.out)) return;
      // stessa cosa di prima (un altro blocco «a casa», la notte che passa): resta dov'è
      if (n.room && indoorUse(st, n, P.cur, isHomeT(P, P.cur && P.cur.tgt)).want === n.room.want && P.cur) { n.room.bk = bk; return; }
      if (n.room && n.room.fi >= 0) taken.delete(n.room.fi);
      const r = placeIndoor(st, n, L, bi, f, used, taken); if (!r) return;
      r.bk = bk; r.door = n.room ? n.room.door : { x: n.x, y: n.y };
      // chi arriva mentre ci sei entra dalla porta e va al suo posto; chi c'era già è al suo posto
      const fresh = !R0.ids.includes(n.id);
      if (fresh && st.clock > R0.since + 1) { n.x = L.ent.in[0]; n.y = L.ent.in[1]; r.walk = true; }
      else if (fresh) { n.x = r.x; n.y = r.y; n.face = r.face; }
      else r.walk = true;   // cambia attività: si sposta nella stanza
      n.room = r; if (fresh) R0.ids.push(n.id);
      // a casa sua, uno sconosciuto in casa non passa inosservato
      if (fresh && isHomeT(P, P.at) && !R0.seen[n.id] && r.pose !== 'dorme' && !G.BUILDINGS[bi].playerHome) { R0.seen[n.id] = 1; if (Math.random() < .6) G.say(st, n, pick(Math.random, ['E lei chi è? Questa è casa mia!', 'Che ci fa qui? Esca subito.', 'Ehi! Chi l\'ha fatta entrare?']), 3); }
    });
  }
  // il passo di chi cammina dentro (ogni fotogramma)
  function roomWalk(st, dt) {
    const R0 = st.pop.room; if (!R0 || !R0.key) return;
    R0.ids.forEach(id => {
      const n = G.byId(st, id), r = n && n.room; if (!r || !r.walk) return;
      const dx = r.x - n.x, dy = r.y - n.y, d = Math.hypot(dx, dy), s = 1.2 * dt;
      if (d <= s) { n.x = r.x; n.y = r.y; n.face = r.face; r.walk = false; n.speedNow = 0; return; }
      n.x += dx / d * s; n.y += dy / d * s; n.face = Math.atan2(dy, dx); n.speedNow = 1.2;
    });
  }
  // chi deve uscire prima cammina fino alla porta dell'interno (true: sta ancora andando)
  function roomExit(st, n) {
    const r = n.room; if (!r) return false;
    if (!r.out) { r.out = true; r.x = r.ent[0]; r.y = r.ent[1]; r.face = n.face; r.pose = null; r.walk = true; }
    if (r.walk) return true;
    leaveRoom(st, n); return false;
  }
  function leaveRoom(st, n) { const r = n.room; if (!r) return; n.room = null; n.speedNow = 0; if (r.door) { n.x = r.door.x; n.y = r.door.y; } }
  // a cosa sta pensando, in due parole (per l'etichetta sotto il puntatore)
  function doing(st, n) {
    const P = n.pop; if (!P || n.dead) return '';
    if (n.room) return n.room.pose === 'dorme' ? 'dorme' : cap(n.room.label || '');
    const a = n.action ? n.action.name : '', b = P.cur;
    if (a === 'al lavoro') return `al lavoro (${P.job ? P.job.title : ''})`;
    if (P.emer && P.emer.steps && P.emer.steps[P.emer.i]) return P.emer.steps[P.emer.i].label;
    if (!b || !b.tgt || (a !== 'routine' && a !== 'dentro')) return '';
    const there = P.at && tkey(P.at) === tkey(b.tgt) && (b.tgt.k !== 'p' || (P.spot && P.spot.on));
    const where = isHomeT(P, b.tgt) ? 'casa' : b.tgt.label;
    return there ? b.label + (b.label.includes(b.tgt.label) || where === 'casa' ? '' : ` (${where})`) : `${b.label} → ${where}`;
  }
  // il tempo detto ad alta voce
  function barkTime(st, n, b) {
    const m = minOfDay(st.t), cf = curfewFrom(st), P = n.pop;
    let s = null;
    if (cf - m < 50 && cf - m > 0) s = pick(Math.random, ['Tra poco c\'è l\'Ora Quieta, andiamo.', 'È tardi, a casa prima del coprifuoco.']);
    else if (P.appt && P.appt.t - st.t < 30 && P.appt.t > st.t) s = `Aspetto ${G.nameOf(st, P.appt.with)}… doveva essere qui alle ${hhmm(minOfDay(P.appt.t))}.`;
    else if (weekday(st.t) === 4 && m > 17 * 60 && m < 20 * 60 && P.job) s = 'Oggi è venerdì, si ritira la paga!';
    else if (weekday(st.t) === 0 && m < 11 * 60) s = 'Lunedì… e c\'è pure il Bollettino.';
    if (s) { G.say(st, n, s, 2.6); n.barkCd = st.clock + 25; }
  }
  function hookStep(st, dt) {
    const S = st.pop; if (!S) return;
    // livello di dettaglio
    S.lodAt -= dt; if (S.lodAt <= 0) { S.lodAt = CFG.lodEvery; updateLod(st); }
    // [scopo] dentro l'edificio del giocatore si vede chi c'è
    roomStep(st); roomWalk(st, dt);
    // ore
    const hm = Math.floor(st.t / 60);
    while (S.hourMark < hm) { S.hourMark++; onHour(st, S.hourMark % 24); }
    // chiacchiere a distanza e appuntamenti; chi arriva in città (automobilisti, nuovi personaggi) entra nella vita
    if (st.t - S.talkAt >= CFG.talkEvery) { S.talkAt = st.t; farTalk(st); checkAppointments(st); adoptAll(st); }
    // i furti si scoprono
    st.timers = st.timers.filter(tm => {
      if (tm.kind !== 'popDiscover' || st.t < tm.at) return true;
      const v = G.byId(st, tm.npc); if (!v || v.dead) return false;
      G.addMemory(st, v, { eventId: tm.ev, type: tm.type, target: v.id, owner: v.id, place: tm.place, t: tm.at - 5, actor: tm.thief || 'ignoto', conf: tm.thief ? .85 : .9, source: tm.thief ? 'visto' : 'scoperto' });
      if (v.pop) { feel(v, 'rabbia', .2); feel(v, 'paura', .2); }
      note(st, v, tm.type === 'scasso' ? `trovato la casa svaligiata (${Math.round(tm.took)}.000 lire)` : `scippat${o(v)} a ${tm.place}${tm.thief ? `: è stat${tm.thief && G.byId(st, tm.thief) && G.byId(st, tm.thief).pop && G.byId(st, tm.thief).pop.sex === 'f' ? 'a' : 'o'} ${G.nameOf(st, tm.thief)}` : ''}`, 'bad', { w: .7, place: tm.type === 'scasso' ? null : tm.place, who: tm.thief || null, tag: 'furto' });
      // la denuncia da lontano: arriva ai Grigi con calma
      if (tm.thief && v.tr.legge > .45 && Math.random() < .6) { const cop = st.npcs.find(k => k.cop && !k.dead); if (cop) { G.addMemory(st, cop, { eventId: tm.ev, type: tm.type, actor: tm.thief, target: v.id, owner: v.id, place: tm.place, t: tm.at, conf: .8, source: 'denuncia', via: [v.first] }); v.reported[tm.ev] = true; } }
      return false;
    });
  }
  function hookCreate(st) { spawn(st); }

  // ---------------- INSTALLAZIONE ----------------
  function install() {
    const H = G.HOOKS;
    if (H.__popolo) return; H.__popolo = true;
    Object.assign(G.SEV, { graffito: .3 }); Object.assign(G.NOISE, { graffito: 2 }); Object.assign(G.LABEL, { graffito: 'Graffito' });
    const c0 = H.create, t0 = H.think, m0 = H.move, s0 = H.step, v0 = H.verb, j0 = H.jailed;
    H.create = st => { hookCreate(st); if (c0) c0(st); afterRisacca(st); };
    H.think = (st, n) => (n.pop && !n.pop.near && !isPassive(st, n)) ? hookThink(st, n) : ((t0 && t0(st, n)) || hookThink(st, n));
    H.move = (st, n, dt, a) => (n.pop && !n.pop.near && !isPassive(st, n)) ? hookMove(st, n, dt, a) : ((m0 && m0(st, n, dt, a)) || hookMove(st, n, dt, a));
    H.step = (st, dt) => { if (s0) s0(st, dt); hookStep(st, dt); };
    H.verb = (st, m, T) => (m.type === 'graffito' ? 'ha dipinto un muro' : v0 ? v0(st, m, T) : null); if (j0) H.jailed = j0;
    // i giorni della settimana anche per chi chiede G.dayName (la chat della Risacca)
    G.dayName = t => WEEK[(Math.floor(t / 1440) + 1) % 7];
  }
  // dopo la Risacca: l'ideologia nata dalla vita di ognuno
  function afterRisacca(st) {
    st.npcs.forEach(n => { if (n.pop && n.ris) { const R = RS(); const c = R && R.CARDS[n.id]; if (c && c.ideo !== undefined) n.ris.ideo = c.ideo; } });
    adoptAll(st);   // [vita] tutti gli altri personaggi: cast, Tutela, Squalo, marsigliesi, briganti, passanti
  }
  install();

  // ---------------- RESOCONTO (per le prove) ----------------
  function report(st) {
    const pp = st.npcs.filter(n => n.pop), S = st.pop.stats;
    const by = f => { const o = {}; pp.forEach(n => { const k = f(n); o[k] = (o[k] || 0) + 1; }); return o; };
    return {
      abitanti: pp.length, famiglie: Object.keys(st.pop.households).length, vicini: st.pop.nearN,
      stato: by(n => n.pop.status), giri: by(n => n.pop.giro || '—'), fuori: pp.filter(n => !n.inside).length,
      inCella: pp.filter(n => n.jailedUntil > st.t).length, alVerde: pp.filter(n => n.pop.money < 0).length,
      soldiMedi: Math.round(pp.reduce((s, n) => s + n.pop.money, 0) / pp.length), stats: S,
      cast: pp.filter(n => n.pop.cast).length, progettiAttivi: by(n => (n.pop.projects || []).map(p => p.kind).join('+') || '—'),
      giorno: `${wdName(st.t)} ${G.clockStr(st.t)}`,
    };
  }
  // per i moduli che costruiscono sopra la vita (azioni.js): gli strumenti interni
  const USE = [], AVAIL = [], ESSENTIAL = [], MONEY = {}, MEET = [];   // [scambi] MEET: chi vuole sapere com'è andato un appuntamento con un patto   // [soldi] MONEY: agganci dei soldi (paga, affitto, spese, macchinette)   // [economia] chi vuole può vietare o far pagare l'uso di un oggetto in un posto (scorte, prezzi)
  const _ = { USE, AVAIL, ESSENTIAL, MONEY, MEET, TALK, spotsOf, resolveRef, appointCheck: checkAppointments, JOBS_BY, OUTDOOR, GENDER, buildIndex, sketchFor, artStyle, readWalls, newcomer, REFLECT, note, feel, target, tkey, tB, planDay, blockNow, snapFar, wakeNear, dayIdx, minOfDay, hhmm, isPassive, arrestFar, arrest: arrestFar, toLong, recall, opinionOf, consolidate, chooseObj, startProject, endProject, PROJ, OGG, useRef, recent, share, closeness, paintWall, appoint, adopt, o, cap, pick, isHomeT, initLife, lifeOf, curfewFrom, clamp, dist };
  return { _, arrest: arrestFar, note, OGG, INTERESSI, PROJ, lifeOf, lifeShort, reflect, chooseObj, startProject, isPassive, CFG, WEEK, RECURRING, GIRI, weekday, wdName, ago, curfewFrom, eventsOn, planDay, blockNow, appoint, bioOf, report, target, note, buildIndex, doing, recall, opinionOf };
})();
if (typeof module !== 'undefined') module.exports = Popolo;
