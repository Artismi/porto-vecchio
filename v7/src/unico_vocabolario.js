/* [unico] unico_vocabolario.js: IL VOCABOLARIO GRANDE, primo lotto (progetto: commedia/REGISTA_E_VOCABOLARIO.md §B.1-B.4, T.1;
   commedia/MONDO_PIENO.md §2, §7, §9). Dietro ?commedia. Spento il flag: UnicoVocabolario = { ON: false } e nient'altro.

   La critica della direzione artistica: quasi tutti i desideri finiscono in rinuncia perché mancano i verbi (manifestare, radunarsi,
   rubare, coltivare, spacciare, arrampicarsi…). Qui il vocabolario diventa DATI: una CARTA per verbo (la tabella CARTE più sotto), e un
   compilatore che ne fa una scheda di Verbo (unico_verbi.js resta il motore: Verbo.registra, la stessa porta Verbo.fai per tutti).

   LA CARTA (solo dati, più qualche funzione pura dove il dato non basta):
     f      la famiglia (corpo, oggetti, luoghi, sociali, economia, lavoro, conflitto, citta, circo, muri)
     chi    'persona' se il verbo ha un bersaglio (a.chi); dove: la classe di posto (LUOGHI: acqua, chiesa, bar, piazza, terra, alto,
            tetto (le scale di Tetti), casa, casa_altrui, bottega, banca, mezzo, qui…): la meta del passo «va» e la condizione «sei lì»
     serve  le cose che servono (la prima che c'è), opz: si può anche senza (riesce meno); usa: la cosa si consuma
     pre    i termini in più (v:soldi, v:ora, v:pochi, v:lavoro, v:gruppo, v:k…); puo(st, A, a, d): la condizione che il dato non dice
     eff    gli ATOMI degli effetti sulle variabili del mondo (soldi, roba, bis:<bisogno>, quota, pubblico, rep, repchi, affetto, pace,
            ruba, ricetta, spaccia, orto, mutuo, sussidio, cappello, trova, fede, raduna, grigi, mestiere, social, casafai…): ogni atomo è
            un termine 'v:…' di Verbo.EFF e una riga di UnicoDesideri.EFFV, così la ricerca all'indietro dei desideri li trova da sola
     min    la durata (minuti di gioco); p: la probabilità di riuscire; comico: quanto la caduta è comica invece che a metà
     modi   le DECLINAZIONI ammesse (MODI: di_nascosto, in_pubblico, per_scherzo, con_rabbia, con_garbo, in_gruppo, maldestro, teatrale):
            cambiano la riuscita, i testimoni e la pubblicità del fatto, le relazioni, il rischio coi Grigi, la parola della bolla
     posa, pitto, w, ono   il segno: la posa che c'è (anim_vita), il pittogramma della bolla, la parola, l'onomatopea della riuscita
     g      il GUASTO della comica (la tavola UnicoCose.GUASTI: cade, si_sporca, si_bagna, scappa_via, monete, figuraccia, scoperto…)
     fatto  il tipo del fatto (di solito il verbo); d: la frase al passato per Lingua ({A} {B} {cosa} {cosaI} {lire} {luogo});
            inf: l'infinito (per «voleva …»); gz: il peso nella Gazzetta; n: il nome per contare [uno, tanti]
     filo   le righe di Regista.TIPI_FILO (famiglia, apre|avanza|chiude, ruoli); offesa: la riga di Fatto.OFFESE (il rancore);
            idee: le righe di UnicoIdee.DA_FATTI (le idee che nascono in chi c'era)
     ob     gli obiettivi della Mente in cui il verbo è un metodo (divertirsi, socializzare, guadagnare, vendicarsi, pregare…)
     ill    illegale (i Grigi: l'atomo grigi); heat: quanto scotta
     da     da quale catalogo vecchio viene (azioni, risacca, mestieri, casa, eventi, iniziative): i verbi che c'erano solo per il giocatore
            o dentro un modulo entrano nel registro chiamando le loro funzioni (strategia A: Mestieri.perform, Azioni.social, Casa.fai)
   Ogni verbo finisce in modo CONCRETO: riuscito (ok), a metà (meta) o in una comica (il guasto vero della tavola, col suo fatto), con
   il segno (bolla, posa, onomatopea, Cronaca, Gazzetta, Si dice dal campo d).

   I TERMINI NUOVI si registrano da soli: EFFV per i desideri, DELTA (le differenze che fanno nascere voglie), Segni.TIPI, Fatto.GRAV e
   OFFESE, UnicoIdee.DA_FATTI, Regista.TIPI_FILO e FAMIGLIE (protesta, traffico, orto, impresa, amore, fede, sfida), i metodi della
   Mente, le espansioni dei verbi sognati dei gruppi (UnicoGruppi.VERBI e i mezzi di EFFETTI). In più: «andare in un posto» è sempre un
   mezzo (la legatura vai dei desideri non si arrende più sulla distanza), e le variabili quota, casa, pubblico, velocita, orto, fede
   leggono anche quello che questi verbi lasciano nel mondo.
   Lo stato in st.u.voc, solo dati. Il caso dal flusso 'vocab'. */
