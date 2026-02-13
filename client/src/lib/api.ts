export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function authFetch<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new ApiError(res.status, `Request failed: ${res.statusText}`);
  return res.json();
}
