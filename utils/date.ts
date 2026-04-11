export function dateFormatEuropeanDateTime(date: Date) {
	let res = String(date.getDate()).padStart(2, '0');
	res += '.' + String(date.getMonth() + 1).padStart(2, '0');
	res += '.' + String(date.getMonth() + 1).padStart(2, '0');
	res += '.' + String(date.getFullYear()).slice(-2);
	res += ', ' + String(date.getHours()).padStart(2, '0');
	res += ':' + String(date.getMinutes()).padStart(2, '0');
	res += ':' + String(date.getSeconds()).padStart(2, '0');

	return res;
}
