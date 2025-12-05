export function createBatchSystem<Context>() {
	let batchList: Array<
		[
			fn: (context: Context) => void,
			resolve: (val: unknown) => void,
			reject: (reason?: any) => void,
		]
	> = [];

	const add = <Return>(fn: (context: Context) => Return) => {
		const prom = new Promise<Return>((resolve, reject) => {
			batchList.push([fn, resolve as any, reject]);
		});

		return prom;
	};

	const run = (context: Context) => {
		if (batchList.length < 1) {
			return;
		}

		const list = batchList;
		batchList = [];

		for (const [fn, resolve, reject] of list) {
			try {
				const result = fn(context);
				resolve(result);
			} catch (error) {
				reject(error);
			}
		}
	};

	const isEmpty = () => {
		return batchList.length === 0;
	};

	return {
		add,
		run,
		isEmpty,
	};
}
