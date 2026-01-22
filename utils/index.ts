import path from 'node:path';

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

export function escapeHtml(input: string) {
	return input
		.replace('&', '&amp;')
		.replace('<', '&lt;')
		.replace('>', '&gt;')
		.replace('"', '&quot;')
		.replace("'", '&#039');
}

export type ReplacementsList = [string, string][];
export function strReplaceMatches(text: string, replacements: ReplacementsList): string {
	for (const [from, to] of replacements) {
		text = text.replaceAll(from, to);
	}

	return text;
}

export type InsertsList = [number, string][];
export function strInsertTexts(text: string, inserts: InsertsList): string {
	if (inserts.length < 1) {
		return text;
	}

	inserts.sort((a, b) => a[0] - b[0]);

	let output = '';
	let previous = 0;

	for (const [at, insert] of inserts) {
		output += text.slice(previous, at) + insert;
		previous = at;
	}

	output += text.slice(previous);

	return output;
}

// tagged templates
export const ts = String.raw;
export const js = String.raw;
export const css = String.raw;
export const tw = String.raw;

/**
 * Creates a path resolver that makes sure it stays inside the base path. Otherwise it throws an error/
 */
export class SafePathResolver {
	#basePath;

	constructor(basePath: string) {
		this.#basePath = basePath;
	}

	get basePath() {
		return this.#basePath;
	}

	/**
	 * Resolves a path inside the base directory.
	 * @throws When trying to escape from the base dir
	 */
	resolveSafe(...paths: string[]) {
		const resolved = path.resolve(this.#basePath, ...paths);

		if (!resolved.startsWith(this.#basePath)) {
			throw new Error(
				'The path was resolved outside the base directory. That is not allowed. ' +
					JSON.stringify({ basePath: this.#basePath, resolved }),
			);
		}

		return resolved;
	}
}

export class EventListenerCleaner {
	list: [
		listener: { removeEventListener: (...args: any[]) => void },
		name: string,
		handler: (event: any) => void,
	][] = [];

	add(item: (typeof this.list)[number]) {
		this.list.push(item);
	}

	cleanup() {
		for (const item of this.list) {
			item[0].removeEventListener(item[1], item[2]);
		}
	}
}
