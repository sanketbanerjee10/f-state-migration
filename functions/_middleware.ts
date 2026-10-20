/**
 * Cloudflare Pages Function — API Proxy Middleware
 *
 * Proxies all /api/* requests to the API server defined by the
 * API_SERVER_URL environment variable set in Cloudflare Pages settings.
 *
 * Set API_SERVER_URL in: Cloudflare Dashboard → Pages → Project → Settings → Environment Variables
 */
export const onRequest: PagesFunction = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Only proxy /api/* paths — let all other requests pass through to static assets
  if (!url.pathname.startsWith('/api/')) {
    return next();
  }

  const apiServerUrl = (env as Record<string, string>).API_SERVER_URL;
  if (!apiServerUrl) {
    return new Response(
      JSON.stringify({
        error: 'API_SERVER_URL environment variable is not configured in Cloudflare Pages settings.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Build the target URL on the API server
  const targetUrl = `${apiServerUrl.replace(/\/+$/, '')}${url.pathname}${url.search}`;

  // Forward the original request headers (preserves auth tokens, content-type, etc.)
  const proxiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  });

  try {
    const response = await fetch(proxiedRequest);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: 'Failed to reach API server', detail: message }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
