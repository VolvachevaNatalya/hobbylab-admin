"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  EventListItem,
  EventListItemRecurrence,
  EventCategory,
  OrgListItem,
  CategoryListItem,
  EventDetailItem,
} from "@/types/api";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventDetail,
} from "@/lib/event-actions";
import type {
  EventCreatePayload,
  EventUpdatePayload,
  EventScope,
  RecurrencePayload,
} from "@/lib/event-actions";
import CitySelector from "@/components/CitySelector";

// ─── Types ───────────────────────────────────────────────────────────────────

type ModalMode = "closed" | "create" | "edit" | "delete";

interface EventFormFields {
  title: string;
  description: string;
  status: string;
  organization_id: number | null;
  category_ids: number[];
  // When
  start_datetime: string; // datetime-local "YYYY-MM-DDTHH:MM"
  end_datetime: string;
  // Location
  city: string;
  city_id: number | null;
  address: string;
  is_nationwide: boolean;
  // Media
  image_url: string;
  banner_url: string;
  // Audience
  min_age: string;
  max_age: string;
  age_groups: string; // comma-separated
  capacity: string;
  // Price
  price: string;
  price_comment: string;
  // Recurrence
  is_recurring: boolean;
  recurrence_frequency: string;
  recurrence_interval: string;
  recurrence_end_type: string;
  recurrence_total_count: string;
  recurrence_end_date: string;
}

interface Props {
  items: EventListItem[];
  total: number;
  page: number;
  totalPages: number;
  organizations: OrgListItem[];
  categories: CategoryListItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: EventFormFields = {
  title: "",
  description: "",
  status: "",
  organization_id: null,
  category_ids: [],
  start_datetime: "",
  end_datetime: "",
  city: "",
  city_id: null,
  address: "",
  is_nationwide: false,
  image_url: "",
  banner_url: "",
  min_age: "",
  max_age: "",
  age_groups: "",
  capacity: "",
  price: "",
  price_comment: "",
  is_recurring: false,
  recurrence_frequency: "weekly",
  recurrence_interval: "1",
  recurrence_end_type: "count",
  recurrence_total_count: "",
  recurrence_end_date: "",
};

const HEADINGS = [
  "Title",
  "Organization",
  "Categories",
  "City",
  "Status",
  "Start",
  "End",
  "Price",
  "Nationwide",
  "Created",
  "Actions",
] as const;

const RECURRENCE_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

const RECURRENCE_END_TYPES = [
  { value: "count", label: "After N occurrences" },
  { value: "date", label: "On a specific date" },
  { value: "never", label: "No end" },
] as const;

const EVENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const SCOPE_OPTIONS: { value: EventScope; label: string; description: string }[] = [
  {
    value: "single",
    label: "This event only",
    description: "Only this specific occurrence is affected",
  },
  {
    value: "future",
    label: "This and future events",
    description: "This occurrence and all following ones in the series",
  },
  {
    value: "series",
    label: "All events in this series",
    description: "Every occurrence in the series",
  },
];

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

const SELECT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 bg-white";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 resize-none";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Convert ISO datetime string to datetime-local input format "YYYY-MM-DDTHH:MM"
function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

// Convert datetime-local format to ISO string (seconds appended)
function datetimeLocalToIso(local: string): string {
  if (!local) return "";
  return local + ":00";
}

function parseIntOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseInt(s.trim(), 10);
  return isNaN(n) ? null : n;
}

function parseFloatOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseFloat(s.trim());
  return isNaN(n) ? null : n;
}

function parseAgeGroups(s: string): string[] | null {
  const groups = s
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
  return groups.length > 0 ? groups : null;
}

