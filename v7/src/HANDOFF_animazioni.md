# Porto Vecchio — Animazioni dei personaggi (5 ottobre)

Ramo `claude/bold-clarke-fioelv`. Si unisce a `main` e ai rami attivi (verde, ambiente, strade, Mente) senza conflitti (provato il 5 ottobre).

## File nuovi (solo di questo lavoro)
| File | Cosa |
| --- | --- |
| `animazioni.js` | Motore: dopo la clip del kit piega le ossa verso una posa, nello spazio del personaggio (+z avanti, +y su, +x sinistra). Strati che si fondono, respiro, sguardo, dita (`P.fingers`), mano che gira con l'avambraccio prima del polso (`P.turnHand`), spessore dei vestiti (`P.bulk`). |
| `anim_vita.js` | Vita quotidiana: ~40 pose con attrezzi (siede, dorme, beve, fuma, telefona, legge, scava, zappa, martella, forza, spazza, pesca, prega, balla, bancone, si scalda, attacchina, bomboletta, foto, carte, carriola...) e le mappe che le scelgono. |
| `anim_lotta.js` | Combattimento e stati: mira per arma, ricarica, molotov, guardia, colpito, mani alzate, rannicchiato, alt, ammanetta, in Vespa, ubriaco, freddo, ferito, paura, rabbia, stanco. |
| `../studio_anim.html`, `../strumenti_inverno/studio_anim.js` | Studio delle pose: foto dei personaggi veri (vestiti e armati) senza far partire il gioco. |
| `../strumenti_inverno/animazioni_mondo.patch` | Lavoro sul mondo (vento, bandiere, cavi, schermi) messo da parte: tocca `render.js`, si applica solo dopo aver unito verde, ambiente e strade. |

## Righe toccate fuori da questi file (da riportare se l'altra versione le ha cambiate)
| File | Cosa |
| --- | --- |
| `index.src.html` | `animazioni.js`, `anim_vita.js`, `anim_lotta.js` subito prima di `models.js`. |
| `models.js` | In `animPerson`: la posa può chiedere la clip di base (`Anim.want`), `Anim.restore` prima del mixer, `Anim.apply` dopo. `prepGuns` esportato (per lo studio). Righe `[animazioni]`. |
| `render.js` | Solo le due chiamate `Models.animPerson` del blocco "persone": in più `anim: Anim.npcState/playerState` (e `recoil`, `inVeh` per il giocatore). |
| `vestiario.js` | `g.userData.spessore`; e il lavoro sui vestiti qui sotto. |
| `models.js` | `pickFor`: `look.model` sceglie il modello per nome (studio). |

## Carattere (anim_vita.js, `portamento`)
Ogni abitante ha uno stile calcolato ogni 2 s da età, coraggio (`n.tr.cor`), paura, soldi, sonno, solitudine, loquacità (`n.tr.loq`), divisa: anziani curvi, fieri a petto in fuori, chi è giù con le spalle basse, Grigi dritti con le mani dietro la schiena da fermi. Chi parla guarda chi ha davanti; se la battuta ha un «!» gesticola largo (`discute`). Si legge solo: nessun file in comune toccato.

## Gambe e piedi (motore)
Nel kit i piedi (`FootL/R`) e i poli delle ginocchia (`PTL/R`) stanno sotto Root, non sotto lo stinco, e la clip Idle non li anima. Per questo il motore: rimette a posto piedi e poli a ogni fotogramma (`Anim.restore`); con `P.aim`/`P.rot` sulle ossa delle gambe riporta il piede in fondo allo stinco; offre `P.legTo` (IK a due ossa) a tutte le pose. Le pose di tutto il corpo stanno sulla clip `Idle_Neutral` (piedi uniti), non su `Idle`.

## Vestiti (vestiario.js, 5 ottobre)
- **Spogliati restavano i vestiti del kit**: il filtro dei materiali da tenere cercava «Brow» (sopracciglia) e prendeva anche `LightBrown`/`Brown` (camicie e pantaloni). Ora `KEEP` è esatto; il casco giallo dell'operaio sparisce con gli altri vestiti.
- **Il corpo sotto si sgonfia** (`slim`, una volta per geometria): braccia, avambracci, gambe e collo verso il loro asse (ricavato dai vertici: nel kit le matrici delle ossa sono in un'altra unità), con un tetto per cappucci, orli e risvolti; il busto con una stretta fissa per felpa, camicia e tuta (`TORSO_FIX`).
- **La pelle coperta si toglie** (`hideCovered`): niente ginocchia, spalle o dita che bucano la stoffa. La geometria intera resta in `userData.geo0` e torna con `strip`.
- **Strati più sottili** (un capo: 1,6 mm + spessore·0,17), orli più scuri.
- **Accessori rifatti**: casco jet aperto davanti, colbacco, fazzoletto annodato, passamontagna, papillon, collana, marsupio, cappellino.
- Resta: sul protagonista nudo si intuisce ancora il cappuccio; il modello `Formal` ha la forma della gonna sulle cosce (sotto i pantaloni non si vede).

## Oggetti di gioco (bottino.js, pezzi.js)
- **Le cose da frugare** (`Bottino.MODEL`) rifatte con materiali disegnati (`TX`: legno con venature e chiodi, cartone ondulato col nastro, ruggine, juta, stampino militare, cassone FRAGILE, battistrada): cassa a montanti e traverse, scatola coi lembi e roba che spunta, cestino comunale a doghe col palo, copertone, lamiera ondulata, fascina legata con ceppo e accetta, cassa del mare con alghe e cima, sacco di juta tornito, cassetta munizioni con maniglia, casse da carico su pallet col lucchetto vero.
- **Pezzi**: focolare con braci, ciocchi a capanna e lingue di fuoco (nomi `fiamma`/`fiamma2` invariati, si animano come prima); bobina di cavo col rocchetto.
- Studio: `studio_oggetti.html` + `strumenti_inverno/studio_oggetti.js`.

## Per le altre chat
- **Regia** (`regia.js`): le azioni `fai` passano da `Azioni.startPlan`, e il testo del passo («ripara la rete», «dipinge la barca») sceglie la posa con `BY_LABEL` in `anim_vita.js`. Un verbo nuovo che non trova posa resta in piedi: basta aggiungere una riga a `BY_LABEL`. Il "modo di fare" da fermi (fuma, tasche, braccia conserte, orologio, appoggiato) c'è già in `habit()`.
- **Una posa nuova**: `Anim.def(nome, { base, fade, fn(P) {...} })` e una mappa `Anim.npcMap((st, n, s) => { s.act = nome })`. Si controlla nello studio.
- **Vestiti**: le pose leggono lo spessore e scostano le braccia. Da sistemare nel vestiario, non nelle pose: con i guanti la pelle delle dita buca il guanto.

## Aperto
- `index.html` non è rifatto (lo rifà chi unisce, con `python3 build.py`).
- Nel container lo schermo del gioco è risultato nero a un fotogramma ogni 6 s (browser software). Le pose costano ~0,2 ms a persona e non danno errori. Da guardare su un browser vero.
