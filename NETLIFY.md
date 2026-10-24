# Porto Vecchio su Netlify

Il gioco gira anche su Netlify (piano gratuito), oltre che su Vercel. La configurazione è in `netlify.toml`:
- si pubblica solo quello che serve al gioco (`index.html`, `v7/index.html`, `v7/assets`) nella cartella `dist`;
- `/api/mente`, `/api/status`, `/api/test` sono funzioni Netlify (`netlify/functions/`) che usano le stesse api di `v7/api/`, senza toccarle.

## Metterlo online
1. Entra su https://app.netlify.com con GitHub.
2. **Add new site → Import an existing project → GitHub** → scegli `porto-vecchio`. Branch: `main`. Il resto lo legge da `netlify.toml`.
3. **Site configuration → Environment variables**: aggiungi `GEMINI_API_KEY` (e, se le usi, le altre di `v7/VERCEL.md`: `MENTE_PROVIDER`, `CHIAVE_CHAT`, ...).
4. **Deploys → Trigger deploy**. Prova `https://<nome>.netlify.app/api/test`: deve dire `"test": "ok"`.
5. Il sito Artismi carica il gioco da qui: sul suo hosting imposta `NEXT_PUBLIC_PORTO_VECCHIO_URL=https://<nome>.netlify.app` e ripubblica.

Da sapere: sul piano gratuito una funzione ha circa 10 secondi per rispondere (su Vercel erano 20). Se la Mente ci mette di più, quella risposta va in errore e il gioco usa la risposta di riserva.
