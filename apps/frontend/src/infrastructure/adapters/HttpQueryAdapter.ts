import { getAuthHeaders } from "@/security/auth";
import { dispatchAuthInvalid } from "@/security/authEvents";

import type { IQueryGateway } from "../../domain/ports/IQueryGateway";
import { translateApiError } from "../../services/api/errorTranslations";
import type {
  ApiError,
  AtencionFullStateView,
  AtencionMonitorView,
  AtencionStateView,
  NextTurnView,
  RecentAttentionRecordView,
} from "../../services/api/types";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

function correlationId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function baseHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Correlation-Id": correlationId(),
  };
}

async function handleResponse<T>(res: Response, path: string): Promise<T> {
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const apiErr = {
      ...(json as ApiError),
      error: (json as ApiError)?.error ?? res.statusText,
      status: res.status,
    } as ApiError;

    if (res.status === 401) {
      dispatchAuthInvalid({ reason: "unauthorized", status: res.status, path });
    }
    if (res.status === 403) {
      dispatchAuthInvalid({ reason: "forbidden", status: res.status, path });
    }

    const userMessage = translateApiError(apiErr);
    throw Object.assign(new Error(userMessage), {
      status: res.status,
      body: apiErr,
    });
  }

  return json as T;
}

export class HttpQueryAdapter implements IQueryGateway {
  async getMonitor(serviceId: string): Promise<AtencionMonitorView> {
    const path = `/api/v1/atencion/${encodeURIComponent(serviceId)}/monitor`;
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { ...baseHeaders(), ...getAuthHeaders() },
    });
    return handleResponse<AtencionMonitorView>(res, path);
  }

  async getQueueState(serviceId: string): Promise<AtencionStateView> {
    const path = `/api/v1/atencion/${encodeURIComponent(serviceId)}/queue-state`;
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { ...baseHeaders(), ...getAuthHeaders() },
    });
    return handleResponse<AtencionStateView>(res, path);
  }

  async getFullState(serviceId: string): Promise<AtencionFullStateView | null> {
    const path = `/api/v1/atencion/${encodeURIComponent(serviceId)}/full-state`;
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { ...baseHeaders(), ...getAuthHeaders() },
    });
    if (res.status === 404) return null;
    return handleResponse<AtencionFullStateView>(res, path);
  }

  async getNextTurn(serviceId: string): Promise<NextTurnView | null> {
    const path = `/api/v1/atencion/${encodeURIComponent(serviceId)}/next-turn`;
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { ...baseHeaders(), ...getAuthHeaders() },
    });
    if (res.status === 404) return null;
    return handleResponse<NextTurnView>(res, path);
  }

  async getRecentHistory(
    serviceId: string,
    limit = 20,
  ): Promise<RecentAttentionRecordView[]> {
    const path = `/api/v1/atencion/${encodeURIComponent(serviceId)}/recent-history?limit=${limit}`;
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { ...baseHeaders(), ...getAuthHeaders() },
    });
    return handleResponse<RecentAttentionRecordView[]>(res, path);
  }

  async getConsultingRoomsState(
    serviceId: string,
  ): Promise<{ activeRooms: string[]; allRooms: string[] }> {
    const path = `/api/v1/atencion/${encodeURIComponent(serviceId)}/consulting-rooms`;
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { ...baseHeaders(), ...getAuthHeaders() },
    });
    if (res.status === 404) return { activeRooms: [], allRooms: [] };
    return handleResponse<{ activeRooms: string[]; allRooms: string[] }>(res, path);
  }

  async rebuildProjection(serviceId: string): Promise<void> {
    const path = `/api/v1/atencion/${encodeURIComponent(serviceId)}/rebuild`;
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        ...baseHeaders(),
        ...getAuthHeaders(),
        "Idempotency-Key": correlationId(), // Rebuild is a special command-like projection op
      },
    });
    await handleResponse(res, path);
  }
}

/** Instancia singleton para uso en la aplicación. */
export const httpQueryAdapter = new HttpQueryAdapter();
