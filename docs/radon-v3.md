# Radon V3 · version 3.0.0

V3 is the public name for Radon's third major version. `package.json` is bumped
from 2.0.0 to 3.0.0. `shared/release.json` provides the public identity used by the
website and bot About/Stats screens. It is descriptive metadata, not a feature flag.
The V3 entry in `shared/updates.json` is rendered unchanged by the website and
`/updates`; earlier release IDs remain selectable.

## Release comparison

The requested four-to-five-day comparison uses the repository snapshot as of
October 27, 2026: `14c3e26` (the last commit at that point, dated October 11).
The first repository commit is `1a71438`, February 20, 2022. Public copy says
February 2022 and four years; it does not claim a fifth anniversary in 2026.

The release branch includes the game/rewards/UI stack (#591, with website #592),
bug reporting and shared updates (#593), server handbook (#594), and the sibling
setup/diagnostics work (#595), combined with a merge commit. Earlier moderation
work through #589 is already in main. This is an integration PR targeting main;
the existing feature PRs remain available for their individual reviews.

| Area | Earlier snapshot | V3 implementation |
| --- | --- | --- |
| Games | Solo Leveling claim workflow | Three adapters, per-game accounts, optional vote rewards and alerts (#591) |
| Records | Warnings and editable channel logs | Stored moderation cases, audited reasons, staff notes, and member reports (#588) |
| Recovery | Existing lock and moderation commands | Saved lock permissions and timers (#585), persistent temporary bans (#589), concurrent warning protection (#584) |
| Safety | Staff-led actions and warning thresholds | Stronger permission/outcome checks (#582), optional AutoMod and join response (#586) |
| Setup | Earlier staged role/log setup | Reviewed four-step setup, saved-settings browser, /doctor and shared diagnostics (#595) |
| Experience | Older mixed command replies and help | Components V2 UI, contextual help (#580/#591), progress feedback, player/server website guides (#592/#594) |
| Feedback | No dedicated saved bot-bug inbox or shared updates catalogue | Private bug reports, owner review, shared website/Discord updates (#593) |

The logo is the new lavender R mark introduced with the website redesign. V3 gives
that identity a prominent release treatment and version badge; it does not replace
the just-reviewed logo with a second design. `/about me` continues to use the bot's
actual Discord avatar. Updating that live avatar is an operator action outside
this PR.

## Launch state

V3 is a **preview**, with full launch planned after the relevant Discord intent
approval. There is no promised approval or launch date. This PR does not enable
privileged intents, change environment flags, register commands on a live bot,
change production data, or publish a GitHub release/tag.

Core commands, coupons, and native Discord AutoMod presets do not require Message
Content access. Custom message inspection and join-burst detection depend on the
relevant access and explicit operator configuration. Keep their existing gates.
The website makes this distinction and does not claim approval from application
flags. For feature availability, use `/doctor` and `/automod status`.

Public copy emphasizes clearer feedback, fewer repeat steps, more features, and
recovery safeguards. It makes no unsupported speed multiplier, uptime guarantee,
or automatic-redemption promise. Publisher and Discord latency still apply.

After acceptance and approval, update the descriptive preview status and add a
dated shared update when the full launch actually happens. Existing feature docs
remain the source for their normal rollout and staging acceptance steps.
