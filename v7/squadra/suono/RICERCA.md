# Il suono di Porto Vecchio — analisi e ricerca (squadra/suono)

21 novembre 2026. Il compito: la musica adattiva legata alla regia (`cinema.js`), i passi per superficie, gli ambienti a strati, più
peso a colpi e mezzi, il mix con il ducking e l'interruttore nel menu. Tutto leggero per il telefono (APK, WebView Android).

## 1. Com'è oggi (analisi)

- **Un modulo solo, `v7/src/audio.js` (177 righe)**: `Audio8` crea l'`AudioContext` al primo tocco (`init`, chiamato da ogni
  `pointerdown`/`keydown` in `main.js:110,195,419,666,786,1158,1171,1177`), un `master` (0,55) e un compressore (-14 dB, 6:1) verso
  l'uscita (`audio.js:17-19`), un rumore bianco di 2 s condiviso (`:20`).
- **Gli effetti** sono sintetizzati al volo da `nz()` (rumore → filtro → guadagno → pan, `:43`) e `tone()` (oscillatore → guadagno → pan,
  `:51`): ogni suono crea 3-4 nodi nuovi. `play(e, near, pan)` (`:58-104`) ha 37 tipi (spari per arma, pugni, urti, vetri, crolli,
  clacson, avviamento…). `main.js:1088 sounds()` svuota `st.sfx` e `R.sfx` ogni fotogramma con la distanza (`near = 1/(1+0,07·d)`)
  e il pan dalla posizione sullo schermo.
- **I suoni continui** (`update`, `:105`): il motore a due strati (più lo scarico), la BMX (gomme e cricchetto), la sirena bitonale,
  lo stridio delle gomme, il mare (rumore passa-basso a 260 Hz, sempre a 0,045) e la pioggia. **Sono 8 sorgenti che girano sempre**
  (5 oscillatori/rumori + 3 rumori) con ~16 filtri e guadagni, anche a piedi e col volume a zero: il telefono le calcola comunque.
- **La radio dell'auto** (`radioTick`, `:154`): tre basi hip hop a sedicesimi programmate con mezzo secondo d'anticipo
  sull'orologio dell'audio. È l'unica musica, e solo in macchina.
