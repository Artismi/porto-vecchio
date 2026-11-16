# Architecture and performance: simulating hundreds to about 1000 NPCs with memory, beliefs, plans and event logs in a mobile-browser three.js game

Scope: the engineering side only. Target platforms are a three.js game served from Vercel and wrapped as an Android WebView APK, running on Intel Iris Xe laptops and mid-range phones.

Conventions:
- **UNVERIFIED** marks numbers or claims I could not confirm against a source fetched during this session. Most of these come from background knowledge.
- Every claim not marked UNVERIFIED has an inline source.

## 1. AI LOD and scheduling: shipped games, off-screen or abstract simulation, rehydration

### Takeaway
Shipped games reach about 1000 NPCs by making each NPC drastically simpler. The proven techniques are:
- scripted routines instead of planners;
- open-loop action queues that only re-decide when the queue is empty;
- event-driven timers (a priority queue) instead of per-frame ticks;
- update rates that scale with proximity or importance;
- a budgeted LOD allocator rather than fixed distance thresholds.

For this project, "simulation" off screen should mean computing state from schedules and timestamps on demand, not ticking each NPC.

### Cited Findings
- **Project Highrise (SomaSim)** had an explicit goal of 1000 NPCs at 60 FPS "on a reasonably recent desktop-grade personal computer". NPCs had to be simulated continuously, not instanced and culled, because their economic activity drives the game — [Zubek, "1000 NPCs at 60 FPS", Game AI Pro 3 ch.34](http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter34_1000_NPCs_at_60_FPS.pdf)
- Zubek dropped the planner and used a script scheduler (daily routines plus probabilistic "oneshots"). He also removed internal physiological state such as hunger and tiredness. His reason was that "the utility of detailed NPC representation is inversely proportional to the number of NPCs the player has to manage" — [Zubek](http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter34_1000_NPCs_at_60_FPS.pdf)
- **Open-loop action queues:** action selection produces a short action sequence, about a dozen actions covering roughly an hour of game time or under a minute of real time. The queue runs without re-sensing the world. On failure it is flushed and re-planned, so "the system only evaluates the world when it has nothing to do" — [Zubek](http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter34_1000_NPCs_at_60_FPS.pdf)
- **Model reduction for pathfinding:** a 100×150 grid (15,000 cells) became about 100 nodes and 400 edges (floor plates plus connectors). After that, plain A* was enough — [Zubek](http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter34_1000_NPCs_at_60_FPS.pdf)
- **Time-slicing** (for example a 2 ms slice per frame) "reduces spikes; it doesn't improve overall framerate". Busy-wait updates, such as timers, decays and NPC schedule updates, should instead go into a priority queue keyed on next-event time. Each frame only peeks at the head of the queue. Continuous stats are converted to "time until threshold" events and recomputed analytically when something changes — [Rez Graham, "Efficient, Event-Based Simulations", Game AI Pro Online 2021 ch.2](http://www.gameaipro.com/GameAIProOnlineEdition2021/GameAIProOnlineEdition2021_Chapter02_Efficient_Event_Based_Simulations.pdf)
- **The Sims Medieval** used a schedule system: a hierarchical FSM whose entries are driven by time or events, with the AI able to override the schedule. To avoid everyone moving at 18:00 sharp, each NPC's schedule transition is randomized with a Gaussian centred on the entry's end time. NPCs also finish their current interaction before moving — [Graham, "Breathing Life into Your Background Characters", Game AI Pro ch.36](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter36_Breathing_Life_into_Your_Background_Characters.pdf)
- **LOD Trader (Sunshine-Hill):** it replaces distance thresholds with a per-frame "portfolio" optimisation. It greedily applies the most valuable upgrades until over budget, then the cheapest-loss downgrades until under budget, using priority queues. It runs on multiple resources (CPU and memory) with a single budget. Its cost model estimates the probability of a "break in realism" from observability (screen size), attention (an EMA of observability weighted 0.7, plus camera focus weighted 0.3), player memory of the character, and return time — [Sunshine-Hill, Game AI Pro ch.14](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter14_Phenomenal_AI_Level-of-Detail_Control_with_the_LOD_Trader.pdf)
- **LOD Trader cost:** about 57 µs per frame (0.17% of the frame time), 500 kB of transition data and 48 bytes per entity. The author says both could be halved with narrower data types. In a blinded study, viewers saw fewer breaks in realism than with distance-based LOD — [Sunshine-Hill](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter14_Phenomenal_AI_Level-of-Detail_Control_with_the_LOD_Trader.pdf)
- **LOD Trader memory model parameters:** memorisation k_m = 0.6, giving about 95% in 5 s. Forgetting is k_f·L with k_f = 0.001, giving about 50% forgotten in 10 s under high load. The ambient attentional load should be set to about one third of the peak load — [Sunshine-Hill](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter14_Phenomenal_AI_Level-of-Detail_Control_with_the_LOD_Trader.pdf)
- **Shadows of Doubt** uses goal-based citizen AI. "The AI's update rate will only be high when nearest the player and when not doing actions that require [it]". Scaling with on-screen proximity makes "the performance cost of 95% of the citizens at any one time relatively insignificant" — [Shadows of Doubt DevBlog #15](https://colepowered.itch.io/shadows/devlog/78044/shadows-of-doubt-devblog-15-moving-in-the-citizens)
- **Kingdom Come: Deliverance 1 and 2:** a GDC talk by Petr Smrcek (Warhorse) covers NPCs that follow daily routines and react even when the player is far away. KCD2 has roughly 4× the NPC count, nearly 2400, with about half of them in one city — [GDC Vault: Supporting Thousands of NPCs in KCD/KCD2](https://gdcvault.com/play/1035718/Supporting-Thousands-of-NPCs-in); [GDC schedule](https://schedule.gdconf.com/session/supporting-thousands-of-npcs-in-kingdom-come-deliverance-kingdom-come-deliverance-ii/915120)
- **KCD1 LOD numbers:** an AI LOD distance setting with defaults of 100 and 130 appears on a mod page. This is a community source, not the developer — [Nexus mod](https://www.nexusmods.com/kingdomcomedeliverance/mods/1552)
- **The Sims 3 "Story Progression"** lets every Sim in the open neighbourhood continue their lives autonomously. Results are reported to the player as story notifications rather than animated. With it off, inactive Sims no longer get or quit jobs automatically. I found no quantified performance data, only forum anecdotes — [Wikipedia: The Sims 3](https://www.Wikipedia.org/wiki/HELS); [EA forum](https://forums.ea.com/discussions/the-sims-3-en/alternative-story-progression/2078684)
- **Talk of the Town** (Ryan and Mateas) simulates character knowledge phenomena such as belief propagation, misremembering and lies across a town. This is a relevant reference for belief storage — [Game AI Pro 3 ch.37](http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter37_Simulating_Character_Knowledge_Phenomena_in_Talk_of_the_Town.pdf) (listed in the index only; content not read)

### Inferences
- **Recommended tier scheme** for about 1000 NPCs:
  - **Tier 0, visible and near:** under about 30 NPCs. Per-frame movement and animation, with a decision tick every 100–250 ms.
  - **Tier 1, near but off-screen:** under about 100 NPCs. Logic only at 1–2 Hz, no animation, moving along path polylines by time interpolation.
  - **Tier 2, the rest of the city:** event-driven only. Each NPC is (routine id, current entry, start time, destination) plus a next-event entry in a global heap. Position is derived analytically, `pos = lerp(path, (now - t0)/duration)`, when queried.
  - **Tier 3, statistical:** "story progression" style dice rolls at coarse intervals, for example once per game hour per district, producing log events without movement.
  - The tier counts above are my proposal, not sourced.
- **Rehydration** when an NPC enters view:
  1. Evaluate the schedule at the current time to get the entry, location and progress.
  2. Snap position along the cached path.
  3. Resolve any pending heap events whose time has passed, in order. Each event handler must be deterministic and idempotent given (seed, npcId, time).
  4. Only then promote the NPC to tier 0.
  - Graham's analytic "time until threshold" model makes step 3 cheap. Zubek's open-loop queues make step 1 valid, because there is no hidden closed-loop state to reconstruct.
- **Budgeting:** a simplified LOD Trader (greedy upgrades and downgrades against a fixed ms budget) is cheap: 57 µs in C++, so plausibly a few hundred µs in JS (UNVERIFIED). It handles the "crowd gathers around the player" case that fixed distances fail.
- **Following Zubek**, keep needs and beliefs coarse for background NPCs and spend richness on the roughly 20–50 NPCs the player actually interacts with.

### Gaps
- I could not access KCD's actual per-tier update rates or the GDC slides.
- The Sims 4's off-lot simulation internals are not covered.
- "Simulating a City" was not found as a Game AI Pro chapter title. The closest are Talk of the Town and Driver San Francisco (not read).
- There is no published per-NPC microsecond cost for any of these games.

## 2. Data-oriented design in JS: typed arrays and SoA, ECS libraries, GC avoidance

### Takeaway
For 1000 entities, any reasonable JS ECS iterates in well under a millisecond. Library choice matters less than avoiding per-frame allocation and keeping hot numeric state in typed arrays. bitECS (SoA on typed arrays) is consistently among the fastest. Becsy and Koota are within about 1.5–3× of it in most scenarios.

### Cited Findings
- **EliCS benchmark suite** (noctjs/ecs-benchmark scenarios). Each scenario is run 25 times and averaged, in ms, lower is better. The machine is unspecified. Selected rows:

  | Scenario | EliCS | bitECS | Koota | Becsy | ecsy |
  |---|---|---|---|---|---|
  | Packed iteration, 1,000 entities × 5 queries | 7.87 | 9.33 | 14.34 | 14.12 | 16.05 |
  | Simple iteration, 4,000 entities | 9.72 | 9.81 | 20.76 | 19.64 | 24.75 |
  | Entity cycle (create and destroy) | 24.99 | 37.14 | 100.05 | 28.58 | 143.81 |
  | Add/remove component, 1,000 entities | 17.19 | 25.25 | 47.09 | 19.05 | 58.53 |

  — [EliCS benchmarks](https://elixr-games.github.io/elics/benchmarks.html). Miniplex is not included. Absolute ms are per benchmark run of many iterations, not per frame.
- A third-party write-up reports bitECS at about 335K ops/sec in noctjs's packed_5 scenario — [DEV.to archetype ECS](https://dev.to/grzott/archetype-ecs-in-typescript-why-i-didnt-use-bitecs-or-miniplex-22cb)
- The bytro/ecs-benchmark suite lists miniplex among the "SoA implementations". The column headers were not visible in what I retrieved — [bytro/ecs-benchmark](https://github.com/bytro/ecs-benchmark)

### Inferences
- **Structural changes are the expensive operations**, not iteration: entity creation and destruction, and adding or removing components (see the Entity cycle and Add/remove rows). Represent NPC state changes (sleeping, working, in a conversation) as enum fields in typed arrays, not as component add/remove.
- **Proposed layout** for N ≤ 1024:
  - Fixed-capacity SoA: `Float32Array posX/posZ`, `Uint16Array routineId/entryIdx/locId`, `Uint32Array nextEventTime`, `Uint8Array tier/mood…`. That is roughly 30–60 bytes per NPC, about 60 kB in total.
  - Variable-size data (beliefs, memories) goes in per-NPC ring buffers inside one big preallocated `Uint32Array` arena (see section 5).
  - A plain hand-written SoA without a library is entirely adequate at this scale. bitECS is the best-performing option if a library is wanted (its v0.4 API also stores components as user-supplied arrays; UNVERIFIED).
- **GC avoidance:**
  - Preallocate scratch `Vector3` objects and arrays.
  - Avoid closures, `Array.map` and object literals in per-frame loops.
  - Use an indexed binary heap over typed arrays for the event queue.
  - Pool event-log records as integer tuples.
  - The general principle (allocation causes GC pauses) is well established, but I fetched no source with measured V8 mobile GC pause durations. UNVERIFIED: minor (scavenge) GCs are typically about 1 ms or less, and major GCs can take several ms on phones.

### Gaps
- I found no miniplex numbers from the same run as bitECS and Becsy.
- I found no benchmark run on mobile hardware.

## 3. Web Workers, SharedArrayBuffer and OffscreenCanvas on mobile; COOP/COEP on Vercel and in a WebView APK

### Takeaway
Run the social simulation (event heap, routine evaluation, sifting, belief updates) in a dedicated Worker. Communicate with `postMessage` plus transferable ArrayBuffers, **not** SharedArrayBuffer. SAB requires cross-origin isolation, which works on Vercel with two headers. Android WebView reportedly **cannot** be cross-origin isolated, because it runs a single renderer process per app. A design that depends on SAB would therefore break the APK.

### Cited Findings
- **Cross-origin isolation** needs `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`, Chrome 96+). Check with `self.crossOriginIsolated`. Consequences:
  - Cross-origin images, scripts and iframes must send CORP or CORS.
  - Workers must be same-origin.
  - `window.opener` is severed.
  - In return it unlocks SAB, WASM threads, `performance.measureUserAgentSpecificMemory()` and roughly 5 µs timer resolution, against 100 µs or coarser otherwise.
  - Roll out via `Cross-Origin-Embedder-Policy-Report-Only` first.

  — [web.dev COOP/COEP](https://web.dev/articles/coop-coep)
- SAB on Android Chrome has been gated on COOP/COEP since Chrome 88, and on desktop Chrome since 92 — [Chrome blog](https://developer.chrome.com/blog/enabling-shared-array-buffer)
- **Android WebView** reportedly does not support cross-origin isolation even with correct headers. WebView uses one renderer process per app, so `crossOriginIsolated` stays false and SAB is unavailable. The bug was closed and the reporter disputed the closure (March 2025) — [Chromium issue 40914606](https://issues.chromium.org/issues/40914606) (summary via search; I could not open the page itself). This is corroborated by projects shipping non-SAB fallbacks for WebView — [cmer81/maps PR #128](https://github.com/cmer81/maps/pull/128) — and by a vendor that declares WebView unsupported for this reason — [Shen.AI troubleshooting](https://developer.shen.ai/getting-started/web-troubleshooting)
- **Conflicting claim:** secondary 2026 sites report a new Android WebView API that allowlists cross-origin-isolated features, including SAB, for trusted origins — [tech-insider](https://tech-insider.org/android-webview-sharedarraybuffer-allowlist-2026/) (the page now returns HTTP 410); [packettribune](https://packettribune.com/topic/tech/android-patch-new-webview-api-enables-cross/). **Unconfirmed by any primary Android or Chromium source.**

### Inferences
- **Recommended architecture:**
  - The main thread owns three.js plus tier-0 movement and animation.
  - A sim worker owns the entire social model, the event heap and the query engine.
  - Each sim tick (2–10 Hz) the worker posts a compact snapshot for visible and nearby NPCs only: ids, target positions, animation state, speech bubbles. Use a transferred `Float32Array`, ping-ponging two buffers.
  - The main thread interpolates between snapshots.
  - Queries ("what does X think of Y") go through async request/response messages.
  - This works identically on Vercel, desktop Chrome, iOS Safari and Android WebView, with no COOP/COEP needed. Avoiding COOP/COEP also avoids breaking third-party embeds and CDN assets.
- **Use SAB only as an optional fast path**, gated on `crossOriginIsolated`. On Vercel the headers would go in `vercel.json` (UNVERIFIED syntax: a `headers` array per source path).
- **In the APK**, if the WebView loads local assets, `WebViewAssetLoader` can attach custom headers. Even so, the reported single-process limitation would keep `crossOriginIsolated` false. UNVERIFIED; test on device with `console.log(crossOriginIsolated)`.
- **OffscreenCanvas** (rendering three.js in a worker) is not needed for this problem. The bottleneck is simulation, not rendering. Moving rendering would also complicate input and DOM UI.
- UNVERIFIED (background knowledge, not fetched): OffscreenCanvas WebGL ships in Safari 17+. Workers and transferables are universally supported.

### Gaps
- The postMessage cost for about 10–50 kB transferables on mid-range Android was not measured; transfer is effectively zero-copy (UNVERIFIED).
- The current iOS Safari behaviour for SAB under COOP/COEP is not fetched. UNVERIFIED: supported since Safari 15.2.

## 4. Query engines for event logs and story sifting in JS

### Takeaway
DataScript is the established Datalog-in-JS engine (Felt is built on it). It is fine for ad-hoc, occasional sifting queries over tens of thousands of datoms. Query cost scales with result size, and bulk transactions are slow at hundreds of thousands of datoms. Per-frame or per-event matching should use incremental, Winnow-style partial-match tracking or hand-written indexed matchers. For a game, the pragmatic choice is hand-written indexes plus a small incremental pattern matcher running in the worker.

### Cited Findings
- **DataScript** is "an immutable in-memory database and Datalog query engine for JS engines". Its benchmark suite includes:
  - q1: one clause over a database of 100k datoms, about 12k tuples returned;
  - q2: two clauses with one join, about 12k tuples;
  - add-1: 100k datoms, one transaction each.

  The JVM build was reported as 5–6× faster than JS/V8 for single-clause queries and 3–4.5× for joins — [DataScript changelog (cljdoc)](https://cljdoc.org/d/datascript/datascript/1.7.5/doc/changelog)
- **User reports from the DataScript channel:**
  - Loading about 540k datoms took around 1.5 minutes in `transact!`.
  - "query performance is proportional to the size of the result".
  - Direct index access with `d/datoms` "is still fast and comparable to lookup in a map".

  — [clojurians log](https://clojurians-log.clojureverse.org/datascript/2021-03-16/1615881093.005000)
- **Felt** (Kreminski et al., ICIDS 2019) sifts with Datalog-like patterns over an EAV graph. **Winnow** (AIIDE 2021) is a DSL for *incremental* sifting: patterns advance partial matches as events arrive, with negation windows that kill partial matches. A Rust reimplementation adds fingerprint deduplication to stop partial matches accumulating without bound — [fabula crate docs (secondary)](https://docs.rs/crate/fabula/latest/source/src/engine/mod.rs)
- **Datalevin** benchmarks its query engine against DataScript's existing benchmark. It is a JVM/native store, not browser-targeted — [Datalevin query engine doc](https://cljdoc.org/d/datalevin/datalevin/0.9.4/doc/query-engine)

### Inferences
- **Recommended design:**
  1. Keep the event log as an append-only typed-array table: `[t, type, actor, target, place, arg]`, with secondary indexes as per-actor and per-type linked lists or bucket arrays.
  2. Express sifting patterns as Winnow-style state machines (sequence of event types plus variable bindings plus "unless" windows). Each new event touches only the partial matches waiting on its type, which is effectively rete-like alpha indexing.
  3. Use DataScript only offline, for debugging or designer tools, or for occasional queries in the worker.
  - Reason: DataScript's ClojureScript runtime adds bundle weight (UNVERIFIED, roughly hundreds of kB), and its immutable updates allocate per transaction, which works against GC goals.
- I fetched no performance figures for nools or durable_rules. nools is an old, unmaintained JS rete engine and durable_rules is a Python/C engine with a JS binding (both UNVERIFIED). Neither is recommended over a custom matcher at this scale.

### Gaps
- I found no published ms timings for DataScript in the browser, and none for Felt or Winnow.
- Bundle sizes were not verified.

## 5. Bounded memory: compaction, summarisation and per-NPC belief caps

### Takeaway
Use fixed-capacity per-NPC stores with importance-scored eviction. Use a global event log with tiered compaction: raw recent events, then summarised "episodes", then statistics only. Use the forgetting-curve idea (exponential decay of salience) to decide eviction.

### Cited Findings
- An asymmetric EMA (fast memorisation, slow load-dependent forgetting) is a cheap, proven per-entity memory model. The LOD Trader used it for player memory of NPCs (k_m = 0.6, k_f = 0.001·L) at 48 bytes per entity — [Sunshine-Hill](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter14_Phenomenal_AI_Level-of-Detail_Control_with_the_LOD_Trader.pdf)
- Winnow-style incremental sifting must actively kill and deduplicate partial matches, or their number grows without bound — [fabula docs](https://docs.rs/crate/fabula/latest/source/src/engine/mod.rs)

### Inferences (design, no external measurement)
- **Per NPC:**
  - Beliefs: K = 32 slots of `(subject u16, predicate u8, value i8, confidence u8, source u16, t u32)`, about 12 bytes each, so about 400 bytes.
  - Memories: M = 64 slots, about 16 bytes each, so about 1 kB.
  - For 1000 NPCs that is about 1.5 MB, stored in a single preallocated arena.
- **Salience** = base importance (by event type, plus a bonus if the event involves self or kin, or high emotion), multiplied by `exp(-(now - t)/τ)`, plus a recall bonus whenever the memory is used in dialogue. On insert into a full store, evict the minimum-salience slot.
- **Global log compaction:**
  - Keep the last N days raw.
  - Older events collapse into per-(actor, type, period) counters ("Marco drank at the tavern 14 times in March") plus the few events referenced by a sifted story or belief, which are pinned.
  - Sifted stories become first-class records that cite event ids.

### Gaps
- I found no sourced measurements of memory or log growth in comparable games.
- I did not retrieve the Ebbinghaus or Generative Agents scoring literature in this pass; another researcher may cover it.

## 6. Save systems in the browser: IndexedDB, compression, versioning, seeds and deltas, autosave, quotas

### Takeaway
Save a versioned binary snapshot containing:
- the seed;
- the world time;
- the SoA arrays;
- the belief and memory arenas;
- the compacted log.

Compress it with `CompressionStream('gzip')` and store it in IndexedDB as a Blob. Autosave on visibility change and pause, plus a periodic timer, written from the worker. Call `navigator.storage.persist()`. Quotas are not the constraint: a few MB of compressed state is tiny against roughly 60% of disk. Eviction is the risk, especially in Safari, so offer export as a file.

### Cited Findings
- **Quotas:**
  - Chrome/Chromium: up to 60% of total disk per origin; the browser uses at most about 80% of disk overall.
  - Safari 17+ / iOS 17+ browser apps: about 60%.
  - WKWebView embedded apps: about 15%.
  - Firefox best-effort: the smaller of 10% of disk or 10 GiB per group.

  — [MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- **Eviction:**
  - LRU-by-origin under storage pressure. Origins granted `persist()` are skipped.
  - Eviction is all-or-nothing per origin, across IndexedDB, Cache and OPFS.
  - Safari deletes script-written storage for origins with no user interaction in the last 7 days of browser use (when cross-site tracking prevention is on).
  - Chrome and Safari auto-grant or deny `persist()` from engagement, with no prompt. Firefox prompts.
  - Handle `QuotaExceededError`.

  — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- MDN does not document Android WebView quotas — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

### Inferences
- **Android WebView:** IndexedDB in a WebView lives in the app's private data directory and follows Chromium quota logic (UNVERIFIED). It is not subject to Safari's 7-day rule. It is wiped on "clear app data" or uninstall. For safety, mirror saves to native storage through a JS bridge if the APK has one.
- **Format:**
  - Header: `{magic, schemaVersion, gameVersion, seed, worldTime}`.
  - Then length-prefixed raw typed-array sections. Typed arrays serialise with no JSON overhead.
  - Pipe through `CompressionStream('gzip')`. Typed numeric data with many zeros should compress well (UNVERIFIED ratio).
  - Migrations are an ordered list of `v(n)→v(n+1)` functions over the decoded sections.
  - Keep two slots (A/B) and write the new slot before flipping a pointer record, so a crash never corrupts the only save.
- **Deterministic seed plus deltas:** with a seeded PRNG keyed by (worldSeed, npcId, day), routines and stochastic schedule jitter are regenerable. Save only divergent state (relationships, beliefs, memories, the log, player-caused changes). Raw snapshots at about 1000 NPCs are only a few MB anyway, so full snapshots are simpler and safer than replay.
- **Autosave cadence:** every in-game day or every 2–5 real minutes, plus on `visibilitychange` → hidden (the reliable mobile "app backgrounded" signal) (UNVERIFIED as best practice). Serialise in the worker so the main thread never stalls.
- UNVERIFIED (not fetched): `CompressionStream` is supported in Chrome 80+ and Safari 16.4+.

### Gaps
- I did not fetch exact Android WebView quota documentation.
- No CompressionStream throughput figures on mobile.

## 7. Measured frame budgets and profiling

### Takeaway
At 60 fps the frame is 16.7 ms. Browsers need about 6 ms of that, so the guideline is 10 ms or less of your own work per frame, and three.js rendering on a mid-range phone will consume most of it. A defensible budget for main-thread game logic is about 1–2 ms per frame. The social simulation should run in a worker, in chunks of 50 ms or less, at low frequency.

### Cited Findings
- **RAIL:**
  - Produce each animation frame in 10 ms or less, because the browser needs about 6 ms of the 16 ms frame.
  - Do idle work in chunks of 50 ms or less.
  - Respond to input within 100 ms, processing input events within 50 ms.
  - Baseline test device: a mid-range Android phone (Moto G4 class), with DevTools CPU throttling.

  — [web.dev RAIL](https://web.dev/articles/rail)
- 60 fps leaves "a measly 16.7ms" for everything, including AI. Time-slicing at 2 ms is given as an example AI slice — [Graham 2021](http://www.gameaipro.com/GameAIProOnlineEdition2021/GameAIProOnlineEdition2021_Chapter02_Efficient_Event_Based_Simulations.pdf)
- When isolated, `performance.now()` resolution improves to about 5 µs, against 100 µs or coarser otherwise. This matters for micro-profiling — [web.dev COOP/COEP](https://web.dev/articles/coop-coep)

### Inferences
- **Proposed budgets** (UNVERIFIED; must be measured on the actual devices):
  - **Main thread, mid-range Android:** about 1.5 ms per frame for tier-0 NPC update and interpolation. Many mid-range phones will settle at 30 fps with three.js scenes; then the budget is 33 ms per frame, with about 3 ms for logic.
  - **Iris Xe laptop:** about 3 ms.
  - **Sim worker:** a tick of 5 ms or less at 4 Hz (2% of a core), with heavy jobs (sifting, daily compaction, saves) sliced to 50 ms or less, following RAIL.
- **Profiling tools:**
  - Chrome DevTools Performance panel with CPU throttling (4× or 6×).
  - Remote debugging of the Android WebView from `chrome://inspect`. The APK needs `WebView.setWebContentsDebuggingEnabled(true)` (UNVERIFIED API name).
  - `performance.mark`/`measure` around sim phases.
  - An in-game rolling histogram of sim tick ms, including p95 and p99.
  - Memory panel allocation sampling to find per-frame allocations.
  - `measureUserAgentSpecificMemory` only when isolated.

### Gaps
- I found no sourced measurements of JS game-logic throughput on specific mid-range Android SoCs or on Iris Xe. Measure on target hardware with a synthetic 1000-NPC benchmark: event heap, schedule evaluation, belief inserts.
