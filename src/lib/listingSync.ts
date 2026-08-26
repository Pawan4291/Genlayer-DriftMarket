/**
 * listingSync — polls total_listings() + get_listing() from chain → Postgres.
 * Only inserts/updates rows after a real chain read.
 * No hardcoded data is ever written here.
 */
import { db } from "@/db";
import { listings, syncCursors, activityEvents } from "@/db/schema";
import { totalListings, getListing } from "@/chain/contract";
import { eq } from "drizzle-orm";

async function getLastSyncedCount(): Promise<number> {
  const row = await db
    .select()
    .from(syncCursors)
    .where(eq(syncCursors.key, "total_listings_synced"))
    .limit(1);
  return row.length > 0 ? Number(row[0].value) : 0;
}

async function setLastSyncedCount(count: number): Promise<void> {
  await db
    .insert(syncCursors)
    .values({ key: "total_listings_synced", value: String(count) })
    .onConflictDoUpdate({
      target: syncCursors.key,
      set: { value: String(count), updatedAt: new Date() },
    });
}

/**
 * Sync any newly created listings from chain into Postgres.
 * Also re-reads all active listings to update current_price/sold/active state.
 */
export async function syncListings(): Promise<{ synced: number; updated: number }> {
  const [chainTotal, lastSynced] = await Promise.all([
    totalListings(),
    getLastSyncedCount(),
  ]);

  let synced = 0;
  let updated = 0;

  // Insert brand-new listings
  for (let i = lastSynced; i < chainTotal; i++) {
    const chainListing = await getListing(i);
    await db
      .insert(listings)
      .values({
        id: i,
        seller: chainListing.seller,
        title: chainListing.title,
        description: chainListing.description,
        floorPrice: chainListing.floor_price,
        currentPrice: chainListing.current_price,
        supply: chainListing.supply,
        sold: chainListing.sold,
        cyclesRun: chainListing.cycles_run,
        active: chainListing.active,
        lastSyncedAt: new Date(),
      })
      .onConflictDoNothing();

    // Record create event in activity feed
    await db
      .insert(activityEvents)
      .values({
        listingId: i,
        txHash: `sync-create-${i}`, // synced from chain state, no direct tx hash
        eventType: "create",
        actor: chainListing.seller,
        metadata: { title: chainListing.title, floor_price: chainListing.floor_price },
        occurredAt: new Date(),
      })
      .onConflictDoNothing();

    synced++;
  }

  if (chainTotal > lastSynced) {
    await setLastSyncedCount(chainTotal);
  }

  // Re-read all currently active listings to capture price/sold state changes
  const activeRows = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.active, true));

  for (const row of activeRows) {
    try {
      const chainListing = await getListing(row.id);
      await db
        .update(listings)
        .set({
          currentPrice: chainListing.current_price,
          sold: chainListing.sold,
          cyclesRun: chainListing.cycles_run,
          active: chainListing.active,
          lastSyncedAt: new Date(),
        })
        .where(eq(listings.id, row.id));
      updated++;
    } catch {
      // listing may have been removed on chain; skip
    }
  }

  return { synced, updated };
}
