/* [unico] unico_verbi.js: I VERBI DEL SISTEMA UNICO, passo 3 (progetto: commedia/SISTEMA_UNICO.md §2.2, §3.2, §3.4, §4, §10 riga 3).
   Dietro ?commedia. Spento il flag: Verbo = { ON: false } e nient'altro (nessun aggancio, il menu del giocatore intatto).

   VERBO è la sola porta per agire, uguale per il giocatore e per l'NPC. Un verbo è una SCHEDA DI DATI (§2.2): gli argomenti, le
   condizioni (pre) e gli effetti (eff) come liste di termini, il costo, la meta del passo «vai», le prenotazioni, la posa, il segno,
   il tipo del fatto che lascia. Il codice sta solo nei TERMINI (una trentina, valutati sui dati, senza effetti) e negli ADATTATORI
   (chi lo esegue davvero, per livello). Le schede stanno qui sotto in un blocco di soli dati (SCHEDE); al passo 4-5, quando il
   catalogo si potrà toccare, passano in unico_catalogo.js così come sono.

   LE ENTRATE (§2.2), le stesse per tutti:
     Verbo.puo(st, chi, v, a)          '' oppure il perché, in italiano (le condizioni, poi le prenotazioni degli altri)
     Verbo.fai(st, chi, v, a, opt)     { ok, msg, fid, compito }: prova, prenota, esegue al livello giusto
     Verbo.qui(st, chi)                [{ v, a, etichetta, perche? }]: i possibili adesso, più i «quasi» col perché
     Verbo.passi(st, chi, v, a)        i passi di Azioni (go/do) per l'esecutore a passi (Azioni.startPlan/runPlan)
     Verbo.applica(st, chi, v, a)      applica eff (strategia C), per l'esecutore lontano
   chi: 'player' (chi siede), 'nino', un id, un NPC (Attore.di). L'identità nei fatti è quella dell'attore: Nino è 'nino'.

   L'ESECUTORE UNICO (§3.4). Verbo.fai sceglie il modo: «subito» (il sedile, o opt.subito), «piano» (scena e vicino: i passi
   veri di Azioni, il compimento nell'ultimo passo), «coda» (lontano e dormiente: un evento in st.u.coda a t0 + costo.min, che la fase
   unico.verbi compie). Il compimento (Verbo.compi) ricontrolla le condizioni, sceglie la STRATEGIA e scrive UN FATTO (Fatto.scrivi,
   solo id e primitivi) per ogni verbo eseguito, riuscito o no: se il fornitore ne ha già scritto uno (Casa.fai), si adotta quello.
     A  diretta: la funzione accetta già l'attore (Casa.fai, Popolo.paintWall, le viste di Attore)
     B  cambio di persona: Unico.come(st, attore, fn) mette una vista dell'NPC al posto di st.player/st.me, zittisce G.feed,
        st.sfx, Game.step (Oggetti.craft → passTime, oggetti.js:1152: un NPC che fabbrica non fa girare il mondo) e le borse del
        giocatore (basi, bauli, cassa della banda, guardaroba, usura), poi rimette tutto (try/finally). In scena e vicino.
     C  dai dati: applica eff, derivato dalle tabelle del modulo (RECIPES, CAT, B del cantiere, Economia), mai da una copia del codice
   Il giocatore usa la sua funzione di sempre (strategia A sul corpo vero): Oggetti.buy, Oggetti.craft, Cantiere.place, Casa.fai.

   LE PRENOTAZIONI (alla RimWorld): st.u.pren[chiave] = [[attoreId, q, scade], ...]. Una scheda dichiara [chiave, q, capienza]
   (capienza: quanti ce ne sono, per esempio la scorta della bottega): due attori non prendono la stessa cosa. Il modo «subito» le
   tiene per la sola durata della chiamata; «piano» e «coda» fino al compimento (o alla fine del piano).

   IL MENU QUI, ADESSO (§2.2). Azioni.playerActions si avvolge una volta, per ultimo: le voci vecchie restano tutte com'erano (ogni
   azione del giocatore resta lì e fa la stessa cosa), e si aggiungono quelle del registro (Verbo.qui del sedile) che il menu vecchio
   non offre: comprare e vendere al banco, mangiare e bere dalle tasche, prendere e lasciare a casa, regalare, prestare, chiedere un
   prestito, saldare, pescare; più, accanto a un membro guidato (n.ris.auto === false), quello che puoi fargli fare. I verbi che hanno
   già il loro pannello o la loro voce (fai_ricetta, baratta, costruisci, arreda, ridipingi, dipingi_muro, dormi) non si ripetono:
   Verbo.copre(id) dice quale voce vecchia corrisponde a quale verbo.

   I VERBI DI QUESTO PASSO (23): vai, entra, esci, prendi, posa, dai, regala, presta, chiedi_prestito, salda, compra, vendi, baratta,
   mangia, bevi, fai_ricetta, costruisci, smonta, arreda, ridipingi, dipingi_muro, dormi, pesca. Restano per dopo (§3.2): rendi (la
   roba prestata), lavora (il turno: Mestieri.perform, Oggetti.workHour), chiacchiera e proponi_appuntamento e rinfaccia (le battute di
   Vita.scambio: passo 4, i segni), monta/smonta_mezzo; dipingi_muro con la bomboletta del writer (Writing.npcWork) e arreda «butta». */
