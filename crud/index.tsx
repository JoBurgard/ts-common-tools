import { sendToast } from '$ext/ts-common-tools/datastar/toaster';
import FormLayout, { type Layout } from './form-layout';
import App from '$src/layouts/App';
import { pluginAuth } from '$src/modules/auth';
import { type PropsWithChildren } from '@kitajs/html';
import { Type, type } from 'arktype';
import Elysia from 'elysia';
import Table, { type Columns } from './table';
import { dstar } from '$d*';
import EventEmitter, { on } from 'node:events';
import { throttle, ts } from '$ext/ts-common-tools/utils';
import type { MaybePromise } from '../types';
import type { createSubjectAction, PermissionsInfo } from '$lib/permissions';

const ERROR_MESSAGE_GENERIC = 'Something went wrong. Please contact the support.';

type User = {
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
	listProcess: () => ListItem[];
	listColumns: Columns<ListItem>;
	createSchema: Type<DataCreate>;
	createProcess: (props: {
		data: DataCreate;
		user: User;
		request: Request;
	}) => MaybePromise<void | { id: string }>;
	createPermission?: ReturnType<typeof createSubjectAction>;
	readProcess: (props: {
		id: string;
		user: User;
		request: Request;
	}) => MaybePromise<Record<string, unknown> | undefined>;
	updateSchema: Type<DataUpdate>;
	updateProcess: (props: {
		data: DataUpdate;
		user: User;
		id: string;
		request: Request;
	}) => MaybePromise<void>;
	deleteProcess: (props: { user: User; id: string; request: Request }) => MaybePromise<void>;
};

type CrudProps<
	DataCreate extends Record<string, unknown>,
	DataUpdate extends Record<string, unknown>,
	ListItem extends Record<string, unknown>,
