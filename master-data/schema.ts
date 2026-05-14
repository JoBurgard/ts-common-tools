import { index, int, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { metaColumns } from '../utils/schema';

export const masterData = sqliteTable(
	'master_data',
	{
		id: text().primaryKey(),
		name: text().notNull().unique(),
		...metaColumns,
	},
	(table) => [
		index('master_data_idx_created_by').on(table.createdBy),
		index('master_data_idx_updated_by').on(table.updatedBy),
		index('master_data_idx_deleted_at').on(table.deletedAt),
	],
);

export const masterDataColumn = sqliteTable('master_data_column', {
	id: text().primaryKey(),
	name: text().notNull().unique(),
	type: text({ enum: ['text', 'integer', 'real'] }),
	index: int({ mode: 'boolean' }),
	masterDataId: text().references(() => masterData.id, { onDelete: 'cascade' }),
});
