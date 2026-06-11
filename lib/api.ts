export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET || "";
  headers.set("x-admin-secret", secret);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  return res;
}
