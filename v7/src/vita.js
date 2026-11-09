/* [commedia] vita.js: LA VITA FRA LORO, dietro ?commedia (progetto: commedia/VITA_NPC.md). Spento il flag: Vita = { ON: false }.
   Uno strato sottile che cuce i sistemi che ci sono già: niente mondo suo. Prima il fatto (lo decide il motore), poi la parola
   (2-6 battute fra due NPC, nella fila dei frammenti di matti.js, al posto del prossimo frammento), poi la conseguenza nel diario.
   Per esteso solo entro 26 m dal giocatore (le battute fra 2,5 e 12 m); lontano i motori fanno i loro conti come prima.

   L'INTERFACCIA (per iniziative.js e gli altri):
   - Vita.scambio(a, b, intento, dati) → { esito, promessa, fatto, detto }
       Uno scambio vero fra due NPC. Prima l'esito: intento.esito(a, b, st, dati) fa la cosa col motore e dice com'è andata (una
       chiave di intento.battute, o { esito, promessa: {desc, link, scadenza, dove, chi, a}, accettato, dati }). Poi, se i due sono
       vicini al giocatore, svegli, fuori e c'è il posto nella fila (il ritmo dei frammenti: uno ogni 35-75 s, i frammenti scritti
       tengono almeno la metà dei posti), le battute in fila (A, B, A…); se no niente battute, il fatto resta. La conseguenza: un
       fatto nel registro (Vita.fatto) e, quando le battute sono uscite, il perché nel diario dei due. La promessa (se c'è) è una
       promessa di parola.js con fra:true (la chiude il suo tick se il link è appt; le altre le chiude chi le ha fatte, con
       Parola._.chiudi). dati: { causa: id di un fatto, forza: true per non contare il turno coi frammenti scritti, ...segnaposti }.
       detto: true se le battute sono andate in fila (si sentiranno se il giocatore resta lì).
   - Vita.registraIntento(nome, { quando(a, b, st), esito(a, b, st, dati), battute: { esito: [variante, ...] }, si: [esiti],
       peso, dati(a, b, st) })
       Aggiunge un intento alla tavola: quando dice se fra quei due adesso ha senso (vita lo prova nelle coppie vicine al
       giocatore, dopo i conti aperti); esito fa la cosa. Una variante è un array di righe [chi, testo]: chi è 'a' o 'b';
       nel testo {A} e {B} sono i nomi, {chiave} un campo di dati. Ogni riga ≤ 70 caratteri, rispetta il contesto (commedia.js
       §9). Una riga che promette («ci vengo», «va bene», «te lo porto») esce solo se l'esito è fra quelli in si (o accettato:true).
   - Vita.fatto(tipo, chi, dati, causa) → id (o null)        il registro dei fatti, a catena (effetti a farfalla)
       chi: id o array di id; causa: l'id del fatto che l'ha mosso. Ogni passo pesa .6 del padre: sotto .15 la catena si ferma
       (null); al massimo 400 fatti al giorno; il registro tiene gli ultimi 300.
   - Vita.catena(id) → [fatto, ...] dal più vecchio al più nuovo (gli antenati e il fatto stesso)
   - Vita.recenti(chi, minuti) → i fatti recenti che toccano chi (per motivare un intento)
   Ogni conseguenza di vita (soldi, roba, debiti, promesse, note) porta la causa: x.causa nel diario, D.causa nei debiti, p.causa.

   Il resto, fuori dai file degli altri: Azioni.CFG.talk (in catena con la Mente), Popolo.PROJ.affitto.steps (il prestito diventa
   un debito con scadenza), il saldo di persona (scambi.settle non tocca le coppie vicine al giocatore: si tolgono e si ridanno i
   debiti attorno al suo giro delle 19), Parola.EXT.fra, il Taccuino «Sentito dire» (un bottone in più nel nav di #book). */