- **Cosa manca**: nessuna musica fuori dall'auto; **nessun passo**; l'ambiente è un fruscio uguale ovunque (il vicolo suona come il molo);
  14 tipi chiesti dal gioco **non hanno suono** (`wallhit` dei proiettili sul muro, `porta`, `bau`, `ringhio`, `guaito`, `fischio`,
  `folla`, `megafono`, `sirena`, `botta`, `idrante`, `candelotto`, `gas`, `scudo`); nessun mix (tutto nello stesso master, nessun
  ducking sotto i dialoghi); l'interruttore `toggle()` spegne solo i nuovi suoni (i nodi continui restano accesi: il processore lavora
  muto); la pagina nascosta (l'APK in secondo piano: `Main.java` chiama solo `WebView.onPause`) continua a calcolare audio.
- **Il gancio della regia**: `Cinema.tick` (`cinema.js:86`) dà `S.v` (0 pace … 1 azione, sale in 0,35 s, tiene 2,5 s, scende in 3,5 s)
  e `S.motivo` (calma, ricercato, inseguimento, scontro, spari, colpi, ferito, velocità). I momenti grossi accendono `st.slowmo`
  (`game.js:811` testimoni di un fatto grave, `:1143` l'uccisione).
- **Limiti del telefono**: l'APK ha `setMediaPlaybackRequiresUserGesture(false)`, ma l'`AudioContext` può nascere sospeso: si riprende
  al primo tocco (lo fa già `init`). La latenza della WebView è alta e varia col modello (decine di ms): per la musica non conta
  (si programma in anticipo sull'orologio dell'audio), per i passi e i colpi sì, quindi niente catene lunghe. La memoria: un secondo di
  campione mono a 22 050 Hz in `Float32` sono 88 KB.

## 2. Cosa ho imparato (con le fonti)

### Musica adattiva
- **Strati verticali e risequenziamento orizzontale** (Winifred Phillips, GDC 2021, *From Spyder to Sackboy*): gli strati sincronizzati
  che entrano ed escono danno l'intensità senza spezzare il brano; i segmenti con i punti di passaggio «su ogni battito, a ogni
  battuta o in punti scelti» cambiano lo stato; il sistema migliore è ibrido; in *Spyder* l'ordine dei segmenti è casuale e la musica
  **si ferma ogni tanto nel silenzio** per lasciare respirare.
  [verticale](https://www.gamedeveloper.com/game-platforms/pure-vertical-layering-for-game-music-composers-from-spyder-to-sackboy-gdc-2021-) ·
  [orizzontale](https://www.gamedeveloper.com/audio/horizontal-resequencing-and-dynamic-transitions-for-game-music-composers-from-spyder-to-sackboy-gdc-2021-) ·
  [ibrido](https://www.gamedeveloper.com/game-platforms/hybrid-horizontal-vertical-structure-for-game-music-composers-from-spyder-to-sackboy-gdc-2021-)
- **Stinger** (Wwise/FMOD, il talk di Joe Thwaites su *Sackboy* riassunto da Audiokinetic): frasi brevi agganciate agli eventi di
  gioco, messe a tempo sul battito dopo, sopra quello che suona. [Audiokinetic](https://www.audiokinetic.com/en/blog/how-to-use-interactive-music-to-score-gameplay/)
- **Fatica d'ascolto**: la ripetizione è il problema documentato; la generazione procedurale e **le pause** sono il rimedio.
  [Worrall 2025](https://etheses.whiterose.ac.uk/id/eprint/38684/1/Worrall%20PhD%20Thesis%202025.pdf) ·
  [silenzio figurato](https://gamedeveloper.com/audio/video-game-active-ambient-music-and-figurative-silence)
- **Il caso *Racer*** (Google, Web Audio): arrangiamenti a blocchi di **8 battute allo stesso tempo** per passare senza strappi; suoni con
  uno spettro stretto perché gli altoparlanti del telefono distorcono; il motore con tre campioni invece di molti.
  [web.dev](https://web.dev/case-studies/racer-sound)

### Web Audio, tempo e telefono
- **«A tale of two clocks»** (Chris Wilson): le note si programmano sull'orologio dell'audio (`currentTime`) con un anticipo;
  il ciclo del JavaScript serve solo a riempire la finestra. La radio del gioco lo fa già; con i fotogrammi del telefono a 8-12 fps
  l'anticipo va tenuto ≥ 0,3 s. [web.dev](https://web.dev/articles/audio-scheduling)
- **Il costo dei nodi**: il guadagno è quasi gratis, il biquad costa di più, il convolutore (riverbero) e il pan HRTF sono i più cari
  (da evitare sul telefono: meglio un ritardo e un passa-basso). Sul telefono medio la soglia è **20-30 sorgenti insieme**, 10-15 su
  quelli bassi; limitare ogni tipo a 2-4 voci, campioni **mono**, catene corte, sorgenti ferme quando non si sentono.
  [abratabia](https://www.abratabia.com/web-game-audio/audio-performance.php) ·
  [HdM Stuttgart](https://blog.mi.hdm-stuttgart.de/index.php/2021/02/24/web-audio-api-tips-for-performance/)
- **Un guadagno a zero non ferma il calcolo** di una sorgente avviata (segnalato su Firefox; Chrome non rende i nodi staccati dalla
  destinazione, ma non è documentato): la strada sicura è **fermare le sorgenti** e `suspend()` il contesto quando non serve.
  [Bugzilla 1572524](https://bugzilla.mozilla.org/show_bug.cgi?id=1572524)
- **Sblocco e pagina nascosta**: Chrome chiede `resume()` dopo il primo gesto; sospendere il contesto quando la pagina si nasconde
  risparmia batteria, e riprenderlo con un piccolo ritardo è il rimedio ai casi in cui `resume()` non riparte.
  [Chrome: autoplay e giochi](https://developer.chrome.com/blog/web-audio-autoplay) · [Chromium autoplay](https://www.chromium.org/audio-video/autoplay)

### Hip hop anni '80-'90 sintetizzato
- **Il groove boom bap**: cassa sull'1 e sul «e» del 3, rullante sul 2 e sul 4, charleston a ottavi o sedicesimi con lo **swing
  dell'MPC**: 54-58% di solito, fino a 66-68% per la sensazione anni '90; nel pezzo di Attack, cassa e rullante a 57% sugli ottavi e i
  charleston a 74% sui sedicesimi; il rullante «un poco in ritardo».
  [Attack: 90s boom bap](https://www.attackmagazine.com/technique/beat-dissected/90s-boom-bap-hip-hop/) ·
  [MusicRadar: old-school](https://www.musicradar.com/how-to/how-to-program-an-old-school-hip-hop-beat-in-your-daw) ·
  [Attack: lo swing](https://www.attackmagazine.com/technique/passing-notes/daw-drum-machine-swing/)
- **Sintetizzare la batteria**: la cassa è un'onda che scende di colpo di frequenza (da ~150 Hz verso 40); il rullante un corpo tonale
  più un rumore filtrato; il charleston un rumore sopra i 7 kHz o onde quadre in un passa-banda stretto.
  [Opera dev](https://dev.opera.com/articles/drum-sounds-webaudio) · [Sonoport](https://sonoport.github.io/synthesising-sounds-webaudio.html)
- **Il lo-fi**: un letto di crepitio di vinile basso, il passa-basso sopra i 2-4 kHz, un poco di *wow* (la nota che ondeggia),
  il sidechain sulla cassa fa parte dell'estetica.
  [Native Instruments](https://www.native-instruments.com/blogs/blog/how-to-make-lofi-music) · [LANDR](https://blog.landr.com/lo-fi-mixing)
- **Lo scratch**: `playbackRate` di un `AudioBufferSourceNode` con le rampe; il verso indietro si ottiene con una copia rovesciata
  del campione (il parametro non va sotto zero). [iO: Scratching the web](https://techhub.iodigital.com/articles/scratching-the-web)

### La città
- **Gli strati di *Prototype*** (New York): un letto di fondo, uno strato «di mezzo» di folla e traffico che sale con **quante persone
  ci sono** (da ~10 entra la folla rada, oltre quella fitta), i suoni singoli in primo piano limitati di numero; le zone si mescolano
  **per posizione** (al bordo del parco 50/50), non con un interruttore; in alto (i tetti) il suono della strada si filtra.
  [Game Developer](https://www.gamedeveloper.com/audio/dynamic-game-audio-ambience-bringing-i-prototype-i-s-new-york-city-to-life)
- **I passi**: la superficie sotto il piede è il parametro dell'evento; i materiali si dividono in **solidi** (legno, pietra: un
  colpo con una risonanza) e **aggregati** (ghiaia, sabbia, erba: una nuvola di granelli). Farnell (*Designing Sound*) costruisce i
  passi in tre fasi (tallone, rotolamento, punta) e la ghiaia come grana.
  [Farnell, MIT Press](https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/8375/designing_sound.zip/practical26.html) ·
  [Turchet e altri, DAFx-10](https://vbn.aau.dk/files/37619408/Serafin_Turchet_Nordahl_DAFx10_P82.pdf)

### Il mix
- **Bus, priorità, ducking**: musica, effetti, ambiente e voci su bus separati; la priorità è dialogo → segnali di gioco →
  ambiente e musica; il ducking di pochi dB con attacco svelto e rilascio dolce; le «istantanee» (la pausa) cambiano il mix in blocco.
  [Game Developer: Prototype 2](https://gamedeveloper.com/audio/notes-from-the-mix-i-prototype-2-i-) ·
  [Wwise HDR](https://www.audiokinetic.com/en/blog/wwise-hdr-overview-and-best-practices-for-game-mixing)

### Materiale CC0
- I pacchetti di Kenney (passi, impatti, interfaccia) sono CC0 1.0 ([RPG Audio](https://www.kenney.nl/assets/rpg-audio)). **Non li ho
  usati**: tutto il suono qui è sintetizzato in casa, l'APK non cresce di un byte di audio e non c'è nessuna licenza da tenere.
  Se un giorno servono passi registrati, quella è la fonte, con un `v7/assets/audio/LICENZE.md`.

## 3. Come si applica (le scelte)

1. **Campioni cotti in casa, suonati da sorgenti semplici.** Invece di 3-4 nodi sintetici per ogni colpo di batteria, i suoni della
   musica, dei passi e degli ambienti si «cuociono» una volta in `AudioBuffer` mono a 22 050 Hz (calcolati in JavaScript a pezzi, con
   un tetto di ~2 ms per fotogramma, così il primo tocco non scatta). Suonarli costa una sorgente e un guadagno. Il lo-fi a 22 kHz è
   anche il carattere giusto (il campionatore anni '80 lavorava così).
2. **Musica ibrida**: due stati orizzontali (la *pace*, 82 BPM, lo-fi; l'*azione*, 96 BPM, boom bap pieno) e dentro ciascuno gli
   strati verticali che seguono la tensione di `Cinema`. L'azione entra **sul battito dopo** con uno stinger (piatto e «orchestra
   hit», il suono dell'hip hop 1986); la pace torna **sulla battuta** con uno scratch e i soli accordi. Le sezioni della pace (8
   battute) si scelgono a caso con dei pesi, con le pause di silenzio fra un giro e l'altro.
3. **Passi a tempo con la clip**: la fase della camminata o della corsa del modello (`models.js` FASE) decide quando il piede tocca;
   la casella sotto il piede (`G.tileAt`) la superficie.
4. **Ambienti per posizione**: ogni mezzo secondo si guarda attorno (acqua, case, sabbia, verde, banchina, gente vicina, l'ora) e i
   letti si mescolano; i letti muti si fermano davvero.
5. **Un mix a bus**: musica, ambiente, effetti; il ducking sotto il dialogo e gli avvisi, il buco dopo un'esplosione, la pausa ovattata;
   il contesto sospeso quando l'audio è spento o la pagina è nascosta.
