type AuthContext = {
  role: "ADMIN" | "AGENT" | "REQUESTER";
  userName: string;
};

let authContext: AuthContext = {
  role: "ADMIN",
  userName: "demo-admin"
};

export function setAuthContext(next: AuthContext) {
  authContext = next;
}

export function getAuthHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "x-role": authContext.role,
    "x-user": authContext.userName,
    ...(extra ?? {})
  };
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(init?.headers)
    },
    ...init
  });

  if (!response.ok) {
    const fallback = `HTTP ${response.status}`;
    let message = fallback;
    try {
      const err = (await response.json()) as { message?: string };
      if (err.message) {
        message = err.message;
      }
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
