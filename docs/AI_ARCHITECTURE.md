# AI Command Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Discord User                             │
│                      "!ai ban user 123"                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RadonCommand (ai.ts)                          │
│  • Parses user input                                             │
│  • Manages conversation state                                    │
│  • Builds context and prompt                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
    ┌───────────────┐  ┌──────────┐  ┌─────────────┐
    │ Conversation  │  │ Discord  │  │ AI Tool     │
    │ Manager       │  │ Docs     │  │ Context     │
    │               │  │ Fetcher  │  │             │
    │ • History     │  │          │  │ • Guild     │
    │ • State       │  │ • v14.19 │  │ • Channel   │
    │ • Cleanup     │  │ • Cache  │  │ • Member    │
    └───────────────┘  └──────────┘  └─────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google Gemini 2.0 Flash (AI Model)                  │
│  • Understands intent                                            │
│  • Selects appropriate tools                                     │
│  • Generates natural responses                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
    ┌────────┐          ┌────────┐          ┌────────┐
    │ Member │          │Channel │          │  Role  │
    │ Tools  │          │ Tools  │          │ Tools  │
    ├────────┤          ├────────┤          ├────────┤
    │• ban   │          │• create│          │• create│
    │• kick  │          │• delete│          │• delete│
    │• timeout│         │• rename│          │• edit  │
    │• roles │          │• info  │          │• perms │
    └────────┘          └────────┘          └────────┘
        │                    │                    │
        ▼                    ▼                    ▼
    ┌────────┐          ┌────────┐
    │  Info  │          │Message │
    │ Tools  │          │ Tools  │
    ├────────┤          ├────────┤
    │• server│          │• send  │
    │• search│          │• DM    │
    │• bot   │          │• delete│
    │• find  │          │• pin   │
    └────────┘          └────────┘
        │
        └───────────────┬───────────────┘
                        ▼
            ┌───────────────────────┐
            │   Discord.js v14 API  │
            │   • Guild operations  │
            │   • Member operations │
            │   • Channel operations│
            └───────────────────────┘
```

## Component Flow

### 1. User Input Processing

```
User Message
    │
    ├─> Parse flags (--clear, --reset)
    ├─> Handle message references
    └─> Extract natural language request
```

### 2. Context Building

```
Build AI Context
    │
    ├─> Current Guild Info
    │   ├─> Name, member count
    │   ├─> Channel details
    │   └─> User information
    │
    ├─> Conversation History
    │   └─> Last 20 messages (if available)
    │
    ├─> Discord.js Documentation
    │   ├─> Detect relevant entities
    │   ├─> Fetch from cache or GitHub
    │   └─> Extract class details
    │
    └─> Tool Context
        ├─> Guild object
        ├─> Channel object
        ├─> Member object
        └─> Client reference
```

### 3. AI Processing

```
AI Model (Gemini 2.0)
    │
    ├─> Understand intent
    ├─> Select appropriate tool(s)
    │   └─> Can use multiple tools in sequence
    │
    ├─> Execute tool(s)
    │   ├─> Tool validates input
    │   ├─> Tool performs Discord operation
    │   └─> Tool returns result
    │
    └─> Generate natural response
        └─> Combine tool results with explanation
```

### 4. Response Handling

```
Response Processing
    │
    ├─> Add to conversation history
    ├─> Split long messages (>2000 chars)
    ├─> Send to Discord channel
    └─> Handle errors gracefully
```

## Tool Architecture

### Tool Structure

```typescript
tool({
    description: 'What this tool does',
    parameters: z.object({
        param1: z.string().describe('What this param is'),
        param2: z.number().optional()
    }),
    execute: async ({ param1, param2 }) => {
        // 1. Validate inputs
        // 2. Perform Discord operation
        // 3. Return user-friendly message
    }
})
```

### Tool Categories

```
Tools (34 total)
    │
    ├─> Member Tools (8)
    │   ├─> Moderation: ban, kick, timeout
    │   ├─> Role Management: add/remove roles
    │   ├─> Profile: nickname, info
    │   └─> Search: find by name
    │
    ├─> Channel Tools (7)
    │   ├─> Management: create, delete, rename
    │   ├─> Configuration: slowmode, invites
    │   └─> Information: info, list, find
    │
    ├─> Role Tools (7)
    │   ├─> Management: create, delete, edit
    │   ├─> Permissions: set permissions
    │   └─> Information: info, list, find
    │
    ├─> Info Tools (6)
    │   ├─> Server: stats, overview
    │   ├─> Search: members, channels
    │   └─> Bot: info, uptime, ping
    │
    └─> Message Tools (6)
        ├─> Sending: DM, channel messages
        ├─> Management: bulk delete, pin/unpin
        └─> Interaction: reactions
