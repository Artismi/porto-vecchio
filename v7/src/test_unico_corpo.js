// [unico] prova del corpo del sistema unico (unico_attore.js, unico_catalogo.js, unico_lingua.js: passo 1 di commedia/SISTEMA_UNICO.md §10,
// dietro ?commedia). Uso (dalla cartella src): node test_unico_corpo.js [--ore=N]
// Controlla: Attore.di dà la stessa vista del giocatore e dell'NPC (gli stessi campi con gli stessi tipi; soldi, tasche, casa, bisogni
// letti e scritti sullo stato vero; leggere non scrive niente); Roba risolve le chiavi di tutti i cataloghi di oggi (Oggetti.CAT,
// Azioni.ITEMS, Risacca.RES, Economia.MERCI, le cose di casa) e ogni testa ha il suo lessico; Lingua accorda (≥ 40 casi: maschili e
// femminili, plurali, articoli, partitivi, preposizioni, elisioni, participi, nomi); i genere() avvolti non fanno più gli errori noti
// («delle chiave», «delle fucile», «Sandra è entrato»), anche a valle (fumetti, giornale, note, fatti); spento il flag non c'è niente;
// un giro di gioco acceso non conta errori. Esce con 1 se un caso fallisce.
'use strict';
const SRC = __dirname + '/'; process.chdir(SRC);
const ARG = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista'];
const COMMEDIA = ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa'];

let fail = 0, nOk = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (c) nOk++; else fail++; };

// ============================ spento: niente di niente (in un figlio, così i moduli si caricano senza il flag) ============================
if (process.argv.includes('--spento')) {
  global.location = { search: '' };
  const r0 = Math.random;
  const U = require(SRC + 'unico_catalogo.js'), A = require(SRC + 'unico_attore.js'), L = require(SRC + 'unico_lingua.js');
  process.stdout.write('@@' + JSON.stringify({ cat: Object.keys(U), att: Object.keys(A).filter(k => k !== 'Roba'), roba: Object.keys(A.Roba), lin: Object.keys(L), rnd: Math.random === r0 }) + '\n');
  process.exit(0);
}
{
  const { execFileSync } = require('child_process');
  const o = execFileSync(process.execPath, [__filename, '--spento'], { encoding: 'utf8' }), J = JSON.parse(o.split('\n').find(l => l.startsWith('@@')).slice(2));
  ok(J.cat.join() === 'ON' && J.att.join() === 'ON' && J.roba.join() === 'ON' && J.lin.join() === 'ON' && J.rnd, `spento il flag i tre moduli sono { ON: false } e nient'altro (${JSON.stringify(J)})`);
}

// ============================ acceso: il gioco come index.src.html ============================
global.location = { search: '?commedia' };
const zitto = console.log; console.log = (...a) => { if (!/^\[/.test(String(a[0]))) zitto(...a); };
global.World = require(SRC + 'world.js'); global.Interior = require(SRC + 'interiors.js'); global.Game = require(SRC + 'game.js');
for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require(SRC + f + '.js'); } catch (e) { } }
global.addEventListener = () => {}; global.window = {}; global.document = { readyState: 'loading', addEventListener() {} };
try { global.Cantiere = require(SRC + 'cantiere.js'); } catch (e) { }
delete global.document;
const U = global.Unico = require(SRC + 'unico_porta.js');
for (const m of COMMEDIA) { const [f, g] = m.split(':'); U._nomeProva = f; global[g] = require(SRC + f + '.js'); }
U._nomeProva = null;
// il tag «unico» di index.src.html: unico_attore.js, unico_catalogo.js, unico_lingua.js, poi Unico.chiudi()
global.Attore = require(SRC + 'unico_attore.js'); global.Roba = Attore.Roba;
global.UnicoCatalogo = require(SRC + 'unico_catalogo.js'); global.Lingua = require(SRC + 'unico_lingua.js');
U.chiudi();
console.log = zitto;
const G = Game, st = G.create(1); st.deadline = 1e12;
ok(Attore.ON && Roba.ON && Lingua.ON && UnicoCatalogo.ON && U.Attore === Attore && U.Lingua === Lingua && U.Roba === Roba, 'acceso: Attore, Roba, Lingua, UnicoCatalogo, e Unico.Attore/Roba/Lingua');

