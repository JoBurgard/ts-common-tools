import { db, dbBatcher } from '$db';
import { user } from '$ds';
import { createSubjectAction } from '$lib/permissions';
import { type } from 'arktype';
import { eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import { crudCreate } from '../crud';
import { dateFormatEuropeanDateTime } from '../utils/date';
import { View } from './create';
import { masterData } from './schema';

const list = db
	.select({
		...getTableColumns(masterData),
		nameCreated: sql<string>`(${db.select({ name: user.name }).from(user).where(eq(user.id, masterData.createdBy))})`,
		nameUpdated: sql<string>`(${db.select({ name: user.name }).from(user).where(eq(user.id, masterData.updatedBy))})`,
	})
	.from(masterData)
	.where(isNull(masterData.deletedAt))
	.prepare();

const schema = type({
	name: 'string',
});

export function pluginExtractor(pluginProps: {
	permission: ReturnType<typeof createSubjectAction>;
}) {
	crudCreate({
		prefix: 'master-data-schema',
		title: 'Master Data Schema',
		//==========================================================================================================//
		listProcess: () => {
			return list.all();
		},
		listColumns: [
			{
				title: 'Name',
				getValue: (row) => row.name,
			},
			{
				title: 'Created',
				css: 'tabular-nums',
				getValue: (row) =>
					`${dateFormatEuropeanDateTime(row.createdAt)} - ${row.nameCreated ?? 'Deleted User'}`,
			},
			{
				title: 'Updated',
				css: 'tabular-nums',
				getValue: (row) =>
					`${dateFormatEuropeanDateTime(row.updatedAt)} - ${row.nameUpdated ?? 'Deleted User'}`,
			},
		],
		//==========================================================================================================//
		createSchema: schema,
		createView: View,
		createPermission: pluginProps.permission,
		createProcess: async (props) => {
			return await dbBatcher.add((tx) => {
				// TODO
			});
		},
		//==========================================================================================================//
		readProcess: (props) => {
			// TODO soft delete stuff
			const main = db.select().from(masterData).where(eq(masterData.id, props.id)).get();

			if (!main) {
				return undefined;
			}

			return main;
		},
		//==========================================================================================================//
		updateSchema: schema,
		updateView: View,
		updateProcess: async (props) => {
			// TODO soft delete stuff
			await dbBatcher.add((tx) => {
				// TODO
			});
		},
		//==========================================================================================================//
		deleteProcess: async (props) => {
			// TODO soft delete stuff
			await dbBatcher.add((tx) => {
				tx.update(masterData)
					.set({ deletedBy: props.user.id, deletedAt: new Date() })
					.where(eq(masterData.id, props.id))
					.run();
			});
		},
	});
}
