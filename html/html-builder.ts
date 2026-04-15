import { escapeHTML } from 'bun';

/**
 * When using `html`, the expressions will be automatically escaped.
 * `comp` will not escape it's input, because it should be used to add components.
 */
export function htmlBuilderCreate() {
	const result: string[] = [];

	const html = (
		strings: readonly string[],
		...values: (string | number | boolean | RawString)[]
	) => {
		const escaped = values.map((it) => {
			if (it instanceof RawString) {
				return it.getValue();
			}
			return escapeHTML(it);
		});
		result.push(String.raw({ raw: strings }, ...escaped));
	};

	html.raw = htmlRaw;

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

class RawString {
	constructor(public value: string) {
		this.value = value;
	}

	getValue() {
		return this.value;
	}
}

function htmlRaw(value: string) {
	return new RawString(value);
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
	return (
		compFn: (
			data: {
				props: Props;
				children: { (): void; value: string };
				slots: Prettify<
					Combine<Slots extends string ? { [k in Slots]?: { (): void; value: string } } : undefined>
				>;
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
			const builder = htmlBuilderCreate();
			const chld = htmlBuilderCreate();
			const slotsMap = new Map<Slots, HtmlBuilder>();
			const slotsFn = (name: Slots) =>
				slotsMap.getOrInsertComputed(name, () => htmlBuilderCreate());

			childSlotFn?.({ chld, slots: slotsFn });

			const chldVal = chld.renderHtml();
			const children = () => builder.c(chldVal);
			children.value = chldVal;

			const slotsData: Record<string, { (): void; value: string }> = {};

			if (slotsMap.size > 0) {
				for (const [key, value] of slotsMap.entries()) {
					const slotVal = value.renderHtml();
					const slotFn = () => {
						builder.c(slotVal);
					};
					slotFn.value = slotVal;
					slotsData[key as string] = slotFn;
				}
			}

			compFn({ props, children, slots: slotsData as any }, builder);
			return builder.renderHtml();
		};
	};
}
