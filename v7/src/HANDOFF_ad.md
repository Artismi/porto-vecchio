# [ad] L'art director: la pellicola di strada portata alla cura

Il committente: «voglio l'estetica più raffinata e cinematografica; tu sei l'art director; quello attuale regna, ma deve diventare
perfetto e curato», poi «meno Grande Fratello, più street», «colori più hip hop», «e shader proprio». Il brief e i sei rapporti del
secondo panel stanno in `reports/panel_ad/`. Si parte dalla pellicola di strada ([strada], `PELL`) e dalla leggibilità (`NIT`): non si
torna al grigio. `?noad` spegne questo giro (la pellicola com'era); `window.__AD` dal vivo.

## Fatto in questo giro (render.js, writing.js)
- **La lente**: il rigonfiamento a .045 (era .055: il centro ingrandito del 5,8% era più morbido dei bordi), un filo di nitidezza in più
  al centro (`AD.centro`). Le bande del letterbox e la vignetta sullo schermo vero (`vUv0`): prima si piegavano. **La mira**: il cursore
  passa per la stessa piega del passo finale (`gonfia`, `R.gonfia`) in `screenToGround`, nello spruzzo e nei raggi di writing.js;
  `project` fa l'inversa (due passi). Lo scarto era fino a 13 px a 1024 di larghezza, 24 a 1920: ora zero.
- **L'ombra di giorno** non è più un buco blu notte (L .19): oltremare `#4a5cc8` a .27, e nel passo l'ombra fredda si apre un poco.
- **Le luci crema** (B/R ≥ .84, prima ocra .66-.74), **i neri pieni di giorno** (`proNeri` .045).
- **La sera a due colori** (Do the Right Thing): sole `#ffb47a`, arancio sui muri, magenta-viola `#7a46a8` nelle ombre.
- **La notte**: cielo `#2a3360`, meno blu, più contrasto (1.16).
- **Il sole in diagonale alle vie** (`soleLato` [-68, -112], `soleAlto` [22, 40]): prima correva lungo i caruggi e li riempiva d'ombra.
- **La pozza sul personaggio** appena accennata (`NIT.luce` .06, `avanti` .25): era un occhio di bue, cioè Grande Fratello.
- **I tetti** tengono trama e colore (niente lastre morte): il velo ne prende meno, la calma non li spiana.
- **Lo shader proprio, la firma**:
  - *il retino*: l'ombra è stampata. Puntini a 45° di 14 cm sul piano della superficie (ancorati al mondo), più grandi dove l'ombra è
    piena, nel colore del cielo dell'ora; sotto i 3 px di cella si spengono (niente moiré). Nei materiali (`sgP5.w`, `AD.retino` .09),
    anche sul telefono.
  - *il pennarello*: la linea sulle sagome e sul ciglio prende il colore della cosa (`c·c·.85`), non più il viola fisso.
  - *la grana d'emulsione*: ferma alla risoluzione, cambia 12 volte al secondo, solo nei medi (.022 computer, .014 telefono).

## Il resto del panel (deciso, da fare nei prossimi giri)
1. **Il taglio del primo piano** (cineasta): al posto della sagoma arancio in trasparenza (fa telecamera termica) un taglio a retino
   Bayer 4×4 nei pezzi davanti al personaggio sopra 2,2 m; poi la camera può scendere (`CAMERA4.max` 1.00, `stretta` .92).
2. **Lo sbieco**: il rollio della camera ±0,9° che deriva in 25 s (2,5° sullo skate, 0 nel regime, 0 da fermi prima dell'aggancio ai
   texel); case ±0,6-0,9° da un rumore lento di 40 m (le facciate attaccate non si aprono), pali ±1,5°, cartelli meno storti.
3. **Il rigonfiamento**: zoccolo di 40 cm più scuro, base degli oggetti +8%, personaggi chunky (scarpe ×1,15-1,25, orlo che si accumula),
   schiacciamento all'atterraggio.
4. **I segni di mano** (scenografo): saracinesche abbassate e dipinte su una tela condivisa; i manifesti e le bandiere del regime solo nei
   suoi luoghi, in strada jam, rap, skate, discoteca; almeno 3 segni di mano leggibili per inquadratura; il regime cancella le tag
   (rettangoli grigi `#8c8a84`). Tetti piani: una scritta a rullo su otto e qualche oggetto sopra i 60 m².
5. **La tavolozza hip hop come accenti nei materiali**, sotto il 10-12% del quadro: rosso `#D7262E`, giallo `#F5C518`, blu reale
   `#1E4FB4`, verde `#1E8A4A`, nero `#141414`, bianco `#F2EFE8`, oro `#C9A13A`; fluo (`#FF2E88`, `#9BEA2A`, `#FF7A1A`) solo nei writing e
   nei neon, ≤ 1%. Gli intonaci liguri restano.
6. **Il regime stampato a macchina**: i suoi materiali scrivono alfa .5, il passo lì disegna una linea tecnica uniforme `#4a4e58`, niente
   retino, saturazione ≤ .12. La strada disegnata a mano, il regime stampato.
7. **Il tratto che pesa** (illustratore): spessore che cresce col salto e al piede, pressione da un rumore nel mondo, la penna che salta.
8. **La luce**: il filo di cobalto sul bordo dell'ombra portata, il rimbalzo del sole dentro l'ombra, il bordo dell'ora sulle figure
   (crema, rosa `#ff7eb0` la sera, ciano `#3fb8e0` la notte); ombre delle luci puntiformi più morbide; le ore della sera allineate
   all'accensione dei lampioni.
9. **Il gonfio variabile**: .035 nel regime, .045 a piedi, fino a .065-.085 sui mezzi e sullo skate veloce.