(function () {
  'use strict';
  const W0 = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Vita = { ON };
  W0.Vita = Vita;
  if (typeof module !== 'undefined' && module.exports) module.exports = Vita;
  if (!ON) return;
  const G = typeof Game !== 'undefined' ? Game : null;
  if (!G || !G.HOOKS) { Vita.ON = false; return; }
  const Po = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const Az = () => (typeof Azioni !== 'undefined' ? Azioni : null);
  const Sc = () => (typeof Scambi !== 'undefined' ? Scambi : null);
  const Mt = () => (typeof Matti !== 'undefined' ? Matti : null);
  const Cm = () => (typeof Commedia !== 'undefined' && Commedia.ON ? Commedia : null);
  const Pa = () => (typeof Parola !== 'undefined' && Parola.ON && Parola._ ? Parola : null);
  const Og = () => (typeof Oggetti !== 'undefined' ? Oggetti : null);

  const CFG = { R: 26, palco: [2.5, 12], coppia: 3.6, gap: 2.4, fram: [35, 75], tick: .5, fresco: 25, decad: .6, minPeso: .15, capGiorno: 400, log: 300, furtiGiorno: 1, soc: 20, regaliGiorno: 1, appGiorno: 3 };
  Vita.CFG = CFG;
  const hyp = Math.hypot, rnd = Math.random, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = a => a[Math.floor(rnd() * a.length)];
  const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const low = s => (s ? s[0].toLowerCase() + s.slice(1) : s);
  const day = st => Math.floor(st.t / 1440);
  const alive = n => n && !n.dead;
  const giovane = n => !!(n && n.pop && n.pop.age <= 30);
  const nm = n => (n ? n.first || n.name : '?');
  let ST = null;
  const note = (st, n, text, kind, x) => { const P = Po(); if (P && n && n.pop) try { P.note(st, n, text, kind, x); } catch (e) { } };
  const S = st => st.vita || (st.vita = {
    sentite: [], ultima: {}, detti: {}, gruppi: [], dq: [], pend: [], fatti: [], nextF: 1, capG: {}, slot: { vita: 0, scritti: 0, voce: 0 },
    furti: {}, regali: {}, appG: {}, buche: {}, altri: [], scanT: {}, mazzi: {}, ultimaStr: '', t: 0, prevQ: 0, settle: null,
    stats: { scambi: 0, sentiti: 0, finiti: 0, per: {}, guardia: 0, contesto: 0, lunghe: 0, promesse: 0, fatte: 0, rotte: 0, furti: 0, regali: 0, prestiti: 0, saldiDiPersona: 0, rinfacci: 0, appPresi: 0, incontriVisti: 0, accuse: 0, denunce: 0, fatti: 0, catenaMax: 0, ms: 0, msMax: 0, frames: 0, ticks: 0 },
  });
  Vita.S = S;

  // ================= IL REGISTRO DEI FATTI (a catena) =================
  function fatto(tipo, chi, dati, causa) {
    const st = ST; if (!st) return null; const V = S(st);
    const par = causa ? V.fatti.find(f => f.id === causa) : null;
    const peso = par ? par.peso * CFG.decad : 1;
    if (par && peso < CFG.minPeso) return null;
    const d = day(st); if ((V.capG[d] = (V.capG[d] || 0) + 1) > CFG.capGiorno) return null;
    if (V.capG[d - 2]) delete V.capG[d - 2];
    const f = { id: 'f' + V.nextF++, t: st.t, tipo, chi: [].concat(chi || []).map(x => (x && x.id) || x), dati: dati || {}, causa: par ? par.id : (causa || null), peso, hop: par ? par.hop + 1 : 0 };
    V.fatti.push(f); if (V.fatti.length > CFG.log) V.fatti.splice(0, V.fatti.length - CFG.log);
    V.stats.fatti++; V.stats.catenaMax = Math.max(V.stats.catenaMax, f.hop);
    return f.id;
  }
  function catena(id) {
    const st = ST; if (!st || !id) return []; const V = S(st), out = [];
    let f = V.fatti.find(x => x.id === id), k = 0;
    while (f && k++ < 16) { out.unshift(f); f = f.causa ? V.fatti.find(x => x.id === f.causa) : null; }
    return out;
  }
  const recenti = (chi, minuti) => { const st = ST; if (!st) return []; const id = (chi && chi.id) || chi; return S(st).fatti.filter(f => st.t - f.t <= (minuti || 120) && f.chi.includes(id)); };
  Vita.fatto = fatto; Vita.catena = catena; Vita.recenti = recenti;

  // ================= ATTREZZI =================
  const NUM = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove', 'venti'];
  const DECINE = { 30: 'trenta', 40: 'quaranta', 50: 'cinquanta' };
  const soldiW = v => { v = Math.max(1, Math.round(v)); return v <= 20 ? NUM[v] : DECINE[v] || v + '.000'; };
  function oraW(t) {
    const m = ((Math.round(t) % 1440) + 1440) % 1440, h = Math.floor(m / 60), mm = m % 60, h12 = h % 12;
    const base = h === 12 ? 'a mezzogiorno' : h === 0 ? 'a mezzanotte' : h12 === 1 ? "all'una" : 'alle ' + NUM[h12];
    return base + (mm >= 45 ? ' e tre quarti' : mm >= 25 ? ' e mezza' : mm >= 10 ? ' e un quarto' : '');
  }
  function quandoW(st, t) {
    const d = Math.floor(t / 1440) - day(st), h = Math.floor((t % 1440) / 60);
    return (d <= 0 ? (h >= 18 ? 'stasera' : h >= 13 ? 'oggi pomeriggio' : 'oggi') : d === 1 ? 'domani' : G.dayName(t).toLowerCase()) + ' ' + oraW(t);
  }
  const ritardoW = m => (m < 15 ? 'Dieci minuti' : m < 25 ? 'Venti minuti' : m < 40 ? "Mezz'ora" : "Un'ora");
  function aLuogo(pl) {
    pl = String(pl || ''); const w = pl.split(' ')[0], l = w.toLowerCase();
    if (!pl) return 'qui'; if (l === 'casa') return 'a casa' + pl.slice(4);
    if (/^[aeiouh]/i.test(w)) return "all'" + pl;
    return (/a$/.test(l) ? 'alla ' : 'al ') + pl;
  }
  function cosaW(id) {
    const O = Og(), c = O && O.CAT && O.CAT[id], n = (c && c.nome) || String(id).replace(/_/g, ' ');
    const P = Pa(); try { if (P && P.art) return P.art(n); } catch (e) { }
    return n;
  }
  const near = (st, n, r) => hyp(n.x - st.player.x, n.y - st.player.y) < r;
  function ok(st, n) {   // può parlare per conto suo (come matti.js ok)
    return alive(n) && !n.inside && !n.room && !n.__ev && !n.cop && !n.faction && !n.aggro && !(n.stun > 0) && !n.inVeh && !(n.panic > 0) && !(n.jailedUntil > st.t) && n.pop && n.pop.diary && n.pop.near !== false && (!n.action || n.action.name === 'routine') && !n.pop.matto;
  }
  const relA = (st, a, b) => { try { return Az().rel(st, a, b).a; } catch (e) { return 0; } };
  const bump = (st, a, b, da) => { try { Az().moveRel(st, a, b, da, 0); } catch (e) { } };
  const opin = (st, a, id) => { try { return Po().opinionOf(st, a, id); } catch (e) { return 0; } };
  const recentNote = (st, n, f, days) => { const D = (n.pop && n.pop.diary) || []; for (let i = D.length - 1; i >= 0; i--) { const e = D[i]; if (st.t - e.t > (days || 3) * 1440) break; if (f(e)) return e; } return null; };
  const grigioVicino = (st, x, y, r) => st.npcs.find(k => k.cop && alive(k) && !k.inside && hyp(k.x - x, k.y - y) < r) || null;
  const chiave = (a, b, k) => (a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id) + '|' + k;

  // ================= LE BATTUTE (intento × esito × voce) =================
  // una variante: righe 'chi:testo' separate da ' | '; chi è a, b, c (il terzo: il testimone) o g (il Grigio, a voce sua).
  // {A} {B} {C} i nomi; gli altri segnaposti li riempie chi fa lo scambio. Le chiavi «_g» sono dei ragazzi (fino a 30 anni).
  const B = {
    'appunt:si': [
      'a:{B}, {quando} {luogo}. Porta i soldi. | b:Porto i soldi. Tu porta la faccia da perdente. | a:Quella ce l\'ho sempre addosso.',
      'a:Ci vediamo {quando} {luogo}, {B}? | b:Ci sto. Ma stavolta paghi tu. | a:Pago io. Tanto vinco.',
      'a:{B}! {Quando}, {luogo}. Non farmi aspettare. | b:Io? Sono un orologio. | a:Sì, uno rotto. L\'ultima volta era Natale.',
      'a:Hai da fare {quando}, {B}? | b:Dipende. Chi paga? | a:Si vede {luogo}. | b:Va bene, {A}. Ma porto la fame.',
      'a:{Quando} {luogo}, {B}. Ti devo parlare. | b:Di soldi? | a:Di soldi. | b:Allora vengo, {A}. Ma non ti ascolto.',
    ],
    'appunt:si_g': [
      'a:Fra, {quando} {luogo}. Ci sei? | b:Ci sono, {A}. Se mi presti cinque. | a:Ti presto un orologio, così arrivi.',
      'a:Oi {B}, {quando} {luogo}, vieni? | b:Vengo, fra. Porto il drum. | a:E le cartine, stavolta. Non le mie.',
      'a:{B}, {quando}. {Luogo}. Puntuale. | b:Io sono puntuale, {A}. | a:Sì, sul ritardo.',
    ],
    'appunt:lavoro': [
      'a:{B}, {quando} {luogo}? | b:{Quando} lavoro, {A}. Qualcuno deve. | a:Che schifo di risposta.',
      'a:Ci vediamo {quando}, {B}? | b:Lavoro. Il padrone non sa ridere. | a:Digli che stai male. | b:Mi vede la faccia, {A}. Sto benissimo.',
      'a:Fra, {quando} {luogo}? | b:Lavoro, {A}. Mica tutti campano d\'aria. | a:Io campo benissimo, d\'aria.',
    ],
    'appunt:impegno': [
      'a:{B}, {quando} {luogo}? | b:Ho già un impegno, {A}. | a:Con chi? | b:Con uno più simpatico.',
      'a:Ti va di vederci {quando}, {B}? | b:Non posso, ho già da fare. | a:Mi molli così, {B}? Per un altro?',
      'a:Oi {B}, {quando}? | b:Già preso, fra. | a:Da chi? | b:Fatti miei, {A}.',
    ],
    'arrivo:puntuale': [
      'a:{Ora}, {B}. Puntuale. Mi preoccupi. | b:Ho dormito bene, {A}. Capita.',
      'b:Eccomi. Puntuale, eh, {A}? | a:Puntuale. Segnatelo, {B}, che non ricapita.',
      'a:Allora ci sei davvero, {B}. | b:Te l\'avevo detto, {A}. | a:Tu dici tante cose.',
      'b:{A}! Chi è arrivato primo? | a:Io. Da dieci minuti, {B}. | b:Dieci minuti sono niente.',
    ],
    'arrivo:ritardo': [
      'a:{Tardi} di ritardo, {B}. | b:C\'era gente per strada, {A}. | a:C\'è sempre gente per strada.',
      'a:È un pezzo che sto qui, {B}. | b:E adesso ci sono anch\'io, {A}. Contento? | a:No.',
      'b:Scusa, {A}. Non trovavo le chiavi. | a:E le hai trovate, {B}? | b:No. Per questo sono in ritardo.',
      'a:{B}! {Tardi}! | b:Mi ha fermato mia zia, {A}. | a:Tua zia ferma pure i treni.',
    ],
    'attiv:offri': ['a:Questo lo pago io, {B}. | b:Allora prendo il doppio.', 'b:Chi paga? | a:Pago io, {B}. Per stavolta.', 'a:Offro io, {B}. Non ci fare l\'abitudine. | b:Troppo tardi, {A}.'],
    'attiv:vince': ['b:Un\'altra mano, {A}. | a:Hai già perso {soldi}, {B}. | b:Appunto. Li rivoglio.', 'a:Paga, {B}. {Soldi}. | b:Mi hai fregato, {A}. | a:Ti ho battuto. È diverso.'],
    'attiv:perde': ['a:Hai barato, {B}. | b:Ho vinto, {A}. Ti brucia? | a:Mi brucia.', 'b:{Soldi}, {A}. Contanti. | a:Te li do, {B}. Piangendo.'],
    'attiv:pari': ['b:Ancora una, {A}? | a:Ancora una e poi basta, {B}. | b:Lo dici sempre.'],
    'buca:vera': [
      'a:{B}. Ieri. {Ora}. Chi c\'era? Io. | b:{Scusa} Chiedi pure ai Grigi. | a:Ah. Allora niente, {B}.',
      'a:Ti ho aspettato, {B}. | b:{Scusa} | a:Ah. E adesso come stai?',
      'a:Ieri buca, {B}. | b:{Scusa} Vuoi vedere? | a:No, no, {B}. Ti credo.',
    ],
    'buca:falsa': [
      'a:Ieri. {Ora}. Chi c\'era, {B}? Io. | b:{Scusa} | a:Io c\'ero, invece. Come un cretino.',
      'a:{B}, mi hai lasciato lì come un palo. | b:{Scusa} | a:E non potevi dirlo prima? | b:Prima non lo sapevo, {A}.',
      'a:Ieri ti ho aspettato un\'ora, {B}. | b:{Scusa} | a:Bella scusa. La prossima la scrivi?',
    ],
    'buca:falsa_g': [
      'a:Fra, ieri. Dove cazzo eri? | b:{Scusa} | a:Sei un pacco, {B}.',
      'a:Oi {B}, buca. Di nuovo. | b:{Scusa} | a:Ti segno sul quaderno dei pacchi, {B}.',
    ],
    'ricorda:si': [
      'a:{Quando}, {B}. {Luogo}. | b:Lo so, {A}. Sì, mamma.',
      'a:Non ti scordare, {B}: {quando}. | b:Me l\'hai detto tre volte, {A}. | a:E te lo dico la quarta.',
      'b:{A}, {quando} {luogo}, giusto? | a:Giusto, {B}. E stavolta puntuale.',
    ],
    'debito:salda': [
      'a:Tieni, {B}. {Soldi}. Contali. | b:Contati. Sei un signore, {A}.',
      'a:{B}, i tuoi {soldi}. Come d\'accordo. | b:Li hai rubati? | a:Li ho guadagnati, {B}. Peggio.',
      'a:Zio, eccoli. {Soldi}. | b:Ma guarda, {A}. Pensavo fossi morto.',
    ],
    'debito:tardi': [
      'a:Tieni. {Soldi}. Contali, {B}. | b:{Scad} era {quanto} fa, {A}. | a:E li ho portati lo stesso. Rispetto, no?',
      'a:{B}, i {soldi}. | b:Con calma, eh, {A}. Tre secoli. | a:Volevi gli interessi? | b:Volevo i soldi. Basta così.',
      'b:Oh, i miei {soldi}! Credevo di sognare, {A}. | a:Sogna meno e conta, {B}.',
    ],
    'debito:rinfaccia': [
      'a:{B}. I miei {soldi}. | b:Adesso non ce li ho, {A}. | a:E quando ce li hai? | b:Quando ce li ho.',
      'a:Mi devi ancora {soldi}, {B}. | b:Lo so, {A}. Lo so benissimo. | a:Saperlo non basta.',
      'a:{B}, ti ricordi di me? Quello dei {soldi}. | b:Ah. Ciao, {A}. Devo scappare.',
    ],
    'debito:rinfaccia_g': [
      'a:Fra, i {soldi}. | b:Zio, sono a secco. | a:Sei a secco da Natale, {B}.',
      'a:Oi, {B}. Ti sei scordato qualcosa? | b:Io? No, {A}. | a:{Soldi}. Me li devi. | b:Ah, quelli.',
    ],
    'debito:rottura': [
      'a:Seconda volta, {B}. I {soldi}. | b:Non ce li ho, {A}. | a:Allora non ci conosciamo più.',
      'a:{B}, con te ho chiuso. Tieniti i {soldi}. | b:Davvero, {A}? | a:No. Ma con te ho chiuso.',
    ],
    'prestito:si': [
      'a:Grazie dei {soldi}, {B}. {Scad} te li rendo. | b:{Scad} di quale anno, {A}? | a:Di questo. Forse.',
      'b:Ecco i {soldi}, {A}. Contati. | a:Per {scad}, {B}. Giuro su mia madre. | b:Tua madre non mi paga.',
      'a:Ti rendo tutto, {B}. Con gli interessi. | b:Basta il tutto, {A}. | a:Allora il tutto. {Scad}.',
    ],
    'regalo:si': [
      'a:Tieni {cosa}, {B}. Mi avanza. | b:Davvero? Grazie, {A}. | a:Non piangere, che la gente parla.',
      'a:{B}, prendi {cosa}. | b:Quanto vuoi, {A}? | a:Niente. Sei troppo brutto per pagare.',
      'a:Ti serve {cosa}, {B}? Tieni. | b:Ti devo un favore, {A}. | a:Me lo ricordo io, tranquillo.',
      'a:Ho {cosa} di troppo, {B}. Prendi. | b:Sicuro, {A}? | a:No. Sbrigati, prima che ci ripenso.',
    ],
    'regalo:si_g': ['a:Fra, tieni {cosa}. | b:Zio, sei un fratello. | a:Non ti abituare, {B}.'],
    'grazie:si': [
      'a:{B}, ti devo un favore. Non me lo scordo. | b:Lo spero, {A}. Ho buona memoria pure io.',
      'a:Grazie per l\'altro giorno, {B}. | b:Quale giorno, {A}? | a:Quello che mi hai salvato. | b:Ah, quello. Costa.',
      'a:Zio, quella cosa. Grazie. | b:Tranquillo, {A}. Me la ripaghi.',
    ],
    'muso:si': [
      'b:Ciao, {A}. | a:Ah. Tu. | b:Ancora per ieri, {A}? | a:Ancora per ieri.',
      'b:{A}! Come va? | a:Va meglio quando non ti vedo, {B}.',
      'b:Oi {A}. | a:Non ti parlo, {B}. | b:Mi hai appena parlato. | a:Era l\'ultima.',
    ],
    'pattobuono:si': [
      'a:{Cosa} di ieri, {B}. Buono. | b:Lo so, {A}. È il mio. | a:Ne avanza ancora?',
      'a:{B}, parola mantenuta. Bravo. | b:Sempre, {A}. Quasi sempre. | a:Mi basta il quasi.',
    ],
    'patto:si': [
      'a:Mi serve {cosa}, {B}. | b:Domani, {luogo}. {Prezzo}. | a:{Prezzo}? Per {cosa}? | b:Domani costa di più, {A}.',
      'a:Ce l\'hai {cosa}, {B}? | b:Domani. Dopo il lavoro, {luogo}. | a:Domani di sicuro? | b:Domani di sicuro, {A}.',
    ],
    'favore:no': [
      'a:Mi aiuti a {lavoro}, {B}? | b:Ho la schiena, {A}. | a:E ieri? | b:Ieri ce l\'avevo già.',
      'a:{B}, una mano a {lavoro}? | b:Oggi no, {A}. Oggi mi riposo da ieri.',
      'a:Fra, mi dai una mano a {lavoro}? | b:Ho da fare, {A}. | a:Cosa? | b:Niente. Ma è tutto mio.',
    ],
    'insieme:si': [
      'a:Mi aiuti a {lavoro}, {B}? {Quando}. | b:Ci sto. Ma la birra la paghi tu, {A}. | a:La birra sì. La pizza no.',
      'a:{B}, {quando} mi dai una mano a {lavoro}? | b:Va bene, {A}. Ti costa un pranzo. | a:Un panino. | b:Un panino buono.',
    ],
    'scippo:visto': [
      'c:{A}! Quello t\'ha preso il borsellino! | a:Il mio? ...Il MIO! Fermo, {B}! | b:Non mi avete visto!',
      'c:{A}, la borsa! È stato {B}! | a:{B}?! Ti conosco, sai! | b:Non sono io! È mio cugino!',
      'c:Al ladro! {A}, guarda la tasca! | a:Svuotata! Brutto stronzo! | b:Mi dispiace! Cioè, no!',
    ],
    'accusa:rende': [
      'a:Il borsellino, {B}. Ridammelo. | b:Quale bor... va bene. Tieni. | a:Mancano due, {B}. | b:Era il disturbo.',
      'a:{B}. I miei soldi. Adesso. | b:Ecco, {A}. Non lo dire a nessuno. | a:Lo dico a tutti.',
    ],
    'accusa:nega': [
      'a:Il borsellino, {B}. Ridammelo. | b:Quale borsellino? Ho il mio. | a:È il mio. C\'è la foto di mia madre. | b:...Bella donna.',
      'a:Sei tu, {B}. Ti hanno visto. | b:Mi hanno visto? Chi? | a:Gente. | b:La gente vede quello che vuole, {A}.',
      'a:Fra, ridammi i soldi. | b:Che soldi, {A}? | a:Quelli che hai in tasca, {B}. | b:Questi sono miei. Adesso.',
    ],
    'accusa:grigi': [
      'a:Il borsellino, {B}. Ridammelo. | b:Mai visto, {A}. | a:Agente! È {lui}! | g:Documenti. Tutti e due. Così facciamo prima.',
      'a:Agente! {B} mi ha derubato! | b:Io? Ero qui a fare niente! | g:Calma. Uno alla volta. Documenti.',
    ],
    'infamia:accusa': [
      'a:{Luogoev}, {B}. Lo so cos\'è successo. | b:Cos\'è successo? | a:Lo sanno tutti, {B}. | b:Tutti chi? Dimmi un nome.',
      'a:{B}. Ho saputo di {luogoev}. | b:Saputo cosa, {A}? | a:Brutta risposta.',
    ],
    'infamia:chi': [
      'a:{B}, vai dicendo in giro che sono stato io. | b:Io? Mai detto niente, {A}. | a:Allora chi te l\'ha detto?',
      'a:Hai messo in giro il mio nome, {B}. | b:Ho detto quello che ho sentito, {A}. | a:Allora senti questo: stai zitto.',
    ],
    'chiacchiera:si': [
      'a:Sai che c\'è, {B}? {Fatto} | b:E tu, {A}? | a:E io niente. Volevo dirlo a qualcuno.',
      'a:{B}, senti questa. {Fatto} | b:Ma dai, {A}. Racconta. | a:Ti ho raccontato. Era quella.',
      'a:{Fatto} | b:E me lo dici così, {A}? | a:Come te lo devo dire, {B}? Cantando?',
    ],
    'chiacchiera:si_g': ['a:Fra, {fatto0} | b:Seria, {A}? | a:Serissima, {B}.', 'a:Oi {B}. {Fatto} | b:E chi se ne frega, {A}. | a:Tu. Adesso.'],
    'sfotti:ok': [
      'a:Ancora con quella giacca, {B}? | b:Senti chi parla, {A}. Le scarpe di tuo nonno. | a:Mio nonno aveva gusto.',
      'a:{B}, hai la faccia di uno che ha perso a carte. | b:Ho perso con te, {A}. Quindi sì.',
    ],
    'sfotti:ok_g': ['a:{B}, come ti sei vestito? | b:Come uno che ha la ragazza, {A}. | a:Ah, ecco. Non ti riconoscevo.'],
    'sfotti:offesa': [
      'a:{B}, sei ingrassato? | b:Non ti permettere, {A}. | a:Era un complimento. | b:Non ti permettere lo stesso.',
      'a:Guarda chi c\'è. {B}, il grande esperto. | b:Questa me la segno, {A}. | a:Segnatela pure.',
    ],
    'sfotti:offesa_g': ['a:Fra, sembri un Grigio in libera uscita. | b:Fottiti, {A}. Sul serio.'],
    'apprezza:si': [
      'a:Bella giacca, {B}. | b:Grazie, {A}. Era di mio cognato. | a:E lui lo sa? | b:Adesso sì.',
      'a:Sei a posto, {B}. | b:Quanto ti serve, {A}? | a:Niente! Era un complimento.',
      'a:Rispetto, {B}. | b:Per cosa, {A}? | a:Non lo so. Ma rispetto.',
    ],
    'offri:si': [
      'a:Questo lo pago io, {B}. | b:Allora prendo il doppio, {A}. | a:Il doppio lo paghi tu.',
      'b:Grazie del bicchiere, {A}. | a:Non dirlo a mia moglie, {B}. Le ho detto che smetto.',
      'a:Offro io, {B}. | b:Chi sei, e cosa hai fatto ad {A}?',
    ],
    'gioca:vince': ['a:Ho vinto, {B}. {Soldi}. | b:Mi hai fregato col mazzo, {A}. | a:Il mazzo era tuo.', 'b:Un\'altra, {A}. | a:Hai già perso {soldi}, {B}. | b:Appunto. Li rivoglio.'],
    'gioca:perde': ['a:Hai barato, {B}. | b:Ho vinto, {A}. Ti brucia? | a:Mi brucia. Come prima.', 'b:{Soldi}, {A}. Sul tavolo. | a:Li volevo dare a mia madre, {B}. | b:Adesso li do io alla mia.'],
    'gioca:pari': ['b:Ancora una, {A}? | a:Ancora una e poi basta, {B}. | b:Lo dici sempre.'],
    'litiga:si': [
      'a:Ancora tu, {B}? Dopo {perche}? | b:Cosa vuoi, {A}? | a:Niente. Da te niente.',
      'a:{B}, {perche} me lo ricordo. | b:E allora, {A}? | a:E allora niente. Ma me lo ricordo.',
    ],
    'litiga:si_g': ['a:Fra, per {perche} non ti parlo. | b:Mi stai parlando, {A}. | a:Sto litigando, {B}. È diverso.'],
  };
  Vita.BANCHE = B;
  // gli esiti che sono un sì vero (il motore l'ha fatto o l'ha fissato): solo qui una riga può promettere
  const SI = new Set(['appunt:si', 'ricorda:si', 'debito:salda', 'debito:tardi', 'prestito:si', 'regalo:si', 'patto:si', 'insieme:si', 'accusa:rende', 'offri:si', 'attiv:offri', 'grazie:si', 'gioca:vince', 'gioca:perde', 'gioca:pari']);

  // ================= LA TAVOLA DEGLI INTENTI (anche da fuori) =================
  const INTENTI = {};
  Vita.INTENTI = INTENTI;
  function registraIntento(nome, def) { if (!nome || !def) return false; INTENTI[nome] = Object.assign({ peso: 1, si: [] }, def, { esterno: true }); return true; }
  Vita.registraIntento = registraIntento;

  // dal testo della variante alle righe vere; null se una riga non va (lunga, fuori contesto, promette senza un sì)
  function righe(st, v, ruoli, dati, si) {
    const X = Cm() && Cm().contesto, P = Pa(), V = S(st);
    const fill = t => t.replace(/\{(\w+)\}/g, (_, k) => {
      const K = k.toLowerCase(), r = ruoli[K];
      if (r && k.length === 1) return nm(r);
      let val = dati[k] !== undefined ? dati[k] : dati[K];
      if (val === undefined) return '{' + k + '}';
      val = String(val); return k[0] === k[0].toUpperCase() && k[0] !== k[0].toLowerCase() ? cap(val) : val;
    });
    const L = (Array.isArray(v) ? v : String(v).split(' | ').map(x => { const i = x.indexOf(':'); return [x.slice(0, i), x.slice(i + 1)]; })).map(([chi, t]) => [chi, fill(t)]);
    for (const [chi, t] of L) {
      const n = ruoli[chi]; if (!n || /\{\w+\}/.test(t)) return null;
      if (t.length > 70) { V.stats.lunghe++; return null; }
      if (P && P.promette(t) && !si) { V.stats.guardia++; return null; }
      if (X && chi !== 'g' && !X.vale(st, n, t, 'fondo')) { V.stats.contesto++; return null; }
    }
    return L;
  }
  // una variante dal mazzo (escono tutte prima di ripetersi), mai la stessa struttura di quella di prima
  function scegli(st, key, giovani, ruoli, dati, si) {
    const V = S(st), L0 = (giovani && B[key + '_g']) ? B[key + '_g'].concat(B[key] || []) : B[key] || [];
    if (!L0.length) return null;
    let m = V.mazzi[key]; if (!m || !m.length) m = V.mazzi[key] = L0.map((_, i) => i).sort(() => rnd() - .5);
    for (let k = 0; k < m.length; k++) {
      const i = m[(m.length - 1 - k)], v = L0[i]; if (v === undefined || v === V.ultimaStr) continue;
      const r = righe(st, v, ruoli, dati, si); if (!r) continue;
      m.splice(m.length - 1 - k, 1); V.ultimaStr = v; return r;
    }
    return null;
  }

  // ================= IL PALCO: la fila dei frammenti di matti.js =================
  const M = st => { const T = Mt(); return T && T.S ? T.S(st) : null; };
  const SCRITTI = new Set();
  function scritti() { if (SCRITTI.size) return SCRITTI; const T = Mt(); if (T) [].concat(T.FRAM || [], T.FRAM_G || []).forEach(F => F && F[0] && SCRITTI.add(F[0])); return SCRITTI; }
  // il posto nella fila: libero, e (salvo forza) i frammenti scritti tengono almeno la metà dei posti
  function postoLibero(st, forza) {
    const Q = M(st), p = st.player; if (!Q || !Q.ready) return false;
    if (p.indoor || p.vehicle || p.lv || st.chase || st.over) return false;
    if (Q.q.length || st.clock < Q.fram) return false;
    const V = S(st); return forza ? V.slot.vita <= V.slot.scritti + 1 : V.slot.vita < V.slot.scritti;
  }
  // in fila: A, B, A… (il Grigio e chi non è «ok» per matti.js parlano dalla fila di vita, a voce loro)
  function inFila(st, L, ruoli, info) {
    const Q = M(st), V = S(st), g = st.clock;
    L.forEach(([chi, text], i) => {
      const n = ruoli[chi], at = g + i * CFG.gap;
      if (chi === 'g') V.dq.push({ id: n.id, text, at, g }); else Q.q.push({ id: n.id, text, at, g });
    });
    Q.fram = st.clock + CFG.fram[0] + rnd() * (CFG.fram[1] - CFG.fram[0]);
    const a = ruoli.a, b = ruoli.b; if (a && b) { a.face = Math.atan2(b.y - a.y, b.x - a.x); b.face = Math.atan2(a.y - b.y, a.x - b.x); }
    V.stats.scambi++; V.slot.vita++; V.stats.per[info.key] = (V.stats.per[info.key] || 0) + 1;
    const G0 = Object.assign({ g, fine: g + (L.length - 1) * CFG.gap, righe: L.map(([c, t]) => ({ id: ruoli[c].id, t })), sentito: false, finito: false }, info);
    V.gruppi.push(G0); if (V.gruppi.length > 12) V.gruppi.shift();
    return G0;
  }
  // il giro delle file: chi ha sentito (la prima battuta è uscita) e chi ha finito (è uscita l'ultima)
  function giroFile(st) {
    const V = S(st), C = Cm(), Q = M(st);
    for (const Gr of V.gruppi) {
      if (Gr.finito || Gr.perso) continue;
      if (!Gr.sentito && st.clock >= Gr.g) {
        const R = C && C.R && C.R.fram; const h = R ? R.get(Gr.g) : (() => { const n = G.byId(st, Gr.righe[0].id); return !!(n && n.bark && n.bark.text === Gr.righe[0].t); })();
        if (h === true) { Gr.sentito = true; V.stats.sentiti++; V.stats.sentitiPer = V.stats.sentitiPer || {}; V.stats.sentitiPer[Gr.key] = (V.stats.sentitiPer[Gr.key] || 0) + 1; try { if (Gr.alSentito) Gr.alSentito(st); } catch (e) { } }
        else if (h === false || st.clock > Gr.g + 1.5) { Gr.perso = true; continue; }
      }
      if (Gr.sentito && st.clock >= Gr.fine + .05) {
        const last = Gr.righe[Gr.righe.length - 1], n = G.byId(st, last.id);
        const inQ = Q && Q.q.some(x => x.g === Gr.g) || V.dq.some(x => x.g === Gr.g);
        if (!inQ) { Gr.finito = true; if (n && n.bark && (n.bark.text === last.t || n.bark.until > st.clock)) { V.stats.finiti++; try { if (Gr.allaFine) Gr.allaFine(st); } catch (e) { } } }
      }
    }
    // la fila di vita: il Grigio e gli altri che parlano a voce loro
    if (V.dq.length) {
      const p = st.player;
      V.dq = V.dq.filter(x => { if (x.at > st.clock) return true; const n = G.byId(st, x.id); if (alive(n) && !n.inside && hyp(n.x - p.x, n.y - p.y) < 22) G.say(st, n, x.text, 3.2); return false; });
    }
  }

  // ================= LO SCAMBIO =================
  // sub: { key: 'intento:esito', a, b, c?, g?, dati, si?, causa?, alSentito?, allaFine?, perche: testo per il diario, forza }
  function mettiInScena(st, sub) {
    S(st).ultimoPasso = sub.key;
    const ruoli = { a: sub.a, b: sub.b }; if (sub.c) ruoli.c = sub.c; if (sub.g) ruoli.g = sub.g;
    const gio = giovane(sub.a) && giovane(sub.b);
    const si = sub.si !== undefined ? sub.si : SI.has(sub.key);
    const L = sub.varianti ? (() => { for (const v of sub.varianti.slice().sort(() => rnd() - .5)) { const r = righe(st, v, ruoli, sub.dati || {}, si); if (r) return r; } return null; })() : scegli(st, sub.key, gio, ruoli, sub.dati || {}, si);
    if (!L) return null;
    const a = sub.a, b = sub.b, causa = sub.causa || null;
    return inFila(st, L, ruoli, {
      key: sub.key, a: a.id, b: b.id, causa,
      // il perché nel diario quando la prima battuta è uscita; se lo scambio è lungo, alla fine anche chi ha risposto se lo segna
      alSentito: st2 => { if (sub.perche) note(st2, sub.perche[0], sub.perche[1], sub.perche[2] || 'info', { who: sub.perche[3].id, w: .2, tag: sub.perche[4] || 'detto', causa, vita: 1 }); if (sub.alSentito) sub.alSentito(st2); },
      allaFine: st2 => {
        if (sub.perche && L.length >= 4) note(st2, sub.perche[3], `ne ha parlato con ${nm(sub.perche[0])}`, 'info', { who: sub.perche[0].id, w: .1, tag: 'detto', causa, vita: 1 });
        if (sub.allaFine) sub.allaFine(st2);
      },
    });
  }

  // la regia dei fumetti: un fatto del motore fatto partire da vita non deve lasciare le frasi generiche (A dice la sua, B pure)
  function zitti(st, ns, fn) {
    const C = Cm(), R = C && C.R, s0 = R ? [R.lastAmb, R.gap] : null, prima = ns.map(n => n && n.bark), V = S(st), m0 = V.__mio;
    let out; V.__mio = true; try { out = fn(); } finally { V.__mio = m0;
      ns.forEach((n, i) => { if (n && n.bark && n.bark !== prima[i]) n.bark = null; });
      if (R) { R.lastAmb = s0[0]; R.gap = s0[1]; }
    }
    return out;
  }

  // la promessa fra due NPC (parola.js, fra:true), sentita dal giocatore
  function promessaFra(st, o0, testo, causa) {
    const P = Pa(); if (!P || !P._.nuovaPromessa) return null;
    const p = P._.nuovaPromessa(st, Object.assign({ fra: true, canale: 'strada', thread: null, causa: causa || null }, o0));
    S(st).stats.promesse++;
    return p;
  }
  function sentita(st, ids, testo) { const V = S(st); V.sentite.unshift({ ids: ids.filter(Boolean), testo, t: st.t }); if (V.sentite.length > 20) V.sentite.pop(); }
  // le conseguenze di una promessa fra (Parola.EXT.fra): il motore ha già scritto le note; qui il registro dei fatti
  function conseguenzeFra(st, p) {
    const V = S(st);
    if (p.stato === 'fatta') { V.stats.fatte++; fatto('parola_mantenuta', [p.chi, p.a], { desc: p.desc }, p.causa); }
    else if (p.stato === 'rotta' || p.stato === 'scaduta') {
      V.stats.rotte++; const f = fatto('parola_rotta', [p.chi, p.a], { desc: p.desc }, p.causa);
      if (p.verbo === 'appuntamento') V.buche[p.a + '>' + p.chi] = f;
    }
  }

  // ================= I CONTI APERTI (dalla memoria che c'è) =================
  // ogni funzione: (st, a, b) → sub o null. a è chi apre bocca.
  const detto = (st, k, giorni) => { const V = S(st), t = V.detti[k]; return t !== undefined && st.t - t < (giorni || 1) * 1440; };
  const segna = (st, k) => { S(st).detti[k] = st.t; };
  const FURTO_TXT = /^(scippat|derubat|.* ha visto: è stat)/;
  function contoFurto(st, a, b) {
    const e = recentNote(st, a, x => x.tag === 'furto' && x.who === b.id && x.kind === 'bad' && FURTO_TXT.test(x.text), 4); if (!e) return null;
    const k = chiave(a, b, 'furto' + e.t); if (detto(st, k, 30)) return null;
    const V = S(st), caus = e.causa || fatto('furto', [b.id, a.id], { quando: e.t }, null);
    const cop = grigioVicino(st, a.x, a.y, 20), tes = st.npcs.some(k2 => k2 !== a && k2 !== b && alive(k2) && !k2.inside && hyp(k2.x - a.x, k2.y - a.y) < 6) || near(st, a, 8);
    // l'esito, dal motore: i Grigi, chi rende, la lite (e la rissa, se la heat di quarrel lo dice)
    let esito, f;
    if (cop && a.tr.legge > .45) {
      esito = 'grigi'; V.stats.denunce++;
      G.addMemory(st, cop, { eventId: 'v' + e.t, type: 'scippo', actor: b.id, target: a.id, owner: a.id, place: e.place || '', t: e.t, conf: .8, source: 'denuncia', via: [a.first] });
      f = fatto('denuncia', [a.id, b.id, cop.id], {}, caus); note(st, a, `ha denunciato ${b.first} all'agente`, 'info', { who: b.id, w: .4, tag: 'denuncia', causa: f });
    } else if (b.tr.cor < .4 && tes && b.pop.money > 1) {
      esito = 'rende'; const v = Math.min(8, b.pop.money); b.pop.money -= v; a.pop.money += v;
      f = fatto('restituito', [b.id, a.id], { v }, caus);
      note(st, a, `${b.first} gli ha ridato ${soldiW(v)}.000 lire, davanti a tutti`, 'good', { who: b.id, w: .4, tag: 'furto_chiuso', causa: f });
      note(st, b, `ha dovuto ridare i soldi a ${a.first}`, 'bad', { who: a.id, w: .4, causa: f });
    } else {
      const r0 = st.pop.stats.risse || 0;
      zitti(st, [a, b], () => { try { Az().quarrel(st, a, b, 'il furto'); } catch (x) { } });
      f = fatto('lite', [a.id, b.id], { why: 'il furto' }, caus);
      if ((st.pop.stats.risse || 0) > r0) { segna(st, k); V.stats.accuse++; fatto('rissa', [a.id, b.id], {}, f); return { muto: true }; }
      esito = 'nega';
    }
    segna(st, k); V.stats.accuse++;
    return { key: 'accusa:' + esito, a, b, g: esito === 'grigi' ? cop : null, dati: { lui: b.pop.sex === 'f' ? 'lei' : 'lui' }, causa: f, perche: [b, `${a.first} gli ha chiesto indietro i soldi in faccia`, 'bad', a, 'accusa'] };
  }
  function contoInfamia(st, a, b) {
    const m = (a.mem || []).find(x => x.framedBy && x.framedBy !== 'player' && x.actor === b.id && x.conf > .4 && st.t - x.t < 3 * 1440);
    if (!m) return null; const k = chiave(a, b, 'inf' + m.eventId); if (detto(st, k, 30)) return null;
    segna(st, k);
    const caus = fatto('infamia_creduta', [a.id, b.id, m.framedBy], { ev: m.eventId }, null);
    const r0 = st.pop.stats.risse || 0;
    zitti(st, [a, b], () => { try { Az().quarrel(st, a, b, m.place ? `per ${aLuogo(m.place)}` : 'quella storia'); } catch (x) { } });
    const f = fatto('lite', [a.id, b.id], { why: 'infamia' }, caus);
    // è falsa: l'accusato sa che non è stato lui, e sa chi lo dice in giro (se l'ha detto qualcuno: la via della voce)
    const fr = G.byId(st, m.framedBy);
    if (fr && fr !== b && !(m.trueActor && m.trueActor === b.id)) note(st, b, `${fr.first} mette in giro che è stato lui`, 'bad', { who: fr.id, w: .5, tag: 'tradimento', causa: f });
    if ((st.pop.stats.risse || 0) > r0) return { muto: true };
    return { key: 'infamia:accusa', a, b, dati: { luogoev: m.place ? aLuogo(m.place) : 'quella storia' }, causa: f, perche: [b, `${a.first} gli ha rinfacciato una cosa che non ha fatto`, 'bad', a, 'accusa'] };
  }
  function contoInfamiaChi(st, a, b) {   // a sa che b mette in giro il suo nome
    const e = recentNote(st, a, x => x.tag === 'tradimento' && x.who === b.id && / mette in giro /.test(x.text), 3); if (!e) return null;
    const k = chiave(a, b, 'chi' + e.t); if (detto(st, k, 30)) return null; segna(st, k);
    bump(st, a, b, -.15); const f = fatto('rancore', [a.id, b.id], {}, e.causa);
    return { key: 'infamia:chi', a, b, causa: f, perche: [b, `${a.first} gli ha chiesto conto delle voci`, 'bad', a, 'lite'] };
  }
  function contoDebito(st, a, b) {   // a creditore, b debitore
    const D = b.pop.debiti && b.pop.debiti[a.id]; if (!D || D.v < 1) return null;
    const V = S(st), k = chiave(a, b, 'deb' + day(st)); if (detto(st, k, 1)) return null;
    const honest = b.tr ? b.tr.legge * .5 + (1 - b.tr.avid) * .5 : .5;
    // il saldo di persona: stessa formula di scambi.settle
    if (b.pop.money > D.v + 15 && rnd() < .3 + honest * .6) {
      const v = D.v, tardi = D.scad && st.t > D.scad; b.pop.money -= v; a.pop.money += v; delete b.pop.debiti[a.id]; segna(st, k);
      const f = fatto('saldato', [b.id, a.id], { v, tardi: !!tardi }, D.causa); V.stats.saldiDiPersona++;
      note(st, a, tardi ? `${b.first} ha saldato il debito (${soldiW(v)}.000 lire): paga, ma tardi` : `${b.first} ha saldato il debito (${soldiW(v)}.000 lire)`, 'good', { who: b.id, w: tardi ? .25 : .35, tag: 'favore', causa: f });
      note(st, b, `saldato il debito con ${a.first}, di persona`, 'info', { who: a.id, w: .25, causa: f });
      bump(st, a, b, tardi ? .02 : .05);
      if (D.pid) { const P = Pa(), p = P && P._.S(st).promesse.find(x => x.id === D.pid); if (p) P._.chiudi(st, p, 'fatta', tardi ? 'pagato, ma tardi' : 'pagato'); }
      const scadW = D.scad ? G.dayName(D.scad) : 'La settimana scorsa', quanto = D.scad ? Math.max(1, Math.round((st.t - D.scad) / 1440)) : 2;
      return { key: tardi ? 'debito:tardi' : 'debito:salda', a: b, b: a, dati: { soldi: soldiW(v), scad: scadW, quanto: quanto === 1 ? 'un giorno' : NUM[Math.min(quanto, 20)] + ' giorni' }, causa: f, perche: [a, `${b.first} gli ha reso i soldi di persona`, 'good', b, 'favore'] };
    }
    // il rinfaccio: debito scaduto (o vecchio di due giorni); la seconda volta l'amicizia si rompe
    const scaduto = D.scad ? st.t > D.scad : st.t - D.t > 2 * 1440; if (!scaduto) return null;
    segna(st, k); D.rinf = (D.rinf || 0) + 1; V.stats.rinfacci++;
    const f = fatto('rinfacciato', [a.id, b.id], { v: D.v, volta: D.rinf }, D.causa);
    if (D.rinf >= 2) { a.pop.friends = (a.pop.friends || []).filter(x => x !== b.id); bump(st, a, b, -.1); note(st, a, `con ${b.first} ha chiuso: non rende i soldi`, 'bad', { who: b.id, w: .5, tag: 'tradimento', causa: f }); }
    return { key: D.rinf >= 2 ? 'debito:rottura' : 'debito:rinfaccia', a, b, dati: { soldi: soldiW(D.v) }, causa: f, perche: [b, `${a.first} gli ha ricordato il debito, in faccia`, 'bad', a, 'debito'] };
  }
  function scusaDi(st, b, t) {
    const P = b.pop, vera = recentNote(st, b, x => /^(fermat|.*ferit)/.test(x.text) && Math.abs(x.t - t) < 600, 3);
    if (vera) return [true, /^fermat/.test(vera.text) ? 'Ero in cella, {A}.' : 'Ero all\'ambulatorio, {A}. Coi punti.'];
    const dd = (P.yesterday || []).concat(P.today || []).filter(x => x.t <= t + 30).sort((x, y) => y.t - x.t)[0];
    const lb = dd ? dd.label : '';
    if (/sonno|dorm|letto/.test(lb)) return [false, 'Dormivo, {A}.'];
    if (/lavor/.test(lb)) return [false, 'Lavoravo, {A}. Qualcuno deve.'];
    if (/casa/.test(lb)) return [false, 'Ero a casa. Mi è passato di mente.'];
    const m = lb.match(/\(([^)]+)\)$/) || lb.match(/ a ([A-Z][^()]+)$/);
    if (m && m[1].length < 24) return [false, `Ero ${aLuogo(m[1])}, {A}.`];
    return [false, 'Mi è passato di mente, {A}.'];
  }
  function contoBuca(st, a, b) {
    const e = recentNote(st, a, x => x.tag === 'bidone' && x.who === b.id, 3); if (!e) return null;
    const k = chiave(a, b, 'buca' + e.t); if (detto(st, k, 30)) return null; segna(st, k);
    const V = S(st), [vera, sc] = scusaDi(st, b, e.t), caus = V.buche[a.id + '>' + b.id] || e.causa || fatto('buca', [b.id, a.id], {}, null);
    let f; if (vera) f = fatto('scusa_vera', [b.id, a.id], {}, caus);
    else { bump(st, a, b, -.08); f = fatto('scusa_falsa', [b.id, a.id], {}, caus); note(st, a, `${b.first} gli ha dato buca e la scusa non regge`, 'bad', { who: b.id, w: .3, tag: 'scusa', causa: f }); }
    V.stats.rinfacci++;
    const ora = cap(oraW(e.t - 35));
    return { key: vera ? 'buca:vera' : 'buca:falsa', a, b, dati: { scusa: sc.replace('{A}', nm(a)), ora }, causa: f, perche: [b, `${a.first} gli ha rinfacciato la buca`, 'info', a, 'detto'] };
  }
  function contoMemoria(st, a, b) {   // il favore ricevuto, l'offesa, il patto tenuto: una volta
    const e = recentNote(st, a, x => x.who === b.id && (((x.tag === 'favore' || x.tag === 'insieme') && x.kind === 'good') || x.tag === 'offesa' || (x.tag === 'patto' && x.kind === 'good' && /mantenuto/.test(x.text))), 2);
    if (!e) return null; const k = chiave(a, b, 'mem' + e.t); if (detto(st, k, 30)) return null; segna(st, k);
    const f = fatto(e.tag === 'offesa' ? 'muso' : 'ricordo', [a.id, b.id], {}, e.causa);
    if (e.tag === 'offesa') return { key: 'muso:si', a, b, causa: f, perche: [b, `${a.first} gli tiene il muso`, 'bad', a, 'detto'] };
    bump(st, b, a, .03);
    if (e.tag === 'patto') { const m = e.text.match(/parola: (.+) consegnat/); return { key: 'pattobuono:si', a, b, dati: { cosa: m ? m[1] : 'la roba' }, causa: f, perche: [b, `${a.first} gli ha detto che era roba buona`, 'good', a, 'detto'] }; }
    return { key: 'grazie:si', a, b, causa: f, perche: [b, `${a.first} gli ha detto grazie per il favore`, 'good', a, 'detto'] };
  }
  function contoAppuntamento(st, a, b) {   // l'arrivo all'appuntamento, o il promemoria
    const ap = a.pop.appt; if (!ap || ap.with !== b.id) return null;
    const bp = b.pop.appt; if (!bp || bp.with !== a.id || bp.t !== ap.t) return null;
    if (st.t >= ap.t - 20 && st.t <= ap.t + 50) {
      if (ap.__vArr || !a.pop.apptArrived || !b.pop.apptArrived) return null; ap.__vArr = true;
      const tardi = Math.max(a.pop.apptArrived, b.pop.apptArrived) - ap.t, V = S(st);
      // la cosa per cui si erano visti, con un verbo vero (social del motore)
      const wh = (ap.label || '') + ' ' + (ap.why || ''), bar = /Osteria|Bar|Circolo|Sirena|Trattoria|Birreria/.test(ap.label || '');
      let kind = bar && a.pop.money > 15 ? 'offri' : /carte|partita/.test(wh) || bar ? 'gioca' : null;
      const m0 = a.pop.money; let att = null;
      if (kind) zitti(st, [a, b], () => { try { Az().social(st, a, b, kind); } catch (x) { } });
      const dm = a.pop.money - m0;
      if (kind === 'offri' && dm < 0) att = 'offri'; else if (kind === 'gioca') att = dm > 0 ? 'vince' : dm < 0 ? 'perde' : 'pari';
      const f = fatto('incontro', [a.id, b.id], { dove: ap.label, att }, ap.__vf || null);
      V.stats.incontriVisti++;
      const giro = { key: 'arrivo:' + (tardi > 12 ? 'ritardo' : 'puntuale'), a, b, dati: { ora: cap(oraW(ap.t)), tardi: ritardoW(tardi), soldi: soldiW(Math.abs(dm)) }, causa: f, perche: [b, `visto ${a.first} ${aLuogo(ap.label)}, come d'accordo`, 'good', a, 'appuntamento'] };
      if (att) { const ruoli = { a, b }, L2 = scegli(st, 'attiv:' + att, false, ruoli, giro.dati, true); if (L2) giro.coda = L2; }
      return giro;
    }
    if (ap.t > st.t && ap.t - st.t < 600 && !ap.__vRic) {
      ap.__vRic = true; const f = fatto('promemoria', [a.id, b.id], {}, ap.__vf || null);
      return { key: 'ricorda:si', a, b, dati: { quando: quandoW(st, ap.t), luogo: aLuogo(ap.label) }, causa: f, perche: [b, `${a.first} gli ha ricordato l'appuntamento`, 'info', a, 'detto'] };
    }
    return null;
  }
  const CONTI = [contoFurto, contoInfamia, contoInfamiaChi, contoDebito, contoAppuntamento, contoBuca, contoMemoria];

  // ================= I FATTI FRESCHI DEL MOTORE (vicino al giocatore) =================
  // le note appena scritte nei diari: il patto di scambi.promise, il favore negato e l'aiuto fissato di convivenza, gli
  // appuntamenti di makeAppointments; e quello che Azioni.CFG.talk ha appena visto passare
  function scanDiari(st, vicini) {
    const V = S(st);
    for (const n of vicini) {
      const D = n.pop && n.pop.diary; if (!D) continue; const t0 = V.scanT[n.id] === undefined ? st.t - 1 : V.scanT[n.id]; V.scanT[n.id] = st.t;
      for (let i = D.length - 1; i >= 0; i--) {
        const e = D[i]; if (e.t <= t0) break; if (!e.who || e.who === 'player' || e.vita) continue;
        const k = G.byId(st, e.who); if (!k || !vicini.includes(k)) continue;
        let m;
        if (e.tag === 'patto' && (m = e.text.match(/^promesso (.+) a \S+ per domani$/))) V.pend.push({ tipo: 'patto', a: k, b: n, cosa: m[1], at: st.clock });
        else if ((m = e.text.match(/^chiesto a \S+ di aiutarlo a (.+), ma ha detto di no$/))) V.pend.push({ tipo: 'favore_no', a: n, b: k, lavoro: m[1], at: st.clock });
        else if (/^preso appuntamento con /.test(e.text) && n.pop.appt && n.pop.appt.with === k.id) V.pend.push({ tipo: 'appunt', a: n, b: k, at: st.clock });
      }
    }
    if (V.pend.length > 8) V.pend.splice(0, V.pend.length - 8);
  }
  function daPendente(st, x) {
    const a = x.a, b = x.b, ap = a.pop.appt;
    if (x.tipo === 'patto') {
      const sap = b.pop.appt; if (!sap || sap.with !== a.id || !sap.deal) return null;
      const f = fatto('patto', [b.id, a.id], { cosa: x.cosa }, null); sap.__vf = f;
      return { key: 'patto:si', a, b, dati: { cosa: x.cosa, luogo: aLuogo(sap.label), prezzo: soldiW(sap.deal.price || 1) + ' mila' }, causa: f,
        alSentito: st2 => { const p = promessaFra(st2, { chi: b.id, a: a.id, verbo: 'consegna', desc: `${b.first} porta ${x.cosa} a ${a.first}, ${quandoW(st2, sap.t)} ${aLuogo(sap.label)}`, link: { tipo: 'appt', obj: sap }, dove: sap.label, quando: { t0: st2.t, at: sap.t } }, '', f); sentita(st2, [p && p.id], null); },
        perche: [a, `${b.first} gliel'ha promesso davanti a tutti`, 'info', b, 'patto'] };
    }
    if (x.tipo === 'favore_no') { const f = fatto('favore_negato', [b.id, a.id], { lavoro: x.lavoro }, null); return { key: 'favore:no', a, b, dati: { lavoro: x.lavoro }, causa: f, perche: [b, `${a.first} ci è rimasto male per il no`, 'info', a, 'detto'] }; }
    if (x.tipo === 'appunt' && ap && ap.with === b.id && ap.t > st.t) {
      const f = ap.__vf || (ap.__vf = fatto('appuntamento', [a.id, b.id], { t: ap.t, dove: ap.label }, null));
      const ins = ap.deal && ap.deal.kind === 'insieme';
      return Object.assign(subAppunt(st, a, b, ap, f, ins ? 'insieme:si' : 'appunt:si'), ins ? { dati: { quando: quandoW(st, ap.t), lavoro: ap.deal.label, luogo: aLuogo(ap.label) } } : {});
    }
    return null;
  }
  function subAppunt(st, a, b, ap, f, key) {
    return { key, a, b, dati: { quando: quandoW(st, ap.t), luogo: aLuogo(ap.label), ora: cap(oraW(ap.t)) }, causa: f,
      alSentito: st2 => {
        const V = S(st2); V.stats.appPresi++;
        const desc = `${a.first} e ${b.first}, ${ap.why || 'si vedono'} ${aLuogo(ap.label)} ${quandoW(st2, ap.t)}`;
        const p1 = promessaFra(st2, { chi: a.id, a: b.id, verbo: 'appuntamento', desc, link: { tipo: 'appt', obj: a.pop.appt }, dove: ap.label, quando: { t0: st2.t, at: ap.t } }, '', f);
        const p2 = b.pop.appt && b.pop.appt.with === a.id ? promessaFra(st2, { chi: b.id, a: a.id, verbo: 'appuntamento', desc, link: { tipo: 'appt', obj: b.pop.appt }, dove: ap.label, quando: { t0: st2.t, at: ap.t } }, '', f) : null;
        sentita(st2, [p1 && p1.id, p2 && p2.id], null);
      },
      perche: [b, `ha preso appuntamento con ${a.first}, ${quandoW(st, ap.t)}`, 'info', a, 'appuntamento'] };
  }
  function installaTalk() {   // Azioni.CFG.talk, in catena con la Mente: si segna il fatto (l'esito arriva dopo, nello stesso passo)
    const A = Az(); if (!A || !A.CFG || A.CFG.talk === talkV) return;
    const prev = A.CFG.talk; talkV.prev = prev; A.CFG.talk = talkV;
  }
  function talkV(st, a, b, kind) {
    if (talkV.prev) try { talkV.prev(st, a, b, kind); } catch (e) { }
    if (!st || !a || !b || !a.pop || !b.pop || !near(st, a, CFG.R) || !near(st, b, CFG.R)) return;
    const V = S(st); if (V.__mio) return;
    const d = hyp(a.x - st.player.x, a.y - st.player.y);
    if (d > CFG.palco[1]) { if (!a.inside && !b.inside) { a.face = Math.atan2(b.y - a.y, b.x - a.x); b.face = a.face + Math.PI; } fatto('social', [a.id, b.id], { kind, lontano: true }, null); return; }   // il gesto, senza fumetto
    const x = { tipo: 'social', a, b, kind, m0: a.pop.money, r0: st.pop.stats.risse || 0, at: st.clock, bark: a.bark };
    // l'incontro del motore, qui davanti: al posto della frase generica di A, lo scambio (subito dopo il passo, §2)
    if (d > CFG.palco[0] && ok(st, a) && ok(st, b) && st.clock - (V.lastSoc || -1e9) > CFG.soc && !V.subito) V.subito = x; else V.pend.push(x);
  }
  // dopo il passo: l'incontro appena fatto dal motore diventa lo scambio. Prima il conto aperto fra i due, poi le cose nuove
  // (l'appuntamento, il regalo), poi quello che social ha appena fatto. La frase generica di A si spegne nello stesso fotogramma.
  function subito(st) {
    const V = S(st), x = V.subito; V.subito = null; if (!x) return;
    const Q = M(st), a = x.a, b = x.b; if (!Q || !Q.ready || Q.q.length || !ok(st, a) || !ok(st, b)) return;
    if ((st.pop.stats.risse || 0) > x.r0) return;
    const C = Cm(), R = C && C.R, R0 = V.R0;
    const pr = (() => { if (!R || !R0) return prontoPalco(st); const l = R.lastAmb, g = R.gap; R.lastAmb = R0[0]; R.gap = R0[1]; const r = prontoPalco(st, [a]); R.lastAmb = l; R.gap = g; return r; })();
    if (pr !== true) return;
    let sub = null;
    for (const [p, q] of [[a, b], [b, a]]) { for (const Cf of CONTI) { try { sub = Cf(st, p, q); } catch (e) { } if (sub) break; } if (sub) break; }
    if (!sub) { const d0 = day(st); for (const f of (V.appG[d0] || 0) < 1 ? [proponiAppuntamento, regalo] : [regalo]) { sub = f(st, a, b) || f(st, b, a); if (sub) break; } }
    if (!sub) sub = eseguiSociale(st, a, b, x.kind, x.kind === 'chiacchiera' ? racconto(st, a, b) : null, x);
    if (!sub || sub.muto || !sub.key) return;
    if (a.bark && a.bark === x.bark) a.bark = null; if (b.bark && b.bark.until > st.clock && st.clock - (b.bark.until - 3) < .2) b.bark = null;
    if (R && R0) { R.lastAmb = R0[0]; R.gap = R0[1]; }
    V.ultima[chiave(a, b, '')] = st.clock;
    const G0 = mettiInScena(st, sub); if (G0) { V.lastSoc = st.clock; if (sub.coda) appendiCoda(st, G0, sub); }
  }

  // ================= LE COSE NUOVE (le decide il motore; vita le fa partire vicino al giocatore) =================
  const legame = (st, a, b) => (a.pop.friends || []).includes(b.id) || (a.pop.hh && a.pop.hh === b.pop.hh) || relA(st, a, b) > .3;
  // chi si dà appuntamento: chi si conosce, o chi si sente solo e vuole conoscere qualcuno (il progetto «compagnia» di popolo.js)
  const cerca = (st, a, b) => legame(st, a, b) || ((a.pop.need || {}).compagnia > .35 && opin(st, a, b.id) > -.1);
  const ESTERNI = ['fontana', 'piazza', 'molo', 'calata', 'lungomare', 'passeggiata', 'giardini', 'mercato', 'sagrato', 'pontile'];
  function proponiAppuntamento(st, a, b) {
    const V = S(st), d = day(st); if ((V.appG[d] || 0) >= CFG.appGiorno) return null;
    if (!cerca(st, a, b) || a.pop.appt || opin(st, a, b.id) < -.1) return null;
    const P = Po(), I = P && P._; if (!I || !I.appoint) return null;
    const h = G.hour(st), base = d * 1440;
    // fuori dai pasti (a pranzo e a cena si sta a casa): il pomeriggio, o domani a metà mattina
    const when = h < 15 ? base + (17 + Math.floor(rnd() * 2)) * 60 + pick([0, 30]) : h < 17 ? base + (h + 2) * 60 + pick([0, 30]) : (d + 1) * 1440 + pick([10.5, 11, 11.5, 16.5, 17, 17.5, 18]) * 60;
    if (when <= st.t + 30) return null;
    const ref = pick(ESTERNI.filter(k => G.PLACES[k])); if (!ref) return null;
    const wm = when % 1440, wdw = ((Math.floor(when / 1440)) + 1) % 7;
    const free = k => !k.pop.job || k.pop.job.night || wdw === 6 || wm < k.pop.job.start * 60 - 60 || wm > k.pop.job.end * 60 + 15;   // come makeAppointments
    const luogo = aLuogo((G.PLACES[ref] || {}).name || ref), dati = { quando: quandoW(st, when), luogo, ora: cap(oraW(when)) };
    if (!free(a)) return null;
    V.appG[d] = (V.appG[d] || 0) + 1;
    if (b.pop.appt) { const f = fatto('appuntamento_no', [a.id, b.id], { perche: 'impegno' }, null); return { key: 'appunt:impegno', a, b, dati, causa: f, perche: [a, `${b.first} aveva già un impegno`, 'info', b, 'detto'] }; }
    if (!free(b)) { const f = fatto('appuntamento_no', [a.id, b.id], { perche: 'lavoro' }, null); return { key: 'appunt:lavoro', a, b, dati, causa: f, perche: [a, `${b.first} non può, lavora`, 'info', b, 'detto'] }; }
    const why = (a.pop.ints || []).some(x => x.k === 'carte') && (b.pop.ints || []).some(x => x.k === 'carte') ? 'una partita a carte' : pick(['due chiacchiere', 'un bicchiere', 'notizie di famiglia']);
    const ap = I.appoint(st, a, b, ref, when, why); if (!ap) return null;
    const f = ap.__vf = fatto('appuntamento', [a.id, b.id], { t: when, dove: ap.label }, null); if (ap.twin) ap.twin.__vf = f;
    return subAppunt(st, a, b, ap, f, 'appunt:si');
  }
  function regalo(st, a, b) {
    const V = S(st), d = day(st), SC = Sc(); if (!SC || V.regali[a.id] === d || V.regali['>' + b.id] === d) return null;
    if (!a.tr || a.tr.avid >= .5 || !(relA(st, a, b) > .25 || (a.pop.hh && a.pop.hh === b.pop.hh) || (a.pop.friends || []).includes(b.id))) return null;
    const vuole = SC.wants(st, b), ha = SC.surplus(a); const id = ha.find(x => vuole.some(w => w.ids.includes(x))); if (!id) return null;
    V.regali[a.id] = d; V.regali['>' + b.id] = d;
    const h0 = SC.has(b, id);
    zitti(st, [a, b], () => { try { V.__mio = true; Az().social(st, a, b, 'regala', { oggetto: id }); } catch (x) { } finally { V.__mio = false; } });
    if (SC.has(b, id) <= h0) {   // social regala usa le tasche: la roba di casa passa a mano, con lo stesso effetto
      if (!SC.take(a, id, 1)) return null; SC.put(b, id, 1); bump(st, b, a, .25); note(st, b, `${a.first} gli ha regalato ${cosaW(id)}`, 'good', { w: .5, who: a.id });
    }
    const f = fatto('regalo', [a.id, b.id], { id }, null); V.stats.regali++;
    const Dd = b.pop.debiti = b.pop.debiti || {}; Dd[a.id] = Dd[a.id] || { v: 0, t: st.t, why: 'regalo' }; Dd[a.id].v += 2; Dd[a.id].why = 'regalo'; Dd[a.id].causa = f;   // un debito di favore piccolo
    if (st.scambi && st.scambi.stats) st.scambi.stats.regali++;
    return { key: 'regalo:si', a, b, dati: { cosa: cosaW(id) }, causa: f, perche: [a, `regalato ${cosaW(id)} a ${b.first}`, 'good', b, 'regalo'] };
  }
  // il furto vicino: uno al giorno, solo col movente vero (fame, vizio, debito) e senza Grigi
  function furto(st, vicini) {
    const V = S(st), d = day(st); if ((V.furti[d] || 0) >= CFG.furtiGiorno || G.hour(st) < 8 || G.hour(st) > 21) return;
    const A = Az(); if (!A) return;
    for (const t of vicini) {
      if (!ok(st, t) || !t.tr || t.tr.legge >= .4 || t.pop.cast) continue;
      const N = t.pop.need || {}, movente = N.fame > .7 ? 'fame' : N.soldi > .7 ? 'soldi' : t.pop.debt ? 'debito' : (t.pop.vice === 'gioco' || t.pop.vice === 'roba') ? 'vizio' : null;
      if (!movente) continue;
      const hh = t.pop.hh, v = vicini.find(k => k !== t && ok(st, k) && k.pop.money > 10 && k.pop.hh !== hh && hyp(k.x - t.x, k.y - t.y) < 15);
      if (!v || grigioVicino(st, t.x, t.y, 25)) continue;
      const r = A.intend(st, t, 'ruba', { modo: 'scippo', chi: v }, 3); if (!r || !r.ok) continue;
      V.furti[d] = (V.furti[d] || 0) + 1; V.stats.furti++;
      V.ladro = { t: t.id, v: v.id, f: fatto('movente', [t.id], { movente }, null), at: st.clock };
      return;
    }
  }
  function dopoFurto(st) {   // lo scippo è successo (azioni.js: soldi, note, testimoni): il testimone e la vittima parlano
    const V = S(st), L = V.ladro; if (!L) return null; if (st.clock - L.at > 90) { V.ladro = null; return null; }
    const ev = st.events.find(e => e.type === 'scippo' && e.actor === L.t && st.t - e.t < 20); if (!ev) return null;
    V.ladro = null;
    const t = G.byId(st, L.t), v = G.byId(st, L.v); if (!t || !v) return null;
    const f = fatto('furto', [t.id, v.id], { ev: ev.id }, L.f);
    const tes = st.npcs.find(k => k !== t && k !== v && ok(st, k) && (k.mem || []).some(m => m.eventId === ev.id && m.source === 'visto') && hyp(k.x - v.x, k.y - v.y) < 12);
    if (!tes || !ok(st, v)) return null;
    // la vittima ora lo sa da chi l'ha visto: è un conto aperto (l'accusa, alla prossima)
    if (!recentNote(st, v, x => x.tag === 'furto' && x.who === t.id, 1)) note(st, v, `${tes.first} ha visto: è stat${t.pop.sex === 'f' ? 'a' : 'o'} ${t.first}`, 'bad', { who: t.id, w: .6, tag: 'furto', causa: f, vita: 1 });
    return { key: 'scippo:visto', a: v, b: t, c: tes, causa: f, perche: [v, `${tes.first} gli ha detto chi l'ha derubat${v.pop.sex === 'f' ? 'a' : 'o'}`, 'info', tes, 'furto_visto'] };
  }
  // il prestito di PROJ.affitto diventa un debito con scadenza (venerdì alle 19, o fra tre giorni)
  function installaPrestito() {
    const P = Po(); const D = P && P.PROJ && P.PROJ.affitto; if (!D || D.__vita) return; D.__vita = true;
    const s0 = D.steps;
    D.steps = (st, n, Pn) => {
      const L = s0(st, n, Pn); if (!Array.isArray(L)) return L;
      L.forEach(s => { if (!s || !/chiede un prestito a /.test(s.label || '') || !s.fx) return; const fx0 = s.fx;
        s.fx = (st2, n2, P2, ...r) => {
          const m0 = P2.money, out = fx0(st2, n2, P2, ...r);
          if (P2.money - m0 >= 14) {
            const fr = st2.npcs.find(k => k.pop && k.pop.diary && k.pop.diary.some(e => e.t === st2.t && e.who === n2.id && /^prestato /.test(e.text)));
            if (fr) {
              const v = Math.round(P2.money - m0), d = day(st2), wd = (d + 1) % 7, fri = 5;   // venerdì
              let scad = (d + ((fri - wd + 7) % 7 || 7)) * 1440 + 19 * 60; if (scad - st2.t < 2 * 1440) scad = st2.t + 3 * 1440;
              const f = fatto('prestito', [fr.id, n2.id], { v }, null);
              const Dd = P2.debiti = P2.debiti || {}; Dd[fr.id] = Dd[fr.id] || { v: 0, t: st2.t, why: 'il prestito' }; Dd[fr.id].v += v; Dd[fr.id].why = 'il prestito'; Dd[fr.id].scad = scad; Dd[fr.id].causa = f;
              S(st2).stats.prestiti++;
              if (near(st2, n2, CFG.palco[1]) && near(st2, fr, CFG.palco[1])) S(st2).pend.push({ tipo: 'prestito', a: n2, b: fr, v, scad, f, at: st2.clock });
            }
          }
          return out;
        };
      });
      return L;
    };
  }
  function subPrestito(st, x) {
    const a = x.a, b = x.b, D = a.pop.debiti && a.pop.debiti[b.id]; if (!D) return null;
    return { key: 'prestito:si', a, b, dati: { soldi: soldiW(x.v), scad: G.dayName(x.scad).toLowerCase() }, causa: x.f,
      alSentito: st2 => { const p = promessaFra(st2, { chi: a.id, a: b.id, verbo: 'rendere', desc: `${a.first} deve ${soldiW(x.v)}.000 lire a ${b.first}, entro ${G.dayName(x.scad).toLowerCase()}`, link: { tipo: 'debito', obj: D }, quando: { t0: st2.t, at: x.scad } }, '', x.f); if (p) D.pid = p.id; sentita(st2, [p && p.id], null); },
      perche: [b, `prestato a ${a.first}: ha promesso di rendere entro ${G.dayName(x.scad).toLowerCase()}`, 'info', a, 'debito'] };
  }
  // gli intenti del motore (socialize): gli stessi pesi; l'effetto lo fa Azioni.social
  const RACCONTO = /^(litigato con|giocato a|comprato|venduto|visto|prestato|scambiato|saldato|preso appuntamento con|fatto a botte con|ha dato buca a|consegnato|promesso)/;
  function racconto(st, a, b) {
    const e = recentNote(st, a, x => x.who !== b.id && RACCONTO.test(x.text) && st.t - x.t < 720 && x.text.length < 52, 1); if (!e) return null;
    const t = /^(ha |fatto a botte)/.test(e.text) ? e.text.replace(/^ha /, 'Ho ').replace(/^fatto/, 'Ho fatto') : 'Ho ' + e.text;
    return { testo: cap(t.replace(/[.\s]+$/, '')) + '.', e };
  }
  function sociale(st, a, b) {
    const A = Az(), I = Po() && Po()._; if (!A || !I || !a.tr || !b.tr || !a.pop.need || !b.pop.need) return null;
    const R = relA(st, a, b), t = a.tr || {}, place = (a.pop.at && a.pop.at.label) || '';
    const tension = ((a.pop.enemies || []).includes(b.id) ? .5 : 0) + (I.recent(st, a.pop, 'bidone', 3, e => e.who === b.id) ? .3 : 0) + (b.pop.debiti && b.pop.debiti[a.id] ? .25 : 0) + Math.max(0, a.pop.need.rabbia - .3) * .6 - R * .4;
    const rac = racconto(st, a, b);
    const W = {
      chiacchiera: 1 + t.loq * .5,
      sfotti: Math.max(0, t.loq * .7 - R * .3 - t.legge * .2) * .6,
      apprezza: Math.max(0, R) * .7 + (1 - t.avid) * .1,
      offri: R > .25 && a.pop.money > 15 && t.avid < .55 ? .35 : 0,
      gioca: /Osteria|Bar|Circolo|Sirena|Flipper|Spiaggia|Giardini|Trattoria/.test(place) && R > -.1 ? .5 : 0,
      litiga: tension > .2 && st.t - ((a.pop.lastQ || {})[b.id] || -1e9) > 1440 ? tension * .8 : 0,
    };
    const tot = Object.values(W).reduce((s, v) => s + v, 0); if (tot <= 0) return null;
    let r = rnd() * tot, kind = 'apprezza'; for (const [k, v] of Object.entries(W)) { r -= v; if (r <= 0) { kind = k; break; } }
    return eseguiSociale(st, a, b, kind, rac);
  }
  function eseguiSociale(st, a, b, kind, rac, gia) {
    const V = S(st), m0 = gia ? gia.m0 : a.pop.money, r0 = gia ? gia.r0 : (st.pop.stats.risse || 0);
    const banter = kind === 'sfotti' && relA(st, b, a) > .4 && b.tr.loq > .5;
    const motivo = kind === 'litiga' ? (b.pop.debiti && b.pop.debiti[a.id] ? 'i soldi' : Po()._.recent(st, a.pop, 'bidone', 3, e => e.who === b.id) ? 'la buca' : 'quella volta') : null;
    if (kind === 'litiga') { (a.pop.lastQ = a.pop.lastQ || {})[b.id] = st.t; }
    if (!gia) zitti(st, [a, b], () => { V.__mio = true; try { Az().social(st, a, b, kind, kind === 'litiga' ? { perche: motivo } : undefined); } catch (x) { } finally { V.__mio = false; } });
    if ((st.pop.stats.risse || 0) > r0) { fatto('rissa', [a.id, b.id], { kind }, null); return { muto: true }; }
    const dm = a.pop.money - m0, f = fatto('social', [a.id, b.id], { kind, dm }, null);
    if (kind === 'chiacchiera' && !rac) {   // niente di suo da raccontare: una voce vera (matti.js voce), detta fra loro
      const T = Mt(); let L = null; try { L = T && T.voce ? T.voce(st, a, b) : null; } catch (x) { }
      if (!L || !L.length) return null;
      // la regia delle voci (commedia.js §3): la stessa voce non si ripete entro due minuti, né la dice chi l'ha fatta
      const C = Cm(); if (C && C._ && C._.fixVoce) { const v = C._.fixVoce(st, a, L[0]); if (!v) return null; const t0 = v.key && C.R.voci.get(v.key); if (t0 !== undefined && st.clock - t0 < C._.CFG.voce) return null; }
      return { key: 'voce:si', a, b, varianti: [L.slice(0, 4).map((t, i) => [i % 2 ? 'b' : 'a', t])], causa: f, perche: [b, `${a.first} gli ha raccontato una cosa successa`, 'info', a, 'voce'] };
    }
    if (kind === 'chiacchiera') {
      try { Po()._.share(st, a, b); } catch (x) { }
      note(st, b, `${a.first} gli ha raccontato: ${low(rac.testo.replace(/^Ho /, 'ha '))}`, 'info', { who: a.id, w: .15, tag: 'voce', causa: f });
      return { key: 'chiacchiera:si', a, b, dati: { fatto: rac.testo, fatto0: low(rac.testo) }, causa: f, perche: [a, `raccontato a ${b.first} della giornata`, 'info', b, 'detto'] };
    }
    if (kind === 'sfotti') return { key: banter ? 'sfotti:ok' : 'sfotti:offesa', a, b, causa: f, perche: banter ? [a, `preso in giro ${b.first}, che ci ha riso sopra`, 'info', b, 'detto'] : [a, `preso in giro ${b.first}, che se l'è presa`, 'info', b, 'detto'] };
    if (kind === 'apprezza') return { key: 'apprezza:si', a, b, causa: f, perche: [a, `fatto un complimento a ${b.first}`, 'good', b, 'detto'] };
    if (kind === 'offri') return dm < 0 ? { key: 'offri:si', a, b, causa: f, perche: [a, `offerto da bere a ${b.first}`, 'good', b, 'detto'] } : null;
    if (kind === 'gioca') return { key: dm > 0 ? 'gioca:vince' : dm < 0 ? 'gioca:perde' : 'gioca:pari', a, b, dati: { soldi: soldiW(Math.abs(dm)) }, causa: f, perche: [a, `giocato con ${b.first}${dm ? (dm > 0 ? ': ha vinto' : ': ha perso') : ''}`, 'info', b, 'detto'] };
    if (kind === 'litiga') return { key: 'litiga:si', a, b, dati: { perche: motivo }, causa: f, perche: [b, `${a.first} gli ha rinfacciato ${motivo}`, 'bad', a, 'lite'] };
    return null;
  }

  // ================= GLI INTENTI DA FUORI (iniziative.js e altri) =================
  function esterno(st, a, b) {
    const L = Object.entries(INTENTI).filter(([, D]) => D.quando); if (!L.length) return null;
    for (const [nome, D] of L.sort(() => rnd() - .5)) { let q = false; try { q = D.quando(a, b, st); } catch (e) { } if (q) return { nome, D }; }
    return null;
  }
  // l'interfaccia: lo scambio vero (prima l'esito col motore, poi le battute se c'è il posto, poi la conseguenza)
  function scambio(a, b, intento, dati) {
    const st = ST; dati = Object.assign({}, dati || {});
    if (!st || !a || !b || !a.pop || !b.pop) return { esito: null, promessa: null, fatto: null, detto: false };
    const D = INTENTI[intento] || { battute: {}, si: [] };
    let r = null; try { r = D.esito ? D.esito(a, b, st, dati) : dati.esito; } catch (e) { r = null; }
    if (r === null || r === undefined || r === false) return { esito: null, promessa: null, fatto: null, detto: false };
    const o = typeof r === 'object' ? r : { esito: String(r) }, esito = o.esito; Object.assign(dati, o.dati || {});
    const f = fatto(intento, [a.id, b.id], { esito }, dati.causa || o.causa || null);
    const si = !!(o.accettato || (D.si || []).includes(esito));
    let p = null; const P0 = o.promessa;
    const vicino = near(st, a, CFG.palco[1]) && near(st, b, CFG.palco[1]) && hyp(a.x - st.player.x, a.y - st.player.y) > CFG.palco[0] && hyp(a.x - b.x, a.y - b.y) < 6 && ok(st, a) && ok(st, b);
    let detto = false;
    const V = (D.battute || {})[esito] || (o.battute);
    if (vicino && V && V.length && postoLibero(st, !!dati.forza)) {
      const sub = { key: 'esterno:' + intento + ':' + esito, a, b, varianti: V, dati, si, causa: f,
        perche: [b, o.perche || `${a.first}: ${intento.replace(/_/g, ' ')} (${esito})`, 'info', a, 'detto'],
        alSentito: st2 => { if (p) sentita(st2, [p.id], null); } };
      if (P0 && si) p = promessaFra(st, Object.assign({ chi: a.id, a: b.id, verbo: intento, desc: P0.desc || intento, link: P0.link || null, scadenza: P0.scadenza || null, dove: P0.dove || null, quando: { t0: st.t, at: P0.at || null } }, P0.chi ? { chi: P0.chi, a: P0.a } : {}), '', f);
      detto = !!mettiInScena(st, sub);
    }
    return { esito, promessa: p, fatto: f, detto };
  }
  Vita.scambio = scambio;

  // ================= IL GIRO (due volte al secondo, solo vicino al giocatore) =================
  function giro(st) {
    const V = S(st), p = st.player, Q = M(st); if (!Q || !Q.ready) return;
    const vicini = []; for (const n of st.npcs) { if (n.pop && alive(n) && !n.inside && hyp(n.x - p.x, n.y - p.y) < CFG.R) vicini.push(n); }
    scanDiari(st, vicini);
    // i fatti freschi del motore scadono presto: se non c'è il posto in fila, restano fatti (senza battute)
    V.pend = V.pend.filter(x => st.clock - x.at < CFG.fresco);
    if (!p.indoor && !p.vehicle) furto(st, vicini);
    const scippo = dopoFurto(st);
    if (scippo && scippo.key && postoLibero(st, true)) { if (mettiInScena(st, scippo)) return; }
    // l'incontro all'appuntamento non aspetta il turno dei frammenti (dura poco): basta la fila vuota e il ritmo della regia
    if (!Q.q.length && !p.indoor && !p.vehicle && V.slot.vita <= V.slot.scritti + 1 && prontoPalco(st) === true) {
      for (const a of vicini) { const ap = a.pop.appt; if (!ap || ap.__vArr || ap.by !== a.id || st.t < ap.t - 20 || st.t > ap.t + 50) continue; const b = G.byId(st, ap.with); if (!b || !vicini.includes(b) || !ok(st, a) || !ok(st, b) || hyp(a.x - b.x, a.y - b.y) > 8 || hyp(a.x - p.x, a.y - p.y) > CFG.palco[1] + 4) continue;
        const sub = contoAppuntamento(st, a, b); if (sub && sub.key) { const G0 = mettiInScena(st, sub); if (G0) { if (sub.coda) appendiCoda(st, G0, sub); return; } } }
    }
    if (!postoLibero(st, true)) return;
    const turno = postoLibero(st, false);
    // la regia di commedia.js: la prima battuta di una fila passa solo col ritmo giusto (6-8 s dall'ultima chiacchiera), con
    // meno di 3 fumetti vivi e senza una scena vicina. Se è il turno di vita si aspetta (fino a 15 s), tenendo il posto.
    const pr = prontoPalco(st);
    if (pr !== true) { if (pr === 'aspetta' && (turno || V.pend.length) && st.clock - (V.attesa || (V.attesa = st.clock)) < 15) Q.fram = Math.max(Q.fram, st.clock + .3); return; }
    V.attesa = 0;
    const palco = vicini.filter(n => { const d = hyp(n.x - p.x, n.y - p.y); return d > CFG.palco[0] && d < CFG.palco[1] && ok(st, n); });
    if (palco.length < 2) return;
    // 1. un fatto fresco fra due che sono qui
    for (const x of V.pend.slice().reverse()) {
      if (!palco.includes(x.a) || !palco.includes(x.b) || hyp(x.a.x - x.b.x, x.a.y - x.b.y) > 6) continue;
      if (!turno && x.tipo !== 'prestito' && x.tipo !== 'patto') continue;
      V.pend.splice(V.pend.indexOf(x), 1);
      const sub = x.tipo === 'social' ? eseguiSociale(st, x.a, x.b, x.kind, x.kind === 'chiacchiera' ? racconto(st, x.a, x.b) : null, x) : x.tipo === 'prestito' ? subPrestito(st, x) : daPendente(st, x);
      if (sub && sub.key && mettiInScena(st, sub)) return;
    }
    // 2. le coppie: i conti aperti prima (un conto aperto ha la precedenza su ogni altra cosa fra quei due), poi gli intenti
    const coppie = [];
    for (let i = 0; i < palco.length; i++) for (let j = i + 1; j < palco.length; j++) { const a = palco[i], b = palco[j], d = hyp(a.x - b.x, a.y - b.y); if (d < 8 && st.clock - (V.ultima[chiave(a, b, '')] || -1e9) > 90) coppie.push([a, b, d]); }
    if (!coppie.length) return;
    for (const [x, y, dd] of coppie) for (const [a, b] of [[x, y], [y, x]]) for (const C of CONTI) {
      if (dd >= CFG.coppia && C !== contoAppuntamento) continue;   // un conto aperto passa anche fuori turno (fino a un posto in più)
      let sub = null; try { sub = C(st, a, b); } catch (e) { }
      if (!sub) continue; V.ultima[chiave(a, b, '')] = st.clock;
      if (sub.muto) return;   // la cosa è diventata una lite o una rissa: parla il combattimento
      const G0 = mettiInScena(st, sub); if (G0 && sub.coda) appendiCoda(st, G0, sub); if (G0) return;
    }
    if (!turno) return;
    const vere = coppie.filter(c => c[2] < CFG.coppia); if (!vere.length) return;
    // prima chi si conosce (amici, famiglia, simpatia): sono loro che si danno appuntamento e si regalano le cose
    const lg = c => (legame(st, c[0], c[1]) || legame(st, c[1], c[0]) ? 1 : 0) + rnd() * .5;
    for (const [x, y] of vere.sort((c1, c2) => lg(c2) - lg(c1)).slice(0, 3)) {
      const [a, b] = rnd() < .5 ? [x, y] : [y, x]; V.ultima[chiave(a, b, '')] = st.clock;
      if (a.pop.ints && b.pop.ints) {
        const ex = esterno(st, a, b); if (ex) { const r = scambio(a, b, ex.nome, ex.D.dati ? (() => { try { return ex.D.dati(a, b, st); } catch (e) { return {}; } })() : {}); if (r.detto) return; }
        const d0 = day(st), nuovi = (V.appG[d0] || 0) < 1 ? [proponiAppuntamento, regalo] : [regalo, proponiAppuntamento];
        for (const f of nuovi) { const sub = f(st, a, b) || f(st, b, a); if (sub && sub.key && mettiInScena(st, sub)) return; }
      }
      const sub = sociale(st, a, b); if (sub && sub.key && mettiInScena(st, sub)) return;
    }
  }
  function prontoPalco(st, escl) {
    const C = Cm(); if (!C || !C.R) return true; const R = C.R, p = st.player;
    const E = typeof Eventi !== 'undefined' && Eventi.S ? Eventi.S(st) : null;
    if (E && E.live && E.live.some(sc => sc.spot && hyp(sc.spot.x - p.x, sc.spot.y - p.y) < 34)) return 'scena';
    if (st.clock - R.lastAmb < R.gap) return 'aspetta';
    let vivi = 0; for (const k of st.npcs) { const b = k.bark; if (b && b.until > st.clock && !(escl && escl.includes(k)) && !k.dead && !k.inside && hyp(k.x - p.x, k.y - p.y) < 26) vivi++; }
    return vivi >= 3 ? 'aspetta' : true;
  }
  // la coda dell'incontro (la cosa per cui si erano visti): altre due righe in fila
  function appendiCoda(st, G0, sub) {
    const Q = M(st); let at = G0.fine;
    sub.coda.forEach(([chi, text]) => { const n = chi === 'a' ? sub.a : sub.b; at += CFG.gap; Q.q.push({ id: n.id, text, at, g: G0.g }); G0.righe.push({ id: n.id, t: text }); });
    G0.fine = at;
  }

  // ================= IL PASSO =================
  let tLast = 0;
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  { const c0 = G.HOOKS.create; G.HOOKS.create = st => { if (c0) c0(st); ST = st; }; }
  { const s0 = G.HOOKS.step; G.HOOKS.step = (st, dt) => {
      ST = st; const t0 = now(); let V = null;
      try {
        V = S(st);
        installaTalk(); if (!tLast) { installaPrestito(); const T = Mt(); if (T && T.CFG) T.CFG.voce = 0;   // le voci vere le porta vita (con matti.js voce): i posti di matti restano ai frammenti scritti
 const P = Pa(); if (P && P.EXT) P.EXT.fra = conseguenzeFra; tLast = 1; }
        // il saldo delle 19 di scambi.js: le coppie vicine al giocatore le salda vita, di persona (si tolgono e si ridanno)
        const SM = st.scambi, hm = Math.floor(st.t / 60);
        if (SM && SM.hour < hm) { let h19 = false; for (let h = SM.hour + 1; h <= hm; h++) if (h % 24 === 19) h19 = true; if (h19) V.settle = tieniDebiti(st); }
        { const C = Cm(); V.R0 = C && C.R ? [C.R.lastAmb, C.R.gap] : null; }
        const Q = M(st), dovuto = Q && Q.ready && !Q.q.length && st.clock >= Q.fram;
        if (st.clock - V.t >= CFG.tick || (dovuto && st.clock - V.t >= .1)) { V.t = st.clock; V.stats.ticks++; const g0 = now(); giro(st); tickFra(st); const gm = now() - g0; if (gm > 1) { const P = V.stats.picchi = V.stats.picchi || {}; const k = V.ultimoPasso || 'giro'; P[k] = (P[k] || 0) + 1; } V.ultimoPasso = null; }
      } catch (e) { if (!Vita.err) { Vita.err = e; if (typeof console !== 'undefined') console.warn('[Vita]', e); } }
      const t1 = now();
      if (s0) s0(st, dt);
      const t2 = now();
      try {
        if (V && V.settle) { V.settle.forEach(([n, id, D]) => { const P = n.pop; P.debiti = P.debiti || {}; if (!P.debiti[id]) P.debiti[id] = D; }); V.settle = null; }
        if (V) { if (V.subito) subito(st); contaScritti(st); giroFile(st); }
      } catch (e) { if (!Vita.err) { Vita.err = e; if (typeof console !== 'undefined') console.warn('[Vita]', e); } }
      if (V) { const ms = (t1 - t0) + (now() - t2); V.stats.ms += ms; V.stats.frames++; if (ms > V.stats.msMax) V.stats.msMax = ms; if (ms > 1) V.stats.oltre1ms = (V.stats.oltre1ms || 0) + 1; }
    }; }
  function tieniDebiti(st) {
    const out = [], p = st.player;
    for (const n of st.npcs) {
      const P = n.pop; if (!P || !P.debiti || n.dead || hyp(n.x - p.x, n.y - p.y) > CFG.R) continue;
      for (const id of Object.keys(P.debiti)) { const k = G.byId(st, id); if (k && !k.dead && hyp(k.x - n.x, k.y - n.y) < 30) { out.push([n, id, P.debiti[id]]); delete P.debiti[id]; } }
    }
    return out;
  }
  // le promesse fra di vita che parola.js non sa chiudere da solo: il debito (pagato anche da lontano, o mai)
  function tickFra(st) {
    const P = Pa(); if (!P) return; const L = P._.S(st).promesse, V = S(st);
    for (const x of V.sentite) for (const id of x.ids) {
      const p = L.find(q => q.id === id); if (!p || !p.link || p.link.tipo !== 'debito' || !['accettata', 'in_corso', 'attesa'].includes(p.stato)) continue;
      const n = G.byId(st, p.chi), D = n && n.pop && n.pop.debiti && n.pop.debiti[p.a];
      if (!D || D !== p.link.obj) P._.chiudi(st, p, 'fatta', p.quando && p.quando.at && st.t > p.quando.at ? 'pagato, ma tardi' : 'pagato');
      else if (p.quando && p.quando.at && st.t > p.quando.at + 8 * 1440) P._.chiudi(st, p, 'rotta', 'mai pagato');
    }
  }
  // i posti della fila: quanti ne prendono i frammenti scritti (matti, ragazzi), quanti le voci, quanti vita
  function contaScritti(st) {
    const Q = M(st), V = S(st); if (!Q) return;
    if (Q.q.length && Q.q[0].g !== V.prevQ) {
      const g = Q.q[0].g; V.prevQ = g;
      if (!V.gruppi.some(x => x.g === g)) { if (scritti().has(Q.q[0].text)) V.slot.scritti++; else V.slot.voce++; }
    }
  }

  // ================= IL TACCUINO: «Sentito dire» =================
  const STATO_W = { accettata: 'promesso', in_corso: 'in corso', attesa: 'in attesa', fatta: '✓ mantenuta', fallita: '✗ fallita', rotta: '⊘ rotta', scaduta: '⊘ scaduta', annullata: '– saltata' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function statoSentito(st, x) {
    const P = Pa(); const L = P ? P._.S(st).promesse : [];
    const ps = x.ids.map(id => L.find(p => p.id === id)).filter(Boolean); if (!ps.length) return null;
    const p = ps[0], ap = ps.length === 2 && ps[0].verbo === 'appuntamento';
    let stato = STATO_W[p.stato] || p.stato;
    if (ap) { const s = ps.map(q => q.stato); stato = s.every(v => v === 'fatta') ? 'ci sono andati' : s.some(v => v === 'rotta') ? (s.every(v => v === 'rotta') ? 'non ci è andato nessuno' : 'buca') : s.some(v => v === 'annullata') ? 'saltato' : 'da vedere'; }
    else if (p.link && p.link.tipo === 'debito' && p.stato === 'accettata' && p.quando && p.quando.at && st.t > p.quando.at) stato = 'scaduta';
    return { desc: p.desc, stato, t: x.t };
  }
  function sentitoHtml(st) {
    const V = S(st), L = V.sentite.map(x => statoSentito(st, x)).filter(Boolean).slice(0, 10);
    return '<p class="hint">Quello che hai sentito dire per strada, fra loro. Lo sai solo tu: se vuoi, ci vai.</p>' +
      `<ul>${L.length ? L.map(x => `<li><small>${esc(G.dayName(x.t))} ${esc(G.clockStr(x.t))}</small> · ${esc(x.desc)} · <b>${esc(x.stato)}</b></li>`).join('') : '<li><span style="opacity:.7">Ancora niente. Passa vicino alla gente.</span></li>'}</ul>`;
  }
  Vita.sentitoHtml = sentitoHtml;
  function installaTaccuino() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    let mio = false, obs = null;
    const book = () => document.getElementById('book');
    const show = () => {
      const b = book(), st = W0.__pv && W0.__pv.st; if (!b || !st || !mio) return;
      const body = b.querySelector('.body'), nav = b.querySelector('nav'); if (!body || !nav) return;
      if (obs) obs.disconnect();
      nav.querySelectorAll('button').forEach(x => x.setAttribute('aria-selected', String(x.dataset.t === 'sentito')));
      body.innerHTML = sentitoHtml(st);
      if (obs) obs.observe(b, { childList: true });
    };
    const decorate = () => {
      const b = book(), nav = b && b.querySelector('nav'); if (!nav) return;
      if (!nav.querySelector('[data-t="sentito"]')) { const btn = document.createElement('button'); btn.setAttribute('role', 'tab'); btn.dataset.t = 'sentito'; btn.setAttribute('aria-selected', 'false'); btn.textContent = 'Sentito dire'; btn.onclick = e => { e.stopPropagation(); mio = true; show(); }; nav.appendChild(btn); }
      if (mio) show();
    };
    const start = () => {
      const b = book(); if (!b) { setTimeout(start, 500); return; }
      b.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('nav button[data-t]'); if (t && t.dataset.t !== 'sentito') mio = false; }, true);
      obs = new MutationObserver(decorate); obs.observe(b, { childList: true }); decorate();
    };
    start();
  }
  if (typeof document !== 'undefined') { const go = () => { try { installaTaccuino(); } catch (e) { } }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go(); }

  Vita._ = { S, giro, righe, scegli, postoLibero, mettiInScena, scambio, fatto, catena, CONTI, contoDebito, contoBuca, contoFurto, contoAppuntamento, regalo, proponiAppuntamento, sociale, oraW, quandoW, soldiW, aLuogo, statoSentito, SI };
})();
