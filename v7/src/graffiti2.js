/* Porto Vecchio — [graffitipool] ?graffiti2: PIÙ GRAFFITI, MESSI MEGLIO (la proposta, dietro l'interruttore; GRAFFITI_POOL.md §4).
   Il committente: «servono più graffiti e disposti meglio, se ne vedono pochi». Misurato (GRAFFITI_POOL.md §3): la città di serie (stile E coi
   tasselli) ha 520 lavori in tutta l'isola, perché la strada dipinta ne pianifica 919, la cottura dei tasselli ne piazza 491 (i raggi), e nel
   gioco rimodella li dirada UNA SECONDA VOLTA per zona (la cottura è già quella dello stile E); in più porte, pali e fondali si aggiungono due
   volte. E la camera del gioco (camera7: 34° in giù, il bordo alto 11° sotto l'orizzonte) dei muri davanti vede solo la fascia bassa: i fondali a
   40 m e i verticali sui palazzi stanno fuori quadro.
   [graffiti_ny] Poi le decisioni (DECISIONI.md, «Graffiti»): come New York, pieni ma posati bene, senza esagerare; solo pezzi da writer; via i
   muri interi di simboli e i disegni di facce; i colori che cambiano, mai lo stesso pezzo due volte, i pezzi a più colori mai uguali.
   Qui, A INTERRUTTORE ACCESO, solo regole (niente coordinate), sopra a strada_dipinta.js (che resta com'è):
   1. NIENTE SECONDO DIRADAMENTO: i lavori cotti dello stile E si tengono tutti (la scelta per zona l'ha già fatta la strada dipinta); una cottura
      vecchia (senza stile E) si dirada di meno dove si cammina (vie .8, lungomare .7), uguale su piazze, chiesa, regime.
   2. NIENTE DOPPIONI: porte, pali e fondali della cottura non si rifanno (prima c'erano due grappoli di adesivi sulla stessa porta).
   3. IL RECUPERO: i lavori della strada dipinta che la cottura non ha saputo piazzare (~420 su 919) si riprovano nel gioco con le alternative
      (la misura più piccola, più in basso, spostati di lato lungo il muro, il pezzo che diventa throw-up).
   4. IL MURO D'ARRIVO: il muro che chiude un tratto dritto di via da 6 a 24 m (chi cammina ci va incontro, la camera lo ha davanti) prende un
      lavoro medio-grande, nuovo e leggibile, nella fascia bassa che la camera vede (centro a 1,1 m): un pezzo se il muro è largo, se no un throw-up;
      le crew del territorio, la nuvola chiara dietro le lettere.
   5. LA FASCIA ALL'ALTEZZA DEGLI OCCHI: lungo i muri dove si cammina (vicoli, ritrovi, porto, sottopassi, ferrovia, il Muro; poco nelle vie e sul
      lungomare) throw-up, tag grandi, tag a pennarello, adesivi, qualche gotico e pezzo piccolo, col centro fra 0,9 e 1,7 m, al ritmo dei posti.
   6. PULITO dove la bibbia lo vuole: piazze, chiesa, regime, campagna niente di nuovo; IL CENTRO NOBILE (entro 14 m da piazze, chiesa, palazzi
      del governo) un terzo della vernice e niente pezzi; mai a meno di 1,2 m da una porta (la bottega si legge).
   7. LEGGIBILE: una tavolozza (w.sdPal, la stessa lutE), i lavori nuovi freschi (età .05–.3: niente pioggia e crosta), quelli cotti dove si
      cammina al più .4; niente verticali né heaven spot nuovi (la camera non li vede).
   8. [graffiti_ny] SOLO PEZZI DA WRITER: tag, tag a pennarello, throw-up, pezzi, burner, gotico, estintore, calligraffiti, rulli e verticali
      della strada dipinta, gli adesivi «ciao mi chiamo» delle crew, la toppa grigia. Via il murale (i muri interi di simboli: righe, scacchi,
      cerchi), il personaggio (le facce), lo stencil (biciclette, occhi, bombolette: simboli, e due uguali di fila), la scritta a pennello
      (slogan, non writer) e il manifesto (carta, non vernice): quelli della strada dipinta diventano pezzi, throw-up o tag dello stesso posto.
   9. [graffiti_ny] MAI DUE UGUALI: ogni lavoro ha la sua combinazione (stile, nome, crew, tavolozza o colore): un nome che torna come pezzo o
      throw-up torna sempre in un'altra tavolozza, come tag in un altro colore; le crew hanno più writer (i nomi di sempre più quelli nuovi
      qui sotto, scelti a turno). I semi tutti diversi. Le prove: node src/test_graffiti2.js (nessun doppione), Graffiti2.unici.
   10. [graffiti_ny] I RAGGI CHE NON TROVANO IL MURO: il posto viene dalla griglia di 2 m e la direzione dalla via, e spesso è sbagliata (il muro
      vero sta di lato o dietro, a un metro; davanti c'è il vuoto per 8 m) o il posto cade dentro la casa. Camminando, i lavori di qui che
      stanno a meno di 95 m (in fila dal più vicino, un millisecondo o due per fotogramma) prima di essere provati si AGGANCIANO al muro vero:
      un ventaglio di 16 raggi a 1,3 m (il primo nella direzione data), il muro più vicino che sia un muro (lo stesso piano anche a 2,4 m: non
      una macchina, non un muretto), il posto a 55 cm da lui sulla sua normale; poi le alternative si rifanno lungo quel muro. Così niente
      tocca writing.js (l'impronta dei tasselli non cambia) e il lavoro sta sul muro (la decalcomania sui triangoli veri: né sospeso né dentro).
   Spento (di serie) non fa niente: niente tocca la città, i tasselli, la scelta di strada_dipinta.js. Fuori dall'impronta dei tasselli
   (build.py TASS_FUORI). Prove: node src/test_graffiti2.js; strumenti/graffiti_pool.js --g2; strumenti/graffiti_vista.js ... "&graffiti2". */
