import { type } from 'arktype';
import { Result } from '../utils/result';
import type { ResultOk, ResultError } from '../utils/result';

export const PER_PAGE = 20;

export const QueryPaginationSchema = type({
	page: type('string.integer')
		.pipe((it) => Math.max(1, parseInt(it)))
		.default('1'),
	perPage: type('string.integer')
		.pipe((it) => Math.max(1, Math.min(parseInt(it), 100)))
		.default(String(PER_PAGE)),
});

export type Pagination = {
	page: number;
	perPage: number;
	offset: number;
	url: string;
	searchParams: URLSearchParams;
};

export type ListResultMeta = {
	itemCount: number;
	itemTotal: number;
	pageTotal: number;
};
export type ListResult<T extends unknown[]> = {
	data: T;
	meta: ListResultMeta;
};

export function paginationProcess(p: {
	query: Record<string, string>;
	path: string;
	defaults?: {
		perPage?: number;
	};
}): ResultOk<Pagination> | ResultError<Record<string, string[]>> {
	const parsed = QueryPaginationSchema(p.query);

	if (parsed instanceof type.errors) {
		return Result.error(parsed.flatProblemsByPath);
	}

	const offset = (parsed.page - 1) * parsed.perPage;

	if (p.defaults?.perPage !== undefined) {
		parsed.perPage = p.defaults.perPage;
	}

	return Result.ok({ ...parsed, offset, searchParams: new URLSearchParams(p.query), url: p.path });
}

export function listResultProcess<T extends unknown[]>(p: {
	data: T;
	itemTotal: number;
	pagination: Pagination;
}): ListResult<T> {
	return {
		data: p.data,
		meta: {
			itemCount: p.data.length,
			itemTotal: p.itemTotal,
			pageTotal: Math.ceil(p.itemTotal / p.pagination.perPage),
		},
	};
}

export function Pages(p: { pagination: Pagination; listResultMeta: ListResultMeta }) {
	// TODO first page can omit the page parameter
	const { pagination: pag, listResultMeta: meta } = p;
	pag.searchParams.set('page', String(Math.max(pag.page - 1, 1)));
	const prevP = pag.searchParams.toString();

	pag.searchParams.set('page', String(pag.page));
	const currP = pag.searchParams.toString();

	pag.searchParams.set('page', String(Math.min(meta.pageTotal, pag.page + 1)));
	const nextP = pag.searchParams.toString();

	return (
		<div class="join tabular-nums">
			<a
				class={['btn join-item', pag.page < 2 && 'btn-disabled'].filter(Boolean).join(' ')}
				href={pag.url + '?' + prevP}
			>
				«
			</a>
			<a class="btn join-item" href={pag.url + '?' + currP}>
				{pag.page}
			</a>
			<a
				class={['btn join-item', pag.page > meta.pageTotal - 1 && 'btn-disabled']
					.filter(Boolean)
					.join(' ')}
				href={pag.url + '?' + nextP}
			>
				»
			</a>
		</div>
	);
}

export function Position(p: { pagination: Pagination; listResultMeta: ListResultMeta }) {
	return (
		<div class="tabular-nums">
			Showing {p.pagination.offset + 1} -{' '}
			{Math.min(p.listResultMeta.itemTotal, p.pagination.offset + p.listResultMeta.itemCount)} of{' '}
			{p.listResultMeta.itemTotal}
		</div>
	);
}
