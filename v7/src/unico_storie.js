/* [unico] unico_storie.js: LE STORIE A PIÙ PASSI (storylet) COME DATI (progetto: commedia/REGISTA_E_VOCABOLARIO.md §B.6, §B.7, §T.2).
   Dietro ?commedia. Spento il flag: UnicoStorie = { ON: false } e nient'altro. Solo dati: le legge unico_regista.js.

   LA SCHEDA (formato v1, quello del §T.2 ridotto a quello che il vocabolario di oggi sa fare):
     fam        la famiglia (§B.6: vicinato, amore, debiti, lavoro, costruire, voce, muri…)
     reg        il registro della Bibbia del mondo: 'R' realistica, 'A' assurda, 'S' surreale
     calma      true: una storia che RAFFREDDA (il regista la semina quando la tensione è oltre il voluto)
     peso       { goldoni, fellini, monicelli }: quanto piace a ogni carattere di regista (manca = 1)
     innesco    { tipo: [tipi di fatto], se: [[cond, …]], entro: minuti }   un fatto nuovo di quel tipo (esito non 'no') la rende possibile
                { spontanea: true, ora: [dalle, alle] }                     nessun fatto: il regista la può seminare a quell'ora
     ruoli      { nome: { e: '$f.chi' | '$f.con0' | '$f.con1' } }            dal fatto d'innesco
                { nome: { q: { vicino_a: 'ruolo', r: metri, car: [tratto, min], non: ['ruolo'] }, opz: true? } }   il casting fra le menti
     passi      [{ id, spinte: { ruolo: [obiettivo della Mente, ×(.6..1.6)] }, attende: { tipo: [...], chi: 'ruolo'|['r1', 'r2'] },
                  scad: minuti, rami: { tipo_del_fatto: 'esito' | '>id_del_passo' }, poi: 'esito'|'>passo', senza: 'esito' allo scadere }]
                Un passo non dice verbi: dice quale obiettivo spingere a chi e quale fatto lo compie. I verbi li sceglie la Mente.
     esiti      { nome: ['#gancio', …] }   i ganci (§B.7) che il fatto di chiusura porta; 'sfumata' c'è sempre (la chiusura di ripiego)
     segni      { seme, svolta: { passo: riga }, fine: { esito: riga }, richiamo }   righe con {ruolo} (il nome); senza punto finale
     radice     { evento: [id di Eventi.SCENE] }   facoltativa: la scena di città che il regista può far partire vicino al giocatore
     ritorno    { giorni }   quanto deve passare prima che la stessa storia torni (§C.5: 3 giorni col catalogo pieno)
   Gli obiettivi delle spinte devono esistere in Mente.OBIETTIVI, i tipi in Segni.TIPI o nei fatti dei verbi: Regia.controlla() lo dice. */
