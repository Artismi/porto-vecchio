/* [unico] unico_desideri.js: I DESIDERI DALLE VARIABILI DEL MONDO (progetto: commedia/MONDO_PIENO.md §9, T.1-T.4). Dietro ?commedia.
   Spento il flag: UnicoDesideri = { ON: false }.

   NIENTE ELENCO DI DESIDERI. Un desiderio è un CAMBIAMENTO VOLUTO DI UNA VARIABILE DEL MONDO, per sé o per un altro, nato da una
   DIFFERENZA PERCEPITA. Due alfabeti soli:
   1. LE VARIABILI (Var): si enumerano dai dati, non a mano. Var.dichiara({ k, di, per, leggi, vis }) per tipo; i sette bisogni dell'Attore,
      «possiede» per ogni cosa del catalogo e «prop» per ognuna delle proprietà (UnicoCatalogo.PROP) entrano da soli. Un modulo nuovo
      porta le sue (Var.dichiara): diventano desiderabili senza scrivere niente.
   2. GLI EFFETTI dei verbi: al primo uso si costruisce L'INDICE INVERSO var × verso → [candidati]: i verbi del registro (Verbo.SCHEDE, dai
      termini dei loro eff: EFFV), i mezzi del «come facciamo?» di unico_gruppi.js (EFFETTI, con le strutture di UnicoCostruire.richiedi),
      i metodi della Mente, gli oggetti per proprietà (UnicoCose.sostituto). Un verbo con un termine nuovo entra da solo; un termine che
      nessuno sa leggere va nella lista «ignoti».
   LA NASCITA (solo agli eventi, dall'ascolto dei fatti di unico_idee.js): per chi c'era (chi, con, i testimoni) la differenza DELTA del
   fatto, la sorgente (mimesi: un altro che stimo ha di più; perdita: avevo e non ho; vista: un cambiamento raro; torto: me l'ha fatto lui
   → riavere, rovesciare, o pari su un'altra variabile; contagio: l'idea; curiosità: la cosa mai vista) e la SALIENZA = |Δ| × vicinanza ×
   tratti × rarità della firma. ≤ 2 voglie attive per testa (+1 dormiente); una nuova scaccia la più debole.
   I MEZZI SI TROVANO: ricerca all'indietro limitata (profondità 3, fascio 6, 60 nodi, a conteggio), costo per tratti (onesto, losco, assurdo,
   rischioso: come ordinaMezzi), le sostituzioni per proprietà, le approssimazioni sulla variabile vicina (APPROX), le ricette in cache per
   (var, verso, quartiere) un giorno. Il piano è una fila di passi della Mente (verbi del registro e composti @procura/@vendi), messo in opera
   dall'obiettivo «desiderare» con il metodo «desiderio» (Mente.estendi). LA BOLLA d'intento (il fatto «desiderio», col nome di Lingua) si
   scrive solo quando il primo passo parte. L'ESITO lo decide il mondo: si rilegge la variabile; pieno o a metà, oppure la comica concreta
   (UnicoCose.guasto) e un secondo tentativo, poi la RINUNCIA, che è un verbo con la sua posa e una conseguenza vera (il cappello per terra,
   la roba portata a casa). Scaduta la voglia, la stessa rinuncia. I buchi (nessun mezzo per var × verso) si contano in st.u.desideri.mancanti.
   I NOMI: Lingua.desiderio(d) (la tabella Lingua.DESIDERI, i grappoli: volare, diventare ricco, vendicarsi...; se no il generico).
   Lo stato in st.u.desideri, solo dati. Il caso dal flusso 'desideri'. */
