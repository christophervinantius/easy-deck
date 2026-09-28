import { validateSession } from './server/auth.js';

export async function handle({ event, resolve }) {
	const sessionId = event.cookies.get('session');

	if (sessionId) {
		const auth = await validateSession(sessionId);
		if (auth) {
			event.locals.user = auth.user;
			event.locals.session = auth.session;
		} else {
			event.cookies.delete('session', { path: '/' });
			event.locals.user = null;
			event.locals.session = null;
		}
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}

	return resolve(event);
}
