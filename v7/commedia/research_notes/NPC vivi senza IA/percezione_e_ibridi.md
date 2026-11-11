# Perceived "aliveness" of NPCs/towns, pitfalls of emergent/procedural NPC systems, and hybrid LLM approaches (state as of Nov 2026)

Research date: 2026-11-11. Budget-limited pass (~18 tool calls); many items rely on search-result snippets plus 1 full-page fetch. Items not verified this session are in Gaps, not stated as fact.

## Legibility: making simulation visible (Eliza / SimCity / Tale-Spin effects, "if the player can't see it, it doesn't exist")

### Takeaway
Players judge aliveness by what shows on the surface, not by internal depth. Hidden depth gets missed (the "Tale-Spin effect"). Surface bluff can be read as depth (the "Eliza effect"). The goal is for surface elements to map to the internal model so players can learn it (the "SimCity effect"). Bethesda's own experience says the same thing: the smoother and more invisible Radiant AI became, the less players noticed it.

### Cited Findings
- Noah Wardrip-Fruin, "Three Play Effects: Eliza, Tale-Spin, and SimCity". **Eliza effect:** the audience reads a system's surface as more capable than it is. **Tale-Spin effect:** works that "appear, on their surface, significantly less complex than they are internally". James Meehan's 1976 Tale-Spin story generator was rich inside, but its output was flat and its depth was invisible. — [DH abstracts](https://dh-abstracts.library.virginia.edu/works/810); [Grand Text Auto, Tale-Spin effect (2008)](https://grandtextauto.soe.ucsc.edu/2008/02/21/ep-54-the-tale-spin-effect/)
- **SimCity effect** (Will Wright, 1989): it starts from the Eliza effect, but "the surface elements of SimCity have analogues within the internal processes and data". Its result "is precisely the development of system understanding" through play. — [Grand Text Auto, EP 8.1 Eliza and SimCity (2008)](https://grandtextauto.soe.ucsc.edu/2008/03/11/ep-81-eliza-and-simcity)
- Note: no source connects "A Tale of Two Cities" to these terms. The phrase in the brief is probably a garbled version of Wardrip-Fruin's **Tale-Spin** effect. — (search found none; see the sources above)
- Bruce Nesmith (Skyrim lead designer, FRVR Podcast, reported 16 Oct 2025) called Radiant AI an "enormous" investment that took multiple games to get right. "The quirkiness of Radiant AI in Oblivion is what makes it noticeable." Skyrim's version was "smoother" and "more prevalent", but because it felt natural, players rarely noticed it. Skyrim examples: a relative takes over a dead NPC's role or quest; NPCs fight over a dropped item, ask to keep it, or sell it; an NPC grabs a weapon from a chest mid-fight. — [FRVR](https://frvr.com/blog/news/elder-scrolls-designer-explains-that-radiant-ai-is-an-enormous-investment-for-bethesda-but-every-improvement-actually-makes-it-less-noticeable-to-players/)
- Emily Short, "Memory and Knowledge for Characters" (2019): if the game can later explain *why* something happened, that supports systems legibility. This matters most when events come from simulation or player action rather than authoring. — [emshort.blog](https://emshort.blog/2019/03/05/describing-a-procedurally-generated-world/)
- Versu (Evans & Short 2014): a simulationist drama in which each NPC chooses its own actions by utility-based reactive action selection. It is a reference design for autonomous but readable characters. — [Versu paper (PDF)](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)
- Short & Tarn Adams (eds.), *Procedural Storytelling in Game Design* (2019), is the main anthology on this topic (not read this session). — [PDF copy](https://wileywiggins.com//documents/dorf/Short%20and%20Adams%20-%202019%20-%20Procedural%20storytelling%20in%20game%20design.pdf)

### Inferences
- For a mobile town game: every simulated state that should feel alive needs a visible "tell", such as a bark, an icon, a changed shop sign, or a rumor. Simulation that produces no visible output can be cut without the player perceiving any loss.
- Some quirkiness is useful. A slightly odd but readable behavior (Oblivion's guard yelling at a deer) gets remembered and retold, while a seamless one goes unnoticed. Design for "explainable surprise".
- An explanation layer is cheap and very effective. Short's "the game can say why" maps directly to rumor or gossip lines, for example "Hai sentito? Il fornaio ha chiuso perché..." ("Did you hear? The baker closed because...").

### Gaps
- No primary text was retrieved for: Jeff Orkin's "the drama is in the visible" (F.E.A.R. / *The Restaurant Game*), Tarn Adams talks on legibility, or Will Wright's Sims quotes on legibility. Wording and attribution are unverified.
- The text of Sylvester's *Designing Games* chapter was not retrieved (see the next section for secondary quotes).

## Apophenia and player storytelling (RimWorld, Dwarf Fortress, Sims)

### Takeaway
Tynan Sylvester designs RimWorld explicitly around apophenia: players extract more story than the mechanics encode. He uses deliberately simple graphics to leave space for that projection, and settles game-versus-story-generator conflicts in favor of the story generator.

### Cited Findings
- Sylvester (RPS, 2016): apophenia is "essentially the notion that players extract more story meaning from a game event than is really represented in the mechanics." — [Rock Paper Shotgun, "How RimWorld Generates Great Stories" (2016), mirror](https://hn.jakechampion.name/reader/https://www.rockpapershotgun.com/2016/08/12/how-rimworld-generates-great-stories)
- Sylvester justifies RimWorld's simple graphics by appeal to apophenia: abstraction is an asset for narrative. — [Game Developer, "RimWorld, Dwarf Fortress and procedurally generated storytelling"](https://gamedeveloper.com/design/rimworld-dwarf-fortress-and-procedurally-generated-story-telling)
- He says a game exists to generate an experience together with the player, not to tell stories the way a book does ("write a book"). — [Breitbart interview (Oct 2016)](https://www.breitbart.com/tech/2016/10/06/rimworld-developer-tynan-sylvester-games-are-for-player-experiences-if-you-just-want-to-tell-stories-write-a-book)
- Longer discussion: AIAS Game Maker's Notebook, "Generating Human Stories with RimWorld Creator Tynan Sylvester". — [libsyn](https://gamemakersnotebook.libsyn.com/generating-human-stories-with-rimworld-creator-tynan-sylvester)

### Inferences
- Stylized, low-detail NPC presentation (portraits, masks, commedia dell'arte archetypes) helps apophenia. Photoreal or verbose output invites scrutiny and exposes incoherence.
- Tightly coupled, visible causes (A's need leads to an act toward B, which B remembers and mentions) give players the raw material for projected stories. That matters more than how many variables the simulation has.

### Gaps
- No quantitative player-perception studies were found for RimWorld, DF, or Sims (survey data, retention attributed to emergent stories).

## Pitfalls: oatmeal, repetition, incoherence, emptiness

### Takeaway
Typical failures are (1) perceptual sameness despite mathematical uniqueness (oatmeal), (2) bark and recruit repetition, (3) emergent behavior that is incoherent or destructive (Oblivion), and (4) "empty shell" sims whose citizens are nothing beyond their routines (Shadows of Doubt, Watch Dogs Legion recruits). The fixes are curation, constraints, authored hooks, and depth placed where players look.

### Cited Findings
- **Oatmeal (Kate Compton).** You can generate bowls of oatmeal where every oat has a different position and orientation, so each bowl is mathematically unique, but the user just sees a lot of oatmeal. The question is perceptual uniqueness. Rabii & Cook (FDG 2023) call it one of the best-known idioms among PCG practitioners and analyze it with Kolmogorov complexity. — [Game Developer, Compton "Practical Procedural Generation for Everyone"](https://gamedeveloper.com/design/practical-procedural-generation-for-everyone-); [Rabii & Cook, "Why Oatmeal is Cheap" (arXiv 2305.02131)](https://ar5iv.labs.arxiv.org/html/2305.02131)
- Emily Short applies oatmeal to **text** generation. — [emshort.blog, "Bowls of Oatmeal and Text Generation" (2016)](https://emshort.blog/2016/09/21/bowls-of-oatmeal-and-text-generation/)
- Boris the Brave, "Oatmeal spice" (Jul 2026): a recent practitioner post on adding meaningful variation to oatmeal (not read in full). — [boristhebrave.com](https://www.boristhebrave.com/2026/07/05/oatmeal-spice/)
- Remedies attributed to Compton in secondary sources: check outputs against dealbreakers at scale, and group artifacts into perceivable types instead of maximizing raw variety. — [search summary of Compton sources; see Game Developer link above]
- **Oblivion Radiant AI.** Developers found it led to many NPC deaths (killing over drugs, money, items). Programmer Steve Meister confirmed they had to specifically stop some NPCs from attacking each other. Behaviors were toned down for release. The advertised eat/talk interactions produced mostly gibberish conversations and very slow eating. — [Wikipedia: Radiant AI](https://en.wikipedia.org/wiki/Radiant_AI); [GamesBeat, "Dimming the Radiant AI in Oblivion"](https://gamesbeat.com/dimming-the-radiant-ai-in-oblivion/); [Cracked](https://cracked.com/article_34695_the-elder-scrolls-iv-oblivions-ai-had-to-be-dumbed-down-to-save-the-game.html) (secondary, some stories exaggerated)
- For Skyrim, Todd Howard asked for Radiant applications "that don't involve murder". — [PC Gamer (2025)](https://www.pcgamer.com/games/the-elder-scrolls/skyrims-version-of-radiant-ai-was-developed-from-a-drawing-todd-howard-made-on-a-napkin/); [GamesRadar](https://www.gamesradar.com/games/the-elder-scrolls/skyrim-npcs-are-only-as-complex-as-they-are-thanks-to-a-literal-napkin-drawing-that-todd-howard-doodled-reveals-ex-bethesda-dev-its-actually-a-napkin-story)
- **Shadows of Doubt** (ColePowered, 2023): critics praised the open-ended design but criticized repetitive elements and bugs. — [Wikiwand](https://www.wikiwand.com/en/articles/Shadows_of_Doubt). XboxEra called it full of good ideas that still feels like "an empty shell"; its cons include repetitive jobs and dialogue that repeats too often. — [XboxEra review (Sep 2024)](https://xboxera.com/2024/09/23/shadows-of-doubt-review). PC Gamer: the people in town are "never much more than their routines and details". — [PC Gamer review](https://pcgamer.com/games/sim/shadows-of-doubt-review). Players report exploitable, repetitive routines. — [Lemmy thread](https://lemmy.korz.dev/post/867672/1450890)
- **Watch Dogs: Legion** (2020) "play as anyone": recruiting becomes monotonous and repetitive. Recruits are "nothing more than their weapons and abilities", and the reviewer never felt compelled to learn names. Voice performances varied widely in quality ("laughably bad", stereotyped accents). — [PC Gamer, "All of my recruits are massive disappointments"](https://www.pcgamer.com/au/all-of-my-watch-dogs-legion-recruits-are-massive-disappointments); [Gamepressure review](https://www.gamepressure.com/editorials/reviews/watch-dogs-legion-review-safe-and-polite-revolution/zb33e); [Attack of the Fanboy review](https://attackofthefanboy.com/reviews/watch-dogs-legion-review/)

### Inferences
- **Remedies for a small mobile town:**
  - Few NPCs, each with a hand-authored "spine" (an archetype with a want, a secret, and a running relationship), plus procedural "flesh" (daily routine, mood, gossip).
  - Hard caps on repetition: per-line cooldowns and "already said" memory.
  - Prohibition rules (never kill or steal, never contradict established facts), learned from Oblivion.
  - Invest variety in what the player sees most often: greetings and the first line of each interaction.
- Procedural identity without authored stakes produces Legion/Shadows-of-Doubt "emptiness". An NPC needs at least one fact the player can learn and later see pay off.

### Gaps
- No sources were retrieved this session for: the Skyrim "arrow in the knee" guard line (widely known meme, not verified here), repetitive barks in Starfield, Cyberpunk 2077 crowd/police AI criticism (2020) and its fixes in patch 2.0, or the No Man's Sky 2016 oatmeal criticism. The report writer should treat these as common knowledge needing a citation, or omit them.
- The specific claim about pitch-shifted procedural voices in Watch Dogs Legion was not confirmed. The sources only discuss uneven voice quality and accents.

## Bark systems: Valve fuzzy rule matching, Hades priority queues, numbers

### Takeaway
The proven zero-AI-cost approach to reactive NPC speech is a rule database queried each time with a bag of world facts. The most specific matching rule wins, with fallbacks. It is authored by writers and scales to tens of thousands of lines (Hades 1 has about 21k lines; Hades 2 has about 30k voice lines and over 400k words).

### Cited Findings
- Elan Ruskin (Valve), GDC 2012, "AI-driven Dynamic Dialog through Fuzzy Pattern Matching. Empower Your Writers!", from the Left 4 Dead series. Each query carries hundreds of facts about the world, which are fuzzy-matched against a database of thousands of lines. The most specific matching rule is chosen and less specific rules act as fallbacks. Writers can add special cases and track new facts without programmer changes. Dialogue is interruptible. The talk covers lookup optimizations. — [Slides PDF (Valve CDN)](https://cdn.fastly.steamstatic.com/apps/valve/2012/GDC2012_Ruskin_Elan_DynamicDialog.pdf); [GDC Vault](https://gdcvault.com/play/1015528/AI-driven-Dynamic-Dialog-through); [Emily Short summary (2012)](https://emshort.blog/2012/03/16/gdc-2012-talk-on-dynamic-dialogue/)
- An open-source implementation inspired by the talk adds auto-disabling rules and probabilities. — [github.com/erik/fuzzy](https://github.com/erik/fuzzy). A related Game Developer article covers fuzzy pattern matching for behaviours. — [Game Developer](https://www.gamedeveloper.com/game-platforms/creating-behaviours-with-fuzzy-pattern-matching)
- **Hades scale.** Kasavin says two-thirds of the script is dialogue and 21,000 voice lines were recorded. A GDC talk description says more than 22,000 lines. — [GameSpot](https://gamespot.com/articles/hades-writer-explains-script-philosophy-after-player-discovers-incredible-detail/1100-6482650/); [GDC Vault](https://www.gdcvault.com/play/1026975/contactUs). **Hades II**: over 400,000 words and 30,000 voice lines, about 50% more. — [GamesRadar](https://www.gamesradar.com/games/hades/hades-2-has-an-epic-script-of-over-400-000-words-and-30-000-voice-lines-around-50-percent-more-than-the-original-roguelike)
- **Hades mechanism (secondary source).** Dialogue nuggets are queued with priority tags and unlock conditions. After a key event such as beating Meg, low-priority characterizing chit-chat is skipped in favor of reactive lines. Kasavin says this responsiveness made each run feel unique and the characters more alive. — [Screenhub, Kasavin interview](https://www.screenhub.com.au/news-article/features/digital/jini-maxwell/hades-greg-kasavin-breaks-down-supergiants-unique-approach-to-narrative-262459); [Game Developer](https://gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death)
- Players note that no specific line is guaranteed, and some conversations have higher priority. — [Steam forum](https://steamcommunity.com/app/1145360/discussions/0/2987539784417139179) (user comment)
- Storylets (Emily Short) are a related authored-modular structure. — [emshort.blog "Storylets: You Want Them"](https://emshort.blog/category/if-languages)

### Inferences
- Recommended core for the target (browser or Play Store, Italian, zero runtime cost) is a Ruskin-style rule matcher plus a Hades-style priority and once-only queue. Combined with a few hundred to a few thousand Italian lines authored or curated offline, this is cheap: JSON plus a matcher of a few KB. It is fully deterministic and moderatable, which also simplifies Play policy.
- Each line should carry: criteria (facts), a specificity score, priority, a cooldown or once-flag, and any memory facts it writes. Lines written about recent player-visible events are what make NPCs seem alive.

### Gaps
- Exact numbers from Ruskin's slides (for example L4D2 rule or line counts) were not extracted; consult the PDF. Firewatch's reactivity system was not researched.

## Hybrid approaches 2023–2026: runtime LLM games, on-device models, offline authoring

### Takeaway
By 2026, shipping runtime-LLM NPCs split into two paths:

- **Cloud-metered:** Suck Up! sells consumable "AI tokens" that cap play. Whispers from the Star uses cloud AI and is well reviewed but divisive.
- **On-device on desktop RTX GPUs:** inZOI Smart Zoi and PUBG Ally use NVIDIA ACE SLMs (Mistral-NeMo-Minitron, about 2B for PUBG Ally) and need 8 GB+ VRAM, with English/Korean/Chinese language support only.

Neither path transfers cleanly to an Italian mobile-browser game. Mobile WebGPU LLMs run at roughly 4–17 tok/s and are fragile. The low-risk hybrid is offline LLM authoring with human curation: Ubisoft Ghostwriter-style draft generation for barks, reviewed by writers.

### Cited Findings
- **inZOI Smart Zoi** (Krafton, early access March 2025). Uses an on-device NVIDIA ACE SLM, reported as a Mistral NeMo Minitron variant. A fan wiki claims 0.5B parameters and about 1 GB of VRAM, with graphics settings automatically dropping one tier. RTX-only. Internet is needed for setup. English only as of early 2026. Fan-wiki data; the parameter count is unverified. — [inZOI wiki, Smart Zoi](https://thegameswiki.com/inzoi/wiki/smart-zoi); [Creative Bloq on NVIDIA ACE](https://www.creativebloq.com/entertainment/gaming/nvidias-ai-characters-are-about-to-transform-how-we-see-video-games)
- **PUBG Ally** (Krafton plus NVIDIA ACE). Public beta ran 17–30 June 2026 in PUBG Arcade, on one map (Sanhok) in AI Duo mode. The stack is fully on-device: NVIDIA ASR, the Mistral-NeMo-Minitron-2B SLM, and in-house TTS. It is quantized to run on GPUs with 8 GB VRAM and supports English, Korean, and Chinese. Architecture: a fast behavior-tree layer handles reflexes and the LLM handles intent, coordination, and speech. Krafton says on-device inference removed the network round trip and made latency predictable. — [NVIDIA dev blog, "How Krafton built PUBG Ally"](https://developer.nvidia.com/blog/how-krafton-built-pubg-ally-a-co-playable-character-powered-by-nvidia-ace/); [KitGuru](https://www.kitguru.net/gaming/joao-silva/pubg-ally-public-testing-begins-in-early-2026); [GameDev.net Q&A](https://gamedev.net/news/4114-qa-how-krafton-built-pubg-ally-a-co-playable-character-powered-by-nvidia-ace/)
- NVIDIA ACE Game Agent SDK (beta) and UE5 plugins for on-device companions were announced at Unreal Fest 2026. — [NVIDIA dev blog](https://developer.nvidia.com/blog/build-on-device-ai-companions-with-the-nvidia-ace-game-agent-sdk-and-unreal-engine-5-plugins/)
- **Suck Up!** (Proxima, 2024, $15.99 early access via its own site). Every NPC interaction spends an "AI Token". Proxima said PCs are not powerful enough to run the needed models. Players may hit a hard cap when tokens run out, and Proxima was exploring top-ups "at a fair price". — [The Magic Rain](https://themagicrain.com/?p=42121); [Naavik podcast with CEO Ran Mo](https://naavik.co/podcast/finding-success-with-ai-agents-and-content-creators/)
- **Whispers from the Star** (Anuttacon, Steam, launched 14 Aug 2025; voice and text chat with an AI character). Launched "Very Positive" (92% of 202). Later about 1,000+ reviews at roughly 85% positive (SteamDB). All-time peak of 964 concurrent players. OpenCritic critic score of 8/10 on its reviews page. Coverage flagged the AI use as divisive. — [Notebookcheck](https://www.notebookcheck.net/Steam-launch-New-interactive-fiction-game-debuts-to-Very-Positive-reviews-may-divide-gamers-over-heavy-AI-integration.1087821.0.html); [SteamDB](https://steamdb.info/app/3730100/graphs); [OpenCritic](https://opencritic.com/game/20699/whispers-from-the-star/reviews)
- **Runtime cost example.** PC Gamer headline (date not retrieved): the developer of an AI-powered driving-instruction simulator spends $1,000 to keep its demo running. The search snippet said "per month" and the fetched headline said "per day"; this conflict is unresolved. — [PC Gamer](https://www.pcgamer.com/games/sim/the-developer-of-an-ai-powered-driving-instruction-simulator-is-spending-usd1-000-per-month-just-to-keep-its-demo-running/). An indie devlog describes changing its design because of GPT costs. — [GenRealms devlog](https://lemfandango.itch.io/genrealms/devlog/619030/gpt-costs-changes)
- **Mobile browser LLMs.**
  - A 2026 paper ("Llamas on the Web") reports its WebGPU engine's median decode speed beats WebLLM by 54% and Transformers.js by 69% across four GPUs. It cites roughly 4–17 tok/s decode on mobile GPUs (model and engine attribution unclear from the snippet). — [arXiv 2605.20706](https://arxiv.org/html/2605.20706)
  - A WebGPU dispatch-overhead study (2026) finds per-dispatch overhead dominates small-model inference across vendors, backends, and browsers. — [arXiv 2604.02344](https://arxiv.org/html/2604.02344)
  - A June 2026 write-up, "WebGPU feature detection was not enough to run small LLMs on phones", tested WebLLM 0.2.84 with Qwen2.5-0.5B. On iPhone Safari it hit page reloads (likely memory kills) and slow prefill. The original page was not retrievable (404 on the mirror). — [HN mirror listing](https://hackernews-dynamic.seasondane.workers.dev/news/48624985)
  - Native Android path: Google LiteRT-LM lists Qwen2.5-0.5B and similar small models on phones such as the S24 Ultra, much faster than browser paths. — [Google Developers Blog, LiteRT-LM](https://developers.googleblog.com/en/blazing-fast-on-device-genai-with-litert-lm/); [LiteRT community Qwen3-0.6B](https://dev.co/ai/llms/litert-community-qwen3-0-6b); [Pinggy, LLM in browser 2026](https://pinggy.io/blog/run_llm_in_browser_webgpu/)
- **Offline authoring.** Ubisoft La Forge's **Ghostwriter** (GDC, March 2023). A writer defines a character and an interaction type; the tool generates variations; the writer picks, edits, or scraps them. Ubisoft says it learns from which variations get picked. Scope: crowd chatter, combat barks, and town barks, explicitly not cinematics or lore. Writers were skeptical, arguing that editing could take longer than writing and that barks are where junior writers start. — [TechCrunch](https://techcrunch.com/?p=2517159); [Shacknews](https://shacknews.com/article/134702/ubisoft-ghostwriter-ai-technology); [VGC](https://www.videogameschronicle.com/news/ubisoft-is-developing-an-ai-tool-that-aims-to-support-scriptwriters); [80.lv](https://80.lv/articles/ubisoft-introduced-ai-tool-ghostwriter-to-generate-npc-dialogues/)

### Inferences
- **Recommended for this project.**
  - Use an LLM only at authoring time to draft large Italian bark and gossip banks per archetype and situation tag.
  - Have a human editor curate them for voice, register (Italian dialect color), and coherence.
  - Ship the result as static data in the rule matcher.
  - This gives zero per-player cost, no download of hundreds of MB, deterministic QA, and no runtime "generative AI app" moderation duties.
- An optional on-device model could be an opt-in "extra chiacchiere" (extra chatter) mode. Costs:
  - A 0.5–1B model at q4 is a download of about 300–700 MB.
  - Expect roughly 4–17 tok/s on mobile GPUs.
  - It fails on iOS Safari or on low-RAM devices.
  - Italian quality from sub-1B models is weak.
- If an on-device model is used, follow PUBG Ally's split: a deterministic layer owns facts and actions, and the model only rephrases. That prevents incoherence of the Oblivion kind.
- Cloud per-interaction metering (the Suck Up! model) creates hard caps and player resentment. It is unsuitable for a free or cheap mobile title.

### Gaps
- No verified information on Vaudeville (Bumblebee Studios, 2023), Retail Mage, or Inworld-powered titles (Inworld pricing and reception). Not retrieved.
- No official WebLLM or transformers.js documentation was read for supported model lists, memory, or mobile support. Exact Gemma 3 270M/1B, Phi-4-mini, and Qwen3-0.6B memory and speed figures on phones were not verified.
- No public per-player runtime cost for Suck Up!, Whispers from the Star, or inZOI.
- Italian-language quality of small on-device models: no benchmark found.

## Business and Play Store policy

### Takeaway
Runtime-generative features bring Google Play "AI-Generated Content" obligations: prevent offensive output, provide a way to flag it, and harden against prompt manipulation. Policy tightened again in August 2026 around non-consensual sexual content. Apps that use AI only to improve an existing feature, or that ship pre-generated content, appear to fall outside the generative-AI-app scope. An explicit requirement to disclose AI in the store listing is not confirmed.

### Cited Findings
- Google Play policy, "Understanding Google Play's AI-Generated Content policy". Generative AI apps must prevent restricted or offensive content (child exploitation, deceptive content, bullying, sexually gratifying generative AI) and must comply with all other Developer Program policies. — [Play Console Help 14094294](https://support.google.com/googleplay/android-developer/answer/14094294)
- Developers must let users report or flag offensive AI output, and must guard against prompts that manipulate AI features. — [TechCrunch](https://techcrunch.com/?p=2619733); [Mobile Marketing Magazine](https://mobilemarketingmagazine.com/google-ai-app/)
- Android Developers Blog (Aug 2026): stricter requirements against NCII ("nudify") content. Developers should stress-test against adversarial prompts. Apps suspended for this lose monetization and ads across Google. — [Android Developers Blog, Aug 2026](https://android-developers.googleblog.com/2026/08/ensuring-safety-genai-preventing-non-consensual-intimate-content.html)
- Legal analysis: Google does not expressly require AI disclosure in descriptions. Listings must still be accurate, and regional law (the EU AI Act) may require labeling. — [Revera Legal](https://www.revera.legal/?p=3557). Claims about mandatory disclosure and wrapper-app removal in 2026 come from a weakly sourced blog. — [AppsOps](https://appsops.store/news/google-play-ai-content-policy-low-value-apps-2026) (unverified)
- Hobbyist estimate: costs range from about $0.50 to $51 per player depending on model choice (OpenRouter pricing; not studio data). — [search summary; reddit snapshot](https://reddit.sentinel-team.org/posts/1sefk2y/snapshots/2026-04-09T20%3A33%3A34.459213Z)

### Inferences
- Shipping only curated, pre-generated lines probably keeps the game out of Play's "generative AI app" category, so no in-app flagging UI is needed. This should be checked against the current policy text before launch.
- If any runtime generation is added, even on-device, budget for an in-app "segnala" (report) button, input filtering, and adversarial testing records.

### Gaps
- EU AI Act Article 50 transparency obligations (applying from Aug 2026) as they apply to AI-generated game text were not researched.
- No authoritative data on per-player cost for commercial runtime-LLM games.
