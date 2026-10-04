# Porto Vecchio — Le Fazioni: la Famiglia e la Risacca come organizzazioni (3 ottobre, pomeriggio)

Base: v7 (Inverno). Il modulo nuovo è `src/fazioni.js`: solo logica, caricato dopo `economia.js` (`<script>/*fazioni.js*/</script>` in `index.src.html`). Prova: `node test_fazioni.js [giorni] [seme]` dalla cartella `src`.

## Righe toccate fuori da fazioni.js (segnate `[fazioni]`)

| File | Cosa |
| --- | --- |
| `index.src.html` | lo script di `fazioni.js` dopo `economia.js` |
| `risacca.js` | `EXT`: agganci per i moduli esterni. `EXT.plan` (verbi in più), `EXT.do` (effetti in più), `EXT.canJoin` (tetto dei membri), `EXT.onJoin`, `EXT.onTalk` (chi parla in cella). `join()` ora restituisce `false` se il tetto lo blocca; `recluta` e `unisciti` lo dicono. Esportati in più: `EXT`, `resolvePerson`, `inbox`, `DO`. |
| `risacca_ui.js` | Squadra: «n/15» nel titolo, i collaboratori di ogni membro, l'ordine «Chiedi a … di dare una mano», la tabella delle cellule autonome. |

`game.js`, `popolo.js`, `azioni.js`, `economia.js`, `world.js`, `render.js` non sono toccati. `fazioni.js` aggiunge a `Popolo.GIRI` due giri (`esattore`, `ricattatore`) e a `Popolo._.PROJ` due progetti (`rapporto`, `cella`).

## La Famiglia
- **Il capo** (`id: 'capo'`, nome «Senza nome»): chiuso in una casa qualsiasi della periferia est dove non abita nessuno (`st.fam.hq`), non esce mai, non compare nel Taccuino. Lo vedono solo i fidati, di notte alle 23, quando portano i conti (progetto `rapporto`): seguendo un fidato si trova la base.
- **15 uomini** all'inizio: 3 **fidati** (Sandro, Rocco, Tano) e 12 **soldati** presi dalla malavita dell'isola (4 spacciatori, 5 picchiatori-esattori, 2 ricattatori, 3 ricettatori in tutto). Ogni soldato risponde a un fidato (`n.fam.boss`): una piramide.
- **Aiutante temporaneo**: ogni uomo, quando comincia un giro, può prendersi **un** aiutante (un amico o un vicino con pochi scrupoli o tanti debiti). L'aiutante va con lui, viene pagato, torna a casa e se lo ricorda. Chi aiuta spesso diventa un candidato.
- **Uomini fissi nuovi**: solo i **3 fidati** possono proporne uno, uno alla volta, e solo il **capo** decide (chi ha già lavorato per loro, chi non parla, la fedeltà di chi garantisce). Un Orecchio o un amico della Risacca viene scoperto spesso e finisce nei guai. Il candidato può anche dire no. **Mai oltre 20.**
- **I tre più fedeli**: se un fidato finisce in cella a lungo, muore o perde fedeltà, sale il soldato più fedele.
- **Lavori**: gli esattori riscuotono dai debitori (paura, porte spaccate), i ricattatori usano i segreti del diario, gli altri spacciano e ricettano. La cassa sale al capo.
- **Chi parla**: un uomo in cella con poca fedeltà può parlare: il suo capo zona rischia l'arresto, lui viene cacciato con una croce rovesciata.
- **Tatuaggi** (`n.fam.tattoos`): rango, anni di galera, mestiere, tradimento. Per ora solo dati, da disegnare (lavoro «Look delle fazioni e tatuaggi»).
- Lo Squalo non ha più nome a schermo (Sandro Neri, uno dei tre). Nei testi del codice la parola «Squalo» resta ancora (lavoro «Togliere lo Squalo dal codice»).

## La Risacca
- **Al massimo 15 membri** (`Fazioni.CFG.risMax`). Il sedicesimo non entra: può diventare collaboratore.
- **Collaboratori**: fino a **3 per membro** (`CFG.collabPer`). Li si chiede col verbo nuovo `collaboratore` (chat o pannello), oppure li trovano da soli i membri col libero arbitrio. Cosa fanno:
  - **mani**: quando il loro membro lavora a un compito, chi è libero va ad aiutarlo (più soldi, più morale, meno stanchezza);
  - **soldi**: il venerdì sera mettono qualcosa nella cassa;
  - **occhi**: chi abita vicino a una base vede i Grigi prepararsi alla perquisizione (mezz'ora in più).
  - **Compartimenti**: conoscono solo il loro membro. Se il membro parla in cella, cadono i suoi collaboratori; se un collaboratore parla, fa solo il nome del suo membro.
- **Cellule autonome** (al massimo 5 attive): nascono da sole tra amici con ideologia alta e un motivo (rabbia, un parente portato via, la fame). La Risacca le **accoglie** appena c'è un membro: uno diventa il contatto. Agiscono per conto loro, di notte: scritte, volantini, collette per la cassa, cartelloni del Garante abbattuti. Seguono la linea della banda se vogliono (prudenza le frena, propaganda le spinge), non prendono ordini e **non contano nei 15**. Se ne prendono uno, sa solo dei suoi e del contatto.
- **Chat**: il segreto di ognuno (`Risacca.CARDS[id].secret`) dice a chi risponde, con chi sta, chi è il contatto.

## Numeri (prova, seme 1, 5 giorni, Risacca riempita a 15)
La Famiglia passa da 15 a 17 (3 proposte, 2 entrati, 1 rifiuto), 29 aiuti temporanei, al massimo un aiutante per uomo. Nessun membro oltre 3 collaboratori, Risacca mai oltre 15. Logica circa +12% per passo.

## Il riciclaggio (aggiornamento)
- **Le coperture**: la Sala giochi Flipper fa anche da bar; la casa più vicina (circa 25 m) diventa la **Lavanderia Stella** (insegna ПРАЧЕЧНАЯ 세탁). Lo fa `fazioni.js` al caricamento, prima che vita e grafica leggano gli edifici: è l'unica modifica alla mappa, da riportare in `world.js` quando si vuole.
- **I soldi**: i giri riempiono la cassa (sporchi); il fidato li porta al capo di notte; ogni mattina il cassiere (il fidato che ricetta) passa dalla lavanderia (alle 10) e dalla sala giochi (alle 11) e li fa entrare negli incassi. Se non ci va lui, alle 21 ci pensa il gestore. Ogni copertura regge una cifra al giorno (lavanderia 35.000, sala 55.000; il 10% si perde). Con troppi soldi fermi il capo forza la mano e sale il **sospetto**.
- **Ispezione**: con il sospetto alto la Tutela mette i sigilli per due giorni, sequestra una parte e può fermare il cassiere. Chi lavora alle coperture se lo ricorda.
- **La paga** (notte tra venerdì e sabato): roba per lo spaccio e spese fisse, **mazzette** a due Grigi (prima Ferri; c'è chi non si compra), **stipendi** (fidati 60.000, soldati 25.000). Chi non viene pagato perde fedeltà. Metà di quello che avanza va nel **tesoro** della base segreta.
- **Un Grigio comprato chiude un occhio**: un uomo appena fermato a volte esce dopo mezz'ora.
- Numeri in `Fazioni.WASH` e `Fazioni.PAY`; tutto nel resoconto `Fazioni.report(st).famiglia.soldi`.
