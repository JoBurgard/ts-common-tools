import { test, expect } from 'bun:test';
import { xmlToString, type XmlElement } from './xml-create';

const simpleXmlTag = '<tag attribute="test">inner</tag>';
const tagWithAttribute = [
	{ name: 'Foo', attributes: [['attr', 'value']] },
	'<Foo attr="value"></Foo>',
] satisfies [XmlElement, string];
const tagWithChildren = [
	{ name: 'Bar', attributes: [['attr', 'value']], children: [tagWithAttribute[0], simpleXmlTag] },
	`<Bar attr="value"><Foo attr="value"></Foo>${simpleXmlTag}</Bar>`,
] satisfies [XmlElement, string];

const testCases = [
	{
		parameters: [[]],
		expected: '',
	},
	{
		parameters: [[simpleXmlTag]],
		expected: simpleXmlTag,
	},
	{
		parameters: [[simpleXmlTag, { name: 'ns3:SomeTag' }, tagWithAttribute[0], tagWithChildren[0]]],
		expected:
			simpleXmlTag + `<ns3:SomeTag></ns3:SomeTag>` + tagWithAttribute[1] + tagWithChildren[1],
	},
] satisfies {
	parameters: Parameters<typeof xmlToString>;
	expected: ReturnType<typeof xmlToString>;
}[];

test.each(testCases)('xmlToString %#', ({ parameters, expected }) => {
	expect(xmlToString(...parameters)).toBe(expected);
});
