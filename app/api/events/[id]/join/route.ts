import { q, init, json, me, withDatabaseErrors } from '@/lib/server';

type Ctx = { params: Promise<{ id: string }> };

async function act(params: Ctx['params'], join: boolean) {
  await init();
  const u = await me();
  if (!u || u.id === 0) return json({ error: 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ใช้' }, 401);
  const id = Number((await params).id);
  if (join) await q`insert into joins(user_id,event_id) values(${u.id},${id}) on conflict do nothing`;
  else await q`delete from joins where user_id=${u.id} and event_id=${id}`;
  return json({ ok: 1 });
}
export const POST = withDatabaseErrors((_: Request, { params }: Ctx) => act(params, true));
export const DELETE = withDatabaseErrors((_: Request, { params }: Ctx) => act(params, false));
