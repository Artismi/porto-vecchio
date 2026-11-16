# Academic social simulation and emergent-narrative systems, checked against primary sources (2010–2026)

Scope: Comme il Faut / Prom Week / Ensemble, Talk of the Town and its successors, Versu, Dwarf Fortress, and newer symbolic systems (2019–2026). It also covers Generative Agents and which of its parts could run as rules without an LLM.

Target: an offline JavaScript city game on phones, with hundreds of NPCs and Italian text.

Method: most claims come from the full text of the papers, downloaded as PDFs and searched; quotes and numbers are taken from that text. Claims that rest only on search snippets or secondary sources are marked **[secondary]** or **[unverified]**.

---

## 1. Comme il Faut (CiF), Prom Week, Ensemble, and Ensemble with Social Practices (ESP)

### Takeaway
CiF is a norms-based rule engine with very little per-character state.
- **State:** traits, statuses, relationships and social networks, plus a social history database (SFDB) and a cultural knowledge base (CKB).
- **Decisions:** characters choose by "volition formation", which sums the weights of every true influence rule for each character pair and each intent.
- **Text:** hand-written dialogue templates ("instantiations") with tokens that look up history.

Prom Week had 18 characters and over 5,000 rules. Its own authors later suspected that this large schema hurt authoring and playability. Their 2025 successor, *Slice of Life*, deliberately uses fewer than 200 rules.

Ensemble is the open-source JavaScript version, BSD-4-clause licensed, with every domain written in JSON. It can be used almost as-is in a browser or phone game.

### Cited findings

**Architecture and state (CiF, IEEE TCIAIG 2014, McCoy, Treanor, Samuel, Reed, Mateas, Wardrip-Fruin)**
- Character representation is "thin" on purpose: "What makes characters rich and unique is their relational situation in the social world and their interconnected history." — [McCoy et al. 2014, "Social Story Worlds With Comme il Faut", IEEE TCIAIG 6(2):97–112](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)
- Each character has four kinds of property: traits, statuses, relationships and social networks.
  - Traits are permanent yes/no properties; statuses are temporary ones.
  - Statuses "expire when the conditions that triggered them no longer hold". They can be directional, e.g. "angry at" or "infatuated with" another character.
  - Personality traits never change, because the system targets short-form stories. — [McCoy et al. 2014](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)
- **Relationships** are yes/no, non-exclusive (several rivals are allowed) and non-restrictive (a housemate can also be a rival).
- **Social networks** are scalar values between two characters and can be asymmetric. The paper's example: respect 30 in one direction, 85 in the other. — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)
- **Cultural knowledge base (CKB):** a list of cultural items and the ways characters relate to them ("loves", "hates", "has").
  - Each item can carry one adjective that everyone agrees on. Example: Mondays are "boring", yet Jon can still "love Mondays".
  - The paper's example is Garfield: "hates Mondays", "loves lasagna". — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)
- **Social facts database (SFDB):** a record of every action taken in the story world.
  - Each entry stores the time, the participants and a set of author-defined labels such as "cruel" or "risque".
  - Backstory is stored as SFDB events with negative timestamps.
  - CiF "does not simulate hidden information": every event is known to all characters at once. — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)
- **Labels as a search shortcut:** the authors say that searching every past predicate is expensive. Tagging a subset of commonly searched history with SFDB labels "significantly reduces the search". — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)

**Main loop**
1. Volition formation scores what each character wants to do.
2. A social exchange is chosen.
3. The responder accepts or rejects it, also by scored rules.
4. The most salient instantiation is chosen and filled in with natural-language templates.
5. The game performs the instantiation.
6. Its effects update the social state.
7. Trigger rules run and may change the state further, setting up the next round of volition formation.

— [McCoy et al. 2014, Fig. 1](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)

**Volition formation**
- Volitions are recalculated after every social exchange.
- For every pair of characters, the system ranks all intents and exchanges using hand-written influence rules.
- When a rule is true, its weight is added. The weight goes either to the specific exchange the rule belongs to, or to every exchange that shares the rule's intent. — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)
- **Preconditions vs. influence rules:** exchange preconditions forbid situations outright, while influence rules only shift the weights.
- **Microtheories:** general norms attached to one concept, such as a status or trait, and reused by every exchange.
  - Example: "feels superior to" lowers the wish to befriend someone in general.
  - The "give advice" exchange can override this with its own rule set, because feeling superior raises the wish to give advice. — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)

**Trigger rules**
- Trigger rules are global, are not part of volition, and change the state when their conditions hold, usually after an exchange.
- Example: one rule ("dating more than one person" gives the status "two-timer") replaces a check inside every instantiation that starts a dating relationship. — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)

