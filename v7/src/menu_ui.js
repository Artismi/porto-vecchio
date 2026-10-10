/* Porto Vecchio — Il Menu: una valigetta sola per tutto quello che si tocca.
   Schede a sinistra: Zaino (la roba a griglia, come in una valigetta: la roba grande occupa più caselle), Personaggio (bisogni, lavoro, quello che sai fare),
   Banco di lavoro (ricette con le icone degli ingredienti), Lavori (il tuo e chi cerca gente), Qui adesso (le cose da fare sul posto).
   Quando servono compaiono anche Bottega (il commerciante al banco, la merce in vetrina) e Frugare.
   Icone pixel 16×16 per tutti gli oggetti del catalogo: una sagoma per famiglia (bottiglia, latta, sacco, attrezzo…) e il colore dell'oggetto.
   I o Z: zaino · K: banco di lavoro · 1-5 dentro il menu: le schede · Esc: torna al gioco. Il gioco è in pausa mentre è aperto.
   Legge e scrive attraverso Oggetti, Azioni, Protagonista, Mestieri, Popolo e la Risacca. */
var MenuUI = (function () {
  'use strict';
  const PV = () => window.__pv, ST = () => PV() && PV().st;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const L = x => `${Math.round(x).toLocaleString('it-IT')}.000`;
  const G = () => (PV() && PV().G) || Game, O = () => Oggetti;
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
  const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const U = { open: false, tab: 'zaino', arg: null, sel: null, msg: '', ok: true, filt: 'tutto', shopTab: 'compra', jobSel: null, sig: '' };

  // =====================================================================================================================
  // ICONE: 16×16, una sagoma per famiglia, il colore dall'oggetto
  // =====================================================================================================================
  const K = '#1a1820', W = '#f2ead8', Gy = '#8a8690', Dg = '#55505a';
  const sh = (c, k) => { const n = parseInt(c.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); };
  const SHAPE = {
    bottiglia: (r, c) => { r(c, 6, 5, 5, 10); r(sh(c, 1.35), 7, 6, 1, 7); r(c, 7, 2, 3, 3); r(K, 7, 1, 3, 1); r(W, 6, 9, 5, 3); r(sh(c, .6), 6, 14, 5, 1); },
    latta: (r, c, t) => { r(Gy, 3, 4, 10, 10); r('#b8b4bc', 3, 4, 10, 1); r(t, 3, 6, 10, 6); r(sh(t, 1.3), 4, 7, 2, 4); r(W, 7, 8, 4, 2); r(Dg, 3, 13, 10, 1); },
    pane: (r, c) => { r('#a86a2a', 2, 6, 12, 7); r('#c88a40', 3, 5, 10, 2); r('#e0b060', 4, 7, 2, 1); r('#e0b060', 8, 7, 2, 1); r('#e0b060', 11, 8, 1, 1); r('#7a4a1a', 2, 12, 12, 1); },
    sacco: (r, c, t) => { r(c, 3, 5, 10, 10); r(sh(c, 1.2), 4, 6, 3, 7); r(sh(c, .75), 6, 3, 4, 3); r(K, 6, 5, 4, 1); r(sh(c, .7), 3, 14, 10, 1); r(t, 6, 8, 5, 4); r(W, 7, 9, 3, 1); },
    tondo: (r, c) => { r(c, 4, 5, 8, 8); r(c, 3, 6, 10, 6); r(sh(c, 1.35), 5, 6, 2, 2); r(sh(c, .7), 5, 12, 6, 1); r('#4a7a3a', 7, 3, 2, 2); },
    mucchio: (r, c) => { [[2, 9], [7, 10], [5, 6], [10, 7], [8, 4]].forEach(([x, y]) => { r(c, x, y, 5, 4); r(sh(c, 1.4), x + 1, y, 2, 1); r(sh(c, .6), x, y + 3, 5, 1); }); },
    pesce: (r, c) => { r(c, 2, 6, 10, 5); r(sh(c, 1.3), 3, 6, 8, 1); r(c, 12, 4, 3, 9); r(K, 4, 7, 1, 1); r(sh(c, .7), 2, 10, 10, 1); },
    carne: (r, c) => { r(c, 2, 4, 12, 9); r(sh(c, 1.3), 3, 5, 5, 2); r('#f0d8d0', 6, 8, 3, 3); r(sh(c, .7), 2, 12, 12, 1); },
    formaggio: (r, c) => { r(c, 2, 6, 12, 7); r(sh(c, 1.15), 2, 5, 12, 2); r(sh(c, .8), 5, 8, 2, 2); r(sh(c, .8), 10, 9, 2, 2); r(sh(c, .7), 2, 12, 12, 1); },
    tazza: (r, c) => { r(W, 3, 6, 8, 8); r(c, 4, 6, 6, 2); r(W, 11, 8, 3, 4); r(K, 12, 9, 1, 2); r(Gy, 2, 14, 11, 1); r('#c8c4bc', 5, 2, 1, 3); r('#c8c4bc', 8, 3, 1, 2); },
    tronco: (r, c) => { [[1, 4], [1, 9]].forEach(([x, y]) => { r(c, x, y, 14, 4); r(sh(c, 1.25), x, y, 14, 1); r('#d8b080', x + 11, y, 3, 4); r(sh(c, .7), x + 12, y + 1, 1, 2); }); },
    mattone: (r, c) => { r(c, 1, 5, 14, 8); r(sh(c, .7), 1, 9, 14, 1); r(sh(c, .7), 7, 5, 1, 4); r(sh(c, .7), 4, 9, 1, 4); r(sh(c, .7), 11, 9, 1, 4); r(sh(c, 1.25), 1, 5, 14, 1); },
    lastra: (r, c) => { r(c, 2, 3, 12, 11); [4, 7, 10].forEach(y => r(sh(c, .75), 2, y, 12, 1)); r(sh(c, 1.3), 2, 3, 12, 1); r(sh(c, .6), 13, 3, 1, 11); },
    viti: (r, c) => { [[2, 3], [7, 5], [11, 2], [4, 9]].forEach(([x, y]) => { r(c, x, y, 3, 2); r(sh(c, .8), x + 1, y + 2, 1, 5); }); },
    corda: (r, c) => { r(c, 3, 3, 10, 10); r('#00000000', 0, 0, 0, 0); r(sh(c, .55), 6, 6, 4, 4); r(sh(c, 1.3), 4, 4, 2, 1); r(sh(c, 1.3), 10, 10, 2, 1); r(c, 12, 11, 3, 2); },
    martello: (r, c) => { r('#8a5a2a', 7, 5, 2, 10); r(c, 3, 2, 10, 4); r(sh(c, 1.3), 3, 2, 10, 1); r(sh(c, .7), 3, 5, 10, 1); },
    chiave: (r, c) => { r(c, 7, 4, 2, 11); r(c, 4, 1, 3, 4); r(c, 9, 1, 3, 4); r(sh(c, 1.3), 7, 4, 1, 10); r(c, 6, 13, 4, 2); },
    lama: (r, c) => { r('#c8ccd4', 3, 2, 3, 8); r(W, 3, 2, 1, 8); r(K, 2, 10, 5, 1); r(c, 3, 11, 3, 4); r(sh(c, .7), 5, 11, 1, 4); },
    sega: (r, c) => { r('#c8ccd4', 1, 6, 11, 4); for (let x = 1; x < 12; x += 2) r(Gy, x, 10, 1, 1); r(c, 11, 4, 4, 7); r(K, 12, 6, 2, 3); },
    ascia: (r, c) => { r('#8a5a2a', 7, 3, 2, 12); r('#a8acb4', 2, 2, 6, 6); r(W, 2, 2, 1, 6); r(c, 8, 3, 3, 3); },
    pala: (r, c) => { r('#8a5a2a', 7, 1, 2, 9); r(K, 6, 1, 4, 1); r('#a8acb4', 4, 10, 8, 5); r(W, 4, 10, 8, 1); },
    pila: (r, c) => { r(c, 4, 3, 8, 11); r(sh(c, 1.3), 5, 4, 2, 9); r(Gy, 6, 1, 4, 2); r(K, 4, 9, 8, 1); r(W, 7, 6, 2, 2); },
    radio: (r, c) => { r(c, 1, 5, 14, 9); r(sh(c, 1.25), 1, 5, 14, 1); r(Dg, 2, 7, 6, 5); [8, 10].forEach(y => r(Gy, 3, y, 4, 1)); r('#e8c040', 10, 7, 4, 2); r(K, 11, 10, 2, 2); r(Gy, 12, 1, 1, 4); },
    scatola: (r, c) => { r(c, 2, 3, 12, 11); r(sh(c, 1.25), 2, 3, 12, 1); r(K, 4, 5, 8, 5); r('#6ad8ff', 5, 6, 6, 3); r(Gy, 4, 11, 2, 2); r(Gy, 10, 11, 2, 2); },
    lampadina: (r, c) => { r(c, 5, 2, 6, 7); r(c, 4, 3, 8, 5); r(W, 6, 3, 2, 2); r(Gy, 6, 9, 4, 4); r(Dg, 6, 10, 4, 1); r(K, 7, 13, 2, 1); },
    carta: (r, c, t) => { r(W, 3, 2, 10, 13); r(sh(W, .85), 12, 2, 1, 13); [6, 8, 10, 12].forEach(y => r(Gy, 5, y, 6, 1)); r(t, 4, 3, 8, 2); },
    medicina: (r, c) => { r(W, 2, 4, 12, 10); r(sh(W, .85), 2, 13, 12, 1); r(c, 7, 6, 2, 6); r(c, 5, 8, 6, 2); r(Gy, 6, 2, 4, 2); },
    siringa: (r, c) => { r('#d8e4ec', 4, 4, 9, 4); r(c, 5, 5, 6, 2); r(Gy, 13, 5, 2, 2); r(Gy, 1, 5, 3, 2); r(K, 2, 4, 1, 4); },
    sapone: (r, c) => { r(c, 2, 6, 12, 7); r(sh(c, 1.25), 3, 6, 5, 2); r(sh(c, .7), 2, 12, 12, 1); r(W, 11, 3, 2, 2); r(W, 13, 5, 1, 1); },
    maglia: (r, c) => { r(c, 4, 3, 8, 12); r(c, 1, 3, 3, 6); r(c, 12, 3, 3, 6); r(sh(c, .7), 6, 3, 4, 2); r(sh(c, 1.25), 5, 5, 1, 9); },
    scarpa: (r, c) => { r(c, 4, 3, 5, 8); r(c, 4, 9, 10, 4); r(sh(c, 1.3), 5, 4, 1, 6); r(K, 4, 13, 10, 1); },
    cappello: (r, c) => { r(c, 4, 4, 8, 6); r(c, 2, 9, 12, 3); r(sh(c, 1.3), 5, 5, 3, 1); r(sh(c, .7), 2, 11, 12, 1); },
    borsa: (r, c) => { r(c, 2, 5, 12, 9); r(sh(c, 1.2), 2, 5, 12, 2); r(sh(c, .7), 5, 2, 6, 3); r(c, 6, 3, 4, 1); r('#c8a040', 7, 7, 2, 2); },
    sedia: (r, c) => { r(c, 4, 1, 2, 14); r(c, 4, 8, 9, 2); r(c, 11, 8, 2, 7); r(c, 4, 1, 8, 2); r(sh(c, 1.3), 4, 8, 9, 1); },
    arma: (r, c) => { r('#c8ccd4', 1, 5, 11, 3); r(W, 1, 5, 11, 1); r(c, 7, 8, 4, 6); r(K, 6, 8, 2, 2); },
    munizioni: (r, c) => { [2, 6, 10].forEach(x => { r(c, x, 6, 3, 8); r('#c89a40', x, 3, 3, 4); r(sh(c, 1.3), x, 6, 1, 8); }); },
    moneta: (r, c) => { r(c, 4, 3, 8, 10); r(c, 3, 4, 10, 8); r(sh(c, 1.35), 5, 4, 3, 2); r(sh(c, .7), 5, 12, 6, 1); r(sh(c, .8), 7, 6, 2, 4); },
    pacchetto: (r, c, t) => { r(W, 3, 3, 10, 12); r(t, 3, 7, 10, 5); r(W, 5, 1, 1, 3); r(W, 7, 1, 1, 3); r('#e8a040', 5, 1, 1, 1); r(sh(c, .7), 3, 14, 10, 1); },
    cassetta: (r, c) => { r(c, 1, 4, 14, 9); r(W, 3, 6, 10, 3); r(K, 4, 7, 2, 1); r(K, 10, 7, 2, 1); r(sh(c, .7), 1, 12, 14, 1); },
    ruota: (r, c) => { r(K, 3, 2, 10, 12); r(K, 2, 3, 12, 10); r(Gy, 5, 5, 6, 6); r(Dg, 7, 7, 2, 2); r(c, 2, 7, 2, 2); },
    tanica: (r, c) => { r(c, 3, 4, 10, 11); r(sh(c, 1.25), 4, 5, 2, 9); r(K, 5, 2, 4, 2); r(sh(c, .7), 10, 2, 2, 3); r(sh(c, .7), 3, 14, 10, 1); r(W, 7, 8, 4, 2); },
    rottame: (r, c) => { r(c, 2, 8, 9, 5); r(sh(c, 1.3), 3, 8, 6, 1); r('#7a4a2a', 6, 4, 8, 3); r(Gy, 9, 10, 6, 2); r(K, 4, 10, 2, 2); },
    cassa: (r, c) => { r(c, 2, 3, 12, 11); [6, 10].forEach(y => r(sh(c, .7), 2, y, 12, 1)); r(sh(c, 1.25), 2, 3, 12, 1); r(sh(c, .6), 2, 3, 1, 11); r(sh(c, .6), 13, 3, 1, 11); },
  };
  // a che famiglia appartiene ogni oggetto (prima l'id, poi la categoria)
  const FAM = [
    [/molotov/, 'bottiglia', '#4a8a4a'], [/vino|mirto/, 'bottiglia', '#8a2a3a'], [/birra/, 'bottiglia', '#8a5a1a'], [/grappa|vodka|alcol$/, 'bottiglia', '#c8d8e0'], [/whisky/, 'bottiglia', '#b8782a'],
    [/aranciata|succo/, 'bottiglia', '#e88a2a'], [/^acqua|bottiglia/, 'bottiglia', '#5a9ad8'], [/olio$|aceto|profumo|disinfett|sciroppo|iodio|lubrific|silicone|colla/, 'bottiglia', '#c8a83a'],
    [/scatol|conserva|passata|latta|lattine|barattolo|vernice|catrame|carne_scatola|razione|strutto/, 'latta', '#c84a3a'],
    [/^pane|focaccia|panino|biscotti|gallette/, 'pane'], [/pasto|minestra|castagne_arrosto|gelato|cioccolato|miele/, 'tazza', '#8a5a2a'],
    [/farina|riso|sale$|zucchero|orzo|ceci|legumi|cemento|calce|sabbia|sacc|caffe$|te_foglie|lievito|spezie|capi|ghiaia/, 'sacco', '#c8b080'],
    [/verdura|patate|pomodori|cipolle|frutta|limoni|olive|uova|castagne|funghi|uva|noci/, 'tondo'], [/pesce|sarde|polpo|baccala|acciughe/, 'pesce', '#7a9ab0'],
    [/carne|salsiccia|salame|mortadella|pelle$/, 'carne', '#b84a4a'], [/formaggio|ricotta|burro/, 'formaggio', '#e8c860'], [/caffe_|^te$|thermos/, 'tazza', '#5a3a1a'],
    [/legna|legno|travi|assi|compensato|pallet|sughero|mobile_rotto/, 'tronco', '#8a5a2a'], [/carbon|pietre|piombo/, 'mucchio', '#3a3838'], [/mattoni|malta/, 'mattone', '#b8584a'],
    [/lamiera|vetro|plexi|grata|rete|filo_spinato|telo|tondino|ferro$|tubi|tubo/, 'lastra', '#8a9098'], [/chiodi|viti|bulloni|tasselli|molle|cerniere|fascette|bottoni/, 'viti', '#a8acb4'],
    [/corda|catena|filo|cavo|nastro|rame|lana|stoffa/, 'corda', '#c89a5a'], [/martello|mazza|piccone|scalpello|pialla|cazzuola/, 'martello', '#6a6e78'],
    [/chiave|pinze|tronchesi|morsa|grimaldello|piede$/, 'chiave', '#8a8e98'], [/coltell|taglierino|lima|cacciavite|saldatore|stagno|rasoio|forbici|ago|ferri_maglia|cesoie|tirapugni/, 'lama', '#c84a3a'],
    [/sega/, 'sega', '#8a5a2a'], [/ascia|falce|zappa/, 'ascia', '#8a3a2a'], [/pala/, 'pala'], [/pile|batteri/, 'pila', '#c8a03a'],
    [/radio|ricetrasm|walkie|registratore|telefono|disturbatore|microfono|cuffie|altoparlante|antenna|tester/, 'radio', '#4a5a4a'],
    [/tv|elettrodom|frigo|motore|dinamo|timer|sveglia|macchina_scrivere|interruttore|fotocamera|ingranditore|ciclostile|banco_radio/, 'scatola', '#5a6a7a'],
    [/lampad|valvole|transistor|candele|torcia/, 'lampadina', '#f0d060'],
    [/carta|cartoncino|quaderno|buste|giornale|volantini|poster|moduli|documenti|fascicolo|mappa|piantina|rivista|tessera|foto|prove|stencil|matrici|libretto|penne|inchiostro|timbro|francobolli|carte$/, 'carta', '#c84a4a'],
    [/medicine|antibiot|kit_medico|vitamine|sonniferi|garze|bende|cerotti|kit$/, 'medicina', '#d83a3a'], [/siring|morfina|termometro|laccio|stecca/, 'siringa', '#d83a3a'],
    [/sapone|detersivo|candeggina|dentifricio|shampoo|spugne|pettine/, 'sapone', '#e8b0d0'], [/stracci|lenzuola|coperta/, 'maglia', '#a8a090'],
    [/vestiti|maglione|cappotto|giacca|tuta|jeans|divisa|impermeabile|giubbotto|guanti|sciarpa|calze/, 'maglia', '#4a5a8a'], [/scarpe|stivali/, 'scarpa', '#5a3a2a'],
    [/berretto|elmetto|passamontagna|maschera/, 'cappello', '#4a5a3a'], [/zaino|sacco_pelo|tenda/, 'borsa', '#5a6a3a'],
    [/sedia|tavolo|branda|materasso|scaffale|mobili|barricata|porta|botola|banco$|stufa|fornello|alambicco|macchina_cucire|bicicletta/, 'sedia', '#8a6a4a'],
    [/pistola|lupara|mitra|fionda|mazza_baseball/, 'arma', '#6a4a2a'], [/munizioni|petardi|fumogeno|razzo|triboli/, 'munizioni', '#8a6a2a'],
    [/orologio|gioielli|anello|valuta|posate|quadro|merce|refurtiva|roba$|spray/, 'moneta', '#e8c040'], [/sigarette|marlboro|tabacco/, 'pacchetto', '#c83a3a'],
    [/cassett|dischi|rullino/, 'cassetta', '#3a3a4a'], [/pneumatico|ruota|telaio|bici/, 'ruota', '#c83a3a'],
    [/tanica|benzina|gasolio|bombola|petrolio|olio_motore|secchio|fiammiferi|accendino/, 'tanica', '#c83a3a'], [/rottami|ricambi|rotta|rotto|elettrodomestico/, 'rottame', '#6a6e78'],
    [/casse/, 'cassa', '#8a6a40'],
  ];
  const CATFAM = { cibo: 'tondo', bevande: 'bottiglia', dispensa: 'sacco', combustibili: 'tanica', edilizia: 'lastra', ferramenta: 'viti', attrezzi: 'chiave', elettrico: 'scatola', stampa: 'carta', medicina: 'medicina', igiene: 'sapone', vestiti: 'maglia', arredi: 'sedia', armi: 'arma', valori: 'moneta', rottami: 'rottame' };
  const fam = id => { for (const [re, s, c] of FAM) if (re.test(id)) return [s, c]; const c = O().CAT[id]; return [CATFAM[c && c.cat] || 'cassa', null]; };
  const tint = id => { const h = hash(id); return `hsl(${h % 360},${35 + (h >>> 9) % 30}%,${42 + (h >>> 4) % 18}%)`; };
  const hex = css => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = css; return c.fillStyle; };
  const TINTS = { pomodori: '#d83a2a', limoni: '#e8d040', olive: '#4a6a2a', uova: '#f0e8d8', patate: '#b8904a', cipolle: '#d8b088', verdura: '#5a9a3a', frutta: '#d84a3a', castagne: '#7a4a2a', funghi: '#c8a070', uva: '#6a3a7a', noci: '#9a7040' };
  const LONG = /^(pala|piccone|ascia|zappa|falce|sega|canna|lupara|mitra|carriola|piede|travi|tubi|tondino|assi)$/;
  // disegna l'icona di un oggetto (o di un'arma della Tasca) su un canvas 16×16 o 32×16
  function icon(cv, id) {
    const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.imageSmoothingEnabled = false;
    const r = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const TI = typeof TascheUI !== 'undefined' && TascheUI.ICONS;
    if (cv.width === 32) { if (TI && TI[id]) { TI[id](r); return; } x.save(); x.translate(8, 0); paint(r, id); x.restore(); return; }
    paint(r, id);
  }
  function paint(r, id) {
    if (id === '$') { SHAPE.moneta(r, '#e8c040'); return; }
    const [s, c0] = fam(id), t = hex(tint(id)), c = TINTS[id] || c0 || t;
    (SHAPE[s] || SHAPE.cassa)(r, c, c0 && !TINTS[id] && /^(sacco|latta|carta)$/.test(s) ? t : c);
  }
  const ic = (id, w) => `<canvas class="ic" width="${w || 16}" height="16" data-ic="${esc(id)}"></canvas>`;
  const wideIcon = id => typeof TascheUI !== 'undefined' && TascheUI.ICONS && TascheUI.ICONS[id] && LONG.test(id);

  // =====================================================================================================================
  // ANTEPRIME 3D: ogni oggetto ha la sua fotina. I vestiti indossati da un manichino (il modello di Nino), le armi coi modelli
  // del gioco, il resto con un piccolo modello per famiglia (bottiglia, latta, sacco, attrezzo…) e il colore dell'oggetto.
  // Si fanno poche per fotogramma e restano in memoria (TH).
  // =====================================================================================================================
  const TH = new Map(), THQ = [], THS = 128;
  const thumb = id => TH.get(id) || (THQ.includes(id) || THQ.push(id), null);
  const CUST = {}; const thumbFor = (key, make) => { CUST[key] = make; return thumb(key); };
  function mini(id) {
    const T = THREE, g = new T.Group(), [s, c0] = fam(id), c = TINTS[id] || c0 || hex(tint(id)), t = hex(tint(id));
    const M = (col, o) => new T.MeshStandardMaterial(Object.assign({ color: col, roughness: .7, metalness: 0 }, o || {}));
    const add = (geo, col, x, y, z, o, rx, ry, rz) => { const m = new T.Mesh(geo, M(col, o)); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; };
    const Bo = (w, h, d) => new T.BoxGeometry(w, h, d), Cl = (a, b, h, n) => new T.CylinderGeometry(a, b, h, n || 18), Sf = (r, w, h) => new T.SphereGeometry(r, w || 18, h || 12), To = (r, tb, a, b) => new T.TorusGeometry(r, tb, a || 10, b || 24);
    const GL = { metalness: .1, roughness: .15, transparent: true, opacity: .88 }, MET = { metalness: .7, roughness: .35 };
    switch (s) {
      case 'bottiglia': add(Cl(.16, .17, .55), c, 0, .28, 0, GL); add(Cl(.07, .16, .14), c, 0, .62, 0, GL); add(Cl(.05, .055, .16), c, 0, .76, 0, GL); add(Cl(.055, .055, .05), '#2a2a2e', 0, .86); add(Cl(.172, .172, .2), '#f0ead8', 0, .3, 0); break;
      case 'latta': add(Cl(.22, .22, .42, 24), '#b8bcc4', 0, .21, 0, MET); add(Cl(.225, .225, .3, 24), t, 0, .21, 0); add(Cl(.2, .2, .02, 24), '#d8dce4', 0, .43, 0, MET); break;
      case 'pane': { const b = add(Sf(.3), '#b8742e', 0, .16, 0); b.scale.set(1.5, .55, .8); [-.2, 0, .2].forEach(x => { const k = add(Bo(.04, .02, .3), '#e8b868', x, .3, 0); k.rotation.y = .5; }); break; }
      case 'sacco': { const b = add(Sf(.3), c, 0, .28, 0); b.scale.set(1, 1.05, .8); add(Cl(.06, .12, .14), c, 0, .6, 0); add(Cl(.07, .07, .03), '#5a4428', 0, .58, 0); add(Bo(.22, .14, .01), t, 0, .3, .24); break; }
      case 'tondo': [[0, .14, 0], [.2, .13, .08], [-.18, .13, .1], [.05, .32, .05]].forEach(([x, y, z], i) => { const b = add(Sf(.15), i % 2 ? sh(c, .85) : c, x, y, z); b.scale.y = .9; }); add(Cl(.012, .012, .08), '#4a7a3a', .05, .48, .05); break;
      case 'pesce': { const b = add(Sf(.2), c, 0, .16, 0, { metalness: .4, roughness: .3 }); b.scale.set(2, .7, .6); add(Cl(0, .14, .2, 4), c, .48, .16, 0, {}, 0, 0, Math.PI / 2); add(Sf(.025), '#111', -.3, .2, .1); break; }
      case 'carne': { const b = add(Bo(.5, .2, .36), c, 0, .1, 0); add(Bo(.12, .21, .1), '#f0d8d0', .08, .1, .05); break; }
      case 'formaggio': add(new T.CylinderGeometry(.3, .3, .22, 24, 1, false, 0, Math.PI * 1.6), c, 0, .11, 0); [[.1, .16, .1], [-.1, .1, .15]].forEach(([x, y, z]) => add(Sf(.035), sh(c, .8), x, y, z)); break;
      case 'tazza': add(Cl(.16, .13, .26), '#f0ece2', 0, .13, 0); add(Cl(.14, .14, .01), c, 0, .25, 0); add(To(.08, .02), '#f0ece2', .18, .14, 0); add(Cl(.26, .26, .02), '#f0ece2', 0, .01, 0); break;
      case 'tronco': [[0, .11, 0], [.12, .11, .2], [.06, .3, .1]].forEach(([x, y, z]) => { add(Cl(.11, .11, .7, 10), c, x, y, z, {}, 0, 0, Math.PI / 2); add(Cl(.1, .1, .01, 10), '#d8b080', x + .355, y, z, {}, 0, 0, Math.PI / 2); }); break;
      case 'mucchio': for (let i = 0; i < 9; i++) { const b = add(new T.DodecahedronGeometry(.1 + (i % 3) * .03), c, Math.cos(i * 2.3) * .2, .08 + Math.floor(i / 5) * .12, Math.sin(i * 2.3) * .2, { roughness: .9 }); b.rotation.set(i, i * 2, 0); } break;
      case 'mattone': [[0, .07, 0], [.42, .07, 0], [.2, .21, 0]].forEach(([x, y, z]) => add(Bo(.4, .13, .2), c, x - .2, y, z, { roughness: .95 })); break;
      case 'lastra': [0, 1, 2].forEach(i => { const b = add(Bo(.8, .025, .55), i % 2 ? sh(c, .85) : c, 0, .02 + i * .03, 0, MET); b.rotation.y = i * .12; }); break;
      case 'viti': for (let i = 0; i < 7; i++) { const x = Math.cos(i * 1.7) * .2, z = Math.sin(i * 1.7) * .2; const v = add(Cl(.02, .02, .22), c, x, .02, z, MET, 0, 0, Math.PI / 2); v.rotation.y = i; add(Cl(.045, .045, .02), c, x + .1, .02, z, MET, 0, 0, Math.PI / 2); } break;
      case 'corda': for (let i = 0; i < 4; i++) add(To(.24 - i * .015, .035, 8, 26), i % 2 ? sh(c, .85) : c, 0, .04 + i * .06, 0, {}, Math.PI / 2); break;
      case 'martello': add(Cl(.03, .035, .7), '#8a5a2a', 0, .03, 0, {}, 0, 0, Math.PI / 2); add(Bo(.1, .1, .32), c, .32, .05, 0, MET); break;
      case 'chiave': add(Bo(.6, .03, .07), c, 0, .02, 0, MET); add(To(.07, .025, 8, 16), c, .32, .02, 0, MET, Math.PI / 2); add(Bo(.1, .03, .16), c, -.32, .02, 0, MET); break;
      case 'lama': add(Bo(.38, .015, .07), '#c8ccd4', .12, .03, 0, MET); add(Bo(.22, .04, .06), c, -.2, .03, 0); break;
      case 'sega': add(Bo(.62, .01, .17), '#c8ccd4', .08, .02, 0, MET); add(Bo(.16, .05, .2), c, -.3, .03, 0); break;
      case 'ascia': add(Cl(.03, .035, .8), '#8a5a2a', 0, .03, 0, {}, 0, 0, Math.PI / 2); add(Bo(.12, .04, .26), '#9aa0a8', .34, .03, .08, MET); break;
      case 'pala': add(Cl(.025, .025, .7), '#8a5a2a', -.12, .03, 0, {}, 0, 0, Math.PI / 2); add(Bo(.28, .02, .24), '#9aa0a8', .36, .02, 0, MET); break;
      case 'pila': [-.12, .12].forEach(x => { add(Cl(.09, .09, .42), c, x, .21, 0); add(Cl(.035, .035, .04), '#c8ccd4', x, .44, 0, MET); }); break;
      case 'radio': add(Bo(.62, .36, .2), c, 0, .18, 0); add(Bo(.26, .22, .01), '#2a2a2e', -.13, .19, .1); add(Bo(.2, .06, .01), '#e8c040', .17, .25, .1); add(Cl(.008, .008, .5), '#c8ccd4', .25, .55, 0, MET, 0, 0, .3); break;
      case 'scatola': add(Bo(.55, .42, .4), c, 0, .21, 0); add(Bo(.38, .26, .01), '#1a2a2a', -.03, .23, .2, { emissive: '#3a6a6a', emissiveIntensity: .4 }); break;
      case 'lampadina': add(Sf(.18), c, 0, .3, 0, { emissive: c, emissiveIntensity: .5 }); add(Cl(.08, .08, .12), '#c8ccd4', 0, .1, 0, MET); break;
      case 'carta': [0, 1, 2, 3].forEach(i => { const b = add(Bo(.42, .01, .56), i === 3 ? '#f4efe2' : '#e8e2d2', 0, .01 + i * .012, 0); b.rotation.y = (i - 1.5) * .06; }); add(Bo(.3, .002, .06), t, 0, .06, -.18); [0, 1, 2].forEach(i => add(Bo(.3, .002, .02), '#8a8690', 0, .06, -.06 + i * .07)); break;
      case 'medicina': add(Bo(.5, .3, .32), '#f2eee6', 0, .15, 0); add(Bo(.08, .2, .01), c, 0, .16, .165); add(Bo(.2, .08, .01), c, 0, .16, .165); break;
      case 'siringa': add(Cl(.04, .04, .4), '#d8e4ec', 0, .04, 0, GL, 0, 0, Math.PI / 2); add(Cl(.035, .035, .25), c, -.05, .04, 0, {}, 0, 0, Math.PI / 2); add(Cl(.005, .005, .15), '#c8ccd4', .27, .04, 0, MET, 0, 0, Math.PI / 2); break;
      case 'sapone': { const b = add(Bo(.42, .16, .28), c, 0, .08, 0); add(Sf(.04), '#ffffff', .1, .22, .05, GL); add(Sf(.03), '#ffffff', -.05, .25, -.02, GL); break; }
      case 'sedia': add(Bo(.4, .04, .4), c, 0, .4, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => add(Bo(.04, .4, .04), c, a * .17, .2, b * .17)); add(Bo(.4, .4, .04), c, 0, .62, -.18); break;
      case 'arma': add(Bo(.5, .1, .07), '#3a3a40', 0, .25, 0, MET); add(Bo(.12, .22, .06), c, -.12, .12, 0); break;
      case 'munizioni': for (let i = 0; i < 5; i++) { add(Cl(.035, .035, .16), '#c89a40', -.16 + i * .08, .08, 0, MET); add(Cl(.0, .035, .06), '#b8794a', -.16 + i * .08, .19, 0, MET); } break;
      case 'moneta': for (let i = 0; i < 5; i++) add(Cl(.14, .14, .03, 24), c, (i % 2) * .03, .015 + i * .032, 0, { metalness: .9, roughness: .25 }); break;
      case 'pacchetto': add(Bo(.3, .44, .14), '#f0ece2', 0, .22, 0); add(Bo(.305, .18, .145), t, 0, .2, 0); [-.06, 0, .06].forEach(x => add(Cl(.022, .022, .1), '#f0ece2', x, .48, 0)); break;
      case 'cassetta': add(Bo(.5, .3, .08), c, 0, .15, 0); add(Bo(.38, .1, .01), '#f0ece2', 0, .18, .04); [-.1, .1].forEach(x => add(Cl(.035, .035, .01), '#1a1a1a', x, .18, .045, {}, Math.PI / 2)); break;
      case 'ruota': add(To(.28, .09, 12, 28), '#1a1a1e', 0, .37, 0); add(Cl(.15, .15, .1), '#9aa0a8', 0, .37, 0, MET, Math.PI / 2); break;
      case 'tanica': add(Bo(.4, .5, .22), c, 0, .25, 0); add(Cl(.05, .05, .1), '#2a2a2e', .12, .55, 0); add(Bo(.25, .04, .06), sh(c, .8), -.04, .52, 0); break;
      case 'rottame': add(new T.TorusGeometry(.2, .07, 6, 12), '#2a2a2e', -.1, .07, 0, {}, Math.PI / 2); { const l = add(Bo(.5, .02, .3), '#8a4b2a', .15, .15, 0, MET); l.rotation.set(.2, .4, .3); } add(Cl(.04, .04, .5), '#7d8288', .05, .05, .2, MET, 0, .4, Math.PI / 2); break;
      default: add(Bo(.5, .4, .4), '#8a6a40', 0, .2, 0); [0.08, .32].forEach(y => add(Bo(.52, .04, .42), '#6a4e2c', 0, y, 0)); break;
    }
    return g;
  }
  let THR = null;
  function makeThumb(id) {
    const T = THREE, st = ST();
    if (!THR) { THR = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); THR.setSize(THS, THS, false); THR.setClearColor(0x000000, 0); }
    const sc = new T.Scene(); sc.add(new T.HemisphereLight('#f2e8d4', '#1f3a34', .9)); const k = new T.DirectionalLight('#fff0dc', 1.1); k.position.set(-2, 4, 3); sc.add(k); const rim = new T.DirectionalLight('#b08d57', .8); rim.position.set(3, 2, -3); sc.add(rim);
    let obj = null, cam = new T.PerspectiveCamera(28, 1, .02, 50), C0 = typeof Guardaroba !== 'undefined' && Guardaroba.CAPO[id];
    if (C0 && ready3()) {
      // il manichino: il modello di Nino, solo con quel capo addosso
      obj = Models.person({ skin: '#cfc6b8', top: '#cfc6b8', bottom: '#cfc6b8', hair: '#8a8278', hat: 'none', build: 1, extra: '' }, null);
      if (!obj) return null; Vesti3D.dress(obj, [Object.assign({}, C0)], { skin: '#cfc6b8' }); if (obj.userData.shadowC) obj.userData.shadowC.visible = false; if (obj.userData.mixer) obj.userData.mixer.update(0);
      const long = (C0.parti || []).includes('cosce') || (C0.parti || []).includes('polpacci');
      const F = { testa: [1.66, .42], collo: [1.42, .5], busto: long ? [1.05, 1.25] : [1.22, .8], spalle: [1.42, .6], mani: [.86, .45], gambe: (C0.parti || []).includes('polpacci') ? [.6, 1.05] : [.86, .62], ginocchia: [.5, .45], piedi: [.08, .4], schiena: [1.2, .75] }[C0.zona] || [1, 1];
      const back = C0.zona === 'schiena' && !/marsupio/.test(id), side = C0.zona === 'mani' || id === 'borsetta';
      obj.rotation.y = back ? Math.PI * .85 : side ? -.9 : -.35; cam.position.set(side ? .3 : 0, F[0] + F[1] * .15, F[1] * 2.2); cam.lookAt(side ? .25 : 0, F[0], 0);
    } else {
      const R = PV() && PV().R, W = st && G().WEAPONS && G().WEAPONS[id] && R && R.__models && R.__models.weaponModel;
      obj = CUST[id] ? CUST[id]() : W ? R.__models.weaponModel(id) : mini(id);
      const box = new T.Box3().setFromObject(obj), size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3()), r = Math.max(size.x, size.y, size.z) || 1;
      const holder = new T.Group(); obj.position.sub(ctr); holder.add(obj); holder.rotation.set(.45, -.6, 0); obj = holder;
      cam.position.set(0, 0, r * 2.3); cam.lookAt(0, 0, 0);
    }
    sc.add(obj); THR.render(sc, cam);
    const cv = document.createElement('canvas'); cv.width = cv.height = THS; cv.getContext('2d').drawImage(THR.domElement, 0, 0);
    sc.traverse(o => { if (o.isMesh && o.geometry && !o.isSkinnedMesh) o.geometry.dispose(); });
    return cv;
  }
  function thumbPump() {
    requestAnimationFrame(thumbPump);
    if (!THQ.length || !window.THREE) return;
    const t0 = performance.now();
    while (THQ.length && performance.now() - t0 < 14) {
      const id = THQ.shift(); let cv = null; try { cv = makeThumb(id); } catch (e) { console.error('[Anteprime]', id, e); }
      if (!cv) continue; TH.set(id, cv);
      const m = $('mu'); if (m) m.querySelectorAll(`canvas[data-ic="${id}"]:not([data-nt])`).forEach(c => drawThumb(c, cv));
    }
  }
  if (typeof window !== 'undefined') requestAnimationFrame(thumbPump);
  function drawThumb(c, cv) {
    const wide = +c.getAttribute('width') === 32 || c.dataset.w === '1'; c.dataset.w = wide ? '1' : '';
    c.width = wide ? 160 : 96; c.height = wide ? 80 : 96; c.classList.add('tc');
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = true;
    if (wide) x.drawImage(cv, 0, 24, 128, 80, 0, 0, 160, 80); else x.drawImage(cv, 0, 0, 96, 96);
  }
  function paintAll(root) { root.querySelectorAll('canvas[data-map]').forEach(c => drawMap(c)); root.querySelectorAll('canvas[data-ic]').forEach(c => { const id = c.dataset.ic, t = c.dataset.nt ? null : thumb(id); if (t) drawThumb(c, t); else icon(c, id); }); root.querySelectorAll('canvas[data-fig]').forEach(c => figure(c)); root.querySelectorAll('canvas[data-shop]').forEach(c => shopScene(c, c.dataset.shop, c.dataset.who)); }

  // =====================================================================================================================
  // IL PROTAGONISTA E IL COMMERCIANTE, in pixel
  // =====================================================================================================================
  function figure(cv) {
    const x = cv.getContext('2d'), st = ST(); x.clearRect(0, 0, cv.width, cv.height);
    const r = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    r('rgba(0,0,0,.35)', 5, 61, 22, 2);
    r('#2a2420', 11, 52, 4, 9); r('#2a2420', 17, 52, 4, 9); r('#151216', 10, 59, 6, 2); r('#151216', 16, 59, 6, 2);   // gambe e scarpe
    r('#3a3e4a', 9, 22, 14, 31); r('#4a4e5c', 10, 23, 3, 28); r('#2a2e3a', 15, 24, 1, 28);                              // cappotto
    r('#3a3e4a', 5, 23, 4, 20); r('#3a3e4a', 23, 23, 4, 20); r('#d8a888', 5, 43, 4, 3); r('#d8a888', 23, 43, 4, 3);     // braccia e mani
    r('#a83a3a', 10, 19, 12, 4); r('#c84a4a', 11, 20, 4, 1); r('#a83a3a', 18, 23, 3, 7);                                 // sciarpa
    r('#d8a888', 11, 8, 10, 11); r('#c89878', 18, 9, 3, 10); r('#1a1418', 13, 12, 2, 2); r('#1a1418', 17, 12, 2, 2); r('#9a6a5a', 14, 16, 4, 1);   // faccia
    r('#2a2024', 10, 5, 12, 5); r('#2a2024', 10, 8, 2, 5); r('#3a2c30', 12, 5, 6, 2);                                    // capelli
    if (st) { const h = st.player.hand || (st.player.cur !== 'pugni' ? st.player.cur : null); if (h) { const c2 = document.createElement('canvas'); c2.width = 32; c2.height = 16; icon(c2, h); x.drawImage(c2, 16, 38, 16, 8); } }
  }
  // il banco del commerciante: scaffali, insegna, la persona dietro, la merce colorata
  function shopScene(cv, label, who) {
    const x = cv.getContext('2d'), h = hash(label + who), W0 = cv.width, H0 = cv.height; x.imageSmoothingEnabled = false;
    const r = (col, a, b, w, hh) => { x.fillStyle = col; x.fillRect(a, b, w, hh); };
    const wall = ['#4a3a34', '#3a4248', '#44403a', '#3e3a46'][h % 4];
    r(wall, 0, 0, W0, H0); for (let y = 0; y < 52; y += 4) r(sh(wall, .9), 0, y, W0, 1);
    for (const sy of [12, 26, 40]) { r('#6a4a2c', 4, sy, W0 - 8, 2); for (let i = 0; i < 18; i++) { const hh = hash(label + sy + i); if (hh % 5 === 0) continue; const c = `hsl(${hh % 360},${40 + hh % 30}%,${40 + (hh >>> 3) % 25}%)`; r(c, 6 + i * 5, sy - 3 - (hh % 3), 3, 3 + (hh % 3)); } }
    r('#e8d040', 30, 1, 60, 8); r('#20181a', 31, 2, 58, 6);   // insegna
    // il bancone col registratore
    r('#6a4a2c', 0, 66, W0, 14); r('#8a6238', 0, 66, W0, 2); r('#4a3220', 0, 79, W0, 1);
    r('#c8c0a8', 8, 56, 16, 10); r('#2a2a2e', 10, 58, 12, 3); r('#6ad860', 11, 59, 6, 1); r('#a8a090', 8, 64, 16, 2);
    r('#d8d0c0', 92, 60, 8, 6); r('#e8c040', 104, 62, 6, 4);
  }


  // =====================================================================================================================
  // RITRATTI 3D: i personaggi veri del gioco (Models.person), con i vestiti che hai addosso. Si girano trascinando.
  // =====================================================================================================================
  const PLOOK = { skin: '#dcae88', top: '#8c2f24', bottom: '#34425f', hair: '#17110e', hat: 'none', build: 1.05, extra: '' };
  const WCOL = { maglione: '#7a3a2a', vestiti: '#5a6a7a', tuta: '#3a5a7a', divisa: '#4a5060', cappotto: '#3a3e4a', giacca_pelle: '#2a1c16', giubbotto: '#3a4a2e', impermeabile: '#8a7a4a', coperta: '#6a5a4a', jeans: '#2e4a7a', calze_nylon: '#2a2024' };
  const R3 = { r: null, sc: {}, t: 0, drag: null };
  const ready3 = () => !!(window.THREE && window.Models && Models.charsReady && Models.charsReady());
  function lookOf(st, key) {
    if (key === 'player') { const W = O().wornView ? Object.fromEntries(O().wornView(st).slots.map(s => [s.slot, s.id])) : {}; return [Object.assign({}, PLOOK, { top: WCOL[W.sopra] || WCOL[W.busto] || PLOOK.top, bottom: WCOL[W.gambe] || PLOOK.bottom }), 'player']; }
    const n = G().byId(st, key.slice(4)); if (!n) return [null, null]; return [n.look || {}, n.cop || n.military ? 'cop' : null];
  }
  const FRAME = { full: { fov: 24, cam: [0, 1.0, 4.9], at: [0, .9, 0] }, bust: { fov: 26, cam: [0, 1.52, 1.75], at: [0, 1.45, 0] }, banco: { fov: 28, cam: [0, 1.35, 3.6], at: [0, 1.22, 0] } };
  function scene3(st, key, frame) {
    const [look, who] = lookOf(st, key); if (!look) return null; const sig = key + frame + JSON.stringify(look);
    let e = R3.sc[key + frame]; if (e && e.sig === sig) return e;
    const T = THREE, sc = new T.Scene(), g = Models.person(look, who); if (!g) return null;
    sc.add(new T.HemisphereLight('#e9dcbc', '#1f3a34', .75)); const d = new T.DirectionalLight('#ffe8c8', .8); d.position.set(-1.5, 3, 3); sc.add(d); const rim = new T.DirectionalLight('#b08d57', .9); rim.position.set(2, 2, -3); sc.add(rim);
    if (g.userData.shadowC) g.userData.shadowC.visible = frame === 'full';
    sc.add(g);
    if (frame === 'banco') { const cnt = new T.Mesh(new T.BoxGeometry(4, .92, .5), new T.MeshLambertMaterial({ color: '#3e2a1a' })); cnt.position.set(0, .46, .75); sc.add(cnt); const top = new T.Mesh(new T.BoxGeometry(4.05, .05, .6), new T.MeshLambertMaterial({ color: '#6a4a2c' })); top.position.set(0, .94, .75); sc.add(top); }
    const F = FRAME[frame] || FRAME.full, cam = new T.PerspectiveCamera(F.fov, 1, .05, 30); cam.position.set(...F.cam); cam.lookAt(...F.at);
    e = R3.sc[key + frame] = { sig, sc, g, cam, rot: e ? e.rot : (frame === 'full' ? -.35 : -.15) };
    return e;
  }
  function draw3(now) {
    requestAnimationFrame(draw3);
    const dt = Math.min(.05, (now - (R3.t || now)) / 1000); R3.t = now;
    const m = $('mu'), st = ST(); if (!U.open || !m || !st || !ready3()) return;
    const cvs = m.querySelectorAll('canvas.r3'); if (!cvs.length) return;
    if (!R3.r) { R3.r = new THREE.WebGLRenderer({ alpha: true, antialias: true }); R3.r.setClearColor(0x000000, 0); }
    const p = st.player;
    cvs.forEach(cv => {
      const key = cv.dataset.r3, e = scene3(st, key, cv.dataset.frame || 'full'); if (!e) return;
      e.g.rotation.y = e.rot;
      try { if (key === 'player') Models.animPerson(e.g, { speed: 0, weapon: p.cur && p.cur !== 'pugni' ? p.cur : null, held: p.hand }, dt); else if (e.g.userData.mixer) e.g.userData.mixer.update(dt); } catch (x) { if (e.g.userData.mixer) e.g.userData.mixer.update(dt); }
      const w = cv.width, h = cv.height; if (R3.r.domElement.width !== w || R3.r.domElement.height !== h) R3.r.setSize(w, h, false);
      e.cam.aspect = w / h; e.cam.updateProjectionMatrix(); R3.r.render(e.sc, e.cam);
      const x = cv.getContext('2d'); x.clearRect(0, 0, w, h); x.drawImage(R3.r.domElement, 0, 0);
    });
  }
  if (typeof window !== 'undefined') requestAnimationFrame(draw3);
  const r3 = (key, frame, w, h, css) => ready3() ? `<canvas class="r3" data-r3="${esc(key)}" data-frame="${frame}" width="${w}" height="${h}" style="${css || ''}"></canvas>` : (key === 'player' ? '<canvas class="fig" width="32" height="64" data-fig="1"></canvas>' : '');
  // =====================================================================================================================
  // STILE
  // =====================================================================================================================
  const CSS = `
#mu { --notte: #0D1015; --mad1: #1F3A34; --mad2: #2B2A3A; --verde: #3A5A50; --vetro: #0F1B19; --ott: #B08D57; --crema: #E9DCBC; --neon: #FF5FA2; --cem: #8D8F8C; --rug: #9B3B2E;
  --fs: 'Instrument Serif', Georgia, 'Times New Roman', serif; --ft: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', sans-serif; --fl: 'Saira Condensed', 'Arial Narrow', system-ui, sans-serif;
  position: absolute; inset: 0; z-index: 64; display: none; color: var(--crema); font-family: var(--ft); background: linear-gradient(90deg, rgba(13,16,21,.0), rgba(13,16,21,.55) 18%, rgba(13,16,21,.55) 82%, rgba(13,16,21,0)); }
#mu.on { display: block; }
/* il dispositivo: madreperla scura, cornice di verderame, rivetti d'ottone; la città resta visibile ai lati */
#mu .case { position: absolute; inset: 22px max(22px, calc(50% - 640px)); display: grid; grid-template-columns: 92px 1fr; gap: 10px; padding: 12px; border-radius: 22px;
  background: linear-gradient(135deg, rgba(31,58,52,.94), rgba(43,42,58,.94) 55%, rgba(31,58,52,.94)); box-shadow: 0 0 0 1px var(--verde), 0 0 0 4px rgba(13,16,21,.8), 0 0 0 5px rgba(176,141,87,.35), 0 30px 80px rgba(0,0,0,.55); }
#mu .case::before, #mu .case::after { content: ''; position: absolute; width: 7px; height: 7px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #e8cf98, var(--ott) 55%, #5a4628); top: 9px; left: 9px; box-shadow: 0 calc(100vh - 80px) 0 0 transparent; }
#mu .case::after { left: auto; right: 9px; }
#mu .rail { display: flex; flex-direction: column; gap: 8px; padding: 10px 0; align-items: center; }
#mu .rail button { position: relative; width: 74px; height: 74px; border-radius: 50%; cursor: pointer; display: grid; place-items: center; align-content: center; gap: 2px; color: var(--crema); padding: 0;
  font: 600 11px/1 var(--fl); letter-spacing: .14em; text-transform: uppercase; border: 1px solid rgba(233,220,188,.18);
  background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.14), transparent 45%), linear-gradient(135deg, #24443c, #2e2c40 50%, #24443c); background-size: 100% 100%, 220% 220%; transition: background-position .5s, transform .08s, box-shadow .2s; }
#mu .rail button canvas { width: 30px; height: 30px; image-rendering: pixelated; opacity: .85; }
#mu .rail button:hover { background-position: 0 0, 100% 100%; border-color: rgba(233,220,188,.4); }
#mu .rail button:active { transform: translateY(1px) scale(.98); }
#mu .rail button.on { box-shadow: inset 0 2px 6px rgba(0,0,0,.5), 0 0 0 2px var(--ott); border-color: transparent; }
#mu .rail button .dot { position: absolute; right: 2px; top: 2px; min-width: 18px; height: 18px; border-radius: 9px; background: var(--neon); color: var(--notte); font: 700 11px/18px var(--fl); text-align: center; padding: 0 4px; letter-spacing: 0; }
#mu .rail .sp { flex: 1; }
#mu .in { position: relative; display: grid; grid-template-rows: auto 1fr auto; min-height: 0; border-radius: 14px; background: var(--vetro); box-shadow: inset 0 0 0 1px rgba(58,90,80,.6), inset 0 10px 30px rgba(0,0,0,.45); }
#mu header { display: flex; align-items: baseline; gap: 16px; padding: 16px 26px 10px; }
#mu header b { font: 400 34px/1 var(--fs); color: var(--crema); white-space: nowrap; }
#mu header span { font: 400 15px var(--fs); font-style: italic; color: rgba(233,220,188,.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
#mu header .tabs { display: flex; gap: 6px; flex-wrap: wrap; align-self: center; margin-left: 6px; font-style: normal; overflow: visible; }
#mu header .x { margin-left: auto; align-self: center; width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(233,220,188,.25); background: none; color: var(--crema); cursor: pointer; font-size: 17px; } #mu header .x:hover { border-color: var(--ott); }
#mu main { min-height: 0; overflow: auto; padding: 8px 26px 18px; scrollbar-color: var(--verde) transparent; }
#mu footer { white-space: nowrap; overflow: hidden; display: flex; align-items: center; gap: 18px; padding: 10px 26px 13px; font: 600 11.5px var(--fl); letter-spacing: .16em; color: rgba(233,220,188,.5); text-transform: uppercase; border-top: 1px solid rgba(58,90,80,.45); }
#mu footer kbd { font: 600 10.5px var(--fl); border: 1px solid rgba(233,220,188,.3); color: var(--crema); padding: 1px 7px; border-radius: 10px; margin-right: 6px; }
#mu footer .r { margin-left: auto; display: flex; gap: 20px; align-items: center; } #mu footer .r b { color: var(--crema); font-weight: 700; } #mu footer .over { color: var(--neon); }
#mu footer .tm { color: var(--ott); }
#mu .msg { position: absolute; left: 50%; bottom: 50px; transform: translateX(-50%); background: var(--mad2); border: 1px solid var(--ott); color: var(--crema); padding: 8px 16px; border-radius: 18px; font-size: 14px; max-width: 70%; text-align: center; pointer-events: none; } #mu .msg.no { border-color: var(--neon); }
#mu h4 { margin: 0 0 10px; font: 600 12px var(--fl); letter-spacing: .2em; text-transform: uppercase; color: rgba(233,220,188,.5); }
#mu .dim { color: rgba(233,220,188,.6); font-size: 13.5px; line-height: 1.5; }
#mu .ic { image-rendering: pixelated; } #mu .ic.tc { image-rendering: auto; }
#mu .link { color: var(--neon); cursor: pointer; text-decoration: none; border-bottom: 1px dotted rgba(255,95,162,.5); } #mu .link:hover { border-bottom-style: solid; }
/* tasti: pillole di madreperla; selezionato = anello d'ottone; il rosa solo per il pericolo */
#mu button.b { cursor: pointer; border-radius: 20px; padding: 8px 18px; color: var(--crema); font: 600 13px var(--fl); letter-spacing: .16em; text-transform: uppercase; border: 1px solid rgba(233,220,188,.22);
  background: radial-gradient(circle at 30% 20%, rgba(255,255,255,.12), transparent 50%), linear-gradient(120deg, #24443c, #2e2c40 50%, #24443c); background-size: 100% 100%, 220% 220%; transition: background-position .5s, transform .08s; }
#mu button.b:hover { background-position: 0 0, 100% 100%; border-color: rgba(233,220,188,.45); } #mu button.b:active { transform: translateY(1px); }
#mu button.b[disabled] { opacity: .35; cursor: default; background-position: 0 0; }
#mu button.b.y { box-shadow: 0 0 0 2px var(--ott); border-color: transparent; }
#mu button.b.bad { color: var(--neon); border-color: rgba(255,95,162,.35); }
#mu button.pill { cursor: pointer; border-radius: 14px; padding: 4px 12px; background: none; border: 1px solid rgba(233,220,188,.2); color: rgba(233,220,188,.7); font: 600 12px var(--fl); letter-spacing: .14em; text-transform: uppercase; }
#mu button.pill.on { color: var(--crema); box-shadow: 0 0 0 2px var(--ott); border-color: transparent; }
/* la Roba: la borsa rovesciata su un piano (marciapiede, tavolo del covo) */
#mu .zaino { display: grid; grid-template-columns: auto minmax(230px, 1fr) 300px; gap: 26px; align-items: start; }
#mu .bag { --c: 48px; position: relative; display: grid; grid-template-columns: repeat(8, var(--c)); grid-auto-rows: var(--c); padding: 14px; border-radius: 10px; }
#mu .bag.strada { background: radial-gradient(ellipse at 40% 30%, rgba(255,200,140,.07), transparent 60%), repeating-linear-gradient(0deg, transparent 0 49px, rgba(0,0,0,.35) 49px 50px), repeating-linear-gradient(90deg, transparent 0 99px, rgba(0,0,0,.3) 99px 100px), linear-gradient(#3a3d40, #2c2f33); box-shadow: inset 0 0 0 1px rgba(0,0,0,.4), inset 0 -30px 60px rgba(0,0,0,.35); }
#mu .bag.covo { background: radial-gradient(ellipse at 45% 25%, rgba(255,200,120,.16), transparent 60%), repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 2px, transparent 2px 61px), linear-gradient(#5a3e2a, #3e2a1c); box-shadow: inset 0 0 0 2px #2a1c12, inset 0 -30px 60px rgba(0,0,0,.35); }
#mu .tile { position: relative; margin: 3px; border: 0; background: none; cursor: pointer; display: grid; place-items: center; padding: 0; border-radius: 8px; transition: transform .12s; }
#mu .tile::before { content: ''; position: absolute; inset: 18% 10% 4%; border-radius: 50%; background: radial-gradient(ellipse, rgba(0,0,0,.45), transparent 70%); transform: translateY(30%); }
#mu .tile canvas { position: relative; width: 36px; height: 36px; } #mu .tile.w canvas { width: 76px; height: 38px; } #mu .tile.big canvas { width: 72px; height: 72px; } #mu .tile.big.w canvas { width: 140px; height: 70px; }
#mu .tile:hover { transform: translateY(-3px); } #mu .tile.sel { box-shadow: 0 0 0 2px var(--ott); background: rgba(176,141,87,.08); }
#mu .tile .q { position: absolute; right: 3px; bottom: 0; font: 700 13px var(--fl); color: var(--crema); text-shadow: 0 1px 2px #000; }
#mu .tile .on { position: absolute; left: 4px; top: 4px; width: 7px; height: 7px; border-radius: 50%; background: var(--ott); }
#mu .tile.ill .q, #mu .tile.ill::after { color: var(--neon); } #mu .tile.ill::after { content: '•'; position: absolute; right: 4px; top: 0; font-size: 16px; }
#mu .tile.no { opacity: .35; } #mu .tile .wear { position: absolute; left: 8px; right: 8px; bottom: 2px; height: 2px; background: rgba(0,0,0,.4); } #mu .tile .wear b { display: block; height: 100%; background: var(--crema); opacity: .7; }
#mu .tile .pr { position: absolute; left: 0; right: 0; bottom: 0; font: 700 12px var(--fl); letter-spacing: .04em; color: var(--crema); text-align: center; text-shadow: 0 1px 2px #000; }
#mu .det { display: grid; gap: 12px; align-content: start; }
#mu .det .hd { display: grid; grid-template-columns: 92px 1fr; gap: 14px; align-items: center; }
#mu .det .pic { width: 92px; height: 92px; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, rgba(233,220,188,.1), transparent 60%), rgba(31,58,52,.5); box-shadow: inset 0 0 0 1px rgba(58,90,80,.8); } #mu .det .pic canvas { width: 60px; height: 60px; } #mu .det .pic.w canvas { width: 78px; height: 39px; }
#mu .det .nm { font: 400 30px/1.05 var(--fs); color: var(--crema); } #mu .det .ct { font: 600 11.5px var(--fl); letter-spacing: .18em; color: rgba(233,220,188,.5); text-transform: uppercase; margin-top: 4px; }
#mu .det .ds { font-size: 14.5px; color: rgba(233,220,188,.8); line-height: 1.5; } #mu .det .row { display: flex; gap: 8px; flex-wrap: wrap; }
#mu .stat { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; font: 600 11.5px var(--fl); letter-spacing: .14em; color: rgba(233,220,188,.55); text-transform: uppercase; } #mu .stat em { font-style: normal; color: var(--crema); }
#mu .stat i { grid-column: 1 / 3; height: 2px; background: rgba(233,220,188,.12); border-radius: 1px; } #mu .stat i b { display: block; height: 100%; background: var(--crema); opacity: .75; } #mu .stat i b.r { background: var(--neon); opacity: 1; } #mu .stat i b.w { background: var(--ott); opacity: 1; } #mu .stat i b.g { background: var(--crema); }
#mu .who { display: grid; gap: 10px; justify-items: center; }
#mu .who .nmw { font: 400 30px var(--fs); }
#mu .dress { display: grid; grid-template-columns: 56px 1fr 56px; gap: 6px; align-items: center; width: 100%; }
#mu .dress .col { display: grid; gap: 10px; }
#mu .ws { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; position: relative; background: rgba(31,58,52,.45); box-shadow: inset 0 0 0 1px rgba(58,90,80,.8); font: 600 9.5px var(--fl); letter-spacing: .12em; text-transform: uppercase; color: rgba(233,220,188,.35); text-align: center; line-height: 1.1; }
#mu .ws.full { cursor: pointer; box-shadow: inset 0 0 0 1px rgba(176,141,87,.7); background: radial-gradient(circle at 35% 30%, rgba(233,220,188,.12), transparent 60%), rgba(31,58,52,.6); } #mu .ws.full:hover { box-shadow: 0 0 0 2px var(--ott); }
#mu .ws canvas { width: 34px; height: 34px; } #mu .ws.w canvas { width: 44px; height: 22px; } #mu .ws.lit { box-shadow: 0 0 0 2px var(--ott); }
#mu .hands { display: flex; gap: 14px; justify-content: center; } #mu .hands .ws { width: 64px; height: 64px; } #mu .hands label { display: grid; gap: 4px; justify-items: center; font: 600 10px var(--fl); letter-spacing: .14em; text-transform: uppercase; color: rgba(233,220,188,.5); }
#mu canvas.r3 { display: block; cursor: grab; } #mu canvas.r3:active { cursor: grabbing; }
#mu canvas.fig { width: 140px; height: 280px; image-rendering: pixelated; }
#mu .slots { display: flex; gap: 8px; } #mu .slot { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; position: relative; cursor: pointer; background: rgba(31,58,52,.5); box-shadow: inset 0 0 0 1px rgba(58,90,80,.8); }
#mu .slot canvas { width: 40px; height: 20px; } #mu .slot.on { box-shadow: 0 0 0 2px var(--ott); } #mu .slot .q { position: absolute; right: 0; bottom: -2px; font: 700 11px var(--fl); color: var(--crema); } #mu .slot.e { cursor: default; opacity: .4; }
/* Chi è */
#mu .pg { display: grid; grid-template-columns: 260px 1fr 1fr; gap: 30px; align-items: start; }
#mu .mcard { display: grid; gap: 10px; align-content: start; padding: 4px 0 14px; border-bottom: 1px solid rgba(58,90,80,.45); }
#mu .mcard .big { font: 400 30px/1.05 var(--fs); color: var(--crema); } #mu .mcard .y { font: italic 400 17px var(--fs); color: rgba(233,220,188,.7); }
#mu .ab { display: grid; grid-template-columns: 38px 1fr; gap: 12px; align-items: center; padding: 6px 0; }
#mu .ab canvas { width: 32px; height: 32px; } #mu .ab b { display: block; font: 400 19px var(--fs); color: var(--crema); } #mu .ab small { color: rgba(233,220,188,.55); font-size: 12.5px; }
#mu .fr3 { display: grid; grid-template-columns: 64px 1fr; gap: 12px; align-items: center; padding: 6px 0; } #mu .fr3 canvas { width: 64px; height: 64px; border-radius: 50%; background: rgba(31,58,52,.5); }
#mu .fr3 b { font: 400 20px var(--fs); font-weight: 400; } #mu .fr3 small { display: block; color: rgba(233,220,188,.55); font-size: 12.5px; }
/* Banco e Quaderno */
#mu .lav { display: grid; grid-template-columns: 1fr minmax(300px, 360px); gap: 28px; align-items: start; }
#mu .recs { display: grid; grid-template-columns: repeat(auto-fill, 84px); gap: 4px; padding: 14px; border-radius: 10px; background: radial-gradient(ellipse at 45% 20%, rgba(255,200,120,.12), transparent 60%), repeating-linear-gradient(90deg, rgba(0,0,0,.16) 0 2px, transparent 2px 70px), linear-gradient(#4e3826, #36261a); box-shadow: inset 0 0 0 2px #2a1c12; }
#mu .rec { position: relative; width: 84px; height: 88px; background: none; border: 0; border-radius: 8px; cursor: pointer; display: grid; grid-template-rows: 52px 1fr; justify-items: center; align-items: center; padding: 4px 3px; color: var(--crema); }
#mu .rec canvas { width: 40px; height: 40px; filter: drop-shadow(0 4px 3px rgba(0,0,0,.5)); } #mu .rec span { font: 500 11.5px/1.15 var(--ft); color: rgba(233,220,188,.85); text-align: center; overflow: hidden; max-height: 2.3em; }
#mu .rec:hover { background: rgba(255,255,255,.04); } #mu .rec.no { opacity: .35; } #mu .rec.sel { box-shadow: 0 0 0 2px var(--ott); }
#mu .rec.ok::after { content: ''; position: absolute; right: 7px; top: 7px; width: 7px; height: 7px; border-radius: 50%; background: var(--ott); }
#mu .ing { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 6px 14px; }
#mu .ing div { display: grid; grid-template-columns: 36px 1fr; gap: 8px; align-items: center; font-size: 13px; }
#mu .ing canvas { width: 32px; height: 32px; } #mu .ing .y { color: var(--crema); } #mu .ing .n { color: var(--neon); } #mu .ing .t { color: var(--ott); }
/* Bottega: il commerciante vero dietro il banco */
#mu .shop { display: grid; grid-template-columns: minmax(300px, 400px) 1fr; gap: 28px; align-items: start; }
#mu .sc { position: relative; border-radius: 12px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(58,90,80,.8); }
#mu .shop .scene { width: 100%; aspect-ratio: 120 / 80; image-rendering: pixelated; display: block; filter: saturate(.7) brightness(.85); }
#mu .sc canvas.r3 { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; }
#mu .sc .sign { position: absolute; left: 25.8%; width: 48.4%; top: 2.6%; height: 7.4%; display: grid; place-items: center; font: 600 clamp(9px, 1vw, 13px) var(--fl); letter-spacing: .16em; text-transform: uppercase; color: var(--crema); white-space: nowrap; overflow: hidden; z-index: 2; }
#mu .bubble { position: relative; padding: 12px 2px 0; font: italic 400 21px/1.3 var(--fs); color: var(--crema); }
#mu .bubble b { display: block; font: 600 11.5px var(--fl); font-style: normal; letter-spacing: .2em; text-transform: uppercase; color: rgba(233,220,188,.5); margin-bottom: 4px; }
#mu .goods { display: grid; grid-template-columns: repeat(auto-fill, 70px); grid-auto-rows: 74px; gap: 4px; margin-top: 18px; }
#mu .goods .tile canvas { width: 38px; height: 38px; margin-bottom: 12px; } #mu .goods .tile.w canvas { width: 60px; height: 30px; }
#mu .goods .grp { grid-column: 1 / -1; font: 600 12px var(--fl); letter-spacing: .2em; color: rgba(233,220,188,.45); text-transform: uppercase; align-self: end; }
/* Lavori e Qui */
#mu .jobs { display: grid; grid-template-columns: minmax(280px, 380px) 1fr; gap: 28px; align-items: start; }
#mu .list { display: grid; gap: 0; }
#mu .li { display: grid; grid-template-columns: 36px 1fr auto; gap: 12px; align-items: center; padding: 9px 6px; border-bottom: 1px solid rgba(58,90,80,.35); cursor: pointer; font-size: 14px; }
#mu .li:hover { background: rgba(255,255,255,.03); } #mu .li.sel { box-shadow: inset 3px 0 0 var(--ott); } #mu .li canvas { width: 32px; height: 32px; }
#mu .li .t { font: 400 19px var(--fs); } #mu .li small { display: block; color: rgba(233,220,188,.55); font-size: 12.5px; } #mu .li .r { text-align: right; font: 600 13px var(--fl); letter-spacing: .06em; color: rgba(233,220,188,.65); } #mu .li .r b { color: var(--crema); }
#mu .li.off { opacity: .45; }
#mu .acts { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
#mu .act { display: grid; grid-template-columns: 44px 1fr; gap: 12px; align-items: center; text-align: left; cursor: pointer; color: var(--crema); font: 400 19px/1.15 var(--fs); padding: 12px 16px; border-radius: 30px; border: 1px solid rgba(233,220,188,.18);
  background: radial-gradient(circle at 20% 10%, rgba(255,255,255,.08), transparent 50%), linear-gradient(120deg, #22403a, #2b2a3a 50%, #22403a); background-size: 100% 100%, 220% 220%; transition: background-position .5s; }
#mu .act:hover { background-position: 0 0, 100% 100%; border-color: rgba(233,220,188,.4); } #mu .act canvas { width: 36px; height: 36px; } #mu .act small { display: block; font: 400 12.5px var(--ft); color: rgba(233,220,188,.55); margin-top: 3px; }
#mu .act.bad { border-color: rgba(255,95,162,.4); } #mu .act[disabled] { opacity: .4; cursor: default; }
/* Frugare */
#mu .fr2 { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: start; }
#mu .loot { display: grid; grid-template-columns: repeat(auto-fill, 80px); grid-auto-rows: 88px; gap: 4px; padding: 14px; border-radius: 10px; background: linear-gradient(#2c2f33, #24272b); box-shadow: inset 0 0 0 1px rgba(0,0,0,.4); }
#mu .loot .tile { grid-template-rows: 50px 1fr; padding: 4px 3px; margin: 0; } #mu .loot .tile canvas { width: 40px; height: 40px; } #mu .loot .tile em { position: relative; font: 500 11.5px/1.15 var(--ft); font-style: normal; color: rgba(233,220,188,.85); text-align: center; overflow: hidden; max-height: 2.3em; }
#mu .loot .tile .q { top: 3px; bottom: auto; } #mu .loot .tile.t-raro .q, #mu .loot .tile.t-prezioso em { color: var(--ott); } #mu .loot .tile.shop em { color: var(--neon); }
#mu .inv { display: grid; grid-template-columns: auto minmax(280px, 1fr); gap: 28px; align-items: start; }
#mu .inv .bag { --c: 62px; }
#mu .mappa canvas { width: 100%; height: auto; border-radius: 12px; box-shadow: inset 0 0 0 1px #3A5A50, 0 0 0 1px #3A5A50; cursor: pointer; display: block; image-rendering: pixelated; }
#mu .mlegenda { display: flex; gap: 18px; margin-top: 10px; font: 600 11px var(--fl); letter-spacing: .14em; text-transform: uppercase; color: rgba(233,220,188,.6); } #mu .mlegenda i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
/* il pulsante ZAINO */
#muBtn { position: absolute; right: 16px; bottom: 18px; z-index: 31; width: 78px; height: 78px; border-radius: 50%; cursor: pointer; display: grid; place-items: center; align-content: center; gap: 0; color: #E9DCBC;
  font: 700 11px 'Saira Condensed', 'Arial Narrow', sans-serif; letter-spacing: .18em; text-transform: uppercase; border: 1px solid rgba(233,220,188,.25);
  background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.16), transparent 45%), linear-gradient(135deg, #24443c, #2e2c40 50%, #24443c); box-shadow: 0 0 0 3px rgba(13,16,21,.8), 0 0 0 4px #B08D57, 0 8px 20px rgba(0,0,0,.5); }
#muBtn:hover { transform: translateY(-1px); } #muBtn canvas { width: 44px; height: 44px; } #muBtn .dot { position: absolute; right: 0; top: 0; min-width: 20px; height: 20px; border-radius: 10px; background: #FF5FA2; color: #0D1015; font: 700 12px/20px 'Saira Condensed', sans-serif; text-align: center; letter-spacing: 0; }
#muBtn kbd { font: 600 9px 'Saira Condensed', sans-serif; color: #B08D57; margin-left: 4px; letter-spacing: 0; }
#ts-btn { display: none !important; }
#mu .roba { display: grid; grid-template-columns: minmax(380px, 470px) 1fr; gap: 26px; align-items: start; }
#mu .roba .bag { --c: 62px; grid-template-columns: repeat(7, var(--c)); }
#mu .tile { grid-template-rows: 1fr auto; } #mu .tile canvas.tc { width: 44px; height: 44px; } #mu .tile.w canvas.tc { width: 100px; height: 50px; } #mu .tile.big canvas.tc { width: 90px; height: 90px; }
#mu .tile em.tn { position: relative; font: 500 10px/1 var(--ft); font-style: normal; color: rgba(233,220,188,.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; padding: 0 2px 3px; text-shadow: 0 1px 2px #000; }
#mu .tile .q { top: 2px; bottom: auto; }
#mu .tile[draggable="true"] { cursor: grab; } #mu .dragging { opacity: .35; } #mu .over { box-shadow: 0 0 0 2px var(--ott) !important; background: rgba(176,141,87,.1) !important; }
#mu .addosso { display: grid; gap: 12px; }
#mu .ah { display: flex; align-items: baseline; gap: 14px; } #mu .ah .nmw { font: 400 30px var(--fs); }
#mu .dress2 { display: grid; grid-template-columns: 1fr 190px 1fr; gap: 10px; align-items: center; }
#mu .zc { display: grid; gap: 8px; align-content: center; }
#mu .zr { padding: 6px 8px; border-radius: 10px; background: rgba(31,58,52,.32); box-shadow: inset 0 0 0 1px rgba(58,90,80,.5); min-height: 62px; }
#mu .zr label { display: block; font: 600 10px var(--fl); letter-spacing: .18em; text-transform: uppercase; color: rgba(233,220,188,.45); margin-bottom: 3px; }
#mu .chips { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; } #mu .chips .sep { font-style: normal; color: rgba(233,220,188,.3); font-size: 12px; } #mu .chips .vuoto { font: italic 13px var(--fs); color: rgba(233,220,188,.3); }
#mu .chip { position: relative; width: 50px; display: grid; justify-items: center; cursor: grab; border-radius: 8px; padding: 2px 0; } #mu .chip:hover { background: rgba(255,255,255,.05); } #mu .chip.lit { box-shadow: 0 0 0 1px var(--ott); }
#mu .chip canvas { width: 34px; height: 34px; } #mu .chip em { font: 500 9.5px/1.1 var(--ft); font-style: normal; color: rgba(233,220,188,.8); max-width: 50px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#mu .chip b { position: absolute; right: 0; top: -2px; width: 15px; height: 15px; border-radius: 50%; font: 700 11px/15px var(--ft); text-align: center; color: var(--notte); background: var(--crema); opacity: 0; cursor: pointer; } #mu .chip:hover b { opacity: .85; }
#mu .nino { display: grid; place-items: center; border-radius: 50% 50% 12px 12px; background: radial-gradient(ellipse at 50% 85%, rgba(176,141,87,.18), transparent 60%); }
#mu .hands { display: grid; grid-template-columns: 1fr auto 1fr; gap: 14px; align-items: center; justify-items: center; }
#mu .hand { display: grid; justify-items: center; gap: 4px; } #mu .hand label { font: 600 10.5px var(--fl); letter-spacing: .16em; text-transform: uppercase; color: rgba(233,220,188,.55); }
#mu .hs { width: 110px; height: 70px; border-radius: 35px; display: grid; place-items: center; background: rgba(31,58,52,.45); box-shadow: inset 0 0 0 1px rgba(58,90,80,.8); } #mu .hs.full { box-shadow: 0 0 0 2px var(--ott); cursor: grab; } #mu .hs span { font: italic 14px var(--fs); color: rgba(233,220,188,.35); }
#mu .hs canvas { width: 48px; height: 48px; } #mu .hs canvas[data-w="1"] { width: 96px; height: 48px; } #mu .hb { display: grid; gap: 6px; }
#mu .ab2 { display: flex; justify-content: space-between; align-items: center; gap: 14px; } #mu .ab2 .stat { flex: 1; max-width: 300px; }
/* il banco */
#mu .rec canvas.tc { width: 52px; height: 52px; }
#mu .armi { margin-bottom: 18px; } #mu .wrow { display: grid; grid-template-columns: 150px 1fr; gap: 14px; align-items: start; padding: 10px 0; border-bottom: 1px solid rgba(58,90,80,.4); }
#mu .wn { display: grid; gap: 4px; } #mu .wn canvas { width: 130px; height: 65px; } #mu .wn b { font: 400 20px var(--fs); }
#mu .wm { display: flex; flex-wrap: wrap; gap: 8px; } #mu .mod { width: 190px; padding: 8px 10px; border-radius: 12px; background: rgba(31,58,52,.4); box-shadow: inset 0 0 0 1px rgba(58,90,80,.7); display: grid; gap: 4px; }
#mu .mod.on { box-shadow: 0 0 0 2px var(--ott); } #mu .mod b { font: 400 17px var(--fs); } #mu .mod small { font-size: 11.5px; color: rgba(233,220,188,.6); } #mu .mod small.n { color: var(--neon); } #mu .mod em { font: 600 11px var(--fl); letter-spacing: .16em; text-transform: uppercase; color: var(--ott); font-style: normal; }
#mu .bench { margin-top: 10px; border-radius: 10px; padding: 10px 12px 14px; background: radial-gradient(ellipse at 50% 0%, rgba(255,210,140,.18), transparent 70%), repeating-linear-gradient(90deg, rgba(0,0,0,.16) 0 2px, transparent 2px 64px), linear-gradient(#5a3e28, #3a281a); box-shadow: inset 0 0 0 2px #2a1c12, 0 10px 20px rgba(0,0,0,.35); }
#mu .peg { display: flex; gap: 8px; flex-wrap: wrap; padding: 6px 8px 10px; margin: -2px -4px 10px; border-radius: 6px; background: radial-gradient(circle, rgba(0,0,0,.35) 1.5px, transparent 2px) 0 0 / 14px 14px, #6a5844; }
#mu .tool, #mu .pz { position: relative; display: grid; justify-items: center; width: 74px; } #mu .tool canvas, #mu .pz canvas { width: 56px; height: 56px; filter: drop-shadow(0 6px 4px rgba(0,0,0,.45)); }
#mu .tool em, #mu .pz em { font: 500 11px/1.1 var(--ft); font-style: normal; color: var(--crema); text-align: center; text-shadow: 0 1px 2px #000; }
#mu .pz b { position: absolute; right: 4px; top: 0; font: 700 12px var(--fl); color: var(--crema); background: rgba(13,16,21,.75); border-radius: 8px; padding: 0 5px; } #mu .pz.miss b { color: var(--neon); } #mu .pz.miss canvas, #mu .tool.miss canvas { opacity: .35; filter: grayscale(1); }
#mu .top { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 4px; } #mu .top .plus { font: 400 22px var(--fs); font-style: normal; color: rgba(233,220,188,.5); }
#mu .arrow { text-align: center; font: 400 26px var(--fs); color: var(--ott); margin: 4px 0; }
#mu .res { display: flex; justify-content: center; gap: 10px; padding: 12px; border-radius: 50%; background: radial-gradient(circle, rgba(176,141,87,.12), transparent 65%); }
#mu .res.ok { background: radial-gradient(circle, rgba(232,207,152,.28), transparent 65%); } #mu .pz.big { width: 120px; } #mu .pz.big canvas { width: 96px; height: 96px; } #mu .pz.big em { font: 400 19px var(--fs); }
@media (max-width: 1240px) { #mu .roba { grid-template-columns: 1fr; } }
@media (max-width: 1240px) { #mu .zaino { grid-template-columns: auto 1fr; } #mu .zaino .who { display: none; } #mu .pg { grid-template-columns: 220px 1fr; } #mu .pg > :last-child { grid-column: 1 / -1; } }
@media (max-width: 900px) { #mu .case { inset: 6px; grid-template-columns: 64px 1fr; } #mu .rail button { width: 56px; height: 56px; font-size: 9px; } #mu .rail button canvas { width: 22px; height: 22px; } #mu .zaino, #mu .lav, #mu .shop, #mu .jobs, #mu .fr2, #mu .pg { grid-template-columns: 1fr; } #mu .bag { --c: 34px; } #mu footer .k { display: none; } }
`;

  // =====================================================================================================================
  // SCHEDE
  // =====================================================================================================================
  const TABS = [['mappa', 'Mappa', 'mappa'], ['zaino', 'Inventario', 'zaino'], ['equip', 'Equip.', 'maglione'], ['lavora', 'Crafting', 'martello'], ['pg', 'Chi è', 'cappello'], ['lavori', 'Lavori', 'chiave_inglese'], ['qui', 'Qui', 'giornale']];
  const CTX = { bottega: ['Bottega', 'moneta_shop'], fruga: ['Frugare', 'casse'] };
  function mount() {
    if ($('mu')) return true;
    const app = $('app'); if (!app || !PV() || typeof Oggetti === 'undefined') return false;
    const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
    const m = document.createElement('div'); m.id = 'mu'; m.setAttribute('role', 'dialog'); app.appendChild(m);
    m.addEventListener('click', onClick); m.addEventListener('dblclick', onDbl);
    m.addEventListener('pointerdown', e => { const c = e.target.closest('canvas.r3'); if (c) R3.drag = { k: c.dataset.r3 + (c.dataset.frame || 'full'), x: e.clientX }; });
    addEventListener('pointermove', e => { if (!R3.drag) return; const E = R3.sc[R3.drag.k]; if (E) E.rot += (e.clientX - R3.drag.x) * .012; R3.drag.x = e.clientX; });
    addEventListener('pointerup', () => { R3.drag = null; });
    // trascinare: dalla borsa addosso, da uno strato all'altro, nelle mani, e indietro nella borsa
    m.addEventListener('dragstart', e => { const d = e.target.closest('[data-drag]'); if (!d) return; U.drag = d.dataset.drag; d.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', U.drag); e.dataTransfer.effectAllowed = 'move'; } catch (x) { } });
    m.addEventListener('dragend', () => { U.drag = null; m.querySelectorAll('.dragging,.over').forEach(x => x.classList.remove('dragging', 'over')); render(true); });
    m.addEventListener('dragover', e => { const t = e.target.closest('[data-drop]'); if (!t || !U.drag) return; e.preventDefault(); m.querySelectorAll('.over').forEach(x => { if (x !== t) x.classList.remove('over'); }); t.classList.add('over'); });
    m.addEventListener('drop', e => { const t = e.target.closest('[data-drop]'); if (!t || !U.drag) return; e.preventDefault(); const src = U.drag; U.drag = null; dropOn(src, t, e.clientX); render(true); });
    return true;
  }
  function open(tab, arg) {
    if (!mount()) return;
    if (typeof OggettiUI !== 'undefined' && OggettiUI.state && OggettiUI.state.open) try { OggettiUI.close(); } catch (e) { }
    if (typeof SoldiUI !== 'undefined' && SoldiUI.state && SoldiUI.state.open) try { SoldiUI.close(); } catch (e) { }
    if (U.tab !== tab || U.arg !== arg) U.sel = null;
    U.open = true; U.tab = tab || 'zaino'; U.arg = arg === undefined ? null : arg; U.msg = ''; U.sig = ''; if (tab === 'bottega') U.shopTab = 'compra';
    if (PV().ui) { PV().ui.menu = true; PV().ui.menuSlow = !inCovo(ST()); }   // in strada il mondo rallenta, nel covo si ferma
    $('mu').classList.add('on'); render(true);
  }
  const inCovo = st => { if (!st) return false; const p = st.player; return !!O().pocketsView(st).base || !!(p.indoor && G().BUILDINGS[p.indoor.b] && G().BUILDINGS[p.indoor.b].playerHome); };
  function close() { U.open = false; const m = $('mu'); if (m) m.classList.remove('on'); if (PV() && PV().ui) { PV().ui.menu = false; PV().ui.menuSlow = false; } const cv = $('cv'); if (cv) cv.focus(); }
  function toggle(tab) { if (U.open && (!tab || U.tab === tab)) close(); else open(tab || 'zaino'); }
  function say(r) { if (!r) return r; const m = typeof r === 'string' ? r : r.msg; if (m) { U.msg = m; U.ok = typeof r === 'string' ? true : r.ok !== false; U.msgT = Date.now(); } return r; }
  const act = (id, arg, ex) => say(O().act(ST(), id, arg, ex));
  const btn = (a, label, x, cls, dis) => `<button class="b ${cls || ''}" data-a="${a}"${x !== undefined ? ` data-x="${esc(JSON.stringify(x))}"` : ''}${dis ? ' disabled' : ''}>${esc(label)}</button>`;

  function render(force) {
    const st = ST(); if (!st || !U.open || (U.drag && !force)) return;
    let body = '', title = '', sub = '', tabs = '';
    try {
      if (U.tab === 'zaino') [title, sub, body] = ['Inventario', inCovo(st) ? 'la roba sul tavolo del covo' : 'la roba rovesciata sul marciapiede', pZaino(st, 'inv')];
      else if (U.tab === 'equip') [title, sub, body] = ['Equipaggiamento', 'quello che hai addosso e in mano', pZaino(st, 'equip')];
      else if (U.tab === 'mappa') [title, sub, body] = ['Mappa', 'clicca un posto: ci vai a piedi', pMappa(st)];
      else if (U.tab === 'pg') [title, sub, body] = ['Chi è', 'Nino', pPg(st)];
      else if (U.tab === 'lavora') { const v = O().recipesView(st); title = U.arg && U.arg.titolo ? U.arg.titolo : 'Crafting'; sub = v.stations.length ? `a mano, e qui: ${v.stations.join(', ')}` : 'a mano: per il resto serve una postazione'; tabs = KINDS.map(([k, l]) => `<button class="pill ${U.filt === k ? 'on' : ''}" data-a="filt" data-x='"${k}"'>${l} ${v.list.filter(r => (k === 'tutto' || r.kind === k) && r.ok).length}</button>`).join(''); body = pLavora(st, v); }
      else if (U.tab === 'lavori') [title, sub, body] = ['Lavori', '', pLavori(st)];
      else if (U.tab === 'baule') { const B0 = typeof Cantiere !== 'undefined' && Cantiere.bauleHere(st); title = 'Baule'; sub = B0 ? 'del covo · ci sta tutto' : 'qui non c\'è un baule'; body = B0 ? pBaule(st, B0) : '<div class="dim">Il baule sta nei covi: casa tua, le basi, i posti che reclami (cantiere, Y).</div>'; }
      else if (U.tab === 'qui') [title, sub, body] = ['Qui, adesso', G().nearestPlace ? G().nearestPlace(st.player.x, st.player.y).name : '', pQui(st)];
      else if (U.tab === 'bottega') { const c = O().counter(st, U.arg); if (!c) { open('zaino'); return; } title = c.label; sub = c.emporio ? 'prezzi del regime' : c.black ? 'mercato nero: tutto, a prezzo doppio' : c.market ? 'mercato' : ''; tabs = ['compra', 'vendi'].map(t => `<button class="pill ${U.shopTab === t ? 'on' : ''}" data-a="shoptab" data-x='"${t}"'>${t === 'compra' ? 'Compra' : `Vendi ${c.buys.length}`}</button>`).join(''); body = pBottega(st, c); }
      else if (U.tab === 'fruga') { const v = O().frugaView(st, U.arg); if (!v) { close(); return; } title = 'Fruga'; sub = v.label; body = pFruga(st, v); }
    } catch (e) { body = `<div class="dim">Qualcosa non va: ${esc(e.message)}</div>`; console.error('[Menu]', e); }
    const pv = O().pocketsView(st), over = pv.peso > pv.cap;
    const hasB = typeof Cantiere !== 'undefined' && Cantiere.bauleHere && !!Cantiere.bauleHere(st);
    const rail = TABS.concat(hasB ? [['baule', 'Baule', 'casse']] : []).map(([k, l, ico]) => `<button class="${U.tab === k ? 'on' : ''}" data-a="tab" data-x='"${k}"'>${ic(ico).replace('<canvas', '<canvas data-nt="1"')}${l}${k === 'qui' && quiCount(st) ? `<span class="dot">${quiCount(st)}</span>` : ''}</button>`).join('')
      + (U.tab === 'bottega' || U.tab === 'fruga' ? `<span class="sp"></span><button class="on">${ic(U.tab === 'bottega' ? 'valuta' : 'casse')}${CTX[U.tab][0]}</button>` : '');
    const showMsg = U.msg && Date.now() - (U.msgT || 0) < 6000;
    const html = `<div class="case"><nav class="rail">${rail}</nav><div class="in">
      <header><b>${esc(title)}</b><span>${esc(sub)}</span><span class="tabs">${tabs}</span><button class="x" data-a="close" aria-label="Chiudi">×</button></header>
      <main>${body}</main>
      <footer><span class="tm">${inCovo(st) ? 'nel covo il tempo aspetta' : 'il mondo va avanti, piano'}</span><span class="k"><kbd>I</kbd>zaino</span><span class="k"><kbd>K</kbd>crafting</span><span class="k"><kbd>1-7</kbd>schede</span><span class="k"><kbd>Esc</kbd>gioco</span>
        <span class="r"><span class="${over ? 'over' : ''}">${pv.peso}/${pv.cap} kg${over ? ' · troppo peso' : ''}</span><span>in tasca <b>${L(pv.money)}</b> lire</span></span></footer>
      ${showMsg ? `<div class="msg ${U.ok ? '' : 'no'}">${esc(U.msg)}</div>` : ''}</div></div>`;
    if (!force && html === U.sig) return; U.sig = html;
    const m = $('mu'), sc = m.querySelector('main') ? m.querySelector('main').scrollTop : 0;
    m.innerHTML = html; paintAll(m); const mm = m.querySelector('main'); if (mm) mm.scrollTop = sc;
  }

  // ---------------- ZAINO ----------------
  function bagItems(st) {
    const pv = O().pocketsView(st), az = (typeof Azioni !== 'undefined' && Azioni.playerItems) ? Azioni.playerItems(st) : [];
    const seen = new Set(), out = [];
    az.filter(x => x.id && x.id !== 'pugni' && !O().CAT[x.id]).forEach(x => { seen.add(x.id); out.push({ id: x.id, nome: x.name || x.id, cat: 'armi', catLabel: 'Armi', q: x.count != null ? x.count : null, peso: 1, eq: true, on: x.on }); });
    pv.items.forEach(i => { if (seen.has(i.id)) return; const a = az.find(x => x.id === i.id); out.push(Object.assign({}, i, { eq: !!a, on: !!(a && a.on) })); });
    return { pv, items: out };
  }
  function sizeOf(i) { if (wideIcon(i.id) || LONG.test(i.id)) return [2, 1]; const w = (i.peso || .5) * Math.min(i.q || 1, 4); return w >= 6 ? [2, 2] : [1, 1]; }
  function pack(items, cols) {
    const grid = [], put = []; const free = (x, y, w, h) => { if (x + w > cols) return false; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((grid[y + j] || [])[x + i]) return false; return true; };
    const order = items.map((it, k) => ({ it, k, s: sizeOf(it) })).sort((a, b) => (b.s[0] * b.s[1]) - (a.s[0] * a.s[1]) || a.k - b.k);
    order.forEach(o => { for (let y = 0; ; y++) { let done = false; for (let x = 0; x < cols; x++) if (free(x, y, o.s[0], o.s[1])) { for (let j = 0; j < o.s[1]; j++) { grid[y + j] = grid[y + j] || []; for (let i = 0; i < o.s[0]; i++) grid[y + j][x + i] = 1; } put.push({ it: o.it, x, y, w: o.s[0], h: o.s[1] }); done = true; break; } if (done) break; } });
    return { put, rows: Math.max(6, grid.length) };
  }
  // nomi sintetici: «Martello», «Vino», «Scatoletta»
  const corto = id => { const c = O().CAT[id]; if (c && c.corto) return c.corto; let n = (c ? c.nome : id).replace(/\s*\(.*$/, '').replace(/\s+(di|da|per|a|al|del|della|dei|con|in)\s.*$/, ''); n = cap(n); return n.length > 13 ? n.slice(0, 12) + '…' : n; };
  function pZaino(st, mode) {
    const all = bagItems(st), pv = all.pv, GR0 = typeof Guardaroba !== 'undefined' ? Guardaroba : null;
    // nell'equipaggiamento accanto a Nino c'è solo la roba che si indossa o si tiene in mano
    const items = mode === 'equip' ? all.items.filter(i => (GR0 && GR0.CAPO[i.id]) || i.eq || (O().canHold && O().canHold(i.id))) : all.items, P = pack(items, mode === 'equip' ? 5 : 9);
    if (!U.sel || !items.some(i => i.id === U.sel)) U.sel = items[0] ? items[0].id : null;
    const sel = items.find(i => i.id === U.sel);
    const tiles = P.put.map(o => { const i = o.it, wide = o.w === 2 && o.h === 1, big = o.h === 2;
      return `<button class="tile ${wide ? 'w' : ''} ${big ? 'big' : ''} ${i.id === U.sel ? 'sel' : ''} ${i.ill ? 'ill' : ''}" style="grid-column:${o.x + 1}/span ${o.w};grid-row:${o.y + 1}/span ${o.h}" data-a="sel" data-x="${esc(JSON.stringify(i.id))}" draggable="true" data-drag="b:${esc(i.id)}" title="${esc(cap(i.nome))}">${ic(i.id, wide ? 32 : 16)}<em class="tn">${esc(corto(i.id))}</em>${i.on ? '<span class="on"></span>' : ''}${i.q != null && i.q > 1 ? `<span class="q">${i.q}</span>` : ''}${i.tool != null ? `<span class="wear"><b style="width:${i.tool}%"></b></span>` : ''}</button>`; }).join('');
    const GW = typeof Guardaroba !== 'undefined' ? Guardaroba.view(st) : null;
    const zrow = z => { const capi = z.capi; return `<div class="zr" data-drop="z:${z.zona}"><label>${esc(z.nome)}</label><div class="chips">${capi.length ? capi.map(c => `<div class="chip ${sel && sel.id === c.id ? 'lit' : ''}" draggable="true" data-drag="w:${z.zona}:${c.i}" title="${esc(cap(c.nome))} · trascina per cambiare strato, nella borsa per toglierlo">${ic(c.id)}<em>${esc(c.corto)}</em><b data-a="togli" data-x='"${z.zona}:${c.i}"' title="togli">×</b></div>`).join('<i class="sep">›</i>') : `<span class="vuoto">${z.pila ? 'niente' : '—'}</span>`}</div></div>`; };
    const Z = GW ? Object.fromEntries(GW.zone.map(z => [z.zona, z])) : {};
    const p = st.player, need = st.me && st.me.need ? st.me.need : {};
    const hand = (k, id, lab) => `<div class="hand" data-drop="h:${k}"><div class="hs ${id ? 'full' : ''}" ${id ? `draggable="true" data-drag="h:${k}"` : ''} title="${id ? esc(cap(O().CAT[id] ? O().CAT[id].nome : id)) : 'vuota: trascina qui un oggetto'}">${id ? ic(id, wideIcon(id) || LONG.test(id) ? 32 : 16) : '<span>vuota</span>'}</div><label>${lab}${id ? ` · ${esc(corto(id))}` : ''}</label></div>`;
    const addosso = GW ? `<div class="addosso"><div class="ah"><div class="nmw">Addosso</div><span class="dim">dalla pelle → fuori · trascina per vestirti, cambiare ordine, toglierti</span></div>
      <div class="dress2"><div class="zc">${['testa', 'collo', 'busto', 'spalle', 'mani'].map(z => zrow(Z[z])).join('')}</div>
        <div class="nino" data-drop="nino">${r3('player', 'full', 380, 640, 'width:190px;height:320px')}</div>
        <div class="zc">${['gambe', 'ginocchia', 'piedi', 'schiena'].map(z => zrow(Z[z])).join('')}</div></div>
      <div class="hands">${hand('dx', GW.dx, 'destra')}<div class="hb">${btn('scambia_mani', 'Scambia')}${GW.sx ? btn('usa_sinistra', 'Usa sinistra') : ''}</div>${hand('sx', GW.sx, 'sinistra')}</div>
      <div class="ab2"><div class="stat" style="grid-template-columns:1fr auto 1fr auto;column-gap:14px"><span>Caldo</span><em>${Math.round(GW.calore * 100)}</em><span>Protezione</span><em>${Math.round(GW.arm * 100)}%</em></div>
        <div class="row">${btn('spogliati', 'Spogliati', { tutto: false })}${btn('spogliati', 'Nudo', { tutto: true }, 'bad')}</div></div></div>` : '';
    const bagH = `<div class="bag ${inCovo(st) ? 'covo' : 'strada'}" data-drop="bag" style="grid-template-columns:repeat(${mode === 'equip' ? 5 : 9},var(--c));grid-template-rows:repeat(${P.rows},var(--c))">${tiles}</div>`;
    if (mode === 'equip') return `<div class="roba"><div class="lft"><h4>Da indossare e da tenere · trascina su Nino</h4>${bagH}<div class="det" style="margin-top:14px">${sel ? itemDetail(st, sel, pv) : '<div class="dim">Niente da indossare in borsa.</div>'}</div></div>${addosso}</div>`;
    return `<div class="inv"><div>${bagH}<div class="dim" style="margin:8px 0 0">${items.length} cose · ${pv.peso} kg su ${pv.cap}. Quello che indossi non pesa nella borsa.${pv.base ? ' ' + btn('deposita', 'Tutto al covo', { id: '*' }) : ''}</div></div>
        <div class="det">${sel ? itemDetail(st, sel, pv) : '<div class="dim">Tasche vuote.</div>'}</div></div>`;
  }
  function bar(l, v, max, cls, inv) { const f = Math.max(0, Math.min(1, v / max)), c = inv ? (f > .85 ? 'r' : f > .6 ? 'w' : '') : (f < .25 ? 'r' : f < .5 ? 'w' : cls || ''); return `<div class="stat"><span>${esc(l)}</span><em>${Math.round(v)}${max === 100 ? '%' : ''}</em><i><b class="${c}" style="width:${Math.round(f * 100)}%"></b></i></div>`; }
  function describe(id) {
    const c = O().CAT[id]; if (!c) return (typeof TascheUI !== 'undefined' && TascheUI.DESC && TascheUI.DESC[id]) || '';
    const bits = [];
    if (c.eat) { const e = c.eat, m = []; if (e.fame) m.push(`toglie ${Math.round(e.fame * 100)}% di fame`); if (e.sete) m.push(`${Math.round(e.sete * 100)}% di sete`); if (e.hp) m.push(`cura ${e.hp}`); if (m.length) bits.push(cap(m.join(', ')) + '.'); }
    if (c.tool) bits.push('Attrezzo: si consuma con l\'uso.');
    if (c.st) bits.push(`Postazione (${(O().STATIONS[c.st] || {}).nome || c.st}): posata in una base, ci si lavora.`);
    if (c.heat) bits.push('Brucia: scalda.');
    if (c.ill) bits.push('Roba che scotta: se te la trovano addosso sono guai.');
    bits.push(`Vale circa ${L(c.prezzo)} lire.`);
    return bits.join(' ');
  }
  function itemDetail(st, i, pv) {
    const c = O().CAT[i.id], wide = wideIcon(i.id) || LONG.test(i.id), GR = typeof Guardaroba !== 'undefined' ? Guardaroba : null, capo = GR && GR.CAPO[i.id];
    const acts = [];
    if (capo) acts.push(btn('indossa', 'Indossa', i.id, 'y'));
    if (i.eq) acts.push(btn('equip', i.on ? 'In mano' : 'Impugna', i.id, i.on ? '' : 'y', i.on));
    if (i.eat) acts.push(btn('usa', /bevande/.test(i.cat) ? 'Bevi' : 'Mangia', { id: i.id }, 'y'));
    if (O().canHold && O().canHold(i.id)) acts.push(btn('tieni', 'A sinistra', i.id));
    if (c && pv.base) acts.push(btn('deposita', 'Al covo', { id: i.id, q: i.q }));
    if (c) acts.push(btn('butta', 'Butta', { id: i.id, q: 1 }, 'bad'));
    return `<div class="hd"><div class="pic ${wide ? 'w' : ''}">${ic(i.id, wide ? 32 : 16)}</div><div><div class="nm">${esc(corto(i.id))}</div><div class="ct">${esc(cap(i.nome))}${i.q > 1 ? ` · ×${i.q}` : ''}${capo ? ` · ${esc(GR.ZONE[capo.zona].nome.toLowerCase())}` : ''}</div></div></div>
      <div class="ds">${esc(describe(i.id))}${capo ? ` ${capo.calore ? `Scalda ${Math.round(capo.calore * 100)}.` : ''}${capo.arm ? ` Protegge ${Math.round(capo.arm * 100)}%.` : ''}` : ''}</div>
      <div class="stat" style="grid-template-columns:1fr auto">${c ? `<span>Peso</span><em>${Math.round(c.peso * (i.q || 1) * 10) / 10} kg</em>` : ''}${i.tool != null ? `<span>Stato</span><em>${i.tool}%</em><i><b class="${i.tool < 25 ? 'r' : 'g'}" style="width:${i.tool}%"></b></i>` : ''}${st.player.arms && st.player.arms[i.id] && st.player.arms[i.id].mag != null ? `<span>Colpi</span><em>${st.player.arms[i.id].mag} + ${st.player.arms[i.id].reserve || st.player.arms[i.id].res || 0}</em>` : ''}</div>
      <div class="row">${acts.join('')}</div>`;
  }

  // ---------------- PERSONAGGIO ----------------
  const NEED = { fame: 'Fame', sonno: 'Sonno', igiene: 'Sporco', svago: 'Noia', compagnia: 'Solitudine' };
  function pPg(st) {
    const M = st.me || {}, N = M.need || {}, p = st.player, S = M.stats || {};
    const job = M.job, ab = job && typeof Mestieri !== 'undefined' ? Mestieri.abilities(st, 'player').map(id => [id, Mestieri.AB[id]]).filter(([, a]) => a) : [];
    const cond = []; if (M.drunk > .3) cond.push(M.drunk > .65 ? 'ubriaco' : 'brillo'); if (M.hangover > .3) cond.push('postumi'); if (st.t < M.calmUntil) cond.push('mano ferma'); if (M.rentDebt > 0) cond.push(`affitto arretrato ${L(M.rentDebt)}`);
    const fr = (M.friends || []).map(id => G().byId(st, id)).filter(Boolean);
    return `<div class="pg"><div class="who">${r3('player', 'full', 440, 760, 'width:220px;height:380px')}<div class="dim" style="text-align:center">${esc(cond.join(' · ') || 'In forma, più o meno.')}</div></div>
      <div style="display:grid;gap:16px"><div class="mcard"><h4>Come stai</h4>${bar('Salute', p.hp, p.maxHp || 100, 'g')}${Object.keys(NEED).map(k => bar(NEED[k], (N[k] || 0) * 100, 100, '', true)).join('')}<div class="dim">Sigarette ${M.cig || 0} · dispensa ${M.pantry || 0}</div></div>
        <div class="mcard"><h4>Il tuo conto</h4><div class="stat" style="grid-template-columns:1fr auto;row-gap:6px">${[['Ore lavorate', Math.round((S.lavorato || 0) / 60)], ['Guadagnato', L(S.guadagnato || 0)], ['Speso', L(S.speso || 0)], ['Bevuto', S.bevuto || 0], ['Fumato', S.fumato || 0], ['Dormito (ore)', Math.round((S.dormito || 0) / 60)]].map(([a, b]) => `<span>${a}</span><em>${b}</em>`).join('')}</div></div></div>
      <div style="display:grid;gap:16px"><div class="mcard"><h4>Mestieri${job ? ` — da ${esc(job.title)}` : ''}</h4>${ab.length ? ab.map(([id, a]) => `<div class="ab">${ic(abIcon(id))}<div><b>${esc(a.label)}</b><small>${a.night ? 'di notte · ' : ''}${a.mins ? (a.mins >= 60 ? Math.round(a.mins / 6) / 10 + ' ore' : a.mins + ' min') : ''} · rischio ${a.risk > .15 ? 'alto' : a.risk > .08 ? 'medio' : 'basso'}</small></div></div>`).join('') : '<div class="dim">Ogni mestiere apre cose che gli altri non possono fare: le chiavi del posto, la gente che conosci. Trova un lavoro (scheda Lavori).</div>'}</div>
        <div class="mcard"><h4>Amici del quartiere</h4>${fr.length ? fr.map(n => `<div class="fr3">${r3('npc:' + n.id, 'bust', 128, 128) || ic('maglione')}<div><b>${n.dead || n.inside ? esc(n.name || n.first) : `<span class="link" data-a="vai" data-x="${esc(JSON.stringify({ x: n.x, y: n.y }))}" title="vai da lui">${esc(n.name || n.first)}</span>`}</b><small>${esc((n.pop && n.pop.job && n.pop.job.title) || '')}${n.meFriend && n.meFriend.lent ? ` · ti ha prestato ${L(n.meFriend.lent)}` : ''}${n.dead ? ' · morto' : n.inside ? ' · in casa' : ` · ${Math.round(Math.hypot(n.x - p.x, n.y - p.y))} m`}</small></div></div>`).join('') : '<div class="dim">Nessuno.</div>'}</div></div></div>`;
  }
  const abIcon = id => /stampa|tessere|timbri|fascicoli|volantin/.test(id) ? 'carta' : /cassa|soldi/.test(id) ? 'valuta' : /ascolta|radio/.test(id) ? 'radiolina' : /chiav|porta/.test(id) ? 'grimaldello' : /vino|beve/.test(id) ? 'vino' : /medic|cura/.test(id) ? 'medicine' : 'cacciavite';

  // ---------------- BANCO DI LAVORO ----------------
  const KINDS = [['tutto', 'Tutto'], ['cucina', 'Cucina'], ['fai', 'Fabbricare'], ['smonta', 'Smontare'], ['raccogli', 'Raccogliere']];
  function pLavora(st, v) {
    const A0 = U.arg && U.arg.st ? U.arg : null, RC = O().RECIPES;
    // dalla postazione del covo: solo le sue ricette (il banco delle armi: le armi e le modifiche)
    const mine = r => !A0 || (RC[r.id] && RC[r.id].st && RC[r.id].st.split('|').some(k => k === A0.st || k === A0.st2)) || (A0.armi && r.out.some(o => O().CAT[o.k] && O().CAT[o.k].cat === 'armi'));
    const l = v.list.filter(r => (U.filt === 'tutto' || r.kind === U.filt) && mine(r));
    const armi = (A0 && A0.armi && typeof Cantiere !== 'undefined' ? pArmi(st) : '') + (A0 && A0.auto && typeof Cantiere !== 'undefined' && Cantiere.autoView ? pAuto(st, A0) : '');   // [cantiere] l'officina del garage
    if (!U.sel || !l.some(r => r.id === U.sel)) U.sel = (l.find(r => r.ok) || l[0] || {}).id || null;
    const r = l.find(x => x.id === U.sel), outId = x => x.out[0] ? x.out[0].k : 'casse';
    const tiles = l.slice(0, 180).map(x => `<button class="rec ${x.ok ? 'ok' : x.here ? '' : 'no'} ${x.id === U.sel ? 'sel' : ''}" data-a="sel" data-x="${esc(JSON.stringify(x.id))}" title="${esc(cap(x.nome))}">${ic(outId(x))}<span>${esc(cap(x.nome))}</span></button>`).join('');
    // il piano di lavoro: i pezzi appoggiati sul banco, gli attrezzi appesi, e quello che ne viene
    const det = r ? `<div class="det"><div class="nm">${esc(cap(r.nome))}</div><div class="ct">${esc(r.st)} · ${r.min >= 60 ? Math.round(r.min / 6) / 10 + ' ore' : r.min + ' min'}${!r.here ? ' · <span style="color:var(--neon)">non qui</span>' : ''}</div>
      <div class="bench">${r.tools.length ? `<div class="peg">${r.tools.map(t => `<div class="tool ${t.have ? '' : 'miss'}" title="${esc(t.nome)}">${ic(t.k.split('|')[0])}<em>${esc(corto(t.k.split('|')[0]))}</em></div>`).join('')}</div>` : ''}
        <div class="top">${r.in.map(i => `<div class="pz ${i.have >= i.q ? '' : 'miss'}" title="${esc(i.nome)}">${ic(i.k.split('|')[0])}<em>${esc(corto(i.k.split('|')[0]))}</em><b>${i.have}/${i.q}</b></div>`).join('<i class="plus">+</i>') || '<span class="dim">a mani nude</span>'}</div></div>
      <div class="arrow">↓</div>
      <div class="res ${r.ok ? 'ok' : ''}">${r.out.map(o => `<div class="pz big">${ic(o.k)}<em>${esc(corto(o.k))}${o.q > 1 ? ` ×${o.q}` : ''}</em></div>`).join('')}</div>
      <div class="row">${btn('fai', r.ok ? 'Fai' : 'Manca qualcosa', { id: r.id, q: 1 }, 'y', !r.ok)}${btn('fai', '×3', { id: r.id, q: 3 }, '', !r.ok)}</div></div>` : '<div class="dim">Niente da fare qui.</div>';
    return `${armi}<div class="lav"><div><h4>Quaderno · ${l.filter(x => x.ok).length} cose che puoi fare adesso</h4><div class="recs">${tiles || '<div class="dim">Nessuna ricetta.</div>'}</div></div>${det}</div>`;
  }

  // [cantiere] l'officina del garage: il mezzo parcheggiato accanto si potenzia coi materiali
  function pAuto(st, A0) {
    const V = Cantiere.autoView(st, A0.uid);
    if (!V) return '<div class="armi"><h4>Officina del garage</h4><div class="dim">Porta qui un mezzo (a meno di dieci metri dal ponte sollevatore): la Vespa non si elabora.</div></div>';
    return `<div class="armi"><h4>Officina del garage · ${esc(V.nome)} · carrozzeria ${V.hp}%</h4><div class="wm">${V.ups.map(u => `<div class="mod ${u.max ? 'on' : ''}"><b>${esc(u.nome)} ${'●'.repeat(u.lvl)}${'○'.repeat(u.top - u.lvl)}</b><small>${esc(u.desc)}</small>${u.max ? '<em>al massimo</em>' : `<small class="${u.miss.length ? 'n' : ''}">${Object.entries(u.cost).map(([k, q]) => `${esc(O().nm(k))} ×${q}`).join(', ')}</small>${btn('autoup', u.id === 'ripara' ? 'Ripara' : 'Monta', { id: u.id, uid: A0.uid }, 'y', !!u.miss.length)}`}</div>`).join('')}</div></div>`;
  }
  // il banco delle armi: le modifiche, arma per arma
  function pArmi(st) {
    const V = Cantiere.modsView(st);
    return `<div class="armi"><h4>Modifiche alle armi</h4>${V.length ? V.map(w => `<div class="wrow"><div class="wn">${ic(w.k, 32)}<b>${esc(w.nome)}</b></div><div class="wm">${w.mods.map(m => `<div class="mod ${m.on ? 'on' : ''}"><b>${esc(m.nome)}</b><small>${Object.entries(m.eff).map(([k, d]) => `${{ range: 'gittata', spread: 'dispersione', mag: 'colpi', noise: 'rumore', dmg: 'danno', kick: 'rinculo', shake: 'scossone', pellets: 'pallini', bloom: 'raffica', rate: 'velocità' }[k] || k} ${d > 0 ? '+' : ''}${Math.abs(d) < 1 ? Math.round(d * 1000) / 10 + '%' : d}`).join(' · ')}</small>${m.on ? '<em>montato</em>' : `<small class="${m.miss.length ? 'n' : ''}">${Object.entries(m.cost).map(([k, q]) => `${esc(O().nm(k))} ×${q}`).join(', ')}</small>${btn('mod', 'Monta', { k: w.k, id: m.id }, 'y', !!m.miss.length)}`}</div>`).join('')}</div></div>`).join('') : '<div class="dim">Non hai armi da modificare. Le pistole, le lupare e i mitra si trovano, si comprano, si rubano.</div>'}</div>`;
  }

  // ---------------- BOTTEGA ----------------
  function pBottega(st, c) {
    const who = c.clerk || '';
    const line = !c.open ? 'Chiuso. Al banco non c\'è nessuno: la merce è lì, però.' : c.black ? '«Qui non si fanno domande. Né si danno ricevute.»' : c.emporio ? '«Tessera annonaria alla mano, prego. Prezzi fissi del Garante.»' : U.shopTab === 'vendi' ? `«Fammi vedere. Ho ${L(c.cash)} in cassa.»` : ['«Buongiorno. Cosa le serve?»', '«Dica pure.»', '«Oggi è arrivata roba fresca.»', '«Si accomodi, guardi pure.»'][hash(c.label) % 4];
    const left = `<div><div class="sc"><canvas class="scene" width="120" height="80" data-shop="${esc(c.label)}" data-who="${esc(who)}"></canvas>${c.open && c.clerkId ? r3('npc:' + c.clerkId, 'banco', 600, 400) : ''}<span class="sign">${esc(c.label)}</span></div><div class="bubble"><b>${esc(who || c.label)}</b>${esc(line)}</div></div>`;
    let tiles = '', det = '';
    if (U.shopTab === 'vendi') {
      if (!U.sel || !c.buys.some(b => b.g === U.sel)) U.sel = c.buys[0] ? c.buys[0].g : null;
      tiles = c.buys.map(b => `<button class="tile ${b.g === U.sel ? 'sel' : ''}" data-a="sel" data-x="${esc(JSON.stringify(b.g))}" title="${esc(b.name)}">${ic(b.g)}<span class="q">${b.q}</span><span class="pr">${L(b.price)}</span></button>`).join('') || '<div class="dim" style="grid-column:1/-1">Non hai niente che qui comprino.</div>';
      const b = c.buys.find(x => x.g === U.sel);
      if (b) det = `<div class="det"><div class="hd"><div class="pic">${ic(b.g)}</div><div><div class="nm">${esc(cap(b.name))}</div><div class="ct">ne hai ${b.q} · te lo paga ${L(b.price)}</div></div></div><div class="ds">${esc(describe(b.g))}</div><div class="row">${btn('vendi', 'Vendi 1', { g: b.g, q: 1 }, 'y', !c.open)}${b.q > 1 ? btn('vendi', `Tutto · ${L(b.price * b.q)}`, { g: b.g, q: b.q }, '', !c.open) : ''}</div></div>`;
    } else {
      if (!U.sel || !c.goods.some(g => g.g === U.sel)) U.sel = (c.goods.find(g => g.stock > 0) || c.goods[0] || {}).g || null;
      const byCat = {}; c.goods.forEach(g => { (byCat[g.catLabel] = byCat[g.catLabel] || []).push(g); });
      tiles = Object.entries(byCat).map(([cat, l]) => `<div class="grp">${esc(cat)}</div>` + l.map(g => `<button class="tile ${g.g === U.sel ? 'sel' : ''} ${g.stock < 1 ? 'no' : ''} ${g.ill ? 'ill' : ''}" data-a="sel" data-x="${esc(JSON.stringify(g.g))}" title="${esc(g.name)}">${ic(g.g)}${g.mine ? `<span class="on"></span>` : ''}<span class="pr">${L(g.price)}</span></button>`).join('')).join('');
      const g = c.goods.find(x => x.g === U.sel);
      if (g) det = `<div class="det"><div class="hd"><div class="pic">${ic(g.g)}</div><div><div class="nm">${esc(cap(g.name))}</div><div class="ct">${g.stock < 1 ? 'finito' : `${g.stock} in negozio`}${g.mine ? ` · ne hai ${g.mine}` : ''} · ${g.peso} kg</div></div></div>
        <div class="ds">${esc(describe(g.g))}</div><div class="stat" style="grid-template-columns:1fr auto"><span>Prezzo</span><em style="color:${g.price > g.base * 1.15 ? 'var(--neon)' : 'var(--crema)'}">${L(g.price)}${g.price > g.base * 1.15 ? ' · rincarato' : ''}</em></div>
        <div class="row">${btn('compra', 'Compra', { g: g.g, q: 1 }, 'y', g.stock < 1 || c.wallet < g.price || !c.open)}${g.stock >= 5 ? btn('compra', '×5', { g: g.g, q: 5 }, '', c.wallet < g.price * 5 || !c.open) : ''}${g.eat ? btn('compra', /bevande/.test(g.cat) ? 'Bevi qui' : 'Mangia qui', { g: g.g, q: 1, mode: 'consuma' }, '', g.stock < 1 || c.wallet < g.price || !c.open) : ''}</div></div>`;
    }
    return `<div class="shop">${left}<div>${det}<div class="goods">${tiles}</div></div></div>`;
  }

  // ---------------- LA MAPPA ----------------
  // l'isola dalle caselle vere, coi posti: clic su un nome o su un punto e ci vai a piedi
  let MAPB = null; const MK = 3;
  function mapBase() {
    if (MAPB) return MAPB; const G0 = G(), T0 = G0.T; MAPB = document.createElement('canvas'); MAPB.width = G0.GW * MK; MAPB.height = G0.GH * MK; const x = MAPB.getContext('2d');
    const C = { [T0.WATER]: '#13262a', [T0.BLD]: '#3a3646', [T0.VIA]: '#5a5650', [T0.COB]: '#6a645a', [T0.WALK]: '#6e6a62', [T0.PIAZZA]: '#7a746a', [T0.QUAY]: '#5a5248', [T0.PIER]: '#6a5a46', [T0.SAND]: '#a89a7a', [T0.GRASS]: '#5a6a58', [T0.TREE]: '#2e4a3a', [T0.SHRUB]: '#4a5e4a', [T0.ROCK]: '#5a5658', [T0.CLIFF]: '#3a3634', [T0.DIRT]: '#7a6e5a', [T0.FIELD]: '#8a845e', [T0.DESERT]: '#9a8e6a', [T0.SALT]: '#c8c4b8', [T0.GRAVEL]: '#8a8680', [T0.FOUNT]: '#4a6a7a', [T0.STAIRS]: '#7a746a' };
    for (let ty = 0; ty < G0.GH; ty++) for (let tx = 0; tx < G0.GW; tx++) { x.fillStyle = C[G0.tileAt(tx, ty)] || '#2a2830'; x.fillRect(tx * MK, ty * MK, MK, MK); }
    return MAPB;
  }
  function pMappa(st) {
    const G0 = G(); return `<div class="mappa"><canvas data-map="1" width="${G0.GW * MK}" height="${G0.GH * MK}"></canvas><div class="mlegenda"><span><i style="background:#f2ead8"></i>tu</span><span><i style="background:#B08D57"></i>covi</span><span><i style="background:#FF5FA2"></i>lavoro</span><span><i style="background:#35e6ff"></i>basi della Risacca</span></div></div>`;
  }
  function drawMap(c) {
    const st = ST(), G0 = G(), x = c.getContext('2d'), k = MK / G0.TS; x.drawImage(mapBase(), 0, 0);
    x.font = 'italic 14px "Instrument Serif", Georgia, serif'; x.textAlign = 'center';
    // i nomi: uno solo dove si accavallano (prima i posti più vicini a te)
    const p0 = st.player, boxes = [];
    Object.values(G0.PLACES).filter(P0 => P0.name).sort((a, b) => Math.hypot(a.x - p0.x, a.y - p0.y) - Math.hypot(b.x - p0.x, b.y - p0.y)).forEach(P0 => {
      const px = P0.x * k, py = P0.y * k; x.fillStyle = 'rgba(233,220,188,.7)'; x.fillRect(px - 1.5, py - 1.5, 3, 3);
      const w = x.measureText(P0.name).width + 6, r = [px - w / 2, py - 20, w, 16]; if (boxes.some(b => r[0] < b[0] + b[2] && b[0] < r[0] + r[2] && r[1] < b[1] + b[3] && b[1] < r[1] + r[3])) return; boxes.push(r);
      x.fillStyle = 'rgba(13,16,21,.45)'; x.fillRect(r[0], r[1] + 2, r[2], r[3] - 2); x.fillStyle = 'rgba(233,220,188,.9)'; x.fillText(P0.name, px, py - 7); });
    if (typeof Cantiere !== 'undefined') Cantiere.covi(st).forEach(C0 => { x.strokeStyle = '#B08D57'; x.lineWidth = 2; x.beginPath(); x.arc(C0.x * k, C0.y * k, C0.r * k, 0, Math.PI * 2); x.stroke(); });
    (st.ris && st.ris.bases || []).filter(b => b.alive).forEach(b => { x.fillStyle = '#35e6ff'; x.fillRect((b.cx || b.x) * k - 3, (b.cy || b.y) * k - 3, 6, 6); });
    if (window.WriterVita) WriterVita.drawMap(x, k, st);   // [writer] la città che si colora
    const jt = G0.jobTarget && G0.jobTarget(st); if (jt) { x.fillStyle = '#FF5FA2'; x.beginPath(); x.arc(jt.x * k, jt.y * k, 5, 0, Math.PI * 2); x.fill(); }
    const p = st.player, a = p.face || 0; x.save(); x.translate(p.x * k, p.y * k); x.rotate(a); x.fillStyle = '#f2ead8'; x.strokeStyle = '#0D1015'; x.lineWidth = 2; x.beginPath(); x.moveTo(9, 0); x.lineTo(-6, 6); x.lineTo(-3, 0); x.lineTo(-6, -6); x.closePath(); x.stroke(); x.fill(); x.restore();
  }
  function mapClick(e, c) {
    const r = c.getBoundingClientRect(), G0 = G(), k = MK / G0.TS, mx = (e.clientX - r.left) / r.width * c.width / k, my = (e.clientY - r.top) / r.height * c.height / k;
    let best = null, bd = 14 / k * (c.width / r.width); Object.values(G0.PLACES).forEach(P0 => { if (!P0.name) return; const d = Math.hypot(P0.x - mx, P0.y - my); if (d < bd) { bd = d; best = P0; } });
    const to = best || { x: mx, y: my }; say(`Vai ${best ? 'a ' + best.name : 'lì'}.`); goTo(to.x, to.y);
  }

  // ---------------- IL BAULE ----------------
  function pBaule(st, B0) {
    const tile = (id, q, src) => { const c = O().CAT[id]; return `<button class="tile" data-a="${src === 'k' ? 'bprendi' : 'bmetti'}" data-x="${esc(JSON.stringify({ id, q: 1 }))}" draggable="true" data-drag="${src}:${esc(id)}" title="${esc(cap(c ? c.nome : id))} · clic: uno · doppio clic: tutti">${ic(id)}<em>${esc(corto(id))}</em>${q > 1 ? `<span class="q">${q}</span>` : ''}</button>`; };
    const order = ks => ks.sort((a, b) => ((O().CAT[a] || {}).cat || '').localeCompare((O().CAT[b] || {}).cat || '') || a.localeCompare(b));
    const inB = order(Object.keys(B0).filter(k => B0[k] >= 1 && O().CAT[k])), bag = O().inv(st), inP = order(Object.keys(bag).filter(k => bag[k] >= 1 && O().CAT[k]));
    const peso = Math.round(inB.reduce((s0, k) => s0 + O().CAT[k].peso * Math.floor(B0[k]), 0) * 10) / 10;
    return `<div class="fr2"><div><h4>Nel baule · ${inB.length} cose · ${peso} kg</h4><div class="loot" data-drop="baule">${inB.map(k => tile(k, Math.floor(B0[k]), 'k')).join('') || '<div class="dim" style="grid-column:1/-1">Vuoto. Trascina qui la roba, o clicca nella borsa.</div>'}</div>
        <div class="row" style="margin-top:12px">${btn('bprendi_tutto', 'Prendi tutto', undefined, '', !inB.length)}</div></div>
      <div><h4>La tua roba</h4><div class="loot" data-drop="bag">${inP.map(k => tile(k, Math.floor(bag[k]), 'b')).join('') || '<div class="dim" style="grid-column:1/-1">Borsa vuota.</div>'}</div>
        <div class="row" style="margin-top:12px">${btn('bmetti_tutto', 'Metti tutto', undefined, 'y', !inP.length)}</div></div></div>`;
  }

  // ---------------- LAVORI ----------------
  const DIR = ['est', 'sud-est', 'sud', 'sud-ovest', 'ovest', 'nord-ovest', 'nord', 'nord-est'];
  const dirTo = (p, x, y) => DIR[((Math.round(Math.atan2(y - p.y, x - p.x) / (Math.PI / 4)) % 8) + 8) % 8];
  const jobIcon = t => /pesc|mare|molo|porto|scarica/.test(t) ? 'rete_pesca' : /fabbr|offic|mecc|saldat/.test(t) ? 'chiave_inglese' : /forn|panett|cuoc|bar|camerier|oste/.test(t) ? 'pane' : /tipogr|stamp|giornal/.test(t) ? 'giornale' : /minat|cava|carbon/.test(t) ? 'carbone' : /falegn|bosc|taglialegna/.test(t) ? 'ascia' : /medic|infermier|farmac/.test(t) ? 'kit_medico' : /comm|negoz|vend|bottega|cassier/.test(t) ? 'valuta' : /sagrest|prete|biblio|maestr/.test(t) ? 'libretto' : 'martello';
  function pLavori(st) {
    const M = st.me || {}, J = M.job, p = st.player, IX = typeof Popolo !== 'undefined' && Popolo.buildIndex ? Popolo.buildIndex() : { works: [] };
    const S = J && typeof Protagonista !== 'undefined' ? Protagonista.shiftToday(st) : null;
    const used = {}; st.npcs.forEach(n => { if (!n.dead && n.pop && n.pop.job && n.pop.job.t) { const k = (n.pop.job.base || n.pop.job.title) + '@' + (n.pop.job.t.k === 'b' ? 'b' + n.pop.job.t.bi : 'p' + (n.pop.job.t.id || '')); used[k] = (used[k] || 0) + 1; } });
    const works = IX.works.map(w => { const free = w.slots - (used[w.title + '@' + (w.bi >= 0 ? 'b' + w.bi : 'p' + w.id)] || 0); return Object.assign({}, w, { free, d: Math.hypot(w.x - p.x, w.y - p.y) }); }).sort((a, b) => (b.free > 0) - (a.free > 0) || a.d - b.d);
    const mine = `<div class="mcard"><h4>Il tuo lavoro</h4>${J ? `<div class="big">${esc(cap(J.title))}</div><div class="y">${esc(J.name || '')}</div>
        <div class="stat" style="grid-template-columns:1fr auto;row-gap:6px"><span>Orario</span><em>${J.start}–${J.end % 24}</em><span>Paga</span><em>${L(J.pay)} l'ora</em><span>Oggi</span><em>${S ? `${G().clockStr(S.a)}–${G().clockStr(S.z)}` : 'riposo'}</em>${M.owed ? `<span>Da ritirare venerdì</span><em>${L(M.owed)}</em>` : ''}<span>Ritardi · assenze</span><em>${M.late || 0} · ${M.absent || 0}</em></div>
        ${btn('vai', 'Vai al lavoro', { bi: J.bi, place: J.place })}` : '<div class="big">Senza lavoro</div><div class="dim">Vai dove cercano gente e chiedi (scheda Qui, una volta sul posto). Presentati lavato e sobrio.</div>'}</div>`;
    if (!U.jobSel || !works.some(w => w.title + w.id === U.jobSel)) U.jobSel = works[0] ? works[0].title + works[0].id : null;
    const list = works.slice(0, 60).map(w => `<div class="li ${w.free > 0 ? '' : 'off'} ${w.title + w.id === U.jobSel ? 'sel' : ''}" data-a="job" data-x="${esc(JSON.stringify(w.title + w.id))}">${ic(jobIcon(w.title))}<div>${esc(cap(w.title))}<small>${esc(w.label || w.name || '')} · ${w.start}–${w.end % 24}${w.night ? ' · di notte' : ''}</small></div><span class="r"><b>${L(w.pay)}</b>/ora<br>${Math.round(w.d)} m ${dirTo(p, w.x, w.y)}</span></div>`).join('');
    const w = works.find(x => x.title + x.id === U.jobSel);
    const det = w ? `<div class="mcard"><div class="ab" style="border:0;background:none;padding:0">${ic(jobIcon(w.title))}<div><b style="font-size:16px">${esc(cap(w.title))}</b><small>${esc(w.label || w.name || '')}</small></div></div>
      <div class="dim">${w.free > 0 ? 'Cercano qualcuno.' : 'Al completo, per ora: ogni settimana può cambiare.'} ${Math.round(w.d)} metri verso ${dirTo(p, w.x, w.y)}.</div>${btn('vai', 'Vai lì', { x: w.x, y: w.y })}</div>` : '';
    return `<div class="jobs"><div style="display:grid;gap:16px">${mine}${det}</div><div><h4>Chi cerca gente</h4><div class="list">${list}</div></div></div>`;
  }

  // ---------------- QUI, ADESSO ----------------
  function quiList(st) {
    const out = [], seen = new Set();
    try { (Risacca.here(st) || []).forEach(a => { if (seen.has(a.label)) return; seen.add(a.label); out.push({ label: a.label, bad: a.bad, run: () => { if (typeof RisaccaUI !== 'undefined' && RisaccaUI.doHere) { close(); RisaccaUI.doHere(a); return ''; } const r = Risacca.playerAct(st, a.id, a.arg); return r && r.msg; } }); }); } catch (e) { }
    try { (Azioni.playerActions(st) || []).forEach(a => { if (seen.has(a.label)) return; seen.add(a.label); out.push({ label: a.label, off: a.run ? '' : a.off, run: a.run, bad: /ruba|rapina|scasso|forza|borsegg|alleggerisci|sabota/i.test(a.label) }); }); } catch (e) { }
    return out;
  }
  let qc = { t: 0, n: 0 };
  function quiCount(st) { const t = Date.now(); if (t - qc.t > 500) qc = { t, n: quiList(st).filter(a => a.run).length }; return qc.n; }
  const quiIcon = l => /mangia|cena|pranzo|spesa|pane/i.test(l) ? 'pane' : /bev|vino|caff|birra/i.test(l) ? 'vino' : /dorm|letto|riposa/i.test(l) ? 'coperta' : /lava|doccia|sapone/i.test(l) ? 'sapone' : /lavor|turno/i.test(l) ? 'martello' : /fum|sigarett/i.test(l) ? 'sigarette' : /banco|compra|negozio|bottega/i.test(l) ? 'valuta' : /onda|muro|scrivi|manifest|murale/i.test(l) ? 'bomboletta' : /telecamera|sasso|sabota/i.test(l) ? 'pietre' : /pesca/i.test(l) ? 'rete_pesca' : /bancomat|soldi|prestito|restituisci|banca/i.test(l) ? 'valuta' : /albero|legna|abbatti/i.test(l) ? 'ascia' : /scava|fossa/i.test(l) ? 'pala' : /base|lotto|costru/i.test(l) ? 'assi' : /scambia/i.test(l) ? 'casse' : /lotto|carte|bisca|gioca/i.test(l) ? 'carte' : 'mappa';
  function pQui(st) {
    const l = quiList(st); U.qui = l;
    return l.length ? `<div class="acts">${l.map((a, k) => `<button class="act ${a.bad ? 'bad' : ''}" data-a="qui" data-x="${k}" ${a.run ? '' : 'disabled'}>${ic(quiIcon(a.label))}<span>${esc(a.label)}${a.off ? `<small>${esc(a.off)}</small>` : ''}</span></button>`).join('')}</div>`
      : '<div class="dim">Qui non c\'è niente da fare. La roba da frugare è in giro: cestini, scatole, casse. Cliccale.</div>';
  }

  // ---------------- FRUGARE ----------------
  function pFruga(st, v) {
    if (v.locked) return `<div class="mcard" style="max-width:520px"><div class="ab" style="border:0;background:none;padding:0">${ic('lucchetto')}<div><b style="font-size:16px">È chiuso.</b><small>Serve: ${esc(v.need)}</small></div></div><div class="dim">Il grimaldello è silenzioso, il piede di porco no; col trapano ci vuole tempo. Se c'è qualcuno, ti sente.</div><div>${btn('apri', 'Forza', undefined, 'bad')}</div></div>`;
    const mine = v.mine.items.filter(i => i.tool == null);
    const items = v.items.map(i => `<button class="tile t-${i.tier || 'comune'} ${i.src === 'shop' ? 'shop' : ''}" data-a="prendi" data-x="${esc(JSON.stringify({ g: i.id, q: i.id === '$' ? i.q : 1 }))}" title="${esc(i.nome)}${i.src === 'shop' ? ' (merce della bottega)' : ''}${i.tier && i.tier !== 'comune' ? ' · ' + i.tier : ''}">${ic(i.id)}<em>${esc(i.id === '$' ? 'lire' : cap(i.nome))}</em>${i.id === '$' ? `<span class="q">${i.q}</span>` : i.q > 1 ? `<span class="q">${i.q}</span>` : ''}</button>`).join('');
    return `<div class="fr2"><div><h4>Dentro · clic per prendere</h4><div class="loot">${items || '<div class="dim" style="grid-column:1/-1">Niente di utile.</div>'}</div>${v.items.length ? `<div style="margin-top:12px">${btn('prendi_tutto', 'Prendi tutto', undefined, 'y')}</div>` : ''}</div>
      <div><h4>Le tue tasche · clic per lasciare qui</h4><div class="loot">${mine.slice(0, 40).map(i => `<button class="tile" data-a="posa" data-x="${esc(JSON.stringify({ g: i.id, q: 1 }))}" title="${esc(i.nome)}">${ic(i.id)}<em>${esc(cap(i.nome))}</em>${i.q > 1 ? `<span class="q">${i.q}</span>` : ''}</button>`).join('') || '<div class="dim" style="grid-column:1/-1">Non hai niente da lasciare.</div>'}</div></div></div>`;
  }

  // =====================================================================================================================
  // CLIC E TASTI
  // =====================================================================================================================
  function equip(id) { const st = ST(); if (typeof Azioni !== 'undefined' && Azioni.playerEquip && Azioni.playerEquip(st, id || null)) say(`In mano: ${O().CAT[id] ? O().nm(id) : id}.`); else say({ ok: false, msg: 'Non si impugna.' }); }
  function goTo(x, y) {
    const pv = PV(), st = ST(); if (!pv.click) return; const p = st.player;
    let path = G().findPath(p.x, p.y, x, y, 1.4); if (!path || !path.length) path = [{ x, y }];
    pv.click.t = { kind: 'move', x, y, path, run: true, best: 1e9, bestT: pv.ui.time, fl: '' }; pv.ui.mark = { x, y, t: pv.ui.time, k: 'move' }; close();
  }
  function onClick(e) {
    if (e.target.dataset && e.target.dataset.map) { mapClick(e, e.target); return; }
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a, x = b.dataset.x ? JSON.parse(b.dataset.x) : undefined, st = ST();
    switch (a) {
      case 'close': close(); return;
      case 'tab': U.tab = x; U.sel = null; U.arg = null; break;
      case 'sel': U.sel = x; break;
      case 'filt': U.filt = x; U.sel = null; break;
      case 'shoptab': U.shopTab = x; U.sel = null; break;
      case 'job': U.jobSel = x; break;
      case 'equip': equip(x); break;
      case 'indossa': act('indossa', x); break;
      case 'togli': act('togli', x); break;
      case 'tieni': act('tieni', x); break;
      case 'mod': say(Cantiere.mod(st, x.k, x.id)); break;
      case 'autoup': say(Cantiere.autoUp(st, x.id, x.uid)); break;   // [cantiere] officina del garage
      case 'bprendi': say(Cantiere.bauleTake(st, x.id, x.q)); break;
      case 'bmetti': say(Cantiere.baulePut(st, x.id, x.q)); break;
      case 'bprendi_tutto': say(Cantiere.bauleAll(st, 'prendi')); break;
      case 'bmetti_tutto': say(Cantiere.bauleAll(st, 'metti')); break;
      case 'scambia_mani': act('scambia_mani'); break;
      case 'usa_sinistra': act('usa_sinistra'); break;
      case 'spogliati': act('spogliati', null, x); break;
      case 'libera': if (typeof Azioni !== 'undefined' && Azioni.playerEquip) Azioni.playerEquip(st, null); say('Mani libere.'); break;
      case 'usa': act('usa', x.id); break;
      case 'butta': act('butta', x.id, { q: x.q }); break;
      case 'deposita': act('deposita', x.id, { q: x.q }); break;
      case 'fai': act('fai', x.id, { q: x.q }); break;
      case 'compra': act('compra', U.arg, x); break;
      case 'vendi': act('vendi', U.arg, x); break;
      case 'apri': act('apri', U.arg); break;
      case 'prendi': act('prendi', U.arg, x); break;
      case 'prendi_tutto': act('prendi_tutto', U.arg); break;
      case 'posa': act('posa', U.arg, x); break;
      case 'qui': { const q = U.qui && U.qui[x]; if (q && q.run) { const r = q.run(); if (r) { say(r); if (st) G().feed(st, String(r), 'info'); } } if (!U.open) return; break; }
      case 'vai': { if (x.x !== undefined) goTo(x.x, x.y); else { const B = x.bi >= 0 ? G().BUILDINGS[x.bi] : null, P0 = G().PLACES[x.place]; if (B && B.door) goTo((B.door[0] + .5) * G().TS, (B.door[1] + .5) * G().TS); else if (P0) goTo(P0.x, P0.y); } return; }
    }
    render(true);
  }
  function dropOn(src, t, cx) {
    const st = ST(), GR = typeof Guardaroba !== 'undefined' ? Guardaroba : null; if (!st || !GR) return;
    const [k, a, b] = src.split(':'), dst = t.dataset.drop, [dk, dz] = dst.split(':');
    const idx = () => { const ch = [...t.querySelectorAll('.chip')]; return ch.filter(c => { const r = c.getBoundingClientRect(); return r.left + r.width / 2 < cx; }).length; };
    if (k === 'k' && dk === 'bag') return say(Cantiere.bauleTake(st, a, 9999));   // dal baule alla borsa: tutti
    if (k === 'b' && dk === 'baule') return say(Cantiere.baulePut(st, a, 9999));   // dalla borsa al baule: tutti
    if (k === 'b') {   // dalla borsa
      const capo = GR.CAPO[a];
      if (dk === 'z' || dk === 'nino') { if (!capo) return say({ ok: false, msg: 'Questo non si indossa.' }); if (dk === 'z' && dz !== capo.zona) return say({ ok: false, msg: `${cap(corto(a))} va su: ${GR.ZONE[capo.zona].nome.toLowerCase()}.` }); act('indossa', a, dk === 'z' ? { at: idx() } : {}); }
      else if (dk === 'h') { if (dz === 'sx') act('tieni', a); else equip(a); }
      return;
    }
    if (k === 'w') {   // uno strato addosso
      if (dk === 'z' && dz === a) { let j = idx(); if (j > +b) j--; act('sposta', a, { i: +b, j }); }
      else if (dk === 'bag') act('togli', `${a}:${b}`);
      else if (dk === 'z') say({ ok: false, msg: 'Quello sta su un\'altra parte del corpo.' });
      return;
    }
    if (k === 'h') {   // una mano
      if (dk === 'bag') { if (a === 'sx') act('togli', 'sx'); else { if (typeof Azioni !== 'undefined' && Azioni.playerEquip) Azioni.playerEquip(st, null); say('Mani libere.'); } }
      else if (dk === 'h' && dz !== a) act('scambia_mani');
    }
  }
  function onDbl(e) {
    const bt = e.target.closest('[data-a="bprendi"],[data-a="bmetti"]'); if (bt && typeof Cantiere !== 'undefined') { const x = JSON.parse(bt.dataset.x), st0 = ST(); say(bt.dataset.a === 'bprendi' ? Cantiere.bauleTake(st0, x.id, 9999) : Cantiere.baulePut(st0, x.id, 9999)); render(true); return; }
    const b = e.target.closest('[data-a="sel"]'); if (!b) return; const id = JSON.parse(b.dataset.x), st = ST();
    if (U.tab === 'zaino') { const it = bagItems(st).items.find(i => i.id === id); if (!it) return; if (it.eat) act('usa', id); else if (O().SLOT_OF && O().SLOT_OF[id]) act('indossa', id); else if (it.eq) equip(id); render(true); }
    else if (U.tab === 'lavora') { act('fai', id, { q: 1 }); render(true); }
    else if (U.tab === 'bottega') { act(U.shopTab === 'vendi' ? 'vendi' : 'compra', U.arg, { g: id, q: 1 }); render(true); }
  }
  addEventListener('keydown', e => {
    const pv = PV(); if (!pv || !pv.st) return; const ui = pv.ui; if (!ui || ui.intro || ui.over) return;
    const ae = document.activeElement; if (ae && /INPUT|TEXTAREA/.test(ae.tagName)) return;
    const k = e.key.toLowerCase();
    if (U.open) {
      if (k === 'escape') { close(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      const t = k === 'i' || k === 'z' ? 'zaino' : k === 'k' ? 'lavora' : k >= '1' && k <= '7' ? TABS[+k - 1][0] : null;
      if (t) { if (U.tab === t) close(); else open(t); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (k !== 'tab') e.stopImmediatePropagation();
      return;
    }
  }, true);
  setInterval(() => { try { if (U.open) render(false); } catch (e) { } }, 400);
  // il pulsante ZAINO in basso a destra: apre il menu (inventario); il numero è quante cose puoi fare qui
  setInterval(() => { try {
    const app = $('app'), st = ST(), ui = PV() && PV().ui; if (!app || !st || !ui) return; if (!$('mu')) mount();
    let b = $('muBtn'); if (!b) { b = document.createElement('button'); b.id = 'muBtn'; b.innerHTML = '<canvas width="96" height="96"></canvas><span>Zaino<kbd>I</kbd></span><span class="dot" hidden></span>'; app.appendChild(b); b.onclick = () => toggle('zaino'); }
    b.style.display = ui.intro || ui.over || U.open || (typeof Cantiere !== 'undefined' && Cantiere.active()) ? 'none' : '';
    const c = b.querySelector('canvas'); if (!c.dataset.done) { const t = thumb('zaino'); if (t) { c.getContext('2d').drawImage(t, 0, 0, 96, 96); c.dataset.done = 1; } }
    const n = quiCount(st), d = b.querySelector('.dot'); d.hidden = !n; d.textContent = n;
  } catch (e) { } }, 300);
  return { open, close, toggle, render, icon, state: U, quiList, quiCount, thumbFor };
})();
