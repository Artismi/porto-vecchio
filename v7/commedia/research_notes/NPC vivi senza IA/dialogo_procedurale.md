# Procedural dialogue and text generation from simulation state (no runtime LLM)

> Method note: limited session (about 20 tool calls). Many primary sources blocked fetches (AAAI OJS behind a bot wall, pcgworkshop 403, DF wiki 429, several RimWorld/Prom Week/Emily Short URLs 404). Items under **Cited Findings** come from pages or search results actually seen this session. Items under **Inferences** marked **[BK]** are background knowledge about well-documented systems that I did NOT re-verify this session. The report writer should treat [BK] as "probably right, check before quoting numbers". I have not invented any figures. Where a number is [BK], it is flagged.

---

## 1. RimWorld: RulePacks / grammar, social interactions, tales, art

### Takeaway
RimWorld runs on two text layers. (a) The GrammarResolver/"Formatted" layer fills `{PAWN_subsymbol}` slots in fixed strings, handling articles, pronouns and gender. (b) The RulePack grammar layer (`[symbol]`, `symbol->expansion`) builds play-log lines, tale and art descriptions, and names. Which social interaction fires (chitchat, deep talk, slight, insult, romance) is a weighted random pick. The weights are modulated by opinion, compatibility and traits. The interaction then writes thoughts and opinion changes back into the sim, closing the loop.

