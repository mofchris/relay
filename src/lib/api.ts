// HTTP client for the Relay API. The app and the API share an origin, so every
// call is a relative /api path. The session token lives in localStorage and is
// sent as a Bearer token.

import type {
  AdRequest,
  ApiErrorBody,
  AuthResponse,
  Campaign,
  DeliveriesPage,
  Delivery,
  PreviewResponse,
  User,
} from "@shared/contract.ts";

const TOKEN_KEY = "relay.session";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked (private mode): the session lasts until reload.
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError("NETWORK", "Could not reach the Relay API. Check your connection and try again.", 0);
  }

  const data = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ApiError(
      error?.code ?? `HTTP_${res.status}`,
      error?.message ?? "The API returned an error. Try again in a moment.",
      res.status,
    );
  }
  return data as T;
}

export const api = {
  guest: () => call<AuthResponse>("POST", "/api/auth/guest"),
  login: (email: string, password: string) => call<AuthResponse>("POST", "/api/auth/login", { email, password }),
  signup: (email: string, password: string, name: string) =>
    call<AuthResponse>("POST", "/api/auth/signup", { email, password, name }),
  me: () => call<{ user: User }>("GET", "/api/me"),
  campaigns: () => call<{ campaigns: Campaign[] }>("GET", "/api/campaigns"),
  preview: (slot: PreviewResponse["request"]) =>
    call<PreviewResponse>("GET", `/api/auction/preview?${new URLSearchParams(slot)}`),
  serve: (request: AdRequest) => call<Delivery>("POST", "/api/deliveries", request),
  deliveries: () => call<DeliveriesPage>("GET", "/api/deliveries"),
};

export const messageOf = (error: unknown) =>
  error instanceof ApiError ? error.message : "Something went wrong. Try again in a moment.";
