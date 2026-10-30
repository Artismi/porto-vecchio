/* Porto Vecchio — [matti] LE STRANEZZE DEGLI ALTRI (solo logica, niente grafica, niente IA)
   La città fa ridere quando, dal nulla, ti ritrovi dentro la vita di qualcun altro. Tre cose, tutte leggere:
   1. I FRAMMENTI: passando accanto a due che parlano, senti un pezzo della loro storia, a metà, senza contesto
      («Mia suocera è tornata.» «Da dove?» «Non lo dice. Ha portato un'anatra.»). Ogni 35-75 s al massimo, solo se
      sei a piedi e all'aperto; un mazzo mescolato, così non tornano finché non li hai sentiti tutti.
   2. I MATTI DI QUARTIERE: cinque abitanti veri (scelti all'avvio fra chi non è del cast, uno vicino a casa di Nino,
      gli altri sparsi) hanno una fissazione. Fanno la loro giornata come tutti; quando gli passi vicino ti dicono la
      loro, ti riconoscono le volte dopo, e la chat dell'IA sa chi sono (Matti.scheda → mente.js).
   3. LE SCENE STRANE: schede per eventi.js (in fondo), con il filtro 'matto' (prima un matto, se non c'è un vecchio
      qualsiasi) e le battute del matto giusto ({matto:'a', k:'chiave'}).
   4. I RAGAZZI: due sotto i 27 anni si dicono le loro (FRAM_G: fra, zio, bella, oi, la siga, il drum, «hai da accendere?»,
      «fottiti» detto con affetto); uno che ti passa accanto ogni tanto ti scrocca (SCROCCO). Mai cattivi davvero.
   5. LE MANIE: come la sedia con le rotelle, otto abitanti fanno sempre una cosa sola (il giornale camminando, la cornetta senza
      filo, il cero a mezzogiorno, la carriola vuota, la cassa, chi saluta tutto, chi guarda l'orologio). Nessuno lo spiega.
   Costo: un giro sui 5 matti e, ogni tanto, una ricerca di due persone vicine al giocatore.
   Prove: node test_matti.js; anche test_eventi.js prova le scene nuove. */
