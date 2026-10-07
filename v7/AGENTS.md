# AGENTS.md — v7 (versione corrente: build, server, deploy)

> Da leggere insieme alla radice [`../AGENTS.md`](../AGENTS.md). Questo file copre la cartella `v7/` (build, server locale, API Vercel, asset); per i sorgenti del gioco vedi [`src/AGENTS.md`](src/AGENTS.md).

## Mappa della cartella

| Percorso | Ruolo |
|---|---|
| `index.html` | build generata (~3,9 MB) — **non editare a mano**, prodotto di `build.py`; **non si committa** (`.gitignore`), Vercel la rigenera col `buildCommand` |
| `build.py` | ricompone `index.html` da `src/index.src.html` sostituendo i marcatori `/*nome.js*/` |
| `server.js` | server locale Node 18+ (porta **8642**): file statici + proxy IA «la Mente» |
| `AVVIA.bat` / `server.ps1` | avvio con doppio clic (apre il browser; se Node manca, fallback PowerShell senza IA) |
| `api_key.esempio.json` | modello della config chiavi: copiarlo in `api_key.json` (git-ignored) |
| `api/` | funzioni Vercel (vedi § API) |
| `assets/` (304 file) | kit glTF-JSON: `mc/` persone, `mf/` mobili Kenney, `mj/` modelli vari, `mk/` kit modulari — ogni `.json` ha il gemello `.json.js` per `file://` |
| `src/` | i sorgenti del gioco (vedi [`src/AGENTS.md`](src/AGENTS.md)) |
| `strumenti_inverno/` | 105 script Python/JS che patchano `src/render.js` e rigenerano `api/_mente.js`; ordine e base della catena in [`strumenti_inverno/LEGENDA.md`](strumenti_inverno/LEGENDA.md) |
| `studio_anim.html`, `studio_oggetti.html` | pagine di studio isolate (pose, modelli) con i rispettivi `.js` in `strumenti_inverno/` |
| `test_mente.mjs` | prova manuale `POST /api/mente` contro `localhost:8642` |
| `_immagini/` | screenshot di riferimento del lavoro fatto |

## Comandi

| Azione | Comando (da `v7/`) |
|---|---|
| Build | `python build.py` |
| Server locale | `node server.js` (o `AVVIA.bat`) |
| Test della Mente | `node test_mente.mjs` (server acceso) |
| Test di logica | `node src/test_<modulo>.js [giorni]` (simulazione) · `node src/test_<nome>.js [seme]` (azione: combattimento, polizia, fisica, guida, distruzione) |
| Rigenerare `api/_mente.js` | `python strumenti_inverno/mente_vercel.py` — **obbligatorio dopo ogni modifica di `server.js`** |
| Rigenerare i `.json.js` | `python strumenti_inverno/pack_file.py` |

## Server locale (`server.js`) — endpoint

| Endpoint | Metodo | Scopo | Autenticazione |
|---|---|---|---|
| `/api/mente` | POST | chiamata LLM della Mente: `kind` = `dialogo` \| `riflessione` \| `gruppo` \| `chiacchiera` \| `regia` | chiave da `api_key.json` (mai nel body, mai nel client) |
| `/api/status` | GET | stato, provider, modello attivo, ultimo errore, canali, calls/fails | nessuna |
| `/api/test` | GET | prova reale del modello (self-test) | nessuna |
| `/` e file statici | GET | serve `index.html` e gli asset con MIME map, protezione path-traversal | nessuna |

Note operative: CORS `*` (gioco e server possono stare su origin diversi in sviluppo); body limit 30 KB; RPM 8 per chiave (4 per il background); cooldown automatico su 429/503; fallback tra chiavi quando una è esaurita (`[unione9]`).

## API su Vercel (`api/`)

| File | Scopo |
|---|---|
| `_mente.js` | core LLM **generato** da `strumenti_inverno/mente_vercel.py` — mai editare a mano |
| `mente.js` | handler `POST /api/mente` con rate-limit per IP (chat conteggiata a parte: suffisso `:chat`) |
| `status.js` | handler `GET /api/status` |
| `test.js` | handler `GET /api/test` |

Variabili d'ambiente (vedi [`VERCEL.md`](VERCEL.md)): `GEMINI_API_KEY` (o `ANTHROPIC_API_KEY`/`GROQ_API_KEY`/`OPENROUTER_API_KEY`), opzionali `MENTE_PROVIDER`, `MENTE_MODEL`, `CHIAVE_CHAT`/`CHIAVE_MENTE`/`CHIAVE_EVENTI`, `MENTE_PER_MINUTO`.

## Deploy

- Vercel: Root Directory `v7`, framework **Other**, build command `python3 build.py` (già in `vercel.json`). Push su `main` → deploy automatico.
- `.vercelignore` esclude sorgenti e strumenti: online vanno `assets/`, `api/` e l'`index.html` generato al build.
- Verifica post-deploy: `https://<indirizzo>/api/test` deve rispondere `"test": "ok"`.

## Convenzioni

- Numeri di riga citati in questa documentazione si riferiscono a `main` del 6 ottobre 2026.
- I commenti marcati `[popolo]`, `[vita]`, `[soldi]`, `[unione9]`… indicano la patch/ramo d'origine di una riga: **conservarli** quando si sposta codice.
- Le copie di backup pre-modifica non si committano più nel repo: la storia git è sufficiente (ex `_backup_*`, rimosse il 6/10/2026). Per modifiche invasive affidarsi a branch o commit dedicati.