function toFormFields(detail: EventDetailItem): EventFormFields {
  const rec = detail.recurrence;
  return {
    title: detail.title ?? "",
    description: detail.description ?? "",
    status: detail.status ?? "",
    organization_id: detail.organization_id,
    category_ids: detail.categories.map((c) => c.id),
    start_datetime: isoToDatetimeLocal(detail.start_datetime),
    end_datetime: isoToDatetimeLocal(detail.end_datetime),
    city: detail.city_name_en ?? detail.city_name_he ?? detail.city ?? "",
    city_id: detail.city_id ?? null,
    address: detail.address ?? "",
    is_nationwide: detail.is_nationwide,
    image_url: detail.image_url ?? "",
    banner_url: detail.banner_url ?? "",
    min_age: detail.min_age != null ? String(detail.min_age) : "",
    max_age: detail.max_age != null ? String(detail.max_age) : "",
    age_groups: detail.age_groups?.join(", ") ?? "",
    capacity: detail.capacity != null ? String(detail.capacity) : "",
    price: detail.price != null ? String(detail.price) : "",
    price_comment: detail.price_comment ?? "",
    is_recurring: rec !== null,
    recurrence_frequency: rec?.frequency ?? "weekly",
    recurrence_interval: rec ? String(rec.interval) : "1",
    recurrence_end_type: rec?.end_type ?? "count",
    recurrence_total_count:
      rec?.total_count != null ? String(rec.total_count) : "",
    recurrence_end_date: rec?.end_date ?? "",
  };
}

function buildRecurrencePayload(fields: EventFormFields): RecurrencePayload {
  const rec: RecurrencePayload = {
    frequency: fields.recurrence_frequency,
    interval: parseIntOrNull(fields.recurrence_interval) ?? 1,
    end_type: fields.recurrence_end_type,
  };
  if (fields.recurrence_end_type === "count") {
    rec.total_count = parseIntOrNull(fields.recurrence_total_count);
  } else if (fields.recurrence_end_type === "date") {
    rec.end_date = fields.recurrence_end_date || null;
  }
  return rec;
}

function buildCreatePayload(fields: EventFormFields): EventCreatePayload {
  const data: EventCreatePayload = {
    organization_id: fields.organization_id!,
    title: fields.title.trim(),
    start_datetime: datetimeLocalToIso(fields.start_datetime),
    category_ids: fields.category_ids,
  };

  if (fields.end_datetime)
    data.end_datetime = datetimeLocalToIso(fields.end_datetime);
  if (fields.description.trim()) data.description = fields.description.trim();

  if (fields.city_id !== null) {
    data.city_id = fields.city_id;
    if (fields.city.trim()) data.city = fields.city.trim();
  }
  if (fields.address.trim()) data.address = fields.address.trim();
  data.is_nationwide = fields.is_nationwide;

  if (fields.image_url.trim()) data.image_url = fields.image_url.trim();
  if (fields.banner_url.trim()) data.banner_url = fields.banner_url.trim();

  const minAge = parseIntOrNull(fields.min_age);
  if (minAge !== null && minAge >= 0) data.min_age = minAge;
  const maxAge = parseIntOrNull(fields.max_age);
  if (maxAge !== null && maxAge >= 0) data.max_age = maxAge;

  const ageGroups = parseAgeGroups(fields.age_groups);
  if (ageGroups) data.age_groups = ageGroups;

  const capacity = parseIntOrNull(fields.capacity);
  if (capacity !== null && capacity > 0) data.capacity = capacity;

  const price = parseFloatOrNull(fields.price);
  if (price !== null) data.price = price;
  if (fields.price_comment.trim()) data.price_comment = fields.price_comment.trim();

  if (fields.is_recurring) {
    data.recurrence = buildRecurrencePayload(fields);
  }

  return data;
}

