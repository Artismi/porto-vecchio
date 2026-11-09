/* [commedia] Porto Vecchio — la regia della commedia (vedi REGIA_COMMEDIA.md, commedia/TONO.md).
   Tutto dietro ?commedia: a interruttore spento questo file non fa niente. Fuori dall'impronta dei tasselli (build.py TASS_FUORI).

   FASE 1 (REGIA_COMMEDIA.md §7, «prima di aggiungere le 1.500 battute nuove»). Nessun file del gioco è toccato: tutto passa da qui,
   a caricamento, solo con Commedia.ON. Il punto d'aggancio è uno solo: ogni fumetto del gioco nasce come n.bark = {text, until}
   (game.js say, l'unica che lo scrive; G.say degli altri moduli ci arriva in fondo). Qui ogni NPC riceve una proprietà «bark» con
   un setter: la battuta nuova passa per la regia (filtra) e viene corretta, accorciata, spostata o taciuta prima di esistere.

   Le sezioni:
     §1 COMBATTIMENTO  tutte le frasi escono (game.js pesca solo le prime 4); la tribù diventa la Comune (battute.md §3)
     §2 VOLUME         le chiacchiere di fondo: una ogni 6-8 s vicino al giocatore, al massimo 3 fumetti, prima chi conta;
                       durante una scena vicina, entro 20 m, il resto tace
     §3 VOCI           la stessa voce al massimo una volta ogni 2 minuti, con parole diverse; «Tore ha picchiato Tore»
     §4 PALCOSCENICO   chi recita (n.__ev) non dice altro; i matti tengono la loro voce
     §5 LAVORO         via le frasi a stampo di popolo.js chatLine (la parentesi del mestiere, «alle 0», la suora che attacca)
     §6 OGGETTI        gli articoli giusti: «delle sigarette», «una bottiglia di vino», «una stecca di sigarette»
     §7 NOTTE          dalle 22 alle 6 niente «stamattina», «domani attacco»: frasi di notte (battute.md §2)
     §8 RITMO          durata = 1,2 s + 1 s ogni 15 caratteri (2,2-7 s), nome leggibile sopra le etichette, mai tagliato al bordo;
                       lo stile «D — striscia» (la striscia d'inchiostro dietro ogni riga, il cartellino del nome); al telefono al
                       massimo 2 fumetti pieni; mai sopra l'obiettivo né sopra la minimappa
     §9 CONTESTO       quello che uno dice dev'essere vero di quello che ha intorno: la patente solo se c'è un mezzo, il mare solo
                       vicino al mare, niente pioggia (non piove mai), il buongiorno di mattina, il «tu» solo se c'è qualcuno a cui
                       dirlo; altrimenti un'altra frase della stessa voce, o niente (commedia/contesto.md) */
