import { test, expect } from 'bun:test';
import { objectMergeDeep } from './object';

const testCases = [
	{
		target: {},
		sources: [{ b: 1, c: 'bar', d: null, e: undefined }],
		expected: { b: 1, c: 'bar', d: null, e: undefined },
	},
	{
		target: { a: 'foo', b: 'bar', c: { ia: 1, ib: { ja: 1 } } },
		sources: [{ b: 1, c: 'bar', d: null, e: undefined }],
		expected: { a: 'foo', b: 1, c: 'bar', d: null, e: undefined },
	},
	{
		target: { a: 'foo', b: 'bar', c: { ia: 1, ib: { ja: 1, jc: 'still here' } } },
		sources: [{ b: 1, c: { ia: 2, ib: { ja: 2, jb: 'bar' } }, d: null, e: undefined }],
		expected: {
			a: 'foo',
			b: 1,
			c: { ia: 2, ib: { ja: 2, jb: 'bar', jc: 'still here' } },
			d: null,
			e: undefined,
		},
	},
	{
		target: { a: 'foo', b: { something: 123 } },
		sources: [{ b: 1 }],
		expected: {
			a: 'foo',
			b: 1,
		},
	},
] satisfies {
	target: Record<string | symbol, unknown>;
	sources: [Record<string | symbol, unknown>, ...Record<string | symbol, unknown>[]];
	expected: Record<string | symbol, unknown>;
}[];

test.each(testCases)(
	'objectDeepMerge($target, ...$sources) => Expect $expected',
	({ target, sources, expected }) => {
		expect(objectMergeDeep(target, ...sources)).toEqual(expected);
	},
);
