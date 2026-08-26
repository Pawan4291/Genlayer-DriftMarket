/**
 * agentCycle — submits a real signed run_agent_cycle() transaction,
 * then writes the real price_history row and activity_event row.
 * Requires AGENT_SERVICE_PRIVATE_KEY to be set.
 */
import { db } from "@/db";
import { listings, priceHistory, activityEvents } from "@/db/schema";
import { runAgentCycle, getTransactionDetails, getListing } from "@/chain/contract";
import { eq, and } from "drizzle-orm";

export interface AgentCycleResult {
  listingId: number;
  txHash: string;
  adjustmentPercent: number | null;
  reasoning: string | null;
  priceBeforeWei: string;
  priceAfterWei: string;
}

export async function runAgentCycleForListing(
  listingId: number
): Promise<AgentCycleResult> {
  // Read current price BEFORE the cycle
  const dbRow = await db
    .select({ currentPrice: listings.currentPrice, cyclesRun: listings.cyclesRun })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  const priceBeforeWei = dbRow[0]?.currentPrice ?? "0";
  const cyclesBefore = Number(dbRow[0]?.cyclesRun ?? 0);

  // Submit the real signed transaction
  const txHash = await runAgentCycle(listingId);

  // Read the updated chain state
  const chainListing = await getListing(listingId);
  const priceAfterWei = chainListing.current_price;

  // Try to parse the tx data for adjustment_percent and reasoning
  let adjustmentPercent: number | null = null;
  let reasoning: string | null = null;
  try {
    const txData = await getTransactionDetails(txHash);
    if (txData) {
      // The contract returns JSON from run_agent_cycle
      const receipt = txData as unknown as Record<string, unknown>;
      const returnData = (receipt.result ?? receipt.returnData ?? "") as string;
      if (returnData) {
        const parsed = JSON.parse(returnData.replace(/```json|```/g, "").trim());
        adjustmentPercent = parsed.adjustment_percent ?? null;
        reasoning = parsed.reasoning ?? null;
      }
    }
  } catch {
    // tx data parsing is best-effort; price change is the source of truth
    const priceBefore = BigInt(priceBeforeWei || "0");
    const priceAfter = BigInt(priceAfterWei || "0");
    if (priceBefore > BigInt(0)) {
      adjustmentPercent = Number((priceAfter - priceBefore) * BigInt(100) / priceBefore);
    }
  }

  // Write real price_history row (tied to real tx_hash)
  await db
    .insert(priceHistory)
    .values({
      listingId,
      txHash,
      priceBeforeWei,
      priceAfterWei,
      adjustmentPercent,
      reasoning,
      cycleNumber: cyclesBefore + 1,
      recordedAt: new Date(),
    })
    .onConflictDoNothing();

  // Update the listing row with fresh chain data
  await db
    .update(listings)
    .set({
      currentPrice: priceAfterWei,
      cyclesRun: chainListing.cycles_run,
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
      eventType: "agent_cycle",
      actor: null,
      metadata: {
        adjustment_percent: adjustmentPercent,
        reasoning,
        price_before: priceBeforeWei,
        price_after: priceAfterWei,
      },
      occurredAt: new Date(),
    })
    .onConflictDoNothing();

  return {
    listingId,
    txHash,
    adjustmentPercent,
    reasoning,
    priceBeforeWei,
    priceAfterWei,
  };
}

/** Run agent cycle for ALL active listings */
export async function runAgentCycleAll(): Promise<AgentCycleResult[]> {
  const activeListings = await db
    .select({ id: listings.id })
    .from(listings)
    .where(and(eq(listings.active, true)));

  const results: AgentCycleResult[] = [];
  for (const row of activeListings) {
    try {
      const result = await runAgentCycleForListing(row.id);
      results.push(result);
    } catch (err) {
      console.error(`Agent cycle failed for listing ${row.id}:`, err);
    }
  }
  return results;
}
