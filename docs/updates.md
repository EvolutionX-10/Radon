# Player updates

`/updates` privately shows the latest player-facing changes. The optional `release` field searches older entries by title, date, or ID. The website's `/updates` page and home-page teaser read the same history.

To publish another update with a deployment, prepend an entry to `shared/updates.json` with a unique stable `id`, ISO calendar `date` (`YYYY-MM-DD`), `title`, `summary`, and a nonempty `changes` array. Keep entries newest first. Use plain text; changes should explain behavior and commands people can use. Do not put secrets or internal implementation notes in the public history. Entries become visible when the bot or website is deployed; adding an entry does not send messages to users.

Keep titles and IDs under 80 characters, summaries under 300 characters, and complete entries under 3,500 characters so the Discord card fits. Run `bun test tests/updates.test.ts` and the website build after changing the manifest. The manifest is separate from the generated developer `CHANGELOG.md`.
