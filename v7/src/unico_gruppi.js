/* [unico] unico_gruppi.js: I GRUPPI, LE VOGLIE COMPOSTE, IL «COME FACCIAMO?» E IL RUMORE (le fondamenta dell'emergenza aperta; la
   consegna: commedia/REGISTA_CONSEGNA.md, «Le idee e i gruppi»). Dietro ?commedia. Spento il flag: UnicoGruppi = { ON: false }.
   Si appoggia a unico_idee.js (le idee, i tratti, l'accumulo). Niente esiti scritti: qui ci sono solo le PRECONDIZIONI.

   LE VOGLIE COMPOSTE. Una voglia è verbo × bersaglio × scala: il verbo dal registro di Verbo (chiacchiera, dipingi_muro, regala,
   rinfaccia, proponi_appuntamento, presta, vai, pesca, presidia…) oppure SOGNATO (volare, manifestare, rovesciare, liberare,
   sposare, addestrare, scioperare…: VERBI); il bersaglio è una persona, un gruppo, i Grigi (l'istituzione), un posto, il mare, una
   nozione assurda; la scala è strada (0), quartiere (1), città (2). Il punteggio viene dalle idee (il soggetto, la valenza), dai
   tratti e dal gruppo; con la FOLLIA vincono anche le combinazioni assurde (regalare un pane ai Grigi, pescare in piazza).
   LA MENTE la mette in opera: l'obiettivo «militare» (Mente.estendi) con il metodo «compito», che espande la voglia nei verbi che ci
   sono (la stessa porta di tutti, Verbo.fai). Se il verbo non c'è o non si può fare:
   IL «COME FACCIAMO?» (mezzi e fini). Molti verbi sognati vogliono un EFFETTO (EFFETTI: stare_in_aria, essere_in_alto, andare_veloce,
   essere_visti, avere_soldi, avere_riparo, liberare, rovesciare…). Per l'effetto si cercano i MEZZI (ognuno con i verbi che usa, o
   quelli che gli mancano): «volare» → la rampa (una struttura chiesta a UnicoCostruire.richiedi per effetto, oggi un mucchio di pezzi),
   salire in cima al faro, buttarsi giù per la salita… I mezzi si ordinano per tratti (onesto, losco, assurdo, rischioso) e il primo che
   si può fare vince: il fatto «come_facciamo» lo dice («Come si fa a volare? Totò ha un'idea: …»), e la diceria lo porta in giro.
   Se nessun mezzo si può fare, la voglia diventa il fatto «vuole» («Totò vuole volare») e il buco del vocabolario si conta in
   st.u.gruppi.mancanti (verbo, effetto, mezzo): la lista di quello che il paese vorrebbe fare e non sa ancora.
   L'ECONOMIA VERA. I debiti sono già trasferimenti veri (presta, chiedi_prestito, salda muovono i soldi; dai e regala la roba; vendi
   vende alla bottega ai prezzi di Economia). Il debitore messo alle strette (un rinfaccio con i soldi) prende la voglia «avere_soldi»
   e sceglie la STRATEGIA per tratti e idee: lavorare, vendere la roba alla bottega, pescare e vendere, chiedere a un altro (la catena
   dei debiti), oppure (mancano i verbi, finiscono nella lista) l'orto, la ricettazione, lo spaccio, il furto, cercare il tesoro.
   I GRUPPI COME ATTORI. Chi ha un'idea forte sullo stesso soggetto, nello stesso quartiere, si cerca: con un fondatore (zelo, carisma)
   nasce un gruppo con un nome (generato), i membri, il capo, la cassa (le quote: un prestito vero al capo), la base (un cantiere di
   UnicoCostruire), le rivalità (soggetto uguale e valenza opposta, o l'uno contro l'altro), le scissioni (un rancore col capo, un
   carisma che fa ombra), il reclutamento (la chiacchiera di un membro a chi la pensa uguale, o il trascinatore col credulone) e
   l'OBIETTIVO COLLETTIVO, una voglia composta alla scala del gruppo (strada → quartiere → città). Il gruppo agisce solo con le voglie
   date ai membri (i compiti), che la Mente di ciascuno pesa coi suoi tratti (il vile si tira indietro quando è rischioso).
   I GRIGI reagiscono all'attività del gruppo (il «calore»): il fermo con Popolo.arrest (il sistema che c'è), lo sgombero della base;
   e i fatti della repressione tornano idee (l'anello si chiude: chi ha visto portare via un amico ce l'ha con i Grigi).
   IL RUMORE: i capricci (una voglia composta a caso, più spesso per i folli), gli sbagli (il folle sbaglia persona), le coincidenze
   (in unico_idee.js). Tutto dal flusso 'gruppi' della porta: stesso seme, stessa storia.
   IL REGISTA vede tutto come fili (famiglie idea, gruppo, rivolta): spinge, calma, incrocia; non decide niente.
   LO STATO in st.u.gruppi, solo dati: { v, n, L: [gruppo], chiusi, voglie: { id: voglia }, mancanti, tentati, conti, bud, prossimo }. */
