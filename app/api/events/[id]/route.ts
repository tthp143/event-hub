import { q, init, json, me, validate, type EventRow, withDatabaseErrors } from '@/lib/server';

type Ctx = { params: Promise<{ id: string }> };

async function guard(params: Ctx['params']) {
  await init();
  const id = Number((await params).id);
  const u = await me();
  if (!u) return { res: json({ error: 'กรุณาเข้าสู่ระบบ' }, 401) };
  const [e] = await q<EventRow>`select * from events where id=${id}`;
  if (!e) return { res: json({ error: 'ไม่พบกิจกรรม' }, 404) };
  if (u.role !== 'ADMIN' && e.owner_id !== u.id) return { res: json({ error: 'ไม่มีสิทธิ์' }, 403) };
  return { id };
}

export const GET = withDatabaseErrors(async (_: Request, { params }: Ctx) => {
  await init();
  const [e] = await q<EventRow>`select * from events where id=${Number((await params).id)}`;
  return e ? json(e) : json({ error: 'ไม่พบกิจกรรม' }, 404);
});

export const PUT = withDatabaseErrors(async (req: Request, { params }: Ctx) => {
  const g = await guard(params);
  if (g.res) return g.res;
  const { error, d } = validate(await req.json().catch(() => ({})));
  if (error) return json({ error }, 400);
  const [r] = await q<EventRow>`update events set title=${d.title}, description=${d.description}, image=${d.image}, organizer=${d.organizer},
    price=${d.price}, mode=${d.mode}, category=${d.category} where id=${g.id} returning *`;
  return json(r);
});

export const DELETE = withDatabaseErrors(async (_: Request, { params }: Ctx) => {
  const g = await guard(params);
  if (g.res) return g.res;
  await q`delete from events where id=${g.id}`;
  return json({ ok: 1 });
});
