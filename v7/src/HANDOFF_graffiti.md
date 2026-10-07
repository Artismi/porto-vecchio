# Porto Vecchio — Graffiti col pennello dello Studio (7 ottobre)

I graffiti si fanno col pennello dello Studio (lo strumento «Colore» di editor.js, ramo charming-gates): si dipinge
davvero sulla texture della superficie colpita, con la misura bloccata da bomboletta (fra 2,5 e 9 cm). Niente riquadri
appiccicati: la vernice entra nella facciata. Righe `[graffiti]` e `[bombolette1]`.

## Gli abitanti: decide l'IA (graffiti.js)
- Chi parte per dipingere (commissione `passo` per una scritta, `murale` per un'opera) prepara subito il disegno: uno
  locale (scritta in stampatello a tratti + un simbolo che dice chi è: l'onda della Risacca, il Garante con le orecchie
  d'asino, la barca del pescatore, un cuore, una stella…) e intanto chiede all'IA (`/api/mente`, kind `graffito`) cosa
  dipingerebbe quella persona, col suo carattere, umore, ricordi, interessi, odio per il regime. Se l'IA risponde prima che
  arrivi al muro, si dipinge quello dell'IA (testo + tratti liberi in metri sul muro).
- Arrivato al muro, il graffito entra in `st.pop.walls` con i tratti (`strokes`: u lungo il muro, v in altezza, colore,
  spessore). Se il giocatore è vicino lo vede crescere tratto dopo tratto mentre la persona spruzza; se no compare intero.
  Alla fine `paintWall` (popolo.js) lo completa (evento, testimoni, reazioni) invece di farne un altro.
- Se il regime cancella il muro, la facciata torna com'era (gomma dalla copia della texture prima del primo spruzzo).
  Se il quartiere viene ridisegnato, il graffito si ridipinge.

## Il giocatore: la bomboletta (main.js)
- La bomboletta (ferramenta, officina) si impugna dalle Tasche come gli altri attrezzi. In mano, il tasto sinistro tenuto
  premuto spruzza sulla superficie sotto il puntatore, entro 2,6 m (non si cammina col clic). Rotella: colore (rosso, nero, bianco, blu, giallo, verde, rosa, arancio).
- Una bomboletta dura circa un minuto di spruzzo. Chi ti vede dipingere lo sa (evento `vandalismo`).

## Pezzi
- `src/graffiti.js`: font a tratti, simboli, disegno locale, richiesta all'IA, muro in corso.
- `strumenti_inverno/bombolette1.py` (dopo trame1.py): in render.js porta `surfaceAt`/`dab` dello Studio
  (bmbHit, bmbDab), dipinge i tratti dei muri (bmbPass), `R.spray` per il giocatore; i muri con i tratti non hanno più
  il riquadro di muri_gente2.
- `server.js` kind `graffito` (canale eventi); `api/_mente.js` rigenerato.
- Non toccati: casa, scavi, baracche, mobili (progettati altrove).

## Avvicinamento e gesto (aggiunto)
- Chi dipinge va fino al muro scelto partendo (`E.spot`, non dove si è fermato arrivando nel posto), a mezzo metro (la
  grafica misura dov'è davvero il muro: `w.__wallD`), si gira, e solo allora comincia a spruzzare; mentre dipinge si
  sposta di lato seguendo la scritta (`w.__tipU`). La commissione cominciata non viene interrotta dal blocco dopo.
- La posa «vernicia» porta la mano sul punto dove va la vernice (`w.__tip` / `player.__tip`), gli occhi sul tratto.
- Il giocatore spruzza a portata di braccio (1,2 m); un muro più lontano (entro 9 m): ci si cammina davanti e poi si spruzza.

## Il distributore (distributore1.py)
Era una scatola bianca: pensilina, pompe e totem avevano le coordinate della vecchia mappa. Rifatto attorno all'edificio vero.
