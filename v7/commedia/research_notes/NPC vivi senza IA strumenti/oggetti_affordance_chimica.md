# Oggetti che dicono cosa sanno fare: smart object, affordance, motori chimici

> Etichette come in `giochi_stesse_regole.md`: **[letto]**, **[estratto]**, **[non verificato]**.
> Il primo rapporto ha già nominato le smart object dei Sims come "oggetti furbi". Qui interessa il meccanismo preciso che permette a un oggetto **nuovo** di essere usato da agenti che non ne sapevano niente, e a un oggetto **qualsiasi** di essere usato per uno scopo che nessuno aveva previsto.

---

## 1. The Sims: il comportamento sta nell'oggetto

- Nel motore Edith ogni oggetto ha dati locali e un insieme di comportamenti; ogni comportamento è **una procedura che lo esegue, una procedura che verifica se è possibile, e un insieme di "advertisement"** che dicono quali bisogni del Sim soddisfa. I Sim non controllati scelgono, fra tutti i comportamenti possibili di tutti gli oggetti, quello che massimizza la loro felicità; la procedura scelta gira nel thread del Sim, con accesso ai parametri di entrambi. «I Sim stessi sono solo un oggetto un po' più elaborato.» Le interazioni sociali passano da un oggetto intermedio invisibile creato al momento — [Forbus & Wright, *Some notes on programming objects in The Sims*](https://qrg.northwestern.edu/papers/Files/Programming_Objects_in_The_Sims.pdf) **[letto]**
- Wright: «abbiamo reso le persone molto stupide e l'ambiente e gli oggetti molto furbi»; l'idea viene da SimAnt (feromoni), e permette di aggiungere oggetti nuovi senza che i Sim li conoscano prima — [GMTK, trascrizione](https://amara.org/subtitles/cVoJS4OdmVql/en/1/download/The%20Genius%20AI%20Behind%20The%20Sims.en.txt) **[estratto]**
- E il rovescio: l'autonomia iniziale era troppo brava, «quasi tutto quello che faceva il giocatore era peggio dei Sim col pilota automatico» — [PC Gamer](https://www.pcgamer.com/games/the-sims/will-wright-says-the-original-sims-ai-was-actually-too-good-almost-anything-the-player-did-was-worse-than-the-sims-running-on-autopilot) **[estratto]**
- The Sims 4 chiama le interazioni "affordance" nei file di tuning: le *super affordance* si aggiungono alla lista di un oggetto; i *mixer* girano dentro una super interazione; l'uso autonomo si limita con `test_autonomous` e `allow_autonomous` — [lot51 Simdex, game concepts](https://lot51.cc/simdex/game-concepts) **[estratto]**; [triplis, guide](https://triplis.github.io/nav/guides.html) **[estratto]**
- **Cosa rubiamo**: (a) la terna *esegui / verifica / pubblicizza* per ogni verbo; (b) il giocatore come Sim senza selettore automatico, e quindi l'NPC in banda come Sim a cui si stacca il selettore; (c) l'avvertimento di Wright quando si passa la mano: l'NPC lasciato in automatico non deve "giocare meglio" del giocatore nelle cose che contano.

## 2. F.E.A.R.: tre stati e un piano

- La macchina a stati dei personaggi ha **tre stati: Goto, Animate, UseSmartObject**, e UseSmartObject è solo un Animate guidato da dati: l'animazione è dichiarata dall'oggetto nel database. «La realtà è che tutto quello che fanno le IA è muoversi e suonare animazioni.» — [Orkin, *Three States and a Plan*, GDC 2006](https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf) **[letto]**
- Il vantaggio principale dichiarato è **separare obiettivi e azioni**: tipi diversi di personaggio condividono le azioni; un nemico nuovo si è fatto combinando le azioni aeree del fantasma con quelle di tiro del soldato. I comportamenti si stratificano ("la salsa a sette strati") senza scrivere le transizioni — stessa fonte **[letto]**
- **Cosa rubiamo**: il corpo esegue solo *vai* e *gesto con oggetto*. Tutto il resto è dati sopra. È la base del ripiego d'animazione (`animazione_senza_script.md`).

## 3. Unreal Engine 5: Smart Objects + Mass

- Il plugin Mass Gameplay calcola un LOD per entità con tre clienti (rappresentazione, simulazione, replica) e usa StateTree; le Smart Object sono prenotate tramite un sottosistema, così che le entità non litighino per la stessa panchina — [Epic, Mass Gameplay overview](https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-gameplay-in-unreal-engine?lang=de) **[estratto]**; [MassCommunitySample](https://github.com/getnamo/MassCommunitySample) **[estratto]**
- **Cosa rubiamo**: la **prenotazione** come primitivo del registro (RimWorld fa lo stesso con le reservation, vedi `pianificatori_e_costi.md`). Con mille NPC e un solo martello in via del Forno, chi lo prenota per primo; gli altri prestano, aspettano o sostituiscono.

## 4. Zelda: dal design additivo al moltiplicativo

- GDC 2017, "Change and Constant": Fujibayashi parla di passare dal design "additivo" a quello "moltiplicativo"; Dohta descrive il **motore chimico** come complemento del motore fisico: «se il motore fisico è un calcolatore di movimento a regole, il motore chimico è un calcolatore di stato a regole». Fuoco, acqua, ghiaccio sono *elementi*; alberi, rocce e il giocatore sono *materiali*. Le meccaniche sono state provate prima su un prototipo 2D come il primo Zelda per NES — [Thumbsticks, GDC 17](https://www.thumbsticks.com/gdc-17-breath-of-the-wild-science-lies) **[estratto]**; [Tom's Guide](https://www.tomsguide.com/us/zelda-breath-wild-design,news-24586.html) **[estratto]**. Le fonti divergono sulle tre regole (se i materiali possano o no cambiare lo stato l'uno dell'altro): **da ricontrollare sulle slide**.
- GDC 2024, "Tunes of the Kingdom": con l'Ultrahand gli oggetti non fisici creavano problemi ogni giorno; la soluzione è stata **eliminarli tutti**, anche i cancelli; Dohta: fare «un sistema che fa succedere cose divertenti» invece di cose divertenti direttamente — [GDC Vault](https://www.gdcvault.com/play/1034667/Tunes-of-the-Kingdom-Evolving) **[estratto]**; [Shacknews, recap](https://shacknews.com/article/139210/zelda-totk-gdc-2024-panel-recap) **[estratto]**; [The Verge](https://hn.jakechampion.name/reader/https://www.theverge.com/24115898/tears-of-the-kingdom-physics-gameplay-design-gdc-2024) **[estratto]**
- **Cosa rubiamo**: (a) le **proprietà dei materiali** come vocabolario chiuso (rigido, pesante, lungo, piatto, cavo, appuntito, tagliente, infiammabile, galleggia, suona, appiccica, si piega); un verbo chiede proprietà, non oggetti. (b) La lezione dell'Ultrahand trasposta: **niente oggetto fuori dal registro**. Se una cosa si vede, ha proprietà; se ha proprietà, è usabile da chiunque. Ogni eccezione è un baco futuro.

## 5. Noita: ogni pixel è simulato

- GDC 2019, Petri Purho: come scalare la simulazione "falling sand" a mondi continui, integrare corpi rigidi distruttibili, tarare il gameplay emergente — [GDC Vault, Exploring the Tech and Design of Noita](https://gdcvault.com/play/1025695/Exploring-the-Tech-and-Design) **[estratto]**. Regole molto semplici (un pixel si muove di un pixel per tick, solo in un posto vuoto) secondo un riassunto di terzi — [Reddit r/howdidtheycodeit](https://axebps-redlib.hf.space/r/howdidtheycodeit/comments/ej07ns/exploring_the_tech_and_design_of_noita) **[estratto, fonte debole]**
- **Cosa rubiamo**: non la simulazione per pixel (troppo cara per un telefono 3D), ma il principio: poche regole locali tra proprietà producono più casi di quanti se ne potrebbero scrivere.

## 6. Scribblenauts: un vocabolario di oggetti senza codice per oggetto

- Il motore Objectnaut permetteva di aggiungere parole al database senza scrivere comportamento nuovo per ognuna; gli oggetti stanno in categorie che ereditano tratti, «ma c'erano sempre eccezioni»; ogni oggetto porta proprietà che governano come reagisce alle altre cose — [Kotaku, The secret behind Scribblenauts](https://kotaku.com/the-secret-behind-scribblenauts-making-objects-by-hand-1796262472) **[estratto]**; [Scribblenauts wiki, Object editor](https://scribblenauts.fandom.com/wiki/Object_editor) **[estratto]**
- **Cosa rubiamo**: la gerarchia di categorie con eredità **più** una colonna di eccezioni scritte a mano. È il compromesso giusto per i ~300 oggetti degli interni più le 142 ricette: 80% ereditato, 20% scritto.

## 7. Immersive sim: unità ortogonali e "act/react"

- Harvey Smith (GDC 2003): la *differenziazione ortogonale* delle unità dà a ciascuna qualità distinte, spinge al gioco intenzionale e allarga lo spazio delle possibilità; il test è se il punto debole di un'unità si copre con un'unità di ruolo diverso; quasi nessuno la fa pura — [slide, Orthogonal Unit Differentiation](https://slidetodoc.com/orthogonal-unit-differentiation-harvey-smith-witchboyionstorm-com-intro/) **[estratto]**
- Prey (2017) è descritto come immersive sim dove ogni situazione è un problema da risolvere con la conoscenza degli strumenti; ma la critica nota che l'IA dei nemici è basica — [Hardcore Gaming 101](https://www.hardcoregaming101.net/prey-2017/) **[estratto]**; [PC Gamer via PressReader](https://www.pressreader.com/usa/pc-gamer-us/20170620/281676844868969) **[estratto]**
- **[non verificato]** Il Dark Engine (Thief, System Shock 2) aveva un sistema "Act/React" a *stimoli* e *recettori*: una freccia di fuoco porta lo stimolo Fuoco, gli oggetti con il recettore giusto reagiscono. Trovato solo in una pagina di qualità dubbia ([vectree](https://vectree.io/c/dark-engine)); il postmortem di Tom Leonard su Gamasutra (1999) non è stato letto.
- **Cosa rubiamo**: stimolo/recettore è la forma minima del motore chimico, ed è economica: una tabella `(proprietà-sorgente × proprietà-bersaglio) → effetto`. E l'ortogonalità diventa una regola per i mestieri della banda: ognuno copre un buco dell'altro (il fabbro ha l'attrezzo, il pescatore la barca, il writer la scala, il prete le chiavi del campanile).

## 8. Sintesi: tre livelli di affordance

| livello | cosa dichiara | esempio a Porto Vecchio | fonte del modello |
|---|---|---|---|
| **oggetto → verbi** | l'oggetto pubblicizza cosa si può fare con lui e che bisogni soddisfa | la panchina: siediti, dormi, sali in piedi per il comizio | Sims, F.E.A.R., UE5 |
| **verbo → proprietà** | il verbo chiede ruoli con proprietà, non oggetti precisi | *piantare*: un *percussore* (rigido + pesante + impugnabile) e un *perno* (appuntito + rigido) | Zelda, Scribblenauts |
| **proprietà × proprietà → effetto** | regole locali tra materiali | fuoco × legno secco → brucia; acqua × vernice fresca → cola; sale × ghiaccio → scioglie | motore chimico, act/react |

Il primo livello rende gli oggetti scopribili; il secondo rende possibili le **sostituzioni** (il martello che manca diventa la padella); il terzo rende possibili **effetti non scritti** (la vernice che cola sul vestito del Garante). Il secondo livello è quello che risponde alla richiesta della direzione artistica: un NPC che vuole piantare un chiodo e non ha un martello **ha comunque un'opzione**, perché il verbo non chiede "il martello" ma "qualcosa che batta".
