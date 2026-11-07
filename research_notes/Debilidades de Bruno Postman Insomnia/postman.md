# Postman: weaknesses, pain points and user complaints (2023-2026)

Caveat for the writer: most pages found are competitor marketing (Apidog, EchoAPI), which inflates anti-Postman framing and benchmark numbers. Independent signals are few: one r/programming thread (via a snapshot site), the SailPoint forum, G2 aggregate summaries, Stack Overflow. Direct Reddit/HN/community.postman.com threads could not be fetched, so upvote counts are scarce. No count is given where none was found.

## What are the most frequent complaints (ranked)?

### Takeaway
Rough ranking by how often it appears across sources: (1) forced login / cloud-first / Scratch Pad removal, (2) slowness, memory and Electron bloat, (3) pricing and free-plan limits (1-user free plan from March 2026), (4) feature creep / no git-native storage, (5) AI (Postbot / Agent Mode), which is niche and weakly evidenced. The ranking is my synthesis, not a measured count.

### Cited Findings
- 1. Forced sign-in and Scratch Pad removal (2023 onward) is the most repeated theme. r/programming thread "The API Tooling Crisis: Why developers are abandoning Postman and its clones?" (about Sept 2025; 368 points, 216 comments). Top comments: "We use bruno. I can commit it to git. No stupid sign ups." (402 pts) and "started requiring a sign-in just to fire a GET." (366 pts) — [Reddit snapshot, Apr 2026](https://reddit.sentinel-team.org/posts/1smyun6/snapshots/2026-04-16T18%3A19%3A18.813543Z). The post links to [Apidog article](https://apidog.com/blog/api-tooling-crisis-postman-alternatives/), itself a competitor piece.
- SailPoint developer forum, "Postman Scratch Pad Removal", Oct 17 2023. The poster had a strict no-cloud-functions requirement and asked about Milkman and Insomnia. Reply on Nov 21 2023: "We have the same issue and are moving to Insomnia." Another: "unable to come to an agreement with Postman so we are moving to Insomnia now." — [SailPoint](https://developer.sailpoint.com/discuss/t/postman-scratch-pad-removal/19235)
- A search-summarised Reddit comment says the replacement "Lightweight API client" requires creating each request from scratch, "pretty useless when you have a collection of hundreds of APIs". I could not open the original, so treat as unverified — [search summary of SailPoint/Reddit sources](https://developer.sailpoint.com/discuss/t/postman-scratch-pad-removal/19235)
- Cloud sync on launch: "Even when data is cached locally, Postman still attempts to sync on launch" — corporate VPN/proxy adds an estimated 3-5 s (competitor article, Jun 2026) — [DEV/Apidog](https://dev.to/hassann/why-postman-is-slow-and-bloated-in-2026-and-what-to-use-instead-84i)
- 2. Performance and bloat: G2 pros/cons summary lists slow performance as the top con (220 reviews mention it, per the search summary); G2 overall about 4.6/5 from about 1,761 reviews. Capterra summaries say laggy with large data — [G2](https://www.g2.com/products/postman/reviews), [Capterra](https://www.capterra.com/p/188497/Postman/reviews/2857579/). Counts vary between snapshots.
- Self-measured figures from a competitor (one M2 MacBook, no methodology, Jun 2026): cold start 4-9 s, about 280 MB RAM at launch, 450-600 MB with 3 collections, 700-900 MB after 2 h, 1 GB+ during a 50-request Runner, 8-12 processes, over 400 MB install — [DEV/Apidog](https://dev.to/hassann/why-postman-is-slow-and-bloated-in-2026-and-what-to-use-instead-84i). Treat as indicative only.
- Commenter on a DEV thread: "Postman has gotten pretty bloated... alternating between Hoppscotch and Bruno lately" — [DEV comments](https://dev.to/therealmrmumba/good-postman-alternatives-herere-my-top-15-4j1c/comments). Also a DigitalOcean community question "Postman feels bloated, any lightweight alternatives" — [DigitalOcean](https://www.digitalocean.com/community/questions/postman-feels-bloated-any-lightweight-alternatives-for-api-testing)
- 3. Pricing: multiple sources say the free plan became 1 user as of March 1 2026, so 2+ users need Team. Sources conflict on Team price ($14 vs $19 per user per month) and on whether free collection runs are capped (25/month vs unlimited). Plans renamed Free/Solo/Team/Enterprise in April 2026 — [DEV](https://dev.to/hassann/postman-free-plan-2026-what-the-1-user-limit-means-for-small-teams-1okf), [Apidog](https://apidog.com/blog/postman-free-plan-2026-one-user-limit/), [CostBench changelog](https://costbench.com/changelog/postman-plans-renamed-2026-04/), [DEV "pricing is a trap"](https://dev.to/ashinno/postmans-new-pricing-is-a-trap-here-are-the-alternatives-4839). Independent forum: [It's FOSS community, 2026](https://itsfoss.community/t/2026-update-postman-free-plan-limits-and-alternatives/15599) says collaboration gets "restrictive unless you upgrade".
- G2 reviewers: advanced features locked behind paid plans, pricing high — [G2](https://www.g2.com/products/postman/reviews)
- r/programming comments blame paywalls and investors: "So many of these things are finished products and then they get investors." Another noted paywalls on Git-friendly storage and secret management. Counterpoint: "The only 'crisis' here is that Postman was once valued at $5.6B." — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1smyun6/snapshots/2026-04-16T18%3A19%3A18.813543Z)
- 4. Feature creep (Flows, API Network, monitors, mocks, governance) — [DEV/Apidog, Jun 2026](https://dev.to/hassann/why-postman-is-slow-and-bloated-in-2026-and-what-to-use-instead-84i). Learning curve for scripting and workspace management in G2 — [G2](https://www.g2.com/products/postman/reviews)
- 5. AI: I found no Reddit/forum thread complaining about Postbot or Agent Mode. Only docs showing it is opt-out: Settings > AI > "Try Agent Mode" toggle, separate switches for code autocomplete; Postbot limited to 50 activities per user per month — [Postman docs, Agent Mode settings](https://learning.postman.com/docs/agent-mode/settings.md), [Postbot usage](https://learning.postman.com/help/faqs/postbot/is-postbot-usage-limited)

### Inferences
- Frequent: forced account / cloud-first, slowness/bloat, pricing. Niche or unevidenced: AI complaints, UI clutter, onboarding.
- Privacy / no-cloud requirements (enterprise security) are a distinct driver, as the SailPoint thread shows.

### Gaps
- No exact upvote or thread counts from Postman community forum, HN, or Twitter/X. HN threads not found by search.
- UI clutter and onboarding complaints: no direct sources found.
- Pricing figures conflict; verify on postman.com/pricing.

## How does Postman handle file uploads in form-data, and do users complain?

### Takeaway
Users must set the key type to "File" and pick the file via the picker (typing a path as text sends the string, not the file). Postman's working-directory restriction produces recurring Stack Overflow errors. I found no 2025-2026 thread about the manual key/type step specifically.

### Cited Findings
- Typing a path as a text value fails; only selecting the file with File type sends the contents — [Stack Overflow mirror (2023 archive)](https://kaweah.freedombox.rocks/kiwix/stackoverflow.com_en_all_2023-11/questions/67716908/sending-a-file-to-an-api-using-postman-form-data)
- "File not in working directory" warning; answer: default working directory is Postman/files, copy file there. A commenter called it more like a bug — [Stack Overflow mirror](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/70529650/how-to-upload-a-file-using-postman)
- Error "Can't select file at form-data" attributed to permissions or path problems — [Apidog guide (competitor)](https://apidog.com/blog/postman-cant-select-file-at-form-data-error)
- File sent as "undefined" in one SO question; poster worked around with an HTML form — [SO mirror](https://kaweah.freedombox.rocks/kiwix/stackoverflow.com_en_all_2023-11/questions/60036239/upload-file-failed-postman)
- Saved collections store file paths that are not portable between machines (my reading of the working-directory threads; no direct quote found).

### Inferences
- The pain is mainly path portability and the working-directory restriction, which hurts shared collections and git-based workflows.
- Pain is a documented support topic but not a headline complaint.

### Gaps
- No source on the "set key and type manually" complaint as such. Dates are mostly pre-2024 archives.

## Is there autocompletion/discovery of API routes from OpenAPI specs, and what's missing?

### Takeaway
I found no evidence of URL/route autocompletion from an imported spec. Postman imports OpenAPI into a collection, and search results show only import-reliability problems.

### Cited Findings
- Import issues: blank host from Swagger 2.0 without host (`http:///v1/path`, v6.7.3 era) — [Postman community](https://community.getpostman.com/t/importing-swagger-2-0-without-host-defined/4315)
- "Error while fetching data from link" on URL import; workaround is pasting raw text (GitHub issue #10648, Feb 2022) — [GitHub](https://github.com/postmanlabs/postman-app-support/issues/10648)
- Properties dropped on import with `format: url` — [Postman community](https://community.getpostman.com/t/swaggerhub-openapi3-yaml-issues-with-postman/5832)

### Inferences
- The route-discovery gap (typing a URL and getting suggestions from the spec) is a likely differentiator for a new tool, but no user demand evidence was found.

### Gaps
- No 2025-2026 sources on spec-based autocomplete. All import sources are older than 2023.
- Postman's recent API-spec features (Spec Hub, Agent Mode) were not researched.

## What is the migration pattern?

### Takeaway
Bruno is the most cited destination (git-native, file-per-request, no sign-up, free/OSS), then Insomnia, Hoppscotch, Apidog (aggressively self-promoted), .http files in VS Code, Hurl, curl, Yaak.

### Cited Findings
- Bruno reasons: cost/licensing, Git-friendly plain-text files readable in PR diffs, local/offline storage, speed. Trade-offs: smaller ecosystem, no built-in mock server or hosted docs, git habit required — [Medium](https://medium.com/@vignarajj/why-i-switched-to-bruno-for-api-testing-a-developers-journey-c610b5cdea59), [DEV](https://dev.to/tanyonghe/ditching-postman-why-and-how-i-transitioned-to-bruno-535e), [NashTech blog](https://blog.nashtechglobal.com/saying-goodbye-to-postman-why-we-switched-to-bruno/), [Bug0, 2026](https://bug0.com/blog/postman-alternatives-2026)
- "tbh postman just got too bloated, switched to bruno and never looked back" (search-summarised Reddit quote; original not opened) — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1smyun6/snapshots/2026-04-16T18%3A19%3A18.813543Z)
- r/programming: users moved to .http files in VS Code, Hurl, curl, HTTPie — same Reddit snapshot.
- Enterprise move to Insomnia in Nov 2023 after failed Postman agreement — [SailPoint](https://developer.sailpoint.com/discuss/t/postman-scratch-pad-removal/19235). SailPoint also has a Bruno topic (4 replies, 2,364 views, last activity May 3 2026) — same page.
- Hoppscotch (browser-based, OSS, 75K+ GitHub stars claimed) — [openalternative / Wisp / appwrite listicles](https://openalternative.co/alternatives/postman)

### Inferences
- The leave-Postman pattern is driven by login, git workflow and cost rather than missing features.

### Gaps
- No Bruno/Insomnia download or churn statistics. Many "switch" posts are vendor content.

## Frequent versus niche

### Takeaway
Frequent: login/cloud, bloat/performance, pricing. Niche: file-upload path quirks, OpenAPI import bugs, AI.

### Cited Findings
- See ranked list in the first section; the frequency evidence there is the r/programming thread (368 pts / 216 comments), G2 mentions (220 reviews cite slowness) and the large number of 2026 pricing-change articles (mostly competitors).

### Inferences
- Counts are approximate and come from secondary summaries; do not present as precise.

### Gaps
- No systematic scrape of Reddit, HN or the Postman forum was possible with the tools available.
