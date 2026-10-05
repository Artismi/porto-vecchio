# Porto Vecchio — L'unione di tutti i rami (5 ottobre)

Ramo `claude/unione-completa`: tutto il lavoro delle chat in una build sola, poi portata su `main`.

## Rami uniti (ogni ramo è antenato della build: niente commit perso)
| Ramo | Lavoro |
| --- | --- |
| `nice-pasteur` | Ambiente 1-3: meteo, macchina da presa (HDR, bloom, ACES, profondità di campo, grana), definizione e palette |
| `friendly-wright` | Strade: incroci, segnaletica, sampietrini, cordoli, semafori, guardrail, fontana, suoli premium, vita per terra |
| `clever-knuth` | Il verde: prato, campi, felci, abeti, querce e faggi con chiome a involucro, la Forra |
| `bold-clarke` | Animazioni: pose procedurali, prese, carattere nel portamento, vestiti, oggetti di gioco |
| `determined-edison` | Case in tre fasce, murali del Partito, regia IA della vita di strada, chiave dedicata della chat |
| `confident-heisenberg` | Muri vivi: manifesti, stendardi, bandiere, murales della gente |
| `jolly-curie` | [isola38]: marciapiede vero col cordolo, verde lungo cordoli e muri, incroci |
| già in `main` | Tutto insieme (isola, luci, case, Mente, menu, cantiere), Il Coro, modelli Gemini |

## Dove due rami toccavano la stessa cosa
- **Sterrate**: prima la sfumatura nel prato di [verde] (`vdSterrate`), sopra la terra battuta coi solchi di [strade1] (`sterrato1`).
- **Caselle del terreno**: prima le forme continue di [strade1] (`blobTile1`, `btxUnder1`), poi il prato di [verde] (`prato38`).
- **Ciuffi**: geometria di [verde], colori d'inizio autunno di [amb1]. **Bosco**: radure di [strade1]/[amb1], sottobosco di [verde].
- **Grading**: quello di [amb2]/[amb3] sostituisce la pipeline vecchia; luci_regia6 (righe di schermo, 40 livelli) è superato e non si applica.
- **IA**: le chiavi per canale di main (`chiavi.chat/mente/eventi`, quota e pause per chiave) sono il meccanismo unico; `chatKey` / `MENTE_CHAT_KEY` di [regia] valgono come `chiavi.chat`; il kind `regia` va sul canale `eventi`; la chat passa sempre davanti (client).
- **[isola38]** applicato col suo script sul render.js unito (`inverno_render38.py` accetta anche la `swField` di [strade1]).
- **[muri1] seconda passata**: metà dei muri ciechi delle case comuni col murale della gente, gli altri col murale del Partito di [case]. `luci_regia7.py` non si applica (il sole lo fa [amb1] / [unione4]).
- **[animazioni-mondo]** (`animazioni_mondo.patch`, messa da parte da bold-clarke): applicata ora che verde, ambiente e strade sono uniti; il vento segue il meteo di [amb1] e muove anche il verde (`natMat`).

## Rifiniture dopo l'unione (script in `strumenti_inverno/`, in quest'ordine, ognuno con la sua guardia)
1. `unione1.py`: lampioni che fanno ombra col sole, la luna e gli altri lampioni ma non alla propria lampada; mare che riflette cielo, sole, luna e luci di riva; via i puntini rosa.
2. `unione2.py`: città in ordine (erbacce sul selciato al 17%, niente erba nel suolo, chiazze grandi).
3. `unione3.py`: via le toppe di sampietrini nell'asfalto; murales della gente (heisenberg).
4. `unione4.py`: il sole vero, a sud di giorno; cielo, ombre e riflessi sullo stesso sole.
5. `unione5.py`: 12 carte al vento invece di 44; sampietrini meno contrastati.
6. `unione6.py`: acqua bassa stretta lungo le banchine; rattoppi dell'asfalto discreti.
7. `unione7.py`: chiaro di luna (la notte si legge anche fuori dai lampioni).

## Aperto
- La notte e l'IA vanno guardate su un browser vero e con le chiavi (qui SwiftShader, nessuna chiave).
- Lungo i bordi dei moli resta una striscia chiara (la faccia della banchina).
