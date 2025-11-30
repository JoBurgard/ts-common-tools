import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const job = sqliteTable(
	'job',
	{
		id: text().primaryKey(),
		creator: text().notNull(),
		taker: text().notNull(),
		parameters: text({ mode: 'json' }).$type<Record<string, unknown>>().notNull(),
		version: integer().notNull(),
		status: text().notNull(),
		statusContext: text({ mode: 'json' })
			.$type<Record<string, unknown>>()
			.$defaultFn(() => ({}))
			.notNull(),
		createdAt: integer({ mode: 'timestamp' })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer({ mode: 'timestamp' })
			.$defaultFn(() => new Date())
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index('extractor_taker_idx').on(table.taker),
		index('extractor_created_at_idx').on(table.createdAt),
		index('extractor_updated_at_idx').on(table.updatedAt),
	],
);
