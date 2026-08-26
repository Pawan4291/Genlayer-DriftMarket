/**
 * POST /api/delist — record a confirmed delist() tx from frontend
 * Body: { txHash, listingId, seller }
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listings, activityEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getListing } from "@/chain/contract";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { txHash, listingId, seller } = body as {
      txHash: string;
      listingId: number;
      seller: string;
    };

    if (!txHash || listingId === undefined || !seller) {
      return NextResponse.json(
        { error: "txHash, listingId, seller are required" },
        { status: 400 }
      );
    }

    // Confirm chain state
    const chainListing = await getListing(listingId);

    await db
      .update(listings)
      .set({
        active: chainListing.active,
        lastSyncedAt: new Date(),
      })
      .where(eq(listings.id, listingId));

    await db
      .insert(activityEvents)
      .values({
        listingId,
        txHash,
        eventType: "delist",
        actor: seller.toLowerCase(),
        metadata: { reason: "seller_initiated" },
        occurredAt: new Date(),
      })
      .onConflictDoNothing();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/delist error:", err);
    return NextResponse.json({ error: "Failed to record delist" }, { status: 500 });
  }
}
