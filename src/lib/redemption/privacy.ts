/** Error objects and interaction payloads can contain form fields, HTTP bodies or
 * Prisma arguments. Log only bounded structural metadata, never their contents. */
export function interactionFailureMetadata(error: Error, payload: { interaction?: { id?: unknown; type?: unknown }; handler?: { name?: unknown } }) {
	const allowedNames = [
		'Error',
		'TypeError',
		'RangeError',
		'AbortError',
		'TimeoutError',
		'DiscordAPIError',
		'PrismaClientKnownRequestError',
		'PrismaClientUnknownRequestError'
	];
	const id = payload.interaction?.id;
	const type = payload.interaction?.type;
	const handler = payload.handler?.name;
	return {
		errorType: allowedNames.includes(error.name) ? error.name : 'Error',
		...(typeof id === 'string' && /^\d{1,25}$/.test(id) ? { interactionId: id } : {}),
		...(typeof type === 'number' && Number.isInteger(type) ? { interactionType: type } : {}),
		...(typeof handler === 'string' && /^[A-Za-z][\w-]{0,63}$/.test(handler) ? { handler } : {})
	};
}