**Time-ordered rules**
- Predicates get a "time-order" number and are checked in that order against history.
- Example, the "knight in shining armor" rule: A is mean to B, then C is mean to A, so B wants to befriend C. — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)

**Text generation**
- Each exchange has many instantiations, each a sequence of hand-written dialogue lines.
- Each instantiation has its own preconditions. If several are valid, the most salient wins, and salience grows with how complex the preconditions are.
- Selection also considers which instantiations played recently.
- Templates can query history, e.g. `%SFDB_(cruel, i, r, 7)%`. The arguments are label, initiator, responder and a time window of 7 turns. The token is filled in as text such as "...after you made scandalous remarks about my mother?". — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)
- Each exchange needs at least two instantiations, one for accept and one for reject. — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)

**Prom Week's actual content (from the paper)**

| Element | Count | Notes |
|---|---|---|
| Characters | 18 | |
| Relationships | 3 | friends, dating, enemies |
| Social networks | 3 | buddy, romance, cool |
| Statuses | 34 | |
| Traits | 44 | |
| SFDB labels | 13 | |
| CKB adjectives | 10 | |
| CKB connection types | 4 | likes, dislikes, wants, has |
| Influence rules | "over 5000" | |

— [McCoy et al. 2014](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)

**Player input**
- The player picks an initiator and a responder, then picks from that pair's top social exchanges, ordered by volition.
- In Simon's first level that is 5 characters × the top 5 exchanges per ordered pair, so at least 100 possible opening moves.
- Players can spend "social influence points" to unlock more options. — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)

**Evaluation (play traces, 14 Feb – 17 May 2012)**
- 13,003 traces in total: 7,074 tutorial, 504 freeplay, and 5,425 story traces (the ones analysed).
- On the last level of Simon's campaign, players used 38 of the 39 possible social moves. There were 2,521 unique 3-grams and 5,066 unique 6-grams.
- Only 11 of the more than 100 possible opening moves were ever chosen, which the authors read as goal-directed play.
- The average in-degree in the play graph falls quickly with each move: 15.6 → 2.36 → 1.27 → 1.07.
- In Simon's campaign (263 traces), goals were reached 610 times, about 46% of the 1,315 possible.
- Evaluation was by awards and play traces only; there was no controlled user study. — [same](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf)

