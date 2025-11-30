import { db, generateId } from '$db';
import { and, eq } from 'drizzle-orm';
import { job } from './schema/job';
import { Result } from '../utils/result';

export function createJobSystem<CreateParams extends Record<string, unknown>>(params: {
	name: string;
	version: number;
}) {
	const create = (creator: string, jobParams: CreateParams) => {
		return Result.try(() => {
			// TODO: db write batching
			db.insert(job)
				.values({
					id: generateId(),
					creator: creator,
					taker: params.name,
					status: 'created',
					parameters: jobParams,
					version: params.version,
				})
				.run();
		});
	};

	const remove = (id: string) => {
		return Result.try(() => {
			// TODO: db write batching
			db.delete(job)
				.where(and(eq(job.taker, params.name), eq(job.id, id)))
				.run();
		});
	};
	return {
		create,
		remove,
	};
}
