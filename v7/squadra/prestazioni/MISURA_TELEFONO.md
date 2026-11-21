# Misurare il gioco sul telefono (per il committente)

Serve l'APK di prova costruito da questo ramo, o una successiva. Nel gioco non c'è niente da impostare.

## La misura in cinque passi
1. **Apri il gioco** e aspetta di essere in strada. Gioca normalmente per un minuto: il telefono si scalda e si assesta.
2. **Apri il menu dello zaino.** In alto a destra, vicino al pulsante dell'audio, c'è un pulsante nuovo a forma di contachilometri:
   **«Misura prestazioni»**. Toccalo: il menu si chiude e in alto compare un riquadro scuro con i numeri (fps, peggiore, disegni…).
3. **Gioca come sempre per 2 o 3 minuti**: cammina, corri, sali su un mezzo e guida un po', entra in una piazza affollata.
   Il riquadro si aggiorna ogni secondo e intanto prende nota di tutto.
4. **Tocca «Manda la misura»** (il pulsante in basso a sinistra sullo schermo del gioco). Si apre la scelta di Android
   (WhatsApp, posta, Telegram…): manda il testo a noi. Il testo è anche negli appunti: se la scelta non si apre, incollalo in un messaggio.
5. **Tocca «Chiudi»** per togliere il riquadro (o di nuovo il contachilometri nel menu).

Utile, se puoi: scrivi nel messaggio **il modello del telefono** e se era **in carica** o caldo.

## Cosa c'è nel testo (per noi)
Il telefono, lo schermo, la scheda video, il profilo scelto dal gioco; gli fps (mediana, il 10% peggiore, quanti secondi sotto i 25);
il fotogramma peggiore; i millisecondi della logica e della grafica; i disegni a fotogramma; i regolatori (tetto, scala, gradino del
telefono); la memoria; poi un rigo per ogni secondo (t, fps, peggiore, logica, grafica, disegni, «M» se eri su un mezzo).

## Solo per chi ha un computer e il cavo (facoltativo)
Nell'APK di prova il debug della WebView è acceso (nell'APK vera no):
1. sul telefono: Impostazioni → Info sul telefono → tocca 7 volte «Numero build» (opzioni sviluppatore) → attiva «Debug USB»;
2. collega il telefono al computer col cavo, apri Chrome sul computer e vai a `chrome://inspect`;
3. sotto il telefono compare «WebView in it.portovecchio.gioco.…»: **inspect** apre DevTools sul gioco vero (scheda Performance:
   registra 10 secondi mentre giochi e salva il file).

## La prova di confronto (facoltativa, due minuti)
Apri lo stesso gioco in **Chrome** sul telefono (`porto-vecchio.vercel.app/v7/?perf`), gioca un minuto e fai una foto allo schermo col
riquadro: ci dice quanto pesa la WebView dell'APK rispetto a Chrome.
