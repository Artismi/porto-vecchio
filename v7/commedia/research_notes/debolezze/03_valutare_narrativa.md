# 3. Valutare la narrativa emergente: metriche e strumenti

## Il fallimento
Senza misura si tara "a sensazione" su poche partite; con una sola metrica si cade in Goodhart (già visto in Chroniqueur, rapporto "espansione").

## Evidenze
- **Lessard et al., PCG 2026, "Narrative Gold Digging"**: le euristiche di setaccio non hanno prodotto differenze significative (24 partecipanti); la simulazione di sussistenza generava raramente materiale. Distinguono "effetto di storia" (catene di eventi migliori come materiale) da "effetto narrativo" (come vengono raccontate). [PDF](https://www.pcgworkshop.com/archive/lessard2026narrative.pdf) — già citato, qui come monito metodologico.
- **Kreminski et al., ICIDS 2022, "Select the Unexpected"**: classifica i match dei pattern per *improbabilità statistica*; ipotesi: sequenze inattese sono percepite come più "raccontabili". Codice: github.com/mkremins/statistical-sifting. [PDF](https://mkremins.github.io/publications/StU_ICIDS2022.pdf)
- **Kreminski et al., AIIDE 2019, valutazione tramite racconti (retellings)**: chiedere ai giocatori di *raccontare* la partita rivela dimensioni dell'esperienza che i questionari non catturano. [pagina](https://mkremins.github.io/publications/EvaluatingViaRetellings)
- **James Ryan, "Curating Simulated Storyworlds" (2018)**: architettura cronista → setacciatore → narratore; in *Bad News* il setaccio era fatto a mano da Ryan durante la performance, e Hennepin tenta di automatizzarlo. Lezione: prima si setaccia a mano, poi si codifica ciò che si è fatto. [eScholarship](https://escholarship.org/content/qt1340j5h2/qt1340j5h2.pdf), [Emily Short cap. 6](https://emshort.blog/2019/05/28/curating-simulated-storyworlds-james-ryan-ch-6f/). (Il riferimento "Hey Diddle Diddle" del brief non è emerso nelle ricerche: **[non verificato]**.)
- **Curve di tensione, Left 4 Dead (Booth, GDC 2009)**: stima dell'"intensità emotiva" per sopravvissuto (sale con danni, cadute, nemici uccisi vicino; decade verso zero, ma non mentre si è ingaggiati); fasi *Build Up → Sustain Peak (3-5 s) → Peak Fade → Relax*. Motivazione: "il combattimento costante affatica, l'inattività lunga annoia". [slide Valve](https://cdn.fastly.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf)
- **Valutazione in batch con agenti**: EA/NYU sulla *Sims Mobile* (AIIDE 2018) ricostruiscono le meccaniche essenziali in un modello separato e lanciano grandi lotti di simulazioni per trovare azioni sbilanciate e ricompense inutili; i risultati hanno portato a modifiche dopo l'uscita. [AAAI](https://ojs.aaai.org/index.php/AIIDE/article/view/13034), [arXiv](https://ar5iv.arxiv.org/html/1811.06962)

## Proposta di cruscotto (mia sintesi)
Ogni notte: 200 semi × 7 giorni di gioco simulati senza rendering, con un "giocatore fantoccio" che segue 3 profili (girovago, ladro, socievole). Per ogni corsa:
1. eventi per ora per tipo + entropia;
2. pattern setacciati completati / avviati (tasso di completamento delle storie);
3. curva di tensione cittadina (somma di umori negativi, conflitti attivi) e numero di picchi/valli;
4. percentuale di storie che *toccano* il giocatore (nemico che lo nomina, diceria su di lui);
5. ripetizioni di battuta per ascoltatore;
6. crescita oggetti/entità (vedi nota 4).
Più un test umano trimestrale "raccontami la tua partita" (Kreminski 2019), codificando quali storie emergono spontaneamente.
