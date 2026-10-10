# Porto Vecchio — Fluido (10 ottobre)

Il gioco girava pianissimo (con il doppio degli abitanti dell'alleggerimento #33). Misure, non impressioni:

## Dove va il tempo
- **Logica** (559 persone, 32 agenti, 70 mezzi): 2,8 ms a passo di mediana, picchi rari fino a 48 ms. Non è il collo di bottiglia.
- **Grafica** (periferia ovest, giorno): fino a 13.500 chiamate di disegno e 23 milioni di triangoli per fotogramma;
  senza ombre 4.100 e 7 milioni. In scena 24-25 mila mesh separate, 360-580 mesh con scheletro (persone e vestiti),
  geometrie e texture che crescono girando (3.600 → 6.200 geometrie, 400 → 1.400 texture).
- Le ombre: 12 faretti con ombra (ogni materiale legge 12 mappe per pixel), fino a tre rifatti a ogni fotogramma anche di
  giorno e tutti insieme entrando in una zona nuova (il picco); il sole rifà la mappa 2048 (92×92 m, ~600 oggetti) ogni volta.

## Cosa è cambiato (strumenti_inverno/fluido1.py, main.js)
1. Ombra solo ai 4 faretti più vicini, di sera, uno rifatto per fotogramma.
2. L'ombra del sole a fotogrammi alterni (subito se la camera corre o il sole gira).
3. Risoluzione adattiva: sotto i 45 fps la risoluzione interna scende del 10% (fino al 55%), sopra i 57 risale (`R.scale`).
Risultato (stesso punto, media di 8 fotogrammi): 4.313 → 3.141 chiamate, 7,0 → 4,9 milioni di triangoli, picco 10.652 → 5.418.

## Ancora da fare (in ordine di peso)
- Fondere gli oggetti di scena per blocco e materiale (circa 1.000 mesh e 700 gruppi a istanze nel campo visivo: ognuno è una chiamata).
- Persone lontane più leggere (scheletro semplificato o sagoma) e vestiti fusi in una mesh per persona.
- Il post finale è molto pesante per pixel (decine di letture di profondità e colore): su una scheda integrata pesa più di tutto il resto;
  la risoluzione adattiva lo contiene, una versione leggera per le schede deboli lo risolverebbe.
- Geometrie e texture che crescono girando: blocchi lontani da liberare (dispose).
