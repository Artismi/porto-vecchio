# [look] La bibbia del look: un solo look, pulito, leggibile, cinematografico

Il committente: «si vede in bassa qualità», «non sai dove guardare, non si percepisce una profondità naturale», «i tetti sono tutti
rossi e arancioni e pesano troppo, il suolo non si stacca dalle case, non si capiscono volumi e divisioni, è ancora rumoroso». Poi:
«consultiamo un cineasta, uno scenografo, un tecnico luci, un esperto di fotografia, un illustratore e un animatore, e facciamo in
modo che collaborino».

I sei rapporti (con il brief comune) stanno in `reports/panel_look/`. Qui sotto le decisioni: dove i rapporti si contraddicevano
è scritto chi ha vinto e perché. `?vecchiolook` torna a prima (tavolozza dei tetti, grading, camera, scossa); `?nonitida` spegne lo
shader della leggibilità (vedi sotto); dal vivo `window.__NIT`, `window.__SGU`, `window.__CAMERA4`.

## Le diagnosi su cui tutti e sei concordano
1. **Il caldo è sommato cinque volte** (luci, fotografo): sole pesca × `luce` × `proLuce` × `pro.vivo` (i marroni portati al cotto)
   × `pieno`/`proPieno` (saturazione fino a ~1,95× sui toni già colorati). Alle 10:30 l'immagine sembrava un tramonto, il rosso
   bruciava sul 13-40% dei pixel, aranci e gialli erano il 64-80% del quadro, non esisteva un bianco (B/R delle luci .55).
2. **Era una pianta, non un'inquadratura** (cineasta, animatore): nelle vie la pendenza saliva a 70° (`CAMERA4.max` 1.22), con
   44 m di quadro il personaggio era 15-18 px e non si trovava; tetti al 55-65% del quadro.
3. **La «bassa qualità» era soprattutto sfocatura** (fotografo, luci, illustratore, cineasta): ai bordi la nitidezza era il 40-50%
   di quella al centro (fuoco .85, primo piano .55, velo sui tetti). Una sfocatura a schermo si legge come risoluzione bassa.
4. **Il tappeto di cotto** (scenografo, illustratore): coppi, tegole e anche i terrazzi (pianelle) tutti arancio, con micro-dettaglio
   forte (labbro .62, testa 1.18, 340 licheni per tela).
5. **Gli aloni arancioni sui bordi delle ombre** (luci): non la mappa d'ombra, ma la penombra (sole caldo + riempimento blu, croma
   media) che `vivo` e `pieno` saturavano, più la chiarezza che moltiplicava l'RGB.

## Le decisioni (tutte in render.js tranne la camera)
- **Grading unico** (`if (LOOK.on)` dopo i `momenti`): i pro* neutri (`proOmbra`/`proLuce` [1,1,1], `proSat`/`proContrasto` 1), i
  quattro momenti nuovi (tabella del tecnico luci per sole, cielo, terra, bordo, nebbia; del fotografo per esposizione, contrasto,
  saturazione, ombre e luci), `proPieno` .2 di giorno e .3 la sera, `SGU.pieno` .15, `pro.vivo` .2, la tinta delle ombre di giorno
  `#7a8cb8` a .16 (era `#6878c0` a .24: il blu saturo contro l'arancio faceva il poster). Bordo freddo a .22: i muri lo prendono, il
  suolo visto dall'alto no, quindi il suolo si stacca. Ore: il pomeriggio tiene fino alle 17,2, la sera parte alle 18,6.
- **La curva** (`CustomToneMapping`): la spalla si calcola sul canale più alto e scala tutto il colore (la tinta resta, il rosso
  non brucia prima degli altri), e le luci piene virano un poco al bianco.
- **Saturazione per tinta** nel passo (`SG_LOOK`): arancio ×.78, giallo ×.82, verdi ×.85, blu ×.95, viola e rosa ×1.08 (neon e
  tramonti, Vice City); tetti di saturazione: l'arancio nelle luci ≤ .55, il blu nelle ombre ≤ .35.
- **Nitidezza**: solo sul valore e con un tetto (±.05), `SGU.nitido` .45; sfocature ridotte (`NIT.fuoco` .4, `vicino` .22,
  `raggio` 1.6, velo dei tetti .2); `pro.grana` .12 (in movimento sfarfallava), grana di pellicola `AMB.film` .018.
- **Tetti** (`roofTex1`, `flatKind1`, la falda): coppi sbiaditi (`#a87f68`…`#b8957c`, saturazione ≤ 35%), tegole meno accese,
  il cotto dei terrazzi spento, **metà dei terrazzi a lastrico chiaro** (`#d6cfc2`…), **l'ardesia su una falda su tre**; il
  micro-dettaglio dei coppi più morbido (labbro .86, testa 1.06, 60 licheni, 10 colature). Con lo shader (`NIT.tetti`): sopra il
  piano del personaggio un terzo del colore, valore chiaro e stretto, la calma estesa ai tetti.
- **Volumi** (`NIT`, dalla quota vera di ogni pixel): linea sul ciglio, ombra al piede dei muri, suolo spianato.
- **Dove guardare**: la luce segue il personaggio e sta **un passo avanti nella direzione di marcia** (`NIT.avanti`, l'animatore):
  la via davanti è più chiara, invita.
- **Camera** (`visuale.js` `CAMERA4`): `stretta` 1.08 → .98, `max` 1.22 → 1.08; `VIEW` 44 → 38 m (il personaggio più grande).
  Vinto dal cineasta e dall'animatore contro il «quasi dall'alto» di prima; i valori più spinti (zoom .62, `max` 1.05) non presi:
  meno visuale nei vicoli stretti, da provare in gioco.
- **Scossa**: due seni a 13 e 19 Hz, ampiezza `sh² × .9` (al più .35 m), non più un salto casuale a ogni fotogramma.

## Rimandati (proposti dal panel, non ancora fatti)
- Le regole del set (muretti che finiscono sugli spigoli, marciapiede ≥ 1,5 m, niente case nella via, arredo a isole, una cartaccia
  ogni 25 m², cabine solo in piazza a 80 m, panchine solo in piazza e lungomare): le sta facendo il filone della pulizia della mappa.
- La tavolozza degli intonaci (al più tre per quartiere) e del suolo (carreggiata `#55575c`, marciapiede `#8a8780`, piazze
  `#9e978b`), le persiane solo verdi: scenografo, da fare nei materiali.
- Un colore riservato al personaggio e un accento unico per le cose con cui si interagisce (illustratore `#ff4f9a`, animatore
  `#E8A8BF`: da scegliere uno).
- Lo sguardo avanti della camera più lento (costante 16 → 3), la camminata entro 0,7-1,6×, gabbiani a 3-4 Hz (animatore).
- Bande 2:1 solo nelle scene e nei dialoghi (cineasta).

## Come si prova
`GALLERIA_VARIANTI=strumenti/manopole_nitida.json node strumenti/galleria.js <cartella> strumenti/pulizia_scene.json` (lo shader
acceso e spento sulla stessa scena); il prima intero con `PV_QUERY='?cittanuova&vecchiolook&nonitida'`.
