# Porto Vecchio — Telefono e icone a schermo (10-11 ottobre)

Semplificazione per il telefono: tutto quello che si può è punta e clicca; gli attrezzi diventano icone a schermo.

## Le icone (`src/comandi.js`, uguali su computer e telefono)
Una fila in basso (al centro su computer; sul telefono fra la levetta e i pulsanti, in colonna a destra se lo schermo è in verticale):
- **La mano**: compare quando impugni qualcosa e mostra cosa (con i colpi, o la modalità della bomboletta). La ✕ lo rimette via.
  - arma da fuoco: **sul telefono si spara dove tocchi** (anche tenendo premuto con lo Skorpion; il tocco su una persona la segue); il tocco sulla mano ricarica.
  - molotov: si lancia dove tocchi.
  - bomboletta: il tocco sulla mano cambia modalità (libero, tag, throw-up, pezzo, burner, tavoletta); il pallino colorato cambia colore (sul telefono non c'è la rotella).
  - cibo e bevande: si consumano; pala, fotocamera, telefono, gesso, pennello: l'azione dell'attrezzo qui (da `Azioni.playerActions`).
- **Bomboletta** (impugna / rimetti via), **Tavoletta** (impugna già in modalità tavoletta), **BMX** (P), **Skate** (X), **Mappa** (scheda Mappa del menu), **Zaino** (I, col numero delle cose da fare qui). Dalla BMX si passa allo skate e viceversa direttamente.
- Sostituisce il pulsante rotondo ZAINO (`#muBtn`, nascosto dal CSS di comandi.js).

## Il telefono (`main.js`, sezione Touch)
- La levetta resta per camminare e guidare. I pulsanti a destra cambiano con quello che fai (`touchSet`, `TB`); il principale è il più grande, sotto il pollice:
  - a piedi: Salta (tieni e lascia), Arma (se ne hai), Corri, Taccuino; con la bomboletta in mano anche Colore e Modo.
  - in auto: Freno a mano, Spinta, Scendi.
  - in BMX (si va col tocco, come prima): Salta, Impenna, ◄ Piede, Piede ►, Scendi.
  - in skate: **Ollie** (tieni per caricare, lascia per saltare; trascinando il dito sul pulsante scegli il trick: sinistra kickflip, destra heelflip, giù shove-it, un giro 360 flip) e Frena.
- Spariti Parla, Ruba, Spara, Mezzo, Ricarica: si fanno toccando la persona (menu attorno), la macchina, lo schermo con l'arma in mano, la mano.
- Il dito tenuto sullo schermo (`tp` in main.js) segue lo spostamento: spruzza con la bomboletta, spara, spinge la tavola.
- I bisogni (`#me-box`) sul telefono sono nascosti (stanno nel menu, Chi è); Cantiere del covo e «Qui» spostati per non coprire i pulsanti.

## Lo skate (`skate.js`, `PAD`, `padCrouch`, `swipe`)
- **Tieni premuto sullo schermo (o il sinistro sul computer): la tavola spinge verso quel punto.** La levetta curva (e in su spinge).
- Su computer restano W, A/D, Spazio e il gesto del mouse.

## Prove
- `node test_skate.js`, `node test_bmx.js`: passano.
- Provato in Chromium in vista telefono (844×390, touch): icone, pulsanti dello skate, il tocco che spara (caricatore 12 → 11), nessun errore in console.

## Aperto
- Su computer il sinistro con l'arma in mano cammina ancora (si spara col destro): il tocco che spara è solo per il telefono.
- Lo zoom sul telefono (pizzico) non c'è ancora.
