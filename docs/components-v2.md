# Discord interface

Radon uses Discord Components V2 for player guides, rewards and coupon alerts,
moderation cases and reports, AutoMod, setup, and command feedback. Existing
permissions, persistence, moderation actions, claim throttling, and button routes
are preserved. No data migration is required.

## Case references and reason edits

New moderation logs have a short action title, member names and an avatar, the
reason, and a small **Case reference** below the details. They no longer repeat
the Discord message ID in the footer. Copy the full case reference for `/case`
commands. Discord's Copy Message ID still supplies the log message ID if needed.

| Reference          | Purpose                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Case reference     | Saved moderation action; use with `/case view`, `/case note`, or `/case reason`.                                           |
| Report reference   | A submitted message report; use with `/reports view` or `/reports reset`. A timeout from a report creates a separate case. |
| Warning ID         | An individual warning; continue using it with `/warn remove`.                                                              |
| Discord message ID | Locates the Discord log message; it is not a case or report reference.                                                     |

`/case help` and `/guide topic:cases` explain the complete workflow:

- `/case history member:MEMBER` shows ten recent cases. Supply the last case's
  reference in `before` to fetch older cases.
- `/case note` adds a staff note without taking a new moderation action.
- `/case reason` edits the stored case reason and retains its audit history. As
  before, it does not rewrite the posted log or the warning record.
- **Edit Reason** on a log updates the Discord message and its linked case. On
  warning logs it also updates the stored warning, including for departed users.

Older embed logs and existing edit buttons remain supported. They are not
rewritten automatically. Case views and command acknowledgements remain private.

## Reports and guides

Report notifications and `/reports view` show the reported member and reporter's
server display names and avatars. User IDs remain secondary reference text.
Departed members fall back to their account profile when available. Review buttons
retain their existing permissions and actions. Completed V2 reports retain the
message evidence, show the outcome, and disable the review buttons.

`/guide` provides seven short pages with navigation: getting started, games, vote
rewards, troubleshooting, coupon posting, moderation cases, and AutoMod. A guide
button on a public post opens a private response; it never replaces that post.

## Implementation constraints

See Discord's [message components guide](https://docs.discord.com/developers/components/using-message-components)
and [component reference](https://docs.discord.com/developers/components/reference).
Components V2 requires `IsComponentsV2`, replaces legacy content and embeds, and
cannot be switched off once set. Converting an older private guide explicitly
clears its content and embeds. Shared cards bound text to Discord's message limit;
structured screens are checked against both the 4,000-character and 40-component
limits. Identifiers and custom button IDs remain unchanged.

Moderation log text components have stable numeric IDs so reason editing can find
its text and warning references after a restart. Pagination converts resolved
Sapphire pages while keeping existing collectors and navigation. Session expiry
removes navigation and retains the current card.

Validation uses mocked Discord interactions and the existing offline and disposable
MongoDB suites. Live Discord rendering still needs a visual check in a test server.
