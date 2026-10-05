# Porto Vecchio — Ambiente (luci, colore, aria, meteo, acqua)

Aggiornato: 5 ottobre 2026. Script: `strumenti_inverno/ambiente1.py`, guardia `[amb1]`.

## Direzione (Andrea)
- **Niente neve.** Stagione: inizio autunno (prati verdi, macchie gialle e rossicce nel bosco).
- **La città resta del regime**: cemento, intonaci spenti; i soli colori accesi sono il rosso del potere e la luce calda delle lampade.
- **La natura e la luce prendono colore, ma con misura**: le ombre restano colorate, non diventano grigie; deciso salto di valore fra luce e ombra; la lontananza è chiara e perde colore.
  Riferimento: illustrazione con la ferrovia abbandonata nel verde e il sole filtrato dalle chiome.
- **Il tempo cambia**, compreso il brutto tempo.

## Come si applica
Lo script va **per ultimo**, dopo tutta la catena (inverno_render*, monte, interni, luci_regia*, case_render1, isola3x):
```
python3 strumenti_inverno/ambiente1.py src/render.js && python3 build.py
```
Controlla `[luci5]` e `[isola37]` e si ferma se non trova i pezzi che sostituisce.
Il blocco del colore nel post viene **sostituito per intero** fra due ancore stabili: dalla riga `float l = dot(c, vec3(.299,.587,.114));` alla vignetta (`vec2 q = vUv-.5;`).
Chi in futuro cambia il colore del post deve farlo dopo `[amb1]`, perché tutto quello che sta fra le due ancore viene rimpiazzato.

## Cosa fa
1. **Meteo** (`METEO`, `meteoAt(t)`): un tempo ogni 4 ore di gioco, scelto dall'ora e quindi ripetibile, con 50 minuti di passaggio fra un tempo e l'altro.
   Tempi possibili: sereno, velato, coperto, pioggia, nebbia (solo mattina presto e sera), burrasca.
   Ogni tempo è descritto da 4 numeri (`w`): nuvole, bagnato, nebbia, tempesta. Le piogge della storia (22:30-03:00 e 20:00-23:00 del secondo giorno) restano.
   `isRaining(t)` ora dipende dal meteo, quindi anche l'audio della pioggia lo segue.
   Per le prove: `window.__meteo = 'pioggia'` forza un tempo; `null` lo libera. Ogni fotogramma `dyn.meteo` espone lo stato.
2. **Peso del regime** (`regimeAt`, `METEO.reg`, da 0 a 1, ammorbidito nel tempo): prateria e foresta 0, periferia ovest .45, periferia est .6, centro .8, porto .85, Base e luoghi `zoneAt === 'regime'` 1.
   Il peso guida il colore, il verde-acqua della nebbia e le righe da monitor (solo in città).
3. **Colore unico** nel post. Prende ora, peso del regime e tempo e fa quattro cose: una curva sul valore che conserva la tinta, ombre colorate (fredde e viola in città, verde-blu in natura), luci calde col sole, e la saturazione (sobria in natura, spenta in città tranne rossi, lampade e neon).
   Sostituisce `[inverno]`, `[inverno20]`, `[inverno21]`, `[inverno24]`, `[isola37]` e i ritocchi di `[luci5]`. Restano il buio vero di notte e il piede della curva schiacciato.
4. **Lontananza**: prende il colore del cielo, si schiarisce e perde colore; la nebbia del tempo accorcia la vista.
5. **Sole vero**: gira dalla mattina alla sera, è forte col sereno e sparisce col coperto; col coperto riempie la luce del cielo.
   La riga dei minimi di giorno `[isola37]` è sostituita. La notte resta della regia luci.
6. **Cielo e mare**: azzurro pallido col sereno, grigio piombo col coperto; più creste di schiuma col vento.
7. **Pioggia** al posto dei fiocchi: righe storte col vento (`LineSegments` sulla geometria di `dyn.rain`). I riflessi delle luci a terra sono forti solo sul bagnato.
8. **Stagione**: meno alberi spogli (restano sul crinale alto e in prateria), radure e ciuffi verdi.
9. **Vapore, fiato, fumo dei camini**: solo col freddo (notte, bagnato, nebbia). Il fumo si piega con la burrasca.

## Istantanee
`strumenti_inverno/shot_gioco.js`. Per forzare il tempo serve una copia che imposti `window.__meteo = s.meteo` prima di ogni scena.
Punti usati: `piazza` 14:00 e 22:00, `piazza_gov` 10:00, borgo dei pescatori (470, 258) 18:30, `bosco_antico` 11:00, `tavolato` 17:30, `spiaggia_lunga` 13:00.

