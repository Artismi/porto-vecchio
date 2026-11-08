# Porto Vecchio — Tre mondi di strada: i senzatetto, le bande di ragazzini, i pescatori

Consegna del reparto commedia. **Niente è stato toccato nel gioco**: è un documento, come gli altri di `v7/commedia/`.

Direzione di Andrea: «più street, più GTA, più stand-up comedy; ironico, sfacciato, grezzo. Riferimenti: La Haine, Fritz the Cat.
Deve sembrare viva e piena la città, ne voglio molta di più.» Adesso chiede tre mondi: **senzatetto, gang di ragazzini, pescatori**.

**Correzione di tono, applicata a tutto il file.** Andrea ha bocciato come «supercazzole» gli aforismi e i giochi di parole
(«Il segreto è il Lei…», «Voi morite a rate», «DI' QUALCUNO»). Qui quindi ci sono solo cose concrete e dirette, legate alla situazione:
- gente che urla dei fatti suoi;
- insulti, vanterie, lamentele;
- bugie scoperte;
- situazioni fisiche.

Una battuta deve capirla al volo un quindicenne, alla prima lettura.

Tarato poi su `TONO.md` (i voti di Andrea): reazioni a caldo a quello che succede adesso, urlate; soprattutto gente che si
sputtana da sola (egoismo, pigrizia, vigliaccheria, vanteria) e amici che si fregano a vicenda. Niente burocrate stanco, niente
ironia fredda, niente logica rovesciata a due voci, niente insulti di repertorio sulle famiglie.

Regole rispettate:
- al massimo 70 caratteri a fumetto (controllato con uno script, vedi in fondo);
- parolacce sì, bestemmie no; il sesso solo per allusione;
- niente razza né disabilità;
- i senzatetto fanno ridere loro: si ride con loro, mai della loro miseria. Senza casa li ha lasciati il sistema (Ente Case, Banco,
  tessera annonaria, il '79);
- i ragazzini non fanno violenza vera e non la subiscono, e il giocatore non li può mai ferire (regole in §2.E).

Come leggere: _corsivo_ è quello che si vede; **[NUOVO]** è quello che il motore oggi non sa fare (le scene reggono anche senza: si
salta la chiave). Pose e oggetti in mano sono solo quelli che esistono:
- pose: `anim_vita.js`/FPOSE, `siede`, `siede_terra`, `aspetta`, `appoggiato`, `osserva`, `indica_su`, `discute_su`, `braccia_su`,
  `tasche_su`, `orologio_su`, `legge_su`, `fuma_su`, `scalda`, `lavora`, `merce`, `porge`, `raccoglie`, `telefona_su`;
- oggetti: `anim_mano.js`, `radio`, `carta`, `cassa`, `sacco`, `pesce`, `pacchetto`, `moneta`, `tazza`, `cappello`, `bottiglia`,
  `corda`, `maglia`, `borsa`, `cassetta`.

---

## 0. Cosa c'è già nel codice (grep in `v7/src`)

- **pesca**: c'è dappertutto.
  - In `popolo.js`: l'attività `canna` (molo, punta, caletta, pontile, lanterna, scogli; 5-20) e il progetto `pesca` all'alba
    (+2 alla dispensa).
  - Il verbo `pesca` della Risacca; l'OGG `canna` («canna da pesca», `oggetti.js:192`), dato in mano ai pescatori (`TOOLJOB`).
  - I posti `pesca_*` nel mondo.
- **pescator**:
  - `popolo.js:143` OUTDOOR `['molo','pescatore',8,5,3,11]`: 8 posti al molo, paga 5, turno 3-11.
  - `economia.js` li fa produrre (pesce 3 al giorno, mestiere ESSENTIAL); `mestieri.js` dà loro `barca, sfama`.
  - Esistono il Borgo/Cala dei pescatori (`pescatori_s`) e i vestiti in `guardaroba.js`.
- **asta**: quasi tutti i risultati sono «pasta», «basta». Quello vero è `popolo.js:64` RECURRING `pesce`, ogni giorno 6-8 al `molo`
  («Asta del pesce al molo»): ci va il 30% degli abitanti sopra i 50 anni (`popolo.js:630`). Nessun banditore, nessun prezzo, nessuna
  offerta: è gente in piedi.
- **barca**:
  - gozzo, lancia e motoscafo si guidano (F dal pontile);
  - i `peschereccio` sono ormeggiati al `molo_vecchio` (`world_cittanuova.js:1808`) e fanno scena;
  - «due pescherecci escono all'alba» è nella Bibbia come sistema.
- **mendicante**: una sola scena, `eventi.js:462` (sagrato, portone, pensilina).
  - Battute vecchio stile: «Mille lire per un caffè?», «Dio la benedica!».
  - È uno sconosciuto che chiede soldi, non un senzatetto: tutti gli abitanti hanno una casa (`homeT`).
- **senzatetto / barbone**: **zero risultati**. Non esiste nessuno senza casa, nessun posto dove si dorme fuori, nessuno sgombero.
- **bambin**: solo battute (`matti.js:123,141`), un `Bambino` della Città dei Topi (`sottosuolo.js:449`) e il gesso dei bambini per
  terra (`render.js:10382`: la campana sulle piazzette). Nella popolazione non ci sono bambini.
- **ragazzin**:
  - in `scorci.js:482` il posto `gioco` («i ragazzini, il pallone, il gelato») prende `who:'young'`, cioè gente **fino a 30 anni**;
  - la scena del pallone sta in `vievive.js`;
  - c'è la crew `TOY`, «i ragazzini» (PIX, GEKO, LUPO, TEO), in `strada_dipinta.js:155` e `writer_vita.js:260`: tag e throw storti.
  - Oggi i ragazzini esistono solo come scritte sui muri.
- **Età della popolazione**: dai 18 ai 62 anni (`popolo.js:358`), e anche HANDOFF_regia.md:19 tiene i «Bambini» come cosa da fare
  (6-14 anni, `models.js dressUp`: `hgt` oggi è casuale tra .94 e 1.04).

> **DA SEGNALARE (bloccante per il §2).** Le bande di ragazzini (10-15 anni) hanno bisogno di **modelli di ragazzino**: altezza
> .72-.88, proporzioni, pose da bambino. Sono lavoro del **gruppo dei personaggi** (`models.js`, `anim_vita.js`), non del mio.
> Finché non ci sono:
> - non si mettono adulti piccoli travestiti;
> - si usa solo lo **strato senza corpi** del §2.E: le voci da dietro i muri, i gavettoni dai balconi, le tag, le madri alle finestre
>   alle 19:30.
>
> Il pedaggio, la guerra dell'acqua e i fattorini vogliono i corpi.

---

# 1. I SENZATETTO — «Quelli del Cartone»

## 1.A Il mondo in 6 righe
1. **Chi.** Dodici-quindici persone:
   - sfrattati dall'Ente Case per le rate;
   - portuali a giornata rimasti senza giornata;
   - chi non ha la tessera annonaria perché nel '79 non firmò;
   - un paio di ragazzi cacciati di casa.
2. **Dove.**
   - Il **Condominio Cartone**, scatoloni coi numeri civici sotto il `sottopasso` della Via Cavour, accanto alle `baracche`.
   - La `grata_vapore`, calda, di notte; il Ponte della darsena (`ponte_arco`) quando piove.
   - Di giorno: `sagrato`, la `pensilina` della `stazione`, la `discarica`, i barili `fuoco` sulla `calata`.
3. **Quando.**
   - 6: fila al Forno per il pane di ieri;
   - 8-12: sagrato e stazione;
   - 12: la mensa di Suor Agata (`chiesa`);
   - 17: il giro dei bidoni dopo la spesa;
   - 20: il Garante, visto da fuori attraverso la vetrina di Gino;
   - 22: la grata.
4. **Fazioni.**
   - La Tutela li conta e li sgombera: la **Ramazza**, il giovedì all'alba **[NUOVO]**.
   - La Famiglia li usa come palo e li paga in vino; Suor Agata (`pietro`) li sfama.
   - La Zia li ignora, e sbaglia: vedono più degli Orecchi.
5. **Economia.** Vuoti a rendere, cartone e rame venduti a Sandro al `magazzino`, il posto in fila tenuto per gli altri
   (500 lire), la colletta.
6. **Il giocatore.**
   - Sono il suo giornale: sanno chi entra, chi esce e a che ora passa la ronda.
   - Gli tengono la roba e lo nascondono sotto il cartone.
   - Gli chiedono una sigaretta e gliela ridanno quando gli serve.

## 1.B I quattro ricorrenti

### L'Amministratore — Gesuino Porcu, 58 anni
- **Chi**: è stato caposquadra alla calata per ventisei anni. Sfrattato nell'84 per le rate del frigorifero.
- **Il Condominio Cartone**: lo manda avanti come un palazzo vero.
  - Scatoloni numerati, scala A e scala B.
  - Riunione di condominio la domenica alle 10.
  - La quota si paga in sigarette.
- **Giro**:
  - `sottopasso` 20-8;
  - `calata` 8-11, a cercare una giornata (non la trova);
  - `sagrato` 11-12;
  - `chiesa` 12, la mensa;
  - il giro dei bidoni alle 17.
- **Voce**: urla da amministratore. Regolamento, morosi, «a norma». Si incazza coi vicini come in un palazzo vero.
- **Gag visiva**: `siede` su una `cassa` col registro (`legge_su` + `carta`). Si alza solo per indicare (`indica_su`) chi ha sbagliato.

**Primo incontro**
- «Oh! Qui è privato! Scatolone quattro, scala B. Chi t'ha fatto entrare?»
- «Sono l'amministratore! Io! Chi ha detto di no? Tu? Ripetilo!»
- «Quota: due sigarette a settimana. Se non paghi, ti levo il cartone.»
- «Il dodici è libero! Se ci pisci sopra ti butto nel canale, chiaro?!»

**Ritorno**
- «Nino! Al quattro è entrata l'acqua! Aiutami, cazzo, non stare lì!»
- «Riunione domenica. Primo punto: chi piscia contro il nove. Lo so, eh.»
- «T'ho tenuto il posto! Uno ci voleva dormire! L'ho mandato a cagare!»

**Da solo**
- «Ventisei anni in calata! Ventisei! E mi levano il frigo per tre rate!»
- «Signora del tre! Il fuoco si spegne alle dieci! C'è il regolamento!»
- «Morosi! Siete tutti morosi! Due sigarette! Due! Non vi chiedo la luna!»

**Arco**
1. *Inquilino onorario.* Gli porti due sigarette e ti dà lo scatolone 12: un nascondiglio da 8 posti (§1.E).
2. *La Ramazza in arrivo.* Radiolina ha sentito che giovedì all'alba vengono i Grigi. Porcu ti chiede aiuto in tre modi possibili (scena C2).
3. *La fine.*
   - **Il condominio si salva**: Porcu fa la festa sotto il ponte, ti nomina «consigliere» e da allora ti saluta in piedi.
   - **Non si salva**: la mattina dopo è seduto sotto la pioggia col registro bagnato e legge i nomi a voce alta, uno per uno.
     Il giorno dopo ricomincia: «Scatolone uno. Chi c'è al numero uno?»

### Radiolina — Nives Cabras, 64 anni
- **Chi**: per vent'anni centralinista dell'Hotel Miramare, ci viveva nella stanza del personale. Quando il Colonnello ha requisito
  l'albergo, è finita in strada con una radiolina a pile.
- **Cosa fa**: sente tutto e lo vende.
- **Giro**:
  - `pensilina` della `stazione` 7-11 (vede chi arriva);
  - `sagrato` 11-13;
  - davanti alla vetrina del `bar` di Gino 19-21;
  - `grata_vapore` dalle 22.
- **Voce**: ripete parola per parola quello che ha sentito, imitando le voci. «Testuale.» Prezzi chiari.
- **Gag visiva**: `appoggiato`, con la `radio` all'orecchio. Quando qualcuno parla, abbassa la radio e si gira tutta.

**Primo incontro**
- «Tu sei Nino. Debito con lo Squalo. Affitto il lunedì. Dormi poco.»
- «Una notizia, mille lire. Chi l'ha detta, duemila. Tutte e due, tre.»
- «Vent'anni al centralino del Miramare. Ho sentito tutte le telefonate.»
- «Non toccare la radio! È l'unica cosa che ho con la pila carica!»

**Ritorno**
- «Ferri stamattina ha litigato con la moglie. Alla pensilina. Testuale.»
- «Ti cercavano due della Famiglia! Ho detto che sei morto! Mille lire!»
- «Stanotte alle tre, tu, col sacco! T'ho visto! Che c'era nel sacco?!»

**Da sola**
- «"Si sposti, signora!" "E dove, a casa tua?" Gliel'ho detto così!»
- «Il Colonnello russa! Lo so io! Gli passavo la sveglia alle sei!»
- «Pila, non morire. Stasera no. Stasera voglio sentire le partite.»

**Arco**
1. *Le prime voci.* Ogni voce costa 1.000 ed è vera 4 volte su 5 (§1.E).
2. *La pila.* Ti chiede una pila (da `video` o `disco`, parti radio). Con la pila nuova la sua radio prende la frequenza della centrale
   dei Grigi: da quel giorno ti avvisa della ronda.
3. *La Zia la vuole.* Un Orecchio le offre 5.000 a settimana per parlare di te. **Tu scegli**:
   - **paghi di più** (8.000 a settimana): resta tua;
   - **la porti da Suor Agata**: diventa «occhi» della Risacca (collaboratrice);
   - **non fai niente**: ti vende. Repressione +1 nella zona dove passi più spesso.

   Se resta con te, la notte di Radio Scirocco alza la radio sulla grata e tutti stanno zitti ad ascoltare.

### Smoking — Efisio Mura, 47 anni
- **Chi**: ventidue anni da cameriere all'Hotel Miramare. Licenziato dal Colonnello per una mosca nel brodo. Porta ancora la giacca
  bianca, che ormai è grigia.
- **Cosa fa**: serve i passanti con una tazza vuota e vuole la mancia. Conosce il Miramare dall'interno: la cucina, la porta di
  servizio, le camere dei Marsigliesi.
- **Giro**:
  - `marina`, davanti al Miramare, 9-13 (lui la chiama «il servizio»);
  - la fila del `Forno` alle 6;
  - `sottopasso` di notte.
- **Voce**: cameriere formale, «il signore gradisce». Se la mancia non arriva, passa agli insulti.
- **Gag visiva**: `porge` con la `tazza`, schiena dritta. Se non gli dai niente, si gira di scatto e se ne va impettito.

**Primo incontro**
- «Caffè, signore? …Non c'è. Mancia lo stesso! Ho servito il Colonnello!»
- «Ventidue anni al Miramare. M'hanno cacciato per una mosca. Una!»
- «Niente mancia?! Tirchio! Al Miramare ti sputavo nel brodo!»
- «Ho servito i Marsigliesi. Mance grosse, bicchieri rotti, zero grazie.»

**Ritorno**
- «Mancia! Ieri non me l'hai data! T'ho visto! Giacca marrone!»
- «La porta della cucina del Miramare si apre col coltello del burro.»
- «Stasera il signore è elegante. Scherzo, fai schifo. Mancia?»

**Da solo**
- «Tavolo quattro! Tavolo quattro, non si dorme, ci sono i clienti!»
- «Chi m'ha fregato il papillon? Lo so che sei tu, scatolone nove!»
- «Io ho servito il Colonnello! Tu chi hai servito, i piccioni?!»

**Arco**
1. *La mancia.* Con 1.000 di mancia ti dà un'informazione sul Miramare: chi dorme dove, a che ora cena il Colonnello.
2. *Il servizio.* Ti fa entrare dalla cucina del Miramare. Lui cammina davanti, e il personale vecchio lo saluta e non guarda chi gli
   va dietro. Si può usare come missione: `pickup` o `fotografa` al `miramare`.
3. *La fine.*
   - **Va bene**: il cuoco vecchio gli dà gli avanzi del pranzo del Colonnello e lui li porta al Condominio sul vassoio. Banchetto sotto
     il ponte (scena C1, versione festa).
   - **Va male**: lo riconoscono e lo buttano fuori a calci nel sedere davanti a tutti. Lui si sistema la giacca:
     «Il servizio è chiuso.»

### Spugna — Lorenzo Pala, 23 anni
- **Chi**:
  - Il padre, operaio al Mattonificio, l'ha cacciato di casa per una frase sul Garante.
  - Ha fatto due mesi in miniera ed è scappato.
  - Vive sulla `grata_vapore` e corre più veloce di tutti.
  - Da ragazzino era dei Binari (§2).
- **Giro**:
  - `grata_vapore` 22-9;
  - `stazione` e `scalo` di giorno (porta valigie per 500 lire);
  - `giardini` il pomeriggio.
- **Voce**: veloce, sfotte, ti prende per il culo come un amico. Un ragazzo della Haine senza la casa da cui tornare.
- **Gag visiva**: `siede_terra` sulla grata col `sacco` sotto il culo, `scalda` le mani nel vapore.

**Primo incontro**
- «Oi! La grata è mia. Il vapore pure. Ti siedi? Cinquecento lire.»
- «Mio padre m'ha cacciato perché ho detto che il Garante ha la parrucca.»
- «Ti tengo la roba. Duemila al giorno. Non la tocco. Ci dormo sopra.»
- «Due mesi in miniera. Sono uscito nero. Mi sto ancora lavando.»

**Ritorno**
- «La tua borsa sta qui, sotto il mio culo. Più sicura di una banca.»
- «Nino! Due giorni di deposito. Quattromila. E un panino, se ti va.»
- «Dalla stazione al porto in tre minuti. I Grigi sono ancora là. Ciao!»

**Da solo**
- «Chi ha spento il vapore?! Stanotte il vapore è freddo! Chi è stato?!»
- «Ho una scarpa sinistra, quarantatré! Chi ha la destra? Pago!»
- «Chi m'ha toccato il sacco?! T'ho visto! Sì, tu! Torna qua!»

**Arco**
1. *Il deposito*: 2.000 al giorno (§1.E).
2. *Il corriere.* Porta un pacco da un quartiere all'altro in tre minuti e nessuno lo guarda. Diventa collaboratore «mani».
3. *Il padre.*
   - Una sera il padre arriva alla grata col maglione in mano e resta in piedi, zitto.
   - Spugna: «Papà, la grata è mia. Ti siedi? Cinquecento lire.» Il padre si siede. Silenzio. Se ne va lasciando il maglione.
   - **Se nei giorni prima hai parlato col padre** (lo trovi al `bar` alle 19, è uno che «vota tutto») Spugna torna a casa una notte a
     settimana. Il deposito resta, ma solo di giorno.
   - **Se no** Spugna entra nella Risacca e ti dice: «Allora la casa me la faccio io.»

## 1.C Sei scene

### C1. La riunione di condominio — `riunione_cartone`
**Quando e dove**: domenica 10-11, `sottopasso` (posto `fuoco` attorno al barile).
**Folla**: 8-10 senzatetto (`siede`, `siede_terra`, `scalda`) e 2-3 passanti che si fermano (`osserva`).
**Ruoli**: `a` Porcu; `b` Radiolina; `c` Smoking; `d` un inquilino a caso.

- _Porcu sta in piedi sulla cassa col registro. Gli altri, attorno al barile._
- **Porcu**: «Ordine del giorno! Primo: chi piscia contro il nove!»
- **inquilino**: «Non sono io!» oppure «Era buio!» oppure «Il nove è mio, ci piscio io!»
- **Porcu**: «Secondo: il cartone del frigorifero nuovo. Chi l'ha preso?»
- **Smoking**: «L'ho preso io! Ci dormo da re! Invidiosi!»
- **Radiolina**: «Ridallo! L'avevo visto io per prima! Ladro!»
- **Porcu**: «Terzo! Le quote! Due sigarette! Il sette mi deve tre settimane!»
- **Porcu**: «Ti vedo che fumi, stronzo! Ti vedo!» / **inquilino**: «È di mio cugino! La sigaretta è di mio cugino!»
- **la folla**: «Votiamo!» oppure «Chiudi, che si gela!» oppure «Il sette paga! Il sette paga!»
- **Porcu**: «Chi è d'accordo alzi la mano! …Tutti?! Pure tu che pisci sul nove?!»
- _Tutti alzano la mano. Porcu scrive._ **Porcu**: «Approvato! E adesso fuori dalle palle!»
- Se Nino è vicino: **Porcu**: «Nino! Tu sei consigliere! Di' qualcosa da consigliere!»
  - **[NUOVO ask]**:
    - «Facciamo il tetto!»: tutti ridono, Cartone +2;
    - «Pago io le quote» (2.000): Cartone +6, un applauso;
    - «Io me ne vado»: «Se ne va! Moroso!»

### C2. La Ramazza — `la_ramazza` (con scelta)
**Quando e dove**: giovedì 5:30 (con la Repressione ≥ 2, oppure una volta ogni tre settimane), `sottopasso`.
**Folla**: tutto il Condominio, più 6-10 abitanti delle `baracche` che guardano dai muri.
**Ruoli**: `a` Porcu; `g1`, `g2` due Grigi; `f` Ferri, se è di turno; `s` Spugna.

- _Arriva il camion della Tutela. Due Grigi con le ramazze vere: niente manganelli in mano, si vede che non gli va._
- **Grigio 1**: «Sgombero! Ordinanza! Tutto il cartone sul camion!»
- **Porcu**: «Agente, qui è un condominio! Ho il registro!»
- **Grigio 1**: «Pure il registro! Sul camion! Muoviti, vecchio!»
- **Grigio 2**: «Dai, dai, muovetevi! Si gela e non ho fatto colazione!»
- **Radiolina**: «Tu sei il figlio della Nella! Ti ho cambiato il pannolino!»
- **Grigio 2**: «…Signora, non davanti al collega.»
- **[NUOVO ask]**, se Nino è lì:
  - **Paghi Ferri** (20.000, solo se c'è `f`).
    - **Ferri**: «…Andiamo. Qui non c'è niente. Andiamo, ho detto! Muoversi!»
    - Niente sgombero; Cartone +10; Ferri si ricorda (corruzione, gravità bassa).
  - **Fai casino da un'altra parte**: tiri un sasso a una telecamera lì vicino (verbo esistente).
    - **Grigio 1**: «Che è stato?! Di là!» `hunt` di 12 s **[NUOVO]**.
    - Il Condominio si porta via mezzo cartone; Cartone +8; Repressione +1 se ti vedono.
  - **Ti siedi con loro** (`siede_terra`): protesta seduta senza violenza. Tutti si siedono.
    - **Porcu**: «Seduti! Tutti seduti! Chi si alza è moroso!»
    - I Grigi chiamano la centrale e aspettano dieci minuti, poi se ne vanno.
    - Morale +3, Repressione +1 (protesta), Cartone +12.
  - **Non fai niente**: sgombero.
    - Tutto il cartone sul camion; ogni oggetto nello scatolone 12 ha il 25% di perdersi (finisce al `magazzino` di Sandro, si ricompra).
    - Il servizio d'informazioni chiude per 2 giorni.
- **Spugna**, in ogni caso: «Cinque e mezza! Ma non dormite mai? Andate a rompere a casa vostra!»

### C3. Il posto in fila — `posto_in_fila` (con scelta)
**Quando e dove**: 6-7:30, `fila` davanti al Forno di Lella.
**Folla**: 8-14 in fila (`aspetta`, `orologio_su`, `scalda`).
**Ruoli**: `s` Spugna (primo in fila); `v` una vecchia; `u` un uomo col cappotto.

- _Spugna è primo. È lì dalle quattro._
- **la vecchia**: «Lorenzo, il posto?» / **Spugna**: «Cinquecento, signora. Prego.»
- _Lui si sposta, lei entra al primo posto, paga con una `moneta`._
- **l'uomo**: «Ehi! Lui ha venduto il posto! Si può vendere il posto?!»
- **Spugna**: «Sono qui dalle quattro, coglione! Tu dormivi! In fondo!»
- **la folla**: «Ha ragione lui!» oppure «Vergogna!» oppure «Quanto vuoi per il secondo?»
- **[NUOVO ask]**, se Nino è in fila:
  - **Compri il secondo posto** (500): entri subito; l'uomo col cappotto te lo rinfaccia per tre giorni.
  - **Difendi l'uomo**: Spugna: «Ah, pure tu?! Allora domani alle quattro ci vieni tu, eroe!»
  - **Lasci perdere**: niente.

### C4. La mensa di Suor Agata — `mensa_san_rocco`
**Quando e dove**: ogni giorno 12-13, `sagrato` di San Rocco.
**Folla**: 10-15 in fila, metà senzatetto e metà «gente con la casa ma senza i soldi».
**Ruoli**: `p` Suor Agata (`pietro`); `a` Porcu; `b` Smoking; `r` un benpensante a rate; `g` un Grigio.

- **il benpensante**: «Io non sono povero, eh! Ho la Polaris! Non ho la benzina!»
- **Porcu**: «Ha la macchina e viene alla mensa? Fuori dalla fila!»
- **Suor Agata**: «Qui non si chiede niente a nessuno. Piatto. Avanti.»
- _Arriva il Grigio, si toglie il cappello, si mette in fila. Silenzio._
- **Smoking**: «Il signore gradisce? No! Tu m'hai sgomberato! Mangia in piedi!»
- **il Grigio**: «Ho finito il turno. Ho fame. Fatemi mangiare in pace.»
- **Suor Agata**: «Piatto. Avanti.»
- **la folla**: «Pure i Grigi!» oppure «Ma lo pagano o no, questo?» oppure «Oggi c'è la pasta!»
- **il Grigio**, con la bocca piena: «Buona. Non ditelo in caserma.»

### C5. Le notizie della grata — `notiziario_grata`
**Quando e dove**: ogni sera 22-23:30, `grata_vapore`.
**Folla**: 4-7 seduti sulla grata e attorno.
**Ruoli**: `b` Radiolina; `s` Spugna; `x` un senzatetto a caso.

- _Seduti nel vapore. Radiolina abbassa la radio._
- **Radiolina**: «Notizie. Uno: il Sirena stasera ha chiuso tardi. La Zia ha mangiato.»
- **Spugna**: «E allora? Mangia sempre.»
- **Radiolina**: «Ha mangiato con uno dell'Ufficio Rettifiche. Due cotolette.»
- **x**: «Due! Quella mangia per due, sempre!»
- **Radiolina**: una voce vera della giornata, presa da `popolo.js` (i ricordi recenti con peso alto: una lite, un arresto, uno
  scasso).
- **x**: «Lo sapevo io!» oppure «Non è vero!» oppure «Chi te l'ha detto?» / **Radiolina**: «Testuale.»
- Se Nino si siede (`siede_terra`) e ha Cartone ≥ 20:
  - **Radiolina**: «Per te ce n'è un'altra. Mille.»
  - **[NUOVO ask]**: paghi, e hai una voce vera che finisce nel Taccuino; oppure non paghi: «Allora ascolta la radio.»

### C6. Il figlio della Nella — `il_figlio_della_nella`
**Quando e dove**: sera 18-21, `pensilina` della `stazione` oppure `portone`.
**Folla**: 4-6 che aspettano il treno (`aspetta`, `osserva`).
**Ruoli**: `a` un senzatetto vecchio (old, m); `g` un Grigio giovane.

- **il Grigio**: «Lei. Si alzi. Qui non si dorme. È una stazione.»
- **il vecchio**: «Non dormo! Avevo gli occhi chiusi per il freddo!»
- **il Grigio**: «Lei russava!» / **il vecchio**: «Io? Io non russo! Chiedi a tutti!»
- **la folla**: «Russava.» oppure «Russava forte.»
- _Il vecchio lo guarda bene._ **il vecchio**: «Ma tu sei Tonino! Il figlio della Nella! Ti portavo in spalla!»
- **il Grigio**: «…Non ad alta voce, per favore.»
- **il vecchio**, forte: «PIANGEVI SEMPRE! TUTTO IL GIORNO!»
- **la folla**: risate trattenute. «Tonino!» oppure «Piangeva!» oppure «Ancora adesso, guardalo.»
- **il Grigio**: «Va bene! Dorma! Dorma! Ma zitto, la prego, zitto!»
- _Il Grigio se ne va svelto. Il vecchio si risistema._ **il vecchio**: «Piangeva. Ve lo giuro.»

## 1.D Quaranta battute

**Quando passi (15)**
- Mille lire! Dai! Ti ho visto il portafoglio, è pieno! Mille!
- Oi, scarpe nuove? Belle. Quando ti stancano, me le dai?
- Che guardi? Mai visto uno che dorme? Tu dormi in piedi, guarda.
- Ho dormito sulla grata. Sono cotto da un lato solo.
- Chi m'ha fregato il cartone? Era cartone buono! Da frigorifero!
- Il Forno butta il pane alle sei. Alle sei meno un quarto ci sono io.
- Ehi, capo! Una sigaretta. Ti giuro che è l'ultima. Di oggi.
- Signora, le è caduta la borsa! …No, scherzo. Mi dà cento lire?
- Quello è il mio barile! Il fuoco è di tutti, il barile è mio!
- Ehi! Quello è il mio cartone! Giù le mani o ti mordo!
- Ho una coperta dell'esercito. Non chiedermi come. Scalda uguale.
- Alle otto alzano il volume del Garante. Alle otto io dormo!
- Multa per bivacco! Diecimila! Gli ho detto: pignorami il cartone!
- Oggi due vuoti, una scarpa e mille lire. Giornata buona!
- Io ero caposquadra! Avevo dodici uomini sotto! E il fischietto!

**Quando reagiscono a te (15)**
- [corre accanto] Piano! M'hai calpestato la camera da letto!
- [inseguito dai Grigi] Qui! Sotto il cartone! Zitto e non respirare!
- [inseguito, al Grigio] Di là! È andato di là! …Io non ho visto niente.
- [gli dai soldi] Grazie, capo! Stasera mangio caldo! Tiepido. Mangio.
- [non dai niente] Niente?! Con quelle scarpe? Tirchio di merda!
- [ruba] Bravo, ruba! Così finisci qui sotto con noi! C'è posto!
- [ubriaco] Oh, uno dei nostri! Siediti, che ti tengo il posto.
- [gira armato] Metti via quel ferro, che qui ci dorme gente.
- [bagnato] Vieni al barile, scemo. Asciugati. Cento lire. Scherzo.
- [arrestato] Lasciatelo! …Va bene, portatelo. Ma ditegli ciao da me.
- [vestito strano] Bella giacca. Dove l'hai presa, nel mio bidone?
- [guida male] M'hai bagnato tutto, stronzo! Era l'unico maglione!
- [fermo a fissare] Vuoi una foto? Mille lire. Col cartone, duemila.
- [dipinge un muro] Scrivi, scrivi. Ma non sul mio scatolone, è nuovo.
- [di notte] Oh! Sono le due! Vai a casa, che ci svegli tutti, stronzo!

**La folla del barile (10, uno per riga, in capannello)**
- Chi ha messo la scarpa nel fuoco? Puzza! …Era la mia? Era la mia!
- Passami il fiasco. No, il fiasco. Quello è il mio piede.
- Stanotte nevica. Dice la radio. La radio di Nives. Allora è vero.
- Spostati, mi stai rubando il caldo! Il caldo è mio, l'ho acceso io!
- Stanotte m'hanno pisciato sul cartone! So chi è! Ha le scarpe gialle!
- Il mio scatolone è più grande del tuo! Di due dita! Misura!
- Chi m'ha fregato le calze?! Erano appese al barile! Ho i piedi nudi!
- Dividiamo da amici. Io la metà con la mortadella, tu l'altra.
- Facciamo i turni di guardia. Comincio io. A dormire.
- Zitti, sta parlando la radio! …È la pubblicità. Parlate.

## 1.E Il sistema: «Il Condominio Cartone» (informazioni, nascondigli, roba in custodia, la Ramazza)

**L'idea**: i senzatetto non sono comparse da elemosina. Sono la rete d'informazioni più grande della città, e non la paga nessuno.
Il giocatore se la fa amica o la perde.

**Regole e numeri**
- **Fiducia «Cartone»** (0-100) **[NUOVO]**, un gruppo di reputazione accanto a quelli di `rep` già chiesti in scene.md.
  - Sale:
    - sigaretta +3;
    - panino +5;
    - `maglia` regalata +10;
    - 2.000 alla quota del condominio +6;
    - aiutare alla Ramazza +8/+12.
  - Scende:
    - rubare a uno di loro −20;
    - chiamare i Grigi o far sgomberare −30;
    - investire un barile o un cartone in auto −5 (ti vedono e se lo ricordano: è la memoria di oggi).
- **Le voci a pagamento** (Radiolina, o qualunque senzatetto con Cartone ≥ 30):

  | voce | prezzo | serve Cartone |
  |---|---|---|
  | una voce della giornata | 1.000 | 0 |
  | l'orario della ronda in una zona | 2.000 | 10 |
  | dove dorme una persona del cast | 3.000 | 20 |
  | chi ti ha visto all'ultimo reato | 5.000 | 30 |
  | «confondere» un testimone | +5.000 | 40 |

  - Le voci sono vere 4 volte su 5 (la quinta è un'esagerazione: «sei Grigi» invece di due).
  - I dati veri vengono dai diari di `popolo.js` (i ricordi recenti con peso alto) e dalle ronde della Tutela.
  - Il testimone confuso perde metà del peso del ricordo su di te: è il sistema delle voci di oggi (§6.4 della Bibbia), al contrario.
- **Lo scatolone 12** (Cartone ≥ 10): un deposito da 8 posti al `sottopasso`.
  - Si **riusa** la logica di `b.stock` o di `SPACES` (come il Magazzino del pesce abbandonato, `sp_pesce`).
  - Non viene perquisito con la Repressione 3: il cartone non è una casa.
  - Con la Ramazza, ogni oggetto lasciato lì ha il 25% di perdersi.
- **La roba in custodia da Spugna**: 2.000 al giorno, 4 oggetti. Non la perde mai, ma se non paghi per 3 giorni la vende
  (a Sandro, a metà prezzo). Si ricompra al `magazzino`.
- **Ti nascondono** (Cartone ≥ 40): inseguito dai Grigi, entri al `sottopasso` o alla `grata_vapore`.
  - Se nessun Grigio ti vede entrare, un senzatetto ti butta addosso il cartone: in 10 s la caccia finisce.
  - **[NUOVO]** piccolo: si riusa `nasconditi` di `azioni.js` (i posti `HIDDEN`) sul giocatore.
  - Una volta al giorno. La seconda volta: «Oggi no, fratello. Ci guardano.»
- **La Ramazza** **[NUOVO]**, voce in `RECURRING`: giovedì 5:30 al `sottopasso`, con la Repressione ≥ 2, oppure una volta ogni tre
  settimane.
  - Il preavviso: Radiolina, il mercoledì sera, se Cartone ≥ 30.
  - Uscite: scena C2 (Ferri 20.000, un diversivo, la protesta seduta, niente).
  - Con lo sgombero: 2 giorni senza informazioni, il Condominio si sposta al `ponte_arco`, Cartone −5 se c'eri e non hai fatto niente.
- **La colletta per il Condominio**: 10.000 lire danno Morale +1 e Cartone +10, una volta a settimana. Porcu la scrive nel registro
  col tuo nome: chi legge il registro (un Orecchio) lo sa.
- **Collaboratori della Risacca**: un senzatetto con Cartone ≥ 50 può diventare collaboratore «occhi» di un membro (il tetto di 3 di
  oggi). Ogni giorno porta una voce gratis sulla zona dove dorme.

**I rischi**
- Un Orecchio legge il registro di Porcu.
- La Zia compra Radiolina (arco, passo 3).
- La Ramazza ti porta via la roba.
- Chi ti vede pagare Ferri se lo ricorda.

**Cosa si riusa e cosa è [NUOVO]**

| cosa | riuso | [NUOVO] |
|---|---|---|
| posti | `sottopasso`, `grata_vapore`, `ponte_arco`, `fuoco`, `sagrato`, `pensilina`, `fila` | un tipo di posto `cartone` (stesi a terra di notte) |
| chi dorme fuori | — | **abitanti senza casa**: `homeT` nullo, la notte su un posto `cartone`; 12-15 persone |
| voci | diari e voci di `popolo.js`, ronde | prezzo e verità 4/5, la «confusione» del testimone |
| deposito | `b.stock` / `SPACES` | il 25% di perdita alla Ramazza |
| nascondersi | `nasconditi` (`azioni.js`) | usato sul giocatore |
| Ramazza | camion e Grigi esistenti, `RECURRING` | la voce in `RECURRING` e lo sgombero |
| reputazione | — | il gruppo `cartone` |
| scena `mendicante` | `eventi.js:462` | riscrivere le battute nel tono nuovo (vedi sotto) |

**La scena `mendicante` di oggi, riscritta** (stessa struttura, battute nuove):
- `a`: «Mille lire? Non per il vino. …Va bene, per il vino. Ma poco.» oppure «Capo, una sigaretta. Una. Ne hai venti, conto io.»
  oppure «Hai cento lire? Devo telefonare a mia figlia. Non risponde mai.»
- se paga, `b`: «Tieni. E non dirlo a mia moglie.» `a`: «Grazie, capo! Domani ti tengo il posto in fila!»
- se no, `b`: «Non ho spiccioli.» `a`: «Neanch'io! Vedi che siamo uguali?» oppure «Me lo segno, eh. Giacca marrone.»

---

# 2. LE BANDE DI RAGAZZINI — «I Granchi, i Binari, le Briciole, i Cassetta»

> Vale il **DA SEGNALARE** del §0: servono modelli di ragazzino del gruppo dei personaggi. Il §2.E dice che cosa si può fare prima.

## 2.A Il mondo in 6 righe
1. **Chi.** Ragazzini dai 10 ai 15 anni: quattro bande da 5-7, una per quartiere. Prepotenti, territoriali, rumorosi. A scuola la
   mattina, quando ci vanno; in strada il pomeriggio.
2. **Dove.**
   - **i Granchi**: `marina`, `calata`, `molo`, `pescheria`; tag **GRK**, ci scrive PIX.
   - **i Binari**: `stazione`, `scalo`, `baracche`, `grata_vapore`; tag **BNR**, ci scrive GEKO.
   - **le Briciole**: Piazzetta del Forno, Piazzetta del Pozzo, `chiesa`; tag **BRC**, ci scrive LUPO.
   - **i Cassetta**: `mercato` ottagonale, portici della Vittoria; tag **CST**, ci scrive TEO.
   - Gli scrittori sono quelli della crew `TOY` che esiste già.
3. **Quando.**
   - 8-13 scuola (oppure fingono);
   - 14-19 strada;
   - 17 la spesa delle madri: è l'ora delle mele che «cadono» dai banchi;
   - 19:30 le madri chiamano dalle finestre e in venti secondi non c'è più nessuno;
   - la domenica tutto il giorno;
   - la mattina dopo la neve, guerra di palle di neve.
4. **Fazioni.**
   - La Famiglia li usa come fattorini (pacchetti, «guarda se passa l'Alfetta») e li paga in lire e gelati.
   - I Grigi li inseguono e non li prendono mai.
   - La Risacca li vuole come occhi.
   - Sopra tutti comandano le madri.
5. **Economia.**
   - il pedaggio: 500-1.000 per passare una strada della banda;
   - furtarelli: mele, sigarette sfuse, la tua bomboletta;
   - sigarette sfuse rivendute ai grandi: 200-300 l'una;
   - commissioni: 2.000.
6. **Il giocatore.**
   - **Non li può toccare**: è una regola fissa (§2.E).
   - Li può pagare, fregare, comprare, farseli amici o nemici.
   - Loro lo seguono gridando i fatti suoi, gli tirano l'acqua e scrivono il suo nome sui muri, in bene o in male.

## 2.B I quattro ricorrenti

### Ciuffo — Gabriele Atzori, 13 anni, capo dei Granchi
- **Chi**: figlio di un pescatore del molo. Copia lo Squalo: parla da boss con la voce che gli cambia a metà frase.
- **Giro**:
  - `calata` 14-17;
  - `pescheria` 17 (aspetta gli scarti);
  - `molo` 18-19:30;
  - la domenica alle 6 all'asta, a rubare un pesce.
- **Voce**: ordini, cifre sparate, minacce che non stanno in piedi, si offende subito.
- **Gag visiva**: `tasche_su` col `cappello` del padre, troppo grande, che gli cade sugli occhi. Dietro, due Granchi a braccia
  conserte (`braccia_su`).

**Primo incontro**
- «Fermo. Questa è la calata dei Granchi. Si paga. Mille lire.»
- «Ho detto mille. Non cinquecento. Ti sembro uno da cinquecento?»
- «Io sono Ciuffo. Il capo. Chiedi a chiunque. No, a lei no, è mia madre.»
- «Non paghi? I miei ti vengono dietro fino a casa! E lo urlano a tutti!»

**Ritorno**
- «Nino! Il mio cliente preferito! Oggi sconto: novecento.»
- «Ti cercava uno dello Squalo. Cioè, uno col cappotto. Cioè, forse.»
- «Abbiamo fatto la guerra coi Binari. Vinto! Siamo bagnati uguale.»

**Da solo**
- «Tonio! Sei andato coi Binari? Traditore! Ridammi la bici!»
- «Domani tutti in calata alle tre! Chi non viene è fuori! Tranne Tonio.»
- «La voce mi cambia, va bene? Capita ai capi! Smettila di ridere!»

**Arco**
1. *Il pedaggio* (scena C1).
2. *La protezione.*
   - Ti offre «protezione» dalle altre bande per 2.000 a settimana: è vera, i Granchi non ti tirano niente e ti avvisano.
   - Ti chiede una cosa: portargli un pacchetto da Rocco.
3. *Rocco lo vuole fisso come fattorino della Famiglia.* **Tu**:
   - **lo lasci fare**: per una settimana ha le scarpe nuove, poi i Grigi lo riportano a casa per l'orecchio. La banda sta ferma due
     giorni.
   - **gli dai un lavoro tu** (occhi per la Risacca, §2.E): una notte i Granchi scrivono GRK con l'onda sotto.
   - **lo dici a sua madre**: lei lo trascina a casa per il braccio davanti a tutta la calata
     («Gabriele! Il cappello di tuo padre!»). Per tre giorni ti odia, poi ti rispetta: «Tu sei peggio dello Squalo.»

### La Pulce — Sara Melis, 11 anni, vedetta dei Binari
- **Chi**: è «la Sara» che i bambini di `battute.md` citano già («Lo dice la Sara»). Fischia con due dita e sa a memoria gli orari
  delle ronde.
- **Giro**:
  - sul carro merci fermo dello `scalo` 14-19 (lassù, `osserva`);
  - alla `stazione` all'arrivo dei treni;
  - a casa alle 19:30, se no la madre scende.
- **Voce**: secca, numeri, orari, nomi. Non ride mai, e per questo fa ridere.
- **Gag visiva**: in alto, `osserva`, poi `indica_su` di scatto. Ha le ginocchia sempre sbucciate.

**Primo incontro**
- «Ronda alle quattro e dieci. Due Grigi. Uno zoppica. Lo sanno tutti.»
- «Tu sei Nino. Ti ho visto ieri alla stazione. Alle undici e venti.»
- «Un fischio: Grigi. Due: Famiglia. Tre: mia madre. Con tre scappa.»
- «Duemila e ti dico dove va la ronda. Tremila e ti dico pure perché.»

**Ritorno**
- «Sei in ritardo. Ti aspettavo alle cinque. Sono le cinque e quattro.»
- «Quello che zoppica oggi non c'è. C'è uno nuovo. Corre. Attento.»
- «Ho visto la tua Vespa! Cioè, non era tua! L'hai fregata! Lo so!»

**Da sola**
- «Uno, due, tre Grigi. Quattro? No, quella è una signora. Grossa.»
- «Mamma! Non vengo! Sto lavorando! …Sì, ho mangiato! …Il panino!»
- «GEKO! Binari si scrive con la B grande! Rifallo, che fa schifo!»

**Arco**
1. *Gli orari della ronda*: 2.000 (§2.E).
2. *La vedetta.* Diventa i tuoi occhi: fischia quando i Grigi sono a meno di 40 m (§2.E).
3. *L'Orecchio.* Un Orecchio della Zia le offre 5.000 per sapere dove vai.
   - **Se Binari ≥ 20**: lei prende i soldi e gli dà gli orari sbagliati, e la ronda finisce dall'altra parte della città.
     «Mi ha dato cinquemila. Gli ho dato le cinque e mezza. Sbagliate.»
   - **Se no**: ti vende e quella sera arriva un controllo dove passi.
   - Alla fine inventa un fischio nuovo, quattro fischi: «Quattro: Nino.»

### Gnocco — Marco Deidda, 14 anni, il banchiere dei Cassetta
- **Chi**: il più grosso delle quattro bande. Cambia soldi, vende sigarette sfuse ai grandi, ha sempre fame.
- **Giro**:
  - sotto il banco dello zio al `mercato` (mercoledì e sabato 7-13);
  - portici della Vittoria 15-19;
  - da Wu alle 17.
- **Voce**: commerciante, cifre, «ti faccio un prezzo», mente sui conti e lo becchi.
- **Gag visiva**: `merce` col `pacchetto` aperto, `porge` una sigaretta alla volta. Mastica sempre.

**Primo incontro**
- «Sigarette sfuse. Duecento l'una. Trecento se sei grande. Sei grande.»
- «Questo è il banco di mio zio. Io sto sotto. Lui lo sa. Più o meno.»
- «Ti cambio i dollari dell'Impero. Ti frego un po'. Meno degli altri.»
- «Mille lire e ti dico chi ha rubato la bici a Tonio. Sono stato io.»

**Ritorno**
- «Ho le americane vere! Guarda, c'è scritto in americano!»
- «Mi devi trecento lire da martedì. Con gli interessi, quattrocento.»
- «Non ho rubato niente! Guarda le tasche! …Non quella! L'altra!»

**Da solo**
- «Mamma, non ho mangiato niente! …Sì, il panino. E due. Ma piccoli!»
- «Chi ha toccato la mia cassa?! C'erano dodici sigarette! Undici!»
- «Le mele cadono dal banco da sole! Io le raccolgo! È aiutare!»

**Arco**
1. *Compra e vendi.* Ti compra la roba piccola al 60% (si riusano i banchi di sotto).
2. *Il ricettatore piccolo.* Ti rivende le cose che i ragazzini rubano a te: il tuo accendino, a 1.000.
3. *Sandro lo vuole a spacciare.* **Tu**:
   - **lo mandi da Wu** a scaricare casse (onesto): Wu lo paga, lui si lamenta tutti i giorni, la banda ti rispetta;
   - **lo lasci a Sandro**: una catenina d'oro, poi i Grigi lo riportano dalla madre e i Cassetta restano senza banchiere
     (pedaggio +500 nel loro quartiere: «Per colpa tua!»).

### Briciola — Ilenia Usai, 12 anni, la segretaria delle Briciole
- **Chi**: la sorella piccola di **Sbarra** (Michele Usai, Quelli della rampa, `ricorrenti.md` §2). Fa le commissioni per la Famiglia
  con un orologio troppo grande e comanda i grandi, il fratello compreso.
- **Giro**:
  - Piazzetta del Forno 14-16;
  - il `flipper` alle 16:30 (consegna a Rocco);
  - Piazzetta del Pozzo 17-19;
  - alle 19:30 chiama il fratello a cena.
- **Voce**: sbrigativa da segretaria, «permesso, ho una consegna», tratta tutti come ritardatari.
- **Gag visiva**: `orologio_su` col `pacchetto` sotto il braccio, sempre di corsa.

**Primo incontro**
- «Permesso, ho una consegna. Per il signor Rocco. È urgente. Spostati.»
- «Non so cosa c'è dentro. Pesa come le scarpe. Sono scarpe? Non lo so.»
- «Mio fratello è Sbarra. Quello alto e scemo. Digli di tornare a cena.»
- «Duemila a consegna. Più la mancia. Tu sembri uno che non dà la mancia.»

**Ritorno**
- «Cinque consegne oggi! Cinque! Tu quante? Zero! Sfigato!»
- «Michele dice che sei a posto. Michele lo dice di tutti. Pure del cane.»
- «Mi tieni il pacco cinque minuti? Devo fare pipì. Non lo aprire.»

**Da sola**
- «Michele! A cena! L'ha detto mamma! Ha detto pure che sei scemo!»
- «Signor Rocco, il pacco è arrivato. Sì. Asciutto. Quasi asciutto.»
- «Scarpe nuove. No, non dico chi me le ha date. Bianche. Vedi?»

**Arco**
1. *Il pacco* (scena C4: lo apri o no).
2. *La consegna al posto suo.* Le fai una consegna (2.000) e scopri un indirizzo della Famiglia: si riusa «seguendo un fidato si trova
   la base».
3. *Sbarra fermato* (l'arco di Quelli della rampa, passo 3).
   - Briciola va da sola dalle madri fuori dalla Pietra dell'Onda col maglione. Una battuta sola, niente comicità:
     «È il maglione di Michele. Lo porto io. Mamma piange.»
   - **Se lo tiri fuori**: ti dà quello che ha di meglio, il giro delle consegne della Famiglia (luoghi e ore), che finisce nel
     Taccuino.

## 2.C Sei scene

### C1. Il pedaggio — `il_pedaggio` (con scelta)
**Quando e dove**: 14-19, all'imbocco di un vicolo della banda (`angolo`, `portone`). Una volta al giorno per banda.
**Ruoli**: `c` il capo (Ciuffo, o il capo della banda del quartiere); `r1`, `r2` due ragazzini.

- _I due si mettono in mezzo al vicolo (`aspetta`), il capo arriva dopo, con le mani in tasca._
- **capo**: «Alt. Strada dei Granchi. Mille lire.» oppure «Questo vicolo è nostro. Si paga.»
- **ragazzino 1**: «Mille! Ha detto mille!» / **ragazzino 2**: «Per lui duemila, guarda la faccia.»
- **[NUOVO ask]**:
  - **Paghi** (1.000; 500 se la banda ti vuole bene).
    - **capo**: «Bravo. Passa. Non correre, che è sporco.» Banda +2.
  - **Contratti** (500 e una cosa dallo zaino: bomboletta, accendino, gelato).
    - **capo**: «…Va bene. Ma la bomboletta è rossa?» Banda +1.
  - **Passi e basta**.
    - **capo**: «Ah sì? RAGAZZI!» Ti vengono dietro per 60 s e gridano i fatti tuoi, presi dal tuo diario:
      - «NINO HA IL DEBITO CON LO SQUALO!»
      - «NINO NON HA PAGATO L'AFFITTO!»
      - «NINO HA FREGATO LA VESPA!» (solo se è vero)
    - Chi sente prende la voce (il sistema delle voci di oggi). Banda −5.
  - **Ti metti a ridere**: **capo**: «Che ridi?! Il pedaggio è una cosa seria!» e poi come «passi e basta».

### C2. La guerra dell'acqua — `guerra_dell_acqua` (folla, con scelta)
**Quando e dove**: sabato 15-16 (se non piove), `marina` contro `scalo`: Granchi contro Binari.
**Folla**: 10-14 ragazzini con secchi e gavettoni; 15-20 grandi che guardano dai portoni e dai balconi.
**Ruoli**: `c` Ciuffo; `p` la Pulce; `g` un Grigio di passaggio; `v` una vecchia al balcone.

- _Due file a venti metri. Secchi a terra._ **Ciuffo**: «Granchi! Al mio tre! Uno! Due!»
- **Pulce**: «Ha detto due! Fuoco!» _Gavettoni (`throw` **[NUOVO]**)._
- **Ciuffo**: «Ho detto due! Due non vale!» oppure «Non era il tre, bastardi!»
- **la folla**: «Dai, più forte!» oppure «Mio figlio è quello bagnato!» oppure «Dieci lire sui Binari!»
- _Il Grigio entra in mezzo._ **Grigio**: «Basta! Assembramento! Tutti a…»
- _Gavettone in faccia. Silenzio. Tutti fermi._
- **vecchia, dal balcone**: «Bella mira!» oppure «Di nuovo! Non ho visto!»
- **Grigio**, gocciolando: «Chi è stato?» / **tutti i ragazzini**: «Lui!» _Indicano tutti uno diverso._
- **[NUOVO ask]**, se Nino è lì:
  - **Stai coi Granchi**: hai un secchio. Granchi +10, Binari −5; vince la tua banda.
  - **Stai coi Binari**: il contrario.
  - **Porti via il Grigio** («Agente, venga che si asciuga»): lui ti ringrazia, Grigi +, entrambe le bande −3 («Sbirro!»).
  - **Ti rubi il secchio**: tutti e due contro di te. Bagnato fradicio, bande +2 tutte e due: «Questo ha capito.»
- **Grigio**, alla fine: «La divisa! Bagnata! Domani ho l'ispezione, bastardi!»

### C3. Palle di neve — `palle_di_neve` (folla)
**Quando e dove**: la mattina dopo una nevicata, 8-10, Piazzetta del Pozzo o Piazzetta del Forno (Briciole).
**Folla**: 6-10 ragazzini dietro il muretto, i passanti che corrono (`aspetta`, poi via).
**Ruoli**: `b` Briciola; `g1`, `g2` due Grigi; `x` un benpensante col cappello.

- **Briciola**: «Quello col cappello! Ora!»
- _Il benpensante prende una palla di neve sul cappello._ **benpensante**: «Il cappello nuovo! Delinquenti! Sapete quanto costa?!»
- **Briciola**: «Bella mira, eh?! Un'altra! Al cappello!»
- _Arrivano i Grigi._ **Grigio 1**: «Chi tira la neve a un cittadino?»
- _Palla di neve sul cappello del Grigio 1. Silenzio assoluto._
- _Il Grigio 1 si china, fa una palla e la tira: prende in faccia il Grigio 2._
- **Grigio 2**: «Ma sei scemo?!» / **Grigio 1**: «Non volevo! Mirava là!»
- **la folla**: risate, «Un'altra!» oppure «Grigi contro Grigi!» oppure «Mai visto una cosa così!»
- **Briciola**: «Tutti via! Ci vediamo al Forno! Chi parla non ha la merenda!»
- Se Nino è lì e i ragazzini ti vogliono male: palla di neve su di te, `bagnato` **[NUOVO]** per 5 minuti (freddo, svago −).
  Se ti vogliono bene: «Nino! Prendi! Tira al Grigio!»
  - **[NUOVO ask]**: tiri (Grigi rancore, bande +5) oppure no.

### C4. Il pacco — `il_pacco_di_briciola` (con scelta)
**Quando e dove**: 16-16:30, Piazzetta del Forno, sulla strada per il `flipper`.
**Ruoli**: `b` Briciola; poi `r` Rocco (`rocco`) al Flipper.

- **Briciola**: «Nino! Tienimi il pacco. Cinque minuti. Devo fare pipì.»
- **Briciola**: «Non lo aprire. Non lo scuotere. Non lo annusare. Ciao.»
- _Ti dà il `pacchetto` (`give` **[NUOVO]**) e corre dentro il Forno._
- **[NUOVO ask]**:
  - **Aspetti**. Lei torna: «Bravo. Non l'hai aperto. Si vede. Hai le mani pulite.» Ti dà 500 di mancia: «Per l'onestà.»
  - **Lo apri**. Dentro c'è la torta di compleanno di Rocco, con la scritta ROCCO 50, ormai storta. Lei torna:
    «L'hai aperto! Si vede! È storta!»
    - Al `flipper`, Rocco: «Chi ha toccato la mia torta? …Nino?»
    - Famiglia rancore piccolo, `memo` **[NUOVO]**: «la torta». Rocco, quando ti incontra per una settimana: «La torta, Nino.»
  - **Te lo porti via**. Briciola esce, non ti vede e urla «MICHELEEE!». Sbarra ti trova entro un'ora («Fra… la torta di Rocco?»).
    - Briciole −20, Famiglia rancore.
    - Se la porti tu a Rocco: «Ah, ce l'hai tu. Grazie, la bambina è stanca.» Famiglia +, Briciole −10.

### C5. Le madri — `le_madri_alle_finestre` (folla)
**Quando e dove**: ogni sera 19:30, in tutti i quartieri delle bande.
**Folla**: 4-8 madri ai balconi e alle finestre (`window` **[NUOVO]**; senza, sui `portone`), tutte le bande in strada.
**Ruoli**: `m1`…`m4` le madri; `c` Ciuffo; `g` Gnocco.

- **madre 1**: «GABRIELEEE! A CASAAA!» / **Ciuffo**: «Arrivo! …Riunione non finita!»
- **madre 2**: «MARCOOO! LA PASTA È IN TAVOLA!» / **Gnocco**: «Arrivo! Corro! Corro!» _corre._
- **madre 3**: «SARAAA! Ti ho vista sul treno! Sul tetto del treno!»
- **madre 4**: «ILENIAAA! E porta tuo fratello! Prendilo per un orecchio!»
- **Ciuffo**, rimasto solo: «Allora… domani alle tre… Granchi…»
- **madre 1**: «GABRIELE, CONTO FINO A TRE!» / **Ciuffo**: «Granchi sciolti!» _Corre._
- **la folla** (le madri tra loro, da un balcone all'altro): «Il tuo ha la giacca bagnata!» / «Il tuo ha la faccia sporca!» /
  «Tutti e due delinquenti!» / «Uguali ai padri!»
- _In venti secondi la strada è vuota. Si sente solo il televisore del Garante dalle finestre._

È la scena da mettere per prima: **gira anche senza i modelli dei ragazzini** (si vedono solo le madri, i ragazzini sono voci da
dietro l'angolo e passi che corrono).

### C6. Il tuo nome sul muro — `nome_sul_muro` (con scelta)
**Quando e dove**: 17-19, un muro della banda (si riusano le tag `TOY` di `writer_vita.js`).
**Ruoli**: `w` lo scrittore della banda (PIX, GEKO, LUPO, TEO); `r` un ragazzino che fa il palo; `g` un Grigio che arriva.

- _Il ragazzino scrive. Scrive il tuo nome._
  - Con banda ≥ 20: «NINO RE» (oppure «NINO GRK», «NINO DEI NOSTRI»).
  - Con banda ≤ −10: «NINO SCEMO» (oppure «NINO PAGA I DEBITI», «NINO PUZZA»).
- **palo**: «Ohi, Nino! Ti piace? La N è venuta storta. Tutte e due.»
- _Arriva il Grigio._ **palo**: «Grigio!» _Il ragazzino lascia cadere la bomboletta._
- **[NUOVO ask]**:
  - **Raccogli tu la bomboletta**. Il Grigio: «Ah, è lei. NINO. C'è scritto. È lei.» `hunt` **[NUOVO]**.
    - Banda +15.
    - Il nome resta sul muro, e la gente lo legge.
  - **Fischi** (con la Pulce amica: due dita). I ragazzini spariscono, il Grigio non trova nessuno; banda +5.
  - **Stai fermo**. Il Grigio prende lo scrittore per un orecchio e lo porta a casa: «Andiamo da tua madre.» «No, da mia madre no!»
    - Banda −10: «Tu hai guardato e basta!»
    - Il nome resta.

## 2.D Quaranta battute

**Quando passi (15)**
- Oi, tu! Sì, tu col giubbotto! Niente. Ti volevo vedere girare.
- Mio fratello ti mena! Mio fratello ha quindici anni!
- Duecento lire per guardarti la Vespa. Se no ci guarda un altro.
- Scommetto che non sai fare la ruota. Io sì. Guarda. …Ahia.
- Ho rubato una mela. No, l'ho trovata. Sopra il banco. Ci stava.
- Mi fai salire sulla Vespa? Un giro. Mezzo. Fino all'angolo.
- Quello lì è Nino. Ha il debito. Lo sanno tutti. Ciao Nino!
- Mia madre dice che sei un delinquente. Fico. Che fai di preciso?
- Questa strada è nostra! Pure il tombino! Il tombino soprattutto!
- Ho trovato mille lire per terra. Erano tue? Adesso sono mie.
- Gara a chi arriva prima al muro! Via! …Ho vinto! Non lo sapevi.
- I Binari sono degli schifosi! Lo dico io, che sono dei Binari!
- Ho fatto gol da metà campo! Nessuno l'ha visto, ma l'ho fatto!
- Sputo più lontano di te. Prova. No, non su di me! Sulla strada!
- Mi presti la Vespa? Giuro che te la riporto! Intera! Quasi!

**Quando reagiscono a te (15)**
- [corre accanto] Corre! Corre! Lo inseguono! Chi ti insegue? Nessuno?
- [inseguito dai Grigi] Di qua! Il buco nel muro! Ma poi ci dai mille!
- [inseguito, al Grigio] È andato di là! …Non lo so dov'è di là.
- [arrestato] L'hanno preso! L'hanno preso! Lo dico a tutti!
- [ruba] L'ho visto! L'ho visto! …Se mi dai metà non l'ho visto.
- [gira armato] Mamma! C'è uno con la pistola! È vera? Fammela vedere!
- [ubriaco] È ubriaco! Guardate come cammina! Fai la riga dritta!
- [guida male] Ancora! Rifallo! Fai fischiare le gomme!
- [suona il clacson] Suona ancora! Fai quello della nave!
- [dipinge un muro] Mi fai fare una lettera? La N. So fare la N.
- [bagnato] Ah! È bagnato! Chi è stato? …Io no. Lui.
- [vestito strano] Ma come sei vestito? Sembri mio zio al matrimonio!
- [fermo a fissare] Che guardi? Pedaggio pure per guardare. Cento.
- [paga il pedaggio] Bravo! Così si fa! La prossima volta milleduecento.
- [non paga] Non paga! Non paga! NINO NON PAGA!

**La folla delle bande (10, fra loro, in capannello)**
- Chi ha il pallone? Tu! Te l'ho dato io! Ridammelo!
- Chi suona il campanello del Grigio? Tu! Hai alzato la mano! Vai!
- Il Grigio nuovo corre forte. Ma si stanca subito. È grasso.
- Io ho visto lo Squalo. Ha l'anello d'oro grosso così!
- Facciamo che io sono il Garante e voi applaudite. …Più forte!
- Il Grigio! Correte! …Io resto, sono piccolo, a me non fa niente.
- Chi m'ha fregato le figurine?! Erano nella calza! Nella calza!
- Il capo sono io! Chi dice di no gli tiro l'acqua! Tu? Eh? Tu?
- Chi ha mangiato la merenda di Tonio? Hai le briciole sulla faccia!
- Zitti, c'è l'Alfetta. …È andata. Fate finta di niente. Fischiate.

## 2.E Il sistema: «Le bande» (territori, tag, pedaggio, furti, palo e fattorino, la guerra dell'acqua, gli occhi della Risacca)

### La regola che viene prima di tutto: i ragazzini non si toccano
- **Il giocatore non può ferire un ragazzino, in nessun modo.**
  - Pugni, armi ed esplosioni non li colpiscono: se miri a un ragazzino il colpo non parte e Nino abbassa il braccio.
  - Se lo prendi a pugni, il pugno diventa `indica_su` e il ragazzino scappa ridendo: «Non mi prendi!»
- **Le auto.** I ragazzini non stanno mai sulla carreggiata: stanno su marciapiedi, piazzette e vicoli dove le auto non entrano.
  Se un'auto si avvicina, il ragazzino salta via sempre (schivata garantita, niente fisica di investimento) e l'auto frena.
- **Le armi in vista.** Se Nino tira fuori un'arma a meno di 20 m, i ragazzini scappano dietro l'angolo e spariscono. Tutte le bande
  −10, e le madri lo raccontano (voce: «Nino gira armato davanti ai bambini»).
- **Gli altri adulti.** Nessun Grigio, nessuno della Famiglia e nessun abitante picchia un ragazzino. Il ragazzino «preso» viene
  portato a casa per l'orecchio: cammina col Grigio fino al portone e sparisce. Fuori dalle scene di rissa e agguato, le bande non
  partecipano mai a `brawl`, `aggressione` o `agguato`.
- **Quello che tirano.**
  - Gavettoni d'acqua e palle di neve: a chiunque, giocatore compreso.
  - Sassolini: solo a lattine, vetri vuoti, bottiglie e **telecamere**.
  - Mai sassi alle persone, mai armi, mai coltelli.
- **Il sesso e la droga non li toccano.** Gnocco vende sigarette sfuse (1986), ma il giocatore non può dare a un ragazzino né
  sigarette né alcol: se ci prova, Nino si ferma. Non c'è un tasto.

### Territori e tag
- 4 bande, 4 quartieri (§2.A). Il territorio è l'insieme dei posti e dei vicoli intorno, come i quartieri di `strada_dipinta.js`.
- La tag della banda (GRK, BNR, BRC, CST) sui muri del quartiere segna il territorio. **Riuso**: la crew `TOY` di `writer_vita.js`
  diventa quattro crew piccole, è solo un dato.
- Dove una banda ha scritto sopra la tag di un'altra, il sabato c'è la guerra (C2).
- **Reputazione per banda** (−50…+50) **[NUOVO]**, quattro gruppi `bande:grk` e così via. Si parte da 0.

### Il pedaggio
- Si paga per passare a piedi in una strada della banda tra le 14 e le 19, se la reputazione con quella banda è sotto 20.
- Al massimo una volta al giorno per banda: 2-3 ragazzini si mettono in mezzo (`aspetta`).
- Costa 500 con reputazione da 0 a 19, 1.000 sotto zero; contrattando, 500 più un oggetto.
- Non pagare (scena C1) significa 60 s di urla coi fatti tuoi presi dal diario, e chi sente prende la voce. È un **rischio vero**:
  se la banda ha visto un tuo reato, lo grida.
- In Vespa o in auto non si paga, ma la banda −2 («Scappa in Vespa! Fifone!»).

### I furti
- Se la reputazione con una banda è sotto zero, una volta su quattro che passi nel suo territorio un ragazzino ti sfila una cosa
  piccola (accendino, bomboletta, sigarette) oppure 500-2.000 lire.
- Si riusa lo scippo che c'è, **senza violenza**: puoi solo rincorrerlo. Nei vicoli il ragazzino è più veloce di Nino
  (+15%, che non corre col fiatone).
- Se lo tocchi, ti ridà la roba: «Era uno scherzo! Tieni! Che permaloso!»
- Se ti scappa, la roba finisce a Gnocco, che te la rivende: l'accendino a 1.000.

### Il palo e il fattorino
- **Palo**: 2.000 l'ora, con reputazione ≥ 10.
  - Un ragazzino della banda del quartiere sta sul posto `angolo` più vicino a te.
  - Fischia quando un Grigio è a meno di 40 m: un fischio con l'icona, il suono già esiste nell'audio della strada.
  - Con la Pulce il raggio è 60 m e conta: «Due! Uno zoppo!»
- **Fattorino**: 2.000 a consegna, solo dentro il quartiere della banda (per due quartieri, 4.000 e due bande d'accordo).
  - Si riusano i `JOBS`/missioni con `pickup`/`drop`; il fattorino è un ruolo.
  - Il fattorino **non ha testimoni**: nessuno guarda un ragazzino col pacchetto.
  - Una volta su dieci lo ferma la madre e il pacco finisce sul tavolo della cucina. Lo ritiri al `portone`, con la ramanzina:
    «Questo è suo? Si vergogni! Ha l'età di mio marito!»

### La guerra dell'acqua e delle palle di neve
- **Il sabato alle 15** (se non piove) due bande con la tag sovrapposta fanno la guerra (scena C2). È **[NUOVO]** in `RECURRING`.
- **La mattina dopo la neve** (le precipitazioni 22:30-3:00 ci sono già), palle di neve nella piazzetta delle Briciole (C3).
- **Numeri**:
  - se stai con una banda: +10 con lei, −5 con l'altra;
  - ogni colpo preso ti lascia `bagnato` **[NUOVO]** per 5 minuti (svago −0,05, e chi passa dice le battute «bagnato» di
    `battute.md`);
  - a un Grigio bagnato, Repressione +0: è uno scherzo, nessuno lo mette a verbale (lui lo racconta alla moglie).

### Gli occhi della Risacca
- Con reputazione ≥ 30 una banda offre «gli occhi». Conta come **collaboratore** di un membro della Risacca (il tetto di 3 di oggi).
- **Cosa danno**:
  - avvisano delle perquisizioni nel loro quartiere quando la Repressione è ≥ 3: un'ora prima, un fischio e un biglietto;
  - le voci della strada nel quartiere arrivano a te;
  - **tirano sassolini alle telecamere** del loro quartiere: si riusa il verbo `lancia`, 1 telecamera a settimana, Repressione della
    zona −;
  - scrivono l'onda col gesso: si riusa `scrivi_onda`, Morale +1, una a settimana.
- **Il rischio**: se un ragazzino viene preso a scrivere l'onda, non gli succede niente di violento. I Grigi vanno dalla famiglia
  (multa 10.000 alla madre), e quella madre e tutta la banda −15 con te: «Per colpa tua mia madre ha pagato!» Non si recluta un
  ragazzino nella Risacca come membro: solo come occhi.

### Prima dei modelli: lo strato senza corpi
- C5 «Le madri alle finestre» gira subito: si vedono solo le madri, i ragazzini sono voci da dietro l'angolo.
- I **gavettoni dai balconi e dai tetti** sul giocatore (`throw` **[NUOVO]**) con una voce che ride e scappa:
  «Preso! Corri, Tonio, corri!» Non serve vedere chi è.
- Le **tag nuove** che compaiono la mattina, e il tuo nome sul muro (C6, solo il risultato).
- I fischi della vedetta, senza la vedetta.

**Cosa si riusa e cosa è [NUOVO]**

| cosa | riuso | [NUOVO] |
|---|---|---|
| ragazzini | — | **modelli 10-15 anni (gruppo personaggi)**, età in `popolo.js`, scuola 8-13 |
| tag e territorio | crew `TOY`, `writer_vita.js`, `strada_dipinta.js` | 4 crew-banda (dato) |
| pedaggio | voci e diario (`popolo.js`) | il blocco in strada (`aspetta`), il pagamento |
| furti | scippo esistente | ragazzino più veloce e mai ferito, la rivendita da Gnocco |
| palo, fattorino | `JOBS`, `pickup`/`drop`, collaboratori della Risacca | il fischio con l'icona |
| occhi | `lancia`, `scrivi_onda`, i collaboratori | — |
| guerra dell'acqua | precipitazioni, posti `angolo`/`portone` | `throw`, lo stato `bagnato`, la voce in `RECURRING` |
| sicurezza | — | i ragazzini non si colpiscono, la schivata delle auto, la fuga davanti alle armi |

---

# 3. I PESCATORI — «L'alba al molo»

## 3.A Il mondo in 6 righe
1. **Chi.**
   - Gli 8 pescatori del molo (`popolo.js` OUTDOOR, turno 3-11) e le loro mogli.
   - Peppina, il banditore dell'asta; i facchini del ghiaccio; la Pescheria Serra («Fresco di Ieri»).
   - L'Ispettore della Quota dell'Impero.
   - Fuori città, la Cala dei Pescatori (`pescatori_s`).
2. **Dove.**
   - `molo`, `molo_vecchio` (i pescherecci ormeggiati), `calata` (la pesata, i barili `fuoco`);
   - `pescheria` e Piazza della Marina (`banco_pesce`), la scala dei pescatori;
   - sotto, il Deposito dei contrabbandieri, con la grata sulla calata sotto il Magazzino Neri.
3. **Quando.**
   - 3:30 caffè e parolacce; 4 si esce;
   - 6-8 l'asta (RECURRING `pesce`, esiste);
   - 8 la pesata della Quota;
   - 10-11 si lavano le casse e si ricuciono le reti; a mezzogiorno tornano i pescherecci; 16 osteria.
   - Lunedì e giovedì arriva la nave dell'Impero, e la Quota parte con lei.
4. **Fazioni ed economia.**
   - L'Impero vuole la **Quota**: il 30% del pescato, pesato al grammo.
   - La Famiglia compra il resto sottoprezzo e ci mette sotto le sigarette.
   - I Marsigliesi pagano la notte per una barca che «esce senza reti».
   - I Grigi mangiano gratis.
5. **Le bugie.** Tutti mentono sul pescato: poco all'Ispettore, tanto alle mogli, il doppio al bar.
6. **Il giocatore.** Un lavoro all'alba (barca, reti, asta), la merce sotto il pesce, l'Ispettore da evitare o da comprare, la
   motovedetta.

## 3.B I quattro ricorrenti

### Venti Chili — Gavino Serra, 61 anni
- **Chi**: fratello del padrone della Pescheria Serra, pescatore da quarantacinque anni. Ogni giorno racconta che ha preso un pesce
  da venti chili, e che gliel'hanno fregato: è scappato, se l'è preso il gabbiano, l'ha requisito l'Impero.
- **Giro**: `molo` 3:30-11; `osteria` 16-20; la domenica sul Molo Vecchio con la canna.
- **Voce**: urla, giura su tutto, si offende se non gli credi, cambia la cifra a metà frase.
- **Gag visiva**: `braccia_su` larghe per far vedere la misura, con in mano una sardina (`pesce`). Il pesce che mostra è sempre
  piccolissimo.

**Primo incontro**
- «Venti chili! Così! Te lo giuro su mia madre! Che è viva, eh!»
- «Questo? Questa è l'esca! Il pesce vero l'ho ributtato! Era troppo!»
- «Quarantacinque anni di mare! Mai presa una sardina! Solo pesci grossi!»
- «Che ridi? Chiedi a Peppina! …No, a Peppina non chiedere.»

**Ritorno**
- «Nino! Stamattina un tonno! Giuro! L'Ispettore me l'ha preso tutto!»
- «Ieri ventidue chili. Netti. Lordi venticinque. Col gabbiano trenta.»
- «Domani vieni in barca. Ti faccio vedere. Se non abbocca è colpa tua.»

**Da solo**
- «Gabbiano di merda! Ridammelo! Era mio! Era grosso così!»
- «Peppina! A seimila! È fresco! L'ho preso io! Più o meno io!»
- «Il motore fa tu-tu-tu-tu… e poi niente! Come mio cognato!»

**Arco**
1. *In barca.* Ti porta fuori all'alba (§3.E).
2. *Il pesce vero.* Una mattina prende davvero un pesce enorme (una ricciola da 18 chili), e lo vedi solo tu. Alla pesata l'Ispettore
   lo vuole tutto per la Quota. **Tu** (scena C4):
   - **testimoni per lui**;
   - **lo nascondi sotto il ghiaccio**;
   - **lo vendi tu a Sandro** (30.000; Gavino non ti parla più).
3. *La fine.*
   - **Il pesce si salva**: ricciola arrosto sui barili della calata, festa (C4). Gavino la racconta già da quaranta chili.
   - **Non si salva**: per tre giorni dice la verità («Tre sardine. Piccole.»). Al quarto: «Cinquanta chili! Te lo giuro!»

### La Martellina — Peppina Satta, 55 anni, banditore dell'asta
- **Chi**: fa l'asta del pesce al molo da trent'anni. Più veloce di tutti, non si fa fregare, insulta i clienti per nome.
- **Giro**: `molo` 5:30-8:30 (l'asta); `pescheria` 9-12; la domenica l'asta ridotta.
- **Voce**: urla prezzi, indica la gente, decide lei chi ha alzato la mano.
- **Gag visiva**: in piedi sulla `cassa` (`indica_su`, poi `merce`). Quando dice «Venduto!» punta il dito, e la gente si tocca il naso
  per paura di aver comprato.

**Primo incontro**
- «Seimila la cassetta! Chi dice sei? Tu, col giubbotto? Alza la mano!»
- «Sei Nino? Quello del debito? Allora paghi in contanti. Prima.»
- «Non si tocca! Si guarda, si compra, poi si tocca! Che sei, un Grigio?»
- «Venduto! Al signore che si grattava il naso! Sì, tu! Paga!»

**Ritorno**
- «Nino! Triglie! Compra o sparisci, che mi copri la merce!»
- «Ieri col motorino m'hai fatto scappare un cliente. Oggi ne compri due.»
- «Porti pesce tuo? Ti tengo il dieci per cento. Agli altri il quindici.»

**Da sola**
- «Gavino, se dici un'altra volta venti chili ti peso io!»
- «Signora, lo compra o lo adotta? Sono dieci minuti che lo guarda!»
- «Asta chiusa! Chi non ha comprato, domani! Chi ha comprato, paga!»

**Arco**
1. *Compri all'asta* (C2).
2. *Vendi il tuo pescato con lei*: 10% per lei (15% se non ti conosce).
3. *L'Ispettore vuole spostare l'asta* alla dogana del porto cargo: «Per comodità dell'Impero.» Peppina organizza l'**asta muta**
   (C2, versione finale): si vende coi gesti, nessuno dice un numero e l'Ispettore non riesce a scrivere niente.
   - **Se l'aiuti** (ti metti in mezzo a fare i gesti): l'asta resta al molo, Peppina entra nella Risacca, Morale +3.
   - **Se no**: per due settimane l'asta si fa alla dogana, i prezzi ai pescatori calano del 20% e la calata è incazzata.

### Il Bilancino — Ispettore Aurelio Cossu, 42 anni, Ufficio del Tributo
- **Chi**: pesa la Quota dell'Impero ogni mattina alle 8 sulla calata. Voleva un ufficio al caldo con la pianta e l'hanno mandato al
  pesce. Ha paura dei pesci (si muovono), schifo del mare, e il pesce gratis gli piace tantissimo.
- **Giro**:
  - `calata` 7:45-9:30;
  - `bar` di Gino 10 (la colazione con l'orata nella borsa);
  - Uffici del Garante il pomeriggio;
  - lunedì e giovedì all'alba al porto cargo con la Quota.
- **Voce**: burocrate lamentoso, pignolo sui grammi, ricattabile, scappa indietro di un passo se una cassa si muove.
- **Gag visiva**: `legge_su` col registro (`carta`), sempre a un metro e mezzo dalle casse (`osserva`), col braccio teso per pesare.

**Primo incontro**
- «Ferma la cassa! Il trenta per cento è dell'Impero! Giù le mani!»
- «Non me lo avvicini! Si muove! Perché si muove? Era morto!»
- «Io avevo un ufficio! Col termosifone! E una pianta! E adesso guarda!»
- «Non mi schizzi! Non mi schizzi! È il cappotto buono!»

**Ritorno**
- «Ancora lei! L'orata ce l'ha? No? Allora le peso tutto! Pure le scarpe!»
- «Ieri un polpo m'ha preso la penna! Ho urlato davanti a tutti!»
- «Se pesano giuste io sotto non guardo! Mai! Non ho detto niente!»

**Da solo**
- «Tre chili e duecento! Duecento! Chi s'è mangiato duecento grammi?!»
- «Mamma, sì, mangio. Pesce. Sempre pesce. Mamma, il pesce mi fa schifo.»
- «Via, gabbiano di merda! M'ha cacato sul registro! Sul registro!»

**Arco**
1. *La pesata* (C3): pesa le tue casse.
2. *L'orata.* Un'orata al giorno, oppure 5.000, e sotto il ghiaccio non guarda (§3.E).
3. *L'ispettore dell'ispettore.* Il giovedì dopo la nave sbarca un funzionario dell'Impero a controllare il Bilancino, e lui va nel
   panico. **Tu**:
   - **lo aiuti** (quel giorno casse pulite, avvisi Sottoghiaccio): ti deve un favore grosso, una settimana senza controlli;
   - **lo lasci cadere**: arriva l'Ispettore Nuovo, che guarda sotto tutto, e il rischio del contrabbando raddoppia per due settimane;
   - **lo fotografi mentre prende l'orata** (si riusa `fotografa`, foto compromettenti): è tuo per sempre e senza orate, ma se la
     foto la trova la Tutela, il Bilancino sparisce.

### Sottoghiaccio — Ciriaco Manca, 36 anni
- **Chi**: pescatore sul peschereccio «Santa Rita». Sotto il ghiaccio delle casse mette sigarette americane, cassette, dollari e vodka.
  Lavora per Sandro e qualche notte per i Marsigliesi.
- **Giro**:
  - `molo_vecchio` 4-11;
  - la grata della `calata` alle 11:30 (il deposito di sotto);
  - `magazzino` alle 14;
  - `pontile` di notte, il lunedì.
- **Voce**: gentile, sorrisone. Parla sempre del pesce per non parlare d'altro, ogni cosa è «fresca».
- **Gag visiva**: la `cassa` in spalla, `fuma_su` con l'altra mano. Le sue casse gocciolano meno delle altre.

**Primo incontro**
- «Vuoi una cassa? Fresca! Non guardare sotto! Ho detto non guardare!»
- «Ci metto tanto ghiaccio. Tanto tanto. Il ghiaccio costa. Pago io.»
- «Sigarette? Quali sigarette? Ho detto pesce! Chi ha detto sigarette?!»
- «Ti serve un lavoro? Porta la cassa dal molo al Neri. E non cadere.»

**Ritorno**
- «Nino! Oggi le casse pesano poco. Pesce leggero. Vai tranquillo.»
- «Il Bilancino ha la febbre. Oggi pesce pesante. Cinquemila a cassa.»
- «La cassa di ieri l'hai fatta cadere! T'ho visto! Paghi tu, stronzo!»

**Da solo**
- «Santa Rita, fa' che non apre la quinta cassa. Le altre, va bene.»
- «Didier, ce l'hai il ghiaccio? No, non da bere! Per la cassa!»
- «Che c'è nel pesce? Il pesce! Che ci deve essere nel pesce? Vattene!»

**Arco**
1. *Il trasporto delle casse* (§3.E).
2. *Da che parte stai*:
   - **la linea della Famiglia**: casse per Sandro, a soldi;
   - **la linea della Risacca**: parti radio e volantini sotto il pesce per Radio Scirocco, a Morale.
   Ciriaco le fa tutte e due, ma per te ne sceglie una: «Io non chiedo. Tu non chiedi. Il pesce non parla.»
3. *La motovedetta* (C6): una mattina ferma la Santa Rita con te a bordo.
   - **Butti le casse a mare**: la merce si perde. Il giorno dopo i Granchi la trovano sulla spiaggia e Gnocco vende le americane
     bagnate a 100 lire.
   - **Nascondi tutto nella stiva**, sotto le reti.
   - **Paghi** 10.000.
   - **Finale**: se Ciriaco non viene preso, ti regala la Santa Rita per una notte (la barca per una missione). Se viene preso, sta tre
     giorni alla Pietra dell'Onda e torna senza sorriso. Il primo giorno non dice «fresco».

## 3.C Sei scene

### C1. Il caffè delle quattro — `caffe_delle_quattro` (folla)
**Quando e dove**: ogni giorno 3:30-4:15, `molo`, attorno al barile (`fuoco`).
**Folla**: 6-8 pescatori (`scalda`, `fuma_su`, `lavora` sulle reti).
**Ruoli**: `v` Venti Chili; `c` Sottoghiaccio; `x`, `y` due pescatori a caso.

- **x**: «Porca miseria che freddo. Chi ha il caffè?» / **y**: «Io. Ma è di ieri.»
- **Venti Chili**: «Ieri sera all'osteria ho detto venti chili, e mi hanno creduto!»
- **x**: «Nessuno t'ha creduto. Ti hanno offerto da bere per farti stare zitto.»
- **Venti Chili**: «Uguale! Ho bevuto!»
- **y**: «Mia moglie dice che se torno senza pesce dormo in barca.» / **x**: «Dormi in barca da tre anni! Lo sanno tutti al bar!»
- **Sottoghiaccio**: «Ragazzi, chi mi presta ghiaccio? Tanto. Ve lo rendo. Fresco.»
- **la folla**: «Il ghiaccio te lo paghi!» oppure «Ancora il ghiaccio?» oppure «Che ci fai con tutto 'sto ghiaccio?»
- **Sottoghiaccio**: «Il pesce. Che domande.»
- Se Nino arriva tra le 3:30 e le 4:30:
  - **Venti Chili**: «Nino! Vieni in barca? Ti pago ottomila. E ti faccio vedere un pesce.»
  - **[NUOVO ask]**: accetti (§3.E) oppure no («Vabbè. Poi non dire che non c'era.»).

### C2. L'asta — `asta_del_pesce` (folla, con scelta)
**Quando e dove**: ogni giorno 6:15-7:45, `molo` / Piazza della Marina (`banco_pesce`). È il RECURRING `pesce`, che esiste: qui gli si
dà la voce.
**Folla**: 15-25 (`aspetta`, `indica_su`, `discute_su`), osti, vecchie, Ciuffo che ruba.
**Ruoli**: `p` Peppina; `v` Venti Chili; `o` un oste; `n` una vecchia; `c` Ciuffo (quando ci sono i modelli).

- **Peppina**, sulla cassa: «Triglie! Cassetta! Cinquemila! Chi dice cinque?»
- **l'oste**: «Quattro.» / **Peppina**: «Quattro? Ma vai a cagare! Cinque!»
- **la vecchia**: «È fresco?» / **Venti Chili**: «Fresco? Si muove ancora! Guardi!» _Non si muove._
- **Peppina**: «Cinque e mezzo! Al signore col cappello! Venduto!» / **un uomo**: «Io mi grattavo!»
- **Peppina**: «Hai grattato, hai comprato! Paga!»
- **la folla**: «Ha ragione lei!» oppure «Grattati di meno!» oppure «Io non mi muovo più.»
- _Ciuffo passa dietro le casse e sparisce con un pesce._ **Peppina**: «GABRIELE! Lo dico a tuo padre!»
  _Il padre è lì._ **il padre**: «Gabriele! Ridalle il pesce! …Quale hai preso, la spigola?»
- **[NUOVO ask]**, se Nino è lì:
  - **Compri** una cassetta (5.000-7.000): è pesce per la dispensa, oppure da rivendere al `bar` (Gino ne compra una a 8.000 il venerdì).
  - **Vendi** le tue casse, se sei uscito in barca: Peppina tiene il 10%.
  - **Rilanci per finta** per far salire il prezzo a Gavino: pescatori +5, e se nessuno rilancia sopra di te, la cassetta è tua.
  - **Asta muta** (arco di Peppina, passo 3): tutti coi gesti. **Ispettore**: «Quanto ha detto?» **Peppina**: _gesto._
    **Ispettore**: «Questo non è un numero!» Tu fai i gesti con loro, e l'asta resta al molo.

### C3. La pesata — `la_pesata` (con scelta)
**Quando e dove**: ogni giorno 8-9, `calata`.
**Ruoli**: `i` il Bilancino; `c` Sottoghiaccio; `x` un pescatore; un Grigio di scorta che si annoia.

- _Cinque casse in fila. L'Ispettore col registro, a un metro e mezzo._
- **Ispettore**: «Cassa uno. Tre chili e quattro. Trenta per cento all'Impero. Prossima.»
- **x**: «Il trenta per cento di tre chili! Che se ne fa l'Impero di un chilo?!»
- **Ispettore**: «Non urlare! Non urlare che mi agito! Prossima!»
- _La cassa due si muove. L'Ispettore salta indietro._ **Ispettore**: «Si è mossa! L'ha vista? Si è mossa!»
- **Grigio di scorta**: «È un granchio, Ispettore.» / **Ispettore**: «Lo ammazzi! Lo ammazzi, agente! Mi guarda!»
- _La cassa cinque è di Sottoghiaccio, pesa troppo._ **Ispettore**: «Questa pesa tanto. Che c'è sotto?»
- **Sottoghiaccio**: «Ghiaccio, Ispettore. Ghiaccio fresco.»
- **[NUOVO ask]**, se Nino è lì:
  - **Distrai l'Ispettore**: gli dai un'orata (`porge`, o 5.000). «Oh. Grazie. …La cassa cinque? Pesa giusto.»
    - Pescatori +5.
    - Il Grigio di scorta ti ha visto: corruzione, gravità bassa.
  - **Non fai niente**: una volta su due l'Ispettore guarda sotto (§3.E per le percentuali). Se trova la merce, Sottoghiaccio va alla
    Pietra dell'Onda, Repressione +1 sulla calata.
  - **Indichi la cassa** («Ispettore, guardi sotto»):
    - Sottoghiaccio è preso;
    - la Famiglia ti segna (rancore, Sandro alza il debito di 20.000: «La merce l'hai persa tu»);
    - Grigi +, pescatori −30.
    - Per una settimana la calata non ti parla. I barili si spengono quando arrivi.

### C4. Il pesce vero — `il_pesce_vero` (folla)
**Quando e dove**: a mezzogiorno, al ritorno dei pescherecci, `molo_vecchio`. Una volta, nell'arco di Venti Chili.
**Folla**: 20-30: pescatori, mogli, Peppina, ragazzini, i senzatetto dalla calata.
**Ruoli**: `v` Venti Chili; `p` Peppina; `i` il Bilancino; `m` la moglie di Gavino.

- _Venti Chili scende dalla barca abbracciato a una ricciola enorme (scenografia; senza, la `cassa` grande e tutti attorno)._
- **Venti Chili**: «VENTI CHILI! VE L'AVEVO DETTO! VENTI CHILI!»
- **Peppina**: «Mettila sulla bilancia. …Diciotto.» / **Venti Chili**: «Lordi venti!»
- **la moglie**: «Gavino! Quarantacinque anni! È vero! Allora era tutto vero?!»
- **Venti Chili**: «…No. Questo è vero. Gli altri no.»
- **la folla**: «Ce l'ha fatta!» oppure «Fammi toccare!» oppure «Somiglia a mio suocero!»
- _Arriva il Bilancino col registro._ **Ispettore**: «Questo è pesce di Quota. Lo pesiamo. Tutto.»
- **Venti Chili**: «Il trenta per cento! Ti do la coda!»
- **Ispettore**: «Tutto all'Impero! Tutto! Non piangere, Gavino, mi agiti!»
- **la folla**: «Buuu!» oppure «Ladro!» oppure «Vai a pescartelo tu!»
- **[NUOVO ask]** (arco di Venti Chili, passo 2):
  - **Testimoni per lui** («L'ha preso fuori dalla zona, l'ho visto io»): l'Ispettore non può scriverlo. Si mangia: festa sui barili,
    pescatori +15.
  - **Lo nascondi sotto il ghiaccio** mentre lui scrive: lo rubi all'Impero sotto gli occhi di tutti. Festa uguale, ma il Grigio di
    scorta se lo ricorda.
  - **Lo vendi a Sandro** (30.000). Gavino: «Tu…» _e basta, per una settimana._
- _Se c'è la festa:_ **Venti Chili**, alla fine, a chi arriva dopo: «Quaranta chili. Così. Chiedi a Nino.»

### C5. Le reti — `chi_ha_rotto_la_rete`
**Quando e dove**: 10-11:30, `calata`, le reti stese per terra (`lavora`, `raccoglie`).
**Ruoli**: `x`, `y` due pescatori; `c` Sottoghiaccio; `m` un Marsigliese che passa (di giorno no: un suo motoscafo ormeggiato basta).

- **x**: «Chi m'ha rotto la rete? Un buco così! Ci passa un'Alfetta!»
- **y**: «Io no! Io la rete non la tocco da una settimana! Non pesco!»
- **x**: «Ecco perché tua moglie compra il pesce da Peppina!»
- **y**: «Ripetilo! Ripetilo, se hai il coraggio!» _`discute_su`, si avvicinano._
- **Sottoghiaccio**: «È stato il motoscafo dei francesi. Stanotte. Senza luci.»
- **x** e **y**, insieme: «I FRANCESI!» _si girano verso il motoscafo._
- **x**: «Quando torna gli piscio nel motore! Giuro! Davanti a tutti!»
- **la folla** (se ci sono 3-4 alla calata): «Ha ragione!» oppure «Fate pace!» oppure «Ridategli la rete!»
- Se Nino passa: **x**: «Tu! Sai cucire? No? Allora tieni la rete. Così. Fermo per un'ora.» Lavoretto da 3.000 (`lavora`,
  10 min).

### C6. La motovedetta — `la_motovedetta` (con scelta)
**Quando e dove**: all'alba, in mare, a 200-400 m dal porto vecchio. Una volta su cinque che esci con Sottoghiaccio. Si riusa il giro
della motovedetta intorno all'isola.
**Ruoli**: `c` Sottoghiaccio; `g` il Grigio della motovedetta (al megafono, voce sola).

- _La motovedetta si accosta col faro._ **Grigio**, al megafono: «Santa Rita! Motore spento! Controllo!»
- **Sottoghiaccio**, sottovoce: «Non è niente. Sorridi. Pensa al pesce.»
- **Grigio**: «Che avete a bordo?» / **Sottoghiaccio**: «Pesce! Fresco! Volete una cassa?»
- **Grigio**: «Quante casse?» / **Sottoghiaccio**: «Sei.» _Sono otto._
- **[NUOVO ask]** (10 secondi):
  - **Butti a mare le due casse buone**: la merce è persa (Famiglia: debito +20.000; Risacca: niente risorse). La mattina dopo le casse
    arrivano alla `spiaggia` e chi le trova le apre: i Granchi, Gnocco, Spugna.
  - **Nascondi nella stiva**, sotto le reti: una prova di furtività al 50%, al 70% con pescatori ≥ 30 («Le reti puzzano, il Grigio
    non scende»).
    - Se va: «Sei casse. Pesce. Andate.»
    - Se no: Sottoghiaccio è arrestato, a te multa di 15.000 e Repressione +1.
  - **Paghi** 10.000: **Grigio**: «Sei casse. Ho contato bene. Andate.» Ti ricorda (corruzione).
- **Sottoghiaccio**, dopo: «Visto? Niente. Te l'avevo detto. Pesce fresco.» _Gli tremano le mani._

## 3.D Quaranta battute

**Quando passi (15)**
- Che cazzo di freddo. Alle quattro il mare è di ghiaccio, giuro.
- Ieri un polpo m'ha preso il dito. Gliel'ho preso io a lui. Pari.
- Mio figlio vuole fare il pescatore. L'ho mandato a scuola a calci.
- Chi m'ha fregato i guanti?! Erano sul motore! Due minuti fa!
- Sono in piedi dalle tre! Dalle tre! Non mi parlare, che mordo!
- Mia moglie dice che puzzo di pesce. Ma se le porto il pesce, zitta.
- Cinque ore in mare e mi vendono la cassa a quattromila. A quattro!
- Il Bilancino m'ha pesato il panino! Il mio panino! Davanti a tutti!
- Peppina, non urlare! Sono qui! Ti sento da casa mia, ti sento!
- Questa rete l'ho ricucita io. Brutta, eh? Però tiene. Quasi.
- Niente! Tre ore e niente! Neanche una scarpa! Mare di merda!
- Gavino ha detto venti chili? Io ho visto la sardina. Era così.
- Chi ha lasciato la cassa vuota in mezzo? Ci sono cascato due volte!
- Ho le mani che non sento. Se ti do uno schiaffo non lo sento neanche.
- Signora! Pesce fresco! Signora, dove va?! Signora! Torni qua!

**Quando reagiscono a te (15)**
- [corre accanto] Piano sul molo, che è bagnato! Se cadi in acqua non ti tiro su!
- [inseguito dai Grigi] Sotto le reti! Puzzano, il Grigio non si china!
- [inseguito, al Grigio] Chi? Uno che correva? Qui corrono tutti. Fa freddo.
- [arrestato] Io non lo conosco! Mai visto! …Ciao Nino!
- [ruba una cassa] Ehi! Quella è mia! …Era rubata pure lei. Vabbè, vai.
- [gira armato] Mettila via! Spaventi il pesce! E me!
- [ubriaco] Ubriaco alle sei? Dilettante. Noi alle sei abbiamo già finito.
- [guida male sul molo] Il molo non è una strada! Finisci in mare, scemo!
- [suona il clacson] Suona, suona! Così il pesce scappa e ti pago io!
- [bagnato] È caduto in acqua! Gavino, vieni a vedere! È caduto!
- [vestito strano] Dove vai vestito così, a sposarti? Al molo?
- [fermo a fissare il mare] Che guardi? È mare. Fa schifo uguale tutti i giorni.
- [porta una cassa] Piegati con le gambe, non con la schiena! Vedi come sono io?
- [compra all'asta] Hai pagato sei? Io l'avrei pagato quattro. Pollo.
- [esce in barca] Torna con qualcosa, eh! Se no Peppina ti vende a te!

**La folla del molo (10, fra loro, in capannello)**
- Hai visto il motoscafo dei francesi? Senza luci! Alle tre!
- Il Bilancino oggi ha pesato pure il ghiaccio. Il ghiaccio!
- Ti aiuto con le reti! …Dopo il caffè. E la sigaretta. Domani, dai.
- Peppina m'ha venduto le mie triglie. Le mie! Gliele avevo date io!
- Chi ha preso il mio caffè? C'era il mio nome sopra! Col gesso!
- Mio cognato è un ladro! M'ha fregato la rete e dice che è sua!
- Gavino, tienimi la cassa che vado a pisciare. …All'osteria. Torno.
- Il motore è morto. Di nuovo. L'ho preso a calci. Adesso va.
- Ciriaco, perché la tua cassa non gocciola? Le nostre sì!
- Zitti, arriva l'Ispettore. Fate le facce povere. Più povere.

## 3.E Il sistema: «L'alba al molo» (il lavoro del pescatore, l'asta, la Quota, il contrabbando sotto il pesce)

**Il lavoro all'alba**
- **L'ingaggio**: al `molo` tra le 3:30 e le 4:30 (C1), con Venti Chili o con un pescatore libero.
  - **Riuso**: i posti di lavoro OUTDOOR `pescatore` (8 posti, 3-11). Nino prende un posto a giornata quando un pescatore manca o
    vuole un aiuto.
  - **Paga fissa**: 8.000 la giornata, più la parte del pescato (sotto).
- **L'uscita**: il gozzo (si riusa il mezzo, F dal pontile) fino a un posto `pesca_*`.
  - **[NUOVO] la rete**: un'azione «cala la rete» sul posto, si aspettano 20 minuti di gioco (un minuto e mezzo vero), poi
    «salpa la rete».
  - **Il pescato**: 2-6 cassette, secondo il posto, l'ora e il tempo.

  | condizione | effetto sul pescato |
  |---|---|
  | rete calata prima delle 5 | +1 cassetta |
  | posti lontani (fuori dalla rada) | +1, ma 20% di incontrare la motovedetta |
  | neve o pioggia nella notte | −1 |
  | domenica | +0, ma la sera i pescatori dicono di te «quello che lavora la domenica» |

- **La parte di Nino**: a giornata, metà del ricavato delle sue cassette, più gli 8.000.
- **Con un gozzo «tuo»** (in prestito da Venti Chili con pescatori ≥ 30): il ricavato è tutto tuo, ma niente paga fissa.

**L'asta (6-8, il RECURRING `pesce` che esiste)**
- **Prezzo della cassetta**: base 6.000 (il pesce di `economia.js` vale 4 a unità; una cassetta ≈ 1,5 unità).

  | giorno | prezzo |
  |---|---|
  | lunedì e giovedì (nave) | −20%, perché la gente aspetta la roba dell'Impero |
  | venerdì | +30% (il pesce del venerdì, la fila in pescheria) |
  | domenica | −30% (l'asta ridotta) |

- **Peppina tiene** il 10%, o il 15% se pescatori < 10.
- **In alternativa**: si vende direttamente a Sandro al `magazzino` al 60% del prezzo d'asta. Niente Quota (il pesce non pesato è
  già contrabbando), ma la Famiglia ti segna come «uno che porta».

**La Quota dell'Impero (8, `calata`)**
- Il Bilancino pesa le cassette e il 30% va al Tributo: con 5 cassette se ne pagano 1,5, arrotondato a 2 se ha la luna storta.
- **Saltare la pesata**: è pesce non pesato. Se un Grigio ti ferma con le casse: multa di 15.000, il pesce sequestrato (finisce al
  bar della caserma), gravità bassa (contrabbando).
- **Comprarlo**: un'orata (una cassetta tua) o 5.000. Pesa il 20% invece del 30% e sotto non guarda.

**Il contrabbando sotto il pesce (Sottoghiaccio)**
- **La cassa doppia**: sotto il ghiaccio c'è il fondo con la merce. La porti dal `molo_vecchio` alla grata della `calata` (il deposito
  di sotto) o al `magazzino`.
  - **Linea della Famiglia**: 15.000 a cassa. Merce: sigarette americane, vodka, cassette, dollari.
  - **Linea della Risacca**: niente lire, ma risorse: 2 parti radio, oppure 20 volantini, oppure 1 documento falso. Morale +2 a
    consegna.
- **Il rischio** che l'Ispettore guardi sotto:

  | situazione | probabilità |
  |---|---|
  | base | 10% |
  | se non l'hai comprato | 40% |
  | se lo hai tradito (C3, «indichi la cassa») | 60% |
  | il giovedì con l'ispettore dell'Impero (arco del Bilancino) | 70% |
  | con l'Ispettore Nuovo | ×2 |

- **Se ti prende**:
  - la merce è persa;
  - Repressione +1 sulla calata;
  - Grigi −;
  - se era della Famiglia, debito con Sandro +20.000 («La merce l'hai persa tu, la ripaghi tu»);
  - se era della Risacca, la Tutela ha una pista: Repressione +1 in più.
- **La motovedetta**: una volta su cinque, se esci con merce a bordo (C6). Uscite: buttarla, nasconderla (50% o 70%), pagare 10.000.

**Reputazione «pescatori»** (0-100) **[NUOVO]**
- Sale:
  - una giornata di lavoro +5;
  - testimoniare per Gavino +15;
  - l'asta muta +10;
  - non tradire alla pesata +5.
- Crolla del tutto (−30) se indichi una cassa all'Ispettore.
- **Cosa apre**:
  - **10**: Peppina ti tiene il 10%;
  - **30**: il gozzo in prestito, e i pescatori ti nascondono sotto le reti (come il Cartone, al `molo`);
  - **50**: lo **Magazzino del pesce abbandonato** (`sp_pesce` in `risacca.js`, accanto alla `calata`) te lo aprono loro, senza
    scassinare.

**Conti di una mattina** (per tarare)
- **Mattina normale a giornata, martedì**: 4 cassette × 6.000 = 24.000. Meno la Quota (1 cassetta, comprata con l'orata), meno il 10%
  di Peppina: circa 16.000, di cui la metà a te. Totale: **8.000 + 8.000 = 16.000**, più di un affitto settimanale (12.000).
- **Venerdì, col gozzo tuo e una cassa doppia della Famiglia**: 5 × 7.800 = 39.000, meno Quota e Peppina: circa 26.000, più
  15.000 della cassa. Totale **circa 41.000**, quanto un lavoretto buono di `game.js` (25-40), però alle quattro di mattina e col 10-40%
  di rischio.

**Cosa si riusa e cosa è [NUOVO]**

| cosa | riuso | [NUOVO] |
|---|---|---|
| pescatori e turno | OUTDOOR `pescatore` (8, 3-11), `economia.js` pesce | Nino come lavorante a giornata |
| barca | gozzo/lancia guidabili, posti `pesca_*`, motovedetta | «cala la rete» / «salpa la rete», le cassette |
| asta | RECURRING `pesce` 6-8, `banco_pesce`, botteghe | prezzi del giorno, il banditore, il 10% |
| Quota | — | la pesata alle 8 (scena C3), il 30% |
| contrabbando | il deposito sotto il Magazzino Neri (grata sulla calata), `magazzino` di Sandro, risorse della Risacca | la cassa doppia, le percentuali |
| nascondigli | `sp_pesce` (Magazzino del pesce abbandonato), `nasconditi` | aperto dalla reputazione |
| reputazione | — | gruppo `pescatori` |
| ricatto | `fotografa`, foto compromettenti | — |

---

## Incroci tra i tre mondi (gratis, nascono dai sistemi)
- Le casse buttate a mare dalla Santa Rita (§3 C6) arrivano sulla spiaggia. Le trovano i Granchi, Gnocco vende le americane bagnate a
  100 lire, e Spugna fuma la prima sigaretta americana della sua vita sulla grata: «Fa schifo. Ne voglio un'altra.»
- Ciuffo ruba il pesce all'asta (§3 C2) e lo porta al barile del Condominio Cartone. Porcu: «Il ragazzino paga la quota in pesce.
  Approvato.»
- Radiolina sa a che ora passa la motovedetta. La Pulce sa a che ora passa la ronda. Insieme fanno l'orario della città: con tutte e
  due amiche, il Taccuino ha l'orario di ronde e motovedetta del giorno dopo.
- Spugna era dei Binari. Quando la Pulce lo vede: «Lorenzo! Sei ancora dei nostri? No? Allora paghi il pedaggio.»

## Cosa serve al motore (tutto il [NUOVO], in ordine di utilità)
1. **`ask`**, la scelta (già chiesta in scene.md): 14 scene qui la usano.
2. **Gruppi di reputazione** nuovi: `cartone`, `bande:grk`/`bnr`/`brc`/`cst`, `pescatori` (accanto a `rep` già chiesto).
3. **Abitanti senza casa** (12-15, `homeT` nullo) e il posto `cartone`, per dormire per terra di notte.
4. **La regola di sicurezza per i ragazzini** (§2.E): non si colpiscono, la schivata delle auto, la fuga davanti alle armi,
   l'«orecchio» invece dell'arresto. **E i modelli dei ragazzini: gruppo dei personaggi.**
5. **La rete da pesca** e le cassette, la pesata (Quota), i prezzi dell'asta per giorno.
6. **`throw`** (gavettone, palla di neve) e lo stato **`bagnato`**.
7. Voci in `RECURRING`: `ramazza` (gio 5:30, `sottopasso`), `guerra_acqua` (sab 15, `marina`/`scalo`), `pesata` (ogni giorno 8,
   `calata`), `madri` (ogni giorno 19:30). `pesce` esiste: gli si aggiunge la scena C2.
8. `hunt`, `give`, `memo`, `window` (già chiesti in scene.md).

## Il controllo (come in scene.md)
Uno script nella scratchpad legge questo file ed estrae ogni battuta: tutto quello tra «», e ogni riga delle tre sezioni D (senza il
tag tra parentesi quadre). Nessuna supera i 70 caratteri.

**Conti**:
- 12 ricorrenti, ognuno con 10 battute e un arco in 3 passi;
- 18 scene, di cui 14 con una scelta del giocatore e 10 con la folla;
- 120 battute nelle sezioni D;
- 3 sistemi di gioco con numeri, rischi e la tabella riuso/[NUOVO].