```

## State Management

### Conversation State

```
ConversationManager
    │
    ├─> Storage
    │   └─> Map<"userId:guildId", ConversationState>
    │
    ├─> ConversationState
    │   ├─> userId: string
    │   ├─> guildId: string
    │   ├─> messages: ConversationMessage[]
    │   └─> lastInteraction: timestamp
    │
    ├─> Operations
    │   ├─> getConversation(userId, guildId)
    │   ├─> addMessage(userId, guildId, role, content)
    │   ├─> clearConversation(userId, guildId)
    │   └─> cleanup() - Auto-runs every 10 minutes
    │
    └─> Limits
        ├─> Max messages: 20
        └─> Max idle time: 30 minutes
```

## Documentation System

### Discord.js Docs Flow

```
User Request
    │
    ├─> Detect Entities
    │   └─> "ban user" → [GuildMember, Guild]
    │
    ├─> Check Cache
    │   ├─> Hit: Return cached docs
    │   └─> Miss: Fetch from GitHub
    │
    ├─> Fetch Documentation
    │   └─> GET github.com/.../discord.js/14.19.3.json
    │
    ├─> Extract Relevant Classes
    │   ├─> Find class by name
    │   ├─> Extract properties (top 10)
    │   ├─> Extract methods (top 10)
    │   └─> Format for AI context
    │
    └─> Provide to AI
        └─> Included in system prompt
```

### Cache Strategy

```
DiscordDocsManager
    │
    ├─> Cache Entry
    │   ├─> docsData: complete JSON
    │   └─> lastFetch: timestamp
    │
    ├─> Cache Rules
    │   ├─> Duration: 1 hour
    │   ├─> Size: ~5MB (complete docs)
    │   └─> Invalidation: time-based
    │
    └─> Fallback Strategy
        ├─> If fetch fails: use cached (even if expired)
        └─> If no cache: use general knowledge
```

## Error Handling

### Error Flow

```
Error Occurs
    │
    ├─> Catch in Tool
    │   ├─> Log error details
    │   └─> Return user-friendly message
    │
    ├─> AI Processes Error
    │   └─> Incorporates into natural response
    │
    └─> User Receives
        └─> "❌ Failed to ban user: User not found"
```

### Common Error Scenarios

```
Error Types
    │
    ├─> Not Found
    │   └─> "❌ User/Channel/Role not found"
    │
    ├─> Permission Denied
    │   └─> "❌ Bot lacks necessary permissions"
    │
    ├─> Invalid Input
    │   └─> "❌ Invalid ID/format provided"
    │
    ├─> Discord API Error
    │   └─> "❌ Discord API error: [message]"
    │
    └─> Timeout
        └─> "❌ Operation timed out"
```

## Security Model

### Permission Layers

```
Security Layers
    │
    ├─> Command Level
    │   └─> PermissionLevel.BotOwner (only owner can use)
    │
    ├─> Tool Level
    │   ├─> No eval/arbitrary code execution
    │   └─> Predefined safe operations
    │
    ├─> Discord Level
    │   ├─> Bot must have necessary permissions
    │   └─> Respects Discord's permission system
    │
    └─> Type Safety
        ├─> Strong TypeScript typing
        └─> No 'as any' casts
```

## Performance Considerations

### Optimization Strategies

```
Performance
    │
    ├─> Documentation Caching
    │   ├─> 1 hour cache duration
    │   └─> Reduces API calls by ~99%
    │
    ├─> Conversation Cleanup
    │   ├─> Auto-cleanup every 10 minutes
    │   └─> Prevents memory leaks
    │
    ├─> Tool Selection
    │   └─> AI uses only relevant tools
    │
    └─> Response Handling
        └─> Split long messages efficiently
```

### Typical Response Times

```
Operation Type        Time
─────────────────────────────
Simple query          1-3s
Single tool exec      2-5s
Multi-tool exec       5-10s
Doc fetch (cache)     <100ms
Doc fetch (miss)      500-1000ms
```

## Extension Points

### Adding New Features

```
Extension Points
    │
    ├─> New Tool Category
    │   └─> Create new *-tools.ts file
    │
    ├─> New Tool
    │   └─> Add to existing category
    │
    ├─> Custom Documentation
    │   └─> Extend DiscordDocsManager
    │
    └─> Custom State
        └─> Extend ConversationManager
```

### Integration Points

```
Integration Options
    │
    ├─> Database Access
    │   └─> Via container.prisma
    │
    ├─> Other Commands
    │   └─> Via container
    │
    ├─> External APIs
    │   └─> Add to tool context
    │
    └─> Custom Modules
        └─> Import in tool files
```

## Monitoring & Debugging

### Logging Points

```
Logging
    │
    ├─> Command Entry
    │   └─> User, guild, message
    │
    ├─> Tool Execution
    │   └─> Tool name, params, result
    │
    ├─> AI Responses
    │   └─> Generated text
    │
    ├─> Errors
    │   └─> Full stack trace
    │
    └─> Performance
        └─> Response times
```

## Summary

This architecture provides:
- ✅ Modularity (easy to extend)
- ✅ Type Safety (compile-time checks)
- ✅ Security (no arbitrary code execution)
- ✅ Performance (caching, optimization)
- ✅ Maintainability (clear separation)
- ✅ User Experience (natural conversation)
- ✅ Accuracy (proper documentation)
- ✅ Reliability (error handling)
