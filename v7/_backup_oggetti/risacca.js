
/* Porto Vecchio — La Risacca (solo logica, nessuna grafica).
   Squadra, volontà, compiti, lavori, spazi nascosti, cantieri, basi e laboratori.
   Si aggancia al motore tramite Game.HOOKS: non cambia nulla del gioco se non viene caricato.
   La chat libera passa da qui: il modello propone verbi di un catalogo chiuso, questo file
   controlla se si possono fare (piani) e se il personaggio li vuole (volontà), poi li esegue. */
var Risacca = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const TS = G.TS, PLACES = G.PLACES, MPS = G.MIN_PER_SEC;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const r2 = v => Math.round(v * 100) / 100;
  const cap1 = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const byId = (st, id) => st.npcs.find(n => n.id === id);
  const tileC = (tx, ty) => ({ x: tx * TS + TS / 2, y: ty * TS + TS / 2 });

  // ---------------- RISORSE E OGGETTI ----------------
  const RES = {
    viveri: { name: 'viveri', one: 'scatola di viveri', cat: 'Viveri', syn: ['viveri', 'cibo', 'pane', 'scatolame', 'caffè', 'mangiare'] },
    carta: { name: 'carta', one: 'risma di carta', cat: 'Cancelleria', syn: ['carta', 'risma', 'risme', 'fogli'] },
    inchiostro: { name: 'inchiostro', one: 'boccetta d\'inchiostro', cat: 'Cancelleria', syn: ['inchiostro'] },
    gesso: { name: 'gesso', one: 'gessetto', cat: 'Cancelleria', syn: ['gesso', 'gessetti', 'gessetto'] },
    attrezzi: { name: 'attrezzi', one: 'cassetta degli attrezzi', cat: 'Attrezzi', syn: ['attrezzi', 'cacciavite', 'tronchesi', 'piede di porco', 'torcia', 'chiave inglese', 'utensili'] },
    materiali: { name: 'materiali', one: 'carico di materiali', cat: 'Materiali', syn: ['materiali', 'legname', 'legno', 'lamiere', 'lamiera', 'mattoni', 'assi'] },
    radio: { name: 'parti radio', one: 'parte radio', cat: 'Radio', syn: ['radio', 'valvole', 'cavi', 'batterie', 'parti radio', 'trasmettitore'] },
    medicine: { name: 'medicine', one: 'scatola di medicine', cat: 'Medicine', syn: ['medicine', 'farmaci', 'bende', 'medicinali'] },
    documenti: { name: 'documenti falsi', one: 'lasciapassare falso', cat: 'Documenti', syn: ['documenti', 'lasciapassare', 'tessere', 'tessera'] },
    benzina: { name: 'benzina', one: 'tanica di benzina', cat: 'Carburante', syn: ['benzina', 'tanica', 'carburante'] },
    zucchero: { name: 'zucchero', one: 'sacchetto di zucchero', cat: 'Carburante', syn: ['zucchero'] },
    merce: { name: 'merce', one: 'cassa di merce', cat: 'Merce', syn: ['merce', 'cassette', 'sigarette', 'contrabbando'] },
    volantini: { name: 'volantini', one: 'pacco di volantini', cat: 'Stampa', syn: ['volantini', 'volantino'] },
    kit: { name: 'kit di sabotaggio', one: 'kit di sabotaggio', cat: 'Attrezzi', syn: ['kit', 'kit di sabotaggio'] },
    vernice: { name: 'vernice', one: 'bomboletta', cat: 'Pittura', syn: ['vernice', 'bombolette', 'bomboletta', 'spray', 'pennelli', 'pennello', 'colori'] },
    mobili: { name: 'mobili', one: 'mobile', cat: 'Arredi', syn: ['mobili', 'mobile', 'sedie', 'tavolo', 'materasso', 'materassi', 'brande'] },
    fotocamera: { name: 'macchina fotografica', one: 'macchina fotografica', cat: 'Strumenti', tool: true, syn: ['macchina fotografica', 'fotocamera', 'polaroid'] },
    telefono: { name: 'cellulare', one: 'cellulare', cat: 'Strumenti', tool: true, syn: ['telefono', 'cellulare', 'telefonino'] },
    prove: { name: 'foto compromettenti', one: 'foto', cat: 'Prove', syn: ['foto', 'fotografie', 'prove', 'rullino'] },
  };
  // dove si compra cosa (prezzo in migliaia di lire). Valori negativi: lì si vende.
  const SHOPS = {
    wu: { viveri: 3, gesso: 1, zucchero: 2, carta: 2 },
    car_2: { viveri: 4 },
    biblioteca: { carta: 1, inchiostro: 3 },
    officina: { attrezzi: 8, vernice: 3 },
    benzina: { benzina: 4 },
    cantiere: { materiali: 5, mobili: 6 },
    magazzino: { materiali: 4 },
    video: { radio: 12, fotocamera: 25, telefono: 30, merce: -15 },
    disco: { radio: 15 },
    ambulatorio: { medicine: 6 },
  };

  // ---------------- SPAZI NASCOSTI ----------------
  const SPACES = [
    { id: 'sp_lanternini', near: 'vico', name: 'Cantina di Vico dei Lanternini', kind: 'cantina', slots: 2, stealth: .8 },
    { id: 'sp_campo', near: 'piazzetta', name: 'Appartamento sfitto di Vico del Campo', kind: 'appartamento', slots: 2, stealth: .6 },
    { id: 'sp_bottega', near: 'piazza', name: 'Retrobottega chiuso della piazza', kind: 'bottega', slots: 3, stealth: .6, locked: true },
    { id: 'sp_fiori', near: 'fiori', name: 'Soffitta sopra il Banco dei fiori', kind: 'soffitta', slots: 1, stealth: .9 },
    { id: 'sp_garage', near: 'officina', name: 'Garage murato dietro l\'officina', kind: 'garage', slots: 3, stealth: .7 },
    { id: 'sp_pesce', near: 'calata', name: 'Magazzino del pesce abbandonato', kind: 'magazzino', slots: 4, stealth: .5, locked: true },
    { id: 'sp_cinema', near: 'cinema', name: 'Cantina sotto il Cinema Astor', kind: 'cantina', slots: 2, stealth: .8 },
    { id: 'sp_lutto', near: 'gabbiano', name: 'Pensione chiusa per lutto', kind: 'appartamento', slots: 3, stealth: .5, locked: true },
    { id: 'sp_faro', near: 'punta', name: 'Casa del guardiano del faro', kind: 'faro', slots: 2, stealth: .75 },
    { id: 'sp_pianoro', near: 'belvedere', name: 'Soffitta del Belvedere', kind: 'soffitta', slots: 1, stealth: .9 },
    { id: 'sp_cisterna', near: 'santuario', name: 'Vecchia cisterna del santuario', kind: 'cisterna', slots: 2, stealth: .85 },
    { id: 'sp_alta4', near: 'salita', name: 'Casa del notaio, sigillata', kind: 'appartamento', slots: 3, stealth: .55, locked: true },
    { id: 'sp_caruggio1', near: 'caruggio', name: 'Magazzino del caruggio', kind: 'magazzino', slots: 3, stealth: .65 },
    { id: 'sp_caruggio3', near: 'car_2', name: 'Laboratorio del ceramista', kind: 'bottega', slots: 2, stealth: .7 },
    { id: 'sp_caruggio5', near: 'giardini', name: 'Cantina dei Giardini', kind: 'cantina', slots: 2, stealth: .8 },
    { id: 'sp_masseria', near: 'oliveto', name: 'Masseria abbandonata degli ulivi', kind: 'masseria', slots: 4, stealth: .8 },
    { id: 'sp_casale', near: 'vigne', name: 'Casale dei vigneti', kind: 'casale', slots: 3, stealth: .75 },
    { id: 'sp_sg', near: 'sangiacomo', name: 'Canonica vuota di San Giacomo', kind: 'appartamento', slots: 2, stealth: .7 },
  ];
  // ogni spazio prende la casa senza nome più vicina al suo luogo
  (() => { const used = {}; SPACES.forEach(sp => { const p = PLACES[sp.near]; if (!p) return; let best = null, bd = 1e9; G.BUILDINGS.forEach(b => { if (b.name || used[b.id] || !b.door) return; const d = Math.hypot((b.x + b.w / 2) * TS - p.x, (b.y + b.h / 2) * TS - p.y); if (d < bd) { bd = d; best = b; } }); if (best) { sp.b = best.id; used[best.id] = 1; best.spaceOf = sp.id; } }); })();

  // lotti dove si può costruire (caselle libere, 2x2 o 1x1)
  const LOTS = [
    { id: 'lot_pineta', near: 'pineta', name: 'Radura della pineta', w: 2, h: 2, stealth: .8 },
    { id: 'lot_giardini', near: 'giardini', name: 'Giardini delle Palme', w: 2, h: 2, stealth: .5 },
    { id: 'lot_punta', near: 'punta', name: 'Scogli di Punta Scogli', w: 2, h: 2, stealth: .75 },
    { id: 'lot_scalo', near: 'cantiere', name: 'Scalo del cantiere', w: 2, h: 2, stealth: .45 },
    { id: 'lot_spiaggia', near: 'spiaggia', name: 'Spiaggia, dietro i Bagni Lido', w: 2, h: 2, stealth: .4 },
    { id: 'lot_belvedere', near: 'vetta', name: 'Vetta di Monte Nero', w: 1, h: 1, stealth: .6, antennaOnly: true },
    { id: 'lot_radura', near: 'radura', name: 'Radura del pastore', w: 2, h: 2, stealth: .9 },
    { id: 'lot_lago', near: 'lago', name: 'Riva del lago', w: 2, h: 2, stealth: .7 },
  ];
  (() => { const T = G.T; LOTS.forEach(l => { const p = PLACES[l.near]; if (!p) return; const ok = (x, y) => { for (let j = -1; j <= l.h; j++) for (let i = -1; i <= l.w; i++) { const v = G.tileAt(x + i, y + j); if (!G.walkT(x + i, y + j) || v === T.VIA || v === T.PIER || v === T.QUAY) return false; } return true; };
    for (let r = 2; r < 30; r++) { let done = false; for (let dy = -r; dy <= r && !done; dy++) for (let dx = -r; dx <= r && !done; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (ok(p.tx + dx, p.ty + dy)) { l.tx = p.tx + dx; l.ty = p.ty + dy; done = true; } } if (done) break; } }); })();

  const STRUCTS = {
    baracca: { name: 'Baracca', slots: 2, cost: 40, mat: 8, hours: 4, stealth: 0 },
    capanno: { name: 'Capanno', slots: 3, cost: 70, mat: 14, hours: 8, stealth: 0 },
    rifugio: { name: 'Rifugio interrato', slots: 4, cost: 120, mat: 20, hours: 14, stealth: .25 },
    antenna: { name: 'Antenna', slots: 1, cost: 50, mat: 6, radio: 2, hours: 6, stealth: 0, only: 'radio' },
  };
  const MODULES = {
    deposito: { name: 'Deposito', cost: 20, mat: 4, desc: '20 posti scorta' },
    dormitorio: { name: 'Dormitorio', cost: 30, mat: 4, desc: 'riposo, nasconde i ricercati' },
    stamperia: { name: 'Stamperia', cost: 60, mat: 0, desc: 'carta + inchiostro → volantini' },
    radio: { name: 'Radio', cost: 80, mat: 0, desc: 'Radio Scirocco' },
    falsari: { name: 'Falsari', cost: 70, mat: 0, desc: 'carta → documenti' },
    officina: { name: 'Officina', cost: 50, mat: 0, desc: 'attrezzi → kit di sabotaggio' },
    infermeria: { name: 'Infermeria', cost: 50, mat: 0, desc: 'medicine → cure' },
    armeria: { name: 'Armeria', cost: 90, mat: 0, desc: 'difesa nelle perquisizioni' },
  };
  // obiettivi da sabotare
  const TARGETS = {
    ripetitore: { name: 'il ripetitore della Tutela', place: 'vetta', tx: PLACES.vetta ? PLACES.vetta.tx + 2 : 0, ty: PLACES.vetta ? PLACES.vetta.ty - 2 : 0, sev: 1 },
    campagnola: { name: 'una campagnola dei Grigi', place: 'commissariato', sev: .8 },
    proiettore: { name: 'il proiettore dei cinegiornali', place: 'cinema', sev: .6 },
    archivio: { name: 'l\'archivio dell\'Ufficio Rettifiche', place: 'biblioteca', sev: .8 },
    cisterna: { name: 'la cisterna di carburante della Guardia', place: 'benzina', sev: .9 },
  };

  // telecamere della Tutela sui lampioni: accecarle abbassa la Repressione nella zona
  const CAMS = [
    { id: 'cam_piazza', place: 'piazza', dx: 3, dy: -2 }, { id: 'cam_calata', place: 'calata', dx: -3, dy: -1 }, { id: 'cam_lungomare', place: 'lungomare', dx: 2, dy: -1.5 },
    { id: 'cam_passeggiata', place: 'passeggiata', dx: 0, dy: -1 }, { id: 'cam_vico', place: 'vico', dx: 1, dy: 1 }, { id: 'cam_salita', place: 'salita', dx: 2, dy: 0 }, { id: 'cam_caruggio', place: 'caruggio', dx: -2, dy: 0 },
  ];
  const camPos = c => ({ x: PLACES[c.place].x + c.dx, y: PLACES[c.place].y + c.dy });
  const EAT = ['bar', 'car_2', 'osteria', 'gelateria', 'sirena', 'wu'], DRINK = ['bar', 'sirena', 'osteria', 'chiosco', 'gelateria'];
  const LINES = { equilibrio: 'Equilibrio', soldi: 'Soldi', propaganda: 'Propaganda', costruire: 'Costruire', prudenza: 'Prudenza' };

  // ---------------- CATALOGO DEI VERBI ----------------
  // risk: 0 / .1 / .3 / .6 · pol: azione politica · work: stanca · task: solo per membri
  const VERBS = {
    vai: { label: 'vai', risk: 0, task: true, args: 'luogo, corri?', desc: 'va in un luogo e ci resta un po\'' },
    seguimi: { label: 'seguimi', risk: 0, task: true, args: '', desc: 'ti segue' },
    aspetta: { label: 'aspetta', risk: 0, task: true, args: 'luogo?', desc: 'resta qui o in un luogo' },
    basta: { label: 'torna a casa', risk: 0, args: '', desc: 'smette quello che fa' },
    nasconditi: { label: 'nasconditi', risk: 0, task: true, args: 'base', desc: 'si chiude in una base' },
    dai: { label: 'dai', risk: 0, args: 'risorsa, quanto', desc: 'ti dà qualcosa che ha con sé o soldi suoi' },
    prendi: { label: 'prendi', risk: 0, task: true, args: 'risorsa, quanto', desc: 'prende da te qualcosa da portare' },
    compra: { label: 'compra', risk: 0, task: true, args: 'risorsa, quanto', desc: 'compra con la cassa e porta in base' },
    porta: { label: 'porta', risk: .1, task: true, args: 'risorsa, quanto, da, a', desc: 'sposta scorte da un posto all\'altro' },
    deposita: { label: 'deposita', risk: 0, task: true, args: 'base?', desc: 'mette in base quello che ha' },
    ruba: { label: 'ruba', risk: .3, task: true, pol: false, illegal: true, args: 'risorsa, luogo', desc: 'prende senza pagare' },
    racconta: { label: 'racconta', risk: 0, args: 'chi o cosa', desc: 'dice quello che sa' },
    sorveglia: { label: 'sorveglia', risk: .1, task: true, args: 'luogo, ore', desc: 'osserva e riferisce' },
    rivela_spazio: { label: 'rivela spazio', risk: 0, args: 'spazio?', desc: 'indica un posto vuoto che conosce' },
    diffondi_voce: { label: 'diffondi voce', risk: .1, pol: true, task: true, args: 'testo', desc: 'mette in giro una storia' },
    lavora: { label: 'lavora', risk: 0, task: true, work: true, args: 'ore', desc: 'fa il suo mestiere e versa la paga' },
    colletta: { label: 'colletta', risk: .1, task: true, pol: true, work: true, args: 'luogo, ore', desc: 'raccoglie offerte' },
    contrabbando: { label: 'contrabbando', risk: .6, task: true, work: true, illegal: true, night: true, args: 'ore', desc: 'scambi al porto, di notte' },
    recupera: { label: 'recupera', risk: .3, task: true, work: true, illegal: true, args: 'luogo', desc: 'porta via materiali' },
    produci: { label: 'produci', risk: 0, task: true, work: true, args: 'base, modulo, ore', desc: 'lavora in un laboratorio' },
    mercato: { label: 'mercato nero', risk: .3, task: true, work: true, illegal: true, args: 'ore', desc: 'vende la merce sottobanco' },
    scrivi_onda: { label: 'scrivi l\'onda', risk: .1, task: true, pol: true, args: 'luogo', desc: 'il simbolo col gesso' },
    volantina: { label: 'volantina', risk: .1, task: true, pol: true, args: 'luogo', desc: 'lascia volantini' },
    sabota: { label: 'sabota', risk: .6, task: true, pol: true, args: 'obiettivo', desc: 'mette fuori uso un impianto' },
    trasmetti: { label: 'trasmetti', risk: .3, task: true, pol: true, work: true, args: 'ore', desc: 'Radio Scirocco in onda' },
    libera: { label: 'libera', risk: .6, task: true, pol: true, args: 'persona', desc: 'tira fuori un prigioniero' },
    proteggi: { label: 'proteggi', risk: .3, task: true, args: 'base', desc: 'fa la guardia a una base' },
    unisciti: { label: 'unisciti', risk: 0, pol: true, args: '', desc: 'entra nella Risacca' },
    recluta: { label: 'recluta', risk: .1, task: true, pol: true, args: 'persona', desc: 'prova a portare dentro un altro' },
    lascia: { label: 'lascia', risk: 0, args: '', desc: 'esce dalla Risacca' },
    occupa: { label: 'occupa', risk: .1, task: true, args: 'spazio', desc: 'prende uno spazio vuoto come base' },
    costruisci: { label: 'costruisci', risk: .1, task: true, work: true, args: 'lotto, struttura, ore', desc: 'lavora a un cantiere' },
    allestisci: { label: 'allestisci', risk: 0, task: true, args: 'base, modulo', desc: 'monta un modulo in una base' },
    missione: { label: 'missione', risk: 0, args: '', desc: 'ti chiede il favore che gli sta a cuore' },
    ricevi_soldi: { label: 'accetta soldi', risk: 0, args: 'quanto', desc: 'prende i soldi che gli offri' },
    mangia: { label: 'mangia', risk: 0, task: true, args: '', desc: 'va a mangiare (bar, trattoria, osteria, o i viveri della base)' },
    bevi: { label: 'bevi', risk: 0, task: true, args: '', desc: 'va a bere qualcosa' },
    dormi: { label: 'dormi', risk: 0, task: true, args: 'ore', desc: 'va a dormire, a casa o nel dormitorio di una base' },
    scassina: { label: 'scassina', risk: .3, task: true, illegal: true, args: 'spazio', desc: 'forza il lucchetto di uno spazio chiuso (serve un attrezzo)' },
    scasso: { label: 'scasso', risk: .6, task: true, illegal: true, night: true, args: 'luogo', desc: 'entra di notte in un negozio chiuso: soldi e merce' },
    lancia: { label: 'lancia', risk: .3, task: true, pol: true, args: 'telecamera o luogo', desc: 'tira un sasso e acceca una telecamera della Tutela' },
    fotografa: { label: 'fotografa', risk: .1, task: true, pol: true, args: 'persona', desc: 'foto compromettenti (serve macchina fotografica o cellulare)' },
    ricatta: { label: 'ricatta', risk: .3, task: true, illegal: true, args: 'persona', desc: 'usa le foto per far tacere o comprare qualcuno' },
    convoca: { label: 'telefona / convoca', risk: 0, task: true, args: 'persona, luogo', desc: 'telefona o manda un messaggio e dà appuntamento' },
    scava: { label: 'scava', risk: .1, task: true, work: true, args: 'luogo', desc: 'scava una buca nascosta per le scorte (serve un attrezzo)' },
    inchioda: { label: 'inchioda assi', risk: 0, task: true, args: 'base', desc: 'barrica porte e finestre di una base (3 materiali)' },
    dipingi: { label: 'dipingi', risk: .3, task: true, pol: true, work: true, args: 'luogo', desc: 'un murale con bombolette e pennelli (2 vernice)' },
    picchia: { label: 'picchia', risk: .6, task: true, illegal: true, args: 'persona', desc: 'calci e pugni: dà una lezione a qualcuno' },
    arreda: { label: 'arreda', risk: 0, task: true, args: 'base', desc: 'sposta e sistema mobili in una base (2 mobili): si riposa meglio' },
    ripara: { label: 'ripara', risk: 0, task: true, work: true, args: 'ore', desc: 'ripara Vespe, radio e motori per la gente: soldi puliti' },
    pesca: { label: 'pesca', risk: 0, task: true, work: true, args: 'ore', desc: 'pesca al molo: viveri e qualche soldo' },
    rovista: { label: 'rovista', risk: .1, task: true, work: true, args: 'luogo', desc: 'rovista in case vuote e cantieri: mobili e materiali' },
    bisca: { label: 'bisca', risk: .3, task: true, work: true, illegal: true, night: true, args: 'ore', desc: 'bisca clandestina alla sala giochi: si vince e si perde' },
    vendi_documenti: { label: 'vendi lasciapassare', risk: .3, task: true, work: true, illegal: true, args: 'ore', desc: 'vende lasciapassare falsi a chi vuole lasciare l\'isola' },
    linea: { label: 'linea', risk: 0, args: 'linea', desc: 'la linea della banda: soldi, propaganda, costruire, prudenza, equilibrio' },
    autonomia: { label: 'libero arbitrio', risk: 0, args: 'attiva (sì/no)', desc: 'decide da solo cosa fare quando non ha ordini' },
  };
  // modificatori validi per qualsiasi verbo: "furtivo": true (striscia, di nascosto: meno testimoni), "corri": true (di corsa)
  const RISK_WORD = r => r >= .6 ? 'alto' : r >= .3 ? 'medio' : r > 0 ? 'basso' : 'nessuno';

  // ---------------- SCHEDE DEI PERSONAGGI ----------------
  // nome di battaglia, chi è, come parla, odio per la Tutela, gusti, cosa conosce, missione, mestiere
  const CARDS = {
    lupo: { battle: 'Lupo', bio: 'Ettore Ganz, 70 anni, bibliotecario. Nel \'79 era tra quelli che non firmarono per la Tutela. Ha già fatto tutto questo una volta.', voice: 'lento, colto, ironico, cita libri; dà del tu solo a chi se lo guadagna', ideo: .92, likes: ['racconta', 'diffondi_voce', 'sorveglia', 'volantina'], never: ['ruba', 'contrabbando'], knows: ['sp_lanternini', 'sp_cisterna'], mestiere: { place: 'biblioteca', pay: 6 }, mission: { title: 'Salva i libri dal rogo', ask: 'L\'Ufficio Rettifiche brucia i libri in biblioteca stanotte. Prendi la cassa nel retro e portala in chiesa, da Suor Agata.', pickup: 'biblioteca', drop: 'chiesa', item: 'una cassa di libri proibiti' } },
    beppe: { battle: 'Candela', name: 'Dorino Carli', first: 'Dorino', role: 'Meccanico. Ripara le campagnole dei Grigi e le odia', bio: 'Dorino Carli, meccanico di Vespe. Ripara le campagnole della Guardia per contratto e ogni volta che stringe un bullone pensa a come allentarlo.', voice: 'sbrigativo, dialettale, mani sporche, parla per frasi corte', ideo: .8, likes: ['sabota', 'recupera', 'costruisci', 'lavora'], never: [], knows: ['sp_garage'], mestiere: { place: 'officina', pay: 9 }, mission: { title: 'Sabota una campagnola', ask: 'Davanti alla caserma ce n\'è una che riparo io. Vai di notte e svita quello che ti dico. Prendi gli attrezzi, sono miei.', act: 'sabota', place: 'commissariato', gift: { attrezzi: 1 } } },
    lucia: { battle: 'Garza', name: 'Bonaria Fadda', first: 'Bonaria', role: 'Medico dell\'ambulatorio', bio: 'La dottoressa Bonaria Fadda. Cura i feriti dei rastrellamenti senza registrarli. Ha paura, ma ne ha di più di diventare complice.', voice: 'calma, precisa, stanca; chiama tutti per nome', ideo: .72, likes: ['lavora', 'porta', 'produci'], never: ['sabota', 'ruba'], knows: ['sp_bottega'], mestiere: { place: 'ambulatorio', pay: 8 }, mission: { title: 'Medicine dal magazzino', ask: 'Al Magazzino Neri la Tutela tiene le medicine che a noi negano. Portamene una cassa qui in ambulatorio.', pickup: 'magazzino', drop: 'ambulatorio', item: 'una cassa di medicine' } },
    pietro: { battle: 'Madre', name: 'Suor Agata', first: 'Suor Agata', role: 'Suora di San Rocco. Nasconde ricercati nella cripta', bio: 'Suor Agata. Da anni nasconde i ricercati nella cripta di San Rocco, da sola. Prega per tutti, anche per i Grigi, ma non li lascia entrare.', voice: 'dolce e ferma, proverbi, mai una parolaccia', ideo: .75, likes: ['nasconditi', 'proteggi', 'diffondi_voce', 'colletta'], never: ['sabota', 'ruba', 'contrabbando'], knows: ['sp_fiori', 'sp_cisterna'], mestiere: { place: 'chiesa', pay: 3 }, mission: { title: 'Viveri per la cripta', ask: 'Nella cripta ho tre bocche da sfamare. Portami 4 scatole di viveri: l\'Alimentari Wu ne ha.', give: { res: 'viveri', qty: 4 }, drop: 'chiesa' } },
    vinile: { battle: 'Vinile', bio: 'Rita Sanna, la DJ della Discoteca Luna. Voce perfetta, zero paura. Le hanno sequestrato il trasmettitore l\'anno scorso.', voice: 'veloce, ironica, gergo da radio, ti chiama "tesoro"', ideo: .86, likes: ['trasmetti', 'diffondi_voce', 'volantina', 'scrivi_onda'], never: [], knows: ['sp_cinema'], mestiere: { place: 'disco', pay: 10 }, mission: { title: 'Recupera il trasmettitore', ask: 'Il mio trasmettitore è nella caserma dei Grigi, nel deposito dei sequestri. Riportamelo in discoteca e la Risacca avrà una voce.', pickup: 'commissariato', drop: 'disco', item: 'il trasmettitore di Rita', night: true } },
    betamax: { battle: 'Betamax', bio: 'Gigi Mura, gestore della Videoteca Stella. Contrabbanda cassette proibite dal continente. Ha una figlia di sedici anni e molti debiti.', voice: 'mellifluo, commerciale, battute da film, sempre sul vago', ideo: .45, likes: ['mercato', 'contrabbando', 'compra'], never: ['libera'], knows: ['sp_caruggio1', 'sp_alta4'], mestiere: { place: 'video', pay: 10 }, mission: { title: 'Contrabbando al pontile', ask: 'Stanotte al Pontile Est arriva una cassa per me. Portala in videoteca e diventiamo soci.', pickup: 'pontile', drop: 'video', item: 'una cassa di cassette', night: true }, secret: 'Se la Tutela arresta sua figlia, tradirà.' },
    divisa: { battle: 'Divisa', bio: 'Marlon Pinna, ex Grigio disertore. Ha visto un rastrellamento di troppo. Si nasconde in pineta e non si fida di nessuno.', voice: 'teso, militare, parla a monosillabi, guarda sempre alle tue spalle', ideo: .62, likes: ['proteggi', 'sorveglia', 'sabota', 'libera'], never: ['colletta'], knows: ['sp_pianoro', 'sp_faro'], mestiere: null, mission: null },
    cono: { battle: 'Cono', bio: 'Sasà Deiana, 19 anni, lavora in gelateria. Conosce ogni vicolo e va ovunque in Vespa.', voice: 'entusiasta, sfrontato, slang da ragazzo, parla tanto', ideo: .7, likes: ['porta', 'sorveglia', 'scrivi_onda', 'volantina', 'compra'], never: [], knows: ['sp_caruggio3', 'sp_caruggio5', 'sp_campo'], mestiere: { place: 'gelateria', pay: 6 }, mission: { title: 'Consegna sotto il naso di Pardo', ask: 'Ho un pacco per l\'Hotel Flamingo, dove dorme la Pardo. In Vespa si fa in un attimo. Lo porti tu?', pickup: 'gelateria', drop: 'flamingo', item: 'un pacco di gelati (e volantini sotto)', vehicle: true } },
    vasco: { battle: null, bio: 'Il Colonnello Ruggero Vasco, comandante della Guardia Insulare. Ha requisito il Miramare come comando. Brutale ma prevedibile.', voice: 'militare, sprezzante, frasi da ordine del giorno', ideo: 0, antag: true, never: ['unisciti', 'recluta', 'lavora', 'sabota', 'rivela_spazio'] },
    pardo: { battle: null, bio: 'La Commissaria Ines Pardo, capo dell\'Ufficio Rettifiche. Gentile, colta, gioca a scacchi. Non vuole ucciderti: vuole convincerti che hai torto.', voice: 'pacata, gentile, inquietante; fa domande invece di rispondere', ideo: 0, antag: true, never: ['unisciti', 'recluta', 'sabota', 'rivela_spazio'] },
    zia: { battle: null, bio: 'La Zia, vedova sempre seduta al Bar Sirena. Capo degli Orecchi, la rete di informatori. Sa tutto di tutti.', voice: 'affettuosa e velenosa, ti chiama "figlio mio"', ideo: .05, antag: true, never: ['unisciti', 'sabota'], informer: true },
    malanotte: { battle: 'Malanotte', bio: 'Salvatore Cuccu detto Malanotte, capobanda dei briganti dell\'interno, latitante dal \'79. Odia la Tutela, ma odia anche chi gli dà ordini.', voice: 'cupo, poche parole, proverbi da pastore, minaccioso', ideo: .7, likes: ['sabota', 'ruba', 'recupera', 'contrabbando'], never: ['colletta', 'diffondi_voce', 'lavora'], knows: ['sp_faro'], mestiere: null, mission: null, brigante: true },
    gino: { bio: 'Gino, barista del Bar Da Gino. Ha la TV sempre accesa sul Garante perché è obbligatorio.', voice: 'cordiale, pettegolo, prudente', ideo: .35, knows: ['sp_lanternini'], mestiere: { place: 'bar', pay: 7 } },
    wu: { bio: 'Wu Lin, bottegaio dell\'Alimentari. Vende con la tessera annonaria e non fa domande.', voice: 'cortese, misurato, pratico', ideo: .3, mestiere: { place: 'wu', pay: 7 } },
    marta: { bio: 'Marta Sala, pensionata. Sa tutto di tutti e parla con chiunque, anche con la Zia.', voice: 'chiacchierona, curiosa', ideo: .15, informer: true },
    tonino: { bio: 'Tonino, scaricatore di porto. Forte, rancoroso verso chi comanda.', voice: 'rude, diretto', ideo: .6, knows: ['sp_pesce'], mestiere: { place: 'calata', pay: 8 } },
    elena: { bio: 'Elena Vitale, studentessa. Legge di nascosto i libri che la Tutela ha tolto.', voice: 'idealista, veloce', ideo: .68, knows: ['sp_lutto'], mestiere: { place: 'biblioteca', pay: 4 } },
    rosa: { bio: 'Rosa, fioraia. Ha perso il marito nel \'81, rettificato.', voice: 'malinconica, gentile', ideo: .55, knows: ['sp_fiori'], mestiere: { place: 'fiori', pay: 5 } },
    nico: { bio: 'Nico, fattorino. Fa consegne per tutti, anche per lo Squalo.', voice: 'svelto, opportunista', ideo: .5, mestiere: { place: 'molo', pay: 6 } },
    sandro: { bio: 'Sandro lo Squalo, ricettatore. Fa affari con la Tutela e con chi la combatte, purché paghino.', voice: 'minaccioso, affarista', ideo: .2 },
    carla: { bio: 'Carla Russo, Guardia Insulare. Crede nell\'ordine.', voice: 'formale, sospettosa', ideo: .05, never: ['unisciti', 'sabota', 'rivela_spazio'] },
    ferri: { bio: 'Ferri, Guardia Insulare. Stanco, corruttibile.', voice: 'svogliato, cinico', ideo: .25, never: ['unisciti', 'sabota'] },
  };
  // i nuovi personaggi della bibbia, aggiunti al cast del motore
  const NEW_CAST = [
    { id: 'lupo', name: 'Ettore «Lupo» Ganz', first: 'Ettore', role: 'Bibliotecario, ex partigiano', home: 'stella', tr: { cor: .7, loq: .5, avid: .1, legge: .3 }, sched: [[0, 'stella'], [8, 'biblioteca'], [13, 'piazza'], [15, 'biblioteca'], [20, 'osteria'], [22, 'stella']], look: { skin: '#e3c1a0', top: '#4a3a2a', bottom: '#2a2a33', hair: '#d8d4cc', hat: 'flat', hatCol: '#3a3a44', build: .95, extra: 'glasses' } },
    { id: 'vinile', name: 'Rita «Vinile» Sanna', first: 'Rita', role: 'DJ della Discoteca Luna', home: 'gabbiano', tr: { cor: .9, loq: .8, avid: .3, legge: .1 }, sched: [[10, 'gabbiano'], [15, 'spiaggia'], [19, 'sirena'], [21, 'disco']], look: { skin: '#d8a982', top: '#c05cff', bottom: '#1a1a22', hair: '#111', hat: 'pony', build: .9, extra: 'shades' } },
    { id: 'betamax', name: 'Gigi «Betamax» Mura', first: 'Gigi', role: 'Gestore della Videoteca Stella', home: 'mare', tr: { cor: .35, loq: .7, avid: .85, legge: .3 }, sched: [[0, 'mare'], [9, 'video'], [13, 'passeggiata'], [14, 'video'], [23, 'mare']], look: { skin: '#dcae88', top: '#ff5a5a', bottom: '#2a2a33', hair: '#3a2a1a', hat: 'slick', build: 1.1, extra: 'moustache,gold' } },
    { id: 'divisa', name: 'Marlon «Divisa» Pinna', first: 'Marlon', role: 'Ex Grigio disertore', home: 'pineta', tr: { cor: .85, loq: .2, avid: .3, legge: .2 }, sched: [[0, 'pineta']], hp: 100, look: { skin: '#c99a76', top: '#6a7380', bottom: '#4a5260', hair: '#1a1a1a', hat: 'none', build: 1.2, extra: 'belt' } },
    { id: 'cono', name: 'Sasà «Cono» Deiana', first: 'Sasà', role: 'Ragazzo della Gelateria Polo Nord', home: 'mare', tr: { cor: .75, loq: .9, avid: .4, legge: .3 }, sched: [[0, 'mare'], [9, 'gelateria'], [20, 'lungomare'], [22, 'piazzetta']], look: { skin: '#e0b894', top: '#8affd0', bottom: '#34425f', hair: '#2a1d14', hat: 'capback', hatCol: '#ff4fa3', build: .9, extra: '' } },
    { id: 'vasco', name: 'Colonnello Ruggero Vasco', first: 'Vasco', role: 'Comandante della Guardia Insulare', home: 'miramare', tr: { cor: .9, loq: .3, avid: .3, legge: 1 }, sched: [[8, 'miramare'], [12, 'piazza'], [14, 'miramare'], [19, 'lungomare'], [21, 'miramare']], look: { skin: '#e0b894', top: '#5c6672', bottom: '#3c444e', hair: '#bbb', hat: 'police', build: 1.2, extra: 'moustache,belt' } },
    { id: 'pardo', name: 'Commissaria Ines Pardo', first: 'Pardo', role: 'Capo dell\'Ufficio Rettifiche', home: 'flamingo', tr: { cor: .8, loq: .6, avid: .1, legge: 1 }, sched: [[8, 'biblioteca'], [13, 'osteria'], [15, 'biblioteca'], [19, 'piazza'], [21, 'flamingo']], look: { skin: '#f0cfb2', top: '#2a2a30', bottom: '#2a2a30', hair: '#7a3b1f', hat: 'bun', build: .95, extra: 'glasses' } },
    { id: 'zia', name: 'La Zia', first: 'La Zia', role: 'Vedova del Bar Sirena. Capo degli Orecchi', home: 'sirena', tr: { cor: .4, loq: 1, avid: .5, legge: .95 }, sched: [[0, 'sirena']], look: { skin: '#e8c3a4', top: '#15151c', bottom: '#15151c', hair: '#cfcac4', hat: 'scarf', hatCol: '#15151c', build: .9, extra: 'shawl' } },
    { id: 'malanotte', name: 'Salvatore «Malanotte» Cuccu', first: 'Malanotte', role: 'Capobanda dei briganti', home: 'ovile', faction: 'briganti', nocturnal: true, hp: 130, weapon: 'lupara', tr: { cor: 1, loq: .2, avid: .7, legge: 0 }, sched: [[0, 'radura']], look: { skin: '#b9825c', top: '#2a2420', bottom: '#1a1a1a', hair: '#111', hat: 'fedora', hatCol: '#1a1410', build: 1.3, extra: 'moustache' } },
  ];
  const RECRUITABLE = ['lupo', 'beppe', 'lucia', 'pietro', 'vinile', 'betamax', 'divisa', 'cono', 'malanotte', 'elena', 'tonino', 'rosa', 'nico', 'gino'];

  // ---------------- STATO ----------------
  const ensureTables = (() => { let done = false; return () => {
    if (done) return; done = true;
    Object.assign(G.SEV, { scritta: .45, volantino: .5, sabotaggio: .85, furto_mat: .6, liberazione: .9, colletta: .2, scasso: .7, telecamera: .55, murale: .5, foto: .3 });
    Object.assign(G.NOISE, { scritta: 2, volantino: 3, sabotaggio: 20, furto_mat: 6, liberazione: 18, colletta: 4, scasso: 8, telecamera: 7, murale: 3, foto: 1 });
    Object.assign(G.NEG, { scritta: 1, volantino: 1, sabotaggio: 1, furto_mat: 1, liberazione: 1, scasso: 1, telecamera: 1, murale: 1 });
    Object.assign(G.LABEL, { scritta: 'Scritta della Risacca', volantino: 'Volantinaggio', sabotaggio: 'Sabotaggio', furto_mat: 'Furto di materiali', liberazione: 'Evasione', colletta: 'Colletta', scasso: 'Scasso', telecamera: 'Telecamera accecata', murale: 'Murale della Risacca', foto: 'Foto rubate' });
  }; })();

  function spaceEntrance(sp) {
    const b = G.BUILDINGS.find(k => k.id === sp.b); if (!b) return null;
    let best = null, bd = 1e9; const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    for (let x = b.x - 1; x <= b.x + b.w; x++) for (let y = b.y - 1; y <= b.y + b.h; y++) {
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) continue;
      if (!G.walkT(x, y)) continue;
      const t = G.tileAt(x, y), road = t === G.T.VIA ? 6 : 0, side = Math.abs(x + .5 - cx) > b.w / 2 && Math.abs(y + .5 - cy) > b.h / 2 ? 2 : 0; // niente porte sulla strada col traffico né sugli spigoli
      const d = road + side + Math.hypot(x + .5 - cx, y + .5 - cy) * .2;
      if (d < bd) { bd = d; best = { tx: x, ty: y }; }
    }
    return best ? Object.assign(tileC(best.tx, best.ty), best) : null;
  }

  function create(st) {
    ensureTables();
    st.deadline = Infinity; // niente debito a scadenza: si gioca la Risacca
    if (PLACES.officina) PLACES.officina.name = 'Officina di Dorino';
    const R = st.ris = {
      morale: 12, repr: 6, inv: { gesso: 3 }, cassa: 30, cassaAt: null,   // [soldi] la cassa comune: dove sta (una base, o con te)
      bases: [], sites: [], spaces: {}, chats: {}, inbox: [],
      goals: { onde: 0, trasmissioni: 0, ripetitore: false, act: 1, done: false }, mission: null, raid: null,
      ripetitore: { brokenUntil: -1 }, cams: {}, silenced: {}, mole: null, linea: 'equilibrio', murals: [], lastT: st.t, hourMark: Math.floor(st.t / 60), nextTask: 1, nextBase: 1, log: [],
    };
    SPACES.forEach(sp => { const e = spaceEntrance(sp); if (e) R.spaces[sp.id] = { id: sp.id, x: e.x, y: e.y, found: false, base: null, locked: !!sp.locked }; });
    // il cast della bibbia: chi c'era già cambia nome e ruolo, gli altri arrivano
    st.npcs.forEach(n => {
      const c = CARDS[n.id];
      if (c && c.name) { n.name = c.name; n.first = c.first; n.role = c.role; }
      if (n.cop) { n.role = 'Guardia Insulare («i Grigi»)'; n.look.top = '#5c6672'; n.look.bottom = '#3c444e'; n.name = n.name.replace('Agente ', 'Guardia '); }
    });
    NEW_CAST.forEach(c => { if (!byId(st, c.id)) { const n = G.makeNpc(st, JSON.parse(JSON.stringify(c))); n.first = c.first; st.npcs.push(n); } });
    st.npcs.forEach(n => initNpc(st, n));
    G.addLog(st, 'Porto Vecchio, sotto la Tutela. Hai tre gessetti in tasca e nessuno con cui usarli. Trova la Risacca: Lupo, in biblioteca, sa da dove cominciare.', 'info');
    G.feed(st, 'Obiettivo: recluta due membri della Risacca.', 'job');
  }
  function initNpc(st, n) {
    if (n.ris) return n.ris;
    const c = CARDS[n.id] || {};
    const ideo = c.ideo !== undefined ? c.ideo : n.cop ? .05 : n.faction ? .25 : .2 + st.rng() * .45;
    n.ris = { ideo, bond: 0, member: false, loyalty: 0, fatigue: 0, fame: st.rng() * .3, sete: st.rng() * .3, auto: true, autoAt: 0, task: null, carry: {}, notes: [], missionDone: false, pay: 0, persuade: 0, joinedAt: null, seenSpaces: {} };
    return n.ris;
  }
  const card = n => CARDS[n.id] || { bio: `${n.name}, ${n.role.toLowerCase()}.`, voice: 'normale, da gente di porto', ideo: n.ris ? n.ris.ideo : .3 };
  const battle = n => (CARDS[n.id] && CARDS[n.id].battle) || null;
  const members = st => st.npcs.filter(n => n.ris && n.ris.member && !n.dead);
  const reprLevel = st => Math.min(5, Math.floor(st.ris.repr / 20));
  const hourNow = st => G.hour(st);

  // ---------------- SCORTE ----------------
  const capacity = b => b.kind === 'buca' ? 12 : b.modules.includes('radio') && b.only === 'radio' ? 4 : 8 + 20 * b.modules.filter(m => m === 'deposito').length;
  const used = b => Object.values(b.stock).reduce((a, v) => a + v, 0);
  function totalRes(st, res) { let t = st.ris.inv[res] || 0; st.ris.bases.forEach(b => { if (b.alive) t += b.stock[res] || 0; }); return t; }
  function takeRes(st, res, qty, prefer) {
    if (totalRes(st, res) < qty) return false;
    let need = qty;
    const order = st.ris.bases.filter(b => b.alive).sort((a, b) => (b === prefer ? 1 : 0) - (a === prefer ? 1 : 0));
    for (const b of order) { const k = Math.min(need, b.stock[res] || 0); if (k) { b.stock[res] -= k; need -= k; if (!b.stock[res]) delete b.stock[res]; } if (!need) break; }
    if (need) { st.ris.inv[res] -= need; if (!st.ris.inv[res]) delete st.ris.inv[res]; }
    return true;
  }
  function putBase(st, b, res, qty) {
    const room = Math.max(0, capacity(b) - used(b)), k = Math.min(room, qty);
    if (k > 0) b.stock[res] = (b.stock[res] || 0) + k;
    return k;
  }
  function putAnywhere(st, res, qty, near) {
    let left = qty;
    const bs = st.ris.bases.filter(b => b.alive).sort((a, b) => near ? dist(a.x, a.y, near.x, near.y) - dist(b.x, b.y, near.x, near.y) : 0);
    for (const b of bs) { left -= putBase(st, b, res, left); if (!left) break; }
    if (left) st.ris.inv[res] = (st.ris.inv[res] || 0) + left;
  }
  const invCount = st => Object.values(st.ris.inv).reduce((a, v) => a + v, 0);
  const payCassa = (st, amt) => { st.ris.cassa += amt; };   // [soldi] la cassa comune non è il portafoglio

  // ---------------- RISOLUZIONE DEI NOMI ----------------
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[«»"']/g, ' ').trim();
  function resolveRes(s) {
    const t = norm(s); if (!t) return null;
    if (RES[t]) return t;
    for (const [id, r] of Object.entries(RES)) if (r.syn.some(w => t === norm(w) || t.includes(norm(w)))) return id;
    return null;
  }
  function resolvePlace(st, s, n) {
    const t = norm(s); if (!t) return null;
    if (t === 'qui' || t === 'qua') { const p = n || st.player; return { x: p.x, y: p.y, name: G.nearestPlace(p.x, p.y).name, id: null }; }
    const b = resolveBase(st, s); if (b) return { x: b.x, y: b.y, name: b.name, id: b.id, base: b };
    if (PLACES[t]) return Object.assign({ id: t }, PLACES[t]);
    for (const p of Object.values(PLACES)) if (norm(p.name) === t || norm(p.name).includes(t) || t.includes(norm(p.name))) return Object.assign({ id: p.id }, p);
    const words = t.split(/\s+/).filter(w => w.length > 3);
    for (const p of Object.values(PLACES)) { const pn = norm(p.name); if (words.some(w => pn.split(/\s+/).includes(w))) return Object.assign({ id: p.id }, p); }
    const sp = resolveSpace(st, s); if (sp) { const S = st.ris.spaces[sp.id]; return { x: S.x, y: S.y, name: sp.name, id: sp.id }; }
    const lot = resolveLot(s); if (lot) { const c = lotCenter(lot); return { x: c.x, y: c.y, name: lot.name, id: lot.id }; }
    return null;
  }
  function resolveBase(st, s) {
    const t = norm(s); if (!t) return null;
    const alive = st.ris.bases.filter(b => b.alive);
    if (t === 'base' || t === 'la base') return alive[0] || null;
    return alive.find(b => b.id === t || norm(b.name) === t || norm(b.name).includes(t) || (t.length > 4 && t.includes(norm(b.name)))) || null;
  }
  function resolveSpace(st, s) {
    const t = norm(s); if (!t) return null;
    return SPACES.find(sp => sp.id === t || norm(sp.name) === t || norm(sp.name).includes(t) || t.includes(norm(sp.name))) || null;
  }
  function resolveLot(s) {
    const t = norm(s); if (!t) return null;
    return LOTS.find(l => l.id === t || norm(l.name).includes(t) || t.includes(norm(l.name)) || t.includes(l.id.slice(4))) || null;
  }
  function resolvePerson(st, s) {
    const t = norm(s); if (!t) return null;
    return st.npcs.find(n => n.id === t) || st.npcs.find(n => !n.dead && (norm(n.first) === t || norm(n.name).includes(t) || (battle(n) && norm(battle(n)) === t))) || null;
  }
  const lotCenter = l => ({ x: (l.tx + l.w / 2) * TS, y: (l.ty + l.h / 2) * TS });
  const targetPos = tg => tg.tx !== undefined ? tileC(tg.tx, tg.ty + 1) : PLACES[tg.place];

  // ---------------- VOLONTÀ ----------------
  function will(st, n, verb, args) {
    G.opinions(st, n);
    const r = initNpc(st, n), o = n.op, V = VERBS[verb] || { risk: 0 }, c = card(n), rl = reprLevel(st);
    const trust = clamp(o.trust + r.bond, -1, 1);
    const why = [];
    let s;
    if (verb === 'unisciti') {
      s = .32 * trust + .55 * r.ideo + (r.missionDone ? .35 : c.mission ? 0 : .12) - .48 - o.fear * .5 - o.grudge * .6 + st.ris.morale / 400 - rl * .04 + r.persuade + r.pay * .5;
      if (r.missionDone) why.push('gli hai fatto il favore che chiedeva');
      else if (c.mission) why.push('prima vuole vederti all\'opera: ha una missione per te');
    } else if (verb === 'racconta' || verb === 'rivela_spazio' || verb === 'missione') {
      s = .3 + .5 * trust + .2 * r.ideo - o.fear * .4 - o.grudge * .7 + r.persuade - (c.antag ? .6 : 0);
    } else if (verb === 'ricevi_soldi') {
      s = .5 + n.tr.avid * .3 - (c.antag ? .2 : 0);
    } else if (verb === 'basta' || verb === 'lascia' || verb === 'mangia' || verb === 'bevi' || verb === 'dormi' || verb === 'autonomia' || verb === 'linea') {
      s = 1;
    } else {
      s = .25 * trust + (r.member ? .35 * r.loyalty : 0) + r.ideo * (V.pol ? .3 : .1) - o.fear * .6 - o.grudge * .5
        - V.risk * (1.15 - n.tr.cor) * (1 + rl * .18) - r.fatigue * (V.work ? .45 : .15) + r.pay + r.persuade;
      if (V.task && !r.member) { s -= .45; why.push('non è della Risacca: non prende ordini'); }
      if (V.illegal) { s -= n.tr.legge * .25 - n.tr.avid * .08; if (n.tr.legge > .6) why.push('non gli piace infrangere la legge'); }
      if (V.work && (r.fame > .7 || r.sete > .7)) { s -= .15; why.push(r.fame > r.sete ? 'ha fame' : 'ha sete'); }
    }
    if (EXT.willMod) s += EXT.willMod(st, n, verb) || 0;   // [protagonista] come ti presenti: brillo, sporco, stanco, amico
    if (c.likes && c.likes.includes(verb)) { s += .15; why.push('lo fa volentieri'); }
    if (c.never && c.never.includes(verb)) { s -= 1; why.push('non lo farebbe mai'); }
    if (V.risk >= .3 && rl >= 3) why.push(`la Repressione è al livello ${rl}`);
    if (r.fatigue > .6 && V.work) why.push('è stanco morto');
    if (o.fear > .4) why.push('ha paura di te');
    if (o.grudge > .35) why.push('ce l\'ha con te');
    const verdict = s >= .2 ? 'accetta' : s >= 0 ? 'contratta' : 'rifiuta';
    return { s: r2(s), verdict, why };
  }

  // ---------------- PIANI: verbo → passi (o errore) ----------------
  const placeOf = (st, s, n) => resolvePlace(st, s, n);
  function nearestShop(st, res, from) {
    let best = null, bd = 1e9;
    for (const [pid, list] of Object.entries(SHOPS)) if (list[res] > 0 && PLACES[pid]) { const d = dist(from.x, from.y, PLACES[pid].x, PLACES[pid].y); if (d < bd) { bd = d; best = pid; } }
    return best;
  }
  function nearestBase(st, from) {
    let best = null, bd = 1e9;
    st.ris.bases.forEach(b => { if (!b.alive || b.only === 'radio') return; const d = dist(from.x, from.y, b.x, b.y); if (d < bd) { bd = d; best = b; } });
    return best;
  }
  // [fazioni] punti d'aggancio per i moduli esterni: verbi in più (plan / do), tetto dei membri, chi parla in cella
  const EXT = { plan: [], do: {}, canJoin: null, onJoin: [], onTalk: [], willMod: null, cardExtra: null };
  const go = (p, extra) => Object.assign({ k: 'go', x: p.x, y: p.y, name: p.name }, extra || {});
  const PUBLIC = ['piazza', 'fontana', 'calata', 'vico', 'lungomare', 'molo', 'piazzetta', 'passeggiata', 'giardini', 'caruggio', 'salita', 'spiaggia', 'marina'];

  function plan(st, n, verb, a) {
    a = a || {};
    const r = n.ris, c = card(n);
    const hours = h => clamp(Math.round(Number(h) || 0) || 0, 1, 12);
    switch (verb) {
      case 'vai': { const p = placeOf(st, a.luogo, n); if (!p) return { err: `Non so dove sia «${a.luogo || '?'}».` }; return { steps: [go(p), { k: 'hold', mins: 90 }], desc: `va a ${p.name}` }; }
      case 'seguimi': return { steps: [{ k: 'follow' }], desc: 'ti segue' };
      case 'aspetta': { const p = a.luogo ? placeOf(st, a.luogo, n) : null; return { steps: (p ? [go(p)] : []).concat([{ k: 'hold', mins: 180 }]), desc: p ? `ti aspetta a ${p.name}` : 'ti aspetta qui' }; }
      case 'nasconditi': { const b = resolveBase(st, a.base) || nearestBase(st, n); if (!b) return { err: 'La Risacca non ha ancora una base.' }; return { steps: [go(b), { k: 'inside', base: b.id }], desc: `si nasconde in ${b.name}` }; }
      case 'prendi': {
        const res = resolveRes(a.risorsa), q = Math.max(1, Math.round(a.quanto || 1)); if (!res) return { err: 'Prendere cosa?' };
        if ((st.ris.inv[res] || 0) < q) return { err: `Non hai ${q} ${RES[res].name} con te.` };
        return { steps: [{ k: 'reach' }, { k: 'do', fn: 'take', res, q }], desc: `prende ${q} ${RES[res].name} da te` };
      }
      case 'dai': {
        if (a.risorsa && norm(a.risorsa) === 'soldi') { const q = Math.max(1, Math.round(a.quanto || 10)); return { steps: [{ k: 'reach' }, { k: 'do', fn: 'giveMoney', q }], desc: `ti dà ${q}.000 lire` }; }
        const res = resolveRes(a.risorsa) || Object.keys(r.carry)[0]; if (!res) return { err: 'Non ha niente da darti.' };
        const q = Math.max(1, Math.round(a.quanto || r.carry[res] || 1));
        if ((r.carry[res] || 0) < q) return { err: `Non ha ${q} ${RES[res].name} con sé.` };
        return { steps: [{ k: 'reach' }, { k: 'do', fn: 'give', res, q }], desc: `ti dà ${q} ${RES[res].name}` };
      }
      case 'compra': {
        const res = resolveRes(a.risorsa), q = clamp(Math.round(a.quanto || 1), 1, 20); if (!res) return { err: 'Comprare cosa?' };
        const shop = (a.luogo && PLACES[a.luogo] && SHOPS[a.luogo] && SHOPS[a.luogo][res] > 0) ? a.luogo : nearestShop(st, res, n); if (!shop) return { err: `Nessuno vende ${RES[res].name} a Porto Vecchio.` };
        const price = SHOPS[shop][res] * q; if (st.ris.cassa < price) return { err: `Servono ${price}.000 lire e la cassa ne ha ${Math.floor(st.ris.cassa)}.` };
        const b = nearestBase(st, PLACES[shop]);
        return { steps: [go(PLACES[shop]), { k: 'do', fn: 'buy', res, q, shop }].concat(b ? [go(b), { k: 'do', fn: 'deposit', base: b.id }] : [{ k: 'reach' }, { k: 'do', fn: 'giveAll' }]), desc: `compra ${q} ${RES[res].name} da ${PLACES[shop].name} (${price}.000)` };
      }
      case 'porta': {
        const res = resolveRes(a.risorsa), q = Math.max(1, Math.round(a.quanto || 1)); if (!res) return { err: 'Portare cosa?' };
        const from = resolveBase(st, a.da), to = placeOf(st, a.a, n);
        if (!from) return { err: 'Da quale base?' }; if (!to) return { err: 'Portare dove?' };
        if ((from.stock[res] || 0) < q) return { err: `In ${from.name} non ci sono ${q} ${RES[res].name}.` };
        return { steps: [go(from), { k: 'do', fn: 'pick', base: from.id, res, q }, go(to), { k: 'do', fn: to.base ? 'deposit' : 'drop', base: to.base ? to.base.id : null }], desc: `porta ${q} ${RES[res].name} a ${to.name}` };
      }
      case 'deposita': { const b = resolveBase(st, a.base) || nearestBase(st, n); if (!b) return { err: 'La Risacca non ha ancora una base.' }; if (!Object.keys(r.carry).length) return { err: 'Non ha niente con sé.' }; return { steps: [go(b), { k: 'do', fn: 'deposit', base: b.id }], desc: `porta tutto in ${b.name}` }; }
      case 'ruba': {
        const res = resolveRes(a.risorsa) || 'materiali', p = placeOf(st, a.luogo, n) || (SHOPS.magazzino[res] ? PLACES.magazzino : PLACES[nearestShop(st, res, n) || 'magazzino']);
        if (!p) return { err: 'Rubare dove?' };
        const b = nearestBase(st, p);
        return { steps: [go(p), { k: 'do', fn: 'steal', res, q: res === 'materiali' ? 4 : 2, place: p.name }].concat(b ? [go(b), { k: 'do', fn: 'deposit', base: b.id }] : []), desc: `ruba ${RES[res].name} a ${p.name}` };
      }
      case 'sorveglia': { const p = placeOf(st, a.luogo, n); if (!p) return { err: 'Sorvegliare dove?' }; const h = hours(a.ore || 3); return { steps: [go(p), { k: 'work', kind: 'sorveglia', hours: h, place: p.name }], desc: `sorveglia ${p.name} per ${h} ore` }; }
      case 'diffondi_voce': { const p = placeOf(st, a.luogo, n) || PLACES[PUBLIC[Math.floor(st.rng() * 4)]]; return { steps: [go(p), { k: 'do', fn: 'rumor', text: String(a.testo || 'la Risacca è viva').slice(0, 120) }], desc: `mette in giro una voce a ${p.name}` }; }
      case 'lavora': { if (!c.mestiere) return { err: `${n.first} non ha un mestiere da cui tirare fuori soldi.` }; const h = hours(a.ore || 4), p = PLACES[c.mestiere.place]; return { steps: [go(p), { k: 'work', kind: 'mestiere', hours: h, place: p.name, pay: c.mestiere.pay }], desc: `lavora a ${p.name} per ${h} ore (${c.mestiere.pay}.000 l'ora)` }; }
      case 'colletta': { const p = placeOf(st, a.luogo, n) || PLACES.piazza; const h = hours(a.ore || 3); return { steps: [go(p), { k: 'work', kind: 'colletta', hours: h, place: p.name }], desc: `fa la colletta a ${p.name} per ${h} ore` }; }
      case 'contrabbando': { const h = hours(a.ore || 3); return { steps: [go(PLACES.pontile), { k: 'work', kind: 'contrabbando', hours: h, place: PLACES.pontile.name }], desc: `contrabbando al Pontile Est per ${h} ore (solo di notte)` }; }
      case 'mercato': { if ((totalRes(st, 'merce')) < 1) return { err: 'Non c\'è merce da vendere.' }; const h = hours(a.ore || 3); return { steps: [go(PLACES.video), { k: 'work', kind: 'mercato', hours: h, place: PLACES.video.name }], desc: `vende merce sottobanco in videoteca per ${h} ore` }; }
      case 'recupera': {
        const p = placeOf(st, a.luogo, n); const src = p && (p.id === 'cantiere' || p.id === 'magazzino') ? p : PLACES[st.rng() < .5 ? 'cantiere' : 'magazzino'];
        const b = nearestBase(st, src); if (!b) return { err: 'Prima serve una base dove mettere i materiali.' };
        return { steps: [go(src), { k: 'work', kind: 'recupera', hours: 2, place: src.name }, go(b), { k: 'do', fn: 'deposit', base: b.id }], desc: `recupera materiali a ${src.name} e li porta in ${b.name}` };
      }
      case 'produci': {
        const b = resolveBase(st, a.base) || st.ris.bases.find(k => k.alive && k.modules.some(m => LAB[m])); if (!b) return { err: 'Non c\'è nessun laboratorio.' };
        const m = (a.modulo && b.modules.includes(norm(a.modulo))) ? norm(a.modulo) : b.modules.find(k => LAB[k]); if (!m) return { err: `${b.name} non ha laboratori.` };
        const h = hours(a.ore || 4); return { steps: [go(b), { k: 'work', kind: 'produci', hours: h, base: b.id, mod: m, place: b.name }], desc: `lavora alla ${MODULES[m].name.toLowerCase()} di ${b.name} per ${h} ore` };
      }
      case 'scrivi_onda': { const p = placeOf(st, a.luogo, n) || PLACES[PUBLIC[Math.floor(st.rng() * PUBLIC.length)]]; if (totalRes(st, 'gesso') + (r.carry.gesso || 0) < 1) return { err: 'Non c\'è più gesso.' }; return { steps: [go(p), { k: 'do', fn: 'onda', place: p.name }], desc: `scrive l'onda a ${p.name}` }; }
      case 'volantina': { const p = placeOf(st, a.luogo, n) || PLACES.piazza; if (totalRes(st, 'volantini') + (r.carry.volantini || 0) < 10) return { err: 'Servono almeno 10 volantini.' }; return { steps: [go(p), { k: 'do', fn: 'volantini', place: p.name }], desc: `volantina a ${p.name}` }; }
      case 'sabota': {
        const t = norm(a.obiettivo); const id = Object.keys(TARGETS).find(k => t.includes(k) || norm(TARGETS[k].name).includes(t)) || (t.includes('antenna') || t.includes('belvedere') ? 'ripetitore' : t.includes('camp') || t.includes('macchin') || t.includes('caserm') ? 'campagnola' : t.includes('cinem') ? 'proiettore' : t.includes('bibliot') || t.includes('fascicol') ? 'archivio' : t.includes('benzin') || t.includes('carbur') ? 'cisterna' : null);
        if (!id) return { err: `Sabotare cosa? Obiettivi: ${Object.values(TARGETS).map(k => k.name).join(', ')}.` };
        if (id === 'ripetitore' && st.t < st.ris.ripetitore.brokenUntil) return { err: 'Il ripetitore è già fuori uso.' };
        if (totalRes(st, 'kit') + totalRes(st, 'attrezzi') + (r.carry.kit || 0) + (r.carry.attrezzi || 0) < 1) return { err: 'Servono attrezzi o un kit di sabotaggio.' };
        return { steps: [go(targetPos(TARGETS[id])), { k: 'do', fn: 'sabota', target: id }], desc: `sabota ${TARGETS[id].name}` };
      }
      case 'trasmetti': {
        const b = st.ris.bases.find(k => k.alive && k.modules.includes('radio')); if (!b) return { err: 'Serve una base con la radio.' };
        if (totalRes(st, 'radio') < 1) return { err: 'Servono parti radio.' };
        const h = hours(a.ore || 2); return { steps: [go(b), { k: 'work', kind: 'trasmetti', hours: h, base: b.id, place: b.name }], desc: `manda in onda Radio Scirocco da ${b.name} per ${h} ore` };
      }
      case 'libera': {
        const tn = resolvePerson(st, a.persona) || st.npcs.find(k => k.ris && k.ris.member && k.jailedUntil > st.t);
        if (!tn || !(tn.jailedUntil > st.t)) return { err: 'Non c\'è nessuno in cella da liberare.' };
        return { steps: [go(PLACES.commissariato), { k: 'do', fn: 'libera', who: tn.id }], desc: `prova a tirare fuori ${tn.first} dalla caserma` };
      }
      case 'proteggi': { const b = resolveBase(st, a.base) || nearestBase(st, n); if (!b) return { err: 'Non c\'è una base da proteggere.' }; return { steps: [go(b), { k: 'hold', mins: 360, guard: b.id }], desc: `fa la guardia a ${b.name}` }; }
      case 'recluta': {
        const tn = resolvePerson(st, a.persona); if (!tn || tn.dead) return { err: 'Reclutare chi?' };
        if (tn.ris && tn.ris.member) return { err: `${tn.first} è già dei nostri.` };
        return { steps: [{ k: 'meet', who: tn.id }, { k: 'do', fn: 'recruit', who: tn.id }], desc: `va a parlare con ${tn.first}` };
      }
      case 'occupa': {
        const sp = resolveSpace(st, a.spazio) || SPACES.find(s => st.ris.spaces[s.id] && st.ris.spaces[s.id].found && !st.ris.spaces[s.id].base);
        if (!sp || !st.ris.spaces[sp.id]) return { err: 'Quale spazio? Prima bisogna trovarne uno.' };
        const S = st.ris.spaces[sp.id]; if (!S.found) return { err: 'Quello spazio non lo conosciamo ancora.' }; if (S.base) return { err: 'È già una nostra base.' };
        return { steps: [go(S), { k: 'do', fn: 'occupy', space: sp.id }], desc: `occupa ${sp.name}` };
      }
      case 'costruisci': {
        let site = st.ris.sites.find(s => !s.done && (!a.lotto || s.lot === (resolveLot(a.lotto) || {}).id));
        if (!site) {
          const lot = resolveLot(a.lotto); if (!lot) return { err: `Costruire dove? Lotti: ${LOTS.map(l => l.name).join(', ')}.` };
          const sid = STRUCTS[norm(a.struttura)] ? norm(a.struttura) : lot.antennaOnly ? 'antenna' : 'baracca';
          const e = canStartSite(st, lot.id, sid); if (e) return { err: e };
          return { steps: [go(lotCenter(lot)), { k: 'do', fn: 'startSite', lot: lot.id, struct: sid }, { k: 'work', kind: 'costruisci', hours: hours(a.ore || 4), lot: lot.id, place: lot.name }], desc: `apre il cantiere (${STRUCTS[sid].name}) a ${lot.name}` };
        }
        const lot = LOTS.find(l => l.id === site.lot);
        return { steps: [go(lotCenter(lot)), { k: 'work', kind: 'costruisci', hours: hours(a.ore || 4), lot: lot.id, place: lot.name }], desc: `lavora al cantiere di ${lot.name}` };
      }
      case 'allestisci': {
        const b = resolveBase(st, a.base) || nearestBase(st, n); if (!b) return { err: 'Non c\'è una base.' };
        const m = norm(a.modulo); if (!MODULES[m]) return { err: `Quale modulo? ${Object.keys(MODULES).join(', ')}.` };
        const e = canInstall(st, b, m); if (e) return { err: e };
        return { steps: [go(b), { k: 'do', fn: 'install', base: b.id, mod: m }], desc: `monta ${MODULES[m].name.toLowerCase()} in ${b.name}` };
      }
      case 'mangia': case 'bevi': {
        const list = verb === 'mangia' ? EAT : DRINK, pl = list.map(id => PLACES[id]).filter(Boolean).sort((a, b) => dist(n.x, n.y, a.x, a.y) - dist(n.x, n.y, b.x, b.y))[0];
        const b = verb === 'mangia' ? st.ris.bases.find(k => k.alive && (k.stock.viveri || 0) > 0 && dist(n.x, n.y, k.x, k.y) < dist(n.x, n.y, pl.x, pl.y) + 20) : null;
        if (b) return { steps: [go(b), { k: 'do', fn: 'eat', base: b.id }], desc: `mangia qualcosa in ${b.name}` };
        return { steps: [go(pl), { k: 'do', fn: verb === 'mangia' ? 'eat' : 'drink' }], desc: `${verb === 'mangia' ? 'mangia' : 'beve qualcosa'} a ${pl.name}` };
      }
      case 'dormi': {
        const b = st.ris.bases.filter(k => k.alive && k.modules.includes('dormitorio')).sort((x, y) => dist(n.x, n.y, x.x, x.y) - dist(n.x, n.y, y.x, y.y))[0];
        const home = PLACES[n.home] || PLACES.piazza, h = hours(a.ore || 6);
        return b ? { steps: [go(b), { k: 'sleep', base: b.id, hours: h }], desc: `dorme nel dormitorio di ${b.name}` } : { steps: [go(home), { k: 'sleep', hours: h }], desc: 'va a dormire a casa' };
      }
      case 'scassina': {
        const sp = resolveSpace(st, a.spazio) || SPACES.find(k => st.ris.spaces[k.id] && st.ris.spaces[k.id].found && st.ris.spaces[k.id].locked);
        if (!sp) return { err: 'Non c\'è nessun lucchetto da forzare che conosciamo.' };
        const S = st.ris.spaces[sp.id]; if (!S.locked) return { err: `${sp.name} è già aperto.` };
        if (!hasTool(st, n, 'attrezzi')) return { err: 'Serve un attrezzo: tronchesi o piede di porco.' };
        return { steps: [go(S), { k: 'do', fn: 'picklock', space: sp.id }], desc: `forza il lucchetto di ${sp.name}` };
      }
      case 'scasso': {
        const p = placeOf(st, a.luogo, n); const shop = p && SHOPS[p.id] ? p.id : ['wu', 'bar', 'gelateria', 'video', 'car_2'].sort((x, y) => dist(n.x, n.y, PLACES[x].x, PLACES[x].y) - dist(n.x, n.y, PLACES[y].x, PLACES[y].y))[0];
        return { steps: [go(PLACES[shop]), { k: 'work', kind: 'attesa', hours: .5, place: PLACES[shop].name }, { k: 'do', fn: 'burgle', shop }], desc: `scassina di notte ${PLACES[shop].name}` };
      }
      case 'lancia': {
        const want = norm(a.telecamera || a.luogo || a.bersaglio), p = placeOf(st, want, n) || n;
        const c = CAMS.filter(k => !(st.ris.cams[k.id] > st.t)).sort((x, y) => dist(p.x, p.y, camPos(x).x, camPos(x).y) - dist(p.x, p.y, camPos(y).x, camPos(y).y))[0];
        if (!c) return { err: 'Le telecamere sono già tutte cieche.' };
        const q = camPos(c); return { steps: [go(q), { k: 'do', fn: 'throw', cam: c.id }], desc: `accieca a sassate la telecamera di ${PLACES[c.place].name}` };
      }
      case 'fotografa': {
        if (!hasTool(st, n, 'fotocamera') && !hasTool(st, n, 'telefono')) return { err: 'Serve una macchina fotografica o un cellulare.' };
        const tn = resolvePerson(st, a.persona) || st.npcs.find(k => k.cop && !k.dead && !k.inside); if (!tn) return { err: 'Fotografare chi?' };
        return { steps: [{ k: 'meet', who: tn.id, keep: 6 }, { k: 'do', fn: 'photo', who: tn.id }], desc: `fotografa di nascosto ${tn.first}` };
      }
      case 'ricatta': {
        const tn = resolvePerson(st, a.persona); if (!tn) return { err: 'Ricattare chi?' };
        if (totalRes(st, 'prove') + (r.carry.prove || 0) < 1) return { err: 'Servono foto compromettenti.' };
        return { steps: [{ k: 'meet', who: tn.id }, { k: 'do', fn: 'blackmail', who: tn.id }], desc: `ricatta ${tn.first} con le foto` };
      }
      case 'convoca': {
        const tn = resolvePerson(st, a.persona); if (!tn || tn === n) return { err: 'Chiamare chi?' };
        const p = placeOf(st, a.luogo, n) || n;
        return { steps: [{ k: 'do', fn: 'summon', who: tn.id, x: p.x, y: p.y, name: p.name || G.nearestPlace(p.x, p.y).name }], desc: `telefona a ${tn.first} e gli dà appuntamento` };
      }
      case 'scava': {
        if (!hasTool(st, n, 'attrezzi')) return { err: 'Serve una pala o un piccone (attrezzi).' };
        const lot = resolveLot(a.luogo); const p = lot ? lotCenter(lot) : placeOf(st, a.luogo, n) || PLACES[['pineta', 'punta', 'spiaggia', 'giardini'][Math.floor(st.rng() * 4)]];
        return { steps: [go(p), { k: 'work', kind: 'scava', hours: 2, place: p.name || 'qui' }, { k: 'do', fn: 'dig' }], desc: `scava una buca nascosta a ${p.name || G.nearestPlace(p.x, p.y).name}` };
      }
      case 'inchioda': case 'arreda': {
        const b = resolveBase(st, a.base) || nearestBase(st, n); if (!b) return { err: 'Non c\'è una base.' };
        const res = verb === 'inchioda' ? 'materiali' : 'mobili', q = verb === 'inchioda' ? 3 : 2;
        if (totalRes(st, res) + (r.carry[res] || 0) < q) return { err: `Servono ${q} ${RES[res].name}.` };
        if (verb === 'inchioda' && b.barricade >= 3) return { err: `${b.name} è già sbarrata.` };
        if (verb === 'arreda' && b.comfort >= 3) return { err: `${b.name} è già arredata.` };
        return { steps: [go(b), { k: 'work', kind: 'attesa', hours: 1, place: b.name }, { k: 'do', fn: verb === 'inchioda' ? 'nail' : 'furnish', base: b.id }], desc: verb === 'inchioda' ? `inchioda assi alle finestre di ${b.name}` : `porta e sistema mobili in ${b.name}` };
      }
      case 'dipingi': {
        if (totalRes(st, 'vernice') + (r.carry.vernice || 0) < 2) return { err: 'Servono 2 di vernice (bombolette, pennelli).' };
        const p = placeOf(st, a.luogo, n) || PLACES[PUBLIC[Math.floor(st.rng() * PUBLIC.length)]];
        return { steps: [go(p), { k: 'work', kind: 'attesa', hours: 1, place: p.name }, { k: 'do', fn: 'mural', place: p.name }], desc: `dipinge un murale a ${p.name}` };
      }
      case 'picchia': {
        const tn = resolvePerson(st, a.persona); if (!tn || tn === n || tn.dead) return { err: 'Picchiare chi?' };
        return { steps: [{ k: 'meet', who: tn.id }, { k: 'do', fn: 'beat', who: tn.id }], desc: `va a dare una lezione a ${tn.first}` };
      }
      case 'ripara': { const h = hours(a.ore || 4); return { steps: [go(PLACES.officina), { k: 'work', kind: 'ripara', hours: h, place: PLACES.officina.name }], desc: `ripara motori e radio all'officina per ${h} ore` }; }
      case 'pesca': { const h = hours(a.ore || 3); return { steps: [go(PLACES.molo), { k: 'work', kind: 'pesca', hours: h, place: PLACES.molo.name }], desc: `pesca al molo per ${h} ore` }; }
      case 'rovista': {
        const p = placeOf(st, a.luogo, n); const sp = SPACES.find(k => st.ris.spaces[k.id] && !st.ris.spaces[k.id].base && !st.ris.spaces[k.id].locked);
        const src = p || (sp ? Object.assign({ name: sp.name }, st.ris.spaces[sp.id]) : PLACES.cantiere), b = nearestBase(st, src);
        return { steps: [go(src), { k: 'work', kind: 'rovista', hours: 2, place: src.name }].concat(b ? [go(b), { k: 'do', fn: 'deposit', base: b.id }] : []), desc: `rovista a ${src.name} in cerca di mobili e materiali` };
      }
      case 'bisca': { const h = hours(a.ore || 3); return { steps: [go(PLACES.flipper), { k: 'work', kind: 'bisca', hours: h, place: PLACES.flipper.name }], desc: `tiene la bisca alla sala giochi per ${h} ore` }; }
      case 'vendi_documenti': { if (totalRes(st, 'documenti') < 1) return { err: 'Non ci sono lasciapassare da vendere: servono i falsari.' }; const h = hours(a.ore || 3); return { steps: [go(PLACES.calata), { k: 'work', kind: 'documenti', hours: h, place: PLACES.calata.name }], desc: `vende lasciapassare falsi alla calata per ${h} ore` }; }
    }
    for (const f of EXT.plan) { const q = f(st, n, verb, a, { go, hours }); if (q) return q; }   // [fazioni]
    return { err: `«${verb}» non è un'azione che conosco.` };
  }
  const hasTool = (st, n, res) => totalRes(st, res) + ((n && n.ris.carry[res]) || 0) > 0;

  // ---------------- EFFETTI ----------------
  const LAB = {
    stamperia: { in: { carta: 1, inchiostro: 1 }, out: { volantini: 10 } },
    falsari: { in: { carta: 2 }, out: { documenti: 1 } },
    officina: { in: { attrezzi: 1 }, out: { kit: 1 } },
  };
  function say(st, n, text) { G.say(st, n, text, 3.4); }
  function inbox(st, n, text, kind, quiet) {
    const ch = st.ris.chats[n.id] = st.ris.chats[n.id] || [];
    ch.push({ role: 'npc', text, sys: true, t: st.t });
    st.ris.inbox.unshift({ npc: n.id, text, t: st.t }); if (st.ris.inbox.length > 30) st.ris.inbox.pop();
    if (!quiet || kind === 'bad') G.feed(st, `${battle(n) || n.first}: ${text}`, kind || 'job');
  }
  function camNear(st, x, y) { return CAMS.find(c => !(st.ris.cams[c.id] > st.t) && dist(camPos(c).x, camPos(c).y, x, y) < 14); }
  function riskEvent(st, n, type, extra, T) {
    const sneak = T && T.sneak, ev = G.emit(st, type, Object.assign({ actor: n.id, x: n.x, y: n.y }, sneak ? { noise: (G.NOISE[type] || 4) * .4 } : {}, extra || {}));
    let hostileWit = 0;
    st.npcs.forEach(k => {
      const i = k.mem.findIndex(q => q.eventId === ev.id); if (i < 0) return; const m = k.mem[i];
      if (sneak && !k.cop && st.rng() < .5) { k.mem.splice(i, 1); return; } // strisciando: metà dei testimoni non si accorge di niente
      if ((!k.cop && k.ris && k.ris.ideo > .55) || st.ris.silenced[k.id]) { m.silenced = true; return; } // chi simpatizza (o è ricattato) non parla
      hostileWit++;
    });
    const cam = camNear(st, n.x, n.y) && type !== 'telecamera';
    st.ris.repr = clamp(st.ris.repr + (G.SEV[type] || .5) * (hostileWit ? 9 : 2.5) + (cam ? 3 : 0), 0, 100);
    return { ev, seen: hostileWit + (cam ? 1 : 0), cam: !!cam };
  }
  function playerRiskEvent(st, type, extra) {
    const ev = G.emit(st, type, extra || {});
    let w = 0;
    st.npcs.forEach(k => { const m = k.mem.find(q => q.eventId === ev.id); if (!m) return; if ((!k.cop && k.ris && k.ris.ideo > .55) || st.ris.silenced[k.id]) { m.silenced = true; return; } w++; });
    const cam = camNear(st, st.player.x, st.player.y) && type !== 'telecamera';
    st.ris.repr = clamp(st.ris.repr + (G.SEV[type] || .5) * (w ? 9 : 2.5) + (cam ? 3 : 0), 0, 100);
    return { ev, seen: w + (cam ? 1 : 0), cam: !!cam };
  }
  const useOne = (st, n, res) => { if (n && n.ris.carry[res]) { n.ris.carry[res]--; if (!n.ris.carry[res]) delete n.ris.carry[res]; return true; } return takeRes(st, res, 1); };

  const DO = {
    take(st, n, T, s) { if ((st.ris.inv[s.res] || 0) < s.q) return { ok: false, msg: 'Non hai più quella roba.' }; st.ris.inv[s.res] -= s.q; if (!st.ris.inv[s.res]) delete st.ris.inv[s.res]; n.ris.carry[s.res] = (n.ris.carry[s.res] || 0) + s.q; return { ok: true }; },
    give(st, n, T, s) { const k = Math.min(s.q, n.ris.carry[s.res] || 0); n.ris.carry[s.res] -= k; if (!n.ris.carry[s.res]) delete n.ris.carry[s.res]; st.ris.inv[s.res] = (st.ris.inv[s.res] || 0) + k; return { ok: true, msg: `Ti ho dato ${k} ${RES[s.res].name}.` }; },
    giveAll(st, n) { for (const [k, v] of Object.entries(n.ris.carry)) st.ris.inv[k] = (st.ris.inv[k] || 0) + v; n.ris.carry = {}; return { ok: true, msg: 'Eccoti la roba.' }; },
    giveMoney(st, n, T, s) { const own = Math.round(20 + n.tr.avid * 10 + (n.ris.member ? 30 : 0)); const k = Math.max(0, Math.min(s.q, own, n.pop ? Math.floor(n.pop.money) : own)); if (!k) return { ok: false, msg: 'Non ho una lira in tasca, adesso.' }; if (n.pop) n.pop.money -= k; payCassa(st, k);   // [soldi] dal suo portafoglio
      n.ris.bond -= .02; return { ok: true, msg: `Tieni, ${k}.000 lire. Non chiedermene altri per un po'.` }; },
    buy(st, n, T, s) { const price = SHOPS[s.shop][s.res] * s.q; if (st.ris.cassa < price) return { ok: false, msg: 'La cassa non bastava più.' }; st.ris.cassa -= price; if (EXT.spendAt) EXT.spendAt(st, s.shop, price); n.ris.carry[s.res] = (n.ris.carry[s.res] || 0) + s.q; st.sfx.push({ k: 'cash' }); return { ok: true }; },
    pick(st, n, T, s) { const b = st.ris.bases.find(k => k.id === s.base); if (!b || (b.stock[s.res] || 0) < s.q) return { ok: false, msg: 'In base la roba non c\'era più.' }; b.stock[s.res] -= s.q; if (!b.stock[s.res]) delete b.stock[s.res]; n.ris.carry[s.res] = (n.ris.carry[s.res] || 0) + s.q; return { ok: true }; },
    deposit(st, n, T, s) { const b = st.ris.bases.find(k => k.id === s.base && k.alive); if (!b) return { ok: false, msg: 'La base non c\'è più.' }; for (const [k, v] of Object.entries(n.ris.carry)) { const put = putBase(st, b, k, v); n.ris.carry[k] -= put; if (!n.ris.carry[k]) delete n.ris.carry[k]; } b.expo = clamp(b.expo + .02, 0, 1); return { ok: true, msg: Object.keys(n.ris.carry).length ? 'Il deposito è pieno: il resto lo tengo io.' : `Messo tutto in ${b.name}.` }; },
    drop(st, n) { for (const [k, v] of Object.entries(n.ris.carry)) putAnywhere(st, k, v, n); n.ris.carry = {}; return { ok: true }; },
    steal(st, n, T, s) { const e = riskEvent(st, n, 'furto_mat', null, T); n.ris.carry[s.res] = (n.ris.carry[s.res] || 0) + s.q; return { ok: true, msg: e.seen ? `Preso, ma qualcuno mi ha visto a ${s.place}.` : `Preso ${s.q} ${RES[s.res].name}, nessuno ha visto.` }; },
    rumor(st, n, T, s) { st.ris.morale = clamp(st.ris.morale + 2, 0, 100); st.ris.repr = clamp(st.ris.repr + 1, 0, 100); say(st, n, `Hai sentito? ${cap1(s.text)}…`); return { ok: true, msg: 'La voce gira.' }; },
    onda(st, n, T, s) { if (!useOne(st, n, 'gesso')) return { ok: false, msg: 'Finito il gesso.' }; const e = riskEvent(st, n, 'scritta', null, T); st.ris.goals.onde++; st.ris.morale = clamp(st.ris.morale + 3, 0, 100); st.ris.marks = (st.ris.marks || []).concat([{ x: n.x, y: n.y, t: st.t }]).slice(-40); return { ok: true, msg: e.seen ? `L'onda c'è, a ${s.place}. Ma mi hanno visto.` : `L'onda è sul muro, a ${s.place}.` }; },
    volantini(st, n, T, s) { let k = 0; while (k < 10 && useOne(st, n, 'volantini')) k++; if (k < 10) return { ok: false, msg: 'Non c\'erano abbastanza volantini.' }; const e = riskEvent(st, n, 'volantino', null, T); st.ris.morale = clamp(st.ris.morale + 5, 0, 100); return { ok: true, msg: e.seen ? 'Volantini lasciati, ma c\'era gente che guardava.' : `Volantini lasciati a ${s.place}.` }; },
    sabota(st, n, T, s) { const kit = useOne(st, n, 'kit'); if (!kit && !useOne(st, n, 'attrezzi')) return { ok: false, msg: 'Senza attrezzi non si fa niente.' }; const r = doSabotage(st, s.target, n, kit); return { ok: true, msg: r }; },
    libera(st, n, T, s) {
      const tn = byId(st, s.who); if (!tn || !(tn.jailedUntil > st.t)) return { ok: true, msg: 'In cella non c\'era più.' };
      const doc = useOne(st, n, 'documenti'), p = clamp((doc ? .75 : .3) + n.tr.cor * .2 - reprLevel(st) * .08, .05, .95);
      if (st.rng() < p) { tn.jailedUntil = 0; tn.inside = false; riskEvent(st, n, 'liberazione'); st.ris.morale = clamp(st.ris.morale + 6, 0, 100); return { ok: true, msg: `${tn.first} è fuori. ${doc ? 'Il lasciapassare ha funzionato.' : 'È andata di fortuna.'}` }; }
      jailMember(st, n, 'tentata evasione'); return { ok: false, msg: 'Mi hanno preso.' };
    },
    recruit(st, n, T, s) {
      const tn = byId(st, s.who); if (!tn || tn.dead) return { ok: false, msg: 'Non l\'ho trovato.' };
      initNpc(st, tn); const c = card(tn);
      if (c.antag || c.informer) { st.ris.repr = clamp(st.ris.repr + 15, 0, 100); st.ris.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo + .3, 0, 1); }); n.ris.loyalty -= .1; return { ok: false, msg: `Ho parlato con ${tn.first}. Ho sbagliato persona: adesso lo sanno anche gli Orecchi.` }; }
      if (c.never && c.never.includes('unisciti')) return { ok: false, msg: `${tn.first} non ne vuole sapere.` };
      const ch = tn.ris.ideo * .6 + (st.ris.morale / 200) + (tn.ris.missionDone ? .3 : 0) + n.ris.loyalty * .15 - .35;
      if (st.rng() < ch) { if (join(st, tn, `reclutato da ${battle(n) || n.first}`) === false) return { ok: false, msg: `${tn.first} ci sta, ma siamo già al completo: può darci una mano da fuori.` }; return { ok: true, msg: `${tn.first} è dei nostri.` }; }   // [fazioni]
      tn.ris.bond += .05; return { ok: false, msg: `${tn.first} ci pensa. Non ancora.` };
    },
    occupy(st, n, T, s) { const b = occupySpace(st, s.space); return b ? { ok: true, msg: `${b.name} adesso è nostra.` } : { ok: false, msg: 'Lo spazio non è più libero.' }; },
    startSite(st, n, T, s) { const e = startSite(st, s.lot, s.struct); return e ? { ok: false, msg: e } : { ok: true, msg: `Cantiere aperto: ${STRUCTS[s.struct].name}.` }; },
    eat(st, n, T, s) {
      if (s.base) { const b = st.ris.bases.find(k => k.id === s.base); if (!b || !takeRes(st, 'viveri', 1, b)) return { ok: false, msg: 'In base il cibo era finito.' }; }
      else { if (st.ris.cassa < 3) return { ok: false, msg: 'Nella cassa non c\'era nemmeno per un panino.' }; st.ris.cassa -= 3; if (EXT.spendAt) EXT.spendAt(st, 'bar', 3); }
      n.ris.fame = 0; n.ris.fatigue = clamp(n.ris.fatigue - .05, 0, 1); say(st, n, ['Si mangia.', 'Finalmente.', 'Buono, oggi.'][Math.floor(st.rng() * 3)]); return { ok: true };
    },
    drink(st, n) { if (st.ris.cassa < 2) return { ok: false, msg: 'Niente soldi per bere.' }; st.ris.cassa -= 2; if (EXT.spendAt) EXT.spendAt(st, 'osteria', 2); n.ris.sete = 0; say(st, n, 'Alla salute. Della Risacca.'); return { ok: true }; },
    picklock(st, n, T, s) {
      const S = st.ris.spaces[s.space]; if (!S || !S.locked) return { ok: true };
      const p = clamp(.55 + n.tr.cor * .2 + (n.id === 'beppe' ? .2 : 0), .1, .95);
      if (st.rng() > .7) useOne(st, n, 'attrezzi');
      if (st.rng() < p) { S.locked = false; discover(st, s.space); riskEvent(st, n, 'scasso', null, T); return { ok: true, msg: `Lucchetto saltato: ${SPACES.find(k => k.id === s.space).name} è aperto.` }; }
      return { ok: false, msg: 'Il lucchetto non cede. Ci vuole più mano.' };
    },
    burgle(st, n, T, s) {
      if (!G.isNight(st)) return { ok: false, msg: 'C\'era ancora gente, troppo presto.' };
      const k = st.ris.burgled = st.ris.burgled || {}; if (st.t - (k[s.shop] || -9999) < 24 * 60) return { ok: false, msg: 'Lì ci siamo già stati: hanno messo le sbarre.' };
      k[s.shop] = st.t; let gain = Math.round(40 + st.rng() * 50 + n.tr.avid * 10); if (EXT.takeTill) gain = Math.round(EXT.takeTill(st, s.shop, gain)); payCassa(st, gain); putAnywhere(st, 'merce', 1, n);
      const e = riskEvent(st, n, 'scasso', { shop: PLACES[s.shop].name }, T);
      return { ok: true, msg: `${PLACES[s.shop].name}: +${gain}.000 lire e una cassa di merce${e.seen ? '. Ma qualcuno ha visto.' : '.'}` };
    },
    throw(st, n, T, s) {
      st.ris.cams[s.cam] = st.t + 12 * 60; const e = riskEvent(st, n, 'telecamera', null, T); st.ris.morale = clamp(st.ris.morale + 2, 0, 100);
      return { ok: true, msg: `Telecamera di ${PLACES[CAMS.find(c => c.id === s.cam).place].name} accecata${e.seen ? ', ma mi hanno visto tirare' : ''}.` };
    },
    photo(st, n, T, s) {
      const tn = byId(st, s.who); if (!tn) return { ok: false, msg: 'Sparito.' };
      n.ris.carry.prove = (n.ris.carry.prove || 0) + 1; n.ris.photoOf = (n.ris.photoOf || []).concat([tn.id]); st.ris.photos = Object.assign(st.ris.photos || {}, { [tn.id]: true });
      if (tn.cop || card(tn).antag) { if (st.rng() < .25 + reprLevel(st) * .05) { riskEvent(st, n, 'foto', null, T); return { ok: true, msg: `Ho le foto di ${tn.first}. Credo mi abbia notato.` }; } }
      return { ok: true, msg: `Ho le foto di ${tn.first}. Roba che scotta.` };
    },
    blackmail(st, n, T, s) {
      const tn = byId(st, s.who); if (!tn) return { ok: false, msg: 'Sparito.' };
      if (!(st.ris.photos || {})[tn.id]) return { ok: false, msg: `Non abbiamo foto di ${tn.first}: serve prima fotografarlo.` };
      if (!useOne(st, n, 'prove')) return { ok: false, msg: 'Le foto non ci sono più.' };
      if (tn.id === 'vasco' || tn.id === 'pardo') { st.ris.repr = clamp(st.ris.repr + 12, 0, 100); return { ok: false, msg: `${tn.first} ha riso. Adesso ci cercano più di prima.` }; }
      st.ris.silenced[tn.id] = true; tn.mem.forEach(m => { m.silenced = true; });
      if (tn.cop) { st.ris.mole = tn.id; return { ok: true, msg: `${tn.first} ora lavora per noi: ci avviserà delle perquisizioni.` }; }
      return { ok: true, msg: `${tn.first} terrà la bocca chiusa${card(tn).informer ? ': un Orecchio in meno' : ''}.` };
    },
    summon(st, n, T, s) {
      const tn = byId(st, s.who); if (!tn || tn.dead || tn.jailedUntil > st.t) return { ok: false, msg: 'Non risponde al telefono.' };
      initNpc(st, tn); G.opinions(st, tn);
      if (!tn.ris.member && tn.op.trust + tn.ris.bond < .05 && !card(tn).antag) return { ok: false, msg: `${tn.first} ha riattaccato: non si fida.` };
      tn.ris.task = { id: st.ris.nextTask++, verb: 'aspetta', args: {}, steps: [{ k: 'go', x: s.x, y: s.y, name: s.name }, { k: 'hold', mins: 120 }], i: 0, started: st.t, desc: `appuntamento a ${s.name}`, src: 'convoca', acc: 0, stepT: st.t, quiet: true };
      tn.inside = false; tn.path = []; tn.goalPlace = null;
      if (card(tn).antag) st.ris.repr = clamp(st.ris.repr + 4, 0, 100);
      return { ok: true, msg: `${tn.first} viene a ${s.name}.` };
    },
    dig(st, n) {
      const b = makeBase(st, { name: `Buca nascosta (${G.nearestPlace(n.x, n.y).name})`, kind: 'buca', ref: null, x: n.x, y: n.y, slots: 0, stealth: .95 });
      return { ok: true, msg: `${b.name}: ci stanno 12 casse, e non la trova nessuno.` };
    },
    nail(st, n, T, s) { const b = st.ris.bases.find(k => k.id === s.base && k.alive); if (!b) return { ok: false, msg: 'La base non c\'è più.' }; let k = 0; while (k < 3 && useOne(st, n, 'materiali')) k++; if (k < 3) return { ok: false, msg: 'Le assi non bastavano.' }; b.barricade = Math.min(3, b.barricade + 1); b.expo = clamp(b.expo + .02, 0, 1); return { ok: true, msg: `Assi inchiodate: ${b.name} regge meglio (${b.barricade}/3).` }; },
    furnish(st, n, T, s) { const b = st.ris.bases.find(k => k.id === s.base && k.alive); if (!b) return { ok: false, msg: 'La base non c\'è più.' }; let k = 0; while (k < 2 && useOne(st, n, 'mobili')) k++; if (k < 2) return { ok: false, msg: 'I mobili non bastavano.' }; b.comfort = Math.min(3, b.comfort + 1); members(st).forEach(m => { m.ris.loyalty = clamp(m.ris.loyalty + .02, 0, 1); }); return { ok: true, msg: `${b.name} adesso sembra una casa (${b.comfort}/3).` }; },
    mural(st, n, T, s) { let k = 0; while (k < 2 && useOne(st, n, 'vernice')) k++; if (k < 2) return { ok: false, msg: 'Vernice finita a metà.' }; const e = riskEvent(st, n, 'murale', null, T); st.ris.morale = clamp(st.ris.morale + 6, 0, 100); st.ris.goals.onde++; st.ris.murals.push({ x: n.x, y: n.y, t: st.t }); return { ok: true, msg: `Il murale c'è, a ${s.place}${e.seen ? '. Mi hanno visto dipingere.' : '. Grande, colorato, si vede da lontano.'}` }; },
    beat(st, n, T, s) {
      const tn = byId(st, s.who); if (!tn || tn.dead) return { ok: false, msg: 'Sparito.' };
      tn.hp -= 18; tn.stun = 1.6; tn.hitT = st.clock; tn.panic = 4; tn.fleeFrom = { x: n.x, y: n.y }; n.gesture = 1.5; say(st, n, 'Questa è da parte della Risacca.');
      riskEvent(st, n, 'aggressione', { target: tn.id }, T); st.ris.morale = clamp(st.ris.morale - 2, 0, 100);
      if (card(tn).informer) { st.ris.silenced[tn.id] = st.t + 24 * 60; return { ok: true, msg: `${tn.first} ha capito la lezione. Per un po' non parlerà.` }; }
      return { ok: true, msg: `Lezione data a ${tn.first}.` };
    },
    install(st, n, T, s) { const b = st.ris.bases.find(k => k.id === s.base); const e = b ? install(st, b, s.mod) : 'La base non c\'è più.'; return e ? { ok: false, msg: e } : { ok: true, msg: `${MODULES[s.mod].name} montata in ${b.name}.` }; },
  };

  function doSabotage(st, id, n, kit) {
    const tg = TARGETS[id], R = st.ris, at20 = hourNow(st) === 20;
    const actor = n ? 'm' : 'p';
    const e = n ? riskEvent(st, n, 'sabotaggio', { shop: tg.name }, n.ris.task) : playerRiskEvent(st, 'sabotaggio', { shop: tg.name });
    R.morale = clamp(R.morale + 8 + (kit ? 2 : 0), 0, 100);
    G.addLog(st, `${G.clockStr(st.t)} · Sabotaggio: ${tg.name}${n ? ` (${battle(n) || n.first})` : ''}.`, 'good', e.ev.id);
    if (id === 'ripetitore') {
      R.ripetitore.brokenUntil = st.t + 6 * 60;
      if (at20) { R.goals.ripetitore = true; R.morale = clamp(R.morale + 15, 0, 100); G.feed(st, 'Il Garante si spegne a metà frase. Tutta l\'isola guarda gli schermi neri.', 'good'); st.moments.push({ kind: 'risacca', text: 'Gli schermi restano neri', sub: 'Il ripetitore della Tutela è saltato durante il discorso delle 20', until: st.clock + 3 }); }
      else G.feed(st, 'Il ripetitore è fuori uso. Stasera alle 20 il Garante non parlerà… se non lo riparano.', 'good');
    }
    void actor;
    return `${cap1(tg.name)}: fatto${e.seen ? ', ma qualcuno ha visto' : ''}.`;
  }

  // ---------------- BASI, SPAZI, CANTIERI ----------------
  function discover(st, spId, how) {
    const S = st.ris.spaces[spId]; if (!S || S.found) return false;
    S.found = true; const sp = SPACES.find(k => k.id === spId);
    G.feed(st, `Spazio trovato: ${sp.name}${how ? ' — ' + how : ''}.`, 'good');
    G.addLog(st, `${G.clockStr(st.t)} · Hai trovato uno spazio vuoto: ${sp.name}.`, 'good');
    return true;
  }
  function makeBase(st, o) {
    const b = Object.assign({ id: 'b' + st.ris.nextBase++, modules: [], stock: {}, expo: .05, alive: true, since: st.t, barricade: 0, comfort: 0 }, o);
    st.ris.bases.push(b);
    if (st.ris.bases.filter(k => k.alive).length === 1) G.feed(st, 'Prima base della Risacca. Obiettivo: fai l\'onda tre volte.', 'job');
    return b;
  }
  function occupySpace(st, spId) {
    const S = st.ris.spaces[spId], sp = SPACES.find(k => k.id === spId); if (!S || S.base) return null;
    S.found = true;
    const b = makeBase(st, { name: sp.name, kind: 'spazio', ref: spId, x: S.x, y: S.y, slots: sp.slots, stealth: sp.stealth });
    S.base = b.id;
    G.addLog(st, `${G.clockStr(st.t)} · La Risacca ha occupato ${sp.name}.`, 'good');
    return b;
  }
  function canStartSite(st, lotId, sid) {
    const lot = LOTS.find(l => l.id === lotId), S = STRUCTS[sid];
    if (!lot || !S) return 'Lotto o struttura sconosciuti.';
    if (lot.antennaOnly && sid !== 'antenna') return 'Lassù ci sta solo un\'antenna.';
    if (st.ris.sites.some(s => s.lot === lotId) || st.ris.bases.some(b => b.alive && b.ref === lotId)) return 'Su quel lotto c\'è già qualcosa.';
    if (st.ris.cassa < S.cost) return `Servono ${S.cost}.000 lire nella cassa.`;
    if (totalRes(st, 'materiali') < S.mat) return `Servono ${S.mat} materiali.`;
    if (S.radio && totalRes(st, 'radio') < S.radio) return `Servono ${S.radio} parti radio.`;
    for (let y = lot.ty; y < lot.ty + lot.h; y++) for (let x = lot.tx; x < lot.tx + lot.w; x++) if (!G.walkT(x, y)) return 'Il terreno non è libero.';
    return null;
  }
  function startSite(st, lotId, sid) {
    const e = canStartSite(st, lotId, sid); if (e) return e;
    const S = STRUCTS[sid]; st.ris.cassa -= S.cost; if (EXT.spendAt) EXT.spendAt(st, 'use:ferramenta', S.cost); takeRes(st, 'materiali', S.mat); if (S.radio) takeRes(st, 'radio', S.radio);
    st.ris.sites.push({ id: 's' + st.t.toFixed(0) + lotId, lot: lotId, struct: sid, progress: 0, hours: S.hours, done: false, since: st.t });
    G.feed(st, `Cantiere aperto: ${S.name} a ${LOTS.find(l => l.id === lotId).name}. Servono ${S.hours} ore di lavoro.`, 'job');
    return null;
  }
  function finishSite(st, site) {
    site.done = true;
    const lot = LOTS.find(l => l.id === site.lot), S = STRUCTS[site.struct], c = lotCenter(lot);
    for (let y = lot.ty; y < lot.ty + lot.h; y++) for (let x = lot.tx; x < lot.tx + lot.w; x++) G.setTile(x, y, G.T.BLD);
    // l'ingresso: la casella libera più vicina sotto la struttura
    let ent = null, bd = 1e9;
    for (let y = lot.ty - 1; y <= lot.ty + lot.h; y++) for (let x = lot.tx - 1; x <= lot.tx + lot.w; x++) { if (!G.walkT(x, y)) continue; const q = tileC(x, y), d = dist(q.x, q.y, c.x, c.y + 1); if (d < bd) { bd = d; ent = q; } }
    ent = ent || c;
    const b = makeBase(st, { name: `${S.name} ${lot.name.toLowerCase().startsWith('punta') ? 'della ' : 'a '}${lot.name}`, kind: 'costruito', ref: lot.id, struct: site.struct, x: ent.x, y: ent.y, cx: c.x, cy: c.y, slots: S.slots, stealth: lot.stealth + S.stealth, only: S.only || null });
    if (S.only === 'radio') b.modules.push('radio');
    // chi si trovava sopra la struttura viene spostato fuori
    [st.player].concat(st.npcs).forEach(o => { if (!G.walkM(o.x, o.y)) { o.x = ent.x; o.y = ent.y; o.path = o.path ? [] : o.path; } });
    G.feed(st, `${S.name} finita: ${b.name}.`, 'good');
    G.addLog(st, `${G.clockStr(st.t)} · La Risacca ha costruito ${b.name}.`, 'good');
    return b;
  }
  function canInstall(st, b, m) {
    const M = MODULES[m]; if (!M) return 'Modulo sconosciuto.';
    if (b.only && m !== b.only) return `${b.name} può avere solo la ${MODULES[b.only].name.toLowerCase()}.`;
    if (b.modules.length >= b.slots) return `${b.name} non ha più posto (${b.slots} moduli).`;
    if (m !== 'deposito' && b.modules.includes(m)) return `${b.name} ha già ${M.name.toLowerCase()}.`;
    if (st.ris.cassa < M.cost) return `Servono ${M.cost}.000 lire nella cassa.`;
    if (totalRes(st, 'materiali') < M.mat) return `Servono ${M.mat} materiali.`;
    return null;
  }
  function install(st, b, m) {
    const e = canInstall(st, b, m); if (e) return e;
    const M = MODULES[m]; st.ris.cassa -= M.cost; if (EXT.spendAt) EXT.spendAt(st, 'use:ferramenta', M.cost); if (M.mat) takeRes(st, 'materiali', M.mat);
    b.modules.push(m); b.expo = clamp(b.expo + .05, 0, 1);
    G.feed(st, `${M.name} montata in ${b.name}.`, 'good');
    return null;
  }
  function closeBase(st, b, why) {
    b.alive = false; const S = st.ris.spaces[b.ref]; if (S) S.base = null;
    G.addLog(st, `${G.clockStr(st.t)} · ${b.name} è perduta: ${why}.`, 'bad');
  }

  // ---------------- SQUADRA ----------------
  function join(st, n, how) {
    const r = initNpc(st, n); if (r.member) return true;
    if (EXT.canJoin) { const e = EXT.canJoin(st, n); if (e) { G.feed(st, e, 'bad'); return false; } }   // [fazioni] tetto dei membri
    r.member = true; r.loyalty = clamp(.5 + r.ideo * .3 + (r.missionDone ? .1 : 0), 0, 1); r.joinedAt = st.t;
    r.task = null; n.goalPlace = null;
    G.feed(st, `${n.first} entra nella Risacca${battle(n) ? ` come «${battle(n)}»` : ''}.`, 'good');
    G.addLog(st, `${G.clockStr(st.t)} · ${n.name} è entrato nella Risacca (${how || 'convinto da te'}).`, 'good');
    st.ris.morale = clamp(st.ris.morale + 2, 0, 100);
    if (members(st).length === 2) G.feed(st, 'Due membri. Obiettivo: apri una base (occupa uno spazio vuoto o costruisci).', 'job');
    EXT.onJoin.forEach(f => f(st, n, how));   // [fazioni]
    return true;
  }
  function leave(st, n, why) {
    const r = n.ris; if (!r || !r.member) return;
    r.member = false; r.task = null; n.action.name = 'routine'; n.goalPlace = null;
    G.feed(st, `${n.first} lascia la Risacca${why ? ': ' + why : ''}.`, 'bad');
    G.addLog(st, `${G.clockStr(st.t)} · ${n.name} ha lasciato la Risacca.`, 'bad');
  }
  function jailMember(st, n, why) {
    n.jailedUntil = st.t + 240; n.inside = true; n.path = []; if (n.ris) n.ris.task = null;
    G.addLog(st, `${G.clockStr(st.t)} · I Grigi hanno preso ${n.name}: ${why}.`, 'bad');
    onJailed(st, n);
  }
  function onJailed(st, n) {
    if (!n.ris || !n.ris.member) return;
    n.ris.task = null;
    st.ris.morale = clamp(st.ris.morale - 5, 0, 100);
    G.feed(st, `${battle(n) || n.first} è in cella. Ha 4 ore per non parlare.`, 'bad');
    st.timers.push({ at: st.t + 60, kind: 'risTalk', npc: n.id });
    members(st).forEach(m => { if (m !== n) m.ris.loyalty = clamp(m.ris.loyalty - .03, 0, 1); });
  }

  function assign(st, n, verb, args, src) {
    const p = plan(st, n, verb, args);
    if (p.err) return { ok: false, msg: p.err };
    if (verb === 'basta') { n.ris.task = null; return { ok: true, msg: 'Smette e torna alle sue cose.' }; }
    const A = args || {}, sneak = !!(A.furtivo || A.striscia || A.di_nascosto), run = !!(A.corri || A.di_corsa);
    if (run) p.steps.forEach(q => { if (q.k === 'go') q.run = true; });
    n.ris.task = { id: st.ris.nextTask++, verb, args: A, steps: p.steps, i: 0, started: st.t, desc: p.desc + (sneak ? ', di nascosto' : '') + (run ? ', di corsa' : ''), src: src || 'chat', acc: 0, stepT: st.t, sneak };
    n.path = []; n.goalPlace = null; n.wait = 0;
    if (n.inside && !(p.steps[0] && (p.steps[0].k === 'inside' || p.steps[0].k === 'sleep'))) n.inside = false;
    return { ok: true, msg: cap1(p.desc) + '.' };
  }
  // un ordine dato dal pannello o dalla chat: passa per la volontà
  function order(st, n, verb, args, opts) {
    opts = opts || {};
    if (!VERBS[verb]) return { ok: false, verdict: 'rifiuta', msg: 'Azione sconosciuta.' };
    initNpc(st, n);
    if (n.dead) return { ok: false, msg: `${n.first} è morto.` };
    if (n.jailedUntil > st.t) return { ok: false, msg: `${n.first} è in cella.` };
    if (VERBS[verb].night && !G.isNight(st)) return { ok: false, verdict: 'rifiuta', msg: 'Si fa solo di notte.' };
    const w = will(st, n, verb, args);
    if (!opts.force && w.verdict !== 'accetta') {
      return { ok: false, verdict: w.verdict, s: w.s, msg: w.verdict === 'contratta' ? `Ci sta pensando: ${w.why.join(', ') || 'vuole qualcosa in cambio'}.` : `Rifiuta: ${w.why.join(', ') || 'non se la sente'}.` };
    }
    // azioni immediate
    switch (verb) {
      case 'unisciti': if (n.ris.member) return { ok: true, msg: 'È già dei nostri.' }; if (join(st, n) === false) return { ok: false, verdict: 'contratta', msg: 'La Risacca è al completo: quindici. Può entrare come collaboratore di un membro.' }; return { ok: true, verdict: 'accetta', msg: `${n.first} entra nella Risacca.` };   // [fazioni]
      case 'lascia': leave(st, n); return { ok: true, msg: 'Ha lasciato la Risacca.' };
      case 'basta': n.ris.task = null; return { ok: true, msg: 'Torna alle sue cose.' };
      case 'racconta': return { ok: true, msg: '' };
      case 'linea': { const l = Object.keys(LINES).find(k => norm(args && args.linea).includes(k)) || 'equilibrio'; setLine(st, l, n); return { ok: true, msg: `Linea della banda: ${LINES[l]}.` }; }
      case 'autonomia': { const on = !/^(no|false|0|spento|off)/.test(norm(args && (args.attiva !== undefined ? String(args.attiva) : 'si'))); n.ris.auto = on; n.ris.autoAt = 0; return { ok: true, msg: on ? `${n.first} decide da solo quando non ha ordini.` : `${n.first} aspetta i tuoi ordini.` }; }
      case 'missione': return offerMission(st, n);
      case 'rivela_spazio': return revealSpace(st, n, args && args.spazio);
      case 'ricevi_soldi': {
        const q = clamp(Math.round((args && args.quanto) || 0), 0, 500); if (!q) return { ok: false, msg: 'Quanti soldi?' };
        if (st.player.money < q) return { ok: false, msg: 'Non hai tutti quei soldi.' };
        st.player.money -= q; if (n.pop) n.pop.money += q; n.ris.bond += clamp(q / 300, 0, .15); n.ris.pay = clamp(q / 60 * (.5 + n.tr.avid), 0, .5);
        if (n.ris.member) n.ris.loyalty = clamp(n.ris.loyalty + q / 400, 0, 1);
        st.sfx.push({ k: 'cash' }); return { ok: true, msg: `Ha preso ${q}.000 lire.`, keepPay: true };
      }
    }
    if (VERBS[verb].task && !n.ris.member && !opts.force) return { ok: false, msg: 'Non è della Risacca.' };
    const r = assign(st, n, verb, args, opts.src);
    return Object.assign({ verdict: 'accetta', s: w.s }, r);
  }
  function offerMission(st, n) {
    const c = card(n);
    if (!c.mission) return { ok: false, msg: 'Non ha favori da chiederti.' };
    if (n.ris.missionDone) return { ok: false, msg: 'Il favore gliel\'hai già fatto.' };
    if (st.ris.mission && st.ris.mission.giver !== n.id) return { ok: false, msg: `Prima finisci il favore per ${byId(st, st.ris.mission.giver).first}.` };
    const M = c.mission;
    st.ris.mission = { giver: n.id, title: M.title, stage: M.pickup ? 'pickup' : M.act ? 'act' : 'give', pickup: M.pickup, drop: M.drop, item: M.item, act: M.act, place: M.place, give: M.give, night: !!M.night, vehicle: !!M.vehicle };
    if (M.gift) for (const [k, v] of Object.entries(M.gift)) st.ris.inv[k] = (st.ris.inv[k] || 0) + v;
    G.feed(st, `Missione: ${M.title}`, 'job');
    return { ok: true, msg: M.ask };
  }
  function revealSpace(st, n, want) {
    const c = card(n); const known = (c.knows || []).filter(id => st.ris.spaces[id] && !st.ris.spaces[id].found);
    let id = want && resolveSpace(st, want) ? resolveSpace(st, want).id : null;
    if (id && !known.includes(id)) id = null;
    id = id || known[0];
    if (!id) return { ok: false, msg: 'Non conosce altri posti vuoti.' };
    discover(st, id, `te l'ha detto ${n.first}`);
    return { ok: true, msg: `Ti indica ${SPACES.find(s => s.id === id).name}.` };
  }

  // ---------------- MISSIONI ----------------
  function missionTarget(st) {
    const M = st.ris && st.ris.mission; if (!M) return null;
    const pl = M.stage === 'pickup' ? PLACES[M.pickup] : M.stage === 'act' ? PLACES[M.place] : PLACES[M.drop];
    if (!pl) return null;
    const label = M.stage === 'pickup' ? `${M.title}: prendi ${M.item} (${pl.name})${M.night ? ', di notte' : ''}` : M.stage === 'act' ? `${M.title}: sabota a ${pl.name}${G.isNight(st) ? '' : ' (meglio di notte)'}` : M.stage === 'give' ? `${M.title}: porta ${M.give.qty} ${RES[M.give.res].name} a ${pl.name}` : `${M.title}: consegna ${M.item} a ${pl.name}${M.vehicle ? ' (in Vespa)' : ''}`;
    return { x: pl.x, y: pl.y, label };
  }
  function updateMission(st) {
    const M = st.ris.mission, p = st.player; if (!M) return;
    const tg = missionTarget(st); if (!tg || dist(p.x, p.y, tg.x, tg.y) > (p.vehicle ? 3.8 : 2.6)) return;
    if (M.stage === 'pickup') {
      if (M.night && !G.isNight(st)) { if (!M.warned) { M.warned = true; G.feed(st, 'Di giorno qui c\'è troppa gente. Torna di notte.', 'bad'); } return; }
      M.stage = 'drop'; p.carrying = M.item; G.feed(st, `Hai preso ${M.item}.`, 'job'); st.sfx.push({ k: 'pickup' });
      if (M.pickup === 'commissariato' || M.pickup === 'magazzino') playerRiskEvent(st, 'furto_mat');
      return;
    }
    if (M.stage === 'drop') { if (M.vehicle && !p.vehicle) { if (!M.warned2) { M.warned2 = true; G.feed(st, 'La consegna va fatta in Vespa.', 'bad'); } return; } p.carrying = null; return completeMission(st); }
    if (M.stage === 'give') { if (totalRes(st, M.give.res) < M.give.qty) { if (!M.warned3) { M.warned3 = true; G.feed(st, `Servono ${M.give.qty} ${RES[M.give.res].name}: comprali all'Alimentari Wu.`, 'bad'); } return; } takeRes(st, M.give.res, M.give.qty); return completeMission(st); }
  }
  function completeMission(st) {
    const M = st.ris.mission, n = byId(st, M.giver); st.ris.mission = null; if (!n) return;
    n.ris.missionDone = true; n.ris.bond += .3; n.ris.ideo = clamp(n.ris.ideo + .05, 0, 1);
    st.ris.morale = clamp(st.ris.morale + 4, 0, 100);
    G.feed(st, `Missione compiuta: ${M.title}. ${n.first} ora si fida di te: parlaci.`, 'good');
    G.addLog(st, `${G.clockStr(st.t)} · Missione compiuta per ${n.name}: ${M.title}.`, 'good');
    st.sfx.push({ k: 'cash' });
    const ch = st.ris.chats[n.id] = st.ris.chats[n.id] || []; ch.push({ role: 'sys', text: `Missione compiuta: ${M.title}.`, t: st.t });
  }

  // ---------------- AZIONI DEL GIOCATORE (fuori dalla chat) ----------------
  function here(st) {
    const p = st.player, R = st.ris, out = []; if (!R || st.over || p.vehicle) return out;
    for (const [id, S] of Object.entries(R.spaces)) {
      if (dist(p.x, p.y, S.x, S.y) > 2.6) continue;
      const sp = SPACES.find(k => k.id === id);
      if (!S.found) out.push({ id: 'cerca', label: 'Guarda meglio questa porta', arg: id });
      else if (S.locked) out.push({ id: 'scassina', label: `Scassina il lucchetto${totalRes(st, 'attrezzi') ? '' : ' (servono attrezzi)'}`, arg: id, bad: true });
      else if (!S.base) { out.push({ id: 'occupa', label: `Occupa: ${sp.name}`, arg: id }); out.push({ id: 'rovista', label: 'Rovista (mobili, materiali)', arg: id }); }
    }
    const b = R.bases.find(k => k.alive && dist(p.x, p.y, k.x, k.y) < 2.8);
    if (b) {
      out.push({ id: 'base', label: `Apri ${b.name}`, arg: b.id });
      if (invCount(st)) out.push({ id: 'deposita', label: 'Deposita tutto', arg: b.id });
      if (b.modules.includes('infermeria') && p.hp < 100 && totalRes(st, 'medicine') > 0) out.push({ id: 'cura', label: 'Curati (1 medicina)', arg: b.id });
    }
    for (const lot of LOTS) { const c = lotCenter(lot); if (dist(p.x, p.y, c.x, c.y) < 3.2 && !R.sites.some(s => s.lot === lot.id) && !R.bases.some(k => k.alive && k.ref === lot.id)) out.push({ id: 'lotto', label: `Costruisci qui: ${lot.name}`, arg: lot.id }); }
    const site = R.sites.find(s => !s.done && dist(p.x, p.y, lotCenter(LOTS.find(l => l.id === s.lot)).x, lotCenter(LOTS.find(l => l.id === s.lot)).y) < 3.2);
    if (site) out.push({ id: 'lavora_cantiere', label: `Lavora al cantiere (${Math.floor(site.progress)}/${site.hours} ore)`, arg: site.id });
    const shop = Object.keys(SHOPS).find(id => PLACES[id] && dist(p.x, p.y, PLACES[id].x, PLACES[id].y) < 3.2);
    if (shop) out.push({ id: 'negozio', label: `Compra: ${PLACES[shop].name}`, arg: shop });
    for (const [id, tg] of Object.entries(TARGETS)) { const q = targetPos(tg); if (q && dist(p.x, p.y, q.x, q.y) < 3 && (totalRes(st, 'kit') + totalRes(st, 'attrezzi') > 0)) out.push({ id: 'sabota', label: `Sabota ${tg.name}`, arg: id, bad: true }); }
    if (b && b.kind !== 'buca') {
      if (totalRes(st, 'materiali') >= 3 && b.barricade < 3) out.push({ id: 'inchioda', label: `Inchioda assi (${b.barricade}/3)`, arg: b.id });
      if (totalRes(st, 'mobili') >= 2 && b.comfort < 3) out.push({ id: 'arreda', label: `Sistema i mobili (${b.comfort}/3)`, arg: b.id });
    }
    const food = EAT.concat(DRINK).filter((v, i, a) => a.indexOf(v) === i).find(id => PLACES[id] && dist(p.x, p.y, PLACES[id].x, PLACES[id].y) < 3.2);
    if (food) { if (EAT.includes(food)) out.push({ id: 'mangia', label: 'Mangia qualcosa (3.000)', arg: food }); if (DRINK.includes(food)) out.push({ id: 'bevi', label: 'Bevi qualcosa (2.000)', arg: food }); }
    const night = G.isNight(st) && (G.hour(st) >= 22 || G.hour(st) < 6);
    if (night && shop && shop !== 'ambulatorio' && shop !== 'biblioteca') out.push({ id: 'scasso', label: `Scassina ${PLACES[shop].name} (di notte)`, arg: shop, bad: true });
    const cam = CAMS.find(c => !(R.cams[c.id] > st.t) && dist(p.x, p.y, camPos(c).x, camPos(c).y) < 7); if (cam) out.push({ id: 'lancia', label: 'Tira un sasso alla telecamera', arg: cam.id, bad: true });
    if (totalRes(st, 'fotocamera') + totalRes(st, 'telefono') > 0) { const tn = st.npcs.find(k => !k.dead && !k.inside && (k.cop || card(k).antag) && dist(p.x, p.y, k.x, k.y) < 10 && G.los(p.x, p.y, k.x, k.y)); if (tn) out.push({ id: 'fotografa', label: `Fotografa ${tn.first}`, arg: tn.id }); }
    if (totalRes(st, 'attrezzi') > 0 && !b && ['pineta', 'punta', 'spiaggia', 'giardini'].some(id => dist(p.x, p.y, PLACES[id].x, PLACES[id].y) < 6)) out.push({ id: 'scava', label: 'Scava una buca nascosta (2 ore)' });
    if (totalRes(st, 'vernice') >= 2 && !b) out.push({ id: 'dipingi', label: 'Dipingi un murale (1 ora)', bad: true });
    if (PLACES.cantiere && dist(p.x, p.y, PLACES.cantiere.x, PLACES.cantiere.y) < 4) out.push({ id: 'rovista', label: 'Rovista nel cantiere', arg: 'cantiere' });
    if (totalRes(st, 'gesso') > 0 && !b) out.push({ id: 'onda', label: 'Scrivi l\'onda sul muro', bad: true });
    if (totalRes(st, 'volantini') >= 10 && !b) out.push({ id: 'volantina', label: 'Lascia volantini', bad: true });
    return out;
  }
  function playerAct(st, id, arg, extra) {
    const p = st.player, R = st.ris;
    switch (id) {
      case 'cerca': { const sp = SPACES.find(k => k.id === arg); discover(st, arg, 'una porta murata a metà'); return { ok: true, msg: R.spaces[arg].locked ? `${sp.name}: c'è un lucchetto nuovo. Serve scassinarlo.` : `${sp.name}: vuoto, polvere, nessuno da anni.` }; }
      case 'scassina': { if (!totalRes(st, 'attrezzi')) return { ok: false, msg: 'Senza un attrezzo non si apre.' }; if (st.rng() > .7) takeRes(st, 'attrezzi', 1); if (st.rng() < .7) { R.spaces[arg].locked = false; playerRiskEvent(st, 'scasso'); return { ok: true, msg: 'Il lucchetto salta. Dentro è vuoto.' }; } return { ok: false, msg: 'Il lucchetto non cede. Riprova.' }; }
      case 'rovista': { st.t += 30; const k = st.rng() < .5 ? 'mobili' : 'materiali'; R.inv[k] = (R.inv[k] || 0) + 1; return { ok: true, msg: `Mezz'ora a rovistare: 1 ${RES[k].name}.` }; }
      case 'inchioda': { const b = R.bases.find(k => k.id === arg); if (!takeRes(st, 'materiali', 3)) return { ok: false, msg: 'Servono 3 materiali.' }; b.barricade = Math.min(3, b.barricade + 1); st.t += 30; return { ok: true, msg: `Assi inchiodate (${b.barricade}/3).` }; }
      case 'arreda': { const b = R.bases.find(k => k.id === arg); if (!takeRes(st, 'mobili', 2)) return { ok: false, msg: 'Servono 2 mobili.' }; b.comfort = Math.min(3, b.comfort + 1); st.t += 30; return { ok: true, msg: `Mobili spostati e sistemati (${b.comfort}/3).` }; }
      case 'mangia': case 'bevi': { const c = id === 'mangia' ? 3 : 2; if (p.money < c) return { ok: false, msg: 'Non hai soldi.' }; p.money -= c; if (EXT.spendAt) EXT.spendAt(st, arg, c); p.hp = Math.min(100, p.hp + (id === 'mangia' ? 30 : 15)); return { ok: true, msg: id === 'mangia' ? 'Un panino al volo. Va meglio.' : 'Un caffè corretto. Si riparte.' }; }
      case 'scasso': { const k = R.burgled = R.burgled || {}; if (st.t - (k[arg] || -9999) < 24 * 60) return { ok: false, msg: 'Hanno messo le sbarre.' }; if (!totalRes(st, 'attrezzi') && st.rng() < .5) return { ok: false, msg: 'A mani nude la serranda non si alza. Servono attrezzi.' }; k[arg] = st.t; let gain = Math.round(40 + st.rng() * 50); if (EXT.takeTill) gain = Math.round(EXT.takeTill(st, arg, gain)); p.money += gain; R.inv.merce = (R.inv.merce || 0) + 1; const e = playerRiskEvent(st, 'scasso', { shop: PLACES[arg].name }); st.sfx.push({ k: 'cash' }); return { ok: true, msg: `Dentro e fuori: +${gain}.000 e una cassa di merce${e.seen ? '. Qualcuno ha visto.' : '.'}` }; }
      case 'lancia': { R.cams[arg] = st.t + 12 * 60; const e = playerRiskEvent(st, 'telecamera'); R.morale = clamp(R.morale + 2, 0, 100); return { ok: true, msg: `Un sasso, un rumore di vetro: la telecamera è cieca${e.seen ? '. Ti hanno visto.' : '.'}` }; }
      case 'fotografa': { const tn = byId(st, arg); R.inv.prove = (R.inv.prove || 0) + 1; R.photos = Object.assign(R.photos || {}, { [arg]: true }); if (st.rng() < .3) { playerRiskEvent(st, 'foto'); return { ok: true, msg: `Clic. Hai le foto di ${tn.first}, ma si è girato.` }; } return { ok: true, msg: `Clic. Hai le foto di ${tn.first}.` }; }
      case 'scava': { st.t += 120; const b = makeBase(st, { name: `Buca nascosta (${G.nearestPlace(p.x, p.y).name})`, kind: 'buca', ref: null, x: p.x, y: p.y, slots: 0, stealth: .95 }); return { ok: true, msg: `Due ore di pala: ${b.name}. Ci stanno 12 casse.` }; }
      case 'dipingi': { takeRes(st, 'vernice', 2); st.t += 60; const e = playerRiskEvent(st, 'murale'); R.morale = clamp(R.morale + 6, 0, 100); R.goals.onde++; R.murals.push({ x: p.x, y: p.y, t: st.t }); return { ok: true, msg: `Un'ora di bombolette e pennelli: il murale c'è${e.seen ? '. Ti hanno visto.' : '.'}` }; }
      case 'occupa': { const b = occupySpace(st, arg); return b ? { ok: true, msg: `${b.name} è la tua base.` } : { ok: false, msg: 'Non si può.' }; }
      case 'deposita': { const b = R.bases.find(k => k.id === arg); let left = 0; for (const [k, v] of Object.entries(R.inv)) { const put = putBase(st, b, k, v); R.inv[k] -= put; if (!R.inv[k]) delete R.inv[k]; else left += R.inv[k]; } return { ok: true, msg: left ? 'Il deposito è pieno, una parte resta a te.' : `Tutto in ${b.name}.` }; }
      case 'preleva': { const b = R.bases.find(k => k.id === arg); const res = extra && extra.res, q = Math.min((extra && extra.q) || 1, (b.stock[res] || 0)); if (!q) return { ok: false, msg: 'Non c\'è.' }; b.stock[res] -= q; if (!b.stock[res]) delete b.stock[res]; R.inv[res] = (R.inv[res] || 0) + q; return { ok: true, msg: `Preso ${q} ${RES[res].name}.` }; }
      case 'cura': { if (!takeRes(st, 'medicine', 1)) return { ok: false, msg: 'Niente medicine.' }; p.hp = 100; return { ok: true, msg: 'Ti sei medicato.' }; }
      case 'compra': { const shop = extra.shop, res = extra.res, q = extra.q || 1, price = SHOPS[shop][res] * q; if (price > 0) { if (p.money < price) return { ok: false, msg: 'Non hai abbastanza soldi.' }; if (invCount(st) + q > 30) return { ok: false, msg: 'Non riesci a portare altro. Deposita in una base.' }; p.money -= price; if (EXT.spendAt) EXT.spendAt(st, shop, price); R.inv[res] = (R.inv[res] || 0) + q; st.sfx.push({ k: 'cash' }); return { ok: true, msg: `Comprato ${q} ${RES[res].name} (${price}.000).` }; } const have = Math.min(q, totalRes(st, res)); if (!have) return { ok: false, msg: 'Non hai niente da vendere.' }; takeRes(st, res, have); const gain = -SHOPS[shop][res] * have; if (EXT.takeTill) EXT.takeTill(st, shop, gain, true); payCassa(st, gain); st.sfx.push({ k: 'cash' }); return { ok: true, msg: `Venduto ${have} ${RES[res].name}: +${gain}.000.` }; }
      case 'lotto': { const e = startSite(st, arg, extra && extra.struct || 'baracca'); return e ? { ok: false, msg: e } : { ok: true, msg: 'Cantiere aperto. Lavoraci tu o manda qualcuno.' }; }
      case 'lavora_cantiere': { const s = R.sites.find(k => k.id === arg); if (!s) return { ok: false }; s.progress += 1; st.t += 60; if (s.progress >= s.hours) finishSite(st, s); return { ok: true, msg: `Un'ora di lavoro al cantiere (${Math.floor(Math.min(s.progress, s.hours))}/${s.hours}).` }; }
      case 'allestisci': { const b = R.bases.find(k => k.id === arg); const e = install(st, b, extra.mod); return e ? { ok: false, msg: e } : { ok: true, msg: `${MODULES[extra.mod].name} montata.` }; }
      case 'sabota': { const kit = takeRes(st, 'kit', 1); if (!kit && !takeRes(st, 'attrezzi', 1)) return { ok: false, msg: 'Servono attrezzi.' }; const msg = doSabotage(st, arg, null, kit); if (R.mission && R.mission.stage === 'act' && TARGETS[arg].place === R.mission.place) completeMission(st); return { ok: true, msg }; }
      case 'onda': { if (!takeRes(st, 'gesso', 1)) return { ok: false, msg: 'Niente gesso.' }; const e = playerRiskEvent(st, 'scritta'); R.goals.onde++; R.morale = clamp(R.morale + 3, 0, 100); R.marks = (R.marks || []).concat([{ x: p.x, y: p.y, t: st.t }]).slice(-40); return { ok: true, msg: e.seen ? 'L\'onda è sul muro. Qualcuno ti ha visto.' : 'Tre linee col gesso: l\'onda.' }; }
      case 'volantina': { for (let i = 0; i < 10; i++) takeRes(st, 'volantini', 1); const e = playerRiskEvent(st, 'volantino'); R.morale = clamp(R.morale + 5, 0, 100); return { ok: true, msg: e.seen ? 'Volantini sparsi. Ti hanno visto.' : 'Volantini sotto le porte e sulle panchine.' }; }
    }
    return { ok: false };
  }

  // ---------------- ESECUZIONE DEI COMPITI ----------------
  function stepPos(st, s) { return { x: s.x, y: s.y }; }
  function nextStep(st, n, T) { T.i++; T.stepT = st.t; T.acc = 0; n.path = []; n.goal = null; if (T.i >= T.steps.length) finishTask(st, n, true); }
  function finishTask(st, n, ok, msg) {
    const T = n.ris.task; if (!T) return;
    n.ris.task = null; n.action.name = 'routine'; n.goalPlace = null; n.path = [];
    if (T.quiet) return;
    if (ok) { n.ris.loyalty = clamp(n.ris.loyalty + .02, 0, 1); if (!['seguimi', 'aspetta', 'vai', 'mangia', 'bevi', 'dormi'].includes(T.verb) || msg) inbox(st, n, msg || T.report || `Fatto: ${T.desc}.`, 'good', T.src === 'autonomia'); }
    else { n.ris.loyalty = clamp(n.ris.loyalty - .04, 0, 1); inbox(st, n, msg || `Non ce l'ho fatta: ${T.desc}.`, 'bad'); }
  }
  function walkTo(n, x, y, dt, speed, st) {
    if (!n.path.length || !n.goal || dist(n.goal.x, n.goal.y, x, y) > 1.5) { G.goTo(n, x, y, 1.4); if (!n.path.length) { n.path = [{ x, y }]; n.goal = { x, y }; } }
    G.stepAlong(n, speed, dt);
    // incastrato (traffico, spigoli): dopo 40 minuti fermo passa oltre il punto che lo blocca, dopo tre volte arriva per un'altra strada
    if (st && n.ris) {
      const k = n.ris.stuck = n.ris.stuck || { x: n.x, y: n.y, t: st.t, n: 0 };
      if (dist(k.x, k.y, n.x, n.y) > 2) { k.x = n.x; k.y = n.y; k.t = st.t; }
      else if (st.t - k.t > 40) {
        k.n++; k.t = st.t;
        const w = k.n >= 3 ? { x, y } : n.path[0] || { x, y };
        if (G.walkM(w.x, w.y)) { n.x = w.x; n.y = w.y; } else { n.x = x; n.y = y; }
        n.path = []; n.goal = null; if (k.n >= 3) k.n = 0;
      }
    }
  }
  function runTask(st, n, dt) {
    const T = n.ris.task, s = T && T.steps[T.i]; if (!s) { finishTask(st, n, true); return; }
    const dmin = dt * MPS;
    switch (s.k) {
      case 'go': {
        if (dist(n.x, n.y, s.x, s.y) < 1.6) { nextStep(st, n, T); return; }
        walkTo(n, s.x, s.y, dt, s.run ? 3.6 : T.sneak ? 1.2 : 1.9, st);
        if (st.t - T.stepT > 480) finishTask(st, n, false, `Non riesco ad arrivare a ${s.name || 'destinazione'}.`);
        return;
      }
      case 'reach': case 'follow': {
        const p = st.player, d = dist(n.x, n.y, p.x, p.y);
        if (s.k === 'reach' && d < 2) { nextStep(st, n, T); return; }
        if (d > 2.2) walkTo(n, p.x, p.y, dt, d > 8 ? 4 : 2.6, st); else { n.speedNow = 0; n.face = Math.atan2(p.y - n.y, p.x - n.x); }
        return;
      }
      case 'meet': {
        const tn = byId(st, s.who); if (!tn || tn.dead) { finishTask(st, n, false, 'Non l\'ho trovato.'); return; }
        if (tn.inside) { const pl = PLACES[tn.goalPlace || tn.home] || PLACES[tn.home]; if (dist(n.x, n.y, pl.x, pl.y) < 2) { nextStep(st, n, T); return; } walkTo(n, pl.x, pl.y, dt, 2, st); return; }
        if (dist(n.x, n.y, tn.x, tn.y) < (s.keep || 1.8)) { if (!s.keep) tn.wait = Math.max(tn.wait, 3); tn.face = Math.atan2(n.y - tn.y, n.x - tn.x); nextStep(st, n, T); return; }
        walkTo(n, tn.x, tn.y, dt, 2.2, st);
        if (st.t - T.stepT > 300) finishTask(st, n, false, `${tn.first} non si fa trovare.`);
        return;
      }
      case 'hold': {
        n.speedNow = 0;
        if (s.guard) { const b = st.ris.bases.find(k => k.id === s.guard); if (!b || !b.alive) { finishTask(st, n, true); return; } }
        if (st.t - T.stepT >= s.mins) nextStep(st, n, T);
        return;
      }
      case 'inside': {
        const b = st.ris.bases.find(k => k.id === s.base); if (!b || !b.alive) { n.inside = false; finishTask(st, n, false, 'La base non c\'è più.'); return; }
        n.inside = true; n.x = b.x; n.y = b.y; n.speedNow = 0;
        n.ris.fatigue = clamp(n.ris.fatigue - dmin / 60 * (b.modules.includes('dormitorio') ? .3 : .12), 0, 1);
        return;
      }
      case 'sleep': {
        const b = s.base && st.ris.bases.find(k => k.id === s.base && k.alive);
        n.inside = true; n.speedNow = 0; if (b) { n.x = b.x; n.y = b.y; }
        n.ris.fatigue = clamp(n.ris.fatigue - dmin / 60 * (b ? .32 + b.comfort * .05 : .22), 0, 1);
        if (st.t - T.stepT >= s.hours * 60 || n.ris.fatigue <= 0) { n.inside = false; nextStep(st, n, T); }
        return;
      }
      case 'work': {
        n.speedNow = 0; T.acc = (T.acc || 0) + dmin;
        WORK[s.kind](st, n, T, s, dmin);
        if (n.ris.task !== T) return;
        n.ris.fatigue = clamp(n.ris.fatigue + dmin / 60 * (s.kind === 'sorveglia' ? .03 : .07), 0, 1);
        if (st.t - T.stepT >= s.hours * 60) { if (T.earned) T.report = `${cap1(T.desc)}: fatto. ${T.earned >= 1 ? `+${Math.floor(T.earned)}.000 lire nella cassa.` : T.earned <= -1 ? `Abbiamo perso ${Math.floor(-T.earned)}.000 lire.` : ''}`.trim(); nextStep(st, n, T); }
        else if (n.ris.fatigue >= 1) finishTask(st, n, true, `Sono a pezzi, mi fermo. ${T.earned >= 1 ? `+${Math.floor(T.earned)}.000 lire nella cassa.` : ''}`.trim());
        return;
      }
      case 'do': {
        const r = (DO[s.fn] || EXT.do[s.fn])(st, n, T, s) || { ok: true };   // [fazioni] EXT.do
        if (!r.ok) { finishTask(st, n, false, r.msg); return; }
        if (r.msg) T.report = r.msg;
        nextStep(st, n, T);
        return;
      }
    }
  }
  const earn = (st, T, amt, src, n) => { if (EXT.earnFrom && src) amt = EXT.earnFrom(st, n, T, amt, src); T.earned = (T.earned || 0) + amt; st.ris.cassa += amt; };   // [soldi] src: da chi arrivano (clienti, colletta, ditta:<posto>, pesce, fuori)
  const WORK = {
    attesa() {},
    ripara(st, n, T, s, dmin) { earn(st, T, (n.id === 'beppe' ? 12 : 6) * dmin / 60, 'clienti', n); },
    pesca(st, n, T, s, dmin) { earn(st, T, 3 * dmin / 60, 'pesce', n); T.fish = (T.fish || 0) + .7 * dmin / 60; while (T.fish >= 1) { T.fish--; putAnywhere(st, 'viveri', 1, n); } },
    rovista(st, n, T, s, dmin) { T.got = (T.got || 0) + 1.2 * dmin / 60; while (T.got >= 1) { T.got--; const k = st.rng() < .5 ? 'mobili' : 'materiali'; n.ris.carry[k] = (n.ris.carry[k] || 0) + 1; } },
    bisca(st, n, T, s, dmin) {
      if (!G.isNight(st)) { finishTask(st, n, true, `Si chiude, è giorno. ${T.earned >= 1 ? `+${Math.floor(T.earned)}.000 lire.` : T.earned <= -1 ? `Abbiamo perso ${Math.floor(-T.earned)}.000.` : ''}`); return; }
      earn(st, T, (st.rng() * 80 - 20 + n.tr.avid * 15) * dmin / 60, 'clienti', n); st.ris.repr = clamp(st.ris.repr + .8 * dmin / 60, 0, 100);
      if (st.rng() < .04 * (1 + reprLevel(st) * .3) * dmin / 60) jailMember(st, n, 'bisca clandestina');
    },
    documenti(st, n, T, s, dmin) {
      T.sold = (T.sold || 0) + dmin / 60;
      while (T.sold >= 1) { T.sold--; if (!takeRes(st, 'documenti', 1)) { finishTask(st, n, true, `Lasciapassare finiti. +${Math.floor(T.earned || 0)}.000 lire.`); return; } earn(st, T, 35, 'clienti', n); }
      if (st.rng() < .06 * (1 + reprLevel(st) * .3) * dmin / 60) jailMember(st, n, 'vendita di documenti falsi');
    },
    scava() {},
    mestiere(st, n, T, s, dmin) { earn(st, T, s.pay * dmin / 60, 'ditta:' + (CARDS[n.id] && CARDS[n.id].mestiere ? CARDS[n.id].mestiere.place : ''), n); },
    colletta(st, n, T, s, dmin) { earn(st, T, (2 + st.ris.morale / 7) * dmin / 60, 'colletta', n); st.ris.repr = clamp(st.ris.repr + .5 * dmin / 60, 0, 100); },
    contrabbando(st, n, T, s, dmin) {
      if (!G.isNight(st)) { finishTask(st, n, true, `Si fa giorno, rientro. ${T.earned >= 1 ? `+${Math.floor(T.earned)}.000 lire.` : ''}`); return; }
      earn(st, T, 40 * dmin / 60, 'fuori', n); T.merce = (T.merce || 0) + dmin / 60;
      while (T.merce >= 1) { T.merce--; putAnywhere(st, 'merce', 1, n); }
      st.ris.repr = clamp(st.ris.repr + 1.2 * dmin / 60, 0, 100);
      if (st.rng() < (.1 * (1 + reprLevel(st) * .3) - (totalRes(st, 'documenti') ? .05 : 0)) * dmin / 60) jailMember(st, n, 'contrabbando al pontile');
    },
    mercato(st, n, T, s, dmin) { T.sold = (T.sold || 0) + 2 * dmin / 60; while (T.sold >= 1) { T.sold--; if (!takeRes(st, 'merce', 1)) { finishTask(st, n, true, `Merce finita. +${Math.floor(T.earned || 0)}.000 lire.`); return; } earn(st, T, n.id === 'betamax' ? 20 : 15, 'clienti', n); } const b = nearestBase(st, n); if (b) b.expo = clamp(b.expo + .01 * dmin / 60, 0, 1); },
    recupera(st, n, T, s, dmin) { T.got = (T.got || 0) + 2 * dmin / 60; while (T.got >= 1) { T.got--; n.ris.carry.materiali = (n.ris.carry.materiali || 0) + 1; } if (!T.warned && st.rng() < .5 * dmin / 60) { T.warned = true; riskEvent(st, n, 'furto_mat'); } },
    sorveglia(st, n, T, s, dmin) {
      T.seen = T.seen || {}; st.npcs.forEach(k => { if (k !== n && !k.inside && !k.dead && dist(k.x, k.y, n.x, n.y) < 12) T.seen[k.id] = true; });
      if (Math.floor(T.acc / 60) > (T.reports || 0)) {
        T.reports = Math.floor(T.acc / 60); const ids = Object.keys(T.seen); T.seen = {};
        const cops = ids.filter(id => { const k = byId(st, id); return k && (k.cop || (CARDS[id] && CARDS[id].antag)); }).map(id => byId(st, id).first);
        inbox(st, n, `Da ${s.place}: ${ids.length} persone passate in un'ora.${cops.length ? ' Attenzione: ' + cops.join(', ') + '.' : ' Nessun Grigio.'}`, cops.length ? 'bad' : 'rumor');
      }
    },
    produci(st, n, T, s, dmin) {
      const b = st.ris.bases.find(k => k.id === s.base); if (!b || !b.alive) { finishTask(st, n, false, 'La base non c\'è più.'); return; }
      const L = LAB[s.mod]; T.prod = (T.prod || 0) + dmin / 60; b.expo = clamp(b.expo + .015 * dmin / 60, 0, 1);
      while (T.prod >= 1) {
        T.prod--;
        for (const [k, v] of Object.entries(L.in)) if ((b.stock[k] || 0) < v) { finishTask(st, n, true, `Finito ${RES[k].name} in ${b.name}: mi fermo.`); return; }
        const outN = Object.values(L.out).reduce((x, y) => x + y, 0), inN = Object.values(L.in).reduce((x, y) => x + y, 0);
        if (capacity(b) - used(b) + inN < outN) { finishTask(st, n, true, `${b.name} è piena: mi fermo.`); return; }
        for (const [k, v] of Object.entries(L.in)) { b.stock[k] -= v; if (!b.stock[k]) delete b.stock[k]; }
        for (const [k, v] of Object.entries(L.out)) { const put = putBase(st, b, k, v); if (put < v) { finishTask(st, n, true, `${b.name} è piena: mi fermo.`); return; } T.made = (T.made || 0) + put; }
        T.report = `${cap1(T.desc)}: prodotti ${T.made} ${RES[Object.keys(L.out)[0]].name}.`;
      }
    },
    costruisci(st, n, T, s, dmin) {
      const site = st.ris.sites.find(k => k.lot === s.lot && !k.done); if (!site) { finishTask(st, n, true, 'Il cantiere è finito.'); return; }
      site.progress += dmin / 60 * (1 - n.ris.fatigue * .5);
      if (site.progress >= site.hours) { const b = finishSite(st, site); finishTask(st, n, true, `Finito: ${b.name}.`); }
    },
    trasmetti(st, n, T, s, dmin) {
      const b = st.ris.bases.find(k => k.id === s.base); if (!b || !b.alive) { finishTask(st, n, false, 'La radio non c\'è più.'); return; }
      T.parts = (T.parts || 0) + dmin / 180; if (T.parts >= 1) { T.parts--; if (!takeRes(st, 'radio', 1, b)) { finishTask(st, n, true, 'Le valvole sono bruciate: servono parti radio.'); return; } }
      const k = n.id === 'vinile' ? 1.5 : 1;
      st.ris.morale = clamp(st.ris.morale + 5 * k * dmin / 60, 0, 100); st.ris.repr = clamp(st.ris.repr + 4 * dmin / 60, 0, 100); b.expo = clamp(b.expo + .04 * dmin / 60, 0, 1);
      if (!T.counted) { T.counted = true; st.ris.goals.trasmissioni++; G.feed(st, 'Radio Scirocco è in onda. In tutti i bar qualcuno abbassa il volume del Garante.', 'good'); }
      st.ris.onAir = st.t;
    },
  };

  // ---------------- LIBERO ARBITRIO ----------------
  // Senza ordini, ogni membro sceglie da sé: bisogni, carattere, gusti, quello che manca alla banda e la linea decisa insieme.
  function setLine(st, l, n) {
    st.ris.linea = l; members(st).forEach(m => { m.ris.autoAt = 0; });
    G.feed(st, `La Risacca si organizza: linea «${LINES[l]}»${n ? ` (con ${battle(n) || n.first})` : ''}.`, 'good');
    G.addLog(st, `${G.clockStr(st.t)} · Riunione della Risacca: linea ${LINES[l]}.`, 'good');
  }
  function candidates(st, n) {
    const R = st.ris, r = n.ris, c = card(n), rl = reprLevel(st), L = R.linea, night = G.isNight(st), h = G.hour(st);
    const out = [], add = (v, args, score, why) => { if (score > 0) out.push({ v, args: args || {}, score, why }); };
    const cassaNeed = clamp(1 - st.ris.cassa / 150, 0, 1), propNeed = clamp(1 - R.morale / 55, 0, 1);
    const k = { soldi: L === 'soldi' ? 1.7 : 1, prop: L === 'propaganda' ? 1.7 : 1, build: L === 'costruire' ? 1.7 : 1, safe: L === 'prudenza' ? 1.6 : 1, risky: L === 'prudenza' ? .35 : 1 };
    const legal = .45 + n.tr.legge * .35, shady = clamp((1 - n.tr.legge) * .7 + n.tr.avid * .35 - rl * .06, 0, 1.2) * k.risky;
    // bisogni
    if (r.fame > .55) add('mangia', {}, r.fame * 1.6, 'ha fame');
    if (r.sete > .5) add('bevi', {}, r.sete * 1.4, 'ha sete');
    if (r.fatigue > .65 || ((h >= 1 && h < 7) && r.fatigue > .25)) add('dormi', { ore: 6 }, r.fatigue * 1.3 + (h >= 1 && h < 7 ? .5 : 0), 'è stanco');
    // soldi
    if (c.mestiere) add('lavora', { ore: 4 }, cassaNeed * .9 * legal * k.soldi + (h >= 8 && h < 19 ? .15 : -.3), 'la cassa è vuota');
    add('colletta', { luogo: ['piazza', 'passeggiata', 'lungomare'][Math.floor(st.rng() * 3)], ore: 3 }, cassaNeed * (.3 + R.morale / 150) * k.soldi * (h >= 9 && h < 21 ? 1 : .2), 'serve una colletta');
    add('pesca', { ore: 3 }, cassaNeed * .35 * legal * k.soldi + (R.bases.length && RESlow(st, 'viveri', 3) ? .15 : 0), 'servono soldi e viveri');
    if (n.id === 'beppe') add('ripara', { ore: 4 }, cassaNeed * .9 * k.soldi, 'ripara per la gente');
    if (night) { add('contrabbando', { ore: 3 }, cassaNeed * .9 * shady * k.soldi, 'di notte al porto si guadagna'); add('bisca', { ore: 3 }, cassaNeed * .6 * shady * k.soldi, 'stanotte si gioca'); add('scasso', {}, cassaNeed * .55 * shady * k.soldi, 'un negozio chiuso fa gola'); }
    if (totalRes(st, 'merce') > 0) add('mercato', { ore: 3 }, .5 * shady * k.soldi, 'c\'è merce da vendere');
    if (totalRes(st, 'documenti') > 0) add('vendi_documenti', { ore: 3 }, .55 * shady * k.soldi, 'abbiamo lasciapassare da vendere');
    // propaganda
    if (totalRes(st, 'gesso') > 0) add('scrivi_onda', {}, propNeed * .55 * k.prop + r.ideo * .2, 'l\'isola deve vedere l\'onda');
    if (totalRes(st, 'vernice') >= 2) add('dipingi', {}, propNeed * .7 * k.prop + r.ideo * .2 - rl * .05, 'un murale si vede da lontano');
    if (totalRes(st, 'volantini') >= 10) add('volantina', {}, propNeed * .7 * k.prop + r.ideo * .15, 'i volantini sono pronti');
    if (R.bases.some(b => b.alive && b.modules.includes('radio')) && totalRes(st, 'radio') > 0) add('trasmetti', { ore: 2 }, propNeed * .6 * k.prop + (h === 19 ? .5 : 0) + (n.id === 'vinile' ? .3 : 0), 'Radio Scirocco deve parlare');
    add('diffondi_voce', {}, propNeed * .25 * k.prop, 'far girare la voce');
    if (rl >= 2 && CAMS.some(cm => !(R.cams[cm.id] > st.t))) add('lancia', {}, .1 * rl * k.prop * k.risky, 'troppe telecamere');
    // costruire e produrre
    if (R.sites.some(x => !x.done)) add('costruisci', { ore: 4 }, .55 * k.build, 'c\'è un cantiere aperto');
    const lab = R.bases.find(b => b.alive && b.modules.some(m => LAB[m] && Object.entries(LAB[m].in).every(([q, v]) => (b.stock[q] || 0) >= v)));
    if (lab) add('produci', { base: lab.id, ore: 4 }, .5 * k.build, 'il laboratorio ha da lavorare');
    if (RESlow(st, 'materiali', 8) && (R.sites.some(x => !x.done) || R.bases.length)) { add('rovista', {}, .3 * k.build, 'servono materiali'); add('recupera', {}, .3 * k.build * shady, 'servono materiali'); }
    const bare = R.bases.find(b => b.alive && b.kind !== 'buca' && b.comfort < 2); if (bare && totalRes(st, 'mobili') >= 2) add('arreda', { base: bare.id }, .3 * k.build, 'la base è spoglia');
    if (R.spaces && SPACES.some(x => R.spaces[x.id] && R.spaces[x.id].found && R.spaces[x.id].locked) && hasTool(st, n, 'attrezzi')) add('scassina', {}, .3 * k.build * k.risky, 'c\'è uno spazio chiuso da aprire');
    if (SPACES.some(x => R.spaces[x.id] && R.spaces[x.id].found && !R.spaces[x.id].locked && !R.spaces[x.id].base) && R.bases.filter(b => b.alive).length < 3) add('occupa', {}, .35 * k.build, 'uno spazio libero ci aspetta');
    // difesa
    if (R.raid) add('proteggi', { base: R.raid.base }, 1.3 * r.loyalty * (n.tr.cor + .3), 'arrivano i Grigi');
    const hot = R.bases.find(b => b.alive && b.expo > .45 && b.barricade < 3); if (hot && rl >= 2 && totalRes(st, 'materiali') >= 3) add('inchioda', { base: hot.id }, .45 * k.safe, 'la base è esposta');
    if (rl >= 2 && R.bases.length && !R.bases.some(b => b.alive && b.kind === 'buca') && hasTool(st, n, 'attrezzi')) add('scava', {}, .25 * k.safe, 'serve un nascondiglio');
    const jailed = members(st).find(m => m.jailedUntil > st.t && m !== n); if (jailed) add('libera', { persona: jailed.id }, .8 * r.loyalty * (n.tr.cor + .2) * k.risky, `${jailed.first} è in cella`);
    // informazioni
    add('sorveglia', { luogo: ['commissariato', 'miramare', 'piazza'][Math.floor(st.rng() * 3)], ore: 2 }, .12 + rl * .05 * k.safe, 'tenere d\'occhio i Grigi');
    if (hasTool(st, n, 'fotocamera') || hasTool(st, n, 'telefono')) { const tg = ['vasco', 'pardo', 'ferri', 'zia'].find(id => !(R.photos || {})[id]); if (tg) add('fotografa', { persona: tg }, .25, `servono foto di ${G.nameOf(st, tg)}`); }
    // la sua vita
    add('routine', {}, .32 + (c.mestiere && h >= 8 && h < 19 ? .1 : 0), 'le sue cose');
    out.forEach(o => { if (c.likes && c.likes.includes(o.v)) o.score += .2; if (c.never && c.never.includes(o.v)) o.score = -1; o.score += st.rng() * .15; });
    return out.filter(o => o.score > 0).sort((a, b) => b.score - a.score);
  }
  const RESlow = (st, res, q) => totalRes(st, res) < q;
  function autonomy(st, n) {
    const r = n.ris; r.autoAt = st.t + 30 + st.rng() * 20;
    for (const o of candidates(st, n).slice(0, 5)) {
      if (o.v === 'routine') { r.autoAt = st.t + 60; return null; }
      if (VERBS[o.v].night && !G.isNight(st)) continue;
      const w = will(st, n, o.v, o.args); if (w.s < .1 && !['mangia', 'bevi', 'dormi'].includes(o.v)) continue;
      const p = plan(st, n, o.v, o.args); if (p.err) continue;
      const res = assign(st, n, o.v, o.args, 'autonomia');
      if (res.ok) {
        const T = n.ris.task; T.why = o.why;
        if (!['mangia', 'bevi', 'dormi'].includes(o.v)) inbox(st, n, `Ho deciso: ${p.desc} (${o.why}).`, 'rumor', !VERBS[o.v].illegal && VERBS[o.v].risk < .3);
        return o;
      }
    }
    return null;
  }

  // ---------------- AGGANCI AL MOTORE ----------------
  function hookThink(st, n) {
    const R = st.ris; if (!R || !n.ris) return false;
    if (R.raid && R.raid.cop === n.id && R.raid.phase === 'andata') { n.inside = false; n.action = { name: 'perquisisce', scores: [], why: `Perquisizione a ${R.raid.name}.`, since: n.action.since }; return true; }
    const T = n.ris.task; if (!T) return false;
    if (n.panic > 0 || n.stun > 0 || G.hostile(st, n)) return false;
    const s = T.steps[T.i]; if (!(s && (s.k === 'inside' || s.k === 'sleep'))) n.inside = false;
    const was = n.action.name;
    n.action = { name: 'ordine', scores: [{ name: 'ordine', v: 1, why: T.desc }], why: `Compito della Risacca: ${T.desc}.`, since: was === 'ordine' ? n.action.since : st.clock };
    return true;
  }
  function hookMove(st, n, dt, a) {
    if (a === 'ordine' && n.ris && n.ris.task) { runTask(st, n, dt); return true; }
    if (a === 'perquisisce' && st.ris.raid) { const R = st.ris.raid; if (dist(n.x, n.y, R.x, R.y) > 2) walkTo(n, R.x, R.y, dt, 2.4); else n.speedNow = 0; return true; }
    return false;
  }
  function hookVerb(st, m) {
    switch (m.type) {
      case 'scritta': return 'ha scritto l\'onda della Risacca su un muro';
      case 'volantino': return 'ha lasciato volantini della Risacca';
      case 'sabotaggio': return `ha sabotato ${m.shop || 'un impianto della Tutela'}`;
      case 'furto_mat': return 'ha rubato materiali';
      case 'liberazione': return 'ha fatto evadere un prigioniero';
      case 'colletta': return 'raccoglieva soldi per la Risacca';
      case 'scasso': return 'è entrato di notte in un negozio';
      case 'telecamera': return 'ha preso a sassate una telecamera';
      case 'murale': return 'ha dipinto un murale della Risacca';
      case 'foto': return 'scattava foto ai Grigi';
    }
    return null;
  }
  function hookStep(st, dt) {
    const R = st.ris; if (!R) return;
    const dmin = Math.max(0, st.t - R.lastT); R.lastT = st.t;
    const h = dmin / 60;
    R.repr = clamp(R.repr - 1.5 * h, 0, 100);
    R.morale = clamp(R.morale - .15 * h, 0, 100);
    R.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo - .02 * h * (b.stealth || .5), 0, 1); });
    st.npcs.forEach(n => {
      const r = n.ris; if (!r) return;
      if (!r.task) r.fatigue = clamp(r.fatigue - .08 * h, 0, 1);
      if (!r.member) return;
      r.fame = clamp(r.fame + .045 * h, 0, 1); r.sete = clamp(r.sete + .07 * h, 0, 1);
      if (r.fame >= 1 || r.sete >= 1) { r.loyalty = clamp(r.loyalty - .01 * h, 0, 1); r.fatigue = clamp(r.fatigue + .02 * h, 0, 1); }
      if (r.auto && !st.ris.autoOff && !r.task && !n.dead && !(n.jailedUntil > st.t) && n.panic <= 0 && st.t >= (r.autoAt || 0)) autonomy(st, n);
    });
    // il carico portato in mano dai membri senza compito finisce nella base più vicina
    updateMission(st);
    // scoperta degli spazi: passandoci accanto di notte
    if (G.isNight(st) && !st.player.vehicle) for (const [id, S] of Object.entries(R.spaces)) if (!S.found && dist(st.player.x, st.player.y, S.x, S.y) < 2.2) discover(st, id, 'una porta murata a metà');
    // timer della Risacca
    st.timers = st.timers.filter(tm => {
      if (tm.kind !== 'risTalk' || st.t < tm.at) return true;
      const n = byId(st, tm.npc); if (!n || !n.ris) return false;
      if (n.jailedUntil > st.t && n.ris.loyalty < .45) {
        R.repr = clamp(R.repr + 10, 0, 100); R.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo + .35, 0, 1); });
        G.feed(st, `${battle(n) || n.first} ha parlato. I Grigi sanno delle nostre basi.`, 'bad'); G.addLog(st, `${G.clockStr(st.t)} · ${n.name} ha parlato sotto interrogatorio.`, 'bad');
        EXT.onTalk.forEach(f => f(st, n));   // [fazioni] chi parla tradisce anche i suoi collaboratori
        n.ris.loyalty = clamp(n.ris.loyalty - .2, 0, 1); if (n.ris.loyalty < .2) leave(st, n, 'non regge più');
      } else if (n.jailedUntil > st.t) { n.ris.loyalty = clamp(n.ris.loyalty + .05, 0, 1); G.feed(st, `${battle(n) || n.first} non ha detto una parola.`, 'good'); }
      return false;
    });
    // orologio: eventi a ogni ora
    const hm = Math.floor(st.t / 60);
    while (R.hourMark < hm) { R.hourMark++; onHour(st, R.hourMark % 24); }
    // perquisizione in corso
    if (R.raid && st.t >= R.raid.at) resolveRaid(st);
    checkGoals(st);
  }
  function onHour(st, hr) {
    const R = st.ris, rl = reprLevel(st);
    if (hr === 20) {
      if (st.t < R.ripetitore.brokenUntil) G.feed(st, 'Ore 20: gli schermi restano neri. Il Garante tace.', 'good');
      else if (R.onAir && st.t - R.onAir < 30) { R.morale = clamp(R.morale + 10, 0, 100); G.feed(st, 'Ore 20: al posto del Garante, in molti bar si sente Radio Scirocco.', 'good'); }
      else { G.feed(st, 'Ore 20: il Garante parla da tutti gli schermi. «L\'ordine è una carezza.»', 'radio'); R.morale = clamp(R.morale - 1, 0, 100); }
    }
    if (hr === 22 && rl >= 4) G.feed(st, 'Ora Quieta anticipata: coprifuoco su tutta l\'isola.', 'bad');
    // chi parla troppo
    members(st).forEach(n => { if (n.ris.loyalty < .45 && st.rng() < n.tr.loq * .08) { const b = R.bases.find(k => k.alive); if (b) { b.expo = clamp(b.expo + .15, 0, 1); G.feed(st, `Si dice in giro qualcosa su ${b.name}. Qualcuno ha la lingua lunga.`, 'rumor'); } } });
    // l'umore dell'isola sposta le idee
    st.npcs.forEach(n => { if (n.ris && !n.cop && !(CARDS[n.id] && CARDS[n.id].antag)) n.ris.ideo = clamp(n.ris.ideo + (R.morale - 30) / 4000, 0, 1); });
    // perquisizioni
    if (!R.raid && rl >= 3) {
      const b = R.bases.filter(k => k.alive && k.kind !== 'buca' && k.expo > .6).sort((a, c) => c.expo - a.expo)[0];
      if (b && st.rng() < .35 + (b.expo - .6)) {
        const cop = st.npcs.filter(k => k.cop && !k.dead).sort((a, c) => dist(a.x, a.y, b.x, b.y) - dist(c.x, c.y, b.x, b.y))[0];
        const lead = R.mole && byId(st, R.mole) && !byId(st, R.mole).dead ? 150 : 60;
        R.raid = { base: b.id, name: b.name, x: b.x, y: b.y, at: st.t + lead, phase: 'andata', cop: cop ? cop.id : null };
        G.feed(st, lead > 60 ? `${G.nameOf(st, R.mole)} ci avverte: perquisizione a ${b.name} fra due ore e mezza.` : `Gli Orecchi hanno parlato: perquisizione a ${b.name} fra un'ora. Difendila o svuotala.`, 'bad');
        G.addLog(st, `${G.clockStr(st.t)} · Annunciata perquisizione a ${b.name}.`, 'bad');
      }
    }
    // i cantieri non avanzano da soli; i ripetitori si riparano
    if (st.t >= R.ripetitore.brokenUntil && R.ripetitore.brokenUntil > 0 && !R.ripetitore.fixedNote) { R.ripetitore.fixedNote = true; G.feed(st, 'La Tutela ha riparato il ripetitore.', 'radio'); }
  }
  function resolveRaid(st) {
    const R = st.ris, raid = R.raid, b = R.bases.find(k => k.id === raid.base); R.raid = null;
    const cop = raid.cop && byId(st, raid.cop); if (cop) { cop.action.name = 'pattuglia'; cop.path = []; }
    if (!b || !b.alive) return;
    const guards = members(st).filter(n => n.ris.task && n.ris.task.steps[n.ris.task.i] && n.ris.task.steps[n.ris.task.i].guard === b.id && dist(n.x, n.y, b.x, b.y) < 4);
    const p = clamp(.15 + guards.length * .25 + (b.modules.includes('armeria') ? .3 : 0) + b.barricade * .12 + (b.stealth || .5) * .2 - reprLevel(st) * .05, .05, .95);
    if (st.rng() < p) {
      b.expo = .3; R.morale = clamp(R.morale + 4, 0, 100);
      G.feed(st, `Perquisizione a ${b.name}: i Grigi non hanno trovato niente${guards.length ? ` (${guards.map(g => battle(g) || g.first).join(', ')} di guardia)` : ''}.`, 'good');
    } else {
      const lost = Object.keys(b.stock).length; b.stock = {};
      closeBase(st, b, 'perquisita dai Grigi'); R.morale = clamp(R.morale - 6, 0, 100);
      st.npcs.forEach(n => { if (n.ris && n.ris.member && n.inside && n.ris.task && n.ris.task.steps[n.ris.task.i] && n.ris.task.steps[n.ris.task.i].base === b.id) jailMember(st, n, `nascosto in ${b.name}`); });
      guards.forEach(g => { if (st.rng() < .5) jailMember(st, g, `difendeva ${b.name}`); });
      G.feed(st, `I Grigi hanno preso ${b.name}${lost ? ' con tutte le scorte' : ''}.`, 'bad');
    }
  }
  function checkGoals(st) {
    const R = st.ris, g = R.goals; if (g.done) return;
    const status = goals(st);
    if (status.every(x => x.done)) {
      g.done = true; g.act = 2; R.morale = clamp(R.morale + 10, 0, 100);
      G.feed(st, 'Atto I compiuto: l\'isola ha sentito un\'altra voce. La Tutela risponderà.', 'good');
      G.addLog(st, `${G.clockStr(st.t)} · Fine dell'Atto I, «Bassa marea».`, 'good');
      st.moments.push({ kind: 'risacca', text: 'Fine dell\'Atto I', sub: 'Bassa marea', until: st.clock + 4 });
    }
  }
  function goals(st) {
    const R = st.ris, g = R.goals;
    return [
      { label: 'Recluta due membri', done: members(st).length >= 2, n: `${Math.min(2, members(st).length)}/2` },
      { label: 'Apri una base', done: R.bases.some(b => b.alive) || R.bases.length > 0, n: '' },
      { label: 'Fai l\'onda tre volte', done: g.onde >= 3, n: `${Math.min(3, g.onde)}/3` },
      { label: 'Metti in onda Radio Scirocco', done: g.trasmissioni >= 1, n: '' },
      { label: 'Sabota il ripetitore durante il discorso delle 20', done: g.ripetitore, n: '' },
    ];
  }
  function hookJailed(st, cop, tn) { if (tn.ris && tn.ris.member) onJailed(st, tn); }

  // ---------------- CHAT: prompt, interpretazione, ripiego ----------------
  function memLines(st, n) {
    return n.mem.slice().sort((a, b) => G.weight(st, b) - G.weight(st, a)).slice(0, 5).map(m => {
      const who = m.actor === 'player' ? G.PLAYER_NAME : m.actor === 'ignoto' ? 'qualcuno' : G.nameOf(st, m.actor);
      const how = m.source === 'visto' ? 'l\'ha visto' : m.source === 'sentito' ? 'ha sentito i rumori' : `gliel'ha detto ${(m.via || []).slice(-1)[0] || 'qualcuno'}`;
      return `${who} ${G.verbPast(st, m, n.id)} (${m.place}, ${how})`;
    });
  }
  function placeList() { return Object.values(PLACES).map(p => `${p.id}=${p.name}`).join('; '); }
  function chatRules(st, n) {
    const c = card(n), r = initNpc(st, n);
    const lines = [
      'Interpreti un personaggio in un videogioco ambientato a Porto Vecchio, isola del Tirreno sotto la Tutela: un regime orwelliano retro-futurista (il 2019 come lo immaginavano nel 1984). Il Garante parla ogni sera alle 20 dagli schermi; la Guardia Insulare («i Grigi») presidia le strade; gli Orecchi (informatori) ascoltano; chi parla troppo viene «rettificato». La Risacca è la resistenza segreta: cellule, nomi di battaglia, simbolo un\'onda col gesso. Di notte il lungomare è tutto neon.',
      `Il giocatore si chiama ${G.PLAYER_NAME} ed è della Risacca.`,
      '',
      `PERSONAGGIO: ${n.name}${battle(n) ? ` (nome di battaglia «${battle(n)}»)` : ''}. Ruolo: ${n.role}.`,
      `Chi è: ${c.bio}`,
      `Come parla: ${c.voice || 'normale'}.`,
      `Carattere: coraggio ${Math.round(n.tr.cor * 10)}/10, chiacchiere ${Math.round(n.tr.loq * 10)}/10, avidità ${Math.round(n.tr.avid * 10)}/10, rispetto delle regole ${Math.round(n.tr.legge * 10)}/10.`,
      c.antag ? 'È un nemico della Risacca. Non si unirà mai. Se il giocatore si scopre, lo userà contro di lui (con gentilezza o minaccia).' : '',
      c.informer ? 'Parla con gli Orecchi: tutto quello che sente può finire alla Tutela.' : '',
      c.secret ? `Segreto (non dirlo apertamente): ${c.secret}` : '',
      c.mission ? `Ha un favore da chiedere al giocatore prima di fidarsi del tutto: «${c.mission.title}». Usa il verbo "missione" per proporlo quando il giocatore chiede come aiutare o vuole reclutarlo.` : '',
      c.mestiere ? `Mestiere: lavora a ${PLACES[c.mestiere.place].name} (${c.mestiere.pay}.000 lire l'ora).` : '',
      EXT.cardExtra ? EXT.cardExtra(st, n) : '',   // [mestieri] cosa può fare col suo lavoro
      c.likes && c.likes.length ? `Fa volentieri: ${c.likes.join(', ')}. Non farà mai: ${(c.never || []).join(', ') || 'nulla di particolare'}.` : '',
      '',
      'COME RISPONDERE',
      '- Rispondi SOLO con un oggetto JSON: {"risposta": string, "umore": string, "azioni": [ {"verbo": string, ...argomenti} ], "persuasione": number, "memoria": string}.',
      '- "risposta": cosa dice il personaggio, in italiano, in carattere, 1-3 frasi, niente asterischi o didascalie. Mai parlare di giochi, IA, punteggi o regole.',
      '- "azioni": solo se il giocatore chiede qualcosa o se è naturale offrire qualcosa. Usa solo i verbi e gli id elencati sotto. Lista vuota se non fa niente.',
      '- Rispetta la VOLONTÀ calcolata qui sotto: se un\'azione è "rifiuta", il personaggio rifiuta (in carattere) e non la mette in "azioni"; se è "contratta", chiede soldi, garanzie o un favore e non la mette in "azioni" finché il giocatore non lo convince o paga. Se il giocatore offre soldi e il personaggio li prende, aggiungi {"verbo":"ricevi_soldi","quanto":N}.',
      '- "persuasione": da -0.2 a 0.2, quanto gli argomenti del giocatore in questo messaggio lo convincono (0 se non c\'è niente da convincere).',
      '- "memoria": una riga su cosa ricorderà di questo scambio.',
      '- Se il giocatore dice "decidi tu", "organizzatevi" o simili: {"verbo":"autonomia","attiva":"sì"}; se dà una strategia ("pensate ai soldi"): {"verbo":"linea","linea":"soldi|propaganda|costruire|prudenza|equilibrio"}. Per agire di nascosto o di corsa aggiungi "furtivo": true o "corri": true ai verbi.',
      '',
      'VERBI (argomenti tra parentesi):',
      Object.entries(VERBS).map(([k, v]) => `${k}(${v.args}) – ${v.desc}${v.risk ? `, rischio ${RISK_WORD(v.risk)}` : ''}${v.task ? ', solo membri' : ''}`).join('\n'),
      '',
      `LUOGHI (usa l'id): ${placeList()}`,
      `RISORSE: ${Object.keys(RES).join(', ')}, oppure "soldi" con dai`,
      `OBIETTIVI DA SABOTARE: ${Object.entries(TARGETS).map(([k, v]) => `${k}=${v.name}`).join('; ')}`,
      `LOTTI EDIFICABILI: ${LOTS.map(l => `${l.id}=${l.name}`).join('; ')}. STRUTTURE: ${Object.keys(STRUCTS).join(', ')}. MODULI: ${Object.keys(MODULES).join(', ')}.`,
      'Esempio: {"risposta":"Va bene, quattro ore all\'officina e i soldi li porto io.","umore":"deciso","azioni":[{"verbo":"lavora","ore":4}],"persuasione":0,"memoria":"Mi ha chiesto di lavorare per la cassa."}',
    ];
    return lines.filter(l => l !== null && l !== undefined).join('\n');
  }
  function chatState(st, n) {
    const r = initNpc(st, n), R = st.ris; G.opinions(st, n);
    const verbsToRate = r.member ? ['lavora', 'colletta', 'scrivi_onda', 'volantina', 'sabota', 'contrabbando', 'trasmetti', 'costruisci', 'recluta', 'sorveglia', 'proteggi', 'libera'] : ['unisciti', 'racconta', 'rivela_spazio', 'missione', 'lavora', 'sabota'];
    const rated = verbsToRate.map(v => { const w = will(st, n, v); return `${v} ${w.s} (${w.verdict}${w.why.length ? ': ' + w.why.slice(0, 2).join(', ') : ''})`; }).join('; ');
    const known = ((card(n).knows) || []).filter(id => R.spaces[id] && !R.spaces[id].found).map(id => SPACES.find(s => s.id === id).name);
    const parts = [
      `[STATO ORA] ${G.dayName(st.t)} ore ${G.clockStr(st.t)}${G.isNight(st) ? ' (notte)' : ''}. ${n.first} si trova a ${G.nearestPlace(n.x, n.y).name}. Repressione livello ${reprLevel(st)}/5, morale dell'isola ${Math.round(R.morale)}/100.`,
      `Verso ${G.PLAYER_NAME}: fiducia ${r2(n.op.trust + r.bond)}, paura ${r2(n.op.fear)}, rancore ${r2(n.op.grudge)}. Odio per la Tutela ${r2(r.ideo)}.`,
      r.member ? `È membro della Risacca: lealtà ${r2(r.loyalty)}, stanchezza ${r2(r.fatigue)}, fame ${r2(r.fame)}, sete ${r2(r.sete)}, libero arbitrio ${r.auto ? 'sì' : 'no'}. Linea della banda: ${LINES[R.linea]}. Compito attuale: ${r.task ? r.task.desc : 'nessuno'}. Ha con sé: ${Object.entries(r.carry).map(([k, v]) => `${v} ${k}`).join(', ') || 'niente'}.` : (r.missionDone ? 'Il giocatore gli ha già fatto il favore che chiedeva.' : 'Non è (ancora) della Risacca.'),
      R.mission && R.mission.giver === n.id ? `Ha già chiesto al giocatore: ${R.mission.title}.` : '',
      `Cassa della Risacca: ${Math.floor(st.ris.cassa)}.000 lire. Basi: ${R.bases.filter(b => b.alive).map(b => `${b.id}=${b.name} [${b.modules.join(', ') || 'vuota'}; scorte: ${Object.entries(b.stock).map(([k, v]) => `${v} ${k}`).join(', ') || 'niente'}]`).join('; ') || 'nessuna'}. Spazi trovati liberi: ${SPACES.filter(s => R.spaces[s.id] && R.spaces[s.id].found && !R.spaces[s.id].base).map(s => `${s.id}=${s.name}`).join('; ') || 'nessuno'}. Cantieri: ${R.sites.filter(s => !s.done).map(s => `${s.lot} ${Math.floor(s.progress)}/${s.hours} ore`).join(', ') || 'nessuno'}.`,
      known.length ? `Conosce questi posti vuoti (può rivelarli con rivela_spazio): ${known.join(', ')}.` : '',
      `Cosa sa: ${memLines(st, n).join('; ') || 'niente di speciale'}.`,
      r.notes.length ? `Ricordi delle chiacchierate con ${G.PLAYER_NAME}: ${r.notes.slice(-6).join(' / ')}` : '',
      `VOLONTÀ adesso: ${rated}.`,
    ];
    return parts.filter(Boolean).join('\n');
  }
  // i turni da mandare al modello: istruzioni, storia, messaggio nuovo con lo stato attuale
  function chatTurns(st, n, text) {
    const hist = (st.ris.chats[n.id] || []).filter(m => m.role === 'user' || (m.role === 'npc' && m.raw)).slice(-12);
    const turns = [{ role: 'user', content: chatRules(st, n) }];
    hist.forEach(m => turns.push(m.role === 'user' ? { role: 'user', content: `${G.PLAYER_NAME} dice: «${m.text}»` } : { role: 'assistant', content: m.raw }));
    turns.push({ role: 'user', content: `${chatState(st, n)}\n\n${G.PLAYER_NAME} dice: «${text}»` });
    return turns;
  }
  const VERB_ALIAS = { torna_a_casa: 'basta', 'torna a casa': 'basta', smetti: 'basta', segui: 'seguimi', scrivi: 'scrivi_onda', onda: 'scrivi_onda', volantinaggio: 'volantina', rivela: 'rivela_spazio', diffondi: 'diffondi_voce', voce: 'diffondi_voce', mercato_nero: 'mercato', accetta_soldi: 'ricevi_soldi', soldi: 'ricevi_soldi', entra: 'unisciti', recupero: 'recupera', costruire: 'costruisci', occupare: 'occupa' };
  // applica la risposta del modello (o del ripiego): la volontà e i piani decidono cosa succede davvero
  function applyReply(st, n, text, resp, raw) {
    const r = initNpc(st, n), R = st.ris;
    const ch = R.chats[n.id] = R.chats[n.id] || [];
    ch.push({ role: 'user', text, t: st.t });
    resp = resp && typeof resp === 'object' ? resp : {};
    const say = String(resp.risposta || resp.reply || '…').slice(0, 600);
    r.persuade = clamp(Number(resp.persuasione) || 0, -.2, .2);
    r.bond = clamp(r.bond + r.persuade * .35, -.5, .6);
    const said = { role: 'npc', text: say, raw: raw || JSON.stringify(resp), mood: String(resp.umore || '').slice(0, 40), t: st.t };
    ch.push(said);
    if (resp.memoria) { r.notes.push(String(resp.memoria).slice(0, 160)); if (r.notes.length > 12) r.notes.shift(); }
    // anche le parole lasciano tracce: chi informa gli Orecchi alza l'esposizione
    if (card(n).informer && /risacca|onda|base|sabot|garante|tutela|grigi/i.test(text)) { R.repr = clamp(R.repr + 3, 0, 100); R.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo + .08, 0, 1); }); }
    const out = [];
    const acts = Array.isArray(resp.azioni) ? resp.azioni.slice(0, 4) : [];
    acts.sort((a, b) => (norm(a && a.verbo) === 'ricevi_soldi' ? -1 : 0) - (norm(b && b.verbo) === 'ricevi_soldi' ? -1 : 0));
    for (const a of acts) {
      if (!a || typeof a !== 'object') continue;
      let v = norm(a.verbo || a.verb).replace(/\s+/g, '_'); v = VERB_ALIAS[v] || v;
      if (!VERBS[v]) { out.push({ verb: v, ok: false, msg: `«${a.verbo}» non è un'azione del gioco.` }); continue; }
      const args = Object.assign({}, a); delete args.verbo; delete args.verb;
      const res = order(st, n, v, args, { src: 'chat' });
      if (res.keepPay) { /* la paga resta per le azioni successive di questo messaggio */ }
      out.push(Object.assign({ verb: v, label: VERBS[v].label }, res));
      if (v === 'ricevi_soldi' && res.ok) n.ris.pay = clamp(Number(args.quanto) / 60 * (.5 + n.tr.avid), 0, .5);
    }
    r.pay = 0; r.persuade = 0;
    // senza modello: le frasi che contano le dice il personaggio stesso
    if (resp.__fb) {
      const m = out.find(o => o.verb === 'missione' && o.ok), sp = out.find(o => o.verb === 'rivela_spazio' && o.ok), un = out.find(o => o.verb === 'unisciti');
      if (m) { said.text = m.msg; m.msg = `Favore: ${R.mission ? R.mission.title : ''}`; }
      else if (sp) said.text = `C'è un posto: ${sp.msg.replace(/^Ti indica /, '').replace(/\.$/, '')}. Non dirlo a nessuno.`;
      else if (un && un.ok) said.text = 'Va bene. Da oggi sono della Risacca.';
      else if (un && card(n).mission && !r.missionDone) said.text = 'Prima fammi vedere di che pasta sei fatto. Chiedimi cosa mi serve.';
      said.raw = JSON.stringify(Object.assign({}, resp, { risposta: said.text, __fb: undefined }));
    }
    out.filter(o => o.msg).forEach(o => ch.push({ role: 'sys', text: (o.ok ? '✓ ' : '✗ ') + o.msg, ok: o.ok, t: st.t }));
    if (ch.length > 80) ch.splice(0, ch.length - 80);
    n.face = Math.atan2(st.player.y - n.y, st.player.x - n.x); n.wait = Math.max(n.wait, 4);
    G.say(st, n, said.text.length > 70 ? said.text.slice(0, 67) + '…' : said.text, 4);
    return { say: said.text, mood: resp.umore || '', outcomes: out };
  }

  // ripiego senza modello: parole chiave → verbi, frasi di repertorio
  function fallback(st, n, text) {
    const t = norm(text), r = initNpc(st, n), c = card(n), acts = [];
    const num = (t.match(/(\d+)/) || [])[1];
    const findPlace = () => { for (const p of Object.values(PLACES)) { const pn = norm(p.name); if (t.includes(pn) || pn.split(/\s+/).some(w => w.length > 4 && t.includes(w))) return p.id; } return null; };
    const findRes = () => { for (const [id, R0] of Object.entries(RES)) if (R0.syn.some(w => t.includes(norm(w)))) return id; return null; };
    if (/\b(unisc|unirti|entra|entrare|con noi|dei nostri|risacca)/.test(t) && !r.member) acts.push({ verbo: 'unisciti' });
    else if (/missione|aiutar|ti serve|favore|cosa posso fare/.test(t)) acts.push({ verbo: 'missione' });
    if (/\b(posto|nascondigl|spazio|cantina|soffitta|magazzino vuoto)/.test(t)) acts.push({ verbo: 'rivela_spazio' });
    if (/seguimi|vieni con me|andiamo/.test(t)) acts.push({ verbo: 'seguimi' });
    if (/aspetta|resta qui|fermati/.test(t)) acts.push({ verbo: 'aspetta' });
    if (/basta|lascia stare|torna a casa|vai a casa|riposa/.test(t)) acts.push({ verbo: 'basta' });
    if (/lavor|turno/.test(t) && !/cantier|costru/.test(t)) acts.push({ verbo: 'lavora', ore: num || 4 });
    if (/collett|offert/.test(t)) acts.push({ verbo: 'colletta', luogo: findPlace() || 'piazza', ore: num || 3 });
    if (/contrabband/.test(t)) acts.push({ verbo: 'contrabbando', ore: num || 3 });
    if (/mercato nero|vend/.test(t)) acts.push({ verbo: 'mercato', ore: num || 3 });
    if (/recuper|materiali/.test(t) && !/compra/.test(t)) acts.push({ verbo: 'recupera', luogo: findPlace() });
    if (/\bonda\b|gesso|scriv/.test(t)) acts.push({ verbo: 'scrivi_onda', luogo: findPlace() });
    if (/volantin/.test(t) && !/stamp|produc/.test(t)) acts.push({ verbo: 'volantina', luogo: findPlace() });
    if (/sabot/.test(t)) acts.push({ verbo: 'sabota', obiettivo: Object.keys(TARGETS).find(k => t.includes(k)) || t });
    if (/trasmett|in onda|radio scirocco/.test(t)) acts.push({ verbo: 'trasmetti', ore: num || 2 });
    if (/costru|cantier/.test(t)) acts.push({ verbo: 'costruisci', lotto: (LOTS.find(l => t.includes(norm(l.name).split(' ').pop()) || t.includes(l.id.slice(4))) || {}).id || '', struttura: Object.keys(STRUCTS).find(k => t.includes(k)) || '' });
    if (/occupa/.test(t)) acts.push({ verbo: 'occupa' });
    if (/stamp|produc|laborator/.test(t)) acts.push({ verbo: 'produci', ore: num || 4 });
    if (/sorvegli|controlla|tieni d.occhio/.test(t)) acts.push({ verbo: 'sorveglia', luogo: findPlace() || 'piazza', ore: num || 3 });
    if (/protegg|guardia/.test(t)) acts.push({ verbo: 'proteggi' });
    if (/nascondit/.test(t)) acts.push({ verbo: 'nasconditi' });
    if (/compra/.test(t)) acts.push({ verbo: 'compra', risorsa: findRes(), quanto: num || 1 });
    if (/deposita|porta in base/.test(t)) acts.push({ verbo: 'deposita' });
    if (/libera|fai uscire|tira fuori/.test(t)) acts.push({ verbo: 'libera' });
    if (/recluta|convinci|parla con/.test(t)) { const who = st.npcs.find(k => k !== n && !k.dead && (t.includes(norm(k.first)) || (battle(k) && t.includes(norm(battle(k)))))); if (who) acts.push({ verbo: 'recluta', persona: who.id }); }
    if (/allest|monta/.test(t)) acts.push({ verbo: 'allestisci', modulo: Object.keys(MODULES).find(k => t.includes(k)) || '' });
    if (/\bvai\b|vai a|raggiungi/.test(t) && !acts.length) { const p = findPlace(); if (p) acts.push({ verbo: 'vai', luogo: p }); }
    if (/mangia|fame|pranzo|cena/.test(t)) acts.push({ verbo: 'mangia' });
    if (/\bbev|sete|caffe|birra/.test(t)) acts.push({ verbo: 'bevi' });
    if (/dorm|riposa|vai a letto/.test(t)) acts.push({ verbo: 'dormi', ore: num || 6 });
    if (/scassin|lucchett|forza la porta/.test(t)) acts.push({ verbo: 'scassina' });
    if (/scasso|svaligi|entra nel negozio/.test(t)) acts.push({ verbo: 'scasso', luogo: findPlace() });
    if (/sass|telecamer|lancia/.test(t)) acts.push({ verbo: 'lancia', luogo: findPlace() });
    if (/fotograf|foto a|scatta/.test(t)) { const who = st.npcs.find(k => k !== n && !k.dead && t.includes(norm(k.first))); acts.push({ verbo: 'fotografa', persona: who ? who.id : '' }); }
    if (/ricatt/.test(t)) { const who = st.npcs.find(k => k !== n && !k.dead && t.includes(norm(k.first))); if (who) acts.push({ verbo: 'ricatta', persona: who.id }); }
    if (/telefona|chiama|messaggio|convoca|appuntamento/.test(t)) { const who = st.npcs.find(k => k !== n && !k.dead && (t.includes(norm(k.first)) || (battle(k) && t.includes(norm(battle(k)))))); if (who) acts.push({ verbo: 'convoca', persona: who.id, luogo: findPlace() || 'qui' }); }
    if (/scava|buca|nascondiglio/.test(t)) acts.push({ verbo: 'scava', luogo: findPlace() });
    if (/inchiod|assi|barric/.test(t)) acts.push({ verbo: 'inchioda' });
    if (/dipingi|murale|bomboletta|pennell|vernice/.test(t)) acts.push({ verbo: 'dipingi', luogo: findPlace() });
    if (/picchia|calci|pugni|lezione|mena/.test(t)) { const who = st.npcs.find(k => k !== n && !k.dead && t.includes(norm(k.first))); if (who) acts.push({ verbo: 'picchia', persona: who.id }); }
    if (/arreda|mobili|sposta/.test(t)) acts.push({ verbo: 'arreda' });
    if (/ripara|aggiusta/.test(t)) acts.push({ verbo: 'ripara', ore: num || 4 });
    if (/pesca/.test(t)) acts.push({ verbo: 'pesca', ore: num || 3 });
    if (/rovist|frug/.test(t)) acts.push({ verbo: 'rovista', luogo: findPlace() });
    if (/bisca|azzardo|carte/.test(t)) acts.push({ verbo: 'bisca', ore: num || 3 });
    if (/vendi.*(document|lasciapass)/.test(t)) acts.push({ verbo: 'vendi_documenti', ore: num || 3 });
    if (/decidi tu|fai tu|organizzat|libero|di testa tua/.test(t)) acts.push({ verbo: 'autonomia', attiva: 'si' });
    const ln = Object.keys(LINES).find(k => t.includes(k) && /linea|pensa|concentr|priorit|puntate/.test(t)); if (ln) acts.push({ verbo: 'linea', linea: ln });
    if (/di nascosto|furtiv|striscia|senza farti vedere/.test(t)) acts.forEach(a => { a.furtivo = true; });
    if (/di corsa|corri|in fretta|subito/.test(t)) acts.forEach(a => { a.corri = true; });
    if (/ti do|tieni|prendi questi/.test(t) && num) acts.unshift({ verbo: 'ricevi_soldi', quanto: Number(num) });
    // decide le frasi in base alla volontà
    const w = acts.length ? will(st, n, VERB_ALIAS[acts[acts.length - 1].verbo] || acts[acts.length - 1].verbo, acts[acts.length - 1]) : null;
    let say;
    if (c.antag) say = n.id === 'pardo' ? 'Che domande interessanti. Mi dica, lei con chi passa le serate?' : n.id === 'zia' ? 'Figlio mio, qui tutti parlano e io ascolto. Siediti, raccontami.' : 'Circolare. Documenti in regola?';
    else if (!acts.length) {
      if (/cosa sai|novita|si dice|voci|racconta/.test(t)) { const m = memLines(st, n)[0]; say = m ? `Si dice che ${m}.` : 'Tutto tranquillo, per ora. Troppo tranquillo.'; }
      else say = ['Parla piano: qui anche i muri hanno gli Orecchi.', 'Dimmi cosa vuoi, ma fai in fretta.', 'Non è il posto per certi discorsi.', 'Sì? Ti ascolto.'][Math.floor(st.rng() * 4)];
    } else if (w.verdict === 'accetta') say = r.member ? ['Va bene. Ci penso io.', 'Fatto, vado.', 'Contaci.'][Math.floor(st.rng() * 3)] : ['D\'accordo.', 'Va bene, ma che resti tra noi.'][Math.floor(st.rng() * 2)];
    else if (w.verdict === 'contratta') say = n.tr.avid > .6 ? 'Ci sto, ma qualcosa in tasca me lo devi mettere.' : 'Non lo so… Dammi una ragione per rischiare.';
    else say = (c.never || []).includes(acts[0].verbo) ? 'Questo no. Non chiedermelo più.' : 'No. Non adesso, non così.';
    const resp = { __fb: true, risposta: say, umore: '', azioni: w && w.verdict === 'accetta' ? acts : acts.filter(a => a.verbo === 'ricevi_soldi' || a.verbo === 'missione' || a.verbo === 'rivela_spazio'), persuasione: /ti prego|per favore|per (la|l.)isola|per tuo|insieme|liberi/.test(t) ? .08 : 0, memoria: `Mi ha detto: «${text.slice(0, 60)}»` };
    return resp;
  }

  // ---------------- PANNELLO ----------------
  function summary(st) {
    const R = st.ris; if (!R) return null;
    return {
      morale: Math.round(R.morale), repr: Math.round(R.repr), level: reprLevel(st), cassa: Math.floor(st.ris.cassa), inv: Object.assign({}, R.inv),
      members: members(st).map(n => ({ id: n.id, name: n.name, first: n.first, battle: battle(n), role: n.role, loyalty: r2(n.ris.loyalty), fatigue: r2(n.ris.fatigue), fame: r2(n.ris.fame), sete: r2(n.ris.sete), auto: n.ris.auto, auto_task: !!(n.ris.task && n.ris.task.src === 'autonomia'), task: n.ris.task ? n.ris.task.desc : null, jailed: n.jailedUntil > st.t, carry: Object.assign({}, n.ris.carry), mestiere: card(n).mestiere ? PLACES[card(n).mestiere.place].name : null, where: G.nearestPlace(n.x, n.y).name })),
      contacts: st.npcs.filter(n => n.ris && !n.ris.member && RECRUITABLE.includes(n.id) && !n.dead).map(n => ({ id: n.id, first: n.first, battle: battle(n), role: n.role, missionDone: n.ris.missionDone, will: will(st, n, 'unisciti').s })),
      linea: R.linea, cams: CAMS.filter(c => R.cams[c.id] > st.t).length, mole: R.mole ? G.nameOf(st, R.mole) : null,
      bases: R.bases.filter(b => b.alive).map(b => ({ id: b.id, name: b.name, kind: b.kind, barricade: b.barricade, comfort: b.comfort, modules: b.modules.slice(), slots: b.slots, stock: Object.assign({}, b.stock), cap: capacity(b), used: used(b), expo: r2(b.expo), only: b.only, x: b.x, y: b.y })),
      sites: R.sites.filter(s => !s.done).map(s => ({ id: s.id, lot: LOTS.find(l => l.id === s.lot).name, struct: STRUCTS[s.struct].name, progress: Math.floor(s.progress), hours: s.hours })),
      spaces: SPACES.filter(s => R.spaces[s.id] && R.spaces[s.id].found).map(s => ({ id: s.id, name: s.name, slots: s.slots, base: R.spaces[s.id].base, locked: R.spaces[s.id].locked })),
      goals: goals(st), mission: R.mission ? missionTarget(st) : null, raid: R.raid ? { name: R.raid.name, mins: Math.max(0, Math.round(R.raid.at - st.t)) } : null, act: R.goals.act,
    };
  }

  // ---------------- INSTALLAZIONE ----------------
  function install_hooks() {
    G.HOOKS.create = create; G.HOOKS.think = hookThink; G.HOOKS.move = hookMove; G.HOOKS.step = hookStep; G.HOOKS.verb = hookVerb; G.HOOKS.jailed = hookJailed;
    const jt = G.jobTarget; if (!jt.__ris) { G.jobTarget = st => jt(st) || missionTarget(st); G.jobTarget.__ris = true; }
  }
  install_hooks();

  return {
    RES, SHOPS, SPACES, LOTS, STRUCTS, MODULES, TARGETS, VERBS, CARDS, LAB, RISK_WORD, CAMS, camPos, LINES, setLine, candidates, autonomy,
    will, plan, order, assign, join, leave, members, summary, here, playerAct, chatRules, chatState, chatTurns, applyReply, fallback,
    totalRes, takeRes, putBase, capacity, discover, occupySpace, startSite, finishSite, install, canInstall, canStartSite, missionTarget, offerMission, completeMission,
    lotCenter, targetPos, reprLevel, battle, card, initNpc, goals, resolvePlace, resolveRes,
    EXT, resolvePerson, inbox, DO,   // [fazioni]
  };
})();
if (typeof module !== 'undefined') module.exports = Risacca;
