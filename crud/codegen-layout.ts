import { tsPlugin } from '@sveltejs/acorn-typescript';
import { Parser, type ArrayExpression } from 'acorn';
import { Glob, pathToFileURL } from 'bun';
import assert from 'node:assert/strict';
import { watch } from 'node:fs';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	// This module is being run directly
	generateLayouts();
}

const layoutFiles = new Glob('**/*.layout.ts');
console.log('Layout Code-Generator started');

export async function generateLayoutsWatch(path: string) {
	await generateLayouts();
	const watcher = watch(path, { recursive: true }, async (_, filename) => {
		if (filename && layoutFiles.match(path + '/' + filename)) {
			await generateLayouts(path + '/' + filename);
		}
	});

	return () => watcher.close();
}
export async function generateLayouts(path?: string | undefined) {
	const filePaths = path ? [path] : layoutFiles.scanSync();
	let count = 0;
	const startTime = performance.now();
	for (const path of filePaths) {
		count += 1;
		const newFile: string[] = ['// WARN: This file is generated. Please do not edit manually.\n'];

		const text = await Bun.file(path).text();
		const program = Parser.extend(tsPlugin()).parse(text, {
			sourceType: 'module',
			ecmaVersion: 'latest',
		});

		for (const node of program.body) {
			if (node.type === 'ImportDeclaration') {
				newFile.push(text.slice(node.start, node.end));
				continue;
			}

			if (node.type === 'ExpressionStatement') {
				let item: any;
				if ((item = node.expression as any).type !== 'TSSatisfiesExpression') {
					continue;
				}

				newFile.push('\nexport const layout = ' + text.slice(item.start, item.end) + ';');

				if ((item = item.expression as any).type !== 'ArrayExpression') {
					continue;
				}

				assert(item.elements);

				newFile.push('\nexport const schema = type({');
				newFile.push(...extractValidation(text, item.elements));
				newFile.push('});');
				continue;
			}
		}

		Bun.file(path.replace('.layout.ts', '.layout.gen.ts')).write(newFile.join('\n'));
	}

	console.log(
		`[${(performance.now() - startTime).toFixed(0)}ms] Generated ${count} ${count === 1 ? 'file' : 'files'}`,
	);
}

function extractValidation(text: string, elements: ArrayExpression['elements']): string[] {
	const result: string[] = [];

	for (const el of elements) {
		if (el?.type !== 'ObjectExpression') {
			continue;
		}

		let type: string = '';
		let name: string = '';
		let arkValidationText: string = '';
		let children: ArrayExpression['elements'] = [];
		for (const prop of el.properties) {
			if (prop.type !== 'Property') {
				continue;
			}

			if (prop.key.type === 'Identifier') {
				if (prop.key.name === 'type') {
					if (prop.value.type === 'Literal') {
						type = prop.value.value as string;
					}
					continue;
				}

				if (prop.key.name === 'children') {
					if (prop.value.type === 'ArrayExpression') {
						children = prop.value.elements;
					}
					continue;
				}

				if (prop.key.name === 'name') {
					if (prop.value.type === 'Literal') {
						name = prop.value.raw as string;
					}
					continue;
				}

				if (prop.key.name === 'validation') {
					if (prop.value.type === 'CallExpression') {
						arkValidationText = prop.value.arguments
							.map((it) => text.slice(it.start, it.end))
							.join(', ');
					}
					continue;
				}
			}
		}

		assert(type);
		if (type === 'row') {
			assert(children.length > 0);
			result.push(...extractValidation(text, children));
		} else {
			assert(name);
			assert(arkValidationText);
			result.push(`\t${name}: ${arkValidationText},`);
		}
	}

	return result;
}
