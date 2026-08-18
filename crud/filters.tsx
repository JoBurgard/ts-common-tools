import type { SQL } from 'drizzle-orm';

export type FiltersList = Record<
	string,
	{
		position: 'dropdown' | 'top';
		type: 'text';
		label: string;
		fn: (value: string) => SQL | null;
	}
>;

export function filtersProcess(p: { list: FiltersList; query: Record<string, string> }) {
	const filtersDb: SQL[] = [];

	for (const key in p.query) {
		// Filters start with 'filter.' in the search parameters
		if (!key.startsWith('filter.')) {
			continue;
		}
		const filterName = key.slice('filter.'.length);
		if (!p.list[filterName]) {
			continue;
		}
		const value = p.query[key]!; // TODO arrays etc.
		const sqlFilter = p.list[filterName]!.fn(value);
		if (sqlFilter !== null) {
			filtersDb.push(sqlFilter);
		}
	}

	return filtersDb;
}

export function FilterInput(p: { filter: FiltersList[string]; name: string }) {
	const f = p.filter;
	switch (f.type) {
		case 'text': {
			return (
				<input
					type="text"
					class="input input-sm"
					name={p.name}
					placeholder={f.label}
					data-bind={`filter.${p.name}`}
				/>
			);
		}
		case undefined: {
			break;
		}
		default: {
			f.type satisfies never;
		}
	}
}

const rgxSplit = /(?<!_)_(?!_)/g;
export function searchParamsToSignals(
	query: Record<string, string>,
): Record<string, string | string[]> {
	const res: Record<string, string | string[]> = {};
	for (const key in query) {
		if (rgxSplit.test(query[key]!)) {
			res[key] = query[key]!.split(rgxSplit).map((it) => it.replaceAll('__', '_'));
		} else {
			res[key] = query[key]!.replaceAll('__', '_');
		}
	}
	return res;
}
