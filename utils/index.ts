export function throttle<R, A extends any[]>(
	fn: (...args: A) => R,
	timeFrameMs: number,
): (...args: A) => void {
	let lastTime = 0;
	let isThrottled = false;

	return function (...args: A) {
		if (isThrottled) {
			return;
		}

		const timePassed = Date.now() - lastTime;

		isThrottled = true;

		setTimeout(
			() => {
				lastTime = Date.now();
				isThrottled = false;
				fn(...args);
			},
			timePassed >= timeFrameMs ? 0 : timeFrameMs - timePassed,
		);
	};
}

export async function* interval(
	ms: number,
	options: { signal?: AbortSignal } = {},
): AsyncGenerator<void, void, unknown> {
	yield;

	while (!options.signal?.aborted) {
		await Bun.sleep(ms);
		if (!options.signal?.aborted) {
			yield;
		}
	}
}

export function waitForAbort(signal: AbortSignal) {
	return new Promise((resolve) => {
		signal.addEventListener('abort', () => resolve(undefined));
	});
}

// tagged templates
export const ts = String.raw;
export const js = String.raw;
export const css = String.raw;
export const tw = String.raw;
