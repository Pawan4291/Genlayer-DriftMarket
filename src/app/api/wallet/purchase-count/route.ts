import { NextRequest, NextResponse } from "next/server";
import { walletPurchaseCount } from "@/chain/contract";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const listingId = Number(searchParams.get("listingId"));
  const wallet = searchParams.get("wallet");
  if (isNaN(listingId) || !wallet) {
    return NextResponse.json({ error: "listingId and wallet required" }, { status: 400 });
  }
  try {
    const count = await walletPurchaseCount(listingId, wallet);
    return NextResponse.json({ count });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}