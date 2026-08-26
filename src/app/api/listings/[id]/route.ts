/**
 * GET /api/listings/[id] — single listing with price history
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listings, priceHistory } from "@/db/schema";
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

    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const history = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.listingId, listingId))
      .orderBy(asc(priceHistory.cycleNumber));

    return NextResponse.json({ listing, priceHistory: history });
  } catch (err) {
    console.error("GET /api/listings/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch listing" }, { status: 500 });
  }
}
