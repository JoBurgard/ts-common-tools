// @ts-expect-error will be external
import { action } from 'datastar';

/**
 * Updates the search parameters based on the given signal.
 * It will construct like this: {filter: {foo: 'bar'}} -> filter.foo=bar
 */
action({
	name: 'search',
	apply(_ctx: any, signal: NestedRecord) {
		const params = new URLSearchParams(window.location.search);
		const res: Record<string, string> = {};
		traverse(signal, res, '');
		for (const key in res) {
			const value = res[key]!;
			if (value === '') {
				params.delete(key);
			} else {
				params.set(key, value);
			}
		}
		return params.toString();
	},
});

type NestedRecordValue = string | number | boolean | null | undefined;
type NestedRecord = Record<
	string,
	NestedRecordValue | NestedRecordValue[] | Record<string, NestedRecordValue | NestedRecordValue[]>
>;

function traverse(
	value: NestedRecordValue | NestedRecordValue[] | NestedRecord,
	obj: Record<string, string>,
	key: string,
): void {
	if (
		value !== null &&
		value !== undefined &&
		typeof value === 'object' &&
		!(value instanceof Array)
	) {
		for (const innerKey in value) {
			const constructedKey = key === '' ? innerKey : `${key}.${innerKey}`;
			traverse(value[innerKey], obj, constructedKey);
		}
	} else {
		if (value instanceof Array) {
			// Arrayi are joined with a lowdash --> item1_item2_item3escaped__separator_item4
			obj[key] = value.map((it) => String(it).replaceAll('_', '__')).join('_');
		} else {
			if (value === null || value === undefined) {
				obj[key] = '';
			} else {
				obj[key] = String(value).replaceAll('_', '__');
			}
		}
	}
}
