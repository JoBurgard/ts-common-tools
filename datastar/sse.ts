type EventType = 'datastar-patch-elements' | 'datastar-patch-signals';
function send({
	eventType,
	dataLines,
	eventId,
	retryDurationMs,
}: {
	eventType: EventType;
	dataLines: string[];
	eventId?: string;
	retryDurationMs?: number;
}): string {
	const result: string[] = [`event: ${eventType}\n`];

	if (eventId) {
		result.push(`id: ${eventId}\n`);
	}

	if (retryDurationMs && retryDurationMs !== 1000) {
		result.push(`retry: ${retryDurationMs}\n`);
	}

	for (const line of dataLines) {
		result.push(`data: ${line}\n`);
	}

	result.push(`\n`); // end of event

	return result.join('');
}

type PatchMode =
	| 'outer'
	| 'inner'
	| 'replace'
	| 'prepend'
	| 'append'
	| 'before'
	| 'after'
	| 'remove';

function patchElements(
	elements: string,
	{
		mode,
		selector,
		useViewTransition,
		eventId,
		retryDurationMs,
	}: {
		mode?: PatchMode;
		selector?: string;
		useViewTransition?: boolean;
		eventId?: string;
		retryDurationMs?: number;
	} = {},
): string {
	const dataLines: string[] = [];

	if (mode) {
		dataLines.push(`mode ${mode}`);
	}

	if (selector) {
		dataLines.push(`selector ${selector}`);
	}

	if (useViewTransition) {
		dataLines.push(`useViewTransition ${useViewTransition}`);
	}

	dataLines.push(...elements.split('\n').map((it) => `elements ${it}`));

	return send({ eventType: 'datastar-patch-elements', eventId, retryDurationMs, dataLines });
}

function executeScript(
	script: string,
	{
		autoRemove,
		attributes,
		eventId,
		retryDurationMs,
	}: {
		autoRemove?: boolean;
		attributes?: string[];
		eventId?: string;
		retryDurationMs?: number;
	} = {},
): string {
	const dataLines: string[] = [
		'mode append',
		'selector body',
		'elements ' +
			[
				'<script ',
				autoRemove ? 'data-effect="el.remove()" ' : '',
				attributes ? attributes.join(' ') : '',
				'>',
				script,
				'</script>',
			].join(''),
	];

	return send({ eventType: 'datastar-patch-elements', eventId, retryDurationMs, dataLines });
}

function redirect(location: string) {
	return executeScript(`setTimeout(() => window.location = "${Bun.escapeHTML(location)}")`, {
		autoRemove: true,
	});
}

export const dstar = { send, patchElements, executeScript, redirect };
