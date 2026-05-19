import type { APIRoute } from 'astro';

function requireAdmin(request: Request, adminToken: string | undefined): boolean {
  const token = new URL(request.url).searchParams.get('token');
  return !!adminToken && token === adminToken;
}

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  const { DB, ADMIN_TOKEN } = locals.runtime.env as { DB: D1Database; ADMIN_TOKEN?: string };
  if (!requireAdmin(request, ADMIN_TOKEN)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) return Response.json({ error: 'Invalid id' }, { status: 400 });

  const body = await request.json() as { hidden?: number };
  if (body.hidden !== 0 && body.hidden !== 1) {
    return Response.json({ error: 'hidden must be 0 or 1' }, { status: 400 });
  }

  await DB.prepare('UPDATE comments SET hidden = ? WHERE id = ?').bind(body.hidden, id).run();
  return Response.json({ ok: true, id, hidden: body.hidden });
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const { DB, ADMIN_TOKEN } = locals.runtime.env as { DB: D1Database; ADMIN_TOKEN?: string };
  if (!requireAdmin(request, ADMIN_TOKEN)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) return Response.json({ error: 'Invalid id' }, { status: 400 });

  await DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
  return Response.json({ ok: true, id });
};
