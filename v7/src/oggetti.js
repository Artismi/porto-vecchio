/* Porto Vecchio — Gli Oggetti: un solo catalogo per tutto quello che si tocca (solo logica, nessuna grafica). Caricato dopo soldi.js.
   Prima c'erano tre liste astratte (le merci dell'economia, gli oggetti in tasca, le «risorse» della banda: materiali, attrezzi, viveri).
   Adesso ogni cosa è un oggetto vero, con un prezzo e un peso:
   - CATALOGO: cibo e acqua, legna e carbone, assi e lamiere, viti e cerniere, attrezzi che si consumano, pezzi di radio, carta e inchiostro…
   - BOTTEGHE: ognuna vende quello che vende davvero; il mercato nero quello che non si trova.
   - POSTAZIONI: forgia e incudine, banco del falegname, cucina, forno, macchina da cucire, ciclostile, banco radio… stanno negli interni
     (sono mobili veri) o nelle basi (alcune si costruiscono e si portano via).
   - RICETTE: alcune si fanno ovunque se hai la roba (bende, molotov, panino), altre solo alla postazione giusta e con gli attrezzi giusti.
     Chi lavora produce con le stesse ricette: il fornaio fa il pane con la farina, il fabbro i chiodi col ferro e il carbone. Quello che
     produce lo comprano gli altri; quello che gli serve lo compra da chi lo produce o dalla nave.
   - SMONTARE: la roba vecchia (radio rotte, televisori, rottami d'auto, mobili) si smonta in pezzi utili.
   - FRUGARE: dispense, armadi, cassetti, cassette degli attrezzi, casseforti. Nelle botteghe si ruba dalle scorte vere; in casa d'altri
     c'è il rischio che qualcuno sia in casa. Alcuni sono chiusi a chiave: grimaldello o piede di porco.
   - COSTRUIRE: le strutture e i moduli della banda si pagano in oggetti (assi, lamiere, chiodi, cemento), non in «8 materiali».
   Le vecchie risorse astratte della Risacca restano come CATEGORIE: «materiali» sono assi, lamiere, mattoni…; il resto del gioco le chiede
   ancora così e qui si risponde con gli oggetti veri.
   Si appoggia a Economia (MERCI, SELL, PROD, scorte), Azioni (ITEMS, tasche), Risacca (EXT), Soldi (bancone, casse), Interior (mobili). */
