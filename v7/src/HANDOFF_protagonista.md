# Porto Vecchio — Il Protagonista: casa, amici, lavoro, bisogni, vizi (3 ottobre, sera)

Moduli nuovi: `src/protagonista.js` (logica, dopo `fazioni.js`) e `src/protagonista_ui.js` (interfaccia, dopo `tasche_ui.js`). In `risacca.js` c'è un aggancio in più, `EXT.willMod` (riga segnata `[protagonista]` in `will()`).

## Cosa fa
- **Casa** in periferia ovest, in una casa dove non abita nessuno (`st.me.home`). Si comincia sotto casa.
- **Tre amici del quartiere**: vicini di casa che si fidano (`n.meFriend`). Ti salutano e commentano come stai (brillo, sporco, stanco), ti invitano al bar la sera (se non vai se lo ricordano), ti prestano soldi da restituire, ti avvisano quando i Grigi chiedono di te.
- **Lavoro**: davanti a una bottega o a un posto di lavoro, «Chiedi lavoro» con paga e orario. Assumono se c'è un posto libero o, a settimane, comunque. Non assumono se sei sporco, ubriaco o ricercato. Più di 10 minuti di ritardo = ritardo; un turno saltato = assenza; 4 ritardi o 2 assenze = licenziato. La paga matura con le ore e si ritira il venerdì alle 18. La domenica si riposa.
- **Affitto** il lunedì alle 9 (12.000); se non bastano i soldi resta l'arretrato e il padrone di casa avverte.
- **Bisogni**: fame, sonno, sporco, noia, solitudine. Salgono con le ore (lavorare fa venire più fame). Effetti: con molto sonno si cammina più piano, si mira peggio e ogni tanto si crolla; con la fame piena si perde salute; sporco e stanco convincono meno quando parli.
- **Vizi**: il vino (bar, osterie, sala giochi) scioglie la lingua (+ persuasione in chat), ma fa tremare la mira, rallenta e il giorno dopo lascia i postumi; la sigaretta (tabacchi, Bar Sirena) ferma la mano per tre quarti d'ora.
- **Azioni** nel menu QUI, ADESSO delle Tasche:
  - a casa: dormi fino a domattina o fai un pisolino, mangia dalla dispensa, lavati, guarda la TV del Garante, nascondi e riprendi la roba che scotta;
  - al bar: bevi, mangia, offri da bere a chi c'è (ti guardano con simpatia), ascolta le voci, flipper alla sala giochi;
  - tabacchi, spesa per la dispensa, chiedi lavoro, lavora fino a fine turno, licenziati, chiedi o restituisci un prestito a un amico.
- **Il tempo che corre**: dormire, lavorare, mangiare, guardare la TV fanno andare il gioco veloce (40 passi per fotogramma) finché non si arriva o finché qualcosa interrompe (ferite, Grigi). Si ferma anche con U o dalle Tasche («Alzati», «Smetti»).
- **Interfaccia**: sotto i soldi, le barre dei bisogni e una riga con lavoro e orario di oggi, paga da ritirare, brillo o postumi, sigarette, dispensa, affitto arretrato. Mentre il tempo corre, una velatura con l'ora.

## Da fare dopo
- Il freddo (stufe, vestiti, carbone) va aggiunto come sesto bisogno.
- La spesa non tocca ancora le scorte di `economia.js`.
- Le sigarette e il vino non sono oggetti nella borsa delle Tasche: stanno in `st.me`.

## Il vino (aggiornamento)
Un bicchiere conta un po': scioglie la lingua, fa tremare la mira, la mattina dopo pesa. Chi beve spesso lo sente meno e ne vuole di più (`alcol`, l'abitudine, sale a ogni bicchiere e scende piano da sobri). Chi è alcolizzato perde lucidità anche da sobrio: le mani tremano finché non beve, convince meno. Stessa regola per il protagonista (`st.me.alcol`) e per gli abitanti (`n.pop.alcol`, in `mestieri.js`).