var Verbo = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Verbo = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = Verbo;
  if (!ON) return Verbo;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  if (!G || !Un()) { Verbo.ON = false; return Verbo; }
  const AT = () => (typeof Attore !== 'undefined' && Attore.ON ? Attore : null);
  const RB = () => (typeof Roba !== 'undefined' && Roba.ON ? Roba : null);
  const LG = () => (typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null);
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const OG = () => (typeof Oggetti !== 'undefined' ? Oggetti : null);
  const CA = () => (typeof Cantiere !== 'undefined' ? Cantiere : null);
  const CS = () => (typeof Casa !== 'undefined' && Casa.ON !== false && Casa.fai ? Casa : null);
  const PO = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const AZ = () => (typeof Azioni !== 'undefined' ? Azioni : null);
  const EC = () => (typeof Economia !== 'undefined' ? Economia : null);
  const RS = () => (typeof Risacca !== 'undefined' ? Risacca : null);
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), r1 = x => Math.round(x * 10) / 10;
  const L = x => `${(Math.round(x * 10) / 10).toLocaleString('it-IT')}.000 lire`;
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const CFG = Verbo.CFG = {
    raggio: { bottega: 8, persona: 2.6, casa: 6, porta: 4, muro: 14, acqua: 20, base: 6, pezzo: 6 },
    prenScade: 90,       // minuti di gioco oltre la durata del verbo: poi la prenotazione decade da sola
    quiMax: 8, quasiMax: 3, membroMax: 3,   // le voci del registro nel menu del giocatore
    codaPasso: 24,       // i compimenti lontani per passo (a conteggio, deterministico)
    sceneR: 45,          // come Azioni.CFG.sceneR
  };
  const stats = Verbo.stats = { fai: 0, subito: 0, piani: 0, code: 0, compiuti: 0, falliti: 0, rifiuti: 0, fatti: 0, adottati: 0, come: 0, zittiti: 0, ms: 0, msMax: 0, per: {} };

  // ======================= LE SCHEDE (solo dati, §2.2 e §3.2) =======================
  // pre: condizioni; eff: effetti (strategia C); prenota: [chiave, q, capienza]; costo.min: minuti di gioco; dove: la meta del passo «vai»
  // fatto: il tipo del fatto (quelli che i derivati di unico_memoria leggono: prestito, regalo, saldato); fam, posa, oggetto, segno: §7
  // menu: false = la voce c'è già nel menu vecchio o in un pannello (non si ripete); al: il sedile o un membro guidato
  const SCHEDE = {
    vai: { fam: 'muovi', args: { x: 'n?', y: 'n?', posto: 'posto?' }, pre: [['vivo'], ['meta']], eff: [['muovi', '$x', '$y']],
      costo: { min: '$min', rischio: 0, fatica: .005 }, dove: ['posto', '$x', '$y'], posa: 'cammina', segno: { bolla: ['freccia'] }, fatto: 'vai', menu: false },
    entra: { fam: 'muovi', args: { b: 'edificio' }, pre: [['vivo'], ['fuori'], ['edificio', '$b'], ['vicino', 'porta', '$b', 'porta']], eff: [['entra', '$b']],
      costo: { min: .5 }, dove: ['porta', '$b'], posa: 'cammina', segno: { cambia: 'porta' }, fatto: 'entra', menu: false },
    esci: { fam: 'muovi', args: {}, pre: [['vivo'], ['dentro']], eff: [['esci']], costo: { min: .5 }, posa: 'cammina', segno: { cambia: 'porta' }, fatto: 'esce', menu: false },
    prendi: { fam: 'roba', args: { cosa: 'roba', q: 'n?', da: "'casa'|'base'" }, pre: [['vivo'], ['presso', '$da'], ['ha_in', '$da', '$cosa', '$q'], ['porta', '$cosa', '$q']],
      eff: [['sposta', '$da', 'borsa', '$cosa', '$q']], costo: { min: 1 }, dove: ['presso', '$da'], prenota: [['roba:$daid:$cosa', '$q', '$disp']],
      posa: 'fruga', oggetto: '$cosa', segno: { bolla: ['mano', '$cosa'], cambia: 'contenitore' }, fatto: 'prende' },
    posa: { fam: 'roba', args: { cosa: 'roba', q: 'n?', in: "'casa'|'base'" }, pre: [['vivo'], ['presso', '$in'], ['ha', '$cosa', '$q']],
      eff: [['sposta', 'borsa', '$in', '$cosa', '$q']], costo: { min: 1 }, dove: ['presso', '$in'], posa: 'raccoglie', oggetto: '$cosa', segno: { bolla: ['mano_giu'] }, fatto: 'posa' },
    dai: { fam: 'scambia', args: { chi: 'attore', cosa: 'roba', q: 'n?' }, pre: [['vivo'], ['altro', '$chi'], ['ha', '$cosa', '$q'], ['vicino', 'persona', '$chi', 'persona']],
      eff: [['borsa_a', '$chi', '$cosa', '$q']], costo: { min: .5 }, dove: ['persona', '$chi'], posa: 'porge', oggetto: '$cosa', segno: { bolla: ['mano', '$cosa'] }, fatto: 'dai', con: ['$chi'] },
    regala: { fam: 'scambia', args: { chi: 'attore', cosa: 'roba', q: 'n?' }, pre: [['vivo'], ['altro', '$chi'], ['ha', '$cosa', '$q'], ['vicino', 'persona', '$chi', 'persona']],
      eff: [['borsa_a', '$chi', '$cosa', '$q'], ['fiducia', '$chi', .05]], costo: { min: 1 }, dove: ['persona', '$chi'], posa: 'porge', oggetto: '$cosa',
      segno: { bolla: ['cuore', 'per te'], cronaca: { soglia: .4, riga: '{A} regala {cosa} a {B}' } }, fatto: 'regalo', con: ['$chi'], pubblicizza: ['regalare'] },
    presta: { fam: 'scambia', args: { chi: 'attore', soldi: 'n' }, pre: [['vivo'], ['altro', '$chi'], ['positivo', '$soldi'], ['soldi>=', '$soldi'], ['vicino', 'persona', '$chi', 'persona']],
      eff: [['soldi_a', '$chi', '$soldi']], costo: { min: 2 }, dove: ['persona', '$chi'], posa: 'porge', oggetto: 'banconote', segno: { bolla: ['stretta', 'te li rendo'] },
      fatto: 'prestito', con: ['$chi'], vFatto: '$soldi', pubblicizza: ['prestare'] },
    chiedi_prestito: { fam: 'scambia', args: { chi: 'attore', soldi: 'n' }, pre: [['vivo'], ['altro', '$chi'], ['positivo', '$soldi'], ['vicino', 'persona', '$chi', 'persona'], ['concede', '$chi', '$soldi']],
      eff: [['soldi_da', '$chi', '$soldi']], costo: { min: 3 }, dove: ['persona', '$chi'], posa: 'discute', segno: { bolla: ['stretta', 'te li rendo'] },
      fatto: 'prestito', attori: ['$chi', '$io'], vFatto: '$soldi', pubblicizza: ['chiedere'] },
    salda: { fam: 'scambia', args: { chi: 'attore', soldi: 'n?' }, pre: [['vivo'], ['altro', '$chi'], ['deve', '$chi'], ['soldi>=', '$soldi'], ['vicino', 'persona', '$chi', 'persona']],
      eff: [['soldi_a', '$chi', '$soldi']], costo: { min: 2 }, dove: ['persona', '$chi'], posa: 'porge', oggetto: 'banconote', segno: { bolla: ['moneta', 'pari'] },
      fatto: 'saldato', con: ['$chi'], vFatto: '$soldi', pubblicizza: ['riscuotere'] },
    compra: { fam: 'scambia', args: { cosa: 'roba', q: 'n?', dove: 'bottega' },
      pre: [['vivo'], ['bottega', '$dove'], ['vicino', 'bottega', '$dove', 'bottega'], ['aperta', '$dove'], ['vende', '$dove', '$cosa'], ['scorta>=', '$dove', '$cosa', '$q'], ['soldi>=', '$tot'], ['porta', '$cosa', '$q']],
      eff: [['-soldi', '$tot'], ['+borsa', '$cosa', '$q'], ['-scorta', '$dove', '$cosa', '$q'], ['+cassa', '$dove', '$tot']],
      costo: { min: 3, soldi: '$tot', rischio: 0, fatica: .01 }, dove: ['bottega', '$dove'], prenota: [['scorta:$dove:$cosa', '$q', '$scorta']],
      posa: 'porge', oggetto: '$cosa', dur: 4, segno: { bolla: ['moneta', '$cosa'], cambia: 'scorta', cronaca: { soglia: 40, riga: '{A} compra {cosa} {da}' } },
      fatto: 'compra', con: ['bottega:$dove'], pubblicizza: ['procura:$cosa', 'mangiare', 'arredare'], fornitore: { A: 'Oggetti.buy', B: 'Oggetti.buy', C: 'eff' } },
    vendi: { fam: 'scambia', args: { cosa: 'roba', q: 'n?', dove: 'bottega' },
      pre: [['vivo'], ['bottega', '$dove'], ['vicino', 'bottega', '$dove', 'bottega'], ['aperta', '$dove'], ['ha', '$cosa', '$q'], ['tratta', '$dove', '$cosa'], ['cassa>=', '$dove', '$tot']],
      eff: [['-borsa', '$cosa', '$q'], ['+scorta', '$dove', '$cosa', '$q'], ['-cassa', '$dove', '$tot'], ['+soldi', '$tot']],
      costo: { min: 3, rischio: 0, fatica: .01 }, dove: ['bottega', '$dove'], posa: 'porge', oggetto: '$cosa', segno: { bolla: ['moneta+', '$cosa'], cronaca: { soglia: 3, riga: 'Al mercato {A} ha venduto {q} {cosa}' } },
      fatto: 'vende', con: ['bottega:$dove'], pubblicizza: ['guadagnare'], fornitore: { A: 'Oggetti.sell', B: 'Oggetti.sell', C: 'eff' } },
    baratta: { fam: 'scambia', args: { chi: 'attore', dai: '{roba:q}', prendi: '{roba:q}', lire: 'n?', loro: 'n?' },
      pre: [['vivo'], ['altro', '$chi'], ['abitante', '$chi'], ['vicino', 'persona', '$chi', 'persona'], ['ha_tutto', '$dai'], ['ha_tutto_di', '$chi', '$prendi'], ['soldi>=', '$lire'], ['soldi_di>=', '$chi', '$loro'], ['conviene', '$chi']],
      eff: [['baratto', '$chi']], costo: { min: 4 }, dove: ['persona', '$chi'], posa: 'porge', segno: { bolla: ['frecce', 'baratto'] }, fatto: 'baratto', con: ['$chi'], menu: false,
      fornitore: { A: 'Oggetti.barter', B: 'Oggetti.barter', C: 'eff' } },
    mangia: { fam: 'usa', args: { cosa: 'roba' }, pre: [['vivo'], ['ha', '$cosa', 1], ['cibo', '$cosa']], eff: [['consuma', '$cosa']], costo: { min: 10, fatica: -.01 },
      posa: 'mangia_su', oggetto: '$cosa', segno: { bolla: ['forchetta'] }, fatto: 'mangia', pubblicizza: ['mangiare'], fornitore: { A: 'Oggetti.consume', B: 'Oggetti.consume', C: 'eff' } },
    bevi: { fam: 'usa', args: { cosa: 'roba' }, pre: [['vivo'], ['ha', '$cosa', 1], ['bevanda', '$cosa']], eff: [['consuma', '$cosa']], costo: { min: 5 },
      posa: 'beve_su', oggetto: '$cosa', segno: { bolla: ['bicchiere'] }, fatto: 'beve', pubblicizza: ['mangiare'], fornitore: { A: 'Oggetti.consume', B: 'Oggetti.consume', C: 'eff' } },
    fai_ricetta: { fam: 'manipola', args: { rec: 'ricetta', volte: 'n?' }, pre: [['vivo'], ['ricetta', '$rec'], ['ingredienti', '$rec', '$volte'], ['attrezzi', '$rec'], ['postazione', '$rec']],
      eff: [['ricetta', '$rec', '$volte']], costo: { min: '$min', rischio: '$rischio', fatica: .05 }, posa: 'lavora', oggetto: '$attrezzo',
      segno: { bolla: ['martello', '$cosa'], cronaca: { soglia: 'rara', riga: '{A} ha fatto {q} {cosa}' } }, fatto: 'fa', pubblicizza: ['procura:$cosa'], menu: false,
      fornitore: { A: 'Oggetti.craft', B: 'Oggetti.craft (Game.step zittito)', C: 'RECIPES' } },
    costruisci: { fam: 'manipola', args: { id: 'pezzo', x: 'n', y: 'n', rot: 'n?' }, pre: [['vivo'], ['pezzo', '$id'], ['materiali', '$id'], ['cantiere', '$id', '$x', '$y', '$rot']],
      eff: [['paga_pezzo', '$id'], ['piazza', '$id', '$x', '$y', '$rot']], costo: { min: '$min', fatica: .08 }, dove: ['posto', '$x', '$y'], prenota: [['suolo:$tx:$ty', 1, 1]],
      posa: 'martella', oggetto: 'assi', segno: { bolla: ['martello', '$id'], cambia: 'cantiere', cronaca: { soglia: .3, riga: 'Sul molo è spuntata {cosa}: l\'ha messa {A}' } },
      fatto: 'costruisce', pubblicizza: ['costruire'], menu: false, fornitore: { A: 'Cantiere.place', B: 'Cantiere.place', C: 'B del cantiere, messa in opera all\'arrivo' } },
    smonta: { fam: 'forza', args: { uid: 'pezzo_posato' }, pre: [['vivo'], ['pezzo_mio', '$uid'], ['vicino', 'pezzo', '$uid', 'pezzo']], eff: [['smonta', '$uid']], costo: { min: 20, fatica: .05 },
      dove: ['pezzo', '$uid'], prenota: [['pezzo:$uid', 1, 1]], posa: 'forza', oggetto: 'piede', segno: { bolla: ['piede di porco'], cambia: 'cantiere' }, fatto: 'smonta', menu: false,
      fornitore: { A: 'Cantiere.remove', B: 'Cantiere.remove', C: 'Cantiere.remove' } },
    arreda: { fam: 'casa', args: { cosa: 'roba' }, pre: [['vivo'], ['ha', '$cosa', 1], ['mobile', '$cosa'], ['in_casa'], ['puo_casa']],
      eff: [['-borsa', '$cosa', 1], ['casa', 'posa']], costo: { min: 10 }, dove: ['casa'], posa: 'porta', oggetto: '$cosa', segno: { bolla: ['casetta', '$cosa'], cambia: 'pianta' },
      fatto: 'porta_casa', pubblicizza: ['arredare'], menu: false, fornitore: { A: 'Casa.fai posa', B: null, C: 'Casa.fai (le righe, pigre)' } },
    ridipingi: { fam: 'casa', args: { ink: 'colore' }, pre: [['vivo'], ['ink', '$ink'], ['ha', '$mat', 1], ['in_casa'], ['puo_casa']],
      eff: [['-borsa', '$mat', 1], ['casa', 'dipingi']], costo: { min: 60, fatica: .06 }, dove: ['casa'], posa: 'vernicia', oggetto: 'rullo', segno: { bolla: ['pennello', '$colore'], cambia: 'pareti' },
      fatto: 'dipinge', pubblicizza: ['arredare'], menu: false, fornitore: { A: 'Casa.fai dipingi', B: null, C: 'Casa.fai (le righe, pigre)' } },
    dipingi_muro: { fam: 'muro', args: { muro: 'posto', con: "'gesso'|'pennello'|'bomboletta'" }, pre: [['vivo'], ['ha', '$con', 1], ['muro', '$muro'], ['vicino', 'posto', '$muro', 'muro']],
      eff: [['muro', '$muro', '$con']], costo: { min: '$min', rischio: .12, fatica: .03 }, dove: ['muro', '$muro'], prenota: [['muro:$muro', 1, 1]], posa: 'vernicia', oggetto: '$con',
      segno: { bolla: ['bomboletta'], cambia: 'muro', cronaca: { soglia: .3, riga: 'Nuovo pezzo in via {x}' } }, fatto: 'dipinge_muro', illegale: true, pubblicizza: ['dipingere', 'vendicarsi'], menu: false,
      fornitore: { A: 'Popolo.paintWall (st.pop.walls)', B: null, C: 'Popolo.paintWall' } },
    dormi: { fam: 'riposa', args: { ore: 'n?' }, pre: [['vivo'], ['in_casa'], ['stanco']], eff: [['bisogno', 'sonno', '$dS']], costo: { min: '$min', fatica: -.2 }, dove: ['casa'],
      posa: 'dorme', segno: { bolla: ['Z'], cambia: 'finestra' }, fatto: 'dorme', pubblicizza: ['dormire'], menu: false },
    pesca: { fam: 'usa', args: { ore: 'n?' }, pre: [['vivo'], ['fuori'], ['ha', 'canna', 1], ['vicino', 'acqua', null, 'acqua']], eff: [['pesca', '$min']], costo: { min: '$min', fatica: .03 },
      dove: ['acqua'], posa: 'pesca', oggetto: 'canna', segno: { bolla: ['amo'], cambia: 'cassetta', cronaca: { soglia: 2, riga: 'Pesca grossa per {A}' } }, fatto: 'pesca', pubblicizza: ['pescare', 'guadagnare'] },
  };
  // le voci vecchie del menu QUI, ADESSO e il verbo a cui corrispondono (restano loro: il registro non le ripete)
  const COPRE = { og_lavora: 'fai_ricetta', og_scambia: 'baratta', casa_dipingi: 'ridipingi', casa_colore: 'ridipingi', casa_posa: 'arreda', casa_butta: 'arreda',
    casa_finestra: 'arreda', dipingi: 'dipingi_muro', dormi: 'dormi', mangia_casa: 'mangia', mangia_bar: 'mangia', bevi: 'bevi', riprendi: 'prendi', nascondi: 'posa', og_borseggia: null };
  // le cose delle tasche che diventano mobili di casa (la tabella di casa.js:93 G2F, che casa.js non espone: copia dichiarata)
  const G2F = { sedia: 'chair', lampada: 'ia_lampada_piede', radiolina: 'ia_radiolina', dischi: 'ia_dischi_vinile', giornale: 'ia_giornali', candele: 'ia_candela', sveglia: 'ia_sveglia',
    telefono: 'ia_telefono', moka: 'ia_moka', pentola: 'ia_pentola', orologio: 'ia_orologio', quadro: 'ia_quadro', poster: 'ia_poster_film', gioielli: 'ia_portagioie', fotocamera: 'ia_macchina_foto',
    macchina_scrivere: 'ia_macchina_scrivere', binocolo: 'ia_binocolo', profumo: 'ia_profumo', cassetta: 'ia_audiocassette', bicicletta: 'ia_bici', vino: 'ia_bottiglia_vino', grappa: 'ia_grappa',
    whisky: 'ia_whisky', torcia: 'ia_torcia', rivista_proibita: 'ia_rivista', radio_rotta: 'radio', tv_rotta: 'televisionVintage', casse: 'cardboardBoxClosed', volantini: 'ia_volantini' };
  const MURI = ['vico', 'caruggio', 'piazzetta', 'calata', 'piazza', 'lungomare', 'salita', 'passeggiata', 'fontana', 'molo'];   // azioni.js:35 WALLS
  const ACQUA = ['molo', 'pontile', 'caletta', 'punta', 'marina'];   // azioni.js:32 WATER

  // ======================= I CORPI =======================
  const attore = (st, chi) => { if (chi && typeof chi === 'object' && chi._st === st && 'borsa' in chi) return chi; const A = AT(); return A ? A.di(st, chi) : null; };
  const sedile = st => (Un().sedile ? Un().sedile(st) : 'nino');
  const isNino = A => !!A && A.o === A._st.player && A.id === 'nino';
  const npcDi = A => (A && !isNino(A) ? A.o : null);
  const vivoA = A => !!A && !(A.o && (A.o.dead || A.o.gone));
  const nomeA = A => (A ? A.nome : 'qualcuno');
  const aN = w => (typeof Lingua !== 'undefined' && Lingua.ON && Lingua.a ? Lingua.a(w) : (/^[Aa]/.test(w || '') ? 'ad ' : 'a ') + w);   // [molo] «ad Ada»
  const corpo = (st, id, crea) => { const A = AT(); return A ? A._.corpo(st, id, crea) : null; };
  const membro = A => isNino(A) || !!(A && A.o && A.o.ris && A.o.ris.member && !A.o.dead);
  function lodDi(st, A) {
    if (!A) return 'lontano'; if (isNino(A) || A.id === sedile(st)) return 'scena';
    const n = A.o, P = n.pop, p = st.player; if (!P) return 'lontano';
    if (P.near) return hyp(n.x - p.x, n.y - p.y) < CFG.sceneR ? 'scena' : 'vicino';
    return n.inside && P.at && P.homeT && P.at === P.homeT ? 'dormiente' : 'lontano';
  }
  const posA = A => ({ x: A.x, y: A.y });
  function casaBi(A) { const c = A.casa; return c && c.bi >= 0 ? c.bi : null; }

  // ======================= I VALORI DEI TERMINI ('$cosa', '$prezzo*$q') =======================
  function val(x, c) {
    if (typeof x !== 'string' || x[0] !== '$') return x;
    if (x.indexOf('*') > 0) return x.split('*').reduce((s, t) => s * (+val(t.trim(), c) || 0), 1);
    const k = x.slice(1);
    if (k === 'io') return c.A.id;
    if (c.a && c.a[k] !== undefined && c.a[k] !== null) return c.a[k];
    return c.d[k];
  }
  const tmpl = (s, c) => String(s).replace(/\$(\w+)/g, (m, k) => { const v = val('$' + k, c); return v === undefined || v === null ? '' : String(v); });

  // ======================= I POSTI =======================
  const eco = st => { const E = EC(); return E && E.eco ? E.eco(st) : null; };
  const shop = (st, k) => { const E = eco(st); return E && k != null ? E.shops[k] || null : null; };
  function vicinoT(A, t, r) {
    if (!t) return false; const d = A.dove;
    if (d.k === 'dentro' && t.k === 'b' && t.bi === d.b) return true;
    return hyp(A.x - t.x, A.y - t.y) <= r;
  }
  function portaDi(bi) {
    const b = G.BUILDINGS && G.BUILDINGS[bi]; if (!b || !b.door) return null;
    return { x: (b.door[0] + .5) * G.TS, y: (b.door[1] + .5) * G.TS, bi };
  }
  function baseVicina(st, A) {
    if (!membro(A) || !st.ris || !st.ris.bases) return null;
    return st.ris.bases.find(b => b.alive && hyp(b.x - A.x, b.y - A.y) < CFG.raggio.base) || null;
  }
  function inCasa(st, A) {
    const bi = casaBi(A); if (bi === null) return false; const d = A.dove;
    if (d.k === 'dentro') return d.b === bi;
    const c = A.casa; return hyp(A.x - c.x, A.y - c.y) <= CFG.raggio.casa;
  }
  const acquaVicina = A => ACQUA.map(id => G.PLACES[id]).filter(Boolean).some(P => hyp(P.x - A.x, P.y - A.y) <= CFG.raggio.acqua);
  function pezzo(st, uid) { const C = st.covo; return C && C.obj ? C.obj.find(o => o.uid === uid) || null : null; }

  // ======================= LA ROBA E LE BORSE =======================
  const CAT = () => (OG() && OG().CAT) || {};
  const nomeR = (k, f) => { const Lg = LG(), R = RB(), e = R && R.di(k); if (Lg && e) try { return Lg.art(e, f || 'det'); } catch (e2) { } const c = CAT()[k]; return c ? c.nome : String(k); };
  function borsaDa(st, A, da) {
    if (da === 'borsa') return A.borsa;
    if (da === 'casa') { const c = A.casa; return c ? c.dispensa : null; }
    if (da === 'base') { const b = baseVicina(st, A); return b ? borsaObj(b.stock || (b.stock = {})) : null; }
    return null;
  }
  // una borsa a forma di Map su un oggetto semplice (le scorte delle basi), con le stesse operazioni di Attore.Borsa
  function borsaObj(o) { const B = AT().Borsa; return new B(() => o, () => o); }
  function pesoDi(borsa) { const C = CAT(); let w = 0; for (const [k, v] of borsa) w += (C[k] ? C[k].peso : .5) * v; return w; }
  function capienza(st, A) {
    if (isNino(A) && OG() && OG().capacity) return OG().capacity(st);
    const C = CAT(); let c = 30; if (A.borsa.get('zaino') >= 1 && C.zaino) c += C.zaino.bag || 20; if (A.mano === 'carriola') c += 100; return c;
  }
  const lire = (A, soldi) => (A.soldi || 0) >= soldi - 1e-6;

  // ======================= IL CAMBIO DI PERSONA (strategia B, §4) =======================
  // Unico.come(st, attore, fn): sincrono, try/finally. Per il giocatore è fn() e basta.
  function vistaPlayer(st, n, A, p0) {
    const P = n.pop || (n.pop = {}), d = A.dove;
    const v = { __unico: n.id, arms: {}, cur: 'pugni', indoor: d.k === 'dentro' && d.b >= 0 ? { b: d.b, f: d.f || 0 } : null, vehicle: null, lv: null, sneak: false, path: [], task: null,
      carrying: null, vx: 0, vy: 0, z: p0 ? p0.z : 0, wanted: 0 };
    Object.defineProperties(v, {
      x: { enumerable: true, get: () => n.x, set: x => { n.x = x; } }, y: { enumerable: true, get: () => n.y, set: y => { n.y = y; } },
      face: { enumerable: true, get: () => n.face, set: f => { n.face = f; } },
      money: { enumerable: true, get: () => P.money || 0, set: m => { P.money = m; } },
      inv: { enumerable: true, get: () => (P.inv = P.inv || {}), set: o => { P.inv = o; } },
      hand: { enumerable: true, get: () => n.hand || null, set: h => { n.hand = h; } },
      hp: { enumerable: true, get: () => (n.hp === undefined ? 100 : n.hp), set: h => { n.hp = h; } },
    });
    return v;
  }
  function vistaMe(st, n, A) {
    const P = n.pop || {}, c = corpo(st, n.id, true);
    const m = { __unico: n.id, home: P.homeT ? Object.assign({ k: 'b' }, P.homeT) : null, job: P.job || null, stats: { speso: 0, mangiato: 0, lavorato: 0 }, warp: null };
    Object.defineProperties(m, {
      need: { enumerable: true, get: () => (P.need = P.need || {}) },
      pantry: { enumerable: true, get: () => P.pantry || 0, set: q => { P.pantry = q; } },
      stash: { enumerable: true, get: () => (c.dispensa = c.dispensa || {}) },
      drunk: { enumerable: true, get: () => c.drunk || 0, set: q => { c.drunk = q; } },
      alcol: { enumerable: true, get: () => c.alcol || 0, set: q => { c.alcol = q; } },
    });
    return m;
  }
  let dentroCome = 0;
  function come(st, chi, fn) {
    const A = attore(st, chi);
    if (!A || isNino(A) || dentroCome) return fn();
    const n = A.o, p0 = st.player, me0 = st.me, O = OG(), C = CA(), R = RS(), Pp = PO(), mem = membro(A);
    const salva = { feed: G.feed, step: G.step, nome: G.PLAYER_NAME, t: st.t, clock: st.clock, sfx: st.sfx ? st.sfx.length : -1,
      mov: st.soldi && st.soldi.player && st.soldi.player.mov ? st.soldi.player.mov.slice() : null, note: Pp && Pp._ ? Pp._.note : null,
      members: R ? R.members : null, baule: C ? C.bauleHere : null, bauli: C ? C.bauli : null, covi: st.covo ? st.covo.covi : null,
      bases: st.ris ? st.ris.bases : null, rinv: st.ris ? st.ris.inv : null, morale: st.ris ? st.ris.morale : null, repr: st.ris ? st.ris.repr : null };
    const OS = O && O.S ? O.S(st) : null, oS = OS ? { wear: OS.wear, worn: OS.worn, calore: OS.calore } : null;
    const vp = vistaPlayer(st, n, A, p0), vm = vistaMe(st, n, A), c = corpo(st, n.id, true);
    dentroCome++; stats.come++;
    try {
      st.player = vp; st.me = vm;
      G.feed = () => null; G.step = () => { stats.zittiti++; }; G.PLAYER_NAME = A.nome;
      if (salva.note) { const n0 = salva.note; Pp._.note = function (s, k, txt, tone, o) { return n0.call(this, s, k, txt, tone, o && o.who === 'player' ? Object.assign({}, o, { who: n.id }) : o); }; }
      if (OS) { OS.wear = c.usura = c.usura || {}; OS.worn = {}; }
      if (st.covo) st.covo.covi = c.covi = c.covi || [];
      if (!mem) {
        if (R) R.members = () => []; if (C) { C.bauleHere = () => null; C.bauli = () => []; }
        if (st.ris) { st.ris.bases = []; st.ris.inv = {}; }
      }
      return fn();
    } finally {
      st.player = p0; st.me = me0; G.feed = salva.feed; G.step = salva.step; G.PLAYER_NAME = salva.nome;
      if (st.t !== salva.t) st.t = salva.t; if (st.clock !== salva.clock) st.clock = salva.clock;
      if (salva.sfx >= 0 && st.sfx && st.sfx.length > salva.sfx) st.sfx.length = salva.sfx;
      if (salva.mov) st.soldi.player.mov = salva.mov;
      if (salva.note) Pp._.note = salva.note;
      if (OS) { OS.wear = oS.wear; OS.worn = oS.worn; OS.calore = oS.calore; }
      if (st.covo) st.covo.covi = salva.covi;
      if (R) R.members = salva.members; if (C) { C.bauleHere = salva.baule; C.bauli = salva.bauli; }
      if (st.ris) { st.ris.bases = salva.bases; st.ris.inv = salva.rinv; if (!mem) { st.ris.morale = salva.morale; st.ris.repr = salva.repr; } }
      // le armi date alla vista (givePlayer → p.arms) diventano roba nelle tasche dell'NPC (la chiave di Oggetti.CAT con quell'arma)
      const K = Object.keys(vp.arms); if (K.length) { const CC = CAT(), Bg = A.borsa; for (const w of K) { const id = Object.keys(CC).find(k => CC[k].wpn === w); if (id) Bg.add(id, w === 'molotov' ? (vp.arms[w].mag || 1) : 1); } }
      dentroCome--;
    }
  }

  // ======================= LE CONDIZIONI (pure: '' oppure il perché) =======================
  const pos = x => typeof x === 'number' && x > 0;
  const COND = {
    vivo: c => (vivoA(c.A) ? '' : `${nomeA(c.A)} non può.`),
    meta: c => (typeof val('$x', c) === 'number' && typeof val('$y', c) === 'number' ? '' : 'Dove?'),
    fuori: c => (c.A.dove.k === 'fuori' ? '' : 'Prima bisogna uscire.'),
    dentro: c => (c.A.dove.k === 'dentro' ? '' : 'Non sei dentro.'),
    edificio: (c, b) => { const B = G.BUILDINGS[val(b, c)]; return B && B.door ? '' : 'Lì non c\'è una porta.'; },
    positivo: (c, x) => (pos(+val(x, c)) ? '' : 'Quanto?'),
    'soldi>=': (c, x) => { const v = +val(x, c) || 0; return lire(c.A, v) ? '' : `Costa ${L(v)}: non ce li hai.`; },
    'soldi_di>=': (c, chi, x) => { const v = +val(x, c) || 0, B = attore(c.st, val(chi, c)); return !v || (B && lire(B, v)) ? '' : `${nomeA(B)} non ha tutti quei soldi.`; },
    ha: (c, k, q) => { const id = val(k, c), n = +val(q, c) || 1; if (!id) return 'Cosa?'; return c.A.borsa.get(id) >= n - 1e-9 ? '' : `Non hai ${n > 1 ? nomeR(id, 'det') + ' ×' + n : nomeR(id, 'det')}.`; },
    ha_in: (c, da, k, q) => { const B = borsaDa(c.st, c.A, val(da, c)), id = val(k, c), n = +val(q, c) || 1; if (!B) return 'Lì non c\'è niente.'; return B.get(id) >= n - 1e-9 ? '' : `${val(da, c) === 'casa' ? 'A casa' : 'In base'} non c'è ${nomeR(id, 'det')}.`; },
    ha_tutto: (c, o) => { const D = val(o, c) || {}; for (const k in D) if (c.A.borsa.get(k) < D[k] - 1e-9) return `Non hai ${nomeR(k, 'det')} ×${D[k]}.`; return ''; },
    ha_tutto_di: (c, chi, o) => { const B = attore(c.st, val(chi, c)), D = val(o, c) || {}; if (!B) return 'Non c\'è nessuno.'; for (const k in D) if (B.borsa.get(k) < D[k] - 1e-9) return `${nomeA(B)} non ha ${nomeR(k, 'det')} ×${D[k]}.`; return ''; },
    porta: (c, k, q) => { const id = val(k, c), n = +val(q, c) || 1, e = CAT()[id]; if (!e || e.wpn || id === 'munizioni') return ''; if (c.d.base) return ''; const w = pesoDi(c.A.borsa), m = capienza(c.st, c.A); return w + e.peso * n <= m + .01 ? '' : `Pesa troppo: porti già ${r1(w)} kg su ${m}.`; },
    presso: (c, da) => { const D = val(da, c); if (D === 'casa') return inCasa(c.st, c.A) ? '' : casaBi(c.A) === null ? 'Non hai una casa.' : 'Non sei a casa.'; if (D === 'base') return baseVicina(c.st, c.A) ? '' : 'Qui non c\'è una base.'; return 'Dove?'; },
    altro: (c, chi) => { const B = attore(c.st, val(chi, c)); if (!B) return 'Non c\'è nessuno.'; if (B === c.A) return 'Con te stesso?'; return vivoA(B) ? '' : `${nomeA(B)} non può.`; },
    abitante: (c, chi) => { const B = attore(c.st, val(chi, c)); return B && !isNino(B) && B.o.pop ? '' : 'Con lui non si baratta.'; },
    vicino: (c, tipo, ref, r) => {
      const R = typeof r === 'string' ? CFG.raggio[r] : +r || 3, A = c.A, st = c.st, x = val(ref, c);
      if (tipo === 'bottega') { const S = shop(st, x); return S && vicinoT(A, S.t, R) ? '' : 'Sei troppo lontano dal banco.'; }
      if (tipo === 'persona') { const B = attore(st, x); if (!B) return 'Non c\'è nessuno.'; if (A.dove.k !== B.dove.k) return `${nomeA(B)} non è qui.`; return hyp(A.x - B.x, A.y - B.y) <= R ? '' : `${nomeA(B)} è troppo lontano.`; }
      if (tipo === 'porta') { const P = portaDi(x); return P && hyp(A.x - P.x, A.y - P.y) <= R ? '' : 'Sei troppo lontano dalla porta.'; }
      if (tipo === 'posto') { const P = G.PLACES[x]; return P && hyp(A.x - P.x, A.y - P.y) <= R ? '' : `Non sei ${P ? 'a ' + P.name : 'lì'}.`; }
      if (tipo === 'acqua') return acquaVicina(A) ? '' : 'Qui non c\'è acqua per pescare.';
      if (tipo === 'pezzo') { const o = pezzo(st, x); return o && hyp(A.x - o.x, A.y - o.y) <= R ? '' : 'Sei troppo lontano.'; }
      return '';
    },
    bottega: (c, k) => (shop(c.st, val(k, c)) ? '' : 'Qui non vendono niente.'),
    aperta: (c, k) => { const d = c.d.banco; return d && d.open ? '' : 'Al banco non c\'è nessuno.'; },
    vende: (c, k, g) => { const S = shop(c.st, val(k, c)), id = val(g, c); if (!S || !S.sells[id] || !CAT()[id]) return 'Non ce l\'hanno.'; if (S.market && PO() && PO().weekday && ![2, 5].includes(PO().weekday(c.st.t))) return 'Oggi non c\'è mercato.'; return ''; },
    'scorta>=': (c, k, g, q) => { const S = shop(c.st, val(k, c)), id = val(g, c), n = +val(q, c) || 1; return S && (S.stock[id] || 0) >= n ? '' : `${cap1(nomeR(id, 'det'))}: ${S && S.stock[id] >= 1 ? 'ne hanno solo ' + Math.floor(S.stock[id]) : 'finito'}.`; },
    tratta: (c, k, g) => { const b = c.d.banco, id = val(g, c); return b && b.buys.some(x => x.g === id) ? '' : '«Questa roba non la tratto.»'; },
    'cassa>=': (c, k, x) => { const b = c.d.banco, v = +val(x, c) || 0; return b && b.cash >= v ? '' : `«In cassa ho ${L(Math.floor(b ? b.cash : 0))}. Ripassa.»`; },
    concede: (c, chi, x) => {
      const B = attore(c.st, val(chi, c)), v = +val(x, c) || 0, F = FT(); if (!B) return 'Non c\'è nessuno.';
      if (!lire(B, v * 2)) return `${nomeA(B)}: «Non ce li ho nemmeno io.»`;
      if (F && F.debito(c.st, B.id, c.A.id) > 0) return `${nomeA(B)}: «Prima rendimi quelli di prima.»`;
      if (F && F.rancore(c.st, B.id, c.A.id) > .3) return `${nomeA(B)}: «A te? Proprio no.»`;
      return '';
    },
    deve: (c, chi) => (c.d.debito > 0 ? '' : `Non devi niente ${aN(nomeA(attore(c.st, val(chi, c))))}.`),
    conviene: c => (c.d.baratto && c.d.baratto.ok ? '' : c.d.baratto ? c.d.baratto.why : 'Non c\'è niente sul piatto.'),
    cibo: (c, k) => { const e = CAT()[val(k, c)]; return e && e.eat && (e.eat.fame > 0 || e.cat === 'cibo') && e.cat !== 'bevande' ? '' : 'Non si mangia.'; },
    bevanda: (c, k) => { const e = CAT()[val(k, c)]; return e && e.eat && (e.cat === 'bevande' || e.eat.sete) ? '' : 'Non si beve.'; },
    ricetta: (c, k) => (c.d.R ? '' : 'Non sai come si fa.'),
    ingredienti: c => (c.d.manca ? `Manca: ${c.d.manca}.` : ''),
    attrezzi: c => (c.d.mancaT ? `Manca l'attrezzo: ${c.d.mancaT}.` : ''),
    postazione: c => (c.d.postOk ? '' : c.d.postWhy || 'Non qui.'),
    pezzo: c => (c.d.b ? '' : 'Non c\'è un pezzo così.'),
    materiali: c => (c.d.mancaM ? `Mancano: ${c.d.mancaM}.` : ''),
    cantiere: c => c.d.dove || '',
    pezzo_mio: (c, uid) => { const o = pezzo(c.st, val(uid, c)); if (!o) return 'Non c\'è più.'; const mio = isNino(c.A) ? !o.by || o.by === 'nino' : o.by === c.A.id; return mio ? '' : 'Non è roba tua.'; },
    mobile: c => (c.d.mobile ? '' : 'In casa non ci va.'),
    in_casa: c => (casaBi(c.A) === null ? 'Non hai una casa.' : inCasa(c.st, c.A) ? '' : 'Non sei a casa.'),
    puo_casa: c => { const K = CS(), bi = casaBi(c.A); if (!K) return 'Non qui.'; return bi !== null && K.puo(c.st, isNino(c.A) ? 'player' : c.A.o, bi) ? '' : 'Questa casa non la puoi toccare.'; },
    ink: c => (c.d.X ? '' : 'Quel colore non c\'è.'),
    muro: (c, m) => { const id = val(m, c); return MURI.includes(id) && G.PLACES[id] ? '' : 'Qui non c\'è un muro da dipingere.'; },
    stanco: c => { const s = c.A.bisogni.sonno, h = G.hour ? G.hour(c.st) : 12; return s >= .25 || h >= 21 || h < 6 ? '' : 'Non hai sonno.'; },
  };

  // ======================= GLI EFFETTI (strategia C: dai dati) =======================
  const EFF = {
    muovi: (c, x, y) => { c.A.x = +val(x, c); c.A.y = +val(y, c); },
    entra: (c, b) => {
      const bi = val(b, c), A = c.A;
      if (isNino(A)) { G.enterBuilding(c.st, bi); return; }
      const n = A.o, P = portaDi(bi); n.inside = true; n.__u = Object.assign(n.__u || {}, { dove: { k: 'dentro', b: bi, f: 0 } }); if (P) { n.x = P.x; n.y = P.y; }
    },
    esci: c => {
      const A = c.A; if (isNino(A)) { G.exitBuilding(c.st); return; }
      const n = A.o, d = A.dove, P = d.b >= 0 ? portaDi(d.b) : null; n.inside = false; if (n.__u) n.__u.dove = null; if (P) { n.x = P.x; n.y = P.y; }
    },
    '-soldi': (c, x) => { c.A.soldi = r1(c.A.soldi - (+val(x, c) || 0)); },
    '+soldi': (c, x) => { c.A.soldi = r1(c.A.soldi + (+val(x, c) || 0)); },
    soldi_a: (c, chi, x) => { const B = attore(c.st, val(chi, c)), v = +val(x, c) || 0; c.A.soldi = r1(c.A.soldi - v); B.soldi = r1(B.soldi + v); },
    soldi_da: (c, chi, x) => { const B = attore(c.st, val(chi, c)), v = +val(x, c) || 0; B.soldi = r1(B.soldi - v); c.A.soldi = r1(c.A.soldi + v); },
    '+borsa': (c, k, q) => { c.A.borsa.add(val(k, c), +val(q, c) || 1); },
    '-borsa': (c, k, q) => { c.A.borsa.togli(val(k, c), +val(q, c) || 1); },
    borsa_a: (c, chi, k, q) => { const B = attore(c.st, val(chi, c)), id = val(k, c), n = c.A.borsa.togli(id, +val(q, c) || 1); B.borsa.add(id, n); },
    sposta: (c, da, a, k, q) => { const D = borsaDa(c.st, c.A, val(da, c)), T = borsaDa(c.st, c.A, val(a, c)), id = val(k, c), n = D.togli(id, +val(q, c) || 1); T.add(id, n); },
    '-scorta': (c, k, g, q) => { const S = shop(c.st, val(k, c)), id = val(g, c); S.stock[id] = (S.stock[id] || 0) - (+val(q, c) || 1); },
    '+scorta': (c, k, g, q) => { const S = shop(c.st, val(k, c)), id = val(g, c); S.stock[id] = (S.stock[id] || 0) + (+val(q, c) || 1); },
    '+cassa': (c, k, x) => cassa(c.st, shop(c.st, val(k, c)), +val(x, c) || 0),
    '-cassa': (c, k, x) => cassa(c.st, shop(c.st, val(k, c)), -(+val(x, c) || 0)),
    fiducia: (c, chi, d) => { const B = attore(c.st, val(chi, c)); if (isNino(c.A) && B && B.o && G.opSpingi) G.opSpingi(c.st, B.o, { trust: d }, 24 * 60, 'verbo'); /* [logica] via opSpingi: prima la scrittura diretta a n.op si perdeva al pensiero dopo */ },
    bisogno: (c, k, d) => { const B = c.A.bisogni; B[k] = clamp((B[k] || 0) + (+val(d, c) || 0), 0, 1); },
    consuma: (c, k) => consumaDati(c.st, c.A, val(k, c)),
    ricetta: (c, rec, volte) => ricettaDati(c.st, c.A, c.d.R, c.d.volte),
    baratto: (c, chi) => barattoDati(c.st, c.A, attore(c.st, val(chi, c)), c.a, c.d.baratto),
    paga_pezzo: (c, id) => { c.d.pagato = pagaDati(c.A, c.d.b); },
    piazza: (c, id, x, y, rot) => { const K = c.st.u.cantieri || (c.st.u.cantieri = []); K.push({ id: c.d.b.id, x: +val(x, c), y: +val(y, c), rot: +val(rot, c) || 0, by: c.A.id, paid: c.d.pagato, t: c.st.t, n: (c.st.u.cantN = (c.st.u.cantN || 0) + 1) }); },
    smonta: (c, uid) => { const r = come(c.st, c.A, () => CA().remove(c.st, val(uid, c))); if (!r.ok) throw new Error(r.msg || 'non smontato'); },
    casa: (c, v) => { c.r = casaFai(c.st, c.A, v, c.a, c.d); },
    muro: (c, m, con) => { c.r = muroFai(c.st, c.A, val(m, c), val(con, c)); },
    pesca: (c, min) => pescaDati(c.st, c.A, +val(min, c) || 60, c),
  };
  // la cassa della bottega: la stessa di Oggetti (tillMove, oggetti.js:1503): la cassa della ditta di Soldi se c'è, se no Sh.cash
  function cassa(st, Sh, x) {
    const So = typeof Soldi !== 'undefined' ? Soldi : null;
    if (So && st.soldi && So.ditta && So.till) { const D = So.ditta(st, Sh.t), T = So.till(st, D); if (T) { T.cash = (T.cash || 0) + x; if (x > 0) D.rev = (D.rev || 0) + x; return; } }
    Sh.cash = (Sh.cash || 0) + x;
  }
  // mangiare e bere dai dati di Oggetti.CAT (eat: fame, igiene, sonno, sete, alcol, hp; uses; empty): come Oggetti.consume sul corpo
  function consumaDati(st, A, id) {
    const e = CAT()[id], E = e.eat, Bg = A.borsa, c = corpo(st, A.id, true);
    if (e.uses) { const W = c.usura = c.usura || {}, k = 'u:' + id; if (W[k] === undefined) W[k] = e.uses; W[k]--; if (W[k] <= 0) { Bg.togli(id, 1); delete W[k]; if (e.empty) Bg.add(e.empty, 1); } }
    else { Bg.togli(id, 1); if (e.empty) Bg.add(e.empty, 1); }
    const N = A.bisogni, n = isNino(A) ? st.me && st.me.need : A.o.pop && (A.o.pop.need = A.o.pop.need || {});
    if (E.fame) N.fame = clamp(N.fame - E.fame, 0, 1); if (E.igiene) N.igiene = clamp(N.igiene + E.igiene, 0, 1); if (E.sonno) N.sonno = clamp(N.sonno + E.sonno, 0, 1);
    if (E.sete && n) n.sete = clamp((n.sete || 0) + E.sete, 0, 1);
    if (E.alcol) { c.drunk = clamp((c.drunk || 0) + E.alcol * .6, 0, 1); c.alcol = (c.alcol || 0) + E.alcol; }
    if (E.hp && A.o) A.o.hp = Math.min(100, (A.o.hp === undefined ? 100 : A.o.hp) + E.hp);
  }
  // la ricetta dai dati di Oggetti.RECIPES (in con le alternative «a|b», out, tools e la loro usura, min): come Oggetti.craft sulle tasche
  const alts = k => String(k).split('|');
  function pianoRicetta(Bg, R, volte) {
    const use = {}, miss = [];
    for (const [key, q0] of Object.entries(R.in)) { const q = q0 * volte, h = alts(key).find(id => Bg.get(id) - (use[id] || 0) >= q); if (h) use[h] = (use[h] || 0) + q; else miss.push(alts(key).map(k => nomeR(k, 'nudo')).join(' o ') + (q > 1 ? ' ×' + q : '')); }
    const tools = [], missT = [];
    for (const key of R.tools) { const h = alts(key).find(id => Bg.get(id) > 0); if (h) tools.push(h); else missT.push(alts(key).map(k => nomeR(k, 'nudo')).join(' o ')); }
    return { use, tools, miss, missT };
  }
  function ricettaDati(st, A, R, volte) {
    const Bg = A.borsa, pl = pianoRicetta(Bg, R, volte); if (pl.miss.length || pl.missT.length) throw new Error('manca roba');
    for (const k in pl.use) Bg.togli(k, pl.use[k]);
    const mins = R.min * volte, c = corpo(st, A.id, true), W = c.usura = c.usura || {}, C = CAT();
    for (const id of pl.tools) { const e = C[id]; if (!e || !e.tool) continue; if (W[id] === undefined || W[id] <= 0) W[id] = e.tool; W[id] -= Math.max(1, mins / 30); if (W[id] <= 0) { Bg.togli(id, 1); W[id] = e.tool; } }
    for (const k in R.out) Bg.add(k, R.out[k] * volte);
  }
  // il baratto: la regola di Oggetti.barter (oggetti.js:1543, valueOf :1536): accetta se gli conviene, e un po' meno se si fida
  function valore(id, q, who) {
    const c = CAT()[id]; if (!c) return 0; let v = c.prezzo || (c.res ? 3 : .5);
    if (who && who.pop) { const need = who.pop.need || {}; if (c.eat && c.eat.fame && (need.fame || 0) > .5) v *= 1.5; if (c.ill && who.ris && who.ris.ideo > .6) v *= 1.3; if (c.ill && who.ris && who.ris.ideo < .3) v *= .3; }
    return v * q;
  }
  function barattoConto(st, A, B, a) {
    const n = B.o, give = a.dai || {}, get = a.prendi || {}, my = Math.max(0, +a.lire || 0), their = Math.max(0, +a.loro || 0);
    const vin = Object.entries(give).reduce((s, [k, q]) => s + valore(k, q, n), 0) + my, vout = Object.entries(get).reduce((s, [k, q]) => s + valore(k, q, null), 0) + their;
    if (vout <= 0 && vin <= 0) return { ok: false, why: 'Non c\'è niente sul piatto.' };
    const o = n.op || {}, trust = (o.trust || 0) - (o.grudge || 0), greed = (n.tr && n.tr.avid) || .5, want = vout * (1 + greed * .25 - clamp(trust, -.5, .6) * .3);
    const ill = Object.keys(give).concat(Object.keys(get)).some(k => CAT()[k] && CAT()[k].ill);
    if (ill && n.tr && n.tr.legge > .75 && trust < .3) return { ok: false, why: '«Roba così non la voglio vedere. E nemmeno te.»' };
    if (vin + 1e-6 < want) return { ok: false, why: `«Non mi conviene. Mettici almeno ${Math.ceil(want - vin)}.000 lire di più.»` };
    return { ok: true, vin, want };
  }
  function barattoDati(st, A, B, a, conto) {
    const give = a.dai || {}, get = a.prendi || {}, my = Math.max(0, +a.lire || 0), their = Math.max(0, +a.loro || 0), n = B.o;
    for (const k in give) { const q = A.borsa.togli(k, give[k]); B.borsa.add(k, q); }
    for (const k in get) { const q = B.borsa.togli(k, get[k]); A.borsa.add(k, q); }
    A.soldi = A.soldi - my + their; B.soldi = B.soldi + my - their;
    if (G.opSpingi) G.opSpingi(st, n, { trust: conto && conto.vin > conto.want * 1.2 ? .05 : .01 }, 24 * 60, 'baratto'); /* [logica] via opSpingi: prima la scrittura diretta a n.op si perdeva al pensiero dopo */
  }
  // il pezzo del cantiere: l'oggetto stesso se ce l'hai, se no il costo (con le alternative), dalle tasche (Cantiere pay, cantiere.js:203)
  function mancaPezzo(A, b) {
    if (b.item && A.borsa.get(b.item) >= 1) return '';
    const c = b.cost || {}, out = [];
    for (const [k, q] of Object.entries(c)) if (!alts(k).some(id => A.borsa.get(id) >= q)) out.push(`${alts(k).map(x => nomeR(x, 'nudo')).join(' o ')} ×${q}`);
    return out.join(', ');
  }
  function pagaDati(A, b) {
    if (b.item && A.borsa.get(b.item) >= 1) { A.borsa.togli(b.item, 1); return { item: b.item }; }
    const c = b.cost || {}; for (const [k, q] of Object.entries(c)) { const id = alts(k).find(x => A.borsa.get(x) >= q); if (id) A.borsa.togli(id, q); }
    return { cost: c };
  }
  // la casa: Casa.fai, lo stesso verbo per tutti (casa.js:503). Il fatto lo scrive casa (fattoCerto): il verbo lo adotta
  function casaFai(st, A, v, a, d) {
    const K = CS(), bi = casaBi(A), chi = isNino(A) ? 'player' : A.o, f = A.dove.k === 'dentro' && A.dove.b === bi ? A.dove.f : undefined;
    const dati = v === 'posa' ? { id: d.mobile, g: a.cosa, prov: { come: isNino(A) ? 'giocatore' : 'sua' } } : { stile: d.X.stile, ink: a.ink };
    if (f !== undefined) dati.f = f;
    const op = K.fai(st, chi, bi, v, dati);
    if (!op) throw new Error('Casa.fai ha detto di no');
    const cf = op.fid && K.fattoDi ? K.fattoDi(st, op.fid) : null;   // il fatto di casa (fattoCerto: 'c12'), e il suo id nella memoria (vid)
    return { op: op.n, fidV: cf && cf.vid ? cf.vid : null, bi };
  }
  // il muro: per l'NPC Popolo.paintWall (popolo.js:1509: il muro dipinto, la voce, il fermo); per il giocatore la riga di playerTick
  // (azioni.js:1156). Lo stesso registro dei muri (st.pop.walls): la disposizione dei graffiti non si tocca
  function muroFai(st, A, muro, con) {
    const Pp = PO(), I = Pp && Pp._, t = I.target(muro); if (!t) throw new Error('muro sparito');
    if (isNino(A)) {
      st.pop.walls.push({ pk: I.tkey(t), place: t.label, t: st.t, by: 'player', text: con === 'pennello' ? 'un murale con l\'onda della Risacca' : con === 'gesso' ? 'LA RISACCA SALE, col gesso' : 'l\'onda della Risacca, a spruzzo', kind: 'scritta', style: con });
      if (AZ() && AZ().emit) try { AZ().emit(st, 'scritta', 'player', null, A.x, A.y, t.label); } catch (e) { }
      if (st.ris) st.ris.morale = clamp(st.ris.morale + (con === 'pennello' ? 5 : 3), 0, 100);
      const B = A.bisogni; B.rabbia = clamp(B.rabbia - .35, 0, 1); B.svago = clamp(B.svago - .5, 0, 1);   // come feel() di paintWall per una scritta
    } else {
      const sk = I.sketchFor(st, A.o); if (con === 'gesso') { sk.kind = 'scritta'; sk.text = String(sk.text).replace(/^(il|la|un|una|l') .*/, x => x.split(',')[0]); }
      I.paintWall(st, A.o, { tgt: t }, sk);
    }
    return { pk: I.tkey(t) };
  }
  // la pesca: una prova ogni 20 minuti, la riuscita dall'abilità (la stessa legge vicino e lontano: il flusso 'verbi', seminato)
  function pescaDati(st, A, min, c) {
    const k = Math.max(1, Math.floor(min / 20)), p = .2 + .45 * ((A.abilita && A.abilita.pesca) || .3); let q = 0;
    for (let i = 0; i < k; i++) if (Un().flusso('verbi') < p) q++;
    if (q) A.borsa.add('pesce', q); c.d.q = q;
    const cc = corpo(st, A.id, true), W = cc.usura = cc.usura || {}, e = CAT().canna; if (e && e.tool) { if (W.canna === undefined || W.canna <= 0) W.canna = e.tool; W.canna -= Math.max(1, min / 30); if (W.canna <= 0) { A.borsa.togli('canna', 1); W.canna = e.tool; } }
  }

  // ======================= I CONTI DI OGNI VERBO (calcola: i valori derivati, letti, mai scritti) =======================
  const CALC = {
    vai: (st, A, a, d) => { const P = a.posto ? G.PLACES[a.posto] : null; if (P) { d.x = P.x; d.y = P.y; } d.min = 2 + hyp((d.x !== undefined ? d.x : a.x) - A.x, (d.y !== undefined ? d.y : a.y) - A.y) / 11; },
    prendi: (st, A, a, d) => { d.q = a.q || 1; const B = borsaDa(st, A, a.da); d.disp = B ? B.get(a.cosa) : 0; d.daid = a.da === 'casa' ? 'casa:' + A.id : a.da === 'base' ? 'base:' + ((baseVicina(st, A) || {}).id || '') : ''; d.base = a.da === 'base' && isNino(A) && OG() && !!st.ris; },
    posa: (st, A, a, d) => { d.q = a.q || 1; },
    dai: (st, A, a, d) => { d.q = a.q || 1; }, regala: (st, A, a, d) => { d.q = a.q || 1; },
    salda: (st, A, a, d) => { const F = FT(); d.debito = F ? F.debito(st, a.chi, A.id) : 0; d.soldi = r1(Math.min(a.soldi || d.debito, d.debito)); },
    compra: (st, A, a, d) => {
      d.q = Math.max(1, Math.floor(a.q || 1)); const S = shop(st, a.dove); if (!S) return;
      d.banco = banco(st, A, a.dove); const E = EC(); d.prezzo = E && E.price ? E.price(st, S, a.cosa) : 0; d.tot = r1(d.prezzo * d.q); d.scorta = Math.floor(S.stock[a.cosa] || 0);
      d.base = isNino(A) && !!(OG() && st.ris && st.ris.bases && st.ris.bases.some(b => b.alive && hyp(b.x - A.x, b.y - A.y) < 6));
    },
    vendi: (st, A, a, d) => {
      d.q = Math.max(1, Math.floor(Math.min(a.q || 1, A.borsa.get(a.cosa) || 1))); if (!shop(st, a.dove)) return;
      d.banco = banco(st, A, a.dove); const b = d.banco && d.banco.buys.find(x => x.g === a.cosa); d.prezzo = b ? b.price : 0; d.tot = r1(d.prezzo * d.q);
    },
    baratta: (st, A, a, d) => { const B = attore(st, a.chi); d.baratto = B && !isNino(B) && B.o.pop ? barattoConto(st, A, B, a) : null; },
    fai_ricetta: (st, A, a, d) => {
      const O = OG(), R = O && O.RECIPES[a.rec]; if (!R) return; d.R = R; let volte = Math.max(1, Math.min(10, Math.floor(a.volte || 1)));
      let pl = pianoRicetta(A.borsa, R, volte); while (pl.miss.length && volte > 1) { volte--; pl = pianoRicetta(A.borsa, R, volte); }
      d.volte = volte; d.manca = pl.miss.join(', '); d.mancaT = pl.missT.join(', '); d.min = R.min * volte; d.cosa = Object.keys(R.out)[0]; d.q = (R.out[d.cosa] || 1) * volte; d.attrezzo = pl.tools[0] || null;
      d.rischio = CAT()[d.cosa] && CAT()[d.cosa].ill ? .15 : 0;
      const pz = postazione(st, A, R); d.postOk = pz.ok; d.postWhy = pz.why;
    },
    costruisci: (st, A, a, d) => {
      const C = CA(), b = C && C.BY && C.BY[a.id]; if (!b) return; d.b = b; d.mancaM = mancaPezzo(A, b); d.min = b.big || 20; d.cosa = a.id;
      d.tx = Math.floor(a.x / G.TS); d.ty = Math.floor(a.y / G.TS);
      d.dove = come(st, A, () => C.canPlace(st, b, a.x, a.y, a.rot || 0)) || '';
    },
    arreda: (st, A, a, d) => { d.mobile = G2F[a.cosa] || null; },
    ridipingi: (st, A, a, d) => { const K = CS(); d.X = K && K.INK ? K.INK[a.ink] || null : null; d.mat = d.X ? d.X.mat : null; d.colore = d.X ? d.X.w : null; d.cosa = d.mat; },
    dipingi_muro: (st, A, a, d) => { d.min = a.con === 'pennello' ? 45 : a.con === 'gesso' ? 6 : 12; d.cosa = a.con; },
    dormi: (st, A, a, d) => { const ore = a.ore || 8; d.min = ore * 60; d.dS = -Math.min(A.bisogni.sonno, ore * .125); },
    pesca: (st, A, a, d) => { d.min = (a.ore || 1) * 60; d.cosa = 'pesce'; },
  };
  // il banco della bottega come lo vede chi ci sta davanti (Oggetti.counter, letto col cambio di persona: i prezzi, la cassa, aperta)
  let MEMO = null;   // dentro una chiamata di Verbo.qui il banco di una bottega si legge una volta sola
  function banco(st, A, k) {
    const O = OG(); if (!O || !O.counter) return null; const mk = A.id + '|' + k;
    if (MEMO && MEMO.has(mk)) return MEMO.get(mk);
    let b = null; try { b = come(st, A, () => O.counter(st, k)); } catch (e) { b = null; }
    if (MEMO) MEMO.set(mk, b); return b;
  }
  // la postazione della ricetta: quelle a portata (Oggetti.stationsHere, letto col cambio di persona) e il posto (rec.place)
  function postazione(st, A, R) {
    const O = OG();
    if (R.st) { const S = come(st, A, () => O.stationsHere(st)); if (!alts(R.st).some(s => S.has(s))) return { ok: false, why: `Serve: ${alts(R.st).map(s => (O.STATIONS[s] ? O.STATIONS[s].nome : s)).join(' o ')}.` }; }
    if (R.place) { const P = G.PLACES; let best = null, bd = 16; for (const id in P) { const q = P[id], dd = hyp(q.x - A.x, q.y - A.y); if (dd < bd) { bd = dd; best = id; } } if (!best || !(R.place.test(best) || R.place.test(String(P[best].name).toLowerCase()))) return { ok: false, why: 'Non qui.' }; }
    return { ok: true };
  }

  // ======================= GLI ADATTATORI (chi esegue davvero, per strategia) =======================
  // giocatore: la funzione di sempre sul corpo vero; B: la stessa sotto Unico.come; A: diretta sull'attore. Ritornano { ok, msg, fid? }
  const OK = (ok, msg, x) => Object.assign({ ok, msg: msg || '' }, x || {});
  const ADATTA = {
    compra: { giocatore: (st, A, a) => OG().buy(st, a.dove, a.cosa, a.q || 1), B: (st, A, a) => OG().buy(st, a.dove, a.cosa, a.q || 1) },
    vendi: { giocatore: (st, A, a, d) => OG().sell(st, a.dove, a.cosa, d.q), B: (st, A, a, d) => OG().sell(st, a.dove, a.cosa, d.q) },
    baratta: { giocatore: (st, A, a) => OG().barter(st, a.chi, { give: a.dai || {}, get: a.prendi || {}, lire: a.lire || 0, theirLire: a.loro || 0 }),
      B: (st, A, a) => OG().barter(st, a.chi, { give: a.dai || {}, get: a.prendi || {}, lire: a.lire || 0, theirLire: a.loro || 0 }) },
    mangia: { giocatore: (st, A, a) => OG().consume(st, a.cosa), B: (st, A, a) => OG().consume(st, a.cosa) },
    bevi: { giocatore: (st, A, a) => OG().consume(st, a.cosa), B: (st, A, a) => OG().consume(st, a.cosa) },
    fai_ricetta: { giocatore: (st, A, a, d) => OG().craft(st, a.rec, d.volte), B: (st, A, a, d) => OG().craft(st, a.rec, d.volte) },
    costruisci: {
      giocatore: (st, A, a, d) => CA().place(st, d.b, a.x, a.y, a.rot || 0),
      B: (st, A, a, d) => { const r = CA().place(st, d.b, a.x, a.y, a.rot || 0); if (r.ok && r.o) r.o.by = A.id; return r; },
    },
    smonta: { giocatore: (st, A, a) => CA().remove(st, a.uid), B: (st, A, a) => CA().remove(st, a.uid) },
  };
  // la strategia: il giocatore la sua funzione; l'NPC in scena B (o A), vicino A o B, lontano C (§3.4, §4)
  function strategia(st, A, v, opt) {
    if (opt && opt.strat) return opt.strat;
    const D = ADATTA[v];
    if (!D) return 'A';   // senza adattatore: gli effetti sulle viste di Attore, uguali per tutti (la via diretta)
    if (isNino(A)) return D.giocatore ? 'G' : 'C';
    const l = opt && opt.lod || lodDi(st, A);
    if (l === 'scena' || l === 'vicino') return D.B ? 'B' : D.A ? 'A' : 'C';
    return 'C';
  }

  // ======================= IL REGISTRO =======================
  const REG = {};
  function registra(nome, scheda, adatta, calcola) {
    if (!scheda || !scheda.segno) throw new Error('[Verbo] un verbo senza segno non entra nel catalogo: ' + nome);   // §7: la regola
    REG[nome] = scheda; if (adatta) ADATTA[nome] = adatta; if (calcola) CALC[nome] = calcola; return Verbo;
  }
  for (const k in SCHEDE) registra(k, SCHEDE[k]);
  // il contesto: l'attore, gli argomenti, i valori derivati
  function ctx(st, A, v, a) { const d = {}; const f = CALC[v]; if (f) f(st, A, a || {}, d); return { st, A, v, a: a || {}, d }; }
  function controlla(c, S) {
    for (const t of S.pre) {
      const f = COND[t[0]]; if (!f) return 'Termine sconosciuto: ' + t[0];
      const r = f(c, t[1], t[2], t[3], t[4]); if (r) return r;
    }
    return '';
  }

  // ======================= LE PRENOTAZIONI =======================
  const pren = st => (st.u.pren = st.u.pren || {});
  function chiaviDi(c, S) { return (S.prenota || []).map(p => ({ k: tmpl(p[0], c), q: +val(p[1], c) || 1, cap: p[2] === undefined ? 1 : +val(p[2], c) || 0 })).filter(p => !/:$|::/.test(p.k)); }
  function liberoDi(st, c, S, io) {
    const P = pren(st);
    for (const p of chiaviDi(c, S)) {
      const L0 = (P[p.k] || []).filter(e => e[2] > st.t && e[0] !== io); if (!L0.length) continue;
      const presi = L0.reduce((s, e) => s + e[1], 0);
      if (p.cap - presi < p.q - 1e-9) { const B = attore(st, L0[0][0]); return `${B ? B.nome : 'Qualcuno'} l'ha già prenotato.`; }
    }
    return '';
  }
  function prenota(st, c, S, io, fino) {
    const P = pren(st), K = chiaviDi(c, S);
    for (const p of K) { const L0 = (P[p.k] || []).filter(e => e[2] > st.t && e[0] !== io); L0.push([io, p.q, fino]); P[p.k] = L0; }
    return K.map(p => p.k);
  }
  function libera(st, io, chiavi) {
    const P = st.u && st.u.pren; if (!P) return;
    for (const k of chiavi || Object.keys(P)) { const L0 = (P[k] || []).filter(e => e[0] !== io && e[2] > st.t); if (L0.length) P[k] = L0; else delete P[k]; }
  }

  // ======================= LE ENTRATE =======================
  function puo(st, chi, v, a, opt) {
    const A = attore(st, chi); if (!A) return 'Non c\'è nessuno.';
    const S = REG[v]; if (!S) return 'Non so fare: ' + v + '.';
    const c = ctx(st, A, v, a), r = controlla(c, S); if (r) return r;
    return liberoDi(st, c, S, A.id);
  }
  // il fatto del verbo: solo id e primitivi. chi = l'attore (o S.attori); con = le controparti; v = i soldi (S.vFatto o la differenza)
  function scriviFatto(st, A, v, c, esito, extra) {
    const F = FT(); if (!F) return null; const S = REG[v];
    const att = S.attori ? S.attori.map(x => String(tmpl(x, c))) : [A.id].concat((S.con || []).map(x => String(tmpl(x, c))));
    const dati = { verbo: v, esito, cosa: c.a.cosa || c.d.cosa || c.a.rec || c.a.id || null, q: typeof c.d.q === 'number' ? c.d.q : typeof c.a.q === 'number' ? c.a.q : null,
      x: A.x, y: A.y, lod: extra.lod, strat: extra.strat };
    const sv = S.vFatto ? +val(S.vFatto, c) : extra.dSoldi; if (typeof sv === 'number' && isFinite(sv) && sv) dati.v = r1(sv);
    if (A.dove.k === 'dentro' && A.dove.b >= 0) dati.bi = A.dove.b;
    if (extra.msg) dati.msg = String(extra.msg).slice(0, 60);
    if (extra.extra) for (const k in extra.extra) dati[k] = extra.extra[k];
    let r = null; try { r = F.scrivi(S.fatto || v, att, dati, extra.causa || null, { st }); } catch (e) { r = null; }
    if (r && r.id !== null && r.id !== undefined) { stats.fatti++; return r.id; }
    // il tetto del giorno o la catena l'hanno fermato: il verbo è stato eseguito, il fatto c'è lo stesso (fuori dalla vista corta di vita)
    const f = F._ && F._.registra ? F._.registra(st, { t: st.t, v: S.fatto || v, chi: att, causa: null, peso: 1, hop: 0 }, dati, 'unico') : null;
    if (f) { stats.fatti++; return f.id; }
    return null;
  }
  // il compimento: ricontrolla, esegue con la strategia giusta, scrive il fatto. Una volta sola
  function compi(st, chi, v, a, opt) {
    opt = opt || {}; const t0 = now(), A = attore(st, chi), S = REG[v];
    const c = ctx(st, A, v, a), lod = opt.lod || lodDi(st, A), strat = strategia(st, A, v, opt);
    let why = vivoA(A) ? controlla(c, S) : `${nomeA(A)} non può.`; if (!why) why = liberoDi(st, c, S, A.id);
    if (why) { stats.falliti++; const fid = scriviFatto(st, A, v, c, 'no', { lod, strat, msg: why, causa: opt.causa }); return { ok: false, msg: why, fid }; }
    const s0 = A.soldi; let r = null;
    try {
      const D = ADATTA[v] || {};
      if (strat === 'G' && D.giocatore) r = D.giocatore(st, A, a, c.d);
      else if (strat === 'B' && D.B) r = come(st, A, () => D.B(st, A, a, c.d));
      else if (strat === 'A' && D.A) r = D.A(st, A, a, c.d);
      else { for (const e of S.eff) { const f = EFF[e[0]]; if (!f) throw new Error('effetto sconosciuto: ' + e[0]); f(c, e[1], e[2], e[3], e[4], e[5]); } r = OK(true, etichetta(st, A, v, a, c) + '.'); if (c.r) r.extra = c.r; }
    } catch (e) { r = OK(false, String(e && e.message || e)); if (Un()._ && Un()._.conta) Un()._.conta('unico.verbi', e); }
    r = r || OK(false, 'Niente.');
    const ex = Object.assign({}, r.extra || {}); delete ex.fidV;
    let fid = null;
    if (r.ok && r.extra && r.extra.fidV && FT()) { const f = FT().daVita(st, r.extra.fidV); if (f) { f.x = Object.assign(f.x || {}, { verbo: v, lod, strat }); fid = f.id; stats.adottati++; } }
    if (fid === null) fid = scriviFatto(st, A, v, c, r.ok ? 'ok' : 'no', { lod, strat, dSoldi: r1(A.soldi - s0), msg: r.ok ? null : r.msg, causa: opt.causa, extra: Object.keys(ex).length ? ex : null });
    if (r.ok) stats.compiuti++; else stats.falliti++;
    stats.per[v] = (stats.per[v] || 0) + 1;
    const ms = now() - t0; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
    return { ok: !!r.ok, msg: r.msg || '', fid, strat, lod };
  }
  // fai: la sola porta. opt: { subito, modo: 'subito'|'piano'|'coda', strat, lod, causa }
  function fai(st, chi, v, a, opt) {
    opt = opt || {}; stats.fai++; a = a || {};
    const A = attore(st, chi); if (!A) return { ok: false, msg: 'Non c\'è nessuno.', fid: null };
    const S = REG[v]; if (!S) return { ok: false, msg: 'Non so fare: ' + v + '.', fid: null };
    const why = puo(st, A, v, a); if (why) { stats.rifiuti++; return { ok: false, msg: why, fid: null }; }
    const l = opt.lod || lodDi(st, A);
    let modo = opt.modo || (opt.subito || A.id === sedile(st) || isNino(A) ? 'subito' : l === 'lontano' || l === 'dormiente' ? 'coda' : 'piano');
    if (modo === 'piano' && !(AZ() && AZ().startPlan && A.o.pop)) modo = 'subito';
    const c = ctx(st, A, v, a), min = Math.max(0, +val(S.costo && S.costo.min, c) || 0), fino = st.t + min + CFG.prenScade;
    if (modo === 'subito') {
      stats.subito++; const K = prenota(st, c, S, A.id, fino);
      try { return Object.assign(compi(st, A, v, a, Object.assign({}, opt, { lod: l })), { compito: 'subito' }); } finally { libera(st, A.id, K); }
    }
    const K = prenota(st, c, S, A.id, fino), aj = JSON.parse(JSON.stringify(a));
    if (modo === 'coda') {
      stats.code++; const Q = st.u.coda = st.u.coda || [];
      const e = [r1(st.t + min), A.id, v, aj, opt.causa || null, K, opt.strat || null];
      let i = Q.length; while (i > 0 && Q[i - 1][0] > e[0]) i--; Q.splice(i, 0, e);
      return { ok: true, msg: '', fid: null, compito: 'coda', quando: e[0] };
    }
    stats.piani++;
    const passiL = passi(st, A, v, aj, { chiavi: K, causa: opt.causa, strat: opt.strat });
    const E = AZ().startPlan(st, A.o, 'verbo', etichetta(st, A, v, aj, c), passiL, opt.prio || 1, { verbo: v, onEnd: (s2, n2, why2) => { libera(s2, n2.id, K); } });
    if (!E) { libera(st, A.id, K); return { ok: false, msg: `${nomeA(A)} ha da fare.`, fid: null }; }
    return { ok: true, msg: '', fid: null, compito: 'piano' };
  }
  // i passi per Azioni.runPlan (azioni.js:208): «va» alla meta, poi «fa» per costo.min minuti; il compimento nell'ultimo passo
  function meta(st, A, v, a, c) {
    const S = REG[v], D = S.dove; if (!D) return null; const k = D[0];
    if (k === 'bottega') { const Sh = shop(st, val(D[1], c)); return Sh ? Sh.t : null; }
    if (k === 'persona') { const B = attore(st, val(D[1], c)); return B ? { x: B.x, y: B.y } : null; }
    if (k === 'porta') return portaDi(val(D[1], c));
    if (k === 'casa') { const P = A.o.pop; return P && P.homeT ? P.homeT : null; }
    if (k === 'muro') { const I = PO() && PO()._; return I && I.target ? I.target(val(D[1], c)) : null; }
    if (k === 'acqua') { const P = ACQUA.map(id => G.PLACES[id]).filter(Boolean).sort((p, q) => hyp(p.x - A.x, p.y - A.y) - hyp(q.x - A.x, q.y - A.y))[0]; return P ? { x: P.x, y: P.y } : null; }
    if (k === 'pezzo') { const o = pezzo(st, val(D[1], c)); return o ? { x: o.x, y: o.y } : null; }
    if (k === 'posto') { const x = val(D[1], c), y = val(D[2], c); return typeof x === 'number' ? { x, y } : null; }
    if (k === 'presso') { const w = val(D[1], c); if (w === 'casa') { const P = A.o.pop; return P && P.homeT ? P.homeT : null; } const b = st.ris && st.ris.bases && st.ris.bases.find(q => q.alive); return b ? { x: b.x, y: b.y } : null; }
    return null;
  }
  // dove va, a parole: «al banco di Alimentari Wu», «da Antonietta», «a casa», «al muro di Piazza», «al molo», «lì»
  function versoDi(st, A, S, c, t) {
    const D = S.dove || [], k = D[0];
    if (k === 'bottega') { const Sh = shop(st, val(D[1], c)); return Sh ? 'al banco di ' + Sh.label : 'al banco'; }
    if (k === 'persona') { const B = attore(st, val(D[1], c)); return B ? 'da ' + B.nome : 'da lui'; }
    if (k === 'casa' || (k === 'presso' && val(D[1], c) === 'casa')) return 'a casa';
    if (k === 'muro') { const P = G.PLACES[val(D[1], c)]; return P ? 'al muro di ' + P.name : 'al muro'; }
    if (k === 'acqua') return 'al mare';
    if (k === 'porta') return 'alla porta';
    return t && t.label ? 'a ' + t.label : 'lì';
  }
  function passi(st, chi, v, a, opt) {
    const A = attore(st, chi), S = REG[v], c = ctx(st, A, v, a), out = [];
    const t = meta(st, A, v, a, c), e0 = etichetta(st, A, v, a, c), lab = e0[0].toLowerCase() + e0.slice(1);
    if (t && hyp(t.x - A.x, t.y - A.y) > 1.5 && v !== 'vai') out.push({ label: 'va ' + versoDi(st, A, S, c, t), at: () => t, dur: 0, outside: S.fam !== 'casa' && t.k !== 'b', inside: t.k === 'b' && S.fam === 'casa' });
    const min = Math.max(0, +val(S.costo && S.costo.min, c) || 0);
    if (v === 'vai') out.push({ label: lab, at: () => ({ x: c.d.x !== undefined ? c.d.x : a.x, y: c.d.y !== undefined ? c.d.y : a.y }), dur: 0, outside: true });
    out.push({ label: lab, dur: v === 'vai' ? 0 : min, verbo: v, posa: S.posa, act: (s2, n2) => { compi(s2, n2, v, a, { causa: opt && opt.causa, strat: opt && opt.strat }); return 'next'; } });
    return out;
  }
  // applica: gli effetti dai dati (strategia C), con il controllo e il fatto
  const applica = (st, chi, v, a, opt) => compi(st, chi, v, a, Object.assign({}, opt || {}, { strat: 'C' }));

  // ======================= LE ETICHETTE E IL MENU QUI, ADESSO =======================
  function etichetta(st, A, v, a, c) {
    c = c || ctx(st, A, v, a); const B = a && a.chi != null ? attore(st, a.chi) : null, nB = B ? B.nome : '', q = c.d.q || a.q || 1;
    const cosa = a.cosa ? (q > 1 ? `${nomeR(a.cosa, 'det')} ×${q}` : nomeR(a.cosa, 'det')) : '';
    const Sh = a.dove != null ? shop(st, a.dove) : null;
    switch (v) {
      case 'vai': return `Vai ${a.posto && G.PLACES[a.posto] ? aN(G.PLACES[a.posto].name) : 'lì'}`;
      case 'entra': { const b = G.BUILDINGS[a.b]; return `Entra${b && b.name ? ' in ' + b.name : ''}`; }
      case 'esci': return 'Esci';
      case 'prendi': return `Prendi ${cosa} ${a.da === 'casa' ? 'da casa' : 'dalla base'}`;
      case 'posa': return `Lascia ${cosa} ${a.in === 'casa' ? 'a casa' : 'in base'}`;
      case 'dai': return `Dai ${cosa} ${aN(nB)}`;
      case 'regala': return `Regala ${cosa} ${aN(nB)}`;
      case 'presta': return `Presta ${L(a.soldi || 0)} ${aN(nB)}`;
      case 'chiedi_prestito': return `Chiedi in prestito ${L(a.soldi || 0)} ${aN(nB)}`;
      case 'salda': return `Salda il debito con ${nB}${c.d.soldi ? ' (' + L(c.d.soldi) + ')' : ''}`;
      case 'compra': return `Compra ${cosa}${c.d.tot ? ' (' + L(c.d.tot) + ')' : ''}${Sh ? ' da ' + Sh.label : ''}`;
      case 'vendi': return `Vendi ${cosa}${c.d.tot ? ' per ' + L(c.d.tot) : ''}`;
      case 'baratta': return `Baratta con ${nB}`;
      case 'mangia': return `Mangia ${cosa}`;
      case 'bevi': return `Bevi ${cosa}`;
      case 'fai_ricetta': return `Fai ${c.d.R ? c.d.R.nome : a.rec}`;
      case 'costruisci': return `Costruisci ${c.d.b ? c.d.b.nome.toLowerCase() : a.id}`;
      case 'smonta': { const o = pezzo(st, a.uid), b = o && CA() && CA().BY[o.id]; return `Smonta ${b ? b.nome.toLowerCase() : 'il pezzo'}`; }
      case 'arreda': return `Metti in casa ${cosa}`;
      case 'ridipingi': return `Ridipingi casa${c.d.colore ? ' (' + c.d.colore + ')' : ''}`;
      case 'dipingi_muro': return `Dipingi il muro${a.muro && G.PLACES[a.muro] ? ' di ' + G.PLACES[a.muro].name : ''}`;
      case 'dormi': return 'Dormi';
      case 'pesca': return 'Pesca';
      default: return cap1(v.replace(/_/g, ' '));
    }
  }
  // i candidati: gli argomenti che hanno senso qui, adesso (pochi, a buon mercato: niente piante, niente percorsi)
  function personaVicina(st, A, r) {
    const dentro = A.dove.k === 'dentro'; let best = null, bd = r || CFG.raggio.persona;
    for (const k of st.npcs) { if (!k || k.dead || !k.pop || k === A.o || !!k.inside !== dentro) continue; const d = hyp(k.x - A.x, k.y - A.y); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  function bottegaVicina(st, A) {
    const E = eco(st); if (!E) return null; let best = null, bd = CFG.raggio.bottega;
    for (const k in E.shops) { const S = E.shops[k], t = S.t; if (!t) continue; if (A.dove.k === 'dentro' && t.k === 'b' && t.bi === A.dove.b) return S; const d = hyp(t.x - A.x, t.y - A.y); if (d < bd) { bd = d; best = S; } }
    return best;
  }
  function candidati(st, A) {
    const out = [], C = CAT(), Bg = A.borsa;
    const S = bottegaVicina(st, A);
    if (S) {
      Object.keys(S.sells).filter(g => C[g] && (S.stock[g] || 0) >= 1).sort((x, y) => (C[x].prezzo || 0) - (C[y].prezzo || 0)).slice(0, 3).forEach(g => out.push(['compra', { cosa: g, q: 1, dove: S.k }]));
      for (const [g] of Bg) { if (out.filter(x => x[0] === 'vendi').length >= 2) break; if (C[g] && S.sells[g]) out.push(['vendi', { cosa: g, q: 1, dove: S.k }]); }
    }
    let m = 0, b = 0;
    for (const [g] of Bg) { const e = C[g]; if (!e || !e.eat) continue; if (e.cat === 'bevande' || e.eat.sete) { if (b++ < 1) out.push(['bevi', { cosa: g }]); } else if (e.eat.fame > 0 && m++ < 1) out.push(['mangia', { cosa: g }]); }
    if (inCasa(st, A) && A.casa) {
      const D = A.casa.dispensa; let k = 0; for (const [g] of D) { if (k++ >= 1) break; out.push(['prendi', { cosa: g, q: 1, da: 'casa' }]); }
      for (const [g] of Bg) { const e = C[g]; if (e && (e.cat === 'cibo' || e.cat === 'dispensa')) { out.push(['posa', { cosa: g, q: 1, in: 'casa' }]); break; } }
    }
    const n = personaVicina(st, A);
    if (n) {
      const F = FT(), dov = F ? F.debito(st, n.id, A.id) : 0;
      if (dov > 0) out.push(['salda', { chi: n.id }]);
      const reg = Array.from(Bg.keys()).find(g => C[g] && C[g].eat && C[g].prezzo <= 3);
      if (reg) out.push(['regala', { chi: n.id, cosa: reg, q: 1 }]);
      if (A.soldi >= 20) out.push(['presta', { chi: n.id, soldi: 5 }]);
      if (A.soldi < 10) out.push(['chiedi_prestito', { chi: n.id, soldi: 5 }]);
    }
    if (Bg.get('canna') >= 1 && A.dove.k === 'fuori' && acquaVicina(A)) out.push(['pesca', { ore: 1 }]);
    return out;
  }
  function qui(st, chi, opt) {
    const A = attore(st, chi); if (!A) return []; const out = [], quasi = []; opt = opt || {};
    const m0 = MEMO; MEMO = new Map();
    try {
    for (const [v, a] of candidati(st, A)) {
      const S = REG[v]; if (!S || (S.menu === false && !opt.tutti)) continue;
      const c = ctx(st, A, v, a); let why = controlla(c, S); if (!why) why = liberoDi(st, c, S, A.id);
      const e = { v, a, etichetta: etichetta(st, A, v, a, c) };
      if (!why) out.push(e); else { e.perche = why; quasi.push(e); }
    }
    } finally { MEMO = m0; }
    return out.concat(quasi);
  }
  const copre = id => (Object.prototype.hasOwnProperty.call(COPRE, id) ? COPRE[id] : null);
  // il menu: le voci vecchie tutte com'erano, più quelle del registro (Verbo.qui del sedile, e del membro guidato accanto)
  function menu(st, vecchie) {
    const out = vecchie.slice(), etich = new Set(vecchie.map(x => x.label));
    if (!st || !st.player || st.player.vehicle || st.over || (st.me && st.me.warp)) return out;
    const L0 = qui(st, 'player'); let k = 0, kq = 0;
    for (const e of L0) {
      if (etich.has(e.etichetta)) continue;
      if (!e.perche) { if (k++ >= CFG.quiMax) continue; out.push({ id: 'u_' + e.v, label: e.etichetta, off: '', unico: e.v, run: () => fai(st, 'player', e.v, e.a, { subito: true }).msg }); }
      else { if (kq++ >= CFG.quasiMax) continue; out.push({ id: 'u_' + e.v, label: e.etichetta, off: e.perche, unico: e.v, run: null }); }
      etich.add(e.etichetta);
    }
    // il membro guidato accanto: quello che puoi fargli fare (lo fa lui, coi suoi passi: lo vedi farlo)
    const p = st.player, m = st.npcs.find(n => !n.dead && n.ris && n.ris.member && n.ris.auto === false && n.pop && !n.inside && hyp(n.x - p.x, n.y - p.y) < 3);
    if (m) { let j = 0; for (const e of qui(st, m)) { if (e.perche || j++ >= CFG.membroMax) continue; out.push({ id: 'u_m_' + e.v, label: `${m.first}: ${e.etichetta[0].toLowerCase() + e.etichetta.slice(1)}`, off: '', unico: e.v, run: () => { const r = fai(st, m, e.v, e.a); return r.ok ? `${m.first} ci pensa.` : r.msg; } }); } }
    return out;
  }

  // ======================= LA FASE: la coda dei lontani, la messa in opera dei cantieri, le prenotazioni scadute =======================
  function fase(st) {
    if (!st.u) return;
    const Q = st.u.coda; let k = 0;
    while (Q && Q.length && Q[0][0] <= st.t && k++ < CFG.codaPasso) {
      const [, id, v, a, causa, K, strat] = Q.shift(), A = attore(st, id);
      if (A && REG[v]) { libera(st, id, K); compi(st, A, v, a, { causa, lod: lodDi(st, A), strat: strat || null }); }
    }
    // i pezzi pensati lontano si mettono in opera quando c'è qualcuno a guardare (come le righe di casa.js)
    const K = st.u.cantieri;
    if (K && K.length && st.player) {
      for (let i = K.length - 1; i >= 0; i--) {
        const q = K[i]; if (hyp(q.x - st.player.x, q.y - st.player.y) > CFG.sceneR + 15) continue;
        K.splice(i, 1); operaCantiere(st, q);
      }
    }
    if (st.u.pren && (Un().passi % 120) === 0) libera(st, null, null);
  }
  function operaCantiere(st, q) {
    const A = attore(st, q.by), C = CA(), b = C && C.BY[q.id]; if (!A || !b) return null;
    const r = come(st, A, () => C.place(st, b, q.x, q.y, q.rot, { uid: 'u' + q.n, paid: q.paid, seed: (q.n * 2654435761) >>> 0 }));
    if (r && r.ok && r.o) { r.o.by = A.id; r.o.at = q.t; return r.o; }
    // il posto non c'è più: la roba torna a chi l'aveva pagata
    if (q.paid && q.paid.item) A.borsa.add(q.paid.item, 1); else if (q.paid && q.paid.cost) for (const [k, n] of Object.entries(q.paid.cost)) A.borsa.add(alts(k)[0], n);
    scriviFatto(st, A, 'costruisci', ctx(st, A, 'costruisci', { id: q.id, x: q.x, y: q.y, rot: q.rot }), 'no', { lod: 'dormiente', strat: 'C', msg: r ? r.msg : 'niente' });
    return null;
  }
  Un().fase('unico.verbi', { dopo: 'casa', budget: { p95: .15 } }, fase);
  if (Un().nasce) Un().nasce('verbi', st => { if (st.u) { st.u.pren = st.u.pren || {}; st.u.coda = st.u.coda || []; } });

  // ======================= IL MENU DEL GIOCATORE (una volta, per ultimo) =======================
  { const Z = AZ(); if (Z && Z.playerActions && !Z.playerActions.__unico) {
    const pa0 = Z.playerActions;
    const pa = function (st) { const o = pa0.apply(this, arguments) || []; try { return menu(st, o); } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.menu', e); return o; } };
    pa.__unico = true; pa.vecchio = pa0; Z.playerActions = pa;
  } }
  // un campo per l'attore (Cantiere.claim per chiunque): dove l'NPC può costruire, come il giocatore nel suo
  function campo(st, chi, x, y, r) { const A = attore(st, chi), c = corpo(st, A.id, true); c.covi = c.covi || []; const k = { id: 'n:' + A.id + ':' + (c.covi.length + 1), name: `Campo di ${A.nome}`, x, y, r: r || 22 }; c.covi.push(k); return k; }

  Object.assign(Verbo, { CFG, SCHEDE: REG, COND, EFF, ADATTA, CALC, COPRE, registra, puo, fai, qui, passi, applica, compi, copre, etichetta, candidati, come, campo, lodDi,
    _: { ctx, controlla, val, tmpl, libera, prenota, liberoDi, chiaviDi, menu, fase, operaCantiere, strategia, scriviFatto, pianoRicetta, barattoConto, G2F } });
  Un().Verbo = Verbo; Un().come = come;
  return Verbo;
})();
if (typeof window !== 'undefined') window.Verbo = Verbo;
