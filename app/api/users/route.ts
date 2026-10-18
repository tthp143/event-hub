import { q, init, json, me, type User, withDatabaseErrors } from '@/lib/server';

export const GET = withDatabaseErrors(async () => {
  await init();
  if ((await me())?.role !== 'ADMIN') return json({ error: 'เฉพาะ Admin' }, 403);
  return json(await q<User>`select id, username, role from users order by id`);
});
