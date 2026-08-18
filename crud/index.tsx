import { dstar } from '$d*';
import { sendToast } from '$ext/ts-common-tools/datastar/toaster';
import { throttle, ts } from '$ext/ts-common-tools/utils';
import { routeCheckPermission, type createSubjectAction } from '$lib/permissions';
import App from '$src/layouts/App';
import { pluginAuth } from '$src/modules/auth';
import { type PropsWithChildren } from '@kitajs/html';
import { Type, type } from 'arktype';
import Elysia from 'elysia';
import EventEmitter, { on } from 'node:events';
import type { MaybePromise } from '../types';
import { FilterInput, filtersProcess, searchParamsToSignals, type FiltersList } from './filters';
import FormLayout, { type Layout } from './form-layout';
import {
	Pages,
	paginationProcess,
	Position,
	type ListResultMeta,
	type Pagination,
} from './pagination';
import Table, { type Columns } from './table';
import type { SQL } from 'drizzle-orm';
import { objectInflate } from '../utils/object';

const ERROR_MESSAGE_GENERIC = 'Something went wrong. Please contact the support.';

export type CrudUser = {
	id: string;
};

export type ComponentView = (props: {
	data?: Record<string, unknown>;
	issues?: Record<string, string[]>;
	id?: string;
}) => string;

type CrudPropsBase<
	DataCreate extends Record<string, unknown>,
	DataUpdate extends Record<string, unknown>,
	ListItem extends Record<string, unknown>,
> = {
	prefix: string;
	title: string;
	// ===========================================================================================================
	listProcess: (p: { pagination: Pagination; dbSearchFilters: SQL[] }) => {
		data: ListItem[];
		meta: ListResultMeta;
	};
	listColumns: Columns<ListItem>;
	listPermission?: ReturnType<typeof createSubjectAction>;
	listFilters?: FiltersList;
	// ===========================================================================================================
	createSchema: Type<DataCreate>;
	createProcess: (props: {
		data: DataCreate;
		user: CrudUser;
		request: Request;
	}) => MaybePromise<void | { id: string }>;
	createPermission?: ReturnType<typeof createSubjectAction>;
	// ===========================================================================================================
	readProcess: (props: {
		id: string;
		user: CrudUser;
		request: Request;
	}) => MaybePromise<Record<string, unknown> | undefined>;
	readPermission?: ReturnType<typeof createSubjectAction>;
	// ===========================================================================================================
	updateSchema: Type<DataUpdate>;
	updateProcess: (props: {
		data: DataUpdate;
		user: CrudUser;
		id: string;
		request: Request;
	}) => MaybePromise<void>;
	updatePermission?: ReturnType<typeof createSubjectAction>;
	// ===========================================================================================================
	deleteProcess: (props: { user: CrudUser; id: string; request: Request }) => MaybePromise<void>;
	deletePermission?: ReturnType<typeof createSubjectAction>;
};

type CrudProps<
	DataCreate extends Record<string, unknown>,
	DataUpdate extends Record<string, unknown>,
	ListItem extends Record<string, unknown>,
> = CrudPropsBase<DataCreate, DataUpdate, ListItem> &
	(
		| {
				createFormLayout: Layout;
				updateFormLayout: Layout;
				createView?: undefined;
				updateView?: undefined;
		  }
		| {
				createFormLayout?: undefined;
				updateFormLayout?: undefined;
				createView?: ComponentView;
				updateView: ComponentView;
		  }
	);

export function crudCreate<
	DataCreate extends Record<string, unknown>,
	DataUpdate extends Record<string, unknown>,
	ListItem extends Record<string, unknown>,
