# Moderation permissions and execution

Moderator access comes from native Administrator/Manage Server permissions or role IDs configured through `/setup`. A role's name does not grant access. Configure existing staff roles before deploying if the server previously relied on names containing “moderator”. Configured administrator roles also count as moderators. The bot-owner override remains available; it does not bypass target hierarchy or bot capability checks.

Permission preconditions and guarded subcommands load both configured role lists in one fresh database snapshot. Settings are not cached across operations, so a revocation applies to the next operation without cache invalidation. Discord's application command permissions remain a separate requirement, reflected in `/help`.

Ban, softban, kick, timeout, and warning-triggered punishments use `ModerationAction.invoke`. The service refreshes the actor and target membership, rechecks moderator access, and enforces:

- No self-targeting, targeting the bot, or targeting the server owner.
- The moderator must outrank the target; the server owner bypasses their own role hierarchy.
- The bot must have the action's native permission and be able to act on that target.
- Existing protection for Administrator/Manage Server targets remains in place.
- An ID ban looks up membership first. Only Discord's explicit Unknown Member response permits treating the target as absent; network errors fail closed.
- Timeouts must be positive and at most 28 days; removing a timeout is an explicit service option.

The service rejects on API errors. A softban is successful only after both ban and unban complete. If unban fails, the command tells staff to inspect the ban list rather than reporting a completed softban. Successful action events are emitted even without a configured Discord log channel; downstream case persistence can subscribe independently. Failed automated punishments go to the application logger and do not emit a successful moderation event.

## Validation before deployment

Automated tests cover role-name rejection, configured IDs, hierarchy and owner policies, bot capabilities, actor revocation during confirmation, ID-ban lookup failures, partial softbans, timeout validation, automated logging, and fresh settings reads. They use mocks and never connect to Discord or MongoDB.

In a test server, verify configured staff access, equal/higher-role rejection, ban-by-ID, missing bot permissions, timeout removal, and warning-triggered punishment. A Discord integration run is still required before claiming live behavior has been verified.
