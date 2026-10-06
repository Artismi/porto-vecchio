# AGENTS.md — v7/src (i sorgenti del gioco)

> Da leggere insieme a [`../AGENTS.md`](../AGENTS.md) e [`../../AGENTS.md`](../../AGENTS.md). Qui: catalogo dei moduli, pipeline di `render.js`, sistema HOOKS, test.

## Architettura in trenta secondi

- Vanilla JS, IIFE, globali (`var Game`, `var Render`, …). Nessun bundler: `build.py` concatena i file dentro `index.src.html` ai marcatori `/*nome.js*/`.
- **Logica pura** (gira anche in Node) vs **grafica** (solo browser). Ogni file di logica inizia con `typeof Game !== 'undefined' ? Game : require('./game.js')` per funzionare in entrambi.
- Estensione tramite **`Game.HOOKS`**: ogni modulo concatena l'hook precedente, nell'ordine di caricamento degli script.
- Il client chiama l'IA solo via `fetch('/api/mente')` (`mente.js`); la risposta `data: null` → fallback deterministico.

## Ordine di caricamento (`index.src.html`, righe 281-320) — NON riordinare

```
file_shim → three.min → gltf_loader
animazioni → anim_vita → anim_lotta
models → kit → world → interiors → game → risacca → popolo → azioni
economia → fazioni → soldi → oggetti → guardaroba → protagonista → mestieri
paesaggio → livelli → render → audio → coro → mente → regia → main
risacca_ui → tasche_ui → soldi_ui → oggetti_ui → bottino → vestiario
pezzi → cantiere → menu_ui → interni_arte → protagonista_ui
```

Un file nuovo va messo **dopo** le sue dipendenze e **prima** dei moduli che lo usano (es. un modulo di logica che si aggancia a HOOKS va dopo `game.js`).

## Catalogo moduli

### Motore puro (modificabili liberamente — con i test verdi)

| File | Righe | Namespace | Ruolo | HANDOFF |
|---|---|---|---|---|
| `game.js` | 2.130 | `Game` | mappa, A*, armi, veicoli/fisica, polizia, NPC core, `HOOKS`, `step`, `create(seed)` | — |
| `world.js` | 1.405 | `World` | isola 680×280 m deterministica: zone, Monte Scuro, strade, edifici, luoghi (id di v6 conservati) | [monte](HANDOFF_monte.md) |
| `popolo.js` | 1.583 | `Popolo` | 450 abitanti: famiglie, calendario, bisogni, interessi, diario, progetti, LOD near/far | [personaggi](HANDOFF_personaggi.md), [vita](HANDOFF_vita.md) |
| `risacca.js` | 1.593 | `Risacca` | banda, compiti, morale/repressione, chat a verbi chiusi, `EXT`, `CARDS` | — |
| `azioni.js` | 1.201 | `Azioni` | verbi base, imprevisti, piani d'emergenza; `intend`/`startPlan` usati anche dalla Regia | [azioni](HANDOFF_azioni.md) |
| `oggetti.js` | 1.804 | `Oggetti` | catalogo 374 oggetti, botteghe, 142 ricette, frugare, scambio, vestibilità | [oggetti](HANDOFF_oggetti.md) |
| `economia.js` | 312 | `Economia` | merci, produzione, consegne, Emporio, nave del regime | [economia](HANDOFF_economia.md) |
| `fazioni.js` | 617 | `Fazioni` | Famiglia (riciclaggio) e teti Risacca (collaboratori, cellule) | [fazioni](HANDOFF_fazioni.md) |
| `soldi.js` | 796 | `Soldi` | conti/bancomat/pizzo; invariante `bankCheck()` | [soldi](HANDOFF_soldi.md) |
| `mestieri.js` | 363 | `Mestieri` | 45 azioni × 94 mestieri («chi ha le chiavi») | [mestieri](HANDOFF_mestieri.md) |
| `protagonista.js` | 374 | `Protagonista` | casa, amici, lavoro, vizi, warp del tempo | [protagonista](HANDOFF_protagonista.md) |
| `mente.js` | 233 | `Mente` | client IA; la **chat del giocatore passa davanti** al background | [regia](HANDOFF_regia.md) |
| `regia.js` | 130 | `Regia` | auto con padrone + IA-regista (≤6 persone entro 34 m, ogni 40 s reali) | [regia](HANDOFF_regia.md) |
| `coro.js` | 229 | `Coro` | IA per gruppi di affinità, voci senza LLM | [coro](HANDOFF_coro.md) |
| `livelli.js` | 256 | `Livelli` | sottosuolo: botole, cunicoli, grotte, `st.player.lv` | [monte](HANDOFF_monte.md) |
| `paesaggio.js` | 33 | `Paesaggio` | abbattere alberi | — |

### Grafica

