# Il Coro (src/coro.js): l'IA per gruppi, non per persona

Perché: la quota gratuita di Gemini è di pochi messaggi al minuto. Una chiamata per abitante (453) non ci sta.

## Come funziona
1. **Casella** (`P.box`): il codice la ricava dal diario. Contiene umore, bisogni forti, cosa sa (max 4 notizie che pesano), ultimo pensiero, clima del gruppo e battute pronte. `Coro.riga(st, n)` la scrive in una riga per il prompt.
2. **Gruppi di affinità** (`Coro.gruppi`), rifatti una volta al giorno: Famiglia, Risacca, Grigi, Orecchi, giro, colleghi dello stesso posto di lavoro, poi disoccupati, pensionati e casalinghe per passione, poi il quartiere. Chi resta in meno di 3 scende al livello più largo. Al massimo 8 per gruppo (circa 94 gruppi).
3. **Voci** (`Coro.diffondi`): le notizie passano dentro il gruppo **col codice**, senza IA. Chi è loquace racconta di più. Le voci di terza mano si fermano, e ognuno ne riceve al massimo 2 per notte.
4. **La notte** (`mente.js → nightFlush`): a mezzanotte `Coro.notte` aggiorna tutte le caselle e passa le voci. Poi l'IA si chiama **una volta per gruppo**, per i 6 gruppi più «caldi» (cast, vicini al giocatore, fatti forti, da più tempo senza IA), con 16 s tra una chiamata e l'altra.
   - Il server (`kind: 'gruppo'`) risponde con clima, voce, rabbia e paura del gruppo, 3-4 battute per domani, e un pensiero solo per i 3 «specifici».
   - `Coro.applica` distribuisce la risposta: rabbia e paura pesano di più su chi è già su quella strada. La voce la sente chi ha la lingua lunga. Le caselle si riscrivono.
5. **Di giorno** le chiacchiere usano le battute già scritte (nessuna chiamata). Se il canale «eventi» ha una chiave sua, quando le battute finiscono si chiama al volo.
6. **Tutto finisce in memoria** (diario): i dialoghi col giocatore, le chiacchiere, le voci, i pensieri.

## Tre chiavi (facoltative)
In `api_key.json`, sotto `"chiavi"` (su Vercel `CHIAVE_CHAT`, `CHIAVE_MENTE`, `CHIAVE_EVENTI`):
- `chat`: il giocatore parla con un abitante (`dialogo`)
- `mente`: la notte dei gruppi (`gruppo`)
- `eventi`: le chiacchiere e gli incontri (`chiacchiera`)

Se una manca si usa `apiKey`. Il freno (8 al minuto) è per chiave. Su una chiave condivisa le chiamate di sfondo si fermano a 4 al minuto. Le chiavi devono venire da **progetti Google diversi**, altrimenti condividono la quota.

## Prova
`cd src && node test_coro.js [giorni] [seme]`
