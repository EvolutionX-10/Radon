import {
    Events,
    Listener,
    type ChatInputCommandErrorPayload,
} from '@sapphire/framework';

export class UserListener extends Listener<
    typeof Events.ChatInputCommandError
> {
    public run(
        error: Error,
        { command, interaction }: ChatInputCommandErrorPayload
    ) {
        console.log(error, command.name, interaction.user);
    }
}
