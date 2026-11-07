/* Porto Vecchio — [stradadipinta] LA STRADA DIPINTA: dove stanno i graffiti, i manifesti, gli adesivi e le tag che la città ha già
   quando cominci (la storia dei muri), e come sono. Solo con lo stile E (?stile=E, o window.PV_STILE === 'E'); ?nostradadipinta lo spegne.
   Senza lo stile E niente cambia: la storia dei muri resta quella di writer_vita.js (history) e dei tasselli cotti.

   Il committente: «anche distribuzione graffiti, poster e sticker e tag» e «si deve vedere la cura per i singoli elementi e ambienti oltre
   quella generale». Prima la vernice era una carta da parati: 1.856 lavori sparsi col peso dei ritrovi, 118 verticali sui fianchi dei
   palazzi in tutta la città, tag e pezzi anche sulle piazze belle. Qui la distribuzione segue una città vera, A REGOLE (non coordinate a
   mano: le vie cambiano, il disegno si adegua):
   - IL CARATTERE DEL MURO (zonaSito): sottopasso, ferrovia e rilevato, il Muro, il porto e i magazzini, i vicoli e i retri, i ritrovi, le
     vie di quartiere, il lungomare, le piazze e le facciate belle, la chiesa, il regime, la campagna. Lo decidono i pezzi della città
     (W.pezzi: sottopassi, archi, magazzini, darsene, il muro del Garante, la chiesa...), i luoghi (G.PLACES), le vie (W.roads: i vicoli),
     la larghezza davanti al muro (raggio sulla griglia) e la ferrovia (W.railCity).
   - IL RITMO (ritmo): attorno a dove si sta (bar, sottopassi, scalinate, passaggi a livello, i luoghi del gioco) la vernice si addensa,
     fra un posto e l'altro si calma: tratti tranquilli e punti fitti, mai la stessa densità per cento metri.
   - LA GERARCHIA: pochi pezzi grandi e leggibili in fondo alle viste lunghe (FONDALI: il muro che chiude un corridoio dritto di 45 m e più,
     misurato sulla griglia), throw-up e stencil nel mezzo, tante tag e adesivi piccoli.
   - GLI STRATI E L'ETÀ: il pezzo vecchio sbiadito sotto le tag nuove, la toppa grigia di chi ha ripulito (sopra il pezzo o su una tag),
     i manifesti a strati strappati sullo stesso punto, gli adesivi a grappolo sui pali dei cartelli, dietro i cartelli e accanto alle porte
     ad altezza di mano (mai sulla porta: la porta si deve leggere).
   - IL CONTENUTO: una scena di qui (CREW, SCRITTORI, MANIFESTI): le crew coi loro territori, pochi nomi che tornano, le serate, le band, le
     feste e gli avvisi del porto. Niente marche vere, niente artisti veri.
   - I COLORI: dalla tavolozza unica della bibbia (writer_arte.js tavolozzaE, w.sdPal), mai vermiglio, limone, allarme.
   Costo: i lavori sono gli stessi oggetti di sempre (l'atlante: due disegni per tutti i lavori finiti; il disegnatore a parte); qui solo la
   scelta, una volta all'avvio (qualche decina di ms), e gli adesivi sui pali si piazzano senza raggi (piazza). STRADA_DIPINTA.md. */
