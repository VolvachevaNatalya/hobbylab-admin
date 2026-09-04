"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import type { CategoryListItem } from "@/types/auth";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/category-actions";
import type { CategoryFormData } from "@/lib/category-actions";

type ModalMode = "closed" | "create" | "edit" | "delete";

interface FormFields {
  name: string;
  name_en: string;
  name_ru: string;
  name_he: string;
  icon_url: string;
}

const EMPTY_FORM: FormFields = {
  name: "",
  name_en: "",
  name_ru: "",
  name_he: "",
  icon_url: "",
};

function toFormFields(cat: CategoryListItem): FormFields {
  return {
    name: cat.name ?? "",
    name_en: cat.name_en ?? "",
    name_ru: cat.name_ru ?? "",
    name_he: cat.name_he ?? "",
    icon_url: cat.icon_url ?? "",
  };
}

function toFormData(fields: FormFields): CategoryFormData {
  return {
    name: fields.name.trim(),
    name_en: fields.name_en.trim() || null,
    name_ru: fields.name_ru.trim() || null,
    name_he: fields.name_he.trim() || null,
    icon_url: fields.icon_url.trim() || null,
  };
}

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

interface Props {
  items: CategoryListItem[];
  total: number;
  page: number;
  totalPages: number;
}

const HEADINGS = ["ID", "English", "Russian", "Hebrew", "Name", "Icon", "Actions"] as const;

export default function CategoriesClient({ items, total, page, totalPages }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [selected, setSelected] = useState<CategoryListItem | null>(null);
  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalMode("create");
  }

  function openEdit(cat: CategoryListItem) {
    setSelected(cat);
    setForm(toFormFields(cat));
    setError(null);
    setModalMode("edit");
  }

  function openDelete(cat: CategoryListItem) {
    setSelected(cat);
    setError(null);
    setModalMode("delete");
  }

  function closeModal() {
    if (isPending) return;
    setModalMode("closed");
    setError(null);
  }

  useEffect(() => {
    if (modalMode === "closed") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) {
        setModalMode("closed");
        setError(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalMode, isPending]);

  function handleFieldChange(field: keyof FormFields, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    const data = toFormData(form);
    setError(null);
    startTransition(async () => {
      const result =
        modalMode === "create"
          ? await createCategory(data)
          : await updateCategory(selected!.id, data);

      if (result.sessionExpired) {
        // Full-page navigation needed so the browser processes the Set-Cookie
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
      const result = await deleteCategory(selected.id);

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

  const displayName = selected
    ? (selected.name_en ?? selected.name ?? `#${selected.id}`)
    : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Categories</h1>
          <span className="text-sm text-gray-400">{total} total</span>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          + Add category
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {HEADINGS.map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {heading}
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
                    No categories found.
                  </td>
                </tr>
              ) : (
                items.map((cat) => (
                  <tr key={cat.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-400">
                      {cat.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {cat.name_en ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {cat.name_ru ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td
                      dir="auto"
                      className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                    >
                      {cat.name_he ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {cat.name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {cat.icon_url ? (
                        <CategoryIcon url={cat.icon_url} />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(cat)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDelete(cat)}
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
              href={`/categories?page=${page - 1}`}
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
              href={`/categories?page=${page + 1}`}
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

      {/* Modal */}
      {modalMode !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Create / Edit form */}
            {(modalMode === "create" || modalMode === "edit") && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
                <h2 className="text-base font-semibold text-gray-900">
                  {modalMode === "create" ? "Add category" : "Edit category"}
                </h2>

                {error && (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">
                      Name <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      disabled={isPending}
                      autoFocus
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">English</span>
                    <input
                      type="text"
                      value={form.name_en}
                      onChange={(e) => handleFieldChange("name_en", e.target.value)}
                      disabled={isPending}
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Russian</span>
                    <input
                      type="text"
                      value={form.name_ru}
                      onChange={(e) => handleFieldChange("name_ru", e.target.value)}
                      disabled={isPending}
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Hebrew</span>
                    <input
                      type="text"
                      dir="auto"
                      value={form.name_he}
                      onChange={(e) => handleFieldChange("name_he", e.target.value)}
                      disabled={isPending}
                      className={INPUT_CLASS}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Icon URL</span>
                    <input
                      type="text"
                      value={form.icon_url}
                      onChange={(e) => handleFieldChange("icon_url", e.target.value)}
                      disabled={isPending}
                      placeholder="https://..."
                      className={INPUT_CLASS}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3">
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
                    disabled={isPending}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            )}

            {/* Delete confirmation */}
            {modalMode === "delete" && selected && (
              <div className="flex flex-col gap-5 p-6">
                <h2 className="text-base font-semibold text-gray-900">Delete category</h2>

                <p className="text-sm text-gray-600">
                  Delete{" "}
                  <span className="font-medium text-gray-900">{displayName}</span>?
                  {" "}This action cannot be undone.
                </p>

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
                    {isPending ? "Deleting…" : "Delete"}
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
