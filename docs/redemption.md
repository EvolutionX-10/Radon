# Redemption module

Radon's existing Solo Leveling commands and `code-COUPON` buttons remain supported. All slash, button and setup-modal redemptions use `RedemptionService`. Only the existing Solo Leveling request adapter is enabled.

## Behavior

- Save up to five accounts with `/claim set member_code:… name:Main`. Calling it again with an existing code updates its name. `/claim view` and autocomplete display names and masked codes; autocomplete values remain the original code for compatibility.
- Every command response and claim result is private. Public coupon posts contain the coupon, optional reward preview, and claim button only.
- Posting requires Manage Messages or the role configured by `/claim policy posting_role:…`. Manage Server is required to configure policy. `posting_channel` restricts posts to one channel. `reset:true` restores the default. Posters must be able to view and send messages in the destination themselves.
- `/claim post expires_in:…` accepts the coupon's announced remaining validity in minutes. Radon does not infer publisher expiry. Expired buttons cannot redeem and are disabled on the first click after expiry; submitting an already-open setup modal also checks expiry.
- Reward previews use only the poster's own saved account. Without one, or when lookup fails, Radon posts a generic coupon card. The old hardcoded account identifier has been removed.
- The service validates before outbound calls, allows one batch per user every three seconds across bot instances, and limits outbound starts to one per publisher per second across instances. Each process also has a serial publisher queue bounded to twenty pending requests. A publisher `429` respects Retry-After (seconds or HTTP date, bounded to one day) across instances. This is a conservative local policy, not a claim about Netmarble's undocumented limits.
- No redemption POST is automatically retried. Network failures, unexpected responses, and server errors have unknown outcomes: the user must check the in-game mailbox before trying again. Matching requests are held for ten minutes, including when a process crashes after dispatch.
- Confirmed successes are stored as SHA-256 tuple keys (game, account, exact coupon), preventing repeat requests after restart. Existing redemptions before this change are not backfilled; the publisher may reject those as already used.
- Full member codes, raw interaction error payloads and raw publisher responses are excluded from both claim and command-run logs. Errors returned to users use controlled text rather than arbitrary publisher text.

## Persistence and rollout

Existing `memberCodes` documents remain the source of Solo Leveling accounts. No account migration, deletion, or production database command is included. Array changes use native MongoDB compare-and-swap commands (rather than Prisma updateMany preselected IDs) with bounded retries, including first-account creation and the five-account limit.

The additive Prisma models are `redemptionReceipt`, `redemptionAccountLabel`, and `redemptionGuildPolicy`; their only unique indexes are MongoDB's default `_id` indexes. Generate Prisma Client during build (`bunx prisma generate`) before deploying. MongoDB creates the collections on first write, provided the bot's database identity has its usual create/write permissions. Do not create a TTL index on all receipts: it would erase successful-redemption history. Cooldown and uncertain-outcome rows are reused after expiry; successful rows are retained.

An unavailable receipt store fails closed, before any redemption request is sent. Account labels are separate optional metadata; a failed label write can leave a successfully saved, unnamed account and can be retried with `/claim set`.

Deployment changes coupon posting from unrestricted users to staff/configured roles and changes slash redemption results to private. Review these intentional behavior changes with server moderators.

## Adding another game

An adapter declares an ID, publisher, member-code validation, optional preview and redemption response mapping. `RedemptionAccount` provides optional name/server fields for future games. Do not reuse Solo Leveling account persistence for games needing server or character selection: introduce explicit per-game records and a compatibility migration first.

Official forms checked on 2026-10-31:

| Candidate                                                      | Form fields                                     | Remaining validation                                                                                             |
| -------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [Seven Knights Re:BIRTH](https://coupon.netmarble.com/tskgb)   | Member code, coupon                             | Request fields verified in deployed client; publisher automation policy and account-owned acceptance test remain |
| [7DS Idle Adventure](https://coupon.netmarble.com/nanarise)    | Member code, coupon                             | Same; page documents a one-hour lockout after ten consecutive invalid coupons                                    |
| [Grand Cross](https://coupon.netmarble.com/nanagb)             | Member code, server, coupon                     | Server-aware persistence and contract/policy validation                                                          |
| [Tower of God: New World](https://coupon.netmarble.com/tog)    | Member code, character selection, coupon        | Character selection and contract/policy validation                                                               |
| [7DS Origin](https://coupon.netmarble.com/nanaori)             | Member code, character/server selection, coupon | Explicit destination confirmation; cannot redeem one coupon across multiple servers                              |
| [Cookie Run: Kingdom](https://coupon.devplay.com/coupon/ck/en) | DevPlay account, coupon                         | Request contract, potential email handling, challenges and publisher policy                                      |

The Re:BIRTH page's `__NEXT_DATA__.props.pageProps.gameWebpageInfo` declares `gameCode: tskgb`, `rewardData: pid`, `apiType: D`, and a `pid` input. Netmarble's [published coupon JavaScript](https://sgimage.netmarble.com/common/coupon/service/v1/_next/static/chunks/pages/%5BgameCode%5D-3cd5514d2b5649ef.js) constructs `POST /api/coupon` with `gameCode`, `couponCode`, `langCd`, and `pid`; character/world fields are conditional. The same client defines rejection codes such as invalid PID (21002), invalid coupon (24002), expiry (24003) and limit exceeded (24004). Radon maps only known rejection codes and retains uncertain delivery errors. The publisher's [service terms](https://help.netmarble.com/en/terms/terms_of_service_en_?lcLocale=en) do not establish explicit third-party coupon automation permission from this review. No real redemption was sent.

A public form without OAuth does not establish a supported automation API or guarantee absence of CAPTCHA, service throttling, or account restrictions. No real redemptions were sent during implementation. No new game is enabled on the strength of a matching form alone.

## Verification

`RADON_REDEMPTION_TEST_MONGO='mongodb://127.0.0.1:27028/radon_test_redemption?directConnection=true&replicaSet=radonTest' bun test tests/redemption.mongo.test.ts` runs opt-in real MongoDB concurrency tests. The suite rejects remote hosts, credentials and databases outside the `radon_test_*` prefix, and never falls back to `MONGO`. It clears only the dedicated test database's redemption collections.

`bun test` exercises mocked publisher responses, duplicate and uncertain-outcome protection, shared user/provider limits, concurrent account changes, old button compatibility, expiry boundaries and bounded queue behavior. `bun typecheck` validates Prisma queries and Discord component/interaction types. These checks do not replace a controlled acceptance test in a Discord staging server with the account owner's consent.