>(props: CrudProps<DataCreate, DataUpdate, ListItem>) {
	type Props = typeof props;

	const events = new EventEmitter();
	const triggerUpdate = throttle(() => events.emit('update'), 100);

	const listColumns: Props['listColumns'] = [
		...props.listColumns,
		{
			title: '',
			css: 'w-[1px]',
			getValue: () => '',
			component: (componentProps) => {
				return (
					<div class="flex gap-2">
						<a class="btn btn-xs btn-secondary" href={`/${props.prefix}/${componentProps.row?.id}`}>
							<span class="i-[mdi--pencil]"></span>
							Edit
						</a>
						<button
							class="btn btn-xs btn-secondary"
							type="button"
							data-on:click={`confirm('Do you really want to delete?') && @delete('/${props.prefix}/${componentProps.row?.id}')`}
						>
							<span class="i-[mdi--delete]"></span>
							Delete
						</button>
					</div>
				);
			},
		},
	];

	function renderList(props: Props, p: { pagination: Pagination; query: Record<string, string> }) {
		const listFilters = props.listFilters ?? {};
		const dbSearchFilters = filtersProcess({ list: listFilters, query: p.query });
		const res = props.listProcess({ pagination: p.pagination, dbSearchFilters });
		const searchParamsText = p.pagination.searchParams.toString();

		const filtersSignals = objectInflate(searchParamsToSignals(p.query))?.filter ?? {};

		const filtersTop: [name: string, FiltersList[string]][] = [];
		if (props.listFilters) {
			for (const filterName in props.listFilters) {
				const filterSettings = props.listFilters[filterName];

				if (filterSettings?.position === 'top') {
					filtersTop.push([filterName, filterSettings]);
				}
			}
		}

		// If no createView is passed, then we assume, that an item will be created with default
		// values.
		return (
			<div>
				<div class="mb-4">
					{!props.createFormLayout && !props.createView ? (
						<button
							type="button"
							class="btn btn-sm btn-primary"
							data-on:click={`@post('/${props.prefix}/create')`}
						>
							<span class="i-[mdi--plus]"></span>
							Create
						</button>
					) : (
						<a href={`/${props.prefix}/create`} class="btn btn-sm btn-primary">
							<span class="i-[mdi--plus]"></span>
							Create
						</a>
					)}
				</div>
				<form
					class="mb-4"
					data-signals={`{filter: ${JSON.stringify(filtersSignals)}}`}
					data-on:submit="window.location.href = window.location.protocol + '//' + window.location.host + window.location.pathname + '?' + @search({filter: $filter, page: 1})"
				>
					<div class="flex gap-4">
						{filtersTop.map((it) => FilterInput({ filter: it[1], name: it[0] }) as 'safe')}
						<a
							class="btn btn-sm btn-secondary"
							data-attr:href="window.location.pathname + '?' + @search({filter: $filter, page: 1})"
						>
							<span class="i-[mdi--search]"></span>
							Search
						</a>
					</div>
				</form>
				<Table data={res.data} columns={listColumns}></Table>
				<div class="mt-4 flex items-center gap-6">
					<Pages pagination={p.pagination} listResultMeta={res.meta}></Pages>
					<Position pagination={p.pagination} listResultMeta={res.meta}></Position>
				</div>
				<div
					data-init={`@get('/${props.prefix}/list/sse${searchParamsText ? '?' + searchParamsText : ''}')`}
				></div>
			</div>
		);
	}

	return new Elysia({ prefix: props.prefix })
		.use(pluginAuth)
		.macro({
			id: {
				params: type({
					id: 'string > 1',
				}),
			},
		})
		.get(
			'/list',
			({ user, path, query, status }) => {
				const paginationRes = paginationProcess({ query, path });

				if (!paginationRes.ok) {
					return status(400, paginationRes.error);
				}

				const pagination = paginationRes.value;

				return (
					<App user={user} path={path}>
						{renderList(props, { pagination, query })}
					</App>
				);
			},
			{
				auth: true,
				beforeHandle: props.listPermission
					? routeCheckPermission(props.listPermission[0], props.listPermission[1])
					: undefined,
			},
		)
		.get(
			'/list/sse',
			async function* ({ path, request, status, query }) {
				const paginationRes = paginationProcess({
					query,
					path: path.split('/').slice(0, -1).join('/'),
				});

				if (!paginationRes.ok) {
					return status(400, paginationRes.error);
				}

				const pagination = paginationRes.value;

				const controller = new AbortController();

				request.signal.addEventListener('abort', () => {
					controller.abort();
				});

				// rerenders the page when an update event is emitted
				try {
					for await (const _ of on(events, 'update', { signal: controller.signal })) {
						yield dstar.patchElements(
							(<div id="morph">{renderList(props, { pagination, query })}</div>) as string,
						);
					}
				} catch (err: any) {
					if (err.code !== 'ABORT_ERR') {
						throw err;
					}
				}
			},
			{
				auth: true,
				beforeHandle: props.listPermission
					? routeCheckPermission(props.listPermission[0], props.listPermission[1])
					: undefined,
			},
		)
		.get(
			'/create',
			({ user, path, status }) => {
				if (props.createFormLayout) {
					return (
						<App user={user} path={path}>
							<FormEdit prefix={props.prefix} type="create">
								<FormLayout layout={props.createFormLayout}></FormLayout>
							</FormEdit>
						</App>
					);
				}

				if (!props.createView) {
					return status(404);
				}

				return (
					<App user={user} path={path}>
						<props.createView></props.createView>
					</App>
				);
			},
			{
				auth: true,
				beforeHandle: props.createPermission
					? routeCheckPermission(props.createPermission[0], props.createPermission[1])
					: undefined,
			},
		)
		.post(
			'/create',
			async function* ({ user, request }) {
				if (!props.createFormLayout && !props.createView) {
					// In this case createProcess should create an entry with default placeholder values
					try {
						let result = props.createProcess({ data: {} as DataCreate, user, request });
						if (result instanceof Promise) {
							result = await result;
						}
						if (result?.id !== undefined) {
							yield dstar.redirect(`/${props.prefix}/${result.id}`);
						} else {
							yield dstar.redirect(`/${props.prefix}/list`);
						}
					} catch (error) {
						yield sendToast({ message: ERROR_MESSAGE_GENERIC });
						console.trace(error);
					}

					triggerUpdate();
					return;
				}

				const raw = await dstar.readSignals(request);
				if (!raw.ok) {
					return ERROR_MESSAGE_GENERIC;
				}
				const data = props.createSchema(raw.signals?.crud ?? {});

				let errorMessage: string | undefined = undefined;
				if (!(data instanceof type.errors)) {
					try {
						let result = props.createProcess({ data: data as DataCreate, user, request });
						if (result instanceof Promise) {
							result = await result;
						}
						if (result?.id !== undefined) {
							yield dstar.redirect(`/${props.prefix}/${result.id}`);
						} else {
							yield dstar.redirect(`/${props.prefix}/list`);
						}
					} catch (error) {
						errorMessage = ERROR_MESSAGE_GENERIC;
						console.trace(error);
					}
				}

				if (props.createFormLayout) {
					yield dstar.patchElements(
						(
							<div id="morph">
								<FormEdit prefix={props.prefix} errorMessage={errorMessage} type="create">
									<FormLayout
										layout={props.createFormLayout}
										data={
											data instanceof type.errors
												? (raw.signals?.crud ?? ({} as any))
												: (data as Record<string, unknown>)
										}
										issues={data instanceof type.errors ? data.flatProblemsByPath : undefined}
									></FormLayout>
								</FormEdit>
							</div>
						) as string,
					);
				} else if (props.createView) {
					yield dstar.patchElements(
						(
							<div id="morph">
								<props.createView
									data={
										data instanceof type.errors
											? (raw.signals?.crud ?? ({} as any))
											: (data as Record<string, unknown>)
									}
									issues={data instanceof type.errors ? data.flatProblemsByPath : undefined}
								></props.createView>
							</div>
						) as string,
					);
				}
				triggerUpdate();
			},
			{
				auth: true,
				beforeHandle: props.createPermission
					? routeCheckPermission(props.createPermission[0], props.createPermission[1])
					: undefined,
			},
		)
		.get(
			'/:id',
			async ({ params: { id }, user, path, status, request }) => {
				try {
					let result = props.readProcess({ id, user, request });
					if (result instanceof Promise) {
						result = await result;
					}
					if (!result) {
						return status(404);
					}

					if (props.updateFormLayout) {
						return (
							<App user={user} path={path}>
								<FormEdit prefix={props.prefix} type="update" id={id}>
									<FormLayout layout={props.updateFormLayout} data={result}></FormLayout>
								</FormEdit>
							</App>
						);
					} else {
						return (
							<App user={user} path={path}>
								<props.updateView data={result} id={id}></props.updateView>
							</App>
						);
					}
				} catch (error) {
					console.trace(error);
				}
			},

			{
				auth: true,
				id: true,
				beforeHandle: props.readPermission
					? routeCheckPermission(props.readPermission[0], props.readPermission[1])
					: undefined,
			},
		)
		.put(
			'/:id',
			async function* ({ params: { id }, user, request }) {
				const raw = await dstar.readSignals(request);
				if (!raw.ok) {
					return ERROR_MESSAGE_GENERIC;
				}
				const data = props.updateSchema(raw.signals?.crud ?? {});

				let formData: Record<string, unknown>;

				let errorMessage: string | undefined;
				let successMessage: string | undefined;

				if (!(data instanceof type.errors)) {
					formData = data;
					try {
						let result = props.updateProcess({ data: data as DataUpdate, user, id, request });

						if (result instanceof Promise) {
							result = await result;
						}

						successMessage = 'Saved.';
					} catch (error) {
						console.trace(error);
						errorMessage = ERROR_MESSAGE_GENERIC;
					}
				} else {
					formData = raw.signals?.crud as Record<string, unknown>;
				}

				if (props.updateFormLayout) {
					yield dstar.patchElements(
						(
							<div id="morph">
								<FormEdit prefix={props.prefix} errorMessage={errorMessage} type="update" id={id}>
									<FormLayout
										layout={props.updateFormLayout}
										data={formData}
										issues={data instanceof type.errors ? data.flatProblemsByPath : undefined}
									></FormLayout>
								</FormEdit>
							</div>
						) as string,
						{ mode: 'replace' },
					);

					if (successMessage) {
						yield sendToast({ type: 'success', message: successMessage });
					}
				} else if (data instanceof type.errors) {
					yield dstar.patchSignals({ crudIssues: data.flatProblemsByPath });
				} else {
					yield sendToast({ type: 'success', message: 'Saved' });
				}

				triggerUpdate();
			},
			{
				auth: true,
				id: true,
				beforeHandle: props.updatePermission
					? routeCheckPermission(props.updatePermission[0], props.updatePermission[1])
					: undefined,
			},
		)
		.delete(
			'/:id',
			async function* ({ user, status, params: { id }, request }) {
				try {
					let result = props.deleteProcess({ user, id, request });
					if (result instanceof Promise) {
						result = await result;
					}
					yield sendToast({ type: 'success', message: 'Deleted' });
				} catch (error) {
					console.trace(error);
					yield sendToast({ type: 'error', message: 'Something went wrong' });
					return status(500);
				}

				triggerUpdate();
			},
			{
				auth: true,
				id: true,
				beforeHandle: props.deletePermission
					? routeCheckPermission(props.deletePermission[0], props.deletePermission[1])
					: undefined,
			},
		);
}

type FormEditProps = { prefix: string; errorMessage?: string } & (
	| { type: 'create' }
	| { type: 'update'; id: string }
);
function FormEdit(props: PropsWithChildren<FormEditProps>) {
	return (
		<div class="card w-120 bg-base-200">
			<div class="card-body">
				{!!props?.errorMessage && (
					<div role="alert" class="alert alert-error">
						<p safe>{props.errorMessage}</p>
					</div>
				)}
				<form
					id="crud-form"
					data-on:submit={
						props.type === 'create'
							? ts`@post('/${props.prefix}/create',      { filterSignals: { include: /^crud\./ } })`
							: ts`@put( '/${props.prefix}/${props.id}', { filterSignals: { include: /^crud\./ } })`
					}
				>
					{props.children as 'safe'}
					<div class="mt-6 flex justify-end">
						<button class="btn btn-primary">{props.type === 'create' ? 'Create' : 'Save'}</button>
					</div>
				</form>
			</div>
		</div>
	);
}
