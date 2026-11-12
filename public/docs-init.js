window.addEventListener('load', async function () {
  const specResponse = await fetch('/api/openapi', { cache: 'no-store' });
  const tokenResponse = await fetch('/api/auth/csrf', {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!specResponse.ok || !tokenResponse.ok) {
    document.getElementById('swagger-ui').textContent =
      'Unable to load the API reference. Please reload this page.';
    return;
  }
  const spec = await specResponse.json();
  const { csrfToken } = await tokenResponse.json();
  // Pre-fill required header fields in this UI only. The raw OpenAPI contract
  // retains its required header without a fake default. The interceptor below
  // refreshes the token before each mutation, including after a login rotation.
  for (const path of Object.values(spec.paths)) {
    for (const operation of Object.values(path)) {
      for (const parameter of operation.parameters || []) {
        if (parameter.in === 'header' && parameter.name === 'X-CSRF-Token') {
          parameter.schema.default = csrfToken;
          parameter.description =
            'Required by the API. Swagger fills and refreshes this token automatically.';
        }
      }
    }
  }
  window.ui = SwaggerUIBundle({
    spec: spec,
    dom_id: '#swagger-ui',
    deepLinking: true,
    validatorUrl: null,
    persistAuthorization: false,
    withCredentials: true,
    requestInterceptor: async function (request) {
      const target = new URL(request.url, window.location.origin);
      if (target.origin !== window.location.origin)
        throw new Error('Only this application origin is supported.');
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((request.method || 'GET').toUpperCase())) {
        const response = await fetch('/api/auth/csrf', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Unable to obtain a CSRF token.');
        const body = await response.json();
        request.headers['X-CSRF-Token'] = body.csrfToken;
      }
      return request;
    },
  });
});
