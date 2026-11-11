#!/usr/bin/env node
/* Porto Vecchio — giornata.js: tre giorni di paese, senza IA, senza dipendenze.
   Uso: node giornata.js [seme]     (stampa la Gazzetta di Porto Vecchio dei tre giorni, le catene e le misure)
   Le regole stanno in BIBBIA_MONDO.md. Qui:
   - il registro dei fatti è quello di Vita.fatto (tipo, chi, dati, causa), con l'hop e il peso;
   - le ISTITUZIONI (meteo, pesca, mercato, Comune, messa, Garante, campanile, Lotto, posta) fanno i fatti senza causa: le radici;
   - gli OPERATORI (faida, voce, binomio, lazzo, rovescio, forestiero, ...) partono SOLO da un aggancio, cioè da un fatto: la causa;
   - le REGOLE SURREALI (il mare restituisce, il campanile conta le liti, la statua guarda, l'Ufficio Sogni, la nebbia che ripete)
     sono istituzioni come le altre: nessuno le spiega, solo il forestiero se ne stupisce. */
'use strict';

// ================= IL CASO, COL SEME =================
const SEME = parseInt(process.argv[2] || '1', 10) || 1;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = mulberry32(SEME * 7919 + 13);
const pick = a => a[Math.floor(R() * a.length)];
const chance = p => R() < p;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const between = (a, b) => a + Math.floor(R() * (b - a + 1));
const lire = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' lire';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const ART = { di: ['del', 'dello', 'della', "dell'", 'dei', 'degli', 'delle'], a: ['al', 'allo', 'alla', "all'", 'ai', 'agli', 'alle'], da: ['dal', 'dallo', 'dalla', "dall'", 'dai', 'dagli', 'dalle'], su: ['sul', 'sullo', 'sulla', "sull'", 'sui', 'sugli', 'sulle'], in: ['nel', 'nello', 'nella', "nell'", 'nei', 'negli', 'nelle'] };
function pr(p, s) { // di + il gatto = del gatto
  const arts = ['il ', 'lo ', 'la ', "l'", 'i ', 'gli ', 'le '];
  for (let k = 0; k < arts.length; k++) if (s.startsWith(arts[k])) return ART[p][k] + (k === 3 ? '' : ' ') + s.slice(arts[k].length);
  return (p === 'a' && /^[aeiouAEIOU]/.test(s) ? 'ad' : p) + ' ' + s;
}


// ================= IL CAST: 40 abitanti e un gabbiano =================
// m: la maschera (il vizio fisso); vuole: il desiderio piccolo e materiale (Marcovaldo); tiene: la cosa a cui tiene (Goose Game)
const CAST = [
  ['efisio', 'Efisio', 'Sanna', 'Tredici', 'm', 'segretario della Cooperativa Pescatori', 'Peppone', 'il frigo nuovo per la Cooperativa', 'la barca «Tredici»'],
  ['ugo', 'Ugo', 'Piras', null, 'm', 'parroco', 'Don Camillo', 'la chiesa piena al falò', 'la statua di Sant\'Antonio'],
  ['tore', 'Tore', 'Fadda', 'Lampo', 'm', 'ex palombaro', 'Capitano', 'essere il più coraggioso del molo', 'il casco da palombaro'],
  ['nello', 'Nello', 'Mura', null, 'm', 'pescatore', 'Pulcinella', 'dormire in barca senza che lo sappia la moglie', 'la «Speranza II»'],
  ['bachisio', 'Bachisio', 'Corda', null, 'm', 'sacrestano', 'Zanni muto', 'che si sappia che la corda non la tocca', 'la corda delle campane'],
  ['mario', 'Mario', 'Loi', 'Sciabica', 'm', 'mediatore', 'Brighella', 'il dieci per cento di tutto', 'il taccuino'],
  ['cosimo', 'Cosimo', 'Cabras', null, 'm', 'grossista del pesce', 'Pantalone', 'la casa sul molo di zio Raimondo', 'la cassa'],
  ['assunta', 'Assunta', 'Pisano', null, 'f', 'pescivendola', 'Colombina vecchia', 'vendere tutto prima delle dieci', 'la bilancia'],
  ['carmela', 'Carmela', 'Vacca', null, 'f', 'pescivendola', 'la rivale', 'dimostrare che la bilancia di Assunta ruba', 'il gatto'],
  ['gino', 'Gino', 'Lai', null, 'm', 'barista del Bar Sport', 'l\'oste', 'che il bar resti il centro del mondo', 'il cannolo in vetrina dal 1971'],
  ['lella', 'Lella', 'Lai', null, 'f', 'cassiera del Bar Sport', 'Colombina', 'andarsene a Cagliari a studiare', 'la cassa del bar'],
  ['aldo', 'Aldo', 'Melis', null, 'm', 'ragioniere, presidente del comitato del falò', 'il Dottore (il Tecnico)', 'il falò più alto di sempre', 'la cartella del comitato'],
  ['pina', 'Pina', 'Murgia', null, 'f', 'tabaccaia e ricevitoria del Lotto', 'il coro', 'sapere le cose prima che succedano', 'il libro della Smorfia'],
  ['claudio', 'Claudio', 'Spanu', null, 'm', 'barbiere', 'il coro', 'avere sempre una notizia in più del cliente', 'il rasoio'],
  ['ignazio', 'Ignazio', 'Contu', null, 'm', 'impiegato del Comune, Anagrafe e Ufficio Sogni', 'Tartaglia', 'che ogni cosa abbia il suo timbro', 'il timbro'],
  ['renato', 'Renato', 'Floris', null, 'm', 'Delegato della Tutela', 'il Podestà', 'essere salutato per primo', 'la fascia'],
  ['lino', 'Lino', 'Saba', null, 'm', 'brigadiere della Guardia', 'lo stanco', 'arrivare alla pensione senza un verbale', 'il berretto'],
  ['belga', 'Antonio', 'Carta', 'il Belga', 'm', 'emigrato in Belgio, tornato', 'il forestiero', 'che il paese veda che ce l\'ha fatta', 'la macchina'],
  ['nives', 'Nives', 'Atzori', null, 'f', 'sarta, vedova bianca', 'la Malinconica', 'una spiegazione, dopo ventidue anni', 'la macchina da cucire'],
  ['franco', 'Franco', 'Pinna', null, 'm', 'pescatore', 'il Testardo', 'la casa di zio Raimondo', 'il trapano'],
  ['marco', 'Marco', 'Pinna', null, 'm', 'pescatore, figlio di Franco', 'l\'Innamorato', 'Rita Porcu', 'il motorino'],
  ['bruno', 'Bruno', 'Porcu', null, 'm', 'muratore', 'il Testardo', 'la casa di zio Raimondo', 'la cazzuola'],
  ['rita', 'Rita', 'Porcu', null, 'f', 'figlia di Bruno', 'l\'Innamorata', 'Marco Pinna', 'il diario'],
  ['teresa', 'Teresa', 'Porcu', null, 'f', 'moglie di Bruno', 'la Devota', 'la prima panca', 'il termos'],
  ['gavino', 'Gavino', 'Satta', null, 'm', 'pensionato', 'il Non Invitato', 'essere invitato a qualcosa', 'la giacca buona'],
  ['ciccio', 'Ciccio', 'Puddu', null, 'm', 'garzone di tre padroni', 'Arlecchino', 'mangiare a pranzo', 'il vassoio'],
  ['piero', 'Piero', 'Cossu', null, 'm', 'bambino, gemello', 'i Gemelli', 'soldi per le figurine', 'la fionda'],
  ['paolo', 'Paolo', 'Cossu', null, 'm', 'bambino, gemello', 'i Gemelli', 'soldi per le figurine', 'il secchiello'],
  ['iolanda', 'Iolanda', 'Medda', null, 'f', 'beghina', 'la Devota rivale', 'la prima panca', 'il rosario di madreperla'],
  ['bonaria', 'Bonaria', 'Olla', null, 'f', 'la più vecchia del paese, 94 anni', 'la Memoria', 'che nessuno le dica come andavano le cose', 'la dentiera'],
  ['dario', 'Dario', 'Usai', null, 'm', 'disoccupato, 24 anni', 'il Partente', 'andarsene in Germania', 'la radiolina'],
  ['wanda', 'Wanda', 'Usai', null, 'f', 'madre di Dario', 'la Madre', 'il posto in Comune per Dario', 'la pentola'],
  ['michele', 'Michele', 'Boi', null, 'm', 'pescatore di lampara', 'il Notturno', 'dormire di giorno', 'la lampara'],
  ['pasquale', 'Pasquale', 'Deiana', null, 'm', 'il pescatore più vecchio', 'l\'Oracolo', 'azzeccare il tempo una volta', 'il barometro'],
  ['grazia', 'Grazia', 'Serra', null, 'f', 'maestra elementare', 'la Pedante', 'che si scriva giusto, anche il Garante', 'la penna rossa'],
  ['elio', 'Elio', 'Ledda', null, 'm', 'postino', 'il Ficcanaso', 'leggere le cartoline prima di consegnarle', 'la borsa'],
  ['sergio', 'Sergio', 'Marras', null, 'm', 'pensionato, tavolo della scopa', 'il Vecchio', 'vincere una partita prima di morire', 'il mazzo'],
  ['fausto', 'Fausto', 'Fois', null, 'm', 'pensionato, tavolo della scopa', 'il Baro', 'il settebello', 'il cappello'],
  ['angelo', 'Angelo', 'Podda', null, 'm', 'pensionato, tavolo della scopa', 'il Sonnolento', 'finire una mano sveglio', 'la sedia sua'],
  ['loredana', 'Loredana', 'Floris', null, 'f', 'moglie del Delegato', 'la Signora', 'essere invitata per prima', 'il cappello di pelliccia'],
  ['gab', 'il Comandante', '', null, 'm', 'gabbiano, residente, tessera annonaria n. 41', 'il Gabbiano', 'tutto', 'il tetto del Comune'],
];
const P = {};
for (const [id, nome, cogn, nick, sx, mest, m, vuole, tiene] of CAST) P[id] = { id, nome, cogn, nick, sx, mest, m, vuole, tiene, soldi: 0, rel: {}, n: 0 };
const PESCATORI = ['efisio', 'nello', 'franco', 'marco', 'pasquale', 'michele'];
const BAR = ['sergio', 'fausto', 'angelo', 'pasquale', 'tore', 'aldo', 'claudio', 'gavino', 'nello', 'belga'];
const GENTE = Object.keys(P).filter(k => k !== 'gab');
const FAMIGLIE = { pinna: ['franco', 'marco'], porcu: ['bruno', 'rita', 'teresa'], usai: ['dario', 'wanda'], floris: ['renato', 'loredana'], lai: ['gino', 'lella'], cossu: ['piero', 'paolo'] };

// ================= LO STATO =================
const FASCE = ['alba', 'mattina', 'mezzogiorno', 'pomeriggio', 'sera', 'notte'];
const GIORNI = ['', 'Mercoledì 15 gennaio 1986', 'Giovedì 16 gennaio 1986', 'Venerdì 17 gennaio 1986, Sant\'Antonio Abate'];
const S = {
  g: 1, fi: 0, fatti: [], nextF: 1, occ: new Set(), menz: new Set(),
  meteo: {}, ipotesi: {}, liti: { 1: 0, 2: 0, 3: 0 }, ultimaLite: {},
  faide: [], voci: [], perse: [], buttate: [], sogni: [], depositati: {}, giocate: [], citazioni: { 1: [], 2: [], 3: [] },
  nemici: [], segnato: {}, legna: { n: 0, cose: [] }, flag: {}, conta: {}, var: {}, varUsi: 0, varRipetute: 0,
  pescato: {}, oggettiNuovi: [], scommesse: [], gavino: 0, belgaChiede: 0, ciccio: 0, lazzi: 0, tipiOp: {},
};
const fascia = () => FASCE[S.fi];
const free = (...ids) => ids.every(i => i && !S.occ.has(i) && (i !== 'belga' || S.arrivoF)); // chi non c'è non agisce: il Belga esiste solo da quando è arrivato
const take = (...ids) => ids.forEach(i => S.occ.add(i));
const freeOf = (arr) => shuffle(arr.filter(i => free(i)));
const rel = (a, b, d) => { P[a].rel[b] = (P[a].rel[b] || 0) + d; P[b].rel[a] = (P[b].rel[a] || 0) + d; };

// i nomi: la prima volta nel giorno per intero (come un giornale), poi corto
function N(id) {
  const p = P[id]; if (!p) return id;
  if (id === 'ugo') return 'Don Ugo';
  if (id === 'gab') { if (S.menz.has(id)) return 'il Comandante'; S.menz.add(id); return 'il Comandante, il gabbiano del Comune,'; }
  if (id === 'renato') { if (S.menz.has(id)) return 'il Delegato'; S.menz.add(id); return 'il Delegato della Tutela, dottor Renato Floris,'; }
  if (id === 'lino') { if (S.menz.has(id)) return 'il brigadiere'; S.menz.add(id); return 'il brigadiere Lino Saba'; }
  if (id === 'grazia') { if (S.menz.has(id)) return 'la maestra'; S.menz.add(id); return 'la maestra Grazia Serra'; }
  if (id === 'aldo') { if (S.menz.has(id)) return 'il ragioniere'; S.menz.add(id); return 'il ragionier Aldo Melis'; }
  if (id === 'bonaria') { if (S.menz.has(id)) return 'zia Bonaria'; S.menz.add(id); return 'zia Bonaria Olla, 94 anni,'; }
  if (S.menz.has(id)) return p.nick || p.nome;
  S.menz.add(id);
  return p.nick ? `${p.nome} ${p.cogn} detto ${p.nick}` : `${p.nome} ${p.cogn}`;
}
const ET = { ugo: 'Don Ugo', renato: 'il Delegato', lino: 'il brigadiere', aldo: 'il ragioniere', grazia: 'la maestra', bonaria: 'zia Bonaria', gab: 'il Comandante' };
const etichetta = id => ET[id] || (P[id] ? P[id].nick || P[id].nome : id);
const Nn = id => { const s = N(id); return s.replace(/^il /, '').replace(/^la /, ''); };
const o = (id, m = 'o', f = 'a') => P[id] && P[id].sx === 'f' ? f : m;
const GEMELLI = () => { S.menz.add('piero'); S.menz.add('paolo'); return S.menz.has('gemelli') ? 'i gemelli' : (S.menz.add('gemelli'), 'i gemelli Cossu, undici anni,'); };

// le varianti: ognuna una volta sola per partita, se possibile (la farinata si combatte qui)
function V(key, arr) {
  const u = S.var[key] || (S.var[key] = arr.map(() => 0));
  let min = Math.min(...u), idx = shuffle(arr.map((_, i) => i)).find(i => u[i] === min);
  S.varUsi++; if (u[idx] > 0) S.varRipetute++;
  u[idx]++; return arr[idx]();
}

