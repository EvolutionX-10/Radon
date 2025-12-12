export * from './types.js';
export { conversationManager } from './conversation-manager.js';
export { discordDocs } from './docs-fetcher.js';
export { createMemberTools } from './member-tools.js';
export { createChannelTools } from './channel-tools.js';
export { createRoleTools } from './role-tools.js';
export { createInfoTools } from './info-tools.js';
export { createMessageTools } from './message-tools.js';

import type { AIToolContext } from './types.js';
import { createMemberTools } from './member-tools.js';
import { createChannelTools } from './channel-tools.js';
import { createRoleTools } from './role-tools.js';
import { createInfoTools } from './info-tools.js';
import { createMessageTools } from './message-tools.js';

/**
 * Create all AI tools with the given context
 */
export function createAllTools(context: AIToolContext) {
	return {
		...createMemberTools(context),
		...createChannelTools(context),
		...createRoleTools(context),
		...createInfoTools(context),
		...createMessageTools(context)
	};
}
