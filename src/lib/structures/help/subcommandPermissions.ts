import type { PermissionLevel } from '#lib/decorators';

const guards = new WeakMap<object, { path: string; level: PermissionLevel }>();

export function registerSubcommandPermission(method: object, path: string, level: PermissionLevel) {
	guards.set(method, { path, level });
}

/** Read method metadata without depending on decorator initializer support in Bun. */
export function getSubcommandPermissions(command: object): Map<string, PermissionLevel> {
	const permissions = new Map<string, PermissionLevel>();
	for (let prototype = Object.getPrototypeOf(command); prototype && prototype !== Object.prototype; prototype = Object.getPrototypeOf(prototype)) {
		for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(prototype))) {
			if (typeof descriptor.value !== 'function') continue;
			const guard = guards.get(descriptor.value);
			if (guard && !permissions.has(guard.path)) permissions.set(guard.path, guard.level);
		}
	}
	return permissions;
}
