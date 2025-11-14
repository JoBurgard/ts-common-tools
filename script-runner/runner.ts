// based on https://www.meziantou.net/executing-untrusted-javascript-code-in-a-browser.htm
// author of the article: Gérald Barré

export class ScriptEvaluator {
	private worker: Worker | null = null;

	private getWorker() {
		if (this.worker === null) {
			this.worker = new Worker('/public/dist/ext/ts-common-tools/script-runner/worker.js');
		}

		return this.worker;
	}

	public killWorker() {
		this.worker?.terminate();
		this.worker = null;
	}

	public evalAsync(script: string, timeout = 1000): Promise<string> {
		const worker = this.getWorker();
		return new Promise((resolve, reject) => {
			// Handle timeout
			const handle = setTimeout(() => {
				this.killWorker();
				reject('timeout');
			}, timeout);

			// Send the script to eval to the worker
			worker.postMessage([script]);

			// Handle result
			worker.onmessage = (e) => {
				clearTimeout(handle);
				resolve(e.data);
			};

			worker.onerror = (e) => {
				clearTimeout(handle);
				reject((e as any).message);
			};
		});
	}
}