> = CrudPropsBase<DataCreate, DataUpdate, ListItem> &
	(
		| {
				formLayout: Layout;
				createView?: undefined;
				updateView?: undefined;
		  }
		| {
				formLayout?: undefined;
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
			getValue: () => '',
			component: (componentProps) => {
				return (
					<div class="flex gap-2">
						<a class="link" href={`/${props.prefix}/${componentProps.row?.id}`}>
							Bearbeiten
						</a>
						<button
							class="link"
							type="button"
							data-on:click={`@delete('/${props.prefix}/${componentProps.row?.id}')`}
						>
							Löschen
						</button>
					</div>
				);
			},
		},
	];

	function renderList(props: Props) {
		// If not createView is passed, then we assume, that an item will be created with default
		// values.
		return (
			<>
				{!props.formLayout && !props.createView ? (
					<button
						type="button"
						class="btn btn-primary"
						data-on:click={`@post('/${props.prefix}/create')`}
					>
						Create
					</button>
				) : (
					<a href={`/${props.prefix}/create`} class="btn btn-primary">
						Create
					</a>
				)}
				<Table data={props.listProcess()} columns={listColumns}></Table>
				<div data-init={`@get('/${props.prefix}/list/sse')`}></div>
			</>
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
			({ user }) => {
				return <App user={user}>{renderList(props)}</App>;
			},
			{ auth: true },
		)
		.get(
			'/list/sse',
			async function* ({ request }) {
				const controller = new AbortController();

				request.signal.addEventListener('abort', () => {
					controller.abort();
				});

				// rerenders the page when an update event is emitted
				try {
					for await (const _ of on(events, 'update', { signal: controller.signal })) {
						yield dstar.patchElements((<div id="morph">{renderList(props)}</div>) as string);
						yield sendToast({ message: new Date().toString() });
					}
				} catch (err: any) {
					if (err.code !== 'ABORT_ERR') {
						throw err;
					}
				}
			},
			{ auth: true },
		)
		.get(
			'/create',
			({ user, status }) => {
				if (props.formLayout) {
					return (
						<App user={user}>
							<FormEdit prefix={props.prefix} type="create">
								<FormLayout layout={props.formLayout}></FormLayout>
							</FormEdit>
						</App>
					);
				}

				if (!props.createView) {
					return status(404);
				}

				return (
					<App user={user}>
						<props.createView></props.createView>
					</App>
				);
			},
			{
				auth: true,
			},
		)
		.post(
			'/create',
			async function* ({ user, request }) {
				if (!props.formLayout && !props.createView) {
					// In this case createProcess should create an entry with default placeholder values
					try {
						let result = props.createProcess({ data: {} as DataCreate, user, request });
						if (result instanceof Promise) {
							result = await result;
						}
						if (result?.id) {
							yield dstar.redirect(`/${props.prefix}/${result.id}`);
						} else {
							yield dstar.redirect(`/${props.prefix}/list`);
						}
					} catch (error) {
						yield sendToast({ message: ERROR_MESSAGE_GENERIC });
						console.trace(error);
					}

					return;
				}

				const raw = await dstar.readSignals(request);
				if (!raw.ok) {
					throw new Error(raw.error);
				}
				const data = props.createSchema(raw.signals?.crud ?? {});

				let errorMessage: string | undefined = undefined;
				if (!(data instanceof type.errors)) {
					try {
						let result = props.createProcess({ data: data as DataCreate, user, request });
						if (result instanceof Promise) {
							result = await result;
						}
						yield dstar.redirect(`/${props.prefix}/list`);
					} catch (error) {
						errorMessage = ERROR_MESSAGE_GENERIC;
						console.trace(error);
					}
				}

				if (props.formLayout) {
					yield dstar.patchElements(
						(
							<div id="morph">
								<FormEdit prefix={props.prefix} errorMessage={errorMessage} type="create">
									<FormLayout
										layout={props.formLayout}
										data={data as Record<string, unknown>}
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
									data={data as Record<string, unknown>}
									issues={data instanceof type.errors ? data.flatProblemsByPath : undefined}
								></props.createView>
							</div>
						) as string,
					);
				}
			},
			{
				auth: true,
			},
		)
		.get(
			'/:id',
			async ({ params: { id }, user, status, request }) => {
				try {
					let result = props.readProcess({ id, user, request });
					if (result instanceof Promise) {
						result = await result;
					}
					if (!result) {
						return status(404);
					}

					if (props.formLayout) {
						return (
							<App user={user}>
								<FormEdit prefix={props.prefix} type="update" id={id}>
									<FormLayout layout={props.formLayout} data={result}></FormLayout>
								</FormEdit>
							</App>
						);
					} else {
						return (
							<App user={user}>
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
			},
		)
		.put(
			'/:id',
			async function* ({ params: { id }, user, request }) {
				const raw = await dstar.readSignals(request);
				if (!raw.ok) {
					throw new Error(raw.error);
				}
				const data = props.createSchema(raw.signals?.crud ?? {});

				let formData: Record<string, unknown> = {};

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
						errorMessage = 'Something went wrong. Please contact the support.';
					}
				}

				if (props.formLayout) {
					yield dstar.patchElements(
						(
							<div id="morph">
								<FormEdit
									prefix={props.prefix}
									successMessage={successMessage}
									errorMessage={errorMessage}
									type="update"
									id={id}
								>
									<FormLayout
										layout={props.formLayout}
										data={formData}
										issues={data instanceof type.errors ? data.flatProblemsByPath : undefined}
									></FormLayout>
								</FormEdit>
							</div>
						) as string,
						{ mode: 'replace' },
					);
				} else if (data instanceof type.errors) {
					yield dstar.patchSignals({ crudIssues: data.flatProblemsByPath });
				} else {
					yield sendToast({ type: 'success', message: 'Saved' });
				}
			},
			{
				auth: true,
				id: true,
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
			},
		);
}

type FormEditProps = { prefix: string; successMessage?: string; errorMessage?: string } & (
	| { type: 'create' }
	| { type: 'update'; id: string }
);
function FormEdit(props: PropsWithChildren<FormEditProps>) {
	return (
		<div class="card w-120 bg-base-200">
			<div class="card-body">
				{!!props?.successMessage && (
					<div role="alert" class="alert alert-success">
						<p safe>{props.successMessage}</p>
					</div>
				)}
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
					<pre data-json-signals></pre>
					<div class="mt-6 flex justify-end">
						<button class="btn btn-primary">{props.type === 'create' ? 'Create' : 'Save'}</button>
					</div>
				</form>
			</div>
		</div>
	);
}
