import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { connection } from 'next/server';

export type Role = 'ADMIN' | 'CREATOR' | 'USER';
export type User = { id: number; username: string; role: Role };
export type EventRow = {
  id: number; title: string; description: string; image: string; organizer: string;
  price: number; mode: string; category: string; owner_id: number; joined: number; mine: boolean;
};
type Tag = (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown[]>;

let _sql: Tag | undefined;
export class DatabaseConfigurationError extends Error {
  constructor() {
    super('DATABASE_URL ยังเป็นค่าว่างหรือค่าตัวอย่าง กรุณาใส่ connection string จริงจาก Neon/PostgreSQL ในไฟล์ .env.local แล้วเริ่มเซิร์ฟเวอร์ใหม่');
    this.name = 'DatabaseConfigurationError';
  }
}

export function withDatabaseErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof DatabaseConfigurationError) {
        return json({ error: error.message }, 503);
      }
      throw error;
    }
  };
}

export const q = <T>(s: TemplateStringsArray, ...v: unknown[]) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new DatabaseConfigurationError();
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new DatabaseConfigurationError();
  }
  const placeholders = new Set(['user', 'username', 'password', 'host', 'database', 'db']);
  const path = url.pathname.split('/').filter(Boolean);
  let parts: string[];
  try {
    parts = [url.hostname, url.username, url.password, ...path].map((part) =>
      decodeURIComponent(part).toLowerCase(),
    );
  } catch {
    throw new DatabaseConfigurationError();
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    !url.password ||
    path.length === 0 ||
    parts.some((part) => placeholders.has(part) || part === 'paste_your_neon_connection_string_here')
  ) {
    throw new DatabaseConfigurationError();
  }
  return (((_sql ||= neon(databaseUrl) as unknown as Tag))(s, ...v)) as Promise<T[]>;
};

export const json = (d: unknown, status = 200) => Response.json(d, { status });
const SECRET = process.env.AUTH_SECRET || 'dev-secret';

let ready: Promise<void> | undefined;
export const init = async () => {
  await connection();
  ready ||= (async () => {
    await q`create table if not exists users(id serial primary key, username text unique not null, hash text not null, role text not null default 'USER')`;
    await q`create table if not exists events(id serial primary key, title text not null, description text not null, image text, organizer text, price int default 0, mode text default 'ออนไลน์', category text, owner_id int, created_at timestamptz default now())`;
    await q`create table if not exists joins(user_id int, event_id int references events(id) on delete cascade, primary key(user_id, event_id))`;
  })();
  try {
    await ready;
  } catch (error) {
    ready = undefined;
    throw error;
  }
};

export const hash = (p: string, salt = crypto.randomBytes(8).toString('hex')) =>
  salt + ':' + crypto.scryptSync(p, salt, 32).toString('hex');
export const check = (p: string, h: string) => {
  const a = Buffer.from(hash(p, h.split(':')[0])), b = Buffer.from(h);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const sig = (v: string) => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
export const makeToken = (id: number) => `${id}.${sig(String(id))}`;

// Admin (id 0) มาจาก env, คนอื่นดึงยศล่าสุดจาก DB
export async function me(): Promise<User | null> {
  const c = (await cookies()).get('t')?.value;
  const [id, s] = (c || '').split('.');
  if (!id || s !== sig(id)) return null;
  if (id === '0') return { id: 0, username: process.env.ADMIN_USERNAME || 'admin', role: 'ADMIN' };
  return (await q<User>`select id, username, role from users where id=${Number(id)}`)[0] ?? null;
}

export function validate(b: Record<string, unknown>) {
  const t = (s: unknown) => String(s ?? '').trim();
  const d = { title: t(b.title), description: t(b.description), image: t(b.image), organizer: t(b.organizer), category: t(b.category), mode: t(b.mode) || 'ออนไลน์', price: Number(b.price || 0) };
  const error =
    d.title.length < 3 || d.title.length > 120 ? 'ชื่อกิจกรรมต้องยาว 3-120 ตัวอักษร' :
    d.description.length < 10 ? 'รายละเอียดต้องมีอย่างน้อย 10 ตัวอักษร' :
    d.image && !/^https?:\/\//.test(d.image) ? 'ลิงก์รูปต้องขึ้นต้นด้วย http:// หรือ https://' :
    !['ออนไลน์', 'ออนไซต์'].includes(d.mode) ? 'รูปแบบต้องเป็นออนไลน์หรือออนไซต์' :
    !Number.isInteger(d.price) || d.price < 0 ? 'ราคาต้องเป็นจำนวนเต็มตั้งแต่ 0' : '';
  return { error, d };
}