// ============================ 1. ATTORE.DI: la stessa vista per tutti ============================
const fp = x => JSON.stringify(x, (k, v) => (v instanceof Map || v instanceof Set ? Array.from(v) : typeof v === 'function' ? undefined : v));
const npcs = st.npcs.filter(n => n.pop && !n.pop.cast && n.pop.homeT && n.pop.homeT.k === 'b' && !n.dead);
const n = npcs[0], nino = Attore.di(st, 'player'), lei = Attore.di(st, n);
ok(!!n && !!nino && !!lei, `una vista per Nino e per un abitante con la casa (${n && n.id})`);
{ // leggere non scrive: le foto di tutti i corpi non cambiano lo stato
  const prima = fp(st.player) + fp(st.me) + fp(st.npcs.map(k => k.pop || null)) + fp(st.u || null);
  const F = Attore.tutti(st).map(Attore.foto);
  const dopo = fp(st.player) + fp(st.me) + fp(st.npcs.map(k => k.pop || null)) + fp(st.u || null);
  ok(prima === dopo && F.length === 1 + st.npcs.filter(k => !k.dead).length, `leggere non scrive niente: ${F.length} foto di corpi, stato uguale`);
}
{ // gli stessi campi, con gli stessi tipi
  const tipo = v => (v === null ? 'null' : v instanceof Attore.Borsa ? 'borsa' : v instanceof Set ? 'set' : typeof v);
  const T1 = Attore.CAMPI.map(k => tipo(nino[k])), T2 = Attore.CAMPI.map(k => tipo(lei[k]));
  const NULLABILI = new Set(['mano', 'mezzo', 'lavoro']);
  const diversi = Attore.CAMPI.filter((k, i) => T1[i] !== T2[i] && !(NULLABILI.has(k) && (T1[i] === 'null' || T2[i] === 'null')));
  ok(diversi.length === 0 && T1.indexOf('undefined') < 0 && T2.indexOf('undefined') < 0, `gli stessi ${Attore.CAMPI.length} campi con gli stessi tipi (diversi: ${diversi.join(',') || 'nessuno'})`);
  ok(fp(Object.keys(nino.bisogni)) === fp(Attore.BISOGNI) && fp(Object.keys(lei.bisogni)) === fp(Attore.BISOGNI), 'i bisogni: gli stessi sette nomi per tutti');
  ok(fp(Object.keys(nino.abilita)) === fp(Object.keys(lei.abilita)), 'le abilità: gli stessi nomi per tutti');
  ok(fp(Object.keys(nino.banda).sort()) === fp(Object.keys(lei.banda).sort()), 'la banda: gli stessi campi per tutti');
  ok(fp(Object.keys(nino.casa).sort()) === fp(Object.keys(lei.casa).sort()), `la casa: gli stessi campi per tutti (${Object.keys(nino.casa).join(', ')})`);
}
ok(Attore.di(st, 'player') === Attore.di(st, 'nino') && Attore.di(st, st.player) === nino && Attore.di(st, n.id) === lei && Attore.di(st, n) === lei, 'la vista sta in cache: player = nino = st.player; l\'id e l\'NPC danno la stessa');
ok(nino.id === 'nino' && nino.decisore === 'giocatore' && lei.id === n.id && (lei.decisore === 'mente' || lei.decisore === 'ordini') && U.sedile(st) === 'nino', 'il sedile: Nino guidato dal giocatore, l\'abitante dalla mente');
ok(lei.nome === n.first && lei.sesso === n.pop.sex && nino.nome === G.PLAYER_NAME && nino.sesso === 'm', `nome e sesso dall'attore (${lei.nome}, ${lei.sesso})`);
// la parità: la stessa operazione sulle due viste fa la stessa cosa sullo stato vero di ognuno
function parita(nome, f, leggi) {
  const a0 = leggi(st.player, st.me, null), b0 = leggi(n, n.pop, n.id);
  f(nino); f(lei);
  const a1 = leggi(st.player, st.me, null), b1 = leggi(n, n.pop, n.id);
  const da = fp(a1) !== fp(a0) ? [a0, a1] : null, db = fp(b1) !== fp(b0) ? [b0, b1] : null;
  const dA = da && typeof a1 === 'number' ? a1 - a0 : fp(da), dB = db && typeof b1 === 'number' ? b1 - b0 : fp(db);
  ok(!!da && !!db && (typeof a1 !== 'number' || Math.abs(dA - dB) < 1e-9), `parità ${nome}: Nino ${fp(da)} · ${n.first} ${fp(db)}`);
}
parita('dei soldi (+5)', a => { a.soldi += 5; }, (o) => (o === st.player ? st.player.money : o.pop.money));
parita('dei soldi (-3)', a => { a.soldi -= 3; }, (o) => (o === st.player ? st.player.money : o.pop.money));
parita('delle tasche (+2 pane)', a => { a.borsa.add('pane', 2); }, (o, P) => (o === st.player ? (st.player.inv || {}).pane || 0 : (n.pop.inv || {}).pane || 0));
parita('delle tasche (-1 pane)', a => { a.borsa.togli('pane', 1); }, (o) => (o === st.player ? (st.player.inv || {}).pane || 0 : (n.pop.inv || {}).pane || 0));
parita('della casa (+1 pasto)', a => { a.casa.pasti += 1; }, (o) => (o === st.player ? st.me.pantry : n.pop.pantry));
parita('della dispensa (+1 sale)', a => { a.casa.dispensa.add('sale', 1); }, (o, P, id) => (o === st.player ? (st.me.stash || {}).sale || 0 : ((((st.u || {}).corpi || {})[id] || {}).dispensa || {}).sale || 0));
nino.bisogni.fame = .2; lei.bisogni.fame = .2;
parita('dei bisogni (fame + .5)', a => { a.bisogni.fame += .5; }, (o) => (o === st.player ? st.me.need.fame : n.pop.need.fame));
nino.bisogni.paura = .3; lei.bisogni.paura = .3;
ok(st.me.need.paura === .3 && n.pop.need.paura === .3, 'i bisogni: «paura», che Nino non aveva, si scrive su st.me.need come su n.pop.need');
parita('della posizione (x + 1)', a => { a.x += 1; }, o => o.x);
ok(nino.casa.bi === st.me.home.bi && lei.casa.bi === n.pop.homeT.bi && nino.casa.bi >= 0 && lei.casa.bi >= 0, `la casa: Nino in ${nino.casa.bi} (st.me.home), ${n.first} in ${lei.casa.bi} (n.pop.homeT)`);
{ const b = lei.borsa; b.set('pane', 3); const k = Array.from(b.keys()); b.togli('pane', 5);
  ok(k.includes('pane') && !b.has('pane') && b.get('pane') === 0 && !('pane' in (n.pop.inv || {})), 'la borsa: togliere più di quello che c\'è svuota la voce e non va sotto zero');
  n.hand = 'coltello'; b.set('coltello', 1); b.togli('coltello'); ok(n.hand === null, 'la borsa: tolta l\'ultima cosa in mano, la mano si vuota (come Azioni.takeAway)'); }
{ // le chiavi delle borse sono quelle di Roba, per tutti
  const ignote = new Set(); for (const a of Attore.tutti(st)) for (const [k] of a.borsa) if (!Roba.di(k)) ignote.add(k);
  ok(ignote.size === 0, `ogni chiave nelle tasche di tutti (${Attore.tutti(st).length} corpi) è una voce di Roba (ignote: ${Array.from(ignote).join(',') || 'nessuna'})`);
}

