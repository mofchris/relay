// API client for Relay — the real-time ad delivery & analytics platform.
//
// Two modes:
//   1. Connected   — when VITE_API_URL is set, calls the serving backend
//                    (POST /api/serve, GET /api/deliveries, GET /api/deliveries/:id).
//   2. Demo/offline — when VITE_API_URL is unset, decisions are computed locally
//                    with the deterministic engine in mock.ts and persisted in
//                    localStorage, so the console is fully usable with no backend.

import { mockPipeline, mockServe } from "./mock";
import type {
  AdRequest,
  DeliveryResponse,
  SavedDeliveryRecord,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const STORAGE_KEY = "relay_delivery_records";
const MAX_RECORDS = 50;

export const isDemoMode = API_BASE === "";

/** Raised for any API-level failure; carries a user-friendly message. */
export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Demo-mode persistence (localStorage)
// ---------------------------------------------------------------------------

function readLocal(): SavedDeliveryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedDeliveryRecord[]) : [];
  } catch {
    // Malformed storage should never crash the UI.
    return [];
  }
}

function writeLocal(records: SavedDeliveryRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    // Quota / private mode — non-fatal for a demo.
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Simulate network latency so loading states are visible in demo mode.
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function serveAd(request: AdRequest): Promise<DeliveryResponse> {
  if (isDemoMode) {
    await delay(450);
    const requestId = uuid();
    const decision = mockServe(request, requestId);
    const pipeline = mockPipeline(requestId);
    const record: SavedDeliveryRecord = {
      id: requestId,
      created_at: new Date().toISOString(),
      request,
      decision,
      pipeline,
    };
    const records = readLocal();
    records.unshift(record);
    writeLocal(records);
    return { request_id: requestId, status: decision.filled ? "filled" : "no_fill", decision, pipeline };
  }

  const res = await fetchJson("/api/serve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return res as DeliveryResponse;
}

export async function listDeliveries(): Promise<SavedDeliveryRecord[]> {
  if (isDemoMode) {
    await delay(150);
    return readLocal();
  }
  const res = await fetchJson("/api/deliveries", { method: "GET" });
  return (Array.isArray(res) ? res : []) as SavedDeliveryRecord[];
}

export async function getDelivery(id: string): Promise<SavedDeliveryRecord | null> {
  if (isDemoMode) {
    await delay(100);
    return readLocal().find((r) => r.id === id) ?? null;
  }
  const res = await fetchJson(`/api/deliveries/${encodeURIComponent(id)}`, { method: "GET" });
  return res as SavedDeliveryRecord;
}

async function fetchJson(path: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError("NETWORK", "Could not reach the serving backend. Please try again.");
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Some endpoints (or errors) may not return JSON.
  }

  if (!res.ok) {
    const detail = (data as { detail?: { message?: string } | string })?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.message ?? "The request failed. Please try again.";
    const code =
      typeof detail === "object" && detail && "code" in detail
        ? String((detail as { code?: string }).code)
        : `HTTP_${res.status}`;
    throw new ApiError(code, message);
  }

  return data;
}