## Ambiente 2: la macchina da presa (`ambiente2.py`, guardia `[amb2]`, dopo ambiente1)
Andrea: «voglio un lavoro tripla A, dal sapore e la croccantezza cinematografica».
- **HDR**: la scena è disegnata in mezza precisione (`HalfFloatType`), quindi lampade, neon e sole possono superare il bianco.
- **Bloom vero**: soglia morbida a mezza risoluzione, poi sfocatura gaussiana a 1/4 e a 1/8 (`ambPasses`, 8 bersagli in `APS.rts`).
  Sostituisce gli «aloni» a campioni sparsi. La soglia cambia fra giorno e notte (`thrDay`, `thrNight`); di notte il bloom pesa di più.
- **Curva filmica ACES** con esposizione (più bassa di giorno, `.84 + night * .28`). Sostituisce la vecchia curva, la spalla, le righe da monitor e il retino a 40 livelli.
- **Grana fine** da pellicola e **aberrazione cromatica** appena ai bordi.
- **Profondità di campo** da obiettivo basculante: nitido attorno al giocatore (`aFoc`, proiettato ogni fotogramma), morbido in alto, in basso e lontano.
  In auto la sfocatura scende alla metà, al chiuso è spenta. Contorni e occlusione si attenuano dove l'immagine è sfocata.
- **Raggi di sole**: l'aria bassa (16 m sopra la superficie) campiona la shadow map vera del sole, 18 passi. Dove c'è ombra l'aria si scurisce, dove passa il sole si accende.
  Sono più forti con la nebbia e al tramonto, quasi spenti col coperto, spenti in bassa qualità e al chiuso.
- **Vapore**: erano 70 sfiati da 5 sprite tinti dalle lampade, cioè le «palline sfocate» di notte. Ora fuma un tombino su quattro e i barili col fuoco; con la nebbia tornano tutti.
- **Manopole a gioco aperto**: `window.__AMB` = { expo, bloom, thrDay, thrNight, dof, grain, ca, shafts, sharp, outline, vig }.

## Da fare (ordine proposto)
1. **Acqua**: riflesso del cielo e delle luci di riva, profondità, schiuma leggibile. Oggi il mare è pieno di trattini che sembrano pioggia.
2. **Luce a chiazze nel bosco** (rumore che si muove col vento, moltiplicato nella luce del sole) e alone del cielo sui bordi.
3. **Aria unica**: i quattro sistemi di nebbia (`scene.fog`, foschia del post, veli `AIR2.mist`, `VX.fog`) vanno guidati dagli stessi numeri del meteo.
4. **Di notte in città restano macchie tonde sfocate sospese**: da capire da dove vengono (fumo? vapore? altri sprite) e da pulire.
5. **Stagione nei modelli**: abeti e betulle del kit d'inverno (`tree()` nella sezione [inverno]), nome «Lago gelato», «pista di terra gelata», cristalli di brina nei coni di luce.
6. **Resa pittorica** (filtro Kuwahara al posto di retino e righe) da provare.

## Ambiente 3: definizione (`ambiente3.py`, guardia `[amb3]`, dopo ambiente2)
Andrea: «uno strato di pittura che completi i modelli e le texture, colori più saturi ma in palette»; poi «via il dithering, confonde»; poi «è tutto sfocato e sgranato».
- **Risoluzione piena**: prima il gioco disegnava a metà risoluzione (`PX` minimo 2) e ingrandiva a pixel grossi. Ora `PX = round(dpr)`, cioè un pixel del gioco per ogni pixel logico dello schermo; in bassa qualità si torna al doppio.
- **Cavità dalla profondità**: gli spigoli convessi prendono luce, le pieghe e gli incavi si scuriscono (`cav`).
- **Chiarezza**: contrasto locale a media scala, piena in città e ridotta in natura, dove esalterebbe l'erba (`clar`).
- **Inchiostro colorato e profili**: un inchiostro freddo sul lato scuro dei bordi di colore (`ink`) e una luce calda sui profili alti degli oggetti (`rim`).
- **Palette di 52 colori a rampe**, in OKLab, con spinta di saturazione (`sat`). Attira i colori in modo morbido (`pal = .5`, sfuma fra i due colori più vicini), senza retino.
- **Spenti per scelta**: profondità di campo, grana, aberrazione cromatica (`dof`, `grain`, `ca` = 0). Spenta anche la pennellata di Kuwahara (`paint = 0`): resta nel codice, si riaccende con `__AMB.paint = 1`.
- Tutte le manopole sono in `window.__AMB`.
