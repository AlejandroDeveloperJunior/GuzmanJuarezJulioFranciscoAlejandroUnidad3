export interface ApiRequestOptions extends RequestInit {
  token?: string | null;
  csrfToken?: string | null;
  apiKey?: string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { token, csrfToken, apiKey, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (rest.body && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }
  if (csrfToken) {
    finalHeaders['X-CSRF-Token'] = csrfToken;
  }
  if (apiKey) {
    finalHeaders['X-API-Key'] = apiKey;
  }

  const res = await fetch(path, {
    credentials: 'include',
    ...rest,
    headers: finalHeaders,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'message' in data
        ? Array.isArray((data as { message: unknown }).message)
          ? (data as { message: string[] }).message.join(', ')
          : String((data as { message: string }).message)
        : `Error HTTP ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }

  return data as T;
}
