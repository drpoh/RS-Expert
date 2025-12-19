export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Защищаем только /admin
  if (url.pathname.startsWith('/admin')) {
    const auth = request.headers.get('Authorization');

    // >>> ИЗМЕНИ ЗДЕСЬ <<<
    const USER = 'adminDr';
    const PASS = 'D555r777'; // придумай свой

    if (!auth || !auth.startsWith('Basic ')) {
      return new Response('Auth required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="RS-Expert Admin"'
        }
      });
    }

    const decoded = atob(auth.split(' ')[1] || '');
    const [user, pass] = decoded.split(':');

    if (user !== USER || pass !== PASS) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  return next();
}
