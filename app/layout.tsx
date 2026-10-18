import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Event Hub — รวมกิจกรรมและค่าย', description: 'ค้นหาและสมัครเข้าร่วมกิจกรรม' };

// ส่วนกำหนดโครงหน้าเว็บและภาษาหลักของแอป
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
