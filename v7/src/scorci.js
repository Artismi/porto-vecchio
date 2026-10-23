/* Porto Vecchio — [scorci] GLI SCORCI VERI (solo logica, nessuna grafica: la grafica è scorci_arte.js).
   Il committente, coi quattro riferimenti in _immagini/riferimenti/scorci/: «mancano ancora degli scorci veri». Uno scorcio è una pagina
   composta come un diorama dove l'occhio del giocatore si deve fermare: un punto focale, i piani (il muro con l'insegna, la soglia, la
   fascia della merce, lo spazio davanti), l'usura vera, la gente che ci vive. Mai coriandoli: ogni cosa sta su una riga della gabbia
   (la fascia dell'insegna, il pilastro fra le aperture, il piede del muro, la fascia di un metro davanti alla vetrina) e le regole di
   [chiarezza] valgono: le porte e le scale restano libere, sull'asse di una vetrina sta solo la roba della bottega stessa.
   - LE RICETTE (RICETTE, sotto): una per scorcio, in dati. Ognuna dice dove si aggancia (mai coordinate fisse: il luogo-missione
     W.luoghi, la scenografia W.sets, la bottega per mestiere b.shopFront, la porta di un edificio con nome), il punto focale, il kit del
     fronte scelto per epoca e mestiere, le cose (a muro, a terra, di traverso), gli agganci per la gente (posti e scene) e gli stati per
     ora (serranda su, a metà, giù; luci accese; tavoli fuori o impilati). Il risolutore (risolvi) le mette sulla gabbia del fronte vero.
   - I FRONTI: solo le facce che la camera vede (S, E): un fronte che guarda a nord sarebbe una schiena. La porta di un'altra casa, una
     vetrina d'altri, una scala: niente davanti (il corridoio della porta è largo 2 m e profondo 2,6). La propria vetrina: solo la propria
     merce, entro 1,2 m dal muro.
   - LA CUCITURA: finché la Vittoria e il passaggio città–Rocca sono in lavorazione ([cucitura]), nessuno scorcio nella striscia della
     Vittoria, sulla Piazza Grande (l'adunata) e dalla Passeggiata della Spianata in là (ATTESA_CUCITURA).
   - I MEZZI: le auto e l'Ape degli scorci sono mezzi veri del gioco (in sosta: si rubano, si spostano), col modello scelto (la 500).
   Lo usano scorci_arte.js (il kit e la posa), render.js (il fronte della bottega che lascia il posto al kit), scena.js (le pagine degli
   scorci tacciono), posti.js (i posti nuovi: la scopa, le comari, i ragazzini, il telefono) ed eventi.js (le scene). Prova: test_scorci.js */
