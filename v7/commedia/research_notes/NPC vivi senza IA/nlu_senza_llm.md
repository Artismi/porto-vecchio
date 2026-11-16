# Understanding free player text without runtime LLMs (procedural/compositional NLU for an Italian mobile-browser game)

## Façade (Mateas & Stern): how its NLU worked, scale, failure modes, how misunderstanding was hidden

### Takeaway
Façade does not parse meaning. It maps "millions" of possible inputs onto about 30 parameterized pragmatic discourse acts. It does this with hundreds of hand-written forward-chaining template rules, which compile to Jess/Rete and are layered by salience (synonyms, then idioms with retraction, then negation cancelling, then keyword and combination rules). A second rule layer reads each act in context. The authors' own figures: roughly 30% of inputs are misunderstood, and only about 25% of the time do players get fully context-specific reactions. The design hides this with self-absorbed, fast-talking characters, deflection mix-ins, and a policy of being deliberately permissive.

### Cited Findings
- NLP is two phases. Phase 1 maps surface text to discourse acts. Phase 2 decides a context-appropriate reaction to the act. Phase 1 uses context only by switching sets of rules on and off per context — [Mateas & Stern, NLU in Façade: Surface-text Processing, TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- The approach is framed as dialog management: it focuses on what an utterance *does* (pragmatics) and "ignor[es] most of the semantics (denotative meaning)". The mapping is called "a strong many-to-few mapping" — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Discourse act inventory, each parameterized by target character: DAAgree, DADisagree, DAPositiveExcl, DANegExcl, DAExpress(type), DAMaybeUnsure, DAThank, DAGreet, DAAlly, DAOppose, DADontUnderstand, DAPraise, DACriticize(level), DAFlirt, DAPacify, DAExplain(param), DAAdvice(param), DAReferTo(obj), DAIntimate, DAGoodbye, DAInappropriate, DAMisc(type), DAApologize. A catch-all DASystemCannotUnderstand covers anything that triggers no other act — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Scale: "The millions of potential player inputs are mapped, using hundreds of authored forward-chaining NLU rules, into one or more of ~30 parameterized discourse acts". "Context proposers" then interpret the acts as agreement, disagreement, alliance, provocation and so on — [Mateas & Stern, Structuring Content in the Façade Interactive Drama Architecture, AIIDE 2005](https://www.cs.uky.edu/~sgware/reading/papers/mateas2005structuring.pdf); "approximately 30 dialog moves" — [Façade demo paper, AIIDE 2005](https://cdn.aaai.org/ojs/18733/18733-52-22385-1-10-20210928.pdf)
- Rule example: `(defrule global-agree-rule1 (template (toc (love (to | it | that)))) => (assert (iAgree)))`. Intermediate facts (iGreet, iCharacter(?x)) combine into final acts, e.g. `iGreet AND iCharacter(?x) → DAGreet(?x)`. New ways of saying hello only need new iGreet rules — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Template pattern language. Positional regex parts: `(X Y)` sequence, `(X | Y)` alternation, `([X])` optional, `*` any number of words, `?` exactly one word. Occurrence operators ignore position: `tand` (both present, any order), `tor`, `toc` (contains), `tnot` (absent). Operators nest. Atoms can be words, WordNet synonym expansions, stems, or *positional facts* written `{iIs}` — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Positional facts are sub-phrases recognized earlier and carry start/end positions. Example: `{iPersonPosDesc}` (buddy, friend, genius…) plus `{iIs}` (am, is, seem, looks…). The praise rule is `({iPersonPosDesc} | (you [{iIs}] [a | my] {iPersonPosDesc} *))`. The authors say this makes the language "as powerful as a context free grammar", but the intent is "noise-tolerant parsing rules", not grammaticality — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Term retraction: a `–` operator removes matched words, and any facts derived from them, so idioms like "fat chance" don't also trigger the literal-meaning rules — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Rule tiers set by salience:
  1. High-salience generic synonym sets (positive/negative words, greets, flirts, insults, curses).
  2. Idiom rules with retraction. The authors scanned about 9,000 phrases from phrase dictionaries and kept about 1,000 that fit the domain.
  3. Negation cancelling: "you are not bad" has not+bad retracted and replaced with iAgree.
  4. Keyword rules and combination rules.
  — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Keyword rules that assert an act directly "tend to impose a limit on the total number of words" in the utterance, to cut false positives in long sentences — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Anaphora is handled by looking up a stored referent. The characters update the referent for "it" as they deliver lines — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Compilation: each word becomes a fact (`wo-like 2 2`). Templates compile into networks of rules that build phrase-occurrence facts, matched efficiently by Rete, which avoids running string tests for every rule — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Design stance: "the template rules for Façade err on the side of being overly permissive… it is more interesting for the characters to eke some meaning out of a broad set of utterances… than to only have interesting responses for a narrow set, and respond with some form of 'huh?' to the rest." Templates are deliberately *not* built to resist players who try to break them with ludicrous input — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- The authors contrast this with AIML: there, patterns are a subset of regex with no alternation or optionals, and each pattern is paired directly with a response — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Content scale: about 2,500 joint dialog behaviors (jdbs) in 27 beats, of which about 15 are seen per run; one run shows at most 25% of the content. About 20 global mix-in progressions, each with three tiers deepening a topic (marriage, divorce, objects such as the wedding photo, generic reactions to praise or criticism). There are also "a variety of generic deflection and recovery global mix-ins for responding to overly confusing or inappropriate input". Authoring took about 3 person-years — [AIIDE 2005](https://www.cs.uky.edu/~sgware/reading/papers/mateas2005structuring.pdf)
- Interruption and resumption: a mix-in triggered by a topic reference interrupts the current beat, and the beat then resumes with a re-entry line ("So, I was going to say, about Italy...") — [AIIDE 2005](https://www.cs.uky.edu/~sgware/reading/papers/mateas2005structuring.pdf)
- Measured quality, from the authors' estimates and informal evaluations:
  - NLU failures occur "~30% of the time on average"; success, partial or full, about 70%.
  - Ideal context-specific reactivity about 25% of the time, partial about 40%, shallow about 25%, little or none about 10%.
  — [AIIDE 2005](https://www.cs.uky.edu/~sgware/reading/papers/mateas2005structuring.pdf)
- Ways the design hides misunderstanding: two NPCs keep the drama moving if the player is idle or uncooperative. "The fast pace of Grace and Trip's dialog performance discourages lengthy natural language inputs." "By design, Grace and Trip are self-absorbed, allowing them to occasionally believably ignore unrecognized or unhandleable player actions" — [AIIDE 2005](https://www.cs.uky.edu/~sgware/reading/papers/mateas2005structuring.pdf)
- Failure modes the authors acknowledge: the domain (a marriage falling apart) "overly raised players' expectations of the characters' intelligence… and language competence". Mapping millions of surface texts to a few acts "can feel muddy or overly coarse". Real-time rather than turn-based interaction added large authoring burden — [AIIDE 2005](https://www.cs.uky.edu/~sgware/reading/papers/mateas2005structuring.pdf)
- They chose acts "broad enough such that a huge range of possible input utterances can be mapped into them, but specific enough that the characters' responses… make sense given the text typed" — [Façade demo, AIIDE 2005](https://cdn.aaai.org/ojs/18733/18733-52-22385-1-10-20210928.pdf)

### Inferences
- Façade's architecture is the most directly reusable model for an Italian browser game. Its parts are: a small closed set of pragmatic acts with parameters (target NPC, topic/object); layered pattern rules (synonyms → idioms with retraction → negation → keywords/combinations); context-dependent interpretation; and a library of deflection mix-ins. A modern JS reimplementation needs no Jess. Ordered passes over a token array, with "consumed" flags standing in for retraction, would do.
- The two-phase split matters. Phase 1 can be shared across all scenes. Phase 2 (what "agree" *means* now) is per scene, and it is where the writing effort goes.
- A 70% success rate was tolerable in Façade only because of the characters' self-absorption and the stream of content. A game with fewer NPC lines will need even stronger deflection writing.

### Gaps
- The exact rule count is not given beyond "hundreds"; no breakdown per discourse act was found.
- No formal user study with numbers beyond the authors' informal estimates.

## Event[0]: how Kaizen understood text and handled not understanding

### Takeaway
Kaizen used an in-house system that was neither an LLM nor (as far as public sources say) ML. It detects semantic tags/categories from words, uses them to open topic "events" that run in parallel with priorities, and has short-term memory for anaphora. Replies are assembled from fragment pools coloured by nine emotional states. Misunderstanding is limited by a narrow, in-fiction knowledge domain and a character who admits it is limited.

### Cited Findings
- Input is interpreted by finding semantic tags. Example: "pencil", "pen", "eraser" lead the AI to "stationery". Once enough tags are found, it deduces the meaning and replies. The postscript says "Kaizen is looking for complete thoughts rather than fragments or lone words" — [Game Developer, Making a chatbot that drives a narrative in Event[0]](https://gamedeveloper.com/design/making-a-chatbot-that-drives-a-narrative-in-sci-fi-exploration-game-i-event-0-i-)
- Events: mentioning origami loads an "Origami" event, which ends when the topic is dropped. Several events with different priorities can run at once, and responses are chosen from among them — [Game Developer](https://gamedeveloper.com/design/making-a-chatbot-that-drives-a-narrative-in-sci-fi-exploration-game-i-event-0-i-)
- Memory: long-term memory keeps what the player said for later. Short-term memory resolves references: "what about that door?" stores "door", so a later "open it" means the door — [Game Developer](https://gamedeveloper.com/design/making-a-chatbot-that-drives-a-narrative-in-sci-fi-exploration-game-i-event-0-i-)
- Output: nine emotional states, each unlocking vocabulary and environmental actions. Dialogue is written as fragments, and Kaizen assembles replies by randomly selecting pieces according to emotional state and active events — [Game Developer](https://gamedeveloper.com/design/making-a-chatbot-that-drives-a-narrative-in-sci-fi-exploration-game-i-event-0-i-)
- Handling not understanding: knowledge is limited to the ship and its former crew, and Kaizen says it is a program that "can't possibly know everything about everything". The article admits keyword collisions happen and that context often matters more than a single keyword. The developers built all the technology in-house — [Game Developer](https://gamedeveloper.com/design/making-a-chatbot-that-drives-a-narrative-in-sci-fi-exploration-game-i-event-0-i-)

### Inferences
- Tag → category → topic event with priority is essentially ChatScript-style concept sets plus topic keywords, with emotion-driven assembly of reply fragments. Building it in JS is cheap.
- Kaizen being a damaged, moody, self-aware machine makes "not understanding" diegetic, which is the same trick as Façade's self-absorption.

### Gaps
- No public figures on vocabulary or tag count, word count, or fallback-line frequency. No evidence of ML or regex specifics. Event[0] shipped in English only, as far as found.

## Interactive fiction parsers (Inform, TADS, ZIL): grammar and scope models, why they feel rigid, conversation alternatives

### Takeaway
IF parsers match verb-led grammar lines made of tokens (literal words plus noun tokens restricted by *scope*: what is visible, held, and so on). The rigidity is partly deliberate: matching is literal, limited to what's in scope, and authors choose to keep the parser from being "too helpful". In conversation, IF moved from ASK/TELL topics (with guess-the-noun problems) to threaded or menu hybrids, as in Emily Short's Galatea and Alabaster.

### Cited Findings
- An Inform grammar line is a sequence of tokens describing a text pattern, e.g. "take [something] out" is three tokens — [Inform 7 compiler docs, if-module](https://code.oreolek.me/ifhub/inform7/raw/commit/5b3a34c9421a68bd4c43c2b2611e8380de81ba7d/docs/if-module/5-us.html) (from a search summary)
- "In scope" roughly means "visible to the player at the moment". Tokens such as `held` restrict matches to carried objects, and Understand lines can be conditional or revoked — [Inform 7 Documentation](https://ganelson.github.io/inform-website/book/WI_27_23.html) (from a search summary)
- Inform's documentation says not every noun can take multiple objects because "too helpful a parser makes too easy a game" — [Inform 7 Documentation](https://ganelson.github.io/inform-website/book/WI_27_23.html) (from a search summary)
- Façade's authors explicitly position their template approach against "the rigid parsing… in text-based interactive fiction" that requires inputs to "exactly match these forms" — [Façade demo, AIIDE 2005](https://cdn.aaai.org/ojs/18733/18733-52-22385-1-10-20210928.pdf)
- Galatea (Emily Short, 2000) centres on ASK ABOUT / TELL ABOUT (plus THINK ABOUT, RECAP), with an engine tracking conversation flow and Galatea's emotional state. Guess-the-noun is a known drawback of ASK/TELL. Short's later Alabaster used a threaded conversation extension that grew out of Galatea's system — [IFWiki: Conversation](https://www.ifwiki.org/Conversation); [Emily Short, conversation article](https://emshort.blog/how-to-play/writing-if/my-articles/conversation/); [Galatea](https://www.nickm.com/if/emshort/galatea.html)

### Inferences
- What carries over to free social text: (a) a scope model, so only NPCs, objects and topics present or known are candidate referents; (b) environmental cueing of nouns, so the player learns which topics exist (Short's answer to guess-the-noun); and (c) showing which topics are available after a miss.
- Verb-first grammar is a poor fit for Italian free speech because of flexible word order, pro-drop and clitics ("glielo dico"). Occurrence-based (`tand`) patterns plus stemming work better than positional grammar lines.

### Gaps
- Details of TADS 3 and Infocom ZIL parser architecture were not retrieved. Italian IF parser projects (e.g. the Italian Inform library) were not researched.

## Chatbot engines: ChatScript, AIML/ALICE, ELIZA-style tricks

### Takeaway
ChatScript, which won four Loebner Prizes, is the most mature rule-based persona engine. It has concept sets (~2,000 built in, plus WordNet), topics with keyword lists, rules split into gambits (the bot leads), responders (the user leads) and rejoinders (replies to what the bot just said), order-free patterns, and permanent variables and facts. Its built-in NLP is English-centric. AIML is simpler: literal pattern → template pairs.

### Cited Findings
- Rules are grouped into topics, and topics declare keywords for retrieval, e.g. `topic: ~food (~fruit fruit food eat)`. The three rule categories are gambits (the bot leads), rejoinders (replies tied to what the bot just said) and responders (replies to any input). Responders are `?:` for questions, `s:` for statements, `u:` for either — [Wikipedia: ChatScript](https://en.wikipedia.org/wiki/ChatScript)
- `~name` marks a concept set; about 2,000 are predefined. Patterns are "analogous to Regex but aimed for NL"; `<< what music you ~like >>` matches its words in any order. Output can include C-like code (if/else, loops, functions). Variables: `$_` local, `$$` transient, `$` permanent. Facts are triples, queryable and persistent — [Wikipedia: ChatScript](https://en.wikipedia.org/wiki/ChatScript)
- It embeds English WordNet plus an English POS tagger and parser. Other languages need TreeTagger, which requires a commercial licence — [Wikipedia: ChatScript](https://en.wikipedia.org/wiki/ChatScript)
- Loebner record: Suzette won in 2010 (fooling one of four judges), Rosette in 2011, and Rose in 2014 and 2015 (third in 2013; Angela second in 2012) — [Wikipedia: Bruce Wilcox](https://en.wikipedia.org/wiki/Bruce_Wilcox); [Wilcox, Winning the Loebners (PDF)](https://chatscript.sourceforge.net/Documentation/Paper-%20WinningTheLoebners.pdf); [Game Developer: Suzette, the most human computer](https://gamedeveloper.com/programming/suzette-the-most-human-computer)
- AIML's basic unit is a pattern–template pair; its pattern syntax is a subset of regex without alternation or optionals (Mateas & Stern's characterisation) — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)

### Inferences
- How ChatScript keeps a persona coherent:
  - Topics with gambit sequences mean the bot always has something in-character to say, so it can steer back.
  - Rejoinders make short exchanges feel contextual.
  - Permanent variables and facts remember the player.
  - Concept sets let one rule cover many phrasings.
- An Italian JS port of these ideas would mean hand-writing Italian concept sets, either seeded from Italian lexical resources or generated offline by an LLM at authoring time, which costs nothing per player.
- ELIZA-style reflection (echoing a fragment back as a question) is the cheapest fallback. In Italian, a naive version breaks on gender and number agreement and on verb conjugation of the echoed fragment (io→tu: "sono stanca" → "sei stanca").

### Gaps
- The ChatScript manual on GitHub returned 404 at the URLs tried, so details of the control script (quibbles, `^keep`/`^repeat`, fallback order) are not cited here. Dedicated ELIZA/ALICE primary sources were not fetched. ChatScript use in shipped games was not found.

## Small on-device intent classifiers and sentence embeddings for the browser (sizes, Italian)

### Takeaway
Multilingual sentence embedders that cover Italian are big for mobile: about 118 MB int8 for both paraphrase-multilingual-MiniLM-L12-v2 and multilingual-e5-small in transformers.js ONNX form. Most of that is the 250k-token multilingual vocabulary. English-only MiniLM is about 23 MB. Static embedding models (Model2Vec) and fastText-style supervised classifiers are the realistic lightweight options. Embeddings work best as a *fallback matcher* (nearest authored example → intent), not as the main engine.

### Cited Findings
- Xenova/paraphrase-multilingual-MiniLM-L12-v2 ONNX files: fp32 470 MB, fp16 235 MB, int8/uint8/"quantized" 118 MB, q4f16 205 MB, q4 399 MB — [Hugging Face file list](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/tree/main/onnx)
- Xenova/multilingual-e5-small ONNX files were listed with identical sizes (fp32 470 MB, int8 118 MB, fp16 235 MB) — [Hugging Face file list](https://huggingface.co/Xenova/multilingual-e5-small/tree/main/onnx). The identical figures are suspicious and may be a caching artefact of the fetch, though both models have about 118M parameters, mostly embeddings; re-verify.
- English Xenova/all-MiniLM-L6-v2 quantized is about 23 MB — [SitePoint, Optimizing Transformers.js for production](https://www.sitepoint.com/optimizing-transformers-js-production/)
- potion-multilingual-128M (Model2Vec static embeddings distilled from BGE-M3): 101 languages, 256-dim, about 0.1B params. model.safetensors is 512 MB and tokenizer.json 18.6 MB. Mean score 47.31 vs LaBSE 52.07 (about 91% of LaBSE). It is claimed to be "orders of magnitude faster" than transformer encoders — [HF model card](https://huggingface.co/minishlab/potion-multilingual-128M); [file list](https://huggingface.co/minishlab/potion-multilingual-128M/tree/main)
- fastText quantization: a DBpedia classifier shrank from 427 MB (.bin) to 1.7 MB (.ftz). The fastText FAQ recommends reducing dimension or hash buckets and then quantizing. compress-fasttext reports shrinking an English model to 21 MB. fastText has a WebAssembly build — [Packt fastText quick start](https://packtpub.com/en-gb/product/fasttext-quick-start-guide-9781789130997/chapter/sentence-classification-in-fasttext-6/section/fasttext-model-quantization-ch06lvl1sec20); [fastText FAQ](https://fasttext.cc/docs/en/faqs.html); [Compressing unsupervised fastText models](https://towardsdatascience.com/compressing-unsupervised-fasttext-models-eb212e9919ca/)

### Inferences
- Static multilingual embeddings (potion-multilingual) need no transformer runtime, only a lookup and a mean, so inference on phones should be sub-millisecond. The 512 MB fp32 table could in principle be pruned to an Italian-only vocabulary of tens of thousands of tokens and stored as int8, giving perhaps a few MB. This is my estimate and has not been verified.
- A supervised fastText classifier trained offline on several thousand Italian paraphrases per intent (authoring-time data, e.g. LLM-generated) would likely quantize to around 1–5 MB and run in WASM. Its character n-grams help with Italian inflection and typos.
- The recommended hybrid is: rule and template layer first (precise, authorable, debuggable), then embedding nearest-neighbour over authored example sentences when no rule fires, with a confidence threshold, then a deflection layer.
- Italian-specific preprocessing, needed whatever the matcher:
  - Normalise apostrophe elisions (l', un', dell', c'è, po'), and accents typed as apostrophes ("perche'", "e'"). Lower-case.
  - Split enclitics (dimmelo → dimmi+lo, portalo), or include them as surface variants.
  - Stem or lemmatise across rich inflection (gender, number, conjugations); Snowball Italian is a cheap option.
  - Handle pro-drop (no subject pronoun), so addressee detection must come from verb person (2nd sg "sai", formal "Lei sa") or from vocatives.
  - Allow free word order, which favours occurrence-based matching.
  - Expect informal and SMS spellings (cmq, xké, nn, tvb) and dialect.

### Gaps
- No measured latency figures for transformers.js embedding on phones were found. No verified size for Italian-pruned static embeddings. No Italian-specific intent benchmark for these small models was found.

## Other games with typed or free-form social input

### Takeaway
Starship Titanic (keyword-based, with a huge pool of recorded lines), Seaman (voice keywords, with failure turned into character), The Restaurant Game (crowd-sourced logs replayed by retrieval), and Galatea (ASK/TELL with emotional state) all show the same pattern. Coverage comes from large authored or recorded response pools plus shallow input matching, and success depends on characters whose personality explains the gaps.

### Cited Findings
- Starship Titanic (1998): the SpookiTalk custom parser/conversation engine was chosen by Adams over dialogue menus. Sources disagree on scale: "over 30,000 words" and 16 hours of dialogue, versus "over 10,000 lines/responses" (about 14 hours). Andrew Plotkin's review says the parser "pretty much boils down to a keyword search" — [Wikipedia: Starship Titanic](https://wikipedia.com/wiki/SpookiTalk); [Making of Starship Titanic (douglasadams.com)](https://douglasadams.com/dna/makingOfStarship.html); [Plotkin review](https://eblong.com/zarf/gamerev/stitanic.html); [PopSci](https://www.popsci.com/technology/douglas-adams-video-game-starship-titanic)
- Seaman (Dreamcast, voice): a 2000 review estimated Seaman understood about 40–50% of speech. Recognition was good when Seaman had just asked a question, but spotty when idle. Saito made Seaman get angry and criticise the player's pronunciation when it failed. Some sources describe keyword/phrase detection, but they are low quality — [GamesFirst review](https://www.gamesfirst.com/articles/2000/seaman-dc); nippon.com feature (as summarised in search; the page returned 404 on fetch); [Vice interview with Yoot Saito](https://sports.vice.com/en/article/ezvyvw/yoot-saito-on-his-classic-sega-game-where-you-take-abuse-from-a-fish)
- The Restaurant Game / Collective AI (Orkin & Roy, MIT): over 10,000 recorded demonstrations (logs reported as 10,027; players reported as 11,000–15,000) with typed chat and 47 object types. These are used to generate an AI waitress's behaviour and dialogue in real time from the data. The thesis claims "significantly open-ended interaction" — [MIT Media Lab publication](https://www.media.mit.edu/publications/automatic-learning-and-generation-of-social-behavior-from-collective-human-gameplay); [Orkin PhD thesis 2013](https://lsm.media.mit.edu/papers/orkin_phd_thesis_2013.pdf); [Orkin thesis defense](https://www.media.mit.edu/events/jeff-orkin-thesis-defense/); dialogue act classification work: [Semi-automated dialogue act classification](https://www.media.mit.edu/publications/semi-automated-dialogue-act-classification-for-situated-social-agents-in-games)
- Galatea: see the IF section — [Galatea](https://www.nickm.com/if/emshort/galatea.html)

### Inferences
- The Seaman observation (recognition is much better right after an NPC question) generalises to text. Matching against the *expected* replies to the NPC's last line (ChatScript rejoinders) is far more accurate than open matching. Design conversations so NPCs ask often.
- Orkin's approach (log players → classify utterances into dialogue acts → retrieve) could be imitated cheaply. Collect Italian playtest logs, cluster them offline, and add them as examples or patterns.

### Gaps
- Prom Week's player input was not researched; as far as I know it uses menu-selected social exchanges, not typed text, but this is unverified. No 2018–2026 indie typed-input examples were researched within the tool budget. Candidates to check: Emily Short's later work, and games using Inform/Dialog in Italian.

## Techniques for graceful misunderstanding that keep the illusion

### Takeaway
Across Façade, Event[0], Seaman and IF, the techniques fall into four groups:
- Pick acts that can be recognised coarsely and respond to the pragmatics, not the content.
- Be permissive rather than say "huh?".
- Give characters self-absorption, a narrow domain or temperament that makes ignoring or deflecting believable, and keep them talking so players type short lines.
- Use context: anaphora memory, expected-reply matching, and visible topic cues.

### Cited Findings
- Permissive matching instead of "huh?" responses is an explicit design choice — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Self-absorbed characters believably ignore unhandled input. Fast NPC dialogue discourages long input. There are generic deflection and recovery mix-ins. A catch-all act, DASystemCannotUnderstand, routes to these — [AIIDE 2005](https://www.cs.uky.edu/~sgware/reading/papers/mateas2005structuring.pdf); [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Keyword rules cap utterance length to avoid false positives on long sentences — [TIDSE 2004](https://www.cp.eng.chula.ac.th/~vishnu/gameResearch/story_november_2005/MateasSternTIDSE04.pdf)
- Event[0]: a limited in-world domain, a character who admits it is limited, short-term memory for "it", and emotional-state-driven fragments — [Game Developer](https://gamedeveloper.com/design/making-a-chatbot-that-drives-a-narrative-in-sci-fi-exploration-game-i-event-0-i-)
- Seaman: failure is reframed as the character scolding the player's pronunciation — nippon.com (search summary; see the gap above)
- IF: environmental cues reveal the topics the player can ask about, which reduces guess-the-noun — [Galatea / Emily Short](https://www.nickm.com/if/emshort/galatea.html)

### Inferences
- Concrete fallback ladder for the Italian game:
  1. Expected-reply match against the last NPC question (sì/no/forse, names, choices).
  2. Full discourse-act rules.
  3. Partial parse: an act was recognised but no topic, or a topic but no act. Respond to the part that was understood ("Parli di Rosa? ...").
  4. Embedding nearest-neighbour above a threshold.
  5. In-character deflection chosen by the NPC's mood and goals, or a clarifying question offering two or three topic options (which also teaches vocabulary).
  6. NPC steers back with a gambit.
- Track the miss rate and escalate. After two misses, show tappable topic chips. This is a hybrid of typed and menu input, which suits mobile keyboards.
- Commedia dell'arte stock characters (self-absorbed, monomaniac masks) fit Façade's "self-absorbed" excuse well. For example, a miser who only hears talk of money, or a braggart who interrupts.

### Gaps
- No quantitative studies comparing deflection strategies on player-perceived intelligence were found. No Italian-language shipped examples of typed-NLU games were found.
