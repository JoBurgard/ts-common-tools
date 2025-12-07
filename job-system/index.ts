import { db, dbBatcher, generateId } from '$db';
import { and, eq } from 'drizzle-orm';
import { Result } from '../utils/result';
import { job } from './schema/job';

type JobStatus = 'init' | 'in progress' | 'fail' | 'success';

export function createJobSystem<CreateParams extends Record<string, unknown>>(systemParams: {
	name: string;
	version: number;
}) {
	const create = async (params: { id?: string; creator: string }, jobParams: CreateParams) => {
		return await Result.try(async () => {
			const id = params.id ?? generateId();
			await dbBatcher.add((tx) => {
				tx.insert(job)
					.values({
						id,
						creator: params.creator,
						taker: systemParams.name,
						status: 'init' as JobStatus,
						parameters: jobParams,
						version: systemParams.version,
					})
					.run();
			});
		});
	};

	async function* getJobStatus(id: string) {
		while (true) {
			const result = db
				.select({ status: job.status })
				.from(job)
				.where(eq(job.id, id))
				.limit(1)
				.get();
			yield result;
			await Bun.sleep(1_000);
		}
	}

	const waitForJob = (id: string, timeoutSeconds: number) => {
		return Result.try(async () => {
			const startTime = Date.now();
			for await (const result of getJobStatus(id)) {
				if (!result) {
					throw 'Job not found';
				}

				const status = result.status as JobStatus;
				if (status === 'fail') {
					throw 'Job failed';
				}
				if (status === 'success') {
					return;
				}

				if (Date.now() - startTime > timeoutSeconds * 1000) {
					throw 'Timed out';
				}
			}
		});
	};

	const remove = async (id: string) => {
		return await Result.try(async () => {
			await dbBatcher.add((tx) => {
				tx.delete(job)
					.where(and(eq(job.taker, systemParams.name), eq(job.id, id)))
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
							eq(job.taker, systemParams.name),
							eq(job.status, 'init' as JobStatus),
							eq(job.version, systemParams.version),
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
					.where(eq(job.id, id))
					.run();
			});
		});
	};

	return {
		create,
		waitForJob,
		remove,
		take,
		update,
	};
}
