# Community sentiment on Postman, Insomnia and Bruno (2024-2026)

Method note: Hacker News was read directly through the hn.algolia.com API (primary sources). Reddit, Twitter/X, YouTube and Lobsters could not be fetched. Reddit appears only through search-engine snippets, and I did not verify the Twitter/X and YouTube items. Frequency rankings below are based on how often a theme recurs in the HN threads and GitHub issues I read, not on a statistical sample. The most recent HN thread, "Postman silently auto-installs AI plugins and attempts to share all API data" (item 50354960, 2026-11-03), is a major recent trigger.

## What are the top recurring reasons developers switch tools or say "I hate X"?

### Takeaway
Ranking by recurrence in the sources read: (1) mandatory login/cloud push and data-loss fear, (2) the pattern of "bait and switch" monetization (Postman, then Insomnia, now fear for Bruno and Yaak), (3) bloat, slowness and RAM from Electron and feature creep, (4) intrusive AI and privacy (spiking in Nov 2026), (5) plain-text/git-native files as the reason to pick Bruno. Collaboration, missing protocol features and discoverability are less frequent. The most distinctive meta-theme is "tool fatigue": many users have hopped Postman, then Insomnia, then Bruno, then Yaak, and expect each to degrade.

### Cited Findings
**1. Mandatory login / cloud push (most frequent)**
- cube2222 (HN, 2024-03-09): "I stopped using Insomnia after they introduced the forced login to save your collection and wiped all my stored requests" — [HN Bruno thread](https://news.ycombinator.com/item?id=39653718)
- jhoechtl (HN, 2024-03-09): "Insomnia was great. Than they more or less put of 90% of their users by forcing them in their cloud." — [same thread](https://news.ycombinator.com/item?id=39653718)
- everettwilson (HN, 2024-03-09): "Postman deleted my local data after I declined a cloud account" (as summarized by the fetch tool; the quotation marks are the fetch tool's rendering and may not be verbatim) — [same thread](https://news.ycombinator.com/item?id=39653718)
- al_borland (HN Ask HN, 2024-09-25) switched to Rapid API (Paw) after Postman pushed them to sign up for its cloud service to move to a new laptop (paraphrase) — [Ask HN](https://news.ycombinator.com/item?id=41648918)
- statenjason (HN, 2026-11-03): switched to Bruno after "getting hounded by Postman's sales team" and because "Insomnia started requiring an account"; Bruno "Works well enough without getting in my way." — [comment](https://news.ycombinator.com/item?id=50355526)
- Shorel (HN, 2026-11-03) recommends APIKulture and refuses the Postman and Insomnia login requirements (paraphrase) — [comment](https://news.ycombinator.com/item?id=50347440)
- ryaniscool (HN, 2025-12-18): "Postman requires you to have an account and log in to download or export these." (about collection files) — [comment](https://news.ycombinator.com/item?id=46310556)
- Reddit snippet via search (undated; date and thread not verified): "Postman killed the offline scratchpad and started requiring a sign-in just to fire a GET" — reported in search summary; original Reddit thread not opened ([sentinel snapshot index](https://reddit.sentinel-team.org/posts/1smyun6/snapshots/2026-04-16T18%3A19%3A18.813543Z))
- Stavros HN thread title (2025-10-21): "Postman which I thought worked locally on my computer, is down" — [thread](https://news.ycombinator.com/item?id=45651669)

**2. Monetization / "enshittification" and the switching treadmill**
- Keyframe (HN, 2026-11-03): path Postman to Insomnia to Bruno, each declining in quality, hopes Bruno holds up (paraphrase) — [comment](https://news.ycombinator.com/item?id=50356015)
- stavros (HN, 2025-10-21): cycle of Postman, Insomnia, Bruno each becoming worse; now uses Yaak and asks how long it will last (paraphrase) — [comment](https://news.ycombinator.com/item?id=45651669)
- JoeBOFH (HN, 2026-05-22): moved Postman, Insomnia, Bruno, unsure how long Bruno lasts (paraphrase) — [comment](https://news.ycombinator.com/item?id=48242200)
- reddalo (HN, 2026-11-03): praises Bruno as simple and great but worries the paid version may decline as Postman and Insomnia did (paraphrase) — [comment](https://news.ycombinator.com/item?id=50355887)
- boobsbr (HN, 2026-11-06): chose Yaak because Bruno "is following Postman's paid route" (paraphrase) — [comment](https://news.ycombinator.com/item?id=50390711)
- denvermullets (HN, 2025-02-27): frustrated by Bruno's billing change, wants "something simple that works" (paraphrase) — [Yaak thread](https://news.ycombinator.com/item?id=43195914)
- margorczynski (HN, 2024-03-09): "most probably Bruno will go the same way once they get enough users hooked in." — [thread](https://news.ycombinator.com/item?id=39653718)
- amirathi (HN, 2024-03-09): "When you raise $$$ - the nice little API client needs to become 'Enterprise API Platform'" — [thread](https://news.ycombinator.com/item?id=39653718)
- throwitaway222 (HN, 2024-03-09): "It says 'one time payment' but then it says '2 years of updates'." — [thread](https://news.ycombinator.com/item?id=39653718)
- skaluvuri (HN, 2026-02-22, Voiden affiliate, biased): single-product API tool companies face pressure to gate features: "paywalls, feature gating, and pricing complexity become almost inevitable" — [comment](https://news.ycombinator.com/item?id=47111190)
- Bruno maintainer discussion (2024): free features stay free, "Golden Edition" modules closed-source; one commenter objected to locking away previously free features — [GitHub discussion #269](https://GitHub.com/usebruno/bruno/discussions/269). Bruno later said it was retiring the "Golden Edition for Individuals" tier because most licences were bought by organizations (blog post date not confirmed) — [Bruno blog](https://blog.usebruno.com/bruno-update)
- Reddit r/webdev (2024-11-16, via search snippet, not opened): better git integration sits behind Bruno's paid tier; one commenter said they switched recommendation to Yaak — [archive](https://red.127.pp.ua/r/webdev/comments/1gsme4f/deleted_by_user)

**3. Bloat, speed, RAM (Electron)**
- unsupp0rted (HN, 2024-09-25): Postman is "so slow and heavy for what it does." — [Ask HN](https://news.ycombinator.com/item?id=41648918)
- hn_throwaway_99 (HN, 2024-03-09): "the whole Postman UI has become an overcomplicated mess in my opinion" — [thread](https://news.ycombinator.com/item?id=39653718)
- alecsm (HN, 2024-03-09): "I'm tired of Postman freezing when sending JSONs over a MB in size." — [thread](https://news.ycombinator.com/item?id=39653718)
- ho_schi (HN, 2024-03-09) on Electron: "in best case it eats a ridiculous amount of memory (factor 5x compared to native)" — [thread](https://news.ycombinator.com/item?id=39653718)
- gschier, Yaak creator (HN, 2024-09-11): "Yaak is meant to be just an HTTP client, where Postman aims to do everything related to building APIs." — [comment](https://news.ycombinator.com/item?id=41510209)
- Dev.to commenters (2025-05-12/13): Nevo David, Postman "always feels like a fight with my own pc"; Cesar Aguirre, a browser-copied cURL is "Faster than opening Postman"; author Tan Yong He on Bruno: cleaner UI "without the Postman bloat" — [Dev.to](https://dev.to/tanyonghe/ditching-postman-why-and-how-i-transitioned-to-bruno-535e/comments)
- Competitor marketing (biased): Apidog says developers "just want a fast HTTP client" — [Apidog](https://apidog.com/blog/postman-everything-app-strategy-why-developers-leaving/)
- Reddit snippet (not opened): "postman just got too bloated, switched to bruno and never looked back." — [sentinel snapshot](https://reddit.sentinel-team.org/posts/1swztuk/snapshots/2026-04-27T19%3A52%3A09.033005Z)

**4. Git-native, plain-text, offline-first (the positive pull toward Bruno)**
- reddalo (HN, 2024-11-18): prefers Bruno because plain-text files are readable in any editor and versioned with Git (paraphrase) — [comment](https://news.ycombinator.com/item?id=42170825)
- Search-result summary of a comparison: Bruno one plain-text file per request vs Postman's single large JSON blob (secondary, unverified) — [search result](https://www.marketcalls.in/softwares/why-i-switched-from-postman-to-bruno-for-api-testing.html)
- Counterpoint, karpovv-boris (HN, 2026-11-05): other clients also "store requests in a bunch of JSON files," so is Bruno's git-native claim unique? (paraphrase) — [comment](https://news.ycombinator.com/item?id=50374588)

**5. Missing features in Bruno (less frequent, mostly early 2024)**
- adhamsalama: "Doesn't seem to support advanced stuff like GraphQL, gRPC, WebSockets..." — [thread](https://news.ycombinator.com/item?id=39653718)
- anonymous344: "bruno seems really easy and good, but then.. it doesn't support cookies.." — same thread
- hackernoteng: "I would also add that streaming (SSE) support would be great." — same thread
- vsnf (HN, 2024-03-09): OpenAPI v3 server variables imported resolved with no variable, so every endpoint needs manual edits — [comment](https://news.ycombinator.com/item?id=39655562)
- Note: third-party 2025 comparisons say Bruno lacked WebSocket/gRPC at the time but this has since changed; verify against release notes ([Dev.to comparison](https://dev.to/_d7eb1c1703182e3ce1782/best-api-testing-tools-compared-postman-vs-insomnia-vs-bruno-2025-4915)).

**6. Collaboration (the reason people stay on Postman)**
- solardev (HN, 2024-09-25): clients give better secrets management, folders, team sharing, import/export of specs, saved example responses, chained requests, curl/JS export; valuable for teams and for giving frontend developers example endpoints — [Ask HN](https://news.ycombinator.com/item?id=41648918)
- Tan Yong He (Dev.to, 2025-05-12): teams may rely on Postman's "cloud sync or collaboration features" — [Dev.to](https://dev.to/tanyonghe/ditching-postman-why-and-how-i-transitioned-to-bruno-535e/comments)
- Search summaries of comparison articles: Postman for collaboration/ecosystem, Insomnia for UI/GraphQL, Bruno for git — secondary ([Dev.to](https://dev.to/_d7eb1c1703182e3ce1782/postman-vs-insomnia-vs-bruno-best-api-client-in-2026-1pf7))

**7. Alternatives people name instead of any GUI client:** curl, HTTPie, Hurl, VS Code REST Client/JetBrains HTTP client, Posting (TUI), Yaak, Hoppscotch, Voiden — [Ask HN](https://news.ycombinator.com/item?id=41648918), [Hoppscotch thread](https://news.ycombinator.com/item?id=42898017) (skeeter2020, 2025-02-01: prefers VS Code/Rider REST client or Hurl for file-based workflows).

### Inferences
- The strongest sentiment is not about a single feature but about trust: users expect any funded API client to move toward login, cloud, sales and AI. Bruno is currently the default recommendation but carries a "will it go the same way" caveat in nearly every 2025-2026 thread.
- Positioning opportunity: a tool that is explicitly local, no-account, lightweight, and has a credible no-rug-pull business story.
- Collaboration is the main thing that keeps people on Postman; git-based sharing is the common substitute.

### Gaps
- No Reddit thread bodies, Twitter/X posts, Lobsters or YouTube comments could be fetched; only search snippets. No frequency counts from a systematic sample.
- Medium posts not read in detail.

## What do developers say about AI features inside API clients (Postbot, assistants)? Wanted, invasive or conditional?

### Takeaway
Sentiment is mostly negative when AI is pushed (modal popups, auto-installed plugins, data sharing) and positive-to-neutral for narrowly useful, user-invoked AI. The consistent condition is: opt-in, easy to close/disable, no data leaving the machine, and bring-your-own agent. The Nov 2026 Postman incident hardened this view.

### Cited Findings
- GitHub issue "AI in your face" #13835, opened 2025-10-21: thany: "it immediately shoved an AI thing into my face that I couldn't close."; Kore-rep: popup "has no exit button and forces the user to interact with the AI"; sveinung-t (2026-02-18): "Why is this an opt-out feature instead of an opt-in feature?"; thany: "It should be disabled by defaut, or at the very least stay out of the way until the user decides to engage."; eesquibel: "This needs a Close button and a 'Don't show this again' checkbox."; Ludovic-Kazaar (2026-03-13): popup reappears on every launch on macOS even with AI disabled, "a bug". Maintainer agillette (2026-04-16): "We've now disabled it for all users." Users still reported it afterwards (Apr 2026). — [GitHub issue](https://github.com/postmanlabs/postman-app-support/issues/13835)
- A Postman-side comment in the same issue (DannyDainton, 2025-10-21) says AI can be toggled in Settings; thany disputes this ("You _have to_ interact with it somehow, to make it bugger off.") — same issue (conflicting accounts)
- Issue "Cannot disable Postbot" #13285: user says it is always injecting itself into what you are focusing on; another says AI-off still leaves a pane saying AI is off (via search summary; issue not opened, date not confirmed) — [GitHub issue](https://github.com/postmanlabs/postman-app-support/issues/13285)
- Nov 2026 incident: reports that Postman desktop 12.33.4 installed plugins into Claude Code and Codex without consent, with Cursor and Copilot CLI entries also reported; security researcher Frank Denis called it "junk" on X; Postman said it is reverting (secondary search summary, ~3 days before 2026-11-07; I could not read the articles) — [The New Stack](https://thenewstack.io/postman-plugin-coding-agents/), [Notebookcheck](https://notebookcheck.net/Postman-added-itself-to-Claude-Code-and-Codex-without-asking.1442933.0.html), [Memeburn](https://memeburn.com/postman-ai-plugin-backlash-could-benefit-bruno-in-2026/)
- HN thread on this incident (2026-11-03, item 50354960), short comments: int32max: "silently installing ai plugins and recording data is really not cool." and says agents can write CLI tools for API testing; MOARDONGZPLZ told a Postman salesperson that Postman has a bad reputation among developers; vachina still uses Postman from habit but will switch to Bruno or Insomnia — [int32max](https://news.ycombinator.com/item?id=50363686), [MOARDONGZPLZ](https://news.ycombinator.com/item?id=50358792), [vachina](https://news.ycombinator.com/item?id=50356034)
- jongjong (HN, 2026-11-03): "How are people still using Postman? You can vibecode Postman in like 30 minutes." — [comment](https://news.ycombinator.com/item?id=50358845); itsafarqueue: few apps are as easy to one-shot with your AI subscription — [comment](https://news.ycombinator.com/item?id=50357044)
- Positive/conditional: qustrolabe (HN, 2025-11-30) notes Postman AI "can write little scripts that visualize responses however you want." — [comment](https://news.ycombinator.com/item?id=46100406); AWS Hero Allen Helton called Postbot a big deal, especially seeding it with context for consistent test writing (date not confirmed) — [Dev.to](https://dev.to/aws-heroes/i-didnt-know-it-did-that-postman-postbot-3e8b)
- Bring-your-own-agent stance: skaluvuri (Voiden affiliate, 2026-02-22) rejects built-in assistants like Postbot; users run Claude or another agent in an integrated terminal — [comment](https://news.ycombinator.com/item?id=47111190)
- Skepticism toward "chat with Postman" products: cootsnuck (HN, 2025-02-20): "I don't really understand what problem this aims to solve." — [OpenAstra thread](https://news.ycombinator.com/item?id=43110493). Mashimo (2026-11-04): not everything needs AI — [comment](https://news.ycombinator.com/item?id=50364956)
- Postman's own framing (biased): Agent Mode launched June 2025 as successor to Postbot — [BusinessWire](https://secure.businesswire.com/news/home/20250604031515/en/Postman-Unveils-Agent-Mode-AI-Native-Development-Revolutionizes-API-Lifecycle)

### Inferences
- Welcome conditions emerging from the evidence: opt-in by default, dismissable, no persistent panels, no silent modification of other tools, no data egress, and BYO agent/key. I found no direct quotes specifically about local models or BYO API keys inside an API client, only the BYO-agent argument.
- Many developers believe an external coding agent already does the AI part, so in-client AI is seen as redundant unless it has client-specific context (collections, responses, environments).

### Gaps
- No Reddit/X quotes on Postbot specifically; no survey data; Insomnia's AI features and Bruno's AI stance not covered in sources found.

## What do developers wish an API client did automatically that none does today?

### Takeaway
Evidence is thin. Requests that appear: generating requests/checks from OpenAPI and specs, natural-language test generation, better OpenAPI import fidelity, and SSE/streaming support. Nothing found on content-type detection, auto-auth or error diagnosis as explicit developer wishes.

### Cited Findings
- vsnf (HN, 2024-03-09): Bruno OpenAPI import drops server variables, forcing manual edits per endpoint — [comment](https://news.ycombinator.com/item?id=39655562)
- EmadKhair (HN, 2026-09-15): notes specs "failing on first import because of small incompatibilities" — [comment](https://news.ycombinator.com/item?id=49712018)
- miffy900 (HN, 2024-05-22): "Not having a spec to download and insepct for any API is a sign of incompetence." — [comment](https://news.ycombinator.com/item?id=40439599)
- Octrafic (Show HN, 2026-02-07, vendor post): wants users to "describe what you want to verify in natural language," generating requests/checks from OpenAPI/Postman/GraphQL — [thread](https://news.ycombinator.com/item?id=46929289) (supply-side, not user demand)
- motorest (HN, 2025-07-20) uses instruction files to vibecode API test suites from OpenAPI specs — [comment](https://news.ycombinator.com/item?id=44624126)
- andrewdev365 (HN, 2025-05-13): wants "Postman's structure combined with a CLI's speed" (paraphrase) — [thread](https://news.ycombinator.com/item?id=43971384)
- alp1n3_eth (HN, 2025-02-02): VS Code REST extension lacked pre/post-request scripting, so uses Hurl (paraphrase) — [comment](https://news.ycombinator.com/item?id=42910728)
- hackernoteng (HN, 2024-03-09): SSE streaming support wanted — [thread](https://news.ycombinator.com/item?id=39653718)

### Inferences
- The OpenAPI-to-requests path is both a demand signal (import pain) and a space many new tools target. Import fidelity is a concrete, verifiable pain point.

### Gaps
- No evidence found for wished-for content-type/file-type detection, auto-auth, or error diagnosis. Needs Reddit/X/YouTube sources that could not be fetched.

## What do first-time users say about onboarding and finding features?

### Takeaway
I found little direct first-time-user feedback. Related signals: Postman's UI called an "overcomplicated mess"; Bruno praised as "easy" and out of the way; the main onboarding friction for Postman is account/sign-in and AI modal on first launch.

### Cited Findings
- hn_throwaway_99 (HN, 2024-03-09): "the whole Postman UI has become an overcomplicated mess in my opinion" — [thread](https://news.ycombinator.com/item?id=39653718)
- Tan Yong He (Dev.to, 2025-05-13): Bruno "just stays out of the way" and has a cleaner UI with history and collections — [Dev.to](https://dev.to/tanyonghe/ditching-postman-why-and-how-i-transitioned-to-bruno-535e/comments)
- Postman AI modal appears at onboarding (sarabkallar, 2025-10-21: "only shown once when a new user onboards to Postman or joins a team") yet users report it blocking the app — [GitHub #13835](https://github.com/postmanlabs/postman-app-support/issues/13835)
- Bruno has a documented learning/migration cost: winphone1974 (Hurl, no GUI) fears lack of UI limits adoption — [thread](https://news.ycombinator.com/item?id=39653718); a migration write-up says Bruno imports Postman collections to .bru and could do everything Postman did for their project — [NashTech](https://blog.nashtechglobal.com/saying-goodbye-to-postman-why-we-switched-to-bruno/)

### Inferences
- First-run experience is where Postman loses trust (login, AI modal), while discoverability complaints specific to Bruno were not found in what I read.

### Gaps
- No direct first-time-user discoverability complaints (menu hunting, finding scripts/auth tabs) found; would need Reddit and YouTube comment sections.
