# Italian NLU/NLG without LLMs and computational humour: an offline inventory for a JS game

Scope: Italian lexical and morphological resources, rule-based Italian NLG, lightweight NLU, slang and dialect data, computational humour research, and comedy structure that can be proceduralised. Target: an offline JavaScript game in a mobile browser. The tone is Italian street comedy (sfacciato), with no blasphemy and no jokes about race or disability.

Verification note: npm package versions, licences and unpacked sizes were checked live against registry.npmjs.org on 2026-11-11. The kaikki.org sizes were read from the live download pages. The HAHAcronym and Mihalcea & Strapparava PDFs were downloaded and read in full text.

---

## 1. Italian lexical and morphological resources (licences, sizes, which give gender/number/articles/conjugations)

### Takeaway
Morph-it! (CC BY-SA 2.0 / LGPL dual licence, about 505k inflected forms) is the practical backbone. RosaeNLG has already repackaged it as Apache-2.0 npm JSON dictionaries: words 0.7 MB, adjectives 1.0 MB and verbs 7.2 MB unpacked. Those dictionaries give gender, number and full conjugations in a form JS can load directly. For semantics (synonyms, antonyms, domains), MultiWordNet Italian (CC BY 3.0, about 32.7k synsets) and ItalWordNet via OMW (ODC-BY) are the usable open wordnets. Wiktionary through kaikki.org is the richest source, but at 743 MB it is far too big to ship unless you pre-filter it.

