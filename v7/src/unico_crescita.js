/* [unico] unico_crescita.js: IL PRESIDIO CHE SI FANNO DA SOLI (dietro ?commedia). Spento il flag: UnicoCrescita = { ON: false }.
   Il direttore artistico: «il presidio sembra un modello già fatto: lo striscione su due pali e la solita roba. La forma la devono
   decidere loro: mettiamo una barriera qui, un telo là, una baracca in mezzo, una panca, le lucine… ne parlano e poi la fanno».
   Sopra unico_parti.js (le parti, le regole, le misure), unico_costruire.js (il cantiere), unico_presidio.js (chi viene, le attività, i
   Grigi, le auto), unico_cultura.js (il nome, il simbolo, le parole) e unico_corpi.js (le pose). Niente copione: niente posti fissi,
   niente tempi, niente ordine. Restano solo le regole fisiche (nessuna compenetrazione, il suolo giusto, i tetti di costo).
   - IL PRIMO GESTO. GEN.presidio non è più un modello: i fondatori mettono UNA cosa (due sedie e una cassa, la panca, il fusto per
     cucinare, la bandiera, lo striscione col nome, la tavola), su un lato, dove capita. Lo stato: C.cr (dati, si salva col cantiere).
   - LE PROPOSTE. Di giorno, fra chi è in strada, ogni tanto qualcuno propone una cosa: CHE COSA viene da come è fatto (i tratti di
     UnicoIdee: follia, viltà, carisma, testardo, contrario; l'età, il mestiere, il temperamento di UnicoCorpi), dalla storia del gruppo
     (la cultura: il pezzo preferito, gli episodi: resistenza, feste, multe), da quello che succede (i Grigi passati, le macchine che
     passano, quanti sono e quante sedute ci sono, la sera, il sole) e da quello che c'è già (le cose ripetute stancano). DOVE: il posto
     si cerca davvero (contro il muro, sul bordo della corsia, in mezzo alla strada: dipende da quanto è ardito chi propone), vicino alle
     cose che ci sono, lontano dagli incroci se si può (una preferenza, non una regola), sul suolo giusto, fuori dalle case, dai mezzi,
     dalle porte, dalla roba di strada, senza toccare un pezzo (UP.valida, 12 mm) e con un po' d'aria fra una cosa e l'altra.
   - NE PARLANO. La proposta è un piccolo dialogo fatto di dati: chi propone dice la sua (le parole del gruppo: il nome, il gergo, il
     simbolo, il motto), gli altri rispondono (d'accordo, contro coi loro motivi, la battuta, «no, più in là» con un altro posto vero),
     si conta (i tratti, l'affetto per chi propone, quanto la cosa piace a ognuno) e chi ha vinto lo dice. Le battute non si ripetono
     (la memoria per presidio delle frasi usate). Chi ne parla si raduna attorno al posto (la mente, la posa «discute»).
   - LA FANNO. Approvata, i pezzi entrano nel piano del cantiere (ordinati dal basso) e la gente li va a prendere (il materiale alla
     sorgente più vicina: il deposito, la calata, la discarica; «raccatta», poi in braccio, poi la posa) e li mette uno per uno; chi è
     lontano dal giocatore lo fa dai dati. Finita: il fatto, la misura (UP.misura: la copertura del telo, la chiusura, il passaggio).
   - LE AUTO seguono la forma: in mezzo passa il tratto libero più largo fra i pezzi bassi (sotto i 2 m, niente decori): se c'è posto
     rallentano e ci passano in mezzo (stretto: piano piano); se non c'è, si fermano prima del primo pezzo e tornano indietro. Nessun
     segno di «chiuso»: solo la geometria. La strada chiusa è un fatto che si scrive quando succede (e la riapertura).
   - I GRIGI vedono quello che c'è: quanto in là vanno (guardare, multa, ordine, sgombero) dipende da quanto è grosso e da che cosa fa
     il presidio (una sedia no; la strada chiusa sì). All'ordine si portano via il pezzo che dà più fastidio.
   - IL DISEGNO delle parti nuove (le lucine, la bandiera, la bacheca, il murale, il divano, il cartello col simbolo) sopra quello di
     unico_parti_vivo.js (UV.extra, unito per materiale con il resto: una chiamata per materiale).
   - IL PASSAGGIO è un'opinione, non una regola: chi ha la bottega e aspetta il furgone, chi guida o ha amici che guidano, i prudenti, chi
     teme i Grigi ci tengono; chi resiste, gli arditi, chi è stufo delle macchine lo vogliono chiuso (profilo().varco). Il posto si cerca
     tenendo il passaggio del piano com'è, se chi propone non vuole chiudere; quando una proposta lo chiuderebbe ne parlano («così
     chiudiamo la strada», «e il furgone del pane?», con un altro posto che lo lascia; «e chiudiamola!»), e chiudere vuole una maggioranza
     vera: la decisione si scrive (il fatto, la riga in UCr.decisioni). Nessuna cosa chiude la strada senza che l'abbiano deciso.
   - LA DISCUSSIONE ha la sua forma: una F-formazione aperta verso il posto (1–1,5 m fra uno e l'altro), chi propone di fianco al posto lo
     indica, chi è contro incrocia le braccia e fa no con la testa, chi scherza ride, chi non sa alza le spalle, chi è d'accordo annuisce;
     qualcuno si siede sulla sedia libera lì vicino, chi sta al muro ci si appoggia, uno a volte si accovaccia; tutti guardano chi parla.
   - LA ROBA DI STRADA che il disegno carica dopo: a ogni battito le cose si ricontrollano; quella che ci sta sopra la spostano o la smontano.
   - IL PRIMO GIORNO: il gesto resta uno, ma i fondatori portano da casa una cosa piccola ciascuno (la radio, il thermos, un cuscino, le
     carte, una piantina) e le prime proposte vengono presto.
   - CHI PORTA I PEZZI: se la sorgente è oltre la distanza dei corpi, il pezzo lo si prende lì vicino e lo si porta a vista.
   I fatti: presidio_proposta, presidio_deciso, presidio_cosa (finita), presidio_roba, presidio_spostata, presidio_sequestro, strada_chiusa, strada_riaperta. */
