# Server setup and diagnostics

`/setup start` opens a private, four-step Components v2 wizard: staff roles, logs
and reports, optional protection, then review and save. Existing selections are
prefilled. Back retains draft selections. Cancel and inactivity change nothing;
sessions expire after five idle minutes or ten minutes total. Selections do not
advance the wizard automatically.

Moderator and additional administrator roles are optional: server owners and
members with Administrator or Manage Server already have staff access. Selected
Radon roles do not grant Discord permissions. Roles must exist, cannot be
@everyone/managed roles, and cannot overlap between the two lists.

Logs and member reports can be skipped independently. Reports need a text channel
hidden from @everyone; administrators should review every other role/member
overwrite for staff-only access. Existing channel permissions are never rewritten.
The optional new `#radon-staff` channel is created only after Save, with access for
the bot, the invoking administrator, and selected staff roles. Native Discord
Administrator permissions also bypass channel restrictions as usual.

Protection is unchanged by default. Optional native spam/mention presets and
custom flood/duplicate/join observers add alerts, never enforcement. Custom options
appear only when the running client requests their intent. Both the caller and
bot need Manage Server. Existing active custom modes and existing owned native
rules are kept unchanged, even when they are enforcing or disabled respectively.
Native observers use the chosen log channel; custom observers retain an existing
custom alert destination. Missing custom alert access must be fixed first. Native
alerts may include matched message text, so choose a suitable staff destination.
Thresholds, domains and exemptions remain configurable through `/automod`.

`/setup view` opens a private, read-only browser of the saved staff roles,
destinations and custom protection. Back/Next and Refresh work without opening
another editing session. Native rule details remain available in `/automod status`.

`/doctor` provides a private, read-only diagnostic report. It replaces `/debug`
as the single command for server readiness checks. It checks saved roles and
destinations, feature-specific bot permissions, actual role hierarchy,
visible text-channel restrictions, runtime intent requests,
Discord application access flags, native/custom AutoMod, and overdue scheduled
recovery. Failed reads are shown as unknown. Empty optional settings, role counts
alone, and deliberately hidden channels are not reported as errors. Application
flags are not a claim of Developer Portal approval. Recovery checks use only the
current guild and exclude active leases and future retry backoff.

When deploying this consolidation, the bot owner should use `/slash` to delete
any previously registered `/debug` command (Global, and Guild if present).
Sapphire registers `/doctor` by name, but the current registration policy does
not automatically remove commands whose source files were deleted.

All controls are user-bound; administrator access is refreshed on every action.
Edits are serialized so rapid clicks and expiry cannot race. One editing session
per guild is allowed in each process. Save uses a MongoDB transaction to compare
the reviewed settings/report/AutoMod snapshot and commit related settings together;
stale/concurrent saves are rejected rather than overwriting a newer configuration.
MongoDB must be a replica set, as required by other existing transactional features.
No new collections, indexes or schema fields are introduced.

Discord changes cannot share the database transaction. An uncertain save never
automatically retries or deletes a created channel: inspect `/setup view` and the
server first. Native rule creation follows the settings commit; individual failures
are reported while confirmed settings remain saved. Cross-process transactions
protect stored configuration; they cannot atomically roll back Discord channel or
rule creation, so avoid simultaneous confirmations across workers.

Run `bun run check`. `tests/setup.mongo.test.ts` also runs when the existing guarded
`RADON_TEST_MONGO_URL` selects an unauthenticated disposable
`localhost:27028/radon_test_*` database. It checks real transaction commits,
rollback, concurrent/stale writers, and report routing removal. No test uses `MONGO`
or production credentials.

Before deployment, visually check all four steps on desktop and mobile, selected
defaults, Back/Cancel/expiry, missing permissions, removed roles/channels, skipped
destinations, observation alerts, `/setup view` and `/doctor` in a test
server. Command registration now exposes `/setup start` and `/setup view`.
