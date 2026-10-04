# Porto Vecchio — I Mestieri: quello che ognuno può fare col suo lavoro (3 ottobre, sera)

Modulo nuovo `src/mestieri.js` (dopo `protagonista.js`). In `risacca.js` un aggancio in più, `EXT.cardExtra` (riga `[mestieri]` in `chatRules`): nella scheda della chat compare cosa il personaggio può fare col suo lavoro.

## Principio
Tutti fanno tutto, con le stesse regole: gli abitanti da soli, i membri della Risacca su richiesta, il protagonista sul suo posto di lavoro. Chi lavora in un posto ha le chiavi: le azioni «di notte» si fanno solo lì, fuori orario.

## Le azioni (`Mestieri.AB`, 45) e chi le fa (`Mestieri.JOBMAP`, 94 mestieri coperti)
Esempi: tipografo (stampa volantini, tessere false), impiegati della Rocca e dattilografe (leggere i fascicoli, far sparire una pratica, segnalare), infermieri e farmacisti (curare senza registrare, medicine, roba), meccanico (truccare un mezzo della Guardia, riparare), benzinaio (benzina senza tessera), baristi e camerieri (ascoltare i clienti, messaggi dietro il bancone, annacquare, la cassa), cuochi e bottegai (cibo per il covo, sfamare chi non ha niente), cucina del comando (ascoltare gli ufficiali), magazzinieri e scaricatori (far sparire una cassa, contrabbando), portieri e affittacamere (una stanza senza registro), sarte (una divisa dei Grigi), fabbri (chiavi, coltelli), pescatori (portare roba o persone via mare), maestre (raccontare quello che il Garante tace), proiezionista (proiezione proibita), circolo (riunioni), chiesa (la cripta), boscaioli e cavatori (legna, carbone, esplosivo), braccianti (il raccolto non dichiarato), operai (fermare il lavoro un'ora), Guardia (chiudere un occhio, perquisire), fioraia e fattorino (staffette), videoteca (cassette proibite), DJ (dediche in codice), buttafuori (ricordare i debiti), istruttore (insegnare a difendersi), bagnino (le cabine). Chi non ha un mestiere in tabella ascolta e mette le mani nella cassa.

Ogni azione dice per chi si fa (Risacca, Famiglia, Tutela, per sé, per aiutare qualcuno): la stessa azione cambia effetto secondo da che parte sta chi la fa (una cassa sparita va alla Risacca, alla Famiglia o al mercato nero).

## Chi le fa
- **Abitanti**: a mezzanotte (`REFLECT`), chi ha un motivo (ideologia, Famiglia, fedeltà alla Tutela, soldi, un amico in difficoltà) mette in programma un'azione del suo mestiere (progetto `mestiere`): di giorno sul lavoro, di notte con le chiavi.
- **Risacca**: verbo `mestiere` (argomento `azione`), in chat o dal pannello.
- **Protagonista**: nel menu QUI, ADESSO quando è sul suo posto di lavoro.
- **Rischio**: uguale per tutti, dipende dall'ora (di notte meno gente) e da chi c'è. Chi viene visto entra nella memoria di chi l'ha visto; può finire in cella o perdere il posto.

## Vizi e favori degli abitanti
Il vino (assuefazione e astinenza, la mattina dopo si arriva tardi), le sigarette (senza si diventa nervosi), i prestiti tra amici (chi non restituisce in una settimana perde l'amico), la roba che scotta nascosta in casa di notte, offrire un giro a chi c'è al bar, licenziarsi (chi lavora per la Tutela e non la sopporta più, chi è stufo del padrone).
