/**
 * GET /api/listings — returns all listings from DB (synced from chain).
 * GET /api/listings?active=true — only active ones
 * GET /api/listings?seller=0x... — filter by seller
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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
    return NextResponse.json({ listings: rows });
  } catch (err) {
    console.error("GET /api/listings error:", err);
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}
