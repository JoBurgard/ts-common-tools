import type { Context } from 'elysia';

export type PermissionsHelpers<
	Permissions extends Record<string, Record<string, readonly string[]>>,
> = {
	subject: keyof Permissions;
	subjectActions: {
		[K in keyof Permissions]: keyof Permissions[K];
	};
	availableRoles: {
		[K in keyof Permissions]: Permissions[K][keyof Permissions[K]];
	}[keyof Permissions][number][];
};

export function createPermissionsSystem<
	const Permissions extends Record<string, Record<string, readonly string[]>>,
>(permissions: Permissions) {
	type Perms = PermissionsHelpers<Permissions>;

	const allowedTo = <const Subject extends Perms['subject']>(
		roles: Perms['availableRoles'],
		subject: Subject,
		action: Perms['subjectActions'][Subject],
	) => {
		const rolesWithPermission = permissions?.[subject]?.[action as string];

		if (!rolesWithPermission) {
			return false;
		}

		return rolesWithPermission.some((it) => roles.includes(it));
	};

	const notAllowedTo: typeof allowedTo = (...props) => {
		return !allowedTo(...props);
	};

	const createSubjectAction = <const Subject extends Perms['subject']>(
		subject: Subject,
		action: Perms['subjectActions'][Subject],
	) => {
		return [subject, action] as const;
	};

	// for elysia routes
	const routeCheckPermission = (
		subject: Parameters<typeof allowedTo>[1],
		action: Parameters<typeof allowedTo>[2],
	) => {
		return (ctx: Context & { user: { roles: string[] } }) => {
			if (ctx.user.roles.includes('superadmin')) {
				return;
			}
			if (notAllowedTo(ctx.user.roles as any, subject, action)) {
				return ctx.status(403);
			}
		};
	};

	// for elysia routes
	const routeCheckRole = (roles: Perms['availableRoles']) => {
		return (ctx: { status: Context['status']; user: { roles: string[] } }) => {
			if (ctx.user.roles.includes('superadmin')) {
				return;
			}
			if (!roles.some((it) => ctx.user.roles.includes(it))) {
				return ctx.status(403);
			}
		};
	};

	return {
		allowedTo,
		notAllowedTo,
		createSubjectAction,
		routeCheckPermission,
		routeCheckRole,
	};
}
