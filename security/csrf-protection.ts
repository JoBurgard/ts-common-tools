import type Elysia from 'elysia';

/**
 * Adds CSRF Protection via the 'Sec-Fetch-Site' header.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
 */
export function csrfProtection() {
	return (app: Elysia) =>
		app.onBeforeHandle(({ request, status }) => {
			// INFO SAFE
			// GET needs no protection, as long as all GET-endpoints are read only
			if (request.method === 'GET') {
				return;
			}

			const secFetchSite = request.headers.get('Sec-Fetch-Site');

			// INFO SAFE
			// the browser tells us, that the request comes from our site
			if (secFetchSite === 'same-origin') {
				return;
			}

			// INFO NOT SAFE
			// the request does not come from our site, we will not allow it
			return status(403);
		});

	// WARNING Unfortunately this breaks the elysia static plugin, so it is commented out for now
	// it should not be a security concern

	// .onAfterHandle(({ set }) => {
	// 	// set Vary header to account for caching scenarios
	// 	const current = set.headers['vary'];
	//
	// 	if (current && typeof current === 'string') {
	// 		set.headers['vary'] = current + ', Sec-Fetch-Site';
	// 	} else {
	// 		set.headers['something'] = 'Sec-Fetch-Site';
	// 	}
	// });
}
