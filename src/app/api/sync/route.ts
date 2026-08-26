/**
 * POST /api/sync — trigger a listing sync from chain (idempotent).
 * Can be called from a cron job or on-demand from the UI.
 */
import { NextResponse } from "next/server";
import { syncListings } from "@/lib/listingSync";

export async function POST() {
  try {
    const result = await syncListings();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/sync error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await syncListings();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
