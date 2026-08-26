/**
 * GET /api/price-history/[id] — price history for a specific listing
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceHistory } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listingId = parseInt(id, 10);
    if (isNaN(listingId)) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }

    const history = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.listingId, listingId))
      .orderBy(asc(priceHistory.cycleNumber));

    return NextResponse.json({ priceHistory: history });
  } catch (err) {
    console.error("GET /api/price-history/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch price history" }, { status: 500 });
  }
}
