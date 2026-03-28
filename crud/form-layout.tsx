import { type } from 'arktype';
import { ts } from '../utils';

export type Layout = Array<
	| {
			type: 'row';
			children: Layout;
	  }
	| {
			type: 'input';
			inputType: 'text' | 'email' | 'password' | 'number' | 'checkbox';
			name: string;
			label: string;
			description?: string;
			validation: type;
	  }
	| {
			type: 'options';
			inputType: 'checkbox' | 'radio';
			name: string;
			label: string;
			description?: string;
			options: string[];
			validation: type;
	  }
>;

export default function formLayout(props: {
	layout: Layout;
	data?: Record<string, unknown>;
	issues?: Record<string, string[]>;
	disableWrapper?: boolean;
}) {
	let inner = '';
	for (const item of props.layout) {
		if ('row' === item.type) {
			inner += (
				<div class="flex gap-4">{formLayout({ layout: item.children, disableWrapper: true })}</div>
			);
			continue;
		}
		if ('input' === item.type) {
			inner += (
				<fieldset class="fieldset w-full">
					<legend class="fieldset-legend" safe>
						{item.label}
					</legend>
					<input
						class="input w-full"
						name={item.name}
						type={item.inputType}
						value={String(props.data?.[item.name] ?? '')}
						data-bind={'crud.' + item.name}
					/>
					{!!item.description && (
						<p class="label" safe>
							{item.description}
						</p>
					)}
					{!!props.issues?.[item.name] && (
						<p class="label text-error" safe>
							{props.issues[item.name]}
						</p>
					)}
				</fieldset>
			);
			continue;
		}
		if ('options' === item.type) {
			inner += (
				<fieldset class="fieldset w-full">
					<legend class="fieldset-legend" safe>
						{item.label}
					</legend>
					{item.options.map((it) => (
						<input
							class="input w-full"
							name={item.name}
							type={item.inputType}
							value={it}
							checked={props.data?.[item.name] === it}
							data-bind={'crud.' + item.name}
						/>
					))}
					{!!item.description && (
						<p class="label" safe>
							{item.description}
						</p>
					)}
					{!!props.issues?.[item.name] && (
						<p class="label text-error" safe>
							{props.issues[item.name]}
						</p>
					)}
				</fieldset>
			);
			continue;
		}
		// make sure we implement all the types
		item satisfies never;
	}

	if (props?.disableWrapper) {
		return inner;
	}

	return (
		<div
			class="flex flex-col gap-4"
			data-signals={ts`{
        crud: {}
      }`}
		>
			{inner as 'safe'}
		</div>
	);
}
