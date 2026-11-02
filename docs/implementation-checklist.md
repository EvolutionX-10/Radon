# Moderation improvement checklist and review order

The code is proposed in separate pull requests. Nothing has been merged or deployed.

## Pull requests

Review and merge the main stack in this order. Each PR targets the preceding
branch so its diff contains only its own feature:

1. [#581 — Bun setup and CI](https://github.com/EvolutionX-10/Radon/pull/581)
2. [#582 — Moderation permissions and truthful outcomes](https://github.com/EvolutionX-10/Radon/pull/582)
3. [#584 — Atomic warning updates](https://github.com/EvolutionX-10/Radon/pull/584)
4. [#585 — Restorable locks and timed restoration](https://github.com/EvolutionX-10/Radon/pull/585)
5. [#586 — Opt-in AutoMod](https://github.com/EvolutionX-10/Radon/pull/586)
6. [#587 — Redemption service and account controls](https://github.com/EvolutionX-10/Radon/pull/587)
7. [#588 — Moderation cases and private reports](https://github.com/EvolutionX-10/Radon/pull/588)
8. [#589 — Persistent temporary bans](https://github.com/EvolutionX-10/Radon/pull/589)

[#583 — Performance measurements](https://github.com/EvolutionX-10/Radon/pull/583)
can be reviewed separately after #581; it has no other feature prerequisite. The combined
validation checkout includes it with the full stack.

Use merge commits to preserve stack ancestry. If a parent is squash-merged or
rebased instead, rebase its remaining child branches onto the new main before
merging them. Do not merge a child before its prerequisites. No automatic merge
or production database operation is configured by these PRs.

## Implemented in the proposed code

- [x] A1–A3: hierarchy and capability checks, explicit staff role IDs, shared action execution, truthful outcomes.
- [x] A4: concurrent-safe warnings, reason edits, limits and escalation configuration.
- [x] A5: exact persisted permission restoration independent of a supplied reason.
- [x] B1–B3: shared execution, fresh role-setting snapshots, awaited bulk work with progress.
- [x] B4: pinned/repeatable Bun setup, Prisma generation, offline and disposable-Mongo CI tests.
- [x] B5: bounded opt-in command/database/redemption measurements and private owner statistics.
- [x] C1: owned Discord-native AutoMod presets with observation and exemptions.
- [x] C2–C3: flood/duplicate detection, domain controls, explicit approved invite codes.
- [x] C4: opt-in join-burst alerts and temporary verification protection with recovery.
- [x] C5–C6: cases, audited reasons, staff notes, private reporting and exclusive review claims.
- [x] C7: persistent timed locks and temporary bans with guarded restoration.
- [x] C8: observation before custom AutoMod enforcement and controlled alerts.
- [x] D1–D3: shared redemption service, adapter boundary, deadlines, durable duplicate/unknown protection and shared throttles.
- [x] D4: named Solo Leveling accounts and atomic account management.
- [x] D5–D7: hashed receipt history, configured posting roles/channels and expiry, masked/private account information.
- [x] Investigate official candidate redemption forms and Re:BIRTH's deployed request contract without sending a redemption.

## Rollout and external validation still to do

- [x] Review and merge the nine moderation PRs (owner confirmed on 2026-10-31).
- [ ] Provision the additive MongoDB indexes/collections through the deployment's reviewed schema workflow; regenerate Prisma Client.
- [ ] Deploy warning writers together so older code cannot bypass revision checks.
- [ ] Configure staff role IDs for servers that previously relied on role names.
- [ ] Smoke-test registration, role hierarchy, report routing, lock restoration and restart recovery in a Discord staging guild.
- [ ] Observe and tune AutoMod before enforcement. Custom content and join detection require explicit operator intent opt-ins; defaults remain off.
- [ ] Perform an account-owner-approved Solo Leveling redemption acceptance test.
- [ ] Validate the new Re:BIRTH and Idle Adventure adapters with consented accounts before production rollout and confirm publisher automation policy. The deployed request contract is inspected; live delivery remains unverified.
- [ ] Add explicit per-game account/server/character persistence before enabling multi-server games; no other game's account is stored in the Solo Leveling array.
- [ ] Configure `bash scripts/setup.sh` in saved cloud-environment setup if fresh instances should bootstrap automatically. The current running instance has Bun in its user-wide PATH; repository code cannot modify the saved cloud image.

See the module guides in this directory for exact behavior, compatibility notes,
database rollout, guarded local integration commands and external API limits.

## Combined validation

The combined checkout of all nine PRs passed 251 tests with the three explicit
local MongoDB test URLs enabled, including 33 integration tests. The default
offline run passed 218 tests. TypeScript, source formatting, Prisma schema
validation and whitespace checks also passed. Discord actions and publisher
redemptions remain mocked; no production database schema was applied.

## Game and reward follow-up

The single game/rewards PR preserves default Solo Leveling command and button paths, adds optional per-game account storage and two member-code adapters, optional fixed-expiry vote perks, server/game coupon subscriptions, and current listing statistics. See [player guide](player-guide.md) and [operations and acceptance checks](vote-rewards.md).
