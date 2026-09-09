import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return NextResponse.json([]);

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const limit = searchParams.get("limit") ?? "20";

  const params = new URLSearchParams({ limit });
  if (q?.trim()) params.set("q", q.trim());

  try {
    const res = await fetch(`${apiUrl}/cities/?${params}`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    return NextResponse.json([]);
  }
}
