# Coupons, games, and optional vote rewards

Use `/guide` inside Discord for a private guide with Getting started, Games, Vote rewards, Troubleshooting, and Posting coupons buttons. `/help` lists `/guide`, `/vote`, and the individual `/claim` routes available to you.

## Already using Solo Leveling?

Keep using the same commands and the same CLAIM buttons. Your saved accounts, account names, and existing coupon posts still work. Solo Leveling: ARISE remains the default. You do not need to migrate or save anything again.

## Your first claim

1. In the game, open Settings → Account and copy the Member Code. This is an account identifier, not your password or sign-in token.
2. Press CLAIM on a coupon post. On your first visit, paste the code into the form and submit. Radon saves the account and claims that coupon.
3. For later coupons, press CLAIM once. Results appear privately and rewards arrive in the game's mailbox.

If you already have saved accounts, pressing CLAIM uses them immediately. There is no game picker, account confirmation, or mandatory vote screen between you and redemption.

You can also save once with `/claim set member_code:YOUR_CODE name:Main`, then redeem with `/claim code coupon_code:CODE`. The name is optional. Running `set` again with the same member code renames it without creating a duplicate.

Use `/claim view` to see masked accounts privately. `/claim delete member_code:YOUR_CODE` removes an account; existing account names appear in autocomplete. `/claim solo member_code:YOUR_CODE coupon_code:CODE` redeems for one particular account and does not require saving it first.

## Choose another game

Supported games are Solo Leveling: ARISE, Seven Knights Re:BIRTH, and The Seven Deadly Sins: Idle Adventure. Add the optional `game` field to the same commands:

```text
/claim set member_code:YOUR_CODE game:Seven Knights Re:BIRTH
/claim code coupon_code:CODE game:Seven Knights Re:BIRTH
/claim view game:Seven Knights Re:BIRTH
```

Discord presents the full game names as choices. Accounts and account names are separate for each game. A posted CLAIM button already contains the correct game, including in a personal coupon alert. Omit `game` for Solo Leveling.

For Idle Adventure, ten consecutive invalid coupon entries can lock entry for one hour. Use trusted published codes and check the game before submitting. Radon never automatically retries redemption POSTs.

## Optional Supporter Pass

Normal claiming and five saved accounts per game are free. To support Radon:

1. Run `/vote`, or open `/about me`.
2. Vote on either Top.gg or Discord Bot List, using the same Discord account.
3. Press Check my vote. Verification can take a minute to appear; wait at least 30 seconds between checks.

One verified vote grants a 24-hour Supporter Pass: ten saved accounts per game and optional personal coupon alerts. Both sites give the same benefits. Voting on both does not add the durations together, and repeated checks do not extend the same reward. No streak or daily task is required.

With timestamped votes, the pass ends 24 hours after the actual vote. For the older Top.gg API, which only reports whether a recent vote exists, the pass begins at the first successful verification and cannot be extended while active. The exact expiry is displayed in `/vote`.

When a pass expires, all accounts remain saved. Batch claims use the first five in saved order. `/claim solo` still allows you to redeem for a particular account; deleting extras is never required. A new pass makes all ten available again.

If verification is temporarily unavailable, existing passes keep their saved expiry and basic claiming continues. Some voting sites may be waiting for owner configuration; voting links alone do not prove that a vote has been verified.

## Personal coupon alerts

Run `/claim alerts enabled:True` in a server to follow Solo Leveling coupons there. Add `game` for another supported game. You can subscribe before activating a pass; delivery pauses while you have no active pass.

Alerts cover future coupons posted by that server's staff through `/claim post`. They do not scrape the internet, promise exclusive publisher rewards, or automatically redeem anything. You must still be able to view the coupon's channel when the alert is sent. No alerts are sent for older posts when you subscribe or renew.

Allow direct messages from that server. Each game/coupon is sent at most once to a user across servers, including reposts. Closed DMs and uncertain sends are not retried. Turn a subscription off with `/claim alerts enabled:False`, using the same server and game. Leaving a server or losing channel access prevents delivery.

## Posting coupons as staff

`/claim post code:CODE` still posts Solo Leveling with the same primary CLAIM button. Use optional `game` for another game, `channel` for a destination, and `expires_in` for minutes until the publisher's announced expiry. The How to claim button opens a private guide and never changes the public post.

Posting requires Manage Messages or the configured posting role. `/claim policy`, available with Manage Server, sets an allowed role or destination channel. Personal alerts respect recipients' current access to that destination.

## When a claim takes longer

Radon acknowledges commands privately, processes accounts through a bounded publisher queue, and replaces the loading response with a status message if processing takes more than about four seconds. Final results replace that status. Five healthy mocked account redemptions are tested against a five-second target; publisher latency, throttling, database delays, and larger batches can take longer. A status message does not mean redemption succeeded.

For an unknown outcome, check the in-game mailbox before trying again. Radon holds uncertain outcomes to avoid sending the same request twice. Confirmed successes are remembered across restarts. Expired coupons cannot be restored, and voting never bypasses publisher limits.
