import {
    Events,
    Listener,
    type InteractionHandlerError,
} from '@sapphire/framework';

export class UserListener extends Listener<
    typeof Events.InteractionHandlerError
> {
    public run(error: Error, payload: InteractionHandlerError) {
        console.log(error, payload);
    }
}