var UnicoCrescita = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const ON = /[?&]commedia\b/.test(Q);
  const UCr = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UCr;
  if (!ON) return UCr;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const UC = typeof UnicoCostruire !== 'undefined' && UnicoCostruire.ON ? UnicoCostruire : null;
  const UPr = typeof UnicoPresidio !== 'undefined' && UnicoPresidio.ON ? UnicoPresidio : null;
  const V = typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null;
  const FT = typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null;
  if (!G || !Un() || !UC || !UPr || !V || !FT) { UCr.ON = false; return UCr; }
  const UP = UC.UP, PARTI = UP.PARTI, hyp = Math.hypot, PI = Math.PI, hashS = UP.hashS, rngDi = UP.rngDi;
  const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100, r3 = x => Math.round(x * 1000) / 1000, cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const UCu = () => (typeof UnicoCultura !== 'undefined' && UnicoCultura.ON ? UnicoCultura : null);
  const ID = () => (typeof UnicoIdee !== 'undefined' && UnicoIdee.ON ? UnicoIdee : null);
  const UV = typeof UnicoPartiVivo !== 'undefined' && UnicoPartiVivo.ON ? UnicoPartiVivo : null;
  const CFG = UCr.CFG = { ogni: 240, fase: 6, maxEl: 16, maxParti: 72, ore: [8, 23.5], pausa: [35, 120], discuti: [10, 22], minPresenti: 2, voti: 6, aria: .22, lato: 6.5, cerca: 48,
    porta: 3, vista: 35, lento: 2.4, stretto: 1.3, margine: .3, sbarraPiedi: [.7, .9], vicino: 26, dopoPorta: 40 };
  const stats = UCr.stats = { proposte: 0, si: 0, no: 0, contro: 0, cose: 0, pezzi: 0, senzaPosto: 0, battute: 0, sequestri: 0, chiusure: 0, riaperture: 0, varcoNo: 0, varcoAlt: 0, decisoChiudere: 0, decisoAperta: 0, spostate: 0, tolte: 0, roba: 0, guardia: 0, chiuseSenza: 0, auto: 0, strette: 0, ferme: 0, indietro: 0, prese: 0 };
  const npc = (st, id) => (G.byId ? G.byId(st, id) : st.npcs.find(n => n.id === id));
  const ora = st => (st.t % 1440) / 60;
  const presidi = st => ((st.u && st.u.costruire && st.u.costruire.cantieri) || []).filter(C => C.tipo === 'presidio' && !C.chiuso && C.fine !== null);
  const messi = C => new Set(C.pezzi.map(p => p[0]));
  const scegliR = (r, L) => L[Math.floor(r() * L.length) % L.length];
  const tra = (r, a, b) => a + (b - a) * r();
  const pesata = (r, L) => { let t = 0; for (const x of L) t += Math.max(0, x[1]); if (t <= 0) return null; let k = r() * t; for (const x of L) { k -= Math.max(0, x[1]); if (k <= 0) return x[0]; } return L[L.length - 1][0]; };

  // ======================= LE PARTI NUOVE (dati: misure, peso, il materiale da raccattare) =======================
  const P = (n, d, kg, rob, o) => Object.assign({ n, d, kg, rob, portata: 0, vol: 0 }, o);
  Object.assign(PARTI, {
    lucine: P('lucine', [4, .03, .06], 1, 'corda', { mat: 'tela', decoro: 1, cut: 0 }),
    bandiera: P('bandiera', [.9, .02, .6], .5, 'telo', { mat: 'tela', decoro: 1 }),
    bacheca: P('bacheca', [1.1, .12, 1.75], 8, 'assi', { mat: 'legno' }),
    murale: P('murale', [2.2, .1, 1.6], 14, 'assi', { mat: 'legno', cut: 0 }),
    divano: P('divano', [1.7, .8, .82], 30, 'mobile_rotto', { mat: 'tela', siede: 1 }),
    cartello: P('cartello', [.6, .08, 2], 3, 'assi', { mat: 'legno' }),
  });
  for (const k of ['lucine', 'bandiera', 'bacheca', 'murale', 'divano', 'cartello']) UC.MAT[k] = PARTI[k].rob;
  // la roba di casa dei fondatori (il primo giorno): piccola, appoggiata sopra una cassa o per terra accanto alle cose; non si raccatta,
  // la porta da casa chi la porta
  Object.assign(PARTI, {
    radio: P('radio', [.34, .13, .2], 2.5, null, { mat: 'vernice', decoro: 1, cut: 0 }),
    thermos: P('thermos', [.1, .1, .32], 1, null, { mat: 'vernice', decoro: 1, cut: 0 }),
    cuscino: P('cuscino', [.42, .42, .09], .5, null, { mat: 'tela', decoro: 1, cut: 0 }),
    carte: P('carte', [.16, .1, .03], .1, null, { mat: 'tela', decoro: 1, cut: 0 }),
    piantina: P('piantina', [.24, .24, .34], 2, null, { mat: 'vernice', decoro: 1, cut: 0 }),
  });
  const NUOVE = new Set(['lucine', 'bandiera', 'bacheca', 'murale', 'divano', 'cartello', 'radio', 'thermos', 'cuscino', 'carte', 'piantina']);

  // ======================= LE COSE (ricette piccole, con variazione) =======================
  // Ogni ricetta monta la cosa nel suo sistema: x di traverso alla via, y lungo la via, l'origine al centro, il davanti verso −x (la cosa
  // pensata sul lato +x, contro il muro di destra; sull'altro lato si specchia). Le «traverso» (striscione, lucine, barricata) sono larghe
  // quanto la via e hanno già la loro x.
  function costruttore() {
    const L = [];
    const put = (k, cx, cy, cz, yaw, pitch, roll, exL, exD) => { L.push([k, r3(cx), r3(cy), r3(cz), r3(yaw || 0), r3(pitch || 0), r3(roll || 0), exL ? r3(exL) : 0, exD ? r3(exD) : 0]); return L.length - 1; };
    const posa = (k, cx, cy, z0, yaw, pitch, roll, exL, exD) => { const t = [k, 0, 0, 0, yaw || 0, pitch || 0, roll || 0, exL || 0, exD || 0], ez = UP.zMax(UP.obb(t)); return put(k, cx, cy, z0 + ez + .002, yaw, pitch, roll, exL, exD); };
    const top = i => UP.zMax(UP.obb(L[i]));
    return { L, put, posa, top };
  }
  // il palo piantato in due copertoni (come quelli dello striscione di sempre)
  const palo = (B, x, y, H) => { B.posa('pneumatico', x, y, 0); B.posa('pneumatico', x, y, .202); B.put('tubo', x, y, H / 2 + .002, 0, PI / 2, 0, H); };
  const GEN = UCr.GEN = {
    // due sedie in strada e una cassa per appoggiare il caffè: il gesto più piccolo
    sedie: (r) => { const B = costruttore(), n = r() < .5 ? 2 : 3; B.posa('cassa', .1, 0, 0); B.posa('sedia', .1, -.62, 0, PI / 2); B.posa('sedia', .1, .62, 0, PI / 2); if (n === 3) B.posa('sedia', -.62, .05, 0, -PI / 2 + .4); return B.L; },
    panca: (r) => { const B = costruttore(), v = r();
      if (v < .4) { B.posa('bancale', 0, 0, 0, PI / 2); B.posa('bancale', 0, 0, .146, PI / 2); }
      else if (v < .75) { for (const y of [-.65, .65]) B.posa('cassa', 0, y, 0); for (const x of [-.105, .105]) B.posa('asse', x, 0, .604, PI / 2); }
      else { for (const y of [-.62, .62]) B.posa('bancale', 0, y, 0, PI / 2); B.posa('pneumatico', 0, 1.58, 0); }   // (a 1,45 il copertone entrava nel bancale)
      return B.L; },
    tavolata: (r) => { const B = costruttore(), n = scegliR(r, [2, 3, 4, 4]); B.posa('tavolo', 0, 0, 0); B.posa('sedia', 0, -.66, 0, 0); B.posa('sedia', 0, .66, 0, PI); if (n >= 3) B.posa('sedia', -.66, 0, 0, -PI / 2); if (n >= 4) B.posa('sedia', .68, 0, 0, PI / 2); if (r() < .4) B.posa('vaso', .1, 1.25, 0); return B.L; },
    cucina: (r) => { const B = costruttore(); B.posa('fusto', 0, 0, 0); B.posa('cassa', 0, .75, 0); if (r() < .5) B.posa('cassa', 0, .75, .602); else B.posa('tavolo', -.05, 1.62, 0); if (r() < .6) B.posa('pneumatico', -.05, -.85, 0); else B.posa('sedia', -.1, -.8, 0, 0); return B.L; },
    tettoia: (r) => { const B = costruttore(), hy = tra(r, 1.0, 1.25), H = tra(r, 2.15, 2.35);
      for (const sx of [-.7, .7]) for (const sy of [-hy, hy]) palo(B, sx, sy, H);
      B.put('telo', 0, 0, H + .002 + .005 + .003, 0, 0, 0, 1.62, 2 * hy + .3);
      const v = r(); if (v < .45) { B.posa('tavolo', 0, 0, 0); B.posa('sedia', 0, -.58, 0, 0); } else if (v < .75) B.posa('bancale', 0, 0, 0, PI / 2); else if (hy > 1.18) B.posa('divano', -.02, 0, 0, PI / 2); else B.posa('cassa', 0, 0, 0);
      return B.L; },
    baracca: (r) => { const B = costruttore(), Lx = .88, Ly = 1.88, H = tra(r, 2.1, 2.2), telo = r() < .35;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) B.put('trave', sx * Lx / 2, sy * Ly / 2, H / 2 + .002, 0, PI / 2, 0, H);
      B.put('lamiera', 0, Ly / 2 + .08, 1.012, PI / 2, PI / 2, 0);
      for (const sx of [-1, 1]) for (let j = 0; j < 2; j++) B.put('lamiera', sx * (Lx / 2 + .08), -.5 + j, 1.012, 0, PI / 2, 0);
      B.put('porta', 0, -(Ly / 2 + .084), 1.012, PI / 2, PI / 2, 0);
      if (telo) B.put('telo', 0, 0, H + .002 + .005 + .002, PI / 2, 0, 0, 2.3, 1.3); else B.put('lamiera', 0, 0, H + .002 + .02 + .002, PI / 2, 0, 0);
      if (r() < .5) B.posa('pneumatico', 0, -(Ly / 2 + .6), 0);
      return B.L; },
    barriera: (r) => { const B = costruttore(), v = r();
      if (v < .4) { const n = scegliR(r, [3, 4]); for (let i = 0; i < n; i++) { const y = (i - (n - 1) / 2) * .68; B.posa('pneumatico', 0, y, 0); if (r() < .7) B.posa('pneumatico', 0, y, .202); } }
      else if (v < .75) { for (const y of [-.8, .8]) B.posa('fusto', 0, y, 0); B.posa('trave', 0, 0, .902, PI / 2, 0, 0, 2.3); if (r() < .5) B.posa('pneumatico', -.5, 0, 0); }
      else { for (const y of [-.62, 0, .62]) B.posa('cassa', 0, y, 0); B.posa('cassa', 0, -.31, .602); B.posa('pneumatico', -.7, .9, 0); }
      return B.L; },
    palco: (r) => { const B = costruttore(), n = scegliR(r, [2, 3, 3]);
      for (let i = 0; i < n; i++) { const y = (i - (n - 1) / 2) * .82; for (const x of [-.3, .3]) B.posa('cassa', x, y, 0); B.posa('bancale', 0, y, .604); }
      B.posa('pneumatico', 0, (n * .82) / 2 + .36, 0); return B.L; },
    bacheca: (r) => { const B = costruttore(); B.posa('bacheca', 0, 0, 0, PI / 2); if (r() < .5) B.posa('cassa', 0, .95, 0); return B.L; },
    murale: (r) => { const B = costruttore(); B.posa('murale', 0, 0, 0, PI / 2, 0, 0, tra(r, 1.6, 2.4)); return B.L; },
    divano: (r) => { const B = costruttore(); B.posa('divano', 0, 0, 0, PI / 2); if (r() < .6) B.posa('cassa', -.75, 0, 0); if (r() < .4) B.posa('vaso', 0, 1.15, 0); return B.L; },
    insegna: (r) => { const B = costruttore(); B.posa('cartello', 0, 0, 0, PI / 2); if (r() < .6) B.posa('pneumatico', 0, .68, 0); return B.L; },
    bandiera: (r) => { const B = costruttore(), H = tra(r, 2.8, 3); palo(B, 0, 0, H); B.put('bandiera', 0, .03 + .45 + .004, H - .32, PI / 2, 0, 0); return B.L; },
    orto: (r) => { const B = costruttore();
      if (r() < .5) { for (const y of [-.32, .32]) { B.posa('cassa', 0, y, 0); B.posa('vaso', 0, y, .604); } B.posa('vaso', 0, .95, 0); }
      else { B.posa('bancale', 0, 0, 0, PI / 2); for (const y of [-.38, .38]) B.posa('vaso', 0, y, .148); B.posa('vaso', -.05, 1.0, 0); }
      return B.L; },
    // le traverso: x già messa, larghe quanto la via (W)
    striscione: (r, o) => { const B = costruttore(), xp = o.W / 2 - .12 - .32; for (const s of [-1, 1]) palo(B, s * xp, 0, 3); B.put('scritta', 0, 0, 2.55, PI, 0, 0, 2 * (xp - .034)); return B.L; },
    lucine: (r, o) => { const B = costruttore(), xp = o.W / 2 - .12 - .32; for (const s of [-1, 1]) palo(B, s * xp, 0, 3); B.put('lucine', 0, 0, 2.9, 0, 0, 0, 2 * (xp - .034)); return B.L; },
    // la barricata: la ricetta di sempre (GEN.sbarramento), senza pali né striscione, da un muro all'altro col solo varco a piedi; la
    // «strettoia» solo su un pezzo di via (le macchine passano strette)
    sbarramento: (r, o) => sbarra(r, o, false),
    strettoia: (r, o) => sbarra(r, o, true),
  };
  function sbarra(r, o, mezza) {
    const W = o.W, w = mezza ? W * tra(r, .5, .62) : W, piedi = tra(r, CFG.sbarraPiedi[0], CFG.sbarraPiedi[1]), lato = r() < .5 ? 1 : -1;
    const Pg = UP.progetta('barricata', 'cr|' + o.seme + (mezza ? '|m' : ''), { w, varco: mezza ? .2 : piedi, lato }); if (!Pg) return null;
    const pali = Pg.parti.filter(p => p[0] === 'trave');
    let L = Pg.parti.filter(p => p[0] !== 'striscione' && p[0] !== 'trave' && !(p[0] === 'pneumatico' && pali.some(q => Math.abs(q[1] - p[1]) < .05 && Math.abs(q[2] - p[2]) < .05))).map(p => p.slice());
    if (mezza) { const F = UP.impronta(L), dx = (W / 2 - .12) - F[2]; L.forEach(p => { p[1] = r3(p[1] + dx); }); }
    const F = UP.impronta(L), dy = -(F[1] + F[3]) / 2; L.forEach(p => { p[2] = r3(p[2] + dy); });
    return L;
  }
  UCr.sbarra = sbarra;

  // ======================= IL CATALOGO: che cosa è, dove sta, a chi piace =======================
  // dove: i pesi per profondità (muro: contro il bordo della via; corsia: sul bordo della carreggiata; mezzo: in mezzo alla strada);
  // vuole(p): quanto la vuole chi ha il profilo p (vedi profilo()); max: quante al più
  const EL = UCr.EL = {
    sedie: { n: ['due sedie', 'le sedie', 'un paio di sedie'], g: 'f', pl: 1, dove: { muro: 3, corsia: 1, mezzo: .4 }, max: 2, siede: 2, vuole: p => .6 + p.pigro * .8 + p.anziano * .8 + p.posti * 1.5 },
    panca: { n: ['una panca', 'una panchina di bancali', 'un posto per sedersi'], g: 'f', dove: { muro: 3, corsia: 1.2, mezzo: .3 }, max: 2, siede: 3, vuole: p => .5 + p.anziano * 1.2 + p.posti * 2 + p.pref('bancale') + p.pref('cassa') * .5 },
    tavolata: { n: ['una tavolata', 'un tavolo con le sedie', 'la tavola per tutti'], g: 'f', dove: { muro: 1.5, corsia: 1.5, mezzo: 1 }, max: 2, siede: 3, vuole: p => .5 + p.festa * 1.2 + p.posti * 1.2 + p.cuoco * .6 + p.pref('tavolo') + p.pref('sedia') * .5 },
    cucina: { n: ['un angolo cucina', 'la cucina', 'un fornello col fusto'], g: 'm', dove: { muro: 3, corsia: .8, mezzo: .2 }, max: 1, vuole: p => .3 + p.cuoco * 3 + p.festa * .6 + p.fame * .8 + p.pref('fusto') },
    tettoia: { n: ['una tettoia', 'un telo per l\'ombra', 'un tendone'], g: 'f', dove: { muro: 2.5, corsia: 1, mezzo: .6 }, max: 2, vuole: p => .3 + p.sole * 1.6 + p.anziano * .5 + p.pratico * .8 + p.nessunTetto },
    baracca: { n: ['una baracca', 'un casotto di lamiera', 'una baracchetta'], g: 'f', dove: { muro: 2, corsia: 1, mezzo: .8 }, max: 1, vuole: p => .15 + p.notte * 1.2 + p.resiste * 1 + p.pratico * .6 + p.eta * .6 + p.pref('lamiera') + p.pref('porta') },
    barriera: { n: ['una barriera', 'un riparo di copertoni', 'una fila di copertoni'], g: 'f', dove: { muro: .5, corsia: 2.5, mezzo: 1 }, max: 2, vuole: p => .2 + p.vile * 1.5 + p.auto * 1.2 + p.grigi * .8 + p.pref('pneumatico') },
    strettoia: { n: ['una strettoia', 'mezza barricata', 'un muretto a metà strada'], g: 'f', traverso: 1, max: 1, vuole: p => .05 + p.auto * 1.8 + p.grigi * .8 + p.vile * .4 + p.contrario * .5 + Math.max(0, -p.varco) * .6 },
    sbarramento: { n: ['una barricata', 'la barricata da un muro all\'altro', 'un muro di bancali e porte'], g: 'f', traverso: 1, max: 1, chiude: 1, vuole: p => .02 + p.grigi * 1.6 + p.resiste * 1.6 + p.auto * 1.2 + p.ardito * 1.1 + p.contrario * .8 - p.vile * 1.2 - p.varco * 1.4 },
    palco: { n: ['un palco', 'un palchetto di bancali', 'una pedana per suonare'], g: 'm', dove: { muro: 1.2, corsia: 1.2, mezzo: 1.5 }, max: 1, vuole: p => .1 + p.festa * 1.6 + p.giovane * 1 + p.teatrale * 1.2 + p.pref('bancale') * .5 },
    lucine: { n: ['le lucine', 'un filo di lampadine', 'le luci da festa'], g: 'f', pl: 1, traverso: 1, max: 1, vuole: p => .2 + p.festa * 1.4 + p.giovane * .8 + p.sera * 1.4 },
    striscione: { n: ['lo striscione', 'lo striscione col nome', 'un lenzuolo col nome'], g: 'm', traverso: 1, max: 1, vuole: p => .25 + p.carisma * 1.6 + p.haNome * 1.2 + p.grigi * .4 },
    bandiera: { n: ['la bandiera', 'una bandiera col simbolo', 'un drappo in cima a un palo'], g: 'f', dove: { muro: 2, corsia: 1.5, mezzo: .6 }, max: 2, vuole: p => .15 + p.carisma * .8 + p.haNome * .9 + p.resiste * .5 },
    insegna: { n: ['un cartello col simbolo', 'l\'insegna', 'un cartello'], g: 'm', dove: { muro: 1.5, corsia: 2, mezzo: .6 }, max: 1, vuole: p => .15 + p.haNome * .9 + p.carisma * .5 + p.teatrale * .5 },
    bacheca: { n: ['una bacheca', 'un posto per gli avvisi', 'una bacheca di sughero'], g: 'f', dove: { muro: 3, corsia: .8, mezzo: .2 }, max: 1, vuole: p => .15 + p.zelo * 1.2 + p.pratico * .8 + p.grigi * .3 },
    murale: { n: ['un murale', 'un pannello dipinto', 'un quadro grande'], g: 'm', dove: { muro: 3, corsia: .6, mezzo: .3 }, max: 1, vuole: p => .1 + p.artista * 2 + p.giovane * .6 + p.haNome * .4 },
    divano: { n: ['il divano', 'un divano vecchio', 'il sofà della zia'], g: 'm', dove: { muro: 1.5, corsia: 1.2, mezzo: 1.2 }, max: 1, siede: 3, vuole: p => .1 + p.pigro * 1.8 + p.posti * .8 + p.follia * .6 + p.pref('divano') },
    orto: { n: ['un orto', 'le piante', 'un giardinetto di vasi'], g: 'm', dove: { muro: 3, corsia: .6, mezzo: .3 }, max: 2, vuole: p => .15 + p.anziano * 1.2 + p.calmo * .6 + p.pref('vaso') * 1.2 },
  };
  // la roba di casa: non si propone (nessuno la vota), la si porta e basta
  EL.roba = { n: ['la roba di casa', 'due cose da casa', 'la roba di casa'], g: 'f', dove: { muro: 1 }, max: 99, vuole: () => 0, roba: 1 };
  const PRIMI = [['sedie', 3], ['panca', 2], ['cucina', 1.5], ['bandiera', 1], ['striscione', 2], ['tavolata', 1.5], ['barriera', .6], ['divano', .4]];
  const nomeEl = (k, i) => EL[k].n[(i || 0) % EL[k].n.length];

  // il primo gesto dei fondatori: GEN.presidio non è più un modello (una cosa sola, su un lato); il presidio misura comunque la via
  const W0 = o => Math.max((o && o.w) || 7, 5.6);
  UP.GEN.presidio = (r, o) => {
    const W = W0(o), band = cl((W - 3.4) / 2, 1.1, 1.8), xi = W / 2 - band, k = pesata(r, PRIMI), s = r() < .5 ? 1 : -1;
    let L = GEN[k](r, { W, seme: 'primo' + Math.floor(r() * 1e6) }) || GEN.sedie(r);
    if (!EL[k].traverso) { const F = UP.impronta(L), X = (W / 2 - .12) - F[2] - .05, Y = tra(r, -1, 1); L = trasla(L, s, X, Y); } else L = trasla(L, 1, 0, tra(r, -1.2, 1.2));
    const Fz = UP.impronta(L); return { parti: L, meta: { base: L.length, w: W, varco: [r3(-xi), r3(xi)], L: r2(tra(r, CFG.lato - 1, CFG.lato + 1.5)), el: [[k, 0, L.length, EL[k].traverso ? 1 : s, r2((Fz[0] + Fz[2]) / 2), r2((Fz[1] + Fz[3]) / 2), null, 0, 1]], primo: k } };
  };
  UP.EFFETTI.presidio = () => '';   // niente misura da rispettare: la forma è quella che si fanno
  // (sull'altro lato si specchia DOPO lo spostamento: prima si specchiava e poi si spostava, e tutto finiva contro il muro di destra:
  // il lato di sinistra restava vuoto e, pieno il destro, le cose andavano in mezzo)
  function trasla(L, s, X, Y) { return L.map(p => { const q = p.slice(); q[1] = q[1] + X; if (s < 0) { q[1] = -q[1]; q[4] = -q[4]; q[5] = -q[5]; } q[1] = r3(q[1]); q[2] = r3(q[2] + Y); q[4] = r3(q[4]); return q; }); }
  UCr.trasla = trasla;

  // ======================= LO STATO =======================
  // C.cr = { v, el: [[k, i0, n, s, x, y, chi, t, fatta(0|1)]], prop, pross, n, usate: [id frase], gl (il gradino dei Grigi visto), auto, chiusa }
  function CR(C) {
    if (C.cr) return C.cr;
    const el = (C.meta && C.meta.el) ? C.meta.el.map(e => e.slice()) : [['sedie', 0, C.piano.length, 1, 0, 0, null, 0, 1]];
    return (C.cr = { v: 1, el, prop: null, pross: null, n: 0, usate: [], gl: 0, auto: 0, chiusa: false, no: 0 });
  }
  UCr.CR = CR;
  const elFatto = (C, e) => { const ms = messi(C); for (let i = e[1]; i < e[1] + e[2]; i++) if (!ms.has(i)) return false; return true; };
  const conta = (C, k) => CR(C).el.filter(e => e[0] === k).length;

  // ======================= LA GEOMETRIA: il passaggio libero (le auto lo leggono, i Grigi lo vedono) =======================
  // i tratti di traverso (x) coperti dai pezzi messi bassi (sotto 2 m, niente decori), uniti; i varchi fra loro dentro la via; il più largo
  const GK = {};
  function varchi(C) {
    const key = C.id + '|' + C.pezzi.length + '|' + C.piano.length + '|' + (C.stato && C.stato.macerie ? 'm' : '');
    const g = GK[C.id]; if (g && g.key === key) return g;
    const W = (C.meta && C.meta.w) || C.w || 7, h = W / 2, L = [];
    let ya = Infinity, yb = -Infinity;
    for (const [i] of C.pezzi) { const p = C.piano[i]; if (!p || PARTI[p[0]].decoro) continue; const O = UP.obb(p); if (UP.zMin(O) >= 2) continue;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity; for (const q of UP.angoli(O)) { a0 = Math.min(a0, q[0]); a1 = Math.max(a1, q[0]); b0 = Math.min(b0, q[1]); b1 = Math.max(b1, q[1]); }
      L.push([a0, a1, b0, b1]); }
    L.sort((a, b) => a[0] - b[0]);
    const U = []; for (const x of L) { const l = U[U.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else U.push([x[0], x[1]]); }
    const liberi = []; let pos = -h; for (const u of U) { if (u[1] <= -h) continue; if (u[0] >= h) break; if (u[0] > pos) liberi.push([pos, u[0]]); pos = Math.max(pos, u[1]); } if (pos < h) liberi.push([pos, h]);
    let best = null; for (const v of liberi) if (!best || v[1] - v[0] > best[1] - best[0]) best = v;
    // dove comincia l'ostacolo lungo la via, dai due capi (le auto si fermano prima)
    for (const x of L) { ya = Math.min(ya, x[2]); yb = Math.max(yb, x[3]); }
    const o = { key, W, liberi, largo: best ? r2(best[1] - best[0]) : 0, c: best ? (best[0] + best[1]) / 2 : 0, g: best, ya: isFinite(ya) ? ya : 0, yb: isFinite(yb) ? yb : 0 };
    return (GK[C.id] = o);
  }
  UCr.varchi = varchi;
  // un mezzo largo «wid» ci passa? (con CFG.margine d'aria)
  const passaMezzo = (C, wid) => varchi(C).largo >= (wid || 1.8) + CFG.margine;
  UCr.passaMezzo = passaMezzo;
  // la strada è chiusa quando non ci passa nemmeno l'auto più stretta (le quattro ruote del gioco: l'Ape, la 126…)
  const WMIN = (() => { let m = Infinity; for (const k in G.VK || {}) { const K = G.VK[k]; if (K.boat || K.pocket || K.two || !K.wid) continue; m = Math.min(m, K.wid); } return isFinite(m) ? m : 1.3; })();
  const chiusaC = C => !passaMezzo(C, WMIN);
  UCr.chiusa = chiusaC; UCr.WMIN = WMIN;

  // ======================= IL PASSAGGIO, UNA COSA DI CUI SI PARLA =======================
  // Il passaggio per le macchine non è una regola: è una cosa a cui qualcuno tiene (chi ha la bottega e aspetta il furgone del pane, chi
  // guida, gli amici di chi guida, i prudenti, chi ha paura dei Grigi) e che altri vogliono chiudere (chi resiste, gli arditi, chi è stufo
  // delle macchine). Si misura sul PIANO (quello che c'è più quello che si è deciso di fare): una cosa nuova lo lascia com'è, lo stringe o lo
  // chiude, e chi propone, chi vota e chi dice «no, più in là» lo sa.
  const AUTO = 1.8 + CFG.margine + .15, COMODO = AUTO + 1;   // la macchina di tutti i giorni (e il furgone del pane), con un palmo d'aria; sotto COMODO si passa stretti
  UCr.AUTO = AUTO;
  const Wdi = C => (C.meta && C.meta.w) || C.w || 7;
  // i tratti di traverso coperti dalle parti basse (sotto 2 m, niente decori): gli stessi di varchi(), sul piano
  function copre(L, out) { for (const p of L) { if (!p || PARTI[p[0]].decoro) continue; const O = UP.obb(p); if (UP.zMin(O) >= 2) continue; let a0 = Infinity, a1 = -Infinity; for (const q of UP.angoli(O)) { a0 = Math.min(a0, q[0]); a1 = Math.max(a1, q[0]); } out.push([a0, a1]); } return out; }
  function largoDi(W, I) { const h = W / 2, L = I.slice().sort((a, b) => a[0] - b[0]); let pos = -h, best = 0; for (const u of L) { if (u[1] <= -h) continue; if (u[0] >= h) break; if (u[0] > pos) best = Math.max(best, u[0] - pos); pos = Math.max(pos, u[1]); } if (pos < h) best = Math.max(best, h - pos); return r2(best); }
  const pianoI = C => copre(C.piano, []);
  const largoPiano = (C, L) => largoDi(Wdi(C), copre(L || [], pianoI(C)));
  UCr.largoPiano = largoPiano;
  // che cosa fa al passaggio la cosa L (nel sistema del presidio): a prima, b dopo, k: 'chiude' (le macchine non passano più), 'stringe', ''
  function effetto(C, L) { const a = largoPiano(C), b = largoPiano(C, L); return { a, b, k: a >= AUTO && b < AUTO ? 'chiude' : b < a - .4 && b < COMODO ? 'stringe' : '' }; }
  UCr.effetto = effetto;
  const BOTTEGA = /negoz|bottega|commess|fornai|panett|forno|barist|\bbar\b|alimentar|macell|fruttiv|tabacc|edicol|farmac|pescivend|merci|vendit|salum|droghi|ortolan|fiori|parrucch|barbier|calzol|sart|orefic|gelat|pasticc|ristor|pizz|oste/;
  const AUTISTA = /autist|tassist|taxi|camion|corrier|consegn|fattorin|rappresent|trasport|furgon|meccan|benzin|gommist/;
  // quanto uno tiene a che le macchine passino (−1 la vuole chiusa … 1 la vuole aperta): dal profilo (vedi profilo())
  function varcoDi(st, id, n, t, p, job) {
    let amici = 0; const M = st.u.menti && st.u.menti[id], R = M && M.rel; if (R) { let k = 0; for (const j in R) { if (++k > 40) break; const x = R[j]; if (x && (x[1] || 0) > .3) { const m = npc(st, j); if (m && m.pop && m.pop.car) amici++; } } }
    const vi = t.vilta === undefined ? .5 : t.vilta;
    return cl(.1 + (BOTTEGA.test(job) ? .85 : 0) + (AUTISTA.test(job) ? .55 : 0) + (n && n.pop && n.pop.car ? .4 : 0) + Math.min(3, amici) * .15 + (vi - .5) * .9 + Math.min(1, p.grigi) * vi * .6 + p.anziano * .12
      - p.resiste * .55 - p.ardito * .75 - Math.min(1, p.auto) * .45 - (t.contrario || 0) * .35 + (hashS(id + '|varco') - .5) * .7, -1, 1);
  }

  // ======================= IL PROFILO di chi propone (e di chi vota) =======================
  const T = (st, id) => { const I = ID(); return (I && I.tratti && I.tratti(st, id)) || { follia: .1, zelo: .3, vilta: .5, carisma: .3, credulo: .4, testardo: .3, contrario: .1 }; };
  function com(st, C) { const U = UCu(); if (!U || !st.u || !st.u.cultura || !U.comPerCantiere) return null; try { return U.comPerCantiere(st, C); } catch (e) { return null; } }
  function profilo(st, C, id) {
    const n = npc(st, id), t = T(st, id), age = (n && n.pop && n.pop.age) || 35, job = String((n && n.pop && n.pop.job && (n.pop.job.base || n.pop.job.title)) || '').toLowerCase();
    const c = com(st, C), ep = c ? c.ep.map(e => e[4]) : [], P0 = C.pv || {}, N = Object.keys(C.vive || {}).length, h = ora(st), cr = CR(C);
    let sedute = 0; for (const [i] of C.pezzi) { const k = C.piano[i] && C.piano[i][0]; if (k === 'sedia') sedute++; else if (k === 'divano') sedute += 3; } for (const e of cr.el) if (EL[e[0]] && (e[0] === 'panca')) sedute += 3;
    const tempra = typeof UnicoCorpi !== 'undefined' && UnicoCorpi.ON && UnicoCorpi.tempra && n ? (() => { try { return UnicoCorpi.tempra(st, n); } catch (e) { return ''; } })() : '';
    const coperto = (C.misure && C.misure.copre) || 0, grigiRec = P0.gt > -1e8 ? Math.exp(-(st.t - P0.gt) / 600) : 0;
    const p = { follia: t.follia || 0, vile: t.vilta || 0, carisma: t.carisma || 0, contrario: t.contrario || 0, zelo: t.zelo || 0, testardo: t.testardo || 0,
      ardito: cl((t.follia || 0) * .8 + (1 - (t.vilta || .5)) * .6 + (t.contrario || 0) * .4 - .35, 0, 1),
      giovane: age < 28 ? 1 : age < 36 ? .4 : 0, anziano: age >= 62 ? 1 : age >= 52 ? .4 : 0, eta: age >= 45 ? .5 : 0,
      cuoco: /cuoc|oste|ristor|pizz|forn|panett|macell|pescivend|cameri/.test(job) ? 1 : 0, artista: /pitt|artist|writer|decor|grafic|imbianch|music/.test(job) ? 1 : (t.follia || 0) > .55 ? .4 : 0,
      pratico: /murator|carpent|fabbr|meccan|elettric|idraul|manoval|operai|falegn/.test(job) ? 1 : .2,
      pigro: tempra === 'pigro' ? 1 : tempra === 'stanco' ? .5 : 0, calmo: tempra === 'calmo' || tempra === 'anziano' ? .6 : 0, teatrale: tempra === 'energico' ? .8 : (t.carisma || 0) > .6 ? .5 : 0,
      festa: (ep.includes('festa') ? .8 : 0) + (N >= 8 ? .5 : 0) + (h >= 17 ? .3 : 0), resiste: (ep.includes('resiste') ? 1 : 0) + (ep.includes('sgombero') ? .6 : 0) + (ep.includes('martire') ? .5 : 0),
      grigi: cl((P0.gliv || 0) * .35 + grigiRec + (ep.includes('multa') ? .4 : 0) + (ep.includes('grigi') ? .3 : 0), 0, 2), auto: cl((cr.auto || 0) / 25, 0, 1.5) * (.5 + (t.contrario || 0) + (tempra === 'nervoso' ? .6 : 0)),
      posti: cl((N - sedute) / 6, 0, 1.2), sole: h >= 11 && h < 17 && coperto < 2 ? 1 : 0, nessunTetto: coperto < 1 ? .4 : 0, notte: h >= 20 || h < 7 ? .8 : (C.pv && C.pv.max >= 8 ? .4 : 0), sera: h >= 18 ? 1 : h >= 16 ? .4 : 0,
      fame: h >= 11.5 && h < 14 || h >= 19 && h < 21.5 ? .8 : 0, haNome: C.nome && !/VIA NOSTRA/.test(C.nome) ? .8 : 0,
      pref: k => (c && c.pa === k ? 1.2 : 0) };
    p.varco = varcoDi(st, id, n, t, p, job);
    return p;
  }
  UCr.profilo = profilo;
  // quanto una cosa piace a uno (0..), con lo sconto per le cose già fatte (la seconda tettoia stanca)
  function gusto(st, C, id, k, P) {
    const E = EL[k], p = P || profilo(st, C, id), n = conta(C, k); if (n >= E.max) return 0;
    if (k === 'striscione' && C.piano.some(q => q[0] === 'scritta')) return 0;
    if (E.chiude && chiusaC(C)) return 0;   // già chiusa: una barricata in più no
    const bo = (CR(C).boc && CR(C).boc[id + '|' + k]) || 0;   // bocciata già: la si ripropone meno (ma la si ripropone)
    return Math.max(0, E.vuole(p)) * Math.pow(.35, n) * Math.pow(.45, bo) * (.75 + hashS(id + k) * .5);
  }

  // ======================= IL POSTO: dove la mettono (cercato davvero, niente posti fissi) =======================
  const pianteDi = L => L.filter(p => !PARTI[p[0]].decoro).map(p => { const P = UP.pianta(p); return { cx: P.cx, cz: P.cy, a: Math.atan2(P.uy, P.ux), hu: P.hu, hv: P.hv }; });
  // la cosa L (già nel sistema del presidio) sta lì? i pezzi fra loro, l'aria fra le cose, il mondo (case, suolo, mezzi, porte, roba)
  function staLi(st, C, L, aria) {
    if (C.piano.length + L.length > CFG.maxParti) return 'troppi';
    const O = L.map(UP.obb), A = C.piano.map(UP.obb);
    for (const o of O) { if (UP.zMin(o) < -.006) return 'sotto'; for (const a of A) { if (Math.abs(a.c[0] - o.c[0]) > 4.5 || Math.abs(a.c[1] - o.c[1]) > 4.5) continue; if (UP.pen3(o, a) > .012) return 'tocca'; } }
    if (aria) { const Pn = pianteDi(L), Pa = pianteDi(C.piano); for (const x of Pn) for (const y of Pa) if (UP.sat2(Object.assign({}, x, { hu: x.hu + aria, hv: x.hv + aria }), y)) return 'stretto'; }
    const F = UP.impronta(L, p => !PARTI[p[0]].decoro), altri = st.u.costruire.cantieri.filter(D => D !== C && !D.chiuso && D.F).map(D => UC.rettDi(D, 1));
    // il mondo: i pezzi a uno a uno (la via è dritta, la barricata è larga: il rettangolo di tutto prenderebbe le case)
    for (const p of L) { if (PARTI[p[0]].decoro) continue; const Fp = UP.impronta([p]); const m = UP.controlla(st, { x: C.x, y: C.y, a: C.a }, Fp, { suolo: 'via', altri }); if (m && m !== 'giocatore' && m !== 'cantiere') return m.split(':')[0]; }
    if (!isFinite(F[0])) return 'vuota';
    return '';
  }
  UCr.staLi = staLi;
  // i posti possibili per la cosa k con la ricetta L0 (nel suo sistema), ordinati: chi propone (ardito o no), le cose vicine, gli incroci
  // tieni: chi dice «no, così chiudiamo la strada» cerca un posto che il passaggio lo lasci com'è (né chiuso né stretto)
  function cerca(st, C, k, L0, chi, r, salta, tieni) {
    const E = EL[k], W = (C.meta && C.meta.w) || 7, Ly = (C.meta && C.meta.L) || CFG.lato, F0 = UP.impronta(L0), xe = W / 2 - .12, xi = C.varco ? Math.abs(C.varco[1]) : W / 2 - 1.5, p = chi ? profilo(st, C, chi) : null;
    // il passaggio: quello del piano adesso, e quello che resterebbe (dalla striscia di traverso che la cosa copre, ovunque la si metta lungo la via)
    const I0 = pianoI(C), a0 = largoDi(W, I0), Fb = UP.impronta(L0, q => !PARTI[q[0]].decoro && UP.zMin(UP.obb(q)) < 2), vq = p ? p.varco : 0;
    if (tieni && E.chiude) return null;
    const cr = CR(C), centri = cr.el.filter(e => e[2] > 0).map(e => [e[4], e[5]]), n = chi && npc(st, chi), lc = n ? UC.locale(C, n.x, n.y) : { x: 0, y: 0 };
    const C0 = [];
    const dw = E.dove || { muro: 1 }, ard = p ? p.ardito : .3, ard2 = Math.max(ard, -vq);   // chi la strada la vuole chiusa osa il mezzo
    const prof = E.traverso ? [['t', 1]] : [['muro', dw.muro || 0], ['corsia', (dw.corsia || 0) * (.6 + ard)], ['mezzo', tieni ? 0 : (dw.mezzo || 0) * (.03 + ard2 * ard2 * 1.3)]];
    for (const [d, wd] of prof) { if (wd <= 0) continue;
      for (const s of E.traverso ? [1] : [1, -1]) for (let y = -Ly; y <= Ly + 1e-6; y += .45) {
        let X = 0; if (d === 'muro') X = xe - F0[2] - .04; else if (d === 'corsia') X = xi - F0[0] + .05; else if (d === 'mezzo') X = -(F0[0] + F0[2]) / 2 + (r() - .5) * 1.2;
        if (d === 'corsia' && X + F0[2] > xe) continue;
        const cx = (s < 0 ? -1 : 1) * (X + (F0[0] + F0[2]) / 2), cy = y + (F0[1] + F0[3]) / 2;
        let sc = Math.log(1 + wd) * 1.4 + r() * .9;
        if (centri.length) { let dm = Infinity; for (const q of centri) dm = Math.min(dm, hyp(q[0] - cx, q[1] - cy)); sc += dm < 1.2 ? -.6 : dm < 4.5 ? .9 : dm < 7 ? .2 : -.6; }
        sc -= Math.abs(cy - lc.y) * .05 + Math.abs(cy) * .03;
        if (salta && hyp(salta[0] - cx, salta[1] - cy) < 1.6) continue;
        // il passaggio: chi ci tiene non lo chiude e non lo stringe senza motivo; chi lo vuole chiuso ci prova
        if (isFinite(Fb[0])) { const lo = s < 0 ? -(Fb[2] + X) : Fb[0] + X, hi = s < 0 ? -(Fb[0] + X) : Fb[2] + X, b = largoDi(W, I0.concat([[lo, hi]]));
          if (a0 >= AUTO && b < AUTO) { if (tieni) continue; sc += vq > 0 ? -3.5 * vq - .5 : -1.6 * vq; }
          else if (b < a0 - .4 && b < COMODO) { if (tieni) continue; sc -= Math.max(0, vq) * 1.4; } }
        C0.push([sc, s, X, y, d, cx, cy]);
      } }
    C0.sort((a, b) => b[0] - a[0]);
    let prove = 0;
    for (const q of C0) {
      if (++prove > CFG.cerca) break;
      const L = trasla(L0, q[1], q[2], q[3]);
      // gli incroci: una preferenza (si prova prima dove è lontano; vicino solo se altrove non c'è posto)
      const w = UP.aMondo(C, q[5], q[6]); if (UP.lontanoIncrocio && UP.lontanoIncrocio(w.x, w.y) < UP.CFG_INCROCIO && prove < CFG.cerca * .6 && C0.length > 8) continue;
      const m = staLi(st, C, L, E.traverso ? 0 : CFG.aria); if (m) { MOT[m] = (MOT[m] || 0) + 1; continue; }
      return { L, s: q[1], x: r2(q[5]), y: r2(q[6]), d: q[4] };
    }
    return null;
  }
  const MOT = UCr.motivi = {};
  UCr.cerca = cerca;

  // ======================= LE PAROLE (dati: nessun modello di linguaggio) =======================
  const capo = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const PRO = {   // chi propone: per cosa
    sedie: ['Portiamo giù due sedie, che in piedi non si ragiona.', 'Qui ci vogliono sedie. Le mie le porto io.', 'Mettiamo due sedie {dove}, per cominciare.'],
    panca: ['Facciamo una panca coi bancali, {dove}.', 'Una panca, ragazzi: le ginocchia non sono più quelle.', 'Con due casse e un\'asse vien fuori una panca. {Dove}.'],
    tavolata: ['Ci vuole una tavola. Si mangia tutti insieme, {dove}.', 'Un tavolo {dove}: chi ha fame si siede.', 'Portiamo il tavolo di mia cognata. {Dove}, bello largo.'],
    cucina: ['Qui ci vuole un fuoco per cucinare. Il fusto lo metto {dove}.', 'Faccio io la cucina: un fusto, una cassa, e mangiamo.', 'Senza pentola non è un presidio. Cucina {dove}!'],
    tettoia: ['Si squaglia, qui. Tiriamo un telo {dove}.', 'Un tendone {dove}, quattro pali e un telo: ombra per tutti.', 'Al sole non ci resto. Una tettoia, {dove}.'],
    baracca: ['Se si resta la notte, ci vuole una baracca. {Dove}.', 'Lamiere, quattro travi e una porta: un casotto {dove}.', 'Facciamoci una baracca {dove}. Dentro ci teniamo la roba.'],
    barriera: ['Mettiamo una fila di copertoni {dove}, che le macchine qui volano.', 'Una barriera {dove}. Non si sa mai.', 'Io dico: copertoni {dove}. Così uno ci pensa prima di sfrecciare.'],
    strettoia: ['Stringiamo la strada: mezza barricata {dove}. Passano, ma piano.', 'Un muretto a metà strada: le macchine passano una alla volta.', 'Facciamo una strettoia. Chi passa, passa a passo d\'uomo.'],
    sbarramento: ['Basta macchine. Chiudiamo la strada, da un muro all\'altro.', 'Si chiude. Una barricata {dove} e qui non passa più nessuno.', 'Io la strada la chiuderei. Bancali, porte, tutto quello che c\'è.'],
    palco: ['Un palco! Bancali sulle casse, {dove}, e stasera si suona.', 'Facciamo una pedana {dove}: chi ha qualcosa da dire, sale.', 'Ci vuole un palchetto. Mio cugino ha la chitarra.'],
    lucine: ['Le lucine! Un filo da un palo all\'altro e la sera è un\'altra cosa.', 'Tiriamo le lampadine sopra la strada. Ce le ho in cantina.', 'Stasera, al buio, sembriamo dei cospiratori. Le luci, dai.'],
    striscione: ['Ci vuole lo striscione col nome. Che si legga da lontano.', 'Lo striscione! Due pali, e «{nome}» bello grande.', 'Se nessuno sa chi siamo, che presidio è? Lo striscione, {dove}.'],
    bandiera: ['Una bandiera {dove}, col simbolo. Che sventoli.', 'Su un palo ci mettiamo la bandiera, con {sim} disegnato sopra.', 'Una bandiera {dove}: chi arriva sa dov\'è.'],
    insegna: ['Un cartello col simbolo {dove}. {Sim} grande così.', 'Facciamo l\'insegna, come una bottega vera.', 'Un cartello {dove}, che dica chi siamo.'],
    bacheca: ['Ci vuole una bacheca {dove}: turni, avvisi, chi porta cosa.', 'Una bacheca, se no i turni li ricordo solo io.', 'Mettiamo una bacheca {dove}. Ordine, ragazzi.'],
    murale: ['Un pannello grande {dove}, e lo dipingo io.', 'Facciamo un murale: {sim} e i nostri colori.', 'Datemi un pannello e tre colori. {Dove}.'],
    divano: ['Mia zia butta il divano. Lo portiamo {dove}?', 'Ho un divano in cantina. Lo mettiamo {dove} e siamo a posto.', 'Un divano in mezzo alla via. Pensaci.'],
    orto: ['Due cassette di terra e i vasi {dove}: basilico, pomodori.', 'Facciamo un orto {dove}. Le piante tengono calmi.', 'Un po\' di verde {dove}, che qui è tutto asfalto.'],
  };
  const PRO2 = ['E se ci facessimo {cosa}? {Dove}.', 'Io ci vedo {cosa}, {dove}. Ditemi di no.', 'Ascoltate: {cosa}, {dove}. Ci vuole poco.', 'Manca {cosa}. {Dove} starebbe da dio.'];
  const SI = ['Ci sto.', 'Per me va bene.', 'Bella idea, dai.', 'Era ora che qualcuno lo dicesse.', 'Sì, sì. Io porto la roba.', 'D\'accordo. Basta che non tocca a me portarla.', 'Fatto. Anzi, facciamo.', 'Io voto sì, e anche mio fratello.', 'Ma certo! Che aspettiamo?', 'Sì. {Motto}!', 'Va bene, ma la facciamo bene.', 'Mi piace. È roba da {nome}.', 'Sì, e chi non è d\'accordo porta i bancali.', 'Io ci metto le mani.'];
  const NO = {
    grigi: ['Così {G} ci vengono a prendere col furgone.', 'E quando passano {G}? Io non ci voglio spiegare niente.', 'Troppo. Poi {G} ci multano pure l\'aria.', 'Piano. Già {G} ci guardano storto.', 'Questa {G} la fotografano e ce la mettono sul giornale.', 'Io ho già due verbali in cucina. Basta.', 'Poi chi la sente mia madre, quando arrivano {G}?', 'Più roba mettiamo, più roba ci portano via.'],
    fatica: ['E chi la porta? Io ho la schiena a pezzi.', 'Bello, ma la fatica la fate voi.', 'Io sono stanco solo a sentirlo.', 'Domani. Oggi no.', 'Con questo caldo? Neanche morto.', 'Io ho appena finito il turno, eh.', 'Fatela voi, io vi faccio il tifo.', 'Ma non si può stare seduti e basta?'],
    macchine: ['E le macchine dove passano?', 'In mezzo alla strada? Ci investono.', 'Così la gente non passa più.', 'Qui ci passa il furgone del pane, ricordatevelo.', 'Lì in mezzo? E l\'ambulanza?', 'Poi il fornaio ci maledice tutti.', 'In mezzo no, che la signora del terzo esce con la macchina.'],
    brutto: ['Viene brutta, fidati.', 'Sembra una discarica, già così.', 'Ma che è, un rigattiere?', 'Meglio di no. Non c\'entra niente.', 'Così pare il cortile di mio zio.', 'Non ci sta bene, si vede da qui.', 'Roba da sagra di paese. No.'],
    gia: ['Ne abbiamo già una. Basta.', 'Un\'altra? Facciamo il mercato, allora.', 'C\'è già. Pensiamo ad altro.', 'Doppia? E poi facciamo i saldi.', 'Una basta e avanza.', 'Ancora? Inventiamoci qualcosa di nuovo.'],
  };
  // il passaggio: chi ci tiene, chi lo vuole chiuso
  NO.varco = ['Così chiudiamo la strada, eh.', 'E il furgone del pane? Da dove passa?', 'Lì le macchine non passano più. Ci pensate?', 'Così la signora del terzo resta chiusa in garage.', 'E se arriva l\'ambulanza? La portiamo in braccio?', 'La strada chiusa no. Poi {G} hanno la scusa.', 'Il mio furgone sta in fondo alla via. Io devo uscire.', 'Chiudere vuol dire guerra. Io non ci sto.'];
  NO.stretto = ['Così ci passa una macchina sì e una no.', 'Stringe troppo. Poi graffiano tutto.', 'Lasciamo un po\' di posto, che passa il camion della frutta.', 'Così le macchine ci strisciano addosso.'];
  const VARCO_ALT = ['Va bene, ma {dove2}: così le macchine passano ancora.', 'Mettiamola {dove2}, e la strada resta aperta.', 'Sì, ma {dove2}. Il furgone del pane deve passare.', '{Dove2}, che in mezzo ci passa il furgone.', 'Io dico {dove2}: così non chiudiamo niente.'];
  const STRETTO_ALT = ['Un po\' più in là, {dove2}: che resti largo.', '{Dove2}, che le macchine non ci strusciano.', 'Mettiamola {dove2}: un po\' di posto per chi passa.'];
  const CHIUDI = ['E chiudiamola, \'sta strada!', 'Meglio: qui non ci passa più nessuno.', 'Era ora. Basta macchine.', 'Chiusa. Così si respira.', 'E se chiudiamo, chiudiamo per bene.', 'Le macchine giro largo. Qui ci stiamo noi.'];
  const PRO_CHIUDE = ['{Cosa} {dove}. E se le macchine non passano più, meglio.', 'Io la metterei {dove}. Tanto la strada è nostra.', '{Dove}, {cosa}. Di macchine ne abbiamo viste abbastanza.'];
  const INVECE_VARCO = ['Va bene, {dove2}: che le macchine passino.', 'E sia: {dove2}. La strada resta aperta.', 'D\'accordo, come dice {chi}: {dove2}, e si passa ancora.'];
  const DECISO_CHIUDE = ['Allora è deciso: la strada la chiudiamo.', 'Si fa. E da oggi qui le macchine non passano.', 'Deciso. {Mat}, e la strada è nostra.', 'Va bene: chiudiamo. Chi viene a prendere {mat}?'];
  const BOCCIATO_VARCO = ['Va bene, la strada resta aperta. Per ora.', 'Come volete: che passino, le macchine.', 'Niente. Teniamoci il traffico, allora.', 'Va bene. Ma prima o poi la chiudiamo.'];
  const CONTRO = ['Sì, ma {dove2}, non lì.', 'No, no: {dove2}. Lì dà fastidio.', 'Più in là. {Dove2}, che c\'è più posto.', 'D\'accordo, ma la mettiamo {dove2}.', 'Lì no. {Dove2}, fidatevi di me.', 'Io la vedo {dove2}. Lì sta meglio.'];
  const RIDE = ['Così ci mettiamo pure il citofono.', 'Poi ci chiedono l\'affitto.', 'Fra un mese facciamo il condominio.', 'E il posto per la mia moto?', 'Mancano solo le tende e la suocera.', 'Mi raccomando, la ricevuta.', 'Così sembriamo una famiglia normale.', 'Questo lo raccontiamo ai nipoti.'];
  const DECISO = ['Allora si fa. {Mat}, chi viene con me?', 'Deciso. Vado a prendere {mat}.', 'Va bene: {mat} e si comincia.', 'Si fa. Al deposito ci sono {mat}.', 'Allora muoviamoci, prima che cambiate idea.', 'Tutti d\'accordo, quasi. Si fa.', 'Va bene, si fa {dove}. Ci servono {mat}.'];
  const BOCCIATO = ['Va bene, va bene. Ne riparliamo.', 'Siete dei mollaccioni. Lasciamo stare.', 'Come volete. Ma avevo ragione io.', 'Niente, allora. Ci penso stanotte.', 'Va bene. Pensavo fosse un\'idea.'];
  const INVECE = ['Allora facciamo come dice {chi}: {dove2}.', 'Va bene, {dove2}. Come dice {chi}.', 'E sia: {dove2}.'];
  const FATTA = ['Ecco qua. Guardatela.', 'Fatta! Non è bellissima?', 'E questa è nostra.', 'Fatta. {Motto}!', 'Che dite, regge?', 'Venite a vedere!'];
  const MAT = { asse: 'le assi', bancale: 'i bancali', lamiera: 'le lamiere', trave: 'le travi', tubo: 'i tubi', cassa: 'le cassette', pneumatico: 'i copertoni', porta: 'una porta vecchia', telo: 'un telo', fusto: 'un fusto', sedia: 'le sedie', tavolo: 'un tavolo', vaso: 'i vasi', lucine: 'un filo di lampadine', bandiera: 'un pezzo di stoffa', bacheca: 'una tavola di sughero', murale: 'un pannello e i colori', divano: 'il divano', cartello: 'un cartello', scritta: 'un lenzuolo', corda: 'la corda' };
  const ACCANTO = { sedie: 'vicino alle sedie', panca: 'accanto alla panca', tavolata: 'vicino alla tavola', cucina: 'accanto alla cucina', tettoia: 'sotto la tettoia, quasi', baracca: 'di fianco alla baracca',
    barriera: 'dietro i copertoni', palco: 'accanto al palco', bacheca: 'vicino alla bacheca', murale: 'davanti al murale', divano: 'accanto al divano', insegna: 'sotto il cartello', bandiera: 'ai piedi della bandiera', orto: 'vicino alle piante', striscione: 'sotto lo striscione', lucine: 'sotto le lucine', strettoia: 'dietro il muretto', sbarramento: 'dietro la barricata' };
  // il posto in parole, dal posto vero
  function doveW(C, x, y, d, E) {
    if (E && E.traverso) return Math.abs(y) < 1.5 ? 'qui in mezzo' : y < 0 ? 'di qua, all\'inizio' : 'di là, in fondo';
    const vic = CR(C).el.filter(e => e[2] > 0 && hyp(e[4] - x, e[5] - y) < 3.2).sort((a, b) => hyp(a[4] - x, a[5] - y) - hyp(b[4] - x, b[5] - y))[0];
    if (d === 'mezzo') return scegliR(rngDi(C.id + x + y), ['in mezzo alla strada', 'proprio in mezzo', 'al centro della via']);
    const lato = x > 0 ? 'di qua' : 'di là';
    if (vic) return `${lato}, ${ACCANTO[vic[0]] || 'accanto alle altre cose'}`;
    return d === 'muro' ? `${lato}, contro il muro` : `${lato}, sul bordo della strada`;
  }
  function doveDue(C, a, b) {
    if (Math.sign(a.x) !== Math.sign(b.x) && Math.abs(b.x) > .5) return 'dall\'altra parte';
    if (Math.abs(b.x) < Math.abs(a.x) - .8) return 'più verso il centro';
    if (Math.abs(b.x) > Math.abs(a.x) + .8) return 'più verso il muro';
    return b.y > a.y ? 'più avanti, di qualche passo' : 'un po\' più indietro';
  }
  // la scelta della frase: dal generatore, saltando le ultime usate nel presidio
  function frase(C, L, r, tag) {
    const cr = CR(C), tutte = L.map((s, i) => [s, tag + i]), ok = tutte.filter(x => !cr.usate.includes(x[1]));
    // tutte usate di recente: quella usata più indietro
    const q = ok.length ? ok[Math.floor(r() * ok.length) % ok.length] : tutte.slice().sort((a, b) => cr.usate.lastIndexOf(a[1]) - cr.usate.lastIndexOf(b[1]))[0];
    cr.usate = cr.usate.filter(x => x !== q[1]); cr.usate.push(q[1]); if (cr.usate.length > 60) cr.usate.splice(0, cr.usate.length - 60); return q[0];
  }
  function riempi(st, C, s, V0) {
    const c = com(st, C), par = c && st.u.cultura ? Object.values(st.u.cultura.par).filter(P => P.com === c.k) : [], gr = par.find(P => P.k === 'grigi');
    const sim = c && c.sim && c.sim.o ? c.sim.o : (c && c.ogg) || 'il simbolo', nome = c && c.nome ? c.nome : (C.nome ? capo(String(C.nome).toLowerCase()) : 'noi'), motto = c && c.motto ? c.motto.replace(/[.!]+$/, '') : 'Qui ci siamo';
    const V1 = Object.assign({ G: gr ? gr.w : 'i Grigi', sim: /^(il|lo|la|l'|i|gli|le|un|una) /i.test(sim) ? sim : 'il ' + sim, nome, motto }, V0 || {});
    let t = s.replace(/\{(\w+)\}/g, (m, k) => { const lo = k[0].toLowerCase() + k.slice(1), v = V1[lo] !== undefined ? V1[lo] : V1[k]; if (v === undefined || v === null) return ''; return k[0] === k[0].toUpperCase() && k[0] !== 'G' ? capo(String(v)) : String(v); });
    t = t.replace(/\s+([.,!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
    return t.length > 72 ? t.slice(0, 70).replace(/\s\S*$/, '') + '…' : t;
  }
  UCr.riempi = riempi;

  // ======================= LA PROPOSTA, LA DISCUSSIONE, IL VOTO =======================
  function presenti(st, C) { return Object.keys(C.vive || {}).filter(id => { const n = npc(st, id); return n && !n.dead && !(n.jailedUntil > st.t); }); }
  const nomeN = (st, id) => { const n = npc(st, id); return (n && (n.first || (n.name && n.name.split(' ')[0]))) || 'quello'; };
  function proponi(st, C, o) {
    o = o || {}; const cr = CR(C), chi0 = presenti(st, C); if (chi0.length < (o.forza ? 1 : CFG.minPresenti) && !o.chi) return null;
    const r = rngDi(st.u.seme + '|' + C.id + '|prop|' + cr.n + '|' + Math.floor(st.t)); cr.n++;
    // chi propone: chi ha più carisma, più voglia di fare (non i pigri), con un po' di caso
    const chi = o.chi || pesata(r, chi0.map(id => { const t = T(st, id); return [id, .3 + (t.carisma || 0) * 1.4 + (t.zelo || 0) * .5 + (t.follia || 0) * .3]; }));
    const P = profilo(st, C, chi);
    const L = Object.keys(EL).map(k => [k, o.k ? (k === o.k ? 1 : 0) : gusto(st, C, chi, k, P)]).filter(x => x[1] > 0);
    for (let g = 0; g < 4 && L.length; g++) {
      const k = pesata(r, L); if (!k) break; const i = L.findIndex(x => x[0] === k); L.splice(i, 1);
      const L0 = GEN[k](r, { W: (C.meta && C.meta.w) || 7, seme: C.id + '|' + cr.n + '|' + g, r }); if (!L0 || !L0.length) continue;
      if (UP.valida(L0).sovr.length) { MOT.ricetta = (MOT.ricetta || 0) + 1; continue; }   // la ricetta stessa non deve compenetrarsi
      const pos = cerca(st, C, k, L0, chi, r); if (!pos) { stats.senzaPosto++; continue; }
      return discuti(st, C, k, chi, pos, L0, r, o);
    }
    return null;
  }
  const DIARIO = UCr.diario = [], DECISIONI = UCr.decisioni = [];
  UCr.proponi = proponi;
  function discuti(st, C, k, chi, pos, L0, r, o) {
    const cr = CR(C), E = EL[k], altri = presenti(st, C).filter(id => id !== chi).sort((a, b) => hashS(a + cr.n) - hashS(b + cr.n)).slice(0, CFG.voti);
    const nome = nomeEl(k, Math.floor(r() * 3)), dove = doveW(C, pos.x, pos.y, pos.d, E);
    const righe = [], voti = {}, ruoli = {}; voti[chi] = 1; ruoli[chi] = 'propone'; let t = 0;
    const say = (id, s, V0) => { righe.push([r1(t), id, riempi(st, C, s, Object.assign({ dove, cosa: nome }, V0))]); t += 2.4 + r() * 1.4; };
    // il passaggio: che cosa ne fa questa cosa lì, e quanto ci tiene ognuno
    const ef = effetto(C, pos.L), vv = {}; vv[chi] = profilo(st, C, chi).varco; for (const id of altri) vv[id] = profilo(st, C, id).varco;
    say(chi, ef.k === 'chiude' && vv[chi] < -.1 && !E.chiude && r() < .6 ? frase(C, PRO_CHIUDE, r, 'pc') : r() < .3 ? frase(C, PRO2, r, 'pr2') : frase(C, PRO[k], r, 'pro' + k));
    // gli altri: d'accordo o no, coi loro motivi; chi tiene al passaggio dice «così chiudiamo la strada» e cerca un posto che lo lasci;
    // il testardo contrario propone un altro posto (vero, cercato); chi la vuole chiusa lo dice
    let alt = null, altChi = null, altVarco = false, ride = 0, nChiudi = 0; const motivi = [], perVarco = new Set(), cap = ef.k ? 6 : 5;
    const rel = (a, b) => { const M = st.u.menti && st.u.menti[a], x = M && M.rel && M.rel[b]; return x ? x[1] || 0 : 0; };
    const gChi = gusto(st, C, chi, k) || .5;
    for (const id of altri) {
      const t2 = T(st, id), g = gusto(st, C, id, k), w = vv[id];
      let v = .45 + Math.min(1, g / Math.max(.4, gChi)) * .35 + (t2.credulo || .4) * .2 - (t2.contrario || 0) * .55 - (t2.testardo || 0) * .15 + rel(id, chi) * .5 + (r() - .5) * .6 - (pos.d === 'mezzo' && !ef.k ? .2 : 0) - conta(C, k) * .12
        - (E.chiude ? (t2.vilta || .5) * .45 : 0) - (k === 'sbarramento' || k === 'strettoia' ? .1 : 0);
      if (ef.k === 'chiude') v -= w * .9; else if (ef.k === 'stringe') v -= Math.max(0, w - .2) * .5;
      voti[id] = v >= .6 ? 1 : -1;
      const varcoNo = voti[id] < 0 && ef.k && w > (ef.k === 'chiude' ? .15 : .45);
      if (varcoNo) perVarco.add(id);
      // «così chiudiamo la strada»: e un posto dove non la chiude (cercato davvero); se non c'è, il no e basta
      if (varcoNo && !alt && righe.length < cap) {
        const p2 = !E.chiude && !E.traverso ? cerca(st, C, k, L0, id, r, [pos.x, pos.y], true) : null;
        if (p2) { alt = p2; altChi = id; altVarco = true; voti[id] = 2; ruoli[id] = 'altrove'; say(id, frase(C, ef.k === 'chiude' ? VARCO_ALT : STRETTO_ALT, r, ef.k === 'chiude' ? 'va' : 'sa'), { dove2: doveDue(C, pos, p2) }); stats.contro++; stats.varcoAlt++; continue; }
        ruoli[id] = 'contro'; say(id, frase(C, ef.k === 'chiude' ? NO.varco : NO.stretto, r, ef.k === 'chiude' ? 'novarco' : 'nostretto')); stats.varcoNo++; continue;
      }
      if (voti[id] < 0 && !alt && !E.traverso && (t2.testardo || 0) + (t2.contrario || 0) > .55 && righe.length < cap) {
        const p2 = cerca(st, C, k, L0, id, r, [pos.x, pos.y], !(ef.k === 'chiude' && w <= 0)); if (p2) { alt = p2; altChi = id; voti[id] = 2; ruoli[id] = 'altrove'; say(id, frase(C, CONTRO, r, 'co'), { dove2: doveDue(C, pos, p2) }); stats.contro++; continue; }
      }
      if (righe.length >= cap) { ruoli[id] = 'dubbio'; continue; }
      if (voti[id] > 0) {
        if (ef.k === 'chiude' && w < -.15) { ruoli[id] = 'chiude'; if (nChiudi++ < 2 && r() < .85) say(id, frase(C, CHIUDI, r, 'ch')); }   // al più due lo dicono: gli altri annuiscono
        else if ((t2.follia || 0) > .5 && !ride && r() < .5) { ride = 1; ruoli[id] = 'ride'; say(id, frase(C, RIDE, r, 'ri')); }
        else if (r() < .75) { ruoli[id] = 'si'; say(id, frase(C, SI, r, 'si')); } else ruoli[id] = 'dubbio';
      }
      else { const mot = conta(C, k) ? 'gia' : (E.chiude || k === 'barriera') && (t2.vilta || .5) > .45 ? 'grigi' : E.dove && pos.d === 'mezzo' ? 'macchine' : (t2.vilta || .5) > .65 ? 'grigi' : profilo(st, C, id).pigro > .4 ? 'fatica' : r() < .5 ? 'brutto' : 'fatica'; let m2 = mot; if (motivi.includes(m2)) m2 = ['fatica', 'brutto', 'grigi', 'macchine'].find(x => !motivi.includes(x) && (x !== 'macchine' || pos.d === 'mezzo')) || 'fatica'; motivi.push(m2);
        if (r() < .8) { ruoli[id] = 'contro'; say(id, frase(C, NO[m2], r, 'no' + m2)); } else ruoli[id] = 'dubbio'; }
    }
    let si = 0, no = 0, pa = 0; for (const id in voti) { if (voti[id] === 1) si++; else if (voti[id] === 2) pa++; else no++; }
    // l'altro posto: chi era d'accordo sceglie fra i due. Se l'altro posto è quello che lascia passare le macchine, si sceglie fra la strada
    // aperta e la strada chiusa: ognuno da che parte sta (e chi aveva detto no per il passaggio, col posto nuovo, dice sì)
    let usaAlt = false;
    if (alt && altVarco) { let pro = 0, con = 0; for (const id in voti) { if (vv[id] > 0) pro++; else con++; }
      usaAlt = pro > con || (pro === con && (T(st, altChi).carisma || 0) + r() * .4 > (T(st, chi).carisma || 0) + .2);
      if (usaAlt) { si = 0; no = 0; for (const id in voti) { if (voti[id] > 0 || perVarco.has(id)) si++; else no++; } pa = 0; } else no += pa; }
    else if (alt) { const tA = T(st, altChi), tC = T(st, chi); usaAlt = (tA.carisma || 0) + r() * .6 > (tC.carisma || 0) + .2; if (usaAlt) { si += pa; pa = 0; } else no += pa; }
    const fin = usaAlt ? alt : pos, efF = usaAlt ? effetto(C, alt.L) : ef;
    // chiudere la strada vuole una maggioranza vera (a pari, no: la strada resta com'è)
    const passa = si > no || (si === no && efF.k !== 'chiude' && (T(st, chi).carisma || 0) > .5) || o.forza;
    const mats = [...new Set(L0.map(p => p[0]))].filter(m => MAT[m]).slice(0, 2).map(m => MAT[m]).join(' e ');
    if (passa) { if (usaAlt) say(chi, frase(C, altVarco ? INVECE_VARCO : INVECE, r, altVarco ? 'iv' : 'in'), { chi: nomeN(st, altChi), dove2: doveDue(C, pos, alt) }); else if (efF.k === 'chiude') say(chi, frase(C, DECISO_CHIUDE, r, 'dc'), { mat: mats }); else say(chi, frase(C, DECISO, r, 'de'), { mat: mats }); }
    else say(chi, frase(C, ef.k === 'chiude' ? BOCCIATO_VARCO : BOCCIATO, r, ef.k === 'chiude' ? 'bv' : 'bo'));
    const dur = o.subito ? 0 : tra(r, CFG.discuti[0], CFG.discuti[1]);
    // il passaggio deciso: si chiude (lo vuole la maggioranza), resta aperto (si è detto di no, o si è scelto il posto che lo lascia), niente
    const varco = ef.k === 'chiude' ? { k: passa && efF.k === 'chiude' ? 'chiudere' : 'aperta', a: ef.a, b: efF.b } : null;
    cr.prop = { k, nome, chi, t0: r1(st.t), fine: r1(st.t + dur), pos: { x: fin.x, y: fin.y, s: fin.s, d: fin.d }, L: fin.L, voti, si, no, passa: !!passa, alt: alt ? altChi : null, altVarco, righe, ruoli, varco, perVarco: [...perVarco], detto: 0, ck: null, p0: { x: pos.x, y: pos.y }, pAlt: alt ? { x: alt.x, y: alt.y } : null };
    if (cr.prima === undefined || cr.prima === null) cr.prima = r1(st.t);
    stats.proposte++; DIARIO.push(righe.map(x => x[2])); if (DIARIO.length > 60) DIARIO.shift();
    scrivi(st, 'presidio_proposta', [chi].concat(altChi ? [altChi] : []), C, { d: `In ${C.via} ${nomeN(st, chi)} propone ${nome} ${dove}${ef.k === 'chiude' ? ' (così le macchine non passano più)' : ''}${altChi ? `; ${nomeN(st, altChi)} la vuole ${doveDue(C, pos, alt)}${altVarco ? ', che si passi ancora' : ''}` : ''}`, cosa: k });
    raduna(st, C);
    if (o.subito) chiudiProposta(st, C);
    return cr.prop;
  }
  // il voto contato: la cosa entra nel piano (i pezzi dal basso) e chi era d'accordo la va a fare
  function chiudiProposta(st, C) {
    const cr = CR(C), p = cr.prop; if (!p) return null; cr.prop = null;
    let esito = p.passa;
    if (esito) { const m = staLi(st, C, p.L, EL[p.k].traverso ? 0 : CFG.aria); if (m) esito = false; }   // nel frattempo il posto s'è preso
    // la strada non si chiude per sbaglio: se la cosa chiude e nessuno l'ha deciso (il posto è cambiato), non si fa
    if (esito && effetto(C, p.L).k === 'chiude' && !(p.varco && p.varco.k === 'chiudere')) { esito = false; stats.guardia++; }
    // il passaggio, deciso insieme: chiudere la strada è una decisione (la riga e il fatto), e così tenerla aperta
    const V2 = p.varco, chiude = !!(V2 && esito && V2.k === 'chiudere' && effetto(C, p.L).k === 'chiude');
    const dv = !V2 ? '' : chiude ? ': hanno deciso di chiudere la strada' : esito ? `, ma ${p.altVarco ? 'più in là' : 'dove si passa'}: la strada resta aperta` : ': la strada resta aperta';
    scrivi(st, 'presidio_deciso', [p.chi].concat(p.alt ? [p.alt] : []), C, { d: (esito ? `In ${C.via} si fa ${p.nome}` : `In ${C.via} ${p.nome} non si fa`) + `${dv} (${p.si} a ${p.no})`, cosa: p.k, si: p.si, no: p.no, esito: esito ? 1 : 0, varco: V2 ? (chiude ? 'chiudere' : 'aperta') : null });
    if (V2) { const riga = `g${Math.floor(st.t / 1440)} ${r1(ora(st))}h ${C.via}: ${chiude ? 'CHIUDERE' : 'APERTA'} (${p.si} a ${p.no}) ${nomeN(st, p.chi)} propone ${p.nome}${p.alt ? ', ' + nomeN(st, p.alt) + (p.altVarco ? ' la vuole dove si passa' : ' la vuole altrove') : ''}; il passaggio ${V2.a} → ${chiude ? V2.b : largoPiano(C, esito ? p.L : [])} m`;
      cr.varco = { k: chiude ? 'chiudere' : 'aperta', t: r1(st.t), si: p.si, no: p.no, chi: p.chi }; DECISIONI.push(riga); if (DECISIONI.length > 40) DECISIONI.shift(); if (chiude) stats.decisoChiudere++; else stats.decisoAperta++; }
    if (!esito) { stats.no++; cr.no++; const B = cr.boc || (cr.boc = {}); B[p.chi + '|' + p.k] = (B[p.chi + '|' + p.k] || 0) + 1; return null; }
    stats.si++; return aggiungi(st, C, p.k, p.L, p.chi, p.pos, Object.keys(p.voti).filter(id => p.voti[id] > 0), chiude);
  }
  function aggiungi(st, C, k, L, chi, pos, aiuto, decisa) {
    const cr = CR(C), i0 = C.piano.length, Lo = UP.ordina(L);
    if (!decisa && effetto(C, Lo).k === 'chiude') stats.chiuseSenza++;   // (la prova: nessuno dovrebbe chiudere senza averlo deciso)
    C.piano = C.piano.concat(Lo); C.F = UP.impronta(C.piano, p => !PARTI[p[0]].decoro).map(r2);
    cr.el.push([k, i0, Lo.length, pos.s, pos.x, pos.y, chi, r1(st.t), 0]);
    if (st.__upr) st.__upr.posti = {};
    // chi era d'accordo (e c'è) va a prendere il materiale e lo mette
    assegna(st, C, aiuto || [chi]);
    return cr.el[cr.el.length - 1];
  }
  UCr.aggiungi = aggiungi;
  // i pezzi che mancano: a chi c'è e non sta già portando qualcosa (prima chi era d'accordo), al più CFG.porta per volta
  function assegna(st, C, prima) {
    const ms = messi(C), presi = new Set(), L = Object.keys(C.vive || {}); for (const id of L) { const e = C.vive[id]; if (e[0] === 'porta' && e[4] !== null && e[4] !== undefined) presi.add(e[4]); }
    const liberi = []; for (let i = UC.nBase(C); i < C.piano.length; i++) if (!ms.has(i) && !presi.has(i) && UC.sorretto(C, i, ms)) liberi.push(i);
    if (!liberi.length) return 0;
    const chi = L.filter(id => C.vive[id][0] !== 'porta').sort((a, b) => ((prima || []).includes(b) ? 1 : 0) - ((prima || []).includes(a) ? 1 : 0));
    let n = 0; for (const id of chi) { if (!liberi.length || n >= CFG.porta || L.filter(x => C.vive[x][0] === 'porta').length >= CFG.porta + 1) break;
      const e = C.vive[id]; e[0] = 'porta'; e[4] = liberi.shift(); e[1] = r1(st.t); if (e[2] < st.t + 60) e[2] = r1(st.t + 60); n++;
      const n2 = npc(st, id), M = n2 && Mn() && Mn()._.menteDi ? Mn()._.menteDi(st, n2, true) : null; if (M) { M.prossima = Math.min(M.prossima, st.t + 1); M.piano = null; } }
    return n;
  }
  const Mn = () => (typeof MenteUnica !== 'undefined' && MenteUnica.ON ? MenteUnica : typeof Mente !== 'undefined' && Mente.ON ? Mente : null);

  // ======================= DOVE SI RADUNA CHI NE PARLA =======================
  // attorno al posto proposto, dal lato della strada, a semicerchio: chi propone davanti, gli altri attorno (posti liberi veri)
  function raduna(st, C) {
    // Una F-formazione aperta verso il posto: chi ne parla sta su un arco (1–1,5 m l'uno dall'altro) attorno a uno spazio vuoto davanti al
    // posto, rivolto al centro (e quindi al posto); chi propone sta dalla parte del posto, di fianco, mezzo girato verso gli altri, e lo
    // indica. Se lì vicino c'è una sedia o il divano liberi, qualcuno ci si siede; chi capita accanto al muro ci si appoggia; uno, a volte,
    // si accovaccia o si siede per terra (le altezze cambiano). Posti liberi veri (fuori dai pezzi, sul suolo dove si cammina).
    const p = CR(C).prop; if (!p) return; const ids = [p.chi].concat(Object.keys(p.voti).filter(id => id !== p.chi)).slice(0, 7), cx = p.pos.x, cy = p.pos.y, out = {};
    const W = Wdi(C), wc = UC.mondo(C, cx, cy), usati = [], r = rngDi(C.id + '|raduna|' + p.t0), ru = p.ruoli || {};
    // il verso: dal posto verso dove c'è posto (il centro della via; in mezzo: verso il lato con più posto)
    const a0 = Math.abs(cx) > .6 ? (cx > 0 ? PI : 0) : (cy > 0 ? -PI / 2 : PI / 2), n = ids.length - 1;
    const R = cl(.9 + n * .17, 1.15, 1.85), Ox = cx + Math.cos(a0) * (R + .35), Oy = cy + Math.sin(a0) * (R + .35);
    const libero = (lx, ly) => { if (Math.abs(lx) > W / 2 - .18) return false; if (usati.some(u => hyp(u[0] - lx, u[1] - ly) < .95)) return false; const w = UC.mondo(C, lx, ly); return UC.puntoLibero(st, C, w.x, w.y); };
    const metti = (id, lx, ly, faceL, o) => { usati.push([lx, ly]); const w = UC.mondo(C, lx, ly); out[id] = Object.assign({ x: r2(w.x), y: r2(w.y), face: r3(C.a + faceL), k: 'cr' + C.id + p.t0, ruolo: ru[id] || 'dubbio' }, o || {}); };
    const verso = (lx, ly, tx, ty) => Math.atan2(ty - ly, tx - lx);
    // le sedute libere vicine (sedie, divano: chi ci siede già no)
    const sedili = [];
    for (const [i] of C.pezzi) { const q = C.piano[i]; if (!q || !PARTI[q[0]].siede) continue; if (hyp(q[1] - Ox, q[2] - Oy) > R + .9) continue; const w = UC.mondo(C, q[1], q[2]);
      if (Object.keys(C.vive || {}).some(id => { const m = npc(st, id); return m && !(p.voti[id] !== undefined) && hyp(m.x - w.x, m.y - w.y) < .5; })) continue; sedili.push([hyp(q[1] - Ox, q[2] - Oy), q]); }
    sedili.sort((a, b) => a[0] - b[0]); sedili.splice(n >= 6 ? 2 : 1);   // uno o due seduti, non il crocchio attorno al tavolo
    // chi propone: dalla parte del posto, di fianco (dove è libero), mezzo girato verso il cerchio
    const ch = ids[0];
    for (const da of [1.15, -1.15, 1.5, -1.5, .8, -.8]) { const a = a0 + PI + da, lx = Ox + Math.cos(a) * R, ly = Oy + Math.sin(a) * R; if (!libero(lx, ly)) continue; metti(ch, lx, ly, verso(lx, ly, (Ox + cx) / 2, (Oy + cy) / 2), { indica: [r2(wc.x), r2(wc.y)] }); break; }
    // gli altri sull'arco di là, a 1–1,5 m (il passo d'arco cambia un poco: non sono soldatini)
    const resto = ids.slice(1), L = []; let terra = 0;
    const passo = Math.min((1.05 + r() * .3) / R, 2.7 / Math.max(1, n - 1)); for (let j = 0; j < 9; j++) { const k = j === 0 ? 0 : (j % 2 ? 1 : -1) * Math.ceil(j / 2); L.push(k * passo + (r() - .5) * .12); }
    for (const id of resto) {
      const role = ru[id] || 'dubbio';
      // una sedia libera lì vicino: ci si siede chi non sta proponendo niente (chi dubita, chi è d'accordo, chi ride)
      if (sedili.length && role !== 'altrove' && role !== 'chiude' && r() < .75) { const q = sedili.shift()[1], w = UC.mondo(C, q[1], q[2]); usati.push([q[1], q[2]]); out[id] = { x: r2(w.x), y: r2(w.y), face: r3(C.a + q[4] + (q[0] === 'divano' ? PI / 2 : PI / 2)), k: 'cr' + C.id + p.t0, ruolo: role, siede: 1 }; continue; }
      let ok = false;
      for (const dR of [0, .3, -.15, .55]) { for (const th of L) { const a = a0 + th, lx = Ox + Math.cos(a) * (R + dR), ly = Oy + Math.sin(a) * (R + dR); if (!libero(lx, ly)) continue;
        const muro = Math.abs(lx) > W / 2 - .7, o = {};
        if (muro && (role === 'dubbio' || role === 'si' || role === 'contro') && r() < .7) { o.appoggiato = 1; }
        else if (!terra && (role === 'dubbio' || role === 'si' || role === 'ride') && r() < .3) { terra = 1; o.basso = r() < .5 ? 'accovacciato' : 'siede_terra'; }
        let f = verso(lx, ly, Ox * .6 + cx * .4, Oy * .6 + cy * .4); if (o.appoggiato) { const fm = lx > 0 ? PI : 0; f = fm + cl(((f - fm + 3 * PI) % (2 * PI)) - PI, -.7, .7); }
        metti(id, lx, ly, f, o); ok = true; break; } if (ok) break; }
    }
    // chi controproprone indica l'altro posto
    if (p.pAlt) for (const id in out) if (out[id].ruolo === 'altrove') { const w = UC.mondo(C, p.pAlt.x, p.pAlt.y); out[id].indica = [r2(w.x), r2(w.y)]; }
    p.posti = out;
  }
  UCr.raduna = raduna;
  const inDiscussione = (st, C, id) => { const p = C.cr && C.cr.prop; return p && p.posti && p.posti[id] && C.vive && C.vive[id] && C.vive[id][0] !== 'porta' ? p.posti[id] : null; };
  // la mente: chi ne parla va lì e «chiacchiera» (lo stesso verbo del presidio)
  if (UC.vita && UC.vita.metodo) {
    const m0 = UC.vita.metodo;
    UC.vita.metodo = c => {
      try {
        const st = c.st, C = UPr.presidioDi(st, c.n.id);
        if (C && c.lod !== 'dormiente') {
          const q = inDiscussione(st, C, c.n.id); if (q) return { passi: [['vai', { x: r1(q.x), y: r1(q.y) }], ['chiacchiera_in_strada', { c: C.id, x: r1(q.x), y: r1(q.y) }]], costo: .2, perche: C.fidFine || C.fid };
          const r = conMateriale(c, C); if (r) return r;
        }
      } catch (e) { }
      return m0(c);
    };
  }
  // chi porta un pezzo fatto di roba (assi, lamiere, copertoni…): prima la va a prendere alla sorgente più vicina, poi in braccio
  function conMateriale(c, C) {
    const st = c.st, e = C.vive && C.vive[c.n.id]; if (!e || e[0] !== 'porta' || e[4] === null || e[4] === undefined || !C.piano[e[4]]) return null;
    const p = C.piano[e[4]], g = PARTI[p[0]].rob, A = c.A || (typeof Attore !== 'undefined' ? Attore.di(st, c.n) : null); if (!A || !A.borsa || A.borsa.get(g) > 0) return null;
    const k = UC.sorgente(st, A, C, g, 1); if (!k || /^mucchio:/.test(k)) return null; const Pl = G.PLACES[k]; if (!Pl) return null;
    const q = UPr.postoC(st, C, c.n.id);
    stats.prese++;
    // la sorgente lontana (oltre la distanza a cui si vedono i corpi): il pezzo lo si va a prendere lì vicino (il portone, la cantina, la
    // macchina di un amico, dalla parte della sorgente) e lo si porta in braccio, così lo si vede arrivare e montare; se no, al viaggio vero
    // il pezzo compariva dai dati mentre chi lo portava era lontano
    if (hyp(Pl.x - C.x, Pl.y - C.y) > CFG.vista) {
      const ux = Math.cos(C.a + PI / 2), uy = Math.sin(C.a + PI / 2), sg = (Pl.x - C.x) * ux + (Pl.y - C.y) * uy >= 0 ? 1 : -1, L0 = Math.max(Math.abs(C.F[1]), Math.abs(C.F[3]));
      for (const d of [14, 18, 11, 22]) { const D = sg * (L0 + d * (.85 + hashS(c.n.id + 'pr') * .3)), lx = (hashS(c.n.id + 'lx') - .5) * 2 * Math.max(.5, Wdi(C) / 2 - .6), w = UC.mondo(C, lx, D);
        if (G.walkM && !G.walkM(w.x, w.y)) continue;
        return { passi: [['vai', { x: r1(w.x), y: r1(w.y) }], ['vai', { x: r1(q.x), y: r1(q.y) }], ['porta_in_strada', { c: C.id, x: r1(q.x), y: r1(q.y) }]], costo: .3, perche: C.fidFine || C.fid }; }
    }
    const ang = hashS(c.n.id + k) * PI * 2, x = r1(Pl.x + Math.cos(ang) * 3), y = r1(Pl.y + Math.sin(ang) * 3);
    return { passi: [['vai', { x, y }], ['raccatta', { cosa: g, q: 1, da: k }], ['vai', { x: r1(q.x), y: r1(q.y) }], ['porta_in_strada', { c: C.id, x: r1(q.x), y: r1(q.y) }]], costo: .3, perche: C.fidFine || C.fid };
  }
  // il posto per chi guarda (la posa, le foto): chi ne parla sta al radunarsi
  { const p0 = UPr.postoC; UPr.postoC = (st, C, id) => { try { const q = inDiscussione(st, C, id); if (q) return q; } catch (e) { } return p0(st, C, id); }; }
  // il pezzo posato: la roba esce dalle braccia
  if (V.EFF && V.EFF.pv_fa) { const f0 = V.EFF.pv_fa; V.EFF.pv_fa = (c, k) => { let C = null, e = null, i = null; try { const s = c.st.u && c.st.u.costruire, id = V._.val(k, c); C = s && s.cantieri.find(x => x.id === id); e = C && C.vive && C.vive[c.A.id]; i = e && e[0] === 'porta' ? e[4] : null; } catch (x) { }
    const r = f0(c, k); try { if (C && i !== null && i !== undefined && C.pezzi.some(p => p[0] === i)) { stats.pezzi++; const g = PARTI[C.piano[i][0]].rob; if (c.A && c.A.borsa && c.A.borsa.get(g) > 0) c.A.borsa.togli(g, 1); } } catch (x) { } return r; }; }

  // ======================= I FATTI =======================
  function scrivi(st, tipo, chi, C, d) {
    const dati = Object.assign({ via: C.via, tipo: 'presidio', cantiere: C.id, x: C.x, y: C.y }, d || {}), ch = chi.filter(Boolean).slice(0, 6), causa = C.fidFine || C.fid || null; let r = null;
    try { r = FT.scrivi(tipo, ch, dati, causa, { st }); } catch (e) { r = null; }
    if (r && r.id !== null && r.id !== undefined) return r.id;
    const f = FT._ && FT._.registra ? FT._.registra(st, { t: st.t, v: tipo, chi: ch, causa, peso: 1, hop: 0 }, dati, 'unico') : null; return f ? f.id : null;
  }
  const Sg = typeof Segni !== 'undefined' && Segni.ON ? Segni : null;
  if (Sg && Sg.TIPI) {
    Object.assign(Sg.TIPI, {
      presidio_proposta: { p: 'fumetto', w: 'che ne dite?', posa: 'discute', gz: .15, n: ['proposta', 'proposte'], bolla: false },
      presidio_deciso: { p: 'esclamativo', w: 'si fa', posa: 'discute', gz: .2, n: ['decisione', 'decisioni'], bolla: false },
      presidio_cosa: { p: 'costruisce', w: '$cosaW', posa: 'discute', gz: .45, n: ['cosa nuova in strada', 'cose nuove in strada'], bolla: false },
      presidio_sequestro: { p: 'esclamativo', w: 'sequestrato', posa: 'osserva', gz: .7, n: ['sequestro', 'sequestri'] },
      presidio_roba: { p: 'fumetto', w: '$cosaW', posa: 'discute', gz: .1, n: ['cosa da casa', 'cose da casa'], bolla: false },
      presidio_spostata: { p: 'freccia', w: 'più in là', posa: 'discute', gz: .2, n: ['cosa spostata', 'cose spostate'], bolla: false },
      strada_riaperta: { p: 'freccia', w: 'si passa', posa: 'discute', gz: .5, n: ['strada riaperta', 'strade riaperte'] },
    });
    // la bolla del presidio appena nato: il nome del gruppo, non «via nostra» (il nome si sceglie prima del fatto: qui sotto)
    if (Sg.TIPI.presidio) { Sg.TIPI.presidio.w = '$nomeW'; Sg.TIPI.presidio.r = ['In {via} è nato un presidio: {A}[, {B}] e gli altri hanno portato in strada le prime cose. Le macchine rallentano.', 'In {via} {A}[ e {B}] si sono presi un pezzo di strada: per ora poche cose, il resto lo decidono loro.']; }
    if (V.SCHEDE && V.SCHEDE.barrica && V.SCHEDE.barrica.segno && V.SCHEDE.barrica.segno.bolla) V.SCHEDE.barrica.segno.bolla[1] = 'si barrica';
  }
  if (FT.GRAV) Object.assign(FT.GRAV, { presidio_roba: .12, presidio_spostata: .2, presidio_proposta: .2, presidio_deciso: .3, presidio_cosa: .45, presidio_sequestro: .65, strada_riaperta: .5 });
  // il fatto «presidio» (la nascita) porta il nome del gruppo: lo si sceglie subito (la cerimonia della cultura), poi il fatto
  { const s0 = FT.scrivi; FT.scrivi = function (tipo, chi, dati, causa, o) {
    try { if (tipo === 'presidio' && dati && dati.cantiere && o && o.st) { const st = o.st, C = st.u.costruire.cantieri.find(x => x.id === dati.cantiere); const U = UCu();
      if (C && U && U.fondaPresidio && C.fine !== null) { try { U.fondaPresidio(st, C); } catch (e) { } }
      if (C && C.nome) dati.nomeW = String(C.nome).toLowerCase().split(/\s+/).slice(0, 4).join(' '); } } catch (e) { }
    return s0.apply(this, arguments); }; }

  // ======================= IL BATTITO (ogni CFG.ogni passi, un passo prima del presidio) =======================
  function grigiVedono(st, C) {
    // quanto in là possono andare i Grigi con quello che vedono: una sedia no, la strada chiusa sì
    const cr = CR(C), fatte = cr.el.filter(e => e[2] > 0 && !EL[e[0]].roba && elFatto(C, e)), grosso = fatte.length + fatte.filter(e => e[0] === 'baracca' || e[0] === 'palco' || e[0] === 'tettoia').length;
    const chiusa = chiusaC(C), stretta = varchi(C).largo < 3.2;
    return chiusa ? 4 : grosso >= 7 || (stretta && grosso >= 4) ? 3 : grosso >= 3 || stretta ? 2 : 1;
  }
  UCr.grigiVedono = grigiVedono;
  function battito(st, C) {
    const cr = CR(C), P = C.pv;
    // i Grigi: il gradino che possono salire dipende da quello che vedono (il presidio fa il suo passo dopo di noi)
    if (P) { if (P.gliv >= 3 && cr.gl < 3) sequestro(st, C);
      const cap = grigiVedono(st, C); if (P.gliv >= cap) P.gliv = Math.max(0, cap - 1); cr.gl = P.gliv; }
    // la strada: chiusa o no dalla forma (il fatto quando cambia)
    const ch = chiusaC(C);
    if (ch !== cr.chiusa) { cr.chiusa = ch; if (ch) { stats.chiusure++; C.meta.chiusa = { fatta: true, y: r2(varchi(C).ya), da: C.piano.length, t: r1(st.t) }; scrivi(st, 'strada_chiusa', presenti(st, C).slice(0, 4), C, { d: `${C.via} è chiusa: fra le cose del presidio non passa più nemmeno un'Ape. Le macchine tornano indietro` }); }
      else { stats.riaperture++; C.meta.chiusa = null; scrivi(st, 'strada_riaperta', presenti(st, C).slice(0, 4), C, { d: `In ${C.via} le macchine ripassano: fra le cose del presidio c'è di nuovo posto` }); } }
    else if (!ch && C.meta.chiusa) C.meta.chiusa = null;
    C.misure.passa = varchi(C).largo;
    // le cose finite: il fatto, la misura
    for (const e of cr.el) if (!e[8] && e[2] > 0 && elFatto(C, e)) { e[8] = 1; stats.cose++; misura(C);
      const id = e[6] || C.gruppo[0]; scrivi(st, 'presidio_cosa', [id], C, { d: `In ${C.via} adesso ${EL[e[0]].pl ? 'ci sono' : 'c\'è'} anche ${nomeEl(e[0], 0)}${e[6] ? ' (era un\'idea di ' + nomeN(st, e[6]) + ')' : ''}`, cosa: e[0], cosaW: nomeEl(e[0], 0).split(' ').slice(-1)[0] });
      const n = npc(st, id); if (n && vicino(st, n)) dici(st, C, [[0, id, riempi(st, C, frase(C, FATTA, rngDi(C.id + e[1]), 'fa'))]]); }
    // la proposta in corso: si conta alla fine
    if (cr.prop && st.t >= cr.prop.fine) chiudiProposta(st, C);
    // la roba di strada comparsa dopo (il disegno la carica quando ci si avvicina): le cose che ci stanno sopra si spostano o si tolgono
    rivedi(st, C);
    // i pezzi da portare a chi c'è; chi aspetta da troppo (la mente non ce l'ha fatta) lo mette dai dati
    assegna(st, C);
    for (const id in C.vive || {}) { const e = C.vive[id], n = npc(st, id); if (e[0] === 'porta' && e[4] !== null && e[4] !== undefined && st.t - e[1] > CFG.dopoPorta * (vede(st, C) ? 2.5 : 1) && n && n.pop && n.pop.near) { try { V.applica(st, n, 'porta_in_strada', { c: C.id, x: C.x, y: C.y }, { lod: 'lontano' }); } catch (x) { } } }
    // una proposta nuova: di giorno, se c'è gente, se non si sta già portando roba, ogni tanto
    const h = ora(st), daPortare = C.piano.length - C.pezzi.length;
    // il primo giorno: le prime proposte vengono presto (i fondatori hanno appena cominciato e hanno voglia di fare)
    if (cr.nato === undefined || cr.nato === null) cr.nato = r1(st.t);
    if (cr.pross === null) cr.pross = r1(st.t + 5 + hashS(C.id + st.u.seme + C.via + C.x) * 16);
    roba(st, C);
    if (!cr.prop && st.t >= cr.pross && h >= CFG.ore[0] && h < CFG.ore[1] && daPortare <= 2 && cr.el.length < CFG.maxEl && C.piano.length < CFG.maxParti - 6) {
      const N = presenti(st, C).length; cr.pross = r1(st.t + tra(rngDi(C.id + '|p|' + cr.n), CFG.pausa[0], CFG.pausa[1]) * (N >= 6 ? .7 : N >= 3 ? 1 : 1.5) * (st.t - cr.nato < 600 && cr.el.length < 4 ? .55 : 1));
      proponi(st, C);
    }
  }
  UCr.battito = battito;
  // il giocatore vede il presidio da vicino (la distanza dei corpi): lì i pezzi si portano e si montano davvero, non compaiono dai dati
  const vede = (st, C) => { const p = st.player; return !!(p && !p.indoor && hyp(p.x - C.x, p.y - C.y) < CFG.vista + 10); };
  UCr.vede = vede;
  function misura(C) { try { const L = C.pezzi.map(([i]) => C.piano[i]), M = UP.misura(L); C.misure = UC.misureCorte(M); C.misure.passa = varchi(C).largo; } catch (e) { } }
  // il sequestro: i Grigi all'ordine si portano via la cosa che dà più fastidio (quella che chiude, la baracca, l'ultima)
  function sequestro(st, C) {
    const cr = CR(C), L = cr.el.filter(e => e[2] > 0 && e[1] >= UC.nBase(C) && !EL[e[0]].roba); if (!L.length) return null;
    const peso = e => (EL[e[0]].chiude ? 10 : e[0] === 'strettoia' ? 7 : e[0] === 'baracca' ? 6 : e[0] === 'palco' ? 4 : 0) + e[7] / 1e5;
    const e = L.sort((a, b) => peso(b) - peso(a))[0]; togli(st, C, e); stats.sequestri++;
    scrivi(st, 'presidio_sequestro', [C.gruppo[0]], C, { d: `In ${C.via} i Grigi si sono portati via ${nomeEl(e[0], 0)}: sul furgone, pezzo per pezzo`, cosa: e[0] });
    return e[0];
  }
  UCr.sequestro = sequestro;
  // via una cosa dal piano: gli indici dopo scalano (i pezzi messi, chi porta, le altre cose)
  function togli(st, C, e) {
    const cr = CR(C), i0 = e[1], n = e[2]; if (!n) return;
    C.piano.splice(i0, n);
    C.pezzi = C.pezzi.filter(p => p[0] < i0 || p[0] >= i0 + n).map(p => (p[0] >= i0 + n ? [p[0] - n, p[1], p[2]] : p));
    for (const id in C.vive || {}) { const v = C.vive[id]; if (v[4] === null || v[4] === undefined) continue; if (v[4] >= i0 && v[4] < i0 + n) { v[0] = 'chiacchiera'; v[4] = null; } else if (v[4] >= i0 + n) v[4] -= n; }
    for (const f of cr.el) if (f[1] >= i0 + n) f[1] -= n;
    cr.el.splice(cr.el.indexOf(e), 1);
    if (C.meta && C.meta.base && i0 < C.meta.base) C.meta.base = Math.max(1, C.meta.base - n);
    C.F = UP.impronta(C.piano, p => !PARTI[p[0]].decoro).map(r2); if (st.__upr) st.__upr.posti = {}; if (C.ass) C.ass = {};
    // la roba di casa che stava sopra (la radio sulla cassa): giù per terra lì accanto, se c'è posto; se no la si riprende
    if (!EL[e[0]].roba) for (const f of cr.el.slice()) { if (!EL[f[0]].roba) continue; const q = C.piano[f[1]]; if (!q || q[3] < .1 || appoggiata(C, q)) continue;
      const d = PARTI[q[0]].d, q2 = q.slice(); q2[3] = r3(d[2] / 2 + .003); const O = UP.obb(q2), w = UP.aMondo(C, q[1], q[2]), ob = UP.ostacoli ? UP.ostacoli(w.x, w.y, .5).some(b => Math.abs(b.x - w.x) < b.hx + d[0] / 2 && Math.abs(b.y - w.y) < b.hy + d[0] / 2) : false; if (ob || C.piano.some((a, j) => j !== f[1] && UP.pen3(O, UP.obb(a)) > .004)) togli(st, C, f); else { C.piano[f[1]] = q2; } }
    misura(C);
  }
  UCr.togli = togli;
  // la parte piccola q sta appoggiata su qualcosa (un pezzo non decoro sotto il suo centro, col piano alla sua base)?
  function appoggiata(C, q) { const O = UP.obb(q), z0 = UP.zMin(O); return C.piano.some(a => { if (a === q || PARTI[a[0]].decoro) return false; const A = UP.obb(a); if (Math.abs(UP.zMax(A) - z0) > .03) return false; const P = UP.pianta(a), dx = q[1] - P.cx, dy = q[2] - P.cy, u = dx * P.ux + dy * P.uy, v = -dx * P.uy + dy * P.ux; return Math.abs(u) <= P.hu + .02 && Math.abs(v) <= P.hv + .02; }); }

  // ======================= LA ROBA DI STRADA che il disegno carica dopo: le cose si ricontrollano =======================
  // La roba di strada (lampioni, panchine, bidoni, fioriere) il disegno la conosce solo quando la carica (vicino al giocatore): una cosa
  // decisa prima ci può essere finita sopra (la bandiera sul paletto). A ogni battito, e quindi anche quando la roba compare, le cose si
  // rivedono: se una ci sta addosso la spostano lì vicino (un posto vero, cercato come quando la si è decisa, che il passaggio lo lasci
  // com'era se nessuno ha deciso di chiudere) o, se non c'è posto, la smontano. I pezzi già messi si spostano messi (la si sposta a mano).
  const SOPRA_VIA = { scritta: 1, striscione: 1, corda: 1, lucine: 1 };
  function sopraArredo(st, C, L) {
    if (!UP.ostacoli) return null;
    // ogni pezzo, anche i decori (la tela della bandiera contro il lampione), alla sua altezza; non i fili tesi sopra la via
    for (const p of L) { if (SOPRA_VIA[p[0]]) continue; const F = UP.impronta([p]), R = UP.rettMondo(C, F, 0), O = UP.obb(p), z0 = UP.zMin(O), z1 = UP.zMax(O);
      for (const b of UP.ostacoli(R.cx, R.cz, Math.hypot(R.hu, R.hv) + 2)) if (b.z1 > Math.max(.05, z0) && (b.z0 === undefined || b.z0 < z1) && UP.sat2(R, { cx: b.x, cz: b.y, a: 0, hu: b.hx + .04, hv: b.hy + .04 })) return b.tag || 'arredo'; }
    return null;
  }
  UCr.sopraArredo = sopraArredo;
  function rivedi(st, C) {
    if (!UP.ostacoli) return 0; const cr = CR(C); let k = 0;
    for (const e of cr.el.slice()) { if (!e[2] || cr.el.indexOf(e) < 0) continue; const tag = sopraArredo(st, C, C.piano.slice(e[1], e[1] + e[2])); if (tag) { k++; if (EL[e[0]].roba) { togli(st, C, e); stats.tolte++; } else sposta(st, C, e, tag); } }   // la roba di casa: la si riprende
    return k;
  }
  UCr.rivedi = rivedi;
  function sposta(st, C, e, tag) {
    const cr = CR(C), k = e[0], E = EL[k] || EL.sedie, L = C.piano.slice(e[1], e[1] + e[2]), ms = messi(C), tutti = L.every((p, j) => ms.has(e[1] + j)), s = e[3] < 0 ? -1 : 1;
    // la ricetta di nuovo nel suo sistema: (traverso) la sola y; (le altre) tolto lo specchio, centrata
    const F = UP.impronta(L), cx = (F[0] + F[2]) / 2, cy = (F[1] + F[3]) / 2;
    const L0 = L.map(p => { const q = p.slice(); if (!E.traverso) { if (s < 0) { q[1] = -q[1]; q[4] = -q[4]; q[5] = -q[5]; } q[1] = r3(q[1] - s * cx); } q[2] = r3(q[2] - cy); return q; });
    const was = { x: e[4], y: e[5], chi: e[6], t: e[7], fatta: e[8] }, nome = nomeEl(k, 0), pl = E.pl, fe = E.g === 'f', stava = pl ? 'stavano' : 'stava', fin = pl ? (fe ? 'e' : 'i') : (fe ? 'a' : 'o'), lo = pl ? (fe ? 'le ' : 'li ') : 'l\'';
    togli(st, C, e);
    const r = rngDi(C.id + '|sposta|' + k + '|' + Math.floor(st.t)), tieni = !E.chiude && !(cr.varco && cr.varco.k === 'chiudere');
    const pos = cerca(st, C, k, L0, was.chi, r, null, tieni);
    if (!pos) { stats.tolte++; scrivi(st, 'presidio_spostata', [was.chi || C.gruppo[0]], C, { d: `In ${C.via} ${nome} ${stava} addosso a ${tag}: non c'era un altro posto, ${lo}hanno smontat${fin}`, cosa: k, esito: 0 }); return null; }
    const e2 = aggiungi(st, C, k, pos.L, was.chi, pos, [], !tieni); e2[7] = was.t; e2[8] = tutti ? was.fatta : 0;
    if (tutti) for (let i = e2[1]; i < e2[1] + e2[2]; i++) if (!C.pezzi.some(q => q[0] === i)) C.pezzi.push([i, was.chi || C.gruppo[0], r1(st.t)]);
    stats.spostate++; misura(C);
    scrivi(st, 'presidio_spostata', [was.chi || C.gruppo[0]], C, { d: `In ${C.via} ${nome} ${stava} addosso a ${tag}: ${lo}hanno spostat${fin} ${doveDue(C, { x: was.x, y: was.y }, pos)}`, cosa: k, esito: 1 });
    return e2;
  }
  UCr.sposta = sposta;

  // ======================= IL PRIMO GIORNO: la roba di casa dei fondatori =======================
  // Il primo gesto resta uno (la scelta dei fondatori), ma nelle prime ore ognuno di loro, quando c'è, porta da casa una cosa piccola sua:
  // la radio, il thermos del caffè, un cuscino per la cassa, le carte, una piantina. Che cosa, da come è fatto; quando, dal suo tempo.
  const ROBA = { radio: p => .4 + p.giovane * 1.2 + p.festa * .6 + p.teatrale * .4, thermos: p => .4 + p.cuoco * 1.4 + p.anziano * .5 + p.fame * .6, cuscino: p => .3 + p.anziano * 1.3 + p.pigro * 1.2 + p.calmo * .4,
    carte: p => .3 + p.eta * .9 + p.calmo * .6 + p.anziano * .4, piantina: p => .25 + p.anziano * .7 + p.calmo * .5 + p.pref('vaso') };
  const SOPRA = { radio: 1, thermos: 1, cuscino: 1, carte: 1 }, PER_TERRA = { radio: 1, thermos: 1, piantina: 1 };
  const DICE_ROBA = { radio: ['Ho portato la radio. Così si sente qualcosa.', 'La radio di mio padre: va ancora, guardate.', 'Un po\' di musica, dai.'], thermos: ['Caffè per tutti, nel thermos.', 'Ho fatto il caffè. Chi ne vuole?', 'Il thermos: caffè caldo, zucchero a parte.'],
    cuscino: ['Un cuscino, che la cassa è dura.', 'Mi sono portata il cuscino da casa. Alla mia età…', 'Il cuscino del divano. Non ditelo a mia moglie.'], carte: ['Ho le carte. Una briscola?', 'Chi gioca? Ho portato le carte.', 'Le carte napoletane: chi perde offre.'],
    piantina: ['Una piantina, che fa casa.', 'Il basilico del balcone. Qui sta meglio.', 'Un po\' di verde, piccolo piccolo.'] };
  const NOMI_ROBA = { radio: 'la radio', thermos: 'il thermos del caffè', cuscino: 'un cuscino', carte: 'le carte', piantina: 'una piantina' };
  function roba(st, C) {
    const cr = CR(C); if (cr.roba === undefined) { cr.roba = {}; for (const id of C.gruppo.slice(0, 4)) cr.roba[id] = r1(cr.nato + 6 + hashS(id + '|roba') * 110); }
    const ids = Object.keys(cr.roba); if (!ids.length) return 0; let n = 0;
    for (const id of ids) {
      const t = cr.roba[id]; if (t === 0 || st.t < t) continue; if (st.t - cr.nato > 600) { cr.roba[id] = 0; continue; }
      if (!C.vive || !C.vive[id]) continue; cr.roba[id] = 0;
      const P = profilo(st, C, id), r = rngDi(C.id + '|roba|' + id), gia = new Set(cr.el.filter(e => EL[e[0]].roba).map(e => C.piano[e[1]] && C.piano[e[1]][0]));
      const k = pesata(r, Object.keys(ROBA).filter(x => !gia.has(x)).map(x => [x, ROBA[x](P)])); if (!k) continue;
      const q = postoRoba(st, C, k, r); if (!q) continue;
      const i0 = C.piano.length; C.piano.push(q); C.pezzi.push([i0, id, r1(st.t)]); cr.el.push(['roba', i0, 1, q[1] < 0 ? -1 : 1, r2(q[1]), r2(q[2]), id, r1(st.t), 1]); stats.roba++; n++;
      if (st.__upr) st.__upr.posti = {};
      scrivi(st, 'presidio_roba', [id], C, { d: `In ${C.via} ${nomeN(st, id)} ha portato da casa ${NOMI_ROBA[k]}`, cosa: k, cosaW: k });
      const m = npc(st, id); if (m && vicino(st, m)) dici(st, C, [[.5, id, riempi(st, C, frase(C, DICE_ROBA[k], r, 'rb' + k))]]);
    }
    return n;
  }
  UCr.roba = roba;
  // il posto della roba: sopra una cassa o un tavolo messi (un po' di lato, se c'è già qualcosa), se no per terra accanto alle cose,
  // dal lato del muro; mai dentro un pezzo, mai fuori dalla via
  function postoRoba(st, C, k, r) {
    const d = PARTI[k].d, ms = messi(C), prova = q => { const O = UP.obb(q); for (let j = 0; j < C.piano.length; j++) { const a = UP.obb(C.piano[j]); if (Math.abs(a.c[0] - O.c[0]) > 2 || Math.abs(a.c[1] - O.c[1]) > 2) continue; if (UP.pen3(O, a) > .004) return false; } return true; };
    const L = [];
    if (SOPRA[k]) for (const [i] of C.pezzi) { const p = C.piano[i]; if (!p || !PARTI[p[0]].piano || !ms.has(i)) continue; const top = UP.zMax(UP.obb(p)), dd = UP.dimDi(p);
      for (const [ox, oy] of [[0, 0], [.12, .14], [-.12, -.14], [.14, -.12], [-.14, .12]]) { if (Math.abs(ox) * 2 + d[0] > dd[0] + .1 && ox) continue; L.push([r() * .4 + (top < .8 ? .3 : 0), [k, r3(p[1] + ox), r3(p[2] + oy), r3(top + d[2] / 2 + .003), r3(p[4] + (r() - .5) * .8), 0, 0, 0, 0]]); } }
    if (PER_TERRA[k]) { const W = Wdi(C), e0 = CR(C).el.find(e => e[2] > 0 && !EL[e[0]].traverso) || CR(C).el[0];
      for (let j = 0; j < 10; j++) { const a = r() * PI * 2, R = .55 + r() * .7, x = cl((e0 ? e0[4] : 0) + Math.cos(a) * R, -W / 2 + .2, W / 2 - .2), y = (e0 ? e0[5] : 0) + Math.sin(a) * R; L.push([.2 + r() * .3 + Math.abs(x) / W * .4, [k, r3(x), r3(y), r3(d[2] / 2 + .003), r3(r() * PI * 2), 0, 0, 0, 0]]); } }
    L.sort((a, b) => b[0] - a[0]);
    for (const [, q] of L) { if (!prova(q)) continue; if (q[3] < .1) { const w = UP.aMondo(C, q[1], q[2]); const m = UP.controlla(st, { x: w.x, y: w.y, a: C.a }, [-d[0] / 2, -d[1] / 2, d[0] / 2, d[1] / 2], { suolo: 'via' }); if (m && m !== 'giocatore' && m !== 'cantiere') continue; } return q; }
    return null;
  }
  // la chiusura «a tappe» di unico_presidio non c'è più: niente soglie, la barricata la decidono loro come ogni altra cosa
  { const pg0 = UP.progetta; UP.progetta = function (tipo, seme) { if (tipo === 'barricata' && /\|chiude\|/.test(String(seme)) && !UCr.__chiudi) return null; return pg0.apply(this, arguments); }; }
  { const c0 = UPr.chiudiOra; UPr.chiudiOra = (st, C, pref) => { const L = sbarra(rngDi(C.id + '|chiudiOra'), { W: (C.meta && C.meta.w) || 7, seme: C.id + 'o' }, false); if (!L) return false;
    const r = rngDi(C.id + 'chiudi'), pos = cerca(st, C, 'sbarramento', L, C.gruppo[0], r); if (!pos) return false; aggiungi(st, C, 'sbarramento', pos.L, C.gruppo[0], pos, [], true); for (let i = 0; i < C.piano.length; i++) if (!C.pezzi.some(p => p[0] === i)) C.pezzi.push([i, C.gruppo[0], r1(st.t)]); battito(st, C); return true; }; }

  // ======================= LE PAROLE DETTE (vicino al giocatore, a tempo d'orologio) =======================
  const DETTE = [];
  // la battuta di chi ne parla: per la regia dei fumetti (commedia.js) è una scena, non una chiacchiera di fondo (passa davanti, non aspetta il
  // ritmo): il fumetto si scrive come lo scrive game.js (n.bark, il setter della regia lo filtra) mentre chi parla «recita»
  function dì(st, n, testo, dur) { const ev = n.__ev; if (!ev) n.__ev = { crescita: 1 }; try { n.bark = { text: testo, until: (st.clock || 0) + (dur || 3.4) }; n.barkCd = (st.clock || 0) + 8; stats.battute++; return true; } catch (e) { return false; } finally { if (!ev) delete n.__ev; } }
  const vicino = (st, n) => { const p = st.player; return p && n && !n.dead && !n.inside && !p.indoor && hyp(n.x - p.x, n.y - p.y) <= CFG.vicino; };
  function dici(st, C, righe) { const ck = st.clock || 0; for (const [dt, id, t] of righe) DETTE.push([ck + dt, id, t]); if (DETTE.length > 24) DETTE.splice(0, DETTE.length - 24); }
  function parla(st) {
    const ck = st.clock || 0;
    for (const C of presidi(st)) { const p = C.cr && C.cr.prop; if (p && !p.detto && p.righe) { p.detto = 1; if (p.righe.some(([, id]) => vicino(st, npc(st, id)))) dici(st, C, p.righe); } }
    for (let i = DETTE.length - 1; i >= 0; i--) { const [t, id, testo] = DETTE[i]; if (t > ck) continue; DETTE.splice(i, 1); const n = npc(st, id); if (vicino(st, n)) dì(st, n, testo, Math.min(6, 2.4 + testo.length / 15)); }
  }
  // (le foto) le battute di una proposta dette tutte insieme; scelta 'varco': chi propone, chi dice «così chiudiamo la strada», chi la vuole chiusa
  UCr.parlaOra = (st, C, quante, scelta) => { const p = C.cr && C.cr.prop; if (!p) return 0; p.detto = 1; let L = p.righe;
    if (scelta === 'varco') { const ru = p.ruoli || {}, pv = p.perVarco || [], pri = id => (id === p.chi ? 0 : pv.includes(id) ? 1 : ru[id] === 'chiude' ? 2 : ru[id] === 'altrove' ? 3 : ru[id] === 'contro' ? 4 : 9); const visti = new Set(); L = p.righe.filter(([, id]) => pri(id) < 9 && !visti.has(id) && visti.add(id)).sort((a, b) => pri(a[1]) - pri(b[1])); }
    let k = 0; for (const [, id, t] of L.slice(0, quante || 3)) { const n = npc(st, id); if (n && dì(st, n, t, 8)) k++; } return k; };

  // ======================= LE AUTO: passano dove c'è posto, se no si fermano (la forma, non un segno) =======================
  const BAT = UPr.BATTUTE; if (BAT) { BAT.stretta = { sbuffa: ['Ci passo, ci passo… forse.', 'Tirate dentro quella sedia!', 'Piano, che graffio!', 'Ma chi l\'ha messa qui, questa roba?', 'A passo d\'uomo, contenti?'], tifa: ['Bello qui! Passo piano.', 'Scusate il disturbo.', 'Che profumo, cosa cucinate?'] }; UPr.CFG.parla.stretta = .45; }
  const U = st => st.__upr || (st.__upr = { pass: {}, ferme: {}, auto: null, posti: {}, chi: new Map() });
  function zona(C, v) {
    if (Math.abs(v.x - C.x) > 22 || Math.abs(v.y - C.y) > 22) return null; const l = UC.locale(C, v.x, v.y), K = (G.VK || {})[v.kind] || {}, W = (C.meta && C.meta.w) || 7, g = varchi(C);
    const y0 = Math.min(g.ya, C.F[1]), y1 = Math.max(g.yb, C.F[3]);
    return l.y > y0 - (K.len || 4) / 2 - 6 && l.y < y1 + (K.len || 4) / 2 + 6 && Math.abs(l.x) < W / 2 + 1 ? { l, K, g, y0, y1 } : null;
  }
  function corsia(st, dt, Ls) {
    const u = U(st), pl = st.player;
    for (const C of Ls) {
      if (C.tipo !== 'presidio' || C.fine === null) continue;
      for (const v of st.vehicles) {
        if (v.hidden || v.wreck || (pl && v.id === pl.vehicle) || ((G.VK || {})[v.kind] || {}).boat || v.guida === 'parti') continue;
        const z = zona(C, v); if (!z) { if (u.pass[v.id] === C.id) delete u.pass[v.id]; delete u.ferme[v.id]; continue; }
        const wid = z.K.wid || 1.8, g = z.g, l = z.l, hy = Math.cos(v.ang - C.a - PI / 2);
        if (g.largo >= wid + CFG.margine) {   // c'è posto: dentro il varco, piano (stretto: più piano)
          const lo = g.g[0] + wid / 2 + .12, hi = g.g[1] - wid / 2 - .12, tx = lo <= hi ? cl(l.x, lo, hi) : g.c;
          const dentro = l.y > z.y0 - (z.K.len || 4) / 2 - .5 && l.y < z.y1 + (z.K.len || 4) / 2 + .5;
          if (Math.abs(l.x - tx) > .01) { const k = dentro ? 1 : Math.min(1, dt * 3); l.x += (tx - l.x) * k; const w = UC.mondo(C, l.x, l.y); v.x = w.x; v.y = w.y; }
          // dentro il varco si va dritti (di sbieco, in un passaggio stretto, gli spigoli toccano le cose)
          if (dentro && Math.abs(hy) > .5) { const a1 = C.a + (hy > 0 ? PI / 2 : -PI / 2); let da = (a1 - v.ang) % (2 * PI); if (da > PI) da -= 2 * PI; if (da < -PI) da += 2 * PI; v.ang += da; const sp0 = hyp(v.vx || 0, v.vy || 0); if (sp0 > 1e-3) { v.vx = Math.cos(v.ang) * sp0; v.vy = Math.sin(v.ang) * sp0; } }
          const lim = g.largo < wid + CFG.stretto + CFG.margine ? 1.3 : CFG.lento, sp = hyp(v.vx || 0, v.vy || 0); if (sp > lim) { const f = lim / sp; v.vx *= f; v.vy *= f; v.speed = (v.speed || 0) * f; if (v._spd !== undefined) v._spd = v.speed; }
          delete u.ferme[v.id];
          if (u.pass[v.id] !== C.id && sp > .3) { u.pass[v.id] = C.id; stats.auto++; CR(C).auto = (CR(C).auto || 0) + 1; const st2 = lim < CFG.lento; if (st2) stats.strette++; UPr.parla(st, u, C, v, st2 ? 'stretta' : 'passa'); }
          continue;
        }
        // niente posto: prima del primo pezzo nel suo verso si ferma, protesta a volte, e dopo 3 secondi torna indietro
        if (Math.abs(hy) < .5) continue;
        const yb = hy > 0 ? z.y0 : z.y1, d = yb - l.y, L2 = (z.K.len || 4) / 2;
        if (Math.sign(d) !== Math.sign(hy) && Math.abs(d) > .01) { delete u.ferme[v.id]; continue; }   // se ne va
        if (Math.abs(d) > L2 + 2.4 + 6) continue;
        if (Math.abs(d) > L2 + 2.4) { const sp = hyp(v.vx || 0, v.vy || 0); if (sp > CFG.lento) { const f = CFG.lento / sp; v.vx *= f; v.vy *= f; v.speed = (v.speed || 0) * f; } continue; }
        if (Math.abs(d) < L2 + 2.4 - .05) { l.y = yb - Math.sign(hy) * (L2 + 2.4); const w = UC.mondo(C, l.x, l.y); v.x = w.x; v.y = w.y; }
        v.vx = v.vy = 0; v.speed = 0; if (v._spd !== undefined) v._spd = 0;
        const t0 = u.ferme[v.id]; if (t0 === undefined) { u.ferme[v.id] = st.clock || 0; stats.ferme++; UPr.parla(st, u, C, v, 'ferma'); continue; }
        if ((st.clock || 0) - t0 > 3 && v.traffic && v.lane) { v.lane.dir *= -1; v.pass = null; delete u.ferme[v.id]; stats.indietro++; }
      }
    }
    // l'auto della foto: passa piano nel varco (o si ferma davanti al primo pezzo), da un capo all'altro
    const A = u.auto; if (A) { const C = Ls.find(x => x.id === A.c), v = st.vehicles.find(x => x.id === A.vid); if (!C || !v) u.auto = null; else {
      const dir = A.dir || 1, g = varchi(C), wid = ((G.VK || {})[v.kind] || {}).wid || 1.8, Lv = (((G.VK || {})[v.kind] || {}).len || 4) / 2, ok = g.largo >= wid + CFG.margine;
      const stop = ok ? Infinity : (dir > 0 ? Math.min(g.ya, C.F[1]) - Lv - 2.4 : Math.max(g.yb, C.F[3]) + Lv + 2.4);
      A.s += dir * A.vel * dt; if (!ok && dir * A.s > dir * stop) A.s = stop;
      const x = ok ? cl(g.c, g.g[0] + wid / 2 + .12, g.g[1] - wid / 2 - .12) : A.dx; const w = UC.mondo(C, x, A.s); v.x = w.x; v.y = w.y; v.ang = C.a + dir * PI / 2;
      const fermo = !ok && A.s === stop; v.vx = fermo ? 0 : Math.cos(v.ang) * A.vel; v.vy = fermo ? 0 : Math.sin(v.ang) * A.vel; v.speed = fermo ? 0 : A.vel;
      if (fermo && !A.detto) { A.detto = 1; UPr.parla(st, u, C, v, 'ferma'); } if (ok && dir * A.s > dir * A.fino) u.auto = null; } }
  }
  UCr.corsia = corsia;
  if (UV) UV.primaDeiCorpi = corsia;
  UPr.corsia = corsia;
  UPr.passa = (st, C, s0, dir, vel, filtro) => {
    let best = null, bd = Infinity; for (const v of st.vehicles) { const K = (G.VK || {})[v.kind] || {}; if (v.hidden || v.wreck || K.boat || K.pocket || v.police || (st.player && v.id === st.player.vehicle) || (K.len || 4) > 5 || (filtro && !filtro(K, v))) continue; const d = hyp(v.x - C.x, v.y - C.y) + (v.traffic ? 0 : 500); if (d < bd) { bd = d; best = v; } }
    if (!best) return null; U(st).auto = { vid: best.id, c: C.id, s: s0 === undefined ? C.F[1] - 6 : s0, dx: -.35, vel: vel === undefined ? 2 : vel, dir: dir || 1, fino: (dir || 1) > 0 ? C.F[3] + 8 : C.F[1] - 8 }; corsia(st, 0, [C]); return best;
  };

  // ======================= LA FASE =======================
  function fase(st) {
    if (!st.u || !st.u.costruire) return;
    if (st.player && st.clock !== undefined && (DETTE.length || presidi(st).some(C => C.cr && C.cr.prop && !C.cr.prop.detto))) parla(st);
    if (Un().passi % CFG.ogni !== CFG.fase) return;
    for (const C of presidi(st)) try { battito(st, C); } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.crescita', e); }
  }
  Un().fase('unico.crescita', { dopo: 'unico.corpi', budget: { p95: .02 } }, fase);
  // avanti di «ore» (le foto, le prove): il mondo fermo, il presidio vive dai dati (chi c'è, le proposte, i pezzi messi da chi li porta)
  UCr.avanza = (st, C, ore, quanti, o) => {
    o = o || {}; const passo = 6, fino = st.t + ore * 60; CR(C);
    while (st.t < fino) {
      st.t += passo;
      try { UPr.vita(st, C); } catch (e) { }
      for (const id in C.vive) { const e = C.vive[id]; if (e[0] === 'porta' && e[4] !== null && e[4] !== undefined && st.t - e[1] > 12 && !C.pezzi.some(p => p[0] === e[4]) && UC.sorretto(C, e[4], messi(C))) { C.pezzi.push([e[4], id, r1(st.t)]); stats.pezzi++; e[0] = 'chiacchiera'; e[4] = null; e[1] = r1(st.t); } }
      battito(st, C);
      if (C.chiuso) break;
    }
    if (o.finisci && quanti) UPr.avanza(st, C, (st.t - C.fine) / 60, quanti);
    if (o.finisci) for (let i = 0; i < C.piano.length; i++) if (!C.pezzi.some(p => p[0] === i) && UC.sorretto(C, i, messi(C))) C.pezzi.push([i, C.gruppo[0], r1(st.t)]);
    battito(st, C); UPr.rifaiChi(st); if (st.__upr) st.__upr.posti = {};
    return CR(C).el.map(e => e[0]);
  };
  UCr.riassunto = C => ({ el: CR(C).el.map(e => [e[0], e[3], e[4], e[5], e[8]]), parti: C.piano.length, messi: C.pezzi.length, varco: varchi(C).largo, chiusa: chiusaC(C) });

  // ======================= IL DISEGNO delle parti nuove (solo nel browser) =======================
  if (typeof window !== 'undefined' && typeof THREE !== 'undefined' && UV) {
    const T3 = THREE, GEO = {}, MAT_ = {}, TEX = {};
    const box = (w, h, d) => GEO['b' + [w, h, d]] || (GEO['b' + [w, h, d]] = new T3.BoxGeometry(w, h, d));
    const sfera = r => GEO['s' + r] || (GEO['s' + r] = new T3.IcosahedronGeometry(r, 0));
    const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return MAT_[k] || (MAT_[k] = new T3.MeshStandardMaterial(Object.assign({ color: c, roughness: .85 }, o || {}))); };
    const tr = (x, y, z) => new T3.Matrix4().makeTranslation(x, y, z);
    const comC = C => { try { const st = Un() && Un().st; return st ? com(st, C) : null; } catch (e) { return null; } };
    function tela(key, w, h, fn) {
      if (TEX[key]) return TEX[key]; const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); fn(x, w, h);
      const t = new T3.CanvasTexture(c); if (T3.SRGBColorSpace) t.colorSpace = T3.SRGBColorSpace; return (TEX[key] = new T3.MeshStandardMaterial({ map: t, roughness: .9 }));
    }
    const colDi = (c, C) => { const U = UCu(), L = U && U.COLORI; const k = c && c.col; const f = L && L.find(q => q[0] === k); return f ? f[1] : ['#C25B36', '#2F60B5', '#3F8A50', '#DC9A34'][Math.floor(hashS(C.id) * 4)]; };
    const simbolo = (x, c, X, Y, S) => { const U = UCu(); if (U && U.disegna && c && c.sim) { try { U.disegna(x, c.sim, X, Y, S); return; } catch (e) { } } x.fillStyle = '#16121B'; x.beginPath(); x.arc(X + S / 2, Y + S / 2, S * .35, 0, PI * 2); x.fill(); };
    function forme(C, p, i) {
      const k = p[0], d = UP.dimDi(p), [L, D, H] = d, h = hashS(C.id + ':' + i), out = [], add = (g, m, M) => out.push([g, m, M || new T3.Matrix4()]);
      if (k === 'lucine') {   // il filo che pende e le lampadine accese, a colori alterni
        const n = Math.max(6, Math.round(L / .38)), sag = .18 + L * .02, cav = mat('#2a2622'), cols = ['#FFD27A', '#FF7A59', '#7AD1FF', '#B6F27A', '#FFE9B0'];
        const z = u => -sag * (1 - (2 * u - 1) ** 2);
        for (let j = 0; j < n; j++) { const u0 = j / n, u1 = (j + 1) / n, x0 = -L / 2 + L * u0, x1 = -L / 2 + L * u1, y0 = z(u0), y1 = z(u1), len = hyp(x1 - x0, y1 - y0);
          add(box(len, .012, .012), cav, new T3.Matrix4().makeRotationZ(Math.atan2(y1 - y0, x1 - x0)).premultiply(tr((x0 + x1) / 2, (y0 + y1) / 2, 0)));
          if (j > 0) { const c = cols[(j + Math.floor(h * 5)) % cols.length]; add(sfera(.045), mat(c, { emissive: c, emissiveIntensity: 1.4, roughness: .4 }), tr(x0, y0 - .06, 0)); } }
      } else if (k === 'bandiera') {
        const c = comC(C), col = colDi(c, C), m = tela('band' + C.id + col + (c && c.sim ? JSON.stringify(c.sim) : ''), 128, 86, (x, w, hh) => { x.fillStyle = col; x.fillRect(0, 0, w, hh); x.fillStyle = '#F2E7CF'; x.fillRect(0, hh * .78, w, hh * .1); simbolo(x, c, w * .3, hh * .12, hh * .6); });
        const g = GEO['bnd' + L] || (GEO['bnd' + L] = (() => { const q = new T3.PlaneGeometry(L, H, 8, 1), P = q.attributes.position; for (let j = 0; j < P.count; j++) P.setZ(j, Math.sin((P.getX(j) / L + .5) * PI * 2.2) * .05 * (P.getX(j) / L + .5)); q.computeVertexNormals(); return q; })());
        add(g, m, tr(0, 0, .003)); add(g, m, new T3.Matrix4().makeRotationY(PI).premultiply(tr(0, 0, -.003)));
      } else if (k === 'bacheca') {
        const leg = mat('#5a4030'); for (const s of [-1, 1]) add(box(.06, H, .06), leg, tr(s * (L / 2 - .05), 0, 0));
        add(box(L, H * .5, .04), mat('#b98d5a'), tr(0, H * .2, 0)); add(box(L - .1, H * .5 - .1, .01), mat('#c9a06a'), tr(0, H * .2, .025));
        const fogli = ['#F2E7CF', '#F2D36B', '#E8E2D6', '#F2B9A8', '#BFD9E8']; for (let j = 0; j < 5; j++) add(box(.2, .26, .004), mat(fogli[j]), new T3.Matrix4().makeRotationZ((hashS(C.id + j) - .5) * .3).premultiply(tr(-L / 2 + .2 + j * (L - .3) / 5, H * .2 + (j % 2 ? .1 : -.08), .033)));
        add(box(L + .08, .05, .1), mat('#5a4030'), tr(0, H * .46, .02));
      } else if (k === 'murale') {
        const c = comC(C), col = colDi(c, C), m = tela('mur' + C.id + col + (c && c.sim ? JSON.stringify(c.sim) : '') + L, 256, Math.round(256 * (H - .15) / L), (x, w, hh) => {
          const r = rngDi(C.id + 'murale'), cs = [col, '#F2E7CF', '#DC9A34', '#2F60B5', '#E04B8C', '#93B27C', '#16121B'];
          x.fillStyle = cs[1]; x.fillRect(0, 0, w, hh); for (let j = 0; j < 9; j++) { x.fillStyle = cs[Math.floor(r() * cs.length)]; x.beginPath(); x.ellipse(r() * w, r() * hh, 20 + r() * 60, 12 + r() * 40, r() * 3, 0, PI * 2); x.fill(); }
          x.strokeStyle = '#16121B'; x.lineWidth = 4; for (let j = 0; j < 4; j++) { x.beginPath(); x.moveTo(r() * w, r() * hh); x.bezierCurveTo(r() * w, r() * hh, r() * w, r() * hh, r() * w, r() * hh); x.stroke(); }
          const S = hh * .7; x.fillStyle = 'rgba(242,231,207,.85)'; x.beginPath(); x.arc(w / 2, hh / 2, S * .58, 0, PI * 2); x.fill(); simbolo(x, c, w / 2 - S / 2, hh / 2 - S / 2, S); });
        add(box(L, H - .15, .05), mat('#8a6a48'), tr(0, .075, 0)); add(GEO['pm' + L] || (GEO['pm' + L] = new T3.PlaneGeometry(L - .04, H - .19)), m, tr(0, .075, .027));
        for (const s of [-1, 1]) add(box(.08, .15, .5), mat('#5a4030'), tr(s * (L / 2 - .2), -H / 2 + .075, 0));
      } else if (k === 'divano') {
        const cols = ['#6a7a4a', '#8a4a3a', '#5a5a7a', '#a8804a', '#7a5a6a'], m = mat(cols[Math.floor(h * cols.length)]), m2 = mat('#3a2a22');
        add(box(L - .3, .22, D - .25), m, tr(0, -H / 2 + .3, .1)); add(box(L - .3, .1, D - .25), mat('#e8dcc0', { roughness: 1 }), tr(.25, -H / 2 + .43, .1));
        add(box(L, H * .62, .22), m, tr(0, -H / 2 + H * .31 + .12, -D / 2 + .11)); for (const s of [-1, 1]) add(box(.15, H * .5, D), m, tr(s * (L / 2 - .075), -H / 2 + H * .25 + .1, 0));
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(box(.06, .1, .06), m2, tr(sx * (L / 2 - .1), -H / 2 + .05, sz * (D / 2 - .1)));
      } else if (k === 'radio') {   // la radiolina: la cassa colorata, l'altoparlante, la manopola, l'antenna
        const cols = ['#8a2a22', '#2a4a6a', '#c8a050', '#3a5a3a'], m = mat(cols[Math.floor(h * cols.length)]);
        add(box(L, H, D), m); add(GEO['rc'] || (GEO['rc'] = new T3.CylinderGeometry(.065, .065, .01, 14)), mat('#1a1614'), new T3.Matrix4().makeRotationX(PI / 2).premultiply(tr(-L * .2, 0, D / 2 + .004)));
        add(box(.05, .05, .02), mat('#d8d0c0'), tr(L * .28, H * .15, D / 2 + .008)); add(box(.008, .36, .008), mat('#c8c8c8'), new T3.Matrix4().makeRotationZ(-.35).premultiply(tr(L * .32, H / 2 + .17, 0)));
        add(box(L * .7, .02, .02), mat('#1a1614'), tr(0, H / 2 + .03, 0));
      } else if (k === 'thermos') {
        const cols = ['#b83a2a', '#3a6a9a', '#d8d0c0', '#4a7a4a'], m = mat(cols[Math.floor(h * cols.length)], { roughness: .5, metalness: .3 });
        add(GEO['th'] || (GEO['th'] = new T3.CylinderGeometry(L / 2, L / 2, H * .82, 12)), m, tr(0, -H * .09, 0)); add(GEO['tt'] || (GEO['tt'] = new T3.CylinderGeometry(L / 2 * .9, L / 2, H * .18, 12)), mat('#2a2622'), tr(0, H * .41, 0));
      } else if (k === 'cuscino') {
        const cols = ['#c8503a', '#e0b040', '#5a7ab0', '#a05a8a', '#7a9a5a'], m = mat(cols[Math.floor(h * cols.length)], { roughness: 1 });
        add(box(L, H * .7, D), m, tr(0, -H * .1, 0)); add(box(L * .86, H * .3, D * .86), m, tr(0, H * .3, 0)); add(box(.03, .02, .03), mat('#3a2a22'), tr(0, H / 2 + .005, 0));
      } else if (k === 'carte') {   // il mazzo e tre carte aperte a ventaglio
        add(box(L * .5, H, D * .9), mat('#f2ece0'), tr(-L * .22, 0, 0));
        for (let j = 0; j < 3; j++) add(box(L * .45, .004, D * .85), mat(j === 1 ? '#c23a2a' : '#f2ece0'), new T3.Matrix4().makeRotationY(-.4 + j * .35).premultiply(tr(L * .2, -H / 2 + .004 + j * .003, 0)));
      } else if (k === 'piantina') {
        add(GEO['pv'] || (GEO['pv'] = new T3.CylinderGeometry(L * .42, L * .32, H * .45, 10)), mat('#b8603a'), tr(0, -H * .275, 0));
        for (let j = 0; j < 4; j++) add(sfera(.07 + (j % 2) * .02), mat(j % 2 ? '#4a8a3a' : '#3a7a2a', { roughness: .9 }), tr(Math.cos(j * 1.7 + h * 6) * .05, H * .05 + j * .035, Math.sin(j * 1.7 + h * 6) * .05));
      } else if (k === 'cartello') {
        const c = comC(C), col = colDi(c, C); add(box(.07, H, .07), mat('#6a5038'), tr(0, 0, -.02));
        const m = tela('cart' + C.id + col + (c && c.sim ? JSON.stringify(c.sim) : ''), 128, 128, (x, w, hh) => { x.fillStyle = '#F2E7CF'; x.fillRect(0, 0, w, hh); x.strokeStyle = col; x.lineWidth = 12; x.strokeRect(6, 6, w - 12, hh - 12); simbolo(x, c, w * .16, hh * .16, w * .68); });
        add(box(L, L, .03), mat('#8a6a48'), tr(0, H / 2 - L / 2 - .05, .02)); const g = GEO['pc' + L] || (GEO['pc' + L] = new T3.PlaneGeometry(L - .04, L - .04));
        add(g, m, tr(0, H / 2 - L / 2 - .05, .037)); add(g, m, new T3.Matrix4().makeRotationY(PI).premultiply(tr(0, H / 2 - L / 2 - .05, .003)));
      }
      return out;
    }
    const d0 = Object.getOwnPropertyDescriptor(UV, 'extra'), prima = () => (d0 ? (d0.get ? d0.get() : d0.value) : null);
    const nostro = (C, out, T) => { const f = prima(); if (f) try { f(C, out, T); } catch (e) { }
      if (C.tipo !== 'presidio' || !UV.matParte) return;
      try { for (const [i] of C.pezzi) { const p = C.piano[i]; if (!p || !NUOVE.has(p[0])) continue; const M = UV.matParte(p); for (const [g, m, Mp] of forme(C, p, i)) out.push([g, m, M.clone().multiply(Mp)]); } } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.crescita', e); } };
    try { Object.defineProperty(UV, 'extra', { configurable: true, get: () => nostro, set: f => { if (d0 && d0.set) d0.set(f); else if (f !== nostro && d0) d0.value = f; } }); } catch (e) { }
    // le pose: chi ne parla «discute» rivolto al posto; chi porta un pezzo lo porta in braccio, e al posto lo monta
    const AN = typeof Anim !== 'undefined' && Anim.npcPost && Anim.POSES ? Anim : null;
    if (AN) AN.npcPost((st, n, s) => {
      if (!st.__upr || n.dead || n.inside || n.inVeh) return; const C = st.__upr.chi.get(n.id); if (!C || C.chiuso || !C.vive || !C.vive[n.id]) return;
      const e = C.vive[n.id], mv = Math.abs(n.speedNow || 0) > .3;
      if (e[0] === 'porta') { if (mv) { const p = C.piano[e[4]], w = p && UC.mondo(C, p[1], p[2]); if (!w || Math.cos(Math.atan2(w.y - n.y, w.x - n.x) - (n.face || 0)) > -.2) s.upper = 'porta'; return; } const p = C.piano[e[4]]; if (p) { const w = UC.mondo(C, p[1], p[2]); if (hyp(w.x - n.x, w.y - n.y) < 2.2 && AN.POSES.martella) { s.act = 'martella'; n.face = Math.atan2(w.y - n.y, w.x - n.x); } } return; }
      const q = inDiscussione(st, C, n.id); if (!q || mv || hyp(n.x - q.x, n.y - q.y) > 1) return;
      gesti(st, C, n, s, q);
    });
    // i gesti di chi ne parla, per quello che ha detto (il ruolo nella discussione): chi propone indica il posto, chi è contro incrocia le
    // braccia e scuote la testa, chi scherza ride, chi non sa alza le spalle, chi è d'accordo annuisce; tutti guardano chi sta parlando
    // (il fumetto acceso), e fra una battuta e l'altra lo sguardo va da chi propone al posto. Chi parla gesticola di più.
    const PO = AN.POSES, ha = k => !!PO[k], SP = { ck: -1, C: null, id: null };
    const testa = m => ({ x: m.x, y: 1.55, z: m.y, ground: true });
    function chiParla(st, C) { const ck = st.clock || 0; if (SP.ck === ck && SP.C === C) return SP.id; SP.ck = ck; SP.C = C; SP.id = null; const P = C.cr.prop; for (const id in P.posti) { const m = npc(st, id); if (m && m.bark && m.bark.until > ck) { SP.id = id; break; } } return SP.id; }
    function gesti(st, C, n, s, q) {
      const P = C.cr.prop, ck = st.clock || 0, ph = hashS(n.id + 'g') * 11, ru = q.ruolo || (n.id === P.chi ? 'propone' : 'dubbio'), sp = chiParla(st, C), io = sp === n.id;
      const k = ((ck + ph) % 6) / 6, spm = sp && !io ? npc(st, sp) : null;
      s.act = null; s.upper = null; s.talk = io; n.face = q.face;
      const punta = q.indica ? Math.atan2(q.indica[1] - n.y, q.indica[0] - n.x) : null;
      if (q.siede) { s.act = 'siede'; s.sedile = true; }
      else if (q.basso && ha(q.basso)) s.act = q.basso;
      else if (q.appoggiato && ha('appoggiato')) s.act = 'appoggiato';
      const libero = !s.act, testaA = x => { if (libero && ha(x)) s.act = x; };   // i gesti di sola testa vanno nel posto del corpo, se è libero
      switch (ru) {
        case 'propone': case 'altrove':   // indica il posto (di più quando parla), se no le mani sui fianchi o i gesti larghi
          if (punta !== null && ha('indica') && (io ? k < .7 : k < .35)) { s.upper = 'indica'; s.indica = { a: ((punta - n.face + 3 * PI) % (2 * PI)) - PI }; }
          else if (io) testaA('discute'); else s.upper = 'mani_fianchi'; break;
        case 'contro':   // le braccia incrociate, la testa che fa di no (quando parla chi propone, o quando dice la sua)
          if (io && k < .5) testaA('discute'); else { s.upper = 'braccia'; if (io || sp === P.chi || k < .3) testaA('nega'); } break;
        case 'ride': s.upper = io || k < .45 ? 'ride' : 'tasche'; break;
        case 'chiude': if (io) testaA('discute'); else s.upper = 'mani_fianchi'; break;
        case 'si': if (io) testaA('parla'); else { s.upper = hashS(n.id + 'si') < .5 ? 'dietro' : 'tasche'; if (spm && k < .55) testaA('annuisce'); } break;
        default: s.upper = io || (k > .5 && k < .78) ? 'spallucce' : hashS(n.id + 'du') < .5 ? 'tasche' : 'dietro';
      }
      if (s.upper && !ha(s.upper)) s.upper = null; if (s.act && !ha(s.act)) s.act = null;
      // lo sguardo: chi parla (il fumetto acceso); se nessuno parla, chi propone e il posto, a turno
      if (spm) s.lookAt = testa(spm);
      else if (io && punta !== null) s.lookAt = { x: q.indica[0], y: .6, z: q.indica[1], ground: true };
      else { const ch = npc(st, P.chi), w = UC.mondo(C, P.pos.x, P.pos.y), g = Math.floor((ck + ph) / 2.6) % 3; s.lookAt = g === 0 || !ch || ch === n ? { x: w.x, y: .7, z: w.y, ground: true } : testa(ch); }
    }
  }
  Un().Crescita = UCr;
  return UCr;
})();
if (typeof window !== 'undefined') window.UnicoCrescita = UnicoCrescita;
