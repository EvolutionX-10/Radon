import {
    Events,
    Listener,
    type ContextMenuCommandErrorPayload,
} from '@sapphire/framework';

export class UserListener extends Listener<
    typeof Events.ContextMenuCommandError
> {
    public run(
        error: Error,
        { command, interaction }: ContextMenuCommandErrorPayload
    ) {
        console.log(error, command.name, interaction.user);
    }
}
