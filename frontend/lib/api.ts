import { useAuthStore } from "./authStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_BASE_URL) {
  // Fail loud at import time rather than sending requests to `undefined/...`.
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

// Mirrors the backend's error envelope: { error: { code, message, details? } }.
interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

// The single error type every caller catches. Callers switch on `code`/`status`,
// never on response shape.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Thrown when the request never reached the server (backend down, offline,
// DNS/connection failure). Distinct from ApiError, which is a real HTTP
// response — so callers can tell "couldn't connect" apart from "server said no".
export class NetworkError extends Error {
  constructor(message = "Could not reach the server") {
    super(message);
    this.name = "NetworkError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  // The /api/me hydration call and the login call set this: a 401 from them is
  // expected (no/expired token, or wrong credentials) and must NOT trigger the
  // global logout+redirect, or hydration/login 401s would loop.
  skip401Handler?: boolean;
}

async function toApiError(res: Response): Promise<ApiError> {
  let code = "UNKNOWN";
  let message = res.statusText || "Request failed";
  let details: unknown;
  try {
    // An error response might not be JSON (proxy 502, empty body); parsing is
    // genuinely optional here, so a failed parse falls back to the status line.
    const body = (await res.json()) as Partial<ApiErrorBody>;
    if (body.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      details = body.error.details;
    }
  } catch {
    // non-JSON body — keep the defaults above
  }
  return new ApiError(res.status, code, message, details);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skip401Handler, body, headers, ...rest } = options;
  const token = useAuthStore.getState().token;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch() rejects only when the request never completed — connection
    // refused (backend down), offline, DNS/CORS failure. The server was never
    // reached, so this is a network problem, not an API error.
    throw new NetworkError();
  }

  if (res.status === 401 && !skip401Handler) {
    // Token missing/expired mid-session: clear it and bounce to login. The
    // mount-time route guard only checks on navigation, so this catches expiry.
    useAuthStore.getState().logout();
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
    throw await toApiError(res);
  }

  if (!res.ok) {
    throw await toApiError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
};