// ============================ 2. ROBA: un catalogo solo ============================
{
  const fonti = { 'Oggetti.CAT': Object.keys(Oggetti.CAT), 'Azioni.ITEMS': Object.keys(Azioni.ITEMS), 'Risacca.RES': Object.keys(Risacca.RES), 'Economia.MERCI': Object.keys(Economia.MERCI), 'casa.js': Object.keys(UnicoCatalogo.MOBILI) };
  for (const f in fonti) {
    const K = fonti[f], manca = K.filter(k => !Roba.di(k)), senza = K.filter(k => { const e = Roba.di(k); return e && !(e.g && e.n && e.art && e.pl && e.corto); });
    ok(K.length > 0 && manca.length === 0 && senza.length === 0, `Roba risolve tutte le ${K.length} chiavi di ${f}, ognuna col lessico (mancano: ${manca.join(',') || '0'}; senza lessico: ${senza.join(',') || '0'})`);
  }
  const nonCat = Object.keys(Azioni.ITEMS).concat(Object.keys(Risacca.RES), Object.keys(Economia.MERCI)).filter(k => { const c = Roba.chiave(k); return !c || !(Oggetti.CAT[c] || Azioni.ITEMS[c]); });
  ok(nonCat.length === 0, `Roba.chiave porta ogni chiave di ITEMS, RES e MERCI a una cosa vera (non tradotte: ${nonCat.join(',') || 'nessuna'})`);
  const ignote = Object.keys(Oggetti.CAT).filter(k => !Roba.di(k).noto);
  ok(ignote.length === 0, `ogni testa dei ${Object.keys(Oggetti.CAT).length} nomi di Oggetti.CAT sta nel lessico (ignote: ${ignote.join(',') || 'nessuna'})`);
  ok(Roba.chiave('ia_radiolina') === 'radiolina' && Roba.chiave('attrezzi') === 'piede' && Roba.chiave('viveri') === 'razione' && Roba.chiave('pane') === 'pane' && Roba.di('attrezzi').fonte === 'ris',
    `le traduzioni: il mobile ia_radiolina → ${Roba.chiave('ia_radiolina')}, la categoria attrezzi → ${Roba.chiave('attrezzi')} (azioni.js RIS2ITEM), viveri → ${Roba.chiave('viveri')}`);
  ok(Roba.cerca('pacco di biscotti') === 'biscotti' && Roba.cerca('biscotti') === 'biscotti' && Roba.cerca('la sedia') === 'sedia', 'dal nome alla chiave: «pacco di biscotti», «biscotti», «la sedia»');
  const e = Roba.di('chiave_inglese'), s = Roba.di('sigarette'), t = Roba.di('pinze'), c = Roba.di('carne');
  ok(e.g === 'f' && e.n === 's' && e.art === 'la' && e.pl === 'chiavi inglesi' && e.attrezzo && e.prop.includes('metallo'), `la voce: chiave inglese (f, s, la, chiavi inglesi, attrezzo, ${e.prop.join(' ')})`);
  ok(s.nome === 'stecca di sigarette' && s.corto === 'sigarette' && s.g === 'f' && t.n === 'p' && t.art === 'le' && c.massa && c.commestibile, 'le voci: sigarette (stecca di sigarette, corto «sigarette»), le pinze, la carne (di massa, commestibile)');
  ok(Roba.di('pistola').arma && Roba.di('pistola').prop.includes('arma') && Roba.di('pane').rubabile && !Roba.di('sedia').rubabile, 'le proprietà: la pistola è un\'arma, il pane si ruba, la sedia no');
  ok(UnicoCatalogo.PROP.length === 24 && Roba.tutte().every(k => Roba.di(k).prop.every(p => UnicoCatalogo.PROP.includes(p))), 'le proprietà vengono da un vocabolario chiuso di 24 parole');
}

