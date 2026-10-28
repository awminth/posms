const API_BASE = '/api';

const ACTOR_KEY = 'omnipos_actor';

export type ActorInfo = {
  userId: string;
  fullName: string;
  username: string;
  role: string;
  branchId: string;
};

export function setApiActor(actor: ActorInfo | null) {
  if (typeof window === 'undefined') return;
  if (!actor) {
    localStorage.removeItem(ACTOR_KEY);
    sessionStorage.removeItem(ACTOR_KEY);
    return;
  }
  const payload = JSON.stringify(actor);
  localStorage.setItem(ACTOR_KEY, payload);
  sessionStorage.setItem(ACTOR_KEY, payload);
}

function getActorHeaders(): Record<string, string> {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(ACTOR_KEY) || sessionStorage.getItem(ACTOR_KEY);
    if (!raw) return {};
    const a = JSON.parse(raw) as ActorInfo;
    return {
      'X-Actor-Id': a.userId || '',
      'X-Actor-Name': a.fullName || '',
      'X-Actor-Username': a.username || '',
      'X-Actor-Role': a.role || '',
      'X-Actor-Branch-Id': a.branchId || '',
    };
  } catch {
    return {};
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getActorHeaders(),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok || body?.success === false) {
    throw new ApiError(
      body?.error || body?.message || `Request failed (${res.status})`,
      res.status
    );
  }

  return (body?.data !== undefined ? body.data : body) as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
