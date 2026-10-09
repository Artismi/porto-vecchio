# Porto Vecchio — La BMX tascabile (8 ottobre)

Come la bici dei Pokémon: ce l'hai sempre in tasca, la tiri fuori quando vuoi.

- **P** (o il pulsante **BMX** sul telefono): tira fuori la BMX e ci salti sopra. **P** di nuovo, oppure **F**, per scendere: la pieghi e torna in tasca. Nel mondo non resta niente: nessuno te la può rubare, e Sandro non la compra.
- Non si tira fuori al chiuso, sotto terra o sui ponti (`p.lv`), a nuoto, con un corpo in spalla, né quando sei già su un altro mezzo.
- Guida: `VK.bmx` in `game.js` (`two: true, pocket: true`): massimo 9 m/s (la Vespa fa 12,5), molto agile, 95 kg con te sopra. Shift spinge come il nitro degli altri mezzi: pedali più forte.
- Non brucia e non esplode: se la colpiscono abbastanza forte ti butta giù (un attimo stordito) e torna in tasca intera (`damageVehicle`). Scendere in corsa non fa male.
- Niente motore (`audio.js` non suona), niente fari (`render.js` non disegna la chiazza di luce), niente officina (`protagonista.js`).
- Modello: `bmxMesh` in `render.js`, telaio a diamante azzurro, ruote da 20" a razze, manubrio alto, imbottitura gialla sul tubo. Il giocatore ci sta seduto come sulla Vespa.

## Prove
- `node test_bmx.js`: passa.
