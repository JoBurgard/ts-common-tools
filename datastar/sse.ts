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

function patchSignals(
	signals: string | Record<string, unknown>,
	{
		onlyIfMissing,
		eventId,
		retryDurationMs,
	}: {
		onlyIfMissing?: boolean;
		eventId?: string;
		retryDurationMs?: number;
	} = {},
): string {
	const dataLines: string[] = [];

	if (onlyIfMissing) {
		dataLines.push(`onlyIfMissing true`);
	}

	dataLines.push(`signals ${typeof signals === 'string' ? signals : JSON.stringify(signals)}`);

	return send({ eventType: 'datastar-patch-signals', eventId, retryDurationMs, dataLines });
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readSignals(
	req: Request,
): Promise<{ ok: true; signals: Record<string, unknown> } | { ok: false; error: string }> {
	try {
		if (req.method === 'GET') {
			const url = new URL(req.url);
			const params = url.searchParams;
			if (params.has('datastar')) {
				const signals = JSON.parse(params.get('datastar')!);

				if (isRecord(signals)) {
					return { ok: true, signals };
				} else {
					return {
						ok: false,
						error: 'Datastar signals are not in the correct format. Expected a Record.',
					};
				}
			} else {
				return { ok: false, error: 'No correct datstar query parameter' };
			}
		}

		const signals = await req.json();

		if (isRecord(signals)) {
			return { ok: true, signals };
		}

		return { ok: false, error: 'Parsed JSON body is not of type record' };
	} catch {
		return { ok: false, error: 'Unknown error when parsing request' };
	}
}

export const dstar = { send, patchElements, patchSignals, executeScript, redirect, readSignals };