### Cited Findings
- **Morph-it!** (Baroni & Zanchetta, Bologna/Trento). Its README describes it as "a lexicon of inflected forms with their lemma and morphological features", for example `gattini gattino NOUN-M:p`, `andarono andare VER:ind+past+3+p`, `fastidiosetto fastidioso ADJ:dim+m+s`. As of v0.4.7 it has **504,906 entries and 34,968 lemmas**. The README says it "can be used as a data source for an Italian lemmatizer / morphological analyzer / morphological generator". — [Morph-it! readme (bundled in italian-verbs-dict)](https://app.unpkg.com/italian-verbs-dict@3.4.0/files/dist/readme-morph-it.txt)
- Morph-it! licence: "dual-licensed … under the Creative Commons Attribution ShareAlike 2.0 License and the GNU Lesser General Public License". Commercial use is allowed, with attribution and share-alike. — [Morph-it! readme](https://app.unpkg.com/italian-verbs-dict@3.4.0/files/dist/readme-morph-it.txt)
- An earlier announcement (v0.11) gave 568,771 entries and 28,500 lemmas. A later paper on v0.31 reports 6,159 verbal lemmas and 396,120 inflected verbal forms. The counts differ by version. — [Corpora-List announcement 2004](https://listserv.linguistlist.org/pipermail/corpora/2004-November/005439.html); [Morph-it paper PDF](https://godzilla.sslmit.unibo.it/~eros/downloads/Morph-it.pdf)
- **RosaeNLG's Italian packages are built on Morph-it!**: `italian-words-dict`, `italian-adjectives-dict` and `italian-verbs-dict` (all Apache 2.0, "based on Morph-it!"), plus `morph-it-helper`, `italian-determiners`, `italian-ordinals-cardinals`, and shared `stopwords-it` (MIT) and `snowball-stemmer.jsx` (MIT). — [RosaeNLG linguistic resources](https://rosaenlg.github.io/rosaenlg/rosaenlg/3.0.0/advanced/resources.html)
- npm registry, checked live: `italian-words-dict` 3.4.0, Apache-2.0, **701 KB** unpacked. `italian-adjectives-dict` 3.4.0, **1.02 MB**. `italian-verbs-dict` 3.4.0, **7.2 MB**. `italian-determiners` 5.4.0, **18 KB**. — [npm registry: italian-words-dict](https://registry.npmjs.org/italian-words-dict/latest), [italian-verbs-dict](https://registry.npmjs.org/italian-verbs-dict/latest), [italian-adjectives-dict](https://registry.npmjs.org/italian-adjectives-dict/latest), [italian-determiners](https://registry.npmjs.org/italian-determiners/latest)
- Licence caveat: npm marks the dict packages Apache-2.0, but RosaeNLG's own table lists the underlying Morph-it! data as CC BY-SA 2.0. Treat the shipped data as share-alike and credit Baroni & Zanchetta. — [RosaeNLG resources](https://rosaenlg.github.io/rosaenlg/rosaenlg/3.0.0/advanced/resources.html)
- **MultiWordNet (Italian)**: CC BY 3.0 Unported. Release 1.5.0 has "58,000 Italian word senses, 41,500 lemmas and 32,700 synsets (in correspondence with the English equivalents)". It includes WordNet Domains labels for all WordNet 1.6 synsets. It was distributed as a MySQL dump. — [OMW-data ita LICENSE](https://raw.githubusercontent.com/omwn/omw-data/main/wns/ita/LICENSE); [FBK MultiWordNet page](https://nlplab.fbk.eu/tools-and-resources/lexical-resources-and-corpora/multiwordnet)
- Other synset counts are reported too: about 35,400 synsets / 44,400 lemmas (2004 announcement) and 38,653 synsets (GWC 2014). These are different versions. — [W3C list 2004](https://lists.w3.org/Archives/Public/public-swbp-wg/2004Aug/0011.html); [Bond-lab GWC paper](https://bond-lab.github.io/pdf/2012-gwc-wn-license.pdf)
- **ItalWordNet** is in the Open Multilingual Wordnet as `omw-iwn`, distinct from `omw-it`, which is MultiWordNet. Its licence is the **Open Data Commons Attribution License**. Maintainer Roberto Bartolini (ILC-CNR), last updated 22 May 2015. — [omw-data README](https://raw.githubusercontent.com/omwn/omw-data/main/README.md); [omw-data iwn LICENSE](https://raw.githubusercontent.com/omwn/omw-data/main/wns/iwn/LICENSE)
- **Wiktionary via kaikki.org (Italian)**: "All word forms (589,642 distinct words)". The postprocessed JSONL for all Italian senses is **743.3 MB** and is marked "DEPRECATED". The raw Italian-Wiktionary extract (it-extract.jsonl) is **540.4 MB, or 41.8 MB gzipped**. — [kaikki.org Italian](https://kaikki.org/dictionary/Italian/); [kaikki raw data](https://kaikki.org/dictionary/rawdata.html)
- **CoLFIS** (Corpus e Lessico di Frequenza dell'Italiano Scritto) is freely downloadable from SNS Pisa and ISTC-CNR. It is built from about 3.15 M tokens of written Italian. The reference is Bertinetto, Burani, Laudanna, Marconi, Ratti, Rolando & Thornton (2005). — [SNS CoLFIS download](https://linguistica.sns.it/CoLFIS/Download_eng.htm); [Corpora-List 2007](https://listserv.linguistlist.org/pipermail/corpora/2007-February/009245.html); [ISTC-CNR](https://www.istc.cnr.it/it/node/69979)

### Inferences
- Which resources give which forms:
  - Gender and number for nouns and adjectives: Morph-it! (tags such as `NOUN-M:p`) and the RosaeNLG dicts.
  - Full verb conjugations: Morph-it! and `italian-verbs-dict`.
  - Article form selection (il/lo/l'/gli): no lexicon provides this. It is phonological, so it is implemented as rules (see section 2).
  - Synonyms, antonyms and domain labels: MultiWordNet (with WordNet Domains) and ItalWordNet.
  - Etymology, register and slang tags: only Wiktionary/kaikki, through its "Senses by tag" and topical categories.
- Mobile budget strategy: don't ship whole dictionaries. At build time, filter Morph-it!/kaikki down to the game's vocabulary, perhaps 2–5k lemmas, chosen from CoLFIS frequency plus hand-picked street vocabulary. That yields a JSON of roughly 100–300 KB gzipped. This is an estimate, not measured.
- Kaikki is CC BY-SA / GFDL, since it inherits Wiktionary's licence (background knowledge, not verified here). Shipping derived data means attribution and share-alike apply.

### Gaps
- I could not confirm the CoLFIS licence terms or file formats; the pages were not opened.
- Not researched this session: ConceptNet Italian edge counts, Italian FrameNet, Senso Comune, PAROLE/SIMPLE-CLIPS licensing. PAROLE/SIMPLE-CLIPS has historically been an ELRA-distributed resource; not verified.
- I found no current Morph-it! entry count past v0.4.8 (2009 README).

---

## 2. Rule-based Italian NLG (RosaeNLG, SimpleNLG-IT): articles, clitics, participle agreement

### Takeaway
RosaeNLG is the only mature JavaScript NLG engine with Italian support. It runs in the browser, is Apache 2.0, and separates base determiners from a post-processing filter that handles il→lo/l' and i→gli. SimpleNLG-IT (Mazzei, Battaglino, Bosco, INLG 2016) is the academic Italian realiser, but it is Java, so you would have to port its rules rather than reuse its code.

### Cited Findings
- `italian-determiners` exposes `getDet(type, gender, number[, dist])` for DEFINITE/INDEFINITE/DEMONSTRATIVE (NEAR/FAR). It "manages only the most simple form of determiners: for instance DEFINITE M P is always _i_, never _gli_. Transforming _i_ into _gli_ (and all other cases) is managed by `rosaenlg-filter`." — [italian-determiners README](https://unpkg.com/italian-determiners@5.4.0/README.md)
- RosaeNLG Italian packages cover adjective agreement, word (noun) agreement, verb agreement, determiners, and ordinals/cardinals. — [RosaeNLG resources](https://rosaenlg.github.io/rosaenlg/rosaenlg/3.0.0/advanced/resources.html)
- The RosaeNLG docs say there are "presently no dedicated tutorials for Italian and Spanish". — [RosaeNLG tutorials](https://rosaenlg.github.io/rosaenlg/rosaenlg/4.3.0/tutorials/intro.html)
- The full `rosaenlg` npm package (4.4.0, Apache-2.0) is **69.9 MB unpacked** (registry check). This total includes all languages and the build tooling, not just a browser bundle. — [npm registry: rosaenlg](https://registry.npmjs.org/rosaenlg/latest)
- Wikimedia's Abstract Wikipedia NLG survey lists RosaeNLG as supporting English, French, German and Italian. — [Meta-Wiki NLG survey](https://meta.wikimedia.org/wiki/Abstract_Wikipedia/Related_and_previous_work/Natural_language_generation/it)
- **SimpleNLG-IT**: Mazzei, Battaglino & Bosco, INLG 2016 (ACL W16-6630). It ports SimpleNLG-EnFr 1.1 to Italian, which meant creating 10 new packages and modifying 28 classes. Its evaluation was based on an Italian dependency treebank. Code is at GitHub `alexmazzei/SimpleNLG-IT`. — [ACL Anthology W16-6630](https://aclanthology.org/W16-6630/); [paper PDF](https://iris.unito.it/retrieve/e27ce430-9bfc-2581-e053-d805fe0acbaa/INLG16-W16-6630%2bPREF.pdf)
- A follow-up (Conte, Bosco, Mazzei, CLiC-it 2017) formalises adjective placement (pre- vs post-nominal) for SimpleNLG-IT. — [CLiC-it 2017 proceedings](https://books.openedition.org/aaccademia/2388)
- A commercial reference with Italian grammar notes is the AX Semantics Italian language reference. — [AX Semantics Italian](https://docs.ax-semantics.com/reference/language_reference/italian.html)

### Inferences
- For a lightweight game, a custom ~5–20 KB JS realiser is probably better than shipping RosaeNLG. The rules are small and well known; this is background grammar knowledge, not sourced here.
  - Masculine article: `lo/gli/uno` before s+consonant, z, gn, ps, pn, x, y and i+vowel. `l'` before a vowel. `il/i/un` elsewhere.
  - Feminine article: `l'` (singular) before a vowel, `un'` before a vowel.
  - Articulated prepositions: di/a/da/in/su + article give del/dello/dell'/dei/degli, and so on. A 5×7 lookup table covers them.
  - Clitic clusters: the order is mi/ti/ci/vi before si before lo/la/li/le/ne. Before lo/la/li/le/ne, mi becomes me, ti te, ci ce, si se, vi ve, and gli becomes glie- (glielo). Clitics attach to imperatives, infinitives and gerunds (dammelo, fallo). Monosyllabic imperatives double the consonant (dimmi, fammi).
  - Past participle agreement: with *essere*, the participle agrees with the subject. With *avere*, it agrees only with a preceding direct-object clitic (l'ho vista, le ho prese).
- Store each lexical entry with `{lemma, g, n, aspirated-like flags (s-impura/z/gn), irregular plurals}`. The article then comes from orthography, so the lexicon doesn't need to store it.
- RosaeNLG's Pug-based template language is good for designing templates, even if you only borrow its approach.

### Gaps
- I didn't confirm how `rosaenlg-filter` handles elision with h-initial loanwords (l'hotel) or "lo pneumatico" vs "il pneumatico".
- I didn't measure the RosaeNLG browser bundle size for Italian only.
- SimpleNLG-IT licence not verified; SimpleNLG itself is MPL (background knowledge).

---

## 3. Lightweight Italian NLU: stemming, lemmatising, elision/clitic tokenising, spelling, texting slang, youth slang, dialects

### Takeaway
Use a Snowball Italian stemmer (MIT/ISC npm packages) or a Morph-it!-derived reverse lookup as the lemmatiser. Normalise texting forms with a hand-built map (cmq→comunque, xké→perché, nn→non), using Norm It! (LREC 2020) as the research basis. SymSpell (MIT JS port) can handle typos against a game-vocabulary dictionary. The only machine-readable dialect data found is the small Universal Dependencies treebanks (Neapolitan, Sicilian, Ligurian). Street-slang lexicons have to be hand-authored.

### Cited Findings
- The npm packages `snowball-stemmers` 0.6.0 (ISC) and `symspell-ex` 1.1.10 (MIT) exist. RosaeNLG uses `snowball-stemmer.jsx` (MIT). — [npm: snowball-stemmers](https://registry.npmjs.org/snowball-stemmers/latest); [npm: symspell-ex](https://registry.npmjs.org/symspell-ex/latest); [RosaeNLG resources](https://rosaenlg.github.io/rosaenlg/rosaenlg/3.0.0/advanced/resources.html)
- **Norm It!** (LREC 2020) is a lexical normalisation dataset for Italian social media: **12,822 annotated words**, Cohen's kappa 78.64. Its example "joker cmq nn e' nnt di ke !" shows vowel omission (nn→non) and k-for-ch. — [LREC 2020 Norm It! PDF](https://preview.aclanthology.org/fix_video/2020.lrec-1.769.pdf)
- Learner guides (not corpus-derived) agree on xké/xke = perché, cmq = comunque, nn = non. They describe vowel deletion and "x" = "per" as the productive patterns; FluentU lists over 75 terms. — [Italianismo](https://italianismo.com.br/de/textspeak-italiano-abreviacoes-italianas/); [Dummies](https://www.dummies.com/article/texting-and-chatting-in-italian-164236); [FluentU](https://www.fluentu.com/blog/italian/italian-internet-text-slang/)
- **UD Neapolitan RB**: example sentences translated from Italian by a native speaker. CC BY-SA 4.0, in UD 2.18. It uses a breve diacritic for reduced vowels because Neapolitan orthography isn't standardised. — [UD Neapolitan RB](https://universaldependencies.org/treebanks/nap_rb/index.html)
- **UD Sicilian STB**: a parallel Sicilian–Italian corpus, 505 sentences, about 10,900 tokens, in UD since v2.17. — [UD Sicilian STB](https://universaldependencies.org/treebanks/scn_stb); [CEUR-WS paper](https://ceur-ws.org/Vol-4112/16_main_long.pdf)
- A UD Ligurian (GLT) treebank also exists; Ligurian covers Genoese. — [UD v2 / search result listing](https://arxiv.org/pdf/2004.10643)
- The Anita lemmatiser (Tamburini) is a reference Italian lemmatiser that also uses large lexica. It is not JS. — [Anita paper](https://corpora.ficlit.unibo.it/People/Tamburini/Pubs/Anita-LemmatiserLNCS2013.pdf)

### Inferences
- Recommended NLU pipeline for player input:
  1. Lowercase, then strip diacritics into a second key (perche/perché).
  2. Split elisions on apostrophes: `l'amico` → `l' amico`, `c'è` → `c' è`, `dov'è`.
  3. Expand texting forms: x→per, xké/xche/pk→perché, cmq→comunque, nn→non, tvb→ti voglio bene, k→ch.
  4. Detach enclitics from verbs with a suffix list (-mi -ti -lo -la -ci -ne -glielo -melo -telo).
  5. Look up a lemma in a pruned Morph-it! map; fall back to Snowball stem.
  6. Correct typos with SymSpell at edit distance 2 over the pruned vocabulary.
  7. Use intent and keyword matching (not full parsing), ELIZA/Façade-style.
- Dialect expressions for street comedy (Roman "daje", "ammazza", "sticazzi"; Neapolitan "uè", "jamme", "azz"; and so on) will in practice come from hand-curated lists. The UD treebanks are too small and formal to mine for street slang, but they can check spelling conventions. This is an inference; no slang-specific open dataset was found.
- Wiktionary/kaikki tags (regional, slang, vulgar, Roman, Neapolitan) are the likeliest machine-readable slang source. Filter the 41.8 MB gz raw extract at build time.

### Gaps
- I found no open, licensed Italian youth-slang dictionary dataset. Treccani "neologismi" and Slengo.it exist but were not verified for licence or downloadability.
- I didn't check the Norm It! dataset's download licence.
- I didn't verify the Italian support or dictionary size of the `symspell-ex` and `snowball-stemmers` packages.

---

## 4. Computational humour: theory and systems (incongruity, GTVH, JAPE, STANDUP, HAHAcronym, Mihalcea & Strapparava)

### Takeaway
Implemented humour generators from JAPE to HAHAcronym all have the same shape: a lexical database, a **schema** that picks words standing in a specific relation (homophone, antonym, opposed domain), and a **surface template**. HAHAcronym, an Italian FBK/ITC-irst project, shows that a hand-built **domain-opposition table** over WordNet Domains plus rhyme/rhythm constraints gets about 70% "funny enough" ratings versus under 8% for random lexical choice. Recognition work shows alliteration, antonymy and adult-slang features alone already separate one-liners from non-jokes well above chance.

### Cited Findings
- **HAHAcronym** (Stock & Strapparava, ITC-irst Trento) was "the first European project devoted to computational humor (EU project IST-2000-30039)". Its goal was "an acronym ironic re-analyzer and generator". — [ACL 2005 demo paper P05-3029](https://aclanthology.org/P05-3029/)
- Core mechanism: "an incongruity detector/generator … detect semantic mismatches between expected sentence meaning and other readings". It uses WORDNET DOMAINS (synsets labelled with domains such as MEDICINE and ARCHITECTURE) plus "an independent structure of domain opposition, such as RELIGION vs. TECHNOLOGY, SEX vs. RELIGION … as a basic resource for the incongruity generator". — [P05-3029](https://aclanthology.org/P05-3029/)
- Other resources it used: a parser, an acronym grammar, morphological analysers, **rhyming dictionaries**, a proper-noun database and "a dictionary of hyperbolic adjectives/adverbs". — [P05-3029](https://aclanthology.org/P05-3029/)
- Algorithm:
  1. Parse the acronym into a logical form.
  2. Keep the head of the highest-ranking NP and modify the rest (for example the adjectives).
  3. Search for substitutions that preserve the initial letter, using semantic-field oppositions and "reproducing rhyme and rhythm". Adjectives use "antonym clustering" in WordNet.

  Examples: "FBI → Fantastic Bureau of Intimidation", "ACM → Association for Confusing Machinery". The system was "slightly biased … towards the domains FOOD, RELIGION, and SEX". — [P05-3029](https://aclanthology.org/P05-3029/)
- Evaluation: 30 American university students rated 80 re-analysed and 80 generated acronyms on a 5-level scale. "Almost 70% were rated funny enough (without humorous strategies the figure was less than 8%)". Generation was positive "in 53% of the cases". The system won a jury's special prize in an RAI acronym contest. — [P05-3029](https://aclanthology.org/P05-3029/)
- Further references: Stock & Strapparava, "HAHAcronym: Humorous Agents for Humorous Acronyms", *Humor* 16(3), 2003, pp. 297–314; and "Getting Serious About the Development of Computational Humor", IJCAI 2003, pp. 59–64. — [FBK CRIS](https://cris.fbk.eu/handle/11582/528); [IJCAI 2003](https://mlanthology.org/ijcai/2003/stock2003ijcai-getting)
- **Mihalcea & Strapparava, "Making Computers Laugh" (HLT/EMNLP 2005)**:
  - Data: about 24,000 one-liners bootstrapped from the web, about 16,000 after de-duplication. One-liners are short, "usually 15 [words] or less".
  - Stylistic features were alliteration (with rhyme and word repetition), antonymy (WordNet antonymy, plus indirect antonymy for adjectives via similar-to) and adult slang (extracted from WordNet Domains).
  - Overall accuracy was 79.15% (vs BNC) to 96.95% (vs Reuters) against a 50% baseline. Stylistic features alone scored between roughly 52% and 77%, depending on the negative set; individual figures included 74.31% and 76.73%.

  — [ACL H05-1067](https://aclanthology.org/H05-1067)
- Mihalcea & Strapparava's antonymy examples: "A clean desk is a sign of a cluttered desk drawer." and "Always try to be modest and be proud of it!" — [H05-1067](https://aclanthology.org/H05-1067)
- **JAPE** (Binsted & Ritchie, AAAI-94) generates punning riddles from humour-independent lexical entries. Its rules were derived from children's joke books, and 8–11-year-olds judged its output to be recognisably jokes, though "some of them are not very good jokes". The three phonological-ambiguity strategies are syllable substitution, word substitution and metathesis. — [arXiv cmp-lg/9406022](https://arxiv.org/abs/cmp-lg/9406022); [HAHAcronym paper's summary of Binsted & Ritchie](https://aclanthology.org/P05-3029/)
- **STANDUP** (Ritchie, Manurung et al., Aberdeen/Edinburgh) is a Java reimplementation inspired by JAPE. It is aimed at children with communication disabilities and lets the user "step through" joke creation. It separates **schemata** (relations between key words) from **templates** (surface form). Its rules are hand-written; STANDUP has 11 schemas. — [Aberdeen STANDUP paper](https://abdn.ac.uk/media/site/ncs/documents/ijwcc07.pdf); [Sussex lecture notes](https://users.sussex.ac.uk/~christ/crs/gc/lec05.html)
- T-PEG (Hong & Ong, 2009) extracts riddle templates automatically from a corpus of exemplar punning riddles. — [ACL W09-2004](https://aclweb.org/anthology/W09-2004.pdf)
- The HAHAcronym paper describes the incongruity theory (Raskin 1985): "humor is created out of a conflict between what is expected and what actually occurs … different interpretations of material must be possible (and some not detected before the culmination of the humorous process)". It cites Attardo 1994, *Linguistic Theory of Humor* (Mouton de Gruyter). — [P05-3029](https://aclanthology.org/P05-3029/)

### Inferences
- GTVH background (Attardo & Raskin 1991, from training knowledge, not fetched this session) defines six Knowledge Resources, ordered from most to least determining:
  - **SO** script opposition (real/unreal, normal/abnormal, possible/impossible; concretely good/bad, life/death, sex/non-sex, money/no-money, high/low status)
  - **LM** logical mechanism (role reversal, false analogy, juxtaposition, garden path, exaggeration)
  - **SI** situation
  - **TA** target (butt)
  - **NS** narrative strategy (one-liner, dialogue, riddle)
  - **LA** language (exact wording, punchline position)

  This maps directly onto a joke-generator data structure: `{SO, LM, SI, TA, NS, LA}` slots filled from game state.
- Safety rule for the game: put the HAHAcronym-style "domain opposition table" under explicit authorial control. HAHAcronym biased towards RELIGION and SEX; for this project, delete RELIGION and any ethnicity or disability domains from the opposition table and from the TA (target) pool. Prefer oppositions such as high-status/low-status, tough/fragile, big talk/small act, money/no-money, mamma/street, police/petty crime, and expectation/bathos.
- A cheap Italian "funniness score" for ranking generated candidates combines alliteration (shared initial phonemes), presence of antonym pairs (from MultiWordNet), a slang/vulgar-register token, and a short length (≤15 words), following Mihalcea & Strapparava.
- The STANDUP schema/template split is the right architecture for JS. Schemas are pure functions over the lexicon that return slot bindings; templates are Italian strings rendered through the agreement realiser from section 2.

### Gaps
- STANDUP's schema library and lexicon are not available as a downloadable package (search found none).
- I found no Italian-language humour corpus. Strapparava/Reyes et al. have done Italian irony work (for example SENTIPOLC irony tasks at EVALITA), but it was not verified this session.
- I didn't fetch a primary source for the GTVH details (Attardo & Raskin 1991, *Humor* 4(3–4)).

---

## 5. Games with procedural or emergent comedy, and comedy structure that can be proceduralised (setup/punchline, callbacks, rule of three, escalation, Nothing Forever)

### Takeaway
The best-documented procedural-comedy failure is *Nothing, Forever* (AI Seinfeld). It was suspended from Twitch for 14 days in February 2023 after its GPT-3-generated stand-up segment produced a transphobic bit; the developers blamed a misconfigured content filter. That is a strong argument for authored, template-based comedy with closed vocabularies over open generation. I found no peer-reviewed sources on proceduralising sitcom structure in this session.

### Cited Findings
- *Nothing, Forever* (Mismatch Media) was suspended from Twitch for 14 days on about 5 February 2023 after its AI character "Larry" did a transphobic stand-up routine. Twitch's notice cited a Community Guidelines/ToS violation but did not confirm the reason. — [Vice](https://www.vice.com/en/article/ai-generated-seinfeld-show-nothing-forever-banned-on-twitch-after-transphobic-standup-bit); [The Register](https://www.theregister.com/2023/02/07/twitch_ai_seinfeld/)
- The developers said they had switched models and were "not correctly leveraging OpenAI's content moderation tools", and that "The text we generated was a mistake, we are super embarrassed". Text came from GPT-3, with TTS audio and AI-generated scenes. — [The Register](https://www.theregister.com/2023/02/07/twitch_ai_seinfeld/); [Shacknews](https://www.shacknews.com/article/134035/twitch-bans-ai-seinfeld-transphobic-jokes)
- Outlets differ on whether the bit was described as transphobic only or also homophobic. — [Engadget](https://www.engadget.com/ai-seinfeld-bigoted-transphobic-hateful-moderation-193449772.html); [Exclaim](https://exclaim.ca/film/article/ai-generated_seinfeld_suspended_from_twitch_for_transphobic_jokes)
- Morkes et al. (1999), cited in HAHAcronym: in computer-mediated tasks, participants who received jokes rated the partner or computer as more likable and competent, reported more cooperation, and joked back more often. Humour enhanced likeability "without distracting users". — [P05-3029](https://aclanthology.org/P05-3029/)

### Inferences (design proposals from comedy-craft background knowledge, not sourced this session)
- **Setup/punchline as a state machine.** An NPC line has a `setup` that establishes script A, an optional `misdirect` that reinforces A, and a `punch` that reveals script B (the opposed script). The engine picks B from the opposition table given A and the current situation.
- **Rule of three.** Generate two items from the same category (normal, normal) and a third from the opposed domain ("Ho perso il portafoglio, le chiavi e la dignità"). This is trivially templatable: `[X1], [X2] e [Y_opposto]`.
- **Callbacks and running gags.** Keep a per-save "comedic memory" of salient events (the player fell in the harbour, an NPC lost a bet) with a use count. Later templates can reference them ("come quella volta che sei caduto in porto"). Decay them or retire them after 3–4 uses so they stay fresh; escalate on each reuse.
- **Escalation.** Each repetition of a gag raises intensity one step on a scale (annoyed → offended → theatrical outrage → calling mamma).
- **"Yes, and" (improv).** When the player says something absurd, NPC response rules should accept the premise and add one detail rather than deny it. In code: classify player intent as an absurd claim, then pick an `accept+heighten` template.
- **Comedic timing in a text UI.** Put a typewriter-effect pause (300–800 ms) before the punch, a short beat after it, and an NPC reaction emote after that.
- **Combinatorics in the style of Cards Against Humanity or Jackbox.** Comedy comes from players juxtaposing authored fragments, not from generation. Authored fragment pools with the SO/TA tags above, combined by the engine, are both safe and funny.
- **Systemic slapstick** (Goat Simulator, Untitled Goose Game, The Sims, Hitman). Comedy emerges from consistent rules colliding with dignity and status. Status reversal and deadpan NPC reactions to absurd systemic events are cheap to author as reaction barks.
- **Safety by construction.** Keep the TA (target) pool closed and authored: the player, the speaker themself, authority figures, pretentiousness, bad luck, local football rivalries. Never put protected-category nouns in any slot, and keep a blocklist on generated combinations. This is the lesson of *Nothing, Forever*.

### Gaps
- I didn't find or verify any GDC talks on comedy in games (for example on Untitled Goose Game, Goat Simulator or The Sims) in this session.
- I found no academic work on procedural sitcom structure; "Bot or Not" was not researched.
- I didn't search for Italian stand-up structure literature (Italian comedy-writing manuals).
