# AI Command - User Guide

The AI command (`!ai`) provides an intelligent Discord assistant that can perform operations, answer questions, and maintain conversations about your server.

## Overview

Radon AI is not just a bot command - it's an intelligent, knowledgeable member of your Discord server who:
- Understands Discord terminology and best practices
- Can execute moderation and management tasks
- Maintains conversation context across messages
- Asks clarifying questions when needed
- Explains what it's doing in a friendly way

## Access

**Important**: This command is currently limited to the bot owner only (`PermissionLevel.BotOwner`). This is intentional as it provides natural language control over powerful Discord operations.

## Basic Usage

### Simple Conversations
```
!ai What's this server about?
!ai How many members do we have?
!ai Tell me about the bot's uptime
```

### Performing Actions
```
!ai Ban user 123456789 for spamming
!ai Create a new text channel called "announcements"
!ai Set slowmode to 10 seconds in this channel
!ai Give the @Moderator role to @JohnDoe
```

### Information Gathering
```
!ai Find channels with "general" in the name
!ai Search for members named "john"
!ai Show me the roles in this server
!ai Get info about @MemberName
```

## Features

### 1. Conversation Memory
The AI remembers your recent conversation (last 20 messages, 30-minute timeout):

```
User: Tell me about this server
AI: [provides server info]

User: How many voice channels?
AI: [understands context, knows you're still asking about the server]
```

Clear conversation history:
```
!ai --clear
!ai --reset
```

### 2. Contextual Understanding
The AI understands references and context:

```
!ai Create a role called "VIP"
!ai Make it blue and hoisted
!ai Give it to @Member
```

### 3. Clarification Questions
If the AI needs more information, it will ask:

```
User: Change the nickname
AI: Just to clarify - do you want me to change YOUR nickname or MY nickname?
```

### 4. Natural Language
Talk naturally - no need for specific syntax:

```
✅ "Ban that spammer"
✅ "Make me admin"
✅ "How's the server doing?"
✅ "Create a voice channel for gaming"
```

## Available Operations

### Member Management
- Ban/kick/timeout members
- Add/remove roles
- Change nicknames (including bot's own)
- Get member information
- Search for members by name

### Channel Management
- Create channels (text, voice, category, etc.)
- Delete/rename channels
- Set slowmode
- Create invites
- Get channel information
- List all channels

### Role Management
- Create/delete/edit roles
- Set role permissions
- Change role appearance (color, hoist, mentionable)
- Get role information
- Find roles by name

### Information Gathering
- Server statistics
- Member search
- Bot information (uptime, ping)
- Message history
- Find resources by name

### Message Operations
- Send messages to channels
- Send DMs to users
- Bulk delete messages
- Pin/unpin messages
- React to messages

## Tips for Best Results

### 1. Be Specific
❌ "Do something"
✅ "Ban user 123456789 for breaking rules"

### 2. Provide IDs When Possible
Discord IDs are unique and prevent confusion. Enable Developer Mode in Discord settings to copy IDs.

### 3. Use Natural Language
The AI understands context and conversation - talk naturally!

### 4. Ask for Help
If you're unsure: `!ai How do I set up a verification system?`

### 5. Provide Context
The AI can see current server, channel, and conversation history.

## Safety Features

- Owner-only access (currently)
- Clear explanations before destructive actions
- Error messages explain what went wrong
- Respects Discord's rate limits
- Proper permission checking

## Technical Details

- Built on Google's Gemini 2.0 Flash model
- Uses specialized tools for different Discord operations
- Fetches Discord.js v14.19.3 documentation for accuracy
- Maintains conversation state per user/guild
- Type-safe implementation with proper error handling

See `/src/lib/ai-tools/README.md` for architecture details.
