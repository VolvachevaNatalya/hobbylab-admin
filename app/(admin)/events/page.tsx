import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { EventCategory, EventListItem, EventListResponse } from "@/types/auth";

const PAGE_SIZE = 50;

// Prefer the English name; fall back through the available language fields.
// All fields are preserved in EventCategory so the caller can apply a
// different preference order when the admin UI is localised in the future.
function getCategoryName(cat: EventCategory): string {
  return cat.name_en ?? cat.name ?? cat.name_ru ?? cat.name_he ?? "—";
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
    timePart = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    // leave empty — fallback renders below
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
  if (categories.length === 0) {
    return <span className="text-gray-400">—</span>;
  }
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

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function EventsPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data, status } = await apiFetch<EventListResponse>(
    `/admin/events?limit=${PAGE_SIZE}&offset=${offset}`
  );

  if (status === 401 || status === 403) {
    redirect("/api/auth/logout");
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">Failed to load events</p>
        <p className="mt-1 text-sm text-red-600">
          The server returned an error. Please try again later.
        </p>
      </div>
    );
  }

  const { items, total } = data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

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
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Events</h1>
        <span className="text-sm text-gray-400">{total} total</span>
      </div>

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
                    No events found.
                  </td>
                </tr>
              ) : (
                items.map((event: EventListItem) => (
                  <tr
                    key={event.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="min-w-[180px] px-4 py-3 text-sm text-gray-900">
                      {event.title ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {event.organization_name ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="min-w-[120px] px-4 py-3">
                      <Categories categories={event.categories} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {event.city ?? (
                        <span className="text-gray-400">—</span>
                      )}
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
                      <DateTime value={event.end_datetime} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {event.price !== null ? (
                        event.price
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
