/* Porto Vecchio — Il Cantiere del covo (come il laboratorio di Fallout 4).
   Y: entri nel cantiere del covo dove sei (la tua casa, una base della Risacca, o un posto che reclami). La visuale sale, in basso la barra:
   TERRENO (disbosca, cava, spiana), SOTTOTERRA (botola, cunicolo, discesa, stanza, bunker), STRUTTURE (muri, recinti, sacchi, tettoie, capanni, baracche, pavimenti, porte),
   ARREDI (letti, tavoli, sedie, scaffali, stufe, lampade, tappeti, bandiere), POSTAZIONI (banco delle armi, cucina, focolare, laboratorio tessile, stamperia, radio,
   forgia, banco da lavoro, falegname, infermeria, camera oscura, alambicco).
   Clic: piazzi (la sagoma è verde se si può, rossa se no). Rotella o R: giri. Tasto destro: lasci perdere. Clic su una cosa già messa: Sposta, Gira, Togli (ti torna la roba).
   Le cose si pagano in materiali (dalle tasche e dalle scorte delle basi), oppure se ce l'hai in tasca la piazzi direttamente (una sedia, un fornello, la macchina da cucire).
   Le postazioni sono oggetti veri: si animano (il fuoco, la radio che lampeggia, il rullo della stamperia, l'ago che va), e cliccandole fuori dal cantiere
   ci vai e si apre il loro banco. Il banco delle armi monta anche le modifiche alle armi (canna, mirino, caricatore, silenziatore, calcio).
   Stato: st.covo = { covi, obj, mods, jobs }. Le strutture rendono solide le caselle (e le restituiscono quando le togli).
   [sottosuolo] IN CITTÀ si costruisce solo al chiuso: dentro la stanza del covo (arredi, casse, deposito armi, postazioni) o sotto terra.
   FUORI CITTÀ il lavoro pesante lo fa la banda: disboscare, cavare, spianare e tirare su case, garage, capanni, baracche e torrette
   diventano lavori segnati che i membri liberi della Risacca vanno a fare (la legna e le pietre finiscono nel baule del covo).
   Senza banda lo fai da te, subito. Il GARAGE ha il portone largo; l'OFFICINA DEL GARAGE potenzia coi materiali il mezzo parcheggiato
   accanto (motore, assetto, nitro, corazza) e lo ripara.
   [survival] IL CAMPO si pianta dove vuoi (fuori dai covi): un cerchio di picchetti. Dentro si fa tutto come in un survival:
   ORTO E ALBERI (zappa, semina patate/pomodori/cipolle/orzo, annaffia col secchio, aspetti che cresca, raccogli; pianta alberelli che
   diventano alberi veri), PEZZI DA ASSEMBLARE che si uniscono da soli (muri di assi, lamiera, mattoni, pietra, finestre, porte,
   cancelli, muretti, recinti: tenendo premuto e trascinando si posa la fila), TETTI a caselle (si aprono quando ci sei sotto),
   PAVIMENTI. SOTTO TERRA gli scavi da edificio (stanza, cantina, sala, bunker) si piazzano come un progetto e si aprono a poco a poco
   (tu, se sei vicino con la pala, e la banda). Stato in più: st.covo.crops, st.covo.digs. */
