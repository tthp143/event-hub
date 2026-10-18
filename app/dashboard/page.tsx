'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { User } from '@/lib/server';

// ส่วนแสดง Dashboard สำหรับจัดการบทบาทและบัญชีผู้ใช้โดย Admin
export default function Dashboard() {
  const [me, setMe] = useState<User | null | undefined>(), [rows, setRows] = useState<User[]>([]), [err, setErr] = useState('');
  // ส่วนโหลดรายชื่อผู้ใช้
  const load = () => api<User[]>('/api/users').then(setRows).catch(e => setErr(e.message));
  useEffect(() => { api<User | null>('/api/auth/me').then(u => { setMe(u); if (u?.role === 'ADMIN') load(); }); }, []);
  // ส่วนดำเนินการกับผู้ใช้และโหลดข้อมูลใหม่
  const act = (f: () => Promise<unknown>) => f().then(load).catch(e => setErr(e.message));

  if (me === undefined) return <main />;
  if (me?.role !== 'ADMIN') return <main><p>หน้านี้สำหรับ Admin เท่านั้น</p><Link href="/">กลับหน้าแรก</Link></main>;
  return (
    <main>
      <header><h1>Dashboard — จัดการยศผู้ใช้</h1><Link href="/"><button>กลับหน้าแรก</button></Link></header>
      {err && <p className="err">{err}</p>}
      <table>
        <thead><tr><th>ชื่อผู้ใช้</th><th>ยศ</th><th></th></tr></thead>
        <tbody>{rows.map(u => (
          <tr key={u.id}><td>{u.username}</td>
            <td><select value={u.role} onChange={e => act(() => api(`/api/users/${u.id}`, 'PUT', { role: e.target.value }))}>
              <option value="USER">User</option><option value="CREATOR">Event Creator</option></select></td>
            <td><button className="bad" onClick={() => confirm(`ลบ ${u.username}?`) && act(() => api(`/api/users/${u.id}`, 'DELETE'))}>ลบ</button></td></tr>
        ))}</tbody>
      </table>
      {!rows.length && <p>ยังไม่มีผู้ใช้สมัครเข้ามา</p>}
    </main>
  );
}
