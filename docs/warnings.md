# Warning persistence

Warning records and action configuration remain in the existing `guildWarns`
collection. Each write uses a native MongoDB conditional update with an optional
`revision` field. A stale writer rereads the document and retries, reevaluating
limits and duplicate checks against the latest version.

The native command is intentional: Prisma 6.19's MongoDB `updateMany` resolves
matching document IDs before updating them, so its revision predicate would not
protect the actual write.

## Deployment

Regenerate the Prisma client when deploying. Existing documents with missing or
null revisions are upgraded on their first successful write; no backfill or
production `db push` is required for this optional field.

Deploy all bot instances together. Older versions and external writers that do
not honor the revision can still overwrite concurrent changes. Stop those
writers before enabling the new version.

The existing embedded document layout remains unchanged. The cap is 50 stored
warnings per member, including expired warnings, and 10 configured actions per
guild. MongoDB's document size limit still applies to the combined guild record;
this change does not migrate warnings into separate documents.

## Automated thresholds

The warning command uses the successful write's severity snapshot. Only newly
crossed thresholds are eligible for an automated action; simultaneous warnings
cannot both claim the same crossing by reading a later shared severity value.
Expired warnings are excluded from active severity and displayed active counts.

Threshold execution remains event-driven, not crash-durable. A process stopping
between the committed warning and event execution can leave the warning saved
without the punishment. Failed actions require moderator review; subsequent
warnings above the same threshold do not automatically retry that crossing.

## Local integration tests

Ordinary `bun test` skips the MongoDB integration tests. To run them, start a
disposable local MongoDB replica set, generate the client, and provide an explicit
test URL:

```sh
bun x prisma generate
RADON_TEST_MONGO_URL='mongodb://127.0.0.1:27028/radon_test_warnings?directConnection=true&replicaSet=radonTest' bun test tests/integration/warnings.test.ts
```

The test runner accepts only localhost MongoDB URLs with database names beginning
with `radon_test_`. It never falls back to the application `MONGO` environment
variable. Tests delete only their randomly generated guild records afterward.
