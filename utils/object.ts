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
