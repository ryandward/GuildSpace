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
    // demoData returns null both for blocked writes and for reads it has no
    // canned response for. Only the former is the user's doing — telling
    // someone to "log in to make changes" when they only loaded a page is a
    // lie about what they did.
    if (method === 'GET') throw new ApiError(404, 'Not available in the demo');
    throw new ApiError(403, 'Log in to make changes');
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    let message = `Request failed: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* ignore parse failures */ }
    throw new ApiError(res.status, message);
  }
  return res.json();
}
