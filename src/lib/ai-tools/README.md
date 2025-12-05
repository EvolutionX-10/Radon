# AI Tools - Modular Discord Operations

This directory contains the modular architecture for Radon's AI command system. The AI command uses these tools to perform Discord operations in a safe, typed, and maintainable way.

## Architecture Overview

The AI tools system is designed to be:
- **Modular**: Each category of operations has its own tool module
- **Type-safe**: Strong TypeScript typing throughout
- **Conversational**: Maintains conversation state for natural interactions
- **Documented**: Uses Discord.js v14.19.3 documentation for accuracy
- **Safe**: Proper error handling and permission checks

## Modules

### Core Infrastructure

#### `types.ts`
Defines core types used across all tools:
- `AIToolContext`: Context passed to all tools (guild, channel, member, client, container)
- `ConversationMessage`: Message structure for conversation history
- `ConversationState`: State management for user conversations

#### `conversation-manager.ts`
Manages conversation state across multiple interactions:
- Stores last 20 messages per user/guild
- Auto-expires conversations after 30 minutes of inactivity
- Provides formatted conversation history for AI context

#### `docs-fetcher.ts`
Fetches and caches Discord.js documentation:
- Caches documentation for 1 hour
- Detects relevant entities from user requests
- Extracts specific class documentation (properties, methods)
- Falls back to general knowledge if fetch fails

### Tool Modules

#### `member-tools.ts`
Member management operations:
- **banMember**: Ban a member with optional reason and message deletion
- **kickMember**: Kick a member with optional reason
- **timeoutMember**: Timeout (mute) a member for a duration
- **removeTimeout**: Remove timeout from a member
- **addRole**: Add a role to a member
- **removeRole**: Remove a role from a member
- **setNickname**: Change a member's nickname
- **getMemberInfo**: Get detailed member information

#### `channel-tools.ts`
Channel management operations:
- **createChannel**: Create text, voice, announcement, stage, forum, or category channels
- **deleteChannel**: Delete a channel
- **renameChannel**: Rename a channel
- **setSlowmode**: Set slowmode duration for a text channel
- **getChannelInfo**: Get detailed channel information
- **listChannels**: List all channels with optional type filter
- **createInvite**: Create an invite link with custom settings

#### `role-tools.ts`
Role management operations:
- **createRole**: Create a role with name, color, hoist, mentionable settings
- **deleteRole**: Delete a role
- **editRole**: Edit role properties (name, color, hoist, mentionable)
- **setRolePermissions**: Set permissions for a role
- **getRoleInfo**: Get detailed role information
- **listRoles**: List all roles in the guild
- **findRoleByName**: Find a role by name (fuzzy search)

#### `info-tools.ts`
Information gathering operations:
- **getServerInfo**: Get comprehensive server statistics
- **searchMembers**: Search for members by username
- **getBotInfo**: Get bot statistics (uptime, ping, etc.)
- **getMessageHistory**: Fetch recent messages from a channel
- **findChannelByName**: Find a channel by name (fuzzy search)
- **findMemberByName**: Find a member by username/nickname

#### `message-tools.ts`
Message operations:
- **sendDM**: Send a direct message to a user
- **sendMessage**: Send a message to a specific channel
- **bulkDeleteMessages**: Bulk delete messages (up to 100)
- **pinMessage**: Pin a message in a channel
- **unpinMessage**: Unpin a message
- **reactToMessage**: Add a reaction to a message

## Usage

### In Commands

```typescript
import { createAllTools, conversationManager, discordDocs } from '#lib/ai-tools';

// Build context
const toolContext: AIToolContext = {
    message,
    guild,
    channel,
    member,
    client,
    container
};

// Create all tools
const tools = createAllTools(toolContext);

// Get conversation history
const history = conversationManager.getHistory(userId, guildId);

// Fetch relevant documentation
const entities = discordDocs.detectRelevantEntities(userMessage);
const docs = await discordDocs.getEntityDocs(entities);

// Add to conversation
conversationManager.addMessage(userId, guildId, 'user', userMessage);
```

### Adding New Tools

To add a new tool:

1. Create a new file (e.g., `emoji-tools.ts`)
2. Define tools using the `tool()` function from the AI SDK
3. Export a creator function: `export function createEmojiTools(context: AIToolContext) { ... }`
4. Add to `index.ts` exports
5. Include in `createAllTools()` function

Example:
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import type { AIToolContext } from './types.js';

export function createEmojiTools(context: AIToolContext) {
    return {
        getEmojis: tool({
            description: 'Get all custom emojis in the guild',
            parameters: z.object({}),
            execute: async () => {
                const emojis = context.guild.emojis.cache;
                return `Found ${emojis.size} emojis: ${emojis.map(e => e.name).join(', ')}`;
            }
        })
    };
}
```

## Design Principles

### Type Safety
- Use proper Discord.js types instead of `any`
- Type guards with `'property' in object` checks
- Proper `ColorResolvable` for color properties
- Handle optional properties safely

### Error Handling
- Try-catch blocks around all Discord API calls
- Return descriptive error messages
- Handle common failure cases (permissions, not found, etc.)

### User Experience
- Clear, descriptive tool descriptions
- Helpful parameter descriptions with examples
- Informative success/error messages
- Proper formatting for multi-line responses

### Safety
- Limited to bot owner by default
- Proper permission checks where needed
- Clear warnings for destructive operations
- Graceful degradation on failures

## Conversation Management

The conversation manager maintains context across interactions:
- Each conversation is keyed by `userId:guildId`
- Stores up to 20 messages per conversation
- Automatically expires after 30 minutes of inactivity
- Cleanup runs every 10 minutes

Clear conversation history:
```typescript
conversationManager.clearConversation(userId, guildId);
```

## Documentation System

The docs fetcher intelligently retrieves Discord.js documentation:
1. User makes a request
2. System detects relevant Discord.js classes (Guild, GuildMember, etc.)
3. Fetches and caches documentation from GitHub
4. Extracts relevant properties and methods
5. Provides to AI for accurate code generation

Documentation is cached for 1 hour to minimize API calls.

## Future Improvements

Potential enhancements:
- [ ] Add database operation tools
- [ ] Add webhook management tools
- [ ] Add event management (scheduled events)
- [ ] Add stage channel management
- [ ] Add thread management
- [ ] Add sticker/emoji management
- [ ] Add audit log querying
- [ ] Add automod configuration
- [ ] Persistent conversation storage
- [ ] Multi-step operation support
- [ ] Operation rollback/undo functionality