var Graffiti2 = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const on = typeof window === 'undefined' ? !!((typeof global !== 'undefined' && global.PV_GRAFFITI2) || (typeof process !== 'undefined' && process.env && process.env.PV_GRAFFITI2 === '1')) : /[?&]graffiti2\b/.test(Q);
  const conta = { on, cottiTenuti: 0, cottiIn: 0, doppioni: 0, recupero: 0, arrivo: 0, fascia: 0, eta: 0, nobile: 0, convertiti: {}, tolti: {}, cambi: { tavolozza: 0, colore: 0, nome: 0, seme: 0 }, aggancio: { ok: 0, spostati: 0, no: 0, attese: 0 } };
  const misura = () => JSON.parse(JSON.stringify(conta));
  if (!on || typeof StradaDipinta === 'undefined') return { on: false, misura };
  const SD = StradaDipinta, G = typeof Game !== 'undefined' ? Game : null, TS = G.TS, GW = G.GW, GH = G.GH, hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const WA = () => WriterArte, WR = () => Writing, CREW = SD.CREW;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const walk = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx >= 0 && ty >= 0 && tx < GW && ty < GH && G.walkT(tx, ty); };
  const davanti = (x, y, ox, oy, max) => { let d = 0; for (; d < max; d += .5) if (!walk(x + ox * d, y + oy * d)) break; return d; };
  const PULITE = { piazza: 1, sacro: 1, regime: 1, fuori: 1 };
  const CAMMINO = { sottopasso: 4.5, ferrovia: 3.5, muro: 3.5, porto: 3.5, vicolo: 3.6, ritrovo: 3.6, via: 1.25, lungomare: 1.2 };   // lavori nuovi ogni 10 m di muro, al ritmo 1 ([graffiti_ny] un quinto in meno: senza esagerare)
  const RE = { porto: ['BDS', 'KML', 'BDS'], lungomare: ['BDS', 'TOY'], ferrovia: ['TNT', 'TNT', 'KML'], sottopasso: ['TNT', 'PVK', 'TNT'], muro: ['RSC', 'RSC', 'PVK'], vicolo: ['PVK', 'PVK', 'TOY'], ritrovo: ['PVK', 'BDS', 'TOY'], via: ['PVK', 'TOY', 'TNT'] };   // i territori (come strada_dipinta.js RE)
  const TIENI2 = { muro: 1, sottopasso: 1, ferrovia: 1, porto: 1, vicolo: 1, ritrovo: 1, via: .8, lungomare: .7, piazza: .05, sacro: .02, regime: .04, fuori: .5 };
  // [graffiti_ny] gli stili che non sono pezzi da writer (8.) e i writer in più delle crew (9.: nomi inventati, nessun writer vero)
  const VIA = { murale: 1, mostro: 1, stencil: 1, scritta: 1, manifesto: 1 };
  const EXTRA = { PVK: ['BRISA', 'KORE', 'DEMA', 'FOKS', 'LIMO', 'TUFO', 'ORKA', 'GRIFO'], BDS: ['SCIA', 'REMO', 'GUSO', 'NAKE', 'FLUO', 'ZAFF', 'KELP', 'BORA'],
    TNT: ['BINA', 'DROK', 'SKID', 'VOLT', 'KRUM', 'FERRO', 'NOZE', 'TUNA'], KML: ['GRUA', 'STIV', 'KAVO', 'ZAVO', 'TOLA', 'CIMA'], RSC: ['SPUMA', 'ALGA', 'RIFF', 'ZOLE', 'VELA', 'FOCE'], TOY: ['KIKO', 'JOJO', 'TOBI', 'MIKI', 'ZAK', 'BIBI'] };
  const roster = cr => (CREW[cr] || CREW.PVK).scrittori.concat(EXTRA[cr] || []);
  const USO = new Map();   // quante volte un nome è già sul muro: si sceglie il meno usato (le crew a turno, non sempre il king)
  function scrittore(aka, crew) { const h = aka.charCodeAt(0) * 977 + aka.charCodeAt(1) * 31 + (aka.charCodeAt(2) || 7) + (aka.charCodeAt(3) || 3) * 7; const sk = crew === 'TOY' ? .15 + (h % 20) / 100 : .45 + (h % 45) / 100; return { aka, crew, skill: sk, dna: WA().dnaOf(h, sk, h % 14), hand: h * 13 }; }
  function scegli(cr, rng) { const L = roster(cr); let best = null; for (let k = 0; k < 3; k++) { const a = L[Math.floor(rng() * L.length)], u = USO.get(a) || 0; if (!best || u < best[1]) best = [a, u]; } USO.set(best[0], best[1] + 1); return best[0]; }

  // ---- 1. il diradamento: la cottura dello stile E si tiene tutta; quella vecchia si dirada di meno dove si cammina ----
  const rim0 = SD.rimodella, sto0 = SD.storia;
  SD.rimodella = function (st, L) {
    const E = L.length && L.filter(o => o.sdPal && o.sdLiv).length > L.length * .8; conta.cottiIn = L.length;
    let out;
    if (E) out = L.slice();
    else { const rng = mulberry(0xC078); out = L.filter(o => { const R = o.r; if (!R || !R.c || !R.n) return true; const x = R.c[0] + R.n[0] * .6, y = R.c[2] + R.n[2] * .6, z = SD.zonaPunto(x, y, R.n[0], R.n[2], o.spot && o.spot.kind); o.sdZona = z; o.sdPal = 1; if (o.sdEta == null) o.sdEta = clamp((SD.ZONE[z] || SD.ZONE.via).eta * (.6 + rng() * .8), 0, .9); return rng() < (TIENI2[z] != null ? TIENI2[z] : .5); }); }
    // [graffiti_ny] i cotti che non sono pezzi da writer escono: la strada dipinta li ripianifica (il recupero, 3.) e lì diventano pezzi da writer
    out = out.filter(o => { if (!VIA[o.style]) return true; conta.tolti[o.style] = (conta.tolti[o.style] || 0) + 1; return false; });
    out.forEach(o => { if (o.sdLiv !== 'vissuto' && !PULITE[o.sdZona] && o.sdEta > .4) { o.sdEta = .4; conta.eta++; } });
    conta.cottiTenuti = out.length; return out;
  };

  // [graffiti_ny] 8. un lavoro che non è da writer diventa un lavoro da writer dello stesso posto (il manifesto, carta, metà sparisce)
  function converti(w, rng) {
    const s = w.style; if (!VIA[s]) return true;
    let style, W0, H0;
    if (s === 'manifesto') { if (rng() < .5) { conta.convertiti[s + '→via'] = (conta.convertiti[s + '→via'] || 0) + 1; return false; } style = rng() < .6 ? 'tag' : 'mtag'; }
    else if (s === 'murale') { style = 'burner'; W0 = 6.6; H0 = 2.5; }
    else if (s === 'mostro') { style = 'pezzo'; W0 = 4.8; H0 = 2.05; }
    else if (s === 'scritta') { style = 'throw'; W0 = 2.7; H0 = 1.3; }
    else { style = rng() < .5 ? 'tag' : 'throw'; if (style === 'throw') { W0 = 2.6; H0 = 1.25; } }
    const cr = CREW[w.crew] ? w.crew : (RE[w.sdZona] || RE.via)[Math.floor(rng() * 3) % (RE[w.sdZona] || RE.via).length], wr = scrittore(roster(cr).includes(w.aka) ? w.aka : scegli(cr, rng), cr);
    const sk = WA().conceive({ aka: wr.aka, crew: cr, style, dna: wr.dna, seed: w.seed, by: 'old:' + wr.aka });
    ['motifSeed', 'motif', 'kind', 'words', 'sdManifesti', 'sdFresco', 'sdAdesivi', 'tool2', 'sign', 'chr', 'col', 'tagK', 'sdNoOpen'].forEach(k => { delete w[k]; });
    Object.assign(w, sk, { hand: wr.hand, W0, H0, sdNY: s });
    if (style === 'tag') w.tagK = 1.2 + rng() * .3;
    if (w.sdAlt) w.sdAlt = alternative(w, w.spot);
    conta.convertiti[s + '→' + style] = (conta.convertiti[s + '→' + style] || 0) + 1;
    return true;
  }
  // [graffiti_ny] il fondale (il pezzo in fondo a una via lunga, letto da 40 m: con camera7 non si vede mai) cercava il muro con decine di raggi
  // lungo la via a ogni giro (writing.js fondaleMuroG, fondaleCieco), sempre per primo: dove ce n'erano due o tre il giro dei graffiti non arrivava
  // agli altri (Piazza Grande: niente disegnato in un minuto). Qui diventa un lavoro come gli altri, al suo posto della griglia, agganciato
  function fondaleSemplice(w) { w.sdRun = undefined; w.sdGrandi = undefined; w.sdVista = undefined; if (w.spot) w.sdAlt = alternative(w, w.spot); daAgganciare(w); }

  // ---- 2-7. la storia: il recupero, il muro d'arrivo, la fascia degli occhi ----
  SD.storia = function (st, ctx) {
    const W = WR().S(st), rng = mulberry(0x4E5917);
    if (!ctx.cotti) { const n0 = W.works.length, n = sto0.call(SD, st, ctx); const piano = W.works.splice(n0); piano.forEach(w => { if (converti(w, rng)) { if (w.sdLiv === 'fondale') fondaleSemplice(w); else daAgganciare(w); W.works.push(w); } }); const k = n + nuovi(st, ctx, W.works.filter(w => w.old && w.sdPal)); unici(W.works); return k; }
    const cotti = W.works.filter(w => w.cotto), Sb = new Set(cotti.map(o => o.style + ':' + o.seed)), E = cotti.filter(o => o.sdLiv).length > cotti.length * .8;
    // il piano intero (come senza tasselli): quello che la cottura non ha piazzato
    const n0 = W.works.length; try { sto0.call(SD, st, Object.assign({}, ctx, { cotti: false })); } catch (e) { console.warn('[graffiti2] il piano', e); }
    const piano = W.works.splice(n0);
    // la storia coi tasselli com'è (fondali, porte, pali): via i doppioni di quello che la cottura ha già
    const n1 = W.works.length; const n = sto0.call(SD, st, ctx); const agg = W.works.splice(n1);
    const fondCotti = cotti.filter(o => o.sdLiv === 'fondale');
    agg.forEach(w => { const dop = E && (w.sdLiv === 'porta' || w.sdLiv === 'palo') || (w.sdLiv === 'fondale' && fondCotti.some(o => o.pos && hyp(o.pos.x - w.spot.x, o.pos.z - w.spot.y) < 12)); if (dop) { conta.doppioni++; return; } if (!converti(w, rng)) return; if (w.sdLiv === 'fondale') fondaleSemplice(w); W.works.push(w); });
    // il recupero: i lavori del piano che mancano, con le alternative (porte e pali compresi: le porte coi loro raggi, i pali senza)
    if (E) piano.forEach(w => { if (Sb.has(w.style + ':' + w.seed) || w.sdLiv === 'fondale') return; if (!converti(w, rng)) return; if (!w.sdAnc && w.spot) { w.sdAlt = alternative(w, w.spot); daAgganciare(w); } W.works.push(w); conta.recupero++; });
    const k = n + nuovi(st, ctx, W.works.filter(w => !w.erased));
    unici(W.works);
    return k;
  };
  // le alternative per un lavoro che al primo colpo non entra (writing.js placeWallG: le prova in fila finché una entra). Lungo il muro (la faccia
  // del posto: dopo l'aggancio è quella vera), la misura più piccola; il pezzo che non entra diventa un throw-up. Mai un altro stile più piccolo
  // di così: la combinazione unica del lavoro (9.) vale anche per la sua alternativa (il throw-up del pezzo ha la sua tavolozza riservata)
  function alternative(w, sp) {
    const A = [], ax = Math.cos(sp.face + Math.PI / 2), ay = Math.sin(sp.face + Math.PI / 2), at = (k, hRel, o) => Object.assign({ spot: Object.assign({}, sp, { x: sp.x + ax * k, y: sp.y + ay * k, h: null }), hRel, off: k }, o);
    const sty = WR().STYLES[w.style] || { W: 1, H: 1 }, W0 = w.W0 || sty.W, H0 = w.H0 || sty.H, K = [0, -1.3, 1.3];   // poche: ogni prova che non entra costa una griglia di raggi (scanNear)
    if (/^(pezzo|burner|murale|rullo|calli)$/.test(w.style)) { for (const k of K.slice(0, 3)) A.push(at(k, 1.2, { k: 'r', style: w.style, W0: W0 * .7, H0: H0 * .7, minK: .5 })); for (const k of K) A.push(at(k, 1.1, { k: 'r', style: 'throw', W0: 2.6, H0: 1.25, minK: .55 })); }
    else if (/^(throw|estintore|scritta|gotico|stencil|manifesto)$/.test(w.style)) { for (const k of K) A.push(at(k, Math.max(.9, H0 * .5 + .3), { k: 'r', style: w.style, W0: W0 * .75, H0: H0 * .75, minK: .5 })); }
    else for (const k of [-.8, .8]) A.push(at(k, w.style === 'adesivi' ? 1.2 : 1.4, { k: 'r', style: w.style, W0, H0, minK: .5 }));   // tag, adesivi, toppe: un passo di lato
    return A;
  }

  // ---- 9. [graffiti_ny] MAI DUE UGUALI ----
  // la chiave di un lavoro: lo stile (i grandi insieme: pezzo, burner, rullo, verticale), il nome, e la tavolozza (i lavori a più colori) o il
  // colore (tag, tag a pennarello, gotico, estintore, calligraffiti: una tinta). Gli adesivi e la toppa: il seme (ogni grappolo è tirato a sorte)
  const MONO = /^(tag|mtag|gotico|estintore|calli)$/, GRANDE = /^(pezzo|burner|rullo|verticale|wholecar)$/;
  const COLORI = ['#141418', '#c8ccd2', '#f2f2ee', '#d8201a', '#1c3aa8', '#e8409a', '#2a8a4a', '#e88a2a', '#6a3aa8', '#3aa6e0', '#8a5a3a', '#f2c430', '#5ac8a0', '#9ad8e8'];
  const COLW = COLORI.slice(0, 3).concat(['#141418', '#141418', '#c8ccd2'], COLORI);   // la prima tinta: il nero e l'argento più spesso
  const testo = w => String(w.words || w.aka || '').toUpperCase();
  const classe = s => GRANDE.test(s) ? 'pezzo' : s;
  // la tavolozza che si vede: il cromo (la famiglia chrome o la tavolozza cromata) è argento qualunque sia il numero: conta come una tavolozza sola
  const tinta = w => { const P = WA().PAL[(w.pal || 0) % WA().PAL.length]; return w.fam === 'chrome' || w.fillk === 'chrome' || (P && P.chrome) ? 'cromo' : 'p' + w.pal; };
  function chiave(w) { if (w.style === 'adesivi' || w.style === 'buff') return w.style + '|' + w.seed; return classe(w.style) + '|' + testo(w) + '|' + (MONO.test(w.style) ? w.col : tinta(w)); }
  function chiavi(w) { const k = [chiave(w)]; if (GRANDE.test(w.style) || w.style === 'calli') k.push('throw|' + testo(w) + '|' + tinta(w)); return k; }   // il throw-up di riserva (le alternative)
  function unici(L) {
    const usate = new Set(), semi = new Set(), NP = WA().PAL.length;
    const scrivibili = L.filter(w => !w.erased && w.old && w.sdPal && w.surf !== 'treno' && w.by !== 'player');
    // prima i cotti (sono già sul muro), poi gli altri nell'ordine della storia
    scrivibili.sort((a, b) => (b.cotto ? 1 : 0) - (a.cotto ? 1 : 0));
    for (const w of scrivibili) {
      while (semi.has(w.seed)) { w.seed = (Math.imul(w.seed, 2654435761) >>> 0) % 1e9 + 1; conta.cambi.seme++; }
      semi.add(w.seed);
      if (w.sdToppa) { delete w.sdToppa; conta.toppe = (conta.toppe || 0) + 1; }   // la toppa grigia sopra un pezzo vecchio (sembrava un difetto del disegno): via
      if (w.style === 'adesivi' || w.style === 'buff') { usate.add(chiave(w)); continue; }
      if (MONO.test(w.style) && !w.col) w.col = COLW[w.seed % COLW.length];
      const libera = () => chiavi(w).every(k => !usate.has(k));
      if (!libera()) {
        const r = mulberry(w.seed ^ 0xA11CE), cr = CREW[w.crew] ? w.crew : null, nomi = cr ? roster(cr) : [w.aka];
        let ok = false;
        // un altro colore (o tavolozza), poi un altro writer della stessa crew: il primo libero
        for (let t = 0; t < nomi.length * 2 && !ok; t++) {
          if (t) { const a = nomi[(nomi.indexOf(w.aka) + 1) % nomi.length]; if (a !== w.aka) { const wr = scrittore(a, cr || w.crew); w.aka = a; w.hand = wr.hand; if (w.words && w.words !== w.crew) delete w.words; conta.cambi.nome++; } }
          const N = MONO.test(w.style) ? COLORI.length : NP, k0 = Math.floor(r() * N);
          for (let j = 0; j < N && !ok; j++) { if (MONO.test(w.style)) w.col = COLORI[(k0 + j) % N]; else { w.pal = (k0 + j) % N; if (j && (w.fam === 'chrome' || w.fillk === 'chrome')) { w.fam = 'throwie'; delete w.fillk; } } ok = libera(); }
        }
        if (MONO.test(w.style)) conta.cambi.colore++; else conta.cambi.tavolozza++;
      }
      chiavi(w).forEach(k => usate.add(k)); USO.set(w.aka, (USO.get(w.aka) || 0) + 1);
    }
    conta.unici = { lavori: scrivibili.length, chiavi: usate.size };
    return scrivibili;
  }
  // la prova (test_graffiti2.js): i doppioni fra i lavori della città
  function doppioni(L) { const v = new Map(), d = []; L.filter(w => !w.erased && w.old && w.sdPal && w.surf !== 'treno').forEach(w => { const k = chiave(w); if (v.has(k)) d.push(k); else v.set(k, w); }); return d; }

  function nuovi(st, ctx, esist) {
    const rng = mulberry(0x6A2F1), pick = a => a[Math.floor(rng() * a.length)], SITES = ctx.SITES || [], now = st.t, LOGHI = SD.LOGHI;
    // dove ci sono già lavori medi e grandi (una griglia di 4 m): quelli nuovi non ci finiscono sopra
    const cell = new Map(), key = (x, y) => Math.floor(x / 4) + ',' + Math.floor(y / 4), pos = w => w.pos ? [w.pos.x, w.pos.z] : w.spot ? [w.spot.x, w.spot.y] : null;
    const segna = (x, y, r) => { const k = key(x, y); cell.set(k, (cell.get(k) || []).concat([[x, y, r]])); };
    const libero = (x, y, r) => { const i0 = Math.floor(x / 4), j0 = Math.floor(y / 4); for (let i = i0 - 2; i <= i0 + 2; i++) for (let j = j0 - 2; j <= j0 + 2; j++) for (const q of cell.get(i + ',' + j) || []) if (hyp(q[0] - x, q[1] - y) < Math.max(r, q[2])) return false; return true; };
    esist.forEach(w => { if (/^(tag|mtag|adesivi|manifesto|buff)$/.test(w.style)) return; const p = pos(w); if (p) segna(p[0], p[1], /^(pezzo|burner|murale|rullo|calli|verticale)$/.test(w.style) ? 3 : 1.6); });
    esist.forEach(w => { if (w.aka) USO.set(w.aka, (USO.get(w.aka) || 0) + 1); });
    const porte = (G.BUILDINGS || []).filter(b => b.door).map(b => [(b.door[0] + .5) * TS, (b.door[1] + .5) * TS]);
    const vicinoPorta = (x, y) => porte.some(d => hyp(d[0] - x, d[1] - y) < 1.2 + TS * .5);
    const chi = z => { const cr = pick(RE[z] || RE.via); return scrittore(scegli(cr, rng), cr); };
    function lavoro(sp, wr, style, ex, liv) {
      const seed = Math.floor(rng() * 1e9), z = sp.sdZona;
      const sk = WA().conceive({ aka: wr.aka, crew: wr.crew, style, dna: wr.dna, seed, by: 'old:' + wr.aka });
      const w = Object.assign(sk, { by: 'old', hand: wr.hand || seed, surf: 'muro', spot: sp, place: sp.place, prog: 1, done: true, old: true, sdPal: 1, sdZona: z, sdLiv: liv, sdG2: 1, sdEta: .05 + rng() * .25 }, ex || {});
      if (style === 'tag') w.tagK = 1.25 + rng() * .35;   // le lettere grandi: si leggono dalla camera
      WR()._.addWork(st, w); w.t0 = w.tDone = now - Math.floor(rng() * 60) * 1440; daAgganciare(w); return w;
    }
    const corsa = (x, y, ox, oy, F) => { const t = F * .5, px = x + ox * t, py = y + oy * t, ax = -oy, ay = ox; return davanti(px, py, ax, ay, 12) + davanti(px, py, -ax, -ay, 12) < 18; };   // una via (stretta ai lati), non una piazza
    // i muri dove si cammina: i siti di writer_vita.js (i tratti di muro libero: 430 in tutta l'isola) più i muri lungo le vie, presi ogni 2,5 m
    // dai due lati di ogni via della città (le facciate con porte e finestre: placeWall resta fuori dalle aperture vere)
    const T = G.T || (G.MAP.world && G.MAP.world.T), tileV = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : G.MAP.grid[ty * GW + tx]; };
    const citta = (x, y) => { const M = G.MAP, tx = Math.floor(x / TS), ty = Math.floor(y / TS); return !M.zone || !M.Z || M.zone[ty * GW + tx] === M.Z.CITTA; };
    // la casa della casella: le botteghe (il pianterreno è vetrina, porta, insegna) restano pulite e non si provano nemmeno (i raggi falliscono lì)
    const CASA = { casa: 1, '-': 1, capanno: 1, cascina: 1, fabbrica: 1, autorimessa: 1 };
    const bottega = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); for (const b of G.BUILDINGS || []) if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) return !CASA[b.use || '-']; return false; };
    const muroDa = (x, y, ux, uy, d0, d1) => { for (let d = d0; d <= d1; d += .25) { const v = tileV(x + ux * d, y + uy * d); if (v === T.BLD) { const e = d - .55; if (e < .3 || bottega(x + ux * d, y + uy * d)) return null; const px = x + ux * e, py = y + uy * e; return walk(px, py) ? { x: px, y: py, d } : null; } if (v < 0 || v === T.WATER || v === T.CLIFF) return null; } return null; };
    // [graffiti_ny] 6. il centro nobile: le celle di 8 m delle vie che stanno su piazze, chiesa, palazzi del governo; un muro entro 14 m è «nobile»
    const NOB = new Set(), ck = (x, y) => Math.floor(x / 8) + ',' + Math.floor(y / 8);
    ((G.MAP.world || {}).roads || []).forEach(r => { const P = r.pts; if (!P || P.length < 2 || !/^(citta|vicolo|strada)$/.test(r.kind)) return; for (let k = 1; k < P.length; k++) { const L = hyp(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); for (let t = 0; t < L; t += 4) { const x = P[k - 1][0] + (P[k][0] - P[k - 1][0]) * t / L, y = P[k - 1][1] + (P[k][1] - P[k - 1][1]) * t / L; if (!citta(x, y)) continue; const z = SD.zonaPunto(x, y, 0, 0, 'strada'); if (z === 'piazza' || z === 'sacro' || z === 'regime') NOB.add(ck(x, y)); } } });
    const nobile = (x, y) => { const i0 = Math.floor(x / 8), j0 = Math.floor(y / 8); for (let i = i0 - 2; i <= i0 + 2; i++) for (let j = j0 - 2; j <= j0 + 2; j++) if (NOB.has(i + ',' + j) && hyp((i + .5) * 8 - x, (j + .5) * 8 - y) < 14) return true; return false; };
    const MURI = [], ARR = new Set();
    SITES.forEach(s => { if (/^(strada|hall|ferrovia|muro|ponte|rilevato)$/.test(s.kind) && s.out && !s.sdFondale) MURI.push({ s, x: s.x, y: s.y, out: s.out, len: s.len || 4 }); });
    ((G.MAP.world || {}).roads || []).forEach(r => { const P = r.pts; if (!P || P.length < 2 || !/^(citta|vicolo|strada)$/.test(r.kind)) return;
      let acc = 0; for (let k = 1; k < P.length; k++) { const ax = P[k - 1][0], ay = P[k - 1][1], dx = P[k][0] - ax, dy = P[k][1] - ay, L = hyp(dx, dy); if (L < 1e-3) continue; const ux = dx / L, uy = dy / L;
        for (let t = (2.5 - acc) % 2.5; t < L; t += 2.5) { const x = ax + ux * t, y = ay + uy * t; if (!citta(x, y)) continue;
          for (const sg of [1, -1]) { const nx = -uy * sg, ny = ux * sg, m = muroDa(x, y, nx, ny, .3, 8); if (m) MURI.push({ x: m.x, y: m.y, out: [-nx, -ny], len: 2.5, along: [ux, uy], face: Math.atan2(ny, nx), via: r.name }); } }
        acc = (acc + L) % 2.5; }
      // il muro d'arrivo: da ogni punto della via, nei due versi, il primo muro dritto davanti fra 6 e 24 m (dove la via piega o finisce:
      // chi cammina ci va incontro e la camera lo ha davanti); uno ogni 5 m
      for (let k = 1; k < P.length; k++) { const dx = P[k][0] - P[k - 1][0], dy = P[k][1] - P[k - 1][1], L = hyp(dx, dy); if (L < 1e-3) continue; const ux = dx / L, uy = dy / L;
        for (let t = 0; t < L; t += 2.5) { const x = P[k - 1][0] + ux * t, y = P[k - 1][1] + uy * t; if (!citta(x, y)) continue;
          for (const sg of [1, -1]) { const m = muroDa(x, y, ux * sg, uy * sg, 6, 24); if (!m) continue; const kk = Math.round(m.x / 5) + ',' + Math.round(m.y / 5); if (ARR.has(kk) || !citta(m.x, m.y)) continue; ARR.add(kk);
            MURI.push({ x: m.x, y: m.y, out: [-ux * sg, -uy * sg], len: 4, along: [-uy, ux], face: Math.atan2(uy * sg, ux * sg), via: r.name, arrivo: true }); } } } });
    let nA = 0, nF = 0;
    MURI.forEach(q => {
      const s = q.s, sp0 = s ? null : { x: q.x, y: q.y, face: q.face, h: null, place: q.via ? 'in ' + q.via : '', kind: 'strada' };
      const z = s ? SD.zonaSito(s) : SD.zonaPunto(q.x, q.y, q.out[0], q.out[1], 'strada'); if (PULITE[z] || !(z in CAMMINO)) return;
      const nob = nobile(q.x, q.y); if (nob) conta.nobile++;
      const len = q.len, rt = SD.ritmo(q.x, q.y), A = q.along || [-q.out[1], q.out[0]];
      const posto = du => s ? Object.assign(ctx.spotOf(s, du, null), { sdZona: z, h: null }) : Object.assign({}, sp0, { x: sp0.x + A[0] * du, y: sp0.y + A[1] * du, sdZona: z });
      // 4. il muro d'arrivo (in fondo al tratto, o un sito con 7-32 m di via dritta e stretta davanti); nel centro nobile niente
      const F = s ? davanti(q.x, q.y, q.out[0], q.out[1], 34) : 0;
      if (!nob && (q.arrivo || (s && F >= 7 && F <= 32 && corsa(q.x, q.y, q.out[0], q.out[1], F))) && libero(q.x, q.y, 3) && !vicinoPorta(q.x, q.y)) {
        const big = len >= 5 || (q.arrivo && rng() < .5), style = big ? 'pezzo' : 'throw', W0 = big ? clamp(len - .6, 3.6, 4.6) : clamp(len - .3, 2.6, 3.2), H0 = big ? Math.max(1.5, W0 * .4) : Math.max(1.2, W0 * .45), sp = posto(0);
        lavoro(sp, chi(z), style, { W0, H0, sdStrato: 0, bgk: 'rullo', sdMinK: .55, sdGrandi: [{ k: 'arrivo', style, W0, H0, hRel: Math.max(1.1, H0 / 2 + .3), spot: sp }], sdAlt: alternative({ style, W0, H0 }, sp) }, 'arrivo');
        segna(q.x, q.y, 4); nA++;
        if (q.arrivo) return;
      }
      if (q.arrivo) return;
      // 5. la fascia all'altezza degli occhi (lungo le vie un po' meno che sui muri liberi: ci sono porte e vetrine); [graffiti_ny] solo da writer
      let n = Math.floor(CAMMINO[z] * (s ? 1 : .6) * (nob ? .35 : 1) * len / 10 * clamp(rt, .6, 1.6) + rng());
      for (let i = 0; i < n; i++) {
        const r0 = rng(); let style = r0 < .34 ? 'throw' : r0 < .7 ? 'tag' : r0 < .8 ? 'mtag' : r0 < .9 ? 'adesivi' : r0 < .95 ? 'gotico' : 'pezzo';
        if (style === 'pezzo' && (nob || len < 3.6)) style = 'throw';
        const mid = style === 'throw' || style === 'pezzo' || style === 'gotico', du = (rng() - .5) * Math.max(0, len - (style === 'pezzo' ? 3.4 : style === 'throw' ? 2.6 : 1)), sp = posto(du), x = sp.x, y = sp.y;
        if (vicinoPorta(x, y)) continue;
        if (mid && !libero(x, y, style === 'pezzo' ? 3 : style === 'throw' ? 2.4 : 1.2)) continue;
        if (style === 'throw' && len < 2.4) continue;
        const ex = { sdStrato: mid ? 0 : 1 }, wr = chi(z);
        if (style === 'throw') Object.assign(ex, { W0: 2.6, H0: 1.25 });
        if (style === 'pezzo') Object.assign(ex, { W0: 3.4, H0: 1.45, bgk: 'rullo' });
        if (style === 'gotico') Object.assign(ex, { W0: 1.1, H0: 2.4 });
        if (style === 'adesivi') { const crs = (RE[z] || RE.via).concat(['PVK']); ex.sdAdesivi = { n: 7 + Math.floor(rng() * 5), nomi: crs.flatMap(c => roster(c).slice(0, 3).concat(roster(c).slice(4, 6))), crew: crs, loghi: LOGHI }; }
        const hRel = style === 'throw' ? 1.15 + rng() * .3 : style === 'pezzo' ? 1.15 : style === 'gotico' ? 1.6 : style === 'tag' ? 1.0 + rng() * .7 : .9 + rng() * .7;
        ex.sdGrandi = [{ k: 'occhi', style, W0: ex.W0, H0: ex.H0, hRel, spot: sp }]; ex.sdAlt = alternative({ style, W0: ex.W0, H0: ex.H0 }, sp);
        lavoro(sp, wr, style, ex, 'fascia'); if (mid) segna(x, y, style === 'pezzo' ? 3 : style === 'throw' ? 2.4 : 1.2); nF++;
      }
    });
    conta.arrivo = nA; conta.fascia = nF; return nA + nF;
  }

  // ---- 10. [graffiti_ny] L'AGGANCIO AL MURO VERO (solo nel browser, camminando) ----
  // sdAgg: 0 da agganciare, 1 agganciato, 2 lasciato com'era (nessun muro trovato in tre prove). Finché non è agganciato il giro dei graffiti
  // (writing.js scanNear) non lo prova (__gfxWait); agganciato, i fallimenti di prima si azzerano e le alternative si rifanno sul muro vero
  const BROWSER = typeof window !== 'undefined' && typeof requestAnimationFrame !== 'undefined';
  function daAgganciare(w) { if (!BROWSER || !w.spot || w.sdAnc || w.sdRun || w.cotto) return; w.sdAgg = 0; w.__gfxWait = 1e15; }
  const AG = { L: null, i: 0, t: 0, cx: 1e9, cy: 1e9, tf: 0 };
  function aggancia(w, THREE, R, RW, now) {
    const GFX = WR().GFX, sp = w.spot;
    if (w.gfxRect || (GFX.works && GFX.works[w.id])) { w.sdAgg = 1; return; }
    if (GFX.pw && GFX.pw.w === w) return;   // a metà dei raggi di placeWall: dopo
    if (w.__aggT > now) return;
    let x = sp.x, y = sp.y; const fx = Math.cos(sp.face), fy = Math.sin(sp.face);
    if (!walk(x, y)) { let ok = false; for (let d = .4; d <= 2.4 && !ok; d += .4) for (const s of [-1, 1]) { const qx = sp.x - fx * d * s, qy = sp.y - fy * d * s; if (walk(qx, qy)) { x = qx; y = qy; ok = true; break; } } }   // il posto dentro la casa: fuori
    const list = RW.cands(x, y); if (!list.length) { w.__aggT = now + 2000; return; }
    const MT = typeof Tasselli !== 'undefined' && Tasselli.raggiMancanti ? Tasselli.raggiMancanti : () => 0, m0 = MT(), gh = R.groundH(x, y);
    const o = new THREE.Vector3(x, gh + 1.3, y), o2 = new THREE.Vector3(x, gh + 2.4, y), d = new THREE.Vector3(); let best = null;
    for (let k = 0; k < 16; k++) {
      const a = sp.face + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 8; d.set(Math.cos(a), 0, Math.sin(a));
      const h = RW.rayWall(o, d, 4.5, list); if (!h || Math.abs(h.n.y) > .3) continue;
      const D = hyp(h.p.x - x, h.p.z - y), dev = Math.abs(Math.atan2(Math.sin(a - sp.face), Math.cos(a - sp.face))), sc = D + dev * .9;
      if (best && sc >= best.sc) continue;
      const h2 = RW.rayWall(o2, d, 5.5, list); if (!h2 || Math.abs(h2.n.y) > .3 || Math.abs((h2.p.x - h.p.x) * h.n.x + (h2.p.z - h.p.z) * h.n.z) > .25) continue;   // un muro alto, non una macchina o un muretto
      best = { h, sc, D };
      if (k === 0 && D < 3) break;   // la direzione data va già bene
    }
    if (MT() !== m0) { w.__aggT = now + 1500; conta.aggancio.attese++; return; }   // i dati dei raggi del tassello non ancora arrivati
    if (!best) { w.__aggN = (w.__aggN || 0) + 1; if (w.__aggN >= 3) { w.sdAgg = 2; w.__gfxWait = 0; conta.aggancio.no++; } else w.__aggT = now + 2500; return; }
    const n = best.h.n, L = hyp(n.x, n.z) || 1, nx = n.x / L, nz = n.z / L, X = best.h.p.x + nx * .55, Y = best.h.p.z + nz * .55, face = Math.atan2(-nz, -nx);
    if (hyp(X - sp.x, Y - sp.y) > .3 || Math.abs(Math.atan2(Math.sin(face - sp.face), Math.cos(face - sp.face))) > .2) conta.aggancio.spostati++;
    Object.assign(sp, { x: X, y: Y, face });   // lo stesso oggetto delle prove grandi (sdGrandi: spot) del lavoro
    const base = { style: w.style, W0: w.W0, H0: w.H0 }; if (w.sdAlt) w.sdAlt = alternative(base, sp);
    Object.assign(w, { sdAgg: 1, gfxFail: 0, __gfxWait: 0, __altFatto: false, __no: null, __prove: [] }); conta.aggancio.ok++;
  }
  function passo() {
    const pv = window.__pv, st = pv && pv.st, R = pv && pv.R, THREE = window.THREE, Wr = typeof Writing !== 'undefined' ? Writing : null, RW = Wr && Wr.__ray;
    if (!st || !st.wr || !st.player || !THREE || !RW || !R || !R.groundH || !Wr.GFX) return;
    const now = performance.now(), dt = AG.tf ? Math.min(1000, now - AG.tf) : 16; AG.tf = now;
    const px = st.player.x, py = st.player.y;
    if (!AG.L || now - AG.t > 800 || hyp(px - AG.cx, py - AG.cy) > 12) { AG.t = now; AG.cx = px; AG.cy = py; AG.i = 0;
      AG.L = st.wr.works.filter(w => w.sdAgg === 0 && !w.erased && w.spot && hyp(w.spot.x - px, w.spot.y - py) < 95).map(w => [w, hyp(w.spot.x - px, w.spot.y - py)]).sort((a, b) => a[1] - b[1]).map(a => a[0]); }
    const t0 = performance.now(), cap = clamp(dt * .06, 1.5, 12);
    while (AG.i < AG.L.length && performance.now() - t0 < cap) { const w = AG.L[AG.i++]; if (w.sdAgg === 0) aggancia(w, THREE, R, RW, now); }
  }
  if (BROWSER) { const loop = () => { requestAnimationFrame(loop); try { passo(); } catch (e) { if (!AG.err) { AG.err = true; console.warn('[graffiti2] aggancio', e); } } }; requestAnimationFrame(loop); }

  return { on: true, misura, alternative, unici, doppioni, chiave, VIA, EXTRA, roster, passo };
})();
if (typeof module !== 'undefined') module.exports = Graffiti2;