| File | Righe | Ruolo |
|---|---|---|
| `render.js` | 10.160 | tutto il visibile — **SOLO tramite pipeline di script** (§ sotto) |
| `models.js` | 410 | modelli esterni `assets/`, `Models.person` con armi/vestiti |
| `kit.js` | 110 | kit modulari Kenney per edifici |
| `interiors.js` | 785 | piante interne, programmi, arredo |
| `interni_arte.js` | 565 | grafica interni, ~120 oggetti `ia_*` |
| `animazioni.js` / `anim_vita.js` / `anim_lotta.js` | 322 / 639 / 577 | pose procedurali su ossa |
| `vestiario.js` | 295 | vestiti-guscio legati allo scheletro |
| `pezzi.js` | 115 | pezzi dei covi |
| `bottino.js` | 236 | bottino 3D cliccabile |
| `audio.js` | 102 | WebAudio sintetizzato |
| `three.min.js`, `gltf_loader.js`, `file_shim.js` | — | vendored / shim `file://` — **non toccare** |

### Interfaccia

| File | Righe | Ruolo |
|---|---|---|
| `main.js` | 617 | bootstrap, loop `requestAnimationFrame`, input, HUD, dialoghi, taccuino, `window.__pv` |
| `menu_ui.js` | 865 | menu valigetta (Roba, Chi è, Banco, Lavori, Qui) |
| `risacca_ui.js` | 560 | pannello/chat Risacca |
| `tasche_ui.js` | 221 | tasche a tutto schermo |
| `oggetti_ui.js` | 219 | banchi, frugare, scambio |
| `soldi_ui.js` | 230 | portafoglio, bancomat, azzardo |
| `protagonista_ui.js` | 50 | barre bisogni |
| `cantiere.js` | 533 | costruzione del covo |

### Test (Node)

`test_vita.js`, `test_azioni.js`, `test_coro.js`, `test_economia.js`, `test_fazioni.js`, `test_livelli.js`, `test_oggetti.js`, `test_soldi.js` — firma comune `node test_X.js [giorni] [seme]`, girano dalla cartella `src/`. **Ogni modifica di logica deve lasciarli verdi** e i relativi `HANDOFF_*.md` aggiornati.

## Sistema `Game.HOOKS`

Hook disponibili: `create`, `step`, `think`, `move`, `verb`, `jailed`, `indoor`, `playerWeapon`, `fire`, `hit`.
Regola di aggancio (si ripete uguale in ogni modulo):

```js
const prev = G.HOOKS.step;
G.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); try { myStep(st, dt); } catch (e) { console.warn('[Mio]', e); } };
```

Ordine di registrazione (per ordine di script): Risacca → Popolo → Livelli → Guardaroba → Regia → Cantiere.

## Pipeline di `render.js` (OPERAZIONE CRITICA)

`render.js` non si modifica a mano. La catena, in ordine (ogni script ha la guardia: si ferma se non trova il proprio punto di aggancio):

1. `inverno_render.py` → `inverno_render38.py` (base, atmosphere, facciate, marciapiedi, isola38)
2. `monte_render.py` (entroterra/sottosuolo)
3. `strade_render1.py`, `verde_render1.py`, `case_render1.py`, `luci_regia*.py`
4. `interni_render.py` — **da rilanciare a ogni rigenerazione di render.js**
5. `ambiente1.py`, `ambiente2.py`, `ambiente3.py` — si applicano **per ultimi** (sostituiscono l'intero blocco colore del post fra due ancore stabili)
6. `muri_vivi1.py` (murales), poi `unione1.py`…`unione10.py` (rifiniture post-unione)

Il flusso documentato è: `cp v6/src/render.js v7/src/render.js` + script in ordine. Dopo ogni passaggio: `python build.py` e verifica visiva. Frammenti JS inclusi dagli script: `snowpass.js`, `alberi.js`, `inverno_paesaggio.js`, `inverno_volumi.js`, ecc. — sono sorgenti della pipeline, non del gioco.

## Convenzioni di codice

- Commenti di patch `[modulo]` (es. `[popolo]`, `[unione8]`): conservarli quando si sposta o si copia codice — sono la tracciabilità del repo.
- Logica → niente riferimenti a `window`, `document`, `THREE`, `location`. Se serve un aggancio DOM, sta nei moduli `_ui` o in `main.js`.
- Eventi: `addEventListener` sempre, mai attributi inline. DOM: preferire `createElement`/`textContent` a `innerHTML` (già in uso per gli elenchi HUD).
- Tempo di gioco: 1 s reale = 2,5 min (`MIN_PER_SEC`); il «warp» (dormire/lavorare) usa `st.timeK`.
- Unità: metri, casella 2 m; assi: x est, y gioco = z Three.js, altezza y.
- Numeri random: sempre dal `makeRng(seed)` dello stato (determinismo dei test), mai `Math.random()` nella logica.

## Il loop (`main.js`)

`loop()` → pausa (`ui.dialog/book/over`) → `G.fire` → `tickClick` → **`G.step`** → `R.hits`→`G.propHit` → **`R.frame`** → HUD (0,1 s) → `requestAnimationFrame`. Menu aperto in strada: mondo a ¼ velocità (`ui.menuSlow`); nel covo fermo. `window.__pv` espone `st, ui, G, R, input, keys, mouse, click, pickAt` per debug e screenshot.
