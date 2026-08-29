import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchases } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const listingId = Number(searchParams.get("listingId"));
  const wallet = searchParams.get("wallet");
  if (isNaN(listingId) || !wallet) {
    return NextResponse.json({ error: "listingId and wallet required" }, { status: 400 });
  }
  try {
    const rows = await db
      .select({ quantity: purchases.quantity })
      .from(purchases)
      .where(and(eq(purchases.listingId, listingId), eq(purchases.buyer, wallet.toLowerCase())));
    const count = rows.reduce((sum, r) => sum + Number(r.quantity), 0);
    return NextResponse.json({ count });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}