# AGENTS.md — Porto Vecchio (guida per agenti, radice del repository)

> Struttura degli AGENTS file di questo repository:
> 1. **questo file** (`AGENTS.md`, radice) — regole generali valide per tutto il repo
> 2. [`v7/AGENTS.md`](v7/AGENTS.md) — regole per la **versione corrente** (build, server, deploy)
> 3. [`v7/src/AGENTS.md`](v7/src/AGENTS.md) — regole per i **sorgenti del gioco** (module per module)
>
> Le cartelle `v2/`–`v6/` e i file della radice (`game.js`, `render.js`, `index.src.html`…) sono **versioni storiche congelate**: non si sviluppano più lì. Regola: **non modificare nulla fuori da `v7/`** salvo richiesta esplicita.
> La gerarchia vale: un file più vicino al codice prevale sulla radice.

## Cos'è il progetto

Gioco browser open-world in JS vanilla + Three.js r149, ambientato nel 1986 su un'isola del Tirreno sotto un regime. Cuore: simulazione sociale (~450 abitanti con vita, memoria e bisogni) potenziata da un'IA server-side («la Mente»). Analisi completa: [`ANALISI-STRUTTURALE.md`](ANALISI-STRUTTURALE.md). Consigli di consolidamento: [`CONSIGLI-IMPLEMENTATIVI.md`](CONSIGLI-IMPLEMENTATIVI.md).

## Regole inviolabili

1. **Non si tocca `v7/src/render.js` a mano**: è il prodotto della catena di script in `v7/strumenti_inverno/` (vedi [v7/src/AGENTS.md](v7/src/AGENTS.md) § pipeline). Un cambio visivo parte da uno script con guardia, mai dall'editor.
2. **Logica e grafica separate**: i moduli di logica girano anche in Node (niente `window`/`document`/`THREE` fuori dai `try` o dai moduli grafici). Ogni modifica di logica deve tenere i `test_*.js` verdi.
3. **Ogni nuovo modulo si aggancia con `Game.HOOKS`**, concatenando l'hook precedente; mai sostituire l'hook di un altro modulo.
4. **La chiave API non entra mai nel client** né nel repo: solo `v7/api_key.json` (git-ignored) o variabili d'ambiente su Vercel. `api/_mente.js` si rigenera con `strumenti_inverno/mente_vercel.py`, non si edita.
5. **Aggiungere, non cancellare** (convenzione di questo repo): le modifiche distruttive richiedono conferma esplicita dell'utente.
6. **Ordine dei `<script>` in `v7/src/index.src.html` è semantico** (definisce l'ordine di aggancio degli HOOKS): un file nuovo va inserito nella posizione giusta, non in fondo.
7. **`build.py` non include file con cifre nel nome** (regex `/\*([a-z_.]+\.js)\*/`): niente `foo2.js`.

## Documentazione da tenere aggiornata

- Ogni lavoro su un modulo aggiorna o crea il `HANDOFF_<modulo>.md` corrispondente in `v7/src/` (formato consolidato: Cos'è cambiato / File toccati / Come provarlo / Da fare).
- Nuove funzioni esportate o nuovi endpoint API → aggiornare [v7/src/AGENTS.md](v7/src/AGENTS.md) (tabelle dei moduli) o [v7/AGENTS.md](v7/AGENTS.md) (tabella endpoint).

## Ambienti

- **Sistema**: Windows (percorsi in stile `d:\...`), Python 3 per `build.py` e per gli script `strumenti_inverno`, Node 18+ per `server.js` e i test.
- **Avvio locale**: `v7/AVVIA.bat` (o `node v7/server.js`) → `http://localhost:8642`.
- **Build**: `python build.py` dentro `v7/`.
- **Test**: `node test_<modulo>.js [giorni] [seme]` dentro `v7/src/` (vedi elenco in [v7/src/AGENTS.md](v7/src/AGENTS.md)).
- **Deploy**: push su `main` → Vercel (Root Directory `v7`), vedi [`v7/VERCEL.md`](v7/VERCEL.md).

## Cosa non fare

- Non committare `v7/index.html` generato insieme a cambi di sorgenti senza aver rilanciato `build.py`.
- Non usare CDN: three.js e il loader sono vendored (`v7/src/three.min.js`, `v7/src/gltf_loader.js`); gli asset sono locali in `v7/assets/`.
- Non inserire inline `onclick`/`onchange` o CSS/JS inline nel HTML: tutto passa da `addEventListener` e file esterni.
- Non modificare le versioni storiche (`v2/`…`v6/`, sorgenti radice) per «allinearle»: sono riferimento.
