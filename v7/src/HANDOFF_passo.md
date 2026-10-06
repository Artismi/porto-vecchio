# Porto Vecchio — Camminare e stare come persone (6 ottobre)

Richieste: gli NPC devono sembrare vivi e sani di mente; muoversi con un proposito; usare la strada comoda e attraversare bene; accorgersi di quello che succede. Non devono essere sincronizzati, né nel passo né nelle altre animazioni, e devono usare lo spazio in modo sensato (non stare in cerchio in un punto). Davanti a un trambusto prima guardano, si girano, poi reagiscono. Ogni gesto deve avere un'intenzione. Righe segnate `[passo]`.

## Percorso (game.js `findPath`)
- A piedi (`roadCost > 1.5`) la scorciatoia non taglia più la carreggiata: si raddrizza solo dentro i tratti dello stesso tipo. Il tratto di strada resta quello scelto dalla ricerca (corto, dritto, dall'altra parte), e il resto non può passare per la strada. Prima si camminava in mezzo alla via e si attraversava in diagonale. Auto e giocatore come prima.

## Passo (game.js `stepAlong`, `separate`)
- Ognuno ha il suo passo (±10%) e il suo lato del marciapiede (si tiene la destra).
- Le svolte si arrotondano e la direzione gira con un limite; in curva si rallenta.
- Chi era fermo e riparte prima guarda dove va e si gira, poi si incammina.
- Le persone vicine al giocatore non si compenetrano: si scansano appena.

## Attraversare (popolo.js `curbWait`)
- Sul bordo del marciapiede, se il passo dopo è in strada: uno sguardo a sinistra e a destra; se arriva una macchina che passerà di lì, si aspetta che passi (al massimo 12 s).

## Stare in un luogo (popolo.js `spotsOf`, `restSpot`, sostituiscono i cerchi)
- I posti si leggono dalla mappa: contro una facciata o un muro, sul bordo dell'acqua, vicino a un albero; mai in carreggiata né sul ciglio. Spalle al muro, sguardo verso lo spazio aperto (verso il mare se c'è).
- Ci si avvicina solo a chi si conosce (vicinanza, memoria; chi è chiacchierone anche a chi conosce appena): in due faccia a faccia, in tre a semicerchio aperto, mai più di tre. Il gruppo si gira verso chi arriva. Chi non conosce nessuno sta per conto suo, a un bordo, lontano dagli altri.
- Soste di 30-80 s; un cambio di posto ogni tanto (12%).

## Niente sincronia
- Le clip (camminata, attesa) partono da un punto a caso del ciclo (models.js `play`).
- Partenze: oltre al ritardo personale, un ritardo diverso per ogni blocco della giornata (`blockJit`).
- Lo sguardo verso il giocatore non è più di tutti quelli entro 7 m (animazioni.js): ti guarda chi ti conosce, chi ti parla, chi ti vede armato o di corsa, e chi ti passa rasente con un'occhiata di un paio di secondi, un attimo dopo, ognuno col suo ritardo.

## Reazioni (game.js `panicAround`, `alarmStep`)
- A uno sparo o un'esplosione: un attimo fermi, la testa e poi il corpo verso il rumore, poi si scappa. Il ritardo dipende dal coraggio e dalla distanza. Chi è coraggioso e lontano a volte resta a guardare («Che succede laggiù?»). Chi sta già scappando continua.

## Gesti con un'intenzione (anim_vita.js `intent`, `groupLook`)
- Chi aspetta un appuntamento guarda l'orologio e si guarda intorno.
- Fuma solo chi fuma, più spesso se è nervoso.
- Col freddo mani in tasca o braccia strette; al muro ci si appoggia; chi legge tira fuori il giornale; sul bordo dell'acqua si guarda il mare.
- In gruppo chi ascolta guarda chi parla.
- Camminando la testa va già verso la prossima svolta.
- Due amici che si incrociano si salutano (`greetFriends`: la mano da lontano, il nome); chi ce l'ha con l'altro tira dritto.

## Misure (node, piazza, 90 s di gioco)
Tempo in carreggiata 6% → 4%; attraversamenti corti e dritti (mediana 5-8 m, la larghezza della strada); inversioni di marcia 0. Disegno delle traiettorie: script in fondo a questo lavoro (non nel repository).

## Da guardare su un browser vero
Il movimento non si vede nelle istantanee: va guardato giocando.
