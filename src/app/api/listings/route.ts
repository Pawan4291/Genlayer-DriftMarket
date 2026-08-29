/**
 * GET /api/listings — returns all listings from DB (synced from chain).
 * GET /api/listings?active=true — only active ones
 * GET /api/listings?seller=0x... — filter by seller
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listings, purchases } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";
    const seller = searchParams.get("seller");

    let query = db.select().from(listings).orderBy(desc(listings.createdAt)).$dynamic();

    if (activeOnly) {
      query = query.where(eq(listings.active, true));
    }
    if (seller) {
      query = query.where(eq(listings.seller, seller.toLowerCase()));
    }

    const rows = await query;

    const purchaseTotals = await db
      .select({
        listingId: purchases.listingId,
        total: sql<string>`SUM(CAST(${purchases.quantity} AS INTEGER))`,
      })
      .from(purchases)
      .groupBy(purchases.listingId);

    const totalsMap = new Map(purchaseTotals.map((p) => [p.listingId, Number(p.total)]));

    const merged = rows.map((r) => {
      const realSold = totalsMap.get(r.id);
      return realSold !== undefined && realSold > Number(r.sold)
        ? { ...r, sold: String(realSold) }
        : r;
    });

    return NextResponse.json({ listings: merged });
  } catch (err) {
    console.error("GET /api/listings error:", err);
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}