// ============================ 3. LINGUA: gli accordi ============================
const ST_FINTO = { npcs: [{ first: 'Sandra', pop: { sex: 'f' } }, { first: 'Bonaria', pop: { sex: 'f' } }, { first: 'Gino', pop: { sex: 'm' } }, { first: 'Dorino', pop: { sex: 'm' } }] };
const L = Lingua, CASI = [
  // articoli determinativi: maschile, femminile, plurale, elisione, s impura, z, gn, ps, pn, i semivocale
  ['art', ['chiave', 'det'], 'la chiave'], ['art', ['chiavi', 'det'], 'le chiavi'], ['art', ['coltello', 'det'], 'il coltello'],
  ['art', ['stivale', 'det'], 'lo stivale'], ['art', ['stivali', 'det'], 'gli stivali'], ['art', ['zaino', 'det'], 'lo zaino'],
  ['art', ['pneumatico', 'det'], 'lo pneumatico'], ['art', ['iodio', 'det'], 'lo iodio'], ['art', ['orologio', 'det'], "l'orologio"],
  ['art', ['ascia', 'det'], "l'ascia"], ['art', ['uova', 'det'], 'le uova'], ['art', ['lenzuola', 'det'], 'le lenzuola'],
  ['art', ['fucile', 'det'], 'il fucile'], ['art', ['pinze', 'det'], 'le pinze'], ['art', ['ferri da maglia', 'det'], 'i ferri da maglia'],
  ['art', ['altoparlante', 'det'], "l'altoparlante"], ['art', ['radio', 'det'], 'la radio'], ['art', ['radio', 'det', { pl: true }], 'le radio'],
  ['art', ['caffè', 'det'], 'il caffè'], ['art', ['gnocco', 'det'], 'lo gnocco'],
  // indeterminativi
  ['art', ['chiave', 'ind'], 'una chiave'], ['art', ['fucile', 'ind'], 'un fucile'], ['art', ['stivale', 'ind'], 'uno stivale'],
  ['art', ['ascia', 'ind'], "un'ascia"], ['art', ['orologio', 'ind'], 'un orologio'], ['art', ['zappa', 'ind'], 'una zappa'],
  ['art', ['moto', 'ind'], 'una moto'], ['art', ['sigarette', 'ind'], 'delle sigarette'], ['art', ['gioielli', 'ind'], 'dei gioielli'],
  ['art', ['attrezzi', 'ind'], 'degli attrezzi'], ['art', ['chiave', 'ind', { pl: true }], 'delle chiavi'],
  // partitivi e preposizioni articolate
  ['art', ['olio', 'di'], "dell'olio"], ['art', ['pane', 'di'], 'del pane'], ['art', ['zucchero', 'di'], 'dello zucchero'],
  ['art', ['carne', 'di'], 'della carne'], ['art', ['stivale', 'a'], 'allo stivale'], ['art', ['chiavi', 'a'], 'alle chiavi'],
  ['art', ['isola', 'a'], "all'isola"], ['art', ['zaino', 'in'], 'nello zaino'], ['art', ['tavolo', 'su'], 'sul tavolo'],
  ['art', ['scaffale', 'da'], 'dallo scaffale'], ['art', ['la sedia', 'det'], 'la sedia'], ['art', [Roba.di('sigarette'), 'det'], 'la stecca di sigarette'],
  // plurali e quantità
  ['plurale', ['bomboletta spray'], 'bombolette spray'], ['plurale', ['carne fresca'], 'carni fresche'], ['plurale', ['cassetta degli attrezzi'], 'cassette degli attrezzi'],
  ['plurale', ['chiave inglese'], 'chiavi inglesi'], ['plurale', ['torcia elettrica'], 'torce elettriche'], ['plurale', ['pacco di pasta'], 'pacchi di pasta'],
  ['plurale', ['elettrodomestico rotto'], 'elettrodomestici rotti'], ['plurale', ['pinze'], 'pinze'], ['plurale', ['radio'], 'radio'],
  ['quanti', ['bomboletta', 2], 'due bombolette'], ['quanti', ['pane', 1], 'del pane'], ['quanti', ['chiave', 1], 'una chiave'],
  ['quanti', ['stivale', 3], 'tre stivali'], ['quanti', ['sigarette', 1], 'delle sigarette'],
  // participi
  ['part', ['entrare', 'f'], 'entrata'], ['part', ['entrare', 'm'], 'entrato'], ['part', ['entrato', 'f'], 'entrata'], ['part', ['uscire', 'f', 'p'], 'uscite'],
  ['part', ['venire', 'm', 2], 'venuti'], ['part', ['prendere', 'f'], 'presa'], ['part', ['essere', 'f'], 'stata'], ['part', ['cadere', { sesso: 'f' }], 'caduta'],
  // genere
  ['genere', ['chiave'], o => o.f && !o.pl && o.noto], ['genere', ['fucile'], o => !o.f && !o.pl], ['genere', ['stivale'], o => !o.f && !o.pl],
  ['genere', ['chiavi'], o => o.f && o.pl], ['genere', ['sedie'], o => o.f && o.pl], ['genere', ['tavolino'], o => !o.f && !o.pl && !o.noto],
  // il correttore a valle
  ['concorda', ['ha vinto delle chiave alla lotteria'], 'ha vinto una chiave alla lotteria'], ['concorda', ['la lotteria delle chiave'], 'la lotteria della chiave'],
  ['concorda', ['ha comprato delle fucile da Gino'], 'ha comprato un fucile da Gino'], ['concorda', ['ha trovato delle stivale'], 'ha trovato uno stivale'],
  ['concorda', ['la corsa con le chiave'], 'la corsa con la chiave'], ['concorda', ['gli porta alle chiave'], 'gli porta alla chiave'],
  ['concorda', ['Sandra è entrato: parla con gli Orecchi', ST_FINTO], 'Sandra è entrata: parla con gli Orecchi'],
  ['concorda', ['Bonaria è stato visto al porto', ST_FINTO], 'Bonaria è stata vista al porto'], ['concorda', ['Gino è arrivata tardi', ST_FINTO], 'Gino è arrivato tardi'],
  ['concorda', ['Sandra è contenta', ST_FINTO], 'Sandra è contenta'], ['concorda', ['Dorino è entrato', ST_FINTO], 'Dorino è entrato'],
  ['concorda', ['Mi serve la arancia e il zaino.'], "Mi serve l'arancia e lo zaino."], ['concorda', ['Prendo un auto.'], "Prendo un'auto."],
  ['concorda', ['Hai sentito? qualcuno è entrato…', null, { frase: true }], 'Hai sentito? Qualcuno è entrato…'],
  ['concorda', ['ha vinto le chiavi e gli stivali'], 'ha vinto le chiavi e gli stivali'], ['concorda', ['la prendo e gli dico di no'], 'la prendo e gli dico di no'],
  ['concorda', ['le dà il pane'], 'le dà il pane'], ['concorda', ['In giro c\'è una tag nuova'], 'In giro c\'è una tag nuova'],
  ['concorda', ['Ah... va bene. e poi?'], 'Ah... va bene. E poi?'], ['concorda', ['ha scritto MIRK sul muro'], 'ha scritto MIRK sul muro'],
];
{
  let buoni = 0; const brutti = [];
  for (const [f, a, atteso] of CASI) {
    let r; try { r = L[f].apply(L, a); } catch (e) { r = 'ERRORE ' + e.message; }
    const giusto = typeof atteso === 'function' ? atteso(r) : r === atteso;
    if (giusto) buoni++; else brutti.push(`${f}(${a.map(x => (x && typeof x === 'object' ? (x.id || '{…}') : JSON.stringify(x))).join(', ')}) = ${JSON.stringify(r)}, atteso ${typeof atteso === 'function' ? 'la condizione' : JSON.stringify(atteso)}`);
  }
  ok(CASI.length >= 40 && buoni === CASI.length, `Lingua: ${buoni}/${CASI.length} casi d'accordo giusti${brutti.length ? '\n       ' + brutti.join('\n       ') : ''}`);
}

