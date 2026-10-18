import { cookies } from 'next/headers';
import { q, init, hash, check, makeToken, json, me, type User, withDatabaseErrors } from '@/lib/server';

// ส่วนการทำงานของ GET API สำหรับตรวจสอบผู้ใช้ที่เข้าสู่ระบบ
export const GET = withDatabaseErrors(async () => json(await me()));

// ส่วนการทำงานของ POST API สำหรับเข้าสู่ระบบ สมัครสมาชิก และออกจากระบบ
export const POST = withDatabaseErrors(async (req: Request, { params }: { params: Promise<{ action: string }> }) => {
  const { action } = await params;
  const jar = await cookies();
  if (action === 'logout') { jar.delete('t'); return json({ ok: 1 }); }
  const b = await req.json().catch(() => ({}));
  const u = String(b.username || '').trim(), p = String(b.password || '');
  const set = (x: User) => {
    jar.set('t', makeToken(x.id), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 604800 });
    return json(x);
  };
  if (action === 'login') {
    if (u === process.env.ADMIN_USERNAME && p === process.env.ADMIN_PASSWORD) return set({ id: 0, username: u, role: 'ADMIN' });
    await init();
    const [r] = await q<User & { hash: string }>`select * from users where username=${u}`;
    if (!r || !check(p, r.hash)) return json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, 401);
    return set({ id: r.id, username: r.username, role: r.role });
  }
  if (action === 'register') {
    if (!/^\w{3,20}$/.test(u)) return json({ error: 'ชื่อผู้ใช้ 3-20 ตัว (a-z, 0-9, _)' }, 400);
    if (p.length < 6) return json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว' }, 400);
    if (u === process.env.ADMIN_USERNAME) return json({ error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' }, 409);
    await init();
    try {
      const [r] = await q<User>`insert into users(username, hash) values(${u}, ${hash(p)}) returning id, username, role`;
      return set(r);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        return json({ error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' }, 409);
      }
      throw error;
    }
  }
  return json({ error: 'not found' }, 404);
});
