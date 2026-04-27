import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url);

  // Only log API routes, skip static assets and pagefind
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/tts/r2/')) {
    return next();
  }

  const start = Date.now();
  const response = await next();
  const ms = Date.now() - start;

  // Fire-and-forget: write to D1 logs (don't await, don't block response)
  const db = context.locals.runtime?.env?.DB;
  if (db) {
    const message = `${context.request.method} ${pathname} ${response.status} ${ms}ms`;
    db.prepare(
      `INSERT INTO logs (level, source, message, created_at) VALUES (?, ?, ?, datetime('now'))`
    )
      .bind(
        response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info',
        pathname.replace(/^\/api\//, '').split('/')[0],
        message
      )
      .run()
      .catch(() => {});
  }

  return response;
});