// ============================ 4. I genere() AVVOLTI: gli errori noti non ci sono più ============================
{
  const V = Lingua.vecchi;
  ok(!!V.iniArt && V.iniArt('chiave') === 'delle chiave' && V.iniArt('fucile') === 'delle fucile' && V.iniArt('stivale') === 'delle stivale', `l'errore di iniziative.js:107, con il vecchio: «${V.iniArt('chiave')}», «${V.iniArt('fucile')}», «${V.iniArt('stivale')}» (DEBOLEZZE §12)`);
  ok(Iniziative._.art('chiave') === 'una chiave' && Iniziative._.art('fucile') === 'un fucile' && Iniziative._.art('stivale') === 'uno stivale' && Iniziative._.art('stivale', 'di') === 'dello stivale' && Iniziative._.art('chiave', 'det') === 'la chiave',
    `avvolto: «${Iniziative._.art('chiave')}», «${Iniziative._.art('fucile')}», «${Iniziative._.art('stivale')}», «${Iniziative._.art('stivale', 'di')}»`);
  ok(!!V.parolaArt && V.parolaArt('fucile', 'indet') === 'delle fucile' && Parola.art('fucile', 'indet') === 'un fucile' && Parola.art('fucile', 'det') === 'il fucile' && Parola.art('chiave', 'part') === 'della chiave',
    `parola.js:78 col vecchio «${V.parolaArt('fucile', 'indet')}», avvolto «${Parola.art('fucile', 'indet')}»`);
  ok(Parola.quantiDi('chiave', 2) === 'due chiavi' && Parola.quantiDi('stivale', 1) === 'uno stivale' && Parola.quantiDi('pane', 1, true) === 'del pane', 'Parola.quantiDi avvolto: «due chiavi», «uno stivale», «del pane»');
  const g1 = Parola.genere('chiave'), g2 = Iniziative._.genere('stivale');
  ok(g1.f && !g1.pl && !g2.f && !g2.pl && Parola.genere === Lingua.genere, 'Parola.genere e Iniziative._.genere sono Lingua.genere (stesso contratto: f, pl, h)');
  // a valle: le fonti nella chiusura dei moduli vecchi
  const donna = st.npcs.find(k => k.pop && k.pop.sex === 'f' && !k.dead && k.first && st.npcs.filter(j => j.first === k.first).every(j => j.pop && j.pop.sex === 'f'));
  const b = { text: `hai sentito? ${donna.first} è entrato: parla con gli Orecchi`, until: st.clock + 3 };
  donna.bark = b;
  ok(b.text === `Hai sentito? ${donna.first} è entrata: parla con gli Orecchi`, `il fumetto (davanti al filtro di commedia): «${b.text}»`);
  G.feed(st, `${donna.first} è stato visto con delle chiave`, 'info');
  ok(st.feed[0].text === `${donna.first} è stata vista con una chiave`, `il giornale (Game.feed): «${st.feed[0].text}»`);
  Popolo.note(st, n, 'ha trovato delle stivale alla caccia al tesoro', 'good');
  ok(n.pop.diary[n.pop.diary.length - 1].text === 'ha trovato uno stivale alla caccia al tesoro', `la nota (Popolo.note): «${n.pop.diary[n.pop.diary.length - 1].text}»`);
  const dv = { d: `${donna.first} è entrato in casa con delle fucile` }; Vita.fatto('prova', donna.id, dv);
  ok(dv.d === `${donna.first} è entrata in casa con un fucile`, `il fatto di vita (Vita.fatto): «${dv.d}»`);
  for (let i = 0; i < 5; i++) G.step(st, 1 / 20, { x: 0, y: 0 });
  Iniziative.fatto(st, 'prova', donna, { d: `${donna.first} vince delle chiave alla lotteria` });
  for (let i = 0; i < 45; i++) G.step(st, 1 / 20, { x: 0, y: 0 });
  const fi = st.ini.fatti[st.ini.fatti.length - 1];
  ok(fi.tipo === 'prova' && fi.d === `${donna.first} vince una chiave alla lotteria`, `il fatto di iniziative (st.ini.fatti, nella fase unico.lingua): «${fi.d}»`);
}

