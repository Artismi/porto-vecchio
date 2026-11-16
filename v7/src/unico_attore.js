/* [unico] unico_attore.js: IL CORPO DEL SISTEMA UNICO, passo 1 (progetto: commedia/SISTEMA_UNICO.md §2.1, §2.1.1, §3.1, §10 riga 1).
   Dietro ?commedia. Spento il flag: Attore = { ON: false }, Roba = { ON: false } e nient'altro.

   ATTORE.DI(st, chi) è la sola vista del corpo, uguale per il giocatore e per l'NPC: non copia niente, legge e scrive con getter e
   setter sullo stato vero (st.player e st.me per Nino, n e n.pop per gli abitanti). Le viste stanno in cache in un WeakMap sull'oggetto
   (st.player o l'NPC) e non si salvano mai. chi: 'player' (chi siede al posto del giocatore: Unico.sedile), 'nino', un id, un NPC.
   I campi (Attore.CAMPI) sono quelli della tabella §2.1: id, nome, sesso, tipo, x, y, face, dove, borsa, casa, soldi, mano, bisogni,
   mezzo, lavoro, abilita, banda, decisore, lod, eccezioni.
   - borsa: una vista a forma di Map (get/set/has/delete/keys/entries/size/forEach, in più add/togli) su st.player.inv o n.pop.inv;
     le chiavi sono quelle di Roba. Leggere non crea niente: l'oggetto sotto nasce alla prima scrittura (come Oggetti.inv).
   - casa: { bi, x, y, nome, pasti, dispensa } su st.me.home/pantry/stash o n.pop.homeT/pantry; la dispensa degli NPC (che oggi
     non c'è) sta in st.u.corpi[id].dispensa e nasce alla prima scrittura.
   - bisogni: i sette nomi (fame, sonno, igiene, svago, compagnia, rabbia, paura) letti e scritti su st.me.need o n.pop.need.
   Il travaso della presa di corpo (Attore.travasa, §8.3) è del passo 8: qui il giocatore è sempre Nino.

   ROBA è il catalogo solo (§2.1.1): le chiavi sono quelle di Oggetti.CAT (oggetti.js:42), la verità. Le altre fonti (Azioni.ITEMS,
   Risacca.RES, Economia.MERCI, le cose di casa.js:94-113) si traducono con una tabella sola: Roba.di(chiave) dà la voce
   { id, nome, fonte, g, n, art, pl, corto, prezzo, peso, cat, prop, rubabile, commestibile, attrezzo, arma, illegale, az, ris, eco,
   casa, verso }; Roba.chiave(qualunque) la chiave di Oggetti.CAT che le corrisponde. Il lessico (g, n, art, pl) viene da Lingua
   (unico_lingua.js) sulle teste di unico_catalogo.js. */
