# Porto Vecchio — «Sotto»: costruire la base, il sottosuolo, la metropolitana (6 ottobre)

## Cantiere del covo (`cantiere.js`, Y)
- **In città si costruisce solo al chiuso**: dentro la stanza del covo (arredi, casse, deposito armi, postazioni) o sotto terra. Fuori, in zona città, il cantiere dice di no.
- **Fuori città il lavoro pesante lo fa la banda**: disboscare, cavare, sterrare, spianare diventano lavori segnati (nastro bianco e rosso sulla casella); i membri liberi della Risacca ci vanno (anche lasciando quello che facevano di testa loro). Legna e pietre finiscono nel baule del covo. Case, garage, capanni, baracche e torrette aprono un cantiere (impalcatura, costruzione trasparente) finché un membro non lo finisce. Senza banda fai tutto da te, subito.
- Nuovi pezzi: **Casetta** (4×3, tetto di coppi), **Garage** (4×4, portone largo 2 caselle), **Tenda** (accampamento, ci si dorme), **Deposito armi** e **Casse del deposito** (aprono le scorte del covo), **Officina del garage** (postazione: potenzia il mezzo parcheggiato a meno di 10 m — motore, assetto, nitro, corazza, gli stessi livelli dell'Officina di Dorino — e ripara la carrozzeria, coi materiali). Il pannello è nel menu Crafting (`pAuto` in `menu_ui.js`).
- Stato: `st.covo.jobs`. Logica in `HOOKS.step` (gira anche in Node), passo `do` della Risacca `covoLavoro`.

## Scavare ovunque (`livelli.js`)
- Sotto una casa «Apri una botola sopra» sfonda il pavimento e **sbuchi dentro** (portale `interno`); da dentro una casa, al piano terra, **H** scava una botola nel pavimento e **V** scende.
- **Maiusc+H**: scava di filato (avanti finché non ti fermi, trovi qualcosa o sbuchi).
- V sale e scende anche da **tombini, scale, grate**. Scavando si trova **roba sepolta** (`Livelli.hooks.dug`), in quattro punti una cassa sotterrata apposta (la cassa del brigante sotto il Paese Vecchio, la roba della guerra sotto i ruderi…).
- `Livelli.hooks.init`: chi vuole aggiungere caselle e portali a ogni partita.

## Scavare: solo 3D (seconda passata)
- La sezione 2D è stata provata e tolta: si scava solo nella vista 3D. La casella che stai per scavare ha un riquadro giallo (verso il puntatore, a passi di 90°); mentre scavi si riempie di buio e saltano le zolle.
- **Le gallerie scavate sono di terra armata** (`tunnelWood` in render.js): telai di legno ogni 2 m nei tratti dritti (due pali, traversa, saette), tavole contro la terra, lanterne appese ogni tanto (con luce vera, al massimo 8), nelle stanze pali contro le pareti e un pilastro col cappello in mezzo. Dal lato della camera la parete è tagliata bassa e i pali pure. Terra a strati con sassi e radici, pavimento battuto coi solchi.
- **Maiusc+J**: pozzo sul posto, il pavimento scende di 1,6 m (oltre i 14 m roccia, oltre i 32 m la falda).
- Fogne più belle: acqua che scorre, pilastri di mattoni, cordoli, tubi lungo le pareti.

## Il sottosuolo (`sottosuolo.js`, nuovo, dopo `livelli.js`)
- **Fogne** sotto le strade grandi della città (4,4 m), **52 tombini** ogni ~30 m sulla carreggiata.
- **Posti**: Cripta di San Rocco, Cripta dei marinai (Santuario), Vecchie carceri (sotto la Caserma della Guardia, si sale in caserma), Rifugio antiaereo (sotto la Piazza del Governo, si sale nel Palazzo), Bunker della guerra (Collina Nera, botola nel bosco), Deposito dei contrabbandieri (sotto il Magazzino Neri, grata sulla calata), Spaccio sotto il Flipper, Mercato di sotto (sotto la piazza), Città dei Topi (cisterna sotto i giardini). Tutti collegati alle fogne.
- **Gente di sotto**: 13 persone che girano, parlano (clic → pannello `#ss`), e quattro banchi (contrabbando, spaccio, ricettatore, Topi) che vendono e comprano coi soldi del giocatore. Casse da aprire (quella di Bavaglio è sorvegliata finché non compri qualcosa).
- **Metropolitana**: Periferia Sud (giardino sul bordo sud della periferia ovest) → Periferia Nord (bordo nord della periferia est), ~293 m. Le due gallerie fanno **mezza elica del DNA**: ai capi affiancate, a metà una sopra l'altra (−16,6 e −24,7 m), passaggi di servizio a pioli bicolori come le basi. Due treni fanno la spola (sosta 14 s, 15 m/s); in banchina col treno fermo V o clic per salire, si scende da soli all'altro capo.
- Grafica nello stesso file (gruppo con `userData.ugKeep`, che `ugPass` non nasconde): acqua delle fogne, arredi dei posti, gente (`Models.person`), casse, gallerie, treni; in superficie tombini, grate, ingressi con la M.

## Ritocchi
- `render.js`: materiali per tipo (mattoni, pietra, cemento, piastrelle), banchina senza pareti, sotto terra si ricostruisce solo una finestra attorno al giocatore, **meno buio** (luce di base, lanterna, nebbia più lontana).
- `main.js`: clic sotto terra con A* sui cunicoli (`Sottosuolo.findPath`), clic su gente/casse/treno (`via: 'sotto'`), Maiusc+H.

## Prove
- `node test_sottosuolo.js`, `node test_cantiere.js`, `node test_livelli.js`: passano.
- Da guardare su schermo vero: le luci sotto terra con la GPU, la metro in corsa, le case della banda.
