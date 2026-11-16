# Games not covered in the first pass: mechanisms that make NPCs and towns feel alive, reactive and memorable

> Method note (2026-11-11): budget-limited pass (about 19 search/fetch calls). Fetched in full: the ZA/UM devblog on passive checks, Game Developer on Watch Dogs Legion's Census, the Wccftech KCD2 routines piece, and the Wccftech RDR2 interaction piece. The rest comes from search-result snippets. Two PC Gamer fetches came back truncated. Labels:
> - **[2nd]**: secondary source (wiki, fan forum, guide, press summary).
> - **[BK]**: my background knowledge about well-known systems. It was NOT re-verified this session and has no URL, so these items appear only under Inferences or Gaps, never as Cited Findings. Check them before quoting numbers.
> - **[CHEAP]**: a cheap trick with high perceived aliveness, relevant to a phone-scale street-comedy city.
>
> The first pass (folder `NPC vivi senza IA/`) already covered The Sims, CK2/3 basics, Dwarf Fortress, RimWorld, Shadows of Doubt, Nemesis, Oblivion Radiant AI, bark systems (Valve, Hades), Caves of Qud's procedural history, and a short "Others" list. This file goes deeper on games that list only touched or skipped.

---

## 1. Schedules and routines: Ultima VII, Stardew Valley, Kingdom Come: Deliverance 1 and 2, Watch Dogs Legion

### Takeaway
Every celebrated "living town" here runs on hand-authored or template schedules made of a few discrete activity types tied to places and hours. These are not autonomous planners. Aliveness comes from three things: (a) schedules that cover the whole day, including sleep; (b) visible interruptions of the schedule (a brawl, a friend passing, a hanging, a recent crime); and (c) schedule changes that ripple to related NPCs. Watch Dogs Legion shows how to scale this. Generate the census lazily, "uprez" only the NPCs the player touches plus their close connections, and cycle out the rest.

