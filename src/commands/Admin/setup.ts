import { ApplyOptions } from '@sapphire/decorators';
import { InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { RadonCommand } from '../../lib/structures/commands/RadonCommand.js';
import { PermissionLevels } from '../../lib/types/permissionLevels.js';
import { card, componentMessage, text } from '../../lib/presentation/components.js';
import { draftConfiguration, readConfiguration, requireSetupAdmin, saveSetup, validateSetup } from '../../lib/setup/configuration.js';
import { availableProtection, configurationPages, setupScreen, summary } from '../../lib/setup/presentation.js';
import { openAdminBrowser } from '../../lib/setup/browser.js';

// Prevent two local wizards from editing a guild together. Transactions also reject
// stale reviewed snapshots across processes; opening the read-only view is unrestricted.
const sessions = new Map<string, symbol>();

@ApplyOptions<RadonCommand.Options>({
	description: 'Set up Radon or view the saved server configuration',
	requiredClientPermissions: [],
	permissionLevel: PermissionLevels.Administrator
})
export class UserCommand extends RadonCommand {
	public override registerApplicationCommands(registry: RadonCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName(this.name)
					.setDescription(this.description)
					.setContexts(InteractionContextType.Guild)
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
					.addSubcommand((s) => s.setName('start').setDescription('Set up or change Radon with a private guided review'))
					.addSubcommand((s) => s.setName('view').setDescription('View the current configuration without changing anything')),
			{ idHints: ['951113445930065980', '1019931909528223765'] }
		);
	}

	public override async chatInputRun(interaction: RadonCommand.ChatInputCommandInteraction) {
		const { prisma } = this.container;
		const logError = (error: unknown) => this.container.logger.error('Setup interaction failed', error);
		if (interaction.options.getSubcommand(false) === 'view')
			return openAdminBrowser(
				interaction,
				prisma,
				async () => {
					await interaction.guild.roles.fetch();
					return configurationPages(await readConfiguration(prisma, interaction.guildId), interaction.guild);
				},
				logError
			);
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const actor = await requireSetupAdmin(interaction.guild, prisma, interaction.user.id);
		if (sessions.has(interaction.guildId))
			return interaction.editReply(
				componentMessage(
					text(
						card('Setup already open'),
						'Another administrator has a setup session open. Finish or cancel it first. You can still use `/setup view`.'
					)
				)
			);
		const token = Symbol();
		sessions.set(interaction.guildId, token);
		const release = () => {
			if (sessions.get(interaction.guildId) === token) sessions.delete(interaction.guildId);
		};
		try {
			const initial = await readConfiguration(prisma, interaction.guildId);
			await Promise.all([interaction.guild.roles.fetch(), interaction.guild.channels.fetch()]);
			const draft = draftConfiguration(initial);
			let step = 0;
			let finished = false;
			let canManage = actor.permissions.has('ManageGuild');
			const screen = (notice?: string) => componentMessage(setupScreen(draft, step, interaction.guild, canManage, notice, false, initial));
			const message = await interaction.editReply(screen());
			const collector = message.createMessageComponentCollector({
				time: 10 * 60_000,
				idle: 5 * 60_000,
				filter: (i) => i.customId.startsWith('setup:')
			});
			let pending = Promise.resolve();
			const enqueue = (run: () => Promise<unknown>) =>
				(pending = pending
					.then(run)
					.then(() => undefined)
					.catch(logError));
			collector.on('collect', async (i) => {
				try {
					if (i.user.id !== interaction.user.id)
						return void (await i.reply({ content: 'Run /setup start to open your own setup.', flags: MessageFlags.Ephemeral }));
					await i.deferUpdate();
					await enqueue(async () => {
						if (collector.ended || finished) return;
						let freshActor;
						try {
							freshActor = await requireSetupAdmin(interaction.guild, prisma, i.user.id);
						} catch {
							finished = true;
							collector.stop('access');
							release();
							await i.editReply(
								componentMessage(text(card('Setup closed'), 'Your administrator access could not be confirmed. Nothing was saved.'))
							);
							return;
						}
						canManage = freshActor.permissions.has('ManageGuild');
						const id = i.customId;
						if (id === 'setup:cancel') {
							finished = true;
							collector.stop('cancel');
							release();
							await i.editReply(
								componentMessage(
									text(card('Setup cancelled'), 'Nothing was changed. Use `/setup view` to see the saved configuration.')
								)
							);
							return;
						}
						if (step === 0 && i.isRoleSelectMenu() && (id === 'setup:mods' || id === 'setup:admins')) {
							if (id === 'setup:mods') draft.modRoles = [...i.values];
							else draft.adminRoles = [...i.values];
						} else if (step === 1 && i.isChannelSelectMenu() && id === 'setup:logs') {
							draft.logChannelId = i.values[0] ?? '';
							draft.log = draft.logChannelId ? 'existing' : 'none';
						} else if (step === 1 && i.isChannelSelectMenu() && id === 'setup:reports') {
							draft.reportChannelId = i.values[0] ?? '';
							draft.reports = draft.reportChannelId ? 'existing' : 'none';
						} else if (step === 1 && id === 'setup:new-log') {
							draft.log = 'create';
						} else if (step === 1 && id === 'setup:skip-log') {
							draft.log = 'none';
							if (draft.reports === 'log') draft.reports = 'none';
						} else if (step === 1 && id === 'setup:reports-log' && draft.log !== 'none') draft.reports = 'log';
						else if (step === 1 && id === 'setup:skip-reports') draft.reports = 'none';
						else if (step === 2 && id === 'setup:keep-protection') draft.protection = [];
						else if (step === 2 && i.isStringSelectMenu() && id === 'setup:protection') {
							const choices = availableProtection(interaction.guild, canManage);
							if (i.values.some((value) => !choices.includes(value as (typeof choices)[number]))) return;
							draft.protection = i.values as typeof choices;
						} else if (i.isButton() && id === 'setup:back') step = Math.max(0, step - 1);
						else if (i.isButton() && id === 'setup:next' && step < 3) {
							if (step === 0 && draft.modRoles.some((role) => draft.adminRoles.includes(role))) {
								await i.editReply(screen('Choose separate moderator and administrator roles.'));
								return;
							}
							if (step >= 1) {
								try {
									await validateSetup(interaction.guild, freshActor, draft);
								} catch (error) {
									await i.editReply(screen((error as Error).message));
									return;
								}
							}
							step++;
						} else if (i.isButton() && id === 'setup:save' && step === 3) {
							// Validation failures stay editable. After dispatch, close even on an unknown
							// outcome so a double click cannot create a second channel or replay a write.
							try {
								await validateSetup(interaction.guild, freshActor, draft);
							} catch (error) {
								await i.editReply(screen((error as Error).message));
								return;
							}
							finished = true;
							try {
								await i.editReply(componentMessage(text(card('Saving configuration'), 'Applying the changes you reviewed…')));
								const result = await saveSetup(prisma, interaction.guild, i.user.id, initial, draft);
								const panel = text(
									card('Configuration saved'),
									summary({ ...draft, log: result.logId ? 'existing' : 'none', logChannelId: result.logId })
								);
								if (result.notes.length) text(panel, result.notes.join('\n'));
								text(panel, 'View settings with `/setup view`. Check permissions and readiness with `/doctor`.');
								await i.editReply(componentMessage(panel));
							} catch (error) {
								logError(error);
								await i.editReply(componentMessage(text(card('Setup needs attention'), (error as Error).message)));
							} finally {
								collector.stop('saved');
								release();
							}
							return;
						} else return;
						await i.editReply(screen());
					});
				} catch (error) {
					logError(error);
				}
			});
			collector.on('end', () => {
				void enqueue(async () => {
					try {
						if (!finished) {
							finished = true;
							await interaction.editReply(
								componentMessage(
									text(
										card('Setup expired'),
										'Nothing was changed. Run `/setup start` to continue, or `/setup view` to inspect saved settings.'
									)
								)
							);
						}
					} finally {
						release();
					}
				});
			});
			return message;
		} catch (error) {
			release();
			throw error;
		}
	}
}