// ============================ 5. un giro acceso: nessun errore, nessuna correzione sbagliata ============================
{
  const ORE = +ARG('ore', 2), visti = []; Lingua.CFG.spia = (a, b2, f) => { if (visti.length < 400) visti.push([f, a, b2]); };
  const p = st.player, GIRO = ['piazza', 'calata', 'molo', 'bar', 'chiesa', 'mercato', 'fontana', 'osteria'].map(k => G.PLACES[k]).filter(Boolean);
  let tap = 0, last = st.clock; const t0 = st.t, c0 = Lingua.stats.testi;
  while (st.t < t0 + ORE * 60) { if (st.clock - last > 120) { last = st.clock; const z = GIRO[++tap % GIRO.length]; p.x = z.x; p.y = z.y + 2; } G.step(st, 1 / 20, { x: 0, y: 0 }); }
  Lingua.CFG.spia = null;
  ok(U.errTot === 0, `${ORE} ore di gioco acceso: Σ Unico.err = ${U.errTot} ${JSON.stringify(U.err)}`);
  ok(U.ordine('step').join() === 'commedia,parola,vita,iniziative,casa' && U._.FASI.some(f => f.nome === 'unico.lingua'), 'le fasi: l\'ordine di oggi, più unico.lingua dopo la catena');
  // le correzioni del giro: devono essere tutte giuste (una maiuscola, un articolo davanti a una -e singolare, un participio)
  const sbagliate = visti.filter(([f, a, b2]) => a.replace(/^\p{Ll}/u, c => c.toUpperCase()).replace(/([?!.]\s+)(\p{Ll})/gu, (m, x, y) => x + y.toUpperCase()) !== b2 && !/delle|degli|dei|è /.test(a));
  console.log(`info ${Lingua.stats.testi - c0} testi visti nel giro, ${visti.length} corretti` + (visti.length ? ':\n       ' + Array.from(new Set(visti.map(v => v[0] + ': «' + v[1] + '» → «' + v[2] + '»'))).slice(0, 8).join('\n       ') : ''));
  ok(sbagliate.length === 0, `nessuna correzione fuori dalle regole (${sbagliate.length})`);
}

console.log(`\n${nOk} ok, ${fail} NO`);
process.exit(fail ? 1 : 0);
