import { user } from '$ds';
import { integer, text } from 'drizzle-orm/sqlite-core';

export const metaColumns = {
	createdBy: text().references(() => user.id, { onDelete: 'set null' }),
	updatedBy: text().references(() => user.id, { onDelete: 'set null' }),
	deletedBy: text().references(() => user.id, { onDelete: 'set null' }),
	createdAt: integer({ mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer({ mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.$onUpdate(() => new Date())
		.notNull(),
	deletedAt: integer({ mode: 'timestamp' }),
};