function buildUpdatePayload(fields: EventFormFields): EventUpdatePayload {
  const data: EventUpdatePayload = {
    title: fields.title.trim() || null,
    start_datetime: fields.start_datetime
      ? datetimeLocalToIso(fields.start_datetime)
      : null,
    end_datetime: fields.end_datetime
      ? datetimeLocalToIso(fields.end_datetime)
      : null,
    description: fields.description.trim() || null,
    category_ids: fields.category_ids,
    city_id: fields.city_id,
    city:
      fields.city_id !== null ? (fields.city.trim() || null) : null,
    address: fields.address.trim() || null,
    is_nationwide: fields.is_nationwide,
    image_url: fields.image_url.trim() || null,
    banner_url: fields.banner_url.trim() || null,
    price: parseFloatOrNull(fields.price),
    price_comment: fields.price_comment.trim() || null,
    min_age: parseIntOrNull(fields.min_age),
    max_age: parseIntOrNull(fields.max_age),
    age_groups: parseAgeGroups(fields.age_groups),
    capacity: parseIntOrNull(fields.capacity),
    recurrence: fields.is_recurring ? buildRecurrencePayload(fields) : null,
  };

  // Only send status if non-empty (preserve backend value if admin leaves it blank)
  if (fields.status.trim()) data.status = fields.status.trim();

  return data;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function recurrenceIntervalLabel(frequency: string, interval: number): string {
  if (interval === 1) {
    const singular: Record<string, string> = {
      daily: "every day",
      weekly: "every week",
      monthly: "every month",
      yearly: "every year",
    };
    return singular[frequency] ?? `every ${frequency}`;
  }
  const plural: Record<string, string> = {
    daily: "days",
    weekly: "weeks",
    monthly: "months",
    yearly: "years",
  };
  return `every ${interval} ${plural[frequency] ?? frequency}`;
}

function formatRecurrenceSummary(
  rec: EventListItemRecurrence,
  occurrenceCount: number | null
): string {
  const freqCap = rec.frequency.charAt(0).toUpperCase() + rec.frequency.slice(1);
  const intervalPart = recurrenceIntervalLabel(rec.frequency, rec.interval);

  let endPart: string;
  if (rec.end_type === "count") {
    const n = occurrenceCount ?? rec.total_count;
    endPart = n != null ? `${n} occurrences` : "? occurrences";
  } else if (rec.end_type === "date" && rec.end_date) {
    endPart =
      "until " +
      new Date(rec.end_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  } else {
    endPart = "no end";
  }

  return `${freqCap} · ${intervalPart} · ${endPart}`;
}

function getCategoryName(cat: EventCategory): string {
  return cat.name_en ?? cat.name ?? cat.name_ru ?? cat.name_he ?? "—";
}

function getCategoryDisplayName(cat: CategoryListItem): string {
  return cat.name_en ?? cat.name_he ?? cat.name_ru ?? cat.name ?? String(cat.id);
}

function getOrgName(org: OrgListItem): string {
  return org.name ?? `#${org.id}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DateTime({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-400">—</span>;

  let datePart = "";
  let timePart = "";
  try {
    const d = new Date(value);
    datePart = d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    timePart = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch {
    // empty
  }

  if (!datePart) return <span className="text-gray-400">—</span>;
  return (
    <div>
      <div className="whitespace-nowrap text-sm text-gray-700">{datePart}</div>
      <div className="whitespace-nowrap text-xs text-gray-500">{timePart}</div>
    </div>
  );
}

function Categories({ categories }: { categories: EventCategory[] }) {
  if (categories.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((cat) => (
        <span
          key={cat.id}
          className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
        >
          {getCategoryName(cat)}
        </span>
      ))}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="border-b border-gray-100 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
      {title}
    </p>
  );
}

function ScopeRadioGroup({
  value,
  onChange,
  disabled,
}: {
  value: EventScope;
  onChange: (s: EventScope) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      {SCOPE_OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
            value === opt.value
              ? "border-blue-300 bg-blue-50"
              : "border-gray-200 hover:bg-gray-50"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input
            type="radio"
            name="scope"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 shrink-0 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            <span className="font-medium text-gray-900">{opt.label}</span>
            <span className="ml-1 text-gray-500">— {opt.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EventsClient({
  items,
  total,
  page,
  totalPages,
  organizations,
  categories,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [selected, setSelected] = useState<EventListItem | null>(null);
  const [form, setForm] = useState<EventFormFields>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<EventScope>("single");
  const [deleteScope, setDeleteScope] = useState<EventScope>("single");
  const detailFetchIdRef = useRef(0);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const disabled = isPending || isLoadingDetail;
  const isEdit = modalMode === "edit";
  const isCreate = modalMode === "create";
  const isSeries = (selected?.series_id ?? null) !== null;
  const maxCatsReached = form.category_ids.length >= 10;

  function openCreate() {
    detailFetchIdRef.current++;
    setForm(EMPTY_FORM);
    setError(null);
    setDetailError(null);
    setIsLoadingDetail(false);
    setEditScope("single");
    setModalMode("create");
  }

  async function openEdit(event: EventListItem) {
    const fetchId = ++detailFetchIdRef.current;
    setSelected(event);
    setError(null);
    setDetailError(null);
    setEditScope("single");
    // Quick prefill from list data while detail loads
    setForm({
      ...EMPTY_FORM,
      title: event.title ?? "",
      status: event.status ?? "",
      organization_id: event.organization_id,
      category_ids: event.categories.map((c) => c.id),
      city: event.city ?? "",
      city_id: event.city_id ?? null,
      start_datetime: isoToDatetimeLocal(event.start_datetime),
      end_datetime: isoToDatetimeLocal(event.end_datetime),
      is_nationwide: event.is_nationwide,
      price: event.price != null ? String(event.price) : "",
    });
    setIsLoadingDetail(true);
    setModalMode("edit");

    const result = await getEventDetail(event.id);

    if (fetchId !== detailFetchIdRef.current) return; // modal was closed
    setIsLoadingDetail(false);

    if (result.data) {
      setForm(toFormFields(result.data));
    } else {
      setDetailError(
        result.status === 401 || result.status === 403
          ? "Session expired — please refresh the page."
          : "Could not load full event details. Some fields may be incomplete."
      );
    }
  }

  function openDelete(event: EventListItem) {
    setSelected(event);
    setDeleteScope("single");
    setError(null);
    setModalMode("delete");
  }

  function closeModal() {
    if (isPending) return;
    detailFetchIdRef.current++;
    setModalMode("closed");
    setError(null);
    setDetailError(null);
    setIsLoadingDetail(false);
  }

  useEffect(() => {
    if (modalMode === "closed") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) {
        detailFetchIdRef.current++;
        setIsLoadingDetail(false);
        setDetailError(null);
        setModalMode("closed");
        setError(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalMode, isPending]);

  function setField<K extends keyof EventFormFields>(
    key: K,
    value: EventFormFields[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(id: number, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      category_ids: checked
        ? [...prev.category_ids, id]
        : prev.category_ids.filter((c) => c !== id),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (isCreate && form.organization_id === null) {
      setError("Organization is required.");
      return;
    }
    if (form.category_ids.length === 0) {
      setError("At least one category is required.");
      return;
    }
    if (!form.start_datetime) {
      setError("Start date/time is required.");
      return;
    }
    if (form.end_datetime && form.end_datetime <= form.start_datetime) {
      setError("End date/time must be after start date/time.");
      return;
    }
    if (form.is_recurring) {
      if (form.recurrence_end_type === "count") {
        const count = parseInt(form.recurrence_total_count.trim(), 10);
        if (!form.recurrence_total_count.trim() || isNaN(count) || count < 1) {
          setError("Number of occurrences must be at least 1.");
          return;
        }
      }
      if (
        form.recurrence_end_type === "date" &&
        !form.recurrence_end_date.trim()
      ) {
        setError("Recurrence end date is required.");
        return;
      }
    }

    setError(null);
    startTransition(async () => {
      const updatePayload = buildUpdatePayload(form);
      // scope=single cannot modify recurrence on an existing series event;
      // the backend raises HTTP 400 if recurrence is present in the payload.
      // Note: setting to null instead of deleting would trigger remove_recurrence
      // on the backend (because null is an explicit set in model_fields_set),
      // which would accidentally destroy the series.
      if (!isCreate && editScope === "single" && isSeries) {
        delete updatePayload.recurrence;
      }
      const result = isCreate
        ? await createEvent(buildCreatePayload(form))
        : await updateEvent(selected!.id, updatePayload, editScope);

      if (result.sessionExpired) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/api/auth/logout";
        return;
      }
      if (!result.ok) {
        setError(result.message ?? "An unexpected error occurred.");
        return;
      }
      setModalMode("closed");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteEvent(selected.id, deleteScope);

      if (result.sessionExpired) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/api/auth/logout";
        return;
      }
      if (!result.ok) {
        setError(result.message ?? "An unexpected error occurred.");
        return;
      }
      setModalMode("closed");
      router.refresh();
    });
  }

  const displayTitle = selected?.title ?? `#${selected?.id ?? ""}`;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Events</h1>
          <span className="text-sm text-gray-400">{total} total</span>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          + Add event
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {HEADINGS.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={HEADINGS.length}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    No events found.
                  </td>
                </tr>
              ) : (
                items.map((event) => (
                  <tr key={event.id} className="transition-colors hover:bg-gray-50">
                    <td className="min-w-[200px] px-4 py-3 text-sm text-gray-900">
                      <div className="flex flex-col gap-0.5">
                        <span>{event.title ?? <span className="text-gray-400">—</span>}</span>
                        {event.series_id !== null && (
                          <>
                            <span className="inline-flex w-fit items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                              Recurring
                            </span>
                            {event.recurrence && (
                              <span className="text-xs text-gray-400">
                                {formatRecurrenceSummary(
                                  event.recurrence,
                                  event.occurrence_count
                                )}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {event.organization_name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="min-w-[120px] px-4 py-3">
                      <Categories categories={event.categories} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {event.city ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {event.status ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700">
                          {event.status}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <DateTime value={event.start_datetime} />
                    </td>
                    <td className="px-4 py-3">
                      {event.series_id !== null && event.last_start_datetime != null ? (
                        <div>
                          <DateTime value={event.last_start_datetime} />
                          <span className="text-xs text-gray-400">last</span>
                        </div>
                      ) : (
                        <DateTime value={event.end_datetime} />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {event.price !== null ? event.price : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {event.is_nationwide ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          Nationwide
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          Local
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {formatDate(event.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => void openEdit(event)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDelete(event)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {hasPrev ? (
            <Link
              href={`/events?page=${page - 1}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              ← Previous
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-lg border border-gray-100 px-4 py-2 text-gray-300">
              ← Previous
            </span>
          )}
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          {hasNext ? (
            <Link
              href={`/events?page=${page + 1}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Next →
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-lg border border-gray-100 px-4 py-2 text-gray-300">
              Next →
            </span>
          )}
        </div>
      )}

      {/* ─── Modal ──────────────────────────────────────────────────────────── */}
      {modalMode !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >

            {/* ── Create / Edit form ───────────────────────────────────────── */}
            {(isCreate || isEdit) && (
              <>
                {/* Fixed header */}
                <div className="border-b border-gray-100 px-6 py-4">
                  <h2 className="text-base font-semibold text-gray-900">
                    {isCreate ? "Add event" : "Edit event"}
                  </h2>
                  {isLoadingDetail && (
                    <p className="mt-0.5 text-xs text-gray-400">Loading details…</p>
                  )}
                  {detailError && (
                    <p className="mt-0.5 text-xs text-amber-600">{detailError}</p>
                  )}
                </div>

                {/* Scrollable body */}
                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                  <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto px-6 py-5">
                    {error && (
                      <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </p>
                    )}

                    {/* ── Basic ─────────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Basic" />
                      <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">
                          Title <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={form.title}
                          onChange={(e) => setField("title", e.target.value)}
                          disabled={disabled}
                          autoFocus
                          dir="auto"
                          className={INPUT_CLASS}
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Description</span>
                        <textarea
                          rows={3}
                          value={form.description}
                          onChange={(e) => setField("description", e.target.value)}
                          disabled={disabled}
                          dir="auto"
                          className={TEXTAREA_CLASS}
                        />
                      </label>

                      {/* Status — edit only (EventCreate has no status field) */}
                      {isEdit && (
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Status</span>
                          <select
                            value={form.status}
                            onChange={(e) => setField("status", e.target.value)}
                            disabled={disabled}
                            className={SELECT_CLASS}
                          >
                            <option value="">— Unchanged —</option>
                            {!EVENT_STATUSES.some((s) => s.value === form.status) &&
                              form.status && (
                                <option value={form.status}>{form.status}</option>
                              )}
                            {EVENT_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>

                    {/* ── Organization ──────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Organization" />
                      {isCreate ? (
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">
                            Organization <span className="text-red-500">*</span>
                          </span>
                          {organizations.length === 0 ? (
                            <p className="text-sm text-gray-400">
                              No organizations available.
                            </p>
                          ) : (
                            <select
                              value={form.organization_id ?? ""}
                              onChange={(e) =>
                                setField(
                                  "organization_id",
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              disabled={disabled}
                              className={SELECT_CLASS}
                            >
                              <option value="">— Select organization —</option>
                              {organizations.map((org) => (
                                <option key={org.id} value={org.id}>
                                  {getOrgName(org)}
                                </option>
                              ))}
                            </select>
                          )}
                        </label>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Organization</span>
                          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                            {selected?.organization_name ??
                              organizations.find(
                                (o) => o.id === form.organization_id
                              )?.name ??
                              `ID ${form.organization_id}`}
                            <span className="ml-2 text-xs text-gray-400">
                              (cannot be changed)
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── Categories ────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Categories" />
                      {categories.length === 0 ? (
                        <p className="text-sm text-gray-400">No categories available.</p>
                      ) : (
                        <>
                          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 p-2">
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                              {categories.map((cat) => {
                                const checked = form.category_ids.includes(cat.id);
                                const catDisabled =
                                  disabled || (!checked && maxCatsReached);
                                return (
                                  <label
                                    key={cat.id}
                                    className={`flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-sm ${
                                      catDisabled
                                        ? "cursor-not-allowed opacity-40"
                                        : "hover:bg-gray-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        toggleCategory(cat.id, e.target.checked)
                                      }
                                      disabled={catDisabled}
                                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="truncate text-gray-700">
                                      {getCategoryDisplayName(cat)}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400">
                            {form.category_ids.length} / 10 selected
                            {maxCatsReached && " — maximum reached"}
                          </p>
                        </>
                      )}
                    </div>

                    {/* ── When ──────────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="When" />
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">
                            Start <span className="text-red-500">*</span>
                          </span>
                          <input
                            type="datetime-local"
                            value={form.start_datetime}
                            onChange={(e) =>
                              setField("start_datetime", e.target.value)
                            }
                            disabled={disabled}
                            className={INPUT_CLASS}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">End</span>
                          <input
                            type="datetime-local"
                            value={form.end_datetime}
                            onChange={(e) =>
                              setField("end_datetime", e.target.value)
                            }
                            disabled={disabled}
                            className={INPUT_CLASS}
                          />
                        </label>
                      </div>
                    </div>

                    {/* ── Location ──────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Location" />
                      <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">City</span>
                        <CitySelector
                          value={
                            form.city_id !== null
                              ? { id: form.city_id, label: form.city }
                              : null
                          }
                          onChange={(city) =>
                            setForm((prev) => ({
                              ...prev,
                              city_id: city?.id ?? null,
                              city: city?.label ?? "",
                            }))
                          }
                          disabled={disabled}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Address</span>
                        <input
                          type="text"
                          value={form.address}
                          onChange={(e) => setField("address", e.target.value)}
                          disabled={disabled}
                          className={INPUT_CLASS}
                        />
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.is_nationwide}
                          onChange={(e) =>
                            setField("is_nationwide", e.target.checked)
                          }
                          disabled={disabled}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Nationwide event
                        </span>
                      </label>
                    </div>

                    {/* ── Media ─────────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Media" />
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Image URL</span>
                          <input
                            type="url"
                            value={form.image_url}
                            onChange={(e) => setField("image_url", e.target.value)}
                            disabled={disabled}
                            placeholder="https://..."
                            className={INPUT_CLASS}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Banner URL</span>
                          <input
                            type="url"
                            value={form.banner_url}
                            onChange={(e) => setField("banner_url", e.target.value)}
                            disabled={disabled}
                            placeholder="https://..."
                            className={INPUT_CLASS}
                          />
                        </label>
                      </div>
                    </div>

                    {/* ── Audience ──────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Audience" />
                      <div className="grid grid-cols-3 gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Min age</span>
                          <input
                            type="number"
                            min="0"
                            value={form.min_age}
                            onChange={(e) => setField("min_age", e.target.value)}
                            disabled={disabled}
                            className={INPUT_CLASS}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Max age</span>
                          <input
                            type="number"
                            min="0"
                            value={form.max_age}
                            onChange={(e) => setField("max_age", e.target.value)}
                            disabled={disabled}
                            className={INPUT_CLASS}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Capacity</span>
                          <input
                            type="number"
                            min="1"
                            value={form.capacity}
                            onChange={(e) => setField("capacity", e.target.value)}
                            disabled={disabled}
                            className={INPUT_CLASS}
                          />
                        </label>
                      </div>
                      <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">
                          Age groups{" "}
                          <span className="text-xs font-normal text-gray-400">
                            comma-separated, e.g. 2-5, 6-10
                          </span>
                        </span>
                        <input
                          type="text"
                          value={form.age_groups}
                          onChange={(e) => setField("age_groups", e.target.value)}
                          disabled={disabled}
                          placeholder="2-5, 6-10, 11-15"
                          className={INPUT_CLASS}
                        />
                      </label>
                    </div>

                    {/* ── Price ─────────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Price" />
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Price</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.price}
                            onChange={(e) => setField("price", e.target.value)}
                            disabled={disabled}
                            placeholder="0.00"
                            className={INPUT_CLASS}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Price comment</span>
                          <input
                            type="text"
                            value={form.price_comment}
                            onChange={(e) =>
                              setField("price_comment", e.target.value)
                            }
                            disabled={disabled}
                            className={INPUT_CLASS}
                          />
                        </label>
                      </div>
                    </div>

                    {/* ── Recurrence ────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Recurrence" />
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.is_recurring}
                          onChange={(e) =>
                            setField("is_recurring", e.target.checked)
                          }
                          disabled={disabled}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Recurring event
                        </span>
                      </label>

                      {form.is_recurring && (
                        <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-gray-700">
                                Frequency
                              </span>
                              <select
                                value={form.recurrence_frequency}
                                onChange={(e) =>
                                  setField("recurrence_frequency", e.target.value)
                                }
                                disabled={disabled}
                                className={SELECT_CLASS}
                              >
                                {RECURRENCE_FREQUENCIES.map((f) => (
                                  <option key={f.value} value={f.value}>
                                    {f.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-gray-700">
                                Interval
                              </span>
                              <input
                                type="number"
                                min="1"
                                value={form.recurrence_interval}
                                onChange={(e) =>
                                  setField("recurrence_interval", e.target.value)
                                }
                                disabled={disabled}
                                className={INPUT_CLASS}
                              />
                            </label>
                          </div>

                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-700">
                              End condition
                            </span>
                            <select
                              value={form.recurrence_end_type}
                              onChange={(e) =>
                                setField("recurrence_end_type", e.target.value)
                              }
                              disabled={disabled}
                              className={SELECT_CLASS}
                            >
                              {RECURRENCE_END_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          {form.recurrence_end_type === "count" && (
                            <label className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-gray-700">
                                Number of occurrences
                              </span>
                              <input
                                type="number"
                                min="1"
                                value={form.recurrence_total_count}
                                onChange={(e) =>
                                  setField(
                                    "recurrence_total_count",
                                    e.target.value
                                  )
                                }
                                disabled={disabled}
                                className={INPUT_CLASS}
                              />
                            </label>
                          )}

                          {form.recurrence_end_type === "date" && (
                            <label className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-gray-700">
                                Recurrence end date
                              </span>
                              <input
                                type="date"
                                value={form.recurrence_end_date}
                                onChange={(e) =>
                                  setField("recurrence_end_date", e.target.value)
                                }
                                disabled={disabled}
                                className={INPUT_CLASS}
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Scope (edit, recurring events only) ───────────────── */}
                    {isEdit && isSeries && (
                      <div className="flex flex-col gap-3">
                        <SectionHeader title="Apply changes to" />
                        <ScopeRadioGroup
                          value={editScope}
                          onChange={setEditScope}
                          disabled={disabled}
                        />
                      </div>
                    )}
                  </div>

                  {/* Fixed footer */}
                  <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isPending}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={disabled}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending ? "Saving…" : "Save"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── Delete confirmation ──────────────────────────────────────── */}
            {modalMode === "delete" && selected && (
              <div className="flex flex-col gap-5 p-6">
                <h2 className="text-base font-semibold text-gray-900">
                  Delete event
                </h2>

                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-medium">
                    This action cannot be undone.
                  </p>
                  <p className="mt-1">
                    Deleting{" "}
                    <span className="font-semibold">{displayTitle}</span>.
                    {isSeries &&
                      " Choose how much of the series to delete below."}
                  </p>
                </div>

                {/* Scope selection for recurring events */}
                {isSeries && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-gray-700">
                      Delete scope
                    </p>
                    <ScopeRadioGroup
                      value={deleteScope}
                      onChange={setDeleteScope}
                      disabled={isPending}
                    />
                  </div>
                )}

                {error && (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={closeModal}
                    disabled={isPending}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending ? "Deleting…" : "Delete permanently"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
