# Porto Vecchio — Trame: piani, ricognizioni, complici, insabbiare, infamare, tradire; i sassi (6 ottobre)

Richiesta: raccogliere e lanciare oggetti, sollevare in due, fare piani, ricognizioni, complottare, aiutarsi, insabbiare, infamare o collaborare, e tutto il resto: la città deve essere viva. Righe `[trame]`.

## Trame (trame.js, nuovo; dopo commissioni.js)
- **Scasso** (chi è nel giro dei ladri, o al verde e poco onesto): sceglie una bottega con la cassa piena (meglio l'Emporio) e chiede ai complici (amici poco onesti, la malavita che conosce). Ruoli: chi scassina, il palo, chi porta. Al massimo un colpo nuovo al giorno.
  - **Ricognizione**: uno va di giorno davanti alla bottega e si guarda intorno (commissione `ricog`): sa se passano i Grigi.
  - **Attrezzo**: se nessuno ha un piede di porco, il capo va a comprarlo in ferramenta.
  - **Il colpo**: di notte ci vanno davvero (impegno nella giornata). La riuscita dipende da ricognizione, attrezzo, palo, Grigi vicini, repressione. Il bottino (soldi divisi, merce) si porta via in due e si nasconde in casa del capo (`P.stash`); il proprietario se ne accorge la mattina; chi era vicino e sveglio vede (al buio e da lontano non riconosce).
  - **Insabbiare**: alibi concordato (`P.alibi`, lo sa anche la chat); chi ha visto ed è vicino a uno di loro tace (`silenced`).
  - **Infamare**: chi ha un nemico va di persona da un pettegolo a dire che è stato lui (ricordo falso con `framedBy`).
  - **Tradire**: chi ha paura, rispetta la legge o ce l'ha col capo può parlare coi Grigi (arresto possibile, gli altri sospettano). Chi rifiuta la proposta e rispetta la legge può avvisare.
  - **Rivendere**: la refurtiva nascosta si porta di persona al Magazzino (anche quella che i ladri di popolo.js già nascondevano).
- **Agguato**: chi ha un conto in sospeso (memoria: furto, tradimento, buca, infamia) legge la giornata dell'altro, sceglie dove e quando sarà all'aperto, raduna gli amici coraggiosi e lo aspetta lì; se arriva, lo picchiano (`Azioni.intend 'picchia'`).
- **Infamia** anche senza colpi: chi ha un nemico, ogni tanto, va a infamarlo.
- **Protesta**: quando la rabbia è di tanti (ideologia, rabbia) ci si dà appuntamento sotto la Rocca o l'Emporio; si gridano slogan, i più arrabbiati tirano sassi, i Grigi portano via qualcuno; morale e repressione salgono.
- In chat il personaggio sa delle sue trame, ma come segreto.

## Lanciare (game.js `npcThrow`, `stoneLand`; render.js con `strumenti_inverno/trame1.py`)
- Un abitante tira un sasso verso un punto: vola davvero (come le molotov, senza fiamma e più piccolo). Prende chi incontra (botta, stordimento) o la facciata: se è una vetrina si rompe (`facadehit` col vetro), evento `vandalismo` attribuito a chi l'ha tirato. Chi è vicino si gira e reagisce (`panicAround`). Se il bersaglio è la porta, si mira alla facciata vicina.

## Prestazioni
- Chi è lontano dal giocatore si aggiorna 3 volte al secondo invece che a ogni fotogramma (`farMove`), il ritardo per blocco si calcola una volta: 3,3-3,8 ms per passo con tutti i moduli (erano 6).

## Prove
`node test_imprese.js` (aggiungere `global.Commissioni`, `global.Trame` come in index.src.html). Tre giorni, seme 1: 12 colpi (7 riusciti, 5 andati storti), 460.000 lire di bottino, alibi ogni volta, rivendite al Magazzino. Agguati, proteste e infamie hanno bisogno di rancori e rabbia che crescono coi giorni: in tre giorni non sono scattati.

## Da fare
- Raccogliere da terra (armi, soldi caduti) e sollevare in due cose diverse dai corpi.
- Agguati, proteste e infamie da guardare su partite lunghe.
