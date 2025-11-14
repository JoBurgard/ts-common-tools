onmessage = (e) => {
	const data: string = e.data[0];
	let workerResult = null;
	const scriptFunction = new Function(data);
	(() => {
		// eslint-disable-next-line
		var e = null;
		workerResult = scriptFunction();
	})();

	self.postMessage(workerResult);
};
