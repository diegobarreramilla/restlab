## What's New in RestLab

RestLab is a local-first API client. Your collections stay in plain files on your disk, and the app asks for no account.

### Nothing leaves your machine unless you start it

* **No telemetry.** The analytics code was removed, not just switched off.
* **Product notices are opt-in.** The app does not check for announcements unless you turn that on in Preferences, General, Privacy.
* **OAuth2 works on your machine.** The sign-in redirect returns to a short-lived local address, so no web page has to hand the code back to the app.
* **Generated API docs are self-contained.** The file embeds its viewer and opens with no internet connection.

### You always know when you are offline

A short label at the top of the window says when the computer has no route to the network, and a brief "Back online" appears when it returns. Features that were waiting for the network resume by themselves.

### AI is optional and does nothing until you ask

* **Off by default.** With it off, no AI control is visible and nothing is sent anywhere.
* **Bring your own key, or run locally.** OpenAI, Anthropic, any OpenAI-compatible service, or a local model such as Ollama with no key.
* **See what would be sent.** The "What's sent" view shows the exact text, with secrets already hidden, before you press Send.
* **Review before sending.** Turn on a confirmation step to approve every AI request.
* **Secrets are hidden, and put back for you.** Tokens, passwords and keys in your requests are replaced with numbered placeholders before sending. When the assistant rewrites a script, the real values return when you apply the change.
* **Autocomplete is a separate switch** and stays off until you enable it.

### Housekeeping

* The app is now called RestLab. Collection files keep the same formats and still open in other tools that read them.
* Links that pointed to another project's documentation and issue tracker were removed. RestLab's own will appear when they exist.