var Scorci = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : (typeof require !== 'undefined' ? require('./game.js') : null);
  const CH = typeof Chiarezza !== 'undefined' ? Chiarezza : (typeof require !== 'undefined' ? require('./chiarezza.js') : null);
  const W = G && G.MAP ? G.MAP.world : null, TS = G ? G.TS : 2;
  const ATTIVO = !!(W && W.sets && W.luoghi && CH) && !(typeof location !== 'undefined' && /[?&]noscorci\b/.test(location.search));   // ?noscorci: la città com'era (le foto di prima)
  const PI = Math.PI, hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = (x, y, s) => { let h = (Math.round(x * 7) * 374761393 + Math.round(y * 7) * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

  // ================= LE MISURE =================
  const CFG = {
    ATTESA_CUCITURA: false,    // la cucitura è arrivata (la Vittoria viva, la Piazza Grande): resta fuori solo il Recinto, la spianata e la Rocca
    porta: { meta: 1.0, prof: 2.6 },   // m: il corridoio libero davanti a ogni porta (mezza larghezza dall'asse, profondità)
    vetrina: { prof: 1.5, propria: 1.2 },   // m: davanti a una vetrina d'altri niente; davanti alla propria solo la sua merce, entro 1,2 m
    scala: .4,                 // m in più attorno alla fascia libera delle scale di [chiarezza]
    raggio: 9,                 // m: tutto lo scorcio sta entro questo raggio dal punto focale
    budget: { draws: 32, tri: 60000 },   // per scorcio: chiamate di disegno (fuso per materiale, con gli stati) e triangoli
    MG: 3.6,                   // il piano terra (render.js)
  };

  // ================= IL KIT: ingombri dei pezzi (la grafica è in scorci_arte.js; qui le misure per la posa e le prove) =================
  // w: lungo il muro (o la larghezza), d: la profondità, h: l'altezza; muro: appeso; y: quota del fondo (a muro); cls: dominante,
  // secondario, accento (la gabbia della pagina) ; fam: la famiglia del dominante
  const KIT = {
    // il fronte
    fascia: { muro: true, w: 4, d: .16, h: .8, y: 2.55, cls: 'dom', fam: 'insegna' },
    tenda: { muro: true, w: 2, d: 1.3, h: .8, y: 2.42, cls: 'sec' },
    insegna2: { muro: true, w: 1.6, d: .04, h: .34, y: 2.24, cls: 'sec' },
    bandiera: { muro: true, w: .7, d: .8, h: .62, y: 2.9, cls: 'sec' },
    palo_barbiere: { muro: true, w: .3, d: .36, h: .9, y: 2.2, cls: 'sec' },
    lampada: { muro: true, w: .3, d: .62, h: .5, y: 3.38, cls: 'acc' },
    serranda: { muro: true, w: 1.6, d: .18, h: 2.6, y: 0, cls: 'sec' },
    griglia: { muro: true, w: 1.6, d: .06, h: 2.0, y: .3, cls: 'sec' },
    vetrofania: { muro: true, w: 1.6, d: .02, h: 1.6, y: .45, cls: 'acc' },
    pannello_forato: { muro: true, w: 1.6, d: .04, h: .78, y: .02, cls: 'acc' },
    zoccolo: { muro: true, w: 3, d: .015, h: .55, y: 0, cls: 'acc' },
    crepa: { muro: true, w: 1.1, d: .03, h: 1.0, y: 1.0, cls: 'acc' },
    manifesti: { muro: true, w: 1.3, d: .02, h: 1.1, y: .95, cls: 'sec' },
    necrologi: { muro: true, w: .9, d: .02, h: .8, y: 1.15, cls: 'acc' },
    targa: { muro: true, w: .6, d: .04, h: .35, y: 2.45, cls: 'acc' },
    telefono_muro: { muro: true, w: .5, d: .42, h: .8, y: 1.1, cls: 'sec' },
    festoni: { muro: true, w: 4, d: .06, h: .3, y: 3.28, cls: 'acc' },
    soglia: { w: 1.5, d: .5, h: .2, cls: 'acc' },
    bocca_forno: { muro: true, w: 1.5, d: .3, h: 1.7, y: .55, cls: 'dom', fam: 'forno' },
    lumini: { muro: true, w: .6, d: .26, h: .5, y: 1.15, cls: 'acc' },
    edicola_votiva: { muro: true, w: 1.1, d: .45, h: 1.3, y: 2.0, cls: 'dom', fam: 'nicchia' },
    lavagna_muro: { muro: true, w: .55, d: .04, h: .75, y: 1.1, cls: 'acc' },
    // a terra, la merce e le cose della bottega (la fascia di un metro)
    locandina: { w: .56, d: .5, h: 1.25, cls: 'sec' },
    cassone: { w: .9, d: .55, h: .85, cls: 'sec' },
    cassette: { w: .9, d: .5, h: .75, cls: 'sec' },
    banchetto: { w: 1.3, d: .55, h: .95, cls: 'sec' },
    scope: { w: .6, d: .45, h: 1.45, cls: 'sec' },
    bombole: { w: .9, d: .4, h: .8, cls: 'sec' },
    secchi: { w: .55, d: .45, h: .62, cls: 'acc' },
    frigo: { w: 1.2, d: .7, h: 1.0, cls: 'sec' },
    cassette_latte: { w: .7, d: .45, h: .62, cls: 'acc' },
    sacchi: { w: .9, d: .55, h: .55, cls: 'acc' },
    catasta: { w: 1.5, d: .55, h: 1.05, cls: 'sec' },
    casse_birre: { w: .8, d: .5, h: .62, cls: 'acc' },
    panca: { w: 1.5, d: .5, h: .85, cls: 'sec' },
    sedia: { w: .5, d: .5, h: .9, cls: 'acc' },
    rifiuti: { w: 1.1, d: .5, h: .12, cls: 'acc', piatto: true },
    secchi_fiori: { w: 1.1, d: .5, h: .7, cls: 'sec' },
    boombox: { w: .7, d: .5, h: .72, cls: 'acc' },
    // nello spazio
    tavolo_scopa: { w: 1.5, d: 1.5, h: 1.0, cls: 'dom', fam: 'arredo' },
    telefono_palo: { w: .5, d: .45, h: 2.05, cls: 'sec' },
    banco_pesce: { w: 2.6, d: 1.5, h: 2.5, cls: 'dom', fam: 'arredo' },
    polistirolo: { w: .9, d: .6, h: .9, cls: 'acc' },
    cartellone: { w: 2.4, d: .3, h: 2.6, cls: 'dom', fam: 'insegna' },
    gomme: { w: .75, d: .75, h: .95, cls: 'sec' },
    fusti: { w: 1.3, d: .7, h: .95, cls: 'sec' },
    banco_lavoro: { w: 1.8, d: .7, h: 1.1, cls: 'sec' },
    motore: { w: .9, d: .9, h: .85, cls: 'acc' },
    panchina: { w: 1.8, d: .6, h: .9, cls: 'sec' },
    // di traverso (fra due muri)
    luminarie: { filo: true, cls: 'sec' },
    bucato: { filo: true, cls: 'acc' },
  };

  // ================= LE RICETTE =================
  // aggancio: { tipo: 'bottega', usi } (la bottega per mestiere, fronte S o E, vicina al luogo o alla scenografia), { tipo: 'parete',
  // set } (il muro S o E che fa da fondale a una piazzetta), { tipo: 'porta', id } (la porta di un edificio con nome), { tipo: 'spazio',
  // set } (uno spazio libero di una scenografia, per le cose che stanno da sole). vicino: il luogo-missione (W.luoghi.id) o la scenografia.
  // fronte: il kit del muro (stile della fascia per epoca, i testi, i marchi); cose: [kit, slot, opzioni]; posti: [tipo, slot]; ore: gli stati.
  // Gli slot a muro: fascia, bandiera (in testa alla fascia), lampada, pilastro (un tratto di muro pieno: lontano o vicino al portone, o
  // all'angolo), sopra_porta, zoccolo, aperture (per ogni apertura della bottega: serranda, griglia, vetrofania, pannello), soglia.
  // A terra: vetrina (davanti alla propria vetrina), piede (contro il muro, su un pilastro), spazio (nello spazio libero davanti, verso
  // la camera o nell'angolo), traverso (un filo fino al muro di fronte).
  const RICETTE = [
    { id: 'pozzo_gino', nome: 'Bar Da Gino, il tavolo della scopa', luogo: 'bar', aggancio: { tipo: 'parete', set: q => q.k === 'piazzetta' && q.bar },
      ispirato: 'diorama_bar_quarticciolo', focale: 'tavolo_scopa',
      fronte: { stile: 'dipinta', testo: 'BAR DA GINO', sotto: 'CAFFÈ · VINI · LIQUORI', marchio: null },
      cose: [['fascia', 'fascia_muro', { w: 3.2 }], ['bandiera', 'bandiera', { marchio: 'peroni' }], ['lampada', 'lampada'], ['crepa', 'pilastro', { pref: 'alto' }],
        ['targa', 'pilastro', { pref: 'angolo', testo: 'PIAZZETTA\nDEL POZZO' }], ['necrologi', 'pilastro', { pref: 'lontano' }], ['zoccolo', 'zoccolo'],
        ['tavolo_scopa', 'spazio', { pref: 'camera' }], ['casse_birre', 'piede', { pref: 'vicino' }], ['luminarie', 'traverso', { y: 4.4, n: 2 }]],
      mezzi: [['ape', '#9ab07a', 'spazio_largo']],
      posti: [['carte', 'tavolo_scopa'], ['comari', 'piede']],
      ore: { tavoli: [8, 22.5], luci: [18.5, 1], luminarie: [19, 1] } },
    { id: 'forno_lella', nome: 'Forno di Lella, la bocca del forno', luogo: 'forno', aggancio: { tipo: 'parete', set: q => q.k === 'piazzetta' && q.forno },
      focale: 'bocca_forno',
      fronte: { stile: 'dipinta', testo: 'FORNO A LEGNA', sotto: 'PANE · FOCACCE · BISCOTTI' },
      cose: [['bocca_forno', 'pilastro', { pref: 'centro', min: 1.7 }], ['fascia', 'fascia_muro', { w: 2.8 }], ['lavagna_muro', 'pilastro', { pref: 'vicino', testo: 'PANE CALDO\nDALLE 6.30' }], ['lampada', 'lampada'],
        ['catasta', 'piede', { pref: 'lontano', anche: 'spazio' }], ['banchetto', 'piede', { pref: 'vicino', merce: 'pane', gruppo: 'merce', anche: 'spazio' }], ['sacchi', 'piede', { pref: 'angolo', anche: 'spazio' }], ['zoccolo', 'zoccolo']],
      posti: [['fila', 'banchetto']],
      ore: { forno: [[4, 10], [16.5, 19.5]], merce: [6, 13.5], luci: [18.5, 6.5] } },
    { id: 'sagrato_votiva', nome: 'L\'angolo del sagrato, la Madonna dei lumini', luogo: 'chiesa', aggancio: { tipo: 'parete', set: q => q.k === 'sagrato', faccia: 'E' },
      focale: 'edicola_votiva', sostituisce: ['edicola_votiva'],
      fronte: { stile: null },
      cose: [['edicola_votiva', 'pilastro', { pref: 'centro', y: 2.0 }], ['lumini', 'sotto', { di: 'edicola_votiva' }], ['necrologi', 'pilastro', { pref: 'vicino' }], ['targa', 'pilastro', { pref: 'angolo', testo: 'PIAZZA\nSAN ROCCO' }],
        ['telefono_muro', 'pilastro', { pref: 'lontano' }], ['panchina', 'piede', { pref: 'centro' }], ['secchi_fiori', 'piede', { pref: 'vicino', gruppo: 'merce' }], ['crepa', 'pilastro', { pref: 'alto' }]],
      posti: [['comari', 'panchina'], ['telefono', 'telefono_muro'], ['gioco', 'spazio']],
      ore: { merce: [7.5, 12.5], luci: [17.5, 7] } },
    { id: 'marina_ferramenta', nome: 'Ferramenta della Marina', luogo: 'pescheria', aggancio: { tipo: 'bottega', usi: /ferram|attrezz/ },
      focale: 'fascia', sostituisce: ['edicola_votiva'],
      fronte: { stile: 'tavola', testo: 'FERRAMENTA', sotto: 'COLORI · CASALINGHI · GAS', tenda: 'FERRAMENTA · COLORI' },
      cose: [['fascia', 'fascia'], ['tenda', 'tenda', { col: '#2f6a46' }], ['bandiera', 'bandiera', { marchio: 'gas' }], ['lampada', 'lampada'], ['insegna2', 'sopra_vetrina', { testo: 'VERNICI · CORDAMI' }],
        ['serranda', 'aperture'], ['zoccolo', 'zoccolo'], ['soglia', 'soglia'],
        ['bombole', 'vetrina', { gruppo: 'merce', lontano: true }], ['scope', 'vetrina', { gruppo: 'merce', vicino: true }], ['secchi', 'vetrina', { gruppo: 'merce' }], ['rifiuti', 'piede', { pref: 'lontano' }]],
      posti: [['vetrina', 'fascia']],
      ore: { aperto: [[8, 13], [16.5, 20]], mezza: [13, 16.5], merce: [8.5, 19.5], luci: [18.5, 23] } },
    { id: 'pescheria_marina', nome: 'Il banco del pesce sulla Marina', luogo: 'pescheria', aggancio: { tipo: 'spazio', set: q => q.k === 'marina' },
      ispirato: 'angolo_diorama', focale: 'banco_pesce',
      cose: [['banco_pesce', 'spazio', { pref: 'bordo', gruppo: 'banco' }], ['polistirolo', 'spazio', { pref: 'accanto', di: 'banco_pesce' }], ['cassette', 'spazio', { pref: 'accanto2', di: 'banco_pesce', merce: 'pesce' }]],
      posti: [['banco_pesce', 'banco_pesce']],
      ore: { banco: [5, 13], luci: [5, 7.5] } },
    { id: 'officina_scalo', nome: 'Il piazzale dell\'Officina dello Scalo', luogo: 'officina', aggancio: { tipo: 'spazio', set: q => q.k === 'scalo' },
      focale: 'cartellone',
      cose: [['cartellone', 'spazio', { pref: 'centro', testo: 'OFFICINA DORINO', sotto: 'ELETTRAUTO · GOMMISTA' }], ['gomme', 'spazio', { pref: 'accanto', di: 'cartellone' }], ['fusti', 'spazio', { pref: 'accanto2', di: 'cartellone' }],
        ['banco_lavoro', 'spazio', { pref: 'accanto3', di: 'cartellone' }], ['motore', 'spazio', { pref: 'accanto4', di: 'cartellone' }]],
      mezzi: [['f126', '#c8b890', 'accanto_auto'], ['ape', '#d8c070', 'accanto_auto2']],
      posti: [['carico', 'banco_lavoro']],
      ore: { luci: [18.5, 22] } },
    { id: 'tabacchi_corso', nome: 'Tabacchi e giornali sul Corso', aggancio: { tipo: 'bottega', usi: /tabacc/ },
      ispirato: 'edicola_vetrina', focale: 'fascia',
      fronte: { stile: 'cassonetto', testo: 'TABACCHI', sotto: 'GIORNALI · RIVISTE', marchio: 'cocacola', tenda: 'GIORNALI · TABACCHI' },
      cose: [['fascia', 'fascia'], ['tenda', 'tenda', { col: '#1e3a7a' }], ['bandiera', 'bandiera', { marchio: 'T' }], ['insegna2', 'sopra_vetrina', { testo: 'SALI E TABACCHI' }],
        ['griglia', 'aperture', { solo: 'vetrina' }], ['vetrofania', 'aperture', { solo: 'vetrina', carta: 'riviste' }], ['serranda', 'aperture', { tag: true }], ['zoccolo', 'zoccolo'], ['soglia', 'soglia'],
        ['cassone', 'vetrina', { gruppo: 'merce', lontano: true }], ['locandina', 'vetrina', { gruppo: 'merce', vicino: true }]],
      posti: [['edicola', 'locandina']],
      ore: { aperto: [[6.5, 13], [15.5, 20.5]], mezza: [13, 15.5], merce: [6.5, 20], luci: [17.5, 23.5] } },
    { id: 'drogheria_telefono', nome: 'La drogheria col telefono', aggancio: { tipo: 'bottega', usi: /droghe|alimentar|^wu$/ },
      ispirato: 'drogheria_telefono', focale: 'fascia',
      fronte: { stile: 'dipinta', testo: 'DROGHERIA', sotto: 'SALUMI · VINI · CAFFÈ · DETERSIVI', tenda: 'ALIMENTARI' },
      cose: [['fascia', 'fascia'], ['tenda', 'tenda', { col: '#c8202a' }], ['festoni', 'festoni'], ['pannello_forato', 'aperture', { solo: 'vetrina' }], ['vetrofania', 'aperture', { solo: 'vetrina', carta: 'prezzi' }],
        ['serranda', 'aperture'], ['zoccolo', 'zoccolo'], ['soglia', 'soglia'], ['lampada', 'lampada'],
        ['telefono_palo', 'vetrina', { lontano: true, fuori: true }], ['cassette', 'vetrina', { gruppo: 'merce', merce: 'verdura', vicino: true }], ['rifiuti', 'piede', { pref: 'vicino' }]],
      posti: [['telefono', 'telefono_palo'], ['vetrina', 'fascia']],
      ore: { aperto: [[7.5, 13], [16.5, 20]], mezza: [13, 16.5], merce: [7.5, 19.5], luci: [18, 22] } },
    { id: 'latteria', nome: 'La latteria coi gelati', aggancio: { tipo: 'bottega', usi: /latter|gelat/ },
      focale: 'frigo',
      fronte: { stile: 'dipinta', testo: 'LATTERIA', sotto: 'LATTE · BURRO · UOVA', tenda: 'GELATI · LATTE' },
      cose: [['fascia', 'fascia'], ['tenda', 'tenda', { col: '#2a5ab0' }], ['bandiera', 'bandiera', { marchio: 'sammontana' }], ['lampada', 'lampada'], ['serranda', 'aperture'], ['zoccolo', 'zoccolo'], ['soglia', 'soglia'],
        ['frigo', 'vetrina', { gruppo: 'merce', lontano: true }], ['cassette_latte', 'vetrina', { gruppo: 'merce', vicino: true }]],
      posti: [['gioco', 'frigo']],
      ore: { aperto: [[7, 13], [16, 20.5]], mezza: [13, 16], merce: [9, 20], luci: [18, 22] } },
    { id: 'barbiere', nome: 'Il barbiere', aggancio: { tipo: 'bottega', usi: /barbier/ },
      focale: 'palo_barbiere',
      fronte: { stile: 'tavola', testo: 'BARBIERE', sotto: 'TAGLIO · BARBA · SHAMPOO', tenda: 'BARBIERE' },
      cose: [['fascia', 'fascia'], ['tenda', 'tenda', { col: '#8a1e2a' }], ['palo_barbiere', 'bandiera'], ['serranda', 'aperture'], ['vetrofania', 'aperture', { solo: 'vetrina', carta: 'tendina' }], ['zoccolo', 'zoccolo'], ['soglia', 'soglia'],
        ['panca', 'vetrina', { lontano: true, gruppo: 'merce' }]],
      posti: [['panchina', 'panca']],
      ore: { aperto: [[8.5, 12.5], [15.5, 19.5]], mezza: [12.5, 15.5], merce: [8.5, 19.5], luci: [17.5, 20] } },
    { id: 'serranda_chiusa', nome: 'La bottega chiusa, la serranda taggata', aggancio: { tipo: 'bottega', usi: /mercer|calzol|sartor|orolog|abbigl|cartol|profum|palestr|tipogr/, vicolo: true },
      focale: 'serranda',
      fronte: { stile: 'dipinta', testo: '', sotto: '', sbiadita: true },
      cose: [['fascia', 'fascia', { fantasma: true }], ['serranda', 'aperture', { tag: true, sempre: true }], ['manifesti', 'sulla_serranda', { carta: 'strati' }], ['zoccolo', 'zoccolo', { forte: true }],
        ['lampada', 'lampada', { trema: true }], ['rifiuti', 'piede', { pref: 'vicino' }]],
      posti: [['angolo', 'spazio']],
      ore: { chiuso: true, luci: [19, 5] } },
    { id: 'radio_luna', nome: 'Radio Luna, la porta del magazzino', luogo: 'radio', aggancio: { tipo: 'porta', id: 'disco' },
      focale: 'fascia',
      fronte: { stile: 'mano', testo: 'RADIO LUNA', sotto: '98.6 FM · IN ONDA' },
      cose: [['fascia', 'fascia_muro', { w: 3.4 }], ['manifesti', 'pilastro', { pref: 'vicino', carta: 'concerti' }], ['manifesti', 'pilastro', { pref: 'lontano', carta: 'disgelo' }], ['lampada', 'lampada'],
        ['luminarie', 'festoni_luci'], ['boombox', 'piede', { pref: 'vicino' }], ['casse_birre', 'piede', { pref: 'lontano' }]],
      mezzi: [['ciao', '#d8473f', 'accanto_porta']],
      posti: [['angolo', 'boombox']],
      ore: { luci: [19, 3], luminarie: [20, 3] } },
  ];

  // ================= LA ZONA DELLA CUCITURA =================
  const RD = id => (W.roads || []).find(r => r.id === id);
  function distRoad(rd, x, y) { if (!rd || !rd.pts) return 1e9; let d = 1e9; for (let k = 0; k < rd.pts.length - 1; k++) { const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1], L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1, t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2, 0, 1); d = Math.min(d, hyp(ax + (bx - ax) * t - x, ay + (by - ay) * t - y)); } return d; }
  function cucitura(x, y) {
    // sempre fuori: la Passeggiata della Spianata, la spianata, il Recinto del Garante e la Rocca (il palco del potere: niente diorami)
    const pas = RD('passeggiata'); if (pas && x > Math.min(...pas.pts.map(p => p[0])) - 6) return true;
    if (W.recinto && x > W.recinto.xw - 8) return true;
    if (W.WALL && x > W.WALL.x - 30) return true;
    if (!CFG.ATTESA_CUCITURA) return false;
    const vit = RD('vittoria'); if (vit && distRoad(vit, x, y) < vit.w / 2 + 12) return true;   // la Vittoria coi suoi due fronti
    const ad = (W.sets || []).find(s => s.k === 'adunata'); if (ad && x > ad.x0 - 5 && x < ad.x1 + 5 && y > ad.y0 - 5 && y < ad.y1 + 5) return true;   // la Piazza Grande
    return false;
  }

  // ================= IL FRONTE: la gabbia di un lato di un edificio =================
  const tl = (tx, ty) => (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) ? -1 : G.tileAt(tx, ty);
  const tlM = (x, z) => tl(Math.floor(x / TS), Math.floor(z / TS));
  const aperto = v => v === G.T.WALK || v === G.T.PIAZZA || v === G.T.COB || v === G.T.QUAY || v === G.T.DIRT || v === G.T.GRAVEL || v === G.T.SAND;
  const strada = v => v === G.T.VIA;
  function fronte(b, f) {
    const x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS;
    const F = { S: [x0, z0 + d, 0], N: [x0 + w, z0, PI], E: [x0 + w, z0 + d, PI / 2], W: [x0, z0, -PI / 2] }[f];
    const L = f === 'S' || f === 'N' ? w : d, T = [Math.cos(F[2]), -Math.sin(F[2])], N = [Math.sin(F[2]), Math.cos(F[2])];
    const uTile = (tx, ty) => f === 'S' ? tx * TS + 1 - x0 : f === 'N' ? x0 + w - (tx * TS + 1) : f === 'E' ? z0 + d - (ty * TS + 1) : ty * TS + 1 - z0;
    const wp = (u, v) => [F[0] + T[0] * u + N[0] * v, F[1] + T[1] * u + N[1] * v];
    const sul = t => t && CH.lato(b, t[0], t[1]) === f;
    // le aperture del piano terra note dai dati: il portone, la porta della bottega, le vetrine (una casella l'una)
    const ap = []; if (sul(b.door)) ap.push({ u: uTile(b.door[0], b.door[1]), w: 1.1, tipo: 'portone' });
    const S = b.shopFront; if (S && S.door && sul(S.door)) { ap.push({ u: uTile(S.door[0], S.door[1]), w: 1.1, tipo: 'porta' });
      if (S.span) { const [a, c] = S.span; for (let tx = Math.min(a[0], c[0]); tx <= Math.max(a[0], c[0]); tx++) for (let ty = Math.min(a[1], c[1]); ty <= Math.max(a[1], c[1]); ty++) if (!(tx === S.door[0] && ty === S.door[1]) && CH.lato(b, tx, ty) === f) ap.push({ u: uTile(tx, ty), w: 1.6, tipo: 'vetrina' }); } }
    // la profondità libera davanti, a passi di 25 cm lungo il muro: fino alla prima casella chiusa (aperto) e fino alla carreggiata
    const prof = u => { let v = .25, vs = null; for (; v < 9; v += .25) { const q = wp(u, v), t = tlM(q[0], q[1]); if (strada(t)) { if (vs === null) vs = v; continue; } if (!aperto(t)) break; } return { v, vs: vs === null ? v : vs }; };
    return { b, bi: G.BUILDINGS.indexOf(b), f, o: [F[0], F[1]], rot: F[2], T, N, L, wp, uTile, ap, prof, base: 0 };
  }
  // quanto si vede il piano terra di un tratto di fronte dalla camera di gioco (yaw π/4, pendenza ~0,75 rad): raggi da punti del fronte
  // verso la camera contro le case (alte 3,6 m il piano terra più 2,4 a piano, più il tetto); 0 tutto coperto, 1 tutto in vista
  const TAN = Math.tan(.75), CAMX = Math.SQRT1_2, CAMZ = Math.SQRT1_2;
  function vista(fr, ua, ub) { let ok = 0, n = 0; for (let u = ua + .3; u <= ub - .3 + 1e-6; u += Math.max(.5, (ub - ua - .6) / 4)) for (const y of [.6, 1.6, 2.8]) { n++; const [x0, z0] = fr.wp(u, .35); let lib = true;
      for (let d = .5; d < 30; d += .5) { const x = x0 + CAMX * d, z = z0 + CAMZ * d, tx = Math.floor(x / TS), tz = Math.floor(z / TS); if (tl(tx, tz) !== G.T.BLD) continue; const bi = W.bIndex ? W.bIndex[tz * G.GW + tx] : -1, bb = bi >= 0 ? G.BUILDINGS[bi] : null; if (bb === fr.b) continue;
        const h = bb ? CFG.MG + (Math.max(1, bb.fl || 1) - 1) * 2.4 + .8 : 4; if (y + d * TAN < h) { lib = false; break; } }
      if (lib) ok++; } return n ? ok / n : 0; }
  // i tratti di muro pieno del piano terra (fra le aperture note, con 15 cm di respiro), lunghi almeno m metri
  function pilastri(fr, m) { const A = fr.ap.map(a => [a.u - a.w / 2 - .15, a.u + a.w / 2 + .15]).sort((p, q) => p[0] - q[0]); const out = []; let u = .35;
    A.forEach(([a, c]) => { if (a - u >= m) out.push([u, a]); u = Math.max(u, c); }); if (fr.L - .35 - u >= m) out.push([u, fr.L - .35]); return out; }

  // ================= I DIVIETI: porte, vetrine, scale =================
  let FR = null, PORTE = null;
  function divieti() {
    if (FR) return; FR = CH.fronti(G.BUILDINGS, TS, tl, G.T, G.GW, G.GH, W.pezzi);
    PORTE = FR.filter(q => q.tipo === 'porta');
  }
  // un punto a terra è vietato? (propria: la roba della bottega b davanti alla sua vetrina, entro CFG.vetrina.propria dal muro)
  function vietato(x, z, b, propria, pad) {
    divieti(); const p = pad || 0;
    for (const q of PORTE) { const dx = x - q.x, dz = z - q.z, v = dx * q.nx + dz * q.nz, u = Math.abs(-dx * q.nz + dz * q.nx); if (v > -.3 && v < CFG.porta.prof + p && u < CFG.porta.meta + p) return 'porta'; }
    const q = CH.davanti(FR, x, z, p);
    if (q && q.tipo === 'scala') return 'scala';
    if (q && q.tipo === 'vetrina') { const dx = x - q.x, dz = z - q.z, v = dx * q.nx + dz * q.nz; if (v < CFG.vetrina.prof && !(propria && q.b === b && v < CFG.vetrina.propria)) return 'vetrina'; }
    for (const s of FR) if (s.tipo === 'scala' && hyp(x - s.x, z - s.z) < s.half + CFG.scala + p) return 'scala';
    return null;
  }
  // gli ingombri già presi: dagli scorci, dai pezzi grandi, dalle vie vive (edicole, fermate, plance, stalli)
  let OCC = [];
  const obb = (x, z, yaw, hw, hd, k, sc) => ({ x, z, c: Math.cos(yaw), s: Math.sin(yaw), hw, hd, k, sc });
  function sat(A, B2) { const ax = [[A.c, -A.s], [A.s, A.c], [B2.c, -B2.s], [B2.s, B2.c]];
    const corn = Q => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [Q.x + (a * Q.hw) * Q.c + (b * Q.hd) * Q.s, Q.z - (a * Q.hw) * Q.s + (b * Q.hd) * Q.c]);
    const ca = corn(A), cb = corn(B2); let pen = 1e9; for (const [ux, uz] of ax) { let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9; ca.forEach(p => { const t = p[0] * ux + p[1] * uz; a0 = Math.min(a0, t); a1 = Math.max(a1, t); }); cb.forEach(p => { const t = p[0] * ux + p[1] * uz; b0 = Math.min(b0, t); b1 = Math.max(b1, t); }); const o = Math.min(a1, b1) - Math.max(a0, b0); if (o <= 0) return 0; pen = Math.min(pen, o); } return pen; }
  function occupaFissi() {
    OCC = [];
    (W.pezzi || []).forEach(p => { const o = p.opz || {}; if (p.tipo === 'edicola_votiva' || p.tipo === 'arco_contrasto' || p.tipo === 'arco_sottopasso' || p.tipo === 'portico' || p.tipo === 'molo_vecchio' || p.tipo === 'calata' || p.tipo === 'darsena' || p.tipo === 'scogliera') return;
      const r = p.tipo === 'pozzo' ? (o.r || .8) + .7 : p.tipo === 'fontana' ? (o.r || 1.8) + .5 : p.tipo === 'lavatoio' ? Math.max(o.L || 4, 3) / 2 + .6 : p.tipo === 'bitta' ? .5 : p.tipo === 'grata_vapore' ? 1.5 : p.tipo === 'scalinata' ? 0 : p.tipo === 'scalo_alaggio' ? (o.w || 6) / 2 + .5 : null;
      if (r) OCC.push(obb(p.x, p.y, 0, r, p.tipo === 'scalo_alaggio' ? (o.L || 12) / 2 : r, 'pezzo:' + p.tipo)); });
    const VV = typeof Vievive !== 'undefined' && Vievive && Vievive.attivo ? Vievive : null;
    if (VV) { VV.edicole().forEach(e => OCC.push(obb(e.kx, e.ky, e.kang, 2.4, 2.2, 'edicola')));
      VV.fermate().forEach(f => OCC.push(obb(f.x, f.y, f.dir || 0, 2.4, 1.4, 'fermata'))); VV.plance().forEach(p => OCC.push(obb(p.x, p.y, p.ang || 0, 1.4, .5, 'plancia')));
      VV.stalli().forEach(s => OCC.push(obb(s.x, s.y, s.ang || 0, 2.6, 1.2, 'stallo'))); }
  }
  const occupato = Q => OCC.find(o => sat(Q, o) > .02) || null;

  // ================= L'AGGANCIO =================
  const luogo = id => (W.luoghi || []).find(l => l.id === id) || null;
  const setOf = f => (W.sets || []).find(f) || null;
  const setC = s => s.x !== undefined ? [s.x, s.y] : [(s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2];
  const setR = s => s.r || Math.max(s.x1 - s.x0, s.y1 - s.y0) / 2;
  const inSet = (s, x, z, m) => s.r ? hyp(x - s.x, z - s.y) <= s.r + (m || 0) : x >= s.x0 - (m || 0) && x <= s.x1 + (m || 0) && z >= s.y0 - (m || 0) && z <= s.y1 + (m || 0);
  const PRESE = new Set();   // gli edifici già presi da uno scorcio (uno scorcio per bottega)
  function agganciaBottega(R) {
    const A = R.aggancio, tgt = R.luogo ? luogo(R.luogo) : null, cand = [];
    G.BUILDINGS.forEach((b, bi) => { const S = b.shopFront; if (!S || !S.door || !S.span || PRESE.has(bi) || !A.usi.test(S.use || b.use || '')) return;
      ['S', 'E'].forEach(f => { if (CH.lato(b, S.door[0], S.door[1]) !== f) return; const fr = fronte(b, f), du = fr.ap.find(a => a.tipo === 'porta'); if (!du) return;
        const [x, z] = fr.wp(du.u, 1); if (cucitura(x, z)) return; const pr = fr.prof(du.u); if (pr.v < 1.6) return;
        const rd = nomeVia(x, z), vic = rd && rd.kind === 'vicolo';
        const vi = vista(fr, Math.max(.3, du.u - 2.5), Math.min(fr.L - .3, du.u + 2.5));
        let s = (tgt ? hyp(tgt.x - x, tgt.y - z) : 0) - pr.v * .5 - vi * 25 - (A.vicolo && vic ? 15 : 0) + hash(b.x, b.y, 4) * 3; cand.push({ s, b, bi, fr, x, z, vi }); }); });
    cand.sort((p, q) => p.s - q.s); return cand[0] || null;
  }
  function agganciaParete(R) {
    const A = R.aggancio, s = setOf(A.set); if (!s) return null; const [cx, cz] = setC(s), r = setR(s), cand = [];
    G.BUILDINGS.forEach((b, bi) => { if (PRESE.has(bi)) return; const bx = (b.x + b.w / 2) * TS, bz = (b.y + b.h / 2) * TS; if (hyp(bx - cx, bz - cz) > r + 18) return;
      ['S', 'E'].forEach(f => { if (A.faccia && A.faccia !== f) return; const fr = fronte(b, f); let ua = null, ub = null;
        for (let u = .5; u <= fr.L - .5; u += .5) { const [x, z] = fr.wp(u, 1.2), t = tlM(x, z); const dentro = inSet(s, x, z, 1.5) && aperto(t); if (dentro) { if (ua === null) ua = u; ub = u; } }
        if (ua === null || ub - ua < 2.5) return; const [x, z] = fr.wp((ua + ub) / 2, 1); if (cucitura(x, z)) return;
        const porte = fr.ap.filter(a => a.u > ua - .6 && a.u < ub + .6).length, pil = pilastri(fr, 1.2).filter(([a, c]) => c > ua && a < ub);
        const vi = vista(fr, ua, ub); cand.push({ s: -(ub - ua) + porte * 1.5 - (f === 'S' ? 1 : 0) - pil.length * .5 - vi * 12 + hash(b.x, b.y, 5), b, bi, fr, ua: ua - .5, ub: ub + .5, x, z, vi }); }); });
    cand.sort((p, q) => p.s - q.s); return cand[0] || null;
  }
  function agganciaPorta(R) {
    const b = G.BUILDINGS.find(q => q.id === R.aggancio.id); if (!b || !b.door) return null; const f = CH.lato(b, b.door[0], b.door[1]); if (f !== 'S' && f !== 'E') return null;
    const fr = fronte(b, f), ud = fr.uTile(b.door[0], b.door[1]), [x, z] = fr.wp(ud, 1); if (cucitura(x, z)) return null; return { b, bi: G.BUILDINGS.indexOf(b), fr, x, z, vi: vista(fr, Math.max(.3, ud - 3), Math.min(fr.L - .3, ud + 3)) };
  }
  function agganciaSpazio(R) {
    const s = setOf(R.aggancio.set); if (!s) return null; const [cx, cz] = setC(s), r = setR(s);
    if (cucitura(cx, cz)) return null; return { set: s, x: cx, z: cz, r };
  }
  function nomeVia(x, z) { let rd = null, bd = 1e9; (W.roads || []).forEach(q => { if (!q.pts) return; const d = distRoad(q, x, z); if (d < bd && d < q.w / 2 + 4) { bd = d; rd = q; } }); return rd; }

  // ================= LA POSA: gli slot della gabbia =================
  // ogni cosa: { k, x, z (il punto a terra o sul filo del muro), yaw (il davanti), u, v (nel fronte), y (dal piano terra), w, d, h, muro,
  // propria (merce della bottega), gruppo (lo stato che la accende), opz }
  function risolvi(R) {
    const A = R.aggancio, ag = A.tipo === 'bottega' ? agganciaBottega(R) : A.tipo === 'parete' ? agganciaParete(R) : A.tipo === 'porta' ? agganciaPorta(R) : agganciaSpazio(R);
    if (!ag) return { id: R.id, ok: false, perche: 'nessun aggancio' };
    const sc = { id: R.id, nome: R.nome, R, ok: true, vista: ag.vi !== undefined ? +ag.vi.toFixed(2) : null, cose: [], mezzi: [], posti: [], scarti: [], fr: ag.fr || null, b: ag.b || null, bi: ag.bi !== undefined ? ag.bi : -1, set: ag.set || null };
    if (ag.bi !== undefined && ag.bi >= 0) PRESE.add(ag.bi);
    const fr = ag.fr, b = ag.b; let ua = 0, ub = fr ? fr.L : 0, uS0 = null, uS1 = null, uD = null, uP = null;
    if (fr) { const sh = fr.ap.filter(a => a.tipo === 'porta' || a.tipo === 'vetrina'); uP = (fr.ap.find(a => a.tipo === 'portone') || {}).u; uD = (fr.ap.find(a => a.tipo === 'porta') || {}).u;
      if (sh.length) { uS0 = Math.min(...sh.map(a => a.u - a.w / 2)); uS1 = Math.max(...sh.map(a => a.u + a.w / 2)); }
      if (A.tipo === 'parete') { ua = ag.ua; ub = ag.ub; }
      else if (A.tipo === 'porta') { const ud = fr.uTile(b.door[0], b.door[1]); ua = Math.max(.3, ud - 3.5); ub = Math.min(fr.L - .3, ud + 3.5); uD = ud; uS0 = ud - .6; uS1 = ud + .6; }
      else { ua = Math.max(.3, uS0 - 2.2); ub = Math.min(fr.L - .3, uS1 + 2.2); } }
    sc.ua = ua; sc.ub = ub; sc.uS = [uS0, uS1]; sc.uD = uD; sc.uP = uP;
    const presi = []; const usoU = (a, c, y0, y1) => presi.some(p => p.muro && p.y < y1 && p.y + p.h > y0 && p.u - p.w / 2 < c && p.u + p.w / 2 > a);
    const apAt = (a, c, y0, y1) => fr ? fr.ap.some(q => y0 < 2.4 && q.u - q.w / 2 - .1 < c && q.u + q.w / 2 + .1 > a) : false;
    const metti = (k, o) => { const K = KIT[k] || {}, q = Object.assign({ k, w: K.w, d: K.d, h: K.h, y: K.y || 0, muro: !!(K.muro || K.filo), cls: K.cls, opz: {} }, o); q.id = sc.id + ':' + k + ':' + sc.cose.length; sc.cose.push(q); presi.push(q); return q; };
    // a muro: il punto sul filo del muro e il verso
    const aMuro = (k, u, y, extra) => { const [x, z] = fr.wp(u, 0); return metti(k, Object.assign({ x, z, u, v: 0, yaw: fr.rot, y }, extra)); };
    // a terra davanti al muro: centro a v dal filo
    const aTerra = (k, u, v, extra, yaw) => { const [x, z] = fr.wp(u, v); return metti(k, Object.assign({ x, z, u, v, yaw: yaw === undefined ? fr.rot : yaw, y: 0 }, extra)); };
    const prova = (k, x, z, yaw, opz) => { const K = KIT[k] || {}, Q = obb(x, z, yaw, (opz.w || K.w) / 2, (opz.d || K.d) / 2, k, sc.id);
      for (const [a, c] of [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1], [.5, 1], [-.5, 1], [.5, -1], [-.5, -1]]) { const px = x + a * Q.hw * .97 * Q.c + c * Q.hd * .97 * Q.s, pz = z - a * Q.hw * .97 * Q.s + c * Q.hd * .97 * Q.c, t = tlM(px, pz);
        if (!aperto(t) && !(opz.strada && strada(t))) return 'suolo'; const vv = vietato(px, pz, b, opz.propria); if (vv) return vv; }
      const o = occupato(Q); if (o) return 'occupato:' + o.k; return null; };
    const posa = (k, x, z, yaw, extra) => { const K = KIT[k] || {}; OCC.push(obb(x, z, yaw, (extra.w || K.w) / 2, (extra.d || K.d) / 2, k, sc.id)); return metti(k, Object.assign({ x, z, yaw, y: 0 }, extra)); };
    const scarta = (k, slot, perche) => sc.scarti.push(k + '@' + slot + ': ' + perche);
    const Fz = sc.R.fronte || {};
    // i pilastri pieni dentro il tratto dello scorcio
    const pil = fr ? pilastri(fr, .7).map(([a, c]) => [Math.max(a, ua), Math.min(c, ub)]).filter(([a, c]) => c - a >= .7) : [];
    const centro = fr ? (uD !== null && uD !== undefined ? uD : (ua + ub) / 2) : 0;
    const scegliPil = (pref, w, y0, y1) => { const P = pil.map(([a, c]) => ({ a, c, m: (a + c) / 2 })).filter(p => p.c - p.a >= w + .1)
        .map(p => { const lib = []; for (let u = p.a + w / 2 + .05; u <= p.c - w / 2 - .05 + 1e-6; u += .1) if (!usoU(u - w / 2, u + w / 2, y0, y1) && !apAt(u - w / 2, u + w / 2, y0, y1)) lib.push(u); return Object.assign(p, { lib }); }).filter(p => p.lib.length);
      if (!P.length) return null; const dist = u => Math.abs(u - centro), ang = u => Math.min(u - ua, ub - u);
      const all = []; P.forEach(p => p.lib.forEach(u => all.push(u)));
      if (pref === 'lontano') all.sort((p, q) => dist(q) - dist(p)); else if (pref === 'angolo') all.sort((p, q) => ang(p) - ang(q)); else if (pref === 'vicino' || pref === 'alto') all.sort((p, q) => dist(p) - dist(q) - (pref === 'alto' ? 0 : 0)); else all.sort((p, q) => Math.abs(p - (ua + ub) / 2) - Math.abs(q - (ua + ub) / 2));
      return all[0]; };
    (R.cose || []).forEach(([k, slot, o0]) => { const o = Object.assign({}, o0 || {}), K = KIT[k] || {};
      if (!fr && slot !== 'spazio') { scarta(k, slot, 'nessun fronte'); return; }
      if (slot === 'fascia' || slot === 'fascia_muro') { let a = uS0, c = uS1; if (slot === 'fascia_muro' || a === null) { const w = Math.min(o.w || 3, ub - ua - .4); const m = slot === 'fascia_muro' && R.aggancio.tipo === 'parete' ? (scegliPil('centro', Math.min(w, 2.4), 2.5, 3.4) || (ua + ub) / 2) : (uD !== null && uD !== undefined ? uD : (ua + ub) / 2); a = m - w / 2; c = m + w / 2; }
        a = Math.max(.25, a - .15); c = Math.min(fr.L - .25, c + .15); const w = Math.min(c - a, 6.2), u = (a + c) / 2; aMuro('fascia', u, K.y, { w, opz: Object.assign({ stile: Fz.stile, testo: Fz.testo, sotto: Fz.sotto, marchio: Fz.marchio, sbiadita: Fz.sbiadita }, o) }); return; }
      if (slot === 'bandiera') { const f = presi.find(p => p.k === 'fascia'), cand = f ? [f.u + f.w / 2 + .3, f.u - f.w / 2 - .3] : [ub - .5, ua + .5];
        const u = cand.find(u => u > .35 && u < fr.L - .35 && !usoU(u - .2, u + .2, K.y, K.y + K.h)); if (u === undefined) { scarta(k, slot, 'nessun posto in testa alla fascia'); return; } aMuro(k, u, K.y, { opz: o }); return; }
      if (slot === 'lampada') { const f = presi.find(p => p.k === 'fascia'); const u = f ? f.u : (uD !== null && uD !== undefined ? uD : (ua + ub) / 2); aMuro(k, u, K.y + (f ? 0 : -.2), { opz: o }); return; }
      if (slot === 'festoni') { const f = presi.find(p => p.k === 'fascia'); if (!f) { scarta(k, slot, 'senza fascia'); return; } aMuro(k, f.u, f.y + f.h + .02, { w: f.w + .3, opz: o }); return; }
      if (slot === 'festoni_luci') { const f = presi.find(p => p.k === 'fascia'); const u = f ? f.u : centro, w = f ? f.w + .8 : 3; aMuro('luminarie', u, 3.45, { w, filo: 'facciata', opz: Object.assign({ n: 1 }, o) }); return; }
      if (slot === 'tenda') { const V = fr.ap.filter(a => a.tipo === 'vetrina'); if (!V.length) { scarta(k, slot, 'nessuna vetrina'); return; } const a = Math.min(...V.map(q => q.u - q.w / 2)) - .1, c = Math.max(...V.map(q => q.u + q.w / 2)) + .1;
        const pr = Math.min(...[a + .2, (a + c) / 2, c - .2].map(u => fr.prof(u).v)); const D = Math.min(1.3, pr - .8); if (D < .7) { scarta(k, slot, 'il marciapiede è stretto'); return; }
        aMuro(k, (a + c) / 2, K.y, { w: c - a, d: D, opz: Object.assign({ d: D, testo: Fz.tenda || Fz.testo }, o) }); return; }
      if (slot === 'sopra_vetrina') { const v = fr.ap.filter(a => a.tipo === 'vetrina'); const q = v.length ? v.reduce((p, a) => Math.abs(a.u - (uD || 0)) > Math.abs(p.u - (uD || 0)) ? a : p, v[0]) : null; if (!q) { scarta(k, slot, 'nessuna vetrina'); return; } aMuro(k, q.u, K.y, { w: Math.min(1.5, q.w), opz: o }); return; }
      if (slot === 'zoccolo') { const a = Math.max(ua, (uS0 !== null ? uS0 : ua) - 1.2), c = Math.min(ub, (uS1 !== null ? uS1 : ub) + 1.2); aMuro(k, (a + c) / 2, 0, { w: c - a, opz: o }); return; }
      if (slot === 'aperture') { fr.ap.filter(a => (a.tipo === 'porta' || a.tipo === 'vetrina') && (!o.solo || o.solo === a.tipo)).forEach(a => aMuro(k, a.u, K.y, { w: a.w, apertura: a.tipo, opz: o }));
        if (R.aggancio.tipo === 'porta' && k === 'serranda') aMuro(k, uD, 0, { w: 1.2, apertura: 'porta', opz: o }); return; }
      if (slot === 'soglia') { if (uD === null || uD === undefined) { scarta(k, slot, 'nessuna porta'); return; } aTerra(k, uD, .25, { opz: o }); return; }
      if (slot === 'pilastro') { const h = K.h, y0 = o.pref === 'alto' ? 3.5 : (o.y !== undefined ? o.y : K.y), w = K.w; const u = scegliPil(o.pref, w, y0, y0 + h);
        if (u === null || u === undefined) { scarta(k, slot, 'nessun pilastro libero'); return; } aMuro(k, u, y0, { opz: o }); return; }
      if (slot === 'sotto') { const d = presi.find(p => p.k === o.di); if (!d) { scarta(k, slot, 'manca ' + o.di); return; } aMuro(k, d.u, d.y - K.h - .02, { opz: o }); return; }
      if (slot === 'vetrina') {   // davanti alla propria vetrina: la merce della bottega, entro 1,2 m dal muro
        // la fascia della propria vetrina, allargata al pilastro accanto (mai verso la porta: lì c'è il corridoio libero)
        const V = fr.ap.filter(a => a.tipo === 'vetrina').sort((p, q) => Math.abs(q.u - (uD || 0)) - Math.abs(p.u - (uD || 0))); let fatto = false;
        for (const a of (o.lontano ? V : V.slice().reverse())) { const U = []; for (let du = 0; du <= a.w / 2 + .9; du += .15) U.push(a.u + du, a.u - du);
          const lato = a.u >= (uD || 0) ? 1 : -1; U.sort((p, q) => o.lontano ? lato * (q - p) : o.vicino ? lato * (p - q) : Math.abs(p - a.u) - Math.abs(q - a.u));
          for (const u of U) { if (u - K.w / 2 < .2 || u + K.w / 2 > fr.L - .2) continue; const v = K.d / 2 + .12, yaw = fr.rot, [x, z] = fr.wp(u, v);
            if (usoTerra(u, K.w)) continue; const e = prova(k, x, z, yaw, { propria: true }); if (e) continue; posa(k, x, z, yaw, { u, v, propria: true, gruppo: o.gruppo, opz: o }); fatto = true; break; } if (fatto) break; }
        if (!fatto) scarta(k, slot, 'la fascia della vetrina è piena'); return; }
      if (slot === 'sulla_serranda') { const a = fr.ap.filter(q => q.tipo === 'vetrina').sort((p, q) => q.w - p.w)[0]; if (!a) { scarta(k, slot, 'nessuna vetrina'); return; } aMuro(k, a.u, .75, { w: Math.min(K.w, a.w - .2), d: .2, opz: o }); return; }
      if (slot === 'piede') {   // contro il muro, su un pilastro pieno
        const P = []; for (let u = ua + K.w / 2 + .1; u <= ub - K.w / 2 - .1 + 1e-6; u += .25) P.push(u);
        const dist = u => Math.abs(u - centro), ang = u => Math.min(u - ua, ub - u);
        if (o.pref === 'lontano') P.sort((p, q) => dist(q) - dist(p)); else if (o.pref === 'angolo') P.sort((p, q) => ang(p) - ang(q)); else if (o.pref === 'centro') P.sort((p, q) => Math.abs(p - (ua + ub) / 2) - Math.abs(q - (ua + ub) / 2)); else P.sort((p, q) => dist(p) - dist(q));
        for (const u of P) { const v = K.d / 2 + .1, yaw = fr.rot, [x, z] = fr.wp(u, v); if (!K.piatto && presi.some(p => p.muro && !p.filo && p.k !== 'zoccolo' && (p.y || 0) < K.h && Math.abs(p.u - u) < (p.w + K.w) / 2 + .1)) continue;   // non davanti alle cose basse a muro (la bocca del forno, il telefono, i manifesti)
          if ((!K.piatto && usoTerra(u, K.w)) || (!K.piatto && apAt(u - K.w / 2, u + K.w / 2, 0, 1))) continue; if (prova(k, x, z, yaw, { propria: !!K.piatto })) continue; posa(k, x, z, yaw, { u, v, gruppo: o.gruppo, opz: o }); return; }
        if (o.anche === 'spazio') { const q = spazio(sc, k, o, ag, prova); if (q) { posa(k, q.x, q.z, q.yaw, { gruppo: o.gruppo, opz: o }); return; } }
        scarta(k, slot, 'nessun pilastro libero a terra'); return; }
      if (slot === 'spazio') { const q = spazio(sc, k, o, ag, prova); if (!q) { scarta(k, slot, 'nessuno spazio libero'); return; } posa(k, q.x, q.z, q.yaw, { gruppo: o.gruppo, opz: o }); return; }
      if (slot === 'traverso') { const t = traverso(sc, fr, ua, ub, o, presi); if (!t) { scarta(k, slot, 'nessun muro di fronte'); return; } metti(k, Object.assign({ muro: true, filo: 'traverso', opz: o }, t)); return; }
      scarta(k, slot, 'slot sconosciuto'); });
    function usoTerra(u, w) { return presi.some(p => !p.muro && p.u !== undefined && Math.abs(p.u - u) < (p.w + w) / 2 + .05 && p.v < 1.6); }
    // il punto focale: la cosa che dà il nome allo scorcio (a muro: a metà della sua altezza)
    const fo = sc.cose.find(c => c.k === R.focale) || sc.cose[0];
    sc.focale = fo ? { k: fo.k, x: fo.x, z: fo.z, y: (fo.y || 0) + (fo.h || 1) / 2 } : null;
    // i mezzi in sosta: dove c'è spazio, mai sulle porte
    (R.mezzi || []).forEach(([mod, col, slot]) => { const q = postoMezzo(sc, mod, slot, ag, prova); if (q) { sc.mezzi.push(Object.assign({ modello: mod, colore: col }, q)); OCC.push(obb(q.x, q.z, q.yaw, q.L / 2, q.W / 2, 'mezzo', sc.id)); } else scarta(mod, slot, 'nessuna sosta libera'); });
    // gli agganci per la gente
    (R.posti || []).forEach(([tipo, di]) => { const c = sc.cose.find(q => q.k === di); let x, z, dir;
      if (c && !c.muro) { x = c.x + Math.sin(c.yaw) * ((c.d || 1) / 2 + .7); z = c.z + Math.cos(c.yaw) * ((c.d || 1) / 2 + .7); dir = Math.atan2(c.z - z, c.x - x); if (tipo === 'carte') { x = c.x; z = c.z; dir = c.yaw; } }
      else if (c && c.muro) { x = c.x + Math.sin(c.yaw) * 1.1; z = c.z + Math.cos(c.yaw) * 1.1; dir = Math.atan2(c.z - z, c.x - x); }
      else if (sc.focale) { const yaw = fr ? fr.rot : 0; x = sc.focale.x + Math.sin(yaw) * 2.6 + Math.cos(yaw) * 1.5; z = sc.focale.z + Math.cos(yaw) * 2.6 - Math.sin(yaw) * 1.5; dir = Math.atan2(sc.focale.z - z, sc.focale.x - x); }
      if (x === undefined) return; if (!aperto(tlM(x, z))) return; sc.posti.push({ k: tipo, x: +x.toFixed(2), y: +z.toFixed(2), dir, scorcio: sc.id, nome: R.nome }); });
    return sc;
  }
  // lo spazio libero: per le cose da sole (il tavolo della scopa, il banco del pesce, il cartellone dell'officina) e per quelle accanto
  function spazio(sc, k, o, ag, prova) {
    const K = KIT[k] || {}, rot = ag.fr ? ag.fr.rot : PI / 4;   // senza un muro: il davanti (+z) guarda la camera (sud-est)
    const di = o.di ? sc.cose.find(c => c.k === o.di) : null, C = [];
    if (di) {   // accanto alla cosa di riferimento: prima di lato (lungo lo schermo), poi dietro, mai davanti (coprirebbe il punto focale)
      const lato = { accanto: 1, accanto2: -1, accanto3: 1, accanto4: -1 }[o.pref] || 1, dietro = o.pref === 'accanto3' || o.pref === 'accanto4' ? .9 : 0, c = Math.cos(di.yaw), s = Math.sin(di.yaw);
      for (let r = 0; r < 10; r++) for (const dv of [-dietro, -dietro - .6, -dietro + .6, -dietro - 1.2]) { const du = lato * ((di.w || 1) / 2 + K.w / 2 + .3 + r * .35); C.push([di.x + c * du + s * dv, di.z - s * du + c * dv, di.yaw]); }
      // se di lato non c'è posto (la banchina stretta, le porte in fila): attorno, a raggi crescenti, allineato agli assi del suolo
      for (let r = 1.2; r <= 6; r += .4) for (let a = 0; a < 16; a++) { const an = a / 16 * PI * 2 + (lato > 0 ? 0 : PI); C.push([di.x + Math.cos(an) * r, di.z + Math.sin(an) * r, a % 2 ? 0 : PI / 2]); } }
    else if (ag.fr) { const fr = ag.fr, um = (sc.ua + sc.ub) / 2; for (let v = .9; v <= 5.5; v += .25) for (let du = 0; du <= (sc.ub - sc.ua) / 2 + 2; du += .25) for (const sd of [1, -1]) { const u = um + sd * du + (o.pref === 'camera' ? -1 : 0), [x, z] = fr.wp(u, v + K.d / 2); C.push([x, z, fr.rot]); } }
    else { const s = ag.set, R0 = ag.r, RR = []; for (let r = 0; r <= R0 + 2; r += .75) RR.push(r); if (o.pref === 'bordo') RR.reverse();   // sul bordo: lascia libero il centro della piazza (la pianta, il lavatoio)
      for (const r of RR) for (let a = 0; a < 16; a++) { const an = a / 16 * PI * 2 + PI / 4, x = ag.x + Math.cos(an) * r, z = ag.z + Math.sin(an) * r; if (!inSet(s, x, z, 2)) continue; C.push([x, z, rot]); } }
    for (const [x, z, yaw] of C) { if (cucitura(x, z)) continue; if (!prova(k, x, z, yaw, { strada: false, w: K.w + .3, d: K.d + .3 })) return { x, z, yaw }; }
    return null;
  }
  // il filo di traverso: dal muro dello scorcio al muro di fronte (le luminarie da un muro all'altro, a 4-5 m; il bucato fra le finestre)
  function traverso(sc, fr, ua, ub, o, presi) {
    const n = o.n || 1, out = { fili: [] }; let first = null;
    for (let k = 0; k < n; k++) { const u = ua + (ub - ua) * (k + 1) / (n + 1);
      for (let v = 1; v < 13; v += .25) { const [x, z] = fr.wp(u, v), t = tlM(x, z); if (t === G.T.BLD) { const [ax, az] = fr.wp(u, 0), q = fr.wp(u, v), tx = Math.floor(q[0] / TS), tz = Math.floor(q[1] / TS), vb = fr.f === 'S' ? tz * TS - fr.o[1] : fr.f === 'E' ? tx * TS - fr.o[0] : v, [bx, bz] = fr.wp(u, vb - .06); v = vb; out.fili.push({ a: [ax, az], b: [bx, bz], y: o.y || 4.4, L: v }); if (!first) first = { x: ax, z: az, u }; break; } if (!aperto(t) && !strada(t)) break; } }
    if (!out.fili.length) return null; return Object.assign({ x: first.x, z: first.z, u: first.u, v: 0, yaw: fr.rot, y: o.y || 4.4, w: .1, d: .1, h: .4 }, out);
  }
  // la sosta di un mezzo dello scorcio: Ape, Ciao, 500, 126 (lunghezza e larghezza)
  const MEZZI = { ape: { kind: 'ape', L: 2.8, W: 1.3 }, ciao: { kind: 'ciao', L: 1.7, W: .7 }, f500: { kind: 'cinquecento', L: 2.97, W: 1.32 }, f126: { kind: 'cinquecento', L: 3.08, W: 1.38 }, vespa: { kind: 'vespa', L: 1.8, W: .7 } };
  function postoMezzo(sc, mod, slot, ag, prova) {
    const M = MEZZI[mod]; if (!M) return null; const C = [];
    const fo = sc.focale || { x: ag.x, z: ag.z };
    if (ag.fr && slot === 'accanto_porta') { const fr = ag.fr; for (let du = 1.5; du <= 4; du += .5) for (const sd of [-1, 1]) { const u = (sc.uD || 0) + sd * du, [x, z] = fr.wp(u, M.W / 2 + .35); C.push([x, z, fr.rot + PI / 2]); } }
    // attorno al punto focale, ai lati dello schermo (nord-est e sud-ovest): mai fra la camera e il fuoco, mai dietro un muro
    const R0 = []; for (let r = 2.5; r <= 9; r += .5) for (let a = 0; a < 24; a++) { const an = a / 24 * PI * 2, dx = Math.cos(an) * r, dz = Math.sin(an) * r, prof = (dx + dz) / Math.SQRT2, lato = Math.abs(dx - dz) / Math.SQRT2;
      R0.push([fo.x + dx, fo.z + dz, (a % 2 ? 0 : PI / 2) + (slot === 'spazio_largo' ? PI / 4 : 0), Math.abs(prof) * 1.2 - lato * .4 + r * .3 + (prof > 0 ? 1.5 : 0)]); }
    R0.sort((p, q) => p[3] - q[3]); R0.forEach(q => C.push(q));
    for (const [x, z, yaw] of C) { if (cucitura(x, z)) continue; if (!prova('mezzo', x, z, yaw, { w: M.L + .4, d: M.W + .4, strada: true })) {
        const t = tlM(x, z); if (strada(t) && !(ag.set && (ag.set.k === 'scalo' || ag.set.k === 'stazione'))) continue; return { x, z, yaw, L: M.L, W: M.W, kind: M.kind }; } }
    return null;
  }

  // ================= TUTTI GLI SCORCI =================
  let TUTTI = null;
  function tutti() {
    if (TUTTI) return TUTTI; if (!ATTIVO) return (TUTTI = []);
    PRESE.clear(); divieti(); occupaFissi();
    TUTTI = RICETTE.map(risolvi).filter(s => s.ok);
    // l'edificio sa del suo scorcio (render.js: il fronte della bottega lascia il posto al kit)
    TUTTI.forEach(s => { if (s.b) s.b.__scorcio = s.id; });
    return TUTTI;
  }
  const di = b => { if (!ATTIVO || !b) return null; tutti(); return b.__scorcio ? TUTTI.find(s => s.id === b.__scorcio) || null : null; };
  // il kit prende il posto del fronte della bottega di render.js? (l'insegna, le serrande, la tenda, la merce, il gradino della bottega)
  // f: la faccia di chi chiede (il fronte della bottega, la faccia dell'insegna): lo scorcio copre solo la sua faccia
  function copre(b, cosa, f) { const s = di(b); if (!s || !s.fr || (f && s.fr.f !== f)) return false; if (cosa === 'gradino') return s.cose.some(c => c.k === 'soglia'); if (cosa === 'fronte') return s.cose.some(c => c.k === 'fascia' || c.k === 'serranda'); return true; }
  // un pezzo grande che lo scorcio sostituisce (l'edicola votiva rivolta dove la camera non la vede, quella sul fronte della bottega)
  function sostituisce(p) { if (!ATTIVO || !p) return false; tutti(); return TUTTI.some(s => (s.R.sostituisce || []).includes(p.tipo) && hyp(p.x - (s.focale ? s.focale.x : 0), p.y - (s.focale ? s.focale.z : 0)) < 16); }
  // il tratto di muro di uno scorcio (rete.js: niente mensole, contatori e bracci dei lampioni lì sopra)
  function muroRiservato(bi, f, u, m) { if (!ATTIVO) return false; tutti(); const pad = m === undefined ? .45 : m;
    return TUTTI.some(s => s.bi === bi && s.fr && s.fr.f === f && s.cose.some(c => c.muro && !c.filo && u > c.u - (c.w || .5) / 2 - pad && u < c.u + (c.w || .5) / 2 + pad)); }
  // le zone riservate: dove gli altri sistemi di arredo non posano (scena.js: bidoni, cassonetti, bucato, dehors, targhe, civici)
  function riservato(x, z, m) { if (!ATTIVO) return false; tutti(); const pad = m || 0;
    return TUTTI.some(s => s.cose.some(c => c.muro ? (hyp(c.x - x, c.z - z) < (c.w || 1) / 2 + .8 + pad) : (hyp(c.x - x, c.z - z) < Math.max(c.w || 1, c.d || 1) / 2 + .6 + pad)) || s.mezzi.some(q => hyp(q.x - x, q.z - z) < q.L / 2 + .5 + pad)); }

  // ================= GLI STATI PER ORA =================
  const inOre = (F, hr) => { if (!F) return false; if (F === true) return true; const L = Array.isArray(F[0]) ? F : [F]; return L.some(([a, z]) => z > 24 ? (hr >= a || hr < z - 24) : a > z ? (hr >= a || hr < z) : (hr >= a && hr < z)); };
  function stato(sc, hr) {
    const O = sc.R.ore || {};
    const serranda = O.chiuso ? 'chiusa' : O.aperto ? (inOre(O.aperto, hr) ? 'aperta' : inOre(O.mezza, hr) ? 'mezza' : 'chiusa') : 'aperta';
    return { serranda, luci: inOre(O.luci, hr), luminarie: inOre(O.luminarie, hr), forno: inOre(O.forno, hr), merce: O.merce ? inOre(O.merce, hr) : serranda === 'aperta' || serranda === 'mezza', tavoli: O.tavoli ? inOre(O.tavoli, hr) : true, banco: O.banco ? inOre(O.banco, hr) : true };
  }
  // che cosa si vede a quell'ora (lo usano la grafica e le prove): gruppo → acceso
  function gruppi(sc, hr) { const s = stato(sc, hr); return { merce: s.merce, tavoli: s.tavoli, impilati: !s.tavoli, banco: s.banco, serranda_chiusa: s.serranda === 'chiusa', serranda_mezza: s.serranda === 'mezza', luci: s.luci, luminarie: s.luminarie, forno: s.forno }; }

  // ================= LA GENTE: posti, scene, mezzi =================
  const TIPI_POSTI = {
    carte:    { h: [[9, 12.5], [15.5, 21]], cap: 4, who: 'old', pose: 'siede', lay: 'cerchio', r: .72, dens: 1.2 },    // la scopa al tavolino: quattro vecchi seduti
    comari:   { h: [[8, 12], [16.5, 19.5]], cap: 3, who: 'f', pose: 'braccia_su', lay: 'cerchio', r: .8, dens: 1 },     // le comari che chiacchierano
    gioco:    { h: [[15, 19.5]], cap: 4, who: 'young', pose: 'aspetta', lay: 'cerchio', r: 1.7, dens: 1 },                // i ragazzini (il pallone, il gelato)
    telefono: { h: [[8, 22]], cap: 1, who: 'any', pose: 'telefona_su', lay: 'riga', r: .6, dens: .5 },                   // al telefono a gettoni
  };
  function posti() { return tutti().reduce((a, s) => a.concat(s.posti), []); }
  const SCENE = [
    { id: 'scopa', w: 3, posto: 'carte', ora: [[9, 12.5], [15.5, 21]], roles: [{ id: 'a', f: 'old|m' }, { id: 'b', near: 'a', f: 'old|m', r: 20 }, { id: 'c', near: 'a', f: 'old|any', r: 22 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 3, sp: 1.1 }, { slot: 'b', i: 1, n: 3, sp: 1.1 }, { slot: 'c', i: 2, n: 3, sp: 1.1 }] }, { pose: 'a', p: 'siede' }, { pose: 'b', p: 'siede' }, { pose: 'c', p: 'siede' },
      { say: 'a', l: ['Mazzo nuovo. Taglia, {b}.', 'Chi perde paga il caffè a tutti.', 'Si gioca a undici, come sempre.'] }, { wait: 4 },
      { say: 'b', l: ['Scopa!', 'Settebello, e la primiera è mia.', 'Denari: sette. Contali.'] }, { pose: 'b', p: 'indica_su' }, { wait: 2 }, { pose: 'b', p: 'siede' },
      { say: 'c', l: ['Con quelle carte vincerebbe anche mia moglie.', 'Gino! Tre caffè, che qui si fa notte.', 'Al tempo nostro si giocava a briscola, e zitti.'] }, { wait: 5 },
      { p: .3, then: [{ mood: 'a', m: 'rabbia' }, { say: 'a', l: ['Tu guardi le carte di {c}!', 'Questa partita non vale!'] }, { wait: 2 }, { say: 'c', l: ['Ma chi ti guarda? Gioca, va\'.'] }], else: [{ say: 'a', l: ['Un\'altra, l\'ultima.', 'Domani la rivincita.'] }] }, { wait: 6 }] },
    { id: 'comari', w: 2, posto: 'comari', ora: [[8, 12], [16.5, 19.5]], roles: [{ id: 'a', f: 'old|f' }, { id: 'b', near: 'a', f: 'f|any', r: 20 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 2, sp: 1 }, { slot: 'b', i: 1, n: 2, sp: 1 }] }, { pose: 'a', p: 'braccia_su' },
      { say: 'a', l: ['Hai sentito della figlia della Pina?', 'Il pane di Lella oggi era una pietra.', 'Mio marito dice che la Rocca la riaprono ai turisti. Turisti, qui!'] }, { wait: 3 },
      { say: 'b', l: ['Non me ne parlare.', 'Io faccio finta di niente, come tutti.', 'Quelli del Garante ieri sono passati due volte.'] }, { wait: 4 },
      { say: 'a', l: ['Zitta, che arriva.', 'Lo dico solo a te, eh.', 'Madonna santa, che tempi.'] }, { pose: 'a' }, { wait: 3 }] },
    { id: 'rincorsa', w: 2, posto: 'gioco', ora: [15, 19.5], roles: [{ id: 'a', f: 'young|any' }, { id: 'b', near: 'a', f: 'young|any', r: 24 }], beats: [
      { go: 'a', to: 'spot', sp: 1.6, d: 1, t: 12 }, { say: 'b', l: ['Ce l\'hai! Corri!', 'Tana libera tutti!', 'Chi arriva ultimo paga il gelato!'] },
      { chase: 'b', who: 'a', sp: 2.6, fsp: 2.4, t: 9, catch: [{ say: 'b', l: ['Preso!', 'Toccato, sei sotto tu!'] }], lose: [{ say: 'a', l: ['Non mi prendi!', 'Lumaca!'] }] }, { wait: 2 }] },
  ];
  function registraScene() {
    if (typeof Eventi === 'undefined' || !Eventi || !Eventi.SCENE || Eventi.SCENE.__scorci) return; Eventi.SCENE.__scorci = true;
    SCENE.forEach(s => { if (!Eventi.SCENE.some(o => o.id === s.id)) Eventi.SCENE.push(s); });
    // le scene che c'erano trovano anche i posti nuovi: la baruffa a carte al tavolino della scopa, la telefonata al telefono a gettoni
    Eventi.SCENE.forEach(s => { if (s.id === 'carte_baruffa' && Array.isArray(s.posto) && !s.posto.includes('carte')) s.posto.push('carte'); if (s.id === 'telefono' && Array.isArray(s.posto) && !s.posto.includes('telefono')) s.posto.push('telefono'); });
  }
  // i mezzi in sosta degli scorci: veri mezzi del gioco (fermi; si rubano come gli altri)
  function crea(st) {
    if (!ATTIVO || !G.makeVehicle) return; let i = 0;
    tutti().forEach(s => s.mezzi.forEach(m => { const ang = PI / 2 - m.yaw;   // il verso del gioco (radianti sul piano x, y) dal verso della grafica
      const v = G.makeVehicle(st, { id: 'sc' + (i++), kind: m.kind, x: m.x, y: m.z, ang, color: m.colore, modello: m.modello, scorcio: s.id, sosta: 'scorcio' }); st.vehicles.push(v); m.vid = v.id; }));
  }
  function installa() {
    if (!ATTIVO || !G.HOOKS || G.HOOKS.__scorci) return; const H = G.HOOKS; H.__scorci = true;
    const c0 = H.create; H.create = st => { if (c0) c0(st); try { crea(st); } catch (e) { if (typeof console !== 'undefined') console.error('[scorci] crea', e); } };
    registraScene();
  }
  // per le prove e le misure: un riassunto per scorcio
  function riassunto() { return tutti().map(s => ({ id: s.id, nome: s.nome, focale: s.focale, edificio: s.b ? (s.b.name || s.b.id) : null, faccia: s.fr ? s.fr.f : null, cose: s.cose.length, mezzi: s.mezzi.length, posti: s.posti.length, scarti: s.scarti })); }

  if (ATTIVO) installa();
  return { ATTIVO, attivo: ATTIVO, CFG, KIT, RICETTE, TIPI_POSTI, SCENE, tutti, di, copre, sostituisce, riservato, muroRiservato, stato, gruppi, inOre, posti, crea, registraScene, cucitura, fronte, pilastri, vietato, riassunto, sat, obb, MEZZI,
    reset: () => { TUTTI = null; FR = null; PORTE = null; G.BUILDINGS.forEach(b => { delete b.__scorcio; }); } };
})();
if (typeof module !== 'undefined') module.exports = Scorci;
