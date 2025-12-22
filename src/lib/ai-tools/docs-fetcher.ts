/**
 * Fetches and caches Discord.js documentation from GitHub
 */
export class DiscordDocsManager {
	private docsCache: any = null;
	private lastFetch: number = 0;
	private readonly cacheTime = 60 * 60 * 1000; // 1 hour cache
	private readonly docsUrl = 'https://raw.githubusercontent.com/discordjs/docs/refs/heads/main/discord.js/14.19.3.json';

	/**
	 * Fetch the complete Discord.js documentation
	 */
	public async fetchDocs(): Promise<any> {
		// Return cached version if still valid
		if (this.docsCache && Date.now() - this.lastFetch < this.cacheTime) {
			return this.docsCache;
		}

		try {
			console.log('Fetching Discord.js documentation from GitHub...');
			const response = await fetch(this.docsUrl, {
				headers: {
					'User-Agent': 'Radon Discord Bot',
					Accept: 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch docs: ${response.status}`);
			}

			this.docsCache = await response.json();
			this.lastFetch = Date.now();
			console.log('Discord.js documentation cached successfully');
			return this.docsCache;
		} catch (error) {
			console.error('Error fetching Discord.js documentation:', error);
			// Return cached version even if expired, or null
			return this.docsCache || null;
		}
	}

	/**
	 * Extract documentation for specific entities
	 */
	public async getEntityDocs(entityNames: string[]): Promise<string> {
		const docs = await this.fetchDocs();
		if (!docs) {
			return 'Documentation unavailable - using general Discord.js v14 knowledge.';
		}

		const entityDocs: string[] = [];

		for (const entityName of entityNames) {
			const classDoc = this.extractClassDocs(entityName, docs);
			if (classDoc) {
				entityDocs.push(classDoc);
			}
		}

		return entityDocs.length > 0 ? entityDocs.join('\n\n') : 'No specific documentation found for requested entities.';
	}

	/**
	 * Extract documentation for a specific class
	 */
	private extractClassDocs(className: string, docs: any): string | null {
		try {
			const classes = docs.classes || [];
			const targetClass = classes.find((cls: any) => cls.name === className);

			if (!targetClass) {
				return null;
			}

			let docContent = `## ${className}\n`;

			if (targetClass.description) {
				docContent += `${targetClass.description}\n\n`;
			}

			// Extract key properties
			if (targetClass.props && targetClass.props.length > 0) {
				const props = targetClass.props
					.filter((p: any) => !p.private && !p.deprecated)
					.slice(0, 10)
					.map((p: any) => {
						const type = this.formatType(p.type);
						const readonly = p.readonly ? 'readonly ' : '';
						const desc = p.description ? ` - ${p.description}` : '';
						return `  • ${readonly}${p.name}: ${type}${desc}`;
					});

				if (props.length > 0) {
					docContent += `**Key Properties:**\n${props.join('\n')}\n\n`;
				}
			}

			// Extract key methods
			if (targetClass.methods && targetClass.methods.length > 0) {
				const methods = targetClass.methods
					.filter((m: any) => !m.private && !m.deprecated)
					.slice(0, 10)
					.map((m: any) => {
						const params = m.params
							? m.params.map((p: any) => `${p.name}${p.optional ? '?' : ''}: ${this.formatType(p.type)}`).join(', ')
							: '';
						const returns = this.formatType(m.returns);
						const desc = m.description ? ` - ${m.description}` : '';
						return `  • ${m.name}(${params}): ${returns}${desc}`;
					});

				if (methods.length > 0) {
					docContent += `**Key Methods:**\n${methods.join('\n')}\n`;
				}
			}

			return docContent;
		} catch (error) {
			console.error(`Error extracting docs for ${className}:`, error);
			return null;
		}
	}

	/**
	 * Format type information
	 */
	private formatType(type: any): string {
		if (!type) return 'unknown';
		if (typeof type === 'string') return type;

		if (Array.isArray(type)) {
			if (type.length === 0) return 'unknown';
			if (type.length === 1) return this.formatType(type[0]);
			return type.map((t) => this.formatType(t)).join(' | ');
		}

		if (type.name) return type.name;
		return 'unknown';
	}

	/**
	 * Detect relevant entities from a natural language request
	 */
	public detectRelevantEntities(request: string): string[] {
		const entities = new Set<string>();
		const requestLower = request.toLowerCase();

		// Entity keyword mappings
		const entityMappings: Record<string, string[]> = {
			Message: ['message', 'msg', 'reply', 'send', 'edit message', 'delete message'],
			Guild: ['guild', 'server', 'server info', 'member count', 'server stats'],
			GuildMember: ['member', 'user', 'ban', 'kick', 'timeout', 'mute', 'role', 'nickname'],
			TextChannel: ['channel', 'text channel', 'send message', 'channel info'],
			VoiceChannel: ['voice', 'voice channel', 'vc'],
			CategoryChannel: ['category'],
			Role: ['role', 'permission', 'create role', 'delete role'],
			User: ['user', 'profile', 'dm', 'send dm'],
			Invite: ['invite', 'create invite'],
			Webhook: ['webhook'],
			Embed: ['embed', 'embedded message'],
			PermissionsBitField: ['permission', 'perms']
		};

		// Detect entities from keywords
		for (const [entity, keywords] of Object.entries(entityMappings)) {
			for (const keyword of keywords) {
				if (requestLower.includes(keyword)) {
					entities.add(entity);
					break;
				}
			}
		}

		// Always include base entities
		entities.add('Guild');
		entities.add('GuildMember');

		// Limit to 5 most relevant
		return Array.from(entities).slice(0, 5);
	}
}

// Global instance
export const discordDocs = new DiscordDocsManager();