var Cantiere = (function () {
  'use strict';
  const PV = () => window.__pv, ST = () => PV() && PV().st, Gm = () => (PV() && PV().G) || Game, R = () => PV() && PV().R;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const O = () => Oggetti, TS = () => Gm().TS, T = () => Gm().T;
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';

  // =====================================================================================================================
  // CATALOGO
  // =====================================================================================================================
  // fp: ingombro in caselle [larghe, profonde] (si aggancia alla griglia); senza fp si piazza libero (passo di 25 cm)
  // solid: 'pieno' (tutte le caselle), 'bordo' (il perimetro tranne la porta); st: postazione di oggetti.js; anim; menu: banco dedicato
  const CATS = [['terreno', 'Terreno'], ['orto', 'Orto e alberi'], ['energia', 'Corrente'], ['sotto', 'Sottoterra'], ['baracche', 'Baracche'], ['strutture', 'Pezzi'], ['arredi', 'Arredi'], ['postazioni', 'Postazioni'], ['difese', 'Difese']];
  const B = [
    // terreno: si fa sulla casella sotto il puntatore
    { id: 'disbosca', cat: 'terreno', nome: 'Disbosca', desc: 'Abbatte alberi e cespugli. Ti dà legna.', tool: 'ascia|sega', op: 'disbosca' },
    { id: 'cava', cat: 'terreno', nome: 'Cava', desc: 'Spacca roccia e pareti. Ti dà pietre.', tool: 'piccone', op: 'cava' },
    { id: 'spiana', cat: 'terreno', nome: 'Spiana', desc: 'Livella il terreno attorno (3×3).', tool: 'pala', op: 'spiana' },
    { id: 'sgombra', cat: 'terreno', nome: 'Sgombra e spiana', desc: 'Pennello largo: alberi giù, cespugli via, terra battuta alla quota da dove parti. Trascina.', tool: 'ascia|sega|pala|zappa', op: 'sgombra', brush: 2 },
    { id: 'livella', cat: 'terreno', nome: 'Livella', desc: 'Pennello: porta il suolo alla quota da dove parti a trascinare.', tool: 'pala|zappa', op: 'livella', brush: 2 },
    { id: 'sentiero', cat: 'terreno', nome: 'Sentiero', desc: 'Terra battuta, una casella alla volta: trascina per fare i vicoli del campo.', tool: 'pala|zappa', op: 'sterra' },
    { id: 'sterra', cat: 'terreno', nome: 'Sterra', desc: 'Toglie l\'erba: terra battuta.', tool: 'pala|zappa', op: 'sterra' },
    // [survival] orto e alberi: si fanno subito, sulla casella sotto il puntatore
    { id: 'ara', cat: 'orto', nome: 'Zappa la terra', desc: 'Un solco d\'orto: ci si semina.', tool: 'zappa|pala', op: 'ara' },
    { id: 'semina_patate', cat: 'orto', nome: 'Semina patate', desc: 'Due giorni bagnate: tre sacchetti.', op: 'semina', seed: 'patate', cost: { patate: 1 } },
    { id: 'semina_pomodori', cat: 'orto', nome: 'Pianta pomodori', desc: 'Coi tutori. Due giorni bagnati.', op: 'semina', seed: 'pomodori', cost: { pomodori: 1 } },
    { id: 'semina_cipolle', cat: 'orto', nome: 'Pianta cipolle', desc: 'Un giorno e mezzo bagnate.', op: 'semina', seed: 'cipolle', cost: { cipolle: 1 } },
    { id: 'semina_orzo', cat: 'orto', nome: 'Semina orzo', desc: 'Diventa d\'oro. Un giorno e mezzo.', op: 'semina', seed: 'orzo', cost: { orzo: 1 } },
    { id: 'innaffia', cat: 'orto', nome: 'Annaffia', desc: 'Bagna nove caselle per un giorno. Senz\'acqua non cresce.', tool: 'secchio|tanica_acqua|annaffiatoio', op: 'innaffia' },
    { id: 'raccogli', cat: 'orto', nome: 'Raccogli', desc: 'Quando è maturo. Trascina per raccogliere una fila.', op: 'raccogli' },
    { id: 'albero', cat: 'orto', nome: 'Pianta un alberello', desc: 'Una talea: in due giorni è un albero vero (e si può tagliare).', tool: 'zappa|pala', op: 'albero', cost: { legna: 1 } },
    // [survival] la corrente del campo: chi la fa (pannelli di giorno, pala col vento, generatore a benzina) e chi la usa (luci, radio, officina…)
    { id: 'pannello_solare', cat: 'energia', nome: 'Pannello solare', desc: '+2 di giorno, niente di notte.', fp: [1, 1], cost: { vetro: 2, lamiera: 1, cavo: 2, tubi: 1 }, mk: 'solare', pow: 2, sun: 1, out: 1 },
    { id: 'pala_eolica', cat: 'energia', nome: 'Pala eolica', desc: '+2 giorno e notte; col vento gira di più.', fp: [1, 1], solid: 'pieno', cost: { tubi: 4, lamiera: 3, cavo: 2, motore_el: 1 }, mk: 'eolica', pow: 2, out: 1, anim: 'pale' },
    { id: 'generatore_campo', cat: 'energia', nome: 'Generatore', desc: '+5. Beve una tanica di benzina dal baule ogni sei ore.', cost: { motore_el: 1, lamiera: 2, benzina: 1 }, pz: 'generatore', anim: 'ventola', pow: 5, fuel: 'benzina' },
    { id: 'batterie', cat: 'energia', nome: 'Banco di batterie', desc: 'Tiene la corrente avanzata di giorno per la notte.', cost: { batteria_auto: 3, cavo: 2, assi: 2 }, mk: 'batterie', store: 0, bat: 30 },
    { id: 'quadro', cat: 'energia', nome: 'Quadro elettrico', desc: 'Interruttori e fusibili: mostra quanta corrente c\'è.', cost: { cavo: 2, lamiera: 1, lampadine: 1 }, mk: 'quadro', anim: 'led' },
    // sottoterra: si scava dove sei (e verso dove guardi)
    { id: 'botola', cat: 'sotto', nome: 'Botola', desc: 'Apre un pozzo dove sei. Da fuori resta una botola.', tool: 'pala|piccone', op: 'botola' },
    { id: 'cunicolo', cat: 'sotto', nome: 'Cunicolo', desc: 'Sotto terra: scava avanti, in piano.', tool: 'pala|piccone', op: 'cunicolo' },
    { id: 'discesa', cat: 'sotto', nome: 'Discesa', desc: 'Sotto terra: scava avanti, scendendo.', tool: 'pala|piccone', op: 'discesa' },
    { id: 'stanza', cat: 'sotto', nome: 'Stanza', desc: 'Sotto terra: allarga a una stanza 3×3.', tool: 'pala|piccone', op: 'stanza' },
    { id: 'bunker', cat: 'sotto', nome: 'Bunker', desc: 'Sotto terra: una sala 5×5 puntellata.', tool: 'pala|piccone', op: 'bunker', cost: { travi: 4, assi: 6 } },
    { id: 'uscita', cat: 'sotto', nome: 'Uscita', desc: 'Sotto terra: apre una botola sopra di te.', tool: 'pala|piccone', op: 'uscita' },
    // [survival] gli scavi da edificio: si piazzano come un progetto, accanto a quello che è già scavato, e si aprono a poco a poco
    { id: 'scavo_cantina', cat: 'sotto', nome: 'Cantina', desc: 'Scavo da edificio 4×2, armato di legno.', fp: [4, 2], dig: 2, tool: 'pala|piccone', cost: { travi: 2 } },
    { id: 'scavo_stanza', cat: 'sotto', nome: 'Stanza scavata', desc: 'Scavo da edificio 3×3, armato di legno.', fp: [3, 3], dig: 2, tool: 'pala|piccone', cost: { travi: 3 } },
    { id: 'scavo_sala', cat: 'sotto', nome: 'Sala grande', desc: 'Scavo da edificio 5×4, coi pilastri.', fp: [5, 4], dig: 2, tool: 'pala|piccone', cost: { travi: 6, assi: 4 } },
    { id: 'scavo_bunker', cat: 'sotto', nome: 'Bunker di cemento', desc: 'Scavo da edificio 5×5, gettato in cemento.', fp: [5, 5], dig: 6, tool: 'pala|piccone', cost: { travi: 6, cemento: 6, ferro: 2 } },
    // strutture
    { id: 'muro_assi', cat: 'strutture', nome: 'Muro di assi', fp: [1, 1], solid: 'pieno', cost: { assi: 4, chiodi: 1 }, mk: 'muro', col: '#7a5634', wall: 1 },
    { id: 'muro_lamiera', cat: 'strutture', nome: 'Muro di lamiera', fp: [1, 1], solid: 'pieno', cost: { lamiera: 2, chiodi: 1 }, mk: 'muro', col: '#7a8088', wall: 1 },
    { id: 'muro_mattoni', cat: 'strutture', nome: 'Muro di mattoni', fp: [1, 1], solid: 'pieno', cost: { mattoni: 6, malta: 1 }, mk: 'muro', col: '#9a5a44', wall: 1 },
    { id: 'muro_pietra', cat: 'strutture', nome: 'Muro di pietra', fp: [1, 1], solid: 'pieno', cost: { pietre: 6, malta: 1 }, mk: 'muro', col: '#8a8478', wall: 1 },
    { id: 'finestra', cat: 'strutture', nome: 'Finestra', desc: 'Un pezzo di muro con la finestra (va in fila coi muri).', fp: [1, 1], solid: 'pieno', cost: { assi: 3, vetro: 1, chiodi: 1 }, mk: 'muro', win: 1, col: '#c8b898', wall: 1 },
    { id: 'muro_basso', cat: 'strutture', nome: 'Muretto', desc: 'A mezza altezza: si vede oltre.', fp: [1, 1], solid: 'pieno', cost: { pietre: 3, malta: 1 }, mk: 'muro', low: 1, col: '#9a948a', wall: 1 },
    { id: 'porta', cat: 'strutture', nome: 'Porta', fp: [1, 1], cost: { assi: 3, cerniere: 1 }, mk: 'porta', col: '#6a4a2c', wall: 1 },
    { id: 'cancello', cat: 'strutture', nome: 'Cancello', desc: 'Si passa: va in fila coi recinti.', fp: [1, 1], cost: { assi: 3, cerniere: 1 }, mk: 'cancello', col: '#8a6a44', wall: 1, low: 1 },
    { id: 'tetto_coppi', cat: 'strutture', nome: 'Tetto di coppi', desc: 'Una casella di tetto: si mette sopra i muri e le stanze. Si apre quando ci sei sotto.', fp: [1, 1], layer: 'tetto', cost: { mattoni: 3, travi: 1 }, mk: 'tetto', col: '#a8483a' },
    { id: 'tetto_lamiera', cat: 'strutture', nome: 'Tetto di lamiera', desc: 'Una casella di tetto di lamiera ondulata.', fp: [1, 1], layer: 'tetto', cost: { lamiera: 1, travi: 1 }, mk: 'tetto', col: '#7a8088' },
    { id: 'pav_pietra', cat: 'strutture', nome: 'Pavimento di pietra', fp: [1, 1], layer: 'pav', cost: { pietre: 3 }, mk: 'pavimento', col: '#9a948a' },
    { id: 'recinto', cat: 'strutture', nome: 'Recinto', fp: [1, 1], solid: 'pieno', cost: { assi: 2, chiodi: 1 }, mk: 'recinto', col: '#8a6a44', wall: 1, low: 1 },
    { id: 'pavimento', cat: 'strutture', nome: 'Pavimento di assi', fp: [1, 1], layer: 'pav', cost: { assi: 3 }, mk: 'pavimento', col: '#8a6238' },
    { id: 'tettoia', cat: 'strutture', nome: 'Tettoia', fp: [2, 2], cost: { assi: 6, travi: 4, lamiera: 2 }, mk: 'tettoia', col: '#6a5a4a' },
    { id: 'capanno', cat: 'strutture', nome: 'Capanno', fp: [3, 3], solid: 'bordo', big: 50, cost: { assi: 16, travi: 6, chiodi: 3, lamiera: 3 }, mk: 'capanno', col: '#7a5634' },
    { id: 'baracca', cat: 'strutture', nome: 'Baracca di lamiera', fp: [3, 2], solid: 'bordo', big: 40, cost: { lamiera: 8, travi: 4, chiodi: 2 }, mk: 'capanno', col: '#7a8088' },
    // [survival] LE BARACCHE del campo nella foresta: una per una diverse (colori, toppe, veranda, un po' storte), un piano solo
    { id: 'bohio', cat: 'baracche', nome: 'Bohío', desc: 'La capanna cubana: pali, assi, tetto alto di foglie di palma.', fp: [3, 2], solid: 'bordo', big: 60, cost: { travi: 6, assi: 10, legna: 6 }, sh: 'bohio' },
    { id: 'baracca_colori', cat: 'baracche', nome: 'Baracca di lamiere', desc: 'Lamiere e assi di recupero, ognuna del suo colore. Tettoia davanti.', fp: [2, 2], solid: 'bordo', big: 40, cost: { lamiera: 5, assi: 4, chiodi: 2 }, sh: 'lamiere' },
    { id: 'palafitta', cat: 'baracche', nome: 'Palafitta', desc: 'Sui pali, contro il fango e le bisce: scaletta e ballatoio.', fp: [3, 3], solid: 'pieno', big: 80, cost: { travi: 10, assi: 14, legna: 4, chiodi: 3 }, sh: 'palafitta' },
    { id: 'capanna_tonda', cat: 'baracche', nome: 'Capanna tonda', desc: 'Muro di fango e canne, tetto a cono di paglia.', fp: [2, 2], solid: 'bordo', big: 45, cost: { legna: 8, pietre: 4, stoffa: 1 }, sh: 'tonda' },
    { id: 'comando', cat: 'baracche', nome: 'Casa del comando', desc: 'La baracca più grande: veranda, bandiera, antenna, il cartello.', fp: [4, 3], solid: 'bordo', big: 110, cost: { travi: 10, assi: 18, lamiera: 4, chiodi: 4, cavo: 1 }, sh: 'comando' },
    { id: 'infermeria_campo', cat: 'baracche', nome: 'Infermeria da campo', desc: 'Una tenda grande con la croce rossa. Vale come infermeria.', fp: [3, 2], solid: 'bordo', big: 30, cost: { stoffa: 8, corda: 2, tubi: 4 }, sh: 'infermeria', st: 'tavolo_medico' },
    { id: 'ramada', cat: 'baracche', nome: 'Ramada della cucina', desc: 'Il tetto di palma sui pali, il focolare, il tavolo lungo. Vale come cucina.', fp: [3, 2], big: 30, cost: { travi: 6, legna: 6, assi: 4, pietre: 4 }, sh: 'ramada', st: 'cucina', anim: 'fuoco' },
    { id: 'torretta_bambu', cat: 'baracche', nome: 'Torretta di bambù', desc: 'Si vede la strada da lontano.', fp: [1, 1], solid: 'pieno', big: 30, cost: { legna: 8, corda: 2, assi: 2 }, sh: 'torretta' },
    { id: 'latrina', cat: 'baracche', nome: 'Latrina', desc: 'Il casotto in fondo al campo.', fp: [1, 1], solid: 'pieno', cost: { assi: 4, lamiera: 1 }, sh: 'latrina' },
    { id: 'cisterna', cat: 'baracche', nome: 'Cisterna d\'acqua', desc: 'Raccoglie la pioggia: con la cisterna nel campo si annaffia senza secchio.', fp: [1, 1], solid: 'pieno', cost: { lamiera: 3, tubi: 2, travi: 2 }, sh: 'cisterna', water: 1 },
    { id: 'amaca', cat: 'baracche', nome: 'Amaca', desc: 'Tra due pali. Ci si dorme.', cost: { stoffa: 2, corda: 2, legna: 2 }, sh: 'amaca', sleep: 1 },
    { id: 'stendino', cat: 'baracche', nome: 'Panni stesi', desc: 'Un filo tra due pali, i panni di tutti.', cost: { corda: 1, stoffa: 2, legna: 2 }, sh: 'stendino' },
    { id: 'striscione', cat: 'baracche', nome: 'Striscione', desc: '«LA TERRA A CHI LA LAVORA», dipinto a mano.', cost: { stoffa: 3, legna: 2 }, sh: 'striscione' },
    { id: 'falo', cat: 'baracche', nome: 'Fuoco del campo', desc: 'Pietre in cerchio e tronchi per sedersi.', cost: { pietre: 6, legna: 4 }, sh: 'falo', st: 'cucina', anim: 'fuoco' },
    { id: 'casa', cat: 'strutture', nome: 'Casetta', desc: 'Quattro muri, il tetto di coppi, la porta. La tirano su in due.', fp: [4, 3], solid: 'bordo', big: 90, cost: { mattoni: 20, malta: 4, travi: 6, assi: 8, cemento: 2, cerniere: 1 }, mk: 'casa', col: '#d8c8a8' },
    { id: 'garage', cat: 'strutture', nome: 'Garage', desc: 'Portone largo: ci entra la macchina. Dentro, l\'officina.', fp: [4, 4], solid: 'bordo', door: 'largo', big: 100, cost: { lamiera: 10, travi: 8, bulloni: 4, cemento: 2 }, mk: 'garage', col: '#8a8e94' },
    { id: 'tenda', cat: 'strutture', nome: 'Tenda', desc: 'L\'accampamento: ci si dorme.', fp: [2, 2], cost: { stoffa: 4, corda: 1, tubi: 2 }, mk: 'tenda', col: '#6a6a4a', sleep: 1, out: 1 },
    { id: 'lampione', cat: 'strutture', nome: 'Lampione a batteria', cost: { tubi: 1, lampadine: 1, batteria_auto: 1 }, mk: 'lampione', anim: 'luce' },
    { id: 'bandiera', cat: 'strutture', nome: 'Bandiera della Risacca', cost: { stoffa: 2, tubi: 1 }, mk: 'bandiera', anim: 'bandiera' },
    // arredi (si piazzano liberi; se ce l'hai in tasca non costano niente)
    { id: 'branda', cat: 'arredi', nome: 'Branda', item: 'branda', cost: { assi: 2, stoffa: 2 }, kit: 'bedSingle', sleep: 1 },
    { id: 'letto', cat: 'arredi', nome: 'Letto', item: 'materasso', cost: { assi: 4, stoffa: 3, materasso: 1 }, kit: 'bedDouble', sleep: 1 },
    { id: 'tavolo', cat: 'arredi', nome: 'Tavolo', item: 'tavolo', cost: { assi: 4, chiodi: 1 }, kit: 'desk' },
    { id: 'sedia', cat: 'arredi', nome: 'Sedia', item: 'sedia', cost: { assi: 2, chiodi: 1 }, kit: 'chair' },
    { id: 'panca', cat: 'arredi', nome: 'Panca', cost: { assi: 3, chiodi: 1 }, kit: 'bench' },
    { id: 'scaffale', cat: 'arredi', nome: 'Scaffale', item: 'scaffale', cost: { assi: 5, chiodi: 2 }, kit: 'bookcaseOpen' },
    { id: 'armadio', cat: 'arredi', nome: 'Armadio', cost: { assi: 6, cerniere: 1 }, kit: 'bookcaseClosedWide' },
    { id: 'appendiabiti', cat: 'arredi', nome: 'Attaccapanni', cost: { assi: 1 }, kit: 'coatRackStanding' },
    { id: 'tappeto', cat: 'arredi', nome: 'Tappeto', cost: { stoffa: 3 }, mk: 'tappeto', col: '#7a2e2a' },
    { id: 'lampada', cat: 'arredi', nome: 'Lampada a petrolio', item: 'lampada_petrolio', cost: { latta: 1, petrolio: 1 }, mk: 'lampada', anim: 'luce' },
    { id: 'stufa', cat: 'arredi', nome: 'Stufa a legna', item: 'stufa', cost: { lamiera: 3, tubo_stufa: 1 }, st: 'stufa', stm: 'st_stufa', anim: 'fuoco' },
    { id: 'barile_fuoco', cat: 'arredi', nome: 'Barile col fuoco', cost: { latta: 2, legna: 2 }, mk: 'barile', anim: 'fuoco' },
    { id: 'cassa', cat: 'arredi', nome: 'Cassa', item: 'casse', cost: { assi: 3 }, kit: 'cardboardBoxClosed' },
    { id: 'castello', cat: 'arredi', nome: 'Letto a castello', cost: { tubi: 4, materasso: 2, coperta: 2 }, pz: 'castello', sleep: 1 },
    { id: 'armadietti', cat: 'arredi', nome: 'Armadietti', cost: { lamiera: 6, cerniere: 3, lucchetto: 1 }, pz: 'armadietti' },
    { id: 'scaffale_met', cat: 'arredi', nome: 'Scaffale di ferro', cost: { tubi: 4, lamiera: 3, viti: 1 }, pz: 'scaffaleMet' },
    { id: 'cassettiera', cat: 'arredi', nome: 'Cassettiera', cost: { assi: 4, chiodi: 1 }, pz: 'cassettiera' },
    { id: 'sgabello', cat: 'arredi', nome: 'Sgabello', cost: { assi: 1, tubi: 1 }, pz: 'sgabello' },
    { id: 'televisore', cat: 'arredi', nome: 'Televisore', item: 'tv_rotta', cost: { tv_rotta: 1 }, pz: 'tv', anim: 'schermo' },
    { id: 'lume', cat: 'arredi', nome: 'Lume a olio', cost: { latta: 1, olio: 1 }, pz: 'lumeOlio', anim: 'luce' },
    { id: 'mappa', cat: 'arredi', nome: 'Mappa al muro', item: 'mappa', cost: { mappa: 1 }, pzw: 'mappa' },
    { id: 'casse_mil', cat: 'arredi', nome: 'Casse militari', cost: { lamiera: 2, assi: 2 }, pzc: 'mil' },
    { id: 'cartoni', cat: 'arredi', nome: 'Scatoloni', item: 'cartone', cost: { cartone: 2 }, pzc: 'cartoni' },
    { id: 'generatore', cat: 'arredi', nome: 'Generatore', cost: { motore_el: 1, lamiera: 2, benzina: 1 }, pz: 'generatore', anim: 'ventola' },
    { id: 'fari', cat: 'arredi', nome: 'Fari da cantiere', cost: { tubi: 2, lampadine: 2, cavo: 1 }, pz: 'fari', anim: 'luce' },
    { id: 'taniche', cat: 'arredi', nome: 'Taniche', item: 'tanica_vuota', cost: { tanica_vuota: 1 }, pz: 'tanica' },
    { id: 'estintore', cat: 'arredi', nome: 'Estintore', cost: { bombola: 1 }, pz: 'estintore' },
    { id: 'bobina', cat: 'arredi', nome: 'Bobina di cavo', cost: { cavo: 3 }, pz: 'bobina' },
    { id: 'rastrelliera', cat: 'arredi', nome: 'Deposito armi', desc: 'Rastrelliera col lucchetto: apre le scorte del covo.', cost: { assi: 4, ferro: 1, lucchetto: 1 }, mk: 'rastrelliera', store: 1 },
    { id: 'deposito', cat: 'arredi', nome: 'Casse del deposito', desc: 'Casse impilate: apre le scorte del covo.', cost: { assi: 4, chiodi: 1 }, pzc: 'mil', store: 1 },
    { id: 'baule', cat: 'arredi', nome: 'Baule', desc: 'Uno per covo. Ci metti quello che vuoi, quanto vuoi.', mk: 'baule', baule: 1 },
    { id: 'poster', cat: 'arredi', nome: 'Manifesto', item: 'poster', cost: { poster: 1 }, mk: 'poster' },
    // postazioni: ognuna col suo banco
    { id: 'banco_armi', cat: 'postazioni', nome: 'Banco delle armi', st: 'banco_lavoro', pz: 'bancoArmi', anim: 'morsa', menu: 'armi', cost: { assi: 6, ferro: 2, chiodi: 2, morsa: 1 } },
    { id: 'cucina', cat: 'postazioni', nome: 'Cucina', item: 'fornello', st: 'cucina', pz: 'cucina', anim: 'fornello', cost: { lamiera: 2, bombola: 1, tubi: 1 } },
    { id: 'focolare', cat: 'postazioni', nome: 'Focolare', st: 'cucina', st2: 'stufa', pz: 'focolare', anim: 'fuoco', cost: { pietre: 8, legna: 3 } },
    { id: 'tessile', cat: 'postazioni', nome: 'Laboratorio tessile', item: 'macchina_cucire', st: 'macchina_cucire', pz: 'tessile', pzm: 'st_macchina_cucire', anim: 'ago', cost: { assi: 3, macchina_cucire: 1 } },
    { id: 'stamperia', cat: 'postazioni', nome: 'Stamperia', item: 'ciclostile', st: 'ciclostile', pz: 'stamperia', pzm: 'st_ciclostile', anim: 'rullo', cost: { ciclostile: 1 } },
    { id: 'radio', cat: 'postazioni', nome: 'Banco radio', item: 'banco_radio', st: 'banco_radio', pz: 'bancoRadio', anim: 'radio', cost: { valvole: 3, cavo: 2, altoparlante: 1, assi: 2 } },
    { id: 'forgia', cat: 'postazioni', nome: 'Forgia', st: 'forgia', stm: 'st_forgia', pz: 'forgiaExtra', anim: 'brace', cost: { mattoni: 10, ferro: 3, carbone: 4 } },
    { id: 'banco_lavoro', cat: 'postazioni', nome: 'Banco da lavoro', item: 'banco', st: 'banco_lavoro', pz: 'bancoLavoro', anim: 'lampadina', cost: { assi: 6, chiodi: 2, travi: 2 } },
    { id: 'falegname', cat: 'postazioni', nome: 'Banco del falegname', st: 'banco_falegname', stm: 'st_banco_falegname', anim: 'segatura', cost: { assi: 8, chiodi: 2, sega: 1 } },
    { id: 'infermeria', cat: 'postazioni', nome: 'Infermeria', st: 'tavolo_medico', pz: 'infermeria', anim: 'lampadina', cost: { assi: 4, lenzuola: 2, garze: 2 } },
    { id: 'camera_oscura', cat: 'postazioni', nome: 'Camera oscura', st: 'camera_oscura', stm: 'st_camera_oscura', anim: 'rossa', cost: { assi: 4, vetro: 2, lampadine: 1 } },
    { id: 'officina_auto', cat: 'postazioni', nome: 'Officina del garage', desc: 'Ponte sollevatore e attrezzi: potenzia e ripara il mezzo parcheggiato accanto.', st: 'banco_lavoro', mk: 'officina', menu: 'auto', anim: 'lampadina', cost: { ferro: 4, tubi: 3, bulloni: 4, olio_motore: 1 } },
    { id: 'alambicco', cat: 'postazioni', nome: 'Alambicco', st: 'alambicco', stm: 'st_alambicco', anim: 'fuoco', cost: { rame: 4, tubi: 2 } },
    // difese
    { id: 'sacchi', cat: 'difese', nome: 'Sacchi di sabbia', fp: [1, 1], solid: 'pieno', cost: { sacco_sabbia: 4 }, mk: 'sacchi', col: '#a89870' },
    { id: 'filo_spinato', cat: 'difese', nome: 'Filo spinato', fp: [1, 1], solid: 'pieno', cost: { filo_spinato: 2, tubi: 1 }, mk: 'filo', col: '#6a6e74' },
    { id: 'barricata', cat: 'difese', nome: 'Barricata', fp: [1, 1], solid: 'pieno', cost: { assi: 4, mobile_rotto: 1 }, mk: 'barricata', col: '#6a4a2c' },
    { id: 'torretta', cat: 'difese', nome: 'Torretta di guardia', fp: [2, 2], big: 50, cost: { travi: 8, assi: 8, chiodi: 3 }, mk: 'torretta', col: '#6a4a2c' },
  ];
  const BY = Object.fromEntries(B.map(b => [b.id, b]));

  // le modifiche alle armi (banco delle armi)
  const MODS = {
    pistola: [['canna', 'Canna lunga', { range: 8, spread: -.01 }, { tubi: 1, ferro: 1 }], ['mirino', 'Mirino regolato', { spread: -.012 }, { ferro: 1, vetro: 1 }], ['caricatore', 'Caricatore lungo', { mag: 7 }, { lamiera: 1, molle: 1 }], ['silenziatore', 'Silenziatore', { noise: -22, dmg: -4 }, { tubi: 1, stoffa: 1 }]],
    lupara: [['canne', 'Canne rinforzate', { dmg: 8, range: 3 }, { tubi: 2, ferro: 1 }], ['calcio', 'Calcio imbottito', { kick: -.08, shake: -.05 }, { pelle: 1, assi: 1 }], ['pallettoni', 'Pallettoni', { pellets: 2, spread: .02 }, { piombo: 2 }]],
    mitra: [['calcio', 'Calcio ripiegabile', { kick: -.04, bloom: -.012 }, { tubi: 1, ferro: 1 }], ['caricatore', 'Caricatore doppio', { mag: 10 }, { lamiera: 1, molle: 1 }], ['canna', 'Canna lunga', { range: 6, spread: -.008 }, { tubi: 1, ferro: 1 }]],
    coltello: [['lama', 'Lama affilata', { dmg: 10 }, { carta_vetrata: 1 }], ['impugnatura', 'Impugnatura di cuoio', { rate: -.08 }, { pelle: 1 }]],
  };

  // =====================================================================================================================
  // STATO
  // =====================================================================================================================
  function S(st) { if (!st.covo) st.covo = { covi: [], obj: [], mods: {}, next: 1, busy: {} }; return st.covo; }
  function covi(st) {
    const C = S(st), out = C.covi.slice(), p = st.player;
    if (st.me && st.me.home) out.push({ id: 'casa', name: 'Casa tua', x: st.me.home.x, y: st.me.home.y, r: 14, home: true });
    (st.ris && st.ris.bases || []).filter(b => b.alive).forEach(b => out.push({ id: 'b' + b.id, name: b.name, x: b.cx || b.x, y: b.cy || b.y, r: 16 }));
    return out;
  }
  const covoAt = (st, x, y) => covi(st).find(c => Math.hypot(c.x - x, c.y - y) <= c.r) || null;
  // [survival] sotto terra tutto quello che scavi è tuo: un campo solo, «il sotto», con le sue stanze, il suo baule e la sua corrente
  const UGC = { id: 'sotto', name: 'Il sotto · le tue stanze', x: 0, y: 0, r: 0, ug: true };
  const covoOf = (st, x, y, lv) => lv === 'ug' ? UGC : covoAt(st, x, y);
  function claim(st) {
    const p = st.player; if (covoAt(st, p.x, p.y)) return 'Qui sei già in un covo.';
    const C = S(st), n = C.covi.length + 1, pl = Gm().nearestPlace ? Gm().nearestPlace(p.x, p.y) : null;
    C.covi.push({ id: 'c' + n, name: `Campo ${pl ? 'vicino a ' + pl.name : n}`, x: p.x, y: p.y, r: 22 });
    U.dirty = true; return 'Pianti i picchetti: questo campo adesso è tuo. Qui puoi costruire, coltivare, scavare.';
  }
  const lvOf = st => { const p = st.player; return p.indoor ? `in:${p.indoor.b}:${p.indoor.f}` : p.lv && p.lv.k === 'ug' ? 'ug' : null; };   // fuori, sotto terra, o dentro casa (edificio:piano)

  // materiali: dalle tasche e dalle scorte delle basi (Risacca.EXT), oppure l'oggetto stesso se ce l'hai
  const EXT = () => (typeof Risacca !== 'undefined' && Risacca.EXT) || null;
  const have = (st, id) => Math.floor((O().inv(st)[id]) || 0);
  function missing(st, b) {
    if (b.item && have(st, b.item) >= 1) return [];
    const c = b.cost || {}; if (!Object.keys(c).length) return [];
    const X = EXT(); if (X && X.buildMiss) return X.buildMiss(st, c);
    return Object.entries(c).filter(([k, q]) => have(st, k) < q).map(([k, q]) => `${O().nm(k)} ×${q}`);
  }
  function pay(st, b) {
    if (b.item && have(st, b.item) >= 1) { const bag = O().inv(st); bag[b.item] -= 1; if (bag[b.item] <= 0) delete bag[b.item]; return { item: b.item }; }
    const c = b.cost || {}, X = EXT(); if (X && X.buildTake) X.buildTake(st, c); else { const bag = O().inv(st); Object.entries(c).forEach(([k, q]) => { bag[k] -= q; if (bag[k] <= 0) delete bag[k]; }); }
    return { cost: c };
  }
  function refund(st, o) { const bag = O().inv(st); if (o.paid && o.paid.item) bag[o.paid.item] = (bag[o.paid.item] || 0) + 1; else if (o.paid && o.paid.cost) Object.entries(o.paid.cost).forEach(([k, q]) => { const r = Math.floor(q * .75); if (r > 0) bag[k] = (bag[k] || 0) + r; }); }
  const hasTool = (st, t) => !t || t.split('|').some(k => have(st, k) >= 1 || st.player.hand === k) || (/secchio/.test(t) && !!(st.covo && st.covo.obj.some(o => o.id === 'cisterna' && Math.hypot(o.x - st.player.x, o.y - st.player.y) < 30)));   // [survival] la cisterna fa da secchio

  // =====================================================================================================================
  // TERRENO E SOTTOTERRA
  // =====================================================================================================================
  const tileOf = (x, y) => [Math.floor(x / TS()), Math.floor(y / TS())];
  // [survival] i quattro spigoli della casella alla quota h (i vicini si raccordano da soli: niente gradini netti)
  function levelTile(G, tx, ty, h) { const M = G.MAP, VW = M.VW, vh = M.vh; if (vh) for (let j = 0; j <= 1; j++) for (let i = 0; i <= 1; i++) { const k = (ty + j) * VW + tx + i; if (vh[k] !== undefined) vh[k] = vh[k] * .25 + h * .75; } if (M.elev && tx >= 0 && ty >= 0 && tx < G.GW && ty < G.GH) M.elev[ty * G.GW + tx] = h; }
  const brushTiles = (x, y, r) => { const [cx, cy] = tileOf(x, y), out = []; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + .5) out.push([cx + i, cy + j]); return out; };
  // [sottosuolo] in città, all'aperto, non si costruisce: solo dentro la stanza o sotto terra
  const inCity = (x, y) => { const G = Gm(), M = G.MAP, [tx, ty] = tileOf(x, y); return !!(M.zone && M.Z && M.zone[ty * G.GW + tx] === M.Z.CITTA); };
  const CITY_NO = 'In città si costruisce solo al chiuso: entra nella stanza del covo, o scendi sotto terra.';
  const dirty = (tx, ty) => { const r = R(); if (r && r.dirtyAt) r.dirtyAt(tx * TS() + 1, ty * TS() + 1); };
  function terrain(st, b, tx, ty) {
    if (!hasTool(st, b.tool)) return { ok: false, msg: `Ti serve: ${b.tool.split('|').map(k => O().nm(k)).join(' o ')}.` };
    return terrainDo(st, b, tx, ty, O().inv(st));
  }
  // il lavoro vero e proprio: la roba che ne viene va in `bag` (le tasche, o il baule del covo se lavora la banda)
  function terrainDo(st, b, tx, ty, bag) {
    const G = Gm(), t = T(), v = G.tileAt(tx, ty);
    if (b.op === 'disbosca') { if (v !== t.TREE && v !== t.SHRUB) return { ok: false, msg: 'Qui non c\'è niente da tagliare.' }; G.setTile(tx, ty, t.GRASS); const q = v === t.TREE ? 3 : 1; bag.legna = (bag.legna || 0) + q; dirty(tx, ty); return { ok: true, msg: v === t.TREE ? 'L\'albero cade. Tre ciocchi di legna.' : 'Via il cespuglio.' }; }
    if (b.op === 'cava') { if (v !== t.ROCK && v !== t.CLIFF) return { ok: false, msg: 'Qui non c\'è roccia.' }; G.setTile(tx, ty, t.GRAVEL); bag.pietre = (bag.pietre || 0) + 3; dirty(tx, ty); return { ok: true, msg: 'La roccia si spacca. Tre pietre.' }; }
    if (b.op === 'sterra') { if (![t.GRASS, t.SHRUB, t.FIELD, t.DESERT, t.SAND].includes(v)) return { ok: false, msg: 'Qui è già terra, o non si può.' }; G.setTile(tx, ty, t.DIRT); dirty(tx, ty); return { ok: true, msg: 'Terra battuta.' }; }
    // [survival] il pennello: sgombra (alberi, cespugli, erba) e porta il suolo alla quota h (quella da dove sei partito a trascinare)
    if (b.op === 'sgombra' || b.op === 'livella') {
      let msg = '';
      if (b.op === 'sgombra') { if (v === t.TREE) { bag.legna = (bag.legna || 0) + 3; msg = 'Albero giù.'; } else if (v === t.SHRUB) { bag.legna = (bag.legna || 0) + 1; msg = 'Cespuglio via.'; } else if (v === t.ROCK || v === t.CLIFF) return { ok: false, msg: 'Qui c\'è la roccia: cava.' }; if ([t.TREE, t.SHRUB, t.GRASS, t.FIELD, t.DESERT, t.SAND].includes(v)) G.setTile(tx, ty, t.DIRT); }
      const h = U.lvH !== null && U.lvH !== undefined ? U.lvH : null; if (h !== null) levelTile(G, tx, ty, h);
      dirty(tx, ty); return { ok: true, msg: msg || (b.op === 'livella' ? 'Livellato.' : 'Sgombrato.') };
    }
    if (b.op === 'spiana') {
      const M = G.MAP, VW = M.VW, vh = M.vh, el = M.elev; if (!vh) return { ok: false, msg: 'Qui non si spiana.' };
      let s = 0, n = 0; for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) { const k = (ty + j) * VW + tx + i; if (vh[k] !== undefined) { s += vh[k]; n++; } }
      const h = s / (n || 1); for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) { const k = (ty + j) * VW + tx + i; if (vh[k] !== undefined) vh[k] = h; }
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const x = tx + i, y = ty + j; if (x < 0 || y < 0 || x >= G.GW || y >= G.GH) continue; if (el) el[y * G.GW + x] = h; dirty(x, y); }
      return { ok: true, msg: 'Il terreno è in piano.' };
    }
    return { ok: false, msg: 'Non si può.' };
  }
  function under(st, b) {
    const L = typeof Livelli !== 'undefined' ? Livelli : null; if (!L) return { ok: false, msg: 'Sotto terra non si scava, qui.' };
    const p = st.player; let r = null;
    if (b.cost) { const m = missing(st, b); if (m.length) return { ok: false, msg: `Mancano: ${m.join(', ')}.` }; }
    try {
      if (b.op === 'botola') r = L.digWall(st) || L.digHatch(st);
      else if (b.op === 'cunicolo') r = L.digAhead(st, 0);
      else if (b.op === 'discesa') r = L.digAhead(st, -1);
      else if (b.op === 'stanza') r = L.digRoom(st);
      else if (b.op === 'uscita') r = L.digUp(st);
      else if (b.op === 'bunker') {
        if (!p.lv || p.lv.k !== 'ug') return { ok: false, msg: 'Prima scendi sotto terra.' };
        const x0 = p.x, y0 = p.y, t0 = TS(); r = L.digRoom(st);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => { p.x = x0 + i * t0; p.y = y0 + j * t0; try { L.digRoom(st); } catch (e) { } });
        p.x = x0; p.y = y0; pay(st, b); S(st).bunkers = (S(st).bunkers || 0) + 1; r = 'Una sala grande, puntellata con travi e assi. Un bunker.';
      }
    } catch (e) { r = 'Qui non si riesce.'; }
    const ok = r && !/non puoi|non si|Prima|già|troppo|Ti serve|serve/i.test(r);
    return { ok, msg: r || 'Non si può.' };
  }

  // =====================================================================================================================
  // I MODELLI
  // =====================================================================================================================
  const KIT = {};   // mobili del kit caricati (Models.furniture è asincrono: si caricano all'inizio)
  function preload() { if (!window.Models || !Models.furniture) return; B.filter(b => b.kit && !KIT[b.kit]).forEach(b => { KIT[b.kit] = 'wait'; Models.furniture(b.kit).then(g => { KIT[b.kit] = g || null; }).catch(() => { KIT[b.kit] = null; }); }); }
  const cropKey = st => Object.values((st.covo && st.covo.crops) || {}).map(c => `${c.tx},${c.ty}${c.kind || ''}${c.stage}${c.wet > st.t ? 'b' : ''}`).join(';') + '|' + ((st.covo && st.covo.digs) || []).filter(D => !D.done).map(D => D.id + ':' + D.i).join(',') + '|' + ((st.covo && st.covo.covi) || []).length;
  const jobsKey = st => (st.covo && st.covo.jobs || []).filter(j => !j.done).map(j => j.id).join(',');
  const LMt = {}; const lm = (c, e) => { const k = c + (e || ''); return LMt[k] || (LMt[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, e ? { emissive: new THREE.Color(e), emissiveIntensity: 1 } : {}))); };
  const box = (g, w, h, d, c, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lm(c)); m.position.set(x || 0, y || 0, z || 0); if (ry) m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const cyl = (g, r0, r1, h, c, x, y, z, e) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 12), lm(c, e)); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; g.add(m); return m; };
  const tag = (m, n) => { m.name = n; m.material = m.material.clone(); return m; };
  function model(b, seed) {
    if (b.sh) return shackModel(b, seed);
    const g = new THREE.Group(), S0 = TS(), c = b.col || '#7a5634';
    const P = typeof Pezzi !== 'undefined' ? Pezzi : null;
    if (P && b.pz && P[b.pz]) { const extra = b.pzm && typeof OggettiUI !== 'undefined' && OggettiUI.stModel ? OggettiUI.stModel(b.pzm) : null; if (b.stm && typeof OggettiUI !== 'undefined') { const m0 = OggettiUI.stModel(b.stm); if (m0) g.add(m0); } if (/^(bancoArmi|bancoLavoro|cucina|focolare|tessile|stamperia|bancoRadio|infermeria|forgiaExtra)$/.test(b.pz)) P[b.pz](g, extra); else P[b.pz](g, 0, 0, 0, 0); }
    else if (P && b.pzw) P[b.pzw](g, 1.2, .8, 0, 1.5, 0);
    else if (P && b.pzc === 'mil') { P.cassaMil(g, 1, .5, .55, '#4a5a3a', 0, 0, 0); P.cassaMil(g, .8, .4, .5, '#3a4a32', .05, .5, 0, .1); P.cassaMil(g, .6, .3, .4, '#5a5a4a', .8, 0, .1, -.3); }
    else if (P && b.pzc === 'cartoni') { P.cartone(g, 0, 0, 0, .2, 1.2); P.cartone(g, .5, 0, .1, -.3, 1); P.cartone(g, .2, .38, 0, .5, .8); }
    else if (b.kit) { const K = KIT[b.kit]; if (K && K !== 'wait') g.add(K.clone(true)); else box(g, .9, .5, .6, '#7a5634', 0, .25, 0); }
    else if (b.stm && typeof OggettiUI !== 'undefined' && OggettiUI.stModel) { const m = OggettiUI.stModel(b.stm); if (m) g.add(m); }
    switch (b.mk) {
      case 'muro': box(g, S0, 2.3, .22, c, 0, 1.15, 0); for (let i = 0; i < 4; i++) box(g, S0 + .02, .04, .24, '#2a2420', 0, .3 + i * .55, 0); break;
      case 'porta': box(g, .14, 2.3, .22, c, -S0 / 2 + .07, 1.15, 0); box(g, .14, 2.3, .22, c, S0 / 2 - .07, 1.15, 0); box(g, S0, .2, .22, c, 0, 2.2, 0); tag(box(g, .9, 2, .06, '#5a3a20', -.1, 1, 0), 'anta'); break;
      case 'recinto': for (const x of [-.9, 0, .9]) box(g, .1, 1.1, .1, c, x, .55, 0); box(g, S0, .08, .05, c, 0, .8, 0); box(g, S0, .08, .05, c, 0, .4, 0); break;
      case 'pavimento': box(g, S0, .06, S0, c, 0, .03, 0); for (let i = -2; i <= 2; i++) box(g, S0, .065, .02, '#5a4028', 0, .03, i * .4); break;
      case 'tettoia': { const w = S0 * 2; for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, .14, 2.5, .14, '#5a4028', x * (w / 2 - .1), 1.25, z * (w / 2 - .1)); const r0 = box(g, w + .4, .08, w + .4, c, 0, 2.6, 0); r0.rotation.x = .08; break; }
      case 'capanno': { const w = (b.fp[0]) * S0, d = (b.fp[1]) * S0, h = 2.4;
        box(g, w, h, .12, c, 0, h / 2, -d / 2 + .06); box(g, .12, h, d, c, -w / 2 + .06, h / 2, 0); box(g, .12, h, d, c, w / 2 - .06, h / 2, 0);
        const side = (w - 1.1) / 2; box(g, side, h, .12, c, -w / 2 + side / 2, h / 2, d / 2 - .06); box(g, side, h, .12, c, w / 2 - side / 2, h / 2, d / 2 - .06); box(g, 1.1, .4, .12, c, 0, h - .2, d / 2 - .06);
        const rf = box(g, w + .5, .1, d + .6, b.id === 'baracca' ? '#6a7078' : '#5a5048', 0, h + .15, 0); rf.rotation.x = .1; for (let i = 0; i < 5; i++) box(g, w + .02, .04, .14, '#2a2420', 0, .4 + i * .45, -d / 2 + .05); break; }
      case 'casa': { const w = 4 * S0, d = 3 * S0, h = 2.8, wall = c;
        box(g, w, h, .25, wall, 0, h / 2, -d / 2 + .12); box(g, .25, h, d, wall, -w / 2 + .12, h / 2, 0); box(g, .25, h, d, wall, w / 2 - .12, h / 2, 0);
        const side = (w - 1.2) / 2; box(g, side, h, .25, wall, -w / 2 + side / 2, h / 2, d / 2 - .12); box(g, side, h, .25, wall, w / 2 - side / 2, h / 2, d / 2 - .12); box(g, 1.2, .5, .25, wall, 0, h - .25, d / 2 - .12);
        tag(box(g, 1, 2.2, .06, '#5a3a20', -.3, 1.1, d / 2 - .02), 'anta');
        for (const x of [-2.6, 2.6]) { box(g, 1, 1, .27, '#2a3a4a', x, 1.6, d / 2 - .12); box(g, 1.2, .1, .35, '#e8e0cc', x, 1.05, d / 2 - .05); box(g, .12, 1, .3, '#3a6a4a', x - .62, 1.6, d / 2 - .02); box(g, .12, 1, .3, '#3a6a4a', x + .62, 1.6, d / 2 - .02); }
        for (const s2 of [-1, 1]) { const r0 = box(g, w + .6, .14, d / 2 + .7, '#a8483a', 0, h + .62, s2 * (d / 4 + .15)); r0.rotation.x = s2 * .5; for (let i = 0; i < 9; i++) { const q0 = box(g, .06, .1, d / 2 + .6, '#7a3a2a', -w / 2 + .5 + i * (w / 9), h + .7, s2 * (d / 4 + .15)); q0.rotation.x = s2 * .5; } }
        box(g, .25, 1.1, d - .6, wall, -w / 2 + .12, h + .5, 0); box(g, .25, 1.1, d - .6, wall, w / 2 - .12, h + .5, 0);
        cyl(g, .18, .18, 1, '#8a5a4a', w / 2 - .8, h + 1.3, -.4); break; }
      case 'garage': { const w = 4 * S0, d = 4 * S0, h = 3;
        box(g, w, h, .15, c, 0, h / 2, -d / 2 + .08); box(g, .15, h, d, c, -w / 2 + .08, h / 2, 0); box(g, .15, h, d, c, w / 2 - .08, h / 2, 0);
        box(g, S0, h, .15, c, -w / 2 + S0 / 2, h / 2, d / 2 - .08); box(g, S0, h, .15, c, w / 2 - S0 / 2, h / 2, d / 2 - .08); box(g, w - 2 * S0, .6, .15, c, 0, h - .3, d / 2 - .08);
        for (let i = 0; i < 12; i++) box(g, w + .02, .03, .17, '#6a6e74', 0, .25 * i + .1, -d / 2 + .08);
        box(g, w - 2 * S0, .5, .12, '#9aa0a8', 0, h - .1, d / 2 - .02);
        const rf = box(g, w + .4, .1, d + .4, '#6a7078', 0, h + .08, 0); rf.rotation.x = .04; box(g, w - .4, .02, d - .4, '#5a5a56', 0, .02, 0);
        box(g, .6, .3, .2, '#ffd23b', -w / 2 + .5, h - .5, d / 2 + .02); break; }
      case 'tenda': { const w = 2 * S0 - .4, d = 2 * S0 - .4;
        for (const s2 of [-1, 1]) { const t0 = box(g, w * .62, .04, d, c, s2 * w * .26, .85, 0); t0.rotation.z = -s2 * .9; }
        box(g, .05, 1.65, .05, '#5a4028', 0, .82, d / 2); box(g, .05, 1.65, .05, '#5a4028', 0, .82, -d / 2); box(g, .04, .04, d + .1, '#5a4028', 0, 1.64, 0);
        box(g, w * .8, .05, d * .8, '#4a4a3a', 0, .03, 0); for (const z of [-1, 1]) { const f0 = box(g, .02, 1.2, .9, '#7a7a5a', .2, .6, z * d / 2); f0.rotation.y = z * .4; } break; }
      case 'rastrelliera': box(g, 1.4, 1.7, .3, '#6a4a2c', 0, .85, -.1); for (let i = 0; i < 5; i++) { const r0 = box(g, .07, 1.2, .1, '#2a2622', -.5 + i * .25, .95, .1); r0.rotation.z = .06; box(g, .11, .28, .13, '#5a3a20', -.5 + i * .25, .4, .1); } box(g, 1.42, .08, .4, '#4a3a2a', 0, 1.25, .05); box(g, .12, .14, .05, '#c8a040', .62, .9, .07); break;
      case 'officina': {
        for (const x of [-1.3, 1.3]) { box(g, .3, 2.2, .3, '#c8402a', x, 1.1, -1); const arm = box(g, .12, .1, 1.6, '#3a3a40', x * .82, .45, -.3); arm.rotation.y = x > 0 ? -.2 : .2; }
        box(g, 2.9, .15, .3, '#c8402a', 0, 2.2, -1); box(g, .9, 1.1, .5, '#b02a2a', 2.3, .55, -1); for (let i = 0; i < 4; i++) box(g, .86, .02, .02, '#e8e0cc', 2.3, .3 + i * .22, -.74);
        for (let i = 0; i < 3; i++) cyl(g, .33, .33, .22, '#1a1a1a', -2.3, .11 + i * .23, -.8);
        box(g, .5, .3, .3, '#2a6a3a', 2.3, 1.25, -1); tag(cyl(g, .05, .07, .1, '#f0e0a0', 0, 2.05, -.9, '#ffd890'), 'luce'); break; }
      case 'solare': { for (const x of [-.7, .7]) box(g, .08, .9, .08, '#8a8a90', x, .45, -.4); for (const x of [-.7, .7]) box(g, .08, .4, .08, '#8a8a90', x, .2, .5); const pn = new THREE.Group(); pn.position.set(0, .75, 0); pn.rotation.x = -.6; g.add(pn); box(pn, 1.8, .06, 1.3, '#c8c8d0', 0, 0, 0); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box(pn, .4, .02, .38, '#1a2a5a', -.66 + i * .44, .04, -.42 + j * .42).material.emissive = new THREE.Color('#0a1840'); cyl(g, .02, .02, .8, '#2a2a2a', .9, .4, .5); break; }
      case 'eolica': { cyl(g, .08, .16, 6, '#d8d8dc', 0, 3, 0); box(g, .5, .4, .8, '#c8c8cc', 0, 6.1, 0); const hub = new THREE.Group(); hub.name = 'pale'; hub.position.set(0, 6.1, .45); g.add(hub); for (let i = 0; i < 3; i++) { const bl = box(hub, .18, 2.2, .04, '#e8e8ea', 0, 1.1, 0); const pv = new THREE.Group(); pv.rotation.z = i * Math.PI * 2 / 3; pv.add(bl); hub.add(pv); } cyl(hub, .12, .12, .2, '#c83a2a', 0, 0, 0).rotation.x = Math.PI / 2; break; }
      case 'batterie': { box(g, 1.3, .1, .6, '#5a4028', 0, .05, 0); for (let i = 0; i < 4; i++) { box(g, .28, .32, .5, '#2a2a2e', -.45 + i * .3, .26, 0); box(g, .06, .05, .06, '#c83a2a', -.5 + i * .3, .45, .1); box(g, .06, .05, .06, '#2a2a2a', -.4 + i * .3, .45, .1); } tag(box(g, .1, .06, .02, '#30ff60', .55, .3, .3), 'led'); break; }
      case 'quadro': { box(g, .1, 1.6, .1, '#3a3a40', 0, .8, -.05); box(g, .7, .9, .2, '#8a8e94', 0, 1.4, 0); for (let i = 0; i < 5; i++) box(g, .08, .14, .03, '#2a2a2e', -.24 + i * .12, 1.5, .11); tag(box(g, .08, .05, .03, '#30ff60', .22, 1.75, .11), 'led'); box(g, .3, .12, .02, '#ffd23b', 0, 1.15, .11); break; }
      case 'lampione': cyl(g, .06, .08, 3, '#3a3a40', 0, 1.5, 0); box(g, .5, .06, .1, '#3a3a40', .22, 2.95, 0); tag(cyl(g, .1, .14, .16, '#f0e0a0', .45, 2.86, 0, '#ffd890'), 'luce'); break;
      case 'bandiera': cyl(g, .04, .05, 3.2, '#8a8a90', 0, 1.6, 0); { const f = tag(box(g, 1.1, .7, .02, '#1e3a5a', .58, 2.75, 0), 'telo'); const w0 = box(g, .9, .08, .03, '#35e6ff', .58, 2.75, .01); w0.name = 'onda'; } break;
      case 'tappeto': box(g, 1.6, .02, 1.1, c, 0, .01, 0); box(g, 1.3, .021, .8, '#c8a050', 0, .011, 0); box(g, 1.1, .022, .6, c, 0, .012, 0); break;
      case 'lampada': cyl(g, .08, .1, .06, '#5a4a2a', 0, .03, 0); tag(cyl(g, .06, .07, .18, '#f8e0a0', 0, .15, 0, '#ffc860'), 'luce'); cyl(g, .03, .03, .06, '#3a3a3a', 0, .27, 0); break;
      case 'barile': cyl(g, .3, .3, .85, '#4a3a2e', 0, .43, 0); tag(cyl(g, .0, .26, .45, '#ff7a20', 0, 1.05, 0, '#ff5a10'), 'fiamma'); break;
      case 'baule': { box(g, 1.1, .5, .62, '#6a4a2c', 0, .25, 0); const lid = new THREE.Group(); lid.position.set(0, .5, -.31); lid.name = 'coperchio'; g.add(lid);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(.31, .31, 1.1, 14, 1, false, 0, Math.PI), lm('#7a5634')); top.rotation.z = Math.PI / 2; top.position.set(0, 0, .31); lid.add(top);
        for (const x of [-.4, 0, .4]) { box(g, .06, .52, .64, '#3a3a40', x, .26, 0); const b2 = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .06, 14, 1, false, 0, Math.PI), lm('#3a3a40')); b2.rotation.z = Math.PI / 2; b2.position.set(x, 0, .31); lid.add(b2); }
        box(g, .1, .12, .04, '#c8a040', 0, .42, .33); break; }
      case 'poster': box(g, .7, 1, .02, '#e8e0cc', 0, 1.5, 0); box(g, .5, .3, .025, '#c83a3a', 0, 1.7, 0); box(g, .5, .05, .025, '#2a2a2e', 0, 1.35, 0); break;
      case 'banco_armi': box(g, 1.8, .08, .75, '#7a5634', 0, .86, 0); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, .07, .86, .07, '#5a4028', x * .84, .43, z * .3);
        box(g, 1.7, 1.1, .05, '#4a3a2a', 0, 1.5, -.35); for (let i = 0; i < 3; i++) { box(g, .06, .9, .05, '#2a2a2e', -.5 + i * .5, 1.5, -.3); box(g, .25, .1, .06, '#5a3a20', -.5 + i * .5, 1.05, -.3); }
        tag(box(g, .2, .14, .16, '#4a4c52', .65, .97, .15), 'morsa'); box(g, .4, .06, .1, '#3a3a40', -.3, .93, .15); tag(cyl(g, .05, .07, .1, '#f0e0a0', -.6, 1.3, .1, '#ffd890'), 'luce'); break;
      case 'cucina': box(g, 1, .85, .6, '#d8d4c8', 0, .43, 0); box(g, .9, .03, .5, '#2a2a2e', 0, .87, 0); cyl(g, .16, .14, .2, '#8a8e96', -.2, .98, 0); tag(cyl(g, .12, .12, .02, '#3080ff', -.2, .885, 0, '#2060ff'), 'fiamma'); tag(cyl(g, .05, .0, .1, '#e8e8e8', -.2, 1.15, 0), 'vapore'); box(g, .25, .08, .25, '#2a2a2e', .25, .92, 0); break;
      case 'focolare': for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; box(g, .25, .2, .2, '#6a6a68', Math.cos(a) * .55, .1, Math.sin(a) * .55, -a); } for (let i = 0; i < 3; i++) { const l = cyl(g, .06, .06, .7, '#5a3a20', 0, .12, 0); l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.05; }
        tag(cyl(g, 0, .3, .7, '#ff8a20', 0, .5, 0, '#ff5a10'), 'fiamma'); tag(cyl(g, 0, .18, .45, '#ffd060', 0, .45, 0, '#ffb030'), 'fiamma2'); cyl(g, .02, .02, 1.3, '#3a3a3a', -.6, .65, 0); cyl(g, .02, .02, 1.3, '#3a3a3a', .6, .65, 0); { const s0 = cyl(g, .02, .02, 1.25, '#3a3a3a', 0, 1.3, 0); s0.rotation.z = Math.PI / 2; } cyl(g, .18, .14, .22, '#2a2a2e', 0, 1.05, 0); break;
      case 'sacchi': for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - (r % 2); i++) { const s0 = box(g, .6, .25, .4, c, -.6 + i * .62 + (r % 2) * .31, .13 + r * .25, 0); s0.rotation.y = (i - 1) * .05; } break;
      case 'filo': for (const x of [-.9, .9]) box(g, .08, 1.2, .08, '#4a4a4e', x, .6, 0); for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.3, .015, 4, 12), lm(c)); t.position.set(-.6 + i * .6, .7, 0); t.rotation.y = Math.PI / 2; g.add(t); } break;
      case 'barricata': { const a = box(g, S0, .8, .12, c, 0, .6, 0); a.rotation.z = .2; const b2 = box(g, S0, .8, .12, '#5a3a20', 0, .5, .2); b2.rotation.z = -.15; box(g, .6, .7, .5, '#4a4a4a', .5, .35, -.1); break; }
      case 'torretta': { const w = S0 * 2 - .3; for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, .16, 3.6, .16, '#5a4028', x * w / 2, 1.8, z * w / 2); box(g, w + .3, .1, w + .3, c, 0, 3, 0); box(g, w + .3, .8, .08, c, 0, 3.45, w / 2 + .1); box(g, w + .3, .8, .08, c, 0, 3.45, -w / 2 - .1); box(g, .08, .8, w + .3, c, w / 2 + .1, 3.45, 0); const rf = box(g, w + .8, .08, w + .8, '#5a5048', 0, 4.4, 0); rf.rotation.x = .1; for (const x of [-.4, .4]) box(g, .06, 1, .06, '#5a4028', x, 3.9, 0); break; }
    }
    // animazioni aggiunte alle postazioni del kit
    if (b.anim === 'fuoco' && b.stm) tag(cyl(g, 0, .14, .3, '#ff7a20', 0, .45, .3, '#ff5a10'), 'fiamma');
    if (b.anim === 'ago') tag(box(g, .015, .12, .015, '#c8c8d0', .17, .86, 0), 'ago');
    if (b.anim === 'rullo') { const r0 = tag(cyl(g, .08, .08, .62, '#3a3a3a', 0, 1.05, .2), 'rullo'); r0.rotation.z = Math.PI / 2; }
    if (b.anim === 'radio') { tag(box(g, .04, .04, .02, '#30ff60', -.12, 1.0, .06, 0), 'led'); g.getObjectByName('led').material.emissive = new THREE.Color('#30ff60'); cyl(g, .008, .008, 1.2, '#c8c8d0', .55, 1.4, -.2); }
    if (b.anim === 'brace') tag(box(g, .5, .05, .35, '#ff4a10', -.1, .9, 0), 'brace').material.emissive = new THREE.Color('#ff3a00');
    if (b.anim === 'lampadina' && !g.getObjectByName('luce')) tag(cyl(g, .05, .07, .1, '#f0e0a0', .4, 1.5, -.2, '#ffd890'), 'luce');
    if (b.anim === 'rossa') tag(cyl(g, .06, .06, .06, '#ff2a2a', 0, 1.9, -.2, '#ff1010'), 'luce');
    if (b.anim === 'segatura') tag(box(g, .3, .02, .2, '#d8b080', .3, .87, .1), 'segatura');
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  // =====================================================================================================================
  // PIAZZARE, SPOSTARE, TOGLIERE
  // =====================================================================================================================
  // le caselle che occupa (con la rotazione a passi di 90°)
  function footprint(b, x, y, rot) {
    if (!b.fp) return []; const S0 = TS(); let [w, d] = b.fp; const q = ((Math.round(rot / (Math.PI / 2)) % 4) + 4) % 4; if (q % 2) [w, d] = [d, w];
    const tx0 = Math.floor(x / S0 - w / 2 + .5), ty0 = Math.floor(y / S0 - d / 2 + .5), out = [];
    for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
      let solid = b.solid === 'pieno';
      if (b.solid === 'bordo') { const edge = i === 0 || j === 0 || i === w - 1 || j === d - 1; const mid = (k, n) => b.door === 'largo' ? k > 0 && k < n - 1 : k === Math.floor(n / 2); const door = q === 0 ? (j === d - 1 && mid(i, w)) : q === 2 ? (j === 0 && mid(i, w)) : q === 1 ? (i === 0 && mid(j, d)) : (i === w - 1 && mid(j, d)); solid = edge && !door; }   // [cantiere] il portone largo del garage
      out.push([tx0 + i, ty0 + j, solid]);
    }
    return out;
  }
  function snap(b, gx, gy, rot) {
    const S0 = TS();
    if (b.fp) { let [w, d] = b.fp; const q = ((Math.round(rot / (Math.PI / 2)) % 4) + 4) % 4; if (q % 2) [w, d] = [d, w]; const cx = (Math.floor(gx / S0 - w / 2 + .5) + w / 2) * S0, cy = (Math.floor(gy / S0 - d / 2 + .5) + d / 2) * S0; return [cx, cy]; }
    if (b.op && (b.cat === 'terreno' || b.cat === 'orto')) { const [tx, ty] = tileOf(gx, gy); return [(tx + .5) * S0, (ty + .5) * S0]; }
    return [Math.round(gx * 4) / 4, Math.round(gy * 4) / 4];
  }
  function canPlace(st, b, x, y, rot) {
    const G = Gm(), t = T(), lv = lvOf(st), C = covoOf(st, x, y, lv);
    if (b.dig) return canDig(st, b, x, y, rot);   // [survival] gli scavi da edificio: sotto terra, dovunque
    if (!C) return 'Fuori dal campo: qui non costruisci (pianta il campo, o entra in un covo).';
    if (!lv && b.cat !== 'sotto' && inCity(x, y)) return CITY_NO;   // [sottosuolo]
    if (lv && b.out) return 'Si monta solo all\'aperto.';
    if (b.cat === 'orto') { const [tx, ty] = tileOf(x, y); if (lv) return 'L\'orto si fa all\'aperto.'; return cropCheck(st, b, tx, ty); }
    if (b.cat === 'terreno') { const [tx, ty] = tileOf(x, y), v = G.tileAt(tx, ty); if (lv) return lv === 'ug' ? 'Sotto terra si usa Sottoterra.' : 'Dentro casa non si disbosca.'; if (b.brush) return ''; if (b.op === 'disbosca' && v !== t.TREE && v !== t.SHRUB) return 'Niente da tagliare qui.'; if (b.op === 'cava' && v !== t.ROCK && v !== t.CLIFF) return 'Niente roccia qui.'; return ''; }
    if (b.cat === 'sotto') return '';
    if (b.baule && S(st).obj.some(o => o.id === 'baule' && (covoOf(st, o.x, o.y, o.lv) || {}).id === C.id)) return 'In questo campo il baule c\'è già.';
    if (lv && lv !== 'ug') return b.fp && b.solid ? 'Dentro casa: solo arredi e postazioni.' : '';   // dentro casa si arreda
    const L = lv && typeof Livelli !== 'undefined' ? Livelli.S(st) : null;
    for (const [tx, ty] of footprint(b, x, y, rot).concat(b.fp ? [] : [tileOf(x, y).concat([false])])) {
      const v = G.tileAt(tx, ty);
      if (lv) { if (!L.ug[ty * G.GW + tx]) return 'Qui è terra piena: scava prima.'; continue; }
      const ours = S(st).obj.some(o => o.tiles && o.tiles.some(q => q[0] === tx && q[1] === ty && q[2] !== null && q[2] !== undefined));   // una casella fatta solida da noi
      if (!(b.layer === 'tetto' && ours) && (v === t.WATER || v === t.BLD || v === t.CLIFF || v === t.ROCK || v === t.TREE)) return v === t.TREE ? 'C\'è un albero: disbosca prima.' : v === t.ROCK || v === t.CLIFF ? 'C\'è la roccia: cava prima.' : 'Qui non si può.';
      if (b.fp && S(st).obj.some(o => (BY[o.id].layer || '') === (b.layer || '') && o.tiles && o.tiles.some(q => q[0] === tx && q[1] === ty))) return 'C\'è già qualcosa.';
      if (b.fp && !b.layer && S(st).crops && S(st).crops[tx + ',' + ty]) return 'C\'è l\'orto: prima raccogli o zappa altrove.';
    }
    return '';
  }
  function place(st, b, x, y, rot, moving) {
    const why = canPlace(st, b, x, y, rot); if (why) return { ok: false, msg: why };
    let paid = moving ? moving.paid : null;
    if (!moving) { const m = missing(st, b); if (m.length) return { ok: false, msg: `Mancano: ${m.join(', ')}.` }; paid = pay(st, b); }
    const G = Gm(), lv = lvOf(st), tiles = [];
    footprint(b, x, y, rot).forEach(([tx, ty, solid]) => { const orig = G.tileAt(tx, ty); if (solid && !lv) { G.setTile(tx, ty, T().BLD); dirty(tx, ty); } tiles.push([tx, ty, solid ? orig : null]); });
    const C = S(st), o = { uid: moving ? moving.uid : 'k' + (C.next++), id: b.id, x, y, rot, lv, tiles, paid, at: st.t, seed: moving ? moving.seed : (U.seed || Math.floor(Math.random() * 1e6) + 1) };
    if (!moving) U.seed = Math.floor(Math.random() * 1e6) + 1;   // la prossima baracca sarà diversa
    if (moving && moving.wip) o.wip = moving.wip;
    // [cantiere] le costruzioni grandi all'aperto le tira su la banda: si apre il cantiere
    if (!moving && b.big && !lv && crewAll(st).length) { o.wip = b.big; addJob(st, { op: 'costruisci', uid: o.uid, x, y }); }
    C.obj.push(o); U.dirty = true;
    return { ok: true, msg: moving ? `${b.nome}: spostato.` : o.wip ? `${b.nome}: cantiere aperto. Ci pensa la banda (${jobsLeft(st)} lavori in coda).` : `${b.nome}: fatto.`, o };
  }
  function lift(st, uid) {   // toglie dal mondo (per spostare o per togliere)
    const C = S(st), i = C.obj.findIndex(o => o.uid === uid); if (i < 0) return null; const o = C.obj[i]; C.obj.splice(i, 1);
    (o.tiles || []).forEach(([tx, ty, orig]) => { if (orig !== null && orig !== undefined) { Gm().setTile(tx, ty, orig); dirty(tx, ty); } });
    U.dirty = true; return o;
  }
  function remove(st, uid) { const o = lift(st, uid); if (!o) return { ok: false, msg: '' }; refund(st, o); const C = S(st); (C.jobs || []).forEach(j => { if (j.uid === uid) j.done = true; }); return { ok: true, msg: `${BY[o.id].nome}: smontato. Ti torna la roba.` }; }

  // =====================================================================================================================
  // [survival] L'ORTO E GLI ALBERI: zappi, semini, annaffi, aspetti, raccogli. Cresce solo bagnato (un giorno ogni annaffiata).
  // =====================================================================================================================
  const CROP = { patate: { need: 2400, out: 3, nome: 'patate' }, pomodori: { need: 2600, out: 4, nome: 'pomodori' }, cipolle: { need: 2000, out: 3, nome: 'cipolle' }, orzo: { need: 2100, out: 3, nome: 'orzo' }, albero: { need: 2880, dry: true, nome: 'alberello' } };
  const crops = st => { const C = S(st); return (C.crops = C.crops || {}); };
  function cropCheck(st, b, tx, ty) {
    const v = Gm().tileAt(tx, ty), t = T(), c = crops(st)[tx + ',' + ty];
    if (!hasTool(st, b.tool)) return `Ti serve: ${b.tool.split('|').map(k => O().nm(k)).join(' o ')}.`;
    if (b.op === 'ara') { if (c) return 'Qui è già orto.'; if (![t.GRASS, t.DIRT, t.FIELD, t.SHRUB, t.SAND].includes(v)) return 'Qui non si zappa.'; if (S(st).obj.some(o => o.tiles && o.tiles.some(q => q[0] === tx && q[1] === ty))) return 'C\'è già qualcosa.'; return ''; }
    if (b.op === 'albero') { if (c) return 'Qui c\'è l\'orto.'; if (![t.GRASS, t.DIRT, t.FIELD, t.SHRUB].includes(v)) return 'Qui non attecchisce.'; return missing(st, b).length ? `Ti serve: ${missing(st, b).join(', ')}.` : ''; }
    if (b.op === 'semina') { if (!c || c.kind) return c ? 'Qui è già seminato.' : 'Prima zappa la terra.'; return missing(st, b).length ? `Ti serve: ${O().nm(b.seed)}.` : ''; }
    if (b.op === 'innaffia') return '';
    if (b.op === 'raccogli') { if (!c || !c.kind || c.kind === 'albero') return 'Qui non c\'è niente da raccogliere.'; if (c.stage < 4) return 'Non è ancora maturo.'; return ''; }
    return 'Non si può.';
  }
  function cropDo(st, b, tx, ty) {
    const why = cropCheck(st, b, tx, ty); if (why) return { ok: false, msg: why };
    const G = Gm(), t = T(), K0 = tx + ',' + ty, CR = crops(st);
    if (b.op === 'ara') { CR[K0] = { tx, ty, kind: null, stage: 0, grow: 0, wet: 0, t0: st.t, prev: G.tileAt(tx, ty) }; G.setTile(tx, ty, t.FIELD); dirty(tx, ty); U.dirty = true; return { ok: true, msg: 'Zappi: un solco d\'orto.' }; }
    if (b.op === 'albero') { pay(st, b); CR[K0] = { tx, ty, kind: 'albero', stage: 0, grow: 0, wet: 0, t0: st.t, prev: G.tileAt(tx, ty) }; U.dirty = true; return { ok: true, msg: 'Pianti la talea. Fra due giorni è un albero.' }; }
    if (b.op === 'semina') { pay(st, b); Object.assign(CR[K0], { kind: b.seed, stage: 0, grow: 0, t0: st.t }); U.dirty = true; return { ok: true, msg: `Semini ${CROP[b.seed].nome}. Ricordati di annaffiare.` }; }
    if (b.op === 'innaffia') { let n = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const c = CR[(tx + i) + ',' + (ty + j)]; if (c) { c.wet = st.t + 1440; n++; } } U.dirty = true; return n ? { ok: true, msg: `Annaffi (${n} ${n === 1 ? 'casella' : 'caselle'}): bagnate per un giorno.` } : { ok: false, msg: 'Qui non c\'è niente da annaffiare.' }; }
    if (b.op === 'raccogli') {
      const c = CR[K0], R0 = CROP[c.kind], q = R0.out, C0 = covoAt(st, (tx + .5) * TS(), (ty + .5) * TS()), left = O().givePlayer(st, c.kind, q) || 0;
      if (left) { const B0 = bauleOf(st, C0); if (B0) B0[c.kind] = (B0[c.kind] || 0) + left; }
      const seed = Math.random() < .5; Object.assign(c, { kind: null, stage: 0, grow: 0 }); U.dirty = true;
      return { ok: true, msg: `Raccogli: ${O().nm(R0.nome === 'orzo' ? 'orzo' : c.kind || R0.nome)} ×${q}${left ? ' (il resto nel baule)' : ''}.${seed ? '' : ''}` };
    }
    return { ok: false, msg: 'Non si può.' };
  }
  // la crescita: ogni dieci minuti di gioco
  function cropsStep(st) {
    const CR = st.covo && st.covo.crops; if (!CR) return; const G = Gm(); if (st.covo.cropT === undefined) { st.covo.cropT = st.t; return; } const dm = st.t - st.covo.cropT; if (dm < 10) return; st.covo.cropT = st.t;
    let ch = false;
    Object.entries(CR).forEach(([k, c]) => {
      if (!c.kind || c.stage >= 4) return; const R0 = CROP[c.kind], wet = c.wet > st.t || (typeof window !== 'undefined' && window.__pv && window.__pv.R && window.__pv.R.isRaining && window.__pv.R.isRaining());
      c.grow += dm * (wet || R0.dry ? 1 : 0); const s0 = c.stage; c.stage = Math.min(4, Math.floor(c.grow / R0.need * 4)); if (c.stage !== s0) ch = true;
      if (c.kind === 'albero' && c.stage >= 4) { G.setTile(c.tx, c.ty, T().TREE); dirty(c.tx, c.ty); delete CR[k]; G.feed(st, 'L\'alberello del campo è diventato un albero.', 'good'); ch = true; }
    });
    if (ch) U.dirty = true;
  }

  // =====================================================================================================================
  // [survival] LA CORRENTE: per ogni campo, quanta se ne fa e quanta se ne usa; le batterie tengono l'avanzo per la notte.
  // Senza corrente le luci elettriche, la radio, la tv e l'officina si spengono.
  // =====================================================================================================================
  const USE = { lampione: 1, fari: 2, radio: 1, televisore: 1, officina_auto: 2, stamperia: 1, lume: 0, camera_oscura: 1, quadro: 0 };
  function power(st, Cv) {
    const C = S(st), objs = C.obj.filter(o => !o.wip && (covoOf(st, o.x, o.y, o.lv) || {}).id === (Cv && Cv.id)); const h = Gm().hour ? Gm().hour(st) : 12, day = h >= 7 && h < 18;
    let make = 0, use = 0, cap = 0; objs.forEach(o => { const b = BY[o.id]; if (b.pow) make += b.sun ? (day ? b.pow : 0) : b.fuel ? (o.dry ? 0 : b.pow) : b.pow; if (USE[o.id]) use += USE[o.id]; if (b.bat) cap += b.bat; });
    C.bat = C.bat || {}; const k = Cv ? Cv.id : '-', stored = C.bat[k] || 0;
    return { make, use, cap, stored, on: make >= use || stored > 0, k };
  }
  function powerStep(st) {
    const C = st.covo; if (!C) return; if (C.powT === undefined) { C.powT = st.t; return; } const dm = st.t - C.powT; if (dm < 5) return; C.powT = st.t; C.bat = C.bat || {};
    covi(st).concat([UGC]).forEach(Cv => { const P = power(st, Cv); if (!P.make && !P.use) return; const d = (P.make - P.use) * dm / 60; C.bat[Cv.id] = Math.max(0, Math.min(P.cap, (C.bat[Cv.id] || 0) + d)); });
    // il generatore beve: una tanica ogni sei ore, dal baule del suo campo; a secco si ferma
    C.obj.forEach(o => { if (o.id !== 'generatore_campo' || o.wip) return; o.fuelT = (o.fuelT || 0) + dm; if (o.fuelT < 360) return; o.fuelT = 0; const B0 = bauleOf(st, covoOf(st, o.x, o.y, o.lv)); if (B0 && B0.benzina >= 1) { B0.benzina -= 1; if (B0.benzina <= 0) delete B0.benzina; o.dry = false; } else { if (!o.dry) Gm().feed(st, 'Il generatore del campo tossisce e si ferma: niente benzina nel baule.', 'bad'); o.dry = true; } });
  }

  // =====================================================================================================================
  // [survival] GLI SCAVI DA EDIFICIO: un progetto sotto terra che si apre a poco a poco, cominciando dal lato già scavato
  // =====================================================================================================================
  const LVM = () => (typeof Livelli !== 'undefined' ? Livelli : null);
  function digTiles(b, x, y, rot) { return footprint(b, x, y, rot).map(([tx, ty]) => [tx, ty]); }
  function canDig(st, b, x, y, rot) {
    const p = st.player, L0 = LVM(); if (!L0 || !p.lv || p.lv.k !== 'ug') return 'Gli scavi da edificio si fanno sotto terra: scendi prima.';
    const L = L0.S(st), G = Gm(), tiles = digTiles(b, x, y, rot); let touch = false, todo = 0;
    for (const [tx, ty] of tiles) { if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return 'Oltre non si va.'; const i = ty * G.GW + tx; if (G.tileAt(tx, ty) === T().WATER) return 'Lì sopra c\'è l\'acqua: si allaga.'; if (!L.ug[i]) todo++; else if (L.kind[i] > 2) return 'Dentro le fogne e i posti murati non si scava.';
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (ty + dy) * G.GW + tx + dx; if (L.ug[j]) touch = true; } }
    if (!todo) return 'Qui è già tutto scavato.'; if (!touch) return 'Deve toccare un cunicolo già scavato.';
    if ((S(st).digs || []).some(D => !D.done && D.tiles.some(q => tiles.some(r => r[0] === q[0] && r[1] === q[1])))) return 'Qui c\'è già uno scavo in corso.';
    if (!hasTool(st, b.tool)) return `Ti serve: ${b.tool.split('|').map(k => O().nm(k)).join(' o ')}.`;
    return '';
  }
  function placeDig(st, b, x, y, rot) {
    const why = canDig(st, b, x, y, rot); if (why) return { ok: false, msg: why };
    const m = missing(st, b); if (m.length) return { ok: false, msg: `Mancano: ${m.join(', ')}.` }; pay(st, b);
    const L = LVM().S(st), G = Gm(), p = st.player, f = LVM().heightOf(st, p) ?? 0, tiles = digTiles(b, x, y, rot).filter(([tx, ty]) => !L.ug[ty * G.GW + tx]);
    // l'ordine: dal lato che tocca lo scavato verso il fondo
    const dist0 = ([tx, ty]) => { let d = 99; for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) if (L.ug[(ty + j) * G.GW + tx + i]) d = Math.min(d, Math.abs(i) + Math.abs(j)); return d; };
    tiles.sort((a, c) => dist0(a) - dist0(c));
    const C = S(st); C.digs = C.digs || []; C.digid = (C.digid || 0) + 1;
    C.digs.push({ id: 'd' + C.digid, b: b.id, tiles, f, kind: b.dig, i: 0, acc: 0, x, y, rot });
    U.dirty = true; return { ok: true, msg: `${b.nome}: tracciato. Si scava ${crewAll(st).length ? 'con la banda' : 'quando sei vicino, con la pala'}.` };
  }
  function digsStep(st, dt) {
    const C = st.covo, L0 = LVM(); if (!C || !C.digs || !L0) return; const p = st.player, L = L0.S(st), G = Gm();
    C.digs.forEach(D => {
      if (D.done) return;
      const near = p.lv && p.lv.k === 'ug' && Math.hypot(p.x - D.x, p.y - D.y) < 20 && hasTool(st, 'pala|piccone'), crew = Math.min(3, crewAll(st).length);
      const rate = (near ? 1 / 3.5 : 0) + crew / 7; if (!rate) return;
      D.acc += rate * dt;
      while (D.acc >= 1 && D.i < D.tiles.length) {
        D.acc -= 1; const [tx, ty] = D.tiles[D.i++], i = ty * G.GW + tx; if (!L.ug[i]) { L.ug[i] = 2; L.fl[i] = D.f; L.kind[i] = D.kind; }
        if (L0.hooks) L0.hooks.dug.forEach(fn => { try { const m = fn(st, tx, ty, L); if (m) G.feed(st, m, 'good'); } catch (e) { } });
        L.rev++; U.dirty = true;
      }
      if (D.i >= D.tiles.length) { D.done = true; L.rooms.push({ x: D.x, y: D.y, f: D.f, deco: D.kind === 6 ? 'bunker_vuoto' : 'scavo' }); G.feed(st, `${BY[D.b].nome}: scavo finito.`, 'good'); }
    });
  }

  // =====================================================================================================================
  // LA BANDA AL LAVORO: i lavori segnati li fanno i membri liberi della Risacca
  // =====================================================================================================================
  const RIS = () => (typeof Risacca !== 'undefined' ? Risacca : null);
  const crewAll = st => { const R0 = RIS(); try { return R0 && R0.members ? R0.members(st) : []; } catch (e) { return []; } };
  const crewFree = st => crewAll(st).filter(n => !n.dead && !(n.jailedUntil > st.t) && (!n.ris.task || n.ris.task.src === 'autonomia'));   // chi fa di testa sua lascia e viene al covo
  const jobsLeft = st => (S(st).jobs || []).filter(j => !j.done).length;
  const JOB_MIN = { disbosca: 25, cava: 30, sterra: 10, spiana: 20, sgombra: 15, livella: 10 };
  function addJob(st, j) { const C = S(st); C.jobs = C.jobs || []; C.jid = (C.jid || 0) + 1; const J = Object.assign({ id: 'j' + C.jid, who: null, tries: 0, at: st.t }, j); C.jobs.push(J); return J; }
  // dove si mette chi lavora: una casella libera accanto (l'albero e la roccia non si calpestano)
  function standAt(x, y, r0) { const G = Gm(); for (let r = r0 || 1.2; r < 7; r += .6) for (let a = 0; a < 8; a++) { const qx = x + Math.cos(a * Math.PI / 4) * r, qy = y + Math.sin(a * Math.PI / 4) * r; if (G.walkM(qx, qy)) return { x: qx, y: qy }; } return { x, y }; }
  function jobsStep(st) {
    const C = st.covo; if (!C || !C.jobs || !C.jobs.length) return;
    const G = Gm(), R0 = RIS();
    C.jobs.forEach(J => {
      if (J.done) return;
      if (J.who) { const n = G.byId(st, J.who); if (n && !n.dead && n.ris && n.ris.task && n.ris.task.covoJob === J.id) return; J.who = null; if (++J.tries >= 3) { J.done = true; G.feed(st, 'Un lavoro del covo è rimasto a metà: nessuno riesce ad arrivarci.', 'bad'); } return; }
      const free = crewFree(st); if (!free.length || !R0 || !st.ris) return;
      const n = free.sort((a, b) => Math.hypot(a.x - J.x, a.y - J.y) - Math.hypot(b.x - J.x, b.y - J.y))[0];
      const o = J.uid ? C.obj.find(q => q.uid === J.uid) : null, b = o ? BY[o.id] : null;
      const at = standAt(J.x, J.y, b && b.fp ? Math.max(...b.fp) * TS() / 2 + .6 : 1.2);
      const mins = J.op === 'costruisci' ? (o ? o.wip : 60) : JOB_MIN[J.op] || 20;
      const label = J.op === 'costruisci' ? `tira su ${b ? b.nome.toLowerCase() : 'la costruzione'}` : { disbosca: 'abbatte un albero', cava: 'spacca la roccia', sterra: 'toglie l\'erba', spiana: 'spiana il terreno', sgombra: 'sgombra il terreno', livella: 'livella il suolo' }[J.op];
      n.ris.task = { id: st.ris.nextTask++, verb: 'cantiere', args: {}, steps: [{ k: 'go', x: at.x, y: at.y, name: 'il cantiere del covo' }, { k: 'hold', mins }, { k: 'do', fn: 'covoLavoro', job: J.id }], i: 0, started: st.t, desc: `${label} al covo`, src: 'cantiere', acc: 0, stepT: st.t, covoJob: J.id };
      n.path = []; n.goalPlace = null; n.wait = 0; n.inside = false; J.who = n.id;
    });
    if (C.jobs.length > 60) C.jobs = C.jobs.filter(j => !j.done);
  }
  // il lavoro finito: lo esegue il membro (Risacca lo chiama come un passo 'do')
  function jobDone(st, n, T0, s) {
    const C = S(st), J = (C.jobs || []).find(j => j.id === s.job); if (!J || J.done) return { ok: true };
    J.done = true; U.dirty = true;
    if (J.op === 'costruisci') { const o = C.obj.find(q => q.uid === J.uid); if (!o) return { ok: true }; delete o.wip; return { ok: true, msg: `${BY[o.id].nome} del covo: finita.` }; }
    const Cv = covoAt(st, J.x, J.y), bag = bauleOf(st, Cv) || O().inv(st), [tx, ty] = tileOf(J.x, J.y);
    const keepH = U.lvH; U.lvH = J.h === undefined ? null : J.h; const r = terrainDo(st, BY[J.op], tx, ty, bag); U.lvH = keepH;
    return { ok: true, msg: r.ok ? r.msg + (Cv ? ' La roba è nel baule del covo.' : '') : 'Lì non c\'era più niente da fare.' };
  }
  // i lavori della banda in coda: cosa e chi
  const jobsView = st => (S(st).jobs || []).filter(j => !j.done).map(j => ({ op: j.op, who: j.who ? (Gm().byId(st, j.who) || {}).first : null, x: j.x, y: j.y }));

  // =====================================================================================================================
  // L'OFFICINA DEL GARAGE: il mezzo parcheggiato accanto si potenzia coi materiali (gli stessi livelli dell'Officina di Dorino)
  // =====================================================================================================================
  const UPA = [
    ['motore', 'Motore', 3, l => ({ ferro: 1 + l, bulloni: 2 + l, olio_motore: 1, tubi: 1 }), 'più spinta e velocità di punta'],
    ['assetto', 'Assetto e gomme', 3, l => ({ molle: 2 + l, bulloni: 2, ferro: 1 }), 'più tenuta, sterzo più pronto'],
    ['nitro', 'Nitro', 2, l => ({ bombola: 1, tubi: 2, benzina: 2 + l }), 'Maiusc spinge di più'],
    ['corazza', 'Corazza saldata', 3, l => ({ lamiera: 3 + 2 * l, ferro: 2, bulloni: 2 }), 'regge meglio urti e colpi'],
  ];
  function carAt(st, uid) {
    const p = st.player, o = uid && st.covo ? st.covo.obj.find(q => q.uid === uid) : null, x = o ? o.x : p.x, y = o ? o.y : p.y;
    if (p.vehicle) { const v = st.vehicles.find(q => q.id === p.vehicle); if (v && v.kind !== 'vespa' && Math.hypot(v.x - x, v.y - y) < 12) return v; }
    let best = null, bd = 10; st.vehicles.forEach(v => { if (v.hidden || v.wreck || v.traffic || v.police || (v.rider && v.rider !== 'player')) return; const d = Math.hypot(v.x - x, v.y - y); if (d < bd) { bd = d; best = v; } });
    return best && best.kind !== 'vespa' ? best : null;
  }
  function autoView(st, uid) {
    const v = carAt(st, uid); if (!v) return null; const K = Gm().VK[v.kind]; v.up = v.up || {};
    const ups = UPA.map(([id, nome, top, cost, desc]) => { const lvl = id === 'corazza' ? (v.armor || 0) : (v.up[id] | 0), max = lvl >= top, c = max ? {} : cost(lvl); return { id, nome, top, lvl, max, cost: c, desc, miss: max ? [] : missing(st, { cost: c }) }; });
    const hp = Math.round(Math.max(0, v.hp) / K.hp * 100);
    if (hp < 100) { const c = { lamiera: 1 + Math.floor((100 - hp) / 35), bulloni: 1 }; ups.push({ id: 'ripara', nome: 'Carrozzeria', top: 0, lvl: 0, max: false, cost: c, desc: 'raddrizza le lamiere, cambia il vetro', miss: missing(st, { cost: c }) }); }
    return { nome: K.label, hp, ups };
  }
  function autoUp(st, id, uid) {
    const v = carAt(st, uid); if (!v) return { ok: false, msg: 'Non c\'è un mezzo accanto al ponte.' };
    const V = autoView(st, uid), u = V.ups.find(q => q.id === id); if (!u || u.max) return { ok: false, msg: 'Di più non si può.' };
    if (u.miss.length) return { ok: false, msg: `Mancano: ${u.miss.join(', ')}.` };
    pay(st, { cost: u.cost }); if (st.covo && uid) st.covo.busy[uid] = st.clock;
    if (id === 'ripara') { v.hp = Gm().VK[v.kind].hp; return { ok: true, msg: 'Lamiere raddrizzate, vetro nuovo. Come uscita di fabbrica, quasi.' }; }
    if (id === 'corazza') v.armor = (v.armor || 0) + 1; else v.up[id] = (v.up[id] | 0) + 1; v._tk = null;
    return { ok: true, msg: `${u.nome}: livello ${u.lvl + 1}. Si sente subito.` };
  }

  // =====================================================================================================================
  // IL BAULE: uno per covo, senza limiti. Nelle basi della Risacca è la loro scorta; a casa e nei covi reclamati è suo.
  // =====================================================================================================================
  function bauleOf(st, C) { if (!C) return null; if (/^b/.test(C.id)) { const b = (st.ris && st.ris.bases || []).find(x => 'b' + x.id === C.id); if (b) return (b.stock = b.stock || {}); } const K = S(st); K.bauli = K.bauli || {}; return (K.bauli[C.id] = K.bauli[C.id] || {}); }
  const bauleHere = st => { const p = st.player; let C = p.lv && p.lv.k === 'ug' ? UGC : covoAt(st, p.x, p.y); if (!C && p.indoor && st.me && st.me.home && G0().BUILDINGS[p.indoor.b] && G0().BUILDINGS[p.indoor.b].playerHome) C = covi(st).find(c => c.home); return bauleOf(st, C); };
  const G0 = () => Gm();
  const bauli = st => { const K = S(st); return Object.values(K.bauli || {}); };
  function baulePut(st, id, q) { const B0 = bauleHere(st); if (!B0) return { ok: false, msg: 'Qui non c\'è un baule.' }; const bag = O().inv(st), n = Math.min(q || 1, Math.floor(bag[id] || 0)); if (!n) return { ok: false, msg: 'Non ce l\'hai.' }; bag[id] -= n; if (bag[id] <= 0) delete bag[id]; B0[id] = (B0[id] || 0) + n; return { ok: true, msg: `Nel baule: ${O().nm(id)}${n > 1 ? ' ×' + n : ''}.` }; }
  function bauleTake(st, id, q) { const B0 = bauleHere(st); if (!B0) return { ok: false, msg: 'Qui non c\'è un baule.' }; const n = Math.min(q || 1, Math.floor(B0[id] || 0)); if (!n) return { ok: false, msg: 'Nel baule non c\'è.' }; const left = O().givePlayer(st, id, n), got = n - (left || 0); B0[id] -= got; if (B0[id] <= 0) delete B0[id]; return { ok: got > 0, msg: got ? `Prendi ${O().nm(id)}${got > 1 ? ' ×' + got : ''}.${left ? ' Il resto non ti sta addosso.' : ''}` : 'Non ti sta più niente addosso.' }; }
  function bauleAll(st, dir) { const B0 = bauleHere(st); if (!B0) return { ok: false, msg: 'Qui non c\'è un baule.' }; let n = 0;
    if (dir === 'metti') { const bag = O().inv(st); Object.keys(bag).forEach(k => { const c = O().CAT[k]; if (c && c.tool) return; const q = Math.floor(bag[k] || 0); if (q > 0) { baulePut(st, k, q); n += q; } }); return { ok: !!n, msg: n ? `Svuoti la borsa nel baule (${n}). Gli attrezzi restano a te.` : 'Non hai niente da mettere.' }; }
    for (const k of Object.keys(B0)) { const r = bauleTake(st, k, Math.floor(B0[k])); if (r.ok) n++; if (/non ti sta/i.test(r.msg)) return { ok: !!n, msg: 'Non ti sta più niente addosso: il resto rimane nel baule.' }; }
    return { ok: !!n, msg: n ? 'Prendi tutto dal baule.' : 'Il baule è vuoto.' }; }

  // =====================================================================================================================
  // LE POSTAZIONI: per la cucina, i banchi e i letti
  // =====================================================================================================================
  function stationsNear(st, r) {
    const p = st.player, lv = lvOf(st), out = [];
    (st.covo ? st.covo.obj : []).forEach(o => { const b = BY[o.id]; if (!b || !b.st || o.lv !== lv || o.wip) return; if (Math.hypot(o.x - p.x, o.y - p.y) < (r || 3)) { out.push(b.st); if (b.st2) out.push(b.st2); } });
    return out;
  }
  // il banco delle armi: le modifiche montate
  function playerWeapon(st, k, W) {
    const M = st.covo && st.covo.mods && st.covo.mods[k]; if (!M || !W) return W;
    const out = Object.assign({}, W); Object.keys(M).forEach(id => { const m = (MODS[k] || []).find(x => x[0] === id); if (!m) return; Object.entries(m[2]).forEach(([s, d]) => { out[s] = Math.max(s === 'spread' ? .002 : s === 'rate' ? .06 : 0, (out[s] || 0) + d); }); });
    return out;
  }
  function mod(st, k, id) {
    const m = (MODS[k] || []).find(x => x[0] === id); if (!m) return { ok: false, msg: 'Non si monta.' };
    const C = S(st); C.mods[k] = C.mods[k] || {}; if (C.mods[k][id]) return { ok: false, msg: 'È già montato.' };
    if (!st.player.arms || !st.player.arms[k]) return { ok: false, msg: 'Quell\'arma non ce l\'hai.' };
    const miss = missing(st, { cost: m[3] }); if (miss.length) return { ok: false, msg: `Mancano: ${miss.join(', ')}.` };
    pay(st, { cost: m[3] }); C.mods[k][id] = 1; C.busy.armi = st.clock; return { ok: true, msg: `${m[1]} montato.` };
  }
  const modsView = st => Object.keys(MODS).filter(k => st.player.arms && st.player.arms[k]).map(k => ({ k, nome: (Gm().WEAPONS[k] || {}).name || k, mods: MODS[k].map(([id, nome, eff, cost]) => ({ id, nome, eff, cost, on: !!(st.covo && st.covo.mods[k] && st.covo.mods[k][id]), miss: missing(st, { cost }) })) }));

  // =====================================================================================================================
  // IN SCENA: gli oggetti piazzati, la sagoma, la casella sotto il puntatore
  // =====================================================================================================================
  const U = { on: false, cat: 'strutture', sel: null, rot: 0, moving: null, pick: null, ghost: null, ghostId: null, mark: null, grp: null, scene: null, meshes: {}, dirty: true, gx: 0, gy: 0, ok: '', msg: '', msgT: 0, prevTop: false, stRef: null };
  function sceneSync(st) {
    const r = R(), scene = r && r.__models && r.__models.scene; if (!scene) return;
    if (U.scene !== scene) { U.scene = scene; U.grp = new THREE.Group(); U.grp.name = 'covo'; U.grp.userData.ugKeep = true; scene.add(U.grp); U.meshes = {}; }   // [sottosuolo] ugKeep: il bunker arredato si vede anche sotto terra
    if (U.stRef !== st) { Object.values(U.meshes).forEach(m => U.grp.remove(m)); U.meshes = {}; U.stRef = st; U.dirty = true; }
    if (U.cropKey !== cropKey(st) || U.ringOn !== U.on || U.jobsKey !== jobsKey(st) || (st.covo && st.covo.obj.some(o => U.meshes[o.uid] && !!U.meshes[o.uid].userData.wip !== !!o.wip))) U.dirty = true;
    const lv = lvOf(st), objs = st.covo ? st.covo.obj : [];
    if (U.dirty) {
      const want = new Set(objs.map(o => o.uid));
      Object.keys(U.meshes).forEach(k => { if (!want.has(k)) { U.grp.remove(U.meshes[k]); delete U.meshes[k]; } });
      const occ = new Set(); objs.forEach(o => { if (BY[o.id] && BY[o.id].wall) occ.add((o.lv || '') + '|' + tileOf(o.x, o.y).join(',')); });
      objs.forEach(o => { let m = U.meshes[o.uid]; const b = BY[o.id]; if (!b) return; const mask = b.wall ? wallMask(st, o, occ) : -1;
        if (!m || m.userData.mask !== mask || (m.userData.wip && !o.wip) || m.userData.kitWait && KIT[b.kit] && KIT[b.kit] !== 'wait') { if (m) U.grp.remove(m); m = b.wall ? wallModel(b, mask) : b.layer === 'tetto' ? roofModel(b) : model(b, o.seed); m.userData.mask = mask; if (o.wip) wipLook(m, b); m.userData.wip = !!o.wip; m.userData.kitWait = !!(b.kit && (!KIT[b.kit] || KIT[b.kit] === 'wait')); m.userData.uid = o.uid; m.userData.roof = b.layer === 'tetto'; m.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } }); U.grp.add(m); U.meshes[o.uid] = m; }
        // le baracche un po' storte e fuori squadra: il campo cresce a mano, non col righello
        const jr = b.sh && o.seed ? rngOf(o.seed + 7) : null, jx = jr ? (jr() - .5) * .35 : 0, jz = jr ? (jr() - .5) * .35 : 0, ja = jr ? (jr() - .5) * .12 : 0;
        m.position.set(o.x + jx, hAt(st, o.x, o.y, o.lv), o.y + jz); m.rotation.y = (b.wall && mask !== 0 ? 0 : -o.rot) + ja; m.userData.lv = o.lv; });
      // [survival] l'orto, gli scavi da edificio, i picchetti del campo
      Object.keys(U.meshes).filter(k => /^(crop|dig|ring):/.test(k)).forEach(k => { U.grp.remove(U.meshes[k]); delete U.meshes[k]; });
      Object.values((st.covo && st.covo.crops) || {}).forEach(c => { const wet = c.wet > st.t, m = cropModel(c, wet), x = (c.tx + .5) * TS(), y = (c.ty + .5) * TS(); m.position.set(x, hAt(st, x, y, null), y); m.userData.lv = null; U.grp.add(m); U.meshes['crop:' + c.tx + ',' + c.ty] = m; });
      ((st.covo && st.covo.digs) || []).forEach(D => { if (D.done) return; const m = digModel(D); m.userData.lv = 'ug'; U.grp.add(m); U.meshes['dig:' + D.id] = m; });
      if (U.on) covi(st).forEach(C0 => { const m = ringModel(C0); m.position.set(C0.x, hAt(st, C0.x, C0.y, null), C0.y); m.userData.lv = null; U.grp.add(m); U.meshes['ring:' + C0.id] = m; });
      U.cropKey = cropKey(st); U.ringOn = U.on;
      // [cantiere] i lavori segnati per la banda: un nastro bianco e rosso sulla casella
      Object.keys(U.meshes).filter(k => /^job:/.test(k)).forEach(k => { U.grp.remove(U.meshes[k]); delete U.meshes[k]; });
      (st.covo && st.covo.jobs || []).forEach(J => { if (J.done || J.op === 'costruisci') return; const m = jobMark(J); m.position.set(J.x, hAt(st, J.x, J.y, null), J.y); m.userData.lv = null; U.grp.add(m); U.meshes['job:' + J.id] = m; });
      U.dirty = objs.some(o => U.meshes[o.uid] && U.meshes[o.uid].userData.kitWait); U.jobsKey = jobsKey(st);
    }
    // solo quello del livello dove sei (sotto terra si vede il bunker, sopra il covo)
    // [survival] sotto un tetto del campo i tetti attorno si aprono (si vede dentro casa)
    const p0 = st.player, [ptx, pty] = tileOf(p0.x, p0.y), under = !lv && (st.covo ? st.covo.obj : []).some(o => BY[o.id] && BY[o.id].layer === 'tetto' && o.tiles && o.tiles.some(q => Math.abs(q[0] - ptx) <= 1 && Math.abs(q[1] - pty) <= 1));
    Object.values(U.meshes).forEach(m => { m.visible = (m.userData.lv || null) === lv && !(under && m.userData.roof && Math.hypot(m.position.x - p0.x, m.position.z - p0.y) < 12); });
    animate(st);
  }
  // [survival] LE BARACCHE: un modello per tipo, con le variazioni del seme (colori, toppe, veranda, finestre, storture)
  const rngOf = seed => { let a = (seed * 2654435761) >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const FAV = ['#d8503a', '#3a8ac8', '#e8c040', '#4aa86a', '#e87a3a', '#9a5ac8', '#e8e0cc', '#4ac0b8', '#c83a6a', '#8ab040'];   // le tinte della baraccopoli
  const pickR = (r, a) => a[Math.floor(r() * a.length)];
  // il tetto di foglie di palma: due falde, la frangia che pende, i colmi legati
  // la paglia: fili chiari e scuri che scendono lungo la falda, a file sovrapposte
  const STRAW = {}; function strawMat(c) { if (STRAW[c]) return STRAW[c]; const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 260; i++) { x.fillStyle = Math.random() < .5 ? 'rgba(60,40,10,.35)' : 'rgba(255,240,180,.3)'; x.fillRect(Math.random() * 64, Math.random() * 64, 1, 5 + Math.random() * 9); } for (let j = 0; j < 4; j++) { x.fillStyle = 'rgba(40,25,5,.45)'; x.fillRect(0, j * 16 + 14, 64, 2); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return (STRAW[c] = new THREE.MeshLambertMaterial({ map: t })); }
  function thatch(g, w, d, h, y0, r, col) {
    const c = col || pickR(r, ['#b8a060', '#a89050', '#c8b070', '#9a8a50', '#8a7a48']), sl = Math.hypot(w / 2 + .5, h), sm0 = strawMat(c);
    for (const s0 of [-1, 1]) { const f = new THREE.Group(); f.position.set(s0 * (w / 4 + .12), y0 + h / 2, 0); f.rotation.z = -s0 * Math.atan2(h, w / 2 + .5); g.add(f);
      for (let i = 0; i < 4; i++) { const ly = box(f, sl + .1 - i * .25, .1, d + .9 - i * .05, c, s0 * i * .12, .04 + i * .045 - .06, 0); ly.material = sm0; }
      for (let k = 0; k < Math.round(d * 3); k++) { const fr = box(f, .06, .35 + r() * .2, .1, c, s0 * (sl / 2 - .02), -.18, -d / 2 - .4 + k * (d + .8) / Math.round(d * 3)); fr.rotation.z = s0 * .4; } }
    box(g, .22, .22, d + 1, '#8a7038', 0, y0 + h + .04, 0); for (const z of [-d / 2, 0, d / 2]) box(g, .3, .12, .3, '#6a5028', 0, y0 + h + .12, z);
    // i timpani di foglie
    for (const z of [-1, 1]) { const tri = new THREE.Mesh(new THREE.ConeGeometry(w / 2 + .1, h, 3, 1), sm0); tri.scale.z = .05; tri.position.set(0, y0 + h / 2, z * (d / 2 + .1)); tri.rotation.y = Math.PI / 6 * 0; g.add(tri); }
  }
  // le pareti di una baracca, lato per lato, con la porta davanti (+z) e qualche finestra a sportello
  function shackWalls(g, w, d, h, r, mat) {
    const sides = [[0, -d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]];
    const panel = (gg, len, ax) => { // pannelli di colore e materiale diverso, uno accanto all'altro
      let x = -len / 2; while (x < len / 2 - .05) { const pw = Math.min(len / 2 - x, .6 + r() * .9), m0 = mat === 'lamiera' || (mat === 'misto' && r() < .5) ? 'lamiera' : 'assi', c = m0 === 'lamiera' ? pickR(r, FAV.concat(['#8a9096', '#7a8288', '#9aa0a6'])) : pickR(r, ['#8a6a44', '#7a5634', '#9a7a54', '#6a4a2c'].concat(r() < .4 ? FAV : []));
        const pz = box(gg, pw, h - (r() < .2 ? .2 : 0), .08, c, x + pw / 2, h / 2, 0); pz.rotation.z = (r() - .5) * .03;
        if (m0 === 'lamiera') for (let k = 0; k < Math.floor(pw / .12); k++) box(gg, .03, h - .1, .1, shade(c, -.18), x + .06 + k * .12, h / 2, 0); else for (let k = 1; k < 4; k++) box(gg, pw, .02, .1, shade(c, -.25), x + pw / 2, k * h / 4, 0);
        if (r() < .12) box(gg, .35, .35, .1, pickR(r, FAV), x + pw / 2, h * .4, .02);   // una toppa
        x += pw; } };
    sides.forEach(([x0, z0, len, ry]) => { const gg = new THREE.Group(); gg.position.set(x0, 0, z0); gg.rotation.y = ry; g.add(gg); panel(gg, len, 'x'); if (r() < .6) { const wx = (r() - .5) * (len - 1.2); box(gg, .7, .55, .12, '#1a1a1e', wx, h * .62, .02); box(gg, .75, .08, .14, '#e8e0cc', wx, h * .62 - .3, .03); const sp0 = box(gg, .7, .55, .05, pickR(r, FAV), wx, h * .62 + .55, .08); sp0.rotation.x = -.6; } });
    // davanti: due mezzi pannelli e la porta (spesso una tenda)
    const front = new THREE.Group(); front.position.set(0, 0, d / 2); g.add(front); const side = (w - 1.1) / 2;
    const l = new THREE.Group(); l.position.x = -w / 2 + side / 2; front.add(l); panel(l, side, 'x'); const rr = new THREE.Group(); rr.position.x = w / 2 - side / 2; front.add(rr); panel(rr, side, 'x');
    box(front, 1.1, h - 2.05, .08, pickR(r, FAV), 0, 2.05 + (h - 2.05) / 2, 0);
    if (r() < .5) tag(box(front, 1, 2, .04, pickR(r, ['#c83a3a', '#e8c040', '#3a8ac8', '#e8e0cc']), 0, 1, .02), 'tenda'); else tag(box(front, .95, 2, .06, '#5a3a20', -.2, 1, 0), 'anta');
  }
  function shade(c, k) { const col = new THREE.Color(c); col.offsetHSL(0, 0, k); return '#' + col.getHexString(); }
  function lamieraRoof(g, w, d, y0, r, slope) {   // la tettoia di lamiera a una falda, coi pezzi di colori diversi e le pietre sopra (il vento)
    const f = new THREE.Group(); f.position.set(0, y0, 0); f.rotation.x = slope || .14; g.add(f); let x = -w / 2 - .3;
    while (x < w / 2 + .3) { const pw = Math.min(w / 2 + .3 - x, .8 + r() * .6), c = pickR(r, ['#8a9096', '#7a8288', '#a87050', '#9a6040'].concat(r() < .3 ? FAV : [])); box(f, pw + .05, .05, d + .6, c, x + pw / 2, 0, 0); for (let k = 0; k < Math.floor(pw / .15); k++) box(f, .04, .05, d + .6, shade(c, -.15), x + .08 + k * .15, .03, 0); x += pw; }
    for (let k = 0; k < 3; k++) { const st0 = new THREE.Mesh(new THREE.DodecahedronGeometry(.13, 0), lm('#8a8478')); st0.position.set((r() - .5) * w, .12, (r() - .5) * d); f.add(st0); }
    if (r() < .5) { const tyre = new THREE.Mesh(new THREE.TorusGeometry(.28, .1, 6, 10), lm('#1a1a1a')); tyre.rotation.x = Math.PI / 2; tyre.position.set((r() - .5) * w * .6, .1, (r() - .5) * d * .6); f.add(tyre); }
  }
  function porch(g, w, z0, y0, r, roofCol) {   // la veranda: due pali, la tettoia, una panca o un'amaca
    for (const x of [-w / 2 + .2, w / 2 - .2]) box(g, .12, y0, .12, '#6a4a2c', x, y0 / 2, z0 + 1.2);
    const tr = box(g, w + .3, .05, 1.5, roofCol || pickR(r, ['#8a9096', '#a87050', '#c8b070']), 0, y0, z0 + .7); tr.rotation.x = .18;
    if (r() < .5) { box(g, 1.4, .08, .35, '#7a5634', -w / 4, .45, z0 + .6); for (const x of [-.6, .6]) box(g, .06, .45, .3, '#5a4028', -w / 4 + x, .22, z0 + .6); }
    else { const am = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, w - .6, 10, 1, true, Math.PI, Math.PI), lm(pickR(r, FAV), null)); am.material.side = THREE.DoubleSide; am.rotation.z = Math.PI / 2; am.position.set(0, 1.1, z0 + 1.15); g.add(am); }
    if (r() < .6) { const pt = cyl(g, .2, .16, .35, '#a85a3a', w / 2 - .4, .17, z0 + .4); const pl = new THREE.Mesh(new THREE.DodecahedronGeometry(.25, 0), lm('#3a7a3a')); pl.position.set(w / 2 - .4, .5, z0 + .4); g.add(pl); }
  }
  function shackModel(b, seed) {
    const g = new THREE.Group(), r = rngOf(seed || 1), S0 = TS(), w = (b.fp ? b.fp[0] : 1) * S0, d = (b.fp ? b.fp[1] : 1) * S0;
    switch (b.sh) {
      case 'bohio': { const h = 2.3; for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) cyl(g, .09, .11, h, '#6a4a2c', x * (w / 2 - .1), h / 2, z * (d / 2 - .1)); shackWalls(g, w - .2, d - .2, h, r, 'assi'); thatch(g, w, d, 1.7 + r() * .4, h, r); if (r() < .7) porch(g, w, d / 2, 2, r, '#b8a060'); break; }
      case 'lamiere': { const h = 2.2 + r() * .3; shackWalls(g, w - .1, d - .1, h, r, 'misto'); lamieraRoof(g, w, d, h + .15, r); porch(g, w, d / 2, 2.05, r); if (r() < .5) { cyl(g, .02, .02, 1.8, '#3a3a3a', w / 2 - .3, h + 1, -d / 2 + .3); box(g, .5, .04, .3, '#9aa0a8', w / 2 - .3, h + 1.8, -d / 2 + .3); } break; }
      case 'palafitta': { const up = 1.4, h = 2.2; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) cyl(g, .1, .12, up, '#5a4028', i * (w / 2 - .25), up / 2, j * (d / 2 - .25)); box(g, w + .4, .12, d + .4, '#7a5634', 0, up, 0); const top = new THREE.Group(); top.position.y = up + .06; g.add(top); shackWalls(top, w - .8, d - 1.2, h, r, r() < .5 ? 'assi' : 'misto'); thatch(top, w - .6, d - 1, 1.4, h, r); for (let k = 0; k < 6; k++) box(g, .7, .06, .22, '#6a4a2c', 0, k * up / 6 + .1, d / 2 + .3 + (6 - k) * .22); for (const x of [-w / 2 - .1, w / 2 + .1]) box(g, .05, .9, d + .3, '#6a4a2c', x, up + .5, 0); break; }
      case 'tonda': { const R0 = Math.min(w, d) / 2 - .15, h = 2; const wall = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0 + .05, h, 16, 1, true, .5, 2 * Math.PI - 1), lm(pickR(r, ['#b8865a', '#a87a50', '#c8966a']))); wall.material.side = THREE.DoubleSide; wall.position.y = h / 2; wall.rotation.y = Math.PI / 2 - .5 + Math.PI; g.add(wall); for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; cyl(g, .05, .05, h, '#6a5030', Math.cos(a) * R0, h / 2, Math.sin(a) * R0); } const cone = new THREE.Mesh(new THREE.ConeGeometry(R0 + .6, 1.9, 14), strawMat(pickR(r, ['#b8a060', '#a89050', '#9a8a50']))); cone.position.y = h + .9; g.add(cone); cyl(g, .05, .02, .6, '#6a5030', 0, h + 2, 0); box(g, .9, 1.9, .05, pickR(r, FAV), 0, .95, R0 + .02); break; }
      case 'comando': { const h = 2.6; shackWalls(g, w - .2, d - .3, h, r, 'assi'); lamieraRoof(g, w + .4, d + .4, h + .3, r, .1); porch(g, w, d / 2, 2.4, r, '#a87050');
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .5), new THREE.MeshBasicMaterial({ map: textTex('COMANDO', '#e8e0cc', '#7a1a1a') })); sg.position.set(0, h + .1, d / 2 + .06); g.add(sg);
        cyl(g, .04, .05, 5, '#8a8a90', -w / 2 + .3, 2.5, -d / 2 + .3); tag(box(g, 1.3, .8, .02, '#c8202a', -w / 2 + .95, 4.4, -d / 2 + .3), 'telo'); box(g, 1.3, .27, .025, '#1a1a1a', -w / 2 + .95, 4.13, -d / 2 + .3);
        cyl(g, .015, .015, 3.5, '#c8c8d0', w / 2 - .4, h + 1.8, -d / 2 + .4); for (let k = 0; k < 3; k++) box(g, .8 - k * .2, .02, .02, '#c8c8d0', w / 2 - .4, h + 2.6 + k * .35, -d / 2 + .4); break; }
      case 'infermeria': { const h = 2.3; for (const s0 of [-1, 1]) { const t0 = box(g, w * .6, .04, d, '#d8d4c4', s0 * w * .25, h * .62, 0); t0.rotation.z = -s0 * .75; } for (const z of [-d / 2, d / 2]) cyl(g, .04, .04, h + .2, '#6a6a6a', 0, (h + .2) / 2, z); for (const s0 of [-1, 1]) { box(g, .5, .12, .04, '#c8202a', s0 * w * .2, h * .66, d / 2 + .02).rotation.z = -s0 * .75; } const cr = new THREE.Group(); cr.position.set(0, h * .5, d / 2 + .05); g.add(cr); box(cr, .5, .16, .02, '#c8202a', 0, 0, 0); box(cr, .16, .5, .02, '#c8202a', 0, 0, 0); for (let k = 0; k < 2; k++) box(g, .7, .4, 1.8, '#5a6a4a', -w / 4 + k * w / 2, .2, 0); break; }
      case 'ramada': { const h = 2.3; for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) cyl(g, .08, .1, h, '#6a4a2c', x * (w / 2 - .1), h / 2, z * (d / 2 - .1)); thatch(g, w, d, 1.1, h, r); box(g, w - 1, .08, .8, '#7a5634', -.3, .8, 0); for (const z of [-.7, .7]) box(g, w - 1, .06, .3, '#6a4a2c', -.3, .45, z); for (let k = 0; k < 5; k++) cyl(g, .05, .05, .14, pickR(r, ['#e8e0cc', '#c83a3a', '#3a8ac8']), -1.3 + k * .5, .91, (r() - .5) * .4);
        for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, st0 = new THREE.Mesh(new THREE.DodecahedronGeometry(.17, 0), lm('#7a7468')); st0.position.set(w / 2 - .7 + Math.cos(a) * .4, .1, Math.sin(a) * .4); g.add(st0); } tag(cyl(g, 0, .22, .55, '#ff7a20', w / 2 - .7, .35, 0, '#ff5a10'), 'fiamma'); cyl(g, .2, .16, .25, '#2a2a2e', w / 2 - .7, .7, 0); break; }
      case 'torretta': { const h = 5; for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p0 = cyl(g, .06, .08, h, '#b8a060', x * .75, h / 2, z * .75); p0.rotation.z = -x * .04; } for (let y = 1; y < h; y += 1.2) for (const ax of [0, 1]) box(g, ax ? .05 : 1.6, .05, ax ? 1.6 : .05, '#a89050', 0, y, 0).rotation.y = (y % 2) * .785; box(g, 1.9, .08, 1.9, '#8a6a44', 0, h, 0); for (const z of [-1, 1]) box(g, 1.9, .6, .05, '#a89050', 0, h + .3, z * .95); const cn = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1, 4), strawMat('#b8a060')); cn.rotation.y = Math.PI / 4; cn.position.y = h + 1.6; g.add(cn); for (let k = 0; k < 4; k++) cyl(g, .04, .04, 1.1, '#6a4a2c', (k % 2 ? 1 : -1) * .85, h + .6, (k < 2 ? 1 : -1) * .85); for (let k = 0; k < 10; k++) box(g, .5, .05, .08, '#6a4a2c', 0, .3 + k * .45, 1.0); break; }
      case 'latrina': { box(g, 1.2, 2.1, 1.2, pickR(r, ['#7a5634', '#8a9096', '#6a4a2c']), 0, 1.05, 0); box(g, 1.4, .06, 1.4, '#8a9096', 0, 2.15, 0).rotation.x = .1; box(g, .7, 1.8, .04, pickR(r, FAV), 0, .95, .61); box(g, .12, .2, .02, '#ffffff', 0, 1.6, .64); break; }
      case 'cisterna': { for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, .1, 1.6, .1, '#6a4a2c', x * .55, .8, z * .55); box(g, 1.3, .1, 1.3, '#7a5634', 0, 1.6, 0); cyl(g, .62, .62, 1.3, pickR(r, ['#3a5a8a', '#8a9096', '#2a6a4a']), 0, 2.3, 0); cyl(g, .64, .64, .06, '#5a5a5a', 0, 2.95, 0); cyl(g, .04, .04, 1.8, '#5a5a5a', .7, 1.6, 0); cyl(g, .05, .05, .3, '#7a7a7a', .7, .7, .2).rotation.x = Math.PI / 2; break; }
      case 'amaca': { for (const x of [-1.4, 1.4]) cyl(g, .07, .09, 2, '#6a4a2c', x, 1, 0); const am = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, 2.2, 12, 1, true, Math.PI, Math.PI), lm(pickR(r, FAV))); am.material.side = THREE.DoubleSide; am.rotation.z = Math.PI / 2; am.position.y = 1.05; g.add(am); for (const x of [-1.25, 1.25]) { const c0 = cyl(g, .01, .01, .5, '#d8d0c0', x, 1.45, 0); c0.rotation.z = x > 0 ? .9 : -.9; } break; }
      case 'stendino': { for (const x of [-1.6, 1.6]) cyl(g, .05, .06, 2.1, '#6a4a2c', x, 1.05, 0); cyl(g, .01, .01, 3.2, '#d8d0c0', 0, 1.95, 0).rotation.z = Math.PI / 2; for (let k = 0; k < 6; k++) { const pn = box(g, .35 + r() * .25, .45 + r() * .35, .02, pickR(r, FAV.concat(['#e8e8e8', '#5a6a8a'])), -1.3 + k * .52, 1.65 - r() * .15, 0); tag(pn, 'telo'); } break; }
      case 'striscione': { for (const x of [-1.8, 1.8]) cyl(g, .06, .07, 2.6, '#6a4a2c', x, 1.3, 0); const bn = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .8), new THREE.MeshBasicMaterial({ map: textTex(pickR(r, ['LA TERRA A CHI LA LAVORA', 'VIA LA TUTELA', 'IL MARE È DI TUTTI', 'RISACCA VIVE']), '#c8202a', '#e8e0cc', true), side: THREE.DoubleSide })); bn.position.y = 2.1; g.add(bn); tag(bn, 'telo'); break; }
      case 'falo': { for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, s1 = new THREE.Mesh(new THREE.DodecahedronGeometry(.2, 0), lm('#7a7468')); s1.position.set(Math.cos(a) * .6, .1, Math.sin(a) * .6); g.add(s1); } for (let k = 0; k < 3; k++) { const l = cyl(g, .06, .06, .8, '#5a3a20', 0, .15, 0); l.rotation.z = Math.PI / 2; l.rotation.y = k * 1.05; } tag(cyl(g, 0, .3, .8, '#ff8a20', 0, .5, 0, '#ff5a10'), 'fiamma'); for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + .4, lg = cyl(g, .16, .16, 1.4, '#6a4a2c', Math.cos(a) * 1.8, .16, Math.sin(a) * 1.8); lg.rotation.z = Math.PI / 2; lg.rotation.y = -a + Math.PI / 2; } break; }
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  function textTex(t, fg, bg, brush) { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 512, 128); if (brush) for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(Math.random() * 512, Math.random() * 128, 30, 3); } x.fillStyle = fg; x.font = `bold ${t.length > 16 ? 40 : 64}px ${brush ? 'Impact, Arial Black' : 'Arial'}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.save(); if (brush) x.rotate(-.02); x.fillText(t, 256, 66); x.restore(); const tx = new THREE.CanvasTexture(c); return tx; }
  // [survival] I PEZZI CHE SI UNISCONO: muri, finestre, porte, muretti, recinti e cancelli guardano i vicini (E, S, O, N) e si raccordano.
  // Dritto: il pezzo intero lungo la fila (la finestra e la porta solo qui). Angoli e incroci: un pilastro e un mezzo muro verso ogni vicino.
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  function wallMask(st, o, occ) { const [tx, ty] = tileOf(o.x, o.y); let m = 0; DIRS.forEach(([dx, dy], k) => { if (occ.has((o.lv || '') + '|' + (tx + dx) + ',' + (ty + dy))) m |= 1 << k; }); return m; }
  function wallModel(b, mask) {
    const g = new THREE.Group(), S0 = TS(), c = b.col || '#7a5634', fence = b.mk === 'recinto' || b.mk === 'cancello', H = fence ? 1.1 : b.low ? 1 : 2.6, T0 = fence ? .1 : .24;
    const straight = mask === 5 ? 'x' : mask === 10 ? 'z' : mask === 1 || mask === 4 ? 'x' : mask === 2 || mask === 8 ? 'z' : mask === 0 ? 'x' : null;
    const lines = (gg, len, ax) => { for (let i = 1; i < (b.low ? 3 : 6); i++) box(gg, ax === 'x' ? len + .01 : T0 + .02, .03, ax === 'x' ? T0 + .02 : len + .01, b.id === 'muro_assi' ? '#4a3420' : b.id === 'muro_lamiera' ? '#5a6068' : '#5a463a', 0, i * H / (b.low ? 3 : 6), 0); };
    // il pezzo dritto, lungo l'asse x locale (poi si gira)
    const full = (gg) => {
      if (fence) { for (const x of [-S0 / 2 + .05, 0, S0 / 2 - .05]) box(gg, .12, 1.15, .12, c, x, .57, 0); box(gg, S0, .08, .06, c, 0, .85, 0); box(gg, S0, .08, .06, c, 0, .45, 0); if (b.mk === 'cancello') { for (let i = 0; i < 7; i++) box(gg, .08, .95, .05, '#6a4a2c', -.75 + i * .25, .55, .04); box(gg, 1.7, .06, .05, '#6a4a2c', 0, .3, .04).rotation.z = .5; } return; }
      if (b.mk === 'porta') { box(gg, .22, H, T0, c, -S0 / 2 + .11, H / 2, 0); box(gg, .22, H, T0, c, S0 / 2 - .11, H / 2, 0); box(gg, S0, .45, T0, c, 0, H - .22, 0); box(gg, 1.56, .08, T0 + .06, '#e8e0cc', 0, 2.17, 0); tag(box(gg, 1.0, 2.1, .06, '#5a3a20', -.25, 1.05, 0), 'anta'); box(gg, .08, .08, .1, '#c8a040', .15, 1.05, .05); return; }
      if (b.win) {
        box(gg, S0, .9, T0, c, 0, .45, 0); box(gg, S0, .55, T0, c, 0, H - .27, 0); box(gg, .4, 1.15, T0, c, -S0 / 2 + .2, 1.475, 0); box(gg, .4, 1.15, T0, c, S0 / 2 - .2, 1.475, 0);
        const gl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.15, .04), new THREE.MeshStandardMaterial({ color: '#9ac0d8', transparent: true, opacity: .45, roughness: .1, metalness: .3 })); gl.position.set(0, 1.475, 0); gg.add(gl); tag(gl, 'vetro');
        box(gg, 1.24, .06, T0 + .04, '#e8e0cc', 0, .92, 0); box(gg, 1.24, .06, T0 + .04, '#e8e0cc', 0, 2.03, 0); box(gg, .05, 1.15, T0 + .04, '#e8e0cc', 0, 1.475, 0);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(gg, .55, 1.15, .04, '#3a6a4a', sx * .9, 1.475, sz * (T0 / 2 + .03));
        box(gg, 1.3, .08, .25, '#e8e0cc', 0, .9, T0 / 2 + .08); return;
      }
      box(gg, S0, H, T0, c, 0, H / 2, 0); lines(gg, S0, 'x'); if (b.low) box(gg, S0 + .04, .1, T0 + .1, '#c8c2b6', 0, H + .05, 0);
    };
    if (straight) { const gg = new THREE.Group(); full(gg); if (straight === 'z') gg.rotation.y = Math.PI / 2; g.add(gg); return g; }
    // angoli e incroci: pilastro + mezzi pezzi verso i vicini (porte e finestre diventano muro)
    const half = { col: c, mk: b.mk === 'porta' ? 'muro' : b.mk === 'cancello' ? 'recinto' : b.mk };
    if (fence) box(g, .14, 1.2, .14, c, 0, .6, 0); else box(g, T0 + .04, H, T0 + .04, c, 0, H / 2, 0);
    DIRS.forEach(([dx, dy], k) => {
      if (!(mask & (1 << k))) return; const gg = new THREE.Group(); gg.rotation.y = -Math.atan2(dy, dx); g.add(gg);
      if (half.mk === 'recinto') { box(gg, .1, 1.1, .1, c, S0 / 2 - .05, .55, 0); box(gg, S0 / 2, .08, .06, c, S0 / 4, .85, 0); box(gg, S0 / 2, .08, .06, c, S0 / 4, .45, 0); }
      else { box(gg, S0 / 2, H, T0, c, S0 / 4, H / 2, 0); if (b.low) box(gg, S0 / 2 + .02, .1, T0 + .1, '#c8c2b6', S0 / 4, H + .05, 0); }
    });
    return g;
  }
  // il tetto: una casella di coppi (file di tegole) o di lamiera ondulata, con la gronda; si apre quando ci sei sotto
  function roofModel(b) {
    const g = new THREE.Group(), S0 = TS(), y = 2.62;
    if (b.id === 'tetto_lamiera') { box(g, S0 + .1, .06, S0 + .1, b.col, 0, y, 0); for (let i = 0; i < 8; i++) box(g, .1, .05, S0 + .1, '#6a7078', -S0 / 2 + .13 + i * .25, y + .05, 0); }
    else { box(g, S0 + .12, .1, S0 + .12, '#6a3a2a', 0, y, 0); for (let i = 0; i < 6; i++) { const r0 = new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, S0 + .1, 6, 1, false, 0, Math.PI), lm(i % 2 ? '#a8483a' : '#b85a44')); r0.rotation.x = Math.PI / 2; r0.rotation.y = Math.PI; r0.position.set(-S0 / 2 + .17 + i * .34, y + .05, 0); g.add(r0); } }
    box(g, .12, .12, S0 + .12, '#4a3020', S0 / 2 + .02, y - .08, 0); box(g, .12, .12, S0 + .12, '#4a3020', -S0 / 2 - .02, y - .08, 0);
    g.userData.roof = true; return g;
  }
  // l'orto: il solco (scuro se bagnato) e le piante, che crescono in quattro fasi
  function cropModel(c, wet) {
    const g = new THREE.Group(), S0 = TS(), st0 = c.stage, k = c.kind, f = (st0 + 1) / 5;
    if (k !== 'albero') { box(g, S0 - .1, .1, S0 - .1, wet ? '#2e2016' : '#5a4430', 0, .05, 0); for (const z of [-.6, 0, .6]) box(g, S0 - .2, .08, .22, wet ? '#3a2a1c' : '#6a523a', 0, .12, z); if (wet) box(g, S0 - .3, .01, S0 - .3, '#4a5a6a', 0, .1, 0).material = new THREE.MeshStandardMaterial({ color: '#3a4a5a', transparent: true, opacity: .25, roughness: .05 }); }
    const rows = [-.6, 0, .6], cols = [-.6, 0, .6];
    if (k === 'patate') rows.forEach(z => cols.forEach(x => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.12 + .16 * f, 0), lm(st0 >= 4 ? '#6a7a3a' : '#4a7a3a')); m.position.set(x, .18 + .1 * f, z); m.scale.y = .7; g.add(m); if (st0 >= 4) { const fl = new THREE.Mesh(new THREE.SphereGeometry(.04, 5, 4), lm('#e8e0f0')); fl.position.set(x, .32 + .1 * f, z); g.add(fl); } }));
    if (k === 'pomodori') rows.forEach(z => [-.5, .5].forEach(x => { cyl(g, .02, .02, 1.3, '#8a6a44', x, .65, z); const v = cyl(g, .06 + .06 * f, .1 + .08 * f, .2 + .9 * f, '#3a6a2a', x, .15 + .45 * f, z); v.scale.x = 1.2; if (st0 >= 3) for (let i = 0; i < 4; i++) { const t0 = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 5), lm(st0 >= 4 ? '#d8322a' : '#8aa83a')); t0.position.set(x + Math.cos(i * 1.7) * .13, .4 + i * .15, z + Math.sin(i * 1.7) * .13); g.add(t0); } }));
    if (k === 'cipolle') rows.forEach(z => [-.6, -.3, 0, .3, .6].forEach(x => { for (let i = 0; i < 3; i++) { const l = cyl(g, .008, .02, .1 + .35 * f, '#5a9a4a', x + (i - 1) * .04, .15 + .17 * f, z); l.rotation.z = (i - 1) * .3; } if (st0 >= 3) { const b0 = new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), lm('#d8c8a8')); b0.position.set(x, .14, z); g.add(b0); } }));
    if (k === 'orzo') for (let i = 0; i < 24; i++) { const x = -.75 + (i % 6) * .3, z = -.75 + Math.floor(i / 6) * .5, h = .15 + .75 * f; const s0 = cyl(g, .012, .015, h, st0 >= 4 ? '#d8b860' : st0 >= 3 ? '#a8b050' : '#6a9a4a', x, .12 + h / 2, z); s0.rotation.z = Math.sin(i) * .1; if (st0 >= 3) cyl(g, .03, .02, .14, st0 >= 4 ? '#e8c870' : '#b8c060', x, .14 + h, z); }
    if (k === 'albero') { box(g, .7, .08, .7, '#4a3828', 0, .04, 0); cyl(g, .03 + .04 * f, .05 + .05 * f, .4 + 1.6 * f, '#5a4028', 0, .2 + .8 * f, 0); const cr = new THREE.Mesh(new THREE.ConeGeometry(.2 + .7 * f, .4 + 1.4 * f, 7), lm('#3a6a32')); cr.position.y = .5 + 1.9 * f; g.add(cr); }
    if (!wet && k && k !== 'albero' && st0 < 4) { const d = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 5), new THREE.MeshBasicMaterial({ color: '#7ab8ff' })); d.position.y = 1.4; d.name = 'goccia'; g.add(d); }   // la goccia: ha sete
    if (k && k !== 'albero' && st0 >= 4) { const s1 = new THREE.Mesh(new THREE.OctahedronGeometry(.11), new THREE.MeshBasicMaterial({ color: '#ffd060' })); s1.position.y = 1.5; s1.name = 'pronto'; g.add(s1); }   // maturo: si raccoglie
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g;
  }
  // il campo: picchetti col nastro attorno, si vedono quando costruisci
  function ringModel(C) { const g = new THREE.Group(), n = Math.max(16, Math.round(C.r * 1.4)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * C.r, z = Math.sin(a) * C.r; box(g, .08, .9, .08, '#c8a060', x, .45, z); const a2 = (i + 1) / n * Math.PI * 2, x2 = Math.cos(a2) * C.r, z2 = Math.sin(a2) * C.r, L0 = Math.hypot(x2 - x, z2 - z), r0 = box(g, L0, .05, .02, i % 2 ? '#c83a2a' : '#e8e0cc', (x + x2) / 2, .8, (z + z2) / 2); r0.rotation.y = -Math.atan2(z2 - z, x2 - x); } return g; }
  // lo scavo da edificio in corso: la terra ancora da togliere, mezza trasparente, col bordo tratteggiato
  function digModel(D) { const g = new THREE.Group(), S0 = TS(), eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(S0 - .1, 2.3, S0 - .1)), dm = new THREE.LineDashedMaterial({ color: '#ffd060', dashSize: .25, gapSize: .15 }), em = new THREE.MeshLambertMaterial({ color: '#6a4c30', transparent: true, opacity: .35, depthWrite: false });
    D.tiles.slice(D.i).forEach(([tx, ty], k) => { const l = new THREE.LineSegments(eg, dm); l.computeLineDistances(); l.position.set((tx + .5) * S0, D.f + 1.15, (ty + .5) * S0); g.add(l); if (k < 30) { const m = new THREE.Mesh(new THREE.BoxGeometry(S0 - .2, 2.2, S0 - .2), em); m.position.copy(l.position); g.add(m); } }); return g; }
  // [cantiere] il cantiere aperto: la costruzione mezza trasparente dentro i pali dell'impalcatura
  function wipLook(m, b) {
    m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .4; o.material.depthWrite = false; } });
    const S0 = TS(), [w, d] = b.fp || [1, 1], W = w * S0 / 2, D = d * S0 / 2;
    for (const [x, z] of [[-W, -D], [W, -D], [-W, D], [W, D], [0, -D], [0, D]]) box(m, .1, 3.4, .1, '#b89a6a', x, 1.7, z);
    for (const y of [1.2, 2.4]) { box(m, w * S0, .08, .08, '#b89a6a', 0, y, -D); box(m, w * S0, .08, .08, '#b89a6a', 0, y, D); box(m, .08, .08, d * S0, '#b89a6a', -W, y, 0); box(m, .08, .08, d * S0, '#b89a6a', W, y, 0); }
    box(m, 1, .5, .7, '#8a8478', W - .6, .25, D + .6); box(m, .9, .4, .4, '#9a5a44', -W + .6, .2, D + .5);
  }
  function jobMark(J) { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; box(g, .06, 1.1, .06, '#e8e0cc', Math.cos(a) * .8, .55, Math.sin(a) * .8); } for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, r0 = box(g, 1.15, .08, .02, i % 2 ? '#c83a2a' : '#e8e0cc', Math.cos(a) * .57, .95, Math.sin(a) * .57); r0.rotation.y = -a + Math.PI / 2; } return g; }
  const hAt = (st, x, y, lv) => { if (lv && lv !== 'ug') return window.InterniArte && InterniArte.floorY && InterniArte.floorY() != null ? InterniArte.floorY() : 0; if (lv === 'ug' && typeof Livelli !== 'undefined') { const L = Livelli.S(st); return Livelli.floorAt ? (() => { try { return Livelli.heightOf(st, { lv: { k: 'ug' }, x, y }); } catch (e) { return 0; } })() : 0; } const r = R(); return r && r.groundH ? r.groundH(x, y) : 0; };
  // le animazioni: il fuoco, la radio, il rullo, l'ago… più vive quando la postazione è in uso
  function animate(st) {
    const t = performance.now() / 1000, p = st.player, C = st.covo; if (!C) return;
    const PW = {}; const pw = o => { const Cv = covoOf(st, o.x, o.y, o.lv); if (!Cv) return false; if (PW[Cv.id] === undefined) PW[Cv.id] = power(st, Cv).on; return PW[Cv.id]; };
    Object.entries(U.meshes).forEach(([k, m]) => { if (!/^crop:/.test(k) || !m.visible) return; const d = m.getObjectByName('goccia') || m.getObjectByName('pronto'); if (d) { d.position.y = 1.4 + Math.sin(t * 3) * .08; d.rotation.y = t; } });
    C.obj.forEach(o => {
      const m = U.meshes[o.uid]; if (!m || !m.visible) return; const b = BY[o.id], near = Math.hypot(o.x - p.x, o.y - p.y) < 3, busy = near || (C.busy[o.uid] && st.clock - C.busy[o.uid] < 30), k = busy ? 1 : .4;
      m.traverse(x => {
        if (!x.name) return;
        if (/^fiamma/.test(x.name)) { const f = .85 + Math.sin(t * 13 + o.x) * .1 + Math.sin(t * 23) * .06; x.scale.set(f, .8 + Math.sin(t * 9 + o.y) * .25 + k * .1, f); if (x.material.emissive) x.material.emissiveIntensity = .8 + Math.sin(t * 17) * .3; }
        if (x.name === 'luce') x.material.emissiveIntensity = (USE[o.id] && !pw(o) ? 0 : 1) * (.85 + Math.sin(t * 7 + o.x) * .1 + (Math.random() < .01 ? -.6 : 0));   // [survival] senza corrente si spegne
        if (x.name === 'brace') x.material.emissiveIntensity = .5 + (Math.sin(t * 2.2) + 1) * .4 * k;
        if (x.name === 'led') x.visible = Math.floor(t * (busy ? 6 : 1.5)) % 2 === 0;
        if (x.name === 'rullo') x.rotation.x = t * (busy ? 6 : .4);
        if (x.userData.p0 === undefined) x.userData.p0 = x.position.clone();
        if (x.name === 'ago') x.position.y = x.userData.p0.y + Math.abs(Math.sin(t * (busy ? 18 : 2))) * .05;
        if (x.name === 'morsa') x.position.z = x.userData.p0.z + Math.sin(t * (busy ? 3 : .5)) * .015;
        if (x.name === 'vapore') { x.position.y = x.userData.p0.y + ((t * .5) % 1) * .3 * k; x.material.opacity = .5 * (1 - (t * .5) % 1); x.material.transparent = true; }
        if (x.name === 'schermo' && x.material.emissive) x.material.emissiveIntensity = .7 + Math.sin(t * 30) * .08 + (Math.random() < .02 ? .4 : 0);
        if (x.name === 'ventola') x.rotation.y = t * (busy ? 30 : 12) * (o.dry ? 0 : 1);
        if (x.name === 'pale') x.rotation.z = -t * 1.6;
        if (x.name === 'tenda') x.rotation.x = Math.sin(t * 1.7 + o.x) * .06;
        if (x.name === 'telo' || x.name === 'onda') x.rotation.y = Math.sin(t * 2 + o.x) * .25;
        if (x.name === 'anta') x.rotation.y = near ? -1.2 : 0;
        if (x.name === 'coperchio') x.rotation.x += ((near ? -1.1 : 0) - x.rotation.x) * .15;
        if (x.name === 'segatura') x.visible = busy && Math.floor(t * 4) % 2 === 0;
      });
    });
  }
  function ghostSync(st) {
    if (!U.on || !U.grp) { if (U.ghost) { U.grp && U.grp.remove(U.ghost); U.ghost = null; } if (U.mark) { U.grp && U.grp.remove(U.mark); U.mark = null; } return; }
    const pv = PV(), r = R(), m = pv.mouse; const g = r.screenToGround(m.nx, m.ny); if (!g) return;
    const b = U.sel ? BY[U.sel] : null;
    // la casella sotto il puntatore
    if (!U.mark) { U.mark = new THREE.Mesh(new THREE.BoxGeometry(1, .04, 1), new THREE.MeshBasicMaterial({ color: '#b08d57', transparent: true, opacity: .45, depthWrite: false })); U.grp.add(U.mark); }
    if (b && b.cat === 'sotto' && !b.dig) { U.mark.visible = false; if (U.ghost) { U.grp.remove(U.ghost); U.ghost = null; } return; }
    const [x, y] = b ? snap(b, g.x, g.y, U.rot) : snap({ cat: 'terreno', op: 1 }, g.x, g.y, 0); U.gx = x; U.gy = y;
    U.ok = b ? canPlace(st, b, x, y, U.rot) : (covoAt(st, x, y) ? '' : 'Fuori dal covo.');
    const S0 = TS(); let fw = 1, fd = 1; if (b && b.fp) { [fw, fd] = b.fp; if (Math.round(U.rot / (Math.PI / 2)) % 2) [fw, fd] = [fd, fw]; }
    U.mark.scale.set(fw * S0 - .1, 1, fd * S0 - .1); U.mark.position.set(x, hAt(st, x, y, lvOf(st)) + .04, y); U.mark.material.color.set(U.ok ? '#c8483a' : '#7ac860'); U.mark.visible = true;
    if (!b || b.cat === 'terreno' || b.cat === 'orto') { if (U.ghost) { U.grp.remove(U.ghost); U.ghost = null; } return; }
    if (b.dig) { U.mark.scale.y = 40; U.mark.position.y += 1.2; if (U.ghost) { U.grp.remove(U.ghost); U.ghost = null; } return; }   // lo scavo: un blocco di terra da togliere
    U.mark.scale.y = 1;
    if (!U.seed) U.seed = Math.floor(Math.random() * 1e6) + 1;
    if (U.ghostId !== b.id || U.ghostSeed !== U.seed || !U.ghost) { if (U.ghost) U.grp.remove(U.ghost); U.ghost = model(b, U.seed); U.ghostSeed = U.seed; U.ghost.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .62; o.material.depthWrite = false; o.castShadow = false; } }); U.grp.add(U.ghost); U.ghostId = b.id; }
    U.ghost.position.set(x, hAt(st, x, y, lvOf(st)), y); U.ghost.rotation.y = -U.rot;
    U.ghost.traverse(o => { if (o.isMesh && o.material.emissive) { o.material.emissive.set(U.ok ? '#801010' : '#105010'); o.material.emissiveIntensity = .5; } });
  }

  // =====================================================================================================================
  // LA BARRA DEL CANTIERE
  // =====================================================================================================================
  const CSS = `
