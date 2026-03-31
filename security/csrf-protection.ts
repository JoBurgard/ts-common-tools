import type Elysia from 'elysia';

export function csrfProtection() {
	return (app: Elysia) =>
		app
			.onBeforeHandle(({ request, status }) => {
				// INFO SAFE
				// GET needs no protection, as long as all GET-endpoints are read only
				if (request.method === 'GET') {
					return;
				}

				const secFetchSite = request.headers.get('Sec-Fetch-Site');

				// INFO SAFE
				// the browser tells us, that the request comes from our site
				if (secFetchSite === 'same-origin' || secFetchSite === 'same-site') {
					return;
				}

				// INFO NOT SAFE
				// the request does not come from our site, we will not allow it
				return status(403);
			})
			.onAfterHandle(({ set }) => {
				// set Vary header to account for caching scenarios
				const current = set.headers['Vary'];

				if (current && typeof current === 'string') {
					set.headers['Vary'] = current + ', Sec-Fetch-Site';
				} else {
					set.headers['Vary'] = 'Sec-Fetch-Site';
				}
			});
}
