# Costruire in città: idea di Andrea (da fare dopo la chiusura)

## L'idea
Si costruisce ovunque, ma con un motivo. Un gruppo di cittadini decide qualcosa:
- «Questa via la chiudiamo noi»: fanno una barricata.
- «Noi tre ci facciamo una casetta in mezzo al corso.»

Arrivano i grigi e devono sgomberare. Oppure scoppia una lite, e la zona può diventare autonoma (tipo Christiania ad Amsterdam).

## Come si innesta sul sistema unico (versione economica)
- **Obiettivo nuovo nella mente: «rivendicare un posto».** Nasce da fatti già esistenti: sfratto, sgarbo dei grigi, una via pericolosa, la banda senza casa. Lo sceglie un gruppo (st.vita.gruppi), non un NPC da solo.
- **Verbi nuovi:**
  - `barrica` e `tira_su_baracca`: pezzi modulari (assi, bancali, lamiera, porta di recupero) messi su caselle della strada;
  - `procura` va a cercare i materiali in giro: cantieri, cassonetti, porto.
- **Fatti, ognuno con il suo segno** (bolla, Gazzetta, Si dice):
  - «barricata in via X»;
  - «baracca sul corso»;
  - «sgombero»;
  - «resistenza».
- **I grigi:** l'obiettivo `sgomberare` rimuove i pezzi uno a uno.
  - Gli occupanti possono difendere, trattare o lasciar perdere.
  - La lite è una scena già prevista dai verbi sociali (rinfaccia, chiacchiera).
- **Zona autonoma:** se la baracca resiste N giorni, la zona diventa un fatto stabile.
  - Ha un nome, un cartello e regole sue: i grigi non entrano, si baratta, ci sono feste.
  - Si vede sulla mappa e nel Taccuino.
- **Vincoli:**
  - Mai bloccare i percorsi obbligati del giocatore: lascia sempre un varco.
  - Un massimo di pezzi per zona, per il telefono.
  - I pezzi finiscono nel salvataggio come dati, non come mesh.
- **Stima:** circa 6–8 giorni. Poggia su quello che c'è già (verbo costruire, procura, prenotazioni, segni).

## Case distruttibili a martellate (versione costosa)
Oggi gli edifici sono mesh cotte (tasselli): bucarle a piacere costa molto in geometria, prestazioni e salvataggio. Il compromesso è una facciata a moduli:
- Solo alcune pareti (pianterreno, muri ciechi) sono pannelli sostituibili.
- A martellate un pannello diventa «breccia», cioè un pezzo già fatto con il buco.
- Al buco si attacca un modulo baracca, così l'edificio si allarga.
- Niente distruzione libera: niente fisica, niente crolli.

**Stima:** 10–15 giorni, e tocca chi gestisce edifici e urbanistica. Da decidere insieme.

## Aggiornamento (Andrea)
- **Niente demolizione delle case per ora: si costruisce ovunque.**
- **Gruppi:** anche solo amici, o persone messe insieme dal caso, non per forza da un motivo politico.
- **Alla guida si comportano da automobilisti, non da NPC fermi.** Davanti a un blocco scelgono tra:
  - aspettare;
  - suonare;
  - aggirare;
  - scendere, spostare la macchina vuota che sta in mezzo all'incrocio e risalire sulla propria;
  - riprendersi la propria macchina rubata e abbandonata.

  Sono verbi nuovi (guida, sposta_auto, riprendi_auto, aggira) più un obiettivo «arrivare» con piani di ripiego. Stima circa 5–7 giorni. Da verificare quanto ci dà già oggi il traffico esistente.
- **Fusione baracca e casa.**
  - **Cosa fa:** dove i due volumi si compenetrano, le geometrie si tagliano (booleane CSG, per esempio three-bvh-csg). Dentro nasce un ambiente fuso, con le stanze storte secondo la rotazione data.
  - **Quando si calcola:** una volta sola al momento del piazzamento, in un worker. Nel salvataggio vanno solo posizione e rotazione, e al caricamento si ricalcola.
  - **Come si vede fuori:** sulla linea di giunzione si genera un raccordo, cioè lamiera, assi e scossaline, così da fuori sembra una baracca addossata alla casa e non un oggetto compenetrato.
  - **Problemi:**
    - le case cotte nei tasselli vanno estratte una per una;
    - percorsi NPC e collisioni vanno aggiornati;
    - graffiti sui muri tagliati;
    - pavimenti a quote diverse;
    - peso sul telefono, da limitare a poche fusioni per zona.
  - **Stima:** prototipo con una baracca e una casa in 4–5 giorni, sistema completo 3–4 settimane. Tocca gli edifici: da decidere con chi li gestisce.

## Da aggiungere insieme alla costruzione (Andrea)
- **Lanci:** sassi, bottiglie, molotov, bombe carta, usati negli scontri con i grigi e nelle liti.
  - Un verbo `lancia` con traiettoria e onomatopea (TONF, CRASH, BUM).
  - Le molotov lasciano fuoco e bruciature temporanee.
  - Classificazione: Andrea accetta anche PEGI 18 («è la real life»). Il tono resta fumetto, ma senza censure.
- **Arrampicarsi:**
  - su palazzi, grondaie, balconi e impalcature (solo i punti appigliabili, segnati come proprietà);
  - sui tetti con le scale.
  - Dai tetti: osservare, lanciare, gridare, scappare da tetto a tetto, fare il tetto un luogo della banda.
- **Highline e slackline tra palazzi:** il verbo `monta_fune` tra due punti d'ancora sui tetti, poi `attraversa` con equilibrio e possibile caduta comica.
  - È anche una via di fuga: i grigi non la seguono.
  - Dalla strada si forma un pubblico che guarda.
- **Il circo:** qualcuno in giro in monociclo, giocolieri, trampoli. Un mestiere o un hobby nell'indole di alcuni NPC, con cappello per le monete e pubblico che si ferma.
