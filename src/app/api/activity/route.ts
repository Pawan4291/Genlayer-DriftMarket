/**
 * GET /api/activity — unified activity feed (all event types, paginated)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityEvents, listings } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("listingId");
    const eventType = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

    // Join with listings to get title for display
    const rows = await db
      .select({
        id: activityEvents.id,
        listingId: activityEvents.listingId,
        txHash: activityEvents.txHash,
        eventType: activityEvents.eventType,
        actor: activityEvents.actor,
        metadata: activityEvents.metadata,
        occurredAt: activityEvents.occurredAt,
        listingTitle: listings.title,
      })
      .from(activityEvents)
      .leftJoin(listings, eq(activityEvents.listingId, listings.id))
      .where(
        listingId
          ? and(
              eq(activityEvents.listingId, parseInt(listingId, 10)),
              eventType ? eq(activityEvents.eventType, eventType) : undefined
            )
          : eventType
          ? eq(activityEvents.eventType, eventType)
          : undefined
      )
      .orderBy(desc(activityEvents.occurredAt))
      .limit(limit);

    return NextResponse.json({ activity: rows });
  } catch (err) {
    console.error("GET /api/activity error:", err);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
