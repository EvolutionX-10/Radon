# Vote rewards and listing operations

## Reward policy

Either Top.gg or Discord Bot List grants the same Supporter Pass. Its fixed expiry is 24 hours after timestamped vote evidence; the legacy Top.gg boolean API grants from first verification, once per active pass. Benefits are ten saved accounts per game and optional server/game coupon alerts. Free users retain five accounts per game, normal claims, and one-account redemption. Extra accounts are never deleted at expiry.

`/vote` and Check my vote are the only paths that contact vote APIs. Claiming reads local entitlement data only when a batch contains more than five accounts. Missing entitlement data falls back to the free allowance. Random post-command vote prompts and their per-command API requests have been removed. Void Bots links and configuration are removed.

## Configuration

| Variable        | Purpose                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `TOP_BOT_TOKEN` | Existing Top.gg listing token; used for checking votes and posting statistics.                   |
| `DBL_BOT_TOKEN` | Discord Bot List API token from Radon's Edit Bot page; used for GET upvotes and POST statistics. |

Do not reuse `VOID_BOT_TOKEN` for Discord Bot List. It is a different service. Never use the Discord bot login token as a listing API token. No new credentials are needed for normal coupon claims.

The current environment had `TOP_BOT_TOKEN`, but no `DBL_BOT_TOKEN`, when checked on 2026-10-31. Top.gg's legacy statistics API accepted the current token; v1 returned 401. The implementation tries v1 and falls back to the legacy API on 401/403, remembering the compatible API for the process lifetime. It uses a new process after a token rotation. Credential values and raw provider error bodies are never logged.

The [Top.gg v1 vote API](https://docs.top.gg/api/v1/votes) uses `Bearer` authentication and `/projects/@me/votes/:discord_id?source=discord` for project tokens. Trusted timestamps produce an atomic MongoDB `$max` expiry; duplicate and out-of-order evidence cannot shorten or slide it. The [legacy API](https://docs.top.gg/api/v0/bots) returns a 0/1 recent-vote flag; its grant uses an atomic create or expired-record compare-and-swap, so concurrent checks cannot extend an active pass.

The [Discord Bot List vote API](https://docs.discordbotlist.com/vote-api) returns the most recent 500 timestamped votes. Radon coalesces requests and caches the list for one minute. Only the caller's returned vote can grant their pass. A vote no longer present in the 500-item window cannot be verified here; the user can verify promptly or use Top.gg instead. If vote traffic approaches that window, implement the provider's authenticated vote webhooks before relying on DBL as the only reward source. This release requires no publicly exposed webhook listener or Railway port change.

User checks have a durable 30-second cooldown. Shared provider request slots limit starts to approximately 54/minute across instances. One-time Top.gg compatibility discovery may make two requests in its first slot. A 429 blocks verification requests to that provider for one minute. Requests have three-second timeouts and neither failures nor a missing token revoke an existing pass.

## Listing counts

The old bot-list plugin registration and auto-post configuration were commented out. Read-only checks on 2026-10-31 found 89 production Discord guilds while Top.gg reported 42. No production stats were overwritten during development.

After deployment, the production bot posts its live cached guild count on readiness, every 30 minutes, and on debounced guild joins/leaves. With a ShardingManager, only shard 0's process posts, all shard processes must report ready, and their guild counts are summed. The periodic refresh also covers joins/leaves on other processes. Top.gg receives `server_count`; [Discord Bot List](https://docs.discordbotlist.com/bot-statistics) receives `guilds`. No privileged member-list intent is needed.

Reporting requires `NODE_ENV=production` and the actual Radon bot ID `944833303226236989`. Development bots never send production listing stats or use production listing credentials for reward verification. Missing tokens and failed HTTP responses produce bounded diagnostics, never a fake success. Worker intervals are stopped on client destruction.

## Persistence and alerts

Generate Prisma Client during the build. Additive collections are `supporterPass`, `couponSubscription`, and `couponAlert`; Solo Leveling's existing `memberCodes` and label keys stay untouched. Other games use `game:<gameId>:<userId>` document keys in the existing account collection. Atomic array comparison still protects concurrent changes and the five/ten-account limits.

MongoDB automatically supplies the `_id` indexes required for correctness when collections are created. Compound indexes declared in the schema improve queries at scale; apply them through the project's normal reviewed schema rollout. No production schema command runs as part of tests or this PR.

Subscriptions are explicit per user, guild, and game. A successful coupon post queues a durable outbox entry. Its failure does not turn an already-posted coupon into a command failure; a bounded warning records that alerts were not queued. Each worker scans only guilds on its own client, claims a 60-second renewable lease, and pages through 25 subscribers at a time with a persisted cursor. It checks active passes, current subscription state, guild membership, and current source-channel visibility before sending. Individual member fetches work without a privileged GuildMembers intent.

Delivery uses the shared receipt store with a game/user/coupon hash written before the DM. This deliberately favours at-most-once notification attempts: a crash or uncertain send may omit one alert instead of sending duplicates. Reposts and multiple opted-in servers cannot generate repeated DMs for that coupon. Closed DMs are not retried. The latest subscription date prevents retroactive notifications when someone re-enables alerts.

Outbox entries expire at the earlier of the supplied coupon expiry or 24 hours after posting. Expired entries are removed by the worker; completed entries are deleted using the lease token. Do not TTL-delete all redemption receipts: successful redemption and alert deduplication records must remain.

## Deployment and acceptance

1. Build with `bun run check`; no database migration or re-saving existing Solo Leveling accounts is required.
2. Configure `DBL_BOT_TOKEN` in the **production deployment** to enable Discord Bot List verification and count posting. The development environment's configuration does not change Railway.
3. Verify the new `/vote`, `/guide`, and `/claim` optional fields are registered. `/claim` uses the existing overwrite registration behaviour; new commands are discovered by `/help` after registration.
4. On the development bot, verify old `code-…` and `redeem:…` posts, first-time forms, game separation, expired posts, and private results. Use mocked listing credentials for automated tests; production listing credentials are intentionally disabled for the dev bot.
5. With an account owner's consent, validate one current coupon for each new game. No real redemption was sent during implementation. Netmarble's deployed coupon page metadata and client request shape were inspected; that does not guarantee live delivery or publisher permission for all third-party automation.
6. On production, verify one genuine vote, the displayed fixed expiry, ten-account allowance, one opted-in alert, unsubscribe, and closed-DM behaviour. Check that listing counts converge to the live count after readiness.
7. If a provider fails, check its token and HTTP diagnostics. Basic claims stay available. Keep saved account and reward documents when rolling back. A pre-rewards binary rejects batches containing more than five accounts, so retain the new batch-slicing compatibility logic if reverting after users have saved extra accounts; do not delete user accounts to force compatibility.

## Tests

`bun test` exercises command compatibility, game routing, button/modal formats, fast healthy claims, delayed-status ordering, guide payload limits, listing payloads, and production/dev guards.

For real persistence tests, use a disposable localhost MongoDB replica set, for example:

```sh
RADON_REWARDS_TEST_MONGO='mongodb://127.0.0.1:27028/radon_test_rewards?directConnection=true&replicaSet=radonTest' bun test tests/rewards.mongo.test.ts
```

The suite rejects remote addresses, credentials, and database names outside `radon_test_*`. It never falls back to `MONGO`. It verifies concurrent and out-of-order grants, legacy repeated checks, provider failures, per-game account limits, account retention, coalesced DBL requests, and leased/deduplicated alerts. CI runs it against the existing disposable replica set.
