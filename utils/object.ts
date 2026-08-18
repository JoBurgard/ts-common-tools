export function isRecord(it: unknown): it is Record<string | symbol, unknown> {
	return typeof it === 'object' && !(it instanceof Array);
}

export function objectMergeDeep(
	target: Record<string | symbol, unknown>,
	...sources: (Record<string | symbol, unknown> | unknown)[]
): Record<string | symbol, unknown> {
	if (!sources.length) {
		return target;
	}
	const source = sources.shift();

	if (isRecord(source) && isRecord(target)) {
		for (const key in source) {
			if (isRecord(source[key]) && isRecord(target[key])) {
				objectMergeDeep(target[key], source[key]);
			} else {
				target[key] = source[key];
			}
		}
	}

	return objectMergeDeep(target, ...sources);
}

/**
 * `{ 'a.b.c': 'bar' }` --> `{ a: { b: { c: 'bar } } }`
 */
export function objectInflate(input: Record<string, unknown>): Record<string, unknown> {
	const output: Record<string, unknown> = {};
	for (const key in input) {
		const parts = key.split('.');
		if (parts.length === 1) {
			output[key] = input[key];
		} else {
			let curr: Record<string, unknown> = output;
			for (const part of parts.slice(0, -1)) {
				curr[part] ??= {};
				curr = curr[part] as Record<string, unknown>;
			}
			curr[parts.at(-1)!] = input[key];
		}
	}
	return output;
}
