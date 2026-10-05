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
| `vestiario.js` | `g.userData.spessore` (metri di vestiti per parte), azzerato in `strip`. |

## Per le altre chat
- **Regia** (`regia.js`): le azioni `fai` passano da `Azioni.startPlan`, e il testo del passo («ripara la rete», «dipinge la barca») sceglie la posa con `BY_LABEL` in `anim_vita.js`. Un verbo nuovo che non trova posa resta in piedi: basta aggiungere una riga a `BY_LABEL`. Il "modo di fare" da fermi (fuma, tasche, braccia conserte, orologio, appoggiato) c'è già in `habit()`.
- **Una posa nuova**: `Anim.def(nome, { base, fade, fn(P) {...} })` e una mappa `Anim.npcMap((st, n, s) => { s.act = nome })`. Si controlla nello studio.
- **Vestiti**: le pose leggono lo spessore e scostano le braccia. Da sistemare nel vestiario, non nelle pose: con i guanti la pelle delle dita buca il guanto.

## Aperto
- `index.html` non è rifatto (lo rifà chi unisce, con `python3 build.py`).
- Nel container lo schermo del gioco è risultato nero a un fotogramma ogni 6 s (browser software). Le pose costano ~0,2 ms a persona e non danno errori. Da guardare su un browser vero.
