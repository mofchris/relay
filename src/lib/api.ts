// API client for Relay. Talks to the Relay API server (see /server).
//
// The base URL defaults to http://localhost:8787 for local development and can
// be overridden with VITE_API_URL (e.g. for a deployed backend). Auth uses a
// JWT stored in localStorage and sent as a Bearer token on protected calls.

import type { AdRequest, DeliveryResponse, SavedDeliveryRecord } from "./types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8787").replace(/\/$/, "");
const TOKEN_KEY = "relay_token";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/** Raised for any API-level failure; carries a user-friendly message. */
export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

// --- token helpers ---------------------------------------------------------

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

// --- core fetch ------------------------------------------------------------

interface FetchOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function apiFetch(path: string, { method = "GET", body, auth = false }: FetchOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("NETWORK", "Could not reach the Relay API. Is the server running?");
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* not all responses carry JSON */
  }

  if (!res.ok) {
    const detail = (data as { detail?: { message?: string; code?: string } | string })?.detail;
    const message = typeof detail === "string" ? detail : detail?.message ?? "The request failed. Please try again.";
    const code = typeof detail === "object" && detail?.code ? detail.code : `HTTP_${res.status}`;
    throw new ApiError(code, message);
  }

  return data;
}

// --- auth ------------------------------------------------------------------

export async function signup(email: string, password: string, name?: string): Promise<AuthUser> {
  const res = (await apiFetch("/api/auth/signup", { method: "POST", body: { email, password, name } })) as AuthResponse;
  setToken(res.token);
  return res.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = (await apiFetch("/api/auth/login", { method: "POST", body: { email, password } })) as AuthResponse;
  setToken(res.token);
  return res.user;
}

export async function demoLogin(): Promise<AuthUser> {
  const res = (await apiFetch("/api/auth/demo", { method: "POST" })) as AuthResponse;
  setToken(res.token);
  return res.user;
}

export async function fetchMe(): Promise<AuthUser> {
  const res = (await apiFetch("/api/me", { auth: true })) as { user: AuthUser };
  return res.user;
}

export function logout(): void {
  setToken(null);
}

// --- serving ---------------------------------------------------------------

export async function serveAd(adRequest: AdRequest): Promise<DeliveryResponse> {
  return (await apiFetch("/api/serve", { method: "POST", body: adRequest, auth: true })) as DeliveryResponse;
}

export async function listDeliveries(): Promise<SavedDeliveryRecord[]> {
  const res = await apiFetch("/api/deliveries", { auth: true });
  return (Array.isArray(res) ? res : []) as SavedDeliveryRecord[];
}

export async function getDelivery(id: string): Promise<SavedDeliveryRecord | null> {
  return (await apiFetch(`/api/deliveries/${encodeURIComponent(id)}`, { auth: true })) as SavedDeliveryRecord;
}
