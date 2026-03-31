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
			options: { label: string; value: string }[];
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
					{item.inputType === 'checkbox' && (
						<div {...{ ['data-signals:crud.' + item.name]: '[]' }}></div>
					)}
					{item.inputType === 'checkbox' &&
						item.options.map((it) => (
							<label class="label">
								<input
									class="checkbox"
									name={item.name}
									type={item.inputType}
									value={it.value}
									checked={props.data?.[item.name] === it}
									data-bind={'crud.' + item.name}
								/>
								{it.label as 'safe'}
							</label>
						))}
					{item.inputType === 'radio' &&
						item.options.map((it) => (
							<label class="label">
								<input
									class="radio"
									name={item.name}
									type={item.inputType}
									value={it.value}
									checked={props.data?.[item.name] === it}
									data-bind={'crud.' + item.name}
								/>
								{it.label as 'safe'}
							</label>
						))}
					{!!item.description && (
						<p class="label whitespace-normal" safe>
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
			<script
				type="module"
				src="/public/dist/ext/ts-common-tools/components/mayu-options-checkbox.js"
			></script>
			<script
				type="module"
				src="/public/dist/ext/ts-common-tools/components/mayu-options-radio.js"
			></script>
		</div>
	);
}
