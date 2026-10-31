# Private bot bug reports

Run `/bug` in a server to read the reporting warning, then choose **I understand · Report a bug**. The form asks for a short summary and reproduction steps, including the expected and actual result. The warning says: **Spam, false reports, harassment, or other misuse will lead to a ban from using Radon.** Reports must never contain passwords, tokens, or private account codes.

The warning, form acknowledgement, and owner inbox responses are private. A successful acknowledgement includes the report reference. Reports are saved before a direct message to the configured bot owner is attempted; disabled owner DMs do not lose the report. A repeated Discord interaction cannot create another report or extend its cooldown. If saving fails, the user is told to retry and keep their own copy. Reports are excluded from the general command-log webhook.

Each user can submit one report every ten minutes. The report and cooldown commit in the same MongoDB transaction, with bounded retries for concurrent writes. The limit survives restarts and is shared across servers and shards. The database must support transactions (a replica set, including MongoDB Atlas).

## Owner inbox

`/bugreports` is restricted to the bot owner in both framework authorization and runtime/service checks. It is registered in the configured Radon support and test servers, like other owner tools.

- `/bugreports list [status] [before]` shows five reports at a time, newest first. The response includes the next page's `before` reference when another page exists. Status defaults to `open`.
- `/bugreports view id:<reference>` shows the submitted text, reporter, server/channel IDs, and any review.
- `/bugreports review id:<reference> status:<open|resolved|dismissed> note:<text>` records a private review and retains the original evidence. Choose `open` to reopen a report.
- `/bugreports ban user:<user> reason:<text>` manually bans a user from using Radon for misuse. It does not ban the user from Discord servers or blacklist their guild.
- `/bugreports unban user:<user> reason:<text>` restores bot access. Existing reports and the last recorded ban/unban reason are retained.

Only configured bot owners can perform these actions, and owners cannot be banned through these tools. Ban enforcement covers message commands and all incoming Discord interactions, including older buttons, open confirmation/setup collectors, modals, and autocomplete. The interaction gate runs before the raw Discord event is delivered to subscribers, preventing a pending collector from bypassing a later ban. Access checks fail closed during database failures and time out after 1.5 seconds so Discord can receive a private error promptly. The gate does not cancel an action that was already authorized and running before the ban.

## Storage and deployment

`bugReport` retains the summary/details, reporter/server/channel IDs, submission time, status, and the latest reviewer ID/time/note. `bugReporter` holds the persistent cooldown and current user-ban state, reason, owner ID, and update time. Reports are visible only to configured owners and may be sent directly to them. There is no automatic deletion; owners must remove records through their database administration process when no longer needed.

These are additive collections; existing moderation reports and guild blacklists are unchanged. Generate Prisma Client with `bun run db:generate` and apply declared indexes through the normal database deployment process. No production database changes are performed by the tests.

Run `bun test tests/bugReports.test.ts` for offline validation. The persistence suite runs only when `RADON_BUG_TEST_MONGO` explicitly targets an unauthenticated localhost database whose name starts with `radon_test_`, for example:

```sh
RADON_BUG_TEST_MONGO='mongodb://127.0.0.1:27028/radon_test_local_bugs?directConnection=true&replicaSet=radonTest' bun test tests/bugReports.mongo.test.ts
```

Use a disposable replica set. The integration suite deletes its own test collections and never reads `MONGO` or production credentials.

For manual acceptance in a test server: submit a valid report, confirm the private success/reference and owner inbox, close the owner's DMs and submit as another user, review a report, confirm a second report is rate limited, then open a setup/confirmation control and ban that test user before clicking it. The control must return a private ban error without performing its action. Unban the test user and confirm access is restored.