var UnicoStorie = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UnicoStorie = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UnicoStorie;
  if (!ON) return UnicoStorie;

  const SCHEDE = {
    debito_che_gira: { fam: 'debiti', reg: 'R', peso: { monicelli: 1.3 },
      innesco: { tipo: ['prestito'] },
      ruoli: { creditore: { e: '$f.chi' }, debitore: { e: '$f.con0' } },
      passi: [
        { id: 'attesa', spinte: { creditore: ['riscuotere', 1.4] }, attende: { tipo: ['saldato', 'rinfacciato'], chi: ['creditore', 'debitore'] }, scad: 720,
          rami: { saldato: 'pari', rinfacciato: '>muso' }, senza: 'sfumata' },
        { id: 'muso', spinte: { debitore: ['guadagnare', 1.4], creditore: ['riscuotere', 1.2] }, attende: { tipo: ['saldato'], chi: ['debitore', 'creditore'] }, scad: 900,
          poi: 'pari_tardi', senza: 'lite' },
      ],
      esiti: { pari: ['#debito_chiuso'], pari_tardi: ['#tregua'], lite: ['#lite', '#debito'], sfumata: [] },
      segni: { seme: 'Si dice che {creditore} abbia prestato dei soldi a {debitore}', svolta: { muso: '{creditore} ha rinfacciato il debito a {debitore}, e non piano' },
        fine: { pari: '{debitore} ha reso il dovuto a {creditore}: pari e patta', pari_tardi: 'Alla fine {debitore} ha pagato {creditore}, ma ci è voluto il muso',
          lite: 'Fra {creditore} e {debitore} non si parlano più: il debito è ancora lì', sfumata: 'Del prestito fra {creditore} e {debitore} non si è più saputo niente' },
        richiamo: 'Al porto c\'è ancora chi ricorda i soldi di {creditore} e {debitore}' },
      ritorno: { giorni: .5 } },

    appuntamento_mancato: { fam: 'amore', reg: 'R', peso: { goldoni: 1.2 },
      innesco: { tipo: ['appuntamento'] },
      ruoli: { a: { e: '$f.chi' }, b: { e: '$f.con0' } },
      passi: [
        { id: 'attesa', spinte: { a: ['socializzare', 1.3], b: ['socializzare', 1.3] }, attende: { tipo: ['incontro', 'buca'], chi: ['a', 'b'] }, scad: 1440,
          rami: { incontro: 'visti', buca: '>offesa' }, senza: 'sfumata' },
        { id: 'offesa', spinte: { a: ['vendicarsi', 1.3], b: ['regalare', 1.4] }, attende: { tipo: ['rinfacciato', 'regalo'], chi: ['a', 'b'] }, scad: 1440,
          rami: { rinfacciato: 'muso', regalo: 'scuse' }, senza: 'sfumata' },
      ],
      esiti: { visti: ['#amore'], muso: ['#lite', '#vergogna'], scuse: ['#tregua'], sfumata: [] },
      segni: { seme: '{a} e {b} si sono dati un appuntamento', svolta: { offesa: '{b} non si è fatto vedere: {a} ha aspettato per niente' },
        fine: { visti: '{a} e {b} si sono visti davvero, all\'ora giusta', muso: 'Dopo la buca, {a} ha detto a {b} quello che pensava',
          scuse: 'Dopo la buca {b} si è fatto perdonare da {a} con un regalo', sfumata: 'L\'appuntamento fra {a} e {b} è finito nel nulla' },
        richiamo: 'Qualcuno chiede ancora a {a} com\'è finita con {b}' },
      ritorno: { giorni: .5 } },

    pesca_grossa: { fam: 'lavoro', reg: 'R', peso: { fellini: 1.2 },
      innesco: { tipo: ['pesca'] },
      ruoli: { pescatore: { e: '$f.chi' }, amico: { q: { vicino_a: 'pescatore', r: 90, non: ['pescatore'] }, opz: true } },
      passi: [
        { id: 'banco', spinte: { pescatore: ['guadagnare', 1.5] }, attende: { tipo: ['vende'], chi: 'pescatore' }, scad: 360, senza: 'sfumata' },
        { id: 'offre', spinte: { pescatore: ['regalare', 1.4], amico: ['socializzare', 1.2] }, attende: { tipo: ['regalo', 'chiacchiera'], chi: ['pescatore', 'amico'] }, scad: 480,
          rami: { regalo: 'generoso', chiacchiera: 'vanto' }, senza: 'tirchio' },
      ],
      esiti: { generoso: ['#pesca_grossa', '#amicizia'], vanto: ['#pesca_grossa', '#fama'], tirchio: ['#pesca_grossa'], sfumata: [] },
      segni: { seme: '{pescatore} è tornato con la cassetta piena', svolta: { offre: '{pescatore} ha venduto il pesce al banco e ha le tasche gonfie' },
        fine: { generoso: 'Con i soldi del pesce {pescatore} ha fatto un regalo', vanto: '{pescatore} racconta la sua pesca a chiunque passi',
          tirchio: 'Della pesca grossa {pescatore} non ha dato niente a nessuno', sfumata: 'Il pesce di {pescatore} è finito chissà dove' },
        richiamo: 'Al molo misurano ancora con le mani il pesce di {pescatore}' },
      ritorno: { giorni: .5 } },

    voce_che_corre: { fam: 'voce', reg: 'A', peso: { fellini: 1.3 },
      innesco: { tipo: ['chiacchiera'], se: [['causa_ril>=', .25]] },
      ruoli: { lingua: { e: '$f.chi' }, orecchio: { e: '$f.con0' } },
      radice: { evento: ['vicini_bucato'] },
      passi: [
        { id: 'gira', spinte: { orecchio: ['socializzare', 1.5] }, attende: { tipo: ['chiacchiera'], chi: 'orecchio' }, scad: 480, senza: 'spenta' },
        { id: 'torna', spinte: { lingua: ['socializzare', 1.2] }, attende: { tipo: ['chiacchiera', 'rinfacciato'], chi: ['lingua', 'orecchio'] }, scad: 600,
          rami: { rinfacciato: 'smentita' }, poi: 'piazza', senza: 'spenta' },
      ],
      esiti: { piazza: ['#voce'], smentita: ['#voce', '#lite'], spenta: [], sfumata: [] },
      segni: { seme: '{lingua} ha raccontato una cosa a {orecchio}, e {orecchio} non sa tenersela', svolta: { torna: 'La voce partita da {lingua} è già passata di bocca in bocca' },
        fine: { piazza: 'Ormai lo sa tutto il paese: la voce di {lingua} ha fatto il giro', smentita: 'La voce di {lingua} è finita in una lite', spenta: 'La voce di {lingua} si è spenta da sola' },
        richiamo: 'C\'è chi giura che la voce di {lingua} l\'aveva detta prima lui' },
      ritorno: { giorni: .5 } },

    via_nostra: { fam: 'costruire', reg: 'R', peso: { monicelli: 1.4 },
      innesco: { tipo: ['rivendica'] },
      ruoli: { capo: { e: '$f.chi' }, compagno: { e: '$f.con0' } },
      passi: [
        { id: 'cantiere', spinte: { capo: ['rivendicare', 1.4], compagno: ['rivendicare', 1.4] }, attende: { tipo: ['barrica', 'tira_su'], chi: ['capo', 'compagno'] }, scad: 1440, senza: 'sfumata' },
        { id: 'presidio', spinte: { capo: ['rivendicare', 1.3] }, attende: { tipo: ['presidia'], chi: ['capo', 'compagno'] }, scad: 1440, poi: 'zona', senza: 'a_meta' },
      ],
      esiti: { zona: ['#zona', '#gruppo'], a_meta: ['#baracca'], sfumata: [] },
      segni: { seme: '{capo} e {compagno} si sono messi in testa di prendersi un pezzo di via', svolta: { presidio: 'Il primo pezzo è su: {capo} e {compagno} fanno sul serio' },
        fine: { zona: 'La via è loro: {capo} e i suoi la presidiano', a_meta: 'Il cantiere di {capo} è rimasto a metà', sfumata: 'Di quello che volevano fare {capo} e {compagno} non è rimasto niente' },
        richiamo: 'Passando, la gente guarda ancora il posto di {capo}' },
      ritorno: { giorni: 1 } },

    serata: { fam: 'vicinato', reg: 'R', calma: true, peso: { goldoni: 1.4 },
      innesco: { spontanea: true, ora: [17, 23] },
      ruoli: { a: { q: { car: ['loq', .55] } }, b: { q: { vicino_a: 'a', r: 45, non: ['a'] } } },
      passi: [
        { id: 'quattro_chiacchiere', spinte: { a: ['socializzare', 1.5], b: ['divertirsi', 1.4] }, attende: { tipo: ['chiacchiera', 'beve', 'appuntamento'], chi: ['a', 'b'] }, scad: 180,
          rami: { appuntamento: 'promessa' }, poi: 'serata', senza: 'sfumata' },
      ],
      esiti: { serata: ['#amicizia'], promessa: ['#amicizia', '#appuntamento'], sfumata: [] },
      segni: { seme: 'Stasera {a} ha voglia di compagnia', fine: { serata: '{a} e {b} hanno fatto tardi a chiacchierare', promessa: '{a} e {b} si sono lasciati con un appuntamento',
        sfumata: 'La serata di {a} è finita presto' } },
      ritorno: { giorni: .25 } },

    muro_della_discordia: { fam: 'muri', reg: 'A', peso: { monicelli: 1.2, fellini: 1.1 },
      innesco: { tipo: ['dipinge_muro'] },
      ruoli: { writer: { e: '$f.chi' }, vicino: { q: { vicino_a: 'writer', r: 70, car: ['rancore', .45], non: ['writer'] } } },
      passi: [
        { id: 'risposta', spinte: { vicino: ['vendicarsi', 1.5] }, attende: { tipo: ['rinfacciato', 'dipinge_muro'], chi: 'vicino' }, scad: 720,
          rami: { rinfacciato: 'sgridata', dipinge_muro: 'botta_e_risposta' }, senza: 'sfumata' },
      ],
      esiti: { sgridata: ['#lite'], botta_e_risposta: ['#faida'], sfumata: [] },
      segni: { seme: '{writer} ha dipinto un muro, e a {vicino} non è piaciuto', fine: { sgridata: '{vicino} ha fatto una scenata a {writer} per il muro',
        botta_e_risposta: 'Al muro di {writer} {vicino} ha risposto con un altro muro', sfumata: 'Il muro di {writer} è rimasto lì, e nessuno ha detto niente' } },
      ritorno: { giorni: .5 } },
  };
  // l'impronta del catalogo (§C.7): se un salvataggio la trova cambiata, le storie che non ci sono più si chiudono «sfumate»
  let h = 2166136261; const s = JSON.stringify(SCHEDE); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  Object.assign(UnicoStorie, { v: 1, SCHEDE, impronta: (h >>> 0).toString(16) });
  return UnicoStorie;
})();
if (typeof window !== 'undefined') window.UnicoStorie = UnicoStorie;
