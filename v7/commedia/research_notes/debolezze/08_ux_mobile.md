# 8. UX mobile per giochi sistemici

## Il fallimento
Sistemi pensati per mouse e monitor (menu contestuali profondi, testo minuto, flusso di notifiche) diventano illeggibili e frustranti su telefono: si perde proprio la leggibilità che la simulazione richiede (nota 1).

## Riferimenti
- **RimWorld Console Edition (Double Eleven, 2022)**: interfaccia rifatta da zero per TV e controller, "molto più audace e leggibile"; controlli contestuali agli angoli legati ai pulsanti; "mai più di tre passi da qualunque azione"; aree di focus separate per le notifiche; animazioni superflue tolte. [DualShockers](https://www.dualshockers.com/bringing-rimworld-from-pc-to-console-interview/), [Windows Central](https://www.windowscentral.com/gaming/xbox/this-upcoming-xbox-game-lets-you-cannibalize-your-friends-and-wear-their-skin), [Double Eleven](https://rimworld.double11.com/news/robinbetkainterview)
- **Dimensioni del testo**: Xbox Accessibility Guidelines 101 dà minimi per mobile/streaming in altezza del corpo (18 px a 100 DPI, 36 a 200, 72 a 400) e chiede testo scalabile; i magnificatori di sistema non contano. IGDA GASIG: 32 px a 1080p, 46 px per testo a tempo (sottotitoli), massimo ~38 caratteri per riga di sottotitolo. [XAG 101](https://learn.microsoft.com/gaming/accessibility/xbox-accessibility-guidelines/101), [IGDA Top Ten](https://igda-gasig.org/how/game-accessibility-top-ten-se/), [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/?p=21)
- **Bersagli tattili**: Material 48×48 dp con 8 dp di spaziatura; Apple 44×44 pt; WCAG 2.2 AA 24×24 px CSS (2.5.8), AAA 44×44 (2.5.5). [Adrian Roselli](https://adrianroselli.com/2019/06/target-size-and-2-5-5.html), [frontendchecklist](https://frontendchecklist.io/rules/accessibility/touch-targets)
- **Sovraccarico di notifiche**: RimWorld distingue *lettere* (persistenti, colorate per gravità, con "vai a") e *messaggi* (testo che svanisce) (conoscenza diretta del gioco; la pagina wiki "Letters" non era raggiungibile); CK3 ha reso "meno spam di eventi" un obiettivo esplicito (nota 2). Le notifiche native push sono un'altra cosa e vanno usate con moderazione (vedi anche "pressione a giocare" PEGI, nota 7).

## Principi
1. **Un verbo primario per tocco** (tocca NPC = guarda/parla; pressione lunga = ruota di 4-6 verbi contestuali), mai menu annidati oltre due livelli.
2. **Tre livelli di notifica**: sussurro (testo diegetico sopra la testa, svanisce), avviso (striscia in basso, raggruppabile), lettera (ferma il tempo opzionalmente, salva nella cronaca). Budget: al massimo 1 lettera ogni ~5 minuti reali, raggruppare il resto.
3. **Raggruppamento**: "3 nuove dicerie al mercato" invece di tre popup.
4. **Testo**: corpo ≥ 16 px CSS effettivi su telefono, battute a tempo più grandi, opzione 100/125/150%, contrasto con fondo del fumetto; righe brevi.
5. **Camera che porta**: ogni avviso ha "vai a" con transizione morbida, come le lettere RimWorld.
6. **Pausa sempre raggiungibile** e lettura senza fretta: il testo a tempo deve poter essere riletto dalla cronaca.
