export type XmlElement =
	| {
			name: string;
			attributes?: [name: string, value: string][];
			children?: XmlElement[];
	  }
	| string;

export function xmlToString(elements: XmlElement[]): string {
	let result: string = '';
	for (const el of elements) {
		if (typeof el === 'string') {
			result += el;
			continue;
		}

		let attributes = '';
		if (el.attributes) {
			attributes = ' ' + el.attributes.map(([name, value]) => `${name}="${value}"`).join(' ');
		}

		let children = '';
		if (el.children) {
			children = xmlToString(el.children);
		}

		result += `<${el.name}${attributes}>${children}</${el.name}>`;
	}

	return result;
}