var UnicoVocabolario = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UV = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UV;
  if (!ON) return UV;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const VB = () => (typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null);
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const AT = () => (typeof Attore !== 'undefined' && Attore.ON ? Attore : null);
  const CO = () => (typeof UnicoCose !== 'undefined' && UnicoCose.ON ? UnicoCose : null);
  if (!G || !Un() || !VB() || !FT() || !AT() || !CO()) { UV.ON = false; return UV; }
  const UD = () => (typeof UnicoDesideri !== 'undefined' && UnicoDesideri.ON ? UnicoDesideri : null);
  const GR = () => (typeof UnicoGruppi !== 'undefined' && UnicoGruppi.ON ? UnicoGruppi : null);
  const ID = () => (typeof UnicoIdee !== 'undefined' && UnicoIdee.ON ? UnicoIdee : null);
  const RI = () => (typeof UnicoRissa !== 'undefined' && UnicoRissa.ON ? UnicoRissa : null);
  const RG = () => (typeof Regista !== 'undefined' && Regista.ON ? Regista : null);
  const SG = () => (typeof Segni !== 'undefined' && Segni.ON ? Segni : null);
  const LG = () => (typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null);
  const ME = () => { const M = (typeof Unico !== 'undefined' && Unico.Mente) || (typeof MenteUnica !== 'undefined' ? MenteUnica : null); return M && M.ON ? M : null; };
  const PO = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const AZ = () => (typeof Azioni !== 'undefined' ? Azioni : null);
  const MS = () => (typeof Mestieri !== 'undefined' && Mestieri.perform ? Mestieri : null);
  const CS = () => (typeof Casa !== 'undefined' && Casa.ON !== false && Casa.fai ? Casa : null);
  const SO = () => (typeof Soldi !== 'undefined' && Soldi.S ? Soldi : null);
  const TT = () => (typeof Tetti !== 'undefined' && Tetti.LADDERS ? Tetti : null);
  const EC = () => (typeof Economia !== 'undefined' && Economia.eco ? Economia : null);
  const OG = () => (typeof Oggetti !== 'undefined' ? Oggetti : null);
  const V = VB();
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
  const rnd = () => Un().flusso('vocab');
  const pick = L => L[Math.floor(rnd() * L.length) % L.length];
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const io = id => (id === 'player' ? 'nino' : id == null ? null : String(id));
  const hashS = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const CFG = UV.CFG = { qui: 12, persona: 2.6, testR: 10, nascostoR: 4, grigioR: 26, raduno: 80, radunoMax: 4, ortoGiorni: 2, ortoSecco: 2.5, altoMin: 45, famaGiorni: 1, menu: 4, metodoProve: 3, lontanoMax: 650, mutuoGiorni: 7, sussidioGiorni: 7 };
  const stats = UV.stats = { fai: 0, ok: 0, meta: 0, comico: 0, no: 0, per: {}, modi: {}, scoperti: 0, fermati: 0, multe: 0, radunati: 0, metodi: 0, legati: 0, guasti: 0, ms: 0, msMax: 0 };
  const npc = (st, id) => (id === 'nino' || id === 'player' ? st.player : G.byId ? G.byId(st, id) : null);
  const nome = (st, id) => CO()._.nome(st, id);
  const isP = (st, A) => !!A && A.o === st.player;
  const art = (k, f) => { const L = LG(); let s0 = String(k); try { s0 = L ? L.art(k, f || 'det') : String(k); } catch (e) { s0 = String(k); }
    if (s0.indexOf('_') >= 0) { const C0 = typeof Oggetti !== 'undefined' && Oggetti.CAT && Oggetti.CAT[k], nm = (C0 && (C0.nome || C0.name)) || String(k).replace(/_/g, ' '); try { s0 = L ? L.art(nm, f || 'det') : nm; } catch (e) { s0 = nm; } }
    return s0; };
  const lire = x => { const L = LG(); return L && L.soldi ? L.soldi(x) : `${r1(x)}.000 lire`; };
  const vivo = n => !!n && !n.dead && !n.gone;

  // ======================= LO STATO (solo dati) =======================
  function S(st) {
    const u = st && st.u; if (!u) return null;
    return u.voc || (u.voc = { v: 1, orti: [], alto: {}, occupa: {}, fede: {}, fama: {}, mutui: {}, sussidi: {}, coppie: {}, mezzi: {}, raduni: [], scioperi: {}, addestrati: {}, ult: {}, n: 0 });
  }

  // ======================= I POSTI PER CLASSE (dai dati di Game.PLACES) =======================
  const RE = (re, extra) => k => re.test(k) || (extra || []).includes(k);
  const SOFT = () => (AZ() && AZ().SOFT) || [], HIDDEN = () => (AZ() && AZ().HIDDEN) || [];
  const LUOGHI_D = {
    acqua: RE(/^(molo|pontile|caletta|punta|marina|calata|scalo|molo_levante|lanterna)$|^pesca_|^scogli_\d+$/),
    spiaggia: RE(/^bagno_\d+$|^spiaggia(_lunga)?$|^caletta$/),
    scogli: RE(/^scogli_\d+$|^punta$/),
    chiesa: ['chiesa', 'chiesa_sg', 'santuario', 'eremo', 'vecchio_3'],
    bar: ['bar', 'sirena', 'osteria', 'osteria_sg', 'car_2', 'casa_168', 'casa_114', 'chiosco'],
    piazza: ['piazza', 'fontana', 'calata', 'piazzetta', 'lungomare', 'passeggiata', 'giardini', 'fiori', 'molo'],
    regime: ['piazza_gov', 'governo', 'garante', 'ministero', 'commissariato'],
    uffici: ['garante', 'archivio', 'governo'],
    commissariato: ['commissariato'],
    terra: () => SOFT().concat(['giardini', 'vigne', 'oliveto', 'radura', 'campeggio_o', 'collina_o']),
    discarica: ['discarica'],
    alto: ['faro', 'lanterna', 'belvedere', 'vetta', 'osservatorio', 'pizzo', 'monte'],
    nascosto: () => HIDDEN().concat(['magazzino', 'ruderi', 'grotta', 'vico']),
    muro: ['vico', 'caruggio', 'piazzetta', 'calata', 'piazza', 'lungomare', 'salita', 'passeggiata', 'fontana', 'molo'],
    notte: ['flipper', 'disco', 'lungomare', 'sirena', 'vico'],
    porto: ['calata', 'molo', 'marina', 'scalo', 'molo_levante', 'pontile'],
    rifugio: ['rudere_o', 'vecchio_2', 'ovile_b', 'ovile', 'casotto', 'ruderi', 'grotta', 'baracche_palme', 'paese_vecchio', 'romito'],
    mercato: ['piazza', 'fiori', 'calata'],
    bosco: ['pineta', 'radura', 'sugheri', 'macchia', 'bosco_antico'],
    lotto: ['casa_143', 'casa_170', 'bar'],
    lavatoio: ['fontana', 'sorgente', 'cascata', 'molo', 'caletta'],
    cassonetto: ['discarica', 'calata', 'vico', 'caruggio'],
    recinto: ['muro', 'varco', 'cantiere', 'magazzino', 'scalo'],
    ricettatore: ['magazzino', 'discarica', 'vico', 'flipper'],
    protesta: ['piazza', 'piazza_gov', 'fontana', 'calata', 'commissariato', 'garante'],
    campanile: ['chiesa', 'chiesa_sg', 'santuario'],
    scuola: ['casa_164', 'biblioteca', 'cultura'],
    cantiere: ['cantiere', 'scalo', 'magazzino'],
  };
  const LUOGHI = {};
  function luoghi(cl) {
    if (LUOGHI[cl]) return LUOGHI[cl]; const P = G.PLACES || {}, D = LUOGHI_D[cl]; if (!D) return (LUOGHI[cl] = []);
    let L; if (Array.isArray(D)) L = D; else if (D.length === 1) L = Object.keys(P).filter(D); else L = D();
    return (LUOGHI[cl] = Array.from(new Set(L)).filter(k => P[k] && typeof P[k].x === 'number'));
  }
  const nomeP = k => { const P = G.PLACES && G.PLACES[k]; return P ? P.name : null; };
  const aP = k => { const n = nomeP(k); if (!n) return ''; if (/^(In|Sul|Sulla|Al|Alla|Nel|Nella|Sotto) /.test(n)) return n[0].toLowerCase() + n.slice(1); const L = LG(); try { return L ? L.art(n, 'a') : 'a ' + n; } catch (e) { return 'a ' + n; } };
  // il posto più vicino della classe; con a.posto, quello (se è della classe). Deterministico: lo stesso per tutta la chiamata
  function postoDi(A, cl, a) {
    const L = luoghi(cl); if (!L.length) return null; const P = G.PLACES;
    if (a && a.posto && L.includes(a.posto)) return a.posto;
    let best = null, bd = 1e12; for (const k of L) { const d = hyp(P[k].x - A.x, P[k].y - A.y); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  // le mete speciali: la scala di un tetto, la casa (mia, di un altro), la bottega, la banca, un mezzo parcheggiato
  function scalaVicina(A, r) {
    const T = TT(); if (!T) return null; let best = null, bd = r || 160;
    for (const L of T.LADDERS) { if (L.footB >= 0 || L.camm) continue; const d = hyp(L.x - A.x, L.y - A.y); if (d < bd) { bd = d; best = L; } }
    return best;
  }
  function bottegaVicina(st, A, k) {
    const E = EC() && EC().eco(st); if (!E) return null; if (k != null && E.shops[k]) return E.shops[k];
    let best = null, bd = 160; for (const q in E.shops) { const Sh = E.shops[q]; if (!Sh.t || Sh.market) continue; const d = hyp(Sh.t.x - A.x, Sh.t.y - A.y); if (d < bd) { bd = d; best = Sh; } }
    return best;
  }
  function casaAltrui(st, A, a, piena) {
    if (a && a.vitt) { const k = npc(st, a.vitt); if (k && k.pop && k.pop.homeT) return k; }
    const mia = A.o && A.o.pop && A.o.pop.homeT; let best = null, bd = 140;
    for (const k of st.npcs) { if (!vivo(k) || !k.pop || !k.pop.homeT || k === A.o) continue; const h = k.pop.homeT; if (mia && h.bi === mia.bi) continue; if ((hyp(k.x - h.x, k.y - h.y) < 10) !== !!piena) continue;   // lo scasso: il padrone fuori; la serenata, la visita: il padrone in casa
      const d = hyp(h.x - A.x, h.y - A.y); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  function mezzoVicino(st, A, a) {
    const L = st.vehicles || []; let best = null, bd = 140;
    for (const v of L) { if (!v || v.hidden || v.wreck || v.traffic || v.rider || v.driver || !v.owner || v.owner === A.id || (a && a.mezzo != null && v.id !== a.mezzo)) continue; const d = hyp(v.x - A.x, v.y - A.y); if (d < bd) { bd = d; best = v; } }
    return best;
  }
  // la meta di una carta: { x, y, posto?, bi?, vitt?, bott?, mezzo?, scala? }
  function metaDi(st, A, K, a) {
    const D = K.dove;
    if (!D || D === 'qui') return { x: A.x, y: A.y };
    if (D === 'tetto') { const L = scalaVicina(A); return L ? { x: L.x, y: L.y, bi: L.bi, scala: L.i } : null; }
    if (D === 'casa') { const h = A.o && A.o.pop ? A.o.pop.homeT : null; const c = A.casa; return h ? { x: h.x, y: h.y, bi: h.bi } : c ? { x: c.x, y: c.y, bi: c.bi } : null; }
    if (D === 'casa_altrui') { const k = casaAltrui(st, A, a, K.piena); return k ? { x: k.pop.homeT.x, y: k.pop.homeT.y, bi: k.pop.homeT.bi, vitt: k.id } : null; }
    if (D === 'bottega') { const Sh = bottegaVicina(st, A, a && a.bott); return Sh ? { x: Sh.t.x, y: Sh.t.y, bott: Sh.k, label: Sh.label } : null; }
    if (D === 'banca') { const So = SO(); let t = null; try { t = So && So.bankT ? So.bankT(st) : null; } catch (e) { t = null; } return t ? { x: t.x, y: t.y, bi: t.bi, label: t.label } : null; }
    if (D === 'lavoro') { const So = typeof UnicoSociali !== 'undefined' && UnicoSociali.ON ? UnicoSociali : null, t = So ? So.postoLavoro(st, A) : null; return t ? { x: t.x, y: t.y, bi: t.bi, label: t.label } : null; }
    if (D === 'mezzo') { const v = mezzoVicino(st, A, a); return v ? { x: v.x, y: v.y, mezzo: v.id, vitt: v.owner } : null; }
    const k = postoDi(A, D, a); if (!k) return null; const P = G.PLACES[k];
    return { x: P.x, y: P.y, posto: k };
  }

  // ======================= I MODI (le declinazioni, §B.3) =======================
  const MODI = UV.MODI = {
    normale: { p: 0, avv: '' },
    di_nascosto: { p: -.05, pochi: true, pub: .3, grigi: .4, rel: 1, w: 'zitto zitto', avv: 'di nascosto' },
    in_pubblico: { p: 0, pub: 2, grigi: 1.6, rel: 1.2, w: 'guardate!', avv: 'davanti a tutti' },
    per_scherzo: { p: .05, pub: 1.2, rel: .5, w: 'hihi', avv: 'per scherzo' },
    con_rabbia: { p: -.05, comico: .1, rel: 1.5, w: 'basta!', avv: 'con rabbia', ono: 'SBAM' },
    con_garbo: { p: .08, pub: .8, rel: 1.3, w: 'piano…', avv: 'con garbo' },
    in_gruppo: { p: .15, pub: 1.5, grigi: 1.3, rel: 1, w: 'tutti!', avv: 'insieme agli altri' },
    maldestro: { p: -.35, comico: .35, w: 'ops', avv: 'in modo maldestro' },
    teatrale: { p: -.05, pub: 2.2, grigi: 1.2, w: 'oplà!', avv: 'con gran teatro' },
  };
  const tratti = (st, id) => { const I = ID(); return (I && I.tratti(st, id)) || { follia: 0, zelo: .1, vilta: .5, carisma: .3 }; };
  const carDi = (st, id) => { const M = ME() && ME().mente(st, id); return (M && M.carattere) || {}; };
  // il modo: quello chiesto (se la carta lo ammette), se no dal carattere; deterministico nell'ora (lo stesso in puo e in compi)
  function modoDi(st, A, K, a) {
    const M = K.modi || []; if (a && a.modo && (a.modo === 'normale' || M.includes(a.modo))) return a.modo;
    if (!M.length || isP(st, A)) return 'normale';
    const h = (hashS(A.id + '|' + K.k + '|' + Math.floor(st.t / 60)) % 1000) / 1000, t = tratti(st, A.id), k = carDi(st, A.id), n = A.o, tr = (n && n.tr) || {}, B = A.bisogni || {};
    const cand = [];
    if (M.includes('di_nascosto') && (K.ill || K.offesa)) cand.push(['di_nascosto', .3 + (1 - (tr.legge === undefined ? .5 : tr.legge)) * .4 + t.vilta * .2]);
    if (M.includes('in_pubblico')) cand.push(['in_pubblico', (k.teatrale || 0) * .7 + (k.orgoglio || 0) * .2]);
    if (M.includes('teatrale')) cand.push(['teatrale', (k.teatrale || 0) * .6 + t.follia * .5 - .1]);
    if (M.includes('con_rabbia')) cand.push(['con_rabbia', (B.rabbia || 0) * .9]);
    if (M.includes('per_scherzo')) cand.push(['per_scherzo', t.follia * .6 + (k.loq || 0) * .2 - .05]);
    if (M.includes('con_garbo')) cand.push(['con_garbo', (k.generoso || 0) * .5 + (1 - (k.rancore || 0)) * .2]);
    if (M.includes('in_gruppo') && GR() && GR().gruppoDi(st, A.id)) cand.push(['in_gruppo', .45 + t.zelo * .3]);
    if (M.includes('maldestro')) cand.push(['maldestro', .05 + t.follia * .35]);
    let best = 'normale', bv = .32 + h * .25;
    for (const [m, w] of cand) if (w > bv) { bv = w; best = m; }
    return best;
  }

  // ======================= LE CONDIZIONI NUOVE (pure: '' oppure il perché) =======================
  const C_ = c => CARTE[c.v];
  const testimoni = (st, x, y, escl, r) => { const out = []; for (const k of st.npcs) { if (!vivo(k) || k.inside || !k.pop || escl.includes(k.id)) continue; if (Math.abs(k.x - x) > r || Math.abs(k.y - y) > r) continue; if (hyp(k.x - x, k.y - y) <= r) out.push(k.id); if (out.length > 12) break; } return out; };
  const grigioVicino = (st, x, y, r) => { for (const k of st.npcs) if ((k.cop || k.grigio) && vivo(k) && !k.inside && Math.abs(k.x - x) < r && Math.abs(k.y - y) < r) return k; return null; };
  const chiSono = (st, A) => (isP(st, A) ? 'Non hai' : A.nome + ' non ha');
  Object.assign(V.COND, {
    'v:qui': (c, r) => {
      const K = C_(c); if (!K || !K.dove || K.dove === 'qui') return '';
      if (typeof c.d.x !== 'number') return K.nessuno || 'Qui intorno non c\'è un posto adatto.';
      if (K.dove === 'casa' || K.dove === 'lavoro') { const d = c.A.dove; if (d.k === 'dentro' && c.d.bi !== undefined && d.b === c.d.bi) return ''; const l = V.lodDi ? V.lodDi(c.st, c.A) : 'scena'; if (d.k === 'dentro' && l !== 'scena') return ''; }
      // il posto è grande (la piazza, la spiaggia): chi arriva a piedi si ferma dove può. Le mete piccole (la scala, il mezzo, la porta) restano strette
      const R0 = +r || K.r || CFG.qui, l = V.lodDi ? V.lodDi(c.st, c.A) : 'scena', R = (['tetto', 'mezzo', 'casa_altrui', 'bottega'].includes(K.dove) ? R0 * 1.5 : Math.max(R0, 24)) * (l === 'scena' ? 1 : 3);   // fuori scena il passo è approssimato
      return hyp(c.A.x - c.d.x, c.A.y - c.d.y) <= R ? '' : `Non sei ${c.d.posto ? aP(c.d.posto) : 'lì'}.`;
    },
    'v:serve': c => { const K = C_(c); if (!K || !K.serve || K.opz || c.d.cosa) return ''; return `Serve ${art(K.serve[0], 'ind')}.`; },
    'v:soldi': (c, x) => { const v = +x || 0; return (c.A.soldi || 0) >= v ? '' : `Ci vogliono ${lire(v)}.`; },
    'v:ora': (c, a, b) => { const h = (c.st.t % 1440) / 60; const ok = a <= b ? h >= a && h < b : h >= a || h < b; return ok ? '' : `Non è l'ora (dalle ${a} alle ${b}).`; },
    'v:pochi': (c, n) => (c.d.modo === 'maldestro' || (c.d.test || 0) <= (+n || 3) ? '' : 'C\'è troppa gente che guarda.'),
    'v:lavoro': c => (c.A.lavoro ? '' : `${chiSono(c.st, c.A)} un lavoro.`),
    'v:gruppo': c => (GR() && GR().gruppoDi(c.st, c.A.id) ? '' : 'Da solo non si può: ci vuole un gruppo.'),
    'v:libero': c => { const n = c.A.o; return n && n.jailedUntil > c.st.t ? 'È in cella.' : ''; },
    'v:fuori': c => { if (c.A.dove.k === 'fuori') return ''; const l = V.lodDi ? V.lodDi(c.st, c.A) : 'scena'; return l === 'lontano' || l === 'dormiente' ? '' : 'Prima bisogna uscire.'; },   // lontano il posto è astratto: chi «va» ci arriva
    'v:npc': c => (isP(c.st, c.A) ? 'Questo lo fanno gli altri.' : ''),
    'v:k': c => { const K = C_(c); if (!K || !K.puo) return ''; try { return K.puo(c.st, c.A, c.a, c.d) || ''; } catch (e) { return 'Non qui.'; } },
  });

  // ======================= GLI EFFETTI (gli atomi: termini 'v:…' di Verbo.EFF) =======================
  // c.d.es: 'ok' | 'meta' | 'comico' (dal tiro, il primo termine); f: quanto vale l'effetto (1, .5, 0)
  const fx = c => (c.d.es === 'ok' ? 1 : c.d.es === 'meta' ? .5 : 0);
  const mo = c => MODI[c.d.modo] || MODI.normale;
  const Bdi = c => (c.a.chi != null ? AT().di(c.st, c.a.chi) : c.d.vitt ? AT().di(c.st, c.d.vitt) : null);
  function affettoDi(st, daId, aId, x) {
    const M = ME() && ME().mente(st, daId); if (!M || !M.rel) return 0; const R = M.rel; let r = R[aId];
    if (!r) { if (Object.keys(R).length >= 24) return 0; r = R[aId] = [0, 0, 0, 0, r1(st.t), 0]; }
    r[0] = r2(clamp((r[0] || 0) + x, -1, 1)); return r[0];
  }
  const fama = (st, id) => { const s = S(st), e = s && s.fama[id]; if (!e) return 0; const k = Math.pow(.5, (st.t - e[1]) / (CFG.famaGiorni * 1440)); return clamp(e[0] * k, 0, 1.5); };
  function famaAdd(st, id, x) { const s = S(st), v = fama(st, id) + x; s.fama[id] = [r2(clamp(v, 0, 1.5)), Math.round(st.t)]; }
  function rep(st, id, k, x) { const R = RI(); if (R && R.rep && id !== 'nino') return R.rep(st, id, k, x); return 0; }
  // i Grigi: chi c'era, il Grigio vicino, il modo; il fermo (Popolo.arrest), la multa, la denuncia di un testimone, il fascicolo
  function grigi(c, heat) {
    const st = c.st, A = c.A, n = A.o, M = mo(c); if (!n || isP(st, A)) return;
    const test = c.d.testL || [], g = grigioVicino(st, A.x, A.y, CFG.grigioR);
    const p = heat * (g ? .55 : .05 + Math.min(6, test.length) * .04) * (M.grigi || 1) * (c.d.es === 'comico' ? 1.6 : 1);
    if (rnd() >= p) return; stats.scoperti++;
    if (g && rnd() < .5) { try { const P = PO(); if (P && P.arrest) P.arrest(st, n, K_inf(c)); else n.jailedUntil = st.t + 240; } catch (e) { n.jailedUntil = st.t + 240; } c.d.scop = 'fermato'; stats.fermati++; return; }
    if (g) { const m = Math.min(A.soldi || 0, 5 + Math.round(rnd() * 15)); A.soldi = r1((A.soldi || 0) - m); c.d.scop = 'multa'; c.d.multa = m; stats.multe++; return; }
    const R = RI(); if (R && R.fascicolo) R.fascicolo(st, A.id, 1, null);
    if (test.length) { c.d.scop = 'denunciato'; c.d.spia = pick(test); } else c.d.scop = 'fascicolo';
  }
  const K_inf = c => (CARTE[c.v] && CARTE[c.v].inf) || c.v.replace(/_/g, ' ');
  // gli oggetti presi da una borsa (chi ha qualcosa da portar via): mai armi, mai la roba di casa
  function arraffa(Bg, pref) {
    const C = (OG() && OG().CAT) || {}; let best = null, bv = -1;
    for (const [k, q] of Bg) { const e = C[k]; if (!e || q < 1 || e.wpn || k === 'munizioni') continue; if (pref && !pref.includes(k)) continue; const v = (e.prezzo || 1) * (1 + rnd() * .5); if (v > bv) { bv = v; best = k; } }
    return best;
  }
  const TROVA = {
    scava: [['fossile', .04], ['moneta_romana', .07], ['anfora', .03], ['rottami', .25], ['pietre', .3], ['lattine', .2]],
    cassonetto: [['rottami', .3], ['bottiglia_vuota', .3], ['radio_rotta', .08], ['stracci', .2], ['giornale', .2], ['bici_rotta', .04]],
    spiaggia: [['legna', .3], ['bottiglia_vuota', .2], ['sughero', .2], ['moneta_romana', .02], ['corda', .1], ['latta_vuota', .15]],
    ricci: [['polpo', .15], ['sarde', .2], ['acciughe', .25]],
    bosco: [['funghi', .35], ['castagne', .3], ['legna', .35], ['noci', .1]],
  };
  Object.assign(V.EFF, {
    // il tiro: riesce, a metà, o la comica (la carta, il modo, i tratti, la cosa che manca)
    'v:tira': c => {
      const K = C_(c), M = mo(c), st = c.st, t = isP(st, c.A) ? { follia: 0, zelo: .3 } : tratti(st, c.A.id);
      let p = (K.p === undefined ? .8 : K.p) + (M.p || 0) + t.zelo * .08 - t.follia * .12 + (isP(st, c.A) ? .1 : 0) - (c.d.senza ? .25 : 0) + (c.d.aiuto || 0);
      p = clamp(p, .05, .97); const r = rnd(), pc = clamp((K.comico === undefined ? .45 : K.comico) + (M.comico || 0), 0, 1);
      c.d.es = r < p ? 'ok' : rnd() < pc ? 'comico' : 'meta';
      c.d.testL = testimoni(st, c.A.x, c.A.y, [c.A.id, c.a.chi, c.d.vitt].filter(Boolean).map(String), M.pochi ? CFG.nascostoR : CFG.testR);
      if (M.pochi && c.d.testL.length > 1) c.d.testL = c.d.testL.slice(0, 1);
      if (K.usa && c.d.cosa) c.A.borsa.togli(c.d.cosa, 1);
    },
    'v:soldi': (c, lo, hi) => { const f = fx(c); if (!f) return; const v = r1(((+lo || 0) + rnd() * ((+hi || 0) - (+lo || 0))) * f * (1 + Math.max(0, (mo(c).pub || 1) - 1) * .3)); c.A.soldi = r1((c.A.soldi || 0) + v); c.d.lire = (c.d.lire || 0) + v; },
    'v:paga': (c, x) => { const v = Math.min(c.A.soldi || 0, +x || 0); c.A.soldi = r1((c.A.soldi || 0) - v); c.d.lire = v; },
    'v:roba': (c, k, lo, hi) => { const f = fx(c); if (!f) return; const q = Math.max(1, Math.round(((+lo || 1) + rnd() * ((+hi || lo || 1) - (+lo || 1))) * f)); c.A.borsa.add(k, q); c.d.preso = k; c.d.q = q; },
    'v:quota': c => { if (!fx(c)) return; const s = S(c.st); s.alto[c.A.id] = [c.d.bi === undefined ? -1 : c.d.bi, r1(c.A.x), r1(c.A.y), Math.round(c.st.t + CFG.altoMin * fx(c))]; },
    'v:pubblico': (c, x) => { const f = fx(c) || .3; famaAdd(c.st, c.A.id, (+x || .2) * f * (mo(c).pub || 1)); },
    'v:rep': (c, k, x) => { const f = c.d.es === 'comico' && k === 'ridicolo' ? 1 : fx(c); if (f) rep(c.st, c.A.id, k, (+x || .05) * f); },
    'v:repchi': (c, k, x) => { const B = Bdi(c); if (B && fx(c)) rep(c.st, B.id, k, (+x || .05) * fx(c) * (mo(c).rel || 1)); },
    'v:affetto': (c, x) => { const B = Bdi(c); if (!B || isP(c.st, B)) return; const f = c.d.es === 'comico' ? -.3 : fx(c); affettoDi(c.st, B.id, c.A.id, (+x || .1) * f * (mo(c).rel || 1)); if (c.d.modo === 'per_scherzo' && rnd() < .4) affettoDi(c.st, B.id, c.A.id, -.05); },
    'v:pace': (c, x) => { const B = Bdi(c); if (B && !isP(c.st, B)) affettoDi(c.st, B.id, c.A.id, (+x || .1) * (fx(c) || .2)); },
    'v:offesa': (c, x) => { const B = Bdi(c); if (B && !isP(c.st, B)) affettoDi(c.st, B.id, c.A.id, -(+x || .15) * (mo(c).rel || 1)); },
    'v:paura_chi': (c, x) => { const B = Bdi(c); if (B && B.bisogni && fx(c)) B.bisogni.paura = clamp((B.bisogni.paura || 0) + (+x || .1) * fx(c), 0, 1); },
    'v:libera': c => { const B = Bdi(c); if (B && B.o && fx(c) >= 1 && B.o.jailedUntil > c.st.t) { B.o.jailedUntil = c.st.t; c.d.liberato = 1; } },
    'v:capo': c => { const B = Bdi(c), Gr = GR(); if (!B || !Gr || fx(c) < 1) return; const g = Gr.gruppoDi(c.st, c.A.id); if (g && g.membri.includes(B.id) && g.capo !== B.id) { g.capo = B.id; c.d.eletto = 1; } },
    'v:casa': c => { if (fx(c) >= .5 && c.d.posto) { S(c.st).occupa[c.A.id] = [c.d.posto, Math.round(c.st.t)]; } },
    'v:fede': (c, x) => { const s = S(c.st), f = fx(c) || .3; s.fede[c.A.id] = r2(clamp((s.fede[c.A.id] || 0) + (+x || .1) * f, 0, 1)); if (c.A.bisogni) c.A.bisogni.paura = clamp((c.A.bisogni.paura || 0) - .1 * f, 0, 1); },
    'v:sposa': c => { const B = Bdi(c); if (!B || fx(c) < 1) return; const s = S(c.st); s.coppie[c.A.id] = B.id; s.coppie[B.id] = c.A.id; affettoDi(c.st, B.id, c.A.id, .3); affettoDi(c.st, c.A.id, B.id, .3); c.d.sposi = 1; },
    'v:addestra': c => { if (!fx(c)) return; const s = S(c.st); s.addestrati[c.A.id] = r2((s.addestrati[c.A.id] || 0) + .2 * fx(c)); },
    // la roba degli altri: la persona (borseggio), la bottega (taccheggio), la casa (scasso), il mezzo (il motorino)
    'v:ruba': (c, tipo) => {
      const st = c.st, A = c.A, f = fx(c); if (!f) return;
      if (tipo === 'persona') { const B = Bdi(c); if (!B) return; const k = rnd() < .55 ? null : arraffa(B.borsa); if (k) { B.borsa.togli(k, 1); A.borsa.add(k, 1); c.d.preso = k; } else { const m = r1(Math.min(B.soldi || 0, (2 + rnd() * 10) * f)); B.soldi = r1((B.soldi || 0) - m); A.soldi = r1((A.soldi || 0) + m); c.d.lire = m; } return; }
      if (tipo === 'bottega') { const Sh = bottegaVicina(st, A, c.d.bott), C = (OG() && OG().CAT) || {}; if (!Sh) return; const L = Object.keys(Sh.stock).filter(g => Sh.stock[g] >= 1 && C[g] && !C[g].wpn && C[g].peso < 4); if (!L.length) return; const g = L.sort((x, y) => (C[y].prezzo || 0) - (C[x].prezzo || 0))[Math.floor(rnd() * Math.min(3, L.length))]; Sh.stock[g]--; A.borsa.add(g, 1); c.d.preso = g; return; }
      if (tipo === 'casa') { const B = Bdi(c); if (!B) return; const D = B.casa && B.casa.dispensa; const k = D ? arraffa(D) : null; if (k && rnd() < .5) { D.togli(k, 1); A.borsa.add(k, 1); c.d.preso = k; } else { const m = r1(Math.min(B.soldi || 0, (5 + rnd() * 25) * f)); B.soldi = r1((B.soldi || 0) - m); A.soldi = r1((A.soldi || 0) + m); c.d.lire = m; } return; }
      if (tipo === 'mezzo') { const v = (st.vehicles || []).find(q => q && q.id === c.d.mezzo); if (!v || f < 1) return; const da = v.owner; v.owner = A.id; v.rubato = { da, t: Math.round(st.t) }; S(st).mezzi[A.id] = [v.id, Math.round(st.t), da]; c.d.preso = 'motorino'; }
    },
    // la ricettazione: la roba di provenienza dubbia al ricettatore, al 30-60%
    'v:ricetta': c => { const f = fx(c), k = c.d.cosa; if (!f || !k || c.A.borsa.get(k) < 1) return; const e = (OG() && OG().CAT[k]) || {}; c.A.borsa.togli(k, 1); const v = r1((e.prezzo || 5) * (.3 + rnd() * .3) * (f < 1 ? .6 : 1)); c.A.soldi = r1((c.A.soldi || 0) + v); c.d.lire = v; c.d.venduto = k; },
    // lo spaccio: la roba a chi la cerca (il vizio di popolo), se no a un passante
    'v:spaccia': c => { const f = fx(c), st = c.st; if (!f || c.A.borsa.get('roba') < 1) return; const L = c.d.testL || []; const k = L.map(id => npc(st, id)).find(q => q && q.pop && (q.pop.vice === 'roba' || (q.pop.money || 0) > 20)); if (!k) { c.d.es = 'meta'; return; } const v = r1(3 + rnd() * 5); c.A.borsa.togli('roba', 1); if (k.pop) k.pop.money = r1((k.pop.money || 0) - Math.min(v, k.pop.money || 0)); const B = AT().di(st, k); if (B) B.borsa.add('roba', 1); c.A.soldi = r1((c.A.soldi || 0) + v); c.d.lire = v; c.d.cliente = k.id; },
    // l'orto: piantare (un pezzo di terra), annaffiare, raccogliere quando è pronto
    'v:orto': (c, fase) => {
      const st = c.st, s = S(st), A = c.A, mio = s.orti.find(o => o[0] === A.id); const f = fx(c);
      if (fase === 'pianta') { if (!f || mio) return; s.orti.push([A.id, r1(A.x), r1(A.y), c.d.posto || null, Math.round(st.t), Math.round(st.t + CFG.ortoGiorni * 1440 / (f < 1 ? .7 : 1)), Math.round(st.t), 0]); if (s.orti.length > 120) s.orti.shift(); c.d.orto = 'piantato'; return; }
      if (!mio) return;
      if (fase === 'annaffia') { if (!f) return; mio[6] = Math.round(st.t); mio[5] = Math.round(mio[5] - 240 * f); c.d.orto = 'annaffiato'; return; }
      if (fase === 'raccogli') { if (st.t < mio[5] || !f) return; const q = Math.max(1, Math.round((2 + rnd() * 4) * f)); A.borsa.add('verdura', q); if (rnd() < .5) A.borsa.add('pomodori', 1); s.orti.splice(s.orti.indexOf(mio), 1); c.d.preso = 'verdura'; c.d.q = q; c.d.orto = 'raccolto'; }
    },
    // la banca per tutti (soldi.js è del giocatore: qui il conto dell'NPC, con le regole di Soldi.CFG: il tetto, il tasso a settimana)
    'v:mutuo': c => { const f = fx(c); if (f < 1) return; const So = SO(), CF = (So && So.CFG) || { prestito: 200, prestitoTasso: .03 }, q = Math.round(Math.min(CF.prestito || 200, 40 + rnd() * 120)); c.A.soldi = r1((c.A.soldi || 0) + q); S(c.st).mutui[c.A.id] = [q, Math.round(c.st.t), Math.ceil(q * .15), 0]; try { const B = So && So.S(c.st).banca; if (B) { B.mutui = (B.mutui || 0) + q; } } catch (e) { } c.d.lire = q; },
    'v:sussidio': c => { const f = fx(c); S(c.st).sussidi[c.A.id] = Math.round(c.st.t); if (!f) return; const v = r1((20 + rnd() * 10) * f); c.A.soldi = r1((c.A.soldi || 0) + v); c.d.lire = v; },
    // il cappello: le monete di chi guarda (quanta gente, la fama), più la fama
    'v:cappello': c => { const f = fx(c), n = (c.d.testL || []).length; if (!f || !n) { c.d.lire = 0; return; } const v = r1(Math.min(12, n * (.4 + rnd() * .9) * f * (1 + fama(c.st, c.A.id)))); c.A.soldi = r1((c.A.soldi || 0) + v); c.d.lire = v; famaAdd(c.st, c.A.id, .05 * n); },
    'v:trova': (c, tab) => { const f = fx(c); if (!f) return; const T = TROVA[tab] || TROVA.cassonetto; let r = rnd() * (f < 1 ? 1.5 : 1); for (const [k, p] of T) { if ((r -= p) < 0) { c.A.borsa.add(k, 1); c.d.preso = k; return; } } },
    'v:bis': (c, k, x) => { const B = c.A.bisogni; if (!B) return; const f = fx(c) || (c.d.es === 'comico' ? -.3 : 0); B[k] = clamp((B[k] || 0) + (+x || 0) * f, 0, 1); },
    'v:bischi': (c, k, x) => { const B = Bdi(c); if (!B || !B.bisogni) return; B.bisogni[k] = clamp((B.bisogni[k] || 0) + (+x || 0) * (fx(c) || 0), 0, 1); },
    // il raduno: chi è del gruppo, chi la pensa uguale, gli amici, arrivano davvero (Verbo vai) al posto
    'v:raduna': (c, tema) => {
      const st = c.st, A = c.A, s = S(st), Gr = GR(), I = ID(), g = Gr ? Gr.gruppoDi(st, A.id) : null, out = [];
      if (fx(c) <= 0) return;
      const cand = st.npcs.filter(k => vivo(k) && k.pop && k !== A.o && !k.cop && !k.grigio && !k.inside && !(k.jailedUntil > st.t) && hyp(k.x - A.x, k.y - A.y) < CFG.raduno);
      const w = k => (g && g.membri.includes(k.id) ? 3 : 0) + (I && tema && I.di(st, k.id).some(e => I.soggDi(e[0]) === tema && e[1] < 0) ? 2 : 0) + (affettoDi(st, k.id, A.id, 0) > .2 ? 1 : 0) + rnd() * .5;
      for (const k of cand.sort((a, b) => w(b) - w(a)).slice(0, CFG.radunoMax)) { if (w(k) < 1) break; const M = st.u.menti && st.u.menti[k.id]; if (M && M.piano) continue; const r = V.fai(st, k, 'vai', { x: r1(c.d.x + (rnd() - .5) * 4), y: r1(c.d.y + (rnd() - .5) * 4) }, {}); if (r && r.ok) out.push(k.id); }
      s.raduni.push([A.id, r1(c.d.x), r1(c.d.y), Math.round(st.t), Math.round(st.t + 60), tema || null, out.length]); if (s.raduni.length > 20) s.raduni.shift();
      c.d.part = out; c.d.aiuto = 0; stats.radunati += out.length; famaAdd(st, A.id, .1 * (out.length + 1));
    },
    'v:grigi': (c, h) => grigi(c, +h || .3),
    // i cataloghi vecchi, con le loro funzioni (strategia A): il mestiere (Mestieri.perform), le battute (Azioni.social), la casa (Casa.fai)
    'v:mestiere': (c, id) => { const M = MS(); if (!M) throw new Error('niente mestieri'); const r = M.perform(c.st, c.A.o === c.st.player ? 'player' : c.A.o, id); if (!r || !r.ok) throw new Error((r && r.msg) || 'non è andata'); c.d.msgM = String(r.msg || '').slice(0, 80); if (r.seen) c.d.scop = 'visto'; },
    'v:social': (c, kind) => { const Z = AZ(), B = Bdi(c); if (!Z || !Z.social || !B || !B.o || !B.o.pop || !c.A.o.pop) return; if (fx(c) <= 0 && kind !== 'litiga') return; Z.social(c.st, c.A.o, B.o, kind, {}); },
    'v:casafai': (c, v) => { const K = CS(), A = c.A, bi = A.casa && A.casa.bi >= 0 ? A.casa.bi : null; if (!K || bi === null) throw new Error('niente casa'); const op = K.fai(c.st, isP(c.st, A) ? 'player' : A.o, bi, v, v === 'butta' ? { cosa: 'ciarpame' } : {}); if (!op) throw new Error('in casa non c\'è niente da fare'); const cf = op.fid && K.fattoDi ? K.fattoDi(c.st, op.fid) : null; if (cf && cf.vid) c.d.fidV = cf.vid; },
    'v:sabota': c => { const B = Bdi(c); if (!B || fx(c) < .5) return; const k = arraffa(B.borsa, ['rete_pesca', 'canna', 'bicicletta', 'radiolina', 'carriola', 'zappa', 'pala', 'telefono']); if (k) { B.borsa.togli(k, 1); CO().aTerra(c.st, k, B.x + .5, B.y, true, B.id); c.d.rotto = k; } else c.d.rotto = null; },
    'v:sfida': c => { const B = Bdi(c), R = RI(); if (!B) return; const fa = R && R.forza ? R.forza(c.st, c.A.o) : 1, fb = R && R.forza ? R.forza(c.st, B.o) : 1; const vince = rnd() * (fa + fb) < fa * (fx(c) ? 1 : .5) ? c.A : B, perde = vince === c.A ? B : c.A; c.d.vinc = vince.id; rep(c.st, vince.id, 'temuto', .08); rep(c.st, perde.id, 'ridicolo', .08); },
    'v:consuma': (c, k) => { const id = k || c.d.cosa; if (id && c.A.borsa.get(id) >= 1) c.A.borsa.togli(id, 1); },
    'v:sciopera': c => { S(c.st).scioperi[c.A.id] = Math.round(c.st.t + 240); const J = c.A.lavoro; c.d.mestiere = J ? J.mestiere : null; },
    'v:convinci': (c, sogg) => { const B = Bdi(c), I = ID(); if (!B || !I || !fx(c)) return; const s0 = sogg || 'grigi'; try { I.adotta(c.st, B.id, s0, 'rancore', -.4 * fx(c), .4, null, false); } catch (e) { } },
    // la fine: la frase, l'onomatopea, la comica concreta (la tavola GUASTI), il conto
    'v:fine': c => fine(c),
  });
  // gli atomi in più (le carte li usano come gli altri)
  const RIPARA = { radio_rotta: 'radiolina', bici_rotta: 'bicicletta', mobile_rotto: 'sedia', tv_rotta: 'radiolina', frigo_rotto: 'ricambi' };
  Object.assign(V.EFF, {
    'v:ripara': c => { const k = c.d.cosa; if (!k || fx(c) < 1) return; c.A.borsa.togli(k, 1); const o = RIPARA[k] || 'ricambi'; c.A.borsa.add(o, 1); c.d.preso = o; },
    'v:scendi': c => { delete S(c.st).alto[c.A.id]; },
    'v:lotto': c => { if (rnd() < .035 * (fx(c) || .5)) { const v = Math.round(40 + rnd() * 160); c.A.soldi = r1((c.A.soldi || 0) + v); c.d.lire = v; c.d.vinto = 1; } },
    'v:scommessa': c => { const B = Bdi(c); if (!B) return; const v = r1(Math.min(2 + rnd() * 6, B.soldi || 0, c.A.soldi || 0)); if (!v) return; const vince = rnd() < (fx(c) ? .55 : .3); if (vince) { B.soldi = r1(B.soldi - v); c.A.soldi = r1(c.A.soldi + v); } else { c.A.soldi = r1(c.A.soldi - v); B.soldi = r1(B.soldi + v); } c.d.lire = v; c.d.vinto = vince ? 1 : 0; },
    'v:paga_da': (c, lo, hi) => { const B = Bdi(c); if (!B || !fx(c)) return; const v = r1(Math.min(B.soldi || 0, ((+lo || 1) + rnd() * ((+hi || 2) - (+lo || 1))) * fx(c))); B.soldi = r1((B.soldi || 0) - v); c.A.soldi = r1((c.A.soldi || 0) + v); c.d.lire = v; },
    'v:colletta': c => { const Gr = GR(), g = Gr && Gr.gruppoDi(c.st, c.A.id), v = c.d.lire || 0; if (g && v > 0) { c.A.soldi = r1(c.A.soldi - v); g.cassa = r1((g.cassa || 0) + v); c.d.cassa = 1; } },
    'v:rata': c => { const m = S(c.st).mutui[c.A.id]; if (!m) return; const v = Math.min(m[0], c.A.soldi || 0, m[2] * 2); c.A.soldi = r1(c.A.soldi - v); m[0] = r1(m[0] - v); c.d.lire = v; if (m[0] < 1) delete S(c.st).mutui[c.A.id]; },
    'v:delazione': c => { const st = c.st, id = c.d.vitt || c.a.vitt; if (!id || !fx(c)) return; const R = RI(); if (R && R.fascicolo) R.fascicolo(st, String(id), 2, null); const k = npc(st, id); if (k && fx(c) >= 1 && rnd() < .3) { try { const P = PO(); if (P && P.arrest) P.arrest(st, k, 'una soffiata'); } catch (e) { } c.d.preso_vitt = 1; } },
    'v:corrompi': c => { const R = RI(), s = R && st_(c).u.rissa; if (s && s.fasc[c.A.id]) s.fasc[c.A.id][0] = Math.max(0, s.fasc[c.A.id][0] - 2 * fx(c)); },
    'v:fuoco': c => { if (!fx(c)) return; const s = S(c.st); (s.fuochi = s.fuochi || []).push([r1(c.A.x), r1(c.A.y), Math.round(c.st.t + 60), c.A.id]); if (s.fuochi.length > 10) s.fuochi.shift(); },
    'v:spegni': c => { const s = S(c.st); if (!s.fuochi || !fx(c)) return; const i = s.fuochi.findIndex(q => hyp(q[0] - c.A.x, q[1] - c.A.y) < 30); if (i >= 0) { c.d.vitt = s.fuochi[i][3]; s.fuochi.splice(i, 1); } },
    'v:capoio': c => { const Gr = GR(), g = Gr && Gr.gruppoDi(c.st, c.A.id); if (g && fx(c) >= 1 && g.capo !== c.A.id) { g.capo = c.A.id; c.d.eletto = 1; } },
    'v:razione': c => { const s = S(c.st); (s.razioni = s.razioni || {})[c.A.id] = Math.round(c.st.t); },
    'v:soccorri': c => { const B = Bdi(c); if (!B || !B.o || !fx(c)) return; B.o.stun = 0; if (B.o.maxHp) B.o.hp = Math.max(B.o.hp || 0, B.o.maxHp * .7); },
  });
  const st_ = c => c.st;

  // ======================= LE CARTE (solo dati: il primo lotto) =======================
  const CARTE = UV.CARTE = {};
  const povero = c => (c.A.soldi || 0) < 8, legge = c => { const t = c.n && c.n.tr; return t && typeof t.legge === 'number' ? t.legge : .5; };
  const losco = c => legge(c) < .4, onesto = c => legge(c) > .55;
  const car = (c, k) => ((c.M && c.M.carattere) || {})[k] || 0;
  const folle = c => tratti(c.st, c.n.id).follia > .35, zelante = c => tratti(c.st, c.n.id).zelo > .4;
  const ha = (c, L) => L.some(k => c.A.borsa.get(k) >= 1);
  const ILL = ['refurtiva', 'merce', 'valuta', 'gioielli', 'anello_oro', 'posate_argento', 'orologio', 'marlboro', 'sigarette_contr', 'documenti', 'timbro_falso'];
  const altoOra = (st, id) => { const e = S(st).alto[id]; return !!e && e[3] > st.t; };
  const ortoDi = (st, id) => S(st).orti.find(o => o[0] === id) || null;
  const metaOrto = (st, A, a, d) => { const o = ortoDi(st, A.id); if (o) { d.x = o[1]; d.y = o[2]; d.posto = o[3]; d.orto = o; } else d.x = undefined; };
  const C = (k, f, o) => { CARTE[k] = Object.assign({ f }, o); };
  const CORPO = ['corri', 'aspetta'];   // (il nome della famiglia nei conti)

  // ---- 1. Corpo ----
  C('corri', 'corpo', { dove: 'qui', eff: [['bis', 'svago', -.12], ['bis', 'sonno', .04]], min: 6, posa: 'cammina', pitto: 'freccia', w: 'di corsa', ono: 'FIUU', g: 'cade', modi: ['teatrale', 'maldestro'], d: 'ha fatto una corsa', inf: 'fare una corsa', ob: ['divertirsi'], quando: c => !povero(c) || zelante(c), da: 'azioni:scappa' });
  C('aspetta', 'corpo', { dove: 'piazza', eff: [['bis', 'rabbia', -.05], ['bis', 'compagnia', .03]], min: 15, posa: 'aspetta', pitto: 'orologio', w: '...', d: 'è rimasto ad aspettare', inf: 'aspettare', da: 'risacca:aspetta' });
  C('siediti', 'corpo', { dove: 'piazza', eff: [['bis', 'sonno', -.03], ['bis', 'svago', -.06]], min: 15, posa: 'siede', pitto: 'zeta', w: 'ahh', g: 'figuraccia', d: 'si è seduto su una panchina', inf: 'sedersi', ob: ['divertirsi'] });
  C('siediti_per_terra', 'corpo', { dove: 'piazza', eff: [['bis', 'sonno', -.02], ['rep', 'ridicolo', .01]], min: 12, posa: 'siede_terra', pitto: 'zeta', d: 'si è seduto per terra', inf: 'sedersi per terra', ob: ['divertirsi'], quando: c => folle(c) || povero(c) });
  C('sdraiati', 'corpo', { dove: 'spiaggia', eff: [['bis', 'sonno', -.08], ['bis', 'svago', -.08]], min: 30, posa: 'dorme', pitto: 'zeta', w: 'zzz', g: 'si_bagna', d: 'si è sdraiato al sole', inf: 'sdraiarsi al sole', ob: ['divertirsi'] });
  C('nasconditi', 'corpo', { dove: 'nascosto', eff: [['bis', 'paura', -.3]], min: 40, posa: 'aspetta', pitto: 'porta', w: 'sst', g: 'resta_incastrato', modi: ['maldestro'], d: 'è andato a nascondersi', inf: 'nascondersi', da: 'azioni:nasconditi' });
  C('sbircia', 'corpo', { dove: 'casa_altrui', vitt: true, piena: true, r: 8, eff: [['bis', 'svago', -.08]], min: 4, posa: 'osserva', pitto: 'fumetto', w: '…', g: 'scoperto', modi: ['di_nascosto', 'maldestro'], offesa: [0, 1, .1], d: 'ha sbirciato dalla finestra di casa di {B}', inf: 'sbirciare dalla finestra', ob: ['divertirsi'], quando: c => folle(c) || car(c, 'loq') > .6 });
  C('origlia', 'corpo', { chi: 'persona', r: 5, pre: [['v:pochi', 3]], eff: [['bis', 'svago', -.06]], min: 4, posa: 'aspetta', pitto: 'fumetto', w: '…', g: 'scoperto', modi: ['di_nascosto', 'maldestro'], offesa: [0, 1, .1], d: 'ha origliato i discorsi di {B}', inf: 'origliare', verso: 'chiunque', ob: ['socializzare'], quando: c => car(c, 'loq') > .5 });
  C('lavati', 'corpo', { dove: 'lavatoio', eff: [['bis', 'igiene', -.4]], min: 10, posa: 'lavora', pitto: 'bicchiere', w: 'splash', ono: 'SPLASH', g: 'si_bagna', d: 'si è lavato', inf: 'lavarsi', ob: ['igiene'] });
  C('fuma', 'corpo', { dove: 'qui', dentro: true, serve: ['sigarette', 'sigarette_contr', 'marlboro', 'tabacco'], usa: true, eff: [['bis', 'svago', -.1], ['bis', 'rabbia', -.06]], min: 6, posa: 'fuma', pitto: 'fumetto', w: 'puff', g: 'figuraccia', d: 'si è fumato una sigaretta', inf: 'fumarsi una sigaretta', ob: ['divertirsi'], quando: c => ha(c, ['sigarette', 'sigarette_contr', 'marlboro', 'tabacco']) });
  C('piangi', 'corpo', { dove: 'qui', dentro: true, eff: [['bis', 'rabbia', -.2], ['bis', 'paura', -.1]], min: 5, posa: 'aspetta', pitto: 'muso', w: 'sob', d: 'si è messo a piangere', inf: 'piangere', p: .95 });
  C('stiracchiati', 'corpo', { dove: 'qui', dentro: true, eff: [['bis', 'sonno', -.02]], min: 1, posa: 'stiracchia', pitto: 'zeta', w: 'uaah', d: 'si è stiracchiato', inf: 'stiracchiarsi', p: .98 });
  C('prega', 'corpo', { dove: 'chiesa', eff: [['fede', .1], ['bis', 'paura', -.1]], min: 20, posa: 'prega', pitto: 'mano', w: 'amen', d: 'ha pregato', inf: 'pregare', ob: ['pregare'], p: .95 });
  C('balla', 'corpo', { dove: 'piazza', eff: [['bis', 'svago', -.25], ['pubblico', .15]], min: 20, posa: 'balla', pitto: 'fumetto', w: '♪', ono: 'TAPATAP', g: 'cade', modi: ['teatrale', 'maldestro', 'in_gruppo'], d: 'si è messo a ballare', inf: 'ballare', ob: ['divertirsi'], quando: c => car(c, 'teatrale') > .3 || folle(c), da: 'eventi:ballano' });
  C('canta', 'corpo', { dove: 'piazza', eff: [['bis', 'svago', -.2], ['pubblico', .15]], min: 10, posa: 'discute', pitto: 'fumetto', w: '♪ la la', ono: 'TRALALÀ', g: 'figuraccia', modi: ['teatrale', 'in_pubblico', 'maldestro'], d: 'ha cantato a squarciagola', inf: 'cantare', ob: ['divertirsi'], quando: c => car(c, 'teatrale') > .35 || folle(c) });
  C('tuffati', 'corpo', { dove: 'acqua', eff: [['bis', 'svago', -.3], ['pubblico', .2], ['bis', 'igiene', -.1]], min: 8, pitto: 'esclamativo', w: 'oplà', ono: 'SPLASH', g: 'si_bagna', modi: ['teatrale', 'maldestro'], d: 'si è tuffato', inf: 'tuffarsi', ob: ['divertirsi'], quando: c => !povero(c) || folle(c), filo: [['impresa', 'apre', { acrobata: 'chi' }]], da: 'iniziative:tuffo' });
  C('nuota', 'corpo', { dove: 'spiaggia', eff: [['bis', 'svago', -.2], ['bis', 'igiene', -.2]], min: 25, pitto: 'freccia', ono: 'PLUF', g: 'si_bagna', d: 'ha fatto una nuotata', inf: 'nuotare', ob: ['divertirsi', 'igiene'] });
  C('osserva_dal_tetto', 'corpo', { dove: 'tetto', r: 6, eff: [['quota'], ['bis', 'svago', -.15]], min: 15, posa: 'osserva', pitto: 'freccia', w: 'che vista', g: 'cade', d: 'è salito sul tetto a guardare il porto', inf: 'guardare il porto dal tetto', ob: ['divertirsi'], quando: c => folle(c) || zelante(c) });

  // ---- 3. Luoghi, tetti, verticale ----
  C('arrampicati', 'luoghi', { dove: 'tetto', r: 5, eff: [['quota'], ['pubblico', .1]], min: 3, posa: 'forza', pitto: 'freccia', w: 'su!', ono: 'ZAMP', g: 'cade', p: .72, modi: ['teatrale', 'maldestro', 'di_nascosto'], d: 'si è arrampicato su per la scala di ferro fino al tetto', inf: 'arrampicarsi sul tetto', ob: ['divertirsi'], quando: c => folle(c) || zelante(c), filo: [['impresa', 'apre', { acrobata: 'chi' }]] });
  C('arrampicati_grondaia', 'luoghi', { dove: 'casa_altrui', vitt: true, r: 8, eff: [['quota'], ['pubblico', .15]], min: 4, posa: 'forza', pitto: 'freccia', w: 'su per il tubo', ono: 'SCRIIC', g: 'cade', p: .45, modi: ['teatrale', 'maldestro', 'di_nascosto'], d: 'si è arrampicato su per la grondaia di casa di {B}', inf: 'arrampicarsi su per la grondaia', filo: [['impresa', 'apre', { acrobata: 'chi' }]] });
  C('arrampicati_balcone', 'luoghi', { dove: 'casa_altrui', vitt: true, piena: true, r: 8, eff: [['quota'], ['affetto', .05]], min: 4, posa: 'forza', pitto: 'cuore', w: 'eccomi', ono: 'ZAMP', g: 'cade', p: .5, modi: ['teatrale', 'maldestro', 'di_nascosto'], d: 'si è arrampicato fino al balcone di {B}', inf: 'arrampicarsi sul balcone', filo: [['amore', 'apre', { a: 'chi', b: 'con0' }]] });
  C('sali_in_alto', 'luoghi', { dove: 'alto', r: 14, eff: [['quota'], ['bis', 'svago', -.1]], min: 10, posa: 'osserva', pitto: 'freccia', w: 'in cima!', g: 'cade', p: .9, d: 'è salito in cima', inf: 'salire in cima al faro', ob: ['divertirsi'], quando: c => folle(c) || car(c, 'teatrale') > .4 });
  C('arrampicati_campanile', 'luoghi', { dove: 'campanile', r: 14, eff: [['quota'], ['pubblico', .3]], min: 8, posa: 'forza', pitto: 'esclamativo', w: 'su!', ono: 'DONG', g: 'cade', p: .4, ill: true, modi: ['teatrale', 'maldestro'], pre: [], d: 'si è arrampicato sul campanile', inf: 'arrampicarsi sul campanile', eff2: null, filo: [['impresa', 'apre', { acrobata: 'chi' }]] });
  C('salta_tetto', 'luoghi', { dove: 'tetto', r: 8, puo: (st, A) => (altoOra(st, A.id) ? '' : 'Prima bisogna salire sul tetto.'), eff: [['rep', 'ridicolo', -.04], ['quota'], ['pubblico', .25], ['rep', 'temuto', .02]], min: 1, pitto: 'esclamativo', w: 'hop!', ono: 'BOING', g: 'cade', p: .55, modi: ['teatrale', 'maldestro'], d: 'è saltato da un tetto all\'altro', inf: 'saltare da un tetto all\'altro', filo: [['impresa', 'avanza', { acrobata: 'chi' }]] });
  C('scendi_dal_tetto', 'luoghi', { dove: 'tetto', r: 8, puo: (st, A) => (altoOra(st, A.id) ? '' : 'Non sei sul tetto.'), eff: [['scendi']], min: 2, pitto: 'freccia', w: 'giù', g: 'cade', p: .9, d: 'è sceso dal tetto', inf: 'scendere dal tetto' });
  C('grida_dal_tetto', 'luoghi', { dove: 'tetto', r: 8, puo: (st, A) => (altoOra(st, A.id) ? '' : 'Bisogna essere sul tetto.'), eff: [['pubblico', .35], ['bis', 'rabbia', -.25]], min: 3, posa: 'discute', pitto: 'esclamativo', w: 'ehi voi!', g: 'figuraccia', modi: ['teatrale', 'con_rabbia'], d: 'si è messo a gridare dal tetto', inf: 'gridare dal tetto', ob: ['vendicarsi'], quando: c => altoOra(c.st, c.n.id) });
  C('salta_con_ombrello', 'luoghi', { dove: 'tetto', r: 8, puo: (st, A) => (altoOra(st, A.id) ? '' : 'Bisogna essere sul tetto.'), serve: ['telo', 'coperta', 'impermeabile', 'lenzuola'], opz: true, eff: [['pubblico', .45], ['scendi']], min: 1, pitto: 'esclamativo', w: 'volo!', ono: 'FIUUU', g: 'cade', p: .15, comico: .95, d: 'si è buttato dal tetto con {cosaI} aperto come un paracadute', inf: 'volare giù dal tetto col paracadute', filo: [['impresa', 'avanza', { acrobata: 'chi' }]] });
  C('scavalca', 'luoghi', { dove: 'recinto', eff: [['pubblico', .05], ['grigi', .15]], min: 2, posa: 'forza', pitto: 'freccia', w: 'hop', g: 'resta_incastrato', p: .7, modi: ['maldestro', 'di_nascosto'], ill: true, d: 'ha scavalcato il recinto', inf: 'scavalcare il recinto', ob: ['divertirsi'], quando: c => folle(c) && losco(c) });
  C('bussa', 'luoghi', { dove: 'casa_altrui', vitt: true, piena: true, r: 6, eff: [['affetto', .02]], min: 1, posa: 'porge', pitto: 'porta', w: 'toc toc', ono: 'TOC TOC', g: 'figuraccia', modi: ['per_scherzo', 'con_rabbia', 'con_garbo'], d: 'ha bussato alla porta di {B}', inf: 'bussare alla porta', ob: ['socializzare'] });
  C('occupa', 'luoghi', { dove: 'rifugio', r: 14, eff: [['casa'], ['pubblico', .1], ['grigi', .25]], min: 30, posa: 'martella', pitto: 'casetta', w: 'qui si sta', ono: 'TUMP', g: 'resta_incastrato', ill: true, modi: ['in_gruppo', 'di_nascosto'], d: 'ha occupato una casa vuota', inf: 'occupare una casa vuota', ob: ['dormire'], quando: c => !c.A.casa && !S(c.st).occupa[c.n.id], idee: [['chi', '@luogo', 'orgoglio', .4, .4], ['test', '@luogo', 'curiosita', .2, .2]], filo: [['protesta', 'apre', { promotore: 'chi' }]], da: 'risacca:occupa' });
  C('abita', 'luoghi', { dove: 'rifugio', r: 14, puo: (st, A, a, d) => { const o = S(st).occupa[A.id]; return o && o[0] === d.posto ? '' : 'Prima bisogna prendersi il posto.'; }, eff: [['casa'], ['bis', 'sonno', -.15]], min: 60, posa: 'dorme', pitto: 'casetta', w: 'casa mia', d: 'si è sistemato a vivere lì', inf: 'andare a vivere in una grotta', ob: ['dormire'], quando: c => !!S(c.st).occupa[c.n.id] });

  // ---- 2. Oggetti e mani ----
  const ROTTAMI = ['rottami', 'bottiglia_vuota', 'latta_vuota', 'lattine', 'cartone', 'radio_rotta', 'tv_rotta', 'mobile_rotto', 'stracci', 'batterie_esauste', 'barattolo'];
  C('butta', 'oggetti', { dove: 'cassonetto', serve: ROTTAMI, usa: true, eff: [['bis', 'igiene', -.02]], min: 2, posa: 'raccoglie', pitto: 'mano_giu', w: 'via', ono: 'TUNF', g: 'scappa_via', d: 'ha buttato {cosa} nel cassonetto', inf: 'buttare via la roba', ob: ['arredare'], quando: c => ha(c, ROTTAMI), da: 'azioni:sbarazzati' });
  C('getta_in_mare', 'oggetti', { dove: 'acqua', serve: ROTTAMI.concat(ILL), usa: true, eff: [['bis', 'paura', -.05]], min: 2, posa: 'raccoglie', pitto: 'mano_giu', w: 'addio', ono: 'PLUF', g: 'si_bagna', d: 'ha gettato {cosa} in mare', inf: 'gettare la roba in mare' });
  C('fruga_cassonetto', 'oggetti', { dove: 'cassonetto', eff: [['trova', 'cassonetto'], ['rep', 'ridicolo', .01]], min: 8, posa: 'fruga', pitto: 'mano', w: 'vediamo', ono: 'SCRAT', g: 'si_sporca', p: .6, comico: .3, d: 'ha frugato nel cassonetto[ e ha trovato {cosaI}]', inf: 'frugare nel cassonetto', ob: ['guadagnare'], quando: c => povero(c), da: 'risacca:rovista' });
  C('fruga_discarica', 'oggetti', { dove: 'discarica', eff: [['trova', 'cassonetto']], min: 25, posa: 'fruga', pitto: 'mano', w: 'roba buona', g: 'si_sporca', p: .7, d: 'ha frugato alla discarica[ e ha trovato {cosaI}]', inf: 'frugare alla discarica', ob: ['guadagnare'], quando: c => povero(c), da: 'risacca:rovista' });
  C('cerca_sulla_spiaggia', 'oggetti', { dove: 'spiaggia', eff: [['trova', 'spiaggia']], min: 30, posa: 'raccoglie', pitto: 'mano', w: 'il mare restituisce', g: 'si_bagna', p: .65, d: 'ha cercato fra le cose portate dal mare[: {cosaI}]', inf: 'cercare sulla spiaggia', ob: ['guadagnare', 'divertirsi'] });
  C('raccogli_ricci', 'oggetti', { dove: 'scogli', eff: [['trova', 'ricci']], min: 30, posa: 'raccoglie', pitto: 'amo', w: 'ahi', ono: 'AHIA', g: 'si_bagna', p: .6, d: 'è andato a raccogliere ricci sugli scogli[: {cosaI}]', inf: 'raccogliere ricci', ob: ['mangiare', 'guadagnare'], quando: c => povero(c) });
  C('raccogli_legna', 'oggetti', { dove: 'bosco', eff: [['trova', 'bosco']], min: 40, posa: 'raccoglie', pitto: 'mano', w: 'legna', g: 'cade', p: .75, d: 'è andato nel bosco[ e ha portato via {cosaI}]', inf: 'raccogliere legna nel bosco', ob: ['guadagnare'] });
  C('ripara', 'oggetti', { dove: 'qui', dentro: true, serve: Object.keys(RIPARA), eff: [['ripara']], min: 45, posa: 'martella', pitto: 'martello', w: 'aggiusto', ono: 'TAC TAC', g: 'si_rompe', p: .55, d: 'ha aggiustato {cosa}', meta: 'ma non si capisce se funziona', inf: 'aggiustare la roba rotta', ob: ['guadagnare', 'arredare'], quando: c => ha(c, Object.keys(RIPARA)), produce: null, da: 'risacca:ripara' });
  C('pulisci', 'oggetti', { dove: 'piazza', serve: ['secchio', 'spugne', 'stracci'], opz: true, eff: [['pubblico', .05]], min: 20, posa: 'spazza', pitto: 'mano', w: 'che schifo', g: 'si_sporca', d: 'ha pulito per terra', inf: 'pulire la strada', quando: c => onesto(c) && zelante(c), ob: ['lavorare'], da: 'azioni:pulisci' });
  C('spazza', 'oggetti', { dove: 'piazza', eff: [['pubblico', .05], ['bis', 'rabbia', -.05]], min: 20, posa: 'spazza', pitto: 'mano', w: 'shh shh', g: 'figuraccia', d: 'ha spazzato davanti a tutti', inf: 'spazzare la piazza', quando: c => onesto(c), ob: ['lavorare'] });
  C('stendi_bucato', 'oggetti', { dove: 'casa', dentro: true, eff: [['bis', 'igiene', -.1]], min: 15, posa: 'attacchina', pitto: 'mano', w: 'panni', ono: 'FLAP', g: 'perde_cappello', d: 'ha steso il bucato', inf: 'stendere i panni', ob: ['igiene'] });
  C('accendi_falo', 'oggetti', { dove: 'spiaggia', serve: ['legna', 'legno', 'cartone', 'giornale'], usa: true, eff: [['bis', 'svago', -.2], ['bis', 'compagnia', -.15], ['pubblico', .2], ['grigi', .12]], min: 40, posa: 'scalda', pitto: 'esclamativo', w: 'fuoco!', ono: 'FSST', g: 'si_sporca', modi: ['in_gruppo', 'teatrale'], d: 'ha acceso un falò', inf: 'accendere un falò', ob: ['divertirsi'], quando: c => ha(c, ['legna', 'legno', 'cartone', 'giornale']), idee: [['test', '@luogo', 'orgoglio', .2, .2]] });
  C('leggi_giornale', 'oggetti', { dove: 'qui', dentro: true, serve: ['giornale', 'rivista_proibita', 'libretto'], eff: [['bis', 'svago', -.1]], min: 15, posa: 'legge', pitto: 'fumetto', w: 'mah', d: 'ha letto {cosa}', inf: 'leggere il giornale', ob: ['divertirsi'], quando: c => ha(c, ['giornale', 'rivista_proibita', 'libretto']) });
  C('fotografa', 'oggetti', { dove: 'piazza', serve: ['fotocamera'], eff: [['bis', 'svago', -.12], ['pubblico', .05]], min: 10, posa: 'foto', pitto: 'esclamativo', w: 'cheese', ono: 'CLIC', g: 'scappa_via', d: 'ha scattato qualche foto', inf: 'fare le foto', ob: ['divertirsi'], quando: c => ha(c, ['fotocamera']), da: 'azioni:fotografa' });
  C('riempi_secchio', 'oggetti', { dove: 'lavatoio', serve: ['secchio', 'tanica_vuota', 'bottiglia_vuota'], eff: [['roba', 'acqua', 1, 1]], min: 3, posa: 'raccoglie', pitto: 'bicchiere', ono: 'GLU GLU', g: 'si_bagna', d: 'ha riempito {cosa} d\'acqua', inf: 'riempire il secchio', produce: 'acqua' });
  C('versa_secchio', 'oggetti', { chi: 'persona', r: 3, serve: ['secchio', 'acqua', 'tanica_acqua'], eff: [['repchi', 'ridicolo', .12], ['offesa', .2]], min: 1, posa: 'porge', pitto: 'bicchiere', w: 'tiè', ono: 'SPLASH', g: 'si_bagna', modi: ['per_scherzo', 'con_rabbia'], offesa: [0, 1, .3], d: 'ha rovesciato un secchio d\'acqua addosso a {B}', inf: 'rovesciare il secchio addosso', verso: 'nemico', ob: ['vendicarsi'], quando: c => ha(c, ['secchio', 'acqua', 'tanica_acqua']), filo: [['offesa', 'apre', { offensore: 'chi', offeso: 'con0' }]] });

  // ---- 4. Sociali ----
  const P_ = (k, o) => C(k, 'sociali', Object.assign({ chi: 'persona', min: 3, posa: 'discute' }, o));
  P_('saluta', { r: 7, eff: [['affetto', .03]], min: .5, posa: 'saluta', pitto: 'mano', w: 'ciao!', modi: ['teatrale', 'con_garbo'], p: .95, d: 'ha salutato {B}', inf: 'salutare', verso: 'chiunque', ob: ['socializzare'] });
  P_('ignora', { r: 7, eff: [['offesa', .05]], min: .3, pitto: 'fumetto', w: '...', offesa: [0, 1, .08], p: .95, d: 'ha fatto finta di non vedere {B}', inf: 'ignorare qualcuno', verso: 'nemico', ob: ['vendicarsi'] });
  P_('confida', { eff: [['affetto', .1], ['bis', 'compagnia', -.2]], pitto: 'fumetto', w: 'psst', modi: ['di_nascosto', 'con_garbo'], d: 'si è confidato con {B}', inf: 'confidarsi', verso: 'amico', ob: ['socializzare'] });
  P_('mente', { eff: [['convinci', 'soldi']], pitto: 'fumetto', w: 'giuro!', g: 'figuraccia', p: .6, comico: .6, modi: ['per_scherzo', 'teatrale'], d: 'ha raccontato una frottola a {B}', inf: 'raccontare una frottola', verso: 'chiunque', ob: ['socializzare'], quando: c => folle(c) || losco(c) });
  P_('prometti', { eff: [['affetto', .07]], posa: 'porge', pitto: 'stretta', w: 'parola mia', d: 'ha fatto una promessa a {B}', inf: 'fare una promessa', verso: 'amico' });
  P_('invita', { eff: [['affetto', .08], ['bis', 'compagnia', -.1]], pitto: 'orologio', w: 'vieni a cena?', modi: ['con_garbo', 'teatrale'], d: 'ha invitato {B} a cena', inf: 'invitare a cena', verso: 'amico', ob: ['socializzare'] });
  P_('consola', { eff: [['pace', .15], ['bischi', 'rabbia', -.2], ['bischi', 'paura', -.1]], pitto: 'cuore', w: 'su, su', modi: ['con_garbo'], offesa: [0, 1, -.15], d: 'ha consolato {B}', inf: 'consolare', verso: 'amico', ob: ['socializzare', 'regalare'] });
  P_('complimenta', { eff: [['social', 'apprezza'], ['affetto', .04]], pitto: 'cuore', w: 'che bello!', modi: ['teatrale', 'con_garbo'], offesa: [0, 1, -.08], d: 'ha fatto i complimenti a {B}', inf: 'fare i complimenti', verso: 'chiunque', ob: ['socializzare'], da: 'azioni:apprezza' });
  P_('sfotti', { eff: [['social', 'sfotti'], ['repchi', 'ridicolo', .05]], pitto: 'fumetto', w: 'ahah', g: 'figuraccia', modi: ['per_scherzo', 'teatrale', 'con_rabbia'], offesa: [0, 1, .2], d: 'ha preso in giro {B}', inf: 'prendere in giro', verso: 'nemico', ob: ['vendicarsi', 'divertirsi'], da: 'azioni:sfotti', filo: [['offesa', 'apre', { offensore: 'chi', offeso: 'con0' }]] });
  P_('perdona', { eff: [['pace', .2]], posa: 'porge', pitto: 'stretta', w: 'acqua passata', offesa: [1, 0, -.4], d: 'ha perdonato {B}', inf: 'perdonare', verso: 'nemico', ob: ['socializzare'], quando: c => car(c, 'rancore') < .4, filo: [['offesa', 'chiude', { offeso: 'chi', offensore: 'con0' }, { esito: 'pace' }]] });
  P_('chiedi_favore', { eff: [['affetto', -.02], ['bis', 'rabbia', -.05]], pitto: 'stretta', w: 'mi faresti…', d: 'ha chiesto un favore a {B}', inf: 'chiedere un favore', verso: 'amico', ob: ['chiedere'], da: 'risacca:chiedi_aiuto' });
  P_('corteggia', { eff: [['affetto', .1]], pitto: 'cuore', w: '♥', g: 'figuraccia', p: .6, modi: ['teatrale', 'con_garbo', 'maldestro'], d: 'ha fatto la corte a {B}', inf: 'fare la corte', verso: 'amico', ob: ['socializzare'], quando: c => !S(c.st).coppie[c.n.id], filo: [['amore', 'apre', { a: 'chi', b: 'con0' }]], da: 'eventi:corteggia' });
  P_('abbraccia', { eff: [['affetto', .12], ['bis', 'compagnia', -.2]], pitto: 'cuore', w: 'vieni qua', g: 'colpisce_altro', d: 'ha abbracciato {B}', inf: 'abbracciare', verso: 'amico', puo: (st, A, a) => (affettoDi(st, String(a.chi), A.id, 0) > .3 ? '' : 'Non c\'è tutta questa confidenza.'), ob: ['socializzare'] });
  P_('bacia', { eff: [['affetto', .2]], pitto: 'cuore', w: 'smack', ono: 'SMACK', g: 'figuraccia', modi: ['di_nascosto', 'in_pubblico'], d: 'ha baciato {B}', inf: 'baciare', verso: 'amico', puo: (st, A, a) => (affettoDi(st, String(a.chi), A.id, 0) > .45 ? '' : 'Non è il momento.'), ob: ['socializzare'], filo: [['amore', 'avanza', { a: 'chi', b: 'con0' }]], idee: [['test', '@chi', 'curiosita', .2, .2]] });
  P_('sposa', { eff: [['sposa'], ['pubblico', .3]], posa: 'porge', pitto: 'cuore', w: 'sì!', ono: 'DIN DON', g: 'figuraccia', d: 'ha sposato {B}', inf: 'sposarsi', verso: 'amico', puo: (st, A, a) => (S(st).coppie[A.id] ? 'È già sposato.' : affettoDi(st, String(a.chi), A.id, 0) > .55 ? '' : `${nome(st, a.chi)} non ci pensa nemmeno.`), ob: ['socializzare'], filo: [['amore', 'chiude', { a: 'chi', b: 'con0' }, { esito: 'sposati' }]], gz: .9, idee: [['test', '@chi', 'affetto', .3, .3]] });
  P_('giura', { eff: [['affetto', .05], ['rep', 'temuto', .01]], pitto: 'mano', w: 'lo giuro', d: 'ha giurato a {B} sulla testa di sua madre', inf: 'giurare', verso: 'amico' });
  P_('fai_da_paciere', { eff: [['rep', 'ridicolo', -.04], ['pace', .1], ['rep', 'temuto', .02]], pitto: 'stretta', w: 'calma!', g: 'colpisce_altro', d: 'ha fatto da paciere con {B}', inf: 'fare da paciere', verso: 'nemico', ob: ['socializzare'], quando: c => car(c, 'generoso') > .4 });
  P_('avvisa', { eff: [['affetto', .06], ['bischi', 'paura', .1]], pitto: 'esclamativo', w: 'arrivano!', d: 'ha avvisato {B} che arrivano i Grigi', inf: 'avvisare', verso: 'amico', puo: st_g => '', da: 'risacca:avvisa', ob: ['socializzare'], quando: c => !!grigioVicino(c.st, c.n.x, c.n.y, 40) });
  P_('racconta_barzelletta', { eff: [['bischi', 'svago', -.2], ['affetto', .04]], pitto: 'fumetto', w: 'ahah', g: 'figuraccia', modi: ['teatrale', 'maldestro'], d: 'ha raccontato una barzelletta a {B}', inf: 'raccontare una barzelletta', verso: 'chiunque', ob: ['socializzare', 'divertirsi'] });
  P_('litiga', { eff: [['social', 'litiga'], ['offesa', .1]], pitto: 'muso', w: 'basta!', modi: ['con_rabbia', 'in_pubblico'], fatto: 'lite', d: 'ha litigato con {B}', inf: 'litigare', verso: 'nemico', ob: ['vendicarsi'], da: 'azioni:litiga' });
  P_('offri_da_bere', { pre: [['v:soldi', 2]], eff: [['social', 'offri'], ['paga', 2], ['affetto', .08]], posa: 'porge', pitto: 'bicchiere', w: 'offro io', d: 'ha offerto da bere a {B}', inf: 'offrire da bere', verso: 'amico', ob: ['socializzare', 'regalare'], da: 'azioni:offri' });
  P_('gioca_a_carte', { serve: ['carte'], opz: true, eff: [['social', 'gioca'], ['bis', 'svago', -.2]], min: 30, posa: 'carte', pitto: 'fumetto', w: 'scopa!', g: 'figuraccia', d: 'ha giocato a carte con {B}', inf: 'giocare a carte', verso: 'amico', ob: ['divertirsi'], da: 'azioni:gioca' });
  P_('maledici', { eff: [['paura_chi', .15], ['offesa', .15]], pitto: 'esclamativo', w: 'malocchio!', g: 'figuraccia', modi: ['teatrale', 'di_nascosto'], offesa: [0, 1, .3], d: 'ha lanciato il malocchio a {B}', inf: 'lanciare il malocchio', verso: 'nemico', ob: ['vendicarsi'], quando: c => folle(c) || car(c, 'rancore') > .5, idee: [['con0', '@chi', 'paura', -.3, .3]], filo: [['offesa', 'apre', { offensore: 'chi', offeso: 'con0' }]] });
  P_('sfida', { r: 4, eff: [['sfida']], pitto: 'esclamativo', w: 'fatti sotto', ono: 'PAF', g: 'cade', modi: ['teatrale', 'in_pubblico'], offesa: [0, 1, .15], d: 'ha sfidato {B}[: ha vinto {vinc}]', inf: 'sfidare a duello', verso: 'nemico', ob: ['vendicarsi'], quando: c => !tratti(c.st, c.n.id).vilta || tratti(c.st, c.n.id).vilta < .5, filo: [['sfida', 'chiude', { sfidante: 'chi', sfidato: 'con0' }, { esito: 'vinta' }]], delta: [['temuto', '$vinc', 1, .5]] });
  P_('fai_la_serenata', { chi: undefined, dove: 'casa_altrui', vitt: true, piena: true, r: 8, serve: ['radiolina'], opz: true, eff: [['affetto', .12], ['pubblico', .15]], min: 10, pitto: 'cuore', w: '♪ amore', ono: 'TRALALÀ', g: 'si_bagna', modi: ['teatrale', 'maldestro'], d: 'ha fatto la serenata sotto le finestre di {B}', inf: 'fare la serenata', ob: ['socializzare'], quando: c => car(c, 'teatrale') > .4 || folle(c), filo: [['amore', 'avanza', { a: 'chi', b: 'con0' }]], da: 'estro:serenata' });
  P_('prega_per', { chi: undefined, dove: 'chiesa', vitt: true, verso: 'amico', r: 14, eff: [['fede', .12], ['affetto', .03]], min: 20, posa: 'prega', pitto: 'mano', w: 'per lui', d: 'ha acceso un cero[ per {B}]', inf: 'fare una novena', ob: ['pregare'], filo: [['fede', 'apre', { devoto: 'chi' }]] });
  P_('fai_un_voto', { chi: undefined, dove: 'chiesa', r: 14, eff: [['fede', .2]], min: 10, posa: 'prega', pitto: 'mano', w: 'giuro, santo', d: 'ha fatto un voto al santo', inf: 'fare un voto', ob: ['pregare'], filo: [['fede', 'apre', { devoto: 'chi' }]] });
  P_('parla_con', { chi: undefined, dove: 'acqua', r: 14, eff: [['bis', 'svago', -.12], ['rep', 'ridicolo', .03]], min: 15, pitto: 'fumetto', w: 'eh, mare…', g: 'si_bagna', d: 'ha parlato a lungo col mare', inf: 'parlare con il mare', ob: ['divertirsi'], quando: c => folle(c), filo: [['idea', 'apre', { portatore: 'chi' }]] });
  P_('parla_al_gabbiano', { chi: undefined, dove: 'porto', r: 14, eff: [['bis', 'svago', -.1], ['rep', 'ridicolo', .03]], min: 8, pitto: 'fumetto', w: 'Comandante…', g: 'perde_cappello', d: 'ha fatto un discorso a un gabbiano', inf: 'parlare al gabbiano', ob: ['divertirsi'], quando: c => folle(c) });
  P_('addestra', { chi: undefined, dove: 'porto', r: 14, eff: [['addestra'], ['pubblico', .1]], min: 30, pitto: 'esclamativo', w: 'seduto!', g: 'perde_cappello', p: .3, comico: .7, d: 'ha provato ad addestrare un gabbiano a portare il giornale', meta: 'il gabbiano ha imparato a metà: porta via il giornale', inf: 'addestrare un gabbiano', ob: ['divertirsi'], quando: c => folle(c) });

  // ---- 5. Economia (rubare, ricettare, spacciare, la banca, il sussidio, il cappello) ----
  const ricco = c => true;
  C('ruba_persona', 'economia', { chi: 'persona', r: 1.8, pre: [['v:pochi', 3]], eff: [['ruba', 'persona'], ['grigi', .45]], min: 1, posa: 'fruga', pitto: 'mano', w: 'zitto zitto', ono: 'ZIP', g: 'scoperto', p: .6, ill: true, modi: ['di_nascosto', 'maldestro'], fatto: 'furto', d: 'ha borseggiato {B}[ e si è preso {lire}][ e si è preso {cosaI}]', inf: 'borseggiare qualcuno', verso: 'ricco', ob: ['guadagnare'], quando: c => losco(c) && povero(c), da: 'azioni:ruba (borseggio)' });
  C('scippa', 'economia', { chi: 'persona', r: 2.2, eff: [['ruba', 'persona'], ['paura_chi', .2], ['grigi', .6]], min: .5, pitto: 'freccia', w: 'via!', ono: 'ZAC', g: 'cade', p: .55, ill: true, modi: ['con_rabbia', 'maldestro'], fatto: 'furto', d: 'ha scippato {B}[ e si è preso {lire}][ e si è preso {cosaI}]', inf: 'scippare', verso: 'ricco', ob: ['guadagnare'], quando: c => legge(c) < .25 && povero(c), da: 'azioni:ruba (scippo)' });
  C('ruba_bottega', 'economia', { dove: 'bottega', r: 8, vitt: true, pre: [['v:pochi', 4]], eff: [['ruba', 'bottega'], ['grigi', .4]], min: 2, posa: 'prende', pitto: 'mano', w: 'zitto zitto', g: 'scoperto', p: .6, ill: true, modi: ['di_nascosto', 'maldestro'], fatto: 'furto', d: 'ha fatto sparire {cosaI} dal banco di {B}', inf: 'rubare in una bottega', ob: ['guadagnare', 'mangiare'], quando: c => losco(c) && povero(c), da: 'azioni:ruba (taccheggio)' });
  C('ruba_casa', 'economia', { dove: 'casa_altrui', vitt: true, r: 6, serve: ['piede', 'grimaldello', 'cacciavite'], opz: true, pre: [['v:ora', 21, 6], ['v:pochi', 2]], eff: [['ruba', 'casa'], ['grigi', .5]], min: 15, posa: 'forza', pitto: 'piede', w: 'clic', ono: 'CRIC', g: 'resta_incastrato', p: .55, ill: true, modi: ['di_nascosto', 'maldestro'], fatto: 'furto', d: 'è entrato di notte in casa di {B}[ e ha portato via {lire}][ e ha portato via {cosaI}]', inf: 'svaligiare una casa', ob: ['guadagnare'], quando: c => legge(c) < .3, da: 'azioni:ruba (scasso), risacca:scasso' });
  C('ruba_mezzo', 'economia', { dove: 'mezzo', vitt: true, r: 4, serve: ['piede', 'grimaldello', 'cacciavite'], opz: true, pre: [['v:pochi', 3]], eff: [['ruba', 'mezzo'], ['grigi', .5]], min: 4, posa: 'forza', pitto: 'chiave', w: 'brum', ono: 'BRRRM', g: 'resta_incastrato', p: .5, ill: true, modi: ['di_nascosto', 'maldestro'], fatto: 'furto', d: 'si è preso il mezzo di {B}', inf: 'rubare un motorino', ob: ['divertirsi'], quando: c => legge(c) < .3 && folle(c), da: 'azioni:ruba (auto)' });
  C('ricetta', 'economia', { dove: 'ricettatore', serve: ILL, eff: [['ricetta'], ['grigi', .25]], min: 10, posa: 'porge', pitto: 'moneta', w: 'roba buona', g: 'scoperto', p: .75, ill: true, modi: ['di_nascosto'], fatto: 'ricettazione', d: 'ha piazzato {cosa} al ricettatore[ per {lire}]', inf: 'piazzare la roba al ricettatore', ob: ['guadagnare'], quando: c => ha(c, ILL), filo: [['traffico', 'apre', { trafficante: 'chi' }]], da: 'azioni:vendi (ricettatore)' });
  C('spaccia', 'economia', { dove: 'notte', serve: ['roba'], eff: [['spaccia'], ['grigi', .4]], min: 30, posa: 'tasche', pitto: 'moneta', w: 'psst', g: 'scoperto', p: .7, ill: true, modi: ['di_nascosto'], fatto: 'spaccio', d: 'ha spacciato[ per {lire}]', inf: 'spacciare', ob: ['guadagnare'], quando: c => ha(c, ['roba']), filo: [['traffico', 'apre', { trafficante: 'chi' }]], da: 'azioni:spaccia' });
  C('contrabbanda', 'economia', { dove: 'porto', serve: ['sigarette_contr', 'merce', 'valuta', 'marlboro', 'whisky'], usa: true, pre: [['v:ora', 22, 5]], eff: [['soldi', 8, 25], ['grigi', .4]], min: 40, posa: 'porta', pitto: 'moneta_piu', w: 'sbarco', g: 'scoperto', p: .7, ill: true, modi: ['di_nascosto'], fatto: 'contrabbando', d: 'ha fatto passare {cosa} sotto il naso della dogana[: {lire}]', inf: 'fare contrabbando', ob: ['guadagnare'], quando: c => ha(c, ['sigarette_contr', 'merce', 'valuta', 'marlboro', 'whisky']), filo: [['traffico', 'apre', { trafficante: 'chi' }]], da: 'risacca:contrabbando' });
  C('chiedi_elemosina', 'economia', { dove: 'piazza', eff: [['cappello'], ['rep', 'ridicolo', .02]], min: 40, posa: 'aspetta', pitto: 'moneta', w: 'un soldino', g: 'perde_cappello', d: 'ha chiesto l\'elemosina[: {lire}]', inf: 'chiedere l\'elemosina', ob: ['chiedere'], quando: c => (c.A.soldi || 0) < 3, da: 'eventi:mendicante' });
  C('mercanteggia', 'economia', { dove: 'bottega', r: 8, eff: [['soldi', .5, 2]], min: 8, posa: 'discute', pitto: 'moneta', w: 'troppo!', g: 'figuraccia', p: .55, modi: ['teatrale', 'con_rabbia'], d: 'ha mercanteggiato al banco[ e ha risparmiato {lire}]', inf: 'mercanteggiare', ob: ['guadagnare'], quando: c => car(c, 'avid') > .5 });
  C('gioca_al_lotto', 'economia', { dove: 'lotto', r: 12, pre: [['v:soldi', 1]], eff: [['paga', 1], ['lotto']], min: 5, posa: 'porge', pitto: 'moneta', w: 'il 47!', d: 'ha giocato i numeri al lotto[ e ha vinto {lire}]', inf: 'giocare al lotto', ob: ['divertirsi'], quando: c => povero(c) || folle(c), p: .95 });
  C('scommetti', 'economia', { chi: 'persona', pre: [['v:soldi', 2]], eff: [['scommessa'], ['bis', 'svago', -.1]], posa: 'discute', pitto: 'moneta', w: 'scommettiamo?', d: 'ha scommesso con {B}[: {lire}]', inf: 'scommettere', verso: 'amico', ob: ['divertirsi'], quando: c => car(c, 'avid') > .4, da: 'eventi:scommessa' });
  C('colletta', 'economia', { dove: 'piazza', pre: [['v:gruppo']], eff: [['cappello'], ['colletta'], ['pubblico', .1]], min: 30, posa: 'porge', pitto: 'moneta', w: 'per la causa', g: 'monete', d: 'ha fatto la colletta per il gruppo[: {lire}]', inf: 'fare la colletta', ob: ['militare'], da: 'risacca:colletta' });
  C('chiedi_prestito_banca', 'economia', { dove: 'banca', r: 12, puo: (st, A) => { const So = SO(); if (!So || !So.bankOpen) return 'Una banca non c\'è.'; try { if (!So.bankOpen(st)) return 'La banca è chiusa.'; } catch (e) { return 'La banca è chiusa.'; } return S(st).mutui[A.id] ? 'Ha già un prestito da rendere.' : (A.o && RI() && st.u.rissa && st.u.rissa.fasc[A.id] && st.u.rissa.fasc[A.id][0] >= 3 ? '«Con i suoi precedenti? Non scherziamo.»' : ''); }, eff: [['mutuo']], min: 20, posa: 'discute', pitto: 'moneta_piu', w: 'mi firmi qui', g: 'figuraccia', p: .6, comico: .3, fatto: 'mutuo', d: 'ha chiesto un prestito al Banco[: {lire}]', meta: 'il direttore ci deve pensare', inf: 'chiedere un prestito in banca', ob: ['chiedere'], quando: c => povero(c) && onesto(c) });
  C('paga_rata', 'economia', { dove: 'banca', r: 12, puo: (st, A) => (S(st).mutui[A.id] ? '' : 'Non ha debiti col Banco.'), eff: [['rata']], min: 10, posa: 'porge', pitto: 'moneta', w: 'la rata', d: 'ha pagato la rata del prestito[: {lire}]', inf: 'pagare la rata', p: .97, ob: ['riscuotere'], quando: c => !!S(c.st).mutui[c.n.id] && (c.A.soldi || 0) > 15 });
  C('chiedi_sussidio', 'economia', { dove: 'uffici', r: 14, puo: (st, A) => { const t = S(st).sussidi[A.id]; return t && st.t - t < CFG.sussidioGiorni * 1440 ? '«Ripassi il mese prossimo.»' : A.lavoro ? '«Lei lavora: niente sussidio.»' : ''; }, eff: [['sussidio']], min: 45, posa: 'aspetta', pitto: 'moneta', w: 'il modulo', g: 'figuraccia', p: .6, comico: .7, fatto: 'sussidio', d: 'ha chiesto il sussidio all\'ufficio del Garante[: {lire}]', meta: 'manca un timbro, deve tornare', inf: 'chiedere il sussidio', ob: ['chiedere'], quando: c => povero(c), idee: [['chi', 'grigi', 'fastidio', -.1, .1]] });
  C('ritira_razione', 'economia', { dove: 'uffici', r: 14, puo: (st, A) => { const t = S(st).razioni && S(st).razioni[A.id]; return t && st.t - t < 1440 * 3 ? 'La razione l\'ha già presa.' : ''; }, eff: [['roba', 'razione', 1, 1], ['razione']], min: 30, posa: 'aspetta', pitto: 'forchetta', w: 'la tessera', g: 'figuraccia', p: .8, d: 'ha ritirato la razione', meta: 'gliene hanno data metà', inf: 'ritirare la razione', ob: ['mangiare'], quando: c => povero(c), produce: 'razione' });

  // ---- 6. Lavoro e mare (l'orto) ----
  C('coltiva', 'lavoro', { dove: 'terra', r: 16, serve: ['zappa', 'pala'], opz: true, puo: (st, A) => (ortoDi(st, A.id) ? 'Ha già il suo orto.' : ''), eff: [['orto', 'pianta']], min: 60, posa: 'zappa', pitto: 'mano', w: 'semina', ono: 'TUC TUC', g: 'si_sporca', p: .8, fatto: 'orto', d: 'ha piantato un orto', inf: 'fare un orto', ob: ['guadagnare'], quando: c => !ortoDi(c.st, c.n.id) && (onesto(c) || povero(c)), filo: [['orto', 'apre', { ortolano: 'chi' }]], da: 'cantiere:cropDo' });
  C('annaffia', 'lavoro', { dove: 'terra', r: 16, calc: metaOrto, nessuno: 'Non ha un orto.', serve: ['secchio', 'tanica_acqua', 'acqua'], opz: true, eff: [['orto', 'annaffia']], min: 15, posa: 'lavora', pitto: 'bicchiere', w: 'acqua', ono: 'SPLISH', g: 'si_bagna', p: .9, fatto: 'annaffia', d: 'ha annaffiato l\'orto', inf: 'annaffiare l\'orto', ob: ['guadagnare', 'lavorare'], quando: c => { const o = ortoDi(c.st, c.n.id); return !!o && c.st.t - o[6] > 600; }, filo: [['orto', 'avanza', { ortolano: 'chi' }]] });
  C('raccogli_orto', 'lavoro', { dove: 'terra', r: 16, calc: metaOrto, nessuno: 'Non ha un orto.', puo: (st, A) => { const o = ortoDi(st, A.id); return !o ? 'Non ha un orto.' : st.t < o[5] ? 'Non è ancora pronto.' : ''; }, eff: [['orto', 'raccogli']], min: 30, posa: 'raccoglie', pitto: 'mano', w: 'che roba!', g: 'scappa_via', p: .85, fatto: 'raccolto', d: 'ha raccolto l\'orto[: {q} cassette di verdura]', inf: 'raccogliere l\'orto', ob: ['guadagnare', 'mangiare'], quando: c => { const o = ortoDi(c.st, c.n.id); return !!o && c.st.t >= o[5]; }, produce: 'verdura', filo: [['orto', 'chiude', { ortolano: 'chi' }, { esito: 'raccolto' }]], idee: [['test', '@chi', 'ammirazione', .2, .2]] });
  C('scava', 'lavoro', { dove: 'spiaggia', serve: ['pala', 'zappa', 'piccone'], opz: true, eff: [['trova', 'scava']], min: 60, posa: 'scava', pitto: 'piede', w: 'qui!', ono: 'TUNK', g: 'si_sporca', p: .6, d: 'ha scavato una buca[ e ha trovato {cosaI}]', meta: 'ha trovato un tappo di bottiglia', inf: 'scavare una buca', ob: ['divertirsi'], quando: c => folle(c), da: 'azioni:scava' });
  C('rammenda_rete', 'lavoro', { dove: 'porto', serve: ['rete_pesca', 'ago_filo'], opz: true, eff: [['soldi', 1, 4]], min: 60, posa: 'lavora', pitto: 'amo', w: 'nodo su nodo', g: 'resta_incastrato', d: 'ha rammendato le reti al porto[: {lire}]', inf: 'rammendare le reti', ob: ['guadagnare', 'lavorare'], quando: c => /pesca/i.test(String((c.A.lavoro && c.A.lavoro.mestiere) || '')) || ha(c, ['rete_pesca']) });
  C('scarica_cassette', 'lavoro', { dove: 'porto', eff: [['soldi', 2, 6], ['bis', 'sonno', .05]], min: 60, posa: 'porta', pitto: 'ingranaggio', w: 'oh issa', ono: 'TUMP', g: 'cade', d: 'ha scaricato cassette al porto[ per {lire}]', inf: 'scaricare le cassette', ob: ['guadagnare'], quando: c => povero(c) && !c.A.lavoro });
  C('consegna', 'lavoro', { dove: 'bottega', r: 8, eff: [['soldi', 2, 5]], min: 25, posa: 'porta', pitto: 'freccia', w: 'consegna!', g: 'scappa_via', d: 'ha fatto una consegna[ per {lire}]', meta: 'ha sbagliato indirizzo, poi l\'ha trovato', inf: 'fare una consegna', ob: ['guadagnare'], quando: c => povero(c), da: 'eventi:fattorino' });
  C('sciopera', 'lavoro', { dove: 'protesta', r: 16, pre: [['v:lavoro']], eff: [['sciopera'], ['pubblico', .15], ['grigi', .2], ['bis', 'rabbia', -.2]], min: 60, posa: 'aspetta', pitto: 'esclamativo', w: 'sciopero!', g: 'figuraccia', modi: ['in_gruppo', 'in_pubblico'], fatto: 'sciopero', d: 'ha incrociato le braccia[ ({mestiere})]', inf: 'scioperare', ob: ['militare'], quando: c => (c.A.bisogni && c.A.bisogni.rabbia > .4) || (ID() && ID().di(c.st, c.n.id).some(e => ID().soggDi(e[0]) === 'grigi' && e[1] < -.3)), idee: [['chi', 'grigi', 'rancore', -.2, .2], ['test', 'grigi', 'curiosita', -.1, .15]], filo: [['protesta', 'apre', { promotore: 'chi' }]] });
  C('soccorri', 'lavoro', { chi: 'persona', r: 2.5, puo: (st, A, a) => { const k = npc(st, a.chi); return k && (k.stun > .5 || (k.maxHp && k.hp < k.maxHp * .5)) ? '' : 'Sta bene.'; }, eff: [['rep', 'ridicolo', -.04], ['soccorri'], ['affetto', .2]], min: 3, posa: 'raccoglie', pitto: 'cuore', w: 'su, su', d: 'ha soccorso {B}', inf: 'soccorrere', verso: 'ferito', ob: ['socializzare'], da: 'azioni:soccorri' });

  // ---- 7. Conflitto ----
  C('schiaffo', 'conflitto', { chi: 'persona', r: 1.8, eff: [['repchi', 'ridicolo', .08], ['offesa', .3], ['paura_chi', .05]], min: .3, posa: 'mira', pitto: 'mano', w: 'tiè', ono: 'SCIAFF', g: 'colpisce_altro', modi: ['con_rabbia', 'in_pubblico'], offesa: [0, 1, .45], fatto: 'schiaffo', d: 'ha dato uno schiaffo a {B}', inf: 'dare uno schiaffo', verso: 'nemico', ob: ['vendicarsi'], quando: c => c.A.bisogni && c.A.bisogni.rabbia > .4, filo: [['offesa', 'apre', { offensore: 'chi', offeso: 'con0' }]] });
  C('sabota', 'conflitto', { chi: 'persona', r: 5, pre: [['v:pochi', 2]], eff: [['sabota'], ['grigi', .2]], min: 6, posa: 'forza', pitto: 'piede', w: 'zitto zitto', ono: 'CRAC', g: 'scoperto', p: .65, ill: true, modi: ['di_nascosto', 'maldestro'], offesa: [0, 1, .5], fatto: 'sabotaggio', d: 'ha sabotato la roba di {B}[: {rotto}]', inf: 'sabotare', verso: 'nemico', ob: ['vendicarsi'], quando: c => legge(c) < .5, filo: [['offesa', 'apre', { offensore: 'chi', offeso: 'con0' }]], da: 'risacca:sabota' });
  C('pedina', 'conflitto', { chi: 'persona', r: 16, eff: [['bis', 'svago', -.05]], min: 20, posa: 'cammina', pitto: 'freccia', w: '…', g: 'scoperto', p: .7, modi: ['di_nascosto', 'maldestro'], offesa: [0, 1, .05], d: 'ha seguito {B} di nascosto', inf: 'pedinare', verso: 'nemico', ob: ['vendicarsi'], quando: c => car(c, 'rancore') > .4, da: 'risacca:pedina' });
  C('insegui', 'conflitto', { chi: 'persona', r: 12, eff: [['paura_chi', .12]], min: 2, posa: 'cammina', pitto: 'freccia', w: 'fermo lì!', ono: 'TAP TAP', g: 'cade', p: .5, modi: ['con_rabbia', 'maldestro'], d: 'ha inseguito {B}', inf: 'inseguire', verso: 'nemico', ob: ['vendicarsi'], quando: c => c.A.bisogni && c.A.bisogni.rabbia > .5 });
  C('spia_ai_grigi', 'conflitto', { dove: 'commissariato', vitt: true, vittObb: true, verso: 'nemico', r: 14, eff: [['delazione'], ['soldi', 2, 10]], min: 15, posa: 'discute', pitto: 'esclamativo', w: 'ho visto io…', g: 'scoperto', p: .7, offesa: [0, 1, .6], fatto: 'delazione', d: 'ha fatto la spia ai Grigi[ su {B}]', inf: 'fare la spia ai Grigi', ob: ['vendicarsi'], quando: c => legge(c) > .65, idee: [['test', 'grigi', 'paura', -.2, .2]], filo: [['offesa', 'apre', { offensore: 'chi', offeso: 'con0' }]], delta: [['libero', 'con0', -1, .5]] });
  C('incendia', 'conflitto', { dove: 'cassonetto', serve: ['fiammiferi', 'accendino'], eff: [['fuoco'], ['pubblico', .2], ['grigi', .5], ['bis', 'rabbia', -.3]], min: 3, posa: 'scalda', pitto: 'esclamativo', w: 'brucia!', ono: 'FUUUSH', g: 'si_sporca', p: .7, ill: true, modi: ['con_rabbia', 'di_nascosto'], fatto: 'incendio', d: 'ha dato fuoco a un cassonetto', inf: 'dare fuoco al cassonetto', ob: ['vendicarsi'], quando: c => folle(c) && c.A.bisogni && c.A.bisogni.rabbia > .5, idee: [['test', '@luogo', 'paura', -.25, .25]] });
  C('spegni_fuoco', 'conflitto', { dove: 'cassonetto', r: 30, puo: st => ((S(st).fuochi || []).some(q => q[2] > st.t) ? '' : 'Non brucia niente.'), serve: ['secchio', 'acqua', 'coperta'], opz: true, eff: [['rep', 'ridicolo', -.04], ['spegni'], ['pubblico', .2], ['rep', 'temuto', .02]], min: 5, posa: 'lavora', pitto: 'bicchiere', w: 'acqua!', ono: 'PSSST', g: 'si_bagna', d: 'ha spento il fuoco', inf: 'spegnere il fuoco', ob: ['socializzare'], quando: c => (S(c.st).fuochi || []).some(q => q[2] > c.st.t && hyp(q[0] - c.n.x, q[1] - c.n.y) < 120), idee: [['test', '@chi', 'ammirazione', .25, .25]] });
  C('lancia_uova', 'conflitto', { chi: 'persona', r: 12, serve: ['uova', 'pomodori'], usa: true, eff: [['repchi', 'ridicolo', .12], ['offesa', .2]], min: .3, posa: 'mira', pitto: 'esclamativo', w: 'tiè!', ono: 'SPLAT', g: 'colpisce_altro', p: .55, modi: ['per_scherzo', 'con_rabbia', 'di_nascosto'], offesa: [0, 1, .25], fatto: 'lancio_uova', d: 'ha tirato {cosaI} in testa a {B}', inf: 'tirare le uova', verso: 'nemico', ob: ['vendicarsi'], quando: c => ha(c, ['uova', 'pomodori']), filo: [['offesa', 'apre', { offensore: 'chi', offeso: 'con0' }]] });
  C('corrompi_guardia', 'conflitto', { dove: 'commissariato', vitt: true, vittObb: true, verso: 'carcerato', r: 14, pre: [['v:soldi', 15]], eff: [['paga', 15], ['libera'], ['corrompi'], ['grigi', .3]], min: 10, posa: 'porge', pitto: 'moneta', w: 'per il disturbo', g: 'scoperto', p: .5, ill: true, modi: ['di_nascosto'], fatto: 'corruzione', d: 'ha allungato una busta a un Grigio[ per far uscire {B}]', inf: 'comprarsi una guardia', quando: c => (c.A.soldi || 0) > 30 && losco(c) });

  // ---- 10. Città, istituzioni e Grigi ----
  C('manifesta', 'citta', { dove: 'protesta', r: 16, eff: [['raduna', 'grigi'], ['pubblico', .3], ['grigi', .45], ['bis', 'rabbia', -.2]], min: 40, posa: 'discute', pitto: 'esclamativo', w: 'abbasso!', ono: 'BUUU', g: 'figuraccia', modi: ['in_gruppo', 'in_pubblico', 'teatrale'], fatto: 'manifestazione', d: 'ha manifestato contro i Grigi', inf: 'manifestare contro i Grigi', ob: ['militare'], quando: c => (ID() && ID().di(c.st, c.n.id).some(e => ID().soggDi(e[0]) === 'grigi' && e[1] < -.3)), idee: [['chi', 'grigi', 'rancore', -.3, .3], ['test', 'grigi', 'curiosita', -.15, .15], ['con', 'grigi', 'rancore', -.3, .3]], filo: [['protesta', 'apre', { promotore: 'chi', compagno: 'con0' }]], gz: .8 });
  C('radunati', 'citta', { dove: 'piazza', r: 16, eff: [['raduna', null], ['bis', 'compagnia', -.2], ['pubblico', .15]], min: 30, posa: 'discute', pitto: 'stretta', w: 'tutti qui!', g: 'figuraccia', modi: ['in_gruppo'], fatto: 'raduno', d: 'ha radunato la gente', inf: 'radunare la gente', ob: ['militare', 'socializzare'], quando: c => !!(GR() && GR().gruppoDi(c.st, c.n.id)), filo: [['protesta', 'apre', { promotore: 'chi', compagno: 'con0' }]] });
  C('corteo', 'citta', { dove: 'protesta', r: 16, pre: [['v:gruppo']], eff: [['raduna', 'grigi'], ['pubblico', .4], ['grigi', .6]], min: 60, posa: 'cammina', pitto: 'esclamativo', w: 'tutti in piazza!', ono: 'OH OH', g: 'figuraccia', modi: ['in_gruppo', 'teatrale'], fatto: 'corteo', d: 'ha portato un corteo per le vie', inf: 'fare un corteo', ob: ['militare'], idee: [['test', 'grigi', 'rancore', -.2, .2], ['con', 'grigi', 'orgoglio', -.3, .3]], filo: [['protesta', 'avanza', { promotore: 'chi', compagno: 'con0' }]], gz: .9 });
  C('batti_pentole', 'citta', { dove: 'piazza', serve: ['pentola', 'padella', 'latta'], opz: true, eff: [['pubblico', .2], ['grigi', .2], ['bis', 'rabbia', -.15]], min: 15, posa: 'martella', pitto: 'esclamativo', w: 'dang dang', ono: 'DANG DANG', g: 'scappa_via', modi: ['in_gruppo', 'con_rabbia'], fatto: 'pentolata', d: 'ha battuto le pentole contro i Grigi', inf: 'battere le pentole', ob: ['militare'], quando: c => c.A.bisogni && c.A.bisogni.rabbia > .35, idee: [['test', 'grigi', 'rancore', -.15, .15]], filo: [['protesta', 'avanza', { promotore: 'chi' }]], da: 'estro:pentole' });
  C('affiggi_manifesto', 'citta', { dove: 'muro', serve: ['poster', 'volantini'], usa: true, eff: [['pubblico', .15], ['grigi', .3]], min: 10, posa: 'attacchina', pitto: 'pennello', w: 'leggete!', g: 'si_sporca', ill: true, modi: ['di_nascosto'], fatto: 'manifesto', d: 'ha attaccato un manifesto sul muro', inf: 'attaccare i manifesti', ob: ['militare', 'dipingere'], quando: c => ha(c, ['poster', 'volantini']), idee: [['test', 'grigi', 'rancore', -.15, .15]], da: 'eventi:attacchino, azioni:attacca' });
  C('volantina', 'citta', { dove: 'piazza', serve: ['volantini'], usa: true, eff: [['pubblico', .15], ['grigi', .35]], min: 20, posa: 'porge', pitto: 'mano', w: 'prendete', g: 'scappa_via', ill: true, modi: ['di_nascosto', 'in_pubblico'], fatto: 'volantinaggio', d: 'ha distribuito volantini', inf: 'distribuire volantini', ob: ['militare'], quando: c => ha(c, ['volantini']), idee: [['test', 'grigi', 'rancore', -.2, .2]], da: 'risacca:volantina' });
  C('firma_petizione', 'citta', { dove: 'piazza', eff: [['pubblico', .05], ['bis', 'rabbia', -.05]], min: 10, posa: 'disegna', pitto: 'pennello', w: 'firmo', fatto: 'petizione', d: 'ha raccolto firme per una petizione', inf: 'raccogliere le firme', ob: ['militare'], quando: c => onesto(c), idee: [['test', '@luogo', 'speranza', .15, .15]] });
  C('fai_la_fila', 'citta', { dove: 'uffici', r: 14, eff: [['bis', 'rabbia', .1], ['bis', 'compagnia', -.05]], min: 60, posa: 'aspetta', pitto: 'orologio', w: 'quanto manca?', g: 'figuraccia', p: .9, d: 'ha fatto un\'ora di fila', inf: 'fare la fila', da: 'iniziative:fila' });
  C('chiedi_certificato', 'citta', { dove: 'uffici', r: 14, eff: [['roba', 'moduli', 1, 1]], min: 40, posa: 'discute', pitto: 'fumetto', w: 'il timbro…', g: 'figuraccia', p: .35, comico: .7, d: 'ha chiesto un certificato', meta: 'gli manca il certificato per chiedere il certificato', inf: 'chiedere un certificato', ob: ['chiedere'], quando: c => onesto(c) });
  C('eleggi', 'citta', { chi: 'persona', pre: [['v:gruppo']], puo: (st, A, a) => { const Gr = GR(), g = Gr && Gr.gruppoDi(st, A.id); return g && g.membri.includes(String(a.chi)) && g.capo !== String(a.chi) ? '' : 'Non è del gruppo.'; }, eff: [['capo'], ['affetto', .1]], posa: 'stretta', pitto: 'stretta', w: 'evviva!', modi: ['in_gruppo', 'teatrale'], fatto: 'elezione', d: 'ha fatto eleggere {B} capo del gruppo', inf: 'eleggere un capo', verso: 'gruppo', ob: ['militare'], quando: c => { const Gr = GR(), g = Gr && Gr.gruppoDi(c.st, c.n.id); return !!g && g.capo !== c.n.id; }, filo: [['gruppo', 'avanza', { capo: 'con0', membro: 'chi' }]] });
  C('processa', 'citta', { chi: 'persona', r: 3, pre: [['v:gruppo']], eff: [['repchi', 'ridicolo', .15], ['rep', 'temuto', .08], ['offesa', .3]], min: 20, posa: 'discute', pitto: 'esclamativo', w: 'colpevole!', g: 'figuraccia', modi: ['in_gruppo', 'teatrale'], offesa: [0, 1, .35], fatto: 'processo', d: 'ha messo sotto processo {B} davanti a tutti', inf: 'fare il processo', verso: 'nemico', ob: ['militare'], idee: [['test', '@chi', 'paura', -.2, .2]], filo: [['offesa', 'apre', { offensore: 'chi', offeso: 'con0' }]] });
  C('suona_campane', 'citta', { dove: 'campanile', r: 14, eff: [['pubblico', .3], ['grigi', .1], ['bis', 'svago', -.2]], min: 5, posa: 'forza', pitto: 'esclamativo', w: 'din don!', ono: 'DONG DONG', g: 'resta_incastrato', modi: ['teatrale', 'per_scherzo'], fatto: 'campane', d: 'ha suonato le campane a distesa', inf: 'suonare le campane', ob: ['divertirsi'], quando: c => folle(c), idee: [['test', '@luogo', 'curiosita', .2, .2]] });
  C('fai_comizio', 'citta', { dove: 'piazza', eff: [['raduna', null], ['pubblico', .4], ['grigi', .35]], min: 30, posa: 'discute', pitto: 'esclamativo', w: 'cittadini!', g: 'figuraccia', modi: ['teatrale', 'in_pubblico'], fatto: 'comizio', d: 'ha tenuto un comizio', inf: 'fare un comizio', ob: ['militare'], quando: c => tratti(c.st, c.n.id).carisma > .5, idee: [['test', 'grigi', 'rancore', -.15, .15]], filo: [['protesta', 'apre', { promotore: 'chi', compagno: 'con0' }]], da: 'eventi:comizio' });
  C('intesta', 'citta', { dove: 'uffici', r: 14, eff: [['pubblico', .1], ['rep', 'ridicolo', .05]], min: 30, posa: 'discute', pitto: 'fumetto', w: 'al mio gatto', ono: 'TUMP', g: 'figuraccia', p: .15, comico: .9, d: 'ha provato a intestare la casa al suo gatto', meta: 'l\'impiegato ha timbrato lo stesso, poi ha strappato tutto', inf: 'intestare la casa al gatto', quando: c => folle(c), ob: ['divertirsi'] });

  // ---- 11. Circo, tetti e surreale ----
  C('giocola', 'circo', { dove: 'piazza', serve: ['arance', 'mele', 'limoni', 'patate', 'uova', 'frutta'], opz: true, eff: [['rep', 'ridicolo', -.04], ['cappello'], ['pubblico', .2]], min: 20, posa: 'porge', pitto: 'esclamativo', w: 'oplà', ono: 'OPLÀ', g: 'scappa_via', p: .6, modi: ['teatrale', 'maldestro'], fatto: 'esibizione', d: 'ha fatto il giocoliere[ con {cosaI}][: {lire} nel cappello]', inf: 'fare il giocoliere', ob: ['divertirsi', 'guadagnare'], quando: c => car(c, 'teatrale') > .45 || folle(c) });
  C('fai_il_mimo', 'circo', { dove: 'piazza', eff: [['rep', 'ridicolo', -.04], ['cappello'], ['pubblico', .2]], min: 20, posa: 'balla', pitto: 'fumetto', w: '…', g: 'figuraccia', p: .65, modi: ['teatrale'], fatto: 'esibizione', d: 'ha fatto il mimo davanti a tutti[: {lire} nel cappello]', inf: 'fare il mimo', ob: ['divertirsi', 'guadagnare'], quando: c => car(c, 'teatrale') > .55 });
  C('statua_vivente', 'circo', { dove: 'piazza', eff: [['cappello'], ['bis', 'sonno', .05]], min: 60, posa: 'aspetta', pitto: 'esclamativo', w: '…', g: 'figuraccia', p: .7, fatto: 'esibizione', d: 'ha fatto la statua vivente per un\'ora[: {lire} nel cappello]', meta: 'un bambino gli ha fatto il solletico', inf: 'fare la statua vivente', ob: ['guadagnare'], quando: c => car(c, 'teatrale') > .5 && povero(c) });
  C('suona', 'circo', { dove: 'piazza', serve: ['radiolina', 'pentola', 'dischi'], opz: true, eff: [['rep', 'ridicolo', -.04], ['cappello'], ['pubblico', .2], ['bis', 'svago', -.15]], min: 25, posa: 'discute', pitto: 'fumetto', w: '♪', ono: 'ZUM PA', g: 'figuraccia', p: .65, modi: ['teatrale', 'in_gruppo', 'maldestro'], fatto: 'esibizione', d: 'ha suonato[ con {cosaI}][: {lire} nel cappello]', inf: 'suonare', ob: ['divertirsi', 'guadagnare'], quando: c => car(c, 'teatrale') > .35 || folle(c) });
  C('passa_il_cappello', 'circo', { dove: 'piazza', eff: [['cappello']], min: 10, posa: 'porge', pitto: 'moneta', w: 'grazie!', g: 'perde_cappello', fatto: 'esibizione', d: 'ha passato il cappello[: {lire}]', inf: 'passare il cappello', ob: ['guadagnare'], quando: c => fama(c.st, c.n.id) > .2, da: 'iniziative:esibisci' });
  C('fai_le_carte', 'circo', { chi: 'persona', serve: ['carte'], eff: [['paga_da', 1, 4], ['bischi', 'paura', .05]], min: 15, posa: 'carte', pitto: 'fumetto', w: 'vedo, vedo…', g: 'figuraccia', modi: ['teatrale'], d: 'ha letto il futuro nelle carte a {B}[ per {lire}]', inf: 'fare le carte', verso: 'chiunque', ob: ['guadagnare'], quando: c => ha(c, ['carte']) && (folle(c) || car(c, 'teatrale') > .5) });
  C('fai_aquilone', 'circo', { dove: 'spiaggia', serve: ['carta', 'giornale', 'stoffa', 'telo'], usa: true, eff: [['bis', 'svago', -.2], ['pubblico', .1]], min: 30, posa: 'osserva', pitto: 'freccia', w: 'vola!', ono: 'FRRR', g: 'scappa_via', p: .5, d: 'ha fatto volare un aquilone di {cosa}', inf: 'far volare un aquilone', ob: ['divertirsi'], quando: c => ha(c, ['carta', 'giornale', 'stoffa', 'telo']) });

  // ---- 12. Muri e arte ----
  C('disegna_col_gesso', 'muri', { dove: 'piazza', serve: ['gesso'], eff: [['pubblico', .1], ['bis', 'svago', -.15]], min: 20, posa: 'gesso', pitto: 'pennello', w: 'campana', g: 'si_sporca', d: 'ha disegnato col gesso sul lastrico', inf: 'disegnare col gesso', ob: ['divertirsi', 'dipingere'], quando: c => ha(c, ['gesso']), da: 'eventi:gessetti' });
  C('cancella_scritta', 'muri', { dove: 'muro', serve: ['secchio', 'spugne', 'vernice', 'stracci'], opz: true, eff: [['pubblico', .05]], min: 25, posa: 'spazza', pitto: 'mano', w: 'via!', g: 'si_sporca', fatto: 'ripulito', d: 'ha cancellato una scritta dal muro', inf: 'cancellare le scritte', ob: ['lavorare'], quando: c => legge(c) > .7 });
  C('ritratto', 'muri', { chi: 'persona', serve: ['carta', 'quaderno', 'cartoncino'], opz: true, eff: [['paga_da', 1, 3], ['affetto', .05]], min: 20, posa: 'disegna', pitto: 'pennello', w: 'fermo così', g: 'figuraccia', p: .6, modi: ['teatrale', 'maldestro'], d: 'ha fatto il ritratto a {B}[ per {lire}]', meta: 'non gli somiglia per niente', inf: 'fare un ritratto', verso: 'chiunque', ob: ['guadagnare', 'dipingere'], quando: c => car(c, 'teatrale') > .5, da: 'estro:ritratti' });

  C('diffama', 'muri', { dove: 'muro', vitt: true, vittObb: true, verso: 'nemico', serve: ['gesso', 'bomboletta', 'pennarello', 'carbone'], opz: true, eff: [['repchi', 'ridicolo', .12], ['offesa', .2], ['grigi', .15]], min: 10, posa: 'vernicia', pitto: 'bomboletta', w: 'tiè', g: 'scoperto', ill: true, modi: ['di_nascosto', 'per_scherzo'], offesa: [0, 1, .3], fatto: 'diffamazione', d: 'ha scritto sul muro una strofetta su {B}', inf: 'scrivere sul muro contro qualcuno', ob: ['vendicarsi'], quando: c => car(c, 'rancore') > .3, filo: [['offesa', 'apre', { offensore: 'chi', offeso: 'con0' }], ['muro', 'apre', { writer: 'chi' }]], idee: [['test', '@con0', 'disprezzo', -.2, .2]] });
  C('candidati', 'citta', { dove: 'piazza', pre: [['v:gruppo']], puo: (st, A) => { const Gr = GR(), g = Gr && Gr.gruppoDi(st, A.id); return g && g.capo !== A.id ? '' : 'Comanda già lui.'; }, eff: [['capoio'], ['pubblico', .15]], min: 20, posa: 'discute', pitto: 'esclamativo', w: 'votate me!', g: 'figuraccia', p: .45, modi: ['teatrale', 'in_pubblico'], fatto: 'candidatura', d: 'si è proposto come capo del gruppo', meta: 'l\'hanno applaudito, ma il capo resta l\'altro', inf: 'farsi eleggere capo', ob: ['militare'], quando: c => tratti(c.st, c.n.id).carisma > .45, filo: [['gruppo', 'avanza', { capo: 'chi' }]] });
  // ---- 3b. La casa (casa.js: i verbi di Casa.VERBI, che c'erano solo dentro la casa: Casa.fai, strategia A) ----
  for (const [k, v, d, inf, w, posa] of [['riordina_casa', 'riordina', 'ha rimesso in ordine casa', 'riordinare casa', 'che disordine', 'raccoglie'], ['sporca_casa', 'sporca', 'ha lasciato casa sottosopra', 'mettere casa sottosopra', 'pazienza', 'fruga'],
    ['fai_una_talea', 'pianta', 'ha fatto una talea dalla pianta di casa', 'fare una talea', 'verde', 'zappa'], ['butta_ciarpame', 'butta', 'ha buttato via il ciarpame di casa', 'buttare il ciarpame', 'via!', 'raccoglie'],
    ['sedia_alla_finestra', 'finestra', 'ha messo la sedia alla finestra', 'mettersi alla finestra', 'che si vede?', 'porta'], ['sposta_la_tv', 'tv', 'ha messo la televisione in mezzo alla stanza', 'guardarsi la televisione', 'la partita', 'porta']])
    C(k, 'luoghi', { dove: 'casa', r: 8, eff: [['casafai', v], ['bis', 'svago', -.05]], min: 15, posa, pitto: 'casetta', w, g: 'figuraccia', p: .9, d, inf, ob: ['arredare'], da: 'casa:' + v });

  // ---- 6b. I mestieri (mestieri.js: le 40 abilità del lavoro, che il giocatore aveva nel menu: Mestieri.perform, strategia A) ----
  { const M = MS();
    if (M && M.AB) for (const id in M.AB) {
      const A0 = M.AB[id], soldi = /money\(/.test(String(A0.run)), ill = !!A0.ev, lab = String(A0.label || id), inf = lab[0].toLowerCase() + lab.slice(1);
      C('arte_' + id, 'lavoro', { dove: 'lavoro', r: 14, pre: [['v:lavoro']], puo: (st, A) => { const L = M.abilities(st, isP(st, A) ? 'player' : A.o) || []; return L.includes(id) ? '' : 'Non è il suo mestiere.'; },
        eff: [['mestiere', id]].concat(soldi ? [['soldi', 0, 0]] : []), min: Math.min(120, A0.mins || 30), posa: 'lavora', pitto: ill ? 'chiave' : 'ingranaggio', w: ill ? 'zitto zitto' : 'al lavoro', g: ill ? 'scoperto' : 'figuraccia', p: .97, comico: .2,
        ill, fatto: ill ? 'mestiere_losco' : 'mestiere', d: 'si è messo a ' + inf, inf, ob: ['lavorare'], quando: c => !A0.night || G.isNight && G.isNight(c.st), soldiM: soldi, da: 'mestieri:' + id });
    } }

  // ======================= IL COMPILATORE: la carta → la scheda di Verbo =======================
  // gli atomi con una «chiave» diventano termini col nome composto ('v:bis:svago-'), perché l'indice dei desideri legge il nome
  const CHIAVE = { rep: 1, repchi: 1, bis: 1, bischi: 1, ruba: 1, orto: 1, social: 1, casafai: 1, mestiere: 1, trova: 1 };
  const EFFV_A = {
    tira: [], fine: [], soldi: [['soldi', 1, 'io']], paga: [['soldi', -1, 'io']], roba: [['possiede', 1, 'io']], quota: [['quota', 1, 'io']], pubblico: [['pubblico', 1, 'io']],
    affetto: [['affetto', 1, 'chi']], pace: [['rancore', -1, 'chi'], ['affetto', 1, 'chi']], offesa: [['affetto', -1, 'chi']], paura_chi: [['bisogno:paura', 1, 'chi']], libera: [['libero', 1, 'chi']], capo: [['capo', 1, 'chi']],
    casa: [['casa', 1, 'io']], fede: [['fede', 1, 'io'], ['bisogno:paura', -1, 'io']], sposa: [['affetto', 1, 'chi'], ['sposato', 1, 'io']], addestra: [['pubblico', 1, 'io']], ricetta: [['soldi', 1, 'io'], ['possiede', -1, 'io']],
    spaccia: [['soldi', 1, 'io']], mutuo: [['soldi', 1, 'io']], sussidio: [['soldi', 1, 'io']], cappello: [['soldi', 1, 'io'], ['pubblico', 1, 'io']], raduna: [['pubblico', 1, 'io'], ['bisogno:compagnia', -1, 'io']],
    grigi: [], sabota: [['possiede', -1, 'chi'], ['affetto', -1, 'chi']], sfida: [['temuto', 1, 'io'], ['ridicolo', 1, 'chi']], consuma: [], sciopera: [['pubblico', 1, 'io']], convinci: [['idea_di', 1, 'chi']],
    ripara: [['possiede', 1, 'io']], scendi: [], lotto: [['soldi', 1, 'io']], scommessa: [['soldi', 1, 'io']], paga_da: [['soldi', 1, 'io']], colletta: [], rata: [], delazione: [['libero', -1, 'chi'], ['fascicolo', 1, 'chi']],
    corrompi: [['fascicolo', -1, 'io']], capoio: [['capo', 1, 'io']], fuoco: [['pubblico', 1, 'io']], spegni: [['pubblico', 1, 'io']], soccorri: [['salute', 1, 'chi'], ['affetto', 1, 'chi']], razione: [],
    'ruba:persona': [['soldi', 1, 'io'], ['possiede', 1, 'io'], ['soldi', -1, 'chi'], ['possiede', -1, 'chi']], 'ruba:bottega': [['possiede', 1, 'io']], 'ruba:casa': [['soldi', 1, 'io'], ['possiede', 1, 'io'], ['soldi', -1, 'chi'], ['possiede', -1, 'chi']],
    'ruba:mezzo': [['velocita', 1, 'io'], ['possiede', -1, 'chi']], 'orto:pianta': [['orto', 1, 'io']], 'orto:annaffia': [['orto', 1, 'io']], 'orto:raccogli': [['possiede', 1, 'io']],
    'social:sfotti': [['ridicolo', 1, 'chi']], 'social:apprezza': [['affetto', 1, 'chi']], 'social:offri': [['affetto', 1, 'chi']], 'social:gioca': [['bisogno:svago', -1, 'io']], 'social:litiga': [['rancore', 1, 'chi']],
  };
  const TERMINI = new Set();
  function termine(e) {
    const a = e[0]; let nome = 'v:' + a, args = e.slice(1);
    if (CHIAVE[a]) { const k = e[1], x = e[2]; nome = 'v:' + a + ':' + k + ((a === 'rep' || a === 'repchi' || a === 'bis' || a === 'bischi') ? (+x < 0 ? '-' : '+') : ''); args = e.slice(2);
      if (!V.EFF[nome]) V.EFF[nome] = (c, p1, p2, p3) => V.EFF['v:' + a](c, k, p1, p2, p3);
      let L = EFFV_A[a + ':' + k];
      if (!L && (a === 'rep' || a === 'repchi')) L = [[k, +x < 0 ? -1 : 1, a === 'rep' ? 'io' : 'chi']];
      if (!L && (a === 'bis' || a === 'bischi')) L = [['bisogno:' + k, +x < 0 ? -1 : 1, a === 'bis' ? 'io' : 'chi']];
      if (!L && a === 'mestiere') L = CARTE['arte_' + k] && CARTE['arte_' + k].soldiM ? [['soldi', 1, 'io']] : [];
      if (!L && a === 'trova') L = [['possiede', 1, 'io']];
      EFFV_A[a + ':' + k] = L || [];
      if (UD() && UD().EFFV) UD().EFFV[nome] = L || [];
    } else if (UD() && UD().EFFV && !UD().EFFV[nome]) UD().EFFV[nome] = EFFV_A[a] || [];
    if (!V.EFF[nome]) throw new Error('[Vocabolario] atomo sconosciuto: ' + a);
    TERMINI.add(nome); return [nome].concat(args);
  }
  // il conto (deterministico in puo e compi): il modo, la meta, la cosa che serve, la durata, chi guarda
  function calc(st, A, a, d, v) {
    const K = CARTE[v]; d.modo = modoDi(st, A, K, a);
    if (K.chi === 'persona') { if (a.chi != null) { const B = AT().di(st, a.chi); if (B) { d.x = B.x; d.y = B.y; } } }
    else { const t = metaDi(st, A, K, a); if (t) Object.assign(d, t); }
    if (K.vitt && a.vitt != null && d.vitt == null) d.vitt = String(a.vitt);
    if (K.dove === 'bottega' && d.bott != null && d.vitt == null) { const Sh = bottegaVicina(st, A, d.bott); if (Sh && Sh.t) { const k = st.npcs.find(q => q.pop && q.pop.job && q.pop.job.t && hyp(q.pop.job.t.x - Sh.t.x, q.pop.job.t.y - Sh.t.y) < 2 && q !== A.o); if (k) d.vitt = k.id; } }
    if (K.serve) { d.cosa = a.cosa && A.borsa.get(a.cosa) >= 1 && K.serve.includes(a.cosa) ? a.cosa : K.serve.find(k => A.borsa.get(k) >= 1) || null; d.senza = !d.cosa; }
    d.min = r1(Math.max(.3, (K.min || 5) * (d.modo === 'teatrale' ? 1.4 : d.modo === 'di_nascosto' ? 1.2 : d.modo === 'in_gruppo' ? 1.3 : 1)));
    if (K.pochi) d.test = testimoni(st, A.x, A.y, [A.id, a.chi, d.vitt].filter(x => x != null).map(String), CFG.testR).length;
    if (K.calc) K.calc(st, A, a, d);
  }
  const LOC = new Set(['v:qui', 'vicino', 'v:fuori', 'v:pochi', 'v:ora']);
  let nuovi = 0, prima = 0, collisioni = [];
  function compila(k, K) {
    K.k = k; K.pochi = (K.pre || []).some(t => t[0] === 'v:pochi');
    const pre = [['vivo'], ['v:libero']];
    if (K.chi === 'persona') pre.push(['altro', '$chi'], ['vicino', 'persona', '$chi', K.r || CFG.persona]);
    else if (K.dove && K.dove !== 'qui') pre.push(['v:qui', K.r || CFG.qui]);
    if (K.chi !== 'persona' && K.dove !== 'casa' && !K.dentro) pre.push(['v:fuori']);
    if (K.vittObb) pre.push(['v:vitt']);
    if (K.serve) pre.push(['v:serve']);
    for (const t of K.pre || []) pre.push(t);
    if (K.puo) pre.push(['v:k']);
    const eff = [['v:tira']].concat((K.eff || []).map(termine), [['v:fine']]);
    const S0 = { fam: K.dove === 'casa' ? 'casa' : K.f, famVoc: K.f, voc: 1, args: K.chi === 'persona' ? { chi: 'attore', modo: 'modo?' } : { posto: 'posto?', modo: 'modo?', vitt: 'attore?' }, pre, eff,
      costo: { min: '$min', rischio: K.ill ? .3 : K.rischio || 0, fatica: K.fatica || .01 }, posa: K.posa || 'discute', segno: { bolla: [K.pitto || 'fumetto', K.w || K.inf || k], cambia: K.cambia || null, ono: K.ono || null },
      fatto: K.fatto || k, menu: false, illegale: !!K.ill, esiti: { ok: 'riesce', meta: 'a metà', comico: 'GUASTI:' + (K.g || 'figuraccia') }, da: K.da || null };
    if (K.serve) S0.oggetto = '$cosa';
    if (K.chi === 'persona') { S0.dove = ['persona', '$chi']; S0.con = ['$chi']; }
    else { if (K.dove && K.dove !== 'qui') S0.dove = ['posto', '$x', '$y']; if (K.vitt) S0.con = ['$vitt']; }
    if (V.SCHEDE[k] && !V.SCHEDE[k].voc) { collisioni.push(k); return; }
    V.registra(k, S0, null, (st, A, a, d) => calc(st, A, a, d, k)); nuovi++;
  }
  if (UD() && UD().EFFV) { UD().EFFV['v:tira'] = []; UD().EFFV['v:fine'] = []; }
  V.COND['v:vitt'] = c => (c.d.vitt != null ? '' : 'Per chi?');
  prima = Object.keys(V.SCHEDE).length;
  for (const k in CARTE) compila(k, CARTE[k]);
  UV.prima = prima; UV.collisioni = collisioni;

  // ======================= LA FINE: la frase (Lingua), la comica concreta, il segno =======================
  const SCOP = { fermato: ': i Grigi l\'hanno portato via', multa: ': un Grigio gli ha fatto la multa', denunciato: ': qualcuno ha visto, e lo dirà ai Grigi', fascicolo: '', visto: ': qualcuno ha visto' };
  // i segnaposto: {A} {B} {cosa} {cosaI} {lire} {luogo} {q} {vinc} {rotto} {mestiere}; [tra quadre] si toglie se dentro c'è un segnaposto vuoto
  function riempi(t, P) {
    const val = k => { const v = P[k]; if (v === undefined || v === null || v === '' || v === 0) return null; return String(v); };
    const one = s => s.replace(/\{(\w+)\}/g, (m, k) => { const v = val(k); return v === null ? '\u0000' : v; });
    let out = String(t).replace(/\[([^\]]*)\]/g, (m, x) => { const r = one(x); return r.indexOf('\u0000') >= 0 ? '' : r; });
    return one(out).replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();
  }
  function comica(c, K) {
    const st = c.st, n = c.A.o, Co = CO(); if (!n || n === st.player || n.inside || !Co.GUASTI) return null;
    const pseudo = { id: null, chi: n.id, v: c.v, cosa: c.d.cosa || null, test: c.d.testL || [], x: { verbo: c.v } };
    const e = pseudo.cosa ? Co.fisica(pseudo.cosa) : null, nomi = [K.g || 'figuraccia', 'figuraccia', 'cade', 'perde_cappello'];
    for (const g of nomi) { const G0 = Co.GUASTI.find(x => x[0] === g); if (!G0) continue; let r = null; try { r = G0[2](st, pseudo, e, n); } catch (er) { r = null; } if (r) { if (pseudo.__altro) c.d.altro = pseudo.__altro; return [r[0], r[1], g]; } }
    return null;
  }
  function fine(c) {
    const st = c.st, A = c.A, K = C_(c), M = mo(c), es = c.d.es, B = Bdi(c);
    let ono = es === 'ok' ? (M.ono || K.ono || null) : null, riga = null, g = null;
    if (es === 'comico') { const r = comica(c, K); if (r) { ono = r[0]; riga = r[1]; g = r[2]; } }
    const Lg = LG(), cosa = c.d.preso || c.d.venduto || c.d.cosa || null;
    const P = { B: B ? B.nome : c.d.label || null, cosa: cosa ? art(cosa, 'det') : null, cosaI: cosa ? art(cosa, 'ind') : null, cosaN: cosa ? art(cosa, 'nudo') : null, lire: c.d.lire ? lire(c.d.lire) : null, q: c.d.q || null,
      luogo: c.d.posto ? nomeP(c.d.posto) : null, vinc: c.d.vinc ? nome(st, c.d.vinc) : null, rotto: c.d.rotto ? art(c.d.rotto, 'det') : null, mestiere: c.d.mestiere || null };
    let t = K.d || ('ha provato a ' + (K.inf || c.v));
    // il posto subito dopo il verbo, prima delle code facoltative ([: {lire} nel cappello]); il modo dopo il posto
    const coda = (c.d.posto && !/\{luogo\}/.test(t) && nomeP(c.d.posto) ? ' ' + aP(c.d.posto) : '') + (M.avv ? ', ' + M.avv : '');
    if (coda) { const m = /\[(:| e )/.exec(t), i = m ? m.index : -1, cd = coda.replace(/[\[\]{}]/g, ''); t = i >= 0 ? t.slice(0, i) + cd + t.slice(i) : t + cd; }
    let d = riempi(t, P);
    if (A.sesso === 'f') d = d.replace(/(^|\s)(si è|è) ([a-zàèìòù]*[^aeiu\s])o(?=[\s,.:]|$)/g, (m, b, x, y) => `${b}${x} ${y}a`);   // la persona che fa è una donna: «si è tuffata»
    if (c.d.part && c.d.part.length) d += c.d.part.length === 1 ? `, con ${nome(st, c.d.part[0])}` : `, con altri ${c.d.part.length}`;
    if (es === 'meta') d += ': ' + (K.meta || 'ma solo a metà');
    else if (es === 'comico') d += ': ' + (riga || K.ko || 'è finita in una figuraccia');
    if (c.d.scop && SCOP[c.d.scop]) d += SCOP[c.d.scop];
    if (c.d.msgM) d += ': ' + c.d.msgM.replace(/[.!]+$/, '').toLowerCase();
    let frase = `${A.nome} ${d}`; try { if (Lg && Lg.concorda) frase = Lg.concorda(frase, st, { frase: true, fonte: 'mondo' }); } catch (e) { }
    if (cosa) c.d.cosa = cosa;
    const Gr = GR(), gg = Gr && Gr.gruppoDi(st, A.id);
    c.r = Object.assign(c.r || {}, { d: frase.slice(0, 140), es, modo: c.d.modo, voc: 1, ono: ono || null, g: g || null, scop: c.d.scop || null, spia: c.d.spia || null, vinc: c.d.vinc || null,
      part: c.d.part && c.d.part.length ? c.d.part.join(' ') : null, quart: CO()._.quart(A.x, A.y), gruppo: gg ? gg.id : null, multa: c.d.multa || null, altro: c.d.altro || null });
    if (c.d.fidV) c.r.fidV = c.d.fidV;
    for (const k in c.r) if (c.r[k] === null) delete c.r[k];
    stats.fai++; stats[es] = (stats[es] || 0) + 1; stats.per[c.v] = (stats.per[c.v] || 0) + 1; stats.modi[c.d.modo] = (stats.modi[c.d.modo] || 0) + 1;
    // l'onomatopea vicino al giocatore (il livello della pagina di UnicoCose)
    if (ono && st.player && typeof document !== 'undefined' && CO().ONOV && hyp(A.x - st.player.x, A.y - st.player.y) < 60) { CO().ONOV.push({ x: A.x, y: A.y, w: ono, t: (st.clock || 0) + 1.4 }); if (CO().ONOV.length > 8) CO().ONOV.shift(); }
  }

  // ======================= DOPO IL FATTO: i testimoni del modo, la comica, i Grigi (Fatto.scrivi avvolto) =======================
  { const F = FT(), s0 = F.scrivi;
    if (!s0.__voc) {
      const scrivi = function (tipo, chi, dati, causa, opt) {
        if (Array.isArray(chi) && chi.some(x => x === '' || x == null)) chi = chi.filter(x => x !== '' && x != null);
        if (dati && dati.voc && dati.part && Array.isArray(chi)) for (const p of String(dati.part).split(' ')) if (p && chi.length < 6 && !chi.includes(p)) chi.push(p);
        if (dati && dati.voc) dati = compatta(dati);
        const r = s0.call(this, tipo, chi, dati, causa, opt);
        if (dati && dati.voc && r && r.id != null) { try { dopo((opt && opt.st) || Un().st, r.id, dati); } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.vocabolario', e); } }
        return r;
      };
      scrivi.__voc = true; scrivi.vecchio = s0; F.scrivi = scrivi;
    } }
  // la memoria tiene al più 10 campi nel fatto (Fatto pulisci): prima quelli che servono a chi legge (il verbo, l'esito, il posto, la cosa,
  // i soldi, la riuscita, il modo, il segno del vocabolario, il vincitore, il gruppo), poi il resto
  const ORDINE = ['verbo', 'esito', 'x', 'y', 'cosa', 'v', 'q', 'es', 'modo', 'voc', 'vinc', 'gruppo', 'scop', 'g', 'ono', 'part', 'spia', 'multa', 'altro', 'quart', 'bi', 'lod', 'strat', 'msg'];
  function compatta(dati) {
    const out = { d: dati.d }; for (const k of ORDINE) if (dati[k] !== undefined && dati[k] !== null && !(k === 'modo' && dati[k] === 'normale')) out[k] = dati[k];
    for (const k in dati) if (!(k in out) && dati[k] !== undefined && dati[k] !== null && !(k === 'modo')) out[k] = dati[k];
    return out;
  }
  function dopo(st, fid, dati) {
    const F = FT(), f = F.di(st, fid); if (!f) return; const M = MODI[dati.modo] || MODI.normale;
    if (M.pochi) { f.test = (f.test || []).slice(0, 1); f.pub = r2((f.pub || 0) * .3); }
    else if (M.pub && M.pub !== 1) f.pub = r2(clamp((f.pub || 0) * M.pub, 0, 1));
    const sc = CO()._.scrivi, chi = f.chi;
    if (dati.es === 'comico' && dati.g) { stats.guasti++; sc(st, 'guasto', [chi].concat(dati.altro ? [dati.altro] : []), { d: `${nome(st, chi)} voleva ${(CARTE[dati.verbo] && CARTE[dati.verbo].inf) || dati.verbo}: ${String(dati.d || '').split(': ').slice(1).join(': ') || 'è finita male'}`, g: dati.g, ono: dati.ono || null, verbo: dati.verbo, es: 'comico' }, fid); }
    if (dati.scop === 'fermato') sc(st, 'fermato', [chi], { d: `I Grigi hanno portato via ${nome(st, chi)}: voleva ${(CARTE[dati.verbo] && CARTE[dati.verbo].inf) || dati.verbo}` }, fid);
    else if (dati.scop === 'multa') sc(st, 'multa', [chi], { d: `Multa dai Grigi a ${nome(st, chi)}${dati.multa ? ': ' + lire(dati.multa) : ''}`, v: dati.multa || 0 }, fid);
    else if (dati.scop === 'denunciato' && dati.spia) sc(st, 'denuncia', [dati.spia, chi], { d: `${nome(st, dati.spia)} ha denunciato ${nome(st, chi)} ai Grigi` }, fid);
  }

  // ======================= LA LEGATURA: carta → passi della Mente (per i desideri, i gruppi, i metodi) =======================
  const vaiP = (x, y) => ['vai', { x: r1(x), y: r1(y) }];
  const lontanoC = c => c.lod === 'lontano' || c.lod === 'dormiente';
  const vicini = c => { try { return (ME()._.vicini(c) || []).filter(x => !x.nino); } catch (e) { return []; } };
  // il bersaglio di un verbo verso qualcuno: dal desiderio (nd.altro), se no per «verso» (amico, nemico, ricco, ferito, gruppo, carcerato, chiunque)
  function bersaglio(c, K, nd) {
    if (nd && nd.altro) return nd.altro;
    const st = c.st, n = c.n, me = io(n.id), F = FT(), vs = K.verso || 'chiunque';
    if (vs === 'carcerato') { for (const id in (c.M && c.M.rel) || {}) { const k = npc(st, id); if (k && k.jailedUntil > st.t && c.M.rel[id][0] > .2) return id; } return null; }
    if (vs === 'gruppo') { const Gr = GR(), g = Gr && Gr.gruppoDi(st, n.id); if (!g) return null; const L = g.membri.filter(x => x !== n.id && x !== g.capo); return L.length ? L[Math.floor(rnd() * L.length)] : null; }
    if (vs === 'nemico') { let best = null, bv = .12; for (const id in (c.M && c.M.rel) || {}) { const r = F.rancore(st, me, id) + Math.max(0, -(c.M.rel[id][0] || 0)) * .5; if (r > bv) { const k = npc(st, id); if (k && vivo(k) && k !== st.player && !(k.jailedUntil > st.t)) { bv = r; best = id; } } } if (best && !K.chi) return best; if (best) { const k = npc(st, best); if (k && (lontanoC(c) || hyp(k.x - n.x, k.y - n.y) < 90) && !!k.inside === !!n.inside) return best; } }
    const L = vicini(c); if (!L.length) return null;
    if (vs === 'amico') { const x = L.filter(v => v.aff > .1).sort((a, b) => b.aff - a.aff)[0]; return x ? x.id : null; }
    if (vs === 'ricco') { const x = L.slice().sort((a, b) => ((b.k.pop && b.k.pop.money) || 0) - ((a.k.pop && a.k.pop.money) || 0))[0]; return x && x.k.pop && x.k.pop.money > 10 ? x.id : null; }
    if (vs === 'ferito') { const x = L.find(v => v.k.stun > .5 || (v.k.maxHp && v.k.hp < v.k.maxHp * .5)); return x ? x.id : null; }
    if (vs === 'nemico') { const x = L.filter(v => v.aff < -.1).sort((a, b) => a.aff - b.aff)[0]; return x ? x.id : null; }
    return L[Math.floor(rnd() * L.length) % L.length].id;
  }
  function lega(c, v, nd, a0, lontano) {
    const K = CARTE[v], st = c.st, A = c.A, n = c.n; if (!K || !n || !A || !V.SCHEDE[v]) return null;
    const a = Object.assign({}, a0 || {}); let k = null;
    if (nd && nd.per && K.produce !== undefined && K.produce !== null && K.produce !== nd.per) return null;   // la roba voluta non è questa
    if (nd && nd.per && K.produce === undefined && (K.eff || []).some(e => e[0] === 'roba' || e[0] === 'trova' || e[0] === 'ripara') && !(K.eff || []).some(e => e[0] === 'roba' && e[1] === nd.per)) {
      if (!(K.eff || []).some(e => e[0] === 'trova' && (TROVA[e[1]] || []).some(x => x[0] === nd.per))) return null; }
    if (K.chi === 'persona') {
      const id = a.chi != null ? a.chi : bersaglio(c, K, nd); k = id != null ? npc(st, id) : null;
      if (!k || !vivo(k) || k === n || (k === st.player && !K.player)) return null; if (!!k.inside !== !!n.inside) return null; a.chi = k.id;
    } else if (K.vitt && a.vitt == null) { const id = bersaglio(c, K, nd); if (id != null) a.vitt = id; else if (K.vittObb) return null; }
    const cx = V._.ctx(st, A, v, a);
    if (K.chi !== 'persona' && K.dove && K.dove !== 'qui') { if (typeof cx.d.x !== 'number') return null; if (cx.d.posto) a.posto = cx.d.posto; if (cx.d.vitt != null && a.vitt == null && K.vitt) a.vitt = cx.d.vitt; if (cx.d.bott != null) a.bott = cx.d.bott; if (cx.d.mezzo != null) a.mezzo = cx.d.mezzo; }
    let pre = [];
    for (const t of V.SCHEDE[v].pre) {
      if (LOC.has(t[0])) continue; const f = V.COND[t[0]]; if (!f) return null; const r = f(cx, t[1], t[2], t[3], t[4]); if (!r) continue;
      if (t[0] === 'v:serve' && K.serve) { let p = null; try { p = ME()._.procura(c, K.serve[0], 1, 0); } catch (e) { p = null; } if (p) { pre = [['@procura', { cosa: K.serve[0], q: 1 }]]; continue; } }
      return null;
    }
    let via = [];
    if (K.chi === 'persona') { const d = hyp(k.x - A.x, k.y - A.y), R = K.r || CFG.persona; if (d > R - .4) { if (!lontanoC(c) && d > (lontano ? 400 : 160)) return null; const f = Math.min(1, Math.max(.6, R * .6) / (d || 1)); via = [vaiP(k.x + (A.x - k.x) * f, k.y + (A.y - k.y) * f)]; } }
    else if (K.dove && K.dove !== 'qui') { const d = hyp(cx.d.x - A.x, cx.d.y - A.y), R = K.r || CFG.qui; if (d > R - 1) { if (!lontanoC(c) && d > (lontano ? CFG.lontanoMax * 2.5 : CFG.lontanoMax)) return null; const j = hashS(n.id + v) % 7 / 7 * 6.283; via = [vaiP(cx.d.x + Math.cos(j) * Math.min(3, R * .3), cx.d.y + Math.sin(j) * Math.min(3, R * .3))]; } }
    stats.legati++;
    const esci = n.inside && !lontanoC(c) && K.chi !== 'persona' && K.dove !== 'casa' && !K.dentro ? [['esci', {}]] : [];
    return pre.concat(esci, via, [[v, a]]);
  }
  UV.lega = lega;

  // ======================= I DESIDERI: le legature, la strada sempre buona, le variabili nuove =======================
  { const D = UD();
    if (D) {
      for (const v in CARTE) if (V.SCHEDE[v] && V.SCHEDE[v].voc) D.BIND[v] = (c, nd) => lega(c, v, nd, null, true);
      // [fix] «stare alla Calata del porto»: andare in un posto è SEMPRE un mezzo (prima, in scena, oltre 300 m la legatura si arrendeva:
      // «non sa come fare»). Ora si va a piedi, quanto lontano sia, finché il posto esiste
      D.BIND.vai = (c, nd) => { const P = nd && nd.per && G.PLACES && G.PLACES[nd.per]; if (!P) return null; const d = hyp(P.x - c.n.x, P.y - c.n.y); if (d < 8) return []; return [vaiP(P.x + 2, P.y + 1)]; };
      // la roba lasciata in casa e i pezzi smontati: le legature che mancavano (legatura:posa, legatura:smonta)
      if (!D.BIND.posa) D.BIND.posa = () => null;
      if (!D.BIND.smonta) D.BIND.smonta = () => null;
      const Var = D.Var, VARS = D.VARS;
      const quota0 = VARS.quota && VARS.quota.leggi, casa0 = VARS.casa && VARS.casa.leggi, pubb0 = VARS.pubblico && VARS.pubblico.leggi, vel0 = VARS.velocita && VARS.velocita.leggi;
      Var.dichiara({ k: 'quota', scala: [0, 1], leggi: (st, id) => (altoOra(st, id) ? 1 : quota0 ? quota0(st, id) : 0) })
        .dichiara({ k: 'casa', scala: [0, 1], vis: 0, leggi: (st, id) => (S(st).occupa[id] ? 1 : casa0 ? casa0(st, id) : 0) })
        .dichiara({ k: 'pubblico', scala: [0, 3], leggi: (st, id) => (pubb0 ? pubb0(st, id) : 0) + fama(st, id) })
        .dichiara({ k: 'velocita', leggi: (st, id) => { const m = S(st).mezzi[id]; return m && st.t - m[1] < 720 ? 1 : vel0 ? vel0(st, id) : 0; } })
        .dichiara({ k: 'orto', scala: [0, 1], vis: 1, leggi: (st, id) => (ortoDi(st, id) ? 1 : 0) })
        .dichiara({ k: 'fede', scala: [0, 1], vis: 0, leggi: (st, id) => S(st).fede[id] || 0 })
        .dichiara({ k: 'sposato', scala: [0, 1], vis: 1, leggi: (st, id) => (S(st).coppie[id] ? 1 : 0) });
      // le differenze che fanno nascere voglie: dai fatti nuovi, dagli atomi delle carte (chi lo fa → «chi», chi lo subisce → «con0»)
      for (const v in CARTE) {
        const K = CARTE[v], t = K.fatto || v; if (D.DELTA[t] || !V.SCHEDE[v] || !V.SCHEDE[v].voc) continue;
        const out = K.delta ? K.delta.slice() : [];
        if (!K.delta) for (const e of V.SCHEDE[v].eff) for (const [vk, vs, chi] of D.EFFV[e[0]] || []) { if (vk.indexOf('bisogno:') === 0 || vk === 'fascicolo') continue; const row = [vk, chi === 'io' ? 'chi' : 'con0', vs, chi === 'io' ? .3 : .4]; if (vk === 'possiede') row.push('$cosa'); if (!out.some(x => x[0] === row[0] && x[1] === row[1])) out.push(row); }
        if (out.length) D.DELTA[t] = out.slice(0, 3);
      }
      if (D.APPROX) Object.assign(D.APPROX, { orto: ['soldi', 1], fede: ['bisogno:paura', -1], sposato: ['affetto', 1] });
    } }
  { const L = LG(); if (L && L.DESIDERI) L.DESIDERI.unshift(['fare un orto', d => d.k === 'orto' && d.vs > 0], ['trovare la fede', d => d.k === 'fede' && d.vs > 0], ['sposarsi', d => d.k === 'sposato' && d.vs > 0], ['farsi una casa da sé', d => d.k === 'casa' && d.vs > 0 && d.mot === 'mimesi']); }

  // ======================= LA MENTE: un metodo per obiettivo, con le carte che lo servono =======================
  const OBC = {};
  for (const v in CARTE) { const K = CARTE[v]; if (!V.SCHEDE[v] || !V.SCHEDE[v].voc) continue; for (const g of K.ob || []) (OBC[g] = OBC[g] || []).push(v); }
  // la stessa cosa di nuovo, troppo presto: no (il carattere fa ripetere, ma non ogni minuto). st.u.voc.ult[id] = [[verbo, t], ...] (≤ 8)
  const COOL = { saluta: 240, ignora: 360, riordina_casa: 720, sporca_casa: 720, sedia_alla_finestra: 600, sposta_la_tv: 600, fai_una_talea: 1440, butta_ciarpame: 1440, stendi_bucato: 1440 };
  function fatto_da_poco(st, id, v, K) { const L = S(st).ult[id]; if (!L) return false; const cool = K.cool || COOL[v] || (K.ob && K.ob.includes('arredare') ? 720 : 180); return L.some(e => e[0] === v && st.t - e[1] < cool) || (L.length && st.t - L[L.length - 1][1] < 8); }
  function segnaFatto(st, id, v) { const s = S(st), L = s.ult[id] || (s.ult[id] = []); const i = L.findIndex(e => e[0] === v); if (i >= 0) L.splice(i, 1); L.push([v, Math.round(st.t)]); if (L.length > 8) L.shift(); }
  function metodo(g) {
    return c => {
      const L = OBC[g]; if (!L || !L.length || !c.n || !c.n.pop) return null;
      const i0 = Math.floor(rnd() * L.length);
      for (let j = 0, prove = 0; j < L.length && prove < CFG.metodoProve; j++) {
        const v = L[(i0 + j) % L.length], K = CARTE[v];
        if (K.quando) { let ok = false; try { ok = !!K.quando(c); } catch (e) { ok = false; } if (!ok) continue; }
        if (fatto_da_poco(c.st, c.n.id, v, K)) continue;
        prove++; const p = lega(c, v, null); if (!p) continue;
        stats.metodi++; segnaFatto(c.st, c.n.id, v); const last = p[p.length - 1][1];
        return { passi: p, costo: .3, chi: K.chi === 'persona' ? last.chi : undefined };
      }
      return null;
    };
  }
  { const M = ME();
    if (M && M.estendi) {
      const met = {}, cost = {};
      const CO_ = { divertirsi: k => .35 + (k.pigro || 0) * .2 - (k.teatrale || 0) * .15, socializzare: k => .45 - (k.loq || 0) * .1, guadagnare: k => .55 - (k.avid || 0) * .2, vendicarsi: k => .4 - (k.rancore || 0) * .15,
        pregare: k => .35, igiene: k => .4, dipingere: k => .45, lavorare: k => .5, chiedere: k => .5 + (k.orgoglio || 0) * .4, mangiare: k => .8, arredare: k => 1, regalare: k => .5, militare: k => .3, riscuotere: k => .5, dormire: k => .9 };
      for (const g in OBC) { if (!M.OBIETTIVI[g]) continue; met['voc_' + g] = metodo(g); cost['voc_' + g] = CO_[g] || (() => .55); }
      M.estendi({ metodi: met, costo: cost });
      for (const g in OBC) if (M.OBIETTIVI[g] && !M.OBIETTIVI[g].metodi.includes('voc_' + g)) M.OBIETTIVI[g].metodi.push('voc_' + g);
    } }

  // ======================= I GRUPPI: i verbi sognati che adesso ci sono, e i mezzi del «come facciamo?» =======================
  { const Gr = GR();
    if (Gr && Gr.VERBI && Gr.EFFETTI) {
      const ndDa = v => { const s = v.b && v.b.s || ''; return { altro: s.slice(0, 2) === 'p:' ? s.slice(2) : null }; };
      const aDa = v => { const s = v.b && v.b.s || '', p = s.slice(0, 2) === 'l:' ? s.slice(2) : null; return p ? { posto: p } : {}; };
      const primo = (c, v, L) => { for (const k of L) { const p = lega(c, k, ndDa(v), aDa(v), true); if (p) return p; } return null; };
      // il verbo sognato → le carte che lo fanno (in ordine); ft: i tipi di fatto che compiono la voglia
      const SOGNI = { manifestare: ['manifesta', 'corteo', 'batti_pentole', 'volantina'], scioperare: ['sciopera'], occupare: ['occupa'], sabotare: ['sabota'], processare: ['processa'], eleggere: ['eleggi'],
        sposare: ['sposa', 'corteggia'], addestrare: ['addestra'], parlare_con: ['parla_con', 'parla_al_gabbiano'], maledire: ['maledici'], pregare_per: ['prega_per', 'fai_un_voto'], cantare: ['fai_la_serenata', 'canta'],
        corrompere: ['corrompi_guardia'], sfidare: ['sfida'], fuggire: ['nuota', 'nasconditi'] };
      for (const s in SOGNI) {
        const VV = Gr.VERBI[s]; if (!VV || VV.esp) continue; const L = SOGNI[s].filter(k => V.SCHEDE[k] && V.SCHEDE[k].voc); if (!L.length) continue;
        VV.esp = (c, v) => primo(c, v, L); VV.ft = Array.from(new Set(L.map(k => CARTE[k].fatto || k))); VV.voc = L;
      }
      // i mezzi che erano nella lista dei mancanti: ora hanno la loro espansione
      const MEZZI = { corteo: ['corteo', 'manifesta', 'radunati'], orto: ['raccogli_orto', 'annaffia', 'coltiva'], ricetta: ['ricetta'], spaccio: ['spaccia'], furto: ['ruba_bottega', 'ruba_persona'], banca: ['chiedi_prestito_banca'],
        sussidio: ['chiedi_sussidio'], tesoro: ['scava', 'cerca_sulla_spiaggia'], banda: ['suona', 'batti_pentole'], grotta: ['occupa', 'abita'], tetto: ['salta_con_ombrello', 'arrampicati'], gru: ['arrampicati'],
        campanile: ['arrampicati_campanile'], aquilone: ['fai_aquilone'], motorino: ['ruba_mezzo'], sciopero: ['sciopera'], palazzo: ['occupa', 'manifesta'], corrompere: ['corrompi_guardia'], evasione: ['corrompi_guardia'] };
      for (const e in Gr.EFFETTI) for (const M of Gr.EFFETTI[e]) {
        const L = (MEZZI[M.id] || []).filter(k => V.SCHEDE[k] && V.SCHEDE[k].voc); if (!L.length || M.esp) { if (L.length && M.manca) M.manca = M.manca.filter(x => !V.SCHEDE[x]); continue; }
        M.esp = (c, v) => primo(c, v, L); M.manca = (M.manca || []).filter(x => !V.SCHEDE[x] && !L.includes(x) && !(x === 'arrampicati' || x === 'salta' || x === 'raccogli' || x === 'coltiva' || x === 'radunati' || x === 'manifesta' || x === 'guida' || x === 'ruba_mezzo' || x === 'abita' || x === 'occupa' || x === 'assalta' || x === 'libera' || x === 'scassina' || x === 'corrompi' || x === 'fai_aquilone' || x === 'sciopera' || x === 'suona' || x === 'scava' || x === 'ruba' || x === 'ricetta' || x === 'spaccia' || x === 'chiedi_prestito_banca' || x === 'chiedi_sussidio'));
        M.voc = L;
      }
    } }

  // ======================= I SEGNI, LA MEMORIA, LE IDEE, IL REGISTA (le tabelle: una riga per tipo) =======================
  { const Sg = SG(), F = FT(), I = ID(), R = RG(), Co = CO();
    const TIPI = {};
    for (const v in CARTE) { const K = CARTE[v], t = K.fatto || v; if (!V.SCHEDE[v] || !V.SCHEDE[v].voc) continue; if (Co._.VERBO_INF && !Co._.VERBO_INF[v]) Co._.VERBO_INF[v] = K.inf || v;
      if (!TIPI[t]) TIPI[t] = { K, n: 0 }; TIPI[t].n++; }
    const NOMI = { furto: null, lite: null, ripulito: null, raduno: ['raduno', 'raduni'], manifestazione: ['manifestazione', 'manifestazioni'], corteo: ['corteo', 'cortei'], esibizione: ['esibizione', 'esibizioni'], mestiere: ['lavoretto del mestiere', 'lavoretti del mestiere'], mestiere_losco: ['lavoretto losco', 'lavoretti loschi'] };
    for (const t in TIPI) {
      const K = TIPI[t].K;
      if (Sg && Sg.TIPI && !Sg.TIPI[t]) Sg.TIPI[t] = { p: K.pitto || 'fumetto', w: K.w || null, posa: K.posa || null, gz: K.gz !== undefined ? K.gz : K.ill ? .6 : .25, n: NOMI[t] || [K.inf || t, (K.inf || t) + ' (più volte)'] };
      if (F.GRAV && F.GRAV[t] === undefined) F.GRAV[t] = K.ill ? .55 : K.offesa ? .4 : .25;
      if (K.offesa && F.OFFESE && !F.OFFESE[t]) F.OFFESE[t] = K.offesa;
      if (K.idee && I && I.DA_FATTI && !I.DA_FATTI[t]) I.DA_FATTI[t] = K.idee;
    }
    if (Sg && Sg.TIPI && !Sg.TIPI.orto_secco) Sg.TIPI.orto_secco = { p: 'muso', w: 'secco', gz: .3, n: ['orto seccato', 'orti seccati'] };
    if (Sg && Sg.TIPI && !Sg.TIPI.rata_saltata) Sg.TIPI.rata_saltata = { p: 'moneta', w: 'la rata', gz: .3, n: ['rata saltata', 'rate saltate'] };
    if (F.GRAV) Object.assign(F.GRAV, { orto_secco: .3, rata_saltata: .35 });
    if (R && R.FAMIGLIE && R.TIPI_FILO) {
      Object.assign(R.FAMIGLIE, {
        protesta: { domanda: 'la piazza si riempie?', finestra: 1440, base: .3, chiave: 'luogo', spinte: { promotore: ['militare', 1.45], compagno: ['socializzare', 1.3] }, calma: { promotore: ['militare', .6] },
          titolo: '{cosa_d}', fine: { repressa: '{cosa_d}: sono arrivati i Grigi', sfumato: '{cosa_d}: poi è finita lì' } },
        traffico: { domanda: 'i Grigi lo scopriranno?', finestra: 1440, base: .3, spinte: { trafficante: ['guadagnare', 1.4] }, calma: { trafficante: ['guadagnare', .6] },
          titolo: 'Gli affari di {trafficante}', fine: { scoperto: 'Gli affari di {trafficante}: i Grigi l\'hanno saputo', sfumato: 'Gli affari di {trafficante}: nessuno ha visto niente' } },
        orto: { domanda: 'il raccolto arriverà?', finestra: 4320, base: .1, spinte: { ortolano: ['guadagnare', 1.3] },
          titolo: 'L\'orto di {ortolano}', fine: { raccolto: 'L\'orto di {ortolano}: ha raccolto', secco: 'L\'orto di {ortolano} è seccato', sfumato: 'L\'orto di {ortolano} è rimasto lì' } },
        impresa: { domanda: 'lo rifarà più in grande?', finestra: 720, base: .12, spinte: { acrobata: ['divertirsi', 1.4] },
          titolo: 'Le prodezze di {acrobata}', fine: { caduto: 'Le prodezze di {acrobata}: è finita per terra', sfumato: 'Le prodezze di {acrobata}: se ne parla ancora' } },
        amore: { domanda: 'si metteranno insieme?', finestra: 2880, base: .15, sim: true, spinte: { a: ['socializzare', 1.4], b: ['regalare', 1.3] },
          titolo: 'Fra {a} e {b}', fine: { sposati: '{a} e {b} si sono sposati', sfumato: 'Fra {a} e {b} non è successo niente' } },
        fede: { domanda: 'la grazia arriverà?', finestra: 2880, base: .06, spinte: { devoto: ['pregare', 1.4] },
          titolo: 'La novena di {devoto}', fine: { sfumato: 'La novena di {devoto}: la grazia non è arrivata' } },
        sfida: { domanda: 'chi vince la sfida?', finestra: 600, base: .3, sim: true, spinte: { sfidante: ['vendicarsi', 1.4], sfidato: ['vendicarsi', 1.3] },
          titolo: 'La sfida fra {sfidante} e {sfidato}', fine: { vinta: 'La sfida fra {sfidante} e {sfidato} è finita', sfumato: 'La sfida fra {sfidante} e {sfidato} non si è fatta' } },
      });
      const T_ = R.TIPI_FILO, R_ = (fam, m, r, o) => Object.assign({ fam, m, r }, o || {});
      // la famiglia del fatto: dalla carta (filo); se no, per la famiglia del verbo (l'illegale fa «traffico», l'offesa «offesa», il resto «vicinato»)
      for (const t in TIPI) {
        if (T_[t] && ['furto', 'lite', 'ripulito'].includes(t)) continue; const K = TIPI[t].K;
        const rows = (K.filo || []).map(x => R_(x[0], x[1], x[2], x[3]));
        if (!rows.length) rows.push(K.ill ? R_('traffico', 'apre', { trafficante: 'chi' }) : K.offesa && K.offesa[2] > 0 ? R_('offesa', 'apre', { offensore: 'chi', offeso: 'con0' }) : K.chi === 'persona' ? R_('vicinato', 'apre', { a: 'chi' }) : R_('vicinato', 'apre', { a: 'chi' }));
        T_[t] = (T_[t] || []).concat(rows);
        if (R.GT && R.GT[t] === undefined) R.GT[t] = K.ill ? .35 : K.offesa && K.offesa[2] > 0 ? .3 : K.f === 'citta' ? .3 : .06;
      }
      T_.fermato = (T_.fermato || []).concat([R_('traffico', 'chiude', { trafficante: 'chi' }, { esito: 'scoperto' }), R_('protesta', 'chiude', { promotore: 'chi' }, { esito: 'repressa' })]);
      T_.orto_secco = [R_('orto', 'chiude', { ortolano: 'chi' }, { esito: 'secco' })]; T_.rata_saltata = [R_('vicinato', 'apre', { a: 'chi' })];
      Object.assign(R.GT, { orto_secco: .15, rata_saltata: .2 });
      if (R.ROUTINE) for (const t of ['stiracchiati', 'aspetta', 'siediti', 'saluta', 'mestiere', 'leggi_giornale', 'fuma']) R.ROUTINE.add(t);
      try { R.problemi = R.controlla(); } catch (e) { }
    } }

  // ======================= LA FASE: l'orto che cresce o secca, i tetti, le rate, gli sgomberi =======================
  function fase(st) {
    const s = S(st); if (!s || !st.npcs) return; const P = Un().passi; if (P % 60 !== 7) return; const t0 = now(), sc = CO()._.scrivi;
    for (let i = s.orti.length - 1; i >= 0; i--) { const o = s.orti[i]; if (st.t - o[6] > CFG.ortoSecco * 1440) { s.orti.splice(i, 1); const k = npc(st, o[0]); if (k) sc(st, 'orto_secco', [o[0]], { d: `L'orto di ${nome(st, o[0])} è seccato: nessuno l'ha annaffiato` }, null); } }
    for (const id in s.alto) { const e = s.alto[id], k = npc(st, id); if (!k || e[3] < st.t || hyp(k.x - e[1], k.y - e[2]) > 6) delete s.alto[id]; }
    for (const id in s.mutui) { const m = s.mutui[id], wk = Math.floor((st.t - m[1]) / (CFG.mutuoGiorni * 1440)); if (wk > m[3]) { m[3] = wk; const A = AT().di(st, id); if (!A) { delete s.mutui[id]; continue; } const So = SO(), tasso = (So && So.CFG && So.CFG.prestitoTasso) || .03; m[0] = r1(m[0] * (1 + tasso)); const v = Math.min(m[2], A.soldi || 0); A.soldi = r1((A.soldi || 0) - v); m[0] = r1(m[0] - v); if (v < m[2] - .5) sc(st, 'rata_saltata', [id], { d: `La rata del Banco di ${nome(st, id)} non è passata: ne mancano ${lire(m[0])}`, v: m[0] }, null); if (m[0] < 1) delete s.mutui[id]; } }
    for (const id in s.occupa) { const o = s.occupa[id], Pp = G.PLACES[o[0]]; if (!Pp) { delete s.occupa[id]; continue; } if (st.t - o[1] > 360 && grigioVicino(st, Pp.x, Pp.y, 40) && rnd() < .3) { delete s.occupa[id]; sc(st, 'sgombero', [id], { d: `I Grigi hanno sgomberato ${nome(st, id)} ${aP(o[0])}`, quart: CO()._.quart(Pp.x, Pp.y) }, null); } }
    if (s.fuochi) s.fuochi = s.fuochi.filter(q => q[2] > st.t);
    s.raduni = s.raduni.filter(r => r[4] > st.t - 240);
    for (const id in s.scioperi) if (s.scioperi[id] < st.t) delete s.scioperi[id];
    const ms = now() - t0; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
  }
  Un().fase('unico.vocabolario', { dopo: 'unico.desideri', budget: { p95: .05 } }, fase);
  if (Un().nasce) Un().nasce('vocabolario', st => { S(st); });

  // ======================= IL MENU DEL GIOCATORE: qualche verbo nuovo che si può fare qui, adesso =======================
  let MENU = { k: null, add: [] };   // la stessa mezz'ora di gioco, lo stesso posto: la lista di prima (il menu si chiede anche a ogni fotogramma)
  function menuVoc(st, out) {
    const p = st.player; if (!p || p.vehicle || st.over || (st.me && st.me.warp)) return out;
    const mk = Math.floor(st.t * 2) + '|' + Math.round(p.x / 2) + ',' + Math.round(p.y / 2) + '|' + out.length;
    if (MENU.k === mk && MENU.st === st) return out.concat(MENU.add.filter(x => !out.some(y => y.label === x.label)));
    const A = AT().di(st, 'player'); if (!A) return out; const etich = new Set(out.map(x => x.label)), add = [];
    const vicino = (() => { let best = null, bd = CFG.persona; for (const k of st.npcs) { if (!vivo(k) || !k.pop || !!k.inside !== !!p.indoor) continue; const d = hyp(k.x - p.x, k.y - p.y); if (d < bd) { bd = d; best = k; } } return best; })();
    const ord = Object.keys(CARTE).filter(v => V.SCHEDE[v] && V.SCHEDE[v].voc && !/^arte_/.test(v) && !CARTE[v].npc).sort((a, b) => (hashS(a + Math.floor(st.t / 30)) % 997) - (hashS(b + Math.floor(st.t / 30)) % 997));
    for (const v of ord) {
      if (add.length >= CFG.menu) break; const K = CARTE[v], a = {};
      if (K.chi === 'persona') { if (!vicino) continue; a.chi = vicino.id; }
      else if (K.dove && K.dove !== 'qui' && !(K.dove === 'casa')) { const L = luoghi(K.dove); if (L.length && !L.some(k => hyp(G.PLACES[k].x - p.x, G.PLACES[k].y - p.y) < (K.r || CFG.qui))) continue; if (!L.length && !['tetto', 'bottega', 'banca', 'casa_altrui', 'mezzo', 'lavoro'].includes(K.dove)) continue; }
      let why = ''; try { why = V.puo(st, 'player', v, a); } catch (e) { why = 'no'; } if (why) continue;
      const lab = cap1(K.inf || v.replace(/_/g, ' ')) + (vicino && K.chi === 'persona' ? ` (${vicino.first || vicino.name})` : '');
      if (etich.has(lab)) continue; etich.add(lab);
      add.push({ id: 'u_voc_' + v, label: lab, off: '', unico: v, run: () => { MENU.k = null; const r = V.fai(st, 'player', v, a, { subito: true }); const f = r && r.fid != null ? FT().di(st, r.fid) : null; return (f && f.d) || r.msg; } });
    }
    MENU = { k: mk, st, add };
    return out.concat(add);
  }
  { const Z = AZ(); if (Z && Z.playerActions && !Z.playerActions.__voc) {
    const pa0 = Z.playerActions;
    const pa = function (st) { const o = pa0.apply(this, arguments) || []; try { return menuVoc(st, o); } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.vocabolario', e); return o; } };
    pa.__voc = true; pa.__unico = pa0.__unico; pa.vecchio = pa0; Z.playerActions = pa;
  } }

  // ======================= LA SCHEDA «VOCABOLARIO» (con &regia) e i conti =======================
  function conti() {
    const per = {}, da = { vecchi: 0, nuovi: 0 }, fonti = {};
    for (const v in CARTE) { if (!V.SCHEDE[v] || !V.SCHEDE[v].voc) continue; const K = CARTE[v]; per[K.f] = (per[K.f] || 0) + 1; if (K.da) { da.vecchi++; const f = K.da.split(':')[0]; fonti[f] = (fonti[f] || 0) + 1; } else da.nuovi++; }
    return { prima: UV.prima, dopo: Object.keys(V.SCHEDE).length, nuovi: nuovi, per, da, fonti, termini: TERMINI.size, collisioni: collisioni.slice() };
  }
  UV.conti = conti;
  const DEBUG = typeof location !== 'undefined' && /[?&]regia\b/.test(location.search);
  const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  function html(st) {
    const k = conti(); let h = `<p class="hint">Il vocabolario: ${k.dopo} verbi (${k.nuovi} nuovi di questo lotto, ${k.da.vecchi} dai cataloghi vecchi).</p>`;
    h += '<h4>Per famiglia</h4><p><small>' + esc(Object.entries(k.per).map(([f, n]) => f + ' ' + n).join(' · ')) + '</small></p>';
    const F = FT(), L = F.tutti ? F.tutti(st).filter(f => f.x && f.x.voc).slice(-12).reverse() : [];
    h += '<h4>Gli ultimi</h4><ul>' + (L.length ? L.map(f => `<li>${esc(f.d || f.v)}${DEBUG ? ' <small>(' + esc(f.v + ' · ' + (f.x.es || '') + ' · ' + (f.x.modo || '')) + ')</small>' : ''}</li>`).join('') : '<li><span style="opacity:.7">Niente, per ora.</span></li>') + '</ul>';
    if (DEBUG) h += '<h4>Esiti</h4><p><small>' + esc(JSON.stringify({ ok: stats.ok, meta: stats.meta, comico: stats.comico, modi: stats.modi, scoperti: stats.scoperti, fermati: stats.fermati, multe: stats.multe, radunati: stats.radunati, metodi: stats.metodi })) + '</small></p>';
    return h;
  }
  { const Sg = SG(); if (Sg && Sg.scheda && DEBUG) Sg.scheda('u_vocabolario', 'Vocabolario', html); }

  // l'indice dei desideri: il «ruba» che mancava adesso c'è (le carte ruba_*): via le voci «mancante» che lo segnavano come buco;
  // e le legature dei verbi del cantiere (costruisci, barrica, tira_su_baracca) passano dai metodi della Mente che ci sono già
  // l'ordine dei candidati: la ricerca ne guarda una dozzina; prima i metodi, i mezzi e i verbi di sempre, poi le carte (ruotate per chi
  // cerca: così non vince sempre la prima della tabella). Il fascio passa da 6 a 7
  { const D = UD(); if (D && D.indice) { const I = D.indice(); for (const k in I) { const L = I[k].filter(cd => !(cd.tipo === 'mancante' && cd.m === 'ruba')); for (const cd of L) if (Array.isArray(cd.manca) && !cd.manca.length) delete cd.manca;   // [fix] un mezzo senza mancanti ha manca: [] e la ricerca lo saltava sempre (un array vuoto è «vero»)
      const a = L.filter(cd => !(cd.tipo === 'verbo' && CARTE[cd.v])), b = L.filter(cd => cd.tipo === 'verbo' && CARTE[cd.v]); I[k] = a.concat(b); I[k].voc = a.length; } if (D.CFG) { D.CFG.fascio = Math.max(D.CFG.fascio, 7); D.CFG.nodi = Math.max(D.CFG.nodi, 72); } }
    if (D && D.BIND) { const MET = (c, m) => { const M = ME() && ME()._.METODI[m]; if (!M) return null; try { const r = M(c); return r && !r.attesa && r.passi ? r.passi : null; } catch (e) { return null; } };
      if (!D.BIND.costruisci) D.BIND.costruisci = c => MET(c, 'costruisci'); for (const v of ['barrica', 'tira_su_baracca', 'presidia']) if (!D.BIND[v]) D.BIND[v] = c => MET(c, 'rivendica'); } }

  Object.assign(UV, { S, CARTE, MODI, LUOGHI: luoghi, OBC, lega, metodo, conti, html, fase, fama, _: { calc, metaDi, modoDi, riempi, comica, fine, dopo, termine, compila, EFFV_A, TERMINI, bersaglio, altoOra, ortoDi } });
  Un().Vocabolario = UV;
  return UV;
})();
if (typeof window !== 'undefined') window.UnicoVocabolario = UnicoVocabolario;