var UnicoGruppi = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UG = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UG;
  if (!ON) return UG;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const ID = () => (typeof UnicoIdee !== 'undefined' && UnicoIdee.ON ? UnicoIdee : null);
  const ME = () => { const M = (typeof Unico !== 'undefined' && Unico.Mente) || (typeof MenteUnica !== 'undefined' ? MenteUnica : null); return M && M.ON ? M : null; };
  const SG = () => (typeof Segni !== 'undefined' && Segni.ON ? Segni : null);
  const UC = () => (typeof UnicoCostruire !== 'undefined' && UnicoCostruire.ON ? UnicoCostruire : null);
  const RG = () => (typeof Regista !== 'undefined' && Regista.ON ? Regista : null);
  const SO = () => (typeof UnicoSociali !== 'undefined' && UnicoSociali.ON ? UnicoSociali : null);
  const PO = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  if (!G || !Un() || !FT() || !ID() || !ME() || !ME().estendi) { UG.ON = false; return UG; }
  const I = ID();
  const DEBUG = /[?&]regia\b/.test(location.search);
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
  const rnd = () => Un().flusso('gruppi');
  const pick = L => L[Math.floor(rnd() * L.length) % L.length];
  const io = id => (id === 'player' ? 'nino' : id == null ? null : String(id));
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

  const CFG = UG.CFG = { battito: 30, ora: 60, max: 12, membriMax: 14, fonda: 3, fattiGiorno: 90, voglia: 180, capriccio: [.004, .12], capricciGiorno: 10,
    calore: { soglia: 1.6, decad: .6 }, scala: [[5, 1], [9, 2]], base: 4, quota: 3, inattivo: 2880 };
  const stats = UG.stats = { battiti: 0, ms: 0, msMax: 0, nati: 0, sciolti: 0, scissioni: 0, entrati: 0, usciti: 0, obiettivi: 0, imprese: 0, repressioni: 0, sgomberi: 0, voglie: 0, espanse: 0, vuole: 0, come: 0, capricci: 0, sbagli: 0, debitori: 0, basi: 0, quote: 0 };

  // ======================= LO STATO =======================
  function S(st) {
    const u = st && st.u; if (!u) return null;
    if (!u.gruppi) u.gruppi = { v: 1, n: 0, L: [], chiusi: [], voglie: {}, mancanti: {}, tentati: {}, conti: {}, bud: { g: -1, n: 0, c: 0 }, prossimo: st.t, ora: st.t };
    return u.gruppi;
  }
  const npc = (st, id) => (G.byId ? G.byId(st, id) : null);
  const vivo = (st, id) => { const n = npc(st, id); return n && n.pop && !n.dead && !n.gone ? n : null; };
  const libero = (st, id) => { const n = vivo(st, id); return n && !(n.jailedUntil > st.t) ? n : null; };
  const nome = (st, id) => { try { const L = typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null; if (L && L.nome) { const s = L.nome(st, id); if (s && s !== String(id)) return s; } } catch (e) { } const n = npc(st, id); return (n && (n.first || n.name)) || 'qualcuno'; };
  const T = (st, id) => I.tratti(st, id) || { follia: 0, zelo: 0, vilta: .5, carisma: .3, credulo: .3, testardo: .3, contrario: 0 };
  const gruppoDi = (st, id) => { const s = st.u && st.u.gruppi; if (!s) return null; for (const g of s.L) if (g.membri.includes(id)) return g; return null; };
  const gDi = (st, gid) => { const s = st.u && st.u.gruppi; return s ? s.L.find(g => g.id === gid) || s.chiusi.find(g => g.id === gid) || null : null; };
  const conta = (o, k, d) => { o[k] = (o[k] || 0) + (d || 1); };
  function scrivi(st, tipo, chi, dati, causa, forza) {
    const s = S(st), g = Math.floor(st.t / 1440); if (s.bud.g !== g) { s.bud.g = g; s.bud.n = 0; s.bud.c = 0; }
    if (!forza && s.bud.n >= CFG.fattiGiorno) return null; s.bud.n++;
    let f = null; try { f = FT()._.registra(st, { t: st.t, v: tipo, chi: [].concat(chi).filter(x => x != null).slice(0, 6), causa: typeof causa === 'number' ? causa : null, peso: 1, hop: 0 }, dati, 'unico'); } catch (e) { f = null; }
    return f;
  }
  // i nomi dei gruppi per le parole delle idee (I.formeS 'g:')
  I.nomeGruppo = (st, gid) => { const g = gDi(st, gid); return g ? I.forme(g.nome) : null; };

  // ======================= I POSTI =======================
  const MURI = ['vico', 'caruggio', 'piazzetta', 'calata', 'piazza', 'lungomare', 'salita', 'passeggiata', 'fontana', 'molo'];
  let ALTI = null;   // i posti alti (il faro, il campanile, il monte): derivato
  const alti = () => ALTI || (ALTI = Object.keys(G.PLACES || {}).filter(k => /faro|campanil|torre|monte|belved|rocca|castell/i.test(k + ' ' + (G.PLACES[k].name || ''))));
  const lontanoC = c => c.lod === 'lontano' || c.lod === 'dormiente';
  const vaiP = (x, y) => ['vai', { x: r1(x), y: r1(y) }];
  function vaiPosto(c, pid) {
    const P = G.PLACES && G.PLACES[pid]; if (!P) return null;
    const d = hyp(P.x - c.A.x, P.y - c.A.y); if (d < 6) return [];
    if (!lontanoC(c) && d > 160) return null;
    const a = Math.random === undefined ? 0 : (c.n.id.length * 1.7) % 6.28;
    return [vaiP(P.x + Math.cos(a) * 2.5, P.y + Math.sin(a) * 2.5)];
  }
  function vaiDa(c, k) {
    if (!k) return null; const d = hyp(k.x - c.A.x, k.y - c.A.y);
    if (lontanoC(c)) return d <= 3 ? [] : null;
    if (d <= 2.2) return []; if (d > 45 || !!k.inside !== !!c.n.inside) return null;
    const f = 1.2 / d; return [vaiP(k.x + (c.A.x - k.x) * f, k.y + (c.A.y - k.y) * f)];
  }
  const vicini = c => { try { return ME()._.vicini(c) || []; } catch (e) { return []; } };
  function muroPer(c, b) {
    if (b && b.s && b.s.slice(0, 2) === 'l:' && MURI.includes(b.s.slice(2)) && G.PLACES[b.s.slice(2)]) return b.s.slice(2);
    let best = null, bd = 1e9; for (const m of MURI) { const P = G.PLACES && G.PLACES[m]; if (!P) continue; const d = hyp(P.x - c.A.x, P.y - c.A.y); if (d < bd) { bd = d; best = m; } }
    return best && (lontanoC(c) || bd < 150) ? best : null;
  }
  const METODO = (c, m) => { const M = ME()._.METODI[m]; if (!M) return null; try { const r = M(c); return r && !r.attesa && r.passi ? r.passi : null; } catch (e) { return null; } };
  // il fatto da raccontare per un soggetto: il fatto «idea» del parlante su quel soggetto, o il fatto del suo gruppo
  function fattoDa(c, s, gid) {
    const st = c.st, L = I.di(st, c.n.id), So = SO(), F = FT();
    const cand = L.filter(e => e[4] && (!s || I.soggDi(e[0]) === s)).map(e => e[4]);
    const g = gid ? gDi(st, gid) : null; if (g) { if (g.fid) cand.push(g.fid); if (g.ob && g.ob.fid) cand.unshift(g.ob.fid); }
    return cand.map(id => F.di(st, id)).filter(Boolean);
  }

  // ======================= I VERBI DELLE VOGLIE (solo dati, più l'espansione) =======================
  // k: i tipi di bersaglio; a: [affinità con la valenza negativa, con la positiva]; r: rischio con i Grigi; sc: [scala min, max];
  // inf: l'infinito con il bersaglio ({B} {di_B} {a_B} {in_B}); e: l'effetto voluto (per il «come facciamo?»); ft: i tipi di fatto che la
  // compiono; esp(c, v): i passi coi verbi che ci sono, o null. Senza esp il verbo non c'è: va all'effetto, se no nella lista dei mancanti.
  const K_TUTTI = ['persona', 'gruppo', 'istituzione', 'luogo', 'assurdo', 'mare', 'idea'];
  const VERBI = UG.VERBI = {
    chiacchiera: { k: K_TUTTI, a: [.6, .6], r: .1, inf: 'parlare a tutti {di_B}', ft: ['chiacchiera'], esp(c, v) {
      const F = fattoDa(c, v.b.s, v.gid); if (!F.length) return null; const So = SO();
      const L = vicini(c).filter(x => !x.nino && !(gruppoDi(c.st, x.id) && v.gid && gruppoDi(c.st, x.id).id === v.gid)).slice(0, 5);
      for (const x of L) for (const f of F) { if (So && So.sa && So.sa(c.st, x.id, f)) continue; const p = vaiDa(c, x.k); if (p) return p.concat([['chiacchiera', { chi: x.id, di: f.id }]]); }
      return null; } },
    dipingi_muro: { k: ['istituzione', 'gruppo', 'luogo', 'persona', 'idea', 'assurdo'], a: [.8, .35], r: .5, inf: 'scrivere sui muri {di_B}', ft: ['dipinge_muro'], esp(c, v) {
      const m = muroPer(c, v.b); if (!m) return null; const Bg = c.A.borsa, con = Bg.get('bomboletta') ? 'bomboletta' : Bg.get('pennello') ? 'pennello' : 'gesso';
      const p = vaiPosto(c, m); if (!p) return null; return [['@procura', { cosa: con, q: 1 }]].concat(p, [['dipingi_muro', { muro: m, con }]]); } },
    regala: { k: ['persona', 'istituzione', 'gruppo'], a: [-.4, .9], r: 0, inf: 'fare un regalo {a_B}', ft: ['regalo'], esp(c, v) {
      const k = personaPer(c, v); if (!k) return null; const p = vaiDa(c, k); if (!p) return null; let g = null;
      for (const [x, q] of c.A.borsa) { const C = (typeof Oggetti !== 'undefined' && Oggetti.CAT) ? Oggetti.CAT[x] : null; if (q >= 1 && C && !C.tool && !C.wpn && !C.ill && x !== 'canna') { g = x; break; } }
      if (!g) return [['@procura', { cosa: 'pane', q: 1 }]].concat(p, [['regala', { chi: k.id, cosa: 'pane', q: 1 }]]);
      return p.concat([['regala', { chi: k.id, cosa: g, q: 1 }]]); } },
    rinfaccia: { k: ['persona', 'gruppo'], a: [.9, -.5], r: .1, inf: 'dirne quattro {a_B}', ft: ['rinfacciato'], esp(c, v) {
      const k = personaPer(c, v); if (!k) return null; const F = FT(), me = io(c.n.id);
      if (!(F.debito(c.st, me, io(k.id)) > 0 || F.rancore(c.st, me, io(k.id)) >= .2)) return null;   // senza un torto il verbo non c'è: «rinfacciare per un'idea» è un buco
      const p = vaiDa(c, k); return p ? p.concat([['rinfaccia', { chi: k.id }]]) : null; } },
    proponi_appuntamento: { k: ['persona'], a: [-.2, .6], r: 0, inf: 'darsi appuntamento con {B}', ft: ['appuntamento'], esp(c, v) {
      const k = personaPer(c, v); if (!k) return null; const p = vaiDa(c, k); return p ? p.concat([['proponi_appuntamento', { chi: k.id }]]) : null; } },
    presta: { k: ['persona'], a: [-.3, .4], r: 0, inf: 'mettere soldi nella cassa {di_B}', ft: ['prestito'], esp(c, v) {
      const k = personaPer(c, v); if (!k || (c.A.soldi || 0) < 12) return null; const p = vaiDa(c, k); return p ? p.concat([['presta', { chi: k.id, soldi: CFG.quota }]]) : null; } },
    vai: { k: ['luogo', 'mare', 'assurdo'], a: [.15, .45], r: 0, inf: 'andare {a_B}', ft: ['vai'], esp(c, v) {
      const s = v.b.s; let pid = s.slice(0, 2) === 'l:' ? s.slice(2) : s === 'mare' ? 'molo' : s === 'a:faro' ? (alti()[0] || null) : s === 'a:statua' ? 'piazza' : s === 'a:luna' ? 'lungomare' : null;
      return pid ? vaiPosto(c, pid) : null; } },
    pesca: { k: ['mare', 'luogo'], a: [-.1, .7], r: 0, inf: 'pescare {in_B}', ft: ['pesca'], esp: c => METODO(c, 'pesca') },
    presidia: { k: ['luogo', 'istituzione', 'gruppo'], a: [.7, .5], r: .6, sc: [1, 2], inf: 'tenere {B} con una barricata', ft: ['barrica', 'tira_su', 'presidia', 'rivendica'], esp(c, v) {
      if (UC() && UC().cantiereDi && UC().cantiereDi(c.st, c.n.id)) return METODO(c, 'rivendica');
      richiedi(c.st, v, 'sbarramento', c.n); return null; } },
    lavora: { k: ['idea'], a: [.2, .3], r: 0, inf: 'lavorare per {B}', ft: ['lavora'], esp: c => METODO(c, 'turno') },
    vendi: { k: ['idea'], a: [.2, .2], r: 0, inf: 'vendere la roba', ft: ['vende'], esp: c => METODO(c, 'vendi_roba') },
    // i verbi sognati: con l'effetto (si cerca un mezzo), o senza (dritti nella lista dei mancanti)
    volare: { k: ['assurdo', 'luogo', 'mare'], a: [.1, .5], e: 'stare_in_aria', inf: 'volare sopra {B}' },
    salire: { k: ['luogo', 'assurdo'], a: [.1, .4], e: 'essere_in_alto', inf: 'salire più in alto di tutti' },
    correre: { k: ['luogo'], a: [.2, .3], e: 'andare_veloce', inf: 'andare più veloce del vento {in_B}' },
    manifestare: { k: ['istituzione', 'luogo', 'persona', 'gruppo'], a: [.9, .2], r: .8, sc: [1, 2], e: 'essere_visti', inf: 'manifestare contro {B}' },
    rovesciare: { k: ['istituzione', 'gruppo', 'persona'], a: [1, -.6], r: 1, sc: [2, 2], e: 'rovesciare', inf: 'rovesciare {B}' },
    liberare: { k: ['persona'], a: [-.2, .9], r: .7, e: 'liberare', inf: 'liberare {B}' },
    arricchirsi: { k: ['idea', 'persona'], a: [.4, .3], e: 'avere_soldi', inf: 'fare i soldi' },
    festeggiare: { k: ['luogo', 'persona', 'gruppo', 'assurdo'], a: [-.2, .8], e: 'fare_festa', inf: 'fare una festa per {B}' },
    rifugio: { k: ['luogo', 'gruppo'], a: [.3, .5], e: 'avere_riparo', inf: 'farsi un rifugio {in_B}' },
    scioperare: { k: ['istituzione'], a: [.7, 0], r: .6, sc: [1, 2], inf: 'scioperare contro {B}' },
    occupare: { k: ['luogo', 'istituzione'], a: [.7, .3], r: .8, sc: [1, 2], inf: 'occupare {B}' },
    sabotare: { k: ['istituzione', 'gruppo'], a: [.8, -.5], r: .9, inf: 'sabotare {B}' },
    processare: { k: ['persona', 'istituzione'], a: [.8, -.5], r: .4, inf: 'fare il processo {a_B}' },
    eleggere: { k: ['persona'], a: [-.3, .7], inf: 'eleggere {B} sindaco' },
    sposare: { k: ['persona', 'assurdo', 'mare'], a: [-.6, .8], inf: 'sposare {B}' },
    addestrare: { k: ['assurdo'], a: [.2, .6], inf: 'addestrare {B}' },
    parlare_con: { k: ['assurdo', 'mare'], a: [.2, .6], inf: 'parlare con {B}' },
    maledire: { k: ['persona', 'luogo', 'istituzione', 'gruppo'], a: [.7, -.4], inf: 'lanciare il malocchio {a_B}' },
    pregare_per: { k: ['persona', 'assurdo', 'luogo', 'mare'], a: [.2, .6], inf: 'fare una novena per {B}' },
    cantare: { k: ['luogo', 'persona', 'assurdo', 'gruppo'], a: [.3, .6], inf: 'fare una serenata {a_B}' },
    corrompere: { k: ['istituzione', 'persona'], a: [.5, .2], r: .5, inf: 'comprarsi {B}' },
    sfidare: { k: ['persona', 'gruppo'], a: [.7, -.2], r: .2, inf: 'sfidare {B} a duello' },
    fuggire: { k: ['mare', 'istituzione'], a: [.6, .3], inf: 'scappare per mare lontano {di_B}' },
  };
  // il bersaglio persona di una voglia (con lo SBAGLIO: il folle a volte sbaglia persona)
  function personaPer(c, v) {
    const st = c.st, s = v.b.s; let k = null;
    if (s.slice(0, 2) === 'p:') k = libero(st, s.slice(2));
    else if (s === 'grigi') { let bd = 60; for (const n of st.npcs) if (n.grigio && !n.dead && !n.inside) { const d = hyp(n.x - c.A.x, n.y - c.A.y); if (d < bd) { bd = d; k = n; } } }
    else if (s.slice(0, 2) === 'g:') { const g = gDi(st, s.slice(2)); if (g) { const mio = gruppoDi(st, c.n.id); const L = g.membri.filter(id => id !== c.n.id).map(id => libero(st, id)).filter(Boolean); if (mio && mio.id === g.id && v.v === 'presta') k = libero(st, g.capo); else k = L.sort((a, b) => hyp(a.x - c.A.x, a.y - c.A.y) - hyp(b.x - c.A.x, b.y - c.A.y))[0] || null; } }
    if (!k || k === c.n) return null;
    if (rnd() < T(st, c.n.id).follia * .3) {   // lo sbaglio: c'è un altro lì vicino, e il folle si rivolge a lui
      const x = vicini(c).find(y => !y.nino && y.id !== k.id); if (x) { stats.sbagli++; scrivi(st, 'equivoco', [c.n.id, x.id, k.id], { d: `${nome(st, c.n.id)} cercava ${nome(st, k.id)} e si è rivolto a ${nome(st, x.id)}`, voglia: v.v }, null); return x.k; }
    }
    return k;
  }

  // ======================= I MEZZI PER UN EFFETTO («COME FACCIAMO?») =======================
  // ogni mezzo: { id, d (come si dice), t: tag (onesto|losco|assurdo|rischioso), manca: [verbi che non ci sono], esp(c, v) }
  const M_ = (id, d, t, esp, manca) => ({ id, d, t, esp: esp || null, manca: manca || [] });
  const viaAlto = (c) => { const L = alti(); for (const p of L) { const r = vaiPosto(c, p); if (r) return r; } return null; };
  function viaStruttura(c, v, eff, poi) {
    const UCx = UC(); if (!UCx) return null; const C = UCx.perEffetto ? UCx.perEffetto(c.st, c.n.id, eff) : null;
    if (!C) { richiedi(c.st, v, eff, c.n); return null; }
    if (C.fine === null) return METODO(c, 'rivendica');
    return [vaiP(C.x, C.y), ['presidia', { c: C.id, x: r1(C.x), y: r1(C.y) }]].concat(poi ? [poi] : []);
  }
  const EFFETTI = UG.EFFETTI = {
    stare_in_aria: [M_('rampa', 'tirare su una rampa e saltarci giù col motorino', 'rischioso', (c, v) => viaStruttura(c, v, 'rampa'), ['salta_con_mezzo']),
      M_('tetto', 'buttarsi da un tetto con un ombrello', 'assurdo', null, ['arrampicati', 'salta']), M_('gru', 'salire sulla gru del porto', 'rischioso', null, ['arrampicati']),
      M_('aquilone', 'farsi tirare da un aquilone grande così', 'assurdo', null, ['fai_aquilone']), M_('faro', 'salire in cima al faro: è quasi volare', 'onesto', c => viaAlto(c))],
    essere_in_alto: [M_('faro', 'salire in cima al faro', 'onesto', c => viaAlto(c)), M_('torre', 'tirare su una torre di bancali', 'assurdo', (c, v) => viaStruttura(c, v, 'torre')), M_('campanile', 'arrampicarsi sul campanile', 'rischioso', null, ['arrampicati'])],
    andare_veloce: [M_('salita', 'buttarsi giù per la salita a rotta di collo', 'rischioso', c => vaiPosto(c, 'salita')), M_('motorino', 'rubare un motorino', 'losco', null, ['ruba_mezzo', 'guida']), M_('barca', 'farsi prestare una barca a motore', 'onesto', null, ['noleggia'])],
    essere_visti: [M_('muri', 'riempire i muri di scritte', 'rischioso', (c, v) => VERBI.dipingi_muro.esp(c, v)), M_('voce', 'passare parola a tutti', 'onesto', (c, v) => VERBI.chiacchiera.esp(c, v)),
      M_('corteo', 'fare un corteo in piazza', 'rischioso', null, ['manifesta', 'radunati']), M_('barricata', 'chiudere una via con una barricata', 'rischioso', (c, v) => viaStruttura(c, v, 'sbarramento'))],
    rovesciare: [M_('barricate', 'barricate in tutte le vie', 'rischioso', (c, v) => viaStruttura(c, v, 'sbarramento')), M_('scritte', 'scritte su ogni muro della città', 'rischioso', (c, v) => VERBI.dipingi_muro.esp(c, v)),
      M_('voce', 'convincere la gente, una casa alla volta', 'onesto', (c, v) => VERBI.chiacchiera.esp(c, v)), M_('sciopero', 'lo sciopero generale', 'onesto', null, ['sciopera']), M_('palazzo', 'prendere il palazzo del Garante', 'rischioso', null, ['occupa', 'assalta'])],
    liberare: [M_('commissariato', 'andare tutti sotto il commissariato a reclamare', 'rischioso', c => vaiPosto(c, 'commissariato')), M_('corrompere', 'comprarsi una guardia', 'losco', null, ['corrompi']), M_('evasione', 'farlo evadere', 'rischioso', null, ['libera', 'scassina'])],
    avere_soldi: [M_('lavoro', 'lavorare di più', 'onesto', c => METODO(c, 'turno')), M_('vendere', 'vendere la roba alla bottega', 'onesto', c => METODO(c, 'vendi_roba')),
      M_('pesca', 'pescare e vendere il pesce', 'onesto', c => METODO(c, 'pesca_vendi')), M_('prestito', 'farsi prestare da un altro', 'onesto', (c, v) => prestitoAltrove(c, v)),
      M_('orto', 'fare un orto e vendere la verdura', 'onesto', null, ['coltiva', 'raccogli']), M_('ricetta', 'piazzare roba di provenienza dubbia', 'losco', null, ['ricetta']),
      M_('spaccio', 'mettersi a trafficare', 'losco', null, ['spaccia']), M_('furto', 'rubare in una bottega', 'losco', null, ['ruba']), M_('banca', 'chiedere un prestito in banca', 'onesto', null, ['chiedi_prestito_banca']), M_('sussidio', 'chiedere il sussidio all\'ufficio del regime', 'onesto', null, ['chiedi_sussidio']), M_('tesoro', 'cercare il tesoro dei pirati sulla spiaggia', 'assurdo', (c) => vaiPosto(c, 'spiaggia'), ['scava'])],
    fare_festa: [M_('voce', 'passare parola: stasera si fa festa', 'onesto', (c, v) => VERBI.chiacchiera.esp(c, v)), M_('appuntamento', 'dare appuntamento a tutti', 'onesto', (c, v) => invitaQualcuno(c)), M_('banda', 'mettere su una banda', 'assurdo', null, ['suona'])],
    avere_riparo: [M_('baracca', 'tirare su una baracca', 'onesto', (c, v) => viaStruttura(c, v, 'riparo')), M_('grotta', 'andare a vivere in una grotta', 'assurdo', null, ['abita'])],
  };
  function prestitoAltrove(c, v) {
    const cred = v.b.s.slice(0, 2) === 'p:' ? v.b.s.slice(2) : null, F = FT();
    const x = vicini(c).find(y => !y.nino && y.id !== cred && (y.k.pop.money || 0) >= 30 && F.debito(c.st, y.id, io(c.n.id)) <= 0); if (!x) return null;
    const p = vaiDa(c, x.k); return p ? p.concat([['chiedi_prestito', { chi: x.id, soldi: 8 }]]) : null;
  }
  function invitaQualcuno(c) { const x = vicini(c).find(y => !y.nino); if (!x) return null; const p = vaiDa(c, x.k); return p ? p.concat([['proponi_appuntamento', { chi: x.id }]]) : null; }
  // i mezzi in ordine per chi è: l'onesto (legge), il losco, il folle, il vile
  function ordinaMezzi(st, id, L) {
    const n = npc(st, id), tr = (n && n.tr) || {}, t = T(st, id), lg = typeof tr.legge === 'number' ? tr.legge : .5;
    return L.map(m => [m, (m.t === 'onesto' ? .3 + lg * .5 : 0) + (m.t === 'losco' ? (1 - lg) * .7 + t.zelo * .2 : 0) + (m.t === 'assurdo' ? t.follia * 1.3 : 0) + (m.t === 'rischioso' ? .25 + t.zelo * .4 - t.vilta * .6 : 0) + rnd() * .35])
      .sort((a, b) => b[1] - a[1]).map(x => x[0]);
  }

  // ======================= LA STRUTTURA CHIESTA (UnicoCostruire.richiedi) =======================
  function richiedi(st, v, eff, n) {
    const UCx = UC(); if (!UCx || !UCx.richiedi || v.rich) return null; v.rich = 1;
    const g = v.gid ? gDi(st, v.gid) : null, gr = g ? [g.capo].concat(g.membri.filter(x => x !== g.capo)).filter(id => libero(st, id)) : [n.id];
    const C = UCx.richiedi(st, { effetto: eff, altezza: eff === 'rampa' ? 2 : eff === 'torre' ? 3 : 1, x: n.x, y: n.y, gruppo: gr.slice(0, 5), motivo: g ? g.nome : eff });
    if (C) { stats.basi++; if (g && !g.base) g.base = { c: C.id, via: C.via, eff }; scrivi(st, 'struttura_chiesta', gr.slice(0, 3), { d: `${g ? g.nome : nome(st, n.id)}: si mettono a tirare su ${eff === 'rampa' ? 'una rampa' : eff === 'riparo' ? 'un riparo' : eff === 'torre' ? 'una torre' : 'una barricata'} in ${C.via}`, gruppo: g ? g.id : null, cantiere: C.id, effetto: eff }, null); }
    return C;
  }

  // ======================= IL GENERATORE DI VOGLIE (verbo × bersaglio × scala) =======================
  const kindOf = s => (s === 'grigi' ? 'istituzione' : s === 'mare' ? 'mare' : s === 'soldi' ? 'idea' : { 'p:': 'persona', 'g:': 'gruppo', 'l:': 'luogo', 'a:': 'assurdo' }[s.slice(0, 2)] || 'idea');
  const VK = Object.keys(VERBI);
  // o: { scala, gruppo (il gruppo che decide), folle (un capriccio), soggetti: [[s, val, peso]] in più }
  function genera(st, id, o) {
    const t = T(st, id), L = I.di(st, id), cand = [];
    for (const e of L) cand.push([I.soggDi(e[0]), e[1], e[2] * Math.abs(e[1])]);
    for (const x of o.soggetti || []) cand.push(x);
    if (o.folle || rnd() < .2 + t.follia) {   // il rumore: un soggetto qualunque (un posto, una nozione assurda, i Grigi)
      const P = Object.keys(G.PLACES || {}); cand.push([pick(['grigi', 'mare', 'a:' + pick(Object.keys(I.ASSURDI)), 'l:' + pick(P.length ? P : ['piazza'])]), rnd() < .5 ? -.5 : .5, .15 + t.follia * .4]);
    }
    if (!cand.length) return null;
    const sc = o.scala || 0; let best = null, bs = -1e9;
    for (const [s, val, w] of cand) {
      const kd = kindOf(s);
      for (const v of VK) {
        const V = VERBI[v], ok = V.k.includes(kd), a = V.a[val < 0 ? 0 : 1];
        if (V.sc && (sc < V.sc[0] || sc > V.sc[1]) && !(o.folle && t.follia > .6)) continue;
        if (!ok && t.follia < .45) continue;
        let x = w * a * (ok ? 1 : .3) + (o.gruppo ? .15 : 0) - (V.r || 0) * t.vilta * .5 + (V.r || 0) * t.zelo * .3 + rnd() * .25;
        if (o.folle || t.follia > .3) x += t.follia * rnd() * (a <= .1 || !ok ? 1.4 : .5);   // la follia premia le combinazioni storte
        if (!V.esp && !V.e) x -= .15 * (1 - t.follia);   // i sogni senza nessun mezzo: li vuole chi è un po' matto o molto acceso
        if (x > bs) { bs = x; best = { v, b: { k: kd, s }, s: sc, val: val < 0 ? -1 : 1 }; }
      }
    }
    return best;
  }
  // la frase di una voglia: «volare sopra il mare», «rovesciare i Grigi»
  function inf(st, v) { const V = VERBI[v.v], F = I.formeS(st, v.b.s); return (V ? V.inf : v.v).replace('{B}', F[0]).replace('{di_B}', F[1]).replace('{a_B}', F[2]).replace('{in_B}', F[3]); }
  UG.inf = inf;
  // dare una voglia a qualcuno (src: 'gruppo:g1' | 'capriccio' | 'debito' | 'idea')
  function dai(st, id, v, src, fino, int) {
    const s = S(st), Mn = ME().mente(st, id); if (!Mn) return null;
    s.voglie[id] = Object.assign({ src, t0: Math.round(st.t), fino: Math.round(fino || st.t + CFG.voglia), int: r2(int || .7), n: 0 }, v);
    if (Mn.ob && Mn.ob.g !== 'militare' && rnd() < .5) Mn.prossima = Math.min(Mn.prossima, st.t + 2);
    stats.voglie++; const key = v.v + '|' + v.b.k + '|' + (v.s || 0); (s.tentati[key] = s.tentati[key] || [0, 0, 0])[0]++;
    return s.voglie[id];
  }
  // la voglia non si fa: il fatto «vuole», e il buco nella lista
  function vuole(st, id, v, manca) {
    const s = S(st), key = v.v + '|' + v.b.k + '|' + (v.s || 0); (s.tentati[key] = s.tentati[key] || [0, 0, 0])[2]++;
    for (const m of manca) conta(m.indexOf('modo:') === 0 ? (s.falliti = s.falliti || {}) : s.mancanti, m);
    stats.vuole++;
    const g = v.gid ? gDi(st, v.gid) : null;
    if (g && g.ob && g.ob.v === v.v) { g.ob.ko = (g.ob.ko || 0) + 1; if (g.ob.ko === 2) scrivi(st, 'vuole', [g.capo].concat(g.membri.slice(0, 2)), { d: `${g.nome} vorrebbero ${inf(st, v)}, ma non sanno come: per ora lasciano perdere`, gruppo: g.id, voglia: v.v, idea: v.b.s + '|' + (v.val < 0 ? 'rancore' : 'speranza') }, g.ob.fid); return; }
    if (!g) scrivi(st, 'vuole', id, { d: `${nome(st, id)} vorrebbe ${inf(st, v)}, ma per ora ci rinuncia`, voglia: v.v, idea: v.b.s + '|' + (v.val < 0 ? 'rancore' : 'speranza') }, null);
  }

  // ======================= L'ESITO CONCRETO (ogni tentativo finisce: bene, o in una comica) =======================
  // il mezzo → [le riuscite, le comiche]; il caso e i tratti decidono (la follia e la viltà fanno andare storto), mai il copione
  const ESITI = UG.ESITI = {
    rampa: [['è volato tre metri ed è atterrato in piedi, fra gli applausi'], ['la rampa è crollata sotto il motorino', 'è finito in mare, motorino compreso', 'ha preso la rincorsa, poi ha frenato all\'ultimo']],
    faro: [['dalla cima del faro ha aperto le braccia: quasi volava'], ['si è chiuso fuori sul ballatoio del faro e ha dovuto gridare aiuto', 'arrivato a metà scala gli è venuto il capogiro']],
    torre: [['in cima alla torre di bancali si vedeva tutto il porto'], ['la torre di bancali si è piegata come un giunco']],
    salita: [['è sceso dalla salita come un fulmine'], ['è ruzzolato giù dalla salita fino alla fontana', 'ha preso la salita di corsa, ma in su']],
    muri: [['i muri parlano: l\'hanno letto tutti'], ['la vernice è colata e la scritta non si legge']],
    voce: [['la voce è arrivata dappertutto'], ['l\'hanno ascoltato in due, e uno dormiva']],
    barricata: [['la barricata regge'], ['la barricata l\'hanno usata per stendere i panni']],
    barricate: [['la via è chiusa, si passa solo dal varco'], ['metà dei bancali li hanno già portati via per il fuoco']],
    scritte: [['le scritte sono su ogni muro'], ['hanno sbagliato muro: era quello della caserma']],
    commissariato: [['a forza di reclamare l\'hanno rilasciato'], ['li hanno cacciati via a male parole']],
    lavoro: [['ha messo insieme qualche soldo'], ['ha lavorato come un mulo, e i soldi non bastano lo stesso']],
    vendere: [['ha piazzato la roba alla bottega'], ['alla bottega gli hanno dato due spiccioli']],
    pesca: [['il pesce l\'ha venduto tutto'], ['ha preso solo un sandalo']],
    prestito: [['un altro gli ha prestato i soldi: un debito tappa l\'altro'], ['non gliel\'ha prestati nessuno']],
    tesoro: [['ha trovato una moneta vecchia: è un inizio'], ['ha scavato tutto il giorno: un tappo di bottiglia']],
    appuntamento: [['la festa si fa'], ['all\'appuntamento c\'era solo lui']],
    baracca: [['il riparo c\'è, con il tetto di lamiera'], ['al primo vento il tetto è volato via']],
    $: [['in qualche modo ce l\'ha fatta'], ['è finita con un gran capitombolo', 'un gabbiano gli ha rubato il cappello sul più bello', 'la gente ha riso e lui ha fatto un inchino', 'è arrivato un Grigio e se n\'è andato fischiettando', 'si è fermato a metà e ha fatto finta di niente']],
  };
  function esito(st, id, v, f) {
    const t = T(st, id), m = v.come || (v.prova ? '$' : null); if (!m) return;
    const E = ESITI[m] || ESITI.$, ok = v.prova ? rnd() < .08 : rnd() < .55 - t.follia * .35 - (v.come === 'rampa' || v.come === 'salita' ? .15 : 0) + t.zelo * .15;
    const riga = pick(ok ? E[0] : E[1]), g = v.gid ? gDi(st, v.gid) : null;
    const d = `${g ? g.nome + ': ' : ''}${nome(st, id)} ha provato a ${inf(st, v)}${v.prova ? ' (così come veniva)' : ''}: ${riga}`;
    scrivi(st, ok ? 'riuscito' : 'comica', id, { d, voglia: v.v, mezzo: m, gruppo: g ? g.id : null, idea: v.b.s + '|' + (ok ? 'orgoglio' : 'curiosita') }, f ? f.id : null, true);
    stats[ok ? 'riusciti' : 'comiche'] = (stats[ok ? 'riusciti' : 'comiche'] || 0) + 1;
    if (ok && v.v === 'liberare' && v.b.s.slice(0, 2) === 'p:') { const k = vivo(st, v.b.s.slice(2)); if (k && k.jailedUntil > st.t) k.jailedUntil = st.t; }   // concreto: esce davvero
  }
  // il ripiego: nessun mezzo si può fare → la cosa più vicina che si può fare (andare in un posto pubblico e provarci lì, comico)
  const PUBBLICI = ['piazza', 'molo', 'fontana', 'lungomare', 'calata', 'piazzetta'];
  function ripiego(c) { let best = null, bd = 1e9; for (const p of PUBBLICI) { const P = G.PLACES && G.PLACES[p]; if (!P) continue; const d = hyp(P.x - c.A.x, P.y - c.A.y); if (d < bd) { bd = d; best = p; } } return best ? vaiPosto(c, best) : null; }

  // ======================= LA MENTE: l'obiettivo «militare» e il metodo «compito» =======================
  function voglia(st, id) { const s = st.u && st.u.gruppi; const v = s && s.voglie[id]; if (!v) return null; if (v.fino < st.t) { delete s.voglie[id]; return null; } return v; }
  const FONTE = c => { const v = voglia(c.st, c.n.id); if (!v) return 0; const t = T(c.st, c.n.id), V = VERBI[v.v] || {}; return clamp(v.int * (1 - (V.r || 0) * t.vilta * .6) + t.zelo * .2, 0, 1); };
  function compito(c) {
    const st = c.st, id = c.n.id, v = voglia(st, id); if (!v) return null;
    v.n++; const s = S(st), key = v.v + '|' + v.b.k + '|' + (v.s || 0), V = VERBI[v.v];
    let passi = null, manca = [], comeD = null;
    if (V && V.esp) { passi = V.esp(c, v); if (!passi && !v.rich) manca.push('modo:' + v.v + '→' + v.b.k); }
    else {
      const E = V && V.e ? EFFETTI[V.e] : null;
      if (!E) manca.push('verbo:' + v.v);
      else {
        let primo = null;
        for (const m of ordinaMezzi(st, id, E)) {
          if (!m.esp) { if (!primo) primo = m; continue; }
          passi = m.esp(c, v); if (passi) { comeD = m; break; }
        }
        if (primo && (!comeD || E.indexOf(primo) !== -1)) for (const x of primo.manca) manca.push('verbo:' + x + ' (per ' + V.e + ')');
        if (!passi && !v.rich) manca.push('effetto:' + V.e);
        if (comeD) for (const x of comeD.manca) conta(s.mancanti, 'verbo:' + x + ' (approssimato: ' + comeD.id + ')');
        if (comeD && !v.come) {   // «come facciamo?»: si discute, e la diceria lo porta in giro
          v.come = comeD.id; stats.come++;
          const g = v.gid ? gDi(st, v.gid) : null;
          scrivi(st, 'come_facciamo', g ? [id].concat(g.membri.filter(x => x !== id).slice(0, 2)) : [id], { d: `«Come si fa a ${inf(st, v)}?» ${nome(st, id)} ha un'idea: ${comeD.d}${primo && primo !== comeD ? ' (meglio sarebbe ' + primo.d + ', ma non si può)' : ''}`, gruppo: g ? g.id : null, mezzo: comeD.id, effetto: V.e, idea: v.b.s + '|speranza' }, g && g.ob ? g.ob.fid : null);
        }
      }
    }
    if (!passi) {
      if (v.rich && v.n < 6) return null;   // la struttura è chiesta: la Mente di chi è nel cantiere ci penserà con «rivendicare»
      if (manca.length) { const s2 = S(st); for (const m of manca) conta(m.indexOf('modo:') === 0 ? (s2.falliti = s2.falliti || {}) : s2.mancanti, m); manca = []; }
      // il ripiego comico: ci si prova lo stesso, così come viene, in un posto dove tutti vedono (finisce col fatto «comica»)
      const rp = !V || !V.esp || V.e ? ripiego(c) : null;
      if (rp && rp.length && v.n <= 3) { v.prova = 1; v.ft = ['vai']; stats.ripieghi = (stats.ripieghi || 0) + 1; (s.tentati[key] = s.tentati[key] || [0, 0, 0])[2]++; return { passi: rp, costo: .2, perche: null }; }
      delete s.voglie[id]; vuole(st, id, v, manca); return null;
    }
    (s.tentati[key] = s.tentati[key] || [0, 0, 0])[1]++; stats.espanse++;
    v.ft = (V && V.ft) || (comeD ? ['vai', 'presidia', 'dipinge_muro', 'chiacchiera', 'vende', 'lavora', 'prestito', 'pesca', 'appuntamento', 'barrica', 'tira_su'] : []);
    return { passi, costo: .15, perche: v.gid && gDi(st, v.gid) && gDi(st, v.gid).ob ? gDi(st, v.gid).ob.fid : null };
  }
  ME().estendi({ fonti: { compito: FONTE }, obiettivi: { militare: { base: 1.25, considera: [['tutto', 'compito', 1]], car: ['!pigro'], metodi: ['compito'] } }, metodi: { compito }, costo: { compito: () => .15 } });
  if (ME().ORARIO) { ME().ORARIO.svago.militare = 1.3; ME().ORARIO.giro.militare = 1.3; ME().ORARIO.sfogo.militare = 1.3; }

  // ======================= I NOMI DEI GRUPPI =======================
  const SOGNO_N = { luna: 'della Luna', gabbiani: 'dei Gabbiani', faro: 'del Faro', sirene: 'delle Sirene', statua: 'della Statua', orologio: 'dell\'Orologio', piccioni: 'dei Piccioni', tonno: 'del Tonno', campane: 'delle Campane', torre: 'della Torre', tram: 'del Tram', libeccio: 'del Libeccio' };
  function nomina(st, s, val, q, capo) {
    const Q = I.nomeQ(q, 1), F = I.formeS(st, s), cn = nome(st, capo), k = s.slice(0, 2);
    let L;
    if (s === 'grigi') L = val < 0 ? ['I Senza Grigio', `La Lega ${Q}`, `Il Comitato Libero ${Q}`, 'Le Mani Nere', `La Brigata ${cn}`, 'I Figli della Risacca', 'Il Fronte del Porto Vecchio', 'Quelli che non chinano la testa'] : ['Gli Amici dell\'Ordine', `Il Comitato per il Decoro ${Q}`, 'I Benpensanti', 'La Guardia Civica'];
    else if (k === 'p:') L = val < 0 ? [`Quelli contro ${F[0]}`, `Il Fronte anti-${F[0]}`, 'La Combriccola del Muso'] : [`Gli Amici di ${F[0]}`, `Il Circolo ${F[0]}`, `I Fedeli di ${F[0]}`];
    else if (k === 'l:') { const t = F[0].replace(/^(il|la|lo|l'|i|gli|le)\s?/i, ''); L = val < 0 ? [`Il Comitato contro ${F[0]}`, `Quelli che ce l'hanno con ${F[0]}`] : [`I Figli ${F[1]}`, `Gli Innamorati ${F[1]}`, `Quelli ${F[1]}`, `Il Comitato ${t} Bella`]; }
    else if (k === 'a:') { const a = SOGNO_N[s.slice(2)] || F[1]; L = ['La Società ' + a, 'I Devoti ' + a, 'Gli Osservatori ' + a, 'La Confraternita ' + a]; }
    else if (s === 'mare') L = ['I Lupi di Mare', 'La Confraternita del Pesce', `La Ciurma ${Q}`];
    else if (s === 'soldi') L = [`La Cassa Comune ${Q}`, 'Il Mutuo Soccorso', 'Quelli del Salvadanaio'];
    else if (k === 'g:') L = val < 0 ? [`L'Anti-${F[0].replace(/^(I|Gli|Il|La|Le|Lo|L')\s?/, '')}`, 'I Veri Duri'] : ['I Cugini', 'I Simpatizzanti'];
    else L = ['Il Gruppo'];
    const usati = new Set(S(st).L.concat(S(st).chiusi).map(g => g.nome));
    for (let i = 0; i < 8; i++) { const x = pick(L); if (!usati.has(x)) return x; }
    return pick(L) + ' ' + ['Bis', 'Nuovi', 'di Ritorno', 'Due'][S(st).n % 4];
  }

  // ======================= LA VITA DEI GRUPPI =======================
  // la nascita: chi ha un'idea forte sullo stesso soggetto (stesso segno), nello stesso quartiere, senza gruppo; ci vuole un fondatore
  function fonda(st, s0) {
    if (s0.L.length >= CFG.max) return;
    const B = {};
    for (const id in st.u.idee.per) {
      if (gruppoDi(st, id) || !libero(st, id) || !ME().mente(st, id)) continue; const n = npc(st, id), q = I.quartDi(st, n);
      for (const e of I.di(st, id)) { if (e[2] < .38 || Math.abs(e[1]) < .3) continue; const k = I.soggDi(e[0]) + (e[1] < 0 ? '-' : '+') + '@' + q; (B[k] = B[k] || []).push([id, e]); }
    }
    const keys = Object.keys(B).filter(k => B[k].length >= (k[0] === 'a' ? CFG.fonda - 1 : CFG.fonda)).sort((a, b) => B[b].length - B[a].length);
    for (const k of keys) {
      const L = B[k], f = L.map(([id]) => [id, T(st, id)]).sort((a, b) => (b[1].zelo + b[1].carisma) - (a[1].zelo + a[1].carisma))[0];
      if (f[1].zelo + f[1].carisma < .55 || rnd() > .5) continue;
      const s = k.slice(0, k.search(/[-+]@/)), val = k[s.length] === '-' ? -1 : 1, q = k.slice(k.indexOf('@') + 1);
      const g = { id: 'g' + (++s0.n), nome: nomina(st, s, val, q, f[0]), s, val, q, membri: L.map(x => x[0]).slice(0, 6), capo: f[0], cassa: 0, base: null, scala: 0, ob: null, rivali: [], t0: Math.round(st.t), tu: Math.round(st.t), forza: 1, calore: 0, imprese: 0, rep: 0, padre: null, fid: null };
      s0.L.push(g); stats.nati++;
      const fx = scrivi(st, 'gruppo_nato', [g.capo].concat(g.membri.filter(x => x !== g.capo)).slice(0, 4), { d: `${g.nome}: ${nome(st, g.capo)} e altri ${g.membri.length - 1} si sono messi insieme. ${I.frase(st, null, s, val < 0 ? 'rancore' : 'orgoglio').replace(/^Qualcuno/, 'Ce l\'hanno in comune:')}`, gruppo: g.id, quart: q, idea: s + '|' + (val < 0 ? 'rancore' : 'orgoglio'), part: g.membri.slice(0, 6) }, null, true);
      g.fid = fx ? fx.id : null;
      for (const id of g.membri) I.adotta(st, id, 'g:' + g.id, 'orgoglio', .6, .5, g.fid, false);
      rivalita(st, s0, g);
      return;   // uno per volta
    }
  }
  function rivalita(st, s0, g) {
    for (const h of s0.L) {
      if (h === g || g.rivali.includes(h.id)) continue;
      const contro = (h.s === g.s && h.val !== g.val) || g.s === 'g:' + h.id || h.s === 'g:' + g.id || (g.val < 0 && g.s.slice(0, 2) === 'p:' && h.membri.includes(g.s.slice(2))) || (h.val < 0 && h.s.slice(0, 2) === 'p:' && g.membri.includes(h.s.slice(2)));
      if (!contro) continue;
      g.rivali.push(h.id); h.rivali.push(g.id);
      scrivi(st, 'rivalita', [g.capo, h.capo], { d: `${g.nome} e ${h.nome}: non si possono vedere`, gruppo: g.id, con_gruppo: h.id }, null);
      for (const id of g.membri) I.adotta(st, id, 'g:' + h.id, 'disprezzo', -.5, .35, null, false);
      for (const id of h.membri) I.adotta(st, id, 'g:' + g.id, 'disprezzo', -.5, .35, null, false);
    }
  }
  const forteDi = (st, g, id) => { const e = I.di(st, id).find(x => I.soggDi(x[0]) === g.s && Math.sign(x[1]) === g.val); return e ? e[2] : 0; };
  function entra(st, g, id, causa, come) {
    if (g.membri.includes(id) || gruppoDi(st, id) || g.membri.length >= CFG.membriMax) return;
    g.membri.push(id); stats.entrati++; g.tu = Math.round(st.t);
    scrivi(st, 'entra_gruppo', [id, g.capo], { d: `${g.nome}: ${come === 'trascinato' ? nome(st, g.capo) + ' si è portato dietro ' + nome(st, id) : 'adesso c\'è anche ' + nome(st, id)}`, gruppo: g.id }, causa);
    I.adotta(st, id, 'g:' + g.id, 'orgoglio', .5, .45, causa, true);
  }
  function esce(st, s0, g, id, perche) {
    g.membri = g.membri.filter(x => x !== id); stats.usciti++;
    const v = s0.voglie[id]; if (v && v.gid === g.id) delete s0.voglie[id];
    if (perche) scrivi(st, 'lascia_gruppo', [id, g.capo], { d: `${nome(st, id)} ha lasciato ${g.nome}: ${perche}`, gruppo: g.id }, null);
  }
  function sciogli(st, s0, g, perche) {
    s0.L = s0.L.filter(x => x !== g); g.sciolto = Math.round(st.t); s0.chiusi.push(g); if (s0.chiusi.length > 40) s0.chiusi.shift(); stats.sciolti++;
    for (const id in s0.voglie) if (s0.voglie[id].gid === g.id) delete s0.voglie[id];
    scrivi(st, 'gruppo_sciolto', g.membri.concat(g.capo).slice(0, 4), { d: `${g.nome}: ${perche}`, gruppo: g.id }, g.fid, true);
  }
  // l'obiettivo collettivo: una voglia composta alla scala del gruppo, scelta dal capo col suo carattere e l'idea del gruppo
  function obiettivo(st, g) {
    const sog = [[g.s, g.val * .8, .9]];
    for (const r of g.rivali) sog.push(['g:' + r, -.7, .5]);
    for (const id of g.membri) { const n = npc(st, id); if (n && n.jailedUntil > st.t) sog.push(['p:' + id, .9, 1.1]); }   // un compagno dentro: liberarlo
    if (g.cassa < 6 && g.membri.length >= 3) sog.push(['soldi', -.5, .35]);
    const v = genera(st, g.capo, { scala: g.scala, gruppo: g, soggetti: sog }); if (!v) return;
    v.gid = g.id; v.need = 2 + g.membri.length + 2 * g.scala;
    const f = scrivi(st, 'obiettivo_gruppo', [g.capo].concat(g.membri.filter(x => x !== g.capo).slice(0, 2)), { d: `${g.nome}: ${nome(st, g.capo)} dice che bisogna ${inf(st, v)}${g.scala ? (g.scala === 2 ? ', in tutta la città' : ', in tutto il quartiere') : ''}`, gruppo: g.id, voglia: v.v, scala: g.scala, idea: g.s + '|' + (g.val < 0 ? 'rancore' : 'orgoglio') }, g.fid, true);
    g.ob = { v: v.v, b: v.b, s: v.s, val: v.val, need: v.need, prog: 0, ko: 0, t0: Math.round(st.t), fino: Math.round(st.t + 1440 * (1 + g.scala)), fid: f ? f.id : null, gid: g.id };
    stats.obiettivi++;
  }
  // i compiti: la voglia del gruppo ai membri liberi (il capo e gli zelanti la stessa; gli altri la voce, o la quota per la cassa)
  function assegna(st, s0, g) {
    if (!g.ob) return;
    for (const id of g.membri) {
      if (!libero(st, id) || s0.voglie[id]) continue; const t = T(st, id), r = rnd();
      let v = { v: g.ob.v, b: g.ob.b, s: g.ob.s, val: g.ob.val, gid: g.id };
      if (id !== g.capo && r > .45 + t.zelo * .4) v = g.cassa < 10 && r > .8 ? { v: 'presta', b: { k: 'persona', s: 'g:' + g.id }, s: 0, val: 1, gid: g.id } : { v: 'chiacchiera', b: { k: kindOf(g.s), s: g.s }, s: g.scala, val: g.val, gid: g.id };
      dai(st, id, v, 'gruppo:' + g.id, Math.min(g.ob.fino, st.t + CFG.voglia), .55 + t.zelo * .4);
    }
  }
  function impresa(st, s0, g) {
    g.imprese++; g.forza++; stats.imprese++;
    scrivi(st, 'impresa', [g.capo].concat(g.membri.filter(x => x !== g.capo).slice(0, 3)), { d: `${g.nome}: ce l'hanno fatta, ${inf(st, g.ob)}${g.scala ? (g.scala === 2 ? ' in mezza città' : ' per tutto il quartiere') : ''}`, gruppo: g.id, part: g.membri.slice(0, 6), voglia: g.ob.v, scala: g.scala }, g.ob.fid, true);
    for (const id in s0.voglie) if (s0.voglie[id].gid === g.id) delete s0.voglie[id];
    g.ob = null;
  }
  function cresce(st, g) {
    const P = I.pressione(st, g.q)[g.s], acceso = P && P[1] && Math.sign(P[0]) === g.val;
    const n = g.membri.length, sc0 = g.scala;
    if (g.scala === 0 && (n >= CFG.scala[0][0] && g.imprese >= 1 || acceso && n >= 4)) g.scala = 1;
    else if (g.scala === 1 && (n >= CFG.scala[1][0] && g.imprese >= 2 || g.rep >= 3 && n >= 6 || acceso && g.imprese >= 3)) g.scala = 2;
    if (g.scala !== sc0) scrivi(st, 'gruppo_cresce', [g.capo], { d: `${g.nome}: ormai ${g.scala === 2 ? 'se ne parla in tutta la città' : 'li conosce tutto ' + I.nomeQ(g.q, 0)}`, gruppo: g.id, scala: g.scala }, g.fid, true);
  }
  // la scissione: un rancore col capo, o un trascinatore che fa ombra, si porta via i suoi
  function scissione(st, s0, g) {
    if (g.membri.length < 6 || s0.L.length >= CFG.max) return;
    const F = FT(), tc = T(st, g.capo);
    for (const id of g.membri) {
      if (id === g.capo) continue; const t = T(st, id);
      const ranc = F.rancore(st, io(id), io(g.capo)), ombra = t.carisma > tc.carisma + .2 && rnd() < .2;
      if (ranc < .25 && !ombra) continue;
      const via = g.membri.filter(x => x !== g.capo && x !== id).filter(() => rnd() < .4).slice(0, 4).concat([id]);
      if (via.length < 3) continue;
      for (const x of via) esce(st, s0, g, x, null);
      const h = { id: 'g' + (++s0.n), nome: nomina(st, g.s, g.val, g.q, id), s: g.s, val: g.val, q: g.q, membri: via, capo: id, cassa: 0, base: null, scala: Math.max(0, g.scala - 1), ob: null, rivali: [g.id], t0: Math.round(st.t), tu: Math.round(st.t), forza: 1, calore: 0, imprese: 0, rep: 0, padre: g.id, fid: null };
      g.rivali.push(h.id); s0.L.push(h); stats.scissioni++;
      const f = scrivi(st, 'scissione', [id, g.capo].concat(via.filter(x => x !== id).slice(0, 2)), { d: `${h.nome}: ${nome(st, id)} ha rotto con ${nome(st, g.capo)} e se n'è andato da ${g.nome} con altri ${via.length - 1}`, gruppo: h.id, con_gruppo: g.id, part: via.slice(0, 6) }, g.fid, true);
      h.fid = f ? f.id : null;
      for (const x of via) I.adotta(st, x, 'g:' + g.id, 'disprezzo', -.6, .45, h.fid, false);
      return;
    }
  }
  // i Grigi: il calore del gruppo (quello che fa contro di loro, quanto è grande) → il fermo (Popolo.arrest), lo sgombero della base
  const ANTI = new Set(['dipinge_muro', 'barrica', 'tira_su', 'presidia', 'rivendica', 'struttura_chiesta', 'obiettivo_gruppo', 'impresa', 'come_facciamo']);
  function grigi(st, s0, g) {
    if (g.calore < CFG.calore.soglia || rnd() > .12 * g.calore) return;
    const L = g.membri.map(id => libero(st, id)).filter(Boolean); if (!L.length) return;
    const k = rnd() < .35 && libero(st, g.capo) ? npc(st, g.capo) : pick(L);
    const cop = st.npcs.find(n => n.grigio && !n.dead) || null;
    const UCx = UC(), C = g.base && UCx ? (st.u.costruire || { cantieri: [] }).cantieri.find(x => x.id === g.base.c && !x.chiuso) : null;
    if (C && rnd() < .5) {
      C.chiuso = true; stats.sgomberi++; g.rep++; g.calore = r2(g.calore * .4);
      scrivi(st, 'sgombero', [cop ? cop.id : null].concat(C.gruppo.slice(0, 4)).filter(Boolean), { d: `I Grigi hanno sgomberato ${C.tipo === 'baracca' ? 'la baracca' : 'la barricata'} ${g.nome.replace(/^(I|Gli|Il|La|Le|Lo|L')\s/, m => ({ 'I ': 'dei ', 'Gli ': 'degli ', 'Il ': 'del ', 'La ': 'della ', 'Le ': 'delle ', 'Lo ': 'dello ' }[m] || 'di '))} in ${C.via}`, cantiere: C.id, gruppo: g.id, part: C.gruppo.slice(0, 6) }, g.fid, true);
      g.base = null; return;
    }
    const why = `attività sovversiva (${g.nome})`, P = PO();
    try { if (P && P.arrest) P.arrest(st, k, why); else k.jailedUntil = st.t + 240; } catch (e) { k.jailedUntil = st.t + 240; }
    g.rep++; g.calore = r2(g.calore * .45); stats.repressioni++;
    scrivi(st, 'repressione', [cop ? cop.id : g.capo, k.id], { d: `${g.nome}: i Grigi hanno portato via ${nome(st, k.id)}`, gruppo: g.id, part: g.membri.filter(x => x !== k.id).slice(0, 6) }, g.fid, true);
  }
  function battitoGruppo(st, s0, g) {
    // chi non c'è più, chi non ci crede più, il vile dopo la repressione
    for (const id of g.membri.slice()) {
      if (!vivo(st, id)) { esce(st, s0, g, id, null); continue; }
      const t = T(st, id), f = forteDi(st, g, id) + (I.di(st, id).find(e => e[0].indexOf('g:' + g.id + '|') === 0) || [0, 0, 0])[2];
      if (f < .12 && id !== g.capo && rnd() < .5) esce(st, s0, g, id, 'non ci crede più');
      else if (g.rep && st.t - g.tu < 600 && t.vilta > .7 && rnd() < .3) esce(st, s0, g, id, 'ha paura dei Grigi');
    }
    if (g.membri.length < 2) return sciogli(st, s0, g, 'sono rimasti in pochi, si sono sciolti');
    if (st.t - g.tu > CFG.inattivo) return sciogli(st, s0, g, 'non si sono più visti');
    if (!g.membri.includes(g.capo) || !libero(st, g.capo)) {
      const n = g.membri.filter(id => libero(st, id)).map(id => [id, T(st, id)]).sort((a, b) => (b[1].carisma + b[1].zelo) - (a[1].carisma + a[1].zelo))[0];
      if (n && n[0] !== g.capo) { const vecchio = g.capo; g.capo = n[0]; scrivi(st, 'nuovo_capo', [g.capo, vecchio], { d: `${g.nome}: adesso comanda ${nome(st, g.capo)}`, gruppo: g.id }, g.fid); }
    }
    g.calore = r2(g.calore * Math.pow(CFG.calore.decad, CFG.battito / 1440));
    if (g.ob && (st.t > g.ob.fino || g.ob.ko >= Math.max(3, g.membri.length))) { scrivi(st, 'obiettivo_fallito', [g.capo], { d: `${g.nome}: niente da fare, non sono riusciti a ${inf(st, g.ob)}`, gruppo: g.id }, g.ob.fid); g.ob = null; }
    if (!g.ob && rnd() < .6) obiettivo(st, g);
    assegna(st, s0, g);
    cresce(st, g);
    scissione(st, s0, g);
    if (g.s === 'grigi' && g.val < 0 || g.scala === 2) grigi(st, s0, g);
  }

  // ======================= I FATTI NUOVI (dall'ascolto di unico_idee.js) =======================
  function ascolta(st, f, passata) {
    const s0 = S(st); if (!s0 || !f.chi) return;
    const a = io(f.chi);
    // il reclutamento: un membro che parla a chi la pensa uguale (o il trascinatore col credulone)
    if (f.v === 'chiacchiera' && f.con && f.con[0]) {
      const g = gruppoDi(st, a), b = io(f.con[0]);
      if (g && b && !gruppoDi(st, b) && libero(st, b) && ME().mente(st, b)) {
        const ta = T(st, a), tb = T(st, b);
        if (forteDi(st, g, b) >= .3) entra(st, g, b, f.id, 'idea');
        else if (ta.carisma > .6 && tb.credulo > .55 && rnd() < .25) { entra(st, g, b, f.id, 'trascinato'); I.adotta(st, b, g.s, g.val < 0 ? 'rancore' : 'orgoglio', g.val * .5, .4, f.id, true); }
      }
    }
    // il debitore alle strette: il rinfaccio coi soldi → la voglia «avere_soldi» (la strategia la sceglie lui)
    if (f.v === 'rinfacciato' && typeof f.soldi === 'number' && f.soldi && f.con && f.con[0]) {
      const b = io(f.con[0]); if (libero(st, b) && ME().mente(st, b) && !s0.voglie[b]) { dai(st, b, { v: 'arricchirsi', b: { k: 'persona', s: 'p:' + a }, s: 0, val: -1 }, 'debito', st.t + 720, .9); stats.debitori++; }
    }
    // il progresso: un fatto di chi ha una voglia, del tipo che la compie
    const v = s0.voglie[a];
    if (v && v.ft && v.ft.includes(f.v) && f.esito !== 'no') {
      delete s0.voglie[a];
      if (v.come || v.prova) esito(st, a, v, f);
      const g = v.gid ? s0.L.find(x => x.id === v.gid) : null;
      if (g) {
        g.tu = Math.round(st.t);
        if (v.v === 'presta' && f.v === 'prestito') { g.cassa += typeof f.soldi === 'number' ? Math.abs(f.soldi) : CFG.quota; stats.quote++; }
        if (g.ob && (v.v === g.ob.v || v.come)) { g.ob.prog++; if (g.ob.prog >= g.ob.need) impresa(st, s0, g); }
        else if (g.ob) g.ob.prog += .5;
      }
    }
    const g = gruppoDi(st, a);
    if (g && (ANTI.has(f.v) || f.v === 'dipinge_muro')) { g.tu = Math.round(st.t); if (g.s === 'grigi' && g.val < 0 || g.scala === 2) g.calore = r2(g.calore + .08 * (1 + g.scala) * (f.vis ? 1.3 : 1)); }
  }
  I.ascolta(ascolta);

  // ======================= I CAPRICCI (il rumore) =======================
  function capricci(st, s0) {
    const g0 = Math.floor(st.t / 1440); if (s0.bud.g !== g0) { s0.bud.g = g0; s0.bud.n = 0; s0.bud.c = 0; }
    for (const id in st.u.menti) {
      if (s0.bud.c >= CFG.capricciGiorno) return;
      if (s0.voglie[id] || !libero(st, id)) continue; const t = T(st, id);
      if (rnd() > CFG.capriccio[0] + CFG.capriccio[1] * t.follia * t.follia) continue;
      const v = genera(st, id, { folle: true, scala: 0 }); if (!v) continue;
      s0.bud.c++; stats.capricci++;
      dai(st, id, v, 'capriccio', st.t + 150, .75 + t.follia * .5);
      scrivi(st, 'capriccio', id, { d: `A ${nome(st, id)} è preso il ghiribizzo di ${inf(st, v)}`, voglia: v.v, idea: v.b.s + '|curiosita' }, null);
    }
  }

  // ======================= LA FASE =======================
  function fase(st) {
    const s0 = S(st); if (!s0 || !st.npcs || !st.u.idee || !st.u.menti || st.t < s0.prossimo) return;
    const a = now(); s0.prossimo = Math.round(st.t + CFG.battito); stats.battiti++;
    for (const id in s0.voglie) if (s0.voglie[id].fino < st.t) delete s0.voglie[id];
    for (const g of s0.L.slice()) battitoGruppo(st, s0, g);
    if (st.t - s0.ora >= CFG.ora) { s0.ora = st.t; fonda(st, s0); capricci(st, s0); }
    const ms = now() - a; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
  }
  Un().fase('unico.gruppi', { dopo: 'unico.idee', budget: { p95: .03 } }, fase);
  if (Un().nasce) Un().nasce('gruppi', st => { S(st); });
  // le spinte dei gruppi nella Mente: chi ha un compito lo sente di più se è zelante (a catena con regista e idee)
  { const Mi = ME().innesti, prima = Mi.spinta; Mi.spinta = (st, id) => { const v = voglia(st, id), a = prima ? prima(st, id) : null; if (!v) return a; const t = T(st, id); return I.unisci(a, { militare: r2(clamp(1 + t.zelo * .4 + t.follia * .2, 1, 1.6)), $max: 1.6 }); }; }

  // ======================= IL REGISTA: idee, gruppi e pressione come fili =======================
  const R = RG();
  if (R && R.FAMIGLIE && R.TIPI_FILO) {
    Object.assign(R.FAMIGLIE, {
      idea: { domanda: 'l\'idea attecchisce?', finestra: 1440, base: .12, spinte: { portatore: ['socializzare', 1.4] }, calma: { portatore: ['socializzare', .8] },
        titolo: '{cosa_d}', fine: { sfumato: '{cosa_d}: non ci pensa più nessuno' } },
      gruppo: { domanda: 'il gruppo regge?', finestra: 2880, base: .3, chiave: 'x.gruppo', spinte: { capo: ['militare', 1.5], membro: ['militare', 1.35] }, calma: { capo: ['militare', .65] },
        titolo: '{cosa_d}', fine: { impresa: '{cosa_d}: ce l\'hanno fatta', sciolto: '{cosa_d}: il gruppo non c\'è più', sfumato: '{cosa_d}: non se ne sente più parlare' } },
      rivolta: { domanda: 'la pressione esplode?', finestra: 2880, base: .35, chiave: 'x.quart', spinte: { capopopolo: ['militare', 1.5], voce: ['socializzare', 1.45] }, calma: { capopopolo: ['militare', .6], voce: ['socializzare', .8] },
        titolo: '{cosa_d}', fine: { sbollita: '{cosa_d}: poi si è calmato tutto', sfumato: '{cosa_d}: è rimasto un brontolio' } },
    });
    const R_ = (fam, m, r, o) => Object.assign({ fam, m, r }, o || {}), T_ = R.TIPI_FILO;
    if (R.ROUTINE) R.ROUTINE.add('idea');   // le idee nate entrano in un filo solo per causa (sono tante: sarebbero rumore)
    for (const t of ['vuole', 'capriccio', 'prodigio', 'equivoco', 'riuscito', 'comica']) T_[t] = (T_[t] || []).concat([R_('idea', 'apre', { portatore: 'chi' })]);
    for (const t of ['gruppo_nato', 'obiettivo_gruppo', 'entra_gruppo', 'lascia_gruppo', 'nuovo_capo', 'come_facciamo', 'struttura_chiesta', 'gruppo_cresce', 'repressione', 'scissione', 'rivalita', 'obiettivo_fallito'])
      T_[t] = [R_('gruppo', 'apre', { capo: 'chi', membro: 'con0' })];
    T_.impresa = [R_('gruppo', 'chiude', { capo: 'chi' }, { esito: 'impresa' })]; T_.gruppo_sciolto = [R_('gruppo', 'chiude', { capo: 'chi' }, { esito: 'sciolto' })];
    T_.pressione = [R_('rivolta', 'apre', { capopopolo: 'chi', voce: 'con0' })]; T_.pressione_cala = [R_('rivolta', 'chiude', { capopopolo: 'chi' }, { esito: 'sbollita' })];
    Object.assign(R.GT, { repressione: .6, fermato: .45, multa: .2, pressione: .4, pressione_cala: -.2, scissione: .35, gruppo_nato: .15, impresa: .25, obiettivo_gruppo: .15, vuole: .05, capriccio: .06, prodigio: .1, idea: .03, entra_gruppo: .05, come_facciamo: .1, comica: .12, riuscito: .08, rivalita: .3, struttura_chiesta: .2, gruppo_sciolto: -.1 });
    try { R.problemi = R.controlla(); } catch (e) { }
  }

  // ======================= I SEGNI =======================
  const Sg = SG();
  if (Sg && Sg.TIPI) Object.assign(Sg.TIPI, {
    gruppo_nato: { p: 'stretta', gz: .8, n: ['gruppo nuovo', 'gruppi nuovi'] }, entra_gruppo: { p: 'stretta', gz: .3, n: ['nuovo membro', 'nuovi membri'] },
    lascia_gruppo: { p: 'piede', gz: .25, n: ['uscita da un gruppo', 'uscite dai gruppi'], bolla: false }, gruppo_sciolto: { p: 'piede', gz: .5, n: ['gruppo sciolto', 'gruppi sciolti'], bolla: false },
    obiettivo_gruppo: { p: 'esclamativo', gz: .6, n: ['proposito', 'propositi'] }, obiettivo_fallito: { p: 'fumetto', gz: .3, n: ['proposito mancato', 'propositi mancati'], bolla: false },
    impresa: { p: 'esclamativo', gz: .9, n: ['impresa', 'imprese'] }, gruppo_cresce: { p: 'esclamativo', gz: .6, n: ['gruppo che cresce', 'gruppi che crescono'], bolla: false },
    nuovo_capo: { p: 'stretta', gz: .4, n: ['capo nuovo', 'capi nuovi'], bolla: false }, scissione: { p: 'frecce', gz: .7, n: ['scissione', 'scissioni'] }, rivalita: { p: 'muso', gz: .5, n: ['rivalità', 'rivalità'] },
    repressione: { p: 'esclamativo', gz: .9, n: ['retata', 'retate'] }, sgombero: { p: 'piede', gz: .85, n: ['sgombero', 'sgomberi'] },
    vuole: { p: 'fumetto', gz: .35, n: ['voglia', 'voglie'] }, capriccio: { p: 'fumetto', gz: .3, n: ['ghiribizzo', 'ghiribizzi'] }, come_facciamo: { p: 'fumetto', gz: .45, n: ['pensata', 'pensate'] },
    riuscito: { p: 'esclamativo', gz: .75, n: ['impresa riuscita', 'imprese riuscite'] }, comica: { p: 'esclamativo', gz: .7, n: ['figuraccia', 'figuracce'] },
    equivoco: { p: 'frecce', gz: .2, n: ['equivoco', 'equivoci'] }, struttura_chiesta: { p: 'martello', gz: .5, n: ['cantiere nuovo', 'cantieri nuovi'] },
  });
  const Fg = FT().GRAV; if (Fg) Object.assign(Fg, { gruppo_nato: .6, entra_gruppo: .35, lascia_gruppo: .3, gruppo_sciolto: .45, obiettivo_gruppo: .5, impresa: .7, gruppo_cresce: .5, nuovo_capo: .4, scissione: .6, rivalita: .5, repressione: .9, sgombero: .85, vuole: .35, capriccio: .3, come_facciamo: .4, equivoco: .25, struttura_chiesta: .5, obiettivo_fallito: .35, riuscito: .6, comica: .55 });

  // ======================= LA SCHEDA «GRUPPI» DEL TACCUINO =======================
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SCALA = ['la strada', 'il quartiere', 'la città'];
  function sa(st, g) { if (DEBUG) return true; const F = FT(); for (const id of [g.fid, g.ob && g.ob.fid]) { const f = id && F.di(st, id); if (f && f.vis) return true; } const T0 = st.u.taccuino && st.u.taccuino.sentite; if (T0) for (const id of T0.slice(-30)) { const h = F.di(st, id), d = h && F.di(st, h.x && h.x.di !== undefined ? +h.x.di : h.causa); if (d && d.x && d.x.gruppo === g.id) return true; } return false; }
  function html(st) {
    const s0 = S(st); if (!s0) return '';
    const L = s0.L.filter(g => sa(st, g));
    let h = '<p class="hint">I gruppi che si sono formati in paese, che cosa vogliono e le idee che girano.</p><h4>Gruppi</h4><ul>';
    h += L.length ? L.map(g => `<li><b>${esc(g.nome)}</b> · <small>${g.membri.length} · capo ${esc(nome(st, g.capo))} · ${esc(SCALA[g.scala])}${g.base ? ' · base in ' + esc(g.base.via) : ''}${g.rivali.length ? ' · rivali: ' + esc(g.rivali.map(r => (gDi(st, r) || {}).nome).filter(Boolean).join(', ')) : ''}</small><br><small>${esc(I.frase(st, null, g.s, g.val < 0 ? 'rancore' : 'orgoglio').replace(/^Qualcuno/, 'Ce l\'hanno:'))}${g.ob ? ' · vogliono ' + esc(inf(st, g.ob)) : ''}${DEBUG ? ' · cassa ' + g.cassa + ' · calore ' + g.calore + ' · imprese ' + g.imprese + ' · ob ' + (g.ob ? g.ob.prog + '/' + g.ob.need : '-') : ''}</small></li>`).join('') : '<li><span style="opacity:.7">Nessuno, che tu sappia.</span></li>';
    h += '</ul><h4>Le idee che girano</h4><ul>' + I.top(st, 8).map(x => `<li>${esc(I.testo(st, null, x[0]).replace(/^Qualcuno /, ''))} <small>(${x[1]})</small></li>`).join('') + '</ul>';
    const Q = []; for (const q in st.u.idee.q) for (const s in st.u.idee.q[q]) if (st.u.idee.q[q][s][1]) Q.push(`${cap1(I.nomeQ(q, 3))}: ${st.u.idee.q[q][s][0] < 0 ? 'ce l\'hanno con' : 'vanno fieri di'} ${I.nomeS(st, s)}`);
    if (Q.length) h += '<h4>Aria di quartiere</h4><ul>' + Q.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>';
    if (DEBUG) h += '<h4>Voglie senza verbo (mancanti)</h4><p><small>' + esc(mancanti(st, 20).map(x => x[0] + ' ×' + x[1]).join(' · ')) + '</small></p>';
    return h;
  }
  if (Sg && Sg.scheda) Sg.scheda('u_gruppi', 'Gruppi', html);

  // ======================= LE LETTURE =======================
  function mancanti(st, n) { const s0 = S(st); return s0 ? Object.entries(s0.mancanti).sort((a, b) => b[1] - a[1]).slice(0, n || 20) : []; }
  Object.assign(UG, { S, genera, dai, vuole, compito, fonda, obiettivo, assegna, grigi, ascolta, capricci, fase, html, mancanti, voglia, gruppoDi, gDi, EFFETTI, kindOf });
  Un().Gruppi = UG;
  return UG;
})();
if (typeof window !== 'undefined') window.UnicoGruppi = UnicoGruppi;
