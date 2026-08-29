/**
 * GET /api/purchases — list purchases (filter by buyer)
 * POST /api/purchases — record a confirmed buy() tx from frontend
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchases, listings, activityEvents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getListing } from "@/chain/contract";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const buyer = searchParams.get("buyer");

    let query = db.select().from(purchases).orderBy(desc(purchases.purchasedAt)).$dynamic();
    if (buyer) {
      query = query.where(eq(purchases.buyer, buyer.toLowerCase()));
    }
    const rows = await query;
    return NextResponse.json({ purchases: rows });
  } catch (err) {
    console.error("GET /api/purchases error:", err);
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { txHash, listingId, buyer, quantity } = body as {
      txHash: string;
      listingId: number;
      buyer: string;
      quantity?: number;
    };

    if (!txHash || listingId === undefined || !buyer) {
      return NextResponse.json({ error: "txHash, listingId, buyer are required" }, { status: 400 });
    }

    // Read the listing state AT THE CURRENT block (purchase-snapshot rule #5)
    const chainListing = await getListing(listingId);

    // Get or create the listing row
    const [existingListing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!existingListing) {
      return NextResponse.json({ error: "Listing not found in DB — sync first" }, { status: 404 });
    }

    // Insert purchase row (idempotent via tx_hash unique constraint)
    const [inserted] = await db
      .insert(purchases)
      .values({
        listingId,
        txHash,
        buyer: buyer.toLowerCase(),
        seller: existingListing.seller,
        // Snapshot at purchase block
        titleSnapshot: chainListing.title,
        priceAtPurchaseWei: chainListing.current_price,
        quantity: String(quantity ?? 1),
        purchasedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      // Already recorded
      const [existing] = await db
        .select()
        .from(purchases)
        .where(eq(purchases.txHash, txHash))
        .limit(1);
      return NextResponse.json({ purchase: existing, alreadyRecorded: true });
    }

    // Update listing sold count + active status from chain
    await db
      .update(listings)
      .set({
        sold: chainListing.sold,
        active: chainListing.active,
        lastSyncedAt: new Date(),
      })
      .where(eq(listings.id, listingId));

    // Record activity event
    await db
      .insert(activityEvents)
      .values({
        listingId,
        txHash,
        eventType: "buy",
        actor: buyer.toLowerCase(),
        metadata: {
          price: chainListing.current_price,
          title: chainListing.title,
        },
        occurredAt: new Date(),
      })
      .onConflictDoNothing();

    return NextResponse.json({ purchase: inserted }, { status: 201 });
  } catch (err) {
    console.error("POST /api/purchases error:", err);
    return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 });
  }
}
