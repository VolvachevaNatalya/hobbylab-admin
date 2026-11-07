"use server";

import type { EventDetailItem } from "@/types/api";
import {
  getToken,
  buildAuthHeaders,
  getApiBase,
  extractError,
} from "@/lib/server-fetch";

export type EventScope = "single" | "future" | "series";

export type RecurrencePayload = {
  frequency: string;
  interval: number;
  end_type: string;
  total_count?: number | null;
  end_date?: string | null;
};

export type EventCreatePayload = {
  organization_id: number;
  title: string;
  start_datetime: string;
  end_datetime?: string | null;
  description?: string | null;
  category_ids: number[];
  city?: string | null;
  city_id?: number | null;
  address?: string | null;
  is_nationwide?: boolean;
  price?: number | null;
  price_comment?: string | null;
  image_url?: string | null;
  banner_url?: string | null;
  min_age?: number | null;
  max_age?: number | null;
  age_groups?: string[] | null;
  capacity?: number | null;
  recurrence?: RecurrencePayload | null;
};

export type EventUpdatePayload = {
  title?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  description?: string | null;
  status?: string | null;
  category_ids?: number[] | null;
  city?: string | null;
  city_id?: number | null;
  address?: string | null;
  is_nationwide?: boolean | null;
  price?: number | null;
  price_comment?: string | null;
  image_url?: string | null;
  banner_url?: string | null;
  min_age?: number | null;
  max_age?: number | null;
  age_groups?: string[] | null;
  capacity?: number | null;
  recurrence?: RecurrencePayload | null;
};

export type EventActionResult = {
  ok: boolean;
  message?: string;
  sessionExpired?: boolean;
};

export async function getEventDetail(
  id: number
): Promise<{ data: EventDetailItem | null; status: number }> {
  let base: string;
  try {
    base = getApiBase();
  } catch {
    return { data: null, status: 0 };
  }

  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/events/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", ...buildAuthHeaders(token) },
      cache: "no-store",
    });
  } catch {
    return { data: null, status: 0 };
  }

  if (!res.ok) return { data: null, status: res.status };
  const data = await res.json();
  return { data: data as EventDetailItem, status: res.status };
}

export async function createEvent(
  data: EventCreatePayload
): Promise<EventActionResult> {
  let base: string;
  try {
    base = getApiBase();
  } catch {
    return { ok: false, message: "Server misconfiguration." };
  }

  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildAuthHeaders(token) },
      body: JSON.stringify(data),
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: "Backend is temporarily unavailable. Please try again." };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, sessionExpired: true };
  if (res.status === 422) {
    const body = await res.json().catch(() => null);
    return { ok: false, message: extractError(body) };
  }
  if (!res.ok) return { ok: false, message: "Failed to create event. Please try again." };
  return { ok: true };
}

export async function updateEvent(
  id: number,
  data: EventUpdatePayload,
  scope: EventScope = "single"
): Promise<EventActionResult> {
  let base: string;
  try {
    base = getApiBase();
  } catch {
    return { ok: false, message: "Server misconfiguration." };
  }

  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/events/${id}?scope=${scope}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...buildAuthHeaders(token) },
      body: JSON.stringify(data),
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: "Backend is temporarily unavailable. Please try again." };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, sessionExpired: true };
  if (res.status === 404) return { ok: false, message: "Event not found. It may have been deleted." };
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, message: extractError(body) };
  }
  return { ok: true };
}

export async function deleteEvent(
  id: number,
  scope: EventScope = "single"
): Promise<EventActionResult> {
  let base: string;
  try {
    base = getApiBase();
  } catch {
    return { ok: false, message: "Server misconfiguration." };
  }

  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/events/${id}?scope=${scope}`, {
      method: "DELETE",
      headers: buildAuthHeaders(token),
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: "Backend is temporarily unavailable. Please try again." };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, sessionExpired: true };
  if (res.status === 404) return { ok: false, message: "Event not found. It may have already been deleted." };
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, message: extractError(body) };
  }
  return { ok: true };
}
