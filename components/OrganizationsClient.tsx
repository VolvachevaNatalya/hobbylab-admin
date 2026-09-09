"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrgListItem, OrgUser, CategoryListItem, OrgDetailItem } from "@/types/auth";
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationDetail,
} from "@/lib/organization-actions";
import type { OrgFormData } from "@/lib/organization-actions";
import CitySelector from "@/components/CitySelector";

// ─── Types ───────────────────────────────────────────────────────────────────

type ModalMode = "closed" | "create" | "edit" | "delete";

interface OrgFormFields {
  name: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  city_id: number | null;
  status: string;
  verified: boolean;
  logo_url: string;
  banner_url: string;
  instagram_url: string;
  facebook_url: string;
  telegram_url: string;
  youtube_url: string;
  tiktok_url: string;
  whatsapp_url: string;
  trial_lesson_available: boolean;
  trial_lesson_price: string;
  trial_lesson_comment: string;
  category_ids: number[];
}

interface Props {
  items: OrgListItem[];
  total: number;
  page: number;
  totalPages: number;
  categories: CategoryListItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: OrgFormFields = {
  name: "",
  description: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  city_id: null,
  status: "pending",
  verified: false,
  logo_url: "",
  banner_url: "",
  instagram_url: "",
  facebook_url: "",
  telegram_url: "",
  youtube_url: "",
  tiktok_url: "",
  whatsapp_url: "",
  trial_lesson_available: false,
  trial_lesson_price: "",
  trial_lesson_comment: "",
  category_ids: [],
};

const HEADINGS = [
  "Name",
  "Email",
  "Phone",
  "City",
  "Status",
  "Verified",
  "Owner",
  "Created",
  "Actions",
] as const;

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

const SELECT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 bg-white";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 resize-none";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Returns the trimmed string, or null (edit) / undefined (create — field omitted)
function nullable(v: string, isCreate: boolean): string | null | undefined {
  const t = v.trim();
  return t !== "" ? t : (isCreate ? undefined : null);
}

function toFormFields(org: OrgDetailItem): OrgFormFields {
  return {
    name: org.name ?? "",
    description: org.description ?? "",
    email: org.email ?? "",
    phone: org.phone ?? "",
    website: org.website ?? "",
    address: org.address ?? "",
    // Prefer resolved English city name from the city record; fall back to stored text
    city: org.city_name_en ?? org.city_name_he ?? org.city_name_ru ?? org.city ?? "",
    city_id: org.city_id ?? null,
    status: org.status ?? "pending",
    verified: org.verified,
    logo_url: org.logo_url ?? "",
    banner_url: org.banner_url ?? "",
    instagram_url: org.instagram_url ?? "",
    facebook_url: org.facebook_url ?? "",
    telegram_url: org.telegram_url ?? "",
    youtube_url: org.youtube_url ?? "",
    tiktok_url: org.tiktok_url ?? "",
    whatsapp_url: org.whatsapp_url ?? "",
    trial_lesson_available: org.trial_lesson_available,
    trial_lesson_price:
      org.trial_lesson_price != null ? String(org.trial_lesson_price) : "",
    trial_lesson_comment: org.trial_lesson_comment ?? "",
    category_ids: org.categories.map((c) => c.id),
  };
}

function buildPayload(fields: OrgFormFields, isCreate: boolean): OrgFormData {
  const data: OrgFormData = {
    name: fields.name.trim(),
    verified: fields.verified,
    trial_lesson_available: fields.trial_lesson_available,
    status: fields.status,
    description: nullable(fields.description, isCreate),
    email: nullable(fields.email, isCreate),
    phone: nullable(fields.phone, isCreate),
    website: nullable(fields.website, isCreate),
    address: nullable(fields.address, isCreate),
    logo_url: nullable(fields.logo_url, isCreate),
    banner_url: nullable(fields.banner_url, isCreate),
    instagram_url: nullable(fields.instagram_url, isCreate),
    facebook_url: nullable(fields.facebook_url, isCreate),
    telegram_url: nullable(fields.telegram_url, isCreate),
    youtube_url: nullable(fields.youtube_url, isCreate),
    tiktok_url: nullable(fields.tiktok_url, isCreate),
    whatsapp_url: nullable(fields.whatsapp_url, isCreate),
    trial_lesson_comment: nullable(fields.trial_lesson_comment, isCreate),
  };

  // city + city_id: linked pair
  if (fields.city_id !== null) {
    data.city_id = fields.city_id;
    const cityText = fields.city.trim();
    if (cityText) data.city = cityText;
  } else if (!isCreate) {
    data.city_id = null;
    data.city = null;
  }

  // trial_lesson_price
  const priceStr = fields.trial_lesson_price.trim();
  if (priceStr) {
    const p = parseFloat(priceStr);
    if (!isNaN(p) && p >= 0) data.trial_lesson_price = p;
  } else {
    data.trial_lesson_price = isCreate ? undefined : null;
  }

  data.category_ids = fields.category_ids;

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

function getCategoryDisplayName(cat: CategoryListItem): string {
  return cat.name_en ?? cat.name_he ?? cat.name_ru ?? cat.name ?? String(cat.id);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OrgOwner({ users }: { users: OrgUser[] }) {
  const owner = users.find((u) => u.role === "owner");
  if (!owner) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        No owner
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      {owner.name && <div className="text-sm text-gray-900">{owner.name}</div>}
      <div className={owner.name ? "text-xs text-gray-500" : "text-sm text-gray-700"}>
        {owner.email}
      </div>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function OrganizationsClient({
  items,
  total,
  page,
  totalPages,
  categories,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [selected, setSelected] = useState<OrgListItem | null>(null);
  const [form, setForm] = useState<OrgFormFields>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  // Incremented whenever the edit modal is closed, invalidating in-flight fetches
  const detailFetchIdRef = useRef(0);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Form inputs and buttons are disabled while a mutation or detail fetch is active
  const disabled = isPending || isLoadingDetail;

  function openCreate() {
    detailFetchIdRef.current++;
    setForm(EMPTY_FORM);
    setError(null);
    setDetailError(null);
    setIsLoadingDetail(false);
    setModalMode("create");
  }

  async function openEdit(org: OrgListItem) {
    const fetchId = ++detailFetchIdRef.current;
    setSelected(org);
    setError(null);
    setDetailError(null);
    // Quick prefill from list data so the modal can open immediately
    setForm({
      ...EMPTY_FORM,
      name: org.name ?? "",
      email: org.email ?? "",
      phone: org.phone ?? "",
      city: org.city ?? "",
      city_id: org.city_id ?? null,
      status: org.status ?? "pending",
      verified: org.verified,
    });
    setIsLoadingDetail(true);
    setModalMode("edit");

    const result = await getOrganizationDetail(org.id);

    // If the modal was closed while loading, discard the result
    if (fetchId !== detailFetchIdRef.current) return;
    setIsLoadingDetail(false);

    if (result.data) {
      setForm(toFormFields(result.data));
    } else {
      setDetailError(
        result.status === 401 || result.status === 403
          ? "Session expired — please refresh the page."
          : "Could not load full details. Some fields may be incomplete."
      );
    }
  }

  function openDelete(org: OrgListItem) {
    setSelected(org);
    setError(null);
    setModalMode("delete");
  }

  function closeModal() {
    if (isPending) return;
    detailFetchIdRef.current++; // cancel any in-flight detail fetch
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

  function setField<K extends keyof OrgFormFields>(key: K, value: OrgFormFields[K]) {
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
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (form.category_ids.length === 0) {
      setError("At least one category is required.");
      return;
    }
    const isCreate = modalMode === "create";
    const data = buildPayload(form, isCreate);
    setError(null);
    startTransition(async () => {
      const result = isCreate
        ? await createOrganization(data)
        : await updateOrganization(selected!.id, data);

      if (result.sessionExpired) {
        // Full-page navigation required so the browser processes the Set-Cookie
        // header that deletes the httpOnly session cookie.
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
      const result = await deleteOrganization(selected.id);

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

  const maxCatsReached = form.category_ids.length >= 10;
  const displayName = selected?.name ?? `#${selected?.id ?? ""}`;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Organizations</h1>
          <span className="text-sm text-gray-400">{total} total</span>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          + Add organization
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
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
                    No organizations found.
                  </td>
                </tr>
              ) : (
                items.map((org) => (
                  <tr key={org.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {org.name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {org.email ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {org.phone ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {org.city ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {org.status ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700">
                          {org.status}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {org.verified ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          Not verified
                        </span>
                      )}
                    </td>
                    <td className="min-w-[160px] px-4 py-3">
                      <OrgOwner users={org.users} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {formatDate(org.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => void openEdit(org)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDelete(org)}
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {hasPrev ? (
            <Link
              href={`/organizations?page=${page - 1}`}
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
              href={`/organizations?page=${page + 1}`}
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
            {(modalMode === "create" || modalMode === "edit") && (
              <>
                {/* Fixed header */}
                <div className="border-b border-gray-100 px-6 py-4">
                  <h2 className="text-base font-semibold text-gray-900">
                    {modalMode === "create" ? "Add organization" : "Edit organization"}
                  </h2>
                  {isLoadingDetail && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      Loading details…
                    </p>
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
                          Name <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setField("name", e.target.value)}
                          disabled={disabled}
                          autoFocus
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
                          className={TEXTAREA_CLASS}
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Status</span>
                          <select
                            value={form.status}
                            onChange={(e) => setField("status", e.target.value)}
                            disabled={disabled}
                            className={SELECT_CLASS}
                          >
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="blocked">Blocked</option>
                          </select>
                        </label>

                        <div className="flex flex-col gap-1 justify-end pb-0.5">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={form.verified}
                              onChange={(e) => setField("verified", e.target.checked)}
                              disabled={disabled}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Verified</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* ── Contact ───────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Contact" />
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Email</span>
                          <input
                            type="text"
                            value={form.email}
                            onChange={(e) => setField("email", e.target.value)}
                            disabled={disabled}
                            className={INPUT_CLASS}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Phone</span>
                          <input
                            type="text"
                            value={form.phone}
                            onChange={(e) => setField("phone", e.target.value)}
                            disabled={disabled}
                            className={INPUT_CLASS}
                          />
                        </label>
                      </div>
                      <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Website</span>
                        <input
                          type="text"
                          value={form.website}
                          onChange={(e) => setField("website", e.target.value)}
                          disabled={disabled}
                          placeholder="https://..."
                          className={INPUT_CLASS}
                        />
                      </label>
                    </div>

                    {/* ── Location ──────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Location" />
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
                    </div>

                    {/* ── Social ────────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Social" />
                      <div className="grid grid-cols-2 gap-3">
                        {(
                          [
                            ["instagram_url", "Instagram"],
                            ["facebook_url", "Facebook"],
                            ["telegram_url", "Telegram"],
                            ["youtube_url", "YouTube"],
                            ["tiktok_url", "TikTok"],
                            ["whatsapp_url", "WhatsApp"],
                          ] as const
                        ).map(([field, label]) => (
                          <label key={field} className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-700">
                              {label}
                            </span>
                            <input
                              type="text"
                              value={form[field]}
                              onChange={(e) => setField(field, e.target.value)}
                              disabled={disabled}
                              placeholder="https://..."
                              className={INPUT_CLASS}
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* ── Media ─────────────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Media" />
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Logo URL</span>
                          <input
                            type="text"
                            value={form.logo_url}
                            onChange={(e) => setField("logo_url", e.target.value)}
                            disabled={disabled}
                            placeholder="https://..."
                            className={INPUT_CLASS}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-700">Banner URL</span>
                          <input
                            type="text"
                            value={form.banner_url}
                            onChange={(e) => setField("banner_url", e.target.value)}
                            disabled={disabled}
                            placeholder="https://..."
                            className={INPUT_CLASS}
                          />
                        </label>
                      </div>
                    </div>

                    {/* ── Trial Lesson ──────────────────────────────────────── */}
                    <div className="flex flex-col gap-3">
                      <SectionHeader title="Trial Lesson" />
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.trial_lesson_available}
                          onChange={(e) =>
                            setField("trial_lesson_available", e.target.checked)
                          }
                          disabled={disabled}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Trial lesson available
                        </span>
                      </label>
                      {form.trial_lesson_available && (
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-700">Price</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={form.trial_lesson_price}
                              onChange={(e) =>
                                setField("trial_lesson_price", e.target.value)
                              }
                              disabled={disabled}
                              placeholder="0.00"
                              className={INPUT_CLASS}
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-700">Comment</span>
                            <input
                              type="text"
                              value={form.trial_lesson_comment}
                              onChange={(e) =>
                                setField("trial_lesson_comment", e.target.value)
                              }
                              disabled={disabled}
                              className={INPUT_CLASS}
                            />
                          </label>
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
                  Delete organization
                </h2>

                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-medium">
                    This is a destructive action and cannot be undone.
                  </p>
                  <p className="mt-1">
                    Deleting{" "}
                    <span className="font-semibold">{displayName}</span> will
                    permanently remove the organization. All associated data —
                    events, memberships, reviews, and other organization content —
                    may also be deleted according to backend cascade rules.
                  </p>
                </div>

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
