import type { Context } from 'elysia';

export function createPermissionsSystem<
	Permissions extends Record<string, Record<string, string[]>>,
>(permissions: Permissions) {
	type PermissionSubject = keyof Permissions;
	type PermissionSubjectActions = { [K in PermissionSubject]: keyof Permissions[K] };
	type AvailableRoles = {
		[K in PermissionSubject]: Permissions[K][keyof Permissions[K]];
	}[keyof Permissions][number][];

	const allowedTo = <PS extends PermissionSubject>(
		roles: AvailableRoles,
		subject: PS,
		action: PermissionSubjectActions[PS],
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

	// for elysia routes
	const routeCheckPermission = (
		subject: Parameters<typeof allowedTo>[1],
		action: Parameters<typeof allowedTo>[2],
	) => {
		return (ctx: Context & { user: { roles: string } }) => {
			if (notAllowedTo(ctx.user.roles as any, subject, action)) {
				return ctx.status(403);
			}
		};
	};

	// for elysia routes
	const routeCheckRole = (roles: AvailableRoles) => {
		return (ctx: { status: Context['status']; user: { roles: string[] } }) => {
			if (!roles.some((it) => ctx.user.roles.includes(it))) {
				return ctx.status(403);
			}
		};
	};

	return {
		allowedTo,
		notAllowedTo,
		routeCheckPermission,
		routeCheckRole,
	};
}
