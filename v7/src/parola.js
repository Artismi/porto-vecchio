/* [commedia] Porto Vecchio — parola e azione (vedi commedia/PAROLA_AZIONE.md): prima si prova, poi si parla.
   Tutto dietro ?commedia o ?parola: a interruttore spento questo file non fa niente. Fuori dall'impronta dei tasselli.
   Passi 1-3 del progetto (la strada senza IA, a parole chiave):
   - INTENTO: Parola.capisci(st, n, testo) → un intento solo per frase (gli altri solo se uniti da «e»/«poi»), con il luogo
     trovato per id, nome intero, corrispondenza più lunga (due candidati alla pari → un dubbio), la persona prima del luogo
     («tieni d'occhio Gino» → pedina), la roba da un risolutore solo (RS.RES, Oggetti.CAT, Azioni.ITEMS) con l'articolo giusto.
   - VERIFICA a secco: Parola.verifica(st, n, intento) → accetta / rifiuta (col motivo vero) / contratta / chiede / niente.
   - RISPOSTA: Parola.rispondi(st, n, testo): si verifica, si fa partire la cosa, e SOLO DOPO si sceglie la battuta dall'esito.
     Il cane da guardia (Parola.promette) butta ogni battuta che promette senza una promessa accettata.
   - PROMESSE: st.parola.promesse, legate al compito vero del motore (task della Risacca, piano di Azioni, appuntamento,
     accompagna, impresa, veglia); aggiornamenti, rapporto finale, conseguenze; la scheda «Parola data» nel Taccuino.
   - RECLUTARE costa: fiducia ≥ .3, una promessa mantenuta (o la missione), due chiacchierate in giorni diversi.
   - Le frasi dette da soli (azioni.js: «Offro io», «Tieni, è per te», «chiamo la Guardia») escono solo se la cosa parte.
   Passi 4-10 (questo file, stesso interruttore):
   - L'IA (§4): la richiesta «dialogo» versione parola1 (verbi, volontà, fattibilità, impegni, storia) parte da Mente.dialog e
     da RS.chatTurns (Claude); la risposta (intento + una battuta per esito) passa da intentoDaIA → verifica → rispondi; la
     battuta dell'IA vale solo se corrisponde all'esito e al motivo veri. Kind nuovi «banda» e «mandato» (server.js, api/_mente.js).
   - La CHAT DELLA BANDA (§2.7): thread `banda`, a uno / a tutti / al più adatto, chi risponde prima, le obiezioni, i piani coi
     ruoli (palo, scassa, porta, autista, voce) con ritrovo, sync e palo che avvisa; chi lavora per gli Orecchi accetta e tradisce
     (una volta). La finestra riusa #rs-chat; mentre è aperta il tempo va al rallentatore.
   - I MANDATI (§0): nove modelli, il metodo scelto dal carattere, le fasi come promesse, il progresso dallo stato, la revisione
     delle 22, i rapporti, le conseguenze, il mandato alla banda (divisione, obiezioni, referente), la scheda «Mandati».
   - La RAPINA (§0.10): metodo del mandato «soldi», proposta in chat dei membri (mai senza il sì), crew di abitanti da sole
     (una a settimana), armi vere (Famiglia, 40%) o finte (la banana), sopralluogo, colpo, fuga, spartizione, conseguenze.
   Tutto per avvolgimento dall'esterno, al caricamento: nessun file esistente cambia. */
(function () {
  'use strict';
  const ON = (typeof location !== 'undefined' && /[?&](commedia|parola)\b/.test(location.search)) || (typeof globalThis !== 'undefined' && globalThis.PV_PAROLA === true);
  const Parola = { ON };
  if (typeof window !== 'undefined') window.Parola = Parola;
  if (typeof module !== 'undefined' && module.exports) module.exports = Parola;
  if (!ON) return;
  const G = typeof Game !== 'undefined' ? Game : null, RS = typeof Risacca !== 'undefined' ? Risacca : null;
  if (!G || !RS || !G.HOOKS) return;
  const Po = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const Az = () => (typeof Azioni !== 'undefined' ? Azioni : null);
  const Og = () => (typeof Oggetti !== 'undefined' ? Oggetti : null);
  const Sc = () => (typeof Scambi !== 'undefined' ? Scambi : null);
  const Eco = () => (typeof Economia !== 'undefined' ? Economia : null);
  const Cv = () => (typeof Convivenza !== 'undefined' ? Convivenza : null);
  const Im = () => (typeof Imprese !== 'undefined' ? Imprese : null);
  const PLACES = G.PLACES;

  // ================= ATTREZZI =================
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[«»"'’`]/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = s => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const low1 = s => (s ? s[0].toLowerCase() + s.slice(1) : s);
  const NAME = () => G.PLAYER_NAME || 'Nino';
  const nome = n => (n ? RS.battle(n) || n.first || n.name : '?');
  const dayIdx = t => Math.floor(t / 1440);
  const hhmm = t => G.clockStr(t);
  const o = n => { const P = Po(); return P && P._ && P._.o ? P._.o(n) : 'o'; };
  const rnd = st => (st && st.rng ? st.rng() : Math.random());
  const pickR = (st, a) => a[Math.floor(rnd(st) * a.length) % a.length];
  const note = (st, n, text, kind, opt) => { const P = Po(); if (P && n && n.pop) try { P.note(st, n, text, kind, opt); } catch (e) { } };

  const S = st => st.parola || (st.parola = {
    promesse: [], next: 1, veglie: [], storia: [],
    stats: { guardia: 0, risposte: 0, esiti: {}, annunci: { offri: 0, regala: 0, chiama: 0 }, promesse: 0, fatte: 0, fallite: 0, rotte: 0 },
    giorni: {}, pend: {}, ultime: {}, upd: {}, rotte: {}, diffida: {}, danger: {},
    mandati: [], nextM: 1, piani: [], nextP: 1, rapine: [], nextR: 1, tradito: {}, iaReq: {}, ultimaRapina: -1e9,
  });

  // ================= IL CANE DA GUARDIA =================
  // le forme dell'impegno: una battuta che le contiene dice «sì»
  const PROMISE_RE = /\b(vado|ci vado|vengo|arrivo subito|ti seguo|ti aspetto|te l[oaie] porto|te li porto|te ne porto|ti porto|ci penso io|contaci|fatto|fatta|offro io|lo pago io|la pago io|domani faccio|stasera porto|va bene|d accordo|ci sto|lo faccio|la faccio|agli ordini|sara fatto|volentieri|subito|senz altro|affare fatto|ok|okay|promesso)\b/;
  const promette = text => PROMISE_RE.test(norm(text));
  Parola.promette = promette;

  // ================= LA ROBA: tre cataloghi, un risolutore =================
  const MASC_E = new Set(['pane', 'latte', 'sale', 'miele', 'pesce', 'sapone', 'caffe', 'te', 'carbone', 'salame', 'giornale', 'cartone', 'cemento', 'mattone', 'motore', 'fiore', 'cane', 'caricatore', 'registratore', 'altoparlante', 'interruttore', 'trasmettitore', 'tester', 'mare', 'pontile', 'ponte', 'cantiere', 'distributore', 'monte', 'torrente', 'piazzale', 'viale', 'canale', 'belvedere', 'casale', 'ovile', 'campanile', 'fiume']);
  const FEM_E = new Set(['carne', 'chiave', 'rete', 'lente', 'fune', 'neve', 'polvere', 'luce', 'stampante', 'tessera']);
  const FEM_O = new Set(['radio', 'foto', 'moto', 'auto', 'radiolina']);
  const MASC_A = new Set(['sistema', 'problema', 'cinema', 'programma']);
  function genere(nm) {
    const h = toks(nm)[0] || ''; const last = h.slice(-1);
    if (FEM_O.has(h)) return { f: true, pl: false, h };
    if (h === 'uova') return { f: true, pl: true, h };
    if (MASC_A.has(h)) return { f: false, pl: false, h };
    if (/ione$/.test(h)) return { f: true, pl: false, h };
    if (last === 'a') return { f: true, pl: false, h };
    if (last === 'o') return { f: false, pl: false, h };
    if (last === 'i') return { f: false, pl: true, h };
    if (last === 'e') return MASC_E.has(h) ? { f: false, pl: false, h } : FEM_E.has(h) ? { f: true, pl: false, h } : { f: true, pl: true, h };
    return { f: false, pl: false, h };
  }
  const vow = h => /^[aeiouh]/.test(h), sCons = h => /^(s[bcdfgklmnpqrstvz]|z|gn|ps|x|y|pn)/.test(h);
  // un/uno/una/un' · il/lo/la/l'/i/gli/le · del/dello/della/dell'/dei/degli/delle
  function art(nm, kind) {
    const g = genere(nm), h = g.h, sp = ' ';
    if (kind === 'indet') { if (g.pl) return (g.f ? 'delle' : sCons(h) || vow(h) ? 'degli' : 'dei') + sp + nm; return (g.f ? (vow(h) ? "un'" : 'una ') : sCons(h) ? 'uno ' : 'un ') + nm; }
    if (kind === 'det') { if (g.pl) return (g.f ? 'le' : sCons(h) || vow(h) ? 'gli' : 'i') + sp + nm; return (vow(h) ? "l'" : g.f ? 'la ' : sCons(h) ? 'lo ' : 'il ') + nm; }
    if (g.pl) return (g.f ? 'delle' : sCons(h) || vow(h) ? 'degli' : 'dei') + sp + nm;
    return (vow(h) ? "dell'" : g.f ? 'della ' : sCons(h) ? 'dello ' : 'del ') + nm;
  }
  // il plurale della parola di testa: «bomboletta» → «bombolette», «cassetta degli attrezzi» → «cassette degli attrezzi»
  function plurale(nm) {
    const w = String(nm).split(' '), h = w[0], g = genere(h);
    if (g.pl) return nm;
    const pl = /ca$/.test(h) ? h.slice(0, -1) + 'he' : /ga$/.test(h) ? h.slice(0, -1) + 'he' : /a$/.test(h) ? h.slice(0, -1) + 'e' : /io$/.test(h) ? h.slice(0, -1) : /co$/.test(h) ? h.slice(0, -1) + 'hi' : /[oe]$/.test(h) ? h.slice(0, -1) + 'i' : h;
    return [pl].concat(w.slice(1)).join(' ');
  }
  const NUMW = ['zero', 'un', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci'];
  // «una bomboletta», «due bombolette», «del pane»
  function quantiDi(nm, q, mass) {
    if (mass && q <= 1) return art(nm, 'part');
    if (q <= 1) return art(nm, 'indet');
    return `${NUMW[q] || q} ${plurale(nm)}`;
  }
  Parola.art = art; Parola.quantiDi = quantiDi;
  // «alla Calata del porto», «al Bar Da Gino», «all'Osteria del Porto», «in Piazza San Rocco»
  const ART_A = { 'il ': 'al ', 'lo ': 'allo ', 'la ': 'alla ', "l'": "all'", 'i ': 'ai ', 'gli ': 'agli ', 'le ': 'alle ' };
  function aLuogo(name) {
    if (!name) return 'là';
    const h = toks(name)[0] || '';
    if (/^(piazza|via|vico|vicolo|caruggio|salita|piazzetta|largo|corso|viale|passeggiata|cima)$/.test(h)) return 'in ' + name;
    if (/^(sopra|sotto|in|dentro|fuori)$/.test(h)) return name[0].toLowerCase() + name.slice(1);
    const d = art(name, 'det'), k = Object.keys(ART_A).find(x => d.startsWith(x));
    return k ? ART_A[k] + d.slice(k.length) : 'a ' + name;
  }
  Parola.aLuogo = aLuogo;
  const STOPC = new Set(['porta', 'portami', 'prendi', 'prendimi', 'dammi', 'compra', 'compri', 'vendi', 'tieni', 'fai', 'vai', 'mi', 'ti', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'un', 'una', 'uno', 'il', 'lo', 'la', 'le', 'gli', 'di', 'da', 'a', 'al', 'alla', 'per', 'con', 'che', 'me', 'ne', 'se', 'non', 'qui', 'po', 'poco', 'favore', 'dai', 'dare', 'puoi', 'potresti', 'casa', 'base']);
  const stem = w => (w.length >= 5 ? w.replace(/[aeiou]$/, '') : w);
  const MASS = new Set(['cibo', 'bevande', 'combustibili', 'dispensa']);
  // { cat: 'res'|'ogg'|'az', id, nome, frase, q }
  function cosa(text, order) {
    const T = toks(text).filter(w => !STOPC.has(w)), TS = new Set(T), ST = new Set(T.map(stem));
    order = order || ['ogg', 'res', 'az'];
    const cands = [];
    const tryName = (cat, id, nm, extra) => {
      const nt = toks(nm).filter(w => !STOPC.has(w)); if (!nt.length) return;
      let sc = 0;
      if (TS.has(id.replace(/_/g, ' ')) || TS.has(id)) sc = 4;
      else if (nt.length > 1 && norm(text).includes(norm(nm))) sc = 3.5;
      else if (TS.has(nt[0])) sc = 3;
      else if (id.length >= 5 && ST.has(stem(id.split('_')[0]))) sc = 3;
      else if (nt[0].length >= 4 && ST.has(stem(nt[0]))) sc = 2.5;
      else if (nt.slice(1).some(w => w.length >= 5 && (TS.has(w) || ST.has(stem(w))))) sc = 1.5;
      (extra || []).forEach(w => { const wn = norm(w); if (wn.includes(' ') ? norm(text).includes(wn) : (TS.has(wn) || (wn.length >= 5 && ST.has(stem(wn))))) sc = Math.max(sc, 2.8); });
      if (sc) cands.push({ cat, id, nome: nm, sc: sc - order.indexOf(cat) * .05 });
    };
    if (order.includes('res')) Object.entries(RS.RES).forEach(([id, R]) => tryName('res', id, R.one || R.name, R.syn.concat([R.name])));
    if (order.includes('ogg') && Og()) Object.values(Og().CAT).forEach(c => tryName('ogg', c.id, c.nome));
    if (order.includes('az') && Az()) Object.values(Az().ITEMS).forEach(c => tryName('az', c.id, c.name));
    if (!cands.length) return null;
    cands.sort((a, b) => b.sc - a.sc);
    const c = cands[0];
    // quanto: il numero detto subito prima della parola, o in cifre
    const raw = toks(text); let q = 1;
    const dig = norm(text).match(/\b(\d+)\b/); if (dig) q = +dig[1];
    const i = raw.findIndex(w => toks(c.nome)[0] === w || stem(w) === stem(toks(c.nome)[0] || '') || w === c.id);
    if (i > 0) { const k = NUMW.indexOf(raw[i - 1]); if (k >= 2) q = k; if (raw[i - 2] === 'un' && raw[i - 1] === 'paio') q = 2; }
    if (/\bqualche\b/.test(norm(text))) q = 3;
    q = clamp(q, 1, 20);
    const ogg = Og() && Og().CAT[c.id], mass = !!(ogg && MASS.has(ogg.cat)) && !/\b(un|una|uno)\b/.test(norm(text));
    return { cat: c.cat, id: c.id, nome: c.nome, q, mass, frase: quantiDi(c.nome, q, mass) };
  }
  Parola.cosa = cosa;

  // ================= I LUOGHI =================
  const STOPL = new Set(['del', 'della', 'dello', 'dei', 'degli', 'delle', 'di', 'da', 'la', 'il', 'lo', 'le', 'gli', 'al', 'alla', 'allo', 'ai', 'alle', 'in', 'nel', 'nella', 'sul', 'sulla', 'a', 'e', 'per', 'con', 'su', 'dal', 'dalla', 'verso', 'vai', 'va', 'vieni', 'casa']);
  const NOID = new Set(['muro', 'passo', 'dita', 'memoria', 'mare', 'monte', 'covo', 'pietra', 'campo', 'stella', 'aurora', 'cultura', 'scalo', 'varco', 'gola', 'pizzo', 'vetta', 'cantina', 'governo', 'garante', 'ministero', 'rocca', 'archivio', 'deserto', 'punta', 'sorgente', 'video']);
  const ALIAS = { caserma: 'commissariato', guardia: 'commissariato', comando: 'miramare', chiesa: 'chiesa', mare: 'spiaggia', spiaggia: 'spiaggia', forno: null, bar: 'bar', porto: null, pontile: 'pontile', faro: 'faro' };
  // → { id, name, x, y } | { dubbio: [a, b] } | null
  function trovaLuogo(st, text, n) {
    const t = norm(text), T = toks(text), TS = new Set(T);
    if (!t) return null;
    if (PLACES[t]) return Object.assign({ id: t }, PLACES[t]);
    if (/\b(qui|qua)\b/.test(t) && !T.some(w => PLACES[w] && !NOID.has(w))) { const p = n || st.player; const np = G.nearestPlace(p.x, p.y); return { id: np.id, name: np.name, x: p.x, y: p.y, qui: true }; }
    const sc = new Map(), add = (id, s, ref) => { const cur = sc.get(id); if (!cur || cur.s < s) sc.set(id, { s, ref }); };
    const has = s => new RegExp(`(^| )${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(t);
    // le basi della Risacca
    if (st.ris) st.ris.bases.filter(b => b.alive).forEach((b, i) => { const bn = norm(b.name); if (has(bn)) add('base:' + b.id, 3000 + bn.length, { id: b.id, name: b.name, x: b.x, y: b.y, base: b }); else if (i === 0 && /\b(la base|in base|alla base|nostra base)\b/.test(t)) add('base:' + b.id, 1600, { id: b.id, name: b.name, x: b.x, y: b.y, base: b }); });
    for (const p of Object.values(PLACES)) {
      const pn = norm(p.name);
      if (has(pn)) add(p.id, 2000 + pn.length, p);
      if (TS.has(p.id) && !NOID.has(p.id) && p.id.length >= 3) add(p.id, 1000 + p.id.length, p);
      const pw = toks(p.name).filter(w => w.length >= 4 && !STOPL.has(w));
      const m = pw.filter(w => TS.has(w)); if (m.length) add(p.id, m.reduce((s, w) => s + w.length, 0) + (m.length === pw.length ? 30 : 0), p);
    }
    Object.entries(ALIAS).forEach(([w, id]) => { if (id && TS.has(w) && PLACES[id]) add(id, 1500, PLACES[id]); });
    if (st.ris) RS.SPACES.forEach(sp => { const S0 = st.ris.spaces[sp.id]; if (!S0 || !S0.found) return; const sn = norm(sp.name); if (has(sn)) add(sp.id, 2500 + sn.length, { id: sp.id, name: sp.name, x: S0.x, y: S0.y }); });
    if (!sc.size) return null;
    const me = n || st.player, dd = e => (e[1].ref && e[1].ref.x !== undefined ? dist(e[1].ref.x, e[1].ref.y, me.x, me.y) : 1e9);
    const L = [...sc.entries()].sort((a, b) => b[1].s - a[1].s || dd(a) - dd(b));
    const best = L[0][1], second = L[1] && L[1][1];
    const ref = b => Object.assign({ id: b.ref.id || L.find(x => x[1] === b)[0] }, b.ref);
    if (second && second.s === best.s && norm(second.ref.name) !== norm(best.ref.name) && best.s < 1000) return { dubbio: [ref(best), ref(second)] };
    return ref(best);
  }
  Parola.trovaLuogo = trovaLuogo;

  // ================= LE PERSONE =================
  // la persona prima del luogo; un nome comune (che è anche una parola) vale solo con la maiuscola o dopo un verbo da persona
  function trovaPersona(st, raw, n, forte) {
    const words = String(raw || '').replace(/[«»"]/g, ' ').split(/[^A-Za-zÀ-ÿ']+/).filter(Boolean).map(w => w.replace(/^.*'/, ''));
    let best = null, bs = 0;
    const cards = RS.CARDS;
    for (const k of st.npcs) {
      if (k === n || k.dead || k.passante || k.reinforcement) continue;
      const fn = norm(k.first), bt = RS.battle(k) ? norm(RS.battle(k)) : null, full = norm(k.name);
      let s = 0;
      for (const w of words) {
        const wn = norm(w); if (wn.length < 3) continue;
        const capd = /^[A-ZÀ-Ý]/.test(w);
        if (bt && wn === bt) s = Math.max(s, 5);
        else if (wn === fn) s = Math.max(s, cards[k.id] ? 4 : k.pop && k.pop.cast ? 3 : capd || forte ? 2 : 0);
        else if (k.id === wn && cards[k.id]) s = Math.max(s, 4);
      }
      if (s && norm(raw).includes(full)) s += 2;
      if (s > bs || (s === bs && s && best && dist(k.x, k.y, (n || st.player).x, (n || st.player).y) < dist(best.x, best.y, (n || st.player).x, (n || st.player).y))) { best = k; bs = s; }
    }
    return bs ? best : null;
  }
  Parola.trovaPersona = trovaPersona;

  // ================= L'INTENTO =================
  // { verbo, args, quando, modi, a_chi, fonte, dubbio, testo }
  const numIn = t => { const m = t.match(/\b(\d+)\b/); if (m) return +m[1]; const w = ['dieci', 'venti', 'trenta', 'quaranta', 'cinquanta', 'cento'].find(x => new RegExp(`\\b${x}\\b`).test(t)); return w ? { dieci: 10, venti: 20, trenta: 30, quaranta: 40, cinquanta: 50, cento: 100 }[w] : null; };
  const oreIn = t => { const m = t.match(/\b(\d+|un|una|due|tre|quattro|cinque|sei|mezz)\s*(?:or[ae]|h)\b/); if (!m) return null; if (m[1] === 'mezz') return .5; return /^\d+$/.test(m[1]) ? +m[1] : Math.max(1, NUMW.indexOf(m[1] === 'una' ? 'un' : m[1])); };
  function quandoIn(t) {
    if (/\bstanotte\b|\bdi notte\b/.test(t)) return 'stanotte';
    if (/\bstasera\b/.test(t)) return 'stasera';
    const m = t.match(/\balle (\d{1,2})(?:[:.](\d{2}))?/); if (m) return { ora: m[1] + ':' + (m[2] || '00'), giorno: /domani/.test(t) ? 'domani' : 'oggi' };
    if (/\b(adesso|subito|ora)\b/.test(t)) return 'adesso';
    return null;
  }
  const mk = (verbo, args, extra) => Object.assign({ verbo, args: args || {}, quando: null, modi: {}, a_chi: null, fonte: 'parole', dubbio: null }, extra || {});
  function luogoArg(st, I, text, n) {
    const L = trovaLuogo(st, text, n);
    if (!L) return null;
    if (L.dubbio) { I.dubbio = { cosa: 'luogo', scelte: L.dubbio.map(x => x.id), nomi: L.dubbio.map(x => x.name) }; return null; }
    I.args.luogo = L.base ? L.base.id : L.id; I.luogoNome = L.name;
    return L;
  }
  function capisciUno(st, n, raw) {
    const t = norm(raw), r = RS.initNpc(st, n), member = !!r.member, num = numIn(t), ore = oreIn(t);
    const inv = st.player.inv || {};
    let I = null;
    if (/\b(lascia stare|lascia perdere|annulla|non serve piu|non importa piu)\b/.test(t)) I = mk('annulla');
    else if (/\b(dove sei|cosa fai|che fai|come va|a che punto|come procede|novita su)\b/.test(t) && !/\bsi dice\b/.test(t)) I = mk('stato');
    else if ((/\b(prometto|te l[aoie] porto|te li porto|te le porto|te lo trovo|te la trovo|ci penso io a|prenditi il tempo|prendi pure il tempo|prenditela comoda)\b/.test(t) || /\b(va bene|d accordo|ok|allora|vabbe)\b,? ?(domani|dopo|piu tardi|stanotte|stasera)\b|^(domani|dopo|piu tardi|stanotte) (va bene|allora|ok)\b/.test(t)) && S(st).pend[n.id]) I = mk('prometto');
    else if (/\b(ti do|tieni|prendi questi|eccoti|ti pago)\b/.test(t) && !/\btieni d occhio\b/.test(t) && num && !/\d+\s*(or[ae]|minut|h)\b/.test(t) && !Object.keys(inv).some(k => inv[k] > 0 && cosa(t, ['ogg']) && cosa(t, ['ogg']).id === k)) I = mk('ricevi_soldi', { quanto: num });
    else if (/\b(ti do|tieni|ti porto|prendi|ti regalo|eccoti)\b/.test(t) && !/\btieni d occhio\b/.test(t)) {
      const c = cosa(t, ['ogg']); if (c) I = mk('ricevi', { oggetto: c.id, quanto: c.q, cosa: c });
    }
    if (I) return I;
    if (!member && /\b(unisciti|unirti|unisci|entra con noi|entrare con noi|vieni con noi nella|con noi|dei nostri|nella risacca|entra nella risacca)\b/.test(t)) return mk('unisciti');
    if (/\b(vengo anch|ci sto|contami|partecipo|ci sono anch|vengo pure io)\b/.test(t) || /^partecipa\b/.test(t)) return mk('partecipa');
    if (/\b(avvisami|fammi sapere se|se arrivano|se vedi|se passano|chiamami se)\b/.test(t)) {
      I = mk('avvisa', { se: 'grigi', ore: ore || 3 });
      if (!/\b(grigi|guardia|polizia|sbirri|divise|pattuglia)\b/.test(t)) { const p = trovaPersona(st, raw, n, true); if (p) I.args.se = 'arriva:' + p.id; }
      luogoArg(st, I, t.replace(/\b(grigi|guardia)\b/g, ''), n);
      return I;
    }
    if (/\b(tieni d occhio|tienimi d occhio|sorveglia|sorvegliami|controlla|pedina|stai dietro a|stagli dietro|segui)\b/.test(t) && !/\bseguimi\b/.test(t)) {
      const p = trovaPersona(st, String(raw).replace(/\b(tien\w*|d'occhio|d’occhio|occhio|sorveglia\w*|controlla|pedina|stai dietro a|stagli dietro|segui)\b/gi, ' '), n, true);
      if (p) return mk('pedina', { persona: p.id, ore: ore || 1 }, { personaNome: p.first });
      I = mk('sorveglia', { ore: ore || 3 }); luogoArg(st, I, t, n);
      return I;
    }
    if (/\b(seguimi|vieni con me|andiamo|accompagnami|vieni anche tu|stammi dietro)\b/.test(t)) return mk('seguimi', { ore: ore || (num && num <= 3 ? num : 1) });
    if (/\b(vediamoci|ci vediamo|appuntamento|ci troviamo|incontriamoci)\b/.test(t)) {
      const q = quandoIn(t); I = mk('appuntamento', { ora: q && q.ora ? q.ora : (/\b(\d{1,2})\b/.exec(t) || [])[1] || '', giorno: /domani/.test(t) ? 'domani' : 'oggi' });
      if (!luogoArg(st, I, t, n) && !I.dubbio) I.args.luogo = (n.pop && n.pop.at && n.pop.at.pid) || '';
      return I;
    }
    { const m = t.match(/\bporta (.+?) a ([a-z]+)\b/); const p = m && trovaPersona(st, m[2], n, true);
      if (/\b(portami|mi porti|vai a prendermi|prendimi|mi prendi|me lo porti|me la porti)\b/.test(t) || p) {
        const c = cosa(t, ['ogg', 'res', 'az']); return mk('porta_a', { cosa: c ? c.id : '', quanto: c ? c.q : 1, a: p ? p.id : 'player', _c: c });
      } }
    if (/\b(dammi|mi dai|me ne dai|mi presti|mi daresti|ce l hai)\b/.test(t)) { const c = cosa(t, ['ogg', 'az', 'res']); return mk('dammi', { cosa: c ? c.id : '', quanto: c ? c.q : 1, _c: c }); }
    if (/\b(quanto vuoi per|te lo compro|te la compro|me lo vendi|me la vendi)\b/.test(t)) { const c = cosa(t, ['ogg', 'az']); return mk('compra_da', { cosa: c ? c.id : '', quanto: c ? c.q : 1, _c: c }); }
    if (/\b(rub\w*|frega\w*|ruba)\b/.test(t) && /\b(vespa|macchina|auto|moto|motorino|bici|furgone|campagnola)\b/.test(t)) return mk('ruba_mezzo');
    if (/\b(aspett\w*|resta qui|fermati|non ti muovere)\b/.test(t)) { I = mk('aspetta', { minuti: (t.match(/(\d+)\s*minut/) || [])[1] ? +(t.match(/(\d+)\s*minut/)[1]) : 30 }); if (!/\b(qui|qua)\b/.test(t)) luogoArg(st, I, t, n); return I; }
    if (/\b(basta cosi|basta|torna a casa|vai a casa|riposati|smetti|smettila)\b/.test(t)) return mk('basta');
    if (/\b(cosa sai|novita|si dice|voci|racconta|raccontami)\b/.test(t)) return mk('racconta');
    // il resto: i verbi della Risacca, dalle parole chiave di sempre, con un intento principale per frase
    let acts = verbiRisacca(st, n, t, num, ore);
    if (acts.some(a => a.verbo === 'allestisci')) acts = acts.filter(a => a.verbo !== 'produci');
    if (acts.some(a => a.verbo === 'dipingi')) acts = acts.filter(a => a.verbo !== 'scrivi_onda');
    if (acts.length) {
      const a0 = acts[0]; const args = Object.assign({}, a0); delete args.verbo;
      I = mk(a0.verbo, args);
      if ('luogo' in a0) { delete I.args.luogo; luogoArg(st, I, t, n); }
      if (a0.verbo === 'compra') { const c = cosa(t, ['res']); if (c) { I.args.risorsa = c.id; I.args.quanto = c.q; } }
      return I;
    }
    if (/\b(vai|va|raggiungi|corri a|passa da|fai un salto)\b/.test(t)) { I = mk('vai', {}); luogoArg(st, I, t, n); return I; }
    return null;
  }
  // le parole chiave dei verbi della Risacca (le stesse di risacca.js fallback, senza le frasi e senza il filtro della volontà)
  function verbiRisacca(st, n, t, num, ore) {
    const acts = [], c = RS.card(n), r = n.ris || {}, h = ore || num;
    const who = () => { const k = st.npcs.find(k => k !== n && !k.dead && !k.passante && (new RegExp(`\\b${norm(k.first)}\\b`).test(t) || (RS.battle(k) && new RegExp(`\\b${norm(RS.battle(k))}\\b`).test(t)))); return k ? k.id : ''; };
    if (/missione|aiutar|ti serve|favore|cosa posso fare|ti manca|hai bisogno/.test(t)) acts.push({ verbo: (c.mission || r.member) && !/ti manca|hai bisogno/.test(t) ? 'missione' : 'chiedi_aiuto' });
    if (/\b(nascondigl\w*|posto sicuro|spazio vuoto|un posto|soffitta|magazzino vuoto)\b/.test(t)) acts.push({ verbo: 'rivela_spazio' });
    if (/\blavor|turno/.test(t) && !/cantier|costru/.test(t)) acts.push({ verbo: 'lavora', ore: h || 4 });
    if (/collett|offert/.test(t)) acts.push({ verbo: 'colletta', luogo: '', ore: h || 3 });
    if (/contrabband/.test(t)) acts.push({ verbo: 'contrabbando', ore: h || 3 });
    if (/mercato nero|\bvendi\b(?!.*document)/.test(t)) acts.push({ verbo: 'mercato', ore: h || 3 });
    if (/recuper|materiali/.test(t) && !/compra/.test(t)) acts.push({ verbo: 'recupera', luogo: '' });
    if (/dipingi|murale|bomboletta|pennell|vernice/.test(t)) acts.push({ verbo: 'dipingi', luogo: '' });
    if (/\bonda\b|gesso|\bscriv/.test(t)) acts.push({ verbo: 'scrivi_onda', luogo: '' });
    if (/volantin/.test(t) && !/stamp|produc/.test(t)) acts.push({ verbo: 'volantina', luogo: '' });
    if (/sabot/.test(t)) acts.push({ verbo: 'sabota', obiettivo: Object.keys(RS.TARGETS).find(k => t.includes(k)) || t });
    if (/trasmett|in onda|radio scirocco|ore di radio|fai radio|alla radio/.test(t)) acts.push({ verbo: 'trasmetti', ore: h || 2 });
    if (/costru|cantier/.test(t)) acts.push({ verbo: 'costruisci', lotto: (RS.LOTS.find(l => t.includes(norm(l.name).split(' ').pop()) || t.includes(l.id.slice(4))) || {}).id || '', struttura: Object.keys(RS.STRUCTS).find(k => t.includes(k)) || '' });
    if (/\boccupa/.test(t)) acts.push({ verbo: 'occupa' });
    if (/allest|\bmonta/.test(t)) acts.push({ verbo: 'allestisci', modulo: Object.keys(RS.MODULES).find(k => t.includes(k)) || '' });
    if (/stamp|produc|laborator/.test(t)) acts.push({ verbo: 'produci', ore: h || 4 });
    if (/protegg|fai la guardia|di guardia alla base/.test(t)) acts.push({ verbo: 'proteggi' });
    if (/nascondit/.test(t)) acts.push({ verbo: 'nasconditi' });
    if (/\bcompra/.test(t)) acts.push({ verbo: 'compra', risorsa: '', quanto: num || 1 });
    if (/deposita|porta in base/.test(t)) acts.push({ verbo: 'deposita' });
    if (/\blibera|fai uscire|tira fuori/.test(t)) acts.push({ verbo: 'libera' });
    if (/recluta|convinci/.test(t)) { const w = who(); if (w) acts.push({ verbo: 'recluta', persona: w }); }
    if (/\b(telefona|chiama|manda un messaggio|convoca)\b/.test(t)) { const w = who(); if (w) acts.push({ verbo: 'convoca', persona: w, luogo: 'qui' }); }
    if (/\bscava|buca/.test(t)) acts.push({ verbo: 'scava', luogo: '' });
    if (/inchiod|\bassi\b|barric/.test(t)) acts.push({ verbo: 'inchioda' });
    if (/picchia|calci|pugni|lezione|\bmena\b/.test(t)) { const w = who(); if (w) acts.push({ verbo: 'picchia', persona: w }); }
    if (/arreda|mobili/.test(t)) acts.push({ verbo: 'arreda' });
    if (/ripara|aggiusta/.test(t)) acts.push({ verbo: 'ripara', ore: h || 4 });
    if (/\bpesca/.test(t)) acts.push({ verbo: 'pesca', ore: h || 3 });
    if (/rovist|frug/.test(t)) acts.push({ verbo: 'rovista', luogo: '' });
    if (/bisca|azzardo/.test(t)) acts.push({ verbo: 'bisca', ore: h || 3 });
    if (/vendi.*(document|lasciapass)/.test(t)) acts.push({ verbo: 'vendi_documenti', ore: h || 3 });
    if (/\bmangia|\bfame\b|pranzo|\bcena\b/.test(t)) acts.push({ verbo: 'mangia' });
    if (/\bbev|\bsete\b|caffe|birra/.test(t)) acts.push({ verbo: 'bevi' });
    if (/\bdorm|vai a letto/.test(t)) acts.push({ verbo: 'dormi', ore: h || 6 });
    if (/scassin|lucchett|forza la porta/.test(t)) acts.push({ verbo: 'scassina' });
    if (/scasso|svaligi|entra nel negozio/.test(t)) acts.push({ verbo: 'scasso', luogo: '' });
    if (/\bsass|telecamer|\blancia/.test(t)) acts.push({ verbo: 'lancia', luogo: '' });
    if (/fotograf|foto a|scatta/.test(t)) acts.push({ verbo: 'fotografa', persona: who() });
    if (/ricatt/.test(t)) { const w = who(); if (w) acts.push({ verbo: 'ricatta', persona: w }); }
    if (/\bruba|\brubare|\brubami/.test(t)) acts.push({ verbo: 'ruba', risorsa: (cosa(t, ['res']) || {}).id || '', luogo: '' });
    if (/decidi tu|fai tu|organizzat|di testa tua/.test(t)) acts.push({ verbo: 'autonomia', attiva: 'si' });
    const ln = Object.keys(RS.LINES).find(k => t.includes(k) && /linea|pensa|concentr|priorit|puntate/.test(t)); if (ln) acts.push({ verbo: 'linea', linea: ln });
    return acts;
  }
  // tutte le frasi passano da qui: un intento principale, gli altri solo se uniti da «e» o «poi»
  function capisci(st, n, raw) {
    const t = norm(raw);
    const parts = String(raw).split(/\s*(?:,\s*)?\b(?:e poi|poi|e dopo)\b\s*|\s+e\s+(?=[a-zàèéìòù]+(?:mi|ti|ci)?\b)/i).filter(x => x && x.trim().length > 2);
    let I = null, altri = [];
    if (parts.length > 1) {
      const L = parts.map(p => capisciUno(st, n, p)).filter(Boolean);
      if (L.length > 1 && new Set(L.map(x => x.verbo)).size === L.length) { I = L[0]; altri = L.slice(1, 4); }
    }
    if (!I) I = capisciUno(st, n, raw);
    [I].concat(altri).forEach(x => {
      if (!x) return;
      x.testo = raw;
      if (/\b(di nascosto|furtiv\w*|striscia\w*|senza farti vedere|piano piano)\b/.test(t)) { x.modi.furtivo = true; x.args.furtivo = true; }
      if (/\b(di corsa|corri|in fretta|veloce)\b/.test(t)) { x.modi.corri = true; x.args.corri = true; }
      const q = quandoIn(t); if (q && x.verbo !== 'appuntamento') x.quando = q;
    });
    return { intento: I, altri };
  }
  Parola.capisci = capisci;

  // ================= I VERBI: chi li fa, con che motore, come si controllano =================
  // chi: M membri, A tutti (con n.pop), T tutti. motore: task | piano | with | appt | impresa | veglia | subito
  RS.VERBS.pedina = RS.VERBS.pedina || { label: 'pedina', risk: .2, task: true, args: 'persona, ore', desc: 'sta dietro a una persona a qualche metro e riferisce dove va e chi vede' };
  RS.VERBS.porta_a = RS.VERBS.porta_a || { label: 'porta a', risk: 0, args: 'cosa, quanto, a', desc: 'va a prendere una cosa (in tasca, a casa o in bottega) e la porta a qualcuno' };
  RS.VERBS.dammi = RS.VERBS.dammi || { label: 'dammi', risk: 0, args: 'cosa, quanto', desc: 'ti dà una cosa che ha in tasca' };
  RS.VERBS.compra_da = RS.VERBS.compra_da || { label: 'vendimi', risk: 0, args: 'cosa', desc: 'ti vende una cosa che ha' };
  RS.VERBS.avvisa = RS.VERBS.avvisa || { label: 'avvisa', risk: .1, args: 'se, luogo, ore', desc: 'resta di guardia e ti avvisa se arrivano i Grigi' };
  RS.VERBS.stato = RS.VERBS.stato || { label: 'stato', risk: 0, args: '', desc: 'dice dove si trova e cosa sta facendo' };
  RS.VERBS.annulla = RS.VERBS.annulla || { label: 'annulla', risk: 0, args: '', desc: 'lascia stare quello che aveva promesso' };
  const DEF = {
    seguimi: { chi: 'T', motore: 'seguimi' }, vai: { chi: 'T', motore: 'vai', need: ['luogo'] }, aspetta: { chi: 'T', motore: 'aspetta' },
    pedina: { chi: 'M', motore: 'task', need: ['persona'] }, sorveglia: { chi: 'M', motore: 'task', need: ['luogo'] },
    porta_a: { chi: 'A', motore: 'piano', need: ['cosa'] }, dammi: { chi: 'A', motore: 'subito', need: ['cosa'] }, compra_da: { chi: 'A', motore: 'subito', need: ['cosa'] },
    avvisa: { chi: 'T', motore: 'veglia' }, appuntamento: { chi: 'A', motore: 'appt' }, partecipa: { chi: 'A', motore: 'impresa', libero: true },
    ricevi: { chi: 'A', motore: 'subito', libero: true }, ricevi_soldi: { chi: 'T', motore: 'subito', libero: true }, chiedi_aiuto: { chi: 'A', motore: 'subito', libero: true },
    missione: { chi: 'T', motore: 'subito', libero: true }, rivela_spazio: { chi: 'T', motore: 'subito', libero: true }, racconta: { chi: 'T', motore: 'niente', libero: true },
    stato: { chi: 'T', motore: 'niente', libero: true }, annulla: { chi: 'T', motore: 'subito', libero: true }, prometto: { chi: 'T', motore: 'subito', libero: true },
    unisciti: { chi: 'T', motore: 'subito', libero: true }, basta: { chi: 'M', motore: 'subito', libero: true }, linea: { chi: 'M', motore: 'subito', libero: true }, autonomia: { chi: 'M', motore: 'subito', libero: true },
  };
  const defOf = v => DEF[v] || (RS.VERBS[v] ? (RS.VERBS[v].task ? { chi: 'M', motore: 'task' } : { chi: 'T', motore: 'subito' }) : null);
  // la pedina: un passo fermo che parola.js muove ogni passo dietro alla persona (a 8-12 metri)
  RS.EXT.plan.push((st, n, verb, a, h) => {
    if (verb !== 'pedina') return null;
    const tn = RS.resolvePerson(st, a.persona); if (!tn || tn === n || tn.dead) return { err: 'Pedinare chi?' };
    if (tn.jailedUntil > st.t) return { err: `${tn.first} è in cella.` };
    if ((tn.cop || (RS.CARDS[tn.id] && RS.CARDS[tn.id].antag)) && !G.isNight(st) && !a.furtivo) return { err: `Stare dietro a ${tn.first} di giorno, senza nascondersi? Mi vede subito.` };
    const hh = h.hours(a.ore || 1), mins = Math.round(hh * 60);
    return { steps: [{ k: 'hold', mins, shadow: tn.id }], desc: `sta dietro a ${tn.first} per ${hh < 1 ? 'mezz\'ora' : hh === 1 ? 'un\'ora' : hh + ' ore'}` };
  });

  // ================= LO STATO DURO =================
  const ACTIVE = ['accettata', 'in_corso', 'attesa'];
  const impegnato = (st, n) => S(st).promesse.find(p => p.chi === n.id && (p.stato === 'in_corso' || p.stato === 'accettata') && p.link && p.link.tipo !== 'appt');
  Parola.impegnato = impegnato;
  const trustOf = (st, n) => { G.opinions(st, n); return clamp(n.op.trust + (n.ris ? n.ris.bond : 0), -1, 1); };
  const lavoraOra = (st, n) => !!(n.pop && n.pop.cur && n.pop.cur.act === 'lavoro');
  function grigiVicino(st, x, y, r) { return st.npcs.filter(k => k.cop && !k.dead && !k.inside && dist(k.x, k.y, x, y) < r).length; }
  const keptBetween = (st, n) => S(st).promesse.some(p => p.stato === 'fatta' && ((p.chi === n.id && p.a === 'player') || (p.chi === 'player' && p.a === n.id)));
  const prezzoDi = id => { const c = Og() && Og().CAT[id]; return Math.max(1, Math.ceil((c && c.prezzo) || 1)); };
  function bottega(st, n, id, q) {
    const E = Eco(); if (!E || !E.eco) return null;
    const L = Object.values(E.eco(st).shops).filter(Sh => Sh.sells[id] && (Sh.stock[id] || 0) >= q && !Sh.black && !Sh.market && Sh.t);
    L.sort((a, b) => dist(a.t.x, a.t.y, n.x, n.y) - dist(b.t.x, b.t.y, n.x, n.y));
    const Sh = L[0]; if (!Sh) return null;
    return { Sh, t: Sh.t, prezzo: Math.max(1, Math.ceil(E.price(st, Sh, id) * q)) };
  }
  const hasItem = (n, id) => (n.pop ? ((n.pop.inv || {})[id] || 0) + ((n.pop.casa || {})[id] || 0) : 0);
  // il motivo da quello che dice la volontà
  function motivoDa(w, n) {
    const W = w.why.join(' | ');
    if (/non lo farebbe mai/.test(W)) return 'never';
    if (/non è della Risacca/.test(W)) return 'non_membro';
    if (/ce l'ha con te/.test(W)) return 'rancore';
    if (/ha paura di te/.test(W)) return 'paura';
    if (/Repressione/.test(W)) return 'pericolo';
    if (/stanco/.test(W)) return 'stanco';
    if (/fame|sete/.test(W)) return 'fame';
    if (/infrangere la legge/.test(W)) return 'legge';
    if (/missione/.test(W)) return 'prova';
    if (/conosce poco/.test(W)) return 'fiducia';
    return n.tr && n.tr.cor < .4 ? 'paura' : 'fiducia';
  }
  // l'errore del piano: una cosa che il giocatore può portare → chiede; il resto → rifiuta col motivo vero
  function daErrore(st, n, err) {
    const e = String(err || '');
    let m = e.match(/Servono? (?:almeno )?(\d+) (?:di )?([a-zà-ù' ]+?)(?:\s*\(|\.|,|$)/i);
    if (m && !/lire/.test(e)) { const res = RS.resolveRes(m[2]); if (res) return { esito: 'chiede', motivo: { tipo: 'oggetto', testo: e, dati: { id: res, quanto: +m[1] } }, contro: { tipo: 'oggetto', id: res, quanto: +m[1] } }; }
    if (/Non c'è più gesso/.test(e)) return { esito: 'chiede', motivo: { tipo: 'oggetto', testo: e, dati: { id: 'gesso', quanto: 1 } }, contro: { tipo: 'oggetto', id: 'gesso', quanto: 1 } };
    if (/Serve(?:no)? (?:un )?attrezz|Servono attrezzi/.test(e)) return { esito: 'chiede', motivo: { tipo: 'oggetto', testo: e, dati: { id: 'attrezzi', quanto: 1 } }, contro: { tipo: 'oggetto', id: 'attrezzi', quanto: 1 } };
    m = e.match(/Servono (\d+)\.000 lire e la cassa ne ha (\d+)/);
    if (m) return { esito: 'chiede', motivo: { tipo: 'soldi', testo: e, dati: { quanto: +m[1] - +m[2] } }, contro: { tipo: 'soldi', quanto: +m[1] - +m[2], cassa: true } };
    if (/sconosciut|non è un'azione/.test(e)) return { esito: 'rifiuta', motivo: { tipo: 'non_so', testo: e } };
    return { esito: 'rifiuta', motivo: { tipo: 'impossibile', testo: e } };
  }

  // ================= LA VERIFICA (a secco: non cambia niente nel mondo) =================
  function verifica(st, n, I, opt) {
    opt = opt || {};
    const r = RS.initNpc(st, n), c = RS.card(n), member = !!r.member, P = n.pop;
    const R = (esito, tipo, testo, extra) => Object.assign({ esito, motivo: tipo ? { tipo, testo: testo || '', dati: (extra && extra.dati) || {} } : null, contro: null, piano: null }, extra || {});
    if (!I || !I.verbo) return R('niente', null);
    const v = I.verbo, a = I.args || {}, D = defOf(v);
    if (n.dead) return R('niente', 'morto');
    // 0. il verbo esiste ed è suo
    if (!D) return R('rifiuta', 'non_so', `«${v}» non è una cosa che sa fare.`, { dati: { verbo: v } });
    if ((c.antag || n.cop) && !['racconta', 'stato'].includes(v)) return R('rifiuta', 'nemico', 'non prende ordini da te');
    if (c.never && c.never.includes(v)) return R('rifiuta', 'never', `${n.first} non lo farebbe mai.`);
    if (D.chi === 'M' && !member) return R('rifiuta', 'non_membro', `${n.first} non è della Risacca: non prende ordini.`);
    if (D.chi === 'A' && !P) return R('rifiuta', 'non_so', 'non può');
    // 1. i parametri
    if (I.inventato && I.inventato.length) { const k = I.inventato[0]; return R('chiede', k, k === 'luogo' ? 'Dove? Quel posto non lo conosco.' : k === 'persona' ? 'Chi? Non so chi è.' : 'Cosa, di preciso?'); }
    if (I.dubbio) return R('chiede', 'ambiguo', `${I.dubbio.nomi[0]} o ${I.dubbio.nomi[1]}?`, { dati: { scelte: I.dubbio.scelte, nomi: I.dubbio.nomi } });
    for (const k of D.need || []) if (!a[k]) return R('chiede', k === 'luogo' ? 'luogo' : k === 'persona' ? 'persona' : 'cosa', k === 'luogo' ? 'Dove?' : k === 'persona' ? 'Chi?' : 'Cosa?');
    if (D.motore === 'niente') return R('niente', v);
    // 2. lo stato duro
    if (n.jailedUntil > st.t) return R('rifiuta', 'cella', `${n.first} è in cella.`);
    const imp = !D.libero && impegnato(st, n);
    if (imp) return R('contratta', 'occupato', `Sta già facendo una cosa: ${imp.desc}.`, { contro: { tipo: 'dopo', dopo: imp.scadenza }, dati: { impegno: imp.desc } });
    const M = S(st);
    if (member && r.fatigue > .8 && RS.VERBS[v] && RS.VERBS[v].work) { const at = (dayIdx(st.t) + (st.t % 1440 >= 8 * 60 ? 1 : 0)) * 1440 + 8 * 60; return R('contratta', 'stanco', `${n.first} è stanc${o(n)} mort${o(n)}.`, { contro: { tipo: 'dopo', dopo: at }, dati: { ora: '8:00' } }); }
    if (M.diffida[n.id] > st.t && !D.libero) return R('contratta', 'prova', 'Due promesse rotte di fila: prima vuole vedere i fatti.', { contro: { tipo: 'prova' } });
    // 3. il piano si fa?
    let piano = null, contro = null, extra = {};
    const pagato = opt.pagato || 0;
    if (D.motore === 'task' || (member && ['vai', 'aspetta', 'seguimi'].includes(v)) || (member && D.motore === 'veglia')) {
      const pv = D.motore === 'veglia' ? 'aspetta' : v, pa = D.motore === 'veglia' ? { luogo: a.luogo } : a;
      if (D.motore === 'veglia' && !a.luogo) { /* resta dov'è */ } else {
        const p = RS.plan(st, n, pv, pa); if (p.err) return Object.assign(R(null), daErrore(st, n, p.err));
        piano = p;
      }
    } else if (v === 'ricevi_soldi') {
      const q = Math.round(a.quanto || 0); if (!q) return R('chiede', 'cosa', 'Quanti soldi?');
      if (st.player.money < q) return R('rifiuta', 'manca_player', `Non hai ${q}.000 lire: ne hai ${Math.floor(st.player.money)}.`, { dati: { quanti: q, hai: Math.floor(st.player.money) } });
    } else if (v === 'ricevi') {
      if (!((st.player.inv || {})[a.oggetto] > 0)) return R('rifiuta', 'manca_player', 'Non ce l\'hai nello zaino.', { dati: { cosa: a.cosa ? a.cosa.frase : a.oggetto } });
    } else if (v === 'dammi' || v === 'compra_da') {
      const h = hasItem(n, a.cosa), inv = P && P.inv ? P.inv[a.cosa] || 0 : 0;
      if (!h) return R('rifiuta', 'manca', `${n.first} non ha ${a._c ? a._c.frase : a.cosa}.`, { dati: { cosa: a.cosa, frase: a._c ? a._c.frase : a.cosa } });
      if (!inv) return R('contratta', 'quando', `Ce l'ha a casa, non in tasca.`, { contro: { tipo: 'quando', quando: 'a casa' } });
      const price = prezzoDi(a.cosa) * (a.quanto || 1);
      const free = v === 'dammi' && ((P.debiti && P.debiti.player) || trustOf(st, n) > .5 || member);
      if (!free && pagato < price) contro = { tipo: 'soldi', quanto: v === 'compra_da' ? Math.ceil(price * (1 + n.tr.avid * .5)) : price };
      extra.prezzo = price;
    } else if (v === 'porta_a') {
      const q = a.quanto || 1, h = hasItem(n, a.cosa);
      const shop = h >= q ? null : bottega(st, n, a.cosa, q);
      if (h < q && !shop) return R('rifiuta', 'manca', `${n.first} non ha ${a._c ? a._c.frase : a.cosa} e non sa dove trovarlo.`, { dati: { cosa: a.cosa, frase: a._c ? a._c.frase : a.cosa } });
      if (!G.byId(st, a.a) && a.a !== 'player') return R('chiede', 'persona', 'A chi?');
      const price = shop ? shop.prezzo : prezzoDi(a.cosa) * q;
      const free = (P.debiti && P.debiti.player) || trustOf(st, n) > .5 || member;
      if (shop && P.money + pagato < price) contro = { tipo: 'soldi', quanto: price - Math.floor(P.money) };
      else if (!free && pagato < price) contro = { tipo: 'soldi', quanto: price };
      extra.shop = shop; extra.prezzo = price;
    } else if (v === 'appuntamento') {
      const C = Cv(); const t = C && C.parseTime ? C.parseTime(st, a.ora, a.giorno) : null;
      if (!t) return R('chiede', 'ora', 'A che ora?');
      if (P.appt && Math.abs(P.appt.t - t) < 150 && P.appt.t > st.t) return R('contratta', 'occupato', `Ha già un impegno alle ${hhmm(P.appt.t)}.`, { contro: { tipo: 'quando' }, dati: { impegno: `l'appuntamento delle ${hhmm(P.appt.t)}` } });
      const I0 = Po() && Po()._, m = t % 1440, wd = (dayIdx(t) + 1) % 7, J = P.job;
      const works = J && !J.night && wd !== 6 && m >= J.start * 60 && m < J.end * 60;
      const tgt = a.luogo && PLACES[a.luogo] && I0 && I0.target ? I0.target(a.luogo) : null;
      if (works && !(J.t && tgt && I0.tkey(J.t) === I0.tkey(tgt))) return R('contratta', 'lavoro', `A quell'ora lavora (${J.title}).`, { contro: { tipo: 'quando', quando: `${J.end}:00` }, dati: { ora: `${J.end}:00` } });
      extra.at = t;
    } else if (v === 'seguimi' && !member) {
      if (P && P.appt && P.appt.t > st.t && P.appt.t < st.t + 120 && P.appt.with !== 'player') return R('contratta', 'occupato', `Alle ${hhmm(P.appt.t)} ha un appuntamento.`, { contro: { tipo: 'dopo', dopo: P.appt.t + 60 }, dati: { impegno: `l'appuntamento delle ${hhmm(P.appt.t)}` } });
      if (P && P.with) return R('niente', 'gia');
    } else if (v === 'vai' && !member) {
      const tp = PLACES[a.luogo]; if (!tp) return R('chiede', 'luogo', 'Dove?');
    } else if (v === 'partecipa') {
      const E = impresaDi(st, n); if (!E) return R('rifiuta', 'impossibile', `${n.first} non sta organizzando niente.`);
      if (E.members.includes('player')) return R('niente', 'gia', `Ci sei già: ${E.label}.`);
      extra.impresa = E;
    } else if (v === 'unisciti') {
      if (member) return R('niente', 'gia', 'È già dei nostri.');
      const giorni = new Set(M.giorni[n.id] || []).size, tr = trustOf(st, n), kept = keptBetween(st, n) || r.missionDone;
      const manca = [];
      if (tr < .3) manca.push('fiducia'); if (!kept) manca.push('promessa'); if (giorni < 2) manca.push('giorni');
      if (manca.length) { const pr = provaPer(st, n); return R('contratta', 'prova', `Per entrare manca: ${manca.join(', ')}.`, { contro: { tipo: 'prova', prova: pr }, dati: { manca, prova: pr } }); }
      if (RS.EXT.canJoin) { const e = RS.EXT.canJoin(st, n); if (e) return R('rifiuta', 'impossibile', e); }
    } else if (v === 'annulla') {
      if (!S(st).promesse.some(p => p.chi === n.id && ACTIVE.includes(p.stato)) && !(r.task)) return R('niente', 'annulla_niente');
    } else if (v === 'prometto') {
      if (!M.pend[n.id] || !M.pend[n.id].contro) return R('niente', null);
    } else if (v === 'missione') {
      if (!c.mission || r.missionDone) I.verbo = 'chiedi_aiuto';
    } else if (v === 'avvisa' && !member) {
      if (trustOf(st, n) < .4 && !(P && P.debiti && P.debiti.player)) return R('rifiuta', 'fiducia', 'Non si fida abbastanza per farti da palo.');
    }
    // 4. l'ora
    const V = RS.VERBS[I.verbo] || {};
    if (V.night && !G.isNight(st)) return R('contratta', 'notte', 'Si fa solo di notte.', { contro: { tipo: 'quando', quando: 'stanotte' }, piano });
    if (!member && ['porta_a', 'aspetta', 'vai', 'seguimi'].includes(v) && lavoraOra(st, n)) {
      const end = P.job && P.job.end ? P.job.end : null;
      return R('contratta', 'lavoro', 'Adesso lavora.', { contro: { tipo: 'quando', quando: end ? `${end}:00` : 'dopo' }, dati: { ora: end ? `${end}:00` : 'stasera' } });
    }
    // 5. il pericolo sul posto
    const pos = piano && piano.steps ? (piano.steps.find(s => s.k === 'go') || null) : a.luogo && PLACES[a.luogo] ? PLACES[a.luogo] : null;
    const grigi = pos && V.risk ? grigiVicino(st, pos.x, pos.y, 20) : 0;
    // 6. la volontà
    const willV = (v === 'seguimi' || v === 'aspetta' || v === 'vai') && !member ? 'accompagna' : D.motore === 'veglia' && member ? 'sorveglia' : I.verbo;
    const w = (['ricevi', 'chiedi_aiuto', 'racconta', 'stato', 'annulla', 'prometto', 'basta'].includes(v)) ? { s: 1, verdict: 'accetta', why: [] } : RS.will(st, n, willV, a);
    let s = w.s - grigi * .12 - (opt.malus || 0);
    if (pagato) s += .3;
    if (v === 'aspetta' && !member) s += .1;   // aspettare dieci minuti lo fa chiunque
    if (v === 'vai' && !member && !(P && P.debiti && P.debiti.player) && trustOf(st, n) <= .4) { s -= .25; w.why.push('non prende ordini da chi conosce poco'); }
    const verdict = s >= .2 ? 'accetta' : s >= 0 ? 'contratta' : 'rifiuta';
    const dati = { grigi, s: Math.round(s * 100) / 100, why: w.why };
    if (verdict === 'rifiuta') {
      const tipo = grigi && w.s >= 0 ? 'pericolo' : motivoDa(w, n);
      return R('rifiuta', tipo, w.why.join(', ') || 'non se la sente', { dati, piano });
    }
    if (verdict === 'contratta' || contro) {
      if (contro) return R('contratta', 'soldi', `Vuole ${contro.quanto}.000 lire.`, Object.assign({ contro, dati, piano }, extra));
      const tipo = grigi ? 'pericolo' : motivoDa(w, n);
      let ct = null;
      if (tipo === 'stanco' || tipo === 'fame') ct = { tipo: 'dopo', dopo: st.t + (tipo === 'fame' ? 60 : 8 * 60) };
      else if (n.tr.avid > .55) ct = { tipo: 'soldi', quanto: Math.round(8 + 25 * (V.risk || 0) + 10 * n.tr.avid) };
      else if (tipo === 'pericolo' || tipo === 'paura') ct = V.risk ? { tipo: 'furtivo' } : { tipo: 'quando', quando: 'stanotte' };
      else if (tipo === 'prova' || tipo === 'fiducia') ct = { tipo: 'prova', prova: provaPer(st, n) };
      const tt = ct && ct.tipo === 'soldi' ? 'soldi' : ct && ct.tipo === 'furtivo' ? 'furtivo' : tipo;
      return R('contratta', tt, w.why.join(', ') || 'vuole qualcosa in cambio', Object.assign({ contro: ct, dati, piano }, extra, { dati: Object.assign(dati, { prova: ct && ct.prova, soldi: ct && ct.quanto }) }));
    }
    return R('accetta', null, '', Object.assign({ dati, piano }, extra));
  }
  Parola.verifica = verifica;
  // la prova per chi non si fida: una cosa piccola e vera che gli manca, o la sua missione
  function provaPer(st, n) {
    const c = RS.card(n);
    if (c.mission && !n.ris.missionDone) return { tipo: 'missione', label: c.mission.title.toLowerCase(), frase: 'il favore che ti ho chiesto' };
    const W = Sc() && n.pop ? Sc().wants(st, n) : [];
    const w = W[0]; if (w) return { tipo: 'oggetto', ids: w.ids, label: w.label, frase: /^(un|una|uno|qualcosa|del|della|dei|delle|il|la|lo|le|i|gli)\b/.test(w.label) ? w.label : art(w.label, 'det') };
    return { tipo: 'tempo', label: 'tempo', frase: 'un po\' di tempo' };
  }
  function impresaDi(st, n) { const I0 = Im(); if (!I0) return null; return I0.list(st).find(E => (E.status === 'cerca' || E.status === 'pronta') && E.members.includes(n.id)); }

  // ================= LE BATTUTE (dall'esito, mai prima) =================
  // frasi corte, chi parla si scopre; strutture diverse (commedia/TONO.md). Nessuna riga fuori da «accetta» promette.
  const BANCHE = {
    accetta: {
      _: ['Vado. Se mi fermano, passavo di lì per caso.', 'Agli ordini. Il caffè dopo però lo paghi tu.', 'Ci penso io. Tu fai la faccia di uno che non sa niente.', 'Va bene. Tanto oggi non avevo niente da fare. Come ieri.', 'Vado io, che se vai tu ti vedono dal continente.', 'Vado. Se non torno, il motorino è tuo. È rotto, ma è tuo.'],
      seguimi: ['Ti seguo. Se corri, ti seguo meno.', 'Dietro di te. Non troppo vicino, ho una reputazione.', 'Andiamo. Se ci fermiamo al bar, paghi tu.'],
      accompagna: ['Vengo, ma un\'ora. Poi ho il sugo sul fuoco.', 'Va bene, vengo. Se vediamo mia suocera, non mi conosci.', 'Vengo. Tanto a casa c\'è mio cognato, e parla.'],
      vai: ['Vado {a_luogo}. Se c\'è da aspettare, aspetto seduto.', '{A_luogo}? Vado. Almeno da lì si vede il mare.', 'Vado. Se mi chiedono perché, dico che cerco il gatto.'],
      aspetta: ['Ti aspetto. Mezz\'ora, poi conto le macchine e vado.', 'Aspetto qui. Se non torni, il posto è mio.'],
      appuntamento: ['Alle {ora} {a_luogo}. Se non vieni, mangio la tua parte.', 'Va bene: {luogo}, alle {ora}. Io puntuale, tu fai come vuoi.'],
      porta_a: ['Vado a prenderti {cosa}. Se è di ieri, non è colpa mia.', 'Te lo porto. Se c\'è la fila, ti porto pure la fila.', 'Vado e torno. Se mi perdo, cercami al bar.'],
      dammi: ['Tieni. Non dirlo a mia moglie, che conta tutto.', 'Ecco. Ma la prossima volta te la compri, eh.'],
      compra_da: ['Affare fatto. Ma se te lo chiedono, l\'hai trovato.'],
      pedina: ['Gli sto dietro. Quello cammina come mia zia, non mi scappa.', 'Lo seguo. Se si gira, mi allaccio una scarpa.', 'Lo tengo d\'occhio. Ho un giornale, faccio finta di leggere.'],
      sorveglia: ['Mi piazzo {a_luogo}. Porto il panino, sarà lunga.', 'Guardo io. Se succede qualcosa, lo sai prima tu dei Grigi.'],
      avvisa: ['Se arrivano, ti chiamo. Prima scappo, poi ti chiamo.', 'Sto lì e guardo. Se vedo una divisa, lo sai subito.'],
      pol: ['Vado. Una cosa grossa, che si veda dal molo.', 'Ci vado io. Le mani sporche ce le ho già.', 'Vado. Se mi vedono, dico che è arte moderna.'],
      pol_furtivo: ['Di nascosto io? Mia madre ancora non sa che fumo. Vado.', 'Di nascosto. Sono il re del nascosto, chiedi a mia moglie.'],
      lavoro: ['Vado a lavorare. Se mi pagano, pago io il giro.', 'Agli ordini. Tanto il padrone dorme fino alle dieci.'],
      unisciti: ['Va bene. Da oggi sono della Risacca. Mia madre non lo sappia.', 'Ci sto. Ma se mi prendono, la colpa è tua.'],
      partecipa: ['Vieni? Allora porta le braccia, le chiacchiere le porto io.', 'Bene, uno in più. Così fatico di meno io.'],
      ricevi_soldi: ['Soldi. Finalmente uno che capisce la politica.', 'Grazie. Li metto da parte. Per la causa. La mia.'],
      ricevi: ['Grazie, sei gentile.', 'Per me? Grazie. Adesso mi sento in debito, e non mi piace.'],
      ricevi_favore: ['Proprio quello che mi serviva. Non me lo scordo.'],
      prometto: ['Promesso, eh. Io me lo segno.', 'Va bene. Ma se non arriva, mi ricordo la tua faccia.'],
      annulla: ['Va bene, lascio stare. Me l\'hai fatta fare per niente.', 'Lascio perdere. Mi devi un caffè per il disturbo.'],
      basta: ['Smetto. Finalmente, avevo i piedi in fiamme.', 'Torno alle mie cose. Le mie cose sono il divano.'],
    },
    rifiuta: {
      _: ['No. Non adesso, non così.', 'Lascia perdere. Non è aria.'],
      non_membro: ['Ordini a me? Non sono dei vostri. Chiedi a uno della banda.', 'Io non prendo ordini. Neanche da mia moglie, figurati da te.', 'Mica sono della Risacca. Io ho una vita, più o meno.'],
      never: ['Questo no. Ho una faccia sola e me la tengo pulita.', 'Mai. Chiedilo a uno che ha meno da perdere di me.', 'No. E non chiedermelo più, che mi offendo.'],
      paura: ['Io? Con quei Grigi in giro? Le gambe mi tremano da sole.', 'Vai tu. Io ho la pressione alta e la moglie gelosa.', 'Non se ne parla. L\'ultimo che ci ha provato lo cercano ancora.'],
      pericolo: ['Con {grigi} lì davanti? Vacci tu, io ti guardo da qui.', 'Ci sono i Grigi. Io sono coraggioso, mica scemo.'],
      rancore: ['Proprio a te dovrei fare un favore? Dopo l\'ultima volta?', 'Con te ho chiuso. Chiedi a uno che ti sopporta.'],
      legge: ['Roba contro la legge no. Mio cognato fa l\'usciere in tribunale.', 'Io pago le tasse, io. Più o meno. Questo no.'],
      fiducia: ['Ti conosco da dieci minuti. Ne riparliamo fra dieci anni.', 'E tu chi sei? Mia madre mi ha detto di non dare retta.'],
      stanco: ['Sono a pezzi. Chiedilo a uno che ha dormito.'], fame: ['A stomaco vuoto io non mi muovo. Chiedi a un altro.'],
      cella: ['Sono in cella, genio. Qui si fa solo la fila per il bagno.'],
      impossibile: ['{Motivo}. Mica faccio i miracoli, io.', '{Motivo}. Così non si va da nessuna parte.', 'Così non si può: {motivo}.'],
      non_so: ['Questa non la so fare. E non la voglio imparare.', 'Che vuol dire? Parla come mangi.', 'Io? Ho la faccia di uno che sa fare queste cose?'],
      ruba_mezzo: ['Rubare una Vespa? Io la Vespa la so solo spingere.', 'Rubare? Io? Mi hanno beccato pure col resto sbagliato.'],
      manca: ['{Cosa}? Non ne ho. Se ne avevo, me la tenevo.', 'Non ce l\'ho. Guarda: tasche vuote. Questa è una caramella.', 'Magari. Non ne vedo da martedì.'],
      manca_sigarette: ['Non fumo. Cioè, non compro.'],
      manca_player: ['{Quanti}? Ne hai {hai}, li ho visti.', 'Con quali soldi? Hai {hai} lire e una faccia tosta.', 'Prima contali. Io ne vedo {hai}.'],
      nemico: ['Circolare. Documenti in regola?'],
      nemico_pardo: ['Che domande interessanti. Mi dica, lei con chi passa le serate?'],
      nemico_zia: ['Figlio mio, qui tutti parlano e io ascolto. Siediti, raccontami.'],
    },
    contratta: {
      _: ['Non lo so… Dammi una ragione per rischiare.', 'Mah. Prima fammi capire cosa ci guadagno.'],
      soldi: ['Per la causa no. Per {soldi} sì.', '{Soldi_cap}. Gratis lo fa mia sorella, e male.', 'Con {soldi} ne parliamo. Senza, parliamo del tempo.'],
      notte: ['Di giorno? Con tutta la gente? Di notte, semmai.', 'Adesso no, c\'è troppa luce. Stanotte ne riparliamo.'],
      quando: ['Adesso no. Più tardi ne riparliamo.', 'Così su due piedi? Ripassa più tardi.'],
      lavoro: ['Adesso lavoro. Dopo le {ora}, se proprio.', 'Sto lavorando, non vedi? Ripassa dopo le {ora}.'],
      occupato: ['Prima finisco {impegno}. Non sono un polpo.', 'Sto già {impegno}. Due cose insieme le fa solo mia madre.'],
      stanco: ['Ho le gambe di legno. Se continuo, svengo. Domani.', 'Sono a pezzi. Chiedimelo dopo che ho dormito.'],
      fame: ['Prima mangio. A stomaco vuoto non ragiono e non corro.'],
      prova: ['Prima portami {prova}. Poi vediamo se sei uno che porta le cose.', 'Ti conosco poco. Fammi vedere: {prova}. Poi ne parliamo.', 'Ti conosco da dieci minuti e mi chiedi la galera? Prima {prova}.'],
      furtivo: ['Così no, mi vedono pure i piccioni. Di nascosto, magari.'],
      pericolo: ['Con {grigi} in giro? Magari più tardi, quando se ne vanno.'],
      fiducia: ['Mah. Prima fammi capire chi sei.', 'Non so. Fammi vedere qualcosa, prima.'],
      paura: ['Non lo so… Io ho famiglia. Dammi una ragione.'],
    },
    chiede: {
      _: ['Cioè? Spiegati meglio.'],
      oggetto: ['Con cosa, con lo sputo? Portami {roba}.', 'Senza {roba} non si comincia nemmeno.', 'Mi {manca} {roba}. Tu hai la faccia pulita: pensaci tu.'],
      soldi: ['In cassa non ci sono i soldi. Servono {soldi}.', 'Con quali soldi? In cassa mancano {soldi}.'],
      ambiguo: ['{A} o {B}? Dimmi quale, che non leggo nel pensiero.', '{A} o {B}? Sono due posti, e io sono uno solo.'],
      luogo: ['Dove? L\'isola è grande e io sono uno solo.', 'Dove, di preciso? Dammi un nome.'],
      persona: ['Chi? Dimmi un nome, che qui si chiamano tutti Gino.'],
      cosa: ['Cosa, di preciso? Dimmi il nome della roba.'],
      ora: ['A che ora? Io senza orologio vivo benissimo.'],
    },
    niente: {
      _: ['Parla piano: qui anche i muri hanno gli Orecchi.', 'Dimmi cosa vuoi, ma fai in fretta.', 'Sì? Ti ascolto.', 'Mh. E quindi?', 'Non è il posto per certi discorsi.'],
      annulla_niente: ['Lasciare cosa? Non ti devo niente.'],
      gia: ['Ma ne abbiamo già parlato. Ti sei distratto?', 'Ma se ne abbiamo appena parlato.'],
    },
    // aggiornamenti e rapporti: vengono dopo il fatto
    arrivo: ['Sono {a_luogo}.', 'Arrivato {a_luogo}. Nessuno mi guarda, mi offendo un po\'.', '{A_luogo}. Tutto calmo, troppo.'],
    pericolo: ['Grigi in vista. {grigi}, qui vicino.', 'Ci sono i Grigi. Faccio il vago.', 'Grigi a due passi. Fischietto e guardo i piccioni.'],
    fatta: ['Fatto. Nessuno ha visto niente. Credo.', 'Fatta. Adesso mi offri da bere.', 'Fatto. Facile. Cioè, difficile, ma io sono bravo.', 'Fatto. Se ti chiedono, io ero al bar.'],
    fallita: ['Non ce l\'ho fatta: {motivo}.', 'Niente da fare. {motivo_cap}.'],
    fallita_grigi: ['Non ce l\'ho fatta, c\'erano i Grigi.', 'Niente. C\'erano i Grigi, e io ci tengo alla faccia.'],
    scaduta: ['Lascia stare, non ci sono arrivato.', 'Non ce l\'ho fatta in tempo. Lo so. Lo so.'],
    veglia: ['Grigi in vista {a_luogo}. {grigi}. Girate al largo.', 'Arrivano i Grigi {a_luogo}. {grigi}. Io sparisco.'],
    veglia_vuota: ['Niente Grigi {a_luogo}, in tutto questo tempo. Torno a casa.'],
    secco: ['Ti offrirei qualcosa, ma sono a secco.', 'Offrirei io, ma ho le tasche che piangono.', 'Il giro lo pago la prossima volta. Sono al verde.'],
  };
  Parola.BANCHE = BANCHE;
  const POL = new Set(['scrivi_onda', 'volantina', 'dipingi', 'diffondi_voce', 'sabota', 'trasmetti', 'lancia', 'fotografa']);
  const WORKV = new Set(['lavora', 'ripara', 'pesca', 'colletta', 'produci', 'costruisci', 'rovista', 'recupera', 'mercato', 'contrabbando', 'bisca', 'vendi_documenti']);
  function scegli(st, n, key, arr, fill) {
    const M = S(st), last = M.ultime[n.id + ':' + key];
    let L = arr.filter(x => x !== last); if (!L.length) L = arr;
    const line = pickR(st, L); M.ultime[n.id + ':' + key] = line;
    return riempi(line, fill || {});
  }
  function riempi(line, f) {
    return line.replace(/\{(\w+)\}/g, (m, k) => {
      const capd = /_cap$/.test(k) || /^[A-Z]/.test(k), kk = k.replace(/_cap$/, '').toLowerCase();
      let v = kk === 'a_luogo' ? aLuogo(f.luogo) : f[kk]; if (v === undefined || v === null || v === '') v = { grigi: 'due Grigi', cosa: 'quella roba', roba: 'quella roba', luogo: 'là', ora: 'dopo', soldi: 'qualcosa', motivo: 'non si può', impegno: 'una cosa', prova: 'qualcosa', a: 'uno', b: 'l\'altro', quanti: 'tanti', hai: 'pochi', msg: '', manca: 'mancano' }[kk] || '';
      v = String(v);
      return capd ? cap1(v) : v;
    }).replace(/\s+([.,!?])/g, '$1').replace(/\.\./g, '.').trim();
  }
  const lireW = q => (q >= 1 ? `${q}.000` : 'due spicci');
  function battuta(st, n, I, E) {
    const v = I && I.verbo, B = BANCHE[E.esito] || BANCHE.niente, tipo = E.motivo && E.motivo.tipo, d = (E.motivo && E.motivo.dati) || {}, D2 = E.dati || {};
    const f = {
      luogo: (I && I.luogoNome) || (I && I.args && PLACES[I.args.luogo] && PLACES[I.args.luogo].name) || '', ora: (I && I.args && I.args.ora) || D2.ora || '',
      cosa: I && I.args && I.args._c ? I.args._c.frase : I && I.args && I.args.cosa && I.args.cosa.frase ? I.args.cosa.frase : (d.frase || ''),
      grigi: D2.grigi ? (D2.grigi === 1 ? 'un Grigio' : `${NUMW[D2.grigi] || D2.grigi} Grigi`) : '', soldi: E.contro && E.contro.quanto ? lireW(E.contro.quanto) : '',
      motivo: E.motivo ? low1(String(E.motivo.testo || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/[.\s]+$/, '')) : '', impegno: d.impegno ? String(d.impegno).replace(/^(va|sta|fa) /, '') : '',
      prova: E.contro && E.contro.prova ? E.contro.prova.frase : (D2.prova ? D2.prova.frase : ''), quanti: d.quanti ? lireW(d.quanti) : '', hai: d.hai !== undefined ? lireW(d.hai) : '',
      a: d.nomi ? d.nomi[0] : '', b: d.nomi ? d.nomi[1] : '',
    };
    if (E.contro && E.contro.tipo === 'oggetto') { const R0 = RS.RES[E.contro.id]; const nm = R0 ? R0.one || R0.name : E.contro.id; f.roba = quantiDi(nm, E.contro.quanto || 1); f.manca = (E.contro.quanto || 1) > 1 ? 'mancano' : 'manca'; }
    if (E.contro && E.contro.tipo === 'soldi' && E.contro.cassa) f.soldi = lireW(E.contro.quanto);
    const c = RS.card(n);
    let key = tipo || '_', arr = null;
    if (E.esito === 'accetta') {
      key = v === 'seguimi' && !(n.ris && n.ris.member) ? 'accompagna' : POL.has(v) ? (I.modi && I.modi.furtivo ? 'pol_furtivo' : 'pol') : WORKV.has(v) ? 'lavoro' : v === 'ricevi' && E.favore ? 'ricevi_favore' : v;
      arr = B[key] || B._;
    } else if (E.esito === 'rifiuta') {
      if (tipo === 'nemico') { key = n.id === 'pardo' ? 'nemico_pardo' : n.id === 'zia' ? 'nemico_zia' : 'nemico'; }
      if (v === 'ruba_mezzo') key = 'ruba_mezzo';
      if (tipo === 'manca' && /sigarett/.test(String(I && I.args && I.args.cosa))) key = 'manca_sigarette';
      if (tipo === 'never' && n.id === 'lucia') return scegli(st, n, 'never_lucia', ['Io ricucio quelli che ci provano, Nino. Chiedilo a Dorino.'], f);
      arr = B[key] || B._;
    } else arr = B[key] || B._;
    return scegli(st, n, E.esito + ':' + key, arr, f);
  }

  // ================= LA PROMESSA =================
  function nuovaPromessa(st, o0) {
    const M = S(st);
    const p = Object.assign({ id: 'p' + M.next++, chi: null, a: 'player', verbo: '', args: {}, desc: '', dove: null, quando: { t0: st.t, at: null }, scadenza: null, stato: 'accettata', condizione: null, link: null, passi: [], canale: 'chat', thread: null, parole: '', esito_msg: null, piano_id: null }, o0);
    M.promesse.push(p); M.stats.promesse++;
    if (M.promesse.length > 80) { const i = M.promesse.findIndex(x => !ACTIVE.includes(x.stato)); if (i >= 0) M.promesse.splice(i, 1); }
    return p;
  }
  Parola.promesse = st => S(st).promesse;
  function passo(st, p, n, k, text, opt) {
    opt = opt || {};
    const M = S(st), key = n.id;
    if (!opt.forza && st.t - (M.upd[key] || -1e9) < 2) return false;   // al massimo un aggiornamento ogni 2 minuti di gioco per persona
    M.upd[key] = st.t;
    p.passi.push({ t: st.t, testo: text, k });
    if (p.thread === 'banda' && st.ris) bandaPosta(st, n.id, text, { k });
    if (st.ris) RS.inbox(st, n, text, opt.kind || (k === 'pericolo' || k === 'fallita' ? 'bad' : k === 'fatta' ? 'good' : 'rumor'), k !== 'fatta' && k !== 'fallita' && k !== 'pericolo' && k !== 'veglia');
    if (dist(n.x, n.y, st.player.x, st.player.y) <= 25 && !n.inside) G.say(st, n, text.length > 70 ? text.slice(0, 67) + '…' : text, 3.4);
    return true;
  }
  function chiudi(st, p, stato, msg, muto) {
    if (!ACTIVE.includes(p.stato)) return;
    const M = S(st); p.stato = stato; p.esito_msg = msg || null; p.fine = st.t;
    M.storia.unshift(p.id); if (M.storia.length > 30) M.storia.pop();
    if (stato === 'fatta') M.stats.fatte++; else if (stato === 'fallita') M.stats.fallite++; else if (stato === 'rotta' || stato === 'scaduta') M.stats.rotte++;
    conseguenze(st, p);
    if (p.mandato) try { fineFase(st, p); } catch (e) { }
    if (p.chi !== 'player' && !muto) {
      const n = G.byId(st, p.chi); if (!n) return;
      if (stato === 'fatta') passo(st, p, n, 'fatta', p.verbo === 'pedina' || /[+−-]\d|lire|prodott/i.test(msg || '') ? 'Fatto. ' + cap1(String(msg || '').replace(/^.*?: fatto\.\s*/, '')) : scegli(st, n, 'fatta', BANCHE.fatta), { forza: true });
      else if (stato === 'fallita') passo(st, p, n, 'fallita', /grigi|guardia|cella|preso/i.test(msg || '') ? scegli(st, n, 'fallita_grigi', BANCHE.fallita_grigi) : scegli(st, n, 'fallita', BANCHE.fallita, { motivo: low1(String(msg || 'non è andata').replace(/^Non ce l'ho fatta:?\s*/i, '').replace(/[.\s]+$/, '')) }), { forza: true });
      else if (stato === 'scaduta') passo(st, p, n, 'fallita', scegli(st, n, 'scaduta', BANCHE.scaduta), { forza: true });
    }
  }
  // fiducia, memoria, diario: con gli strumenti che ci sono già
  function conseguenze(st, p) {
    const M = S(st);
    if (p.chi !== 'player') {
      const n = G.byId(st, p.chi); if (!n || !n.ris) return;
      if (p.stato === 'fatta') { note(st, n, `ha mantenuto la parola con ${NAME()}: ${p.desc}`, 'good', { who: 'player', w: .4, tag: 'parola' }); M.rotte[n.id] = 0; }
      else if (p.stato === 'fallita') note(st, n, `ci ha provato: ${p.desc} (${p.esito_msg || 'è andata storta'})`, 'info', { who: 'player', w: .3, tag: 'parola' });
      else if (p.stato === 'rotta' || p.stato === 'scaduta') {
        n.ris.bond = clamp(n.ris.bond - .05, -.5, .6);
        if (n.ris.member) { n.ris.loyalty = clamp(n.ris.loyalty - .06, 0, 1); RS.members(st).forEach(m => { if (m !== n) note(st, m, `${nome(n)} molla le cose a metà`, 'bad', { who: n.id, w: .3, tag: 'parola' }); }); }
      }
      return;
    }
    const n = G.byId(st, p.a); if (!n || !n.ris) return;
    if (p.stato === 'fatta') { n.ris.bond = clamp(n.ris.bond + .06, -.5, .6); note(st, n, `${NAME()} ha mantenuto la parola (${p.desc})`, 'good', { who: 'player', w: .4, tag: 'parola' }); M.rotte[n.id] = 0; }
    else if (p.stato === 'rotta' || p.stato === 'scaduta') {
      if (!p.consFatte) { n.ris.bond = clamp(n.ris.bond - .08, -.5, .6); note(st, n, `${NAME()} aveva promesso (${p.desc}), e niente`, 'bad', { who: 'player', w: .5, tag: 'bidone' }); }
      M.rotte[n.id] = (M.rotte[n.id] || 0) + 1;
      if (M.rotte[n.id] >= 2) { M.diffida[n.id] = st.t + 2 * 1440; M.rotte[n.id] = 0; }
    }
  }

  // ================= L'IMPEGNO: si fa partire la cosa, poi si parla =================
  function impegna(st, n, I, E, canale) {
    const v = I.verbo, a = Object.assign({}, I.args || {}), r = n.ris, member = !!(r && r.member), P = n.pop, M = S(st);
    const base = { chi: n.id, a: 'player', verbo: v, args: a, canale: canale || 'chat', thread: canale === 'banda' ? 'banda' : n.id };
    delete a._c;
    // compiti della Risacca (membri)
    if (member && (defOf(v).motore === 'task' || ['vai', 'aspetta', 'seguimi'].includes(v))) {
      const res = RS.assign(st, n, v, a, 'parola'); if (!res.ok) return { ok: false, msg: res.msg };
      const T = n.ris.task; const p = nuovaPromessa(st, Object.assign(base, { desc: T.desc, link: { tipo: 'task', id: T.id, obj: T }, stato: 'in_corso', scadenza: v === 'seguimi' ? null : st.t + taskMinuti(T, n) + 120 + (v === 'pedina' ? 120 : 0), dove: luogoDi(T) }));
      T.pid = p.id; p._loy = r.loyalty; p._i = T.i;
      return { ok: true, msg: cap1(T.desc) + '.', promessa: p };
    }
    if (v === 'seguimi') {
      const f = RS.EXT.immediate.accompagna; if (!f) return { ok: false, msg: 'Non può.' };
      const res = f(st, n, { ore: a.ore || 1 }); if (!res.ok) return res;
      const p = nuovaPromessa(st, Object.assign(base, { desc: `viene con te per ${a.ore || 1} ${(a.ore || 1) === 1 ? 'ora' : 'ore'}`, link: { tipo: 'with', obj: P.with }, stato: 'in_corso', scadenza: P.with.until + 5 }));
      return { ok: true, msg: res.msg, promessa: p };
    }
    if (v === 'aspetta' || v === 'vai') {
      const A0 = Az(); if (!A0) return { ok: false, msg: 'Non può.' };
      const mins = clamp(a.minuti || 30, 5, 30);
      let steps;
      if (v === 'vai') { const tp = PLACES[a.luogo]; if (!tp) return { ok: false, msg: 'Dove?' }; steps = [{ label: `va a ${tp.name}`, at: () => tp, dur: 0, outside: true }, { label: `aspetta a ${tp.name}`, dur: 20, act: (s2, n2, E2) => { E2.__ok = true; return 'next'; } }]; }
      else { const tp = a.luogo && PLACES[a.luogo]; steps = (tp ? [{ label: `va a ${tp.name}`, at: () => tp, dur: 0, outside: true }] : []).concat([{ label: tp ? `ti aspetta a ${tp.name}` : 'ti aspetta qui', dur: mins, act: (s2, n2, E2) => { E2.__ok = true; return 'next'; } }]); }
      const Ep = A0.startPlan(st, n, v, v === 'vai' ? `va a ${PLACES[a.luogo].name}` : 'ti aspetta', steps, 2); if (!Ep) return { ok: false, msg: 'Ha altro di più urgente.' };
      const p = nuovaPromessa(st, Object.assign(base, { desc: Ep.label, link: { tipo: 'piano', obj: Ep }, stato: 'in_corso', scadenza: st.t + mins + 90 }));
      Ep.pid = p.id; Ep.onEnd = (s2, n2, why) => { Ep.__end = why; };
      return { ok: true, msg: cap1(Ep.label) + '.', promessa: p };
    }
    if (v === 'porta_a') {
      const A0 = Az(); if (!A0 || !P) return { ok: false, msg: 'Non può.' };
      const id = a.cosa, q = a.quanto || 1, nm0 = (Og() && Og().CAT[id] ? Og().CAT[id].nome : (Az().ITEMS[id] || {}).name) || id, nm = q > 1 ? quantiDi(nm0, q) : art(nm0, 'det');
      const to = a.a === 'player' ? null : G.byId(st, a.a);
      const steps = [];
      const inv = (P.inv || {})[id] || 0, casa = (P.casa || {})[id] || 0;
      if (inv < q && inv + casa >= q && P.homeT) steps.push({ label: `passa a casa a prendere ${nm}`, at: () => P.homeT, dur: 2, inside: true, outside: false, act: (s2, n2) => { const k = Math.min(q - ((P.inv || {})[id] || 0), (P.casa || {})[id] || 0); if (k > 0) { P.casa[id] -= k; if (P.casa[id] <= 0) delete P.casa[id]; P.inv = P.inv || {}; P.inv[id] = (P.inv[id] || 0) + k; } return 'next'; } });
      else if (inv + casa < q) {
        const sh = E.shop || bottega(st, n, id, q); if (!sh) return { ok: false, msg: `Non trova ${nm} da nessuna parte.` };
        steps.push({ label: `va a comprare ${nm} ${aLuogo(sh.t.label)}`, at: () => sh.t, dur: 3, outside: false, act: (s2, n2, E2) => { const pr = Eco().buy(s2, n2, sh.t, id, q); if (pr === null || pr === undefined) { E2.__why = `a ${sh.t.label} ${nm} non c'era, o non bastavano i soldi`; return 'stop'; } P.inv = P.inv || {}; P.inv[id] = (P.inv[id] || 0) + q; return 'next'; } });
      }
      steps.push({ label: to ? `porta ${nm} a ${to.first}` : `ti porta ${nm}`, at: () => (to ? { x: to.x, y: to.y, label: to.first } : { x: st.player.x, y: st.player.y, label: 'da te' }), dur: .5, outside: true,
        act: (s2, n2, E2) => {
          const tx = to ? to.x : s2.player.x, ty = to ? to.y : s2.player.y;
          if (dist(n2.x, n2.y, tx, ty) > 6) { E2.phase = 'go'; E2.goal = null; return 'wait'; }
          const have = (P.inv || {})[id] || 0; if (have < q) { E2.__why = `${nm} non ce l'ha più`; return 'stop'; }
          P.inv[id] -= q; if (P.inv[id] <= 0) delete P.inv[id];
          if (to) { if (Sc()) Sc().put(to, id, q); } else { s2.player.inv = s2.player.inv || {}; s2.player.inv[id] = (s2.player.inv[id] || 0) + q; }
          E2.__ok = true; return 'next';
        } });
      if (member && n.ris) n.ris.task = null;
      const Ep = A0.startPlan(st, n, 'porta_a', to ? `porta ${nm} a ${to.first}` : `ti porta ${nm}`, steps, 2); if (!Ep) return { ok: false, msg: 'Ha altro di più urgente.' };
      Ep.onEnd = (s2, n2, why) => { Ep.__end = why; };
      const p = nuovaPromessa(st, Object.assign(base, { desc: Ep.label, link: { tipo: 'piano', obj: Ep }, stato: 'in_corso', scadenza: st.t + 150 }));
      Ep.pid = p.id;
      return { ok: true, msg: cap1(Ep.label) + '.', promessa: p };
    }
    if (v === 'dammi' || v === 'compra_da') {
      const id = a.cosa, q = a.quanto || 1;
      if (!((P.inv || {})[id] >= q)) return { ok: false, msg: 'Non ce l\'ha più.' };
      P.inv[id] -= q; if (P.inv[id] <= 0) delete P.inv[id];
      st.player.inv = st.player.inv || {}; st.player.inv[id] = (st.player.inv[id] || 0) + q;
      note(st, n, `ha dato ${a._c0 || id} a ${NAME()}`, 'info', { who: 'player', w: .3, tag: 'regalo' });
      return { ok: true, msg: `${n.first} ti dà ${q > 1 ? q + ' × ' : ''}${(Og() && Og().CAT[id] ? Og().CAT[id].nome : id)}.` };
    }
    if (v === 'appuntamento') {
      const res = RS.EXT.immediate.appuntamento(st, n, a); if (!res.ok) return res;
      const ap = P.appt;
      const p = nuovaPromessa(st, Object.assign(base, { desc: `ti aspetta a ${ap.label} alle ${hhmm(ap.t)}`, link: { tipo: 'appt', obj: ap }, stato: 'accettata', quando: { t0: st.t, at: ap.t }, scadenza: ap.t + 60, dove: { name: ap.label, x: ap.tgt.x, y: ap.tgt.y } }));
      const q = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'appuntamento', desc: `appuntamento alle ${hhmm(ap.t)} ${aLuogo(ap.label)}`, link: { tipo: 'appt', obj: ap }, stato: 'accettata', quando: { t0: st.t, at: ap.t }, scadenza: ap.t + 60, thread: n.id, consFatte: true });
      return { ok: true, msg: res.msg, promessa: p, sua: q };
    }
    if (v === 'partecipa') {
      const res = RS.EXT.immediate.partecipa(st, n, a); if (!res.ok) return res;
      const Ei = E.impresa || impresaDi(st, n);
      const q = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'partecipa', desc: `venire anche tu: ${Ei.label}`, link: { tipo: 'impresa', obj: Ei }, stato: 'accettata', quando: { t0: st.t, at: Ei.t }, scadenza: Ei.t + 60, thread: n.id, consFatte: true });
      return { ok: true, msg: res.msg, sua: q };
    }
    if (v === 'avvisa') {
      const L = a.luogo && (PLACES[a.luogo] || (st.ris.bases.find(b => b.id === a.luogo)));
      const at = L ? { x: L.x, y: L.y, name: L.name } : { x: n.x, y: n.y, name: G.nearestPlace(n.x, n.y).name };
      if (member && L) { const res = RS.assign(st, n, 'aspetta', { luogo: a.luogo }, 'parola'); if (!res.ok) return res; }
      const ore = clamp(a.ore || 3, .5, 8);
      const p = nuovaPromessa(st, Object.assign(base, { desc: `ti avvisa se arrivano i Grigi a ${at.name}`, stato: 'in_corso', scadenza: st.t + ore * 60 + 5, dove: at }));
      const V0 = { pid: p.id, chi: n.id, se: a.se || 'grigi', x: at.x, y: at.y, name: at.name, fino: st.t + ore * 60, task: member && L ? n.ris.task : null };
      M.veglie.push(V0); p.link = { tipo: 'veglia', obj: V0 };
      return { ok: true, msg: `${nome(n)} fa da palo a ${at.name} per ${ore} ore.`, promessa: p };
    }
    if (v === 'prometto') {
      const pd = M.pend[n.id]; const ct = pd.contro;
      let p;
      if (pd.mandato && ct.tipo === 'tempo') {
        const L = pd.mandato.map(ob => Object.assign({}, ob, { entro: Math.max(ob.entro, st.t + (ct.giorni || 5) * 1440) }));
        delete M.pend[n.id];
        const rm = rispondiMandato(st, n, '', L, { canale: pd.thread === 'banda' ? 'banda' : 'chat', tempo: true });
        return { ok: rm.esito === 'accetta', msg: rm.esito === 'accetta' ? `${nome(n)} ha tempo fino a ${G.dayName(L[0].entro)}.` : '', mandato: rm.mandato, sayM: rm.say };
      }
      if ((ct.tipo === 'dopo' || ct.tipo === 'quando') && pd.intento) {
        const at = ct.dopo || (ct.quando === 'stanotte' ? (dayIdx(st.t) + (st.t % 1440 >= 22 * 60 ? 1 : 0)) * 1440 + (st.t % 1440 >= 22 * 60 ? 60 : 22 * 60 + 30) : st.t + 120);
        p = nuovaPromessa(st, { chi: n.id, a: 'player', verbo: pd.intento.verbo, args: pd.intento.args, desc: `${descIntento(st, n, pd.intento)}, alle ${hhmm(at)}`, stato: 'attesa', quando: { t0: st.t, at }, scadenza: at + 240, thread: pd.thread || n.id, canale: pd.thread === 'banda' ? 'banda' : 'chat', intento: pd.intento, dopo: true });
        delete M.pend[n.id];
        if (n.ris && n.ris.member && n.ris.fatigue > .6 && !n.ris.task) RS.assign(st, n, 'dormi', { ore: clamp(Math.round((at - st.t) / 60), 2, 8) }, 'parola');
        return { ok: true, msg: `${nome(n)}: ${p.desc}.`, promessa: p };
      }
      if (ct.tipo === 'oggetto') { const R0 = RS.RES[ct.id]; p = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'procura', desc: `${quantiDi(R0 ? R0.one || R0.name : ct.id, ct.quanto || 1)}`, condizione: { tipo: 'risorsa', id: ct.id, quanto: ct.quanto || 1 }, stato: 'attesa', scadenza: (dayIdx(st.t) + 2) * 1440, thread: n.id, intento: pd.intento }); }
      else if (ct.tipo === 'prova' && ct.prova && ct.prova.tipo === 'oggetto') p = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'porta_a', desc: `${ct.prova.frase}`, condizione: { tipo: 'dare', ids: ct.prova.ids }, stato: 'attesa', scadenza: (dayIdx(st.t) + 2) * 1440, thread: n.id });
      else if (ct.tipo === 'soldi') p = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'paga', desc: `${ct.quanto}.000 lire`, condizione: { tipo: 'soldi', quanto: ct.quanto }, stato: 'attesa', scadenza: (dayIdx(st.t) + 2) * 1440, thread: n.id, intento: pd.intento });
      else p = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'prova', desc: `${ct.prova ? ct.prova.frase : 'il favore'}`, condizione: { tipo: 'missione' }, stato: 'attesa', scadenza: (dayIdx(st.t) + 3) * 1440, thread: n.id });
      delete M.pend[n.id];
      return { ok: true, msg: `Hai promesso a ${nome(n)}: ${p.desc.replace(new RegExp(' (per|a) ' + nome(n) + '$'), '')}.`, sua: p };
    }
    if (v === 'annulla') {
      const L = M.promesse.filter(p => p.chi === n.id && ACTIVE.includes(p.stato));
      L.forEach(p => { chiudi(st, p, 'annullata', 'gli hai detto di lasciar stare'); stopLink(st, n, p); });
      if (n.ris && n.ris.task) n.ris.task = null;
      return { ok: true, msg: L.length ? `${nome(n)} lascia stare: ${L.map(p => p.desc).join('; ')}.` : `${nome(n)} smette.` };
    }
    if (v === 'stato' || v === 'racconta') return { ok: true, msg: '' };
    // il resto: i verbi immediati della Risacca e della convivenza
    const res = RS.order(st, n, v, a, { src: 'parola', force: true });
    return res;
  }
  Parola.impegna = impegna;
  // quanto ci mette, a stima: a piedi si fa più o meno un metro e mezzo per minuto di gioco (si conta largo)
  const taskMinuti = (T, n) => { let x = n ? n.x : 0, y = n ? n.y : 0; return T.steps.reduce((s, q) => { if (q.k === 'go') { const m = n ? dist(x, y, q.x, q.y) / 1.1 + 10 : 25; x = q.x; y = q.y; return s + m; } return s + (q.k === 'work' ? (q.hours || 1) * 60 : q.k === 'hold' ? q.mins || 0 : q.k === 'meet' ? 40 : 2); }, 0); };
  const luogoDi = T => { const g = T.steps.slice().reverse().find(s => s.k === 'go'); return g ? { name: g.name, x: g.x, y: g.y } : null; };
  function stopLink(st, n, p) {
    const L = p.link; if (!L) return;
    if (L.tipo === 'task' && n.ris && n.ris.task === L.obj) n.ris.task = null;
    if (L.tipo === 'piano' && n.pop && n.pop.emer === L.obj && Az()) Az().endPlan(st, n, 'annullato');
    if (L.tipo === 'with' && n.pop && n.pop.with === L.obj) n.pop.with = null;
    if (L.tipo === 'veglia') { L.obj.fino = -1; if (L.obj.task && n.ris && n.ris.task === L.obj.task) n.ris.task = null; }
  }

  // ================= LA RISPOSTA =================
  function rispondi(st, n, text, opt) {
    opt = opt || {};
    const M = S(st), r = RS.initNpc(st, n), R = st.ris;
    const ch = R.chats[n.id] = R.chats[n.id] || [];
    if (!opt.noUser) ch.push({ role: 'user', text, t: st.t });
    const gd = M.giorni[n.id] = M.giorni[n.id] || []; if (!gd.includes(dayIdx(st.t))) gd.push(dayIdx(st.t));
    r.persuade = /ti prego|per favore|per (la|l )isola|per tuo|insieme|liberi/.test(norm(text)) ? .08 : 0;
    r.bond = clamp(r.bond + r.persuade * .35, -.5, .6);
    if (RS.card(n).informer && /risacca|onda|base|sabot|garante|tutela|grigi/i.test(text)) { R.repr = clamp(R.repr + 3, 0, 100); R.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo + .08, 0, 1); }); }
    const ia = opt.ia || null;
    // un obiettivo aperto («servono soldi per la cassa»): è un mandato (§0)
    if (!opt.noMandato) { const MD = capisciMandato(st, text); if (MD.length) return rispostaMandatoChat(st, n, text, MD, opt, ch); }
    if (ia && typeof ia.persuasione === 'number') { r.persuade = clamp(ia.persuasione, -.15, .15); r.bond = clamp(r.bond + r.persuade * .35, -.5, .6); }
    const C = ia ? capisciIA(st, n, text, ia) : capisci(st, n, text);
    let I = C.intento, E = verifica(st, n, I, { malus: opt.malus }), out = [], main = null, extraSay = null;
    if (ia && !I && ia.domanda && !promette(ia.domanda)) { E = { esito: 'chiede', motivo: { tipo: 'ia_domanda', testo: '', dati: {} }, contro: null }; extraSay = clip(ia.domanda); }
    // si fa partire la cosa (solo se l'esito è accetta); se non parte, l'esito diventa un rifiuto col motivo vero
    const run = (I0, E0) => {
      if (E0.esito !== 'accetta') return E0;
      const res = impegna(st, n, I0, E0, opt.canale);
      if (res && res.msg !== undefined) out.push(Object.assign({ verb: I0.verbo, label: (RS.VERBS[I0.verbo] || {}).label || I0.verbo }, res));
      if (!res || !res.ok) return { esito: 'rifiuta', motivo: { tipo: 'impossibile', testo: (res && res.msg) || 'non si può', dati: {} }, contro: null };
      E0.res = res; if (I0.verbo === 'ricevi' && /favore/.test(res.msg || '')) E0.favore = true;
      if (res.promessa && isM(n)) { const V = RS.VERBS[I0.verbo] || {}; if ((V.risk || 0) >= .1 || V.pol) tradisce(st, n, res.promessa, res.promessa.desc); }   // decisione 3
      if (I0.verbo === 'missione' && res.ok) extraSay = res.msg;
      if (I0.verbo === 'prometto' && res.sayM) extraSay = res.sayM;
      if (I0.verbo === 'rivela_spazio' && res.ok) extraSay = `C'è un posto: ${String(res.msg).replace(/^Ti indica /, '').replace(/\.$/, '')}. Non dirlo a nessuno.`;
      if (I0.verbo === 'chiedi_aiuto' && res.ok) extraSay = `Visto che chiedi… ${String(res.msg).replace(/^.*ti chiede: /, 'mi servirebbe ').replace(/\.$/, '')}.`;
      return E0;
    };
    E = run(I, E);
    // soldi dati per una contro-offerta: la cosa chiesta prima riparte, pagata
    if (I && I.verbo === 'ricevi_soldi' && E.esito === 'accetta' && M.pend[n.id] && M.pend[n.id].mandato && M.pend[n.id].contro && M.pend[n.id].contro.tipo === 'soldi') {
      const pd = M.pend[n.id], q = Math.round(I.args.quanto || 0);
      if (q >= pd.contro.quanto) { delete M.pend[n.id]; const rm = rispondiMandato(st, n, text, pd.mandato, { pagato: q, canale: pd.thread === 'banda' ? 'banda' : 'chat' }); extraSay = rm.say; E.mandato = rm.mandato; }
      else pd.contro.quanto -= q;
    } else if (I && I.verbo === 'ricevi_soldi' && E.esito === 'accetta' && M.pend[n.id] && M.pend[n.id].contro && M.pend[n.id].contro.tipo === 'soldi') {
      const pd = M.pend[n.id], q = Math.round(I.args.quanto || 0);
      if (q >= pd.contro.quanto) { delete M.pend[n.id]; const E2 = verifica(st, n, pd.intento, { pagato: q }); const E3 = run(pd.intento, E2); main = { I: pd.intento, E: E3 }; chiudiPaga(st, n); }
      else pd.contro.quanto -= q;
    }
    // la risposta a una cosa che non si fa: «stato» e «racconta» li dice il motore
    if (I && I.verbo === 'stato' && E.esito === 'niente') extraSay = statoDi(st, n);
    if (I && I.verbo === 'racconta' && E.esito === 'niente') { const fb = fb0(st, n, text); extraSay = fb.risposta; }
    // gli altri intenti della frase (uniti da «e» o «poi»)
    C.altri.forEach(I2 => { const E2 = run(I2, verifica(st, n, I2)); if (E2.esito !== 'accetta' && E2.motivo) out.push({ verb: I2.verbo, ok: false, msg: E2.motivo.testo || '' }); });
    const fin = main || { I, E };
    // ricorda la contro-offerta: il giocatore può pagare, promettere o lasciar stare
    if (fin.E.esito === 'contratta' || fin.E.esito === 'chiede') { if (fin.E.contro) M.pend[n.id] = { intento: fin.I, contro: fin.E.contro, t: st.t }; }
    else if (fin.E.esito === 'accetta' && fin.I && fin.I.verbo !== 'ricevi_soldi' && fin.I.verbo !== 'prometto') delete M.pend[n.id];
    // le promesse del giocatore: una cosa data che era la prova
    if (I && I.verbo === 'ricevi' && E.esito === 'accetta') M.promesse.filter(p => p.chi === 'player' && p.a === n.id && p.stato === 'attesa' && p.condizione && p.condizione.tipo === 'dare' && p.condizione.ids.includes(I.args.oggetto)).forEach(p => chiudi(st, p, 'fatta', 'consegnato'));
    // solo adesso, la battuta
    let say = extraSay || (ia && lineaIA(st, n, ia, fin.E, fin.I)) || battuta(st, n, fin.I, fin.E);
    if (fin.E.esito !== 'accetta' && promette(say)) { M.stats.guardia++; say = scegli(st, n, 'niente:_', BANCHE.niente._); }
    if (fin.E.esito === 'rifiuta' && fin.E.motivo && fin.E.motivo.testo && !out.some(x => x.ok === false)) out.push({ verb: fin.I ? fin.I.verbo : '', ok: false, msg: veroMotivo(fin.E) });
    if ((fin.E.esito === 'chiede' || fin.E.esito === 'contratta') && fin.E.motivo && fin.E.motivo.testo) out.push({ verb: fin.I ? fin.I.verbo : '', ok: null, msg: veroMotivo(fin.E) });
    M.stats.risposte++; M.stats.esiti[fin.E.esito] = (M.stats.esiti[fin.E.esito] || 0) + 1;
    const pr = (fin.E.res && (fin.E.res.promessa || fin.E.res.sua)) || null;
    if (pr) pr.parole = `«${say}»`;
    const said = { role: 'npc', text: say, raw: JSON.stringify({ risposta: say, esito: fin.E.esito }), mood: ia && ia.umore ? String(ia.umore).slice(0, 20) : '', t: st.t, esito: fin.E.esito, ia: !!ia };
    ch.push(said);
    out.filter(x => x.msg).forEach(x => ch.push({ role: 'sys', text: (x.ok ? '✓ ' : x.ok === false ? '✗ ' : '· ') + x.msg, ok: x.ok === null ? undefined : x.ok, t: st.t }));
    if (ch.length > 80) ch.splice(0, ch.length - 80);
    const memo = ia && ia.memoria ? String(ia.memoria).slice(0, 120) : `Mi ha detto: «${String(text).slice(0, 60)}»`; r.notes.push(memo); if (r.notes.length > 12) r.notes.shift();
    RS.EXT.onReply.forEach(f => { try { f(st, n, text, said, out, { memoria: memo }); } catch (e) { } });
    r.pay = 0; r.persuade = 0;
    n.face = Math.atan2(st.player.y - n.y, st.player.x - n.x); n.wait = Math.max(n.wait || 0, 4);
    G.say(st, n, said.text.length > 70 ? said.text.slice(0, 67) + '…' : said.text, 4);
    return { say: said.text, mood: '', outcomes: out, esito: fin.E.esito, motivo: fin.E.motivo, contro: fin.E.contro, intento: fin.I, promessa: pr, verifica: fin.E };
  }
  Parola.rispondi = rispondi;
  function chiudiPaga(st, n) { S(st).promesse.filter(p => p.chi === 'player' && p.a === n.id && p.stato === 'attesa' && p.condizione && p.condizione.tipo === 'soldi').forEach(p => chiudi(st, p, 'fatta', 'pagato')); }
  const veroMotivo = E => { const t = String(E.motivo.testo || ''); return E.motivo.tipo === 'ambiguo' ? `Quale? ${E.motivo.dati.nomi.join(' o ')}.` : cap1(t.replace(/\s+$/, '')) + (/[.?!]$/.test(t) ? '' : '.'); };
  function statoDi(st, n) {
    const p = S(st).promesse.find(x => x.chi === n.id && ACTIVE.includes(x.stato)), where = G.nearestPlace(n.x, n.y).name;
    if (n.jailedUntil > st.t) return 'In cella. Dove vuoi che sia?';
    if (p) { const left = p.scadenza ? Math.max(0, Math.round((p.scadenza - st.t) / 60)) : null; return `A ${where}. ${cap1(p.desc)}${left ? `, ancora un paio d'ore al massimo` : ''}.`.replace(/\.\./, '.'); }
    if (n.ris && n.ris.task) return `A ${where}. ${cap1(n.ris.task.desc)}.`;
    return `A ${where}. Niente di speciale.`;
  }
  Parola.prometti = (st, n) => rispondi(st, n, 'prometto', { noUser: true });
  // la risposta a un mandato in chat: si decide (e si fa partire), poi si parla
  function rispostaMandatoChat(st, n, text, MD, opt, ch) {
    const M = S(st), rm = rispondiMandato(st, n, text, MD, { canale: opt.canale, ia: opt.iaMandato });
    const say = rm.say, out = [];
    rm.mandati.forEach(m => out.push({ verb: 'mandato', ok: true, msg: `Mandato: ${m.label.toLowerCase()} (${m.tipo === 'soldi' ? m.obiettivo.quanto + '.000 lire' : m.obiettivo.quanto}) entro ${G.dayName(m.vincoli.entro)} ${hhmm(m.vincoli.entro)} · ${m.metodo.etichetta}.` }));
    rm.res.filter(x => x.esito === 'contratta' && x.contro).forEach(x => out.push({ verb: 'mandato', ok: null, msg: x.contro.tipo === 'soldi' ? `Vuole ${x.contro.quanto}.000 lire per cominciare.` : x.contro.tipo === 'tempo' ? `Vuole ${x.contro.giorni} giorni.` : 'Vuole qualcosa in cambio.' }));
    rm.res.filter(x => x.esito === 'rifiuta').forEach(x => out.push({ verb: 'mandato', ok: false, msg: `${MANDATI[x.ob.tipo].label}: no${x.L && x.L.length ? ' (' + (x.L[0].no || 'non se la sente') + ')' : ''}.` }));
    M.stats.risposte++; M.stats.esiti[rm.esito] = (M.stats.esiti[rm.esito] || 0) + 1;
    const said = { role: 'npc', text: say, raw: JSON.stringify({ risposta: say, esito: rm.esito }), mood: '', t: st.t, esito: rm.esito };
    if (opt.canale !== 'banda') { ch.push(said); out.forEach(x => ch.push({ role: 'sys', text: (x.ok ? '✓ ' : x.ok === false ? '✗ ' : '· ') + x.msg, ok: x.ok === null ? undefined : x.ok, t: st.t })); }
    n.face = Math.atan2(st.player.y - n.y, st.player.x - n.x); n.wait = Math.max(n.wait || 0, 4);
    G.say(st, n, clip(say, 70), 4);
    return { say, mood: '', outcomes: out, esito: rm.esito, motivo: null, contro: rm.contro, intento: { verbo: 'mandato', args: {} }, promessa: null, mandato: rm.mandato, mandati: rm.mandati, verifica: { esito: rm.esito, res: rm } };
  }

  // ================= L'IA (passi 4-5): il modello propone, il motore decide =================
  // La richiesta del §4.1 (verbi, volontà, fattibilità, impegni, storia), l'intento dell'IA normalizzato e controllato come quello
  // del ripiego, la battuta dell'IA presa solo se corrisponde all'esito vero (e il cane da guardia la scarta se promette a vuoto).
  const clip = (x, k) => { x = String(x || '').replace(/\s+/g, ' ').trim(); k = k || 160; return x.length > k ? x.slice(0, k - 1) + '…' : x; };
  const NON_IA = new Set(['uccidi', 'sbarazzati', 'trasporta', 'spaccia', 'costituisciti', 'soccorri']);   // decisione 4: i verbi violenti di azioni.js restano fuori dalla chat
  const DESC_X = { appuntamento: ['luogo, ora, giorno?', 'fissa un appuntamento con te'], partecipa: ['impresa?', 'ti fa entrare nella cosa che organizza'], ricevi: ['oggetto, quanto', 'prende una cosa dal tuo zaino'], chiedi_aiuto: ['', 'ti dice cosa gli servirebbe'], prometto: ['', 'prende nota di quello che gli prometti'] };
  function verbiPer(st, n, soloM) {
    const member = !!(n && n.ris && n.ris.member), L = [], seen = new Set();
    const add = v => {
      if (seen.has(v) || NON_IA.has(v)) return; const D = defOf(v); if (!D) return;
      if (D.chi === 'M' && !member) return; if (D.chi === 'A' && n && !n.pop) return; if (soloM && D.chi !== 'M' && !['seguimi', 'vai', 'aspetta', 'avvisa', 'stato', 'annulla', 'racconta'].includes(v)) return;
      seen.add(v); const V = RS.VERBS[v] || {}, X = DESC_X[v] || [];
      L.push({ verbo: v, args: V.args !== undefined ? V.args : X[0] || '', desc: V.desc || X[1] || v, chi: D.chi === 'M' ? 'membri' : 'tutti' });
    };
    Object.keys(DEF).forEach(add); Object.keys(RS.VERBS).forEach(add);
    return L;
  }
  function luoghiPer(st, n, text) {
    const me = n || st.player, L = Object.values(PLACES).map(p => [p, dist(p.x, p.y, me.x, me.y)]).sort((a, b) => a[1] - b[1]).slice(0, 40).map(x => x[0]);
    const T = text ? trovaLuogo(st, text, n) : null;
    (T ? (T.dubbio ? T.dubbio : [T]) : []).forEach(x => { if (x && PLACES[x.id] && !L.includes(PLACES[x.id])) L.push(PLACES[x.id]); });
    return st.ris.bases.filter(b => b.alive).map(b => `${b.id}=${b.name} (base)`).concat(L.map(p => `${p.id}=${p.name}`)).join('; ');
  }
  function personePer(st, n, text) {
    const seen = new Set(), out = [];
    const add = k => { if (!k || k === n || k.dead || k.driver || /^(aut|drv)/.test(k.id) || seen.has(k.id)) return; seen.add(k.id); out.push(`${k.id}=${k.name}${RS.battle(k) ? ` «${RS.battle(k)}»` : ''}${k.cop ? ' (Grigio)' : ''}${k.ris && k.ris.member ? ' (della Risacca)' : ''}`); };
    if (text) add(trovaPersona(st, text, n, true));
    RS.members(st).forEach(add); ((n && n.pop && n.pop.friends) || []).forEach(id => add(G.byId(st, id)));
    Object.keys(RS.CARDS).forEach(id => add(G.byId(st, id)));
    const me = n || st.player; st.npcs.filter(k => !k.driver && !k.dead && (k.pop || RS.CARDS[k.id])).sort((a, b) => dist(a.x, a.y, me.x, me.y) - dist(b.x, b.y, me.x, me.y)).slice(0, 10).forEach(add);
    return out.slice(0, 36).join('; ');
  }
  const VOL_STD_M = ['lavora', 'colletta', 'scrivi_onda', 'volantina', 'sabota', 'contrabbando', 'sorveglia', 'pedina', 'porta_a', 'recluta', 'scasso', 'bisca'], VOL_STD_A = ['unisciti', 'racconta', 'rivela_spazio', 'seguimi', 'porta_a', 'dammi', 'avvisa', 'appuntamento'];
  function volontaPer(st, n, verbs) {
    const out = {};
    verbs.forEach(v => {
      if (out[v]) return; const D = defOf(v); if (!D) return;
      if (D.chi === 'M' && !(n.ris && n.ris.member)) { out[v] = 'rifiuta: non è della Risacca, non prende ordini'; return; }
      const w = RS.will(st, n, (v === 'seguimi' || v === 'vai' || v === 'aspetta') && !(n.ris && n.ris.member) ? 'accompagna' : v, {});
      out[v] = w.verdict === 'accetta' ? 'accetta' : `${w.verdict}: ${w.why.slice(0, 2).join(', ') || (w.verdict === 'contratta' ? 'vuole qualcosa in cambio' : 'non se la sente')}`;
    });
    return out;
  }
  const fattDi = E => (E.esito === 'accetta' ? 'ok' : E.esito === 'niente' ? 'ok' : `${E.esito === 'chiede' ? 'manca' : E.esito}: ${E.motivo ? clip(E.motivo.testo || E.motivo.tipo, 90) : ''}`);
  function richiestaDialogo(st, n, text) {
    RS.initNpc(st, n); const c = RS.card(n), member = !!n.ris.member, M = S(st);
    const C = capisci(st, n, text), guess = [C.intento].concat(C.altri).filter(Boolean);
    const fatt = {};
    guess.forEach(I => { try { fatt[I.verbo] = fattDi(verifica(st, n, I)); } catch (e) { } });
    if (member) ['scrivi_onda', 'dipingi', 'volantina', 'produci'].forEach(v => { if (fatt[v]) return; const pl = RS.plan(st, n, v, {}); fatt[v] = pl.err ? 'manca: ' + clip(pl.err, 80) : 'ok'; });
    M.iaReq[n.id] = { fatt, t: st.t };
    const verbs = (member ? VOL_STD_M : VOL_STD_A).concat(c.likes || [], guess.map(I => I.verbo));
    const storia = (st.ris.chats[n.id] || []).filter(m => m.role === 'user' || (m.role === 'npc' && !m.sys)).slice(-8).map(m => ({ chi: m.role === 'user' ? 'giocatore' : 'npc', testo: clip(m.text, 200) }));
    const stato = (() => { try { return clip(RS.chatState(st, n), 2400); } catch (e) { return ''; } })();
    return {
      kind: 'dialogo', versione: 'parola1',
      npc: { id: n.id, name: n.name, ruolo: n.role, battaglia: RS.battle(n) || null, voce: c.voice || '', membro: member, scheda: clip(c.bio || (n.pop && Po() && Po().bioOf ? (() => { try { return Po().bioOf(st, n); } catch (e) { return ''; } })() : ''), 400), stranezza: typeof Matti !== 'undefined' && Matti.scheda ? Matti.scheda(n) || null : null },
      regole_personaggio: `fa volentieri: ${(c.likes || []).join(', ') || '—'} · mai: ${(c.never || []).join(', ') || '—'}${c.informer ? ' · parla con gli Orecchi' : ''}${c.antag ? ' · è un nemico della Risacca' : ''}`,
      stato, volonta: volontaPer(st, n, verbs), fattibilita: fatt,
      impegni: M.promesse.filter(p => p.chi === n.id && ACTIVE.includes(p.stato)).map(p => ({ id: p.id, verbo: p.verbo, desc: p.desc, stato: p.stato, passo: passoOra(st, p) })),
      verbi: verbiPer(st, n), luoghi: luoghiPer(st, n, text), persone: personePer(st, n, text), storia,
      context: `Ora: ${hhmm(st.t)}, Giorno: ${G.dayName(st.t)}. Luogo: ${G.nearestPlace(n.x, n.y).name}${n.inside ? ', al chiuso' : ''}. Repressione: ${Math.round(st.ris.repr)}.`,
      text,
    };
  }
  Parola.richiestaDialogo = richiestaDialogo;
  const ALIAS_V = { segui: 'seguimi', accompagna: 'seguimi', accompagnami: 'seguimi', vieni: 'seguimi', onda: 'scrivi_onda', scrivi: 'scrivi_onda', portami: 'porta_a', porta_al_giocatore: 'porta_a', tieni_d_occhio: 'pedina', segui_persona: 'pedina', aspettami: 'aspetta', avvisami: 'avvisa', unirsi: 'unisciti', lascia_stare: 'annulla', vendimi: 'compra_da', torna_a_casa: 'basta', mercato_nero: 'mercato', volantinaggio: 'volantina', accetta_soldi: 'ricevi_soldi' };
  const quandoDa = q => { if (!q) return null; const t = norm(q); if (/stanotte|notte/.test(t)) return 'stanotte'; if (/stasera/.test(t)) return 'stasera'; if (/adesso|subito|ora$/.test(t)) return 'adesso'; const m = t.match(/(\d{1,2})[:.](\d{2})/); return m ? { ora: `${m[1]}:${m[2]}`, giorno: /domani/.test(t) ? 'domani' : 'oggi' } : null; };
  // l'intento dell'IA nella forma del motore: gli id si controllano tutti (un posto o una persona inventati → si chiede)
  function intentoDaIA(st, n, x, text) {
    if (!x || typeof x !== 'object' || !x.verbo) return null;
    let v = norm(x.verbo).replace(/[\s-]+/g, '_'); v = ALIAS_V[v] || v;
    const a0 = Object.assign({}, x.args && typeof x.args === 'object' ? x.args : x); delete a0.verbo; delete a0.quando; delete a0.args; delete a0.chi;
    const I = mk(v, {}, { fonte: 'ia', inventato: [] });
    for (let [k, val] of Object.entries(a0)) {
      if (val === null || val === undefined || val === '') continue;
      if (k === 'dove') k = 'luogo';
      if (k === 'luogo' || (k === 'da' && v !== 'porta_a') || k === 'base') {
        const id = String(val).trim(), b = st.ris.bases.find(q => q.alive && (q.id === id || norm(q.name) === norm(id)));
        if (b) { I.args[k] = b.id; if (k === 'luogo') I.luogoNome = b.name; continue; }
        if (PLACES[id]) { I.args[k] = id; if (k === 'luogo') I.luogoNome = PLACES[id].name; continue; }
        if (/^(qui|qua)$/.test(norm(id))) { if (k === 'luogo') { const L = trovaLuogo(st, 'qui', n); I.args.luogo = L.id; I.luogoNome = L.name; } continue; }
        const L = trovaLuogo(st, id, n);
        if (L && L.dubbio) { I.dubbio = { cosa: 'luogo', scelte: L.dubbio.map(q => q.id), nomi: L.dubbio.map(q => q.name) }; continue; }
        if (L) { I.args[k] = L.base ? L.base.id : L.id; if (k === 'luogo') I.luogoNome = L.name; continue; }
        if (k === 'luogo') I.inventato.push('luogo'); continue;
      }
      if (k === 'persona' || k === 'chi' || (k === 'a' && v === 'porta_a') || k === 'who') {
        const id = String(val).trim(); if (/^(player|giocatore|nino|me|a me)$/i.test(id) || norm(id) === norm(NAME())) { I.args[k === 'a' ? 'a' : 'persona'] = 'player'; continue; }
        const k2 = G.byId(st, id) || trovaPersona(st, id, n, true);
        if (k2 && !k2.dead) { I.args[k === 'a' ? 'a' : 'persona'] = k2.id; I.personaNome = k2.first; } else I.inventato.push('persona');
        continue;
      }
      if (k === 'cosa' || k === 'oggetto') {
        const c2 = (Og() && Og().CAT[val]) ? { cat: 'ogg', id: val, nome: Og().CAT[val].nome, q: 1, frase: art(Og().CAT[val].nome, 'indet') } : cosa(String(val), v === 'ricevi' ? ['ogg'] : ['ogg', 'res', 'az']);
        if (!c2) { I.inventato.push('cosa'); continue; }
        if (v === 'ricevi') { I.args.oggetto = c2.id; I.args.cosa = c2; } else { I.args.cosa = c2.id; I.args._c = c2; }
        if (!a0.quanto && c2.q) I.args.quanto = c2.q;
        continue;
      }
      if (k === 'risorsa') { I.args.risorsa = RS.resolveRes(String(val)) || String(val); continue; }
      if (['ore', 'minuti', 'quanto'].includes(k)) { const q = parseFloat(val); if (isFinite(q)) I.args[k] = clamp(q, 0, k === 'minuti' ? 120 : k === 'ore' ? 12 : 500); continue; }
      if (k === 'furtivo' || k === 'corri') { if (val === true || /^(si|sì|true|1)$/i.test(String(val))) { I.args[k] = true; I.modi[k] = true; } continue; }
      I.args[k] = typeof val === 'object' ? val : String(val).slice(0, 80);
    }
    if (v === 'avvisa' && !I.args.se) I.args.se = 'grigi';
    if (['ore'].includes('ore') && RS.VERBS[v] && /ore/.test(RS.VERBS[v].args || '') && !I.args.ore) I.args.ore = v === 'pedina' ? 1 : 3;
    I.quando = quandoDa(x.quando);
    I.testo = text;
    return I;
  }
  function capisciIA(st, n, text, ia) {
    const I = intentoDaIA(st, n, ia.intento, text);
    const altri = (Array.isArray(ia.altri_intenti) ? ia.altri_intenti : []).slice(0, 3).map(x => intentoDaIA(st, n, x, text)).filter(x => x && (!I || x.verbo !== I.verbo));
    return { intento: I, altri };
  }
  Parola.intentoDaIA = intentoDaIA;
  // la battuta dell'IA vale solo se corrisponde all'esito vero e al motivo vero; mai un sì fuori da «accetta»
  const MOTIVI_VOL = new Set(['never', 'paura', 'pericolo', 'rancore', 'legge', 'fiducia', 'stanco', 'fame', 'prova', 'non_membro', 'soldi', 'furtivo', 'notte', 'quando', 'nemico', 'non_so', 'lavoro', 'ia_domanda']);
  function lineaIA(st, n, ia, E, I) {
    const R0 = ia && ia.risposte; if (!R0 || typeof R0 !== 'object') return null;
    const line = R0[E.esito]; if (!line || typeof line !== 'string' || !line.trim()) return null;
    if (E.esito !== 'accetta' && promette(line)) { S(st).stats.guardia++; S(st).stats.guardiaIA = (S(st).stats.guardiaIA || 0) + 1; return null; }
    const tipo = E.motivo && E.motivo.tipo;
    if (E.esito !== 'accetta' && E.esito !== 'niente' && tipo && !MOTIVI_VOL.has(tipo)) {
      // un motivo di fatto (manca la vernice, il posto non si sa): la battuta dell'IA vale solo se il motore gliel'aveva detto
      const f = (S(st).iaReq[n.id] || {}).fatt || {}, fv = I && f[I.verbo];
      if (!fv || /^ok/.test(fv)) return null;
    }
    return clip(line, 170);
  }
  function parola1Di(resp, raw) {
    if (resp && typeof resp === 'object' && (resp.versione === 'parola1' || resp.risposte || Array.isArray(resp.mandati))) return resp;
    if (raw) { try { const j = typeof raw === 'string' ? JSON.parse(raw) : raw; if (j && typeof j === 'object' && (j.versione === 'parola1' || j.risposte || Array.isArray(j.mandati))) return j; } catch (e) { } }
    return null;
  }
  Parola.CFG = { ia: null };   // nelle prove: una funzione (payload) → risposta finta, al posto del server
  const menteOf = () => (typeof Mente !== 'undefined' ? Mente : typeof window !== 'undefined' ? window.Mente : null);
  const iaAttiva = () => { const Me = menteOf(); return !!(Parola.CFG.ia || (Me && Me.state && Me.state.active)); };
  // banda e mandato non passano da Mente.call (là solo il dialogo ha la precedenza): si chiama il server direttamente
  async function chiamaIA(payload) {
    if (Parola.CFG.ia) { try { return await Parola.CFG.ia(payload); } catch (e) { return null; } }
    const Me = menteOf(); if (!Me || !Me.state || !Me.state.active || typeof fetch === 'undefined') return null;
    if (payload.kind === 'dialogo') return Me.call(payload);
    try {
      Me.state.chatUntil = Date.now() + 25000;
      const res = await fetch('/api/mente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) return null; const b = await res.json(); return (b && b.data) || null;
    } catch (e) { return null; }
  }
  Parola.chiamaIA = chiamaIA;
  // la Mente: il dialogo manda lo schema parola1, e la risposta torna in RS.applyReply (sopra) con la versione
  function installaMente() {
    const Me = menteOf(); if (!Me || Me.__parola) return; Me.__parola = true;
    const d0 = Me.dialog; Me.__dialog0 = d0;
    Me.dialog = async function (st, n, text) {
      const mand = capisciMandato(st, text).length > 0;
      const ai = await chiamaIA(mand ? richiestaMandato(st, n, text) : richiestaDialogo(st, n, text));
      if (!ai || typeof ai !== 'object') return null;
      ai.versione = 'parola1';
      if (!ai.risposta) ai.risposta = (ai.risposte && (ai.risposte.niente || ai.risposte.accetta)) || '';
      if (n.pop) note(st, n, `ha parlato con ${NAME()}: ${clip(ai.memoria || text, 110)}`, 'info', { w: .5, tag: 'giocatore', who: 'player' });
      return ai;
    };
  }
  Parola.installaMente = installaMente;
  // la strada Claude «sample» (§4.3): lo stesso schema, la stessa catena
  const PAROLA1_SAMPLE = `\n\nFORMATO DELLA RISPOSTA (sostituisce quello di sopra): non decidi tu cosa succede, proponi un intento e una battuta per OGNI esito; il motore controlla e sceglie.
Rispondi SOLO con: {"intento": {"verbo": "…", "args": {…}, "quando": null} | null, "altri_intenti": [], "risposte": {"accetta": "…", "rifiuta": "…", "contratta": "…", "chiede": "…", "niente": "…"}, "contro_offerta": null, "domanda": null, "umore": "…", "persuasione": 0, "memoria": "una riga"}.
Nessuna risposta promette cose che non sono nell'intento: mai "ci vado", "te lo porto", "contaci" fuori da "accetta". Usa solo i verbi, i luoghi e le persone elencati.`;
  { const ct0 = RS.chatTurns; RS.chatTurns = function (st, n, text) {
      const T = ct0.apply(this, arguments);
      try { const q = richiestaDialogo(st, n, text); T[0].content += PAROLA1_SAMPLE; T[T.length - 1].content += '\n\n[PER IL MOTORE] ' + JSON.stringify({ volonta: q.volonta, fattibilita: q.fattibilita, impegni: q.impegni, verbi: q.verbi.map(v => v.verbo).join(', '), persone: q.persone }); } catch (e) { }
      return T;
    }; }

  // ================= IL GIRO DEL MOTORE: le promesse vanno avanti da sole =================
  const vista = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  const FAIL_RE = /^(Non ce l'ho fatta|Non riesco|Non l'ho trovato|.* non si fa trovare|La base non c'è più|La radio non c'è più|Non hai più|Non ho)/;
  function esitoTask(st, n, p) {
    const T = p.link.obj, R = st.ris;
    if (n.dead) return ['fallita', 'è morto'];
    if (n.jailedUntil > st.t) return ['fallita', 'l\'hanno preso i Grigi'];
    const fresh = (R.inbox || []).filter(e => e.npc === n.id && (!vista || !vista.has(e)) && e.t >= p.quando.t0);
    const e = fresh[0];
    const dl = n.ris.loyalty - (p._loy === undefined ? n.ris.loyalty : p._loy);
    if (T.__fail) return ['fallita', T.__fail];
    if (n.ris.task && n.ris.task !== T && !e) return ['annullata', 'gli hai dato un altro ordine'];
    if (!e) return [T.quiet ? 'annullata' : 'fatta', ''];
    const fd = st.feed.find(f => f.text === `${nome(n)}: ${e.text}`);
    let ok = fd ? fd.kind !== 'bad' : !FAIL_RE.test(e.text);
    if (Math.abs(dl) > .01 && n.ris.loyalty > 0 && n.ris.loyalty < 1) ok = dl > 0;
    if (/^Da .*persone passate in un'ora/.test(e.text) && !fresh[1]) ok = true;
    return [ok ? 'fatta' : 'fallita', e.text.replace(/^Fatto:\s*/, '')];
  }
  function tick(st, dt) {
    const M = st.parola; if (!M || !st.ris) return;
    for (const p of M.promesse) {
      if (!ACTIVE.includes(p.stato)) continue;
      if (p.chi === 'player') { tickMia(st, p); continue; }
      const n = G.byId(st, p.chi); if (!n) { chiudi(st, p, 'fallita', 'sparito'); continue; }
      if (p.stato === 'attesa' && p.dopo) { if (st.t >= p.quando.at) avviaDopo(st, n, p); continue; }
      if (p.stato === 'accettata' && p.piano_id && !p.link) { if (st.t > p.scadenza) chiudi(st, p, 'fallita', 'il piano non è partito'); continue; }
      const L = p.link || {};
      if (L.tipo === 'task') {
        const T = L.obj;
        if (n.ris.task === T) {
          p.stato = 'in_corso';
          if (T.i !== p._i) { const prev = T.steps[p._i]; p._i = T.i; if (prev && prev.k === 'go' && T.i < T.steps.length && prev.name) passo(st, p, n, 'arrivo', scegli(st, n, 'arrivo', BANCHE.arrivo, { luogo: prev.name })); }
          const s = T.steps[T.i]; if (s && s.shadow) ombra(st, n, T, s, dt);
          if (st.t - (p._dz || -1e9) >= 2) { p._dz = st.t; const gr = grigiVicino(st, n.x, n.y, 15); const pk = 'p:' + G.nearestPlace(n.x, n.y).id; if (gr && st.t - (M.danger[pk] || -1e9) >= 10) { M.danger[pk] = st.t; passo(st, p, n, 'pericolo', scegli(st, n, 'pericolo', BANCHE.pericolo, { grigi: gr === 1 ? 'Uno' : cap1(NUMW[gr] || String(gr)) })); } }
          p._loy = n.ris.loyalty;
        } else {
          let [stato, msg] = esitoTask(st, n, p);
          if (stato === 'fatta' && T.verb === 'pedina') msg = rapportoOmbra(st, T) || msg;
          chiudi(st, p, stato, msg);
        }
      } else if (L.tipo === 'piano') {
        const Ep = L.obj;
        if (n.pop && n.pop.emer === Ep) {
          p.stato = 'in_corso';
          if (Ep.i !== p._i) { const prev = Ep.steps[p._i]; p._i = Ep.i; if (prev && prev.at && /^va |^passa /.test(prev.label) && Ep.i < Ep.steps.length) passo(st, p, n, 'arrivo', scegli(st, n, 'arrivo', BANCHE.arrivo, { luogo: (prev.label.match(/ a (.+)$/) || [])[1] || G.nearestPlace(n.x, n.y).name })); }
        } else if (Ep.__ok) chiudi(st, p, 'fatta', '');
        else chiudi(st, p, Ep.__end === 'annullato' ? 'annullata' : n.jailedUntil > st.t ? 'fallita' : 'fallita', Ep.__why || ({ interrotto: 'è successo qualcosa di più urgente', scaduto: 'ci ha messo troppo', panico: 'si è spaventato', sparito: 'non ha trovato quello che cercava' }[Ep.__end] || 'non è andata'));
      } else if (L.tipo === 'with') {
        const W = L.obj;
        if (n.pop && n.pop.with === W && st.t <= W.until) p.stato = 'in_corso';
        else if (st.t >= W.until - 1) chiudi(st, p, 'fatta', '');
        else chiudi(st, p, n.dead || n.jailedUntil > st.t ? 'fallita' : 'annullata', n.jailedUntil > st.t ? 'l\'hanno preso i Grigi' : '');
      } else if (L.tipo === 'appt') {
        const ap = L.obj;
        if (n.pop && n.pop.appt === ap) continue;
        if (st.t < ap.t + 45) { chiudi(st, p, 'annullata', 'l\'appuntamento è saltato'); continue; }
        chiudi(st, p, ap.nCame ? 'fatta' : n.dead || n.jailedUntil > st.t ? 'fallita' : 'rotta', ap.nCame ? `è venut${o(n)} a ${ap.label}` : `non è venut${o(n)} a ${ap.label}`);
      } else if (L.tipo === 'veglia') { /* tickVeglie */ }
      if (ACTIVE.includes(p.stato) && p.scadenza && st.t > p.scadenza && L.tipo !== 'appt' && L.tipo !== 'veglia') { stopLink(st, n, p); chiudi(st, p, 'scaduta', 'non ci è arrivato in tempo'); }
    }
    tickVeglie(st);
    tickPiani(st); tickMandati(st); if (Parola.rapina) Parola.rapina.tick(st);
    if (vista && st.ris.inbox) st.ris.inbox.forEach(e => vista.add(e));
  }
  // la promessa «dopo»: all'ora detta la cosa riparte da sola (si rifà la verifica: se adesso non si può, fallisce col motivo)
  function avviaDopo(st, n, p) {
    const I = p.intento; if (!I) { chiudi(st, p, 'fallita', 'non si ricordava più cosa'); return; }
    const E = verifica(st, n, I);
    // un impedimento che passa (stanco, fame, occupato, la luce del giorno): si riprova fra mezz'ora, fino alla scadenza
    if (E.esito !== 'accetta' && E.motivo && ['stanco', 'fame', 'occupato', 'lavoro', 'notte', 'pericolo', 'quando'].includes(E.motivo.tipo) && st.t < p.scadenza - 30) { p.quando.at = st.t + 30; p.rinvii = (p.rinvii || 0) + 1; if (n.ris && n.ris.task && n.ris.task.verb === 'dormi' && n.ris.fatigue < .3) n.ris.task = null; if (E.motivo.tipo === 'stanco' && n.ris && n.ris.member && !n.ris.task) RS.assign(st, n, 'dormi', { ore: 2 }, 'parola'); if (E.motivo.tipo === 'fame' && n.ris && n.ris.member && !n.ris.task) RS.assign(st, n, n.ris.sete > n.ris.fame ? 'bevi' : 'mangia', {}, 'parola'); return; }
    if (E.esito !== 'accetta') { chiudi(st, p, 'fallita', E.motivo ? E.motivo.testo : 'non si può'); return; }
    const r0 = impegna(st, n, I, E, p.canale); const q = r0 && r0.promessa;
    if (!r0 || !r0.ok || !q) { chiudi(st, p, 'fallita', (r0 && r0.msg) || 'non è partita'); return; }
    // la promessa nuova prende il posto di quella vecchia (stesso id, stessa parola data)
    const M = S(st), i = M.promesse.indexOf(q); if (i >= 0) M.promesse.splice(i, 1); M.stats.promesse--;
    Object.assign(p, { stato: q.stato, link: q.link, desc: q.desc, scadenza: q.scadenza, dove: q.dove, _loy: q._loy, _i: q._i, dopo: false, avviata: st.t });
    if (q.link && q.link.obj) { q.link.obj.pid = p.id; }
    passo(st, p, n, 'parte', cap1(q.desc) + '. Come promesso.', { forza: true });
  }
  function descIntento(st, n, I) { try { const pl = RS.plan(st, n, I.verbo, I.args || {}); if (pl && pl.desc) return pl.desc; } catch (e) { } return (RS.VERBS[I.verbo] || {}).desc || I.verbo; }
  // le promesse del giocatore: si mantengono coi fatti (la roba arriva, l'appuntamento, l'impresa)
  function tickMia(st, p) {
    const L = p.link, n = G.byId(st, p.a);
    if (L && L.tipo === 'appt') {
      const ap = L.obj; if (n && n.pop && n.pop.appt === ap) return;
      if (st.t < ap.t + 45) { chiudi(st, p, 'annullata', 'saltato'); return; }
      chiudi(st, p, ap.pCame ? 'fatta' : 'rotta', ap.pCame ? 'sei andato' : 'non sei andato'); return;
    }
    if (L && L.tipo === 'impresa') {
      const Ei = L.obj; if (Ei.status === 'annullata') { chiudi(st, p, 'annullata', 'l\'impresa è saltata'); return; }
      if (Ei.status === 'fatta' || Ei.status === 'fallita') chiudi(st, p, Ei.here && Ei.here.player ? 'fatta' : 'rotta', Ei.here && Ei.here.player ? 'sei venuto' : 'non ti sei visto');
      return;
    }
    const C = p.condizione;
    if (C && C.tipo === 'risorsa' && RS.totalRes(st, C.id) >= C.quanto) chiudi(st, p, 'fatta', 'la roba è arrivata');
    else if (C && C.tipo === 'missione' && n && n.ris && n.ris.missionDone) chiudi(st, p, 'fatta', 'missione compiuta');
    if (ACTIVE.includes(p.stato) && p.scadenza && st.t > p.scadenza) chiudi(st, p, 'scaduta', 'non l\'hai fatto in tempo');
  }
  // il palo: ogni minuto di gioco guarda se la condizione è vera
  function tickVeglie(st) {
    const M = S(st);
    M.veglie = M.veglie.filter(V => {
      const p = M.promesse.find(x => x.id === V.pid), n = G.byId(st, V.chi);
      if (!p || !ACTIVE.includes(p.stato) || !n) return false;
      if (n.dead || n.jailedUntil > st.t) { chiudi(st, p, 'fallita', 'l\'hanno preso'); return false; }
      if (st.t - (V.lastT || -1e9) < 1) return true; V.lastT = st.t;
      const cx = V.task && n.ris.task === V.task && dist(n.x, n.y, V.x, V.y) > 30 ? null : V;
      let hit = 0;
      if (cx) {
        if (V.se === 'grigi') hit = grigiVicino(st, V.x, V.y, 18);
        else if (/^arriva:/.test(V.se)) { const k = G.byId(st, V.se.slice(7)); hit = k && !k.inside && dist(k.x, k.y, V.x, V.y) < 15 ? 1 : 0; }
      }
      if (hit) {
        p.stato = 'in_corso';
        const txt = V.se === 'grigi' ? scegli(st, n, 'veglia', BANCHE.veglia, { luogo: V.name, grigi: hit === 1 ? 'Uno' : cap1(NUMW[hit] || String(hit)) }) : `${G.nameOf(st, V.se.slice(7))} è arrivato a ${V.name}.`;
        passo(st, p, n, 'veglia', txt, { forza: true, kind: 'bad' });
        if (V.task && n.ris.task === V.task) n.ris.task = null;
        chiudi(st, p, 'fatta', txt, true);
        return false;
      }
      if (st.t > V.fino) {
        if (V.task && n.ris.task === V.task) n.ris.task = null;
        passo(st, p, n, 'fatta', scegli(st, n, 'veglia_vuota', BANCHE.veglia_vuota, { luogo: V.name }), { forza: true });
        chiudi(st, p, 'fatta', 'nessun Grigio', true);
        return false;
      }
      return true;
    });
  }
  // la pedina: resta a 8-12 metri, si segna dove va e con chi parla
  function ombra(st, n, T, s, dt) {
    const tn = G.byId(st, s.shadow); if (!tn || tn.dead) return;
    const d = dist(n.x, n.y, tn.x, tn.y);
    // l'ora della pedina comincia quando l'ha raggiunto; se in due ore non lo trova, lascia stare
    if (!T.__preso) { if (d < 14) { T.__preso = st.t; T.stepT = st.t; } else if (st.t - T.started > 120) { T.__fail = `Non l'ho trovato, ${tn.first}. Sparito.`; n.ris.task = null; return; } }
    const walk = (x, y, sp) => { if (!n.path || !n.path.length || !n.goal || dist(n.goal.x, n.goal.y, x, y) > 1.5) { G.goTo(n, x, y, 1.4); if (!n.path.length) { n.path = [{ x, y }]; n.goal = { x, y }; } } G.stepAlong(n, sp, dt); };
    // lontano dal giocatore la gente si sposta a salti (Popolo, Azioni) e il salto conta già il tempo di strada: chi pedina
    // camminava con lui, quindi arriva insieme (un minuto dopo); la prima volta, invece, deve fare tutta la strada
    const far = dist(n.x, n.y, st.player.x, st.player.y) > 45 && dist(tn.x, tn.y, st.player.x, st.player.y) > 45;
    if (d > 11 && far) {
      if (!T.__arr) T.__arr = st.t + (T.__preso ? 1 : 1 + d / 11);
      if (st.t >= T.__arr) { T.__arr = 0; const q = puntoVicino(tn.x, tn.y, 8, Math.atan2(n.y - tn.y, n.x - tn.x)); n.x = q.x; n.y = q.y; n.path = []; n.goal = null; n.inside = false; }
    } else if (d > 11) { T.__arr = 0; walk(tn.x, tn.y, d > 25 ? 3.4 : 1.9); }
    else { n.speedNow = 0; n.path = []; n.goal = null; n.face = Math.atan2(tn.y - n.y, tn.x - n.x); }
    if (T.__preso && st.t - (T.__shT || -1e9) >= 5) {
      T.__shT = st.t; const pl = G.nearestPlace(tn.x, tn.y).name; T.__posti = T.__posti || []; if (T.__posti[T.__posti.length - 1] !== pl) T.__posti.push(pl);
      T.__chi = T.__chi || {}; st.npcs.forEach(k => { if (k !== tn && k !== n && !k.dead && !k.passante && !k.inside && dist(k.x, k.y, tn.x, tn.y) < 3) T.__chi[k.id] = (T.__chi[k.id] || 0) + 1; });
      T.__d = T.__d || []; T.__d.push(Math.round(d * 10) / 10);
    }
  }
  // un punto dove si può stare, a circa r metri da (x, y), dalla parte di chi arriva
  function puntoVicino(x, y, r, ang) {
    for (let k = 0; k < 48; k++) { const a = ang + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .27, rr = r + Math.floor(k / 16) * 2; const qx = x + Math.cos(a) * rr, qy = y + Math.sin(a) * rr; if (G.walkM(qx, qy)) return { x: qx, y: qy }; }
    return { x, y };
  }
  function rapportoOmbra(st, T) {
    const P0 = (T.__posti || []).slice(-4), C0 = Object.entries(T.__chi || {}).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => G.nameOf(st, id));
    if (!P0.length) return '';
    return `È stato a ${P0.join(', ')}.${C0.length ? ` L'ho visto con ${C0.join(' e ')}.` : ' Non ha parlato con nessuno.'}`;
  }
  { const s0 = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (s0) s0(st, dt); try { tick(st, dt); annunciFix(st); } catch (e) { if (!tick.err) { tick.err = 1; if (typeof console !== 'undefined') console.warn('[Parola]', e); } } }; }
  Parola.tick = tick;

  // ================= LE PAROLE DETTE DA SOLE: si dicono solo se la cosa parte =================
  const OFFRI = new Set(['Offro io, dai.', 'Questa la pago io, zio.', 'Dai, ti offro una birra.', 'Ti offro qualcosa, dai.', 'Questo lo pago io.', 'Offro io. Coi soldi che mi devi.']);
  const REGALA = new Set(['Tieni, è per te.', 'Prendi, fra. Non chiedere.', 'Tieni. Non chiedere da dove viene.']);
  const CHIAMA = 'Vado al telefono, chiamo la Guardia!';
  const giftable = n => Object.keys((n.pop && n.pop.inv) || {}).some(x => x !== 'roba' && x !== 'refurtiva' && (n.pop.inv[x] || 0) > 0);
  function puoChiamare(st, n) {
    const A0 = Az(); if (!A0 || !n.pop || n.dead || n.jailedUntil > st.t) return false;
    if (n.pop.emer && (n.pop.emer.prio || 0) > 2) return false;
    try { const steps = A0.VERBS.telefona.plan(st, n, { a: 'guardia' }); return !!(steps && steps.length); } catch (e) { return false; }
  }
  { const say1 = G.say;
    G.say = function (st, n, text, d) {
      if (st && n && n.pop && typeof text === 'string' && n !== st.player) {
        const M = S(st);
        if (OFFRI.has(text) && (n.pop.money || 0) < 2) { M.stats.annunci.offri++; text = pickR(st, BANCHE.secco); }
        else if (REGALA.has(text) && !giftable(n)) { M.stats.annunci.regala++; return; }
        else if (text === CHIAMA) { if (!puoChiamare(st, n)) { M.stats.annunci.chiama++; n.__pChiama = { t: st.t, ok: false }; text = pickR(st, ['No no no…', 'Io non ho visto niente!', 'Via, via di qui!']); } else n.__pChiama = { t: st.t, ok: true }; }
      }
      return say1.apply(this, [st, n, text, d]);
    };
  }
  // il messaggio del membro e la nota nel diario seguono quello che è successo davvero
  function annunciFix(st) {
    for (const n of st.npcs) {
      const F = n.__pChiama; if (!F) continue;
      if (st.t - F.t > 3) { n.__pChiama = null; continue; }
      const nuovo = F.ok ? 'Sto chiamando la Guardia, girate al largo.' : 'Non venite da queste parti.';
      const fix = s => (typeof s === 'string' && s.includes('Ho chiamato la Guardia, girate al largo.') ? s.replace('Ho chiamato la Guardia, girate al largo.', nuovo) : s);
      if (st.ris) { (st.ris.chats[n.id] || []).forEach(m => { if (m.t >= F.t - 1) m.text = fix(m.text); }); (st.ris.inbox || []).forEach(m => { if (m.npc === n.id && m.t >= F.t - 1) m.text = fix(m.text); }); }
      (st.feed || []).forEach(f => { f.text = fix(f.text); });
      if (!F.ok && n.pop && n.pop.diary) n.pop.diary.forEach(e => { if (e.t >= F.t - 1 && typeof e.text === 'string' && e.text.includes('ha chiamato la Guardia')) e.text = e.text.replace('ha chiamato la Guardia', `voleva chiamare la Guardia, ma non ce l'ha fatta`); });
    }
  }

  // ================= LA CHAT: la strada senza IA passa da Parola.rispondi =================
  const fb0 = RS.fallback, ar0 = RS.applyReply;
  RS.fallback = function (st, n, text) { const r = fb0.apply(this, arguments); r.__parola = true; return r; };
  RS.applyReply = function (st, n, text, resp, raw) {
    if (resp && resp.__parola) return rispondi(st, n, text);
    const P1 = parola1Di(resp, raw); if (P1) return Array.isArray(P1.mandati) ? rispondi(st, n, text, { iaMandato: P1 }) : rispondi(st, n, text, { ia: P1 });
    // la strada con l'IA (Claude o la Mente) resta com'è, ma il cane da guardia non lascia passare un sì senza fatto
    const out = ar0.apply(this, arguments);
    try {
      const anyOk = (out.outcomes || []).some(x => x.ok && !['ricevi_soldi', 'racconta'].includes(x.verb));
      if (!anyOk && promette(out.say)) {
        const ch = st.ris.chats[n.id] || [], m = ch.slice().reverse().find(x => x.role === 'npc' && !x.sys && x.text === out.say);
        const E = (out.outcomes || []).find(x => x.ok === false);
        const line = E ? scegli(st, n, 'rifiuta:impossibile', BANCHE.rifiuta.impossibile, { motivo: low1(String(E.msg || '').replace(/^(Rifiuta|Ci sta pensando):\s*/, '').replace(/[.\s]+$/, '')) }) : scegli(st, n, 'niente:_', BANCHE.niente._);
        if (m) m.text = line; out.say = line; S(st).stats.guardia++;
      }
    } catch (e) { }
    return out;
  };


  // ================= LA CHAT DELLA BANDA (§2.7) =================
  // Un thread `banda` in st.ris.chats: chi è chiamato in causa risponde, nell'ordine di chi lo fa volentieri, chi contratta, chi
  // rifiuta (al massimo tre messaggi; chi dorme o è in cella non risponde, ed è vero). Le obiezioni sono opinioni: non bloccano,
  // ma tolgono .1 alla volontà di chi esegue se ha poca lealtà e chi obietta ne ha di più. I piani con i ruoli (palo, scassa,
  // porta, autista, voce) diventano promesse con lo stesso piano_id, un ritrovo, l'attesa di tutti (sync) e il palo che avvisa.
  const bandaChat = st => (st.ris.chats.banda = st.ris.chats.banda || []);
  function bandaPosta(st, da, text, extra) {
    const ch = bandaChat(st), M = S(st);
    ch.push(Object.assign({ role: da === 'player' ? 'user' : da === 'sys' ? 'sys' : 'npc', da, text, t: st.t }, extra || {}));
    if (ch.length > 140) ch.splice(0, ch.length - 140);
    if (da !== 'player') M.bandaNuovi = (M.bandaNuovi || 0) + 1;
    if (Parola.UI && Parola.UI.banda) try { Parola.UI.banda(st); } catch (e) { }
  }
  Parola.bandaPosta = bandaPosta;
  const TUTTI_RE = /^(tutti|ragazzi|raga|voi|chi puo|gente|banda|compagni|ragazze)\b/;
  const disponibile = (st, m) => m && !m.dead && !(m.jailedUntil > st.t) && !(m.ris.task && m.ris.task.verb === 'dormi') && m.ris.fatigue < .93;
  function membroDaNome(st, w) { w = norm(w); if (w.length < 3) return null; return RS.members(st).find(m => norm(RS.battle(m) || '') === w || norm(m.first) === w || m.id === w) || null; }
  // «Cono, l'onda al caruggio. Divisa, sorveglia la caserma.» → [{ chi: [cono], testo }, { chi: [divisa], testo }]
  function segmenti(st, text) {
    const parts = String(text).split(/(?<=[.!?;])\s+/).filter(x => x.trim()), out = [];
    for (const p of parts) {
      let chi = null, body = p;
      const m = p.match(/^\s*@?([A-Za-zÀ-ÿ']+)\s*[,:]\s*([\s\S]*)$/) || p.match(/^\s*@([A-Za-zÀ-ÿ']+)\s+([\s\S]*)$/);
      if (m) { const w = norm(m[1]); if (TUTTI_RE.test(w)) { chi = 'tutti'; body = m[2]; } else { const k = membroDaNome(st, w); if (k) { chi = [k]; body = m[2]; } } }
      if (!chi) { const w0 = norm(p).split(' ')[0]; if (TUTTI_RE.test(w0)) { chi = 'tutti'; body = p.replace(/^\s*\S+\s*[,:]?\s*/, ''); } else { const k = membroDaNome(st, w0); if (k && !/^(va|vai|fai|dai|sta)$/.test(w0)) { chi = [k]; body = p.replace(/^\s*\S+\s*[,:]?\s*/, ''); } } }
      if (!chi && out.length) { out[out.length - 1].testo += ' ' + p; continue; }
      out.push({ chi, testo: body.trim() });
    }
    return out;
  }
  // chi è più adatto, se il giocatore non ha nominato nessuno: volontà, gusti, vicinanza al posto, poca stanchezza
  function migliorePer(st, I, escl) {
    const L = RS.members(st).filter(m => disponibile(st, m) && !(escl || []).includes(m));
    let best = null, bs = -1e9;
    L.forEach(m => {
      const w = RS.will(st, m, I.verbo, I.args || {}), c = RS.card(m), tp = I.args && PLACES[I.args.luogo];
      const sc = w.s + (c.likes && c.likes.includes(I.verbo) ? .2 : 0) - (tp ? dist(m.x, m.y, tp.x, tp.y) / 900 : 0) - m.ris.fatigue * .3 - (impegnato(st, m) ? .5 : 0);
      if (sc > bs) { bs = sc; best = m; }
    });
    return best;
  }
  const OBIEZ = {
    pericolo: ['{chi}, con i Grigi in giro? Ci vai e ci porti dietro tutti.', 'Io non ci andrei. Ci sono troppi Grigi da quelle parti.'],
    paura: ['Io dico di no. Se va male, la paghiamo tutti.', 'Non mi piace. Non mi piace per niente.'],
    legge: ['Roba così ci mette tutti in mezzo. Io non la farei.', 'Così diventiamo ladri, non Risacca.'],
    prudenza: ['{cosa} adesso? La linea è prudenza, o me lo sono sognato?', 'Avevamo detto prudenza. Questo non è prudenza.'],
    never: ['Questa io non la farei mai. Pensaci, {chi}.'],
  };
  function obiezioneDi(st, m, I, exec) {
    const E = verifica(st, m, I), V = RS.VERBS[I.verbo] || {};
    let tipo = null;
    if (st.ris.linea === 'prudenza' && (V.risk || 0) >= .3 && (E.esito !== 'accetta' || m.tr.cor < .6)) tipo = 'prudenza';
    else if ((E.esito === 'rifiuta' || E.esito === 'contratta') && E.motivo && ['pericolo', 'paura', 'legge', 'never'].includes(E.motivo.tipo)) tipo = E.motivo.tipo;
    if (!tipo) return null;
    return { chi: m.id, tipo, testo: riempi(pickR(st, OBIEZ[tipo]), { chi: exec ? nome(exec) : '', cosa: cap1((RS.VERBS[I.verbo] || {}).label || I.verbo) }) };
  }
  const spia = (st, m) => { const c = RS.card(m); return !!(c.informer || (m.pop && m.pop.giro === 'orecchio')); };
  // decisione 3: chi lavora per gli Orecchi può dire di sì e tradire (una volta per partita a testa)
  function tradisce(st, m, p, cosaDice) {
    const M = S(st); if (!spia(st, m) || M.tradito[m.id]) return false;
    M.tradito[m.id] = st.t; if (p) p.tradimento = true;
    st.ris.repr = clamp(st.ris.repr + 5, 0, 100);
    const b = st.ris.bases.filter(x => x.alive).sort((a, c) => dist(a.x, a.y, m.x, m.y) - dist(c.x, c.y, m.x, m.y))[0]; if (b) b.expo = clamp(b.expo + .2, 0, 1);
    const cop = st.npcs.find(c => c.cop && !c.dead); if (cop) G.addMemory(st, cop, { eventId: 'soffiata' + st.t, type: 'aggressione', actor: 'player', place: cosaDice || 'la Risacca', t: st.t, conf: .6, source: 'denuncia', via: [m.first] });
    note(st, m, `ha detto agli Orecchi: ${cosaDice || 'cosa sta preparando la Risacca'}`, 'shady', { w: .6, tag: 'tradimento' });
    return true;
  }
  // i Grigi mandati dove serve (la soffiata, l'allarme di una rapina): lontano dal giocatore arrivano a salti
  function mandaGrigi(st, x, y, k) {
    const L = st.npcs.filter(c => c.cop && !c.dead && !c.inside && !(c.jailedUntil > st.t)).sort((a, b) => dist(a.x, a.y, x, y) - dist(b.x, b.y, x, y)).slice(0, k || 2);
    L.forEach((c, i) => { const far = dist(c.x, c.y, st.player.x, st.player.y) > 60; if (far) { const q = puntoVicino(x, y, 6 + i * 3, i * 2.1); c.x = q.x; c.y = q.y; c.path = []; c.goal = null; } else { try { G.goTo(c, x, y); } catch (e) { } } c.wait = Math.max(c.wait || 0, 20); });
    return L.length;
  }
  // la roba di un ordine: un segmento → (membro, intento)
  function ordiniDa(st, text, ia) {
    const segs = segmenti(st, text), out = [];
    segs.forEach(sg => {
      let chi = sg.chi;
      const pseudo = chi && chi !== 'tutti' ? chi[0] : RS.members(st)[0];
      if (!pseudo) return;
      const C = capisci(st, pseudo, sg.testo); const I = C.intento;
      if (chi === 'tutti') { RS.members(st).forEach(m => out.push({ m, I: I ? capisci(st, m, sg.testo).intento : null, tutti: true, testo: sg.testo })); return; }
      if (!chi) { if (!I) { out.push({ m: null, I: null, testo: sg.testo }); return; } const m = migliorePer(st, I); if (m) out.push({ m, I: capisci(st, m, sg.testo).intento, scelto: true, testo: sg.testo }); return; }
      out.push({ m: chi[0], I, testo: sg.testo });
    });
    return out;
  }
  // il piano: «Stanotte l'Emporio: Divisa fa il palo, Candela apre, Cono porta.» o «stanotte l'Emporio, organizzatevi»
  const PIANO_RE = /\b(colpo|piano|organizzatevi|organizziamoci|stanotte (l|il|la|al|all|alla|da|dal|in)\b|fa il palo|fai il palo|apre|scassa|guida|fa l autista)/;
  function bottegaDa(st, text) {
    const E = Eco(); if (!E || !E.eco) return null; const t = norm(text);
    let best = null, bs = 0;
    Object.values(E.eco(st).shops).forEach(Sh => { if (!Sh.t || Sh.black) return; const w = toks(Sh.t.label).filter(x => x.length >= 4 && !STOPL.has(x)); const m = w.filter(x => new RegExp(`\\b${x}\\b`).test(t)); const sc = m.reduce((a, x) => a + x.length, 0) + (m.length === w.length ? 20 : 0); if (m.length && sc > bs) { bs = sc; best = Sh; } });
    return best ? { x: best.t.x, y: best.t.y, name: best.t.label, shop: best.k, emporio: !!best.emporio, Sh: best } : null;
  }
  const RUOLI = ['scassa', 'palo', 'porta', 'autista', 'voce'];
  const RUOLO_RE = { palo: /\b(fa|fai|faccia) (il|da) palo\b|\bpalo\b/, scassa: /\b(apre|apri|scassa|scassina|forza|entra)\b/, porta: /\b(porta|porti|carica|prende la roba)\b/, autista: /\b(guida|autista|vespa|macchina)\b/, voce: /\b(voce|volantin|racconta in giro)\b/ };
  const mezzoDi = (st, m) => st.vehicles.find(v => v.owner === m.id && !v.wreck && !v.hidden) || null;
  function ruoliDa(st, text) {
    const out = [];
    String(text).split(/[,;]|\be\b/).forEach(part => { const w = norm(part).split(' ').filter(Boolean); for (let i = 0; i < w.length; i++) { const m = membroDaNome(st, w[i]); if (!m) continue; const r = RUOLI.find(k => RUOLO_RE[k].test(norm(part))); if (r && !out.some(x => x.chi === m.id)) out.push({ chi: m.id, ruolo: r }); break; } });
    return out;
  }
  function assegnaRuoli(st, P, dati) {
    const L = RS.members(st).filter(m => disponibile(st, m)), used = new Set((dati || []).map(x => x.chi)), out = (dati || []).slice();
    const has = r => out.some(x => x.ruolo === r);
    const tool = m => (m.ris.carry.attrezzi || 0) + RS.totalRes(st, 'attrezzi');
    const pick = (r, sc) => { if (has(r)) return; const c = L.filter(m => !used.has(m.id)).map(m => [m, sc(m)]).filter(x => x[1] > -5).sort((a, b) => b[1] - a[1])[0]; if (c) { out.push({ chi: c[0].id, ruolo: r }); used.add(c[0].id); } };
    pick('scassa', m => (tool(m) ? 1 : -1) + m.tr.cor + (m.id === 'beppe' ? .2 : 0) + RS.will(st, m, 'scasso').s);
    pick('palo', m => ((RS.card(m).likes || []).includes('sorveglia') ? .6 : 0) + (1 - m.tr.loq) * .3 + RS.will(st, m, 'sorveglia').s);
    pick('porta', m => ((RS.card(m).likes || []).includes('porta') ? .6 : 0) + (mezzoDi(st, m) ? .3 : 0) + RS.will(st, m, 'porta').s);
    if (L.some(m => !used.has(m.id) && mezzoDi(st, m))) pick('autista', m => (mezzoDi(st, m) ? 1 : -9) + RS.will(st, m, 'porta').s);
    return out;
  }
  const tAlle = (st, hm) => { const d0 = dayIdx(st.t) * 1440, m = hm[0] * 60 + hm[1]; let t = d0 + m; if (t < st.t + 20) t += 1440; return t; };
  function nuovoPiano(st, tipo, tgt, quando, dati) {
    const M = S(st);
    const t = quando === 'adesso' ? st.t + 45 : tAlle(st, [1, 30]);
    const rit = puntoVicino(tgt.x, tgt.y, 30, Math.atan2(st.player.y - tgt.y, st.player.x - tgt.x));
    const P = { id: 'pi' + M.nextP++, tipo, tgt, t, ritrovo: { x: rit.x, y: rit.y, name: G.nearestPlace(rit.x, rit.y).name }, ruoli: [], stato: 'preparato', allarme: false, cassa0: null, merce0: null, visti: 0, born: st.t };
    M.piani.push(P);
    P.ruoli = assegnaRuoli(st, P, dati);
    return P;
  }
  const RUOLO_W = { scassa: 'scasso', palo: 'sorveglia', porta: 'porta', autista: 'porta', voce: 'diffondi_voce' };
  const RUOLO_DESC = { scassa: 'apre', palo: 'fa il palo', porta: 'porta via la roba', autista: 'guida', voce: 'mette in giro la voce' };
  // la verifica di un ruolo: la volontà per un colpo (il palo rischia un po' meno), lo stato duro, l'attrezzo per chi apre
  function verificaRuolo(st, m, P, r, malus) {
    const R = (esito, tipo, testo, extra) => Object.assign({ esito, motivo: tipo ? { tipo, testo, dati: {} } : null, contro: null }, extra || {});
    if (m.jailedUntil > st.t) return R('rifiuta', 'cella', `${m.first} è in cella.`);
    const c = RS.card(m);
    if (c.never && (c.never.includes('ruba') || c.never.includes('scasso')) && P.tipo === 'colpo') return R('rifiuta', 'never', `${m.first} non lo farebbe mai.`);
    if (r === 'scassa' && !((m.ris.carry.attrezzi || 0) + RS.totalRes(st, 'attrezzi'))) return R('chiede', 'oggetto', 'Serve un attrezzo.', { contro: { tipo: 'oggetto', id: 'attrezzi', quanto: 1 } });
    if (r === 'autista' && !mezzoDi(st, m)) return R('rifiuta', 'impossibile', 'Non ha un mezzo.');
    const w = RS.will(st, m, P.tipo === 'colpo' ? 'scasso' : RUOLO_W[r], {});
    // un colpo della banda, chiesto dal giocatore: ci si va insieme (+.3); chi sta fuori rischia meno; Candela coi lucchetti ci sa fare
    let s = w.s + .3 + (r === 'palo' ? .12 : r === 'porta' || r === 'autista' ? .06 : 0) + ((c.likes || []).includes(RUOLO_W[r]) ? .1 : 0) + (r === 'scassa' && m.id === 'beppe' ? .1 : 0) - (malus || 0) + (m.tr.cor > .55 ? .1 : 0) - (m.op && m.op.fear > .3 ? m.op.fear * .5 : 0) - (m.tr.cor < .3 ? .25 : 0);
    if (s >= .2) return R('accetta');
    const tipo = motivoDa(w, m);
    if (s >= 0) return R('contratta', tipo, w.why.join(', ') || 'non è convinto', { contro: r === 'palo' ? { tipo: 'furtivo' } : null });
    return R('rifiuta', tipo, w.why.join(', ') || 'non se la sente');
  }
  // i passi di un ruolo: al ritrovo, aspettare tutti (sync), poi ognuno il suo
  RS.EXT.plan.push((st, n, verb, a) => {
    if (verb !== 'ruolo') return null;
    const P = S(st).piani.find(x => x.id === a.piano); if (!P) return { err: 'Il piano non c\'è più.' };
    const T0 = P.tgt, R0 = P.ritrovo, r = a.ruolo;
    const steps = [{ k: 'go', x: R0.x, y: R0.y, name: R0.name }, { k: 'hold', mins: 30, sync: P.id }];
    if (r === 'scassa') steps.push({ k: 'go', x: T0.x, y: T0.y, name: T0.name }, { k: 'do', fn: 'pa_colpo', piano: P.id });
    else if (r === 'palo') { const q = puntoVicino(T0.x, T0.y, 20, Math.atan2(R0.y - T0.y, R0.x - T0.x)); steps.push({ k: 'go', x: q.x, y: q.y, name: T0.name }, { k: 'hold', mins: 40, palo: P.id }); }
    else if (r === 'porta') { const b = st.ris.bases.find(x => x.alive); steps.push({ k: 'go', x: T0.x, y: T0.y, name: T0.name }, { k: 'hold', mins: 6 }, { k: 'do', fn: 'pa_carica', piano: P.id }); if (b) steps.push({ k: 'go', x: b.x, y: b.y, name: b.name }, { k: 'do', fn: 'deposit', base: b.id }); }
    else if (r === 'autista') steps.push({ k: 'hold', mins: 20 });
    else steps.push({ k: 'go', x: T0.x, y: T0.y, name: T0.name }, { k: 'do', fn: 'rumor', text: `a ${T0.name} è successo qualcosa stanotte` });
    return { steps, desc: `${RUOLO_DESC[r] || r} (${P.tipo === 'colpo' ? 'colpo a ' : ''}${T0.name})` };
  });
  // il colpo vero: la cassa della bottega (Economia), la merce, i testimoni, i Grigi
  RS.EXT.do.pa_colpo = (st, n, T, s) => {
    const P = S(st).piani.find(x => x.id === s.piano); if (!P || P.allarme) return { ok: false, msg: 'Allarme: lascio stare.' };
    if (!G.isNight(st)) return { ok: false, msg: 'C\'era ancora gente, troppo presto.' };
    const Sh = P.tgt.Sh, cops = grigiVicino(st, P.tgt.x, P.tgt.y, 25);
    const palo = P.ruoli.some(x => x.ruolo === 'palo' && x.ok);
    const pOk = clamp(.55 + (palo ? .12 : 0) - cops * .25 - st.ris.repr / 400 + n.tr.cor * .15 + (n.id === 'beppe' ? .1 : 0), .05, .92);
    const ev = { id: st.nextId++, type: 'scasso', actor: n.id, x: P.tgt.x, y: P.tgt.y, t: st.t, sev: G.SEV && G.SEV.scasso || .6, noise: 0, place: P.tgt.name, npcCrime: true }; st.events.unshift(ev); if (st.events.length > 60) st.events.pop();
    let seen = 0; st.npcs.forEach(k => { if (k.dead || k.inside || !k.pop || (k.ris && k.ris.member)) return; const d = dist(k.x, k.y, P.tgt.x, P.tgt.y); if (d > 22) return; G.addMemory(st, k, { eventId: ev.id, type: 'scasso', actor: d < 10 ? n.id : 'ignoto', place: P.tgt.name, t: st.t, conf: d < 10 ? .8 : .5, source: 'visto' }); seen++; });
    P.visti = seen; st.ris.repr = clamp(st.ris.repr + 4 + seen, 0, 100);
    if (rnd(st) > pOk) { if (cops && rnd(st) < .6) { RS.EXT.__jail ? RS.EXT.__jail(st, n) : (n.jailedUntil = st.t + 240); } return { ok: false, msg: 'La serranda non cedeva e faceva un rumore… Siamo scappati.' }; }
    const cash = Sh ? Math.round(Sh.cash * (.4 + rnd(st) * .3)) : Math.round(40 + rnd(st) * 40); if (Sh) Sh.cash -= cash;
    st.ris.cassa += cash; T.earned = (T.earned || 0) + cash; n.ris.carry.merce = (n.ris.carry.merce || 0) + 1; P.bottino = (P.bottino || 0) + cash;
    return { ok: true, msg: `${P.tgt.name}: +${cash}.000 lire e una cassa di merce${seen ? '. Qualcuno ha visto.' : '.'}` };
  };
  RS.EXT.do.pa_carica = (st, n, T, s) => { const P = S(st).piani.find(x => x.id === s.piano); if (!P || P.allarme) return { ok: false, msg: 'Allarme: niente roba.' }; const sc = P.ruoli.map(x => G.byId(st, x.chi)).find(k => k && k.ris.carry.merce); if (sc) { n.ris.carry.merce = (n.ris.carry.merce || 0) + sc.ris.carry.merce; sc.ris.carry.merce = 0; } return { ok: true, msg: sc ? 'Roba caricata.' : 'Non c\'era niente da portare.' }; };
  // ogni minuto: il ritrovo (tutti o dopo 30 minuti con chi c'è), il palo che vede i Grigi, la fine e il riepilogo
  function tickPiani(st) {
    const M = S(st);
    M.piani.forEach(P => {
      if (P.stato === 'finito' || P.stato === 'annullato') return;
      const rs = P.ruoli.filter(x => x.ok).map(x => Object.assign(x, { n: G.byId(st, x.chi) }));
      if (P.stato === 'preparato' && st.t >= P.t - 40) {
        P.stato = 'in_corso'; P.cassa0 = st.ris.cassa;
        rs.forEach(x => { const p = M.promesse.find(q => q.id === x.pid); if (!p || !ACTIVE.includes(p.stato)) return; const res = RS.assign(st, x.n, 'ruolo', { piano: P.id, ruolo: x.ruolo }, 'parola'); if (!res.ok) { chiudi(st, p, 'fallita', res.msg); return; } const T = x.n.ris.task; T.pid = p.id; p.link = { tipo: 'task', id: T.id, obj: T }; p.stato = 'in_corso'; p._loy = x.n.ris.loyalty; p._i = 0; p.scadenza = P.t + 180; });
        if (P.soffiata) mandaGrigi(st, P.tgt.x, P.tgt.y, 2);
        return;
      }
      if (P.stato !== 'in_corso') return;
      // il ritrovo: quando sono tutti lì (o dopo mezz'ora) si parte
      const inSync = rs.filter(x => x.n && x.n.ris.task && x.n.ris.task.steps[x.n.ris.task.i] && x.n.ris.task.steps[x.n.ris.task.i].sync === P.id);
      const vivi = rs.filter(x => x.n && x.n.ris.task && x.n.ris.task.verb === 'ruolo');
      if (inSync.length && inSync.length === vivi.length && !P.partiti) { P.partiti = st.t; inSync.forEach(x => { x.n.ris.task.stepT = st.t - 31; }); bandaPosta(st, 'sys', `${P.tgt.name}: tutti al ritrovo (${P.ritrovo.name}). Si parte.`, { k: 'sync' }); }
      else if (inSync.length && !P.partiti && inSync.some(x => st.t - x.n.ris.task.stepT >= 29)) { P.partiti = st.t; bandaPosta(st, 'sys', `${P.tgt.name}: si parte con chi c'è (${inSync.map(x => nome(x.n)).join(', ')}).`, { k: 'sync' }); }
      // il palo
      const palo = rs.find(x => x.ruolo === 'palo' && x.n && x.n.ris.task && x.n.ris.task.verb === 'ruolo');
      if (palo && P.partiti && !P.allarme && st.t - (P.paloT || -1e9) >= 1) {
        P.paloT = st.t; const g = grigiVicino(st, P.tgt.x, P.tgt.y, 26) || grigiVicino(st, palo.n.x, palo.n.y, 15);
        if (g) {
          P.allarme = st.t; bandaPosta(st, palo.n.id, scegli(st, palo.n, 'veglia', ['Grigi in vista. {grigi}. Via, via!', 'Grigi! {grigi}, qui davanti. Mollate tutto.'], { grigi: g === 1 ? 'Uno' : cap1(NUMW[g] || String(g)) }), { k: 'pericolo' });
          rs.forEach(x => { if (!x.n || x === palo || !x.n.ris.task || x.n.ris.task.verb !== 'ruolo') return; const T = x.n.ris.task; T.__fail = 'il palo ha visto i Grigi: siamo scappati'; const b = st.ris.bases.find(q => q.alive); if (b) RS.assign(st, x.n, 'nasconditi', { base: b.id }, 'parola'); else x.n.ris.task = null; });
          const pp = M.promesse.find(q => q.id === palo.pid); if (pp) { palo.n.ris.task = null; chiudi(st, pp, 'fatta', 'ha dato l\'allarme in tempo', true); }
        }
      }
      // la fine: nessuno ha più il suo ruolo
      if (P.partiti && !vivi.length) {
        P.stato = 'finito';
        const dc = Math.round(st.ris.cassa - P.cassa0), merce = rs.reduce((a, x) => a + ((x.n && x.n.ris.carry.merce) || 0), 0);
        const txt = P.allarme ? `${P.tgt.name}: niente. Il palo ha visto i Grigi in tempo, tutti al coperto.` : P.bottino ? `${P.tgt.name}: +${P.bottino}.000 lire${merce || st.ris.bases.some(b => b.alive && b.stock.merce) ? ' e una cassa di merce' : ''}. Visti da ${P.visti || 0}.` : `${P.tgt.name}: è andata male.${dc < 0 ? '' : ''}`;
        bandaPosta(st, 'sys', txt, { k: 'riepilogo' }); P.riepilogo = txt;
      }
    });
  }
  // ---- la risposta della banda ----
  function rispostaDi(st, m, I, E, battIA) {
    const B = battIA && battIA[E.esito];
    if (B && typeof B === 'string' && (E.esito === 'accetta' || !promette(B))) return clip(B, 170);
    if (B && E.esito !== 'accetta' && promette(B)) S(st).stats.guardia++;
    return battuta(st, m, I, E);
  }
  function bandaScrivi(st, text, opt) {
    opt = opt || {}; const M = S(st), ia = opt.ia || null;
    RS.members(st).forEach(m => RS.initNpc(st, m));
    bandaPosta(st, 'player', text);
    const t = norm(text), out = { risposte: [], promesse: [], obiezioni: [], muti: [], piano: null, mandato: null };
    if (!RS.members(st).length) { bandaPosta(st, 'sys', 'Nella banda non c\'è nessuno.'); return out; }
    // 0. una risposta a una contro-offerta («va bene domani», «prometto», «ti do 20») va a chi l'ha fatta
    const pendId = Object.keys(M.pend).filter(id => M.pend[id].thread === 'banda' && st.t - M.pend[id].t < 240).sort((a, b) => M.pend[b].t - M.pend[a].t)[0];
    if (pendId && !segmenti(st, text).some(x => x.chi) && (/\b(prometto|ti do|tieni|eccoti|lascia stare|va bene|d accordo|ok|allora)\b/.test(t))) {
      const m = G.byId(st, pendId);
      const r = rispondi(st, m, text, { noUser: true, canale: 'banda', ia: null });
      bandaPosta(st, m.id, r.say, { esito: r.esito }); out.risposte.push({ chi: m.id, esito: r.esito, say: r.say });
      if (r.promessa) { r.promessa.thread = 'banda'; r.promessa.canale = 'banda'; out.promesse.push(r.promessa); }
      return out;
    }
    // 0b. una rapina proposta aspetta il sì del giocatore
    const prop = M.rapine.filter(R0 => R0.banda && R0.stato === 'proposta').sort((a, b) => b.born - a.born)[0];
    if (prop && /\b(va bene|ok|fallo|fatela|si|sì|d accordo|vai|niente armi vere|armi finte|lascia stare|no|niente rapine|scordatelo)\b/.test(t) && !/\bdimmi\b/.test(t)) {
      const cosa0 = /\b(niente armi vere|armi finte)\b/.test(t) ? 'finte' : /\b(lascia stare|no|niente rapine|scordatelo)\b/.test(t) ? 'no' : 'si';
      RAPINA.rispondi(st, prop.id, cosa0); out.rapina = prop; return out;
    }
    const fam = M.rapine.find(R0 => R0.banda && R0.quotaFam && !R0.famPagata && R0.famChiesta);
    if (fam && /\b(paga|paghiamo|pagate)\b/.test(t) && !/\bnon paghiamo\b/.test(t)) { RAPINA.paga(st, fam.id); bandaPosta(st, 'sys', `Pagati ${fam.quotaFam}.000 alla Famiglia. Cassa: ${Math.floor(st.ris.cassa)}.000.`); return out; }
    // 0c. «fate una rapina all'Emporio»: ordinata dal giocatore (è già un sì), con i vincoli della frase
    if (/\brapin\w*\b/.test(t) && !/\b(niente|senza) rapin/.test(t)) { const r0 = RAPINA.ordina(st, text, vincoliDa(t)); if (!r0.ok) bandaPosta(st, 'sys', r0.msg); out.rapina = r0.R0 || null; return out; }
    // 1. un obiettivo aperto: un mandato alla banda (§0.6) o a uno solo
    const MD = capisciMandato(st, text);
    if (MD.length) {
      const sg = segmenti(st, text).find(x => x.chi && x.chi !== 'tutti');
      if (sg) { const r = rispondiMandato(st, sg.chi[0], text, MD, { canale: 'banda', ia: opt.iaMandato }); bandaPosta(st, sg.chi[0].id, r.say, { esito: r.esito }); out.mandato = r.mandato; out.risposte.push({ chi: sg.chi[0].id, esito: r.esito, say: r.say }); return out; }
      out.mandato = mandatoBanda(st, text, MD, { ia: opt.iaMandato }); return out;
    }
    // 2. un piano con i ruoli
    const shopT = bottegaDa(st, text), placeT = !shopT ? trovaLuogo(st, text, st.player) : null;
    const pianoQ = PIANO_RE.test(t) && (shopT || (placeT && !placeT.dubbio));
    if (pianoQ || (ia && ia.piano)) {
      const tgt = shopT || (ia && ia.piano && bottegaDa(st, String(ia.piano.luogo || ''))) || (placeT && !placeT.dubbio ? { x: placeT.x, y: placeT.y, name: placeT.name } : null);
      if (tgt) { out.piano = bandaPiano(st, text, tgt, ia, out); return out; }
    }
    // 3. ordini a uno, a tutti o a chi è più adatto
    let ord = ordiniDa(st, text, ia);
    if (ia && Array.isArray(ia.intenti) && ia.intenti.length) {
      ord = ia.intenti.slice(0, 6).map(x => { const m = G.byId(st, x.chi) || membroDaNome(st, String(x.chi || '')); return m && m.ris && m.ris.member ? { m, I: intentoDaIA(st, m, x, text), testo: text } : null; }).filter(Boolean);
    }
    if (!ord.length || ord.every(o => !o.m)) {
      const q = ia && ia.domanda ? (typeof ia.domanda === 'string' ? ia.domanda : ia.domanda.testo) : null;
      const m = (ia && ia.domanda && ia.domanda.chi && G.byId(st, ia.domanda.chi)) || RS.members(st).filter(x => disponibile(st, x)).sort((a, b) => b.tr.loq - a.tr.loq)[0];
      if (m) { const say = q && !promette(q) ? clip(q) : scegli(st, m, 'chiede:_', ['Cioè? Chi deve fare cosa?', 'Parla chiaro: a chi tocca?', 'Sì, ma chi? E dove?']); bandaPosta(st, m.id, say, { esito: 'chiede' }); out.risposte.push({ chi: m.id, esito: 'chiede', say }); }
      return out;
    }
    // le obiezioni prima: chi non è chiamato in causa e non è d'accordo lo dice una volta
    const chiamati = new Set(ord.map(o => o.m && o.m.id));
    const malus = {};
    ord.filter(o => o.m && o.I).forEach(o => {
      if (out.obiezioni.some(x => x.verbo === o.I.verbo)) return;
      const altri = RS.members(st).filter(k => !chiamati.has(k.id) && disponibile(st, k));
      for (const k of altri) {
        let ob = obiezioneDi(st, k, o.I, o.m);
        if (ia && Array.isArray(ia.obiezioni)) { const x = ia.obiezioni.find(z => z.chi === k.id); if (x && ob && x.testo && !promette(x.testo)) ob.testo = clip(x.testo); }
        if (!ob) continue;
        out.obiezioni.push(Object.assign(ob, { verbo: o.I.verbo, contro: o.m.id }));
        if (o.m.ris.loyalty < .5 && k.ris.loyalty > o.m.ris.loyalty) malus[o.m.id] = .1;
        break;
      }
    });
    // le obiezioni inventate dall'IA da chi in realtà accetterebbe: scartate
    // la verifica e l'avvio, per ognuno
    const res = [];
    ord.forEach(o => {
      const m = o.m; if (!m) return;
      if (!disponibile(st, m)) { out.muti.push(m); return; }
      const batt = ia && Array.isArray(ia.battute) ? ia.battute.find(b => b.chi === m.id) : null;
      if (!o.I) { res.push({ m, E: { esito: 'chiede', motivo: { tipo: 'cosa', testo: 'Cosa devo fare?' } }, I: null, batt }); return; }
      let E = verifica(st, m, o.I, { malus: malus[m.id] });
      let rr = null;
      if (E.esito === 'accetta') {
        const r0 = impegna(st, m, o.I, E, 'banda');
        if (!r0 || !r0.ok) E = { esito: 'rifiuta', motivo: { tipo: 'impossibile', testo: (r0 && r0.msg) || 'non si può', dati: {} }, contro: null };
        else { E.res = r0; rr = r0.promessa || null; if (rr) { rr.thread = 'banda'; rr.canale = 'banda'; out.promesse.push(rr); const V = RS.VERBS[o.I.verbo] || {}; if ((V.risk || 0) >= .1 || V.pol) tradisce(st, m, rr, rr.desc); } }
      }
      if (E.esito === 'contratta' || E.esito === 'chiede') { if (E.contro) M.pend[m.id] = { intento: o.I, contro: E.contro, t: st.t, thread: 'banda' }; }
      res.push({ m, E, I: o.I, batt, likes: (RS.card(m).likes || []).includes(o.I.verbo), tutti: o.tutti });
    });
    // chi risponde prima: chi lo fa volentieri, chi accetta, chi contratta, chi chiede, chi rifiuta; al massimo tre messaggi
    const ord2 = { accetta: 0, contratta: 1, chiede: 2, rifiuta: 3, niente: 4 };
    res.sort((a, b) => (ord2[a.E.esito] - ord2[b.E.esito]) || ((b.likes ? 1 : 0) - (a.likes ? 1 : 0)));
    const parlano = res.slice(0, 3), zitti = res.slice(3);
    parlano.forEach(x => {
      const say = rispostaDi(st, x.m, x.I, x.E, x.batt);
      bandaPosta(st, x.m.id, say, { esito: x.E.esito });
      if (x.E.res && x.E.res.promessa) x.E.res.promessa.parole = `«${say}»`;
      out.risposte.push({ chi: x.m.id, esito: x.E.esito, say, motivo: x.E.motivo });
      if (x.E.esito === 'rifiuta' && x.E.motivo && x.E.motivo.testo && x.E.motivo.tipo !== 'never') bandaPosta(st, 'sys', `✗ ${nome(x.m)}: ${veroMotivo(x.E)}`, { ok: false });
      if ((x.E.esito === 'contratta' || x.E.esito === 'chiede') && x.E.motivo && x.E.motivo.testo) bandaPosta(st, 'sys', `· ${nome(x.m)}: ${veroMotivo(x.E)}`);
      if (x.E.res && x.E.res.msg) bandaPosta(st, 'sys', `✓ ${nome(x.m)}: ${x.E.res.msg}`, { ok: true });
    });
    out.obiezioni.forEach(ob => { bandaPosta(st, ob.chi, ob.testo, { obiezione: true }); });
    const si = zitti.filter(x => x.E.esito === 'accetta'), no = zitti.filter(x => x.E.esito !== 'accetta');
    if (si.length) bandaPosta(st, 'sys', `Ci stanno anche ${si.map(x => nome(x.m)).join(' e ')}.`);
    if (no.length) bandaPosta(st, 'sys', `${no.map(x => nome(x.m)).join(' e ')}: ${no.length > 1 ? 'non se la sentono' : 'non se la sente'}.`);
    const muti = out.muti.concat(ord.filter(o => o.tutti && o.m && !disponibile(st, o.m) && !out.muti.includes(o.m)).map(o => o.m));
    if (muti.length) bandaPosta(st, 'sys', `${[...new Set(muti.map(m => nome(m)))].join(' e ')} non ${muti.length > 1 ? 'rispondono' : 'risponde'}.`);
    out.muti = muti;
    M.stats.banda = (M.stats.banda || 0) + 1;
    if (ia && ia.memoria) RS.members(st).forEach(m => { m.ris.notes.push(clip(ia.memoria, 100)); if (m.ris.notes.length > 12) m.ris.notes.shift(); });
    return out;
  }
  function bandaPiano(st, text, tgt, ia, out) {
    const M = S(st), t = norm(text);
    let dati = ruoliDa(st, text);
    if (ia && ia.piano && Array.isArray(ia.piano.ruoli)) ia.piano.ruoli.forEach(x => { const m = G.byId(st, x.chi); if (m && m.ris && m.ris.member && RUOLI.includes(x.ruolo) && !dati.some(d => d.chi === m.id)) dati.push({ chi: m.id, ruolo: x.ruolo }); });
    const P = nuovoPiano(st, 'colpo', tgt, /\b(adesso|subito|ora)\b/.test(t) ? 'adesso' : 'stanotte', dati);
    // chi non ha un ruolo e viene chiamato («tutti») risponde lo stesso: chi rifiuta lo dice
    const tutti = segmenti(st, text).some(x => x.chi === 'tutti') || /\b(tutti|organizzatevi)\b/.test(t);
    const extra = tutti ? RS.members(st).filter(m => disponibile(st, m) && !P.ruoli.some(x => x.chi === m.id)) : [];
    const res = [];
    const malus = {};
    P.ruoli.forEach(x => { const m = G.byId(st, x.chi); x.E = verificaRuolo(st, m, P, x.ruolo); });
    // obiezioni: chi ha la volontà contratta (o la linea è prudenza) e non è nel ruolo che rifiuta già
    P.ruoli.concat(extra.map(m => ({ chi: m.id, ruolo: null }))).forEach(x => {
      if (out.obiezioni.length || x.ruolo === 'scassa') return; const m = G.byId(st, x.chi);
      const E = x.E || verificaRuolo(st, m, P, 'porta');
      if (!x.ruolo) { if (E.esito === 'contratta') { out.obiezioni.push({ chi: m.id, tipo: 'paura', testo: pickR(st, OBIEZ.paura) }); } return; }
      if (E.esito === 'contratta' || (st.ris.linea === 'prudenza' && m.tr.cor < .6)) { const ex = G.byId(st, (P.ruoli.find(q => q.ruolo === 'scassa') || {}).chi); out.obiezioni.push({ chi: m.id, tipo: 'prudenza', testo: riempi(pickR(st, E.esito === 'contratta' ? (x.ruolo === 'palo' ? ['Con la luna così ci vedono pure dal continente. Il palo lo faccio, ma da lontano.', 'Il palo lo faccio, ma da lontano. E se vedo una divisa, sparisco.'] : ['Non mi piace. Io ci sto, ma al primo rumore me ne vado.', 'Va bene, ma se si mette male non aspetto nessuno.']) : OBIEZ.prudenza), { cosa: cap1(tgt.name) }) }); if (ex && ex.ris.loyalty < .5 && m.ris.loyalty > ex.ris.loyalty) malus[ex.id] = .1; }
    });
    // la decisione vera: accetta (anche chi contratta il palo accetta da lontano), oppure fuori dal piano
    P.ruoli.forEach(x => {
      const m = G.byId(st, x.chi); let E = malus[m.id] ? verificaRuolo(st, m, P, x.ruolo, malus[m.id]) : x.E;
      // chi contratta ci sta, ma a modo suo: il palo da lontano, gli altri pronti a sparire al primo rumore
      if (E.esito === 'contratta') { E = Object.assign({}, E, { esito: 'accetta', lontano: true }); }
      x.E = E; x.ok = E.esito === 'accetta';
      res.push({ m, E, ruolo: x.ruolo });
    });
    extra.forEach(m => { const E = verificaRuolo(st, m, P, 'porta'); res.push({ m, E: E.esito === 'accetta' ? { esito: 'niente', motivo: null } : E, ruolo: null }); });
    if (!P.ruoli.some(x => x.ok && x.ruolo === 'scassa')) {
      const sc = P.ruoli.find(x => x.ruolo === 'scassa'), m = sc ? G.byId(st, sc.chi) : RS.members(st).find(k => disponibile(st, k));
      P.stato = 'annullato';
      const senzaAttrezzi = !sc || (sc.E && sc.E.esito === 'chiede');
      if (m) bandaPosta(st, m.id, senzaAttrezzi ? 'Senza piede di porco apriamo con cosa, coi denti?' : 'Senza uno che apre, si va a guardare le vetrine.', { esito: 'chiede' });
      bandaPosta(st, 'sys', senzaAttrezzi ? `Piano «${tgt.name}» saltato: nessuno ha un attrezzo per aprire. Prima: compra attrezzi.` : `Piano «${tgt.name}» saltato: nessuno se la sente di aprire.`);
      res.filter(x => x.E.esito === 'rifiuta' && x.m !== m).slice(0, 2).forEach(x => { const say = battuta(st, x.m, { verbo: 'scasso', args: {} }, x.E); bandaPosta(st, x.m.id, say, { esito: 'rifiuta' }); x.say = say; });
      out.risposte = res.map(x => ({ chi: x.m.id, esito: x.E.esito, say: x.say || '', motivo: x.E.motivo }));
      return P;
    }
    // le promesse, una per ruolo, con lo stesso piano_id (partono al ritrovo, da sole)
    P.ruoli.filter(x => x.ok).forEach(x => {
      const m = G.byId(st, x.chi);
      const p = nuovaPromessa(st, { chi: m.id, a: 'player', verbo: 'ruolo', args: { piano: P.id, ruolo: x.ruolo }, desc: `${RUOLO_DESC[x.ruolo]} a ${tgt.name}${x.E.lontano ? ' (da lontano)' : ''}`, stato: 'accettata', quando: { t0: st.t, at: P.t }, scadenza: P.t + 200, thread: 'banda', canale: 'banda', piano_id: P.id, dove: { name: tgt.name, x: tgt.x, y: tgt.y } });
      x.pid = p.id; out.promesse.push(p);
      if (tradisce(st, m, p, `il colpo a ${tgt.name} alle ${hhmm(P.t)}`)) P.soffiata = true;
    });
    // chi risponde, al massimo tre; gli altri in una riga
    const ord2 = { accetta: 0, contratta: 1, chiede: 2, rifiuta: 3, niente: 4 };
    res.sort((a, b) => ord2[a.E.esito] - ord2[b.E.esito]);
    const lines = { accetta: { scassa: ['Ci sto. Il piede di porco ce l\'ho io, quindi comando io.', 'Apro io. Due minuti, se la serranda è quella che penso.'], palo: ['Il palo lo faccio io. Vedo un Grigio e fischio.', 'Faccio il palo. Ho gli occhi di un gatto e la paura di un coniglio: perfetto.'], porta: ['Porto io. Se pesa, la trascino.', 'La roba la porto io. Basta che non siano lavatrici.'], autista: ['Guido io. Con la Vespa passo dove gli altri non passano.'], voce: ['Dopo la racconto io, in giro. Con qualche dettaglio in più.'] } };
    const cand = res.filter(x => x.E.esito !== 'niente'), parlano = [];
    [x => x.ruolo === 'scassa' && x.E.esito === 'accetta', x => x.E.lontano, x => x.E.esito === 'rifiuta', x => x.E.esito === 'accetta', () => true].forEach(f => { cand.forEach(x => { if (parlano.length < 3 && !parlano.includes(x) && f(x)) parlano.push(x); }); });
    parlano.forEach(x => {
      let say;
      const B = ia && Array.isArray(ia.battute) ? ia.battute.find(b => b.chi === x.m.id) : null;
      if (B && B[x.E.esito] && (x.E.esito === 'accetta' || !promette(B[x.E.esito]))) say = clip(B[x.E.esito]);
      else if (x.E.esito === 'accetta') say = x.E.lontano ? (x.ruolo === 'palo' ? 'Il palo lo faccio, ma da lontano. Se vedo una divisa, sparisco.' : x.ruolo === 'scassa' ? 'Apro io. Ma poi sparisco, eh. Non aspetto nessuno.' : 'Ci sto. Ma al primo rumore me ne vado.') : scegli(st, x.m, 'ruolo:' + x.ruolo, lines.accetta[x.ruolo] || BANCHE.accetta._);
      else say = battuta(st, x.m, { verbo: 'scasso', args: {} }, x.E);
      bandaPosta(st, x.m.id, say, { esito: x.E.esito });
      out.risposte.push({ chi: x.m.id, esito: x.E.esito, say, ruolo: x.ruolo, motivo: x.E.motivo });
    });
    out.obiezioni.forEach(ob => { if (!out.risposte.some(r => r.chi === ob.chi && r.say === ob.testo)) bandaPosta(st, ob.chi, ob.testo, { obiezione: true }); });
    const fuori = res.filter(x => !x.ruolo || !x.E || x.E.esito !== 'accetta').map(x => x.m).filter(m => !parlano.some(y => y.m === m));
    const nonVengono = res.filter(x => x.E.esito === 'rifiuta').map(x => nome(x.m));
    const desc = P.ruoli.filter(x => x.ok).map(x => `${nome(G.byId(st, x.chi))} ${RUOLO_DESC[x.ruolo]}`).join(', ');
    bandaPosta(st, 'sys', `Piano «${tgt.name}»: ritrovo ${hhmm(P.ritrovo && P.t)} ${aLuogo(P.ritrovo.name)}; ${desc}.${nonVengono.length ? ` ${nonVengono.join(' e ')} non ${nonVengono.length > 1 ? 'vengono' : 'viene'}.` : ''}`, { k: 'piano' });
    out.fuori = fuori;
    return P;
  }
  Parola.banda = bandaScrivi;
  Parola.piani = st => S(st).piani;
  // con l'IA: la richiesta del §4.2, poi la stessa catena (async, per la finestra)
  function richiestaBanda(st, text) {
    const R = st.ris, ms = RS.members(st);
    return {
      kind: 'banda', versione: 'parola1',
      banda: { ora: hhmm(st.t), notte: G.isNight(st), repressione: RS.reprLevel(st), cassa: Math.floor(R.cassa), linea: R.linea, basi: R.bases.filter(b => b.alive).map(b => `${b.id}=${b.name} [${b.modules.join(', ') || 'vuota'}; scorte: ${Object.entries(b.stock).map(([k, v]) => `${v} ${k}`).join(', ') || 'niente'}]`).join('; ') },
      membri: ms.map(m => ({ id: m.id, nome: m.first, battaglia: RS.battle(m), voce: RS.card(m).voice || '', dove: G.nearestPlace(m.x, m.y).name, compito: m.ris.task ? m.ris.task.desc : null, stanchezza: Math.round(m.ris.fatigue * 100) / 100, lealta: Math.round(m.ris.loyalty * 100) / 100, ha_con_se: Object.entries(m.ris.carry).map(([k, v]) => `${v} ${k}`).join(', ') || 'niente', volonta: volontaPer(st, m, ['scrivi_onda', 'sorveglia', 'scasso', 'contrabbando', 'colletta', 'lavora', 'sabota']) })),
      verbi: verbiPer(st, ms[0], true).concat([{ verbo: 'piano', args: 'tipo, luogo, quando, ruoli?', desc: 'un\'azione coordinata con i ruoli', chi: 'membri' }]),
      ruoli: RUOLI, luoghi: luoghiPer(st, ms[0], text),
      impegni: S(st).promesse.filter(p => p.thread === 'banda' && ACTIVE.includes(p.stato)).map(p => ({ id: p.id, chi: p.chi, desc: p.desc, stato: p.stato })),
      storia: bandaChat(st).filter(m => m.role !== 'sys').slice(-10).map(m => ({ da: m.da, testo: clip(m.text, 160) })),
      text,
    };
  }
  Parola.richiestaBanda = richiestaBanda;
  async function bandaInvia(st, text) {
    let ia = null, iaM = null;
    if (iaAttiva()) {
      if (capisciMandato(st, text).length) iaM = await chiamaIA(richiestaMandato(st, null, text));
      else ia = await chiamaIA(richiestaBanda(st, text));
    }
    return bandaScrivi(st, text, { ia, iaMandato: iaM });
  }
  Parola.bandaInvia = bandaInvia;

  // ================= I MANDATI (§0): gli obiettivi aperti =================
  // «servono soldi per la cassa e due compagni nuovi»: il personaggio lo prende (o lo contratta), lo spezza da solo in fasi di
  // azioni vere del motore scelte dal suo carattere, e lo racconta. Le fasi sono intenti che passano dalla stessa verifica e
  // diventano promesse con `mandato`; il progresso si conta dallo stato (quello che le fasi hanno reso davvero, i membri entrati,
  // le scorte, il morale), mai da quello che il personaggio dichiara.
  const VINC0 = () => ({ pulito: false, niente: [], budget: null, prudenza: false, armi: 'tutte', rapine: true });
  const DUE = { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, paio: 2, qualche: 3, cento: 100, centinaio: 100, duecento: 200, cinquanta: 50, trecento: 300 };
  const vizio = n => !!((n.pop && n.pop.ints && n.pop.ints.some(i => i.k === 'carte' || i.k === 'giochi')) || n.tr.avid > .7);
  const mestiereDi = n => { const c = RS.card(n); return c.mestiere ? { place: c.mestiere.place, pay: c.mestiere.pay } : n.pop && n.pop.job && n.pop.job.t ? { t: n.pop.job.t, pay: n.pop.job.pay || 5, title: n.pop.job.title } : null; };
  const isM = n => !!(n && n.ris && n.ris.member);
  function complici(st, n) {
    if (!n.pop) return [];
    const fr = (n.pop.friends || []).map(id => G.byId(st, id)).filter(k => k && !k.dead && k.pop && k.pop.ints && !(k.jailedUntil > st.t) && k.tr.legge < .55 && !k.cop);
    const giro = st.npcs.filter(k => k !== n && k.pop && k.pop.ints && !k.dead && !k.cop && k.pop.giro && k.pop.giro !== 'orecchio' && n.pop.homeT && k.pop.homeT && dist(k.pop.homeT.x, k.pop.homeT.y, n.pop.homeT.x, n.pop.homeT.y) < 150);
    return fr.concat(giro).filter((k, i, a) => a.indexOf(k) === i);
  }
  const disperato = n => !!(n.pop && ((n.pop.need && n.pop.need.soldi > .7) || (n.pop.debt && n.pop.debt.amount > (n.pop.money || 0))));
  const willAvg = (st, n, verbs) => verbs.length ? verbs.reduce((s, v) => s + RS.will(st, n, v, {}).s, 0) / verbs.length : 0;
  const neverHas = (n, vs) => { const c = RS.card(n); return (c.never || []).some(v => vs.includes(v)); };
  // i modelli del §0.2: per ognuno la misura e i metodi (con il peso del carattere, le regole dure, la prossima fase)
  const MANDATI = {
    soldi: { label: 'Soldi per la cassa', unita: 'mila lire', def: 100, re: /\b(soldi|cassa|lire|quattrini|grana|fai cassa|piange)\b/, misura: 'reso' },
    recluta: { label: 'Gente nuova', unita: 'persone', def: 2, re: /\b(reclut\w*|compagn[io]|gente nuova|nuovi membri|trovami \w+ (persone|compagni)|portami gente)\b/, misura: 'membri' },
    procura: { label: 'Procurare', unita: 'pezzi', def: 2, re: /\b(procura\w*|ci servono (?!soldi)|mi servono (?!soldi)|trovaci (?!un posto)|trovami (?!un posto|\w+ compagn))\b/, misura: 'scorte' },
    orecchio: { label: 'Trovare l\'Orecchio', unita: '', def: 1, re: /\b(orecchio|chi parla|chi ci vende|chi fa la spia|la spia|ci vende)\b/, misura: 'orecchio' },
    proteggi: { label: 'Proteggere', unita: '', def: 1, re: /\b(proteggi|stai vicino a|che non gli succeda|che non le succeda|guardagli le spalle)\b/, misura: 'proteggi' },
    morale: { label: 'Tirare su il quartiere', unita: 'punti', def: 10, re: /\b(tira su il quartiere|la gente deve sentirci|fatti sentire|fatevi sentire|morale|tirate su)\b/, misura: 'morale' },
    base: { label: 'Una base', unita: 'basi', def: 1, re: /\b(trovaci un posto|ci serve una base|una base nuova|un posto per noi|un covo)\b/, misura: 'basi' },
    libera: { label: 'Tirare fuori', unita: '', def: 1, re: /\b(tira fuori|tiralo fuori|tirala fuori|liberalo|liberala|fallo uscire)\b/, misura: 'libero' },
    sapere: { label: 'Sapere', unita: '', def: 1, re: /\b(scopri cosa fa|dove va|scopri dove|cosa combina|scopri chi vede)\b/, misura: 'sapere' },
  };
  // la prossima fase di ogni metodo: { verbo, args } (per i membri, un compito della Risacca) oppure { A: passi di Azioni } oppure { subito }
  const MET = {
    soldi: [
      { id: 'turni', etichetta: 'turni in più', illegale: false, rischio: 0, verbi: ['lavora', 'ripara', 'pesca'],
        perche: (st, n) => ['ha un mestiere'].concat(n.tr.legge > .5 ? ['è onesto'] : []),
        ok: (st, n) => (mestiereDi(n) || n.id === 'beppe' || isM(n)) ? null : 'non ha un mestiere',
        peso: (st, n) => n.tr.legge * .35 + (1 - n.tr.avid) * .1 + (mestiereDi(n) ? .45 : 0) + (n.id === 'beppe' ? .15 : 0),
        stima: (st, n) => { const ms = mestiereDi(n); return Math.round((n.id === 'beppe' ? 12 : ms ? ms.pay : 4) * 4); },
        fase: (st, n) => isM(n) ? (n.id === 'beppe' ? { verbo: 'ripara', args: { ore: 4 } } : RS.card(n).mestiere ? { verbo: 'lavora', args: { ore: 4 } } : { verbo: 'pesca', args: { ore: 3 } }) : faseTurnoA(st, n),
        poi: 'vendi_roba' },
      { id: 'vendi_roba', etichetta: 'vendere la sua roba', illegale: false, rischio: 0, verbi: [],
        perche: (st, n) => mezzoDi(st, n) ? ['ha una Vespa da vendere'] : ['ha della roba in più'],
        ok: (st, n, m) => (mezzoDi(st, n) && !(m && m.fasi && m.fasi.some(f => f.cosa === 'vendi_mezzo' && f.stato === 'fatta'))) ? null : 'non ha niente da vendere',
        peso: (st, n) => .05 + n.tr.avid * .1 - (mezzoDi(st, n) ? .1 : 0),
        stima: (st, n) => (mezzoDi(st, n) ? 70 : 30),
        fase: (st, n, m) => (mezzoDi(st, n) && !m.fasi.some(f => f.cosa === 'vendi_mezzo') ? { subito: 'vendi_mezzo', cosa: 'vendi_mezzo' } : null) },   // la merce della Risacca sottobanco è il mercato nero, non questo
      { id: 'colletta', etichetta: 'la colletta', illegale: false, rischio: .1, verbi: ['colletta'],
        perche: (st, n) => ['ha parlantina'].concat(isM(n) && n.ris.ideo > .7 ? ['ci crede'] : []),
        ok: (st, n) => neverHas(n, ['colletta']) ? 'la colletta no' : null,
        peso: (st, n) => n.tr.loq * .45 + (n.ris ? n.ris.ideo * .15 : 0),
        stima: st => Math.round((2 + st.ris.morale / 7) * 3),
        fase: (st, n) => isM(n) ? { verbo: 'colletta', args: { luogo: ['piazza', 'passeggiata', 'lungomare'][Math.floor(rnd(st) * 3)], ore: 3 } } : faseCollettaA(st, n) },
      { id: 'mercato_nero', etichetta: 'il mercato nero', illegale: true, rischio: .45, verbi: ['mercato', 'contrabbando'],
        perche: () => ['è avido', 'conosce la gente giusta'],
        ok: (st, n) => (isM(n) ? null : 'non ha il giro'),
        peso: (st, n) => n.tr.avid * .35 + (1 - n.tr.legge) * .3 + ((RS.card(n).likes || []).some(v => v === 'mercato' || v === 'contrabbando') ? .25 : 0),
        stima: (st, n) => (RS.totalRes(st, 'merce') > 0 ? 30 : 60),
        fase: (st, n) => RS.totalRes(st, 'merce') > 0 ? { verbo: 'mercato', args: { ore: 3 } } : { verbo: 'contrabbando', args: { ore: 3 }, notte: true } },
      { id: 'scasso', etichetta: 'uno scasso con gli amici', illegale: true, rischio: .6, verbi: ['scasso'], never: ['ruba'],
        perche: (st, n) => ['ha il giro', 'ha due amici che ci stanno'],
        ok: (st, n) => isM(n) ? null : complici(st, n).length >= 2 ? null : 'non ha due complici',
        peso: (st, n) => n.tr.cor * .3 + (1 - n.tr.legge) * .4 + (n.pop && ['ladro', 'borsaiolo'].includes(n.pop.giro) ? .8 : 0) + (isM(n) ? 0 : .1),
        stima: () => 60,
        fase: (st, n, m) => isM(n) ? { verbo: 'scasso', args: {}, notte: true } : m.fasi.some(f => f.cosa === 'trama') ? (m.fasi.some(f => f.cosa === 'versa') ? null : { subito: 'versa', cosa: 'versa' }) : { subito: 'trama', cosa: 'trama' } },
      { id: 'bisca', etichetta: 'la bisca', illegale: true, rischio: .3, verbi: ['bisca'], posta: 20,
        perche: (st, n) => ['ha il vizio delle carte'],
        ok: (st, n) => vizio(n) ? null : 'non gioca',
        peso: (st, n) => n.tr.avid * .3 + (vizio(n) ? .3 : 0) + (n.pop && n.pop.ints && n.pop.ints.some(i => i.k === 'carte' || i.k === 'giochi') ? .55 : 0) - n.tr.legge * .1,
        stima: () => 40,
        fase: (st, n) => isM(n) ? { verbo: 'bisca', args: { ore: 3 }, notte: true } : faseBiscaA(st, n) },
      { id: 'rapina', etichetta: 'una rapina', illegale: true, rischio: .85, verbi: ['scasso'], never: ['ruba', 'picchia'],
        perche: (st, n) => ['ha coraggio', 'gli serve tanto e subito'],
        ok: (st, n, m) => (m && (m.vincoli.rapine === false || m.vincoli.armi === 'no' || m.vincoli.pulito)) ? 'vietata' : (Parola.rapina ? Parola.rapina.puo(st, n) : 'no'),
        peso: (st, n) => (Parola.rapina ? Parola.rapina.peso(st, n) : -9),
        stima: () => 120,
        fase: (st, n, m) => m.fasi.some(f => f.cosa === 'rapina') ? null : { subito: 'rapina', cosa: 'rapina' } },
      { id: 'prestito', etichetta: 'un prestito dallo Squalo', illegale: false, rischio: .2, verbi: [],
        perche: () => ['non ha altro modo'],
        ok: (st, n, m) => (n.pop && !n.pop.debt && !(m && m.vincoli.budget === 0)) ? null : 'ha già debiti',
        peso: (st, n) => (disperato(n) ? .2 : -.1) + n.tr.avid * .1 - n.tr.legge * .05 - .15,
        stima: () => 60,
        fase: (st, n, m) => m.fasi.some(f => f.cosa === 'prestito') ? null : { subito: 'prestito', cosa: 'prestito' } },
    ],
    recluta: [
      { id: 'amici', etichetta: 'gli amici arrabbiati', verbi: ['recluta'], rischio: .1, perche: () => ['ha amici che odiano la Tutela'], peso: (st, n) => (n.pop && (n.pop.friends || []).length ? .3 : 0) + n.tr.loq * .2, cand: (st, n) => ((n.pop && n.pop.friends) || []).map(id => G.byId(st, id)) },
      { id: 'osteria', etichetta: 'le sere al bar e all\'osteria', verbi: ['recluta'], rischio: .1, perche: () => ['ha parlantina'], peso: (st, n) => n.tr.loq * .45, cand: (st, n) => st.npcs.filter(k => k.pop && k.pop.at && /bar|osteria|sirena/.test(String(k.pop.at.label || '').toLowerCase())) },
      { id: 'famiglie', etichetta: 'le famiglie dei fermati', verbi: ['recluta'], rischio: .1, perche: () => ['conosce chi ha un parente alla Rocca'], peso: (st, n) => (n.ris ? n.ris.ideo * .3 : 0) + .1, cand: st => st.npcs.filter(k => k.pop && k.pop.lost) },
      { id: 'lavoro', etichetta: 'i colleghi', verbi: ['recluta'], rischio: .05, perche: () => ['ha un mestiere'], peso: (st, n) => (mestiereDi(n) ? .25 : -.5), cand: (st, n) => { const ms = mestiereDi(n); return ms ? st.npcs.filter(k => k.pop && k.pop.job && ms.t && k.pop.job.t && dist(k.pop.job.t.x, k.pop.job.t.y, ms.t.x, ms.t.y) < 8) : []; } },
    ],
    procura: [
      { id: 'compra', etichetta: 'comprarla', verbi: ['compra'], rischio: 0, perche: () => ['in cassa ci sono i soldi'], ok: (st, n, m) => (m && m.vincoli.budget === 0) ? 'non si spende' : st.ris.cassa > 10 ? null : 'la cassa è vuota', peso: (st, n) => .3 + n.tr.legge * .2, fase: (st, n, m) => ({ verbo: 'compra', args: { risorsa: m.obiettivo.res, quanto: Math.max(1, m.obiettivo.quanto - Math.max(0, misura(st, m))) } }) },
      { id: 'ruba', etichetta: 'rubarla', illegale: true, verbi: ['ruba'], rischio: .3, never: ['ruba'], perche: () => ['sa dove prenderla'], peso: (st, n) => (1 - n.tr.legge) * .4 + n.tr.cor * .2, fase: (st, n, m) => ({ verbo: 'ruba', args: { risorsa: m.obiettivo.res } }) },
      { id: 'recupera', etichetta: 'recuperarla dai cantieri', illegale: true, verbi: ['recupera'], rischio: .3, perche: () => ['conosce i cantieri'], ok: (st, n, m) => m && m.obiettivo.res === 'materiali' ? null : 'solo materiali', peso: (st, n) => .25 + (1 - n.tr.legge) * .2, fase: () => ({ verbo: 'recupera', args: {} }) },
    ],
    orecchio: [
      { id: 'guarda_zia', etichetta: 'guardare chi parla con la Zia', verbi: ['sorveglia'], rischio: .1, perche: () => ['è paziente'], peso: (st, n) => (1 - n.tr.loq) * .3 + ((RS.card(n).likes || []).includes('sorveglia') ? .3 : 0), fase: (st, n, m) => (m.fasi.filter(f => f.cosa === 'sorveglia').length < 2 ? { verbo: 'sorveglia', args: { luogo: 'sirena', ore: 3 } } : null) },
      { id: 'chiacchiere', etichetta: 'chiedere in giro', verbi: ['racconta'], rischio: 0, perche: () => ['è chiacchierone'], peso: (st, n) => n.tr.loq * .4, fase: (st, n, m) => (m.fasi.filter(f => f.cosa === 'colletta').length < 1 ? { verbo: 'colletta', args: { luogo: 'piazza', ore: 2 } } : null) },
    ],
    proteggi: [
      { id: 'scorta', etichetta: 'stargli vicino', verbi: ['pedina'], rischio: .1, perche: () => ['è leale'], peso: (st, n) => n.tr.cor * .3 + .2, fase: (st, n, m) => m.obiettivo.persona ? { verbo: 'pedina', args: { persona: m.obiettivo.persona, ore: 3 } } : null },
      { id: 'guardia', etichetta: 'fare la guardia', verbi: ['proteggi'], rischio: .3, perche: () => ['ha coraggio'], peso: (st, n) => n.tr.cor * .35, ok: (st, n, m) => (m && m.obiettivo.base ? null : 'serve una base'), fase: (st, n, m) => ({ verbo: 'proteggi', args: { base: m.obiettivo.base } }) },
    ],
    morale: [
      { id: 'muri', etichetta: 'i muri', verbi: ['scrivi_onda', 'dipingi'], rischio: .1, perche: () => ['ha la mano'], peso: (st, n) => ((RS.card(n).likes || []).includes('scrivi_onda') ? .4 : .1) + n.tr.cor * .1, fase: (st, n) => (RS.totalRes(st, 'vernice') >= 2 ? { verbo: 'dipingi', args: { luogo: 'piazza' } } : { verbo: 'scrivi_onda', args: { luogo: ['piazza', 'caruggio', 'vico', 'calata'][Math.floor(rnd(st) * 4)] } }) },
      { id: 'carta', etichetta: 'i volantini', verbi: ['volantina'], rischio: .1, perche: () => ['sa dove lasciarli'], ok: st => (RS.totalRes(st, 'volantini') >= 10 ? null : 'mancano i volantini'), peso: (st, n) => ((RS.card(n).likes || []).includes('volantina') ? .4 : .15), fase: () => ({ verbo: 'volantina', args: { luogo: 'piazza' } }) },
      { id: 'radio', etichetta: 'la radio', verbi: ['trasmetti'], rischio: .3, perche: () => ['ha la voce'], peso: (st, n) => ((RS.card(n).likes || []).includes('trasmetti') ? .55 : .05), fase: () => ({ verbo: 'trasmetti', args: { ore: 2 } }) },
    ],
    base: [
      { id: 'rivela', etichetta: 'un posto che conosce', verbi: ['occupa'], rischio: .1, perche: () => ['conosce un posto vuoto'], ok: (st, n) => ((RS.card(n).knows || []).some(id => st.ris.spaces[id] && !st.ris.spaces[id].base) ? null : 'non conosce posti'), peso: () => .5, fase: (st, n) => { const id = (RS.card(n).knows || []).find(x => st.ris.spaces[x] && !st.ris.spaces[x].base); if (!id) return null; if (!st.ris.spaces[id].found) RS.discover(st, id, 'mandato'); return { verbo: 'occupa', args: { spazio: id } }; } },
      { id: 'rovista', etichetta: 'cercare in giro', verbi: ['rovista'], rischio: .1, perche: () => ['gira tanto'], peso: (st, n) => .2 + n.tr.cor * .1, fase: () => ({ verbo: 'rovista', args: {} }) },
    ],
    libera: [
      { id: 'libera', etichetta: 'tirarlo fuori', verbi: ['libera'], rischio: .6, perche: () => ['ha coraggio'], peso: (st, n) => n.tr.cor * .4, fase: (st, n, m) => ({ verbo: 'libera', args: { persona: m.obiettivo.persona } }) },
    ],
    sapere: [
      { id: 'pedina', etichetta: 'stargli dietro', verbi: ['pedina'], rischio: .2, perche: () => ['sa stare nell\'ombra'], peso: (st, n) => (1 - n.tr.loq) * .3 + .2, fase: (st, n, m) => (m.fasi.some(f => f.cosa === 'pedina' && f.stato === 'fatta') ? null : { verbo: 'pedina', args: { persona: m.obiettivo.persona, ore: 2 } }) },
    ],
  };
  MET.recluta.forEach(x => { x.illegale = false; x.fase = (st, n, m) => faseRecluta(st, n, m, x); });
  Parola.MANDATI = MANDATI; Parola.MET = MET;
  // §0.3: il carattere sceglie il metodo. Regole dure: mai un verbo dei «never», chi ha legge > .6 niente illegale, i vincoli tolgono
  function metodi(st, n, tipo, vincoli, m) {
    const L = MET[tipo] || [], V = vincoli || VINC0(), c = RS.card(n), out = [];
    L.forEach(x => {
      const no = x.ok ? x.ok(st, n, m || { vincoli: V, obiettivo: {}, fasi: [] }) : null;
      let motivo = no || null;
      if (!motivo && (c.never || []).some(v => (x.verbi || []).includes(v) || (x.never || []).includes(v))) motivo = 'non lo farebbe mai';
      if (!motivo && x.illegale && n.tr.legge > .6) motivo = 'troppo onesto';
      if (!motivo && x.illegale && V.pulito) motivo = 'il mandato è pulito';
      if (!motivo && (V.niente || []).some(v => (x.verbi || []).includes(v) || v === x.id)) motivo = 'vietato';
      if (!motivo && x.id === 'rapina' && (V.rapine === false || V.armi === 'no')) motivo = 'vietato';
      if (!motivo && (c.antag || n.cop)) motivo = 'non lavora per te';
      let sc = (x.peso ? x.peso(st, n) : 0) + (isM(n) && x.verbi && x.verbi.length ? willAvg(st, n, x.verbi.filter(v => RS.VERBS[v])) * .5 : 0) - (x.rischio || 0) * (1 - n.tr.cor) * .6 + (rnd(st) - .5) * .2;
      if ((c.likes || []).some(v => (x.verbi || []).includes(v))) sc += .15;
      out.push({ id: x.id, x, sc: Math.round(sc * 100) / 100, no: motivo, perche: x.perche ? x.perche(st, n) : [] });
    });
    return out.sort((a, b) => (a.no ? 1 : 0) - (b.no ? 1 : 0) || b.sc - a.sc);
  }
  Parola.metodi = metodi;
  // ---- dalla frase al mandato (§0.4) ----
  const MANDATO_RE = /\b(serve|servono|ci servono|mi servono|ci serve|mi serve|fai|fate|fammi|trova|trovami|trovaci|procura|procurami|scopri|proteggi|tira su|tirate su|tira fuori|reclut\w*|metti insieme|raccogli)\b/;
  function entroDa(st, t) {
    const d0 = dayIdx(st.t);
    const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
    const g = GIORNI.find(x => new RegExp(`\\b(entro|per|prima di) ${x}\\b`).test(t));
    if (g) { for (let k = 1; k <= 8; k++) { if (norm(G.dayName((d0 + k) * 1440 + 600)).startsWith(g.slice(0, 5))) return (d0 + k) * 1440 + 22 * 60; } }
    if (/\b(per domani|entro domani)\b/.test(t)) return (d0 + 1) * 1440 + 22 * 60;
    if (/\b(per stasera|entro stasera|stasera)\b/.test(t)) return d0 * 1440 + 23 * 60;
    if (/\b(in settimana|entro la settimana)\b/.test(t)) return st.t + 7 * 1440;
    const m = t.match(/\bentro (\d+|due|tre|quattro|cinque) giorni\b/); if (m) return st.t + (DUE[m[1]] || +m[1]) * 1440;
    return st.t + 3 * 1440;   // decisione 5: tre giorni di gioco
  }
  function vincoliDa(t) {
    const V = VINC0();
    if (/\b(senza casini|pulit\w*|niente furti|senza rubare|onest\w*|legale|senza rischi)\b/.test(t)) V.pulito = true;
    if (/\b(niente botte|senza botte|senza picchiare|niente violenza|niente sangue)\b/.test(t)) V.niente.push('picchia');
    if (/\b(non spendere|senza spendere|niente spese)\b/.test(t)) V.budget = 0;
    if (/\b(stai attent\w*|occhio a chi|con prudenza|prudente|fidati poco|attenzione a chi)\b/.test(t)) V.prudenza = true;
    if (/\bniente rapine\b|\bsenza rapine\b/.test(t)) V.rapine = false;
    if (/\bniente armi vere\b|\bsolo armi finte\b/.test(t)) V.armi = 'finte';
    else if (/\b(niente armi|senza armi)\b/.test(t)) V.armi = 'no';
    if (/\b(fai come vuoi|come vuoi|fai tu|a modo tuo)\b/.test(t)) V.libero = true;
    return V;
  }
  function quantoDa(t, tipo) {
    const k = tipo === 'soldi' ? /\b(\d+)\s*(?:mila|\.000|000)?\b|\b(cento|centinaio|duecento|trecento|cinquanta)\b/ : /\b(\d+|un|uno|una|due|tre|quattro|cinque|paio|qualche)\s+(?:nuovi\s+)?(compagn\w*|persone|gente|membri|amici|ragazzi|pezzi|scatole|casse|bombolette|\w+)\b/;
    const m = t.match(k); if (!m) return null;
    const w = m[1] || m[2]; const q = DUE[w] || +w;
    if (!isFinite(q) || q <= 0) return null;
    return tipo === 'soldi' && q > 1000 ? Math.round(q / 1000) : q;
  }
  function capisciMandato(st, text) {
    const t = norm(text);
    const frame = MANDATO_RE.test(t) || /\b(la cassa piange|per la cassa|compagni nuovi|gente nuova|nuovi compagni)\b/.test(t);
    if (!frame) return [];
    if (/\b(ti do|tieni|eccoti|lascia stare)\b/.test(t) && !/\b(servono|serve|trovami)\b/.test(t)) return [];
    const out = [], V = vincoliDa(t), entro = entroDa(st, t);
    // la frase si spezza sugli «e»: «soldi per la cassa e due compagni nuovi» fa due mandati
    const parts = t.split(/\s+e\s+(?=(?:a\s+)?(?:reclut|trova|due|tre|un|una|qualche|gente|compagn|scopri|procura|soldi|tira|proteggi))/);
    const seen = new Set();
    parts.forEach(p => {
      for (const [tipo, D] of Object.entries(MANDATI)) {
        if (seen.has(tipo) || !D.re.test(p)) continue;
        if (tipo === 'procura' && MANDATI.soldi.re.test(p)) continue;
        if (tipo === 'recluta' && !/reclut|compagn|gente nuova|nuovi membri|persone/.test(p)) continue;
        seen.add(tipo);
        const ob = { tipo, quanto: quantoDa(p, tipo) || D.def, entro, vincoli: V };
        if (tipo === 'procura') { const c = cosa(p, ['res']); if (!c) continue; ob.res = c.id; ob.quanto = c.q > 1 ? c.q : ob.quanto; }
        if (['proteggi', 'libera', 'sapere'].includes(tipo)) { const k = trovaPersona(st, text, null, true); if (k) ob.persona = k.id; else if (tipo === 'proteggi') { const b = st.ris.bases.find(x => x.alive && norm(text).includes(norm(x.name))) || (/\bla base\b/.test(p) && st.ris.bases.find(x => x.alive)); if (b) ob.base = b.id; } if (!ob.persona && !ob.base) continue; }
        out.push(ob); break;
      }
    });
    return out;
  }
  Parola.capisciMandato = capisciMandato;
  // ---- la misura, dallo stato ----
  function misura(st, m) {
    const o0 = m.obiettivo;
    switch (o0.misura) {
      case 'reso': return Math.round(m.fasi.reduce((s, f) => s + (f.reso || 0), 0));
      case 'membri': return (m.reclutati || []).filter(id => isM(G.byId(st, id))).length;
      case 'scorte': return RS.totalRes(st, o0.res) - o0.base;
      case 'morale': return Math.round(st.ris.morale - o0.base);
      case 'basi': return st.ris.bases.filter(b => b.alive).length - o0.base;
      case 'libero': { const k = G.byId(st, o0.persona); return k && !(k.jailedUntil > st.t) ? 1 : 0; }
      case 'orecchio': return m.trovato ? 1 : 0;
      case 'sapere': return m.saputo ? 1 : 0;
      case 'proteggi': return m.danno ? 0 : st.t >= m.vincoli.entro ? 1 : 0;
    }
    return 0;
  }
  function basePer(st, ob) {
    const M0 = MANDATI[ob.tipo].misura;
    return M0 === 'scorte' ? RS.totalRes(st, ob.res) : M0 === 'morale' ? st.ris.morale : M0 === 'basi' ? st.ris.bases.filter(b => b.alive).length : 0;
  }
  // ---- le battute dei mandati (dal motore: numeri veri) ----
  const MB = {
    accetta: { soldi: ['{Quanto}? Va bene. Lo faccio a modo mio.', '{Quanto}. Non chiedermi come, chiedimi quando.', 'Si può fare. Non sarà bello da vedere, ma si può fare.'], recluta: ['Seri non ne conosco. Arrabbiati sì, vanno bene lo stesso?', 'Gente nuova. Ci provo, ma la gente è strana.'], _: ['Va bene. Ci penso io, a modo mio.', 'Lo faccio. Non subito, ma lo faccio.'] },
    piano: ['Faccio così: {metodo}. {poi}', 'Allora: {metodo}. {poi}', '{Metodo}. {poi}'],
    contratta: { soldi: ['Dammi {soldi} e {quando} te li faccio diventare cento. Ho un metodo.', 'Per cominciare servono {soldi}. Poi si vede.'], tempo: ['{Motivo}? Allora ci metto più tempo. {giorni} giorni.', 'In così poco no. Dammi {giorni} giorni.'], mezzi: ['Con cosa, con la faccia? Dammi qualcosa da vendere.'], fiducia: ['Ti conosco poco per lavorare per te. Prima fammi vedere chi sei.'], _: ['Mah. Fammi pensare. Ne riparliamo.'] },
    rifiuta: { soldi: ['Soldi? Io non so come si fanno. Chiedi a un altro.'], recluta: ['Reclutare no, io con la gente non ci so parlare.'], _: ['Questo no. Non è roba per me.', 'Non lo so fare, e non lo voglio imparare.'], non_so: ['Io? Queste cose le fanno quelli della banda.'] },
    parziale_soldi: ['{Q}. Siamo a {fatto} su {su}.', 'Altri {q}. Fanno {fatto}.', '{Q} oggi. Se continua così, ci arrivo.'],
    parziale_perso: ['Ho perso {q}. Lo so. Lo so.', 'Siamo a {fatto}. Il metodo va rivisto.'],
    cambio: ['{Metodo0} non rende. Passo {a_metodo}.', 'Così non basta. Domani {metodo}.'],
    cambio_vespa: ['Le Vespe non bastano. Domani vendo la mia.'],
    finale: ['{Cosa}: {fatto} su {su}. {storia}', 'Fatto: {fatto} su {su}. {storia}'],
    finale_parte: ['{Fatto} su {su}. Il resto non c\'è, e non lo invento.', '{Fatto} su {su}. Più di così non sono riuscito.'],
    fallito: ['Niente da fare: {fatto} su {su}. {storia}', 'È andata male. {storia}'],
  };
  // ---- un mandato nuovo ----
  function nuovoMandato(st, n, ob, metodo, opt) {
    const Mx = S(st), D = MANDATI[ob.tipo];
    const m = { id: 'm' + Mx.nextM++, chi: n ? n.id : 'banda', tipo: ob.tipo, label: D.label,
      obiettivo: { misura: D.misura, quanto: ob.quanto, base: basePer(st, ob), res: ob.res, persona: ob.persona, base_id: ob.base },
      vincoli: Object.assign(VINC0(), ob.vincoli || {}, { entro: ob.entro || st.t + 3 * 1440 }),
      metodo: metodo ? { id: metodo.id, etichetta: metodo.x.etichetta, perche: metodo.perche } : null, provati: metodo ? [metodo.id] : [],
      fasi: [], progresso: { fatto: 0, su: ob.quanto }, stato: 'in_corso', rapporti: [], conseguenze: [], reclutati: [], esclusi: [],
      thread: (opt && opt.canale === 'banda') ? 'banda' : n ? n.id : 'banda', canale: (opt && opt.canale) || 'chat', t0: st.t, posta: (opt && opt.posta) || 0, cassa0: st.ris.cassa, parent: (opt && opt.parent) || null, sotto: [], fasiIA: (opt && opt.fasiIA) || [] };
    if (ob.base) m.obiettivo.base = ob.base;
    if (m.obiettivo.misura === 'proteggi' && ob.base) m.obiettivo.base = ob.base;
    Mx.mandati.push(m);
    return m;
  }
  function rapporto(st, m, k, testo, chi) {
    const n = G.byId(st, chi || m.chi); m.rapporti.push({ t: st.t, testo, k, chi: n ? n.id : 'sys' });
    if (!n) { bandaPosta(st, 'sys', testo, { k }); return; }
    if (m.thread === 'banda') bandaPosta(st, n.id, testo, { k, mandato: m.id });
    else if (isM(n)) RS.inbox(st, n, testo, k === 'fallito' ? 'bad' : k === 'finale' ? 'good' : 'rumor', k === 'parziale');
    else { const ch = st.ris.chats[n.id] = st.ris.chats[n.id] || []; ch.push({ role: 'npc', text: testo, sys: true, t: st.t }); if (k !== 'parziale') G.feed(st, `${n.first}: ${testo}`, 'job'); }
    if (dist(n.x, n.y, st.player.x, st.player.y) <= 25 && !n.inside) G.say(st, n, clip(testo, 70), 3.4);
  }
  const lireN = q => `${Math.round(q)}.000`;
  const aMet = e => { const m0 = String(e).match(/^(il|lo|la|l'|i|gli|le) ?/); if (!m0) return 'a ' + e; const A = { il: 'al', lo: 'allo', la: 'alla', "l'": "all'", i: 'ai', gli: 'agli', le: 'alle' }[m0[1]]; return A + (m0[1] === "l'" ? '' : ' ') + e.slice(m0[0].length); };
  const numW = q => (Math.abs(q) === 1 ? 'uno' : Math.abs(q) <= 10 && Number.isInteger(q) ? NUMW[Math.abs(q)] || String(q) : String(Math.round(q)));
  // ---- la volontà di un mandato: la media dei verbi del metodo, la fiducia, la lealtà ----
  function volontaMandato(st, n, ob, met, opt) {
    const r = RS.initNpc(st, n), member = isM(n), tr = trustOf(st, n), P = n.pop;
    const favore = !!(P && P.debiti && P.debiti.player);
    const wv = member && met && met.x.verbi.length ? willAvg(st, n, met.x.verbi.filter(v => RS.VERBS[v])) : .1;
    let s = member ? .35 + r.loyalty * .3 + r.ideo * .15 + tr * .2 + wv * .3 : wv * .3 + tr * .3 + (favore ? .35 : -.15);
    s += (opt && opt.pagato ? .3 : 0) + (r.persuade || 0);
    if (!member && tr < .4 && !favore) s -= .5;
    return Math.round(s * 100) / 100;
  }
  // ---- la risposta a un mandato (chat o banda, a uno solo) ----
  function rispondiMandato(st, n, text, lista, opt) {
    opt = opt || {}; const Mx = S(st), r = RS.initNpc(st, n), ia = opt.ia || null;
    const res = [], c = RS.card(n);
    for (const ob0 of lista) {
      const ob = Object.assign({}, ob0, { vincoli: Object.assign(VINC0(), ob0.vincoli || {}) });
      if (c.antag || n.cop) { res.push({ ob, esito: 'rifiuta', tipo: 'nemico' }); continue; }
      if (!isM(n) && ['orecchio', 'base', 'libera'].includes(ob.tipo)) { res.push({ ob, esito: 'rifiuta', tipo: 'non_so' }); continue; }
      if (Mx.mandati.some(m => m.chi === n.id && m.stato === 'in_corso' && m.tipo === ob.tipo)) { res.push({ ob, esito: 'niente', tipo: 'gia' }); continue; }
      let L = metodi(st, n, ob.tipo, ob.vincoli, { vincoli: ob.vincoli, obiettivo: { res: ob.res, persona: ob.persona, base: ob.base, quanto: ob.quanto }, fasi: [] });
      // con l'IA: il metodo proposto vale solo se è fra quelli che il carattere permette
      const iaM = ia && Array.isArray(ia.mandati) ? ia.mandati.find(x => x.tipo === ob.tipo && (!x.chi || x.chi === n.id)) : null;
      let best = L.find(x => !x.no);
      let iaOk = iaM;
      if (iaM && iaM.metodo) { const q = L.find(x => x.id === iaM.metodo); if (q && !q.no) best = q; else { Mx.stats.guardia++; Mx.stats.metodiScartati = (Mx.stats.metodiScartati || 0) + 1; iaOk = iaM.fasi ? { fasi: [] } : null; } }
      if (!best) { res.push({ ob, esito: ob.tipo === 'soldi' && !isM(n) ? 'contratta' : 'rifiuta', tipo: ob.tipo === 'soldi' ? 'mezzi' : ob.tipo, L }); continue; }
      const s = volontaMandato(st, n, ob, best, opt);
      // la posta (la bisca): senza soldi per cominciare non si comincia
      if (best.x.posta && !(opt.pagato >= best.x.posta)) { res.push({ ob, esito: 'contratta', tipo: 'soldi', contro: { tipo: 'soldi', quanto: best.x.posta }, best, s }); continue; }
      // il tempo: se il metodo migliore (pulito) è troppo lento per la scadenza, vuole più tempo
      const giorni = Math.max(.5, (ob.entro - st.t) / 1440), perGiorno = best.x.stima ? best.x.stima(st, n) * (best.x.id === 'turni' ? 1.4 : 1) : ob.quanto, servono = ob.tipo === 'soldi' ? Math.ceil(ob.quanto / Math.max(1, perGiorno)) : 1;
      if (ob.tipo === 'soldi' && servono > giorni * 2.2 && s < .7) { res.push({ ob, esito: 'contratta', tipo: 'tempo', contro: { tipo: 'tempo', giorni: Math.min(7, Math.ceil(servono / 1.5)) }, best, s, motivo: ob.vincoli.pulito ? 'Pulito' : 'Così in fretta' }); continue; }
      if (s >= .15) res.push({ ob, esito: 'accetta', best, s, iaM: iaOk });
      else if (s >= -.1) res.push({ ob, esito: 'contratta', tipo: trustOf(st, n) < .3 ? 'fiducia' : '_', best, s });
      else res.push({ ob, esito: 'rifiuta', tipo: ob.tipo, best, s });
    }
    // si fa partire quello che si accetta, poi si parla
    const fatti = [];
    res.filter(x => x.esito === 'accetta').forEach(x => {
      const m = nuovoMandato(st, n, x.ob, x.best, { canale: opt.canale, posta: opt.pagato || 0, fasiIA: x.iaM && Array.isArray(x.iaM.fasi) ? x.iaM.fasi.slice(0, 6) : [] });
      x.mandato = m; fatti.push(m);
      const metW = x.best.x.etichetta, poi = x.best.x.poi === 'vendi_roba' && mezzoDi(st, n) ? 'Se non basta, vendo la Vespa.' : '';
      let pl = riempi(pickR(st, MB.piano), { metodo: metW, poi });
      if (x.iaM && x.iaM.battute && x.iaM.battute.piano && !/\b(cento mila|in un ora)\b/.test(norm(x.iaM.battute.piano))) pl = clip(x.iaM.battute.piano);
      m.rapporti.push({ t: st.t, testo: pl, k: 'piano', chi: n.id });
      x.piano = pl;
    });
    const contr = res.find(x => x.esito === 'contratta' && x.contro);
    if (contr) Mx.pend[n.id] = { mandato: lista, contro: contr.contro, t: st.t, thread: opt.canale === 'banda' ? 'banda' : n.id };
    // la battuta: dall'esito vero (l'IA solo se non promette a vuoto)
    const qW = ob => (ob.tipo === 'soldi' ? (ob.quanto >= 100 && ob.quanto % 100 === 0 ? (ob.quanto === 100 ? 'cento' : `${ob.quanto / 100} volte cento`) : String(ob.quanto)) : numW(ob.quanto));
    const parti = res.map(x => {
      const iaB = x.iaM && x.iaM.battute ? x.iaM.battute[x.esito] : null;
      if (iaB && (x.esito === 'accetta' || !promette(iaB))) return clip(iaB) + (x.piano && x.esito === 'accetta' ? ' ' + x.piano : '');
      if (iaB && x.esito !== 'accetta' && promette(iaB)) Mx.stats.guardia++;
      if (x.esito === 'accetta') return riempi(pickR(st, MB.accetta[x.ob.tipo] || MB.accetta._), { quanto: qW(x.ob) }) + ' ' + x.piano;
      if (x.esito === 'contratta') return riempi(pickR(st, MB.contratta[x.tipo] || MB.contratta._), { soldi: x.contro && x.contro.tipo === 'soldi' ? numW(x.contro.quanto) : '', quando: G.isNight(st) ? 'stanotte' : 'stanotte', giorni: x.contro && x.contro.giorni ? numW(x.contro.giorni) : 'sette', motivo: x.motivo || 'Così' });
      if (x.esito === 'niente') return 'Ci sto già lavorando. Abbi pazienza.';
      return pickR(st, MB.rifiuta[x.tipo] || MB.rifiuta._);
    });
    let say = parti.length > 1 && res.some(x => x.esito === 'accetta') && res.some(x => x.esito !== 'accetta')
      ? res.map((x, i) => (x.esito === 'accetta' ? `${cap1(MANDATI[x.ob.tipo].label.split(' ')[0])} sì.` : `${cap1(MANDATI[x.ob.tipo].label.split(' ')[0])} no${x.esito === 'contratta' ? ', non così' : ''}.`)).join(' ') + ' ' + parti.find((p, i) => res[i].esito === 'accetta')
      : parti.join(' ');
    const esito = res.some(x => x.esito === 'accetta') ? 'accetta' : res.some(x => x.esito === 'contratta') ? 'contratta' : res.some(x => x.esito === 'niente') ? 'niente' : 'rifiuta';
    if (esito !== 'accetta' && promette(say)) { Mx.stats.guardia++; say = pickR(st, MB.contratta._); }
    return { say: clip(say, 260), esito, mandati: fatti, mandato: fatti[0] || null, res, contro: contr ? contr.contro : null };
  }
  Parola.rispondiMandato = rispondiMandato;
  // ---- le fasi per gli abitanti (Azioni): turno in più, colletta, bisca; i soldi vanno nella cassa, contati ----
  function faseTurnoA(st, n) {
    const ms = mestiereDi(n); if (!ms || !ms.t) return null;
    const h = G.hour(st); if (h < 8 || h > 20) return null;
    return { A: [{ label: `fa un turno in più a ${ms.t.label || 'lavoro'}`, at: () => ms.t, dur: 180, inside: true, act: (s2, n2, E2) => { const g = Math.round(ms.pay * 3); E2.__reso = g; s2.ris.cassa += g; E2.__ok = true; return 'next'; } }], label: 'un turno in più', cosa: 'turno' };
  }
  function faseCollettaA(st, n) {
    const h = G.hour(st); if (h < 9 || h > 20) return null;
    const tp = PLACES.piazza; return { A: [{ label: 'va a fare la colletta in piazza', at: () => tp, dur: 0, outside: true }, { label: 'fa la colletta in piazza', dur: 120, act: (s2, n2, E2) => { const g = Math.round((2 + s2.ris.morale / 7) * 2 * (.6 + n2.tr.loq * .6)); E2.__reso = g; s2.ris.cassa += g; s2.ris.repr = clamp(s2.ris.repr + 1, 0, 100); E2.__ok = true; return 'next'; } }], label: 'la colletta in piazza', cosa: 'colletta' };
  }
  function faseBiscaA(st, n) {
    if (!G.isNight(st)) return null; const tp = PLACES.flipper || PLACES.osteria;
    return { A: [{ label: `va alla bisca (${tp.name})`, at: () => tp, dur: 0, inside: true }, { label: 'gioca a carte', dur: 120, act: (s2, n2, E2) => { const g = Math.round(rnd(s2) * 80 - 25 + n2.tr.avid * 10); E2.__reso = g; s2.ris.cassa += g; E2.__ok = true; return 'next'; } }], label: 'la bisca', cosa: 'bisca', notte: true };
  }
  // ---- reclutare (con la prudenza e gli Orecchi veri) ----
  function faseRecluta(st, n, m, met) {
    const gia = new Set(m.reclutati.concat(m.esclusi, m.fasi.filter(f => f.cand && f.stato !== 'fallita').map(f => f.cand)));
    const tent = {}; m.fasi.forEach(f => { if (f.cand) tent[f.cand] = (tent[f.cand] || 0) + 1; });
    const altri = new Set(S(st).mandati.filter(x => x !== m && x.stato === 'in_corso' && x.tipo === 'recluta').flatMap(x => x.fasi.map(f => f.cand)));
    const ok = k => k && !k.dead && k !== n && k.pop && !k.cop && !isM(k) && !(k.jailedUntil > st.t) && !(RS.CARDS[k.id] && RS.CARDS[k.id].antag) && !k.driver && !(RS.card(k).never || []).includes('unisciti') && (tent[k.id] || 0) < 2 && !altri.has(k.id);
    let L = met.cand(st, n).concat(((n.pop && n.pop.friends) || []).map(id => G.byId(st, id)).filter(k => k && k.ris && k.ris.ideo > .5)).filter((k, i, a) => a.indexOf(k) === i).filter(ok);
    if (!L.length) L = st.npcs.filter(ok).filter(k => (k.ris ? k.ris.ideo : 0) > .5).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y)).slice(0, 8);
    L.forEach(k => k && RS.initNpc(st, k));
    const k = L.filter(x => !gia.has(x.id) || (tent[x.id] || 0) < 2).sort((a, b) => (b.ris.ideo + (b.pop.lost ? .2 : 0) + ((n.pop && (n.pop.friends || []).includes(b.id)) ? .5 : 0)) - (a.ris.ideo + (a.pop.lost ? .2 : 0) + ((n.pop && (n.pop.friends || []).includes(a.id)) ? .5 : 0)))[0];
    if (!k) return null;
    // la prudenza: prima un giorno (qualche ora) dietro al candidato
    const prudente = m.vincoli.prudenza || (n.tr.cor < .45 && n.tr.loq < .45);
    if (prudente && !m.fasi.some(f => f.cand === k.id && f.cosa === 'pedina' && f.stato === 'fatta')) return isM(n) ? { verbo: 'pedina', args: { persona: k.id, ore: 2 }, cand: k.id, cosa: 'pedina' } : null;
    return isM(n) ? { verbo: 'recluta_m', args: { persona: k.id, mandato: m.id }, cand: k.id, cosa: 'recluta' } : { A: stepsReclutaA(st, n, k, m), label: `parla con ${k.first}`, cand: k.id, cosa: 'recluta' };
  }
  const spiaVera = k => !!(k && (RS.card(k).informer || (k.pop && k.pop.giro === 'orecchio')));
  function tentaRecluta(st, n, k, m) {
    RS.initNpc(st, k);
    if (spiaVera(k)) {
      // un Orecchio dice sempre di sì: entra, e gli Orecchi sanno
      if (RS.join(st, k, `reclutato da ${nome(n)} (mandato ${m.id})`) === false) return { ok: false, msg: `${k.first} ci sta, ma siamo al completo.` };
      st.ris.repr = clamp(st.ris.repr + 15, 0, 100); st.ris.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo + .3, 0, 1); });
      m.conseguenze.push({ t: st.t, testo: `${k.first} è entrato: parla con gli Orecchi`, k: 'orecchio', nascosta: true }); m.reclutati.push(k.id);
      return { ok: true, msg: `${k.first} ci sta. Subito, senza pensarci.` };
    }
    const bonus = (m.metodo && m.metodo.id === 'famiglie' && k.pop.lost ? .15 : 0) + (n.pop && (n.pop.friends || []).includes(k.id) ? .1 : 0) + n.tr.loq * .1;
    const ch = k.ris.ideo * .6 + st.ris.morale / 200 + (k.ris.missionDone ? .3 : 0) + (isM(n) ? n.ris.loyalty * .15 : 0) + k.ris.bond * .3 + bonus - .3 + (k.__tent ? .15 : 0);
    k.__tent = (k.__tent || 0) + 1;
    if (rnd(st) < ch) { if (RS.join(st, k, `reclutato da ${nome(n)} (mandato ${m.id})`) === false) return { ok: false, msg: `${k.first} ci sta, ma siamo al completo.` }; m.reclutati.push(k.id); return { ok: true, msg: `${k.first} è dei nostri.` }; }
    k.ris.bond = clamp(k.ris.bond + .05, -.5, .6); return { ok: false, msg: `${k.first} ci pensa. Non ancora.`, pensa: true };
  }
  RS.EXT.plan.push((st, n, verb, a) => {
    if (verb !== 'recluta_m') return null;
    const k = G.byId(st, a.persona); if (!k || k.dead) return { err: 'Reclutare chi?' };
    return { steps: [{ k: 'meet', who: k.id }, { k: 'do', fn: 'pa_recluta', who: k.id, mandato: a.mandato }], desc: `prova a portare dentro ${k.first}` };
  });
  RS.VERBS.recluta_m = RS.VERBS.recluta_m || { label: 'recluta', risk: .1, task: true, pol: true, args: 'persona', desc: 'prova a portare dentro una persona (per un mandato)' };
  RS.EXT.do.pa_recluta = (st, n, T, s) => { const m = S(st).mandati.find(x => x.id === s.mandato), k = G.byId(st, s.who); if (!m || !k) return { ok: false, msg: 'Non l\'ho trovato.' }; const r0 = tentaRecluta(st, n, k, m); T.__recl = r0; return r0.pensa ? { ok: true, msg: r0.msg } : r0; };
  function stepsReclutaA(st, n, k, m) {
    return [{ label: `va a parlare con ${k.first}`, at: () => ({ x: k.x, y: k.y, label: k.first }), dur: 0, outside: true }, { label: `parla con ${k.first}`, dur: 10, act: (s2, n2, E2) => { if (dist(n2.x, n2.y, k.x, k.y) > 6 && !k.inside) { E2.phase = 'go'; E2.goal = null; return 'wait'; } E2.__recl = tentaRecluta(s2, n2, k, m); E2.__ok = true; return 'next'; } }];
  }
  // ---- le fasi subito: vendere la Vespa, il prestito, la trama dello scasso, versare quello che ha preso ----
  function vendiMezzo(st, n, m, F) {
    const v = mezzoDi(st, n); if (!v) return { ok: false, msg: 'Non ho più niente da vendere.' };
    const prezzo = Math.round((v.kind === 'vespa' || v.kind === 'moto' ? 60 : 140) + rnd(st) * 20);
    const buyer = st.npcs.filter(k => k !== n && k.pop && k.pop.ints && !k.dead && !k.cop && (k.pop.money || 0) >= prezzo && !st.vehicles.some(w => w.owner === k.id) && !isM(k)).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0];
    if (!buyer) return { ok: false, msg: 'Nessuno ha i soldi per la mia Vespa.' };
    buyer.pop.money -= prezzo; v.owner = buyer.id; st.ris.cassa += prezzo; F.reso = prezzo; F.compratore = buyer.id;
    m.conseguenze.push({ t: st.t, testo: `${nome(n)} ha venduto la ${v.kind === 'vespa' ? 'Vespa' : 'macchina'} a ${buyer.first}: adesso va a piedi`, k: 'mezzo' });
    note(st, n, `ha venduto la sua ${v.kind === 'vespa' ? 'Vespa' : 'macchina'} a ${buyer.first} per la cassa (${prezzo}.000)`, 'info', { w: .6, tag: 'mandato' });
    note(st, buyer, `ha comprato la ${v.kind === 'vespa' ? 'Vespa' : 'macchina'} di ${n.first}`, 'good', { w: .4, who: n.id });
    return { ok: true, msg: `Venduta a ${buyer.first}. ${numW(prezzo === 70 ? 70 : prezzo)}. Ha contrattato come se fosse sua madre.`.replace(/^(.)/, c => c) };
  }
  function prestito(st, n, m, F) {
    if (!n.pop || n.pop.debt) return { ok: false, msg: 'Lo Squalo con me ha già un conto aperto.' };
    const q = 60; n.pop.debt = { to: 'sandro', amount: Math.round(q * 1.5) }; st.ris.cassa += q; F.reso = q;
    m.conseguenze.push({ t: st.t, testo: `${nome(n)} deve ${Math.round(q * 1.5)}.000 lire allo Squalo`, k: 'debito' });
    return { ok: true, msg: `Sessanta dallo Squalo. Ne vuole novanta. Il giovedì all'alba, come tutti.` };
  }
  // la trama di Trame: lo scasso con lui capo (Trame accetta trame da fuori nella sua lista: stesso schema, stessi complici)
  function tramaScasso(st, n, m, F) {
    if (typeof Trame === 'undefined' || !Trame.list || !Eco()) return { ok: false, msg: 'Non ho trovato con chi farlo.' };
    const crew = complici(st, n); if (crew.length < 2) return { ok: false, msg: 'Da solo non lo faccio.' };
    const E = Eco().eco(st), job = n.pop.job && n.pop.job.t && Po() ? Po()._.tkey(n.pop.job.t) : '';
    const shops = Object.values(E.shops).filter(Sh => Sh.t && Sh.t.k === 'b' && !Sh.black && Sh.cash > 20 && Sh.k !== job).sort((a, b) => b.cash - a.cash);
    const Sh = shops[Math.floor(rnd(st) * Math.min(3, shops.length))]; if (!Sh) return { ok: false, msg: 'Non c\'è un posto che valga la pena.' };
    const TS = st.trame || (Trame.list(st), st.trame);
    const day = dayIdx(st.t) + (G.hour(st) >= 1 ? 1 : 0), t = day * 1440 + (1 + Math.floor(rnd(st) * 2)) * 60;
    const T = { kind: 'scasso', leader: n.id, tgt: Sh.t, shop: Sh.k, t, label: 'un lavoretto di notte', pool: crew.slice(0, 6).map(k => k.id), need: 1, max: 3, dur: 60, roles: { [n.id]: 'scassina' }, id: 't' + TS.next++, members: [n.id], asked: [n.id], status: 'cerca', born: st.t, mandato: m.id };
    TS.list.push(T); TS.stats.nate++;
    const P = n.pop; P.impegni = (P.impegni || []).filter(e => e.id !== T.id); P.impegni.push({ id: T.id, t: T.t, dur: 60, tgt: T.tgt, label: T.label, obj: null });
    if (Po() && dayIdx(T.t) === dayIdx(st.t)) Po().planDay(st, n, dayIdx(st.t));
    note(st, n, `ha in mente un colpo a ${T.tgt.label} (per ${NAME()})`, 'shady', { w: .5, tag: 'trama' });
    F.trama = T.id; F.money0 = n.pop.money; F.attesa = T.t + 60;
    return { ok: true, msg: `Sono passato davanti a ${T.tgt.label}. Il padrone chiude alle sette e si fida della serranda.`, aspetta: true };
  }
  function versa(st, n, m, F) {
    const tr = m.fasi.find(f => f.cosa === 'trama'); const T = tr && st.trame && st.trame.list.find(x => x.id === tr.trama);
    if (!T || T.status === 'cerca' || T.status === 'pronta') return { ok: false, aspetta: true };
    if (n.jailedUntil > st.t) return { ok: false, msg: 'Mi hanno preso.' };
    const guadagno = Math.max(0, Math.round((n.pop.money || 0) - (tr.money0 || 0)));
    if (T.status !== 'fatta' || guadagno < 1) return { ok: false, msg: T.status === 'fatta' ? 'È andata storta. Niente.' : 'Gli altri non sono venuti.' };
    const q = Math.round(guadagno * .8); n.pop.money -= q; st.ris.cassa += q; F.reso = q;
    return { ok: true, msg: `${cap1(numW(q))}. Il resto è roba, la vendo al Magazzino.` };
  }
  const SUBITO = { vendi_mezzo: vendiMezzo, prestito, trama: tramaScasso, versa, rapina: (st, n, m, F) => (Parola.rapina ? Parola.rapina.daMandato(st, n, m, F) : { ok: false, msg: 'No.' }) };
  // ---- il ciclo: ogni ora la fase dopo, il progresso dallo stato, alle 22 la revisione, la fine ----
  const libero = (st, n) => {
    if (n.dead || n.jailedUntil > st.t) return false;
    if (isM(n)) return !(n.ris.task && n.ris.task.src !== 'autonomia') && !impegnato(st, n);
    const P = n.pop; if (!P) return false;
    if (P.emer) return false; if (P.cur && (P.cur.act === 'lavoro' || P.cur.act === 'sonno')) return false;
    return !impegnato(st, n);
  };
  function faseAttiva(m) { return m.fasi.find(f => f.stato === 'in_corso' || f.stato === 'attesa'); }
  function avviaFase(st, n, m) {
    const Mx = S(st);
    let met = (MET[m.tipo] || []).find(x => x.id === (m.metodo && m.metodo.id)); if (!met) return 'nessun_metodo';
    // le fasi proposte dall'IA prima, se passano (un verbo che non c'è o vietato si toglie)
    let D = null;
    while (m.fasiIA && m.fasiIA.length && !D) {
      const x = m.fasiIA.shift(); const v = x && norm(x.verbo || '').replace(/\s+/g, '_');
      if (!v || !RS.VERBS[v] || (RS.VERBS[v].illegal && (m.vincoli.pulito || n.tr.legge > .6)) || (RS.card(n).never || []).includes(v) || (met.verbi.length && !met.verbi.includes(v))) { Mx.stats.guardia++; Mx.stats.fasiScartate = (Mx.stats.fasiScartate || 0) + 1; continue; }
      D = { verbo: v, args: intentoDaIA(st, n, { verbo: v, args: x.args || {} }, '').args };
    }
    if (!D) D = met.fase(st, n, m);
    if (!D) return 'finito';
    if (D.notte && !G.isNight(st)) return 'aspetta';
    const F = { i: m.fasi.length, cosa: D.cosa || D.verbo || 'fase', args: D.args || {}, metodo: met.id, t0: st.t, stato: 'in_corso', stima: met.stima ? met.stima(st, n) : 0, cand: D.cand || null };
    if (D.subito) {
      m.fasi.push(F);
      const r0 = SUBITO[D.subito](st, n, m, F);
      if (r0.aspetta && r0.ok === false) { m.fasi.pop(); return 'aspetta'; }
      F.stato = r0.ok ? (r0.aspetta ? 'attesa' : 'fatta') : 'fallita'; F.msg = r0.msg; F.t1 = st.t;
      if (r0.msg) rapporto(st, m, r0.ok ? 'parziale' : 'parziale', r0.msg, n.id);
      return r0.ok ? 'ok' : 'fallita';
    }
    if (D.A) {
      const A0 = Az(); if (!A0 || !n.pop) return 'fallita';
      const Ep = A0.startPlan(st, n, 'mandato', D.label, D.A, 1.6); if (!Ep) return 'aspetta';
      Ep.onEnd = (s2, n2, why) => { Ep.__end = why; };
      const p = nuovaPromessa(st, { chi: n.id, a: 'player', verbo: 'mandato', desc: D.label, link: { tipo: 'piano', obj: Ep }, stato: 'in_corso', scadenza: st.t + 300, thread: m.thread, canale: m.canale, mandato: m.id });
      Ep.pid = p.id; F.promessa = p.id; F.ep = Ep; m.fasi.push(F);
      return 'ok';
    }
    // un compito della Risacca: la stessa verifica (con un po' di volontà in più: il mandato l'ha preso)
    const I = mk(D.verbo, Object.assign({}, D.args), { fonte: 'mandato' });
    if (D.verbo === 'recluta_m' || D.verbo === 'pedina') I.args.persona = D.args.persona;
    const V = RS.VERBS[D.verbo] || {};
    if (V.illegal && m.vincoli.pulito) { F.stato = 'fallita'; F.msg = 'vietato dal mandato'; m.fasi.push(F); return 'fallita'; }
    let E = verifica(st, n, I, { malus: -.3 });
    // il mandato l'ha preso: un «mah» sulla singola fase (fiducia, soldi, paura) non lo ferma, la fa a modo suo
    if (E.esito === 'contratta' && E.motivo && !['notte', 'occupato', 'lavoro', 'pericolo', 'quando', 'stanco', 'fame', 'prova'].includes(E.motivo.tipo)) E = Object.assign({}, E, { esito: 'accetta', contro: null });
    if (E.esito !== 'accetta') {
      if (E.motivo && ['notte', 'occupato', 'lavoro', 'pericolo', 'quando'].includes(E.motivo.tipo)) return 'aspetta';
      if (E.motivo && E.motivo.tipo === 'stanco') { RS.assign(st, n, 'dormi', { ore: 6 }, 'mandato'); return 'aspetta'; }
      if (E.motivo && E.motivo.tipo === 'fame' && isM(n)) { RS.assign(st, n, n.ris.sete > n.ris.fame ? 'bevi' : 'mangia', {}, 'mandato'); return 'aspetta'; }
      F.stato = 'fallita'; F.msg = E.motivo ? E.motivo.testo : 'non si può'; m.fasi.push(F); return 'fallita';
    }
    const r0 = impegna(st, n, I, E, m.canale === 'banda' ? 'banda' : 'chat');
    if (!r0 || !r0.ok || !r0.promessa) { F.stato = 'fallita'; F.msg = (r0 && r0.msg) || 'non è partito'; m.fasi.push(F); return 'fallita'; }
    const p = r0.promessa; p.mandato = m.id; p.thread = m.thread; p.canale = m.canale; F.promessa = p.id; F.T = p.link && p.link.obj; m.fasi.push(F);
    return 'ok';
  }
  // una fase finita: quanto ha reso davvero (il motore lo sa), e il rapporto con i numeri
  function resoDi(st, p) {
    const L = p.link || {};
    if (L.tipo === 'task' && L.obj && typeof L.obj.earned === 'number') return Math.round(L.obj.earned);
    if (L.tipo === 'piano' && L.obj && typeof L.obj.__reso === 'number') return L.obj.__reso;
    const mm = String(p.esito_msg || '').match(/([+−-])\s?(\d+)\.000/); if (mm) return (mm[1] === '+' ? 1 : -1) * +mm[2];
    const mp = String(p.esito_msg || '').match(/perso (\d+)\.000/); if (mp) return -mp[1];
    return 0;
  }
  function fineFase(st, p) {
    const m = S(st).mandati.find(x => x.id === p.mandato); if (!m) return;
    const F = m.fasi.find(f => f.promessa === p.id); if (!F || (F.stato !== 'in_corso' && F.stato !== 'attesa')) return;
    F.stato = p.stato === 'fatta' ? 'fatta' : 'fallita'; F.t1 = st.t; F.msg = p.esito_msg;
    const n = G.byId(st, m.chi);
    if (m.obiettivo.misura === 'reso') { F.reso = resoDi(st, p); }
    const T = p.link && p.link.obj;
    if (F.cosa === 'recluta' && T && (T.__recl || (p.link.obj && p.link.obj.__recl))) F.recl = T.__recl;
    if (F.cosa === 'pedina' && F.cand && F.stato === 'fatta') { const k = G.byId(st, F.cand); if (spiaVera(k)) { m.esclusi.push(k.id); rapporto(st, m, 'parziale', `Lascia stare ${k.first}: l'ho vist${o(k)} parlare con chi non deve. Quell${o(k)} porta le orecchie in giro.`, m.chi); return; } }
    if (F.cosa === 'sorveglia' && m.tipo === 'orecchio' && F.stato === 'fatta') trovaOrecchio(st, m, n);
    if (m.tipo === 'sapere' && F.cosa === 'pedina' && F.stato === 'fatta') { m.saputo = true; m.sapereTesto = p.esito_msg; }
    const fatto = misura(st, m); m.progresso.fatto = fatto;
    if (m.obiettivo.misura === 'reso' && (F.reso || F.stato === 'fatta')) {
      const q = F.reso || 0; if (!q && F.stato !== 'fatta') return;
      const txt = q < 0 ? riempi(pickR(st, MB.parziale_perso), { q: numW(-q), fatto: numW(fatto) }) : q > 0 ? riempi(pickR(st, MB.parziale_soldi), { q: numW(q), fatto: numW(fatto), su: numW(m.obiettivo.quanto) }) : null;
      if (txt) rapporto(st, m, 'parziale', txt, m.chi);
      if (q < 0) m.conseguenze.push({ t: st.t, testo: `${nome(n)} ha perso ${lireN(-q)} lire ${F.metodo === 'bisca' ? 'alla bisca' : ''}`.trim(), k: 'perdita' });
    } else if (m.tipo === 'recluta' && F.cosa === 'recluta') {
      const r0 = F.recl || (p.link && p.link.obj && p.link.obj.__recl);
      if (r0 && r0.msg) rapporto(st, m, 'parziale', r0.msg + (fatto && fatto < m.obiettivo.quanto ? ` Siamo a ${numW(fatto)}.` : ''), m.chi);
    }
  }
  function trovaOrecchio(st, m, n) {
    const sosp = RS.members(st).filter(k => k !== n && spiaVera(k));
    const vicini = st.npcs.filter(k => spiaVera(k) && !k.dead && G.byId(st, 'zia') && dist(k.x, k.y, G.byId(st, 'zia').x, G.byId(st, 'zia').y) < 30);
    const k = sosp[0] || (rnd(st) < .4 ? vicini[0] : null);
    if (k) { m.trovato = k.id; rapporto(st, m, 'parziale', `È ${k.first}. ${isM(k) ? 'Uno dei nostri.' : ''} Lo sapevo dalle scarpe: troppo pulite per uno che lavora.`, n.id); }
    else rapporto(st, m, 'parziale', 'Alla Zia parlano in tanti. Nessuno dei nostri, per ora.', n.id);
  }
  function chiudiMandato(st, m, stato) {
    if (m.stato !== 'in_corso') return;
    m.stato = stato; m.fine = st.t; const n = G.byId(st, m.chi);
    m.progresso.fatto = misura(st, m);
    const f = m.progresso.fatto, su = m.obiettivo.quanto;
    const storia = m.fasi.filter(x => x.stato === 'fatta' && x.reso).map(x => `${x.cosa === 'vendi_mezzo' ? 'la Vespa' : x.cosa === 'bisca' ? 'la bisca' : x.cosa} ${x.reso > 0 ? '+' : ''}${x.reso}`).join(', ');
    const cons = m.conseguenze.filter(c => !c.nascosta).map(c => c.testo).join('. ');
    const cosaW = m.tipo === 'soldi' ? 'Cassa' : MANDATI[m.tipo].label;
    const fW = m.tipo === 'soldi' ? `${f >= 0 ? '+' : ''}${f}.000` : String(f), suW = m.tipo === 'soldi' ? `${su}.000` : String(su);
    let txt;
    if (stato === 'riuscito') txt = `${cosaW}: ${fW} su ${suW}.${storia ? ' ' + cap1(storia) + '.' : ''}${cons ? ' ' + cons + '.' : ''}`;
    else if (stato === 'riuscito_in_parte') txt = `${cap1(fW)} su ${suW}. Il resto non c'è, e non lo invento.${cons ? ' ' + cons + '.' : ''}`;
    else if (stato === 'fallito') txt = `Niente da fare: ${fW} su ${suW}.${cons ? ' ' + cons + '.' : ''}`;
    else if (stato === 'abbandonato') txt = `Lascio perdere: ${m.motivoFine || 'non ho più idee'}. ${fW} su ${suW}.`;
    else txt = `Lascio stare, come hai detto.`;
    if (stato !== 'annullato') rapporto(st, m, stato === 'riuscito' ? 'finale' : stato === 'fallito' || stato === 'abbandonato' ? 'fallito' : 'finale', txt, m.chi);
    m.finale = txt;
    if (n) {
      if (stato === 'riuscito') { if (isM(n)) n.ris.loyalty = clamp(n.ris.loyalty + .04, 0, 1); n.ris.bond = clamp(n.ris.bond + .05, -.5, .6); note(st, n, `ha portato a termine quello che gli aveva chiesto ${NAME()}: ${m.label.toLowerCase()}`, 'good', { w: .55, who: 'player', tag: 'mandato' }); if (Po()) RS.members(st).forEach(k => { if (k !== n) note(st, k, `${nome(n)} ci è riuscito: ${m.label.toLowerCase()}`, 'good', { w: .3, who: n.id, tag: 'mandato' }); }); }
      else if (stato === 'fallito' || stato === 'abbandonato') note(st, n, `non ce l'ha fatta: ${m.label.toLowerCase()}`, 'bad', { w: .4, who: 'player', tag: 'mandato' });
    }
    if (m.parent) { const P = S(st).mandati.find(x => x.id === m.parent); if (P) aggiornaBanda(st, P); }
  }
  function revisione(st, m, n) {
    // la revisione delle 22: se il metodo rende meno della metà della stima, se ne prova un altro (e lo dice)
    const met = (MET[m.tipo] || []).find(x => x.id === (m.metodo && m.metodo.id)); if (!met) return;
    const mie = m.fasi.filter(f => f.metodo === met.id && (f.stato === 'fatta' || f.stato === 'fallita'));
    const resa = mie.reduce((s, f) => s + (f.reso || 0), 0), attesa = mie.length * (met.stima ? met.stima(st, n) : 0);
    const giorni = Math.max(0, (m.vincoli.entro - st.t) / 1440), fatto = misura(st, m), su = m.obiettivo.quanto;
    let cambia = null;
    if (m.tipo === 'soldi' && met.poi && fatto + (mie.length ? resa / Math.max(1, (st.t - m.t0) / 1440) : met.stima(st, n)) * giorni < su * .95) cambia = met.poi;
    if (!cambia && mie.length >= 2 && resa < attesa * .5) cambia = 'next';
    if (!cambia && mie.filter(f => f.stato === 'fallita').length >= 3 && mie.every(f => f.stato === 'fallita')) cambia = 'next';
    if (!cambia) return;
    const L = metodi(st, n, m.tipo, m.vincoli, m).filter(x => !x.no && !m.provati.includes(x.id));
    const nuovo = cambia === 'next' ? L[0] : L.find(x => x.id === cambia) || L[0];
    if (!nuovo) return;
    const vecchio = m.metodo.etichetta;
    m.metodo = { id: nuovo.id, etichetta: nuovo.x.etichetta, perche: nuovo.perche }; m.provati.push(nuovo.id);
    if (nuovo.id === 'rapina') { m.metodo.proposta = true; }
    rapporto(st, m, 'cambio', nuovo.id === 'vendi_roba' && mezzoDi(st, n) ? pickR(st, MB.cambio_vespa) : nuovo.id === 'rapina' ? 'Così non rende. Ho un\'idea per la cassa. Non ti piacerà.' : riempi(pickR(st, MB.cambio), { metodo0: cap1(vecchio), metodo: nuovo.x.etichetta, a_metodo: aMet(nuovo.x.etichetta) }), m.chi);
  }
  function tickMandati(st) {
    const Mx = S(st), hm = Math.floor(st.t / 60);
    if (Mx.oraM === undefined) Mx.oraM = hm;
    const nuovaOra = hm > Mx.oraM, ore22 = nuovaOra && hm % 24 === 22; if (nuovaOra) Mx.oraM = hm;
    for (const m of Mx.mandati) {
      if (m.stato !== 'in_corso' || m.chi === 'banda') continue;
      const n = G.byId(st, m.chi); if (!n || n.dead) { m.motivoFine = 'non c\'è più'; chiudiMandato(st, m, 'abbandonato'); continue; }
      // le fasi «in attesa» (la trama): si guarda come va
      const att = m.fasi.find(f => f.stato === 'attesa');
      if (att && att.cosa === 'trama' && st.t >= (att.attesa || 0)) { const T = st.trame && st.trame.list.find(x => x.id === att.trama); att.stato = T && T.status === 'fatta' ? 'fatta' : 'fallita'; if (T && T.status !== 'fatta') { rapporto(st, m, 'parziale', T.status === 'annullata' ? 'Gli altri si sono tirati indietro. Niente colpo.' : 'È andata storta. Siamo scappati.', n.id); } if (n.jailedUntil > st.t) m.conseguenze.push({ t: st.t, testo: `${nome(n)} in cella`, k: 'cella' }); }
      if (att && att.cosa === 'rapina' && Parola.rapina) Parola.rapina.tickFase(st, n, m, att);
      if (n.jailedUntil > st.t && !m.__cella) { m.__cella = true; m.conseguenze.push({ t: st.t, testo: `${nome(n)} in cella`, k: 'cella' }); const fa = faseAttiva(m); if (fa) { fa.stato = 'fallita'; fa.msg = 'arrestato'; } }
      if (!(n.jailedUntil > st.t)) m.__cella = false;
      // proteggere: un danno vero alla persona (in cella, ferita, morta) o alla base (perduta) fa fallire il mandato
      if (m.obiettivo.misura === 'proteggi' && !m.danno) { const k = m.obiettivo.persona && G.byId(st, m.obiettivo.persona), b = m.obiettivo.base && st.ris.bases.find(x => x.id === m.obiettivo.base); if ((k && (k.dead || k.jailedUntil > st.t || (k.hp !== undefined && k.hp < 50))) || (b && !b.alive)) { m.danno = st.t; m.conseguenze.push({ t: st.t, testo: k ? `a ${k.first} è successo qualcosa` : `${b.name} è perduta`, k: 'danno' }); chiudiMandato(st, m, 'fallito'); continue; } }
      const fatto = misura(st, m); m.progresso.fatto = fatto;
      if (fatto >= m.obiettivo.quanto && m.obiettivo.misura !== 'proteggi') { chiudiMandato(st, m, 'riuscito'); continue; }
      // la posta persa alla bisca: senza soldi non si gioca più
      if (m.metodo && m.metodo.id === 'bisca' && m.posta && fatto <= -m.posta) { m.conseguenze.push({ t: st.t, testo: `${nome(n)} ha perso la posta alla bisca`, k: 'perdita' }); chiudiMandato(st, m, 'fallito'); continue; }
      if (st.t >= m.vincoli.entro) { const f = misura(st, m); chiudiMandato(st, m, m.obiettivo.misura === 'proteggi' ? (m.danno ? 'fallito' : 'riuscito') : f >= m.obiettivo.quanto * .5 ? 'riuscito_in_parte' : 'fallito'); continue; }
      if (!nuovaOra) continue;
      if (ore22) revisione(st, m, n);
      if (faseAttiva(m) || !libero(st, n)) continue;
      if (m.metodo && m.metodo.proposta && !m.metodo.si) continue;   // la rapina aspetta il sì del giocatore
      // i bisogni prima (chi è a pezzi dorme, chi ha fame mangia): non sono fasi
      if (isM(n) && (n.ris.fatigue > .75 || (G.hour(st) >= 1 && G.hour(st) < 6 && n.ris.fatigue > .45 && !m.metodo.id.match(/bisca|mercato_nero|scasso/)))) { RS.assign(st, n, 'dormi', { ore: 6 }, 'mandato'); continue; }
      if (isM(n) && (n.ris.fame > .7 || n.ris.sete > .7)) { RS.assign(st, n, n.ris.sete > n.ris.fame ? 'bevi' : 'mangia', {}, 'mandato'); continue; }
      const r0 = avviaFase(st, n, m);
      if (r0 === 'finito' || r0 === 'nessun_metodo' || (r0 === 'fallita' && m.fasi.filter(f => f.stato === 'fallita' && f.metodo === m.metodo.id).length >= 3)) {
        const L = metodi(st, n, m.tipo, m.vincoli, m).filter(x => !x.no && !m.provati.includes(x.id) && x.id !== 'rapina');
        if (L[0]) { const v0 = m.metodo ? m.metodo.etichetta : ''; m.metodo = { id: L[0].id, etichetta: L[0].x.etichetta, perche: L[0].perche }; m.provati.push(L[0].id); rapporto(st, m, 'cambio', riempi(pickR(st, MB.cambio), { metodo0: cap1(v0 || 'quello'), metodo: L[0].x.etichetta, a_metodo: aMet(L[0].x.etichetta) }), n.id); }
        else { m.motivoFine = r0 === 'finito' ? 'non mi resta niente da provare' : 'così non si può'; if (misura(st, m) >= m.obiettivo.quanto * .5) chiudiMandato(st, m, 'riuscito_in_parte'); else chiudiMandato(st, m, 'abbandonato'); }
      }
    }
    Mx.mandati.filter(m => m.chi === 'banda' && m.stato === 'in_corso').forEach(m => aggiornaBanda(st, m));
  }
  // ---- il mandato a tutta la banda (§0.6): si divide, si offrono, litigano, il referente riassume ----
  function mandatoBanda(st, text, lista, opt) {
    opt = opt || {}; const Mx = S(st), ia = opt.ia || null;
    const L = RS.members(st).filter(m => !Mx.mandati.some(x => x.chi === m.id && x.stato === 'in_corso'));
    const liberi = L.filter(m => disponibile(st, m)), muti = RS.members(st).filter(m => !liberi.includes(m));
    const out = { mandati: [], sotto: [], obiezioni: [], referente: null, offerte: [] };
    const presi = new Set();
    lista.forEach((ob0, iM) => {
      const ob = Object.assign({}, ob0, { vincoli: Object.assign(VINC0(), ob0.vincoli || {}) });
      const giorni = Math.max(.5, (ob.entro - st.t) / 1440);
      const cand = liberi.filter(m => !presi.has(m.id)).map(m => { const Lm = metodi(st, m, ob.tipo, ob.vincoli).filter(x => !x.no); const b = Lm[0]; if (!b) return null; const s = volontaMandato(st, m, ob, b) + b.sc; const cap = ob.tipo === 'soldi' ? Math.max(10, Math.round((b.x.stima ? b.x.stima(st, m) : 30) * giorni * 1.2)) : 1; return { m, b, s, cap, Lm }; }).filter(x => x && x.s > 0).sort((a, b) => b.s - a.s);
      const P = nuovoMandato(st, null, ob, null, { canale: 'banda' }); out.mandati.push(P);
      let resto = ob.quanto;
      for (const c of cand) {
        if (resto <= 0) break;
        if (ob.tipo !== 'soldi' && out.sotto.filter(x => x.parent === P.id).length >= ob.quanto) break;
        // troppi sullo stesso mestiere: due alla bisca, nessuno al lavoro
        if (out.sotto.some(x => x.parent === P.id && x.metodo.id === c.b.id && ['bisca', 'mercato_nero'].includes(c.b.id))) { const alt = c.Lm.find(x => x.id !== c.b.id); if (!alt) continue; c.b = alt; }
        const parte = ob.tipo === 'soldi' ? Math.min(resto, c.cap) : 1;
        out.offerte.push({ chi: c.m.id, mandato: iM, metodo: c.b.id, parte, s: c.s });
        presi.add(c.m.id); resto -= parte;
        const sm = nuovoMandato(st, c.m, Object.assign({}, ob, { quanto: parte }), c.b, { canale: 'banda', parent: P.id });
        P.sotto.push(sm.id); out.sotto.push(sm);
      }
      // se non basta, le parti si allargano fino all'obiettivo (le stime erano prudenti)
      const subs = out.sotto.filter(x => x.parent === P.id);
      if (resto > 0 && subs.length && ob.tipo === 'soldi') { const k = Math.ceil(resto / subs.length); subs.forEach((x, i) => { const add = Math.min(k, resto); x.obiettivo.quanto += add; x.progresso.su = x.obiettivo.quanto; resto -= add; }); }
      P.metodo = { id: 'divisione', etichetta: subs.map(x => `${nome(G.byId(st, x.chi))} ${x.metodo.etichetta}`).join(', '), perche: [] };
      if (!subs.length) { P.stato = 'annullato'; P.motivoFine = 'nessuno se la sente'; }
    });
    // le offerte, nell'ordine dei punteggi (prima chi è più adatto e volenteroso)
    const linee = { soldi: { turni: ['I soldi li faccio io. {Mestiere}.', 'Io faccio turni. Onesti, noiosi, pagati.'], vendi_roba: ['Io vendo qualcosa. Ho roba che non mi serve.'], colletta: ['Io faccio la colletta. La gente ci vuole bene, più o meno.'], mercato_nero: ['E io la mia parte stanotte al pontile.', 'Io vendo sottobanco. So a chi.'], scasso: ['Io conosco una serranda che si apre da sola, se la tocchi bene.'], bisca: ['Dammi una notte alla bisca e vedi.'], prestito: ['Io vado dallo Squalo. Non guardatemi così.'], rapina: ['Io avrei un\'idea. Non vi piacerà.'] }, recluta: { _: ['La gente la trovo io.', 'Io conosco due o tre arrabbiati. Ci parlo io.'] } };
    out.offerte.slice().sort((a, b) => b.s - a.s).slice(0, 5).forEach(o => {
      const m = G.byId(st, o.chi), tipo = lista[o.mandato].tipo, B = (linee[tipo] || {})[o.metodo] || (linee[tipo] || {})._ || MB.accetta._;
      const iaB = ia && Array.isArray(ia.mandati) ? ia.mandati.find(x => x.chi === o.chi && x.tipo === tipo) : null;
      const say = iaB && iaB.battute && iaB.battute.accetta && !/\b(cento mila)\b/.test(norm(iaB.battute.accetta)) ? clip(iaB.battute.accetta) : riempi(pickR(st, B), { mestiere: cap1(mestiereDi(m) ? (PLACES[mestiereDi(m).place] || {}).name || 'Officina' : 'Lavoro') });
      bandaPosta(st, m.id, say, { esito: 'accetta', mandato: true });
    });
    // le obiezioni vere: un metodo con rischio ≥ .6 e la linea Prudenza (o chi ha paura per tutti)
    out.sotto.forEach(sm => {
      const met = (MET[sm.tipo] || []).find(x => x.id === sm.metodo.id); if (!met || (met.rischio || 0) < .6 || out.obiezioni.length) return;
      if (st.ris.linea !== 'prudenza') return;
      const ex = G.byId(st, sm.chi), obj = RS.members(st).filter(k => k !== ex && disponibile(st, k)).sort((a, b) => (a.tr.cor - b.tr.cor) || (b.ris.loyalty - a.ris.loyalty))[0]; if (!obj) return;
      const testo = `${cap1(met.etichetta)} no. Se ti prendono, fanno una retata e prendono anche la roba degli altri.`;
      out.obiezioni.push({ chi: obj.id, contro: ex.id, testo }); bandaPosta(st, obj.id, testo, { obiezione: true });
      if (ex.tr.cor >= .5 && ex.ris.loyalty < obj.ris.loyalty) {
        const alt = metodi(st, ex, sm.tipo, sm.vincoli, sm).find(x => !x.no && (x.x.rischio || 0) < .6);
        if (alt) { sm.metodo = { id: alt.id, etichetta: alt.x.etichetta, perche: alt.perche }; sm.provati.push(alt.id); bandaPosta(st, ex.id, `Va be'. Niente ${met.etichetta.replace(/^(uno|una|il|la|lo) /, '')}. ${cap1(alt.x.etichetta)}.`, { k: 'cambio' }); }
      } else bandaPosta(st, ex.id, 'Lo faccio lo stesso. Starò attento.', { k: 'insiste' });
    });
    if (muti.length) bandaPosta(st, 'sys', `${muti.map(m => nome(m)).join(' e ')} non ${muti.length > 1 ? 'rispondono' : 'risponde'}.`);
    // il referente: lealtà e parlantina più alte
    const ref = RS.members(st).filter(m => disponibile(st, m)).sort((a, b) => (b.ris.loyalty + b.tr.loq) - (a.ris.loyalty + a.tr.loq))[0];
    if (ref && out.sotto.length) {
      const per = lista.map((ob, i) => { const ns = out.sotto.filter(x => x.parent === out.mandati[i].id).map(x => nome(G.byId(st, x.chi))); return ns.length ? `${ns.join(' e ')} ${ob.tipo === 'soldi' ? 'i soldi' : ob.tipo === 'recluta' ? 'la gente' : MANDATI[ob.tipo].label.toLowerCase()}` : null; }).filter(Boolean);
      const txt = `Allora: ${per.join(', ')}. ${out.sotto.some(x => x.chi === ref.id) ? 'E io' : 'Io'} controllo che nessuno faccia cazzate.`;
      out.referente = ref.id; out.mandati.forEach(P => { P.referente = ref.id; }); bandaPosta(st, ref.id, txt, { k: 'riepilogo' }); out.riepilogo = txt;
    }
    return out;
  }
  function aggiornaBanda(st, P) {
    const subs = P.sotto.map(id => S(st).mandati.find(x => x.id === id)).filter(Boolean);
    P.progresso.fatto = subs.reduce((s, x) => s + misura(st, x), 0); P.progresso.su = P.obiettivo.quanto;
    if (P.stato !== 'in_corso') return;
    if (subs.length && subs.every(x => x.stato !== 'in_corso')) {
      const f = P.progresso.fatto; P.stato = f >= P.obiettivo.quanto ? 'riuscito' : f >= P.obiettivo.quanto * .5 ? 'riuscito_in_parte' : 'fallito'; P.fine = st.t;
      const ref = G.byId(st, P.referente);
      const txt = `${P.label}: ${P.tipo === 'soldi' ? `${f}.000 su ${P.obiettivo.quanto}.000` : `${f} su ${P.obiettivo.quanto}`}. ${subs.map(x => `${nome(G.byId(st, x.chi))} ${misura(st, x)}`).join(', ')}.`;
      P.finale = txt; P.rapporti.push({ t: st.t, testo: txt, k: 'finale', chi: ref ? ref.id : 'sys' }); bandaPosta(st, ref ? ref.id : 'sys', txt, { k: 'finale' });
    }
  }
  Parola.mandati = st => S(st).mandati;
  Parola.mandatoBanda = mandatoBanda;
  Parola.misura = misura;
  // ---- con l'IA: la richiesta del §4.4 (metodi già filtrati dal motore) ----
  function richiestaMandato(st, n, text) {
    const lista = capisciMandato(st, text), chi = n ? [n] : RS.members(st).filter(m => disponibile(st, m));
    const ammessi = {}, mezzi = {};
    chi.forEach(k => { lista.forEach(ob => { ammessi[k.id] = (ammessi[k.id] || []).concat(metodi(st, k, ob.tipo, ob.vincoli).filter(x => !x.no).map(x => x.id)); }); const ms = mestiereDi(k); mezzi[k.id] = [mezzoDi(st, k) ? 'Vespa' : null, ms ? `mestiere ${ms.title || (PLACES[ms.place] || {}).name || ''} ${ms.pay}/ora` : null, k.pop && (k.pop.friends || []).length ? 'amici: ' + k.pop.friends.slice(0, 3).map(id => G.nameOf(st, id)).join(', ') : null].filter(Boolean).join(', ') || 'niente'; });
    const base = n ? richiestaDialogo(st, n, text) : richiestaBanda(st, text);
    return Object.assign(base, { kind: 'mandato', versione: 'parola1',
      modelli: lista.map(ob => ({ tipo: ob.tipo, misura: MANDATI[ob.tipo].misura, metodi: (MET[ob.tipo] || []).map(x => ({ id: x.id, fasi: (x.verbi || []).join('|'), illegale: !!x.illegale })) })),
      metodi_ammessi: ammessi, mezzi, text });
  }
  Parola.richiestaMandato = richiestaMandato;
  // ---- i bottoni del Taccuino: vincoli, più tempo, lascia stare ----
  Parola.vincola = (st, id, k, v) => { const m = S(st).mandati.find(x => x.id === id); if (!m) return; if (k === 'niente_botte') { m.vincoli.niente = v ? [...new Set(m.vincoli.niente.concat(['picchia']))] : m.vincoli.niente.filter(x => x !== 'picchia'); } else if (k === 'non_spendere') m.vincoli.budget = v ? 0 : null; else if (k === 'niente_rapine') m.vincoli.rapine = !v; else if (k === 'niente_armi') m.vincoli.armi = v ? 'finte' : 'tutte'; else m.vincoli[k] = v;
    const n = G.byId(st, m.chi); if (n && m.metodo) { const L = metodi(st, n, m.tipo, m.vincoli, m); const cur = L.find(x => x.id === m.metodo.id); if (cur && cur.no) { const alt = L.find(x => !x.no); if (alt) { m.metodo = { id: alt.id, etichetta: alt.x.etichetta, perche: alt.perche }; m.provati.push(alt.id); rapporto(st, m, 'cambio', `Va bene, niente ${cur.x.etichetta}. ${cap1(alt.x.etichetta)}.`, n.id); } } } };
  Parola.piuTempo = (st, id, giorni) => { const m = S(st).mandati.find(x => x.id === id); if (m) { m.vincoli.entro += (giorni || 1) * 1440; m.sotto.forEach(sid => { const s2 = S(st).mandati.find(x => x.id === sid); if (s2) s2.vincoli.entro += (giorni || 1) * 1440; }); } };
  Parola.lasciaStare = (st, id) => {
    const m = S(st).mandati.find(x => x.id === id); if (!m || m.stato !== 'in_corso') return;
    const iniziato = m.fasi.some(f => f.stato === 'in_corso' || f.stato === 'fatta');
    [m].concat(m.sotto.map(sid => S(st).mandati.find(x => x.id === sid)).filter(Boolean)).forEach(x => {
      x.fasi.forEach(f => { const p = S(st).promesse.find(q => q.id === f.promessa); if (p && ACTIVE.includes(p.stato)) { const n = G.byId(st, p.chi); if (n) stopLink(st, n, p); chiudi(st, p, 'annullata', 'gli hai detto di lasciar stare', true); } });
      x.stato = 'annullato'; x.fine = st.t;
      const n = G.byId(st, x.chi); if (n && iniziato && n.ris) n.ris.bond = clamp(n.ris.bond - .02, -.5, .6);
    });
  };


  // ================= LA RAPINA (§0.10): di giorno, con la gente dentro e un'arma in mano, vera o finta =================
  // Metodo del mandato «soldi» e cosa che le crew di abitanti decidono da sole (al massimo una a settimana in tutta l'isola).
  // Un membro della banda la può solo PROPORRE: non parte senza il sì del giocatore. I vincoli «pulito», «niente armi»,
  // «niente rapine» la tolgono; «niente armi vere» lascia solo quelle finte (la banana resta). Gli effetti sono quelli del motore:
  // la cassa vera della bottega (Economia, e quella che segna attivita.js: st.robbed), la cassaforte sotto minaccia (Cassaforti),
  // l'evento «rapina» (Game.emit: Radio Porto, i testimoni), il posto di blocco (Ordine), il 40% alla Famiglia se le armi sono
  // sue (la stessa quota di scontri.js), i fermi (Popolo.arrest), le note nel diario (che fanno nascere gli agguati di Trame).
  const RAPINA = {};
  Parola.rapina = RAPINA;
  const GIRO_RAP = ['ladro', 'trafficante', 'borsaiolo'];
  const figliPiccoli = (st, n) => { const P = n.pop; if (!P || !st.pop || !st.pop.households) return false; const hh = st.pop.households[P.hh]; return !!(hh && hh.members.some(id => { const k = G.byId(st, id); return k && k !== n && k.pop && k.pop.age < 12; })); };
  RAPINA.peso = (st, n) => {
    const P = n.pop || {}, tut = n.ris ? n.ris.ideo : 0, fear = (P.need && P.need.paura) || (n.op && n.op.fear) || 0;
    const fatte = S(st).rapine.some(R0 => R0.capo === n.id && R0.esito === 'riuscita');
    return Math.round((n.tr.cor * .35 + n.tr.avid * .25 + (GIRO_RAP.includes(P.giro) ? .25 : 0) + tut * .15 + (disperato(n) ? .3 : 0) - n.tr.legge * .6 - fear * .4 - (figliPiccoli(st, n) ? .15 : 0) + (fatte ? .1 : 0)) * 100) / 100;
  };
  RAPINA.puo = (st, n) => {
    const c = RS.card(n);
    if (n.tr.legge > .6) return 'troppo onesto'; if ((c.never || []).some(v => v === 'ruba' || v === 'picchia')) return 'non lo farebbe mai';
    if (n.cop || c.antag) return 'no';
    if (isM(n)) { if (RS.members(st).filter(k => k !== n && disponibile(st, k)).length < 2) return 'servono almeno due della banda'; }
    else if (complici(st, n).length < 1) return 'nessuno ci sta';
    return null;
  };
  const LIV1 = /tabacc|bottega|bar\b|alimentari|panetteria|frutta|drogheria|macelleria|pescheria|merceria|ferramenta/i;
  function bersaglio(st, n, livello) {
    const E = Eco(); if (!E || !E.eco) return null;
    const robbed = st.robbed || {};
    const L = Object.values(E.eco(st).shops).filter(Sh => Sh.t && !Sh.black && !Sh.market && st.t - (robbed[Sh.k] || -1e9) > 12 * 60 && (livello === 2 ? Sh.emporio : !Sh.emporio && LIV1.test(Sh.t.label || '')));
    L.sort((a, b) => (b.cash - a.cash) || 0);
    const Sh = L[Math.floor(rnd(st) * Math.min(3, L.length))]; if (!Sh) return null;
    return { Sh, x: Sh.t.x, y: Sh.t.y, name: Sh.t.label, bi: Sh.t.bi, k: Sh.k, livello };
  }
  // le armi: vere dalla Famiglia (vuole il 40%, e non presta a chi ha debiti), dall'armeria di una base; finte altrimenti
  function armiPer(st, capo, V) {
    if (V && V.armi === 'finte') return { tipo: 'finta', nome: rnd(st) < .5 ? 'una banana in un sacchetto' : 'una pistola giocattolo', scoperta: .45, da: 'giocattolo' };
    const base = st.ris.bases.find(b => b.alive && b.modules.includes('armeria'));
    if (isM(capo) && base) return { tipo: 'vera', nome: 'il ferro dell\'armeria', da: 'armeria' };
    const fam = st.fam && st.fam.capo, debiti = capo.pop && capo.pop.debt && capo.pop.debt.amount > 20;
    if (fam && !debiti && (isM(capo) || capo.tr.cor > .55)) return { tipo: 'vera', nome: 'il ferro della Famiglia', da: 'famiglia', quota: .4 };
    return { tipo: 'finta', nome: debiti || rnd(st) < .5 ? 'una banana in un sacchetto' : 'una pistola giocattolo', scoperta: debiti ? .55 : .4, da: 'giocattolo' };
  }
  const RUOLI_R = ['entra', 'porta', 'palo', 'autista'];
  function crewPer(st, capo, banda) {
    const L = banda ? RS.members(st).filter(k => k !== capo && disponibile(st, k) && k.tr.legge <= .6 && !(RS.card(k).never || []).some(v => v === 'ruba' || v === 'picchia')) : complici(st, capo);
    const out = [{ chi: capo.id, ruolo: 'entra' }], used = new Set([capo.id]);
    const want = banda ? ['porta', 'autista', 'palo'] : ['porta', 'palo'];
    want.forEach(r => { const c = L.filter(k => !used.has(k.id) && k.id !== capo.id).sort((a, b) => (r === 'autista' ? (mezzoDi(st, b) ? 1 : 0) - (mezzoDi(st, a) ? 1 : 0) : 0) || (b.tr.cor - a.tr.cor))[0]; if (!c) return; if (r === 'autista' && !mezzoDi(st, c)) return; out.push({ chi: c.id, ruolo: r }); used.add(c.id); });
    return out;
  }
  function nuovaRapina(st, capo, opt) {
    const M = S(st), banda = isM(capo), V = (opt && opt.vincoli) || VINC0();
    if (V.rapine === false || V.armi === 'no' || V.pulito) return null;
    const liv = opt && opt.livello || (capo.tr.cor > .7 && banda ? 2 : 1);
    const tgt = (opt && opt.tgt) || bersaglio(st, capo, liv) || bersaglio(st, capo, 1); if (!tgt) return null;
    const crew = (opt && opt.crew) || crewPer(st, capo, banda); if (crew.length < 2) return null;
    const giorno = dayIdx(st.t) + 1, t = giorno * 1440 + (tgt.livello === 2 ? 12 * 60 : 11 * 60);
    const arma = armiPer(st, capo, V), autista = crew.find(x => x.ruolo === 'autista');
    const R0 = { id: 'r' + M.nextR++, capo: capo.id, crew, tgt, livello: tgt.livello, arma, mezzo: autista ? 'suo' : crew.some(x => { const k = G.byId(st, x.chi); return k && k.tr.legge < .35; }) ? 'rubato' : 'piedi',
      t, stato: banda ? 'proposta' : 'preparazione', banda, mandato: opt && opt.mandato || null, born: st.t, aggiornamenti: [], conseguenze: [], bottino: 0, quotaFam: 0, vincoli: V, visti: [] };
    M.rapine.push(R0);
    return R0;
  }
  function postaR(st, R0, chi, testo, k) {
    R0.aggiornamenti.push({ t: st.t, chi, testo, k });
    if (R0.banda) bandaPosta(st, chi, testo, { k: k || 'rapina', rapina: R0.id });
    else { const n = G.byId(st, chi); if (n && dist(n.x, n.y, st.player.x, st.player.y) < 30 && !n.inside) G.say(st, n, clip(testo, 70), 3); }
  }
  // un membro la propone in chat (mai da solo): «Avrei un'idea per la cassa. Non ti piacerà.»
  RAPINA.proponi = (st, n, opt) => {
    const no = RAPINA.puo(st, n); if (no) return null;
    if (S(st).rapine.some(R0 => R0.capo === n.id && ['proposta', 'preparazione'].includes(R0.stato))) return null;
    const R0 = nuovaRapina(st, n, opt || {}); if (!R0) return null;
    const ruoli = R0.crew.filter(x => x.chi !== n.id).map(x => `${nome(G.byId(st, x.chi))} ${x.ruolo === 'porta' ? 'alla porta' : x.ruolo === 'autista' ? 'guida' : 'fa il palo'}`).join(', ');
    postaR(st, R0, n.id, 'Avrei un\'idea per la cassa. Non ti piacerà.', 'proposta');
    postaR(st, R0, n.id, `${R0.tgt.name}. Domani ${hhmm(R0.t)}, quando c'è la fila. ${ruoli ? cap1(ruoli) + ', ' : ''}io entro. ${R0.arma.tipo === 'vera' ? (R0.arma.da === 'famiglia' ? 'Il ferro me lo dà la Famiglia. Vuole il quaranta.' : 'Il ferro c\'è, in armeria.') : `Ferro niente. Ho ${R0.arma.nome}.`}`, 'proposta');
    return R0;
  };
  // il sì del giocatore (o «niente armi vere», o «lascia stare»)
  RAPINA.rispondi = (st, id, cosa) => {
    const R0 = S(st).rapine.find(x => x.id === id); if (!R0 || R0.stato !== 'proposta') return null;
    const capo = G.byId(st, R0.capo), m = R0.mandato && S(st).mandati.find(x => x.id === R0.mandato);
    if (cosa === 'no') { R0.stato = 'annullata'; postaR(st, R0, capo.id, 'Va bene. Allora niente. Ma la cassa piange lo stesso.', 'no'); if (m) { m.vincoli.rapine = false; m.metodo.proposta = false; m.metodo.si = false; const alt = metodi(st, capo, m.tipo, m.vincoli, m).find(x => !x.no && x.id !== 'rapina'); if (alt) { m.metodo = { id: alt.id, etichetta: alt.x.etichetta, perche: alt.perche }; m.provati.push(alt.id); } } return R0; }
    if (cosa === 'finte') { R0.arma = armiPer(st, capo, { armi: 'finte' }); R0.vincoli.armi = 'finte'; if (m) m.vincoli.armi = 'finte'; postaR(st, R0, capo.id, `Niente ferro vero, allora. ${cap1(R0.arma.nome)}. Se ride qualcuno, è finita.`, 'si'); }
    else postaR(st, R0, capo.id, R0.arma.da === 'famiglia' ? 'Bene. Passo dal Barone stasera.' : 'Bene. Domani, allora.', 'si');
    R0.stato = 'preparazione'; R0.si = st.t;
    if (m) { m.metodo.si = true; m.metodo.proposta = false; }
    return R0;
  };
  // ordinata dal giocatore («fate una rapina all'Emporio»): è già un sì
  RAPINA.ordina = (st, text, vincoli) => {
    const shop = bottegaDa(st, text);
    const L = RS.members(st).filter(k => disponibile(st, k) && !RAPINA.puo(st, k)).sort((a, b) => RAPINA.peso(st, b) - RAPINA.peso(st, a));
    const capo = L[0]; if (!capo) return { ok: false, msg: 'Nessuno se la sente di entrare con un\'arma in mano.' };
    const tgt = shop ? { Sh: shop.Sh, x: shop.x, y: shop.y, name: shop.name, bi: shop.Sh.t.bi, k: shop.shop, livello: shop.emporio ? 2 : 1 } : null;
    const R0 = nuovaRapina(st, capo, { vincoli: vincoli || VINC0(), tgt }); if (!R0) return { ok: false, msg: 'Non c\'è un posto buono, o mancano le persone.' };
    RAPINA.rispondi(st, R0.id, vincoli && vincoli.armi === 'finte' ? 'finte' : 'si');
    return { ok: true, R0, capo };
  };
  // il metodo del mandato «soldi»
  RAPINA.daMandato = (st, n, m, F) => {
    let R0 = S(st).rapine.find(x => x.mandato === m.id && ['proposta', 'preparazione'].includes(x.stato));
    if (!R0) { R0 = isM(n) ? RAPINA.proponi(st, n, { mandato: m.id, vincoli: m.vincoli }) : nuovaRapina(st, n, { mandato: m.id, vincoli: m.vincoli }); if (!R0) return { ok: false, msg: 'Non ho trovato con chi farla.' }; if (isM(n) && !m.metodo.si) { m.metodo.proposta = true; return { ok: false, aspetta: true }; } }
    if (R0.stato === 'proposta') return { ok: false, aspetta: true };
    F.rapina = R0.id; F.attesa = R0.t + 120; R0.mandato = m.id;
    return { ok: true, aspetta: true, msg: `${R0.tgt.name}, domani alle ${hhmm(R0.t)}.` };
  };
  RAPINA.tickFase = (st, n, m, F) => { const R0 = S(st).rapine.find(x => x.id === F.rapina); if (!R0 || !['fatta', 'fallita', 'annullata'].includes(R0.stato)) return; F.stato = R0.esito === 'riuscita' || R0.esito === 'a_meta' ? 'fatta' : 'fallita'; F.reso = R0.perCassa || 0; F.t1 = st.t; R0.conseguenze.forEach(c => m.conseguenze.push(c)); };
  // le crew di abitanti, da sole: al massimo una a settimana in tutta l'isola, mai di livello 3-4 (qui: solo 1 e 2, il 2 con un capo > .8)
  RAPINA.autonoma = (st, opt) => {
    const M = S(st); if (!(opt && opt.forza) && st.t - M.ultimaRapina < 7 * 1440) return null;
    const L = (opt && opt.capo ? [opt.capo] : st.npcs.filter(k => k.pop && k.pop.ints && !k.dead && !k.cop && !isM(k) && !(k.jailedUntil > st.t) && GIRO_RAP.includes(k.pop.giro) && disperato(k)))
      .filter(k => !RAPINA.puo(st, k) && RAPINA.peso(st, k) > (opt && opt.forza ? -1 : .45)).sort((a, b) => RAPINA.peso(st, b) - RAPINA.peso(st, a));
    const capo = L[0]; if (!capo) return null;
    const R0 = nuovaRapina(st, capo, { livello: capo.tr.cor > .8 && rnd(st) < .3 ? 2 : 1 }); if (!R0) return null;
    M.ultimaRapina = st.t;
    note(st, capo, `ha in mente una rapina a ${R0.tgt.name}, con ${R0.arma.nome}`, 'shady', { w: .6, tag: 'trama' });
    R0.crew.forEach(x => { const k = G.byId(st, x.chi); if (k && k !== capo) note(st, k, `${capo.first} gli ha proposto un colpo a ${R0.tgt.name} (fa ${x.ruolo}): ha detto di sì`, 'shady', { w: .5, who: capo.id, tag: 'trama' }); });
    // se il giocatore è un loro contatto, gli arriva un messaggio
    if (trustOf(st, capo) > .5 && st.ris) { const ch = st.ris.chats[capo.id] = st.ris.chats[capo.id] || []; ch.push({ role: 'npc', text: `Domani alle ${hhmm(R0.t)} ${aLuogo(R0.tgt.name)}. Ti serve qualcosa? Sigarette, intendo.`, sys: true, t: st.t }); }
    // la sente chi passa: due battute, se il giocatore è vicino
    const k2 = G.byId(st, (R0.crew[1] || {}).chi); if (k2 && R0.arma.tipo === 'finta' && /banana/.test(R0.arma.nome)) R0.scenaStrada = [{ chi: capo.id, txt: 'Con la banana nel sacchetto non si vede niente. Sembra una pistola.' }, { chi: k2.id, txt: 'Sembra una banana in un sacchetto.' }, { chi: capo.id, txt: 'Da fuori.' }];
    return R0;
  };
  // ---- il giro: sopralluogo, colpo, fuga, spartizione, conseguenze ----
  function sopralluogo(st, R0) {
    const by = G.byId(st, (R0.crew.find(x => x.ruolo === 'palo') || R0.crew[R0.crew.length - 1]).chi);
    const cops = grigiVicino(st, R0.tgt.x, R0.tgt.y, 40), vig = R0.livello === 2;
    R0.sopra = { t: st.t, by: by.id, cops, vigilante: vig };
    postaR(st, R0, by.id, `Fatto il giro. ${vig ? 'Un vigilante, sessant\'anni, mangia un panino. ' : ''}${cops ? `${cap1(NUMW[cops] || String(cops))} Grigi da quelle parti.` : 'Grigi niente, a quell\'ora.'}`, 'sopralluogo');
    postaR(st, R0, R0.capo, R0.arma.tipo === 'vera' ? 'Armi ci sono.' : `Armi niente. ${cap1(R0.arma.nome)}.`, 'armi');
  }
  const arrestaN = (st, n, why) => { if (Po() && Po().arrest) Po().arrest(st, n, why); else n.jailedUntil = st.t + 240; };
  function colpo(st, R0) {
    const M = S(st), capo = G.byId(st, R0.capo), crew = R0.crew.map(x => Object.assign({}, x, { n: G.byId(st, x.chi) })).filter(x => x.n && !x.n.dead && !(x.n.jailedUntil > st.t));
    const entra = crew.find(x => x.ruolo === 'entra') || crew[0]; if (!entra || crew.length < 2) { R0.stato = 'annullata'; R0.esito = 'saltata'; postaR(st, R0, R0.capo, 'Gli altri non si sono visti. Niente.', 'no'); return; }
    const T0 = R0.tgt, Sh = T0.Sh, near = dist(st.player.x, st.player.y, T0.x, T0.y) <= 40;
    R0.stato = 'fatta';
    postaR(st, R0, (crew.find(x => x.ruolo === 'autista') || crew.find(x => x.ruolo === 'porta') || entra).chi, R0.mezzo === 'rubato' ? 'In posizione. La macchina non è nostra, ma il padrone non lo sa.' : 'In posizione.', 'posizione');
    postaR(st, R0, entra.chi, 'Dentro.', 'dentro');
    // chi c'è: il commesso, i clienti (un eroe con coraggio > .8 si butta addosso), i Grigi
    const gente = st.npcs.filter(k => k.pop && !k.dead && !k.cop && !crew.some(x => x.n === k) && dist(k.x, k.y, T0.x, T0.y) < 9);
    const eroe = gente.filter(k => k.tr.cor > .8).sort((a, b) => b.tr.cor - a.tr.cor)[0];
    const cops = grigiVicino(st, T0.x, T0.y, 30) + (R0.soffiata ? 2 : 0);
    const palo = crew.some(x => x.ruolo === 'palo'), autista = crew.some(x => x.ruolo === 'autista');
    const finta = R0.arma.tipo === 'finta';
    const scoperta = finta && rnd(st) < clamp(R0.arma.scoperta + (eroe ? .2 : 0) - entra.n.tr.cor * .1, .05, .9);
    const fermato = !scoperta && eroe && rnd(st) < .35;
    const alarm = R0.livello === 2 || rnd(st) < .3;
    let esito;
    const pOk = clamp(.72 - cops * .18 - (R0.livello === 2 ? .12 : 0) + (palo ? .06 : 0) + (autista ? .08 : 0) + entra.n.tr.cor * .1, .05, .92);
    if (scoperta) esito = 'scoperta'; else if (fermato) esito = 'eroe'; else esito = rnd(st) < pOk ? 'riuscita' : 'fallita';
    // il bottino vero: la cassa (e la cassaforte sotto minaccia, al livello 2)
    let q = 0;
    if (esito === 'riuscita') {
      q = Math.max(25, Math.round(((Sh && Sh.cash) || 60 + rnd(st) * 80) * .9));
      if (Sh) Sh.cash = Math.max(0, Sh.cash - q);
      if (R0.livello === 2 && typeof Cassaforti !== 'undefined' && Cassaforti.safeCash && T0.bi !== undefined) { const sc = Math.round(Cassaforti.safeCash(st, T0.bi) * .8); if (sc > 0) { Cassaforti.takeSafe(st, T0.bi, sc); q += sc; } }
      if (alarm && rnd(st) < .35) { q = Math.round(q * .55); esito = 'a_meta'; }
    }
    (st.robbed || (st.robbed = {}))[T0.k] = st.t;
    const ev = G.emit(st, 'rapina', { actor: entra.n.id, x: T0.x, y: T0.y, shopId: T0.k, shop: T0.name, npcCrime: true });
    if (ev) { ev.place = T0.name; const f = (st.feed || []).find(x => /^Radio Porto: rapina/.test(x.text)); if (f) f.text = `Radio Porto: rapina ${finta ? 'con un\'arma finta' : 'con la pistola'} ${aLuogo(T0.name)}. I Grigi indagano.`; }
    R0.ev = ev && ev.id; R0.radio = ((st.feed || []).find(f => /Radio Porto/.test(f.text)) || {}).text || null;
    // la scena, se il giocatore è vicino: grida, il cassiere che trema, l'eroe, l'allarme
    if (near) {
      const clerk = gente[0];
      const S0 = [{ chi: entra.chi, txt: 'Fermi tutti! Questa è una rapina!' }];
      if (finta && clerk) S0.push({ chi: clerk.id, txt: scoperta ? (/banana/.test(R0.arma.nome) ? 'Quella è una banana.' : 'Quella è di plastica.') : pickR(st, ['Prendi tutto, non sparare!', 'Ecco, ecco… ho dei figli!']) });
      else if (clerk) S0.push({ chi: clerk.id, txt: pickR(st, ['Prendi tutto, non sparare!', 'Ecco, ecco… ho dei figli!', 'Va bene, va bene, calma.']) });
      if (scoperta && /banana/.test(R0.arma.nome)) S0.push({ chi: entra.chi, txt: 'È una pistola a forma di banana.' });
      if (eroe && (scoperta || fermato)) S0.push({ chi: eroe.id, txt: pickR(st, ['Ma vergognati!', 'Adesso ti sistemo io!', 'Con me no, ragazzo.']) });
      const porta = crew.find(x => x.ruolo === 'porta'); if (porta && cops) S0.push({ chi: porta.chi, txt: `${nome(entra.n)}, i Grigi! …No, è il postino. …No, sono i Grigi.` });
      R0.scena = S0.map((x, i) => Object.assign(x, { at: st.t + i * .4 })); R0.scenaI = 0;
      if (G.panicAround && !finta) G.panicAround(st, T0.x, T0.y, 12, 20);
    }
    if (alarm) postaR(st, R0, (crew.find(x => x.ruolo === 'palo') || crew.find(x => x.ruolo === 'porta') || entra).chi, 'Allarme.', 'allarme');
    // la Repressione sale sempre: una rapina è una rapina
    const dR = esito === 'riuscita' || esito === 'a_meta' ? (R0.livello === 2 ? 14 + Math.round(rnd(st) * 6) : 8 + Math.round(rnd(st) * 4)) : 3;
    st.ris.repr = clamp(st.ris.repr + dR, 0, 100); R0.conseguenze.push({ t: st.t, testo: `Repressione +${dR}`, k: 'repr' });
    // il posto di blocco sulle strade d'uscita (Ordine: il prossimo blocco si alza adesso)
    if (st.ord && (alarm || esito !== 'riuscita')) { st.ord.nextBlocco = Math.min(st.ord.nextBlocco || st.t, st.t); R0.blocco = true; }
    // i testimoni ricordano facce e vestiti (per tre giorni, ai controlli)
    gente.forEach(k => { G.addMemory(st, k, { eventId: R0.ev || 'rap' + R0.id, type: 'rapina', actor: entra.n.id, place: T0.name, t: st.t, conf: .8, source: 'visto', look: entra.n.look ? { top: entra.n.look.top, hair: entra.n.look.hair } : null }); });
    R0.visti = crew.map(x => x.chi); R0.vistiFino = st.t + 3 * 1440; R0.testimoni = gente.length;
    if (esito === 'scoperta' || esito === 'eroe' || esito === 'fallita') {
      // finta scoperta: niente scontro a fuoco, una rissa e un arresto; fermato dall'eroe; o i Grigi
      const preso = esito === 'fallita' && cops === 0 && autista ? null : entra.n;
      if (!preso) postaR(st, R0, entra.chi, 'Allarme, e la cassa non si apriva. Siamo scappati a mani vuote.', 'fuga');
      if (preso) { arrestaN(st, preso, esito === 'scoperta' ? 'rapina con un\'arma finta' : 'tentata rapina'); R0.presi = [preso.id]; R0.conseguenze.push({ t: st.t, testo: `${nome(preso)} in cella`, k: 'cella' }); postaR(st, R0, (crew.find(x => x !== entra) || entra).chi, `Presi. ${nome(preso)} è dentro.`, 'presi'); }
      // in cella si parla: solo di quello che si sa (gli abitanti non conoscono le basi)
      if (preso && !isM(preso)) R0.crew.forEach(x => { if (x.chi !== preso.id) note(st, preso, `ha fatto il nome di ${G.nameOf(st, x.chi)} ai Grigi`, 'shady', { w: .4, who: x.chi, tag: 'tradimento' }); });
      if (eroe) { note(st, eroe, esito === 'scoperta' && /banana/.test(R0.arma.nome) ? 'ha fermato un rapinatore con l\'ombrello (aveva una banana)' : `ha fermato un rapinatore a ${T0.name}`, 'good', { w: .8, tag: 'eroe' }); R0.eroe = eroe.id; }
      R0.esito = esito; M.stats.rapine = (M.stats.rapine || 0) + 1;
      G.addLog(st, `${hhmm(st.t)} · Tentata rapina a ${T0.name}${finta ? ` (${R0.arma.nome})` : ''}: ${preso ? nome(preso) + ' fermato' : 'sono scappati'}.`, 'info');
      if (!finta && eroe && rnd(st) < .25) ferito(st, R0, eroe);
      return;
    }
    // riuscita (o a metà): la fuga, poi la spartizione
    postaR(st, R0, entra.chi, R0.livello === 1 ? 'Fuori.' : 'Fuori. La cassiera mi ha detto «oggi è il mio compleanno». Le ho detto auguri.', 'fuori');
    if (R0.blocco) postaR(st, R0, (crew.find(x => x.ruolo === 'autista') || crew[1]).chi, autista ? 'Blocco sulla litoranea. Taglio dal Vico.' : 'C\'è un blocco. Andiamo a piedi, nei caruggi.', 'blocco');
    if (R0.mezzo === 'rubato') postaR(st, R0, (crew[1] || entra).chi, 'La macchina l\'abbiamo lasciata al cantiere, con le chiavi. Che se la prendano.', 'cambio');
    R0.esito = esito; R0.bottino = q; M.stats.rapine = (M.stats.rapine || 0) + 1;
    if (esito === 'a_meta') { const k = crew[crew.length - 1]; R0.conseguenze.push({ t: st.t, testo: `la borsa è caduta nella fuga: bottino ridotto`, k: 'borsa' }); postaR(st, R0, k.chi, 'La borsa. Mi è caduta. Una parte è rimasta per strada.', 'borsa'); }
    // la Famiglia vuole la sua parte se le armi sono sue (entro sei ore)
    if (R0.arma.da === 'famiglia') { R0.quotaFam = Math.round(q * (R0.arma.quota || .4)); R0.famEntro = st.t + 6 * 60; }
    spartizione(st, R0, crew, q);
    G.addLog(st, `${hhmm(st.t)} · Rapina a ${T0.name}: ${q}.000 lire${R0.arma.tipo === 'finta' ? `, con ${R0.arma.nome}` : ''}.`, 'bad');
    R0.titolo = st.t + 12 * 60; R0.garante = true;
  }
  function ferito(st, R0, k) { k.hp = Math.min(k.hp || 100, 40); st.ris.morale = clamp(st.ris.morale - 10, 0, 100); R0.conseguenze.push({ t: st.t, testo: `${k.first} ferito durante la rapina: il quartiere ce l'ha con chi l'ha fatta`, k: 'civile' }); st.npcs.forEach(x => { if (x.pop && x.pop.homeT && dist(x.pop.homeT.x, x.pop.homeT.y, R0.tgt.x, R0.tgt.y) < 80) note(st, x, `a ${R0.tgt.name} hanno ferito ${k.first}, in una rapina`, 'bad', { w: .55, tag: 'rapina' }); }); }
  // la spartizione: chi è entrato vuole di più; chi è avido, ha poca lealtà e ha la borsa può sparire con tutto
  function spartizione(st, R0, crew, q) {
    const porta = crew.find(x => x.ruolo === 'porta') || crew[0], pn = porta.n, capo = G.byId(st, R0.capo);
    const lealta = isM(pn) ? pn.ris.loyalty : (Po() ? clamp(.5 + Po().opinionOf(st, pn, capo.id) * .5, 0, 1) : .5);
    if (pn !== capo && pn.tr.avid > .7 && lealta < .35 && rnd(st) < .5) {
      if (pn.pop) pn.pop.money = (pn.pop.money || 0) + q;
      R0.conseguenze.push({ t: st.t, testo: `${nome(pn)} è sparito con la borsa`, k: 'sparito' }); postaR(st, R0, capo.id, `${nome(pn)} è sparito con la borsa.`, 'sparito');
      crew.forEach(x => { if (x.n !== pn) note(st, x.n, `${pn.first} è scappato con tutto il bottino della rapina`, 'bad', { w: .8, who: pn.id, tag: 'tradimento' }); });
      R0.perCassa = 0; return;
    }
    if (R0.banda) { st.ris.cassa += q; R0.perCassa = q; postaR(st, R0, capo.id, `Spartito: ${q}.000 nella cassa. Ognuno si tiene i nervi.`, 'spartito'); }
    else {
      const parti = crew.map(x => [x, x.ruolo === 'entra' ? .35 : (1 - .35) / Math.max(1, crew.length - 1)]);
      parti.forEach(([x, f]) => { if (x.n.pop) x.n.pop.money = (x.n.pop.money || 0) + q * f; note(st, x.n, `la rapina a ${R0.tgt.name} è andata: ${Math.round(q * f)}.000 a testa`, 'shady', { w: .7, tag: 'trama' }); });
      if (crew.length > 2 && rnd(st) < .4) { const k = crew.find(x => x.ruolo === 'autista' || x.ruolo === 'porta'); if (k) note(st, k.n, `${capo.first} si è preso la parte più grossa: senza di me erano tutti dentro`, 'bad', { w: .45, who: capo.id, tag: 'rapina' }); }
      // un abitante col mandato versa nella cassa la sua parte
      if (R0.mandato) { const quota = Math.round(q * .35 * .8); if (capo.pop) capo.pop.money -= quota; st.ris.cassa += quota; R0.perCassa = quota; } else R0.perCassa = 0;
    }
    // i soldi della rapina sono segnati per due giorni
    R0.segnatiFino = st.t + 2 * 1440;
  }
  // ogni minuto: le fasi all'ora giusta, la scena, la Famiglia, il Garante, i testimoni ai controlli; ogni ora: le crew da sole
  RAPINA.tick = st => {
    const M = S(st);
    M.rapine.forEach(R0 => {
      if (R0.stato === 'preparazione') {
        if (!R0.sopra && st.t >= R0.t - 22 * 60 && G.hour(st) >= 9 && G.hour(st) <= 18) sopralluogo(st, R0);
        if (R0.scenaStrada && !R0.scenaStradaFatta) { const k = G.byId(st, R0.capo); if (k && dist(k.x, k.y, st.player.x, st.player.y) < 20) { R0.scena = R0.scenaStrada.map((x, i) => Object.assign(x, { at: st.t + i * .4 })); R0.scenaI = 0; R0.scenaStradaFatta = true; } }
        if (st.t >= R0.t) { if (!R0.sopra) sopralluogo(st, R0); colpo(st, R0); }
      }
      if (R0.stato === 'proposta' && st.t > R0.t - 60) { R0.stato = 'annullata'; R0.esito = 'nessuna risposta'; postaR(st, R0, R0.capo, 'Non mi hai risposto. Lascio perdere, va.', 'no'); const m = R0.mandato && M.mandati.find(x => x.id === R0.mandato); if (m && m.metodo) { m.metodo.proposta = false; m.vincoli.rapine = false; } }
      if (R0.scena && R0.scenaI < R0.scena.length && st.t >= R0.scena[R0.scenaI].at) { const x = R0.scena[R0.scenaI++], k = G.byId(st, x.chi); if (k) G.say(st, k, x.txt, 2.6); }
      if (R0.quotaFam && !R0.famPagata && !R0.famChiesta && R0.banda) { R0.famChiesta = st.t; postaR(st, R0, R0.capo, `La Famiglia vuole ${R0.quotaFam}.000 entro le ${hhmm(R0.famEntro)}. Dice che ${art(R0.tgt.name, 'det')} sta nella sua zona.`, 'famiglia'); }
      if (R0.quotaFam && !R0.famPagata && R0.famEntro && st.t > R0.famEntro) {
        R0.famPagata = 'no'; const pay = Math.min(st.ris.cassa, Math.round(R0.quotaFam * 1.2)); st.ris.cassa -= pay; if (st.fam) st.fam.cash = (st.fam.cash || 0) + pay;
        const capo = G.byId(st, R0.capo); if (capo) { capo.hp = Math.min(capo.hp || 100, 55); note(st, capo, 'gli uomini della Famiglia sono passati a prendersi la loro parte, con gli interessi', 'bad', { w: .7, tag: 'famiglia' }); }
        R0.conseguenze.push({ t: st.t, testo: `La Famiglia si è presa ${pay}.000 con le cattive`, k: 'famiglia' }); if (R0.banda) postaR(st, R0, R0.capo, 'È passato il nipote del Barone. Ha chiesto se mi piace la mia faccia così com\'è. Si è preso i soldi.', 'famiglia');
      }
      if (R0.garante && G.hour(st) === 20 && st.t - (R0.garanteT || -1e9) > 600 && st.t > R0.t) { R0.garanteT = st.t; R0.garante = false; G.feed(st, 'Il Garante: «Pochi vigliacchi hanno rubato il pane ai cittadini onesti. L\'ordine è una carezza, ma anche una mano.»', 'radio'); }
      if (R0.titolo && st.t >= R0.titolo) { R0.titolo = 0; G.addLog(st, `Bollettino: «Rapina a ${R0.tgt.name}. La Guardia Insulare indaga.»`, 'info'); }
      // i testimoni ai controlli: chi è stato visto, per tre giorni, viene riconosciuto
      if (R0.visti && R0.visti.length && st.t < (R0.vistiFino || 0) && st.t - (R0.ricT || -1e9) >= 10) {
        R0.ricT = st.t; R0.visti.forEach(id => { const k = G.byId(st, id); if (!k || k.dead || k.jailedUntil > st.t || k.inside) return; if (grigiVicino(st, k.x, k.y, 4) && rnd(st) < .15) { arrestaN(st, k, `riconosciuto dai testimoni della rapina a ${R0.tgt.name}`); R0.conseguenze.push({ t: st.t, testo: `${nome(k)} riconosciuto a un controllo e fermato`, k: 'cella' }); R0.visti = R0.visti.filter(x => x !== id); } });
      }
    });
    // ogni ora: una crew di abitanti, da sola (rara); un membro della banda che la propone (solo in chat)
    const hm = Math.floor(st.t / 60); if (M.oraR === hm) return; M.oraR = hm;
    const h = hm % 24; if (h < 9 || h > 18) return;
    if (st.t - M.ultimaRapina >= 7 * 1440 && rnd(st) < .02) RAPINA.autonoma(st);
    if (rnd(st) < .03 && st.ris.cassa < 25) { const k = RS.members(st).filter(m => m.ris.auto && disponibile(st, m) && !RAPINA.puo(st, m) && RAPINA.peso(st, m) > .55)[0]; if (k && !M.rapine.some(R0 => R0.banda && st.t - R0.born < 7 * 1440)) RAPINA.proponi(st, k, {}); }
  };
  RAPINA.list = st => S(st).rapine;
  RAPINA.paga = (st, id) => { const R0 = S(st).rapine.find(x => x.id === id); if (!R0 || !R0.quotaFam || R0.famPagata) return false; const q = Math.min(st.ris.cassa, R0.quotaFam); st.ris.cassa -= q; if (st.fam) st.fam.cash = (st.fam.cash || 0) + q; R0.famPagata = 'si'; R0.conseguenze.push({ t: st.t, testo: `Pagati ${q}.000 alla Famiglia`, k: 'famiglia' }); return true; };

  // ================= QUELLO CHE SI VEDE: la chat della banda e la scheda «Mandati» =================
  // La finestra della banda riusa #rs-chat (e i suoi stili) di risacca_ui.js senza toccarlo: si apre quando la chat con una persona
  // è chiusa; se il giocatore ne apre una, la banda si chiude da sola. Mentre è aperta il tempo va al rallentatore (decisione 1).
  const UIB = { aperta: false, busy: false };
  const RALLENTA = .25;
  { const gs0 = G.step; G.step = function (st, dt, inp) { if (UIB.aperta) dt *= RALLENTA; return gs0.call(this, st, dt, inp); }; if (gs0.__rs) G.step.__rs = true; }
  Parola.UIB = UIB;
  const $id = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const stUI = () => (typeof window !== 'undefined' && window.__pv && window.__pv.st) || null;
  function bandaHtmlMsgs(st) {
    const L = bandaChat(st).slice(-60);
    if (!L.length) return '<div class="sys">La chat della banda. Scrivi a tutti («ragazzi, …»), a uno («Cono, …») o lascia che risponda chi è più adatto. Il tempo va piano mentre leggi.</div>';
    return L.map(m => {
      const k = m.da && m.da !== 'player' && m.da !== 'sys' ? G.byId(st, m.da) : null, who = k ? esc(nome(k)) : '';
      if (m.role === 'user') return `<div class="msg me">${esc(m.text)}</div>`;
      if (m.role === 'sys') return `<div class="sys ${m.ok === false ? 'bad' : m.ok ? 'ok' : ''}">${esc(m.text)}</div>`;
      if (m.k) return `<div class="sys rep">↩ <b>${who}</b> <small>${esc(hhmm(m.t))}</small>: ${esc(m.text)}</div>`;
      return `<div class="msg npc"><b>${who}</b>${m.obiezione ? ' <small>(non è d\'accordo)</small>' : ''}: ${esc(m.text)}</div>`;
    }).join('');
  }
  function bandaBottoni(st) {
    const M = S(st), out = [];
    Object.entries(M.pend).forEach(([id, pd]) => { if (pd.thread !== 'banda' || st.t - pd.t > 240) return; const k = G.byId(st, id); if (!k) return; const ct = pd.contro || {};
      out.push(`<button type="button" data-pa="prometti" data-id="${id}">${esc(nome(k))}: ${ct.tipo === 'dopo' || ct.tipo === 'quando' ? 'va bene, dopo' : ct.tipo === 'tempo' ? 'prenditi il tempo' : 'Prometto'}</button>`);
      if (ct.tipo === 'soldi' && st.player.money >= ct.quanto) out.push(`<button type="button" data-pa="paga" data-id="${id}" data-q="${ct.quanto}">Paga ${ct.quanto}.000 a ${esc(nome(k))}</button>`);
      out.push(`<button type="button" data-pa="lascia" data-id="${id}">Lascia stare</button>`); });
    (M.rapine || []).filter(R0 => R0.banda && R0.quotaFam && !R0.famPagata && R0.famChiesta && !R0.noPaga).forEach(R0 => { out.push(`<button type="button" data-pa="fam_paga" data-id="${R0.id}">Paga la Famiglia (${R0.quotaFam}.000)</button><button type="button" data-pa="fam_no" data-id="${R0.id}">Non paghiamo</button>`); });
    (M.rapine || []).filter(R0 => R0.stato === 'proposta' && R0.banda).forEach(R0 => { out.push(`<button type="button" data-pa="rapina_si" data-id="${R0.id}">Va bene</button><button type="button" data-pa="rapina_finte" data-id="${R0.id}">Niente armi vere</button><button type="button" data-pa="rapina_no" data-id="${R0.id}">Lascia stare</button>`); });
    if (!out.length) ['Ragazzi, servono soldi per la cassa', 'Stanotte l\'Emporio, organizzatevi', 'Chi è libero? Scrivete l\'onda in piazza'].forEach(s => out.push(`<button type="button" data-pa="dici">${esc(s)}</button>`));
    return out.join('');
  }
  function renderBanda() {
    const st = stUI(), box = $id('pa-msgs'); if (!st || !box) { UIB.aperta = false; return; }
    S(st).bandaNuovi = 0;
    box.innerHTML = bandaHtmlMsgs(st) + (UIB.busy ? '<div class="msg npc wait">…</div>' : ''); box.scrollTop = box.scrollHeight;
    const sg = $id('pa-sugg'); if (sg) { sg.innerHTML = UIB.busy ? '' : bandaBottoni(st); sg.querySelectorAll('button').forEach(b => b.onclick = () => azioneBanda(st, b)); }
    const ms = RS.members(st), ft = $id('pa-foot'); if (ft) ft.textContent = `${ms.length} nella banda · ${iaAttiva() ? 'risponde la Mente, dentro le regole del gioco' : 'senza IA: il motore sceglie chi risponde'} · il tempo va piano mentre la chat è aperta.`;
  }
  async function azioneBanda(st, b) {
    const a = b.dataset.pa, id = b.dataset.id, k = id && G.byId(st, id);
    if (a === 'dici') return inviaBanda(b.textContent);
    if (a === 'prometti' && k) { const r = rispondi(st, k, 'va bene, dopo', { noUser: true, canale: 'banda' }); bandaPosta(st, k.id, r.say, { esito: r.esito }); }
    else if (a === 'paga' && k) { const r = rispondi(st, k, `ti do ${b.dataset.q}`, { noUser: true, canale: 'banda' }); bandaPosta(st, k.id, r.say, { esito: r.esito }); }
    else if (a === 'lascia' && k) { delete S(st).pend[id]; bandaPosta(st, 'sys', `Lasci stare con ${nome(k)}.`); }
    else if (/^rapina_/.test(a) && Parola.rapina) Parola.rapina.rispondi(st, id, a.slice(7));
    else if (a === 'fam_paga') { RAPINA.paga(st, id); bandaPosta(st, 'sys', 'Pagata la Famiglia.'); }
    else if (a === 'fam_no') { const R0 = S(st).rapine.find(x => x.id === id); if (R0) { R0.famChiesta = st.t; R0.noPaga = true; bandaPosta(st, 'sys', 'Non paghiamo. La Famiglia lo saprà entro sera.'); } }
    renderBanda();
  }
  async function inviaBanda(text) {
    const st = stUI(); if (!st || UIB.busy) return;
    UIB.busy = true; renderBanda();
    try { await bandaInvia(st, text); } catch (e) { if (typeof console !== 'undefined') console.warn('[Parola] banda', e); }
    UIB.busy = false; renderBanda();
  }
  function apriBanda() {
    const st = stUI(), el = $id('rs-chat'); if (!st || !el || !st.ris) return;
    if (!el.hidden && !el.dataset.pa) { const x = el.querySelector('.x'); if (x) x.click(); }
    el.dataset.pa = '1'; el.hidden = false;
    el.innerHTML = `<header><div><span class="nm">≋ La banda</span> <span class="bt">${RS.members(st).length} membri</span><div class="rl">Telefoni di contrabbando, rete nostra</div></div><button class="x" aria-label="Chiudi">ESC</button></header>
      <div class="msgs" id="pa-msgs" aria-live="polite"></div><div class="sugg" id="pa-sugg"></div>
      <form id="pa-form"><textarea id="pa-in" rows="2" placeholder="Scrivi alla banda… (Invio per mandare)" aria-label="Messaggio alla banda"></textarea><button type="submit">Invia</button></form><div class="foot" id="pa-foot"></div>`;
    el.querySelector('.x').onclick = chiudiBanda;
    const inp = $id('pa-in');
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $id('pa-form').requestSubmit(); } if (e.key === 'Escape') chiudiBanda(); });
    inp.addEventListener('keyup', e => e.stopPropagation());
    $id('pa-form').onsubmit = e => { e.preventDefault(); const t = inp.value.trim(); if (t) { inp.value = ''; inviaBanda(t); } };
    UIB.aperta = true; renderBanda(); setTimeout(() => inp.focus(), 30);
  }
  function chiudiBanda() { const el = $id('rs-chat'); UIB.aperta = false; if (el && el.dataset.pa) { el.hidden = true; el.innerHTML = ''; delete el.dataset.pa; } const cv = $id('cv'); if (cv) cv.focus(); }
  Parola.apriBanda = apriBanda; Parola.chiudiBanda = chiudiBanda;
  Parola.UI = { banda: () => { if (UIB.aperta) renderBanda(); } };
  function installaBanda() {
    if (typeof document === 'undefined') return;
    const btn = document.createElement('button'); btn.id = 'pa-banda-btn'; btn.type = 'button'; btn.hidden = true;
    btn.style.cssText = 'position:fixed;left:12px;bottom:120px;z-index:30;font:600 13px/1 system-ui,sans-serif;padding:7px 10px;border-radius:8px;border:1px solid #4cc9c0;background:rgba(10,16,24,.82);color:#dff;cursor:pointer';
    btn.onclick = () => (UIB.aperta ? chiudiBanda() : apriBanda());
    document.body.appendChild(btn);
    addEventListener('keydown', e => { if (e.key === 'Escape' && UIB.aperta) { chiudiBanda(); e.stopImmediatePropagation(); } }, true);
    setInterval(() => {
      const st = stUI(); if (!st || !st.ris) return;
      const ui = window.__pv && window.__pv.ui, ms = RS.members(st).length;
      btn.hidden = !ms || !!(ui && (ui.intro || ui.over));
      const nn = S(st).bandaNuovi || 0; const lab = `≋ Banda${nn && !UIB.aperta ? ` · ${nn}` : ''}`; if (btn.textContent !== lab) btn.textContent = lab;
      if (UIB.aperta && !$id('pa-msgs')) { UIB.aperta = false; const el = $id('rs-chat'); if (el) delete el.dataset.pa; }
      // il bottone anche nel pannello della Risacca (B)
      const pn = $id('rs-panel'); if (pn && !pn.hidden && !pn.querySelector('[data-pa-banda]')) { const b2 = document.createElement('button'); b2.type = 'button'; b2.dataset.paBanda = '1'; b2.textContent = 'Chat della banda'; b2.style.cssText = 'margin:4px 0'; b2.onclick = () => { const x = pn.querySelector('.x,[data-close]'); if (x) x.click(); apriBanda(); }; pn.insertBefore(b2, pn.firstChild); }
    }, 500);
  }
  // ---- la scheda «Mandati» ----
  const STATO_M = { in_corso: '⟳ in corso', riuscito: '✓ riuscito', riuscito_in_parte: '◐ riuscito a metà', fallito: '✗ fallito', abbandonato: '⊘ abbandonato', annullato: '– lasciato stare', accettato: 'accettato' };
  const quandoW = (st, t) => `${G.dayName(t).slice(0, 3)} ${hhmm(t)}`;
  function barra(f, su, tipo) {
    const p = clamp(su ? f / su : 0, 0, 1);
    return `<div style="height:7px;background:#223;border-radius:4px;margin:3px 0;overflow:hidden"><div style="height:100%;width:${Math.round(p * 100)}%;background:${f < 0 ? '#e66' : '#4cc9c0'}"></div></div><small>${f}${tipo === 'soldi' ? '.000' : ''} su ${su}${tipo === 'soldi' ? '.000 lire' : ''}</small>`;
  }
  function mandatiHtml(st) {
    const L = S(st).mandati.filter(m => !m.parent).slice().reverse().slice(0, 12);
    if (!L.length) return '<p class="hint">Nessun mandato. Scrivi a qualcuno (o alla banda) un obiettivo: «servono soldi per la cassa», «trovami due compagni», «scopri chi parla». Lo fa a modo suo.</p>';
    const one = m => {
      const n = G.byId(st, m.chi), chiW = m.chi === 'banda' ? 'la banda' : nome(n), f = misura(st, m), on = m.stato === 'in_corso';
      const subs = m.sotto.map(id => S(st).mandati.find(x => x.id === id)).filter(Boolean);
      const fT = m.chi === 'banda' ? subs.reduce((s, x) => s + misura(st, x), 0) : f;
      return `<div class="pa-m" style="border:1px solid #334;border-radius:8px;padding:8px;margin:6px 0">
        <b>${esc(m.label)}</b> · ${esc(chiW)} · entro ${esc(quandoW(st, m.vincoli.entro))} · <span>${esc(STATO_M[m.stato] || m.stato)}</span>
        <div><i>${esc(m.metodo ? m.metodo.etichetta : '')}</i>${m.metodo && m.metodo.perche && m.metodo.perche.length ? ` · ${esc(m.metodo.perche.join(', '))}` : ''}</div>
        ${barra(fT, m.obiettivo.quanto, m.tipo)}
        ${subs.map(x => `<div style="margin-left:10px"><small>${esc(nome(G.byId(st, x.chi)))} · ${esc(x.metodo ? x.metodo.etichetta : '')} · ${esc(STATO_M[x.stato] || x.stato)}</small>${barra(misura(st, x), x.obiettivo.quanto, x.tipo)}</div>`).join('')}
        <ul>${m.rapporti.concat(...subs.map(x => x.rapporti)).sort((a, b) => a.t - b.t).slice(-8).map(r => `<li><small>${esc(quandoW(st, r.t))}</small> · ${r.chi && r.chi !== 'sys' ? '<b>' + esc(nome(G.byId(st, r.chi))) + '</b>: ' : ''}${esc(r.testo)}</li>`).join('')}</ul>
        ${m.conseguenze.concat(...subs.map(x => x.conseguenze)).filter(c => !c.nascosta).map(c => `<div style="color:#e66"><small>${esc(c.testo)}</small></div>`).join('')}
        ${on ? `<div style="margin-top:4px">${[['pulito', 'pulito', m.vincoli.pulito], ['niente_botte', 'niente botte', m.vincoli.niente.includes('picchia')], ['non_spendere', 'non spendere', m.vincoli.budget === 0], ['niente_rapine', 'niente rapine', m.vincoli.rapine === false], ['niente_armi', 'niente armi vere', m.vincoli.armi !== 'tutte']].map(([k, w, v]) => `<label style="margin-right:8px"><input type="checkbox" data-pa-v="${k}" data-id="${m.id}" ${v ? 'checked' : ''}> ${w}</label>`).join('')}
          <br><button type="button" data-pa-m="tempo" data-id="${m.id}">Più tempo</button> <button type="button" data-pa-m="lascia" data-id="${m.id}">Lascia stare</button></div>` : m.finale ? `<div><small>${esc(m.finale)}</small></div>` : ''}
      </div>`;
    };
    return '<p class="hint">Gli obiettivi aperti: chi li ha presi li fa a modo suo. La barra la conta il motore, da quello che le fasi hanno reso davvero.</p>' + L.map(one).join('');
  }
  Parola.mandatiHtml = mandatiHtml;

  // ================= IL TACCUINO: la scheda «Parola data» =================
  const STATO_W = { accettata: 'promesso', in_corso: 'in corso', attesa: 'in attesa', fatta: '✓ mantenuta', fallita: '✗ fallita', rotta: '⊘ rotta', scaduta: '⊘ scaduta', annullata: '– annullata' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function passoOra(st, p) {
    const n = G.byId(st, p.chi), L = p.link || {};
    if (L.tipo === 'task' && n && n.ris && n.ris.task === L.obj) { const s = L.obj.steps[L.obj.i] || {}; return s.k === 'go' ? 'in cammino' : s.k === 'work' ? 'al lavoro' : s.k === 'hold' ? (s.shadow ? 'gli sta dietro' : 'aspetta') : s.k === 'meet' ? 'lo cerca' : s.k === 'follow' ? 'ti segue' : 'ci siamo'; }
    if (L.tipo === 'piano' && n && n.pop && n.pop.emer === L.obj) { const s = L.obj.steps[L.obj.i]; return s ? s.label : ''; }
    if (L.tipo === 'appt') return `alle ${hhmm(L.obj.t)}`;
    if (L.tipo === 'veglia') return 'fa il palo';
    if (L.tipo === 'with') return 'con te';
    return STATO_W[p.stato] || p.stato;
  }
  function taccuinoHtml(st) {
    const M = S(st), chiN = id => (id === 'player' ? 'Tu' : nome(G.byId(st, id)));
    const left = p => (p.scadenza ? Math.max(0, Math.round(p.scadenza - st.t)) : null);
    const minW = m => (m === null ? '' : m >= 120 ? ` · ${Math.round(m / 60)} ore` : ` · ${m} min`);
    const loro = M.promesse.filter(p => p.chi !== 'player' && ACTIVE.includes(p.stato));
    const mie = M.promesse.filter(p => p.chi === 'player' && ACTIVE.includes(p.stato));
    const fine = M.storia.map(id => M.promesse.find(p => p.id === id)).filter(Boolean).slice(0, 10);
    const li = (s, cls) => `<li class="${cls || ''}">${s}</li>`;
    return `<p class="hint">Quello che si dice si fa: ogni sì è una promessa, e il motore la porta avanti. Chi rompe la parola si vede.</p>` +
      `<h4>Ti hanno promesso</h4><ul>${loro.length ? loro.map(p => li(`<b>${esc(chiN(p.chi))}</b> · ${esc(p.desc)} · ${esc(passoOra(st, p))}${esc(minW(left(p)))}${p.passi.length ? ` <span style="opacity:.75">· «${esc(p.passi[p.passi.length - 1].testo)}»</span>` : ''}`)).join('') : li('<span style="opacity:.7">Nessuno ti deve niente, per ora.</span>')}</ul>` +
      `<h4>Hai promesso tu</h4><ul>${mie.length ? mie.map(p => li(`A <b>${esc(chiN(p.a))}</b>: ${esc(p.desc)} · <span style="${left(p) !== null && left(p) < 60 ? 'color:#e66' : ''}">entro ${esc(G.dayName(p.scadenza || st.t))} ${esc(hhmm(p.scadenza || st.t))}</span>`)).join('') : li('<span style="opacity:.7">Non hai promesso niente a nessuno.</span>')}</ul>` +
      `<h4>Com'è andata</h4><ul>${fine.length ? fine.map(p => li(`${esc(STATO_W[p.stato] || p.stato)} · <b>${esc(chiN(p.chi))}</b>${p.chi === 'player' ? ' → ' + esc(chiN(p.a)) : ''}: ${esc(p.desc)}${p.esito_msg ? ` <span style="opacity:.75">· ${esc(p.esito_msg)}</span>` : ''}`, p.stato === 'fatta' ? 'good' : 'bad')).join('') : li('<span style="opacity:.7">Ancora niente.</span>')}</ul>`;
  }
  Parola.taccuinoHtml = taccuinoHtml;
  // la scheda si aggiunge al Taccuino da fuori: un bottone in più nel nav, ridisegnato ogni volta che main.js ridisegna
  const SCHEDE = [['parola', 'Parola data', st => taccuinoHtml(st)], ['mandati', 'Mandati', st => mandatiHtml(st)]];
  function installaTaccuino() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    let mine = false, obs = null;
    const book = () => document.getElementById('book');
    const show = () => {
      const b = book(), st = window.__pv && window.__pv.st; if (!b || !st) return;
      const body = b.querySelector('.body'), nav = b.querySelector('nav'); if (!body || !nav) return;
      if (obs) obs.disconnect();
      nav.querySelectorAll('button').forEach(x => x.setAttribute('aria-selected', String(x.dataset.t === mine)));
      body.innerHTML = (SCHEDE.find(x => x[0] === mine) || SCHEDE[0])[2](st);
      body.querySelectorAll('[data-pa-m]').forEach(x => x.onclick = e => { e.stopPropagation(); if (x.dataset.paM === 'tempo') Parola.piuTempo(st, x.dataset.id, 1); else Parola.lasciaStare(st, x.dataset.id); show(); });
      body.querySelectorAll('[data-pa-v]').forEach(x => x.onchange = e => { e.stopPropagation(); Parola.vincola(st, x.dataset.id, x.dataset.paV, x.checked); show(); });
      if (obs) obs.observe(b, { childList: true });
    };
    const decorate = () => {
      const b = book(), nav = b && b.querySelector('nav'); if (!nav || nav.querySelector('[data-t="parola"]')) return;
      SCHEDE.forEach(([k, w]) => { const btn = document.createElement('button'); btn.setAttribute('role', 'tab'); btn.dataset.t = k; btn.setAttribute('aria-selected', 'false'); btn.textContent = w; btn.onclick = e => { e.stopPropagation(); mine = k; show(); }; nav.appendChild(btn); });
      if (mine) show();
    };
    const start = () => {
      const b = book(); if (!b) { setTimeout(start, 500); return; }
      b.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('nav button[data-t]'); if (t && !SCHEDE.some(x => x[0] === t.dataset.t)) mine = false; }, true);
      obs = new MutationObserver(decorate); obs.observe(b, { childList: true }); decorate();
    };
    start();
  }
  { const go = () => { try { installaTaccuino(); } catch (e) { if (typeof console !== 'undefined') console.warn('[Parola] Taccuino', e); } try { installaBanda(); } catch (e) { if (typeof console !== 'undefined') console.warn('[Parola] banda', e); } try { installaMente(); } catch (e) { } };
    if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go(); } }

  try { installaMente(); } catch (e) { }
  Parola._ = { norm, toks, verifica, capisci, battuta, impegna, esitoTask, S, grigiVicino, trustOf, segmenti, metodi, misura, tickMandati, bandaChat, mandaGrigi, puntoVicino, complici, mezzoDi };
})();
