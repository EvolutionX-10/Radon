# Moderation cases, reports, and temporary bans

These additions do not log in to Discord or modify existing warning documents during installation. Regenerate Prisma Client after checkout. The new collections and their declared indexes must be prepared in the deployment's normal database rollout; no production schema command is run by these changes.

## Cases

Successful moderation events create a case. `/case history member` returns ten cases and a stable `before` case-ID cursor. `/case view`, `/case note`, and `/case reason` are private staff commands. Case reasons retain the previous reason, editor, and timestamp. The existing mod-log reason button and modal now require current configured staff access and record edits against the associated case. Existing warning reasons remain tied to their warning records.

Case recording for all commands requires the strengthen-moderation and atomic-warning PRs, which emit successful events even without a Discord log channel. There is no historical backfill for old moderation actions. Cases only cover actions performed through Radon, not every external audit-log action. A case-database failure is logged and does not suppress the existing Discord moderation log. Logs include a case ID when persistence succeeds; editing the case via `/case reason` updates the case record, while the log's Edit Reason button updates both the log and record.

## Reports

An administrator uses `/reports configure channel` to select a staff text channel hidden from `@everyone`. Review all role and member overwrites: denying `@everyone` does not prove every non-staff role is denied. Members then use Apps → Report Message. The report stores a bounded text excerpt and original link; no privileged Message Content intent is required for the message supplied with the context-menu interaction. Missing text is represented explicitly. Report submission and staff replies are private.

The review message offers Dismiss and Timeout 10 minutes. Every click fetches current staff membership, verifies the bot-owned review message, and atomically claims the report. A timeout runs the same moderation hierarchy and bot-capability checks as other moderation actions. Concurrent staff clicks cannot both claim the report. Once timeout execution begins, success or a network error leaves the review claimed if its outcome cannot be saved or confirmed. It is not automatically reopened for another timeout. `/reports list` and `/reports view` recover reports whose notification failed. `/reports reset` is an administrator-only recovery action for interrupted reviews: inspect the moderation outcome before reopening it.

## Validation

`bun test` runs the offline cases, authorization, report concurrency, tests. The opt-in integration suite requires `RADON_TEST_MONGO_URL` to point explicitly to localhost and a database named `radon_test_*`; it never falls back to the bot's `MONGO` environment variable. Example for a disposable local replica set:

```sh
RADON_TEST_MONGO_URL='mongodb://127.0.0.1:27028/radon_test_cases?directConnection=true&replicaSet=radonTest' bun test tests/moderationPersistence.integration.test.ts
```

The suite deletes its case and report test collections' documents before and after execution. Do not use an application database. Tests verify native compare-and-swap behavior and BSON dates on a real MongoDB instance; Discord requests are mocked. A sandbox-server check remains necessary for live command registration, channel overwrites, and moderation actions before production rollout.
