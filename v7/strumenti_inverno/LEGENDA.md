# LEGENDA — la catena di render.js

> Istituita il 7 ottobre 2026 con la decisione 3 del consolidamento (§3a di [`CONSIGLI-IMPLEMENTATIVI.md`](../../CONSIGLI-IMPLEMENTATIVI.md)). Questo file è la fonte di verità per la pipeline di `src/render.js`.

## La base

**La base ufficiale è il `src/render.js` committato su `main`** (il prodotto dell'unione di tutti i rami, ottobre 2026). Il vecchio rituale `cp v6/src/render.js v7/src/render.js` è **ritirato**: `v6/` è stata rimossa dal working tree (commit dedicato, recuperabile dalla storia git). **Ogni nuova patch parte dal render.js attuale**, mai da copie vecchie.

## Ordine ufficiale della catena (tutto già applicato)

Ogni script ha la guardia: si ferma se non trova il proprio punto di aggancio (molti si rieseguono senza fare nulla).

1. `inverno_render.py` → `inverno_render38.py` — base inverno: atmosfera, facciate, marciapiedi, isola38
2. `monte_render.py` — entroterra e sottosuolo
3. `strade_render1.py`, `verde_render1.py`, `case_render1.py`, `luci_regia1.py`–`luci_regia5.py`
4. `interni_render.py` — **va rilanciato a ogni rigenerazione di render.js**
5. `ambiente1.py`, `ambiente2.py`, `ambiente3.py` — il grading: sostituiscono l'intero blocco colore del post fra due ancore stabili
6. `muri_vivi1.py` — murales, manifesti, bandiere
7. `unione1.py` → `unione10.py` — rifiniture post-unione (ombre dei lampioni, città in ordine, sole vero, chiaro di luna, prospettiva aerea, ricarica a qualità ridotta se la GPU perde il contesto)

**Superati, non si applicano più**: `luci_regia6.py` (righe di schermo a 40 livelli — sostituito dal grading di ambiente) e `luci_regia7.py` (il sole lo fanno ambiente/unione4).

## Regole

- `src/render.js` non si edita a mano: un cambio visivo parte da uno script Python qui accanto, con la sua guardia, applicato al file attuale.
- Dopo ogni passaggio: `python build.py` (da `v7/`) e verifica visiva (Playwright: `shot_gioco.js`).
- I frammenti `.js` di questa cartella (`snowpass.js`, `alberi.js`, `inverno_paesaggio.js`, `inverno_volumi.js`, …) sono sorgenti della pipeline, non del gioco.
- `mente_vercel.py` e `pack_file.py` non toccano render.js: rigenerano `api/_mente.js` e i `.json.js` degli asset.
