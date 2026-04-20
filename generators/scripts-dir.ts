import { ts } from '$ext/ts-common-tools/utils';
import { Glob } from 'bun';
import { parseArgs } from 'node:util';

const { positionals } = parseArgs({
	args: Bun.argv,
	strict: true,
	allowPositionals: true,
});

const pathTarget = positionals.at(-1);

let generated = `
/**
 * This file is generated. Edits will be overwritten. Please look into the code generator at "ext/ts-common-tools/generators/${import.meta.file}".
 */

import { parseArgs } from "node:util";
`.trimStart();

let scriptMap = `const scripts = new Map([\n`;

const glob = new Glob('**/*.ts');
let count = 0;
for await (const filePath of glob.scan({ cwd: pathTarget })) {
	if (filePath === 'index.ts') {
		continue;
	}
	generated += `import script${count} from './${filePath}';\n`;
	scriptMap += `  ['${filePath.slice(0, -3)}', script${count}],\n`;

	count += 1;
}

scriptMap += `]);\n`;
generated += `\n`;
generated += scriptMap;

generated += ts`
const { positionals } = parseArgs({
  args: Bun.argv,
  strict: true,
  allowPositionals: true,
});

const scriptName = positionals.at(-1);

const execThis = scripts.get(scriptName ?? '');
if (!execThis) {
  console.error("The script does not exist: %s", scriptName);
  process.exit(1);
}

const res = execThis();
if (res instanceof Promise) {
  await res;
}
console.log("%s [%sms]", scriptName, (Bun.nanoseconds() / 1_000_000).toFixed(1));
process.exit(0);
`;

const targetFile = pathTarget + '/index.ts';
await Bun.write(Bun.file(targetFile), generated);

console.log(
	`Generated file ${targetFile} \x1b[1m[${(Bun.nanoseconds() / 1_000_000).toFixed(1)}ms]\x1b[0m`,
);
