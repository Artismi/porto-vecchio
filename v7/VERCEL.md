# Porto Vecchio online, con la chiave dell'IA privata

Il gioco va su Vercel come sito. La chiave dell'IA (la «Mente» degli abitanti) sta in una **variabile segreta** su Vercel:
la usano solo le funzioni in `v7/api/` (`/api/mente`, `/api/status`, `/api/test`), il browser non la vede mai.

## 1. Una chiave nuova (una volta sola)
La chiave vecchia era salvata nel repository (`v7/api_key.json`): va considerata bruciata.
1. Apri https://aistudio.google.com/apikey
2. Cancella la chiave vecchia e premi **Create API key**. Copiala.
3. Consigliato: nella console di Google metti un limite di spesa o di richieste al giorno.

## 2. Il gioco su Vercel
1. Entra su https://vercel.com con il tuo account GitHub.
2. **Add New… → Project**, scegli il repository `porto-vecchio` e premi **Import**.
3. In **Root Directory** scegli `v7`. Framework: **Other**. Lascia vuoti i comandi di build: `index.html` è già pronto.
4. Apri **Environment Variables** e aggiungi:
   - Name: `GEMINI_API_KEY`
   - Value: la chiave nuova
5. Premi **Deploy**. Dopo un minuto hai l'indirizzo, tipo `porto-vecchio.vercel.app`.
6. Prova: apri `https://<il-tuo-indirizzo>/api/test`. Deve dire `"test": "ok"`.

Per pubblicare un aggiornamento basta un push sul branch di produzione (di solito `main`): Vercel rifà il deploy da solo.
Se il gioco nuovo è ancora su un altro branch, in **Settings → Git → Production Branch** puoi scegliere quello.

### Variabili facoltative
- `MENTE_PROVIDER`: `gemini` (predefinito), `anthropic`, `groq` o `openrouter`. Con le chiavi `ANTHROPIC_API_KEY`, `GROQ_API_KEY` o `OPENROUTER_API_KEY` il fornitore si riconosce da solo.
- `MENTE_MODEL`: un modello preciso; se manca, sceglie da solo.
- `MENTE_PER_MINUTO`: richieste al minuto per visitatore (predefinito 40). È un freno contro chi usasse l'indirizzo per consumare la tua chiave.

## 3. Sul tuo computer
`v7/api_key.json` non è più nel repository: dopo il prossimo `pull` sparisce. Rimettila così:
1. Copia `v7/api_key.esempio.json` in `v7/api_key.json`.
2. Incolla la chiave nuova in `"apiKey"`.
3. Avvia `AVVIA.bat` come sempre.

Git la ignora (`.gitignore`), quindi non finisce più online.

## Cosa va su Vercel
Solo `index.html`, `assets/` e `api/`. Backup, sorgenti e strumenti restano fuori (`.vercelignore`).
Se cambi la logica della Mente in `server.js`, rigenera `api/_mente.js`: `python3 strumenti_inverno/mente_vercel.py` (dentro `v7/`).

## Vedere un ramo prima di unirlo
Ogni push su un ramo che non è quello di produzione crea un'**anteprima** con un indirizzo suo:
su Vercel apri il progetto → **Deployments**, la riga del ramo (es. `claude/relaxed-ramanujan-sna3l9`) → **Visit**.
L'anteprima usa le stesse variabili d'ambiente se in **Settings → Environment Variables** è spuntato anche «Preview».
