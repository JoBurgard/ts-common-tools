// Result type for better error handling

export type ResultOk<T> = {
	ok: true;
	error: undefined;
	value: T;
};
export type ResultError<T = unknown> = {
	ok: false;
	error: T;
	value: undefined;
};
export type ResultTryReturn<_, P, S> = [P] extends [never]
	? ResultOk<S> | ResultError
	: Promise<ResultOk<P> | ResultError>;

export class Result<Ok extends boolean, Err extends Error | unknown | undefined, Value> {
	constructor(
		public ok: Ok,
		public error: Err,
		public value: Value,
	) {
		this.ok = ok;
		this.error = error;
		this.value = value;
	}

	static ok<V>(value?: V) {
		return new Result(true, undefined, value) as unknown as ResultOk<V>;
	}

	static error<Err>(error: Err) {
		return new Result(false, error, undefined) as unknown as ResultError<Err>;
	}

	static try<
		T extends Promise<unknown> | (() => Promise<unknown> | unknown),
		A,
		P = [() => unknown] extends [T]
			? never
			: [T] extends [Promise<infer P> | (() => Promise<infer P>)]
				? P
				: never,
		S = T extends () => infer S ? S : never,
	>(fnOrPromise: T, ...args: A[]): ResultTryReturn<T, P, S> {
		try {
			if (fnOrPromise instanceof Promise) {
				return fnOrPromise.then(Result.ok, Result.error) as ResultTryReturn<T, P, S>;
			}

			// eslint-disable-next-line prefer-spread
			const result = fnOrPromise.apply<undefined, A[], unknown | Promise<unknown>>(undefined, args);

			if (result instanceof Promise) {
				return result.then(Result.ok, Result.error) as ResultTryReturn<T, P, S>;
			}

			return Result.ok(result) as ResultTryReturn<T, P, S>;
		} catch (err) {
			return Result.error(err) as ResultTryReturn<T, P, S>;
		}
	}
}
