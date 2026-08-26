/**
 * POST /api/agent-cycle — trigger agent price-drift cycle for one or all listings.
 * Body: { listingId?: number }  (omit to run all active)
 * Requires AGENT_SERVICE_PRIVATE_KEY to be set.
 */
import { NextRequest, NextResponse } from "next/server";
import { runAgentCycleForListing, runAgentCycleAll } from "@/lib/agentCycle";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { listingId } = body as { listingId?: number };

    if (listingId !== undefined) {
      const result = await runAgentCycleForListing(listingId);
      return NextResponse.json({ success: true, results: [result] });
    } else {
      const results = await runAgentCycleAll();
      return NextResponse.json({ success: true, results });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/agent-cycle error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
