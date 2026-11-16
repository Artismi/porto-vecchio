# 4. Entropia e ingombro nelle sandbox di lunga durata

## Il fallimento
Le simulazioni che creano oggetti, tracce, ricordi e storie senza distruggerli crescono senza limite: lag, salvataggi enormi, mondo sporco o, al contrario, mondo che collassa per accaparramento.

## Casi
- **Dwarf Fortress, "FPS death"**: il wiki indica controlli di temperatura e usura su ogni oggetto, con effetti seri oltre ~10.000 oggetti; i giocatori usano discariche e "atom smasher" (ponti che distruggono oggetti) come pozzo. Evidenza mista: un report del 2011 sostiene che la quantità di oggetti non è la causa principale; cause anche nanetti intrappolati, magma, acqua. [DF wiki Lag](https://dwarffortresswiki.org/index.php/Lag), [DF wiki Maximizing framerate](https://dwarffortresswiki.org/index.php/DF2014:Maximizing_framerate), [bug 4207](https://dwarffortressbugtracker.com/view.php?id=4207).
- **RimWorld**: *deterioramento* degli oggetti all'aperto (×5 sotto la pioggia, ×3 su acqua; zero al coperto o su scaffale); *sporcizia* pulita dai coloni assegnati solo nell'area Casa, o lavata dalla pioggia. L'entropia diventa lavoro e scelta (costruire tetti, scaffali), non solo pulizia tecnica. [Deterioration](https://rimworldwiki.com/wiki/Deterioration), [Filth](https://rimworldwiki.com/wiki/Filth).
- **Minecraft**: entità oggetto distrutte dopo 6000 tick (5 minuti) se il chunk è caricato; *entity cramming* (24 mob per blocco di default, gamerule). Limite duro e leggibile. [Minecraft wiki Item entity](https://minecraft.fandom.com/wiki/Item_(entity)/ED), [feedback ItemDespawnTick](https://feedback.minecraft.net/hc/en-us/community/posts/11938026238221-ItemDespawnTick-Game-Rule).
- **Animal Crossing NH**: erbacce che crescono, scarafaggi in casa dopo oltre un mese di assenza; l'ordinanza "isola bella" li previene. L'entropia è anche un *messaggio diegetico* di assenza — ma vedi nota 7: PEGI dal giugno 2026 classifica la "pressione a giocare" (punire chi non torna in tempo) come PEGI 12. [Nookipedia](https://nookipedia.com/wiki/Cockroach), [Kotaku](https://kotaku.com/what-happens-when-you-abandon-your-animal-crossing-new-1844574997).
- **Ultima Online, ecologia**: risorse e mostri con bisogni; il sistema fu rimosso in beta. Koster: non per l'IA, ma perché crollò per *accaparramento* dei giocatori (lana stoccata). Gli altri resoconti dicono "i giocatori uccisero tutto". Comunque: un'economia chiusa senza pozzi collassa. [Koster](https://www.raphkoster.com/?p=46439), [UO resource system](https://raphkoster.com/?p=517).

## Tecniche
1. **Durata di vita per classe** (despawn di Minecraft) per oggetti senza proprietario.
2. **Deterioramento come meccanica** (RimWorld): l'oggetto abbandonato si rovina, cambia nome ("bicicletta arrugginita"), poi sparisce.
3. **Pozzi diegetici**: netturbino, rigattiere, mare che si porta via le cose, mercato delle pulci.
4. **Tetti per cella e per città** con politica di eliminazione (il più vecchio non nominato).
5. **Compattazione della memoria**: eventi minuti riassunti in fatti ("ha litigato tre volte con Tizio") e poi dimenticati; conservare solo ciò che è stato *raccontato* o che coinvolge il giocatore.
6. **Monitorare la crescita** in batch (nota 3).
