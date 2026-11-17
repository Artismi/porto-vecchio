# CONTROLLI — i comandi sul telefono (branch `controlli`)

Quattro guai segnalati giocando l'APK (telefono, comandi a tocco, profilo leggero). Ogni rimedio ha il suo interruttore per tornare com'era.

## 1. In BMX la camera entrava addosso al ciclista (`?nocontrollicam`)

**Causa.** Non era il braccio della camera a piedi (camera7, i raggi riusati di FLUIDO2/FLUIDO3: sui mezzi non gira, e quella lista
esclude già persone e mezzi). Sui mezzi la camera è quella da inseguimento (`insegui7`, render.js) e il guaio veniva da tre cose insieme:
- il braccio della BMX (6 m) si accorciava con la velocità fino al 24%;
- il punto guardato andava avanti alla bici fino a 2,5 m;
- il piano vicino del «taglio» (`KN`) arrivava a 1,2 m prima del punto guardato. Col braccio corto e il punto avanti, il piano vicino
  passava dietro la ruota posteriore e il ciclista, poi la bici, sparivano.

**Rimedio.**
- In BMX il braccio non si accorcia più con la velocità (la pendenza cala appena: 0,03 rad).
- Il punto guardato sta al più 1 m avanti alla bici (prima 2,5 m).
- Su ogni mezzo il piano vicino sta almeno 0,5 m prima del punto del mezzo più vicino alla camera (gli otto spigoli della scatola, da
  terra a 2 m). Auto e motorini tengono la loro camera.

## 2. Lo scivolare contro gli ostacoli (`?noscivola`, in Node `NOSCIVOLA=1`)

**Causa.** Contro un'auto ferma la BMX (95 kg contro 1000) rimbalzava (e = 0,3), l'attrito lungo il fianco (0,4 j) le toglieva la
velocità lungo il contatto, e le gomme la riportavano lungo il muso, cioè dentro l'auto. Da ferma la bici non sterza: restava piantata
fino a quando `sblocca` faceva la retromarcia (1,2-1,4 s). Contro i muri l'urto era per assi (x, y), senza una normale vera.

**Rimedio** (game.js, solo il mezzo del giocatore):
- il contatto lascia una normale (`v.cont`): per i muri la media delle direzioni libere attorno al punto toccato (`normaleMuro`), per le
  auto l'asse di separazione;
- contro un'altra auto: niente rimbalzo (e = 0,06), poco attrito lungo il fianco (0,08 j), 3 cm in più di spinta fuori;
- `scivolaMezzo`: col gas, la velocità contro l'ostacolo si toglie (proiezione sulla tangente), lungo la tangente resta almeno il 70% di
  quella d'arrivo, il muso gira verso il lato dove sterzi (o dove già punta) anche da fermo, e le gomme non si mangiano lo scivolare per
  0,12 s. Contro un'auto pesante come la tua, senza sterzare, la spingi come prima (lo speronamento resta);
- `sblocca` ([guida2]) resta per il muso dritto contro senza sterzo; ora si accorge in 0,35 s anche del muso contro un'auto (la mappa le
  auto non le conosce: prima aspettava un secondo intero);
- a piedi contro un'auto: un cerchio contro la scatola vera (`cerchioFuori`), non la scatola allargata: sugli spigoli si gira attorno
  liscio; fra l'auto e il muro si esce di quanto si può, poi si scivola lungo il fianco.

I passi restano di 35 cm al più (`physStep`) e lo spostamento lungo la tangente passa dalle stesse prove: niente muri attraversati.

**Misure** (sonde in Node, 48 urti contro un'auto ferma, sterzando al contatto): BMX staccata dall'auto in 0,2-0,5 s (prima 1,2-2,6 s,
sempre con la retromarcia automatica), nessun mezzo incollato oltre 1,5 s (prima 5 su 48). Contro un muro, 18 prove fra BMX e Giulia:
fermi in tutto 1,7 s (prima 6,4 s). A piedi, 300 prove contro muri e 300 contro auto: nessun incastro con una via libera entro ±60°.

## 3. La superficie dei graffiti (`?nosuperficie`)

**Causa.** Sul telefono la cornice gialla sta al centro dello schermo (`tavFrameTick`, writing.js). Il raggio di lì passa oltre il
personaggio e tocca il muro o la terra secondo quanto è lontano il muro: non si poteva scegliere.

**Rimedio.** Nella fila delle misure (tag, throw-up, pezzo, burner) c'è un tasto in più, **Muro/Terra** (tavola_ui.js). Un tocco passa
dall'uno all'altro e la scelta resta salvata (`pv_tavola_sup`).
- «Muro», la scelta di partenza: se al centro c'è la terra, la cornice va sul muro vicino e davanti (`supDavanti`). Lo cerca con raggi
  orizzontali dal petto e dalle ginocchia, dove guardi e dove guarda la camera, a ±25° e ±50°, entro 4,5 m, alto almeno un metro.
- «Terra»: il selciato davanti ai piedi.
- Toccare col dito un'altra superficie la sceglie comunque; toccare la cornice gialla apre quella.
- «Dipingi il muro» (azioni.js, `Writing.apri`) prende il muro davanti.
- Col mouse vale il puntatore, come prima.

## 4. I pulsanti e la levetta del telefono (`?nolevetta`)

- **Salta + Picchia.** A mani nude i pulsanti a piedi sono Salta e Picchia, sullo schermo e nel Game Boy dell'APK (dove B era Corri).
  Picchia dà il pugno di sempre (`G.fire` coi pugni, lo stesso del «Picchia» del menu di una persona), verso la persona più vicina
  davanti (2,4 m, ±75°) o dove guardi. Con un'arma B spara, con un oggetto lo usa, come prima.
- **Si corre con la levetta.** Il tasto Corri non c'è più (`levMag`, main.js):
  - c'è una zona morta (0,15);
  - la risposta è quadratica, così il passo lento si trova facile;
  - quanto spingi è la velocità voluta, da 1,3 m/s alla corsa di 6,4 m/s;
  - la parte chiesta sale al più in 0,7 s fino al pieno, e scende subito: lasciando si rallenta col freno del passo.
- **BMX e auto.** Vale la stessa regola: la spinta è il gas e la velocità voluta, con la rampa (BMX e motorini 0,7 s, auto 1,8 s).
  L'accelerazione cresce solo per la levetta a tocco (`drive.acc`, `v.accK`: BMX ×1,7, auto ×1,25): a fondo si arriva al massimo in
  circa 1 s in BMX e circa 2 s in auto. Tirando la levetta indietro (verso dietro il mezzo) si frena e poi si va in retromarcia, come
  prima.
- Tastiera, mouse e controller restano com'erano (Maiusc corre).

## Prove

- `node src/test_guida2.js`: la prova 6 (il muso nel muro) ora accetta anche lo scivolare fuori dall'angolo, oltre alla retromarcia.
- Passano anche `test_bmx`, `test_controlli8`, `test_camera7` e `test_comandi6`.
- `test_writing` ha un errore che c'era già prima di queste modifiche: «nel menu: Writer: ZETA».
- Le sonde stanno nella cartella temporanea della sessione: il mezzo contro un'auto, contro un muro, a piedi, e nel browser la BMX per
  10 s, la superficie e i pulsanti.
