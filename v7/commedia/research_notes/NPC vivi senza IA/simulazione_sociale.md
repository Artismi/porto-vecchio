# Emergent social simulation and NPC autonomy in shipped games (no runtime LLM)

Scope: decision architectures, the state NPCs keep, how unscripted events and chains of consequences arise, performance tricks for hundreds of agents, and documented failures. These notes are for a three.js street-comedy city with hundreds of NPCs that has to run on phones and Intel Iris Xe.
Method note: 15 search/fetch calls. Many findings come from secondary sources such as press, wikis and search snippets. Each one is flagged where that matters. Anything I couldn't source this session is in a Gaps section, not in Findings.

## The Sims: needs/motives, advertisements ("smart objects"), relationships, evolution 1–4, LOD for off-screen Sims

### Takeaway
The Sims keeps the agent simple and puts the intelligence in objects. Each object advertises which motives it satisfies. The Sim scores the advertisements against its current needs and picks one. The Sims 3 changed the search from scoring every action to looking up a precomputed map, and it added traits as extra motives. Neighborhood Sims you aren't watching are not simulated in full. A coarse "story progression" layer handles jobs, promotions, marriages, births and move-outs.

### Cited Findings
- Decisions are driven by "motives." In The Sims 1 these are hunger, hygiene, fun, energy, bladder, social, comfort and room (tidiness). Objects broadcast "advertisements" of what they offer, e.g. a bed offers energy and a toilet offers bladder. — [GMTK "The Genius AI Behind The Sims" (transcript via amara.org)](https://amara.org/subtitles/cVoJS4OdmVql/en/1/download/The%20Genius%20AI%20Behind%20The%20Sims.en.txt); [Game Industry Library summary](https://gameindustrylibrary.com/documents/gmtk-the-genius-ai-behind-the-sims)
- Will Wright: "What we did was make the people really dumb, and make the environment and objects really smart." — [GMTK transcript](https://amara.org/subtitles/cVoJS4OdmVql/en/1/download/The%20Genius%20AI%20Behind%20The%20Sims.en.txt)
- Forbus & Wright, "Programming Objects in The Sims": an object has a check for whether an action is possible, plus a set of advertisements describing which of a Sim's needs it satisfies. The object also carries the behavior scripts, so new objects such as expansion packs bring new behaviors with them. — [Forbus & Wright (Northwestern QRG PDF)](https://qrg.northwestern.edu/papers/Files/Programming_Objects_in_The_Sims.pdf) (read via snippet only)
- The Sims 1 and 2 score every action on every object, which is inefficient. The Sims 3 stores a map of which objects can satisfy each commodity or need. The Sims 3 also adds traits as motives, so objects can advertise fixes for trait-related needs. — [GMTK transcript](https://amara.org/subtitles/cVoJS4OdmVql/en/1/download/The%20Genius%20AI%20Behind%20The%20Sims.en.txt)
- In The Sims 3 the simulation scales up to the neighborhood by giving the environment motives of its own, e.g. keep a 50/50 gender balance or an 80% employment rate. — [Game Industry Library summary of GMTK](https://gameindustrylibrary.com/documents/gmtk-the-genius-ai-behind-the-sims)
- Sims 3 "Story Progression" makes neighborhood Sims move away, new ones move in, and others get promotions, marry, have children and die, all without player input. — [The Sims Wiki: Story progression](https://www.thesimswiki.com/wiki/Story_progression)
- An unverified forum poster claiming to be the former Sims 4 lead AI programmer says the low-detail simulation for off-lot Sims is "mostly just story progression (getting a new job, promotion, etc.)." — [EA Forums Q&A](https://forums.ea.com/discussions/the-sims-4-general-discussion-en/qa-with-alleged-lead-ai-programmer-for-sims-4/292168) (identity unverified)
- Wright has said the original Sims AI was "too good." Almost anything the player did was worse than letting the Sims run on autopilot, so autonomy had to be weakened to leave the player a role. — [PC Gamer](https://www.pcgamer.com/games/the-sims/will-wright-says-the-original-sims-ai-was-actually-too-good-almost-anything-the-player-did-was-worse-than-the-sims-running-on-autopilot)
- In The Sims 3, Sims autonomously feed and bathe themselves, use the bathroom and go to work, but they don't pursue their Lifetime Wishes on their own. Long-term goals are left to the player. — [Sims 3 Wikipedia mirror](https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/The_Sims_3)
- Richard Evans gave a GDC talk, "Modeling Individual Personalities in The Sims 3." I found only the listing, not the content. — [GDC Vault](https://gdcvault.com/play/1012294/contactUs)

### Inferences
- What transfers best is smart objects plus advertisement scoring. A bench, fountain, bar counter or another NPC advertises (motive deltas, preconditions, an animation verb). An NPC picks the best of the few nearby advertisements, using a spatial grid query instead of scanning the whole city. This costs O(nearby objects) and is data-driven. Animation grounding falls out for free, because the object carries the verb or animation and the slot position.
- The Sims 3 lookup map, commodity to object list, is the version to copy on phones: precompute per city district.
- Two tiers: full motive and advertisement AI on screen, and "story progression" (dice rolls on jobs, relationships, feuds) off screen. This is cheap and still produces "news" when the player returns.
- Wright's "too good" warning applies here. In a comedy game, perfectly rational NPCs are boring. Add noise and personality weights, and pick randomly among the top-N options instead of the argmax.

### Gaps
- I couldn't read the Forbus & Wright PDF or the Evans talk in full. The exact scoring curves (attenuation by distance, motive-weight curves) aren't confirmed here.
- No primary source on how the Sims 4 off-lot LOD and "Sim Info" culling work in detail.
- Relationship-model details (Sims 2's daily/lifetime relationship bars, Sims 4 friendship/romance tracks) weren't verified this session.

## Crusader Kings 2/3: traits, opinions, schemes, stress, event pulses; how emergent drama arises

### Takeaway
In CK3, drama comes from characters with traits and opinions of each other, who run slow, observable "schemes" (murder, seduction, sway) that resolve unreliably. Stress punishes a character for acting against their traits and builds up into breakdowns. Paradox's stated aim was for players to remember their own stories, not developer-written ones.

### Cited Findings
- CK3 vision diary: the focus on individual characters makes CK "most suited for memorable emergent stories." The goal is for players to remember their stories, not the developers'. — [CK3 Dev Diary #0 The Vision](https://forum.paradoxplaza.com/forum/threads/ck3-dev-diary-0-the-vision.1265472/page-22)
- Schemes (Dev Diary #5) replaced the CK2 murder plot system. They are "slightly easier to predict while keeping its outcome unreliable," and murder stays a risky option. Schemes tie into secrets and hooks, which are leverage over other characters. — [CK3 Dev Diary #5 Schemes, Secrets and Hooks](https://admin-forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-5-schemes-secrets-and-hooks.1289167/page-7)
- Stress: a character gains stress when they act against their traits. Penalties escalate by level. Level 1 is minor, and Level 3 "can lead your character to an early grave." The developers looked at further discouraging stress-gaining choices when stress is already high. — [CK3 Dev Diary #31 A Stressful Situation (forum thread)](https://admin-forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-31-a-stressful-situation.1399764/page-2) (some lines are user comments)
- Traits change how efficiently schemes run, e.g. a Shy character runs personal schemes more slowly and gets stress from some scheme event options. — [CK3 Dev Diary #58](https://forum.paradoxplaza.com/forum/threads/ck3-dev-diary-58-stre-ss-tching-the-traits.1472092)
- Opinion and schemes are coupled systems. A developer said the scheme system might be updated together with the opinion system. — [CK3 Dev Diary #5 thread](https://admin-forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-5-schemes-secrets-and-hooks.1289167/page-7)

### Inferences
- How the drama is built: personality traits plus opinion modifiers that decay over time ("insulted me: -20 for 5 years") feed AI choices of scheme targets. A scheme is a visible, slow progress bar with discovery risk, and when it is discovered, opinion and secret states change. Each result becomes input to the next decision, which is what creates chains.
- For a street comedy, "schemes" fit well as NPC projects: stealing the baker's bread, courting, pranking a rival, recruiting a gang. Each is a progress counter advanced by verbs performed in the world, with a risk of discovery by witnesses. Discovery creates new opinion modifiers and gossip, and those seed the next scheme.
- Stress as a cost for acting against character is a cheap way to keep NPCs in character while still letting them do it, which is a comedy beat.
- "Event pulses" (periodic random event checks per character, weighted by traits and opinions) are a cheap scheduler. Evaluate a small random fraction of NPCs each tick.

### Gaps
- I didn't get primary text on CK2/CK3 "on_action" yearly or quarterly pulses, AI personality weights (boldness, rationality, etc.) or the exact opinion formulas. These are documented on the Paradox modding wiki but weren't verified this session.

## Dwarf Fortress: needs, relationships, grudges, world simulation, emergent stories, performance

### Takeaway
DF gives each dwarf personality facets, likes and dislikes, needs, thoughts that harden into memories, and relationships including grudges. Stories emerge because everything is simulated and nothing is authored. Adams says procedural content meant they "could not rely on writers." Performance limits (late-game "FPS death") are well known in the community, but I couldn't source them this session.

### Cited Findings
- Adams's academic chapter: because most elements are procedurally generated, they couldn't rely on writers for story content. The likes and dislikes system was expanded to give dwarves a richer inner life. — [Adams, "Characterization and Emergent Narrative in Dwarf Fortress" (PDF)](https://wileywiggins.com//documents/dorf/Adams%20-%20Characterization%20and%20Emergent%20Narrative%20in%20Dwarf%20F.pdf)
- Dwarves have emotional states, favorite gems and grudges. The game is about 700,000 lines of code, built by essentially one developer since 2002 (full time since 2006). — [Stack Overflow Blog](https://stackoverflow.blog/2021/12/31/700000-lines-of-code-20-years-and-one-developer-how-dwarf-fortress-is-built/)
- In a 2025 interview Adams says dwarves are "more human than human." They are "allowed to embody bigger emotions… bigger mistakes," and their "dwarfiness" is central to why the stories land. — [PC Gamer](https://www.pcgamer.com/games/sim/dwarf-fortress-dwarves-are-more-human-than-human-creator-says-theyre-allowed-to-embody-bigger-emotions-theyre-allowed-to-make-bigger-mistakes-theyre-allowed-to-do-anything)
- A fan breakdown: repeated thoughts become memories that can shift a dwarf's mood and beliefs, and needs weigh heavily on actions. — [Tom Martin case study](https://tommartin.myblog.arts.ac.uk/?p=254) (secondary)

### Inferences
- Exaggeration is the transferable lesson for comedy. Adams's "bigger emotions, bigger mistakes" fits commedia dell'arte stock characters exactly: give each NPC a few loud facets.
- The thoughts-to-memories pipeline is cheap: a ring buffer of events per NPC, where repeated or strong ones get promoted to long-term memory that biases opinion. That covers grudges.
- DF is a cautionary example for performance. Full per-agent pathfinding plus a fluid and item simulation doesn't scale, and a phone budget allows far less.

### Gaps
- No source found this session on DF's performance limits (FPS death, pathfinding cost, item count), its world-gen history simulation, or the tantrum spiral as a documented failure.

## RimWorld: storyteller AI pacing, social interactions, mood breaks

### Takeaway
RimWorld separates local agents (pawns with mood, needs and relationships) from a global director, the "storyteller." The storyteller injects events on a tension curve and scales threat to colony wealth and population. Cassandra ramps tension up with breathing room between peaks, and an adaptation factor responds to how well the player is doing.

### Cited Findings
- Cassandra Classic follows a "classic increasing curve of challenge and tension." She pushes with dangerous events, gives breathing room, then pushes again. — [RimWorld Wiki: AI Storytellers](https://rimworldwiki.com/wiki/AI_storyteller)
- Raid Points = (Wealth Points + Pawn Points) × Difficulty × Starting Factor × Adaptation Factor. "Storyteller wealth" counts buildings at 50%. Wealth below about 14k has practically no effect, and 400k storyteller wealth gives 2,400 wealth points, with diminishing returns above that. Each colonist is worth about 15 pawn points at low wealth. — [RimWorld Wiki: Raid points](https://www.rimworldwiki.com/wiki/Raid_point)
- The adaptation factor rises when the player defends without casualties. The baseline assumes the player loses a pawn every 20–30 days. — [RimWorld Wiki: Raid points](https://www.rimworldwiki.com/wiki/Raid_point)

### Inferences
- A storyteller or director layer is probably the most useful single idea for the project. A global "comedy director" watches a tension or boredom meter and the player's recent activity, then picks the next incident: a cart crash, a lovers' quarrel, a pickpocket chase, a festival. It routes the incident to NPCs near the player, using their existing traits and relationships for casting. Emergence stays local, and pacing is authored.
- Mood break thresholds (minor, major, extreme) are a clean way to turn hidden state into visible comedic events (tantrum, sulking, binge eating) at a time and place the director chooses.

### Gaps
- Phoebe's and Randy's exact pacing parameters, the social interaction system (insult, chitchat, deep talk and their opinion effects), and the mood break thresholds weren't fetched from primary sources this session. The RimWorld wiki covers them.

## Shadows of Doubt: procedural city, citizens with homes, jobs, routines and relationships, procedural murders; scale; criticisms

### Takeaway
Shadows of Doubt simulates hundreds of citizens with routines and a Sims-like needs layer. Early routines were precomputed, and the developer replaced them with a goal-based system because spontaneous reactions kept invalidating the precomputed schedules. Performance relies on update-rate LOD, where only citizens near the player or on screen tick frequently. Critics praised the simulation but found the interactions repetitive and bland, with little sense of consequence.

### Cited Findings
- The old AI was replaced by "a new goal-based system." A stat system modeled on The Sims drives minor actions (food, water, rest). Earlier routines were "almost entirely pre-computed," and spontaneous actions such as investigating a noise "could invalidate the routine," forcing a recalculation. — [DevBlog #15 Moving in the Citizens](https://colepowered.itch.io/shadows/devlog/78044/shadows-of-doubt-devblog-15-moving-in-the-citizens)
- Performance: the AI update rate is high only for citizens near the player and not doing actions that need heightened awareness. Varying it "with proximity to what's actually on-screen" makes "the performance cost of 95% of the citizens at any one time relatively insignificant." Every room is explorable thanks to heavy culling and small textures. — [DevBlog #15](https://colepowered.itch.io/shadows/devlog/78044/shadows-of-doubt-devblog-15-moving-in-the-citizens)
- The design is "the simulation of 100s of little citizens, all going about their daily routines." — [DevBlog #8 Simulating a City](https://colepowered.com/?p=34142)
- Citizens who notice forced entry leave their routines to investigate, and they also react to screams and other suspicious sounds. — [DevBlog #10 Gameplay Loop](https://colepowered.com/?p=34184)
- Before Early Access launch (2023), performance was still short of the target and was named a focus for Early Access. — [DevBlog #33](https://colepowered.com/2023/04/page/2/)
- Reception: Metacritic "mixed or average," with 67% of critics recommending it on OpenCritic. Critics cited "slightly wonky" character behavior and repetitive dialogue exposing "limitations of the game's world," and "repetitive and bland" interactions with little consequence. — [Wikiwand: Shadows of Doubt](https://www.wikiwand.com/en/articles/Shadows_of_Doubt); [OpenCritic](https://opencritic.com/game/14865/-/reviews?page=2)
- An Unwinnable feature argues the game "cooks its simulation so that murder becomes inevitable," leaving the player feeling powerless rather than clever. — [Unwinnable](https://unwinnable.com/?p=101172)
- Repetition sets in once the player learns the case patterns, partly because of the procedural city. — [PC Gamer review](https://pcgamer.com/games/sim/shadows-of-doubt-review); [ProGameGuides review](https://progameguides.com/shadows-of-doubt/shadows-of-doubt-review-indie-at-its-finest/)

### Inferences
- Lesson 1: precomputed schedules are cheap but brittle. Use a schedule as the default goal and let interrupts (noise, a witnessed crime, a friend passing by) push a temporary goal on top, then resume. Don't recompute the whole day.
- Lesson 2: a deep simulation with shallow expression feels empty. Players read NPCs through dialogue, barks and visible reactions. A comedy game needs many cheap, varied, context-aware barks and gestures (template grammar plus state tags) more than deeper simulation.
- Lesson 3: tie update rate to screen proximity. Shadows of Doubt shows this can make most of the population nearly free.

### Gaps
- The murder generator's mechanics (how the killer, victim and motive are chosen from relationships) and the city and citizen count per city weren't fetched. The DevBlog #23 "Generating Citizens" series likely covers them.

## Middle-earth: Shadow of Mordor / Shadow of War Nemesis system: memory, promotion, rivalries

### Takeaway
Nemesis keeps a small roster of named orc captains in a hierarchy. Each has traits, strengths and weaknesses, and memories of encounters with the player. Outcomes (killing the player, escaping, being humiliated) change rank and dialogue, so the player's history writes the villains. The system is patented by WB (filed 2015, granted 2021), which matters for anyone copying it.

### Cited Findings
- Surviving enemies remember the player, rise through the ranks, and come back with new dialogue, tactics and grudges. The WB patent was filed in 2015 and granted in 2021. — [TweakTown](https://www.tweaktown.com/news/104146/game-of-thrones-kingsroad-early-access-costs-25-90-and-lasts-four-weeks/index.html) (secondary)
- An orc that kills the player is promoted, and a grunt can become a captain. — [Twinfinite](https://twinfinite.net/ps4/5-ways-shadow-of-war-improves-upon-predecessor/2/)
- Many named enemies emerge from player actions such as near-misses or repeated encounters. — [GamesRadar](https://www.gamesradar.com/shadow-mordor-nemesis-system-amazing-how-works)
- The system stores outcomes that matter for the next encounter (who won, who escaped, status changes) rather than a full replay. — [ITechGuides](https://www.itechguides.com/how-shadow-of-mordors-nemesis-system-works/) (thin source)

### Inferences
- The memory is cheap: a per-NPC list of (event type, with whom, outcome, timestamp), plus a few scars or tags that change appearance and barks ("You again! The one who threw me in the fountain!"). It works because it is player-centric and explicitly referenced on screen.
- Don't copy the patented specifics, such as a hierarchy with promotion triggered by player death. A generic "NPCs remember and refer to past interactions with the player" is long-standing practice, but get legal review before closely imitating Nemesis.

### Gaps
- I didn't find the AI and Games episode or a Monolith GDC talk this session, so internal details (power-struggle simulation between captains, hierarchy size) are unconfirmed.

## Oblivion's Radiant AI: original ambitions and why it was scaled back; Skyrim's Radiant Story

### Takeaway
Radiant AI gave NPCs goal packages (eat, sleep, socialize) with freedom in how they achieved them, constrained by personality values such as Responsibility. In testing, unconstrained goal-seeking produced chaos, such as skooma addicts killing a dealer for his stock, which broke quests. It was dialed back before release. Skyrim's "Radiant Story" moved the procedural focus to quest generation: quest templates with slots filled by context-appropriate NPCs and locations.

### Cited Findings
- Emil Pagliarulo described a test where a quest-giver NPC was dead when the player arrived. Skooma addicts who couldn't get their fix had killed the merchant to get it. — [Slashgear](https://www.slashgear.com/1237314/why-oblivions-npc-rampage-matters-for-the-future-of-ai-development); [GamesBeat "Dimming the Radiant AI in Oblivion"](https://gamesbeat.com/dimming-the-radiant-ai-in-oblivion/)
- Radiant AI "actually had to be dialed back." Left unchecked, it could have thrown the world into chaos. — [The Escapist (via DotEsports)](https://dotesports.com/skyrim/news/elder-scrolls-6-must-bring-back-one-oblivion-feature-to-avoid-starfields-major-flaw); [Cracked](https://cracked.com/article_34695_the-elder-scrolls-iv-oblivions-ai-had-to-be-dumbed-down-to-save-the-game.html)
- NPCs had scheduled goals (eat at 6pm, etc.). Without food they look for it, and with a low Responsibility rating they may steal or pickpocket it. — [ProfessionalMoron analysis](https://professionalmoron.com/2019/12/10/the-elder-scrolls-iv-oblivions-ai); [PC Gamer](https://www.pcgamer.com/games/the-elder-scrolls/after-hearing-the-king-of-funny-elder-scrolls-clips-explain-how-oblivion-npcs-work-i-have-a-newfound-respect-for-elves-who-steal-food-when-theyre-hungry-and-husbands-who-fight-their-wives-dogs)
- A Bethesda designer said Radiant AI is an enormous investment, but every improvement makes it less noticeable to players. — [FRVR summary](https://frvr.com/blog/news/elder-scrolls-designer-explains-that-radiant-ai-is-an-enormous-investment-for-bethesda-but-every-improvement-actually-makes-it-less-noticeable-to-players/)
- A Steam user claims the post-Oblivion lockdown happened because hungry NPCs stole food and got killed by guards. This is user speculation and there's no primary Bethesda statement on it. — [Steam discussion](https://steamcommunity.com/app/1716740/discussions/0/3824174193413448989)

### Inferences
- The failure mode is unbounded agency plus lethal verbs plus quest-critical NPCs, which leads to cascades that destroy content. For a comedy game, this is a feature if outcomes are non-lethal and reversible: a stolen hat, a dunked rival, a black eye. Guardrails: "essential" flags, no permanent loss, and a director or judge that vetoes outcomes that break the player's current thread.
- "Improvements are invisible" means the investment must go into legibility (barks, emotes, thought bubbles, a gossip feed), not invisible correctness. The 2025 viral "Oblivion clips" (elves stealing food, a husband fighting dogs) show that players love visible emergent absurdity.

### Gaps
- No primary Skyrim Radiant Story technical source was fetched (story manager, event nodes, alias conditions). It was described at GDC 2012 but not verified here.

## Others: Ultima VII, Majesty, Kenshi, Watch Dogs Legion, Wildermyth, Stardew Valley, Bannerlord, Songs of Syx, Ultima Ratio, Project Zomboid, Rain World, recent indies

### Takeaway
Of this list, I could verify only Watch Dogs: Legion this session. Its Census system procedurally generates consistent demographic profiles, generates schedules dynamically and links characters in relationship networks along which affinity and memories spread. Ubisoft says it needed "massive tuning." Hour-by-hour schedules, as in Ultima VII, Majora's Mask, Shenmue and Stardew Valley, are the long-standing low-cost baseline.

### Cited Findings
- Census generates inhabitants with "an appearance, independent lives, schedules, and relationships." The procedural layer "creates characters and gives them demographic profiles that are internally consistent" with their role. A simulation layer "dynamically generates schedules appropriate for that character" (e.g. work, then gym) and keeps characters persistent. — [Ubisoft News: The Tools That Built London](https://news.ubisoft.com/en-us/article/4po3S9Pwp1YcgBmGPmQxAh/watch-dogs-legion-the-tools-that-built-london)
- Relationship networks: affinity and memories spread across links. Helping someone improves how their relatives see DedSec, and hospitalizing someone makes connected people less willing to be recruited. — [Ubisoft News](https://news.ubisoft.com/en-us/article/4po3S9Pwp1YcgBmGPmQxAh/watch-dogs-legion-the-tools-that-built-london)
- Christopher Dragert: procedural generation "requires massive tuning to align the output with game-design goals." Census is "a large, data heavy system" that "touches all aspects of the game," and tagging the world was a major effort. — [Ubisoft News](https://news.ubisoft.com/en-us/article/4po3S9Pwp1YcgBmGPmQxAh/watch-dogs-legion-the-tools-that-built-london)
- NPC problems and relationships are the recruitment hooks: "those problems are how you recruit them." — [GameRevolution interview](https://www.gamerevolution.com/originals/553585-watch-dogs-legion-npc-system-works)
- Players can spy on NPCs' set schedules. Hour-by-hour routines were popularized by Shenmue and Majora's Mask. — [GameSpot](https://www.gamespot.com/articles/watch-dogs-legion-npcs-follow-set-schedules-which-/1100-6480604/)
- Ubisoft Toronto gave GDC 2021 talks on Legion's systems. — [Ubisoft Toronto GDC 2021](https://toronto.ubisoft.com/ubisoft-toronto-programmers-2021-game-developers-conference/)

### Inferences
- The relationship-network propagation from Legion is the right structure for gossip in a city comedy. When an event happens to A, an opinion delta spreads to A's friends and family with decay, possibly at the next "gossip exchange" when two connected NPCs meet. It's cheap and creates neighborhood-level consequences.
- Legion's "problems as hooks" means each NPC's procedural trouble is also a player affordance. In a comedy, each NPC's want (lost goat, rival suitor, debt) is both a scheme seed and a mini-quest.

### Gaps
- No sources were gathered this session for Ultima VII schedules, Majesty's indirect-control heroes, Kenshi's faction and squad AI, Wildermyth's procedural legacy storytelling, Stardew Valley's schedule files and gift-taste memory, Bannerlord's clan and lord AI, Songs of Syx's thousands-of-citizens performance, Ultima Ratio, Project Zomboid's meta-events, Rain World's ecosystem AI (Joar Jakobsson / Videocult; AI and Games covered it), or 2023–2026 indie social sims. A follow-up pass should target the AI and Games episodes on Rain World and Kenshi, Stardew modding docs (schedule data format), and the Songs of Syx devlogs.

## Decision architectures: utility AI, GOAP, HTN, behavior trees; which suit social, agenda-driven NPCs; grounding plans in animation

### Takeaway
F.E.A.R.'s GOAP grounds every plan in a three-state FSM: GoTo, Animate, UseSmartObject. That is the key pattern for keeping a planner tied to animation. GOAP searches the state space, while HTN decomposes authored high-level tasks into primitives. In this session's sources, utility AI is described as suited to dynamic environments but seen as hard to design. For social NPCs with projects (build, steal, recruit), a hybrid looks right: utility to pick the agenda, short HTN or authored-step plans to execute it, and smart-object verbs to ground it.

### Cited Findings
- Orkin's GDC 2006 talk "Three States and a Plan": F.E.A.R. AI was GOAP driving an FSM with just three states: GoTo, Animate, UseSmartObject. Any plan, however complex, reduces to these. — [Jikguard summary "Building the AI of F.E.A.R. with GOAP"](https://www.jikguard.com/news/building-the-ai-of-fear-with-goal-oriented-action-planning); [modl.ai History of AI in Games: F.E.A.R.](https://modl.ai/?p=2235)
- GOAP is "the most known planner used in games," working with state variables and a state-space search. HTN uses abstract operators to decompose a high-level goal into a primitive plan network. No direct HTN vs STRIPS comparison was known to the authors. — [Charles Univ. paper PDDL vs HTN (2013)](https://artemis.ms.mff.cuni.cz/main/papers/2013-pddl_vs_htn.pdf); [Liverpool lecture slides](https://www2.csc.liv.ac.uk/~tsakalid/game_materials/lecture25.pdf)
- Utility-based control isn't widely adopted in commercial games, partly because it is seen as resource-intensive and hard to design. It suits very dynamic environments. — [DiVA thesis comparing FSM/GOAP/utility](https://www.diva-portal.org/smash/get/diva2%3A1673140/FULLTEXT01.pdf); [Nez docs](https://anshuman-kumar.gitbook.io/nez-doc/ai-fsm-behavior-tree-goap-utility-ai)
- The Sims is effectively utility AI over object advertisements (see the Sims section). — [GMTK transcript](https://amara.org/subtitles/cVoJS4OdmVql/en/1/download/The%20Genius%20AI%20Behind%20The%20Sims.en.txt)

### Inferences
- A recommended stack for hundreds of social NPCs on low-end hardware:
  1. Schedule layer: a day template per archetype (baker, guard, lover, beggar) as the default goal. It is nearly free and legible, as in Ultima VII, Majora's Mask, Stardew and Legion.
  2. Utility layer at about 0.2–1 Hz on screen: scores interrupts and "agendas" (schemes) from needs, traits and opinions. Use Dave Mark-style response curves with a small number of considerations.
  3. Plan layer: for agendas, use authored HTN-like recipes ("steal X" = find X, wait until owner distracted, GoTo, Animate 'grab', flee) rather than open GOAP search. Recipes are cheaper, debuggable and authorable for comedic timing. GOAP search across hundreds of agents is costlier and less predictable.
  4. Grounding: every primitive is one of GoTo, Animate or UseSmartObject (Orkin), with smart objects supplying slots and animation clips, as in the Sims.
  5. Behavior trees fit reactive execution of a single verb or encounter (a chase, a brawl), not long agendas.
- Horizon Zero Dawn and Killzone used HTN (Guerrilla), and Dave Mark's Infinite Axis Utility System is the main utility reference. Neither was verified this session.

### Gaps
- No sources fetched for Dave Mark's GDC talks or Game AI Pro utility chapters, Guerrilla's HTN talks (Killzone 2/3, Horizon), or Troy Humphreys' HTN for Transformers. The Game AI Pro chapters are free at gameaipro.com, but weren't fetched here.

## Performance: level-of-detail simulation for hundreds of NPCs on low-end hardware

### Takeaway
Every shipped example uses AI LOD: full-fidelity updates near or on screen, reduced update frequency and simpler movement farther away, and statistical or "story progression" simulation off screen. Robert Zubek's Game AI Pro 3 chapter "1000 NPCs at 60 FPS" (Project Highrise) and Warhorse's Kingdom Come: Deliverance talk are the most relevant references.

### Cited Findings
- Shadows of Doubt: proximity- and screen-based update rates make about 95% of citizens "relatively insignificant" in cost. — [DevBlog #15](https://colepowered.itch.io/shadows/devlog/78044/shadows-of-doubt-devblog-15-moving-in-the-citizens)
- Zubek, "1000 NPCs at 60 FPS" (Game AI Pro 3): AI for Project Highrise, with up to 1000 NPCs in the player's building. Only the introduction was visible. — [O'Reilly Game AI Pro 3 Ch.34](https://www.oreilly.com/library/view/game-ai-pro/9781351647748/xhtml/49_Chapter34.xhtml)
- A GDC talk, "Supporting Thousands of NPCs in…" (Kingdom Come: Deliverance), describes new AI LOD techniques that keep the scripting interface as unaware of LOD as possible. The search summary puts KCD2 at about 2,400 NPCs. — [GDC Vault](https://gdcvault.com/play/1035718/Supporting-Thousands-of-NPCs-in) (count from search summary, unverified)
- Simulation LOD reduces CPU and memory use for persistently simulated NPCs and lowers simulation quality where the player can't see. — [TCD dissertation 2016](https://publications.scss.tcd.ie/theses/diss/2016/TCD-SCSS-DISSERTATION-2016-055.pdf); [Brom et al. 2007 "Simulation LOD for virtual humans"](https://www.springerprofessional.de/en/simulation-level-of-detail-for-virtual-humans/2882154)
- Grouped hierarchical LOD for crowds: the highest-detail characters use full pathfinding, and the lowest move in straight lines. — [Osborne & Dickinson (core.ac.uk)](https://core.ac.uk/download/55114.pdf)
- An LOD-based AI adaptation paper (ICAART 2013) gives agents in video games reduced behavior fidelity by distance. — [Mahdi et al., ICAART 2013](https://www.lirmm.fr/~fmichel/publi/pdfs/mahdi13icaart.pdf)
- The Sims 3 cut decision cost by replacing scoring of every object with a commodity-to-object map. — [GMTK transcript](https://amara.org/subtitles/cVoJS4OdmVql/en/1/download/The%20Genius%20AI%20Behind%20The%20Sims.en.txt)

### Inferences
Concrete LOD plan for three.js on phones and Iris Xe:
- LOD0, on screen and within about 30 m (perhaps 20–40 NPCs): skinned or instanced animation, utility thinking at 2–5 Hz, staggered across frames (time-sliced, with a fixed per-frame AI budget such as 1–2 ms), local avoidance, barks.
- LOD1, visible but far: instanced impostors or low-poly versions with a baked walk cycle, think at 0.2–0.5 Hz, follow precomputed paths (navgraph waypoints or splines), no avoidance.
- LOD2, off screen in an active district: no rendering or physics, position advanced along the schedule analytically (time-based interpolation on the path), with discrete events resolved by dice roll when NPCs "meet."
- LOD3, the rest of the city: Sims 3-style story progression on a coarse tick (every in-game hour), touching only relationship, opinion and agenda counters, with results surfaced as gossip when the player arrives.
- Promotion to a higher LOD must reconstruct plausible state: the current schedule slot puts the NPC at the right place, doing the right activity. Keep scripts LOD-agnostic, as Warhorse did.
- Put all agent state in typed arrays (structure of arrays) and run LOD2/3 ticks in a Web Worker. Use spatial hashing for "who is near whom" and advertisement queries.

### Gaps
- No technical details were obtained for Zubek's or Warhorse's actual techniques, Songs of Syx's or DF's performance budgets, or WebGL- or mobile-specific crowd benchmarks. These need follow-up.
