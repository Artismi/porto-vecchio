# HANDOFF — I soldi (4 ottobre 2026)

## File
- `src/soldi.js` (logica, ~800 righe) — caricato DOPO fazioni.js.
- `src/soldi_ui.js` (interfaccia: portafoglio, bancomat, sportello, bancone, macchinette, sette e mezzo, Lotto). Tasto L = portafoglio + cassa comune.
- `src/test_soldi.js` — `node test_soldi.js [giorni] [seme]`.
- Backup dei file prima delle patch: `v7/_backup_soldi/` (economia, fazioni, game, index.src, interiors, popolo, risacca, risacca_ui).

## Come funziona
- Ogni lira sta in un posto: portafogli, materassi, conti, casse botteghe, caveau, bancomat, portavalori, cassa Risacca (`st.ris.cassa`), Famiglia (`st.fam`), Stato. `bankCheck` verifica che il Banco quadri.
- Pagamenti ufficiali tutti sul conto: stipendio dal padrone, affitto/bollette (Ente Case), decima (Ufficio Tributi), pizzo come fattura «Vigilanza Tirrena». Conto scoperto = insoluto; per cifre grosse vengono a prendere contanti.
- Banco su una casa libera vicino alla piazza (direttore, cassieri, guardie giurate). Conti, prestiti (3%/settimana, rata lunedì), conti congelati dalla Tutela.
- Bancomat (6): riempiti dal portavalori la mattina, incassi ritirati la sera. Scassabili di notte col piede di porco.
- Azzardo: slot della Famiglia (resa teorica ~86%), sette e mezzo alla bisca, Lotto il sabato.
- Bancone in ogni bottega: consuma / in tasca / per la banda.
- Aggancio agli altri moduli: `Popolo._.MONEY` (paga, affitto, spese), `Economia.HOOK` (ingrosso, nave), `Risacca.EXT` (spendAt, takeTill, earnFrom).

## Patch già fatte
- risacca.js: cassa comune separata (`st.ris.cassa`, `cassaAt`); acquisti/cibo/bere della banda pagano dalla cassa e finiscono nella cassa della bottega.
- risacca_ui.js: HUD mostra «In tasca»; in negozio paghi di tasca tua; pannelli mostrano la cassa comune.
- popolo.js, fazioni.js, economia.js, game.js: piccoli agganci (vedi diff con `_backup_soldi/`).

## Stato al 4/10
- `node test_soldi.js 1 1` → **Tutto a posto** (Banco quadra 0). ~100 s per giorno simulato.
- `node test_azioni.js 1 1` → ok.
- Corretto oggi: in `atm_scasso` un `//` commentava `B.equity -= x; take(...)`: il giocatore non riceveva i soldi e il Banco non quadrava.

## Da fare, in ordine
1. ~~Agganciare al gioco~~ fatto il 4/10 insieme agli oggetti (vedi `HANDOFF_oggetti.md`): il bancone adesso è quello di `oggetti_ui.js`.
2. Far girare `node test_soldi.js 7 1` (lungo, ~12 min) e controllare:
   - `stipendi` = 0 nel primo giorno: verificare che arrivino col giorno di paga;
   - «fuori dai conti -380» in un giorno: soldi che spariscono da qualche parte, trovare la perdita;
   - portavalori: nel test «equipaggio null» → nessuna guardia giurata assunta per il furgone, controllare `crew()` / JOBS_BY.banca.
3. Rifare `test_economia.js 2 1` e `test_vita.js 2 1`.
4. Bilanciamento: l'economia deve girare per scambio senza creare troppa ricchezza, ma la banda deve potersi finanziare bene (anche con l'illegale): rapina al Banco ~400-500, bancomat ~120-350, portavalori da provare.
5. Scambio/baratto con i personaggi e i mercanti (menù visuale di scambio): non ancora fatto, c'è solo il bancone di acquisto.
