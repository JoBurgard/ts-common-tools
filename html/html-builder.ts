import { escapeHTML } from 'bun';

/**
 * When using `html`, the expressions will be automatically escaped.
 * `comp` will not escape it's input, because it should be used to add components.
 */
export function htmlBuilderCreate() {
	const result: string[] = [];

	const html = (strings: readonly string[], ...values: (string | number | boolean | object)[]) => {
		const escaped = values.map((it) => escapeHTML(it));
		result.push(String.raw({ raw: strings }, ...escaped));
	};

	const comp = (componentResult: string) => {
		result.push(componentResult);
	};

	const renderHtml = () => {
		return result.join('');
	};

	return {
		html,
		h: html,
		comp,
		c: comp,
		renderHtml,
	};
}

type HtmlBuilder = ReturnType<typeof htmlBuilderCreate>;

type _Combine<T, K extends PropertyKey = T extends unknown ? keyof T : never> = T extends unknown
	? T & Partial<Record<Exclude<K, keyof T>, never>>
	: never;

type Combine<T> = { [K in keyof _Combine<T>]: _Combine<T>[K] };

type Prettify<T> = {
	[K in keyof T]: T[K];
} & unknown;

export function component<
	T extends { Props?: Record<string, unknown>; Slots?: string } = {
		Props: Record<string, unknown>;
		Slots: never;
	},
	Props = T extends { Props: Record<string, unknown> } ? T['Props'] : Record<never, unknown>,
	Slots = T extends { Slots: string } ? T['Slots'] : never,
>() {
	const builder = htmlBuilderCreate();
	return (
		compFn: (
			data: {
				props: Props;
				children: string;
				slots: Prettify<Combine<Slots extends string ? { [k in Slots]?: string } : undefined>>;
			},
			builder: HtmlBuilder,
		) => void,
	) => {
		return (
			props: Props,
			childSlotFn?: (innerBuilder: {
				chld: HtmlBuilder;
				slots: (name: Slots extends string ? Slots : never) => HtmlBuilder;
			}) => void,
		) => {
			const chld = htmlBuilderCreate();
			const slotsMap = new Map<Slots, HtmlBuilder>();
			const slotsFn = (name: Slots) =>
				slotsMap.getOrInsertComputed(name, () => htmlBuilderCreate());

			childSlotFn?.({ chld, slots: slotsFn });

			const children = chld.renderHtml();
			const slotsData: Record<string, string> = {};
			if (slotsMap.size > 0) {
				for (const [key, value] of slotsMap.entries()) {
					slotsData[key as string] = value.renderHtml();
				}
			}
			compFn({ props, children, slots: slotsData as any }, builder);
			return builder.renderHtml();
		};
	};
}
