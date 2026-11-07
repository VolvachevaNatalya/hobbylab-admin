import { redirect } from "next/navigation";
import { apiFetch, apiFetchAll } from "@/lib/api";
import type {
  EventListResponse,
  OrgListItem,
  CategoryListResponse,
} from "@/types/api";
import EventsClient from "@/components/EventsClient";

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function EventsPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [eventsResult, orgsResult, catsResult] = await Promise.all([
    apiFetch<EventListResponse>(`/admin/events?limit=${PAGE_SIZE}&offset=${offset}`),
    // Organizations: fetch all pages so the create-event form always shows every org.
    // Categories: backend-managed, capped at 100 items by design — single page is enough.
    apiFetchAll<OrgListItem>("/admin/organizations"),
    apiFetch<CategoryListResponse>(`/admin/categories?limit=100`),
  ]);

  if (eventsResult.status === 401 || eventsResult.status === 403) {
    redirect("/api/auth/logout");
  }

  if (!eventsResult.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">Failed to load events</p>
        <p className="mt-1 text-sm text-red-600">
          The server returned an error. Please try again later.
        </p>
      </div>
    );
  }

  const { items, total } = eventsResult.data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const organizations = orgsResult.data ?? [];
  const categories = catsResult.data?.items ?? [];

  return (
    <EventsClient
      items={items}
      total={total}
      page={page}
      totalPages={totalPages}
      organizations={organizations}
      categories={categories}
    />
  );
}
