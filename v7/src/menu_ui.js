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
  function paintAll(root) { root.querySelectorAll('canvas[data-ic]').forEach(c => icon(c, c.dataset.ic)); root.querySelectorAll('canvas[data-fig]').forEach(c => figure(c)); root.querySelectorAll('canvas[data-shop]').forEach(c => shopScene(c, c.dataset.shop, c.dataset.who)); }

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
#mu .ic { image-rendering: pixelated; }
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
@media (max-width: 1240px) { #mu .zaino { grid-template-columns: auto 1fr; } #mu .zaino .who { display: none; } #mu .pg { grid-template-columns: 220px 1fr; } #mu .pg > :last-child { grid-column: 1 / -1; } }
@media (max-width: 900px) { #mu .case { inset: 6px; grid-template-columns: 64px 1fr; } #mu .rail button { width: 56px; height: 56px; font-size: 9px; } #mu .rail button canvas { width: 22px; height: 22px; } #mu .zaino, #mu .lav, #mu .shop, #mu .jobs, #mu .fr2, #mu .pg { grid-template-columns: 1fr; } #mu .bag { --c: 34px; } #mu footer .k { display: none; } }
`;

  // =====================================================================================================================
  // SCHEDE
  // =====================================================================================================================
  const TABS = [['zaino', 'Roba', 'zaino'], ['pg', 'Chi è', 'maglione'], ['lavora', 'Banco', 'martello'], ['lavori', 'Lavori', 'chiave_inglese'], ['qui', 'Qui', 'mappa']];
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
    const st = ST(); if (!st || !U.open) return;
    let body = '', title = '', sub = '', tabs = '';
    try {
      if (U.tab === 'zaino') [title, sub, body] = ['Roba', inCovo(st) ? 'sul tavolo del covo' : 'rovesciata sul marciapiede', pZaino(st)];
      else if (U.tab === 'pg') [title, sub, body] = ['Chi è', 'Nino', pPg(st)];
      else if (U.tab === 'lavora') { const v = O().recipesView(st); title = 'Banco'; sub = v.stations.length ? `qui: ${v.stations.join(', ')}` : 'nessuna postazione: solo quello che si fa a mano'; tabs = KINDS.map(([k, l]) => `<button class="pill ${U.filt === k ? 'on' : ''}" data-a="filt" data-x='"${k}"'>${l} ${v.list.filter(r => (k === 'tutto' || r.kind === k) && r.ok).length}</button>`).join(''); body = pLavora(st, v); }
      else if (U.tab === 'lavori') [title, sub, body] = ['Lavori', '', pLavori(st)];
      else if (U.tab === 'qui') [title, sub, body] = ['Qui, adesso', G().nearestPlace ? G().nearestPlace(st.player.x, st.player.y).name : '', pQui(st)];
      else if (U.tab === 'bottega') { const c = O().counter(st, U.arg); if (!c) { open('zaino'); return; } title = c.label; sub = c.emporio ? 'prezzi del regime' : c.black ? 'mercato nero: tutto, a prezzo doppio' : c.market ? 'mercato' : ''; tabs = ['compra', 'vendi'].map(t => `<button class="pill ${U.shopTab === t ? 'on' : ''}" data-a="shoptab" data-x='"${t}"'>${t === 'compra' ? 'Compra' : `Vendi ${c.buys.length}`}</button>`).join(''); body = pBottega(st, c); }
      else if (U.tab === 'fruga') { const v = O().frugaView(st, U.arg); if (!v) { close(); return; } title = 'Fruga'; sub = v.label; body = pFruga(st, v); }
    } catch (e) { body = `<div class="dim">Qualcosa non va: ${esc(e.message)}</div>`; console.error('[Menu]', e); }
    const pv = O().pocketsView(st), over = pv.peso > pv.cap;
    const rail = TABS.map(([k, l, ico]) => `<button class="${U.tab === k ? 'on' : ''}" data-a="tab" data-x='"${k}"'>${ic(ico)}${l}${k === 'qui' && quiCount(st) ? `<span class="dot">${quiCount(st)}</span>` : ''}</button>`).join('')
      + (U.tab === 'bottega' || U.tab === 'fruga' ? `<span class="sp"></span><button class="on">${ic(U.tab === 'bottega' ? 'valuta' : 'casse')}${CTX[U.tab][0]}</button>` : '');
    const showMsg = U.msg && Date.now() - (U.msgT || 0) < 6000;
    const html = `<div class="case"><nav class="rail">${rail}</nav><div class="in">
      <header><b>${esc(title)}</b><span>${esc(sub)}</span><span class="tabs">${tabs}</span><button class="x" data-a="close" aria-label="Chiudi">×</button></header>
      <main>${body}</main>
      <footer><span class="tm">${inCovo(st) ? 'nel covo il tempo aspetta' : 'il mondo va avanti, piano'}</span><span class="k"><kbd>I</kbd>roba</span><span class="k"><kbd>K</kbd>banco</span><span class="k"><kbd>Esc</kbd>gioco</span>
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
  function pZaino(st) {
    const { pv, items } = bagItems(st), P = pack(items, 8);
    if (!U.sel || !items.some(i => i.id === U.sel)) U.sel = items[0] ? items[0].id : null;
    const sel = items.find(i => i.id === U.sel);
    const tiles = P.put.map(o => { const i = o.it, wide = o.w === 2 && o.h === 1, big = o.h === 2;
      return `<button class="tile ${wide ? 'w' : ''} ${big ? 'big' : ''} ${i.id === U.sel ? 'sel' : ''} ${i.ill ? 'ill' : ''}" style="grid-column:${o.x + 1}/span ${o.w};grid-row:${o.y + 1}/span ${o.h}" data-a="sel" data-x="${esc(JSON.stringify(i.id))}" title="${esc(i.nome)}">${ic(i.id, wide ? 32 : 16)}${i.on ? '<span class="on"></span>' : ''}${i.q != null && i.q > 1 ? `<span class="q">${i.q}</span>` : ''}${i.tool != null ? `<span class="wear"><b style="width:${i.tool}%"></b></span>` : ''}</button>`; }).join('');
    const p = st.player, hand = p.hand || (p.cur !== 'pugni' ? p.cur : '');
    const need = st.me && st.me.need ? st.me.need : {}, WV = O().wornView ? O().wornView(st) : { slots: [], calore: 0 }, WS = Object.fromEntries(WV.slots.map(x => [x.slot, x]));
    const ws = k => { const x = WS[k]; if (!x) return ''; const lit = sel && O().SLOT_OF && O().SLOT_OF[sel.id] === k; return x.id ? `<div class="ws full ${lit ? 'lit' : ''}" data-a="togli" data-x='"${k}"' title="${esc(cap(x.nome))} — clic per togliere">${ic(x.id)}</div>` : `<div class="ws ${lit ? 'lit' : ''}">${esc(x.label)}</div>`; };
    const sx = WS.sx && WS.sx.id;
    const who = `<div class="who"><div class="nmw">Addosso</div>
      <div class="dress"><div class="col">${['testa', 'collo', 'busto', 'sopra'].map(ws).join('')}</div><div style="display:grid;place-items:center">${r3('player', 'full', 360, 600, 'width:180px;height:300px')}</div><div class="col">${['mani', 'gambe', 'piedi', 'spalle'].map(ws).join('')}</div></div>
      <div class="hands"><label><div class="ws ${hand ? 'full w' : ''}" ${hand ? `data-a="libera" title="clic: mani libere"` : ''}>${hand ? ic(hand, 32) : 'vuota'}</div>destra</label><label><div class="ws ${sx ? 'full' : ''}" ${sx ? `data-a="togli" data-x='"sx"' title="clic: metti via"` : ''}>${sx ? ic(sx) : 'vuota'}</div>sinistra</label></div>
      <div style="width:100%;display:grid;gap:8px">${bar('Salute', p.hp, p.maxHp || 100, 'g')}${bar('Fame', (need.fame || 0) * 100, 100, 'w', true)}${bar('Sete', pv.sete * 100, 100, 'w', true)}<div class="stat" style="grid-template-columns:1fr auto"><span>Caldo addosso</span><em>${Math.round(WV.calore * 100)}</em></div></div></div>`;
    return `<div class="zaino"><div><div class="bag ${inCovo(st) ? 'covo' : 'strada'}" style="grid-template-rows:repeat(${P.rows},var(--c))">${tiles}</div>
        <div class="dim" style="margin-top:8px">${items.length} cose · ${pv.peso} kg su ${pv.cap}. Quello che indossi non pesa nella borsa.</div>
        ${pv.base ? `<div style="margin-top:10px">${btn('deposita', 'Tutto al covo', { id: '*' })}</div>` : ''}</div>
      <div class="det">${sel ? itemDetail(st, sel, pv) : '<div class="dim">Tasche vuote.</div>'}</div>${who}</div>`;
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
    const c = O().CAT[i.id], wide = wideIcon(i.id) || LONG.test(i.id);
    const acts = [];
    if (i.eq) acts.push(btn('equip', i.on ? 'In mano' : 'Impugna', i.id, i.on ? '' : 'y', i.on));
    if (i.eat) acts.push(btn('usa', /bevande/.test(i.cat) ? 'Bevi' : 'Mangia', { id: i.id }, 'y'));
    if (O().SLOT_OF && O().SLOT_OF[i.id]) acts.push(btn('indossa', 'Indossa', i.id, 'y'));
    if (O().canHold && O().canHold(i.id) && !i.eq) acts.push(btn('tieni', 'Tieni', i.id));
    if (c && pv.base) acts.push(btn('deposita', 'Al covo', { id: i.id, q: i.q }));
    if (c) acts.push(btn('butta', 'Butta', { id: i.id, q: 1 }, 'bad'));
    return `<div class="hd"><div class="pic ${wide ? 'w' : ''}">${ic(i.id, wide ? 32 : 16)}</div><div><div class="nm">${esc(cap(i.nome))}</div><div class="ct">${esc(i.catLabel || '')}${i.q > 1 ? ` · ×${i.q}` : ''}${O().SLOT_OF && O().SLOT_OF[i.id] && typeof Guardaroba !== 'undefined' ? ` · si indossa: ${esc(Guardaroba.ZONE[O().SLOT_OF[i.id]].nome.toLowerCase())}` : ''}</div></div></div>
      <div class="ds">${esc(describe(i.id))}</div>
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
    const l = v.list.filter(r => U.filt === 'tutto' || r.kind === U.filt);
    if (!U.sel || !l.some(r => r.id === U.sel)) U.sel = (l.find(r => r.ok) || l[0] || {}).id || null;
    const r = l.find(x => x.id === U.sel);
    const tiles = l.slice(0, 160).map(x => `<button class="rec ${x.ok ? 'ok' : x.here ? '' : 'no'} ${x.id === U.sel ? 'sel' : ''}" data-a="sel" data-x="${esc(JSON.stringify(x.id))}" title="${esc(x.nome)}">${ic(x.out[0] ? x.out[0].k : 'casse')}<span>${esc(cap(x.nome))}</span></button>`).join('');
    const det = r ? `<div class="det"><div class="hd"><div class="pic">${ic(r.out[0] ? r.out[0].k : 'casse')}</div><div><div class="nm">${esc(cap(r.nome))}</div><div class="ct">${esc(r.st)} · ${r.min >= 60 ? Math.round(r.min / 6) / 10 + ' ore' : r.min + ' min'}</div></div></div>
      ${!r.here ? '<div class="dim" style="color:var(--neon)">Non qui: serve la postazione giusta.</div>' : ''}
      <h4 style="margin:4px 0 0">Serve</h4><div class="ing">${r.in.map(i => `<div>${ic(i.k.split('|')[0])}<span class="${i.have >= i.q ? 'y' : 'n'}">${esc(i.nome)}<br>${i.have}/${i.q}</span></div>`).join('')}${r.tools.map(t => `<div>${ic(t.k.split('|')[0])}<span class="${t.have ? 't' : 'n'}">${esc(t.nome)}<br>attrezzo</span></div>`).join('') || ''}</div>
      <h4 style="margin:4px 0 0">Ne viene</h4><div class="ing">${r.out.map(o => `<div>${ic(o.k)}<span>${esc(o.nome)}${o.q > 1 ? ` ×${o.q}` : ''}</span></div>`).join('')}</div>
      <div class="row">${btn('fai', 'Fai', { id: r.id, q: 1 }, 'y', !r.ok)}${btn('fai', '×3', { id: r.id, q: 3 }, '', !r.ok)}</div></div>` : '<div class="dim">Niente da fare qui.</div>';
    return `<div class="lav"><div><h4>Quaderno · ${l.filter(x => x.ok).length} cose che puoi fare adesso</h4><div class="recs">${tiles || '<div class="dim">Nessuna ricetta.</div>'}</div></div>${det}</div>`;
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
  function onDbl(e) {
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
      const t = k === 'i' || k === 'z' ? 'zaino' : k === 'k' ? 'lavora' : k >= '1' && k <= '5' ? TABS[+k - 1][0] : null;
      if (t) { if (U.tab === t) close(); else open(t); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (k !== 'tab') e.stopImmediatePropagation();
      return;
    }
  }, true);
  setInterval(() => { try { if (U.open) render(false); } catch (e) { } }, 400);
  return { open, close, toggle, render, icon, state: U, quiList, quiCount };
})();
