export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function authFetch<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  if (token === 'demo') {
    const { getDemoResponse } = await import('./demoData.js');
    const method = init?.method ?? 'GET';
    const data = getDemoResponse(url, method);
    if (data !== null) return data as T;
    throw new ApiError(403, 'Log in to make changes');
  }

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