**Dialogue volume [secondary/unverified]**
- About 6,000 lines of dialogue: this figure comes only from the title of a Prom Week writing paper ("…Writing Six Thousand Lines of Procedurally-Driven Dialogue"); the body was not checked. — [ELMCIP entry](https://elmcip.net/node/4528)
- "Twelve major kinds of social exchanges", each scene with about 4–6 lines: seen only in a search snippet of the UCSC lab blog. — [EIS blog](https://eis-blog.soe.ucsc.edu/2011/11/prom-week-gameplay-and-social-physics/)
- The paper itself says only that Simon's level offers 39 social moves.

**Ensemble (the JavaScript engine)**
- Described as "a rules-based AI framework for social simulation", the evolution of CiF.
- The library is a single `ensemble.js` file loaded with a `<script>` tag. A desktop Authoring Tool exists, or authors can write "pure JSON".
- A domain is made of: schema, trigger rules, volition rules, characters, history and actions.
- License: BSD-4-clause. — [ensemble-engine/ensemble on GitHub](https://github.com/ensemble-engine/ensemble)

**Ensemble API (wiki, marked "under construction")**
- Loading: `loadFile`, `loadSocialStructure(schema)` (call first), `addCharacters({cast})`, `addRules({fileName, type: "volition"|"trigger", rules})`, `addActions`, `addHistory({history:[timesteps]})`.
- Running: `calculateVolition(cast)` returns an object with `getFirst / getNext / getWeight / dump / isAccepted`.
- Choosing actions: `getAction(initiator, responder, volitions, cast)` returns the highest-weighted bound action with weight ≥ 0. `getActions(…, numIntents, numActionsPerIntent, numActionsPerGroup)` also exists but is undocumented.
- Effects and state: `doAction(boundAction)`, `runTriggerRules(cast)`, `set/get(predicate)`, `setupNextTimeStep()`, `dumpSocialRecord()`.
- Example volition entry: `{category:"network", type:"buddy", intentType:true, weight:20}`.
- Example effect: `{category:"attribute", type:"strength", first:"rival", operator:"+", value:10}`.
- Bound actions have fields including `conditions, influenceRules, effects, salience, lineage, goodBindings`. Actions form a graph through `leadsTo` arrays. — [Ensemble API wiki](https://github.com/ensemble-engine/ensemble/wiki/Ensemble-API)
- Schema format: `{"schema":[{"category":"trait","isBoolean":true,"directionType":"undirected"|"directed"|"reciprocal","actionable":false,"defaultValue":false,"types":[...]}]}`.
  - `minValue` and `maxValue` apply only to numeric categories.
  - `duration` unset means the fact is permanent; `duration: 0` means it lasts one timestep, like an event. — [Ensemble Schema wiki](https://github.com/ensemble-engine/ensemble/wiki/Schema)

**ESP and Slice of Life (FDG 2025, Treanor, Samuel, Nelson)**
- Ensemble's "schema" generalised CiF's hard-coded categories. Example category: "network", directed and numeric, with types friend, attraction and respect, default 4, range 0–10. — [Treanor, Samuel & Nelson, FDG '25](https://kmjn.org/publications/SliceOfLife_FDG25.pdf)
- Slice of Life uses "a deliberately minimal schema… inspired in part by the creators' suspicion that Prom Week's very large schema led to authoring and playability issues." — [same](https://kmjn.org/publications/SliceOfLife_FDG25.pdf)
- **Social record:** a time-ordered list of facts, each with a "first" character and optionally a "second". A query's truth value comes from the most recent entry, otherwise the schema default. Time-window queries are supported, e.g. "has X been rude to Y in the past four time steps". — [same](https://kmjn.org/publications/SliceOfLife_FDG25.pdf)
- **Social practice:** a conversation context such as "Introduce Self" or "Talk About Pizza".
  - It is made of stages with strict turn-taking: initiator, then responder, alternating.
  - Each stage holds actions: one line of dialogue plus optional state changes, each tagged with an intent.
  - Slice of Life has 4 intents: kind, rude, flirt, impress.
  - 4 microtheories, one per intent, score the actions. — [same](https://kmjn.org/publications/SliceOfLife_FDG25.pdf)
- "Slice of Life makes use of under 200 rules… significantly fewer than other social physics games. In contrast, CiF employed thousands." Example rules: `family(x,y) ⇒ rude(−3)` and `on_break(x) ∧ employee(x) ∧ ¬employee(y) ⇒ rude(+2)`. — [same](https://kmjn.org/publications/SliceOfLife_FDG25.pdf)
- Dialogue is produced by an LLM (gemini-1.0-pro-002, default parameters) from prompts built from the symbolic state. The simulation stays "deterministic and free from influence by the LLM".
- The authors argue that the many paths into each situation make hand-written lines impractical.
- They still report hallucinations, e.g. a character invents the day of the week, which the system does not model. — [same](https://kmjn.org/publications/SliceOfLife_FDG25.pdf)

### Inferences
- For a JS game, Ensemble's data model (schema, social record with time windows, weighted volition and trigger rules, actions with `leadsTo`) can be used directly or reimplemented in a few hundred lines.
- **Cost at scale:** the expensive part is volition, which scores every ordered pair × every rule. With hundreds of NPCs, only score pairs that are nearby or relevant, and do it on demand.
- The CiF lesson, in its authors' own retrospective: keep the schema small (about 4 intents, fewer than 200 rules), not the 5,000-rule scale.
- **For offline Italian text without an LLM:** the CiF model (many instantiations per exchange, chosen by precondition specificity, with SFDB tokens) is the proven fallback.
  - Italian gender and number agreement would have to be built into the token-filling step. The papers do not discuss this.

### Gaps
- The FDG 2013 Prom Week paper body was not checked, so the exact total of instantiations and lines is not verified; 6,000 comes from a title only.
- No published performance figures for CiF or Ensemble (milliseconds per volition pass, character limits) were found.
- The full JSON formats for rules and actions (predicate fields such as `turnsAgoBetween`, `isAccept`) are not documented on the wiki pages fetched; check the sample domains in the repository.

---

## 2. James Ryan: Talk of the Town, Bad News, Hennepin, Sheldon County, the 2018 thesis, Expressionist

### Takeaway
Talk of the Town (TotT) is the most detailed published model of fallible NPC knowledge.
- **Belief facets:** each character holds mental models of people and places, made of belief facets.
- **Evidence:** every facet keeps a list of evidence, with a source, location, time and strength that decays over time.
- **Nine evidence types:** reflection, observation, transference, confabulation, lie, statement, eavesdropping, mutation and forgetting.
- **Salience** decides what gets noticed, discussed, mutated or forgotten.
- **Belief revision** compares the strength of new evidence with the current belief.

TotT is Python and simulates a 140-year town with hundreds of characters, with variable level of detail over time.

### Cited findings

**Talk of the Town paper (AIIDE 2015 workshop; Ryan, Summerville, Mateas, Wardrip-Fruin)**
- The framework is written in Python.
- Before play, the town is simulated from its founding up to the founder's death 70 years later, in the style of Dwarf Fortress world generation.
- Characters act out daily routines over day and night timesteps: work, errands, visits, staying home. — [Ryan et al., "Toward Characters Who Observe, Tell, Misremember, and Lie", AIIDE 11(3):56–62](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- **Mental models:** one per person or place, made of belief facets.
  - Facets about people: name (first, middle, last); appearance (each of 24 facial attributes, inherited from the parents); occupation (company, job title, shift); home; whereabouts on a given day or night.
  - Facets about places: owner, employees or residents, whether it is an apartment, block, address.
  - Facets link to other mental models (e.g. "workplace" points to the model of that business). — [same](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- **Data stored on each facet:** owner, subject, type, value (e.g. 'brown'), linked mental model, predecessor (the previous belief), accuracy (true or false against the world), list of evidence, and strength. Strength is "the sum of the strength of all pieces of evidence supporting this belief". — [same](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- **The nine evidence types:**
  - How knowledge originates:
    - Reflection: perceiving oneself, every timestep.
    - Observation: gated by salience.
    - Transference: one entity reminds the character of another (by overlap between the two mental models), and beliefs are copied across unconsciously.
    - Confabulation: a value drawn from the town-wide distribution of that feature.
    - Lie: knowledge invented by the liar.
  - How knowledge spreads:
    - Statement.
    - Eavesdropping: nearby characters overhear statements and lies "at a set probability".
  - How knowledge degrades:
    - Mutation: depends on the character's *memory* attribute, a float inherited from a parent, and on the facet type. Whereabouts mutate more readily than first names. The new value comes from a hand-written transition table, e.g. 'brown' hair is more likely to mutate to 'black' than to 'white' or 'gray'.
  - How knowledge ends:
    - Forgetting: depends on time, the memory attribute and salience. — [same](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- **Evidence metadata:** source (the speaker, for statements, lies and eavesdropping), location, time, and strength.
  - Strength is a float set by evidence type (a mutation is weaker than an observation) and decays over time.
  - For things heard from others, strength also depends on the listener's affinity for the source and the source's own belief strength at the time. — [same](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- **Characters do not know their own errors:** they are not aware of their own transference, confabulation or mutation, and recipients treat lies as ordinary statements of equal strength. The system still records the truth so that "true knowledge trajectories" can be shown after play. — [same](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- **Lies as implemented:** "Currently, this happens probabilistically according to a character's affinity toward the interlocutor, and the misinformation is randomly chosen." Only the receivers store lies; the liars do not yet track them. — [same](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- **Salience of a character** depends on:
  - their relationship to the observer (a co-worker beats a stranger);
  - friendship;
  - romantic feelings;
  - job level.
  
  A hand-written table sets salience per attribute: hair and eyes rank above nose and chin, citing eyewitness-memory research. Salience also sets the chance of later mutation or forgetting. — [same](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- **Conversation:** the topics that come up are the entities most salient to both speakers.
  - How much gets exchanged depends on the relationship strength and both speakers' extroversion.
  - Within a topic, attributes are exchanged in order of attribute salience.
  - Characters do not yet explicitly ask for or reveal information. — [same](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- **Belief revision:**
  - A character adopts a belief on the first evidence for it, if it holds no belief to replace.
  - More evidence raises the belief's strength.
  - Telling a belief to someone slightly strengthens the teller's own belief ("the more a person retells some belief, the stronger that belief becomes").
  - Contradicting evidence replaces the belief only if it is stronger than the current one. — [same](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- **Planned gameplay:** two players, asymmetric, around a secret lover and a will.
  - The family player must steer the town's knowledge network to learn the lover's appearance.
  - The lover player pollutes the network with lies and disguises.
  - At the paper's date the gameplay was not yet implemented. — [same](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- **Prior art:** the authors say Adams does not want memory fallibility in Dwarf Fortress for fear that it would "appear to arise from bugs if not artfully expressed to the player". They call DF the state of the art in commercial character knowledge. — [same](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)

**TotT in practice (from Neighborly, CoG 2022)**
- TotT simulates "small, 19th-century American towns over a 140-year period" and "can potentially hold hundreds of characters".
- For speed it simulates only major life events, with variable level of detail: days are split into day and night, only a percentage of days per year are simulated, and the changes in between are interpolated. It simulates "decades in minutes".
- It has only one explicit "socialize" action; the relationship model decides that action's effects. — [Johnson-Bey, Nelson & Mateas, "Neighborly", IEEE CoG 2022](https://www.kmjn.org/publications/Neighborly_CoG22.pdf)
- TotT was used in Bad News (Slamdance, IndieCade), but its code was tied to Bad News assumptions.
- Hennepin was TotT's "spiritual successor", with revised personality and event-causality models. Its personality model was borrowed from Dwarf Fortress. — [same](https://www.kmjn.org/publications/Neighborly_CoG22.pdf)

**The 2018 thesis**
- *Curating Simulated Storyworlds* (UC Santa Cruz, 2018, CC-BY, 800+ pages). Its case studies come in pairs: World & Diol/Diel/Dial, Talk of the Town & Bad News, Hennepin & Sheldon County. — [eScholarship item](https://escholarship.org/uc/item/1340j5h2); [intfiction.org thread](https://intfiction.org/t/curating-simulated-storyworlds-james-ryans-phd-thesis/40869) **[secondary]**
- **Core thesis [secondary]:** emergent narrative should be achieved by curation, human or automatic, of what a simulation produces, rather than by steering the simulation. Ryan lists eight appeals of emergent stories: the actual, the personal, the uncanny/farcical, the unauthored or co-authored, the uncovered, the improbable, the vast, and the ephemeral. — [Emily Short's blog review, Ch. 1–3](https://emshort.blog/2019/05/21/curating-simulated-storyworlds-james-ryan/)

### Inferences
- **What fits a phone:** the TotT knowledge model is mostly simple data and lookup tables (facet value, evidence list with source and strength, mutation transition tables, salience tables). It could be cut down for JS by limiting facets to the few that gameplay needs (e.g. "where X was", "who did Y") and storing evidence compactly.
- **Main lesson:** realistic knowledge about *trivia* (hair colour, address) is not interesting gossip. Kreminski makes the same criticism (section 5). Knowledge should be about *actions and stories*.
- **Cost:** knowledge grows with characters × entities × facets; level-of-detail time sampling and decay with culling are the published ways to keep it bounded.

### Gaps
- The thesis PDF could not be downloaded in this session, so the following could not be checked against the primary source:
  - Bad News details: live performance with an actor and a "wizard" operator, and town size (believed to be a small town with a few hundred residents, **unverified**);
  - Hennepin and Sheldon County mechanisms;
  - Expressionist grammar internals (a context-free grammar authoring tool with markup tags);
  - numeric parameters such as decay rates.
- The TotT source (github.com/james-owen-ryan/talktown, referenced indirectly by Neighborly as "code was available online") was not inspected.

---

## 3. Versu, Praxis and exclusion logic (Evans & Short)

### Takeaway
Versu's whole world state is a set of sentences in exclusion logic, implemented as a trie.
- **Social practices:** role-agnostic and running several at once; they offer affordances (actions) but never control agents directly.
- **Decisions:** an NPC simulates each candidate action, scores the resulting state against its weighted wants, then undoes the action. This is a one-step but broad lookahead.
- **Beliefs:** for memory reasons, mostly a single shared world model.
- **Lesson:** tuning more than 300 desires was "difficult and unrewarding".

### Cited findings
- Published as Evans & Short, "Versu—A Simulationist Storytelling System", IEEE TCIAIG 6(2), 2014; the authors were at Linden Lab at the time.
- Practices are written in the scripting language Praxis.
- "The simulation state is entirely determined by a set of sentences in a modal logic… There are no objects." — [Evans & Short 2014](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)
- **Exclusion logic:**
  - `.` means "one of the ways"; `!` means "the only way". Example: `brown.sex!male`, `brown.relationship.lucy.evaluation.attractive!40`.
  - It is implemented as a trie, and a prefix acts like an object.
  - The `!` operator makes postconditions shorter: setting a new exclusive value replaces the old one automatically. — [same](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)
- **Social practices:** examples are a greeting, a dinner, a whist game, a flirtation, a conversation about politics.
  - Several run at once, and an agent's options are the union of the affordances of the practices it takes part in.
  - Unlike a state machine, a practice can store any persistent data (e.g. the whist score) and can add any sentence to the world, including spawning or deleting practices. — [same](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)
- **Decision making:** "they actually execute the results of the action… evaluate this future world state with respect to their desires. Then, we undo the consequences."
  - The Praxis instructions "were designed to be efficiently undoable", because copying the whole state "is prohibitively expensive when we are considering so many actions for so many agents".
  - The authors contrast this with The Sims and F.E.A.R., where planners use estimated effects that differ from the real ones.
  - This is enough for NPCs to play "a strong game of whist" with no dedicated whist logic. — [same](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)
- **Utility** is "computed by summing the satisfied desires".
  - Each want has a utility modifier (e.g. 20) that is added once per matching instance. A remark that annoys three upper-class men scores three times as high.
  - Personality is expressed as wants written as logic sentences (e.g. "the doctor is sexist"), not as a fixed list of traits. — [same](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)
- **Relationships:** role evaluations that are multiple and asymmetric, plus a public relationship state.
  - Evaluations are acquired in three ways: hard-coded at the start; by *interpreting* someone's action, where the interpretation is itself an action the character chooses; or by hearing another character's evaluation and choosing to believe it. That last path is gossip.
  - Interpretations can themselves be interpreted, recursively. — [same](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)
- **Beliefs:** "We do not, for memory reasons, give each agent his own separate representation of the world… misunderstandings… cannot be implemented fully."
  - Individual beliefs are stored only for specific story questions (e.g. "is there a ghost?").
  - Beliefs are limited to a two-place predicate over two constants: no quantifiers and no beliefs about others' beliefs. — [same](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)
- **Dialogue** is written in "quips", each a text template plus possible effects on social and emotional state. The text is generated (text output only, no 3D) so adverbs and variations cost little. — [same](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)
- **Evaluation:** there were no controlled experiments, only App Store ratings (5/5 UK, 4/5 US) and press quotes. The platform was the iPad. — [same](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)
- **Stated failures:**
  - "there are already over 300 desires in the system", and tuning them is "difficult and time-consuming… even with this tool [the inspector], it is a difficult and unrewarding problem";
  - concurrent practices make tuning and debugging harder;
  - practices are shared, so agents cannot disagree about a practice's state. — [same](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf)

### Inferences
- **Exclusion-logic trie:** this is a very good fit for JS. Use a nested object or Map with "!" as exclusive assignment. It is compact, fast to query, and easy to save.
- **Simulate-and-undo lookahead:** this works for a few on-stage NPCs. For hundreds of off-screen NPCs it is too costly; use cheaper rules there and keep this method only for the scene the player is in.
- **Practices as content modules:** role-agnostic practices (in an Italian setting, e.g. *al bar*, *dal barbiere*, *al mercato*) map well onto city locations, and the same practice can be reused with any cast.

### Gaps
- No public Praxis or Versu code was found; the system was proprietary. Later rational reconstructions exist (e.g. an AIIDE paper hinted at in search results), but they were not checked here.
- No performance numbers (NPCs × actions per second) are published in the paper.

---

## 4. Dwarf Fortress: thoughts, emotions, personality, memory

### Takeaway
DF's emotional layer works like this:
- **Thought:** an emotion paired with an event.
- **Short-term memory:** keeps the highest-impact pairs.
- **Long-term memory:** some memories are promoted there and periodically resurface.
- **Personality change:** resurfacing long-term memories can permanently change facets and values. Adams frames this as character arcs.

Facets set how likely a dwarf is to have each kind of thought. The slot counts here come from the community wiki and journalism quoting Adams, not from a paper.

### Cited findings
- Adams, as quoted by Polygon (2018):
  - short-term memories are "emotion+event combinations that have had the highest positive or negative impact on the dwarf over the last year";
  - "Long-term memories periodically return to affect the dwarf forever… until they are overwritten";
  - long-term memories are enough on their own as a form of personality change or character arc. — [Polygon 2018 via HN reader](https://hn.jakechampion.name/reader/https://www.polygon.com/2018/4/16/17242932/dwarf-fortress-update-memories-pixar-inside-out) **[secondary, quoting Adams]**
- Each dwarf has eight short-term and eight long-term memory slots. "Core memories" are rarely revisited, but their change to personality is permanent. — [DF Wiki, Memory (thought)](https://dwarffortresswiki.org/index.php/Memory_(thought)) **[community wiki, as given in a search snippet; the page itself returned HTTP 429]**
- Facets set the likelihood of particular thoughts, e.g. a strong romance facet makes relationships more likely. — [student blog citing DF](https://tommartin.myblog.arts.ac.uk/?p=254) **[tertiary]**
- Adams's chapter in *Procedural Storytelling in Game Design* (Short & Adams, eds., CRC Press 2019) is listed as "Emergent Narrative in Dwarf Fortress". It is also circulated as "Characterization and Emergent Narrative in Dwarf Fortress" and covers expanding the likes and dislikes system. — search result listing **[full text not obtained]**
- Hennepin borrowed DF's personality model because it is easier for players to read. — [Neighborly paper](https://www.kmjn.org/publications/Neighborly_CoG22.pdf)

### Inferences
- The short-term memory pattern (keep the top-N events by impact, with occasional resurfacing that triggers a thought, and a rare permanent nudge to personality) is cheap: a fixed number of slots per NPC suits hundreds of NPCs on a phone.

### Gaps
- No primary DF source was obtained for:
  - exact facet counts (believed to be about 50 personality facets and about 30 values, **unverified**);
  - needs;
  - stress formulas;
  - the rules for generating procedural languages and legends;
  - performance limits (the well-known FPS drop with many units is common knowledge, not sourced here).
- The Adams chapter PDF was not retrievable (the host returned HTML).

---

## 5. Newer systems continuing these lines (2019–2026)

### Takeaway
The main trends since 2019:
- **Story sifting:** finding interesting event patterns with Datalog-style queries (Felt, WAWLT, Winnow; FDG 2025–2026 work on composable sifting patterns).
- **Subjective impressions instead of fine-grained knowledge:** WAWLT.
- **Gossip about actions and micro-stories with decay:** Kreminski's Gossamer (CoG 2023), open-source JavaScript.
- **Reusable TotT-likes:** Neighborly (Python ECS, 2022), plus Kismet as an authoring language.
- **Symbolic simulation with LLMs only for surface text:** Slice of Life (FDG 2025).

### Cited findings
- **WAWLT ("Why Are We Like This?", FDG 2020; Kreminski, Dickinson, Mateas, Wardrip-Fruin)**
  - State lives in a DataScript database managed by the Felt simulation and sifting engine. Entities: characters, projects, institutions, events, relationships, impressions.
  - There are two relationship entities per pair, one in each direction. Each holds a numeric "charge", the sum of the source character's impressions of the target.
  - **Impressions:** "up to three positive and three negative impressions; stronger impressions displace weaker ones". Each points back to the event that caused it.
  - "Gossip actions" pass impressions from one character to another.
  - The design gives up per-character knowledge: "we instead assume that all characters know about every event, but that most characters only care about events that are somehow directly relevant to them… subjective impressions, which are fewer in number and more reliably narratively consequential than granular facts."
  - **Cast and backstory:** 10 characters. A backstory simulation with long-timescale actions ("write paper together", "take leave to parent") runs first, then shorter in-session actions.
  - Players get five suggested actions, ranked by author goals written in a small query language. — [Kreminski et al., FDG 2020](https://mkremins.github.io/publications/WAWLT_FDG2020.pdf)
- **Gossamer ("Toward Better Gossip Simulation in Emergent Narrative Systems", IEEE CoG 2023, Kreminski)**
  - Critiques TotT: its knowledge spreads "mostly about things like a character's hair color and current place of residence".
  - Critiques Kismet: it gossips single actions and loses the larger story structure.
  - Critiques City of Gangsters: one action per piece of gossip, with only a ± integer evaluation. — [Kreminski 2023](https://mkremins.github.io/publications/Gossamer_CoG2023.pdf)
  - **The four phases it proposes:**
    1. **Witness:** who sees an action, a possible distortion of what they perceive, whether they record it, and with what initial strength.
    2. **Reflection:** a character assembles remembered actions into "microstories".
    3. **Propagation:** when two characters meet, which microstories they share, with possible mutation, and with what strength for the receiver.
    4. **Decay:** reduce every memory's weight by a fixed amount and delete memories below a threshold, "so that characters do not accumulate larger and larger numbers of memories".
  - A suggested link to behaviour: each microstory maps roles to liking deltas.
  - Released as open-source JavaScript ("a computational caricature"). — [same](https://mkremins.github.io/publications/Gossamer_CoG2023.pdf)
- **Neighborly (CoG 2022, Johnson-Bey, Nelson, Mateas)**
  - A "rational reconstruction" of TotT as a reusable sandbox: a Python package with a custom entity-component system (GameObjects, components, archetypes defined in data files, and plugins).
  - Every character has a `GameCharacter` component (name, age, location, life values, statuses).
  - Optional "character values" (confidence, material things, knowledge, power, …) replace TotT's Big Five personality model.
  - Routines run over a 7-day week of 24 hours each, instead of TotT's single-day random routines.
  - It includes a query language for story sifting.
  - Its paper lists Kismet as "a small social simulation authoring language that is a spiritual successor to Talk of the Town". — [Neighborly paper](https://www.kmjn.org/publications/Neighborly_CoG22.pdf); [GitHub ShiJbey/neighborly](https://www.github.com/ShiJbey/neighborly)
- **Slice of Life / ESP (FDG 2025):** see section 1. It is the clearest 2025 example of a deterministic symbolic simulation with LLM-generated surface text, and of a deliberately small rule set (fewer than 200 rules). — [Treanor et al. 2025](https://kmjn.org/publications/SliceOfLife_FDG25.pdf)
- **Other work seen only in search results [unverified]:** Lyu, Millard & Gibbins (FDG 2025) on composable story-sifting patterns, and Lessard et al. (2026, PCG workshop) building on Kreminski's 2022 sifting heuristics. — [Soton eprint](https://eprints.soton.ac.uk/502632/2/3723498.3723809.pdf); [PCG workshop 2026](https://www.pcgworkshop.com/archive/lessard2026narrative.pdf)

### Inferences
- **Best mobile pattern:** WAWLT-style capped impressions (3 positive + 3 negative per directed relationship, each linked to its cause event) combined with Gossamer's decay and culling. Memory per NPC stays fixed and every opinion stays explainable ("non mi fido di lui perché...", i.e. "I don't trust him because...").
- **Story sifting** over an event log is cheap and fits offline play. It turns simulation output into presentable "news" or gossip lines for the player, which is Ryan's curation idea.

### Gaps
- "Lume" was not found, so its existence and content are unverified.
- No 2019–2026 paper was found that distils LLM behaviour into symbolic rules for offline use.
- No Kreminski paper from 2024–2026 was confirmed in this search.

---

## 6. Generative Agents (Park et al. 2023): which parts can run as rules

### Takeaway
The architecture has three parts:
- **Memory stream:** a list of observations in plain language.
- **Retrieval:** score = recency + importance + relevance, each normalised to 0–1 and weighted equally.
  - Recency decays by a factor of 0.995 per hour since the memory was last retrieved.
  - Importance is a 1–10 rating given by the LLM.
  - Relevance is the cosine similarity between embedding vectors.
- **Reflection:** triggered when the summed importance of recent events passes 150.
- **Planning:** recursive, from the day down to 5–15 minute chunks.

Without an LLM, these pieces map onto rules or tables:
- the recency formula and the reflection trigger carry over unchanged;
- importance becomes a value written per event type;
- relevance becomes tag or entity overlap instead of embeddings;
- reflections become trigger and sifting rules;
- plans become schedule templates.

The paper's own results show where the value came from (knowledge spread through conversation) and where it failed (cost, embellished memories).

### Cited findings
- **Recency:** exponential decay by game hours since last retrieval, factor 0.995.
- **Importance:** an integer 1–10 asked of the LLM. The paper's examples: 1 for brushing teeth, 8 for asking a crush out on a date.
- **Relevance:** cosine similarity of embeddings.
- **Final score:** each part is min-max scaled to [0, 1], then `score = α_rec·rec + α_imp·imp + α_rel·rel` with all α = 1. The top memories that fit in the context window go into the prompt. — [Park et al. 2023, arXiv:2304.03442](https://arxiv.org/pdf/2304.03442)
- **Reflection:** triggered "when the sum of the importance scores for the latest events… exceeds a threshold (150)", which happened "roughly two or three times a day".
  - The LLM receives the 100 most recent memory records and is asked for the "3 most salient high-level questions".
  - The answers are stored as new memories with citations to the memories they came from. — [same](https://arxiv.org/pdf/2304.03442)
- **Planning:** a daily plan "in broad strokes", recursively broken into hour-long and then 5–15 minute chunks, and revised when the agent reacts to events. — [same](https://arxiv.org/pdf/2304.03442)
- **Results:** 25 agents over 2 game days.
  - Knowledge of Sam's mayoral candidacy went from 1 agent (4%) to 8 (32%).
  - Knowledge of Isabella's Valentine's party went from 1 agent (4%) to 13 (52%).
  - Network density went from 0.167 to 0.74.
  - 1.3% of answers (6 of 453) about awareness of other agents were hallucinated.
  - 5 of the 12 invited agents attended the party. — [same](https://arxiv.org/pdf/2304.03442)
- **Ablation study:** run against a human crowdworker baseline, scored with TrueSkill rankings; the full architecture ranked best, and each removed component made agents less believable.
- **Failures:** failing to retrieve relevant memories, and "embellishments", e.g. adding details about plans that never happened.
- **Cost:** the simulation cost "thousands of dollars in token credits and [took] multiple days to complete". — [same](https://arxiv.org/pdf/2304.03442)

**Symbolic equivalents of the same ideas, all already published**
- Gossamer's decay and cull, and its "reflection phase" that assembles microstories. — [Kreminski 2023](https://mkremins.github.io/publications/Gossamer_CoG2023.pdf)
- WAWLT's capped impressions and sifting-based self-narratives. — [Kreminski et al. 2020](https://mkremins.github.io/publications/WAWLT_FDG2020.pdf)
- TotT's evidence strength with decay and salience, and its belief revision. — [Ryan et al. 2015](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)

### Inferences
- **Memory and retrieval on a phone:** a fixed-size ring buffer of events per NPC, each event carrying type, participants, place, tags and an importance taken from a per-type table. Retrieval scores `0.995^hours + imp/10 + overlap(tags, query)`, which takes microseconds in JS.
- **Reflection without an LLM:** an importance accumulator crossing a threshold runs sifting rules over the NPC's recent memories (e.g. "X was rude to me 3 times → reflection: 'X ce l'ha con me'", i.e. "X has it in for me"). The result becomes a high-importance memory or an impression.
- **Knowledge spread** like the 4%→52% party diffusion can be reproduced with TotT or Gossamer propagation in conversations driven by salience; this is the part of the effect that does not need language.
- **Text:** the remaining gap is producing varied Italian lines. The options are CiF-style instantiation templates or Versu-style quips with history tokens, written offline. LLM text realisation as in Slice of Life is not possible here because the game must run offline.

### Gaps
- No peer-reviewed paper was found that replaces the Generative Agents LLM components with symbolic ones and measures believability against the original. This is a real gap in the literature, not just in this search.
