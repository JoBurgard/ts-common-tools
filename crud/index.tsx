import { dstar } from '$d*';
import { sendToast } from '$ext/ts-common-tools/datastar/toaster';
import { interval, ts } from '$ext/ts-common-tools/utils';
import { routeCheckPermission, type createSubjectAction } from '$lib/permissions';
import { TICK_MS } from '$src/index';
import App from '$src/layouts/App';
import { pluginAuth } from '$src/modules/auth';
import { type PropsWithChildren } from '@kitajs/html';
import { Type, type } from 'arktype';
import type { SQL } from 'drizzle-orm';
import Elysia from 'elysia';
import type { MaybePromise } from '../types';
import { objectInflate } from '../utils/object';
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

const ERROR_MESSAGE_GENERIC = 'Something went wrong. Please contact the support.';

export type CrudUser = {
	id: string;
};

export type ComponentView = (props: {
	data?: Record<string, unknown>;
	issues?: Record<string, string[]>;
	id?: string;
}) => string;

type ListLayout = {
	actionsTop?: (p: { user: { roles: string[] } }) => Promise<JSX.Element>;
};

type CrudPropsBase<
	DataCreate extends Record<string, unknown>,
	DataUpdate extends Record<string, unknown>,
	ListItem extends Record<string, unknown>,
> = {
	prefix: string;
	title: string;
	// ===========================================================================================================
	listProcess: (p: { pagination: Pagination; dbSearchFilters: SQL[]; showDeleted: boolean }) => {
		data: ListItem[];
		meta: ListResultMeta;
	};
	listColumns: Columns<ListItem>;
	listLayout?: ListLayout;
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
} & (
	| {
			hasRecyclebin: true;
			restoreProcess: (props: {
				user: CrudUser;
				id: string;
				request: Request;
			}) => MaybePromise<void>;
	  }
	| { hasRecyclebin?: false; restoreProcess?: undefined }
);

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

	let lastUpdate = Date.now();
	const triggerUpdate = () => (lastUpdate = Date.now());

	const listColumns = (p: { isRecyclebin: boolean }): Props['listColumns'] => [
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
							class={['btn btn-xs', p.isRecyclebin ? 'btn-error' : 'btn-secondary']}
							type="button"
							data-on:click={`confirm('Do you really want to delete?') && @delete('/${props.prefix}/${componentProps.row?.id}')`}
						>
							<span class="i-[mdi--delete]"></span>
							Delete
						</button>
						{props.hasRecyclebin && p.isRecyclebin && (
							<button
								class="btn btn-xs btn-success"
								type="button"
								data-on:click={`@post('/${props.prefix}/restore/${componentProps.row?.id}')`}
							>
								<span class="i-[mdi--undo]"></span>
								Restore
							</button>
						)}
					</div>
				);
			},
		},
	];

	async function listView(
		props: Props,
		p: { pagination: Pagination; query: Record<string, string>; user: { roles: string[] } },
	) {
		const layout = props.listLayout;
		const listFilters = props.listFilters ?? {};
		const dbSearchFilters = filtersProcess({ list: listFilters, query: p.query });
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

		const isRecyclebin = p.pagination.searchParams.get('recyclebin') === 'true';

		const res = props.listProcess({
			pagination: p.pagination,
			dbSearchFilters,
			showDeleted: isRecyclebin,
		});

		// If no createView is passed, then we assume, that an item will be created with default
		// values.
		return (
			<>
				<div
					id="sse"
					data-init={`@get('/${props.prefix}/list/sse${searchParamsText ? '?' + searchParamsText : ''}', {filterSignals: {exclude: /.*/}})`}
					data-ignore-morph
				></div>
				<div data-signals={`{filter: ${JSON.stringify(filtersSignals)}}`}>
					<div class="flex items-center justify-between gap-6">
						<div class="flex items-center gap-4">
							<div>
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
							{!!layout?.actionsTop && (
								<div>{(await layout.actionsTop({ user: p.user })) as 'safe'}</div>
							)}
						</div>
						{props.hasRecyclebin && (
							<div>
								<div role="tablist" class="tabs-border tabs">
									<a
										role="tab"
										class={['tab flex gap-2', !isRecyclebin && 'tab-active']}
										data-attr:href="window.location.pathname + '?' + @search({recyclebin: '', page: 1})"
									>
										<span class="i-[mdi--format-list-bulleted]"></span>
										List
									</a>
									<a
										role="tab"
										class={['tab flex gap-2', isRecyclebin && 'tab-active']}
										data-attr:href="window.location.pathname + '?' + @search({recyclebin: true, page: 1})"
									>
										<span class="i-[mdi--bin]"></span>
										Recycle Bin
									</a>
								</div>
							</div>
						)}
					</div>
					{filtersTop.length > 0 && (
						<form
							class="mt-4"
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
					)}
					<div class="mt-4">
						<Table data={res.data} columns={listColumns({ isRecyclebin })}></Table>
					</div>
					<div class="mt-4 flex items-center gap-6">
						<Pages pagination={p.pagination} listResultMeta={res.meta}></Pages>
						<Position pagination={p.pagination} listResultMeta={res.meta}></Position>
					</div>
				</div>
			</>
		);
	}

	const plugin = new Elysia({ prefix: props.prefix })
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
			async ({ user, path, query, status }) => {
				const paginationRes = paginationProcess({ query, path });

				if (!paginationRes.ok) {
					return status(400, paginationRes.error);
				}

				const pagination = paginationRes.value;

				return (
					<App user={user} path={path}>
						{(await listView(props, { pagination, query, user })) as 'safe'}
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
			async function* ({ user, path, request, status, query, set }) {
				const paginationRes = paginationProcess({
					query,
					path: path.split('/').slice(0, -1).join('/'),
				});

				if (!paginationRes.ok) {
					return status(400, paginationRes.error);
				}

				const pagination = paginationRes.value;

				set.headers.connection = 'keep-alive';
				set.headers['cache-control'] = 'no-cache';

				yield 'event: heartbeat\n\n';
				console.log(new Date(), '<-- sse connection');

				let lastRender = lastUpdate;
				let lastHeartbeat = Date.now();

				// rerenders the page when an update event is emitted
				try {
					// PERF global tick event + shared html render
					for await (const _ of interval(TICK_MS, { signal: request.signal })) {
						if (lastRender !== lastUpdate) {
							yield dstar.patchElements(
								(
									<div id="morph">
										{(await listView(props, { pagination, query, user })) as 'safe'}
									</div>
								) as string,
							);
							lastRender = lastUpdate;
							lastHeartbeat = Date.now();
						} else if (Date.now() - lastHeartbeat >= 20_000) {
							yield 'event: heartbeat\n\n';
							lastHeartbeat = Date.now();
						}
					}
				} catch (err: any) {
					if (err.code !== 'ABORT_ERR') {
						console.error(err);
						throw err;
					} else {
						console.log(new Date(), 'SSE Aborted');
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
		)
		.post(
			'/restore/:id',
			async function* ({ user, status, params: { id }, request }) {
				if (!props.hasRecyclebin) {
					return status(404);
				}

				try {
					let result = props.restoreProcess({ user, id, request });
					if (result instanceof Promise) {
						result = await result;
					}
					yield sendToast({ type: 'success', message: 'Restored' });
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

	return { plugin, triggerUpdate };
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
