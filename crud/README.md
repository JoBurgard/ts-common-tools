# Example

```ts
// example.layout.ts

import type { Layout } from '$ext/ts-common-tools/crud/form-layout';
import { type } from 'arktype';

[
	{
		type: 'input',
		label: 'Name',
		name: 'name',
		inputType: 'text',
		validation: type('string > 1'),
	},
	{
		type: 'input',
		label: 'Beilage',
		name: 'sideDish',
		inputType: 'text',
		validation: type('string > 1'),
	},
] satisfies Layout;
```

Running `bun run ./ext/ts-common-tools/codegen-layout.ts` or starting the watcher like this

```ts
// devtools.ts

import { generateLayoutsWatch } from '$ext/ts-common-tools/crud/codegen-layout';

const close = await generateLayoutsWatch(import.meta.dir);

process.on('SIGINT', () => {
	close();
	process.exit(0);
});
```

will result in:

```ts
// WARN: This file is generated. Please do not edit manually.

import type { Layout } from '$ext/ts-common-tools/crud/form-layout';
import { type } from 'arktype';

export const layout = [
	{
		type: 'input',
		label: 'Name',
		name: 'name',
		inputType: 'text',
		validation: type('string > 1'),
	},
	{
		type: 'input',
		label: 'Beilage',
		name: 'sideDish',
		inputType: 'text',
		validation: type('string > 1'),
	},
] satisfies Layout;

export const schema = type({
	name: 'string > 1',
	sideDish: 'string > 1',
});
```
