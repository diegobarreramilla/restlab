# Weaknesses, pain points and user complaints about Insomnia (Kong), 2023-2026

## 1. The 8.0 forced-account / cloud-sync / Scratch Pad controversy and the Insomnium fork

### Takeaway
Insomnia 8.0 (Sept 2023) required an account (free allowed) and hid local data unless sync was enabled. Backlash was immediate and large: Kong restored local-only projects in 8.3 (Oct 16, 2023) but still requires an account for local projects. The trust damage is persistent and is still the lead "why I left" reason in 2026 comparison content. The fork Insomnium arose (from 2023.5.8, pre-login) but is now unmaintained.

### Cited Findings
- Kong announcement (Oct 3, 2023): 8.0 made Insomnia Sync free, but Kong stated "we are requiring an account (can be free) in order to use the product." Local-only projects were promised for 8.3; "You will need an account with Local Vault, or you can keep using Scratch Pad locally." Kong admitted "My biggest lesson is that E2EE is not that useful to many users, after all." Announcement reactions: 8 thumbs-up vs 181 thumbs-down; 43 comments, 72 replies. 8.2 shipped Oct 5, 8.3 (local projects) Oct 16, 2023. — [Kong/insomnia Discussion #6626](https://github.com/Kong/insomnia/discussions/6626)
- Quote (mishushakov, 207 thumbs-up): "You turned Insomnia from useful product into a freemium cashcow with a demo version (Scratchpad)." — [Discussion #6626](https://github.com/Kong/insomnia/discussions/6626)
- Quotes: "Even if the local only projects are coming back, I cannot use it, because of the mandatory login." (nrekretep); "Requirement of an account at all is definitely a no go." (tebruno99); "There's no justification for it aside from corporate greed to convert users and mine data." (khicks). A Kong defender's comment got 4 up / 60 down. Users cited air-gapped/compliance constraints and rolled back to 2023.5.x. — [Discussion #6626](https://github.com/Kong/insomnia/discussions/6626)
- Most-reacted closed issues: #6577 "enshittification / needing an account" (120 thumbs-up, closed Sep 28, 2023); #6585 "Upgrading to Insomnia 8 has deleted or hidden all of my queries and configuration" (74); #6579 "All my data lost - 'Failed to create remote project'" (65); #6606 "Lost all my stuff after the upgrade to 8.0.0" (54); #6583 "Why 8.0 free plan remove 'Native Git Sync'??" (Sep 28, 2023). — [issues sorted by reactions](https://github.com/Kong/insomnia/issues?q=is%3Aissue+sort%3Areactions-%2B1-desc), [#6583 via issue list](https://github.com/Kong/insomnia/issues?q=is%3Aissue+AI+OR+MCP+OR+%22Konnect%22+sort%3Acreated-desc)
- 2026 comparison (Hackceleration, affiliate/competitive content, aggregates GitHub/HN) lists six leave-reasons: login in v8 ("The whole reason I used Insomnia was because it wasn't trying to push to create an account."; "I lost all of my work after upgrading to version 8."); projects hidden unless sync on; converting a cloud project to local permanently deletes its cloud data (Local Vault, 8.3); cloud outages blocking access ("Your downtime yesterday proved why forcing users to use a account is not good."; Kong: session valid 30 days); platform bloat (Insomnia's creator said in a Show HN that it expanded toward Postman's feature set); limited free team tier. — [Hackceleration, 2026](https://hackceleration.com/labs/switch/insomnia)
- Insomnium: fork of Kong/insomnia at 2023.5.8, "the last commit before compulsory account login"; removes login, tracking, analytics; works 100% offline. Motivation cited from HN item 37680522 (Sept/Oct 2023). Original ArchGPT repo archived by owner Jul 19, 2024 (read-only, "not actively maintained"); other forks exist (paulius-valiunas, 1xcode). Aggregator star count 3,428 (stale, unverified). — [search summary of ArchGPT/insomnium and ecosyste.ms](https://github.com/ArchGPT/insomnium), [paulius-valiunas fork](https://github.com/paulius-valiunas/insomnium/blob/main/README.md). Note: direct fetch of ArchGPT/insomnium page showed a different, empty restored repo (0 stars, a zip only); treat star count and README quotes as second-hand.
- Yaak's creator is Insomnia's original creator Gregory Schier (sold Insomnia 2019); Yaak and Bruno marketed as no-account local file tools. — [Hackceleration 2026](https://hackceleration.com/labs/switch/insomnia), [Yaak comparison](https://yaak.app/postman-alternatives)

### Inferences
- The lasting damage is trust: "local-first" users read the account requirement as a one-way ratchet toward platform lock-in, which Kong's later direction (v12 MCP/AI, v13 Konnect embedding) reinforces.
- Local-first, no-account operation should be a day-one promise for any competitor positioning against Insomnia.

### Gaps
- No current (2026) Insomnium maintenance/stars verified; no HN thread text fetched directly (HN item 37680522 only cited second-hand).
- Did not verify whether Scratch Pad still limits to one collection in 2026 (Hackceleration implies yes).

## 2. Recurring complaints: performance, bugs, tabs/UI, plugins, paywalls, git sync, onboarding, AI

### Takeaway
Most frequent: forced account/cloud (2023, still cited); regressions and data loss on major upgrades; performance on large collections; UI churn (tabs in 11.x, still partly unresolved in 2026); free-tier limits (Git Sync 3 users). Plugin and AI complaints are sparse in sources found.

### Cited Findings
- Performance: #6809 "Sorry, this new release is just terrible" (opened Nov 14, 2023, v9.4.1; ~58 thumbs-up): "It's super slow now, any user interaction takes 1-1.5s to complete."; "Please revert to old version , the software is unusable since the upgrade for big collection !!!". Maintainer: "We are iterating rapidly as we are doing some major refactorings, the regressions will reduce dramatically in number." Closed Aug 1, 2024 with claim of "up to 20x" improvement in 9.3.3. One user: team "killed the really good product." — [#6809](https://github.com/Kong/insomnia/issues/6809)
- Also: #4653 "Insomnia has become unresponsive open api specs 3" (closed May 2024), #4241 "very slow and hangs on a >6000 line file" (closed May 2024). — [OpenAPI issue search](https://github.com/Kong/insomnia/issues?q=is%3Aissue+openapi+sort%3Acomments-desc)
- Electron memory footprint and slowdown on very large collections are claimed by competitor/review sites. — [Qodex (competitor)](https://qodex.ai/blog/insomnia-alternatives), [G2 summary](https://www.g2.com/products/kong-insomnia/reviews)
- Tabs/UI (2025-2026): #8488 "Tabs are half baked" (opened Mar 19, 2025, v11.0.0; ~40 thumbs-up + 13 hearts; still open Jun 2026). Quotes: "First of all, if I wanted tabs I would use Postman."; "They are a massive usability pain point right now." (tal-zvon, Dec 2025). Folders open tabs, tabs randomly open/close, no pin, no keyboard nav, duplicate titles hard to tell apart. Users pinned 10.3.1 and disabled auto-update; some moved to Bruno. PM apologized Dec 12, 2025 ("deprioritized the immediate fix"); 12.4 beta (Feb 27, 2026) opens a single tab by default; Jun 6, 2026: "still no way to disable tabs entirely." Related: #1003 "Temporary Tabs, don't auto save" (62 comments, open since 2018). — [#8488](https://github.com/Kong/insomnia/issues/8488), [open issues list](https://github.com/Kong/insomnia/issues?q=is%3Aissue+is%3Aopen+sort%3Areactions-%2B1-desc)
- Regressions/data loss on upgrade recurring: #5540 (2022.7.0 requests disappeared), #7997 "Upgraded to 10 and all old request are gon" (Sep 27, 2024), #8672 "Not able to export Collection as JSON" (May 2025, open), #9509 "Local Scratch Pad YAML Export creates empty file" (Dec 22, 2025, open, 18 comments), #9879 "Save to File button creates empty file" (Oct 2026), #9629 Postman import ignores folder hierarchy (Feb 2026, open). Platform: #9346 snap 12.0.0 crashes on Ubuntu 25.10 (Nov 2025, open), #10199 "Impossible to use on mac" (Jul 2026, open), #5088 Fedora SSL crash (81 comments), #7358 "Can't login - Something went wrong" (55 comments, 2024). — [open issues list](https://github.com/Kong/insomnia/issues?q=is%3Aissue+is%3Aopen+sort%3Areactions-%2B1-desc), [file-related issues](https://github.com/Kong/insomnia/issues?q=is%3Aissue+openapi+autocomplete+OR+upload+OR+file), [AI/MCP/Konnect issues](https://github.com/Kong/insomnia/issues?q=is%3Aissue+AI+OR+MCP+OR+%22Konnect%22+sort%3Acreated-desc)
- Feature gaps with high reactions: Socket.io support #5884 (68 thumbs-up, closed Jul 25, 2025), WebSocket (#528), GraphQL doc explorer (#451), per-request variables (#203, closed 2021), jq filters (#777), local-filesystem collections (#1638, open since 2019), open-source sync server (#1752, open). — [issues by reactions](https://github.com/Kong/insomnia/issues?q=is%3Aissue+sort%3Areactions-%2B1-desc), [open list](https://github.com/Kong/insomnia/issues?q=is%3Aissue+is%3Aopen+sort%3Areactions-%2B1-desc)
- Paywall/git sync: Free Essentials has Git Sync for up to 3 users, 1,000 mock requests/month; Pro $12/user/month removes the cap (team of 5 = $60/mo). — [Hackceleration 2026](https://hackceleration.com/labs/switch/insomnia), [G2/search summary](https://www.g2.com/products/kong-insomnia/reviews)
- G2 (4.4, ~17 reviews, small sample): "Continously logged out and forced to reenable various crap. Bad and cumbersome git integrations"; slow with many requests; AI summary: lacks comprehensive docs and automation vs competitors. One Reddit user: the internal DB format made Git collaboration hard (single claim). — [G2](https://www.g2.com/products/kong-insomnia/reviews)
- AI/MCP: Insomnia 12 GA Nov 4, 2025 (MCP clients, AI mock servers, AI commit suggestions; AI can be disabled per account/user; cloud or local LLM; free "as of v12, may change"). Coverage positive/neutral; no GitHub objections to AI found (only MCP bugs #9371, #9501, #9502, #9505, Nov-Dec 2025). — [Kong press release, Nov 4, 2025](https://konghq.com/company/press-room/press-release/kong-releases-insomnia-12-to-accelerate-api-and-mcp-development-with-ai-powered-testing-and-collaboration), [Kong docs](https://developer.konghq.com/insomnia/ai-in-insomnia/), [heise](https://heise.de/-11059094)
- Yaak page notes direction toward Kong platform (v12 MCP/AI, v13 embedded in Konnect) as a reason for "platform creep" concerns (competitor claim). — [Yaak](https://yaak.app/postman-alternatives)

### Inferences
- Frequency ranking (by reactions/repetition): (1) forced account/cloud and data loss around 8.0 (hundreds of reactions); (2) upgrade regressions/performance on large collections; (3) tab/UI changes (11.x-12.x); (4) free-tier/team limits and Git Sync friction; (5) import/export bugs; (6) platform bloat/Kong-centric direction; niche: AI, Linux packaging, plugin issues.
- Plugin ecosystem: I found no 2023-2026 evidence of notable complaints; only 2018-2019 install bugs. Treat as unknown/niche.

### Gaps
- No Reddit/HN primary threads fetched (search returned none); no Trustpilot/Capterra/TrustRadius/Product Hunt data.
- Reaction counts on GitHub list pages sometimes appear to be comment counts; marked where unclear.
- Plugin-specific and AI-specific user complaints not found.

## 3. OpenAPI import, route discovery/autocomplete, file uploads in bodies

### Takeaway
Insomnia imports OpenAPI 3.0/3.1 (and Swagger 2) into a collection plus Spec tab, but import bugs recur historically; I found no evidence of path autocomplete from a spec, and file-upload issues exist but sparse.

### Cited Findings
- Docs: importing an OpenAPI spec creates an API Collection and places the spec in its Spec tab; supports 3.0 and 3.1. — [Kong docs](https://developer.konghq.com/how-to/import-an-api-spec/)
- Import issues: #1843 unable to import large OpenAPI spec (open since Dec 2019); #2780 error importing Swagger 2.0 JSON (open since Oct 2020); #5953 "No longer possible to import a swagger file as a request collection" (May 2023, open, 14); #7083 WSDL import fails (Feb 2024, open); #8040 "Change Insomnia variables to path parameters in openapi import" (closed Mar 30, 2026); #1640 import ignoring server default variables (closed 2020); #4653 unresponsive on OpenAPI 3 specs. — [OpenAPI issues](https://github.com/Kong/insomnia/issues?q=is%3Aissue+openapi+sort%3Acomments-desc), [open list](https://github.com/Kong/insomnia/issues?q=is%3Aissue+is%3Aopen+sort%3Areactions-%2B1-desc)
- Older: failure to import OpenAPI 3 with multiple API keys (closed 2022). — [Lightrun mirror](https://lightrun.com/answers/kong-insomnia-insomnia-is-unable-to-import-openapi-3-with-multiple-api-keys)
- File uploads: #9672 "sending file by post method not working" (open, Feb 26, 2026); Stack Overflow 2022 question about sending file plus JSON via multipart unanswered; #9668 certificate filepath not appearing on macOS (Mar 2026). — [file issues](https://github.com/Kong/insomnia/issues?q=is%3Aissue+openapi+autocomplete+OR+upload+OR+file), [SO mirror](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/73266019/insomnia-how-to-upload-file-and-json-data)

### Inferences
- Imports are one-shot snapshots; no evidence of live spec-to-collection sync or route autocomplete. This is an opportunity but is inferred from absence only.

### Gaps
- No issue found for "path autocomplete" or multipart-from-spec; may exist but unverified. Pages 2+ of search not read.

## 4. What users like (keep) and frequency of complaints

### Takeaway
Users valued the simple, fast, no-account, local, open-source client; its Apache-2.0 licence, GraphQL/gRPC/WebSocket support, mocks, design tools, and free 3-user Git Sync still earn recommendations.

### Cited Findings
- Apache-2.0 open source; Scratch Pad and Local Vault give local use; built-in API design, mocks, Kong integration; free Git Sync up to 3 users. — [Hackceleration 2026](https://hackceleration.com/labs/switch/insomnia)
- "The whole reason I used Insomnia was because it wasn't trying to push to create an account." — GitHub user, via [Hackceleration](https://hackceleration.com/labs/switch/insomnia)
- Some #8488 users said the earlier tab-less design was why they chose Insomnia. — [#8488](https://github.com/Kong/insomnia/issues/8488)
- G2: users appreciate efficient API testing and collaboration (4.4/5, ~17 reviews). — [G2](https://www.g2.com/products/kong-insomnia/reviews)
- Bruno ("offline-only", "no plans to add cloud-sync, ever") and Yaak are the most-named destinations. — [Hackceleration](https://hackceleration.com/labs/switch/insomnia)

### Inferences
- Keep: lightweight feel, local/no-login mode, GraphQL/gRPC/WS in one tool, scripting and Git-friendly storage.

### Gaps
- Few first-person positive 2025-26 reviews; most comparison sources are competitor-authored and biased (Apidog, Qodex, Yaak, Hackceleration).
