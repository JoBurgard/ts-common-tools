import { dbBatcher, generateId } from '$db';
import { and, eq } from 'drizzle-orm';
import { Result } from '../utils/result';
import { job } from './schema/job';

export function createJobSystem<CreateParams extends Record<string, unknown>>(params: {
	name: string;
	version: number;
}) {
	const create = (creator: string, jobParams: CreateParams) => {
		return Result.try(() => {
			dbBatcher.add((tx) => {
				tx.insert(job)
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
		});
	};

	const remove = (id: string) => {
		return Result.try(() => {
			dbBatcher.add((tx) => {
				tx.delete(job)
					.where(and(eq(job.taker, params.name), eq(job.id, id)))
					.run();
			});
		});
	};

	const takeJob = async () => {
		return await Result.try(async () => {
			const [item] = await dbBatcher.add((tx) => {
				return tx
					.update(job)
					.set({
						status: 'taken',
					})
					.where(
						and(
							eq(job.taker, params.name),
							eq(job.status, 'created'),
							eq(job.version, params.version),
						),
					)
					.orderBy(job.createdAt)
					.limit(1)
					.returning();
			});

			return item;
		});
	};

	return {
		create,
		remove,
		takeJob,
	};
}
