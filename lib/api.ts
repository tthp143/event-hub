export async function api<T = unknown>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let d: unknown = null;
  try {
    d = await r.json();
  } catch {
    // Use the HTTP status below when the server response is not JSON.
  }
  if (!r.ok) {
    const message = typeof d === 'object' && d !== null && 'error' in d && typeof d.error === 'string'
      ? d.error
      : `เซิร์ฟเวอร์ตอบกลับข้อผิดพลาด (HTTP ${r.status})`;
    throw new Error(message);
  }
  return d as T;
}
