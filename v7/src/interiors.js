/* Interni [interni 4/10]: ogni edificio si visita, piano per piano (fino a 7, come fuori).
   Ogni piano ha la sua pianta (stanze divise lungo le caselle, porte fra le stanze) e il suo PROGRAMMA:
   un'attività (bar, forno, caserma, banja…) ha le sue stanze col loro arredo; una casa ha la sua famiglia
   (famiglia, anziana sola, operaio, pescatore, intellettuale, funzionario della Tutela, kommunalka, contadini, rudere)
   e nei condomini ogni piano è una casa diversa.
   L'arredo si compone: GRUPPI (il tavolo con le sedie intorno, il letto coi comodini, la stufa con la legna),
   mobili contro i muri, roba al centro, cianfrusaglie per terra, quadri e manifesti appesi ai muri esterni.
   Ogni stanza dice anche che pavimento, che pareti e che luce ha (le usa interni_arte.js).
   Coordinate in metri, come il mondo. Lo usano il motore (dove si cammina, scale, uscita) e la grafica. */
var Interior = (function () {
  'use strict';
  const TS = 2, WT = .22, CACHE = {}, MAXF = 7, PI = Math.PI;
  // [oggetti] stanze, mobili e postazioni aggiunti da oggetti.js (prima di generare le piante)
  const EXTRA = { names: {}, fur: {}, pre: {}, sz: {}, kind: null };
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // ---------------------------------------------------------------------------------------------------------------
  // CHE COS'È L'EDIFICIO
  // ---------------------------------------------------------------------------------------------------------------
  function kindOf(b) {
    if (EXTRA.kind) { const k = EXTRA.kind(b); if (k) return k; }
    const id = b.id || '';
    if (/miramare|flamingo|paradiso|oceano|gabbiano/.test(id)) return 'albergo';
    if (id === 'ambulatorio') return 'ambulatorio';
    if (id === 'cultura') return 'cultura';
    if (id === 'disco') return 'disco';
    if (id === 'chiosco') return 'banja';
    if (id === 'faro') return 'faro';
    if (id === 'benzina') return 'benzina';
    if (id === 'wu') return 'alimentari';
    if (id === 'video') return 'video';
    if (id === 'cantina') return 'cantina';
    if (id === 'gelateria') return 'gelateria';
    if (/^osteria|^car_2$/.test(id)) return 'trattoria';
    if (/^hangar/.test(id)) return 'hangar';
    if (/^deposito_|^magazzino$/.test(id)) return 'magazzino';
    if (id === 'miniera' || id === 'stazione2') return 'stazione';
    if (id === 'cantiere') return 'cantiere';
    if (id === 'rocca') return 'rocca';
    if (b.use && b.use !== 'casa' && b.use !== 'cascina') return b.use;
    if (b.church) return 'chiesa';
    if (id === 'officina') return 'officina';
    if (b.warehouse || /hangar|miniera|casotto/.test(id)) return 'deposito';
    if (id === 'commissariato' || id === 'caserma_p') return 'caserma';
    if (/bar|sirena|chiosco/.test(id) || (b.sign && /BAR|TRATTORIA|OSTERIA|GELATI/.test(b.sign.t))) return 'bar';
    if (id === 'cinema') return 'cinema';
    if (id === 'flipper') return 'sala_giochi';
    if (b.shop || b.sign || /video/.test(id)) return 'bottega';
    if (id === 'biblioteca') return 'biblioteca';
    return 'casa';
  }
  // chi ci vive (case e piani d'abitazione sopra le botteghe)
  const MOODS = ['famiglia', 'anziana', 'operaio', 'pescatore', 'intellettuale', 'funzionario', 'kommunalka', 'contadino', 'rudere'];
  function moodOf(b, f, r) {
    const nm = (b.name || '') + ' ' + (b.id || ''), W = typeof World !== 'undefined' ? World : null;
    const d = W && W.districtAt ? W.districtAt((b.x + b.w / 2) * TS) : '';
    if (/abbandon|rudere|diroccat|ovile/i.test(nm)) return 'rudere';
    if (/masseria|cascina|casale|salinaio/i.test(nm) || b.use === 'cascina' || /foresta|prateria/.test(d)) return f === 0 || r() < .7 ? 'contadino' : 'famiglia';
    const pool = /centro/.test(d) ? ['famiglia', 'famiglia', 'anziana', 'intellettuale', 'funzionario', 'funzionario', 'kommunalka', 'operaio']
      : /porto/.test(d) ? ['pescatore', 'pescatore', 'operaio', 'famiglia', 'anziana', 'kommunalka']
      : /base/.test(d) ? ['funzionario', 'operaio', 'famiglia']
      : ['famiglia', 'famiglia', 'operaio', 'operaio', 'anziana', 'kommunalka', 'kommunalka', 'pescatore', 'intellettuale'];
    const coast = W && W.yc && Math.abs((b.y + b.h / 2) * TS - W.yc((b.x + b.w / 2) * TS)) > 40;
    if (coast && r() < .2) return 'pescatore';
    return pick(r, pool);
  }
  // le stanze di una casa, secondo chi ci vive: [ingresso, poi per grandezza]; bagno sempre nella più piccola
  const HOME = {
    famiglia: [['soggiorno', 'cucina', 'camera', 'cameretta', 'bagno', 'ripostiglio'], ['camera', 'cameretta', 'bagno', 'soggiorno', 'ripostiglio']],
    anziana: [['salotto_buono', 'cucina', 'camera', 'bagno', 'dispensa'], ['camera', 'stanza_chiusa', 'bagno', 'ripostiglio']],
    operaio: [['cucina_abitabile', 'camera_spoglia', 'bagno', 'ripostiglio'], ['camera_spoglia', 'ripostiglio', 'bagno', 'stanza_vuota']],
    pescatore: [['cucina_abitabile', 'rimessa_reti', 'camera', 'bagno'], ['camera', 'cameretta', 'bagno', 'ripostiglio']],
    intellettuale: [['studio_libri', 'cucina', 'camera', 'bagno'], ['atelier', 'camera', 'bagno', 'studio_libri']],
    funzionario: [['salotto_buono', 'sala_pranzo', 'cucina', 'studio', 'bagno'], ['camera', 'studio', 'cameretta', 'bagno']],
    kommunalka: [['corridoio_k', 'stanza_fam', 'cucina_comune', 'stanza_fam', 'bagno', 'stanza_fam'], ['corridoio_k', 'stanza_fam', 'stanza_fam', 'cucina_comune', 'bagno', 'stanza_fam']],
    contadino: [['cucina_focolare', 'dispensa', 'camera', 'bagno'], ['camera', 'granaio', 'camera', 'bagno']],
    rudere: [['rudere', 'rudere', 'rudere'], ['rudere', 'rudere']],
  };
  // il programma di ogni piano: { names: [stanza d'ingresso/di scala, poi per grandezza], mood }
  function program(b, kind, f, nF, r) {
    const home = mood => ({ names: HOME[mood][f === 0 ? 0 : 1], mood });
    const up = () => { const mr = rng(((b.x * 2654435761) ^ (b.y * 40503) ^ (f * 977 + 999)) >>> 0); mr(); mr(); return home(moodOf(b, f, mr)); };   // sopra le botteghe ci vive qualcuno (o ci tengono la roba)
    const ex = EXTRA.names[kind]; if (ex) return { names: ex[Math.min(f, ex.length - 1)] || ex[0], mood: kind };
    const P = (n0, n1, n2) => ({ names: f === 0 ? n0 : f === nF - 1 && n2 ? n2 : n1, mood: kind });
    switch (kind) {
      case 'casa': {
        const condo = nF >= 3 || /condominio/i.test(b.name || '') || b.block;
        if (condo && f === 0) return { names: ['androne', 'portineria', 'cantine', 'ripostiglio'], mood: 'condominio' };
        if (b.id === 'salinaio') return { names: ['cucina_focolare', 'magazzino_sale', 'camera', 'bagno'], mood: 'contadino' };
        const mr = rng(((b.x * 2654435761) ^ (b.y * 40503) ^ ((condo ? f : 0) * 977 + 12345)) >>> 0); mr(); mr();   // una casa, una famiglia; nei condomini una per piano
        return home(moodOf(b, condo ? f : 0, mr));
      }
      case 'faro': return f === 0 ? { names: ['ingresso_faro'], mood: 'faro' } : f === nF - 1 ? { names: ['lanterna'], mood: 'faro' } : { names: [['alloggio_guardiano', 'deposito_olio', 'stanza_radio', 'alloggio_guardiano', 'deposito_olio', 'stanza_radio'][(f - 1) % 6]], mood: 'faro' };
      case 'bar': return f === 0 ? { names: ['sala_bar', 'retro', 'bagno', 'magazzino'], mood: 'bar' } : up();
      case 'trattoria': return f === 0 ? { names: ['sala_trattoria', 'cucina_trattoria', 'bagno', 'dispensa'], mood: 'trattoria' } : up();
      case 'gelateria': return f === 0 ? { names: ['gelateria', 'laboratorio_gelati', 'bagno', 'magazzino'], mood: 'gelateria' } : up();
      case 'banja': return { names: ['banja', 'spogliatoio_banja', 'bagno'], mood: 'banja' };
      case 'disco': return { names: ['pista', 'bar_disco', 'guardaroba', 'bagno'], mood: 'disco' };
      case 'albergo': return f === 0 ? { names: ['hall', 'sala_colazioni', 'cucina', 'bagno', 'ufficio'], mood: 'albergo' } : { names: ['corridoio_h', 'stanza_h', 'stanza_h', 'stanza_h', 'bagno', 'stanza_h'], mood: 'albergo' };
      case 'cultura': return P(['salone_cultura', 'atrio', 'guardaroba', 'bagno'], ['sala_riunioni', 'biblioteca_partito', 'ufficio', 'archivio'], ['museo_regime', 'archivio', 'ufficio', 'bagno']);
      case 'ambulatorio': return P(['attesa', 'visite', 'farmacia', 'bagno'], ['corsia', 'studio_medico', 'archivio', 'bagno']);
      case 'alimentari': return f === 0 ? { names: ['alimentari', 'magazzino', 'retro', 'bagno'], mood: 'alimentari' } : up();
      case 'benzina': return { names: ['cassa_benzina', 'magazzino', 'bagno'], mood: 'benzina' };
      case 'caserma': return P(['ingresso_caserma', 'ufficio_t', 'cella', 'armeria', 'interrogatorio'], ['camerata', 'ufficio_t', 'archivio', 'bagno']);
      case 'rocca': return { names: [['ingresso_caserma', 'ufficio_t', 'armeria', 'archivio', 'bagno'], ['archivio', 'archivio', 'ufficio_t', 'schedario'], ['interrogatorio', 'cella', 'cella', 'cella', 'bagno'], ['camerata', 'camerata', 'mensa_t', 'bagno'], ['comando', 'sala_radio_t', 'ufficio_t', 'bagno']][Math.min(f, 4)], mood: 'rocca' };
      case 'baracca': return { names: ['camerata', 'mensa_t', 'bagno'], mood: 'baracca' };
      case 'hangar': return { names: ['hangar'], mood: 'hangar' };
      case 'magazzino': return { names: [/neri|magazzino$/.test(b.id) ? 'magazzino_neri' : 'magazzino_porto', 'ufficio_porto', 'bagno'], mood: 'magazzino' };
      case 'stazione': return { names: ['sala_comandi', 'spogliatoio_m', 'deposito'], mood: 'stazione' };
      case 'cantiere': return { names: ['cantiere'], mood: 'cantiere' };
      case 'deposito': return { names: ['deposito'], mood: 'deposito' };
      case 'officina': return f === 0 ? { names: ['officina'], mood: 'officina' } : { names: ['soppalco'], mood: 'officina' };
      case 'chiesa': return P(['navata', 'sagrestia', 'bagno'], ['cantoria'], ['campanile']);
      case 'cinema': return { names: ['sala_cinema', 'atrio', 'cabina', 'bagno'], mood: 'cinema' };
      case 'sala_giochi': return { names: ['sala_giochi', 'retro', 'bagno', 'magazzino'], mood: 'sala_giochi' };
      case 'biblioteca': return P(['lettura', 'scaffali', 'archivio', 'bagno'], ['scaffali', 'archivio', 'lettura', 'bagno']);
      case 'circolo': return P(['circolo', 'bar_circolo', 'biliardo', 'bagno'], ['sala_riunioni', 'archivio', 'bagno', 'ufficio']);
      case 'scuola': return P(['aula', 'corridoio', 'aula', 'bagno'], ['aula', 'presidenza', 'aula', 'bagno']);
      case 'teatro': return P(['platea', 'quinte', 'camerino', 'bagno'], ['galleria', 'camerino', 'archivio', 'bagno']);
      case 'palestra': return f === 0 ? { names: ['palestra', 'spogliatoio', 'bagno', 'ufficio'], mood: 'palestra' } : { names: ['palestra', 'spogliatoio', 'bagno', 'ripostiglio'], mood: 'palestra' };
      case 'fabbrica': return P(['reparto', 'magazzino', 'bagno'], ['uffici', 'archivio', 'bagno']);
      case 'fabbro': return f === 0 ? { names: ['forgia', 'magazzino', 'retro', 'bagno'], mood: kind } : up();
      case 'falegnameria': return f === 0 ? { names: ['laboratorio', 'magazzino', 'retro', 'bagno'], mood: kind } : up();
      case 'macelleria': return f === 0 ? { names: ['macelleria', 'macello', 'cella_frigo', 'bagno'], mood: kind } : up();
      case 'emporio': return P(['emporio', 'magazzino', 'ufficio', 'bagno'], ['magazzino', 'ufficio', 'archivio', 'bagno']);
      case 'fruttivendolo': return f === 0 ? { names: ['fruttivendolo', 'magazzino', 'retro', 'bagno'], mood: kind } : up();
      case 'video': return f === 0 ? { names: ['videoteca', 'radio_r', 'magazzino', 'bagno'], mood: kind } : up();
      case 'cantina': return f === 0 ? { names: ['cantina_r', 'magazzino', 'retro', 'bagno'], mood: kind } : up();
      case 'banca': return P(['sportelli', 'caveau', 'ufficio', 'bagno'], ['ufficio', 'archivio', 'bagno', 'ufficio']);
      case 'ufficio': return P(['ingresso_uff', 'ufficio', 'ufficio', 'archivio'], ['ufficio', 'ufficio', 'archivio', 'bagno']);
      case 'tipografia': return f === 0 ? { names: ['tipografia', 'magazzino', 'ufficio', 'bagno'], mood: 'tipografia' } : up();
      case 'barbiere': case 'tabacchi': case 'farmacia': case 'lavanderia': case 'sartoria': case 'ferramenta':
        return f === 0 ? { names: [kind, kind === 'sartoria' ? 'prova' : 'retro', 'magazzino', 'bagno'], mood: kind } : up();
      case 'panetteria': return f === 0 ? { names: ['panetteria', 'forno', 'magazzino', 'bagno'], mood: kind } : up();
      case 'pescheria': return f === 0 ? { names: ['pescheria', 'cella_frigo', 'retro', 'bagno'], mood: kind } : up();
      case 'bottega': return f === 0 ? { names: ['bottega', 'retro', 'magazzino', 'bagno'], mood: 'bottega' } : up();
      default: return f === 0 ? { names: ['bottega', 'retro', 'magazzino', 'bagno'], mood: kind } : up();   // [soldi] le botteghe nuove (Emporio, macelleria, fabbro…)
    }
  }
  // ---------------------------------------------------------------------------------------------------------------
  // INGOMBRI: [larghezza lungo il muro, profondità, solido]. Modelli del kit a scala 2; ia_* e st_* fatti a mano.
  // ---------------------------------------------------------------------------------------------------------------
  const SZ = { pv_banco_lavoro: [1.8, .7, 1], pv_banco_vendita: [2, .68, 1], pv_ponte: [2, 4, 0], pv_attrezzi: [.64, .54, 1], pv_pneumatici: [.7, .7, 0], loungeSofa: [2, .85, 1], loungeSofaLong: [2.6, .85, 1], tableCoffee: [1.3, .8, 0], cabinetTelevision: [1.6, .5, 1], televisionVintage: [.8, .5, 0], lampRoundFloor: [.4, .4, 0], bookcaseOpen: [.8, .5, 1], bookcaseOpenLow: [.8, .5, 1], bookcaseClosedWide: [1.6, .5, 1],
    pottedPlant: [.5, .5, 0], plantSmall1: [.4, .4, 0], rugRectangle: [3.1, 1.8, 0], rugRound: [1.8, 1.8, 0], kitchenCabinet: [.9, .9, 1], kitchenCabinetDrawer: [.9, .9, 1], kitchenSink: [.9, .9, 1], kitchenStove: [.9, .9, 1], kitchenFridge: [.9, .6, 1],
    table: [1.7, .9, 1], tableRound: [1.4, 1.6, 1], tableCloth: [1.7, .9, 1], chair: [.45, .45, 0], chairCushion: [.45, .45, 0], bedDouble: [1.9, 2.3, 1], bedSingle: [1.15, 2.3, 1], sideTable: [1.05, .45, 0], coatRackStanding: [.55, .55, 0],
    toilet: [.65, .95, 1], bathroomSink: [.7, .6, 0], bathtub: [2.4, 1.1, 1], shower: [.95, .95, 1], desk: [1.45, .8, 1], chairDesk: [.65, .6, 0], radio: [.65, .2, 0], cardboardBoxClosed: [.45, .45, 0], washer: [.8, .8, 1],
    kitchenBar: [.9, .45, 1], rc_screen: [5.6, .5, 1], rc_seat: [.65, .6, 1], rc_cinecamera: [1, 1, 1], rc_glove: [.4, .4, 0],
    'fx_machine': [2.4, 3, 1], 'fx_conveyor-long': [2, 4, 1], 'fx_robot-arm-a': [2, 2, 1], 'fx_hopper-round': [2.2, 2.2, 1], 'fx_box-large': [2.2, 2, 1], 'fx_box-small': [1, 1, 0], 'fx_scanner-high': [1, 3.6, 1], 'fx_screen-wide': [2.4, 1, 0], 'fx_pipe-large-long': [2, 4, 1],
    'ar_arcade-machine': [1, 1.4, 1], 'ar_pinball': [1.3, 1.9, 1], 'ar_claw-machine': [1.7, 1.7, 1], 'ar_air-hockey': [2.5, 1.8, 1], 'ar_dance-machine': [1.8, 2.5, 1], 'ar_gambling-machine': [1.3, 1.2, 1], 'ar_basketball-game': [1.6, 2.5, 1], 'ar_prizes': [2, 1, 1], 'ar_cash-register': [1.1, .6, 0], 'ar_vending-machine': [1.3, 1.2, 1],
    'fd_loaf-baguette': [.5, .2, 0], fd_bread: [.3, .3, 0], fd_croissant: [.3, .3, 0], fd_cake: [.5, .5, 0], 'fd_wine-red': [.15, .15, 0], 'fd_glass-wine': [.15, .15, 0], 'fd_cup-coffee': [.15, .15, 0], fd_fish: [.2, .4, 0], fd_barrel: [.85, .85, 1], fd_cheese: [.4, .4, 0], fd_pizza: [.4, .4, 0], stoolBar: [.55, .5, 0], speaker: [.3, .3, 0], kitchenCoffeeMachine: [.4, .5, 0], trashcan: [.45, .45, 0], loungeChair: [1, .85, 1], bench: [.8, .4, 0], computerScreen: [.8, .2, 0],
    // postazioni di oggetti.js
    st_forno: [1.6, 1.2, 1], st_forgia: [1.4, 1, 1], st_saldatrice: [.8, .6, 1], st_banco_lavoro: [1.8, .8, 1], st_banco_falegname: [2, .8, 1], st_banco_macellaio: [1.6, .8, 1], st_macchina_cucire: [1, .6, 1], st_ciclostile: [1, .7, 1], st_banco_radio: [1.4, .7, 1], st_camera_oscura: [1.4, .7, 1], st_tavolo_medico: [1.9, .8, 1], st_alambicco: [.9, .9, 1], st_cassetta: [.6, .35, 0], st_cassaforte: [.8, .7, 1], st_rastrelliera: [1.4, .5, 1],
    // fatti a mano (interni_arte.js)
    st_stufa: [.8, .8, 1], ia_stenka: [2.6, .5, 1], ia_credenza: [1.6, .5, 1], ia_armadio: [1.2, .6, 1], ia_castello: [1, 2.1, 1], ia_branda: [.8, 1.95, 1], ia_materasso: [1, 1.95, 0], ia_legna: [.9, .5, 0], ia_secchio_carbone: [.4, .4, 0],
    ia_tv: [.8, .5, 0], ia_tavolino: [1.1, .8, 1], ia_tavolino_tondo: [.8, .8, 1], ia_radio_grande: [1.1, .45, 1], ia_pila_libri: [.4, .4, 0], ia_bottiglie: [.45, .35, 0], ia_casse: [1, .8, 1], ia_sacchi: [1.1, .7, 0], ia_bucato: [1.3, .5, 0],
    ia_stivali: [.4, .3, 0], ia_valigia: [.7, .3, 0], ia_giornali: [.45, .35, 0], ia_secchio: [.35, .35, 0], ia_bacinella: [.6, .45, 0], ia_gatto: [.5, .3, 0], ia_biliardo: [2.6, 1.5, 1], ia_jukebox: [.9, .6, 1], ia_poltrona_barbiere: [.8, 1, 1],
    ia_schedario: [.55, .65, 1], ia_bandiera: [.8, .4, 0], ia_busto: [.6, .6, 1], ia_vetrina_frigo: [1.6, .8, 1], ia_scaffale_merci: [1.6, .45, 1], ia_cassette_frutta: [1.3, .6, 0], ia_panca_sauna: [2.2, .7, 1], ia_altare: [2, 1, 1], ia_candelabro: [.4, .4, 0],
    ia_confessionale: [1.3, 1, 1], ia_palco: [5, 2.2, 1], ia_leggio: [.6, .5, 0], ia_pianoforte: [1.5, .65, 1], ia_banco_scuola: [.9, .6, 1], ia_letto_ospedale: [1, 2.1, 1], ia_quadro_comandi: [2, .7, 1], ia_armadietti: [1.5, .5, 1], ia_bidone: [.65, .65, 1],
    ia_lanterna_faro: [2.2, 2.2, 1], ia_scaffale_bottiglie: [2.2, .35, 1], ia_scaffale_metallo: [2.4, .6, 1], ia_barca: [2.4, 6, 1], ia_telo: [2.6, 3.6, 1], ia_macerie: [1.2, 1, 0], ia_cavalletto: [.7, .7, 0], ia_tele: [.8, .3, 0], ia_vetrina: [1.4, .7, 1],
    ia_consolle_dj: [1.8, .8, 1], ia_tavolo_lungo: [3.2, .9, 1], ia_panca_lunga: [3, .4, 0], ia_cesto: [.5, .5, 0], ia_sedia_rotta: [.6, .6, 0], ia_sacco_boxe: [.6, .6, 0], ia_pesi: [1.4, .6, 0], ia_ring: [4, 4, 0], ia_lettino: [.8, 1.9, 1], ia_cassapanca: [1.2, .5, 1],
    ia_frigo_vecchio: [.8, .65, 1], ia_cucina_gas: [.8, .6, 1], ia_lavello: [1.2, .6, 1], ia_tinozza: [1.2, .8, 0], ia_focolare: [1.8, .9, 1], ia_botti: [1.8, .8, 1], ia_bancone_bar: [.9, .6, 1], ia_poltrona: [.9, .85, 1], ia_divano: [2.1, .9, 1], ia_mobile_radio: [.9, .45, 1],
    ia_ciclostile_vecchio: [.8, .6, 1], ia_cassetta_posta: [1.4, .3, 0], ia_bici: [1.7, .5, 0], ia_carrozzina: [.8, .5, 0], ia_ricetrasmittente: [1.4, .65, 1], ia_mappa_tavolo: [2.2, 1.4, 1], ia_scrivania_grande: [2.2, 1, 1], ia_lampadario_pavimento: [.4, .4, 0], ia_panca_chiesa: [2, .55, 1], ia_pista: [5, 4, 0],
  };
  // piccole cose che stanno SOPRA i mobili (si appoggiano con l'altezza h)
  const SMALL = { ia_samovar: 1, ia_moka: 1, ia_macchina_scrivere: 1, ia_telefono: 1, ia_lampada_tavolo: 1, ia_pila_carte: 1, ia_giradischi: 1, ia_bilancia: 1, ia_candela: 1, ia_posacenere: 1, ia_bicchieri: 1, ia_radiolina: 1, ia_vaso: 1, ia_carte_gioco: 1, ia_pane: 1, ia_pesce: 1, ia_libro: 1, ia_teschio_bue: 1 };
  // roba appesa ai muri esterni: [larghezza, altezza dal pavimento (centro), bassa: va anche sui muri interni]
  const DECOR = { ia_ritratto: [.9, 1.85], ia_manifesto: [.8, 1.6], ia_tappeto_muro: [2, 1.55], ia_calendario: [.4, 1.5], ia_orologio: [.4, 2.1], ia_specchio: [.6, 1.55], ia_mensola: [1, 1.7], ia_quadro: [.8, 1.65],
    ia_foto: [.9, 1.6], ia_icona: [.5, 1.9], ia_crocifisso: [.4, 1.95], ia_mappa: [1.4, 1.6], ia_bandiera_muro: [1.2, 1.8], ia_lavagna: [2, 1.4], ia_termosifone: [1, .45, 1], ia_appendiabiti: [1, 1.6], ia_reti: [1.6, 1.6],
    ia_insegna_neon: [1.4, 1.9], ia_tv_muro: [.7, 2.15], ia_volantini: [.8, 1.45], ia_menu: [.7, 1.6], ia_bacheca: [1.2, 1.55], ia_cassette_posta: [1.2, 1.3], ia_gancio_carne: [1.4, 1.9], ia_attrezzi_muro: [1.5, 1.5], ia_poster_film: [.7, 1.65],
    ia_poster_disco: [.8, 1.6], ia_specchio_bar: [1.6, 1.7], ia_quadro_elettrico: [.6, 1.6], ia_estintore: [.3, .4, 1], ia_trofei: [1.2, 1.9], ia_salami: [1.2, 2], ia_mensola_alta: [1.4, 2.1], ia_altoparlante: [.4, 2.3], ia_spioncino: [.3, 1.5],
    ia_scritta_risacca: [1.4, 1.2], ia_stella_regime: [.8, 2.1], ia_lampada_muro: [.3, 1.9], ia_ventaglio_carte: [.6, 1.5], ia_tabella_turni: [.8, 1.5], ia_schermo_radar: [1, 1.5], ia_pannello_strumenti: [1.6, 1.5] };

  // ---------------------------------------------------------------------------------------------------------------
  // GRUPPI: mobili che stanno insieme. [id, x lungo il muro, y dal muro verso il centro, rotazione, h (sopra un mobile)]
  // rotazione 0 = guarda verso la stanza; '?' davanti all'id = c'è una volta su due.
  // ---------------------------------------------------------------------------------------------------------------
  const V = {
    pranzo: [2.4, 2.5, [['table', 0, 1.25, 0], ['chair', -.45, .6, 0], ['chair', .45, .6, 0], ['chair', -.45, 1.9, PI], ['chair', .45, 1.9, PI], ['?ia_samovar', .35, 1.2, 0, .76], ['?ia_vaso', -.3, 1.3, 0, .76]]],
    pranzo_piccolo: [1.9, 1.7, [['ia_tavolino', 0, .55, 0], ['chair', -.75, .65, PI / 2], ['chair', .75, .65, -PI / 2], ['?ia_moka', .1, .5, 0, .74], ['?ia_posacenere', -.25, .55, 0, .74]]],
    cucina_linea: [3.7, .95, [['kitchenFridge', -1.4, .3, 0], ['kitchenStove', -.45, .45, 0], ['kitchenSink', .45, .45, 0], ['kitchenCabinet', 1.35, .45, 0], ['?ia_moka', -.4, .35, 0, .92]]],
    cucina_corta: [2.75, .95, [['kitchenStove', -.9, .45, 0], ['kitchenSink', 0, .45, 0], ['kitchenCabinet', .9, .45, 0]]],
    cucina_povera: [2.2, .7, [['ia_cucina_gas', -.55, .3, 0], ['ia_lavello', .5, .3, 0], ['?ia_moka', -.6, .3, 0, .82]]],
    angolo_stufa: [2.3, 1.8, [['st_stufa', 0, .45, 0], ['ia_legna', 1.0, .3, 0], ['?ia_secchio_carbone', -.75, .25, 0], ['chair', .25, 1.45, PI + .5]]],
    divano: [2.9, 2.3, [['loungeSofa', 0, .45, 0], ['rugRectangle', 0, 1.35, 0], ['tableCoffee', 0, 1.5, 0], ['?lampRoundFloor', 1.3, .25, 0], ['?ia_posacenere', .2, 1.5, 0, .38]]],
    divano_vecchio: [2.6, 1.9, [['ia_divano', 0, .45, 0], ['ia_tavolino', 0, 1.45, 0], ['?ia_giornali', -.25, 1.45, 0, .74]]],
    tv: [1.8, 2.5, [['ia_tv', 0, .3, 0], ['ia_poltrona', 0, 2.05, PI]]],
    radiogrammofono: [2, 1.8, [['ia_radio_grande', 0, .25, 0], ['ia_poltrona', .2, 1.35, PI + .3]]],
    letto2: [3.6, 2.4, [['bedDouble', 0, 1.15, 0], ['sideTable', -1.35, .25, 0], ['sideTable', 1.35, .25, 0], ['?ia_lampada_tavolo', -1.35, .22, 0, .55], ['?ia_radiolina', 1.35, .22, 0, .55]]],
    letto1: [2.2, 2.3, [['bedSingle', -.45, 1.15, 0], ['sideTable', .75, .25, 0], ['?ia_lampada_tavolo', .75, .22, 0, .55]]],
    letto_ferro: [2, 2, [['ia_lettino', -.4, 1, 0], ['?ia_valigia', .6, .3, 0], ['?ia_secchio', .7, 1.2, 0]]],
    castello: [1.3, 2.15, [['ia_castello', 0, 1.05, 0]]],
    branda: [1.8, 2, [['ia_branda', -.4, 1, 0], ['?ia_casse', .55, .45, 0], ['?ia_bottiglie', .55, 1.25, 0]]],
    materassi: [2.4, 2.05, [['ia_materasso', -.6, 1, 0], ['ia_materasso', .6, 1, 0], ['?ia_candela', 0, .2, 0]]],
    scrivania: [1.7, 1.5, [['desk', 0, .4, 0], ['chairDesk', 0, 1.1, PI], ['?ia_lampada_tavolo', .5, .25, 0, .75], ['?ia_pila_carte', -.35, .35, 0, .75]]],
    scrittoio: [1.7, 1.5, [['desk', 0, .4, 0], ['chairDesk', 0, 1.1, PI], ['ia_macchina_scrivere', 0, .4, 0, .75], ['ia_pila_carte', .5, .3, 0, .75], ['?ia_posacenere', -.5, .3, 0, .75]]],
    lettura: [1.9, 1.6, [['ia_poltrona', 0, .55, 0], ['lampRoundFloor', .8, .25, 0], ['?ia_pila_libri', -.75, .3, 0]]],
    ufficio_t: [1.7, 2.3, [['chairDesk', 0, .35, 0], ['desk', 0, 1.05, PI], ['ia_telefono', -.45, 1.05, 0, .75], ['?ia_lampada_tavolo', .5, 1.0, 0, .75], ['?ia_pila_carte', .1, 1.1, 0, .75], ['chair', 0, 1.85, PI]]],
    bancone: [3.8, 2.6, [['ia_scaffale_bottiglie', 0, .2, 0], ['ia_bancone_bar', -1.35, 1.25, 0], ['ia_bancone_bar', -.45, 1.25, 0], ['ia_bancone_bar', .45, 1.25, 0], ['ia_bancone_bar', 1.35, 1.25, 0], ['kitchenCoffeeMachine', -1.2, 1.2, 0, 1.0], ['?ia_bicchieri', .5, 1.2, 0, 1.0], ['ar_cash-register', 1.2, 1.2, 0, 1.0], ['stoolBar', -1.1, 2.0, PI], ['stoolBar', 0, 2.0, PI], ['stoolBar', 1.1, 2.0, PI]]],
    bancone_corto: [2.8, 2.4, [['ia_scaffale_bottiglie', 0, .2, 0], ['ia_bancone_bar', -.9, 1.2, 0], ['ia_bancone_bar', 0, 1.2, 0], ['ia_bancone_bar', .9, 1.2, 0], ['kitchenCoffeeMachine', -.8, 1.15, 0, 1.0], ['ar_cash-register', .8, 1.15, 0, 1.0], ['stoolBar', -.5, 1.95, PI], ['stoolBar', .5, 1.95, PI]]],
    tavolino: [1.8, 1.8, [['ia_tavolino_tondo', 0, .9, 0], ['chair', 0, .2, 0], ['chair', 0, 1.6, PI], ['?chair', -.75, .9, PI / 2], ['?ia_bicchieri', .1, .9, 0, .74], ['?ia_posacenere', -.15, .85, 0, .74]]],
    tavolata: [3.4, 1.9, [['ia_tavolo_lungo', 0, .95, 0], ['chair', -1.1, .3, 0], ['chair', 0, .3, 0], ['chair', 1.1, .3, 0], ['chair', -1.1, 1.6, PI], ['chair', 0, 1.6, PI], ['chair', 1.1, 1.6, PI], ['?ia_bicchieri', .4, .95, 0, .76], ['?ia_pane', -.6, .9, 0, .76]]],
    mensa: [3.4, 1.5, [['ia_tavolo_lungo', 0, .75, 0], ['ia_panca_lunga', 0, .1, 0], ['ia_panca_lunga', 0, 1.4, PI]]],
    biliardo: [3.6, 2.6, [['ia_biliardo', 0, 1.3, 0]]],
    carte: [2.2, 2.2, [['tableRound', 0, 1.1, 0], ['chair', 0, .2, 0], ['chair', 0, 2.0, PI], ['chair', -.95, 1.1, PI / 2], ['chair', .95, 1.1, -PI / 2], ['ia_carte_gioco', 0, 1.1, 0, .76], ['?ia_posacenere', .3, 1.0, 0, .76], ['?ia_bottiglie', .9, 1.9, 0]]],
    interrogatorio: [1.9, 2.2, [['table', 0, 1.1, 0], ['chair', 0, .4, 0], ['chair', 0, 1.8, PI], ['ia_lampada_tavolo', 0, 1.1, 0, .76], ['?ia_posacenere', .4, 1.1, 0, .76]]],
    lavatoio: [2, 1.5, [['washer', -.5, .4, 0], ['ia_bacinella', .5, .3, 0], ['?ia_bucato', 0, 1.15, 0]]],
    barbiere_post: [1.5, 1.6, [['bathroomSink', 0, .3, 0], ['ia_poltrona_barbiere', 0, 1.0, PI]]],
    sauna: [2.4, 2.4, [['ia_panca_sauna', 0, .35, 0], ['ia_panca_sauna', 0, 1.45, 0], ['?ia_secchio', .9, 2.1, 0]]],
    focolare: [2.2, 2, [['ia_focolare', 0, .45, 0], ['ia_legna', .85, 1.2, 0], ['chair', -.6, 1.5, PI + .4]]],
    radio_regime: [2, 1.5, [['ia_ricetrasmittente', 0, .35, 0], ['chairDesk', 0, 1.1, PI]]],
    comando: [2.6, 3, [['ia_bandiera', -1, .25, 0], ['ia_busto', 1, .3, 0], ['ia_scrivania_grande', 0, 1.3, PI], ['chairDesk', 0, .55, 0], ['ia_telefono', -.6, 1.3, 0, .78], ['ia_lampada_tavolo', .7, 1.3, 0, .78], ['chair', -.5, 2.25, PI], ['chair', .5, 2.25, PI]]],
    pittore: [2.2, 1.8, [['ia_cavalletto', 0, 1.1, PI + .3], ['ia_tele', -.8, .2, 0], ['?chair', .7, 1.4, PI]]],
    ospedale: [1.3, 2.2, [['ia_letto_ospedale', 0, 1.05, 0]]],
    banchi: [2.4, 1.5, [['ia_banco_scuola', -.6, .6, PI], ['ia_banco_scuola', .6, .6, PI]]],
    altare: [3, 1.8, [['ia_altare', 0, .6, 0], ['ia_candelabro', -1.2, .4, 0], ['ia_candelabro', 1.2, .4, 0]]],
    pianoforte: [2, 1.5, [['ia_pianoforte', 0, .35, 0], ['ia_sedia_rotta', 0, 1.05, PI]]],
    dj: [2.4, 1.4, [['speaker', -1, .3, 0], ['ia_consolle_dj', 0, .5, 0], ['speaker', 1, .3, 0]]],
    cassa: [2.2, 1.3, [['pv_banco_vendita', 0, .55, 0]]],
    gelati: [2.2, 1.2, [['ia_vetrina_frigo', 0, .5, 0]]],
  };
  // ---------------------------------------------------------------------------------------------------------------
  // LE STANZE: [pavimento, pareti, luce, cose]
  // cose: 'id' contro un muro · '@gruppo' contro un muro (a|b: il primo che ci sta) · '*id' o '*@gruppo' in mezzo
  //       '~id' per terra, dove capita · '^id' appeso a un muro esterno · '?' una volta su due, '??' una su tre
  // pavimenti: parquet spina linoleum scacchi piastrelle piastrelle_b graniglia cotto cemento assi moquette_r moquette_b marmo terra gomma
  // pareti: fiori righe rombi verde blu ocra rosso crema piastrelle calce mattoni cemento legno velluto nero ospedale rosa perline
  // luci: bulbo lampadario neon neon_rosa candela spenta verde rossa fuoco disco
  // ---------------------------------------------------------------------------------------------------------------
  const R = {
    // --- case ---
    soggiorno: ['spina', 'fiori|righe|rombi', 'lampadario', ['!@divano|@divano_vecchio', 'ia_stenka|ia_credenza', '@tv|@radiogrammofono', '?@angolo_stufa', '?pottedPlant', '^ia_tappeto_muro', '^ia_orologio', '?^ia_foto', '??^ia_ritratto', '^ia_termosifone', '?~ia_gatto', '?~ia_giornali']],
    cucina: ['linoleum|scacchi|piastrelle', 'piastrelle|verde', 'bulbo', ['!@cucina_linea|@cucina_corta|@cucina_povera', '@pranzo|@pranzo_piccolo', '?ia_credenza', '^ia_calendario', '?^ia_mensola', '?^ia_orologio', '?~ia_secchio', '??~ia_bottiglie', '?~ia_cesto']],
    camera: ['parquet|spina', 'fiori|righe|rombi|ocra', 'lampadario', ['!@letto2|@letto1|@letto_ferro', 'ia_armadio|bookcaseClosedWide', '?ia_cassapanca', '?coatRackStanding', '^ia_tappeto_muro|^ia_quadro', '?^ia_icona|^ia_foto', '^ia_termosifone', '?~ia_valigia', '?rugRound']],
    cameretta: ['parquet|linoleum', 'righe|blu|rombi', 'bulbo', ['@castello|@letto1', '@scrivania|@letto1', 'ia_armadio', '?^ia_poster_film|^ia_manifesto', '^ia_calendario', '?~ia_pila_libri', '?~ia_valigia']],
    bagno: ['piastrelle|piastrelle_b', 'piastrelle', 'bulbo', ['toilet', 'bathroomSink', 'bathtub|shower|ia_tinozza', '?washer', '^ia_specchio', '?~ia_secchio', '?~ia_bacinella']],
    ripostiglio: ['cemento|assi', 'calce|cemento', 'bulbo', ['?st_cassetta', 'pv_banco_lavoro|bookcaseOpenLow', 'cardboardBoxClosed', 'cardboardBoxClosed', '?washer', '?ia_bici', '~ia_legna', '?~ia_secchio_carbone', '?~ia_sacchi', '^ia_attrezzi_muro|^ia_appendiabiti']],
    salotto_buono: ['spina|parquet', 'fiori|velluto|rombi', 'lampadario', ['ia_stenka', '@divano', '@radiogrammofono|@tv', 'ia_credenza', '?@pianoforte', '?pottedPlant', '^ia_tappeto_muro', '^ia_foto', '^ia_orologio', '?^ia_icona', '^ia_termosifone', '?~ia_gatto']],
    dispensa: ['cotto|cemento', 'calce', 'bulbo', ['bookcaseOpen', 'bookcaseOpen', 'ia_sacchi', '?fd_barrel', '?ia_cesto', '^ia_mensola', '^ia_mensola_alta', '?^ia_salami', '~ia_bottiglie']],
    stanza_chiusa: ['parquet', 'fiori', 'spenta', ['ia_telo', 'ia_armadio', '?ia_valigia', '~ia_valigia', '~ia_giornali', '^ia_foto', '^ia_quadro']],
    cucina_abitabile: ['linoleum|cotto', 'verde|blu|ocra', 'bulbo', ['!@cucina_povera|@cucina_corta', '!@angolo_stufa|st_stufa', '@pranzo_piccolo', '?ia_frigo_vecchio', '?ia_credenza', '^ia_calendario', '?^ia_ritratto', '?^ia_mensola', '~ia_bottiglie', '?~ia_stivali', '?~ia_secchio']],
    camera_spoglia: ['assi|linoleum', 'calce|verde', 'bulbo', ['!@letto_ferro|@branda', 'ia_armadio', '?chair', '^ia_calendario', '?^ia_appendiabiti', '~ia_bottiglie', '?~ia_stivali', '?~ia_giornali']],
    stanza_vuota: ['assi', 'calce', 'spenta', ['~cardboardBoxClosed', '~ia_sedia_rotta', '?~ia_bottiglie', '?~ia_giornali']],
    rimessa_reti: ['cemento|assi', 'calce|blu', 'bulbo', ['ia_casse', 'fd_barrel', '?pv_banco_lavoro', '~ia_stivali', '~ia_secchio', '?~ia_bottiglie', '^ia_reti', '^ia_appendiabiti', '?^ia_mappa']],
    studio_libri: ['spina|parquet', 'crema|ocra|rombi', 'lampadario', ['bookcaseOpen', 'bookcaseOpen', 'bookcaseOpen', '@scrittoio', '@lettura', '?@radiogrammofono', '~ia_pila_libri', '~ia_pila_libri', '?~ia_bottiglie', '^ia_quadro', '?^ia_mappa', '^ia_termosifone', '??^ia_volantini']],
    atelier: ['assi|cemento', 'calce', 'bulbo', ['@pittore', 'ia_tele', 'ia_tele', '?ia_materasso', '?bookcaseOpenLow', '~ia_bottiglie', '~ia_secchio', '~ia_giornali', '^ia_quadro', '^ia_quadro', '?^ia_scritta_risacca']],
    sala_pranzo: ['spina', 'velluto|fiori', 'lampadario', ['*@pranzo', 'ia_credenza', 'ia_credenza', '?pottedPlant', '^ia_ritratto', '^ia_quadro', '^ia_orologio', '^ia_termosifone']],
    studio: ['parquet|spina', 'legno|crema', 'lampadario', ['@scrivania|@scrittoio', 'bookcaseClosedWide', 'bookcaseOpen', 'ia_schedario', '?@lettura', '?ia_bandiera', '^ia_ritratto', '^ia_mappa', '?^ia_calendario']],
    corridoio_k: ['linoleum|assi', 'verde|ocra', 'bulbo', ['coatRackStanding', '?ia_bici', '?ia_carrozzina', '~ia_stivali', '~ia_secchio', '^ia_appendiabiti', '^ia_tabella_turni', '^ia_quadro_elettrico', '?^ia_calendario']],
    stanza_fam: ['parquet|linoleum', 'fiori|righe|rombi', 'bulbo', ['!@letto2|@letto1|@castello|@letto_ferro', 'ia_armadio', '@pranzo_piccolo|ia_tavolino', '?ia_tv', '?ia_cassapanca', '^ia_tappeto_muro', '?^ia_foto', '^ia_termosifone', '?~ia_valigia', '?~ia_bucato']],
    cucina_comune: ['linoleum|scacchi', 'verde|piastrelle', 'neon', ['@cucina_povera', '@cucina_povera|ia_cucina_gas', 'ia_cucina_gas', 'ia_frigo_vecchio', '*ia_tavolo_lungo|*@pranzo', '^ia_mensola', '^ia_mensola', '^ia_tabella_turni', '?~ia_bucato', '~ia_secchio', '~ia_bottiglie']],
    cucina_focolare: ['cotto|terra', 'calce|mattoni', 'fuoco', ['!@focolare|ia_focolare', '@pranzo|ia_tavolo_lungo', 'ia_credenza', '?fd_barrel', '?ia_cesto', '^ia_salami', '^ia_mensola', '?^ia_icona', '~ia_legna', '~ia_cesto', '?~ia_gatto']],
    granaio: ['assi', 'mattoni|calce', 'spenta', ['ia_sacchi', 'ia_sacchi', 'ia_sacchi', 'fd_barrel', 'ia_casse', '~ia_cesto', '~ia_sacchi']],
    magazzino_sale: ['cemento', 'calce', 'bulbo', ['ia_sacchi', 'ia_sacchi', 'ia_sacchi', 'ia_casse', '~ia_secchio', '^ia_attrezzi_muro']],
    rudere: ['terra|assi', 'mattoni|calce', 'spenta', ['~ia_macerie', '~ia_macerie', '?~ia_sedia_rotta', '?~ia_bottiglie', '??@materassi', '??~ia_candela', '?^ia_scritta_risacca']],
    androne: ['graniglia|scacchi', 'verde|blu|ocra', 'neon', ['?ia_bici', '?ia_carrozzina', '^ia_cassette_posta', '^ia_bacheca', '^ia_manifesto', '^ia_quadro_elettrico', '?^ia_volantini', '~ia_secchio', '?~ia_giornali']],
    portineria: ['linoleum', 'verde|crema', 'bulbo', ['@scrivania', '@tv', '?st_stufa', 'bookcaseOpenLow', '^ia_calendario', '^ia_ritratto', '^ia_bacheca', '~ia_gatto']],
    cantine: ['cemento', 'mattoni|cemento', 'bulbo', ['ia_casse', 'cardboardBoxClosed', 'ia_bici', 'fd_barrel', '~ia_legna', '~ia_secchio_carbone', '~ia_sacchi', '~ia_bottiglie']],
    mansarda: ['parquet|assi', 'fiori|righe|calce', 'bulbo', ['!@letto2|@letto1', '?@castello', '@scrivania|@lettura', 'ia_armadio', '?ia_cassapanca', '?@angolo_stufa', '?ia_bucato', '?rugRound', '^ia_tappeto_muro', '^ia_foto', '^ia_termosifone', '~ia_valigia', '?~ia_giornali', '?~ia_gatto', '?~cardboardBoxClosed']],
    monolocale: ['parquet|linoleum', 'fiori|verde|righe', 'bulbo', ['!@letto2|@letto1|@letto_ferro', '!@cucina_corta|@cucina_povera', '@pranzo_piccolo', '?@angolo_stufa', 'ia_armadio', '?ia_tv', '^ia_tappeto_muro', '^ia_calendario', '^ia_termosifone', '?~ia_bucato', '~ia_secchio', '?~ia_bottiglie']],
    mono_anziana: ['spina|parquet', 'fiori', 'lampadario', ['@letto1', '@radiogrammofono', '@cucina_povera', '@pranzo_piccolo', 'ia_credenza', '^ia_icona', '^ia_foto', '^ia_tappeto_muro', '^ia_orologio', '~ia_gatto']],
    mono_artista: ['assi', 'calce', 'bulbo', ['@pittore', '@materassi|ia_materasso', '@cucina_povera', 'bookcaseOpen', '~ia_bottiglie', '~ia_pila_libri', '~ia_tele', '^ia_quadro', '^ia_quadro', '?^ia_scritta_risacca']],
    casa_contadina: ['cotto', 'calce|mattoni', 'fuoco', ['@focolare', '@letto2|@letto1', '@pranzo|@pranzo_piccolo', 'ia_credenza', '^ia_salami', '^ia_icona', '~ia_legna', '~ia_cesto', '?~ia_gatto']],
    soggiorno_cucina: ['spina|linoleum', 'fiori|righe|verde', 'lampadario', ['!@cucina_corta|@cucina_povera', '@divano|@divano_vecchio', '@pranzo|@pranzo_piccolo', '?@angolo_stufa', 'ia_credenza|ia_stenka', '^ia_tappeto_muro', '^ia_calendario', '^ia_termosifone', '?~ia_gatto']],
    // --- faro ---
    ingresso_faro: ['cemento', 'calce|mattoni', 'bulbo', ['ia_bidone', 'ia_bidone', 'ia_casse', '~ia_stivali', '^ia_appendiabiti', '^ia_reti']],
    alloggio_guardiano: ['assi', 'perline|calce', 'bulbo', ['@branda', '@angolo_stufa', '@pranzo_piccolo', '^ia_mappa', '^ia_orologio', '~ia_bottiglie']],
    deposito_olio: ['cemento', 'calce', 'bulbo', ['ia_bidone', 'ia_bidone', 'ia_bidone', 'ia_casse', '~ia_secchio']],
    stanza_radio: ['assi', 'perline', 'bulbo', ['@radio_regime', 'ia_schedario', '^ia_mappa', '^ia_calendario']],
    lanterna: ['cemento', 'calce', 'neon', ['*ia_lanterna_faro']],
    // --- bar, trattorie, svago ---
    sala_bar: ['scacchi|graniglia', 'crema|verde|rosso', 'bulbo', ['@bancone|@bancone_corto', 'kitchenStove', '*@tavolino', '*@tavolino', '?*@tavolino', '?ia_jukebox|ar_gambling-machine', '?st_stufa', '^ia_ritratto', '^ia_tv_muro', '^ia_specchio_bar', '?^ia_insegna_neon', '^ia_menu', '?^ia_calendario', '~ia_giornali']],
    retro: ['piastrelle|cemento', 'piastrelle|calce', 'neon', ['st_cassetta', '@cucina_corta|kitchenStove', 'kitchenFridge', 'cardboardBoxClosed', 'trashcan', '?pv_banco_lavoro', '~ia_casse', '~ia_bottiglie', '^ia_calendario', '^ia_mensola']],
    magazzino: ['cemento', 'cemento|calce', 'neon', ['ia_scaffale_metallo|bookcaseOpen', 'bookcaseOpen', 'ia_casse', 'cardboardBoxClosed', 'cardboardBoxClosed', '?pv_banco_lavoro', '~ia_sacchi', '~ia_casse', '^ia_quadro_elettrico']],
    sala_trattoria: ['cotto|scacchi', 'crema|ocra|mattoni', 'lampadario', ['!@cucina_corta', '*@tavolata', '*@tavolino', '?*@tavolino', '@bancone_corto|ia_credenza', 'st_stufa', '?fd_barrel', '^ia_ritratto', '^ia_menu', '^ia_salami', '?^ia_quadro', '?^ia_orologio']],
    cucina_trattoria: ['piastrelle', 'piastrelle', 'neon', ['@cucina_linea', 'kitchenStove', 'pv_banco_lavoro', '*table', '~ia_secchio', '~ia_casse', '^ia_mensola', '^ia_mensola_alta', '?^ia_salami']],
    gelateria: ['scacchi', 'rosa|azzurro', 'neon', ['@gelati', 'ar_cash-register', '*@tavolino', '?*@tavolino', 'st_stufa', '^ia_ritratto', '^ia_menu', '?^ia_insegna_neon', '~ia_secchio']],
    laboratorio_gelati: ['piastrelle', 'piastrelle', 'neon', ['kitchenFridge', 'kitchenFridge', 'pv_banco_lavoro', 'kitchenSink', '~ia_secchio']],
    banja: ['assi', 'perline', 'fuoco', ['st_stufa', '@sauna', '?ia_panca_lunga', '~ia_secchio', '~ia_secchio', '~ia_bacinella', '^ia_appendiabiti']],
    spogliatoio_banja: ['assi', 'perline', 'bulbo', ['bench', 'bench', 'ia_armadietti', '^ia_appendiabiti', '^ia_specchio', '~ia_stivali', '^ia_menu']],
    pista: ['moquette_b', 'nero', 'disco', ['!@dj', '*ia_pista', '@bancone_corto', 'ia_divano', 'ia_divano', '*@tavolino', '?*@tavolino', 'speaker', 'speaker', '?ia_jukebox', '^ia_poster_disco', '^ia_poster_disco', '^ia_insegna_neon', '^ia_specchio_bar', '~ia_bottiglie']],
    bar_disco: ['moquette_b', 'nero', 'neon_rosa', ['@bancone_corto', '*@tavolino', '?*@tavolino', '^ia_insegna_neon', '^ia_poster_disco']],
    guardaroba: ['moquette_r', 'nero|velluto', 'bulbo', ['coatRackStanding', 'coatRackStanding', 'kitchenBar', '^ia_appendiabiti', '^ia_appendiabiti']],
    hall: ['marmo|graniglia', 'crema|velluto', 'lampadario', ['@cassa', '@divano', 'ia_poltrona', 'ia_poltrona', 'pottedPlant', 'pottedPlant', '?ia_valigia', '^ia_ritratto', '^ia_orologio', '^ia_quadro', '^ia_bacheca', '?rugRectangle']],
    sala_colazioni: ['graniglia|parquet', 'crema|fiori', 'lampadario', ['*@tavolino', '*@tavolino', '?*@tavolino', 'ia_credenza', '^ia_ritratto', '^ia_quadro']],
    corridoio_h: ['moquette_r', 'righe|crema', 'bulbo', ['?pottedPlant', '?ia_carrozzina', '^ia_quadro', '^ia_estintore', '^ia_tabella_turni', '~ia_valigia']],
    stanza_h: ['moquette_r|parquet', 'fiori|righe', 'bulbo', ['@letto2|@letto1', 'ia_armadio', '?ia_poltrona', '?sideTable', '^ia_quadro', '^ia_termosifone', '?~ia_valigia', '?^ia_spioncino']],
    // --- regime, cultura, uffici ---
    salone_cultura: ['marmo|spina', 'velluto|rosso', 'lampadario', ['*ia_palco', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'ia_bandiera', 'ia_bandiera', 'ia_busto', '^ia_ritratto', '^ia_bandiera_muro', '^ia_bandiera_muro', '^ia_stella_regime', '^ia_manifesto', '^ia_altoparlante']],
    atrio: ['marmo|graniglia', 'crema|rosso', 'lampadario', ['kitchenBar', 'kitchenBar', 'ar_vending-machine', 'pottedPlant', 'pv_banco_vendita', '?ia_busto', '^ia_ritratto', '^ia_manifesto', '^ia_bacheca', '^ia_poster_film']],
    sala_riunioni: ['parquet|linoleum', 'legno|crema', 'neon', ['*ia_tavolo_lungo', 'chair', 'chair', 'chair', 'chair', 'chair', 'chair', 'ia_bandiera', '^ia_ritratto', '^ia_lavagna', '^ia_mappa', '^ia_orologio']],
    biblioteca_partito: ['parquet', 'legno', 'lampadario', ['bookcaseClosedWide', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseOpen', '*@pranzo', 'ia_busto', '^ia_ritratto', '^ia_stella_regime']],
    museo_regime: ['marmo', 'velluto|crema', 'lampadario', ['*ia_vetrina', '*ia_vetrina', 'ia_vetrina', 'ia_busto', 'ia_bandiera', '^ia_ritratto', '^ia_foto', '^ia_bandiera_muro', '^ia_mappa', '^ia_stella_regime']],
    ufficio: ['linoleum|parquet', 'crema|verde|legno', 'neon', ['?st_cassaforte', '@ufficio_t|@scrivania', 'ia_schedario', 'ia_schedario', 'bookcaseClosedWide', '?ia_cassapanca', '^ia_ritratto', '^ia_calendario', '?^ia_mappa', '^ia_termosifone', '~ia_giornali']],
    archivio: ['linoleum|cemento', 'verde|cemento', 'neon', ['bookcaseClosedWide', 'bookcaseClosedWide', 'ia_schedario', 'ia_schedario', 'ia_schedario', 'bookcaseOpen', '~cardboardBoxClosed', '~ia_pila_carte', '^ia_ritratto']],
    schedario: ['linoleum', 'verde', 'neon', ['ia_schedario', 'ia_schedario', 'ia_schedario', 'ia_schedario', 'ia_schedario', 'ia_schedario', '*@scrivania', '^ia_ritratto', '^ia_tabella_turni']],
    ingresso_caserma: ['linoleum|graniglia', 'verde|cemento', 'neon', ['@ufficio_t', 'bench', 'bench', 'ia_bandiera', '?ia_busto', '^ia_ritratto', '^ia_manifesto', '^ia_manifesto', '^ia_bacheca', '^ia_orologio', '^ia_altoparlante']],
    ufficio_t: ['linoleum', 'verde|legno', 'neon', ['@ufficio_t', 'ia_schedario', 'ia_schedario', 'bookcaseClosedWide', '?@radio_regime', '^ia_ritratto', '^ia_mappa', '^ia_calendario', '^ia_termosifone']],
    cella: ['cemento', 'cemento', 'bulbo', ['@letto_ferro|ia_branda', 'toilet', '~ia_secchio', '?^ia_scritta_risacca']],
    armeria: ['cemento', 'cemento|verde', 'neon', ['!st_rastrelliera', '!st_rastrelliera', 'ia_armadietti', 'bookcaseClosedWide', 'cardboardBoxClosed', 'cardboardBoxClosed', '~ia_casse', '^ia_attrezzi_muro', '^ia_tabella_turni']],
    interrogatorio: ['cemento', 'verde|cemento', 'bulbo', ['*@interrogatorio', '?ia_schedario', '^ia_ritratto', '^ia_orologio', '~ia_secchio']],
    camerata: ['linoleum|cemento', 'verde|calce', 'neon', ['@castello', '@castello', '@castello', '@castello|@branda', 'ia_armadietti', 'ia_armadietti', '?st_stufa', '^ia_ritratto', '^ia_tabella_turni', '^ia_appendiabiti', '~ia_stivali', '~ia_stivali', '~ia_valigia']],
    mensa_t: ['linoleum', 'verde', 'neon', ['*@mensa', '?*@mensa', '@cucina_corta', '^ia_ritratto', '^ia_manifesto', '^ia_tabella_turni']],
    comando: ['spina', 'legno|velluto', 'lampadario', ['@comando', '*ia_mappa_tavolo', 'bookcaseClosedWide', 'ia_schedario', '^ia_ritratto', '^ia_mappa', '^ia_bandiera_muro', '^ia_stella_regime', '^ia_orologio', 'rugRectangle']],
    sala_radio_t: ['linoleum', 'verde', 'neon', ['@radio_regime', 'ia_ricetrasmittente', 'ia_quadro_comandi', '^ia_schermo_radar', '^ia_mappa', '^ia_pannello_strumenti']],
    // --- lavoro ---
    hangar: ['cemento', 'cemento', 'neon', ['*ia_telo', 'ia_scaffale_metallo', 'ia_scaffale_metallo', 'pv_banco_lavoro', 'ia_bidone', 'ia_bidone', 'pv_attrezzi', '~ia_casse', '~ia_casse', '^ia_stella_regime', '^ia_estintore', '^ia_tabella_turni']],
    magazzino_porto: ['cemento', 'cemento', 'neon', ['ia_scaffale_metallo', 'ia_scaffale_metallo', 'ia_scaffale_metallo', '*ia_casse', '*ia_casse', 'ia_sacchi', 'ia_bidone', '~cardboardBoxClosed', '~ia_casse', '^ia_tabella_turni', '^ia_estintore']],
    magazzino_neri: ['cemento', 'mattoni', 'bulbo', ['ia_casse', 'ia_casse', 'ia_scaffale_metallo', '*@carte', 'ia_divano', '?ia_frigo_vecchio', '~ia_casse', '~ia_bottiglie', '~ia_bottiglie', '^ia_calendario', '^ia_ventaglio_carte']],
    ufficio_porto: ['linoleum', 'verde|legno', 'neon', ['@ufficio_t', 'ia_schedario', '^ia_mappa', '^ia_ritratto', '^ia_calendario']],
    sala_comandi: ['linoleum|cemento', 'verde', 'neon', ['ia_quadro_comandi', 'ia_quadro_comandi', 'chairDesk', 'chairDesk', 'ia_schedario', '^ia_pannello_strumenti', '^ia_ritratto', '^ia_tabella_turni', '~ia_casse']],
    spogliatoio_m: ['cemento', 'piastrelle|verde', 'neon', ['ia_armadietti', 'ia_armadietti', 'bench', 'bench', 'shower', '~ia_stivali', '~ia_stivali', '^ia_appendiabiti']],
    deposito: ['cemento', 'cemento|mattoni', 'neon', ['st_cassetta', 'cardboardBoxClosed', 'cardboardBoxClosed', 'cardboardBoxClosed', 'ia_scaffale_metallo|bookcaseOpen', 'ia_bidone', 'washer|ia_bidone', 'trashcan', 'pv_banco_lavoro', '~ia_casse', '~ia_sacchi', '^ia_tabella_turni']],
    cantiere: ['cemento|assi', 'mattoni|cemento', 'neon', ['*ia_barca', '!st_saldatrice', '!st_banco_falegname', 'pv_banco_lavoro', 'pv_banco_lavoro', 'pv_attrezzi', 'ia_bidone', '~ia_legna', '~ia_casse', '~ia_secchio', '^ia_attrezzi_muro', '^ia_reti']],
    officina: ['cemento', 'cemento', 'neon', ['!st_saldatrice', 'st_cassetta', 'pv_ponte', 'pv_ponte', 'pv_banco_lavoro', 'pv_banco_lavoro', 'pv_attrezzi', 'pv_attrezzi', 'pv_pneumatici', 'pv_pneumatici', 'cardboardBoxClosed', 'trashcan', '~ia_bidone', '^ia_attrezzi_muro', '^ia_calendario', '^ia_quadro_elettrico']],
    soppalco: ['assi', 'cemento', 'bulbo', ['cardboardBoxClosed', 'cardboardBoxClosed', 'ia_casse', '?@branda', '~ia_bottiglie']],
    reparto: ['cemento', 'cemento|verde', 'neon', ['st_cassetta', '!fx_machine', 'fx_machine', 'fx_conveyor-long', 'fx_hopper-round', 'fx_box-large', 'fx_box-small', 'fx_box-small', 'ia_bidone', '^ia_ritratto', '^ia_manifesto', '^ia_tabella_turni', '^ia_altoparlante', '~ia_casse']],
    uffici: ['linoleum', 'verde', 'neon', ['@ufficio_t', '@scrivania', 'ia_schedario', 'bookcaseClosedWide', '^ia_ritratto', '^ia_calendario']],
    // --- chiesa, scuola, cultura ---
    navata: ['cotto|marmo', 'calce|crema', 'candela', ['@altare', 'ia_confessionale', '?ia_candelabro', '^ia_icona', '^ia_icona', '^ia_crocifisso', '^ia_quadro']],
    sagrestia: ['cotto', 'calce', 'candela', ['ia_armadio', 'ia_cassapanca', '@scrivania', '^ia_crocifisso', '^ia_icona', '~ia_candela']],
    cantoria: ['assi', 'calce', 'candela', ['bench', 'bench', 'ia_pianoforte|bench', '^ia_icona', '~ia_pila_libri']],
    campanile: ['assi', 'mattoni', 'spenta', ['~ia_macerie', '~ia_casse', '?~ia_candela']],
    aula: ['linoleum|parquet', 'verde|blu', 'neon', ['desk', 'chairDesk', '*@banchi', '?*@banchi', '@banchi', '^ia_lavagna', '^ia_ritratto', '^ia_mappa', '^ia_orologio', '^ia_termosifone']],
    corridoio: ['linoleum', 'verde', 'neon', ['coatRackStanding', 'coatRackStanding', 'bench', '^ia_appendiabiti', '^ia_bacheca', '^ia_manifesto']],
    presidenza: ['parquet', 'legno', 'lampadario', ['@scrivania', 'bookcaseClosedWide', 'ia_bandiera', '^ia_ritratto', '^ia_calendario']],
    lettura: ['spina|parquet', 'legno|crema', 'lampadario', ['*@pranzo', '?*@pranzo', 'bookcaseOpen', 'bookcaseOpen', 'lampRoundFloor', '^ia_ritratto', '^ia_orologio', '^ia_mappa']],
    scaffali: ['parquet', 'legno|crema', 'bulbo', ['bookcaseOpen', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseClosedWide', 'bookcaseOpen', '~ia_pila_libri', '~ia_pila_libri', '?^ia_volantini']],
    circolo: ['cotto|graniglia', 'crema|legno', 'bulbo', ['*@carte', '?*@carte', '@tv', 'st_stufa', 'speaker', '^ia_ritratto', '^ia_bandiera_muro', '^ia_bacheca', '^ia_ventaglio_carte']],
    bar_circolo: ['graniglia', 'crema', 'bulbo', ['@bancone_corto', 'kitchenFridge', '^ia_menu', '^ia_ritratto', '~ia_casse']],
    biliardo: ['parquet|graniglia', 'verde|legno', 'verde', ['*@biliardo', 'coatRackStanding', 'chair', 'chair', '^ia_trofei', '^ia_lavagna', '~ia_bottiglie']],
    platea: ['moquette_r|parquet', 'velluto', 'lampadario', ['ia_palco', 'speaker', 'speaker', '^ia_poster_film', '^ia_ritratto']],
    galleria: ['moquette_r', 'velluto', 'bulbo', ['rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat']],
    quinte: ['assi', 'nero|mattoni', 'bulbo', ['rc_cinecamera', 'coatRackStanding', 'cardboardBoxClosed', 'ia_casse', '?ia_telo', '^ia_appendiabiti', '^ia_poster_film']],
    camerino: ['assi|parquet', 'velluto|rosa', 'lampadario', ['desk', 'chair', 'coatRackStanding', 'bathroomSink', 'ia_poltrona', '^ia_specchio', '^ia_poster_film']],
    sala_cinema: ['moquette_r', 'velluto', 'spenta', ['rc_screen', 'rc_seat', 'speaker', 'speaker']],
    cabina: ['assi', 'nero', 'rossa', ['rc_cinecamera', 'bookcaseOpen', 'cardboardBoxClosed', '^ia_poster_film', '^ia_calendario']],
    palestra: ['gomma|assi', 'blu|verde', 'neon', ['*ia_ring', 'ia_sacco_boxe', 'ia_pesi', 'bench', 'bench', 'rc_glove', '^ia_trofei', '^ia_ritratto', '^ia_manifesto', '^ia_orologio']],
    spogliatoio: ['piastrelle', 'piastrelle|verde', 'neon', ['bench', 'bench', 'shower', 'ia_armadietti', 'coatRackStanding', '~ia_stivali', '^ia_appendiabiti']],
    // --- botteghe ---
    sportelli: ['marmo', 'crema|legno', 'neon', ['!st_cassaforte', 'kitchenBar', 'kitchenBar', 'kitchenBar', 'chairDesk', 'chairDesk', 'computerScreen', 'bench', 'pottedPlant', 'ar_cash-register', '^ia_ritratto', '^ia_orologio', '^ia_bacheca']],
    caveau: ['cemento', 'cemento', 'neon', ['!st_cassaforte', '!st_cassaforte', 'bookcaseClosedWide', 'bookcaseClosedWide', 'cardboardBoxClosed', 'cardboardBoxClosed']],
    ingresso_uff: ['linoleum', 'crema|verde', 'neon', ['desk', 'chairDesk', 'ia_telefono', 'ia_poltrona', 'ia_poltrona', 'pottedPlant', 'coatRackStanding', '^ia_ritratto', '^ia_calendario']],
    tipografia: ['cemento', 'calce|cemento', 'neon', ['!st_ciclostile', 'pv_banco_lavoro', 'fx_machine', 'ia_ciclostile_vecchio', 'table', 'cardboardBoxClosed', 'cardboardBoxClosed', 'bookcaseOpen', '~ia_giornali', '~ia_giornali', '^ia_manifesto', '^ia_calendario', '^ia_quadro_elettrico']],
    barbiere: ['scacchi|piastrelle', 'piastrelle|azzurro', 'neon', ['@barbiere_post', '@barbiere_post', 'bench', 'coatRackStanding', 'ar_cash-register', '^ia_specchio', '^ia_specchio', '^ia_ritratto', '^ia_calendario', '~ia_giornali']],
    tabacchi: ['graniglia', 'crema|legno', 'neon', ['pv_banco_vendita', 'kitchenBar', 'kitchenBar', 'ar_cash-register', 'bookcaseOpen', 'ar_vending-machine', 'ar_gambling-machine', '^ia_ritratto', '^ia_manifesto', '^ia_calendario', '~ia_giornali']],
    farmacia: ['graniglia|marmo', 'ospedale|crema', 'neon', ['!st_tavolo_medico', 'pv_banco_vendita', 'bookcaseOpen', 'bookcaseOpen', 'kitchenBar', 'ia_scaffale_merci', '^ia_ritratto', '^ia_bacheca', '^ia_calendario']],
    lavanderia: ['piastrelle', 'piastrelle|azzurro', 'neon', ['washer', 'washer', 'washer', 'washer', 'bench', 'kitchenBar', 'ar_cash-register', '?@lavatoio', '~ia_bacinella', '~ia_bucato', '^ia_tabella_turni', '^ia_ritratto']],
    sartoria: ['parquet|linoleum', 'fiori|crema', 'bulbo', ['!st_macchina_cucire', '!st_macchina_cucire', 'table', 'table', 'chair', 'chair', 'coatRackStanding', 'coatRackStanding', 'bookcaseOpen', 'rugRectangle', 'pv_banco_lavoro', '^ia_specchio', '^ia_ritratto', '^ia_calendario', '~ia_cesto']],
    prova: ['parquet', 'fiori', 'lampadario', ['coatRackStanding', 'ia_poltrona', 'rugRound', '^ia_specchio', '^ia_specchio']],
    ferramenta: ['cemento|graniglia', 'calce|verde', 'neon', ['pv_banco_vendita', 'pv_banco_lavoro', 'kitchenBar', 'kitchenBar', 'ar_cash-register', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseOpenLow', 'fx_box-small', 'fx_box-small', 'cardboardBoxClosed', '^ia_attrezzi_muro', '^ia_attrezzi_muro', '^ia_ritratto', '^ia_calendario']],
    panetteria: ['graniglia', 'piastrelle|crema', 'neon', ['!st_forno', 'pv_banco_vendita', 'kitchenBar', 'kitchenBar', 'kitchenBar', 'fd_loaf-baguette', 'fd_bread', 'fd_croissant', 'fd_cake', 'ar_cash-register', 'bookcaseOpen', 'ia_scaffale_merci', '^ia_ritratto', '^ia_menu', '~ia_cesto', '~ia_sacchi']],
    forno: ['cotto', 'calce|mattoni', 'fuoco', ['!st_forno', 'pv_banco_lavoro', 'kitchenStove', 'table', 'fd_bread', 'kitchenCabinet', 'cardboardBoxClosed', 'ia_sacchi', '~ia_sacchi', '~ia_legna', '^ia_mensola']],
    pescheria: ['piastrelle', 'piastrelle', 'neon', ['pv_banco_vendita', 'kitchenBar', 'kitchenBar', 'fd_fish', 'fd_fish', 'fd_barrel', 'fd_barrel', 'ar_cash-register', 'kitchenSink', 'ia_vetrina_frigo', '^ia_reti', '^ia_ritratto', '^ia_menu', '~ia_cassette_frutta', '~ia_secchio']],
    cella_frigo: ['piastrelle', 'piastrelle', 'neon', ['kitchenFridge', 'kitchenFridge', 'fd_barrel', 'fd_barrel', '^ia_gancio_carne']],
    bottega: ['graniglia|linoleum', 'crema|verde|ocra', 'neon', ['pv_banco_vendita', 'ia_scaffale_merci', 'ia_scaffale_merci', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseOpenLow', 'cardboardBoxClosed', 'pottedPlant', '?ia_cassette_frutta', '^ia_ritratto', '^ia_calendario', '^ia_manifesto', '~ia_cassette_frutta']],
    alimentari: ['linoleum|graniglia', 'crema|verde', 'neon', ['pv_banco_vendita', 'ia_scaffale_merci', 'ia_scaffale_merci', 'ia_scaffale_merci', 'ia_vetrina_frigo', 'ia_cassette_frutta', 'ia_sacchi', '^ia_ritratto', '^ia_menu', '^ia_calendario', '~ia_cassette_frutta', '~ia_cesto']],
    cassa_benzina: ['linoleum', 'blu|crema', 'neon', ['@cassa', 'ia_scaffale_merci', 'ar_vending-machine', 'ia_bidone', '^ia_calendario', '^ia_ritratto', '^ia_mappa', '~pv_pneumatici']],
    attesa: ['linoleum', 'ospedale', 'neon', ['bench', 'bench', 'bench', 'pottedPlant', 'desk', '^ia_ritratto', '^ia_bacheca', '^ia_orologio', '^ia_manifesto']],
    visite: ['linoleum', 'ospedale', 'neon', ['!st_tavolo_medico', '@ospedale', 'desk', 'chairDesk', 'bathroomSink', 'ia_schedario', '^ia_specchio', '^ia_calendario', '^ia_ritratto']],
    corsia: ['linoleum', 'ospedale', 'neon', ['@ospedale', '@ospedale', '@ospedale', '@ospedale', 'sideTable', 'sideTable', '^ia_ritratto', '^ia_orologio', '^ia_termosifone']],
    studio_medico: ['parquet|linoleum', 'ospedale|crema', 'bulbo', ['@scrivania', 'bookcaseClosedWide', 'ia_schedario', '^ia_ritratto', '^ia_calendario']],
    videoteca: ['moquette_b', 'nero', 'neon', ['pv_banco_vendita', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseOpen', 'pv_banco_vendita', 'ia_tv', '^ia_poster_film', '^ia_poster_film', '^ia_insegna_neon']],
    sala_giochi: ['moquette_b', 'nero', 'neon_rosa', ['ar_arcade-machine', 'ar_arcade-machine', 'ar_pinball', 'ar_pinball', 'ar_claw-machine', 'ar_air-hockey', 'ar_dance-machine', 'ar_gambling-machine', 'ar_basketball-game', 'ar_prizes', 'ar_cash-register', 'ar_vending-machine', '^ia_poster_disco', '^ia_insegna_neon']],
    // --- mestieri: le postazioni (st_*) sono quelle di oggetti.js, si piazzano per prime ('!') ---
    forgia: ['cemento|terra', 'mattoni', 'fuoco', ['!st_forgia', '!st_saldatrice', '!pv_banco_lavoro', 'st_cassetta', 'ia_bidone', 'kitchenBar', 'ar_cash-register', '~ia_secchio_carbone', '~ia_legna', '^ia_attrezzi_muro', '^ia_attrezzi_muro', '^ia_calendario']],
    laboratorio: ['assi', 'mattoni|calce', 'bulbo', ['!st_banco_falegname', '!st_banco_falegname', '!pv_banco_lavoro', 'st_cassetta', 'kitchenBar', 'ar_cash-register', '~ia_legna', '~ia_legna', '^ia_attrezzi_muro', '^ia_calendario']],
    macelleria: ['piastrelle', 'piastrelle', 'neon', ['!st_banco_macellaio', 'ia_vetrina_frigo', 'kitchenBar', 'ar_cash-register', 'kitchenFridge', '^ia_gancio_carne', '^ia_ritratto', '^ia_menu']],
    macello: ['piastrelle', 'piastrelle', 'neon', ['!st_banco_macellaio', 'kitchenSink', 'kitchenFridge', 'trashcan', '~ia_secchio', '^ia_gancio_carne']],
    emporio: ['graniglia', 'crema', 'neon', ['pv_banco_vendita', 'ia_scaffale_merci', 'ia_scaffale_merci', 'ia_scaffale_merci', 'bookcaseOpenLow', 'ar_cash-register', 'pottedPlant', '^ia_ritratto', '^ia_manifesto', '^ia_stella_regime', '^ia_altoparlante']],
    fruttivendolo: ['cemento|graniglia', 'crema|verde', 'neon', ['pv_banco_vendita', 'ia_cassette_frutta', 'ia_cassette_frutta', 'ia_cassette_frutta', 'ia_sacchi', 'ar_cash-register', '~ia_cesto', '~ia_cassette_frutta', '^ia_ritratto', '^ia_menu']],
    radio_r: ['linoleum', 'verde', 'bulbo', ['!st_banco_radio', 'st_cassetta', 'cardboardBoxClosed', '@scrivania', '~ia_casse', '^ia_mappa', '^ia_poster_film']],
    cantina_r: ['cotto', 'mattoni', 'bulbo', ['!fd_barrel', '!fd_barrel', 'ia_botti', 'ia_botti', 'kitchenBar', 'ar_cash-register', '~ia_bottiglie', '^ia_salami']],
  };
  // file di posti (platea, cinema, aule, navata, salone): [testa contro il muro di fondo, posto]
  const ROWS = { platea: ['ia_palco', 'rc_seat'], sala_cinema: ['rc_screen', 'rc_seat'], galleria: [null, 'rc_seat'], aula: ['desk', 'ia_banco_scuola'], navata: ['@altare', 'ia_panca_chiesa'], salone_cultura: ['ia_palco', 'rc_seat'] };
  // mobili alti: davanti a loro non si appende niente
  const TALL = /bookcase|stenka|armadio|Fridge|frigo|scaffale|armadietti|jukebox|arcade|vending|claw|castello|schedario|credenza|radio_grande|pianoforte|quadro_comandi|prizes|dance|basketball|fx_|ia_casse|ia_bidone/;
  // apertura delle stanze grandi: niente muri dentro
  const OPEN = { chiesa: 1, deposito: 1, officina: 1, fabbrica: 1, hangar: 1, cantiere: 1, faro: 1 };
  const OPEN0 = { teatro: 1, cinema: 1, palestra: 1, cultura: 1, disco: 1, magazzino: 1 };

  // ---------------------------------------------------------------------------------------------------------------
  // LA PIANTA DI UN PIANO: divisione binaria lungo le linee delle caselle. forb: caselle che nessun muro può tagliare (la scala)
  // ---------------------------------------------------------------------------------------------------------------
  function splitFloor(b, kind, f, r, forb, want) {
    const rooms = [], inner = [];
    const crossV = (gx, ty, th) => forb && gx > forb[0] && gx < forb[2] && ty < forb[3] && ty + th > forb[1];
    const crossH = (gy, tx, tw) => forb && gy > forb[1] && gy < forb[3] && tx < forb[2] && tx + tw > forb[0];
    const gapBad = (tx, ty) => forb && tx >= forb[0] - 1 && tx <= forb[2] && ty >= forb[1] - 1 && ty <= forb[3];
    const split = (tx, ty, tw, th, depth) => {
      const open = OPEN[kind] || (OPEN0[kind] && f === 0 && depth === 0) || (kind === 'bar' && f === 0 && depth === 0 && tw * th <= 30) || (kind === 'trattoria' && f === 0 && depth === 0 && tw * th <= 24);
      const can = !open && depth < 3 && (tw >= 4 || th >= 4) && tw * th >= 12 && (rooms.length < want + 1 || tw * th > 20) && !(want <= 1 && depth > 0 && tw * th <= 20);
      if (!can) { rooms.push({ tx, ty, tw, th }); return; }
      const vert = tw > th ? true : tw < th ? false : r() < .5;
      const ks = []; for (let k = 2; k <= (vert ? tw : th) - 2; k++) ks.push(k); ks.sort(() => r() - .5);
      if (vert) {
        const k = ks.find(k => !crossV(tx + k, ty, th)); if (k === undefined) { rooms.push({ tx, ty, tw, th }); return; }
        const rows = []; for (let j = 0; j < th; j++) if (!gapBad(tx + k, ty + j)) rows.push(j); if (!rows.length) { rooms.push({ tx, ty, tw, th }); return; }
        const gx = (tx + k) * TS, gy = (ty + pick(r, rows)) * TS + 1; inner.push({ a: [gx, ty * TS], b: [gx, (ty + th) * TS], gap: [gy, 1.3], v: true });
        split(tx, ty, k, th, depth + 1); split(tx + k, ty, tw - k, th, depth + 1);
      } else {
        const k = ks.find(k => !crossH(ty + k, tx, tw)); if (k === undefined) { rooms.push({ tx, ty, tw, th }); return; }
        const cols = []; for (let j = 0; j < tw; j++) if (!gapBad(tx + j, ty + k)) cols.push(j); if (!cols.length) { rooms.push({ tx, ty, tw, th }); return; }
        const gy = (ty + k) * TS, gx = (tx + pick(r, cols)) * TS + 1; inner.push({ a: [tx * TS, gy], b: [(tx + tw) * TS, gy], gap: [gx, 1.3], v: false });
        split(tx, ty, tw, k, depth + 1); split(tx, ty + k, tw, th - k, depth + 1);
      }
    };
    split(b.x, b.y, b.w, b.h, 0);
    return { rooms, inner };
  }

  // ---------------------------------------------------------------------------------------------------------------
  function layout(b) {
    const key = b.i !== undefined ? b.i : b.id; if (CACHE[key]) return CACHE[key];
    const seed = (b.x * 7919 + b.y * 104729) >>> 0, r = rng(seed), kind = kindOf(b), X0 = b.x * TS, Y0 = b.y * TS, W = b.w * TS, H = b.h * TS;
    const want = Math.max(1, Math.min(MAXF, b.fl || 1));
    // ---- l'ingresso: sul lato che tocca la casella della porta ----
    let ent = null;
    if (b.door) {
      const [dx, dy] = b.door, cx = dx * TS + 1, cy = dy * TS + 1;
      if (dy < b.y) ent = { side: 'N', x: cx, y: Y0, out: [cx, Y0 - 1], in: [cx, Y0 + 1.1] };
      else if (dy >= b.y + b.h) ent = { side: 'S', x: cx, y: Y0 + H, out: [cx, Y0 + H + 1], in: [cx, Y0 + H - 1.1] };
      else if (dx < b.x) ent = { side: 'W', x: X0, y: cy, out: [X0 - 1, cy], in: [X0 + 1.1, cy] };
      else ent = { side: 'E', x: X0 + W, y: cy, out: [X0 + W + 1, cy], in: [X0 + W - 1.1, cy] };
    }
    const prog0 = program(b, kind, 0, want, r);
    let P0 = splitFloor(b, kind, 0, r, null, prog0.names.length);
    const roomIn = (rooms, x, y) => rooms.find(q => x >= q.tx * TS && x <= (q.tx + q.tw) * TS && y >= q.ty * TS && y <= (q.ty + q.th) * TS);
    let entRoom = ent ? roomIn(P0.rooms, ent.in[0], ent.in[1]) : P0.rooms[0];
    // ---- scala: in una stanza del piano terra, contro un muro, due caselle ----
    let stairs = null;
    for (let tryN = 0; want > 1 && !stairs && tryN < 4; tryN++) {
      const GD = [2.2, 1.6, 1.6, 1.6][tryN], ED = [2.2, 1.8, 1.8, 1.8][tryN], needWall = tryN < 2;
      if (tryN === 3) { P0 = splitFloor(b, kind, 0, r, null, 1); entRoom = ent ? roomIn(P0.rooms, ent.in[0], ent.in[1]) : P0.rooms[0]; }
      // si provano tutte le posizioni: due caselle (cima T e rampa O) contro un muro, il piede oltre O, il pianerottolo accanto a T
      const gapNear = (tx, ty) => P0.inner.some(q => { const gx = q.v ? q.a[0] : q.gap[0], gy = q.v ? q.gap[0] : q.a[1]; return Math.abs(gx - (tx * TS + 1)) < GD && Math.abs(gy - (ty * TS + 1)) < GD; });
      let best = null, bs = -1e9;
      P0.rooms.forEach(q => {
        const inR = (x, y) => x >= q.tx && x < q.tx + q.tw && y >= q.ty && y < q.ty + q.th;
        for (let tx = q.tx; tx < q.tx + q.tw; tx++) for (let ty = q.ty; ty < q.ty + q.th; ty++) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) for (const sgn of [1, -1]) {
          const ox = tx + dx, oy = ty + dy, fx = tx + 2 * dx, fy = ty + 2 * dy, lx = tx + dy * sgn, ly = ty + dx * sgn, wx = tx - dy * sgn, wy = ty - dx * sgn;
          if (!inR(ox, oy) || !inR(fx, fy) || !inR(lx, ly)) continue;
          if (needWall && inR(wx, wy)) continue;   // dall'altra parte del pianerottolo c'è il muro
          if ([[tx, ty], [ox, oy], [fx, fy], [lx, ly]].some(([x, y]) => gapNear(x, y))) continue;
          if (ent && [[tx, ty], [ox, oy], [fx, fy], [lx, ly]].some(([x, y]) => Math.hypot(x * TS + 1 - ent.in[0], y * TS + 1 - ent.in[1]) < ED)) continue;
          const sc = (q === entRoom ? 5 : 0) + q.tw * q.th * .1 + (inR(tx - dx, ty - dy) ? 0 : 2) + r() * .5;
          if (sc > bs) { bs = sc; best = { tx, ty, dx, dy, ox, oy, fx, fy, lx, ly }; }
        }
      });
      if (best) {
        const { tx, ty, dx, dy, ox, oy, fx, fy, lx, ly } = best, x = Math.min(tx, ox) * TS, y = Math.min(ty, oy) * TS;
        const fxm = fx * TS + 1 - dx * .1, fym = fy * TS + 1 - dy * .1;
        stairs = { x, y, w: dx ? 2 * TS : TS, h: dy ? 2 * TS : TS, dir: dy > 0 ? 'S' : dy < 0 ? 'N' : dx > 0 ? 'E' : 'W', d: [dx, dy], top: [tx * TS, ty * TS, TS, TS], o: [ox * TS, oy * TS, TS, TS],
          foot: [fxm, fym], landing: [lx * TS + 1, ly * TS + 1], forb: [Math.min(tx, ox, fx, lx), Math.min(ty, oy, fy, ly), Math.max(tx, ox, fx, lx) + 1, Math.max(ty, oy, fy, ly) + 1] };
      }
    }
    const nF = stairs ? want : 1;
    // ---- muri: perimetro con la porta, muri interni con i passaggi ----
    const wallsOf = (f, inner) => {
      const w = [];
      const seg = (x0, y0, x1, y1, gap) => {
        const v = x0 === x1;
        if (!gap) { w.push(v ? [x0 - WT / 2, Math.min(y0, y1), WT, Math.abs(y1 - y0)] : [Math.min(x0, x1), y0 - WT / 2, Math.abs(x1 - x0), WT]); return; }
        const [c, gw] = gap, a = v ? Math.min(y0, y1) : Math.min(x0, x1), bb = v ? Math.max(y0, y1) : Math.max(x0, x1);
        if (c - gw / 2 > a) w.push(v ? [x0 - WT / 2, a, WT, c - gw / 2 - a] : [a, y0 - WT / 2, c - gw / 2 - a, WT]);
        if (c + gw / 2 < bb) w.push(v ? [x0 - WT / 2, c + gw / 2, WT, bb - c - gw / 2] : [c + gw / 2, y0 - WT / 2, bb - c - gw / 2, WT]);
      };
      const g = s => f === 0 && ent && ent.side === s ? [s === 'N' || s === 'S' ? ent.x : ent.y, 1.5] : null;
      seg(X0, Y0, X0 + W, Y0, g('N')); seg(X0, Y0 + H, X0 + W, Y0 + H, g('S')); seg(X0, Y0, X0, Y0 + H, g('W')); seg(X0 + W, Y0, X0 + W, Y0 + H, g('E'));
      inner.forEach(q => seg(q.a[0], q.a[1], q.b[0], q.b[1], q.gap));
      return w;
    };
    const Lb = { b, kind, floors: [], ent, stairs, box: [X0, Y0, W, H], mood: prog0.mood };
    for (let f = 0; f < nF; f++) {
      const rf = f === 0 ? r : rng((seed + f * 7777) >>> 0);
      const prog = f === 0 ? prog0 : program(b, kind, f, nF, rf);
      const P = f === 0 ? P0 : splitFloor(b, kind, f, rf, stairs.forb, prog.names.length);
      if (P.rooms.length === 1 && HOME[prog.mood] && prog.mood !== 'rudere') {   // un piano di una stanza sola: ci si fa tutto
        const m = prog.mood, n0 = prog.names[0];
        prog.names = [nF === 1 ? (m === 'anziana' ? 'mono_anziana' : m === 'intellettuale' ? 'mono_artista' : m === 'contadino' ? 'casa_contadina' : m === 'funzionario' ? 'salotto_buono' : 'monolocale') : f === 0 ? (m === 'contadino' ? 'cucina_focolare' : m === 'intellettuale' ? 'studio_libri' : 'soggiorno_cucina') : (m === 'intellettuale' ? 'atelier' : m === 'operaio' ? 'camera_spoglia' : m === 'kommunalka' ? 'stanza_fam' : m === 'contadino' ? 'granaio' : 'mansarda')];
      }
      const eRoom = f === 0 ? entRoom : roomIn(P.rooms, stairs.landing[0], stairs.landing[1]) || P.rooms[0];
      const names = nameRooms(P.rooms, eRoom, prog.names);
      const walls = wallsOf(f, P.inner);
      const rooms = P.rooms.map(q => { const name = names.get(q), st = roomStyle(name, rf); return { x: q.tx * TS, y: q.ty * TS, w: q.tw * TS, h: q.th * TS, name, floor: st.floor, wall: st.wall, light: st.light, dirt: prog.mood === 'rudere' ? 1 : prog.mood === 'operaio' || prog.mood === 'kommunalka' || prog.mood === 'magazzino' ? .6 : prog.mood === 'funzionario' || prog.mood === 'albergo' || prog.mood === 'cultura' ? .1 : .3 }; });
      const F = { f, mood: prog.mood, walls, rooms, inner: P.inner, wins: /disco|cinema|sala_giochi/.test(prog.mood) ? [] : windows(Lb, f, P.inner, prog.names[0] === 'lanterna' || prog.mood === 'chiesa'), doors: P.inner.map(q => ({ x: q.v ? q.a[0] : q.gap[0], y: q.v ? q.gap[0] : q.a[1], v: q.v })), furn: [] };
      Lb.floors.push(F);
      F.furn = furnish(Lb, F, rf, P.inner, kind);
    }
    // tutto deve essere raggiungibile: se un mobile chiude il passaggio, si toglie (prima quelli vicino ai varchi)
    for (let f = 0; f < Lb.floors.length; f++) {
      const F = Lb.floors[f];
      for (let tries = 0; tries < 40; tries++) {
        if (reachAll(Lb, f)) break;
        const solid = F.furn.filter(o => o.solid); if (!solid.length) break;
        const pts = F.inner.map(q => q.v ? [q.a[0], q.gap[0]] : [q.gap[0], q.a[1]]); if (stairs) pts.push(stairs.foot, stairs.landing, [stairs.o[0] + 1, stairs.o[1] + 1]); if (ent && f === 0) pts.push(ent.in);
        let best = null, bd = 1e9; solid.forEach(o => pts.forEach(p => { const d = Math.hypot(o.x - p[0], o.y - p[1]) + (o.keep ? 6 : 0); if (d < bd) { bd = d; best = o; } }));   // le postazioni per ultime
        // se era in un gruppo, il gruppo resta: si toglie solo lui
        F.furn.splice(F.furn.indexOf(best), 1);
      }
    }
    CACHE[key] = Lb; return Lb;
  }
  function nameRooms(rooms, eRoom, ns) {
    const out = new Map(); out.set(eRoom, ns[0]);
    const rest = rooms.filter(q => q !== eRoom).sort((p, q) => q.tw * q.th - p.tw * p.th);
    let tail = ns.slice(1);
    if (rest.length >= 2 && tail.includes('bagno')) { const smallest = rest.reduce((a, q) => q.tw * q.th < a.tw * a.th ? q : a, rest[0]); out.set(smallest, 'bagno'); tail = tail.filter(n => n !== 'bagno'); }
    let k = 0; rest.forEach(q => { if (out.has(q)) return; out.set(q, tail.length ? tail[k % tail.length] : ns[0]); k++; });
    return out;
  }
  function roomStyle(name, r) {
    const d = R[name], alt = s => pick(r, s.split('|'));
    return d ? { floor: alt(d[0]), wall: alt(d[1]), light: d[2] } : { floor: 'parquet', wall: 'crema', light: 'bulbo' };
  }
  function roomItems(name) {
    let list = EXTRA.fur[name] ? EXTRA.fur[name].slice().concat((R[name] ? R[name][3] : []).filter(t => /^\?{0,2}[\^~]/.test(t))) : (R[name] ? R[name][3].slice() : []);
    if (EXTRA.pre[name]) list = EXTRA.pre[name].concat(list);
    return list;
  }
  // finestre: sui muri esterni, una casella sì e una no, lontano dagli angoli, dall'ingresso e dai muri interni
  function windows(L, f, inner, all) {
    const [X0, Y0, W, H] = L.box, out = [], e = L.ent;
    const junction = (x, y) => inner.some(q => (q.v ? Math.abs(q.a[0] - x) < 1.1 && (Math.abs(q.a[1] - y) < .1 || Math.abs(q.b[1] - y) < .1) : Math.abs(q.a[1] - y) < 1.1 && (Math.abs(q.a[0] - x) < .1 || Math.abs(q.b[0] - x) < .1)));
    const nearEnt = (s, x, y) => f === 0 && e && e.side === s && Math.hypot(x - e.x, y - e.y) < 1.9;
    const nx = W / TS, ny = H / TS;
    for (let i = 1; i < nx - 1; i++) { if (i % 2 !== 1 && !all) continue; const x = X0 + i * TS + 1; if (!nearEnt('N', x, Y0) && !junction(x, Y0)) out.push({ x, y: Y0, side: 'N' }); if (!nearEnt('S', x, Y0 + H) && !junction(x, Y0 + H)) out.push({ x, y: Y0 + H, side: 'S' }); }
    for (let j = 1; j < ny - 1; j++) { if (j % 2 !== 1 && !all) continue; const y = Y0 + j * TS + 1; if (!nearEnt('W', X0, y) && !junction(X0, y)) out.push({ x: X0, y, side: 'W' }); if (!nearEnt('E', X0 + W, y) && !junction(X0 + W, y)) out.push({ x: X0 + W, y, side: 'E' }); }
    return out;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // L'ARREDO
  // ---------------------------------------------------------------------------------------------------------------
  // lati dei muri: verso dentro (n), lungo il muro (t), rotazione del modello che guarda la stanza
  const SIDE = { N: { t: [1, 0], n: [0, 1], ry: 0 }, E: { t: [0, 1], n: [-1, 0], ry: -PI / 2 }, S: { t: [-1, 0], n: [0, -1], ry: PI }, W: { t: [0, -1], n: [1, 0], ry: PI / 2 } };
  const szOf = id => SZ[id] || EXTRA.sz[id] || (SMALL[id] ? [.3, .3, 0] : [.8, .8, 0]);
  function parseTok(tok, r) {
    let t = tok, pri = false; if (t[0] === '!') { pri = true; t = t.slice(1); } if (t.startsWith('??')) { if (r() > .33) return null; t = t.slice(2); } else if (t.startsWith('?')) { if (r() > .55) return null; t = t.slice(1); }
    const kind = t[0] === '@' ? 'v' : t[0] === '*' ? 'c' : t[0] === '~' ? 'k' : t[0] === '^' ? 'd' : 'w';
    const alts = t.split('|').map(s => s.replace(/^[@*~^]+/, '').replace(/^@/, ''));
    const vg = t.split('|').map(s => /^\*?@/.test(s.replace(/^[~^]/, '')));
    return { kind, alts, vg, pri };
  }
  function furnish(L, F, r, inner, kind) {
    const out = [], [BX, BY, BW, BH] = L.box, ent = L.ent, stairs = L.stairs, f = F.f, last = L.floors.length - 1;
    const gaps = inner.map(q => q.v ? [q.a[0], q.gap[0]] : [q.gap[0], q.a[1]]);
    const distRect = (px, py, cx, cy, hw, hd) => Math.hypot(Math.max(0, Math.abs(px - cx) - hw), Math.max(0, Math.abs(py - cy) - hd));
    const blocked = (cx, cy, hw, hd) => {
      if (f === 0 && ent && distRect(ent.in[0], ent.in[1], cx, cy, hw, hd) < .85) return true;
      for (const g of gaps) if (distRect(g[0], g[1], cx, cy, hw, hd) < .9) return true;
      // davanti a ogni varco un corridoio libero, dalle due parti
      for (const q of inner) { const gx = q.v ? q.a[0] : q.gap[0], gy = q.v ? q.gap[0] : q.a[1], ax = q.v ? 1.25 : .72, ay = q.v ? .72 : 1.25; if (Math.abs(cx - gx) < hw + ax && Math.abs(cy - gy) < hd + ay) return true; }
      if (f === 0 && ent) { const vx = ent.side === 'N' || ent.side === 'S', ax = vx ? .75 : 1.5, ay = vx ? 1.5 : .75; if (Math.abs(cx - ent.x) < hw + ax && Math.abs(cy - ent.y) < hd + ay) return true; }
      if (stairs) {
        const s = stairs; if (cx + hw > s.x - .2 && cx - hw < s.x + s.w + .2 && cy + hd > s.y - .2 && cy - hd < s.y + s.h + .2) return true;
        if (distRect(s.foot[0], s.foot[1], cx, cy, hw, hd) < .9 || distRect(s.landing[0], s.landing[1], cx, cy, hw, hd) < .9) return true;
      }
      return false;
    };
    F.rooms.forEach((q, qi) => {
      const name = q.name, x0 = q.x + .15, y0 = q.y + .15, x1 = q.x + q.w - .15, y1 = q.y + q.h - .15;
      const used = [];   // [cx, cy, hw, hd, tappeto, alto]
      const free = (cx, cy, hw, hd, rug) => cx - hw >= x0 - .01 && cx + hw <= x1 + .01 && cy - hd >= y0 - .01 && cy + hd <= y1 + .01 && !used.some(u => (rug ? u[4] : !u[4]) && Math.abs(u[0] - cx) < u[2] + hw + .04 && Math.abs(u[1] - cy) < u[3] + hd + .04);
      const put = (id, x, y, ry, h, extra) => { const [w, d, sol] = szOf(id), sw = Math.abs(Math.sin(ry)) > .5, hw = (sw ? d : w) / 2, hd = (sw ? w : d) / 2; const o = Object.assign({ id, x, y, ry, h: h || 0, solid: sol && !h ? [x - hw, y - hd, hw * 2, hd * 2] : null, room: qi }, extra || {}); out.push(o); return o; };
      const list = roomItems(name).map(t => parseTok(t, r)).filter(Boolean);
      // posti lungo i muri: nord, est, sud, ovest
      const slots = [];
      for (let x = x0 + .25; x < x1 - .2; x += .25) slots.push([x, y0, 'N']);
      for (let y = y0 + .25; y < y1 - .2; y += .25) slots.push([x1, y, 'E']);
      for (let x = x1 - .25; x > x0 + .2; x -= .25) slots.push([x, y1, 'S']);
      for (let y = y1 - .25; y > y0 + .2; y -= .25) slots.push([x0, y, 'W']);
      const off = Math.floor(r() * slots.length);
      // un gruppo (o un mobile) con ingombro w×d appoggiato a un muro: il primo posto libero
      const atWall = (w, d, rug) => {
        for (let k = 0; k < slots.length; k++) {
          const [sx, sy, side] = slots[(k + off) % slots.length], S = SIDE[side];
          const hw = Math.abs(S.t[0]) * w / 2 + Math.abs(S.n[0]) * d / 2, hd = Math.abs(S.t[1]) * w / 2 + Math.abs(S.n[1]) * d / 2;
          const cx = sx + S.n[0] * d / 2, cy = sy + S.n[1] * d / 2;
          if (!free(cx, cy, hw, hd, rug) || blocked(cx, cy, hw, hd)) continue;
          return { cx, cy, hw, hd, side };
        }
        return null;
      };
      const inMiddle = (w, d, rug) => {
        const rot = q.w >= q.h ? 'N' : 'E', S = SIDE[rot], hw = Math.abs(S.t[0]) * w / 2 + Math.abs(S.n[0]) * d / 2, hd = Math.abs(S.t[1]) * w / 2 + Math.abs(S.n[1]) * d / 2;
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, cand = [];
        for (let x = x0 + hw + .5; x <= x1 - hw - .5 + 1e-6; x += .25) for (let y = y0 + hd + .5; y <= y1 - hd - .5 + 1e-6; y += .25) cand.push([x, y, Math.hypot(x - mx, y - my) + r() * .3]);
        cand.sort((a, c) => a[2] - c[2]);
        for (const [cx, cy] of cand) if (free(cx, cy, hw + .25, hd + .25, rug) && !blocked(cx, cy, hw, hd)) return { cx, cy, hw, hd, side: rot };
        return null;
      };
      const placeGroup = (vn, spot) => {
        const [w, d, items] = V[vn], S = SIDE[spot.side];
        items.forEach(([id0, lx, ly, rot, h]) => {
          let id = id0; if (id[0] === '?') { if (r() > .55) return; id = id.slice(1); }
          const x = spot.cx + S.t[0] * lx + S.n[0] * (ly - d / 2), y = spot.cy + S.t[1] * lx + S.n[1] * (ly - d / 2);
          put(id, x, y, S.ry + rot, h, { grp: vn });
        });
        used.push([spot.cx, spot.cy, spot.hw, spot.hd, false, items.some(it => TALL.test(it[0]))]);
      };
      const placeOne = (id, spot) => { const S = SIDE[spot.side]; put(id, spot.cx, spot.cy, S.ry, 0); used.push([spot.cx, spot.cy, spot.hw, spot.hd, /^rug|ia_pista/.test(id), TALL.test(id)]); };
      // file di posti
      const rows = ROWS[name];
      if (rows && q.w >= 6 && q.h >= 6) {
        const [head, seat] = rows, farSide = f === 0 && ent ? ({ N: 'S', S: 'N', E: 'W', W: 'E' })[ent.side] : (q.w >= q.h ? 'N' : 'W');
        const S = SIDE[farSide];
        if (head) {
          const isV = head[0] === '@', vn = head.replace('@', ''), [w, d] = isV ? V[vn] : szOf(head), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
          const sx = farSide === 'N' ? mx : farSide === 'S' ? mx : farSide === 'E' ? x1 : x0, sy = farSide === 'N' ? y0 : farSide === 'S' ? y1 : my;
          const hw = Math.abs(S.t[0]) * w / 2 + Math.abs(S.n[0]) * d / 2, hd = Math.abs(S.t[1]) * w / 2 + Math.abs(S.n[1]) * d / 2;
          for (const sh of [0, 1, -1, 2, -2, 3, -3]) {   // al centro del muro di fondo, o lì vicino se c'è la scala
            const spot = { cx: sx + S.n[0] * d / 2 + S.t[0] * sh, cy: sy + S.n[1] * d / 2 + S.t[1] * sh, hw, hd, side: farSide };
            if (spot.cx - hw < x0 - .01 || spot.cx + hw > x1 + .01 || spot.cy - hd < y0 - .01 || spot.cy + hd > y1 + .01 || blocked(spot.cx, spot.cy, hw, hd)) continue;
            if (isV) placeGroup(vn, spot); else placeOne(head, spot); break;
          }
        }
        let nSeat = 0; const [sw0, sd0] = szOf(seat), stepT = Math.max(.75, sw0 + .2), depth = (S.n[0] ? q.w : q.h) - .3, along = (S.n[0] ? q.h : q.w) - .3;
        const headD = head ? (head[0] === '@' ? V[head.slice(1)][1] : szOf(head)[1]) + 1.4 : .8;
        for (let dd = headD; dd < depth - 1.0; dd += 1.25) for (let tt = .55; tt < along - .45; tt += stepT) {
          if (Math.abs(tt - along / 2) < .7) continue;   // corridoio
          const bx = farSide === 'N' ? x0 : farSide === 'S' ? x1 : farSide === 'E' ? x1 : x0, by = farSide === 'N' ? y0 : farSide === 'S' ? y1 : farSide === 'E' ? y0 : y1;
          const cx = bx + S.n[0] * dd + S.t[0] * tt, cy = by + S.n[1] * dd + S.t[1] * tt;
          if (blocked(cx, cy, sw0 / 2, sd0 / 2) || nSeat >= 64) continue; nSeat++;
          put(seat, cx, cy, S.ry + PI, 0); used.push([cx, cy, sw0 / 2, sd0 / 2, false, false]);
        }
      }
      // prima i gruppi contro i muri, poi le cose in mezzo, poi i mobili sciolti, poi la roba per terra
      const order = { v: 0, c: 1, w: 2, k: 3 };
      list.filter(t => t.kind !== 'd').sort((a, c) => ((a.pri ? -1 : order[a.kind === 'w' && a.vg[0] ? 'v' : a.kind]) - (c.pri ? -1 : order[c.kind === 'w' && c.vg[0] ? 'v' : c.kind]))).forEach(t => {
        if (rows && q.w >= 6 && q.h >= 6 && t.alts.some(a => a === rows[1] || a === (rows[0] || '').replace('@', ''))) return;
        for (let ai = 0; ai < t.alts.length; ai++) {
          const id = t.alts[ai], isV = !!V[id] && (t.vg[ai] || t.kind === 'v'), n0 = out.length;
          if (/^fd_/.test(id) && !/barrel/.test(id)) {   // il cibo sui banconi e sui tavoli
            const tb = out.find(o => o.room === qi && /kitchenBar|^table|kitchenCabinet|banco_vendita|bancone|tavolo/.test(o.id) && !o.h && (o.full || 0) < 3);
            if (tb) { tb.full = (tb.full || 0) + 1; put(id, tb.x + (r() - .5) * .5, tb.y + (r() - .5) * .2, r() * 6, /kitchenBar|kitchenCabinet|banco|bancone/.test(tb.id) ? .95 : .76); }
            return;
          }
          if (SMALL[id]) { const tb = out.find(o => o.room === qi && /desk|table|tavol|sideTable|kitchenCabinet|banco/.test(o.id) && !o.h); if (tb) put(id, tb.x + (r() - .5) * .4, tb.y, tb.ry, /kitchenCabinet|banco/.test(tb.id) ? .92 : /sideTable/.test(tb.id) ? .55 : .76); return; }
          const [w, d] = isV ? V[id] : szOf(id), rug = /^rug|ia_pista/.test(id);
          let spot = null;
          if (t.kind === 'c' || (!isV && /^rug|tableCoffee|tableRound$|^table$|ia_ring|ia_telo|ia_barca|ia_lanterna|ia_pista/.test(id) && t.kind !== 'k')) spot = inMiddle(w, d, rug) || (t.kind === 'c' ? null : atWall(w, d, rug));
          else spot = atWall(w, d, rug);
          if (!spot) continue;
          if (isV) placeGroup(id, spot);
          else if (t.kind === 'k') { const S = SIDE[spot.side]; put(id, spot.cx + (r() - .5) * .1, spot.cy + (r() - .5) * .1, S.ry + (r() - .5) * 1.2, 0); used.push([spot.cx, spot.cy, spot.hw, spot.hd, false, false]); }
          else placeOne(id, spot);
          if (t.pri || /^st_|^pv_banco|ar_cash/.test(id)) for (let k = n0; k < out.length; k++) out[k].keep = 1;
          return;
        }
      });
      // roba appesa: sui muri esterni (quelle basse anche sui muri interni), lontano da finestre, varchi e mobili alti
      const decor = list.filter(t => t.kind === 'd'), hung = [];
      decor.forEach(t => {
        const id = t.alts[Math.floor(r() * t.alts.length)], D = DECOR[id]; if (!D) return;
        const [dw, dh, low] = D, sides = [];
        if (Math.abs(q.y - BY) < .01 || low) sides.push(['N', q.y]); if (Math.abs(q.y + q.h - BY - BH) < .01 || low) sides.push(['S', q.y + q.h]);
        if (Math.abs(q.x - BX) < .01 || low) sides.push(['W', q.x]); if (Math.abs(q.x + q.w - BX - BW) < .01 || low) sides.push(['E', q.x + q.w]);
        const cands = [];
        sides.forEach(([side, line]) => {
          const horiz = side === 'N' || side === 'S', a = horiz ? q.x : q.y, len = horiz ? q.w : q.h;
          for (let p = a + dw / 2 + .35; p <= a + len - dw / 2 - .35; p += .25) {
            const x = horiz ? p : line, y = horiz ? line : p;
            if (F.wins.some(w0 => w0.side === side && Math.abs((horiz ? w0.x : w0.y) - p) < dw / 2 + .75)) continue;
            if (gaps.some(g => Math.hypot(g[0] - x, g[1] - y) < dw / 2 + .9)) continue;
            if (f === 0 && ent && ent.side === side && Math.abs((horiz ? ent.x : ent.y) - p) < dw / 2 + 1) continue;
            if (hung.some(h0 => h0[0] === side && Math.abs(h0[1] - p) < (h0[2] + dw) / 2 + .3)) continue;
            const S = SIDE[side], inx = x + S.n[0] * .5, iny = y + S.n[1] * .5;
            if (used.some(u => (low ? !u[4] : u[5]) && Math.abs(u[0] - inx) < u[2] + dw / 2 * Math.abs(S.t[0]) + .2 && Math.abs(u[1] - iny) < u[3] + dw / 2 * Math.abs(S.t[1]) + .2)) continue;
            if (stairs && x > stairs.x - 1 && x < stairs.x + stairs.w + 1 && y > stairs.y - 1 && y < stairs.y + stairs.h + 1) continue;
            cands.push([side, p, x, y]);
          }
        });
        if (!cands.length) return;
        const [side, p, x, y] = cands[Math.floor(r() * cands.length)], S = SIDE[side];
        hung.push([side, p, dw]);
        out.push({ id, x: x + S.n[0] * WT / 2, y: y + S.n[1] * WT / 2, ry: S.ry, h: dh, wall: side, decor: 1, low: !!low, solid: null, room: qi });
      });
    });
    return out;
  }

  function reachAll(L, f) {
    const [X0, Y0, W, H] = L.box, S = .5, F = L.floors[f];
    const start = f === 0 ? (L.ent ? L.ent.in : null) : L.stairs && L.stairs.landing; if (!start) return true;
    const nx = Math.ceil(W / S), ny = Math.ceil(H / S), seen = new Uint8Array(nx * ny), q = [];
    const id = (x, y) => Math.floor((y - Y0) / S) * nx + Math.floor((x - X0) / S);
    const ok = (x, y) => x > X0 && y > Y0 && x < X0 + W && y < Y0 + H && walk(L, f, x, y, .3);
    if (!ok(start[0], start[1])) return false;
    q.push(start); seen[id(start[0], start[1])] = 1;
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) { const a = x + dx, c = y + dy; if (!ok(a, c)) continue; const k = id(a, c); if (seen[k]) continue; seen[k] = 1; q.push([a, c]); } }
    for (const r of F.rooms) { let hit = false; for (let x = r.x + .25; x < r.x + r.w && !hit; x += S) for (let y = r.y + .25; y < r.y + r.h && !hit; y += S) if (seen[id(x, y)]) hit = true; if (!hit) return false; }
    const s = L.stairs, last = L.floors.length - 1;
    if (s && f === 0 && last > 0 && !seen[id(s.top[0] + 1, s.top[1] + 1)] && !seen[id(s.foot[0], s.foot[1])]) return false;
    if (s && f > 0 && f < last && !seen[id(s.o[0] + 1, s.o[1] + 1)] && !seen[id(s.foot[0], s.foot[1])]) return false;
    return true;
  }
  // si può stare lì? (cerchio di raggio rr): dentro la sagoma, fuori dai muri e dai mobili pieni; il varco d'ingresso porta fuori
  function walk(L, f, x, y, rr) {
    const [X0, Y0, W, H] = L.box, F = L.floors[f]; if (!F) return false;
    const inBox = x - rr > X0 && x + rr < X0 + W && y - rr > Y0 && y + rr < Y0 + H;
    if (!inBox) {
      if (f !== 0 || !L.ent) return false;
      const e = L.ent, along = e.side === 'N' || e.side === 'S' ? Math.abs(x - e.x) : Math.abs(y - e.y);
      if (along > .75 - rr * .3) return false;
    }
    const hit = q => x + rr > q[0] && x - rr < q[0] + q[2] && y + rr > q[1] && y - rr < q[1] + q[3];
    if (F.walls.some(hit)) return false;
    if (F.furn.some(o => o.solid && hit(o.solid))) return false;
    // all'ultimo piano il vano della scala è un buco (resta la cima, da cui si scende)
    if (f > 0 && f === L.floors.length - 1 && L.stairs) { const s = L.stairs; if (hit([s.o[0] + .1, s.o[1] + .1, s.o[2] - .2, s.o[3] - .2]) && !hit(s.top)) return false; }
    return true;
  }
  // ---------------------------------------------------------------------------------------------------------------
  // CAMMINARE DENTRO (clic per andare): A* su una griglia di mezzo metro, poi il percorso si tende
  // ---------------------------------------------------------------------------------------------------------------
  const RR = .37;
  function nearFree(L, f, x, y) {
    if (walk(L, f, x, y, RR)) return { x, y };
    for (let r = .25; r < 3; r += .25) for (let a = 0; a < 6.28; a += .5) { const X = x + Math.cos(a) * r, Y = y + Math.sin(a) * r; if (walk(L, f, X, Y, RR)) return { x: X, y: Y }; }
    return null;
  }
  function clear(L, f, ax, ay, bx, by) { const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / .2); for (let i = 1; i <= n; i++) { const t = i / n; if (!walk(L, f, ax + (bx - ax) * t, ay + (by - ay) * t, RR)) return false; } return true; }
  function findPath(L, f, sx, sy, gx, gy) {
    const [X0, Y0, W, H] = L.box, S = .25, nx = Math.ceil(W / S), ny = Math.ceil(H / S);
    const g0 = nearFree(L, f, gx, gy); if (!g0) return [];
    if (clear(L, f, sx, sy, g0.x, g0.y)) return [g0];
    const cx = i => X0 + (i + .5) * S, cy = j => Y0 + (j + .5) * S, ok = new Int8Array(nx * ny).fill(-1);
    const free = (i, j) => { if (i < 0 || j < 0 || i >= nx || j >= ny) return false; const k = j * nx + i; if (ok[k] < 0) ok[k] = walk(L, f, cx(i), cy(j), RR) ? 1 : 0; return ok[k] === 1; };
    const ci = x => Math.max(0, Math.min(nx - 1, Math.floor((x - X0) / S))), cj = y => Math.max(0, Math.min(ny - 1, Math.floor((y - Y0) / S)));
    let si = ci(sx), sj = cj(sy); if (!free(si, sj)) { let b = null, bd = 1e9; for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) if (free(si + di, sj + dj)) { const d = di * di + dj * dj; if (d < bd) { bd = d; b = [si + di, sj + dj]; } } if (!b) return [g0]; [si, sj] = b; }
    let ti = ci(g0.x), tj = cj(g0.y); if (!free(ti, tj)) { let b = null, bd = 1e9; for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) if (free(ti + di, tj + dj)) { const d = di * di + dj * dj; if (d < bd) { bd = d; b = [ti + di, tj + dj]; } } if (!b) return []; [ti, tj] = b; }
    const gs = new Float32Array(nx * ny).fill(1e9), from = new Int32Array(nx * ny).fill(-1), done = new Uint8Array(nx * ny), open = [];
    const h = (i, j) => Math.hypot(i - ti, j - tj); gs[sj * nx + si] = 0; open.push([h(si, sj), si, sj]);
    let found = false;
    const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let k = 0; for (;;) { const a = 2 * k + 1, c = a + 1; let m = k; if (a < open.length && open[a][0] < open[m][0]) m = a; if (c < open.length && open[c][0] < open[m][0]) m = c; if (m === k) break; [open[k], open[m]] = [open[m], open[k]]; k = m; } } return top; };
    const push = e => { open.push(e); let k = open.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (open[p][0] <= open[k][0]) break; [open[k], open[p]] = [open[p], open[k]]; k = p; } };
    while (open.length) {
      const [, i, j] = pop();
      const k = j * nx + i; if (done[k]) continue; done[k] = 1; if (i === ti && j === tj) { found = true; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const a = i + di, c = j + dj; if (!free(a, c) || (di && dj && (!free(i + di, j) || !free(i, j + dj)))) continue;
        const kk = c * nx + a, ng = gs[k] + (di && dj ? 1.414 : 1); if (ng < gs[kk]) { gs[kk] = ng; from[kk] = k; push([ng + h(a, c), a, c]); }
      }
    }
    if (!found) return [];
    const pts = []; for (let k = tj * nx + ti; k >= 0; k = from[k]) pts.unshift({ x: cx(k % nx), y: cy(Math.floor(k / nx)) });
    pts[pts.length - 1] = g0;
    // si tende il filo: da ogni punto si salta al più lontano che si vede
    const out = []; let cur = { x: sx, y: sy }, idx = 0;
    while (idx < pts.length) { let far = idx; for (let k = pts.length - 1; k > idx; k--) if (clear(L, f, cur.x, cur.y, pts[k].x, pts[k].y)) { far = k; break; } out.push(pts[far]); cur = pts[far]; idx = far + 1; }
    return out;
  }
  function outside(L, x, y) { const [X0, Y0, W, H] = L.box; return x < X0 || x > X0 + W || y < Y0 || y > Y0 + H; }
  const inT = (t, x, y) => x > t[0] + .2 && x < t[0] + t[2] - .2 && y > t[1] + .2 && y < t[1] + t[3] - .2;
  function onStairTop(L, x, y) { const s = L.stairs; return !!s && inT(s.top, x, y); }
  // la scala: al piano terra la cima porta su; ai piani di mezzo la cima porta giù e l'altra casella su; all'ultimo la cima porta giù
  function stairGo(L, f, x, y) {
    const s = L.stairs, last = L.floors.length - 1; if (!s || last < 1) return null;
    if (inT(s.top, x, y)) return f === 0 ? { f: 1, x: s.landing[0], y: s.landing[1], up: true } : { f: f - 1, x: s.foot[0], y: s.foot[1], up: false };
    if (f > 0 && f < last && inT(s.o, x, y)) return { f: f + 1, x: s.landing[0], y: s.landing[1], up: true };
    return null;
  }
  function roomAt(L, f, x, y) { const F = L.floors[f]; return F && F.rooms.find(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); }
  // i mobili nuovi si frugano come quelli del kit che somigliano
  const LOOTAS = { ia_stenka: 'bookcaseClosedWide', ia_armadio: 'bookcaseClosedWide', ia_armadietti: 'bookcaseClosedWide', ia_cassapanca: 'bookcaseClosedWide', ia_schedario: 'desk', ia_credenza: 'kitchenCabinet', ia_frigo_vecchio: 'kitchenFridge', ia_vetrina_frigo: 'kitchenFridge',
    ia_scaffale_merci: 'bookcaseOpen', ia_scaffale_metallo: 'bookcaseOpen', ia_casse: 'fx_box-large', ia_bidone: 'fx_box-small', ia_castello: 'bedSingle', ia_branda: 'bedSingle', ia_lettino: 'bedSingle', ia_materasso: 'bedSingle', ia_letto_ospedale: 'bedSingle',
    ia_scrivania_grande: 'desk', ia_bancone_bar: 'kitchenBar', ia_cucina_gas: 'kitchenStove', ia_lavello: 'kitchenSink', ia_focolare: 'kitchenStove', ia_mobile_radio: 'sideTable', ia_valigia: 'cardboardBoxClosed', ia_sacchi: 'cardboardBoxClosed', ia_giornali: 'trashcan', ia_bottiglie: 'trashcan' };
  // e qualcuno ha una sua roba (id del catalogo degli oggetti)
  const LOOTX = { ia_legna: [['legna', .8, 1, 3]], ia_secchio_carbone: [['carbone', .7, 1, 2]], ia_cesto: [['verdura', .4, 1, 2], ['uova', .2, 1, 1], ['stracci', .3, 1, 1]], ia_cassette_frutta: [['verdura', .6, 1, 3], ['pomodori', .3, 1, 2]], ia_stivali: [['scarpe', .4, 1, 1]] };
  const FNAME = { ia_stenka: 'parete attrezzata', ia_armadio: 'armadio', ia_armadietti: 'armadietti', ia_cassapanca: 'cassapanca', ia_schedario: 'schedario', ia_credenza: 'credenza', ia_frigo_vecchio: 'frigorifero', ia_vetrina_frigo: 'banco frigo', ia_scaffale_merci: 'scaffale della merce', ia_scaffale_metallo: 'scaffalature',
    ia_casse: 'casse', ia_bidone: 'bidone', ia_castello: 'letto a castello', ia_branda: 'branda', ia_lettino: 'letto di ferro', ia_materasso: 'materasso', ia_letto_ospedale: 'letto d\'ospedale', ia_scrivania_grande: 'scrivania', ia_bancone_bar: 'bancone', ia_cucina_gas: 'fornelli', ia_lavello: 'lavello', ia_focolare: 'focolare',
    ia_valigia: 'valigia', ia_sacchi: 'sacchi', ia_giornali: 'pila di giornali', ia_bottiglie: 'bottiglie vuote', ia_legna: 'catasta di legna', ia_secchio_carbone: 'secchio del carbone', ia_cesto: 'cesto', ia_cassette_frutta: 'cassette', ia_stivali: 'stivali', st_stufa: 'stufa' };
  // i nomi delle stanze da leggere
  const RNAME = { salotto_buono: 'salotto buono', stanza_chiusa: 'stanza chiusa', cucina_abitabile: 'cucina', camera_spoglia: 'camera', stanza_vuota: 'stanza vuota', rimessa_reti: 'rimessa delle reti', studio_libri: 'studio', sala_pranzo: 'sala da pranzo', corridoio_k: 'corridoio comune', stanza_fam: 'stanza di una famiglia', cucina_comune: 'cucina comune', cucina_focolare: 'cucina col focolare',
    magazzino_sale: 'magazzino del sale', ingresso_faro: 'ingresso del faro', alloggio_guardiano: 'alloggio del guardiano', deposito_olio: 'deposito dell\'olio', stanza_radio: 'stanza della radio', lanterna: 'lanterna', sala_bar: 'sala', sala_trattoria: 'sala', cucina_trattoria: 'cucina', laboratorio_gelati: 'laboratorio', spogliatoio_banja: 'spogliatoio', bar_disco: 'bar', corridoio_h: 'corridoio', stanza_h: 'camera',
    salone_cultura: 'salone delle adunanze', biblioteca_partito: 'biblioteca del Partito', museo_regime: 'museo della Tutela', studio_medico: 'studio del medico', cassa_benzina: 'cassa', ingresso_caserma: 'ingresso', ufficio_t: 'ufficio', mensa_t: 'mensa', sala_radio_t: 'sala radio', magazzino_neri: 'magazzino', magazzino_porto: 'magazzino', ufficio_porto: 'ufficio', sala_comandi: 'sala comandi', spogliatoio_m: 'spogliatoio', sala_cinema: 'sala', bar_circolo: 'bar', ingresso_uff: 'ingresso', cella_frigo: 'cella frigo', radio_r: 'laboratorio radio', cantina_r: 'cantina' };
  const roomLabel = n => RNAME[n] || String(n || '').replace(/_r$/, '').replace(/_/g, ' ');
  const ORD = ['piano terra', 'primo piano', 'secondo piano', 'terzo piano', 'quarto piano', 'quinto piano', 'sesto piano', 'settimo piano'];
  const floorLabel = f => ORD[f] || `piano ${f}`;
  const MOODNAME = { famiglia: 'una famiglia', anziana: 'una vecchia sola', operaio: 'un operaio', pescatore: 'un pescatore', intellettuale: 'uno che legge e scrive', funzionario: 'un funzionario della Tutela', kommunalka: 'tre famiglie in una casa', contadino: 'contadini', rudere: 'nessuno, da tempo', condominio: 'il condominio' };
  return { szOf, findPath, nearFree, reachAll, layout, walk, outside, onStairTop, stairGo, roomAt, kindOf, EXTRA, SZ, V, R, DECOR, SMALL, LOOTAS, LOOTX, FNAME, roomLabel, floorLabel, MOODNAME };

})();
if (typeof module !== 'undefined') module.exports = Interior;