var UnicoDesideri = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UD = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UD;
  if (!ON) return UD;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const AT = () => (typeof Attore !== 'undefined' && Attore.ON ? Attore : null);
  const VB = () => (typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null);
  const CO = () => (typeof UnicoCose !== 'undefined' && UnicoCose.ON ? UnicoCose : null);
  const RI = () => (typeof UnicoRissa !== 'undefined' && UnicoRissa.ON ? UnicoRissa : null);
  const ID = () => (typeof UnicoIdee !== 'undefined' && UnicoIdee.ON ? UnicoIdee : null);
  const GR = () => (typeof UnicoGruppi !== 'undefined' && UnicoGruppi.ON ? UnicoGruppi : null);
  const LG = () => (typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null);
  const SG = () => (typeof Segni !== 'undefined' && Segni.ON ? Segni : null);
  const RG = () => (typeof Regista !== 'undefined' && Regista.ON ? Regista : null);
  const ME = () => { const M = (typeof Unico !== 'undefined' && Unico.Mente) || (typeof MenteUnica !== 'undefined' ? MenteUnica : null); return M && M.ON ? M : null; };
  if (!G || !Un() || !FT() || !AT() || !VB() || !CO() || !ID() || !ME() || !ME().estendi) { UD.ON = false; return UD; }
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
  const rnd = () => Un().flusso('desideri');
  const io = id => (id === 'player' ? 'nino' : id == null ? null : String(id));
  const CFG = UD.CFG = { attivi: 2, soglia: .32, durata: 480, prof: 3, fascio: 6, nodi: 60, ricetta: 1440, campione: 8, fatti: 80, testimoni: 3, firma: .6, recupero: 4320, storia: 12, tentativi: 2, raggio: 150, attesa: 25 };
  const stats = UD.stats = { nati: 0, scacciati: 0, chiusi: {}, mot: {}, var: {}, ricerche: 0, nodi: 0, nodiMax: 0, cache: 0, approssimati: 0, senza: 0, comiche: 0, rinunce: 0, ms: 0, msMax: 0, msRic: 0, msRicMax: 0, valutati: 0 };
  const npc = (st, id) => (id === 'nino' || id === 'player' ? st.player : G.byId ? G.byId(st, id) : null);
  const nome = (st, id) => CO()._.nome(st, id);
  const scrivi = (st, tipo, chi, dati, causa) => CO()._.scrivi(st, tipo, chi, dati, causa);
  const T = (st, id) => ID().tratti(st, id) || { follia: 0, zelo: .1, vilta: .5, carisma: .3 };
  const car = (st, id) => { const M = ME().mente(st, id); return (M && M.carattere) || {}; };
  function S(st) { const u = st && st.u; if (!u) return null; return u.desideri || (u.desideri = { n: 0, per: {}, dorme: {}, mancanti: {}, ricette: {}, firme: {}, storia: {}, visti: {}, cur: 0, bud: { t: -1, n: 0 } }); }

  // ======================= LE VARIABILI (Var) =======================
  const VARS = {};
  const Var = UD.Var = { dichiara(o) { VARS[o.k] = Object.assign({ di: 'attore', per: null, vis: 1 }, o); return Var; }, VARS };
  const A_ = (st, id) => { const n = npc(st, id); return n ? AT().di(st, n) : null; };
  const ALTI = () => Object.keys(G.PLACES || {}).filter(k => /faro|campanil|torre|monte|belved|rocca|castell/i.test(k + ' ' + (G.PLACES[k].name || '')));
  let alti = null;
  Var.dichiara({ k: 'soldi', leggi: (st, id) => (A_(st, id) || {}).soldi || 0, scala: [0, 200], vis: 0 })
    .dichiara({ k: 'possiede', per: 'roba', leggi: (st, id, p) => { const A = A_(st, id); return A ? A.borsa.get(p) || 0 : 0; } })
    .dichiara({ k: 'prop', per: 'prop', leggi: (st, id, p) => { const A = A_(st, id), R = CO(); let n = 0; if (A) for (const [k, q] of A.borsa) { const e = R.voce(k); if (e && (e.prop || []).includes(p)) n += q; } return n; } })
    .dichiara({ k: 'salute', scala: [0, 1], leggi: (st, id) => { const n = npc(st, id); return n ? clamp((n.hp || 100) / (n.maxHp || 100), 0, 1) : 0; } })
    .dichiara({ k: 'ferite', scala: [0, 6], leggi: (st, id) => CO().segniDi(st, id).length })
    .dichiara({ k: 'quota', scala: [0, 1], leggi: (st, id) => { const n = npc(st, id); if (!n) return 0; alti = alti || ALTI(); for (const p of alti) { const P = G.PLACES[p]; if (hyp(P.x - n.x, P.y - n.y) < 9) return 1; } return 0; } })
    .dichiara({ k: 'velocita', leggi: (st, id) => { const n = npc(st, id); return n ? (n.inVeh || n.vehicle ? 1 : clamp((n.speedNow || 0) / 12, 0, 1)) : 0; } })
    .dichiara({ k: 'posizione', per: 'posto', scala: [0, 1], leggi: (st, id, p) => { const n = npc(st, id), P = G.PLACES && G.PLACES[p]; return n && P && hyp(P.x - n.x, P.y - n.y) < 15 ? 1 : 0; } })
    .dichiara({ k: 'casa', scala: [0, 1], leggi: (st, id) => (A_(st, id) && A_(st, id).casa ? 1 : 0), vis: 0 })
    .dichiara({ k: 'lavoro', scala: [0, 1], leggi: (st, id) => { const n = npc(st, id); return n && n.pop && n.pop.job ? 1 : 0; }, vis: 0 })
    .dichiara({ k: 'affetto', per: 'altro', leggi: (st, id, b) => { const M = ME().mente(st, b), r = M && M.rel && M.rel[id]; return r ? r[0] || 0 : 0; } })
    .dichiara({ k: 'rancore', per: 'altro', scala: [0, 1], leggi: (st, id, b) => FT().rancore(st, io(id), io(b)) || 0, vis: 0 })
    .dichiara({ k: 'debito', per: 'altro', scala: [0, 1e9], leggi: (st, id, b) => Math.max(0, FT().debito(st, io(b), io(id)) || 0), vis: 0 })
    .dichiara({ k: 'pubblico', scala: [0, 2], leggi: (st, id) => { const n = npc(st, id); if (!n) return 0; let c = 0; for (const k of st.npcs) if (k !== n && !k.dead && !k.inside && Math.abs(k.x - n.x) < 15 && Math.abs(k.y - n.y) < 15) c++; let v = 0; for (const f of FT().per(st, { chi: id, da: st.t - 120 })) v += (f.test || []).length; return clamp(c / 10, 0, 1) + clamp(v / 12, 0, 1); } })
    .dichiara({ k: 'libero', scala: [0, 1], leggi: (st, id) => { const n = npc(st, id); return n && !(n.jailedUntil > st.t) ? 1 : 0; } })
    .dichiara({ k: 'membro', scala: [0, 1], leggi: (st, id) => (GR() && GR().gruppoDi(st, id) ? 1 : 0), vis: 0 })
    .dichiara({ k: 'capo', leggi: (st, id) => { const g = GR() && GR().gruppoDi(st, id); return g && g.capo === id ? 1 : 0; }, vis: 0 })
    .dichiara({ k: 'idea_di', per: 'soggetto', leggi: (st, id, s) => { const e = ID().di(st, id).find(x => ID().soggDi(x[0]) === s); return e ? e[1] * e[2] : 0; }, vis: 0 });
  for (const k of ['temuto', 'ridicolo', 'vigliacco']) Var.dichiara({ k, scala: [0, 1], leggi: (st, id) => (RI() ? RI().rep(st, id, k) : 0) });
  Var.dichiara({ k: 'fascicolo', leggi: (st, id) => { const s = st.u.rissa; return s && s.fasc[id] ? s.fasc[id][0] : 0; }, vis: 0 });
  let BISOGNI = ['fame', 'sonno', 'igiene', 'svago', 'compagnia', 'rabbia', 'paura'];
  function enumera(st) {   // i bisogni dell'Attore, letti da uno vero (i nomi vengono dai dati)
    if (enumera.ok) return; enumera.ok = true;
    try { const n = st.npcs.find(k => k.pop), B = n && AT().di(st, n).bisogni; if (B) { const K = Object.keys(B).filter(k => typeof B[k] === 'number'); if (K.length >= 3) BISOGNI = K; } } catch (e) { }
    for (const b of BISOGNI) Var.dichiara({ k: 'bisogno:' + b, leggi: (st2, id) => { const A = A_(st2, id); return A ? A.bisogni[b] || 0 : 0; }, vis: 0 });
  }
  const leggi = (st, d) => { const V = VARS[d.k]; if (!V) return 0; try { return +V.leggi(st, d.di, d.per) || 0; } catch (e) { return 0; } };
  UD.leggi = leggi;
  UD.tipi = () => Object.keys(VARS);

  // ======================= L'INDICE INVERSO: var × verso → candidati =======================
  // i termini degli effetti dei verbi: [var, verso, chi ('io' | 'chi' l'altro), per ($arg | costante)]
  const EFFV = UD.EFFV = {
    '-soldi': [['soldi', -1, 'io']], '+soldi': [['soldi', 1, 'io']], soldi_a: [['soldi', -1, 'io'], ['soldi', 1, 'chi'], ['debito', -1, 'io'], ['affetto', 1, 'chi']], soldi_da: [['soldi', 1, 'io']],
    '+borsa': [['possiede', 1, 'io', '$cosa']], '-borsa': [['possiede', -1, 'io', '$cosa']], borsa_a: [['possiede', -1, 'io', '$cosa'], ['possiede', 1, 'chi', '$cosa'], ['affetto', 1, 'chi']],
    sposta: [['possiede', 1, 'io', '$cosa']], consuma: [['bisogno:fame', -1, 'io']], bisogno: [['bisogno:sonno', -1, 'io']], muovi: [['posizione', 1, 'io']], entra: [], esci: [],
    pesca: [['possiede', 1, 'io', 'pesce']], ricetta: [['possiede', 1, 'io', '$out']], muro: [['pubblico', 1, 'io']], fiducia: [['affetto', 1, 'chi']], turno: [['soldi', 1, 'io']],
    casa: [['casa', 1, 'io']], piazza: [['quota', 1, 'io']], c_posa: [['quota', 1, 'io'], ['casa', 1, 'io']], '-recupero': [['possiede', 1, 'io', '$cosa']], diceria: [['idea_di', 1, 'chi']],
    appuntamento: [['affetto', 1, 'chi']], muso: [['debito', -1, 'chi']], lancio: [['ferite', 1, 'chi'], ['ridicolo', 1, 'chi']], raccolta: [['possiede', 1, 'io']],
    gradino: [['ferite', 1, 'chi'], ['temuto', 1, 'io'], ['ridicolo', 1, 'chi']], pace: [['rancore', -1, 'chi'], ['ridicolo', -1, 'io']], rinuncia: [], baratto: [['possiede', 1, 'io']],
    '-scorta': [], '+scorta': [], '+cassa': [], '-cassa': [], paga_pezzo: [], smonta: [['possiede', 1, 'io']],
  };
  // i mezzi del «come facciamo?» (unico_gruppi.js EFFETTI) per la variabile che muovono
  const MEZZI_V = { stare_in_aria: ['quota', 1], essere_in_alto: ['quota', 1], andare_veloce: ['velocita', 1], essere_visti: ['pubblico', 1], avere_soldi: ['soldi', 1], avere_riparo: ['casa', 1], liberare: ['libero', 1, 'chi'], fare_festa: ['bisogno:svago', -1] };
  // le approssimazioni: se niente muove la variabile, una vicina che le somiglia (il desiderio si segna «a metà»)
  const APPROX = { ridicolo: ['pubblico', 1], velocita: ['posizione', 1, 'salita'], quota: ['posizione', 1, 'faro'], vigliacco: ['temuto', 1], fascicolo: ['rancore', -1], salute: ['ferite', -1], ferite: ['ridicolo', 1], lavoro: ['soldi', 1], membro: ['affetto', 1], capo: ['temuto', 1], libero: ['pubblico', 1] };
  let IDX = null; const IGNOTI = UD.ignoti = new Set();
  function indice() {
    if (IDX) return IDX; IDX = {}; const V = VB(), add = (k, vs, c) => (IDX[k + '|' + vs] = IDX[k + '|' + vs] || []).push(c);
    for (const v in V.SCHEDE) {
      const S0 = V.SCHEDE[v]; const visti = new Set();
      for (const e of S0.eff || []) { const L = EFFV[e[0]]; if (!L) { IGNOTI.add(v + ':' + e[0]); continue; } for (const [k, vs, chi] of L) { const key = k + vs + chi; if (visti.has(key)) continue; visti.add(key); add(k, vs, { tipo: 'verbo', v, chi, t: S0.illegale ? 'losco' : (S0.costo && S0.costo.rischio > .2) ? 'rischioso' : 'onesto' }); } }
    }
    const Gr = GR(); if (Gr && Gr.EFFETTI) for (const e in Gr.EFFETTI) { const m = MEZZI_V[e]; if (!m) continue; for (const M of Gr.EFFETTI[e]) add(m[0], m[1], { tipo: 'mezzo', e, m: M.id, chi: m[2] || 'io', t: M.t, manca: M.manca }); }
    for (const k in G.VK || {}) add('velocita', 1, { tipo: 'mezzo_veicolo', m: k, chi: 'io', t: 'rischioso', manca: ['guida:' + k] });
    add('bisogno:fame', -1, { tipo: 'metodo', m: 'compra_cibo', chi: 'io', t: 'onesto' }); add('soldi', 1, { tipo: 'metodo', m: 'turno', chi: 'io', t: 'onesto' }); add('soldi', 1, { tipo: 'metodo', m: 'vendi_roba', chi: 'io', t: 'onesto' });
    add('debito', -1, { tipo: 'metodo', m: 'salda', chi: 'io', t: 'onesto' }); add('bisogno:svago', -1, { tipo: 'metodo', m: 'compra_bevi', chi: 'io', t: 'onesto' });
    add('possiede', 1, { tipo: 'procura', chi: 'io', t: 'onesto' }); add('possiede', -1, { tipo: 'mancante', m: 'ruba', chi: 'chi', t: 'losco', manca: ['ruba'] }); add('soldi', -1, { tipo: 'mancante', m: 'ruba', chi: 'chi', t: 'losco', manca: ['ruba'] });
    return IDX;
  }
  UD.indice = () => indice();

  // ======================= LA RICERCA ALL'INDIETRO (limitata, a conteggio) =======================
  const vaiP = (x, y) => ['vai', { x: r1(x), y: r1(y) }];
  const lontanoC = c => c.lod === 'lontano' || c.lod === 'dormiente';
  function vaiDa(c, k, r) { if (!k) return null; const d = hyp(k.x - c.n.x, k.y - c.n.y); if (d <= (r || 2.2)) return []; if (!lontanoC(c) && (d > CFG.raggio || !!k.inside !== !!c.n.inside)) return null; const f = Math.min(1, (r || 1.2) / d); return [vaiP(k.x + (c.n.x - k.x) * f, k.y + (c.n.y - k.y) * f)]; }
  const METODO = (c, m) => { const M = ME()._.METODI[m]; if (!M) return null; try { const r = M(c); return r && !r.attesa && r.passi ? r.passi : null; } catch (e) { return null; } };
  const posto = (c, p) => { const P = G.PLACES && G.PLACES[p]; if (!P) return null; const d = hyp(P.x - c.n.x, P.y - c.n.y); if (d < 8) return []; if (!lontanoC(c) && d > 300) return null; return [vaiP(P.x + 2, P.y + 1)]; };
  // il bersaglio di un verbo verso qualcuno per un desiderio su di sé (il rispetto: lo si prende da chi si ha in antipatia)
  function bersaglio(c, nd) { if (nd.altro) return nd.altro; let best = null, bv = .15; for (const id in c.M.rel || {}) { const r = FT().rancore(c.st, io(c.n.id), id); if (r > bv) { const k = npc(c.st, id); if (k && !k.dead && k !== c.st.player) { bv = r; best = id; } } } return best || nd.mod || null; }
  // le legature: il candidato → i passi della Mente, o null (non si può qui, adesso). node: { k, vs, di, per, altro }
  const BIND = {
    procura: (c, nd) => { if (!nd.per) return null; const p = ME()._.procura(c, nd.per, 1, 0); if (p) return p.length ? [['@procura', { cosa: nd.per, q: 1 }]] : []; const R = CO().vicinaTerra(c.st, c.n.x, c.n.y, 60, e => e[0] === nd.per); return R ? [vaiP(R[1][1], R[1][2]), ['raccogli', {}]] : null; },
    raccogli: (c, nd) => { const R = CO().vicinaTerra(c.st, c.n.x, c.n.y, lontanoC(c) ? 30 : 50, e => e[0] !== 'cocci' && (!nd.per || e[0] === nd.per)); return R ? [vaiP(R[1][1], R[1][2]), ['raccogli', {}]] : null; },
    vai: (c, nd) => (nd.per ? posto(c, nd.per) : null),
    compra: (c, nd) => BIND.procura(c, nd), prendi: (c, nd) => BIND.procura(c, nd), baratta: (c, nd) => BIND.procura(c, nd), fai_ricetta: (c, nd) => BIND.procura(c, nd), raccatta: (c, nd) => BIND.procura(c, nd),
    regala: (c, nd) => { const k = nd.altro ? npc(c.st, nd.altro) : null; const p = vaiDa(c, k); if (!p) return null; const g = CO().sostituto(c.A, 'esca'); return g ? p.concat([['regala', { chi: k.id, cosa: g[0], q: 1 }]]) : [['@procura', { cosa: 'pane', q: 1 }]].concat(p, [['regala', { chi: k.id, cosa: 'pane', q: 1 }]]); },
    lancia: (c, nd) => { const k = nd.altro ? npc(c.st, nd.altro) : null; if (!k || k.inside) return null; const d = hyp(k.x - c.n.x, k.y - c.n.y); const p = d < 9 ? [] : vaiDa(c, k, 7); if (!p) return null; const g = CO().sostituto(c.A, 'proiettile'); return (g ? [] : [['@procura', { cosa: 'pomodori', q: 1 }]]).concat(p, [['lancia', { cosa: g ? g[0] : 'pomodori', chi: k.id }]]); },
    guarda_storto: (c, nd) => { const b = bersaglio(c, nd), k = b ? npc(c.st, b) : null; const p = vaiDa(c, k, 2); return p ? p.concat([['guarda_storto', { chi: k.id }]]) : null; },
    insulta: (c, nd) => { const b = bersaglio(c, nd), k = b ? npc(c.st, b) : null; const p = vaiDa(c, k, 2.5); return p ? p.concat([['insulta', { chi: k.id }]]) : null; },
    scusati: (c, nd) => { const k = nd.altro ? npc(c.st, nd.altro) : null; const p = vaiDa(c, k, 2); return p ? p.concat([['scusati', { chi: k.id }]]) : null; },
    paga: (c, nd) => { const k = nd.altro ? npc(c.st, nd.altro) : null; if ((c.A.soldi || 0) < 2) return null; const p = vaiDa(c, k, 2); return p ? p.concat([['paga', { chi: k.id }]]) : null; },
    chiedi_prestito: (c, nd) => { const Gr = GR(), M = Gr && (Gr.EFFETTI.avere_soldi || []).find(x => x.id === 'prestito'); try { return M && M.esp ? M.esp(c, { v: 'desiderio', b: { k: 'idea', s: 'soldi' }, s: 0, val: 1 }) : null; } catch (e) { return null; } },
    pesca: c => METODO(c, 'pesca_vendi') || METODO(c, 'pesca'), mangia: c => METODO(c, 'mangia_borsa') || METODO(c, 'compra_cibo'), bevi: c => METODO(c, 'bevi_borsa'),
    vendi: c => METODO(c, 'vendi_roba'), lavora: c => METODO(c, 'turno'), salda: c => METODO(c, 'salda'),
    dipingi_muro: (c, nd) => { const Gr = GR(); return Gr && Gr.VERBI.dipingi_muro ? Gr.VERBI.dipingi_muro.esp(c, { v: 'dipingi_muro', b: { k: 'luogo', s: 'l:' + (nd.per || 'piazza') }, s: 0, val: 1 }) : null; },
    chiacchiera: (c, nd) => { const Gr = GR(); return Gr && Gr.VERBI.chiacchiera ? Gr.VERBI.chiacchiera.esp(c, { v: 'chiacchiera', b: { k: 'persona', s: nd.altro ? 'p:' + nd.altro : 'grigi' }, s: 0, val: 1 }) : null; },
  };
  function legaCand(c, cd, nd) {
    if (cd.tipo === 'verbo') { const B = BIND[cd.v]; return B ? B(c, nd) : undefined; }
    if (cd.tipo === 'metodo') return METODO(c, cd.m);
    if (cd.tipo === 'procura') return BIND.procura(c, nd);
    if (cd.tipo === 'mezzo') { const Gr = GR(), M = Gr && (Gr.EFFETTI[cd.e] || []).find(x => x.id === cd.m); if (!M || !M.esp) return undefined; try { return M.esp(c, { v: 'desiderio', b: { k: nd.altro ? 'persona' : 'luogo', s: nd.altro ? 'p:' + nd.altro : 'l:piazza' }, s: 0, val: 1, gid: null }); } catch (e) { return null; } }
    return undefined;
  }
  // il costo per chi è (onesto, losco, assurdo, rischioso: l'ordine di unico_gruppi.js reso generale) più la fatica dei passi
  function costo(c, cd, passi) {
    const n = c.n, tr = n.tr || {}, t = T(c.st, n.id), lg = typeof tr.legge === 'number' ? tr.legge : .5;
    const pref = (cd.t === 'onesto' ? .3 + lg * .5 : 0) + (cd.t === 'losco' ? (1 - lg) * .7 + t.zelo * .2 : 0) + (cd.t === 'assurdo' ? t.follia * 1.3 : 0) + (cd.t === 'rischioso' ? .25 + t.zelo * .4 - t.vilta * .6 : 0);
    return 1 - pref + (passi ? passi.length * .08 : 0) + rnd() * .25;
  }
  // cerca(c, d): { passi, cd, approx } o null. Nodo = (var, verso, per, altro); i figli sono le precondizioni che mancano (i soldi per comprare)
  function cerca(c, d) {
    const t0 = now(); stats.ricerche++; const s = S(c.st), I = indice(); let nodi = 0;
    const q = CO()._.quart(c.n.x, c.n.y), ck = d.k + '|' + d.vs + '|' + (d.altro ? 'a' : 'i') + '|' + q;
    const nd0 = { k: d.k, vs: d.vs, per: d.per, altro: d.altro, mod: d.mod && d.mod !== d.chi ? d.mod : null };
    function espandi(nd, prof) {
      if (prof > CFG.prof || nodi >= CFG.nodi) return null; nodi++;
      let L = (I[nd.k + '|' + nd.vs] || []).filter(cd => (nd.altro ? cd.chi === 'chi' : cd.chi === 'io'));
      const R = s.ricette[ck]; if (prof === 0 && R && c.st.t - R[1] < CFG.ricetta) { const x = L.find(cd => cdId(cd) === R[0]); if (x) { L = [x].concat(L.filter(y => y !== x)); stats.cache++; } }
      const out = [];
      for (const cd of L.slice(0, CFG.fascio * 2)) {
        if (prof === 0 && d.no && d.no.includes(cdId(cd))) continue;
        if (nodi >= CFG.nodi || out.length >= CFG.fascio) break; nodi++;
        if (cd.manca) { for (const m of cd.manca) conta(s.mancanti, 'verbo:' + m + ' (per ' + nd.k + (nd.vs > 0 ? '+' : '-') + ')'); continue; }
        let p = legaCand(c, cd, nd);
        if (p === undefined) { const Sv = cd.v && VB().SCHEDE[cd.v]; if (!(Sv && (Sv.fam === 'rissa' || Sv.fam === 'pace'))) conta(s.mancanti, 'legatura:' + (cd.v || cd.m)); continue; }
        if (!p && cd.tipo === 'procura' && nd.per && prof < CFG.prof) {   // la precondizione: i soldi per comprarla → un nodo figlio
          const e = CO().voce(nd.per), pr = e && e.prezzo ? e.prezzo : 0;
          if (pr && (c.A.soldi || 0) < pr) { const sub = espandi({ k: 'soldi', vs: 1 }, prof + 1); if (sub) p = sub.passi.concat([['@procura', { cosa: nd.per, q: 1 }]]); }
        }
        if (p) out.push({ passi: p, cd, c: costo(c, cd, p) });
      }
      if (!out.length) return null;
      out.sort((a, b) => a.c - b.c); return out[0];
    }
    let r = espandi(nd0, 0), approx = false;
    if (!r && !d.altro && APPROX[d.k]) { const [k, vs, per] = APPROX[d.k]; r = espandi({ k, vs, per: per || null }, 1); if (r) { approx = true; stats.approssimati++; conta(s.mancanti, 'approssimato:' + d.k + (d.vs > 0 ? '+' : '-') + '→' + k); } }
    if (!r) { stats.senza++; conta(s.mancanti, d.k + (d.vs > 0 ? '+' : '-') + (d.altro ? ' (di un altro)' : '')); }
    else s.ricette[ck] = [cdId(r.cd), Math.round(c.st.t)];
    stats.nodi += nodi; if (nodi > stats.nodiMax) stats.nodiMax = nodi;
    const ms = now() - t0; stats.msRic += ms; if (ms > stats.msRicMax) stats.msRicMax = ms;
    if (Object.keys(s.ricette).length > 200) s.ricette = {};
    return r ? { passi: r.passi, cd: r.cd, approx } : null;
  }
  const cdId = cd => cd.tipo + ':' + (cd.v || cd.m || '');
  const conta = (o, k) => { o[k] = (o[k] || 0) + 1; };
  UD.cerca = cerca;

  // ======================= LA NASCITA: le differenze percepite =======================
  // DELTA: il tipo del fatto → [var, chi ha il Δ ('chi'|'con0'), verso, quanto, per ('$cosa' | costante)]
  const DELTA = UD.DELTA = {
    compra: [['possiede', 'chi', 1, .3, '$cosa']], vende: [['soldi', 'chi', 1, .3]], pesca: [['possiede', 'chi', 1, .35, 'pesce']], regalo: [['affetto', 'con0', 1, .35], ['possiede', 'con0', 1, .3, '$cosa']],
    furto: [['possiede', 'con0', -1, .75, '$cosa'], ['soldi', 'con0', -1, .5]], multa: [['soldi', 'chi', -1, .5]], fermato: [['libero', 'chi', -1, .8]], repressione: [['libero', 'con0', -1, .8]],
    lancio: [['ferite', 'con0', 1, .55], ['ridicolo', 'con0', 1, .35]], insulto: [['ridicolo', 'con0', 1, .4]], spinta: [['ferite', 'con0', 1, .4]], botte: [['ferite', 'con0', 1, .7]], coltellata: [['ferite', 'con0', 1, .9]],
    minaccia: [['temuto', 'chi', 1, .4]], resa: [['ridicolo', 'chi', 1, .45]], fuga: [['vigliacco', 'chi', 1, .5]], rissa_fine: [['temuto', '$vinc', 1, .5]],
    riuscito: [['$mezzo', 'chi', 1, .8]], comica: [['ridicolo', 'chi', 1, .55]], guasto: [['ridicolo', 'chi', 1, .4]], impresa: [['pubblico', 'chi', 1, .8]],
    dipinge_muro: [['pubblico', 'chi', 1, .35]], costruisce: [['quota', 'chi', 1, .5]], struttura_chiesta: [['quota', 'chi', 1, .5]], raccoglie: [['possiede', 'chi', 1, .25, '$cosa']],
    prestito: [['soldi', 'con0', 1, .3]], rinfacciato: [['debito', 'con0', 1, .4], ['ridicolo', 'con0', 1, .2]], saldato: [['debito', 'chi', -1, .3]],
    gruppo_nato: [['membro', 'chi', 1, .4]], nuovo_capo: [['capo', 'chi', 1, .5]], idea: [['$idea', 'chi', 1, .4]], buca: [['affetto', 'con0', -1, .3]],
  };
  const BRUTTE = new Set(['ferite', 'ridicolo', 'vigliacco', 'debito', 'fascicolo', 'rancore']);
  const MEZZO_V = { rampa: 'quota', faro: 'quota', torre: 'quota', salita: 'velocita', muri: 'pubblico', voce: 'pubblico', barricata: 'pubblico', lavoro: 'soldi', vendere: 'soldi', pesca: 'soldi', prestito: 'soldi', tesoro: 'soldi', baracca: 'casa', appuntamento: 'pubblico' };   // [vocabolario] la festa riuscita: «farsi vedere» (con 'bisogno:svago' e il verso +1 nasceva la voglia di annoiarsi di più)
  // i tratti che pesano (§9.3): il vanitoso lo sguardo, l'avaro i soldi, il pauroso le botte, il folle tutto un po' storto
  function pesoTratto(st, id, k, vs, altro) {
    const t = T(st, id), ch = car(st, id), n = npc(st, id), tr = (n && n.tr) || {};
    let w = 1; if (k === 'pubblico' || k === 'ridicolo' || k === 'temuto') w *= 1 + (ch.teatrale || 0) + (ch.orgoglio || 0) * .5;
    if (k === 'soldi' || k === 'possiede') w *= 1 + (tr.avid || ch.avid || 0) * .8;
    if (k === 'ferite' && !altro) w *= 1 + t.vilta; if (altro) w *= .6 + (ch.rancore || 0) + t.zelo * .5 - t.vilta * .3;
    w *= 1 + t.follia * rnd();
    return clamp(w, .2, 3);
  }
  function firmaDi(d) { return d.k + '|' + (d.altro ? 'a' : 'i') + '|' + d.mot; }
  function rarita(st, d) {
    const s = S(st), f = s.firme[firmaDi(d)]; let r = 1;
    if (f) { const n = Math.max(0, f[0] - (st.t - f[1]) / CFG.recupero * 3); r = Math.pow(CFG.firma, n); }
    if (!s.visti[d.k]) r *= 1.4;
    const L = s.storia[d.chi]; if (L && L.includes(firmaDi(d))) r *= .5;
    return r;
  }
  function proponi(st, chi, d, sal) {
    const s = S(st), Mn = ME().mente(st, chi); if (!Mn) return null; const n = npc(st, chi); if (!n || n.dead || n.cop || n.grigio || !n.pop) return null;
    const L = s.per[chi] || (s.per[chi] = []);
    if (L.some(x => x.k === d.k && x.altro === d.altro && x.per === d.per)) return null;
    d = Object.assign({ id: ++s.n, chi, t0: Math.round(st.t), fino: Math.round(st.t + CFG.durata * (.6 + sal)), w: r2(clamp(sal, 0, 1.2)), stato: 'nuovo', n: 0, di: d.altro || chi }, d);
    d.v0 = r2(leggi(st, d)); { const sc = VARS[d.k] && VARS[d.k].scala; const lo = sc ? sc[0] : 0; if (d.vs < 0 && d.v0 <= lo + 1e-6 || sc && d.vs > 0 && d.v0 >= sc[1] - 1e-6) return null; }
    const L2 = LG(); d.nome = L2 && L2.desiderio ? L2.desiderio({ f: AT().di(st, n).sesso === 'f', k: d.k, per: d.per, vs: d.vs, altro: !!d.altro, nomeAltro: d.altro ? nome(st, d.altro) : null, cosa: d.k === 'possiede' ? d.per : null, posto: d.k === 'posizione' && G.PLACES[d.per] ? G.PLACES[d.per].name : null, mot: d.mot, q: d.q }) : d.k;
    if (L.length >= CFG.attivi) { L.sort((a, b) => a.w - b.w); if (L[0].w >= d.w || L[0].stato === 'piano') { s.dorme[chi] = d; return null; } s.dorme[chi] = L.shift(); stats.scacciati++; }
    L.push(d); stats.nati++; conta(stats.mot, d.mot); conta(stats.var, d.k); s.visti[d.k] = (s.visti[d.k] || 0) + 1;
    const fk = firmaDi(d), F = s.firme[fk] || (s.firme[fk] = [0, Math.round(st.t)]); F[0] = r1(Math.max(0, F[0] - (st.t - F[1]) / CFG.recupero * 3) + 1); F[1] = Math.round(st.t);
    const H = s.storia[chi] || (s.storia[chi] = []); H.push(fk); if (H.length > CFG.storia) H.shift();
    if (Mn.prossima > st.t + 3) Mn.prossima = r1(st.t + 1);
    return d;
  }
  UD.proponi = proponi;
  // il fatto → le differenze per chi c'era
  function ascolta(st, f) {
    const s = S(st); if (!s || !f.chi) return; const D = DELTA[f.v]; if (!D) return;
    const tb = Math.floor(st.t / 10); if (s.bud.t !== tb) { s.bud.t = tb; s.bud.n = 0; } if (s.bud.n >= CFG.fatti) return; s.bud.n++;
    enumera(st);
    const att = [f.chi].concat(f.con || []).map(io), x = f.x || {};
    for (const [k0, chiK, vs, q0, per0] of D) {
      const B = chiK === 'chi' ? att[0] : chiK === 'con0' ? att[1] : chiK === '$vinc' ? (x.vinc ? io(x.vinc) : null) : null; if (!B || B === 'nino') continue;
      let k = k0, per = per0 && per0[0] === '$' ? (per0 === '$cosa' ? f.cosa : null) : per0 || null;
      if (k === '$mezzo') k = MEZZO_V[x.mezzo] || 'pubblico';
      if (k === '$idea') { const m = typeof x.idea === 'string' ? x.idea.split('|') : null; if (!m) continue; const sg = m[0]; if (sg === 'grigi') { k = 'pubblico'; } else if (sg.slice(0, 2) === 'l:') { k = 'posizione'; per = sg.slice(2); if (!G.PLACES[per]) continue; } else if (sg.slice(0, 2) === 'p:' && (x.segno || 0) < 0) { const b = sg.slice(2); if (!npc(st, b)) continue; vedi(st, f, B, { k: 'ridicolo', vs: 1, altro: b, mot: 'contagio', q: q0 }); continue; } else continue; }
      if (k === 'possiede' && !per) continue;
      // chi ha subito: il torto (riavere, rovesciare) o la perdita; chi ha guadagnato: niente (lo vedono gli altri)
      const offeso = BRUTTE.has(k) ? vs > 0 : vs < 0;
      if (offeso) {
        const off = chiK === 'con0' ? att[0] : null;
        if (off && off !== B && off !== 'nino') {
          const r = rnd(), dd = r < .4 ? { k: k === 'ferite' || k === 'ridicolo' || k === 'vigliacco' ? (k === 'ferite' ? 'ferite' : 'ridicolo') : k, vs: k === 'ferite' || k === 'ridicolo' ? 1 : -1, altro: off }   // rovesciare: lo stesso a lui
            : r < .7 && (k === 'possiede' || k === 'soldi') ? { k, vs: 1, per }   // riavere
            : { k: rnd() < .5 ? 'ridicolo' : 'ferite', vs: 1, altro: off };   // pari su un'altra variabile
          vedi(st, f, B, Object.assign(dd, { mot: 'torto', q: q0, fatto: f.id, mod: off }));
        } else if (k === 'vigliacco') vedi(st, f, B, { k: 'temuto', vs: 1, mot: 'perdita', q: q0, fatto: f.id });
        else vedi(st, f, B, { k, vs: -vs, per, mot: 'perdita', q: q0, fatto: f.id });
        continue;
      }
      // chi ha visto (con e testimoni): mimesi se lo stima o lo invidia, vista se il cambiamento è raro, curiosità se la variabile è nuova per lui
      const obs = att.slice(1).concat((f.test || []).map(io)).filter(o => o && o !== B && o !== 'nino').slice(0, CFG.testimoni + 1);
      for (const o of obs) {
        const Mo = ME().mente(st, o); if (!Mo) continue; const r = Mo.rel && Mo.rel[B], aff = r ? r[0] || 0 : 0;
        const mot = aff > .15 ? 'mimesi' : (FT().rancore(st, o, B) > .2 ? 'mimesi' : q0 >= .5 ? 'vista' : !s.visti[k] ? 'curiosita' : null); if (!mot) continue;
        vedi(st, f, o, { k, vs, per, mot, q: q0 * (mot === 'mimesi' ? 1 + Math.abs(aff) : 1), fatto: f.id, mod: B });
      }
    }
  }
  function vedi(st, f, chi, d) {
    if (!chi || chi === 'nino') return; d.chi = chi; const vic = f.chi === chi || (f.con || []).map(io).includes(chi) ? 1 : .7;
    const sal = (d.q || .3) * vic * pesoTratto(st, chi, d.k, d.vs, !!d.altro) * rarita(st, d);
    if (sal < CFG.soglia) return; d.q = r2(d.q || 0);
    proponi(st, chi, d, sal);
  }
  ID().ascolta((st, f) => { try { ascolta(st, f); } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.desideri', e); } });

  // ======================= LA MENTE: «desiderare» e il metodo «desiderio» =======================
  const attiviDi = (st, id) => { const s = st.u && st.u.desideri; return (s && s.per[id]) || []; };
  const FONTE = c => { let w = 0; for (const d of attiviDi(c.st, c.n.id)) if (d.stato === 'nuovo' && !(d.att > c.st.t)) w = Math.max(w, d.w); return clamp(w, 0, 1); };
  function metodo(c) {
    const st = c.st, L = attiviDi(st, c.n.id).filter(d => d.stato === 'nuovo' && !(d.att > st.t)).sort((a, b) => b.w - a.w), d = L[0]; if (!d) return null;
    if (d.altro) { const k = npc(st, d.altro); if (!k || k.dead) { chiudi(st, d, 'sfumato'); return null; } }
    const r = cerca(c, d);
    if (!r) { d.n++; d.att = Math.round(st.t + 60); if (d.n >= CFG.tentativi) rinuncia(st, d, 'non sa come fare'); return null; }
    if (!r.passi.length) { chiudi(st, d, 'pieno'); return null; }
    d.stato = 'piano'; d.via = cdId(r.cd); d.approx = r.approx ? 1 : 0; d.reg = r.approx || r.cd.t === 'assurdo' ? 'assurdo' : 'serio'; d.tp = Math.round(st.t);
    // la bolla d'intento: adesso, perché il primo passo parte al passo dopo (§2.1.4)
    if (!d.fid) { const f = scrivi(st, 'desiderio', [c.n.id].concat(d.altro ? [d.altro] : []), { d: `${nome(st, c.n.id)} vuole ${d.nome}${MOT_W[d.mot] ? ' (' + MOT_W[d.mot] + ')' : ''}`, w: corto(d.nome), k: d.k, mot: d.mot, via: d.via }, d.fatto || null); d.fid = f ? f.id : null; }
    return { passi: r.passi, costo: .15, perche: d.fid, chi: d.altro || undefined };
  }
  const MOT_W = { mimesi: 'l\'ha visto fare a un altro', perdita: 'per rifarsi', vista: 'l\'ha visto', torto: 'per il torto', contagio: 'per un\'idea che gira', curiosita: 'per curiosità' };
  const corto = s => String(s || '').split(/\s+/).slice(0, 3).join(' ');
  ME().estendi({ fonti: { desiderio: FONTE }, obiettivi: { desiderare: { base: 1.15, considera: [['tutto', 'desiderio', 1]], car: ['teatrale'], metodi: ['desiderio'] } }, metodi: { desiderio: metodo }, costo: { desiderio: () => .15 } });
  if (ME().ORARIO) for (const b of ['svago', 'giro', 'sfogo', 'spesa', 'mercato']) if (ME().ORARIO[b]) ME().ORARIO[b].desiderare = 1.25;

  // ======================= L'ESITO E LA RINUNCIA (sempre concreti) =======================
  function chiudi(st, d, esito, motivo) {
    const s = S(st), L = s.per[d.chi]; if (L) { const i = L.indexOf(d); if (i >= 0) L.splice(i, 1); if (!L.length) delete s.per[d.chi]; }
    d.stato = 'fatto'; conta(stats.chiusi, esito);
    if (s.dorme[d.chi] && st.t < s.dorme[d.chi].fino) { const x = s.dorme[d.chi]; delete s.dorme[d.chi]; (s.per[d.chi] = s.per[d.chi] || []).push(x); } else delete s.dorme[d.chi];
    if (esito === 'sfumato') return null;
    const v = r2(leggi(st, d)), W = { pieno: 'ce l\'ha fatta', meta: 'ce l\'ha fatta a metà', comico: 'è finita in una comica', rinuncia: 'ci ha rinunciato' };
    return scrivi(st, 'desiderio_fine', [d.chi].concat(d.altro ? [d.altro] : []), { d: `${nome(st, d.chi)} voleva ${d.nome}: ${W[esito] || esito}${motivo ? ' (' + motivo + ')' : ''}`, esito, k: d.k, dv: r2(v - d.v0), via: d.via || null }, d.fid || d.fatto || null);
  }
  function rinuncia(st, d, motivo) {
    stats.rinunce++; const n = npc(st, d.chi);
    if (n && !n.dead) { const r = VB().fai(st, n, 'rinuncia', { motivo: motivo || 'lascia perdere', cosa: d.k === 'possiede' ? d.per : null }, { subito: true, causa: d.fid || null }); if (!r || !r.ok) CO().aTerra(st, 'cappello', n.x + .4, n.y, false, n.id); }
    return chiudi(st, d, 'rinuncia', motivo);
  }
  UD.rinuncia = rinuncia;
  // la rinuncia di chiunque (anche le voglie dei gruppi): un verbo con una posa e una conseguenza vera
  { const V = VB();
    V.EFF.rinuncia = c => {
      const A = c.A, n = A.o, st = c.st; if (!n) return;
      // la roba presa per la voglia torna a casa (se c'è la casa e uno ce l'ha); se no il cappello sbattuto per terra
      const cosa = c.a && c.a.cosa; let fatto = null;
      if (cosa && A.casa && A.casa.dispensa && A.borsa.get(cosa) >= 1) { A.borsa.togli(cosa, 1); A.casa.dispensa.add(cosa, 1); fatto = 'casa'; }
      else { CO().aTerra(st, 'cappello', n.x + .4, n.y + .2, false, n.id); fatto = 'cappello'; if (A.bisogni) A.bisogni.rabbia = clamp((A.bisogni.rabbia || 0) + .1, 0, 1); n.stun = Math.max(n.stun || 0, .6); }
      c.r = { motivo: String((c.a && c.a.motivo) || '').slice(0, 40), resta: fatto };
    };
    V.registra('rinuncia', { fam: 'pace', args: { motivo: 's?', cosa: 'roba?' }, pre: [['vivo']], eff: [['rinuncia']], costo: { min: .5 }, posa: 'discute', segno: { bolla: ['mano_giu', 'basta!'], cambia: 'terra' },
      fatto: 'rinuncia', menu: false, esiti: { ok: 'il cappello per terra, o la roba a casa' } });
  }
  // il controllo dei desideri: a campione, CFG.campione per passo, a rotazione
  function controlla(st, s) {
    const K = Object.keys(s.per); if (!K.length) return; let k = 0;
    for (let j = 0; j < Math.min(CFG.campione, K.length); j++) {
      s.cur = (s.cur + 1) % K.length; const id = K[s.cur], L = s.per[id]; if (!L) continue;
      for (const d of L.slice()) {
        stats.valutati++; k++;
        const n = npc(st, id); if (!n || n.dead) { chiudi(st, d, 'sfumato'); continue; }
        if (st.t > d.fino) { rinuncia(st, d, d.stato === 'piano' ? 'non ce l\'ha fatta in tempo' : 'non ci pensa più'); continue; }
        if (d.stato !== 'piano') continue;
        const M = ME().mente(st, id); if (M && M.ob && M.ob.g === 'desiderare' && st.t - d.tp < 240) continue;   // il piano va avanti
        // il piano è finito (o si è rotto): si rilegge la variabile; se non è cambiata si aspetta un poco (la lite sale, la gente arriva)
        const dv = (leggi(st, d) - d.v0) * d.vs;
        if (dv > 1e-6) chiudi(st, d, d.approx || dv < .2 && d.k !== 'possiede' && d.k !== 'ferite' ? 'meta' : 'pieno');
        else if (!d.fine) d.fine = Math.round(st.t);
        else if (st.t - d.fine >= CFG.attesa) {
          d.n++; d.fine = 0; (d.no = d.no || []).push(d.via);
          if (d.n >= CFG.tentativi) {   // la seconda volta: la comica concreta, poi la rinuncia
            stats.comiche++; const f = { id: d.fid, chi: id, v: 'desiderio', cosa: d.k === 'possiede' ? d.per : null, test: [], x: { verbo: (d.via || '').split(':')[1] || null } };
            CO().guasto(st, f, true); rinuncia(st, d, 'è andata storta due volte');
          } else { d.stato = 'nuovo'; d.att = Math.round(st.t + 20); }   // si ripianifica una volta, con un altro mezzo
        }
      }
      if (k > 24) break;
    }
  }
  // le voglie dei gruppi che scadono o restano senza mezzo finiscono con la stessa rinuncia (non spariscono)
  function voglieGruppi(st) {
    const sg = st.u.gruppi; if (!sg || !sg.voglie) return;
    for (const id in sg.voglie) { const v = sg.voglie[id]; if (v.fino >= st.t || v.__r) continue; v.__r = 1; const n = npc(st, id); if (n && !n.dead && !n.inside) { VB().fai(st, n, 'rinuncia', { motivo: 'non sa come ' + (GR() ? GR().inf(st, v) : v.v) }, { subito: true }); stats.rinunce++; } }
  }

  // ======================= LA FASE =======================
  function fase(st) {
    const s = S(st); if (!s || !st.npcs || !st.u.menti) return; const t0 = now();
    enumera(st);
    if ((Un().passi % 4) === 0) controlla(st, s);
    if ((Un().passi % 50) === 0) voglieGruppi(st);
    const ms = now() - t0; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
  }
  Un().fase('unico.desideri', { dopo: 'unico.gruppi', budget: { p95: .05 } }, fase);
  if (Un().nasce) Un().nasce('desideri', st => { S(st); });
  // le spinte: chi ha un desiderio vivo lo sente (a catena con regista, idee e gruppi)
  { const Mi = ME().innesti, prima = Mi.spinta; Mi.spinta = (st, id) => { const a = prima ? prima(st, id) : null, L = attiviDi(st, id); if (!L.length) return a; const w = Math.max(...L.map(d => d.w)); return ID().unisci(a, { desiderare: r2(clamp(1 + w * .5, 1, 1.6)), $max: 1.6 }); }; }

  // ======================= I SEGNI, I FILI =======================
  const Sg = SG();
  if (Sg && Sg.TIPI) {
    Object.assign(Sg.TIPI, {
      desiderio: { p: 'fumetto', w: '$w', gz: .3, n: ['desiderio', 'desideri'] }, desiderio_fine: { p: 'esclamativo', gz: .5, n: ['desiderio finito', 'desideri finiti'], bolla: false },
      rinuncia: { p: 'mano_giu', w: 'basta!', posa: 'discute', gz: .2, n: ['rinuncia', 'rinunce'] },
    });
    // il divieto della bolla vuota (§2.1.4): il capriccio e il «vuole» non si annunciano (la bolla viene col primo passo, o con la rinuncia)
    for (const t of ['capriccio', 'vuole']) if (Sg.TIPI[t]) Sg.TIPI[t].bolla = false;
  }
  { const Fg = FT().GRAV; if (Fg) Object.assign(Fg, { desiderio: .35, desiderio_fine: .45, rinuncia: .3 }); }
  const R = RG();
  if (R && R.TIPI_FILO) {
    const R_ = (fam, m, r, o) => Object.assign({ fam, m, r }, o || {}), T_ = R.TIPI_FILO;
    T_.desiderio = (T_.desiderio || []).concat([R_('idea', 'apre', { portatore: 'chi' })]);
    T_.desiderio_fine = (T_.desiderio_fine || []).concat([R_('idea', 'avanza', { portatore: 'chi' })]); T_.rinuncia = (T_.rinuncia || []).concat([R_('idea', 'avanza', { portatore: 'chi' })]);
    Object.assign(R.GT, { desiderio: .08, desiderio_fine: .1, rinuncia: .05 });
    try { R.problemi = R.controlla(); } catch (e) { }
  }

  // ======================= LA SCHEDA «DESIDERI» DEL TACCUINO (con &regia anche i mancanti e le liti) =======================
  const DEBUG = typeof location !== 'undefined' && /[?&]regia\b/.test(location.search);
  const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  function html(st) {
    const F = FT(), L = attivi(st).filter(d => DEBUG || (d.fid && (F.di(st, d.fid) || {}).vis));
    let h = '<p class="hint">Quello che la gente vuole, da quando l\'ha visto succedere: e come va a finire.</p><h4>Desideri</h4><ul>';
    h += L.length ? L.slice(0, 20).map(d => `<li><b>${esc(nome(st, d.chi))}</b> vuole ${esc(d.nome)} <small>(${esc(MOT_W[d.mot] || d.mot)}${DEBUG ? ' · ' + d.k + (d.vs > 0 ? '+' : '-') + ' · w ' + d.w + ' · ' + d.stato + (d.via ? ' · ' + d.via : '') : ''})</small></li>`).join('') : '<li><span style="opacity:.7">Niente che tu sappia.</span></li>';
    h += '</ul>';
    if (DEBUG) { const R = RI(); h += '<h4>Mancanti (il vocabolario che manca)</h4><p><small>' + esc(mancanti(st, 16).map(x => x[0] + ' ×' + x[1]).join(' · ')) + '</small></p>';
      if (R) h += '<h4>Liti</h4><p><small>' + esc(JSON.stringify(R.stats.uscite)) + ' · gradini ' + esc(R.stats.saliti.join('/')) + ' · aperte ' + st.u.rissa.L.length + '</small></p>'; }
    return h;
  }
  if (Sg && Sg.scheda) Sg.scheda('u_desideri', 'Desideri', html);

  // ======================= LE LETTURE =======================
  function mancanti(st, n) { const s = S(st); return s ? Object.entries(s.mancanti).sort((a, b) => b[1] - a[1]).slice(0, n || 20) : []; }
  function attivi(st) { const s = S(st), out = []; if (!s) return out; for (const id in s.per) for (const d of s.per[id]) out.push(d); return out; }
  Object.assign(UD, { S, Var, VARS, leggi, cerca, proponi, ascolta, metodo, chiudi, rinuncia, controlla, fase, mancanti, attivi, DELTA, EFFV, APPROX, BIND, _: { enumera, indice, firmaDi, rarita, pesoTratto } });
  Un().Desideri = UD;
  return UD;
})();
if (typeof window !== 'undefined') window.UnicoDesideri = UnicoDesideri;