### Cited Findings
- **Ultima VII (1992).** SCHEDULE.DAT gives each NPC up to **8 schedule entries**. Each entry picks one of a fixed set of activity types (e.g. Eat, Sleep, Wait, Farm, Desk Work) at a location and time block. Every NPC must have at least one schedule, and the Avatar has none — [Ultima Codex wiki, SCHEDULE.DAT [2nd]](https://www.wiki.ultimacodex.com/wiki/Ultima_VII_internal_formats_%E2%80%93_SCHEDULE.DAT)
- Typical example: a blacksmith goes to bed at night, eats breakfast, goes to work and crafts using items around him, takes lunch at the tavern, returns to work, then goes home for dinner — [Ultima Codex Lycaeum, NPC schedules [2nd]](https://lycaeum.ultimacodex.com/npc-schedules/)
- In the original game, a "eat" NPC sits and the food disappears at a seemingly random time. This is a cheap visual effect: the food prop is consumed. Fan reports also say some activities (Desk work) did not visibly work in the Exult reimplementation — [Exult forum [2nd]](https://exult.sourceforge.io/forum/viewtopic.php?p=27618)
- **Stardew Valley.** Schedules vary by season, day of week and weather. Abigail's schedule, for example, changes per season, on certain days, and in rain — [Charlie Intel guide [2nd]](https://charlieintel.com/games/how-to-marry-abigail-in-stardew-valley-gifts-heart-events-schedule-more-310958). Elliott's Monday has him leaving the farmhouse for the beach at 8:30 — [BisectHosting schedule guide [2nd]](https://www.bisecthosting.com/blog/stardew-valley-spring-schedule-npc-guide-marriage-candidates-locations-time)
- **KCD2.** Lead scripter Martin Ziegler: NPCs share meals, go to work, sometimes shop, and spend evenings at a pub or on a walk. They interrupt routines to watch a street brawl, greet a passing friend, or watch a public punishment at the gallows. "They will alter this routine if there was violence or theft in the region recently": they skip the pub, carry weapons, or ask for more patrols. "All of this is happening continuously in the entire world, whether you are there to see it or not" — [Wccftech interview with Ziegler](https://wccftech.com/kingdom-come-deliverance-2-dev-talks-about-dynamic-npc-routines-and-emergent-storytelling-for-side-quests/)
- KCD2 occupations are "a series of individual activities set by hand for each NPC". Warhorse's Martin Klima framed the goal as NPCs having their own routines "instead of just standing there and waiting for the player" — [Wccftech Q&A, "half of the voiced lines aren't related to the story"](https://wccftech.com/kingdom-come-deliverance-2-qa-half-of-the-voiced-lines-arent-related-to-the-story-at-all/); [3rd-phase-boss interview [2nd]](https://3rd-phase-boss.com/blogs/gaming/kingdom-come-deliverance-2-developer-interview-hands-on) (both seen as search snippets only)
- KCD2 headline from that Q&A: about **half of the voiced lines aren't related to the story at all**. In other words, ambient and systemic dialogue is a major authoring budget item — [Wccftech Q&A](https://wccftech.com/kingdom-come-deliverance-2-qa-half-of-the-voiced-lines-arent-related-to-the-story-at-all/) (headline)
- A 2018 German preview of KCD1 lists "Tagesabläufe" (daily routines) and AI that lets each NPC develop different behaviours over a playthrough. The section title translates as "AI adultery and thinking doors" — [PC Games preview [2nd]](https://www.pcgames.de/Kingdom-Come-Deliverance-Spiel-16151/Specials/Kingdom-Come-Deliverance-Interview-Special-Teil-5-Kuenstlich-intelligenter-Ehebruch-und-denkende-Tueren-1156484/2/)
- **Watch Dogs: Legion, Census.** Census has a procedural layer that generates internally consistent demographic profiles and a simulation layer that makes characters persistent and generates schedules — [Ubisoft News, "The Tools That Built London"](https://news.ubisoft.com/en-us/article/4po3S9Pwp1YcgBmGPmQxAh/watch-dogs-legion-the-tools-that-built-london); GDC talk by Christopher Dragert, "Census: The Systemic Backbone Behind Play As Anyone" (abstract mentions schedules with meetings between friends, relatives and adversaries, memories, recasting, recruitment, runtime optimization of the relational database) — [GDC Vault](https://www.gdcvault.com/play/1027018/Census-The-Systemic-Backbone-Behind)
- Census schedules span 24 hours (sleep, work, social). Paths between points are simulated so the player can intercept an NPC en route. Metro stations act as nodes. Interruptions such as hospitalization change the schedule, and the change ripples to friends and family — [Game Developer, "How Watch Dogs: Legion's 'Play as Anyone' simulation works"](https://www.gamedeveloper.com/design/how-watch-dogs-legion-s-play-as-anyone-simulation-works)
- **Census LOD tiers:** "the number we can actually spawn on screen"; a "fully uprezzed simulation layer"; and a further layer that stores incidental encounters. Background citizens are generated on demand and deleted when the player leaves. Anyone the player interacts with is promoted, together with their close connections. Unengaged older characters are cycled out, so the active deep pool stays at "hundreds of citizens" — [Game Developer](https://www.gamedeveloper.com/design/how-watch-dogs-legion-s-play-as-anyone-simulation-works)
- Census can start generation from any tag (gender, fashion, occupation, income, personality), not only occupation. The article presents this as a guard against stereotyping, and the result is a "spider-web" of linked facts. Clint Hocking's example: a groundskeeper's working hours imply income, and income narrows the London district where he lives — [Game Developer](https://www.gamedeveloper.com/design/how-watch-dogs-legion-s-play-as-anyone-simulation-works); [PlayStation LifeStyle [2nd]](https://www.playstationlifestyle.net/2019/06/28/watch-dogs-legion-npcs/)
- The "9 million characters" figure that circulated is shaky. Ubisoft mentioned the number only once and gave no firm total — [mein-mmo [2nd]](https://mein-mmo.de/en/watch-dogs-3-how-ubisoft-creates-9-million-characters-you-can-play,364675/)

### Inferences
- [CHEAP] An Ultima VII-style schedule (at most 8 entries, each an activity enum, place and hour block) is tiny data. Hundreds of NPCs times 8 entries is trivially cheap on phones. Off-screen NPCs only need a "where should I be at time t" lookup, not a simulation.
- [CHEAP] KCD2's most quotable aliveness comes from **interruptions**, not routines: an NPC stops to watch a brawl or greets a friend. In a street-comedy city, a "gawk" interrupt is perfect. Any comic event (a fall, an argument, a parade) pulls nearby NPCs off their schedule into a semicircle for a few seconds, with barks, then lets them resume.
- [CHEAP] KCD2's "recent crime in the region" variable is one regional mood scalar that rewrites routines (pub skipped, weapons out). For comedy: neighbourhood flags like "the pickpocket struck yesterday" make shopkeepers clutch bags and grannies hide purses, which is a visible, funny consequence.
- The Census pattern (uprez on touch plus close connections, cycle out unengaged) is directly transferable. Keep about 300 lightweight citizens alive. Promote about 30 to 60 "known" NPCs with persistent memory. Keep a small archive of incidental encounters for recasting.
- [BK] Stardew has about 30 to 45 named villagers with fully hand-written schedules per season and day. The town feels alive because the cast is small and learnable. You learn where Pierre is at 9am. A big city cannot hand-write hundreds, but it can hand-write the **20 to 30 "regulars"** and template the rest.

### Gaps
- No primary source on how KCD2 actually stores or simulates routines off-screen, or on its NPC count. The common claim of "thousands of NPCs" is unverified. Ziegler's "continuous in the entire world" quote may be marketing, and likely runs as a coarse LOD.
- The full Dragert GDC talk was not watched. Database layout and runtime cost numbers are unknown.

---

## 2. Memory of the player, reputation and greet/antagonize: RDR2, Stardew gift memory, KCD reputation

### Takeaway
"The NPC remembers me" is the most reported moment of aliveness, and it is usually backed by very little: a per-NPC flag or score for the player plus a contextual greet/antagonize verb pair. RDR2's design wraps a large animation and voice budget around this. Stardew wraps strict, readable rules around it (one gift a day, two a week, liked/disliked tables, heart thresholds that unlock authored scenes).

### Cited Findings
- **RDR2.** Imran Sarwar (Director of Design): the interaction system grew out of the gang work and was extended to the whole world. Players can engage shopkeepers, lawmen and passing riders without drawing a weapon, and "those options will be contextual based on what kind of person they might be." "The gang members were smarter and equipped with better memories." "The gang know when Arthur is in camp and when he's caused trouble out in the world." He called it "a huge leap forward" — [Wccftech, from Official Xbox Magazine Nov 2018](https://wccftech.com/rockstar-explains-npc-interaction-rdr2/)
- Secondary claim: a pedestrian greeted politely in Valentine remembers the player on a later ride-by, while an antagonized one may spit, insult or draw a weapon — [rockstar-files fan report [2nd]](https://rockstar-files.pages.dev/reports/07_gameplay/0604_Pedestrian_AI.html). Anecdote: an NPC apparently recalled a stolen fur hat a week later — [GamePressure [2nd, anecdotal]](https://www.gamepressure.com/newsroom/rdr2-can-still-surprise-npc-remembered-the-theft/z31e8e)
- Rockstar has never published how long NPCs remember the player or how many reactions exist — [PixelTwelve [2nd]](https://pixeltwelve.com/articles/gta-6-npcs-further-than-red-dead-redemption-2)
- **Stardew gift memory.** Each villager has personal tastes that override universal loves and hates, with exceptions. Disliked gifts and hitting a villager with a slingshot lower friendship — [Stardew wiki, Gifts [2nd]](https://wiki.stardewvalley.net/Gifts). One gift per day, two per week, birthdays excepted. Gift quality changes points — [Carl's Guides [2nd]](https://www.carlsguides.com/stardewvalley/gifts.php)
- Heart events are authored cutscenes unlocked at given heart levels. For romanceable characters these are typically 2, 4, 6, 8, 10 and 14 hearts — [gfinity guide [2nd]](https://www.gfinityesports.com/article/stardew-valley-romance-sam-guide)
- **KCD2 reputation.** Theft and murder are tracked with penalties that extend regionally. A review says news of a crime reaches a new town a day or two later and damages reputation there — [Newsweek review [2nd]](https://www.newsweek.com/entertainment/video-games/kingdom-come-deliverance-2-review-2025183); [Lords of Gaming review [2nd]](https://lordsofgaming.net/2025/02/kingdom-come-deliverance-2-review-a-medieval-master-class/) (snippets). A PC Gamer piece describes being "branded a criminal" and still shunned hours later — [PC Gamer](https://www.pcgamer.com/games/rpg/i-messed-up-so-bad-in-kingdom-come-deliverance-2-that-i-was-literally-branded-a-criminal-and-hours-later-im-still-shunned-by-society/) (headline only; fetch truncated)

### Inferences
- [CHEAP] Two contextual verbs, "greet" and "antagonize", applied to any NPC, plus one remembered sign (−1/0/+1 per NPC who has met the player), already give RDR2's headline moment. The NPC who greets you warmly next time, or spits, is the "it remembered" story. On phones this is one byte per known NPC.
- [CHEAP] Delayed propagation ("news reaches the next town in a day or two") is cheap: a timestamped event spreads to districts after N hours. It creates the comic beat of arriving somewhere and being recognised as "the one who fell into the fountain".
- Stardew teaches **readable rate limits**: one gift a day, two a week. These stop spam, make each interaction meaningful, and are learnable. For comedy NPCs: a daily cap on "running gags" per NPC.
- [BK] RDR2's honor is a hidden scalar driven by actions (greeting, helping, killing). It changes shop discounts, Arthur's narration and some epilogue content. Reception treated it as flavour more than a system. Not re-verified.
- [BK] KCD1 tracks reputation per town/region plus a separate "known criminal" state, and clothing that is dirty or bloody affects how NPCs speak to Henry (the charisma/"conspicuousness" stats). Not re-verified here, but it is a strong comedy hook: a dirty outfit changes how strangers react.

### Gaps
- No primary Rockstar source on memory length or on the data structures. RDR2 ambient-behaviour specifics (ambient "scenarios", AI behaviours in Valentine) were not sourced.
- KCD2 reputation internals (per-faction, per-town values, decay) were not sourced from Warhorse.

---

## 3. Crime, witnesses, rumor and police: KCD, GTA, Hitman, Watch Dogs, RDR2

### Takeaway
In every case the shipped pattern is the same pipeline: **perceive → flee or report (the NPC must physically do something) → authority state (wanted level, bounty, region heat) → decay or clear**. The physical act of reporting (pulling out a phone, running to a guard) is both the counterplay and the legibility. The player sees the witness and can intercept them. Players complain when the system cheats, for example a bounty with no visible witness.

### Cited Findings
- **KCD.** Witnesses may flee or go report to the authorities. Players avoid this by staying hidden or removing witnesses before they arrive — [Fextralife KCD wiki [2nd]](https://kingdomcomedeliverance.wiki.fextralife.com/Crime+System)
- Lead designer Prokop Jirsa said Warhorse deliberately moved away from historically accurate punishments because they would be too harsh on peasant Henry ("any crime would be punished very severely") — [GamesRadar](https://www.gamesradar.com/games/action-rpg/warhorse-says-it-had-to-ditch-historical-accuracy-for-kingdom-come-deliverances-crime-system-as-itd-be-too-harsh-on-peasant-boy-henry-any-crime-would-be-punished-very-severely); [Shazoo (RU), Jan 2026](https://shazoo.ru/2026/01/26/178684/warhorse-otkazalas-ot-istoriceskoi-tocnosti-v-sisteme-prestuplenii-kingdom-come-deliverance-iz-za-ee-zestokosti)
- KCD2 tracks both what the player did and what witnesses saw. When arrested, the player can see the list of crimes — [escorenews guide [2nd]](https://escorenews.com/en/article/66186-how-to-see-list-of-your-crimes-when-arrested-by-guards-in-kingdom-come-deliverance-2-how-to-understand-why-henry-is-arrested-in-kcd2)
- Complaints: Steam users report bounties applied with no visible witnesses, and question how NPCs link crimes to the player so consistently — [Steam KCD2 thread [2nd]](https://steamcommunity.com/app/1771300/discussions/0/601896014188674927). Patch 1.2 fixed assaults sometimes not becoming murder when the victim later died — [mp1st patch notes](https://mp1st.com/title-updates-and-patches/1000-improvements-in-patch-1-2-of-kingdom-come-deliverance-update-1-020)
- **GTA V.** Witnesses can phone in crimes, which produces a one-star wanted level. In GTA V single player, civilians visibly pull out phones. In GTA Online they report without the visible animation — [GameFAQs, strategy-guide excerpt [2nd]](https://gamefaqs.gamespot.com/boards/634491-grand-theft-auto-v/67523275); [GTA wiki, Wanted Level in GTA Online [2nd]](https://gta.fandom.com/wiki/Wanted_Level_in_GTA_Online)
- Popular GTA V mods ("RDR-Witnesses", "Immersive Santos") add what players felt was missing: a pedestrian must see the crime and flee before dialling, and crimes with no witness can give no wanted level. This shows demand for an honest witness chain — [gta5-mods [2nd]](https://mk.gta5-mods.com/scripts/rdr-witnesses-net); [gta5modhub [2nd]](https://www.gta5modhub.com/immersive-santos-1-4/)
- **Hitman.** NPCs recognise 47 by face rather than body outline, and since Hitman 2 they can spot him in mirrors — [PCGamesN](https://www.pcgamesn.com/hitman-2/ai-detect-mirrors). Absolution's producer: guards easily see through a guard disguise, while other NPCs are less likely to notice — [Shacknews](https://shacknews.com/article/72044/hitman-absolution-focusing-on-smarter-ai). Absolution's crowd tech (G2) was presented at GDC 2012 by Kasper Fauerby. It ran at 30fps, with each crowd member getting its own mini AI brain — [GodisaGeek](https://godisageek.com/2012/03/io-interactive-present-g2-crowd-technology-gdc-week/)
- IO's GDC 2019 level design talk (Mette Podenphant Andersen) framed Hitman levels as social spaces, with difficulty tied to social setting — [Game Watch (JP)](https://game.watch.impress.co.jp/docs/news/1175738.html). Hitman 2 added bigger crowds to blend into and more information on screen — [GamesBeat](https://gamesbeat.com/hitman-2-gives-players-more-information-and-bigger-crowds-to-hide-in/)
- Reported GTA VI design: any NPC with a phone who sees a crime can call it in, and police work from a description rather than exact location — [leonidahub guide [2nd, unverified]](https://www.leonidahub.co.uk/guides/gta-6-wanted-system-guide); [IGGM [2nd, unverified]](https://www.iggm.com/news/gta-6-wanted-level-system-explained-how-heat-indicators-police-memory)

### Inferences
- [CHEAP] The "witness takes out the phone" animation is the single best legible crime signal. For a comedy city: a witness pulls out a phone and **films** instead of calling the police, so the gag goes "viral" (a district fame score rises). Intercepting the filmer is a mini-game.
- [CHEAP] Hitman's rule that a disguise fools everyone except the matching role (guards spot fake guards) is a one-line rule with rich play. For comedy: dressed as a waiter, only real waiters get suspicious. Have them interject with "I've never seen you at the staff meeting."
- [BK] Hitman's suspicion UI uses an over-head indicator that fills, with "enforcers" who can see through specific disguises, plus scripted **Opportunities / Mission Stories**. These are overheard NPC conversations that unlock tracked opportunities. Overhearing two NPCs gossip is a cheap way to make NPCs feel like they have their own business, and doubles as a hint system. (Not re-verified this session.)
- Crime systems must not visibly cheat. KCD2's reported bounty-with-no-witness complaint is the cautionary case. Always show the witness.

### Gaps
- No primary IO talk on suspicion meters or on the Opportunities/Mission Stories system was fetched (the PC Gamer "changing the people, not the polygons" piece fetch failed).
- No Rockstar primary source on wanted-level or witness internals. Watch Dogs Legion's crime and police reporting was not covered.

---

## 4. Inner voices: Disco Elysium's passive checks as a model for visible comic inner state

### Takeaway
Disco Elysium turns hidden stats into **characters who interject**. Passive checks fire automatically in dialogue when a skill is high enough. They write a line of inner voice, sometimes sending the player a new dialogue option ("black check"). This is a ready-made template for turning an NPC's hidden state (mood, greed, embarrassment, crush) into readable, funny lines, either the player's inner chorus or an NPC's thought bubble.

### Cited Findings
- Design rationale: classic passive checks are "you have to be at least this tall to ride the rollercoaster" gates. ZA/UM reworked them as silent "characters" that only the protagonist hears: "Our passive checks are souffleurs in a play." Their lines are thoughts, sensations, half-formed ideas, e.g. a joke you privately find funny before deciding whether to say it — [ZA/UM devblog, "On skill checks" (2016)](https://discoelysium.com/devblog/2016/09/19/on-skill-checks)
- **Black check:** a passive check generates a line that then becomes a dialogue option. The skill speaks first, and the player decides whether to voice it. Example: in a conversation about a contact microphone, high Trivia brings up the boxer "Contact Mike", which opens a derailing question — [ZA/UM devblog](https://discoelysium.com/devblog/2016/09/19/on-skill-checks)
- 4 attributes × 6 skills = 24 skills, each with a non-combat use. Skills argue with each other: Half Light can push a rage spiral that another skill must stop. Drama suggests method acting. Pain Threshold suggests self-harm to make a point. Rhetoric turns a situation political — [ZA/UM devblog](https://discoelysium.com/devblog/2016/09/19/on-skill-checks)
- Active checks were designed as a "gamey, number-crunching" counterweight to the literary passive checks. Passive checks appear only with enough skill points. They are modified by clothing and thoughts — [awkwardmixture analysis [2nd]](https://awkwardmixture.blogspot.com/2020/03/disco-elysium-skill-checks.html); [Disco Elysium wiki, Skills [2nd]](https://breezewiki.discard.no/discoelysium/wiki/Skills)
- Density: ZA/UM's Zero Parades has a skill check about every 3,000 words versus about every 6,000 in Disco Elysium — [GamingBolt interview (2026)](https://gamingbolt.com/zero-parades-for-dead-spies-interview-disco-elysium-roots-spy-story-rpg-new-gameplay-systems-and-more) (snippet). The voice actor Lenval Brown gave each of the 24 voices its own manner — [GamesRadar interview](https://gamesradar.com/disco-elysium-the-final-cut-lenval-brown-interview)
- Reception: critics singled out the talking skills as the core novelty, and failure as entertaining — [PC Gamer, "Your skills talk to you"](https://www.pcgamer.com/au/your-skills-talk-to-you-in-disco-elysium-an-inventive-rpg-that-keeps-impressing/); [PC Gamer, "Why I love failing"](https://www.pcgamer.com/why-i-love-failing-in-disco-elysium)

### Inferences
- [CHEAP] Map each NPC's 3 to 5 hidden drives (Vanity, Greed, Gluttony, Fear, Gossip) to named "inner voices". When a drive crosses a threshold near the player, show a short speech-bubble line in a distinct typographic style, e.g. *VANITY: "He's looking at your moustache. He's jealous."* This makes otherwise invisible state legible, and it is funny because the voice is honest while the NPC's spoken line is not (the gap between thought and speech is classic commedia).
- [CHEAP] Black-check equivalent for the player: when the player's own "skill" (e.g. Eavesdropping, Flattery) passes against an NPC's state, an inner voice proposes a new verb or line. This hints at the NPC's weak spot without a UI.
- Make voices argue (Half Light vs another skill). Two drives in one NPC disagreeing out loud ("GREED: take the money. FEAR: his brother is a cop.") is a cheap two-line sketch.
- Rate-limit interjections, as Disco did (about one check every few thousand words). Constant inner voices would become noise.

### Gaps
- No source quantified how many passive lines Disco Elysium has, or the authoring workflow (Articy) for them.

---

## 5. Indirect control and factions: Majesty, Kenshi, Bannerlord, Crusader Kings 3

### Takeaway
Majesty shows that the player can steer autonomous agents through **bounties/incentives** instead of orders. Kenshi shows that a world can feel reactive with coarse **world-state booleans** that switch which squads spawn and who controls towns. Both are cheap compared with simulating individuals.

### Cited Findings
- **Majesty (Cyberlore, 2000).** The player cannot control heroes directly. Instead the player places bounties (reward flags) to convince heroes to deal with threats. The economy is largely automated (tax collectors fetch money). The idea dates to 1996 — [Genesis Temple interview with designer Jim DuBois [2nd]](https://genesistemple.com/?p=105); [Gamicus wiki [2nd]](https://gamicus.fandom.com/wiki/Majesty:_The_Fantasy_Kingdom_Sim)
- Majesty 2 (Paradox, 2009) kept the formula. Reviewers said it did not rely on build orders or micromanagement, and others found few surprises for veterans — [GameSpot review](https://www.gamespot.com/reviews/majesty-2-the-fantasy-kingdom-sim-review/1900-6228664/); [Game Informer review](https://www.gameinformer.com/games/majesty_2_the_fantasy_kingdom_sim/b/pc/archive/2009/10/08/review.aspx)
- **Kenshi.** World States are true/false conditions over the state of the world (e.g. a faction leader dead or imprisoned). They gate squad spawns and dialogue, and through "town overrides" they change town populations and faction control — [Kenshi modding wiki, FCS: World States [2nd]](https://kenshi-modding.fandom.com/wiki/FCS:_World_States); [Kenshi.zone research notes [2nd]](https://kenshi.zone/en/world-states)
- Squads are groups of characters that spawn together and share one **AI package** (a behaviour template) — [Kenshi modding wiki, FCS: Squads [2nd]](https://kenshi-modding.fandom.com/wiki/FCS:_Squads)
- When a faction leader is killed or captured, wild squads drop sharply and bases get destroyed or taken over. Most factions cannot be fully wiped, and some (Dust Bandits, Black Dragon Ninjas) have no world-state hooks in vanilla — [Steam Kenshi discussions [2nd]](https://steamcommunity.com/app/233860/discussions/0/1639792569854155564/); [second thread](https://steamcommunity.com/app/233860/discussions/0/3172198151253294398/)

### Inferences
- [CHEAP] Majesty-style bounties fit a comedy city well. The player (or a rival) pins a "reward" on something ("10 coins to whoever makes the mayor slip") and autonomous NPCs with matching drives (greedy, mischievous) evaluate and pursue it. This produces unscripted comic chaos from a single utility term.
- [CHEAP] Kenshi's World State → spawn table + AI package is the cheapest town reactivity: "Gang boss in jail" = TRUE changes which squad templates spawn in the district (more street vendors, fewer thugs). No per-NPC memory needed.
- [BK] Bannerlord gives each lord a relation number with the player (and with other lords) that changes through battles, quests, executions and marriages. It has clan "traits" (Honor, Mercy, Valor, Generosity, Calculating) that shift when the player acts in front of companions/lords. The famous emergent behaviour is lords' reactions to executions (relation hits spreading to the whole family). Not re-verified.
- [BK] CK3 (deeper than the first pass): event "pulses" yearly/quarterly pick weighted events by traits and opinion. Stress accumulates when characters act against their personality traits and triggers mental breaks/coping traits. "Memories" (added in later updates, especially the 2022–24 DLCs) record past events so later events can reference them. Not re-verified this session.

### Gaps
- No primary Cyberlore postmortem. No Kenshi developer (Lo-Fi Games, Chris Hunt) source on faction AI implementation or performance.
- Bannerlord and CK3 details are [BK] only.

---

## 6. Ecosystem/colony AI, procedural storytelling and memory across time: Rain World, Songs of Syx, Project Zomboid, DF Steam, Wildermyth, Pentiment, Citizen Sleeper

### Takeaway
I gathered very little verified material for this cluster this session. Background knowledge suggests two patterns relevant to the project: (1) **Pentiment's town memory across time skips**, where the same small town and cast recur across acts and NPCs reference what the player did years earlier; (2) **Wildermyth's comic-panel storytelling**, where procedurally chosen authored story events with role slots are presented as illustrated panels, making emergent stories feel authored. Both are cheap compared with simulation.

### Cited Findings
- Pentiment spans 25 years across three key time periods, and its choice system came together late in development (the team was only four developers at first) — [Digital Trends interview with Alec Frey](https://uat4.www.digitaltrends.com/gaming/pentiment-interview-alec-frey-choice); [MobileSyrup interview](https://mobilesyrup.com/2022/11/08/xbox-obsidian-pentiment-alec-frey-interview/) (snippets)
- Wildermyth lead developer Nate Austin (Worldwalker Games, with Annie Austin) — [Goodreads dev interview](https://www.goodreads.com/author_blog_posts/19162356-game-dev-interview-wildermyth) (snippet only; no mechanism detail)

### Inferences
- [BK] Pentiment: the town of Tassing is shown in three acts years apart. NPCs remember who the player accused in act 1, and children have grown up. A meal mechanic around a shared table reveals gossip and opinions. Transferable: **time skips** (a "season" or "festival" boundary) where the city visibly carries the consequences of the player's earlier gags (a statue of the man who fell, a shop that closed).
- [BK] Wildermyth: hand-written events with role slots (hero, rival, lover) are filled by matching characters. Each event is shown in **comic panels** with portraits. Heroes physically change (scars, transformed limbs, aging) and relationships (rivalry, romance) persist across a legacy. For a street-comedy game, **comic-strip recap panels** of what happened yesterday ("The baker and the policeman: chapter 3") are a cheap way to make sim events feel authored, and they are naturally shareable.
- [BK] Dwarf Fortress Steam edition (Dec 2022) added a graphical tileset, mouse UI and a more readable presentation. Its storytelling layer (legends, thoughts) was largely unchanged; the change was in legibility. I don't know of major Steam-era storytelling system additions beyond adventure-mode updates in 2024–25. Unverified.
- [BK] Rain World: creatures have individual relationships/attitudes to the player (scavengers keep a reputation per region that the player can raise by giving gifts), and creatures have off-screen "abstract" movement through rooms. A low-cost model for "who is where" off-screen.
- [BK] Songs of Syx runs tens of thousands of citizens through aggregate job and need systems, with individuals simulated cheaply. Project Zomboid uses a "meta-game" layer for off-screen zombie and event simulation (helicopter events pulling hordes). Both are unverified here.
- [BK] Citizen Sleeper: limited daily dice actions on a station of recurring characters with "clocks" (progress tracks) that advance with time, so NPCs' stories move whether or not the player engages. Clocks are a cheap, readable way to show "this NPC's situation is evolving".

### Gaps
- No sourced material this session on Rain World, Songs of Syx, Project Zomboid, DF Steam changes, Citizen Sleeper, or Wildermyth/Pentiment mechanisms. All of the above are [BK] and need verification before use.

---

## 7. Recent 2023–2026 indies and social or city sims with emergent NPC life (inZOI, The Precinct, City of Gangsters, Empire of Sin, Shadows of Doubt updates, Caves of Qud 1.0)

### Takeaway
The only well-sourced item is inZOI's (2025) "Smart Zoi" setting. It uses Nvidia ACE, an on-device small language model, to drive NPC decisions. It is computationally heavy, is limited by area and queue, and gets mixed reception ("looks like regular NPC AI"). Players still find NPCs reactive rather than proactive. That supports the project's no-LLM, cheap-legibility strategy.

### Cited Findings
- inZOI "Smart Zoi" is an optional experimental setting that turns NPCs into Nvidia ACE autonomous characters driven by an on-device SLM — [PC Gamer](https://www.pcgamer.com/games/life-sim/inzoi-is-creating-a-newfangled-life-sim-npc-that-can-grow-and-develop-its-own-personality-with-nvidias-ai-tech); it needs substantial compute, and players can limit its range by area plus a queue limit capping concurrent "smart" decisions — [Ensigame [2nd]](https://ensigame.com/articles/gaming/smart-zoi-what-kind-of-system-is-this-in-inzoi)
- GamesRadar: "this kinda just looks like regular NPC AI to me" — [GamesRadar](https://www.gamesradar.com/games/simulation/the-sims-rival-inzoi-uses-special-nvidia-ai-tech-to-power-its-characters-but-this-kinda-just-looks-like-regular-npc-ai-to-me). Forum users report NPCs never approach the player first and seem reactive rather than proactive — [inZOI forum [2nd]](https://forum.playinzoi.com/t/topic/11889)

### Inferences
- The inZOI case is a 2025 data point: an expensive LLM-backed NPC brain was not perceived as more alive than scripted AI, because what players notice is **initiative** (NPCs approaching you, commenting, remembering), not decision quality. Cheap initiative rules (an NPC with a grudge or crush walks up to the player) do more.
- [BK] The Precinct (2025, Fallen Tree Games): top-down 1980s police sim with procedural crimes across a city and a patrol loop. Crimes happen as the player patrols (no full citizen simulation). Unverified.
- [BK] Empire of Sin (2020) and City of Gangsters (2021): gang/racket sims whose boss characters have relationships/loyalty traits; both received mixed reviews for shallow systemic depth. Unverified.
- [BK] Caves of Qud 1.0 (Dec 2024): procedural sultan histories and gospels (covered in the first pass), plus villages with procedural lore and faction reputation that changes NPC hostility. Unverified for 1.0 specifics.

### Gaps
- Searches for The Precinct, Shadows of Doubt updates, City of Gangsters and Empire of Sin returned nothing usable this session.

---

## 8. Cross-cutting: what transfers to a street-comedy city with hundreds of NPCs on phones

### Takeaway
The verified cases rank the cheapest high-aliveness mechanisms roughly like this. (1) Visible schedule interruptions (gawking, greeting a friend) [KCD2]. (2) Per-NPC remembered sign toward the player plus greet/antagonize verbs [RDR2]. (3) A witness who physically acts (phone out) before consequences [GTA, KCD]. (4) Inner-voice interjections that make hidden drives readable [Disco Elysium]. (5) Regional mood flags rewriting routines and spawn tables [KCD2, Kenshi]. (6) Lazy census with promotion on touch plus close connections [WD Legion]. (7) Bounty-style indirect goals that autonomous NPCs chase [Majesty].

### Cited Findings
- WD Legion's player-attention system: revenge/narrative events request the player's attention, waiting for a short calm window ("10 seconds, 15 seconds"). Lower-priority requests that time out are dropped, and narrative lines get extra cooldowns to avoid repetition — [Game Developer](https://www.gamedeveloper.com/design/how-watch-dogs-legion-s-play-as-anyone-simulation-works)
- WD Legion recasting: met characters are brought back "in front of the player" in later missions. Contacts cluster geographically, so players who stay in an area see familiar faces more — [Game Developer](https://www.gamedeveloper.com/design/how-watch-dogs-legion-s-play-as-anyone-simulation-works)
- WD Legion recruitment missions are designer-authored "gameplay beats" with abstract roles filled at runtime by generated citizens and locations chosen at runtime (e.g. the nearest pub with a server). Recruit backstories supply the "who and why" — [Game Developer](https://www.gamedeveloper.com/design/how-watch-dogs-legion-s-play-as-anyone-simulation-works)
- WD Legion cost of systemic dialogue: lines were written and recorded about "20 times" in variants, with formant modulation multiplying voices and dynamic name/gender insertion across about 14 languages — [Game Developer](https://www.gamedeveloper.com/design/how-watch-dogs-legion-s-play-as-anyone-simulation-works)
- Opinions in WD Legion carry **reasons** (a citizen dislikes DedSec because of a specific incident), and memories of the player's actions "propagate to their enemies and friends" — [Game Developer](https://www.gamedeveloper.com/design/how-watch-dogs-legion-s-play-as-anyone-simulation-works)

### Inferences
- [CHEAP] **Opinions with a reason string** (WD Legion) make memory legible. "Doesn't like you: you stole his parking spot on Tuesday" turns a number into a joke. Store an event id with the opinion delta, not just the delta.
- [CHEAP] **Recasting with geographic clustering** (WD Legion): reuse the same 20 to 40 known faces in the player's home district. This beats a city of strangers for memorability on a small budget.
- [CHEAP] **Attention arbitration** (WD Legion): queue NPC-initiated events (a grudge approach, a gossip) and fire them only during a calm window, dropping stale ones. This prevents comic events from stomping on each other.
- **Role-slot templates** (WD Legion recruitment, [BK] Wildermyth): author about 50 comic sketches with abstract roles ("the vain one", "the cop", "the victim") and fill them from the current census. This gives authored punchlines with emergent casting.
- Performance on phones: Ultima VII-style schedule tables plus lazy LOD (Census tiers: on-screen, uprezzed, archived encounters) means only about 30 to 60 NPCs need full simulation at once. The hundreds of others only need a schedule lookup and occasional event propagation.
- Avoid the visible cheat (KCD2 "bounty without a witness") and the LLM trap (inZOI's "looks like regular AI" reception). Initiative and legibility beat decision quality.

### Gaps
- No performance numbers found for any of the shipped games (CPU per NPC, NPC counts on low-end hardware) except Hitman Absolution crowd running at 30fps (console era, no NPC count in the snippet).
- Many games listed in the assignment (Bannerlord, CK3 deep dive, Songs of Syx, Rain World, Project Zomboid, DF Steam, Citizen Sleeper, The Precinct, City of Gangsters, Empire of Sin, GTA IV/V ambient events, RDR2 honor) were covered only as [BK] or not at all for budget reasons. A follow-up pass would be useful on: IO's Hitman AI talks (GDC Vault), Rockstar ambient scenarios, Warhorse's KCD2 reputation internals, and the Wildermyth story-event format.
