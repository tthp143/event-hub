import { q, init, json, me, type User, withDatabaseErrors } from '@/lib/server';

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withDatabaseErrors(async (req: Request, { params }: Ctx) => {
  await init();
  if ((await me())?.role !== 'ADMIN') return json({ error: 'เฉพาะ Admin' }, 403);
  const { role } = await req.json().catch(() => ({}));
  if (!['USER', 'CREATOR'].includes(role)) return json({ error: 'ยศไม่ถูกต้อง' }, 400);
  const [r] = await q<User>`update users set role=${role} where id=${Number((await params).id)} returning id, username, role`;
  return r ? json(r) : json({ error: 'ไม่พบผู้ใช้' }, 404);
});

export const DELETE = withDatabaseErrors(async (_: Request, { params }: Ctx) => {
  await init();
  if ((await me())?.role !== 'ADMIN') return json({ error: 'เฉพาะ Admin' }, 403);
  const id = Number((await params).id);
  await q`delete from joins where user_id=${id}`;
  await q`delete from users where id=${id}`;
  return json({ ok: 1 });
});
