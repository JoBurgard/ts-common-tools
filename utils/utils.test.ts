import { describe, expect, test } from 'bun:test';
import { SafePathResolver } from '.';

describe('SafePathResolver', () => {
	const path = new SafePathResolver('foo/bar');
	const absolutePath = new SafePathResolver('/foo/bar');
	test('Normal use', () => {
		expect(path.basePath).toBe('foo/bar');
		expect(absolutePath.basePath).toBe('/foo/bar');
		expect(path.resolveSafe('texts/myText.txt')).toBe('foo/bar/texts/myText.txt');
		expect(path.resolveSafe('../bar/texts/myText.txt')).toBe('foo/bar/texts/myText.txt');
	});
	test('Not allowed paths', () => {
		expect(() => path.resolveSafe('..')).toThrow();
		expect(() => path.resolveSafe('../somewhere/else')).toThrow();
		expect(() => path.resolveSafe('..//somewhere/else')).toThrow();
		expect(() => path.resolveSafe('../bar/../somewhere/else')).toThrow();
	});
});
