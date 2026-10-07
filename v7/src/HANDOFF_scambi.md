# Porto Vecchio — Scambi tra la gente e memoria breve/lunga (6 ottobre)

Richiesta: gli NPC devono progettare, ricordare a breve e lungo termine (spostando i ricordi da una memoria all'altra), accordarsi, chiedere aiuto, dare e ricevere, barattare e vendere tra loro, a loro discrezione.

## Memoria (popolo.js, righe `[memoria]`)
- `P.diary` è la **memoria breve** (30 ricordi). Quando si riempie, quello che conta non si butta: passa alla **lunga** (`toLong`).
- `P.lunga` (60 ricordi): di notte (`consolidate`, dentro `reflect`) ci passa quello che pesa o ha un'etichetta importante (furto, bidone, favore, debito, patto…). Lo stesso fatto con la stessa persona non si duplica: si rafforza (`times`). Sbiadisce piano; chi ha coraggio alto tiene i torti più a lungo, chi è loquace tiene meglio i favori.
- `recall`: un ricordo lungo **torna nella breve** («si è ricordato: …») quando si rivede la persona o si torna nel posto, e si rafforza. Di notte un vecchio torto può tornare come pensiero.
- `opinionOf(st, n, id)`: cosa si pensa di qualcuno, mettendo insieme le due memorie. Lo usano gli scambi.
- La memoria lunga va nella scheda della chat (`lifeOf`: «Da tempo non dimentica…») e nel riassunto per il modello linguistico (`mindPrompt.memoriaLunga`).
- `Popolo._.MEET`: agganci chiamati quando si chiude un appuntamento con un patto (`ap.deal`).

## Scambi (scambi.js, modulo nuovo, dopo mestieri.js)
- Roba vera: tasche `P.inv` e casa `P.casa`, con gli oggetti del catalogo di oggetti.js (gli stessi dello zaino del giocatore).
- **Desideri** (`wants`): da mangiare, legna o carbone per la stufa, sigarette (fumatori), vino (vizio), l'attrezzo del mestiere, bende se ferito, radio e carte per chi ha quegli interessi.
- **Eccedenze**: quello che supera la scorta che ognuno tiene (`keep`). Paga in natura: chi lavora si porta a casa un po' di quello che fa (pescatore, fornaio, allevatore, bracciante, boscaiolo…).
- **Trattativa** (`deal`), ogni 20 minuti di gioco in ogni posto con più persone: prezzo da avidità, bisogno, simpatia e memoria (da chi ti ha fregato non compri). Esiti: vendita in lire, si tira sul prezzo, baratto roba contro roba, a credito sulla parola (diventa un debito), rifiuto. In famiglia si dà e basta. Chi è al verde svende (`sellOff`).
- **Patti** (`promise`): se nessuno ce l'ha ma qualcuno lo produce, «te lo porto domani» con un appuntamento vero. Lì la roba passa di mano; chi non viene ha dato buca (etichetta `bidone`, la usa `reflect`).
- **Aiuto** (`askHelp`): chi ha un bisogno urgente e non può pagare chiede prima a chi gli deve un favore, poi alla famiglia, poi agli amici. Chi aiuta se lo segna in `P.debiti` di chi riceve. Un favore non ricambiato è un tradimento e può costare l'amicizia.
- **Debiti** (`settle`, alle 19): si saldano quando si può (dipende da onestà e avidità); dopo 8 giorni chi aspetta si sente fregato.
- **Uso**: si mangia dalle scorte, la sera si brucia la legna (senza, si gela e la si cerca di più), ci si medica.
- Se il giocatore è vicino si sentono le trattative («Quanto vuoi per…?», «Me lo paghi quando puoi.»).

## Prove
`node test_scambi.js [giorni] [seme]`. 3 giorni, seme 2: 82 vendite, 84 svendite, 187 patti (101 mantenuti, 17 rotti), memoria lunga media 2,4 ricordi a testa; 2,15 ms per passo. `test_vita.js` e `test_azioni.js` senza errori; pagina in Chromium senza errori.

## Da fare
- Credito sulla parola e richieste d'aiuto sono rari nei primi giorni (pochi sono al verde): da guardare su partite lunghe.
- Le altre cose del giocatore a discrezione degli NPC: mezzi, cantiere, frugare, costruire.