var Matti = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const EV = () => (typeof Eventi !== 'undefined' ? Eventi : null);
  const CFG = { fram: [35, 75], framR: [2.5, 11], coppia: 3.6, passa: 5.5, solo: [6, 15], cdMatto: 45, cdTutti: 18, gap: 2.7, giovane: 26, scrocco: [70, 150], scroccoR: 3.8, voce: .6 };
  const rnd = Math.random, hyp = Math.hypot, pick = a => a[Math.floor(rnd() * a.length)];
  // il cast scritto a mano non diventa matto (ha già la sua voce)
  const CAST = new Set(['lupo', 'beppe', 'lucia', 'pietro', 'vinile', 'betamax', 'divisa', 'cono', 'vasco', 'pardo', 'zia', 'malanotte', 'gino', 'wu', 'marta', 'tonino', 'elena', 'rosa', 'nico', 'sandro', 'carla', 'ferri']);

  // ================= I MATTI =================
  // chi: il filtro per sceglierlo; voce e fissa: per la chat (IA); passa: quando gli passi vicino; ritorno: le volte dopo;
  // solo: parla da solo mentre gli passi a qualche metro; le altre chiavi servono alle scene.
  const MATTI = {
    generale: {
      nick: 'il Generale', chi: n => n.pop.sex !== 'f' && n.pop.age >= 60,
      fissa: 'Crede che la guerra non sia mai finita. Ha fatto il cuoco in caserma per due anni nel \'43 e da allora comanda: i piccioni, i lampioni, i ragazzi. Saluta militarmente le fontane. È gentilissimo con tutti, purché si mettano sull\'attenti.',
      voce: 'ordini secchi, gradi inventati, rapporti militari su cose da niente; mai cattivo, solo convintissimo',
      passa: ['Riposo, soldato. No, lei no. Lei è ancora in punizione.', 'Il nemico è nei tombini. Non in tutti. Nel terzo a sinistra.', 'Ha visto passare un piccione con l\'aria furba? Ne sto cercando uno.', 'Rapporto: la fontana tiene. Per ora.', 'Mi stia vicino. Oggi c\'è un\'aria da imboscata.', 'Lei ha la faccia di uno che ha disertato. Mi piace. Lo dica a nessuno.'],
      ritorno: ['Ancora lei. Bene. Ho bisogno di uomini.', 'Soldato! Le avevo detto di sorvegliare quella panchina. Chi l\'ha spostata?', 'Ah, il disertore. Riposo.'],
      solo: ['Uno, due. Uno, due. Uno.', 'Quel lampione mi guarda storto da una settimana.', 'Ritirata strategica verso il bar.', 'Sergente Bocca, a rapporto. Ah già, Bocca è morto. A rapporto lo stesso.'],
      ordine: ['Tu! Sull\'attenti!', 'Recluta! Quel passo lì non me lo fai in tempo di guerra!', 'Fermo lì! Nome, grado e cosa hai mangiato!'],
      ordine2: ['Riposo. Attenti. Riposo. Attenti. Così fino a nuovo ordine.', 'Adesso giri attorno alla fontana e mi riferisce se c\'è il nemico.', 'Vai al bar e chiedi se c\'è posta per il Comando.'],
      congedo: ['Bravo. Ti promuovo caporale. Non ti pago, ma ti promuovo.', 'Congedato. Torna a casa da tua madre, ragazzo. Dille che il Generale è contento.', 'Medaglia al valore.'],
    },
    contessa: {
      nick: 'la Contessa', chi: n => n.pop.sex === 'f' && n.pop.age >= 58,
      fissa: 'È convinta di essere una nobile decaduta e che tutta la città sia la sua servitù, un po\' scansafatiche. Vive in due stanze. Parla di un palazzo, di un marito "potentissimo" e di balli col Garante. Non è arrogante: è sinceramente dispiaciuta per quanto è difficile trovare personale.',
      voce: 'altezzosa e svagata, dà del lei a tutti come a camerieri, si lamenta del servizio; candida, mai crudele',
      passa: ['Lei. Sì, lei. Mi porti il cappotto. No, non ce l\'ho. Lo porti lo stesso.', 'Il servizio, in questa città, è peggiorato dal Settecento.', 'Ha l\'aria di uno che sa lucidare l\'argenteria. Si vede dalle mani.', 'Le concedo di salutarmi.', 'Mio marito era un uomo potentissimo. Poi è morto. Che debolezza.', 'Il mio palazzo è là. Dietro il distributore. Non si vede perché è molto discreto.'],
      ritorno: ['Ah, il giovane della servitù. Lei è in ritardo. Di tre giorni.', 'Mi è tornato in mente il suo nome. No, era quello del cavallo.', 'Lei di nuovo. Le aumento lo stipendio: da niente a niente e mezzo.'],
      solo: ['Bisognerà far ridipingere il mare.', 'Le perle, le perle... ah, sono qui, sono le cipolle.', 'Nel \'62 ho ballato col Garante. Pestava i piedi come governa.', 'Qualcuno dica al fornaio che il pane si fa con l\'oro. Non so come, è il suo mestiere.'],
      ordine: ['Lei! Mi regga l\'ombrello.', 'Giovanotto, la borsa. Pesa come la nobiltà.', 'Mi accompagni. Due passi dietro, come si deve.'],
      ordine2: ['Più dritto. Lei cammina come un notaio.', 'Non così vicino. Si sente che non è di famiglia.', 'Questo palazzo lo costruì il mio bisnonno. Adesso è una lavanderia, ma i muri lo sanno.'],
      congedo: ['Basta così. Si ritiri. Le farò avere una mancia per testamento.', 'Ottimo servizio. La raccomanderò ai Savoia.', 'Può andare. E si pettini.'],
    },
    profeta: {
      nick: 'il Profeta', chi: n => n.pop.sex !== 'f' && n.pop.age >= 35,
      fissa: 'Annuncia la fine del mondo con date e orari precisissimi, e quando non succede la sposta senza scomporsi. Le sue profezie sono enormi e banali insieme. Dorme poco, legge l\'elenco del telefono come un libro sacro. Ogni tanto ci azzecca su cose minuscole, e questo lo rende molto pericoloso.',
      voce: 'tono da predica, profezie con l\'ora esatta, segni presi da cose qualunque; calmo, mai minaccioso',
      passa: ['Martedì finisce il mondo. Verso le quattro. Si porti un ombrello.', 'L\'ho visto in sogno: tu, un\'anguria, e una decisione sbagliata.', 'Pentitevi. O almeno lavatevi.', 'Il segno arriverà sotto forma di un uomo con un\'Ape. Ah, eccolo. No, era un altro.', 'Fra tre giorni piove pesce. Non tanto. Due o tre.', 'Non ti dico cosa ti succede domani. Ti dico solo: non comprare le acciughe.'],
      ritorno: ['Tu! Te l\'avevo detto. Non so cosa, ma te l\'avevo detto.', 'La fine del mondo è rimandata a giovedì. C\'era la tombola.', 'Le acciughe. Le hai comprate? Lo vedo che le hai comprate.'],
      solo: ['Pagina quattrocentododici. Rossi, Rossi, Rossi... troppi Rossi. È un segno.', 'Ore sedici e quaranta. Niente. Ore sedici e quarantuno.', 'Le gru del porto si sono mosse. Si muovono sempre, ma oggi con intenzione.', 'Il settimo sigillo è il tappo del vino. Ci arriveranno, ci arriveranno.'],
      predica: ['Fratelli! La fine è vicina!', 'Ascoltatemi! Ho fatto i conti!', 'Popolo di Porto Vecchio! Ho una data!'],
      predica2: ['Sabato alle nove e un quarto! Il mare si alza di una spanna e poi torna giù! Ci rimarrete male!', 'Un vento verrà da Nord e ci porterà via tutti i cappelli! Prima quelli belli!', 'L\'Apocalisse comincerà dal panettiere! Non dico quale! Ce n\'è uno solo!'],
      folla: ['A che ora, scusi?', 'E sabato non posso, c\'è il matrimonio di mia cugina.', 'L\'altra volta aveva detto giovedì.', 'Si può spostare a dopo cena?', 'Io me lo segno.'],
      chiusa: ['Avete tempo per pentirvi. Poco. Tipo un caffè.', 'Ve l\'ho detto. Poi non venite a lamentarvi da me.', 'Ci vediamo alla fine. Io sarò lì vicino alla fontana.'],
    },
    smemorato: {
      nick: 'Nonno Peppino', chi: n => n.pop.age >= 70,
      fissa: 'Ha più di settant\'anni e la memoria che va e viene. Scambia tutti per qualcun altro, quasi sempre per gente del \'50; racconta la stessa storia ogni volta con un finale diverso. È contento, affettuoso, curioso. Ogni tanto dice una cosa lucidissima che ti gela, poi chiede che giorno è.',
      voce: 'affettuoso, confuso, chiama per nomi sbagliati, storie che cambiano a metà; ogni tanto una frase lucidissima',
      passa: ['Ninetto! Ti credevo morto. Ah, sei un altro. Peccato, Ninetto mi doveva dei soldi.', 'Che giorno è? No, non me lo dire. Voglio la sorpresa.', 'Hai visto mia moglie? Alta così, vestita di blu. Morta nel \'74, ma magari è uscita.', 'Una volta qui era tutto mare. Poi tutto campi. Poi di nuovo mare. Io non ci capisco più niente.', 'Scusi, io abito qui? Mi sembra un bel posto.', 'Ti racconto quella del mulo e del prete. Allora c\'era un prete. Fine.'],
      ritorno: ['Ciao, Ninetto! Ah no, sei quello che non è Ninetto. Ciao lo stesso.', 'Tu mi conosci? Perché io ti conosco, ma non so da dove. Sei della banca?', 'Eccoti. Ti ho tenuto il posto. Non so per cosa.'],
      solo: ['Il pane l\'ho preso. O l\'ho mangiato. Una delle due.', 'Avevo un cane. Oppure ero il cane. No, avevo un cane.', 'Tutti morti, i miei amici. Che maleducati.', 'Torno indietro a vedere se ho chiuso il gas. Da che casa, non lo so.'],
      storia: ['Nel \'52 ho salvato un uomo dal mare.', 'Ti ho mai detto di quando ho conosciuto Coppi?', 'Io una volta ho fatto il pugile.'],
      storia2: ['Era un tonno. Ma era un tonno molto per bene.', 'Gli ho bucato una gomma. Non apposta. Cioè, apposta, ma non a lui.', 'Ho vinto un incontro. Poi ho scoperto che era un matrimonio.'],
      congedo: ['Vabbè, ciao Ninetto.', 'Salutami tua madre. Anche se è mia sorella. Non mi ricordo.', 'Che bello parlare con te. Chi eri?'],
    },
    venditore: {
      nick: 'il Venditore', nickF: 'la Venditrice', chi: n => n.pop.age >= 25 && n.pop.age <= 66,
      fissa: 'Vende cose che non esistono: il silenzio in scatola, ombre usate, buchi da scavare, "il diritto di sedersi su questa panchina", ricordi di altre persone. Fa tutto con la serietà di un rappresentante di aspirapolveri: ha listino, garanzia, rate. Qualcuno compra.',
      voce: 'imbonitore cortese, garanzie e listini per merce inesistente, sconti assurdi; serissimo',
      passa: ['Ombre usate, mille lire. Questa era di un notaio, è ancora come nuova.', 'Le vendo un buco. Lo scava lei, io le do il diritto.', 'Silenzio in scatola. Non la apra qui, si sprecherebbe.', 'Un ricordo d\'infanzia? Ne ho uno di un ragazzo di Ostia. Lo vede il mare? Ecco.', 'Per lei, sconto: compra niente e gliene do il doppio.', 'Garanzia a vita. La sua, non la mia.'],
      ritorno: ['Cliente! Com\'è andato il buco? Profondo?', 'Ah, il signore dell\'ombra. Se la tiene bene, vedo.', 'Ho una novità: l\'eco. Glielo ripeto: l\'eco.'],
      solo: ['Silenzio, silenzio fresco... di giornata...', 'Il diritto di prelazione sul tramonto. Ne ho tre, me ne restano tre.', 'Rate da cinquecento lire per diciotto anni. Il niente non si svaluta.'],
      offre: ['Silenzio in scatola! Cinquecento lire!', 'Ombre di prima mano! Chi le vuole!', 'Il posto in fila, venduto per intero! Si risparmia la fila!'],
      offre2: ['Per lei, signora, la scatola grande. Dentro c\'è più silenzio.', 'Le ombre col cappello costano di più. Si capisce.', 'Questa sedia invisibile è antica. Antichissima. Non l\'ha mai vista nessuno.'],
      venduto: ['Lo apra a casa. E se sente qualcosa, me lo riporti: è difettoso.', 'Ottimo acquisto. È l\'ultimo. Fino a domani.', 'Firmi qui. No, la penna non c\'è. Ma la firma vale.'],
    },
    motivatore: {
      nick: 'il Motivatore', chi: n => n.pop.age >= 28 && n.pop.age <= 58,
      fissa: 'Ex scaricatore di porto, ha letto mezzo libro americano sul successo e da allora fa il motivatore per strada. Crede che la povertà sia una questione di atteggiamento. È povero. Molto motivato.',
      voce: 'entusiasta da imbonitore del successo, frasi da poster motivazionale applicate alla miseria; mai cattivo, solo inarrestabile',
      passa: ['Tu! Sì, tu! Il tuo limite è solo nella tua testa. E nella tessera annonaria.', 'Sveglia alle quattro. Doccia fredda. Tanto l\'acqua calda non c\'è.', 'Non sei povero. Sei un ricco che non ha ancora cominciato.', 'Ogni no è un sì che non ha ancora capito.', 'Fallire è bellissimo. Io ho fallito sei volte. Guarda dove sono: qui. Al freddo. Ma motivato.', 'Il successo è una scelta. La fame anche, ma quella l\'hanno scelta per me.'],
      ritorno: ['Ancora tu! Vedo progressi. Non so dove, ma li vedo.', 'Allora? Hai visualizzato il successo? Io ho visualizzato una stufa. Funziona quasi.', 'Campione! Quanto hai guadagnato da martedì? Niente? Il niente è un inizio!'],
      solo: ['Sono il capitano della mia anima. L\'anima però è in affitto.', 'Respira. Visualizza il successo. Visualizza una stufa.', 'Cinque obiettivi per oggi. Uno: mangiare. Gli altri quattro dopo.', 'Pensa positivo. Pensa positivo. Quel Grigio mi guarda. Pensa positivo.'],
      sfida: ['Tu! Cosa vuoi dalla vita?', 'Fermo! Dimmi il tuo sogno. Subito!', 'Campione! Quanto vali?'],
      sfida2: ['Sbagliato! Devi volere di più! Di più! Anche se non c\'è!', 'Bene! Adesso dillo come se ci credessi. Ancora. Più forte. Ecco, adesso ti guardano tutti.', 'Bellissimo. Io ti vedo. Ti vedo tra cinque anni: ricco. O qui. Più probabile qui.'],
      congedo: ['Vai, campione! Il mondo è tuo! Tranne le cose che hanno già dato agli altri.', 'Prima lezione gratis. La seconda costa mille lire. La terza è la tua vita.', 'Vai! E se fallisci, è perché non ci hai creduto. Non è colpa mia.'],
    },
    complottista: {
      nick: 'il Complottista', chi: n => n.pop.sex !== 'f' && n.pop.age >= 30,
      fissa: 'Vede trame dappertutto, tranne quella vera. Il regime gli sembra una copertura per qualcosa di più grosso: i gabbiani, le gru, il martedì. Sulla Tutela ha quasi sempre torto per i motivi sbagliati, e ogni tanto ragione per caso.',
      voce: 'sottovoce e concitato, «pensaci», «non è un caso», collega cose che non c\'entrano niente; diffidente ma bisognoso di essere ascoltato',
      passa: ['Le gru del porto non sono gru. Pensaci.', 'I gabbiani lavorano per il Ministero. Hai mai visto un gabbiano morto? Ecco.', 'L\'acqua della fontana la cambiano di notte. Con acqua più obbediente.', 'Il Garante non esiste. Sono tre uomini uno sopra l\'altro. Per questo è così alto.', 'Io la tessera non ce l\'ho. Mi tracciano col formaggio.', 'Il pane è finito? Non è un caso. Niente è un caso. Tranne mio cugino, quello è proprio un caso.'],
      ritorno: ['Ti stanno seguendo. No, non girarti. Ecco, ti sei girato. Adesso lo sanno.', 'Ancora tu. Strano. Troppo strano. Chi ti manda?', 'Hai controllato i gabbiani, come ti ho detto? No? Allora sei uno di loro.'],
      solo: ['Il martedì non esiste. L\'hanno messo per far quadrare la settimana.', 'Sette Doveri. Sette giorni. Sette nani. Pensaci.', 'Quel lampione si è acceso quando sono passato. Lo sa.', 'La luna è troppo puntuale. Nessuno è così puntuale se non lavora per qualcuno.'],
      rivela: ['Psst. Tu. Vieni qui. Te lo dico solo una volta.', 'Ascoltami bene, che non ho molto tempo. Mi cercano.', 'Lo sai perché il pane costa così tanto?'],
      rivela2: ['Il mare. Il mare non è vero. È dipinto. Di notte lo arrotolano.', 'Perché il grano lo mangiano i gabbiani. E i gabbiani chi li paga? Esatto.', 'La nave del lunedì non porta niente. È vuota. Fa il giro dell\'isola e torna. Serve per farci aspettare.'],
      congedo: ['Non hai sentito niente. E se lo racconti, nessuno ti crede. È così che funziona.', 'Mangia il formaggio solo il giovedì. Fidati.', 'Ci vediamo. Ma non qui. Qui ci guardano.'],
    },
    polaroid: {
      nick: 'la Polaroid', nickM: 'il Polaroid', chi: n => n.pop.age >= 16 && n.pop.age <= 34,
      fissa: 'Gira con una Polaroid di contrabbando e fotografa sé stessa con tutto: il pane, i Grigi, i funerali, il tramonto. Le foto finiscono in «l\'album», che le sue amiche guardano ogni domenica: ha trentadue seguaci, dal vivo. Vive per far vedere la sua vita, e la sua vita è fare le foto.',
      voce: 'svelta, entusiasta, parla di «pubblico», «album» e «vita vera», chiede a tutti di mettersi in posa; superficiale e affettuosa',
      passa: ['Fermo! Non muoverti, sei perfetto per lo sfondo. Ecco. Grazie, puoi andare.', 'Questa è per l\'album. Le mie amiche lo guardano ogni domenica. Trentadue persone. Dal vivo.', 'Faccio vedere la vita vera. Aspetta, rifacciamola: la vita vera era venuta storta.', 'Sorridi per l\'album. No, più vero. Più vero di così.', 'Mi fai una foto col Grigio? Di spalle, così non lo sa.', 'Oggi sono triste. Guarda che bella foto triste.'],
      ritorno: ['Ancora tu! Sei venuto benissimo l\'altra volta. Piccolissimo, in fondo, ma benissimo.', 'Ti ho messo nell\'album! Pagina quattro. Le mie amiche chiedono chi sei. Ho detto: nessuno.', 'Facciamone un\'altra. Quella di prima ha avuto troppo successo: ventinove su trentadue.'],
      solo: ['Il tramonto non è venuto bene. Domani lo rifaccio.', 'Polaroid col pane. Polaroid col pane finito. Si chiama «prima e dopo».', 'Ultima pellicola. La tengo per una cosa importante. Tipo me.', 'Al funerale di zio Tore ho fatto la foto più bella della mia vita. Lui un po\' meno.'],
      foto: ['Fermi tutti! Foto per l\'album!', 'Tu! Mettiti lì. No, lì. Un po\' più a destra. Ancora. Fuori.', 'Vieni, facciamo una foto insieme! Io in primo piano, tu dietro.'],
      foto2: ['Sorridi! No. Sorridi meglio. Pensa a una cosa bella. Non quella.', 'Fai finta di conoscermi da sempre. Così. Ecco: siamo migliori amici. Per l\'album.', 'Guarda lontano, come uno che pensa. Più pensieroso. Più. Basta, sembri malato.'],
      congedo: ['Perfetta! Cioè: io sono perfetta. Tu ci sei.', 'Grazie! Se domenica piace, sei famoso. Se non piace, non eri tu.', 'Bellissima. Me la tengo. Tu no, tu puoi andare.'],
    },
  };
  const KEYS = Object.keys(MATTI);

  // ================= LE MANIE (come la sedia con le rotelle) =================
  // gente qualunque che fa una cosa sola, sempre, per tutta la città: legge il giornale camminando, porta un cero a mezzogiorno,
  // spinge una carriola vuota. Nessuno lo spiega, neanche loro: se gli passi accanto dicono una cosa normale. Si vede soltanto
  // (anim_vita.js legge n.pop.mania: upper è la posa delle braccia; ogni = [periodo, durata] in secondi se la fa a tratti).
  const MANIE = {
    giornale: { quanti: 2, upper: 'legge', chi: n => n.pop.age >= 30, passa: ['Mm.', 'Buongiorno.', 'Permesso.', 'Scusi.'] },
    cornetta: { quanti: 1, upper: 'telefona', chi: n => n.pop.age >= 20, passa: ['Sì. Sì. No. Sì.', 'Aspetta, c\'è uno.', 'Sì, sono qui.', 'Ti richiamo.'] },
    cero: { quanti: 1, upper: 'cero', chi: n => n.pop.age >= 35, passa: ['Buongiorno.', 'Non soffi, per favore.', 'Buonasera.'] },
    carriola: { quanti: 1, upper: 'carriola', chi: n => n.pop.sex !== 'f' && n.pop.age >= 25 && n.pop.age <= 70, passa: ['Permesso.', 'Permesso, permesso.', 'Buongiorno.'] },
    cassa: { quanti: 1, upper: 'porta', chi: n => n.pop.age >= 18 && n.pop.age <= 60, passa: ['Permesso.', 'Non è pesante.', 'Scusi.'] },
    saluta: { quanti: 1, upper: 'saluta', ogni: [7, 2.5], chi: n => n.pop.age >= 12, passa: ['Ciao!', 'Ciao ciao.', 'Ciao! Ciao.'] },
    orologio: { quanti: 1, upper: 'orologio', ogni: [6, 1.8], chi: n => n.pop.age >= 30, passa: ['Ancora niente.', 'Le quattro e venti.', 'Mm. No.'] },
  };
  // e chi va in sedia da ufficio (anim_vita.js, n.rotelle) quando gli passi accanto
  const ROTELLE = ['Permesso.', 'Buongiorno.', 'Scusi, mi sposto.', 'Sto bene così, grazie.', 'Attento ai piedi.'];

  // ================= I FRAMMENTI SENTITI PASSANDO =================
  // due, tre battute fra A e B, senza contesto: tu passi, loro sono a metà della loro vita
  const FRAM = [
    ['Mia suocera è tornata.', 'Da dove?', 'Non lo dice. Ha portato un\'anatra.'],
    ['Trent\'anni di matrimonio, e stamattina scopro che russa in francese.', 'E che dice?', 'Non lo so, io il francese non lo so.'],
    ['Ho sognato che ero una sedia.', 'E allora?', 'Ci si sedeva tuo cugino. Non gli parlo più.'],
    ['Non è che non voglio sposarti. È che quel giorno ho un impegno.', 'Quale giorno?', 'Qualsiasi.'],
    ['Il dentista dice che ho i denti di un uomo di novant\'anni.', 'E tu?', 'Gli ho detto di ridarglieli.'],
    ['Allora, il cane l\'ha mangiato.', 'Il compito?', 'Mio zio. Il cappello di mio zio. Ma lo zio ci teneva come a un figlio.'],
    ['Ha detto che mi ama.', 'E tu?', 'Gli ho detto grazie. Poi sono scappata. Poi sono tornata a dire che il grazie era sincero.'],
    ['Io a mio fratello non presto più niente.', 'Cosa gli hai prestato?', 'La moglie. Per il matrimonio di un cugino. Me l\'ha ridata diversa.'],
    ['Lo sai che il pesce rosso di Ines ha compiuto ventidue anni?', 'Ventidue?', 'Secondo me ne ha cambiati sette. Ma lei festeggia.'],
    ['L\'avvocato ha detto: o la casa o il gatto.', 'E tu?', 'Ho tenuto il gatto. Adesso viviamo dal gatto.'],
    ['Allora ho detto: se il cane parla, il cane paga l\'affitto.', 'E lui?', 'Il padrone di casa ha pagato. Il cane no.'],
    ['Quindi la zia Pina è morta o no?', 'Dipende.', 'Da cosa?', 'Dal testamento.'],
    ['Ho trovato il mio nome sul giornale.', 'Per cosa?', 'Non lo so, era un altro con il mio nome. Ma mi sono sentito importante.'],
    ['Lui ti piace?', 'Ha un bel modo di aprire le porte.', 'E poi?', 'Poi basta. Ma le apre benissimo.'],
    ['Ho preso la patente!', 'Dopo quante volte?', 'Non l\'ho fatto l\'esame. L\'ho presa proprio. Era sul tavolo.'],
    ['E il bambino?', 'Dice che vuole fare il prete.', 'Il prete?', 'Per le scarpe. Gli piacciono le scarpe dei preti.'],
    ['Ti giuro che il frigorifero di notte fa un rumore come di uno che pensa.', 'A cosa?', 'A me. Pensa a me. Lo sento.'],
    ['Me l\'hai restituito il martello?', 'Quale martello?', 'Quello che ti ho prestato nel \'71.', 'Ah. Sì. No.'],
    ['Allora ci sei a cena domenica?', 'Chi c\'è?', 'Mamma, papà, e l\'uomo che dorme in cantina.', 'Chi è?', 'Non lo sappiamo. Ma è educato.'],
    ['Ho deciso: da domani cambio vita.', 'Come?', 'Mi alzo dall\'altro lato del letto.'],
    ['Mi ha lasciato per un geometra.', 'Che geometra?', 'Il mio. Quello della casa. Adesso non so più quanto è grande il bagno.'],
    ['Mio nonno è diventato vegetariano.', 'A novant\'anni?', 'Dice che le mucche non gli hanno fatto niente. Io dico che non le ha mai conosciute.'],
    ['Quanto ti ha chiesto?', 'Cinquemila.', 'Per cosa?', 'Per smettere di cantare. Gliele ho date. Ha smesso. È stato bellissimo.'],
    ['Ma tua sorella con il pompiere?', 'Lasciati.', 'Peccato.', 'No, lei è contenta. È il pompiere che non si dà pace. Dorme sotto casa con la scala.'],
    ['Sai chi ho visto al mercato?', 'Chi?', 'Me. Da giovane. Era un ragazzo identico. Gli ho detto di non sposarsi.'],
    ['Ho chiesto un aumento.', 'E?', 'Mi hanno dato una sedia. Più alta. Dicono che è un aumento.'],
    ['Lo vedi quello lì?', 'Sì.', 'Non guardarlo.', 'Perché?', 'Non lo so, me l\'ha detto mia madre nel \'64 e non ho mai smesso.'],
    ['Lo hai rimesso nel freezer?', 'Chi?', 'Cosa. Ho detto cosa. Il pollo. Ho detto cosa.'],
    ['Io la notte conto le pecore.', 'Funziona?', 'No. Me ne manca sempre una. Non dormo per cercarla.'],
    ['Mio marito ha detto che va a comprare le sigarette.', 'Quando?', 'Nel \'79.', 'E?', 'Ogni Natale manda una cartolina. Dice che c\'è la fila.'],
    ['Ho fatto la dieta del pompelmo.', 'E?', 'Ho perso tre chili e un amico. Lui odiava il pompelmo.'],
    ['Dicono che il nuovo prete balla.', 'Balla?', 'Di notte, in sacrestia. Da solo. Benissimo, dicono.'],
    ['Me lo dai un consiglio?', 'Dimmi.', 'Se uno ti regala un pappagallo che dice il tuo nome, cosa fai?', 'Dipende da come lo dice.'],
    ['Ho chiamato il bambino come il Garante.', 'Sei matto?', 'Così quando lo sgrido mi sento meglio.'],
    ['Allora gliel\'hai detto?', 'No.', 'Perché?', 'Era di spalle. Di spalle non si può.'],
    ['Lei mi piace, ma ha un difetto.', 'Quale?', 'Ha un marito.', 'Grave?', 'Grosso.'],
    ['Ti ricordi Tonio che diceva di essere stato in America?', 'Sì.', 'Non era vero.', 'Lo sapevo.', 'Era stato in Belgio. Che è peggio, ma è vero.'],
    ['Tu ci credi ai fantasmi?', 'No.', 'Neanche io. Ma la nonna, da morta, mi sposta ancora le ciabatte.'],
    ['Il mio pappagallo ha imparato a fare il telefono.', 'Bello!', 'No. Tutta la notte mi alzo a rispondere. È lui.'],
    ['Ma tu cosa fai di lavoro, alla fine?', 'Te l\'ho detto cento volte.', 'Lo so. Ma non ho mai capito.', 'Neanche io. Ma pagano il venerdì.'],
    ['Lei è vedova?', 'Quasi.', 'Come quasi?', 'Lui sta benissimo. Io mi porto avanti.'],
    ['L\'oroscopo dice che oggi incontro l\'amore.', 'Sono le sette di sera.', 'Ancora cinque ore. Non mi muovo da qui.'],
    // [attualita] i temi di oggi, nel 1986 dell'isola
    ['Mio figlio ha lasciato la miniera per fare il motivatore.', 'E chi motiva?', 'Quelli della miniera. A tornare in miniera.'],
    ['Ho fatto il corso di respirazione della Tutela.', 'E?', 'Adesso respiro meno. Dicono che è più efficiente.'],
    ['Mi sono iscritto all\'agenzia matrimoniale.', 'E?', 'Mi hanno dato una scheda: compatibile al novantadue per cento. Con mia moglie. Non lo sapevano.'],
    ['Il geometra dice che la casa adesso vale il doppio.', 'Bene!', 'Male. Non posso più permettermi di abitarci.'],
    ['L\'hai letto il contratto della tessera?', 'Chi lo legge?', 'Io. Pagina quaranta: cedo l\'anima in comodato d\'uso. Rinnovo automatico.'],
    ['Ho dato cinque stelle al dentista.', 'Era bravo?', 'No. Ma aveva ancora la pinza in mano.'],
    ['Mio nipote lavora da casa.', 'E che fa?', 'Non lo sa nessuno. Neanche lui. Però è sempre stanchissimo.'],
    ['Hai sentito? Il Ministero ha inventato la fila verticale.', 'Come verticale?', 'Uno sopra l\'altro. Si risparmia piazza.'],
    ['La miniera adesso è ecologica.', 'Davvero?', 'Hanno dipinto il carbone di verde.'],
    ['Ho trovato lavoro al porto. A chiamata.', 'Ti chiamano spesso?', 'No. Ma devo stare vicino al telefono. Che non ho. Quindi sto vicino a quello del bar.'],
    ['Mia figlia dice che non è triste, è in una fase.', 'Da quando?', 'Dal \'79.'],
    ['Ho messo tutto nella Lira Serena.', 'Cos\'è?', 'Una moneta. Vale quanto ci credi.', 'E quanto ci credi?', 'Ieri tantissimo. Oggi devo parlare con mia moglie.'],
    ['Il medico mi ha detto: meno stress.', 'E tu?', 'Ho smesso di andare dal medico.'],
    ['Mio cognato ha aperto una bottega che vende niente.', 'Niente?', 'L\'esperienza di entrare. C\'è la fila.'],
    ['Il gabinetto della stazione adesso è in abbonamento.', 'E se non sei abbonato?', 'C\'è la prova gratuita. Dura poco. Bisogna essere veloci.'],
    ['Ho fatto il ritiro spirituale al Monte Scuro.', 'Com\'era?', 'Tre giorni in silenzio. Mia moglie dice che è il periodo più bello del matrimonio.'],
    ['L\'isola è rotonda. Lo dice il Garante.', 'E allora?', 'E allora è piatta. Lui mente sempre. Fai due conti.'],
    ['Un turista mi ha fotografato la casa.', 'E?', 'Adesso è sulla cartolina. Non riesco più a entrare: c\'è la fila per vederla.'],
    ['Ho chiesto al Calcolatore del Ministero se sono felice.', 'E?', 'Ha detto di sì. Mi sono tolto un pensiero.'],
    ['Mi hanno messo in cassa integrazione emotiva.', 'Cioè?', 'Posso essere triste solo il mercoledì.'],
    ['Ce l\'hai un hobby?', 'La fila.', 'Per lavoro?', 'No, per piacere. Il lavoro è un\'altra fila.'],
    ['Il nuovo capo dice che siamo una famiglia.', 'Bello.', 'Quindi non ci paga. In famiglia non ci si paga.'],
    ['Hai visto il palazzo di vetro nuovo?', 'Cosa c\'è dentro?', 'Niente. Per far vedere che non c\'è niente. Si chiama trasparenza.'],
    ['Ho preso un cane contro la solitudine.', 'E?', 'Adesso è solo il cane. Io lavoro sedici ore.'],
    ['Mia madre a ottantasei anni ha scoperto lo yoga.', 'Brava!', 'Si è incastrata martedì. La sblocchiamo a turno.'],
    ['Mi hanno fatto le analisi del sangue.', 'E?', 'Ho il sangue di un consumatore medio. Mi hanno dato un buono sconto.'],
    ['Tuo nipote cosa fa all\'Ufficio Preferenze?', 'Indovina cosa vuoi prima che lo vuoi.', 'E ci prende?', 'Con me sì. Ha detto che voglio andarmene. Ma era lunedì, lo vogliono tutti.'],
    ['Hanno chiuso il forno di Lella.', 'Perché?', 'Non era abbastanza «esperienza». Adesso c\'è un forno che fa vedere come si faceva il pane. Senza pane.'],
    ['Il predicatore della Calma dice che la povertà è una scelta.', 'E tu?', 'Gli ho chiesto chi l\'ha scelta per me. Mi ha dato un opuscolo. A pagamento.'],
    ['Ho fatto un colloquio di lavoro.', 'Com\'è andato?', 'Mi hanno chiesto dove mi vedo tra cinque anni. Ho detto: vivo. Dicono che non ho ambizione.'],
    ['Mi è arrivata una lettera dal Banco.', 'Brutte notizie?', 'Mi hanno assegnato dei debiti nuovi. Come premio fedeltà.'],
    ['Mia moglie fa la dieta del Garante.', 'Cioè?', 'Mangia solo mentre parla lui. Venti minuti al giorno. È dimagrita tantissimo.'],
    ['Lo vedi quello? Si allena per sembrare felice.', 'E come va?', 'La bocca ce l\'ha già. Gli occhi ancora no.'],
    ['Devo fare la denuncia dei redditi.', 'Quanto hai guadagnato?', 'Niente.', 'E quanto paghi?', 'Il doppio.'],
    ['Mio figlio l\'ha licenziato una macchina.', 'Una macchina?', 'La gru nuova del porto. Poi gli ha stretto la mano. Con la pinza.'],
    ['Ho smesso di fumare.', 'Bravo!', 'Adesso le mastico. Dicono che fa meno male. Non è vero, ma passa il tempo.'],
    ['Mio nipote vuole diventare famoso.', 'Per fare cosa?', 'Niente. Solo famoso. Dice che la cosa da fare viene dopo.'],
    ['Il Calcolatore ha deciso i turni della miniera.', 'Com\'è venuto?', 'Io lavoro il giorno trentuno di ogni mese. Anche febbraio.'],
    ['Al Lido hanno messo il mare a pagamento.', 'Tutto il mare?', 'Fino alla boa. Dopo la boa è gratis, ma lì sparano.'],
    ['Mi hanno rubato la bici.', 'Hai fatto denuncia?', 'Sì. Adesso mi fanno pagare la custodia della denuncia.'],
  ];
  // i ragazzi (tutti e due sotto i 27 anni) parlano fra loro: niente battuta finale, la scena finisce un attimo prima.
  // «Fottiti» fra amici è affetto, non insulto: nessuno qui è cattivo davvero.
  const FRAM_G = [
    ['Fra, c\'hai da accendere?', 'No.', 'Neanche io. Stiamo qua.'],
    ['Hai da accendere?', 'Sì.', 'Ok. Era per sapere.'],
    ['Oi. Mi giri una siga?', 'Ho solo il drum.', 'Va bene il drum.', 'Non ho le cartine.'],
    ['C\'ho un drum, una cartina e un filtro.', 'E?', 'E basta. Volevo che lo sapessi.'],
    ['Zio, mi giri una siga?', 'È l\'ultima.', 'Allora no. Tienila.', 'Grazie.', 'Me la giri però?'],
    ['Fra, ma il drum è tabacco o è una marca?', 'Tabacco.', 'E il tabacco è una marca?', 'Fra. Non mi fare questo.'],
    ['Oi, ce l\'hai un accendino?', 'Ce l\'ho blu.', 'Va bene blu.'],
    ['Bella fra.', 'Bella.', 'Bella.'],
    ['Bella zio, tutto a posto?', 'Mi sono rotto un dito.', 'Bella.', 'Sì.'],
    ['Fottiti.', 'Perché?', 'Niente, mi andava. Come stai?', 'Bene, fra.'],
    ['Fottiti, te e il tuo motorino.', 'Che ha il mio motorino?', 'Niente. È bellissimo.'],
    ['Zio, stasera che si fa?', 'Qua.', 'Ancora qua?', 'Qua è bello.', 'Vero.'],
    ['Mi presti cinquemila?', 'Per cosa?', 'Per averle.'],
    ['Oi, mia nonna ti saluta.', 'Non la conosco.', 'Lei dice di sì.'],
    ['Fra, ho fatto un sogno, c\'eri tu.', 'E che facevo?', 'Stavi lì. Avevi un drum.', 'E poi?', 'Era tutto il sogno.'],
    ['Oi, ma quello là è tuo padre?', 'Sì.', 'Che fa?', 'Non lo so. Lo fa da stamattina.'],
    ['Zio, ho visto un cavallo sul motorino.', 'Guidava lui?', 'No, dietro. Col casco.'],
    ['Dicono che hai baciato la Debora.', 'Chi è la Debora?', 'Non lo so. L\'ho sentito.'],
    ['Fra, tu da grande che fai?', 'Sono già grande.', 'E quindi che fai?', 'Questo.'],
    ['Oi, chi ha preso la mia felpa?', 'Ce l\'hai addosso.', 'Ah.', '...', 'È calda.'],
    ['Zio, ti devo dire una cosa seria.', 'Dimmi.', 'No, niente. Mi è passata.', 'Bella.'],
    ['Fra, Matteo dice che sei uno sfigato.', 'E tu?', 'Gli ho detto di sì. Con affetto.'],
    ['Oi. Oi. Fra.', 'Che c\'è?', 'Niente. Sei girato.'],
    ['Zio, quanto manca alle otto?', 'Che c\'è alle otto?', 'Niente. Volevo sapere quanto manca.'],
    ['Mi sono tagliato i capelli da solo.', 'Si vede.', 'Grazie fra.'],
    ['Andiamo al mare?', 'È dicembre.', 'Lo so. Andiamo a guardarlo.', 'Ok.'],
  ];
  // quando gli passi accanto, un ragazzo ogni tanto ti scrocca (o ci prova)
  const SCROCCO = ['Oi fra, c\'hai da accendere?', 'Zio, mi giri una siga? No? Bella lo stesso.', 'Scusa, hai un drum? ...Ok. Bella.', 'Fra. Fra. No, niente. Bella.',
    'Oi! ...Ah, pensavo fossi Davide.', 'Hai da accendere? Va be\', ciao zio.', 'Zio, che ore sono? Non importa. Bella.', 'Bel giubbotto, fra. Davvero. Fottiti.',
    'Oi, hai una cartina? Anche usata.', 'Fra, sai dov\'è la Debora? Neanche io.'];

  // ================= LE VOCI: due che parlano di una cosa successa davvero =================
  // Il motore fa correre le voci (game.js, gossip); qui la voce diventa una conversazione: chi la porta, chi risponde secondo quello
  // che sa (lo sapeva già, da chi, o no), e una chiusa che dipende da quanto è grave. Chi la sente per la prima volta adesso la sa.
  const GRAVI = { spari: 1, ferimento: 1, omicidio: 1, esplosione: 1, molotov: 1 }, FURTI = { scippo: 1, rapina: 1, furto_vespa: 1, furto_auto: 1 };
  // «alla Calata», «al Bar Sirena», «all'Osteria», «a casa Rizzo»: la preposizione giusta davanti al nome del posto
  function aLuogo(pl) {
    const w = pl.split(' ')[0], l = w.toLowerCase();
    if (l === 'casa') return 'a casa' + pl.slice(4);
    if (/^[aeiouh]/i.test(w)) return 'all\'' + pl;
    return (/a$/.test(l) && !/^(cinema|sistema)$/.test(l) ? 'alla ' : 'al ') + pl;
  }
  function quando(st, t) { const h = (st.t - t) / 60; return h < 1 ? 'Neanche un\'ora fa.' : h < 4 ? 'Stamattina. Cioè, qualche ora fa.' : h < 20 ? 'Ieri sera, mi pare.' : 'L\'altro giorno.'; }
  function voce(st, a, b) {
    const m = a.mem && a.mem.filter(m => m.conf >= .35 && !m.silenced && !m.liar && (G.NEG[m.type] || m.type === 'lavoro') && st.t - m.t < 60 * 30 && m.actor !== a.id)
      .sort((x, y) => G.weight(st, y) - G.weight(st, x))[0];
    if (!m) return null;
    const g = giovane(a) && giovane(b), apri = g ? pick(['Fra, ', 'Zio, ', 'Oi, ']) : pick(['Oh, ', '', 'Senti, ']);
    const chi = m.actor === 'player' ? G.PLAYER_NAME : m.actor === 'ignoto' ? null : G.nameOf(st, m.actor), v = G.verbPast(st, m, a.id);
    const v2 = m.place ? v.replace(' in mezzo alla strada', ' in strada,') : v, fatto = chi ? `${chi} ${v2}` : v2.replace(/^ha /, 'hanno ').replace(/^mi ha /, 'mi hanno ');
    const k = b.mem && b.mem.find(x => x.eventId === m.eventId);
    const dove = m.place ? ` ${aLuogo(m.place)}` : '', su = t => t[0].toUpperCase() + t.slice(1);
    const L = [su(m.source === 'visto' ? `${apri}l'ho visto io: ${fatto}${dove}.` : `${apri}hai sentito? ${su(fatto)}${dove}.`)];
    if (k) L.push(k.source === 'visto' ? pick(['Sì, ero lì. Ho visto tutto.', 'Lo so, c\'ero anch\'io.']) : pick([`Sì, me l'ha detto ${(k.via && k.via[k.via.length - 1]) || 'mia cognata'}.`, 'Sì, lo sanno tutti ormai.', g ? 'Sì fra, lo so.' : 'Sì, lo so.']));
    else { L.push(pick(['Davvero? Quando?', 'Ma dai. Quando?', g ? 'Seria? Quando?' : 'No. Quando?'])); L.push(quando(st, m.t)); }
    L.push(m.type === 'lavoro' ? pick(['Bravo. Non me l\'aspettavo.', 'Meno male che c\'è ancora qualcuno così.'])
      : GRAVI[m.type] ? pick(g ? ['Fra, stasera io sto a casa.', 'Raga, qua si mette male.', 'Adesso arrivano i Grigi, vedrai.'] : ['Io stasera non esco.', 'Ci mancava solo questa.', 'Adesso arrivano i Grigi, vedrai.', 'Mia madre non dorme più.'])
      : FURTI[m.type] ? pick(['Chiudi bene la porta, stanotte.', 'Non c\'è più rispetto.', g ? 'Che sfiga, fra.' : 'Poi dicono che è un posto tranquillo.'])
      : pick(['Che schifo.', 'Uno non può più uscire tranquillo.', 'Speriamo che lo prendano.']));
    if (!k) G.addMemory(st, b, { eventId: m.eventId, type: m.type, trueType: m.trueType, actor: m.actor, target: m.target, owner: m.owner, place: m.place, shop: m.shop, t: m.t, conf: m.conf * .8, source: 'voce', via: (m.via || []).concat([a.first]), distorted: m.distorted, framedBy: m.framedBy });
    return L;
  }

  // ================= STATO =================
  const S = st => st.__matti || (st.__matti = { ready: false, ids: {}, cd: 0, fram: 0, deck: [], deckG: [], q: [], incontri: {}, scr: 0, manie: [] });
  const isMatto = n => !!(n && n.pop && n.pop.matto);
  const giovane = n => n.pop && n.pop.age <= CFG.giovane;
  // [coerenza] chi ha paura di te o ce l'ha con te (Game.tono), o ti ha appena detto cosa hai fatto, non ti fa battute: tace
  const freddo = n => !!((G.tono && G.tono(st0, n)) || (st0 && st0.clock - (n.__tonoT || -1e9) < 600));
  let st0 = null;
  const alive = n => n && !n.dead;
  function ok(st, n) {   // può parlare per conto suo (né dentro, né in una scena, né in una rissa)
    return alive(n) && !n.inside && !n.room && !n.__ev && !n.cop && !n.faction && !n.aggro && !(n.stun > 0) && !n.inVeh && !(n.panic > 0) && !(n.jailedUntil > st.t) && n.pop && n.pop.near !== false && (!n.action || n.action.name === 'routine');
  }
  // all'avvio: uno vicino a casa di Nino (così lo si incontra davvero), gli altri sparsi per la città
  function choose(st) {
    const M = S(st), p = st.player, used = new Set(), homes = [];
    const pool = st.npcs.filter(n => n.pop && !n.dead && !n.cop && !n.faction && !n.military && !CAST.has(n.id) && !n.pop.writer && !n.pop.giro && n.pop.homeT);
    KEYS.forEach((k, i) => {
      const D = MATTI[k]; let c = pool.filter(n => !used.has(n) && D.chi(n));
      if (!c.length) return;
      const jobless = c.filter(n => !n.pop.job); if (jobless.length >= 2) c = jobless;   // chi non lavora gira di più
      const h = n => n.pop.homeT;
      const score = i === 0 ? (n => -hyp(h(n).x - p.x, h(n).y - p.y)) : (n => Math.min(...homes.map(q => hyp(h(n).x - q.x, h(n).y - q.y)), 400) + rnd() * 30);
      c.sort((a, b) => score(b) - score(a)); const n = c[0];
      used.add(n); homes.push(h(n)); n.pop.matto = k; M.ids[k] = n.id; n.nick = (n.pop.sex === 'f' && D.nickF) || (n.pop.sex !== 'f' && D.nickM) || D.nick;
      card(st, n, D);
    });
    for (const k in MANIE) {   // le manie: fra chi resta, sparsi a caso
      const D = MANIE[k], c = pool.filter(n => !used.has(n) && !n.pop.matto && D.chi(n)).sort(() => rnd() - .5);
      c.slice(0, D.quanti).forEach(n => { used.add(n); n.pop.mania = k; M.manie.push(n.id); });
    }
    M.ready = true;
  }
  // la scheda che legge la chat: la voce e la fissazione vengono prima della biografia
  function card(st, n, D) {
    const R = typeof Risacca !== 'undefined' ? Risacca : null; if (!R || !R.CARDS) return;
    const c0 = R.CARDS[n.id] || {}, bio0 = Object.getOwnPropertyDescriptor(c0, 'bio');
    const c = Object.assign({}, c0); delete c.bio;
    c.voice = D.voce;
    Object.defineProperty(c, 'bio', { enumerable: true, get: () => `Per tutti è ${n.nick}. ${D.fissa} ${bio0 ? (bio0.get ? bio0.get() : bio0.value) || '' : ''}`.trim() });
    R.CARDS[n.id] = c;
  }
  const scheda = n => { const D = n && n.pop && MATTI[n.pop.matto]; return D ? { soprannome: n.nick, fissazione: D.fissa, voce: D.voce } : undefined; };
  const linea = (n, k) => { const D = n && n.pop && MATTI[n.pop.matto]; return D && D[k] ? pick(D[k]) : null; };

  // ================= IL PASSO =================
  function step(st, dt) {
    const M = S(st), p = st.player; st0 = st;
    if (!M.ready) { if (st.pop && st.npcs && st.npcs.length && st.clock > 2) choose(st); return; }
    // le battute in coda (i frammenti a due voci): ognuno parla al suo turno, se è ancora lì
    if (M.q.length) { const now = st.clock; while (M.q.length && M.q[0].at <= now) { const b = M.q.shift(); const n = G.byId(st, b.id); if (ok(st, n) && hyp(n.x - p.x, n.y - p.y) < 20) G.say(st, n, b.text, 3.4); else M.q = M.q.filter(x => x.g !== b.g); } }
    if (p.indoor || p.vehicle || p.lv || st.chase || st.over) return;
    if ((st.__mtT = (st.__mtT || 0) + dt) < .5) return; st.__mtT = 0;   // due volte al secondo basta
    // i matti: ti parlano quando passi
    if (st.clock > M.cd) for (const k of KEYS) {
      const n = G.byId(st, M.ids[k]); if (!ok(st, n) || (n.__mtCd || 0) > st.clock) continue;
      const d = hyp(n.x - p.x, n.y - p.y);
      let line = null;
      if (freddo(n)) continue;
      if (d < CFG.passa) { const met = M.incontri[k] || 0; line = linea(n, met > 0 && rnd() < .55 ? 'ritorno' : 'passa'); M.incontri[k] = met + 1; if (G.HOOKS && n.face !== undefined) n.face = Math.atan2(p.y - n.y, p.x - n.x); }
      else if (d > CFG.solo[0] && d < CFG.solo[1] && rnd() < .08) line = linea(n, 'solo');
      if (!line) continue;
      G.say(st, n, line, 4); n.__mtCd = st.clock + CFG.cdMatto; M.cd = st.clock + CFG.cdTutti;
      if (typeof Popolo !== 'undefined' && Popolo.note && d < CFG.passa && M.incontri[k] === 1) try { Popolo.note(st, n, 'ha parlato con lo straniero, che lo ha ascoltato', 'info', { w: .2, tag: 'giocatore', who: 'player' }); } catch (e) { }
      break;
    }
    // le manie e la sedia con le rotelle: una frase normale quando gli passi accanto, poi più niente per un po'
    if (st.clock > M.cd) for (const n of st.npcs) {
      const D = n.pop && MANIE[n.pop.mania], L = D ? D.passa : n.rotelle ? ROTELLE : null;
      if (!L || (n.__mtCd || 0) > st.clock || freddo(n) || !ok(st, n) && !(n.rotelle && alive(n) && !n.__ev && !n.inside) || hyp(n.x - p.x, n.y - p.y) > 4) continue;
      G.say(st, n, pick(L), 3); n.__mtCd = st.clock + 90; M.cd = st.clock + CFG.cdTutti; break;
    }
    // i ragazzi: uno che ti passa accanto ti chiede da accendere (una volta a testa, ogni un paio di minuti al massimo)
    if (st.clock > M.scr && st.clock > M.cd) {
      const n = st.npcs.find(k => giovane(k) && !k.__scr && !isMatto(k) && !freddo(k) && hyp(k.x - p.x, k.y - p.y) < CFG.scroccoR && ok(st, k));
      if (n && rnd() < .25) { n.__scr = 1; n.face = Math.atan2(p.y - n.y, p.x - n.x); G.say(st, n, pick(SCROCCO), 3.6); M.scr = st.clock + CFG.scrocco[0] + rnd() * (CFG.scrocco[1] - CFG.scrocco[0]); M.cd = st.clock + CFG.cdTutti; }
    }
    // i frammenti: due che parlano lì vicino, a metà della loro storia
    if (st.clock < M.fram || M.q.length) return;
    M.fram = st.clock + CFG.fram[0] + rnd() * (CFG.fram[1] - CFG.fram[0]);
    const near = st.npcs.filter(n => { const d = hyp(n.x - p.x, n.y - p.y); return d > CFG.framR[0] && d < CFG.framR[1] && ok(st, n) && !isMatto(n); });
    for (const a of near) {
      const b = near.find(k => k !== a && hyp(k.x - a.x, k.y - a.y) < CFG.coppia); if (!b) continue;
      const G2 = giovane(a) && giovane(b), L = G2 ? FRAM_G : FRAM, dk = G2 ? 'deckG' : 'deck';   // due ragazzi: il loro mazzo
      // prima le cose successe davvero (una voce fresca), poi i pezzi di vita
      let F = null, x = a, y = b;
      if (rnd() < CFG.voce) { F = voce(st, a, b); if (!F && (F = voce(st, b, a))) { x = b; y = a; } }   // la porta chi la sa
      if (!F) { if (!M[dk].length) M[dk] = L.map((_, i) => i).sort(() => rnd() - .5); F = L[M[dk].pop()]; }
      const g = st.clock;
      F.forEach((text, i) => M.q.push({ id: (i % 2 ? y : x).id, text, at: st.clock + i * CFG.gap, g }));
      a.face = Math.atan2(b.y - a.y, b.x - a.x); b.face = Math.atan2(a.y - b.y, a.x - b.x);
      return;
    }
  }
  { const s0 = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (s0) s0(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Matti]', e); } } }; }

  // ================= LE SCENE STRANE (per eventi.js) =================
  // {matto:'a', k} dice la battuta del matto di quel ruolo; se il ruolo è un vecchio qualunque (nessun matto vicino), una delle
  // battute di riserva. Le scene col giocatore (player: true) vengono a cercarti, di rado (una ogni 10 minuti, decide eventi.js).
  const SAY = (r, ...l) => ({ say: r, l });
  const ML = (r, k, riserva, w) => ({ fn: (st, sc) => { const n = sc.roles[r], E = EV(); if (!n || n.dead || !E) return; const line = linea(n, k) || pick(riserva); E._.sayEv(st, n, line.replace(/\{([a-z]+)\}/g, (_, q) => (sc.roles[q] && (sc.roles[q].first || sc.roles[q].name)) || q), 3.6); }, w: w !== undefined ? w : 3 });
  const SCENE = [
    // --- i matti ---
    { id: 'matto_generale', w: 1, when: 'day', roles: [{ id: 'a', f: 'matto|old' }, { id: 'b', near: 'a', f: 'young', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.5, d: 1.3, t: 16 }, { look: 'b', at: 'a' }, { pose: 'a', p: 'indica_su' },
      ML('a', 'ordine', ['Tu! Sull\'attenti!', 'Recluta! Fermo lì!']), SAY('b', 'Io? Sto andando a lavorare.', 'Ma ci conosciamo?', 'Signore, ho fretta.'),
      ML('a', 'ordine2', ['Il lavoro è un\'invenzione del nemico. Attenti!', 'Riposo. Attenti. Riposo.']), { pose: 'b', p: 'saluta_su' },
      SAY('b', 'Va bene... signorsì.', 'Agli ordini, Generale.', 'Signorsì. Posso andare a pisciare?'), { pose: 'a', p: 'saluta_su' },
      ML('a', 'congedo', ['Bravo. Ti promuovo caporale.', 'Congedato.']), { pose: 'a' }, { pose: 'b' }, { flee: 'b', from: 'a', sp: 1.6 }, { wait: 2 }] },
    { id: 'matto_contessa', w: 1, when: 'day', roles: [{ id: 'a', f: 'matto|old' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.2, d: 1.3, t: 18 }, { look: 'b', at: 'a' },
      ML('a', 'ordine', ['Giovanotto, la borsa.', 'Mi regga l\'ombrello.']), SAY('b', 'Prego?', 'Signora, io non lavoro per lei.', 'Ma quale ombrello? Non piove.'),
      { pose: 'b', p: 'porta_su' }, { follow: 'b', who: 'a', sp: 1.2, d: 1.4 }, { wander: 'a', r: 4, sp: .8 }, { wait: 3 },
      ML('a', 'ordine2', ['Più dritto. Lei cammina come un notaio.', 'Non così vicino.']), SAY('b', 'Ma come ci sono finito qui...', 'Mia madre lo deve sapere.', 'Va bene, ma solo fino alla fontana.'), { wait: 2 },
      ML('a', 'congedo', ['Può andare. E si pettini.', 'Le farò avere una mancia per testamento.']), { pose: 'b' }, { flee: 'b', from: 'a', sp: 1.5 }, { wait: 2 }] },
    { id: 'matto_profeta', w: 1, posto: ['sagrato', 'mercato', 'pensilina'], soft: true, roles: [{ id: 'a', f: 'matto|m' }], beats: [
      { pose: 'a', p: 'braccia_su' }, ML('a', 'predica', ['Fratelli! La fine è vicina!', 'Ascoltatemi! Ho fatto i conti!']), { crowd: 3, around: 'a', r: 22, p: 'aspetta' }, { wait: 2 },
      ML('a', 'predica2', ['Sabato alle nove e un quarto! Il mare si alza di una spanna e poi torna giù!', 'L\'Apocalisse comincerà dal panettiere!'], 4),
      SAY('folla', 'A che ora, scusi?', 'E sabato non posso, c\'è il matrimonio di mia cugina.', 'L\'altra volta aveva detto giovedì.', 'Si può spostare a dopo cena?', 'Io me lo segno.'), { wait: 2.5 },
      SAY('folla', 'Ma chi è questo?', 'È quello del giovedì.', 'Lascialo stare, l\'anno scorso ci ha preso sulla grandine.'), { pose: 'a', p: 'indica_su' },
      ML('a', 'chiusa', ['Avete tempo per pentirvi. Poco. Tipo un caffè.', 'Poi non venite a lamentarvi da me.']), { pose: 'a' }, { wait: 2 }] },
    { id: 'matto_smemorato', w: 1, posto: ['panchina', 'sagrato', 'dehors'], soft: true, roles: [{ id: 'a', f: 'matto|old' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.1, d: 1.2, t: 18 }, { look: 'b', at: 'a' }, { pose: 'a', p: 'saluta_su' },
      SAY('a', 'Ninetto! Sei tu!', 'Rosaria! Quanto tempo!', 'Comandante! Lei è vivo!'), SAY('b', 'Veramente io sono {b}.', 'No, guardi, si sbaglia.', 'Sono {b}, il figlio della Carmela.'),
      SAY('a', 'Ah, {b}! Ma certo. Il figlio di Ninetto.', 'Meglio ancora. Siediti che ti racconto.'), { pose: 'a' },
      ML('a', 'storia', ['Nel \'52 ho salvato un uomo dal mare.', 'Io una volta ho fatto il pugile.']), SAY('b', 'Ah sì?', 'E poi?', 'Davvero?'),
      ML('a', 'storia2', ['Era un tonno. Ma era un tonno molto per bene.', 'Ho vinto un incontro. Poi ho scoperto che era un matrimonio.'], 3.5),
      SAY('b', 'Bella storia.', 'Ma l\'altra volta era un cavallo.', '...va bene.'), ML('a', 'congedo', ['Vabbè, ciao Ninetto.', 'Che bello parlare con te. Chi eri?']), { flee: 'b', from: 'a', sp: 1.4 }, { wait: 2 }] },
    { id: 'matto_venditore', w: 1, when: 'day', posto: ['mercato', 'pensilina', 'sagrato', 'angolo'], soft: true, roles: [{ id: 'a', f: 'matto|adult' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'merce' }, ML('a', 'offre', ['Silenzio in scatola! Cinquecento lire!', 'Ombre di prima mano!']), { wait: 2.5 }, { pose: 'a' },
      { go: 'a', to: 'b', sp: 1.6, d: 1.3, t: 14 }, { look: 'b', at: 'a' }, ML('a', 'offre2', ['Per lei, la scatola grande. Dentro c\'è più silenzio.', 'Questa sedia invisibile è antica.']),
      SAY('b', 'Ma non c\'è niente.', 'E cosa me ne faccio?', 'Quanto, per due?'), { pose: 'a', p: 'porge', w: 1.2 },
      { p: .45, then: [{ pay: ['b', 'a', 1] }, SAY('b', 'Va bene, dammene uno. Per mia moglie.', 'Ecco. Mi serviva, in effetti.'), ML('a', 'venduto', ['Lo apra a casa. Se sente qualcosa, è difettoso.', 'Ottimo acquisto.'])],
        else: [SAY('b', 'Ce l\'ho già, grazie.', 'Ne ho a casa una cassa.'), SAY('a', 'Allora gliela compro io. Usata, cinquanta lire.', 'Peccato. Era l\'ultima. Ne ho altre trenta.')] }, { pose: 'a' }, { wait: 2 }] },

    // --- la vita degli altri, che ti passa davanti ---
    { id: 'prova_discorso', w: 1, roles: [{ id: 'a', f: 'adult' }], beats: [
      { wander: 'a', r: 3, sp: .7 }, SAY('a', 'Cara, ho perso la casa a carte. No.', 'Amore, la Vespa... la Vespa ha preso una decisione.', 'Mamma, ti devo dire una cosa. Il prete è d\'accordo.'), { wait: 3.5 },
      SAY('a', 'Cara, la casa ha perso me. Meglio.', 'Amore, la Vespa si è innamorata. Di un camion. No...', 'Mamma, il prete non è proprio d\'accordo. Ma ha capito.'), { wait: 3.5 },
      { pose: 'a', p: 'braccia_su' }, SAY('a', 'Va bene. Ci vado. Tanto mi ammazza lo stesso.', 'Gliela dico a Natale. Davanti ai parenti non urla.', 'No, scrivo una lettera e parto.'), { pose: 'a' }, { go: 'a', to: 'away', sp: 1.8, d: 2, t: 9, soft: true }] },
    { id: 'prova_pianto', w: 1, when: 'day', roles: [{ id: 'a', f: 'f' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'aspetta' }, SAY('a', 'Buuuh... no, troppo.', 'Uh... uh-uh... no, sembro una civetta.'), { wait: 2.5 }, SAY('a', 'Buh. Ecco. Così.', 'Uh. Sì, questo è dignitoso.'), { wait: 1.5 },
      { go: 'b', to: 'a', sp: 1.5, d: 1.3, t: 14 }, SAY('b', 'Signora, tutto bene?', 'Le è successo qualcosa?'),
      SAY('a', 'Mi alleno. Giovedì muore lo zio Tore.', 'È per il funerale di mio cognato.'), SAY('b', 'Oddio, è malato?', 'Mi dispiace. Quando è morto?'),
      SAY('a', 'No, sta benissimo. Ma ha fatto testamento.', 'Non ancora. Ma è uno puntuale.'), { pose: 'a' }, SAY('b', '...', 'Ah. Allora auguri.', 'Ci vediamo giovedì, allora.'), { flee: 'b', from: 'a', sp: 1.5 }, { wait: 2 }] },
    { id: 'chi_muore_prima', w: 1, posto: ['panchina', 'dehors'], soft: true, roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', f: 'old', r: 16 }], beats: [
      { go: 'b', to: 'a', sp: 1.2, d: 1.1, t: 18 }, { pose: 'a', p: 'siede_terra' }, { pose: 'b', p: 'siede_terra' },
      SAY('a', 'Il medico mi ha dato sei mesi.', 'Il dottore dice che ho il cuore di un passerotto.'), SAY('b', 'A me tre.', 'Io ce l\'ho di un passerotto morto.'),
      SAY('a', 'Sbruffone.', 'Sempre a vantarti.'), SAY('b', 'Scommettiamo diecimila?', 'Diecimila che vado prima io.'), { wait: 1.5 },
      SAY('a', 'Andata. Ma se vinco tu, come me li dai?', 'Andata. Li lascio a mia nuora, lei paga tutti.'), SAY('b', 'Ci penso io. Ho un amico in parrocchia.', 'Te li porto di persona. Tu aspettami.'), { wait: 3 }] },
    { id: 'vedova_panchina', w: 1, posto: 'panchina', soft: true, roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'siede_terra' }, SAY('a', 'Pino, non sederti sul bagnato. Ti ho detto mille volte.', 'Gianni, hai preso la sciarpa? No? Bravo, così impari.'), { wait: 3 },
      { go: 'b', to: 'a', sp: 1.4, d: 1.5, t: 14 }, SAY('b', 'Signora, con chi parla?', 'Scusi, ma lì non c\'è nessuno.'),
      SAY('a', 'Lo so. Ma lui non lo sa.', 'Con mio marito. È morto nel \'77, ma è sempre stato distratto.'), SAY('b', 'Ah. Mi scusi.', 'Mi saluti suo marito, allora.'),
      SAY('a', 'Glielo dico. Ma non ti risponde, eh. Non rispondeva neanche prima.'), { wait: 3 }] },
    { id: 'lettera_garante', w: 1, when: 'day', roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'legge_su' }, SAY('a', '«Egregio Garante, le scrivo per lamentarmi del freddo.»', '«Illustrissimo Garante, mio vicino ha un gallo.»'), { wait: 2 },
      { go: 'b', to: 'a', sp: 1.4, d: 1.3, t: 14 }, SAY('a', '«So che non è colpa sua. Ma tutto il resto sì.»', '«Il gallo canta alle quattro. Chiedo che venga rettificato. Il gallo, non il vicino. Per ora.»'),
      SAY('b', 'Ma sei matto? Spediscila e spediscono anche te.', 'Bella. La firmi?'), SAY('a', 'La firmo col nome di mio cognato.', 'Non la spedisco. La leggo forte, così la sentono lo stesso.'), { pose: 'a' }, { wait: 2 }] },
    { id: 'turno_arrabbiarsi', w: 1, roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'm', r: 18 }], beats: [
      { go: 'b', to: 'a', sp: 1.7, d: 1.2, t: 16 }, { pose: 'b', p: 'discute_su' }, SAY('b', 'Adesso mi arrabbio!', 'Guarda che m\'incazzo, eh!'),
      { pose: 'a', p: 'indica_su' }, SAY('a', 'No, tocca a me. Tu ti sei arrabbiato ieri.', 'Un momento. Prima io, l\'ho detto prima.'),
      SAY('b', 'Ieri era per il cane, non vale.', 'Allora facciamo metà per uno.'), SAY('a', 'Va bene. Comincia tu. Ma breve.', 'Va bene, ma oggi decido io per cosa.'), { pose: 'a' }, { pose: 'b' },
      SAY('b', 'Ecco... adesso non mi viene più.', 'Non mi ricordo più perché.'), SAY('a', 'Visto? Lo fai sempre.', 'Allora andiamo a bere.'), { wait: 2 }] },
    { id: 'ora_esatta', w: 1, roles: [{ id: 'a' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { go: 'a', to: 'b', sp: 1.6, d: 1.2, t: 16 }, SAY('a', 'Scusi, che ore sono?', 'Mi dice l\'ora, per favore?'), { look: 'b', at: 'a' }, SAY('b', 'Le cinque e un quarto.', 'Quasi le sei.', 'Le undici precise.'),
      SAY('a', 'Sicuro? Il mio dice giovedì.', 'Strano. A casa mia sono le otto. Da tre anni.', 'Ah. Allora sono in ritardo di un matrimonio.'), SAY('b', '...', 'Allora le serve un altro orologio.', 'Auguri.'), { flee: 'a', from: 'b', sp: 1.6 }, { wait: 2 }] },
    { id: 'confessione', w: 1, posto: ['panchina', 'dehors', 'portone'], soft: true, roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { go: 'a', to: 'b', sp: 1.3, d: 1.2, t: 18 }, SAY('a', 'Le galline del \'71 le ho rubate io. Ecco. L\'ho detto.', 'Sono stato io a mettere il sale nella fontana nel \'66.'),
      SAY('b', 'E a me che lo dice?', 'Ma chi gliel\'ha chiesto?'), SAY('a', 'Nessuno. È questo il bello.', 'A lei perché ha la faccia di uno che non conta niente.'),
      SAY('b', 'Grazie, eh.', 'Si sente meglio?'), SAY('a', 'Benissimo. Domani le dico chi ha rubato le sue.', 'Moltissimo. Arrivederci, complice.'), { flee: 'a', from: 'b', sp: 1.3 }, { wait: 2 }] },
    { id: 'pesce_addio', w: 1, when: 'day', posto: ['banco_pesce', 'mercato'], soft: true, roles: [{ id: 'a', f: 'shop|m' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'merce' }, SAY('a', 'Ciao Gino. Eri il più bello della cassetta.', 'Addio, Mario. Ti ho voluto bene, ma devo pagare l\'affitto.'), { wait: 2.5 },
      { go: 'b', to: 'a', sp: 1.4, d: 1.3, t: 14 }, SAY('b', 'Ma parla col pesce?', 'Mi dà quella spigola?'), SAY('a', 'Quella è Teresa. Se la vuole, la tratti bene.', 'Mario no. Mario è promesso.'),
      { pose: 'a', p: 'porge', w: 1 }, { pay: ['b', 'a', 1] }, SAY('b', 'La tratto benissimo. Al forno.', 'Allora mi dia quella che non ha nome.'), SAY('a', 'Ciao Teresa...', 'Quella si chiama Loredana. Adesso.'), { pose: 'a' }, { wait: 2 }] },
    { id: 'appuntamento_sbagliato', w: 1, roles: [{ id: 'a', f: 'adult' }, { id: 'b', near: 'a', f: 'adult', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.6, d: 1.2, t: 16 }, SAY('a', 'Lei è quella dell\'annuncio sul giornale?', 'Scusi, è lei il signore col garofano?'),
      SAY('b', 'No, sono il geometra.', 'Quale annuncio?', 'Il garofano è perché ho un funerale.'), { wait: 1 },
      SAY('a', 'Va bene lo stesso. Ho già prenotato.', 'Fa niente. Ha da fare stasera?'), SAY('b', '...a che ora?', 'Pagate voi?', 'Il funerale finisce alle sette.'),
      { follow: 'b', who: 'a', sp: 1.4 }, { go: 'a', to: 'away', sp: 1.4, d: 2, t: 9, soft: true }] },
    { id: 'saluto_autobus', w: 1, posto: ['fermata', 'pensilina'], soft: true, ora: [7, 21], roles: [{ id: 'a', f: 'old' }], beats: [
      SAY('a', 'Aspetta! Aspettaaa!', 'Fermo! Fermo!'), { go: 'a', to: 'away', sp: 3, d: 2, t: 8, soft: true }, { pose: 'a', p: 'saluta_su' },
      SAY('a', 'Ciao Renato! Ti volevo solo salutare!', 'Buon viaggio, Renato! Salutami tua moglie!'), { wait: 2 }, { pose: 'a' }, { mood: 'a', m: 'stanco' },
      SAY('a', 'Trent\'anni che lo saluto. Non sono mai salito.', 'Domani gli porto i biscotti.'), { wait: 2 }] },
    { id: 'pecora_mancante', w: 1, when: 'night', posto: ['angolo', 'dehors'], soft: true, roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'm', r: 18 }], beats: [
      { mood: 'a', m: 'ubriaco' }, { go: 'b', to: 'a', sp: 1.2, d: 1.1, t: 16 }, SAY('a', 'Se un Grigio cade nel bosco e nessuno lo sente...', 'Secondo me la luna ci guarda. Ma non ci giudica.'),
      SAY('b', '...è una bella notizia lo stesso.', '...cade lo stesso.', 'La luna è una spia.'), { mood: 'b', m: 'ubriaco' }, { wait: 2 },
      SAY('a', 'Ti voglio bene. Ma non te lo dico.', 'Se domani mi sveglio scrivo un libro.'), SAY('b', 'Me l\'hai detto adesso.', 'Scrivilo su di me. Mettimi più alto.'), { wander: 'a', r: 4, sp: .7 }, { follow: 'b', who: 'a', sp: .9, d: 1.2 }, { wait: 4 }] },

    { id: 'drum_condiviso', w: 1, posto: ['panchina', 'angolo', 'dehors', 'fermata'], soft: true, roles: [{ id: 'a', f: 'young' }, { id: 'b', near: 'a', f: 'young', r: 16 }], beats: [
      { go: 'b', to: 'a', sp: 1.3, d: 1.1, t: 16 }, SAY('b', 'Oi zio.', 'Bella fra.'), SAY('a', 'Bella.', 'Oi.'), { pose: 'a', p: 'merce' },
      SAY('a', 'C\'ho il drum. Le cartine ce le hai tu?', 'Giramene una che io non sono capace.'), SAY('b', 'Sì.', 'Una. L\'ultima.'), { wait: 3 },
      SAY('b', 'Ecco. È storta.', 'Fra, è venuta a forma di Italia.'), SAY('a', 'Va bene storta.', 'Bella.'), { wait: 2 },
      SAY('a', 'Hai da accendere?', 'L\'accendino?'), SAY('b', 'No.', 'Pensavo ce l\'avessi tu.'), { pose: 'a' }, { wait: 3 },
      SAY('a', 'Vabbè.', 'Stiamo qua.'), { wait: 4 }] },
    { id: 'fottiti_affetto', w: 1, roles: [{ id: 'a', f: 'young' }, { id: 'b', near: 'a', f: 'young', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.7, d: 1.2, t: 14 }, { pose: 'a', p: 'saluta_su' }, SAY('a', 'Oi! Fottiti!', 'Zio! Fottiti!'), { look: 'b', at: 'a' },
      SAY('b', 'Fottiti tu, fra.', 'Bella zio. Fottiti.'), { pose: 'a' }, { pose: 'b', p: 'saluta_su' }, { wait: 1.5 }, { pose: 'b' },
      SAY('a', 'Com\'è andato l\'esame?', 'Tua madre come sta?'), SAY('b', 'Bene. Grazie.', 'Bene. Ti saluta.'), { wait: 2 },
      SAY('a', 'Sono contento.', 'Mi fa piacere davvero.'), SAY('b', 'Fottiti.', '...'), { flee: 'a', from: 'b', sp: 1.3 }, { wait: 2 }] },

    // --- ti tirano dentro (vengono da te; di rado) ---
    { id: 'fai_mio_fratello', w: 1, player: true, roles: [{ id: 'a', f: 'adult', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.9, d: 1.4, t: 16 }, { look: 'a', at: 'player' }, SAY('a', 'Psst. Fai finta di essere mio fratello. Due secondi.', 'Abbracciami. Sei mio cugino di Torino. Non chiedere.'), { wait: 2 },
      { pose: 'a', p: 'saluta_su' }, SAY('a', 'Visto? È tornato! Ve l\'avevo detto che esisteva!', 'Ecco mio fratello! Quello che fa l\'avvocato!'), { wait: 2.5 }, { pose: 'a' },
      SAY('a', 'Grazie. Ora mi credono. Se qualcuno chiede, sei allergico ai gatti e hai una moglie in Svizzera.', 'Perfetto. Tu non mi hai mai visto. Però sei mio fratello.'), { flee: 'a', from: 'player', sp: 1.6 }, { wait: 2 }] },
    { id: 'leggimi_lettera', w: 1, player: true, roles: [{ id: 'a', f: 'old', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.4, d: 1.5, t: 16 }, { look: 'a', at: 'player' }, { pose: 'a', p: 'porge' }, SAY('a', 'Scusi, lei sa leggere? Ho dimenticato gli occhiali. Nel \'70.', 'Mi legge questa? È di mio figlio.'), { wait: 2.5 },
      SAY('a', '«Torno a fine mese. Il gatto è nel forno.» Ah... e poi?', 'Come dice? «Mamma, mi sono sposato, è un marinaio»?'), { wait: 2 },
      SAY('a', '«Spento». Il forno è spento. Meno male.', 'Un marinaio. Bene. Almeno sa nuotare.'), { pose: 'a' }, SAY('a', 'Grazie, giovanotto. Le offrirei un caffè ma lei ha la faccia di uno che dorme poco.'), { flee: 'a', from: 'player', sp: 1.2 }, { wait: 2 }] },
    { id: 'sei_tu_pacco', w: 1, player: true, roles: [{ id: 'a', f: 'adult', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.5, d: 1.4, t: 16 }, { look: 'a', at: 'around' }, SAY('a', 'Psst. Sei tu quello del pacco?', 'Sei tu? Il cugino di Michele?'), { wait: 3 },
      SAY('a', 'No? Allora non mi hai visto.', 'Ah, no. Non sei tu. Si vede, hai la faccia onesta.'), { wait: 1.5 },
      SAY('a', 'Però se sei tu, è sotto la terza panchina. E il canarino non c\'entra.', 'Se vedi Michele digli che la mucca è arrivata. Lui capisce.'), { flee: 'a', from: 'player', sp: 1.7 }, { wait: 2 }] },
    { id: 'parola_a_caso', w: 1, player: true, roles: [{ id: 'a', f: 'young', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.8, d: 1.5, t: 14 }, { look: 'a', at: 'player' }, SAY('a', 'Scusa, mi dici un nome a caso?', 'Dimmi un numero da uno a dieci. Veloce.'), { wait: 3 },
      SAY('a', 'Perfetto. Mia figlia si chiamerà così.', 'Sette? Ok. Allora lo lascio.', 'Bene. Ho appena venduto la Vespa.'), { wait: 1.5 },
      SAY('a', 'Se viene male, è colpa tua.', 'Grazie. Non lo saprai mai, ma mi hai cambiato la vita.'), { flee: 'a', from: 'player', sp: 1.6 }, { wait: 2 }] },
    { id: 'nonno_ti_riconosce', w: 1, player: true, roles: [{ id: 'a', f: 'matto|old', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.3, d: 1.5, t: 18 }, { look: 'a', at: 'player' }, { pose: 'a', p: 'saluta_su' },
      SAY('a', 'Nino! Sei tornato dalla guerra!', 'Nino! Ma quanto sei cresciuto! L\'ultima volta eri un neonato. Nel \'31.'), { wait: 2.5 }, { pose: 'a' },
      SAY('a', 'Ah no. Il Nino che dico io è morto nel \'43. Gli somigli.', 'Aspetta, tu non hai i baffi. Il Nino mio aveva i baffi già a otto anni.'), { wait: 2 },
      SAY('a', 'Anche lui aveva quella faccia da uno che deve dei soldi.', 'Vabbè. Ti voglio bene lo stesso. Saluta tua madre.'), { flee: 'a', from: 'player', sp: 1.1 }, { wait: 2 }] },
    { id: 'tienimi_posto', w: 1, player: true, posto: ['fila', 'edicola', 'fermata', 'pensilina'], soft: true, roles: [{ id: 'a', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.8, d: 1.4, t: 14 }, { look: 'a', at: 'player' }, SAY('a', 'Mi tieni il posto? Torno subito.', 'Mi guardi la borsa un attimo? Dentro c\'è un gallo, non gli dar retta.'), { wait: 2 },
      { go: 'a', to: 'away', sp: 2.2, d: 2, t: 8, soft: true }, SAY('a', 'Se chiede di me, sono morto.', 'Se arriva mia moglie, io sono te!'), { wait: 2 }] },
    { id: 'hai_da_accendere', w: 1, player: true, roles: [{ id: 'a', f: 'young', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.6, d: 1.4, t: 14 }, { look: 'a', at: 'player' }, SAY('a', 'Oi fra. Hai da accendere?', 'Zio, scusa. C\'hai da accendere?'), { wait: 3 },
      SAY('a', 'No? Bella.', 'Neanche io.'), { wait: 2.5 },
      SAY('a', 'Ma una siga ce l\'hai?', 'Tanto non ce l\'ho neanche la siga.'), { wait: 2.5 },
      SAY('a', 'Vabbè. Grazie lo stesso fra. Ciao.', 'Bella. Sei a posto tu.'), { flee: 'a', from: 'player', sp: 1.3 }, { wait: 2 }] },
    // --- [attualita] i matti nuovi ---
    { id: 'matto_motivatore', w: 1, when: 'day', roles: [{ id: 'a', f: 'matto|adult' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.9, d: 1.2, t: 14 }, { look: 'b', at: 'a' }, { pose: 'a', p: 'braccia_su' }, ML('a', 'sfida', ['Tu! Cosa vuoi dalla vita?', 'Campione! Quanto vali?']),
      SAY('b', 'Un panino.', 'Che mi lasci passare.', 'Dormire. Una volta.'), { pose: 'a', p: 'indica_su' }, ML('a', 'sfida2', ['Sbagliato! Devi volere di più! Di più! Anche se non c\'è!']),
      SAY('b', '...un panino grande?', 'Va bene. Voglio di più.', 'Lei mi fa paura.'), { pose: 'a' }, ML('a', 'congedo', ['Vai, campione! Il mondo è tuo!', 'Prima lezione gratis. La seconda costa mille lire.']), { flee: 'b', from: 'a', sp: 1.7 }, { wait: 2 }] },
    { id: 'matto_complotto', w: 1, roles: [{ id: 'a', f: 'matto|m' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.6, d: 1, t: 16 }, { look: 'a', at: 'around' }, ML('a', 'rivela', ['Psst. Tu. Vieni qui.', 'Lo sai perché il pane costa così tanto?']),
      SAY('b', 'Cosa?', 'Non ho tempo.', 'Mi dica, ma veloce.'), { look: 'a', at: 'b' }, ML('a', 'rivela2', ['Il mare non è vero. È dipinto. Di notte lo arrotolano.'], 3.8),
      SAY('b', 'Ma il mare l\'ho toccato stamattina.', 'E i pesci?', 'E la Tutela allora?'), SAY('a', 'Appunto. Toccare è il primo passo. Poi ti abitui.', 'I pesci sono comparse. Pagati pochissimo.', 'La Tutela? Quella è vera, purtroppo. È l\'unica cosa vera.'),
      ML('a', 'congedo', ['Non hai sentito niente.', 'Ci vediamo. Ma non qui.']), { flee: 'a', from: 'b', sp: 2.1 }, { wait: 2 }] },
    { id: 'matto_polaroid', w: 1, when: 'day', roles: [{ id: 'a', f: 'matto|young' }, { id: 'b', near: 'a', r: 16 }, { id: 'c', near: 'a', r: 18 }], beats: [
      ML('a', 'foto', ['Fermi tutti! Foto per l\'album!']), { all: [{ go: 'b', to: 'a', sp: 1.5, d: 2.2, t: 12, soft: true }, { go: 'c', to: 'a', sp: 1.5, d: 2.6, t: 12, soft: true }] }, { look: 'b', at: 'a' }, { look: 'c', at: 'a' },
      { pose: 'a', p: 'foto' }, ML('a', 'foto2', ['Sorridi! No. Sorridi meglio.', 'Fai finta di conoscermi da sempre.']), SAY('b', 'Così?', 'Ma io non la conosco.', 'Posso andare a lavorare?'), SAY('c', 'Io non vengo mai bene.', 'Mi si vede la canottiera?'), { wait: 2 },
      ML('a', 'congedo', ['Perfetta! Cioè: io sono perfetta. Voi ci siete.', 'Bellissima. Me la tengo.']), { pose: 'a' }, { flee: 'b', from: 'a', sp: 1.4 }, { flee: 'c', from: 'a', sp: 1.4 }, { wait: 2 }] },
    // --- [attualita] la vita di oggi, nel 1986 dell'isola ---
    { id: 'colloquio_lavoro', w: 1, posto: ['dehors', 'portone'], soft: true, roles: [{ id: 'a', f: 'adult' }, { id: 'b', near: 'a', f: 'young|any', r: 18 }], beats: [
      { go: 'b', to: 'a', sp: 1.4, d: 1.2, t: 16 }, { pose: 'a', p: 'legge_su' }, SAY('a', 'Allora. Dove si vede tra cinque anni?', 'Mi dica un suo difetto.', 'Perché dovremmo scegliere proprio lei?'),
      SAY('b', 'Vivo?', 'Lavoro troppo.', 'Perché sono l\'unico che è venuto.'), { pose: 'a' }, SAY('a', 'Le manca ambizione.', 'Troppo poco. Qui lavorano tutti troppissimo.', 'Esatto. Ma non lo dica in giro.'),
      SAY('a', 'Il posto è suo. Prova gratuita di sei mesi.', 'Bene. Ci faremo sentire. Forse. Non aspetti vicino al telefono.'), SAY('b', 'Gratuita per chi?', 'Grazie. Lunga Calma.', 'Io il telefono non ce l\'ho.'), SAY('a', 'Per noi.', 'Ottimo. Siamo una famiglia.'), { wait: 2 }] },
    { id: 'turista_autentico', w: 1, when: 'day', roles: [{ id: 'a', f: 'adult' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { pose: 'a', p: 'foto' }, SAY('a', 'Che autentico! Che povero! Che bello!', 'Oh, la vera vita del popolo!'), { go: 'a', to: 'b', sp: 1.5, d: 1.4, t: 14 }, { look: 'b', at: 'a' },
      SAY('b', 'È la mia biancheria.', 'Quella è casa mia.', 'Mi sta fotografando le scarpe?'), SAY('a', 'Ancora più autentico! Rimanga così, triste!', 'Non si muova! Faccia la faccia di prima!'), { pay: ['a', 'b', 1] },
      SAY('b', 'Torni domani. Stendo anche il nonno.', 'Per duemila mi metto a piangere.', 'Se vuole le faccio vedere anche la fame. Da vicino.'), { pose: 'a' }, { flee: 'a', from: 'b', sp: 1.3 }, { wait: 2 }] },
    { id: 'aria_abbonamento', w: 1, roles: [{ id: 'a', f: 'adult' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.7, d: 1.2, t: 14 }, SAY('a', 'Buongiorno! Lei respira?', 'Scusi, posso farle una domanda sul suo respiro?'), SAY('b', 'Sì.', 'Come tutti.'),
      SAY('a', 'Senza abbonamento? Mi spiace, è un problema.', 'Con Aria Più respira meglio. E respira di più. Ma paga.'), SAY('b', 'E quanto costa?', 'E se non mi abbono?'),
      SAY('a', 'Prova gratuita di tre respiri. Uno. Due. Ecco: il terzo lo paga.', 'Niente. Respira lo stesso. Ma lo sa che non dovrebbe.'), { p: .3, then: [{ pay: ['b', 'a', 1] }, SAY('b', 'Va bene. Ma solo il sabato.')], else: [SAY('b', 'Trattengo il fiato. Arrivederci.', 'Respiro quella del vicino.')] }, { wait: 2 }] },
    { id: 'calcolatore_felice', w: 1, posto: ['panchina', 'dehors', 'edicola'], soft: true, roles: [{ id: 'a', f: 'old|any' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'legge_su' }, SAY('a', 'Il Calcolatore del Ministero dice che sono felice.', 'Mi è arrivato il foglio: felicità al settantaquattro per cento.'), { go: 'b', to: 'a', sp: 1.4, d: 1.3, t: 14 },
      SAY('b', 'E lo sei?', 'E il resto?'), SAY('a', 'Lui è più intelligente di me. Lo sono.', 'Il resto lo devo dichiarare entro venerdì.'),
      SAY('b', 'Il mio dice che sono ricco.', 'A me non è arrivato niente.'), SAY('a', 'Allora sei ricco. Offri tu.', 'Allora sei morto. Mi dispiace tanto.'), { wait: 2 }] },
    { id: 'sondaggio_preferenze', w: 1, player: true, roles: [{ id: 'a', f: 'adult', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.6, d: 1.5, t: 14 }, { look: 'a', at: 'player' }, { pose: 'a', p: 'legge_su' }, SAY('a', 'Sondaggio dell\'Ufficio Preferenze. Da uno a cinque, quanto ama il Garante?', 'Breve sondaggio di gradimento: com\'è stata la sua ultima perquisizione?'), { wait: 3.4 },
      SAY('a', 'Cinque. Ho segnato cinque. Il cinque lo segno sempre io, così nessuno sbaglia.', 'Benissimo. «Eccellente». Lo sapevo: ce l\'ha scritto in faccia.'), { wait: 1.6 },
      SAY('a', 'Ultima domanda: consiglierebbe la Tutela a un amico? Non risponda. Me lo dica il suo amico.', 'Grazie. La sua opinione è importante. Adesso ce l\'abbiamo noi.'), { pose: 'a' }, { flee: 'a', from: 'player', sp: 1.3 }, { wait: 2 }] },
  ];
  // si aggiungono al catalogo di eventi.js (che le prova come le altre, test_eventi.js)
  { const E = EV(); if (E && E.SCENE) SCENE.forEach(D => { if (!E.SCENE.some(s => s.id === D.id)) E.SCENE.push(D); }); }

  return { CFG, voce, MATTI, MANIE, ROTELLE, FRAM, FRAM_G, SCROCCO, SCENE, S, scheda, linea, choose, step };
})();
if (typeof module !== 'undefined') module.exports = Matti;
