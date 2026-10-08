/* Porto Vecchio — Il Guardaroba: i vestiti si indossano a strati, e quello che hai addosso è quello che si vede.
   Ogni zona del corpo ha una pila: il primo capo è il più vicino alla pelle, l'ultimo quello che si vede sopra.
   L'ordine lo decidi tu (anche le mutande sopra i pantaloni, il giubbotto antiproiettile sotto o sopra la giacca).
   Paraspalle, paraginocchia e zaino hanno un posto loro. Le due mani tengono un oggetto ciascuna.
   Ogni abitante si veste secondo chi è: mestiere, età, parte, quanto ha in tasca. Il disegno sta in vesti3d.js.
   Legge e scrive attraverso Oggetti; si prova anche in Node. */
var Guardaroba = (function () {
  'use strict';
  const O = typeof Oggetti !== 'undefined' ? Oggetti : require('./oggetti.js');
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const CAT = O.CAT;
  const r1 = x => Math.round(x * 100) / 100;
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  // ---------------- LE ZONE ----------------
  // parti del corpo (per il disegno): torso, braccia, avambracci, bacino, cosce, polpacci, piedi, mani, collo
  const ZONE = {
    testa: { nome: 'Testa', pila: true }, collo: { nome: 'Collo', pila: true }, busto: { nome: 'Busto', pila: true },
    spalle: { nome: 'Spalle', pila: false }, mani: { nome: 'Mani', pila: true }, gambe: { nome: 'Gambe', pila: true },
    ginocchia: { nome: 'Ginocchia', pila: false }, piedi: { nome: 'Piedi', pila: true }, schiena: { nome: 'Schiena', pila: false },
  };
  const ZORD = ['testa', 'collo', 'busto', 'spalle', 'mani', 'gambe', 'ginocchia', 'piedi', 'schiena'];

  // ---------------- I CAPI ----------------
  // [id, nome, corto, zona, parti, spessore (m), colore, prezzo, peso, calore, extra]
  // extra: arm (protezione 0-1), ill (roba che scotta), acc (accessorio disegnato a parte: forma), ombra (copre il volto)
  const T = 'torso', B = 'braccia', A = 'avambracci', H = 'bacino', C = 'cosce', P = 'polpacci', F = 'piedi', M = 'mani', N = 'collo';
  const CAPI = [
    // sotto
    ['canotta', 'canottiera di cotone', 'Canotta', 'busto', [T], .006, '#e8e2d4', 1, .1, .05],
    ['maglietta', 'maglietta a maniche corte', 'Maglietta', 'busto', [T, B], .008, '#d8d0c0', 2, .15, .05],
    ['maglietta_righe', 'maglietta a righe da marinaio', 'Marinara', 'busto', [T, B], .008, '#2a3a6a', 3, .15, .05],
    ['camicia', 'camicia bianca', 'Camicia', 'busto', [T, B, A], .01, '#f0ece2', 4, .25, .08],
    ['camicia_quadri', 'camicia di flanella a quadri', 'Flanella', 'busto', [T, B, A], .012, '#8a2a24', 5, .35, .12],
    ['dolcevita', 'dolcevita nero', 'Dolcevita', 'busto', [T, B, A, N], .012, '#1e1c22', 6, .35, .15],
    ['maglione', 'maglione di lana', 'Maglione', 'busto', [T, B, A], .018, '#7a3a2a', 8, .8, .3],
    ['felpa', 'felpa col cappuccio', 'Felpa', 'busto', [T, B, A], .018, '#5a5e66', 6, .6, .2],
    ['gilet', 'gilet di lana', 'Gilet', 'busto', [T], .016, '#5a4a3a', 5, .3, .12],
    ['grembiule', 'grembiule da bottega', 'Grembiule', 'busto', [T, H, C], .012, '#ece8dc', 2, .3, 0],
    ['vestiti', 'vestito da casa', 'Vestito', 'busto', [T, B, H, C], .012, '#5a6a7a', 8, 1.5, .2],
    ['tuta', 'tuta da lavoro', 'Tuta', 'busto', [T, B, A, H, C, P], .016, '#3a5a7a', 8, 1, .15],
    // sopra
    ['giacca', 'giacca di panno', 'Giacca', 'busto', [T, B, A, H], .024, '#8c2f24', 12, 1.2, .25],
    ['giacca_pelle', 'giacca di pelle', 'Chiodo', 'busto', [T, B, A], .026, '#241a16', 20, 2, .35],
    ['giubbotto_jeans', 'giubbotto di jeans', 'Jeans (giubb.)', 'busto', [T, B, A], .024, '#4a6a9a', 10, 1.2, .2],
    ['piumino', 'piumino imbottito', 'Piumino', 'busto', [T, B, A], .045, '#2e5a4a', 22, 1.5, .55],
    ['cappotto', 'cappotto lungo', 'Cappotto', 'busto', [T, B, A, H, C], .03, '#3a3e4a', 20, 2.5, .5],
    ['impermeabile', 'impermeabile', 'Impermeabile', 'busto', [T, B, A, H, C], .028, '#8a7a4a', 14, 1, .2],
    ['montone', 'giaccone di montone', 'Montone', 'busto', [T, B, A, H], .045, '#7a5a3a', 30, 3, .6],
    ['divisa', 'divisa dei Grigi', 'Divisa', 'busto', [T, B, A, H], .022, '#4a5060', 0, 2, .3, { ill: 1 }],
    ['giubbotto', 'giubbotto antiproiettile', 'Antiproiettile', 'busto', [T], .04, '#3e4a32', 80, 6, .1, { arm: .45, ill: 1 }],
    ['scialle', 'scialle di lana', 'Scialle', 'busto', [T, B], .03, '#6a4a6a', 6, .5, .2],
    // gambe
    ['mutande', 'mutande', 'Mutande', 'gambe', [H], .006, '#e8e2d4', 1, .05, 0],
    ['calze_nylon', 'calze di nylon', 'Calze', 'gambe', [H, C, P], .003, '#2a2024', 2, .05, .02],
    ['calzamaglia', 'calzamaglia di lana', 'Calzamaglia', 'gambe', [H, C, P], .006, '#3a2a2a', 3, .2, .15],
    ['pantaloni', 'pantaloni di panno', 'Pantaloni', 'gambe', [H, C, P], .014, '#3a3a40', 8, .8, .15],
    ['jeans', 'jeans', 'Jeans', 'gambe', [H, C, P], .014, '#2e4a7a', 10, .8, .12],
    ['velluto', 'pantaloni di velluto', 'Velluto', 'gambe', [H, C, P], .016, '#6a4a2a', 9, .9, .18],
    ['pantaloni_lavoro', 'pantaloni da lavoro', 'Da lavoro', 'gambe', [H, C, P], .016, '#4a4a3a', 7, 1, .15],
    ['pantaloni_grigi', 'pantaloni della divisa', 'Grigi', 'gambe', [H, C, P], .014, '#3a404c', 0, .8, .15, { ill: 1 }],
    ['gonna', 'gonna di lana', 'Gonna', 'gambe', [H, C], .03, '#5a2a3a', 8, .6, .12],
    ['pantaloncini', 'pantaloncini', 'Calzoncini', 'gambe', [H, C], .012, '#c8b88a', 3, .3, 0],
    // piedi
    ['calzini', 'calzini di lana', 'Calzini', 'piedi', [F], .005, '#6a6a70', 1, .05, .05],
    ['scarpe', 'scarponi', 'Scarponi', 'piedi', [F], .02, '#3a2a1e', 12, 1.5, .1],
    ['scarpe_eleganti', 'scarpe di cuoio', 'Scarpe buone', 'piedi', [F], .014, '#1a1414', 15, .8, .05],
    ['scarpe_tela', 'scarpe di tela', 'Tela', 'piedi', [F], .012, '#d8d4c8', 4, .5, .02],
    ['stivali', 'stivali di gomma', 'Stivali', 'piedi', [F, P], .02, '#1e2a22', 10, 2, .1],
    ['ciabatte', 'ciabatte', 'Ciabatte', 'piedi', [F], .01, '#6a4a6a', 1, .3, 0],
    // mani e collo
    ['guanti_lana', 'guanti di lana', 'Guanti lana', 'mani', [M], .006, '#5a2a2a', 2, .1, .1],
    ['guanti', 'guanti di pelle', 'Guanti', 'mani', [M], .006, '#2a1e18', 6, .2, .08],
    ['sciarpa', 'sciarpa', 'Sciarpa', 'collo', [], .03, '#a83a3a', 3, .2, .1, { acc: 'sciarpa' }],
    // testa
    ['berretto', 'berretto di lana', 'Berretto', 'testa', [], 0, '#3a3a44', 2, .1, .15, { acc: 'beanie' }],
    ['coppola', 'coppola', 'Coppola', 'testa', [], 0, '#5a4a3a', 3, .1, .05, { acc: 'flat' }],
    ['cappello', 'cappello di feltro', 'Cappello', 'testa', [], 0, '#2a2420', 8, .2, .05, { acc: 'fedora' }],
    ['colbacco', 'colbacco di pelo', 'Colbacco', 'testa', [], 0, '#4a3a2e', 10, .3, .25, { acc: 'ushanka' }],
    ['fazzoletto', 'fazzoletto da testa', 'Foulard', 'testa', [], 0, '#8a3a5a', 2, .05, .05, { acc: 'scarf' }],
    ['casco', 'casco da moto', 'Casco', 'testa', [], 0, '#c83a2a', 15, 1, .05, { acc: 'casco', arm: .08 }],
    ['elmetto', 'elmetto', 'Elmetto', 'testa', [], 0, '#3e4a32', 6, 1.2, 0, { acc: 'elmetto', arm: .1, ill: 1 }],
    ['passamontagna', 'passamontagna', 'Passamont.', 'testa', [], 0, '#1a1a1e', 2, .1, .1, { acc: 'passamontagna', ombra: 1 }],
    ['maschera_gas', 'maschera antigas', 'Antigas', 'testa', [], 0, '#3a3e36', 10, 1, 0, { acc: 'antigas', ombra: 1 }],
    // posti a parte
    ['paraspalle', 'paraspalle di cuoio', 'Paraspalle', 'spalle', [], 0, '#4a3a2a', 8, 1, 0, { acc: 'paraspalle', arm: .05 }],
    ['paraginocchia', 'paraginocchia', 'Ginocchiere', 'ginocchia', [], 0, '#2a2a2e', 5, .6, 0, { acc: 'paraginocchia', arm: .03 }],
    ['zaino', 'zaino militare', 'Zaino', 'schiena', [], 0, '#4a5a3a', 8, 1, 0, { acc: 'zaino' }],
    // --- il guardaroba largo: completi, pellicce, sport, estate, donna, accessori ---
    ['polo', 'polo', 'Polo', 'busto', [T, B], .009, '#2a5a4a', 4, .2, .05, { acc: 'colletto' }],
    ['camicia_hawaii', 'camicia a fiori', 'Hawaiana', 'busto', [T, B], .009, '#c8583a', 5, .2, 0, { pat: 'fiori' }],
    ['maglia_calcio', 'maglia da calcio', 'Maglia calcio', 'busto', [T, B], .009, '#1e3a8a', 4, .2, .02, { pat: 'righe_v' }],
    ['felpa_zip', 'felpa sportiva con la zip', 'Felpa tuta', 'busto', [T, B, A], .016, '#7a1e2a', 7, .5, .15, { pat: 'bande' }],
    ['giacca_completo', 'giacca del completo', 'Giacca compl.', 'busto', [T, B, A, H], .02, '#2a2e3a', 25, 1.2, .2, { acc: 'risvolti' }],
    ['pelliccia', 'pelliccia maculata', 'Pelliccia', 'busto', [T, B, A, H, C], .05, '#c8a060', 60, 3, .7, { pat: 'maculato' }],
    ['pelliccia_volpe', 'pelliccia di volpe', 'Volpe', 'busto', [T, B, A, H], .055, '#a8642e', 70, 2.5, .65, { pat: 'pelo' }],
    ['poncho', 'poncho di lana', 'Poncho', 'busto', [T, B, A, H], .045, '#8a3a2a', 9, 1.2, .35, { pat: 'righe' }],
    ['vestito_corto', 'vestito corto', 'Vestito corto', 'busto', [T, H, C], .012, '#3a1e3a', 12, .4, .05],
    ['vestito_lungo', 'vestito lungo', 'Vestito lungo', 'busto', [T, B, H, C, P], .014, '#1e2a3a', 18, .7, .1],
    ['vestito_fiori', 'vestitino a fiori', 'A fiori', 'busto', [T, H, C], .012, '#e8d8b8', 10, .4, .05, { pat: 'fiori' }],
    ['tuta_ginnastica', 'tuta da ginnastica', 'Tuta ginn.', 'busto', [T, B, A, H, C, P], .015, '#2a3a7a', 9, .9, .12, { pat: 'bande' }],
    ['cargo', 'pantaloni cargo', 'Cargo', 'gambe', [H, C, P], .017, '#4a5038', 9, 1, .15, { acc: 'tasconi' }],
    ['pantaloni_completo', 'pantaloni del completo', 'Pant. compl.', 'gambe', [H, C, P], .013, '#2a2e3a', 15, .7, .12],
    ['bermuda', 'bermuda', 'Bermuda', 'gambe', [H, C], .013, '#7a8a5a', 4, .4, 0, { pat: 'quadretti' }],
    ['minigonna', 'minigonna di jeans', 'Minigonna', 'gambe', [H], .016, '#3a5a8a', 6, .3, 0],
    ['leggings', 'fuseaux fosforescenti', 'Fuseaux', 'gambe', [H, C, P], .004, '#d83a8a', 4, .2, .05],
    ['sandali', 'sandali', 'Sandali', 'piedi', [F], .008, '#6a4a2a', 4, .4, 0],
    ['tacchi', 'scarpe col tacco', 'Tacchi', 'piedi', [F], .012, '#8a1e2a', 18, .5, 0, { acc: 'tacco' }],
    ['scarpe_corsa', 'scarpe da corsa', 'Da corsa', 'piedi', [F], .016, '#ece8e0', 14, .6, .03, { pat: 'bande' }],
    ['stivali_pelle', 'stivali di pelle', 'Stivali pelle', 'piedi', [F, P], .016, '#2a1a14', 24, 1.5, .1],
    ['mocassini', 'mocassini', 'Mocassini', 'piedi', [F], .012, '#5a2e1a', 16, .5, .02],
    ['cravatta', 'cravatta', 'Cravatta', 'collo', [], 0, '#7a1a1e', 6, .1, 0, { acc: 'cravatta' }],
    ['papillon', 'papillon', 'Papillon', 'collo', [], 0, '#141418', 5, .05, 0, { acc: 'papillon' }],
    ['collana_oro', 'catenone d\'oro', 'Catenone', 'collo', [], 0, '#e8c040', 60, .2, 0, { acc: 'collana' }],
    ['collana_perle', 'collana di perle', 'Perle', 'collo', [], 0, '#f0ece2', 40, .1, 0, { acc: 'perle' }],
    ['sciarpa_righe', 'sciarpa a righe', 'Sciarpa righe', 'collo', [], .03, '#2a5a3a', 4, .2, .12, { acc: 'sciarpa' }],
    ['foulard', 'foulard di seta', 'Foulard collo', 'collo', [], 0, '#c8983a', 12, .05, .02, { acc: 'foulard' }],
    ['occhiali_sole', 'occhiali da sole a goccia', 'Ray-Ban', 'testa', [], 0, '#141418', 20, .05, 0, { acc: 'occhiali' }],
    ['cappellino', 'cappellino da baseball', 'Cappellino', 'testa', [], 0, '#2a3a7a', 3, .1, .02, { acc: 'cap' }],
    ['basco', 'basco', 'Basco', 'testa', [], 0, '#1e1e24', 4, .1, .05, { acc: 'basco' }],
    ['fascia', 'fascia per capelli', 'Fascia', 'testa', [], 0, '#e83a6a', 1, .02, 0, { acc: 'fascia' }],
    ['orologio_polso', 'orologio da polso', 'Orologio', 'mani', [], 0, '#c8c8cc', 25, .1, 0, { acc: 'orologio' }],
    ['anelli', 'anelli d\'oro', 'Anelli', 'mani', [], 0, '#e8c040', 30, .05, 0, { acc: 'anelli' }],
    ['marsupio', 'marsupio', 'Marsupio', 'schiena', [], 0, '#3a3a6a', 5, .3, 0, { acc: 'marsupio' }],
    ['borsetta', 'borsetta', 'Borsetta', 'schiena', [], 0, '#6a1e2a', 15, .4, 0, { acc: 'borsetta' }],
    // maglioni, camicie e cravatte con disegno
    ['maglione_v', 'maglione con lo scollo a V', 'Scollo a V', 'busto', [T, B, A], .016, '#2a3a5a', 9, .7, .28],
    ['maglione_collo_alto', 'maglione a collo alto', 'Collo alto', 'busto', [T, B, A, N], .02, '#d8d0bc', 11, .9, .35],
    ['camicia_righe', 'camicia a righe', 'Camicia righe', 'busto', [T, B, A], .01, '#e8ecf4', 5, .25, .08],
    ['camicia_vichy', 'camicia a quadretti', 'Camicia vichy', 'busto', [T, B, A], .01, '#e8e4dc', 5, .25, .08],
    ['camicia_jeans', 'camicia di jeans', 'Camicia jeans', 'busto', [T, B, A], .012, '#5a7aa8', 7, .35, .1],
    ['camicia_fiori', 'camicia a fiorellini', 'Camicia fiori', 'busto', [T, B, A], .01, '#e8e0cc', 6, .25, .08],
    ['cravatta_righe', 'cravatta regimental', 'Regimental', 'collo', [], 0, '#1e2a5a', 8, .1, 0, { acc: 'cravatta', dis: 'regimental' }],
    ['cravatta_pois', 'cravatta a pois', 'Cravatta pois', 'collo', [], 0, '#7a1a1e', 8, .1, 0, { acc: 'cravatta', dis: 'pois' }],
    ['cravatta_cachemire', 'cravatta cachemire', 'Cachemire', 'collo', [], 0, '#5a2a4a', 10, .1, 0, { acc: 'cravatta', dis: 'paisley' }],
    ['cravatta_fiori', 'cravatta a fiorellini', 'Cravatta fiori', 'collo', [], 0, '#2a4a3a', 9, .1, 0, { acc: 'cravatta', dis: 'liberty' }],
    ['cravatta_maglia', 'cravatta di maglia', 'Cravatta maglia', 'collo', [], 0, '#3a2a22', 7, .1, 0, { acc: 'cravatta', dis: 'costine' }],

    // streetwear: skater e maranza
    ['maglietta_oversize', 'maglietta oversize stampata', 'Oversize', 'busto', [T, B], .01, '#ece8e0', 8, .25, .05],
    ['felpa_skate', 'felpa larga col cappuccio', 'Felpa skate', 'busto', [T, B, A], .022, '#3a5a3a', 16, .7, .25],
    ['canotta_basket', 'canotta da basket', 'Canotta basket', 'busto', [T], .008, '#e8a020', 7, .15, 0],
    ['giacca_tuta', 'giacca della tuta', 'Giacca tuta', 'busto', [T, B, A], .014, '#141418', 14, .5, .12, { pat: 'bande' }],
    ['smanicato', 'smanicato imbottito', 'Smanicato', 'busto', [T], .03, '#141418', 18, .5, .3],
    ['piumino_oca', 'piumino d\'oca lucido', 'Piumino d\'oca', 'busto', [T, B, A], .05, '#141418', 40, 1.1, .75],
    ['pantaloni_tuta', 'pantaloni della tuta', 'Pant. tuta', 'gambe', [H, C, P], .012, '#141418', 10, .5, .1, { pat: 'bande' }],
    ['jeans_larghi', 'jeans larghi da skate', 'Jeans larghi', 'gambe', [H, C, P], .018, '#6a8ab8', 16, .9, .12],
    ['calze_sport', 'calze di spugna alte', 'Calze sport', 'piedi', [F, P], .006, '#f4f2ee', 2, .05, .05],
    ['scarpe_skate', 'scarpe da skate', 'Da skate', 'piedi', [F], .018, '#1a1a1e', 18, .8, .03],
    ['scarpe_air', 'scarpe da ginnastica bianche', 'Sneakers', 'piedi', [F], .018, '#f4f2ee', 26, .6, .03],
    ['cappellino_dritto', 'cappellino a visiera piatta', 'Snapback', 'testa', [], 0, '#141418', 9, .1, .02, { acc: 'snapback' }],
    ['berretto_corto', 'berretto corto da pescatore', 'Docker', 'testa', [], 0, '#c83a2a', 5, .1, .12, { acc: 'docker' }],
    ['borsello', 'borsello a tracolla', 'Borsello', 'schiena', [], 0, '#141418', 18, .3, 0, { acc: 'borsello' }],
    ['marsupio_tracolla', 'marsupio a tracolla', 'Tracolla', 'schiena', [], 0, '#2a2a30', 14, .3, 0, { acc: 'tracolla' }],
    ['passamontagna_punte', 'passamontagna a maglia con le punte', 'Passam. punte', 'testa', [], 0, '#2aa86a', 9, .1, .12, { acc: 'pm_punte' }],
    ['passamontagna_orecchie', 'passamontagna a maglia con le orecchie', 'Passam. gatto', 'testa', [], 0, '#e8587a', 9, .1, .12, { acc: 'pm_orecchie' }],
    ['passamontagna_righe', 'passamontagna a righe', 'Passam. righe', 'testa', [], 0, '#e8a020', 7, .1, .12, { acc: 'pm_righe' }],
    ['bandana', 'bandana tirata su', 'Bandana', 'testa', [], 0, '#a82a2a', 3, .05, .02, { acc: 'bandana', ombra: 1 }],
    ['catenina', 'catenina d\'argento', 'Catenina', 'collo', [], 0, '#d8d8dc', 18, .05, 0, { acc: 'catenina' }],
  ];
  const CAPO = {};
  CAPI.forEach(([id, nome, corto, zona, parti, sp, col, prezzo, peso, calore, ex]) => {
    CAPO[id] = Object.assign({ id, nome, corto, zona, parti, sp, col, calore }, ex || {});
    const c = CAT[id];
    if (c) Object.assign(c, { calore, corto, capo: 1 }, ex && ex.ill ? { ill: 1 } : {});   // gli id che c'erano restano, con i dati nuovi
    else CAT[id] = Object.assign({ id, nome, cat: 'vestiti', prezzo, peso, q: 4, calore, corto, capo: 1 }, ex && ex.ill ? { ill: 1 } : {});
  });
  // nei negozi e nei mobili
  const sell = (ref, ids) => { const row = O.SHOPLIST.find(r => r[0] === ref); if (row) ids.forEach(id => { if (!row[1].includes(id)) row[1].push(id); }); };
  sell('use:sartoria', ['canotta', 'maglietta', 'camicia', 'camicia_quadri', 'dolcevita', 'felpa', 'gilet', 'giacca', 'impermeabile', 'mutande', 'pantaloni', 'velluto', 'gonna', 'calzamaglia', 'calzini', 'scialle', 'coppola', 'cappello', 'fazzoletto', 'sciarpa', 'guanti_lana']);
  sell('use:emporio', ['canotta', 'mutande', 'calzini', 'maglietta', 'pantaloni_lavoro', 'scarpe_tela', 'ciabatte', 'berretto', 'grembiule', 'tuta']);
  sell('villaggio', ['colbacco', 'montone', 'calzamaglia', 'poncho']);
  sell('use:sartoria', ['polo', 'giacca_completo', 'pantaloni_completo', 'cravatta', 'papillon', 'vestito_corto', 'vestito_lungo', 'vestito_fiori', 'minigonna', 'basco', 'foulard', 'sciarpa_righe', 'mocassini', 'tacchi', 'borsetta']);
  sell('use:emporio', ['bermuda', 'sandali', 'cappellino', 'fascia', 'leggings', 'tuta_ginnastica', 'scarpe_corsa', 'felpa_zip', 'maglia_calcio', 'marsupio']);
  sell('use:sartoria', ['maglione_v', 'maglione_collo_alto', 'camicia_righe', 'camicia_vichy', 'camicia_fiori', 'cravatta_righe', 'cravatta_pois', 'cravatta_cachemire', 'cravatta_fiori', 'cravatta_maglia']);
  sell('use:emporio', ['maglione_v', 'camicia_jeans', 'camicia_vichy']);
  sell('use:emporio', ['maglietta_oversize', 'felpa_skate', 'canotta_basket', 'giacca_tuta', 'pantaloni_tuta', 'calze_sport', 'scarpe_skate', 'cappellino_dritto', 'berretto_corto', 'marsupio_tracolla', 'passamontagna_punte', 'passamontagna_orecchie', 'passamontagna_righe', 'bandana']);
  O.SHOPLIST.filter(r => /mercato|magazzino|porto/.test(r[0])).forEach(r => ['smanicato', 'piumino_oca', 'jeans_larghi', 'scarpe_air', 'borsello', 'catenina'].forEach(id => { if (!r[1].includes(id)) r[1].push(id); }));
  O.SHOPLIST.filter(r => /mercato|magazzino|porto/.test(r[0])).forEach(r => ['jeans', 'giubbotto_jeans', 'giacca_pelle', 'piumino', 'scarpe_eleganti', 'maglietta_righe', 'casco', 'paraginocchia', 'paraspalle', 'pelliccia', 'pelliccia_volpe', 'collana_oro', 'occhiali_sole', 'camicia_hawaii', 'cargo', 'stivali_pelle', 'orologio_polso', 'anelli', 'collana_perle'].forEach(id => { if (!r[1].includes(id)) r[1].push(id); }));
  if (O.LOOT) { const add = (k, l) => { O.LOOT[k] = (O.LOOT[k] || []).concat(l); };
    add('bookcaseClosedWide', [['canotta', .3, 1, 2], ['mutande', .3, 1, 2], ['calzini', .3, 1, 3], ['camicia', .2, 1, 1], ['pantaloni', .15, 1, 1], ['dolcevita', .08, 1, 1], ['gonna', .1, 1, 1], ['camicia_quadri', .1, 1, 1]]);
    add('bookcaseClosedWide', [['polo', .1, 1, 1], ['vestito_corto', .08, 1, 1], ['vestito_lungo', .05, 1, 1], ['cravatta', .15, 1, 2], ['bermuda', .1, 1, 1], ['camicia_hawaii', .04, 1, 1], ['pelliccia', .02, 1, 1], ['collana_perle', .02, 1, 1]]);
    add('coatRackStanding', [['occhiali_sole', .05, 1, 1], ['borsetta', .06, 1, 1], ['coppola', .2, 1, 1], ['cappello', .15, 1, 1], ['giacca', .15, 1, 1], ['montone', .05, 1, 1]]); }

  // ---------------- ADDOSSO ----------------
  // st.ogg.worn = { busto: [dentro → fuori], …, dx/sx: le mani (la destra è quella del motore: arma o attrezzo) }
  const START = { gambe: ['mutande', 'jeans'], busto: ['canotta', 'maglietta', 'giacca'], piedi: ['calzini', 'scarpe'] };
  function worn(st) {
    const M = O.S(st); if (!M.worn || !M.worn.v2) { const old = M.worn || {}; M.worn = { v2: 1 }; ZORD.forEach(z => { M.worn[z] = (START[z] || []).slice(); }); Object.entries(old).forEach(([k, id]) => { if (CAPO[id] && !M.worn[CAPO[id].zona].includes(id)) M.worn[CAPO[id].zona].push(id); }); if (old.sx) M.worn.sx = old.sx; }
    return M.worn;
  }
  const R_ = (ok, msg) => ({ ok, msg });
  const nm = id => (CAT[id] ? CAT[id].nome : id);
  const bag = st => O.inv(st);
  const take = (st, id) => { const b = bag(st); if (!(b[id] >= 1)) return false; b[id] = r1(b[id] - 1); if (b[id] <= 0) delete b[id]; return true; };
  const give = (st, id) => { const b = bag(st); b[id] = r1((b[id] || 0) + 1); };
  // indossa sopra (o al posto `at` della pila)
  function wear(st, id, at) {
    const C = CAPO[id]; if (!C) return R_(false, 'Non si indossa.');
    if (!take(st, id)) return R_(false, 'Non ce l\'hai.');
    const W = worn(st), L = W[C.zona]; let out = '';
    if (!ZONE[C.zona].pila && L.length) { const old = L.pop(); give(st, old); out = ` al posto di ${nm(old)}`; }
    let pos; if (at === undefined || at >= L.length) { L.push(id); pos = L.length - 1; } else { pos = Math.max(0, at); L.splice(pos, 0, id); }
    W.when = W.when || {}; W.when[id] = (W.n = (W.n || 0) + 1);   // l'ordine vero in cui ti vesti (tra zone diverse: camicia dentro o fuori, calzini sopra i pantaloni, pantaloni dentro gli stivali)
    upd(st); const sotto = L[pos + 1];
    return R_(true, `Indossi ${nm(id)}${out}${sotto ? ` sotto ${nm(sotto)}` : L.length > 1 && pos > 0 ? ` sopra ${nm(L[pos - 1])}` : ''}.`);
  }
  function unwear(st, zona, i) {
    const W = worn(st);
    if (zona === 'sx' || zona === 'dx') { const id = W[zona]; if (!id) return R_(false, 'La mano è vuota.'); delete W[zona]; give(st, id); upd(st); return R_(true, `Metti via ${nm(id)}.`); }
    const L = W[zona]; if (!L || !L.length) return R_(false, 'Lì non hai niente.');
    const k = i === undefined ? L.length - 1 : i, id = L[k]; if (!id) return R_(false, 'Lì non hai niente.');
    L.splice(k, 1); give(st, id); upd(st); return R_(true, `Ti togli ${nm(id)}.`);
  }
  // sposta un capo nella pila (da i a j): sopra o sotto
  function move(st, zona, i, j) {
    const L = worn(st)[zona]; if (!L || !L[i] || i === j) return R_(false, '');
    const [id] = L.splice(i, 1); L.splice(Math.max(0, Math.min(L.length, j)), 0, id); upd(st);
    return R_(true, `${cap(nm(id))}: ${j > i ? 'sopra' : 'sotto'}.`);
  }
  function strip(st, all) {
    const W = worn(st); let n = 0;
    ZORD.forEach(z => { const L = W[z], keep = []; L.forEach(id => { if (!all && ['mutande', 'canotta'].includes(id) && !keep.includes(id)) keep.push(id); else { give(st, id); n++; } }); W[z] = keep; });
    upd(st); return R_(!!n, n ? (all ? 'Ti spogli del tutto. Fa freddo.' : 'Ti spogli: resti in mutande e canottiera.') : 'Non hai niente da togliere.');
  }
  // le mani: la destra è quella del motore (arma o attrezzo); la sinistra tiene un oggetto qualunque fino a 3 kg
  const canHold = id => !!CAT[id] && !CAPO[id] && CAT[id].peso <= 3 && !CAT[id].st;
  function hold(st, id) {
    if (!canHold(id)) return R_(false, 'In mano non ci sta, o va indossato.');
    if (!take(st, id)) return R_(false, 'Non ce l\'hai.');
    const W = worn(st), old = W.sx; if (old) give(st, old); W.sx = id; upd(st); return R_(true, `Nella sinistra: ${nm(id)}.`);
  }
  // scambia le mani: quello che hai nella sinistra passa alla destra (se si impugna), e viceversa
  function swap(st) {
    const W = worn(st), p = st.player, AZ = typeof Azioni !== 'undefined' ? Azioni : null; const dx = p.hand || (p.cur && p.cur !== 'pugni' ? p.cur : null), sx = W.sx || null;
    if (!dx && !sx) return R_(false, 'Hai le mani vuote.');
    if (sx) { give(st, sx); delete W.sx; }
    if (AZ && AZ.playerEquip) { if (sx && !AZ.playerEquip(st, sx)) { take(st, sx); W.sx = sx; return R_(false, `${cap(nm(sx))} non si impugna con la destra.`); } if (!sx) AZ.playerEquip(st, null); }
    if (dx && canHold(dx) && bag(st)[dx] >= 1) { take(st, dx); W.sx = dx; }
    upd(st); return R_(true, 'Cambi mano.');
  }
  // usare quello che hai nella sinistra: si mangia, si beve, si accende
  function useLeft(st) {
    const W = worn(st), id = W.sx; if (!id) return R_(false, 'Nella sinistra non hai niente.');
    if (CAT[id].eat) { give(st, id); delete W.sx; const r = O.act(st, 'usa', id); if (bag(st)[id] >= 1) { take(st, id); W.sx = id; } return r; }
    return R_(false, `${cap(nm(id))}: tenuta pronta nella sinistra.`);
  }
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
  function list(st) { const W = worn(st), out = []; ZORD.forEach(z => W[z].forEach(id => out.push(id))); return out; }
  const warmth = st => r1(list(st).reduce((s, id) => s + (CAPO[id].calore || 0), 0));
  const armor = st => Math.min(.6, r1(list(st).reduce((s, id) => s + (CAPO[id].arm || 0), 0)));
  function upd(st) { const p = st.player; p.armor = armor(st); p.worn = worn(st); p.wornV = (p.wornV || 0) + 1; }
  function view(st) {
    const W = worn(st), p = st.player;
    return { zone: ZORD.map(z => ({ zona: z, nome: ZONE[z].nome, pila: ZONE[z].pila, capi: W[z].map((id, i) => ({ id, i, nome: nm(id), corto: CAPO[id].corto })) })),
      dx: p.hand || (p.cur && p.cur !== 'pugni' ? p.cur : null), sx: W.sx || null, calore: warmth(st), arm: armor(st), nudo: !W.busto.length && !W.gambe.length };
  }
  // quello che si vede, per il disegno: [{ id, col, parti, sp, acc }] dal dentro al fuori, zona per zona
  function outfitOfPlayer(st) { const W = worn(st), out = [], wh = W.when || {}; ZORD.forEach(z => W[z].forEach((id, k) => out.push(Object.assign({}, CAPO[id], { when: wh[id] || 0, k })))); return out; }

  // ---------------- GLI ABITANTI SI VESTONO ----------------
  // secondo chi sono: mestiere, parte, età, donna o uomo, soldi. Il colore di fuori resta quello del loro aspetto (look.top/bottom),
  // così chi li ricorda «con la giacca rossa» li riconosce.
  const PAL = ['#3a3e4a', '#5a4a3a', '#2a3a2e', '#6a3a2a', '#4a4a52', '#7a6a4a', '#2e3a4e', '#5a2a2a', '#8a7a5a', '#3a2e2a', '#6a6a60', '#2a2a2e'];
  function outfitOf(n, fem) {
    const L = n.look || {}, h = hash((n.id || '') + (L.top || '') + (L.skin || '')), r = (k, m) => ((h >>> k) % m), pk = (a, k) => a[r(k, a.length)];
    const job = String((n.pop && n.pop.job && (n.pop.job.base || n.pop.job.title)) || n.role || '').toLowerCase(), age = (n.pop && n.pop.age) || 35, rich = n.pop && n.pop.money > 60;
    const o = [], put = (id, col) => { if (CAPO[id]) o.push(Object.assign({}, CAPO[id], col ? { col } : {})); };
    const mute = c => { if (!c || c[0] !== '#' || c.length < 7) return c; const v = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), m = (v[0] + v[1] + v[2]) / 3; return '#' + v.map(x => Math.round((x * .45 + m * .55) * .78).toString(16).padStart(2, '0')).join(''); };   // l'inverno spegne i colori
    const top = mute(L.top), bot = mute(L.bottom);
    put('mutande'); if (fem && r(1, 3)) put(age > 45 ? 'calzamaglia' : 'calze_nylon', fem && age > 45 ? '#3a2a2a' : null);
    if (n.cop || n.military || /guardia|grigi|tutela|soldat|sentinella/.test(job)) {
      put('canotta'); put('camicia', '#8a8e96'); put('pantaloni_grigi', bot); put('divisa', top || '#4a5060'); if (r(3, 3) === 0) put('giubbotto');
      put('calzini'); put('stivali', '#141416'); put(r(5, 2) ? 'elmetto' : 'coppola', '#3a404c'); if (r(7, 4) === 0) put('paraspalle', '#2a2e36'); return o;
    }
    if (/beduin|pastore|nomade/.test(job) || (n.faction === 'beduini')) { put('canotta'); put('vestiti', '#8a7a5a'); put('scialle', top || '#6a5a3a'); put('pantaloni', bot || '#5a4a3a'); put('scarpe'); put('fazzoletto', pk(['#8a6a3a', '#5a3a2a', '#c8b88a'], 9)); return o; }
    // sotto
    put(r(2, 4) ? 'canotta' : 'maglietta');
    // gambe
    if (fem && (age > 40 || r(4, 2))) put('gonna', bot); else put(/pesc|scaric|operai|mecc|minat|carbon|bosc|bracc|edil|murat/.test(job) ? 'pantaloni_lavoro' : age < 30 && r(6, 2) ? 'jeans' : r(6, 3) ? 'pantaloni' : 'velluto', bot);
    put('calzini');
    // busto e piedi secondo il mestiere
    if (/pesc|marinai|scaricat|porto/.test(job)) { put('maglietta_righe'); put('maglione', pk(PAL, 8)); put('impermeabile', top || '#c8a83a'); put('stivali'); put(r(9, 2) ? 'berretto' : 'coppola', pk(PAL, 10)); }
    else if (/operai|mecc|minat|carbon|fabbr|saldat|edil|murat|scaric/.test(job)) { put('camicia_quadri', pk(['#8a2a24', '#2a4a6a', '#3a5a3a'], 8)); put('tuta', top || '#3a5a7a'); put('scarpe'); put(r(9, 3) ? 'coppola' : 'berretto', pk(PAL, 10)); if (/minat|saldat/.test(job)) put('paraginocchia'); }
    else if (/bosc|taglialegna|pastor|bracc|contad|vign|ortol/.test(job)) { put('camicia_quadri', pk(['#8a2a24', '#5a3a2a', '#3a5a3a'], 8)); put('gilet', pk(PAL, 11)); put('montone', top || '#7a5a3a'); put('stivali'); put(r(9, 2) ? 'colbacco' : 'coppola'); }
    else if (/forn|panett|macell|cuoc|bar|camerier|oste|bottega|commess|aliment|droghier/.test(job)) { put('camicia'); put('maglione', top || pk(PAL, 8)); put('grembiule'); put(fem ? 'scarpe_tela' : 'scarpe'); if (fem) put('fazzoletto', pk(['#8a3a5a', '#3a5a8a', '#c8b88a'], 9)); }
    else if (/impieg|banc|notai|avvoc|medic|maestr|profess|prete|sacrest|biblio|ragion/.test(job) || rich) { put('camicia'); put(r(8, 2) ? 'gilet' : 'dolcevita', pk(PAL, 8)); put('giacca', pk(PAL, 11)); put('cappotto', top || '#3a3e4a'); put('scarpe_eleganti'); if (r(9, 2)) put('cappello'); put('sciarpa', pk(['#a83a3a', '#2a2a2e', '#c8b88a', '#3a5a8a'], 12)); if (fem) put('guanti'); }
    else if (age < 26 && r(13, 3) < 2) {   // i ragazzi: skater o maranza
      const legs = (id, col) => { const i = o.findIndex(x => x.zona === 'gambe' && !/mutande|calze|calzamaglia/.test(x.id)); const v = Object.assign({}, CAPO[id], col ? { col } : {}); if (i >= 0) o[i] = v; else o.push(v); return v; };
      if (r(13, 3) === 0) {   // skater: oversize, felpa larga, jeans larghi o cargo, scarpe da skate, berretto corto o cappellino
        legs(r(14, 3) ? 'jeans_larghi' : 'cargo', r(14, 3) ? pk(['#6a8ab8', '#2a3a5a', '#1a1a1e'], 15) : pk(['#4a5038', '#8a7a5a', '#2a2a2e'], 15));
        put('maglietta_oversize', pk(['#ece8e0', '#1a1a1e', '#c8b88a', '#5a7a9a', '#8a2a2a'], 8)); if (r(9, 2)) put('felpa_skate', pk(['#3a5a3a', '#5a5e66', '#8a3a2a', '#2a3a5a', '#c8a03a'], 9));
        put('scarpe_skate', pk(['#1a1a1e', '#8a2a2a', '#2a3a5a', '#ece6da'], 10)); if (r(11, 2)) put(r(12, 2) ? 'berretto_corto' : 'cappellino_dritto', pk(['#c83a2a', '#e8a020', '#1a1a1e', '#2a5a3a'], 12));
      } else {   // maranza: tuta nera lucida, calze bianche sopra i pantaloni, smanicato o piumino d'oca, sneakers bianche, borsello, cappellino dritto, catenina
        const pa = legs('pantaloni_tuta', pk(['#141418', '#1e2a4a', '#2a2a2e'], 15)); pa.when = 1; const cs = o.find(x => x.id === 'calzini'); if (cs) Object.assign(cs, CAPO.calze_sport, { when: 2 });
        put(r(8, 2) ? 'maglietta' : 'canotta_basket', pk(['#f4f2ee', '#141418', '#e8a020'], 8));
        put(r(9, 3) === 0 ? 'giacca_tuta' : r(9, 3) === 1 ? 'smanicato' : 'piumino_oca', pk(['#141418', '#1e2a4a', '#3a3e44', '#e8e4dc'], 9));
        put('scarpe_air'); put('cappellino_dritto', pk(['#141418', '#1e2a4a', '#e8e4dc'], 12)); put(r(10, 2) ? 'borsello' : 'marsupio_tracolla', pk(['#141418', '#2a2a30', '#5a4a3a'], 11)); if (r(11, 2)) put(r(12, 3) ? 'catenina' : 'collana_oro');
      } }
    else if (age < 26) { put(r(8, 2) ? 'felpa' : 'maglione', pk(PAL, 8)); put(r(9, 3) ? 'giubbotto_jeans' : r(9, 2) ? 'giacca_pelle' : 'piumino', top); put(r(10, 2) ? 'scarpe_tela' : 'scarpe'); if (r(11, 3) === 0) put('berretto', pk(PAL, 12)); }
    else if (fem) { put('camicia', pk(['#f0ece2', '#e8d8d0', '#d8e0e8'], 8)); put(r(8, 2) ? 'maglione' : 'scialle', pk(PAL, 9)); put('cappotto', top); put(age > 50 ? 'scarpe_eleganti' : 'scarpe_tela', '#2a2020'); if (age > 50 || r(10, 2)) put('fazzoletto', pk(['#8a3a5a', '#3a5a8a', '#6a4a2a', '#2a2a2e'], 11)); }
    else { put(r(8, 2) ? 'camicia' : 'camicia_quadri', pk(['#f0ece2', '#8a2a24', '#2a4a6a'], 7)); put('maglione', pk(PAL, 9)); put(r(10, 2) ? 'giacca' : 'cappotto', top); put('scarpe'); if (r(11, 3) === 0) put(pk(['coppola', 'berretto', 'cappello'], 12)); if (r(12, 3) === 0) put('sciarpa', pk(['#a83a3a', '#2a2a2e', '#3a5a8a'], 13)); }
    if (n.faction && /famiglia|marsiglia|squalo/.test(n.faction)) { o.forEach(x => { if (x.id === 'cappotto' || x.id === 'giacca') x.col = '#1a1a1e'; }); put('guanti'); put(r(15, 2) ? 'collana_oro' : 'cravatta'); if (r(16, 3) === 0) put('occhiali_sole'); if (r(17, 4) === 0) { const c0 = o.find(x => x.id === 'cappotto'); if (c0) Object.assign(c0, CAPO.pelliccia_volpe); } }
    // un tocco a testa: l'accessorio che li fa ricordare
    if (rich && fem && r(18, 3) === 0) { const c0 = o.find(x => /cappotto|giacca/.test(x.id)); if (c0) Object.assign(c0, CAPO.pelliccia, { col: '#c8a060' }); put('collana_perle'); put('borsetta'); }
    if (rich && !fem && r(18, 4) === 0) { put('orologio_polso'); put('anelli'); }
    if (age < 30 && r(19, 4) === 0) put(pk(['occhiali_sole', 'cappellino', 'fascia', 'marsupio'], 20));
    if (/impieg|banc|notai|avvoc|ragion/.test(job)) { const i = o.findIndex(x => x.id === 'giacca'); if (i >= 0) o[i] = Object.assign({}, CAPO.giacca_completo, { col: o[i].col }); const j = o.findIndex(x => /^pantaloni/.test(x.id)); if (j >= 0) o[j] = Object.assign({}, CAPO.pantaloni_completo, { col: o[i >= 0 ? i : j].col }); put(pk(['cravatta', 'cravatta_righe', 'cravatta_pois', 'cravatta_cachemire', 'cravatta_maglia'], 22), pk(['#7a1a1e', '#1e2a5a', '#2a2a2e', '#5a4a1e', '#3a5a3a'], 21)); }
    if ((L.extra || '').includes('backpack')) put('zaino', pk(['#2f5a6a', '#8a3a2a', '#3a4a2a', '#c8862a'], 14));
    return o;
  }

  // ---------------- IL MENU CHIAMA QUESTE ----------------
  (function hook() {
    const a0 = O.act;
    O.act = function (st, id, arg, ex) {
      const k = String(id).replace(/^og_/, '');
      switch (k) {
        case 'indossa': return wear(st, arg, ex && ex.at);
        case 'togli': { const [z, i] = String(arg).split(':'); return unwear(st, z, i === undefined ? undefined : +i); }
        case 'sposta': return move(st, arg, ex.i, ex.j);
        case 'spogliati': return strip(st, !!(ex && ex.tutto));
        case 'tieni': return hold(st, arg);
        case 'scambia_mani': return swap(st);
        case 'usa_sinistra': return useLeft(st);
      }
      return a0.apply(this, arguments);
    };
    O.SLOT_OF = Object.fromEntries(Object.values(CAPO).map(c => [c.id, c.zona]));
    O.canHold = canHold; O.warmth = warmth;
  })();
  // si ricalcola protezione e calore a ogni partita
  if (G.HOOKS) { const c0 = G.HOOKS.create; G.HOOKS.create = st => { if (c0) c0(st); try { upd(st); } catch (e) { } }; }

  return { ZONE, ZORD, CAPO, worn, wear, unwear, move, strip, hold, swap, useLeft, canHold, warmth, armor, view, outfitOf, outfitOfPlayer, list, upd };
})();
if (typeof module !== 'undefined') module.exports = Guardaroba;
