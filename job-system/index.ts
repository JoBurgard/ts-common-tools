import { dbBatcher, generateId } from '$db';
import { and, eq } from 'drizzle-orm';
import { Result } from '../utils/result';
import { job } from './schema/job';

type JobStatus = 'init' | 'in progress' | 'fail' | 'success';

export function createJobSystem<CreateParams extends Record<string, unknown>>(params: {
	name: string;
	version: number;
}) {
	const create = async (creator: string, jobParams: CreateParams) => {
		return await Result.try(async () => {
			await dbBatcher.add((tx) => {
				tx.insert(job)
					.values({
						id: generateId(),
						creator: creator,
						taker: params.name,
						status: 'init' as JobStatus,
						parameters: jobParams,
						version: params.version,
					})
					.run();
			});
		});
	};

	const remove = async (id: string) => {
		return await Result.try(async () => {
			await dbBatcher.add((tx) => {
				tx.delete(job)
					.where(and(eq(job.taker, params.name), eq(job.id, id)))
					.run();
			});
		});
	};

	const take = async () => {
		return await Result.try(async () => {
			const [item] = await dbBatcher.add((tx) => {
				return tx
					.update(job)
					.set({
						status: 'in progress' as JobStatus,
					})
					.where(
						and(
							eq(job.taker, params.name),
							eq(job.status, 'init' as JobStatus),
							eq(job.version, params.version),
						),
					)
					.orderBy(job.createdAt)
					.limit(1)
					.returning();
			});

			return item as unknown as
				| (Omit<Exclude<typeof item, undefined>, 'parameters'> & {
						parameters: CreateParams;
				  })
				| undefined;
		});
	};

	const update = async (
		id: string,
		params: { status: JobStatus; context?: Record<string, unknown> },
	) => {
		return await Result.try(async () => {
			await dbBatcher.add((tx) => {
				tx.update(job)
					.set({ status: params.status, statusContext: params.context ?? {} })
					.where(eq(job.id, id));
			});
		});
	};

	return {
		create,
		remove,
		take,
		update,
	};
}