var Roba = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Roba = { ON };
  if (!ON) return Roba;
  const UC = () => (typeof UnicoCatalogo !== 'undefined' && UnicoCatalogo.ON ? UnicoCatalogo : null);
  const LG = () => (typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null);
  let T = null, NOMI = null, fatto = false;
  const pulito = s => String(s || '').replace(/\s*\([^)]*\)/g, '').trim();
  // il nome corto: «pacco di biscotti» → «biscotti» (la regola di iniziative.js nm(), senza le parentesi da magazzino)
  const CORTO_RE = /^(?:flacone|fascio|fasci|sacchetto|sacco|scatola|scatolina|pacco|barattolo|cassetta|mazzo|rotolo|confezione|bottiglia|vasetto|bustina|tanica|pezzo|paio|stecca|latta|tavoletta|matassa|risma|forma|litro|gavetta|tazzina|secchio|pallet|coppia) (?:d[ie]l?l?[ao']? ?|d')(.+)$/;
  const corto = s => { const p = pulito(s), m = p.match(CORTO_RE); return (m ? m[1] : p).replace(/ da ardere$/, '').replace(/^(.+) secchi$/, '$1'); };
  function voce(id, nome, fonte, ex) {
    const e = Object.assign({ id, nome: pulito(nome), fonte, prezzo: 0, peso: 1, cat: null, prop: [], az: null, ris: null, eco: null, casa: null, verso: null }, ex || {});
    e.corto = corto(nome); T.set(id, e); return e;
  }
  function proprieta(e, x) {
    const C = UC(), P = new Set(e.prop);
    if (C) {
      (C.PROP_CAT[e.cat] || []).forEach(p => P.add(p));
      const s = e.nome.toLowerCase(); for (const [p, re] of C.PROP_RE) if (re.test(s)) P.add(p);
    }
    if (x) { if (x.eat) P.add('commestibile'); if (x.tool) P.add('attrezzo'); if (x.ill) P.add('illegale'); if (x.wpn || x.weapon) P.add('arma'); if (x.imp) P.add('importato'); if (x.st) P.add('postazione'); if (x.heat) P.add('infiammabile'); if (x.empty) P.add('contenitore'); }
    if (e.peso >= 8) P.add('pesante'); if (e.peso <= .3) P.add('piccolo');
    if (P.has('pesante') || P.has('mobile')) P.add('rigido');
    e.prop = C ? Array.from(P).filter(p => C.PROP.includes(p)) : Array.from(P);
  }
  function costruisci() {
    if (T) return T;
    T = new Map(); NOMI = new Map();
    const O = typeof Oggetti !== 'undefined' ? Oggetti : null, A = typeof Azioni !== 'undefined' ? Azioni : null;
    const R = typeof Risacca !== 'undefined' ? Risacca : null, E = typeof Economia !== 'undefined' ? Economia : null, C = UC();
    // 1. Oggetti.CAT: la verità
    if (O && O.CAT) for (const k in O.CAT) { const x = O.CAT[k]; const e = voce(k, x.nome, 'cat', { prezzo: x.prezzo, peso: x.peso, cat: x.cat }); proprieta(e, x); }
    // 2. Azioni.ITEMS: la stessa chiave, o una voce sua (il pennello)
    if (A && A.ITEMS) for (const k in A.ITEMS) { const it = A.ITEMS[k]; let e = T.get(k); if (!e) { e = voce(k, it.name || k, 'az'); proprieta(e, it); } e.az = k; if (it.weapon && !e.prop.includes('arma')) e.prop.push('arma'); }
    // 3. Risacca.RES: le categorie della banda (viveri, attrezzi, materiali, radio) sono voci sue, con la cosa che le fa (verso)
    if (R && R.RES) for (const k in R.RES) { const r = R.RES[k]; let e = T.get(k); if (!e) { e = voce(k, r.one || r.name || k, 'ris', { cat: 'ris' }); proprieta(e); e.verso = (C && C.RIS2ROBA[k]) || null; } e.ris = k; }
    // 4. Economia.MERCI: [nome, prezzo, categoria, scorta]
    if (E && E.MERCI) for (const k in E.MERCI) { const m = E.MERCI[k]; let e = T.get(k); if (!e) { e = voce(k, m[0], 'eco', { prezzo: m[1], cat: m[2] }); proprieta(e); } e.eco = k; }
    // 5. le cose di casa (casa.js:94-113): l'id del mobile, il nome senza articolo, la roba delle tasche che diventa (verso)
    if (C) for (const k in C.MOBILI) { let e = T.get(k); if (!e) { e = voce(k, C.MOBILI[k].replace(/^(il|lo|la|i|gli|le) |^l'/, ''), 'casa', { cat: 'casa', peso: 5 }); e.prop = ['mobile']; } e.casa = k; e.verso = C.MOBILE2ROBA[k] || null; }
    if (C) for (const k in C.MOBILE2ROBA) { const e = T.get(k); if (e && !e.casa) { e.casa = k; e.verso = C.MOBILE2ROBA[k]; } }
    for (const e of T.values()) { const nk = e.nome.toLowerCase(); if (!NOMI.has(nk)) NOMI.set(nk, e.id); const ck = e.corto.toLowerCase(); if (!NOMI.has(ck)) NOMI.set(ck, e.id); }
    fatto = true;
    lessico();
    return T;
  }
  // il lessico di ogni voce: il genere e il numero della testa, l'articolo, il plurale (Lingua; se manca, le voci restano senza)
  function lessico() {
    const L = LG(); if (!L) return;
    for (const e of T.values()) {
      const g = L.genere(e.nome); e.g = g.g; e.n = g.n; e.noto = g.noto; e.massa = g.massa;
      e.art = L.forma('det', g.g, g.n === 'p', g.h); e.pl = L.plurale(e.nome);
      e.rubabile = e.peso <= 1.5 && !e.prop.includes('mobile') && e.fonte !== 'ris';
      e.commestibile = e.prop.includes('commestibile'); e.attrezzo = e.prop.includes('attrezzo'); e.arma = e.prop.includes('arma'); e.illegale = e.prop.includes('illegale');
    }
  }
  // la voce di una chiave qualunque (di Oggetti.CAT, Azioni.ITEMS, Risacca.RES, Economia.MERCI, un mobile di casa), o null
  function di(k) {
    if (k == null) return null; const M = costruisci(); let e = M.get(k);
    if (!e && fatto && typeof Interior !== 'undefined' && Interior.FNAME && Interior.FNAME[k]) { e = voce(k, Interior.FNAME[k], 'casa', { cat: 'casa', peso: 5 }); e.prop = ['mobile']; e.casa = k; const L = LG(); if (L) { const g = L.genere(e.nome); Object.assign(e, { g: g.g, n: g.n, noto: g.noto, art: L.forma('det', g.g, g.n === 'p', g.h), pl: L.plurale(e.nome), rubabile: false }); } }
    return e || null;
  }
  // la chiave di Oggetti.CAT che corrisponde (una categoria della Risacca, un mobile: la cosa che li fa; una chiave già buona: sé stessa)
  function chiave(k) {
    const e = di(k); if (!e) return null;
    if (e.fonte === 'cat') return e.id;
    if (e.verso) { const v = di(e.verso); if (v && v.fonte === 'cat') return v.id; if (v && v.verso) return chiave(v.verso); return v ? v.id : null; }
    return e.id;
  }
  // dal nome alla chiave: «pacco di biscotti», «biscotti», «la sedia»
  function cerca(nome) { costruisci(); const s = pulito(nome).toLowerCase().replace(/^(il|lo|la|i|gli|le|un|uno|una) |^(l'|un')/, ''); return NOMI.get(s) || null; }
  const tutte = fonte => Array.from(costruisci().values()).filter(e => !fonte || e.fonte === fonte).map(e => e.id);
  Object.assign(Roba, { di, chiave, cerca, tutte, corto, _: { costruisci, lessico, rifai: () => { T = null; fatto = false; } } });
  return Roba;
})();

var Attore = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Attore = { ON };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Attore; Attore.Roba = Roba; }
  if (!ON) return Attore;
  const GM = () => (typeof Game !== 'undefined' ? Game : null);
  const CAMPI = ['id', 'nome', 'sesso', 'tipo', 'x', 'y', 'face', 'dove', 'borsa', 'casa', 'soldi', 'mano', 'bisogni', 'mezzo', 'lavoro', 'abilita',
    'banda', 'decisore', 'lod', 'eccezioni'];
  const BISOGNI = ['fame', 'sonno', 'igiene', 'svago', 'compagnia', 'rabbia', 'paura'];
  const ABILITA = ['manualita', 'cucina', 'pesca', 'vendere', 'forza', 'furtivita', 'pittura'];

  // il posto di guida: chi il giocatore guida adesso (§8.3). Al passo 1 è sempre Nino
  const sedile = st => (st && st.u && st.u.sedile) || 'nino';
  // i campi in più degli NPC (e di Nino quando non è guidato), in st.u.corpi: solo numeri, stringhe, oggetti semplici
  function corpo(st, id, crea) { if (!st) return null; if (!st.u) { if (!crea) return null; st.u = { v: 1 }; } const C = st.u.corpi || (crea ? (st.u.corpi = {}) : null); if (!C) return null; return C[id] || (crea ? (C[id] = {}) : null); }

  // ======================= LA BORSA: una vista a forma di Map su un oggetto { chiave: quanti } =======================
  class Borsa {
    constructor(leggi, crea, mano) { this._l = leggi; this._c = crea; this._m = mano || null; }
    _o() { return this._l() || null; }
    get(k) { const o = this._o(); return o && o[k] > 0 ? o[k] : 0; }
    has(k) { return this.get(k) > 0; }
    set(k, q) { if (!(q > 0)) { this.delete(k); return this; } this._c()[k] = q; return this; }
    delete(k) { const o = this._o(); if (!o || !(k in o)) return false; delete o[k]; if (this._m) this._m(k); return true; }
    add(k, q) { q = q === undefined ? 1 : q; const v = this.get(k) + q; this.set(k, v); return this.get(k); }
    togli(k, q) { q = q === undefined ? 1 : q; const v = this.get(k), t = Math.min(v, q); if (t <= 0) return 0; if (v - t > 1e-9) this._c()[k] = v - t; else this.delete(k); return t; }
    keys() { const o = this._o(); return (o ? Object.keys(o).filter(k => o[k] > 0) : [])[Symbol.iterator](); }
    entries() { const o = this._o(); return (o ? Object.keys(o).filter(k => o[k] > 0).map(k => [k, o[k]]) : [])[Symbol.iterator](); }
    values() { return Array.from(this.entries(), e => e[1])[Symbol.iterator](); }
    forEach(f, t) { for (const [k, v] of this.entries()) f.call(t, v, k, this); }
    get size() { const o = this._o(); return o ? Object.keys(o).filter(k => o[k] > 0).length : 0; }
    [Symbol.iterator]() { return this.entries(); }
    toJSON() { return Object.fromEntries(this.entries()); }
  }
  // i bisogni: i sette nomi, letti (0 se mancano) e scritti sull'oggetto vero
  function bisogniDi(leggi, crea) {
    const B = {};
    for (const k of BISOGNI) Object.defineProperty(B, k, { enumerable: true, get() { const o = leggi(); return o && typeof o[k] === 'number' ? o[k] : 0; }, set(v) { crea()[k] = v; } });
    return Object.freeze(B);
  }
  // la casa: { bi, x, y, nome, pasti (get/set sul numero vero), dispensa (una Borsa) }
  function casaDi(h, leggiPasti, scriviPasti, disp) {
    if (!h) return null;
    const c = { bi: h.bi !== undefined ? h.bi : -1, x: h.x, y: h.y, nome: h.label || h.name || null };
    Object.defineProperty(c, 'pasti', { enumerable: true, get: leggiPasti, set: scriviPasti });
    c.dispensa = disp; return c;
  }
  const lavoroDi = J => { if (!J) return null; const t = J.t || null; return { posto: J.bi >= 0 && J.bi !== undefined ? 'b:' + J.bi : t && t.k === 'b' ? 'b:' + t.bi : J.place || (t && (t.place || t.pid)) || null,
    inizio: J.start, fine: J.end, notte: !!J.night, mestiere: J.base || J.title || null, paga: J.pay || 0 }; };
  // l'abilità: 0..1, dal mestiere e dal giro (cambia la riuscita e la durata, mai l'accesso a un verbo); st.u.corpi[id].abilita la sposta
  const ABIL_RE = [['pesca', /pescat|marinai/], ['cucina', /cuoc|oste|fornai|panettier|barist|pasticc/], ['manualita', /meccanic|falegn|fabbr|saldator|elettric|idraulic|sart|calzolai|muratore|carpentier/],
    ['vendere', /vendit|commerc|bottega|merciai|ambulant|negozi|tabacc|ricettator|trafficant/], ['forza', /scaricator|muratore|facchin|portuale|camallo|minator|contadin/],
    ['furtivita', /ladro|borseggi|ricettator|spia|orecchio/], ['pittura', /pittor|writer|imbianchin|decorator|tipograf/]];
  function abilitaDi(mestiere, giro, extra) {
    const s = String(mestiere || '') + ' ' + String(giro || ''), A = {};
    for (const k of ABILITA) A[k] = .3;
    for (const [k, re] of ABIL_RE) if (re.test(s)) A[k] = .8;
    if (extra) for (const k in extra) if (typeof extra[k] === 'number') A[k] = extra[k];
    return A;
  }

  // ======================= LE DUE FORME DEL CORPO, CON LO STESSO INTERFACCIA =======================
  // Nino: st.player, st.me (protagonista.js)
  class CorpoNino {
    constructor(st) {
      this._st = st; const p = () => this._st.player, me = () => this._st.me || null;
      this._borsa = new Borsa(() => p().inv, () => (p().inv = p().inv || {}), k => { if (p().hand === k) p().hand = null; });
      this._disp = new Borsa(() => (me() ? me().stash : null), () => { const m = me(); if (!m) return corpo(this._st, 'nino', true).dispensa || (corpo(this._st, 'nino', true).dispensa = {}); return (m.stash = m.stash || {}); });
      this._bis = bisogniDi(() => (me() ? me().need : null), () => { const m = me(); return m ? (m.need = m.need || {}) : (corpo(this._st, 'nino', true).need = corpo(this._st, 'nino', true).need || {}); });
    }
    get id() { return 'nino'; }
    get nome() { const G = GM(); return (G && G.PLAYER_NAME) || 'Nino'; }
    get sesso() { return 'm'; }
    get tipo() { return 'nino'; }
    get x() { return this._st.player.x; } set x(v) { this._st.player.x = v; }
    get y() { return this._st.player.y; } set y(v) { this._st.player.y = v; }
    get face() { return this._st.player.face; } set face(v) { this._st.player.face = v; }
    get dove() { const p = this._st.player; if (p.lv && p.lv.k) return { k: 'sotto', lv: p.lv.k }; if (p.indoor) return { k: 'dentro', b: p.indoor.b, f: p.indoor.f || 0 }; return { k: 'fuori' }; }
    get borsa() { return this._borsa; }
    get casa() { const m = this._st.me; if (!m || !m.home) return null; return casaDi(m.home, () => m.pantry || 0, v => { m.pantry = v; }, this._disp); }
    get soldi() { return this._st.player.money || 0; } set soldi(v) { this._st.player.money = v; }
    get mano() { const p = this._st.player; if (p.hand) return p.hand; return p.cur && p.cur !== 'pugni' ? p.cur : null; }
    get bisogni() { return this._bis; }
    get mezzo() { const v = this._st.player.vehicle; return v == null ? null : (v.id !== undefined ? v.id : v); }
    get lavoro() { const m = this._st.me; return m ? lavoroDi(m.job) : null; }
    get abilita() { const m = this._st.me, c = corpo(this._st, 'nino'); return abilitaDi(m && m.job && m.job.title, null, c && c.abilita); }
    get banda() { return { membro: true, auto: false, lealta: 1, capo: true }; }
    get decisore() { return sedile(this._st) === 'nino' ? 'giocatore' : 'mente'; }
    get lod() { return 'scena'; }
    get eccezioni() { return new Set(); }
    get o() { return this._st.player; }
  }
  // l'abitante, il membro, il cast, la guardia: n, n.pop (popolo.js), n.ris (risacca.js)
  class CorpoNpc {
    constructor(st, n) {
      this._st = st; this._n = n;
      const P = () => n.pop || null;
      this._borsa = new Borsa(() => (P() ? P().inv : null), () => { const p = P(); if (p) return (p.inv = p.inv || {}); const c = corpo(this._st, n.id, true); return (c.inv = c.inv || {}); }, k => { if (n.hand === k) n.hand = null; });
      this._disp = new Borsa(() => { const c = corpo(this._st, n.id); return c ? c.dispensa : null; }, () => { const c = corpo(this._st, n.id, true); return (c.dispensa = c.dispensa || {}); });
      this._bis = bisogniDi(() => (P() ? P().need : null), () => { const p = P(); if (p) return (p.need = p.need || {}); const c = corpo(this._st, n.id, true); return (c.need = c.need || {}); });
    }
    get id() { return this._n.id; }
    get nome() { return this._n.first || this._n.name || this._n.id; }
    get sesso() { return (this._n.pop && this._n.pop.sex) || 'm'; }
    get tipo() { const n = this._n; if (n.cop || n.guard) return 'guardia'; if (n.ris && n.ris.member) return 'membro'; if (n.pop && !n.pop.cast) return 'abitante'; return 'cast'; }
    get x() { return this._n.x; } set x(v) { this._n.x = v; }
    get y() { return this._n.y; } set y(v) { this._n.y = v; }
    get face() { return this._n.face; } set face(v) { this._n.face = v; }
    get dove() { const n = this._n, u = n.__u; if (u && u.dove) return u.dove; if (n.inside) { const at = n.pop && n.pop.at; return { k: 'dentro', b: at && at.k === 'b' ? at.bi : (n.room && n.room.bi !== undefined ? n.room.bi : -1), f: n.room && n.room.f !== undefined ? n.room.f : 0 }; } return { k: 'fuori' }; }
    get borsa() { return this._borsa; }
    get casa() { const P = this._n.pop; if (!P || !P.homeT) return null; return casaDi(P.homeT, () => P.pantry || 0, v => { P.pantry = v; }, this._disp); }
    get soldi() { const n = this._n; return n.pop ? n.pop.money || 0 : n.money || 0; } set soldi(v) { const n = this._n; if (n.pop) n.pop.money = v; else n.money = v; }
    get mano() { return this._n.hand || null; }
    get bisogni() { return this._bis; }
    get mezzo() { const v = this._n.inVeh; return v == null || v === false ? null : (v.id !== undefined ? v.id : v); }
    get lavoro() { return this._n.pop ? lavoroDi(this._n.pop.job) : null; }
    get abilita() { const P = this._n.pop, c = corpo(this._st, this._n.id); return abilitaDi(P && P.job && (P.job.base || P.job.title), P && P.giro, c && c.abilita); }
    get banda() { const r = this._n.ris; return r ? { membro: !!r.member, auto: r.auto !== false, lealta: r.loyalty || 0, capo: false } : { membro: false, auto: true, lealta: 0, capo: false }; }
    get decisore() { if (sedile(this._st) === this._n.id) return 'giocatore'; const r = this._n.ris; return r && r.member && r.auto === false ? 'ordini' : 'mente'; }
    get lod() { const l = this._n.pop && this._n.pop.lod; return l === 'scena' || l === 'vicino' || l === 'lontano' || l === 'dormiente' ? l : 'lontano'; }
    get eccezioni() { const n = this._n, E = new Set(); if (!n.pop || n.pop.cast) { E.add('trama'); E.add('nonGuidabile'); } if (n.cop || n.guard) E.add('nonGuidabile'); if (n.faction) E.add('trama'); return E; }
    get o() { return this._n; }
  }

  // ======================= LA VISTA =======================
  const VISTE = new WeakMap();
  function cercaNpc(st, id) { const G = GM(); if (G && G.byId) { try { const n = G.byId(st, id); if (n) return n; } catch (e) { } } return (st.npcs || []).find(n => n.id === id) || null; }
  // Attore.di(st, chi): chi = 'player' (chi siede), 'nino', un id, un NPC (o st.player)
  function di(st, chi) {
    if (!st || chi == null) return null;
    let o = null;
    if (chi === 'player') chi = sedile(st);
    if (chi === 'nino' || chi === st.player) o = st.player;
    else if (typeof chi === 'object') o = chi;
    else o = cercaNpc(st, chi);
    if (!o) return null;
    let v = VISTE.get(o);
    if (!v || v._st !== st) { v = o === st.player ? new CorpoNino(st) : new CorpoNpc(st, o); VISTE.set(o, v); }
    return v;
  }
  // tutti i corpi della partita: Nino e gli NPC vivi
  function tutti(st) { const out = [di(st, 'nino')]; for (const n of st.npcs || []) if (!n.dead) out.push(di(st, n)); return out; }
  // la vista in un oggetto semplice (per l'ispettore e le prove): niente riferimenti, solo dati
  function foto(a) {
    if (!a) return null; const o = {};
    for (const k of CAMPI) { const v = a[k]; o[k] = v instanceof Borsa ? v.toJSON() : v instanceof Set ? Array.from(v) : v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; }
    return o;
  }

  Object.assign(Attore, { di, tutti, foto, sedile, CAMPI, BISOGNI, ABILITA, Borsa, Roba, _: { corpo, CorpoNino, CorpoNpc, abilitaDi } });
  if (typeof Unico !== 'undefined' && Unico.ON) { Unico.Attore = Attore; Unico.Roba = Roba; Unico.sedile = sedile; }
  return Attore;
})();
if (typeof window !== 'undefined') { window.Attore = Attore; window.Roba = Roba; }
