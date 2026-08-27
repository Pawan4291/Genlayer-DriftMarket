/**
 * POST /api/listings/optimistic
 * Inserts a listing row immediately after a create_listing tx is submitted,
 * so it shows on Market right away instead of waiting for GenLayer finality
 * (which can take hours by design). Uses a negative id so it never collides
 * with a real on-chain listing id (chain ids start at 0). Once the real
 * listing syncs from chain later, both rows may briefly coexist — acceptable
 * tradeoff for instant UX; safe to clean up stale optimistic rows later.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listings } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { txHash, title, description, floorPriceWei, supply, imageUrl, seller } = body;

    if (!txHash || !title || !floorPriceWei || !supply || !seller) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const optimisticId = -Math.floor(Date.now() / 1000);

    await db.insert(listings).values({
      id: optimisticId,
      seller: String(seller).toLowerCase(),
      title,
      description: description ?? "",
      floorPrice: String(floorPriceWei),
      currentPrice: String(floorPriceWei),
      supply: String(supply),
      sold: "0",
      cyclesRun: "0",
      active: true,
      imageUrl: imageUrl ?? null,
      lastSyncedAt: new Date(),
    });

    return NextResponse.json({ success: true, id: optimisticId, txHash });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/listings/optimistic error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}