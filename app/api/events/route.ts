import { q, init, json, me, validate, withDatabaseErrors, type EventRow } from '@/lib/server';

export const GET = withDatabaseErrors(async (req: Request) => {
  await init();
  const sp = new URL(req.url).searchParams;
  const s = '%' + (sp.get('q') || '') + '%', mode = sp.get('mode') || '', cat = sp.get('category') || '';
  const u = await me();
  const rows = await q<EventRow>`select e.*, (select count(*)::int from joins j where j.event_id=e.id) as joined,
    exists(select 1 from joins j where j.event_id=e.id and j.user_id=${u?.id ?? -1}) as mine
    from events e where (e.title ilike ${s} or e.description ilike ${s} or e.organizer ilike ${s})
    and (${mode}='' or e.mode=${mode}) and (${cat}='' or e.category=${cat}) order by e.id desc`;
  return json(rows);
});

export const POST = withDatabaseErrors(async (req: Request) => {
  await init();
  const u = await me();
  if (!u) return json({ error: 'กรุณาเข้าสู่ระบบ' }, 401);
  if (u.role === 'USER') return json({ error: 'ต้องได้รับสิทธิ์ Event Creator จาก Admin ก่อน' }, 403);
  const { error, d } = validate(await req.json().catch(() => ({})));
  if (error) return json({ error }, 400);
  const [r] = await q<EventRow>`insert into events(title,description,image,organizer,price,mode,category,owner_id)
    values(${d.title},${d.description},${d.image},${d.organizer || u.username},${d.price},${d.mode},${d.category},${u.id}) returning *`;
  return json(r, 201);
});
