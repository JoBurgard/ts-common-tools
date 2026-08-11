const rgxAuthResults = /Authentication-Results:((?:.|\r\n)*?)\r\n(?!\s)/;
const rgxReturnPath = /Return-Path:.*?<(.*?)>\r\n(?!\s)/;
const rgxFrom = /From:.*?<(.*?)>\r\n(?!\s)/;
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

const rgxMailHeader = /(.*?): ((?:.|\s)*?)\r\n(?!\s)/g;
export function emailHeadersToRecord(emailHeadersText: string): Record<string, string | string[]> {
	const record: Record<string, string | string[]> = {};
	let res: RegExpExecArray | null;
	while ((res = rgxMailHeader.exec(emailHeadersText)) !== null) {
		if (!res[1] || !res[2]) {
			continue;
		}
		const key = res[1].toLowerCase();
		const value = res[2].trim();
		// When a key occurs more than once, we put it into an array
		if (record[key]) {
			if (typeof record[key] === 'string') {
				record[key] = [record[key] as string];
			}
			(record[key]! as string[]).push(value);
		}
		record[key] = value;
	}
	return record;
}