#cn { position: absolute; left: 0; right: 0; bottom: 0; z-index: 40; display: none; pointer-events: none; font-family: 'Instrument Sans', system-ui, sans-serif; color: #E9DCBC; }
#cn.on { display: block; }
#cn .cntop { position: absolute; left: 18px; bottom: calc(100% + 10px); pointer-events: auto; padding: 12px 16px; border-radius: 14px; background: rgba(15,27,25,.88); box-shadow: 0 0 0 1px #3A5A50; max-width: 360px; }
#cn .cntop b { display: block; font: 400 28px 'Instrument Serif', Georgia, serif; } #cn .cntop small { display: block; color: rgba(233,220,188,.6); font-size: 12.5px; line-height: 1.5; margin-top: 4px; }
#cn .cnbar { pointer-events: auto; margin: 0 18px 14px; border-radius: 18px; padding: 10px 14px 12px; background: linear-gradient(135deg, rgba(31,58,52,.95), rgba(43,42,58,.95)); box-shadow: 0 0 0 1px #3A5A50, 0 0 0 4px rgba(13,16,21,.75), 0 0 0 5px rgba(176,141,87,.35); }
#cn .cncats { display: flex; gap: 6px; margin-bottom: 8px; align-items: center; }
#cn button.pill { cursor: pointer; border-radius: 14px; padding: 4px 13px; background: none; border: 1px solid rgba(233,220,188,.2); color: rgba(233,220,188,.75); font: 600 12px 'Saira Condensed', 'Arial Narrow', sans-serif; letter-spacing: .14em; text-transform: uppercase; }
#cn button.pill.on { color: #E9DCBC; box-shadow: 0 0 0 2px #B08D57; border-color: transparent; }
#cn .cncats .x { margin-left: auto; } #cn .cncats .msg { margin-left: 14px; font: italic 15px 'Instrument Serif', Georgia, serif; } #cn .cncats .msg.no { color: #FF5FA2; }
#cn .cncards { display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 6px; scrollbar-color: #3A5A50 transparent; }
#cn .cnc { flex: 0 0 auto; width: 118px; border-radius: 12px; padding: 6px 6px 8px; cursor: pointer; background: rgba(15,27,25,.75); box-shadow: inset 0 0 0 1px rgba(58,90,80,.8); display: grid; justify-items: center; gap: 3px; text-align: center; }
#cn .cnc:hover { box-shadow: inset 0 0 0 1px rgba(233,220,188,.4); } #cn .cnc.on { box-shadow: 0 0 0 2px #B08D57; } #cn .cnc.no { opacity: .5; }
#cn .cnc canvas { width: 72px; height: 72px; } #cn .cnc b { font: 400 16px/1.1 'Instrument Serif', Georgia, serif; } #cn .cnc small { font-size: 10.5px; color: rgba(233,220,188,.6); line-height: 1.3; }
#cn .cnc small.n { color: #FF5FA2; } #cn .cnc small.y { color: #B08D57; }
#cn .cnsel { position: absolute; right: 18px; bottom: calc(100% + 10px); pointer-events: auto; padding: 12px 14px; border-radius: 14px; background: rgba(15,27,25,.9); box-shadow: 0 0 0 1px #3A5A50; display: grid; gap: 8px; min-width: 220px; }
#cn .cnsel b { font: 400 22px 'Instrument Serif', Georgia, serif; } #cn .cnsel .row { display: flex; gap: 6px; }
#cn button.b { cursor: pointer; border-radius: 18px; padding: 6px 14px; color: #E9DCBC; font: 600 12px 'Saira Condensed', sans-serif; letter-spacing: .14em; text-transform: uppercase; border: 1px solid rgba(233,220,188,.25); background: linear-gradient(120deg, #24443c, #2e2c40); }
#cn button.b:hover { border-color: #B08D57; } #cn button.b.bad { color: #FF5FA2; border-color: rgba(255,95,162,.4); }
#cnBtn { position: absolute; right: 14px; bottom: 64px; z-index: 30; pointer-events: auto; cursor: pointer; display: none; border-radius: 16px; padding: 5px 12px; background: rgba(15,27,25,.9); border: 1px solid #3A5A50; color: #E9DCBC; font: 600 11px 'Saira Condensed', sans-serif; letter-spacing: .16em; text-transform: uppercase; }
#cnBtn.on { display: block; }
body.cn-on #rs-here, body.cn-on #me-box, body.cn-on #ts-hint { display: none !important; } #cnBtn:hover { border-color: #B08D57; } #cnBtn kbd { color: #B08D57; margin-left: 6px; }
`;
  function mount() {
    if ($('cn')) return true; const app = $('app'); if (!app) return false;
    const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
    const m = document.createElement('div'); m.id = 'cn'; app.appendChild(m);
    const bt = document.createElement('button'); bt.id = 'cnBtn'; bt.innerHTML = 'Cantiere del covo<kbd>Y</kbd>'; app.appendChild(bt); bt.onclick = () => toggle();
    m.addEventListener('click', onClick);
    return true;
  }
  function cardThumb(b) { if (typeof MenuUI === 'undefined' || !MenuUI.thumbFor) return null; return MenuUI.thumbFor('covo:' + b.id, () => b.cat === 'terreno' || b.cat === 'sotto' || b.cat === 'orto' ? opModel(b) : model(b, 7)); }
  function opModel(b) { const g = new THREE.Group(); const tool = { disbosca: 'ascia', cava: 'piccone', spiana: 'pala', sterra: 'zappa' }[b.op] || 'pala'; box(g, 1.6, .25, 1.6, b.cat === 'sotto' ? '#3a2e24' : { disbosca: '#4a6a3a', cava: '#6a6a68', spiana: '#7a6a4a', sterra: '#6a5038' }[b.op], 0, .12, 0);
    if (b.op === 'disbosca') { cyl(g, .12, .16, .5, '#6a4a2a', -.3, .5, 0); const c0 = cyl(g, 0, .4, .9, '#2e4a2a', .4, .7, .2); c0.rotation.z = 1.3; }
    if (b.op === 'cava') for (let i = 0; i < 4; i++) { const r0 = new THREE.Mesh(new THREE.DodecahedronGeometry(.2), lm('#8a8a88')); r0.position.set(-.4 + i * .3, .35, (i % 2) * .3); g.add(r0); }
    if (b.cat === 'sotto') { box(g, .9, .3, .9, '#1a1410', 0, .14, 0); if (b.op === 'bunker') for (const x of [-.6, .6]) box(g, .1, .9, .1, '#7a5634', x, .45, 0); if (b.op === 'botola' || b.op === 'uscita') box(g, .7, .05, .7, '#6a4a2c', .2, .3, .2).rotation.x = -.8; }
    const tl = typeof Oggetti !== 'undefined' && Oggetti.CAT[tool]; if (tl) { const h = cyl(g, .035, .035, 1, '#8a5a2a', .3, .7, -.3); h.rotation.z = .9; box(g, .3, .08, .1, '#9aa0a8', .7, 1.05, -.3); }
    return g; }
  let lastHtml = '';
  function render(st) {
    if (!mount()) return; const m = $('cn'), bt = $('cnBtn');
    const C0 = covoOf(st, st.player.x, st.player.y, lvOf(st)); bt.classList.toggle('on', !U.on && !!C0 && !st.player.vehicle && !(PV().ui && (PV().ui.menu || PV().ui.intro)));
    m.classList.toggle('on', U.on); document.body.classList.toggle('cn-on', U.on); if (!U.on) return;
    const items = B.filter(b => b.cat === U.cat);
    const cats = CATS.map(([k, l]) => `<button class="pill ${U.cat === k ? 'on' : ''}" data-a="cat" data-x="${k}">${l}</button>`).join('');
    const showMsg = U.msg && Date.now() - U.msgT < 5000;
    const cards = items.map(b => { const miss = missing(st, b), own = b.item && have(st, b.item) >= 1, toolOk = hasTool(st, b.tool);
      const cost = own ? `<small class="y">ne hai ${have(st, b.item)}: piazzalo</small>` : b.cost ? `<small class="${miss.length ? 'n' : ''}">${Object.entries(b.cost).map(([k, q]) => `${esc(O().nm(k))} ${Math.min(q, totalOf(st, k))}/${q}`).join(' · ')}</small>` : '';
      return `<div class="cnc ${U.sel === b.id ? 'on' : ''} ${miss.length || !toolOk ? 'no' : ''}" data-a="sel" data-x="${b.id}" title="${esc(b.desc || b.nome)}"><canvas data-th="${b.id}" width="96" height="96"></canvas><b>${esc(b.nome)}</b>${cost}${b.tool ? `<small class="${toolOk ? '' : 'n'}">${esc(b.tool.split('|').map(k => O().nm(k)).join(' o '))}</small>` : ''}${b.desc && b.cat === 'sotto' ? `<small>${esc(b.desc)}</small>` : ''}</div>`; }).join('');
    const po = U.pick ? (st.covo.obj.find(o => o.uid === U.pick)) : null;
    const sel = po ? `<div class="cnsel"><b>${esc(BY[po.id].nome)}</b><div class="cnrow"><button class="b" data-a="sposta">Sposta</button><button class="b" data-a="gira">Gira</button><button class="b bad" data-a="togli">Togli</button></div>${BY[po.id].st ? '<small style="color:rgba(233,220,188,.6)">Fuori dal cantiere: cliccala per usarla.</small>' : ''}</div>` : '';
    const C = covoOf(st, st.player.x, st.player.y, lvOf(st));
    const top = `<div class="cntop"><b>${esc(C ? C.name : 'Nessun covo qui')}</b><small>${C ? 'Clic: piazza · trascina: una fila · R: gira · destro: lascia · prendi una cosa messa e trascinala · Canc: togli · Ctrl+D: un altro uguale · Ctrl+Z: annulla · Y: esci' : 'Qui non hai un campo: piantalo dove vuoi (nascosto nel bosco, o in vista). In città si costruisce solo al chiuso.'}</small>${!C ? '<div style="margin-top:8px"><button class="b" data-a="reclama">Pianta qui il campo</button></div>' : ''}${lvOf(st) === 'ug' ? '<small>Sei sotto terra: costruisci nel bunker.</small>' : ''}${C && !lvOf(st) && inCity(st.player.x, st.player.y) ? '<small>In città: solo al chiuso. Entra nella stanza del covo, o scendi sotto terra.</small>' : ''}${(() => { if (!C) return ''; const P = power(st, C); return P.make || P.use || P.cap ? `<small>Corrente: fa ${P.make}, usa ${P.use}${P.cap ? ` · batterie ${Math.round(P.stored)}/${P.cap}` : ''}${P.on ? '' : ' · <b style="font:inherit;color:#FF5FA2">al buio</b>'}</small>` : ''; })()}${jobsLeft(st) ? `<small>Lavori della banda in coda: ${jobsLeft(st)}.</small>` : !lvOf(st) && C && !inCity(st.player.x, st.player.y) ? `<small>${crewAll(st).length ? 'Disboscare, cavare e le costruzioni grandi li fa la banda.' : 'Non hai una banda: il lavoro pesante lo fai da te.'}</small>` : ''}</div>`;
    const html = `${top}${sel}<div class="cnbar"><div class="cncats">${cats}${showMsg ? `<span class="cnmsg ${U.msgOk ? '' : 'no'}">${esc(U.msg)}</span>` : ''}<button class="pill x" data-a="esci">Esci · Y</button></div><div class="cncards">${cards}</div></div>`;
    if (html !== lastHtml) { const sc = m.querySelector('.cncards') ? m.querySelector('.cncards').scrollLeft : 0; m.innerHTML = html; lastHtml = html; const cc = m.querySelector('.cncards'); if (cc) cc.scrollLeft = sc; }
    m.querySelectorAll('canvas[data-th]').forEach(c => { if (c.dataset.done) return; const b = BY[c.dataset.th], t = cardThumb(b); if (t) { c.getContext('2d').drawImage(t, 0, 0, 128, 128, 0, 0, 96, 96); c.dataset.done = 1; } });
  }
  const totalOf = (st, k) => { const X = EXT(); if (X && X.resTotal && !Oggetti.CAT[k]) return Math.floor(X.resTotal(st, k)); let n = have(st, k); (st.ris && st.ris.bases || []).filter(b => b.alive).forEach(b => { n += Math.floor((b.stock && b.stock[k]) || 0); }); return n; };
  function say(r) { if (!r) return; U.msg = r.msg || ''; U.msgOk = r.ok !== false; U.msgT = Date.now(); const st = ST(); if (st && r.msg) Gm().feed(st, r.msg, r.ok ? 'good' : 'bad'); lastHtml = ''; }
  function onClick(e) {
    const t = e.target.closest('[data-a]'); if (!t) return; const a = t.dataset.a, x = t.dataset.x, st = ST();
    if (a === 'cat') { U.cat = x; U.sel = null; }
    if (a === 'sel') { const b = BY[x]; if (b.cat === 'sotto' && !b.dig) { say(under(st, b)); } else { U.sel = U.sel === x ? null : x; U.pick = null; U.moving = null; } }
    if (a === 'esci') toggle(false);
    if (a === 'reclama') say({ ok: true, msg: claim(st) });
    if (a === 'togli' && U.pick) { say(remove(st, U.pick)); U.pick = null; }
    if (a === 'gira' && U.pick) { const o = lift(st, U.pick); if (o) { const r = place(st, BY[o.id], o.x, o.y, o.rot + Math.PI / 2, o); if (!r.ok) { place(st, BY[o.id], o.x, o.y, o.rot, o); say(r); } } }
    if (a === 'sposta' && U.pick) { const o = lift(st, U.pick); if (o) { U.moving = o; U.sel = o.id; U.rot = o.rot; U.pick = null; say({ ok: true, msg: 'Scegli dove metterlo.' }); } }
    lastHtml = ''; render(st);
  }

  // =====================================================================================================================
  // ENTRARE, USCIRE, MOUSE
  // =====================================================================================================================
  function toggle(on) {
    const st = ST(), ui = PV() && PV().ui; if (!st || !ui) return;
    U.on = on === undefined ? !U.on : on;
    if (U.on) { preload(); U.prevTop = !!ui.top; ui.top = true; U.cat = covoOf(st, st.player.x, st.player.y, lvOf(st)) ? (lvOf(st) === 'ug' ? 'sotto' : lvOf(st) || inCity(st.player.x, st.player.y) ? 'arredi' : 'baracche') : 'terreno'; if (typeof MenuUI !== 'undefined' && MenuUI.state.open) MenuUI.close(); }
    else { ui.top = U.prevTop; if (U.moving) { const o = U.moving; U.moving = null; S(st).obj.push(o); (o.tiles || []).forEach(([tx, ty, orig]) => { if (orig !== null && orig !== undefined && !o.lv) { Gm().setTile(tx, ty, T().BLD); dirty(tx, ty); } }); U.dirty = true; } U.sel = null; U.pick = null; }
    lastHtml = ''; render(st);
  }
  function down(btn, nx, ny) {
    const st = ST(); if (!st) return;
    if (btn === 2) { if (U.moving) { place(st, BY[U.moving.id], U.moving.x, U.moving.y, U.moving.rot, U.moving); U.moving = null; } U.sel = null; U.pick = null; lastHtml = ''; return; }
    const b = U.sel ? BY[U.sel] : null, g = R().screenToGround(nx, ny); if (!g) return;
    U.dragLast = null;
    if (b) {
      const [x, y] = snap(b, g.x, g.y, U.rot);
      if (b.cat === 'orto') { const why = canPlace(st, b, x, y, 0); const [tx, ty] = tileOf(x, y); U.dragLast = tx + ',' + ty; return say(why ? { ok: false, msg: why } : cropDo(st, b, tx, ty)); }
      if (b.dig) return say(placeDig(st, b, x, y, U.rot));
      if (b.fp && b.fp[0] === 1 && b.fp[1] === 1) U.dragLast = tileOf(x, y).join(',');
      if (b.cat === 'terreno' && (b.brush || b.id === 'sentiero')) { const why = canPlace(st, b, x, y, 0); if (why) return say({ ok: false, msg: why }); U.lvH = b.brush ? (R().groundH ? R().groundH(x, y) : null) : null; U.dragLast = tileOf(x, y).join(','); return say(brushDo(st, b, x, y)); }
      if (b.cat === 'terreno') { const why = canPlace(st, b, x, y, 0); if (why) return say({ ok: false, msg: why }); const [tx, ty] = tileOf(x, y);
        // [cantiere] con la banda si segna il lavoro e ci vanno loro; senza, lo fai tu
        if (crewAll(st).length) { if ((S(st).jobs || []).some(j => !j.done && j.op === b.op && Math.abs(j.x - x) < .5 && Math.abs(j.y - y) < .5)) return say({ ok: false, msg: 'È già segnato.' }); addJob(st, { op: b.op, x, y }); U.dirty = true; return say({ ok: true, msg: `Segnato: ci pensa la banda (${jobsLeft(st)} in coda).` }); }
        return say(terrain(st, b, tx, ty)); }
      const r = place(st, b, x, y, U.rot, U.moving); say(r); if (r.ok && U.moving) { U.moving = null; U.sel = null; } if (r.ok && r.o && !r.o.paid0) undoPush({ k: 'posa', uid: r.o.uid });
      return;
    }
    // niente in mano: si prende una cosa già messa (e tenendo premuto la si trascina)
    const lv = lvOf(st); let best = null, bd = 1.4; (st.covo ? st.covo.obj : []).forEach(o => { if (o.lv !== lv) return; const d = Math.hypot(o.x - g.x, o.y - g.y) - (BY[o.id].fp ? Math.max(...BY[o.id].fp) * .6 : 0); if (d < bd) { bd = d; best = o; } });
    U.pick = best ? best.uid : null; lastHtml = '';
    U.grab = best ? { uid: best.uid, gx: g.x, gy: g.y, x0: best.x, y0: best.y, moved: false } : null;
  }
  // [survival] annulla (Ctrl+Z): le ultime posate e spostate
  function undoPush(u) { U.undo = U.undo || []; U.undo.push(u); if (U.undo.length > 40) U.undo.shift(); }
  function undoLast(st) {
    const u = (U.undo || []).pop(); if (!u) return { ok: false, msg: 'Niente da annullare.' };
    if (u.k === 'posa') { const o = lift(st, u.uid); if (!o) return undoLast(st); const bag = O().inv(st); if (o.paid && o.paid.item) bag[o.paid.item] = (bag[o.paid.item] || 0) + 1; else if (o.paid && o.paid.cost) Object.entries(o.paid.cost).forEach(([k, q]) => { bag[k] = (bag[k] || 0) + q; }); return { ok: true, msg: `Annullato: ${BY[o.id].nome} (ti torna tutta la roba).` }; }
    if (u.k === 'sposta') { const o = lift(st, u.uid); if (!o) return undoLast(st); const r = place(st, BY[o.id], u.x, u.y, u.rot, o); if (!r.ok) place(st, BY[o.id], o.x, o.y, o.rot, o); return { ok: true, msg: `Annullato: ${BY[o.id].nome} torna dov'era.` }; }
    return { ok: false, msg: '' };
  }
  // trascinare una cosa presa: la casella cambia, la cosa la segue (se lì non ci sta, resta dov'era)
  function grabMove(st, g) {
    const G0 = U.grab, o = st.covo.obj.find(q => q.uid === G0.uid); if (!o) { U.grab = null; return; } const b = BY[o.id];
    const [x, y] = snap(b, G0.x0 + g.x - G0.gx, G0.y0 + g.y - G0.gy, o.rot); if (Math.abs(x - o.x) < .01 && Math.abs(y - o.y) < .01) return;
    const prev = { x: o.x, y: o.y, rot: o.rot }, L0 = lift(st, o.uid), r = place(st, b, x, y, o.rot, L0); if (!r.ok) { place(st, b, prev.x, prev.y, prev.rot, L0); return; }
    if (!G0.moved) { G0.moved = true; undoPush({ k: 'sposta', uid: o.uid, x: G0.x0, y: G0.y0, rot: o.rot }); }
    U.pick = o.uid; lastHtml = '';
  }
  // [survival] trascinando: un pezzo per casella nuova (muri, recinti, tetti, pavimenti, solchi, semine, annaffiate)
  function drag(nx, ny) {
    const st = ST(); if (!st || !U.on) return;
    if (!U.sel && U.grab) { const g = R().screenToGround(nx, ny); if (g) grabMove(st, g); return; }
    if (!U.sel || U.dragLast === null || U.dragLast === undefined) return; const b = BY[U.sel];
    if (!(b.cat === 'orto' || b.brush || b.id === 'sentiero' || (b.fp && b.fp[0] === 1 && b.fp[1] === 1 && !b.dig))) return;
    if (b.brush || b.id === 'sentiero') { const g = R().screenToGround(nx, ny); if (!g) return; const [x, y] = snap(b, g.x, g.y, 0), k = tileOf(x, y).join(','); if (k === U.dragLast) return; U.dragLast = k; const r = brushDo(st, b, x, y); if (r.ok) { U.msg = r.msg; U.msgOk = true; U.msgT = Date.now(); lastHtml = ''; } return; }
    const g = R().screenToGround(nx, ny); if (!g) return; const [x, y] = snap(b, g.x, g.y, U.rot), k = tileOf(x, y).join(','); if (k === U.dragLast) return; U.dragLast = k;
    if (b.cat === 'orto') { const why = canPlace(st, b, x, y, 0); if (!why) say(cropDo(st, b, ...tileOf(x, y))); return; }
    const r = place(st, b, x, y, U.rot, null); if (r.ok) { U.msg = r.msg; U.msgOk = true; U.msgT = Date.now(); lastHtml = ''; undoPush({ k: 'posa', uid: r.o.uid }); } else if (!/già qualcosa/.test(r.msg)) say(r);
  }
  function up() { U.dragLast = null; U.grab = null; U.lvH = null; }
  // il pennello del terreno: con la banda diventano lavori segnati (uno per casella), da solo lo fai subito
  function brushDo(st, b, x, y) {
    if (!hasTool(st, b.tool)) return { ok: false, msg: `Ti serve: ${b.tool.split('|').map(k => O().nm(k)).join(' o ')}.` };
    const G = Gm(), tiles = b.brush ? brushTiles(x, y, b.brush) : [tileOf(x, y)], crew = crewAll(st).length; let n = 0, felled = 0;
    tiles.forEach(([tx, ty]) => { const cx = (tx + .5) * TS(), cy = (ty + .5) * TS(); if (!covoAt(st, cx, cy) || inCity(cx, cy)) return; const v = G.tileAt(tx, ty);
      if ([T().WATER, T().BLD, T().VIA].includes(v) || S(st).obj.some(o => o.tiles && o.tiles.some(q => q[0] === tx && q[1] === ty))) return;
      if (crew && (b.op === 'sgombra' || v === T().TREE)) { if ((S(st).jobs || []).some(j => !j.done && Math.abs(j.x - cx) < .5 && Math.abs(j.y - cy) < .5)) return; addJob(st, { op: b.op, x: cx, y: cy, h: U.lvH }); n++; return; }
      if (b.op === 'sgombra' && v === T().TREE && !hasTool(st, 'ascia|sega')) return;
      const r = terrainDo(st, b, tx, ty, O().inv(st)); if (r.ok) { n++; if (v === T().TREE) felled++; } });
    U.dirty = true;
    if (!n) return { ok: false, msg: 'Qui non c\'è niente da fare (o è fuori dal campo).' };
    return { ok: true, msg: crew && b.op === 'sgombra' ? `Segnato: la banda sgombra ${n} caselle (${jobsLeft(st)} in coda).` : felled ? `Sgombri: ${felled} alberi giù, la legna in tasca.` : b.op === 'livella' ? 'Livelli il suolo.' : 'Fatto.' };
  }
  function wheel(dy) { if (!U.on || !U.sel) return false; const b = BY[U.sel]; U.rot += (dy > 0 ? 1 : -1) * (b.fp ? Math.PI / 2 : Math.PI / 4); return true; }
  addEventListener('keydown', e => {
    const pv = PV(); if (!pv || !pv.st || !pv.ui || pv.ui.intro || pv.ui.over || pv.ui.dialog || pv.ui.book || pv.ui.menu) return;
    const ae = document.activeElement; if (ae && /INPUT|TEXTAREA/.test(ae.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'y' && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); toggle(); return; }
    if (!U.on) return;
    const st0 = pv.st, po = U.pick && st0.covo ? st0.covo.obj.find(o => o.uid === U.pick) : null;
    if (k === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopImmediatePropagation(); say(undoLast(st0)); U.pick = null; return; }
    if (k === 'r') { e.preventDefault(); e.stopImmediatePropagation(); if (U.sel) wheel(e.shiftKey ? -1 : 1); else if (po) { const o = lift(st0, po.uid); if (o) { const step = BY[o.id].fp ? Math.PI / 2 : Math.PI / 4, r = place(st0, BY[o.id], o.x, o.y, o.rot + (e.shiftKey ? -step : step), o); if (!r.ok) { place(st0, BY[o.id], o.x, o.y, o.rot, o); say(r); } } } return; }
    if ((k === 'delete' || k === 'backspace') && po) { e.preventDefault(); e.stopImmediatePropagation(); say(remove(st0, po.uid)); U.pick = null; return; }
    if (k === 'd' && (e.ctrlKey || e.metaKey) && po) { e.preventDefault(); e.stopImmediatePropagation(); U.sel = po.id; U.rot = po.rot; U.cat = BY[po.id].cat; U.pick = null; say({ ok: true, msg: `${BY[po.id].nome}: posane un altro.` }); return; }
    if (k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); if (U.sel || U.pick) { U.sel = null; U.pick = null; if (U.moving) { place(pv.st, BY[U.moving.id], U.moving.x, U.moving.y, U.moving.rot, U.moving); U.moving = null; } lastHtml = ''; } else toggle(false); }
  }, true);

  // fuori dal cantiere: le postazioni si cliccano, ci vai, e si apre il loro banco
  function pick(st, nx, ny, o) {
    if (U.on || st.player.vehicle || !st.covo || !st.covo.obj.length) return null; const r = R(), lv = lvOf(st); let best = null, bd = Math.max(26, o.h * .045);
    st.covo.obj.forEach(c => { const b = BY[c.id]; if (!b || !(b.st || b.sleep || b.menu || b.baule || b.store) || c.lv !== lv || c.wip) return; const pr = r.project(c.x, .9, c.y); if (pr.behind) return; const d = Math.hypot((pr.x - nx) * o.w, (pr.y - ny) * o.h); if (d < bd) { bd = d; best = c; } });
    return best ? { kind: 'loot', via: 'covo', ref: best.uid, x: best.x, y: best.y, label: BY[best.id].baule ? 'Apri il baule' : BY[best.id].store ? `Apri: ${BY[best.id].nome}` : `Usa: ${BY[best.id].nome}` } : null;
  }
  const find = (st, ref) => { const o = st.covo && st.covo.obj.find(c => c.uid === ref); return o ? { x: o.x, y: o.y } : null; };
  const goal = (st, ref) => { const o = st.covo && st.covo.obj.find(c => c.uid === ref); if (!o) return null; const G = Gm(); for (let r = 1.2; r < 3; r += .4) for (let a = 0; a < 8; a++) { const x = o.x + Math.cos(a * Math.PI / 4 + Math.PI / 2 - o.rot) * r, y = o.y + Math.sin(a * Math.PI / 4 + Math.PI / 2 - o.rot) * r; if (G.walkM(x, y)) return { x, y }; } return { x: o.x, y: o.y }; };
  const reach = () => 1.9;
  function arrive(st, ref) {
    const o = st.covo.obj.find(c => c.uid === ref); if (!o) return; const b = BY[o.id]; st.covo.busy[o.uid] = st.clock;
    if (b.baule || b.store) { if (typeof MenuUI !== 'undefined') MenuUI.open('baule'); return; }
    if (b.sleep) { const a = (typeof Azioni !== 'undefined' ? Azioni.playerActions(st) : []).find(x => /dorm|pisolino|riposa/i.test(x.label) && x.run); if (a) Gm().feed(st, a.run() || 'Ti sdrai.', 'info'); else Gm().feed(st, 'Ti sdrai un momento sulla branda. Non hai sonno.', 'info'); return; }
    if (typeof MenuUI !== 'undefined') MenuUI.open('lavora', { st: b.st, st2: b.st2, titolo: b.nome, armi: b.menu === 'armi', auto: b.menu === 'auto', uid: o.uid });
  }

  function loop() {
    try { const st = ST(); if (st) { if (st.covo || U.on) sceneSync(st); ghostSync(st); const t = performance.now(); if (t - (U.rt || 0) > (U.on ? 150 : 500)) { U.rt = t; render(st); } } } catch (e) { if (!U.err) { U.err = 1; console.error('[Cantiere]', e); } }
    requestAnimationFrame(loop);
  }
  function init() { if (!window.__pv || !window.THREE) { setTimeout(init, 200); return; } const G = Gm(); if (G.HOOKS) { const p0 = G.HOOKS.playerWeapon; G.HOOKS.playerWeapon = (st, k, W) => playerWeapon(st, k, p0 ? p0(st, k, W) : W); } preload(); requestAnimationFrame(loop); }
  // [cantiere] la logica della banda gira col motore (anche senza grafica)
  { const R0 = RIS(); if (R0 && R0.EXT && R0.EXT.do) R0.EXT.do.covoLavoro = jobDone; }
  { const G = typeof Game !== 'undefined' ? Game : null; if (G && G.HOOKS) { const prev = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); if (!st.__cnT || st.clock - st.__cnT > 1) { st.__cnT = st.clock; try { jobsStep(st); cropsStep(st); powerStep(st); } catch (e) { if (!U.jerr) { U.jerr = 1; console.error('[Cantiere] banda', e); } } } try { digsStep(st, dt); } catch (e) { if (!U.derr) { U.derr = 1; console.error('[Cantiere] scavi', e); } } }; } }
  if (typeof window !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0); }
  return { UGC, covoOf, undoLast, grabMove, power, powerStep, drag, up, cropDo, cropCheck, cropsStep, placeDig, canDig, digsStep, CROP, jobsView, addJob, jobsStep, crewAll, autoView, autoUp, carAt, inCity, terrainDo, footprint, canPlace, S, bauleHere, bauli, baulePut, bauleTake, bauleAll, active: () => U.on, toggle, down, wheel, pick, find, goal, reach, arrive, stationsNear, mod, modsView, MODS, B, BY, covi, covoAt, claim, place, remove, terrain, under, state: U, model };
})();
if (typeof module !== 'undefined') module.exports = Cantiere;
