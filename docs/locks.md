# Restorable channel locks

`/lock` saves the affected permission states to `channelLockSnapshot` in MongoDB before changing Discord. `/unlock` restores those states, including explicit allows, explicit denies, inherited values, role permission bits, and a thread's locked/archived state. A reason only records context and never changes restoration behavior. Unrelated permission bits changed while a lock was active are preserved.

The command names and administrator-only bulk routes are retained. Voice locks now use the same confirmation modal as text locks. Modal prompts expire after five minutes, belong to their initiating user and server, and cannot overwrite another open prompt. Permission and role checks run again on submission.

Bulk requests run sequentially with discord.js REST bucket handling. Progress appears every ten targets and the final response reports completed, skipped, and failed targets. The bot does not create permanent member overwrites to exempt itself. Channel permission changes can therefore prevent normal bot messages; interaction responses remain private and channel management remains available with Manage Roles.

A saved snapshot prevents a second lock on the same channel/role from overwriting its recovery data. MongoDB `findAndModify` leases serialize restoration across processes. Snapshots remain after failed or ambiguous API requests, so unlock can be retried. Leases renew every 30 seconds while a Discord request is in flight, with ownership verified before success or snapshot deletion. A terminated worker's lease expires after two minutes. Run the matching unlock command if a lock request reports a failure.

## Deployment and existing locks

Generate Prisma Client from the updated schema during installation. Provision the additional indexes with the normal reviewed Prisma MongoDB schema deployment procedure. No existing collections need to be rewritten. The collection's `_id` is the unique lock key.

Locks created before this update have no trustworthy snapshot. Unlock reports those targets as skipped and asks an administrator to restore their permissions manually. It does not guess original permissions or grant access to previously restricted channels.

Server locks without `deep` affect the selected role's base permissions; channel-specific allows can still override those permissions. A deep server lock changes each supported channel's overwrite. To restore a server lock, use the same `deep` setting. Administrators and other role/member allows remain subject to Discord's permission resolution rules.

The unit suite covers persistence ordering, concurrent locks/restorations, partial failures, lease recovery, exact permission states, and isolated modal sessions. Live Discord permission behavior and MongoDB deployment should be smoke-tested in a test server/database before production rollout. No live services are contacted by these tests.

## Temporary locks

The lock modal accepts an optional duration such as `10m`, `2h`, or `1d 6h`, from ten seconds to 28 days. Leave it empty for a manual lock. The expiry is saved with each permission snapshot. A startup worker restores overdue locks and polls every 30 seconds; deadlines can be delayed while the bot is offline or Discord is unavailable. Manually unlocking removes the saved schedule. A second lock does not overwrite an existing lock or extend its expiry.

Failed automatic restorations keep their snapshots, log an error, and retry after five minutes. They never automatically clear recovery data. The worker processes only guilds owned by the current client/shard, and the same Mongo leases protect manual and automatic restoration.

MongoDB and Discord cannot participate in one transaction. A process crash or prolonged database outage during an unknown Discord API outcome can still require an administrator to inspect the channel before retrying restoration. A changed lease token prevents the previous worker from reporting success or deleting another worker's snapshot. Do not manually delete snapshots to clear a stuck job.

Run the optional real-database tests only against a disposable local database:

```sh
RADON_LOCK_TEST_MONGO='mongodb://127.0.0.1:27028/radon_test_locks?directConnection=true&replicaSet=radonTest' bun test tests/locks.integration.test.ts
```

The integration test validates the localhost `radon_test_*` destination before creating a client and never reads the production `MONGO` variable. It clears only that database's lock test collection. Regular `bun test` skips these database checks.
