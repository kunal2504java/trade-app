export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown; headers?: Record<string, string> }): Promise<T> {
  const token = getAuthToken();

  const res = await fetch(path, {
    method: init?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data?.error?.message || data?.error || data?.message || message;
    } catch {}
    throw new Error(message);
  }

  try {
    return (await res.json()) as T;
  } catch (e) {
    // If the response body is empty, return an empty object.
    return {} as T;
  }
}

