'use client';
import { useEffect, useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { EventRow, User } from '@/lib/server';

const CATS = ['คอม/ไอที', 'วิศวกรรม', 'พัฒนาทักษะ/เวิร์กชอป', 'กิจกรรมออนไลน์', 'อื่นๆ'];
const ROLE = { ADMIN: 'Admin', CREATOR: 'Event Creator', USER: 'User' };
const formData = (e: FormEvent<HTMLFormElement>) => Object.fromEntries(new FormData(e.currentTarget));

export default function Home() {
  const [user, setUser] = useState<User | null>(null), [ev, setEv] = useState<EventRow[]>([]);
  const [q, setQ] = useState(''), [mode, setMode] = useState(''), [cat, setCat] = useState('');
  const [auth, setAuth] = useState<'login' | 'register' | null>(null);
  const [form, setForm] = useState<Partial<EventRow> | null>(null), [err, setErr] = useState('');

  const load = useCallback(
    () => api<EventRow[]>(`/api/events?${new URLSearchParams({ q, mode, category: cat })}`).then(setEv).catch(e => setErr(e.message)),
    [q, mode, cat]);
  useEffect(() => { api<User | null>('/api/auth/me').then(setUser); }, []);
  useEffect(() => { load(); }, [load, user]);

  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr('');
    void load();
  };
  const run = async (f: () => Promise<unknown>) => { setErr(''); try { await f(); await load(); } catch (e) { setErr((e as Error).message); } };
  const save = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const d = formData(e); run(async () => { await api(form?.id ? `/api/events/${form.id}` : '/api/events', form?.id ? 'PUT' : 'POST', d); setForm(null); }); };
  const sign = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const d = formData(e); run(async () => { setUser(await api<User>(`/api/auth/${auth}`, 'POST', d)); setAuth(null); }); };
  const out = () => run(async () => { await api('/api/auth/logout', 'POST'); setUser(null); });
  const canPost = user && user.role !== 'USER';

  return (
    <main>
      <header>
        <h1>Event Hub</h1>
        <div className="row">
          {user ? <>
            <span>{user.username} <span className="tag">{ROLE[user.role]}</span></span>
            {user.role === 'ADMIN' && <Link href="/dashboard"><button>Dashboard</button></Link>}
            {canPost && <button className="pri" onClick={() => setForm({})}>เพิ่มกิจกรรม</button>}
            <button onClick={out}>ออกจากระบบ</button>
          </> : <>
            <button onClick={() => setAuth('login')}>เข้าสู่ระบบ</button>
            <button className="pri" onClick={() => setAuth('register')}>สมัครสมาชิก</button>
          </>}
        </div>
      </header>

      <form className="row" onSubmit={search}>
        <input placeholder="ค้นหากิจกรรม ผู้จัด..." value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select value={mode} onChange={e => setMode(e.target.value)}><option value="">ทุกรูปแบบ</option><option>ออนไลน์</option><option>ออนไซต์</option></select>
        <select value={cat} onChange={e => setCat(e.target.value)}><option value="">ทุกหมวด</option>{CATS.map(c => <option key={c}>{c}</option>)}</select>
        <button type="submit" className="pri">ค้นหา</button>
      </form>
      {err && <p className="err">{err}</p>}

      <div className="grid">
        {ev.map(e => (
          <article className="card" key={e.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {e.image ? <img src={e.image} alt={e.title} loading="lazy" /> : <div className="ph" />}
            <div className="body">
              <span className="by">จัดโดย {e.organizer}</span>
              <h3>{e.title}</h3>
              <p className="desc">{e.description}</p>
              <div className="tags">
                <span className="tag dark">{e.mode}</span>
                {e.category && <span className="tag">{e.category}</span>}
                <span className="tag">{e.price ? `${e.price} บาท` : 'ฟรี'}</span>
                <span className="tag">สมัครแล้ว {e.joined} คน</span>
              </div>
              <div className="acts">
                {!user ? <button onClick={() => setAuth('login')}>เข้าสู่ระบบเพื่อสมัคร</button>
                  : user.id !== 0 && <button className={e.mine ? '' : 'pri'} onClick={() => run(() => api(`/api/events/${e.id}/join`, e.mine ? 'DELETE' : 'POST'))}>{e.mine ? 'ยกเลิกการสมัคร' : 'สมัครเข้าร่วม'}</button>}
                {user && (user.role === 'ADMIN' || e.owner_id === user.id) && <>
                  <button onClick={() => setForm(e)}>แก้ไข</button>
                  <button className="bad" onClick={() => confirm('ลบกิจกรรมนี้?') && run(() => api(`/api/events/${e.id}`, 'DELETE'))}>ลบ</button>
                </>}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!ev.length && <p>ยังไม่มีกิจกรรมที่ตรงกับการค้นหา</p>}

      {auth && <div className="modal" onClick={() => setAuth(null)}><form onSubmit={sign} onClick={e => e.stopPropagation()}>
        <h3>{auth === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h3>
        <input name="username" placeholder="ชื่อผู้ใช้" required /><input name="password" type="password" placeholder="รหัสผ่าน" required />
        {err && <span className="err">{err}</span>}
        <button className="pri">{auth === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</button>
      </form></div>}

      {form && <div className="modal" onClick={() => setForm(null)}><form onSubmit={save} onClick={e => e.stopPropagation()}>
        <h3>{form.id ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรม'}</h3>
        <input name="title" placeholder="ชื่อกิจกรรม" defaultValue={form.title} required />
        <textarea name="description" placeholder="รายละเอียด" defaultValue={form.description} required />
        <input name="image" placeholder="ลิงก์รูปภาพ (https://...)" defaultValue={form.image} />
        <input name="organizer" placeholder="ผู้จัด" defaultValue={form.organizer} />
        <div className="row">
          <select name="mode" defaultValue={form.mode || 'ออนไลน์'}><option>ออนไลน์</option><option>ออนไซต์</option></select>
          <select name="category" defaultValue={form.category}><option value="">หมวดหมู่</option>{CATS.map(c => <option key={c}>{c}</option>)}</select>
          <input name="price" type="number" min="0" placeholder="ราคา (0 = ฟรี)" defaultValue={form.price ?? 0} style={{ width: 130 }} />
        </div>
        {err && <span className="err">{err}</span>}
        <button className="pri">บันทึก</button>
      </form></div>}
    </main>
  );
}