(function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Commedia = { ON };
  if (typeof window !== 'undefined') window.Commedia = Commedia;
  if (typeof module !== 'undefined') module.exports = Commedia;

  // ======================= §9 CONTESTO =======================
  // «Le frasi non devono dirle a caso» (la direzione artistica: Marta che dice «ma chi ti ha dato la patente» e non ci sono auto).
  // Quello che uno dice dev'essere vero di quello che ha intorno o di quello che è appena successo. Qui ogni frase legata a un
  // contesto (un mezzo che passa, il mare, la pioggia, l'ora, il bar, la chiesa, i Grigi, gli spari, qualcuno a cui parlare…) ha la
  // sua condizione, calcolata dallo stato del gioco. Se la condizione è falsa la frase si cambia con una dello stesso tipo e della
  // stessa voce che il contesto non lo chiede, o si tace (se è una chiacchiera di fondo). Le scene recitate cambiano solo quando la
  // condizione è chiaramente falsa (il buongiorno di notte, il sole alle sei d'inverno). Tavola: commedia/contesto.md.
  // Questo blocco sono solo funzioni (niente agganci): sta prima dell'interruttore perché la prova a interruttore spento conti le
  // frasi fuori contesto con lo stesso metro; a interruttore spento nessuno lo chiama.
  const CX = (function () {
    const GG = () => (typeof Game !== 'undefined' ? Game : null);
    const MM = () => (typeof Matti !== 'undefined' ? Matti : null);
    const hyp = Math.hypot, rnd = Math.random;
    const pickOk = (L, ok) => { const o = L.slice().sort(() => rnd() - .5); return o.find(ok); };
    const ora = st => { const G = GG(); return G && G.hour ? G.hour(st) : Math.floor(st.t / 60) % 24; };
    const VK = v => { const G = GG(); return (G && G.VK && G.VK[v.kind]) || {}; };
    const vel = v => v.vx !== undefined ? hyp(v.vx, v.vy || 0) : Math.abs(v.speed || 0);
    const vivo = (st, k) => k && !k.dead && !(k.jailedUntil > st.t);
    function mezzo(st, n, r, f) {
      for (const v of st.vehicles || []) { if (v.hidden || Math.abs(v.x - n.x) > r || Math.abs(v.y - n.y) > r) continue; if (hyp(v.x - n.x, v.y - n.y) < r && f(v)) return true; }
      return false;
    }
    function evento(st, n, tipi, r, min) {
      for (const e of st.events || []) { if (st.t - e.t > min) break; if (tipi.includes(e.type) && e.x !== undefined && hyp(e.x - n.x, e.y - n.y) < r) return true; }
      return false;
    }
    function posto(st, n, r, re) {
      const G = GG(); if (!G || !G.PLACES) return false;
      for (const k in G.PLACES) { const q = G.PLACES[k]; if (Math.abs(q.x - n.x) > r || Math.abs(q.y - n.y) > r) continue; if (hyp(q.x - n.x, q.y - n.y) < r && (re.test(k) || re.test(q.name || ''))) return true; }
      return false;
    }
    function mare(st, n, r) {
      const G = GG(); if (!G || !G.seaM) return false;
      if (n.inBoat || (st.player && n === st.player && st.player.swim)) return true;
      const passo = r > 70 ? 8 : 4;
      for (let dy = -r; dy <= r; dy += passo) for (let dx = -r; dx <= r; dx += passo) if (dx * dx + dy * dy <= r * r && G.seaM(n.x + dx, n.y + dy)) return true;
      return false;
    }
    const pl = st => st.player;
    const dP = (st, n) => hyp(pl(st).x - n.x, pl(st).y - n.y);
    const religioso = n => /\b(suor|suora|don|prete|parroco|frate|sagrestan|monaca)/i.test((n.role || '') + ' ' + (n.first || '') + ' ' + (n.name || ''));
    // le condizioni (st, n) → vero/falso; si calcolano una volta per chi parla e per istante
    const COND = {
      // un mezzo vero: uno che si muove a 15 m, il giocatore al volante lì vicino, un incidente o un investimento appena successo, chi è sceso dalla macchina sfasciata
      veicolo: (st, n) => !!n.driverOf || st.clock - (n.lastHitByCar || -99) < 12 || mezzo(st, n, 15, v => !VK(v).boat && vel(v) > 1.5)
        || (!!pl(st).vehicle && dP(st, n) < 15) || evento(st, n, ['investimento', 'incidente'], 25, 25),
      // una macchina lì (anche ferma)
      macchina: (st, n) => COND.veicolo(st, n) || mezzo(st, n, 15, v => !VK(v).boat && !VK(v).pocket),
      // un mezzo che parte (l'autobus perso): qualcosa che si muove a 40 m
      parte: (st, n) => mezzo(st, n, 40, v => !VK(v).boat && vel(v) > 1.5) || mezzo(st, n, 40, v => v.kind === 'autobus'),
      // qualcuno che sfreccia: un mezzo, o il giocatore che corre addosso
      sfreccia: (st, n) => COND.veicolo(st, n) || (dP(st, n) < 6 && Math.abs(pl(st).speed || 0) > 3.5),
      // un numero in bici del giocatore (le reazioni ai trick e alle cadute)
      numero: (st, n) => dP(st, n) < 22 && ((st.bmxT && st.bmxT.last && st.clock - st.bmxT.last.t < 6) || !!pl(st).vehicle),
      mare: (st, n) => mare(st, n, 60),
      vedeMare: (st, n) => mare(st, n, 110),
      // il tempo: in questo inverno non piove mai (nessun sistema di meteo); se un giorno ci sarà st.meteo, vale quello
      pioggia: st => !!(st.pioggia || st.rain || (st.meteo && st.meteo.pioggia)),
      caldo: (st, n) => !!n.inside || !!(st.meteo && st.meteo.caldo),
      sole: (st, n) => { const h = ora(st); return h >= 8 && h < 16 && !n.inside; },
      luna: (st, n) => { const h = ora(st); return (h >= 18 || h < 6) && !n.inside; },
      mattino: st => { const h = ora(st); return h >= 4 && h < 14; },
      sera: st => { const h = ora(st); return h >= 13 || h < 4; },
      tardi: st => { const h = ora(st); return h >= 20 || h < 5; },
      buio: st => { const h = ora(st); return h >= 17 || h < 7; },
      // i posti
      bar: (st, n) => posto(st, n, 25, /^(bar|sirena|osteria|osteria_sg|car_2|chiosco|disco|cantina)$|Bar|Osteria|Birreria|Trattoria|Circolo|Banja|Cantina|Discoteca/),
      chiesa: (st, n) => posto(st, n, 40, /^(chiesa|chiesa_sg|santuario)$|Chiesa|Santuario/) || (religioso(n) && !!n.inside),
      banco: (st, n) => (n.pop && n.pop.cur && n.pop.cur.act === 'mercato') || posto(st, n, 40, /^(piazza|fiori)$/) || posto(st, n, 15, /Alimentari|Panetteria|Pescheria|Mercato|Tabacchi|Ferramenta|Abiti|Wu/),
      bottega: (st, n) => posto(st, n, 30, /Bar|Alimentari|Panetteria|Pescheria|Tabacchi|Ferramenta|Abiti|Barbiere|Farmacia|Sartoria|Lavanderia|Wu|Videoteca|Cinema|Hotel/),
      // i Grigi: uno vivo, fuori, a 80 m (si vedono da lontano, anche dal tetto); «ti cercano»: il giocatore è ricercato o ce n'è uno vicino
      grigi: (st, n) => (st.npcs || []).some(k => k.cop && vivo(st, k) && !k.inside && k !== n && hyp(k.x - n.x, k.y - n.y) < 80),
      cercato: (st, n) => { const G = GG(); return (G && G.wanted && G.wanted(st) > 0) || COND.grigi(st, n); },
      // i fatti
      spari: (st, n) => st.clock - (st.lastShotAt || -99) < 15 || n.panic > 0 || evento(st, n, ['spari', 'omicidio', 'ferimento', 'esplosione'], 90, 12),
      sparato: (st, n) => st.clock - (st.lastShotAt || -99) < 30 || (n.hp < (n.maxHp || 0)) || st.clock - (n.hitT || -99) < 30 || evento(st, n, ['spari', 'omicidio', 'ferimento'], 90, 30),
      colpito: (st, n) => (n.hp < (n.maxHp || 0)) || st.clock - (n.hitT || -99) < 8,
      macchinaSparata: (st, n) => COND.macchina(st, n) && COND.sparato(st, n),
      botto: (st, n) => evento(st, n, ['esplosione'], 140, 40) || (st.fires || []).some(f => f && hyp(f.x - n.x, f.y - n.y) < 60),
      // qualcuno a cui dirlo: un altro a 4,5 m, o il giocatore a 8 (chi è dentro una casa ha la sua gente intorno)
      ascolta: (st, n) => {
        if (n.inside) return true;
        const p = pl(st); if (!p.indoor && dP(st, n) < 8) return true;
        for (const k of st.npcs || []) { if (k === n || !vivo(st, k) || k.inside || Math.abs(k.x - n.x) > 4.5 || Math.abs(k.y - n.y) > 4.5) continue; if (hyp(k.x - n.x, k.y - n.y) < 4.5) return true; }
        return false;
      },
      // detta a Nino: il giocatore lì, a 9 m, fuori come lui
      nino: (st, n) => !pl(st).indoor && !n.inside && dP(st, n) < 9,
    };
    // le frasi per sostituire (il contesto non lo chiedono)
    const SOLO = ['Mah.', 'Che giornata.', 'Va be\'.', 'Uff. Che vita.', 'Dove ho messo le chiavi…', 'Devo ricordarmi il pane.', 'Mi sono scordato una cosa. Non so cosa.', 'Domani. Domani ci penso.', 'Che freddo, porca miseria.', 'Mia madre aveva ragione. Su tutto.'];
    const SOLO_G = ['Boh.', 'Che palle.', 'Sempre la stessa storia.', 'Mi gira la testa. È la fame.', 'Che freddo, porca miseria.'];
    const NOTTE_FONDO = ['Che ore sono? Le undici? Mia moglie mi ammazza.', 'Zitto! Passa la ronda! ...Era un gatto. Che spavento, porca miseria.', 'Altro che Ora Quieta. Qui non dorme nessuno.', 'Mi sono chiuso fuori. Di nuovo.'];
    const RELIG = ['Chi ha rubato le candele? Chi?! Le conto ogni sera! Ne mancano tre!', 'Tre ore di confessione e nessuno ha peccato! Tutti santi! Bugiardi!', 'Sì, io fumo! E gioco a carte con le suore! E vinco!'];
    const alSaluto = (st, s) => s.replace(/^Buongiorno|^Buonasera|^Buonanotte/, () => COND.mattino(st) ? 'Buongiorno' : COND.tardi(st) ? 'Buonanotte' : 'Buonasera');
    // le sostituzioni scritte per una frase sola (le scene: si cambia il minimo, la scena resta quella)
    const ALT = {
      'Guarda cosa hai fatto alla mia macchina!': 'Guarda cosa hai fatto!',
      'Chi ti ha dato la patente?!': 'Ma sei scemo?!',
      'Ma chi ti ha dato la patente, tua madre?!': 'Ma sei scemo?!',
      'Mi hai rigato la portiera!': 'Ieri mi hai rigato la portiera! Ti ho visto!',
      'Quello è il mio posto da vent\'anni!': 'Ieri mi hai rigato la portiera! Ti ho visto!',
      'Ferma! Devo salire!': 'Aspetta! Aspettaaa!',
      'Oggi si vende, c\'è il sole.': 'Oggi si vende, me lo sento.',
      'Le sue lenzuola mi coprono il sole!': 'Le sue lenzuola mi coprono la finestra!',
      'Buongiorno! Bella giornata, eh?': st => `${alSaluto(st, 'Buongiorno')}! Che freddo, eh?`,
      'Guarda che luna.': 'Guarda che cielo.',
      'Ecco i Grigi, in piazza. Di nuovo.': 'Pina! Pina! Il sugo!',
      'Guarda dove vai!': 'Mannaggia!', 'Oh! Guarda dove vai!': 'Mannaggia!', 'Ao, piano!': 'Mannaggia!',
      'Spostati, che esco in mare! Alle tre! Ogni notte! Che vita di merda!': 'Alle tre mi alzo per uscire in mare. Ogni notte! Che vita di merda!',
      'Il mare oggi è color ferro.': 'Stamattina sulla caletta c\'era il ghiaccio.',
    };
    // [id, la frase (regex), la condizione, opzioni]: cl = le classi a cui vale (se manca: tutte tranne matto e frammenti), no = eccezioni,
    // alt = la sostituzione (stringa, lista, funzione), amb = la sostituzione per le chiacchiere di fondo
    const AMB = ['fondo', 'voce'];
    const REGOLE = [
      // i mezzi
      ['patente', /patente/i, 'veicolo', { no: /Ho preso la patente|tolto la patente|L'ho presa proprio|Era sul tavolo/ }],
      ['la mia macchina', /alla mia macchina|(mia|tua) (macchina|auto) (è|l'hai|me l)|ma voiture|copro la macchina|macchina in (seconda|doppia) fila|rigato la portiera|mio posto da vent'anni/i, 'macchina', { no: /\bIeri\b/ }],
      ['guidare', /\b(guidi|guida) come\b|sai guidare|impara a guidare|chi guida così|\bclacson\b|\bnon frena\b|\bfrena!|stavi per investir|mi stavi investendo|mi vuoi investire/i, 'veicolo'],
      ['guarda dove vai', /^(Oh! )?Guarda dove vai!$|^Ao, piano!$/, 'sfreccia'],
      ['l\'autobus che parte', /devo salire!|aspetta l'autobus|ferma l'autobus/i, 'parte'],
      ['il numero in bici', /^(Uh, che volo\.|Rifallo!|Si è stampato\.|Si romperà l'osso del collo\.)$/, 'numero'],
      // il mare
      ['esco in mare', /esco in mare|vado in mare adesso|abboccano!|ha abboccato|tira su la rete/i, 'mare'],
      ['si vede il mare', /il mare oggi|guarda (il mare|le onde|che onde)|che mare, oggi/i, 'vedeMare'],
      // il tempo
      ['pioggia', /\b(piove|sta piovendo|diluvia|acquazzone|piove a dirotto|sotto la pioggia|che pioggia)\b|mi sono bagnat[oa]/i, 'pioggia', { no: /non piove|piove dentro|piove pesce|prima pioggia|pioveva/i, alt: 'Che freddo, eh?', amb: 'Che freddo, porca miseria.' }],
      ['caldo', /\b(che caldo|fa caldo|si muore di caldo|sto sudando|sudo come)\b/i, 'caldo', { no: /pane è caldo|caldo caldo/i, alt: 'Che freddo, eh?', amb: 'Che freddo, porca miseria.' }],
      ['sole', /c'è il sole|bella giornata|che sole\b|mi coprono il sole|prendo il sole|sole in faccia/i, 'sole'],
      ['luna', /che luna|guarda la luna/i, 'luna'],
      // l'ora
      ['buongiorno', /^Buongiorno\b|^Ciao [^!]+! Buongiorno\b/, 'mattino', { alt: (st, n, t) => t.replace(/Buongiorno/, alSaluto(st, 'Buongiorno')) }],
      ['buonasera', /\bBuonasera\b/, 'sera', { alt: (st, n, t) => t.replace(/Buonasera/, alSaluto(st, 'Buonasera')) }],
      ['buonanotte', /^Buonanotte\b/, 'tardi', { alt: (st, n, t) => t.replace(/Buonanotte/, alSaluto(st, 'Buonanotte')) }],
      ['il riflettore', /il riflettore/i, 'buio'],
      // i posti
      ['il bicchiere', /ancora un bicchiere|un altro bicchiere|un altro giro!|il conto, per favore|offro da bere a tutti/i, 'bar', { cl: ['fondo', 'voce', 'te', 'caldo'], amb: NOTTE_FONDO }],
      ['l\'offerta in chiesa', /Lasciatele lì, col cestino|accendete un cero|in chiesa si sta zitti/i, 'chiesa', { amb: RELIG }],
      ['il banco', /^(A quanto le vende\?|Ieri costavano meno\.|Che belle, oggi\.)$/, 'banco'],
      ['la vetrina', /non sulla vetrina/i, 'bottega'],
      // i Grigi
      ['i Grigi qui', /\becco i Grigi\b|c'è la ronda|i Grigi sono qui|guarda,? i Grigi/i, 'grigi'],
      ['i Grigi ti cercano', /è pieno di Grigi|i Grigi ti cercano|ti cercano i Grigi/i, 'cercato', { alt: (st, n, t) => t.replace(/Stai attento, che i Grigi ti cercano\./, 'Stai attento, che qui si sa tutto.').replace(/Togliti di qui, è pieno di Grigi che chiedono di te\./, 'Togliti di qui, che è meglio.') }],
      // i fatti
      ['gli spari', /\bsparano!|^Spari|giù! spari|al riparo!|^Tutti giù!/i, 'spari'],
      ['il botto', /che botto|il botto\?|è saltat[oa] in aria|è esplos[oa] (la|il|una|un)/i, 'botto', { no: /^Hai sentito\? .+ ha /i }],
      ['colpito', /M'hai preso, stronzo|il m'a touché|Mi ha sparato! A me/i, 'colpito'],
      ['colpi', /Mi hai bucato|Mon pantalon|colpi d'arma da fuoco|Ogni colpo è un verbale/i, 'sparato'],
      ['la mia macchina, sparata', /T'as tiré sur ma voiture/i, 'macchinaSparata'],
      // a chi lo dici: a Nino (i vocativi delle voci di notte), a qualcuno lì (le domande, il «tu»)
      ['detta a Nino', /^(Nino!|Ehi, ragazzo!|Toi!|Che fai in giro|Zio, pure tu fuori|Ehi! È l'Ora Quieta|Rientra, scemo)/, 'nino', { cl: AMB, amb: NOTTE_FONDO }],
      ['a qualcuno', /\?|\b(tu|ti|te|tuo|tua|tuoi|tue|vieni|hai|sai|c'hai|dimmi|senti|guarda|vuoi|stai|prendi|tieni|scusa|fra|zio|raga|vedi|zitto|zitti)\b/i, 'ascolta', { cl: AMB }],
    ].map(([id, re, c, o]) => Object.assign({ id, re, c }, o || {}));
    const ESENTI = new Set(['matto', 'fram', 'fram2']);
    function regole(text, cl) { return REGOLE.filter(r => (r.cl ? r.cl.includes(cl) : !ESENTI.has(cl)) && r.re.test(text) && !(r.no && r.no.test(text))); }
    // la prima regola che non vale (o null): la cache tiene il risultato di ogni condizione per chi parla, in quell'istante
    let CACHE = new WeakMap();
    const svuota = () => { CACHE = new WeakMap(); };   // per le prove: lo stato cambia senza che passi il tempo
    function cond(st, n, c) {
      let K = CACHE.get(n); if (!K || K.t !== st.clock) { K = { t: st.clock }; CACHE.set(n, K); }
      if (K[c] === undefined) { try { K[c] = !!COND[c](st, n); } catch (e) { K[c] = true; } }
      return K[c];
    }
    function viola(st, n, text, cl) { for (const r of regole(String(text || ''), cl || 'fondo')) if (!cond(st, n, r.c)) return r; return null; }
    const vale = (st, n, text, cl) => !viola(st, n, text, cl);
    const stats = { fuori: 0, cambiate: {}, tolte: {}, lasciate: {} };
    const conta = (o, k) => { o[k] = (o[k] || 0) + 1; };
    const giovane = n => ((n.pop && n.pop.age) || n.age || 40) <= 27;
    // il cancello: {text} (com'era o cambiata) o null (si tace)
    function gate(st, n, text, cl) {
      const amb = AMB.includes(cl);
      let t = text;
      for (let giro = 0; giro < 5; giro++) {
        const r = viola(st, n, t, cl); if (!r) { if (t !== text) conta(stats.cambiate, r0Id(text, st, n, cl)); return t; }
        if (giro === 0) stats.fuori++;
        // «Ciao Nino! …»: il saluto resta, si cambia o si toglie quello che viene dopo
        const m = t.match(/^(Ciao [^!]+! )(.+)$/);
        if (m && r.id !== 'buongiorno') { const resto = gate(st, n, m[2], 'te'); t = resto ? m[1] + resto : m[1].trim(); continue; }
        let a = ALT[t]; if (typeof a === 'function') a = a(st, n, t);
        if (!a) { const o = amb && r.amb !== undefined ? r.amb : amb && r.c === 'ascolta' ? (giovane(n) ? SOLO_G : SOLO) : r.alt; a = typeof o === 'function' ? o(st, n, t) : Array.isArray(o) ? pickOk(o, x => x !== t && vale(st, n, x, cl)) : o; }
        if (!a || a === t) {
          if (cl === 'scena') { conta(stats.lasciate, r.id); return t; }   // una scena non si rompe per una condizione dubbia: resta com'è
          conta(stats.tolte, r.id); return null;
        }
        t = a;
      }
      conta(stats.tolte, 'giri'); return cl === 'scena' ? text : null;
    }
    const r0Id = (text, st, n, cl) => { const r = viola(st, n, text, cl); return r ? r.id : '?'; };
    // la classe di una frase, senza la regia (per la prova a interruttore spento): basta a sapere a chi vale il «tu»
    const A_TE = /^(Ti ho visto: |.+ dice che (hai|mi hai) |Ho sentito che (hai|mi hai) |Ciao [^!]+! |Eccoti|Finalmente, )/;
    let MT = null;
    function testiMatti() {
      if (MT) return MT; const M = MM(); MT = { matto: new Set(), te: new Set(), fram: new Set() }; if (!M) return MT;
      const tutte = (o, S) => { if (typeof o === 'string') S.add(o); else if (Array.isArray(o)) o.forEach(x => tutte(x, S)); else if (o && typeof o === 'object') for (const k in o) if (typeof o[k] !== 'function') tutte(o[k], S); };
      for (const k in M.MATTI || {}) { const D = M.MATTI[k]; for (const q in D) if (Array.isArray(D[q])) tutte(D[q], MT.matto); }
      tutte(M.SCROCCO, MT.te); tutte(M.ROTELLE, MT.te); for (const k in M.MANIE || {}) tutte(M.MANIE[k].passa, MT.te);
      tutte(M.FRAM, MT.fram); tutte(M.FRAM_G, MT.fram);
      return MT;
    }
    function classeSemplice(st, n, text) {
      if (n.__ev) return 'scena';
      const T = testiMatti();
      if (n.__ap || T.te.has(text) || A_TE.test(text)) return 'te';
      if (n.pop && n.pop.matto && T.matto.has(text)) return 'matto';
      if (T.fram.has(text) || /^(?:(?:Fra|Zio|Oi|Oh|Senti), )?(?:[Hh]ai sentito\? |[Ll]'ho visto io: ).+\.$/.test(text)) return 'fram';
      const a = n.action && n.action.name;
      if (n.panic > 0 || n.aggro || n.cop || n.faction || ['affronta', 'insegue', 'fugge', 'combatte', 'arresta'].includes(a)) return 'caldo';
      if (/^Hai sentito\? .+!$/.test(text)) return 'voce';
      return 'fondo';
    }
    return { COND, REGOLE, ALT, SOLO, SOLO_G, regole, viola, vale, gate, cond, svuota, stats, classeSemplice };
  })();
  Commedia.contesto = CX;
  if (!ON) return;
  const G = typeof Game !== 'undefined' ? Game : null;
  if (!G || !G.HOOKS) return;

  const CFG = {
    R: 26,                 // il raggio in cui main.js disegna un fumetto
    gap: [6, 8],           // §2 una chiacchiera di fondo ogni 6-8 s vicino al giocatore
    max: 3,                // §2 fumetti vivi insieme vicino al giocatore
    zitti: 20,             // §2 attorno a una scena vicina, entro 20 m, le chiacchiere tacciono
    scenaVicina: 34,       // §2 «vicina»: il centro della scena entro 34 m dal giocatore
    voce: 120,             // §3 la stessa voce al massimo una volta ogni 2 minuti vicino al giocatore
    ripeti: 180,           // §5 la stessa frase di fondo al massimo una volta ogni 3 minuti vicino al giocatore
    lontano: 45,           // §2 fra 28 e 45 m le chiacchiere di fondo tacciono (entrerebbero nel raggio ancora vive, senza regia)
    dur: [1.2, 15, 2.2, 7] // §8 durata = 1,2 + caratteri/15, fra 2,2 e 7 s
  };
  const rnd = Math.random;
  const pick = L => L[Math.floor(rnd() * L.length)];
  const hyp = Math.hypot;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const stats = Commedia.stats = { viste: 0, tolte: {}, cambiate: {}, durata: 0, contesto: CX.stats };
  const tolta = k => { stats.tolte[k] = (stats.tolte[k] || 0) + 1; return null; };
  const cambiata = k => { stats.cambiate[k] = (stats.cambiate[k] || 0) + 1; };
  const notte = st => { const h = G.hour ? G.hour(st) : Math.floor(st.t / 60) % 24; return h >= 22 || h < 6; };
  const isMatto = n => !!(n && n.pop && n.pop.matto);
  const religioso = n => /\b(suor|suora|don|prete|parroco|frate|sagrestan|monaca)/i.test((n.role || '') + ' ' + (n.first || '') + ' ' + (n.name || ''));
  // un mazzo per lista: le frasi escono tutte prima di ripetersi
  const MAZZI = new Map();
  function dalMazzo(L) { let m = MAZZI.get(L); if (!m || !m.length) { m = L.map((_, i) => i).sort(() => rnd() - .5); MAZZI.set(L, m); } return L[m.pop()]; }

  // ======================= §1 COMBATTIMENTO =======================
  // game.js:1529 e :1782 pescano barksOf(n)[floor(rng*4)]: le liste sono chiuse nel modulo, ma il testo che esce è sempre una delle
  // prime 4 di COMBAT_BARKS. Qui si riconosce quel testo (e le grida della tribù di game.js:1484) e si pesca da tutta la banca della
  // fazione (battute.md §3): le prime 4, serie, escono il 55% delle volte; le altre il resto.
  const VECCHIE = {
    cop: ['Polizia! Getta l\'arma!', 'Fermo o sparo!', 'Centrale, sparatoria in corso!', 'A terra!', 'Centrale, sparatoria! Sì, lo so che è la mia pausa!', 'Ogni proiettile è un modulo da compilare, maledetto!', 'Arrenditi! Ho la suocera a cena, non ho tempo!'],
    squalo: ['Lo Squalo ti saluta!', 'Vieni fuori, Nino!', 'Sei un uomo morto!', 'Te la sei cercata!', 'Nino! Lo Squalo dice che ti vuole bene! Ma deve spararti!', 'Esci, che mia madre mi aspetta per pranzo!'],
    marsiglia: ['Tirez! Tirez!', 'Putain, il est là!', 'Crève, petit!', 'À gauche! À gauche!', 'Mais qui a pris ma baguette?! Pardon. Tirez!'],
    comune: ['Uuh-ah! Uuh-ah!', 'Carne fresca!', 'Circondatelo!', 'Il fuoco è acceso!'],
    tutela_isola: ['Fuoco! Fuoco!', 'Intruso nella zona militare!', 'Copritemi!', 'Non farlo scappare!'],
  };
  const COMBAT = {
    cop: ['Fermo! Getta l\'arma!', 'A terra! Mani sulla testa! Sulla tua, scemo!', 'Centrale, colpi d\'arma da fuoco! Mandate tutti!', 'Copritemi! Lo prendo dal vico!',
      'Ogni colpo è un verbale, stronzo! Sei pagine a colpo!', 'Mi ha sparato! A me! Ho due figli e il mutuo, stronzo!', 'Mandate rinforzi! E dite a mia moglie che il sugo lo spegne lei!',
      'Lo sai quanto costa un proiettile alla Tutela? Te lo detraggo!', 'Arrenditi e nessuno si fa male! Tranne te, un po\', in caserma!', 'Mi hai bucato il cappello! È d\'ordinanza! Me lo scalano!',
      'Sparo! Sparo davvero! ...Ferri, come si toglie la sicura?', 'Mi hai bucato la divisa nuova, stronzo! La pago io!', 'Rinforzi! E portate le sigarette! Ho finito le sigarette!',
      'Esci con le mani alzate! O come ti pare, basta che esci!', 'Copri tu, Ferri! Io copro la macchina! Da dietro! Seduto!'],
    squalo: ['Lo Squalo ti saluta!', 'Vieni fuori, Nino!', 'Te la sei cercata!', 'Giragli dietro, Tano!',
      'Vai avanti tu, Tano! Io ho la giacca nuova!', 'Vieni fuori, che ti faccio lo sconto sul funerale!', 'Mi hai sporcato la giacca! Questa la paghi a parte!',
      'Alle gambe! Sparagli alle gambe! ...Tano, quelle sono le mie!', 'Esci, dai! Mia madre ha buttato la pasta, e scuoce!', 'Te l\'abbiamo detto con le buone! Queste sono le meno buone!',
      'Dopo questa il debito raddoppia! Fai il conto tu, che non ho la penna!', 'Ti voglio bene, Nino! Ma devo spararti! Sono due cose diverse!', 'M\'hai preso, stronzo! M\'hai preso! ...No, è il sugo. Ti ammazzo!',
      'Sbrighiamoci, ho la macchina in seconda fila!', 'Rocco, non sulla vetrina! Quello paga regolare!'],
    marsiglia: ['Tirez! Tirez!', 'Il est là, putain!', 'Personne ne touche la valise!', 'À gauche! À gauche!',
      'T\'as tiré sur ma voiture?! Ma voiture! Je vais te tuer deux fois!', 'Didier! Arrête de recharger en chantant!', 'Mon pantalon! C\'était du lin! Tu vas payer!',
      'Il est où? ...Derrière toi! Non, l\'autre toi!', 'Le bateau part dans dix minutes! Tue-le vite!', 'Va\' fanculo, Italien! C\'est le seul mot que je sais!',
      'Mon dernier chargeur! Fais-toi tuer avec, au moins!', 'Didier, il m\'a touché! Je saigne! ...Non, c\'est le vin!', 'Ma mère m\'appelle ce soir! Je veux lui dire que c\'est fait!',
      'Couvre-moi! Avec les balles! Pas avec ton manteau!', 'Il ne meurt pas! Pourquoi il ne meurt pas? C\'est l\'humidité!'],
    tutela_isola: ['Intruso in zona militare!', 'Fuoco! Fuoco!', 'Copritemi!', 'Non farlo scappare!',
      'Fuoco a volontà! ...Con moderazione, il magazzino è vuoto!', 'Sentinella tre, rispondi! ...Dorme! Svegliatelo, sparano!', 'Per la Tutela! E per la licenza di Pasqua!',
      'Copritemi! Mi mancano sei mesi al congedo!', 'Liberate il cane! ...È scappato! Liberate il caporale!', 'Mamma, sono al varco! Sparano! Sì, ho mangiato! Mamma, ti richiamo!',
      'Torre due, il riflettore! Non su di me! Su di lui!', 'Mi sono pisciato addosso! Nessuno lo dica al sergente!', 'Rapporto: contatto ostile! Rapporto: ho paura! Cancella il secondo!',
      'Alt, chi va là! Rispondi! Rispondi, se no devo uscire dalla garitta!', 'Ho perso il fucile! Il fucile! Chi ha visto il mio fucile?!'],
    // la Comune (sostituisce la tribù di isola:tribu): quelli che nel '79 sono scappati sull'isola a fare la vita libera. Nessuna etnia.
    comune: ['Fuori dalla nostra terra!', 'Circondatelo!', 'Proteggete le capre!', 'Il fuoco è acceso! Tutti al fuoco!',
      'Niente denaro, niente Stato, niente te! Via!', 'Sei della Tutela? Del continente? Sei vestito male uguale!', 'Assemblea! Votiamo! ...Abbiamo votato: addosso!',
      'Pace e amore! Ma la capra non si tocca! È mia! Privata!', 'Non toccare l\'orto! L\'orto è vivo! Tu ancora per poco!', 'Sette anni che ci sentiamo osservati! Eccoti, finalmente!',
      'Mi hai calpestato i pomodori! I pomodori! Assassino!', 'Avevamo detto niente armi! Abbiamo cambiato idea nel \'79!', 'In cerchio! Come alle riunioni! Lui al centro!',
      'Chi ti manda? La Tutela? Mia madre? Rispondi!', 'Tiragli il formaggio! Quello stagionato!'],
  };
  const VECCHIA_DI = new Map(); for (const k in VECCHIE) VECCHIE[k].forEach(t => VECCHIA_DI.set(t, k));
  VECCHIA_DI.set('Prendetelo!', 'comune?');   // game.js:1484: è anche un grido qualunque; vale solo per chi è della tribù
  function chiaveCombat(n, text) {
    let k = VECCHIA_DI.get(text); if (!k) return null;
    if (k === 'comune?') { if (n.faction !== 'isola:tribu') return null; k = 'comune'; }
    if (n.faction === 'isola:tribu') k = 'comune';
    else if (n.cop) k = 'cop';
    else if (n.faction === 'squalo' || n.faction === 'marsiglia' || n.faction === 'tutela_isola') k = n.faction;
    return k;
  }
  // §9 anche qui il contesto: «Io copro la macchina» solo se una macchina c'è, «M'hai preso» solo se l'hanno preso davvero
  function combatLine(n, k, st) {
    const L = COMBAT[k]; if (!L) return null;
    const ok = t => !st || CX.vale(st, n, t, 'caldo');
    let t, i = 0; do { t = rnd() < .55 ? L[Math.floor(rnd() * 4)] : L[4 + Math.floor(rnd() * (L.length - 4))]; } while ((t === n.__cmCo || !ok(t)) && ++i < 12);
    if (!ok(t)) { cambiata('combattimento:contesto'); t = L.find(x => x !== n.__cmCo && ok(x)) || L[0]; }
    n.__cmCo = t; return t;
  }

  // ======================= §6 OGGETTI: gli articoli =======================
  // convivenza.js:190/194/271 e scambi.js:114/160 mettono il nome dell'oggetto (Oggetti.CAT[id].nome) o l'etichetta del bisogno
  // (scambi.js wants: «sigarette», «legna per la stufa») senza articolo. Qui si riconoscono quelle frasi e l'oggetto prende il suo.
  const FP = new Set('sigarette cipolle olive sarde barre pinze tronchesi forbici pile lampadine valvole penne buste garze bende siringhe fiale spugne lenzuola manette castagne acciughe mele arance noci gomme fascette molle cesoie chiavi cuffie matrici vitamine posate calze monete lattine batterie cassette pietre uova candele gallette patate'.split(' '));
  const FS = new Set('carne trave chiave rete radio ricetrasmittente foto pelle molotov calce falce dinamo legna'.split(' '));
  const MS = new Set('mitra passamontagna tirapugni tè caffè baccalà whisky'.split(' '));
  const MP = new Set('jeans transistor'.split(' '));
  const MASSA = new Set('pane verdura frutta carne pesce birra grappa whisky aranciata olio sale zucchero caffè tè lievito strutto carbonella sughero colla corda latte miele ricotta mortadella polenta marmellata burro aceto orzo vodka roba refurtiva tabacco baccalà piombo lana salsiccia salame acqua alcol detersivo candeggina disinfettante dentifricio shampoo silicone succo legna liquore pepe sapone polpo gelato'.split(' '));
  const VOC = /^[aeiouàèéìòùh]/i, SPEC = /^(s[^aeiouàèéìòù]|z|gn|ps|pn|x|y)/i;
  function genere(frase) {
    const h = frase.toLowerCase().split(/[\s']/)[0];
    const g = FP.has(h) ? 'fp' : FS.has(h) ? 'fs' : MS.has(h) ? 'ms' : MP.has(h) ? 'mp' : /a$/.test(h) ? 'fs' : /i$/.test(h) ? 'mp' : 'ms';
    return { g, massa: MASSA.has(h) && g[1] === 's', h };
  }
  const ARTICOLATO = /^(il|lo|la|i|gli|le|un|uno|una|del|dello|della|dei|degli|delle|qualcosa|qualche|un'|l'|dell'|mio|mia|tuo|tua|suo|sua|due|tre|quel|quella|questo|questa|niente|nulla)\b/i;
  function articolo(frase) {
    frase = frase.replace(/\s*\([^)]*\)/g, '').trim();   // «sacco di farina (5 kg)», «tanica d'acqua (10 l)»: la parentesi da magazzino non si dice
    if (!frase || ARTICOLATO.test(frase) || /^un'/i.test(frase)) return { frase, g: 'ms', fatto: false };
    const { g, massa } = genere(frase), v = VOC.test(frase), s = SPEC.test(frase);
    let a;
    if (massa) a = g === 'fs' ? (v ? 'dell\'' : 'della ') : (v ? 'dell\'' : s ? 'dello ' : 'del ');
    else if (g === 'fs') a = v ? 'un\'' : 'una ';
    else if (g === 'ms') a = s ? 'uno ' : 'un ';
    else if (g === 'mp') a = v || s ? 'degli ' : 'dei ';
    else a = 'delle ';
    return { frase: a + frase, g, massa, fatto: true };
  }
  // la fame, che tornava 16 volte con «Mi serve qualcosa da mangiare, sai chi ce l'ha?»
  const FAME = ['Ho una fame che mi mangerei il cane. Chi ha qualcosa?', 'Da ieri un caffè e basta. Sai chi ha da mangiare?', 'Ho fame! Mia madre ha chiuso la credenza col lucchetto!',
    'C\'ho una fame… Se vedi un panino incustodito, è mio.', 'Mi mangerei il tavolo. Con le sedie.', 'Ho saltato il pranzo. E la cena di ieri. Chi offre?'];
  const OGGETTI_T = [
    [/^(Scusa… per caso hai )(.+)(\? Mi serve proprio\. Te )lo( ripago\.)$/, 'pron'],
    [/^(Ho visto che hai )(.+)(\. Me ne daresti un po'\? Poi ti ricambio\.)$/],
    [/^(.+, una cortesia: )(.+)(\. Ne ho bisogno\.)$/],
    [/^(Sai mica dove trovo )(.+)(\? Non se ne trova\.)$/],
    [/^(Mi serve )(.+)(, se senti qualcosa dimmelo\.)$/, 'serve'],
    [/^(Cerco )(.+)( da stamattina\. Tu ne sai niente\?)$/],
    [/^(Ho )(.+)(, se ti serve te )lo( do a buon prezzo\.)$/, 'pron'],
    [/^(Ti interessa )(.+)(\? Per te faccio uno sconto\.)$/, 'serve'],
    [/^(Ti interessa )(.+)(\? Te )lo( do a poco\.)$/, 'serve pron'],
    [/^(Mi serve )(.+)(, sai chi ce )l'ha(\?)$/, 'serve chi'],
    [/^(Non trovo )(.+)( da nessuna parte\.)$/],
    [/^(Ce l'hai )(.+)(\?)$/, 'celhai'],
    [/^(Mi daresti )(.+)(\?)$/],
    [/^(Quanto vuoi per )(.+)(\?)$/],
    [/^(.+ devo portare )(.+?)( a [A-ZÀ-Ü].*\.)$/],
    [/^(.+ mi porta )(.+)(\.)$/],
  ];
  function fixOggetti(text) {
    for (const [re, k] of OGGETTI_T) {
      const m = text.match(re); if (!m) continue;
      const item = m[2];
      if (/^qualcosa da mangiare$/.test(item)) { cambiata('oggetti:fame'); return dalMazzo(FAME); }
      const A = articolo(item); if (!A.fatto && A.frase === item) return text;
      const pl = A.g[1] === 'p', pron = A.g === 'fs' ? 'la' : A.g === 'mp' ? 'li' : A.g === 'fp' ? 'le' : 'lo';
      let pre = m[1], post = m[3], tail = m[4] || '';
      if (k && /serve/.test(k) && pl) pre = pre.replace(/^Mi serve /, 'Mi servono ').replace(/^Ti interessa /, 'Ti interessano ');
      if (k && /celhai/.test(k) && (pl || A.massa)) pre = 'Hai ';
      let mid = '';
      if (k && /pron/.test(k)) mid = pron;
      if (k && /chi/.test(k)) mid = A.massa ? '' : pl ? (A.g === 'fp' ? 'le ha' : 'li ha') : (A.g === 'fs' ? 'l\'ha' : 'l\'ha');
      if (k && /chi/.test(k) && A.massa) { post = ', sai chi ne ha'; }
      cambiata('oggetti');
      return pre + A.frase + post + mid + tail;
    }
    return text;
  }

  // ======================= §5 LAVORO =======================
  // popolo.js:1885 chatLine: `Al lavoro (${P.job.title}) oggi non finiva più.`, `Domani attacco alle ${P.job.start}.` (anche «alle 0»,
  // anche la suora), «Il padrone ci mette i piedi in testa.» (17 volte in 6 minuti). Diventano un mazzo: escono tutte prima di ripetersi.
  const LAVORO = ['Il padrone ci mette i piedi in testa.', 'Otto ore in piedi! E il padrone seduto! A guardarmi!', 'Il padrone mi ha dato del lei. Mi licenzia, vedrai.',
    'Domani mi do malato. La tosse ce l\'ho già pronta.', 'Al lavoro ho rotto una cosa. Ho detto che era già rotta.', 'Mi hanno dato l\'aumento! Cinquanta lire! Già spese.',
    'Oggi il capo era malato. Il giorno più bello dell\'anno.', 'Ho chiesto le ferie. Mi ha riso in faccia. Due volte.', 'Il padrone vuole che sorrida. Con questa paga? Sorrida lui.',
    'Mi sono chiuso nel cesso del lavoro un\'ora. Record.', 'Oggi ho lavorato tantissimo. Cioè, ho guardato lavorare tantissimo.'];
  const RELIGIOSI = ['Chi ha rubato le candele? Chi?! Le conto ogni sera! Ne mancano tre!', 'Offerte! Lasciatele lì, col cestino non giro. Ho il mal di schiena.',
    'Tre ore di confessione e nessuno ha peccato! Tutti santi! Bugiardi!', 'Le suore non hanno paura. Hanno un ombrello robusto e la mira buona.',
    'Confessione? Adesso? Dimmi solo i peccati grossi, che ho il brodo.', 'Sì, io fumo! E gioco a carte con le suore! E vinco!'];
  const CODE_ATTACCO = ['', ' Che vita di merda.', ' Sveglia un\'ora prima. Ammazzatemi.', ' Cioè, alle {h} arrivo al bar.'];
  function fixLavoro(st, n, text) {
    let m;
    const stampo = /^Al lavoro \(.+\) oggi non finiva più\.$/.test(text) || text === 'Il padrone ci mette i piedi in testa.' || (m = text.match(/^Domani attacco alle (\d+)\.$/));
    if (!stampo) {
      // la suora con la figlia che si sposa, il prete col fratello: il ripiego generico di chatLine, per chi ha preso i voti, è una cosa da prete
      if (religioso(n) && /\b(mia figlia|mio figlio|mia moglie|mio marito|tuo fratello|fidanzat)/i.test(text)) { cambiata('lavoro:religioso'); return dalMazzo(RELIGIOSI); }
      return text;
    }
    if (religioso(n)) { cambiata('lavoro:religioso'); return dalMazzo(RELIGIOSI); }
    if (m) { const h = +m[1]; if (h >= 4 && h <= 11 && !notte(st) && rnd() < .5) { cambiata('lavoro:attacco'); return `Domani attacco alle ${h}.` + pick(CODE_ATTACCO).replace('{h}', h); } }
    cambiata('lavoro'); return dalMazzo(LAVORO);
  }

  // ======================= §7 NOTTE =======================
  // dalle 22 alle 6 le frasi del giorno («Stamattina alla punta abboccavano», «Domani attacco alle 7») lasciano il posto a quelle della
  // notte (battute.md §2 «di notte, durante l'Ora Quieta», per voce), più qualcuna di fondo fra loro.
  const NOTTE = {
    grigio: ['Ehi! È l\'Ora Quieta! A casa! Subito! O ti ci porto io, a calci!', 'Che fai in giro?! Documenti! Dai, non tirarli fuori, fa freddo.'],
    ragazzi: ['Zio, pure tu fuori? Shh. Adesso è tutto nostro.', 'Raga, piano. Se mia madre si sveglia sono morto.'],
    vecchia: ['Rientra, scemo! ...Ah, sei Nino. Rientra, scemo.'],
    benpensante: ['Chiamo la Guardia! Giuro! ...Chi ha il numero?'],
    reduce: ['Ehi, ragazzo! Ho perso le chiavi! Aprimi tu! Sali dal balcone!'],
    famiglia: ['Nino! Che ci fai qui di notte? Lavori? No? Allora porta i soldi!'],
    marsigliese: ['Toi! Non hai visto niente! Io ho paura del buio, voilà! Chut!'],
    prete: ['Chi canta a quest\'ora?! Smettila! O canta meglio!'],
    pescatore: ['Spostati, che esco in mare! Alle tre! Ogni notte! Che vita di merda!'],
    fondo: ['Che ore sono? ...Le undici? Mia moglie mi ammazza.', 'Ancora un bicchiere e vado. L\'ho detto anche tre bicchieri fa.', 'Zitto! Passa la ronda! ...Era un gatto. Che spavento, porca miseria.'],
  };
  const GIORNO = /(\b[Ss]tamattina\b|\b[Oo]ggi\b|Domani attacco|Buongiorno|Sabato si va|Partitella|A quanto le vende|Ieri costavano|Che belle, oggi|Domani esco all'alba|\bstasera\b|\bStasera\b|Al lavoro|padrone|Mi hanno dato l'aumento|Ho chiesto le ferie|Domani mi do malato|Otto ore in piedi)/;
  function voceDi(n) {
    const r = (n.role || '').toLowerCase(), age = (n.pop && n.pop.age) || n.age || 40, f = n.pop && n.pop.sex === 'f';
    if (n.cop) return 'grigio'; if (n.faction === 'squalo') return 'famiglia'; if (n.faction === 'marsiglia') return 'marsigliese';
    if (religioso(n)) return 'prete'; if (/pescat|portual|marinai|scaricat|gruist/.test(r)) return 'pescatore';
    if (age <= 26) return 'ragazzi'; if (age >= 65 && f) return 'vecchia'; if (age >= 55 && !f) return 'reduce';
    return 'benpensante';
  }
  function fixNotte(st, n, text) {
    if (!notte(st) || !GIORNO.test(text)) return text;
    cambiata('notte');
    const v = voceDi(n);
    return rnd() < .45 ? dalMazzo(NOTTE.fondo) : dalMazzo(NOTTE[v] || NOTTE.fondo);
  }

  // ======================= §3 VOCI =======================
  // game.js shareOne: say(sp, rumorText) = «Hai sentito? X ha dipinto un muro!» a ogni passaggio di bocca: 27 volte in piazza. Qui la stessa
  // voce (chi + cosa) si vede al massimo una volta ogni 2 minuti vicino al giocatore, con parole diverse; la forma «Hai sentito?» resta
  // in metà delle varianti (main.js la colora di blu).
  const VOCI = [
    b => `Hai sentito? ${cap(b)}!`,
    b => `Hai sentito? ${cap(b)}! E io non c'ero, che sfiga.`,
    b => `Hai sentito? ${cap(b)}! Adesso i Grigi vengono a chiedere a me!`,
    b => `Hai sentito? ${cap(b)}! L'ha detto mia cugina. Lei sa tutto.`,
    b => `${cap(b)}! Giuro! Me l'ha detto il barbiere!`,
    b => `Oh! ${cap(b)}! E a me non mi chiama mai nessuno.`,
    b => `Lo sai che ${b}? Io l'ho già detto a tutti. Tre volte.`,
    b => `${cap(b)}! E io dormivo! Perché mi perdo sempre tutto?!`,
    b => `Indovina! ${cap(b)}! ...Non hai indovinato, eh?`,
  ];
  const VERBI_SU = /^(\S+) ha (scippato|picchiato|investito|provato a comprare|aiutato|sparato a|ammazzato|rapinato) (\S+)$/;
  // «Tore ha picchiato Tore»: in città ci sono tre Tore. Se sono due persone diverse con lo stesso nome, «un altro Tore»; se è
  // davvero la stessa (actor = target), la voce non si dice.
  function chiStessi(st, n, body) {
    const m = body.match(VERBI_SU); if (!m || m[1] !== m[3]) return body;
    const L = (st.links || []).filter(l => l.a === n.id).pop();
    if (L) {
      const mem = (n.mem || []).filter(x => x.actor === L.actor && (x.type === L.type || ({ scippo: 'aggressione', investimento: 'aggressione', ferimento: 'omicidio' })[x.type] === L.type)).sort((a, b) => b.t - a.t)[0];
      if (mem && mem.target === mem.actor) return null;
    } else return null;
    cambiata('voci:omonimi');
    return `${m[1]} ha ${m[2]} un altro ${m[3]}`;
  }
  const chiaveVoce = body => body.toLowerCase().replace(/[.!?,]/g, '').split(/\s+/).slice(0, 4).join(' ');
  // ritorna {text, key} o null (da tacere)
  function fixVoce(st, n, text) {
    let m = text.match(/^Hai sentito\? (.+)!$/);
    if (m) {
      const body = chiStessi(st, n, m[1]); if (body === null) return null;
      const t = rnd() < .2 ? `Hai sentito? ${cap(body)}!` : dalMazzo(VOCI)(body);
      if (t !== text) cambiata('voci');
      return { text: t, key: chiaveVoce(body) };
    }
    // matti.js voce(): il primo fumetto della conversazione su un fatto vero
    m = text.match(/^(?:(?:Fra|Zio|Oi|Oh|Senti), )?(?:[Hh]ai sentito\? |[Ll]'ho visto io: )(.+?)\.$/);
    if (m) {
      let body = m[1]; const v = body.match(/^(\S+) ha (\S+(?: a)?) (\S+)(.*)$/);
      if (v && v[1] === v[3]) { text = text.replace(`${v[1]} ha ${v[2]} ${v[3]}`, `${v[1]} ha ${v[2]} un altro ${v[3]}`); cambiata('voci:omonimi'); }
      return { text, key: chiaveVoce(body) };
    }
    return { text, key: null };
  }
  const eVoce = t => /^Hai sentito\? .+!$/.test(t) || /^(?:(?:Fra|Zio|Oi|Oh|Senti), )?(?:[Hh]ai sentito\? |[Ll]'ho visto io: )/.test(t);

  // ======================= §8 RITMO: la durata =======================
  const durata = text => clamp(CFG.dur[0] + String(text).length / CFG.dur[1], CFG.dur[2], CFG.dur[3]);

  // ======================= §2 §4 VOLUME E PALCOSCENICO =======================
  // Da dove viene una battuta, visto che il setter non lo sa: dallo stato di chi parla e dal testo.
  //   scena   chi recita (n.__ev): eventi.js lascia passare solo le battute della scena (G.say tace per gli attori)
  //   te      rivolte al giocatore: le visite (n.__ap, convivenza), quello che risponde quando gli parli (G.talk), chi ti ha visto
  //           (game.js maybeBark), lo scrocco, le manie e la sedia con le rotelle (matti.js, a 4 m), le reazioni a quello che fai
  //   caldo   chi combatte, scappa, insegue, ha paura, i Grigi e le fazioni in azione
  //   matto   le battute dei 5 matti (matti.js MATTI)
  //   fram    i frammenti a due voci di matti.js (si decide alla prima battuta; le altre seguono)
  //   voce    le voci (game.js shareOne, matti.js voce)
  //   fondo   tutto il resto: chatLine di popolo.js, azioni.js social, scambi.js, i saluti fra loro
  const PRIO = { scena: 4, te: 4, caldo: 3, matto: 3, fram2: 2, fram: 1, voce: 1, fondo: 1 };
  const REAZIONI = new Set(['Che succede laggiù?', 'Ma cosa…', 'Hai sentito?', 'Sparano!', 'Aiuto!', 'Tutti giù!', 'Madonna santa!', 'Scappate!', 'Mi ha colpito!', 'Aaah! Aiuto!', 'Non sparare!',
    'Non sparare! Ti prego!', 'Ho famiglia!', 'Calma, calma…', 'Aiuto! Stammi lontano!', 'Meglio girare al largo…', 'Sei tu che vai in giro a parlare di me, eh?', 'Io non ho visto niente, eh.',
    'Ciao Nino! Grazie ancora.', 'Questa è per le voci che metti in giro!', 'Agente, devo dirle una cosa.', 'Il portafoglio! Chi è stato?', 'Fermo! Polizia!', 'Esco anch\'io. Dov\'è?',
    'Zona militare della Tutela! Torna indietro!', 'Hé! Toi! Reste loin. Stai lontano!', 'Rinforzi sul posto! Dov\'è?',
    'Attento!', 'Ma sei matto?!', 'Mannaggia!', 'Ao, piano!', 'Ehi! Ehi!', 'Guarda dove vai!', 'Ammazza!', 'Ma l\'hai visto?', 'Bravo!', 'Uh, che volo.', 'Questo è matto.', 'Rifallo!',
    'Ragazzi d\'oggi...', 'Si romperà l\'osso del collo.', 'Ma guarda questo.', 'Ahahah!', 'Ahia.', 'Tutto a posto?', 'Si è stampato.']);
  const GRIGI_FONDO = new Set(['Va bene. Circolare.', 'In regola. Vada pure.', 'Documenti, prego.', 'Un controllo. I documenti.', 'Lei. Venga qui. Documenti.', 'Alt. Coprifuoco. Documenti.', 'Dove va a quest\'ora? Documenti.', 'Fermo lì. Mani in vista.']);
  const A_TE = /^(Ti ho visto: |.+ dice che (hai|mi hai) |Ho sentito che (hai|mi hai) )/;
  let CTX_TE = 0, ST = null, MQ = [];
  let MATTI_TXT = null, TE_TXT = null;
  function banche() {
    if (MATTI_TXT) return;
    MATTI_TXT = new Set(); TE_TXT = new Set();
    const M = typeof Matti !== 'undefined' ? Matti : null; if (!M) return;
    const tutte = (o, S) => { if (typeof o === 'string') S.add(o); else if (Array.isArray(o)) o.forEach(x => tutte(x, S)); else if (o && typeof o === 'object') for (const k in o) if (typeof o[k] !== 'function') tutte(o[k], S); };
    for (const k in M.MATTI || {}) { const D = M.MATTI[k]; for (const q in D) if (Array.isArray(D[q])) tutte(D[q], MATTI_TXT); }
    tutte(M.SCROCCO, TE_TXT); tutte(M.ROTELLE, TE_TXT); for (const k in M.MANIE || {}) tutte(M.MANIE[k].passa, TE_TXT);
  }
  function classe(st, n, text) {
    banche();
    if (n.__ev) return 'scena';
    if (CTX_TE || n.__ap || TE_TXT.has(text) || A_TE.test(text)) return 'te';
    if (REAZIONI.has(text) || chiaveCombat(n, text)) return 'caldo';
    const a = n.action && n.action.name;
    if (n.panic > 0 || n.aggro || ['affronta', 'insegue', 'fugge', 'combatte', 'arresta'].includes(a)) return 'caldo';
    if (isMatto(n) && MATTI_TXT.has(text)) return 'matto';
    const q = MQ.find(x => x.id === n.id && x.text === text);
    if (q) return q.at === q.g ? 'fram' : 'fram2';
    if (eVoce(text)) return 'voce';
    if (n.cop && GRIGI_FONDO.has(text)) return 'fondo';   // ordine.js:453, il controllo a un passante qualunque: routine, non azione
    if (n.cop || n.faction) return 'caldo';
    return 'fondo';
  }
  const R = { lastAmb: -1e9, gap: CFG.gap[0], visto: new Map(), voci: new Map(), fram: new Map() };
  Commedia.R = R;
  const PR = new WeakMap(), CL = new WeakMap();   // la priorità e la classe di ogni fumetto vivo
  Commedia.classeDi = b => CL.get(b);
  function vivi(st, except) {
    const p = st.player, out = [];
    for (const k of st.npcs) {
      if (k === except || k.dead) continue; const b = k.bark;
      if (!b || !(b.until > st.clock) || (k.inside && !p.indoor)) continue;
      const d = hyp(k.x - p.x, k.y - p.y); if (d < CFG.R) out.push({ n: k, b, d, pr: PR.get(b) || 1 });
    }
    return out;
  }
  function scenaVicina(st, n) {
    const E = typeof Eventi !== 'undefined' && Eventi.S ? Eventi.S(st) : null; if (!E || !E.live) return null; const p = st.player;
    for (const sc of E.live) { const s = sc.spot; if (!s || (sc.cast || []).includes(n)) continue; if (hyp(s.x - p.x, s.y - p.y) < CFG.scenaVicina && hyp(n.x - s.x, n.y - s.y) < CFG.zitti) return sc; }
    return null;
  }
  // fa posto a una battuta importante: si spegne il fumetto vivo meno importante (a parità, il più lontano)
  function faiPosto(st, n, pr, d) {
    const V = vivi(st, n); if (V.length < CFG.max) return true;
    V.sort((a, b) => a.pr - b.pr || b.d - a.d);
    const w = V[0]; if (w.pr < pr || (w.pr === pr && w.d > d)) { w.b.until = st.clock; tolta('spento:' + (w.pr)); return true; }
    return false;
  }

  // ======================= IL FILTRO =======================
  const ESENTI_CX = new Set(['matto', 'fram', 'fram2']);
  function filtra(st, n, b) {
    let text = String(b.text || ''); if (!text) return b;
    const p = st.player, d = hyp(n.x - p.x, n.y - p.y), vis = d < CFG.R + 2 && !(n.inside && !p.indoor);
    let cl = classe(st, n, text);
    // §1 combattimento
    const ck = chiaveCombat(n, text);
    if (ck) { const t = combatLine(n, ck, st); if (t) { text = t; cambiata('combattimento'); } }
    // §4 il palcoscenico: chi recita non dice voci né chiacchiere; i matti non dicono le chiacchiere di tutti
    if (n.__ev && (/^Hai sentito\? .+!$/.test(text) || MQ.some(x => x.id === n.id && x.text === text))) return tolta('scena:voce');
    if (isMatto(n) && !n.__ev && (cl === 'fondo' || cl === 'voce' || cl === 'fram' || cl === 'fram2')) return tolta('matto:fuori voce');
    // §5 §6 §7 i testi
    if (cl !== 'scena' && cl !== 'matto' && cl !== 'caldo') { text = fixLavoro(st, n, text); text = fixOggetti(text); }
    if (cl === 'fondo') text = fixNotte(st, n, text);   // solo le chiacchiere: un invito «stasera alle 21» o un frammento a due voci restano com'erano
    // §3 le voci
    let key = null;
    if (cl === 'voce' || cl === 'fram') { const v = fixVoce(st, n, text); if (!v) return tolta('voce:se stesso'); text = v.text; key = v.key; }
    // §9 il contesto: la frase dev'essere vera di quello che chi parla ha intorno (i matti e i frammenti ne sono fuori)
    if (!ESENTI_CX.has(cl)) { const g = CX.gate(st, n, text, cl); if (g === null) return tolta('contesto'); if (g !== text) cambiata('contesto'); text = g; }
    const q = (cl === 'fram' || cl === 'fram2') ? MQ.find(x => x.id === n.id && x.text === b.text) : null;
    if (vis) {
      if (cl === 'fram2') {
        const ok = q && R.fram.get(q.g); if (!ok) return tolta('fram:seguito');
        faiPosto(st, n, PRIO.fram2, d);
      } else if (PRIO[cl] === 1) {
        const no = (() => {
          if (scenaVicina(st, n)) return 'fondo:scena vicina';
          if (st.clock - R.lastAmb < R.gap) return 'fondo:ritmo';
          if (vivi(st, n).length >= CFG.max) return 'fondo:troppi';
          if (key) { const t0 = R.voci.get(key); if (t0 !== undefined && st.clock - t0 < CFG.voce) return 'voce:già detta'; }
          const t1 = R.visto.get(text); if (t1 !== undefined && st.clock - t1 < CFG.ripeti) return 'fondo:ripetuta';
          return null;
        })();
        if (q) R.fram.set(q.g, !no);
        if (no) return tolta(no);
        R.lastAmb = st.clock; R.gap = CFG.gap[0] + rnd() * (CFG.gap[1] - CFG.gap[0]);
        if (key) R.voci.set(key, st.clock);
      } else faiPosto(st, n, PRIO[cl], d);
      R.visto.set(text, st.clock);
      if (R.visto.size > 400) { for (const [k, t] of R.visto) if (st.clock - t > CFG.ripeti) R.visto.delete(k); }
      stats.viste++;
    } else {
      if (q && cl === 'fram') R.fram.set(q.g, false);   // un frammento lontano non si sente: le altre battute nemmeno
      // una chiacchiera appena fuori dal raggio arriverebbe in quadro ancora viva (chi parla cammina, il giocatore pure) e senza regia
      if (PRIO[cl] === 1 && d < CFG.lontano && !(n.inside && !p.indoor)) return tolta('fondo:lontano');
      // chi è dentro un edificio mentre il giocatore è fuori non si vede (main.js non lo disegna): la sua chiacchiera non serve
      if (PRIO[cl] === 1 && n.inside && !p.indoor && d < CFG.lontano) return tolta('fondo:dentro');
    }
    // §8 la durata secondo la lunghezza
    b.text = text; b.until = st.clock + durata(text); stats.durata++;
    PR.set(b, PRIO[cl] || 1); CL.set(b, cl);
    return b;
  }
  Commedia.filtra = filtra;

  // ======================= L'AGGANCIO =======================
  // ogni NPC: «bark» diventa una proprietà con setter (game.js say, l'unico che la scrive). n.bark = null passa com'è.
  const FATTI = new WeakSet();
  function aggancia(n) {
    if (!n || FATTI.has(n)) return; FATTI.add(n);
    let cur = n.bark;
    Object.defineProperty(n, 'bark', { configurable: true, enumerable: true, get() { return cur; },
      set(b) { if (!b || typeof b !== 'object' || !ST || b === cur) { cur = b; return; } let r = null; try { r = filtra(ST, n, b); } catch (e) { r = b; if (!filtra.err) { filtra.err = 1; console.warn('[Commedia]', e); } } if (r) cur = r; } });
  }
  function agganciaTutti(st) { if (st.npcs) for (const n of st.npcs) if (!FATTI.has(n)) aggancia(n); }
  { const c0 = G.HOOKS.create; G.HOOKS.create = st => { if (c0) c0(st); ST = st; agganciaTutti(st); }; }
  { const s0 = G.HOOKS.step; G.HOOKS.step = (st, dt) => {
      ST = st; agganciaTutti(st);
      // la coda dei frammenti di matti.js, com'è prima che matti.js la consumi: dice a filtra chi sta parlando in un frammento
      const M = typeof Matti !== 'undefined' && Matti.S ? Matti.S(st) : null; MQ = M && M.q ? M.q.slice() : [];
      if (s0) s0(st, dt);
    }; }
  // quello che dice quando gli parli tu è rivolto a te
  for (const f of ['talk', 'talkChoice', 'act']) { const f0 = G[f]; if (typeof f0 === 'function') G[f] = function () { CTX_TE++; try { if (arguments[0]) { ST = arguments[0]; agganciaTutti(ST); } return f0.apply(this, arguments); } finally { CTX_TE--; } }; }

  // ======================= §8 RITMO: il fumetto nella pagina =======================
  // Lo stile «D — striscia» (scelta della direzione artistica): niente nuvola; ogni riga del testo sta su una striscia d'inchiostro
  // (nero #16121B all'86%, carta #F2E7CF sopra), il nome in un cartellino d'osso in Silkscreen, un filo d'inchiostro scende verso chi
  // parla. Le varianti, dentro la stessa lingua e fuori dai colori riservati (limone, allarme, vermiglio): chi è arrabbiato ha il
  // cartellino di mattone #6F2B2E con il nome in carta e l'ombra della striscia di mattone; la voce che gira è in corsivo e il
  // cartellino dice «· si dice».
  const CSS_D = [
    '#bubbles .bub{background:none;border:0;box-shadow:none;padding:0 0 8px;max-width:200px;color:#F2E7CF;font:500 13.5px/1.42 "Pixelify Sans",sans-serif}',
    '#bubbles .bub .t{background:rgba(22,18,27,.86);padding:1px 5px 2px;-webkit-box-decoration-break:clone;box-decoration-break:clone;border-radius:1px 3px 1px 2px;box-shadow:2px 2px 0 rgba(22,18,27,.35)}',
    '#bubbles .bub::after{content:"";border:0;left:50%;bottom:0;width:2px;height:8px;transform:translateX(-50%);background:rgba(22,18,27,.86)}',
    '#bubbles .bub .who{display:table;margin:0 auto 1px;font:400 8.5px/1 Silkscreen,monospace;letter-spacing:.08em;text-transform:uppercase;color:#16121B;background:#D2C2A6;padding:2px 4px 1px}',
    '#bubbles .bub.hot,#bubbles .bub.rumor{background:none}',
    // arrabbiato: il cartellino di mattone, il nome in carta; l'ombra della striscia di mattone
    '#bubbles .bub.hot .who{background:#6F2B2E;color:#F2E7CF}',
    '#bubbles .bub.hot .t{box-shadow:2px 2px 0 rgba(111,43,46,.9)}',
    // la voce che gira (main.js «rumor» solo per «Hai sentito…»; cm-voce per le altre forme della regia §3)
    '#bubbles .bub.rumor .t,#bubbles .bub.cm-voce .t{font-style:italic}',
    '#bubbles .bub.rumor .who::after,#bubbles .bub.cm-voce .who::after{content:" \\00b7  si dice";opacity:.75}',
    '#bubbles .bub.hot.cm-voce .who::after{content:none}',
    // al telefono, oltre i 2 fumetti pieni: resta solo il cartellino del nome (qualcuno parla), senza testo né filo
    '#bubbles .bub.cm-zitto{padding-bottom:0;opacity:.8}',
    '#bubbles .bub.cm-zitto .t,#bubbles .bub.cm-zitto::after{display:none}',
    '#bubbles .bub.cm-zitto .who{margin-bottom:0}',
  ].join('\n');
  // il testo dopo il nome va in <span class="t">: è lui che fa la striscia. main.js bubSet riscrive l'innerHTML solo quando cambia
  // il testo (el.__h): qui si avvolge una volta, e la volta dopo non si tocca niente (niente mutazioni, niente giri del sorvegliante).
  function avvolgi(el, doc) {
    const N = el.childNodes, s = N[0] && N[0].nodeType === 1 && N[0].classList.contains('who') ? 1 : 0;
    if (N.length <= s) return false;
    if (N.length === s + 1 && N[s].nodeType === 1 && N[s].classList.contains('t')) return false;
    const t = doc.createElement('span'); t.className = 't';
    while (N.length > s) t.appendChild(N[s]);
    el.appendChild(t); return true;
  }
  // al telefono al massimo 2 fumetti pieni: prima chi conta (PRIO, §2; a parità chi è arrabbiato), poi il più vicino; gli altri si chiudono nel cartellino
  const TEL_MAX = 2;
  function scegliTelefono(B, max) {
    const o = B.slice().sort((a, b) => (b.pr || 1) - (a.pr || 1) || (a.d === undefined ? 1e9 : a.d) - (b.d === undefined ? 1e9 : b.d));
    return new Set(o.slice(0, max === undefined ? TEL_MAX : max));
  }
  // fuori dai riquadri del HUD (l'obiettivo #or-obj, la minimappa #mini): il fumetto {X,Y,w,h} (X al centro, Y in basso) si sposta
  // del meno possibile, sotto, sopra, a destra o a sinistra del riquadro, restando nello schermo
  const tocca = (b, r, m) => b.X - b.w / 2 < r.r + m && b.X + b.w / 2 > r.l - m && b.Y - b.h < r.b + m && b.Y > r.t - m;
  function evita(b, rects, W, H, M0, TOP) {
    const m = 4;
    for (let giro = 0; giro < 3; giro++) {
      const r = rects.find(r => tocca(b, r, m)); if (!r) return b;
      const C = [{ X: b.X, Y: r.b + m + b.h }, { X: b.X, Y: r.t - m }, { X: r.r + m + b.w / 2, Y: b.Y }, { X: r.l - m - b.w / 2, Y: b.Y }]
        .filter(c => c.X - b.w / 2 >= M0 && c.X + b.w / 2 <= W - M0 && c.Y - b.h >= TOP && c.Y <= H - M0)
        .map(c => ({ ...c, k: Math.hypot(c.X - b.X, c.Y - b.Y) + (rects.some(q => q !== r && tocca({ ...b, X: c.X, Y: c.Y }, q, m)) ? 1e4 : 0) }))
        .sort((p, q) => p.k - q.k);
      if (!C.length) return b;
      b.X = C[0].X; b.Y = C[0].Y;
    }
    return b;
  }
  if (typeof document !== 'undefined') {
    const css = document.createElement('style'); css.id = 'commedia-css';
    css.textContent = CSS_D;
    (document.head || document.documentElement).appendChild(css);
    // le etichette delle porte («▸ Casa Porcu», risacca_ui.js #rs-labels) stavano in un livello sopra #bubbles: il livello delle
    // etichette passa subito sotto quello dei fumetti (stessa scatola, stesse coordinate)
    const sposta = () => { const L = document.getElementById('rs-labels'), B = document.getElementById('bubbles'); if (!L || !B) return false; if (L.nextElementSibling !== B) B.parentNode.insertBefore(L, B); return true; };
    const tSp = setInterval(() => { if (sposta()) clearInterval(tSp); }, 500);
    // main.js bubSet mette la posizione in transform (translate(X,Y) translate(-50%,-100%)) e la riscrive solo quando cambia: qui,
    // dopo ogni riscrittura, il fumetto si tiene dentro lo schermo (6 px di margine). Le etichette e le icone non si toccano.
    const M0 = 6, TOP = 44;   // in alto c'è la pillola «Risacca B» (risacca_ui): il fumetto si ferma sotto
    const orig = el => `translate(${el.__x}px,${el.__y}px) translate(-50%,${el.__r === undefined ? '-100%' : '-50%'})` + (el.__r === undefined ? '' : ` rotate(${el.__r}rad)`);
    const mqC = typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)') : null;
    const telefono = () => (typeof innerWidth === 'number' && innerWidth < 700) || !!(mqC && mqC.matches);
    Commedia.telefono = telefono;
    // i riquadri del HUD da non coprire, letti al più ogni mezzo secondo (getBoundingClientRect impagina)
    const HUD_IDS = ['or-obj', 'mini', 'stick', 'stick2'];
    let hudR = [], hudT = -1e9;
    function riquadri() {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - hudT < 500) return hudR; hudT = now; hudR = [];
      const L = layer.getBoundingClientRect();
      for (const id of HUD_IDS) {
        const e = document.getElementById(id); if (!e || e.hidden) continue;
        const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
        const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
        hudR.push({ id, l: r.left - L.left, t: r.top - L.top, r: r.right - L.left, b: r.bottom - L.top });
      }
      return hudR;
    }
    // chi dice cosa: il fumetto nella pagina → la sua priorità (PR) e la distanza, dal nome e dal testo (main.js non lascia altro)
    function chiParla() {
      const st = ST, M = new Map(); if (!st || !st.npcs || !st.player) return M; const p = st.player;
      for (const k of st.npcs) { const b = k.bark; if (!b || k.dead || !(b.until > st.clock)) continue; M.set(k.first + '\u0001' + b.text, { pr: PR.get(b) || 1, d: hyp(k.x - p.x, k.y - p.y) }); }
      return M;
    }
    // dentro lo schermo e uno sopra l'altro no: i fumetti vivi (al massimo 3) si tengono nel quadro e, se si coprono, quello più in
    // basso scende sotto l'altro. Si riscrive il transform solo se cambia; main.js lo riscrive solo quando cambia la sua posizione.
    function sistema() {
      if (!layer) return;
      const W = layer.clientWidth, H = layer.clientHeight, B = [], tel = telefono();
      // 1. la striscia e la voce (idempotenti: alla seconda passata non cambia niente)
      const vivi = [];
      for (const el of layer.children) {
        if (!el.classList.contains('bub')) {
          if (el.__cmT) { el.__cmT = null; if (el.__x !== undefined) el.style.transform = orig(el); }
          continue;
        }
        avvolgi(el, document);
        const t = el.lastChild, testo = t && t.classList && t.classList.contains('t') ? t.textContent : '';
        const voce = !el.classList.contains('rumor') && eVoce(testo);
        if (el.classList.contains('cm-voce') !== voce) el.classList.toggle('cm-voce', voce);
        if (el.hidden || el.__x === undefined) { if (el.classList.contains('cm-zitto')) el.classList.remove('cm-zitto'); continue; }
        vivi.push({ el, testo });
      }
      // 2. al telefono: 2 pieni, gli altri chiusi nel cartellino
      let pieni = null;
      if (tel && vivi.length > TEL_MAX) {
        const M = chiParla();
        vivi.forEach(v => { const w = v.el.firstChild, k = M.get((w ? w.textContent : '') + '\u0001' + v.testo); v.pr = (k ? k.pr : 1) + (v.el.classList.contains('hot') ? .5 : 0); v.d = k ? k.d : undefined; });   // a parità, chi è arrabbiato
        pieni = scegliTelefono(vivi, TEL_MAX);
      }
      for (const v of vivi) { const z = !!pieni && !pieni.has(v); if (v.el.classList.contains('cm-zitto') !== z) v.el.classList.toggle('cm-zitto', z); }
      // 3. dove
      const HR = riquadri();
      for (const { el } of vivi) {
        const w = el.offsetWidth, h = el.offsetHeight;
        const b = { el, w, h, X: clamp(el.__x, w / 2 + M0, Math.max(w / 2 + M0, W - w / 2 - M0)), Y: clamp(el.__y, h + TOP, Math.max(h + TOP, H - M0)) };
        if (HR.length) evita(b, HR, W, H, M0, TOP);
        B.push(b);
      }
      B.sort((a, b) => a.Y - b.Y || a.X - b.X);
      for (let i = 0; i < B.length; i++) for (let j = 0; j < i; j++) {
        const a = B[j], b = B[i];
        if (Math.abs(a.X - b.X) < (a.w + b.w) / 2 && b.Y - b.h < a.Y && a.Y - a.h < b.Y) { b.Y = Math.min(H - M0, a.Y + b.h + 3); if (HR.length) evita(b, HR, W, H, M0, TOP); }
      }
      for (const b of B) {
        const el = b.el, X = Math.round(b.X * 2) / 2, Y = Math.round(b.Y * 2) / 2;
        const t = X === el.__x && Y === el.__y ? orig(el) : `translate(${X}px,${Y}px) translate(-50%,-100%)`;
        if (el.style.transform !== t) { el.__cmT = t; el.style.transform = t; }
      }
    }
    let layer = null;
    const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(() => { try { sistema(); } catch (e) { if (!sistema.err) { sistema.err = 1; console.warn('[Commedia]', e); } } }) : null;
    const tB = setInterval(() => { layer = document.getElementById('bubbles'); if (!layer || !mo) return; clearInterval(tB); mo.observe(layer, { attributes: true, attributeFilter: ['style', 'class', 'hidden'], childList: true, subtree: true, characterData: true }); sistema(); }, 300);
    // girando il telefono cambia la regola: si risistema subito
    if (typeof addEventListener === 'function') addEventListener('resize', () => { hudT = -1e9; if (layer) sistema(); });
  }

  // per le prove (test_commedia.js)
  Commedia._ = { CX, CFG, COMBAT, VECCHIE, chiaveCombat, combatLine, articolo, fixOggetti, fixLavoro, fixNotte, fixVoce, chiStessi, durata, classe, VOCI, LAVORO, NOTTE, FAME, avvolgi, scegliTelefono, evita, TEL_MAX, CSS_D };
})();
