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

// tagged templates
export const ts = String.raw;
export const js = String.raw;
export const css = String.raw;
export const tw = String.raw;
