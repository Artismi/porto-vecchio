# Research frontier: under-explored ideas for a "never seen before" NPC/town system (offline JS, phones, hundreds of NPCs, Italian text, no runtime LLM)

Method note: about 16 tool calls. Several PDFs were blocked (AAAI OJS Anubis bot wall, Southampton 403), so some findings rest on abstracts or search snippets; these are marked. Anything from my background knowledge that I could not re-verify in this session is labelled **[unverified]** and kept out of Cited Findings.

## 1. Sifting-driven drama management (detect half-finished emergent stories, nudge them to completion) and narrative planning

### Takeaway
"Sifter + drama manager" has been prototyped since 2021 (Winnow's partial matches, Awash 2023, Shepherd 2024), but only as short papers and demos. Nobody has shipped it at scale, and the evidence that any sifting heuristic reliably picks "better" stories is mixed: StU showed 84% agreement with only 3 raters, and the FDG 2026 Chroniqueur study was inconclusive. On phones this is the most feasible frontier idea, because incremental pattern matching over an event log is cheap.

### Cited Findings
- Winnow (Kreminski, Dickinson, Mateas, AIIDE 2021) is a DSL for **incremental** story sifting. It can sift while the simulation is live and identify the *beginnings* of event sequences not yet completed. Winnow patterns compile down to Felt patterns. Open source in JS. — [AIIDE](https://ojs.aaai.org/index.php/AIIDE/article/view/18903); [GitHub mkremins/winnow](https://github.com/mkremins/winnow)
- Felt, the earlier declarative sifter, and Synthesifter, which synthesizes sifting patterns from example event sequences via inductive logic programming. — [Felt](https://mkremins.github.io/publications/Felt_SimpleStorySifter); summary in search results for [Winnow](https://doi.org/10.1609/aiide.v17i1.18903)
- **Shepherd** (Sage Deo, Jonathan Chung, Joshua McCoy, UC Davis; AIIDE 2024, vol. 20, pp. 256–259) is "a drama manager powered by incremental story sifting" that guides otherwise autonomous characters toward narratively interesting choices. Its abstract claims that guiding a simulation through sifting without human intervention had not been explored before. It is a 4-page short paper; I could not read the results (bot wall). — [AIIDE](https://ojs.aaai.org/index.php/AIIDE/article/view/31887)
- **Awash** (Clothier and Millard, Southampton, 2023) proposes "prospective story sifting": an incremental sifter identifies possible stories during play and a drama manager intervenes to make them more likely. Abstract only. — [Southampton eprints](https://eprints.soton.ac.uk/482864/)
- **Select the Unexpected (StU)** (Kreminski et al., ICIDS 2022) is a generic sifting heuristic that ranks pattern matches by statistical unlikelihood of their events. Across three raters, raters agreed with the heuristic on 38 of 45 pairs (84.44%). The authors call this "somewhat tentative" because there were only 3 raters, and some patterns produced very few matches (12–13). They also found the heuristic "substantially improves the leverage of more abstract sifting patterns". — [StU PDF](https://mkremins.github.io/publications/StU_ICIDS2022.pdf)
- **Narrative Gold Digging** (Lessard, Friedrich, Paré-Chouinard, Kosseim; FDG 2026). Chroniqueur is a 2020–2024 neolithic social simulation that generates hundreds of years of history with causal bookkeeping.
  - They found a "means of living" simulation "did not consistently lead to narratively rich events (in fact, rarely!)", so they added Polti-style "dramatic situations" (e.g. "An enemy loved": a Fall in Love event toward a member of an enemy clan).
  - They implemented Schmid's eventfulness criteria. Improbability was modeled as Markov chains over causal event chains. Irreversibility could not be computed generically. "High effect" heuristics kept returning the same event class (clan migrations).
  - User study: 6 sifted stories, each rendered by a human writer and by an LLM, rated by 24 participants. The heuristics made no significant difference ("inconclusive"). The authors conclude that the "narrative effect" (good narrativization) can compensate for poor story material.
  - Source: [PCG workshop archive PDF](https://www.pcgworkshop.com/archive/lessard2026narrative.pdf); [author page](https://www.jonathanlessard.net/?p=357)
- Méndez and Gervás:
  - "Evolutionary Story Sifting over the Log of a Social Simulation" (WIVACE 2023). — [UCM record](https://produccioncientifica.ucm.es/documentos/6633a6b63eb1a152cbc0e116?lang=gl)
  - "Heating up Interactions in an Agent-Based Simulation to Ensure Narrative Interest" (ICAART 2025) tunes agent affinity and romantic drives so that logs score "much higher" on narrative-interest metrics. — [SciTePress](https://scitepress.org/PublishedPapers/2025/133088)
  - Lessard et al. say the evolutionary approach would not scale to Chroniqueur's event space. — [Lessard 2026](https://www.pcgworkshop.com/archive/lessard2026narrative.pdf)
  - Méndez and Gervás's earlier attempt to sift with ChatGPT could only process small numbers of events, and the authors were not convinced by it. — [Lessard 2026](https://www.pcgworkshop.com/archive/lessard2026narrative.pdf)
- Kreminski's CV lists an I3D 2026 paper, "An Authoring Framework for LLM-Based Drama Managers" (title only). The frontier is moving toward LLMs, which this game cannot use at runtime. — [Kreminski CV](https://mkremins.github.io/cv)
- **Sabre** (Ware and Siler, AIIDE 2021, best paper nominee) is a forward-chaining, state-space heuristic narrative planner.
  - Every action must make sense under the acting agent's own intentions and limited, possibly wrong beliefs, while the author goal is still achieved.
  - Theory-of-mind nesting has no fixed depth limit.
  - Follow-ups: salience as step cost (2022), causal necessity as step cost (AIIDE 2023), a benchmark collection (2023).
  - Sources: [Sabre project](https://www.cs.uky.edu/~sgware/projects/sabre); [AIIDE paper](https://ojs.aaai.org/index.php/AIIDE/article/view/18896)

### Inferences
- The concrete recipe for "Porto Vecchio":
  - Hand-author a few dozen Winnow/Felt-style patterns in Italian narrative terms (e.g. "debito non pagato → umiliazione pubblica → ?vendetta"). Partial matches mark "loose ends".
  - The director biases NPC utility scores, or schedules a coincidence (encounter, rumour reaching the right ear), to complete them.
  - This is O(patterns × recent events) per tick, which is cheap in JS. It is essentially what Shepherd and Awash propose, but nobody has shipped it in a commercial game.
- Chroniqueur's negative result is a warning. Pure "sim of living" rarely produces stories, so authored "dramatic situation" hooks are needed, and presentation (narrativization in good Italian prose templates) may matter more than sifting cleverness.
- Full Sabre-style planning (state-space search with nested beliefs) is likely too expensive for hundreds of NPCs on a phone at runtime. A feasible variant is to run tiny planning problems (3–5 characters, short horizon) only for the one or two stories the director is actively completing, or to precompute plans offline as authored "story schemas". **[my judgement, not measured]**
- I could not re-verify CPOCL (Ware and Young, conflict planning) or Riedl and Young's IPOCL (intentional planning) this session. From background knowledge **[unverified]**: CPOCL lets plans contain *failed* character plans to represent conflict. That is useful conceptually: the director can let NPC plans fail visibly, which reads as drama.

### Gaps
- Shepherd's and Awash's evaluation results are unknown (full texts blocked).
- I found no shipped commercial game with an explicit sifting-driven director.
- Performance numbers for Winnow on large logs were not found.

## 2. Player-taught language and concepts

### Takeaway
There is a long lineage of NPCs that learn from player feedback or language (Black & White's creature, Talk of the Town dialogue, Imaginarium's controlled-English ontologies), but working, shipped designs are rare. The proven offline approach is *controlled natural language*, not open parsing. Without an LLM, the pitfall is coverage: players type things the grammar does not know.

### Cited Findings
- Black & White (Lionhead, 2001): Richard Evans's creature AI combined perceptron training and decision-tree learning. — [Richard Evans bio (wiki mirror)](https://ipfs.aleph.im/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/Richard_Evans_(AI_researcher).html)
- A GDC 2005 tutorial summary says the creature recorded the player's reaction after each action and induced decision trees to predict the player's reaction. — [Game Developer, GDC 2005 ML tutorial](https://gamedeveloper.com/programming/postcard-from-gdc-2005-tutorial---machine-learning)
- Secondary sources on the postmortem were low quality and could not be verified. — [TrustMeBro mirror of Eurogamer retrospective](https://trustmebro-3rx.pages.dev/posts/black-amp-white-at-25-how-lionhead-s-hairbrained-s)
- Imaginarium (Horswill; EXAG 2019, AIIDE 2020):
  - Users define ontologies in an English-like controlled language, which compiles to SMT and is solved to generate entities.
  - It was influenced by Inform 7 and casual creators.
  - The author notes that "Imaginarium interactions are not true natural language".
  - Sources: [AIIDE 2020](https://ojs.aaai.org/index.php/AIIDE/article/view/7411); [EXAG 2019 PDF](https://ianhorswill.github.io/Papers/EXAG-19-Imaginarium.pdf); [project page](https://ianhorswill.github.io/DPGD/Imaginarium.html)
- 2025 work on generating game behaviours from natural language now uses LLMs ("Real-Time World Crafting"). The academic frontier has moved to runtime LLMs. — [arXiv 2510.16952](https://arxiv.org/html/2510.16952v1)

### Inferences
- A phone-feasible design: the player teaches *words or epithets* (nicknames, insults, names for places or events) through a structured "explain" UI (pick referent + pick category), not free parsing.
  - NPCs store the term as a meme (see §3), and it spreads through gossip.
  - This combines Imaginarium-style controlled language with Black & White-style reward feedback: NPCs adopt or drop a term according to the social reward they receive when using it.
- Black & White's known lesson is that learning was opaque and hard to steer. This is the legibility problem, also reported for the creature. The point comes from Evans's interview remarks in secondary sources, which are only summarized.
- Italian adds a cost: gender and number agreement for taught words. Ask the player for gender, or offer only invariant forms (nicknames as proper nouns).
- Not verified this session (all **[unverified]**, background knowledge only):
  - Event[0]: a typed-chat robot using keyword-based dialogue, praised for illusion but brittle.
  - Hey Robot: a party game where players guess words to make a smart speaker say them.
  - MKULTRA (Horswill): Prolog-based belief injection, where the player inserts beliefs into NPCs' heads.
  - SHRDLU (Winograd, 1970): a blocks world that could learn new definitions ("a steeple is...").
  - MKULTRA is the most direct precedent for "teach NPCs concepts" and is worth checking in Horswill's papers.

### Gaps
- No primary source fetched for the Black & White postmortem, MKULTRA, Event[0] or Hey Robot.
- No evaluation of player-taught vocabulary spreading in a population.

## 3. Emergent culture inside a game (memes, slang, traditions, rituals, naming)

### Takeaway
Shipped games mostly **generate culture top-down and rationalize it** (Caves of Qud) or hybridize it by rule (Crusader Kings). Genuine bottom-up cultural evolution among agents (memes spreading, mutating and being selected) remains largely a research-sim idea not adopted in games. That is an open niche, and cheap to simulate.

### Cited Findings
- Caves of Qud sultan histories (Grinblat and Bucklew, FDG/PCG 2017):
  - The system decides that an event occurs, then *rationalizes a cause after the fact* from entity state, using a state machine plus replacement grammar.
  - There are 5 sultans across 5 periods. Each event has a "gospel" account plus a tomb inscription written in a different tone.
  - Sources: [PCG workshop PDF](https://pcgworkshop.com/archive/grinblat2017subverting.pdf); [Qud wiki](https://wiki.cavesofqud.com/wiki/Sultan_history); [GDC 2018 talk summary](https://gamedeveloper.com/design/video-procedurally-generating-history-in-i-caves-of-qud-i-)

### Inferences
- The Qud "event first, cause rationalized after" trick, plus multiple tonal accounts of the same event, transfers directly to an Italian town: a festival or patron-saint legend whose official version (lapide, parish chronicle) differs in tone from gossip.
- A feasible bottom-up design:
  - Treat each cultural item (nickname, saying, recipe variant, festival custom) as a small record {form, referent, origin event, adopters}.
  - Spread it over the social graph with conformity and prestige bias, and mutate the form with small template edits.
  - The festival or ritual is then *crystallized* by the director when adoption crosses a threshold, e.g. "da tre anni, il giorno della tempesta si accendono lumi al molo".
  - This is cheap: a few hundred NPCs × a few dozen memes. **[my design inference]**
- Not verified this session (**[unverified]**):
  - Dwarf Fortress procedurally generates poetic forms, musical forms and dance forms per civilization (added ~2014).
  - Crusader Kings III (2020) has culture hybridization and divergence, which the player triggers.
  - Neither runs bottom-up spread among individual agents.

### Gaps
- I did not find (searches not attempted for budget reasons) papers on agent-based slang or meme evolution applied to games. The cultural-evolution literature (e.g. Boyd and Richerson style transmission biases) is the likely source.
- No evidence collected on whether players notice or value emergent sayings.

## 4. Rashomon / subjective memory, lying, gossip distortion, unreliable testimony

### Takeaway
The core NPC-knowledge model (observe → tell → misremember → lie, with confidence values) was built in Talk of the Town (2015–2016) and never adopted commercially. The deduction games that shipped (Obra Dinn, Golden Idol, Her Story) use authored ground truth, not simulated testimony. Combining a simulated belief model with a deduction UI is an open, feasible direction.

### Cited Findings
- "Toward Characters Who Observe, Tell, Misremember, and Lie" (Ryan, Summerville, Mateas, Wardrip-Fruin; AIIDE 2015 workshop/EXAG, vol. 11):
  - NPCs form knowledge by observation and hearsay, pass it on, misremember or forget it, and lie.
  - Later descriptions mention knowledge propagation *and mutation* with confidence values.
  - One index lists the year as 2021, but this is likely a re-indexing date; vol. 11 corresponds to 2015.
  - Sources: [AIIDE OJS](https://ojs.aaai.org/index.php/AIIDE/article/view/12825); [PDF](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- "Characters Who Speak Their Minds: Dialogue Generation in Talk of the Town" (AIIDE 2016) generates dialogue from that knowledge model, fully implemented in Talk of the Town. — [AIIDE OJS](https://ojs.aaai.org/index.php/AIIDE/article/view/12877)
- Sabre models agents' limited and *possibly wrong* beliefs with arbitrary theory-of-mind depth, so planners can build stories around false belief. — [Sabre project](https://www.cs.uky.edu/~sgware/projects/sabre)

### Inferences
- Phone-feasible model: each NPC holds a small set of belief records about salient facts, as {subject, predicate, value, source NPC, confidence, timestamp}.
  - Gossip copies a record with a confidence decay and occasional mutation (wrong person, exaggerated amount).
  - Lies are deliberate value substitutions driven by self-interest.
  - Limiting beliefs to *sifted* salient events (from §1), not all events, keeps memory bounded for hundreds of NPCs.
- Presentation of conflicting accounts can borrow from shipped deduction games.
  - Golden Idol and Obra Dinn use structured fill-in-the-blank deduction checked against ground truth.
  - Here the ground truth is the simulation log, and the player reconciles testimonies ("Pina dice che fu Tonio, ma l'ha saputo dal barbiere").
  - Obra Dinn verifying solutions in batches of three is a known anti-guessing device **[unverified]**.
- The design risk is legibility. The player must be able to trace *why* testimonies differ, so each claim should show its source chain ("l'ha sentito da...").

### Gaps
- I did not obtain Talk of the Town playtest results; the game was never broadly released as far as I know **[unverified]**.
- Shadows of Doubt's evidence system was not researched this session.

## 5. Mixed-initiative "simulation as co-author" and recap/newspaper generation

### Takeaway
Kreminski's line (Why Are We Like This? 2020 → Loose Ends 2022) shows player + simulation co-writing works in prototypes with tiny evaluations (preliminary playtests; 5 experts). The main reported problem is "directionlessness", which Loose Ends addressed with explicit storytelling goals. Narrativization quality may matter more than selection (Lessard 2026).

### Cited Findings
- Why Are We Like This? (Kreminski, Dickinson, Mateas, Wardrip-Fruin; FDG 2020) is a co-creative storytelling game in which two players build a transcript by selecting and editing actions in an ongoing simulation. Only preliminary playtesting is reported. — [FDG 2020 PDF](https://mkremins.github.io/publications/WAWLT_FDG2020.pdf); [exhibit page](https://projects.cah.ucf.edu/mediaartsexhibits/uncontinuity/Dickinson/dickinson.html)
- Loose Ends (Kreminski, Dickinson, Wardrip-Fruin, Mateas; AIIDE 2022):
  - It provides computational support for "managing multiple parallel plot threads and bringing these threads to satisfying conclusions".
  - Goals can be parametrized by characters and constraints, and the AI suggests new goals consistent with the story.
  - A preliminary expert evaluation suggested it creates a sense of co-authorship and mitigates "directionlessness reported by players of earlier systems".
  - Open source, with a browser build.
  - Sources: [AIIDE](https://ojs.aaai.org/index.php/AIIDE/article/view/21955); [ICIDS demo](https://mkremins.github.io/publications/LooseEnds_ICIDS2022.pdf); [GitHub](https://github.com/ItsProbablyFine/LooseEnds/releases/latest)
- Later work (Kreminski and Chung, 2024) notes that Loose Ends still "stops short of explicitly asking users open-ended questions about their intent". — [CEUR paper](https://ceur-ws.org/Vol-3660/paper6.pdf)
- Chroniqueur rendered sifted chains as short stories by a human or an LLM. Readers' appreciation depended heavily on narrativization ("narrative effect"). — [Lessard 2026](https://www.pcgworkshop.com/archive/lessard2026narrative.pdf)

### Inferences
- For this game:
  - Give the player a "taccuino" of loose ends surfaced by the sifter, where the player marks the threads they care about. The director then prioritizes those (player intent as a drama-manager input, Loose Ends style), with no LLM needed.
  - Generate a weekly "gazzetta del porto" or a parish chronicle from the top-ranked sifted stories, using handwritten Italian templates per pattern (one template family per pattern rather than generic event templates). That is the practical answer to the "narrative effect" finding.
  - Multiple voices (gazzetta vs. osteria gossip vs. diario of an NPC) reuse the Qud multi-tone idea.

### Gaps
- Not found this session: Blabrecs and "Wreck Your Heart" details, and evaluations of procedural newspapers in shipped games (Dwarf Fortress legends, RimWorld-style tales).

## 6. Cheap learned / neurosymbolic components and interestingness metrics

### Takeaway
The feasible offline levers are statistical "unexpectedness" scoring (StU, Markov improbability), evolutionary tuning of agent parameters for narrative-interest metrics (Méndez and Gervás 2025), and offline-learned decision tables (the Black & White decision-tree lineage). All are cheap at runtime. But human validation of these metrics is weak (3 raters; 24 raters, inconclusive).

### Cited Findings
- StU: event-type frequency statistics rank microstories by unlikelihood, with 84.44% agreement with 3 raters. — [StU](https://mkremins.github.io/publications/StU_ICIDS2022.pdf)
- Chroniqueur: Markov-chain improbability over causal chains. "High effect" metrics collapse onto one event class. — [Lessard 2026](https://www.pcgworkshop.com/archive/lessard2026narrative.pdf)
- "Heating up Interactions" (ICAART 2025): tuning affinity-driven agents yields much higher narrative-interest metric scores (an offline parameter-tuning approach). — [SciTePress](https://scitepress.org/PublishedPapers/2025/133088)
- Black & White: decision-tree induction on action/reaction pairs at runtime. — [Game Developer](https://gamedeveloper.com/programming/postcard-from-gdc-2005-tutorial---machine-learning)

### Inferences
- The pipeline that is feasible on phones:
  - (a) Offline, run thousands of headless simulations in Node.
  - (b) Score logs with StU-style surprise, plus diversity of matched patterns, plus number of completed loose ends.
  - (c) Evolve NPC personality distributions and event weights (CMA-ES or a simple GA) to maximize the score.
  - (d) Ship only the tuned constants.
  - Optionally distil LLM judgements offline: have an LLM rate thousands of sifted stories in Italian during development, then fit a tiny logistic model or lookup table over pattern features to ship. Nothing runs on device.
  - This is my design inference; no source tested LLM-distilled sifting heuristics.
- Novelty search and Bayesian surprise were not verified for this domain this session. StU is effectively a frequency-based surprise metric, so it is the closest validated proxy.
- Pitfall from Chroniqueur: any single metric gets Goodharted into one event type, so add a diversity penalty, e.g. down-weight pattern types already narrated recently.

### Gaps
- No source found on distilling LLM judgements into shipped tables for NPC behaviour.
- No runtime cost numbers for any of the above.

## 7. Open problems named by researchers and promising answers

### Takeaway
The recurring named problems are:
- **Story material is rare**: pure social sims rarely produce tellable stories.
- **Sifting heuristics lack validation**.
- **Authorial burden**: many hand-specified patterns are needed.
- **Narrativization/legibility**: raw logs need "significant mental work" to read as story.
- **Directionlessness** in co-creative play.

Promising answers are authored dramatic situations, generic heuristics plus abstract patterns, pattern synthesis from examples, incremental drama management, and explicit player-set goals.

### Cited Findings
- Story material is rare: Chroniqueur's "means of living" sim rarely produced narratively rich events, so authored Polti situations were added. — [Lessard 2026](https://www.pcgworkshop.com/archive/lessard2026narrative.pdf)
- Ryan's 2018 "overgenerate and curate" proposal was "mostly theoretical, and the technicalities of its actualization were left for future research". — [Lessard 2026](https://www.pcgworkshop.com/archive/lessard2026narrative.pdf)
- Authorial burden: current sifting "rel[ies] on large numbers of hand-specified story sifting patterns". StU is an attempt to reduce this. — [StU](https://mkremins.github.io/publications/StU_ICIDS2022.pdf)
- Synthesifter synthesizes patterns from examples. — [Felt/Winnow publications](https://mkremins.github.io/publications/Felt_SimpleStorySifter)
- Legibility: StU's surfaced matches were "in a bare-bones text format that required significant mental work to interpret as a story". — [StU](https://mkremins.github.io/publications/StU_ICIDS2022.pdf)
- Directionlessness in earlier co-creative systems, mitigated by Loose Ends' goals. — [Loose Ends](https://ojs.aaai.org/index.php/AIIDE/article/view/21955)
- Eliciting player intent remains open. — [Kreminski and Chung 2024](https://ceur-ws.org/Vol-3660/paper6.pdf)
- Each simulation's specificity makes sifting results hard to generalize, so experiments across many worlds are needed. — [Lessard 2026](https://www.pcgworkshop.com/archive/lessard2026narrative.pdf)

### Inferences
- "Narrative paradox" (player freedom vs. authored structure) is the classic framing (Aylett, Louchart) **[unverified this session]**. The sifting-director approach sidesteps it because the player never loses agency; the director only biases autonomous NPCs.
- The strongest "never seen before" combination is a sifter-driven director plus a bounded subjective-belief and gossip model plus bottom-up cultural memes plus multi-voice Italian narrativization. Each piece exists in research prototypes, none has been combined or shipped, and all are cheap enough for a JS phone game if beliefs and memes are restricted to sifted salient events. **[synthesis judgement]**

### Gaps
- No primary source fetched defining "authorial burden" or "narrative paradox" as named terms.
- I did not search for open-problem surveys from 2024–2026 (e.g. ICIDS position papers).