var StradaDipinta = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const WRf = () => (typeof Writing !== 'undefined' ? Writing : null), WAf = () => (typeof WriterArte !== 'undefined' ? WriterArte : null);
  const TS = G.TS, GW = G.GW, GH = G.GH, T = G.T || (G.MAP.world && G.MAP.world.T), hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const Q = typeof location !== 'undefined' ? location.search : '';
  const SPENTO = /[?&]nostradadipinta\b/.test(Q);
  function attiva() {
    if (SPENTO) return false;
    if (typeof window === 'undefined') return !!((typeof global !== 'undefined' && global.PV_STRADA_DIPINTA) || (typeof process !== 'undefined' && process.env && process.env.PV_STRADA_DIPINTA === '1'));
    return /[?&]stile=e\b/i.test(Q) || window.PV_STILE === 'E';
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const W0 = () => G.MAP.world || {};
  const tileV = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : G.MAP.grid[ty * GW + tx]; };
  const walk = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx >= 0 && ty >= 0 && tx < GW && ty < GH && G.walkT(tx, ty); };
  const citta = (x, y) => { const M = G.MAP, tx = Math.floor(x / TS), ty = Math.floor(y / TS); return !M.zone || !M.Z || (tx >= 0 && ty >= 0 && tx < GW && ty < GH && M.zone[ty * GW + tx] === M.Z.CITTA); };
  const dSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9, t = clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1); return hyp(ax + dx * t - px, ay + dy * t - py); };
  const dLine = (px, py, P) => { let b = 1e9; for (let k = 0; k + 1 < P.length; k++) b = Math.min(b, dSeg(px, py, P[k][0], P[k][1], P[k + 1][0], P[k + 1][1])); return b; };

  // ================= IL CARATTERE DEI MURI =================
  // ogni zona: dens = lavori ogni 10 m di muro libero (al ritmo 1); g / m = quota dei lavori grandi e medi (il resto: piccoli); buff = la toppa
  // grigia; man = manifesti; ade = adesivi; eta = l'età della vernice (0 nuova, 1 sbiadita); grandi / medi = gli stili di quella zona
  const ZONE = {
    sottopasso: { nome: 'sottopassi e Glacis', dens: 12, g: .16, m: .34, buff: .35, man: .3, ade: .5, eta: .5, grandi: ['pezzo', 'pezzo', 'burner', 'calli'], medi: ['throw', 'throw', 'estintore', 'gotico', 'stencil', 'scritta'] },
    ferrovia: { nome: 'ferrovia e rilevato', dens: 14, g: .24, m: .36, buff: .3, man: .15, ade: .3, eta: .55, grandi: ['pezzo', 'burner', 'pezzo', 'rullo'], medi: ['throw', 'throw', 'estintore', 'scritta'] },
    muro: { nome: 'il Muro', dens: 14, g: .34, m: .3, buff: .45, man: .2, ade: .25, eta: .45, grandi: ['pezzo', 'burner', 'murale', 'calli', 'pezzo'], medi: ['scritta', 'throw', 'stencil', 'scritta'] },
    porto: { nome: 'porto e magazzini', dens: 12, g: .18, m: .34, buff: .22, man: .35, ade: .35, eta: .65, grandi: ['pezzo', 'rullo', 'murale', 'pezzo'], medi: ['throw', 'stencil', 'scritta', 'throw'] },
    vicolo: { nome: 'vicoli e retri', dens: 7, g: .05, m: .3, buff: .16, man: .3, ade: .55, eta: .5, grandi: ['pezzo'], medi: ['throw', 'stencil', 'gotico', 'throw'] },
    ritrovo: { nome: 'bar e ritrovi', dens: 6, g: .07, m: .26, buff: .12, man: .5, ade: .6, eta: .35, grandi: ['pezzo', 'calli'], medi: ['throw', 'stencil', 'throw'] },
    via: { nome: 'vie di quartiere', dens: 2.2, g: .04, m: .24, buff: .18, man: .35, ade: .4, eta: .5, grandi: ['pezzo'], medi: ['throw', 'stencil'] },
    lungomare: { nome: 'lungomare', dens: 2, g: .06, m: .26, buff: .12, man: .5, ade: .45, eta: .6, grandi: ['pezzo'], medi: ['throw', 'stencil'] },
    piazza: { nome: 'piazze e facciate belle', dens: .35, g: 0, m: 0, buff: 0, man: .7, ade: .2, eta: .1, grandi: [], medi: [] },
    sacro: { nome: 'chiesa e santuario', dens: .25, g: 0, m: 0, buff: 0, man: 0, ade: 0, eta: .2, grandi: [], medi: [] },
    regime: { nome: 'palazzi del regime', dens: .3, g: 0, m: 0, buff: .7, man: .1, ade: 0, eta: .2, grandi: [], medi: [] },
    fuori: { nome: 'campagna e frazioni', dens: .9, g: .08, m: .3, buff: .05, man: .3, ade: .2, eta: .75, grandi: ['pezzo'], medi: ['throw', 'stencil'] },
  };
  const CALDE = { sottopasso: 1, ferrovia: 1, muro: 1, porto: 1, vicolo: 1, ritrovo: 1 };
  const P_PORTO = ['calata', 'scalo', 'cantiere', 'magazzino', 'marina', 'molo', 'pontile', 'officina', 'molo_levante', 'deposito_n', 'deposito_s'];
  const P_COLD = ['governo', 'ministero', 'garante', 'archivio', 'commissariato', 'rocca', 'caserma_p', 'piazza_gov', 'cultura'];
  const P_SACRO = ['chiesa', 'santuario', 'chiesa_sg'];
  const P_HOT = ['bar', 'osteria', 'flipper', 'disco', 'cinema', 'video', 'sirena', 'gelateria', 'chiosco', 'discarica', 'varco'];
  const P_NOBILE = ['piazza', 'fontana', 'fiori', 'miramare', 'biblioteca', 'teatro'];
  const USO_HOT = { bar: 1, pub: 1, circolo: 1, trattoria: 1 };
  const LUNGO = /lung|spianata|lido|passeggiata|marina/i;
  let F = null;
  function feat() {
    if (F) return F; const W = W0(), P = G.PLACES || {}, pz = W.pezzi || [], at = (ids) => ids.map(id => P[id]).filter(Boolean).map(q => [q.x, q.y]);
    const tipi = re => pz.filter(p => re.test(p.tipo)).map(p => [p.x, p.y, p]);
    F = {
      sotto: tipi(/^(sottopasso|arco_sottopasso|ponte_arco|passaggio_livello)$/),
      porto: tipi(/^(magazzini_volta|darsena|scalo_alaggio|gru_porto|molo_vecchio|bitta|opificio)$/).concat(at(P_PORTO)),
      muro: pz.filter(p => p.tipo === 'muro_garante').map(p => { const L = (p.opz && p.opz.L) || 10, c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0); return [p.x - c * L / 2, p.y - s * L / 2, p.x + c * L / 2, p.y + s * L / 2]; }),
      regime: tipi(/^(caserma|corpo_rocca|mastio|torre_littoria|porta_monumentale|torrione|bastione)$/).concat(at(P_COLD)),   // le torri di guardia no: stanno sul Muro, che è la hall of fame
      sacro: tipi(/^(facciata_chiesa|campanile)$/).concat(at(P_SACRO)), edicola: tipi(/^edicola_votiva$/),
      nobile: tipi(/^(fontana)$/).concat(at(P_NOBILE)),
      hot: at(P_HOT).concat((G.BUILDINGS || []).filter(b => USO_HOT[b.use]).map(b => [b.cx != null ? b.cx : (b.x + b.w / 2) * TS, b.cy != null ? b.cy : (b.y + b.h / 2) * TS])),
      sosta: tipi(/^(scalinata|gradone|sottopasso|arco_sottopasso|passaggio_livello|stazione|fontana)$/).map(q => [q[0], q[1]]).concat((W.luoghi || []).filter(l => l && l.x != null).map(l => [l.x, l.y])),
      rail: Array.isArray(W.railCity) ? W.railCity : null,
      vicoli: (W.roads || []).filter(r => r.kind === 'vicolo' && r.pts && r.pts.length > 1),
      lungo: (W.roads || []).filter(r => r.pts && r.pts.length > 1 && LUNGO.test(r.name || '') && r.kind !== 'vicolo'),
    };
    F.hotAll = F.hot.concat(F.sotto.map(q => [q[0], q[1]]), F.sosta, tipi(/^(magazzini_volta|darsena|scalo_alaggio|gru_porto)$/).map(q => [q[0], q[1]]));   // dove si sta: anche le banchine dei magazzini
    return F;
  }
  const near = (L, x, y, r) => L.some(q => hyp(q[0] - x, q[1] - y) < r);
  // la larghezza libera davanti al muro (sulla griglia, a passi di mezzo metro) e quanto corre dritta la vista (il fondale)
  function davanti(x, y, ox, oy, max) { let d = 0; for (; d < max; d += .5) if (!walk(x + ox * d, y + oy * d)) break; return d; }
  function lato(x, y, ox, oy) { const ax = -oy, ay = ox; return davanti(x, y, ax, ay, 20) + davanti(x, y, -ax, -ay, 20); }
  function vista(x, y, ox, oy) {   // un corridoio dritto davanti al muro: lungo, e stretto ai lati (una via, non una piazza)
    const L = davanti(x, y, ox, oy, 160); if (L < 40) return 0;
    for (const t of [.3, .55, .8]) { const px = x + ox * L * t, py = y + oy * L * t; if (lato(px, py, ox, oy) > 22) return 0; }
    return L;
  }
  // la zona di un punto del muro (x, y dove sta chi dipinge, out verso la strada); kind: il tipo di sito di writer_vita.js
  function zonaPunto(x, y, ox, oy, kind) {
    const f = feat();
    if (!citta(x, y)) return 'fuori';
    if (kind === 'muro' || f.muro.some(s => dSeg(x, y, s[0], s[1], s[2], s[3]) < 6)) return 'muro';
    if (kind === 'ponte' || near(f.sotto, x, y, 13)) return 'sottopasso';
    if (kind === 'ferrovia' || kind === 'rilevato' || (f.rail && dLine(x, y, f.rail) < 11)) return 'ferrovia';
    if (near(f.regime, x, y, 18)) return 'regime';
    if (near(f.sacro, x, y, 16) || near(f.edicola, x, y, 4)) return 'sacro';
    const v = tileV(x + ox * 1.2, y + oy * 1.2);
    if (near(f.porto, x, y, 22) || v === T.QUAY || v === T.PIER) return 'porto';
    if (v === T.PIAZZA || near(f.nobile, x, y, 16)) return 'piazza';
    if (f.lungo.some(r => dLine(x, y, r.pts) < (r.w || 6) / 2 + 4)) return 'lungomare';
    if (near(f.hot, x, y, 13)) return 'ritrovo';
    const wd = ox || oy ? davanti(x, y, ox, oy, 12) : 12;
    if (wd < 6.5 || f.vicoli.some(r => dLine(x, y, r.pts) < (r.w || 3) / 2 + 2.5)) return 'vicolo';
    return 'via';
  }
  // i fondali delle vie: ogni via (W.roads) spezzata nei suoi tratti dritti (tutti i punti entro 1,6 m dalla corda); un tratto di 45 m e più
  // guarda, ai due capi, oltre l'incrocio fino alla prima casa (al più 40 m): quel muro chiude la vista. Il sito del fondale sta davanti a
  // quel muro, girato verso chi arriva; i raggi del gioco trovano poi la facciata vera e il rettangolo libero (fuori da porte e finestre)
  function fondaliStrade() {
    const out = [], W = W0();
    (W.roads || []).forEach(r => { const P = r.pts; if (!P || P.length < 2 || !/^(citta|vicolo|strada)$/.test(r.kind)) return;
      let i0 = 0;
      while (i0 < P.length - 1) {
        let j = i0 + 1;
        for (; j < P.length; j++) { const ax = P[i0][0], ay = P[i0][1], bx = P[j][0], by = P[j][1]; let ok = true; for (let k = i0 + 1; k < j; k++) if (dSeg(P[k][0], P[k][1], ax, ay, bx, by) > 1.6) { ok = false; break; } if (!ok) break; }
        const e = j - 1, L = hyp(P[e][0] - P[i0][0], P[e][1] - P[i0][1]);
        if (L >= 45) [[P[e], P[i0]], [P[i0], P[e]]].forEach(([E, A]) => { const ux = (E[0] - A[0]) / L, uy = (E[1] - A[1]) / L; let d = 0;
          for (; d < 40; d += .25) { const v = tileV(E[0] + ux * d, E[1] + uy * d); if (v === T.BLD) break; if (v === T.WATER || v === T.CLIFF || v < 0) { d = 99; break; } }
          if (d >= 40) return; const x = E[0] + ux * (d - .6), y = E[1] + uy * (d - .6); if (!walk(x, y)) return;
          out.push({ x, y, face: Math.atan2(uy, ux), kind: 'strada', bi: -1, len: 6, out: [-ux, -uy], along: [uy, -ux], vista: Math.round(L + d), via: r.name || r.id, fondale: true, corsa: { ex: E[0], ey: E[1], ux, uy, max: Math.min(60, d + 20) } }); });
        i0 = Math.max(e, i0 + 1);
      } });
    return out;
  }
  const zonaSito = s => s.sdZona || (s.sdZona = zonaPunto(s.x, s.y, s.out ? s.out[0] : 0, s.out ? s.out[1] : 0, s.kind));
  // il ritmo: vicino a dove si sta la vernice si addensa (fino a ×2), fra un posto e l'altro si calma (×.35); più un campo lento che
  // rompe la regolarità (la stessa via non è uguale per cento metri)
  function ritmo(x, y) {
    const f = feat(); let m = 0; for (const q of f.hotAll) { const d2 = (q[0] - x) ** 2 + (q[1] - y) ** 2; if (d2 < 900) m = Math.max(m, Math.exp(-d2 / 162)); }
    const lento = .5 + .5 * Math.sin(x * .061 + 1.3) * Math.sin(y * .053 + .4);
    return .3 + 1.7 * m * (.75 + .25 * lento) + .25 * lento;
  }

  // ================= LA SCENA DI QUI =================
  // le crew coi loro territori; i nomi che tornano (i king di ogni crew li vedi in più punti della città, mai due volte nella stessa vista);
  // le crew sciolte restano nei pezzi vecchi, sbiaditi
  const CREW = {
    BDS: { nome: 'Banda della Scogliera', casa: ['porto', 'lungomare'], scrittori: ['MURE', 'GOZO', 'SALE', 'BRUMA'] },
    TNT: { nome: 'Treni Notte Tunnel', casa: ['ferrovia', 'sottopasso'], scrittori: ['TREK', 'NAPO', 'FUMO', 'RIVA'] },
    PVK: { nome: 'Porto Vecchio Kings', casa: ['vicolo', 'ritrovo', 'via'], scrittori: ['CIAPA', 'ZENA', 'VERA', 'MOLO'] },
    RSC: { nome: 'Risacca', casa: ['muro'], scrittori: ['SUBA', 'KILO', 'MAREA', 'ONDA'] },
    KML: { nome: 'Camalli', casa: ['porto', 'ferrovia'], scrittori: ['ZULU', 'TOKE', 'ORZO', 'BITTA'] },
    TOY: { nome: 'i ragazzini', casa: ['via', 'vicolo', 'lungomare'], scrittori: ['PIX', 'GEKO', 'LUPO', 'TEO'] },
  };
  const VECCHI = [['RENZ', 'OGS'], ['MASK', 'OGS'], ['ASMA', 'OGS'], ['NEMO', 'OGS'], ['KAOS', 'FLM'], ['DOGE', 'FLM'], ['NEVA', 'SPK'], ['RUGA', 'SPK']];   // le crew sciolte: solo pezzi vecchi
  const RE = { porto: ['BDS', 'KML', 'BDS'], lungomare: ['BDS', 'TOY'], ferrovia: ['TNT', 'TNT', 'KML'], sottopasso: ['TNT', 'PVK', 'TNT'], muro: ['RSC', 'RSC', 'PVK'], vicolo: ['PVK', 'PVK', 'TOY'], ritrovo: ['PVK', 'BDS', 'TOY'], via: ['PVK', 'TOY', 'TNT'], piazza: ['TOY'], sacro: ['TOY'], regime: ['RSC'], fuori: ['TNT', 'TOY'] };
  const LOGHI = ['RADIO LUNA', 'CASSA MAREA', 'JAM GLACIS', 'SCOGLIO', 'FUORI ORARIO', 'TONNARA'];
  // i manifesti: t titolo (\n a capo), s sotto, d data; k 'cerco' è il foglietto a mano con le linguette; per zona
  const MAN = {
    serate: [{ t: 'DUB AL MOLO', s: 'SOUND: CASSA MAREA', d: 'SABATO DALLE 22' }, { t: 'I GABBIANI\nELETTRICI', s: 'LIVE AL BAR SIRENA', d: 'VENERDI ORE 22' }, { t: 'CANTINA\nPUNK', s: 'MUFFA - RUGGINE - CORTOCIRCUITO', d: 'GIOVEDI' },
      { t: 'BALERA\nLUNA', s: 'LISCIO E MAZURCHE', d: 'DOMENICA ORE 21' }, { t: 'RADIO LUNA', s: 'FREQUENZA LIBERA 98.4', d: 'TUTTE LE NOTTI' }, { t: 'NOTTE\nFUNK', s: 'DISCOTECA LUNA', d: 'SABATO' }],
    strada: [{ t: 'JAM AL\nGLACIS', s: 'BOMBOLETTE E GIRADISCHI', d: 'SABATO DALLE 15' }, { t: 'TORNEO DI\nSKATE', s: 'SPIAZZO DELLA STAZIONE', d: 'DOMENICA' }, { t: 'MERCATINO\nDEL BARATTO', s: 'VICO DEL POZZO', d: 'OGNI PRIMO SABATO' }],
    porto: [{ t: 'AVVISO AI\nPESCATORI', s: 'DIVIETO DI ORMEGGIO CALATA EST', d: 'CAPITANERIA' }, { t: 'SAGRA\nDELL\'ACCIUGA', s: 'CALATA DEL PORTO', d: '14 - 15 AGOSTO' }, { t: 'PALIO\nDEI GOZZI', s: 'MARINA DEL PORTO VECCHIO', d: 'DOMENICA ORE 10' },
      { t: 'CERCASI MOZZO', s: 'PESCHERECCIO SANTA RITA', d: '23 17', k: 'cerco' }, { t: 'VENDESI GOZZO', s: '5 METRI, CHIEDERE DI NINO', d: '41 08', k: 'cerco' }],
    vicolo: [{ t: 'LEZIONI DI\nCHITARRA', s: 'VICO DEL POZZO 3', d: '12 90', k: 'cerco' }, { t: 'SMARRITO\nCANE TOBIA', s: 'MACCHIA BIANCA', d: '35 22', k: 'cerco' }, { t: 'AFFITTASI\nCANTINA', s: 'ASCIUTTA', d: '17 64', k: 'cerco' }],
    piazza: [{ t: 'FESTA DI\nSAN ROCCO', s: 'PROCESSIONE E BANDA', d: '16 AGOSTO' }, { t: 'CINEMA\nASTOR', s: 'ULTIMA PRIMA DELLA STAGIONE', d: 'GIOVEDI ORE 21' }, { t: 'CORO\nDEL BORGO', s: 'CHIESA DI SAN ROCCO', d: 'SABATO ORE 18' }],
  };
  const MAN_Z = { porto: ['porto', 'serate'], lungomare: ['serate', 'porto'], ferrovia: ['strada', 'serate'], sottopasso: ['strada', 'serate'], muro: ['strada', 'serate'], vicolo: ['vicolo', 'serate'], ritrovo: ['serate', 'strada'], via: ['vicolo', 'serate'], piazza: ['piazza'], regime: ['piazza'], fuori: ['porto', 'serate'], sacro: ['piazza'] };

  // ================= LA STORIA DEI MURI (stile E) =================
  // ctx (da writer_vita.js): SITES, spotOf, ws (i writer NPC), MIND. I lavori sono quelli di sempre (writing.js addWork, writer_arte.js conceive);
  // i campi sd* dicono al disegno la tavolozza (sdPal), l'età (sdEta), lo strato (sdStrato), i manifesti e gli adesivi del posto
  const conta = { lavori: 0, zone: {}, livelli: {}, fondali: [], pali: 0, porte: 0 };
  function scrittore(aka, crew, rng) { const h = aka.charCodeAt(0) * 977 + aka.charCodeAt(1) * 31 + (aka.charCodeAt(2) || 7), WA = WAf(); const sk = crew === 'TOY' ? .15 + (h % 20) / 100 : .45 + (h % 45) / 100; return { aka, crew, skill: sk, dna: WA.dnaOf(h, sk, h % 14), hand: h * 13, h }; }
  function storia(st, ctx) {
    const WR = WRf(), WA = WAf(); if (!WR || !WA) return 0;
    Object.assign(conta, { lavori: 0, zone: {}, livelli: {}, fondali: [], pali: 0, porte: 0 }); const T0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const rng = mulberry(0x5D1A7), pick = a => a[Math.floor(rng() * a.length)], now = st.t, SITES = ctx.SITES;
    const made = [], big = [], fam = new Map();   // fam: aka:stile → posti (lo stesso pezzo non due volte nella stessa vista)
    const ws = (ctx.ws || []).map(n => ({ n, wr: n.pop.writer }));
    const chi = (z, vecchio) => { if (vecchio && rng() < .45) { const [a, c] = pick(VECCHI); return { wr: scrittore(a, c, rng) }; }
      const cr = pick(RE[z] || RE.via), vivi = ws.filter(o => o.wr && o.wr.crew === cr); if (!vecchio && vivi.length && rng() < .5) { const o = pick(vivi); return { n: o.n, wr: o.wr }; }
      return { wr: scrittore(pick(CREW[cr] ? CREW[cr].scrittori : CREW.PVK.scrittori), cr, rng) }; };
    const visto = (aka, style, x, y, r) => (fam.get(aka + ':' + style) || []).some(q => hyp(q[0] - x, q[1] - y) < r);
    function lavoro(sp, who, style, ex, liv) {
      const wr = who.wr, seed = Math.floor(rng() * 1e9), z = sp.sdZona || 'via';
      const sk = WA.conceive({ aka: wr.aka, crew: wr.crew, style, dna: wr.dna, seed, by: who.n ? who.n.id : 'old:' + wr.aka });
      const w = Object.assign(sk, { by: who.n ? who.n.id : 'old', hand: wr.hand || seed, surf: 'muro', spot: sp, place: sp.place, prog: 1, done: true, old: true, sdPal: 1, sdZona: z, sdLiv: liv || 'piccolo' }, ex || {});
      if (style === 'tag' || style === 'mtag') { w.tagK = .8 + rng() * .5; if (rng() < .25) w.sign = pick(WA.SIGNS); }
      if (style === 'stencil') w.motifSeed = (wr.hand || seed) ^ 0x5a5a;
      if (style === 'scritta') { w.kind = rng() < .5 ? 'politica' : pick(['amore', 'strada', 'ultras']); if (w.kind === 'strada') w.words = pick([wr.crew + ' IN CASA', 'ZONA ' + wr.crew, wr.crew + ' ' + wr.aka]); }
      if ((style === 'rullo' || style === 'verticale') && rng() < .5) w.words = wr.crew;
      if (style === 'burner' && rng() < .25) w.words = wr.crew;
      if (w.sdEta == null) { const e = (ZONE[z] || ZONE.via).eta; w.sdEta = clamp(e * (.5 + rng() * .9), 0, .95); }
      const dd = w.sdEta > .5 ? 60 + Math.floor(rng() * 600) : Math.floor(rng() * 60);
      WR._.addWork(st, w); w.t0 = w.tDone = now - dd * 1440;
      made.push(w); conta.lavori++; conta.zone[z] = (conta.zone[z] || 0) + 1; conta.livelli[w.sdLiv] = (conta.livelli[w.sdLiv] || 0) + 1;
      const k = wr.aka + ':' + style; if (!fam.has(k)) fam.set(k, []); fam.get(k).push([sp.x, sp.y]);
      return w;
    }
    const posto = (s, du, h) => Object.assign(ctx.spotOf(s, du, h), { sdZona: zonaSito(s) });
    const largo = (x, y, r) => !big.some(q => hyp(q[0] - x, q[1] - y) < r);
    const manifesti = (z, n, fresco) => { const L = []; for (let i = 0; i < n; i++) { const cat = pick(MAN_Z[z] || MAN_Z.via), f = Object.assign({}, pick(MAN[cat])); f.c = Math.floor(rng() * 10); L.push(f); } return { sdManifesti: L, sdFresco: !!fresco }; };
    const adesivi = (z, n) => { const crs = (RE[z] || RE.via).concat(['PVK']); return { sdAdesivi: { n, nomi: crs.flatMap(c => (CREW[c] || CREW.PVK).scrittori.slice(0, 3)), crew: crs, loghi: LOGHI } }; };

    // ---- 1. i fondali: il muro che chiude una vista lunga e dritta prende un pezzo grande, nuovo, leggibile (uno ogni 55 m al più) ----
    const cand = [];
    // il muro in fondo alla via: se lì c'è un tratto di muro libero (un sito, niente porte né finestre) si prende quello, se no la facciata
    // vera (il pezzo diventa un throw-up grande, che sta fra le finestre)
    fondaliStrade().forEach(f => { let s = f; const sv = SITES.find(q => /^(strada|hall|ferrovia|muro)$/.test(q.kind) && q.out && hyp(q.x - f.x, q.y - f.y) < 9 && q.out[0] * f.out[0] + q.out[1] * f.out[1] > .7 && (q.len || 0) >= 4);
      if (sv) s = Object.assign(sv, { vista: f.vista, via: f.via, corsa: f.corsa }); else f.facciata = true;
      const z = zonaSito(s); if (z === 'piazza' || z === 'sacro' || z === 'regime' || z === 'fuori') return; cand.push({ s, v: s.vista + 30, z }); });   // [stradadipinta] in campagna no: le case in fondo arrivano tardi e a caso (misurato: un giro sì, uno no), il pezzo non si legge   // le vie dritte prima (+30: sono la regola), poi i muri liberi in fondo a un corridoio
    SITES.forEach(s => { if (!/^(strada|hall|ferrovia|muro|rilevato)$/.test(s.kind) || (s.len || 0) < 4 || !s.out) return; const z = zonaSito(s); if (!(z in CALDE) && z !== 'via' && z !== 'lungomare') return;
      const v = vista(s.x, s.y, s.out[0], s.out[1]); if (v >= 45) { if (!s.corsa) s.corsa = { ex: s.x + s.out[0] * 12, ey: s.y + s.out[1] * 12, ux: -s.out[0], uy: -s.out[1], max: 30 }; cand.push({ s, v, z }); } });   // anche qui il muro vero lo trova il raggio lungo il corridoio
    cand.sort((a, b) => b.v - a.v);
    // le alternative del fondale, in ordine (writing.js placeWallG le prova finché una entra): (a) il verticale a rullo, o la calligrafia alta,
    // fra due colonne di finestre (a passi di 1,6 m lungo la facciata); (b) il pezzo basso sulla fascia del pianterreno, sotto i davanzali del
    // primo piano (1,35 m dal suolo, alto un metro); (c) il muro cieco di lato più vicino al fondo che si vede venendo dalla via (un sito
    // girato verso chi arriva, entro 9 m dall'asse e 30 m dal fondo); (d) il muro dei manifesti a strati, ad altezza d'occhio
    function altFondale(s, sp0, z, who) {
      const A = s.along || [0, 1], u = [Math.cos(s.face), Math.sin(s.face)], at = k => ({ x: sp0.x + A[0] * k, y: sp0.y + A[1] * k, face: sp0.face, h: null, place: sp0.place, kind: 'strada', sdZona: z }), alt = [];
      // [stradadipinta] prima il grande sul posto del fondale (il muro cieco in fondo alla Via delle Mura: 10 × 6 m liberi), poi il throw-up
      for (const k of [0, -3, 3]) alt.push({ k: 'g', style: 'murale', W0: 8, H0: 4.5, hRel: 3, minK: .75, spot: at(k), off: k }, { k: 'g', style: 'burner', W0: 7.5, H0: 2.8, hRel: 2, minK: .8, spot: at(k), off: k });
      for (const k of [0, -2.5, 2.5]) alt.push({ k: 'a', style: 'throw', W0: 3.4, H0: 1.6, hRel: 1.6, spot: at(k), off: k });   // il throw-up grande, basso: si legge da lontano
      for (const k of [0, -1.6, 1.6, -3.2, 3.2]) alt.push({ k: 'a', style: 'verticale', W0: 1.3, H0: 4.4, hRel: 3.4, spot: at(k), off: k });
      for (const k of [0, -2.4, 2.4]) alt.push({ k: 'a', style: 'gotico', W0: 1.2, H0: 2.6, hRel: 2.9, spot: at(k), off: k });
      for (const k of [0, -3, 3]) alt.push({ k: 'b', style: 'pezzo', W0: 4.2, H0: 1.05, hRel: 1.35, spot: at(k), off: k });
      for (const k of [0, -2.5, 2.5]) alt.push({ k: 'b', style: 'throw', W0: 2.4, H0: 1.05, hRel: 1.3, spot: at(k), off: k });
      SITES.filter(q => /^(strada|hall|ferrovia|muro)$/.test(q.kind) && q.out && (q.len || 0) >= 3 && q.out[0] * u[0] + q.out[1] * u[1] < -.3).map(q => { const dx = q.x - s.x, dy = q.y - s.y; return { q, t: dx * u[0] + dy * u[1], l: Math.abs(-dx * u[1] + dy * u[0]) }; })
        .filter(o => o.t > -30 && o.t < 3 && o.l < 9).sort((a, b) => Math.abs(a.t) - Math.abs(b.t)).slice(0, 2)
        .forEach(o => { const q = o.q, big = (q.len || 0) >= 5.5; alt.push({ k: 'c', style: big ? 'pezzo' : 'throw', W0: big ? Math.min(q.len - .6, 4.8) : 2.6, H0: big ? Math.min(q.len - .6, 4.8) * .42 : 1.25, spot: Object.assign(posto(q, 0, null), { h: null }) }); });
      for (const k of [0, -2, 2]) alt.push({ k: 'd', style: 'manifesto', W0: 1.9, H0: 1.5, spot: at(k), off: k, sdManifesti: [0, 1, 2].map(() => Object.assign({ c: Math.floor(rng() * 10) }, pick(MAN[pick(MAN_Z[z] || MAN_Z.via)]))) });
      return alt;
    }
    const FOND = [];
    for (const c of cand) { if (FOND.some(o => { const d = hyp(o.s.x - c.s.x, o.s.y - c.s.y); return d < 18 || (d < 55 && Math.cos(o.s.face - c.s.face) > .3); })) continue;   /* due fondali vicini solo se si guardano da parti opposte (due viste diverse) */ FOND.push(c); if (FOND.length >= 16) break; }
    FOND.forEach(c => { const s = c.s, z = c.z, len = s.len || 6; let who = chi(z, false); for (let k = 0; k < 6 && (visto(who.wr.aka, 'throw', s.x, s.y, 45) || visto(who.wr.aka, 'pezzo', s.x, s.y, 45)); k++) who = chi(z, false);
      const style = s.facciata ? 'throw' : len >= 8 && (z === 'porto' || z === 'muro') && rng() < .5 ? 'murale' : len >= 6.5 ? (rng() < .5 ? 'burner' : 'pezzo') : 'pezzo';
      const W0 = style === 'throw' ? 3.2 : Math.min(len - .6, style === 'murale' ? 7 : style === 'burner' ? 6.4 : 5.2), H0 = style === 'murale' ? Math.min(4, W0 * .6) : style === 'throw' ? 1.5 : W0 * .4;
      const sp0 = posto(s, 0, null), alt = altFondale(s, sp0, z, who);
      // sul Muro del Garante il pezzo va sul muro vero (i suoi pezzi non sono fra le superfici dei raggi): il segmento più vicino, la faccia verso
      // la città, un burner di 7 × 2,6 m; il posto lo fissa piazza() senza fitWall (il Muro non ha finestre)
      let anc = null; { const g = feat().muro.map(m => ({ m, d: dSeg(s.x, s.y, m[0], m[1], m[2], m[3]) })).sort((a, b) => a.d - b.d)[0];
        if (g && g.d < 12) { const [x0, y0, x1, y1] = g.m, L = hyp(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, t = clamp((s.x - x0) * ux + (s.y - y0) * uy, 4, L - 4), cx = x0 + ux * t, cy = y0 + uy * t;
          let nx = -uy, ny = ux; const so = s.out || [s.x - cx, s.y - cy]; if (so[0] * nx + so[1] * ny < 0) { nx = -nx; ny = -ny; } /* la faccia verso chi arriva lungo il corridoio */ anc = { k: 'garante', x: cx, y: cy, nx, ny, W: Math.min(7, L - 1), H: 2.6, hc: 1.85 }; } }
      const w = lavoro(sp0, who, style, { W0, H0, sdEta: .05 + rng() * .1, sdStrato: 0, sdVista: Math.round(c.v), sdAlt: anc ? undefined : alt, sdRun: anc ? undefined : s.corsa, sdMinK: .5, sdAnc: anc || undefined }, 'fondale');
      s.sdFondale = true; big.push([s.x, s.y]); conta.fondali.push({ x: Math.round(s.x), y: Math.round(s.y), vista: Math.round(s.vista || c.v), via: s.via || '', zona: z, stile: style, aka: w.aka }); });

    // ---- 2. i muri: per zona e per ritmo, lavori grandi / medi / piccoli; nei punti fitti il muro vissuto a strati ----
    // con la storia cotta (i tasselli: rimodella) i muri e i palazzi li hanno già i lavori cotti: qui solo fondali, porte e pali
    if (!ctx.cotti) SITES.forEach(s => {
      if (s.kind === 'heaven' || s.kind === 'facciata' || s.sdFondale) return;
      const z = zonaSito(s), Z = ZONE[z] || ZONE.via, len = s.len || 4, rt = ritmo(s.x, s.y), att = Z.dens * len / 10 * rt;
      let n = Math.floor(att + rng()); if (n <= 0) return;
      // il muro vissuto: il pezzo vecchio sbiadito (a volte con la toppa grigia sopra), le tag nuove addosso, gli adesivi, i manifesti a strati
      if (z in CALDE && rt > 1.1 && len >= 5 && rng() < .55 && largo(s.x, s.y, 4)) {
        const who = chi(z, true), du = (rng() - .5) * Math.max(0, len - 5), sp = posto(s, du, null), style = pick(Z.grandi.length ? Z.grandi : ['throw']);
        if (!visto(who.wr.aka, style, sp.x, sp.y, 45)) {
          const ex = { sdEta: .7 + rng() * .2, sdStrato: 0 }; if (rng() < Z.buff * 1.4) { const a = rng() * .4, b = a + .3 + rng() * .3; ex.sdToppa = [a, .05 + rng() * .2, Math.min(.98, b), .75 + rng() * .2, pick(['#A89C92', '#B4ABA0', '#9C968E', '#C2B8A8'])]; }
          lavoro(sp, who, style, ex, 'vissuto'); big.push([sp.x, sp.y]);
          const nt = 3 + Math.floor(rng() * 4); for (let i = 0; i < nt; i++) lavoro(posto(s, du + (rng() - .5) * 4, null), chi(z, false), rng() < .6 ? 'tag' : 'mtag', { sdEta: rng() * .25, sdStrato: 1 }, 'piccolo');
          if (rng() < Z.ade) lavoro(posto(s, du + (rng() - .5) * 3, null), chi(z, false), 'adesivi', Object.assign({ sdEta: .2, sdStrato: 1 }, adesivi(z)), 'piccolo');
          if (rng() < Z.man) lavoro(posto(s, du + (rng() < .5 ? -1 : 1) * (1.5 + rng()), null), chi(z, false), 'manifesto', Object.assign({ sdEta: .1, sdStrato: 1 }, manifesti(z, 2 + Math.floor(rng() * 2))), 'piccolo');
          n -= 3; } }
      for (let i = 0; i < n; i++) {
        const r = rng(), tier = r < Z.g ? 'grande' : r < Z.g + Z.m ? 'medio' : 'piccolo';
        let style;
        if (tier === 'grande') style = pick(Z.grandi); else if (tier === 'medio') style = pick(Z.medi);
        else { const q = rng(); style = q < .42 ? 'tag' : q < .64 ? 'mtag' : q < .64 + Z.ade * .35 ? 'adesivi' : q < .64 + Z.ade * .35 + Z.man * .3 ? 'manifesto' : q < .95 ? 'tag' : 'buff'; if (style === 'buff' && rng() > Z.buff * 2) style = 'mtag'; }
        if (!style) continue;
        if (tier === 'grande' && (len < (style === 'murale' || style === 'rullo' ? 8 : style === 'burner' ? 7 : 5))) style = pick(Z.medi.length ? Z.medi : ['throw']);
        if (style === 'throw' && len < 3.5) style = 'tag';
        const isBig = /^(pezzo|burner|murale|rullo|calli)$/.test(style), isMid = /^(throw|estintore|gotico|stencil|scritta)$/.test(style);
        const du = (rng() - .5) * Math.max(0, len - (isBig ? 4.5 : isMid ? 2.6 : 1)), sp = posto(s, du, null);
        if (isBig && !largo(sp.x, sp.y, 4.6 * (rt > 1.2 ? .7 : 1))) continue;
        const who = chi(z, isBig && rng() < .5);
        if ((isBig || isMid) && visto(who.wr.aka, style, sp.x, sp.y, isBig ? 45 : 25)) continue;
        const ex = { sdStrato: isBig || isMid ? 0 : 1 };
        if (style === 'adesivi') Object.assign(ex, adesivi(z));
        if (style === 'manifesto') Object.assign(ex, manifesti(z, 1 + Math.floor(rng() * 2.4), z === 'piazza'));
        if (style === 'buff') ex.sdSotto = pick(CREW[pick(RE[z] || RE.via)].scrittori);
        if (style === 'rullo') ex.W0 = Math.max(5, Math.min(9, len - .5));
        lavoro(sp, who, style, ex, tier); if (isBig) big.push([sp.x, sp.y]);
      }
    });
    // ---- 3. i palazzi: i verticali e gli heaven spot solo dove la città è bombardata (le zone calde), uno per palazzo, fitti nei punti caldi ----
    const pal = new Set();
    if (!ctx.cotti) SITES.forEach(s => { if ((s.kind !== 'facciata' && s.kind !== 'heaven') || pal.has(s.bi)) return; const z = zonaSito(s); if (!(z in CALDE)) return; const rt = ritmo(s.x, s.y);
      if (rng() > (s.kind === 'facciata' ? .22 : .12) * rt) return; pal.add(s.bi);
      let who = chi(z, rng() < .6); for (let k = 0; k < 6 && ['throw', 'pezzo', 'verticale', 'rullo', 'estintore'].some(t => visto(who.wr.aka, t, s.x, s.y, 30)); k++) who = chi(z, rng() < .6);
      if (s.kind === 'facciata') { const style = rng() < .6 ? 'verticale' : rng() < .5 ? 'estintore' : s.len >= 8 ? 'rullo' : 'verticale'; const ex = style === 'verticale' ? { H0: s.Hv || 7, W0: 1.6 + rng() * .8 } : style === 'rullo' ? { W0: Math.max(5, Math.min(9, (s.len || 9) - .5)) } : {};
        const h = style === 'estintore' ? (s.gh != null ? s.gh + 3.4 : null) : style === 'rullo' && s.top ? s.top - 1.4 : style === 'verticale' ? s.h : null;
        lavoro(posto(s, 0, h), who, style, Object.assign(ex, { sdStrato: 0 }), 'medio'); }
      else { const style = rng() < .5 ? 'throw' : s.len >= 7 && rng() < .4 ? 'rullo' : 'pezzo'; lavoro(posto(s, 0, style === 'rullo' ? s.h - .5 : s.h - .3), who, style, { sdStrato: 0 }, 'medio'); } });
    // ---- 4. accanto alle porte, ad altezza di mano: un grappolo di adesivi o una tag a pennarello (mai sulla porta) ----
    (G.BUILDINGS || []).forEach((b, bi) => { const d = b.door; if (!d) return; const x = (d[0] + .5) * TS, y = (d[1] + .5) * TS;
      // la faccia della porta: la casella della porta sta fuori dalla casa, il muro è verso la casa
      const cx = b.cx != null ? b.cx : (b.x + b.w / 2) * TS, cy = b.cy != null ? b.cy : (b.y + b.h / 2) * TS, dx = cx - x, dy = cy - y, ax = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, ay = ax ? 0 : Math.sign(dy);
      if (!walk(x, y)) return; const z = zonaPunto(x, y, -ax, -ay, 'strada'), Z = ZONE[z] || ZONE.via; if (rng() > Z.ade * .5 * Math.min(1.4, ritmo(x, y))) return;
      const sd = rng() < .5 ? -1 : 1, off = .95 + rng() * .3, sp = { x: x - ay * sd * off, y: y + ax * sd * off, face: Math.atan2(ay, ax), h: null, place: '', kind: 'porta', sdZona: z };
      const st0 = rng() < .7 ? 'adesivi' : 'mtag'; lavoro(sp, chi(z, false), st0, Object.assign({ sdStrato: 1, W0: .42, H0: .5, sdEta: .3 * rng() }, st0 === 'adesivi' ? adesivi(z, 4 + Math.floor(rng() * 4)) : {}), 'porta'); conta.porte++; });
    // ---- 5. i pali dei cartelli: una striscia di adesivi a mano d'uomo; dietro il cartello (se il retro è libero) un grappolo ----
    // i pali li calcola render.js all'avvio (Segnaletica.piano, ~1 s): se non ci sono ancora non si chiamano da qui (sarebbe un compito lungo), si saltano
    const SG = W0().segnaletica, SALTA = typeof PuliziaRumore !== 'undefined' && PuliziaRumore.SALTA;
    if (SG && SG.pali) SG.pali.forEach(p => { if (p.tipo === 'pannello' || p.muro) return; if (SALTA && SALTA.has('p' + Math.round(p.x * 10) + ',' + Math.round(p.y * 10))) return;
      const z = zonaPunto(p.x, p.y, 0, 0, 'palo'), Z = ZONE[z] || ZONE.via; if (rng() > Math.min(.95, (Z.ade + .1) * ritmo(p.x, p.y))) return;
      const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), sp = { x: p.x, y: p.y, face: 0, h: null, place: '', kind: 'palo', sdZona: z }, R = p.tipo === 'indicazioni' ? .045 : .03;
      [1, -1].forEach(sg => { if (sg < 0 && rng() < .5) return; lavoro(sp, chi(z, false), 'adesivi', Object.assign({ sdStrato: 1, W0: R * 2.2, H0: .45, sdAnc: { k: 'palo', x: p.x, y: p.y, nx: fx * sg, nz: fz * sg, r: R, h: 1.15 + rng() * .35 } }, adesivi(z, 4 + Math.floor(rng() * 3))), 'palo'); conta.pali++; });
      if (p.tipo === 'cartelli' && !p.plates.some(q => q.retro) && rng() < .6) lavoro(sp, chi(z, false), 'adesivi', Object.assign({ sdStrato: 1, W0: .42, H0: .32, sdAnc: { k: 'retro', x: p.x, y: p.y, nx: -fx, nz: -fz, r: -.026, h: 2.52 } }, adesivi(z, 5 + Math.floor(rng() * 4))), 'palo'); });
    conta.ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - T0);
    return made.length;
  }

  // ================= CON I TASSELLI: LA STORIA COTTA, RIMODELLATA =================
  // i lavori cotti (già sul loro muro, i raggi fatti in cottura) sono quelli che funzionavano: si tengono, ma si diradano dove la città
  // non dipinge (piazze, chiesa, regime, i verticali fuori dalle zone calde), prendono la tavolozza e l'età del loro posto; poi si aggiungono
  // quelli nuovi della strada dipinta che non chiedono raggi (gli adesivi sui pali) e quelli a sito (fondali, muri vissuti), piazzati quando ci passi
  const TIENI = { muro: 1, sottopasso: 1, ferrovia: 1, porto: .85, vicolo: .7, ritrovo: .75, via: .35, lungomare: .3, piazza: .05, sacro: .02, regime: .04, fuori: .4 };
  function rimodella(st, L) {
    const rng = mulberry(0xC077), out = [];
    L.forEach(o => { const R = o.r; if (!R || !R.c || !R.n) { out.push(o); return; } const x = R.c[0], y = R.c[2], nx = R.n[0], ny = R.n[2], px = x + nx * .6, py = y + ny * .6, z = zonaPunto(px, py, nx, ny, o.spot && o.spot.kind);
      let k = TIENI[z] != null ? TIENI[z] : .4; if (o.style === 'verticale' && !(z in CALDE)) k *= .15; if (/^(tag|mtag|adesivi)$/.test(o.style)) k *= clamp(ritmo(px, py), .4, 1.3);
      if (rng() > k) return; o.sdPal = 1; o.sdZona = z; if (o.sdEta == null) o.sdEta = clamp((ZONE[z] || ZONE.via).eta * (.6 + rng() * .8), 0, .9); out.push(o); });
    conta.cotti = { prima: L.length, dopo: out.length }; return out;
  }

  // ================= IL POSTO DEGLI ADESIVI SUI PALI (writing.js placeWallG, w.sdAnc) =================
  // il palo è una retta verticale: il riquadro tangente sul lato che guarda la strada, alla quota della mano; dietro il cartello sul retro della
  // piastra. Niente raggi: il palo c'è (segnaletica.js, gli stessi dati della grafica), il suolo lo dà render.js
  function piazza(w, THREE, R) {
    const a = w.sdAnc; if (!a || !THREE || !R || !R.groundH) return false;
    if (a.k === 'garante') {   // il Muro: la faccia vera con un raggio dalla città verso il muro (anche le mesh a istanze, fino a 8 m oltre la linea), se no mezzo spessore di 30 cm
      const gh = R.groundH(a.x + a.nx * 2, a.y + a.ny * 2), o = new THREE.Vector3(a.x + a.nx * 4, gh + a.hc, a.y + a.ny * 4), d = new THREE.Vector3(-a.nx, 0, -a.ny), rc = new THREE.Raycaster(o, d, 0, 12);
      let off = .3; try { const sc = R.__models && R.__models.scene, L = []; if (sc) sc.traverseVisible(m => { if (m.isMesh && !(m.userData && (m.userData.velo || m.userData.atlante)) && m.geometry) { if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); const c = m.geometry.boundingSphere.center.clone().applyMatrix4(m.matrixWorld); if (m.isInstancedMesh || hyp(c.x - a.x, c.z - a.y) < m.geometry.boundingSphere.radius + 12) L.push(m); } });
        // nove raggi sul riquadro: vale la superficie più avanti (al varco una lastra trasparente 5 m davanti al calcestruzzo: la vernice dietro di lei sparisce)
        let best = null; for (const k of [-.4, 0, .4]) for (const v of [-.3, 0, .3]) { rc.ray.origin.set(o.x - a.ny * k * a.W, o.y + v * a.H, o.z + a.nx * k * a.W); const h = rc.intersectObjects(L, false).find(h => h.face && Math.abs(h.face.normal.y) < .5); if (h && (best == null || h.distance < best)) best = h.distance; }
        if (best != null) off = 4 - best; } catch (e) { }   // la faccia può stare oltre la linea del segmento (il Muro è spesso: al varco 4,5 m)
      const n = new THREE.Vector3(a.nx, 0, a.ny), c = new THREE.Vector3(a.x + a.nx * (off + .05), R.groundH(a.x + a.nx * (off + .3), a.y + a.ny * (off + .3)) + a.hc, a.y + a.ny * (off + .05));   // 5 cm davanti alla faccia più avanti
      w.W = a.W; w.H = a.H; w.gfxRect = { c, n, r: new THREE.Vector3(n.z, 0, -n.x), W: a.W, H: a.H, foot: null }; w.pos = { x: c.x, y: c.y, z: c.z }; w.sup = 'cemento'; w.eta = 0; w.sdVedo = { x: a.x + a.nx * 34, y: a.y + a.ny * 34 }; return true; }
    if (typeof PuliziaRumore !== 'undefined' && PuliziaRumore.SALTA && PuliziaRumore.SALTA.has('p' + Math.round(a.x * 10) + ',' + Math.round(a.y * 10))) return false;   // il palo tolto dalla pulizia
    const gh = R.groundH(a.x, a.y), L = hyp(a.nx, a.nz) || 1, nx = a.nx / L, nz = a.nz / L, H = w.H0 || .4, W = w.W0 || .08;
    const off = a.r + .002, c = new THREE.Vector3(a.x + nx * off, gh + a.h, a.y + nz * off);   // dietro il cartello r è negativo: la piastra sta 4,5 cm davanti al palo, il suo retro guarda indietro
    const n = new THREE.Vector3(nx, 0, nz), r = new THREE.Vector3(n.z, 0, -n.x);
    w.W = W; w.H = H; w.gfxRect = { c, n, r, W, H, foot: null }; w.pos = { x: c.x, y: c.y, z: c.z }; w.sup = 'metallo'; w.eta = 0;
    return true;
  }
  function misura() { return JSON.parse(JSON.stringify(conta)); }
  return { attiva, fondaliStrade, zonaPunto, zonaSito, ritmo, vista, storia, rimodella, piazza, misura, ZONE, CREW, MAN, LOGHI, CALDE, feat };
})();
if (typeof module !== 'undefined') module.exports = StradaDipinta;
