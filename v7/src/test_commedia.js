// [commedia] prova della fase 1 della regia della commedia (commedia.js, dietro ?commedia)
// Uso (dalla cartella src): node test_commedia.js [seme]          la prova, a interruttore acceso, con il confronto a interruttore spento
//                           node test_commedia.js [seme] --misura --spento   solo la misura in piazza, interruttore spento (JSON)
require('./seme.js')(process.argv[2]);
const SPENTO = process.argv.includes('--spento'), SOLO_MISURA = process.argv.includes('--misura');
if (!SPENTO) global.location = { search: '?commedia' };
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js');
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti'];
for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require('./' + f + '.js'); } catch (e) { if (!SOLO_MISURA) console.log('(manca ' + f + ': ' + e.message.slice(0, 90) + ')'); } }
const H0 = { step: Game.HOOKS.step, create: Game.HOOKS.create, talk: Game.talk };
global.Commedia = require('./commedia.js');
const G = Game, C = Commedia, _ = C._;
let fail = 0; const ok = (c, m) => { if (!SOLO_MISURA) console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

// ---------- la misura: Piazza San Rocco, ~6 minuti di gioco, il giocatore gira in un raggio di 30 m ----------
// opt.giro: [ora d'inizio, posti]: il giocatore passa da un posto all'altro ogni 40 s (la sera, il porto, i bar, la chiesa)
// fuori: ogni fumetto nuovo, in tutta la città, misurato col metro del contesto (§9): la condizione della sua frase è vera?
function misura(secs, opt) {
  opt = opt || {};
  const st = G.create(+process.argv[2] || 1), p = st.player, DT = 1 / 20;
  const E = typeof Eventi !== 'undefined' ? Eventi.S(st) : null; if (E) E.next = st.clock + 25;
  st.deadline = 1e12;
  if (opt.giro) st.t = Math.floor(st.t / 1440) * 1440 + opt.giro[0] * 60;
  const GIRO = opt.giro ? opt.giro[1].map(k => G.PLACES[k]).filter(Boolean) : null;
  let Pz = GIRO ? GIRO[0] : G.PLACES.piazza; p.x = Pz.x; p.y = Pz.y + 2;
  const seen = new WeakSet(), L = [], fuori = { tutte: 0, viste: 0, ok: 0, per: {}, es: [] }; let wp = null, maxVivi = 0, tappa = 0;
  const X = C.contesto;
  const reg = () => {
    let vivi = 0;
    for (const n of st.npcs) {
      if (!n.bark || n.dead) continue; const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (n.bark.until > st.clock && d < 26 && !(n.inside && !p.indoor)) vivi++;
      if (seen.has(n.bark)) continue; seen.add(n.bark);
      { const tx = String(n.bark.text || ''), cl = (C.classeDi && C.classeDi(n.bark)) || X.classeSemplice(st, n, tx), r = X.viola(st, n, tx, cl), vis = d < 26 && !(n.inside && !p.indoor);
        if (r) { fuori.tutte++; if (vis) fuori.viste++; fuori.per[r.id] = (fuori.per[r.id] || 0) + 1; if (fuori.es.length < 12) fuori.es.push(`${n.first} (${cl}, ${r.c}): ${tx}`); } else fuori.ok++; }
      if (d >= 26 || (n.inside && !p.indoor)) continue;   // come main.js: chi è dentro non si vede
      const M = typeof Matti !== 'undefined' ? Matti.S(st) : { ids: {} };
      const src = n.__ev ? 'scena' : Object.values(M.ids).includes(n.id) ? 'matto' : 'altro';
      L.push({ c: st.clock, h: G.hour(st), id: n.id, who: n.first, role: n.role, text: n.bark.text, dur: n.bark.until - st.clock, d, src, cl: C.classeDi ? C.classeDi(n.bark) : '', ev: !!n.__ev, matto: !!(n.pop && n.pop.matto) });
    }
    maxVivi = Math.max(maxVivi, vivi);
  };
  for (let t = 0; t < secs / DT; t++) {
    if (GIRO && t % Math.round(40 / DT) === 0 && t) { Pz = GIRO[++tappa % GIRO.length]; p.x = Pz.x; p.y = Pz.y + 2; wp = null; }
    if (!wp || Math.hypot(wp.x - p.x, wp.y - p.y) < 1 || st.clock > wp.until) { const a = Math.random() * 6.283, r = Math.random() * 30; wp = { x: Pz.x + Math.cos(a) * r, y: Pz.y + Math.sin(a) * r, until: st.clock + 25 }; }
    const dx = wp.x - p.x, dy = wp.y - p.y, dd = Math.hypot(dx, dy) || 1;
    G.step(st, DT, { x: dx / dd, y: dy / dd }); reg();
  }
  const span = L.length ? L[L.length - 1].c - L[0].c : 1, cnt = {};
  L.forEach(l => cnt[l.text] = (cnt[l.text] || 0) + 1);
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const iv = L.map(l => [l.c, l.c + l.dur]), conc = iv.map(([s]) => iv.filter(([a, b]) => a <= s && s < b).length);
  const voci = L.filter(l => /^Hai sentito\? .+!$/.test(l.text) || /ha dipinto un muro/.test(l.text));
  return {
    righe: L.length, span: Math.round(span), alMinuto: +(L.length / span * 60).toFixed(1), fondoAlMinuto: +(L.filter(l => l.src === 'altro').length / span * 60).toFixed(1), ambienteAlMinuto: SPENTO ? null : +(L.filter(l => ['fondo', 'voce', 'fram'].includes(l.cl)).length / span * 60).toFixed(1),
    maxInsieme: Math.max(0, ...conc), maxVivi, top, corte: L.filter(l => l.text.length / 15 > l.dur + 1e-6).length, voci: voci.length,
    stampo: L.filter(l => /^Al lavoro \(|alle 0\./.test(l.text)).length,
    grammatica: L.filter(l => /Mi serve (sigarette|bottiglia|stecca)|Ti interessa (bottiglia|stecca|sigarette)|Ce l'hai (stecca|sigarette|bottiglia)/.test(l.text)).length,
    stessi: L.filter(l => { const m = l.text.match(/(\S+) ha (?:scippato|picchiato|investito|aiutato|sparato a|ammazzato) (\S+?)[!.]/); return m && m[1] === m[2]; }).length,
    scenaVoci: L.filter(l => l.ev && /^Hai sentito\? .+!$/.test(l.text)).length,
    fuori, L, st,
  };
}
const REG = (process.argv.find(a => a.startsWith('--registro=')) || '').slice(11);
const scrivi = (f, r) => { if (!f) return; const pad = (v, k) => String(v).padStart(k); require('fs').writeFileSync(f, r.L.map(l => `${pad(l.c.toFixed(1), 7)} | ${pad(l.h, 2)}h | ${pad(l.d.toFixed(1), 5)} | ${pad(l.dur.toFixed(1), 4)} | ${l.who} (${l.role}) | ${l.src}${l.cl ? '/' + l.cl : ''} | ${l.text}`).join('\n') + '\n'); };
// (G.create si fa una volta sola per processo: la sera al porto gira in un processo a parte, acceso e spento, mentre qui si prova)
const GIRO = [20, ['calata', 'molo', 'bar', 'sirena', 'osteria', 'chiesa', 'piazza', 'pontile', 'marina']];
if (SOLO_MISURA) { const giro = process.argv.includes('--giro'), r = giro ? misura(300, { giro: GIRO }) : misura(400); if (!giro) scrivi(REG, r); delete r.L; delete r.st; console.log(JSON.stringify(r)); process.exit(0); }
const figlio = args => new Promise(res => require('child_process').execFile(process.execPath, [__filename, String(+process.argv[2] || 1), '--misura', ...args], { cwd: __dirname, maxBuffer: 1 << 24 }, (e, out) => { try { res(JSON.parse(String(out).trim().split('\n').pop())); } catch (x) { console.log('(misura ' + args.join(' ') + ' non riuscita: ' + String(e && e.message || x.message).slice(0, 120) + ')'); res(null); } }));
const FIGLI = { off: figlio(['--spento']), offG: figlio(['--spento', '--giro']), onG: figlio(['--giro']) };

// ---------- 0. l'interruttore ----------
ok(C.ON === true, 'Commedia.ON con ?commedia');
ok(G.HOOKS.step !== H0.step && G.talk !== H0.talk, 'acceso: aggancia HOOKS.step e Game.talk');
{
  const cp = require('child_process');
  const out = cp.execFileSync(process.execPath, ['-e', `global.World=require('./world.js');global.Interior=require('./interiors.js');global.Game=require('./game.js');const s=Game.HOOKS.step,c=Game.HOOKS.create,t=Game.talk,y=Game.say;const C=require('./commedia.js');const st=Game.create(1);console.log(JSON.stringify({on:C.ON,same:Game.HOOKS.step===s&&Game.HOOKS.create===c&&Game.talk===t&&Game.say===y,acc:!!Object.getOwnPropertyDescriptor(st.npcs[0],'bark')&&!!Object.getOwnPropertyDescriptor(st.npcs[0],'bark').set}))`], { cwd: __dirname }).toString().trim().split('\n').pop();
  const o = JSON.parse(out); ok(o.on === false && o.same && !o.acc, `spento (senza ?commedia): niente agganci, nessun setter sui fumetti (${out})`);
}

// ---------- §1 il combattimento ----------
{
  const fake = (k) => k === 'cop' ? { cop: true } : { faction: k === 'comune' ? 'isola:tribu' : k };
  for (const k of Object.keys(_.COMBAT)) {
    const n = fake(k), got = new Set(); let serie = 0;
    for (let i = 0; i < 4000; i++) { const t = _.combatLine(n, k); got.add(t); if (_.COMBAT[k].indexOf(t) < 4) serie++; }
    ok(got.size === _.COMBAT[k].length, `${k}: escono tutte le ${_.COMBAT[k].length} frasi (prima solo 4); le serie ${(serie / 40).toFixed(0)}%`);
  }
  ok(_.chiaveCombat({ faction: 'isola:tribu' }, 'Carne fresca!') === 'comune' && _.chiaveCombat({ faction: 'isola:tribu' }, 'Uuh-ah! Uuh-ah!') === 'comune', 'la tribù («Carne fresca!», «Uuh-ah!») diventa la Comune');
  ok(_.chiaveCombat({}, 'Prendetelo!') === null && _.chiaveCombat({ cop: true }, 'Fermo o sparo!') === 'cop', '«Prendetelo!» resta a chi non è della tribù; i Grigi riconosciuti');
  ok(!Object.values(_.COMBAT).flat().some(t => /Uuh|Carne fresca|baguette/.test(t)), 'nessuno stereotipo nella banca');
}

// ---------- §6 gli oggetti ----------
{
  const A = s => _.articolo(s).frase;
  const casi = [['sigarette', 'delle sigarette'], ['bottiglia di vino', 'una bottiglia di vino'], ['stecca di sigarette', 'una stecca di sigarette'], ['olio d\'oliva', 'dell\'olio d\'oliva'], ['pane', 'del pane'],
    ['sacco di farina (5 kg)', 'un sacco di farina'], ['scatola di aspirine', 'una scatola di aspirine'], ['zaino militare', 'uno zaino militare'], ['accendino', 'un accendino'], ['audiocassetta', 'un\'audiocassetta'],
    ['legna per la stufa', 'della legna per la stufa'], ['bende', 'delle bende'], ['gioielli', 'dei gioielli'], ['una radio', 'una radio'], ['qualcosa per medicarsi', 'qualcosa per medicarsi'], ['pneumatico', 'uno pneumatico']];
  casi.forEach(([a, b]) => ok(A(a) === b, `«${a}» → «${A(a)}»`));
  const F = _.fixOggetti;
  [['Mi serve sigarette, sai chi ce l\'ha?', 'Mi servono delle sigarette, sai chi ce le ha?'], ['Ti interessa bottiglia di vino? Per te faccio uno sconto.', 'Ti interessa una bottiglia di vino? Per te faccio uno sconto.'],
   ['Ce l\'hai stecca di sigarette?', 'Ce l\'hai una stecca di sigarette?'], ['Ce l\'hai sigarette?', 'Hai delle sigarette?'], ['Ho bottiglia di vino, se ti serve te lo do a buon prezzo.', 'Ho una bottiglia di vino, se ti serve te la do a buon prezzo.'],
   ['Mi serve legna per la stufa, se senti qualcosa dimmelo.', 'Mi serve della legna per la stufa, se senti qualcosa dimmelo.'], ['Mi serve pane, sai chi ce l\'ha?', 'Mi serve del pane, sai chi ne ha?'],
   ['Che freddo, eh?', 'Che freddo, eh?']].forEach(([a, b]) => ok(F(a) === b, `«${a}» → «${F(a)}»`));
  ok(_.FAME.includes(F('Mi serve qualcosa da mangiare, sai chi ce l\'ha?')), '«Mi serve qualcosa da mangiare, sai chi ce l\'ha?» → una frase di fame, varia');
}

// ---------- §5 il lavoro, §7 la notte ----------
{
  const st = { t: 11 * 60, clock: 0 }, stN = { t: 23 * 60, clock: 0 };
  const n = { first: 'Daniela', role: 'Commessa (Alimentari Wu)', pop: { age: 40, sex: 'f' } }, suora = { first: 'Suor Agata', role: 'Suora di San Rocco', pop: { age: 50, sex: 'f' } };
  const out = new Set(); for (let i = 0; i < 60; i++) out.add(_.fixLavoro(st, n, 'Il padrone ci mette i piedi in testa.'));
  ok(out.size >= 8, `«Il padrone ci mette i piedi in testa.» → ${out.size} frasi diverse`);
  ok(!/\(/.test(_.fixLavoro(st, n, 'Al lavoro (Commessa al Mercato) oggi non finiva più.')), 'la parentesi del mestiere sparisce');
  ok(!/alle 0\./.test(_.fixLavoro(st, n, 'Domani attacco alle 0.')), '«Domani attacco alle 0.» non esce');
  ok(_.fixLavoro(st, suora, 'Domani attacco alle 6.') !== 'Domani attacco alle 6.' && !/attacco/.test(_.fixLavoro(st, suora, 'Domani attacco alle 6.')), 'la suora non «attacca»: dice una cosa da suora');
  ok(_.fixNotte(stN, n, 'Stamattina alla punta abboccavano.') !== 'Stamattina alla punta abboccavano.', 'alle 23 niente «Stamattina…»');
  ok(_.fixNotte(stN, n, 'Domani attacco alle 7.') !== 'Domani attacco alle 7.', 'alle 23 niente «Domani attacco alle 7»');
  ok(_.fixNotte(st, n, 'Stamattina alla punta abboccavano.') === 'Stamattina alla punta abboccavano.', 'alle 11 sì');
}

// ---------- §3 le voci ----------
{
  const st = { links: [{ a: 'x', b: 'y', actor: 'a1', type: 'aggressione' }] };
  const sp = { id: 'x', mem: [{ actor: 'a1', target: 'a2', type: 'aggressione', t: 1 }] };
  ok(_.chiStessi(st, sp, 'Tore ha picchiato Tore') === 'Tore ha picchiato un altro Tore', '«Tore ha picchiato Tore» (due Tore) → «…un altro Tore»');
  const sp2 = { id: 'x', mem: [{ actor: 'a1', target: 'a1', type: 'aggressione', t: 1 }] };
  ok(_.chiStessi(st, sp2, 'Tore ha picchiato Tore') === null, 'se è davvero lo stesso, la voce tace');
  const vs = new Set(); for (let i = 0; i < 80; i++) vs.add(_.fixVoce({ links: [] }, { id: 'z' }, 'Hai sentito? Ada ha dipinto un muro!').text);
  ok(vs.size >= 7, `«Hai sentito? Ada ha dipinto un muro!» → ${vs.size} forme`);
}

// ---------- §8 la durata ----------
ok(_.durata('Sì.') === 2.2 && Math.abs(_.durata('x'.repeat(60)) - 5.2) < 1e-9 && _.durata('x'.repeat(200)) === 7, 'durata: 2,2 s min, 1,2 + car/15, 7 s max');

// ---------- §8 il fumetto «D — striscia»: il testo nella striscia, al telefono 2 fumetti pieni, fuori dal HUD ----------
{
  // un DOM minimo: quanto basta ad avvolgi (childNodes vivi, appendChild che sposta, classList)
  const mk = (tag, cls) => { const e = { nodeType: 1, tag, parent: null, childNodes: [], className: cls || '', classList: { contains: c => e.className.split(/\s+/).includes(c) },
    appendChild(c) { if (c.parent) c.parent.childNodes.splice(c.parent.childNodes.indexOf(c), 1); c.parent = e; e.childNodes.push(c); return c; },
    get textContent() { return e.childNodes.map(c => c.textContent).join(''); } }; return e; };
  const tx = s => ({ nodeType: 3, parent: null, textContent: s });
  const doc = { createElement: t => mk(t) };
  let muta = 0; const conta = el => { const a = el.appendChild; el.appendChild = c => { muta++; return a(c); }; return el; };
  const bub = (who, ...rest) => { const el = mk('div', 'bub'); const w = mk('span', 'who'); w.appendChild(tx(who)); el.appendChild(w); rest.forEach(r => el.appendChild(r)); return conta(el); };
  const b1 = bub('Tore', tx('Io ero uno importante! Avevo un motorino!'));
  ok(_.avvolgi(b1, doc) === true && b1.childNodes.length === 2 && b1.childNodes[1].className === 't' && b1.childNodes[1].textContent === 'Io ero uno importante! Avevo un motorino!' && b1.childNodes[0].className === 'who', 'striscia: il testo dopo il nome va in <span class="t">');
  muta = 0; ok(_.avvolgi(b1, doc) === false && muta === 0 && b1.childNodes.length === 2, 'striscia: la seconda volta non tocca niente (nessuna mutazione, niente giri del sorvegliante)');
  const em = mk('em'); em.appendChild(tx('due')); const b2 = bub('Ada', tx('uno '), em, tx(' tre'));
  ok(_.avvolgi(b2, doc) && b2.childNodes.length === 2 && b2.childNodes[1].textContent === 'uno due tre', 'striscia: più nodi dopo il nome finiscono tutti nella stessa striscia');
  const b3 = bub('Ugo'); ok(_.avvolgi(b3, doc) === false && b3.childNodes.length === 1, 'striscia: un fumetto con il solo nome resta com\'è');
  // main.js riscrive l'innerHTML quando cambia la battuta: il nodo riusato torna «nudo» e si riavvolge
  b1.childNodes.splice(1); b1.appendChild(tx('Nuova battuta.')); ok(_.avvolgi(b1, doc) && b1.childNodes[1].className === 't' && b1.childNodes[1].textContent === 'Nuova battuta.', 'striscia: il nodo riusato da main.js con un testo nuovo si riavvolge');
  // al telefono: 2 pieni, prima la priorità poi la distanza
  const V = [{ k: 'a', pr: 1, d: 5 }, { k: 'b', pr: 3, d: 20 }, { k: 'c', pr: 1, d: 3 }, { k: 'd', pr: 1 }, { k: 'e', pr: 4, d: 25 }];
  const S = _.scegliTelefono(V); const kk = [...S].map(v => v.k).sort().join('');
  ok(_.TEL_MAX === 2 && S.size === 2 && kk === 'be', `telefono: 2 fumetti pieni, i più importanti (${kk})`);
  const S2 = _.scegliTelefono([{ k: 'a', pr: 1, d: 9 }, { k: 'b', pr: 1, d: 2 }, { k: 'c', pr: 1, d: 4 }, { k: 'x', pr: 1 }]); ok([...S2].map(v => v.k).sort().join('') === 'bc', 'telefono: a parità di importanza i più vicini; chi non si sa dov\'è va in fondo');
  ok(_.scegliTelefono([{ k: 'a' }]).size === 1, 'telefono: con uno solo resta quello');
  // fuori dall'obiettivo e dalla minimappa
  const W = 412, H = 840, obj = { l: 12, t: 120, r: 300, b: 180 }, mini = { l: 316, t: 80, r: 412, b: 176 };
  const tocca = (b, r) => b.X - b.w / 2 < r.r && b.X + b.w / 2 > r.l && b.Y - b.h < r.b && b.Y > r.t;
  const casi = [{ X: 150, Y: 170, w: 160, h: 40 }, { X: 360, Y: 150, w: 90, h: 34 }, { X: 300, Y: 200, w: 180, h: 60 }, { X: 100, Y: 400, w: 150, h: 40 }];
  const fuori = casi.map(c => _.evita({ ...c }, [obj, mini], W, H, 6, 44));
  ok(fuori.every(b => !tocca(b, obj) && !tocca(b, mini) && b.X - b.w / 2 >= 6 && b.X + b.w / 2 <= W - 6 && b.Y - b.h >= 44), 'HUD: nessun fumetto sopra l\'obiettivo né sopra la minimappa, e tutti nello schermo');
  ok(fuori[3].X === 100 && fuori[3].Y === 400, 'HUD: chi non tocca niente non si muove');
  ok(/\.bub \.t\{background:rgba\(22,18,27,\.86\)/.test(_.CSS_D) && !/#FFE03A|#FF2E5E|#F04A23/i.test(_.CSS_D), 'stile D: la striscia d\'inchiostro; niente limone, allarme, vermiglio');
}

// ---------- la piazza: prima e dopo ----------
const ON = misura(400); scrivi(REG && REG.replace(/(\.\w+)?$/, '_acceso$1'), ON);
// ---------- §9 il contesto: la frase vera di quello che c'è intorno ----------
{
  const X0 = C.contesto, st = ON.st, p = st.player;
  const X = { ...X0, viola: (...a) => (X0.svuota(), X0.viola(...a)), vale: (...a) => (X0.svuota(), X0.vale(...a)), gate: (...a) => (X0.svuota(), X0.gate(...a)), COND: new Proxy(X0.COND, { get: (o, k) => (...a) => (X0.svuota(), o[k](...a)) }) };
  const n = st.npcs.find(k => k.id === 'marta') || st.npcs.find(k => k.pop && !k.cop && !k.faction);
  const lontano = () => { for (const v of st.vehicles) { v.x += 5000; v.y += 5000; } };
  const vicino = (dx, mv) => { const v = st.vehicles.find(v => !G.VK[v.kind].boat && !G.VK[v.kind].pocket); v.x = n.x + dx; v.y = n.y; v.hidden = false; v.vx = mv || 0; v.vy = 0; v.speed = mv || 0; return v; };
  const at = (k, dx) => { const q = G.PLACES[k]; n.x = q.x + (dx || 0); n.y = q.y + 2; n.inside = false; };
  const soli = () => { for (const k of st.npcs) if (k !== n) { k.x += 3000; } p.x = n.x + 200; p.y = n.y + 200; };
  const back = () => { for (const k of st.npcs) if (k !== n && k.x > 2500) k.x -= 3000; };
  const T = (text, cl) => X.gate(st, n, text, cl);
  st.t = Math.floor(st.t / 1440) * 1440 + 11 * 60; at('piazza'); p.x = n.x + 200; p.y = n.y; lontano(); st.events.length = 0; n.driverOf = null; n.lastHitByCar = -99;
  // i mezzi
  ok(!!X.viola(st, n, 'Chi ti ha dato la patente?!', 'caldo') && !/patente/.test(T('Chi ti ha dato la patente?!', 'caldo') || '') && !/patente/.test(T('Ma chi ti ha dato la patente, tua madre?!', 'fondo') || ''), `nessun mezzo vicino: niente «patente» («${T('Chi ti ha dato la patente?!', 'caldo')}»)`);
  ok(!X.vale(st, n, 'Guarda cosa hai fatto alla mia macchina!', 'caldo') && T('Guarda cosa hai fatto alla mia macchina!', 'caldo') === 'Guarda cosa hai fatto!', 'nessuna macchina: «Guarda cosa hai fatto alla mia macchina!» → «Guarda cosa hai fatto!»');
  n.lastHitByCar = st.clock; ok(X.vale(st, n, 'Chi ti ha dato la patente?!', 'caldo'), 'una macchina l\'ha appena preso: «patente» sì'); n.lastHitByCar = -99;
  n.driverOf = 'x'; ok(X.vale(st, n, 'Chi ti ha dato la patente?!', 'caldo') && X.vale(st, n, 'Guarda cosa hai fatto alla mia macchina!', 'caldo'), 'chi scende dalla macchina sfasciata (azioni.js crashes): «patente» e «la mia macchina» sì'); n.driverOf = null;
  { const ev = { type: 'investimento', x: n.x + 3, y: n.y, t: st.t }; st.events.unshift(ev); ok(X.vale(st, n, 'Chi ti ha dato la patente?!', 'caldo'), 'un investimento qui un attimo fa: «patente» sì'); st.events.length = 0; }
  { const v = vicino(8, 7); ok(X.vale(st, n, 'Chi ti ha dato la patente?!', 'caldo') && X.vale(st, n, 'Guarda dove vai!', 'caldo'), 'un\'auto che passa a 8 m: «patente», «Guarda dove vai!» sì'); v.vx = v.speed = 0; ok(!X.vale(st, n, 'Chi ti ha dato la patente?!', 'caldo') && X.vale(st, n, 'Copri tu, Ferri! Io copro la macchina! Da dietro! Seduto!', 'caldo'), 'un\'auto ferma a 8 m: «patente» no, «copro la macchina» sì'); lontano(); }
  ok(T('Guarda dove vai!', 'caldo') === 'Mannaggia!' && T('Ferma! Devo salire!', 'scena') === 'Aspetta! Aspettaaa!', 'niente che passa: «Guarda dove vai!» → «Mannaggia!»; l\'autobus perso senza autobus → «Aspetta! Aspettaaa!»');
  ok(T('Mi hai rigato la portiera!', 'scena') === 'Ieri mi hai rigato la portiera! Ti ho visto!', 'la lite del parcheggio senza macchine (scena soft): la portiera è di ieri');
  // il combattimento: il ripescaggio rispetta il contesto
  { X0.svuota(); const fk = { faction: 'marsiglia', x: n.x, y: n.y, hp: 50, maxHp: 50, hitT: -99, panic: 0 }, ck = { cop: true, x: n.x, y: n.y, hp: 50, maxHp: 50, hitT: -99, panic: 0 }; st.lastShotAt = -99;
    const got = new Set(); for (let i = 0; i < 1500; i++) { got.add(_.combatLine(fk, 'marsiglia', st)); got.add(_.combatLine(ck, 'cop', st)); }
    ok(![...got].some(t => /voiture|copro la macchina|il m'a touché|Mi ha sparato! A me|Mi hai bucato|colpi d'arma/.test(t)), 'combattimento senza macchine né colpi: niente «ma voiture», «copro la macchina», «M\'hai preso», «Mi hai bucato»');
    vicino(5); st.lastShotAt = st.clock; X0.svuota(); fk.hp = 20; ck.hp = 20; const g2 = new Set(); for (let i = 0; i < 1500; i++) { st.clock += 1e-4; g2.add(_.combatLine(fk, 'marsiglia', st)); g2.add(_.combatLine(ck, 'cop', st)); }
    ok([...g2].some(t => /voiture/.test(t)) && [...g2].some(t => /copro la macchina/.test(t)) && [...g2].some(t => /Mi ha sparato! A me/.test(t)), 'con la macchina a 5 m e gli spari: escono anche quelle'); lontano(); st.lastShotAt = -99; }
  // il tempo, l'ora
  ok(!X.vale(st, n, 'Piove a dirotto!', 'fondo') && !/piov/i.test(T('Piove a dirotto!', 'fondo') || '') && X.vale(st, n, 'Ma quale ombrello? Non piove.', 'te'), 'non piove (non c\'è il meteo): niente «Piove a dirotto!»; «Non piove.» sì');
  st.meteo = { pioggia: true }; ok(X.vale(st, n, 'Piove a dirotto!', 'te'), 'con st.meteo.pioggia la pioggia si può dire'); delete st.meteo;
  ok(!X.vale(st, n, 'Che caldo, oggi!', 'te') && T('Che caldo, oggi!', 'te') === 'Che freddo, eh?', 'd\'inverno, fuori: «Che caldo» → «Che freddo, eh?»');
  ok(T('Buongiorno.', 'te') === 'Buongiorno.' && T('Buonasera, signora Rosa.', 'scena') === 'Buongiorno, signora Rosa.', 'alle 11: il buongiorno resta, la buonasera diventa buongiorno');
  st.t += 12 * 60; ok(T('Buongiorno! Già aperto?', 'scena') === 'Buonanotte! Già aperto?' && T('Buongiorno! Bella giornata, eh?', 'scena') === 'Buonanotte! Che freddo, eh?' && T('Oggi si vende, c\'è il sole.', 'scena') === 'Oggi si vende, me lo sento.', `alle 23: niente buongiorno, niente sole («${T('Buongiorno! Bella giornata, eh?', 'scena')}»)`);
  st.t -= 12 * 60;
  // i posti
  ok(!X.vale(st, n, 'Spostati, che esco in mare! Alle tre! Ogni notte! Che vita di merda!', 'fondo') || X.COND.mare(st, n), 'in piazza, lontano dall\'acqua: niente «Spostati, che esco in mare!»');
  at('molo'); ok(X.vale(st, n, 'Spostati, che esco in mare! Alle tre! Ogni notte! Che vita di merda!', 'fondo') || !X.COND.mare(st, n), 'sul molo sì');
  { const inl = Object.keys(G.PLACES).find(k => { at(k); return !X.COND.vedeMare(st, n); }); ok(!!inl && T('Il mare oggi è color ferro.', 'te') !== 'Il mare oggi è color ferro.', `dove il mare non si vede (${inl}): niente «Il mare oggi è color ferro.»`); }
  at('bar', 3); ok(X.vale(st, n, 'Ancora un bicchiere e vado. L\'ho detto anche tre bicchieri fa.', 'fondo'), 'davanti al Bar Da Gino: «Ancora un bicchiere» sì');
  at('molo'); ok(!X.vale(st, n, 'Ancora un bicchiere e vado. L\'ho detto anche tre bicchieri fa.', 'fondo'), 'sul molo, nessun bar: no');
  at('chiesa'); ok(X.vale(st, n, 'Offerte! Lasciatele lì, col cestino non giro. Ho il mal di schiena.', 'fondo'), 'le offerte: davanti alla chiesa sì'); at('molo'); ok(!X.vale(st, n, 'Offerte! Lasciatele lì, col cestino non giro. Ho il mal di schiena.', 'fondo'), '…sul molo no');
  // i Grigi, gli spari
  at('piazza'); { const cops = st.npcs.filter(k => k.cop), sv = cops.map(k => [k.x, k.y]); cops.forEach(k => { k.x += 4000; }); ok(T('Ecco i Grigi, in piazza. Di nuovo.', 'scena') === 'Pina! Pina! Il sugo!' && !X.vale(st, n, 'Giù! Spari!', 'caldo'), 'nessun Grigio vicino, nessuno sparo: niente «Ecco i Grigi», niente «Giù! Spari!»');
    cops[0].x = n.x + 10; cops[0].y = n.y; cops[0].inside = false; cops[0].dead = false; cops[0].jailedUntil = 0; st.lastShotAt = st.clock; ok(X.vale(st, n, 'Ecco i Grigi, in piazza. Di nuovo.', 'scena') && X.vale(st, n, 'Giù! Spari!', 'caldo'), 'un Grigio a 10 m e uno sparo adesso: sì'); cops.forEach((k, i) => { k.x = sv[i][0]; k.y = sv[i][1]; }); st.lastShotAt = -99; }
  // a chi lo dici
  soli(); { const r = T('Hai visto la partita?', 'fondo'); ok(!X.vale(st, n, 'Hai visto la partita?', 'fondo') && r !== 'Hai visto la partita?' && (r === null || _.CX.SOLO.includes(r) || _.CX.SOLO_G.includes(r)), `nessuno a 4,5 m: la domanda di fondo diventa una frase da sola («${r}»)`);
    ok(X.vale(st, n, 'Il padrone ci mette i piedi in testa.', 'fondo') && X.vale(st, n, 'Hai visto la partita?', 'te'), 'da soli si brontola; a Nino (te) la domanda resta');
    ok(T('Nino! Che ci fai qui di notte? Lavori? No? Allora porta i soldi!', 'fondo') !== 'Nino! Che ci fai qui di notte? Lavori? No? Allora porta i soldi!', 'la voce di notte «Nino! …» senza Nino lì: cambia'); }
  { const k = st.npcs.find(k => k !== n && k.pop && !k.dead); k.x = n.x + 2; k.y = n.y; k.inside = false; k.jailedUntil = 0; ok(X.vale(st, n, 'Hai visto la partita?', 'fondo'), 'con uno a 2 m: la domanda resta'); }
  back();
  // le scene: si toccano solo quando la condizione è chiaramente falsa
  at('piazza'); st.t = Math.floor(st.t / 1440) * 1440 + 12 * 60; ok(T('Torre due, il riflettore! Non su di me! Su di lui!', 'scena') === 'Torre due, il riflettore! Non su di me! Su di lui!', 'una scena senza sostituzione scritta resta com\'è');
  ok(X.vale(st, n, 'Ho preso la patente!', 'fram') && X.vale(st, n, 'Lei! Mi regga l\'ombrello.', 'matto'), 'i frammenti e i matti raccontano: niente condizioni («Ho preso la patente!»)');
  // dal setter: Marta in piazza, nessun mezzo, «Chi ti ha dato la patente?!»
  { const st2 = st; X0.svuota(); for (const v of st2.vehicles) v.x += 5000; st2.clock += .01; const m = st2.npcs.find(k => k.id === 'marta'); const P = st2.player; P.x = m.x + 3; P.y = m.y; m.inside = false;
    G.say(st2, m, 'Ma chi ti ha dato la patente, tua madre?!', 3); ok(!m.bark || !/patente/.test(m.bark.text), `dal setter: Marta senza auto intorno non dice «patente» (${m.bark ? '«' + m.bark.text + '»' : 'tace'})`); }
  // quante frasi delle banche sono legate al contesto
  { const fs = require('fs'), re = /(['`])((?:\\.|(?!\1).){4,220}?)\1/g, righe = new Set();
    for (const f of ['game.js', 'popolo.js', 'azioni.js', 'matti.js', 'convivenza.js', 'scambi.js', 'eventi.js', 'commedia.js']) { const src = fs.readFileSync(__dirname + '/' + f, 'utf8'); let m; while ((m = re.exec(src))) { const t = m[2].replace(/\\'/g, '\''); if (/[a-zà-ù] [a-zà-ù]/i.test(t) && /[.!?…]$/.test(t) && !/[{}<>=;]/.test(t)) righe.add(t); } }
    const per = {}; let tot = 0, tu = 0; for (const t of righe) { const R = X.regole(t, 'fondo').concat(X.regole(t, 'caldo')).filter((r, i, a) => a.indexOf(r) === i); if (!R.length) continue; if (R.every(r => r.c === 'ascolta')) { tu++; continue; } tot++; R.forEach(r => { if (r.c !== 'ascolta') per[r.c] = (per[r.c] || 0) + 1; }); }
    console.log(`     frasi delle banche legate a un contesto (mezzi, mare, tempo, ora, posti, Grigi, fatti, Nino): ${tot} — ${JSON.stringify(per)}; col «tu» o una domanda (valgono solo come chiacchiera di fondo): ${tu}`);
    const LIS = process.argv.find(a => a.startsWith('--elenco=')); if (LIS) fs.writeFileSync(LIS.slice(9), [...righe].map(t => [t, X.regole(t, 'fondo').concat(X.regole(t, 'caldo')).filter(r => r.c !== 'ascolta').map(r => r.id + ':' + r.c).filter((r, i, a) => a.indexOf(r) === i).join(',')]).filter(x => x[1]).map(x => x[1] + '\t' + x[0]).sort().join('\n') + '\n'); }
}

(async () => {
const OFF = await FIGLI.off; if (OFF) OFF.giro = (await FIGLI.offG || {}).fuori || { tutte: NaN, viste: NaN, ok: 0, per: {}, es: [] };
const riga = (k, r) => `${k}: ${r.alMinuto} frasi/min entro 26 m (fondo ${r.fondoAlMinuto}), max ${r.maxInsieme} fumetti insieme (vivi ${r.maxVivi}), più ripetuta «${(r.top[0] || [''])[0]}» ×${(r.top[0] || [0, 0])[1]}, corte ${r.corte}/${r.righe}, voci ${r.voci}, stampo ${r.stampo}, grammatica ${r.grammatica}, «X … X» ${r.stessi}, voci in scena ${r.scenaVoci}`;
if (OFF) console.log('     ' + riga('SPENTO', OFF));
console.log('     ' + riga('ACCESO', ON));
ok(ON.ambienteAlMinuto <= 10, `chiacchiere di fondo (né scena, né a te, né azione) al massimo una ogni 6 s: ${ON.ambienteAlMinuto}/min (tutto il «non scena, non matto»: ${ON.fondoAlMinuto}/min)`);
ok(ON.maxVivi <= 3, `al massimo 3 fumetti vivi insieme: ${ON.maxVivi}`);
ok(ON.corte === 0, 'nessuna frase dura meno del tempo per leggerla (15 car/s)');
ok(ON.stampo === 0 && ON.grammatica === 0 && ON.stessi === 0 && ON.scenaVoci === 0, 'niente stampo del lavoro, niente «Mi serve sigarette», niente «Tore ha picchiato Tore», nessuna voce da chi recita');
ok(!ON.L.some(l => l.matto && !l.ev && /^(Al lavoro|Domani attacco|Mi serve|Hai sentito\? .+!$)/.test(l.text)), 'i matti non dicono le chiacchiere di tutti');
{ const vk = {}; let rip = 0; ON.L.forEach(l => { const m = l.text.match(/([A-ZÀ-Ü]\S* ha dipinto un muro|[A-ZÀ-Ü]\S* ha \S+ \S+)/); if (!m || !/sentito|Giuro|Indovina|Lo sai|dormivo|Oh!/.test(l.text)) return; const k = m[1]; if (vk[k] !== undefined && l.c - vk[k] < 115) rip++; vk[k] = l.c; }); ok(rip === 0, `la stessa voce non torna prima di 2 minuti (${rip})`); }
if (OFF) ok(ON.alMinuto < OFF.alMinuto, `meno rumore: ${OFF.alMinuto} → ${ON.alMinuto} frasi/min`);
{ const GON = ((await FIGLI.onG) || {}).fuori || { tutte: NaN, viste: NaN, ok: 0, per: {}, es: [] }, f = r => `${r.tutte} su ${r.tutte + r.ok} (entro 26 m: ${r.viste}) ${JSON.stringify(r.per)}`;
  if (OFF) { console.log('     fuori contesto SPENTO, piazza: ' + f(OFF.fuori)); console.log('     fuori contesto SPENTO, giro di sera (porto, bar, chiesa): ' + f(OFF.giro)); OFF.fuori.es.concat(OFF.giro.es).slice(0, 8).forEach(e => console.log('        · ' + e)); }
  console.log('     fuori contesto ACCESO, piazza: ' + f(ON.fuori)); console.log('     fuori contesto ACCESO, giro di sera: ' + f(GON));
  ON.fuori.es.concat(GON.es).slice(0, 8).forEach(e => console.log('        ! ' + e));
  ok(ON.fuori.tutte === 0 && GON.tutte === 0, `acceso: nessuna frase fuori contesto in tutta la città (piazza ${ON.fuori.tutte}, giro ${GON.tutte}; spento ${OFF ? OFF.fuori.tutte + ' e ' + OFF.giro.tutte : '?'})`); }
console.log('     stats', JSON.stringify(C.stats));
console.log(fail ? `\n${fail} NON VANNO` : '\ntutto ok');
process.exit(fail ? 1 : 0);
})();
