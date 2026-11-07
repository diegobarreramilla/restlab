# Bruno (usebruno.com) weaknesses, pain points and user complaints, 2025-2026

Method note: `gh` CLI was not installed, so GitHub data came from the public GitHub search API (via WebFetch), sorted by reactions. Snapshots were taken around 2026-11; a few counts may have drifted. WebFetch truncated outputs, so the lists below are the top of each query, not exhaustive. Reddit/HN threads were not directly retrievable; only secondary mirrors surfaced.

## 1. Top open GitHub issues (feature requests and bugs) by reactions

### Takeaway
The most-upvoted open asks are i18n, vim/keyboard mode, nested environments, plugins/extensions, Socket.IO, multi-collection tabs, HAR import and OAuth2 token control. Feature asks outnumber bugs in reactions. The bugs with the most signal are OAuth2/cert/self-signed problems, slow project opening, and large responses slowing the app.

### Cited Findings
Open feature requests (reactions total / thumbs-up; comments; created):
- #322 i18n (58/57; 21; 2023-10) — [issue search](https://api.github.com/search/issues?q=repo:usebruno/bruno+is:issue+is:open&sort=reactions&order=desc&per_page=30)
- #2373 Vim mode / keyboard centrism (57/42; 0; 2024-05) — same query
- #292 Nested environments (49/36; 23; 2023-10) — same query
- #1529 Bruno Plugins/Extensions (49/49; 0; 2024-02) — same query
- #5887 Socket.IO support (37/37; 22; 2025-10) — same query
- #5807 Show open tabs from multiple collections (33/24; 11; 2025-10) — same query
- #1636 Import HAR files (29/29; 1; 2024-02) — same query
- #6983 Allow multiple app instances (29/18; 8; 2026-01) — same query
- #4392 OAuth2: reset token after env change or via script (28/28; 12; 2025-04) — same query
- #4806 MCP server integration (27/27; 18; 2025-05) — same query
- #409 .env file per environment (23/23; 11; 2023-10; P1) — same query
- #7423 jq filtering for JSON responses (20/20; 0; 2026-03; has PR) — same query
- #4229 Expand Folder Vars API (19/16; 12; 2025-03) — same query
- #5801 GraphQL subscription support (19/19; 4; 2025-10) — same query
- #5790 Enhance Network tab (18 hearts; 5; 2025-10) — same query
- #412 Auto-completion for vars (17/14; 3; 2023-10) — same query
- #1739 Option to disable tab bar (17/17; 2024-03); #2861 collection docs as markdown (17/16; 9; 2024-08); #1527 bru.notify in scripts (17/17; 2024-02) — same query
- #7043 OpenAPI export from CLI (17/15; 2026-02) — [search](https://api.github.com/search/issues?q=repo:usebruno/bruno+is:issue+multipart+OR+openapi+OR+autocomplete+OR+upload+is:open&sort=reactions&order=desc&per_page=15)