var Oggetti = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const Az = typeof Azioni !== 'undefined' ? Azioni : require('./azioni.js');
  const Ec = typeof Economia !== 'undefined' ? Economia : require('./economia.js');
  const RS = typeof Risacca !== 'undefined' ? Risacca : require('./risacca.js');
  const So = typeof Soldi !== 'undefined' ? Soldi : (typeof require !== 'undefined' ? require('./soldi.js') : null);
  const INT = typeof Interior !== 'undefined' ? Interior : require('./interiors.js');
  const I = Po._, PLACES = G.PLACES, TS = G.TS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const r1 = x => Math.round(x * 10) / 10;
  const L = x => `${(Math.round(x * 10) / 10).toLocaleString('it-IT')}.000 lire`;
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  // =====================================================================================================================
  // IL CATALOGO
  // [id, nome, prezzo (migliaia di lire), peso (kg), scorta tipica di una bottega, extra]
  // extra: eat {fame, sete, hp, calore, alcol, igiene} · res 'categoria:quanto' (per la Risacca) · tool N (usi prima di rompersi)
  //        st 'postazione' (si piazza in una base e fa da postazione) · imp (arriva con la nave) · ill (illegale) · wpn (arma del motore)
  //        heat (calore che dà bruciando, ore di stufa) · empty (contenitore vuoto: in cosa si trasforma una volta usato)
  // =====================================================================================================================
  const CAT = {};
  const GROUPS = {};
  function grp(cat, label, rows) { GROUPS[cat] = label; rows.forEach(([id, nome, prezzo, peso, q, ex]) => { CAT[id] = Object.assign({ id, nome, cat, prezzo, peso, q: q || 0 }, ex || {}); }); }

  grp('cibo', 'Da mangiare', [
    ['pane', 'pane', 1, .5, 30, { eat: { fame: .25 }, res: 'viveri:.5' }],
    ['focaccia', 'focaccia', 1.5, .4, 12, { eat: { fame: .3 }, res: 'viveri:.5' }],
    ['biscotti', 'pacco di biscotti', 1.5, .4, 15, { eat: { fame: .15 }, res: 'viveri:.5', imp: 1 }],
    ['gallette', 'gallette del soldato', 1, .3, 10, { eat: { fame: .2 }, res: 'viveri:1', imp: 1 }],
    ['verdura', 'verdura', 1.5, 1, 30, { eat: { fame: .1 }, res: 'viveri:.5' }],
    ['patate', 'sacchetto di patate', 1.5, 2, 25, { res: 'viveri:1' }],
    ['pomodori', 'pomodori', 1.5, 1, 20, { eat: { fame: .08, sete: -.05 }, res: 'viveri:.5' }],
    ['cipolle', 'cipolle', 1, 1, 15, { res: 'viveri:.3' }],
    ['frutta', 'frutta', 1.5, 1, 25, { eat: { fame: .1, sete: -.08 }, res: 'viveri:.5' }],
    ['limoni', 'limoni', 1, .5, 10, {}],
    ['olive', 'olive', 2, 1, 6, { eat: { fame: .05 } }],
    ['uova', 'mezza dozzina di uova', 1.5, .4, 15, { res: 'viveri:.5' }],
    ['latte', 'litro di latte', 1, 1, 20, { eat: { fame: .08, sete: -.2 }, res: 'viveri:.5' }],
    ['formaggio', 'forma di formaggio', 3, .5, 10, { eat: { fame: .25 }, res: 'viveri:1' }],
    ['carne', 'carne fresca', 5, .5, 15, { res: 'viveri:1' }],
    ['salsiccia', 'salsiccia', 3, .4, 10, { res: 'viveri:1' }],
    ['salame', 'salame', 4, .4, 8, { eat: { fame: .3 }, res: 'viveri:1.5' }],
    ['pesce', 'pesce fresco', 4, .6, 15, { res: 'viveri:1' }],
    ['sarde', 'sarde', 2, .5, 12, { res: 'viveri:.5' }],
    ['polpo', 'polpo', 4, .8, 4, { res: 'viveri:1' }],
    ['scatolame', 'scatoletta di tonno', 2, .25, 30, { eat: { fame: .2 }, res: 'viveri:1', empty: 'latta_vuota' }],
    ['carne_scatola', 'carne in scatola', 2.5, .35, 15, { eat: { fame: .3 }, res: 'viveri:1', imp: 1, empty: 'latta_vuota' }],
    ['legumi', 'fagioli in scatola', 1.5, .4, 15, { eat: { fame: .25 }, res: 'viveri:1', imp: 1, empty: 'latta_vuota' }],
    ['conserva', 'barattolo di conserva', 2, .6, 8, { eat: { fame: .25 }, res: 'viveri:1.5', empty: 'barattolo' }],
    ['razione', 'pacco viveri', 8, 2.5, 0, { eat: { fame: .6 }, res: 'viveri:4' }],
    ['panino', 'panino imbottito', 2.5, .3, 10, { eat: { fame: .45 }, res: 'viveri:1' }],
    ['pasto', 'piatto caldo', 4, .6, 12, { eat: { fame: .75, calore: .15 } }],
    ['minestra', 'gavetta di minestra', 2, .8, 0, { eat: { fame: .5, sete: -.15, calore: .25 }, res: 'viveri:1' }],
    ['gelato', 'gelato', 1.5, .2, 10, { eat: { fame: .05, sete: -.05 } }],
    ['miele', 'barattolo di miele', 4, .5, 4, { eat: { fame: .15 }, res: 'viveri:.5' }],
    ['cioccolato', 'tavoletta di cioccolato', 2, .1, 10, { eat: { fame: .15, hp: 2 }, imp: 1 }],
  ]);
  grp('bevande', 'Da bere', [
    ['acqua', 'bottiglia d\'acqua', .5, 1, 30, { eat: { sete: -.45 }, empty: 'bottiglia_vuota' }],
    ['tanica_acqua', 'tanica d\'acqua (10 l)', 2, 10.5, 0, { eat: { sete: -.5 }, res: 'viveri:2', uses: 10, empty: 'tanica_vuota' }],
    ['acqua_pozzo', 'acqua di cisterna (da bollire)', 0, 1, 0, { empty: 'bottiglia_vuota' }],
    ['caffe_tazza', 'tazzina di caffè', 1, .1, 0, { eat: { sonno: -.15, calore: .05 } }],
    ['thermos', 'thermos di caffè', 4, 1.2, 0, { eat: { sonno: -.3, calore: .2 }, uses: 4 }],
    ['te', 'tè caldo', 1, .3, 0, { eat: { sete: -.3, calore: .2 } }],
    ['vino', 'bottiglia di vino', 2, 1.2, 20, { eat: { sete: -.1, alcol: .35, calore: .1 }, empty: 'bottiglia_vuota' }],
    ['birra', 'birra', 1.5, .7, 25, { eat: { sete: -.25, alcol: .2 }, empty: 'bottiglia_vuota', imp: 1 }],
    ['grappa', 'grappa', 5, .8, 8, { eat: { alcol: .6, calore: .3 }, empty: 'bottiglia_vuota' }],
    ['whisky', 'whisky di contrabbando', 18, 1, 3, { eat: { alcol: .6, calore: .2 }, empty: 'bottiglia_vuota', imp: 1 }],
    ['aranciata', 'aranciata', 1, .4, 15, { eat: { sete: -.35 }, empty: 'bottiglia_vuota', imp: 1 }],
  ]);
  grp('dispensa', 'Dispensa e ingredienti', [
    ['farina', 'sacco di farina (5 kg)', 3, 5, 20, { imp: 1, res: 'viveri:1' }],
    ['pasta', 'pacco di pasta', 1.5, 1, 30, { imp: 1, res: 'viveri:1' }],
    ['riso', 'pacco di riso', 2, 1, 15, { imp: 1, res: 'viveri:1' }],
    ['passata', 'bottiglia di passata', 1.5, .7, 15, {}],
    ['olio', 'olio d\'oliva', 4, 1, 10, {}],
    ['sale', 'sale', .5, 1, 15, {}],
    ['zucchero', 'zucchero', 2, 1, 15, { imp: 1, res: 'zucchero:1' }],
    ['caffe', 'caffè macinato', 3, .25, 15, { imp: 1 }],
    ['te_foglie', 'tè in foglie', 2, .1, 6, { imp: 1 }],
    ['lievito', 'lievito', .5, .05, 10, { imp: 1 }],
    ['strutto', 'strutto', 1.5, .5, 6, {}],
    ['capi', 'capo di bestiame', 30, 40, 4, {}],
    ['uva', 'cassetta d\'uva', 2, 5, 0, {}],
  ]);
  grp('combustibili', 'Fuoco e calore', [
    ['legna', 'fascio di legna da ardere', 1.5, 8, 20, { heat: 3, res: 'materiali:.3' }],
    ['carbone', 'sacco di carbone', 3, 10, 15, { heat: 8 }],
    ['carbonella', 'carbonella', 2, 4, 6, { heat: 4 }],
    ['benzina', 'tanica di benzina', 4, 6, 25, { res: 'benzina:1', empty: 'tanica_vuota' }],
    ['gasolio', 'tanica di gasolio', 3.5, 6, 10, { heat: 10, empty: 'tanica_vuota' }],
    ['bombola', 'bombola del gas', 12, 15, 6, { imp: 1, heat: 12 }],
    ['fiammiferi', 'scatola di fiammiferi', .2, .05, 30, {}],
    ['accendino', 'accendino', 1, .05, 15, { imp: 1 }],
    ['candele', 'pacco di candele', 1, .3, 20, {}],
    ['alcol', 'alcol denaturato', 1.5, 1, 10, { imp: 1 }],
    ['olio_motore', 'latta d\'olio motore', 4, 2, 8, { imp: 1 }],
  ]);
  grp('edilizia', 'Legname e muratura', [
    ['legno', 'tronco', 2, 25, 15, { res: 'materiali:1' }],
    ['assi', 'fascio di assi', 4, 12, 15, { res: 'materiali:1' }],
    ['travi', 'trave', 5, 20, 6, { res: 'materiali:1.5' }],
    ['compensato', 'pannello di compensato', 4, 8, 8, { res: 'materiali:1', imp: 1 }],
    ['sughero', 'sughero', 1, 2, 6, {}],
    ['mattoni', 'pallet di mattoni (40)', 8, 50, 6, { res: 'materiali:2' }],
    ['cemento', 'sacco di cemento', 4, 25, 10, { res: 'materiali:1', imp: 1 }],
    ['sabbia', 'sacco di sabbia', .5, 25, 15, { res: 'materiali:.5' }],
    ['ghiaia', 'sacco di ghiaia', .5, 25, 10, { res: 'materiali:.5' }],
    ['pietre', 'pietre', .5, 30, 8, { res: 'materiali:.5' }],
    ['malta', 'secchio di malta', 0, 20, 0, { res: 'materiali:1' }],
    ['sacco_sabbia', 'sacchetto di sabbia (riparo)', 0, 25, 0, { res: 'materiali:.5' }],
    ['lamiera', 'lamiera ondulata', 6, 10, 10, { res: 'materiali:1.5', imp: 1 }],
    ['tondino', 'tondino di ferro', 3, 8, 10, { res: 'materiali:1', imp: 1 }],
    ['ferro', 'barre di ferro', 3, 8, 10, { res: 'materiali:1', imp: 1 }],
    ['latta', 'lamierino da latte', 3, 4, 8, { imp: 1 }],
    ['rete', 'rotolo di rete metallica', 6, 12, 6, { res: 'materiali:1', imp: 1 }],
    ['filo_spinato', 'rotolo di filo spinato', 8, 10, 4, { res: 'materiali:1', imp: 1 }],
    ['telo', 'telo cerato', 4, 3, 8, { res: 'materiali:.5', imp: 1 }],
    ['vetro', 'lastra di vetro', 5, 6, 4, { imp: 1 }],
    ['tubi', 'tubi di ferro', 4, 6, 8, { res: 'materiali:1', imp: 1 }],
    ['tubo_stufa', 'tubo da stufa', 3, 3, 4, {}],
  ]);
  grp('ferramenta', 'Ferramenta', [
    ['chiodi', 'scatola di chiodi', 1, .5, 20, { res: 'materiali:.3' }],
    ['viti', 'scatola di viti', 1.5, .4, 15, { imp: 1, res: 'materiali:.3' }],
    ['bulloni', 'bulloni e dadi', 2, .8, 12, { imp: 1, res: 'materiali:.3' }],
    ['cerniere', 'paio di cerniere', 1.5, .4, 10, {}],
    ['lucchetto', 'lucchetto', 3, .3, 10, { imp: 1 }],
    ['catena', 'catena', 4, 3, 6, {}],
    ['filo_ferro', 'rotolo di filo di ferro', 1.5, 1, 12, {}],
    ['corda', 'corda', 2, 1.5, 12, {}],
    ['nastro', 'nastro isolante', 1, .1, 15, { imp: 1 }],
    ['colla', 'colla', 2, .3, 10, { imp: 1 }],
    ['sacchi', 'sacchi di iuta', 1, .5, 20, {}],
    ['secchio', 'secchio', 2, 1, 8, {}],
    ['vernice', 'barattolo di vernice', 5, 3, 6, { imp: 1, res: 'vernice:1' }],
    ['bomboletta', 'bomboletta spray', 3, .4, 10, { imp: 1, res: 'vernice:1' }],
    ['gesso', 'gessetti', .5, .1, 15, { res: 'gesso:1' }],
    ['tanica_vuota', 'tanica vuota', 2, .5, 8, {}],
    ['guanti', 'guanti da lavoro', 1.5, .2, 10, {}],
  ]);
  grp('attrezzi', 'Attrezzi', [
    ['martello', 'martello', 4, 1, 6, { tool: 200, res: 'attrezzi:.5' }],
    ['cacciavite', 'cacciaviti', 2, .3, 8, { tool: 200, imp: 1, res: 'attrezzi:.3' }],
    ['pinze', 'pinze', 3, .4, 6, { tool: 200, imp: 1, res: 'attrezzi:.3' }],
    ['tronchesi', 'tronchesi', 4, .6, 5, { tool: 150, imp: 1, res: 'attrezzi:.5' }],
    ['chiave_inglese', 'chiave inglese', 4, .8, 5, { tool: 300, imp: 1, res: 'attrezzi:.3' }],
    ['seghetto', 'seghetto per metalli', 3, .5, 5, { tool: 80, imp: 1, res: 'attrezzi:.3' }],
    ['sega', 'sega da legno', 5, 1, 5, { tool: 120, res: 'attrezzi:.5' }],
    ['ascia', 'ascia', 6, 2, 4, { tool: 150, res: 'attrezzi:.5' }],
    ['lima', 'lima', 2, .3, 4, { tool: 100, res: 'attrezzi:.2' }],
    ['trapano', 'trapano a mano', 8, 1.5, 3, { tool: 150, imp: 1, res: 'attrezzi:.5' }],
    ['stetoscopio', 'stetoscopio', 12, .2, 1, { tool: 400 }],   // [cassaforti] si ascoltano i cilindri della combinazione
    ['taglierino', 'taglierino', 1, .1, 10, { tool: 60, imp: 1 }],
    ['forbici', 'forbici', 2, .2, 8, { tool: 150 }],
    ['cazzuola', 'cazzuola', 2, .5, 4, { tool: 200 }],
    ['pala', 'pala', 6, 2.5, 4, { tool: 300, res: 'attrezzi:.5' }],
    ['piccone', 'piccone', 7, 3, 3, { tool: 200, res: 'attrezzi:.5' }],
    ['piede', 'piede di porco', 4, 2, 4, { tool: 250, res: 'attrezzi:1' }],
    ['grimaldello', 'grimaldelli', 6, .1, 0, { tool: 25, ill: 1 }],
    ['carriola', 'carriola', 15, 15, 2, { tool: 500 }],
    ['saldatore', 'saldatore a stagno', 8, .5, 3, { tool: 120, imp: 1, res: 'radio:.5' }],
    ['stagno', 'rocchetto di stagno', 2, .1, 6, { imp: 1, res: 'radio:.2' }],
    ['pentola', 'pentola', 4, 1.5, 6, { tool: 500 }],
    ['padella', 'padella', 3, 1, 6, { tool: 500 }],
    ['moka', 'moka', 4, .5, 6, { tool: 300, imp: 1 }],
    ['ferri_maglia', 'ferri da maglia', 1, .1, 4, { tool: 300 }],
    ['ago_filo', 'ago e filo', .5, .05, 12, { tool: 40 }],
    ['rete_pesca', 'rete da pesca', 10, 4, 3, { tool: 100 }],
    ['canna', 'canna da pesca', 5, 1, 4, { tool: 150 }],
    ['torcia', 'torcia elettrica', 4, .5, 8, { imp: 1, tool: 300 }],
  ]);
  grp('elettrico', 'Elettricità e radio', [
    ['pile', 'pile', 2, .2, 15, { imp: 1, res: 'radio:.3' }],
    ['lampadine', 'lampadine', 2, .1, 10, { imp: 1 }],
    ['cavo', 'matassa di cavo elettrico', 3, 1, 10, { imp: 1, res: 'radio:.3' }],
    ['cavo_coax', 'cavo coassiale', 4, 1, 4, { imp: 1, res: 'radio:.5' }],
    ['valvole', 'valvole', 6, .2, 6, { imp: 1, res: 'radio:1' }],
    ['transistor', 'transistor e condensatori', 4, .1, 6, { imp: 1, res: 'radio:.5' }],
    ['altoparlante', 'altoparlante', 4, .8, 4, { imp: 1, res: 'radio:.5' }],
    ['batteria_auto', 'batteria d\'auto', 12, 14, 4, { imp: 1, res: 'radio:1' }],
    ['sveglia', 'sveglia', 3, .4, 6, { imp: 1 }],
    ['interruttore', 'interruttori e fusibili', 1, .1, 10, { imp: 1 }],
    ['radiolina', 'radio a transistor', 15, 1, 4, { imp: 1 }],
    ['ricetrasmittente', 'ricetrasmittente', 0, 4, 0, { res: 'radio:4', ill: 1 }],
    ['antenna_kit', 'antenna smontabile', 0, 6, 0, { res: 'radio:2' }],
    ['disturbatore', 'disturbatore di frequenze', 0, 3, 0, { ill: 1 }],
    ['timer', 'timer a orologeria', 0, .5, 0, { ill: 1 }],
    ['telefono', 'cellulare', 30, .8, 2, { imp: 1, res: 'telefono:1' }],
    ['fotocamera', 'macchina fotografica', 25, .8, 2, { imp: 1, res: 'fotocamera:1' }],
    ['rullino', 'rullino', 2, .05, 8, { imp: 1 }],
    ['cassetta', 'audiocassetta', 1.5, .1, 10, { imp: 1 }],
  ]);
  grp('stampa', 'Carta e stampa', [
    ['carta', 'risma di carta', 2, 2.5, 20, { imp: 1, res: 'carta:1' }],
    ['cartoncino', 'cartoncino', 1, .5, 8, { imp: 1 }],
    ['inchiostro', 'flacone d\'inchiostro', 3, .3, 8, { imp: 1, res: 'inchiostro:1' }],
    ['penne', 'penne e matite', .5, .05, 15, {}],
    ['quaderno', 'quaderno', .5, .2, 15, {}],
    ['buste', 'buste e francobolli', .5, .05, 15, {}],
    ['carta_bollata', 'carta bollata', 2, .05, 10, {}],
    ['giornale', 'giornale del Garante', .3, .2, 20, {}],
    ['volantini', 'pacco di volantini', 0, 1.5, 0, { res: 'volantini:10', ill: 1 }],
    ['poster', 'manifesti clandestini', 0, .8, 0, { ill: 1 }],
    ['libretto', 'libretti clandestini', 0, .3, 0, { ill: 1 }],
    ['stencil', 'stencil di cartone', 0, .1, 0, { tool: 30 }],
    ['timbro_falso', 'timbro falso dell\'Ufficio Rettifiche', 0, .2, 0, { tool: 20, ill: 1 }],
    ['foto_tessera', 'foto tessera', 0, .01, 0, {}],
    ['documenti', 'lasciapassare falso', 0, .05, 0, { res: 'documenti:1', ill: 1 }],
    ['prove', 'foto compromettenti', 0, .05, 0, { res: 'prove:1' }],
    ['fascicolo', 'fascicolo della Tutela', 0, .4, 0, { ill: 1 }],
    ['moduli', 'moduli in bianco con lo stemma', 0, .1, 0, {}],
  ]);
  grp('medicina', 'Medicine', [
    ['medicine', 'scatola di aspirine', 3, .1, 10, { eat: { hp: 6 }, imp: 1, res: 'medicine:.5' }],
    ['antibiotici', 'antibiotici', 8, .1, 4, { eat: { hp: 15 }, imp: 1, res: 'medicine:1.5' }],
    ['garze', 'garze', 1, .1, 10, { imp: 1, res: 'medicine:.3' }],
    ['bende', 'bende', 1.5, .2, 10, { eat: { hp: 10 }, res: 'medicine:.5' }],
    ['cerotti', 'cerotti', .5, .05, 10, { eat: { hp: 3 }, imp: 1 }],
    ['disinfettante', 'disinfettante', 2, .5, 8, { res: 'medicine:.5' }],
    ['siringhe', 'siringhe', 2, .1, 6, { imp: 1 }],
    ['morfina', 'fiale di morfina', 20, .05, 0, { eat: { hp: 25 }, ill: 1, res: 'medicine:2' }],
    ['kit_medico', 'cassetta del pronto soccorso', 0, 1.5, 0, { eat: { hp: 40 }, res: 'medicine:3' }],
  ]);
  grp('igiene', 'Casa e igiene', [
    ['sapone', 'saponetta', 1, .15, 15, { eat: { igiene: -.4 } }],
    ['detersivo', 'detersivo', 2, 1, 8, { imp: 1 }],
    ['candeggina', 'candeggina', 1.5, 1, 6, { imp: 1 }],
    ['spugne', 'spugne', 1, .05, 10, {}],
    ['dentifricio', 'dentifricio', 1, .1, 10, { imp: 1 }],
    ['rasoio', 'rasoio e lamette', 2, .1, 8, { imp: 1 }],
    ['stracci', 'stracci', 0, .3, 0, {}],
    ['bottiglia_vuota', 'bottiglia vuota', 0, .4, 0, {}],
    ['barattolo', 'barattolo vuoto', 0, .2, 0, {}],
    ['latta_vuota', 'latta vuota', 0, .05, 0, {}],
    ['cartone', 'cartone', 0, .5, 0, {}],
  ]);
  grp('vestiti', 'Vestiti', [
    ['stoffa', 'pezza di stoffa', 3, 1, 10, { imp: 1 }],
    ['stoffa_grigia', 'panno grigio da divisa', 5, 1, 0, { ill: 1 }],
    ['lana', 'matassa di lana', 2, .5, 8, {}],
    ['pelle', 'pelle conciata', 6, 2, 3, {}],
    ['bottoni', 'bottoni', .5, .05, 10, {}],
    ['vestiti', 'vestiti', 8, 1.5, 6, { calore: .2 }],
    ['maglione', 'maglione di lana', 8, .8, 6, { calore: .3 }],
    ['cappotto', 'cappotto', 20, 2.5, 4, { calore: .5 }],
    ['scarpe', 'scarponi', 12, 1.5, 4, { calore: .1 }],
    ['guanti_lana', 'guanti di lana', 2, .1, 8, { calore: .1 }],
    ['passamontagna', 'passamontagna', 2, .1, 4, { calore: .1, mask: 1 }],
    ['zaino', 'zaino militare', 8, 1, 4, { bag: 20, imp: 1 }],
    ['coperta', 'coperta', 5, 2, 8, { calore: .3, res: 'mobili:.3' }],
    ['lenzuola', 'lenzuola', 3, 1, 6, {}],
    ['divisa', 'divisa dei Grigi', 0, 2, 0, { ill: 1, res: 'divisa:1' }],
  ]);
  grp('arredi', 'Arredi e postazioni', [
    ['mobili', 'mobile usato', 12, 30, 3, { res: 'mobili:1' }],
    ['sedia', 'sedia', 4, 4, 4, { res: 'mobili:.5' }],
    ['tavolo', 'tavolo', 10, 20, 2, { res: 'mobili:1' }],
    ['branda', 'branda', 8, 10, 2, { res: 'mobili:1' }],
    ['materasso', 'materasso', 10, 12, 2, { res: 'mobili:1' }],
    ['scaffale', 'scaffale', 8, 15, 2, { res: 'mobili:1' }],
    ['casse', 'cassa di legno', 3, 5, 8, { res: 'materiali:.5' }],
    ['barricata', 'pannelli da barricata', 0, 20, 0, { res: 'materiali:3' }],
    ['porta_rinforzata', 'porta rinforzata', 0, 40, 0, {}],
    ['botola', 'botola mimetizzata', 0, 25, 0, {}],
    ['stufa', 'stufa a legna', 25, 40, 2, { st: 'stufa' }],
    ['fornello', 'fornello da campo', 10, 3, 4, { st: 'cucina', imp: 1 }],
    ['banco', 'banco da lavoro smontabile', 0, 25, 0, { st: 'banco_lavoro' }],
    ['macchina_cucire', 'macchina da cucire', 40, 12, 1, { st: 'macchina_cucire', imp: 1 }],
    ['ciclostile', 'ciclostile', 60, 20, 0, { st: 'ciclostile', ill: 1 }],
    ['banco_radio', 'banco radio portatile', 0, 10, 0, { st: 'banco_radio' }],
    ['alambicco', 'alambicco di rame', 0, 12, 0, { st: 'alambicco', ill: 1 }],
    ['ingranditore', 'ingranditore e bacinelle', 30, 8, 0, { st: 'camera_oscura', imp: 1 }],
  ]);
  grp('armi', 'Armi e sabotaggio', [
    ['coltello', 'coltello', 4, .3, 4, { tool: 400, wpn: 'coltello' }],
    ['pistola', 'pistola', 60, 1, 0, { ill: 1, wpn: 'pistola' }],
    ['lupara', 'lupara', 50, 3, 0, { ill: 1, wpn: 'lupara' }],
    ['mitra', 'mitra', 120, 3.5, 0, { ill: 1, wpn: 'mitra' }],
    ['munizioni', 'scatola di munizioni', 6, .5, 0, { ill: 1 }],
    ['molotov', 'molotov', 0, 1, 0, { ill: 1, wpn: 'molotov' }],
    ['candelotto', 'candelotto di dinamite', 30, .3, 0, { ill: 1 }],   // [cassaforti] della cava: apre una cassaforte, e lo sentono tutti
    ['triboli', 'triboli (chiodi a tre punte)', 0, 1, 0, { ill: 1 }],
    ['kit', 'kit di sabotaggio', 0, 2, 0, { ill: 1, res: 'kit:1' }],
    ['manette', 'manette', 0, .4, 0, {}],
  ]);
  grp('valori', 'Valori e contrabbando', [
    ['sigarette', 'stecca di sigarette', 2, .2, 30, { res: 'merce:.2' }],
    ['sigarette_contr', 'sigarette di contrabbando', 4, .2, 0, { ill: 1, res: 'merce:.5' }],
    ['tabacco', 'tabacco e cartine', 1, .05, 10, {}],
    ['carte', 'mazzo di carte', 2, .1, 6, {}],
    ['orologio', 'orologio', 15, .1, 0, {}],
    ['gioielli', 'gioielli', 40, .1, 0, {}],
    ['valuta', 'dollari dell\'Impero', 30, .01, 0, { ill: 1 }],
    ['merce', 'cassa di merce di contrabbando', 15, 10, 0, { ill: 1, res: 'merce:1' }],
    ['roba', 'roba', 8, .05, 0, { ill: 1 }],
    ['refurtiva', 'refurtiva', 6, 2, 0, { ill: 1 }],
  ]);
  grp('rottami', 'Roba vecchia e rottami', [
    ['rottami', 'rottami di ferro', .5, 10, 0, { res: 'materiali:.5' }],
    ['radio_rotta', 'radio rotta', 0, 4, 0, {}],
    ['tv_rotta', 'televisore rotto', 0, 15, 0, {}],
    ['elettrodomestico', 'elettrodomestico rotto', 0, 25, 0, {}],
    ['mobile_rotto', 'mobile sfasciato', 0, 15, 0, {}],
    ['ricambi', 'pezzi d\'auto', 2, 6, 0, {}],
    ['pneumatico', 'pneumatico', 6, 9, 4, { imp: 1 }],
  ]);

  // ---- altri oggetti (4 ottobre, sera): la vita d'inverno, il regime, la bici, il contrabbando, la roba da recuperare ----
  grp('cibo', 'Da mangiare', [
    ['castagne', 'sacchetto di castagne', 1.5, 1, 10, { eat: { fame: .1 }, res: 'viveri:.5' }],
    ['castagne_arrosto', 'castagne arrosto', 1, .4, 0, { eat: { fame: .25, calore: .1 } }],
    ['funghi', 'funghi secchi', 3, .2, 4, { res: 'viveri:.3' }],
    ['ceci', 'ceci secchi', 1.5, 1, 10, { res: 'viveri:1', imp: 1 }],
    ['baccala', 'baccalà', 6, 1, 4, { res: 'viveri:1.5', imp: 1 }],
    ['acciughe', 'acciughe sotto sale', 2.5, .4, 8, { eat: { fame: .1, sete: .1 }, res: 'viveri:.5' }],
    ['ricotta', 'ricotta', 2, .4, 6, { eat: { fame: .2 } }],
    ['mortadella', 'mortadella', 3, .4, 6, { eat: { fame: .3 }, res: 'viveri:1' }],
    ['pane_nero', 'pane nero di segale', .8, .6, 15, { eat: { fame: .25 }, res: 'viveri:.5', imp: 1 }],
    ['polenta', 'polenta', 1.5, .8, 0, { eat: { fame: .55, calore: .2 }, res: 'viveri:1' }],
    ['minestrone', 'gavetta di minestrone', 2, .8, 0, { eat: { fame: .55, sete: -.1, calore: .25 }, res: 'viveri:1' }],
    ['latte_polvere', 'latte in polvere', 3, .5, 8, { res: 'viveri:1', imp: 1 }],
    ['marmellata', 'marmellata', 2, .4, 6, { eat: { fame: .1 } }],
    ['mele', 'mele', 1.5, 1, 15, { eat: { fame: .1, sete: -.05 }, res: 'viveri:.5' }],
    ['arance', 'arance', 2, 1, 10, { eat: { fame: .08, sete: -.15, hp: 1 }, res: 'viveri:.5', imp: 1 }],
    ['noci', 'noci', 2.5, .5, 6, { eat: { fame: .12 }, res: 'viveri:.5' }],
    ['fichi_secchi', 'fichi secchi', 2, .3, 6, { eat: { fame: .15 }, res: 'viveri:.5' }],
    ['razione_tutela', 'razione K della Tutela', 0, .8, 0, { eat: { fame: .55 }, res: 'viveri:2' }],
    ['chewing_gum', 'gomme americane', 1, .02, 0, { imp: 1, ill: 1 }],
  ]);
  grp('bevande', 'Da bere', [
    ['caffe_orzo', 'caffè d\'orzo', 1, .25, 10, {}],
    ['mirto', 'liquore di mirto', 6, .8, 4, { eat: { alcol: .5, calore: .2 }, empty: 'bottiglia_vuota' }],
    ['succo', 'succo di frutta', 1, .3, 10, { eat: { sete: -.3 }, imp: 1 }],
    ['vodka', 'vodka dell\'Impero', 7, .8, 6, { eat: { alcol: .7, calore: .3 }, empty: 'bottiglia_vuota', imp: 1 }],
  ]);
  grp('dispensa', 'Dispensa e ingredienti', [
    ['farina_mais', 'farina di mais', 2, 2, 12, { imp: 1, res: 'viveri:1' }],
    ['orzo', 'orzo', 1.5, 1, 10, { imp: 1, res: 'viveri:.5' }],
    ['aceto', 'aceto', 1, 1, 8, {}],
    ['spezie', 'pepe e spezie', 2, .05, 6, { imp: 1 }],
    ['burro', 'burro', 2.5, .25, 6, {}],
  ]);
  grp('combustibili', 'Fuoco e calore', [
    ['petrolio', 'tanica di petrolio', 4, 5, 10, { heat: 6, empty: 'tanica_vuota', imp: 1 }],
    ['lampada_petrolio', 'lampada a petrolio', 6, 1, 6, { tool: 200 }],
    ['razzo', 'razzo di segnalazione', 5, .3, 0, { ill: 1 }],
  ]);
  grp('edilizia', 'Legname e muratura', [
    ['pallet', 'pallet di legno', 1, 15, 0, { res: 'materiali:.5' }],
    ['calce', 'sacco di calce', 2, 25, 6, { res: 'materiali:.5' }],
    ['catrame', 'secchio di catrame', 4, 15, 4, { imp: 1 }],
    ['isolante', 'rotolo di lana di vetro', 5, 4, 4, { imp: 1, res: 'materiali:.5' }],
    ['plexiglas', 'lastra di plexiglas', 6, 4, 0, { imp: 1 }],
    ['grata', 'grata di ferro', 8, 15, 0, { res: 'materiali:1' }],
  ]);
  grp('ferramenta', 'Ferramenta', [
    ['fascette', 'fascette di plastica', .5, .05, 15, { imp: 1 }],
    ['carta_vetrata', 'carta vetrata', .5, .1, 10, {}],
    ['lubrificante', 'olio lubrificante', 1.5, .3, 8, { imp: 1 }],
    ['moschettoni', 'moschettoni', 2, .2, 6, { imp: 1 }],
    ['cavo_acciaio', 'cavo d\'acciaio', 4, 3, 4, { imp: 1 }],
    ['tasselli', 'tasselli', 1, .2, 10, { imp: 1, res: 'materiali:.2' }],
    ['silicone', 'silicone', 2, .3, 6, { imp: 1 }],
    ['nastro_telato', 'nastro telato', 2, .2, 8, { imp: 1 }],
    ['molle', 'molle', 1, .1, 6, {}],
  ]);
  grp('attrezzi', 'Attrezzi', [
    ['morsa', 'morsa da banco', 6, 6, 2, { tool: 500 }],
    ['pialla', 'pialla', 5, 1.5, 3, { tool: 200 }],
    ['scalpello', 'scalpelli', 3, .5, 4, { tool: 200 }],
    ['metro', 'metro e livella', 2, .5, 6, { tool: 500 }],
    ['mazza', 'mazza', 6, 4, 3, { tool: 300 }],
    ['zappa', 'zappa', 4, 2, 4, { tool: 300 }],
    ['falce', 'falce', 4, 1.5, 3, { tool: 200 }],
    ['cesoie', 'cesoie', 3, .6, 4, { tool: 200 }],
    ['chiave_tubo', 'chiavi a tubo', 4, 1, 4, { tool: 300, imp: 1 }],
    ['tester', 'tester', 8, .4, 2, { tool: 300, imp: 1, res: 'radio:.5' }],
    ['binocolo', 'binocolo', 15, .8, 2, { imp: 1 }],
    ['bussola', 'bussola', 4, .1, 3, { imp: 1 }],
    ['coltellino', 'coltellino a serramanico', 3, .1, 6, { tool: 200 }],
    ['pompa', 'pompa da bici', 2, .5, 4, { tool: 400 }],
  ]);
  grp('elettrico', 'Elettricità e radio', [
    ['cuffie', 'cuffie', 4, .3, 4, { imp: 1, res: 'radio:.3' }],
    ['microfono', 'microfono', 6, .3, 2, { imp: 1, res: 'radio:.5' }],
    ['registratore', 'registratore a cassette', 18, 1.5, 2, { imp: 1 }],
    ['walkie', 'coppia di walkie-talkie', 40, 1, 0, { imp: 1, ill: 1, res: 'radio:2' }],
    ['dinamo', 'dinamo a manovella', 10, 2, 0, { res: 'radio:1' }],
    ['rame', 'filo di rame di recupero', 4, 2, 0, { res: 'radio:.5' }],
    ['motore_el', 'motorino elettrico', 6, 3, 0, {}],
    ['telefono_campo', 'telefono da campo', 0, 3, 0, { ill: 1, res: 'radio:1' }],
    ['radio_galena', 'radio a galena', 0, .6, 0, { res: 'radio:1' }],
  ]);
  grp('stampa', 'Carta e stampa', [
    ['macchina_scrivere', 'macchina da scrivere', 30, 8, 1, { imp: 1 }],
    ['nastro_mds', 'nastro per macchina da scrivere', 1, .05, 6, { imp: 1 }],
    ['matrici', 'matrici da ciclostile', 2, .3, 0, { ill: 1 }],
    ['tessera_annonaria', 'tessera annonaria', 0, .01, 0, {}],
    ['tessera_partito', 'tessera del Partito del Garante', 0, .01, 0, {}],
    ['mappa', 'mappa dell\'isola', 1, .1, 6, {}],
    ['piantina', 'piantina di una caserma', 0, .05, 0, { ill: 1 }],
    ['rivista_proibita', 'rivista proibita', 3, .2, 0, { ill: 1 }],
  ]);
  grp('medicina', 'Medicine', [
    ['sciroppo', 'sciroppo per la tosse', 2, .2, 6, { eat: { hp: 3 }, imp: 1 }],
    ['vitamine', 'vitamine', 3, .05, 6, { eat: { hp: 4 }, imp: 1 }],
    ['iodio', 'tintura di iodio', 1.5, .1, 6, { res: 'medicine:.3' }],
    ['laccio', 'laccio emostatico', 2, .1, 4, { res: 'medicine:.3' }],
    ['stecca', 'stecca per fratture', 0, .5, 0, { eat: { hp: 12 }, res: 'medicine:.5' }],
    ['termometro', 'termometro', 2, .02, 4, { imp: 1 }],
    ['sonniferi', 'sonniferi', 5, .02, 2, { imp: 1 }],
  ]);
  grp('igiene', 'Casa e igiene', [
    ['carta_igienica', 'rotolo di carta igienica', 1, .2, 10, { imp: 1 }],
    ['shampoo', 'shampoo', 2, .3, 6, { eat: { igiene: -.3 }, imp: 1 }],
    ['pettine', 'pettine e specchietto', 1, .1, 6, {}],
    ['tenda', 'tenda da campo', 20, 6, 0, { imp: 1, res: 'mobili:1' }],
    ['sacco_pelo', 'sacco a pelo', 12, 2.5, 0, { calore: .4, imp: 1, res: 'mobili:1' }],
  ]);
  grp('vestiti', 'Vestiti', [
    ['impermeabile', 'impermeabile', 10, 1, 4, { calore: .2 }],
    ['stivali', 'stivali di gomma', 6, 2, 4, { calore: .1 }],
    ['berretto', 'berretto di lana', 2, .1, 8, { calore: .15 }],
    ['sciarpa', 'sciarpa', 2, .2, 8, { calore: .1 }],
    ['tuta', 'tuta da lavoro', 6, 1, 6, { calore: .15 }],
    ['giacca_pelle', 'giacca di pelle', 30, 2, 0, { calore: .35 }],
    ['maschera_gas', 'maschera antigas', 15, 1, 0, { ill: 1 }],
    ['elmetto', 'elmetto', 8, 1.2, 0, {}],
    ['giubbotto', 'giubbotto antiproiettile', 80, 6, 0, { ill: 1 }],
    ['jeans', 'jeans americani', 25, .8, 0, { ill: 1, imp: 1 }],
  ]);
  grp('arredi', 'Arredi e postazioni', [
    ['lampada', 'lampada da tavolo', 4, 1.5, 4, { imp: 1 }],
    ['stufetta', 'stufetta elettrica', 15, 4, 0, { st: 'stufa', imp: 1 }],
    ['bicicletta', 'bicicletta', 40, 15, 0, {}],
  ]);
  grp('armi', 'Armi e sabotaggio', [
    ['fionda', 'fionda', 0, .2, 0, {}],
    ['mazza_baseball', 'mazza da baseball', 8, 1, 0, { imp: 1 }],
    ['tirapugni', 'tirapugni', 5, .3, 0, { ill: 1 }],
    ['spray_peperoncino', 'spray al peperoncino', 6, .2, 0, { ill: 1, imp: 1 }],
    ['fumogeno', 'fumogeno', 8, .5, 0, { ill: 1 }],
    ['petardi', 'petardi', 2, .2, 0, { ill: 1 }],
  ]);
  grp('valori', 'Valori e contrabbando', [
    ['anello_oro', 'anello d\'oro', 35, .01, 0, {}],
    ['posate_argento', 'posate d\'argento', 25, 1.5, 0, {}],
    ['quadro', 'quadro', 30, 3, 0, {}],
    ['francobolli', 'francobolli da collezione', 15, .05, 0, {}],
    ['dischi', 'dischi in vinile', 10, 1, 0, { imp: 1 }],
    ['cassette_proibite', 'cassette di musica proibita', 6, .2, 0, { ill: 1 }],
    ['profumo', 'profumo francese', 20, .2, 0, { imp: 1 }],
    ['calze_nylon', 'calze di nylon', 8, .05, 0, { imp: 1 }],
    ['marlboro', 'stecca di sigarette americane', 10, .2, 0, { imp: 1, ill: 1, res: 'merce:.5' }],
  ]);
  grp('rottami', 'Roba vecchia e rottami', [
    ['frigo_rotto', 'frigorifero rotto', 0, 40, 0, {}],
    ['bici_rotta', 'bicicletta rotta', 0, 14, 0, {}],
    ['telaio', 'telaio di bicicletta', 5, 6, 0, {}],
    ['ruota_bici', 'ruota di bicicletta', 4, 2, 0, {}],
    ['catena_bici', 'catena di bicicletta', 2, .4, 0, {}],
    ['lattine', 'sacco di lattine', .5, 2, 0, {}],
    ['piombo', 'piombo', 2, 3, 0, {}],
    ['batterie_esauste', 'batterie esauste', 0, 2, 0, {}],
  ]);

  // le categorie della Risacca: quanti «pezzi» di quella risorsa vale ogni oggetto
  const RESOF = {};   // res -> [[id, quanto]]
  Object.values(CAT).forEach(o => { if (!o.res) return; const [r, k] = o.res.split(':'); o.resK = r; o.resV = +k || 1; (RESOF[r] = RESOF[r] || []).push([o.id, o.resV]); });
  // i sinonimi per i messaggi della chat («portami delle assi»)
  const NAMEIDX = Object.values(CAT).map(o => [o.id, norm(o.nome)]);
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[«»"']/g, ' ').trim(); }
  const nm = id => (CAT[id] ? CAT[id].nome : id);
  function alts(key) { return key.split('|'); }
  const isItem = id => !!CAT[id];

  // =====================================================================================================================
  // LE POSTAZIONI
  // model: il mobile negli interni (st_* li disegna oggetti_ui.js, gli altri sono del kit di mobili). rooms: dove si trovano.
  // Un mobile del kit può già essere una postazione (la cucina di casa, il lavandino per l'acqua, le botti della cantina).
  // =====================================================================================================================
  const STATIONS = {
    cucina:          { nome: 'cucina', model: 'kitchenStove' },
    acqua:           { nome: 'acqua corrente', model: 'kitchenSink' },
    forno:           { nome: 'forno a legna', model: 'st_forno' },
    forgia:          { nome: 'forgia e incudine', model: 'st_forgia' },
    saldatrice:      { nome: 'saldatrice', model: 'st_saldatrice' },
    banco_lavoro:    { nome: 'banco da lavoro', model: 'pv_banco_lavoro' },
    banco_falegname: { nome: 'banco del falegname', model: 'st_banco_falegname' },
    banco_macellaio: { nome: 'banco del macellaio', model: 'st_banco_macellaio' },
    macchina_cucire: { nome: 'macchina da cucire', model: 'st_macchina_cucire' },
    ciclostile:      { nome: 'ciclostile', model: 'st_ciclostile' },
    banco_radio:     { nome: 'banco radio', model: 'st_banco_radio' },
    camera_oscura:   { nome: 'camera oscura', model: 'st_camera_oscura' },
    tavolo_medico:   { nome: 'tavolo medico', model: 'st_tavolo_medico' },
    alambicco:       { nome: 'alambicco', model: 'st_alambicco' },
    stufa:           { nome: 'stufa', model: 'st_stufa' },
    botti:           { nome: 'botti della cantina', model: 'fd_barrel' },
    linea:           { nome: 'linea delle conserve', model: 'fx_conveyor-long' },
  };
  // i mobili del kit che fanno già da postazione
  const FURN2ST = { pv_banco_lavoro: 'banco_lavoro', pv_ponte: 'banco_lavoro', kitchenStove: 'cucina', kitchenSink: 'acqua', bathroomSink: 'acqua', fd_barrel: 'botti', 'fx_conveyor-long': 'linea', 'fx_machine': 'linea' };
  Object.entries(STATIONS).forEach(([k, s]) => { s.id = k; if (s.model.startsWith('st_')) FURN2ST[s.model] = k; });
  if (INT.LOOTAS) Object.entries(INT.LOOTAS).forEach(([k, v]) => { if (FURN2ST[v] && !FURN2ST[k]) FURN2ST[k] = FURN2ST[v]; });   // [interni] fornelli, lavello e focolare nuovi fanno da cucina e acqua

  // =====================================================================================================================
  // LE RICETTE
  // in: {oggetto: quanti} — «a|b» vuol dire uno qualsiasi dei due. tools: attrezzi che servono (si consumano un po', non spariscono).
  // st: postazione (o «a|b»), null = ovunque. min: minuti di lavoro. place: solo in certi luoghi (estrarre, raccogliere).
  // kind: 'fai' (fabbricare), 'cucina', 'smonta', 'raccogli'. job: chi la fa per mestiere (per la produzione degli abitanti).
  // =====================================================================================================================
  const RECIPES = {};
  function rc(id, nome, out, inp, o) { RECIPES[id] = Object.assign({ id, nome, out, in: inp || {}, tools: [], st: null, min: 30, kind: 'fai' }, o || {}); }
  // ---- cucina ----
  rc('pasto_pasta', 'pasta al sugo (3 piatti)', { pasto: 3 }, { pasta: 1, 'passata|pomodori': 1 }, { st: 'cucina|stufa', tools: ['pentola'], min: 30, kind: 'cucina' });
  rc('pasto_minestra', 'minestra di verdure (4 gavette)', { minestra: 4 }, { verdura: 2, patate: 1 }, { st: 'cucina|stufa', tools: ['pentola'], min: 60, kind: 'cucina' });
  rc('pasto_pesce', 'pesce fritto (3 piatti)', { pasto: 3 }, { 'pesce|sarde': 2, olio: 1 }, { st: 'cucina', tools: ['padella'], min: 30, kind: 'cucina' });
  rc('pasto_carne', 'carne e patate (3 piatti)', { pasto: 3 }, { 'carne|salsiccia': 2, patate: 1 }, { st: 'cucina', tools: ['padella'], min: 45, kind: 'cucina' });
  rc('pasto_riso', 'riso e verdure (3 piatti)', { pasto: 3 }, { riso: 1, 'verdura|pomodori|legumi': 1 }, { st: 'cucina|stufa', tools: ['pentola'], min: 30, kind: 'cucina' });
  rc('caffe', 'caffè con la moka (4 tazzine)', { caffe_tazza: 4 }, { caffe: 1 }, { st: 'cucina|stufa', tools: ['moka'], min: 10, kind: 'cucina' });
  rc('thermos', 'thermos di caffè', { thermos: 1 }, { caffe: 1, bottiglia_vuota: 1 }, { st: 'cucina|stufa', tools: ['moka'], min: 15, kind: 'cucina' });
  rc('te', 'tè caldo (4 tazze)', { te: 4 }, { te_foglie: 1 }, { st: 'cucina|stufa', tools: ['pentola'], min: 10, kind: 'cucina' });
  rc('bollire', 'bollire l\'acqua di cisterna', { acqua: 3 }, { acqua_pozzo: 3 }, { st: 'cucina|stufa', tools: ['pentola'], min: 30, kind: 'cucina' });
  rc('conserva', 'conserva di pomodoro (3 barattoli)', { conserva: 3 }, { pomodori: 3, barattolo: 3, sale: 1 }, { st: 'cucina|stufa', tools: ['pentola'], min: 90, kind: 'cucina' });
  rc('formaggio', 'formaggio', { formaggio: 1 }, { latte: 6, sale: 1 }, { st: 'cucina', tools: ['pentola'], min: 120, kind: 'cucina' });
  rc('pane', 'pane (8 pagnotte)', { pane: 8 }, { farina: 1, lievito: 1 }, { st: 'forno', min: 60, kind: 'cucina' });
  rc('focaccia', 'focaccia (8 pezzi)', { focaccia: 8 }, { farina: 1, olio: 1, lievito: 1 }, { st: 'forno', min: 60, kind: 'cucina' });
  rc('biscotti', 'biscotti (6 pacchi)', { biscotti: 6 }, { farina: 1, zucchero: 1, uova: 1 }, { st: 'forno', min: 60, kind: 'cucina' });
  rc('gallette', 'gallette che durano (6 pacchi)', { gallette: 6 }, { farina: 1, sale: 1 }, { st: 'forno', min: 90, kind: 'cucina' });
  rc('macella', 'macellare un capo', { carne: 12, salsiccia: 6, pelle: 1, strutto: 2 }, { capi: 1 }, { st: 'banco_macellaio', tools: ['coltello'], min: 180, kind: 'fai' });
  rc('salame', 'salami (2)', { salame: 2 }, { carne: 3, sale: 1 }, { st: 'banco_macellaio', tools: ['coltello'], min: 60, kind: 'cucina' });
  rc('passata', 'passata di pomodoro (4 bottiglie)', { passata: 4 }, { pomodori: 4, bottiglia_vuota: 4 }, { st: 'linea|cucina', tools: ['pentola'], min: 60, kind: 'cucina' });
  rc('mattoni', 'mattoni (un pallet)', { mattoni: 1 }, { sabbia: 2, ghiaia: 1, carbone: 1 }, { st: 'linea', min: 180, kind: 'fai' });
  rc('scatolame', 'tonno in scatola (10)', { scatolame: 10 }, { pesce: 3, latta: 1, olio: 1 }, { st: 'linea', min: 60, kind: 'cucina' });
  rc('vino', 'vino (4 bottiglie)', { vino: 4 }, { uva: 3, bottiglia_vuota: 4 }, { st: 'botti', min: 60, kind: 'cucina' });
  rc('olio', 'olio dal frantoio', { olio: 1 }, { olive: 3 }, { place: /oliveto|masseria/, min: 60, kind: 'cucina' });
  rc('grappa', 'grappa (2 bottiglie)', { grappa: 2 }, { vino: 3, legna: 1 }, { st: 'alambicco', min: 120, kind: 'cucina' });
  rc('alcol', 'alcol dalla grappa', { disinfettante: 2 }, { grappa: 1 }, { min: 5, kind: 'fai' });
  // ---- ovunque, con le mani ----
  rc('panino', 'panino imbottito (2)', { panino: 2 }, { pane: 1, 'salame|formaggio|scatolame|carne_scatola': 1 }, { tools: ['coltello'], min: 5, kind: 'cucina' });
  rc('razione', 'pacco viveri per la banda', { razione: 1 }, { 'pane|gallette|biscotti': 2, 'scatolame|carne_scatola|legumi|conserva': 2, acqua: 1 }, { min: 10, kind: 'fai' });
  rc('bende', 'bende (4)', { bende: 4 }, { 'stoffa|lenzuola': 1 }, { tools: ['forbici'], min: 15, kind: 'fai' });
  rc('bende_garze', 'bende dalle garze (2)', { bende: 2 }, { garze: 1, disinfettante: 1 }, { min: 10, kind: 'fai' });
  rc('disinfettante', 'disinfettante (2)', { disinfettante: 2 }, { alcol: 1 }, { min: 5, kind: 'fai' });
  rc('kit_medico', 'cassetta del pronto soccorso', { kit_medico: 1 }, { bende: 2, disinfettante: 1, 'cerotti|garze': 1, 'medicine|antibiotici': 1 }, { min: 15, kind: 'fai' });
  rc('molotov', 'molotov (4)', { molotov: 4 }, { benzina: 1, bottiglia_vuota: 4, stracci: 2 }, { min: 15, kind: 'fai' });
  rc('triboli', 'triboli (chiodi a tre punte)', { triboli: 1 }, { chiodi: 1, filo_ferro: 1 }, { tools: ['pinze'], min: 30, kind: 'fai' });
  rc('kit', 'kit di sabotaggio', { kit: 1 }, { nastro: 1, pile: 1, cavo: 1, zucchero: 1 }, { tools: ['pinze', 'cacciavite'], min: 30, kind: 'fai' });
  rc('sacco_sabbia', 'sacchetti di sabbia (2)', { sacco_sabbia: 2 }, { sacchi: 1, sabbia: 1 }, { tools: ['pala'], min: 20, kind: 'fai' });
  rc('malta', 'malta (3 secchi)', { malta: 3 }, { cemento: 1, sabbia: 2, 'acqua|tanica_acqua': 1 }, { tools: ['pala', 'secchio'], min: 30, kind: 'fai' });
  rc('legna', 'spaccare legna (4 fasci)', { legna: 4 }, { legno: 1 }, { tools: ['ascia'], min: 45, kind: 'fai' });
  rc('stencil', 'stencil di cartone', { stencil: 1 }, { 'cartone|cartoncino': 1 }, { tools: ['taglierino'], min: 20, kind: 'fai' });
  rc('passamontagna', 'passamontagna', { passamontagna: 1 }, { lana: 1 }, { tools: ['ferri_maglia'], min: 120, kind: 'fai' });
  rc('guanti_lana', 'guanti di lana (2 paia)', { guanti_lana: 2 }, { lana: 1 }, { tools: ['ferri_maglia'], min: 90, kind: 'fai' });
  rc('maglione', 'maglione di lana', { maglione: 1 }, { lana: 2 }, { tools: ['ferri_maglia'], min: 240, kind: 'fai' });
  rc('antenna_kit', 'antenna smontabile', { antenna_kit: 1 }, { tubi: 2, cavo_coax: 1, bulloni: 1 }, { tools: ['seghetto', 'chiave_inglese'], min: 60, kind: 'fai' });
  // ---- acqua e fuoco ----
  rc('acqua', 'riempire bottiglie (4)', { acqua: 4 }, { bottiglia_vuota: 4 }, { st: 'acqua', min: 5, kind: 'raccogli' });
  rc('tanica_acqua', 'riempire la tanica', { tanica_acqua: 1 }, { tanica_vuota: 1 }, { st: 'acqua', min: 5, kind: 'raccogli' });
  rc('acqua_pozzo', 'tirare su acqua dal pozzo (4)', { acqua_pozzo: 4 }, { bottiglia_vuota: 4 }, { place: /pozzo|cisterna|sorgente/, min: 10, kind: 'raccogli' });
  rc('carbone_legna', 'carbone di legna', { carbone: 1 }, { legno: 2 }, { place: /carbonaia/, min: 240, kind: 'fai' });
  // ---- banco da lavoro e falegname ----
  const LEGNO = 'banco_falegname|banco_lavoro';
  rc('assi', 'assi da un tronco (2 fasci)', { assi: 2 }, { legno: 1 }, { st: 'banco_falegname', tools: ['sega'], min: 60, kind: 'fai' });
  rc('travi', 'trave squadrata', { travi: 1 }, { legno: 1 }, { st: 'banco_falegname', tools: ['sega', 'ascia'], min: 60, kind: 'fai' });
  rc('casse', 'casse di legno (2)', { casse: 2 }, { assi: 1, chiodi: 1 }, { st: LEGNO, tools: ['sega', 'martello'], min: 40, kind: 'fai' });
  rc('sedia', 'sedie (2)', { sedia: 2 }, { assi: 1, chiodi: 1 }, { st: LEGNO, tools: ['sega', 'martello'], min: 60, kind: 'fai' });
  rc('tavolo', 'tavolo', { tavolo: 1 }, { assi: 2, chiodi: 1 }, { st: LEGNO, tools: ['sega', 'martello'], min: 90, kind: 'fai' });
  rc('branda', 'branda', { branda: 1 }, { assi: 1, 'telo|stoffa': 1, chiodi: 1 }, { st: LEGNO, tools: ['sega', 'martello'], min: 60, kind: 'fai' });
  rc('scaffale', 'scaffale', { scaffale: 1 }, { assi: 2, viti: 1 }, { st: LEGNO, tools: ['sega', 'cacciavite'], min: 60, kind: 'fai' });
  rc('mobili', 'armadio', { mobili: 1 }, { assi: 3, viti: 1, cerniere: 1 }, { st: 'banco_falegname', tools: ['sega', 'cacciavite', 'trapano'], min: 180, kind: 'fai' });
  rc('carriola', 'carriola', { carriola: 1 }, { assi: 1, ferro: 1, pneumatico: 1, bulloni: 1 }, { st: LEGNO, tools: ['sega', 'chiave_inglese'], min: 120, kind: 'fai' });
  rc('barricata', 'pannelli da barricata', { barricata: 1 }, { assi: 2, 'travi|compensato': 1, chiodi: 1 }, { st: LEGNO, tools: ['sega', 'martello'], min: 60, kind: 'fai' });
  rc('botola', 'botola mimetizzata', { botola: 1 }, { assi: 2, cerniere: 1, telo: 1 }, { st: LEGNO, tools: ['sega', 'martello'], min: 90, kind: 'fai' });
  rc('banco', 'banco da lavoro smontabile', { banco: 1 }, { assi: 2, travi: 1, viti: 1 }, { st: LEGNO, tools: ['sega', 'cacciavite', 'trapano'], min: 120, kind: 'fai' });
  rc('grimaldello', 'grimaldelli', { grimaldello: 1 }, { filo_ferro: 1 }, { st: 'banco_lavoro|forgia', tools: ['lima', 'pinze'], min: 60, kind: 'fai' });
  rc('timbro_falso', 'timbro falso dell\'Ufficio Rettifiche', { timbro_falso: 1 }, { 'sughero|cartoncino': 1, inchiostro: 1 }, { st: 'banco_lavoro|camera_oscura', tools: ['taglierino', 'lima', 'moduli'], min: 120, kind: 'fai' });
  rc('banco_radio', 'banco radio portatile', { banco_radio: 1 }, { assi: 1, cavo: 1, interruttore: 1, lampadine: 1 }, { st: 'banco_lavoro', tools: ['cacciavite', 'saldatore'], min: 90, kind: 'fai' });
  rc('alambicco', 'alambicco', { alambicco: 1 }, { tubi: 1, latta: 2, stagno: 1 }, { st: 'banco_lavoro|saldatrice', tools: ['saldatore', 'pinze'], min: 120, kind: 'fai' });
  // ---- forgia e saldatrice ----
  const FERRO = 'forgia';
  rc('chiodi', 'chiodi (6 scatole)', { chiodi: 6 }, { ferro: 1, carbone: 1 }, { st: FERRO, tools: ['martello'], min: 60, kind: 'fai' });
  rc('coltello', 'coltelli (3)', { coltello: 3 }, { ferro: 1, legno: 1, carbone: 1 }, { st: FERRO, tools: ['martello', 'lima'], min: 90, kind: 'fai' });
  rc('pala', 'pale (2)', { pala: 2 }, { ferro: 1, legno: 1, carbone: 1 }, { st: FERRO, tools: ['martello'], min: 90, kind: 'fai' });
  rc('piede', 'piedi di porco (2)', { piede: 2 }, { ferro: 1, carbone: 1 }, { st: FERRO, tools: ['martello'], min: 60, kind: 'fai' });
  rc('ascia', 'asce (2)', { ascia: 2 }, { ferro: 1, legno: 1, carbone: 1 }, { st: FERRO, tools: ['martello', 'lima'], min: 90, kind: 'fai' });
  rc('piccone', 'picconi (2)', { piccone: 2 }, { ferro: 1, legno: 1, carbone: 1 }, { st: FERRO, tools: ['martello'], min: 90, kind: 'fai' });
  rc('cerniere', 'cerniere (4 paia)', { cerniere: 4 }, { ferro: 1, carbone: 1 }, { st: FERRO, tools: ['martello'], min: 60, kind: 'fai' });
  rc('catena', 'catene (2)', { catena: 2 }, { ferro: 2, carbone: 1 }, { st: FERRO, tools: ['martello'], min: 120, kind: 'fai' });
  rc('tubo_stufa', 'tubi da stufa (2)', { tubo_stufa: 2 }, { 'latta|lamiera': 1 }, { st: 'forgia|saldatrice', tools: ['martello'], min: 60, kind: 'fai' });
  rc('stufa', 'stufa a legna', { stufa: 1 }, { lamiera: 2, tubo_stufa: 1, bulloni: 1, carbone: 1 }, { st: 'forgia|saldatrice', tools: ['martello', 'chiave_inglese'], min: 180, kind: 'fai' });
  rc('ferro_rottami', 'ferro dai rottami', { ferro: 2 }, { rottami: 3, carbone: 1 }, { st: 'forgia|saldatrice', tools: ['martello'], min: 120, kind: 'fai' });
  rc('porta_rinforzata', 'porta rinforzata', { porta_rinforzata: 1 }, { lamiera: 2, cerniere: 1, lucchetto: 1, bulloni: 1 }, { st: 'saldatrice|banco_lavoro', tools: ['trapano', 'chiave_inglese'], min: 180, kind: 'fai' });
  // ---- sartoria ----
  const CUCI = 'macchina_cucire';
  rc('vestiti', 'vestiti', { vestiti: 1 }, { stoffa: 2, bottoni: 1 }, { st: CUCI, min: 90, kind: 'fai' });
  rc('cappotto', 'cappotto', { cappotto: 1 }, { stoffa: 3, lana: 1, bottoni: 1 }, { st: CUCI, min: 180, kind: 'fai' });
  rc('coperta', 'coperta', { coperta: 1 }, { lana: 2, stoffa: 1 }, { st: CUCI, min: 90, kind: 'fai' });
  rc('lenzuola', 'lenzuola', { lenzuola: 1 }, { stoffa: 2 }, { st: CUCI, min: 45, kind: 'fai' });
  rc('sacchi_cuciti', 'sacchi (3)', { sacchi: 3 }, { stoffa: 1 }, { st: CUCI, min: 30, kind: 'fai' });
  rc('divisa', 'divisa dei Grigi', { divisa: 1 }, { stoffa_grigia: 2, bottoni: 1 }, { st: CUCI, tools: ['forbici'], min: 180, kind: 'fai' });
  // ---- stampa e falsi ----
  rc('volantini', 'volantini (un pacco)', { volantini: 1 }, { carta: 1, inchiostro: 1 }, { st: 'ciclostile', min: 30, kind: 'fai' });
  rc('poster', 'manifesti clandestini (8)', { poster: 8 }, { carta: 1, inchiostro: 1 }, { st: 'ciclostile', min: 40, kind: 'fai' });
  rc('libretto', 'libretti clandestini (6)', { libretto: 6 }, { carta: 1, inchiostro: 1, colla: 1 }, { st: 'ciclostile', min: 60, kind: 'fai' });
  rc('giornale', 'il giornale del Garante (20 copie)', { giornale: 20 }, { carta: 1, inchiostro: 1 }, { st: 'ciclostile', min: 60, kind: 'fai' });
  rc('foto_tessera', 'foto tessera (6)', { foto_tessera: 6 }, { rullino: 1 }, { st: 'camera_oscura', tools: ['fotocamera'], min: 60, kind: 'fai' });
  rc('documenti', 'lasciapassare falso', { documenti: 1 }, { carta_bollata: 1, foto_tessera: 1 }, { st: 'camera_oscura|banco_lavoro', tools: ['timbro_falso', 'penne'], min: 60, kind: 'fai' });
  // ---- radio ----
  rc('ricetrasmittente', 'ricetrasmittente', { ricetrasmittente: 1 }, { valvole: 2, transistor: 1, altoparlante: 1, cavo: 1, 'pile|batteria_auto': 1, casse: 1, stagno: 1 }, { st: 'banco_radio', tools: ['saldatore', 'cacciavite', 'pinze'], min: 180, kind: 'fai' });
  rc('disturbatore', 'disturbatore di frequenze', { disturbatore: 1 }, { valvole: 1, transistor: 2, cavo: 1, pile: 1, stagno: 1 }, { st: 'banco_radio', tools: ['saldatore', 'pinze'], min: 120, kind: 'fai' });
  rc('timer', 'timer a orologeria', { timer: 1 }, { sveglia: 1, pile: 1, cavo: 1 }, { st: 'banco_radio|banco_lavoro', tools: ['saldatore', 'pinze'], min: 40, kind: 'fai' });
  rc('radio_riparata', 'riparare una radio', { radiolina: 1 }, { radio_rotta: 1, valvole: 1, stagno: 1 }, { st: 'banco_radio', tools: ['saldatore', 'cacciavite'], min: 90, kind: 'fai' });
  // ---- smontare ----
  rc('sm_radio', 'smontare la radio rotta', { valvole: 1, altoparlante: 1, cavo: 1 }, { radio_rotta: 1 }, { tools: ['cacciavite'], min: 20, kind: 'smonta' });
  rc('sm_tv', 'smontare il televisore', { valvole: 2, transistor: 1, altoparlante: 1, cavo: 1, vetro: 1 }, { tv_rotta: 1 }, { tools: ['cacciavite', 'pinze'], min: 40, kind: 'smonta' });
  rc('sm_elettro', 'smontare l\'elettrodomestico', { rottami: 2, cavo: 1, interruttore: 1, bulloni: 1 }, { elettrodomestico: 1 }, { tools: ['cacciavite', 'chiave_inglese'], min: 40, kind: 'smonta' });
  rc('sm_mobile', 'smontare il mobile sfasciato', { assi: 1, viti: 1, cerniere: 1 }, { mobile_rotto: 1 }, { tools: ['martello'], min: 20, kind: 'smonta' });
  rc('sm_mobili', 'smontare un armadio', { assi: 2, viti: 1, cerniere: 1 }, { mobili: 1 }, { tools: ['cacciavite'], min: 30, kind: 'smonta' });
  rc('sm_casse', 'smontare le casse', { assi: 1, chiodi: 1 }, { casse: 2 }, { tools: ['piede|martello'], min: 10, kind: 'smonta' });
  rc('sm_ricambi', 'smontare i pezzi d\'auto', { rottami: 1, bulloni: 1, cavo: 1 }, { ricambi: 1 }, { tools: ['chiave_inglese'], min: 20, kind: 'smonta' });
  rc('sm_pneumatico', 'tagliare il pneumatico', { stracci: 2 }, { pneumatico: 1 }, { tools: ['taglierino'], min: 15, kind: 'smonta' });
  rc('sm_sveglia', 'smontare la sveglia', { rottami: 1 }, { sveglia: 1 }, { tools: ['cacciavite'], min: 10, kind: 'smonta' });
  rc('sm_vestiti', 'fare stracci dei vestiti', { stracci: 3 }, { vestiti: 1 }, { tools: ['forbici'], min: 10, kind: 'smonta' });
  // ---- raccogliere ed estrarre (fuori, con l'attrezzo giusto) ----
  rc('x_pesca', 'pescare', { pesce: 1, sarde: 1 }, {}, { tools: ['canna|rete_pesca'], place: /molo|pontile|caletta|spiaggia|punta|marina|lungomare|calata|faro|lanterna|scogli|pesca_|cala|bagno_/, min: 60, kind: 'raccogli', npcOut: { pesce: 3, sarde: 2, polpo: .2 } });
  rc('x_legna', 'tagliare un albero', { legno: 1, legna: 1 }, {}, { tools: ['ascia'], place: /pineta|sugheri|radura|macchia|collina|monte|bosco|villaggio/, min: 90, kind: 'raccogli', npcOut: { legno: 2, legna: 2, sughero: .3 } });
  rc('x_sabbia', 'spalare sabbia', { sabbia: 2 }, {}, { tools: ['pala'], place: /spiaggia|caletta|deserto/, min: 30, kind: 'raccogli' });
  rc('x_cava', 'lavorare in cava', { pietre: 1, ghiaia: 1 }, {}, { tools: ['piccone'], place: /cava|ruderi|rudere/, min: 60, kind: 'raccogli', npcOut: { pietre: 2, ghiaia: 2, sabbia: 1 } });
  rc('x_miniera', 'scavare carbone', { carbone: 1 }, {}, { tools: ['piccone'], place: /miniera|stazione/, min: 120, kind: 'raccogli', npcOut: { carbone: 2, rottami: .5 } });
  rc('x_orto', 'raccogliere nell\'orto', { verdura: 1, patate: 1, pomodori: 1 }, {}, { place: /masseria|ovile|villaggio|oliveto|vigne/, min: 60, kind: 'raccogli', npcOut: { verdura: 3, patate: 2, pomodori: 2, frutta: 1, cipolle: .5 } });
  rc('x_uva', 'vendemmiare', { uva: 1 }, {}, { place: /vigne|cantina/, min: 60, kind: 'raccogli', npcOut: { uva: 2, frutta: .5 } });
  rc('x_olive', 'raccogliere olive', { olive: 1 }, {}, { place: /oliveto/, min: 60, kind: 'raccogli', npcOut: { olive: 2, frutta: .3 } });
  rc('x_ovile', 'mungere e badare alle bestie', { latte: 2, uova: 1 }, {}, { place: /ovile/, min: 60, kind: 'raccogli', npcOut: { latte: 3, uova: 1, lana: .3, capi: .08 } });
  rc('x_sale', 'raccogliere il sale', { sale: 2 }, {}, { tools: ['pala'], place: /saline|salinaio/, min: 60, kind: 'raccogli', npcOut: { sale: 5 } });
  // ---- ricette degli oggetti aggiunti ----
  rc('polenta', 'polenta (4 piatti)', { polenta: 4 }, { farina_mais: 1, sale: 1 }, { st: 'cucina|stufa', tools: ['pentola'], min: 50, kind: 'cucina' });
  rc('minestrone', 'minestrone (4 gavette)', { minestrone: 4 }, { 'verdura|patate': 2, 'ceci|legumi|orzo': 1 }, { st: 'cucina|stufa', tools: ['pentola'], min: 60, kind: 'cucina' });
  rc('castagne_arrosto', 'castagne arrosto', { castagne_arrosto: 2 }, { castagne: 1 }, { st: 'cucina|stufa|forgia', tools: ['padella'], min: 20, kind: 'cucina' });
  rc('baccala', 'baccalà con le patate (3 piatti)', { pasto: 3 }, { baccala: 1, patate: 1 }, { st: 'cucina', tools: ['pentola'], min: 60, kind: 'cucina' });
  rc('caffe_orzo', 'caffè d\'orzo (4 tazze)', { caffe_tazza: 4 }, { caffe_orzo: 1 }, { st: 'cucina|stufa', tools: ['moka'], min: 10, kind: 'cucina' });
  rc('marmellata', 'marmellata (3 barattoli)', { marmellata: 3 }, { 'mele|arance|frutta': 3, zucchero: 1, barattolo: 3 }, { st: 'cucina', tools: ['pentola'], min: 90, kind: 'cucina' });
  rc('ricotta', 'ricotta', { ricotta: 2 }, { latte: 4 }, { st: 'cucina', tools: ['pentola'], min: 60, kind: 'cucina' });
  rc('mirto', 'liquore di mirto', { mirto: 2 }, { grappa: 2, zucchero: 1 }, { min: 30, kind: 'cucina' });
  rc('x_castagne', 'raccogliere castagne', { castagne: 1, funghi: .3 }, {}, { place: /pineta|sugheri|radura|macchia|bosco|monte|villaggio/, min: 60, kind: 'raccogli', npcOut: { castagne: 1, funghi: .2 } });
  rc('x_mele', 'cogliere frutta', { mele: 1, noci: .5 }, {}, { place: /masseria|villaggio|oliveto|frutteto/, min: 60, kind: 'raccogli' });
  rc('x_lattine', 'raccogliere lattine', { lattine: 1 }, { sacchi: 1 }, { place: /discarica|spiaggia|lungomare|calata|piazza|campeggio/, min: 40, kind: 'raccogli' });
  rc('stecca', 'stecca per fratture', { stecca: 1 }, { assi: 1, bende: 1 }, { tools: ['coltello|coltellino'], min: 15, kind: 'fai' });
  rc('lampada_petrolio', 'lampada a petrolio', { lampada_petrolio: 1 }, { barattolo: 1, stracci: 1, filo_ferro: 1 }, { tools: ['pinze'], min: 30, kind: 'fai' });
  rc('fionda', 'fionda', { fionda: 1 }, { legno: 1, stracci: 1 }, { tools: ['coltello|coltellino'], min: 30, kind: 'fai' });
  rc('grata', 'grata di ferro', { grata: 1 }, { tondino: 3, carbone: 1 }, { st: 'forgia|saldatrice', tools: ['martello'], min: 120, kind: 'fai' });
  rc('pallet', 'assi dai pallet', { assi: 1, chiodi: .5 }, { pallet: 1 }, { tools: ['piede|martello'], min: 20, kind: 'smonta' });
  rc('bicicletta', 'montare una bicicletta', { bicicletta: 1 }, { telaio: 1, ruota_bici: 2, catena_bici: 1, bulloni: 1 }, { st: 'banco_lavoro', tools: ['chiave_inglese', 'pompa'], min: 120, kind: 'fai' });
  rc('sm_bici', 'smontare la bici rotta', { telaio: 1, ruota_bici: 1, catena_bici: 1 }, { bici_rotta: 1 }, { tools: ['chiave_inglese'], min: 30, kind: 'smonta' });
  rc('sm_frigo', 'smontare il frigorifero', { rame: 1, motore_el: 1, rottami: 3 }, { frigo_rotto: 1 }, { tools: ['cacciavite', 'chiave_inglese'], min: 60, kind: 'smonta' });
  rc('sm_motore', 'recuperare il rame dal motorino', { rame: 1, rottami: 1 }, { motore_el: 1 }, { tools: ['cacciavite', 'pinze'], min: 30, kind: 'smonta' });
  rc('sm_batterie', 'recuperare il piombo dalle batterie', { piombo: 1 }, { batterie_esauste: 1 }, { tools: ['pinze'], min: 30, kind: 'smonta' });
  rc('sm_cavo', 'spelare i cavi per il rame', { rame: 1 }, { cavo: 2 }, { tools: ['coltello|coltellino|taglierino'], min: 30, kind: 'smonta' });
  rc('dinamo', 'dinamo a manovella', { dinamo: 1 }, { motore_el: 1, ruota_bici: 1, cavo: 1 }, { st: 'banco_lavoro|banco_radio', tools: ['chiave_inglese', 'saldatore'], min: 90, kind: 'fai' });
  rc('radio_galena', 'radio a galena', { radio_galena: 1 }, { rame: 1, cuffie: 1, transistor: 1, cartoncino: 1 }, { st: 'banco_radio|banco_lavoro', tools: ['saldatore'], min: 60, kind: 'fai' });
  rc('telefono_campo', 'telefono da campo', { telefono_campo: 1 }, { microfono: 1, cuffie: 1, cavo: 2, pile: 1, casse: 1 }, { st: 'banco_radio', tools: ['saldatore', 'cacciavite'], min: 120, kind: 'fai' });
  rc('matrici', 'matrici da ciclostile (4)', { matrici: 4 }, { carta: 1, nastro_mds: 1 }, { tools: ['macchina_scrivere'], min: 60, kind: 'fai' });
  rc('volantini_belli', 'volantini battuti a macchina (2 pacchi)', { volantini: 2 }, { carta: 1, inchiostro: 1, matrici: 1 }, { st: 'ciclostile', min: 40, kind: 'fai' });
  rc('tessera_falsa', 'tessera del Partito falsa', { tessera_partito: 1 }, { cartoncino: 1, foto_tessera: 1 }, { st: 'camera_oscura|banco_lavoro', tools: ['timbro_falso', 'penne'], min: 60, kind: 'fai' });
  rc('piantina', 'disegnare la piantina di una caserma', { piantina: 1 }, { carta: 1 }, { tools: ['penne', 'metro'], place: /commissariato|caserma|rocca|muro|varco|eliporto|hangar/, min: 90, kind: 'raccogli' });
  rc('berretto', 'berretto di lana', { berretto: 1 }, { lana: 1 }, { tools: ['ferri_maglia'], min: 90, kind: 'fai' });
  rc('sciarpa', 'sciarpa', { sciarpa: 1 }, { lana: 1 }, { tools: ['ferri_maglia'], min: 90, kind: 'fai' });
  rc('tuta', 'tuta da lavoro', { tuta: 1 }, { stoffa: 2, bottoni: 1 }, { st: 'macchina_cucire', min: 60, kind: 'fai' });
  rc('sacco_pelo', 'sacco a pelo', { sacco_pelo: 1 }, { coperta: 1, telo: 1, lana: 1 }, { st: 'macchina_cucire', min: 120, kind: 'fai' });

  // quanto vale quello che non si compra in bottega: quanto costano i pezzi, più il lavoro
  for (let k = 0; k < 3; k++) Object.values(RECIPES).forEach(rec => { const outs = Object.entries(rec.out); if (outs.length !== 1) return; const [g, q] = outs[0]; if (!CAT[g] || CAT[g].prezzo > 0) return;
    const vin = Object.entries(rec.in).reduce((s, [key, n]) => s + n * Math.min(...alts(key).map(id => (CAT[id] && CAT[id].prezzo) || 1)), 0); if (!(vin > 0) && !rec.npcOut) return; CAT[g].prezzo = r1(Math.max(.5, (vin * 1.3 + rec.min / 30) / q)); });
  const NPC_ONLY = new Set();   // ricette che il giocatore vede solo dove si possono fare (le estrazioni)

  // chi produce cosa per mestiere: [titolo, postazione o luogo, ricette che sa fare]
  const JOBPROD = [
    [/^fornai/, ['pane', 'pane', 'focaccia', 'biscotti', 'gallette']],
    [/^macellai|garzone di macelleria/, ['macella', 'salame']],
    [/^pescator/, ['x_pesca']],
    [/^cuoc|^oste$|cuoco della mensa|^cuoca/, ['pasto_pasta', 'pasto_minestra', 'pasto_pesce', 'pasto_carne', 'pasto_riso', 'baccala', 'polenta', 'minestrone']],
    [/^operai/, ['scatolame', 'passata'], /Conservificio/],
    [/^operai/, ['mattoni'], /Mattonificio|Fornace/],
    [/saldator/, ['ferro_rottami', 'tubo_stufa', 'porta_rinforzata']],
    [/carpentiere/, ['assi', 'travi', 'casse', 'barricata']],
    [/^fabbr|apprendista fabbro/, ['grata', 'chiodi', 'chiodi', 'coltello', 'pala', 'piede', 'cerniere', 'ascia', 'piccone', 'tubo_stufa', 'stufa', 'catena', 'ferro_rottami']],
    [/falegnam/, ['assi', 'assi', 'travi', 'casse', 'sedia', 'tavolo', 'branda', 'scaffale', 'mobili', 'carriola']],
    [/boscaiol/, ['x_legna']],
    [/salinar/, ['x_sale']],
    [/^sart/, ['vestiti', 'cappotto', 'coperta', 'lenzuola', 'sacchi_cuciti', 'tuta', 'sacco_pelo']],
    [/^bracciante$/, ['x_orto']],
    [/bracciante delle vigne/, ['x_uva']],
    [/vignaiol/, ['vino']],
    [/bracciante dell'oliveto/, ['x_olive', 'olio']],
    [/allevator/, ['x_ovile', 'formaggio', 'ricotta']],
    [/cavator/, ['x_cava']],
    [/minator/, ['x_miniera']],
    [/carbonai/, ['carbone_legna']],
    [/tipograf/, ['giornale']],
    [/farmacist/, ['disinfettante', 'bende_garze']],
    [/^commesso$/, ['radio_riparata']],
    [/boscaiol/, ['x_legna', 'x_castagne']],
    [/apprendista meccanico/, ['sm_ricambi', 'sm_elettro']],
  ];

  // i mestieri che mancavano: chi scava il carbone in miniera e chi lo fa con la legna alla carbonaia
  (function newJobs() { if (I.OUTDOOR.some(o => o[1] === 'minatore')) return; if (PLACES.miniera) I.OUTDOOR.push(['miniera', 'minatore', 4, 6, 6, 14]); if (PLACES.carbonaia) I.OUTDOOR.push(['carbonaia', 'carbonaio', 2, 5, 6, 16]); I.ESSENTIAL.push(/^minator/, /^carbonai/); I.GENDER.push(['minatore', 'minatrice'], ['carbonaio', 'carbonaia']); })();

  // =====================================================================================================================
  // LE BOTTEGHE: chi vende cosa (ref come in Economia: id di un luogo o 'use:<uso>')
  // =====================================================================================================================
  const SHOPLIST = [
    ['wu', ['pane', 'pasta', 'riso', 'passata', 'scatolame', 'legumi', 'farina', 'zucchero', 'sale', 'caffe', 'te_foglie', 'latte', 'uova', 'formaggio', 'salame', 'olio', 'vino', 'birra', 'acqua', 'biscotti', 'candele', 'fiammiferi', 'sapone', 'gesso', 'carte', 'sigarette', 'aranciata']],
    ['use:emporio', ['pasta', 'riso', 'farina', 'zucchero', 'caffe', 'scatolame', 'carne_scatola', 'legumi', 'biscotti', 'cioccolato', 'gallette', 'birra', 'acqua', 'aranciata', 'coperta', 'lenzuola', 'vestiti', 'maglione', 'cappotto', 'scarpe', 'guanti_lana',
      'pentola', 'padella', 'moka', 'torcia', 'pile', 'lampadine', 'radiolina', 'sveglia', 'fornello', 'bombola', 'tanica_vuota', 'secchio', 'nastro', 'colla', 'carta', 'quaderno', 'penne', 'sapone', 'detersivo', 'candeggina', 'dentifricio', 'rasoio', 'candele', 'fiammiferi', 'accendino', 'macchina_cucire', 'cassetta', 'zaino', 'carbone', 'legna', 'stoffa', 'lana']],
    ['use:panetteria', ['pane', 'focaccia', 'biscotti', 'gallette', 'farina', 'lievito']],
    ['use:macelleria', ['carne', 'salsiccia', 'salame', 'strutto', 'pelle']],
    ['use:pescheria', ['pesce', 'sarde', 'polpo', 'scatolame', 'sale']],
    ['use:fruttivendolo', ['verdura', 'frutta', 'patate', 'pomodori', 'cipolle', 'limoni', 'olive', 'olio', 'miele']],
    ['use:ferramenta', ['chiodi', 'viti', 'bulloni', 'cerniere', 'lucchetto', 'catena', 'filo_ferro', 'corda', 'nastro', 'colla', 'sacchi', 'secchio', 'vernice', 'bomboletta', 'tanica_vuota', 'guanti',
      'martello', 'cacciavite', 'pinze', 'tronchesi', 'chiave_inglese', 'seghetto', 'sega', 'lima', 'trapano', 'taglierino', 'forbici', 'cazzuola', 'pala', 'piede', 'carriola', 'saldatore', 'stagno',
      'lampadine', 'pile', 'cavo', 'interruttore', 'torcia', 'telo', 'rete', 'tubi', 'alcol', 'candele', 'fiammiferi']],
    ['use:tabacchi', ['sigarette', 'tabacco', 'fiammiferi', 'accendino', 'carte', 'gesso', 'penne', 'quaderno', 'buste', 'carta_bollata', 'giornale', 'carta', 'cartoncino', 'inchiostro']],
    ['officina', ['olio_motore', 'batteria_auto', 'pneumatico', 'ricambi', 'tanica_vuota', 'chiave_inglese', 'piede', 'bomboletta', 'vernice', 'cavo', 'nastro', 'guanti']],
    ['benzina', ['benzina', 'gasolio', 'olio_motore', 'tanica_vuota']],
    ['video', ['radiolina', 'telefono', 'fotocamera', 'rullino', 'cassetta', 'pile', 'valvole', 'transistor', 'cavo_coax', 'altoparlante', 'saldatore', 'stagno', 'ingranditore']],
    ['use:farmacia', ['stetoscopio', 'medicine', 'antibiotici', 'garze', 'bende', 'cerotti', 'disinfettante', 'siringhe', 'alcol', 'sapone', 'spugne', 'dentifricio']],
    ['use:fabbro', ['coltello', 'pala', 'piede', 'ascia', 'piccone', 'chiodi', 'cerniere', 'catena', 'tubo_stufa', 'stufa', 'ferro']],
    ['use:falegnameria', ['assi', 'travi', 'casse', 'sedia', 'tavolo', 'branda', 'scaffale', 'mobili', 'carriola', 'compensato']],
    ['use:sartoria', ['stoffa', 'lana', 'bottoni', 'ago_filo', 'ferri_maglia', 'vestiti', 'cappotto', 'coperta', 'lenzuola', 'sacchi']],
    ['use:tipografia', ['carta', 'cartoncino', 'inchiostro', 'buste', 'giornale']],
    ['use:lavanderia', ['sapone', 'detersivo', 'candeggina']],
    ['use:barbiere', ['rasoio', 'sapone', 'forbici']],
    // [attività] le botteghe nuove (i capi del Guardaroba li aggiunge guardaroba.js)
    ['use:armeria', ['munizioni', 'lupara', 'coltello', 'binocolo', 'torcia', 'corda', 'stivali', 'impermeabile', 'zaino', 'sacco_pelo', 'guanti']],
    ['use:abbigliamento', ['vestiti', 'cappotto', 'maglione', 'scarpe', 'guanti', 'guanti_lana', 'berretto', 'sciarpa', 'impermeabile', 'stivali', 'tuta']],
    ['use:pub', ['birra', 'vino', 'grappa', 'whisky', 'panino', 'acqua', 'aranciata', 'sigarette']],
    ['use:autorimessa', ['olio_motore', 'pneumatico', 'batteria_auto', 'ricambi', 'tanica_vuota', 'chiave_inglese', 'benzina']],
    ['osteria', ['pasto', 'vino', 'birra', 'grappa', 'caffe_tazza', 'acqua']], ['osteria_sg', ['pasto', 'vino', 'grappa', 'acqua']], ['car_2', ['pasto', 'vino', 'birra', 'acqua']],
    ['bar', ['caffe_tazza', 'pane', 'panino', 'vino', 'birra', 'grappa', 'acqua', 'aranciata', 'sigarette']], ['sirena', ['caffe_tazza', 'pane', 'panino', 'vino', 'birra', 'grappa', 'whisky', 'acqua']],
    ['disco', ['birra', 'whisky', 'aranciata', 'sigarette']], ['gelateria', ['gelato', 'latte', 'biscotti', 'pane', 'aranciata']], ['chiosco', ['pane', 'panino', 'birra', 'acqua', 'aranciata', 'gelato']],
    ['piazza', ['verdura', 'frutta', 'patate', 'pomodori', 'cipolle', 'pesce', 'sarde', 'formaggio', 'uova', 'olio', 'carne', 'salame', 'miele', 'lana', 'legna', 'vestiti']],
    ['cantiere', ['cemento', 'sabbia', 'ghiaia', 'mattoni', 'lamiera', 'tondino', 'travi', 'rete', 'filo_spinato', 'tubi', 'cazzuola', 'secchio', 'carriola', 'sacchi', 'rottami']],
    ['magazzino', ['zaino', 'benzina', 'sigarette_contr', 'whisky', 'carne_scatola', 'caffe', 'cioccolato', 'telefono', 'fotocamera', 'radiolina', 'antibiotici', 'morfina', 'munizioni', 'grimaldello', 'candelotto', 'stetoscopio', 'stoffa_grigia', 'valuta', 'merce', 'ciclostile', 'bombola', 'batteria_auto']],
    ['molo', ['pesce', 'sarde', 'polpo', 'acciughe']],
    ['beduini', ['te_foglie', 'spezie', 'sale', 'lana', 'pelle', 'fichi_secchi', 'miele', 'acqua', 'tanica_acqua', 'tenda', 'coltello', 'bussola', 'binocolo', 'mappa', 'carne', 'formaggio']],
    ['villaggio', ['legna', 'castagne', 'funghi', 'miele', 'lana', 'formaggio', 'ricotta', 'pane_nero', 'noci', 'grappa', 'uova', 'carbonella', 'passamontagna', 'maglione']],
    ['masseria', ['uova', 'latte', 'formaggio', 'verdura', 'patate', 'legna', 'lana']],
    ['cantina', ['vino', 'grappa']],
  ];
  // la nave porta quello che l'isola non fa (e quello che fa ma non basta)
  const IMPORT = Object.values(CAT).filter(o => o.imp).map(o => o.id).concat(['farina', 'pasta', 'scatolame', 'carbone', 'stoffa', 'ferro', 'lamiera', 'medicine', 'vestiti']).filter((v, i, a) => a.indexOf(v) === i);

  // =====================================================================================================================
  // DA FRUGARE: cosa si trova in quale mobile, a seconda della stanza e dell'edificio. [oggetto, probabilità, quanti min, max]
  // =====================================================================================================================
  const LOOT = {
    kitchenCabinet: [['pasta', .6, 1, 2], ['scatolame', .5, 1, 3], ['legumi', .3, 1, 2], ['sale', .5, 1, 1], ['zucchero', .4, 1, 1], ['caffe', .4, 1, 1], ['fiammiferi', .6, 1, 2], ['candele', .4, 1, 1], ['pentola', .3, 1, 1], ['padella', .2, 1, 1], ['moka', .3, 1, 1], ['bottiglia_vuota', .5, 1, 4], ['barattolo', .4, 1, 3], ['olio', .3, 1, 1], ['farina', .2, 1, 1], ['passata', .3, 1, 2], ['riso', .2, 1, 1], ['conserva', .2, 1, 2]],
    kitchenCabinetDrawer: [['coltello', .5, 1, 1], ['forbici', .3, 1, 1], ['fiammiferi', .5, 1, 1], ['candele', .3, 1, 2], ['pile', .3, 1, 2], ['nastro', .2, 1, 1], ['ago_filo', .3, 1, 1], ['cacciavite', .15, 1, 1], ['stracci', .4, 1, 2]],
    kitchenFridge: [['latte', .5, 1, 2], ['uova', .5, 1, 1], ['formaggio', .4, 1, 1], ['salame', .3, 1, 1], ['verdura', .4, 1, 2], ['birra', .3, 1, 3], ['acqua', .5, 1, 2], ['carne', .2, 1, 1], ['pomodori', .3, 1, 1]],
    bookcaseClosedWide: [['vestiti', .5, 1, 2], ['coperta', .4, 1, 1], ['lenzuola', .4, 1, 1], ['maglione', .3, 1, 1], ['cappotto', .15, 1, 1], ['scarpe', .2, 1, 1], ['stoffa', .15, 1, 1], ['lana', .15, 1, 1], ['medicine', .15, 1, 1], ['carte', .2, 1, 1], ['radio_rotta', .08, 1, 1]],
    sideTable: [['sigarette', .4, 1, 1], ['accendino', .3, 1, 1], ['fiammiferi', .3, 1, 1], ['orologio', .12, 1, 1], ['gioielli', .06, 1, 1], ['pile', .2, 1, 2], ['candele', .2, 1, 1], ['medicine', .2, 1, 1], ['sveglia', .3, 1, 1], ['libretto', .02, 1, 2]],
    desk: [['carta', .4, 1, 1], ['penne', .6, 1, 2], ['quaderno', .4, 1, 2], ['buste', .3, 1, 2], ['inchiostro', .2, 1, 1], ['forbici', .2, 1, 1], ['nastro', .2, 1, 1], ['carta_bollata', .15, 1, 2], ['sigarette', .2, 1, 1], ['pile', .15, 1, 1]],
    bathroomSink: [['sapone', .6, 1, 2], ['dentifricio', .5, 1, 1], ['rasoio', .4, 1, 1], ['medicine', .3, 1, 1], ['cerotti', .3, 1, 1], ['disinfettante', .2, 1, 1], ['garze', .15, 1, 1], ['alcol', .15, 1, 1]],
    washer: [['detersivo', .5, 1, 1], ['candeggina', .3, 1, 1], ['stracci', .6, 1, 3], ['sapone', .3, 1, 1]],
    cardboardBoxClosed: [['stracci', .4, 1, 3], ['bottiglia_vuota', .4, 1, 4], ['corda', .2, 1, 1], ['sacchi', .3, 1, 2], ['lampadine', .2, 1, 2], ['chiodi', .2, 1, 1], ['viti', .15, 1, 1], ['vestiti', .2, 1, 1], ['radio_rotta', .1, 1, 1], ['sveglia', .1, 1, 1], ['cartone', .5, 1, 2], ['candele', .2, 1, 2], ['scatolame', .15, 1, 2], ['latta_vuota', .3, 1, 3], ['giornale', .3, 1, 2]],
    trashcan: [['bottiglia_vuota', .5, 1, 3], ['stracci', .4, 1, 2], ['giornale', .5, 1, 2], ['latta_vuota', .5, 1, 3], ['cartone', .5, 1, 2], ['barattolo', .3, 1, 2], ['rottami', .1, 1, 1]],
    bookcaseOpen: [['quaderno', .2, 1, 1], ['giornale', .3, 1, 2], ['candele', .2, 1, 1], ['carte', .1, 1, 1], ['cartone', .2, 1, 1]],
    pv_attrezzi: [['martello', .5, 1, 1], ['chiave_inglese', .6, 1, 1], ['cacciavite', .5, 1, 1], ['pinze', .4, 1, 1], ['bulloni', .5, 1, 2], ['nastro', .5, 1, 2], ['olio_motore', .3, 1, 1], ['cavo', .3, 1, 1], ['ricambi', .3, 1, 1]],
    st_cassetta: [['martello', .4, 1, 1], ['cacciavite', .5, 1, 1], ['pinze', .4, 1, 1], ['chiave_inglese', .35, 1, 1], ['seghetto', .25, 1, 1], ['lima', .3, 1, 1], ['tronchesi', .2, 1, 1], ['nastro', .5, 1, 2], ['viti', .5, 1, 2], ['bulloni', .4, 1, 2], ['chiodi', .5, 1, 2], ['filo_ferro', .4, 1, 1], ['cavo', .25, 1, 1], ['guanti', .3, 1, 1], ['saldatore', .1, 1, 1], ['stagno', .15, 1, 1]],
    st_cassaforte: [['$', .9, 40, 260], ['gioielli', .3, 1, 2], ['orologio', .3, 1, 2], ['valuta', .2, 1, 3], ['carta_bollata', .3, 1, 4], ['moduli', .2, 1, 2], ['fascicolo', .15, 1, 1]],
    st_rastrelliera: [['munizioni', .7, 1, 3], ['pistola', .3, 1, 1], ['lupara', .15, 1, 1], ['manette', .5, 1, 2], ['divisa', .4, 1, 1], ['stoffa_grigia', .3, 1, 2], ['torcia', .5, 1, 1], ['gallette', .4, 1, 3], ['kit_medico', .2, 1, 1], ['ricetrasmittente', .08, 1, 1]],
    'ar_cash-register': [['$', 1, 0, 0]], pv_banco_vendita: [['$shop', 1, 1, 3]],
    fd_barrel: [['vino', .6, 1, 3], ['olive', .3, 1, 2], ['sarde', .3, 1, 2]],
    'fx_box-large': [['latta', .4, 1, 2], ['scatolame', .5, 2, 6], ['olio', .3, 1, 2], ['rottami', .3, 1, 2]], 'fx_box-small': [['bulloni', .4, 1, 2], ['latta_vuota', .4, 1, 4], ['nastro', .3, 1, 1]],
  };
  // stanze speciali: lo stesso mobile in un archivio della Tutela o in un'armeria non ha quello che ha in casa
  const ROOM_LOOT = {
    archivio: { bookcaseClosedWide: [['fascicolo', .35, 1, 1], ['moduli', .5, 1, 3], ['carta_bollata', .4, 1, 3], ['carta', .4, 1, 1], ['timbro_falso', .03, 1, 1], ['giornale', .3, 1, 3]] },
    ufficio: { desk: [['moduli', .3, 1, 2], ['carta_bollata', .3, 1, 3], ['carta', .4, 1, 1], ['penne', .6, 1, 2], ['inchiostro', .3, 1, 1], ['buste', .4, 1, 3], ['fascicolo', .06, 1, 1], ['$', .3, 5, 30]] },
    armeria: { bookcaseClosedWide: [['munizioni', .6, 1, 2], ['divisa', .4, 1, 1], ['manette', .4, 1, 1], ['torcia', .4, 1, 1]], cardboardBoxClosed: [['gallette', .6, 1, 4], ['munizioni', .3, 1, 2], ['stoffa_grigia', .3, 1, 2], ['bende', .4, 1, 2]] },
    camerata: { bedSingle: [['sigarette', .4, 1, 1], ['divisa', .1, 1, 1], ['gallette', .3, 1, 2], ['carte', .2, 1, 1]] },
    visite: { desk: [['medicine', .5, 1, 2], ['siringhe', .4, 1, 2], ['garze', .5, 1, 2], ['antibiotici', .2, 1, 1], ['morfina', .05, 1, 1]] },
    farmacia: { bookcaseOpen: [['medicine', .6, 1, 3], ['bende', .5, 1, 2], ['cerotti', .5, 1, 2], ['disinfettante', .4, 1, 2], ['antibiotici', .25, 1, 1]] },
    magazzino: { bookcaseOpen: [['$shop', 1, 2, 5]], cardboardBoxClosed: [['$shop', .8, 1, 4]] },
    bottega: { bookcaseOpen: [['$shop', 1, 1, 3]], bookcaseOpenLow: [['$shop', 1, 1, 3]] },
    ferramenta: { bookcaseOpen: [['$shop', 1, 1, 3]], bookcaseOpenLow: [['$shop', 1, 1, 3]], 'fx_box-small': [['$shop', 1, 1, 3]] },
    tabacchi: { bookcaseOpen: [['$shop', 1, 1, 3]] }, panetteria: { kitchenBar: [['$shop', .8, 1, 3]] }, pescheria: { kitchenBar: [['$shop', .8, 1, 2]] },
    retro: { kitchenFridge: [['$shop', .8, 1, 3]] }, sala: { kitchenBar: [['$shop', .6, 1, 2]] }, cella_frigo: { kitchenFridge: [['$shop', 1, 2, 4]] },
    caveau: { bookcaseClosedWide: [['$bank', 1, 0, 0]] },
    deposito: { cardboardBoxClosed: [['rottami', .3, 1, 2], ['corda', .3, 1, 1], ['sacchi', .3, 1, 2], ['telo', .2, 1, 1], ['tubi', .15, 1, 1], ['assi', .2, 1, 1], ['casse', .3, 1, 2], ['bombola', .1, 1, 1], ['ricambi', .2, 1, 1]] },
    soppalco: { cardboardBoxClosed: [['elettrodomestico', .2, 1, 1], ['mobile_rotto', .2, 1, 1], ['tv_rotta', .1, 1, 1], ['radio_rotta', .2, 1, 1], ['stracci', .4, 1, 2]] },
    ripostiglio: { cardboardBoxClosed: [['radio_rotta', .15, 1, 1], ['tv_rotta', .06, 1, 1], ['elettrodomestico', .08, 1, 1], ['corda', .3, 1, 1], ['secchio', .3, 1, 1], ['legna', .3, 1, 2], ['carbone', .15, 1, 1], ['lampadine', .3, 1, 2], ['pala', .1, 1, 1], ['tanica_vuota', .2, 1, 1]] },
    tipografia: { cardboardBoxClosed: [['carta', .7, 1, 3], ['inchiostro', .5, 1, 2], ['cartoncino', .5, 1, 2], ['giornale', .6, 2, 6]] },
    sartoria: { table: [['stoffa', .6, 1, 2], ['bottoni', .6, 1, 2], ['ago_filo', .6, 1, 2], ['forbici', .4, 1, 1], ['lana', .4, 1, 2]] },
  };
  // i posti all'aperto dove si fruga per terra (discarica, ruderi, cantiere, molo): si ricaricano coi giorni
  const SPOT_LOOT = {
    discarica: [['rottami', .7, 1, 3], ['radio_rotta', .3, 1, 1], ['tv_rotta', .25, 1, 1], ['elettrodomestico', .3, 1, 1], ['mobile_rotto', .3, 1, 1], ['stracci', .5, 1, 3], ['bottiglia_vuota', .6, 2, 6], ['latta_vuota', .5, 2, 5], ['pneumatico', .3, 1, 1], ['cartone', .5, 1, 3], ['ricambi', .3, 1, 1], ['barattolo', .4, 1, 3], ['tubi', .15, 1, 1], ['vetro', .1, 1, 1]],
    ruderi: [['pietre', .6, 1, 2], ['rottami', .4, 1, 2], ['assi', .2, 1, 1], ['mobile_rotto', .2, 1, 1], ['bottiglia_vuota', .3, 1, 2], ['tubi', .1, 1, 1]],
    rudere_o: [['pietre', .6, 1, 2], ['rottami', .3, 1, 1], ['assi', .2, 1, 1], ['mobile_rotto', .15, 1, 1]],
    cantiere: [['assi', .4, 1, 1], ['chiodi', .5, 1, 2], ['rottami', .4, 1, 2], ['sacchi', .3, 1, 2], ['tondino', .3, 1, 1], ['filo_ferro', .3, 1, 1], ['cemento', .15, 1, 1], ['secchio', .2, 1, 1], ['telo', .2, 1, 1]],
    molo: [['corda', .5, 1, 1], ['rete_pesca', .1, 1, 1], ['casse', .3, 1, 1], ['sarde', .3, 1, 2], ['bottiglia_vuota', .3, 1, 2], ['telo', .15, 1, 1]],
    calata: [['casse', .4, 1, 2], ['corda', .3, 1, 1], ['sacchi', .4, 1, 2], ['merce', .05, 1, 1], ['bulloni', .2, 1, 1]],
    spiaggia: [['bottiglia_vuota', .4, 1, 2], ['corda', .2, 1, 1], ['assi', .15, 1, 1], ['stracci', .3, 1, 1]],
    stazione_n: [['rottami', .5, 1, 2], ['carbone', .4, 1, 2], ['tubi', .2, 1, 1], ['cavo', .15, 1, 1]], stazione_s: [['rottami', .5, 1, 2], ['carbone', .4, 1, 2], ['tubi', .2, 1, 1], ['bulloni', .2, 1, 1]],
    miniera: [['carbone', .6, 1, 2], ['rottami', .3, 1, 1], ['piccone', .05, 1, 1], ['catena', .1, 1, 1]],
    campeggio_o: [['bottiglia_vuota', .4, 1, 2], ['telo', .2, 1, 1], ['scatolame', .2, 1, 1], ['legna', .4, 1, 1]], campeggio_e: [['bottiglia_vuota', .4, 1, 2], ['telo', .2, 1, 1], ['scatolame', .2, 1, 1], ['legna', .4, 1, 1]],
    bivacco_o: [['legna', .6, 1, 2], ['fiammiferi', .3, 1, 1], ['scatolame', .2, 1, 1]], bivacco_e: [['legna', .6, 1, 2], ['fiammiferi', .3, 1, 1], ['scatolame', .2, 1, 1]],
  };


  // ---- dove si trovano gli oggetti aggiunti ----
  const MORE_SELL = {
    wu: ['ceci', 'acciughe', 'mortadella', 'pane_nero', 'farina_mais', 'orzo', 'aceto', 'burro', 'caffe_orzo', 'marmellata', 'mele', 'carta_igienica', 'succo'],
    'use:emporio': ['latte_polvere', 'arance', 'vodka', 'spezie', 'petrolio', 'lampada_petrolio', 'impermeabile', 'stivali', 'berretto', 'sciarpa', 'tuta', 'lampada', 'shampoo', 'carta_igienica', 'mappa', 'macchina_scrivere', 'nastro_mds', 'registratore', 'termometro', 'vitamine', 'bussola', 'pettine'],
    'use:panetteria': ['pane_nero'], 'use:macelleria': ['mortadella'], 'use:pescheria': ['baccala', 'acciughe'], 'use:fruttivendolo': ['castagne', 'funghi', 'mele', 'arance', 'noci', 'fichi_secchi'],
    'use:ferramenta': ['fascette', 'carta_vetrata', 'lubrificante', 'moschettoni', 'cavo_acciaio', 'tasselli', 'silicone', 'nastro_telato', 'molle', 'morsa', 'pialla', 'scalpello', 'metro', 'mazza', 'zappa', 'falce', 'cesoie', 'chiave_tubo', 'coltellino', 'calce', 'catrame', 'isolante', 'petrolio', 'lampada_petrolio', 'stivali', 'tuta'],
    'use:tabacchi': ['mappa', 'nastro_mds'], officina: ['chiave_tubo', 'lubrificante', 'pompa', 'nastro_telato'], video: ['cuffie', 'microfono', 'registratore', 'tester', 'dischi'],
    'use:farmacia': ['sciroppo', 'vitamine', 'iodio', 'laccio', 'termometro', 'sonniferi', 'shampoo'], 'use:fabbro': ['grata', 'molle'], 'use:sartoria': ['berretto', 'sciarpa', 'tuta', 'impermeabile'],
    piazza: ['castagne', 'funghi', 'mele', 'noci', 'fichi_secchi', 'ricotta', 'pallet'], masseria: ['ricotta', 'castagne', 'mele', 'noci', 'burro'], cantina: ['mirto'], bar: ['caffe_orzo', 'mirto'], sirena: ['vodka'], disco: ['vodka'],
    cantiere: ['calce', 'catrame', 'isolante', 'pallet', 'grata', 'mazza'],
    magazzino: ['marlboro', 'jeans', 'chewing_gum', 'cassette_proibite', 'rivista_proibita', 'calze_nylon', 'profumo', 'walkie', 'binocolo', 'maschera_gas', 'giubbotto', 'tirapugni', 'spray_peperoncino', 'fumogeno', 'petardi', 'razzo', 'giacca_pelle', 'tenda', 'sacco_pelo', 'razione_tutela', 'tessera_annonaria', 'sonniferi', 'mazza_baseball', 'plexiglas'],
  };
  SHOPLIST.forEach(row => { const m = MORE_SELL[row[0]]; if (m) m.forEach(g => { if (!row[1].includes(g)) row[1].push(g); }); });
  const MORE_LOOT = {
    kitchenCabinet: [['farina_mais', .2, 1, 1], ['ceci', .2, 1, 1], ['caffe_orzo', .3, 1, 1], ['aceto', .3, 1, 1], ['marmellata', .2, 1, 1], ['tessera_annonaria', .25, 1, 2], ['spezie', .15, 1, 1]],
    kitchenFridge: [['burro', .3, 1, 1], ['ricotta', .2, 1, 1], ['mortadella', .2, 1, 1], ['mele', .3, 1, 2]],
    bookcaseClosedWide: [['berretto', .3, 1, 1], ['sciarpa', .3, 1, 1], ['impermeabile', .15, 1, 1], ['tuta', .15, 1, 1], ['giacca_pelle', .03, 1, 1], ['jeans', .03, 1, 1], ['dischi', .1, 1, 2], ['posate_argento', .05, 1, 1], ['tessera_partito', .1, 1, 1]],
    sideTable: [['anello_oro', .04, 1, 1], ['francobolli', .05, 1, 1], ['profumo', .04, 1, 1], ['calze_nylon', .06, 1, 2], ['sonniferi', .08, 1, 1], ['rivista_proibita', .03, 1, 1], ['cassette_proibite', .04, 1, 2], ['lampada_petrolio', .1, 1, 1], ['termometro', .1, 1, 1]],
    desk: [['macchina_scrivere', .05, 1, 1], ['nastro_mds', .2, 1, 1], ['mappa', .15, 1, 1], ['tessera_annonaria', .1, 1, 3]],
    bathroomSink: [['shampoo', .4, 1, 1], ['carta_igienica', .4, 1, 2], ['pettine', .4, 1, 1], ['iodio', .2, 1, 1], ['sciroppo', .2, 1, 1]],
    cardboardBoxClosed: [['batterie_esauste', .15, 1, 2], ['lattine', .2, 1, 1], ['dischi', .05, 1, 1], ['registratore', .03, 1, 1], ['bici_rotta', .03, 1, 1], ['molle', .15, 1, 2], ['fascette', .2, 1, 2], ['mappa', .05, 1, 1]],
    st_cassetta: [['morsa', .05, 1, 1], ['scalpello', .2, 1, 1], ['metro', .3, 1, 1], ['tester', .1, 1, 1], ['chiave_tubo', .25, 1, 1], ['lubrificante', .3, 1, 1], ['carta_vetrata', .3, 1, 2], ['tasselli', .3, 1, 2]],
    pv_attrezzi: [['chiave_tubo', .4, 1, 1], ['pompa', .3, 1, 1], ['lubrificante', .4, 1, 1], ['nastro_telato', .3, 1, 1]],
    st_rastrelliera: [['razione_tutela', .6, 1, 3], ['elmetto', .4, 1, 1], ['maschera_gas', .25, 1, 1], ['fumogeno', .3, 1, 2], ['razzo', .3, 1, 2], ['giubbotto', .08, 1, 1], ['binocolo', .15, 1, 1], ['walkie', .1, 1, 1]],
    st_cassaforte: [['anello_oro', .3, 1, 2], ['francobolli', .2, 1, 1], ['tessera_annonaria', .4, 2, 8], ['piantina', .05, 1, 1]],
    trashcan: [['lattine', .3, 1, 1], ['batterie_esauste', .1, 1, 1]],
  };
  Object.entries(MORE_LOOT).forEach(([k, l]) => { LOOT[k] = (LOOT[k] || []).concat(l); });
  [['archivio', 'bookcaseClosedWide', [['tessera_annonaria', .3, 2, 6], ['piantina', .08, 1, 1], ['tessera_partito', .2, 1, 2]]], ['armeria', 'cardboardBoxClosed', [['razione_tutela', .6, 2, 5], ['elmetto', .3, 1, 1], ['maschera_gas', .2, 1, 1]]],
   ['soppalco', 'cardboardBoxClosed', [['frigo_rotto', .1, 1, 1], ['bici_rotta', .15, 1, 1], ['motore_el', .15, 1, 1], ['batterie_esauste', .2, 1, 2]]], ['ripostiglio', 'cardboardBoxClosed', [['bici_rotta', .08, 1, 1], ['pompa', .15, 1, 1], ['lampada_petrolio', .15, 1, 1], ['petrolio', .1, 1, 1]]]]
    .forEach(([room, f, l]) => { ROOM_LOOT[room] = ROOM_LOOT[room] || {}; ROOM_LOOT[room][f] = (ROOM_LOOT[room][f] || []).concat(l); });
  [['discarica', [['frigo_rotto', .3, 1, 1], ['bici_rotta', .25, 1, 1], ['motore_el', .2, 1, 1], ['batterie_esauste', .4, 1, 3], ['lattine', .5, 1, 2], ['pallet', .4, 1, 2], ['rame', .1, 1, 1], ['piombo', .1, 1, 1]]],
   ['cantiere', [['pallet', .5, 1, 2], ['calce', .1, 1, 1], ['tasselli', .2, 1, 1]]], ['calata', [['pallet', .5, 1, 2], ['marlboro', .03, 1, 1], ['jeans', .02, 1, 1]]], ['molo', [['acciughe', .2, 1, 1]]],
   ['ruderi', [['posate_argento', .03, 1, 1], ['quadro', .02, 1, 1]]], ['spiaggia', [['lattine', .4, 1, 1], ['pallet', .1, 1, 1]]]]
    .forEach(([p, l]) => { SPOT_LOOT[p] = (SPOT_LOOT[p] || []).concat(l); });

  // =====================================================================================================================
  // COSTRUIRE (Risacca): le strutture e i moduli si pagano in oggetti
  // =====================================================================================================================
  const BUILD = {
    struct: {
      baracca: { assi: 4, lamiera: 2, chiodi: 2, travi: 1 },
      capanno: { assi: 6, lamiera: 4, travi: 2, chiodi: 3, cerniere: 1, lucchetto: 1 },
      rifugio: { travi: 4, assi: 6, cemento: 3, sabbia: 4, sacco_sabbia: 6, botola: 1, chiodi: 2 },
      antenna: { antenna_kit: 1, cavo_coax: 1, tubi: 1, bulloni: 1 },
    },
    module: {
      deposito: { scaffale: 2, casse: 2 },
      dormitorio: { 'branda|materasso': 3, coperta: 3 },
      stamperia: { ciclostile: 1, tavolo: 1 },
      radio: { ricetrasmittente: 1, 'batteria_auto|pile': 1, cavo_coax: 1 },
      falsari: { ingranditore: 1, tavolo: 1, lampadine: 1 },
      officina: { banco: 1, martello: 1, cacciavite: 1, pinze: 1 },
      infermeria: { branda: 1, kit_medico: 1, tavolo: 1 },
      armeria: { scaffale: 1, catena: 1, lucchetto: 1, 'porta_rinforzata': 1 },
    },
    // quello che le altre azioni chiedevano in «materiali» astratti
    inchioda: { assi: 2, chiodi: 1 },
  };
  // le postazioni che un modulo mette in base (oltre a quelle degli oggetti posati lì)
  const MOD_ST = { stamperia: ['ciclostile'], falsari: ['camera_oscura', 'banco_lavoro'], officina: ['banco_lavoro', 'banco_falegname'], infermeria: ['tavolo_medico'], radio: ['banco_radio'] };

  // =====================================================================================================================
  // LO STATO
  // =====================================================================================================================
  function S(st) {
    if (st.ogg) return st.ogg;
    st.ogg = { cont: {}, spots: {}, wear: {}, hour: -1, primed: false, stats: { prodotto: 0, ricette: 0, consumi: 0, frugato: 0, rubato: 0, scoperto: 0, fatto: 0, rotti: 0 }, made: {}, log: [] };
    return st.ogg;
  }
  const inv = st => { const p = st.player; p.inv = p.inv || {}; return p.inv; };
  const cnt = (bag, id) => Math.floor((bag && bag[id]) || 0);
  function add(bag, id, q) { if (!(q > 0)) return; bag[id] = r1((bag[id] || 0) + q); }
  function sub(bag, id, q) { bag[id] = r1((bag[id] || 0) - q); if (bag[id] <= 0) delete bag[id]; }
  // quanto si porta addosso
  function weightOf(bag) { return Object.entries(bag || {}).reduce((s, [k, v]) => s + (CAT[k] ? CAT[k].peso * v : .5 * v), 0); }
  function capacity(st) { const b = inv(st); let c = 30; const Wn = S(st).worn || {}; if (cnt(b, 'zaino') || (Wn.schiena || []).includes('zaino')) c += CAT.zaino.bag; /* [guardaroba] anche lo zaino in spalla */ if (st.player.hand === 'carriola') c += 100; return c; }
  // le armi del motore: chi compra o trova una pistola la ha tra le armi, non in tasca
  function giveWeapon(st, id, q) {
    const p = st.player, w = CAT[id] && CAT[id].wpn; if (!w || !G.WEAPONS[w]) return false;
    if (w === 'molotov') { p.arms.molotov = p.arms.molotov || { mag: 0, res: 0 }; p.arms.molotov.mag = (p.arms.molotov.mag || 0) + q; return true; }
    if (p.arms[w]) { if (!G.WEAPONS[w].melee) p.arms[w].res = (p.arms[w].res || 0) + G.WEAPONS[w].mag * q; return true; }
    p.arms[w] = G.WEAPONS[w].melee ? {} : { mag: G.WEAPONS[w].mag, res: G.WEAPONS[w].mag * 2 }; return true;
  }
  function giveAmmo(st, q) { const p = st.player; const g = ['pistola', 'mitra', 'lupara'].find(w => p.arms[w]); if (!g) return false; p.arms[g].res = (p.arms[g].res || 0) + 15 * q; return true; }
  // al giocatore: in tasca (o tra le armi). Restituisce quanto non ci stava
  function givePlayer(st, id, q, force) {
    if (!(q > 0)) return 0;
    if (CAT[id] && CAT[id].wpn && G.WEAPONS[CAT[id].wpn]) { if (id === 'coltello') { add(inv(st), id, q); return 0; } giveWeapon(st, id, q); return 0; }
    if (id === 'munizioni' && giveAmmo(st, q)) return 0;
    const b = inv(st), w = CAT[id] ? CAT[id].peso : .5, room = capacity(st) - weightOf(b);
    let k = force ? q : Math.min(q, Math.max(0, Math.floor(room / Math.max(.01, w) + 1e-6)));
    add(b, id, k); return q - k;
  }

  // =====================================================================================================================
  // DOVE SONO (postazioni, contenitori, luoghi)
  // =====================================================================================================================
  const p_ = st => st.player;
  function nearPlace(st, r) { const p = p_(st); let best = null, bd = r || 14; Object.entries(PLACES).forEach(([id, P0]) => { const d = dist(P0.x, P0.y, p.x, p.y); if (d < bd) { bd = d; best = id; } }); return best; }
  function nearBase(st) { const R = st.ris; if (!R) return null; const p = p_(st); return R.bases.find(b => b.alive && dist(b.x, b.y, p.x, p.y) < 6) || null; }
  // i mobili vicini (dentro un edificio)
  function nearFurn(st, r) {
    const p = p_(st); if (!p.indoor) return [];
    const b = G.BUILDINGS[p.indoor.b], Lx = INT.layout(b), F = Lx.floors[p.indoor.f]; if (!F) return [];
    return F.furn.map((o, i) => ({ o, i, d: o.taken ? 1e9 : dist(o.x, o.y, p.x, p.y), room: (INT.roomAt ? (INT.roomAt(Lx, p.indoor.f, o.x, o.y) || {}).name : null) })).filter(x => x.d < (r || 2.4)).sort((a, c) => a.d - c.d);
  }
  // le postazioni a portata: mobili dell'interno, moduli e oggetti della base, la fontana, il fornello che hai nello zaino
  function stationsHere(st, src) {
    const out = new Set(), p = p_(st), from = src || {};
    const put = (s, w) => { if (!out.has(s)) { out.add(s); from[s] = w; } };
    Object.keys(inv(st)).forEach(k => { const c = CAT[k]; if (c && c.st && c.peso <= 4) put(c.st, 'tasca'); });
    const b = nearBase(st);
    if (b) { (b.modules || []).forEach(m => (MOD_ST[m] || []).forEach(s => put(s, 'base'))); Object.keys(b.stock || {}).forEach(k => { if (CAT[k] && CAT[k].st) put(CAT[k].st, 'base'); }); }
    if (!p.indoor) { const pl = nearPlace(st, 10); if (pl && /fontana|sorgente/.test(pl)) put('acqua', 'fuori'); if (nearTile(st, G.T.FOUNT, 3)) put('acqua', 'fuori'); }
    nearFurn(st, 2.6).forEach(x => { const s = FURN2ST[x.o.id]; if (s) put(s, 'mobile'); });
    if (p.indoor && isHomeB(st, p.indoor.b)) HOME_ST.forEach(s => put(s, 'casa'));
    const Lg = luogoHere(st); if (Lg) Lg.posts.forEach(q => put(q.st, 'luogo'));
    if (typeof Cantiere !== 'undefined' && Cantiere.stationsNear) Cantiere.stationsNear(st, 3.2).forEach(s => put(s, 'covo'));   // [cantiere] le postazioni piazzate nel covo
    return out;
  }
  function nearTile(st, t, r) { if (t === undefined) return false; const p = p_(st), tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS); for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (G.tileAt && G.tileAt(tx + i, ty + j) === t) return true; return false; }
  // =====================================================================================================================
  // I LUOGHI DI LAVORO E DI SCAMBIO: ogni bottega, laboratorio, campo e bancarella ha un bancone e delle postazioni,
  // e ognuno che ci lavora ha il suo posto fisico (al bancone o a una postazione).
  // Le postazioni sono del posto (la forgia è del fabbro), non dei mobili: gli interni li disegna un altro modulo, qui si leggono
  // solo per mettere le persone accanto al mobile giusto quando c'è. Fuori i lavoratori stanno davvero al loro posto.
  // =====================================================================================================================
  const LUOGO_ST = {
    fabbro: ['forgia', 'saldatrice', 'banco_lavoro'], falegnameria: ['banco_falegname', 'banco_falegname', 'banco_lavoro'], panetteria: ['forno', 'forno'], macelleria: ['banco_macellaio'],
    armeria: ['banco_lavoro'], autorimessa: ['saldatrice', 'banco_lavoro'], pub: ['cucina'],   // [attività]
    sartoria: ['macchina_cucire', 'macchina_cucire'], tipografia: ['ciclostile'], farmacia: ['tavolo_medico'], ferramenta: ['banco_lavoro'], fabbrica: ['linea', 'linea', 'linea'],
    video: ['banco_radio'], officina: ['banco_lavoro', 'saldatrice'], cantiere: ['saldatrice', 'banco_falegname', 'banco_lavoro'], cantina: ['botti', 'botti'], ambulatorio: ['tavolo_medico'],
    osteria: ['cucina', 'cucina'], osteria_sg: ['cucina'], car_2: ['cucina'], miramare: ['cucina', 'cucina'], bar: ['cucina'], sirena: ['cucina'], masseria: ['cucina', 'acqua'], lavanderia: ['acqua'],
    carbonaia: ['carbonaia'], gelateria: ['cucina'], chiosco: [],
  };
  STATIONS.carbonaia = { id: 'carbonaia', nome: 'carbonaia', model: '' };
  const HOME_ST = ['cucina', 'acqua'];   // in casa: si cucina e c'è l'acqua (anche se il mobile non si vede)
  // chi lavora al bancone (vende, serve, incassa) e chi alle postazioni (produce)
  const BANCO_RE = /armaiol|venditore di auto|istruttore di tiro|commess|cassier|barist|barman|camerier|tabaccai|farmacist|fruttivendol|pescivendol|^oste|bottegai|^ferramenta|benzinai|lavandai|barbier|gestore|affittacamere|portiere|impiegata della biblioteca|direttore/;
  const BANCO_F = ['pv_banco_vendita', 'ar_cash-register', 'kitchenBar'];
  const keyOf = t => I.tkey(t);
  function luogoBase(t) { if (!t) return null; if (t.k === 'b') { const b = G.BUILDINGS[t.bi]; return (b && (b.id && LUOGO_ST[b.id] ? b.id : b.use)) || null; } return t.pid || null; }
  // un punto dove stare in piedi accanto a un mobile (o, senza mobile, lungo i muri della stanza d'ingresso)
  function standBy(L, f, o) {
    const ry = o.ry || 0, cands = [[Math.sin(ry), Math.cos(ry)], [-Math.sin(ry), -Math.cos(ry)], [Math.cos(ry), -Math.sin(ry)], [-Math.cos(ry), Math.sin(ry)]];
    for (const [dx, dy] of cands) { const x = o.x + dx * .85, y = o.y + dy * .85; if (INT.walk(L, f, x, y, .25)) return { x, y, face: Math.atan2(o.y - y, o.x - x) }; }
    return { x: o.x, y: o.y, face: 0 };
  }
  function roomSpots(L, n) {
    const F = L.floors[0], R0 = (INT.roomAt && INT.roomAt(L, 0, L.ent.in[0], L.ent.in[1])) || F.rooms[0], out = [];
    if (!R0) return out; const cx = R0.x + R0.w / 2, cy = R0.y + R0.h / 2;
    for (let i = 0; out.length < n && i < 40; i++) { const a = i * 2.39, d = Math.min(R0.w, R0.h) * (.15 + (i % 4) * .08), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (INT.walk(L, 0, x, y, .25)) out.push({ x, y, face: Math.atan2(cy - y, cx - x) }); }
    while (out.length < n) out.push({ x: cx, y: cy, face: 0 });
    return out;
  }
  function outdoorSpots(P0, n) { const out = []; for (let i = 0; out.length < n && i < 60; i++) { const a = i * 2.39, d = 2 + (i % 5) * 1.6, x = P0.x + Math.cos(a) * d, y = P0.y + Math.sin(a) * d; if (G.walkM(x, y)) out.push({ x, y, face: Math.atan2(P0.y - y, P0.x - x) }); } while (out.length < n) out.push({ x: P0.x, y: P0.y, face: 0 }); return out; }
  function makeLuogo(st, t) {
    const k = keyOf(t), E = Ec.eco(st), Sh = E.shops[k], base = luogoBase(t), sts = (LUOGO_ST[base] || []).slice();
    const Lg = { k, t, label: t.label, base, indoor: t.k === 'b', bi: t.k === 'b' ? t.bi : null, pid: t.pid || null, shop: !!Sh, market: !!(Sh && Sh.market), black: !!(Sh && Sh.black), banco: null, posts: [], staff: [] };
    if (Lg.indoor) {
      const b = G.BUILDINGS[t.bi], L = INT.layout(b), F = L.floors[0], used = new Set();
      const furn = id => { const i = F.furn.findIndex((o, j) => !used.has(j) && (Array.isArray(id) ? id.includes(o.id) : FURN2ST[o.id] === id)); if (i < 0) return null; used.add(i); return standBy(L, 0, F.furn[i]); };
      const spare = roomSpots(L, sts.length + 2);
      const sb = (F.spots || []).find(q => q.k === 'banco');   // [attività] dietro il banco, se il gruppo ha il posto del commesso
      if (Sh) Lg.banco = Object.assign({ who: [] }, sb ? { x: sb.x, y: sb.y, face: sb.face } : (furn(BANCO_F) || spare.pop()));
      sts.forEach(s => Lg.posts.push(Object.assign({ st: s, who: null }, furn(s) || spare.pop())));
    } else {
      const P0 = PLACES[t.pid] || t, spots = outdoorSpots(P0, sts.length + 3);
      if (Sh) Lg.banco = Object.assign({ who: [] }, spots.shift());
      sts.forEach(s => Lg.posts.push(Object.assign({ st: s, who: null }, spots.shift())));
      Lg.free = spots;   // all'aperto chi non ha una postazione (il pescatore, il bracciante) ha comunque un suo punto
    }
    return Lg;
  }
  function luoghi(st) {
    const M = S(st); if (M.luoghi) return M.luoghi; const out = M.luoghi = {};
    const E = Ec.eco(st); Object.values(E.shops).forEach(Sh => { if (Sh.t) out[Sh.k] = makeLuogo(st, Sh.t); });
    st.npcs.forEach(n => { const P = n.pop; if (P && P.job && P.job.t) { const k = keyOf(P.job.t); if (!out[k]) out[k] = makeLuogo(st, P.job.t); } });
    // chi ci lavora: al bancone chi vende, alle postazioni chi produce
    st.npcs.forEach(n => assignPost(st, n));
    return out;
  }
  function assignPost(st, n) {
    const P = n.pop; if (!P || !P.job || !P.job.t || P.post) return; const Lg = S(st).luoghi[keyOf(P.job.t)]; if (!Lg) return;
    const title = P.job.base || P.job.title || '', jp = JOBPROD.find(([re]) => re.test(title));
    const free = Lg.posts.find(q => !q.who && (!jp || jp[1].some(r => RECIPES[r] && (!RECIPES[r].st || alts(RECIPES[r].st).includes(q.st)))));
    if (Lg.banco && (BANCO_RE.test(title) || (!free && !jp))) { Lg.banco.who.push(n.id); P.post = { k: Lg.k, i: -1 }; }
    else if (free) { free.who = n.id; P.post = { k: Lg.k, i: Lg.posts.indexOf(free) }; }
    else if (Lg.free && Lg.free.length) { const s = Lg.free[Lg.staff.length % Lg.free.length]; P.post = { k: Lg.k, i: -2, x: s.x, y: s.y, face: s.face }; }
    else { P.post = { k: Lg.k, i: -3 }; }
    Lg.staff.push(n.id);
  }
  const postPos = (Lg, post) => post.i === -1 ? Lg.banco : post.i >= 0 ? Lg.posts[post.i] : post.i === -2 ? post : null;
  const onShift = (st, n) => !!(n && !n.dead && n.pop && n.pop.cur && n.pop.cur.act === 'lavoro' && !(n.jailedUntil > st.t) && !(n.stun > 0));
  // chi c'è adesso in quel posto (di turno)
  function staffNow(st, Lg) { return Lg.staff.map(id => G.byId(st, id)).filter(n => onShift(st, n) && n.pop.cur.tgt && keyOf(n.pop.cur.tgt) === Lg.k && (n.inside || dist(n.x, n.y, n.pop.cur.tgt.x, n.pop.cur.tgt.y) < 25)); }
  // chi sta al bancone adesso: un lavoratore al banco, o il bottegaio storico del posto (i personaggi con la bottega)
  function clerk(st, Lg) {
    const now = staffNow(st, Lg), atB = now.find(n => n.pop.post && n.pop.post.i === -1) || now[0]; if (atB) return atB;
    const pid = Lg.pid || (Lg.bi !== null && G.BUILDINGS[Lg.bi] ? G.BUILDINGS[Lg.bi].id : null);
    return st.npcs.find(n => n.shop && n.shop === pid && !n.dead && !(n.jailedUntil > st.t) && PLACES[pid] && dist(n.x, n.y, PLACES[pid].x, PLACES[pid].y) < 8) || null;
  }
  // aperto: c'è qualcuno al banco. Senza personale assegnato (bancarelle, mercato) vale l'orario
  function isOpen(st, Lg) {
    if (!Lg) return true; const h = G.hour(st);
    if (Lg.market) return [2, 5].includes(Po.weekday(st.t)) && h >= 6 && h < 13;
    if (clerk(st, Lg)) return true;
    return !Lg.staff.length && !(Lg.banco && Lg.banco.who.length) && !st.npcs.some(n => n.shop && Lg.pid && n.shop === Lg.pid) && h >= 7 && h < 21;
  }
  // il luogo dove sei: l'edificio in cui sei entrato, o la postazione all'aperto più vicina
  function luogoHere(st) {
    const p = p_(st), LL = luoghi(st);
    if (p.indoor) return Object.values(LL).find(Lg => Lg.bi === p.indoor.b) || null;
    let best = null, bd = 6; Object.values(LL).forEach(Lg => { if (Lg.indoor) return; [Lg.banco].concat(Lg.posts).filter(Boolean).forEach(q => { const d = dist(q.x, q.y, p.x, p.y); if (d < bd) { bd = d; best = Lg; } }); });
    return best;
  }
  const isHomeB = (st, bi) => { const b = G.BUILDINGS[bi]; return !!(b && (!shopB(b) || b.playerHome) && !/^(chiesa|caserma|deposito)$/.test(b.use || '')); };
  const myWork = (st, Lg) => !!(st.me && st.me.job && Lg && ((st.me.job.bi >= 0 && Lg.bi === st.me.job.bi) || (Lg.pid && st.me.job.place === Lg.pid)));
  // all'aperto chi lavora sta al suo posto invece di gironzolare
  function postsStep(st) {
    const LL = S(st).luoghi; if (!LL) return;
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || !P.post || P.post.i < -2 || n.inside || !onShift(st, n) || n.aggro || n.faction) return;
      const Lg = LL[P.post.k]; if (!Lg || Lg.indoor || !P.cur.tgt || keyOf(P.cur.tgt) !== Lg.k) return; const q = postPos(Lg, P.post); if (!q) return;
      if (P.at && keyOf(P.at) !== Lg.k && dist(n.x, n.y, q.x, q.y) > 30) return;   // ancora per strada: ci pensa la vita normale
      const d = dist(n.x, n.y, q.x, q.y);
      if (d > .7) { if (n._postGo !== st.t >> 0 && (!n.path || !n.path.length || d > 3)) { G.goTo(n, q.x, q.y); n._postGo = st.t >> 0; } n.wait = 0; }
      else { n.path = []; n.wait = Math.max(n.wait || 0, 4); n.face = q.face; n.speedNow = 0; n.action = { name: 'al lavoro', scores: [], why: `Al suo posto: ${Lg.label}.`, since: n.action ? n.action.since : st.clock }; }
    });
  }
  // per chi disegna gli interni: chi è al suo posto in quell'edificio adesso, e dove (coordinate dell'interno, piano terra)
  function staffIndoor(st, bi) {
    const Lg = Object.values(luoghi(st)).find(x => x.bi === bi); if (!Lg) return [];
    return staffNow(st, Lg).map(n => { const q = postPos(Lg, n.pop.post) || Lg.banco || Lg.posts[0]; return q ? { id: n.id, name: n.name, x: q.x, y: q.y, f: 0, face: q.face, post: n.pop.post.i === -1 ? 'banco' : (Lg.posts[n.pop.post.i] || {}).st || 'in giro' } : null; }).filter(Boolean);
  }
  // tutto quello che il giocatore può usare qui: le tasche, e se è in base anche le scorte della base
  function pools(st) { const L0 = [inv(st)]; const b = nearBase(st); if (b) L0.push(b.stock); if (typeof Cantiere !== 'undefined' && Cantiere.bauleHere) { const B0 = Cantiere.bauleHere(st); if (B0 && !L0.includes(B0)) L0.push(B0); } return L0; }   // [cantiere] anche il baule del covo
  const poolCnt = (P, id) => P.reduce((s, b) => s + cnt(b, id), 0);
  function poolTake(P, id, q) { for (const b of P) { const k = Math.min(q, cnt(b, id)); if (k > 0) { sub(b, id, k); q -= k; } if (!q) break; } return q; }
  // basta quello che c'è? per ogni ingrediente sceglie l'alternativa che c'è
  function plan(P, rec, times) {
    const use = {}, miss = [];
    for (const [key, q0] of Object.entries(rec.in)) {
      const q = q0 * (times || 1), opts = alts(key), have = opts.find(id => poolCnt(P, id) - (use[id] || 0) >= q);
      if (have) use[have] = (use[have] || 0) + q; else miss.push(opts.map(nm).join(' o ') + (q > 1 ? ` ×${q}` : ''));
    }
    const tools = [];
    for (const key of rec.tools) { const opts = alts(key), have = opts.find(id => poolCnt(P, id) > 0 || (id === 'coltello' && st0 && st0.player.arms && st0.player.arms.coltello)); if (have) tools.push(have); else miss.push(`attrezzo: ${opts.map(nm).join(' o ')}`); }
    return { use, tools, miss };
  }
  let st0 = null;   // lo stato corrente per i controlli sugli attrezzi (arma bianca impugnata)
  function placeOk(st, rec) { if (!rec.place) return true; const pl = nearPlace(st, 16); return !!(pl && (rec.place.test(pl) || rec.place.test(norm(PLACES[pl].name)))); }
  function stOk(stations, rec) { if (!rec.st) return true; return alts(rec.st).some(s => stations.has(s)); }

  // =====================================================================================================================
  // FABBRICARE (il giocatore)
  // =====================================================================================================================
  function recipesView(st) {
    st0 = st; const stations = stationsHere(st), P = pools(st), out = [];
    Object.values(RECIPES).forEach(rec => {
      const here = stOk(stations, rec) && placeOk(st, rec);
      if (rec.place && !here) return;                       // le estrazioni si vedono solo dove si fanno
      const pl = plan(P, rec);
      out.push({ id: rec.id, nome: rec.nome, kind: rec.kind, min: rec.min, st: rec.st ? alts(rec.st).map(s => STATIONS[s] ? STATIONS[s].nome : s).join(' o ') : 'ovunque', here, ok: here && !pl.miss.length, miss: pl.miss,
        in: Object.entries(rec.in).map(([k, q]) => ({ k, nome: alts(k).map(nm).join(' o '), q, have: Math.max(...alts(k).map(id => poolCnt(P, id))) })),
        tools: rec.tools.map(k => ({ k, nome: alts(k).map(nm).join(' o '), have: alts(k).some(id => poolCnt(P, id) > 0) })),
        out: Object.entries(rec.out).map(([k, q]) => ({ k, nome: nm(k), q })) });
    });
    return { stations: [...stations].map(s => STATIONS[s] ? STATIONS[s].nome : s), base: nearBase(st) ? nearBase(st).name : null, list: out.sort((a, b) => (b.ok - a.ok) || (b.here - a.here) || a.nome.localeCompare(b.nome)) };
  }
  function wearTools(st, P, tools, mins) {
    const W = S(st).wear, broke = [];
    tools.forEach(id => {
      const c = CAT[id]; if (!c || !c.tool) return;
      if (W[id] === undefined || W[id] <= 0) W[id] = c.tool;
      W[id] -= Math.max(1, mins / 30);
      if (W[id] <= 0) { poolTake(P, id, 1); W[id] = c.tool; broke.push(c.nome); S(st).stats.rotti++; }
    });
    return broke;
  }
  function craft(st, id, times) {
    st0 = st; const rec = RECIPES[id]; if (!rec) return R_(false, 'Non sai come si fa.');
    const src = {}, stations = stationsHere(st, src);
    if (!stOk(stations, rec)) return R_(false, `Serve: ${alts(rec.st).map(s => STATIONS[s].nome).join(' o ')}.`);
    if (!placeOk(st, rec)) return R_(false, 'Non qui.');
    times = Math.max(1, Math.min(10, Math.floor(times || 1)));
    const P = pools(st); let pl = plan(P, rec, times);
    while (pl.miss.length && times > 1) { times--; pl = plan(P, rec, times); }
    if (pl.miss.length) return R_(false, `Manca: ${pl.miss.join(', ')}.`);
    // la postazione di un altro: se c'è qualcuno si paga l'uso, se non c'è nessuno si lavora di nascosto
    let note0 = '';
    const usedSt = rec.st ? alts(rec.st).find(s => stations.has(s)) : null, Lg = usedSt && src[usedSt] === 'luogo' ? luogoHere(st) : null;
    if (Lg && !myWork(st, Lg)) {
      const who = clerk(st, Lg) || staffNow(st, Lg)[0];
      if (who) { const fee = r1(1 + rec.min * times / 60 * 2); if (st.player.money < fee) return R_(false, `${who.first}: «La ${STATIONS[usedSt].nome} costa ${L(fee)}. Torna quando ce li hai.»`); st.player.money -= fee; const Sh = Ec.eco(st).shops[Lg.k]; if (Sh) tillMove(st, Sh, fee); note0 = ` ${who.first} ti fa usare la ${STATIONS[usedSt].nome} per ${L(fee)}.`; }
      else if (Lg.indoor) { const c = caught(st, Lg.bi, .25, 'usando la ' + STATIONS[usedSt].nome); note0 = c ? ` ${c.first} ti ha scoperto a lavorare di nascosto!` : ' Di nascosto, a bottega chiusa.'; }
    }
    Object.entries(pl.use).forEach(([k, q]) => { poolTake(P, k, q); const e = CAT[k] && CAT[k].empty; if (e && rec.kind !== 'smonta' && !/^acqua$|tanica_acqua/.test(id)) add(P[0], e, 0); });
    const mins = rec.min * times, broke = wearTools(st, P, pl.tools, mins);
    const got = []; let left = 0;
    const B0 = nearBase(st), over = weightOf(inv(st)) > capacity(st);
    Object.entries(rec.out).forEach(([k, q]) => { const n = q * times; if (B0 && over) add(B0.stock, k, n); else left += givePlayer(st, k, n, true) * 0; got.push(`${nm(k)}${n > 1 ? ' ×' + n : ''}`); });
    left = weightOf(inv(st)) > capacity(st) ? 1 : 0;
    passTime(st, mins);
    const M = S(st); M.stats.fatto += times; M.made[id] = (M.made[id] || 0) + times;
    if (CAT[Object.keys(rec.out)[0]] && CAT[Object.keys(rec.out)[0]].ill) suspicious(st, rec.st && /ciclostile|alambicco/.test(rec.st) ? .35 : .15, rec.nome);
    return R_(true, `${cap(rec.nome)}: ${got.join(', ')}.${note0} ${mins >= 60 ? `${Math.round(mins / 6) / 10} ore di lavoro.` : `${mins} minuti.`}${broke.length ? ` Si è rotto: ${broke.join(', ')}.` : ''}${left > 0 ? ' Sei carico come un mulo: cammini piano finché non posi qualcosa.' : ''}`);
  }
  // il tempo passa davvero (come quando si dorme o si lavora): il mondo va avanti
  function passTime(st, mins) {
    if (!(mins > 0)) return;
    if (typeof window === 'undefined' || !G.step) { st.t += mins; return; }
    const end = st.t + mins; let guard = 0; while (st.t < end && guard++ < 4000) G.step(st, 1 / 30, {});
  }
  // chi sente il ciclostile o sente odore di grappa: un vicino può fare una soffiata
  function suspicious(st, k, what) {
    if (rnd() > k) return; const p = p_(st);
    const ear = st.npcs.find(n => !n.dead && n.pop && dist(n.x, n.y, p.x, p.y) < 18 && n.ris && n.ris.ideo < .3);
    if (!ear) return; I.note(st, ear, `ha sentito strani rumori vicino a ${G.nearestPlace(p.x, p.y).name}: ${what}`, 'shady', { w: .5, who: 'player' });
    if (st.ris) st.ris.repr = clamp(st.ris.repr + 1, 0, 100);
  }

  // =====================================================================================================================
  // USARE: mangiare, bere, medicarsi, vestirsi
  // =====================================================================================================================
  function consume(st, id) {
    const c = CAT[id], b = inv(st); if (!c || !c.eat) return R_(false, 'Non si usa così.'); if (!cnt(b, id)) return R_(false, 'Non ce l\'hai.');
    const me = st.me, N = me && me.need, E = c.eat, p = p_(st), msg = [];
    if (c.uses) { const W = S(st).wear, key = 'u:' + id; if (W[key] === undefined) W[key] = c.uses; W[key]--; if (W[key] <= 0) { sub(b, id, 1); delete W[key]; if (c.empty) add(b, c.empty, 1); } }
    else { sub(b, id, 1); if (c.empty) add(b, c.empty, 1); }
    if (N) {
      if (E.fame) N.fame = clamp(N.fame - E.fame, 0, 1); if (E.igiene) N.igiene = clamp(N.igiene + E.igiene, 0, 1); if (E.sonno) N.sonno = clamp(N.sonno + E.sonno, 0, 1);
      if (E.sete) { N.sete = clamp((N.sete || 0) + E.sete, 0, 1); }
      if (E.alcol) { me.drunk = clamp((me.drunk || 0) + E.alcol * .6, 0, 1); me.alcol = (me.alcol || 0) + E.alcol; }
    }
    if (E.calore) S(st).calore = clamp((S(st).calore || 0) + E.calore, 0, 1);
    if (E.hp) p.hp = Math.min(100, p.hp + E.hp);
    S(st).stats.consumi++;
    const verb = c.cat === 'bevande' ? 'Bevi' : c.cat === 'medicina' ? 'Ti medichi con' : c.cat === 'igiene' ? 'Usi' : 'Mangi';
    if (E.hp) msg.push(`+${E.hp} salute`); if (E.fame) msg.push('fame giù'); if (E.sete) msg.push('sete giù'); if (E.calore) msg.push('ti scaldi');
    return R_(true, `${verb} ${c.nome}${msg.length ? ' (' + msg.join(', ') + ')' : ''}.`);
  }
  // la sete: cresce come la fame, d'inverno un po' meno
  function thirstTick(st, h) { const N = st.me && st.me.need; if (!N) return; N.sete = clamp((N.sete || .2) + .045 * h, 0, 1); if (N.sete >= 1) st.player.hp = Math.max(1, st.player.hp - 2 * h); }

  // =====================================================================================================================
  // FRUGARE
  // =====================================================================================================================
  // il bottino ha un valore: comune, buono, raro, prezioso (la roba che scotta vale un gradino di più)
  const TIERS = ['comune', 'buono', 'raro', 'prezioso'];
  function tier(id) { const c = CAT[id]; if (!c) return 'comune'; let t = c.prezzo < 3 ? 0 : c.prezzo < 10 ? 1 : c.prezzo < 25 ? 2 : 3; if (c.ill) t = Math.min(3, t + 1); return TIERS[t]; }
  const LOCKED = { st_cassaforte: 'stetoscopio|trapano|candelotto', st_rastrelliera: 'grimaldello|piede', 'ar_cash-register': 'grimaldello|piede' };
  // i mobili più comuni nelle case (quelli che ci sono adesso negli interni): anche lì si trova qualcosa
  Object.assign(LOOT, {
    loungeSofa: [['$mat', .5, .02, .06], ['accendino', .15, 1, 1], ['sigarette', .1, 1, 1], ['carte', .1, 1, 1], ['penne', .1, 1, 1]],
    tableCoffee: [['giornale', .5, 1, 2], ['sigarette', .3, 1, 1], ['accendino', .2, 1, 1], ['carte', .2, 1, 1], ['rivista_proibita', .03, 1, 1], ['libretto', .02, 1, 1], ['caffe_tazza', .1, 1, 1]],
    cabinetTelevision: [['cassetta', .3, 1, 3], ['pile', .3, 1, 2], ['dischi', .1, 1, 2], ['cassette_proibite', .03, 1, 1], ['radio_rotta', .05, 1, 1], ['lampadine', .2, 1, 1], ['candele', .2, 1, 2]],
    coatRackStanding: [['cappotto', .25, 1, 1], ['sciarpa', .3, 1, 1], ['berretto', .3, 1, 1], ['impermeabile', .15, 1, 1], ['guanti_lana', .25, 1, 1], ['$mat', .2, .02, .05]],
    pottedPlant: [['$mat', .06, .2, .4], ['grimaldello', .01, 1, 1]],
    bookcaseOpenLow: [['quaderno', .2, 1, 1], ['giornale', .3, 1, 2], ['candele', .2, 1, 1], ['mappa', .05, 1, 1]],
    lampRoundFloor: null,
  });
  delete LOOT.lampRoundFloor;
  function lootTable(b, room, fid) {
    if (INT.LOOTX && INT.LOOTX[fid]) return INT.LOOTX[fid]; if (INT.LOOTAS && INT.LOOTAS[fid]) fid = INT.LOOTAS[fid];   // [interni] i mobili nuovi si frugano come quelli che somigliano
    const R0 = ROOM_LOOT[room]; if (R0 && R0[fid]) return R0[fid];
    if (/^bed/.test(fid)) return [['$mat', .7, .5, .8], ['coperta', .3, 1, 1], ['lenzuola', .3, 1, 1], ['libretto', .02, 1, 1], ['sacco_pelo', .03, 1, 1]];
    if (fid === 'pv_banco_vendita' || fid === 'kitchenBar') return shopB(b) ? [['$shop', 1, 1, 3]] : null;
    return LOOT[fid] || null;
  }
  const shopB = b => !!(b && (b.shop || b.trade || (b.use && !/^(casa|cascina|baracca|null)$/.test(b.use))));
  function roll(table, rich) {
    const out = {};
    table.forEach(([id, pr, a, b]) => { if (id[0] === '$') { if (rnd() < pr) out[id] = id === '$' ? Math.round(a + rnd() * (b - a)) : id === '$mat' ? r1(a + rnd() * (b - a)) || .5 : (a || 1); return; } if (rnd() < pr * rich) out[id] = (out[id] || 0) + a + Math.floor(rnd() * (b - a + 1)); });
    return out;
  }
  function richness(b) { const W = typeof World !== 'undefined' ? World : null; const d = W && W.districtAt ? W.districtAt((b.x + b.w / 2) * TS) : ''; return /centro/.test(d) ? 1.25 : /perif/.test(d) ? .85 : 1; }
  function shopOfB(st, bi) { const E = Ec.eco(st); return Object.values(E.shops).find(Sh => Sh.t && Sh.t.k === 'b' && Sh.t.bi === bi) || null; }
  // un mobile dentro un edificio (gli interni li fa un altro modulo: qui si leggono e basta)
  function container(st, x) {
    const M = S(st), p = p_(st), bi = p.indoor.b, b = G.BUILDINGS[bi], key = `b${bi}:${p.indoor.f}:${x.i}`;
    let C = M.cont[key];
    const table = lootTable(b, x.room, x.o.id); if (!table) return null;
    if (!C || (st.t - C.at > 3 * 1440)) {
      const old = C; C = M.cont[key] = { key, kind: 'furn', at: st.t, items: roll(table, richness(b)), locked: !!LOCKED[x.o.id] && !(old && old.forced), forced: old ? old.forced : false, fid: x.o.id, room: x.room, bi };
      if (old && old.items) Object.entries(old.items).forEach(([k, v]) => { if (k[0] !== '$') C.items[k] = Math.min(6, (C.items[k] || 0) + v); });
    }
    C.label = furnName(x.o.id, x.room);
    if (x.o.id === 'st_cassaforte' && typeof Cassaforti !== 'undefined') Cassaforti.fill(st, C);   // [cassaforti]
    return C;
  }
  const FNAME = { kitchenCabinet: 'credenza', kitchenCabinetDrawer: 'cassetti della cucina', kitchenFridge: 'frigorifero', bookcaseClosedWide: 'armadio', sideTable: 'comodino', desk: 'scrivania', bathroomSink: 'mobiletto del bagno', washer: 'lavatrice',
    cardboardBoxClosed: 'scatoloni', trashcan: 'secchio della spazzatura', bookcaseOpen: 'scaffale', bookcaseOpenLow: 'scaffale basso', st_cassetta: 'cassetta degli attrezzi', pv_attrezzi: 'parete degli attrezzi', pv_banco_vendita: 'banco di vendita', pv_banco_lavoro: 'banco da lavoro', pv_pneumatici: 'pila di pneumatici', st_cassaforte: 'cassaforte', st_rastrelliera: 'rastrelliera', 'ar_cash-register': 'registratore di cassa',
    fd_barrel: 'botte', 'fx_box-large': 'casse', 'fx_box-small': 'cassette', bedDouble: 'letto', bedSingle: 'branda', kitchenBar: 'bancone', table: 'tavolo', loungeSofa: 'divano', tableCoffee: 'tavolino', cabinetTelevision: 'mobile della tv', coatRackStanding: 'attaccapanni', pottedPlant: 'vaso della pianta' };
  const furnName = (id, room) => `${FNAME[id] || (INT.FNAME && INT.FNAME[id]) || id}${room ? ` (${INT.roomLabel ? INT.roomLabel(room) : room.replace(/_r$/, '').replace(/_/g, ' ')})` : ''}`;   // [interni]
  // cosa contiene davvero (le voci speciali diventano roba vera: le scorte della bottega, i soldi della cassa, del materasso, delle tasche)
  function contView(st, C) {
    const out = [], push = o => out.push(Object.assign(o, { tier: o.id === '$' ? (o.q >= 50 ? 'prezioso' : o.q >= 15 ? 'raro' : 'buono') : tier(o.id) }));
    if (C.kind === 'corpo') {
      const n = G.byId(st, C.npc); if (!n || !n.pop) return out;
      const m = Math.floor(n.pop.money || 0); if (m > 0) push({ id: '$', nome: `portafoglio (${L(m)})`, q: m, src: 'tasche' });
      if (n.weapon && !n.pop._armaPresa && CAT[n.weapon] && !(n.pop.inv && n.pop.inv[n.weapon] >= 1)) push({ id: n.weapon, nome: nm(n.weapon), q: 1, src: 'arma', peso: CAT[n.weapon].peso });
      Object.entries(n.pop.inv || {}).forEach(([k, v]) => { if (v >= 1 && CAT[k]) push({ id: k, nome: nm(k), q: Math.floor(v), src: 'tasche', peso: CAT[k].peso }); });
      return out;
    }
    Object.entries(C.items).forEach(([k, v]) => {
      if (k === '$shop') { const Sh = shopOfB(st, C.bi); if (!Sh) return; Object.keys(Sh.sells).filter(g => (Sh.stock[g] || 0) >= 1 && CAT[g]).slice(0, 8).forEach(g => push({ id: g, nome: nm(g), q: Math.floor(Math.min(Sh.stock[g], 3 + v)), src: 'shop', peso: CAT[g].peso })); return; }
      if (k === '$') { if (C.fid === 'ar_cash-register') { const Sh = shopOfB(st, C.bi), T = Sh && So ? So.till(st, So.ditta(st, Sh.t)) : null; const x = T ? Math.floor(Math.max(0, T.cash || 0)) : 0; if (x > 0) push({ id: '$', nome: `contanti (${L(x)})`, q: x, src: 'till' }); return; } if (v > 0) push({ id: '$', nome: `contanti (${L(v)})`, q: v, src: 'cash' }); return; }
      if (k === '$mat') { const x = Math.floor(residents(st, C.bi).reduce((s, n) => s + (n.pop.mat || 0), 0) * Math.min(1, v)); if (x > 0) push({ id: '$', nome: `soldi nascosti (${L(x)})`, q: x, src: 'mat', pct: v }); return; }
      if (k === '$safe') { const x = typeof Cassaforti !== 'undefined' ? Math.floor(Cassaforti.safeCash(st, C.bi)) : 0; if (x > 0) push({ id: '$', nome: `l'incasso nella cassaforte (${L(x)})`, q: x, src: 'safe' }); return; }   // [cassaforti]
      if (k === '$bank') { if (!So || !st.soldi) return; const x = Math.floor(Math.min(st.soldi.banca.vault * .25, 900)); if (x > 0) push({ id: '$', nome: `mazzette del caveau (${L(x)})`, q: x, src: 'bank' }); return; }
      if (v >= 1) push({ id: k, nome: nm(k), q: Math.floor(v), src: 'c', peso: CAT[k] ? CAT[k].peso : .5 });
    });
    return out;
  }
  // chi c'è in quell'edificio adesso (chi ci abita e dorme o sta a casa, chi ci lavora ed è di turno)
  function residents(st, bi) { return st.npcs.filter(n => !n.dead && n.pop && n.pop.homeT && n.pop.homeT.k === 'b' && n.pop.homeT.bi === bi); }
  function occupants(st, bi) {
    return st.npcs.filter(n => {
      if (n.dead || !n.pop || n.jailedUntil > st.t) return false; const c = n.pop.cur; if (!c || !c.tgt || c.tgt.k !== 'b' || c.tgt.bi !== bi) return false;
      return dist(n.x, n.y, c.tgt.x, c.tgt.y) < 12;
    });
  }
  // aprire (forzare) e prendere. noise: quanto si sente; chi è in casa o in bottega se ne accorge
  function caught(st, bi, noise, what) {
    if (bi === undefined || bi === null) return null;
    const occ = occupants(st, bi); if (!occ.length) return null;
    const M0 = S(st); M0.alarm = M0.alarm || {}; if (M0.alarm[bi] && st.t - M0.alarm[bi].t < 30) return null;   // ti hanno già visto: non serve ripeterlo
    const awake = occ.filter(n => !(n.pop.cur && n.pop.cur.act === 'sonno'));
    let who = awake.length ? (rnd() < .55 + noise ? awake[0] : null) : occ.find(() => rnd() < noise * .5);
    if (!who) return null;
    const b = G.BUILDINGS[bi], ev = G.emit(st, 'furto', { target: who.id, shop: b.name || 'una casa' });
    occ.forEach(n => { G.addMemory(st, n, { eventId: ev.id, type: 'furto', actor: 'player', target: who.id, place: b.name || 'casa', t: st.t, conf: .9, source: 'visto' }); I.note(st, n, `ha sorpreso ${G.PLAYER_NAME} a rubare ${what} in ${b.name || 'casa'}`, 'bad', { w: .8, who: 'player', tag: 'furto' }); });
    S(st).stats.scoperto++; M0.alarm[bi] = { t: st.t, who: who.id };
    G.say(st, who, pick(['«Al ladro! Al ladro!»', '«Ehi! Che fai lì?»', '«Fuori da casa mia!»', '«Chiamo la Guardia!»']), 3);
    if (G.panicAround) try { G.panicAround(st, who.x, who.y, 8); } catch (e) { }
    if (who.pop.cur.act === 'sonno') who.pop.cur.act = 'casa';
    return who;
  }
  // all'aperto ti vede chi passa: un furto è un evento come gli altri (lo percepisce chi guarda)
  function seenOutside(st, what, place) { const ev = G.emit(st, 'furto', { shop: place || what }); return ev; }
  function openC(st, C) {
    if (!C.locked) return R_(true, '');
    if (C.fid === 'st_cassaforte' && typeof Cassaforti !== 'undefined') { const r = Cassaforti.open(st, C); if (r) return R_(r.ok, r.msg, r.x); }   // [cassaforti] combinazione, stetoscopio, dinamite
    const need = C.need || LOCKED[C.fid], P = pools(st); st0 = st; const pl = plan(P, { in: {}, tools: [need] });
    if (pl.miss.length) return R_(false, `È chiuso a chiave. Serve: ${alts(need).map(nm).join(' o ')}.`);
    const tool = pl.tools[0], mins = tool === 'trapano' ? 45 : tool === 'grimaldello' ? 15 : 5, noise = tool === 'piede' ? .5 : tool === 'trapano' ? .35 : .08;
    const broke = wearTools(st, P, [tool], mins * 3); passTime(st, mins);
    C.locked = false; C.forced = true;
    const who = C.kind === 'furn' ? caught(st, C.bi, noise, 'forzando ' + C.label) : null;
    if (C.kind !== 'furn' && tool === 'piede') seenOutside(st, C.label, C.label);
    return R_(true, `${tool === 'grimaldello' ? 'Click. Aperto coi grimaldelli' : tool === 'trapano' ? 'Tre quarti d\'ora di trapano: la serratura cede' : 'Uno strappo col piede di porco: aperto'}.${broke.length ? ` Si è rotto: ${broke.join(', ')}.` : ''}${who ? ` ${who.first} ti ha sentito!` : ''}`, { who: who ? who.id : null });
  }
  function takeFrom(st, C, id, q) {
    const view = contView(st, C), it = view.find(v => v.id === id); if (!it) return R_(false, 'Non c\'è più.');
    q = Math.max(1, Math.min(q || it.q, it.q)); const p = p_(st), M = S(st);
    const found = t => (t === 'raro' || t === 'prezioso') ? G.feed(st, `Trovato: ${it.nome}${it.q > 1 && id !== '$' ? ' ×' + q : ''}.`, 'good') : null;
    // dalle tasche di un morto o di uno a terra
    if (C.kind === 'corpo') {
      const n = G.byId(st, C.npc); if (!n || !n.pop) return R_(false, 'Non c\'è più.');
      if (id === '$') { n.pop.money -= q; p.money += q; M.stats.rubato += q; }
      else if (it.src === 'arma') { n.pop._armaPresa = true; givePlayer(st, id, 1, true); }
      else { const left = givePlayer(st, id, q); q -= left; if (!q) return R_(false, 'Non ti sta più niente addosso.'); sub(n.pop.inv, id, q); }
      if (!n.dead) { I.note(st, n, `${G.PLAYER_NAME} gli ha svuotato le tasche mentre era a terra`, 'bad', { w: 1, who: 'player', tag: 'furto' }); if (n.op) n.op.grudge = clamp((n.op.grudge || 0) + .3, 0, 1); }
      M.stats.frugato += q; found(it.tier);
      return R_(true, id === '$' ? `Intaschi ${L(q)}.` : `Prendi ${nm(id)}${q > 1 ? ' ×' + q : ''}.`);
    }
    const b = C.bi !== undefined ? G.BUILDINGS[C.bi] : null;
    if (id === '$') {
      if (it.src === 'till') { const Sh = shopOfB(st, C.bi), T = So.till(st, So.ditta(st, Sh.t)); T.cash -= q; }
      else if (it.src === 'mat') { let left = q; residents(st, C.bi).forEach(n => { const k = Math.min(left, n.pop.mat || 0); n.pop.mat -= k; left -= k; if (k > 0) I.note(st, n, 'i soldi nascosti in casa sono spariti', 'bad', { w: .9, tag: 'furto' }); }); q -= left; delete C.items.$mat; }
      else if (it.src === 'bank') { st.soldi.banca.vault -= q; st.soldi.banca.equity -= q; }
      else if (it.src === 'safe') { Cassaforti.takeSafe(st, C.bi, q); }   // [cassaforti]
      else { delete C.items.$; if (So && st.soldi) st.soldi.fuori -= q; /* soldi di nessuno: entrano nei conti dal continente */ }
      p.money += q; M.stats.rubato += q; found(it.tier);
      const who = C.kind === 'furn' ? caught(st, C.bi, .1, 'soldi') : null; return R_(true, `Intaschi ${L(q)}.${who ? ` ${who.first} ti ha visto!` : ''}`);
    }
    const left = givePlayer(st, id, q), got = q - left; if (!got) return R_(false, 'Non ti sta più niente addosso.');
    if (it.src === 'shop') { const Sh = shopOfB(st, C.bi); Sh.stock[id] -= got; M.stats.rubato += got * CAT[id].prezzo; }
    else { C.items[id] -= got; if (C.items[id] <= 0) delete C.items[id]; }
    M.stats.frugato += got; found(it.tier);
    let who = null;
    if (C.kind === 'furn') { const home = residents(st, C.bi).length && !(st.me && st.me.home && st.me.home.bi === C.bi); who = (it.src === 'shop' || home) ? caught(st, C.bi, .06, nm(id)) : null; }
    else if (C.theft) seenOutside(st, nm(id), C.label);
    return R_(true, `Prendi ${nm(id)}${got > 1 ? ' ×' + got : ''}.${left ? ' Il resto non ti sta addosso.' : ''}${who ? ` ${who.first} ti ha visto!` : ''}`);
  }
  // i posti all'aperto (discarica, ruderi, cantiere…): roba di nessuno, tranne dove c'è un padrone (cantiere, molo, calata)
  const THEFT_SPOTS = /cantiere|molo|calata|pontile/;
  function spot(st, id) {
    const M = S(st); let C = M.spots[id];
    if (!C || st.t - C.at > 2 * 1440) { const old = C; C = M.spots[id] = { key: 'p:' + id, kind: 'spot', at: st.t, items: roll(SPOT_LOOT[id], 1), spot: id, label: PLACES[id] ? PLACES[id].name : id, theft: THEFT_SPOTS.test(id) }; if (old) Object.entries(old.items).forEach(([k, v]) => { C.items[k] = Math.min(8, (C.items[k] || 0) + v); }); }
    return C;
  }
  // i bagagliai: dipende da che mezzo è
  const TRUNK = {
    lavoro: [['casse', .4, 1, 2], ['merce', .15, 1, 1], ['sacchi', .4, 1, 3], ['corda', .3, 1, 1], ['ricambi', .3, 1, 1], ['bombola', .1, 1, 1], ['chiave_inglese', .3, 1, 1], ['tanica_vuota', .3, 1, 1], ['assi', .15, 1, 1], ['scatolame', .2, 2, 6], ['olio_motore', .3, 1, 1], ['benzina', .2, 1, 1]],
    auto: [['$', .4, 3, 25], ['sigarette', .4, 1, 1], ['radiolina', .1, 1, 1], ['cassetta', .4, 1, 3], ['mappa', .3, 1, 1], ['olio_motore', .3, 1, 1], ['tanica_vuota', .2, 1, 1], ['kit_medico', .05, 1, 1], ['marlboro', .04, 1, 1], ['giacca_pelle', .03, 1, 1], ['coperta', .2, 1, 1], ['ombrello', 0, 1, 1]],
    regime: [['munizioni', .7, 1, 3], ['manette', .5, 1, 1], ['razione_tutela', .6, 1, 4], ['ricetrasmittente', .15, 1, 1], ['divisa', .2, 1, 1], ['pistola', .1, 1, 1], ['maschera_gas', .2, 1, 1], ['fumogeno', .2, 1, 2], ['fascicolo', .1, 1, 1], ['torcia', .5, 1, 1]],
  };
  const trunkKind = v => /polizia|campagnola|blindato/.test(v.kind) ? 'regime' : /furgone|ape|camion|fuoristrada/.test(v.kind) ? 'lavoro' : /vespa/.test(v.kind) ? null : 'auto';
  function trunk(st, v) {
    const k = trunkKind(v); if (!k) return null; const M = S(st); M.veh = M.veh || {}; let C = M.veh[v.id];
    if (!C || st.t - C.at > 3 * 1440) C = M.veh[v.id] = { key: 'v:' + v.id, kind: 'veicolo', at: st.t, items: roll(TRUNK[k].filter(r => r[1] > 0), 1), locked: true, need: 'grimaldello|piede', theft: true, veh: v.id };
    C.label = `bagagliaio (${G.vehicleName ? G.vehicleName(st, v) : (G.VK[v.kind] || {}).label || v.kind})`;
    return C;
  }
  // le casse di carico al porto: arrivano con la nave, sorvegliate
  function cargo(st, pid) {
    const M = S(st); M.cargo = M.cargo || {}; let C = M.cargo[pid];
    if (!C) C = M.cargo[pid] = { key: 'g:' + pid, kind: 'cargo', at: st.t, items: {}, locked: true, need: 'piede', theft: true, label: `casse di carico (${PLACES[pid].name})` };
    return C;
  }
  function cargoArrive(st) {
    ['calata', 'molo_cargo', 'pontile'].filter(id => PLACES[id]).forEach(id => {
      const C = cargo(st, id); C.locked = true; C.at = st.t;
      for (let i = 0; i < 4; i++) { const g = pick(IMPORT); C.items[g] = Math.min(12, (C.items[g] || 0) + 2 + Math.floor(rnd() * 4)); }
      if (rnd() < .5) C.items.merce = (C.items.merce || 0) + 1; if (id === 'molo_cargo' && rnd() < .4) C.items.munizioni = (C.items.munizioni || 0) + 2;
    });
  }
  // =====================================================================================================================
  // ROBA SPARSA: cestini, vicoli, rottami, boschi, spiagge, prateria, tetti, dintorni delle caserme.
  // Nascondigli sparsi a caso su tutta l'isola, si svuotano e si riempiono coi giorni. Si trovano passandoci accanto
  // o fermandosi a cercare (10 minuti: dice dove guardare nei dintorni).
  // =====================================================================================================================
  const SCATTER = {
    cestino: { nome: 'cestino', n: 50, t: [['giornale', .5, 1, 2], ['bottiglia_vuota', .5, 1, 3], ['lattine', .3, 1, 1], ['cartone', .3, 1, 1], ['stracci', .3, 1, 1], ['pane', .1, 1, 1], ['sigarette', .06, 1, 1], ['$', .08, 1, 4], ['pile', .1, 1, 1], ['volantini', .01, 1, 1]] },
    vicolo: { nome: 'roba in un angolo del vicolo', n: 70, t: [['cartone', .4, 1, 2], ['casse', .25, 1, 1], ['bottiglia_vuota', .4, 1, 2], ['stracci', .3, 1, 2], ['lattine', .3, 1, 1], ['pallet', .15, 1, 1], ['coltellino', .03, 1, 1], ['grimaldello', .01, 1, 1], ['cassette_proibite', .02, 1, 1], ['$', .06, 1, 8], ['bici_rotta', .04, 1, 1], ['tubi', .08, 1, 1], ['corda', .1, 1, 1]] },
    rottami: { nome: 'mucchio di rottami', n: 40, t: [['rottami', .7, 1, 3], ['ricambi', .3, 1, 1], ['pneumatico', .2, 1, 1], ['batterie_esauste', .3, 1, 2], ['motore_el', .1, 1, 1], ['tubi', .2, 1, 1], ['catena', .08, 1, 1], ['lamiera', .15, 1, 1], ['rame', .08, 1, 1], ['bici_rotta', .06, 1, 1], ['frigo_rotto', .05, 1, 1], ['radio_rotta', .1, 1, 1]] },
    bosco: { nome: 'sottobosco', n: 80, t: [['legna', .5, 1, 2], ['funghi', .3, 1, 1], ['castagne', .3, 1, 1], ['noci', .15, 1, 1], ['sughero', .15, 1, 1], ['miele', .03, 1, 1], ['bottiglia_vuota', .1, 1, 1], ['scatolame', .05, 1, 1], ['munizioni', .02, 1, 1], ['coltellino', .02, 1, 1], ['razione', .01, 1, 1]] },
    spiaggia: { nome: 'roba portata dal mare', n: 30, t: [['bottiglia_vuota', .5, 1, 2], ['corda', .3, 1, 1], ['assi', .25, 1, 1], ['stracci', .3, 1, 1], ['casse', .15, 1, 1], ['lattine', .2, 1, 1], ['rete_pesca', .04, 1, 1], ['merce', .03, 1, 1], ['whisky', .02, 1, 1], ['marlboro', .02, 1, 1]] },
    prateria: { nome: 'qualcosa tra l\'erba secca', n: 35, t: [['rottami', .3, 1, 1], ['bottiglia_vuota', .2, 1, 1], ['pelle', .08, 1, 1], ['sale', .1, 1, 1], ['munizioni', .04, 1, 1], ['tanica_vuota', .1, 1, 1], ['bussola', .02, 1, 1], ['coltello', .02, 1, 1], ['razione_tutela', .04, 1, 1]] },
    tetto: { nome: 'roba sul tetto', n: 50, roof: true, t: [['cavo', .3, 1, 1], ['tubi', .2, 1, 1], ['lamiera', .15, 1, 1], ['vestiti', .25, 1, 1], ['lenzuola', .2, 1, 1], ['radio_rotta', .1, 1, 1], ['antenna_kit', .03, 1, 1], ['casse', .2, 1, 1], ['merce', .04, 1, 1], ['volantini', .05, 1, 1], ['$', .05, 5, 30], ['pistola', .006, 1, 1]] },
    militare: { nome: 'roba vicino ai Grigi', n: 20, t: [['razione_tutela', .4, 1, 2], ['munizioni', .15, 1, 1], ['elmetto', .08, 1, 1], ['stoffa_grigia', .08, 1, 1], ['giornale', .3, 1, 2], ['sigarette', .3, 1, 1], ['bende', .15, 1, 1], ['manette', .04, 1, 1], ['fumogeno', .04, 1, 1]] },
  };
  Object.values(SCATTER).forEach(c => c.t.forEach(([id]) => { if (id[0] !== '$' && !CAT[id]) throw new Error('oggetti: sparso sconosciuto ' + id); }));
  function scatterInit(st) {
    const M = S(st); if (M.caches) return M.caches; M.caches = [];
    const T = G.T, GW = G.GW, GH = G.GH, at = (x, y) => (x >= 0 && y >= 0 && x < GW && y < GH ? G.tileAt(x, y) : -1);
    const nearT = (x, y, t, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (at(x + i, y + j) === t) return true; return false; };
    const MIL = ['muro', 'varco', 'eliporto', 'caserma_p', 'commissariato', 'rocca', 'poligono', 'hangar1', 'hangar2', 'molo_cargo'].map(id => PLACES[id]).filter(Boolean);
    const want = {}; Object.entries(SCATTER).forEach(([k, c]) => { want[k] = c.n; });
    let seed = 1234567; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let tries = 0; tries < 200000 && Object.values(want).some(v => v > 0); tries++) {
      const x = Math.floor(r() * GW), y = Math.floor(r() * GH), t = at(x, y), wx = (x + .5) * TS, wy = (y + .5) * TS;
      let k = null;
      if (t === T.BLD) k = 'tetto';
      else if (MIL.some(P0 => dist(P0.x, P0.y, wx, wy) < 30) && (t === T.VIA || t === T.WALK || t === T.DIRT || t === T.GRAVEL || t === T.COB)) k = 'militare';
      else if ((t === T.WALK || t === T.PIAZZA) && nearT(x, y, T.BLD, 1)) k = r() < .45 ? 'cestino' : 'vicolo';
      else if ((t === T.COB || t === T.VIA) && nearT(x, y, T.BLD, 1)) k = r() < .4 ? 'cestino' : 'vicolo';
      else if (t === T.DIRT || t === T.GRAVEL || (t === T.QUAY && r() < .5)) k = 'rottami';
      else if (t === T.TREE || t === T.SHRUB || (t === T.GRASS && nearT(x, y, T.TREE, 2))) k = 'bosco';
      else if (t === T.SAND) k = 'spiaggia';
      else if (t === T.DESERT || t === T.FIELD || t === T.SALT) k = 'prateria';
      if (!k || !(want[k] > 0)) continue;
      if (M.caches.some(c => Math.abs(c.tx - x) < 6 && Math.abs(c.ty - y) < 6)) continue;
      // dove si sta in piedi: la casella stessa, o una vicina (per gli alberi e le case: ai piedi)
      let sx = wx, sy = wy;
      if (k !== 'tetto' && !G.walkM(wx, wy)) { const o = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([i, j]) => G.walkM(wx + i * TS, wy + j * TS)); if (!o) continue; sx = wx + o[0] * TS; sy = wy + o[1] * TS; }
      want[k]--; M.caches.push({ id: 'k' + M.caches.length, kind: k, tx: x, ty: y, x: sx, y: sy, roof: !!SCATTER[k].roof, items: roll(SCATTER[k].t, 1), at: st.t, next: st.t + (2 + rnd() * 3) * 1440 });
    }
    return M.caches;
  }
  function cachesTick(st) { (S(st).caches || []).forEach(c => { if (st.t >= c.next && !Object.keys(c.items).length) { c.items = roll(SCATTER[c.kind].t, 1); c.at = st.t; c.next = st.t + (2 + rnd() * 3) * 1440; } }); }
  const onRoof = st => { const p = p_(st); return !!(p.roof || p.onRoof || (typeof Livelli !== 'undefined' && Livelli.onRoof && Livelli.onRoof(st))); };
  // fermarsi a cercare: dieci minuti, e sai dove guardare qui intorno
  function search(st) {
    const p = p_(st); if (p.indoor) return R_(false, 'Qui dentro fruga nei mobili.'); scatterInit(st); passTime(st, 10);
    const roof = onRoof(st), near = S(st).caches.filter(c => c.roof === roof && Object.keys(c.items).length && dist(c.x, c.y, p.x, p.y) < 18).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y)).slice(0, 3);
    if (!near.length) return R_(false, 'Dieci minuti a guardarti intorno: niente di utile qui.');
    const DIR = ['est', 'sud-est', 'sud', 'sud-ovest', 'ovest', 'nord-ovest', 'nord', 'nord-est'];
    S(st).reveal = { until: st.t + 90, ids: near.map(c => c.id) };
    return R_(true, 'Ti guardi intorno: ' + near.map(c => { const a = Math.atan2(c.y - p.y, c.x - p.x), i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8, d = Math.round(dist(c.x, c.y, p.x, p.y)); return d < 2 ? `${SCATTER[c.kind].nome}, qui` : `${SCATTER[c.kind].nome} a ${d} m verso ${DIR[i]}`; }).join('; ') + '.');
  }
  function containersHere(st) {
    const p = p_(st), out = [];
    if (p.indoor) { nearFurn(st, 2.2).forEach(x => { if (lootTable(G.BUILDINGS[p.indoor.b], x.room, x.o.id)) out.push({ ref: `f:${x.i}`, label: furnName(x.o.id, x.room), locked: !!LOCKED[x.o.id] && !((S(st).cont[`b${p.indoor.b}:${p.indoor.f}:${x.i}`] || {}).forced) }); }); return out; }
    const pl = nearPlace(st, 12); if (pl && SPOT_LOOT[pl]) out.push({ ref: `p:${pl}`, label: PLACES[pl].name });
    { const roof = onRoof(st), R = S(st).reveal; scatterInit(st).filter(c => c.roof === roof && Object.keys(c.items).length && dist(c.x, c.y, p.x, p.y) < (R && R.until > st.t && R.ids.includes(c.id) ? 3 : 1.8)).slice(0, 2).forEach(c => out.push({ ref: `k:${c.id}`, label: SCATTER[c.kind].nome })); }
    const cg = ['calata', 'molo_cargo', 'pontile'].find(id => PLACES[id] && dist(PLACES[id].x, PLACES[id].y, p.x, p.y) < 10); if (cg) { const C = cargo(st, cg); if (Object.keys(C.items).length) out.push({ ref: `g:${cg}`, label: C.label, locked: C.locked }); }
    // i corpi e chi è a terra
    st.npcs.filter(n => n.pop && !n.inside && (n.dead || n.stun > 0) && !(n.corpse && (n.corpse.leader || n.corpse.vehicle || n.corpse.gone)) && dist(n.x, n.y, p.x, p.y) < 1.9).slice(0, 2)
      .forEach(n => out.push({ ref: `c:${n.id}`, label: n.dead ? `Tasche di ${n.first} (morto)` : `Tasche di ${n.first} (a terra)` }));
    // i bagagliai delle auto parcheggiate
    const v = (st.vehicles || []).filter(v => !v.rider && !v.traffic && !v.wreck && !v.hidden && !v.mine && trunkKind(v) && dist(v.x, v.y, p.x, p.y) < 3.2).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
    if (v) { const C = trunk(st, v); out.push({ ref: `v:${v.id}`, label: C.label, locked: C.locked }); }
    return out;
  }
  // [bottino] tutto quello che si può frugare nei dintorni, con la posizione nel mondo: bottino.js lo disegna come oggetto da cliccare
  function spotPos(st, id) {
    const M = S(st); M.spotPos = M.spotPos || {}; if (M.spotPos[id]) return M.spotPos[id];
    const P0 = PLACES[id]; let best = { x: P0.x, y: P0.y }, bd = 1e9;
    if (!G.walkM(P0.x, P0.y)) for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const x = P0.x + i * TS, y = P0.y + j * TS, d = Math.hypot(i, j); if (d < bd && G.walkM(x, y)) { bd = d; best = { x, y }; } }
    return (M.spotPos[id] = { x: best.x + TS * .3, y: best.y + TS * .3 });
  }
  function lootables(st, r) {
    const p = p_(st), out = []; r = r || 40;
    if (p.vehicle) return out;
    if (p.indoor) {
      const b = G.BUILDINGS[p.indoor.b], Lx = INT.layout(b), F = Lx.floors[p.indoor.f]; if (!F) return out;
      F.furn.forEach((o, i) => {
        if (dist(o.x, o.y, p.x, p.y) > r) return; const room = INT.roomAt ? (INT.roomAt(Lx, p.indoor.f, o.x, o.y) || {}).name : null; if (!lootTable(b, room, o.id)) return;
        const c = S(st).cont[`b${p.indoor.b}:${p.indoor.f}:${i}`];
        out.push({ ref: `f:${i}`, kind: 'mobile', x: o.x, y: o.y, label: furnName(o.id, room), locked: !!LOCKED[o.id] && !(c && c.forced) });
      });
      return out;
    }
    const roof = onRoof(st);
    scatterInit(st).forEach(c => { if (c.roof === roof && Object.keys(c.items).length && dist(c.x, c.y, p.x, p.y) < r) out.push({ ref: `k:${c.id}`, kind: c.kind, x: c.x, y: c.y, label: SCATTER[c.kind].nome, take: c.kind !== 'militare' }); });
    if (!roof) {
      Object.keys(SPOT_LOOT).forEach(id => { if (!PLACES[id] || dist(PLACES[id].x, PLACES[id].y, p.x, p.y) > r) return; const C = spot(st, id); if (!Object.keys(C.items).length) return; const q = spotPos(st, id); out.push({ ref: `p:${id}`, kind: 'posto', x: q.x, y: q.y, label: C.label, take: !C.theft }); });
      ['calata', 'molo_cargo', 'pontile'].forEach(id => { if (!PLACES[id] || dist(PLACES[id].x, PLACES[id].y, p.x, p.y) > r) return; const C = cargo(st, id); if (!Object.keys(C.items).length) return; const q = spotPos(st, id); out.push({ ref: `g:${id}`, kind: 'carico', x: q.x - TS * .8, y: q.y, label: C.label, locked: C.locked }); });
      st.npcs.forEach(n => { if (n.pop && !n.inside && (n.dead || n.stun > 0) && !(n.corpse && (n.corpse.leader || n.corpse.vehicle || n.corpse.gone)) && dist(n.x, n.y, p.x, p.y) < r) out.push({ ref: `c:${n.id}`, kind: 'corpo', x: n.x, y: n.y, label: `Tasche di ${n.first}${n.dead ? ' (morto)' : ' (a terra)'}`, npc: n.id }); });
      (st.vehicles || []).forEach(v => { if (v.rider || v.traffic || v.wreck || v.hidden || v.mine || !trunkKind(v) || dist(v.x, v.y, p.x, p.y) > r) return; const K = G.VK[v.kind] || { len: 4 }, b0 = K.len / 2; out.push({ ref: `v:${v.id}`, kind: 'bagagliaio', x: v.x - Math.cos(v.ang) * b0, y: v.y - Math.sin(v.ang) * b0, label: trunk(st, v).label, locked: trunk(st, v).locked, veh: v.id }); });
    }
    return out;
  }
  function contByRef(st, ref) {
    const [k, id] = [ref.slice(0, 1), ref.slice(2)];
    if (k === 'p') return SPOT_LOOT[id] ? spot(st, id) : null;
    if (k === 'g') return PLACES[id] ? cargo(st, id) : null;
    if (k === 'k') { const c = scatterInit(st).find(x => x.id === id); if (!c) return null; c.key = ref; c.label = SCATTER[c.kind].nome; c.theft = c.kind === 'militare'; c.ckind = 'sparso'; return Object.assign(Object.create(null), { key: ref, kind: 'spot', items: c.items, label: c.label, theft: c.theft }); }
    if (k === 'c') { const n = G.byId(st, id); return n && n.pop && (n.dead || n.stun > 0) ? { key: ref, kind: 'corpo', npc: id, label: `Tasche di ${n.first}`, items: {} } : null; }
    if (k === 'v') { const v = (st.vehicles || []).find(x => String(x.id) === id); return v && dist(v.x, v.y, p_(st).x, p_(st).y) < 4 ? trunk(st, v) : null; }
    const p = p_(st); if (!p.indoor) return null; const i = +id; const x = nearFurn(st, 3.2).find(y => y.i === i); return x ? container(st, x) : null;
  }
  // borseggiare: da dietro, piano, a chi non ti guarda. Va bene o ti becca
  function pickpocket(st, id) {
    const n = G.byId(st, id), p = p_(st); if (!n || n.dead || !n.pop || dist(n.x, n.y, p.x, p.y) > 1.6) return R_(false, 'Troppo lontano.');
    const behind = Math.abs(((Math.atan2(p.y - n.y, p.x - n.x) - (n.face || 0) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.6;
    const chance = .25 + (behind ? .3 : 0) + (p.sneak ? .2 : 0) - ((n.tr && n.tr.legge) || .5) * .15 - (n.cop ? .2 : 0);
    if (rnd() > chance) {
      const ev = G.emit(st, 'scippo', { target: n.id }); G.addMemory(st, n, { eventId: ev.id, type: 'scippo', actor: 'player', target: n.id, place: G.nearestPlace(p.x, p.y).name, t: st.t, conf: 1, source: 'visto' });
      G.say(st, n, pick(['«Giù le mani!»', '«Ladro!»', '«Che fai nelle mie tasche?»']), 3); if (n.op) n.op.grudge = clamp((n.op.grudge || 0) + .4, 0, 1);
      return R_(false, `${n.first} se ne accorge!`);
    }
    const items = Object.keys(n.pop.inv || {}).filter(k => CAT[k] && n.pop.inv[k] >= 1 && CAT[k].peso <= 1.5), m = Math.floor(n.pop.money || 0);
    if (m > 0 && (rnd() < .6 || !items.length)) { const x = Math.max(1, Math.floor(m * (.3 + rnd() * .4))); n.pop.money -= x; p.money += x; S(st).stats.rubato += x; return R_(true, `Gli sfili ${L(x)} dal portafoglio. Non se n'è accorto.`); }
    if (!items.length) return R_(false, 'Tasche vuote.');
    const g = pick(items); sub(n.pop.inv, g, 1); givePlayer(st, g, 1, true); if (tier(g) === 'raro' || tier(g) === 'prezioso') G.feed(st, `Trovato: ${nm(g)}.`, 'good');
    return R_(true, `Gli sfili ${nm(g)}. Non se n'è accorto.`);
  }
  // posare: lasciare roba in un contenitore (nascondere refurtiva, rifornire una base)
  function putInto(st, C, id, q) { if (C.kind === 'corpo') return R_(false, 'Meglio di no.'); const b = inv(st); q = Math.min(q || 1, cnt(b, id)); if (!q) return R_(false, 'Non ce l\'hai.'); sub(b, id, q); add(C.items, id, q); return R_(true, `Lasci ${nm(id)}${q > 1 ? ' ×' + q : ''} in ${C.label}.`); }

  // =====================================================================================================================
  // COMPRARE, VENDERE, SCAMBIARE
  // =====================================================================================================================
  const price = (st, Sh, g) => Ec.price(st, Sh, g);
  const sellPrice = (st, Sh, g) => r1(CAT[g].prezzo * (Sh.black ? (CAT[g].ill ? .6 : .4) : .5) * clamp(1.4 - (Sh.stock[g] || 0) / Math.max(1, CAT[g].q || 5) * .5, .4, 1.2));
  function counter(st, k) {
    const E = Ec.eco(st), Sh = E.shops[k]; if (!Sh) return null; const b = inv(st);
    const goods = Object.keys(Sh.sells).filter(g => CAT[g]).map(g => { const c = CAT[g]; return { g, name: c.nome, cat: c.cat, catLabel: GROUPS[c.cat], price: price(st, Sh, g), base: c.prezzo, stock: Math.floor(Sh.stock[g] || 0), peso: c.peso, eat: !!c.eat, ill: !!c.ill, mine: cnt(b, g) }; });
    // cosa compra la bottega da te: quello che vende lei (il mercato nero: anche la roba che scotta)
    const buys = Object.keys(b).filter(g => CAT[g] && cnt(b, g) > 0 && (Sh.sells[g] || (Sh.black && (CAT[g].ill || CAT[g].prezzo >= 6)))).map(g => ({ g, name: nm(g), q: cnt(b, g), price: sellPrice(st, Sh, g) }));
    const Lg = luoghi(st)[k], ck = Lg ? clerk(st, Lg) : null;
    return { k, label: Sh.label, clerk: ck ? ck.first : null, clerkId: ck ? ck.id : null, open: isOpen(st, Lg), emporio: !!Sh.emporio, black: !!Sh.black, market: !!Sh.market, cash: Math.floor(tillOf(st, Sh)), goods, buys, wallet: st.player.money, peso: r1(weightOf(b)), cap: capacity(st) };
  }
  function tillOf(st, Sh) { if (So && st.soldi) { const T = So.till(st, So.ditta(st, Sh.t)); return T ? (T.cash || 0) : (Sh.cash || 0); } return Sh.cash || 0; }
  function tillMove(st, Sh, x) { if (So && st.soldi) { const D = So.ditta(st, Sh.t), T = So.till(st, D); if (T) { T.cash = (T.cash || 0) + x; if (x > 0) D.rev = (D.rev || 0) + x; return; } } Sh.cash = (Sh.cash || 0) + x; }
  function buy(st, k, g, q, mode) {
    const E = Ec.eco(st), Sh = E.shops[k], p = p_(st); if (!Sh) return R_(false, 'Qui non vendono niente.');
    const Lg = luoghi(st)[k]; if (!isOpen(st, Lg)) return R_(false, 'Al banco non c\'è nessuno.');
    if (!Sh.sells[g] || !CAT[g]) return R_(false, 'Non ce l\'hanno.');
    if (Sh.market && ![2, 5].includes(Po.weekday(st.t))) return R_(false, 'Oggi non c\'è mercato.');
    q = Math.max(1, Math.floor(q || 1)); if ((Sh.stock[g] || 0) < q) return R_(false, `${cap(nm(g))}: ${Sh.stock[g] >= 1 ? `ne hanno solo ${Math.floor(Sh.stock[g])}` : 'finito'}.`);
    const pr = r1(price(st, Sh, g) * q); if (p.money < pr - 1e-6) return R_(false, `Costa ${L(pr)}: non ce li hai.`);
    const c = CAT[g];
    if (mode !== 'consuma' && !c.wpn && g !== 'munizioni' && weightOf(inv(st)) + c.peso * q > capacity(st) + .01 && !nearBase(st)) return R_(false, `Pesa troppo: porti già ${r1(weightOf(inv(st)))} kg su ${capacity(st)}.`);
    Sh.stock[g] -= q; p.money -= pr; tillMove(st, Sh, pr); Ec.eco(st).stats.venduto += q;
    if (So && st.soldi) { const M = st.soldi; M.player.mov.unshift([st.t, -pr, `${c.nome} (${Sh.label})`]); M.player.mov = M.player.mov.slice(0, 40); }
    st.sfx && st.sfx.push({ k: 'cash' });
    if (Sh.emporio && st.ris) st.ris.morale = clamp(st.ris.morale - .1, 0, 100);
    if (mode === 'consuma' && c.eat) { add(inv(st), g, q); let m = ''; for (let i = 0; i < q; i++) m = consume(st, g).msg; return R_(true, `${cap(c.nome)}${q > 1 ? ' ×' + q : ''}: ${L(pr)}. ${m}`); }
    const left = givePlayer(st, g, q);
    if (left > 0) { const b = nearBase(st); if (b) add(b.stock, g, left); }
    return R_(true, `${cap(c.nome)}${q > 1 ? ' ×' + q : ''}: ${L(pr)}.${left > 0 ? ' Non ti sta addosso: lo lasci in base.' : ''}`);
  }
  function sell(st, k, g, q) {
    const E = Ec.eco(st), Sh = E.shops[k], p = p_(st), b = inv(st); if (!Sh) return R_(false, 'Qui non comprano.');
    if (!isOpen(st, luoghi(st)[k])) return R_(false, 'Al banco non c\'è nessuno.');
    q = Math.max(1, Math.min(Math.floor(q || 1), cnt(b, g))); if (!q) return R_(false, 'Non ce l\'hai.');
    if (!Sh.sells[g] && !(Sh.black && (CAT[g].ill || CAT[g].prezzo >= 6))) return R_(false, '«Questa roba non la tratto.»');
    const pr = r1(sellPrice(st, Sh, g) * q), cash = tillOf(st, Sh); if (cash < pr) return R_(false, `«In cassa ho ${L(Math.floor(cash))}. Ripassa.»`);
    sub(b, g, q); Sh.stock[g] = (Sh.stock[g] || 0) + q; tillMove(st, Sh, -pr); p.money += pr;
    if (So && st.soldi) { const M = st.soldi; M.player.mov.unshift([st.t, pr, `venduto ${nm(g)} (${Sh.label})`]); }
    if (CAT[g].ill && !Sh.black) suspicious(st, .5, `ha venduto ${nm(g)}`);
    return R_(true, `Vendi ${nm(g)}${q > 1 ? ' ×' + q : ''} per ${L(pr)}.`);
  }
  // lo scambio con le persone: si mette sul piatto roba e soldi; accetta se gli conviene, e se si fida di te un po' meno di quanto conviene
  function npcBag(n) { const P = n.pop; if (!P) return {}; P.inv = P.inv || {}; return P.inv; }
  function valueOf(id, q, who) { const c = CAT[id]; if (!c) return 0; let v = c.prezzo || (c.res ? 3 : .5); if (who && who.pop) { const need = who.pop.need || {}; if (c.eat && c.eat.fame && (need.fame || 0) > .5) v *= 1.5; if (c.ill && who.ris && who.ris.ideo > .6) v *= 1.3; if (c.ill && who.ris && who.ris.ideo < .3) v *= .3; } return v * q; }
  function barterView(st, id) {
    const n = G.byId(st, id); if (!n || n.dead || !n.pop) return null; const nb = npcBag(n), b = inv(st), o = n.op || {};
    return { id: n.id, name: n.name, first: n.first, job: n.pop.job ? n.pop.job.title : '', money: Math.floor(n.pop.money || 0), mood: r1((o.trust || 0) - (o.grudge || 0) - (o.fear || 0) * .5),
      theirs: Object.keys(nb).filter(k => CAT[k] && cnt(nb, k) > 0 && !CAT[k].wpn).map(k => ({ id: k, nome: nm(k), q: cnt(nb, k), v: r1(valueOf(k, 1, null)) })),
      mine: Object.keys(b).filter(k => CAT[k] && cnt(b, k) > 0).map(k => ({ id: k, nome: nm(k), q: cnt(b, k), v: r1(valueOf(k, 1, n)) })), wallet: Math.floor(st.player.money) };
  }
  function barter(st, id, offer) {
    const n = G.byId(st, id); if (!n || n.dead || !n.pop) return R_(false, 'Non c\'è nessuno.');
    const p = p_(st), b = inv(st), nb = npcBag(n), give = offer.give || {}, get = offer.get || {}, myLire = Math.max(0, +offer.lire || 0), theirLire = Math.max(0, +offer.theirLire || 0);
    for (const [k, q] of Object.entries(give)) if (cnt(b, k) < q) return R_(false, `Non hai ${nm(k)} ×${q}.`);
    for (const [k, q] of Object.entries(get)) if (cnt(nb, k) < q) return R_(false, `${n.first} non ha ${nm(k)} ×${q}.`);
    if (p.money < myLire) return R_(false, 'Non hai tutti quei soldi.'); if ((n.pop.money || 0) < theirLire) return R_(false, `${n.first} non ha tutti quei soldi.`);
    const vin = Object.entries(give).reduce((s, [k, q]) => s + valueOf(k, q, n), 0) + myLire, vout = Object.entries(get).reduce((s, [k, q]) => s + valueOf(k, q, null), 0) + theirLire;
    const o = n.op || {}, trust = (o.trust || 0) - (o.grudge || 0), greed = (n.tr && n.tr.avid) || .5, want = vout * (1 + greed * .25 - clamp(trust, -.5, .6) * .3);
    if (vout <= 0 && vin <= 0) return R_(false, 'Non c\'è niente sul piatto.');
    const ill = Object.keys(give).concat(Object.keys(get)).some(k => CAT[k] && CAT[k].ill);
    if (ill && n.tr && n.tr.legge > .75 && trust < .3) { I.note(st, n, `${G.PLAYER_NAME} ha cercato di passargli roba che scotta`, 'shady', { w: .6, who: 'player' }); return R_(false, `«Roba così non la voglio vedere. E nemmeno te.»`); }
    if (vin + 1e-6 < want) { const gap = Math.ceil(want - vin); return R_(false, `«Non mi conviene. Mettici almeno ${gap}.000 lire di più.»`, { gap }); }
    Object.entries(give).forEach(([k, q]) => { sub(b, k, q); add(nb, k, q); });
    Object.entries(get).forEach(([k, q]) => { sub(nb, k, q); givePlayer(st, k, q, true); });
    p.money -= myLire; n.pop.money += myLire; n.pop.money -= theirLire; p.money += theirLire;
    if (n.op) n.op.trust = clamp((n.op.trust || 0) + (vin > want * 1.2 ? .05 : .01), -1, 1);
    I.note(st, n, `scambio con ${G.PLAYER_NAME}`, 'good', { w: .3, who: 'player' });
    return R_(true, `${n.first}: «Affare fatto.»`);
  }

  // =====================================================================================================================
  // L'ECONOMIA DEGLI ABITANTI: produrre con le ricette, procurarsi gli ingredienti, comprare quello che serve a casa
  // =====================================================================================================================
  const fill = (E, g) => { const shops = Object.values(E.shops).filter(Sh => Sh.sells[g] && !Sh.black && !Sh.market); if (!shops.length) return 1; return shops.reduce((s, Sh) => s + (Sh.stock[g] || 0), 0) / shops.reduce((s, Sh) => s + Math.max(1, CAT[g] ? CAT[g].q : 5), 0); };
  function storeHas(store, key, q) { return alts(key).find(id => (store.stock[id] || 0) >= q); }
  function canDo(store, rec) { const use = {}; for (const [k, q] of Object.entries(rec.in)) { const h = storeHas(store, k, q); if (!h) return null; use[h] = q; } return use; }
  function produceHour(st) {
    const E = Ec.eco(st), M = S(st);
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || n.dead || !P.job || !P.cur || P.cur.act !== 'lavoro' || n.jailedUntil > st.t) return;
      workHour(st, P.job.base || P.job.title || '', P.job.t, n);
    });
    // anche il protagonista, quando fa il suo turno, produce come gli altri
    const me = st.me; if (me && me.job && me.warp && me.warp.kind === 'lavoro') { const J = me.job, wt = J.bi >= 0 ? I.tB(J.bi) : I.target(J.place); if (wt) workHour(st, J.title, wt, null); }
  }
  function workHour(st, title, wt, n) {
    const E = Ec.eco(st), M = S(st);
    {
      if (!wt) return;
      const jp = JOBPROD.find(([re, , lre]) => re.test(title) && (!lre || lre.test(wt.label || ''))); if (!jp) return;
      const k = I.tkey ? I.tkey(wt) : (wt.k + ':' + (wt.bi !== undefined ? wt.bi : wt.id)), Sh = Ec.shopAt(st, wt);
      const W = E.work[k] = E.work[k] || { k, t: wt, label: wt.label, stock: {} }, store = Sh || W;
      store.recipes = store.recipes || {}; jp[1].forEach(r => { store.recipes[r] = 1; });
      // la ricetta che serve di più: quella dei cui prodotti c'è meno in giro
      const cands = jp[1].map(id => RECIPES[id]).filter(Boolean).map(rec => ({ rec, use: rec.npcOut ? {} : canDo(store, rec), need: Math.min(...Object.keys(rec.npcOut || rec.out).map(g => fill(E, g) + (store.stock[g] || 0) / Math.max(4, (CAT[g] ? CAT[g].q : 5) * 3))) })).filter(x => x.use && x.need < 2.2);
      if (!cands.length) { if (n && rnd() < .05) I.note(st, n, `a ${wt.label} manca la materia prima: si lavora a vuoto`, 'bad', { w: .2, tag: 'scarsita' }); return; }
      cands.sort((a, b) => a.need - b.need); const { rec, use } = cands[Math.random() < .8 ? 0 : Math.floor(rnd() * cands.length)];
      if (rec.npcOut) { Object.entries(rec.npcOut).forEach(([g, q]) => { if ((store.stock[g] || 0) > Math.max(6, (CAT[g] ? CAT[g].q : 5) * 3)) return; const x = q * (.7 + rnd() * .6); store.stock[g] = (store.stock[g] || 0) + x; M.stats.prodotto += x; }); return; }
      // in un'ora si fanno tante «mani» quante ne stanno (almeno una ogni due ore)
      store._prog = store._prog || {}; store._prog[rec.id] = (store._prog[rec.id] || 0) + 60 / rec.min;
      while (store._prog[rec.id] >= 1) {
        const u = canDo(store, rec); if (!u) { store._prog[rec.id] = 0; break; }
        store._prog[rec.id]--; Object.entries(u).forEach(([g, q]) => { store.stock[g] -= q; });
        Object.entries(rec.out).forEach(([g, q]) => { store.stock[g] = (store.stock[g] || 0) + q; M.stats.prodotto += q; }); M.stats.ricette++;
      }
    }
  }
  // gli ingredienti ai laboratori: da chi li produce, dalle botteghe che li vendono (all'ingrosso), e quello che viene da fuori lo porta la nave
  function supply(st) {
    const E = Ec.eco(st), shops = Object.values(E.shops), works = Object.values(E.work);
    shops.concat(works).filter(W => W.recipes).forEach(W => {
      const want = {};
      Object.keys(W.recipes).forEach(r => { const rec = RECIPES[r]; if (!rec || rec.npcOut) return; Object.entries(rec.in).forEach(([key, q]) => { const id = alts(key).find(x => (W.stock[x] || 0) >= q) || alts(key)[0]; want[id] = Math.max(want[id] || 0, q * 3); }); });
      Object.entries(want).forEach(([g, q]) => {
        if ((W.stock[g] || 0) >= q) return;
        const src = works.find(X => X !== W && (X.stock[g] || 0) >= 1 && !(X.recipes && Object.keys(X.recipes).some(r => RECIPES[r] && Object.keys(RECIPES[r].in).some(k => alts(k).includes(g)))))
          || shops.filter(X => X !== W && X.sells[g] && !X.black && !X.market && (X.stock[g] || 0) > Math.max(1, (CAT[g] ? CAT[g].q : 5) * .3)).sort((a, b) => b.stock[g] - a.stock[g])[0];
        if (!src) { W.missing = W.missing || {}; W.missing[g] = st.t; return; }
        const x = Math.min(q - (W.stock[g] || 0), Math.floor(src.stock[g] * (src.sells ? .5 : 1)) || 1); if (x < 1) return;
        src.stock[g] -= x; W.stock[g] = (W.stock[g] || 0) + x;
        if (Ec.HOOK.wholesale && W.t && src.t) Ec.HOOK.wholesale(st, src, W, g, x);
      });
    });
  }
  // la nave porta anche le materie prime ai laboratori (ferro, latta, carbone, stoffa, lievito…): le paga il laboratorio
  function shipInputs(st, share) {
    const E = Ec.eco(st), bought = {};
    Object.values(E.shops).concat(Object.values(E.work)).filter(W => W.recipes && !W.black).forEach(W => {
      (W.missing ? Object.keys(W.missing) : []).concat(Object.keys(W.recipes).flatMap(r => RECIPES[r] ? Object.keys(RECIPES[r].in).map(k => alts(k)[0]) : [])).forEach(g => {
        if (!CAT[g] || !(CAT[g].imp || ['carbone', 'ferro', 'latta', 'stoffa', 'farina', 'lievito', 'bottoni', 'lana', 'olio', 'sale', 'zucchero', 'uova', 'capi', 'rottami', 'legno', 'bottiglia_vuota', 'barattolo', 'passata', 'pomodori'].includes(g))) return;
        const q = Math.round(Math.max(0, 8 - (W.stock[g] || 0)) * share); if (q < 1) return;
        W.stock[g] = (W.stock[g] || 0) + q; if (W.missing) delete W.missing[g];
        bought[W.k] = (bought[W.k] || 0) + q * CAT[g].prezzo;
      });
    });
    if (Ec.HOOK.ship) Ec.HOOK.ship(st, bought, share);
  }
  // quello che una casa compra oltre al mangiare: legna e carbone (è inverno), sapone, candele, pile, ogni tanto vestiti e attrezzi
  const DEMAND = [['legna', .4], ['carbone', .25], ['petrolio', .06], ['carta_igienica', .12], ['pane_nero', .1], ['berretto', .008], ['sciarpa', .008], ['stivali', .006], ['sapone', .12], ['candele', .1], ['fiammiferi', .1], ['pile', .05], ['lampadine', .04], ['acqua', .25], ['vestiti', .015], ['maglione', .01], ['scarpe', .008], ['medicine', .03],
    ['detersivo', .05], ['caffe', .1], ['sigarette', .15], ['giornale', .2], ['vino', .15], ['olio', .08], ['sale', .04], ['zucchero', .05], ['bombola', .02], ['coperta', .01]];
  const TOOLJOB = [[/braccian|vignaiol/, 'pala'], [/boscaiol/, 'ascia'], [/carpent|falegnam/, 'sega'], [/fabbr/, 'martello'], [/sart/, 'ago_filo'], [/pescator/, 'canna'], [/cavator|minator/, 'piccone'], [/meccanic/, 'chiave_inglese']];
  function householdDay(st) {
    const E = Ec.eco(st), shops = Object.values(E.shops).filter(Sh => !Sh.black && !Sh.market);
    const seen = new Set();
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || n.dead || !P.homeT || n.jailedUntil > st.t || (P.money || 0) < 4 || P.age < 16) return;
      const hk = I.tkey(P.homeT); if (seen.has(hk)) return; seen.add(hk);   // una spesa per casa
      const list = DEMAND.filter(([g, pr]) => rnd() < pr * (P.money > 40 ? 1.2 : .7)).map(([g]) => g);
      const job = (P.job && (P.job.base || P.job.title)) || ''; const tj = TOOLJOB.find(([re]) => re.test(job)); if (tj && rnd() < .015) list.push(tj[1]);
      list.slice(0, 3).forEach(g => {
        const Sh = shops.filter(X => X.sells[g] && (X.stock[g] || 0) >= 1).sort((a, b) => dist(a.t.x, a.t.y, P.homeT.x, P.homeT.y) - dist(b.t.x, b.t.y, P.homeT.x, P.homeT.y))[0];
        if (!Sh) { E.missing[g] = (E.missing[g] || 0) + 1; if (rnd() < .2) I.note(st, n, `non si trova ${nm(g)} da nessuna parte`, 'bad', { w: .2, tag: 'scarsita' }); return; }
        // [commissioni] chi è in scena ci va davvero (a piedi, col pacco al ritorno); chi è lontano lo fa fuori scena
        const PO0 = typeof Popolo !== 'undefined' ? Popolo._ : null;
        if (PO0 && PO0.errand && PO0.ERRAND.compra && !P.errand && PO0.errand(st, n, { kind: 'compra', tgt: Sh.t, act: 'commissione', obj: 'bottega', label: `va a fare la spesa da ${Sh.label}`, secs: 10, mins: 20, data: { ids: [g] } })) return;
        if (P.near) return;
        const pr = Ec.buy(st, n, Sh.t, g, 1); if (pr === null) return;
        P.casa = P.casa || {}; P.casa[g] = (P.casa[g] || 0) + 1; S(st).stats.consumi++;
        // la legna e il carbone si bruciano, il sapone si consuma: in casa non si accumula all'infinito
        Object.keys(P.casa).forEach(k => { if (CAT[k] && (CAT[k].heat || CAT[k].eat) && P.casa[k] > 3) P.casa[k] = 3; });
      });
    });
  }
  // all'inizio i laboratori hanno un magazzino: due giri di ogni ricetta
  function prime(st) {
    const E = Ec.eco(st), M = S(st); if (M.primed) return; M.primed = true;
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || !P.job || !P.job.t) return; const jp = JOBPROD.find(([re, , lre]) => re.test(P.job.base || P.job.title || '') && (!lre || lre.test(P.job.t.label || ''))); if (!jp) return;
      const wt = P.job.t, k = I.tkey ? I.tkey(wt) : wt.label, Sh = Ec.shopAt(st, wt), W = E.work[k] = E.work[k] || { k, t: wt, label: wt.label, stock: {} }, store = Sh || W;
      store.recipes = store.recipes || {}; jp[1].forEach(r => { store.recipes[r] = 1; const rec = RECIPES[r]; if (!rec || rec.npcOut) return; Object.entries(rec.in).forEach(([key, q]) => { const g = alts(key)[0]; store.stock[g] = Math.max(store.stock[g] || 0, q * 3); }); });
    });
    // le persone hanno qualcosa in tasca e in casa (quello che si trova frugando e scambiando)
    st.npcs.forEach(n => { const P = n.pop; if (!P) return; P.inv = P.inv || {}; const job = (P.job && (P.job.base || P.job.title)) || '';
      if (rnd() < .5) P.inv.sigarette = (P.inv.sigarette || 0) + 1; if (rnd() < .3) P.inv.fiammiferi = 1; if (rnd() < .2) P.inv.pane = 1; if (rnd() < .15) P.inv.accendino = 1;
      const tj = TOOLJOB.find(([re]) => re.test(job)); if (tj && rnd() < .6) P.inv[tj[1]] = 1;
      if (/pescator/.test(job)) P.inv.sarde = 2; if (/fornai/.test(job)) P.inv.pane = 3; if (/allevator/.test(job)) { P.inv.uova = 1; P.inv.lana = 1; } if (/farmacist|infermier|medic/.test(job)) { P.inv.bende = 2; P.inv.medicine = 1; }
      if (/tipograf/.test(job)) { P.inv.carta = 1; P.inv.inchiostro = 1; } if (/saldator|meccanic/.test(job)) { P.inv.nastro = 1; P.inv.cavo = 1; }
      if (P.giro === 'ricettatore') { P.inv.orologio = 1; P.inv.radiolina = 1; P.inv.grimaldello = 1; } if (P.giro === 'trafficante') { P.inv.sigarette_contr = 3; P.inv.whisky = 1; } if (P.giro === 'ladro') P.inv.grimaldello = 1;
      if (n.cop) { P.inv.manette = 1; P.inv.gallette = 1; } });
  }

  // =====================================================================================================================
  // I PONTI CON GLI ALTRI MODULI
  // =====================================================================================================================
  const GENERE = { cibo: 'cibo', bevande: 'cibo', dispensa: 'cibo', combustibili: 'materia', edilizia: 'materia', rottami: 'materia', attrezzi: 'attrezzo', armi: 'attrezzo', valori: 'vizio', stampa: 'casa' };
  (function bridgeEconomy() {
    // le merci dell'economia diventano gli oggetti del catalogo (stessi id dove c'erano già)
    Object.keys(Ec.MERCI).forEach(k => { if (!CAT[k]) delete Ec.MERCI[k]; });
    Object.values(CAT).forEach(c => { Ec.MERCI[c.id] = [c.nome, c.prezzo || 1, c.ill ? 'clandestino' : (GENERE[c.cat] || 'casa'), c.q || 5]; });
    Ec.MERCI.poster[2] = 'clandestino'; Ec.MERCI.libretto[2] = 'clandestino';
    Ec.IMPORT.length = 0; IMPORT.forEach(g => Ec.IMPORT.push(g));
    Ec.SELL.length = 0; SHOPLIST.forEach(([ref, goods]) => { if (ref.startsWith('use:') ? G.BUILDINGS.some(b => b.use === ref.slice(4)) : PLACES[ref]) Ec.SELL.push([ref, goods.filter(g => CAT[g])]); });
    Ec.PROD.length = 0;   // la produzione la fanno le ricette (produceHour qui sotto)
  })();
  (function bridgeActions() {
    // le tasche: ogni oggetto del catalogo si può tenere in tasca (Azioni.ITEMS lo conosce), senza azioni «compra» sparse in giro
    Object.values(CAT).forEach(c => { if (!Az.ITEMS[c.id]) Az.ITEMS[c.id] = { id: c.id, name: c.nome, stuff: !c.tool }; else Az.ITEMS[c.id].name = Az.ITEMS[c.id].name || c.nome; });
    Object.assign(G.SEV, { furto: .45 }); Object.assign(G.NOISE, { furto: 4 }); Object.assign(G.NEG, { furto: 1 }); Object.assign(G.LABEL, { furto: 'Furto' });
  })();
  (function bridgeRisacca() {
    const X = RS.EXT;
    // le risorse astratte diventano categorie: «materiali» = assi, lamiere, mattoni…; quelle che sono già un oggetto (carta, benzina) restano se stesse
    Object.values(CAT).forEach(c => { if (!RS.RES[c.id]) RS.RES[c.id] = { name: c.nome, one: c.nome, cat: GROUPS[c.cat], syn: [c.nome], item: true }; });
    const val = (bag, res) => { if (!bag) return 0; if (RESOF[res]) return RESOF[res].reduce((s, [id, k]) => s + cnt(bag, id) * k, 0) + (CAT[res] || !bag[res] ? 0 : bag[res]); return cnt(bag, res); };
    const bags = (st, prefer) => { const out = []; if (prefer) out.push(prefer.stock); if (typeof Cantiere !== 'undefined' && Cantiere.bauli) Cantiere.bauli(st).forEach(B0 => { if (!out.includes(B0) && !(st.ris.bases || []).some(b => b.stock === B0)) out.push(B0); }); /* [cantiere] i bauli dei covi */ st.ris.bases.filter(b => b.alive && b !== prefer).forEach(b => out.push(b.stock)); out.push(st.ris.inv); if (st.player && st.player.inv) out.push(st.player.inv); return out; };
    X.resTotal = (st, res) => bags(st).reduce((s, b) => s + val(b, res), 0);
    // si prende il necessario partendo dagli oggetti che valgono meno per quella categoria
    X.resTake = (st, res, qty, prefer) => {
      if (X.resTotal(st, res) < qty - 1e-6) return false; let need = qty;
      for (const bag of bags(st, prefer)) {
        if (!RESOF[res]) { const k = Math.min(need, bag[res] || 0); if (k > 0) { sub(bag, res, k); need -= k; } }
        else { if (bag[res] && !CAT[res]) { const k = Math.min(need, bag[res]); sub(bag, res, k); need -= k; }
          RESOF[res].slice().sort((a, b) => (CAT[a[0]].prezzo / a[1]) - (CAT[b[0]].prezzo / b[1])).forEach(([id, k]) => { while (need > 1e-6 && cnt(bag, id) > 0) { sub(bag, id, 1); need -= k; } }); }
        if (need <= 1e-6) break;
      }
      return true;
    };
    // quello che arriva in astratto (un furto di «materiali», una spesa di «viveri») diventa roba vera
    const MIX = { materiali: ['assi', 'assi', 'lamiera', 'chiodi', 'travi', 'tubi', 'rete'], viveri: ['scatolame', 'pasta', 'pane', 'legumi', 'gallette', 'carne_scatola'], attrezzi: ['martello', 'cacciavite', 'pinze', 'piede', 'tronchesi'],
      radio: ['valvole', 'cavo', 'transistor', 'pile', 'stagno'], medicine: ['medicine', 'bende', 'garze', 'disinfettante'], mobili: ['branda', 'materasso', 'sedia', 'tavolo', 'coperta'], vernice: ['bomboletta', 'vernice'], merce: ['sigarette_contr', 'merce'] };
    X.concrete = (res, qty) => {
      if (CAT[res] && !MIX[res]) return { [res]: qty };
      const L0 = MIX[res]; if (!L0) return { [res]: qty }; const out = {}; let v = 0, i = 0;
      while (v < qty - 1e-6 && i++ < 60) { const id = pick(L0); out[id] = (out[id] || 0) + 1; v += CAT[id].resV || 1; }
      return out;
    };
    X.buildCost = (kind, id) => (BUILD[kind] && BUILD[kind][id]) || null;
    X.buildMiss = (st, cost, prefer) => { const P = bags(st, prefer); return Object.entries(cost).filter(([key, q]) => !alts(key).some(id => P.reduce((s, b) => s + cnt(b, id), 0) >= q)).map(([key, q]) => `${alts(key).map(nm).join(' o ')} ×${q}`); };
    X.buildTake = (st, cost, prefer) => { const P = bags(st, prefer); Object.entries(cost).forEach(([key, q]) => { const id = alts(key).find(x => P.reduce((s, b) => s + cnt(b, x), 0) >= q); if (id) poolTake(P, id, q); }); };
    X.labIn = { stamperia: { carta: 1, inchiostro: 1 }, falsari: { carta_bollata: 1, foto_tessera: 1 }, officina: { nastro: 1, pile: 1, cavo: 1, zucchero: 1 } };
    X.labOut = { stamperia: { volantini: 1 }, falsari: { documenti: 1 }, officina: { kit: 1 } };
    X.itemName = id => nm(id);
  })();

  // =====================================================================================================================
  // LE AZIONI DEL GIOCATORE (QUI, ADESSO)
  // =====================================================================================================================
  function here(st) {
    const p = p_(st), out = [], add0 = (id, label, arg, panel, bad) => out.push({ id: 'og_' + id, label, arg: arg === undefined ? null : arg, panel, bad: !!bad });
    if (st.over || p.vehicle) return out;
    // [bottino] frugare non è più un pulsante: la roba è un oggetto in scena e si clicca (bottino.js)
    const sts = stationsHere(st); if (sts.size || nearBase(st)) add0('lavora', `Lavora qui (${[...sts].map(s => STATIONS[s] ? STATIONS[s].nome : s).join(', ') || 'a mano'})`, null, 'lavora');
    const ex = Object.values(RECIPES).filter(r => r.place && placeOk(st, r)); if (ex.length) add0('lavora', ex.map(r => cap(r.nome)).join(' · '), null, 'lavora');
    const n = st.npcs.filter(k => !k.dead && k.pop && !k.inside && !k.aggro && !(k.cop && G.wantedLevel(st) > 0) && dist(k.x, k.y, p.x, p.y) < 2.6).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
    if (n && !p.indoor) add0('scambia', `Scambia con ${n.first}`, n.id, 'scambia');
    const v = st.npcs.filter(k => !k.dead && k.pop && !k.inside && !(k.stun > 0) && !k.aggro && dist(k.x, k.y, p.x, p.y) < 1.4).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
    if (v && !p.indoor) add0('borseggia', `Alleggerisci ${v.first} (borseggio)`, v.id, null, true);
    return out;
  }
  function act(st, id, arg, ex) {
    ex = ex || {}; const k = String(id).replace(/^og_/, '');
    switch (k) {
      case 'compra': return buy(st, arg, ex.g, ex.q, ex.mode);
      case 'vendi': return sell(st, arg, ex.g, ex.q);
      case 'fai': return craft(st, arg, ex.q);
      case 'usa': return consume(st, arg);
      case 'butta': { const b = inv(st), q = Math.min(ex.q || 1, cnt(b, arg)); if (!q) return R_(false, 'Non ce l\'hai.'); sub(b, arg, q); const B = nearBase(st); if (B) { add(B.stock, arg, q); return R_(true, `Lasci ${nm(arg)}${q > 1 ? ' ×' + q : ''} in ${B.name}.`); } return R_(true, `Butti ${nm(arg)}.`); }
      case 'deposita': { const B = nearBase(st); if (!B) return R_(false, 'Qui non c\'è una base.'); const b = inv(st), list = arg === '*' ? Object.keys(b).filter(x => !CAT[x] || !CAT[x].tool) : [arg]; let n0 = 0; list.forEach(g => { const q = arg === '*' ? cnt(b, g) : Math.min(ex.q || 1, cnt(b, g)); if (q > 0) { sub(b, g, q); add(B.stock, g, q); n0 += q; } }); return R_(!!n0, n0 ? `Lasciati ${n0} oggetti in ${B.name}.` : 'Non hai niente da lasciare.'); }
      case 'preleva': { const B = nearBase(st); if (!B) return R_(false, 'Qui non c\'è una base.'); const q = Math.min(ex.q || 1, cnt(B.stock, arg)); if (!q) return R_(false, 'In base non c\'è.'); sub(B.stock, arg, q); const left = givePlayer(st, arg, q); if (left) add(B.stock, arg, left); return R_(q > left, q > left ? `Prendi ${nm(arg)}${q - left > 1 ? ' ×' + (q - left) : ''}.` : 'Non ti sta addosso.'); }
      case 'apri': { const C = contByRef(st, arg); if (!C) return R_(false, 'Non c\'è niente da frugare qui.'); return openC(st, C); }
      case 'prendi': { const C = contByRef(st, arg); if (!C) return R_(false, 'Non c\'è niente da frugare qui.'); if (C.locked) return R_(false, 'È chiuso.'); const r0 = takeFrom(st, C, ex.g, ex.q); pickGone(st, C); return r0; }
      case 'prendi_tutto': { const C = contByRef(st, arg); if (!C || C.locked) return R_(false, 'Non si può.'); const msgs = []; for (const v of contView(st, C).filter(v => v.src !== 'shop' || ex.shop)) { const r = takeFrom(st, C, v.id, v.q); if (r.ok) msgs.push(r.msg); if (/ti ha visto/.test(r.msg)) break; } pickGone(st, C); return R_(!!msgs.length, msgs.join(' ') || 'Non ti sta più niente addosso.'); }
      case 'posa': { const C = contByRef(st, arg); if (!C) return R_(false, 'Non qui.'); return putInto(st, C, ex.g, ex.q); }
      case 'scambia': return barter(st, arg, ex);
      case 'cerca': return search(st);
      case 'borseggia': return pickpocket(st, arg);
      default: return R_(false, 'Non si può.');
    }
  }
  const R_ = (ok, msg, x) => Object.assign({ ok, msg: msg || '' }, x || {});
  // [roba] la roba che si porta via (un'arma per terra, le sigarette sul tavolo, gli snack): presa tutta, sparisce dalla stanza
  const PICK = /^(ia_pistola|ia_lupara|ia_mitra|ia_coltello|ia_lupara_muro|ia_sigarette|ia_birre|ia_vodka|ia_bottiglia_vino|ia_barattoli|ia_vasetti|nx_)/;
  function pickGone(st, C) {
    if (!C || C.kind !== 'furn' || !PICK.test(C.fid || '') || contView(st, C).length) return;
    const m = /^b(\d+):(\d+):(\d+)$/.exec(C.key || ''); if (!m) return;
    const F = INT.layout(G.BUILDINGS[+m[1]]).floors[+m[2]], o = F && F.furn[+m[3]]; if (!o || o.taken) return; o.taken = true;
    if (typeof window !== 'undefined' && window.__pv && window.__pv.R && window.__pv.R.__ed) window.__pv.R.__ed.rebuildIndoor();
  }
  const openUI = (panel, arg) => { if (typeof OggettiUI !== 'undefined') OggettiUI.open(panel, arg); };
  (function hookUI() {
    const h0 = RS.here, a0 = RS.playerAct;
    RS.here = st => { const o = h0(st) || []; try { return o.concat(here(st).map(a => ({ id: a.id, label: a.label, arg: a.arg, bad: a.bad }))); } catch (e) { return o; } };
    RS.playerAct = (st, id, arg, extra) => {
      if (!String(id).startsWith('og_')) return a0(st, id, arg, extra);
      const l = here(st), a = l.find(x => x.id === id && x.arg === arg) || l.find(x => x.id === id);
      if (a && a.panel) { openUI(a.panel, arg); return { ok: true, msg: '' }; }
      return act(st, id, arg, extra);
    };
    const pa0 = Az.playerActions;
    Az.playerActions = function (st) {
      const o = (pa0.apply(this, arguments) || []).filter(a => !/^compra_|^prendi_(pala|carriola)$|^fruga$/.test(a.id || ''));
      try { here(st).forEach(a => o.push({ id: a.id, label: a.label, off: '', run: () => { if (a.panel) { openUI(a.panel, a.arg); return ''; } return act(st, a.id, a.arg).msg; } })); } catch (e) { }
      return o;
    };
    // le Tasche mostrano tutto il catalogo: anche la roba (non solo gli attrezzi)
    const pi0 = Az.playerItems;
    Az.playerItems = function (st) { const l = pi0.apply(this, arguments) || []; l.forEach(x => { if (CAT[x.id]) { x.cat = CAT[x.id].cat; x.peso = CAT[x.id].peso; x.eat = !!CAT[x.id].eat; } }); return l; };
  })();

  // =====================================================================================================================
  // IL TEMPO
  // =====================================================================================================================
  function hourly(st, h, wd) {
    if (!S(st).primed) { prime(st); luoghi(st); scatterInit(st); cargoArrive(st); }
    st.npcs.forEach(n => { if (n.pop && n.pop.job && !n.pop.post) assignPost(st, n); });
    produceHour(st);
    if (h === 4) cachesTick(st);
    if (h % 2 === 0) supply(st);
    if (h === 17) householdDay(st);
    if ((wd === 0 || wd === 3) && h === 6) { const E = Ec.eco(st); shipInputs(st, E.blocked ? 0 : 1); if (!E.blocked) cargoArrive(st); }
    thirstTick(st, 1);
    const M = S(st); if (M.calore) M.calore = clamp(M.calore - .08, 0, 1);
  }
  function install() {
    const H = G.HOOKS; if (H.__oggetti) return; H.__oggetti = true;
    const s0 = H.step;
    H.step = (st, dt) => {
      if (s0) s0(st, dt);
      if (!st.pop) return;
      const M = S(st), hm = Math.floor(st.t / 60);
      if (M.hour !== hm) { M.hour = hm; hourly(st, hm % 24, Po.weekday(st.t)); }
      postsStep(st);
      if (!(M._lk > st.clock - 1)) { M._lk = st.clock || 0; const w = weightOf(inv(st)), c = capacity(st); st.player.loadK = w <= c ? 1 : clamp(1 - (w - c) / (c * 1.5), .35, 1); }
    };
  }
  install();

  // =====================================================================================================================
  // PER IL PANNELLO E PER LE PROVE
  // =====================================================================================================================
  function pocketsView(st) {
    const b = inv(st), W = S(st).wear;
    return { peso: r1(weightOf(b)), cap: capacity(st), money: Math.floor(st.player.money), sete: st.me && st.me.need ? r1(st.me.need.sete || 0) : 0, fame: st.me && st.me.need ? r1(st.me.need.fame || 0) : 0,
      items: Object.keys(b).filter(k => cnt(b, k) > 0).map(k => { const c = CAT[k] || { nome: k, cat: 'altro', peso: .5 }; return { id: k, nome: c.nome, cat: c.cat, catLabel: GROUPS[c.cat] || 'Altro', q: cnt(b, k), peso: c.peso, eat: !!c.eat, tool: c.tool ? Math.round(100 * (W[k] === undefined ? c.tool : W[k]) / c.tool) : null, ill: !!c.ill, st: c.st || null }; }).sort((a, b) => a.cat.localeCompare(b.cat) || a.nome.localeCompare(b.nome)),
      base: nearBase(st) ? { name: nearBase(st).name, items: Object.keys(nearBase(st).stock).filter(k => cnt(nearBase(st).stock, k) > 0).map(k => ({ id: k, nome: nm(k), q: cnt(nearBase(st).stock, k) })) } : null };
  }
  function frugaView(st, ref) { const C = contByRef(st, ref); if (!C) return null; return { ref, label: C.label, locked: C.locked, need: C.locked ? alts(C.need || LOCKED[C.fid]).map(nm).join(' o ') : '', kind: C.kind, items: C.locked ? [] : contView(st, C), mine: pocketsView(st) }; }
  function report(st) {
    const E = Ec.eco(st), M = S(st), shops = Object.values(E.shops);
    const empty = []; shops.forEach(Sh => Object.keys(Sh.sells).forEach(g => { if (!Sh.market && (Sh.stock[g] || 0) < 1) empty.push(`${nm(g)} (${Sh.label})`); }));
    const work = Object.values(E.work).concat(shops).filter(W => W.recipes).map(W => `${W.label}: ${Object.entries(W.stock).filter(([, v]) => v >= 1).map(([g, v]) => `${nm(g)} ${Math.floor(v)}`).slice(0, 6).join(', ')}${W.missing && Object.keys(W.missing).length ? ` — manca ${Object.keys(W.missing).map(nm).join(', ')}` : ''}`);
    return { stats: M.stats, vuoti: empty.length, esempiVuoti: empty.slice(0, 12), laboratori: work, mancanze: E.missing };
  }
  return { CAT, GROUPS, RECIPES, STATIONS, FURN2ST, SHOPLIST, LOOT, ROOM_LOOT, SPOT_LOOT, BUILD, JOBPROD, S, nm, inv, givePlayer, weightOf, capacity, stationsHere, containersHere, recipesView, craft, consume,
    luoghi, luogoHere, staffIndoor, clerk, isOpen, caught, passTime, wearTools, pools, search, pickpocket, scatterInit, lootables, TIERS, tier,
    counter, buy, sell, barterView, barter, frugaView, contByRef, pocketsView, here, act, report, produceHour, supply, householdDay, prime };
})();
if (typeof module !== 'undefined') module.exports = Oggetti;
