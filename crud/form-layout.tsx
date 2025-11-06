import { type } from 'arktype';

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
>;

export default function formLayout(props: {
	layout: Layout;
	data?: Record<string, unknown>;
	issues?: Record<string, string[]>;
	disableWrapper?: boolean;
}) {
	let inner = '';
	for (const item of props.layout) {
		if (item.type === 'row') {
			inner += (
				<div class="flex gap-4">{formLayout({ layout: item.children, disableWrapper: true })}</div>
			);
		} else if (item.type === 'input') {
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
		}
	}

	if (props?.disableWrapper) {
		return inner;
	}

	return <div class="flex flex-col gap-4">{inner as 'safe'}</div>;
}
