const rgxAuthResults = /Authentication-Results:((?:.|\n)*?)\n(?!\s)/;
const rgxReturnPath = /Return-Path:.*?<(.*?)>\n(?!\s)/;
const rgxFrom = /From:.*?<(.*?)>\n(?!\s)/;
/**
 * Checks SPF, DKIM and DMARC headers and if From and Return-Path match.
 * Additionally the From has to match the allowed sender Adresses.
 * @returns - true if trusted, otherwise false
 */
export function emailSenderIsTrusted(emailHeaders: string, allowedList: RegExp[]): boolean {
	const authResults = rgxAuthResults.exec(emailHeaders)?.[1];
	if (!authResults) {
		return false;
	}

	// prettier ignore
	if (
		authResults.includes('spf=fail') ||
		authResults.includes('dkim=fail') ||
		authResults.includes('dmarc=fail')
	) {
		return false;
	}

	const returnPath = rgxReturnPath.exec(emailHeaders)?.[1];
	const from = rgxFrom.exec(emailHeaders)?.[1];
	if (!returnPath || !from) {
		return false;
	}

	for (const rgxAllowed of allowedList) {
		if (rgxAllowed.test(from)) {
			return true;
		}
	}

	return false;
}

const rgxMailHeader = /(.*?): ((?:.|\s)*?)\n(?!\s)/g;
export function emailHeadersToRecord(emailHeadersText: string): Record<string, string | string[]> {
	const record: Record<string, string | string[]> = {};
	let res: RegExpExecArray | null;
	while ((res = rgxMailHeader.exec(emailHeadersText)) !== null) {
		if (!res[1] || !res[2]) {
			continue;
		}
		// When a key occurs more than once, we put it into an array
		if (record[res[1]]) {
			if (typeof record[res[1]] === 'string') {
				record[res[1]] = [record[res[1]] as string];
			}
			(record[res[1]]! as string[]).push(res[2]);
		}
		record[res[1]] = res[2];
	}
	return record;
}