### Cited Findings
- The GrammarResolver "customizes text strings based on in-game objects, such as pawns". It is used for backstory descriptions, trait tooltips and many incident and player messages. — [RimWorld Wiki: GrammarResolver](https://rimworldwiki.com/wiki/Modding_Tutorials/GrammarResolver)
- Symbols go in curly braces as `{KEY_subsymbol}`, and "PAWN" is the most common key. Subsymbols for things/defs: `label`, `labelShort`, `definite`, `indefinite`, `labelPlural`, `pronoun`, `possessive`, `objective`, `factionName`, `gender`. Pawn-only subsymbols: `nameDef`, `nameIndef`, `kind`, `kindBase`, `title`, `lifestage`, `humanlike`. Factions: `name`, `pawnSingular`, `pawnsPlural` (with Def/Indef variants). An integer with `ordinal` gives "1st". — [RimWorld Wiki: GrammarResolver](https://rimworldwiki.com/wiki/Modding_Tutorials/GrammarResolver)
- Subsymbols that add an article "will try to obey normal rules of grammar, such as not printing articles in front of proper names in English". Because the resolver is multi-language, some features (PluralIndef, **genders of inanimate objects**) "don't apply to English-language mods". This implies grammatical gender on nouns is supported for other languages. — [RimWorld Wiki: GrammarResolver](https://rimworldwiki.com/wiki/Modding_Tutorials/GrammarResolver) (via search summary)
- There are two invocation paths: `string.Formatted(obj.Named("KEY"))`, and the older `string.AdjustedFor(pawn,"KEY")` used mainly for the battle log. — [RimWorld Wiki: GrammarResolver](https://rimworldwiki.com/wiki/Modding_Tutorials/GrammarResolver)
- `r_logentry` is the root symbol that interaction log entries resolve from. A user error trace shows `r_logentry->[good_opinion]` failing when the sub-symbol is unresolvable. — [Steam discussion](https://steamcommunity.com/workshop/filedetails/discussion/2707586104/600786083350119026)
- Translators handle `rulesStrings` and `rulesFiles` separately from normal DefInjected strings, so localization of grammars is a distinct pipeline. — [Steam mod changelog](https://steamcommunity.com/sharedfiles/filedetails/changelog/2569378701?p=3)
- Selection weights (community wiki, version-dependent): chitchat about 1, deep talk about 0.075. Insult and slight have base weights multiplied by factors for the initiator's opinion of the recipient and their compatibility. The "Abrasive" trait's 2.3x comes from the RandomSelectionWeight of the slight/insult InteractionWorkers. Lower opinion raises insult chance. — [RimWorld Wiki: Social](https://rimworldwiki.com/wiki/Social); [RimWorld Wiki: Opinion](https://rimworldwiki.com/wiki/Opinion)
- An insult has about 4% chance of starting a social fight, a slight about 0.5%. Drunkenness and similar states multiply this. Psychopaths take part in chitchat/deep talk but gain no opinion from them. — [RimWorld Wiki: Opinion](https://rimworldwiki.com/wiki/Opinion); [Hediff](https://mail.rimworldwiki.com/wiki/Hediff); [Social](https://rimworldwiki.com/wiki/Social)
- Search results gave community data only, with no official XML values. Check `Core/Defs/InteractionDefs` for exact numbers. — (search result note; same wiki pages)

### Inferences
- [BK] RulePack syntax: `<rulesStrings><li>r_logentry->[INITIATOR_nameDef] and [RECIPIENT_nameDef] [talkedabout] [TalkTopicLight].</li></rulesStrings>`. Shared vocab lives in `RulePackDef`s (e.g. `GlobalUtility`, `TalkTopics`), which `include` each other. `rulesFiles` point to plain-text word lists under `Languages/<lang>/WordInfo` or `Strings/`. Rules can carry conditions (`[INITIATOR_gender]==Female`), a `p=` weight and tags. Each InteractionDef carries a `logRulesInitiator` / `logRulesRecipient` RulePack and the thought/opinion it applies (`recipientThought`, e.g. "Insulted"). The same play-log entry is rendered from each pawn's perspective. **Verify syntax in the game's Core XML before quoting.**
- [BK] Tales (`TaleDef`: "killed X", "was wounded by", "married") are stored as structured records with participants and date. When an artist creates art, a random tale is picked and run through the art RulePacks: "This sculpture depicts [PAWN] fighting a [ANIMAL]. The figure's expression is [emotion]…". The artifact text therefore embeds actual colony history. Players widely cite this as a "story" generator. No poll data was found.
- Reusable pattern: *weighted interaction choice by relationship → grammar render → state write-back (thought plus opinion delta) → future weights change*. That loop is what makes RimWorld social text feel meaningful even though each line is shallow.

### Gaps
- Exact count of RulePacks/rules in vanilla RimWorld: not found.
- No primary Tynan Sylvester text on the grammar system was fetched this session.

---

## 2. Tracery and similar grammars; limits and fixes

### Takeaway
Tracery (Compton, Kybartas, Mateas, ICIDS 2015) is a JSON context-free grammar with post-expansion modifiers and "actions" that save sub-expansions into variables for coherence. Its known failure modes are repetition, incoherence and no world model. They are usually fixed by (a) saving and reusing variables, (b) tagging and filtering productions against state, (c) expanding from the middle (Ryan's Expressionist), or (d) weighting and deduplication.

### Cited Findings
- Citation: K. Compton, B. Kybartas, M. Mateas, "Tracery: An Author-Focused Generative Text Tool", ICIDS 2015, LNCS 9445, pp. 154–161, DOI 10.1007/978-3-319-27036-4_14. — [TU Delft listing](https://publications.graphics.tudelft.nl/papers/272); [Springer](https://link.springer.com/10.1007/978-3-319-27036-4_14)
- Grammars are JSON objects with simple readable syntax, aimed at novice and expert authors. Stated design considerations are data portability, modular design and additive authoring. — [Springer abstract](https://www.springerprofessional.de/en/tracery-an-author-focused-generative-text-tool/6884562)
- Modifiers are functions applied after expansion for "common hassles of generative text": capitalization, pluralization, a/an and conjugation. — [TU Delft / ICIDS paper listing](https://graphics.tudelft.nl/Publications-new/2015/CKM15)
- Ryan et al.'s Expressionist (Talk of the Town) is a CFG tool where productions carry metadata. Generation does not expand from the top symbol. Instead it targets middle-level symbols whose conditions hold against the current game state. — [AIIDE 2016 abstract](https://ojs.aaai.org/index.php/AIIDE/article/view/12877)

### Inferences
- [BK] Tracery syntax: `"origin":["#hero.capitalize# went to #place#"]`. Actions `[hero:#name#]` push a value onto a symbol stack so that later `#hero#` references stay consistent. This is Tracery's only state mechanism and is the basic anti-incoherence fix. Bots on "Cheap Bots, Done Quick!" (George Buckenham) made Tracery the de facto Twitter-bot language. The paper's count of bots is unverified.
- Known limits: (1) **Repetition**. Uniform random choice from small lists means players notice repeats fast; the "10,000 bowls of oatmeal" problem (Compton's own term) applies. (2) **Incoherence**. There is no world model, so siblings in one sentence may contradict each other. (3) **Agreement**. English modifiers do not solve gender/number agreement in Romance languages.
- Fixes seen across systems: state-aware expansion (Expressionist conditions, RimWorld `==` conditions), tag filtering (Wildermyth aspects, CK3 triggers), recency-based dedup (pick-without-replacement "deck"/"bag" shuffling), weights that decay after use, and precondition-gated "middle-out" generation.
- Related tools worth listing [BK]: Improv (Bruno Dias, tag-filtered grammar used in *Voyageur*), Ink/Inkle (Emily Short-adjacent; "shuffle/cycle/once" sequences), Expressionist/Productionist (Ryan), Kate Compton's later work on "Casual Creators".

### Gaps
- No sourced quantitative study on repetition thresholds (e.g., how many variants per line players need).

---

## 3. Dwarf Fortress: thoughts, memories, languages, legends

### Takeaway
DF renders its sim as text through structured records (historical events, thoughts with emotion plus cause plus target) passed through hand-written phrase templates. Procedural "languages" are word-translation tables over a shared English symbol dictionary. Legends text is a near-literal readout of event records. The fetch of the DF wiki was rate-limited this session, so everything below is [BK].

### Cited Findings
- (Fetch failed: [DF Wiki: Thought](https://dwarffortresswiki.org/index.php/Thought) returned 429.) No verified cited findings this session.
- Caves of Qud's history system explicitly drew on Dwarf Fortress (and Epitaph). — [Caves of Qud summary via search / Wikipedia mirror](https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Caves_of_Qud)

### Inferences
- [BK] Thoughts (since v0.42/0.43 emotion overhaul): each thought = emotion (from a large list, e.g. "annoyance", "bliss", "grouchiness") × circumstance (e.g. "after seeing a corpse", "while admiring a fine Statue") × intensity. The display reads "She felt *satisfaction* at work. She felt *fondness* talking with a friend." Personality facets modulate which emotion a circumstance produces and its strength.
- [BK] Memory: short-term memory slots (about 8) feed long-term slots (about 8). Re-living a strong long-term memory can permanently shift personality facets or values ("…has come to value…"). This is a reusable "memory → personality drift" mechanic that also generates text.
- [BK] Languages: `language_words.txt` holds an English "symbol" dictionary (hundreds to roughly 2,000 words, categorized by symbols like "DEATH", "WATER"). Each civilization's language (dwarven, elven, goblin, human, plus generated ones) maps each word to a generated or authored foreign word. Names are compound pairs ("Urist McAxeslay" = "Urist" + translated compound). Translation in-game shows both forms ("The Fortress of Axes / Ral Bekor").
- [BK] Legends mode is mostly sentence templates per event type ("In 125, X the dwarf slew Y the elf in Z"). The later "art forms" system generates poetic, musical and dance forms as grammar-like descriptions with structured parameters.
- Players love it ("story generator"), but the "player is the narrator" effect (stories mostly happen in players' retellings) is a widely noted critique and is the core of James Ryan's curation argument (see §5).

### Gaps
- Exact counts (thought circumstances, emotions, words) and Tarn Adams GDC quotes unverified.

---

## 4. Caves of Qud: procedural history, sultans, gospels, dialogue

### Takeaway
Qud generates five ancient Sultans per world. Each biography is driven by a state machine plus a replacement grammar. Events are generated first and *rationalized* after the fact, deliberately subverting strict cause and effect to feel mythic. The gospel-like fragments (multiple biased accounts) are found as in-game texts and shrines.

### Cited Findings
- Paper: J. Grinblat and C. B. Bucklew, "Subverting Historical Cause & Effect: Generation of Mythic Biographies in Caves of Qud" (PCG Workshop / FDG 2017). It uses "a state machine and replacement grammar to subvert the logic of cause and effect". The system shipped 23 Dec 2016. — [pcgworkshop.com PDF](https://pcgworkshop.com/archive/grinblat2017subverting.pdf) (abstract via search; full text 403)
- Each game generates historical events and group relationships around **five randomly generated ancient rulers, the Sultans**. History is modeled on "historical accounts such as word of mouth and ancient texts, allowing for bias and conflicting perspectives". Inspirations: Dwarf Fortress and Epitaph. — [Caves of Qud (Wikipedia mirror)](https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Caves_of_Qud)
- GDC 2018 talk: Grinblat, "Procedurally Generating History in Caves of Qud". — [GDC Vault](https://gdcvault.com/play/1025379/Procedurally-Generating-History-in-Caves)
- Follow-up: "End-to-End Procedural Generation in Caves of Qud" (Grinblat and Bucklew), AIIDE 2020 EXAG workshop. — [CEUR-WS Vol-3217](https://ceur-ws.org/Vol-3217/paper12.pdf)
- Qud's in-game graffiti generator "pulls from the corpus of game text, including the help page". Towns are a fixed "static backbone", while dungeons, wilderness and some history and lore are generated each game. — [Game Developer interview](https://www.gamedeveloper.com/design/tapping-into-the-potential-of-procedural-generation-in-caves-of-qud)

### Inferences
- [BK, from Grinblat's talk and paper] The sultan state machine tracks properties (region, profession, cognomen, allies/enemies, domain such as "glass" or "salt"). Event types include born, found a weapon, conquered, married, reformed, betrayed, died. Each event is first sampled, then *rationalized*: a grammar invents a cause that fits the current state ("Because she had been raised by the Mopango, Resheph…"). That deliberate "post-hoc justification" makes the history read as myth rather than ledger.
- [BK] The same event is retold as multiple **"gospels"** with different spins (ally vs. enemy factions). Sultan cults, shrines and engraved items reference these, so the player pieces the story together from distributed fragments. Ryan would call this curation through distribution. In Qud, "gospels" is the term used in the code and wiki for these event texts, but the search tool could not confirm this.
- [BK] Qud NPC dialogue is mostly authored conversation trees for named NPCs, plus procedural village NPCs. Villages are generated with a history fragment, a favored faction, an "immigrant" and a "proselytizer". Their speech comes from templates filled by the village's generated history and Markov-chain "Qud-text" books. The Markov books are trained on the game's own corpus, the same idea as the graffiti.
- Reusable: *generate the fact, then generate the reason*, and *retell one fact through biased narrators*. Both are cheap and produce strong flavor.

### Gaps
- Exact counts of event types/grammar rules not retrieved. The "gospels" naming needs wiki confirmation.

---

## 5. Talk of the Town / Bad News / Hennepin (James Ryan)

### Takeaway
Talk of the Town simulates 140 years of a town's history. NPCs form subjective, fallible beliefs about each other (observation, hearsay, misremembering, lying, forgetting). Dialogue is generated by Expressionist grammars whose productions are tagged with preconditions and effects, so lines both depend on and change belief state. Ryan's thesis argues emergent narrative needs *curation* (story sifting) rather than raw simulation.

### Cited Findings
- "Toward Characters Who Observe, Tell, Misremember, and Lie" (AIIDE workshop): NPCs observe the world, pass knowledge to each other, misremember, forget and lie. It is among the first systems to support character memory fallibility. — [AAAI OJS 12825](https://ojs.aaai.org/index.php/AIIDE/article/view/12825)
- "Characters Who Speak Their Minds: Dialogue Generation in Talk of the Town" (AIIDE 2016, Ryan, Mateas, Wardrip-Fruin): a CFG authoring tool (Expressionist) whose productions carry metadata. Instead of top-down expansion, generation works from middle-level symbols whose conditions are checked against game state. NPCs "form and spread subjective knowledge of the town". — [AAAI OJS 12877](https://ojs.aaai.org/index.php/AIIDE/article/view/12877); [bibtex](https://bibtex.github.io/AIIDE-2016-RyanMW.html)

### Inferences
- [BK] Knowledge model: each character holds a "mental model" per other character, with belief facets (hair color, job, home, relationships). Each facet has an evidence trail (observation, statement, eavesdropping, lie, confabulation, transference). Facets decay, and mutations can swap values (misremembering), so misbeliefs propagate socially.
- [BK] Dialogue: Expressionist tags each production with preconditions ("speaker knows hearer's name", "speaker has belief about subject's job") and effects/"moves" ("ask about X", "introduce self", "lie about Y"). The "Productionist" runtime picks a nonterminal satisfying the current dialogue move, expands with tag-filtered rules, and applies the effects. Lines therefore *transmit* belief facets. The paper reports a grammar capable of producing a very large number of surface lines. The exact figure is unverified; I recall about 8.6 million potential lines but it **must be checked**.
- [BK] *Bad News* (Samuel, Ryan, Summerville, Mateas, Wardrip-Fruin, 2016; IndieCade/Media Lab awards) is a live performance. An actor improvises as townspeople from the simulated town, while a "wizard" feeds the actor sim facts, and the player must find the next of kin of a dead resident. It uses human performance where generated text would fail, a hybrid "curation" design.
- [BK] Ryan's PhD thesis "Curating Simulated Storyworlds" (UCSC, 2018) argues for *curationism*: simulations produce too much undifferentiated material, so systems (or players, or authors) must sift and present stories. Story sifting led later to Felt (Max Kreminski), Winnow and similar sifting-pattern languages. Hennepin (an unfinished ambitious sim of a fictional American town, later Ryan's "Sheldon County" podcast generator) applies this. The fetch of escholarship returned empty.
- Reusable: belief facets with provenance, plus grammar moves that read and write them. "Gossip" then becomes a game mechanic, and misbeliefs give drama for free.

### Gaps
- Thesis contents and numbers were not retrieved (escholarship page empty). The Expressionist generable-line count is unverified.

---

## 6. Versu (Evans and Short): social practices, Praxis, choosing what to say

### Takeaway
Versu models social situations as *social practices* (dinner party, conversation, greeting). Each practice offers role-specific actions to characters, who pick by utility over their desires. Praxis is the exclusion-logic language underneath it. Text comes from authored, parameterized action strings. No source on this was fetched this session, so the section is [BK] except the citation below.

### Cited Findings
- Evans, "Computer Models of Social Practices" (PT-AI 2013), takes a *constitutive* view: social practices constitute the available actions, as opposed to a regulative model in which the agent "starts with a given set of goals, and a given set of actions". — [PhilArchive EVACMO](https://philarchive.org/archive/EVACMO)

### Inferences
- [BK] Exclusion logic (Evans): a database of paths like `brown.relationship.lucy!enemy`, where `!` marks an exclusive slot (setting a new value removes the old). It gives cheap, consistent state updates. Praxis is the language built on it. Practices are concurrent "processes" that propose actions with preconditions and effects. Each agent evaluates proposed actions with utility-based desire weights ("wants to impress X", "dislikes Y") and picks one per turn. The player picks from the same action menu.
- [BK] Text: each action carries a short authored English template with slots ("[X] compliments [Y] on [Y.pos] dress"). Characters' "moods" and attitudes alter which actions are available and preferred. Emily Short wrote extensively about authoring cost. Versu shipped on iOS (2013, Linden Lab) with stories like *Blood & Laurels*, then was discontinued when Linden dropped it (2014).
- Lesson: practices are a strong unit for limiting what's relevant to say ("what could anyone say at this dinner right now?"), which shrinks the authoring space.

### Gaps
- Emily Short blog posts on Versu content creation returned 404. The original Evans and Short IEEE TCIAIG 2014 paper "Versu—A Simulationist Storytelling System" was not fetched.

---

## 7. Comme il Faut / Prom Week / Ensemble

### Takeaway
Prom Week (2012) uses Comme il Faut (CiF). Characters compute *volitions* (desire to do each *social exchange* toward each other character) from thousands of weighted "microtheory"/influence rules over traits, statuses, relationships and social-history facts. Each exchange has *instantiations*: authored dialogue scripts with slot fillers and conditions, chosen by context. Ensemble (2015+) is the open JS successor.

### Cited Findings
- Prom Week is a UCSC social simulation built on the social AI system Comme il Faut. — [Prom Week wiki page (UiB mirror)](https://wbs.cdn.uib.no/wiki/Prom_Week)

### Inferences
- [BK] Mechanics: social state = traits, statuses (e.g. "embarrassed", "dating"), networks (friendship/romance/coolness, 0–100), and the Social Facts Database (a history of past exchanges, labelled e.g. "mean", "cool"). Influence rules (`if A is jealous of B and B dated C → +5 to A's desire to "backstab" B`) sum into volitions. The player picks a character and exchange. The exchange's outcome (accept/reject) is computed, and an *instantiation* (authored multi-line script with `%x%`, `%y%` slots and SFDB references such as "remember when you %SFDBlabel%?") renders it. Lines reference *past* events, so they feel personal.
- [BK] Scale (check before citing): Prom Week is often reported as about 18 characters, about 39 social exchanges and roughly 5,000 social considerations/rules, plus thousands of authored instantiation lines. It won the IGF Nuovo honorable mention / IndieCade awards around 2012. Search did not confirm these numbers.
- Reusable: *intent-first, line-second*. The sim decides "Doug wants to apologize to Zack", then picks among authored performances of "apologize" whose preconditions match. That gives authored quality with simulated motivation.

### Gaps
- FDG/AIIDE Prom Week papers (McCoy et al. 2012–2014) not fetched. Rule and instantiation counts are unverified.

---

## 8. Other shipped games

### Takeaway
Shipped commercial games mostly use **tag- and trigger-gated authored lines with slots**, not grammars. Wildermyth uses roles, aspects and personality-gated variant text inside comic events. CK3 uses scripted localization (`[CHARACTER.GetHerHis]`, `Custom('...')`) plus triggers. The Sims sidesteps text entirely with Simlish plus icon bubbles. The others are [BK].

### Cited Findings
- Wildermyth: dialogue inserts roles via tags such as `<hero>` ("My name is <hero>" → "My name is Martol") or `volunteer.name`. Roles pick targets for comics and dialogue and are distinct from stats and aspects. — [Wildermyth wiki: Modding variant text](https://wildermyth.com/wiki/Modding_variant_text); [Modding intermediate FAQ](https://wildermyth.com/wiki/Modding_intermediate_FAQ)
- Wildermyth: "Aspects are the workhorse of the dynamic content". Some aspects are parameterized via find/replace. Targets can require or forbid aspects. An `npcId` lets a generated NPC recur in later events. — [Wildermyth wiki: Aspect](https://www.wildermyth.com/wiki/Aspect); [Targets and Scoring Guide](https://www.wildermyth.com/wiki/Targets_and_Scoring_Guide)
- Wildermyth Writer's Guide: hero history seeds "Hooks", which are "just aspects with a special naming convention". "History lines cannot be queried, but can apply aspects, which can be queried". Personality stats are "a great way to make characters come alive". The tone/voice section asks openly "How many personality-specific lines should there be?" — [Wildermyth Writer's Guide](https://www.wildermyth.com/wiki/Writer%27s_Guide)
- CK3: flavorization files (`common/flavorization`) must define gender, and the spouse gets the opposite. Custom getters live in `common/customizable_localization` and are called as `CHARACTER.Custom('...')`. A German mod example uses `Select_CString(TARGET_CHARACTER.IsLocalPlayer, 'yours', TARGET_CHARACTER.GetHerHis)`. — [Paradox forum flavorization guide](https://forum.paradoxplaza.com/forum/threads/flavorization-and-localization-guide.1449550/post-27184573); [Steam CK3 discussion](https://steamcommunity.com/workshop/filedetails/discussion/2829009590/4842023530173599755)
- A CK3 German localization bug report concerns "rival m/f" (gendered noun forms), evidence that gender agreement is a real pain point for Paradox localization. — [Paradox bug forum](https://admin-forum.paradoxplaza.com/forum/threads/ck-iii-german-localisation-bug-rival-m-f.1464080)

### Inferences
- [BK] Wildermyth gender/personality syntax in comic text is like `<hero.mf:he/she>` and `<hero.personality...>` split variants. I could not confirm the exact token form this session; the Comic Editor Reference wiki page is the place to check. Players consistently praise Wildermyth for making procedural heroes feel authored: authored events, generated cast, personality-variant lines.
- [BK] The Sims: Simlish (voiced gibberish) plus thought/speech bubbles with icons of topics. Players read meaning into it, it's free to localize, and it never repeats "wrong" words. This is the strongest "avoid text" precedent.
- [BK] Watch Dogs: Legion: every recruitable NPC is generated. Lines were recorded by many actors and then pitch/timbre-shifted to create more voice "personas". Each persona has a full set of generic mission barks. Players criticized flat, generic characterization versus authored protagonists.
- [BK] Shadows of Doubt: citizens have jobs, schedules, relationships and addresses. Conversation is a limited menu (ask about a person or photo, ask for directions) answered by templated lines filled from the sim. Characters' knowledge of others is the gameplay. Lines are noticeably repetitive.
- [BK] Middle-earth: Shadow of Mordor/War Nemesis: orc captains have traits, history and memories (scars, prior defeats). Lines are *recorded* barks for many conditions ("You ran from me!" / burned / killed before / betrayal), chosen by encounter-history tags, with large voice budgets per orc voice type. Proof that *voiced* recorded combinatorial barks plus memory tags feel authored.

### Gaps
- No sourced numbers for Nemesis or WD:L voice line counts, or for Shadows of Doubt dialogue templates.

---

## 9. Techniques to make generated lines feel authored; non-English/Italian gender agreement

### Takeaway
What works across systems: (1) decide intent from sim state, then choose among authored performances; (2) slot-fill from **memory** (shared past events, Prom Week SFDB, RimWorld tales); (3) persona lexicons/voice tags per character; (4) dedup via recency and bags; (5) tag-gated middle-out expansion. Gendered languages need the slot-filler to carry gender, number and article data, as RimWorld's resolver and CK3's getters do, plus translator-side conditionals.

### Cited Findings
- RimWorld's resolver supports genders of inanimate objects and plural-indefinite for non-English languages, with article handling built into subsymbols (`definite`, `indefinite`). — [RimWorld Wiki: GrammarResolver](https://rimworldwiki.com/wiki/Modding_Tutorials/GrammarResolver)
- CK3 exposes pronoun getters (`GetHerHis`) and conditional string selection (`Select_CString`) to localizers, and gender is mandatory on flavor titles. — [Paradox forum](https://forum.paradoxplaza.com/forum/threads/flavorization-and-localization-guide.1449550/post-27184573); [Steam](https://steamcommunity.com/workshop/filedetails/discussion/2829009590/4842023530173599755)
- Tracery addresses English morphology (a/an, plural, capitalization) via modifiers, which shows morphology is handled post-expansion. — [ICIDS 2015 listing](https://graphics.tudelft.nl/Publications-new/2015/CKM15)
- Expressionist: tag-and-condition-gated production choice from mid-level symbols. — [AIIDE 2016](https://ojs.aaai.org/index.php/AIIDE/article/view/12877)

### Inferences
- For **Italian**, every noun slot needs `{gender: m|f, number: s|p, startsWith: vowel|s+cons|z|gn|ps|x|y}`. This drives the article (il/lo/l'/la/i/gli/le; un/uno/una/un'), articulated prepositions (del/dello/della/dell'/dei/degli/delle) and adjective endings (-o/-a/-i/-e; -e/-i invariable class). A CFG cannot do this with string concat. Use (a) feature-carrying symbols (each word entry stores gender, number and its forms), (b) agreement modifiers like `#oggetto.art#`, `#agg.agree(oggetto)#`, and (c) let translators write gender-split rules (RimWorld-style conditions `[PAWN_gender]==Female`).
- Elision ("l'amico", "un'amica") and the "lo/gli" class are the most common bugs. Precompute article forms in the lexicon instead of rule-deriving them.
- Speaker and addressee gender also matter for 1st/2nd-person past participles ("sono stata", "sei stanco/stanca"). Pass speaker and listener gender into every line, not only the subject.
- Recommended authoring scale heuristics (inference, not sourced): per frequent intent, about 5–10 authored variants × 2–3 persona registers × memory-slot optional clauses. Use bag-shuffle dedup with a recency window, and prefer lines that cite a specific remembered fact over generic flavor.

### Gaps
- No primary source found on Italian-specific game localization of procedural grammars. Agreement advice above is linguistic inference.
