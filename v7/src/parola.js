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
    else if (/\b(prometto|te l[aoie] porto|te li porto|te le porto|te lo trovo|te la trovo|ci penso io a)\b/.test(t) && S(st).pend[n.id]) I = mk('prometto');
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
    if (/trasmett|in onda|radio scirocco/.test(t)) acts.push({ verbo: 'trasmetti', ore: h || 2 });
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
    if (I.dubbio) return R('chiede', 'ambiguo', `${I.dubbio.nomi[0]} o ${I.dubbio.nomi[1]}?`, { dati: { scelte: I.dubbio.scelte, nomi: I.dubbio.nomi } });
    for (const k of D.need || []) if (!a[k]) return R('chiede', k === 'luogo' ? 'luogo' : k === 'persona' ? 'persona' : 'cosa', k === 'luogo' ? 'Dove?' : k === 'persona' ? 'Chi?' : 'Cosa?');
    if (D.motore === 'niente') return R('niente', v);
    // 2. lo stato duro
    if (n.jailedUntil > st.t) return R('rifiuta', 'cella', `${n.first} è in cella.`);
    const imp = !D.libero && impegnato(st, n);
    if (imp) return R('contratta', 'occupato', `Sta già facendo una cosa: ${imp.desc}.`, { contro: { tipo: 'dopo', dopo: imp.scadenza }, dati: { impegno: imp.desc } });
    const M = S(st);
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
    let s = w.s - grigi * .12;
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
      pol: ['Di nascosto io? Mia madre ancora non sa che fumo. Vado.', 'Vado. Una cosa grossa, che si veda dal molo.', 'Ci vado io. Il gesso mi sta bene, mi dà un\'aria da pittore.'],
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
      key = v === 'seguimi' && !(n.ris && n.ris.member) ? 'accompagna' : POL.has(v) ? 'pol' : WORKV.has(v) ? 'lavoro' : v === 'ricevi' && E.favore ? 'ricevi_favore' : v;
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
    if (p.chi !== 'player' && !muto) {
      const n = G.byId(st, p.chi); if (!n) return;
      if (stato === 'fatta') passo(st, p, n, 'fatta', p.verbo === 'pedina' || /\d/.test(msg || '') ? 'Fatto. ' + cap1(String(msg || '').replace(/^.*?: fatto\.\s*/, '')) : scegli(st, n, 'fatta', BANCHE.fatta), { forza: true });
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
    if (p.stato === 'fatta') { n.ris.bond = clamp(n.ris.bond + .06, -.5, .6); note(st, n, `${NAME()} ha mantenuto la parola: ${p.desc}`, 'good', { who: 'player', w: .4, tag: 'parola' }); M.rotte[n.id] = 0; }
    else if (p.stato === 'rotta' || p.stato === 'scaduta') {
      if (!p.consFatte) { n.ris.bond = clamp(n.ris.bond - .08, -.5, .6); note(st, n, `${NAME()} aveva detto che ${p.desc}, e niente`, 'bad', { who: 'player', w: .5, tag: 'bidone' }); }
      M.rotte[n.id] = (M.rotte[n.id] || 0) + 1;
      if (M.rotte[n.id] >= 2) { M.diffida[n.id] = st.t + 2 * 1440; M.rotte[n.id] = 0; }
    }
  }

  // ================= L'IMPEGNO: si fa partire la cosa, poi si parla =================
  function impegna(st, n, I, E, canale) {
    const v = I.verbo, a = Object.assign({}, I.args || {}), r = n.ris, member = !!(r && r.member), P = n.pop, M = S(st);
    const base = { chi: n.id, a: 'player', verbo: v, args: a, canale: canale || 'chat', thread: n.id };
    delete a._c;
    // compiti della Risacca (membri)
    if (member && (defOf(v).motore === 'task' || ['vai', 'aspetta', 'seguimi'].includes(v))) {
      const res = RS.assign(st, n, v, a, 'parola'); if (!res.ok) return { ok: false, msg: res.msg };
      const T = n.ris.task; const p = nuovaPromessa(st, Object.assign(base, { desc: T.desc, link: { tipo: 'task', id: T.id, obj: T }, stato: 'in_corso', scadenza: v === 'seguimi' ? null : st.t + taskMinuti(T) + 180, dove: luogoDi(T) }));
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
      const id = a.cosa, q = a.quanto || 1, nm = (Og() && Og().CAT[id] ? Og().CAT[id].nome : (Az().ITEMS[id] || {}).name) || id;
      const to = a.a === 'player' ? null : G.byId(st, a.a);
      const steps = [];
      const inv = (P.inv || {})[id] || 0, casa = (P.casa || {})[id] || 0;
      if (inv < q && inv + casa >= q && P.homeT) steps.push({ label: `passa a casa a prendere ${nm}`, at: () => P.homeT, dur: 2, inside: true, outside: false, act: (s2, n2) => { const k = Math.min(q - ((P.inv || {})[id] || 0), (P.casa || {})[id] || 0); if (k > 0) { P.casa[id] -= k; if (P.casa[id] <= 0) delete P.casa[id]; P.inv = P.inv || {}; P.inv[id] = (P.inv[id] || 0) + k; } return 'next'; } });
      else if (inv + casa < q) {
        const sh = E.shop || bottega(st, n, id, q); if (!sh) return { ok: false, msg: `Non trova ${nm} da nessuna parte.` };
        steps.push({ label: `va a comprare ${nm} a ${sh.t.label}`, at: () => sh.t, dur: 3, outside: false, act: (s2, n2, E2) => { const pr = Eco().buy(s2, n2, sh.t, id, q); if (pr === null || pr === undefined) { E2.__why = `a ${sh.t.label} ${nm} non c'era, o non bastavano i soldi`; return 'stop'; } P.inv = P.inv || {}; P.inv[id] = (P.inv[id] || 0) + q; return 'next'; } });
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
      const q = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'appuntamento', desc: `andavi a ${ap.label} alle ${hhmm(ap.t)}`, link: { tipo: 'appt', obj: ap }, stato: 'accettata', quando: { t0: st.t, at: ap.t }, scadenza: ap.t + 60, thread: n.id, consFatte: true });
      return { ok: true, msg: res.msg, promessa: p, sua: q };
    }
    if (v === 'partecipa') {
      const res = RS.EXT.immediate.partecipa(st, n, a); if (!res.ok) return res;
      const Ei = E.impresa || impresaDi(st, n);
      const q = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'partecipa', desc: `andavi anche tu: ${Ei.label}`, link: { tipo: 'impresa', obj: Ei }, stato: 'accettata', quando: { t0: st.t, at: Ei.t }, scadenza: Ei.t + 60, thread: n.id, consFatte: true });
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
      if (ct.tipo === 'oggetto') { const R0 = RS.RES[ct.id]; p = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'procura', desc: `portavi ${quantiDi(R0 ? R0.one || R0.name : ct.id, ct.quanto || 1)} per ${nome(n)}`, condizione: { tipo: 'risorsa', id: ct.id, quanto: ct.quanto || 1 }, stato: 'attesa', scadenza: (dayIdx(st.t) + 2) * 1440, thread: n.id, intento: pd.intento }); }
      else if (ct.tipo === 'prova' && ct.prova && ct.prova.tipo === 'oggetto') p = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'porta_a', desc: `portavi ${ct.prova.label} a ${n.first}`, condizione: { tipo: 'dare', ids: ct.prova.ids }, stato: 'attesa', scadenza: (dayIdx(st.t) + 2) * 1440, thread: n.id });
      else if (ct.tipo === 'soldi') p = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'paga', desc: `davi ${ct.quanto}.000 lire a ${n.first}`, condizione: { tipo: 'soldi', quanto: ct.quanto }, stato: 'attesa', scadenza: (dayIdx(st.t) + 2) * 1440, thread: n.id, intento: pd.intento });
      else p = nuovaPromessa(st, { chi: 'player', a: n.id, verbo: 'prova', desc: `facevi ${ct.prova ? ct.prova.frase : 'quello che ha chiesto'}`, condizione: { tipo: 'missione' }, stato: 'attesa', scadenza: (dayIdx(st.t) + 3) * 1440, thread: n.id });
      delete M.pend[n.id];
      return { ok: true, msg: `Hai promesso a ${n.first}: ${p.desc.replace(/^portavi/, 'porti').replace(/^davi/, 'dai').replace(/^facevi/, 'fai')}.`, sua: p };
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
  const taskMinuti = T => T.steps.reduce((s, x) => s + (x.k === 'work' ? (x.hours || 1) * 60 : x.k === 'hold' ? x.mins || 0 : x.k === 'go' || x.k === 'meet' ? 25 : 2), 0);
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
    const C = capisci(st, n, text);
    let I = C.intento, E = verifica(st, n, I), out = [], main = null, extraSay = null;
    // si fa partire la cosa (solo se l'esito è accetta); se non parte, l'esito diventa un rifiuto col motivo vero
    const run = (I0, E0) => {
      if (E0.esito !== 'accetta') return E0;
      const res = impegna(st, n, I0, E0, opt.canale);
      if (res && res.msg !== undefined) out.push(Object.assign({ verb: I0.verbo, label: (RS.VERBS[I0.verbo] || {}).label || I0.verbo }, res));
      if (!res || !res.ok) return { esito: 'rifiuta', motivo: { tipo: 'impossibile', testo: (res && res.msg) || 'non si può', dati: {} }, contro: null };
      E0.res = res; if (I0.verbo === 'ricevi' && /favore/.test(res.msg || '')) E0.favore = true;
      if (I0.verbo === 'missione' && res.ok) extraSay = res.msg;
      if (I0.verbo === 'rivela_spazio' && res.ok) extraSay = `C'è un posto: ${String(res.msg).replace(/^Ti indica /, '').replace(/\.$/, '')}. Non dirlo a nessuno.`;
      if (I0.verbo === 'chiedi_aiuto' && res.ok) extraSay = `Visto che chiedi… ${String(res.msg).replace(/^.*ti chiede: /, 'mi servirebbe ').replace(/\.$/, '')}.`;
      return E0;
    };
    E = run(I, E);
    // soldi dati per una contro-offerta: la cosa chiesta prima riparte, pagata
    if (I && I.verbo === 'ricevi_soldi' && E.esito === 'accetta' && M.pend[n.id] && M.pend[n.id].contro && M.pend[n.id].contro.tipo === 'soldi') {
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
    let say = extraSay || battuta(st, n, fin.I, fin.E);
    if (fin.E.esito !== 'accetta' && promette(say)) { M.stats.guardia++; say = scegli(st, n, 'niente:_', BANCHE.niente._); }
    if (fin.E.esito === 'rifiuta' && fin.E.motivo && fin.E.motivo.testo && !out.some(x => x.ok === false)) out.push({ verb: fin.I ? fin.I.verbo : '', ok: false, msg: veroMotivo(fin.E) });
    if ((fin.E.esito === 'chiede' || fin.E.esito === 'contratta') && fin.E.motivo && fin.E.motivo.testo) out.push({ verb: fin.I ? fin.I.verbo : '', ok: null, msg: veroMotivo(fin.E) });
    M.stats.risposte++; M.stats.esiti[fin.E.esito] = (M.stats.esiti[fin.E.esito] || 0) + 1;
    const pr = (fin.E.res && (fin.E.res.promessa || fin.E.res.sua)) || null;
    if (pr) pr.parole = `«${say}»`;
    const said = { role: 'npc', text: say, raw: JSON.stringify({ risposta: say, esito: fin.E.esito }), mood: '', t: st.t, esito: fin.E.esito };
    ch.push(said);
    out.filter(x => x.msg).forEach(x => ch.push({ role: 'sys', text: (x.ok ? '✓ ' : x.ok === false ? '✗ ' : '· ') + x.msg, ok: x.ok === null ? undefined : x.ok, t: st.t }));
    if (ch.length > 80) ch.splice(0, ch.length - 80);
    const memo = `Mi ha detto: «${String(text).slice(0, 60)}»`; r.notes.push(memo); if (r.notes.length > 12) r.notes.shift();
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
    if (vista && st.ris.inbox) st.ris.inbox.forEach(e => vista.add(e));
  }
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
    if (d > 11) walk(tn.x, tn.y, d > 25 ? 3.4 : 1.9);
    else { n.speedNow = 0; n.path = []; n.goal = null; n.face = Math.atan2(tn.y - n.y, tn.x - n.x); }
    if (T.__preso && st.t - (T.__shT || -1e9) >= 5) {
      T.__shT = st.t; const pl = G.nearestPlace(tn.x, tn.y).name; T.__posti = T.__posti || []; if (T.__posti[T.__posti.length - 1] !== pl) T.__posti.push(pl);
      T.__chi = T.__chi || {}; st.npcs.forEach(k => { if (k !== tn && k !== n && !k.dead && !k.passante && !k.inside && dist(k.x, k.y, tn.x, tn.y) < 3) T.__chi[k.id] = (T.__chi[k.id] || 0) + 1; });
      T.__d = T.__d || []; T.__d.push(Math.round(d * 10) / 10);
    }
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
  function installaTaccuino() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    let mine = false, obs = null;
    const book = () => document.getElementById('book');
    const show = () => {
      const b = book(), st = window.__pv && window.__pv.st; if (!b || !st) return;
      const body = b.querySelector('.body'), nav = b.querySelector('nav'); if (!body || !nav) return;
      if (obs) obs.disconnect();
      nav.querySelectorAll('button').forEach(x => x.setAttribute('aria-selected', String(x.dataset.t === 'parola')));
      body.innerHTML = taccuinoHtml(st);
      if (obs) obs.observe(b, { childList: true });
    };
    const decorate = () => {
      const b = book(), nav = b && b.querySelector('nav'); if (!nav || nav.querySelector('[data-t="parola"]')) return;
      const btn = document.createElement('button'); btn.setAttribute('role', 'tab'); btn.dataset.t = 'parola'; btn.setAttribute('aria-selected', 'false'); btn.textContent = 'Parola data';
      btn.onclick = e => { e.stopPropagation(); mine = true; show(); };
      nav.appendChild(btn);
      if (mine) show();
    };
    const start = () => {
      const b = book(); if (!b) { setTimeout(start, 500); return; }
      b.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('nav button[data-t]'); if (t && t.dataset.t !== 'parola') mine = false; }, true);
      obs = new MutationObserver(decorate); obs.observe(b, { childList: true }); decorate();
    };
    start();
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installaTaccuino); else installaTaccuino(); }

  Parola._ = { norm, toks, verifica, capisci, battuta, impegna, esitoTask, S, grigiVicino, trustOf };
})();