Open bugs with most signal (label bug, sorted by reactions) — [search](https://api.github.com/search/issues?q=repo:usebruno/bruno+is:issue+is:open+label:bug&sort=reactions&order=desc&per_page=15):
- #4949 "Unable to verify the first certificate" / self-signed certs not working (13/10; 17 comments; 2025-06)
- #6710 OAuth2 with system browser reopens Bruno in a new window (11/7; 14 comments; 2026-01)
- #4531 Bruno re-associates itself with HTML files on every start, Ubuntu deb (11/11; 2025-04)
- #2416 Extremely slow project opening (10/9; 26 comments; 2024-06)
- #5944 Large responses pile up in timeline and slow the app (9/6; 2025-10)
- #7362 `cheerio` built-in library unusable in CLI (9/8; 10 comments; 2026-03)
- #4762 Authorization Code Grant flow failing (8/8; 10 comments; 2025-05)
- #6918 Cannot reach LAN endpoints on macOS when launched normally (8/8; 2026-01)
- #7337 No window shadow on KDE Plasma 6 Wayland (7/6; 2026-03)
- #6122 Update failed / broken shortcut (25 comments; 2025-11); #7413 Flatpak v3.1.4 app.asar corrupted, blank screen (2026-03); #3306 saved requests not appearing in UI (11 reactions, 29 comments; 2024-10)
- #5755 gRPC "generate sample message" misses schema fields (6/6; 2025-10); #3530 batch size for parallel collection runs (6/6; 2024-11)

### Inferences
- Reaction counts are low in absolute terms (max ~58 on open issues), so the long tail is wide: no single killer complaint, but a steady stream of friction around auth (OAuth2/certs), environments, and extensibility.
- Plugins/extensions (#1529) and scripting-API expansion (#4229, #4705 expose JS API types, 10 hearts) show demand for extensibility.

### Gaps
- Could not page past the top ~20-30 results (truncated output); issues 21-30 by reaction are unlisted.
- Closed-but-popular issues (e.g. #81 OpenAPI import, 132 reactions; #1537 .http file support, 100 reactions) are closed so are not backlog, but show historical demand.

## 2. Gaps versus Postman

### Takeaway
Reviewers consistently cite: no mock server, no cloud sync/workspaces/RBAC, thin scripting docs and restricted `require()`, no SSO/audit, desktop-only, smaller community. Most of this list comes from a competitor (Apidog), so treat as indicative.

### Cited Findings
- Apidog (competitor, 2026-04-20): no mock server and none on the official roadmap; no cloud sync, workspace dashboard, comments or RBAC; non-developers need a git account; `bru` API less documented than `pm`; `require()` restricted by default; no GUI script builder; script error messages less descriptive; cannot write/validate OpenAPI or generate hosted docs; no SSO/audit logs/admin console; desktop-only — [Apidog](https://apidog.com/blog/bruno-limitations/)
- Apidog claims gRPC is unsupported and WebSocket limited; contradicted by Bruno's own post (2024-12-09) saying gRPC, WebSocket, Socket.IO, MQTT moved into open source, and by open gRPC issues (#5755, #6224 gRPC completion menu, 8 reactions) — [Bruno blog](https://blog.usebruno.com/bruno-update). Socket.IO (#5887) and GraphQL subscriptions (#5801) are still open requests.
- Dev.to (2026): `bru` scripting has thinner docs and fewer examples; Postman scripts using `require()` need more work; reviewers frame Bruno as privacy/version control and Postman as team/platform — [Preecha, DEV](https://dev.to/preecha/bruno-limitations-what-it-cant-do-and-what-to-use-instead-18cf), [toolradar](https://toolradar.com/tools/bruno)
- Commenters (secondary summary, undated): Bruno lacks some enterprise features such as advanced proxy support; scripts break because the JS sandbox differs from Postman's — [news.jamesst.one summary](https://news.jamesst.one/news/t7Is)
- Performance/memory: one blogger measured ~500 MB for Bruno vs ~230 MB for Yaak (single btop test, Electron) and memory "slowly climbs" per request (2025-01-26) — [royathan.com](https://royathan.com/blog/the-api-client-hunt). Corroborated by GitHub #2416 (slow project open) and #5944 (large responses slow app).
- Monitors, visualizer: no evidence found either way in sources; Apidog doesn't discuss monitors.
- Request-chaining UX: GitHub #3407 setNextRequest by id (6/6, open); #4229 folder vars API expansion. No broad complaint found.
- Network tab / devtools: #5790 "Enhance Network Tab" (18 hearts) and #5801 point to weaker debugging than Postman Console.
- Import/OpenAPI quality: #81 OpenAPI import was a 132-reaction request (closed); open: #3445 save collections as OpenAPI (6), #6690 JSON Schema / enhanced OpenAPI export (8), #2498 Arazzo support (7), #7707 `bru sync` for OpenAPI drift detection (6, 2026-04) — [search](https://api.github.com/search/issues?q=repo:usebruno/bruno+is:issue+multipart+OR+openapi+OR+autocomplete+OR+upload+is:open&sort=reactions&order=desc&per_page=15)

### Inferences
- The real missing pieces vs Postman are collaboration/hosting and mock/monitor, which Bruno deliberately omits; the user-voiced pain is more about environment/variable ergonomics, auth flows, devtools and extensibility.
- Postman's March 2026 free-plan change to single-user (per [guptadeepak guide](https://guptadeepak.com/tools/top-5-api-testing-development-tools-2026/), dated Aug 2026) is driving migrations to Bruno, so Bruno's gaps are being tested by teams.

### Gaps
- No primary Reddit/HN threads retrieved; no first-hand data on monitors/visualizer demand.

## 3. File uploads in multipart bodies and OpenAPI-based autocompletion

### Takeaway
Multipart file upload works but has a history of bugs and ergonomics requests; OpenAPI route/var autocompletion is not a native feature, only requests exist.

### Cited Findings
- Multipart history (mostly closed): #352 variables in multipart body bug (35 reactions, 33 comments, 2023); #769 "Upload a file" (26); #195 file upload helpers (15); #1602 per-part content-type (12, closed); #3723 multipart sending fails since v1.37.0 (8, 24 comments, 2025-01); #1992 posting raw binary (8) — [search](https://api.github.com/search/issues?q=repo:usebruno/bruno+is:issue+multipart+file&sort=reactions&order=desc&per_page=10)
- Open: #5657 multi-tabbed payload editor for comparing request bodies (14/14, 2025-09); #344 define possible values for query params/variables (14/14, 14 comments) — [search](https://api.github.com/search/issues?q=repo:usebruno/bruno+is:issue+multipart+OR+openapi+OR+autocomplete+OR+upload+is:open&sort=reactions&order=desc&per_page=15)
- Autocompletion: #412 var auto-completion (17/14, open since 2023); #6224 gRPC completion/suggestion menu (8). No open issue found specifically for "route autocompletion from OpenAPI"; OpenAPI features that exist are sync (see pricing: free tier capped at 5 OpenAPI syncs/month) — [pricing](https://www.usebruno.com/pricing)

### Inferences
- Upload paths are stored as file paths in .bru files; the recurring pain is relative paths/portability and regression bugs (not verified in sources; treat as hypothesis).
- A product opportunity: spec-aware autocomplete/validation of body, routes, and variables.

### Gaps
- Did not read individual issue threads to confirm path-handling details; did not find any dedicated "OpenAPI route autocomplete" request.

## 4. Paid tiers and licensing controversy

### Takeaway
Bruno is MIT open core. The Dec 2024 move from one-time Golden Edition to annual Pro/Ultimate subscriptions drew "betrayal" criticism; Bruno moved some planned-paid protocols to open source in response. Paid gating now sits on private Git, workspaces, OpenAPI sync volume, etc.

### Cited Findings
- 2024-12-09 Bruno announcement: Golden Edition sunset; Pro $6/user/mo and Ultimate $11/user/mo billed annually; gRPC, WebSocket, Socket.IO, MQTT, global environments and custom themes moved to open source; Golden holders keep perpetual features and two years of updates — [Bruno blog](https://blog.usebruno.com/bruno-update)
- Current pricing page (undated, fetched 2026): Open Source $0, Pro $6, Ultimate $11, Enterprise $18 per user/mo annual; free tier limited to public Git only, 2 workspaces, 5 OpenAPI syncs/month; SSO/SCIM/audit logs Enterprise; table partly ambiguous in extraction — [pricing](https://www.usebruno.com/pricing)
- 2025-01-26 critic (competitor Yaak's side): Bruno is "open core, not open source", paywalls features such as history and response comparison, and abandoned the founder's earlier "we don't want to sell monthly recurring subscriptions" stance — [royathan.com](https://royathan.com/blog/the-api-client-hunt)
- Community discussion on sustainability/incentives: [GitHub discussion #269](https://GitHub.com/usebruno/bruno/discussions/269); a Lemmy commenter accused the team of quietly removing the one-time Golden Edition — [Lemmy](https://lemmy.brendan.ie/comment/1849142)
- Third-party price listings for Golden Edition disagree ($9 / $19 one-time); stale, unreliable.

### Inferences
- Core objection is trust (promise vs. subscription pivot) plus fear of creeping paywalls; the free-tier caps (OpenAPI syncs, public-only Git) are the likeliest new friction points.

### Gaps
- No quantified sentiment (Reddit/HN/Discord not retrieved). Exact current feature split by tier unclear.

## 5. What users love (must preserve)

### Takeaway
Plain-text, git-friendly, offline-first, local collections; MIT free core; no forced account/cloud; privacy.

### Cited Findings
- Collections are plain files that work well with git; MIT licensed and free — [Preecha, DEV](https://dev.to/preecha/bruno-limitations-what-it-cant-do-and-what-to-use-instead-18cf)
- Git history gives author/timestamp/message per change (Apidog concedes as a strength) — [Apidog](https://apidog.com/blog/bruno-limitations/)
- A developer who left Postman in March 2026 cited unwanted bloat (mock, docs, monitoring) — [pickuma, DEV](https://dev.to/pickuma/hoppscotch-vs-bruno-the-open-source-api-client-showdown-4e3a); privacy/version-control framing — [toolradar](https://toolradar.com/tools/bruno)
- Migration narrative: [Ditching Postman, DEV (tanyonghe)](https://dev.to/tanyonghe/ditching-postman-why-and-how-i-transitioned-to-bruno-535e) (date not confirmed)

### Inferences
- Any competing tool should treat file-based, diffable collections and offline use as table stakes, and keep lightweight footprint.

### Gaps
- No direct user survey; dates for some DEV posts unconfirmed.