// ================= IL REGISTRO DEI FATTI (come Vita.fatto) =================
// reg: R realistico, A assurdo, S surreale. sez: la pagina della Gazzetta. breve: il nome della cosa, per le catene e per il Tecnico.
function fatto(tipo, chi, dati, causa, reg, sez, testo, extra) {
  const par = causa ? S.fatti.find(f => f.id === causa) : null;
  if (testo) testo = testo.replace(/,(\s*[.,;:)!?])/g, '$1').replace(/,( [a-zà-ù]+ (il|la|i|le|lo|gli|l'))?(?=\s*»)/g, '$1').replace(/([.!?] )([a-zàèéìòù])/g, (m, a, b) => a + b.toUpperCase());
  const f = Object.assign({ id: 'f' + S.nextF++, g: S.g, fascia: fascia(), tipo, chi: [].concat(chi || []), dati: dati || {}, causa: par ? par.id : null,
    hop: par ? par.hop + 1 : 0, reg, sez, testo, voce: null, breve: tipo, lite: false, succoso: false, oggetto: null, nascosto: false }, extra || {});
  S.fatti.push(f); S.conta[tipo] = (S.conta[tipo] || 0) + 1;
  for (const c of f.chi) if (P[c]) P[c].n++;
  if (f.lite) { S.liti[S.g]++; S.ultimaLite[S.g] = f.id; }
  if (f.voce) S.citazioni[S.g].push({ f: f.id, chi: f.voce[0], riga: f.voce[1], su: f.chi.find(x => x !== f.voce[0]) });
  return f;
}
const F = id => S.fatti.find(f => f.id === id);
const catena = id => { const out = []; let f = F(id); while (f) { out.unshift(f); f = f.causa ? F(f.causa) : null; } return out; };
const oggi = (pred) => S.fatti.filter(f => f.g === S.g && (!pred || pred(f)));
const ultimo = (pred) => { for (let i = S.fatti.length - 1; i >= 0; i--) if (pred(S.fatti[i])) return S.fatti[i]; return null; };
const perdi = (ogg, di, f, come) => S.perse.push({ ogg, di, f: f.id, g: S.g, come: come || 'perso' });
const nemico = (f, nome, k) => S.nemici.push({ f: f.id, nome, k, g: S.g, usato: 0 });

// ================= LA SMORFIA (numeri della Smorfia corrente) =================
const SMORFIA = { 13: 'Sant\'Antonio', 14: 'l\'ubriaco', 17: 'la disgrazia', 19: 'la risata', 20: 'la festa', 22: 'il pazzo', 24: 'le guardie', 31: 'il padrone di casa', 35: 'l\'uccellino', 38: 'le botte', 42: 'il caffè', 46: 'i soldi', 47: 'il morto', 48: 'il morto che parla', 54: 'il cappello', 56: 'la caduta', 63: 'la sposa', 65: 'il pianto', 72: 'la meraviglia', 79: 'il ladro', 83: 'il maltempo', 84: 'la chiesa', 89: 'la vecchia', 90: 'la paura' };
const SOGNO_DI = { // tipo di fatto -> [numero, cosa ha sognato]
  testamento: [48, a => `zio Raimondo che parlava, ma solo di calcio`],
  faida: [38, (a, c) => pick([`di prendere a triglie in faccia ${a}`, `${a} che chiedeva scusa in latino`, `di vincere una lite con ${a}, ma mut${o(c)}`])],
  lite: [38, a => pick([`${a} che litigava con se stesso e perdeva`, `di fare la pace con ${a}, e poi di pentirsene`, `di prendere a sportellate ${a} con la porta di casa`])],
  caduta: [56, () => `di cadere dal campanile senza farsi niente`],
  restituzione: [72, () => `che il mare gli restituiva la gioventù, ma bagnata`],
  gabbiano: [35, () => `il Comandante che gli faceva una multa`],
  brigadiere: [24, () => `il brigadiere che correva`],
  meteo: [83, () => `il maestrale dentro la cucina`],
  messa: [84, () => `la chiesa piena, ma di pesci`],
  vincita: [46, () => `i soldi di zio Raimondo, in una scatola di biscotti`],
  innamorati: [63, () => `una sposa al mercato, pesata da Assunta`],
  ordinanza: [90, () => `un modulo per poter sognare, in triplice copia`],
  statua: [13, () => `Sant'Antonio che si girava a fare l'occhiolino`],
  vanto: [22, () => `di tuffarsi davvero`],
  cannolo: [65, () => `il cannolo del '71 che piangeva in vetrina`],
  arrivo: [72, () => `la nave dell'Impero, arrivata`],
  furto: [79, () => `i gemelli Cossu che restituivano qualcosa`],
  scopa: [14, () => `di giocare a scopa con l'ubriaco del '58`],
  bonaria: [89, () => `zia Bonaria giovane, che rimproverava lo stesso tutti`],
  voce: [19, () => `il paese intero che rideva, e non sapeva di cosa`],
  partita: [56, () => `il pallone che tornava dal mare da solo, e segnava`],
  frigo: [72, () => `il frigo della Cooperativa che parlava, con la voce del Garante`],
  casa: [31, () => `la casa sul molo che sceglieva da sola il padrone`],
};

// ================= LE FAIDE (Guareschi: scala, tregua contro il nemico comune, ricaduta) =================
// ogni gradino: (a, b, ctx) => { testo, voce:[chi, riga], lite, oggetto, perdi:[ogg,di] }
const FAIDE = [
  { id: 'camillo', a: 'ugo', b: 'efisio', contro: ['ordinanza_liti', 'ordinanza_fumo'], motivo: 'il campanile contro la Cooperativa', reg: 'R',
    innesco: () => ultimo(f => f.tipo === 'barche_ferme' || f.tipo === 'pescato' || f.tipo === 'messa'),
    passi: [
      () => ({ testo: `${cap(N('efisio'))} ha parcheggiato il camioncino della Cooperativa davanti al portone della chiesa, di traverso. ${N('ugo')} è uscito dalla sagrestia con la scopa.`, voce: ['ugo', 'Sposta quel catorcio o te lo benedico con la scopa!'], oggetto: 'il camioncino' }),
      () => ({ testo: `Durante l'assemblea della Cooperativa le campane hanno suonato a distesa per quaranta minuti. ${N('ugo')} dice che era una prova. L'assemblea ha votato a gesti.`, voce: ['efisio', 'Abbiamo votato a gesti! Ho perso, ma per colpa delle campane!'], lite: true, oggetto: 'la campana' }),
      () => ({ testo: `La Cooperativa ha deciso di non dare legna al falò di Sant'Antonio. ${N('ugo')} ha risposto benedicendo tutte le barche del porto tranne la «Tredici».`, voce: ['efisio', 'Meglio! Così se affondo, affondo laico!'], lite: true, oggetto: 'la barca', flag: 'boicotto' }),
      () => ({ testo: `Braccio di ferro sul bancone del Bar Sport fra ${N('ugo')} e ${N('efisio')}. Il bancone ha ceduto prima di loro. ${cap(N('gino'))} ha mandato il conto a tutti e due, più uno alla parrocchia.`, voce: ['gino', 'Il bancone del \'58! Ci ho pianto sopra al mio matrimonio!'], lite: true, oggetto: 'il bancone' }),
    ],
    tregua: (nem) => ({ testo: `Contro ${nem}, ${N('ugo')} ed ${N('efisio')} hanno firmato insieme una protesta. ${N('ugo')} ha firmato per primo. ${cap(N('efisio'))} ha firmato più grande.`, voce: ['ugo', 'Per stavolta. Domani torni a essere un disgraziato.'] }),
    ricaduta: () => ({ testo: `La tregua fra ${N('ugo')} e la Cooperativa è durata fino all'aperitivo. Si discuteva di chi aveva firmato per primo.`, lite: true }),
  },
  { id: 'eredita', a: 'franco', b: 'bruno', contro: ['cosimo_casa', 'figli', 'ordinanza_liti'], motivo: 'la casa sul molo di zio Raimondo', reg: 'R',
    innesco: () => ultimo(f => f.tipo === 'testamento'),
    passi: [
      () => ({ testo: `${cap(N('franco'))} ha cambiato la serratura della casa di zio Raimondo. Alle undici ${N('bruno')}, suo cugino, l'ha cambiata di nuovo. Il ferramenta ha chiesto se può aprire un conto a nome della casa.`, voce: ['franco', 'Lì dentro c\'è la mia infanzia! E il mio trapano!'], oggetto: 'la chiave', perdi: ['la chiave della casa sul molo', 'bruno'] }),
      () => ({ testo: `Nella finestra della casa contesa sono comparse due fotografie di zio Raimondo, una messa da ${N('franco')} e una da ${N('bruno')}. In una ride. Nell'altra no.`, voce: ['bruno', 'La mia cornice è d\'argento! Lo zio l\'avrebbe voluta così!'], oggetto: 'la cornice' }),
      () => ({ testo: `${cap(N('bruno'))} ha portato in piazza il cane di zio Raimondo per vedere con chi andava. Il cane è andato dal macellaio.`, voce: ['franco', 'Il macellaio non è parente! Non vale!'], lite: true, oggetto: 'il cane' }),
      () => ({ testo: `Scenata sotto la casa contesa: ${N('franco')} e ${N('bruno')} hanno gridato per un'ora, ognuno col suo parentado sul marciapiede suo.`, voce: ['bruno', 'Lo zio a te non ti salutava! Salutava il cane, a te no!'], lite: true, oggetto: 'la casa' }),
    ],
    tregua: (nem) => ({ testo: `Contro ${nem}, ${N('franco')} e ${N('bruno')} si sono messi d'accordo per la prima volta in vent'anni. Si sono stretti la mano davanti a testimoni. Ognuno aveva portato i suoi.`, voce: ['franco', 'Siamo cugini. Ci odiamo noi, non lo fa un altro per noi.'] }),
    ricaduta: () => ({ testo: `Finita la tregua Pinna-Porcu: non si sono messi d'accordo su chi doveva salutare per primo il notaio.`, lite: true }),
  },
  { id: 'bilancia', a: 'assunta', b: 'carmela', contro: ['cosimo', 'ordinanza_liti'], motivo: 'la bilancia', reg: 'R',
    innesco: () => ultimo(f => f.tipo === 'mercato'),
    passi: [
      () => ({ testo: `Al mercato ${N('carmela')} ha guardato la bilancia di ${N('assunta')} per tutta la mattina, senza dire niente. ${cap(N('assunta'))} ha venduto la metà.`, voce: ['assunta', 'Guarda, guarda! Tanto pesa giusto! Più o meno!'], oggetto: 'la bilancia' }),
      () => ({ testo: `${cap(N('carmela'))} si è presentata al banco di ${N('assunta')} con un chilo di sale timbrato dal Comune. La bilancia di ${N('assunta')} l'ha pesato un chilo e duecento.`, voce: ['assunta', 'Sarà umido! Il sale si gonfia, lo sanno tutti!'], lite: true, oggetto: 'la bilancia' }),
      () => ({ testo: `Per vendetta ${N('assunta')} ha pesato il gatto di ${N('carmela')} davanti a tutto il mercato. Undici chili.`, voce: ['assunta', 'Undici chili! Mangia tutto il pesce che lei non vende!'], lite: true, oggetto: 'il gatto', flag: 'gatto_pesato' }),
      () => free('lino') ? ({ testo: `Chiamato al mercato per la bilancia, ${N('lino')} ci è salito sopra. Ha chiesto di rifare la pesata sull'altra bilancia. Poi su nessuna.`, voce: ['lino', 'Sequestro tutte e due. Così non si pesa più nessuno, io per primo.'], lite: true, oggetto: 'la bilancia', con: ['lino'] }) : null,
    ],
    tregua: (nem) => ({ testo: `Contro ${nem}, ${N('assunta')} e ${N('carmela')} hanno abbassato insieme i prezzi di cinquanta lire. Hanno usato la stessa bilancia. Quella di ${N('carmela')}.`, voce: ['carmela', 'Per un giorno pesa giusto anche lei. Segnatevelo.'] }),
    ricaduta: () => ({ testo: `La tregua del mercato è finita alle undici: la bilancia comune pesava a favore di chi la teneva.`, lite: true }),
  },
  { id: 'panca', a: 'teresa', b: 'iolanda', contro: ['ordinanza_liti', 'chiasso_chiesa'], motivo: 'la prima panca', reg: 'R',
    innesco: () => ultimo(f => f.tipo === 'messa'),
    passi: [
      () => ({ testo: `Per avere la prima panca alla messa delle sette, ${N('iolanda')} è arrivata alle sei. ${cap(N('teresa'))} c'era già.`, voce: ['teresa', 'Io qui ci sto dal \'51! Prima panca, dove arriva il calorifero!'], oggetto: 'la panca' }),
      () => ({ testo: `${cap(N('iolanda'))} è arrivata in chiesa alle cinque. ${cap(N('teresa'))} era lì, col termos.`, voce: ['teresa', 'Il caffè lo offro anche a lei. Al suo posto. In seconda.'], lite: true, oggetto: 'il termos' }),
      () => ({ testo: `${N('ugo')} ha trovato ${N('teresa')} che dormiva sotto la prima panca, con la coperta e la sveglia. ${cap(N('iolanda'))} dormiva nel confessionale.`, voce: ['iolanda', 'Mi sono confessata da sola. Tre volte. Lei è ancora lì!'], lite: true, oggetto: 'la panca' }),
      () => ({ testo: `${N('ugo')} ha tolto la prima panca. ${cap(N('teresa'))} e ${N('iolanda')} hanno sentito tutta la messa in piedi, dove prima c'era la panca, una attaccata all'altra.`, voce: ['ugo', 'Così imparate. La messa la dico anche io in piedi.'], lite: true, oggetto: 'la panca', con: ['ugo'] }),
    ],
    tregua: (nem) => ({ testo: `Contro ${nem}, ${N('teresa')} e ${N('iolanda')} hanno detto insieme un rosario di protesta sotto il Comune. Hanno litigato solo sul mistero.` }),
    ricaduta: () => ({ testo: `${cap(N('teresa'))} e ${N('iolanda')} si sono rimesse a litigare: il rosario di protesta l'aveva cominciato una, ma l'aveva finito l'altra.`, lite: true }),
  },
  { id: 'vanto', a: 'tore', b: 'belga', contro: ['ordinanza_liti'], motivo: 'chi ha sofferto di più', reg: 'A',
    innesco: () => ultimo(f => f.tipo === 'arrivo'),
    passi: [
      () => ({ testo: `Al Bar Sport ${N('tore')} e ${N('belga')} hanno discusso di chi ha avuto più freddo nella vita. ${cap(N('tore'))} ha raccontato del palombaro. ${cap(N('belga'))} della miniera.`, voce: ['tore', 'Io sotto il ghiaccio, a quaranta metri! …Va be\', era una vasca.'], oggetto: 'il ghiaccio' }),
      () => ({ testo: `${cap(N('belga'))} ha mostrato al bar una cicatrice della miniera. ${cap(N('tore'))} ha mostrato la sua: dice che è un polpo. ${cap(N('claudio'))} il barbiere dice che è l'appendicite.`, voce: ['tore', 'Un polpo di trenta chili! Mi ha tolto l\'appendicite, già che c\'era!'], oggetto: 'la cicatrice' }),
      () => ({ testo: `${cap(N('tore'))} ha sfidato ${N('belga')} a un tuffo dal molo domani alle cinque. Tutti e due hanno detto di sì subito, guardando l'acqua.`, voce: ['belga', 'In Belgio ci tuffiamo nei canali! Gelati! …Lì c\'è la ringhiera.'], oggetto: 'il molo', flag: 'tuffo' }),
      () => free('ciccio') ? ({ testo: `Al tuffo dal molo non si è tuffato nessuno dei due. Dopo quaranta minuti di «prima tu» in acqua ci è finito ${N('ciccio')}, che portava i caffè.`, voce: ['ciccio', 'I caffè! Erano già pagati!'], lite: true, oggetto: 'il vassoio', perdi: ['il vassoio del Bar Sport', 'ciccio'], con: ['ciccio'], tipo: 'caduta' }) : null,
    ],
    tregua: (nem) => ({ testo: `Contro ${nem}, ${N('tore')} e ${N('belga')} si sono alleati: uno racconta, l'altro conferma.`, voce: ['tore', 'Lui c\'era. Io pure. Il resto lo dice lui.'] }),
    ricaduta: () => ({ testo: `L'alleanza fra ${N('tore')} e ${N('belga')} è finita al secondo bicchiere: tutti e due dicevano di aver salvato Ciccio.`, lite: true }),
  },
];
for (const d of FAIDE) S.faide.push(Object.assign({ liv: 0, ultimo: null, attiva: false, inTregua: false, ricaduto: false, finita: false, passiGiorno: {} }, d));

const BREVI = {
  camillo_1: 'il camioncino davanti alla chiesa', camillo_2: 'le campane sull\'assemblea', camillo_3: 'il boicottaggio del falò', camillo_4: 'il braccio di ferro sul bancone',
  eredita_1: 'la guerra delle serrature', eredita_2: 'le due fotografie dello zio', eredita_3: 'il cane dello zio in piazza', eredita_4: 'la scenata sotto la casa sul molo',
  bilancia_1: 'lo sguardo sulla bilancia', bilancia_2: 'il sale timbrato', bilancia_3: 'il gatto pesato', bilancia_4: 'il brigadiere sulla bilancia',
  panca_1: 'la prima panca alle sei', panca_2: 'il termos in chiesa', panca_3: 'la notte sotto la panca', panca_4: 'la messa in piedi',
  vanto_1: 'la gara a chi ha avuto più freddo', vanto_2: 'la gara delle cicatrici', vanto_3: 'la sfida del tuffo', vanto_4: 'il tuffo mancato',
};
// ================= LE IPOTESI FANTASTICHE (una al giorno: «cosa succederebbe se...») =================
const IPOTESI = [
  { id: 'timbri', titolo: 'Il Comune ha finito i timbri.', testo: () => `Il Comune ha finito i timbri. ${cap(N('ignazio'))} timbra con una patata intagliata. Per ora vale.` },
  { id: 'luce', titolo: 'Stasera la luce a sere alterne tocca all\'altra metà del paese.', testo: () => `Stasera la luce tocca alla metà del paese senza il Bar Sport. Il Garante, alle venti, lo vedrà solo chi abita sopra la tabaccheria.` },
  { id: 'posta', titolo: 'Il postino ha la febbre: la posta la porta Ciccio.', testo: () => `${cap(N('elio'))} ha la febbre. La posta la porta ${N('ciccio')}, insieme ai caffè e alle cassette.` },
  { id: 'nave', titolo: 'La nave dell\'Impero è arrivata davvero.', testo: () => `Alle sei la nave dell'Impero è arrivata davvero. Al molo non c'era nessuno: avevano detto domani. Alle sei e venti è ripartita.` },
  { id: 'sale', titolo: 'Al Supermercato del Popolo è finito il sale.', testo: () => `Al Supermercato del Popolo è finito il sale. Il pesce si vende uguale. Le liti costano di più.` },
];

// ================= GLI OPERATORI =================
const OPS = [];
const op = o => OPS.push(Object.assign({ peso: 1, max: 1, maxRun: 99, giorni: [1, 2, 3], fasce: FASCE, inst: false }, o));

// ---------- ISTITUZIONI (radici) ----------
op({ id: 'ipotesi', inst: true, fasce: ['alba'], fai: () => {
  const ip = S.ipotesi[S.g]; if (!ip) return;
  fatto('ipotesi', [], { id: ip.id }, null, 'A', 'prima', ip.testo(), { breve: ip.titolo.replace(/\.$/, '').toLowerCase() });
} });
op({ id: 'meteo', inst: true, fasce: ['alba'], fai: () => {
  const m = S.meteo[S.g], prev = pick(['bonaccia', 'maestrale', 'scirocco', 'nebbia'].filter(x => x !== m));
  const T = {
    maestrale: () => V('maestrale', [() => `Maestrale a trentacinque nodi. ${cap(N('pasquale'))} aveva previsto ${prev}. Dice che si è sbagliato il mare.`, () => `Maestrale. Volati via due ombrelloni del Lido, a gennaio, che nessuno sapeva fossero ancora lì. ${cap(N('pasquale'))} aveva detto ${prev}.`]),
    bonaccia: () => V('bonaccia', [() => `Bonaccia, mare d'olio. ${cap(N('pasquale'))} aveva previsto ${prev}. Ha detto che era una prova.`, () => `Bonaccia. ${cap(N('pasquale'))}, col barometro in mano, aveva detto ${prev}: «Il barometro è nuovo, deve ancora imparare.»`, () => `Mare piatto, cielo pulito. ${cap(N('pasquale'))} aveva previsto ${prev} e oggi non esce di casa per la vergogna.`]),
    scirocco: () => S.meteo[S.g - 1] === 'scirocco' ? (S.meteo[S.g - 2] === 'scirocco' ? `Terzo giorno di scirocco. In paese non si saluta più nessuno. ${cap(N('pasquale'))} dice che domani cambia: lo dice da martedì.` : `Ancora scirocco. Il sale nelle saliere non scende, i panni non asciugano, le mogli non parlano. ${cap(N('pasquale'))} aveva previsto ${prev}.`) : V('scirocco', [() => `Scirocco, umido, mal di testa per tutti. ${cap(N('pasquale'))} aveva previsto ${prev}: «Si vede che è cambiato di notte, mentre dormivo.»`, () => `Scirocco. Sabbia rossa sulle macchine, mal di testa nelle case. ${cap(N('pasquale'))} aveva detto ${prev}, e oggi dice che il suo era scirocco «in un certo senso».`]),
    nebbia: () => V('nebbia', [() => `Nebbia fitta dal porto fino alla chiesa. ${cap(N('pasquale'))} l'aveva prevista: è la prima volta dal 1974. Non l'ha detto a nessuno per paura di portare male.`, () => `Nebbia. Dal Bar Sport non si vede il molo, e dal molo non si vede il Bar Sport: per qualcuno è la prima mattina di pace.`]),
  };
  const f = fatto('meteo', ['pasquale'], { m }, null, 'R', 'porto', T[m](), { breve: { nebbia: 'la nebbia', bonaccia: 'la bonaccia', scirocco: 'lo scirocco', maestrale: 'il maestrale' }[m] });
  S.meteoF = f.id;
} });
op({ id: 'messa', inst: true, fasce: ['alba'], fai: () => {
  const f = fatto('messa', ['ugo', 'teresa', 'iolanda'], {}, null, 'R', 'chiesa', null, { nascosto: true, breve: 'la messa delle sette' });
  S.messaF = f.id;
} });
op({ id: 'statua', inst: true, fasce: ['alba'], giorni: [2, 3], fai: () => { // regola surreale 3
  const ieri = S.fatti.filter(f => f.g === S.g - 1 && !f.nascosto);
  const cnt = {}; for (const f of ieri) for (const c of f.chi) if (P[c]) cnt[c] = (cnt[c] || 0) + 1;
  const top3 = Object.keys(cnt).filter(c => c !== S.segnato[S.g - 1]).sort((a, b) => cnt[b] - cnt[a]).slice(0, 3); if (!top3.length) return;
  const best = chance(.5) ? top3[0] : pick(top3); // il santo guarda chi ha fatto chiasso: quasi sempre il primo
  const causa = ieri.filter(f => f.chi.includes(best)).sort((a, b) => b.hop - a.hop)[0];
  S.segnato[S.g] = best;
  const casa = best === 'gab' ? 'il tetto del Comune' : best === 'belga' ? 'la macchina del Belga' : `casa ${Nn(best).startsWith('Delegato') ? 'del Delegato' : 'di ' + Nn(best)}`;
  const t = V('statua', [
    () => `Stamattina la statua di Sant'Antonio, in chiesa, guardava verso ${casa}. ${cap(N(best))} ha detto che non ha fatto niente. Gli hanno offerto il caffè lo stesso, per sicurezza.`,
    () => `La statua di Sant'Antonio stamattina era girata verso ${casa}. ${cap(N('bachisio'))} giura che non l'ha toccata. ${cap(N(best))} è uscit${o(best)} di casa dalla finestra del retro.`,
    () => `Sant'Antonio, in chiesa, ha passato la notte a guardare verso ${casa}. Chi passava di lì ha salutato ${N(best)} con il cappello in mano.`,
  ]);
  fatto('statua', [best], { per: causa && causa.id }, causa && causa.id, 'S', 'chiesa', t, { breve: `la statua che guarda ${Nn(best)}` });
} });
op({ id: 'mare', inst: true, fasce: ['alba'], giorni: [2, 3], fai: () => { // regola surreale 1: il mare restituisce le cose perse (non quelle buttate)
  const da = S.perse.filter(x => x.g < S.g && !x.reso).slice(0, 3);
  for (const x of da) {
    x.reso = true; const owner = x.di;
    let finder;
    if (x.ogg.startsWith('la lettera di Marco') && free('bruno')) finder = 'bruno';
    else if (x.ogg.includes('chiave della macchina') && free('nives')) finder = 'nives';
    else if (x.ogg.includes('chiave della casa') && free('franco')) finder = 'franco';
    else if (chance(.3) && free('piero', 'paolo') && !S.flag.cossuPuniti) finder = 'cossu';
    else finder = pick(freeOf(GENTE.filter(g => g !== owner)).slice(0, 4)) || 'pasquale';
    const own = owner === 'gab' ? 'gab' : owner;
    if (finder === 'cossu') {
      take('piero', 'paolo');
      const prezzo = pick([300, 500, 700]);
      const f = fatto('furto', ['piero', 'paolo', own], { ogg: x.ogg, prezzo }, x.f, 'S', 'mare',
        `All'alba il mare ha restituito ${x.ogg} di ${N(own)}. L'hanno trovat${x.ogg.startsWith('il') || x.ogg.startsWith('i ') ? 'o' : 'a'} ${GEMELLI()}, che gliel${x.ogg.startsWith('il') ? 'o' : 'a'} hanno rivendut${x.ogg.startsWith('il') ? 'o' : 'a'} per ${lire(prezzo)}. La regola dice di restituire. Non dice gratis.`,
        { breve: `${x.ogg} rivenduto dai gemelli`, succoso: true, oggetto: x.ogg.split(' ').slice(0, 2).join(' ') });
      S.furtoF = f.id; continue;
    }
    take(finder);
    let t, extra = {};
    if (finder === 'bruno') {
      t = `All'alba il mare ha restituito ${x.ogg}. L'ha trovata ${N('bruno')}. La regola dice di riportarla a chi l'ha persa. L'ha letta, poi l'ha riportata a ${N('marco')}, il figlio di suo cugino, senza dire una parola. Ha corretto due errori a matita.`;
      extra = { breve: 'la lettera trovata da Bruno', succoso: true, oggetto: 'la lettera', scoperta: true };
    } else if (finder === 'nives') {
      t = `All'alba il mare ha restituito la chiave della macchina del Belga, finita nel secchio d'acqua di ieri. L'ha trovata ${N('nives')}. L'ha riportata come si deve: l'ha lasciata sul cofano, con un biglietto. Sul biglietto c'era scritto «ventidue anni».`;
      extra = { breve: 'la chiave riportata da Nives', succoso: true, oggetto: 'la chiave' }; rel('nives', 'belga', 1);
    } else if (finder === 'franco') {
      t = `All'alba il mare ha restituito ${x.ogg} di ${N('bruno')}. L'ha trovata ${N('franco')}. L'ha riportata a suo cugino come vuole la regola, tenendola con due dita, e se n'è andato senza girarsi.`;
      extra = { breve: 'la chiave restituita da Franco', oggetto: 'la chiave' };
    } else {
      const rival = S.faide.find(d => (d.a === own && d.b === finder) || (d.b === own && d.a === finder));
      t = rival ? `All'alba il mare ha restituito ${x.ogg} di ${N(own)}. L'ha trovat${x.ogg.startsWith('il') ? 'o' : 'a'} ${N(finder)}, che gliel${x.ogg.startsWith('il') ? 'o' : 'a'} ha riportat${x.ogg.startsWith('il') ? 'o' : 'a'} senza parlargli, appoggiandol${x.ogg.startsWith('il') ? 'o' : 'a'} sullo scalino.`
        : V('mare', [
          () => `All'alba il mare ha restituito ${x.ogg} di ${N(own)}. L'ha trovat${x.ogg.startsWith('il') ? 'o' : 'a'} ${N(finder)} e gliel${x.ogg.startsWith('il') ? 'o' : 'a'} ha riportat${x.ogg.startsWith('il') ? 'o' : 'a'} prima delle sette, come si fa.`,
          () => `Restituit${x.ogg.startsWith('il') ? 'o' : 'a'} dal mare stamattina: ${x.ogg} di ${N(own)}. ${cap(N(finder))} l'ha riportat${x.ogg.startsWith('il') ? 'o' : 'a'} asciugat${x.ogg.startsWith('il') ? 'o' : 'a'}, e ha detto che non vuole niente. Ha preso un caffè.`,
          () => `Sulla spiaggia, alle sei, ${x.ogg} di ${N(own)}. ${cap(N(finder))} l'ha riportat${x.ogg.startsWith('il') ? 'o' : 'a'} al legittimo proprietario, che ha controllato che fosse ${x.ogg.startsWith('il') ? 'il suo' : 'la sua'}.`,
        ]);
      extra = { breve: `${x.ogg} restituito dal mare`, oggetto: x.ogg.split(' ').slice(0, 2).join(' ') };
    }
    if (x.ogg.includes('pallone')) t += ` Il brigadiere ha deciso: la partita si finisce domenica, dal settantesimo, con gli stessi giocatori e lo stesso pallone, ancora un po' bagnato.`;
    const f = fatto('restituzione', [finder, own], { ogg: x.ogg }, x.f, 'S', 'mare', t, extra);
    if (extra.scoperta) { S.scopertaF = f.id; }
  }
  // le cose buttate il mare non le restituisce: la regola è coerente
  for (const x of S.buttate.filter(x => x.g < S.g && !x.visto)) {
    x.visto = true;
    fatto('non_restituito', [x.di, 'pasquale'], {}, x.f, 'S', 'mare', `Il mare stamattina non ha restituito ${x.ogg}. ${cap(N('pasquale'))} ha spiegato a ${N(x.attende || x.di)}, che aspettava sulla spiaggia dalle cinque, che erano buttat${x.ogg.startsWith('le') ? 'e' : 'i'}, non pers${x.ogg.startsWith('le') ? 'e' : 'i'}.`, { breve: `${x.ogg} non restituite` });
  }
} });
op({ id: 'pesca', inst: true, fasce: ['alba'], fai: () => {
  const m = S.meteo[S.g];
  if (S.g === 3) { // venerdì 17: nessuno esce, tranne il mangiapreti
    take('efisio');
    const kg = m === 'maestrale' ? 0 : between(4, 40);
    const f = fatto('pescato', ['efisio'], { kg }, null, 'R', 'porto', kg > 20
      ? `Venerdì 17: il porto è rimasto fermo. È uscito solo ${N('efisio')}, che non crede a niente. È tornato con ${kg} chili di triglie. Ha detto che è merito della Cooperativa.`
      : `Venerdì 17: nessuno è uscito, tranne ${N('efisio')}, per principio. È tornato con ${kg} chili e una scarpa. Ha detto che è colpa del santo, non del diciassette.`, { breve: 'Efisio uscito di venerdì 17' });
    S.pescato[S.g] = kg; S.pescaF = f.id; return;
  }
  if (m === 'maestrale') {
    const f = fatto('barche_ferme', PESCATORI, {}, S.meteoF, 'R', 'porto', V('ferme', [
      () => `Barche ferme per il maestrale. I pescatori sono andati al Bar Sport alle sei. ${cap(N('gino'))} ha aperto alle sei e un quarto e li ha trovati già seduti.`,
      () => `Col maestrale nessuno è uscito. ${cap(N('nello'))} ha detto che lui sarebbe uscito, ma non voleva fare torto agli altri.`,
    ]), { breve: 'le barche ferme' });
    S.pescato[S.g] = 0; S.pescaF = f.id; S.flag['albar' + S.g] = true; return;
  }
  const fuori = m === 'nebbia' ? ['pasquale'] : PESCATORI.filter(x => x !== 'michele');
  take(...fuori);
  let kg = 0; const per = {}; for (const p of fuori) { per[p] = between(m === 'bonaccia' ? 15 : 5, m === 'bonaccia' ? 70 : 35); kg += per[p]; }
  S.pescato[S.g] = kg;
  const best = Object.keys(per).sort((a, b) => per[b] - per[a])[0];
  let t;
  if (m === 'nebbia') t = `Con la nebbia è uscito solo ${N('pasquale')}, «a memoria». È tornato con ${kg} chili e la barca di un altro. La sua l'ha ritrovata a mezzogiorno.`;
  else t = V('pesca', [
    () => `Tornate le barche alle sette: ${kg} chili in tutto. Il più è di ${N(best)}, ${per[best]} chili. ${cap(N('nello'))} ne ha portati ${per.nello}: dice che il pesce dormiva anche lui.`,
    () => `Pesca: ${kg} chili, triglie, seppie e qualche polpo. ${cap(N(best))} ha fatto ${per[best]} chili e l'ha detto a tutti, uno per uno.`,
    () => `${kg} chili sul molo alle sette. ${cap(N('marco'))} ha pescato ${per.marco} chili ed era distratto: ha guardato tutto il tempo verso casa Porcu.`,
  ]);
  const f = fatto('pescato', fuori, { kg, best }, S.meteoF, 'R', 'porto', t, { breve: `${kg} chili di pesce` });
  S.pescaF = f.id;
  if (m === 'bonaccia' && chance(.6)) { S.oggettiNuovi.push({ chi: 'nello', ogg: 'un polpo di sei chili', f: f.id }); }
} });
op({ id: 'nave', inst: true, fasce: ['mattina'], fai: () => {
  if (S.ipotesi[S.g] && S.ipotesi[S.g].id === 'nave') return;
  const t = [null, `Il Garante ha confermato che la nave dell'Impero arriva domani.`, `Confermato: la nave dell'Impero arriva domani. ${cap(N('loredana'))} ha già comprato il cappello per lo sbarco.`, `La nave dell'Impero arriva domani. ${cap(N('gavino'))} è andato al molo con la sedia, per non sbagliare.`][S.g];
  fatto('nave', S.g === 3 ? ['gavino'] : [], {}, null, 'R', 'porto', t, { breve: 'la nave che arriva domani' });
} });
op({ id: 'mercato', inst: true, fasce: ['mattina'], fai: () => {
  const kg = S.pescato[S.g] || 0;
  const prezzo = kg > 120 ? 700 : kg > 60 ? 1200 : kg > 0 ? 2500 : 0;
  take('cosimo');
  let t;
  if (kg && S.frigoF && S.g >= 2 && !S.flag.mercFrigo) { S.flag.mercFrigo = true; t = `Con metà pesce chiuso nel frigo della Cooperativa sul molo, ${N('cosimo')} ha dovuto pagarlo ${lire(prezzo + 800)} al chilo. Ha detto che è un ricatto. ${cap(N('efisio'))} ha detto che è il mercato.`; }
  else if (!kg) t = `Mercato senza pesce fresco. ${cap(N('cosimo'))} ha venduto il congelato del magazzino come «pescato ieri». Ieri c'era ${S.meteo[S.g - 1] || 'il maestrale'}.`;
  else if (prezzo <= 700) t = V('merc_basso', [() => `Troppo pesce: ${N('cosimo')} l'ha pagato ${lire(prezzo)} al chilo. Lo rivende a 4.000. Dice che è il trasporto: il magazzino è a trenta metri.`, () => `${kg} chili sul molo e un solo compratore: ${N('cosimo')}, ${lire(prezzo)} al chilo. ${cap(N('efisio'))} ha detto che la Cooperativa farà sciopero. Poi ha venduto.`]);
  else t = V('merc_alto', [() => `${cap(N('cosimo'))} ha pagato il pesce ${lire(prezzo)} al chilo. I pescatori hanno detto che è un furto. ${cap(N('cosimo'))} ha detto che il furto è il loro.`, () => `Poco pesce, prezzi alti: ${lire(prezzo)} al chilo. ${cap(N('cosimo'))} ha comprato tutto lo stesso e ha detto che lo fa per il paese. Lo rivende a Cagliari.`, () => `Pesce a ${lire(prezzo)} al chilo. ${cap(N('assunta'))} ha chiesto lo sconto a ${N('cosimo')} per la quarantesima volta dal 1960. Respinto.`]);
  const f = fatto('mercato', ['cosimo'], { prezzo, kg }, S.pescaF, 'R', 'mercato', t, { breve: kg ? `il pesce pagato ${lire(prezzo)}` : 'il congelato di Cosimo' });
  if ((prezzo <= 700 || !kg) && !S.flag.mercFrigo) nemico(f, `Cosimo Cabras e i suoi prezzi`, 'cosimo');
  S.mercatoF = f.id;
} });
op({ id: 'testamento', inst: true, fasce: ['mattina'], giorni: [1], fai: () => {
  if (!S.archi.eredita) return;
  const f = fatto('testamento', ['franco', 'bruno', 'bonaria'], {}, null, 'R', 'comune',
    `Letto dal notaio il testamento di zio Raimondo Olla, morto la settimana scorsa a 88 anni (era il fratello piccolo di ${N('bonaria')}). La casa sul molo «va a chi dei miei due nipoti mi ha voluto più bene. Lo decida il paese.» I nipoti sono i cugini Franco Pinna e Bruno Porcu.`,
    { breve: 'il testamento di zio Raimondo', succoso: true, oggetto: 'la casa' });
  S.testamentoF = f.id; S.menz.add('franco'); S.menz.add('bruno');
  if (free('cosimo') || true) { const g = fatto('offerta', ['cosimo', 'franco', 'bruno'], {}, f.id, 'R', 'comune', `Un'ora dopo ${N('cosimo')} ha offerto di comprarla, «per toglierli dall'imbarazzo». Ha offerto la metà.`, { breve: 'l\'offerta di Cosimo per la casa' }); nemico(g, `Cosimo Cabras, che vuole la casa per la metà`, 'cosimo_casa'); }
} });
op({ id: 'gabbiano_tessera', inst: true, fasce: ['mattina'], giorni: [1], fai: () => {
  fatto('gabbiano', ['gab', 'ignazio'], {}, null, 'S', 'comune', `Allo sportello annonario, alle nove, ${N('gab')} ha ritirato la sua razione: tessera numero 41, residente dal 1979. ${cap(N('ignazio'))} ha timbrato. Il Comandante ha preso il pane e lasciato la ricevuta.`, { breve: 'la razione del gabbiano' });
  S.flag.tessera = true;
} });
op({ id: 'arrivo', inst: true, fasce: ['pomeriggio'], giorni: [1], fai: () => {
  if (!S.archi.belga) return;
  take('belga');
  const f = fatto('arrivo', ['belga', 'nives'], {}, null, 'R', 'cronaca',
    `Alle quattro, dopo ventidue anni a Charleroi, è tornato ${N('belga')}. Con una macchina targata Belgio, lunga quanto il vico. L'ha parcheggiata davanti a casa di ${N('nives')}, la fidanzata di quando è partito. ${cap(N('nives'))} ha chiuso le persiane.`,
    { breve: 'il ritorno del Belga', succoso: true, oggetto: 'la macchina' });
  S.arrivoF = f.id; rel('belga', 'nives', -1);
} });
op({ id: 'posta', inst: true, fasce: ['mezzogiorno'], giorni: [2], fai: () => { // la cartolina dall'Argentina
  const ciccio = S.ipotesi[2] && S.ipotesi[2].id === 'posta';
  const post = ciccio ? 'ciccio' : 'elio'; take(post);
  const f = fatto('cartolina', [post, 'nives'], {}, null, 'R', 'cronaca', ciccio
    ? `${cap(N('ciccio'))}, che oggi fa il postino, ha consegnato a ${N('teresa')} una cartolina per ${N('nives')}. Viene da Buenos Aires, dal marito partito nel 1962. C'è scritto: «Tutto bene. Torno presto.» Adesso lo sa tutto il vico.`
    : `${cap(N('elio'))} ha consegnato a ${N('nives')} una cartolina da Buenos Aires: è del marito, partito nel 1962. C'è scritto: «Tutto bene. Torno presto.» ${cap(N('elio'))} l'aveva già letta ad alta voce sul portone, per controllare l'indirizzo.`,
    { breve: 'la cartolina da Buenos Aires', succoso: true, oggetto: 'la cartolina' });
  S.cartolinaF = f.id;
} });
op({ id: 'ufficio_sogni', inst: true, fasce: ['mattina'], giorni: [2, 3], fai: () => { // regola surreale 4
  const sg = S.sogni.filter(s => s.g === S.g - 1); if (!sg.length) return;
  const cnt = {}; for (const s of sg) cnt[s.num] = (cnt[s.num] || 0) + 1;
  const top = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a - b)[0];
  S.depositati[S.g] = top;
  const righe = sg.slice(0, 4).map(s => `${N(s.chi)} ha sognato ${s.cosa} (${s.num}, ${SMORFIA[s.num]})`).join('; ');
  const timbro = S.ipotesi[S.g] && S.ipotesi[S.g].id === 'timbri' ? ' Timbrati con la patata.' : '';
  const radice = sg.find(s => s.num === top);
  fatto('sogni', sg.map(s => s.chi), { top }, radice.f, 'S', 'sogni', `All'Ufficio Sogni del Comune, entro le dieci, sono stati depositati ${sg.length} sogni. ${cap(righe)}.${timbro} Il numero più sognato è il ${top}, ${SMORFIA[top]}.`, { breve: `i sogni depositati (il ${top})` });
} });
op({ id: 'garante', inst: true, fasce: ['sera'], giorni: [1, 2], fai: () => {
  const luce = S.ipotesi[S.g] && S.ipotesi[S.g].id === 'luce';
  if (luce) { fatto('garante', ['gino', 'bonaria'], {}, null, 'R', 'bar', `Alle venti, senza luce, al Bar Sport niente Garante. ${cap(N('gino'))} ha acceso due candele. ${cap(N('bonaria'))} ha raccontato il 1923 per un'ora e mezza e nessuno ha potuto cambiare canale.`, { breve: 'la sera senza Garante' }); return; }
  const chi = pick(freeOf(BAR).slice(0, 3)) || 'gino'; take(chi);
  const n = S.liti[S.g];
  const [frase, r0] = V('garante', [
    () => [`la felicità dell'isola è al 94%`, 'Al 94%! Io sono nel 6%, e ci sto benissimo!'],
    () => [`le liti sono calate del 30%`, n ? `Calate! Gino, oggi ne ho fatte ${n === 1 ? 'una' : n} io, segna!` : 'Calate sì! Qui oggi non ha litigato nessuno. Che noia, Gino.'],
    () => [`anche gli uccelli amano l'ordine`, S.flag.tessera ? 'Il Comandante ama l\'ordine? Mi ha fregato il pane!' : 'Zitto tu, pelato! …Gino, abbassa, che se mi sente.'],
    () => [`la nave dell'Impero arriva domani`, 'Domani! Mia moglie al molo ci va da tre anni. Per la nave, dice.'],
  ]);
  const reaz = [r0];
  fatto('garante', [chi], { frase }, null, 'R', 'bar', `Alle venti il Garante, in televisione, ha detto che ${frase}. Al Bar Sport ${N(chi)} ha risposto allo schermo.`, { breve: 'il Garante alle venti', voce: [chi, reaz[0]] });
} });
op({ id: 'estrazione', inst: true, fasce: ['sera'], giorni: [2], fai: () => { // il Lotto del Garante: esce sempre il sogno più denunciato
  const top = S.depositati[2] || 13;
  const nums = [top]; while (nums.length < 5) { const n = between(1, 90); if (!nums.includes(n)) nums.push(n); }
  const ord = shuffle(nums);
  const vinti = S.giocate.filter(gg => gg.num === top || ord.includes(gg.num));
  const fs = ultimo(f => f.tipo === 'sogni');
  const f = fatto('estrazione', ['pina'], { nums: ord }, fs ? fs.id : null, 'S', 'lotto', `Estrazione del Lotto del Garante, ruota dell'isola: ${ord.join(', ')}. È uscito il ${top}, ${SMORFIA[top]}, il più sognato. Esce sempre: lo sanno tutti, lo gioca metà paese, e la ricevitoria paga lo stesso.`, { breve: `l'estrazione (il ${top})` });
  if (!vinti.length) { fatto('vincita', ['pina'], {}, f.id, 'A', 'lotto', `Il ${top} non l'aveva giocato nessuno. ${cap(N('pina'))} ha detto che l'Ufficio Sogni apre alle nove e la ricevitoria chiude alle otto, e che lei l'aveva detto in tempo.`, { breve: 'nessuno ha vinto' }); return; }
  for (const v of vinti.slice(0, 2)) {
    const somma = v.num === top ? pick([60000, 85000, 120000]) : 20000;
    P[v.chi].soldi += somma;
    const g = fatto('vincita', [v.chi], { somma }, f.id, 'R', 'lotto', V('vincita', [
      () => `Ha vinto ${N(v.chi)}: ${lire(somma)} col ${v.num}, ${v.perche}. Ha offerto da bere a tutti e ha chiesto lo scontrino.`,
      () => `${cap(N(v.chi))} ha vinto ${lire(somma)} col ${v.num} (${v.perche}). L'ha detto solo a ${N('pina')}. Alle nove lo sapevano anche al porto.`,
      () => `Vincita di ${lire(somma)} per ${N(v.chi)}, col ${v.num} (${v.perche}). Ha pianto. Poi ha contato.`,
    ]), { breve: `la vincita di ${Nn(v.chi)}`, succoso: true, oggetto: 'i soldi' });
    S.vincitaF = g.id; S.vincitore = v.chi;
  }
} });
op({ id: 'campanile', inst: true, fasce: ['notte'], fai: () => { // regola surreale 2
  const n = S.liti[S.g], colpi = 12 + n;
  const f = fatto('campanile', ['bachisio'], { colpi }, S.ultimaLite[S.g] || null, 'S', 'campanile', V('campanile', [
    () => `A mezzanotte il campanile ha battuto ${colpi} colpi: dodici per l'ora, ${n === 1 ? 'uno per la lite' : n + ' per le liti'} della giornata. ${cap(N('bachisio'))} giura che la corda non l'ha toccata.`,
    () => n ? `Mezzanotte: ${colpi} rintocchi. Dodici sono l'ora. ${n === 1 ? 'L\'altro lo conosciamo tutti.' : `Gli altri ${n} li conosciamo tutti.`}` : `Mezzanotte: dodici rintocchi giusti. Al Bar Sport qualcuno ha chiesto se il campanile è guasto.`,
    () => `Il campanile, a mezzanotte, ne ha battuti ${colpi}. ${n === 0 ? 'Nessuna lite: è la prima volta da Ferragosto.' : `Tolta l'ora, ${n === 1 ? 'fa una lite' : `fanno ${n} liti`}. ${cap(N('bachisio'))} dormiva.`}`,
  ]), { breve: `il campanile a ${colpi}` });
  S.campanileF = f.id;
} });
op({ id: 'sogni_notte', inst: true, fasce: ['notte'], giorni: [1, 2], fai: () => {
  const fatti = oggi(f => !f.nascosto && f.chi.some(c => P[c] && c !== 'gab'));
  const giaSogna = new Set();
  for (const f of shuffle(fatti)) {
    const chi = f.chi.find(c => P[c] && c !== 'gab' && !giaSogna.has(c)); if (!chi) continue;
    const key = SOGNO_DI[f.tipo] ? f.tipo : f.lite ? 'lite' : f.tipo.startsWith('faida') ? 'faida' : null; if (!key) continue;
    if (key === 'bonaria' && chi === 'bonaria') continue;
    const [num, fn] = SOGNO_DI[key]; const altro = f.chi.find(c => c !== chi && P[c]);
    const cosa = fn(altro ? etichetta(altro) : 'qualcuno', chi); if (S.sogni.some(s => s.cosa === cosa)) continue;
    giaSogna.add(chi); S.sogni.push({ g: S.g, chi, num, cosa, f: f.id });
    if (giaSogna.size >= 5) break;
  }
} });
op({ id: 'benedizione', inst: true, fasce: ['mattina'], giorni: [3], fai: () => {
  take('ugo');
  const gatto = S.flag.gatto_pesato ? ` ${cap(N('carmela'))} ha portato il gatto. ${cap(N('assunta'))} ha detto che dopo la benedizione pesa uguale.` : '';
  const macchina = S.arrivoF ? ` ${cap(N('belga'))} ha fatto benedire la macchina. Non è un animale; ${N('ugo')} ha detto che per duemila lire lo diventa.` : '';
  fatto('benedizione', ['ugo', 'gab'], {}, S.messaF, 'R', 'chiesa', `Benedizione degli animali sul sagrato. Il primo è stato ${N('gab')}, che si è presentato da solo, con la tessera.${gatto}${macchina}`, { breve: 'la benedizione degli animali' });
} });
op({ id: 'falo', inst: true, fasce: ['sera'], giorni: [3], fai: () => {
  const L = S.legna;
  const segn = S.segnato[3];
  const gav = segn === 'gavino' ? ` ${cap(N('gavino'))}, guardato dal santo, era l'ospite d'onore. Ha acceso il fuoco lui e ha detto «grazie» a tutti, anche al fuoco.` : S.gavino >= 3 ? ` Dopo l'invito sbagliato, ${N('gavino')} è stato invitato di nuovo, apposta, a voce, da tre persone. È arrivato in giacca buona.` : ` ${cap(N('gavino'))} non era stato invitato. C'era. Ha portato la legna più asciutta di tutti.`;
  const ultimoL = L.cose.length ? L.cose[L.cose.length - 1].f : null;
  const chiAccende = S.comitato >= 2 ? `in tre, al tre: ${N('aldo')} contava, ${N('ugo')} è partito al due, ${N('renato')} al quattro` : S.comitato === 1 ? `da ${N('ugo')}, perché il voto del comitato era finito pari e il fiammifero ce l'aveva lui` : `da ${N('ugo')}`;
  const dim = L.n < 12 ? `${L.n} fascine: il più basso dal dopoguerra. Si è spento durante il discorso del Delegato, che l'ha finito al buio.` : L.n < 25 ? `${L.n} fascine, «un falò raccolto», dice ${N('aldo')}.` : `${L.n} fascine: il più alto dal 1961, dice ${N('aldo')}, che nel 1961 non c'era.`;
  const dentro = L.cose.length ? ` Dentro sono finite anche: ${L.cose.map(c => c.cosa).join('; ')}.` : '';
  fatto('falo', ['aldo', 'ugo', 'gavino'], { n: L.n }, ultimoL, 'R', 'festa', `Il falò di Sant'Antonio è stato acceso alle otto ${chiAccende}. ${dim}${dentro}${gav}`, { breve: 'il falò' });
  const inn = ultimo(f => f.tipo === 'innamorati' || f.tipo === 'restituzione' && f.scoperta);
  if (inn) fatto('innamorati', ['marco', 'rita'], {}, inn.id, 'R', 'festa', `Al falò ${N('marco')} e ${N('rita')} sono stati visti insieme. ${cap(N('franco'))} e ${N('bruno')} li guardavano dai due lati del fuoco, uguali.`, { breve: 'Marco e Rita al falò' });
} });

op({ id: 'legna_giro', inst: true, fasce: ['mattina'], giorni: [1], fai: () => {
  take('aldo'); const n = between(6, 10); S.legna.n += n;
  S.giroF = fatto('legna', ['aldo'], { n, tot: n }, null, 'R', 'festa', `${cap(N('aldo'))} ha fatto il giro delle case per la legna del falò di venerdì: ${n} fascine. Ne servono trenta. Ha detto che il resto è questione di carattere.`, { breve: 'il giro della legna' }).id;
} });
op({ id: 'frigo', inst: true, fasce: ['mattina'], giorni: [1], fai: () => {
  if (!S.archi.frigo) return; take('efisio');
  const f = fatto('frigo', ['efisio'], { desiderio: P.efisio.vuole }, null, 'R', 'porto', `È arrivato con la chiatta il frigo nuovo della Cooperativa Pescatori, quarantotto rate. Non passa dalla porta della Cooperativa. È rimasto sul molo, attaccato alla presa del lampione. ${cap(N('efisio'))} ha detto che è meglio così: si vede.`, { breve: 'il frigo della Cooperativa', succoso: true, oggetto: 'il frigo' });
  S.frigoF = f.id;
} });
op({ id: 'partita', inst: true, fasce: ['pomeriggio'], giorni: [2], fai: () => {
  if (!S.archi.calcio) return; take('lino', 'marco', 'dario', 'claudio');
  const a = between(0, 3), b = between(0, 3), perso = chance(.55);
  const t = perso
    ? `Recupero della quindicesima: Portovecchiese–Atletico Santa Lucia, ${a}-${b} al settantesimo, quando ${N('marco')} ha calciato l'unico pallone in mare. Partita sospesa. Arbitro ${N('lino')}, l'unico disponibile: ha fischiato l'inizio e la sospensione.`
    : `Recupero della quindicesima: Portovecchiese–Atletico Santa Lucia ${a}-${b}. Arbitro ${N('lino')}, l'unico disponibile: ha fischiato solo l'inizio e la fine. In mezzo, dice, era tutto regolare.`;
  const f = fatto('partita', ['lino', 'marco', 'dario'], { a, b, perso }, null, 'R', 'cronaca', t, { breve: perso ? 'il pallone in mare' : 'la partita di recupero', succoso: true, oggetto: 'il pallone', lite: a !== b });
  S.partitaF = f.id; if (perso) perdi('il pallone della Portovecchiese', 'gino', f);
} });
op({ id: 'frigo_seguito', reg: 'R', peso: 3, max: 1, maxRun: 3, fasce: ['mattina', 'pomeriggio', 'sera'], cerca: () => {
  if (!S.frigoF) return null; const st = S.frigoSt || 0;
  if (st === 0 && free('cosimo', 'ignazio', 'efisio')) return { st };
  if (st === 1 && fascia() === 'sera' && free('marco', 'rita')) return { st };
  if (st === 2 && S.g === 3 && free('ugo', 'efisio')) return { st };
  return null;
}, fai: ({ st }) => {
  S.frigoSt = st + 1;
  if (st === 0) { take('cosimo', 'ignazio', 'efisio'); S.frigo1 = fatto('frigo_denuncia', ['cosimo', 'ignazio', 'efisio'], {}, S.frigoF, 'A', 'comune', `${cap(N('cosimo'))} ha denunciato il frigo della Cooperativa per occupazione del suolo pubblico. ${cap(N('ignazio'))} l'ha misurato col metro da sarta: un metro e novanta di molo. Tassa: trecento lire al giorno. ${cap(N('efisio'))} ha pagato un mese in anticipo, davanti a Cosimo, in monete da cinquanta.`, { breve: 'la denuncia del frigo', lite: true, voce: ['efisio', 'Conta, Cosimo! Conta! Tanto sei bravo a contare!'] }).id; return; }
  if (st === 1) { take('marco', 'rita'); fatto('frigo_lampione', ['marco', 'rita'], {}, S.frigo1 || S.frigoF, 'R', 'porto', `Il lampione del molo si spegne ogni volta che il frigo della Cooperativa attacca. Da stasera, al buio del molo, ci vanno i fidanzati. Ci sono andati ${N('marco')} e ${N('rita')}. Il frigo attacca ogni sette minuti.`, { breve: 'il lampione che si spegne', succoso: true, oggetto: 'la lettera' }); return; }
  take('ugo', 'efisio');
  fatto('frigo_benedetto', ['ugo', 'efisio'], {}, S.frigo1 || S.frigoF, 'A', 'chiesa', `Finita la benedizione degli animali, ${N('ugo')} ha benedetto anche il frigo della Cooperativa, «che è vostro, ma il freddo è di Dio». ${cap(N('efisio'))} ha protestato. Poi il motore ha smesso di fare rumore, e ha smesso di protestare.`, { breve: 'il frigo benedetto', voce: ['efisio', 'Lo benedice gratis? Allora non è benedetto bene.'] });
} });
op({ id: 'partita_bar', reg: 'R', peso: 3.5, max: 1, maxRun: 1, fasce: ['sera'], giorni: [2], cerca: () => (S.partitaF && free('tore', 'claudio', 'lino')) ? {} : null, fai: () => {
  take('tore', 'claudio', 'lino'); const p = F(S.partitaF);
  fatto('partita_bar', ['tore', 'claudio', 'lino'], {}, S.partitaF, 'R', 'bar', p.dati.perso
    ? `Al Bar Sport, per due ore, ${N('tore')} e ${N('claudio')} hanno discusso se una partita sospesa per pallone in mare si vince a tavolino. ${cap(N('lino'))}, l'arbitro, ha detto che deciderà il mare: se domani lo restituisce, si finisce.`
    : `Al Bar Sport si è discusso del rigore non dato per due ore. ${cap(N('lino'))}, l'arbitro, ha detto che non l'ha visto perché guardava l'orologio. ${cap(N('tore'))} ha detto che in Marina l'avrebbero fucilato. ${cap(N('lino'))} ha chiesto chi.`, { breve: 'la discussione sulla partita', lite: true, voce: p.dati.perso ? null : ['lino', 'Il rigore c\'era? Io ero di spalle, per imparzialità.'] });
} });

// ---------- OPERATORI (partono da un aggancio) ----------
// la faida: un gradino della scala, o la tregua se c'è un nemico comune fresco, o la ricaduta
op({ id: 'faida', reg: 'R', peso: 6, max: 6, multi: 2, costante: true, fasce: ['mattina', 'mezzogiorno', 'pomeriggio', 'sera'], cerca: () => {
  const c = [];
  for (const d of S.faide) {
    if (d.finita || (d.passiGiorno[S.g] || 0) >= 2 || d.ultimoFi === S.g * 10 + S.fi - 1) continue;
    if (!free(d.a, d.b)) continue;
    if (!d.attiva) { const inn = d.innesco(); if (!inn) continue; c.push({ d, causa: inn.id, modo: 'passo' }); continue; }
    const nem = S.nemici.find(n => n.usato < 2 && n.g >= S.g - 1 && !(n.per || []).includes(d.id) && d.contro.includes(n.k));
    if (d.liv >= 3 && !d.inTregua && nem) c.push({ d, causa: nem.f, modo: 'tregua', nem });
    else if (d.inTregua && !d.ricaduto && d.trFi < S.g * 10 + S.fi - 1) c.push({ d, causa: d.ultimo, modo: 'ricaduta' });
    else if (!d.inTregua && d.liv < d.passi.length) c.push({ d, causa: d.ultimo, modo: 'passo' });
  }
  return c.length ? pick(c) : null;
}, fai: ({ d, causa, modo, nem }) => {
  let r;
  if (modo === 'passo') { r = d.passi[d.liv](); if (!r) return; d.liv++; d.attiva = true; }
  else if (modo === 'tregua') { r = d.tregua(nem.nome); d.inTregua = true; d.trFi = S.g * 10 + S.fi; nem.usato++; (nem.per = nem.per || []).push(d.id); }
  else { r = d.ricaduta(); d.ricaduto = true; d.finita = true; }
  take(d.a, d.b, ...(r.con || []));
  const tipo = r.tipo || (modo === 'passo' ? 'faida_' + d.id + '_' + d.liv : 'faida_' + d.id + '_' + modo);
  const sez = { camillo: 'chiesa', eredita: 'cronaca', bilancia: 'mercato', panca: 'chiesa', vanto: 'bar' }[d.id];
  const f = fatto(tipo, [d.a, d.b, ...(r.con || [])], { faida: d.id, liv: d.liv, modo }, causa, modo === 'tregua' ? 'A' : d.reg, sez, r.testo,
    { voce: r.voce || null, lite: !!r.lite, breve: modo === 'tregua' ? `la tregua ${d.id === 'camillo' ? 'fra Don Ugo e la Cooperativa' : d.id === 'eredita' ? 'Pinna-Porcu' : 'fra ' + Nn(d.a) + ' e ' + Nn(d.b)}` : modo === 'passo' ? BREVI[d.id + '_' + d.liv] : `la fine della tregua ${d.id === 'eredita' ? 'Pinna-Porcu' : 'fra ' + Nn(d.a) + ' e ' + Nn(d.b)}`, succoso: !!r.lite || modo === 'tregua', oggetto: r.oggetto || null });
  if (r.flag) S.flag[r.flag] = f.id;
  if (r.perdi) perdi(r.perdi[0], r.perdi[1], f);
  if (modo === 'passo' && d.liv >= 4 && d.id === 'camillo') nemico(f, 'il chiasso in chiesa', 'chiasso_chiesa');
  d.ultimo = f.id; d.passiGiorno[S.g] = (d.passiGiorno[S.g] || 0) + 1; d.ultimoFi = S.g * 10 + S.fi;
  rel(d.a, d.b, modo === 'tregua' ? 2 : -1);
} });

// la voce: il pettegolezzo passa (tabaccheria, barbiere) e cambia una lettera (errore creativo); poi il paese agisce sulla versione sbagliata
const ERRORE = {
  'la barca': ['la barba', (x) => `Tre persone sono passate a vedere ${N(x)} senza barba. Ce l'aveva.`],
  'la chiave': ['la nave', (x) => `Mezzo vico è andato al molo con la sedia ad aspettare la nave. ${cap(N('gavino'))} c'era già.`],
  'la bilancia': ['la balena', (x) => `Alle undici c'erano quaranta persone sul molo a guardare il mare. ${cap(N('cosimo'))} ha chiesto quanto pesava, per il prezzo.`],
  'il gatto': ['il Garante', (x) => `${cap(N('lino'))} è andato al mercato a chiedere chi aveva pesato il Garante. Gli hanno fatto vedere il gatto. Ha preso nota del peso.`],
  'la panca': ['la banca', (x) => `${cap(N('cosimo'))} ha chiuso la cassa con due giri di chiave e ha passato la mattina seduto sopra.`],
  'la casa': ['la cassa', (x) => `${cap(N('cosimo'))} ha contato la cassa tre volte. Era giusta. L'ha contata una quarta per sicurezza.`],
  'il bancone': ['il barcone', (x) => `${cap(N('ignazio'))} si è presentato al Bar Sport a chiedere la licenza di navigazione del barcone.`],
  'la lettera': ['la lettiera', (x) => `${cap(N('carmela'))} ha portato a ${N('rita')} un sacco di sabbia per il gatto, «per quella cosa che si dice». Rita non ha gatti.`],
  'la cartolina': ['la carabina', (x) => `${cap(N('lino'))} è passato da ${N('nives')} a chiedere della carabina arrivata dall'Argentina. Ha letto la cartolina. Si è commosso. Non ha fatto verbale.`],
  'la macchina': ['la macina', (x) => `Due vecchi sono passati dal Belga a chiedere se macina anche il grano duro.`],
  'i soldi': ['i sordi', (x) => `Per tutto il pomeriggio a ${N(x)} hanno parlato ad alta voce, scandendo. Non ha capito perché.`],
  'il vassoio': ['il vescovo', (x) => `${N('ugo')} si è cambiato la tonaca e ha aspettato il vescovo sul sagrato fino alle sei.`],
  'la campana': ['la cambiale', (x) => `${cap(N('mario'))} si è offerto di scontare la cambiale della parrocchia al dieci per cento.`],
  'la cornice': ['la camicia', (x) => `${cap(N('nives'))}, che è sarta, ha ricevuto due ordini per «la camicia dello zio». Li ha fatti pagare in anticipo.`],
  'il cane': ['il pane', (x) => `Davanti al panificio si è fatta la fila: si diceva che il pane lo dava il testamento.`],
  'la chiave della': ['la nave', (x) => `Mezzo vico è andato al molo con la sedia.`],
  'il camioncino': ['il canoncino', (x) => `${cap(N('lino'))} è andato a controllare il cannone della Cooperativa. Era il camioncino. Ha controllato le gomme.`],
  'il molo': ['il mulo', (x) => `${cap(N('bonaria'))} ha detto che il mulo l'aveva suo padre, e che era più coraggioso di tutti e due.`],
};
op({ id: 'voce', reg: 'A', peso: 3, max: 2, fasce: ['mattina', 'mezzogiorno', 'pomeriggio'], cerca: () => {
  const fs = S.fatti.filter(f => f.succoso && !f.gossip && f.g >= S.g - 1 && f.oggetto);
  const hub = ['pina', 'claudio'].filter(h => free(h)); if (!fs.length || !hub.length) return null;
  return { f: pick(fs.slice(-4)), hub: pick(hub) };
}, fai: ({ f, hub }) => {
  f.gossip = true; take(hub);
  const tramite = pick(freeOf(GENTE.filter(g => !f.chi.includes(g) && g !== hub)).slice(0, 3)); if (!tramite) return;
  take(tramite);
  const er = ERRORE[f.oggetto];
  const soggetto = f.chi.find(c => P[c] && c !== 'gab') || f.chi[0];
  const dove = hub === 'pina' ? 'in tabaccheria' : 'dal barbiere';
  if (er && chance(.85)) {
    const t = `La storia ${pr('di', f.breve)} è partita ${dove}, da ${N(hub)}, è passata per ${N(tramite)} ed è arrivata al porto con ${er[0]} al posto ${pr('di', f.oggetto)}.`;
    const g = fatto('voce', [hub, tramite, soggetto], { da: f.oggetto, a: er[0] }, f.id, 'A', 'voci', t, { breve: `la voce de${er[0].startsWith('il') ? 'l ' + er[0].slice(3) : 'lla ' + er[0].slice(3)}` });
    S.voci.push({ f: g.id, er, x: soggetto, g: S.g });
  } else {
    fatto('voce', [hub, tramite, soggetto], {}, f.id, 'R', 'voci', V('voce_esatta', [
      () => `${cap(N(hub))} ha raccontato ${dove} la storia ${pr('di', f.breve)}. Quando è arrivata al porto era esatta. Non ci ha creduto nessuno.`,
      () => `La storia ${pr('di', f.breve)} ha fatto il giro del paese in ventidue minuti, da ${N(hub)} a ${N(tramite)} e da lì dappertutto. ${cap(N(soggetto))} l'ha saputa per ultim${o(soggetto)}.`,
    ]), { breve: `la voce ${pr('su', f.breve)}` });
  }
} });
op({ id: 'voce_effetto', reg: 'A', peso: 4, max: 2, fasce: ['mezzogiorno', 'pomeriggio', 'sera'], cerca: () => {
  const v = S.voci.find(v => !v.fatto && (v.g < S.g || S.fatti.find(f => f.id === v.f).fascia !== fascia())); return v || null;
}, fai: (v) => {
  v.fatto = true;
  const t = v.er[1](v.x);
  const chi = ['lino', 'cosimo', 'ignazio', 'ugo', 'mario', 'nives', 'bonaria', 'carmela', 'gavino'].filter(c => t.includes(Nn(c)) || t.includes(N(c)));
  fatto('voce_effetto', [v.x, ...chi], {}, v.f, 'A', 'voci', t, { breve: `quelli che ci hanno creduto (${v.er[0]})` });
} });

// il forestiero: solo lui si stupisce delle regole surreali; la terza volta smette
op({ id: 'forestiero', reg: 'S', peso: 3, max: 1, fasce: ['mattina', 'mezzogiorno', 'pomeriggio', 'sera'], cerca: () => {
  if (!S.arrivoF || !free('belga')) return null;
  const f = ultimo(f => f.reg === 'S' && f.g >= S.g - 1 && !f.chiesto && ['campanile', 'restituzione', 'statua', 'sogni', 'gabbiano', 'furto', 'eco', 'non_restituito', 'estrazione'].includes(f.tipo));
  return f ? { f } : null;
}, fai: ({ f }) => {
  f.chiesto = true; S.belgaChiede++; take('belga');
  if (S.belgaChiede >= 3) {
    fatto('forestiero', ['belga'], {}, f.id, 'S', 'cronaca', `${cap(N('belga'))}, stavolta, non ha chiesto niente ${pr('di', f.breve)}. Ha detto «ah, sarà per ieri» e ha pagato il caffè. Al Bar Sport dicono che è tornato davvero.`, { breve: 'il Belga che non chiede più' });
    return;
  }
  const R1 = {
    campanile: () => ['pina', `«Perché il campanile ha battuto ${F(f.id).dati.colpi}?» ha chiesto ${N('belga')}. ${cap(N('pina'))}: «Per ieri. Una era sua.»`],
    restituzione: () => ['pasquale', `«Il mare vi ridà le cose?» ha chiesto ${N('belga')}. ${cap(N('pasquale'))}: «Quelle perse. Quelle buttate se le tiene, come tutti.»`],
    non_restituito: () => ['pasquale', `«E se una cosa la butti?» ha chiesto ${N('belga')}. ${cap(N('pasquale'))}: «Allora non la volevi. Il mare non è scemo.»`],
    statua: () => ['bonaria', `«Perché guardano tutti casa sua?» ha chiesto ${N('belga')}. ${cap(N('bonaria'))}: «Perché la guarda il santo. Non fare domande, che poi guarda te.»`],
    sogni: () => ['ignazio', `«I sogni si denunciano?» ha chiesto ${N('belga')}. ${cap(N('ignazio'))}: «Entro le dieci. Dopo è sogno arretrato, con la marca da bollo.»`],
    gabbiano: () => ['gino', `«Il gabbiano ha la tessera?» ha chiesto ${N('belga')}. ${cap(N('gino'))}: «Residente dal '79. Paga più tasse di te.»`],
    furto: () => ['claudio', `«Ma i bambini possono rivendere la roba del mare?» ha chiesto ${N('belga')}. ${cap(N('claudio'))}: «No. Ma sono gemelli: non si sa mai quale dei due.»`],
    eco: () => ['pasquale', `«Chi ha parlato?» ha chiesto ${N('belga')} nella nebbia. ${cap(N('pasquale'))}: «Nessuno. È roba di ieri, non ci badare.»`],
    estrazione: () => ['pina', `«Ma se esce sempre il più sognato, perché non vincete tutti?» ha chiesto ${N('belga')}. ${cap(N('pina'))}: «Perché i sogni non si scelgono. Lei cosa ha sognato?» Lui non se lo ricordava.`],
  };
  const [chi, t] = (R1[f.tipo] || R1.campanile)();
  fatto('forestiero', ['belga', chi], {}, f.id, 'S', 'cronaca', t, { breve: `il Belga che chiede del${f.tipo === 'statua' ? 'la statua' : f.tipo === 'campanile' ? ' campanile' : f.tipo === 'sogni' ? 'l\'Ufficio Sogni' : ' mare'}` });
} });

// il Belga e Nives: la storia di ventidue anni (generazioni), con lo stesso passo della faida
const CORTEGGIO = [
  (c) => ({ testo: `${cap(N('belga'))} è passato tre volte sotto le finestre di ${N('nives')} suonando il clacson della macchina. Alla terza ${N('nives')} ha aperto e ha buttato giù un secchio d'acqua. Ha preso la macchina.`, voce: ['belga', 'Mi ha risposto! Ventidue anni, e mi ha risposto!'] }),
  (c) => ({ testo: `${cap(N('belga'))} ha incaricato ${N('mario')} di fare da mediatore con ${N('nives')}. Prezzo: il dieci per cento. «Di cosa?» ha chiesto il Belga. «Si vedrà» ha detto Sciabica.`, con: ['mario'] }),
  (c) => ({ testo: `${cap(N('nives'))} ha buttato in mare, dal molo, le lettere che ${N('belga')} le aveva scritto dal Belgio fra il '64 e il '66. Erano undici. Lui ha guardato dalla macchina.`, butta: ['le lettere del Belga', 'nives', 'belga'] }),
  (c) => S.cartolinaF ? ({ testo: `Dopo la cartolina da Buenos Aires, ${N('nives')} è uscita di casa per la prima volta in tre giorni. Ha attraversato la piazza, è passata davanti alla macchina del Belga e non l'ha guardata. L'ha guardata dopo, dal vetro del bar.`, causa: S.cartolinaF }) : null,
  (c) => S.flag.monique ? ({ testo: `${cap(N('nives'))} ha saputo della macchina del cognato di Monique. Ha riso. ${cap(N('elio'))} dice che è la prima volta dal 1962. ${cap(N('belga'))} ha riso anche lui, ma dopo.`, causa: S.flag.monique, voce: ['nives', 'Ventidue anni in Belgio, e la macchina è del cognato!'] }) : null,
];
op({ id: 'corteggio', reg: 'R', peso: 3, max: 1, fasce: ['mattina', 'pomeriggio', 'sera'], cerca: () => {
  if (!S.arrivoF || !free('belga', 'nives')) return null; S.cort = S.cort || { i: 0, ultimo: S.arrivoF };
  if (S.cort.i >= CORTEGGIO.length || S.cort.fi === S.g * 10 + S.fi - 1) return null;
  return S.cort;
}, fai: (c) => {
  let r = CORTEGGIO[c.i](c); while (!r && c.i < CORTEGGIO.length - 1 && c.i === 3 && !S.cartolinaF) { return; }
  if (!r) return;
  c.i++; take('belga', 'nives', ...(r.con || []));
  const f = fatto('corteggio_' + c.i, ['belga', 'nives', ...(r.con || [])], {}, r.causa || c.ultimo, c.i === 5 ? 'A' : 'R', 'cronaca', r.testo, { voce: r.voce || null, breve: ['il clacson del Belga', 'il mediatore Sciabica', 'le lettere buttate in mare', 'Nives in piazza', 'la risata di Nives'][c.i - 1], succoso: c.i === 3, oggetto: c.i === 3 ? 'la lettera' : null });
  if (r.butta) S.buttate.push({ ogg: r.butta[0], di: r.butta[1], attende: r.butta[2], f: f.id, g: S.g });
  if (c.i === 1) { perdi('la chiave della macchina', 'belga', f, 'nel secchio'); }
  c.ultimo = f.id; c.fi = S.g * 10 + S.fi;
} });

// la cabina: l'unico telefono pubblico; la vita privata entra in scena (Dario che vuole partire, il Belga che chiama Charleroi)
op({ id: 'cabina', reg: 'R', peso: 2.5, max: 1, maxRun: 2, fasce: ['mezzogiorno', 'pomeriggio', 'sera'], cerca: () => {
  const c = [];
  if (!S.flag.dario && free('dario', 'wanda')) c.push('dario');
  if (S.arrivoF && !S.flag.monique && free('belga') && S.g >= 2) c.push('belga');
  return c.length ? pick(c) : null;
}, fai: (k) => {
  const coda = freeOf(['teresa', 'iolanda', 'loredana', 'gavino', 'claudio', 'carmela', 'wanda']).filter(x => x !== k).slice(0, 2); take(k, ...coda);
  if (k === 'dario') {
    const f = fatto('cabina', ['dario', 'wanda', ...coda], { desiderio: P.dario.vuole }, null, 'R', 'cronaca', `Alla cabina della piazza ${N('dario')} ha chiamato un cugino a Stoccarda per un posto in fabbrica. In coda c'erano ${coda.map(N).join(' e ')}${coda.includes('wanda') ? '' : `, poi è arrivata anche ${N('wanda')}, sua madre`}. Ha sentito «parto lunedì».`, { breve: 'la telefonata di Dario per Stoccarda', succoso: true, voce: ['wanda', 'Lunedì?! Lunedì c\'è il ragù! Parti martedì!'] });
    S.flag.dario = f.id;
  } else {
    const f = fatto('cabina', ['belga', ...coda], {}, S.arrivoF, 'R', 'cronaca', `Alla cabina ${N('belga')} ha chiamato Charleroi. In coda c'erano ${coda.map(N).join(' e ')}. Hanno sentito: «Monique, la macchina di tuo cognato te la riporto, giuro, non la sto usando.» Era parcheggiata lì davanti.`, { breve: 'la telefonata del Belga a Monique', succoso: true, oggetto: 'la macchina' });
    S.flag.monique = f.id;
  }
} });
op({ id: 'consiglio', reg: 'R', peso: 2.5, max: 1, maxRun: 1, fasce: ['pomeriggio', 'sera'], cerca: () => (S.flag.dario && S.arrivoF && free('belga', 'dario')) ? {} : null, fai: () => {
  take('belga', 'dario');
  fatto('consiglio', ['belga', 'dario'], {}, S.flag.dario, 'R', 'bar', `Al Bar Sport ${N('belga')} ha spiegato a ${N('dario')} per un'ora che in Belgio si sta benissimo, che si guadagna, che c'è tutto. E che lui non ci torna per niente al mondo.`, { breve: 'i consigli del Belga a Dario', voce: ['belga', 'Vai, vai! Io ci ho lasciato i polmoni e una moglie. Vai!'] });
} });
op({ id: 'posto', reg: 'A', peso: 2, max: 1, maxRun: 1, fasce: ['mattina', 'pomeriggio'], cerca: () => (S.flag.dario && free('wanda', 'renato', 'ignazio')) ? {} : null, fai: () => {
  take('wanda', 'renato', 'ignazio');
  fatto('posto', ['wanda', 'renato', 'ignazio'], {}, S.flag.dario, 'A', 'comune', `${cap(N('wanda'))} è andata ${pr('da', N('renato'))} a chiedere un posto in Comune per ${N('dario')}, così non parte. Il Delegato ha detto che un posto c'è: quello di ${N('ignazio')}. ${cap(N('ignazio'))} ha detto che è libero quando muore lui, e che non ha fretta.`, { breve: 'il posto in Comune per Dario', voce: ['ignazio', 'Il posto c\'è. Sono io. Tra quarant\'anni ripassi.'] });
} });

// il binomio fantastico: una cosa della vita e un'istituzione lontana (il precedente del gabbiano lo rende normale)
const BINOMI = [
  { ogg: 'un polpo di sei chili', chi: 'nello', ist: 'ignazio', sez: 'comune', t: () => `${cap(N('nello'))} ha chiesto all'Anagrafe la residenza per il polpo di sei chili pescato stamattina, «così se scappa me lo riportano». ${cap(N('ignazio'))} ha risposto che manca il certificato di nascita del polpo.${S.flag.tessera ? ' Nello ha fatto notare che il gabbiano ce l\'ha. Ignazio ha detto che il gabbiano è nato qui.' : ''}`, voce: ['nello', 'Il gabbiano sì e il polpo no? Il polpo almeno non ruba!'] },
  { ogg: 'i soldi della vincita', chi: () => S.vincitore, ist: 'ugo', sez: 'chiesa', t: () => `${cap(N(S.vincitore))} ha chiesto a ${N('ugo')} di benedire i soldi della vincita, «che non finiscano». ${N('ugo')} li ha benedetti e se n'è tenuti il dieci per cento per la candela. ${cap(N('mario'))} ha protestato: il dieci per cento è suo.`, con: ['mario'] },
  { ogg: 'il cannolo del 1971', chi: 'grazia', ist: 'renato', sez: 'comune', t: () => `${cap(N('grazia'))} ha scritto al Delegato per far dichiarare monumento il cannolo in vetrina al Bar Sport dal 1971. ${cap(N('renato'))} ha risposto che servono tre testimoni di quando era fresco. ${cap(N('bonaria'))} si è offerta: lei è tutti e tre.`, con: ['bonaria'] },
  { ogg: 'il cane di zio Raimondo', chi: 'bonaria', ist: 'ignazio', sez: 'comune', t: () => `${cap(N('bonaria'))} è andata in Comune a chiedere se la casa sul molo si può intestare al cane di zio Raimondo, «che era l'unico che gli voleva bene davvero». ${cap(N('ignazio'))} ha detto di sì, purché il cane firmi.`, voce: ['bonaria', 'Firma meglio lui di tutti e due i nipoti messi insieme.'] },
];
op({ id: 'binomio', reg: 'A', peso: 2.5, max: 1, fasce: ['mattina', 'pomeriggio'], cerca: () => {
  const c = [];
  for (const b of BINOMI) {
    if (b.fatto) continue; const chi = typeof b.chi === 'function' ? b.chi() : b.chi; if (!chi || !free(chi, b.ist)) continue;
    let causa = null;
    if (b.ogg === 'un polpo di sei chili') { const x = S.oggettiNuovi.find(x => x.ogg === b.ogg); if (x) causa = x.f; }
    if (b.ogg === 'i soldi della vincita' && S.vincitaF && S.g === 3) causa = S.vincitaF;
    if (b.ogg === 'il cannolo del 1971' && S.flag.cannolo1) causa = S.flag.cannolo1;
    if (b.ogg === 'il cane di zio Raimondo') { const d = S.faide.find(d => d.id === 'eredita'); if (d.liv >= 3) causa = d.ultimo; }
    if (causa) c.push({ b, chi, causa });
  }
  return c.length ? pick(c) : null;
}, fai: ({ b, chi, causa }) => {
  b.fatto = true; take(chi, b.ist, ...(b.con || []));
  fatto('binomio', [chi, b.ist, ...(b.con || [])], { ogg: b.ogg }, causa, 'A', b.sez, b.t(), { breve: `${b.ogg} e ${b.ist === 'ugo' ? 'la chiesa' : 'il Comune'}`, voce: b.voce || null });
} });

// il cannolo in vetrina dal 1971 (oggetto-monumento, running gag a tre tempi)
op({ id: 'cannolo', reg: 'A', peso: 2, max: 1, fasce: ['mattina', 'mezzogiorno', 'pomeriggio'], cerca: () => {
  const st = S.flag.cannoloSt || 0;
  if (st === 0 && S.arrivoF && free('belga', 'gino')) return { st, chi: 'belga' };
  if (st === 1 && S.g >= 2 && free('ciccio', 'gino') && S.ciccio >= 1) return { st, chi: 'ciccio' };
  if (st === 2 && free('gino') && S.g === 3) return { st, chi: 'gino' };
  return null;
}, fai: ({ st, chi }) => {
  take(chi, 'gino'); S.flag.cannoloSt = st + 1;
  if (st === 0) { const f = fatto('cannolo', ['belga', 'gino'], {}, S.arrivoF, 'A', 'bar', `${cap(N('belga'))} ha chiesto di comprare il cannolo in vetrina al Bar Sport. ${cap(N('gino'))} ha detto che è lì dal 1971 e non è in vendita: è in mostra.`, { breve: 'il cannolo del \'71 non in vendita', voce: ['gino', 'È del \'71! Lo guardi e basta, come in Belgio i quadri!'] }); S.flag.cannolo1 = f.id; }
  else if (st === 1) { const cl = ultimo(f => f.tipo === 'lazzo'); const f = fatto('cannolo', ['ciccio', 'gino'], {}, (cl || F(S.flag.cannolo1)).id, 'A', 'bar', `${cap(N('ciccio'))}, che fra tre padroni non aveva pranzato, ha mangiato il cannolo in vetrina dal 1971. ${cap(N('gino'))} ha chiuso il bar per lutto un'ora. ${cap(N('ciccio'))} dice che era buono.`, { breve: 'il cannolo mangiato da Ciccio', lite: true, succoso: true, oggetto: 'il cannolo', voce: ['ciccio', 'Avevo fame! E comunque era buono, il \'71 era un buon anno!'] }); S.flag.cannolo2 = f.id; }
  else fatto('cannolo', ['gino', 'bonaria'], {}, S.flag.cannolo2, 'A', 'bar', `In vetrina al Bar Sport, al posto del cannolo, adesso c'è il piattino vuoto con un cartellino: «Qui c'era il cannolo. 1971-1986». ${cap(N('bonaria'))} ha detto che fresco era meglio.`, { breve: 'il piattino del cannolo' });
} });

// il lazzo di Ciccio: tre padroni, le cose al posto sbagliato; la terza volta cade in porto (regola del tre)
op({ id: 'lazzo', reg: 'A', peso: 2.5, max: 1, maxRun: 3, fasce: ['mattina', 'mezzogiorno', 'pomeriggio'], cerca: () => {
  if (!free('ciccio')) return null;
  const causa = ultimo(f => f.g === S.g && ['mercato', 'legna', 'faida_camillo_4'].includes(f.tipo));
  return causa ? { causa } : null;
}, fai: ({ causa }) => {
  S.ciccio++; take('ciccio');
  const posta = S.ipotesi[S.g] && S.ipotesi[S.g].id === 'posta';
  if (S.ciccio >= 3 && !S.flag.cicciocaduto) {
    S.flag.cicciocaduto = true;
    const f = fatto('caduta', ['ciccio'], {}, causa.id, 'A', 'porto', `Terza consegna della giornata per ${N('ciccio')}: le cassette di ${N('cosimo')}, i ceri di ${N('ugo')} e la cartella ${pr('di', N('aldo'))} tutte insieme. È caduto in porto. Sono stati ripescati lui e i ceri. La cartella no.`, { breve: 'Ciccio caduto in porto', voce: ['ciccio', 'La cartella è persa! Ma l\'ho persa io, quindi torna!'], succoso: true, oggetto: 'il vassoio' });
    perdi('la cartella del comitato del falò', 'aldo', f); return;
  }
  const t = V('lazzo', [
    () => `${cap(N('ciccio'))}, garzone di ${N('gino')}, di ${N('cosimo')} e del comitato del falò, ha portato le cassette di triglie in sagrestia e i ceri al mercato. ${cap(N('assunta'))} ha venduto due ceri a peso.`,
    () => `${cap(N('ciccio'))} ha portato i caffè del Bar Sport al Comune e la fattura di ${N('cosimo')} al Bar Sport. ${cap(N('gino'))} l'ha pagata.`,
    () => `${cap(N('ciccio'))} ha consegnato la legna del falò al panificio. Il panettiere l'ha usata. ${N('ugo')} dice che il pane di oggi è un po' benedetto.`,
    () => posta ? `${cap(N('ciccio'))}, che oggi porta anche la posta, ha infilato le bollette nelle cassette del pesce. ${cap(N('cosimo'))} ha venduto una bolletta della luce insieme a un chilo di seppie.` : `${cap(N('ciccio'))} ha portato le seppie di ${N('cosimo')} alla maestra e i quaderni corretti al mercato. Il compito di Piero Cossu è stato venduto con mezzo chilo di triglie.`,
  ]);
  fatto('lazzo', ['ciccio'], {}, causa.id, 'A', 'cronaca', t, { breve: 'le consegne sbagliate di Ciccio' });
} });

// il gabbiano ruba a chi è distratto da una lite (seconda conseguenza) e lascia cadere in mare (domani il mare restituisce)
op({ id: 'gabbiano_ruba', reg: 'S', peso: 2.5, max: 1, maxRun: 2, fasce: ['mezzogiorno', 'pomeriggio'], cerca: () => {
  const l = ultimo(f => f.lite && f.g === S.g && !f.gabbianato && f.chi.length); if (!l) return null;
  if (!S.flag.letteraMarco && S.g <= 2 && free('marco')) return { l, chi: 'marco' };
  const chi = l.chi.find(c => P[c] && c !== 'gab' && !['piero', 'paolo'].includes(c)); return chi ? { l, chi } : null;
}, fai: ({ l, chi }) => {
  l.gabbianato = true;
  if (chi === 'marco') {
    S.flag.letteraMarco = true;
    const f = fatto('gabbiano', ['gab', 'marco'], {}, l.id, 'S', 'cronaca', `Mentre tutti guardavano ${l.breve}, ${N('gab')} ha preso dalla tasca di ${N('marco')} una lettera piegata in quattro e l'ha lasciata cadere in mare dal tetto del Comune. Marco ha detto che non era niente. Era per ${N('rita')}.`, { breve: 'la lettera rubata dal gabbiano', succoso: true, oggetto: 'la lettera' });
    perdi('la lettera di Marco per Rita', 'marco', f); return;
  }
  const ogg = { tore: 'il casco da palombaro', bruno: 'la cazzuola', franco: 'il metro', assunta: 'il grembiule', carmela: 'il fazzoletto', teresa: 'il termos', iolanda: 'il rosario di madreperla', ugo: 'la stola', efisio: 'il fischietto', belga: 'il cappello belga', gino: 'lo strofinaccio', lino: 'il berretto', ciccio: 'il vassoio', bonaria: 'la dentiera', nives: 'il ditale', marco: 'il pettine', cosimo: 'il portafoglio' }[chi] || 'il cappello';
  const f = fatto('gabbiano', ['gab', chi], { ogg }, l.id, 'S', 'cronaca', V('gab', [
    () => `Mentre tutti guardavano ${l.breve}, ${N('gab')} è sceso e si è preso ${ogg} di ${N(chi)}. L'ha lasciat${ogg.startsWith('il') || ogg.startsWith('lo') ? 'o' : 'a'} cadere in mare. Si aspetta domattina.`,
    () => `Nel trambusto ${pr('di', l.breve)}, ${N('gab')} ha portato via ${ogg} ${pr('a', N(chi))} e l'ha lasciat${ogg.startsWith('il') || ogg.startsWith('lo') ? 'o' : 'a'} cadere in mare dal tetto del Comune. ${cap(N(chi))} ha detto soltanto: «Allora domani.»`,
  ]), { breve: `${ogg} di ${Nn(chi)} preso dal gabbiano`, oggetto: null });
  perdi(`${ogg}`, chi, f);
} });

// la nebbia ripete al molo le frasi di ieri (regola surreale 5): il richiamo (callback) fatto meccanismo
op({ id: 'eco', reg: 'S', peso: 5, max: 1, fasce: ['mattina', 'mezzogiorno'], giorni: [2, 3], cerca: () => {
  if (S.meteo[S.g] !== 'nebbia') return null;
  const cit = S.citazioni[S.g - 1].filter(c => c.su && free(c.su) && P[c.su] && c.su !== c.chi); return cit.length ? pick(cit) : null;
}, fai: (c) => {
  take(c.su);
  fatto('eco', [c.chi, c.su], {}, c.f, 'S', 'porto', `Con la nebbia, al molo si è risentita la frase di ieri di ${N(c.chi)}: «${c.riga}» L'ha sentita ${N(c.su)}, che passava. ${cap(N(c.chi))} dice che con la nebbia non vale.`, { breve: `l'eco della frase di ${Nn(c.chi)}`, lite: true });
} });

// la scopa al Bar Sport (più gente al bar se il mare è chiuso): Fausto e il settebello, a gradini
op({ id: 'scopa', reg: 'R', peso: 2.5, max: 1, maxRun: 3, fasce: ['mattina', 'pomeriggio', 'sera'], cerca: () => {
  const tav = ['sergio', 'fausto', 'angelo', 'pasquale']; if (!free(...tav)) return null;
  if (fascia() === 'mattina' && !S.flag['albar' + S.g]) return null;
  return { causa: S.flag['albar' + S.g] ? S.pescaF : null, tav };
}, fai: ({ causa, tav }) => {
  take(...tav); S.scopa = (S.scopa || 0) + 1;
  const T = [
    () => [`Al tavolo della scopa ${N('sergio')} ha accusato ${N('fausto')} di avere il settebello nel cappello. ${cap(N('fausto'))} si è tolto il cappello: niente. Era nella calza.`, ['fausto', 'Nella calza non vale! La calza è privata!'], true],
    () => [`Scopa, seconda partita: ${N('angelo')} si è addormentato con le carte in mano. ${cap(N('fausto'))} gliele ha guardate. ${cap(N('sergio'))} ha guardato ${N('fausto')}. ${cap(N('pasquale'))} ha guardato il mare.`, ['sergio', 'Io vinco una partita prima di morire! Non questa, va be\'.'], false],
    () => [`Al tavolo della scopa ha vinto ${N('sergio')}, per la prima volta dal 1979. ${cap(N('fausto'))} gli ha fatto i complimenti e ha chiesto la rivincita. Il settebello stavolta era vero: l'ha controllato ${N('gino')}.`, ['sergio', 'Ho vinto! Adesso posso morire! …Domani, però.'], false],
  ];
  const [t, voce, l] = T[Math.min(S.scopa - 1, 2)]();
  fatto('scopa', tav, {}, causa, 'R', 'bar', t, { breve: 'la scopa al Bar Sport', voce, lite: l, succoso: l, oggetto: l ? 'il cappello' : null });
} });
ERRORE['il cappello'] = ['il coltello', (x) => `${cap(N('lino'))} è passato al Bar Sport per il coltello. Ha sequestrato il cappello di Fausto Fois. Il settebello era ancora dentro.`];

// il Tecnico spiega al bar le catene con la causa sbagliata (Benni + Qud: la cronaca di parte); la Gazzetta corregge
op({ id: 'tecnico', reg: 'A', peso: 3, max: 1, fasce: ['pomeriggio', 'sera'], cerca: () => {
  if (!free('aldo')) return null;
  const fs = oggi(f => !f.nascosto && f.hop >= 2 && (f.succoso || f.lite) && !['tecnico', 'forestiero', 'gavino', 'bonaria'].includes(f.tipo)); if (!fs.length) return null;
  const f = fs.sort((a, b) => b.hop - a.hop)[0], ch = catena(f.id);
  const fuori = S.fatti.filter(x => !ch.includes(x) && !x.nascosto && x.g >= S.g - 1 && x.tipo !== 'tecnico');
  const capri = [{ breve: 'il Garante' }, { breve: 'la luna' }, { breve: 'i gemelli Cossu' }, { breve: 'il Belgio' }, { breve: 'la televisione a colori' }];
  return { f, ch, sbagliata: chance(.5) && fuori.length ? pick(fuori) : pick(capri) };
}, fai: ({ f, ch, sbagliata }) => {
  take('aldo');
  const vera = ch[0];
  fatto('tecnico', ['aldo'], { vera: vera.id, sbagliata: sbagliata.id }, f.id, 'A', 'bar', V('tecnico', [
    () => `Al Bar Sport ${N('aldo')} ha spiegato che ${f.breve} è tutta colpa ${pr('di', sbagliata.breve)}. Ha fatto anche il disegno sul tovagliolo. (Alla redazione risulta che sia cominciato tutto con ${vera.breve}.)`,
    () => `${cap(N('aldo'))}, al bancone: «${cap(f.breve)}? Ve lo dico io: è per ${sbagliata.breve}. Se me lo dicevate prima, lo evitavamo.» (Era per ${vera.breve}.)`,
    () => `Secondo ${N('aldo')}, che lo ha spiegato a tre tavoli, ${f.breve} viene ${pr('da', sbagliata.breve)}. Il tavolo dei pescatori ha detto che viene ${pr('da', vera.breve)}. Il ragioniere ha detto che è la stessa cosa.`,
  ]), { breve: 'la spiegazione del ragioniere' });
} });

// zia Bonaria: era già successo nel '23, ma diverso (la memoria come callback lungo)
op({ id: 'bonaria', reg: 'R', peso: 1.5, max: 1, maxRun: 2, fasce: ['mezzogiorno', 'pomeriggio', 'sera'], cerca: () => {
  if (!free('bonaria')) return null; const f = ultimo(f => f.g === S.g && f.succoso && f.hop >= 1 && !['scopa', 'giocata', 'voce', 'cabina'].includes(f.tipo) && !f.bonaria && !f.chi.includes('bonaria')); return f ? { f } : null;
}, fai: ({ f }) => {
  f.bonaria = true; take('bonaria');
  fatto('bonaria', ['bonaria'], {}, f.id, 'R', 'bar', V('bonaria', [
    () => `${cap(N('bonaria'))}, saputo ${pr('di', f.breve)}, ha detto che nel '23 era già successo uguale. Ma con un mulo.`,
    () => `${cap(pr('su', f.breve))} ${N('bonaria')} ha detto che nel '23 era peggio, perché c'era il podestà vero e nessuno aveva le scarpe. Poi ha chiesto chi era morto.`,
    () => `${cap(N('bonaria'))} ha ascoltato la storia ${pr('di', f.breve)} fino in fondo, poi ha detto: «Nel '23 per una cosa così ci si sposava.»`,
  ]), { breve: 'il commento di zia Bonaria', voce: null });
} });

// Gavino, mai invitato: regola del tre e rovescio di status
op({ id: 'gavino', reg: 'R', peso: 2, max: 1, maxRun: 3, fasce: ['mattina', 'pomeriggio', 'sera'], cerca: () => {
  if (!free('gavino')) return null;
  const f = ultimo(f => f.g === S.g && (['votazione', 'comitato', 'faida_vanto_3', 'faida_camillo_4', 'benedizione'].includes(f.tipo) || f.tipo === 'caduta' && f.chi.includes('tore')) && !f.gav);
  return f ? { f } : null;
}, fai: ({ f }) => {
  f.gav = true; S.gavino++; take('gavino');
  const t = S.segnato[S.g] === 'gavino'
    ? `Da quando la statua guarda casa sua, ${N('gavino')} è invitato a tutto. Oggi ${pr('a', f.breve)}, a due pranzi e a un battesimo di gente che non conosce. È andato a tutto.`
    : [null, `${cap(N('gavino'))} non era stato invitato ${pr('a', f.breve)}. È venuto lo stesso. Ha portato le paste.`,
      `${cap(N('gavino'))} non era invitato neanche ${pr('a', f.breve)}. È arrivato per primo, e ha tenuto i posti agli altri.`,
      `Per ${f.breve}, per errore, ${N('gavino')} è stato invitato. Non è venuto: pensava fosse uno scherzo. È rimasto a casa in giacca buona.`][Math.min(S.gavino, 3)];
  fatto('gavino', ['gavino'], { volta: S.gavino }, f.id, S.segnato[S.g] === 'gavino' ? 'S' : 'R', 'cronaca', t, { breve: 'Gavino non invitato' });
} });

// il segnato: chi la statua guarda viene trattato in modo diverso (la regola surreale produce effetti realistici)
op({ id: 'segnato', reg: 'S', peso: 3, max: 1, fasce: ['mattina', 'mezzogiorno', 'pomeriggio'], giorni: [2, 3], cerca: () => {
  const x = S.segnato[S.g]; if (!x || x === 'gavino' || !free(x) || S.flag['segn' + S.g]) return null;
  const sf = ultimo(f => f.tipo === 'statua' && f.g === S.g); return sf ? { x, sf } : null;
}, fai: ({ x, sf }) => {
  S.flag['segn' + S.g] = true; take(x);
  const T = {
    gab: () => `Da stamattina tutti salutano ${N('gab')}. ${cap(N('gino'))} gli ha lasciato un pezzo di focaccia sul davanzale. ${cap(N('renato'))} gli ha fatto il saluto militare, poi ha detto che si stava grattando.`,
    cosimo: () => `Siccome la statua lo guarda, ${N('cosimo')} oggi ha pagato il pesce il giusto. I pescatori non l'hanno riconosciuto. Due hanno contato i soldi davanti a lui.`,
    lino: () => `Guardato dal santo, ${N('lino')} ha scritto oggi il suo primo verbale in undici anni. A se stesso, per divisa in disordine.`,
    belga: () => `Da quando il santo guarda casa sua, ${N('belga')} viene trattato come un parente: tutti gli chiedono soldi in prestito.`,
  };
  const t = (T[x] || (() => V('segnato', [
    () => `Siccome la statua guarda casa sua, oggi a ${N(x)} hanno fatto tre regali: un uovo, un pacchetto di sigarette e un consiglio. Ha accettato l'uovo.`,
    () => `${cap(N(x))}, guardat${o(x)} dal santo, è stat${o(x)} servit${o(x)} per prim${o(x)} al mercato, al bar e dal barbiere. Dal barbiere non c'era andat${o(x)}: l'hanno fatt${o(x)} sedere lo stesso.`,
    () => `Per tutto il giorno nessuno ha contraddetto ${N(x)}. Alla sera ${N(x)} ha detto che due più due fa cinque, per prova. Gli hanno dato ragione.`,
  ])))();
  fatto('segnato', [x], {}, sf.id, 'S', 'cronaca', t, { breve: `il trattamento di ${Nn(x)}` });
} });

// il voto al bar per la casa di zio Raimondo («lo decida il paese»)
op({ id: 'votazione', reg: 'A', peso: 3.5, max: 1, maxRun: 1, fasce: ['pomeriggio', 'sera'], cerca: () => {
  const d = S.faide.find(d => d.id === 'eredita'); if (!d.attiva || !free('gino', 'franco', 'bruno', 'aldo')) return null; return { d };
}, fai: ({ d }) => {
  take('gino', 'franco', 'bruno', 'aldo');
  const vot = GENTE.filter(g => !['franco', 'bruno', 'marco', 'rita', 'teresa', 'piero', 'paolo', 'gavino'].includes(g));
  let a = 0, b = 0; for (const v of vot) { const r = (P[v].rel.franco || 0) - (P[v].rel.bruno || 0) + (R() - .5) * 2; if (r > 0) a++; else b++; }
  if (Math.abs(a - b) > 3) { const m = a > b ? -2 : 2; a += m; b -= m; }
  const pari = a === b, gab = S.flag.tessera;
  let t = `Al Bar Sport si è votato per la casa di zio Raimondo, come chiede il testamento. ${N('aldo')} ha contato: ${N('franco')} ${a}, ${N('bruno')} ${b}.`;
  if (pari && gab) t += ` Pareggio. Ha deciso il voto del Comandante, tessera 41, che ha beccato la scheda di ${a % 2 ? 'Franco' : 'Bruno'}. ${a % 2 ? 'Bruno' : 'Franco'} ha fatto ricorso.`;
  else if (pari) t += ` Pareggio. Si rivota domani.`;
  else t += ` ${a > b ? 'Bruno' : 'Franco'} ha detto che hanno votato anche i morti. ${N('aldo')} ha controllato: solo uno.`;
  t += ` ${cap(N('gavino'))} non era invitato a votare. Ha votato lo stesso: scheda nulla, aveva scritto «io».`;
  const f = fatto('votazione', ['aldo', 'franco', 'bruno', 'gavino', ...(gab && pari ? ['gab'] : [])], { a, b }, d.ultimo || S.testamentoF, 'A', 'bar', t, { breve: 'il voto al bar per la casa', lite: true, succoso: true, oggetto: 'la casa' });
  S.gavino = Math.max(S.gavino, 1);
} });

// la legna del falò (scarsità): chi dà cosa, e le cose delle altre storie che finiscono nel fuoco (insalata di favole)
op({ id: 'legna', reg: 'R', peso: 4, max: 3, fasce: ['mattina', 'mezzogiorno', 'pomeriggio'], giorni: [1, 2, 3], cerca: () => {
  if (S.g === 3 && fascia() !== 'mattina') return null;
  if (!free('aldo')) return null;
  const c = [];
  const ered = S.faide.find(d => d.id === 'eredita');
  if (ered.liv >= 2 && !S.flag.sedia && free('franco', 'bruno')) c.push({ k: 'sedia', causa: ered.ultimo });
  const lett = S.buttate.find(x => x.ogg.includes('lettere'));
  if (S.arrivoF && !S.flag.lettere && free('nives') && (lett || S.g >= 2)) c.push({ k: 'lettere', causa: lett ? lett.f : S.arrivoF, lett });
  if (S.flag.boicotto && !S.flag.ugolegna && free('ugo')) c.push({ k: 'ugo', causa: S.flag.boicotto });
  if (S.vincitore && !S.flag.legnaVinc && free(S.vincitore)) c.push({ k: 'vinc', causa: S.vincitaF });
  if (!S.flag.porta && free('cosimo')) c.push({ k: 'porta', causa: S.mercatoF });
  const lit = ultimo(f => f.lite && f.g === S.g && !f.donato && f.chi.some(c => free(c) && P[c] && c !== 'gab'));
  if (lit) c.push({ k: 'dono', causa: lit.id, lit });
  if (S.segnato[S.g] && free(S.segnato[S.g]) && !S.flag['donoSegn' + S.g]) c.push({ k: 'segnato', causa: ultimo(f => f.tipo === 'statua' && f.g === S.g).id });
  if (S.flag.cicciocaduto && !S.flag.cartella) c.push({ k: 'cartella', causa: ultimo(f => f.tipo === 'caduta').id });
  return c.length ? pick(c) : null;
}, fai: ({ k, causa, lett, lit }) => {
  take('aldo'); const L = S.legna;
  let t, chi = ['aldo'], n = 0, cosa = null, lite = false, extra = {};
  if (k === 'giro') { S.flag.giro = true; n = between(6, 10); t = `${cap(N('aldo'))} ha fatto il giro delle case per la legna del falò: ${n} fascine. Ne servono trenta. Ha detto che il resto è questione di carattere.`; }
  if (k === 'sedia') { S.flag.sedia = true; take('franco', 'bruno'); chi.push('franco', 'bruno'); n = 1; cosa = 'la sedia di zio Raimondo'; lite = true;
    t = `${cap(N('franco'))} ha dato per il falò la sedia di zio Raimondo, «quella dove stava seduto quando gli volevo bene». ${cap(N('bruno'))} l'ha ripresa: è roba della casa, e la casa non è ancora di nessuno. ${cap(N('aldo'))} l'ha messa a verbale e poi nel mucchio.`; extra = { succoso: true, oggetto: 'la casa' }; }
  if (k === 'lettere') { S.flag.lettere = true; take('nives'); chi.push('nives', 'belga'); n = 0; cosa = lett ? `le lettere del Belga che il mare non aveva voluto` : `undici lettere del 1964, mittente non dichiarato`;
    t = S.buttate.find(x => x.ogg.includes('lettere')) ? `${cap(N('nives'))} ha portato al comitato del falò un pacco di carta bagnata: le lettere del Belga che il mare non ha restituito. Le ha ripescate lei, col retino, alle sei. Ha detto che bruciate è meglio.` : `${cap(N('nives'))} ha portato al comitato del falò undici lettere legate con lo spago, del 1964. Non ha detto di chi erano. Il ragioniere ha letto il mittente e non ha detto niente neanche lui.`; }
  if (k === 'ugo') { S.flag.ugolegna = true; take('ugo'); chi.push('ugo'); n = between(5, 8);
    t = `Visto il boicottaggio della Cooperativa, ${N('ugo')} è andato a tagliare la legna da solo, in tonaca, nel bosco del Comune. ${n} fascine. Ha detto che il santo l'ha aiutato. Il santo non è stato visto.`; }
  if (k === 'vinc') { S.flag.legnaVinc = true; take(S.vincitore); chi.push(S.vincitore); n = between(8, 12);
    t = `Con i soldi della vincita ${N(S.vincitore)} ha comprato ${n} fascine per il falò, «così il santo sa chi ringraziare». ${cap(N('mario'))} ha preso il dieci per cento: una fascina e un quarto.`; chi.push('mario'); }
  if (k === 'porta') { S.flag.porta = true; take('cosimo'); chi.push('cosimo'); n = 2; cosa = 'una porta di cui nessuno ha chiesto';
    t = `${cap(N('cosimo'))} ha dato per il falò una porta vecchia del magazzino. Ha chiesto la ricevuta per detrarla. ${cap(N('aldo'))} ha detto che la ricevuta brucia insieme alla porta.`; }
  if (k === 'dono') { lit.donato = true; const d = lit.chi.find(c => free(c) && P[c] && c !== 'gab'); take(d); chi.push(d); n = between(2, 4);
    t = V('dono', [() => `Per ${lit.breve}, ${N(d)} ha portato al comitato ${n} fascine, «per farsi perdonare dal santo». Al santo non ha chiesto scusa: ha chiesto la ricevuta.`,
      () => `Dopo ${lit.breve}, ${N(d)} si è presentat${o(d)} da ${N('aldo')} con ${n} fascine e la faccia di chi non vuole parlarne. Il ragioniere ha scritto a verbale: «offerta spontanea».`,
      () => `${n} fascine per il falò da ${N(d)}. La moglie dice che le ha date per ${lit.breve}. ${cap(N(d))} dice che erano di troppo.`]); }
  if (k === 'segnato') { S.flag['donoSegn' + S.g] = true; const d = S.segnato[S.g]; take(d); chi.push(d); n = d === 'gab' ? 0 : between(3, 6);
    t = d === 'gab' ? `${cap(N('gab'))}, guardato dal santo, ha portato al comitato un rametto. ${cap(N('aldo'))} l'ha messo a verbale: una fascina, arrotondata.` : `Siccome la statua guarda casa sua, ${N(d)} ha portato ${n} fascine al falò prima che qualcuno glielo chiedesse. Poi ne ha portate altre due, perché non si sa mai.`; if (d === 'gab') n = 1; else n += 2; }
  if (k === 'cartella') { S.flag.cartella = true; n = 0; t = `${cap(N('aldo'))} ha rifatto a memoria la cartella del comitato, quella caduta in porto con Ciccio. Nella nuova risulta che il presidente ha fatto tutto da solo.`; }
  L.n += n; const f = fatto('legna', chi, { n, tot: L.n }, causa, 'R', 'festa', t + (n ? ` (Totale: ${L.n} fascine.)` : ''), Object.assign({ breve: k === 'sedia' ? 'la sedia di zio Raimondo nel mucchio del falò' : 'la legna del falò', lite }, extra));
  if (cosa) L.cose.push({ cosa, f: f.id });
  if (S.flag.boicotto && k === 'giro') {}
} });

// l'ordinanza del Delegato: risponde a un fatto (il campanile, il gabbiano, il falò) e diventa il nemico comune
op({ id: 'ordinanza', reg: 'A', peso: 3, max: 1, maxRun: 2, fasce: ['mattina', 'mezzogiorno'], giorni: [2, 3], cerca: () => {
  if (!free('renato', 'ignazio')) return null;
  const c = [];
  const camp = ultimo(f => f.tipo === 'campanile' && f.g === S.g - 1);
  if (camp && camp.dati.colpi >= 15 && !S.flag.ordLiti) c.push({ k: 'liti', causa: camp });
  const leg = ultimo(f => f.tipo === 'legna'); if (leg && !S.flag.ordFumo) c.push({ k: 'fumo', causa: leg });
  const fur = S.furtoF && !S.flag.ordMare ? F(S.furtoF) : null; if (fur) c.push({ k: 'mare', causa: fur });
  return c.length ? pick(c) : null;
}, fai: ({ k, causa }) => {
  take('renato', 'ignazio'); S.nOrd = (S.nOrd || 11) + 1;
  const timbro = S.ipotesi[S.g] && S.ipotesi[S.g].id === 'timbri' ? ' Timbrata con la patata.' : '';
  let t;
  if (k === 'liti') { S.flag.ordLiti = true; t = `Dopo i ${causa.dati.colpi} colpi di ieri notte, ordinanza n. ${S.nOrd} del Delegato: «Vietato litigare dopo le ventidue senza autorizzazione scritta.» Il modulo si ritira in Comune, dalle nove alle dodici.${timbro}`; }
  if (k === 'fumo') { S.flag.ordFumo = true; t = `Ordinanza n. ${S.nOrd}: «Tassa sul fumo del falò di Sant'Antonio, cinquanta lire a fascina.» Il Delegato dice che il fumo va verso casa sua.${timbro}`; }
  if (k === 'mare') { S.flag.ordMare = true; t = `Ordinanza n. ${S.nOrd}: «Le cose restituite dal mare vanno consegnate in Comune, che le restituisce.» Dopo, gratis. ${cap(N('ignazio'))} ha aperto un registro.${timbro}`; }
  const f = fatto('ordinanza', ['renato', 'ignazio'], { k, n: S.nOrd }, causa.id, 'A', 'comune', t, { breve: `l'ordinanza n. ${S.nOrd}`, succoso: true, oggetto: null });
  nemico(f, `l'ordinanza n. ${S.nOrd} del Delegato`, 'ordinanza_' + k);
  S.ordF = f.id;
} });
op({ id: 'maestra', reg: 'A', peso: 2, max: 1, maxRun: 1, fasce: ['pomeriggio'], cerca: () => (S.ordF && free('grazia', 'ignazio')) ? { f: F(S.ordF) } : null, fai: ({ f }) => {
  take('grazia', 'ignazio');
  fatto('maestra', ['grazia', 'ignazio'], {}, f.id, 'A', 'comune', `${cap(N('grazia'))} ha restituito al Comune ${f.breve} con tre errori segnati in rosso. ${cap(N('ignazio'))} l'ha ribattuta. Gli errori sono diventati quattro. La maestra ha messo il voto: cinque meno.`, { breve: 'la correzione della maestra', voce: ['grazia', 'Ventidue si scrive tutto attaccato! Anche per il Delegato!'] });
} });
// il rovescio di status: il Delegato fa l'ispezione e scivola (e tutti guardano altrove, deadpan)
op({ id: 'ispezione', reg: 'A', peso: 2.5, max: 1, maxRun: 1, fasce: ['mattina', 'mezzogiorno'], cerca: () => {
  if (!free('renato')) return null; const c = ultimo(f => (f.tipo.startsWith('faida_bilancia') || f.tipo === 'lazzo') && f.g >= S.g - 1); return c ? { c } : null;
}, fai: ({ c }) => {
  take('renato');
  fatto('ispezione', ['renato'], {}, c.id, 'A', 'mercato', `Dopo ${c.breve}, il Delegato ha fatto un'ispezione al mercato con la fascia. È scivolato su una triglia ed è finito seduto nella cassetta del ghiaccio. Il mercato intero ha guardato da un'altra parte, con grande impegno, per sei minuti.`, { breve: 'il Delegato nel ghiaccio', voce: ['renato', 'Nessuno ha visto niente! …Assunta, la triglia la pago io.'], succoso: true, oggetto: 'la bilancia' });
} });
// il brigadiere: interviene il minimo (sui gemelli che rivendono la roba del mare)
op({ id: 'brigadiere', reg: 'R', peso: 2.5, max: 1, maxRun: 2, fasce: ['mattina', 'mezzogiorno', 'pomeriggio'], cerca: () => {
  if (!free('lino')) return null;
  if (S.furtoF && !S.flag.brigFurto && free('piero', 'paolo')) return { k: 'furto', c: F(S.furtoF) };
  return null;
}, fai: ({ k, c }) => {
  take('lino', 'piero', 'paolo'); S.flag.brigFurto = true; S.flag.cossuPuniti = true;
  fatto('brigadiere', ['lino', 'piero', 'paolo'], {}, c.id, 'R', 'cronaca', `${cap(N('lino'))} ha convocato ${GEMELLI()} per ${c.breve}. Ha chiesto chi dei due era stato. Hanno detto «lui» tutti e due. Il brigadiere ha multato la metà di ciascuno.`, { breve: 'la multa ai gemelli', voce: ['lino', 'Mezza multa a testa. E non lo ditemi chi è stato, che poi scrivo.'] });
} });
// i ragazzi innamorati: il biglietto attraverso Lella (Colombina) o la scoperta
op({ id: 'innamorati', reg: 'R', peso: 2.5, max: 1, maxRun: 2, fasce: ['mezzogiorno', 'pomeriggio', 'sera'], cerca: () => {
  if (!free('marco', 'rita', 'lella')) return null;
  if (S.scopertaF && !S.flag.dopoScoperta) return { k: 'dopo', c: F(S.scopertaF) };
  const ered = S.faide.find(d => d.id === 'eredita');
  if (!S.flag.biglietto && ered.attiva) return { k: 'biglietto', c: F(ered.ultimo) };
  return null;
}, fai: ({ k, c }) => {
  take('marco', 'rita', 'lella');
  if (k === 'biglietto') { S.flag.biglietto = true;
    fatto('innamorati', ['marco', 'rita', 'lella'], {}, c.id, 'R', 'cronaca', `Mentre i padri litigano per la casa, ${N('marco')} ha dato a ${N('lella')}, al Bar Sport, un biglietto per ${N('rita')}. ${cap(N('lella'))} l'ha consegnato, poi ha detto a tutti e due che scrivono uguale e che, se si sposano, la casa sul molo la possono prendere loro.`, { breve: 'il biglietto di Marco per Rita', voce: ['lella', 'Vi passo i biglietti gratis. Al matrimonio voglio il tavolo vicino.'] });
    return; }
  S.flag.dopoScoperta = true;
  const f = fatto('innamorati', ['marco', 'rita', 'franco', 'bruno'], {}, c.id, 'R', 'cronaca', `Dopo la lettera ripescata, ${N('bruno')} ha proibito a ${N('rita')} di vedere ${N('marco')}. ${cap(N('franco'))} l'ha proibito a ${N('marco')}. È la prima cosa su cui sono d'accordo da quando è morto lo zio.`, { breve: 'i padri contro Marco e Rita', succoso: true, oggetto: 'la lettera' });
  nemico(f, 'i figli innamorati', 'figli');
} });
// le giocate al Lotto: dalla Smorfia di quello che è successo (realistico)
op({ id: 'giocata', reg: 'R', peso: 3.5, max: 2, maxRun: 4, fasce: ['mattina', 'mezzogiorno', 'pomeriggio'], giorni: [1, 2], cerca: () => {
  if (!free('pina')) return null;
  const MAP = [['testamento', 48, 'il morto che parla, per il testamento'], ['arrivo', 72, 'la meraviglia, per il ritorno del Belga'], ['campanile', 38, 'le botte, per le liti contate dal campanile'], ['gabbiano', 35, 'l\'uccellino, per il Comandante'], ['caduta', 56, 'la caduta, per Ciccio in porto'], ['partita', 19, 'la risata, per la partita'], ['frigo', 72, 'la meraviglia, per il frigo sul molo'], ['sogni', 0, ''], ['cartolina', 65, 'il pianto, per la cartolina di Nives'], ['statua', 13, 'Sant\'Antonio, per la statua']];
  const ord = shuffle(MAP); if (S.g === 2 && chance(.7)) ord.unshift(['sogni', 0, '']);
  for (const [tipo, num, perche] of ord) {
    const f = ultimo(f => f.tipo === tipo && f.g >= S.g - 1 && (f.giocato || 0) < (tipo === 'sogni' ? 2 : 1)); if (!f) continue;
    const n = tipo === 'sogni' ? f.dati.top : num, pr = tipo === 'sogni' ? `${SMORFIA[n]}, il più sognato all'Ufficio` : perche;
    const chi = pick(freeOf(['loredana', 'wanda', 'teresa', 'sergio', 'gavino', 'carmela', 'claudio', 'nello', 'iolanda', 'efisio']).slice(0, 3)); if (!chi) return null;
    return { f, n, pr, chi };
  }
  return null;
}, fai: ({ f, n, pr, chi }) => {
  f.giocato = (f.giocato || 0) + 1; take(chi, 'pina'); S.giocate.push({ chi, num: n, perche: pr });
  fatto('giocata', [chi, 'pina'], { num: n }, f.id, 'R', 'lotto', V('giocata', [
    () => `${cap(N(chi))} ha giocato il ${n}, ${pr}. ${cap(N('pina'))} ha detto che lo hanno giocato in sette, e che lei non dice chi.`,
    () => `In ricevitoria ${N(chi)} ha giocato il ${n} (${pr}). Ha chiesto a ${N('pina')} di non dirlo a nessuno. ${cap(N('pina'))} ha promesso.`,
    () => `${cap(N(chi))} ha puntato sul ${n}, ${pr}, mille lire secche. ${cap(N('pina'))} ${o(chi, 'gli', 'le')} ha detto che con mille lire il santo non si scomoda.`,
    () => `Giocato il ${n} da ${N(chi)}: ${pr}. ${chi === 'loredana' ? 'Ha mandato la cameriera, col cappello del Delegato.' : 'Ha toccato ferro due volte e pagato in monete.'}`,
  ]), { breve: `la giocata di ${Nn(chi)} sul ${n}`, oggetto: chi === 'loredana' ? 'il cappello' : null, succoso: chi === 'loredana' });
} });
// la scommessa sui colpi del campanile (si fa la sera, si paga la mattina dopo)
op({ id: 'scommessa', reg: 'R', peso: 2, max: 1, maxRun: 2, fasce: ['sera'], giorni: [1, 2], cerca: () => {
  const chi = freeOf(['claudio', 'tore', 'nello', 'gino', 'aldo', 'sergio', 'fausto', 'belga']).slice(0, 2); if (chi.length < 2) return null;
  const l = S.ultimaLite[S.g]; return l ? { chi, l } : null;
}, fai: ({ chi, l }) => {
  take(...chi); const n = S.liti[S.g], [a, b] = chi, pa = 12 + n + between(-1, 2), pb = 12 + n + between(-3, 1);
  const f = fatto('scommessa', chi, { pa, pb }, l, 'R', 'bar', `Al Bar Sport si scommette sui colpi di mezzanotte: ${N(a)} dice ${pa}, ${N(b)} dice ${pb}. Posta: un giro di mirto.`, { breve: 'la scommessa sul campanile' });
  S.scommesse.push({ g: S.g, a, b, pa, pb, f: f.id });
} });
op({ id: 'paga_scommessa', reg: 'R', peso: 4, max: 1, fasce: ['mattina'], giorni: [2, 3], cerca: () => {
  const s = S.scommesse.find(s => s.g === S.g - 1 && !s.pagata); const c = s && ultimo(f => f.tipo === 'campanile' && f.g === S.g - 1); return s && c && free(s.a, s.b) ? { s, c } : null;
}, fai: ({ s, c }) => {
  s.pagata = true; take(s.a, s.b); const colpi = c.dati.colpi;
  const da = Math.abs(s.pa - colpi), db = Math.abs(s.pb - colpi);
  let t;
  if (da === db) t = `Scommessa sul campanile: né ${N(s.a)} né ${N(s.b)} ci hanno preso (erano ${colpi}). Il mirto l'ha pagato ${N('gino')}, per non sentirli.`;
  else { const w = da < db ? s.a : s.b, l = w === s.a ? s.b : s.a; t = `Scommessa sul campanile vinta da ${N(w)}: erano ${colpi}. ${cap(N(l))} dice che una delle liti non valeva, era fra parenti.`; }
  fatto('scommessa_pagata', [s.a, s.b], {}, c.id, 'R', 'bar', t, { breve: 'il mirto della scommessa', lite: da !== db && chance(.5) });
} });
// il malinteso: due parlano di cose diverse (la moglie / la barca), e ci credono tutti e due
op({ id: 'malinteso', reg: 'A', peso: 2, max: 1, maxRun: 2, fasce: ['mezzogiorno', 'pomeriggio', 'sera'], cerca: () => {
  const c = [];
  if (S.cartolinaF && free('belga', 'nello')) c.push({ k: 'nives', c: S.cartolinaF });
  if (S.flag.dario && free('wanda', 'cosimo')) c.push({ k: 'dario', c: S.flag.dario });
  const ered = S.faide.find(d => d.id === 'eredita'); if (ered.liv >= 1 && free('tore', 'claudio')) c.push({ k: 'casa', c: ered.ultimo });
  return c.length ? pick(c.filter(x => !S.flag['mal_' + x.k])) || null : null;
}, fai: ({ k, c }) => {
  S.flag['mal_' + k] = true;
  const T = {
    nives: () => [['belga', 'nello'], `${cap(N('belga'))} ha chiesto a ${N('nello')} se «quello di Buenos Aires» torna davvero. ${cap(N('nello'))}, che pensava al suo motore Buenos Aires, ha detto: «Mai. È fuso da anni. Sta in fondo al mare.» ${cap(N('belga'))} ha offerto da bere a tutti.`],
    dario: () => [['wanda', 'cosimo'], `${cap(N('wanda'))} ha chiesto a ${N('cosimo')} quanto costa «tenerlo qui». Lui parlava del pesce in magazzino: «Col ghiaccio, ventimila al mese.» ${cap(N('wanda'))} ha cominciato a mettere da parte per Dario.`],
    casa: () => [['tore', 'claudio'], `Dal barbiere ${N('tore')} ha detto che «la casa la prende quello che resiste di più sott'acqua». ${cap(N('claudio'))} ha capito che è una regola del testamento. Alle sei lo sapeva tutto il paese.`],
  };
  const [chi, t] = T[k](); take(...chi);
  const f = fatto('malinteso', chi, {}, c, 'A', k === 'casa' ? 'voci' : 'bar', t, { breve: k === 'casa' ? 'la regola sott\'acqua' : k === 'dario' ? 'il malinteso del ghiaccio' : 'il motore Buenos Aires', succoso: k === 'casa', oggetto: k === 'casa' ? 'il molo' : null });
} });

// la riunione del comitato del falò: chi accende il fuoco (status, Gavino non invitato)
op({ id: 'comitato', reg: 'R', peso: 2.5, max: 1, maxRun: 2, fasce: ['pomeriggio', 'sera'], giorni: [1, 2], cerca: () => {
  const l = ultimo(f => f.tipo === 'legna'); if (!l || !free('aldo', 'ugo', 'renato')) return null; return { l };
}, fai: ({ l }) => {
  take('aldo', 'ugo', 'renato'); S.comitato = (S.comitato || 0) + 1;
  const t = S.comitato === 1
    ? `Riunione del comitato del falò in sagrestia: chi accende il fuoco? ${cap(N('aldo'))} perché è il presidente, ${N('ugo')} perché è il santo suo, ${N('renato')} perché è il Delegato. Si è votato: tre voti, tre candidati, un voto a testa. Si rivota domani.`
    : `Seconda riunione del comitato. ${cap(N('renato'))} ha proposto di accendere il fuoco in tre, con tre fiammiferi, al tre. ${N('ugo')} ha chiesto chi conta. Si rivota a Sant'Antonio, davanti al fuoco spento.`;
  fatto('comitato', ['aldo', 'ugo', 'renato'], {}, l.id, 'R', 'festa', t, { breve: 'la riunione del comitato', lite: S.comitato === 2 });
} });
// il rumore ha effetti: Michele, che pesca di notte, viene svegliato da una lite del mattino
op({ id: 'michele', reg: 'R', peso: 2, max: 1, maxRun: 2, fasce: ['mattina', 'mezzogiorno'], cerca: () => {
  const l = ultimo(f => f.lite && f.g === S.g && !f.svegliato); return l && free('michele') ? { l } : null;
}, fai: ({ l }) => {
  l.svegliato = true; take('michele'); S.mich = (S.mich || 0) + 1;
  const t = S.mich === 1
    ? `${cap(N('michele'))}, pescatore di lampara, che di giorno dorme, è stato svegliato alle dieci ${pr('da', l.breve)}. È sceso in canottiera e ha chiesto di litigare più piano. Gli hanno risposto più forte.`
    : `Svegliato di nuovo, stavolta ${pr('da', l.breve)}, ${N('michele')} ha portato il materasso in barca e ha dormito al largo. Dice che il mare almeno non ha cugini.`;
  fatto('michele', ['michele', ...l.chi.slice(0, 2)], {}, l.id, 'R', 'porto', t, { breve: 'Michele svegliato', lite: S.mich === 1, voce: S.mich === 1 ? ['michele', 'Io lavoro di notte! Litigate di notte, così vi sento io!'] : null });
} });
// i gemelli: l'economia dei bambini (vendono quello che il paese vuole guardare)
op({ id: 'gemelli', reg: 'A', peso: 2, max: 1, maxRun: 2, fasce: ['mattina', 'pomeriggio', 'sera'], cerca: () => {
  if (!free('piero', 'paolo')) return null;
  const c = [];
  if (S.flag.tuffo && !S.flag.gemTuffo) c.push({ k: 'tuffo', c: S.flag.tuffo });
  if (S.arrivoF && !S.flag.gemBelga && free('belga')) c.push({ k: 'belga', c: S.arrivoF });
  const camp = ultimo(f => f.tipo === 'campanile' && f.g === S.g - 1); if (camp && !S.flag.gemCamp) c.push({ k: 'camp', c: camp.id });
  return c.length ? pick(c) : null;
}, fai: ({ k, c }) => {
  take('piero', 'paolo'); S.flag['gem' + { tuffo: 'Tuffo', belga: 'Belga', camp: 'Camp' }[k]] = true;
  const T = {
    tuffo: () => [[], `${cap(GEMELLI())} vendono i posti in prima fila per il tuffo di domani al molo: cento lire in piedi, duecento seduti sulla bitta. Esauriti alle sei.`],
    belga: () => [['belga'], `${cap(GEMELLI())} hanno lavato la macchina del Belga senza che lui lo chiedesse, poi gli hanno chiesto mille lire. Lui ne ha date cinquecento. Loro hanno lavato solo metà macchina, il lato verso casa di Nives.`],
    camp: () => [[], `${cap(GEMELLI())} hanno aperto un banchetto sotto il campanile: «Si contano le liti di stanotte, 50 lire a lite». Hanno guadagnato più della ricevitoria.`],
  };
  const [ch, t] = T[k](); take(...ch);
  fatto('gemelli', ['piero', 'paolo', ...ch], {}, c, 'A', 'cronaca', t, { breve: 'gli affari dei gemelli' });
} });

op({ id: 'sciabica', reg: 'A', peso: 2.5, max: 1, maxRun: 3, fasce: ['mattina', 'mezzogiorno', 'pomeriggio', 'sera'], cerca: () => {
  if (!free('mario')) return null;
  const f = ultimo(f => f.g >= S.g - 1 && !f.decima && ['vincita', 'furto', 'scommessa_pagata', 'frigo_denuncia', 'gemelli', 'legna'].includes(f.tipo) && (f.tipo !== 'vincita' || f.dati.somma) && (f.tipo !== 'legna' || f.chi.length > 1) && !f.chi.includes('mario'));
  return f ? { f } : null;
}, fai: ({ f }) => {
  f.decima = true; take('mario'); S.sciab = (S.sciab || 0) + 1;
  const vit = f.chi.find(c => P[c] && c !== 'gab' && c !== 'pina') || f.chi[0];
  const t = [null,
    () => `${cap(N('mario'))} si è presentato ${pr('da', N(vit))} a chiedere il dieci per cento ${pr('di', f.breve)}. «Di cosa?» «Del fatto.» Gli ha dato cento lire per mandarlo via.`,
    () => `${cap(N('mario'))} ha chiesto il dieci per cento anche ${pr('di', f.breve)}. Stavolta ${N(vit)} ha detto di no. ${cap(N('mario'))} l'ha segnato sul taccuino, alla voce «crediti».`,
    () => `Sul taccuino di ${N('mario')}, alla voce «crediti», ci sono ormai mezzo paese, ${N('gab')} e Sant'Antonio. Ultima entrata: il dieci per cento ${pr('di', f.breve)}.`][Math.min(S.sciab, 3)]();
  fatto('sciabica', ['mario', vit], {}, f.id, 'A', 'cronaca', t, { breve: 'il dieci per cento di Sciabica', voce: S.sciab === 1 ? ['mario', 'Io non chiedo. Mi spetta. È diverso.'] : null });
} });

// ================= IL MOTORE DEL GIORNO =================
const K = { alba: 1, mattina: 4, mezzogiorno: 3, pomeriggio: 4, sera: 3, notte: 0 };
function giornata(g) {
  S.g = g; S.menz = new Set();
  for (let i = 0; i < FASCE.length; i++) {
    S.fi = i; S.occ = new Set();
    if (FASCE[i] === 'notte') ['ugo', 'bachisio'].forEach(x => S.occ.add(x));
    for (const o of OPS.filter(o => o.inst && o.fasce.includes(FASCE[i]) && o.giorni.includes(g))) o.fai();
    const usatiFascia = {};
    for (let k = 0; k < K[FASCE[i]]; k++) {
      const cand = [];
      for (const o of OPS) {
        if (o.inst || !o.fasce.includes(FASCE[i]) || !o.giorni.includes(g)) continue;
        const ug = (S.tipiOp[g + o.id] || 0), ur = (S.tipiOp[o.id] || 0);
        if (ug >= o.max || ur >= o.maxRun || (usatiFascia[o.id] || 0) >= (o.multi || 1)) continue;
        const b = o.cerca(); if (!b) continue;
        const w = o.costante ? o.peso : o.peso * (ug ? .35 : 1) * (ur >= 3 ? .5 : 1);
        cand.push({ o, b, w });
      }
      if (!cand.length) break;
      let r = R() * cand.reduce((s, c) => s + c.w, 0), ch = cand[0];
      for (const c of cand) { r -= c.w; if (r <= 0) { ch = c; break; } }
      const n0 = S.fatti.length;
      ch.o.fai(ch.b);
      if (S.fatti.length > n0) { S.tipiOp[g + ch.o.id] = (S.tipiOp[g + ch.o.id] || 0) + 1; S.tipiOp[ch.o.id] = (S.tipiOp[ch.o.id] || 0) + 1; usatiFascia[ch.o.id] = (usatiFascia[ch.o.id] || 0) + 1; }
      else usatiFascia[ch.o.id] = 99;
    }
  }
}

// ================= LA GAZZETTA =================
const SEZ = [['prima', 'IN PRIMA'], ['porto', 'DAL PORTO'], ['mercato', 'MERCATO'], ['comune', 'DAL COMUNE'], ['chiesa', 'DALLA PARROCCHIA'], ['cronaca', 'CRONACA'], ['mare', 'RESTITUITI DAL MARE'], ['bar', 'AL BAR SPORT'], ['voci', 'SI DICE'], ['sogni', 'UFFICIO SOGNI'], ['lotto', 'LOTTO DEL GARANTE'], ['festa', 'SANT\'ANTONIO'], ['campanile', 'IL CAMPANILE']];
function wrap(s, w = 100, ind = '  ') { const out = []; let line = ''; for (const word of s.split(' ')) { if ((line + ' ' + word).trim().length > w) { out.push(ind + line.trim()); line = word; } else line += ' ' + word; } if (line.trim()) out.push(ind + line.trim()); return out.join('\n'); }
function stampaGiorno(g) {
  const out = [];
  out.push('', '='.repeat(100), `GAZZETTA DI PORTO VECCHIO  ·  ${GIORNI[g]}  ·  tempo: ${S.meteo[g]}  ·  lire 300`, '='.repeat(100));
  const fs = S.fatti.filter(f => f.g === g && !f.nascosto && f.testo);
  for (const [k, tit] of SEZ) {
    const xs = fs.filter(f => f.sez === k); if (!xs.length) continue;
    out.push('', `— ${tit} —`);
    for (const f of xs) {
      let s = f.testo; if (f.voce && !s.includes(f.voce[1])) s += ` «${f.voce[1]}» (${etichetta(f.voce[0])})`;
      out.push(wrap(`${s}  [${f.id}${f.causa ? '←' + f.causa : ''}·${f.reg}]`));
    }
  }
  // le catene del giorno: le tre più lunghe che finiscono oggi
  const fine = fs.filter(f => !S.fatti.some(x => x.causa === f.id && x.g === g)).sort((a, b) => b.hop - a.hop);
  const viste = new Set(), cat = [];
  for (const f of fine) { const c = catena(f.id); const key = c[0].id; if (c.length < 3 || viste.has(key)) continue; viste.add(key); cat.push(c); if (cat.length >= 3) break; }
  if (cat.length) { out.push('', '— LE CATENE DI OGGI (dalla causa all\'effetto) —'); for (const c of cat) out.push(wrap(c.map(f => `${f.breve} (${f.id}, g${f.g})`).join('  →  '))); }
  return out.join('\n');
}
function misure() {
  const fs = S.fatti.filter(f => !f.nascosto);
  const emerg = fs.filter(f => !OPS.find(o => o.inst && o.id === f.tipo) && !['pescato', 'barche_ferme', 'meteo', 'ipotesi', 'nave', 'mercato', 'testamento', 'offerta', 'arrivo', 'cartolina', 'sogni', 'garante', 'estrazione', 'campanile', 'statua', 'restituzione', 'furto', 'non_restituito', 'benedizione', 'falo', 'vincita', 'gabbiano'].includes(f.tipo) || f.causa);
  const tipi = {}; for (const f of fs) tipi[f.tipo] = (tipi[f.tipo] || 0) + 1;
  const famiglie = {}; for (const f of fs) { const k = f.tipo.replace(/_\d+$/, '').replace(/_(tregua|ricaduta)$/, ''); famiglie[k] = (famiglie[k] || 0) + 1; }
  const rip = Object.values(tipi).filter(n => n > 2).reduce((s, n) => s + n - 2, 0);
  const radici = fs.filter(f => !f.causa).length, conCausa = fs.filter(f => f.causa).length;
  const RADICI = new Set(['legna', 'frigo', 'partita', 'ipotesi', 'meteo', 'pescato', 'barche_ferme', 'nave', 'mercato', 'testamento', 'gabbiano', 'arrivo', 'cartolina', 'garante', 'campanile', 'scopa', 'cabina', 'statua', 'messa', 'benedizione', 'falo']);
  const senzaCausaEmergenti = fs.filter(f => !f.causa && !RADICI.has(f.tipo)).map(f => f.tipo);
  const hop = fs.map(f => f.hop), maxHop = Math.max(...hop), avgHop = hop.reduce((a, b) => a + b, 0) / hop.length;
  const reg = { R: 0, A: 0, S: 0 }; for (const f of fs) reg[f.reg]++;
  const perG = [1, 2, 3].map(g => new Set(fs.filter(f => f.g === g).map(f => f.tipo.replace(/_\d+$/, ''))));
  const jac = (a, b) => { const i = [...a].filter(x => b.has(x)).length; return i / (a.size + b.size - i); };
  const voci = fs.filter(f => f.voce).map(f => f.voce[1]); const lunghe = voci.filter(v => v.length > 70);
  const frasi = {}; for (const f of fs) for (const fr of (f.testo || '').split(/(?<=[.!?»])\s+/)) { const k = fr.replace(/[0-9.]+/g, '#').replace(/[A-Z][a-zà-ù]+/g, 'N').trim(); if (k.length > 25) frasi[k] = (frasi[k] || 0) + 1; }
  const tot = Object.values(frasi).reduce((a, b) => a + b, 0), ripF = Object.values(frasi).filter(n => n > 1).reduce((a, n) => a + n - 1, 0);
  const l = [];
  l.push('', '='.repeat(100), `MISURE (seme ${SEME})`, '='.repeat(100));
  l.push(`fatti in Gazzetta: ${fs.length} (giorno 1: ${fs.filter(f => f.g === 1).length}, 2: ${fs.filter(f => f.g === 2).length}, 3: ${fs.filter(f => f.g === 3).length})`);
  l.push(`tipi di situazione distinti: ${Object.keys(tipi).length}; famiglie di situazione: ${Object.keys(famiglie).length}`);
  l.push(`ripetizione dei tipi (fatti oltre il secondo dello stesso tipo / totale): ${(rip / fs.length * 100).toFixed(1)}%`);
  l.push(`ripetizione dei testi (varianti riusate / varianti scelte): ${S.varRipetute}/${S.varUsi} = ${(S.varRipetute / Math.max(1, S.varUsi) * 100).toFixed(1)}%; frasi ripetute (a meno di nomi e numeri): ${ripF}/${tot} = ${(ripF / tot * 100).toFixed(1)}%`);
  l.push(`registri: realistico ${reg.R} (${(reg.R / fs.length * 100).toFixed(0)}%), assurdo ${reg.A} (${(reg.A / fs.length * 100).toFixed(0)}%), surreale ${reg.S} (${(reg.S / fs.length * 100).toFixed(0)}%)`);
  l.push(`coerenza: ${conCausa} fatti con causa, ${radici} radici (istituzioni e calendario); radici fuori dalle istituzioni: ${senzaCausaEmergenti.length ? senzaCausaEmergenti.join(', ') : 'nessuna'}`);
  l.push(`catene: lunghezza massima ${maxHop + 1} fatti, profondità media ${avgHop.toFixed(2)}`);
  l.push(`somiglianza fra i giorni (Jaccard dei tipi): 1-2 ${jac(perG[0], perG[1]).toFixed(2)}, 2-3 ${jac(perG[1], perG[2]).toFixed(2)}, 1-3 ${jac(perG[0], perG[2]).toFixed(2)}`);
  l.push(`battute dette: ${voci.length}, oltre i 70 caratteri: ${lunghe.length}${lunghe.length ? ' → ' + lunghe.join(' | ') : ''}`);
  l.push(`liti contate dal campanile: ${S.liti[1]}, ${S.liti[2]}, ${S.liti[3]}; fascine al falò: ${S.legna.n}`);
  l.push(`faide: ${S.faide.map(d => `${d.id} ${d.inTregua ? (d.ricaduto ? 'gradino ' + d.liv + ', tregua e ricaduta' : 'gradino ' + d.liv + ', in tregua') : 'gradino ' + d.liv}`).join('; ')}`);
  l.push(`le più presenti: ${Object.values(P).sort((a, b) => b.n - a.n).slice(0, 6).map(p => `${p.nick || p.nome} ${p.n}`).join(', ')}; mai in Gazzetta: ${Object.values(P).filter(p => !p.n).map(p => p.nome).join(', ') || 'nessuno'}`);
  return l.join('\n');
}

// ================= VIA =================
S.archi = { eredita: chance(.75), belga: chance(.75), frigo: chance(.55), calcio: chance(.55) };
while (Object.values(S.archi).filter(Boolean).length < 3) S.archi[pick(Object.keys(S.archi).filter(k => !S.archi[k]))] = true;
const METEO = ['maestrale', 'bonaccia', 'scirocco', 'nebbia'];
for (const g of [1, 2, 3]) S.meteo[g] = pick(g === 1 ? ['maestrale', 'bonaccia', 'scirocco'] : METEO);
if (!Object.values(S.meteo).includes('nebbia') && chance(.5)) S.meteo[pick([2, 3])] = 'nebbia';
const ips = shuffle(IPOTESI).slice(0, 3); [1, 2, 3].forEach((g, i) => { if (i === 0 && ips[0].id === 'nave') { S.ipotesi[g] = ips[0]; } else S.ipotesi[g] = ips[i]; });
for (const id of GENTE) for (const j of GENTE) if (id < j && chance(.25)) rel(id, j, between(-1, 1));
const out = [`LA GAZZETTA DI PORTO VECCHIO — tre giorni di gennaio (seme ${SEME})`];
for (const g of [1, 2, 3]) { giornata(g); out.push(stampaGiorno(g)); }
out.push(misure());
console.log(out.join('\n'));
