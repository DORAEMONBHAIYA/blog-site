import { NextRequest } from "next/server";
import { getLatestCards } from "@/lib/release-pages";

export const revalidate = 300;

/** Paginated latest cards for the homepage load-more control. */
export async function GET(req: NextRequest): Promise<Response> {
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  if (page > 50) return Response.json({ cards: [], hasMore: false, page });
  const { cards, hasMore } = await getLatestCards(page, 20);
  return Response.json({ cards, hasMore, page });
}
