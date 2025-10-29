export function throttle<R, A extends any[]>(
	fn: (...args: A) => R,
	timeFrameMs: number,
): (...args: A) => R | undefined {
	let lastTime = 0;

	return function (...args: A) {
		const now = Date.now();
		if (now - lastTime >= timeFrameMs) {
			lastTime = now;
			return fn(...args);
		}
	};
}
