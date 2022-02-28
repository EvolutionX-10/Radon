import { vars } from '#vars';
import type { GuildMember } from 'discord.js';
/**
 * Runs all checks before executing a moderation command
 * @param executor The member who executed the command
 * @param target The member who was targeted
 * @param action The action that was executed
 */
export function runAllChecks(
    executor: GuildMember,
    target: GuildMember,
    action: string
) {
    let result: boolean;
    let content: string;
    if (!target.manageable) {
        result = false;
        content = `${vars.emojis.cross} I can't perform ${action} on ${target}`;
    } else if (
        executor.roles.highest.position === target.roles.highest.position
    ) {
        content = `${vars.emojis.cross} You can't perform ${action} on ${target}`;
        result = false;
    } else {
        (result = true), (content = '');
    }
    return { result, content };
}
